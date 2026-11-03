# AI Agent Instructions: serviceBW ↔ EUDI Wallet Middleware

Context for AI coding agents (Claude Code, GitHub Copilot, OpenAI Codex, Cursor, …). This file holds
only the rules that every task needs. The details are in the documents below: read one when your
task touches its subject.

| Document | Read it when |
|---|---|
| `docs/ARCHITECTURE.md` | You need to know how something works: data flow, sign-in, the EUDIPLO client and its transactions, form connections and revisions, rules and branches (spec 002), rule checks (spec 003), the worker, serviceBW's URLs, error handling, database conventions, layouts and routing, environment variables, deployment |
| `docs/KERN-DESIGN-SYSTEM.md` | You build or style UI: KERN's components, tokens, Tailwind classes and gotchas |
| `docs/EUDIPLO.md` | You call or change anything that talks to EUDIPLO |
| `docs/FIGMA-WORKFLOW.md` | A task comes with a Figma URL: follow it step by step |
| `README.md` | Setup, the full command list, accounts, test credentials, Docker, deployment |
| `specs/<feature>/` | You work on a speckit task: spec, plan, research (R#), data model, contracts, design notes |
| `.specify/memory/constitution.md` | The binding principles; it wins where this file disagrees |

## Project

The DO.IT team of the City of Stuttgart uses this middleware to connect serviceBW forms to the
EUDI Wallet, through EUDIPLO.

- `backend/`: FastAPI (Python 3.13), SQLAlchemy 2 (**sync**), Alembic, psycopg 3, PostgreSQL, a
  background worker thread and a client for the EUDIPLO management API
- `frontend/`: React 19, Vite 8, TypeScript, Tailwind CSS 4, React Router 7, KERN design system

The UI says "connection" for form connection and "variant" for branch, and calls the main branch
"Standard" until it is renamed.

## Backend rules

- **Sync database access only**: the synchronous `Session` with 2.0-style `select()` /
  `db.get()`. Route handlers that touch the database are plain `def`. Never `AsyncSession`,
  `db.query()`, or blocking I/O in an `async def` handler.
- **Routers** (`app/routers/`, one per resource; follow `form_connections.py`) stay thin:
  domain logic goes into `app/services/`. Type every parameter and return value, and give every
  endpoint a docstring.
- **Auth**: management routers depend on `get_current_user` (`401`), and their `POST`, `PUT`
  and `DELETE` endpoints also on `require_json` (`415`, the CSRF protection). Only
  `/api/health`, the sign-in and `/api/connect/` (restricted by the network) are open.
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
  for ORM objects. `frontend/src/types/` mirrors them field for field (snake_case): change both.
- **Settings**: a new environment variable is a field on `Settings` in `app/config.py`.
- **Developer scripts** (`backend/scripts/`) never ship: `app/` never imports them, and they
  never import `app.config`.
- Declare only dependencies the code imports. The database module is `app/db.py`. Pytest, Ruff
  and mypy are configured in `pyproject.toml`: never add a `pytest.ini`.

## Frontend rules

- **API**: call the backend only through `apiFetch` (`src/api/client.ts`), one module per
  resource in `src/api/`, types in `src/types/`. A page passes failures through
  `useSignOutOnUnauthorized()` and shows them with `errorNoticeOf(error, '<fallback>')` and
  `ErrorNoticeText`, so that a `5xx`'s `error_id` appears.
- **Components** stay small; extract new functionality into new components. Next to a
  component: its types in `types.ts`, its constants in `constants.ts`, state-independent helpers
  in `utils.ts`. Several state variables → `useReducer` with actions. JSX mapped over a list → a
  sub-component.
- **Styling**: Tailwind classes only, no inline styles; custom tokens go into `@theme` in
  `index.css`. Numeric utilities are pixels (`p-16` is 16px). KERN's CSS beats Tailwind on the
  same property: wrap the KERN element, or use the `!` suffix sparingly.
- **KERN**: keep the import order in `index.css`, never import
  `@kern-ux-annex/kern-react-kit/kern-react-kit.css`, and add the styles of a kit component that
  ships its own before using it (`docs/KERN-DESIGN-SYSTEM.md` §2). Inside a labelled `kern-btn`,
  hide text with `sr-only`, not `kern-sr-only`.
- **Light only**: keep `data-kern-theme="light"` in `index.html` and `color-scheme: only light`
  in `index.css`, and never use Tailwind's `dark:` variant.
- **Focus rings** show for keyboard focus only: `focus-visible:` on your own elements, never
  `focus:`, and keep the `:focus:not(:focus-visible)` rules in `index.css`.
- **Links** between the app's routes are React Router `Link`s with KERN's classes (`kern-link`,
  or `kern-btn kern-btn--primary` with a `kern-label` span): `KernLink` and `KernButton` with
  `href` reload the page.
- **Pages**: route in `App.tsx`, path in `ROUTES` (`src/constants.ts`), tab title with
  `useDocumentTitle()`, exactly one `h1`. Which layout a page uses: ARCHITECTURE, "frontend".
- **Popups** (menus, popovers, tooltips) pick their side with `placementFrom()`
  (`src/utils/popupPlacement.ts`); never anchor a fixed-width popup with `left-0` or `right-0`
  alone.
- No `any` without a justification, no `require()`. Never add a `vitest.config.ts`: it would
  replace the `test` block of `vite.config.ts`.

## Rules, rule checks and test personas (specs 002, 003, 004)

- The pure rules logic lives in `src/utils/rules/`, every module with its `*.test.ts`.
- **Propagation** of the main branch's changes lives only in `utils/rules/branches.ts`
  (`propagateMain`); the server only checks the invariants (`backend/app/services/rules.py`).
  Every change to `branches.ts` comes with a case in `branches.test.ts`, and a change to a
  propagation rule or mark transition also updates the server's checks.
- `utils/rules/validation.ts` uses the server's messages word for word.
- **Rule checks** (`utils/rules/checks/`) judge conditions as `backend/app/services/evaluation.py`
  does. `checks/caseFolding.ts` and `checks/fixtures/evaluator-vectors.json` are generated:
  never edit them by hand. After a Python upgrade or a change to the evaluator's comparisons,
  run `uv run python -m scripts.export_check_fixtures` in `backend/` and commit the result.
- **Findings** are never stored, sent or logged (no `console.*` in `checks/`, the worker or
  `useRuleChecks`), every finding text comes from `checks/findingMessages.ts`, and only the Rules
  step passes the `finding` / `findings` props. Only `checks/worker.ts` and the hook touch
  browser APIs.
- **Test personas** (spec 004; ARCHITECTURE, "The test step and the test personas"): the evaluator
  is `utils/rules/evaluation.ts`, the port of `evaluation.py` pinned by the generated vectors
  (`rule_outcomes`, `branch_evaluations`). Personas live in `utils/rules/personas/`, pure, every
  module with its `*.test.ts`, and are never stored, sent or logged: no `console.*` in
  `personas/`, its worker, `usePersonas` or `useTodayInGermany`. The evaluator and the checked
  trees reach the page only through `usePersonas`'s dynamic `import()`.

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
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5435/template_db_test uv run pytest
uv run alembic revision --autogenerate -m "msg"   # review the file, then:
uv run alembic upgrade head
uv run python -m scripts.export_check_fixtures [--check]

# frontend/
npm run lint && npm test && npm run build
npm run format
```

Before you finish: Ruff and mypy pass for backend changes (run pytest too), and `npm run lint`,
`npm test` and `npm run build` for frontend changes. Everything else is in `README.md`, "Common
Commands".

## Adding a feature

- **Backend**: model (`app/models.py`) → schemas (`app/schemas.py`) → migration → services
  (`app/services/`) → router (`app/routers/`) → `app.include_router()` in `app/main.py` →
  settings → tests (`tests/api/`, `tests/unit/`).
- **Frontend**: types (`src/types/`) → API functions (`src/api/`) → page in
  `src/pages/<Name>/`, reusing `src/components/` → route in `App.tsx` and `ROUTES`.

## Never

- Commit `.env` files (use `.env.example`) or any secret.
- Edit generated files: Alembic migrations after creation, `caseFolding.ts`,
  `evaluator-vectors.json`.

## Documentation checklist

- New environment variables → `README.md`, `docs/ARCHITECTURE.md` and the `.env.example` files
- New patterns or conventions → `CLAUDE.md`, as a one-line rule that points to the document
  holding the details
- Architectural changes → `docs/ARCHITECTURE.md`
- New dependencies → `README.md`, with the reason they were added
