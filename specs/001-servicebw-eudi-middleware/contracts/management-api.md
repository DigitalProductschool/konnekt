# Contract: management API (DO.IT UI ↔ backend)

**Consumer**: the middleware's own React frontend. **Requirements**: FR-001 to FR-007, FR-014.
**Decisions**: research R9, R12, R14, R16, R21.

## Common rules

- **Paths**: every path is under `/api`. The bodies are JSON with snake_case field names.
- **Response format**: every success body is `{"data": …, "message"?: …}`, where `data` is `null`
  when nothing is returned. Errors are `{"error": …, "message": …}`, raised as `HTTPException`
  (Constitution I).
- **Schemas**: the Pydantic schemas in `backend/app/schemas.py` are the source of truth. The
  TypeScript interfaces in `frontend/src/types/` mirror them in the same change.
- **Signing in** (FR-007):
  - Every endpoint except `POST /api/auth/login` and `GET /api/health` needs the `session` cookie
    that sign-in sets.
  - The cookie is `HttpOnly`, `SameSite=Strict` and `Path=/api`, and `Secure` unless
    `APP_ENV=development`.
  - The frontend sends it with `credentials: 'include'`.
  - Without a valid session, the answer is `401`
    `{"error": "Unauthorized", "message": "Sign in to continue"}`.
- **CSRF**: every `POST`, `PUT` and `DELETE` must be sent with `Content-Type: application/json`;
  the frontend sends `{}` when there is no body. Anything else is answered with `415`
  (research R14).
- **Common errors**:

  | Status | `error` | When |
  |---|---|---|
  | `400` | `Validation error` | A rule in [data-model.md](../data-model.md#form_connections-form-connection-fr-001-fr-004-to-fr-006-fr-014) is broken. The message names the problem |
  | `401` | `Unauthorized` | Not signed in, or the session expired |
  | `404` | `Not found` | Unknown or deleted form connection |
  | `415` | `Unsupported media type` | A state-changing request without `Content-Type: application/json` |
  | `502` | `Upstream error` | EUDIPLO could not create the request configuration for a new revision. Nothing was saved |
  | `503` | `Not configured` | The middleware's EUDIPLO settings are incomplete: `EUDIPLO_URL`, the client credentials or `EUDIPLO_TRUST_LIST_ID` is empty. Nothing was saved, and the message names the missing setting (research R3) |

## Schemas

The same shape is used in Python (Pydantic) and TypeScript.

```text
UserView               { username: str }
LoginRequest           { username: str, password: str }

DocumentField          { key: str, label: str }
DocumentType           { key: str, label: str, fields: DocumentField[] }

RequestedDocument      { document_type: str, fields: str[] }                     # input: field keys
RequestedDocumentView  { document_type: str, label: str, fields: DocumentField[] } # output

FormConnectionSummary  { id: str, name: str, servicebw_form: str, is_active: bool,
                         mode: "pull" | "webhook", updated_at: str }
FormConnection         { id: str, name: str, servicebw_form: str, is_active: bool,
                         mode: "pull" | "webhook", webhook_url: str | null,
                         documents: RequestedDocumentView[],
                         trigger_url: str, pull_url: str,
                         created_at: str, updated_at: str }
FormConnectionCreate   { name: str, servicebw_form: str, documents: RequestedDocument[],
                         webhook_url?: str | null }
FormConnectionUpdate   { name?: str, servicebw_form?: str, documents?: RequestedDocument[],
                         webhook_url?: str | null }   # absent = unchanged, null = remove
```

`pull_url` contains the placeholder `{reference}` literally, for example
`https://middleware.example/api/connect/7b1f…/requests/{reference}`.

---

## Authentication

| Method and path | Body | Success | Notes |
|---|---|---|---|
| `POST /api/auth/login` | `LoginRequest` | `200 {"data": UserView}` and `Set-Cookie: session=…` | A wrong username and a wrong password answer the same `401` `{"error": "Unauthorized", "message": "Invalid username or password"}` |
| `POST /api/auth/logout` | `{}` | `200 {"data": null, "message": "Signed out"}`, and the cookie is cleared | Deletes the sign-in session |
| `GET /api/auth/me` | none | `200 {"data": UserView}` | The frontend uses it to decide whether to show the sign-in screen |

Accounts are managed only with the command-line tool: `uv run python -m app.cli create-user
<username>`, `set-password <username>` and `delete-user <username>`. No API endpoint exists for
this (research R14).

## Document types (FR-002)

| Method and path | Success |
|---|---|
| `GET /api/document-types` | `200 {"data": DocumentType[]}`: the catalog in [data-model.md](../data-model.md#document-type-catalog), in catalog order |

## Form connections

| Method and path | Body | Success | Effects |
|---|---|---|---|
| `GET /api/form-connections` | none | `200 {"data": FormConnectionSummary[]}` | Form connections that aren't deleted, most recently updated first (US4, scenario 1) |
| `POST /api/form-connections` | `FormConnectionCreate` | `201 {"data": FormConnection, "message": "Form connection created"}` | Creates revision 1 and its EUDIPLO request configuration. If EUDIPLO fails, nothing is saved (`502`) |
| `GET /api/form-connections/{id}` | none | `200 {"data": FormConnection}` | Always the same `trigger_url` and `pull_url` (US1, scenario 4) |
| `PUT /api/form-connections/{id}` | `FormConnectionUpdate` | `200 {"data": FormConnection, "message": "Form connection updated"}` | Changing `documents` creates a new revision and EUDIPLO configuration, and only requests triggered afterwards use them (FR-005). `webhook_url` switches the mode for new requests (US1, scenario 5). The URLs never change. Also allowed while deactivated |
| `POST /api/form-connections/{id}/deactivate` | `{}` | `200 {"data": FormConnection, "message": "Form connection deactivated"}` | Sets `is_active=false`, and the URLs answer `409 unavailable` from the next call on. Within about 2 seconds the worker turns the [open requests](../data-model.md#open-requests) into `unavailable` and deletes their EUDIPLO sessions. In webhook mode it also sends an `unavailable` update (FR-006). EUDIPLO is not called during this request |
| `POST /api/form-connections/{id}/activate` | `{}` | `200 {"data": FormConnection, "message": "Form connection activated"}` | Sets `is_active=true`. The URLs work again unchanged (US4, scenario 4) |
| `DELETE /api/form-connections/{id}` | `{}` | `200 {"data": null, "message": "Form connection deleted"}` | Sets `deleted_at`, so the URLs answer `409 unavailable` permanently. Open requests are cancelled as for deactivation. The worker deletes the EUDIPLO configurations once no open request uses them. EUDIPLO is not called during this request |

Every endpoint on a deleted form connection answers `404`.

## Health

`GET /api/health` → `200 {"data": {"status": "ok", "timestamp": "…"}}`. It needs no sign-in, and it
returns no settings (the template's `api_key` is removed).
