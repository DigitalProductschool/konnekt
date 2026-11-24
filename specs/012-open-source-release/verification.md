# Verification: Publish the repository as open source under the EUPL-1.2

The run's record (tasks.md, "Path Conventions"). T003 starts it with the baseline on the untouched
tree; T005 and phase 8 append to it.

## T003: Baseline (2026-11-24)

### The tree

- `HEAD`: `19c82612fdec4823f5d56ecf3df8923b7b8a2a26` (`docs(012): record the final name and the
  new repository`), branch `opensource`. `git status` was clean before the gates and still clean
  after them.

### The licence texts

| File | SHA-256 | Bytes | Expected | Result |
|---|---|---|---|---|
| `LICENSE` | `6fc9e709ccbfe0d77fbffa2427a983282be2eb88e47b1cdb49f21a83b4d1e665` | 13,827 | rule 1, T001 | matches |
| `LICENSE.de` | `849b8890a8b53a08b782b77a9b01ee7e7df2e6b0cc2f6b660b8baf3f65b5d67f` | 15,096 | T002 (`849b8890…5d67f`) | matches |

### The gates

All of them pass on the untouched tree.

| Gate | Result |
|---|---|
| `npm run lint` (api-types, rules, frontend, mcp) | passes |
| `npm test`, `rules` | 46 files, **2,678 tests passed** |
| `npm test`, `frontend` | 49 files, **2,041 tests passed** |
| `npm test`, `mcp` | 15 files, **513 tests passed** |
| `npm run build` (typecheck of api-types, rules, mcp; frontend and mcp builds) | passes; one warning, already present: the frontend's `index-*.js` chunk is 944.81 kB, over Vite's 500 kB warning limit |
| `uv run ruff check .` | passes |
| `uv run ruff format --check .` | passes (111 files) |
| `uv run mypy app/ scripts/ tests/` | passes (97 source files) |
| `uv run pytest`, database `template_db_test` on `localhost:5435` | **2,643 tests passed**, none skipped (14 min 17 s) |

Total: 7,875 tests (Node 5,232, pytest 2,643). SC-009 and T035 compare against these counts.

### The machine

- **Docker**: available (Docker 29.9.2, Compose v5.6.1).
- **PostgreSQL on port 5435**: available through `docker compose up -d postgres` (PostgreSQL
  18.6). It was not running at the start, and the database `template_db_test` was missing: T003
  created it. Phases 6 and 8 can rely on both.
- **Versions**: Node 20.19.2, npm 9.2.0, uv 0.13.0, Python 3.13.5 (the backend's
  `.python-version` is 3.13).
- **Differences from CI**: CI runs Node 26 and uv 0.12.9 (`.github/workflows/ci.yml`). The gates
  pass on this machine's Node 20 and uv 0.13 all the same. T036's second run of `NOTICE.md`'s
  commands uses `node:26-alpine` in Docker, which this machine has.
- **gitleaks**: not installed on this machine. T036 installs it at the version and checksum CI
  pins.
