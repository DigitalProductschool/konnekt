# Contract: management API with scheduling, dates, activity, restorable deletion, document order, the example and data groups

**Consumers**: the React frontend and the MCP server. **Requirements**: FR-001 to FR-021, FR-023 to
FR-037, FR-041 to FR-045, FR-049 to FR-052, FR-055, FR-057, FR-059, FR-060, FR-062 to FR-068,
FR-073, FR-075, FR-077, FR-078, FR-080. **Decisions**: research R1 to R9. **Tables**:
[../data-model.md](../data-model.md).

This extends the contracts of specs 001, 002, 005, 006 and 007. Their common rules stay:
everything under `/api`, the `{data, message?}` and `{error, message, error_id?}` envelopes,
`require_json` on every `POST`, `PUT` and `DELETE`, the principal and the levels of spec 007's
contract, messages as `Text(en, de)` resolved by `errors.py` (spec 009). The Pydantic schemas in
`backend/app/schemas.py` are the source of truth; `api-types/src/` mirrors every shape below in
the same change (Constitution I). Dates named `*_at` are ISO timestamps in UTC; `start_date` is a
calendar day, `YYYY-MM-DD`, the day in Germany.

## Who may call what

New and changed rows; every other row of spec 007's table stays.

| Endpoint | Browser session | Agent `read` | `drafts` | `manage` |
|---|---|---|---|---|
| `GET /api/form-connections/{id}/activity` (new) | ✓ | ✓ | ✓ | ✓ |
| `GET /api/form-connections/search?status=scheduled` (new value) | ✓ | ✓ | ✓ | ✓ |
| `PUT /api/form-connections/{id}/start-date` (new) | ✓ | `403 browser_only` | same | same (agents ask with `set_start_date`) |
| `POST /api/form-connections/example` (new) | ✓ | `403 browser_only` (FR-068) | same | same |
| `POST /api/form-connections/deletions` (new) | ✓ | `403 browser_only` (FR-068) | same | same |
| `POST /api/form-connections/deletions/{deletion_id}/restore` (new) | ✓ (the account that deleted) | `403 browser_only` (FR-068) | same | same |
| `POST …/{id}/publish`, `POST /api/form-connections`, `POST …/{id}/activate` (a `start_date` in the body) | ✓ | `403 browser_only` | same | same |
| `POST /api/approval-requests` with `set_start_date` (new action) | `403 browser_only` | `403 insufficient_access` | `403 insufficient_access` | ✓ |

## Schemas

```text
ConnectionState    = 'draft' | 'scheduled' | 'live' | 'deactivated'      # derived, data-model §1.2
ExampleState       = 'unchanged' | 'changed'
ActivityKind       = 'created' | 'renamed' | 'description_changed' | 'documents_changed'
                   | 'variant_added' | 'variant_removed' | 'variant_renamed' | 'rules_changed'
                   | 'published' | 'scheduled' | 'start_date_changed' | 'became_active'
                   | 'deactivated' | 'reactivated' | 'deleted' | 'restored'

# Connections: new fields only
FormConnectionSummary  += { state: ConnectionState,
                            published_at: str | None,          # null for a draft
                            deactivated_at: str | None,        # set while deactivated
                            start_date: str | None,            # set while scheduled
                            step: EditorStep | None,           # a draft's stored step, null once published
                            example: ExampleState | None }     # null unless the draft is the example
FormConnection         += { state: 'scheduled' | 'live' | 'deactivated',
                            published_at: str, activated_at: str | None, deactivated_at: str | None,
                            start_date: str | None, last_activity: ActivityEntry | None }
FormConnectionDraft    += { state: 'draft', example: ExampleState | None,
                            last_activity: ActivityEntry | None }
FormConnectionCreate   += { start_date: str | None = None }    # DraftPublish inherits it
ActivateRequest        { start_date: str | None = None }       # the body of POST …/{id}/activate
StartDateUpdate        { start_date: str | None }              # required key; null means now

# Activity
ActivityActor      { name: str, agent: str | None, approved: bool }
                   # name: the team member's username when the entry was made
                   # agent without approved: the agent made the change for that team member
                   # agent with approved: the team member approved what the agent asked for
ActivityEntry      { id, kind: ActivityKind, at: str, variant: str | None, start_date: str | None,
                     actor: ActivityActor | None }             # actor null: the middleware, or unknown
ActivityPage       { items: ActivityEntry[], next_cursor: str | None }

# Deletion
Deletion           { id: str | None, restorable_until: str | None }
                   # the answer of every delete; id null when nothing can restore it
DeletionItem       { id: str, state: ConnectionState }         # the status the dialog showed
DeletionCreate     { items: DeletionItem[] }                   # 1 to 500, distinct ids
RestoredConnections { items: FormConnectionSummary[] }

# Catalog
FieldGroup         { key: str, label: str }                    # label in the request's language
DocumentType       += { field_groups: FieldGroup[] }           # in panel order; [] for 10 fields or fewer
DocumentField      += { group: str | None }                    # a FieldGroup's key; null without groups

# Approval requests
ApprovalAction     += 'set_start_date'
ApprovalCreate     += { start_date: str | None = None }
ApprovalRequest    += { start_date: str | None }               # as asked; null: at once / now
                   # cancel_reason gains 'start_date_passed'; the connection's own start date is
                   # on ApprovalPreview.connection
```

`status` stays `'draft' | 'published'`, the discriminator of `FormConnectionOrDraft`, and
`is_active` stays; `state` is what every consumer shows. `documents` has no new field: **its order
is the stored order**, in every request body and every response (data-model §4).

## Endpoints

### Scheduling (FR-001 to FR-014)

| Endpoint | Body | Effect | Answer |
|---|---|---|---|
| `POST /api/form-connections`, `POST …/{id}/publish` | `start_date` (optional) | Without one: as today, and `activated_at` is set. With one: published and scheduled; EUDIPLO is called as for any publish, so the links exist at once | `FormConnection` |
| `POST …/{id}/activate` | `ActivateRequest` (an empty body is "now") | Deactivated → live, or → scheduled with a date. A live connection: nothing, as today. A scheduled connection: `409 status_changed` | `FormConnection` |
| `PUT …/{id}/start-date` | `StartDateUpdate` | Scheduled: the date moves, or `null` makes it live now. Live: a date schedules it and cancels the open requests; `null` changes nothing. Deactivated: `409 status_changed`. A draft: `409 not_published` | `FormConnection` |
| `POST …/{id}/deactivate` | none | Also for a scheduled connection: the schedule ends and it is deactivated (FR-012) | `FormConnection` |

Every path that takes a date checks it with `clean_start_date()`, before EUDIPLO is called and
again under the row lock: a date that is today or earlier in Germany answers

```text
400 { error: 'invalid_start_date', message: "Enter a date after today." }
```

and nothing is published or changed (FR-003). A value that is no date fails the body's validation
(`400 Validation error`, the generic message); the dialogs never send one. `PUT …/{id}` (saving a
published connection) takes no date and never changes one (FR-009, FR-013).

### Activity (FR-022 to FR-032, FR-063)

`GET /api/form-connections/{id}/activity?cursor=` → `ActivityPage`: the connection's entries,
newest first, 50 per page; `next_cursor` is null on the last page; an unknown cursor answers `400`
as the search's does. A deleted or unknown connection answers `404`. There is no endpoint that
writes, changes or removes an entry (FR-031).

`last_activity` on `FormConnection` and `FormConnectionDraft` is the entry the closed card's line
shows (data-model §2.5).

### Deleting, bulk deleting and restoring (FR-033 to FR-044)

| Endpoint | Effect | Answer |
|---|---|---|
| `DELETE …/{id}`, `DELETE …/{id}/draft` | As today, and now restorable: the answer carries the deletion | `Deletion` |
| `POST /api/form-connections/deletions` | Deletes every listed connection, drafts and published ones alike, in one transaction, as one deletion | `201`, `Deletion` |
| `POST /api/form-connections/deletions/{deletion_id}/restore` | Brings back every connection of the deletion, or none | `RestoredConnections` |

Refusals:

```text
409 { error: 'selection_changed', message: "Nothing was deleted: a connection was deleted or
      changed in the meantime.", changed_ids: [str] }
      # a listed connection doesn't exist, is deleted, or its state differs from the item's;
      # the dialog names the first of them from its own rows (contracts/copy.md)
409 { error: 'not_restorable', message: "This can no longer be restored." }
      # unknown deletion, already restored, past DELETION_UNDO_SECONDS, or another account's
```

The bulk deletion locks the rows in id order. It calls no EUDIPLO, as a single deletion calls
none. A deletion run by an approved approval request answers `Deletion { id: null, … }` inside the
service and is never restorable (FR-067).

### The example (FR-054 to FR-061)

`POST /api/form-connections/example` → `201`, `FormConnectionDraft` with `example: 'unchanged'`
and `step: 'connection'`, its texts in the request's language. It does not count towards the
agents' draft limit, since agents can't call it. Every call creates another draft (the edge case
"created twice").

### The catalog (FR-077, FR-078, FR-080)

`GET /api/document-types` answers `field_groups` and each field's `group`. `fields` stays in
catalog order; the panel sorts by group itself.

## Changed behaviour of existing endpoints

- `GET /api/form-connections`, `GET …/search`, `GET …/{id}`: the new fields; documents in the
  stored order. The search's `status` accepts `scheduled`; `deactivated` no longer matches a
  scheduled connection; `live` is unchanged.
- `POST /api/form-connections/drafts`, `PUT …/{id}/draft`, `PUT …/{id}`, `POST …/{id}/publish`:
  the order of `documents` in the body is stored (FR-045); each writes its activity entries
  (data-model §2.3); a draft save may move `example` to `'changed'`.
- `POST /api/approval-requests`: `start_date` for `publish`, `reactivate` and `set_start_date`
  (data-model §7); for another action a `start_date` answers `400`. `deactivate` and `delete`
  accept a scheduled connection. A date not after today answers `400 invalid_start_date`, and no
  request is made (FR-065).
- `GET /api/approval-requests/{id}`: the new fields; a request whose connection's state or start
  date moved reads as `cancelled` with `connection_changed`, one whose asked date is no longer
  after today with `start_date_passed`.
- `POST …/approve`: runs the same services with the asked date and the snapshot, and the entry's
  person is the approver with the asking agent (FR-067).

## What serviceBW sees (FR-004, FR-075)

Nothing new under `/api/connect/`. A scheduled connection's trigger and pull URLs answer
`409 { error: 'unavailable', message: 'This form connection is deactivated or deleted' }`, word for
word a deactivated connection's answer, until the worker makes it live. A deleted draft's URLs
answer `404`, as today, also while the draft can still be restored. The documents and their fields
are delivered in catalog order, as today, whatever the stored order is (FR-051).

## The worker (FR-005, FR-030, FR-036)

| Step | When | What |
|---|---|---|
| `activate_scheduled_connections` (new, first) | Every cycle (2 s) | Published, not deleted rows with `start_date <= today in Germany`, locked with `SKIP LOCKED`: `is_active = true`, `start_date = NULL`, `activated_at` = the start; the entry `became_active` without a person. Logs the count |
| `delete_unused_configs` (changed) | | A deleted connection's configurations only once `deleted_at <= now - DELETION_UNDO_SECONDS` |
| `finish_deletions` (new, last) | Every cycle | For rows deleted longer ago than `DELETION_UNDO_SECONDS`: deletes their activity entries and the rows of drafts. Logs the counts |

## Setting

`DELETION_UNDO_SECONDS` (default `300`): how long a deletion can be restored. Documented in
`README.md`, `docs/ARCHITECTURE.md` and `backend/.env.example`.
