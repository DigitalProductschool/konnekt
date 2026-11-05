# Implementation Plan: Agent Access through an MCP Server

**Branch**: `007-agent-mcp-server` | **Date**: 2026-11-05 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/007-agent-mcp-server/spec.md`, with its
Clarifications of 2026-11-04 and 2026-11-05.

**Note**: this checkout's `.git` points to a worktree path that doesn't exist here, so git couldn't
confirm the branch. `setup-plan.sh` resolved the feature from `.specify/feature.json`.

## Summary

Team members connect LLM agents on their own machines (Claude Code, Cursor, Codex) to the
middleware through an **MCP server**, sign them in with the protocol's standard authorization,
and give each one of three access levels. Agents find and read connections in layers, build
**drafts** one change at a time with the editor's own rules logic, run the rule checks and test
fictitious applicants, and ask for **approval** to publish or delete a draft or to deactivate,
reactivate or delete a published connection, which the team member gives on a page in the
Connection Portal. Links name connections, variants and rules for people and agents alike, and
guidance comes from one source as server instructions, MCP skills and a Claude Code plugin.

**Technical approach** (research R1–R20):
- **An npm workspace of four packages**: the API types and the pure rules logic leave the SPA
  for packages of their own, `api-types/` and `rules/`, consumed as source by `frontend/` and by
  the new `mcp/`, the MCP server, a Node service in its own container behind nginx's `/mcp`
  (R1, R3). This replaces the constitution's single-package rule (Complexity Tracking).
- **The backend is the OAuth 2.1 authorization server**, the MCP server the protected resource:
  PKCE, Client ID Metadata Documents with dynamic registration as fallback, resource indicators,
  one-hour access tokens, rotating 30-day refresh tokens, personal access tokens; a bearer
  principal beside the cookie session, with the access level read from the row at every call,
  so a change on the user page applies at once; step-up through `request_access` (R4–R7).
- **One implementation of editing**: the rules reducer's compositions move to `rules/src/edits.ts`;
  the editor and every draft-changing tool call the same functions, and the tool saves the
  whole draft with its version, retrying on a conflict (R8).
- **New backend pieces**: a search endpoint with a cursor, variant identifiers in drafts
  (backfilled by the migration, kept through publishing), approval requests with a snapshot of
  what they were made for, checked under the row lock and run through the existing services,
  and the draft limit on the authorization (R9, R10, R12, R17).
- **Checks and tests for agents** reuse `checkBranch()` in a worker thread and
  `evaluateBranch()` with the persona fields; findings get a `resolutionOf()` text (R14, R15).
- **Screens**: the consent page, the user page, the approval page (reusing the summaries and
  `useRuleChecks()`), "Copy link", and opening links through search parameters (R11, R13).
- **Guidance** from `mcp/plugin/`, embedded at build time, with a Vitest gate (R16).

## Technical Context

**Language/Version**: Python 3.13 (backend); TypeScript 6.0 in every Node package; React 19.2
in `frontend/`; Node 22+ for the MCP server (`node:26-alpine` in its image, `node:22` in
development, as the frontend's images; the workspace root works with the team's Node 20 too).

**Primary Dependencies**:
- **Backend**: unchanged (FastAPI, SQLAlchemy 2 sync, Alembic, psycopg 3, Pydantic 2, `httpx2`
  for fetching Client ID Metadata Documents). No new package: codes and tokens are
  `secrets.token_urlsafe()` and SHA-256, PKCE is `hashlib`.
- **Workspace root**: `package.json` with `workspaces`, scripts and `prepare`; no dependency of
  its own.
- **`api-types/`, `rules/`**: no runtime dependency; dev: `typescript`, `eslint`, `prettier`,
  and for `rules/` `vitest`, at the frontend's versions, hoisted by the workspace.
- **`frontend/`**: unchanged (React Router 7, KERN, Tailwind 4) plus the two workspace packages.
- **`mcp/`**: the official TypeScript SDK, pinned (`@modelcontextprotocol/server` v2 with its
  Node `http` adapter, or `@modelcontextprotocol/sdk` 1.x; R2, R20), `zod`, the two workspace
  packages; dev: `typescript`, `vite`, `vitest`, `eslint`, `prettier`, `@types/node`, `vite-node`
  or `tsx`. README's dependency table gets the runtime ones with their reason.

**Storage**:
- **PostgreSQL**: five new tables (`oauth_clients`, `oauth_codes`, `agent_authorizations`,
  `agent_tokens`, `approval_requests`), no new column on existing tables, and a data backfill of
  variant ids in stored drafts. One migration ([data-model.md](data-model.md)).
- **Browser**: unchanged (local drafts of format 2; branches get ids on load).
- **MCP server**: no storage; no state between calls.

**Testing**:
- **pytest** (a practice, run anyway): OAuth, principals and levels, the user page, search,
  approvals, the limit, branch ids, the backfill (R19).
- **Vitest in `rules/`** (a gate) in `node`: every module as today, `edits.ts` with the reducer's
  cases replayed (SC-003), `resolutionOf()`, the generated vectors replayed.
- **Vitest in `frontend/`** (a gate) in `node`: the slimmer reducer, the link builder of the
  rules step, the sibling `utils.ts` tests as today.
- **Vitest in `mcp/`** (a gate) in `node`: `links.ts`, `resolve.ts`, `applicants.ts`, the
  findings mapping, `guidance.test.ts` (SC-009), and the server against an in-memory fake
  backend over the SDK's client (R19).
- **Manual**: scenarios V1–V13 in [quickstart.md](quickstart.md), with two MCP clients.

**Target Platform**: DO.IT's evergreen desktop browsers for the Portal; MCP clients on team
members' machines reaching `https://<domain>/mcp`; Linux containers behind nginx (one more:
`mcp`).

**Project Type**: web application (React SPA behind nginx, FastAPI backend, PostgreSQL) with a
second Node service, the MCP server, and two shared TypeScript packages, in one npm workspace.

**Performance Goals**:
- A tool call: two or three backend calls, under 300 ms at the deployment's scale.
- `search_connections` over 1,000 rows: one indexed-ordered scan with `ILIKE`, under 100 ms.
- `check_rules`: the editor's 5-second deadline in a worker thread; `test_applicants`: under a
  second for 10 applicants.
- The consent, user and approval pages: one or two API calls each.
- The move of the packages changes no bundle: Vite inlines the linked sources as it inlined
  the relative imports.

**Constraints**:
- **One implementation** of propagation, validation, checks and evaluator (spec decision 2;
  FR-014): `rules/src/edits.ts` and the package imports, no port, no copy and no second
  composition (R1, R8).
- **Package boundaries**: `api-types` imports nothing; `rules` imports `api-types` and itself;
  `frontend` and `mcp` import the two packages and never each other (R1).
- **The move changes no behaviour**: the first code task moves files and rewrites imports, and
  every gate is green before feature work starts (R1).
- **Nothing acts without approval** for the five actions, and the approved action is the
  management interface's own (FR-021, FR-027): a snapshot checked under the row lock, then the
  existing service (R12).
- **A published connection's content is read-only for agents** at every level (FR-018):
  enforced in the backend, mirrored in the MCP server's refusals.
- **No transaction while EUDIPLO or a metadata document is fetched** (ARCHITECTURE).
- **Nothing stored or logged** of tokens, codes, applicants, findings or results (FR-035,
  FR-040).
- **Published connections and `/api/connect/` keep their behaviour** (FR-041).
- **WCAG 2.1 AA** for the new screens (FR-042).

**Scale/Scope**: one team, dozens of connections, a few agents. New and moved code:
- **Workspace**: the root `package.json`, lockfile, `eslint.config.mjs`, `.prettierrc`,
  `tsconfig.base.json`; `api-types/` (6 moved files, package files); `rules/` (88 moved files,
  package files, `vitest.config.ts`); 61 + 107 import rewrites in the SPA; 2 Worker entries moved
  to `frontend/src/workers/`; the fixtures script's path; Dockerfiles, compose, pre-commit,
  `.dockerignore`.
- **Backend**: 3 service modules (`services/oauth.py`, `services/agent_access.py`,
  `services/approvals.py`), 3 routers (`routers/oauth.py`, `routers/agent_access.py`,
  `routers/approval_requests.py`), changes to `auth.py`, `form_connections.py`, `drafts.py`,
  `rules.py`, `worker.py`, `config.py`, `models.py`, `schemas.py`, `main.py`; 1 migration; about
  7 test modules.
- **`rules/`**: `edits.ts` (and the SPA's rules reducer slimmed), `resolutionOf()` in
  `checks/findingMessages.ts`, `addVariant` assigning ids.
- **`mcp/`**: about 15 modules in `src/` (config, backend client, auth, links, resolution of
  names, the tool registry, one module per tool group, views, checks, applicants, guidance, the
  worker thread entry, main, log), `plugin/` with 8 skills, `test/`, Dockerfile, 2 compose
  services, 3 nginx locations.
- **`frontend/`**: 3 pages (`Authorize`, `Account`, `Approval`) with about 15 small components,
  "Copy link" in 3 menus, link opening in `FormConnectionEdit`, the user menu entry, API modules.
- **`api-types/`**: the new mirrors (agent access, approvals, OAuth, search page, URLs).
- **Documentation**: ARCHITECTURE (the workspace, the packages, a section on agent access and
  the MCP server), README (structure, setup, commands, variables, dependencies, the plugin),
  CLAUDE.md (paths, rules and commands), `.env.example` files, the constitution amendment.

**Open points**: none in the design. The points to check while coding are research R20 (the SDK
package and its skills support, TypeScript and Vite resolving the packages' `.ts` exports,
`npm ci -w` in the images, clients' handling of the step-up `403`, `.mcp.json` variable
expansion, `RequireSignIn` and search parameters, the SSR build's raw imports and worker entry).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design below.*

Checked against constitution v1.1.0 (`.specify/memory/constitution.md`).

| Principle or rule | How the plan complies | Result |
|---|---|---|
| **I. Contract parity** | Every new schema (`FormConnectionPage`, `AgentAccessItem`, `TokenCreate`, `TokenCreated`, `ApprovalRequest`, `ApprovalPreview`, `ConnectionUrls`, `AgentMe`, the OAuth bodies) is mirrored by hand in the same change; **the mirror moves from `frontend/src/types/` to `api-types/src/`**, one package that both consumers import, which the principle's text has to name. Every error is an `HTTPException` with `{error, message}`; the OAuth endpoints answer RFC 6749 bodies, the one documented exception, and the well-known documents are plain JSON by their RFCs | PASS once the amendment names `api-types/`; the protocol bodies are recorded in [contracts/oauth.md](contracts/oauth.md) |
| **II. Sync persistence (NON-NEGOTIABLE)** | New handlers are plain `def` with the sync `Session`, 2.0-style queries and `with_for_update()` row locks; fetching a metadata document and calling EUDIPLO happen with no transaction held (R4, R12) | PASS |
| **III. Quality gates** | Formatting, linting, type-checking and tests stay tooling-enforced, per package, from one root ESLint and Prettier config; Vitest in `node` in `rules/` (`vitest.config.ts`, the right file where no Vite build exists), `frontend/` and `mcp/` (the `test` block of each `vite.config.ts`, no `vitest.config.ts` beside it); no `pytest.ini`; Ruff, mypy and pytest for the backend. **The principle names only `frontend/`'s gates and configuration files**, so the amendment lists the packages and their gates | PASS once amended |
| **IV. Dependencies and config** | One lockfile at the root; each package declares what it imports, the images install with `npm ci -w <package>`; README's table gets the SDK and zod with their reason; eight new backend settings as `Settings` fields, in README, ARCHITECTURE and `.env.example`; the MCP server's four variables likewise; no secret committed | PASS |
| **V. Schema evolution** | One migration, autogenerated then corrected by hand for the partial unique index and the backfill of draft branch ids; no committed migration edited; `Mapped` / `mapped_column`, UUID4 keys, indexes on every looked-up column, `datetime.now(tz=timezone.utc)` | PASS |
| **Technology and structure: stack and layout** | The backend keeps its layout. The SPA keeps its folders, small components, sibling `types.ts` / `constants.ts` / `utils.ts`, reducers, Tailwind only, no `any`. **An npm workspace with a root `package.json` and four Node packages (`api-types/`, `rules/`, `frontend/`, `mcp/`), the rules logic and the API types out of `frontend/src/`, and a second Node service**, which the constitution's fixed stack ("React SPA + FastAPI"), "Node tooling is scoped to `frontend/`, a root `package.json` MUST NOT be introduced" and the prescribed `src/` folders rule out | **VIOLATION**, justified in Complexity Tracking; amendment proposed |
| **Logging** | `logging` only; ids, never tokens, codes, content, applicants or findings (R18). The MCP server logs method, tool, status and duration through `mcp/src/log.ts`; nothing in `rules/` logs | PASS |
| **Security (CLAUDE.md "Auth")** | Management routers depend on the principal (cookie or bearer); writes on `require_json`; the endpoints that only the browser may call refuse bearers; the OAuth endpoints are the only new open ones, by the protocol, with PKCE, exact redirect URIs, hashed codes and tokens, rotation with reuse detection, and resource binding (R4) | PASS |
| **Workflow and documentation** | Backend: model → schemas → migration → services → routers → `include_router` → settings → tests. Frontend: types (`api-types/`) → API → pure modules (`rules/`) → hooks → pages. The last task applies the checklist: ARCHITECTURE (the workspace and packages, agent access, the MCP server, approvals, links, the `mcp` container), README (structure, setup, commands, variables, dependencies, the plugin), CLAUDE.md (paths, rules, commands), `.env.example`, and the constitution amendment with its sync impact report | PASS |

**Gate result (before research)**: one violation, justified below and resolved by an amendment
that the feature carries as its first task; research proceeded on that basis.

## Project Structure

### Documentation (this feature)

```text
specs/007-agent-mcp-server/
├── spec.md
├── plan.md              # This file
├── research.md          # R1–R20
├── data-model.md        # tables, access levels, approval states, variant ids, links, settings
├── quickstart.md        # automated checks and V1–V13
├── contracts/
│   ├── mcp-tools.md         # the server, 24 tools, results and errors, skills
│   ├── oauth.md             # metadata, registration, consent, tokens, bearer access
│   ├── management-api.md    # who may call what, search, agent access, approvals, variant ids
│   ├── ui-screens.md        # S1–S6: consent, user page, approval page, Copy link, opening links
│   └── guidance.md          # the plugin folder, instructions, skills, the gate
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks, not created here
```

### Source Code (repository root)

```text
package.json, package-lock.json  # the npm workspace: api-types, rules, frontend, mcp; scripts over them; prepare (R1)
eslint.config.mjs, .prettierrc, tsconfig.base.json   # shared tooling; frontend/.prettierrc keeps the Tailwind plugin
.claude-plugin/marketplace.json  # lists mcp/plugin (R16)
.pre-commit-config.yaml          # prettier and eslint hooks from the root, over the four packages
.dockerignore                    # + node_modules/ at the root, mcp/dist/
docker-compose.yml, docker-compose.prod.yml   # + mcp service; dev volumes for api-types/ and rules/

api-types/                       # @connection-portal/api-types (moved from frontend/src/types/)
├── package.json, tsconfig.json  # exports "./*": "./src/*.ts"; lint, typecheck
└── src/api.ts, auth.ts, document-types.ts, form-connections.ts (+ FormConnectionPage, ConnectionUrls),
    option-sets.ts, routing.ts, agent-access.ts, approvals.ts, oauth.ts

rules/                           # @connection-portal/rules (moved from frontend/src/utils/rules/)
├── package.json, tsconfig.json, vitest.config.ts   # lint, test (node), typecheck
└── src/
    ├── branches.ts, tree.ts, validation.ts, conditions.ts, statements.ts, dates.ts, messages.ts,
    │   constants.ts, types.ts, evaluation.ts, testData.ts, and their *.test.ts   # unchanged
    ├── edits.ts (+test)         # new: the editor's actions as pure functions (R8); addVariant assigns ids
    ├── checks/                  # unchanged but for findingMessages.ts (+ resolutionOf()); caseFolding.ts and
    │                            #   fixtures/ stay generated by backend/scripts/export_check_fixtures.py
    └── personas/                # unchanged (worker.ts moved to frontend/src/workers/)

backend/
├── alembic/versions/<rev>_agent_mcp_server.py   # 5 tables, partial unique index, draft branch id backfill
├── scripts/export_check_fixtures.py             # CHECKS_DIR = rules/src/checks
├── app/
│   ├── config.py            # PORTAL_URL, MCP_URL, OAUTH_ISSUER, AGENT_*, APPROVAL_REQUEST_MINUTES
│   ├── models.py            # OauthClient, OauthCode, AgentAuthorization, AgentToken, ApprovalRequest
│   ├── schemas.py           # AccessLevel, FormConnectionPage, AgentAccess*, Token*, AgentMe, Approval*, ConnectionUrls
│   ├── main.py              # include_router ×3; /.well-known/oauth-authorization-server
│   ├── routers/
│   │   ├── oauth.py             # metadata, register, clients/{id}, authorize, token
│   │   ├── agent_access.py      # the user page's endpoints; GET /api/agent/me
│   │   ├── approval_requests.py # create (bearer), get, approve, decline
│   │   └── form_connections.py  # + GET /search; browser-only and level dependencies
│   └── services/
│       ├── auth.py              # Principal, get_current_principal, require_level, require_browser_session
│       ├── oauth.py             # CIMD fetch and cache, DCR, codes, PKCE, tokens, rotation
│       ├── agent_access.py      # list, change level, revoke, create token, draft limit window
│       ├── approvals.py         # create with preconditions, staleness, approve, decline, cancel_for
│       ├── drafts.py            # check_publishable(), publish_stored_draft(); branch ids
│       ├── rules.py             # client UUIDs for branches in drafts and saves; first_rule_set with the draft's ids
│       ├── form_connections.py  # search_form_connections(); draft limit hook
│       └── worker.py            # sweep codes, tokens, idle connections, unused DCR clients, old requests
└── tests/api/test_oauth.py, test_agent_principal.py, test_agent_access.py,
    test_approval_requests.py, test_form_connection_search.py; + branch id cases in
    test_form_connection_drafts.py; tests/unit/test_oauth_pkce.py

mcp/                             # @connection-portal/mcp: the MCP server (R1)
├── package.json, tsconfig.json  # the SDK, zod, the two packages; lint, test, build, dev
├── vite.config.ts               # SSR build: src/main.ts + src/checksWorker.ts → dist/; Vitest test block (node)
├── Dockerfile                   # context: repo root; npm ci -w mcp; node dist/main.js
├── src/
│   ├── main.ts                  # http server: /mcp, /.well-known/oauth-protected-resource, /health
│   ├── config.ts                # PORT, BACKEND_URL, PORTAL_URL, MCP_URL
│   ├── backend.ts               # fetch with the bearer; 401/403/409/429 mapping; catalog cache
│   ├── auth.ts                  # GET /api/agent/me per request; 401 with resource_metadata; step-up 403
│   ├── links.ts (+test)         # build and parse links (R11)
│   ├── resolve.ts (+test)       # connection / variant / item by id, link or name; candidates
│   ├── draftEdit.ts (+test)     # the read-apply-save loop over @connection-portal/rules/edits (R8)
│   ├── tools/                   # read.ts, drafts.ts, approvals.ts, checks.ts, guide.ts, access.ts; registry.ts
│   ├── views.ts (+test)         # ItemView, statements, ApplicantField lists
│   ├── findings.ts (+test)      # BranchCheck → agent findings with involves, why, resolution
│   ├── applicants.ts (+test)    # value checks per kind; Applicant from values
│   ├── checksWorker.ts          # node:worker_threads entry over checkBranch()
│   ├── guidance.ts (+guidance.test.ts)   # embedded instructions and skills; the gate
│   └── log.ts
├── test/fakeBackend.ts, server.test.ts   # integration over the SDK's client
└── plugin/                      # .claude-plugin/plugin.json, .mcp.json, README.md, instructions.md, skills/*/SKILL.md

frontend/                        # the SPA; depends on @connection-portal/api-types and /rules
├── package.json, Dockerfile, Dockerfile.dev   # npm ci -w frontend; prepare moved to the root
├── nginx.conf               # /mcp, /.well-known/oauth-protected-resource → mcp; /.well-known/oauth-authorization-server → backend
└── src/
    ├── workers/checks.ts, personas.ts   # the browser Worker entries (moved from rules/checks and rules/personas)
    ├── constants.ts             # ROUTES.authorize, account, approval
    ├── App.tsx                  # the three routes
    ├── api/agent-access.ts, approvals.ts, oauth.ts; form-connections.ts (+ searchFormConnections)
    ├── components/AccessLevelChoice/, UserMenu/ (+ "Your account")
    ├── hooks/useRuleChecks.ts, usePersonas.ts   # Worker URLs → ../workers/; imports → the packages
    ├── pages/
    │   ├── Authorize/               # S1
    │   ├── Account/                 # S2: AgentAccessList, AgentAccessRow, AccessLevelDialog, RevokeDialog, CreateTokenDialog, TokenCreatedDialog
    │   ├── Approval/                # S3: ApprovalSummary per action, ApprovalFindings, ApprovalOutcome, ApprovalUrls
    │   ├── FormConnectionEdit/      # S5: step, variant, item from the search parameters; link notices
    │   └── FormConnectionEditor/RulesStep/   # reducer over edits.ts; keys = ids; "Copy link" in RuleMenu, GroupMenu, BranchMenu; LinkNotice
    └── hooks/useLocalDraft.ts       # branches without ids get them on load

docs/ARCHITECTURE.md, README.md, CLAUDE.md, backend/.env.example, frontend/.env.example,
.specify/memory/constitution.md (amendment 1.2.0)
```

**Structure Decision**: the repository becomes an npm workspace (research R1). The shared
TypeScript, the API types and the rules logic, moves out of the SPA into `api-types/` and
`rules/`, each a package with one owner of its lint, types and tests, imported by name from
`frontend/` and from the new `mcp/`, the MCP server, a backend service in its own container.
The backend keeps its layout, with one router and one service per new resource (OAuth, agent
access, approval requests), as `form_connections.py` does. The SPA keeps its folders, gets three
pages and one shared component, and its rules reducer gives its content logic to
`rules/src/edits.ts`.

## Rules for `/speckit-tasks`

- **Order**:
  1. **The constitution amendment** (v1.2.0: the workspace, the four packages, their gates and
     boundaries, `api-types/` as the mirror), first, so that every later task is compliant.
  2. **The move**, as one task without any change of behaviour: the root files, `api-types/`,
     `rules/`, the Worker entries, the import rewrites, the fixtures script's path, Dockerfiles,
     compose, pre-commit, `.dockerignore`, and the path updates in CLAUDE.md, README and
     ARCHITECTURE; every gate green (`npm run lint && npm test && npm run build` at the root,
     Ruff, mypy, pytest, and `uv run python -m scripts.export_check_fixtures --check`).
  3. **Backend, bottom-up**: settings → models → schemas → migration (with the hand-written
     index and backfill) → `auth.py` (the principal) → `oauth.py` and its router → `rules.py`
     and `drafts.py` (branch ids, `check_publishable`, `publish_stored_draft`) →
     `form_connections.py` (search, browser-only paths) → `agent_access.py` and its router →
     `approvals.py` and its router → `worker.py` → tests per step.
  4. **`rules/src/edits.ts`** with the reducer refactor and the parity test, and
     `resolutionOf()`; the new mirrors in `api-types/`.
  5. **The MCP server**: the package (`package.json`, tsconfig, Vite config with the test block,
     Dockerfile, compose, nginx) → config, backend client, auth → links and resolution → the
     read tools → the draft tools over `draftEdit.ts` → approvals → checks and tests → guidance
     and the plugin → the integration test.
  6. **The SPA**: API modules → `AccessLevelChoice` → consent page → user page and menu entry →
     approval page → "Copy link" and link opening.
  7. **Documentation.**
- **The parity test** (SC-003) comes with `edits.ts`: the rules reducer's existing test cases
  are replayed through `edits.ts`, and the reducer's tests keep passing.
- **The level table test** comes with the principal: every management endpoint × {cookie,
  read, drafts, manage} → the expected status, so FR-003 and FR-018 are one table.
- **The approval tests** cover each action's preconditions, replacement, every staleness
  reason, another account, the failure with the fake EUDIPLO and "Try again", and
  cancellation on revoke and on lowering.
- **Every UI task cites** the screen (S1–S6) and the copy it covers from
  [contracts/ui-screens.md](contracts/ui-screens.md); no Figma frames exist for this feature.
- **Every tool task updates the skill** that describes the tool
  ([contracts/guidance.md](contracts/guidance.md)) in the same task, and `guidance.test.ts`
  comes with the registry.
- **Boundaries hold from the move on**: `rules/` imports `api-types` and itself; `frontend/`
  and `mcp/` never import each other; the root ESLint config enforces it with
  `no-restricted-imports`, landing with the move.
- **Nothing about tokens, codes, applicants, findings or results is logged**: no `console.*` in
  `mcp/src/` except `log.ts`, nothing in `rules/`.
- **The migration is reviewed by hand** (constitution V): autogenerate emits neither the partial
  unique index on `agent_authorizations` nor the backfill.
- **Gates**: every backend task passes Ruff, mypy (`app/ scripts/ tests/`) and pytest; every
  task in a Node package passes `npm run lint`, `npm test` and `npm run build` for the
  workspace (from the root), since a change in `rules/` or `api-types/` must compile in both
  consumers.
- **The last task applies the documentation checklist**: ARCHITECTURE (the workspace and the
  four packages in System Overview and Repository Structure; a section "Agent access and the MCP
  server (spec 007)": the topology, authorization, levels, approvals, links, guidance, the `mcp`
  container; the user page in the frontend section; the new worker steps; the settings; the
  rules and checks sections' paths), README (Project Structure, Quick Start, Common Commands per
  package and from the root, Docker, the variables, the dependencies with reasons, installing the
  plugin, deployment's new nginx locations), CLAUDE.md (the project section's packages; the
  commands from the root; the rules' paths: "the pure rules logic lives in `rules/src/`";
  "`api-types/src/` mirrors `backend/app/schemas.py`"; "every change to the MCP tools updates
  the skills in `mcp/plugin/skills/`"; "agents' edits go through `rules/src/edits.ts`, as the
  rules reducer does"; "approval requests run the existing services, never a second path";
  "only `frontend/src/workers/` and the hooks touch browser APIs"), the `.env.example` files, and
  the plugin's README.

## Constitution Check: after Phase 1 design

- **API contracts** ([contracts/management-api.md](contracts/management-api.md),
  [contracts/oauth.md](contracts/oauth.md), [contracts/mcp-tools.md](contracts/mcp-tools.md)):
  every shape the frontend or the MCP server reads has its mirror in `api-types/`; errors keep
  the `{error, message}` envelope, with the OAuth endpoints' RFC bodies and the well-known
  documents as the documented exceptions (I, once amended). `/api/connect/` is untouched
  (FR-041).
- **Data model** ([data-model.md](data-model.md)): one migration, reviewed, with cascades,
  indexes and a partial unique index; secrets stored as hashes only; no new column on existing
  tables (V).
- **Database access**: approvals, the token endpoint and the draft limit lock rows with
  `with_for_update()` and hold no transaction over EUDIPLO or a metadata fetch (II).
- **The packages** ([research R1](research.md#r1-where-the-code-lives-an-npm-workspace-with-four-packages)):
  pure modules with tests in `node`, one owner per package, one lockfile, boundaries enforced
  by ESLint, no `any`, no `require()` (III and IV, once amended); the MCP server adds two pinned
  runtime dependencies with reasons.
- **UI** ([contracts/ui-screens.md](contracts/ui-screens.md)): reuses `ConfirmDialog`,
  `TextField`, `PageTitle`, `ErrorNoticeText`, `LinkCard`, the summaries and the menus, with
  every list item as a sub-component, `useReducer` for the dialogs' state (structure).

**Gate result (after design)**: PASS with the one justified violation, resolved by the
amendment that the first task delivers.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| An npm workspace with a root `package.json`, four Node packages (`api-types/`, `rules/`, `frontend/`, `mcp/`), the API types and the rules logic out of `frontend/src/`, and a second Node service in its own container; the constitution fixes the stack as "React SPA + FastAPI", scopes Node tooling to `frontend/`, forbids a root `package.json` and prescribes the SPA's `src/` folders | The spec's binding decision 2: the agents' tools must reuse the editor's TypeScript rules logic so that there is one implementation; that logic runs only in Node or a browser; an MCP server is a backend service, which belongs beside `backend/`; and code with two consumers belongs to neither, so it becomes a package, which the workspace links without copying, with one lockfile | A Python port of the rules logic: a second implementation of propagation, which the spec rules out. The server inside `frontend/`: a backend service under the SPA's tooling. A top-level `mcp/` importing `../frontend/src/utils/rules/` by relative path: ownership stays with the SPA while another package compiles it, held only by a lint rule. `file:` links without a root: three lockfiles and installs that drift (R1) |

**Proposed amendment** (constitution 1.1.0 → 1.2.0, MINOR; delivered by the feature's first
task with its sync impact report):
- **Technology and Structure Constraints**: the repository is an npm workspace with a root
  `package.json` whose only contents are the workspaces, scripts over them and the pre-commit
  `prepare`; the Node packages are `api-types/` (the TypeScript mirrors of
  `backend/app/schemas.py`), `rules/` (the pure rules logic), `frontend/` (the SPA) and `mcp/`
  (the MCP server, Node 22+, Vite SSR build, its own container). `api-types` imports nothing,
  `rules` imports `api-types`, `frontend` and `mcp` import both and never each other. The
  packages are consumed as source through their `exports`; nothing is emitted. One lockfile,
  one root ESLint and Prettier configuration with a block per package, `tsconfig.base.json`.
- **Principle I**: the mirror of the Pydantic schemas is `api-types/src/`, changed in the same
  change set as `schemas.py`.
- **Principle III**: the gates are `npm run lint`, `npm test` and `npm run build` for the
  workspace; Vitest runs in `node` in `rules/` (`rules/vitest.config.ts`), `frontend/` and
  `mcp/` (the `test` block of their `vite.config.ts`; a `vitest.config.ts` MUST NOT be added
  beside a `vite.config.ts`); the pre-commit hooks run from the root over the four packages.
- **The layout section** lists the four packages, `frontend/src/workers/` for the browser
  Worker entries, and that `frontend/src/` no longer holds `types/` or `utils/rules/`.
