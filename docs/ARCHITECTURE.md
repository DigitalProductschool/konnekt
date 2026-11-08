# Architecture Documentation

## System Overview

Three applications, built and deployed as containers of one stack: a React SPA, a
FastAPI service with a PostgreSQL database, and the MCP server through which the team
members' LLM agents work. The backend also runs a background worker thread, and talks to
EUDIPLO, which handles the citizens' wallets. The Node code is one npm workspace (see
[Repository Structure](#repository-structure)); the backend manages its own
dependencies with uv.

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│    Frontend     │────▶│  Backend (FastAPI)   │────▶│   PostgreSQL    │
│  (React/Vite)   │     │  + worker thread     │     │   (Database)    │
└─────────────────┘     └──────────┬───────────┘     └─────────────────┘
                          ▲        │ management API (HTTPS, OAuth token)
┌─────────────────┐       │        ▼
│   MCP server    │───────┘  ┌──────────────────────┐
│ (Node, mcp/)    │ bearer   │  EUDIPLO (tenant     │◀──── citizens' EUDI wallets
└────────▲────────┘          │  dps, hosted)        │      (OpenID4VP)
         │ MCP (Streamable   └──────────────────────┘
         │ HTTP, OAuth 2.1)
   LLM agents on the team members' machines
```

Types are **not** shared with the backend at build time. The interfaces in
`api-types/src/` mirror the Pydantic schemas in `backend/app/schemas.py` by hand — when
you change one, change the other. The SPA and the MCP server import them by name.

This repository is being turned into the serviceBW ↔ EUDI Wallet middleware. Its
target architecture, with form connections, document requests and an nginx
allow-list, is in
[the plan](../specs/001-servicebw-eudi-middleware/plan.md). This document
describes what is implemented so far: the data model, DO.IT sign-in, form
connections with their EUDIPLO configurations, editing, deactivating and deleting
them, serviceBW's trigger and pull URLs, the worker steps, the nginx allow-list for
the connection URLs, and the management UI. serviceBW gets results only by pulling:
webhook mode was dropped from the scope on 2026-10-19.

Spec 002 ([plan](../specs/002-connection-rules/plan.md)) adds **rules** to a form
connection: conditions on the requested fields, combined with AND or OR in groups
and sub-groups, in **branches** ("variants" in the UI) that each get a pull URL of
their own. A pull hands serviceBW the documents together with the **evaluation** of
the called branch's rules. See [Rules and branches](#rules-and-branches-spec-002).

Spec 003 ([plan](../specs/003-rule-consistency-checks/plan.md)) adds **rule
consistency checks**: while the team member edits, the Rules step points out rules and
groups that conflict, repeat or cover each other, are always met, or make a variant
that no citizen can meet. They run only in the browser and never reach the server.
See [Rule consistency checks](#rule-consistency-checks-spec-003).

Spec 007 ([plan](../specs/007-agent-mcp-server/plan.md)) lets team members connect **LLM
agents** through an MCP server: the agents find and read connections, build drafts one change
at a time with the editor's own logic, run the rule checks and test fictitious citizens, and
ask for the team member's **approval** to publish or delete a draft or to deactivate,
reactivate or delete a live connection. See
[Agent access and the MCP server](#agent-access-and-the-mcp-server-spec-007).

### Data Flow

1. User interacts with the React frontend
2. Frontend calls the backend API through `apiFetch` in `frontend/src/api/client.ts`,
   which sends the `session` cookie and sends every write as JSON
3. FastAPI checks the sign-in session (`get_current_user`, or `get_current_principal`
   where an agent's bearer token is accepted too) and, for `POST`, `PUT` and `DELETE`, the
   JSON content type (`require_json`), then validates the body against a Pydantic schema
4. The route handler calls the domain logic in `app/services/`, which queries via
   a SQLAlchemy `Session` injected by `Depends(get_db)` and, where needed, calls
   EUDIPLO
5. psycopg 3 communicates with PostgreSQL
6. Response flows back in the `{data, message?}` envelope: Database → SQLAlchemy →
   FastAPI → Frontend → User

## Repository Structure

```
dps-react-python-template/
├── package.json           # npm workspace root: api-types, rules, frontend, mcp; scripts over them
├── package-lock.json      # One lockfile for every Node package
├── eslint.config.mjs      # ESLint 9 flat config, one block per package
├── tsconfig.base.json     # Compiler options every package extends
├── .prettierrc            # Prettier formatting rules
├── api-types/             # @connection-portal/api-types: the TypeScript mirrors of the schemas
├── rules/                 # @connection-portal/rules: the pure rules logic, checks/ and personas/
├── frontend/              # React SPA (Vite), depends on api-types and rules
│   └── .prettierrc        # The root's rules plus the Tailwind plugin
├── mcp/                   # @connection-portal/mcp: the MCP server, depends on api-types and rules
│   └── plugin/            # Guidance for agents: instructions, skills, the Claude Code plugin
├── backend/               # FastAPI API (SQLAlchemy + Alembic)
├── docs/                  # Architecture, EUDIPLO, KERN and Figma workflow docs
├── specs/                 # Feature specification, plan, contracts and tasks (Spec Kit)
├── .claude-plugin/
│   └── marketplace.json   # The Claude Code marketplace that lists mcp/plugin
├── .pre-commit-config.yaml # Git hook definitions (both stacks)
├── .dockerignore          # Applies to every image build (context is the repo root)
├── docker-compose.yml     # Local development
└── docker-compose.prod.yml # Production and previews (Coolify)
```

The Node code is one npm workspace with four packages, `api-types/`, `rules/`, `frontend/`
and `mcp/`, while the backend uses Ruff and mypy. `npm install` at the root installs every
package's dependencies into the root `node_modules/` and links the two shared packages
there, so that the frontend and the MCP server import them by name
(`@connection-portal/api-types/<name>`, `@connection-portal/rules/<path>`). `api-types` and
`rules` export their TypeScript source (`"./*": "./src/*.ts"`) and build nothing; Vite
compiles them into the frontend, and Vite's SSR build bundles them into the MCP server's
`mcp/dist/`. `rules/` imports only `api-types` and itself, `api-types` nothing, neither
imports `frontend/` or `mcp/`, and `frontend/` and `mcp/` never import each other
(`no-restricted-imports` in the root `eslint.config.mjs`). The root scripts `lint`, `test`,
`build` (every package's `typecheck`, then every `build`), `format` and `format:check` run
each package's script of that name.

Git hooks are repository-wide: they are defined in the root `.pre-commit-config.yaml` and
cover both stacks, running `ruff check --fix` and `ruff format` on Python files and, from
the root, `prettier --write` and `eslint --fix` on `api-types/`, `rules/`, `frontend/` and
`mcp/` files, plus the trailing-whitespace, merge-conflict and large-file checks.

The hooks are installed by the root `package.json`'s `prepare` script, which runs
`uv run pre-commit install` in `backend/` — so `npm install` at the root is what wires
up the backend's hooks. `pre-commit` itself is a `dev` dependency in
`backend/pyproject.toml` and lives in `backend/.venv`, which is why the `prepare` script
has to `cd` there. The script ends in `|| exit 0` so a machine without `uv` can still
install frontend dependencies; on such a machine the hooks are silently absent and have to
be installed manually later.

mypy is intentionally not a hook — it is too slow for a commit, so run
`uv run mypy app/ scripts/ tests/` yourself before pushing backend changes. See the `Code Quality`
section of `README.md` for the full command list and editor format-on-save setup.

## Application Details

### frontend

**Tech Stack**: React 19, Vite 8, Tailwind CSS 4, TypeScript, React Router 7, KERN design system

```
frontend/
├── src/
│   ├── api/              # client.ts (apiFetch, ApiError), one module per resource: auth.ts,
│   │                     # document-types.ts, form-connections.ts, option-sets.ts; spec 007:
│   │                     # agent-access.ts, approvals.ts, oauth.ts
│   ├── assets/           # From the Figma design: icons/ (SVG glyphs), illustrations/
│   ├── components/       # App shell (AppLayout, TopBar, UserMenu, PageTitle), the wizard's
│   │                     # frame (WizardLayout), the signed-out screens' frame (AuthLayout),
│   │                     # route guards, sign-in state provider, dialogs, shared form pieces,
│   │                     # and the read-only rules display that the Rules step and the
│   │                     # details share: RuleRow, GroupFrame, Connector, BranchMark,
│   │                     # BranchName; FindingNote, the note under a rule or group with a
│   │                     # finding of the rule checks; LocalDraftsOffer (spec 005);
│   │                     # AccessLevelChoice, the three access levels as radio buttons (spec 007)
│   ├── hooks/            # useCurrentUser (sign-in state), useDocumentTitle, useDocumentTypes,
│   │                     # useOptionSets, useFormConnection, useSignOutOnUnauthorized,
│   │                     # useRuleChecks (the rule checks' run and their worker),
│   │                     # useLocalDraftStore, useLocalDraft, useLocalDrafts (spec 005)
│   ├── pages/            # One folder per screen: Login, ForgotPassword, FormConnectionList
│   │                     # (overview), FirstConnection, FormConnectionEditor (the wizard,
│   │                     # with RulesStep/ and RulesStep/RuleEditor/), FormConnectionEdit,
│   │                     # FormConnectionDetail; spec 007: Authorize (the consent page),
│   │                     # Account (the user page), Approval (an approval request)
│   ├── utils/            # Shared helpers: documentGlyphs.ts (a document type's icon),
│   │                     # menuNavigation.ts (arrow keys in menus), popupPlacement.ts
│   │                     # (the side a popup opens to); localDrafts/: the local drafts'
│   │                     # pure modules (spec 005)
│   ├── workers/          # The browser Worker entries: checks.ts (the rule checks) and
│   │                     # personas.ts (the test personas)
│   ├── constants.ts      # App name, routes, the wizard's steps, the KERN kit's English texts
│   ├── App.tsx           # Routes
│   ├── main.tsx          # Entry point: router, KERN context, sign-in state
│   └── index.css         # Tailwind, KERN, and the project's design tokens
├── vite.config.ts        # Vite configuration, and Vitest's `test` block (node environment)
├── nginx.conf            # Serves the production build, proxies /api to the backend and
│                         # /mcp to the MCP server
└── package.json
```

**Key Decisions**:
- Vite for fast HMR and optimized builds
- Tailwind 4 with `@theme` directive for design tokens
- Self-hosted fonts for GDPR compliance: KERN's Fira Sans files from `@kern-ux/native`
- Native fetch for API calls (no axios dependency). `apiFetch` in `src/api/client.ts`
  sends the session cookie (`credentials: 'include'`), sends every `POST`, `PUT` and
  `DELETE` as JSON (`{}` without a body), unwraps the `data` of the `{data, message?}`
  envelope and throws an `ApiError` for `{error, message}` bodies
- Routing with React Router 7 (`BrowserRouter`). `RequireSignIn` sends signed-out
  users to `/login` and back to the requested route afterwards, and `RequireSignedOut`
  sends signed-in users on from `/login` and `/forgot-password`. A sign-in without a
  requested route, where `/` counts as none, goes to `/get-started`, which opens the
  create wizard while no form connection exists and the overview otherwise (FR-022);
  the logo still leads to the overview. `/form-connections/:id/edit` opens the same
  wizard, filled in with the connection; for a draft (spec 005), the create flow at the
  draft's stored step. The create routes carry the flow's local draft in `?local=` (see
  [Local drafts](#local-drafts-spec-005)). nginx already falls back to `index.html` for
  client-side routes. Passwords are reset with the account CLI, so `/forgot-password`
  only says whom to ask
- Sign-in state lives in `CurrentUserProvider`, which asks `GET /api/auth/me` once;
  components read it with `useCurrentUser()`
- **Layouts**: signed-in screens render inside `RequireSignIn` and `AppLayout`, whose top
  bar is sticky. The create wizard (`/form-connections/new`, and `/get-started` through
  `pages/FirstConnection/`), editing (`/form-connections/:id/edit`, through
  `pages/FormConnectionEdit/`) and the details (`/form-connections/:id`, the wizard's last
  screen in Figma) render their own `WizardLayout` instead, in every state, loading and
  errors included: a header with a title, a 1120 px column and an action bar. It fills the
  window and scrolls only the step between header and action bar; from the `split:` variant
  (`index.css`: 1024 px wide, 640 px tall) its `head` (progress and page title) stays put
  too. In windows under 480 px tall (`[@media(height<30rem)]`) the whole frame scrolls with
  the window instead, so that the step stays reachable at 400 % zoom (WCAG 1.4.10, spec 005
  FR-028). Modal dialogs and toasts render in its `overlay`, outside the scrolling area. The
  signed-out screens (`/login`, `/forgot-password`) render inside `RequireSignedOut` and
  `AuthLayout`
- **Titles**: every page sets its tab title with `useDocumentTitle()` and has one `h1`:
  `PageTitle` on signed-in screens, except the loaded details, whose header title is the
  `h1` (`titleAsHeading`), and the intro's headline in `AuthLayout` on signed-out ones
- **Popups**: menus, popovers and tooltips open to the side where they fit.
  `placementFrom()` in `src/utils/popupPlacement.ts`, called in the event that opens them,
  picks `start`, `end` or `full` (across the rules card or the page, below the control);
  the component maps it to a set of Tailwind classes, and the wrapper takes
  `popupWrapperClass()`. A fixed-width popup anchored with `left-0` or `right-0` alone runs
  off the screen at 320 px and 200 % zoom
- KERN design system: `index.css` imports Tailwind, KERN's fonts, `kern.css` and the
  KERN Tailwind theme, in that order. The React kit's own stylesheet is not imported,
  because it bundles an older KERN whose rules override KERN 2.8 (`docs/KERN-DESIGN-SYSTEM.md`
  §2). `index.css` also keeps KERN's adaptive type at its small-screen values on every
  width, as the Figma design uses it, and shows the focus ring of KERN's buttons and
  checkboxes for keyboard focus only (`kern.css` draws it on any `:focus`, so also after a
  click; `docs/KERN-DESIGN-SYSTEM.md` §7). Its `@theme` adds the tokens KERN lacks: the
  shadows (`shadow-card`, `shadow-menu`, `shadow-chip`, `shadow-toast`) and the variant
  marks' `variant-changed` and `variant-new` colours (spec 002). With the KERN Tailwind
  theme, numeric utilities are pixels (`p-16` is 16px)
- Light only, as the Figma design has no dark variant: `index.html` pins KERN's light
  theme with `data-kern-theme="light"` on `<html>`, which `kern.css` would otherwise
  switch to dark with the browser's preference, and `index.css` sets
  `color-scheme: only light` for the browser's own controls and against Chromium's auto
  dark theme (`docs/KERN-DESIGN-SYSTEM.md` §7)
- The visual design comes from Figma; `specs/001-servicebw-eudi-middleware/design-notes.md`
  records the screens, tokens and decisions, and `specs/002-connection-rules/design-notes.md`
  those of the rules. Figma is out of step with spec 002, so its
  `contracts/ui-screens.md` lists the decided deviations (F1–F32, W1–W9) that the UI builds
  instead
- The wizard has four steps, Connection, Documents, Rules and Publish (`CONNECTION_STEPS`
  in `src/constants.ts`), in create and in edit; once a rule exists, the Test step (spec 004)
  stands between Rules and Publish. The editor's reducer keeps the connection
  and its documents, the Rules step's own reducer the branches, the open tab, select mode
  and its dialogs, and the rule editor a third one. Nothing reaches the API before Publish
  or Save, or, in the create flow, "Save and exit", which stores the work as a draft (see
  [Form connections](#form-connections)); until then the work lives in the page's state and,
  in the create flow, in its local draft (see [Local drafts](#local-drafts-spec-005)). The
  details open the edit wizard at a step through the router state `EditLocationState.step`
  (`'connection'`, `'documents'` or `'rules'`)
- **Vitest** tests the pure logic in Node, without a DOM: the modules of `rules/src/`
  and the sibling `utils.ts` of components, each with its `*.test.ts` beside it. `npm test`
  is a gate (constitution III), because the rules' propagation between branches runs only
  in the browser. In `frontend/` it is configured in the `test` block of `vite.config.ts`,
  which a `vitest.config.ts` would silently replace; `rules/`, which has no Vite build, has
  its own `rules/vitest.config.ts`
- The **rule checks** (spec 003) run in the browser, in a module Web Worker that the
  editor page starts through `useRuleChecks()`; Vite builds the worker into a chunk of
  its own. See [Rule consistency checks](#rule-consistency-checks-spec-003)
- **Agent access** (spec 007) adds three signed-in screens in `AppLayout`, each with one
  `h1` (`contracts/ui-screens.md` of the spec, S1 to S3):
  - the **consent page** (`/authorize`, `pages/Authorize/`): an agent's OAuth authorization
    request, read from the query string, which a sign-in round trip keeps. It names the
    client (`GET /api/oauth/clients/{client_id}`), preselects the access level from the
    requested `scope` in `AccessLevelChoice`, says so when the agent asks for more than its
    current level, and sends "Allow" or "Deny" to `POST /api/oauth/authorize`, then follows
    the answer's `redirect_to` to the agent. A bad request is shown on the page, without a
    redirect;
  - the **user page** (`/account`, `pages/Account/`, reached through "Your account" in
    `UserMenu`): the account's agent connections and personal access tokens, with "Change
    access level", "Revoke" and "Create token"; a new token is shown once, in
    `TokenCreatedDialog`;
  - the **approval page** (`/approvals/:id`, `pages/Approval/`): what an approval request
    would do, from `GET /api/approval-requests/{id}`. For `publish` it shows the publish
    step's summary of the stored draft and the findings of the rule checks, computed in the
    page with `useRuleChecks()`; for the other actions the connection and the URLs it
    affects. "Approve" and "Decline" give way to the outcome (done, declined, expired,
    replaced, cancelled with its reason, another team member's request, or a failure with
    "Try again").

  The rules step's menus have **"Copy link"** for a variant, a rule and a group, and
  `FormConnectionEdit` opens a link's `step`, `variant` and `item` search parameters, with
  `LinkNotice` when what it names no longer exists (see
  [Agent access and the MCP server](#agent-access-and-the-mcp-server-spec-007))

### backend

**Tech Stack**: FastAPI, SQLAlchemy 2, Alembic, psycopg 3, Pydantic 2, Python 3.13

```
backend/
├── app/
│   ├── routers/          # APIRouter modules (one per resource): auth.py,
│   │                     # document_types.py, option_sets.py, form_connections.py,
│   │                     # connect.py; spec 007: oauth.py, agent_access.py,
│   │                     # approval_requests.py
│   ├── services/         # Domain logic shared by routers and worker:
│   │                     # auth.py (sign-in), eudiplo.py (EUDIPLO client), dcql.py,
│   │                     # form_connections.py, drafts.py (spec 005: saving,
│   │                     # publishing and deleting drafts), rules.py (branches, rule
│   │                     # sets and their checks), document_requests.py (trigger, pull,
│   │                     # statuses), documents.py (field extraction),
│   │                     # evaluation.py (the rules on the shared documents),
│   │                     # qr.py, worker.py; spec 007: oauth.py (the authorization
│   │                     # server), agent_access.py (the user page, the draft limit),
│   │                     # approvals.py (approval requests)
│   ├── catalog.py        # Document types, their fields, and each field's kind, parts
│   │                     # and multiple_values (whether it can hold several values)
│   ├── option_sets.py    # The value sets of enum fields: countries, sex, licence
│   │                     # classes, eye and hair colours
│   ├── cli.py            # Accounts: create-user, set-password, delete-user; clear-connections
│   ├── config.py         # Settings via pydantic-settings, with the startup check
│   ├── db.py             # Engine, sessionmaker, get_db dependency
│   ├── models.py         # SQLAlchemy models
│   ├── schemas.py        # Pydantic request/response schemas
│   ├── errors.py         # Exception handlers, log_server_error, describe_error
│   └── main.py           # FastAPI app entry point; its lifespan runs the worker,
│                         # and it redacts references in uvicorn's access log
├── alembic/              # Database migrations
├── scripts/              # Developer scripts, not in the production image:
│                         # issue_test_credentials/ issues test documents to a wallet,
│                         # export_check_fixtures.py writes the rule checks' fixtures
├── tests/                # pytest suite: conftest.py, fake_eudiplo.py, helpers.py, api/, unit/
├── .python-version       # Interpreter uv provisions (3.13)
├── pyproject.toml        # Dependencies + ruff/mypy/pytest config
└── uv.lock               # Fully resolved dependency pins
```

**Key Decisions**:
- **Synchronous** SQLAlchemy `Session`, not `AsyncSession`. FastAPI runs sync
  route handlers in a threadpool, which is adequate at this scale and keeps the
  code simpler. Switching to async means changing the driver, the engine, the
  sessionmaker, and every handler together.
- psycopg 3 (`postgresql+psycopg://`) as the driver. `asyncpg` is not installed
  and will not work with the sync engine.
- `pool_pre_ping=True` so stale pooled connections are detected rather than
  surfacing as errors on first query. The pool holds `pool_size=10` connections
  plus `max_overflow=20`, for the request handlers and the worker's calls.
- Dependencies are declared in `pyproject.toml` and pinned in `uv.lock`. Both
  Dockerfiles install with `uv sync --frozen`, so a stale lockfile fails the
  build instead of silently resolving different versions.
- Only libraries the code imports are declared.
- Domain logic lives in `app/services/`, so the routers stay thin and the worker
  reuses the same functions.
- Outside development the backend refuses to start unless `CONNECTION_BASE_URL`
  is set and uses `https://` (or `ALLOW_PLAIN_HTTP=true`): the connection URLs
  that DO.IT copies into serviceBW are built from it.
- Developer scripts live in `scripts/` and run with `uv run python -m scripts.<name>`.
  They aren't in the production image, so they may use `dev` dependencies such as
  Faker, and `app/` never imports them. They may import `app.catalog` and other
  modules without side effects, but not `app.config`, which checks the middleware's
  settings at import. `issue_test_credentials` issues test documents with an EUDIPLO
  client of its own, since the middleware has no issuance role, and prints the fake
  person's data, which the app never does.

### Sign-in (DO.IT team members)

- **Accounts** are rows in `user_accounts` with an Argon2id password hash
  (`argon2-cffi`). Only the command-line tool `app.cli` creates, changes and
  deletes them; the UI has no account management.
- **Sessions** are rows in `login_sessions`. Signing in stores the SHA-256 hash of
  a random token, and the token goes to the browser in the `session` cookie:
  `HttpOnly`, `SameSite=Strict`, `Path=/api`, and `Secure` unless
  `APP_ENV=development`. A session lasts `LOGIN_SESSION_HOURS`; signing out
  deletes the row, and the worker deletes expired ones.
- **Protected routes** depend on `get_current_user`, which answers `401` without a
  valid session, or on `get_current_principal`, which also accepts an agent's bearer token
  (see [Agent access and the MCP server](#agent-access-and-the-mcp-server-spec-007)).
  `/api/health`, the sign-in itself and the OAuth endpoints that the protocol leaves open
  (the metadata, registration and the token endpoint) are open.
- **CSRF**: every `POST`, `PUT` and `DELETE` must be sent as
  `application/json`, or `require_json` answers `415`. A cross-site page can't send
  JSON with cookies without a CORS preflight, which only `CORS_ORIGIN` (development)
  or the app's own origin passes. `SameSite` alone isn't enough, because PR previews
  under the same domain count as the same site.

### EUDIPLO client

`app/services/eudiplo.py` is a synchronous `httpx2.Client` (5 s connect and 10 s
read timeout) for the seven management API calls the middleware uses
(`specs/001-servicebw-eudi-middleware/contracts/eudiplo-usage.md`). It caches the
OAuth token in memory, renews it 5 minutes before it expires, and fetches a new one
once after a `401`. Responses are read into hand-written Pydantic models that ignore
unknown fields. `http_error_for()` turns its errors into the API's answers: `503
Not configured` or `502 Upstream error`, each with a generic message and an
`error_id`. The missing setting or the failed call is named only in the log, under
that ID (see Error Handling). It never logs
tokens, secrets, response bodies or session credentials; a validation error, which
would quote the body, is replaced by a terse one. Tests swap in a client with an
`httpx2.MockTransport` (`tests/fake_eudiplo.py`).

**Transactions around EUDIPLO calls**: no database connection is held while EUDIPLO
answers. A service ends its read transaction before the call and opens a new one
afterwards. If what happens next depends on a row, it locks the row then
(`db.refresh(row, with_for_update=True)`) and checks its state again, because the worker
or another request may have changed it meanwhile: `apply_status()` in
`services/document_requests.py` and the pull do this. A number that must stay unique is
reserved before the call: `create_revision()` inserts the next revision under the row lock
and commits, calls EUDIPLO, then locks again to make it current (see
[Form connections](#form-connections); the rules save joins that last transaction, see
[Rules and branches](#rules-and-branches-spec-002)).

### Form connections

`app/routers/form_connections.py` is the management API
(`specs/001-servicebw-eudi-middleware/contracts/management-api.md`, and for drafts
`specs/005-connection-drafts/contracts/management-api.md`), and
`app/services/form_connections.py` holds its logic, `app/services/drafts.py` that of
drafts:

- **Revisions**: each set of documents is an immutable revision with its own EUDIPLO
  presentation configuration, `fc-<id>-r<n>`. Creating a form connection stores
  revision 1; changing its documents stores the next one, which only requests
  triggered afterwards use. The name and the description create no revision, and
  the connection URLs never change.
- **Creating a revision** (`create_revision`) holds no transaction while EUDIPLO
  answers. Under the form connection's row lock it takes the next number and inserts
  the revision, not yet current; then it creates the configuration; then it locks the
  row again and makes the revision current. Two edits at the same time therefore get
  distinct numbers, and if EUDIPLO fails, the revision is removed again.
- **Drafts** (spec 005; research R1 to R8 in `specs/005-connection-drafts/`, the columns
  in its [data-model.md](../specs/005-connection-drafts/data-model.md)): a row of
  `form_connections` is a draft or a published connection, never both, and a published
  connection never becomes a draft again. A draft has `published_at` null, its content
  (documents, branches and the editor's step; `DRAFT_CONTENT` in `schemas.py`) in the
  JSONB column `draft`, and a `draft_version` that is 1 when created and goes up by one
  with every save. It has no revision, rule set, branch rows or EUDIPLO configuration, so
  `current_revision` and `current_rule_set` are null. Its name is required, its
  description may be `''` like a published connection's, and `is_active` means nothing
  until it is published. The CHECK constraint `ck_form_connections_draft_or_published`
  holds the two states: `published_at`, `current_revision` and `current_rule_set` all
  set and `draft` and `draft_version` null, or the other way round. The migration
  (`d2b97ba4a2c7_connection_drafts`) published every existing row as of its
  `created_at`, and its downgrade deletes the drafts first.
- **The draft endpoints**: `POST /api/form-connections/drafts` stores a new draft,
  `PUT …/{id}/draft` replaces its content and raises its version, `POST …/{id}/publish`
  publishes it, and `DELETE …/{id}/draft` removes it. Only publishing calls EUDIPLO.
  `GET /api/form-connections` lists drafts with the published connections, each with its
  `status`, and `GET …/{id}` answers a draft's content and version, without URLs. The
  refusals, all `409` with the `{error, message}` detail:
  - `draft_changed`: a save or publish with a `version` that another save has since
    raised, unless the body says `replace: true`. The editor offers "Reload" or
    "Replace their changes";
  - `draft_published`: a draft endpoint on a published connection, also with
    `replace`;
  - `not_published`: an endpoint of published connections (`PUT …/{id}`,
    `…/deactivate`, `…/activate`, `DELETE …/{id}`) on a draft. Their reads go through
    `find_published_form_connection()` and `_lock_published_form_connection()`, which
    also narrow `current_revision` and `current_rule_set` to `int`.

  Saving and publishing check the version once before the content is checked, so that a
  stale editor meets the conflict, and again under the row lock.
- **The `complete` switch**: a draft save runs the same validators as publishing with
  `complete=False` (`clean_documents`, `rules.clean_rules`): the structure is checked
  (unknown document types and fields, duplicates, the limits, identifiers, groups,
  marks), the completeness is not (at least one document and field, variant, rule and
  group names being present, unique and not reserved, a rule's data, check and
  message). The connection's name is required in a draft too. `clean_description`
  runs the same way on every path: it trims, allows `''` and refuses more than 500
  code points ("The description can have at most 500 characters."). Publishing a draft
  runs the checks of `POST /api/form-connections` unchanged, with the same messages.
- **Publishing goes through `create_revision()`**, with a `DraftGuard(version,
  replace)` instead of a second save path. The guard is checked under both row locks,
  before the revision is reserved and before it becomes current. Under the last lock,
  `_publish()` makes the reserved revision current, writes rule set 1 and the branch
  rows (`rules.first_rule_set()` with the row's counters), applies the name and the
  description, sets `published_at` and clears `draft` and `draft_version`, in one
  commit. If EUDIPLO fails, the row stays a draft. If the guard refuses under the last
  lock (another publish won, or a save raised the version and this publish has no
  `replace`), the configuration is deleted and the revision removed again.
- **Deleting a draft removes its row**, with any revision that a publish in flight has
  reserved, in one commit, and calls no EUDIPLO; that publish then finds no row, answers
  `404` and deletes its own configuration. Its URLs answer `404` from then on, unlike a
  deleted published connection's.
- **Deactivating and deleting** cancel the open requests in the same transaction,
  and call no EUDIPLO: the worker deletes the sessions and, once no request needs
  them, the configurations. A deleted published form connection keeps its row, so its
  URLs keep answering `409 unavailable`; the management API answers `404` for it.
- **Clearing everything** (`python -m app.cli clear-connections`) deletes the rows of
  every form connection, with its revisions, branches, rule sets and requests. It
  first deletes the EUDIPLO session of every request that
  still has one, and deletes no row unless all of them are gone; a request that
  starts meanwhile stops it too. The configurations stay, as they hold no personal
  data.

### Rules and branches (spec 002)

`app/services/rules.py` saves and checks a form connection's branches and rules,
`app/services/evaluation.py` evaluates them at a pull, and the Rules step edits them
(`frontend/src/pages/FormConnectionEditor/RulesStep/`). The decisions are research R1
to R10 in `specs/002-connection-rules/`, the tables its
[data-model.md](../specs/002-connection-rules/data-model.md).

- **Rule sets**: a form connection's branches and rules are stored as immutable,
  numbered rule sets in `form_connection_rule_sets`, beside the revisions.
  `form_connections.current_rule_set` names the one new requests use, as
  `current_revision` names the documents, and the trigger reads both from the same
  row, so a request keeps the pair that was saved together (`document_requests.rule_set_id`).
  A rule set's `branches` is one JSONB snapshot of every branch that isn't deleted,
  main branch first: name, description, origin (`main`, `based` or `empty`), the top
  level's AND/OR and the tree of rules, groups and sub-groups, two levels deep. The
  Pydantic models in `schemas.py` (`RULE_SET_SNAPSHOT`) validate it on the way in and
  out. A save whose snapshot equals the current one adds no version; requests point to
  the old ones, which stay. Rules don't change what the wallet is asked for, so a
  rules-only save creates no revision and needs no EUDIPLO.
- **Branch identities**: `form_connection_branches` holds each branch's `id`, which its
  pull URL names, `is_main` (one main branch per form connection, a partial unique
  index) and `deleted_at`. Names and rules live in the rule sets, so a rename never
  changes a URL. A save that leaves a branch out marks it deleted, and its pull URL
  answers `409 unavailable` for good. Every form connection has a main branch,
  "Standard" until renamed; the migration gave existing ones a main branch without
  rules, and their requests started before it, without a rule set, are evaluated as
  met.
- **Identifiers**: rules are `rule-{n}`, groups and sub-groups `group-{n}`, numbered from
  the form connection's counters `next_rule_number` and `next_group_number`, which never
  go down. An identifier never changes and is never reused, because serviceBW may key
  on it. The editor numbers new items from the counters it loaded; the server checks
  them and shifts them past numbers another save took meanwhile.
- **Identifiers in a draft** (spec 005, research R4) come from the same counters of the
  draft's row (`number_draft()`: (1, 1) for a new draft, the row's under its lock for a
  save). The editor sends `numbering_base`, the counters it started from. An identifier
  below it counts as loaded and keeps its number; one at or above it is new and moves up
  past the numbers another save took meanwhile, the same way in every variant (a default
  name follows its new number). Each save raises the counters and never lowers them.
  Publishing checks the identifiers against the row's counters (`check_first_save()`)
  and writes rule set 1 with them (`first_rule_set()`), so a rule keeps the identifier
  that a draft save gave it.
- **Variant identifiers in a draft** (spec 007, research R10): every variant of a stored
  draft carries a UUID, although a draft has no branch rows. A draft save may send `null`,
  and the server assigns one (`_clean_branch()`), or a UUID that is unique in the body and
  isn't another connection's branch id (`check_draft_branch_ids()`); anything else is refused
  ("Unknown variant."). Publishing creates the branch rows with the draft's ids
  (`first_rule_set()`), so a variant's link and its pull URL name the same id before and after
  publishing. A save of a published connection may likewise give a new branch a client UUID.
  The migration `60d71d73af6d_agent_mcp_server` gave the variants of existing drafts ids.
- **Marks**: a branch based on the main branch is stored as its full tree, and each
  item carries a mark: none (follows the main branch, a copy of its item), `changed`,
  `removed` (shown, not evaluated) or `added`; `operator_mark` says that the top
  level's AND/OR was switched there. The evaluator, the details and the publish
  summary read the tree as it is, without merging anything. A based group with fewer
  than two active members counts as dissolved there; that is derived from the tree,
  not stored (`effective_items` in `evaluation.py`, and `tree.ts` in the browser).
- **Propagation runs only in the browser**: when the main branch changes in the Rules
  step, `propagateMain` in `rules/src/branches.ts` updates every based
  branch (data-model.md, "Propagation from the main branch"), so the step shows each
  branch's rules at once. The server doesn't propagate: it checks every saved snapshot
  against the invariants that a correct propagation satisfies (every main-branch item
  once in each based branch, unmarked and removed items equal to the main branch's,
  marks only in based branches) and refuses a violation with `400` "The variant … is
  out of step with Standard", so a propagation bug can't reach serviceBW. Vitest pins every
  propagation rule and mark transition in `branches.test.ts`.
- **One implementation of editing**: `rules/src/edits.ts` holds the editor's actions on the
  rules as pure functions (add, change, delete, group and reset items, add and delete
  variants, and so on), the compositions of `branches.ts` and `tree.ts`. The Rules step's
  reducer calls them, and so does every draft-changing tool of the MCP server, so that an
  agent's change stores the same content, marks and identifiers as the editor's. Each takes
  the branches and the counters and answers the new state or a refusal with the editor's
  message; a new variant's id is the caller's (the editor's `crypto.randomUUID()`).
  `edits.test.ts` replays the reducer's cases.
- **Saving**: `POST` and `PUT /api/form-connections` take the rules with the rest, so
  documents, branches and rules change together or not at all. The server checks the
  name and the documents, then the rules against the documents the save leaves current,
  before anything is written or EUDIPLO is called; a refusal is a `400` whose message
  names the problem, the rule and its branch, in the words of the Rules step's own
  checks (`rules/src/validation.ts`). Rules alone are saved in one transaction under
  the form connection's row lock. With changed documents, `create_revision` runs as
  before, and its final locked transaction, which makes the revision current, also
  saves the rule set (`save_rule_set()`). Creating a form connection saves its branch
  rows and rule set 1 in the transaction that inserts it.
- **`409 rules_changed`**: `GET /api/form-connections/{id}` returns `rule_set_version`,
  and the editor sends `rules` only when the team member changed them, with
  `base_version`, the version it loaded. If another save made a newer rule set current,
  the save is refused with `409 rules_changed` (`check_rules_version()`), before the
  rules are checked (so a stale editor meets this answer, not "Unknown variant.") and
  again under the row lock.
  Its message names the variants that replacing would delete or bring back with a new
  result link. The save dialog offers "Reload" or "Replace their changes", which sends
  the same save with `replace: true`: the rule set is the unit, since the server can't
  merge two saves without propagating. The name and the documents keep "the later save
  wins".
- **Kinds and value sets**: the catalog gives each field its kind (text, number, date,
  enum, image, or made of parts), its value set and its parts, such as the place of
  birth's country or a licence class's issue date, and `GET /api/document-types`
  returns them. It also says whether a field or part can hold several values
  (`multiple_values`: the PID's nationalities and the driving licence's classes), which
  the rule checks of spec 003 need; the evaluation treats a single value as a list of one.
  `GET /api/option-sets` (`routers/option_sets.py`, signed in) returns the value sets of
  `app/option_sets.py`, so the menus, the server's checks and the evaluation use the
  same values; licence classes come with their descriptions.
- **Evaluation**: computed at each delivery, from the documents just read from EUDIPLO
  and the called branch as the request's rule set has it (see
  [serviceBW's connection URLs](#servicebws-connection-urls)). It is a pure function
  without database or EUDIPLO. Dates count by **Germany's calendar day** of sharing,
  the date in `Europe/Berlin` (`zoneinfo`, loaded at import, so a missing time zone
  database fails at start-up) of the request's `completed_at`; anniversaries of 29
  February fall on 1 March. Text compares trimmed, NFC-normalised and, ignoring letter
  case, `casefold()`ed. A rule is `met`, `not_met` or `not_checked` (missing or
  unreadable value, which counts as not met). The evaluation is **never stored and
  never logged**: its results and messages are about the citizen, so it goes with
  the documents, and repeated pulls compute it again, the same, since the day of
  sharing is fixed.

### Rule consistency checks (spec 003)

While the team member edits, the Rules step checks each variant's rules and shows its
**findings**: rules and groups that conflict, that are duplicates or covered by others,
or that are always met, and variants that no citizen can meet or that every citizen
meets. The decisions are research R1 to R15 in `specs/003-rule-consistency-checks/`.
The checks have no endpoint, table, setting or dependency of their own.

- **In the browser, in a module Web Worker**: `useRuleChecks()`
  (`frontend/src/hooks/useRuleChecks.ts`), in the editor page
  (`pages/FormConnectionEditor/index.tsx`), builds each branch's checked tree on the main
  thread after every change (`checks/checkedTree.ts` in `rules/src/`, with a fingerprint, so
  an unchanged branch reuses its cached result) and starts a module worker,
  `new Worker(new URL('../workers/checks.ts', import.meta.url), { type: 'module' })`,
  for the others: the shown branch first, then the rest in tab order. The worker
  (`frontend/src/workers/checks.ts`) runs the solver and the findings (`checks/solver.ts`,
  `checks/findings.ts`, the theories per kind) and posts each branch's result as it
  finishes. A change during a run terminates the worker and starts a new one. A run has
  5 seconds from the change; branches it can't finish count as not checked completely,
  and a worker that can't start leaves every branch not checked completely, while
  editing goes on. Vite builds the worker into a
  chunk of its own under `assets/`, so the solver and the case-folding table stay out of
  the main bundle. The run state is the pure reducer of `checks/runState.ts`; the modules
  of `rules/src/checks/` are pure, and only `frontend/src/workers/checks.ts` and the hook
  touch browser APIs.
- **Shown in two places only**: the Rules step (notes under rules and groups through
  `FindingNote`, the findings banner, the variant tab's icon and tooltip, and a polite
  status region, `FindingsAnnouncer`) and the publish and save dialog, which lists the
  variants with findings. Findings never block Publish or Save. Every finding text comes
  from `checks/findingMessages.ts`. The details page never shows them. Spec 007 shows them
  in a third place, the approval page of a publish request, and runs the same checks for
  agents in the MCP server, with `resolutionOf()` in `findingMessages.ts` saying what would
  resolve each finding (see
  [Agent access and the MCP server](#agent-access-and-the-mcp-server-spec-007)).
- **Never stored, sent or logged**: findings exist only in the page's memory. They are
  not part of a save, no request carries them, nothing in `checks/`, the worker or the
  hook writes to the console, and the hook handles the worker's errors so that the
  browser doesn't log them. Nothing changes for serviceBW or the server.
- **The catalog's `multiple_values`**: whether a field or part can hold several values
  comes from `app/catalog.py` through `GET /api/document-types`
  (`api-types/src/document-types.ts` mirrors it), so that a rule set requiring two
  nationalities isn't reported as a conflict.
- **In step with `evaluation.py`**: the checks judge each condition as the evaluator
  does: text trimmed, NFC-normalised and case-folded with Python's `str.casefold()`,
  dates by the evaluator's calendar arithmetic. Two files are generated from the
  interpreter and the evaluator by `backend/scripts/export_check_fixtures.py`:
  `rules/src/checks/caseFolding.ts` (Python's case-folding table, which `checks/text.ts` uses) and
  `rules/src/checks/fixtures/evaluator-vectors.json` (Python's results for text normalisation,
  `years_after()`, `months_after()`, day numbers and rule outcomes), which the Vitest
  tests replay against `checks/text.ts`, `checks/calendar.ts` and the test evaluator. They
  are never edited by hand; after a Python upgrade or a change to the evaluator's
  comparisons, run `uv run python -m scripts.export_check_fixtures` from `backend/` and
  commit the result. Its `--check` writes nothing and fails on stale files, and
  `backend/tests/unit/test_check_fixtures.py` runs it. A brute-force oracle
  (`checks/testOracle.ts`, test-only) checks the solver's answers against an evaluator
  ported from `evaluation.py` (`rules/src/evaluation.ts`, since spec 004 production code
  that the test step shares; see "The test step and the test personas").

### The test step and the test personas (spec 004)

Before publishing, the team member sees how three sample citizens (personas) fare against
each variant's rules. The decisions are research R1 to R16 in
`specs/004-rule-test-personas/`, the shapes in its `contracts/personas.md`. The step has no
endpoint, table, setting or dependency of its own.

- **The step in the wizard**: `pages/FormConnectionEditor/TestStep/`, with no route of its
  own, in the create and the edit wizard. While any variant has a rule, or a rule editor is
  open, the Rules step's button to go on is "Test rules" (`rulesNextActionOf()`), and
  Publish and Save move to the test step; without rules, the Rules and Documents steps
  keep "Publish without rules" ("Save without rules"), which skips the test step. "Test
  rules" first asks about an open rule editor's changes, then goes through the same checks
  as publishing (`passesPreChecks()`): an incomplete condition, a missing message, a rule on
  data that isn't requested, or a variant without a (unique) name is refused where
  publishing would refuse it, in the Rules step. The publish and save dialog, opened from
  the test step, is the unchanged one; its "Check rules again" goes back to the Rules
  step, to the first variant with findings or the one that was open.
- **Generation in a module worker**: `usePersonas()`
  (`hooks/usePersonas.ts`) starts `frontend/src/workers/personas.ts`
  (`new Worker(new URL('../workers/personas.ts', import.meta.url), { type: 'module' })`) with a `generate` message: the checked
  trees, the slots to generate and a deadline. The worker runs `generatePersonas()`
  (`rules/src/personas/generation.ts`: the branches' outcome vectors found with spec 003's solver,
  then values per rule target, research R6 to R8) and posts one `generated` message. The
  run stops searching at `GENERATION_STOP_MS` (4.5 s from the start) and delivers the best
  personas so far; a watchdog fails the run at `GENERATION_WATCHDOG_MS` (5.5 s), and a worker
  that can't start or throws fails it too, with "Try again". A request during a running run is
  merged into it, and an answer for an older run id is ignored. The worker keeps no state, catches nothing and logs
  nothing. Prefixes of the vector search that the solver answers `'unknown'` are dropped after
  `MAX_QUESTIONS_BELOW_UNKNOWN` (14) questions, so that an unsolvable corner can't use up
  the deadline.
- **Evaluation on the main thread**: the personas' results are computed in the page, on
  every change, by `rules/src/evaluation.ts`, the port of `evaluation.py` (spec 003's
  test evaluator promoted to production code, so that the step shows exactly what the real
  evaluation answers). It and the checked trees are loaded by `usePersonas`'s one dynamic
  `import()` of `@connection-portal/rules/personas/results`, so the main bundle doesn't hold them (the step shows
  its loading state meanwhile). The vectors of `export_check_fixtures`, `rule_outcomes` and
  `branch_evaluations` (whole-branch outcomes), pin it to Python.
- **The day**: the test day is today in Germany, from `useTodayInGermany()`
  (`hooks/useTodayInGermany.ts`, read again every minute and when the page becomes visible),
  shown in the test-day line; ages and dates are judged on it.
- **Fill runs and substitution**: the step opening again (after the team member went back to
  the rules) keeps the personas. `opened` marks each persona that lacks a key for a
  field the rules now check as `filled`, and the others `kept`; a fill run generates only
  those slots. An empty value counts as present, and so does a hidden one (a value of a
  field no rule checks any more), so a field that comes back isn't generated again, and a
  field the team member emptied stays empty. For a `filled` slot the worker substitutes the
  persona's fixed values into the checked trees (`personas/substitute.ts`, rule by rule,
  through the evaluator) and plans only what is still free. `runSucceeded` writes the
  absent keys only: a value the persona has is never replaced. A `free` slot ("Generate
  again", "Generate all again") replaces all values, hidden ones too.
- **Lifetime**: the personas are the state of `usePersonas`' reducer
  (`personas/personaState.ts`), in the editor page. They live as long as the page: they
  survive going between the steps, and a reload, leaving the flow or a new create or edit
  flow starts with new ones. Edits (names, values, "Done") are part of that state.
- **Nothing stored or sent**: personas, their values and results are never saved, never in a
  request, and never logged (no `console.*` in `personas/`, its worker, `usePersonas` or
  `useTodayInGermany`). Publishing and saving don't change; serviceBW and the server don't
  know about the personas.

### Local drafts (spec 005)

The create flow keeps its unsaved work in the browser's `localStorage`, so that a closed tab,
a crash or an expired session loses at most the last second. A local draft is not a stored
draft: it never leaves the device by itself, and only "Save and exit" or publishing sends its
content, as the body of that request (see [Form connections](#form-connections)). The
decisions are research R9 to R12 in `specs/005-connection-drafts/`, the shapes in its
`contracts/local-drafts.md`. Local drafts have no endpoint, table, setting or dependency.

- **Key and format**: one entry per flow, under
  `connection-portal:local-draft:v1:<username>:<flowKey>`. The flow key is `new-<uuid>` for a
  connection never saved and `draft-<id>` for a stored draft. The value is a
  `LocalDraftRecord` as JSON, `format: 2`: the flow key, the stored draft's id and the version
  the flow loaded, `changedAt`, the step and the content, which is what "Save and exit" would
  send (name, description, documents, branches with an open rule editor's rule kept,
  `numberingBase` and the counters). Every read validates the record; one that doesn't match
  its key or format is skipped and removed. Records of format 1, which held the form ID
  before spec 006, are removed this way, not converted; the key prefix stays `v1`.
- **Pure modules, one binding hook**: `utils/localDrafts/` is pure: `keys.ts`,
  `format.ts`, `content.ts` and `store.ts`, each with its `*.test.ts`, beside
  `constants.ts` and `types.ts`. The store takes an injected `StorageLike`, which the tests
  fake in memory (`testStorage.ts`).
  `hooks/useLocalDraftStore.ts` is the only code that touches `window.localStorage`: it
  creates the page's one store, inside `try/catch`, and every hook shares it. Every storage
  access in the store is in `try/catch`: blocked, full or missing storage makes local drafts
  silently unavailable, and the flow works without them.
- **The hooks**: `useLocalDraft()` is the editor's autosave, for a new connection and a
  stored draft only, with its decisions in pure helpers of `hooks/utils.ts`
  (`isLocalDraftChange`, `localDraftActionOf`, `writeDelayOf`). A published connection's
  edit flow never reads, writes or offers a local draft, and the edit page removes a
  `draft-<id>` record once that connection loads as published. `useLocalDrafts()` lists
  the account's records for the offers on the overview and the first-connection screen
  (`components/LocalDraftsOffer/`), and refreshes on `storage` events from other tabs.
- **`?local=`**: the create routes (`/form-connections/new`, `/get-started`) name the flow's
  local draft in the search parameter `local` (`LOCAL_DRAFT_PARAM`). A fresh flow writes its
  new key there with `replace`, on the same route, so the wizard stays mounted. A URL whose
  key has a record opens from it; a search parameter survives the sign-in round trip after an
  expired session, which router state doesn't. "Resume" on an offer leads there too. A
  `draft-<id>` key without a record goes to the draft's edit route. On
  `/form-connections/:id/edit`, a draft's local draft that differs from the stored draft
  brings the "Restore" or "Discard" question before the editor mounts; an equal one is
  removed silently.
- **Writing and flushing**: after the first change, while the content differs from what the
  flow started with (the empty flow, or the stored draft as loaded), the record is written at
  once and then at most once per `LOCAL_DRAFT_WRITE_INTERVAL_MS` (1 s), the last change
  always. Mounting writes nothing, and a change back to the starting point removes the
  record; a stored draft's record resumed through `?local=` has no starting point the flow
  knows, so only `forget()` removes it. Pending writes are flushed on `pagehide`, on
  `visibilitychange` to hidden, on unmount or a new flow key, and before the sign-out
  warning (`flushPendingLocalDrafts()`); `localStorage` writes synchronously, so the flush
  completes before the page goes. A successful save or publish, "Reload" and "Open the
  connection" call `forget()`, which removes the record. If another tab removes the record
  while this flow holds unsaved work, the flow writes it again at once.
- **Expiry, account and sign-out**: a record without a change for 30 days
  (`LOCAL_DRAFT_MAX_AGE_MS`) is removed when the account's records are listed or read.
  Records belong to the signed-in username: the flow writes and the offers list only that
  account's. "Log out" in `UserMenu` flushes, lists the account's records and, if there are
  any, warns; confirming removes them (`store.removeAll()`) and closes the account
  (`store.close()`), so that an editor's flush on unmount can't bring one back until the
  account signs in again (`reopen()` in `useLocalDraftStore`). An expired session (a `401`)
  keeps them.
- **Known limit** (research R11): another tab of the same account, in which the team member
  goes on editing after logging out elsewhere, writes its record again until its next API
  call signs it out. The record is then offered at the next sign-in.
- **Never personas, findings or citizen data**: a record holds the connection's set-up only,
  not the open variant tab, the rule editor's position, personas or findings. Nothing in
  `utils/localDrafts/` or its hooks logs (no `console.*`) or calls the API.

### Agent access and the MCP server (spec 007)

Team members connect LLM agents on their own machines (Claude Code, Cursor, Codex) to the
middleware through an MCP server, give each one an access level, and approve what it may not do
alone. The decisions are research R1 to R20 in `specs/007-agent-mcp-server/`, the tables and
states its [data-model.md](../specs/007-agent-mcp-server/data-model.md), the shapes its
`contracts/` (`mcp-tools.md`, `oauth.md`, `management-api.md`, `ui-screens.md`,
`guidance.md`).

- **Topology** (research R2, R3): `mcp/` is a Node service, `@connection-portal/mcp`, in a
  container of its own (`mcp`, port 3100). It has no database: every tool call goes to the
  backend's management API at `BACKEND_URL`, with the agent's own bearer token. In production,
  nginx is the only public entry and has three locations for agents:

  | Location | Goes to | What |
  |---|---|---|
  | `= /mcp` | `mcp:3100` | The MCP endpoint, every method, unbuffered, with a 600 s read timeout (a stream may stay open while a tool waits for an approval) |
  | `^~ /.well-known/oauth-protected-resource` | `mcp:3100` | The protected resource metadata (RFC 9728), in the root and the path form (`…/oauth-protected-resource/mcp`) |
  | `= /.well-known/oauth-authorization-server` | `backend:3000` | The authorization server metadata (RFC 8414) |

  The OAuth endpoints themselves live under `/api/oauth/`, which `/api/` already forwards, and
  the consent page is the SPA's `/authorize`. In development there is no nginx: the MCP server
  listens on `http://localhost:3100` (`/mcp`, its metadata and `/health`), the backend on 3000,
  the SPA on 5173. The MCP endpoint serves protocol 2026-07-28 statelessly and 2025-era clients
  (2025-11-25, 2025-06-18, 2025-03-26) in sessions (`Mcp-Session-Id`) that live in memory, are
  bound to the SHA-256 of the bearer that opened them and close after 30 idle minutes, so the
  server runs as **one replica**. The SDK is `@modelcontextprotocol/server` 2.4.0 with
  `@modelcontextprotocol/node` 2.1.2 and `zod` 4, pinned to exact versions.
- **The backend is the OAuth 2.1 authorization server** (research R4; `routers/oauth.py`,
  `services/oauth.py`, the metadata in `main.py`), the MCP server the protected resource. A
  client identifies itself with a Client ID Metadata Document (an `https://` `client_id` the
  backend fetches and caches for 24 hours) or, as a fallback, by dynamic registration
  (`POST /api/oauth/register`, no secret). The authorization endpoint is
  `{PORTAL_URL}/authorize`, the consent page, which calls `POST /api/oauth/authorize` with the
  cookie; the code lives 5 minutes, PKCE is `S256` only, and every token is bound to the
  resource `MCP_URL`. `POST /api/oauth/token` issues access tokens (`cp_at_`,
  `AGENT_ACCESS_TOKEN_MINUTES`) and refresh tokens (`cp_rt_`, `AGENT_CONNECTION_IDLE_DAYS`),
  rotated at every use; a retired refresh token used again revokes the agent connection.
  Personal access tokens (`cp_pat_`, research R6) are created on the user page, with an expiry
  of at most `AGENT_TOKEN_MAX_DAYS`, for clients without browser sign-in. The tables
  (`oauth_clients`, `oauth_codes`, `agent_authorizations`, `agent_tokens`) hold the SHA-256 of
  every code and token, never the secret. The OAuth endpoints answer RFC 6749 and RFC 7591
  bodies, not the `{data}` envelope (constitution, Principle I).
- **The bearer principal** (research R5; `services/auth.py`): `get_current_principal` reads an
  `Authorization: Bearer` header (an unexpired access or personal access token) or, without
  one, the cookie session, and answers a `Principal { user, authorization }`, whose
  `authorization` is `None` for the browser. It touches the authorization's `last_used_at` at
  most once a minute. `require_level('drafts')` refuses a bearer below that level with
  `403 insufficient_access` and `needs_access_level`; `require_browser_session` refuses every
  bearer with `403 browser_only` ("This action is done in Konnekt."), on the
  endpoints that agents reach only through approval requests, `PUT /api/form-connections/{id}`,
  the user page's and the approval page's endpoints and `/api/auth/*`. `get_current_user` stays
  the cookie-only dependency. The table of who may call what is in the spec's
  `contracts/management-api.md`. `/api/connect/` is unchanged.
- **Three access levels**, one value per agent connection or token (`access_level`), each
  including the one before:

  | Level | UI name | Allows |
  |---|---|---|
  | `read` | Read only | Every read, `check_rules`, `test_applicants`, `get_guide` |
  | `drafts` | Read and edit drafts | Also every change to a draft, and approval requests to publish or delete a draft |
  | `manage` | Read, edit drafts and manage live connections | Also approval requests to deactivate, reactivate or delete a published connection |

  No level changes a published connection's content. The level is read from the row at every
  call, so a change on the user page applies from the agent's next call; tokens carry none.
  The MCP server asks `GET /api/agent/me` once per request and refuses a tool above the level
  before any work, with a message that names the level; the backend's check is the safety
  net. The tool `request_access(level)` answers the MCP request with HTTP `403` and
  `WWW-Authenticate: Bearer error="insufficient_scope"`, on which the client runs the
  authorization again and the consent page preselects that level (step-up).
- **The user page's endpoints** (research R7; `routers/agent_access.py`,
  `services/agent_access.py`, browser only): `GET /api/agent-access` lists the account's agent
  connections and tokens, `PUT …/{id}` changes a level, `DELETE …/{id}` revokes,
  `POST /api/agent-access/tokens` creates a personal access token and answers it once.
  Revoking and lowering a level cancel the authorization's waiting approval requests first
  (`revoked`, `access_changed`). An agent principal may create `AGENT_DRAFTS_PER_HOUR` drafts in
  a fixed one-hour window kept on its authorization (research R17); the next answers `429
  rate_limited` with the time it may again, in Germany's time. Saves don't count, and browser
  sessions aren't limited.
- **Search** (research R9): `GET /api/form-connections/search?q=&status=&cursor=` answers a page
  of at most 25 connections (`limit`) that aren't deleted, matched on name and description, newest change
  first, with a keyset cursor (`search_form_connections()`).
- **Approval requests** (research R12; `routers/approval_requests.py`, `services/approvals.py`,
  the table `approval_requests`): an agent asks with `POST /api/approval-requests` for one of
  `publish`, `delete_draft` (level `drafts`), `deactivate`, `reactivate` or `delete` (level
  `manage`). The action's preconditions are checked without writing (for `publish`,
  `drafts.check_publishable()`: publishing's checks with publishing's messages), a waiting
  request for the same connection and action becomes `replaced` under the row lock, and the new
  one is `waiting` for `APPROVAL_REQUEST_MINUTES`, with a snapshot of what it was made for (the
  draft's version, or the connection's `is_active`) and the agent's name as `requested_by`. Its
  link is `{PORTAL_URL}/approvals/{id}`. States:

  ```text
  waiting ──approve ok──▶ done
          ──approve fails (EUDIPLO)──▶ waiting, with failed_at and error_id ("Try again")
          ──decline──▶ declined
          ──a newer request, same connection and action──▶ replaced
          ──revoke / lower the agent's level──▶ cancelled (revoked, access_changed; stored)
          ──expires_at passes──▶ expired (computed)
          ──the connection moved on, or the agent's access ended──▶ cancelled (computed)
  ```

  Staleness is computed at every read and again under the row lock at approval, never written
  by the save paths: a draft whose version moved, that was published or deleted, a connection
  whose `is_active` moved or that was deleted, or an authorization that is gone (the row keeps
  `authorization_id` null) reads as `cancelled` with its reason. Approving
  (`POST …/{id}/approve`) and declining are for the browser session of the request's team
  member only (`403 not_yours` for another). **Approving runs the existing services, never a
  second path**: `drafts.publish_stored_draft()`, which publishes the stored draft through
  `create_revision()` with its `DraftGuard`, `drafts.delete_draft()`, and
  `form_connections.deactivate_form_connection()`, `activate_form_connection()` and
  `delete_form_connection()` with the request's snapshot as `expected_active`. An
  `EudiploError` leaves the request waiting with the failure's `error_id`. The tool
  `request_approval` returns the link at once and, for a client that declared URL-mode
  elicitation, also asks the client to open it; `check_approval` reads the outcome. A request
  that ended or expired is deleted by the worker a day later.
- **Variant identifiers and links** (research R10, R11): every variant has a UUID from the
  moment it is added, drafts included (see [Rules and branches](#rules-and-branches-spec-002)),
  so links name the same thing before and after publishing:

  ```text
  connection:  {PORTAL_URL}/form-connections/{connectionId}
  variant:     {PORTAL_URL}/form-connections/{connectionId}/edit?step=rules&variant={variantId}
  item:        …&variant={variantId}&item={rule-n | group-n}
  approval:    {PORTAL_URL}/approvals/{requestId}
  ```

  A link holds no name and no content. The MCP server builds them from `PORTAL_URL`
  (`mcp/src/links.ts`) and accepts them, an id or a name wherever a tool takes a connection,
  variant or item (`mcp/src/resolve.ts`); a link of another origin is refused. The browser
  builds them from `window.location.origin` ("Copy link" in the rules step), and
  `FormConnectionEdit` opens them.
- **Editing by agents** (research R8): every draft-changing tool runs the read-apply-save loop
  of `mcp/src/draftEdit.ts`: read the connection, refuse a published one, apply one change with
  `rules/src/edits.ts` (see [Rules and branches](#rules-and-branches-spec-002)) to the draft
  as stored, and save the whole content with the version read; on `409 draft_changed` the
  change is applied again to the newer draft, up to 3 attempts. Nothing is kept between calls.
  What the editor's forms limit, the tools check on their input: a target is resolved against
  the catalog (`mcp/src/resolve.ts`), and a condition's operator must be one of the data's
  kind, as the rule editor's check menu offers only those (`mcp/src/tools/items.ts`, with the
  field's operators in the refusal). A rule's new data keeps or drops its condition through
  `withTarget()` in `rules/src/conditions.ts`, which the rule editor uses too; a tool that
  drops one says so in its answer.
- **Checks and tests for agents** (research R14, R15): `check_rules` builds each variant's
  checked tree as the editor does and runs `checkBranch()` in a `node:worker_threads` worker
  (`mcp/src/checksWorker.ts`, built to `dist/checksWorker.js` beside `dist/main.js`) with the
  editor's budgets from `rules/src/checks/constants.ts`; a variant that doesn't finish comes
  back as not checked completely. Run from the sources (`npm run dev`, Vitest), the checks run
  on the main thread with the same deadline. Each finding carries the items involved, why it
  holds and `resolutionOf()`'s text. `test_applicants` checks each fictitious citizen's
  values against the variant's persona fields (`mcp/src/applicants.ts`) and evaluates them with
  `rules/src/evaluation.ts`, on today in Germany or a given day. Findings, citizens and
  results are never stored, sent on or logged.
- **Guidance from one source** (research R16; the spec's `contracts/guidance.md`):
  `mcp/plugin/` holds the server instructions (`instructions.md`), the eight skills
  (`skills/<topic>/SKILL.md`) and the Claude Code plugin's `.claude-plugin/plugin.json` and
  `.mcp.json`; the repository's `.claude-plugin/marketplace.json` lists it. `mcp/src/guidance.ts`
  embeds the files at build time (`import.meta.glob` with `?raw`, which is why development
  runs through `vite-node`) and serves them three ways: as the instructions every client gets
  when it connects, through the protocol's Skills extension (`skills/list`, `skills/get`,
  `skill://<topic>/SKILL.md`), and through the `get_guide` tool. The production image has no
  `plugin/` folder: the skills are in the bundle. `mcp/src/guidance.test.ts` is the gate: every
  registered tool appears in a skill, every skill has its frontmatter, the instructions name
  the levels and actions, so `npm test` fails when a tool changes without its guidance.
- **Logging** (research R18): the MCP server logs one JSON line per request (method, tool,
  status, duration) and fixed error descriptions, only through `mcp/src/log.ts` (`no-console`
  everywhere else in `mcp/`, and in `rules/src/` and `api-types/src/`), never arguments,
  results, tokens or claims. The client chooses the method and the tool name, so the line
  shows `other` for a method that isn't a method name's shape and `unknown` for a tool the
  server doesn't have. The backend logs ids and counts only, never a token, code, client
  metadata, citizen, finding or rule content; the token endpoint's refusals are logged as
  their error code. The OAuth endpoints read no query, so both access logs, uvicorn's
  (`redact_references()` in `app/main.py`) and nginx's (`$redacted_request_uri`), show
  `/api/oauth/…?<redacted>` in place of any query sent there.

### Background worker

`app/services/worker.py` runs a daemon thread, started and stopped by the FastAPI
lifespan when `WORKER_ENABLED` is true. Every 2 seconds it runs the registered
steps, which are plain functions that open their own `SessionLocal()` sessions and
keep transactions short. A failing step is logged by exception type and code
location only, never its message, and the next step still runs. Outbound calls go
to a pool of 8 threads through `dispatch(key, call)`, so the loop never waits for
them, and a key that is still in flight isn't dispatched twice. A key is a name plus
an internal id, never a request reference. A step is a plain function without
arguments in the `STEPS` tuple, in the order below. Tests set `WORKER_ENABLED=false`
and call the steps directly.

Implemented steps, in the order of research R7 in the spec folder, then those of
agents' access (spec 007), which log counts and ids only:

1. **Sync**: one `GET /api/session` per page of sessions updated since the cursor,
   which is the latest `updatedAt` seen less 5 seconds. It applies each outcome to
   its pending request and ignores sessions it doesn't know, such as those of other
   environments in the shared tenant. The cursor lives in memory; after a start it
   begins at the oldest pending request. Without a pending request, EUDIPLO isn't
   called.
2. **Expire**: the last check of each pending request past its `expires_at`, in
   the pool. An answer given in time still counts; otherwise the request becomes
   `expired`.
3. **Cancel**: the open requests of deactivated or deleted form connections become
   `unavailable`. Deactivating and deleting already do this; the step catches a
   request that a trigger inserted afterwards.
4. **Delete EUDIPLO sessions**, with any documents in them: after any final status
   other than `completed`, when a pull's 60-second repeat window ends, and for
   documents never delivered 30 minutes less a minute after the citizen shared. A
   `404` counts as deleted; another failure is tried again in the next cycle.
5. **Re-sync configurations**, once after each start: a published form connection
   whose current configuration, built again with the current trust list, request
   lifetime and catalog, has a different hash gets a new revision with the same
   documents. Drafts are skipped, in the step's query and in `resync_config()`: nothing
   is set up with EUDIPLO for a draft (spec 005). The checks run in the pool, and a
   failed one is tried again in the next cycle.
6. **Delete unused EUDIPLO configurations**: those of revisions that a later one
   replaced, or whose form connection was deleted, once no request on them still
   has an EUDIPLO session. A `404` counts as deleted. A revision that a draft's publish
   in flight has reserved is never one of them, since a draft's `current_revision` is
   null.
7. **Delete expired sign-in sessions.**
8. **Delete request records** `REQUEST_RECORD_RETENTION_SECONDS` after the request
   ended.
9. **Delete expired authorization codes**, used or not, after their 5 minutes.
10. **Delete expired agent tokens**: access tokens past their expiry, and refresh tokens
    past theirs or replaced more than a day ago (until then, a replaced one used again still
    finds its row and revokes its agent connection).
11. **Delete idle agent connections**: an agent connection without an unexpired, unreplaced
    refresh token can't be renewed, because it was unused for `AGENT_CONNECTION_IDLE_DAYS`.
    Its tokens go with it; its waiting approval requests then read as cancelled.
12. **Delete expired personal access tokens**, past the expiry chosen at creation.
13. **Delete unused OAuth clients**: dynamically registered clients older than an hour that
    no agent connection or authorization code uses. Clients of metadata documents stay, as
    their cache.
14. **Delete old approval requests** a day after they ended or expired; their approval page
    then answers `404`.

Steps 11 to 13 lock the rows they delete (`skip_locked`) and check their conditions again
in the deleting statement, so that, for example, a consent that renews an agent connection at
the same moment keeps it.

The production image runs one uvicorn process, so there is one worker thread; row
locks keep the steps correct if that changes.

### serviceBW's connection URLs

`app/routers/connect.py` serves the URLs that serviceBW calls
(`specs/001-servicebw-eudi-middleware/contracts/integration-api.md`, and for the
branches and the evaluation `specs/002-connection-rules/contracts/integration-api.md`),
and `app/services/document_requests.py` holds their logic:

- **Drafts** (spec 005, research R8): a draft's URLs answer `409 unavailable`, exactly
  as a deactivated connection's, so serviceBW can't tell them apart, and the check comes
  before anything reads a revision (`_usable_form_connection()`). A deleted draft has no
  row, so its URLs answer `404`. Neither calls EUDIPLO.
- **Trigger**, `POST /api/connect/{id}/requests`: creates a EUDIPLO request
  (`POST /api/verifier/offer`) on the form connection's current revision, and
  answers with the same-device wallet link, a QR code of the link for another
  device (`segno`, PNG data URI), an unguessable reference and the expiry time.
  EUDIPLO knows the request only by its internal id. The request also records the
  current rule set. One trigger URL serves every branch.
- **Pull**, `GET /api/connect/{id}/requests/{reference}`: the main branch's pull URL.
  The status and, once the request is completed, the documents, reduced to exactly
  the configured fields (`services/documents.py`), with the `evaluation` of the main
  branch's rules. They are read from EUDIPLO at the time of the pull and never
  stored. The first pull that returns them counts as the delivery, and pulls within
  the next 60 seconds get them again. A pending request past its expiry gets its
  last check from the pull itself.
- **A branch's pull**, `GET /api/connect/{id}/branches/{branch_id}/requests/{reference}`:
  the pull URL of every other branch, with the same status and documents and that
  branch's evaluation. The delivery belongs to the request, not the branch: the first
  delivery through any pull URL starts the repeat window for all of them. Its checks
  run in this order:
  1. unknown form connection, or a deleted draft: `404`;
  2. deactivated or deleted form connection, or a draft: `409 unavailable`;
  3. unknown branch, another form connection's, or the main branch (whose pull URL is
     the one above): `404`;
  4. deleted branch: `409 unavailable`, for good;
  5. unknown reference, or another form connection's: `404`;
  6. a branch that the request's rule set doesn't have, because it was added after the
     trigger: `409 branch_added_later`, without status or documents;
  7. otherwise the status, the documents and the branch's evaluation.
- **The evaluation** (`evaluation` in the pull answer: the branch, `met`, a result per
  rule and group, and the messages for the citizen) is `null` whenever `documents` is,
  and contains no field value. `_deliver` computes it after extracting the documents
  and before it counts the delivery, so if it fails, the pull answers `500` with an
  `error_id`, nothing is consumed and serviceBW can pull again.
- **No sign-in**: the network restricts these URLs instead. The production nginx
  forwards `/api/connect/` only from `SERVICEBW_ALLOWED_CIDRS` and answers `403` to
  everyone else (see [Production Deployment](#production-deployment-coolify)).
- **References stay out of the logs**: a filter on uvicorn's access logger and
  nginx's access log format show `/requests/<reference>` instead, also on a branch's
  pull URL (a test pins it), nginx logs only critical errors for `/api/connect/`, and
  the engine hides the parameters of SQL errors (`hide_parameters=True`). Neither the
  documents nor the evaluation are logged.
- **Status changes** lock the request row and check the status again
  (`apply_status`), so that of a pull and the worker, only the first change takes
  effect. No transaction is held while EUDIPLO answers: a pull reads the documents
  first and then re-checks under the lock before it counts the delivery.

## Patterns

### API Response Format

**Success responses**:
```json
{
  "data": { ... },
  "message": "Optional success message"
}
```

**Error responses**:
```json
{
  "error": "Error type",
  "message": "Human-readable error description",
  "error_id": "UUID, on 5xx answers only"
}
```

A `5xx` answer never describes its cause: no setting, component or exception text
reaches the client. Its message is generic, and `error_id` names the log line that
holds the details. The UI shows the ID, so that a user can pass it on to an
administrator, who finds the line with `docker compose logs backend | grep <id>`.

### Error Handling

**Backend**: `register_exception_handlers` in `backend/app/errors.py` installs three
handlers on the app:

| Exception | Status | Behaviour |
|-----------|--------|-----------|
| `HTTPException` | as raised | Passes a `{error, message}` dict detail (and its `error_id`) through unchanged; otherwise wraps it |
| `RequestValidationError` | **400** | Returns a generic message (FastAPI's default would be 422 with field details) |
| `Exception` | 500 | Generic message and an `error_id`, in every environment; the log line under that ID has the method, the route's template and the error's type and code location |

```python
# Route handler pattern — raise, don't catch
raise HTTPException(
    status_code=404,
    detail={"error": "Not found", "message": "Form connection not found"},
)
```

`log_server_error(error, description)` in the same module creates the `error_id`
of a `5xx` answer: it logs one ERROR line, `Error <id>: <description> (<type> in
<function> (<file>:<line>))`, and returns the ID. `http_error_for()` and the
catch-all handler use it, and so should any other `5xx` answer. The line never
holds an exception's message, a setting's value, a request reference or the URL:
it uses `describe_error()` and the route's template. The app configures no logging
of its own, so these lines reach stderr through Python's last-resort handler,
without a time or level prefix. `errors.py` imports nothing from the app, so that
the services and the worker can all import `describe_error()` and
`log_server_error()` from it without an import cycle.

**`APP_ENV` must be set to something other than `development` in production**:
development drops the session cookie's `Secure` flag and fills in a default
`CONNECTION_BASE_URL`.

**Frontend**: the `ApiError` class in `src/api/client.ts` wraps HTTP errors with
status and response data. `errorNoticeOf(error, fallback)` turns a failure into
what a page shows, the API's message and `error_id` (an `ErrorNotice`), and the
shared `ErrorNoticeText` renders it, the error ID on a line of its own. A page passes
failures through `useSignOutOnUnauthorized()` first: a `401` means the session
expired, so the app signs out and the route guard asks for a sign-in that returns to
the page.

```typescript
class ApiError extends Error {
  constructor(status: number, data: ApiErrorResponse) {
    super(data.message);
    this.name = 'ApiError';
  }
}
```

### Database Conventions

- Primary keys: UUID4 as a `String(36)`, generated in Python. `app/models.py`
  declares the shared columns once, as the annotated types `UuidPk`, `CreatedAt`
  and `UpdatedAt`
- Timestamps: `created_at` / `updated_at`, both `DateTime(timezone=True)` with `server_default=func.now()`
- Column and table names: `snake_case` (`published_at`, `form_connections`)
- Unique constraints: `unique=True` on `mapped_column`
- Optional fields: `Mapped[str | None]`, which SQLAlchemy maps to a nullable column
- Indexes on every column used for lookups, plus partial indexes
  (`Index(..., postgresql_where=...)`) for the worker's scans
- Migrations are generated with `alembic revision --autogenerate` and must be
  reviewed before committing — autogenerate does not detect every change.
  `alembic/env.py` imports `app.models`, because autogenerate only sees imported
  models

The tables and their rules are described in
[data-model.md](../specs/001-servicebw-eudi-middleware/data-model.md), and those of
the rules and branches in
[spec 002's data-model.md](../specs/002-connection-rules/data-model.md), and the drafts
in [spec 005's data-model.md](../specs/005-connection-drafts/data-model.md), and agents'
access and approval requests in
[spec 007's data-model.md](../specs/007-agent-mcp-server/data-model.md). A rule set's
tree and a draft's content are one JSONB column each, since they are always read and
written whole. Autogenerate emits no CHECK constraint, partial unique index or backfill, so
the drafts migration and spec 007's migration (`uq_agent_authorizations_oauth_client`, the
variant ids in drafts) add them by hand. No table holds a citizen's documents, an
evaluation, a finding, a test citizen or a token's secret.

## Environment Variables

### Backend

Defined as fields on `Settings` in `backend/app/config.py`. A variable not
declared there is ignored (`extra='ignore'`).

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string, must use `postgresql+psycopg://` | `postgresql+psycopg://postgres:postgres@localhost:5432/template_db` |
| `PORT` | Server port | `3000` |
| `CORS_ORIGIN` | Allowed frontend origin (single origin) | `http://localhost:5173` |
| `APP_ENV` | Set to `production` outside development | `development` |
| `CONNECTION_BASE_URL` | Base URL that serviceBW uses to reach the middleware; the connection URLs are built from it | `http://localhost:3000` in development; required elsewhere, with `https://` unless `ALLOW_PLAIN_HTTP=true` |
| `EUDIPLO_URL` | EUDIPLO base URL, without `/api` | empty (EUDIPLO calls answer `503`) |
| `EUDIPLO_CLIENT_ID` / `EUDIPLO_CLIENT_SECRET` | API client with `presentation:request` + `presentation:manage`, no allow-list | empty (`503`) |
| `EUDIPLO_TRUST_LIST_ID` | Trust list used for issuer trust in every credential query | empty (saving a form connection answers `503`) |
| `REQUEST_LIFETIME_SECONDS` | Expiry of a document request | `600` |
| `DOCUMENT_RETENTION_SECONDS` | Longest time shared documents stay in EUDIPLO | `1800` |
| `PULL_REPEAT_WINDOW_SECONDS` | How long repeated pulls return the same documents | `60` |
| `REQUEST_RECORD_RETENTION_SECONDS` | How long a request record is kept after the request ended | `604800` |
| `ALLOW_PLAIN_HTTP` | Allows `http://` for `CONNECTION_BASE_URL` outside development (closed networks only) | `false` |
| `WORKER_ENABLED` | Runs the background worker thread | `true` |
| `LOGIN_SESSION_HOURS` | How long a DO.IT sign-in lasts | `8` |
| `PORTAL_URL` | Public origin of the management interface: links and the OAuth authorization endpoint (`{PORTAL_URL}/authorize`) are built from it | `http://localhost:5173` in development; `CONNECTION_BASE_URL` otherwise |
| `MCP_URL` | Public URL of the MCP endpoint, the resource indicator every agent token is bound to | `http://localhost:3100/mcp` in development; `{CONNECTION_BASE_URL}/mcp` otherwise |
| `OAUTH_ISSUER` | Issuer of the OAuth authorization server | `CONNECTION_BASE_URL` |
| `AGENT_ACCESS_TOKEN_MINUTES` | Lifetime of an agent's access token | `60` |
| `AGENT_CONNECTION_IDLE_DAYS` | Lifetime of a refresh token: an agent connection unused this long ends | `30` |
| `AGENT_TOKEN_MAX_DAYS` | Longest expiry of a personal access token | `90` |
| `APPROVAL_REQUEST_MINUTES` | How long an approval link is valid | `10` |
| `AGENT_DRAFTS_PER_HOUR` | Drafts one agent connection or token may create per hour | `20` |

The three URLs are resolved by `resolve_agent_urls`, after the check of
`CONNECTION_BASE_URL`; trailing slashes are removed. In the Coolify setup all three live on
the one public domain, so `docker-compose.prod.yml` sets them from `CONNECTION_BASE_URL`.

The developer script `scripts/issue_test_credentials` reads `EUDIPLO_URL`,
`EUDIPLO_TRUST_LIST_ID` and its own issuer client, `EUDIPLO_ISSUER_CLIENT_ID` and
`EUDIPLO_ISSUER_CLIENT_SECRET` (roles `issuance:manage` + `issuance:offer`), from the same
`.env` with a settings class of its own. `Settings` doesn't declare the issuer client: the
middleware has no issuance role (research R2).

### MCP server

Read once at start by `mcp/src/config.ts`. Outside production (`NODE_ENV` not `production`)
the URLs have development defaults; in production a missing one stops the server with a log
line that names the variable. A value that isn't a URL, or a `PORT` that isn't a port number,
stops it in any environment. Trailing slashes are removed.

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Port the server listens on | `3100` |
| `BACKEND_URL` | The backend's internal address, which every tool call goes to | `http://localhost:3000` (compose: `http://backend:3000`) |
| `PORTAL_URL` | Public origin of the management interface, which links are built from; the backend's `PORTAL_URL` | `http://localhost:5173` |
| `MCP_URL` | Public URL of the MCP endpoint, the `resource` of its protected resource metadata; the backend's `MCP_URL` | `http://localhost:3100/mcp` |
| `OAUTH_ISSUER` | The authorization server its metadata names; the backend's `OAUTH_ISSUER` | `http://localhost:3000` |

`PORTAL_URL`, `MCP_URL` and `OAUTH_ISSUER` must match the backend's, since tokens are bound to
`MCP_URL` and links must open the right Konnekt installation. `mcp/.env.example` lists them; the
compose files pass them as `environment:`, and `npm run dev -w mcp` reads them from the shell.

### Frontend

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API base URL (local development only; unset in production, where the app calls the relative `/api` path) | `/api` |

`VITE_API_URL` is inlined by Vite at build time. The production image does not
set it, so the bundle calls its own origin and nginx forwards the request — the
same image works for any domain, which is what makes preview deployments
possible.

### Frontend container (production nginx)

Read at container start, not at build time, so one image serves every environment.

| Variable | Description | Default |
|----------|-------------|---------|
| `BACKEND_HOST` | Host name of the backend, which nginx forwards `/api/` to; rendered into `nginx.conf` by the image's envsubst templating | `backend` |
| `SERVICEBW_ALLOWED_CIDRS` | Comma-separated address ranges that may call `/api/connect/` | empty: `/api/connect/` answers `403` to everyone |
| `TRUSTED_PROXY_CIDRS` | Comma-separated address ranges of the proxy in front of nginx (Traefik), whose `X-Forwarded-For` gives the client's address | empty: the connecting address counts |
| `MCP_HOST` | Host name of the MCP server, which nginx forwards `/mcp` and `/.well-known/oauth-protected-resource` to; rendered like `BACKEND_HOST` | `mcp` (`${SERVICE_NAME_MCP}` in Coolify) |

`frontend/nginx/40-servicebw-access.sh`, which the nginx image runs from
`/docker-entrypoint.d/`, writes the two lists into `/etc/nginx/servicebw-allow.conf`
(`allow` rules, then `deny all`) and `/etc/nginx/real-ip.conf` (`set_real_ip_from`,
`real_ip_header X-Forwarded-For`, `real_ip_recursive on`). An entry with anything
but an address or a range stops the container.

## Docker Development

The `docker-compose.yml` orchestrates four services:

1. **postgres**: PostgreSQL 18 (`postgres:18-alpine`) with health checks, published on host port **5435**
2. **backend**: FastAPI via uvicorn `--reload`, depends on postgres, exposes port 3000
3. **frontend**: Vite dev server, depends on backend, exposes port 5173
4. **mcp**: the MCP server through `vite-node` (`mcp/Dockerfile.dev`, `npm run dev -w mcp`),
   depends on backend, exposes port 3100, with `BACKEND_URL=http://backend:3000` and the
   development URLs; it mounts `mcp/src/`, `mcp/plugin/`, `api-types/` and `rules/`.
   `vite-node` doesn't watch, so a change to the sources or the skills takes effect when the
   container restarts (`docker compose restart mcp`)

Every image builds with the repository root as context, so the root
`.dockerignore` is the only one Docker reads. Volumes enable hot reload by
mounting source directories. The backend container runs
`alembic upgrade head` on start, and reads `backend/.env` through `env_file`
when it exists (it holds the EUDIPLO credentials); the values under
`environment:` in the compose file take precedence.

## Production Deployment (Coolify)

Production uses `docker-compose.prod.yml`, deployed as a **single Coolify
resource**. The topology differs from local dev in one important way: the
frontend's nginx is the only publicly reachable service and acts as the API
gateway.

```
                 https://my-team.dpschool.app
                            │
                            ▼
                 ┌──────────────────────────┐
                 │  frontend (nginx)        │
                 │  /      → SPA files      │
                 │  /api/connect/* → proxy, │
                 │    allow-listed only     │
                 │  /api/* → proxy ─────────┼───▶ backend:3000 ───▶ postgres:5432
                 │  /.well-known/oauth-     │      (internal)        (internal)
                 │   authorization-server ──┼───▶ backend:3000
                 │  /mcp, /.well-known/     │          ▲   │
                 │   oauth-protected-       │          │   └──▶ EUDIPLO (outbound HTTPS)
                 │   resource → proxy ──────┼───▶ mcp:3100
                 └──────────────────────────┘      (internal; calls the backend
                                                    at BACKEND_URL)
```

Consequences of this design:

- The backend needs `CONNECTION_BASE_URL` (an `https://` URL) and the four
  `EUDIPLO_*` variables in the Coolify environment; it refuses to start without
  `CONNECTION_BASE_URL`. Previews need it too, because they also run with
  `APP_ENV=production`
- The MCP server is public at `https://<domain>/mcp`, through the same nginx. The compose
  file derives `PORTAL_URL`, `MCP_URL` and `OAUTH_ISSUER` of the backend and the `mcp`
  service from `CONNECTION_BASE_URL`, and the `mcp` service runs with `NODE_ENV=production`,
  so a missing URL stops it. It reaches the backend at
  `http://${SERVICE_NAME_BACKEND}:3000`, and nginx reaches it through `MCP_HOST`
  (`${SERVICE_NAME_MCP}`). It runs as one replica, since 2025-era MCP sessions live in its
  memory; its health check is `GET /health`. A preview has its own MCP endpoint on its own
  domain
- The UI must be served over HTTPS (Coolify's Traefik): the session cookie is
  `Secure` outside development
- This nginx is the only public entry point, so it also restricts serviceBW's
  connection URLs: `/api/connect/` is forwarded only from `SERVICEBW_ALLOWED_CIDRS`,
  with the client's address taken from `X-Forwarded-For` when the request comes from
  `TRUSTED_PROXY_CIDRS` (Traefik). Every deployment of the image, previews
  included, is closed until the list is set. Its access log shows
  `/requests/<reference>` instead of the reference

- The production frontend bundle is built **without** `VITE_API_URL`; it calls
  the relative `/api` path on its own origin
- CORS never triggers in production (same origin); the backend's `CORS_ORIGIN`
  setting only matters for local dev, where Vite (5173) calls the backend
  (3000) cross-origin
- Backend and postgres publish no host ports and have no domains — they are
  reachable only on the compose network
- `SERVICE_PASSWORD_POSTGRES`, `SERVICE_FQDN_FRONTEND` and `SERVICE_NAME_*` in
  the compose file are Coolify magic variables, generated per environment —
  including per preview deployment, so each PR preview gets its own
  credentials and domain
- Preview deployments rename compose services (`postgres` → `postgres-pr-<id>`),
  so services must not hardcode each other's hostnames: the backend reaches the
  database via `${SERVICE_NAME_POSTGRES}` and nginx reaches the backend via the
  `BACKEND_HOST` env var (`${SERVICE_NAME_BACKEND}`), rendered into
  `nginx.conf` at container start by the nginx image's envsubst templating
- Database data lives in the `postgres-data` named volume; Coolify suffixes it
  per PR, so previews get isolated, empty databases (schema is created by the
  migration run on backend startup)

See the Deployment section of `README.md` for the setup steps and the
tradeoffs of running PostgreSQL inside the compose stack.
