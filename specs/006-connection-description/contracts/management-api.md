# Contract: Management API

Changes to spec 005's [management-api.md](../../005-connection-drafts/contracts/management-api.md).
Endpoints, status codes, auth and every other field stay the same. The field `servicebw_form` is
renamed `description` in every shape, and no alias is kept (FR-008; R3).

## Shapes

| Schema | Before | After |
|---|---|---|
| `FormConnectionSummary` | `servicebw_form: str` (`''` possible for a draft) | `description: str` (`''` when none) |
| `FormConnection` | `servicebw_form: str` | `description: str` (`''` when none) |
| `FormConnectionDraft` | `servicebw_form: str` | `description: str` (`''` when none) |
| `FormConnectionCreate` (`POST /api/form-connections`) | `servicebw_form: str`, required, not empty | `description: str = ''` |
| `FormConnectionUpdate` (`PUT /api/form-connections/{id}`) | `servicebw_form: str \| None = None` | `description: str \| None = None`: absent leaves it unchanged; `null` or `''` clears it |
| `DraftCreate` (`POST …/drafts`), `DraftUpdate` (`PUT …/{id}/draft`) | `servicebw_form: str` | `description: str = ''` |
| `DraftPublish` (`POST …/{id}/publish`) | inherits Create | inherits Create |

TypeScript (`frontend/src/types/form-connections.ts`) mirrors them field for field: `description:
string` in answers, and `description?: string` in the create and update bodies.

## Errors

| Before | After |
|---|---|
| 400 `Validation error`, `Enter the form ID.` (create, update, publish) | none: an empty description is accepted |
| 400 `Validation error`, `The form ID can have at most 500 characters.` | 400 `Validation error`, `The description can have at most 500 characters.` |

The description is checked in the place of the form ID: after the name, before the documents. A
body with both a long name and a long description answers with the name's message.

## Example

```http
POST /api/form-connections
{ "name": "Residents' parking permit", "documents": [ … ] }
→ 201 { "data": { "status": "published", "name": "Residents' parking permit", "description": "", … } }
```

## Unchanged (FR-010)

The connect API (`/api/connect/…`) and the EUDIPLO configuration never carried the form ID, and
they don't carry the description either. Changing only the description creates no revision and
no rule set, and changes no URL.
