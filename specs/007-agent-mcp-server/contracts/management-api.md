# Contract: management API, with agent access, search, approvals and variant identifiers

**Consumers**: the React frontend (consent, user and approval pages, the editor) and the MCP
server. **Requirements**: FR-004 to FR-010, FR-013 to FR-029, FR-039 to FR-041. **Decisions**:
research R4 to R12, R17.

This extends the contracts of specs 001, 002, 005 and 006. Their common rules stay: everything
under `/api`, the `{data, message?}` and `{error, message, error_id?}` envelopes, `require_json`
on every `POST`, `PUT` and `DELETE`, and the common errors. What changes: the principal may be a
bearer token ([oauth.md](oauth.md)), and some endpoints are reserved to the browser session. The
Pydantic schemas in `backend/app/schemas.py` are the source of truth;
`api-types/src/` mirrors every shape the frontend or the MCP server reads in the same change
(Constitution I).

## Who may call what

| Endpoint | Browser session | Agent `read` | `drafts` | `manage` |
|---|---|---|---|---|
| `GET /api/form-connections`, `GET …/{id}`, `GET …/search`, `GET /api/document-types`, `GET /api/option-sets` | ✓ | ✓ | ✓ | ✓ |
| `POST /api/form-connections/drafts`, `PUT …/{id}/draft` | ✓ | `403 insufficient_access` | ✓ (`POST` counts towards the limit) | ✓ |
| `POST /api/form-connections` (publish a new connection in one go) | ✓ | `403 browser_only` | `403 browser_only` | `403 browser_only` |
| `PUT /api/form-connections/{id}` (a published connection's content) | ✓ | `403 browser_only` (FR-018) | same | same |
| `POST …/{id}/publish`, `DELETE …/{id}/draft`, `POST …/{id}/deactivate`, `…/activate`, `DELETE …/{id}` | ✓ | `403 browser_only` | same | same (agents go through approval requests) |
| `POST /api/approval-requests` | `403 browser_only` | `403 insufficient_access` | ✓ (`publish`, `delete_draft`) | ✓ (all five) |
| `GET /api/approval-requests/{id}` | ✓ (own) | ✓ (own authorization's) | ✓ | ✓ |
| `POST …/approve`, `…/decline` | ✓ (own) | `403 browser_only` | same | same |
| `GET /api/agent-access`, `PUT …/{id}`, `DELETE …/{id}`, `POST …/tokens` | ✓ | `403 browser_only` | same | same |
| `GET /api/agent/me` | `403` (bearer only) | ✓ | ✓ | ✓ |
| `/api/auth/*` | as today | `403 browser_only` | same | same |

`403 insufficient_access`: `{ error: 'insufficient_access', message: "Changing drafts needs the
access level 'Read and edit drafts'.", needs_access_level: 'drafts' }` (the message for `manage`:
"Deactivating, reactivating and deleting published connections needs the access level 'Read,
edit drafts and manage live connections'.").

## Schemas

```text
AccessLevel        = 'read' | 'drafts' | 'manage'
AccessLevelInfo    { level: AccessLevel, name: str, allows: str }     # the three, for the consent and user pages

# Search (R9)
FormConnectionPage { items: FormConnectionSummary[], next_cursor: str | None }

# Agent access (R6, R7)
AgentAccessItem    { id, kind: 'oauth' | 'token', client_name: str | None, name: str | None,
                     access_level, created_at, expires_at: str | None, last_used_at: str | None }
AgentAccessUpdate  { access_level: AccessLevel }
TokenCreate        { name: str, access_level: AccessLevel, expires_in_days: int }   # 1..AGENT_TOKEN_MAX_DAYS
TokenCreated       { item: AgentAccessItem, token: str }                            # the secret, once
AgentMe            { username, client_name: str | None, kind, access_level, levels: AccessLevelInfo[] }

# Approval requests (R12)
ApprovalAction     = 'publish' | 'delete_draft' | 'deactivate' | 'reactivate' | 'delete'
ApprovalStatus     = 'waiting' | 'done' | 'declined' | 'expired' | 'replaced' | 'cancelled'
ApprovalOutcome    = ApprovalStatus | 'failed'
ApprovalCreate     { form_connection_id: str, action: ApprovalAction }
ApprovalRequest    { id, action, form_connection_id, connection_name: str, requested_by: str,
                     status: ApprovalStatus, outcome: ApprovalOutcome, cancel_reason: str | None,
                     link: str, expires_at, created_at, decided_at: str | None,
                     failed_at: str | None, error_id: str | None, mine: bool }
                     # requested_by: the agent's name when it asked, kept after its access is gone
                     # mine: the signed-in account's
                     # cancel_reason: revoked, access_changed, access_ended, draft_changed,
                     #   draft_published, draft_deleted, connection_changed, connection_deleted
ApprovalPreview    { request: ApprovalRequest,
                     draft: FormConnectionDraft | None,          # publish, delete_draft (while the draft exists)
                     connection: FormConnection | None,          # the other actions (while it exists)
                     urls: ConnectionUrls | None }               # after a done publish or reactivate, and for the status actions
ConnectionUrls     { trigger_url: str, variants: { id, name, pull_url }[] }

# Variant identifiers (R10)
BranchInput.id     : str | None   # unchanged type; a draft's stored branches always have one (data-model §6.1)
FormConnectionDraft.branches[].id : str   # now always set
```

`FormConnectionSummary`, `FormConnection`, `FormConnectionDraft`, `DraftCreate`, `DraftUpdate`
and `DraftPublish` are unchanged in shape.

## Endpoints

### Search (R9)

| Method and path | Query | Success |
|---|---|---|
| `GET /api/form-connections/search` | `q?` (trimmed; empty matches all), `status?: draft \| live \| deactivated`, `cursor?`, `limit?` (1–25, default 25) | `200 { data: FormConnectionPage }`. Ordered by `updated_at` desc, `id`; deleted rows excluded; `next_cursor` null on the last page. An unknown `status` or a bad cursor answers `400 Validation error` |

### Agent access, the user page (R6, R7)

| Method and path | Body | Success | Effects |
|---|---|---|---|
| `GET /api/agent-access` | none | `200 { data: { items: AgentAccessItem[], levels: AccessLevelInfo[] } }` | The signed-in account's only, newest first |
| `PUT /api/agent-access/{id}` | `AgentAccessUpdate` | `200 { data: AgentAccessItem, message: 'Access level changed' }` | Applies from the agent's next call. Lowering cancels the waiting approval requests the new level doesn't allow (`cancelled`, `access_changed`). `404` for another account's row |
| `DELETE /api/agent-access/{id}` | none | `200 { data: null, message: 'Access revoked' }` | Cancels its waiting requests (`revoked`; their rows stay, for the approval page), then deletes the row and its tokens. The agent's next call answers `401` |
| `POST /api/agent-access/tokens` | `TokenCreate` | `201 { data: TokenCreated, message: 'Token created' }` | `expires_in_days` above the maximum or below 1 → `400 Validation error` ("A token can be valid for at most 90 days.") |

### Agent principal

| Method and path | Success |
|---|---|
| `GET /api/agent/me` | `200 { data: AgentMe }`; touches `last_used_at` (at most once a minute) |

### Drafts: the limit (R17; FR-020)

`POST /api/form-connections/drafts` by a bearer principal counts in the authorization's window;
the 21st in an hour answers `429 { error: 'rate_limited', message: 'This agent can create drafts
again at 15:40.' }`. Browser sessions aren't limited. `PUT …/draft` never counts.

### Approval requests (R12)

| Method and path | Body | Success | Effects |
|---|---|---|---|
| `POST /api/approval-requests` | `ApprovalCreate` | `201 { data: ApprovalRequest, message: 'Approval requested' }` | Level checked (data-model §5.3); preconditions checked without writing: `409 { error: 'not_allowed', message }` ("This connection is already deactivated.", "This connection is a draft: it has nothing live yet.") or, for `publish`, `400 Validation error` with publishing's message; `404` for an unknown or deleted connection. Under the row lock, a waiting request of the same connection and action becomes `replaced`; the new row is `waiting` |
| `GET /api/approval-requests/{id}` | none | `200 { data: ApprovalPreview }` | Browser: the request's account's only (`403 { error: 'not_yours', message: "This request was made for another team member." }` otherwise, with no preview). Bearer: the authorization's own only (`404` otherwise; a request whose authorization is gone is no bearer's). Staleness, expiry and an ended access computed (data-model §5.2): the status in the answer is what the row reads as now |
| `POST /api/approval-requests/{id}/approve` | `{}` | `200 { data: ApprovalPreview, message: 'Published' / 'Draft deleted' / 'Connection deactivated' / 'Connection reactivated' / 'Connection deleted' }` | Browser session of the request's account only (`403 not_yours`). Under the row lock: not `waiting`, expired or stale → `409 { error: 'approval_<status>', message }` with the page's reason, nothing done. Otherwise the action runs through the existing service (research R12); success → `done`. An `EudiploError` → `502`/`503` as spec 001 answers them, the row stays `waiting` with `failed_at` and the `error_id` |
| `POST /api/approval-requests/{id}/decline` | `{}` | `200 { data: ApprovalPreview, message: 'Declined' }` | Same ownership and state rules; → `declined` |

### Variant identifiers (R10; FR-029)

- `POST /api/form-connections/drafts`, `PUT …/{id}/draft`: a branch's `id` may be a UUID
  (kept if not another connection's branch id and unique in the body) or `null` (assigned). A
  non-UUID answers `400 Validation error` ("Unknown variant."). The stored content and
  `FormConnectionDraft` always carry ids.
- `POST …/{id}/publish`: the branch rows take the draft's ids.
- `POST /api/form-connections`, `PUT …/{id}` with `rules`: a new branch's `id` may be a client
  UUID likewise; an existing branch's id must be one of the connection's, as before.

### OAuth endpoints

See [oauth.md](oauth.md): `GET /.well-known/oauth-authorization-server`, `POST
/api/oauth/register`, `GET /api/oauth/clients/{client_id}`, `POST /api/oauth/authorize`, `POST
/api/oauth/token`.

## Errors added by this feature

| Status | `error` | When |
|---|---|---|
| `401` | `Unauthorized` | No valid cookie session and no valid bearer token |
| `403` | `insufficient_access` | The agent's level doesn't allow the endpoint; `needs_access_level` says which does |
| `403` | `browser_only` | A bearer on an endpoint reserved to the management interface |
| `403` | `not_yours` | An approval request of another account (browser) |
| `404` | `Not found` | Also: another account's agent access row; another authorization's approval request (bearer); an unknown OAuth client |
| `409` | `not_allowed` | An approval request whose action doesn't apply (FR-022) |
| `409` | `approval_expired`, `approval_declined`, `approval_done`, `approval_replaced`, `approval_cancelled` | Approving or declining a request that isn't waiting, with the reason in the message |
| `429` | `rate_limited` | The draft limit (FR-020) |
| `400` | `invalid_request`, `invalid_client`, `invalid_grant`, `invalid_target`, `invalid_client_metadata` | The OAuth endpoints, as RFC 6749 and RFC 7591 bodies |

## Unchanged (FR-041)

`/api/connect/*` and the worker's handling of requests don't change. The overview's
`GET /api/form-connections` and the editor's draft and publish paths keep their answers; the
only visible change is that a draft's variants carry ids.
