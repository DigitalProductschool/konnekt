# Code Quality

Linting and code formatting is set up for both parts of the stack. The tools are already configured, you only need to point your editor at them (see [Format on save](#format-on-save)).

## What runs where

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
- **Licensing** — [REUSE](https://reuse.software/) checks that every file has a licence and a
  copyright holder, from `REUSE.toml` at the root, and that `LICENSES/` holds exactly the
  licence texts those name: `uvx --from reuse==6.3.0 reuse lint` from the root. A new file
  that `REUSE.toml` doesn't cover needs an entry there. `npm run notices -w frontend` writes
  `frontend/public/THIRD-PARTY-NOTICES.txt`, the licence texts of the packages that reach the
  built frontend, which nginx serves at `/THIRD-PARTY-NOTICES.txt`; run it after changing
  those packages and commit the result (a rerun leaves the file unchanged).

## Git hooks (pre-commit)

The hooks in `.pre-commit-config.yaml` run on every `git commit`:

- `ruff check --fix` and `ruff format` on Python files
- `prettier --write` and `eslint --fix` on `api-types/`, `rules/`, `frontend/` and `mcp/`
  files, run from the repository root
- trailing whitespace (not in `docs/patches/`, where a patch must stay byte for byte), merge
  conflict markers, large files
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

## Continuous integration

GitHub Actions runs `.github/workflows/ci.yml` on every push to any branch, on every pull
request, and by hand from the Actions tab (*Run workflow*). It has eight jobs, one per kind of
check and side, a secret scan and the licensing check, so each is its own status check on a pull
request. They run in parallel:

| | Lint & format | Types | Tests |
|---|---|---|---|
| **Backend** (`backend/`) | `ruff check`, `ruff format --check` | `mypy app/ scripts/ tests/` | `pytest` |
| **Frontend & packages** (root) | `npm run lint`, `npm run format:check` | `npm run build` | `npm test` |

Each job installs its own dependencies: `uv sync --locked`, which fails when `uv.lock` no longer
matches `pyproject.toml`, or `npm ci`. `pytest` runs against a `postgres:18-alpine` service with
the database `konnekt_db_test`; EUDIPLO is faked as on your machine, so no job needs a secret.
In the lint & format jobs, the format check runs after a failed lint too, so one run reports
both. The `licensing` job runs `reuse lint` (REUSE 6.3.0 through `uvx`; see
[What runs where](#what-runs-where)), and `secrets` runs gitleaks over the history
([Secrets (gitleaks)](#secrets-gitleaks)).

The versions match the Dockerfiles: Python from `backend/.python-version`, uv 0.12.9 and
Node 26. Change them together, and add a new check to the workflow when you add one to "Before
you finish" in `CLAUDE.md`.

To block merging a red pull request, make the jobs required status checks in the repository's
branch protection for `main` (all eight, or only types, tests, secrets and licensing if
formatting should stay advisory).

## Secrets (gitleaks)

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
  [Environment Variables](ARCHITECTURE.md#environment-variables)). If the commit was already pushed, add the
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

## Format on save

### VS Code

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

### JetBrains (WebStorm / PyCharm)

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
