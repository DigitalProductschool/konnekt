<!--
Sync Impact Report
Version change: 1.0.1 → 1.1.0
Rationale: MINOR. Resolves TODO(TEST_STRATEGY). The frontend gets a test runner (Vitest) and
its tests become a quality gate; the backend's pytest suite stays a practice, not a gate. This
adds a gate and states the testing standard. No principle is removed or redefined.

Modified principles:
- III. Automated Quality Gates (title unchanged): Vitest joins the configuration list;
  frontend changes MUST also pass `npm test`; a `frontend/vitest.config.ts` MUST NOT be added,
  for the same reason as `backend/pytest.ini`; new bullets state the testing standard (Vitest
  in the node environment for pure logic, tests next to their module, no numeric coverage
  target, backend pytest as a practice); the rationale covers the new gate.

Modified sections:
- Technology and Structure Constraints: Vitest named in the frontend stack.
- Development Workflow and Quality Gates: step 3 adds `npm test`; the paragraph pointing to
  TODO(TEST_STRATEGY) now refers to Principle III and keeps the manual verification rule.

Added sections: none
Removed sections: none

Templates requiring updates: none. .specify/templates/ names neither the quality gates nor a
test runner.

Follow-up TODOs:
- TODO(TEST_STRATEGY) is resolved and removed.
- frontend/ has neither Vitest nor a `test` script yet. The change that adds them (the
  `devDependency`, `"test": "vitest run"`, the `test` block in `vite.config.ts`) has to land
  before or with the next frontend change, since that change MUST pass `npm test`. The same
  change applies the documentation checklist: `npm test` in the command tables of CLAUDE.md
  and README.md, and Vitest in README.md with the reason it was added.
-->

# DPS React + FastAPI Template Constitution

## Core Principles

### I. Contract Parity at the API Seam

The frontend and backend are independently built and deployed and share no
build-time types. The Pydantic schemas in `backend/app/schemas.py` are the single
source of truth for every request and response shape; the TypeScript interfaces in
`frontend/src/types/` and `frontend/src/api/` mirror them by hand.

- A change to a request or response shape MUST update both sides in the same change set.
- Every response MUST follow the documented envelopes: success payloads carry `data`
  (plus an optional `message`), errors carry `error` and `message`.
- Handlers MUST signal failure by raising `HTTPException` with a
  `{'error': ..., 'message': ...}` detail dict so the handlers in `app/errors.py` pass
  it through unchanged. Handlers MUST NOT hand-roll error response bodies.

Rationale: hand-mirrored types drift silently and the drift surfaces as a runtime
failure in the browser, not as a build error. Same-commit parity and one fixed error
envelope are the only cheap defences available without a shared codegen step.

### II. Synchronous Persistence Layer (NON-NEGOTIABLE)

Database access uses the synchronous SQLAlchemy `Session` injected by
`Depends(get_db)`, over the psycopg 3 driver (`postgresql+psycopg://`).

- Route handlers that touch the database MUST be plain `def`; FastAPI runs them in a
  threadpool.
- Queries MUST use SQLAlchemy 2.0 style — `select()`, `db.get()`, `db.scalars()`.
  `AsyncSession` and the legacy `db.query()` API are forbidden.
- Blocking I/O inside an `async def` handler is forbidden. Either make the handler a
  plain `def`, or await a genuinely async client.

Rationale: the sync engine, sessionmaker, driver, and every handler form one coupled
choice — a single `async def` handler that touches the database blocks the event loop
for the whole process. Migrating to async is an all-at-once decision that requires an
amendment to this constitution, not an inline exception.

### III. Automated Quality Gates

Formatting, linting, type checking, and the frontend's tests are enforced by tooling,
not by reviewer attention. Configuration lives in `backend/pyproject.toml` (Ruff, mypy,
pytest) and `frontend/` (ESLint 9 flat config, Prettier, TypeScript, Vitest).

- The repository-wide hooks in `.pre-commit-config.yaml` MUST stay installed and MUST
  NOT be bypassed with `--no-verify`. They run `ruff check --fix` and `ruff format` on
  Python, `prettier --write` and `eslint --fix` on `frontend/`, plus whitespace and
  merge-conflict checks.
- mypy is deliberately not a hook because it is too slow for a commit. Backend changes
  MUST pass `uv run mypy app/` before being pushed.
- Frontend changes MUST pass `npm run lint`, `npm test`, and `npm run build` (which runs
  `tsc -b`) before being pushed.
- Tool configuration MUST live in the existing config files. In particular, a
  `backend/pytest.ini` MUST NOT be added — it takes precedence over and silently
  shadows the `[tool.pytest.ini_options]` block — and a `frontend/vitest.config.ts`
  MUST NOT be added either, because it takes precedence over the `test` block of
  `frontend/vite.config.ts` in the same way.
- Vitest is the frontend's test runner. It runs in the `node` environment and tests pure
  logic in `src/`: functions that need neither React nor the browser, such as those in
  `src/utils/rules/` and in the sibling `utils.ts` files of components. jsdom and DOM
  testing libraries are not part of the stack. A test sits next to the module it tests
  as `<module>.test.ts`, and `npm test` runs them all once, without watching.
- Backend tests use pytest in `backend/tests/`: unit tests, and API tests against a
  PostgreSQL database whose name ends in `_test`, which they empty. They are a practice,
  not a gate: backend changes SHOULD add or update them and run `uv run pytest`, but
  passing it is not a condition for merging.
- Neither suite has a numeric coverage target.

Rationale: this is a template that many teams fork. Gates that run automatically stay
true across forks; gates that depend on someone remembering do not. Logic that runs only
in the browser has no other automated check before a person tries it, so the frontend's
tests are a gate. Keeping them to pure functions in Node keeps `npm test` fast and needs
no browser. The backend's tests need a dedicated database, which not every environment
that runs the gates has, so they stay a practice.

### IV. Declared, Reproducible Dependencies and Config

Every dependency and every configuration value is declared in one known place.

- Python dependencies MUST be declared in `backend/pyproject.toml` and pinned in
  `uv.lock`. Both Dockerfiles install with `uv sync --frozen`, so a stale lockfile MUST
  fail the build rather than resolve different versions.
- A dependency MUST NOT be declared unless the code imports it, and an import MUST NOT
  rely on a transitive dependency.
- Every environment variable the backend reads MUST be a declared field on `Settings`
  in `backend/app/config.py`; undeclared variables are ignored (`extra='ignore'`).
  New variables MUST also be added to the relevant `.env.example`, `README.md`, and
  `docs/ARCHITECTURE.md`.
- `.env` and `.env.local` files, API keys, passwords, and tokens MUST NOT be committed.
- `APP_ENV` MUST be set to something other than `development` in production, because
  the catch-all exception handler includes exception text when it is `development`.

Rationale: an undeclared dependency or silently-ignored environment variable fails only
in the environment that lacks it — usually production, usually at the worst time.

### V. Reviewed Schema Evolution

The database schema changes only through Alembic migrations, and only deliberately.

- Migrations MUST be generated with `uv run alembic revision --autogenerate -m "msg"`
  and MUST be read and corrected before being committed — autogenerate does not detect
  every change.
- A committed migration MUST NOT be edited afterwards. Correct it with a new migration.
- Models MUST follow the documented conventions: SQLAlchemy 2.0 `Mapped` /
  `mapped_column`; UUID4 primary keys as `String(36)`; `created_at` and `updated_at` as
  `DateTime(timezone=True)` with `server_default=func.now()`; `snake_case` tables and
  columns; indexes on queried fields.
- `datetime.utcnow()` is forbidden. Use `func.now()` server-side, or
  `datetime.now(tz=timezone.utc)` when a Python-side timestamp is genuinely needed.

Rationale: migrations are shared, append-only history. Editing one that others have
already applied splits the schema between developers with no error to point at it.

## Technology and Structure Constraints

The stack is fixed for this template: React 19 + Vite 8 + TypeScript + Tailwind CSS 4
on the frontend, with Vitest for its tests; FastAPI on Python 3.13+ with SQLAlchemy 2,
Alembic, psycopg 3, and Pydantic 2 on the backend; PostgreSQL 18. Node tooling is scoped
to `frontend/` — a root `package.json` MUST NOT be introduced. Swapping any element of
the stack requires an amendment, not a pull request.

Layout is prescribed and MUST be respected: backend code in `backend/app/` with routers
under `app/routers/` (one module per resource), and the database module is `app/db.py`,
never `app/database.py`. Frontend code is organised into `src/api/`, `src/components/`,
`src/pages/`, `src/hooks/`, `src/utils/`, and `src/types/`.

Naming follows the tables in `CLAUDE.md`: Python uses `snake_case` files, functions,
and variables with `PascalCase` classes and Pydantic models; TypeScript uses
`PascalCase` component files, `camelCase` utilities, `kebab-case` API modules, and
`PascalCase` interfaces.

Frontend components MUST stay small and single-purpose. Types, constants, and
state-independent utility functions MUST be extracted into sibling `types.ts`,
`constants.ts`, and `utils.ts` files. A component with several pieces of related state
MUST use `useReducer` with actions rather than a stack of `useState` calls, and JSX
mapped over a list MUST be extracted into a sub-component. Styling MUST use Tailwind
utility classes — inline styles are forbidden, design tokens live in the `@theme` block
in `index.css`. `require()` is forbidden; use ES imports. The `any` type MUST NOT be
used without a written justification at the use site.

Backend code MUST use the `logging` module or FastAPI's logger — `print()` is not
logging.

## Development Workflow and Quality Gates

Adding a backend feature follows a fixed order: model in `app/models.py` → schemas in
`app/schemas.py` → Alembic migration → router in `app/routers/` → registration via
`app.include_router()` in `app/main.py` → new settings as `Settings` fields. The
frontend then follows: TypeScript interfaces → fetch functions in `src/api/` → React
components.

Before a change is proposed for merge:

1. Pre-commit hooks MUST have run (they run automatically on commit).
2. `uv run mypy app/` MUST pass for backend changes.
3. `npm run lint`, `npm test`, and `npm run build` MUST pass for frontend changes.
4. The documentation checklist in `CLAUDE.md` MUST be applied: new environment
   variables update `README.md`, `docs/ARCHITECTURE.md`, and the `.env.example` files;
   new patterns update `CLAUDE.md`; architectural changes update
   `docs/ARCHITECTURE.md`; new dependencies are documented in `README.md` with the
   reason they were added.

The backend's tests are not a gate, and the frontend's tests cover pure logic only
(Principle III). A change that the gates above cannot check MUST be exercised manually
against a running stack (`docker compose up`) and the verification described in the
pull request.

## Governance

This constitution supersedes other practices and conventions in this repository. Where
it and another document disagree, this document wins and the other document MUST be
corrected.

Amendments MUST be proposed as a pull request that changes this file, states the
rationale, bumps the version, and updates the sync impact report at the top. Versioning
is semantic:

- **MAJOR** — a principle is removed or redefined in a way that invalidates existing
  compliant code (for example, adopting `AsyncSession`).
- **MINOR** — a principle or section is added, or existing guidance is materially
  expanded.
- **PATCH** — clarifications, wording, and non-semantic refinements.

Every review MUST verify compliance with these principles. A reviewer MUST block a
change that violates a principle, or require an amendment first. Deviations are allowed
only when documented in the pull request with an explicit justification of the added
complexity, and only for principles not marked NON-NEGOTIABLE.

`CLAUDE.md` is the runtime development guidance for AI coding agents and human
contributors alike; it MUST remain consistent with this constitution, and this
constitution is the authority when they diverge.

**Version**: 1.1.0 | **Ratified**: 2026-09-02 | **Last Amended**: 2026-10-24
