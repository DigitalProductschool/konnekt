# Development

How to run Konnekt on your machine and the commands for working on it. The linters, git hooks,
continuous integration and editor setup are in [CODE-QUALITY.md](CODE-QUALITY.md), the settings
in [ARCHITECTURE.md](ARCHITECTURE.md#environment-variables), and how the parts work in the rest
of [ARCHITECTURE.md](ARCHITECTURE.md).

## Prerequisites

- **Frontend**: Node.js 20+ and npm 9+
- **Backend**: Python 3.13+ and [uv](https://docs.astral.sh/uv/) (Python package manager)
- **Database**: Docker and Docker Compose

Option 1 below needs only Docker with Compose v2 (`docker compose`), and about 3 GB of free disk
space for its images and their build cache.

## Install uv (Python package manager)

```bash
# macOS/Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

# Windows
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"

# Or with pip
pip install uv
```

## Local Development

### Option 1: Run with Docker Compose (Recommended)

```bash
# Settings for the backend, such as the EUDIPLO credentials (optional for a first start;
# docs/ARCHITECTURE.md, "Environment Variables")
cp backend/.env.example backend/.env

# Start all services (PostgreSQL, backend, frontend, MCP server)
docker compose up

# In another terminal, once the backend has logged "Application startup complete" (it runs
# the migrations first; a few minutes on the first start): create your sign-in account
# (see docs/ACCOUNTS.md)
docker compose exec backend uv run python -m app.cli create-user <username>
```

This starts everything with hot reload:
- Frontend: http://localhost:5173. Use `localhost`, not `127.0.0.1`: the sign-in cookie and
  the CORS setting depend on the host name
- Backend API: http://localhost:3000
- API Docs: http://localhost:3000/docs
- MCP server for agents: http://localhost:3100/mcp (see
  [Agents and the MCP server](MCP-SERVER.md))

Konnekt speaks English and German: the "DE | EN" switch in the header changes the language.
How the two languages work is in [ARCHITECTURE.md](ARCHITECTURE.md#languages-spec-009).

The development compose file publishes its ports (5435, 3000, 5173, 3100) on `127.0.0.1`
only, so that the database, with its password `postgres`, and the backend aren't reachable from
other machines. They must be free before `docker compose up`: a local PostgreSQL on 5435, or
anything else on one of them, stops it. The backend container reads `backend/.env` if it exists; the values set in
`docker-compose.yml` take precedence. The `mcp` service gets its settings from
`docker-compose.yml` alone.

### Option 2: Run Locally with Docker Database

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

5. In another terminal, set up frontend, from the repository root
```bash
npm install
npm run dev -w frontend
```

6. In another terminal, start the MCP server, from the repository root (optional: only
   agents need it). Its development defaults point at the backend on port 3000 and the
   frontend on port 5173
```bash
npm run dev -w mcp
```

### Option 3: Full Local Development (No Docker)

Install and run PostgreSQL locally, then update backend `.env` with your local database URL:
```
DATABASE_URL=postgresql+psycopg://user:password@localhost:5432/dbname
```

Then follow Option 2 steps for backend and frontend.

## Accounts

Every way of running Konnekt needs a sign-in account, created with the command-line tool:
[ACCOUNTS.md](ACCOUNTS.md).

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
uv run mypy app/ scripts/ tests/

# Tests. They empty their database, so they only run against one whose name ends in _test
docker compose exec postgres createdb -U postgres konnekt_db_test   # once
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5435/konnekt_db_test uv run pytest

# Database migrations
uv run alembic revision --autogenerate -m "description"
uv run alembic upgrade head

# Issue a test PID and driving licence to a test wallet (see docs/TEST-CREDENTIALS.md)
uv run python -m scripts.issue_test_credentials

# Regenerate the rule checks' fixtures, the server messages' parity fixture and the example's
# fixture (see below)
uv run python -m scripts.export_check_fixtures           # write them
uv run python -m scripts.export_check_fixtures --check   # only check they are current
```

The tests replace EUDIPLO with a fake and switch the background worker off, so they need
neither EUDIPLO credentials nor a wallet.

#### Rule checks' fixtures

The Rules step checks the rules for conflicts and redundancies in the browser (spec 003), and
judges each condition as the backend's evaluator (`app/services/evaluation.py`) does. Two
generated files keep the checks in step with it: `rules/src/checks/caseFolding.ts`,
Python's `str.casefold()` table, and `rules/src/checks/fixtures/evaluator-vectors.json`,
Python's results for the evaluator's text normalisation, date arithmetic and rule outcomes, which
the `rules/` package's Vitest tests replay. Its `rule_outcomes` vectors pin single rules, and its
`branch_evaluations` vectors (spec 004) whole branches, with their groups and inherited items, for
the browser's evaluator `rules/src/evaluation.ts`, which the test step uses to
evaluate its sample citizens. `scripts/export_check_fixtures` writes both from the current
interpreter and evaluator; it needs no database, EUDIPLO or setting. Never edit the files by hand.

The same script writes a third file (spec 009): `rules/src/fixtures/server-messages.json`, the
server's rules messages (`app/services/rules_texts.py`) rendered in English and German with
sample parameters. The Rules step repeats these messages word for word in both languages, and
`rules/src/validation.test.ts` checks its tables against the file.

And a fourth (spec 010): `rules/src/fixtures/example-connection.json`, the example connection
that "Start from an example" creates (`app/example.py`), in English and German, with the
catalog's two document types and the licence classes it uses. `rules/src/example.test.ts` runs
the rules package's validation and the rule checks on it and expects no problem and no finding.

Run it from `backend/`, and commit what it writes, **after a Python upgrade** (a new Python can
bring a new Unicode version, and with it other case folding), **a change to the evaluator's
comparisons, a change to the rules' messages or a change to the example**:

```bash
cd backend
uv run python -m scripts.export_check_fixtures
```

With `--check` it writes nothing: it names each committed file that differs from what it would
write and exits with 1. The backend tests run the same check
(`tests/unit/test_check_fixtures.py`), so stale fixtures fail `uv run pytest`. The script adds no
dependency and no environment variable.

### Frontend and packages (React + Vite, npm workspace)

`api-types/`, `rules/`, `frontend/` and `mcp/` are the packages of one npm workspace. From the
repository root, each script runs in every package that has it:

```bash
# Install the dependencies of every package (one lockfile, package-lock.json)
npm install

# Run the frontend's development server
npm run dev -w frontend

# Run the MCP server from its sources (vite-node, port 3100; restart it after a change)
npm run dev -w mcp

# Type-check every package, then build the frontend and the MCP server (mcp/dist/) for production
npm run build

# Run the unit tests once, without watching (rules, frontend and mcp)
npm test

# Linting/formatting
npm run lint          # ESLint
npm run format        # Prettier, writes changes
npm run format:check  # Prettier, reports without writing
```

For one package, name it with `-w` (or run the script inside its directory):

```bash
npm test -w rules                 # the rules' unit tests alone
npm test -w mcp                   # the MCP server's tests, the guidance gate included
npm run typecheck -w api-types    # tsc --noEmit
npm run lint:fix -w frontend      # ESLint with --fix
```

`npm test -w mcp` fails when an MCP tool isn't described in any of the skills in
`mcp/plugin/skills/` (`mcp/src/guidance.test.ts`).

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

# Restart the MCP server after changing its sources or skills
docker compose restart mcp

# View logs
docker compose logs -f
```
