# serviceBW ↔ EUDI Wallet Middleware

Middleware that lets the DO.IT team of the City of Stuttgart connect serviceBW forms to the EUDI
Wallet. For each form, DO.IT creates a form connection that names the documents and fields the
form needs. serviceBW then uses the form connection's URLs to request those documents from the
citizen's wallet, through the team's EUDIPLO instance, and receives only the configured fields.

A form connection can also have rules that the shared documents must meet, such as "Date of
birth is at least 21 years old", combined with AND or OR in groups. Its variants (branches) each
have their own rules, based on the standard ones or not, and their own pull URL; the trigger URL
stays one for all. A pull answers with the documents and, next to them, the evaluation of the
called variant's rules: whether they are met, each rule's outcome and the error messages for the
citizen.

The middleware is built in phases. Each phase's specification, plan and task list are in
[specs/](specs/): [001-servicebw-eudi-middleware/](specs/001-servicebw-eudi-middleware/) for the
form connections, [002-connection-rules/](specs/002-connection-rules/) for their rules and
variants. The code base started from the Digital Product School React + FastAPI + PostgreSQL
template.

## Tech Stack

- **Frontend**: React 19, Vite 8, TypeScript, Tailwind CSS 4, React Router 7, KERN design system
- **Backend**: FastAPI (Python 3.13+), SQLAlchemy 2, Alembic, psycopg 3
- **Database**: PostgreSQL 18
- **External service**: EUDIPLO 9, which talks to the citizens' wallets ([docs/EUDIPLO.md](docs/EUDIPLO.md))
- **Tooling**: ESLint 9, Prettier, Vitest, Ruff, mypy, pytest, pre-commit, uv (Python), Docker

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
| `vitest` | frontend and rules, `devDependencies` | Runs the unit tests of `frontend/` and `rules/` (`npm test`). Some pure logic runs only in the browser, such as the rules' propagation between the variants of a form connection, so its tests in Node are a quality gate (constitution v1.1.0). Configured in the `test` block of `frontend/vite.config.ts` and in `rules/vitest.config.ts`, in the `node` environment, without a DOM. Version 4, because Vitest 5 needs Node 22.12, and the frontend still supports Node 20 |

The three KERN packages and `react-router` are pinned to exact versions; for KERN, a version
mismatch between the packages is the most likely cause of visual breakage.

## Project Structure

```
├── package.json           # npm workspace root (api-types, rules, frontend): scripts over the packages
├── package-lock.json      # One lockfile for every Node package
├── eslint.config.mjs      # ESLint 9 flat config, one block per package
├── tsconfig.base.json     # Compiler options every package extends
├── .prettierrc            # Prettier settings (frontend/.prettierrc adds the Tailwind plugin)
├── api-types/             # @connection-portal/api-types: TypeScript mirrors of the backend's schemas
│   └── src/
├── rules/                 # @connection-portal/rules: the pure rules logic, rule checks and test
│   └── src/               # personas, with their tests (vitest.config.ts)
├── frontend/              # React SPA (Vite + TypeScript): the DO.IT management UI
│   └── src/workers/       # The browser Worker entries of the rule checks and test personas
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

5. In another terminal, set up frontend, from the repository root
```bash
npm install
npm run dev -w frontend
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

To start over without losing the accounts, `clear-connections` deletes every form connection
with its revisions, branches, rule sets and requests. It shows the row counts and asks before deleting (`--yes`
skips the question):

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
docker compose exec postgres createdb -U postgres template_db_test   # once
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5435/template_db_test uv run pytest

# Database migrations
uv run alembic revision --autogenerate -m "description"
uv run alembic upgrade head

# Issue a test PID and driving licence to a test wallet (see Test credentials below)
uv run python -m scripts.issue_test_credentials

# Regenerate the rule checks' fixtures (see Rule checks' fixtures below)
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
evaluate its sample applicants. `scripts/export_check_fixtures` writes both from the current
interpreter and evaluator; it needs no database, EUDIPLO or setting. Never edit the files by hand.

Run it from `backend/`, and commit what it writes, **after a Python upgrade** (a new Python can
bring a new Unicode version, and with it other case folding) **or a change to the evaluator's
comparisons**:

```bash
cd backend
uv run python -m scripts.export_check_fixtures
```

With `--check` it writes nothing: it names each committed file that differs from what it would
write and exits with 1. The backend tests run the same check
(`tests/unit/test_check_fixtures.py`), so stale fixtures fail `uv run pytest`. The script adds no
dependency and no environment variable.

### Frontend and packages (React + Vite, npm workspace)

`api-types/`, `rules/` and `frontend/` are the packages of one npm workspace. From the
repository root, each script runs in every package that has it:

```bash
# Install the dependencies of every package (one lockfile, package-lock.json)
npm install

# Run the frontend's development server
npm run dev -w frontend

# Type-check api-types and rules, then build the frontend for production
npm run build

# Run the unit tests once, without watching (rules and frontend)
npm test

# Linting/formatting
npm run lint          # ESLint
npm run format        # Prettier, writes changes
npm run format:check  # Prettier, reports without writing
```

For one package, name it with `-w` (or run the script inside its directory):

```bash
npm test -w rules                 # the rules' unit tests alone
npm run typecheck -w api-types    # tsc --noEmit
npm run lint:fix -w frontend      # ESLint with --fix
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
- **Frontend and packages** — ESLint 9 (flat config, `eslint.config.mjs` at the root, one
  block per package) handles code rules: React, React Hooks and react-refresh in `frontend/`,
  and `simple-import-sort` for import ordering everywhere. Prettier (`.prettierrc` at the root,
  `frontend/.prettierrc` in `frontend/`) handles formatting: single quotes, semicolons, 100
  columns, 2-space indent, ES5 trailing commas, and in `frontend/` Tailwind class sorting via
  `prettier-plugin-tailwindcss`. Vitest runs the unit tests of `rules/` and `frontend/`, the
  `*.test.ts` files next to the modules they test, in Node; `npm run build` type-checks them
  with the rest of each package's `src/`.

### Git hooks (pre-commit)

The hooks in `.pre-commit-config.yaml` run on every `git commit`:

- `ruff check --fix` and `ruff format` on Python files
- `prettier --write` and `eslint --fix` on `api-types/`, `rules/` and `frontend/` files, run
  from the repository root
- trailing whitespace, end-of-file newline, merge conflict markers, large files

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
   `{api-types,rules,frontend}/**/*.{js,mjs,cjs,ts,tsx,jsx,css,json,md}`, and tick **On save**.
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
| `DOCUMENT_RETENTION_SECONDS` | Longest time shared documents stay in EUDIPLO | `1800` |
| `PULL_REPEAT_WINDOW_SECONDS` | How long repeated pulls return the same documents after the first delivery | `60` |
| `REQUEST_RECORD_RETENTION_SECONDS` | How long a request record is kept after the request ended | `604800` (7 days) |
| `ALLOW_PLAIN_HTTP` | Allows `http://` for `CONNECTION_BASE_URL` outside development. Only for a closed network | `false` |
| `WORKER_ENABLED` | Runs the background worker thread (the tests switch it off) | `true` |
| `LOGIN_SESSION_HOURS` | How long a DO.IT sign-in lasts | `8` |

See `backend/.env.example` for the authoritative list. Settings are loaded by
`app/config.py` via pydantic-settings; add a field there before adding a new
variable, or it will be ignored.

`EUDIPLO_ISSUER_CLIENT_ID` and `EUDIPLO_ISSUER_CLIENT_SECRET` are read only by the
developer script that issues test documents ([Test credentials](#test-credentials-for-a-test-wallet));
the backend ignores them.

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
