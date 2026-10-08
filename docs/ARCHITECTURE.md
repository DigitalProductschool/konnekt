# Architecture Documentation

## System Overview

Two independently built and deployed applications — a React SPA and a FastAPI
service — sharing a PostgreSQL database. There is no monorepo tooling and no
root `package.json`; each side manages its own dependencies.

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│    Frontend     │────▶│    Backend      │────▶│   PostgreSQL    │
│   (React/Vite)  │     │   (FastAPI)     │     │   (Database)    │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

Types are **not** shared at build time. `frontend/src/types/api.ts` declares
TypeScript interfaces that mirror the Pydantic schemas in
`backend/app/schemas.py` by hand — when you change one, change the other.

This repository is being turned into the serviceBW ↔ EUDI Wallet middleware. Its
target architecture, with EUDIPLO, a background worker and an nginx allow-list, is
in [the plan](../specs/001-servicebw-eudi-middleware/plan.md). This document
describes what is implemented so far.

### Data Flow

1. User interacts with the React frontend
2. Frontend calls the backend API via fetch functions in `frontend/src/api/`
3. FastAPI validates the request body against a Pydantic schema
4. The route handler queries via a SQLAlchemy `Session` injected by `Depends(get_db)`
5. psycopg 3 communicates with PostgreSQL
6. Response flows back: Database → SQLAlchemy → FastAPI → Frontend → User

## Repository Structure

```
dps-react-python-template/
├── frontend/              # React SPA (Vite)
│   ├── eslint.config.mjs  # ESLint 9 flat config
│   └── .prettierrc        # Prettier formatting rules
├── backend/               # FastAPI API (SQLAlchemy + Alembic)
├── docs/                  # Architecture docs
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
`uv run mypy app/` yourself before pushing backend changes. See the `Code Quality`
section of `README.md` for the full command list and editor format-on-save setup.

## Application Details

### frontend

**Tech Stack**: React 19, Vite 7, Tailwind CSS 4, TypeScript, KERN design system

```
frontend/
├── src/
│   ├── api/              # client.ts (base URL, ApiError, handleResponse), one module per resource
│   ├── pages/            # Page components
│   ├── types/            # TypeScript interfaces mirroring backend schemas
│   ├── fonts/            # Self-hosted fonts (Plus Jakarta Sans)
│   ├── App.tsx           # Root component
│   ├── main.tsx          # Entry point
│   └── index.css         # Global styles + Tailwind theme
├── vite.config.ts        # Vite configuration
├── nginx.conf            # Serves the production build, proxies /api to the backend
└── package.json
```

**Key Decisions**:
- Vite for fast HMR and optimized builds
- Tailwind 4 with `@theme` directive for design tokens
- Self-hosted fonts for GDPR compliance
- Native fetch for API calls (no axios dependency). Shared helpers live in
  `src/api/client.ts`: `API_BASE_URL`, `handleResponse`, and the `ApiError` it
  throws for `{error, message}` bodies
- KERN design system: `index.css` imports KERN's CSS after Tailwind, followed by
  the KERN Tailwind theme, which maps KERN's design tokens to Tailwind classes.
  The order matters (`docs/KERN-DESIGN-SYSTEM.md`)

### backend

**Tech Stack**: FastAPI, SQLAlchemy 2, Alembic, psycopg 3, Pydantic 2, Python 3.13

```
backend/
├── app/
│   ├── routers/          # APIRouter modules (one per resource)
│   ├── config.py         # Settings via pydantic-settings
│   ├── db.py             # Engine, sessionmaker, get_db dependency
│   ├── models.py         # SQLAlchemy models
│   ├── schemas.py        # Pydantic request/response schemas
│   ├── errors.py         # Exception handlers
│   └── main.py           # FastAPI app entry point
├── alembic/              # Database migrations
├── tests/                # pytest suite
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
  surfacing as errors on first query.
- Dependencies are declared in `pyproject.toml` and pinned in `uv.lock`. Both
  Dockerfiles install with `uv sync --frozen`, so a stale lockfile fails the
  build instead of silently resolving different versions.
- Only libraries the code imports are declared. `pyproject.toml` carries a
  commented list of common additions (Supabase, Anthropic, JWT, password
  hashing, file uploads) with current version floors.

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
  "message": "Human-readable error description"
}
```

### Error Handling

**Backend**: `register_exception_handlers` in `backend/app/errors.py` installs three
handlers on the app:

| Exception | Status | Behaviour |
|-----------|--------|-----------|
| `HTTPException` | as raised | Passes a `{error, message}` dict detail through unchanged; otherwise wraps it |
| `RequestValidationError` | **400** | Returns a generic message (FastAPI's default would be 422 with field details) |
| `Exception` | 500 | Generic message; includes `exception.args[0]` only when `APP_ENV=development` |

```python
# Route handler pattern — raise, don't catch
raise HTTPException(
    status_code=404,
    detail={"error": "Not found", "message": "Form connection not found"},
)
```

Because the catch-all handler leaks exception text in development, **`APP_ENV`
must be set to something other than `development` in production**.

**Frontend**: the `ApiError` class in `src/api/client.ts` wraps HTTP errors with
status and response data.

```typescript
class ApiError extends Error {
  constructor(status: number, data: ApiErrorResponse) {
    super(data.message);
    this.name = 'ApiError';
  }
}
```

### Database Conventions

- Primary keys: UUID4 as a `String(36)`, generated in Python via `default=lambda: str(uuid.uuid4())`
- Timestamps: `created_at` / `updated_at`, both `DateTime(timezone=True)` with `server_default=func.now()`
- Column and table names: `snake_case` (`servicebw_form`, `form_connections`)
- Unique constraints: `unique=True` on `mapped_column`
- Optional fields: `Mapped[str | None]` with `nullable=True`
- Migrations are generated with `alembic revision --autogenerate` and must be
  reviewed before committing — autogenerate does not detect every change

Integrity errors are translated to HTTP status codes in the router by inspecting
the `psycopg` error (e.g. `UniqueViolation` → 409).

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

### Frontend

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API base URL (local development only; unset in production, where the app calls the relative `/api` path) | `/api` |

`VITE_API_URL` is inlined by Vite at build time. The production image does not
set it, so the bundle calls its own origin and nginx forwards the request — the
same image works for any domain, which is what makes preview deployments
possible.

## Docker Development

The `docker-compose.yml` orchestrates three services:

1. **postgres**: PostgreSQL 18 (`postgres:18-alpine`) with health checks, published on host port **5435**
2. **backend**: FastAPI via uvicorn `--reload`, depends on postgres, exposes port 3000
3. **frontend**: Vite dev server, depends on backend, exposes port 5173

Both images build with the repository root as context, so the root
`.dockerignore` is the only one Docker reads. Volumes enable hot reload by
mounting source directories. The backend container runs
`alembic upgrade head` on start.

## Production Deployment (Coolify)

Production uses `docker-compose.prod.yml`, deployed as a **single Coolify
resource**. The topology differs from local dev in one important way: the
frontend's nginx is the only publicly reachable service and acts as the API
gateway.

```
                 https://my-team.dpschool.app
                            │
                            ▼
                 ┌─────────────────────┐
                 │  frontend (nginx)   │
                 │  /      → SPA files │
                 │  /api/* → proxy ────┼───▶ backend:3000 ───▶ postgres:5432
                 └─────────────────────┘      (internal)        (internal)
```

Consequences of this design:

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
