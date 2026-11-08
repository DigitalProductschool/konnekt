<!--
Sync Impact Report
Version change: 1.1.0 → 1.2.0
Rationale: MINOR. The repository becomes an npm workspace of four Node packages so that the
MCP server (spec 007) reuses the editor's rules logic without a second implementation. This
materially expands the structure section and Principles I and III; no principle is
removed or redefined.

Modified principles:
- I. Contract Parity at the API Seam (title unchanged): the TypeScript mirror of the
  Pydantic schemas is `api-types/src/`, one package that `frontend/` and `mcp/` import; an
  endpoint that implements a standard protocol (the OAuth endpoints, the well-known
  documents) answers its RFC's body, the one exception to the envelopes.
- III. Automated Quality Gates (title unchanged): the gates run for the workspace from the
  root; Vitest runs in `node` in `rules/` (`rules/vitest.config.ts`), `frontend/` and `mcp/`
  (the `test` block of their `vite.config.ts`); a `vitest.config.ts` MUST NOT be added
  beside a `vite.config.ts`; the pre-commit hooks run from the root over the four packages;
  the MCP server's integration tests against a fake backend are part of the gate.

Modified sections:
- Technology and Structure Constraints: the npm workspace with a root `package.json`, the
  four packages (`api-types/`, `rules/`, `frontend/`, `mcp/`), their boundaries, one lockfile
  and shared tooling configuration; Node 22+ and a container for the MCP server; the sentence
  scoping Node tooling to `frontend/` and forbidding a root `package.json` is removed; the
  layout lists `frontend/src/workers/`, that `frontend/src/` no longer holds `types/` or
  `utils/rules/`, and the MCP server's folders.
- Development Workflow and Quality Gates: the frontend order starts at `api-types/src/`;
  step 3 names the workspace gates.

Added sections: none
Removed sections: none

Templates requiring updates: none. .specify/templates/ names neither the packages nor the
gates.

Follow-up TODOs:
- The workspace, the packages and the move of `frontend/src/types/` and
  `frontend/src/utils/rules/` land with spec 007's Phase 2 (tasks T004–T011). Until that
  change lands, the repository keeps the old layout, and CLAUDE.md, README.md and
  docs/ARCHITECTURE.md still name the old paths; the same change updates them (T010).
-->

# DPS React + FastAPI Template Constitution

## Core Principles

### I. Contract Parity at the API Seam

The frontend and backend are independently built and deployed and share no
build-time types. The Pydantic schemas in `backend/app/schemas.py` are the single
source of truth for every request and response shape; the TypeScript interfaces in
`api-types/src/` mirror them by hand, one package that `frontend/` and `mcp/` import
by name.

- A change to a request or response shape MUST update `schemas.py` and `api-types/src/`
  in the same change set.
- Every response MUST follow the documented envelopes: success payloads carry `data`
  (plus an optional `message`), errors carry `error` and `message`. The one exception is
  an endpoint that implements a standard protocol (the OAuth endpoints and the
  well-known documents): it answers the body its RFC prescribes, recorded in the
  feature's contracts.
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

Formatting, linting, type checking, and the Node packages' tests are enforced by
tooling, not by reviewer attention. Configuration lives in `backend/pyproject.toml`
(Ruff, mypy, pytest) and, for the Node packages, at the repository root (one ESLint 9
flat config and one Prettier configuration with a block per package, `tsconfig.base.json`)
plus each package's `tsconfig.json` and Vitest configuration.

- The repository-wide hooks in `.pre-commit-config.yaml` MUST stay installed and MUST
  NOT be bypassed with `--no-verify`. They run `ruff check --fix` and `ruff format` on
  Python, `prettier --write` and `eslint --fix` from the root over the four Node packages,
  plus whitespace and merge-conflict checks.
- mypy is deliberately not a hook because it is too slow for a commit. Backend changes
  MUST pass `uv run mypy app/` before being pushed.
- A change to any Node package MUST pass `npm run lint`, `npm test`, and `npm run build`
  for the workspace, run from the root, before being pushed: a change in `api-types/` or
  `rules/` must compile in both consumers.
- Tool configuration MUST live in the existing config files. In particular, a
  `backend/pytest.ini` MUST NOT be added — it takes precedence over and silently
  shadows the `[tool.pytest.ini_options]` block — and a `vitest.config.ts` MUST NOT be
  added beside a `vite.config.ts` (`frontend/`, `mcp/`), because it takes precedence over
  that file's `test` block in the same way. `rules/` has no Vite build, so its Vitest
  configuration is `rules/vitest.config.ts`.
- Vitest is the test runner of the Node packages. It runs in the `node` environment and
  tests pure logic: functions that need neither React nor the browser, such as
  `rules/src/` in full, the sibling `utils.ts` files of the SPA's components and the MCP
  server's modules, plus the MCP server itself against an in-memory fake backend. jsdom
  and DOM testing libraries are not part of the stack. A test sits next to the module it
  tests as `<module>.test.ts` (the MCP server's integration tests in `mcp/test/`), and
  `npm test` runs them all once, without watching.
- Backend tests use pytest in `backend/tests/`: unit tests, and API tests against a
  PostgreSQL database whose name ends in `_test`, which they empty. They are a practice,
  not a gate: backend changes SHOULD add or update them and run `uv run pytest`, but
  passing it is not a condition for merging.
- Neither suite has a numeric coverage target.

Rationale: this is a template that many teams fork. Gates that run automatically stay
true across forks; gates that depend on someone remembering do not. Logic that runs only
in the browser or in the MCP server has no other automated check before a person tries
it, so the Node packages' tests are a gate. Keeping them to pure functions in Node keeps
`npm test` fast and needs no browser. The backend's tests need a dedicated database,
which not every environment that runs the gates has, so they stay a practice.

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
for the SPA; FastAPI on Python 3.13+ with SQLAlchemy 2, Alembic, psycopg 3, and
Pydantic 2 for the backend; PostgreSQL 18; Node 22+ for the MCP server, built with Vite's
SSR build and run in its own container; Vitest for every Node package's tests. Swapping
any element of the stack requires an amendment, not a pull request.

The repository is an npm workspace. The root `package.json` holds only the `workspaces`,
the scripts that run over them and the pre-commit `prepare`, and declares no dependency
of its own. The Node packages are `api-types/` (the TypeScript mirrors of
`backend/app/schemas.py`), `rules/` (the pure rules logic), `frontend/` (the SPA) and
`mcp/` (the MCP server). `api-types` imports nothing, `rules` imports `api-types`, and
`frontend` and `mcp` import both and never each other; the root ESLint configuration
enforces these boundaries. The packages are consumed as source through their `exports`;
nothing is emitted. There is one lockfile at the root, one root ESLint and Prettier
configuration with a block per package, and a `tsconfig.base.json` that each package
extends.

Layout is prescribed and MUST be respected: backend code in `backend/app/` with routers
under `app/routers/` (one module per resource), and the database module is `app/db.py`,
never `app/database.py`. Frontend code is organised into `src/api/`, `src/components/`,
`src/pages/`, `src/hooks/`, `src/utils/`, and `src/workers/` (the browser Worker entries);
`frontend/src/` holds neither `types/` nor `utils/rules/`, which live in `api-types/src/`
and `rules/src/`. The MCP server is `mcp/src/`, with its guidance in `mcp/plugin/` and its
integration tests in `mcp/test/`.

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
frontend then follows: TypeScript interfaces in `api-types/src/` → fetch functions in
`src/api/` → React components.

Before a change is proposed for merge:

1. Pre-commit hooks MUST have run (they run automatically on commit).
2. `uv run mypy app/` MUST pass for backend changes.
3. `npm run lint`, `npm test`, and `npm run build` MUST pass for the workspace, from the
   root, for a change to any Node package.
4. The documentation checklist in `CLAUDE.md` MUST be applied: new environment
   variables update `README.md`, `docs/ARCHITECTURE.md`, and the `.env.example` files;
   new patterns update `CLAUDE.md`; architectural changes update
   `docs/ARCHITECTURE.md`; new dependencies are documented in `README.md` with the
   reason they were added.

The backend's tests are not a gate, and the Node packages' tests cover pure logic and the
MCP server against a fake backend only (Principle III). A change that the gates above
cannot check MUST be exercised manually against a running stack (`docker compose up`)
and the verification described in the pull request.

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

**Version**: 1.2.0 | **Ratified**: 2026-09-02 | **Last Amended**: 2026-11-05
