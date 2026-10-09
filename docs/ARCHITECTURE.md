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
target architecture, with form connections, document requests, webhook updates
and an nginx allow-list, is in
[the plan](../specs/001-servicebw-eudi-middleware/plan.md). This document
describes what is implemented so far: the data model, DO.IT sign-in, the
EUDIPLO client (not called by an endpoint yet), the worker with its first step,
and the management UI's sign-in screen and app shell.

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
`uv run mypy app/` yourself before pushing backend changes. See the `Code Quality`
section of `README.md` for the full command list and editor format-on-save setup.

## Application Details

### frontend

**Tech Stack**: React 19, Vite 7, Tailwind CSS 4, TypeScript, React Router 7, KERN design system

```
frontend/
├── src/
│   ├── api/              # client.ts (apiFetch, ApiError), one module per resource (auth.ts)
│   ├── assets/icons/     # SVG glyphs exported from the Figma design
│   ├── components/       # App shell (AppLayout, TopBar, UserMenu, PageTitle), route guard,
│   │                     # sign-in state provider, shared form pieces
│   ├── hooks/            # useCurrentUser (sign-in state), useDocumentTitle
│   ├── pages/            # One folder per screen (Login, and placeholders for later screens)
│   ├── types/            # TypeScript interfaces mirroring backend schemas
│   ├── constants.ts      # App name, routes, the KERN kit's English texts
│   ├── App.tsx           # Routes
│   ├── main.tsx          # Entry point: router, KERN context, sign-in state
│   └── index.css         # Tailwind, KERN, and the project's design tokens
├── vite.config.ts        # Vite configuration
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
  users to `/login` and back to the requested route afterwards; nginx already falls
  back to `index.html` for client-side routes
- Sign-in state lives in `CurrentUserProvider`, which asks `GET /api/auth/me` once;
  components read it with `useCurrentUser()`
- KERN design system: `index.css` imports Tailwind, KERN's fonts, `kern.css` and the
  KERN Tailwind theme, in that order. The React kit's own stylesheet is not imported,
  because it bundles an older KERN whose rules override KERN 2.8 (`docs/KERN-DESIGN-SYSTEM.md`
  §2). `index.css` also keeps KERN's adaptive type at its small-screen values on every
  width, as the Figma design uses it, and adds the shadow tokens KERN lacks
- The visual design comes from Figma; `specs/001-servicebw-eudi-middleware/design-notes.md`
  records the screens, tokens and decisions

### backend

**Tech Stack**: FastAPI, SQLAlchemy 2, Alembic, psycopg 3, Pydantic 2, Python 3.13

```
backend/
├── app/
│   ├── routers/          # APIRouter modules (one per resource): auth.py
│   ├── services/         # Domain logic shared by routers and worker:
│   │                     # auth.py (sign-in), eudiplo.py (EUDIPLO client), worker.py
│   ├── cli.py            # Account management: create-user, set-password, delete-user
│   ├── config.py         # Settings via pydantic-settings, with the startup check
│   ├── db.py             # Engine, sessionmaker, get_db dependency
│   ├── models.py         # SQLAlchemy models
│   ├── schemas.py        # Pydantic request/response schemas
│   ├── errors.py         # Exception handlers
│   └── main.py           # FastAPI app entry point; its lifespan runs the worker
├── alembic/              # Database migrations
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
Not configured` naming the missing setting, or `502 Upstream error`. It never logs
tokens, secrets, response bodies or session credentials; a validation error, which
would quote the body, is replaced by a terse one. Tests swap in a client with an
`httpx2.MockTransport` (`tests/fake_eudiplo.py`).

### Background worker

`app/services/worker.py` runs a daemon thread, started and stopped by the FastAPI
lifespan when `WORKER_ENABLED` is true. Every 2 seconds it runs the registered
steps, which are plain functions that open their own `SessionLocal()` sessions and
keep transactions short. A failing step is logged by exception type and code
location only, never its message, and the next step still runs. Outbound calls go
to a pool of 8 threads through `dispatch(key, call)`, so the loop never waits for
them, and a key that is still in flight isn't dispatched twice.

Implemented steps: deleting expired sign-in sessions. The steps for document
requests, webhooks and EUDIPLO clean-up follow with later user stories (research
R7 in the spec folder lists them in order). The production image runs one uvicorn
process, so there is one worker thread; row locks and leases keep later steps
correct if that changes.

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
[data-model.md](../specs/001-servicebw-eudi-middleware/data-model.md). No table
holds a citizen's documents.

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
| `DOCUMENT_RETENTION_SECONDS` | Longest time shared documents stay in EUDIPLO; webhook retry limit | `1800` |
| `PULL_REPEAT_WINDOW_SECONDS` | How long repeated pulls return the same documents | `60` |
| `REQUEST_RECORD_RETENTION_SECONDS` | How long a request record is kept after the request ended | `604800` |
| `ALLOW_PLAIN_HTTP` | Allows `http://` for webhook addresses and for `CONNECTION_BASE_URL` outside development (closed networks only) | `false` |
| `WORKER_ENABLED` | Runs the background worker thread | `true` |
| `LOGIN_SESSION_HOURS` | How long a DO.IT sign-in lasts | `8` |

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
                 ┌─────────────────────┐
                 │  frontend (nginx)   │
                 │  /      → SPA files │
                 │  /api/* → proxy ────┼───▶ backend:3000 ───▶ postgres:5432
                 └─────────────────────┘      (internal)        (internal)
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
