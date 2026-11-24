# Data Model: Agent Access through an MCP Server

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Decisions**: [research.md](research.md)

This extends the data models of [spec 001](../001-servicebw-eudi-middleware/data-model.md),
[spec 002](../002-connection-rules/data-model.md) and
[spec 005](../005-connection-drafts/data-model.md), which still apply. New tables follow
Constitution V: `Mapped` / `mapped_column`, UUID4 keys as `String(36)`, `created_at` and
`updated_at` with `server_default=func.now()`, `snake_case`, and an index on every column used
to look rows up. **No table holds an applicant, a finding, a test result, a token's secret or a
citizen's data.**

## Spec entities and where they live

| Spec entity | Stored as |
|---|---|
| Agent | Not stored as such: an OAuth client (`oauth_clients`) is how an agent identifies itself |
| Agent connection | `agent_authorizations` with `kind = 'oauth'`, and its tokens in `agent_tokens` |
| Personal access token | `agent_authorizations` with `kind = 'token'`, and its one secret in `agent_tokens` |
| Access level | `agent_authorizations.access_level` |
| Approval request | `approval_requests` |
| Link | Not stored: built from identifiers (§6) |
| Variant identifier | `BranchInput.id` in a draft's content, now always set (§5); `form_connection_branches.id` once published, the same value |
| Fictitious applicant | Never stored |
| Guidance | Files in `mcp/plugin/`, embedded in the MCP server's build |

## Relationships

```text
user_accounts 1 ──< agent_authorizations 1 ──< agent_tokens
oauth_clients 1 ──< agent_authorizations (oauth kind)
oauth_clients 1 ──< oauth_codes >── 1 user_accounts
agent_authorizations 0..1 ──< approval_requests >·· 1 form_connections (by id, no foreign key)
user_accounts 1 ──< approval_requests
```

Every foreign key to `user_accounts` is `ON DELETE CASCADE`: deleting an account ends its agent
connections, tokens and approval requests at once (FR-005). `agent_tokens.authorization_id`
cascades too: revoking an authorization deletes its tokens with it. An approval request outlives
its authorization: `approval_requests.authorization_id` is nullable with `ON DELETE SET NULL`, so
the row stays readable for the approval page after the agent's access was revoked or has ended
(§5.2, R7), until the worker sweeps it. `approval_requests.form_connection_id` has no foreign
key: deleting a draft removes its row (spec 005) while its requests stay to read as
`draft_deleted` (§5.2), and a published connection's deletion is a soft delete.

---

## 1. `oauth_clients`: how an agent identifies itself (R4)

| Column | Type | Rules |
|---|---|---|
| `id` | `String(36)` PK | UUID4 |
| `client_id` | `String(500)`, unique, indexed | For a Client ID Metadata Document, its `https://` URL; for a dynamically registered client, `cp_client_` and 32 random characters |
| `kind` | `String(16)` | `cimd` or `dcr` |
| `client_name` | `String(200)` | As the client gives it, trimmed, cut to 200 characters. Shown on the consent page and the user page |
| `redirect_uris` | `JSONB` | List of strings, at least one. Checked at authorization: exact match, except the port of `http://localhost` and `http://127.0.0.1` |
| `metadata_fetched_at` | `DateTime(timezone=True)`, nullable | CIMD only: when the document was last fetched; fetched again after 24 hours, or when a redirect URI doesn't match |
| `created_at`, `updated_at` | | |

A `dcr` client without any `agent_authorizations` row after one hour is deleted by the worker.

## 2. `oauth_codes`: authorization codes (R4)

| Column | Type | Rules |
|---|---|---|
| `id` | `String(36)` PK | |
| `code_hash` | `String(64)`, unique, indexed | SHA-256 of the code sent to the client; the code is 43 random characters |
| `client_id` | FK → `oauth_clients.id`, indexed | |
| `user_account_id` | FK → `user_accounts.id` (cascade), indexed | The team member who consented |
| `redirect_uri` | `String(2000)` | Must be sent again at the token endpoint |
| `code_challenge` | `String(128)` | PKCE, `S256` only |
| `access_level` | `String(16)` | The level chosen on the consent page (§3) |
| `resource` | `String(2000)` | The resource indicator, must equal `MCP_URL` |
| `expires_at` | `DateTime(timezone=True)`, indexed | 5 minutes after creation |
| `used_at` | `DateTime(timezone=True)`, nullable | A code is used once; a second use revokes the tokens it issued |
| `created_at`, `updated_at` | | |

Expired rows are deleted by the worker.

## 3. `agent_authorizations`: agent connections and personal access tokens (R4, R6, R17)

| Column | Type | Rules |
|---|---|---|
| `id` | `String(36)` PK | |
| `user_account_id` | FK → `user_accounts.id` (cascade), indexed | Only this account sees and changes the row |
| `kind` | `String(16)` | `oauth` (an agent connection) or `token` (a personal access token) |
| `client_id` | FK → `oauth_clients.id`, nullable, indexed | `oauth` only. One row per account and client: unique together with `user_account_id` where `kind = 'oauth'` (partial unique index) |
| `name` | `String(100)` | `token` only: the name given on the user page, 1–100 characters after trimming |
| `access_level` | `String(16)` | `read`, `drafts` or `manage` (§3.1). Changed on the user page; read at every call |
| `expires_at` | `DateTime(timezone=True)`, nullable, indexed | `token` only: at most `AGENT_TOKEN_MAX_DAYS` (90) after creation. An `oauth` row has none: it lasts while its refresh token is renewed (§4) |
| `last_used_at` | `DateTime(timezone=True)`, nullable | Touched by a bearer call at most once a minute |
| `drafts_window_started_at` | `DateTime(timezone=True)`, nullable | The draft limit's fixed window (R17) |
| `drafts_in_window` | `Integer`, default 0 | Drafts created in the window |
| `created_at`, `updated_at` | | "When connected" / "when created" on the user page |

Revoking cancels the row's waiting approval requests (`revoked`, §5), then deletes the row: its
tokens cascade, its requests keep their rows. "Unused for 30 days" is the refresh token's expiry
(§4): an `oauth` row whose last refresh token has expired is deleted by the worker, as is a
`token` row past its `expires_at`; a waiting request of either then reads as cancelled (§5.2).

### 3.1 Access levels

| `access_level` | UI name | OAuth `scope` | Allows |
|---|---|---|---|
| `read` | Read only | `read` | Every read, `check_rules`, `test_applicants`, `get_guide` |
| `drafts` | Read and edit drafts | `read drafts` | Also every change to a draft, and approval requests to publish or delete a draft |
| `manage` | Read, edit drafts and manage live connections | `read drafts manage` | Also approval requests to deactivate, reactivate or delete a published connection |

No level allows changing a published connection's content, nor any direct call of the endpoints
that approval requests run (FR-018, FR-021).

## 4. `agent_tokens`: the secrets' hashes (R4, R6)

| Column | Type | Rules |
|---|---|---|
| `id` | `String(36)` PK | |
| `authorization_id` | FK → `agent_authorizations.id` (cascade), indexed | |
| `kind` | `String(16)` | `access`, `refresh` or `personal` |
| `token_hash` | `String(64)`, unique, indexed | SHA-256 of the token. The token itself (`cp_at_`, `cp_rt_` or `cp_pat_` and 43 random characters) is never stored or logged |
| `expires_at` | `DateTime(timezone=True)`, indexed | `access`: `AGENT_ACCESS_TOKEN_MINUTES` (60) after issue; `refresh`: `AGENT_CONNECTION_IDLE_DAYS` (30) after issue; `personal`: the authorization's `expires_at` |
| `replaced_by_id` | `String(36)`, nullable | `refresh` only: the token issued when this one was used (rotation). Using a replaced token again revokes the authorization |
| `created_at`, `updated_at` | | |

The worker deletes expired `access` rows, expired `refresh` rows, and `refresh` rows replaced
more than a day ago (`RETIRED_REFRESH_TOKEN_KEPT`): for that day, using a replaced token again
still finds the row and revokes the authorization.

### 4.1 The bearer principal (`services/auth.py`)

```text
Principal { user: UserAccount, authorization: AgentAuthorization | None }
  authorization is None  → a browser session (the cookie): every level
  authorization.kind = 'oauth' | 'token' → access_level from the row, read at this call
```

A bearer resolves through `agent_tokens.token_hash` with `expires_at` in the future and, for
`personal`, the authorization's `expires_at` too; an unknown, expired or replaced token answers
`401`. `require_level(level)` answers `403 insufficient_access` naming the level needed;
`require_browser_session()` answers `403` to any bearer ("This action is done in
Konnekt.").

## 5. `approval_requests` (R12)

| Column | Type | Rules |
|---|---|---|
| `id` | `String(36)` PK | Part of the approval page's link |
| `form_connection_id` | `String(36)`, indexed, no foreign key | The connection; once a deleted draft's row is gone, the request reads as `draft_deleted` (§5.2) |
| `action` | `String(16)` | `publish`, `delete_draft`, `deactivate`, `reactivate` or `delete` |
| `authorization_id` | FK → `agent_authorizations.id` (set null), nullable, indexed | The agent that asked; null once its access was revoked or has ended (§5.2) |
| `requested_by` | `String(200)` | The agent's name when it asked: the client's `client_name` for an `oauth` authorization, the token's `name` for a `token` one. Shown on the approval page ("Requested by …") and kept after the authorization is gone |
| `user_account_id` | FK → `user_accounts.id` (cascade), indexed | The team member who may approve |
| `draft_version` | `Integer`, nullable | `publish` and `delete_draft`: the draft's version when the request was made |
| `was_active` | `Boolean`, nullable | `deactivate`, `reactivate`, `delete`: the connection's `is_active` when the request was made |
| `status` | `String(16)`, indexed | `waiting`, `done`, `declined`, `expired`, `replaced`, `cancelled` |
| `cancel_reason` | `String(32)`, nullable | `revoked`, `access_changed` (stored); `access_ended`, `draft_changed`, `draft_published`, `draft_deleted`, `connection_changed`, `connection_deleted` (computed, §5.2) |
| `expires_at` | `DateTime(timezone=True)`, indexed | `APPROVAL_REQUEST_MINUTES` (10) after creation |
| `failed_at` | `DateTime(timezone=True)`, nullable | The last approve attempt that failed (EUDIPLO), while `waiting` |
| `error_id` | `String(36)`, nullable | Its `error_id`, shown on the page |
| `decided_at` | `DateTime(timezone=True)`, nullable | When it left `waiting` |
| `created_at`, `updated_at` | | |

### 5.1 State transitions

```text
                     approve ok ─────▶ done
                     approve fails ──▶ waiting (failed_at, error_id; "Try again")
  POST ───▶ waiting  decline ────────▶ declined
                     a newer request for the same connection and action ──▶ replaced
                     revoke / lower the agent's access ─────────────────────▶ cancelled (reason)
                     expires_at passes ──────────────────────────────────────▶ expired   (computed)
                     the connection moved on (§5.2) ─────────────────────────▶ cancelled (computed)
                     the agent's access ended otherwise (§5.2) ──────────────▶ cancelled (computed)
```

`done`, `declined`, `replaced`, `cancelled` and `expired` are final. The outcome an agent reads
is the status, or `failed` when the status is `waiting` and `failed_at` is set (FR-027).

### 5.2 Staleness, computed at every read and under the lock at approval (FR-024)

| Action | The request applies while | Otherwise reads as |
|---|---|---|
| `publish`, `delete_draft` | the row is a draft and `draft_version` equals the stored one | `cancelled`: `draft_changed`, `draft_published` (published since) or `draft_deleted` (no row) |
| `deactivate`, `reactivate`, `delete` | the row is published, not deleted, and `is_active` equals `was_active` | `cancelled`: `connection_changed` or `connection_deleted` |
| any | the authorization that asked still exists (`authorization_id` not null) | `cancelled`: `access_ended` |

The rules apply to a `waiting` row; a stored final status stays what it is. `access_ended` covers
every way an authorization goes other than the user page's revoke: the worker's sweep of an
expired token or an idle connection (§3) and a retired refresh token used again (§4). Revoking
stores `revoked` and lowering the access stores `access_changed` before the change (R7), so no
deletion path needs to know about approvals. A change to a published connection's content (a
new revision or rule set) doesn't affect a request on its status (spec, edge cases).

### 5.3 Preconditions at creation (FR-022)

| Action | Needs level | Precondition, checked without writing |
|---|---|---|
| `publish` | `drafts` | The row is a draft; `drafts.check_publishable()` passes: the checks of `POST /api/form-connections` on the stored content, with their messages (spec 005, FR-009; the description optional, spec 006) |
| `delete_draft` | `drafts` | The row is a draft |
| `deactivate` | `manage` | Published, not deleted, `is_active` |
| `reactivate` | `manage` | Published, not deleted, not `is_active` |
| `delete` | `manage` | Published, not deleted (live or deactivated) |

A draft refused for `deactivate`, `reactivate` or `delete` gets "This connection is a draft: it
has nothing live yet."; a deactivated connection refused for `deactivate` "This connection is
already deactivated.", a live one refused for `reactivate` "This connection is already live."
The same connection and action replace a waiting request (`replaced`).

---

## 6. Changes to existing shapes

### 6.1 A draft's branches get identifiers (R10; FR-029)

`DraftContent.branches[].id`: **now always a UUID string** (was `null`). `BranchInput.id` keeps
its type `str | None` for requests: the server assigns a UUID where a request sends `null` and
accepts a UUID that isn't another connection's branch id; a draft's stored content always has
one. `first_rule_set()` creates the branch rows with these ids when the draft is published, so
`form_connection_branches.id` equals the draft's id for every variant the draft had.

**Migrations**. `60d71d73af6d_agent_mcp_server.py`, `down_revision = 'f17f604c6cbb'`: creates
the five tables of §1–§5 and backfills `form_connections.draft` for every row whose `draft` is
not null, setting each branch's `id` to a new UUID where it is null (a Python loop over the rows,
since autogenerate emits no data migration). Downgrade drops the tables; the ids in drafts stay.
`ba334922c5ee_approval_requests_outlive_revocation.py`, `down_revision = '60d71d73af6d'`: gives
`approval_requests.authorization_id` its `ON DELETE SET NULL` rule and its nullability, adds
`requested_by` (§5) and drops the foreign key of `form_connection_id`. Downgrade deletes the rows
whose `authorization_id` is null or whose form connection is gone, restores the cascade and the
foreign key, and drops the column.

### 6.2 `form_connections`: no new column

The draft limit lives on the authorization (§3), approvals in their table (§5). Search reads the
existing columns (`name`, `description`, `published_at`, `is_active`, `deleted_at`, `updated_at`).

### 6.3 The rules step's keys (frontend)

`RulesBranch.key` becomes the branch's id; `newBranchKey()` goes. `addVariant` in
`rules/src/edits.ts` takes the id from its caller, which makes it with `crypto.randomUUID()` (the
SPA and the MCP server), so `rules/` stays pure. The main variant of a new connection gets an id when
the flow starts. A local draft record (format 2) whose branches have null ids gets ids when the
flow loads it.

---

## 7. Links (R11; FR-028 to FR-031)

```text
connection:  {PORTAL_URL}/form-connections/{connectionId}
variant:     {PORTAL_URL}/form-connections/{connectionId}/edit?step=rules&variant={variantId}
item:        {PORTAL_URL}/form-connections/{connectionId}/edit?step=rules&variant={variantId}&item={rule-n | group-n}
approval:    {PORTAL_URL}/approvals/{requestId}
```

- `connectionId` and `variantId` are UUIDs; `item` is `rule-{n}` or `group-{n}`.
- A link holds no name and no content; renaming and publishing don't change it.
- The MCP server builds links from `PORTAL_URL`; the browser from `window.location.origin`.
- A link whose origin isn't `PORTAL_URL`'s is refused by the tools ("This link doesn't belong
  to Konnekt.").

## 8. Tool identifiers and names (R8, R11; FR-019)

| Parameter | Accepts |
|---|---|
| `connection` | A connection's UUID, or any link of §7 that names one |
| `variant` | A variant's UUID, a link that names one, or its name ("Standard" for the main variant unless renamed). A name that matches more than one variant is refused with the candidates and their links |
| `item` / `rule` / `group` | `rule-n` or `group-n`, a link that names one, or its name in the variant; a duplicate name is refused likewise |
| `document_type` | A catalog key (`pid`, `mdl`) |
| `field` | A catalog field key; parts as `field.part` (`place_of_birth.country`), a licence class's date as `driving_privileges.issue_date#B` |
| `condition.operator` | A check of the field's kind, as `get_catalog`'s `conditions` lists them (`OPERATORS`); any other is refused with the field's checks. Without data, a check that no kind offers is refused with the checks per kind |

Matching names ignores letter case and surrounding spaces, as the editor compares them.

## 9. Applicant fields (R15; FR-034)

The keys are spec 004's persona field keys, which are the checks' variable keys: `pid.birthdate`,
`pid.place_of_birth.country`, `pid.nationalities`, `mdl.driving_privileges.classes`,
`mdl.driving_privileges.issue_date#B`… `get_variant` lists, per variant, the fields its rules
check: `key`, `label`, `kind` (`number`, `text`, `enum`, `date`), `option_set` (enum), `multiple`
(takes a list) and, for a licence class's date, `licence_class`. An applicant's values are checked
against these before anything is evaluated.

## 10. Settings added (`Settings` in `app/config.py`; R3, R4, R12, R17)

| Variable | Default | Meaning |
|---|---|---|
| `PORTAL_URL` | `http://localhost:5173` in development; `CONNECTION_BASE_URL` otherwise | The management interface's public origin: links, the authorization endpoint |
| `MCP_URL` | `http://localhost:3100/mcp` in development; `{CONNECTION_BASE_URL}/mcp` otherwise | The MCP endpoint's public URL, the resource indicator |
| `OAUTH_ISSUER` | `CONNECTION_BASE_URL` | The authorization server's issuer |
| `AGENT_ACCESS_TOKEN_MINUTES` | `60` | Access token lifetime |
| `AGENT_CONNECTION_IDLE_DAYS` | `30` | Refresh token lifetime: an agent connection unused this long ends |
| `AGENT_TOKEN_MAX_DAYS` | `90` | Longest expiry of a personal access token |
| `APPROVAL_REQUEST_MINUTES` | `10` | How long an approval link is valid |
| `AGENT_DRAFTS_PER_HOUR` | `20` | Drafts one agent connection or token may create per hour |

MCP server (environment, `mcp/src/config.ts`): `PORT` (`3100`), `BACKEND_URL`,
`PORTAL_URL`, `MCP_URL` and `OAUTH_ISSUER` (`http://localhost:3000` in development), with the
development defaults above and no defaults when `NODE_ENV=production`.
