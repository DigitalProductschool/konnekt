# serviceBW ↔ EUDI Wallet Middleware

Middleware that lets the DO.IT team of the City of Stuttgart connect serviceBW forms to the EUDI
Wallet. For each form, DO.IT creates a form connection that names the documents and fields the
form needs. serviceBW then uses the form connection's URLs to request those documents from the
citizen's wallet, through the team's EUDIPLO instance, and receives only the configured fields.

The middleware is built in phases. The specification, the plan and the task list are in
[specs/001-servicebw-eudi-middleware/](specs/001-servicebw-eudi-middleware/). The code base
started from the Digital Product School React + FastAPI + PostgreSQL template.

## Tech Stack

- **Frontend**: React 19, Vite 7, TypeScript, Tailwind CSS 4, KERN design system
- **Backend**: FastAPI (Python 3.13+), SQLAlchemy 2, Alembic, psycopg 3
- **Database**: PostgreSQL 18
- **Tooling**: ESLint 9, Prettier, Ruff, mypy, pytest, pre-commit, uv (Python), Docker

### Dependencies added to the template

| Package | Where | Why |
|---|---|---|
| `pytest` | backend, `dev` group | Runs the backend tests |
| `@kern-ux/native` | frontend | KERN's CSS and design tokens. KERN is the design system for German public administration ([docs/KERN-DESIGN-SYSTEM.md](docs/KERN-DESIGN-SYSTEM.md)) |
| `@kern-ux-annex/kern-react-kit` | frontend | KERN's React components, built for WCAG 2.1 AA, which the management UI must meet |
| `@digitalservicebund/kern-ux-tailwind-theme` | frontend | Maps KERN's design tokens to Tailwind classes |

The three KERN packages are pinned to exact versions, because a version mismatch between them
is the most likely cause of visual breakage.

## Project Structure

```
├── frontend/              # React SPA (Vite + TypeScript)
├── backend/               # FastAPI API (Python + SQLAlchemy)
│   ├── app/              # Application source code
│   │   ├── routers/      # API route handlers
│   │   ├── config.py     # Settings management
│   │   ├── db.py         # Database connection
│   │   ├── models.py     # SQLAlchemy models
│   │   ├── schemas.py    # Pydantic schemas
│   │   ├── errors.py     # Error handlers
│   │   └── main.py       # FastAPI app entry point
│   ├── alembic/          # Database migrations
│   ├── tests/            # pytest suite
│   ├── pyproject.toml    # Python dependencies + ruff/mypy/pytest config
│   ├── .python-version   # Pins the interpreter uv provisions (3.13)
│   └── uv.lock          # Lock file for dependencies
├── docs/                  # Architecture docs
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
# Start all services (PostgreSQL, backend, frontend)
docker compose up
```

This starts everything with hot reload:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- API Docs: http://localhost:3000/docs

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

3. Run database migrations (when you have them)
```bash
uv run alembic upgrade head
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

# Database migrations (once set up)
uv run alembic revision --autogenerate -m "description"
uv run alembic upgrade head
```

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

See `backend/.env.example` for the authoritative list. Settings are loaded by
`app/config.py` via pydantic-settings; add a field there before adding a new
variable, or it will be ignored.

### Frontend (`frontend/.env`)

```bash
VITE_API_URL=http://localhost:3000
```
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
   and `SERVICE_FQDN_FRONTEND` — no manual environment variables are required
5. Deploy

The backend container runs `alembic upgrade head` on start, so the database
schema is migrated automatically. `APP_ENV` is set to `production` in the
compose file (anything else exposes exception details in error responses).

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

Preview databases start empty (schema only, via migrations on startup).

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
