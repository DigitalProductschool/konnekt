# Research: Agent Access through an MCP Server

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Date**: 2026-11-05

The spec leaves the technical choices to the plan: where the MCP server lives, how the
protocol's authorization is set up, how the tools reuse the editor's logic, and what the approval
and link mechanics are. These decisions were taken against the code as of 2026-11-05 and the
protocol documents named in each decision. Specs 005 and 006 are treated as implemented.

## What the code holds today

- **Sign-in**: `services/auth.py` hashes passwords with Argon2id and keeps browser sessions in
  `login_sessions` (SHA-256 of a random token, `session` cookie). `get_current_user` is the only
  principal; every management router depends on it, and `require_json` protects the cookie
  against CSRF. There is no bearer authentication and no OAuth.
- **Drafts**: a `form_connections` row with `published_at` null, its content in the JSONB
  `draft` (`DraftContent`: documents, branches, step) and a `draft_version`. `PUT …/{id}/draft`
  replaces the whole content, checks the version and renumbers new identifiers from the row's
  counters. A draft's branches have `id: null`; `rules.clean_rules(main_branch_id=None)` refuses
  any id ("Unknown variant."), and `first_rule_set()` creates the branch rows with new UUIDs when
  the draft is published.
- **The list** `GET /api/form-connections` returns every connection, most recently updated
  first, with no search, filter or paging.
- **The rules logic** in `frontend/src/utils/rules/` is pure TypeScript with no browser API:
  `branches.ts` (propagation, marks, `newBranch`, `changeItem`, `copyRule`, `renameClash`…),
  `tree.ts` (items, groups, numbering), `validation.ts` (the server's messages), `conditions.ts`,
  `statements.ts`, `checks/` (the rule checks, their worker entry `checks/worker.ts` being the
  only browser-bound file) and `evaluation.ts` (the evaluator, pinned to Python by the generated
  vectors). Vitest already runs all of it in Node. The composition of these functions into the
  editor's actions (add a rule to Standard, then propagate; delete, then dissolve…) lives in the
  rules step's reducer, `pages/FormConnectionEditor/RulesStep/utils.ts`.
- **The editor opens a connection at a step** through router state only
  (`EditLocationState.step`); nothing opens a variant or an item from the URL. Variants of the
  rules step are keyed by `RulesBranch.key`, which is `main` or `newBranchKey()`, not an id.
- **The frontend package** is the only Node package: `tsc -b && vite build`, `tsconfig.app.json`
  (DOM lib) over `src/`, ESLint's browser-globals block over `src/**`, Vitest in the `test` block
  of `vite.config.ts`. The API types (`src/types/`, 6 files, imported by 107 files) and the
  rules logic (`src/utils/rules/`, 88 files, imported by 61 files outside it) live inside it.
  The two browser Worker entries (`checks/worker.ts`, `personas/worker.ts`) are the only
  browser-bound files among the rules modules. `backend/scripts/export_check_fixtures.py`
  writes two generated files into `src/utils/rules/checks/`. Both Dockerfiles build with the
  repository root as context.
- **The constitution** scopes Node tooling to `frontend/` and prescribes the SPA's layout; it says
  nothing about a second runtime.

## R1. Where the code lives: an npm workspace with four packages

**Decision**: the repository becomes an npm workspace of four Node packages beside the Python
backend, with the shared code in packages of its own:

```text
package.json          # the workspace root: workspaces, scripts over them, the pre-commit prepare
package-lock.json     # one lockfile for every Node package
eslint.config.mjs     # one flat config, one block per package
.prettierrc           # shared; frontend/ keeps a .prettierrc of its own for the Tailwind plugin
tsconfig.base.json    # the compiler options every package extends
api-types/            # @connection-portal/api-types: the TypeScript mirrors of backend/app/schemas.py
rules/                # @connection-portal/rules: the pure rules logic (propagation, tree, validation,
                      #   conditions, statements, dates, messages, checks/, personas/, edits.ts) and its tests
frontend/             # the SPA, depends on api-types and rules; src/workers/ holds the two browser Worker entries
mcp/                  # the MCP server, depends on api-types and rules
backend/              # unchanged
```

- **Source-linked packages, no build step**: `api-types` and `rules` publish their TypeScript
  source through `exports` (`"./*": "./src/*.ts"`), so a consumer writes
  `import { propagateMain } from '@connection-portal/rules/branches'` or
  `import type { BranchInput } from '@connection-portal/api-types/form-connections'`, and its
  own bundler (Vite in the SPA and the MCP server) compiles them. Nothing is emitted, no
  `dist/`, no `.d.ts`. The two packages have no runtime dependency.
- **One install, one lockfile, hoisted tooling**: `npm install` at the root links the packages
  into `node_modules/@connection-portal/` and dedupes `typescript`, `vite`, `vitest`, `eslint`
  and `prettier`, which every package lists at the same version in its own `devDependencies`,
  so that `npm ci -w <package>` in an image installs what that package needs without the root.
  The root `package.json` holds the `workspaces`, the scripts (`lint`, `test`, `build`,
  `format`, each `npm run <script> --workspaces --if-present`) and the `prepare` script that
  installs the pre-commit hooks, which moves there from `frontend/`.
- **Gates per package, from the root or inside the package**: `rules/` has `lint`, `test`
  (`vitest run`, `node` environment, in `rules/vitest.config.ts`, which is the right file
  there because `rules/` has no Vite build to shadow) and `typecheck` (`tsc --noEmit`);
  `api-types/` has `lint` and `typecheck`; `frontend/` and `mcp/` keep `lint`, `test` (in the
  `test` block of their `vite.config.ts`) and `build` (`tsc --noEmit && vite build`). `cd
  frontend && npm test` keeps working, since Node resolves the hoisted `node_modules` upwards.
- **The move** is the feature's first code task, mechanical and without
  any change of behaviour: `git mv frontend/src/types api-types/src`, `git mv
  frontend/src/utils/rules rules/src`, the two Worker entries to `frontend/src/workers/checks.ts`
  and `frontend/src/workers/personas.ts` (they are browser code: `self`, `MessageEvent`), the
  import rewrite in the 61 + 107 importers to the package paths, the two `new Worker(new
  URL(...))` paths in the hooks, `CHECKS_DIR = Path('rules/src/checks')` in
  `backend/scripts/export_check_fixtures.py`, and the Dockerfiles, compose volumes, pre-commit
  hooks, `.dockerignore`, CLAUDE.md, README and ARCHITECTURE paths. Every gate is green before
  the next task; the generated files are moved, not regenerated.
- **Ownership and boundaries**: `rules/` imports `api-types` and itself only; `api-types`
  imports nothing. `frontend/` and `mcp/` import the two packages and never each other
  (`no-restricted-imports` on `../frontend/*` and `../mcp/*` in the root ESLint config). The
  rules modules keep their rules: pure, every module with its `*.test.ts`, no `console.*` in
  `checks/` and `personas/`, `caseFolding.ts` and `fixtures/evaluator-vectors.json` generated.
- **Images**: `frontend/Dockerfile` and `mcp/Dockerfile` (context: the repository root) copy
  the root `package.json` and lockfile and the four packages' `package.json`, run
  `npm ci -w frontend` (or `-w mcp`), copy `api-types/`, `rules/` and the package, and run
  `npm run build -w <package>`. The dev Dockerfiles mount `api-types/` and `rules/` as well as
  the package's `src/`. `.dockerignore` adds the root `node_modules/` and `mcp/dist/`.
- **The MCP server** is `mcp/`: `src/` (the server), `plugin/` (the skills and the Claude Code
  plugin, R16), `test/` (the integration test), `vite.config.ts` with an SSR build (`target:
  node22`, inputs `src/main.ts` and `src/checksWorker.ts`, output `dist/`) and the Vitest
  `test` block, `tsconfig.json` (`lib: ES2023`, `types: ["node"]`, no DOM), `Dockerfile`, and
  scripts `dev` (`vite-node src/main.ts` or `tsx`, R20), `build`, `lint`, `test`. A bundler is
  needed rather than plain `tsc`, because the rules modules use extension-less relative
  imports that Node's ESM loader can't resolve from emitted `.js`, and because the skills are
  inlined with `import.meta.glob` (`?raw`).

**Rationale**: three consumers of one body of TypeScript (the editor, the MCP server, and the
Python-generated fixtures that pin it) make the rules logic a library, and a library is a
package: one owner of its tests, lint and types, imported by name rather than by a relative
path across directories. The API types are the same case: both consumers mirror the backend's
schemas, so the mirror is one package. npm workspaces are the standard way to hold several
Node packages in one repository with one lockfile and no copying, and need no further tool
at this size. Constitution 1.2.0 (amended 2026-11-05) replaced its earlier "Node tooling is
scoped to `frontend/`, no root `package.json`", a rule from the template's single-SPA days; the
plan's Complexity Tracking records the justification.

**Alternatives considered**:
- The MCP server inside `frontend/` as a second build target: one package and one `npm test`,
  but a backend service in the SPA's package, under the SPA's DOM lib, browser globals and
  Tailwind tooling.
- A top-level `mcp/` importing `../frontend/src/utils/rules/` by relative path: no root files,
  but the rules modules stay owned by the SPA while a second package compiles them, a boundary
  that only a lint rule holds, and `mcp/`'s gates that have to run for frontend changes.
- Linking the packages with `file:` dependencies instead of workspaces: no root `package.json`,
  but three lockfiles and three installs whose tooling versions drift, and `npm ci` that doesn't
  install a linked package's dependencies.
- pnpm or Turborepo: faster installs and task caching, which four small packages don't need;
  a second package manager for the team to learn.
- A Python port of the rules logic: a second implementation of propagation, which the spec
  rules out.

**Even cleaner, as a follow-up and not part of this feature**: generating `api-types` from the
backend's OpenAPI document (`openapi-typescript` against `GET /openapi.json`, run in the
backend's gates with `--check`) would end the hand-mirroring that Constitution I defends with
discipline alone. It changes the principle's mechanism and the type names in 107 files, so it
belongs in a spec of its own.

## R2. Protocol version, SDK and transport

**Decision**:
- The server implements MCP **2025-11-25** (and negotiates 2026-07-28 where the SDK supports
  it): Streamable HTTP, the authorization chapter with protected resource metadata and resource
  indicators, URL-mode elicitation, and the Skills extension SEP-2640
  (`io.modelcontextprotocol/skills`: `skills/list`, `skills/get`, files under `skill://` read
  with `resources/read`).
- The SDK is the official TypeScript SDK, pinned: `@modelcontextprotocol/server` (SDK v2, with
  its Node `http` adapter) if its current release has what the server needs; otherwise
  `@modelcontextprotocol/sdk` 1.x. Request handlers the SDK lacks (`skills/list`, `skills/get`)
  are registered as custom handlers with their zod schemas. Decided on the first task (R20).
- Transport: Streamable HTTP in **stateless** mode at `POST /mcp` (no session id, one process),
  which 2026-07-28 makes the norm anyway. A URL-mode elicitation is sent on the response stream
  of the tool call that needs it. Whether the SDK lets a stateless server do that is checked on
  the first MCP task (R20): if it doesn't, the server runs in session mode (the SDK's
  `Mcp-Session-Id`, sessions in memory, one replica) and the main module, the compose files and
  nginx follow. The approval link is in the tool's result in every case, so the elicitation is
  an addition, never the only path (spec decision 3).
- Tool inputs are validated with zod schemas that the SDK publishes as JSON Schema; every tool
  returns `structuredContent` (the JSON the contract names) and a text block that summarises
  it, so clients without structured content still read the answer.

**Rationale**: the spec names the protocol's standard authorization, URL-mode elicitation and
the Skills extension; all three exist in 2025-11-25 or as a Final SEP on it. Stateless transport
keeps nginx and the single-process deployment simple. Sources: the 2025-11-25 elicitation page
(URL mode: `mode: 'url'`, `elicitationId`, `url`, the client shows the domain and asks consent),
SEP-2640 (Final; `skills/list`, `skills/get`, resources), the SDK's releases (v2.4.0 of October
2026 targets 2025-11-25 and 2026-07-28).

**Alternatives considered**: stdio (the server runs at the deployment, not on the team member's
machine); SSE transport (deprecated); a stateful session per client (nothing in the tools needs
state between calls).

## R3. Topology and addresses

**Decision**:
- Production: nginx (the only public entry) gains three locations: `/mcp` → the `mcp`
  container (port 3100); `/.well-known/oauth-protected-resource` → the `mcp` container (it is
  the protected resource, R4); `/.well-known/oauth-authorization-server` → the backend (it is
  the authorization server). The MCP endpoint is `https://<domain>/mcp`.
- Development: no nginx. The MCP server listens on `http://localhost:3100` (`/mcp`, its
  protected resource metadata), the backend on 3000 (`/.well-known/oauth-authorization-server`,
  `/api/oauth/*`), the SPA on 5173 (the consent, user and approval pages).
- Settings. Backend (`Settings`): `PORTAL_URL`, the management interface's public origin, from
  which links and the authorization endpoint are built (development default
  `http://localhost:5173`; outside development it defaults to `CONNECTION_BASE_URL`, which is
  the same public domain in the Coolify setup); `MCP_URL`, the MCP endpoint's public URL, the
  resource indicator that tokens are bound to (development default `http://localhost:3100/mcp`;
  outside development it defaults to `{CONNECTION_BASE_URL}/mcp`). MCP server (environment):
  `PORT` (3100), `BACKEND_URL` (internal, `http://backend:3000` in compose,
  `http://localhost:3000` by default in development), `PORTAL_URL` and `MCP_URL` with the same
  development defaults, required when `NODE_ENV=production`. All documented in README,
  ARCHITECTURE and the `.env.example` files; the compose files pass them.

**Rationale**: the LLM runs on the team member's machine and reaches the deployment's address
(spec, decision 10), so the MCP server must be public, and the one public entry is nginx. The
two well-known paths are fixed by RFC 9728 (protected resource metadata, served at the resource
origin, path-based `/.well-known/oauth-protected-resource/mcp` as well as the root form) and RFC
8414 (authorization server metadata at the issuer). Keeping the backend as the issuer means the
token endpoint sits under `/api/oauth/`, which nginx already proxies.

**Alternatives considered**: running the MCP server inside the backend container (a second
runtime in a Python image); a separate public domain for MCP (a second TLS host and resource
indicator for no gain).

## R4. The backend as the authorization server

**Decision**: OAuth 2.1 authorization code with PKCE, the backend as issuer, the MCP server as
the protected resource.
- **Metadata**: `GET /.well-known/oauth-authorization-server` (open). The `issuer` is the
  backend's public origin as clients see it: the setting `OAUTH_ISSUER`, which defaults to
  `CONNECTION_BASE_URL` (the one public domain in production, `http://localhost:3000` in
  development). `authorization_endpoint` = `{PORTAL_URL}/authorize` (an SPA route);
  `token_endpoint` = `{issuer}/api/oauth/token`; `registration_endpoint` =
  `{issuer}/api/oauth/register`; `client_id_metadata_document_supported: true`;
  `code_challenge_methods_supported: ["S256"]`; `grant_types_supported:
  ["authorization_code", "refresh_token"]`; `response_types_supported: ["code"]`;
  `token_endpoint_auth_methods_supported: ["none"]`; `scopes_supported: ["read", "drafts",
  "manage"]`. The MCP server's protected resource metadata names `resource` =
  `MCP_URL`, `authorization_servers: [issuer]`, `scopes_supported`, `bearer_methods_supported:
  ["header"]`.
- **Client registration**: a `client_id` that is an `https://` URL is a Client ID Metadata
  Document (the protocol's preferred way): the backend fetches it with `httpx2` (5 s timeout,
  64 KB limit, `https` only, redirects not followed), checks that its `client_id` equals the
  URL and that `redirect_uris` are present, and caches it in `oauth_clients` for 24 hours.
  `POST /api/oauth/register` (open, RFC 7591) is the fallback: it stores a public client with
  a generated `client_id`, no secret, and the given `client_name` and `redirect_uris`; a
  registered client that no authorization uses is deleted after one hour (worker). The consent
  page names the client by its `client_name` (FR-002).
- **Redirect URIs**: must equal a registered one, except that for `http://localhost` and
  `http://127.0.0.1` the port may differ (RFC 8252 loopback). No other `http://` redirect.
- **Authorization**: `GET {PORTAL_URL}/authorize?response_type=code&client_id=…&redirect_uri=…&
  code_challenge=…&code_challenge_method=S256&state=…&scope=…&resource=…` is the SPA's consent
  page (RequireSignIn: a signed-out team member signs in and comes back with the query string).
  It asks `GET /api/oauth/clients/{client_id}` for the client's name and shows the three levels,
  the one the `scope` asks for preselected (a step-up asks for a higher one). "Allow" sends
  `POST /api/oauth/authorize` (cookie, `require_json`) with the request's parameters and the
  chosen level; the backend validates everything, stores a code (SHA-256, 5 minutes, bound to
  client, redirect URI, PKCE challenge, level, resource and user) and answers the redirect URL
  with `code` and `state`; the page navigates there. "Deny" answers the redirect URL with
  `error=access_denied`.
- **Tokens**: `POST /api/oauth/token` (open; `application/x-www-form-urlencoded` as RFC 6749
  requires, JSON accepted too; not behind `require_json`, since no cookie is involved).
  `grant_type=authorization_code` checks the code, the PKCE verifier, the client, the redirect
  URI and `resource` = `MCP_URL`, creates or reuses the client's **agent connection** for this
  user (one `agent_authorizations` row per user and client; a new consent updates its level and
  resets its 30-day idle clock) and answers an access token (random, `cp_at_` prefix, SHA-256
  stored, `AGENT_ACCESS_TOKEN_MINUTES`, default 60) and a refresh token (`cp_rt_`, rotating:
  each use answers a new one and retires the old; a retired token used again revokes the
  connection). The refresh token expires `AGENT_CONNECTION_IDLE_DAYS` (30) after it was issued,
  so a connection lasts while the agent keeps using it (FR-005). `scope` in the answer is the
  level's scope set. No id token, no secrets.
- **Bearer authentication**: `services/auth.py` gets `get_current_principal`: the cookie
  session as today, or `Authorization: Bearer` resolved to the agent connection or personal
  access token (R6) through its hash, with the account, the current access level, and
  `last_used_at` touched at most once a minute. A missing or invalid bearer answers `401` with
  `WWW-Authenticate: Bearer resource_metadata="{origin}/.well-known/oauth-protected-resource/mcp"`
  (RFC 9728's path form for the resource `{origin}/mcp`) from the MCP server,
  and plain `401` from the backend (the MCP server translates). Every management router depends
  on the principal; `get_current_user` stays as the cookie-only dependency where a browser
  session is required (the user page, the consent page, approving).

**Rationale**: this is what the spec's "standard MCP authorization" means in 2025-11-25:
protected resource metadata, resource indicators (the token is bound to `MCP_URL`), PKCE,
Client ID Metadata Documents preferred and dynamic registration as fallback, short-lived access
tokens with rotating refresh tokens. The backend already holds the accounts and the sessions,
so it is the natural issuer, and the consent page is an ordinary signed-in SPA page. Claude Code,
Cursor and Codex implement this flow with a loopback redirect.

**Alternatives considered**: an external authorization server (Keycloak): a fourth container
and a second account store for a team that manages accounts with a CLI; JWT access tokens
validated by the MCP server alone: then a level changed on the user page couldn't apply from
the next call (FR-006) without a revocation list, while a lookup in the backend per call is
cheap and authoritative.

## R5. Access levels, scopes, and where they are enforced

**Decision**:
- The three levels are stored as one value per agent connection or token, `access_level ∈
  {read, drafts, manage}`, each including the previous. The OAuth `scope` is the cumulative set:
  `read`, `read drafts`, `read drafts manage`. Tokens carry no level: the level is read from the
  row at every call, so a change on the user page applies from the agent's next call (FR-006),
  and a call already running keeps the level it resolved at its start.
- **The backend is the authority.** Each management endpoint declares the level an agent needs
  (`require_level('read' | 'drafts')`), and some refuse agents at any level: `PUT
  /api/form-connections/{id}` (a published connection's content, FR-018), and the direct
  `publish`, `DELETE …/draft`, `deactivate`, `activate` and `DELETE …/{id}`, which agents reach
  only through approval requests (R12). A refusal is `403` with `{error:
  'insufficient_access', message, needs_access_level}`, the message naming the level
  ("Changing drafts needs the access level 'Read and edit drafts'.").
- **The MCP server checks once per request**: `GET /api/agent/me` (bearer) answers the account,
  the client's name and the current level, or `401`. The server uses it to answer the
  protocol's `401` with the resource metadata, to refuse a tool below its level before any
  work (with the backend's message, R18), and to show the level in `get_connection`'s links.
  The backend's per-endpoint check is the safety net.
- **Step-up**: the tool `request_access(level)` always answers HTTP `403` with
  `WWW-Authenticate: Bearer error="insufficient_scope", scope="<the level's scopes>",
  error_description="…"` on the MCP request, which is the protocol's signal for a client to
  run the authorization again with that scope; the consent page then shows the requested level
  preselected. After the new consent the client retries the call, which now succeeds and says
  so. A tool refused for lack of access answers a normal tool error (so the LLM reads the
  message), naming the level and the two ways to get it: `request_access`, or the team member
  on their user page.

**Rationale**: FR-003 asks that a refusal name the level and that the client be able to ask for
it. Answering a tool call itself with HTTP `403` would hide the refusal from clients without
step-up support, whereas a dedicated tool makes the `403` expected and harmless, and clients
with step-up (Claude Code's recent versions handle `insufficient_scope`) get the protocol's
flow. Reading the level from the row at every call is what makes the user page's change apply
at once, with no token revocation logic.

**Alternatives considered**: scopes inside the access token (stale after a change on the user
page); one scope per tool (the spec fixes three levels); HTTP `403` on the refused tool call
itself (rejected above).

## R6. Personal access tokens

**Decision**: a personal access token is an `agent_authorizations` row of `kind = 'token'` with
a `name`, a level, an `expires_at` of at most `AGENT_TOKEN_MAX_DAYS` (90) from creation, and one
secret (`cp_pat_` prefix, 43 random characters, SHA-256 stored in `agent_tokens` with `kind =
'personal'`). `POST /api/agent-access/tokens` (cookie, `require_json`) creates it and answers
the secret once. A client uses it as a bearer token without OAuth, and the MCP server treats it
like an access token. Changing its level keeps the secret and the expiry; revoking deletes the
row; its last use is shown. A lost token can't be shown again (FR-004, edge case).

**Rationale**: the spec's fallback for clients without the browser sign-in, with the same level
choice and the same management on the user page, and the same `last_used_at`, so the one
table and the one bearer path serve both kinds.

## R7. The user page: changes apply at once, revocation cancels approvals

**Decision**: `GET /api/agent-access` lists the signed-in account's agent connections and
tokens (never another account's: the query filters by `user_account_id`); `PUT
/api/agent-access/{id}` changes the level; `DELETE /api/agent-access/{id}` revokes (deletes the
row with its tokens, `ON DELETE CASCADE`). Both writes run `approval_requests.cancel_for(…)`:
revoking cancels the authorization's waiting approval requests with reason `revoked`; lowering
cancels those the new level no longer allows (`manage` actions below `manage`; every action
below `drafts`) with reason `access_changed` (FR-006, FR-026). Deleting an account cascades to
its authorizations, tokens and approval requests (FR-005). The idle expiry (30 days without a
refresh) and the token expiry are checked at every use and swept by the worker.

**Rationale**: with the level read at every call (R5), "applies from the next call" needs no
further mechanism; cancelling eagerly on revoke and lower is what keeps a page that is already
open from approving with an access the agent no longer has (the approve endpoint re-checks the
request's status under the row lock anyway, R12).

## R8. One implementation of the editing logic: `rules/src/edits.ts`

**Decision**:
- The compositions that today live in the rules step's reducer (an edit of Standard, then
  `propagateToBranches`; a deletion in Standard with `deletionEffects`; a grouping that keeps
  the counters; a variant added with `newBranch`; a rename refused by `renameClash`; a reset,
  remove, restore, copy, duplicate, ungroup, AND/OR switch, group message…) move into one pure
  module, `rules/src/edits.ts`, one function per editor action over
  `{ branches: BranchInput[]; counters: NumberingBase }`, each answering the new state and
  what changed, or a refusal with the editor's message and the item and variant it names
  (`RulesProblem`). The rules reducer calls these functions and keeps only what is UI: the open
  tab, selection, dialogs, toasts, undo and focus. `edits.test.ts` pins every action, and the
  reducer's existing tests keep passing, which is the parity check of SC-003: the editor and the
  agent tools call the same functions.
- Every agent tool that changes a draft runs the same loop in the MCP server:
  1. `GET /api/form-connections/{id}`; a published connection is refused (FR-018), a `404` says
     the draft no longer exists;
  2. resolve the variant and item named in the call (by id, link or name; an ambiguous name is
     refused with the candidates, FR-019);
  3. apply the `edits.ts` function to the draft's branches, documents, name or description,
     with the catalog and value sets as the editor's `RuleContext`; a refusal is the tool's
     error, in the editor's words;
  4. `PUT /api/form-connections/{id}/draft` with the whole content, the draft's
     `numbering_base`, the `version` read in step 1 and `replace: false`, and `step` set to the
     furthest step the content reaches (`rules` once any variant has a rule, `documents` once a
     document is requested, `connection` otherwise; FR-017);
  5. on `409 draft_changed`, start again at step 1, at most three times, so that the change
     applies to the draft as stored and never undoes a save made in between (FR-015); on
     `409 draft_published` or `404`, refuse as in step 1; on `400`, pass the server's message on
     (FR-016).
- Deleting a document that rules check mirrors the editor's confirmation: the tool refuses and
  names the rules unless `also_remove_rules: true`, and then removes them as
  `rulesCheckingRemoval()` does (that helper moves to `edits.ts` with the rest).

**Rationale**: FR-014 asks for one implementation of propagation, marks and identifiers between
the editor and the tools. Reusing `branches.ts` alone would leave the second composition of
these functions, and a divergence there would be a propagation bug in all but name. Extracting
the composition is a refactor of the reducer, but it is the only way to make SC-003 a test
rather than a review. The read-apply-save loop is spec 005's draft save, used as the editor's
"Save and exit" uses it; the server's checks stay the safety net for the structure.

**Alternatives considered**: calling the reducer from the MCP server (it carries UI state and
imports from `pages/`); re-composing `branches.ts` calls in the MCP server (a second
implementation of the compositions); a new draft endpoint per action on the backend (a second
implementation of propagation in Python, ruled out by the spec).

## R9. Search and paging: a new endpoint

**Decision**: `GET /api/form-connections/search?q=&status=&cursor=&limit=` answers a
`FormConnectionPage { items: FormConnectionSummary[], next_cursor: string | null }`: at most
`limit` entries (default and maximum 25), ordered by `updated_at` descending then `id`, with a
keyset cursor (the last entry's `updated_at` and `id`, base64), `q` matched case-insensitively
against the name and the description (`ILIKE '%q%'` on both; no trigram index, since a thousand
rows scan in milliseconds), and `status ∈ {draft, live, deactivated}` mapped to `published_at
IS NULL`, `published_at IS NOT NULL AND is_active`, `… AND NOT is_active`, deleted rows always
excluded. `GET /api/form-connections` is unchanged for the overview.

**Rationale**: FR-007 and SC-006 need search, a status filter and pages of 25; the overview
needs the full list. One endpoint with two answer shapes would break Constitution I's "one
schema per response", so the agents get their own, read-only endpoint. Keyset paging is stable
while connections change between calls.

## R10. Variant identifiers from the moment a variant is added

**Decision**:
- A variant's `id` is a UUID that the editor assigns when the variant is added
  (`crypto.randomUUID()` in `edits.ts`'s `addVariant`, also for the main variant of a new
  connection) and that the server keeps: `rules.clean_rules()` accepts a draft branch's id when
  it is a UUID unique within the connection, and assigns one where it is null; `first_rule_set()`
  creates the branch rows with the draft's ids when the draft is published, so a link copied from
  a draft still opens the same variant afterwards (FR-029). For a published connection's save,
  a new branch's id is likewise the editor's UUID if given and unused, or server-assigned if
  null, which keeps spec 002's behaviour for the current editor.
- The migration backfills a UUID into every branch of every stored draft whose `id` is null
  (a Python data migration over `form_connections.draft`, hand-written after autogenerate).
- The rules step keys its branches by this id: `RulesBranch.key` becomes the id (the main
  variant's key is its id too; `newBranchKey()` goes). Local draft records of format 2 may hold
  branches with null ids: the flow assigns ids when it loads such a record, and the record is
  written back with them at the next change; the format number stays 2, since the shape is
  unchanged.

**Rationale**: FR-029 asks for identifiers from the moment a variant is added, kept through
publishing. The editor is where variants are added, and it already generates UUIDs for local
draft keys; letting the server accept a client UUID keeps one numbering path for drafts and
published connections.

**Alternatives considered**: ids assigned only by the server on the first draft save (a variant
has no link until the first save; the agent tools save at once, but the editor doesn't);
sequential ids like `variant-{n}` (a new counter, and the pull URLs already use UUIDs).

## R11. Links

**Decision**:
- A connection's link is `{PORTAL_URL}/form-connections/{id}`. An item's link is
  `{PORTAL_URL}/form-connections/{id}/edit?step=rules&variant={variantId}&item={rule-n|group-n}`;
  a variant's link is the same without `item`. Identifiers only, never names (FR-029).
- **Opening a link** (FR-030, FR-031): `pages/FormConnectionEdit/` reads `step`, `variant` and
  `item` from the search parameters (router state keeps working for the details page's
  buttons); a draft opens the create flow and a published connection the edit flow, at the rules
  step with the variant's tab open and the item scrolled into view and focused (`goToItem()` of
  the rules step, which exists). A variant or item that isn't there shows a notice at the top of
  the rules step ("This link points to a variant that no longer exists.") and opens the first
  variant; a connection that isn't there is the existing not-found screen. A signed-out team
  member goes through the sign-in and returns with the query string (`RequireSignIn` keeps the
  location, checked in R20).
- **Copy link** (FR-028): a "Copy link" entry in `RuleMenu`, `GroupMenu` and `BranchMenu`,
  which writes the link with `navigator.clipboard.writeText()` and shows the step's existing
  toast ("Link copied."); on a failure (no secure context, permission), the toast says the link
  couldn't be copied. The step receives the connection's id and `PORTAL_URL`-free relative paths
  and builds absolute links from `window.location.origin`, so previews and production get their
  own.
- **Parsing links in tools** (`mcp/src/links.ts`, pure): a value that parses as a URL must have
  `PORTAL_URL`'s origin, else it is refused as not belonging to this management interface
  (FR-030); its path and query give the connection, variant and item. A value that isn't a URL
  is an identifier (UUID for connections and variants, `rule-n` / `group-n` for items) or, for
  variants and items, a name.

**Rationale**: search parameters survive the sign-in round trip (spec 005 learned this for
`?local=`) and can be typed by people and agents alike; the edit route already opens both flows.
Building the link in the browser from its own origin avoids a frontend setting.

## R12. Approval requests

**Decision**:
- **Model**: `approval_requests` rows (data-model.md §4): the connection, the `action ∈
  {publish, delete_draft, deactivate, reactivate, delete}`, the authorization that asked, the
  account, what it was made for (`draft_version` for a draft, `was_active` for a published
  connection), `expires_at` (`APPROVAL_REQUEST_MINUTES`, 10), `status ∈ {waiting, done,
  declined, expired, replaced, cancelled}`, a `cancel_reason`, the failure of the last approve
  attempt (`failed_at`, `error_id`), and `decided_at`. The outcome the agent sees is the status,
  or `failed` while a waiting request has a failure (FR-027).
- **Creating** (`POST /api/approval-requests`, bearer): the level is checked (publish and
  delete_draft need `drafts`, the other three `manage`); the action's preconditions are checked
  without writing (FR-022): for `publish`, the publishing checks of spec 005 run on the stored
  draft (`drafts.check_publishable()`, the checks of `publish_draft` factored out before its
  write, with the same messages); for `deactivate` the connection must be live, for `reactivate`
  deactivated, for `delete` published; a draft can't be deactivated or reactivated. Then, under
  the connection's row lock, any waiting request for the same connection and action becomes
  `replaced`, and the new row is inserted. The answer is the request with its page's link,
  `{PORTAL_URL}/approvals/{id}`, and `expires_at`.
- **The tool** `request_approval` passes that on in its result and, when the client declared
  the `url` elicitation capability, also sends `elicitation/create` with `mode: 'url'`, the
  link, and a message that names the action and the connection. The tool returns at once; the
  agent learns the outcome with `check_approval` (`GET /api/approval-requests/{id}`, bearer,
  only the authorization's own requests). The skill tells the agent to hand the link over and
  to check once the team member says they have decided.
- **Staleness is computed, not stored** (FR-024): reading or approving compares the request
  with the connection as it is now: a draft whose `draft_version` moved, a draft published or
  deleted since, a published connection whose `is_active` moved or that was deleted since.
  Such a request reads as `cancelled` with the reason (`draft_changed`, `draft_published`,
  `draft_deleted`, `connection_changed`, `connection_deleted`), and approving it does nothing
  but say so. `expired` is `expires_at` in the past. Revoking or lowering access cancels
  eagerly (R7).
- **Approving** (`POST /api/approval-requests/{id}/approve`, cookie, `require_json`): the
  signed-in account must be the request's (`403` otherwise, FR-025); under the row lock the
  status must be `waiting`, not expired and not stale; then the action runs through the
  existing services, with the approver's session: `drafts.publish_stored_draft(db, id,
  version)`, which builds the `DraftPublish` body from the stored draft and calls
  `publish_draft()` (one save path, spec 005's `DraftGuard`); `drafts.delete_draft()`;
  `form_connections.deactivate_form_connection()`, `activate_form_connection()`,
  `delete_form_connection()`. Success sets `done`. An `EudiploError` leaves the row `waiting`
  with `failed_at` and the `error_id` of `http_error_for()`, the page shows the failure and
  "Try again" while the request is valid (FR-027). `409`s from the services (`draft_changed`,
  `draft_published`, `not_published`) can only come from a race with the staleness check and
  are answered as the stale reasons.
- **Declining** sets `declined`. The page refuses anything but `waiting` with the reason.
- The worker deletes requests that ended more than a day ago.

**Rationale**: the tool must not act (FR-021), the action must be checked first (FR-022), the
request must apply to what it was made for (FR-024), and the approved action must be the
management interface's (FR-027): a row with a snapshot of the version or status, checked under
the row lock, and the existing services called by the approve endpoint give all four with no
new save path. Computing staleness from the connection keeps the draft save path untouched.

**Alternatives considered**: blocking the tool call until the decision (the agent would hang
for up to 10 minutes and a client's timeout would end it); storing the whole draft content in
the request (the version suffices, as spec 005's conflict handling shows); eager cancellation
from the draft save (a second place that knows about approvals in the save path).

## R13. The approval page

**Decision**: `/approvals/:id`, a signed-in screen in `AppLayout`, one `h1`, loaded from `GET
/api/approval-requests/{id}`, which for the page's account answers the request with what the
page shows: for `publish`, the stored draft as `FormConnectionDraft` (name, description,
documents with fields, branches); for the other actions, the connection's name, description,
status and the connection URLs it affects (`trigger_url`, each variant's name and `pull_url`).
The page renders:
- `publish`: the publish step's summary, reusing the details page's `DocumentsSummary` and
  `RulesSummaryContent`, and the findings of the rule checks computed in the page with
  `useRuleChecks()` over the draft's branches, listed as the publish dialog lists them
  (`dialogLineOf()`), per variant, with "being checked" while the run is pending;
- `delete_draft`: the draft's name, "Last saved …", and that its content will be gone for good;
- `deactivate`: the name, the description, the URLs that will answer "unavailable" until
  reactivated, and that requests in progress are cancelled;
- `reactivate`: the name, the description, the URLs that will work again;
- `delete`: the name, the description, the URLs that stop working for good, that requests in
  progress are cancelled and that deleting can't be undone.
The description shows as on the details page (one line, cut with "…", nothing when empty; spec
006 R6). "Approve" and "Decline" are KERN buttons; the outcome states (done with the
connection URLs after publishing or reactivating; declined; expired; replaced; cancelled with
its reason; another account's request; failed with "Try again") replace the actions. The copy
is in [contracts/ui-screens.md](contracts/ui-screens.md).

**Rationale**: FR-023 asks for exactly what the publish step shows, findings included, and the
findings exist only in the browser (spec 003): the page reuses the hook and the summary
components rather than a second rendering. Serving the draft content with the request keeps
the page to one call.

## R14. Rule checks for agents

**Decision**: the tool `check_rules(connection, variant?)` reads the connection (draft or
published), builds each variant's checked tree with `buildCheckedBranch()` (the requested
documents' fields from the catalog, the value sets, today in Germany from `todayInGermany()`),
runs `checkBranch()` in a `node:worker_threads` worker (entry `mcp/src/checksWorker.ts`, a Node
counterpart of the SPA's `workers/checks.ts` over `parentPort`) with the editor's deadline (5 s from the
call) and terminates it at the watchdog (5.5 s), and answers per variant: `complete`, the
notice, the findings and the rules left out with why (`leftOut`, with the reason derived as the
editor's `UnrequestedBanner` and `ProblemNote` derive it: no data chosen, data not requested,
condition incomplete). Each finding gives the variant, the item (id, name, link), the kind, the
other items involved (from the reason, by id and name), why it holds (`noteOf()`), whether it
holds only at the moment, and what would resolve it: a new `resolutionOf(finding, names)` in
`checks/findingMessages.ts` (the one place where finding texts are written), worded for an LLM
("Change or delete one of Rule 02 and Rule 03; they can't be met together", "You can delete the
rule; Rule 05 already covers it", "The group's condition is always met; delete it or make it
stricter"). The variant's notice gets a resolution the same way (`resolutionOf(notice)`: "Loosen
or delete one of the rules that no applicant can meet together", "Add a rule or make one
stricter; as it is, the variant accepts every applicant"), since FR-032 asks for one for every
kind. Nothing is stored or logged (FR-035).

**Rationale**: the same checks, the same checked tree, the same deadline, so SC-007 holds by
construction. A worker thread keeps a 5-second solver run off the server's event loop, which
serves other agents meanwhile. New texts go where the project keeps finding texts.

## R15. Test applicants

**Decision**: the tool `test_applicants(connection, variant, applicants[], day?)`:
- the applicant fields are spec 004's persona fields of the variant (`personaFieldsOf()`): the
  keys `document_type.field`, `.part` for a part, `#class` for a licence class's date, as the
  checks' variables name them; `get_variant` lists them with each one's kind, value set and
  whether it takes a list, so an agent knows what to supply;
- each applicant is a name and a map of values by key; `mcp/src/applicants.ts` (pure) checks
  every value against its field's kind as the test step's editor does: a finite number, a
  non-empty text, a value of the value set (or a list of them for a multiple-value field), a
  `YYYY-MM-DD` date, a list of class codes for the licence classes; a value that doesn't fit is
  refused with the field and the kind it expects (FR-034), and an unknown key with the known
  keys; a missing key counts as missing data, which the evaluation reads as not checked;
- the applicant becomes the evaluator's `Applicant` with `applicantOf()`, and `evaluateBranch()`
  runs with the day of sharing (today in Germany from `todayInGermany()`, or `day`); the answer
  per applicant is `met`, each rule's and group's outcome in the evaluation's order with its
  name, id and link, and the messages, exactly as the pull would deliver them;
- the UI's personas are never involved (FR-035); nothing is stored or logged.

**Rationale**: the evaluator is the port that the generated vectors pin to Python, and the
persona fields are the editor's own list of what the rules read, so the agent sees what the
test step would show for the same values.

## R16. Guidance from one source

**Decision**:
- The source is `mcp/plugin/`: a Claude Code plugin with `.claude-plugin/plugin.json`,
  `.mcp.json` (the MCP server at `${CONNECTION_PORTAL_MCP_URL}`, an environment variable the
  README explains, since previews and production differ) and `skills/<topic>/SKILL.md` for the
  topics the spec lists: `connection-workflow`, `variants-and-standard`, `conditions`,
  `documents-and-catalog`, `access-levels`, `publishing-and-live-connections`, `links`,
  `checks-and-tests`. `mcp/plugin/instructions.md` holds the server instructions.
- The server embeds these files at build time (`import.meta.glob('../plugin/skills/*/SKILL.md',
  { query: '?raw', eager: true })`, and the instructions likewise) and serves them three ways:
  the `instructions` of the `initialize` result; the Skills extension (`skills/list`,
  `skills/get`, each file as a `skill://<topic>/SKILL.md` resource); and `get_guide(topic)`,
  which answers the same text and, without a topic, the list of topics with their descriptions.
- `.claude-plugin/marketplace.json` at the repository root lists the plugin, so that
  `claude plugin marketplace add <repo>` and `claude plugin install connection-portal@…` add the
  server and the skills in one step; other agents copy `plugin/skills/`.
- **The gate** (FR-038, SC-009): `mcp/src/guidance.test.ts` asserts that every registered tool
  name appears in at least one `SKILL.md`, that every skill has frontmatter with a name and a
  description, and that the instructions mention every access level; a tool changed without its
  guidance fails `npm test`. CLAUDE.md gets the rule.

**Rationale**: the spec wants three layers from one source and a gate; files in the plugin
folder, embedded at build time, are the one source, and a test over the registry is the gate.

**Alternatives considered**: reading the skills from disk at runtime (a second copy in the
image to keep in step); generating the plugin from the server (a build step for files that are
the source).

## R17. The limit on new drafts

**Decision**: `agent_authorizations` holds `drafts_window_started_at` and `drafts_in_window`.
Creating a draft for an agent principal, under the row's lock: if the window started more than
an hour ago (or never), it restarts now with a count of 1; else if the count is below
`AGENT_DRAFTS_PER_HOUR` (20) it goes up by one; else the call is refused with `429` and the
message "This agent can create drafts again at HH:MM." (the window's end, in Germany's time
zone, `Europe/Berlin`). Only `POST /api/form-connections/drafts` counts; saves don't (FR-020).
A changed setting applies at the next creation.

**Rationale**: two columns and no new table, no log of creations (the spec rules out an activity
log), and a message that says when (FR-020). A fixed window is coarse but sufficient for a
runaway agent.

## R18. Logging and privacy

**Decision**: the backend logs ids only ("Approval request %s created", "Agent authorization %s
revoked"); never a token, code, secret, client metadata document, applicant, finding or rule
content. Validation errors from the token endpoint are answered as RFC 6749 error objects and
logged as their `error` code only. The MCP server logs one line per request with the method,
the tool name, the status and the duration, never arguments or results, through a minimal
logger of its own (`console.error` is forbidden in `checks/` and `personas/`, which the server
imports, so the rule stays: nothing in those modules logs). The nginx access log shows `/mcp`
requests as any other.

## R19. Testing

**Decision**:
- **pytest** (a practice, run anyway): OAuth metadata, registration (CIMD with a fake
  `httpx2` transport, DCR), authorization and token flows including PKCE failures, refresh
  rotation and reuse, resource mismatch, bearer principals and levels on every management
  endpoint (a table test: endpoint × level → status), personal access tokens, the user page's
  endpoints, cancellation on revoke and lower, the search endpoint and its cursor, approval
  requests (creation checks, replace, staleness per action, approve and decline, the failure
  path with the fake EUDIPLO, another account), the draft limit, the branch ids in drafts and
  publishing, and the migration's backfill.
- **Vitest** (the gate): `edits.ts` (every action, with the reducer's cases replayed), the
  reducer still, `links.ts`, `applicants.ts`, the agents' findings mapping and
  `resolutionOf()`, `guidance.test.ts`, and an integration test of the MCP server against a
  fake backend (`mcp/test/fakeBackend.ts`, an in-memory `node:http` server that implements the
  endpoints the server calls): tools over the Streamable HTTP transport with the SDK's client,
  the `401`, the step-up `403`, the read-apply-save loop with a `409` in between, and the
  approval tool's elicitation.
- **Manual**: quickstart.md's scenarios with Claude Code, Cursor and Codex (SC-010 asks for two
  clients), the consent, user and approval pages, "Copy link", and an accessibility pass of the
  new pages.

## R20. Points to check while coding

- The SDK package to use (R2): v2's `@modelcontextprotocol/server` and its Node adapter, or
  1.x; whether it ships `skills/list` and `skills/get` or they are custom handlers; the exact
  client capability that announces URL-mode elicitation in 2025-11-25; whether a stateless
  Streamable HTTP server can send `elicitation/create` on a call's response stream (if not:
  session mode, R2).
- TypeScript resolving a workspace package's `exports` to `.ts` sources under
  `moduleResolution: bundler` (R1); the fallback is `paths` in `tsconfig.base.json`. Vite
  serving and bundling the linked packages' sources, and code-splitting the dynamic
  `import('@connection-portal/rules/checks/checkedTree')` as it splits the relative one today.
- `npm ci -w frontend` installing the workspace's dependencies without the root's, with the
  frontend's Node 20 and the images' Node 26.
- How Claude Code, Cursor and Codex react to `403 insufficient_scope` on a tool call (R5): the
  step-up through `request_access` is designed to be harmless either way.
- `${CONNECTION_PORTAL_MCP_URL}` expansion in a plugin's `.mcp.json` (R16); otherwise the
  plugin ships the production address and the README says how to change it.
- `RequireSignIn` keeping the search parameters through the sign-in round trip (R11).
- Vite's SSR build of `mcp/src/main.ts` bundling `import.meta.glob` raw imports and the worker
  thread's entry as a second output file (R1, R14); `vite-node` or `tsx` for `npm run dev` in
  `mcp/`.
- The size of a `FormConnectionDraft` with 20 variants × 200 items in a tool result: the
  layered reads keep one variant per answer; `get_connection`'s overview carries counts only.
