# Data Model: the stored-data features of the KERN Revamp design

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Decisions**: [research.md](research.md)

This extends the data models of [spec 001](../001-servicebw-eudi-middleware/data-model.md),
[spec 002](../002-connection-rules/data-model.md), [spec 005](../005-connection-drafts/data-model.md)
and [spec 007](../007-agent-mcp-server/data-model.md), which still apply. New tables and columns
follow Constitution V: `Mapped` / `mapped_column`, UUID4 keys as `String(36)`, `created_at` and
`updated_at` with `server_default=func.now()`, `snake_case`, an index on every column used to look
rows up. **Nothing here holds a citizen, a request, a finding, a test persona, a rule's content or a
message for citizens** (FR-029, FR-073).

## Spec entities and where they live

| Spec entity | Stored as |
|---|---|
| Start date | `form_connections.start_date` (a `Date`, the day in Germany), set only while the connection is scheduled (§1) |
| Connection status | Not stored as such: derived from `published_at`, `is_active`, `start_date` and `deleted_at` (§1.2); answered as `state` |
| Status dates | `form_connections.published_at` (exists), `activated_at`, `deactivated_at` (§1) |
| A draft's step | `form_connections.draft['step']` (exists, spec 005); now also answered in the list |
| Activity entry | A row of `connection_activity` (§2) |
| Deleted connection | `form_connections.deleted_at` (exists) with `deletion_id` and `deleted_by_id` (§3) |
| Document order | `form_connections.document_order` (§4) |
| Example mark | `form_connections.example` (§5) |
| Data group | `CatalogField.group` and `FIELD_GROUPS` in `app/catalog.py`; not in the database (§6) |
| A start date an agent asks for | `approval_requests.start_date`, with the snapshot `was_start_date` (§7) |
| Selection | Never stored: the overview page's state (§10) |

## Relationships

```text
form_connections 1 ──< connection_activity          (ON DELETE CASCADE)
user_accounts    1 ──< form_connections.deleted_by_id (ON DELETE SET NULL)
form_connections N ──  1 deletion (deletion_id, no table: a UUID shared by the rows deleted together)
```

`connection_activity` holds no foreign key to `user_accounts`: an entry keeps its person's name as
text, so that it survives the account (FR-028).

---

## 1. `form_connections`: scheduling and the status dates (R1, R2)

### 1.1 New columns

| Column | Type | Rules |
|---|---|---|
| `start_date` | `Date`, nullable | The day in Germany from which a scheduled connection is active. Set exactly while the connection is scheduled |
| `activated_at` | `DateTime(timezone=True)`, nullable | When the connection last became active: at publishing with "Now", at its start, at "Activate again" or at "Change start date" with "Now". Null for a draft and for a connection that was never active |
| `deactivated_at` | `DateTime(timezone=True)`, nullable | When the connection was last deactivated. Kept after a reactivation; read only while the connection is deactivated |
| `document_order` | `JSONB`, not null, `server_default '[]'` | §4 |
| `example` | `String(16)`, nullable | §5 |
| `deletion_id` | `String(36)`, nullable, indexed | §3 |
| `deleted_by_id` | `String(36)`, FK → `user_accounts.id` `ON DELETE SET NULL`, nullable | §3 |

`published_at`, `is_active` and `deleted_at` keep their meaning. `published_at` is the moment the
draft was published, with "Now" or with a date (FR-018).

New constraints, added by hand in the migration (autogenerate emits none):

```text
ck_form_connections_start_date:  start_date IS NULL OR (published_at IS NOT NULL AND NOT is_active)
ck_form_connections_example:     example IS NULL OR published_at IS NULL
ix_form_connections_start_date:  (start_date) WHERE start_date IS NOT NULL      # the worker's scan
```

### 1.2 The four states

| `state` | Condition (the row is not deleted) | serviceBW's URLs |
|---|---|---|
| `draft` | `published_at IS NULL` | `409 unavailable` (spec 005) |
| `scheduled` | published, `NOT is_active`, `start_date IS NOT NULL` | `409 unavailable`, word for word a deactivated connection's answer (FR-004, FR-075) |
| `live` | published, `is_active` | work |
| `deactivated` | published, `NOT is_active`, `start_date IS NULL` | `409 unavailable` |

A scheduled connection is a published connection whose `is_active` is false. Everything that
already reads `is_active` therefore treats it as not usable without a change: the connection URLs
(`_usable_form_connection()`), the worker's cancel step and the trigger. Only the code that words
the status for people or agents reads `start_date` too: `state_of()` in
`services/form_connections.py` is the one place that derives the state, and the search's filters
use the same conditions (`deactivated` gains `start_date IS NULL`).

### 1.3 Transitions

`start` is 00:00 of `start_date` in `Europe/Berlin`, as a timezone-aware instant
(`start_instant()`, R2). "Cancel" means `cancel_open_requests()`, as a deactivation does today.

| From | Action | Changes | Activity (§2) |
|---|---|---|---|
| draft | publish, "Now" | `published_at = now`, `is_active = true`, `activated_at = now`, `example = NULL` | `published` |
| draft | publish, on a date | `published_at = now`, `is_active = false`, `start_date`, `example = NULL` | `published`, `scheduled` |
| scheduled | the start comes (worker) | `is_active = true`, `start_date = NULL`, `activated_at = start` | `became_active`, no person |
| scheduled | change start date, another date | `start_date` | `start_date_changed` |
| scheduled | change start date, "Now" | `is_active = true`, `start_date = NULL`, `activated_at = now` | `start_date_changed` (no date) |
| scheduled | deactivate | `start_date = NULL`, `deactivated_at = now` | `deactivated` |
| live | change start date, a date | `is_active = false`, `start_date`; cancel | `scheduled` |
| live | change start date, "Now" | nothing (FR-009) | none |
| live | deactivate | `is_active = false`, `deactivated_at = now`; cancel | `deactivated` |
| deactivated | activate again, "Now" | `is_active = true`, `activated_at = now` | `reactivated` |
| deactivated | activate again, on a date | `start_date` | `scheduled` |
| any | save, rename, reorder | no status column (FR-018) | §2.3 |
| any | delete | `deleted_at = now`, `deletion_id`, `deleted_by_id`; cancel | `deleted` |
| deleted | restore | `deleted_at`, `deletion_id`, `deleted_by_id` = `NULL`; nothing else | `restored` |

Rules:

- **A start date is a day after today in Germany** (FR-003), checked by `clean_start_date()` at
  every path that takes one, under the row lock too, so that a day change between the dialog and
  the save is refused: `400 invalid_start_date`, "Enter a date after today.".
- **Only the worker's step activates on a date** (R2). It sets `activated_at` to the start, also
  when the middleware was not running at that time or the connection was deleted over midnight and
  restored (FR-005, the edge cases); the activity entry carries the time it was written.
- **Deactivating twice or activating an active connection** changes no date and writes no entry.
- **Restoring** changes no status column and no `updated_at` (R5): a restored scheduled connection
  whose date has come is activated by the worker's next cycle, within 2 seconds.

### 1.4 What the views show

| Place | `draft` | `scheduled` | `live` | `deactivated` |
|---|---|---|---|---|
| Overview row (FR-017) | "Edited `updated_at` · `step` step" | "Active from `start_date`" | "Published `published_at`" | "Deactivated `deactivated_at`" |
| Details' date pill (FR-015) | "Edited `updated_at`" | "Active from `start_date`, 00:00" | "Active since `activated_at`" | "Deactivated since `deactivated_at`" |

A start date is sent as `YYYY-MM-DD` and shown as written, with no time zone conversion, so that it
reads the same for every team member (FR-020); the instants are ISO timestamps in UTC, shown in the
browser's time zone as today.

---

## 2. `connection_activity`: who did what (R3)

### 2.1 Table

| Column | Type | Rules |
|---|---|---|
| `id` | `String(36)` PK | UUID4 |
| `form_connection_id` | FK → `form_connections.id` `ON DELETE CASCADE`, indexed | |
| `kind` | `String(32)` | One of §2.2 |
| `occurred_at` | `DateTime(timezone=True)` | When it happened; moved to the latest time when entries merge (§2.4) |
| `position` | `SmallInteger`, not null, default 0 | The entry's place among the entries of one action (publishing on a date writes `published` at 0 and `scheduled` at 1), so that the list's order is total |
| `variant_id` | `String(36)`, nullable | The variant's id, for the kinds about a variant: what "the same variant" means for merging |
| `variant_name` | `String(200)`, nullable | The variant's name when the entry was written or last merged (the new name for a rename) |
| `start_date` | `Date`, nullable | `scheduled`, and `start_date_changed` to a date |
| `actor_name` | `String(100)`, nullable | The team member's username when the entry was made: the one who acted, whom an agent acts for, or who approved. Null for what the middleware did by itself and for backfilled entries |
| `agent_name` | `String(200)`, nullable | The agent's name (its client's name or its token's name, as `approval_requests.requested_by`) when an agent made the change or asked for the action |
| `approved` | `Boolean`, not null, default false | True when a team member approved an agent's request: `actor_name` approved, `agent_name` asked |
| `created_at`, `updated_at` | | |

Index: `ix_connection_activity_connection_time` on (`form_connection_id`, `occurred_at`), for the
list and the last entry.

### 2.2 Kinds

| `kind` | When | Detail |
|---|---|---|
| `created` | A draft or a published connection is created, the example too | |
| `renamed` | The connection's name changed | |
| `description_changed` | The connection's description changed | |
| `documents_changed` | A document was added, removed or moved, or its data items were chosen differently | |
| `variant_added`, `variant_removed`, `variant_renamed` | A variant was added, removed or renamed | `variant_id`, `variant_name` |
| `rules_changed` | The rules of a variant changed | `variant_id`, `variant_name` |
| `published` | A draft was published, or a connection was created published | |
| `scheduled` | The connection got a start date: at publishing, at "Activate again", or as an active connection | `start_date` |
| `start_date_changed` | A scheduled connection's start moved to another date, or to now (`start_date` null) | `start_date` |
| `became_active` | The start date came | no person |
| `deactivated` | Deactivated, also from scheduled | |
| `reactivated` | "Activate again" with "Now" | |
| `deleted`, `restored` | Deleted; brought back with "Undo" | |

Nothing else is ever written: no view, copy or test, no declined or expired approval request, no
content of a rule or message, no value (FR-029). A change of a variant's description alone writes
no entry, since FR-025 does not list it (R3).

### 2.3 What a save records

`changes_between(before, after)` in `services/activity.py` is a pure function over two contents
(name, description, documents in their order, branches). The save paths call it with the stored
content and the content they are about to store: `save_draft()`, `publish_draft()` (the publish
body against the stored draft), `update_form_connection()`. It answers the kinds of §2.2, one per
kind and variant:

- the name and the description are compared as cleaned;
- the documents are compared as the ordered list of `(document_type, fields)`;
- variants are matched by id: an id only in `after` is added, only in `before` removed, a different
  name renamed;
- **the rules of a variant changed** when its own tree differs. For the main variant and a variant
  that started empty, that is the tree and the top level's AND/OR. For a variant linked to
  Standard, only what is its own counts: its marked items (`changed`, `removed`, `added`) with their
  content and position, and its top level's AND/OR while `operator_mark` is set. A change of
  Standard that propagates to the linked variants is therefore one entry, "Rules changed in
  Standard" (R3).

The same function decides whether the example is still unchanged (§5), where a variant's
description counts too.

### 2.4 Writing and merging (FR-026)

`record()` writes the entries of one action in the transaction that changes the connection, under
its row lock, with one `occurred_at` (Python's `datetime.now(tz=timezone.utc)`) and each entry's
`position` in the action, in the order of §2.2's table. Before inserting, it reads the entries of
the connection's newest instant. A new entry whose kind, person (`actor_name`, `agent_name`,
`approved`) and `variant_id` equal one of them **merges into it**: that row's `occurred_at` moves
to now and its `position`, `variant_name` and `start_date` take the new values. Any other entry is
inserted. An entry therefore merges only when nothing else happened since, so twenty
rule edits of one agent on one variant are one row, and a save that changes two things updates or
inserts two rows.

### 2.5 Reading

- **The list**: `ORDER BY occurred_at DESC, position DESC, id`, 50 per page with a keyset cursor
  over the three (built as the search's is). Entries of one action therefore read last cause
  first: "Scheduled for …" above "Published".
- **The closed card's line** (`last_activity`, FR-024, FR-032): while the connection is deactivated,
  its newest `deactivated` entry; otherwise the newest entry that has a person; without one, the
  newest entry (the line then shows the time alone).
- **Lifetime** (FR-030): entries stay as long as the row and come back with a restore, since
  deleting does not touch them. The worker deletes them once the deletion can no longer be taken
  back (§3).

---

## 3. Deletion that can be taken back (R5)

| Column | Rules |
|---|---|
| `deleted_at` (exists) | Now set for a draft too: a draft's row stays until the restore time has passed |
| `deletion_id` | The id of the deletion, one UUID for all rows deleted together (a single delete is a deletion of one). Null for a deletion that an approval request ran: nothing can restore that one (FR-067) |
| `deleted_by_id` | The team member who deleted; only that account can restore (FR-036) |

**Deleting** (`_mark_deleted()`, shared by `delete_form_connection()`, `drafts.delete_draft()` and
the bulk deletion) sets the three columns under the row lock, cancels the open requests as today,
removes any revision that a draft's publish in flight has reserved (as `delete_draft()` does
today), sets every waiting approval request of the connection to `cancelled` with the stored reason
`connection_deleted` or `draft_deleted` (§7), and writes `deleted`. It leaves `updated_at` as it
is.

**While it can be restored** (`deleted_at > now - DELETION_UNDO_SECONDS`), the row is gone for
every read exactly as a deleted connection is today: `find_form_connection()` and
`_lock_form_connection()` already answer `404` for a row with `deleted_at`, and the list and the
search already filter on it. Two places change so that a deleted draft answers as it does today
(FR-035, FR-075): the connection URLs answer `404` for a deleted draft (not `409`), and the
approval requests' computed reasons read a deleted draft's row as `draft_deleted`.

**Restoring** (`restore_deletion()`): locks the rows with that `deletion_id` that are still
deleted, in id order. No row, a row past the restore time, or another account's deletion answers
`409 not_restorable`, and nothing changes. Otherwise it clears the three columns on every row and
writes `restored`: all rows or none. Requests and approval requests that were cancelled stay
cancelled.

**After the restore time** the worker's new step `finish_deletions` (R5) deletes the
`connection_activity` rows of those connections and the rows of deleted drafts, which is what a
deleted draft is today. A deleted published connection keeps its row for good, as today, so that
its URLs keep answering `409 unavailable`. The step that deletes unused EUDIPLO configurations now
waits for the same time, so that a restored connection still has its configuration.

---

## 4. Document order (R6)

`form_connections.document_order` is the list of the connection's document type keys in the team's
order, for a draft and a published connection alike: `["mdl", "pid"]`.

- **Where it comes from**: the order of `documents` in the request body. `create_draft()`,
  `save_draft()`, `publish_draft()`, `create_form_connection()` and `update_form_connection()`
  store the keys in the order sent; `clean_documents()` goes on returning catalog order for what is
  stored in the draft's content and the revision.
- **Where it shows**: every response lists `documents` in the stored order (`ordered_documents()`:
  the keys of `document_order` first, in that order; a document missing from it follows in catalog
  order). An empty list is therefore catalog order, which is what every connection that exists
  today shows (FR-052), so the migration backfills nothing.
- **What never changes**: the revision's `documents`, the DCQL query, its `config_hash` and what
  serviceBW receives stay in catalog order (FR-051). A save that only reorders creates no revision
  and calls no EUDIPLO: `update_form_connection()` compares the cleaned documents as today and
  writes `document_order` with the name and the description.
- **Data items** inside a document stay in catalog order (FR-050).

---

## 5. The example mark (R7)

`form_connections.example`: `NULL` (not the example), `'unchanged'` or `'changed'`.

- `create_example()` stores a draft with `example = 'unchanged'`, `step = 'connection'` and the
  content below, in the request's language (FR-055, FR-061).
- A draft save sets `'changed'` when `changes_between()` finds any change, a variant's description
  included; a save that only moves the step leaves it. It never goes back to `'unchanged'`.
- Publishing sets it to `NULL` (FR-059); the CHECK constraint holds it.
- The publish dialog shows its line when the loaded draft says `'unchanged'` and the page holds no
  change; the approval page when the stored draft says `'unchanged'` (FR-060).

The content lives in `app/example.py`, a leaf like `rules_texts.py` (it imports only
`app.language` and `app.catalog`), so that the fixture script can import it:

| Part | Content (English; the German is in [contracts/copy.md](contracts/copy.md)) |
|---|---|
| Name | "Passenger transport licence (example)" |
| Description | "Licence to drive taxis, rental cars and ambulances. Checks age and driving experience." |
| Documents, in this order | Personal ID with 7 data items: `family_name`, `given_name`, `birthdate`, `address_street_address`, `address_house_number`, `address_postal_code`, `address_locality`. Driving licence with 2: `driving_privileges`, `expiry_date` |
| Standard | Rule 01 AND Rule 02. `rule-1`: `pid.birthdate`, at least 21 years old, "You need to be at least 21 years old.". `rule-2`: `mdl.driving_privileges`, class B's issue date at least 2 years ago, "You need to have held a class B driving licence for at least 2 years." |
| Ambulance | Linked to Standard, described "For ambulance services. Some rules differ from Standard."; both rules marked `changed`: 19 years with "You need to be at least 19 years old.", 1 year with "You need to have held a class B driving licence for at least 1 year." |
| Counters | `next_rule_number = 3`, `next_group_number = 1` |

The frames give the documents' counts, not their data items; the seven and the two are this
feature's choice (plan, Complexity Tracking). The fixture script writes the example in both
languages to `rules/src/fixtures/example-connection.json`; a Vitest test runs the rules package's
validation and the rule checks on it and expects nothing (FR-056), and pytest runs publishing's
checks on it.

---

## 6. The catalog's data groups (R8)

`CatalogField` gains `group: str | None` (a group's key) and `app/catalog.py` a table of groups, in
the order the panel shows them (FR-077):

| Key | English | German |
|---|---|---|
| `name` | Name | Name |
| `birth` | Birth | Geburt |
| `address` | Address | Adresse |
| `document` | Document | Dokument |
| `licence` | Licence | Fahrerlaubnis |
| `appearance` | Appearance | Aussehen |
| `other` | Other details | Weitere Angaben |

A document type has groups when it has more than 10 fields; both documents of today's catalog do.
The catalog's unit test checks the rules of FR-078: every field of a grouped document has exactly
one group, a group other than `other` holds at least 2 fields, and the counts below.

**Driving licence** (31; FR-078, Clarification #35):

| Group | Fields |
|---|---|
| Name (4) | `family_name`, `given_name`, `family_name_national_character`, `given_name_national_character` |
| Birth (6) | `birth_date`, `sex`, `birth_place`, `age_in_years`, `age_birth_year`, `nationality` |
| Address (5) | `resident_address`, `resident_city`, `resident_state`, `resident_postal_code`, `resident_country` |
| Document (6) | `issue_date`, `expiry_date`, `issuing_country`, `issuing_authority`, `document_number`, `issuing_jurisdiction` |
| Licence (3) | `driving_privileges`, `un_distinguishing_sign`, `administrative_number` |
| Appearance (6) | `portrait`, `height`, `weight`, `eye_colour`, `hair_colour`, `portrait_capture_date` |
| Other details (1) | `signature_usual_mark` |

**Personal ID** (25; frame A5 `7290:61214`–`7290:61255`, but for the nationality, Clarification
2026-11-11):

| Group | Fields |
|---|---|
| Name (4) | `family_name`, `given_name`, `birth_family_name`, `birth_given_name` |
| Birth (4) | `birthdate`, `place_of_birth`, `nationalities`, `sex` |
| Address (7) | `address_formatted`, `address_street_address`, `address_house_number`, `address_postal_code`, `address_locality`, `address_region`, `address_country` |
| Document (6) | `document_number`, `date_of_issuance`, `date_of_expiry`, `issuing_authority`, `issuing_country`, `issuing_jurisdiction` |
| Other details (4) | `personal_administrative_number`, `picture`, `email`, `phone_number` |

Inside a group the fields keep the catalog's order (the tables list them in it). The catalog's own
order, the keys and the claims don't change, so nothing changes for EUDIPLO or serviceBW. The
nationality sits under Birth in both documents: in the driving licence by Clarification #35, in
the Personal ID by the user's decision of 2026-11-11 (plan, Complexity Tracking, call 2,
reversed), where frame A5 draws it under Other details (Birth 3, Other details 5).

---

## 7. `approval_requests`: a start date and the scheduled status (R9)

| Column | Type | Rules |
|---|---|---|
| `action` (exists, `String(16)`) | | Gains `set_start_date` (14 characters) |
| `start_date` | `Date`, nullable | What the agent asks for. `publish`, `reactivate`: the start date, null for at once. `set_start_date`: the new date, null for now. Null for the other actions |
| `was_start_date` | `Date`, nullable | The connection's `start_date` when the request was made, beside `was_active`: together they are the status the request was made for (FR-066) |
| `cancel_reason` (exists) | | The stored reasons gain `connection_deleted` and `draft_deleted`, written by the deletion (§3), so that a restore does not bring a request back |

Preconditions at the request, without writing (FR-065, FR-066):

| Action | Allowed for | Refused |
|---|---|---|
| `publish` with a date | a publishable draft | a date not after today: `400 invalid_start_date` |
| `reactivate` (with or without a date) | deactivated | scheduled: `409 not_allowed`, "This connection is scheduled. Change its start date instead."; live: as today |
| `set_start_date` | scheduled (another date, or now), live (a date) | a draft or a deactivated connection; a live connection with "now"; the date it already has: `409 not_allowed` |
| `deactivate` | live, scheduled | deactivated: as today |
| `delete` | every published state | |

Computed staleness (`_stale_reason()`), read at every read and under the lock at approval:

- `connection_changed` now also when `start_date != was_start_date`: a request made for a scheduled
  connection does nothing once it became active or its date moved (FR-066);
- `start_date_passed`, new: the requested `start_date` is no longer after today in Germany. The
  request reads as cancelled, and approving answers `409 approval_cancelled` (FR-065).

Approving runs the existing services, with the request's date and status snapshot
(`expected=StatusSnapshot(was_active, was_start_date)`), and the person of the activity entry is
the approver with the asking agent (§2.1, `approved = true`).

---

## 8. Settings

| Variable | Field | Default | Meaning |
|---|---|---|---|
| `DELETION_UNDO_SECONDS` | `deletion_undo_seconds: int` | `300` | How long a deleted connection can be restored (FR-036). `0` switches restoring off: every "Undo" answers `409 not_restorable` |

No other setting: the start is always 00:00 in `Europe/Berlin`, the toast's 6 seconds are the
frontend's constant, and the worker's cycle stays 2 seconds.

---

## 9. Migrations

One Alembic revision per slice, each generated with `--autogenerate`, then read and completed by
hand (Constitution V; autogenerate emits no CHECK constraint, partial index or backfill):

| # | Adds | By hand |
|---|---|---|
| 1 | `start_date`, `activated_at`, `deactivated_at`; `connection_activity` | The two-part backfill below; `ck_form_connections_start_date`; `ix_form_connections_start_date` |
| 2 | `deletion_id`, `deleted_by_id` | The named foreign key |
| 3 | `document_order` | `server_default '[]'` kept (an empty list is catalog order) |
| 4 | `example` | `ck_form_connections_example` |
| 5 | `approval_requests.start_date`, `was_start_date` | Nothing; the new action and reasons are values |

Backfill of revision 1, in raw SQL so that `updated_at` stays (FR-021, FR-032):

```text
UPDATE form_connections SET activated_at = published_at  WHERE published_at IS NOT NULL
UPDATE form_connections SET deactivated_at = updated_at  WHERE published_at IS NOT NULL AND NOT is_active

-- for every row that is not deleted, entries without a person:
INSERT connection_activity (kind 'created',     occurred_at = created_at)
INSERT connection_activity (kind 'published',   occurred_at = GREATEST(published_at, created_at))   -- published rows
INSERT connection_activity (kind 'deactivated', occurred_at = updated_at)     -- deactivated rows
```

A connection created published (spec 001's path) took its `published_at` from Python just before
the database's `now()` set its `created_at`, a few milliseconds earlier, so its `published` entry
is written at `created_at` and lists above `created` by its position (decided 2026-11-11 with the
user, phase 2; design-notes §4.2). `activated_at` keeps the `published_at`.

Each downgrade drops what its upgrade added; revision 1's downgrade first activates nothing and
simply drops the columns (a scheduled connection reads as deactivated afterwards), revision 2's
first deletes the rows of drafts that are marked deleted, since the old code knows no deleted
draft.

---

## 10. State that is never stored

| State | Lives in | Notes |
|---|---|---|
| The selection of overview rows | The overview's reducer | Cleared by "Cancel", after a deletion and when the page is left; a row that leaves the list leaves the selection (FR-040) |
| A deletion that can be undone | The toast (its `deletion_id`) | Gone with the toast: there is no other place to restore from (FR-036) |
| A drag in progress | The documents step's view reducer | Dropped outside or ended with Escape: the order is unchanged (FR-046) |
| The dialogs' "Active from" choice and typed date | The dialog's reducer | "Try again" repeats the same choice (FR-014) |
| A local draft's document order | The record's `documents` array (spec 005) | The array's order is the order; no format change (R6) |
