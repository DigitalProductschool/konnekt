# AI Agent Instructions: Konnekt

Context for AI coding agents (Claude Code, GitHub Copilot, OpenAI Codex, Cursor, …). This file holds
only the rules that every task needs. The details are in the documents below: read one when your
task touches its subject.

| Document | Read it when |
|---|---|
| `docs/ARCHITECTURE.md` | You need to know how something works: data flow, sign-in, the EUDIPLO client and its transactions, form connections and revisions, rules and branches (spec 002), rule checks (spec 003), drafts and local drafts (spec 005), agent access, approval requests and the MCP server (spec 007), the languages (spec 009), scheduling, the activity, restorable deletions, the document order and the example (spec 010), the connection PDF and its version (spec 011), the worker, serviceBW's URLs, error handling, database conventions, layouts and routing, environment variables, deployment |
| `docs/KERN-DESIGN-SYSTEM.md` | You build or style UI: KERN's components, tokens, Tailwind classes and gotchas |
| `docs/EUDIPLO.md` | You call or change anything that talks to EUDIPLO |
| `docs/FIGMA-WORKFLOW.md` | A task comes with a Figma URL: follow it step by step |
| `docs/DEVELOPMENT.md` | Setup, running it locally, the full command list, Docker, the generated fixtures |
| `docs/CODE-QUALITY.md` | The linters and type checks, the git hooks, CI, gitleaks, the editors' format on save |
| `docs/DEPLOYMENT.md` | You change what production needs: the compose stack's settings, the reverse proxy, backups, updates |
| `docs/ACCOUNTS.md` | The command-line tool: accounts, clearing the connections |
| `docs/TEST-CREDENTIALS.md` | You issue test documents to a test wallet, or change the script that does |
| `docs/MCP-SERVER.md` | What team members read about agents: access levels, approvals, the tools, installing the plugin |
| `docs/DEPENDENCIES.md` | You add, change or remove a dependency: why each one was added, and the pins |
| `docs/COMPATIBILITY.md` | You change the catalog, upgrade EUDIPLO or work on the German wallet: the tested versions, why the catalog holds every field, the known limits |
| `README.md` | The overview and the index of the documents: it holds no details |
| `NOTICE.md`, `REUSE.toml` | You add a dependency, font, icon or picture, or copy in a file: what is others' and each file's licence |
| `specs/<feature>/` | You work on a speckit task: spec, plan, research (R#), data model, contracts, design notes |
| `.specify/memory/constitution.md` | The binding principles; it wins where this file disagrees |

## Project

The DO.IT team of the City of Stuttgart uses this middleware to connect serviceBW forms to the
EUDI Wallet, through EUDIPLO.

- `backend/`: FastAPI (Python 3.13), SQLAlchemy 2 (**sync**), Alembic, psycopg 3, PostgreSQL, a
  background worker thread and a client for the EUDIPLO management API
- `frontend/`: React 19, Vite 8, TypeScript, Tailwind CSS 4, React Router 7, KERN design system
- `api-types/` (`@konnekt/api-types`): the TypeScript mirrors of the backend's schemas
- `rules/` (`@konnekt/rules`): the pure rules logic, its checks and test personas
- `mcp/` (`@konnekt/mcp`): the MCP server for the team members' LLM agents, a Node
  service (the `mcp` container, port 3100, behind nginx's `/mcp`) that calls the management API
  with the agent's bearer token; `mcp/plugin/` holds its guidance

`api-types/`, `rules/`, `frontend/` and `mcp/` are the packages of one npm workspace at the root;
`frontend/` and `mcp/` import the other two by name (`@konnekt/api-types/<name>`,
`@konnekt/rules/<path>`) and never each other.

The UI says "connection" for form connection and "variant" for branch, and calls the main branch
"Standard" until it is renamed.

## Backend rules

- **Sync database access only**: the synchronous `Session` with 2.0-style `select()` /
  `db.get()`. Route handlers that touch the database are plain `def`. Never `AsyncSession`,
  `db.query()`, or blocking I/O in an `async def` handler.
- **Routers** (`app/routers/`, one per resource; follow `form_connections.py`) stay thin:
  domain logic goes into `app/services/`. Type every parameter and return value, and give every
  endpoint a docstring.
- **Auth**: management routers depend on `get_current_user` (`401`), or on
  `get_current_principal` where agents' bearer tokens are accepted too, with
  `require_level(...)` or `require_browser_session` per endpoint (ARCHITECTURE, "Agent access
  and the MCP server (spec 007)"); their `POST`, `PUT` and `DELETE` endpoints also on
  `require_json` (`415`, the CSRF protection). Only `/api/health`, the sign-in, the open OAuth
  endpoints and `/api/connect/` (restricted by the network) are open.
- **Sign-in throttle** (`services/sign_in_throttle.py`, the `SIGN_IN_*` settings): every attempt
  counts against its username in `sign_in_throttles`, under the row lock and before the password
  is checked; one during the wait answers `429 rate_limited` with `Retry-After` and runs no hash;
  the table keeps the username's hash only, and nothing logs a username or its hash
  (ARCHITECTURE, "Sign-in (DO.IT team members)").
- **OAuth registrations** (`services/oauth.py`): at most `OAUTH_MAX_UNUSED_REGISTRATIONS` unused
  ones stay, each registration removing the oldest beyond it under the registration lock, never
  one an agent connection or an authorization code uses; a refused body answers RFC 7591's
  `invalid_client_metadata` (ARCHITECTURE, "Agent access and the MCP server (spec 007)").
- **Answers**: annotate with `ApiResponse[...]` and return `ApiResponse(data=..., message=...)`
  (`data=None` when there is nothing). Errors raise `HTTPException` with a
  `{'error': ..., 'message': ...}` detail.
- **A `5xx` never says what went wrong**: a generic message plus
  `'error_id': log_server_error(error, '<what failed>')` (`app/errors.py`). No setting's name,
  component internals or exception text in any answer.
- **Services** take the `Session` as their first argument and raise `HTTPException` with the
  `{error, message}` detail.
- **EUDIPLO**: get the client with `get_eudiplo_client()`, and turn an `EudiploError` into the
  answer with `http_error_for(error, '<message for the UI>')`. Never hold a transaction while
  waiting for EUDIPLO; lock and re-check rows afterwards, and reserve unique numbers before the
  call (ARCHITECTURE, "Transactions around EUDIPLO calls").
- **Worker steps** (`services/worker.py`): see ARCHITECTURE, "Background worker". Outbound calls
  go through `dispatch(key, call)`, whose key never contains a request reference.
- **Logging**: the `logging` module, never `print()`. Never log claims, tokens, secrets,
  request references, response bodies, rule evaluations or exception messages; log an exception
  with `describe_error(error)` from `app/errors.py`.
- **Models** use `Mapped` / `mapped_column` with the shared `UuidPk`, `CreatedAt` and
  `UpdatedAt` columns, and index the fields used in queries. Never `datetime.utcnow()`; use
  `datetime.now(tz=timezone.utc)`.
- **Schemas**: Pydantic v2, separate Create, Update and Response models, `from_attributes=True`
  for ORM objects. `api-types/src/` mirrors `backend/app/schemas.py` field for field
  (snake_case): change both.
- **Approval requests** run the existing services (`publish_stored_draft()`, `delete_draft()`,
  `deactivate_form_connection()` …), never a second path (ARCHITECTURE, "Agent access and the
  MCP server (spec 007)").
- **Languages** (spec 009): server messages are `Text(en, de)` resolved by `errors.py`;
  `/api/connect/` is always English; `label_of()` for the catalog's and option sets' labels
  (ARCHITECTURE, "Languages (spec 009)").
- **Settings**: a new environment variable is a field on `Settings` in `app/config.py`.
- **Developer scripts** (`backend/scripts/`) never ship: `app/` never imports them, and they
  never import `app.config`.
- Declare only dependencies the code imports. The database module is `app/db.py`. Pytest, Ruff
  and mypy are configured in `pyproject.toml`: never add a `pytest.ini`.

## Frontend rules

- **API**: call the backend only through `apiFetch` (`src/api/client.ts`), one module per
  resource in `src/api/`, types in `api-types/src/`. A page passes failures through
  `useSignOutOnUnauthorized()` and shows them with `errorNoticeOf(error, '<fallback>')` and
  `ErrorNoticeText`, so that a `5xx`'s `error_id` appears.
- **Copy** lives in `defineTexts(en, de)` tables in the sibling `constants.ts` and is read with
  `useCopy()`; a helper that builds text takes `language` (ARCHITECTURE, "Languages (spec 009)").
- **Components** stay small; extract new functionality into new components. Next to a
  component: its types in `types.ts`, its constants in `constants.ts`, state-independent helpers
  in `utils.ts`. Several state variables → `useReducer` with actions. JSX mapped over a list → a
  sub-component.
- **Styling**: Tailwind classes only, no inline styles (a measured value (a height, a drag's
  offset) may be set as a CSS custom property for classes to read, as `WizardLayout` and
  `useRowDrag` do); custom tokens go into `@theme` in
  `index.css`. Numeric utilities are pixels (`p-16` is 16px). KERN's CSS beats Tailwind on the
  same property: wrap the KERN element, or use the `!` suffix sparingly.
- **KERN Revamp** (spec 008): the Revamp's values live in the overlay block of `index.css`
  under KERN's names; a value without a KERN name is a `@theme` token
  (`docs/KERN-DESIGN-SYSTEM.md` §3.1).
- **Visuals** (`src/assets/illustrations/`): lossless WebP at 2× or more, at most 1.5 MB each,
  colour and rotation baked in (never CSS filters, opacity or rotation), `alt=""` and
  `aria-hidden`, a fixed size that never scales, cut only by a clip layer of their own, and text
  24 px or more from them (ARCHITECTURE, "frontend", "The visuals"). The one exception is the
  sign-in motion's travelling chain: moved, scaled and faded through its wrappers only.
- **The sign-in motion** (bug `login-welcome-motion`): the signed-out screens are a second
  `<Routes>` that holds the sign-in page over its destination until the motion ends; change it
  through `components/SignInMotion/` and `hooks/useSignInMotion.ts`, measure boxes there, never
  in a component, and keep its 200 ms cross-fade free of `.motion` (ARCHITECTURE, "frontend",
  "The sign-in motion").
- **Narrow windows**: below 320 CSS px (a 320 px window at 200 % zoom) use the `narrow:`
  variant; `index.css`'s narrow block already wraps words and halves the side paddings
  (`docs/KERN-DESIGN-SYSTEM.md` §3.1).
- **KERN**: keep the import order in `index.css`, never import
  `@kern-ux-annex/kern-react-kit/kern-react-kit.css`, and add the styles of a kit component that
  ships its own before using it (`docs/KERN-DESIGN-SYSTEM.md` §2). Inside a labelled `kern-btn`,
  hide text with `sr-only`, not `kern-sr-only`.
- **Light only**: keep `data-kern-theme="light"` in `index.html` and `color-scheme: only light`
  in `index.css`, and never use Tailwind's `dark:` variant. The one exception is the favicon
  (`src/assets/illustrations/favicon.svg`), which follows the browser's theme (ARCHITECTURE,
  "frontend").
- **Focus rings** show for keyboard focus only: `focus-visible:` on your own elements, never
  `focus:`, and keep the `:focus:not(:focus-visible)` rules in `index.css`.
- **Links** between the app's routes are React Router `Link`s with KERN's classes (`kern-link`,
  or `kern-btn kern-btn--primary` with a `kern-label` span): `KernLink` and `KernButton` with
  `href` reload the page.
- **Pages**: route in `App.tsx`, path in `ROUTES` (`src/constants.ts`), tab title with
  `useDocumentTitle()`, exactly one `h1`. Which layout a page uses: ARCHITECTURE, "frontend".
- **Popups**: menus, tooltips and popovers are placed by `placementFrom()`'s class sets (side,
  direction, max-height step; `src/utils/popupPlacement.ts`), never with inline coordinates;
  one inside a box that scrolls or clips opens in the top layer, a `popover` anchored by CSS
  anchor positioning classes where `supportsAnchoredPopups()` holds (ARCHITECTURE, "frontend").
- **Dialogs**: a scrim click closes a dialog unless it deletes or publishes
  (`ConfirmDialog`'s `dismissOnScrim={false}`; ARCHITECTURE, "frontend").
- **Toasts**: every toast closes after 6 seconds (`TOAST_DURATION_MS`), with or without an
  action, the time held while the pointer or the focus is on it (ARCHITECTURE, "frontend").
- **The connection PDF** (spec 011): no `console.*` in `utils/connectionPdf/`, `workers/pdf.ts`
  or `useConnectionPdf`; only the worker and the hook touch browser APIs; `version_fingerprint`
  is computed only in `backend/app/services/versions.py` (ARCHITECTURE, "The connection PDF
  (spec 011)").
- No `any` without a justification, no `require()`. Never add a `vitest.config.ts` to
  `frontend/`: it would replace the `test` block of `vite.config.ts`.

## Rules, rule checks and test personas (specs 002, 003, 004)

- The pure rules logic lives in `rules/src/`, every module with its `*.test.ts`; the three browser
  Worker entries are `frontend/src/workers/checks.ts`, `frontend/src/workers/personas.ts` and
  `frontend/src/workers/pdf.ts` (the connection PDF, spec 011).
- Agents' edits go through `rules/src/edits.ts`, as the rules reducer does: a new editing action
  goes there, never into the reducer or an MCP tool alone (ARCHITECTURE, "Rules and branches").
- **Propagation** of the main branch's changes lives only in `rules/src/branches.ts`
  (`propagateMain`); the server only checks the invariants (`backend/app/services/rules.py`).
  Every change to `branches.ts` comes with a case in `branches.test.ts`, and a change to a
  propagation rule or mark transition also updates the server's checks.
- `rules/src/validation.ts` uses the server's messages word for word, in both languages (pinned
  by the parity fixture `rules/src/fixtures/server-messages.json`).
- **Languages** (spec 009): the composers take the language and default to English; `mcp/src/`
  never passes one; callers branch on a problem's `code`, never its message (ARCHITECTURE,
  "Languages (spec 009)").
- **Rule checks** (`rules/src/checks/`) judge conditions as `backend/app/services/evaluation.py`
  does. `rules/src/checks/caseFolding.ts` and `rules/src/checks/fixtures/evaluator-vectors.json`
  are generated: never edit them by hand. After a Python upgrade or a change to the evaluator's
  comparisons, run `uv run python -m scripts.export_check_fixtures` in `backend/` and commit the
  result; it also writes `rules/src/fixtures/server-messages.json` and
  `rules/src/fixtures/example-connection.json`, so run it after a change to the rules' messages
  (`backend/app/services/rules_texts.py`) or the example (`backend/app/example.py`) too.
- **Findings** are never stored, sent or logged (no `console.*` in `checks/`, `workers/checks.ts`
  or `useRuleChecks`), every finding text comes from `checks/findingMessages.ts` (its words in
  `checks/findingTexts.ts`), and only the Rules step passes the `finding` / `findings` props.
  Only `frontend/src/workers/` and the hooks touch browser APIs; `rules/src/` stays pure.
- **Test personas** (spec 004; ARCHITECTURE, "The test step and the test personas"): the evaluator
  is `rules/src/evaluation.ts`, the port of `evaluation.py` pinned by the generated vectors
  (`rule_outcomes`, `branch_evaluations`). Personas live in `rules/src/personas/`, pure, every
  module with its `*.test.ts`, and are never stored, sent or logged: no `console.*` in
  `personas/`, `workers/personas.ts`, `usePersonas` or `useTodayInGermany`. The evaluator and the
  checked trees reach the page only through `usePersonas`'s dynamic `import()`.

## Drafts and local drafts (spec 005)

- Drafts are never live: their URLs answer `409 unavailable` and they set nothing up with
  EUDIPLO (ARCHITECTURE, "Form connections" and "serviceBW's connection URLs").
- Publishing a draft goes through `create_revision()` with a `DraftGuard`, never a second save
  path (ARCHITECTURE, "Form connections").
- Only `useLocalDraftStore`, `useRememberedHomepage` and `LanguageProvider` touch
  `localStorage`; `utils/localDrafts/` stays pure and takes a `StorageLike` (ARCHITECTURE, "Local
  drafts (spec 005)").
- Local drafts never hold personas, findings or citizen data, and nothing in
  `utils/localDrafts/` or its hooks logs (ARCHITECTURE, "Local drafts (spec 005)").

## The MCP server and its guidance (spec 007)

- Every change to the MCP tools updates the skills in `mcp/plugin/skills/` in the same change;
  `npm test` in `mcp/` fails when a tool isn't described (`mcp/src/guidance.test.ts`; details in
  `specs/007-agent-mcp-server/contracts/guidance.md`).
- The MCP server logs only through `mcp/src/log.ts` (method, tool, status, duration), never
  arguments, results, tokens, findings or citizens (ARCHITECTURE, "Agent access and the MCP
  server (spec 007)").

## Scheduling, activity and deletions (spec 010)

- A start date is a day in Germany, checked by `clean_start_date()` (before EUDIPLO and again
  under the row lock), and only the worker's step activates on a date (ARCHITECTURE, "Form
  connections").
- A service that changes a connection takes the `actor` and records the change with
  `activity.record()` under the row lock (ARCHITECTURE, "The activity (spec 010)").
- The order of `documents` in a body is the stored order, while revisions and the DCQL query
  stay in catalog order (ARCHITECTURE, "Form connections").
- Deleting is `_mark_deleted()` for drafts too, and only `restore_deletion()` undoes it; a
  worker step that acts on deletions waits for `deletions.restore_cutoff()` and checks it again
  under the row lock (ARCHITECTURE, "Form connections" and "Background worker").

## Code style

- **Python**: Ruff (88 columns, single quotes, isort) and mypy; docstrings for public modules,
  classes and functions.
- **TypeScript**: Prettier (single quotes, semicolons, 100 columns, 2 spaces, ES5 trailing
  commas) and ESLint (import order).

| | Python | TypeScript |
|---|---|---|
| Files | `snake_case` (`team_members.py`) | components `PascalCase` (`TeamMemberCard.tsx`), utilities `camelCase` (`formatDate.ts`), API modules `kebab-case` (`team-members.ts`) |
| Classes, interfaces, schemas | `PascalCase` (`TeamMember`, `TeamMemberCreate`) | `PascalCase` (`TeamMember`, `TeamMemberCreate`) |
| Functions, variables | `snake_case` | `camelCase` |
| Constants | `UPPER_SNAKE_CASE` | |
| Other | tables and columns `snake_case`, router tags lowercase (`'team-members'`) | CSS classes `kebab-case` (Tailwind) |

## Commands

```bash
# backend/
uv sync
uv run ruff check --fix . && uv run ruff format .
uv run mypy app/ scripts/ tests/
# The tests empty their database, so its name must end in _test; EUDIPLO is faked
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5435/konnekt_db_test uv run pytest
uv run alembic revision --autogenerate -m "msg"   # review the file, then:
uv run alembic upgrade head
uv run python -m scripts.export_check_fixtures [--check]

# the root (api-types/, rules/, frontend/, mcp/)
npm install
npm run lint && npm test && npm run build
npm run format
npm run dev -w frontend   # the SPA on 5173
npm run dev -w mcp        # the MCP server on 3100 (vite-node; restart after a change)
npm run notices -w frontend   # rewrites frontend/public/THIRD-PARTY-NOTICES.txt
uvx --from reuse==6.3.0 reuse lint   # the REUSE check: every file's licence, from REUSE.toml
```

Before you finish: Ruff and mypy pass for backend changes (run pytest too), and `npm run lint`,
`npm test` and `npm run build` from the root for changes in `api-types/`, `rules/`, `frontend/`
or `mcp/`, and the REUSE check when files are added, moved or copied in. Everything else is in
`docs/DEVELOPMENT.md`, "Common Commands".

CI (`.github/workflows/ci.yml`) runs the same checks, the REUSE check, and gitleaks over the
history, on every push and pull request: a new check, or a new Python, uv, Node, gitleaks or reuse
version, goes into it too (`docs/CODE-QUALITY.md`, "Continuous integration").

## Adding a feature

- **Backend**: model (`app/models.py`) → schemas (`app/schemas.py`) → migration → services
  (`app/services/`) → router (`app/routers/`) → `app.include_router()` in `app/main.py` →
  settings → tests (`tests/api/`, `tests/unit/`).
- **Frontend**: types (`api-types/src/`) → API functions (`src/api/`) → page in
  `src/pages/<Name>/`, reusing `src/components/` → route in `App.tsx` and `ROUTES`.

## Never

- Commit `.env` files (use `.env.example`) or any secret.
- Change `LICENSE` (the EUPL-1.2's English text): `LICENSES/EUPL-1.2.txt` and `backend/LICENSE`
  are byte-identical copies of it.
- Get past a gitleaks finding with `--no-verify` or `SKIP=gitleaks`: rotate a real secret, allow
  a false positive (`docs/CODE-QUALITY.md`, "Secrets (gitleaks)").
- Edit generated files: Alembic migrations after creation, `rules/src/checks/caseFolding.ts`,
  `rules/src/checks/fixtures/evaluator-vectors.json`, `rules/src/fixtures/server-messages.json`,
  `rules/src/fixtures/example-connection.json`.

## Documentation checklist

- New environment variables → `docs/ARCHITECTURE.md` ("Environment Variables") and the
  `.env.example` files; one that `docker-compose.prod.yml` passes → `docs/DEPLOYMENT.md` too
- New patterns or conventions → `CLAUDE.md`, as a one-line rule that points to the document
  holding the details
- Architectural changes → `docs/ARCHITECTURE.md`
- `README.md` stays the overview and the index: details go into a document in `docs/`, and a
  new document gets a row in the README's index and in the table at the top of this file
- New dependencies → `docs/DEPENDENCIES.md`, with the reason they were added
- A new dependency, font, icon, picture or copied file → `NOTICE.md` and `REUSE.toml`; a package
  bundled into the SPA → the served notices (`npm run notices -w frontend`)
