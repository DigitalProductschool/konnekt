# Contract: agent sign-in (OAuth 2.1) and bearer access

**Consumers**: MCP clients (through the MCP server's protected resource metadata), the MCP
server, the consent page. **Requirements**: FR-001 to FR-006, FR-040. **Decisions**: research
R4 to R7. **Shapes**: [../data-model.md](../data-model.md) §1–§4.

## Metadata

| Path | Served by | Answer |
|---|---|---|
| `GET /.well-known/oauth-protected-resource`, `…/oauth-protected-resource/mcp` | MCP server | `{ resource: MCP_URL, authorization_servers: [OAUTH_ISSUER], scopes_supported: ['read', 'drafts', 'manage'], bearer_methods_supported: ['header'], resource_name: 'Konnekt' }` |
| `GET /.well-known/oauth-authorization-server` | backend (open; nginx proxies it) | RFC 8414 document (research R4): `issuer`, `authorization_endpoint` = `{PORTAL_URL}/authorize`, `token_endpoint`, `registration_endpoint`, `client_id_metadata_document_supported: true`, `code_challenge_methods_supported: ['S256']`, `grant_types_supported`, `response_types_supported: ['code']`, `token_endpoint_auth_methods_supported: ['none']`, `scopes_supported` |

Both answer `Cache-Control: max-age=3600` and plain JSON (not the `{data}` envelope: these are
protocol documents).

## Client registration

### Client ID Metadata Documents (preferred)

A `client_id` that is an `https://` URL names a document the backend fetches (`GET`, `Accept:
application/json`, 5 s, 64 KB, no redirects) when it first sees it and every 24 hours after;
the document must be JSON with `client_id` equal to the URL and a non-empty `redirect_uris`
list; `client_name` is optional (the URL's host is used without it). A document that can't be
fetched or fails these checks refuses the authorization with `invalid_client`.

### Dynamic registration (fallback)

`POST /api/oauth/register` (open, JSON, RFC 7591): `{ client_name, redirect_uris: string[],
token_endpoint_auth_method?: 'none', grant_types?, response_types? }` → `201 { client_id,
client_name, redirect_uris, token_endpoint_auth_method: 'none', grant_types:
['authorization_code', 'refresh_token'], response_types: ['code'] }`. No secret. A secret method
or an empty `redirect_uris` answers `400 { error: 'invalid_client_metadata', error_description }`.
Unused registrations are deleted after an hour.

### Redirect URIs

Must equal one of the client's, except that `http://localhost` and `http://127.0.0.1` match on
any port (loopback, RFC 8252). Any other `http://` URI is refused at registration and at
authorization.

## Authorization (the consent page)

```text
GET {PORTAL_URL}/authorize?response_type=code&client_id=…&redirect_uri=…
    &code_challenge=…&code_challenge_method=S256&state=…&scope=…&resource=…
```

The SPA route (signed in; a sign-in round trip keeps the query string). It calls:

| Endpoint | Auth | Body / answer |
|---|---|---|
| `GET /api/oauth/clients/{client_id}` | cookie | `{ data: { client_id, client_name, kind, current_access_level } }` (`OauthClientView`; `current_access_level`: the signed-in account's existing agent connection's level for this client, `null` without one, for the consent page's step-up line); fetches a CIMD when needed; `404 { error: 'invalid_client' }` |
| `POST /api/oauth/authorize` | cookie, `require_json` | `{ client_id, redirect_uri, code_challenge, code_challenge_method, state, scope, resource, decision: 'allow' \| 'deny', access_level?: 'read' \| 'drafts' \| 'manage' }` → `{ data: { redirect_to } }`: for `allow`, `{redirect_uri}?code=…&state=…`; for `deny`, `{redirect_uri}?error=access_denied&state=…`. A bad request (unknown client, redirect URI mismatch, missing or non-S256 challenge, `resource` ≠ `MCP_URL`, unknown scope) answers `400 { error: 'invalid_request', message }` and the page shows it without redirecting |

The requested `scope` picks the preselected level (`read drafts manage` → "Read, edit drafts
and manage live connections"; absent → "Read only"); the team member may choose any level. The
code lives 5 minutes.

## Token endpoint

`POST /api/oauth/token` (open; `application/x-www-form-urlencoded` or JSON; never the cookie).
Answers are RFC 6749 bodies, not the `{data}` envelope. `Cache-Control: no-store`.

| Grant | Parameters | Answer |
|---|---|---|
| `authorization_code` | `code`, `client_id`, `redirect_uri`, `code_verifier`, `resource` | `200 { access_token, token_type: 'Bearer', expires_in: 3600, refresh_token, scope }` |
| `refresh_token` | `refresh_token`, `client_id`, `resource?` | The same, with a new refresh token; the old one is retired |

| Error (`400` unless noted) | When |
|---|---|
| `invalid_grant` | Unknown, used or expired code; verifier mismatch; redirect URI mismatch; unknown, expired or retired refresh token (a retired one also revokes the connection) |
| `invalid_client` (`401`) | Unknown client, or a client that isn't the code's |
| `invalid_target` | `resource` isn't `MCP_URL` |
| `invalid_request` | Missing parameter, unsupported `grant_type` |

A successful `authorization_code` grant creates the account's agent connection for this client
(`agent_authorizations`, `kind = 'oauth'`) with the consented level, or updates an existing
one's level and resets its 30-day clock.

## Bearer access to the management API

- `Authorization: Bearer <token>` on any management endpoint resolves to the principal of
  data-model §4.1. `401 { error: 'Unauthorized', message: 'Sign in to continue' }` for a missing,
  unknown, expired, retired or revoked token.
- `GET /api/agent/me` (bearer only) → `{ data: { username, client_name, kind: 'oauth' \| 'token', access_level, levels: [{ level, name, allows }] } }`; touches `last_used_at`.
- A level too low: `403 { error: 'insufficient_access', message, needs_access_level }`.
- A bearer on an endpoint reserved to the browser (`PUT /api/form-connections/{id}`, the
  direct publish, draft delete, deactivate, activate and delete endpoints, the user page's and
  the approval page's endpoints, `/api/auth/*`): `403 { error: 'browser_only', message: 'This
  action is done in Konnekt.' }`.
- `require_json` applies to bearer `POST`, `PUT` and `DELETE` as well (the MCP server sends
  JSON); the token and registration endpoints are exempt.

## Tokens

| Token | Prefix | Lifetime | Stored |
|---|---|---|---|
| Access | `cp_at_` | `AGENT_ACCESS_TOKEN_MINUTES` (60) | SHA-256 |
| Refresh | `cp_rt_` | `AGENT_CONNECTION_IDLE_DAYS` (30); rotated at every use | SHA-256, `replaced_by_id` |
| Personal access | `cp_pat_` | The token's expiry, at most `AGENT_TOKEN_MAX_DAYS` (90) | SHA-256 |

Tokens are 43 URL-safe random characters after the prefix. None is logged; a token endpoint
failure is logged as its error code only.
