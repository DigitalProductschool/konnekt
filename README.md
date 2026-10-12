# serviceBW ↔ EUDI Wallet Middleware

Middleware that lets the DO.IT team of the City of Stuttgart connect serviceBW forms to the EUDI
Wallet. For each form, DO.IT creates a form connection that names the documents and fields the
form needs. serviceBW then uses the form connection's URLs to request those documents from the
citizen's wallet, through the team's EUDIPLO instance, and receives only the configured fields.

The middleware is built in phases. The specification, the plan and the task list are in
[specs/001-servicebw-eudi-middleware/](specs/001-servicebw-eudi-middleware/). The code base
started from the Digital Product School React + FastAPI + PostgreSQL template.

## Tech Stack

- **Frontend**: React 19, Vite 7, TypeScript, Tailwind CSS 4, React Router 7, KERN design system
- **Backend**: FastAPI (Python 3.13+), SQLAlchemy 2, Alembic, psycopg 3
- **Database**: PostgreSQL 18
- **External service**: EUDIPLO 9, which talks to the citizens' wallets ([docs/EUDIPLO.md](docs/EUDIPLO.md))
- **Tooling**: ESLint 9, Prettier, Ruff, mypy, pytest, pre-commit, uv (Python), Docker

### Dependencies added to the template

| Package | Where | Why |
|---|---|---|
| `argon2-cffi` | backend | Argon2id hashes for the DO.IT team members' passwords |
| `httpx2` | backend (moved from the `dev` group) | Synchronous HTTP client for the EUDIPLO management API. FastAPI's `TestClient` needs it too, and its `MockTransport` provides the fake EUDIPLO in the tests |
| `segno` | backend | Renders the QR code that serviceBW shows the citizen, a PNG data URI of the wallet link for another device. Pure Python, and writes PNG without Pillow |
| `pytest` | backend, `dev` group | Runs the backend tests |
| `react-router` | frontend | Routes of the management UI, so that a form connection has its own URL |
| `@kern-ux/native` | frontend | KERN's CSS, design tokens and Fira Sans font files. KERN is the design system for German public administration ([docs/KERN-DESIGN-SYSTEM.md](docs/KERN-DESIGN-SYSTEM.md)) |
| `@kern-ux-annex/kern-react-kit` | frontend | KERN's React components, built for WCAG 2.1 AA, which the management UI must meet. Its own stylesheet is not imported, see [docs/KERN-DESIGN-SYSTEM.md](docs/KERN-DESIGN-SYSTEM.md) §2 |
| `@digitalservicebund/kern-ux-tailwind-theme` | frontend | Maps KERN's design tokens to Tailwind classes |

The three KERN packages and `react-router` are pinned to exact versions; for KERN, a version
mismatch between the packages is the most likely cause of visual breakage.

## Project Structure

```
├── frontend/              # React SPA (Vite + TypeScript): the DO.IT management UI
├── backend/               # FastAPI API (Python + SQLAlchemy)
│   ├── app/              # Application source code
│   │   ├── routers/      # API route handlers, one module per resource
│   │   ├── services/     # Domain logic shared by the routers and the worker
│   │   ├── cli.py        # Account management (create-user, set-password, delete-user)
│   │   ├── config.py     # Settings management
│   │   ├── db.py         # Database connection
│   │   ├── models.py     # SQLAlchemy models
│   │   ├── schemas.py    # Pydantic schemas
│   │   ├── errors.py     # Error handlers
│   │   └── main.py       # FastAPI app entry point, starts the background worker
│   ├── alembic/          # Database migrations
│   ├── tests/            # pytest suite, with a fake EUDIPLO
│   ├── pyproject.toml    # Python dependencies + ruff/mypy/pytest config
│   ├── .python-version   # Pins the interpreter uv provisions (3.13)
│   └── uv.lock          # Lock file for dependencies
├── docs/                  # Architecture, EUDIPLO and KERN docs
├── specs/                 # Specification, plan and tasks (Spec Kit)
├── .pre-commit-config.yaml # Git hooks (ruff, prettier, eslint)
└── docker-compose.yml     # Local development
```

## Quick Start

### Prerequisites

- **Frontend**: Node.js 20+ and npm 9+
- **Backend**: Python 3.13+ and [uv](https://docs.astral.sh/uv/) (Python package manager)
- **Database**: Docker and Docker Compose

### Install uv (Python package manager)

```bash
# macOS/Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

# Windows
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"

# Or with pip
pip install uv
```

### Local Development

#### Option 1: Run with Docker Compose (Recommended)

```bash
# Settings for the backend, such as the EUDIPLO credentials (optional for a first start)
cp backend/.env.example backend/.env

# Start all services (PostgreSQL, backend, frontend)
docker compose up

# In another terminal: create your sign-in account (see Accounts below)
docker compose exec backend uv run python -m app.cli create-user <username>
```

This starts everything with hot reload:
- Frontend: http://localhost:5173. Use `localhost`, not `127.0.0.1`: the sign-in cookie and
  the CORS setting depend on the host name
- Backend API: http://localhost:3000
- API Docs: http://localhost:3000/docs

The backend container reads `backend/.env` if it exists; the values set in
`docker-compose.yml` take precedence.

#### Option 2: Run Locally with Docker Database

1. Start PostgreSQL only
```bash
docker compose up postgres -d
```
2. Set up backend
```bash
cd backend
cp .env.example .env  # Create if needed
uv sync                # Install Python dependencies
```

3. Run database migrations and create your account
```bash
uv run alembic upgrade head
uv run python -m app.cli create-user <username>
```

4. Start backend server
```bash
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 3000
```

5. In another terminal, set up frontend
```bash
cd frontend
npm install
npm run dev
```

#### Option 3: Full Local Development (No Docker)

Install and run PostgreSQL locally, then update backend `.env` with your local database URL:
```
DATABASE_URL=postgresql+psycopg://user:password@localhost:5432/dbname
```

Then follow Option 2 steps for backend and frontend.

### Accounts

DO.IT team members sign in with personal accounts. The management UI has no account
management: the operators manage accounts with the command-line tool, run from `backend/`
(prefix it with `docker compose exec backend` when the backend runs in Docker):

```bash
uv run python -m app.cli create-user <username>   # asks for the password twice
uv run python -m app.cli set-password <username>  # also ends the account's sign-ins
uv run python -m app.cli delete-user <username>   # also deletes its sign-ins
```

Usernames are stored in lowercase and have 3 to 100 characters from `a–z 0–9 . _ -`.
Passwords need at least 12 characters. A sign-in lasts `LOGIN_SESSION_HOURS` (8 hours).
The sign-in screen's "Forgot password?" page asks team members to contact an administrator,
who sets a new password with `set-password`.

## Common Commands

### Backend (Python + uv)

```bash
cd backend

# Install dependencies (the `dev` group — ruff, mypy, pytest — is included by default)
uv sync

# Install runtime dependencies only, as production images do
uv sync --no-dev

# Run development server
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 3000

# Linting/formatting
uv run ruff check .          # Lint
uv run ruff check --fix .    # Fix lint issues
uv run ruff format .         # Format code

# Type checking
uv run mypy app/ tests/

# Tests. They empty their database, so they only run against one whose name ends in _test
docker compose exec postgres createdb -U postgres template_db_test   # once
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5435/template_db_test uv run pytest

# Database migrations
uv run alembic revision --autogenerate -m "description"
uv run alembic upgrade head
```

The tests replace EUDIPLO with a fake and switch the background worker off, so they need
neither EUDIPLO credentials nor a wallet.

### Frontend (React + Vite)

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Linting/formatting
npm run lint          # ESLint
npm run lint:fix      # ESLint with --fix
npm run format        # Prettier, writes changes
npm run format:check  # Prettier, reports without writing
```

### Docker

```bash
# Start all services
docker compose up

# Start in background
docker compose up -d

# Stop all services
docker compose down

# Stop and remove volumes (⚠️ deletes database data)
docker compose down -v

# Rebuild containers
docker compose build

# View logs
docker compose logs -f
```

## Code Quality

Linting and code formatting is set up for both parts of the stack. The tools are already configured, you only need to point your editor at them (see [Format on save](#format-on-save)).

### What runs where

- **Backend** — [Ruff](https://docs.astral.sh/ruff/) both lints (rule sets `E`, `F`, `I`
  — pycodestyle, pyflakes, isort) and formats (88 columns, single quotes). mypy handles
  type checking. All three are configured in `backend/pyproject.toml`.
- **Frontend** — ESLint 9 (flat config, `frontend/eslint.config.mjs`) handles code rules:
  React, React Hooks, react-refresh, and `simple-import-sort` for import ordering.
  Prettier (`frontend/.prettierrc`) handles formatting: single quotes, semicolons, 100
  columns, 2-space indent, ES5 trailing commas, and Tailwind class sorting via
  `prettier-plugin-tailwindcss`.

### Git hooks (pre-commit)

The hooks in `.pre-commit-config.yaml` run on every `git commit`:

- `ruff check --fix` and `ruff format` on Python files
- `prettier --write` and `eslint --fix` on `frontend/` files
- trailing whitespace, end-of-file newline, merge conflict markers, large files

Installation is automatic — `npm install` in `frontend/` runs a `prepare` script that
calls `uv run pre-commit install` in `backend/`, so the frontend install is what wires up
the hooks for the whole repo. It needs `uv` on your PATH; if `uv` was missing at install
time the script exits quietly and you must install the hooks yourself:

```bash
cd backend

# Install the hooks
uv run pre-commit install

# Run every hook against the whole repository
uv run pre-commit run --all-files

# Update the pinned hook versions
uv run pre-commit autoupdate
```

### Format on save

#### VS Code

1. Install these extensions:
   - `charliermarsh.ruff` — Ruff (Python lint + format)
   - `esbenp.prettier-vscode` — Prettier
   - `dbaeumer.vscode-eslint` — ESLint
2. Create `.vscode/settings.json` in the repository root:

   ```json
   {
     "eslint.workingDirectories": ["frontend"],
     "prettier.prettierPath": "frontend/node_modules/prettier",
     "python.defaultInterpreterPath": "backend/.venv/bin/python",
     "editor.codeActionsOnSave": {
       "source.fixAll.eslint": "explicit"
     },
     "[python]": {
       "editor.defaultFormatter": "charliermarsh.ruff",
       "editor.formatOnSave": true,
       "editor.codeActionsOnSave": {
         "source.fixAll.ruff": "explicit",
         "source.organizeImports.ruff": "explicit"
       }
     },
     "[javascript]": {
       "editor.defaultFormatter": "esbenp.prettier-vscode",
       "editor.formatOnSave": true
     },
     "[typescript]": {
       "editor.defaultFormatter": "esbenp.prettier-vscode",
       "editor.formatOnSave": true
     },
     "[typescriptreact]": {
       "editor.defaultFormatter": "esbenp.prettier-vscode",
       "editor.formatOnSave": true
     },
     "[css]": {
       "editor.defaultFormatter": "esbenp.prettier-vscode",
       "editor.formatOnSave": true
     },
     "[json]": {
       "editor.defaultFormatter": "esbenp.prettier-vscode",
       "editor.formatOnSave": true
     },
     "[markdown]": {
       "editor.defaultFormatter": "esbenp.prettier-vscode",
       "editor.formatOnSave": true
     }
   }
   ```

Two things to watch for, both caused by this repository having no root `package.json`:

- `eslint.workingDirectories` is required. The flat config lives in `frontend/`, so
  without it ESLint reports "could not find config file" for every file when you open the
  workspace at the repository root.
- Select `backend/.venv` as your Python interpreter (**Python: Select Interpreter** in the
  command palette). The Ruff extension resolves `pyproject.toml` from the interpreter's
  project, and picks up the wrong defaults without it.

#### JetBrains (WebStorm / PyCharm)

Open settings with `⌘,` on macOS or `Ctrl+Alt+S` on Windows/Linux.

1. **Prettier** — *Languages & Frameworks > JavaScript > Prettier*. Set **Prettier
   package** to `frontend/node_modules/prettier`, set **Run for files** to
   `frontend/**/*.{js,mjs,cjs,ts,tsx,jsx,css,json,md}`, and tick **On save**.
2. **ESLint** — *Languages & Frameworks > JavaScript > Code Quality Tools > ESLint*.
   Choose **Automatic ESLint configuration** and tick **Run eslint --fix on save**.
3. **Ruff** — install the *Ruff* plugin from *Plugins > Marketplace*, then open
   *Tools > Ruff*. Point **Path to Ruff config** at `backend/pyproject.toml`, tick **Use
   Ruff formatter**, and tick **Run Ruff when the file is saved**. Set the project
   interpreter to `backend/.venv` (*Project > Python Interpreter*, PyCharm only) so the
   plugin finds the `ruff` binary that `uv sync` installed.

## Environment Variables

### Backend (`backend/.env`)

```bash
# Use port 5435 from the host, 5432 from inside Docker
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5435/template_db
PORT=3000
CORS_ORIGIN=http://localhost:5173
APP_ENV=development
```

The driver must be `postgresql+psycopg` (psycopg 3).

The middleware's own settings:

| Variable | Purpose | Default |
|---|---|---|
| `CONNECTION_BASE_URL` | Base URL that serviceBW uses to reach the middleware; the connection URLs are built from it | `http://localhost:3000` in development. **Required** in any other environment, where it must use `https://` unless `ALLOW_PLAIN_HTTP=true`: otherwise the backend refuses to start |
| `EUDIPLO_URL` | Base URL of the EUDIPLO instance, without `/api` | empty: every EUDIPLO call answers `503 Not configured` |
| `EUDIPLO_CLIENT_ID` / `EUDIPLO_CLIENT_SECRET` | The middleware's EUDIPLO API client (see [EUDIPLO](#eudiplo)) | empty: `503` likewise |
| `EUDIPLO_TRUST_LIST_ID` | Trust list that every credential query uses to check the issuers | empty: saving a form connection answers `503` |
| `REQUEST_LIFETIME_SECONDS` | Expiry of a document request | `600` |
| `DOCUMENT_RETENTION_SECONDS` | Longest time shared documents stay in EUDIPLO, and the webhook retry limit | `1800` |
| `PULL_REPEAT_WINDOW_SECONDS` | How long repeated pulls return the same documents after the first delivery | `60` |
| `REQUEST_RECORD_RETENTION_SECONDS` | How long a request record is kept after the request ended | `604800` (7 days) |
| `ALLOW_PLAIN_HTTP` | Allows `http://` for webhook addresses, and for `CONNECTION_BASE_URL` outside development. Only for a closed network | `false` |
| `WORKER_ENABLED` | Runs the background worker thread (the tests switch it off) | `true` |
| `LOGIN_SESSION_HOURS` | How long a DO.IT sign-in lasts | `8` |

See `backend/.env.example` for the authoritative list. Settings are loaded by
`app/config.py` via pydantic-settings; add a field there before adding a new
variable, or it will be ignored.

### Frontend (`frontend/.env`)

```bash
VITE_API_URL=http://localhost:3000
```

### Frontend container (production nginx)

Set on the `frontend` service of `docker-compose.prod.yml`, for example in Coolify. They don't
apply to local development, where the backend's port 3000 is reachable directly.

| Variable | Purpose | Default |
|---|---|---|
| `BACKEND_HOST` | Host name of the backend container, which nginx forwards `/api/` to | `backend` (`${SERVICE_NAME_BACKEND}` in Coolify) |
| `SERVICEBW_ALLOWED_CIDRS` | Comma-separated address ranges that may call the connection URLs under `/api/connect/`, such as `203.0.113.0/24,2001:db8::/32`. Everyone else gets `403` from nginx | empty: `/api/connect/` answers `403` to everyone |
| `TRUSTED_PROXY_CIDRS` | Comma-separated address ranges of the proxy in front of nginx (Coolify's Traefik). Only requests from there may give the client's address in `X-Forwarded-For`, which the allow-list then checks | empty: the connecting address counts |

At container start, `frontend/nginx/40-servicebw-access.sh` turns the two lists into nginx
`allow` and `set_real_ip_from` rules. An entry that isn't an address or a range stops the
container. Request references never reach nginx's logs: the access log shows
`/requests/<reference>` instead.

## EUDIPLO

The middleware uses the team's hosted EUDIPLO (tenant `dps`) through its management API, and
never exposes the management token to the browser. The tenant needs, set up by its operators
([contracts/eudiplo-usage.md](specs/001-servicebw-eudi-middleware/contracts/eudiplo-usage.md)):

- an **API client** with the roles `presentation:request` and `presentation:manage` and an
  empty `allowedPresentationConfigs`: the middleware creates a presentation configuration for
  every form connection revision, and an allow-list would reject each new one. Its id and
  secret go into `EUDIPLO_CLIENT_ID` and `EUDIPLO_CLIENT_SECRET`;
- an active **access key chain**, which EUDIPLO uses to sign every request to a wallet;
- a **trust list** whose entities carry the PID and EAA issuance services and the revocation
  certificates of the accepted issuers. Its id goes into `EUDIPLO_TRUST_LIST_ID`;
- session logs (`LOG_SESSION_STORE`) that don't keep claims.

All environments share tenant `dps` for now, an accepted risk: production should get its own
tenant before real citizens use the service. The API details are in
[docs/EUDIPLO.md](docs/EUDIPLO.md).

## Spec-Driven Development with Spec Kit

This template supports [GitHub Spec Kit](https://github.com/github/spec-kit). Spec Kit is **not pre-installed in this repo**. Basic constitution is included, update it regularly after changing README.md and CLAUDE.md.

### Installation

1. From the **root of your cloned repository**, run:

```bash
uvx --from git+https://github.com/github/spec-kit.git specify init --here
```
The installer will ask which **AI agent** you use — pick the one you actually work with. This determines where the slash-command files are placed (e.g. `.claude/commands/` for Claude Code, `.github/prompts/` for Copilot).
2. If asked for a **script type**, choose `sh` on macOS/Linux and `ps` on Windows.
3. If it warns that the directory is not empty, confirm — it only adds files, it doesn't touch your code.
4. Follow steps in spec-kit repository to create specifications and implement features.

## Deployment

### Deploy to Coolify

The whole stack (frontend + backend + PostgreSQL) deploys as a **single
docker-compose resource** defined in `docker-compose.prod.yml`. Only the
frontend gets a public domain: its nginx serves the SPA and proxies `/api`
(plus `/docs` and `/openapi.json`) to the backend over the internal network, so
there is no CORS configuration and no API URL baked into the frontend build.

#### 1. Create the resource

1. In Coolify, create a new resource from this repository and choose the
   **Docker Compose** build pack
2. Set the compose file location to `docker-compose.prod.yml`
3. After Coolify parses the file, assign a domain to the **frontend** service
   (e.g., `https://my-team.dpschool.app`); leave backend and postgres without a
   domain — they stay internal
4. Coolify auto-generates `SERVICE_PASSWORD_POSTGRES` (the database password)
   and `SERVICE_FQDN_FRONTEND`. Set the middleware's variables in the Coolify
   environment: `CONNECTION_BASE_URL` (the `https://` address serviceBW uses;
   the backend refuses to start without it) and the four `EUDIPLO_*` variables.
   For the frontend, set `SERVICEBW_ALLOWED_CIDRS` (serviceBW's address ranges)
   and `TRUSTED_PROXY_CIDRS` (Traefik's network): until then, the connection
   URLs answer `403` to everyone. The others have defaults (see
   [Environment Variables](#environment-variables))
5. Deploy
6. Create the first account in the backend container (Coolify: the backend
   service's terminal): `uv run python -m app.cli create-user <username>`

The backend container runs `alembic upgrade head` on start, so the database
schema is migrated automatically. `APP_ENV` is set to `production` in the
compose file (anything else exposes exception details in error responses).

The UI must be served over HTTPS, which Coolify's Traefik provides: outside
development the sign-in cookie is `Secure`, and the browser only allows copying
to the clipboard on secure pages.

#### 2. Enable preview deployments (optional)

Each pull request can get its own full stack — frontend, backend, and an
isolated, empty database — that is created on PR open and removed on close.

1. Prerequisites:
   - The repository is connected via Coolify's **GitHub App** integration
     (plain webhooks work, but you won't get PR comments with the preview link)
   - A **wildcard DNS record** for the domain (e.g., `*.my-team.dpschool.app`)
     pointing at the Coolify server
   - A reasonably current Coolify v4 (per-service preview domains and per-PR
     volume suffixes for compose apps are recent features)
2. In the resource, open **Preview Deployments** and enable them; the default
   URL template `{{pr_id}}.{{domain}}` gives previews like
   `https://123.my-team.dpschool.app`
3. Mind server capacity: every open PR runs three extra containers, including
   its own PostgreSQL
4. Previews run with `APP_ENV=production` too, so set `CONNECTION_BASE_URL` in
   the preview environment variables as well, or the preview backend won't start.
   Their connection URLs stay closed (`403`) unless `SERVICEBW_ALLOWED_CIDRS` is
   set for them too

Preview databases start empty (schema only, via migrations on startup), so a
preview needs its own account, created as in step 6 above.

#### Tradeoffs of the single-resource setup

- The production database is a container inside the compose stack, persisted in
  the `postgres-data` volume. Coolify's managed database backup UI does **not**
  apply — arrange backups yourself if the data matters, and be aware that
  deleting the resource deletes the volume
- Every deploy restarts the whole stack, including PostgreSQL (brief downtime)
- The frontend and backend cannot be deployed or rolled back independently

## Project Guidelines

- See [CLAUDE.md](CLAUDE.md) for AI agent coding instructions and patterns
- See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for architecture details
