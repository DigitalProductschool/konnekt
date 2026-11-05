# Contract: management API, with drafts

**Consumer**: the middleware's own React frontend. **Requirements**: FR-001 to FR-013, FR-022 to
FR-027. **Decisions**: research R1 to R8.

This extends spec 001's contract
([../../001-servicebw-eudi-middleware/contracts/management-api.md](../../001-servicebw-eudi-middleware/contracts/management-api.md))
and spec 002's
([../../002-connection-rules/contracts/management-api.md](../../002-connection-rules/contracts/management-api.md)).
Their common rules stay:
- everything is under `/api`;
- the `{data, message?}` and `{error, message, error_id?}` envelopes;
- the session cookie (`401` without it);
- JSON-only state changes (`415`): every new `POST`, `PUT` and `DELETE` depends on
  `require_json`;
- the common errors.

Every new endpoint depends on `get_current_user`, so drafts are visible and changeable for
signed-in team members only (FR-027), and every team member can see, continue and delete every
draft. The Pydantic schemas in `backend/app/schemas.py` are the source of truth;
`frontend/src/types/form-connections.ts` mirrors them in the same change (Constitution I).

## Schemas

New and changed shapes. `RequestedDocument`, `RequestedDocumentView`, `BranchInput`, `RulesInput`,
`NumberingBase` and `Branch` are spec 001's and spec 002's.

```text
ConnectionStatus  = 'draft' | 'published'
EditorStep        = 'connection' | 'documents' | 'rules' | 'test'

# Changed
FormConnectionSummary { id, name, servicebw_form,      # '' possible for a draft
                        is_active,                     # true for a draft; means nothing until published
                        status: ConnectionStatus,      # new
                        updated_at }                   # a draft's last save (FR-007)
FormConnection        { status: 'published',           # new; otherwise unchanged (spec 002)
                        id, name, servicebw_form, is_active, documents, trigger_url, pull_url,
                        branches, rule_set_version, next_rule_number, next_group_number,
                        created_at, updated_at }

# New: a draft as the API returns it. No URLs, no rule set, no is_active (FR-006, FR-007)
FormConnectionDraft   { status: 'draft',
                        id: str, name: str, servicebw_form: str,
                        documents: RequestedDocumentView[],  # may be empty; fields may be empty;
                                                             # a type or field the catalog dropped
                                                             # keeps its key as its label
                        branches: BranchInput[],             # main branch first; every id is null
                        next_rule_number: int, next_group_number: int,
                        step: EditorStep,                    # where "Continue" opens it (FR-008)
                        version: int,                        # sent back on save and publish (FR-022)
                        created_at: str, updated_at: str }

FormConnectionOrDraft = FormConnection | FormConnectionDraft   # discriminated by `status`

# New: request bodies
DraftRules     { branches: BranchInput[],          # main branch first; ids null
                 numbering_base: NumberingBase }   # the counters the editor started from (R4)
DraftCreate    { name: str, servicebw_form: str, documents: RequestedDocument[],
                 rules: DraftRules, step: EditorStep }
DraftUpdate    = DraftCreate with { version: int,          # the draft version the editor loaded
                                    replace: bool = false } # save over another team member's save
DraftPublish   = FormConnectionCreate with { version: int, replace: bool = false }
                 # the body of POST /api/form-connections, plus the draft's version.
                 # rules.base_version and rules.replace are ignored: a draft has no rule set yet
```

As in specs 001 and 002, the request schemas accept empty texts and lists and incomplete rules,
and keep each value's JSON type. The service layer checks the content, so that its message can
name the problem.

## Endpoints

| Method and path | Body | Success | Effects |
|---|---|---|---|
| `GET /api/form-connections` | none | `200 {"data": FormConnectionSummary[]}` | **Changed**: drafts are listed with the published connections, most recently updated first, each with its `status` (FR-007, FR-011) |
| `GET /api/form-connections/{id}` | none | `200 {"data": FormConnectionOrDraft}` | **Changed**: a draft answers `FormConnectionDraft` |
| `POST /api/form-connections/drafts` | `DraftCreate` | `201 {"data": FormConnectionDraft, "message": "Draft saved"}` | **New**. Stores a new draft, version 1, after the structural checks (FR-003, FR-004). Calls no EUDIPLO and creates no revision, rule set or branch row (FR-005) |
| `PUT /api/form-connections/{id}/draft` | `DraftUpdate` | `200 {"data": FormConnectionDraft, "message": "Draft saved"}` | **New**. Replaces the draft's content, name and serviceBW form, renumbers new identifiers if needed, and adds 1 to the version (FR-022). No EUDIPLO |
| `POST /api/form-connections/{id}/publish` | `DraftPublish` | `200 {"data": FormConnection, "message": "Form connection published"}` | **New**. The checks of `POST /api/form-connections`, then the first revision with its EUDIPLO configuration, rule set 1, the branch rows and the URLs. One pull URL per variant the draft has then (FR-009) |
| `DELETE /api/form-connections/{id}/draft` | none | `200 {"data": null, "message": "Draft deleted"}` | **New**. Removes the draft for good. Its URLs answer `404` from then on (FR-010; R7) |
| `POST /api/form-connections` | `FormConnectionCreate` | as in spec 002 | Unchanged: publishes a new connection in one go |
| `PUT /api/form-connections/{id}` | `FormConnectionUpdate` | as in spec 002 | Unchanged for published connections. **Refuses a draft** (`409 not_published`) |
| `POST /api/form-connections/{id}/deactivate`, `…/activate` | none | as in spec 001 | Unchanged. **Refuse a draft** (`409 not_published`; FR-007) |
| `DELETE /api/form-connections/{id}` | none | as in spec 001 | Unchanged. **Refuses a draft** (`409 not_published`): drafts are deleted through `…/draft` |

## Errors added by this feature

| Status | `error` | When |
|---|---|---|
| `400` | `Validation error` | **Draft save**: a structural rule of research R3 is broken (FR-003). **Publish**: any rule that `POST /api/form-connections` applies, with the same message (FR-009). Nothing is stored; the draft stays as it was |
| `404` | `Not found` | Unknown id, a deleted published connection, or a **deleted draft**. The editor, which knows it opened a draft, says "This draft has been deleted since you opened it." (FR-024) |
| `409` | `draft_changed` | `version` isn't the draft's current version and `replace` is false: "Another team member saved this draft after you opened it." Nothing is stored (FR-022) |
| `409` | `draft_published` | A draft endpoint on a published connection, which may have been published since the editor loaded it as a draft: "This draft has been published since you opened it." Nothing changes, also with `replace` (FR-023) |
| `409` | `not_published` | A published connection's endpoint on a draft: "This connection is a draft. Continue it to save or publish it." |
| `502`, `503` | as in spec 001 | Publishing: EUDIPLO couldn't create the configuration. Nothing is stored, and the connection stays a draft (FR-009). The message is spec 001's `CONFIG_FAILED` |

## Saving a draft, step by step (research R3, R4, R6)

1. Read the row: `404` if it's missing, `409 draft_published` if it's published, and
   `409 draft_changed` if `version` is outdated and `replace` is false. This runs before the
   content is checked.
2. Check the structure (`complete=False`). Refuse with `400` before anything is written.
3. Lock the row and repeat step 1. Check and renumber the identifiers against the row's counters.
   Write the content, the name and the serviceBW form, raise the counters, and add 1 to
   `draft_version`. Commit once.

Creating a draft is step 2, then one insert with version 1 and the counters from (1, 1).

## Publishing a draft, step by step (research R5)

1. As step 1 above.
2. The checks of `POST /api/form-connections`, unchanged (`complete=True`), and
   `check_first_save` with the draft's counters. Refuse with `400` before anything is written.
3. `create_revision()` with the draft guard:
   - Reserve: under the row lock, repeat step 1, then insert the next revision (not current) and
     commit.
   - Create the EUDIPLO configuration, with no transaction held. On failure, the revision is
     removed again → `502`/`503`.
   - Lock the row and repeat step 1. On a refusal, the configuration is deleted and the revision
     removed. Otherwise, in one commit: make the revision current, write rule set 1 and the branch
     rows (`first_rule_set()` with the row's counters), set the name and the serviceBW form, set
     `published_at`, and clear `draft` and `draft_version`.
4. Answer the published `FormConnection`.

If two team members publish one draft, they reserve different revisions. The first to commit
publishes, and the other gets `409 draft_published` and deletes only its own configuration.

## Deleting a draft (research R7)

Lock the row. Answer `404` if it's missing and `409 draft_published` if it's published.
Otherwise delete any revision that a publish in flight has reserved, then the row, and commit.
No EUDIPLO call is made: a publish in flight finds no row at its last step, answers `404` and
deletes its own configuration.
