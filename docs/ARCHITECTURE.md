# Architecture Documentation

## System Overview

Two independently built and deployed applications — a React SPA and a FastAPI
service — sharing a PostgreSQL database. There is no monorepo tooling and no
root `package.json`; each side manages its own dependencies. The backend also
runs a background worker thread, and talks to EUDIPLO, which handles the
citizens' wallets.

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│    Frontend     │────▶│  Backend (FastAPI)   │────▶│   PostgreSQL    │
│  (React/Vite)   │     │  + worker thread     │     │   (Database)    │
└─────────────────┘     └──────────┬───────────┘     └─────────────────┘
                                   │ management API (HTTPS, OAuth token)
                                   ▼
                        ┌──────────────────────┐
                        │  EUDIPLO (tenant     │◀──── citizens' EUDI wallets
                        │  dps, hosted)        │      (OpenID4VP)
                        └──────────────────────┘
```

Types are **not** shared at build time. The interfaces in `frontend/src/types/`
mirror the Pydantic schemas in `backend/app/schemas.py` by hand — when you
change one, change the other.

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

### Data Flow

1. User interacts with the React frontend
2. Frontend calls the backend API through `apiFetch` in `frontend/src/api/client.ts`,
   which sends the `session` cookie and sends every write as JSON
3. FastAPI checks the sign-in session (`get_current_user`) and, for `POST`, `PUT`
   and `DELETE`, the JSON content type (`require_json`), then validates the body
   against a Pydantic schema
4. The route handler calls the domain logic in `app/services/`, which queries via
   a SQLAlchemy `Session` injected by `Depends(get_db)` and, where needed, calls
   EUDIPLO
5. psycopg 3 communicates with PostgreSQL
6. Response flows back in the `{data, message?}` envelope: Database → SQLAlchemy →
   FastAPI → Frontend → User

## Repository Structure

```
dps-react-python-template/
├── frontend/              # React SPA (Vite)
│   ├── eslint.config.mjs  # ESLint 9 flat config
│   └── .prettierrc        # Prettier formatting rules
├── backend/               # FastAPI API (SQLAlchemy + Alembic)
├── docs/                  # Architecture, EUDIPLO and KERN docs
├── specs/                 # Feature specification, plan, contracts and tasks (Spec Kit)
├── .pre-commit-config.yaml # Git hook definitions (both stacks)
├── .dockerignore          # Applies to both image builds (context is the repo root)
└── docker-compose.yml     # Local development
```

Node tooling is scoped to `frontend/` — there is no root `package.json` — while the
backend uses Ruff and mypy. Git hooks, however, are repository-wide: they are defined in
the root `.pre-commit-config.yaml` and cover both stacks, running `ruff check --fix` and
`ruff format` on Python files and `prettier --write` and `eslint --fix` on `frontend/`
files, plus the usual whitespace and merge-conflict checks.

The hooks are installed by `frontend/package.json`'s `prepare` script, which runs
`uv run pre-commit install` in `backend/` — so `npm install` in the frontend is what wires
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
│   │                     # document-types.ts, form-connections.ts, option-sets.ts
│   ├── assets/           # From the Figma design: icons/ (SVG glyphs), illustrations/
│   ├── components/       # App shell (AppLayout, TopBar, UserMenu, PageTitle), the wizard's
│   │                     # frame (WizardLayout), the signed-out screens' frame (AuthLayout),
│   │                     # route guards, sign-in state provider, dialogs, shared form pieces,
│   │                     # and the read-only rules display that the Rules step and the
│   │                     # details share: RuleRow, GroupFrame, Connector, BranchMark,
│   │                     # BranchName
│   ├── hooks/            # useCurrentUser (sign-in state), useDocumentTitle, useDocumentTypes,
│   │                     # useOptionSets, useFormConnection, useSignOutOnUnauthorized
│   ├── pages/            # One folder per screen: Login, ForgotPassword, FormConnectionList
│   │                     # (overview), FirstConnection, FormConnectionEditor (the wizard,
│   │                     # with RulesStep/ and RulesStep/RuleEditor/), FormConnectionEdit,
│   │                     # FormConnectionDetail
│   ├── types/            # TypeScript interfaces mirroring backend schemas
│   ├── utils/            # Shared helpers: documentGlyphs.ts (a document type's icon),
│   │                     # menuNavigation.ts (arrow keys in menus), popupPlacement.ts
│   │                     # (the side a popup opens to), and rules/: the pure rules logic,
│   │                     # each module with its *.test.ts
│   ├── constants.ts      # App name, routes, the wizard's steps, the KERN kit's English texts
│   ├── App.tsx           # Routes
│   ├── main.tsx          # Entry point: router, KERN context, sign-in state
│   └── index.css         # Tailwind, KERN, and the project's design tokens
├── vite.config.ts        # Vite configuration, and Vitest's `test` block (node environment)
├── nginx.conf            # Serves the production build, proxies /api to the backend
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
  wizard, filled in with the connection. nginx already falls back to `index.html` for
  client-side routes. Passwords are reset with the account CLI, so `/forgot-password`
  only says whom to ask
- Sign-in state lives in `CurrentUserProvider`, which asks `GET /api/auth/me` once;
  components read it with `useCurrentUser()`
- KERN design system: `index.css` imports Tailwind, KERN's fonts, `kern.css` and the
  KERN Tailwind theme, in that order. The React kit's own stylesheet is not imported,
  because it bundles an older KERN whose rules override KERN 2.8 (`docs/KERN-DESIGN-SYSTEM.md`
  §2). `index.css` also keeps KERN's adaptive type at its small-screen values on every
  width, as the Figma design uses it, adds the shadow tokens KERN lacks, and shows the
  focus ring of KERN's buttons for keyboard focus only (`kern.css` draws it on any
  `:focus`, so also after a click; `docs/KERN-DESIGN-SYSTEM.md` §7)
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
  in `src/constants.ts`), in create and in edit. The editor's reducer keeps the connection
  and its documents, the Rules step's own reducer the branches, the open tab, select mode
  and its dialogs, and the rule editor a third one; nothing reaches the API before Publish
  or Save. The details open the edit wizard at a step through the router state
  `EditLocationState.step` (`'connection'`, `'documents'` or `'rules'`)
- **Vitest** tests the pure logic in Node, without a DOM: the modules of
  `src/utils/rules/` and the sibling `utils.ts` of components, each with its `*.test.ts`
  beside it. `npm test` is a gate (constitution III), because the rules' propagation
  between branches runs only in the browser. It is configured in the `test` block of
  `vite.config.ts`; a `vitest.config.ts` would silently replace that block

### backend

**Tech Stack**: FastAPI, SQLAlchemy 2, Alembic, psycopg 3, Pydantic 2, Python 3.13

```
backend/
├── app/
│   ├── routers/          # APIRouter modules (one per resource): auth.py,
│   │                     # document_types.py, option_sets.py, form_connections.py,
│   │                     # connect.py
│   ├── services/         # Domain logic shared by routers and worker:
│   │                     # auth.py (sign-in), eudiplo.py (EUDIPLO client), dcql.py,
│   │                     # form_connections.py, rules.py (branches, rule sets and
│   │                     # their checks), document_requests.py (trigger, pull,
│   │                     # statuses), documents.py (field extraction),
│   │                     # evaluation.py (the rules on the shared documents),
│   │                     # qr.py, worker.py
│   ├── catalog.py        # Document types, their fields, and each field's kind and parts
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
│                         # issue_test_credentials/ issues test documents to a wallet
├── tests/                # pytest suite: conftest.py, fake_eudiplo.py, api/, unit/
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
  valid session. `/api/health` and the sign-in itself are open.
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

### Form connections

`app/routers/form_connections.py` is the management API
(`specs/001-servicebw-eudi-middleware/contracts/management-api.md`), and
`app/services/form_connections.py` holds its logic:

- **Revisions**: each set of documents is an immutable revision with its own EUDIPLO
  presentation configuration, `fc-<id>-r<n>`. Creating a form connection stores
  revision 1; changing its documents stores the next one, which only requests
  triggered afterwards use. The name and the serviceBW form create no revision, and
  the connection URLs never change.
- **Creating a revision** (`create_revision`) holds no transaction while EUDIPLO
  answers. Under the form connection's row lock it takes the next number and inserts
  the revision, not yet current; then it creates the configuration; then it locks the
  row again and makes the revision current. Two edits at the same time therefore get
  distinct numbers, and if EUDIPLO fails, the revision is removed again.
- **Deactivating and deleting** cancel the open requests in the same transaction,
  and call no EUDIPLO: the worker deletes the sessions and, once no request needs
  them, the configurations. A deleted form connection keeps its row, so its URLs
  keep answering `409 unavailable`; the management API answers `404` for it.
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
- **Marks**: a branch based on the main branch is stored as its full tree, and each
  item carries a mark: none (follows the main branch, a copy of its item), `changed`,
  `removed` (shown, not evaluated) or `added`; `operator_mark` says that the top
  level's AND/OR was switched there. The evaluator, the details and the publish
  summary read the tree as it is, without merging anything. A based group with fewer
  than two active members counts as dissolved there; that is derived from the tree,
  not stored (`effective_items` in `evaluation.py`, and `tree.ts` in the browser).
- **Propagation runs only in the browser**: when the main branch changes in the Rules
  step, `propagateMain` in `frontend/src/utils/rules/branches.ts` updates every based
  branch (data-model.md, "Propagation from the main branch"), so the step shows each
  branch's rules at once. The server doesn't propagate: it checks every saved snapshot
  against the invariants that a correct propagation satisfies (every main-branch item
  once in each based branch, unmarked and removed items equal to the main branch's,
  marks only in based branches) and refuses a violation with `400` "The variant … is
  out of step with Standard", so a propagation bug can't reach serviceBW. Vitest pins every
  propagation rule and mark transition in `branches.test.ts`.
- **Saving**: `POST` and `PUT /api/form-connections` take the rules with the rest, so
  documents, branches and rules change together or not at all. The server checks the
  name and the documents, then the rules against the documents the save leaves current,
  before anything is written or EUDIPLO is called; a refusal is a `400` whose message
  names the problem, the rule and its branch, in the words of the Rules step's own
  checks (`utils/rules/validation.ts`). Rules alone are saved in one transaction under
  the form connection's row lock. With changed documents, `create_revision` runs as
  before, and its final locked transaction, which makes the revision current, also
  saves the rule set. Creating a form connection saves its branch rows and rule set 1
  in the transaction that inserts it.
- **`409 rules_changed`**: `GET /api/form-connections/{id}` returns `rule_set_version`,
  and the editor sends `rules` only when the team member changed them, with
  `base_version`, the version it loaded. If another save made a newer rule set current,
  the save is refused with `409 rules_changed`, before the rules are checked (so a
  stale editor meets this answer, not "Unknown variant.") and again under the row lock.
  Its message names the variants that replacing would delete or bring back with a new
  result link. The save dialog offers "Reload" or "Replace their changes", which sends
  the same save with `replace: true`: the rule set is the unit, since the server can't
  merge two saves without propagating. The name and the documents keep "the later save
  wins".
- **Kinds and value sets**: the catalog gives each field its kind (text, number, date,
  enum, image, or made of parts), its value set and its parts, such as the place of
  birth's country or a licence class's issue date, and `GET /api/document-types`
  returns them.
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

### Background worker

`app/services/worker.py` runs a daemon thread, started and stopped by the FastAPI
lifespan when `WORKER_ENABLED` is true. Every 2 seconds it runs the registered
steps, which are plain functions that open their own `SessionLocal()` sessions and
keep transactions short. A failing step is logged by exception type and code
location only, never its message, and the next step still runs. Outbound calls go
to a pool of 8 threads through `dispatch(key, call)`, so the loop never waits for
them, and a key that is still in flight isn't dispatched twice.

Implemented steps, in the order of research R7 in the spec folder:

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
5. **Re-sync configurations**, once after each start: a form connection whose
   current configuration, built again with the current trust list, request lifetime
   and catalog, has a different hash gets a new revision with the same documents.
   The checks run in the pool, and a failed one is tried again in the next cycle.
6. **Delete unused EUDIPLO configurations**: those of revisions that a later one
   replaced, or whose form connection was deleted, once no request on them still
   has an EUDIPLO session. A `404` counts as deleted.
7. **Delete expired sign-in sessions.**
8. **Delete request records** `REQUEST_RECORD_RETENTION_SECONDS` after the request
   ended.

The production image runs one uvicorn process, so there is one worker thread; row
locks keep the steps correct if that changes.

### serviceBW's connection URLs

`app/routers/connect.py` serves the URLs that serviceBW calls
(`specs/001-servicebw-eudi-middleware/contracts/integration-api.md`, and for the
branches and the evaluation `specs/002-connection-rules/contracts/integration-api.md`),
and `app/services/document_requests.py` holds their logic:

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
  1. unknown form connection: `404`;
  2. deactivated or deleted form connection: `409 unavailable`;
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
without a time or level prefix.

**`APP_ENV` must be set to something other than `development` in production**:
development drops the session cookie's `Secure` flag and fills in a default
`CONNECTION_BASE_URL`.

**Frontend**: the `ApiError` class in `src/api/client.ts` wraps HTTP errors with
status and response data. `errorNoticeOf(error, fallback)` turns a failure into
what a page shows, the API's message and `error_id` (an `ErrorNotice`), and the
shared `ErrorNoticeText` renders it, the error ID on a line of its own.

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
- Column and table names: `snake_case` (`servicebw_form`, `form_connections`)
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
[spec 002's data-model.md](../specs/002-connection-rules/data-model.md). A rule set's
tree is one JSONB column, since it is always read and written whole. No table holds
a citizen's documents or an evaluation.

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

The developer script `scripts/issue_test_credentials` reads `EUDIPLO_URL`,
`EUDIPLO_TRUST_LIST_ID` and its own issuer client, `EUDIPLO_ISSUER_CLIENT_ID` and
`EUDIPLO_ISSUER_CLIENT_SECRET` (roles `issuance:manage` + `issuance:offer`), from the same
`.env` with a settings class of its own. `Settings` doesn't declare the issuer client: the
middleware has no issuance role (research R2).

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

`frontend/nginx/40-servicebw-access.sh`, which the nginx image runs from
`/docker-entrypoint.d/`, writes the two lists into `/etc/nginx/servicebw-allow.conf`
(`allow` rules, then `deny all`) and `/etc/nginx/real-ip.conf` (`set_real_ip_from`,
`real_ip_header X-Forwarded-For`, `real_ip_recursive on`). An entry with anything
but an address or a range stops the container.

## Docker Development

The `docker-compose.yml` orchestrates three services:

1. **postgres**: PostgreSQL 18 (`postgres:18-alpine`) with health checks, published on host port **5435**
2. **backend**: FastAPI via uvicorn `--reload`, depends on postgres, exposes port 3000
3. **frontend**: Vite dev server, depends on backend, exposes port 5173

Both images build with the repository root as context, so the root
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
                 └──────────────────────────┘      (internal)        (internal)
                                                       │
                                                       └──▶ EUDIPLO (outbound HTTPS)
```

Consequences of this design:

- The backend needs `CONNECTION_BASE_URL` (an `https://` URL) and the four
  `EUDIPLO_*` variables in the Coolify environment; it refuses to start without
  `CONNECTION_BASE_URL`. Previews need it too, because they also run with
  `APP_ENV=production`
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
