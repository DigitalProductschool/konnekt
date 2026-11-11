# Research: the stored-data features of the KERN Revamp design

**Phase 0 output of `/speckit-plan`** | **Date**: 2026-11-11 | **Spec**: [spec.md](spec.md)

This file records each technical decision behind the plan, with the reason for it and the
alternatives that were weighed. Points to confirm while coding are marked **Verify at
implementation** and collected in R15.

**Sources**: the spec (Clarifications 2026-11-10 #1 to #37), its Figma audit of 2026-11-10
(`figma-audit/report.md`: F1 to F43, W1 to W18, and the units' inventories), spec 008's
`deferred.md`, contracts and design notes, spec 007's and spec 009's plans and contracts, the
constitution v1.2.1, `CLAUDE.md`, `docs/ARCHITECTURE.md`, and three surveys of the code on
2026-11-11: the backend's connection lifecycle (models, services, routers, worker, tests), the
approval requests with the MCP server, and the management UI. Figma was not read for the plan: the
audit's inventories hold the frames' texts, and the tasks read the nodes.

## Technical Context: open points and how they were resolved

| Open point | Resolved in |
|---|---|
| How "scheduled" is stored, and how serviceBW gets a deactivated connection's answer from it | R1 |
| What a start date is, who makes the connection active on it, and how "today" is known | R2 |
| Which dates are stored, what moves them, and what existing connections show | R3 |
| Where the activity is stored, how the acting person reaches the services, what a save records, how repeated changes merge | R4 |
| How a deletion becomes restorable, for drafts too, without changing what a deletion does today | R5 |
| Where the document order is stored without touching what serviceBW and the wallet get; how dragging works without a library | R6 |
| Who builds the example, how "unchanged" is known, and how "always publishable" is proven | R7 |
| Where the data groups live and how the panel gets them | R8 |
| How agents ask for a start date, and what "the status a request was made for" becomes | R9 |
| How several connections are deleted together, and where the selection lives | R10 |
| How the undrawn copy and the German are written | R11 |
| What changes for toasts | R12 |
| How the frontend's new parts are cut | R13 |
| What this checkout can run, and in what order the work runs | R14 |
| What still needs a check at implementation | R15 |

No open point blocks the plan.

---

## R1. A scheduled connection is a published one that is not active and has a start date

**Decision**: no status column. `form_connections` gains `start_date` (a `Date`), and "scheduled"
is `published_at IS NOT NULL AND NOT is_active AND start_date IS NOT NULL`. Publishing with a date
runs today's publish unchanged (`create_revision()` with its `DraftGuard`, the EUDIPLO
configuration, rule set 1, the branch rows) and writes `is_active = false` with the date. A CHECK
constraint allows a start date only on a published, inactive row. One function, `state_of()`,
derives `draft`, `scheduled`, `live` or `deactivated`, and the responses answer it as `state`
beside the unchanged `status` and `is_active`.

**Rationale**: FR-004 and FR-075 want serviceBW to get a deactivated connection's answer, "so that
serviceBW cannot tell the two apart". Every place that decides whether a connection is usable
already reads `is_active`: `_usable_form_connection()` (the trigger and both pulls), the worker's
cancel step, the trigger's insert. With `is_active = false` they answer `409 unavailable` word for
word, with no change and no new test path to keep in step. The places that word the status for
people and agents are few (the two views, the search's filters, the approvals' preconditions), and
they all go through `state_of()`. `status` stays the discriminator of `FormConnectionOrDraft`, so
no existing consumer breaks; `state` saves the frontend, the MCP server and its fake backend three
copies of the derivation.

**Alternatives considered**:
- *A `status` enum column* replacing `is_active`: every query, the CHECK constraint of spec 005,
  the approvals' `was_active` snapshot and the worker's scans would change, for the same
  behaviour.
- *`is_active = true` with a future `active_from` timestamp*, checked at each call of the
  connection URLs: no worker step, but every reader of `is_active` (the cancel step, the
  approvals, the views) would need the second condition, and a missed one makes a scheduled
  connection usable.
- *Deriving the state in each consumer from `start_date`*: three implementations of one rule.

## R2. The start is a day in Germany; the worker makes the connection active

**Decision**:
- **A `Date`, not a timestamp.** `start_date` is the calendar day in `Europe/Berlin`. The instant
  is derived: `start_instant(day)` is `datetime.combine(day, time.min, tzinfo=GERMANY)`. A new leaf
  module `app/services/start_dates.py` holds `today_in_germany()`, `start_instant()` and
  `clean_start_date()` (a day after today, else `400 invalid_start_date`), with `GERMANY` from
  `services/evaluation.py`.
- **Checked on the server at every path, under the row lock too** (publishing, activating, the
  start-date endpoint, an approval's request and its approval), so that a dialog confirmed after
  midnight is refused (FR-003, the edge case). The dialogs check first with
  `useTodayInGermany()`, which already exists for the test step.
- **One activator.** A new worker step, `activate_scheduled_connections`, first in `STEPS`: rows
  that are published, not deleted, with `start_date <= today_in_germany()`, locked with
  `SKIP LOCKED`, become active with `activated_at = start_instant(start_date)`, and the activity
  gets `became_active` without a person. The worker's cycle is 2 seconds, so SC-001's minute holds
  with room. After a downtime the first cycle catches up, and "Active since" is the scheduled start
  (the spec's edge case).
- **Nothing else activates on a date.** A restore of a scheduled connection whose date has come
  leaves it scheduled, and the next cycle activates it; "Change start date" with "Now" and
  "Activate again" with "Now" set `activated_at` to the moment of the action.

**Rationale**: the design's field takes a date and its pill reads "00:00" (the spec's assumption
"The start is a day, not a time"). A stored day shows the same for every team member with no time
zone arithmetic in the browser (FR-020): the frontend formats `2026-12-01` as written. Midnight
exists on every day in Germany (the clock changes at 02:00 and 03:00), so the instant is never
ambiguous. One activator keeps "who made it active, and since when" in one place and makes the
restart case free.

**Alternatives considered**:
- *A timestamp at 00:00 Berlin*: the browser would convert it to the viewer's zone, and a team
  member abroad would read another day.
- *Activating lazily in `_usable_form_connection()`*: exact to the second without the worker, but
  the status would be true in one place and stale in the database until something writes it, and
  the activity entry would have no writer.
- *A scheduler library or a timer per connection*: a dependency and state that a restart loses.

**Tests** control the day by monkeypatching `start_dates.today_in_germany`, and call the step
directly, as the suite does for every step (`WORKER_ENABLED=false`).

## R3. Two new dates beside `published_at`

**Decision**: `activated_at` (when the connection last became active) and `deactivated_at` (when
it was last deactivated), both nullable timestamps on `form_connections`. `published_at` keeps
meaning "published, with 'Now' or with a date". The transition table of data-model §1.3 is the
only place that says what moves them: saving, renaming and reordering never do (FR-018). The
migration backfills `activated_at = published_at` and, for deactivated rows, `deactivated_at =
updated_at` (FR-021), in raw SQL so that `updated_at` stays.

The list answers `published_at`, `deactivated_at`, `start_date` and a draft's `step`; the detail
adds `activated_at`. The row's text was already prepared: `rowMetaOf()` takes an optional `step`
that no response carried (spec 008, F71).

**Rationale**: the row and the pill show two different facts (the spec's assumption "Published
<date> and Active since <date> are two facts"), and `updated_at` moves with every save, so neither
can be derived.

**Alternatives considered**: reading the dates from the activity (the newest `published` or
`deactivated` entry) was rejected: the list would need a join per row, merged entries move their
time, and the activity of a deleted connection is removed.

## R4. The activity: one table, written by the services, with the person passed in

**Decision**:
- **A table `connection_activity`** (data-model §2): the kind, the time, a variant's id and name,
  a date, and the person as text (`actor_name`, `agent_name`, `approved`). `ON DELETE CASCADE` to
  the connection; no foreign key to the account, so the name stays as it was (FR-028).
- **The services write it**, in the transaction that changes the connection, under its row lock:
  `activity.record(db, form_connection_id, entries, actor)`. No middleware, no ORM event.
- **The person reaches the services as an `Actor`** (`name`, `agent`, `approved`), a frozen
  dataclass in `services/activity.py`. Today no service knows who calls it: the routers use
  `require_browser_session` and `get_current_principal` only as guards. Every mutating service
  gains a keyword argument `actor`; the routers build it with `actor_of(principal)` (the username;
  for a bearer also the agent's name, the function `approvals._agent_name()` moved beside it), the
  approvals with the approver and the request's `requested_by` (`approved = true`), the worker
  with `SYSTEM` (no person).
- **What a save records** comes from one pure function, `changes_between(before, after)`, called
  by the three save paths with the stored content and the one about to be stored (data-model
  §2.3). A linked variant's rules count as changed only in what is its own (its marked items and a
  switched top-level operator), so a change of Standard that propagates is one entry.
- **Merging at the write** (FR-026): an entry whose kind, person and variant equal an entry of the
  connection's newest instant moves that entry's time instead of adding a row.
- **Reading**: `GET …/{id}/activity`, 50 per page with the search's keyset cursor; the detail
  carries `last_activity` for the closed card's line. The server sends kinds and data, never
  sentences: the website words them in its language, the MCP server in English.
- **The names are usernames** (the user menu shows `user.username`; accounts have nothing else).
- **Existing connections** get entries without a person from the migration: `created`, `published`
  and, if deactivated, `deactivated` (FR-032, FR-021).

**Rationale**: FR-025 lists events of the domain ("a variant was added", "its start date
changed"), which only the code that makes the change knows; a generic audit of requests or of
changed columns could not name them and would record content FR-029 forbids. Writing under the row
lock makes the entry and the change one fact. Merging at the write keeps the table small and the
list honest (an agent's twenty edits are one row whose time is the last edit). The pure diff is
testable without a database and is reused by the example's "unchanged" mark (R7).

**Decided, not listed in FR-025**: a change of a variant's description alone writes no entry
(FR-029 allows only the listed kinds); it does count as a change of the example. Recorded under
the plan's Complexity Tracking.

**Alternatives considered**:
- *Merging at read time* (keep every entry, group them for display): the table grows with every
  agent call, and paging over groups is awkward.
- *A JSON list on the connection's row*: rewritten whole at every change, and the row lock is
  already held, but hundreds of entries in every read of the connection.
- *The person from a `ContextVar` set per request*: hidden input to the services; the worker and
  the approvals would have to fake a request.

## R5. Deleting marks the row, for drafts too; a deletion has an id

**Decision**:
- **Published connections already keep their row** with `deleted_at`. **Drafts now do the same**
  until the restore time has passed. The existing finders (`find_form_connection()`,
  `_lock_form_connection()`), the list and the search already hide a row with `deleted_at`, so a
  deleted draft is gone for every management read with no change. Two readers change so that a
  deleted draft answers as today: the connection URLs (`404`, not `409`) and the approvals'
  computed reasons (`draft_deleted`).
- **A deletion has an id**: `deletion_id`, one UUID for the rows deleted together, with
  `deleted_by_id`. Every delete answers it; "Undo" sends it back:
  `POST /api/form-connections/deletions/{deletion_id}/restore`, for the account that deleted,
  within `DELETION_UNDO_SECONDS` (300), all rows or none.
- **Restore clears the three columns and nothing else.** The name, the content, the status
  columns, the dates, the activity and the links' ids were never touched, so the connection is
  back as it was (FR-034). `updated_at` is kept on delete and on restore
  (`flag_modified(row, 'updated_at')` puts the current value into the `UPDATE`, which stops the
  column's `onupdate`), so a restored draft still reads its old "Edited" date and keeps its place
  in the list.
- **What deletion ends stays ended** (FR-035): the open requests are cancelled as today, and the
  deletion now *stores* `cancelled` on the connection's waiting approval requests
  (`connection_deleted`, `draft_deleted`). Today those reasons are computed from the row, so a
  restore would bring the requests back to `waiting`.
- **The worker waits.** The step that deletes unused EUDIPLO configurations takes a deleted
  connection's only after the restore time, so a restored connection has its configuration and
  its links work at once. A new last step, `finish_deletions`, then removes the activity of
  connections whose restore time has passed (FR-030) and the rows of deleted drafts, which is
  today's draft deletion, a few minutes later.
- **A deletion approved for an agent has no id**, so nothing can restore it, and the approval page
  keeps saying that deleting can't be undone (FR-067).

**Rationale**: the spec decides that deleting takes effect at once and "Undo" reverses it
(Assumptions), so the deletion must be a mark. The schema is nearly there; the work is in the two
readers, the worker's timing and the approval requests. One id for one or many rows gives single
and bulk deletion the same "Undo" and the same restore endpoint.

**Alternatives considered**:
- *Holding the deletion back until the toast is gone*: nothing to restore, but a closed tab would
  either lose the deletion or need a server-side timer, and the connection would stay usable for
  citizens after the team member deleted it.
- *Copying a deleted draft into a bin table*: a second shape of a connection to keep in step.
- *Restoring by connection id*: a bulk "Undo" would be N calls that can half succeed.

## R6. The document order is a list on the connection; revisions stay in catalog order

**Decision**:
- **Storage**: `form_connections.document_order`, the document type keys in the team's order, for
  drafts and published connections. The order comes from the order of `documents` in the request
  body, and every response lists `documents` in it. No request or response gains a field.
- **Untouched**: `clean_documents()` keeps returning catalog order for the draft's content and the
  revision. The DCQL query, its `config_hash` (which covers the order of the credentials) and
  `extract_documents()` (what serviceBW receives) read the revision, so they don't change
  (FR-051). `update_form_connection()` already compares cleaned documents, so a save that only
  reorders creates no revision and calls no EUDIPLO; it writes the order like a rename.
- **Existing connections**: an empty list means catalog order, which is what they show today
  (FR-052), so there is no backfill.
- **The editor**: its state is already an ordered array, loaded in the server's order, sent as it
  is, compared in order for "unsaved changes", and stored in order in a local draft (FR-049: no
  format change). Two places sort into catalog order today and stop doing so: the frontend's
  `inCatalogOrder()` (on add and on the removal's "Undo") and the MCP server's (`set_document`).
- **One implementation of the move**: `moveDocument(documents, documentType, toIndex)` in
  `rules/src/edits.ts`, with `appendDocument()` and `restoreDocument()` (back to its index), each
  with its tests. The editor's reducer and the MCP tools call them (CLAUDE.md: a new editing
  action goes into `edits.ts`).
- **Dragging without a library**: Pointer Events on the row. A mouse or pen drags after 4 px; a
  touch after a 400 ms press without movement, and a touch that moves earlier scrolls
  (`touch-action: pan-y`, the browser's `pointercancel` ends the wait). While a touch drag is
  armed, a non-passive `touchmove` listener calls `preventDefault()` so the page doesn't scroll.
  The state machine (`idle`, `pressed`, `dragging`; the target index from the pointer's y and the
  rows' measured boxes) is a pure reducer in `DocumentsStep/utils.ts` with its tests; a small hook
  holds the listeners. The copy that follows the pointer is positioned by two CSS custom
  properties the hook sets (`--drag-x`, `--drag-y`), which Tailwind classes read.
- **Without dragging**: an `ActionMenu` per row with "Move up" and "Move down" (WCAG 2.5.7), the
  spec's Clarification #16.

**Rationale**: the order belongs to the management UI (the spec's assumption), and the revision is
what EUDIPLO and serviceBW see, so keeping the two apart makes FR-051 true by construction. The
editor needed almost nothing, because it never depended on catalog order except in two sort calls.
A pure state machine keeps the drag inside the Vitest gate, where a DOM library could not be
tested (Constitution III: no jsdom).

**Alternatives considered**:
- *The order inside the revision's `documents`*: a reorder would be a new revision with a new
  EUDIPLO configuration, and the delivery to serviceBW would change order.
- *The browser's HTML drag and drop* (`draggable`): the faded copy and the press-and-hold on touch
  come for free, and no coordinate is set, but touch dragging differs between Chromium and Firefox
  on desktop, the drop line and "Escape leaves the order" need the same code anyway, and nothing
  of it can be tested in Node.
- *A drag library* (dnd-kit, SortableJS): a dependency for one list of at most a handful of rows
  (Constitution IV).

**On the constitution**: the styling rule forbids inline styles and allows a value measured at run
time to be set as a CSS custom property for classes to read (v1.2.1). The pointer's offset is such
a value and carries no style itself. `CLAUDE.md`'s half-sentence names "a measured height"; the
documentation task widens it to "a measured value". Recorded under Complexity Tracking.

## R7. The example is built by the server and marked on the row

**Decision**:
- **`POST /api/form-connections/example`**, for a browser session only (FR-068), stores a draft
  through the draft-creation path (the same validation and numbering) from `app/example.py`, a
  leaf module with the content as data and its texts as `Text(en, de)`, resolved in the request's
  language (FR-061). It records `step = 'connection'` (Clarification #36).
- **The mark**: `form_connections.example`, `'unchanged'` or `'changed'`, null otherwise and after
  publishing. A draft save moves it to `'changed'` when `changes_between()` (R4) finds a change;
  it never goes back. The publish dialog shows its line while the loaded mark is `'unchanged'` and
  the page holds no change; the approval page reads the stored mark (FR-060).
- **"Always publishable" is tested, not hoped** (FR-056, the edge case "the catalog changes"):
  pytest runs publishing's checks (`complete=True`) on the example in both languages; the fixture
  script writes it to `rules/src/fixtures/example-connection.json`, and a Vitest test runs the
  rules package's validation and the rule checks on it and expects no problem and no finding. The
  script's `--check`, already run by pytest, fails when the file is stale.
- **The banners** show while `example` is set. The variant's banner shows on a variant that
  carries the example variant's name in either language; a renamed variant shows none.

**Rationale**: the example is data of the product, like the catalog it is built from, so it lives
beside the catalog and is created by the code that creates every draft. A stored mark answers "is
this still the example?" without comparing contents across languages and catalog versions.

**Alternatives considered**:
- *The frontend builds the example and posts it as a draft with a flag*: the rules package could
  test it directly, but any client could mark any draft, agents would need the flag refused, and
  the rule and variant identifiers would be made in a second place.
- *Comparing the draft with the example at read time* instead of a mark: stateless, but it must
  know both languages and every past catalog.
- *Recognising the example's variant by id*: the id is assigned at creation, so the response would
  need a field for one banner.

## R8. The data groups are catalog data

**Decision**: `CatalogField.group` and a table of groups with English and German labels in
`app/catalog.py` (data-model §6). `GET /api/document-types` answers `field_groups` (in panel
order, empty for a document with 10 fields or fewer) and each field's `group`; `fields` stays in
catalog order. The panel groups them itself: `groupedFieldsOf()` in `DocumentsStep/utils.ts`, and
a group's checkbox goes through the same removal question as "All data items". The catalog's unit
test holds FR-078's rules and the driving licence's counts. The MCP server's `get_catalog` adds
the group's English name to each data item.

**Rationale**: FR-078 says the groups come from the catalog, and the labels need both languages,
which `label_of()` already gives. Keeping `fields` in catalog order means nothing changes for the
DCQL builder, the delivery or any consumer that ignores groups.

**Membership**: the driving licence follows Clarification #35 (Name 4, Birth 6, Address 5,
Document 6, Licence 3, Appearance 6, Other details 1); the Personal ID follows its frame (A5).
That puts the nationality under Birth in one document and under Other details in the other; the
plan's Complexity Tracking asks the user.

## R9. Agents: a start date on a request, one new action, a wider snapshot

**Decision**:
- **`ApprovalCreate.start_date`** for `publish` and `reactivate` (optional), and a new action
  **`set_start_date`** (level `manage`), whose `start_date` is the new date or null for now. The
  name has 14 characters; `approval_requests.action` holds 16.
- **The snapshot** a request was made for becomes `was_active` with `was_start_date`. The
  services' `expected_active` becomes `expected: StatusSnapshot | None`, checked under the row
  lock by `_lock_for_status_change()`; a difference answers `409 status_changed`, which the
  approval maps to `connection_changed` as today (FR-066).
- **A date is checked twice**: at the request (no request is made) and, as a computed reason
  `start_date_passed`, at every read and at approval (FR-065).
- **Approving runs the same services** with the date: `publish_stored_draft(..., start_date)`,
  `activate_form_connection(..., start_date)`, `set_start_date()`, and the unchanged
  `deactivate_form_connection()` and `delete_form_connection()`, which now accept a scheduled
  connection (CLAUDE.md: never a second path).
- **The MCP server**: `request_approval` takes `start_date` (`YYYY-MM-DD` or `'now'`) and the new
  action; `check_approval` answers the date; `search_connections` accepts `scheduled`;
  `get_connection` answers the dates, the step, the order and the example mark; two new tools,
  `get_activity` (read) and `move_document` (drafts); `get_catalog` answers groups. Every change
  lands with its skill and the instructions, and `guidance.test.ts` stays the gate
  ([contracts/mcp-tools.md](contracts/mcp-tools.md)).
- **Nothing for restoring, bulk deleting or the example** (FR-068): their endpoints depend on
  `require_browser_session`.

**Rationale**: spec 007's model (ask, snapshot, approve by running the existing service) carries
the new cases without a new mechanism. A separate action for the start date keeps "reactivate"
meaning what it says and gives the approval page one sentence per case.

**Alternatives considered**: a `schedule` action beside `publish` and `reactivate` (three ways to
say "with a date"); a start date only as a second request after publishing (two approvals for one
intent).

## R10. One atomic endpoint for several deletions; the selection is page state

**Decision**: `POST /api/form-connections/deletions` takes the selected rows as `{id, state}`
pairs, locks them in id order, checks that each exists, is not deleted and still has the state the
dialog showed, and deletes all with one deletion id in one transaction, or answers
`409 selection_changed` with the ids that differ and deletes nothing (FR-043). The single deletes'
core (`_mark_deleted()`) is the same code. The dialog names the changed connection from its own
rows, since the server may no longer have the row.

The selection is a pure reducer in the overview's `utils.ts` over the ids (`toggle`, `toggleAll`
over the listed rows, `clear`, `prune` when the list changes). It is never stored and ends with
the page (FR-040).

**Rationale**: deleting calls no EUDIPLO (the worker cleans up), so one transaction is enough for
"all or none". Sending the state the dialog showed makes the check exactly FR-043's sentence.

**Alternatives considered**: N single deletes from the browser (can stop halfway); a `DELETE` with
ids in the query (no body for the states; `require_json` wants JSON anyway).

## R11. Copy: the frames' English, this feature's undrawn sentences, German from the glossary

**Decision**: [contracts/copy.md](contracts/copy.md) is the one place for what no frame draws and
no requirement words, in English and German, and for the terms spec 009's glossary gains
(scheduled, start date, activity, example, selected, restore, move). The frames' and the spec's
sentences get their German in the task that makes each copy table, as spec 009 did. The activity's
sentences are composed in the frontend from the kind (and in English in the MCP server), so the
server stores no text in a language. `copy.test.ts` keeps checking every table.

**Rationale**: the spec says the undrawn copy is "written in this feature … and recorded in its
contracts"; one file keeps the wording reviewable before it spreads over thirty tables.

## R12. Every toast closes after 6 seconds

**Decision**: `ToastMessage`'s timer stops depending on whether the toast has an action; the
pause while the pointer or the focus is on the toast already exists and stays. What an expired
toast means is already built for each kind: the documents step expires its removal, the rules step
keeps Ctrl/Cmd+Z, the save failure's toast goes and "Save and exit" is still there. The comments
that say "no timer" for action toasts are corrected.

**Rationale**: Clarification #22. The change is one condition, and the 6 seconds are the existing
`TOAST_DURATION_MS`.

## R13. The frontend's new parts

**Decision**:
- **`components/ActiveFromChoice/`**: the radio group with the date field, used by three dialogs,
  with `startDateOf(text, today)` in its `utils.ts` (tests: empty, today, the past, 31.02., a day
  after today, single-digit days). `rules/src/dates.ts` already has `isValidIsoDate()` and
  `formatDate()`.
- **`ConnectionStatusBadge` and `StatusBand`** take the API's `state`; the date pill is part of
  the band.
- **`FormConnectionDetail/ActivityCard.tsx`** with `StartDateDialog.tsx`; the card loads its first
  page when it first opens and the next when the list's end scrolls into view
  (`IntersectionObserver` inside the card's scroll area, which takes keyboard focus).
- **`FormConnectionList/`**: `SelectionBar.tsx`, `BulkDeleteDialog.tsx`, the selection reducer,
  the deletion kept beside the toast; `WelcomePage.tsx` with `ExampleDialog.tsx`.
- **`components/ExampleBanner/`**, in the look of the findings banner's info variant.
- **Dates**: a start date is formatted from its string (`formatDate()`), never through `Date`, and
  ", 00:00" is copy; timestamps keep the existing formatters.
- **No dependency** is added.

**Rationale**: each part is used in more than one place or is a card of its own; pure helpers and
reducers sit in the sibling `utils.ts` with tests, as the constitution asks.

## R14. What this checkout can run, and the order of work

**Checked on 2026-11-11**: Node 20.19.2 and npm 9.2 (the constitution says 22+, CI runs 26; specs
008 and 009 were built here the same way), uv 0.13.0, PostgreSQL accepting connections on `localhost:5435`
(`new-design-postgres-1`), no `node_modules` yet (`npm install` first), a backend `.venv` present.
`.git` points at another machine's path; git works here with
`GIT_DIR=/home/debian/batch27-faro/worktrees/010-revamp-backend-gaps` and
`GIT_WORK_TREE=/home/debian/batch27-faro/010-revamp-backend-gaps`, on the branch
`010-revamp-backend-gaps`. The Playwright MCP tools (Chromium, Firefox) and the Figma MCP are
available to the tasks.

**Order** (the plan's "Rules for `/speckit-tasks`"): the person and the activity come first,
because every later slice writes entries; the dates come before scheduling, because the date pill
carries scheduling's menu; then the stories in the spec's order, each a vertical slice (backend,
api-types, frontend, MCP with its guidance), with the agents' start date last, since it needs
scheduling and the approvals.

## R15. Verify at implementation

| # | Point | Where |
|---|---|---|
| V1 | `flag_modified(row, 'updated_at')` keeps `updated_at` through delete and restore (the `onupdate` is skipped when the column is in the `UPDATE`) | R5; a pytest case |
| V2 | The touch drag in Chromium and Firefox: `touch-action: pan-y`, the 400 ms hold, `pointercancel` on a scroll, the non-passive `touchmove` while armed | R6; Playwright with touch |
| V3 | `start_instant()` on the days the clock changes (29.03.2026, 25.10.2026) | R2; a unit test |
| V4 | The new routes don't shadow or get shadowed by `/{form_connection_id}`: `POST /example`, `POST /deletions`, `POST /deletions/{id}/restore`, `GET /{id}/activity`, `PUT /{id}/start-date` | R5, R7; API tests |
| V5 | `apiFetch` sends `{}` for a `POST` without a body, so `ActivateRequest`'s default applies | R2 |
| V6 | `IntersectionObserver` with the card's scroll area as root; the area scrolls with the keyboard | R13 |
| V7 | The example passes `complete=True` and the rule checks find nothing in it, in both languages | R7 |
| V8 | The three-column flow of group blocks (`break-inside: avoid`) follows the group order down the columns, at 1440 px and narrow | R8 |
| V9 | A draft's publish in flight that meets a deleted (marked) row removes its configuration and its reserved revision, as it does today for a removed row | R5; the existing test, adapted |
| V10 | The worker's configuration cleanup re-checks the restore time under its own lock, so a restore at the last second keeps the configuration | R5 |
| V11 | Node 20 here against the constitution's 22+: the gates pass here and in CI (Node 26) | R14 |
| V12 | The local-drafts banner against frames 1m and 1n | contracts/ui-screens.md S5 |
