# Konnekt

Konnekt is the middleware between serviceBW forms and the EUDI Wallet. It lets the DO.IT team of
the City of Stuttgart connect serviceBW forms to the EUDI Wallet. For each form, DO.IT creates a
form connection that names the documents and fields the form needs. serviceBW then uses the form
connection's URLs to request those documents from the citizen's wallet, through the team's
EUDIPLO instance, and receives only the configured fields. The team sets up its form connections
in Konnekt's management UI.

A form connection can also have rules that the shared documents must meet, such as "Date of
birth is at least 21 years old", combined with AND or OR in groups. Its variants (branches) each
have their own rules, based on the standard ones or not, and their own pull URL; the trigger URL
stays one for all. A pull answers with the documents and, next to them, the evaluation of the
called variant's rules: whether they are met, each rule's outcome and the error messages for the
citizen.

The middleware is built in phases. Each phase's specification, plan and task list are in
[specs/](specs/): [001-servicebw-eudi-middleware/](specs/001-servicebw-eudi-middleware/) for the
form connections, [002-connection-rules/](specs/002-connection-rules/) for their rules and
variants, [008-kern-revamp-redesign/](specs/008-kern-revamp-redesign/) for Konnekt's current
design on the KERN Revamp, and [010-revamp-backend-gaps/](specs/010-revamp-backend-gaps/) for
what that design draws on stored data: scheduling a connection, its status dates and activity,
deleting with "Undo" and several at once, the documents' order, the example connection and the
catalog's data groups. The code base started from the Digital Product School React + FastAPI +
PostgreSQL template.

Team members can also work with an LLM agent on their own machine, such as Claude Code, Cursor or
Codex, through the middleware's MCP server ([007-agent-mcp-server/](specs/007-agent-mcp-server/)):
the agent finds and reads connections, builds drafts, checks their rules and tests them with
fictitious citizens, and asks the team member's approval, on a page of Konnekt, to publish a
draft or to deactivate, reactivate or delete a live connection. See
[Agents and the MCP server](#agents-and-the-mcp-server).

## Tech Stack

- **Frontend**: React 19, Vite 8, TypeScript, Tailwind CSS 4, React Router 7, KERN design system
- **Backend**: FastAPI (Python 3.13+), SQLAlchemy 2, Alembic, psycopg 3
- **MCP server**: Node, TypeScript, the official MCP TypeScript SDK 2, zod 4, Vite (build)
- **Database**: PostgreSQL 18
- **External service**: EUDIPLO 9, which talks to the citizens' wallets ([docs/EUDIPLO.md](docs/EUDIPLO.md))
- **Tooling**: ESLint 9, Prettier, Vitest, Ruff, mypy, pytest, pre-commit, gitleaks, uv (Python), Docker

### Dependencies added to the template

| Package | Where | Why |
|---|---|---|
| `argon2-cffi` | backend | Argon2id hashes for the DO.IT team members' passwords |
| `httpx2` | backend (moved from the `dev` group) | Synchronous HTTP client for the EUDIPLO management API. FastAPI's `TestClient` needs it too, and its `MockTransport` provides the fake EUDIPLO in the tests |
| `segno` | backend | Renders the QR code that serviceBW shows the citizen, a PNG data URI of the wallet link for another device. Pure Python, and writes PNG without Pillow |
| `pytest` | backend, `dev` group | Runs the backend tests |
| `faker` | backend, `dev` group | Makes up realistic German test people for `scripts/issue_test_credentials`, which issues test documents to a test wallet ([Test credentials](#test-credentials-for-a-test-wallet)). The script isn't part of the production image |
| `react-router` | frontend | Routes of the management UI, so that a form connection has its own URL |
| `@kern-ux/native` | frontend | KERN's CSS, design tokens and Fira Sans font files. KERN is the design system for German public administration ([docs/KERN-DESIGN-SYSTEM.md](docs/KERN-DESIGN-SYSTEM.md)) |
| `@kern-ux-annex/kern-react-kit` | frontend | KERN's React components, built for WCAG 2.1 AA, which the management UI must meet. Its own stylesheet is not imported, see [docs/KERN-DESIGN-SYSTEM.md](docs/KERN-DESIGN-SYSTEM.md) §2 |
| `@digitalservicebund/kern-ux-tailwind-theme` | frontend | Maps KERN's design tokens to Tailwind classes |
| `pdfkit` 0.20.2 | frontend | Draws the connection's details as a tagged PDF in the browser, in a module worker (spec 011, research R1; [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#the-connection-pdf-spec-011)). One package for both the drawing and the tagging: it measures and wraps text for our own pagination, embeds and subsets TrueType fonts, and writes the structure tree, artifacts, `/Lang` and the PDF/UA identification that PDF/UA-1 needs; `@react-pdf/renderer` writes no tags, pdf-lib neither wraps text nor tags, jsPDF with html2canvas draws images of pages. Its browser build loads on the first "Download PDF" only, as a chunk of its own, and its Node build runs the same drawing in the Vitest smoke test. Its own dependencies (fontkit, fflate, linebreak, @noble) arrive with it and are never imported by our code. It ships no types: `utils/connectionPdf/types.ts` declares the calls we use (spec 011, design-notes D1). MIT |
| `vitest` | frontend and rules, `devDependencies` | Runs the unit tests of `frontend/` and `rules/` (`npm test`). Some pure logic runs only in the browser, such as the rules' propagation between the variants of a form connection, so its tests in Node are a quality gate (constitution v1.1.0). Configured in the `test` block of `frontend/vite.config.ts` and in `rules/vitest.config.ts`, in the `node` environment, without a DOM. Version 4, because Vitest 5 needs Node 22.12, and the frontend still supports Node 20 |
| `@modelcontextprotocol/server` 2.4.0 | mcp | The MCP protocol, transport and schemas: the official TypeScript SDK's server, with the Skills extension |
| `@modelcontextprotocol/node` 2.1.2 | mcp | Serves the MCP endpoint from `node:http` |
| `zod` 4.6.7 | mcp | The tools' input schemas, published as JSON Schema by the SDK |
| `@modelcontextprotocol/client` 2.4.0 | mcp, `devDependencies` | The MCP client of the server's integration tests |
| `vite-node` 6.0.0 | mcp, `devDependencies` | Runs the MCP server in development (`npm run dev`) through Vite's transform, which the embedded skills (`import.meta.glob` with `?raw`) need |
| `gitleaks` 8.30.1 | pre-commit hook and CI | Looks for secrets (keys, tokens, passwords) in the staged changes and in the history, so none reaches the repository unnoticed ([Secrets (gitleaks)](#secrets-gitleaks)). MIT |

The three KERN packages and `react-router` are pinned to exact versions; for KERN, a version
mismatch between the packages is the most likely cause of visual breakage.
The MCP SDK's packages, `zod` and `vite-node` are pinned to exact versions too: the SDK's
Skills extension is marked experimental in 2.4.0.
`pdfkit` is pinned exactly as well: `withoutCidSet()` in
`frontend/src/utils/connectionPdf/render.ts` works around PDFKit's incomplete `CIDSet` through
its private `_fontFamilies`, and the smoke test fails if a new version breaks it.

The PDF's fonts are files, not a package: Fira Sans (Regular, Medium, SemiBold) and Fira Mono
(Regular, Medium) as five TTFs in `frontend/src/assets/fonts/`, from Google Fonts' release,
under the SIL Open Font License 1.1, whose text is `OFL.txt` beside them. KERN's WOFF2 files
break fontkit's subsetting, and KERN 2.8.2 ships no Fira Mono (spec 011, research R7).

## Project Structure

```
├── package.json           # npm workspace root (api-types, rules, frontend, mcp): scripts over the packages
├── package-lock.json      # One lockfile for every Node package
├── eslint.config.mjs      # ESLint 9 flat config, one block per package
├── tsconfig.base.json     # Compiler options every package extends
├── .prettierrc            # Prettier settings (frontend/.prettierrc adds the Tailwind plugin)
├── api-types/             # @konnekt/api-types: TypeScript mirrors of the backend's schemas
│   └── src/
├── rules/                 # @konnekt/rules: the pure rules logic, rule checks and test
│   └── src/               # personas, with their tests (vitest.config.ts)
├── frontend/              # React SPA (Vite + TypeScript): Konnekt, the DO.IT management UI
│   └── src/workers/       # The browser Worker entries of the rule checks and test personas
├── mcp/                   # @konnekt/mcp: the MCP server for agents (Node + TypeScript)
│   ├── src/               # Server, tools, links, checks; tests beside the modules
│   ├── test/              # Integration tests against a fake backend
│   └── plugin/            # Guidance for agents: instructions, skills, the Claude Code plugin
├── backend/               # FastAPI API (Python + SQLAlchemy)
│   ├── app/              # Application source code
│   │   ├── routers/      # API route handlers, one module per resource
│   │   ├── services/     # Domain logic shared by the routers and the worker
│   │   ├── cli.py        # Accounts (create-user, set-password, delete-user), clear-connections
│   │   ├── config.py     # Settings management
│   │   ├── db.py         # Database connection
│   │   ├── models.py     # SQLAlchemy models
│   │   ├── schemas.py    # Pydantic schemas
│   │   ├── errors.py     # Error handlers
│   │   └── main.py       # FastAPI app entry point, starts the background worker
│   ├── alembic/          # Database migrations
│   ├── scripts/          # Developer scripts, not in the production image: test credentials,
│   │                     # the rule checks' generated fixtures
│   ├── tests/            # pytest suite, with a fake EUDIPLO
│   ├── pyproject.toml    # Python dependencies + ruff/mypy/pytest config
│   ├── .python-version   # Pins the interpreter uv provisions (3.13)
│   └── uv.lock          # Lock file for dependencies
├── docs/                  # Architecture, EUDIPLO, KERN and Figma workflow docs
├── specs/                 # Specification, plan and tasks (Spec Kit)
├── .claude-plugin/
│   └── marketplace.json   # Claude Code marketplace that lists mcp/plugin
├── .github/workflows/ci.yml # CI: seven parallel jobs (lint & format, types, tests per side; secrets)
├── .pre-commit-config.yaml # Git hooks (ruff, prettier, eslint, gitleaks)
├── docker-compose.yml     # Local development
└── docker-compose.prod.yml # Production and previews (Coolify)
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

# Start all services (PostgreSQL, backend, frontend, MCP server)
docker compose up

# In another terminal: create your sign-in account (see Accounts below)
docker compose exec backend uv run python -m app.cli create-user <username>
```

This starts everything with hot reload:
- Frontend: http://localhost:5173. Use `localhost`, not `127.0.0.1`: the sign-in cookie and
  the CORS setting depend on the host name
- Backend API: http://localhost:3000
- API Docs: http://localhost:3000/docs
- MCP server for agents: http://localhost:3100/mcp (see
  [Agents and the MCP server](#agents-and-the-mcp-server))

Konnekt speaks English and German (spec 009, [009-language-toggle/](specs/009-language-toggle/)):
the "DE | EN" switch in the header changes the language, and the browser remembers the choice.
The API answers in the language of the request's `Accept-Language` header, which the frontend
sends on every call: German for `de` (and `de-AT`, `de-CH` …), English for anything else or
without the header. Only the texts change (error messages, the catalog's and option sets'
labels), never a field, key or code; serviceBW's connection URLs under `/api/connect/`, the MCP
server and the logs stay English. The two languages add no dependency and no environment
variable. Details: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), "Languages (spec 009)".

The backend container reads `backend/.env` if it exists; the values set in
`docker-compose.yml` take precedence. The `mcp` service gets its settings from
`docker-compose.yml` alone.

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

#### Option 3: Full Local Development (No Docker)

Install and run PostgreSQL locally, then update backend `.env` with your local database URL:
```
DATABASE_URL=postgresql+psycopg://user:password@localhost:5432/dbname
```

Then follow Option 2 steps for backend and frontend.

### Accounts

DO.IT team members sign in to Konnekt with personal accounts. Konnekt has no account
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

To start over without losing the accounts, `clear-connections` deletes every form connection
with its revisions, branches, rule sets, document requests and agents' approval requests. It
shows the row counts and asks before deleting (`--yes` skips the question):

```bash
docker compose exec backend uv run python -m app.cli clear-connections
```

It first deletes the EUDIPLO session of every request that still has one, so that no shared
document stays in EUDIPLO after its request is gone (FR-020). If EUDIPLO isn't configured or a
deletion fails, it deletes no row and says how many sessions are left; run it again once EUDIPLO
answers. The EUDIPLO configurations hold no personal data and stay in EUDIPLO.

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

# Issue a test PID and driving licence to a test wallet (see Test credentials below)
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

## Code Quality

Linting and code formatting is set up for both parts of the stack. The tools are already configured, you only need to point your editor at them (see [Format on save](#format-on-save)).

### What runs where

- **Backend** — [Ruff](https://docs.astral.sh/ruff/) both lints (rule sets `E`, `F`, `I`
  — pycodestyle, pyflakes, isort) and formats (88 columns, single quotes). mypy handles
  type checking. All three are configured in `backend/pyproject.toml`.
- **Frontend and packages** — ESLint 9 (flat config, `eslint.config.mjs` at the root, one
  block per package) handles code rules: React, React Hooks and react-refresh in `frontend/`,
  and `simple-import-sort` for import ordering everywhere. Prettier (`.prettierrc` at the root,
  `frontend/.prettierrc` in `frontend/`) handles formatting: single quotes, semicolons, 100
  columns, 2-space indent, ES5 trailing commas, and in `frontend/` Tailwind class sorting via
  `prettier-plugin-tailwindcss`. Vitest runs the unit tests of `rules/`, `frontend/` and
  `mcp/`, the `*.test.ts` files next to the modules they test, in Node, and the MCP server's
  integration tests in `mcp/test/`; `npm run build` type-checks them with the rest of each
  package's sources.

### Git hooks (pre-commit)

The hooks in `.pre-commit-config.yaml` run on every `git commit`:

- `ruff check --fix` and `ruff format` on Python files
- `prettier --write` and `eslint --fix` on `api-types/`, `rules/`, `frontend/` and `mcp/`
  files, run from the repository root
- trailing whitespace, merge conflict markers, large files
- `gitleaks` on the staged changes, which refuses a commit that adds a secret (see
  [Secrets (gitleaks)](#secrets-gitleaks)). pre-commit builds it from source the first time it
  runs, which takes a minute, and fetches Go for it if Go isn't installed

Installation is automatic — `npm install` at the repository root runs a `prepare` script
that calls `uv run pre-commit install` in `backend/`, so the workspace install is what wires
up the hooks for the whole repo. It needs `uv` on your PATH; if `uv` was missing at install
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

### Continuous integration

GitHub Actions runs `.github/workflows/ci.yml` on every push to any branch, on every pull
request, and by hand from the Actions tab (*Run workflow*). It has seven jobs, one per kind of
check and side and a secret scan, so each is its own status check on a pull request. They run
in parallel:

| | Lint & format | Types | Tests |
|---|---|---|---|
| **Backend** (`backend/`) | `ruff check`, `ruff format --check` | `mypy app/ scripts/ tests/` | `pytest` |
| **Frontend & packages** (root) | `npm run lint`, `npm run format:check` | `npm run build` | `npm test` |

Each job installs its own dependencies: `uv sync --locked`, which fails when `uv.lock` no longer
matches `pyproject.toml`, or `npm ci`. `pytest` runs against a `postgres:18-alpine` service with
the database `konnekt_db_test`; EUDIPLO is faked as on your machine, so no job needs a secret.
In the lint & format jobs, the format check runs after a failed lint too, so one run reports
both.

The versions match the Dockerfiles: Python from `backend/.python-version`, uv 0.12.9 and
Node 26. Change them together, and add a new check to the workflow when you add one to "Before
you finish" in `CLAUDE.md`.

To block merging a red pull request, make the jobs required status checks in the repository's
branch protection for `main` (all seven, or only types, tests and secrets if formatting should
stay advisory).

### Secrets (gitleaks)

[gitleaks](https://github.com/gitleaks/gitleaks) looks for secrets, such as API keys, tokens,
private keys and passwords in URLs, with its default rules:

- The pre-commit hook scans the staged changes and refuses the commit.
- CI's *Secrets: gitleaks* job scans every commit that the pushed commit, or the pull request's
  merge, reaches. It catches a commit made without the hooks too, such as one from GitHub's web
  editor.

CI downloads the gitleaks binary from its GitHub release and checks it against the SHA-256 in the
workflow. It doesn't use gitleaks-action, whose license needs a key for an organization's
repositories and sends the repository's name to a license server. The hook and the job pin the
same version, 8.30.1: change `rev` in `.pre-commit-config.yaml` and `GITLEAKS_VERSION` and
`GITLEAKS_SHA256` in the workflow together.

When gitleaks reports a finding:

- **A real secret**: revoke or rotate it where it was issued first, because deleting it from the
  code leaves it in the history. Then move it into an untracked `.env` (see
  [Environment Variables](#environment-variables)). If the commit was already pushed, add the
  finding's fingerprint to `.gitleaksignore`, as for a false positive; the secret no longer works.
- **Not a secret** (a test value, a placeholder): on a line you are committing, a
  `gitleaks:allow` comment at its end. For a commit already pushed, its fingerprint from the
  job's log (`<commit>:<file>:<rule>:<line>`), one per line in `.gitleaksignore` at the root. For a
  whole file or pattern, an `[[allowlists]]` entry in a `.gitleaks.toml` at the root that starts
  with `[extend]` and `useDefault = true`, so that the default rules still apply.

Don't get past the hook with `git commit --no-verify` or `SKIP=gitleaks`.

To scan the history on your machine as CI does, with gitleaks 8.30.1 on your PATH (from the
[release](https://github.com/gitleaks/gitleaks/releases/tag/v8.30.1)), from the root:

```bash
gitleaks git --log-opts=HEAD --redact --verbose
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
     "prettier.prettierPath": "node_modules/prettier",
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

ESLint and Prettier find their configuration at the repository root, the workspace root.
One thing to watch for:

- Select `backend/.venv` as your Python interpreter (**Python: Select Interpreter** in the
  command palette). The Ruff extension resolves `pyproject.toml` from the interpreter's
  project, and picks up the wrong defaults without it.

#### JetBrains (WebStorm / PyCharm)

Open settings with `⌘,` on macOS or `Ctrl+Alt+S` on Windows/Linux.

1. **Prettier** — *Languages & Frameworks > JavaScript > Prettier*. Set **Prettier
   package** to `node_modules/prettier`, set **Run for files** to
   `{api-types,rules,frontend,mcp}/**/*.{js,mjs,cjs,ts,tsx,jsx,css,json,md}`, and tick **On save**.
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
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5435/konnekt_db
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
| `DOCUMENT_RETENTION_SECONDS` | Longest time shared documents stay in EUDIPLO | `1800` |
| `PULL_REPEAT_WINDOW_SECONDS` | How long repeated pulls return the same documents after the first delivery | `60` |
| `REQUEST_RECORD_RETENTION_SECONDS` | How long a request record is kept after the request ended | `604800` (7 days) |
| `ALLOW_PLAIN_HTTP` | Allows `http://` for `CONNECTION_BASE_URL` outside development. Only for a closed network | `false` |
| `WORKER_ENABLED` | Runs the background worker thread (the tests switch it off) | `true` |
| `LOGIN_SESSION_HOURS` | How long a DO.IT sign-in lasts | `8` |
| `PORTAL_URL` | Public origin of the management UI: the links agents get and the OAuth consent page (`{PORTAL_URL}/authorize`) are built from it | `http://localhost:5173` in development, `CONNECTION_BASE_URL` otherwise |
| `MCP_URL` | Public URL of the MCP endpoint, which agents' tokens are bound to | `http://localhost:3100/mcp` in development, `CONNECTION_BASE_URL` + `/mcp` otherwise |
| `OAUTH_ISSUER` | Issuer of the OAuth authorization server that signs agents in | `CONNECTION_BASE_URL` |
| `AGENT_ACCESS_TOKEN_MINUTES` | Lifetime of an agent's access token | `60` |
| `AGENT_CONNECTION_IDLE_DAYS` | An agent connection unused this many days ends | `30` |
| `AGENT_TOKEN_MAX_DAYS` | Longest expiry of a personal access token | `90` |
| `APPROVAL_REQUEST_MINUTES` | How long an approval link is valid | `10` |
| `AGENT_DRAFTS_PER_HOUR` | Drafts one agent connection or token may create per hour | `20` |
| `DELETION_UNDO_SECONDS` | How long the team member who deleted a connection or draft can take it back with the toast's "Undo"; afterwards the deletion is final and the worker deletes its EUDIPLO configurations, its activity and a draft's row. `0` switches restoring off | `300` (5 minutes) |

See `backend/.env.example` for the authoritative list. Settings are loaded by
`app/config.py` via pydantic-settings; add a field there before adding a new
variable, or it will be ignored.

`EUDIPLO_ISSUER_CLIENT_ID` and `EUDIPLO_ISSUER_CLIENT_SECRET` are read only by the
developer script that issues test documents ([Test credentials](#test-credentials-for-a-test-wallet));
the backend ignores them.

### MCP server (`mcp/.env`)

The MCP server reads its settings from the environment when it starts. `mcp/.env.example`
lists them with their development defaults, which apply whenever `NODE_ENV` isn't
`production`, so `npm run dev -w mcp` needs none of them. The server doesn't read a `.env`
file by itself: export the file's variables in the shell that starts it
(`set -a; . mcp/.env; set +a`). The compose files set them on the `mcp` service.

| Variable | Purpose | Default |
|---|---|---|
| `PORT` | Port the server listens on | `3100` |
| `BACKEND_URL` | The backend's address, which every tool call goes to | `http://localhost:3000` (`http://backend:3000` in Docker) |
| `PORTAL_URL` | Public origin of the management UI, for the links; the same as the backend's | `http://localhost:5173` |
| `MCP_URL` | Public URL of the MCP endpoint; the same as the backend's | `http://localhost:3100/mcp` |
| `OAUTH_ISSUER` | The authorization server, the backend; the same as the backend's | `http://localhost:3000` |

With `NODE_ENV=production`, as in `docker-compose.prod.yml`, the four URLs have no defaults:
the server doesn't start without them and logs which one is missing.

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
| `MCP_HOST` | Host name of the MCP server container, which nginx forwards `/mcp` and `/.well-known/oauth-protected-resource` to | `mcp` (`${SERVICE_NAME_MCP}` in Coolify) |

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

### Test credentials for a test wallet

Testing the middleware needs a wallet that holds a PID and a mobile driving licence from an
issuer the trust list trusts. The developer script `scripts/issue_test_credentials` issues
both from the tenant itself, with the data of a made-up person:

1. It checks that the tenant has a key chain that signs credentials (usage `attestation`) and,
   with `EUDIPLO_TRUST_LIST_ID` set, that this trust list trusts it.
2. It creates or updates the credential configurations `test-pid` (SD-JWT VC, `vct`
   `urn:eudi:pid:1`) and `test-mdl` (mdoc, `org.iso.18013.5.1.mDL`). They hold every field of
   the catalog, so the wallet can answer any request the middleware builds.
3. It makes up a German person with [Faker](https://faker.readthedocs.io) and creates a
   pre-authorized-code offer with their data, which works once within 15 minutes. The person
   lives in Stuttgart, at a real street with its real postcode, so that Stuttgart's forms accept
   the address; with `--any-town` they live in one of a few German towns instead, on a street
   Faker makes up.
4. It shows the offer as a QR code and a link, and waits until the wallet has fetched it.

**Once per tenant**, in the EUDIPLO console or API:

- an API client with the roles `issuance:manage` and `issuance:offer`, separate from the
  middleware's client, which has no issuance role. Its id and secret go into
  `EUDIPLO_ISSUER_CLIENT_ID` and `EUDIPLO_ISSUER_CLIENT_SECRET` in `backend/.env`, next to
  `EUDIPLO_URL`;
- a key chain with the usage `attestation`, which signs the credentials;
- an entity for that key chain in the trust list `EUDIPLO_TRUST_LIST_ID`: an `internal` entity
  whose `issuerKeyChainId` is the key chain (its `revocationKeyChainId` can be the same one),
  or an `external` entity with the key chain's **root** certificate. A trust list with only the
  leaf certificate rejects the documents (`trust_chain_not_trusted`). The script warns when the
  entity is missing.

**Then**, from `backend/`:

```bash
uv run python -m scripts.issue_test_credentials                 # PID and driving licence
uv run python -m scripts.issue_test_credentials --document pid  # only the PID
uv run python -m scripts.issue_test_credentials --seed 4711     # the same person again, same day
uv run python -m scripts.issue_test_credentials --show-claims   # also print every claim
uv run python -m scripts.issue_test_credentials --any-town      # someone living outside Stuttgart
```

Scan the QR code with the wallet, or open the link on the phone. On a terminal with a light
background, save the code with `--qr-png FILE` and scan the image instead. `--no-wait` ends
without waiting for the wallet.

To test a form connection's rules (spec 002), issue documents on either side of a rule's
condition on purpose. `--birth-date YYYY-MM-DD` sets the person's date of birth in both
documents, together with the driving licence's `age_in_years` and `age_birth_year`.
`--licence-class CODE:ISSUE_DATE`, which can be repeated, gives the driving licence exactly
these classes, each held since its issue date, instead of made-up ones; the codes are the
middleware's licence classes (`AM`, `A1` … `T`). The rest of the person stays as the seed
makes it up. A date that isn't written `YYYY-MM-DD`, a date in the future, an unknown class and
a class given twice are refused. For example, against the rules "Date of birth is at least 21
years old" and "Licence class B – Issue date is at least 2 years ago" (quickstart.md V2 of
spec 002):

```bash
uv run python -m scripts.issue_test_credentials --birth-date 2001-01-01 --licence-class B:2020-03-01
uv run python -m scripts.issue_test_credentials --birth-date 2006-06-30 --licence-class B:2025-09-01
```

Good to know:

- The documents have no status list. With one, EUDIPLO 9.0 fails every strict check of an
  mDL ("Atleast one certificate is required to check the status of the mdoc"), so revocation
  can't be tested with them.
- The driving licence has no `issuing_jurisdiction`. ISO/IEC 18013-5 requires it to match the
  `stateOrProvinceName` of the issuer certificate, which EUDIPLO's certificates don't have, and
  wallets reject an mDL where the two differ. A form connection that asks for this field gets
  no answer from these test documents.
- EUDIPLO 9 issues an mdoc's claims with their JSON types: dates are text, not the CBOR dates of
  ISO/IEC 18013-5, and the portrait and signature are base64 text, not bytes.
- EUDIPLO 9.0 loses the content of nested mdoc maps in presentation results: the middleware
  receives `driving_privileges` as `[{}, {}, …]`, one empty object per category. This affects
  real driving licences as well. The hosted instance runs `9.0.0-mdocfix.1`, which has the fix:
  there `driving_privileges` arrives in full (checked on 2026-10-19).
- The script prints the made-up person's data. The middleware itself never logs claims.
- All environments share tenant `dps`, so with the tenant's own issuer on the trust list every
  environment accepts these test documents. Take the entity off the trust list before real
  citizens use the service.

## Agents and the MCP server

The MCP server (`mcp/`) lets team members work with an LLM agent on their own machine. It is
public at `https://<domain>/mcp` (Streamable HTTP), next to the management UI, and
`http://localhost:3100/mcp` in development. An agent signs in through the browser, with OAuth:
the first call opens Konnekt's consent page, where the team member signs in and
chooses one of three access levels:

| Access level | Allows |
|---|---|
| Read only | Finding and reading connections and their activity, the catalog, checking rules, testing fictitious citizens |
| Read and edit drafts | Also creating and changing drafts, and asking for approval to publish (at once or on a start date) or delete a draft |
| Read, edit drafts and manage live connections | Also asking for approval to deactivate, reactivate, change the start date of or delete a published connection |

No level lets an agent change a published connection's content, and an agent never publishes,
deletes, deactivates, reactivates or changes a start date by itself: it hands the team member a link to an approval
page, valid for `APPROVAL_REQUEST_MINUTES`, where they approve or decline. The user page
("Your account" in the user menu) lists the connected agents and personal access tokens, and
changes an access level or revokes access, from the agent's next call. Every answer carries
links into Konnekt, and the rules step's menus copy a variant's, a rule's or a
group's link ("Copy link"), which agents accept wherever they take an identifier.

The server has 26 tools: `search_connections`, `get_connection`, `get_activity`,
`get_variant`, `get_item`, `get_catalog`, `search_values`, `check_rules`, `test_applicants` and
`get_guide` read; `create_draft`, `update_connection`, `set_document`, `move_document`,
`add_variant`, `update_variant`, `delete_variant`, `add_rule`, `update_item`, `delete_item`,
`reset_item`, `copy_rule` and `group_items` change drafts; `request_approval` and
`check_approval` ask for and read an approval, and `request_access` asks for a higher access
level. Restoring a deleted connection, deleting several connections at once and creating the
example are done by a team member in Konnekt: no tool offers them.

The guidance agents get, the server's instructions and eight skills, lives in `mcp/plugin/`
and is embedded in the server when it is built. Every change to the MCP tools updates the
skills in the same change; `npm test -w mcp` fails otherwise. Details:
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), "Agent access and the MCP server (spec 007)",
and [mcp/plugin/README.md](mcp/plugin/README.md).

### Installing the plugin

**Claude Code**: the plugin in `mcp/plugin/` adds the MCP server `konnekt` and the
skills in one step.

1. Set `KONNEKT_MCP_URL` to the deployment's MCP endpoint, `https://<domain>/mcp`, in
   the environment Claude Code starts from (for example in your shell profile); a preview
   deployment has its own domain. The plugin's `.mcp.json` reads the address from it: without
   it, Claude Code doesn't connect to the server.

   ```bash
   export KONNEKT_MCP_URL=https://<domain>/mcp
   ```

2. Add the marketplace, the repository (as `owner/repo`, a git URL or a local checkout), and
   install the plugin. The marketplace is called `konnekt`, after
   `.claude-plugin/marketplace.json`:

   ```bash
   claude plugin marketplace add <repository>
   claude plugin install konnekt@konnekt
   ```

3. Start Claude Code. The first call to the server opens the browser on the consent page.

**Other MCP clients**: add the HTTP (Streamable HTTP) server `https://<domain>/mcp`; the client
signs in through the browser on the first call. The skills reach the agent through the
protocol's Skills extension or, for clients without it, the `get_guide` tool. Clients that read
skills from files can use the folders in `mcp/plugin/skills/`: copy them where the client looks
for skills.

**Clients without browser sign-in**: create a personal access token on the user page, with its
access level and expiry (at most `AGENT_TOKEN_MAX_DAYS`), and give it to the client as its
bearer token (`Authorization: Bearer <token>`). The token is shown once; keep it out of files
that are committed or shared.

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

The whole stack (frontend + backend + PostgreSQL + MCP server) deploys as a **single
docker-compose resource** defined in `docker-compose.prod.yml`. Only the
frontend gets a public domain: its nginx serves the SPA and proxies `/api`
(plus `/docs` and `/openapi.json`) to the backend over the internal network, so
there is no CORS configuration and no API URL baked into the frontend build.
For agents, it also proxies `/mcp` and `/.well-known/oauth-protected-resource` to the
MCP server and `/.well-known/oauth-authorization-server` to the backend, so the MCP
endpoint is `https://<domain>/mcp`.

#### 1. Create the resource

1. In Coolify, create a new resource from this repository and choose the
   **Docker Compose** build pack
2. Set the compose file location to `docker-compose.prod.yml`
3. After Coolify parses the file, assign a domain to the **frontend** service
   (e.g., `https://my-team.dpschool.app`); leave backend, mcp and postgres without
   a domain — they stay internal
4. Coolify auto-generates `SERVICE_PASSWORD_POSTGRES` (the database password)
   and `SERVICE_FQDN_FRONTEND`. Set the middleware's variables in the Coolify
   environment: `CONNECTION_BASE_URL` (the `https://` address serviceBW uses;
   the backend refuses to start without it) and the four `EUDIPLO_*` variables.
   For the frontend, set `SERVICEBW_ALLOWED_CIDRS` (serviceBW's address ranges)
   and `TRUSTED_PROXY_CIDRS` (Traefik's network): until then, the connection
   URLs answer `403` to everyone. The others have defaults (see
   [Environment Variables](#environment-variables)). For agents, the compose
   file sets `PORTAL_URL`, `MCP_URL` and `OAUTH_ISSUER` of the backend and the
   MCP server from `CONNECTION_BASE_URL`, which therefore must be the frontend's
   public domain; `AGENT_ACCESS_TOKEN_MINUTES`, `AGENT_CONNECTION_IDLE_DAYS`,
   `AGENT_TOKEN_MAX_DAYS`, `APPROVAL_REQUEST_MINUTES` and `AGENT_DRAFTS_PER_HOUR`
   can be set in the Coolify environment to change their defaults
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
3. Mind server capacity: every open PR runs four extra containers, including
   its own PostgreSQL and MCP server
4. Previews run with `APP_ENV=production` too, so set `CONNECTION_BASE_URL` in
   the preview environment variables as well, or the preview backend won't start.
   Their connection URLs stay closed (`403`) unless `SERVICEBW_ALLOWED_CIDRS` is
   set for them too. A preview's MCP endpoint is `https://<preview domain>/mcp`:
   point `KONNEKT_MCP_URL` at it to work with the preview

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
