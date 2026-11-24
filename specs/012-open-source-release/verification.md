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

## T004 and T005: The rename (2026-11-24)

On `HEAD` `02037a9`, branch `opensource`, with nothing else in flight. The script (research R7,
"The rename script") ran from scratch over the tracked files only (`git ls-files`), minus step 1's
exclusions: `backend/alembic/versions/`, the four generated files, `specs/012-open-source-release/`,
both lockfiles, `LICENSE`, `LICENSE.de` and binary files (none of the binary files holds an old
name). It works on bytes, so line endings stay as they were.

### What changed

| Step | Rule | Lines | Files | Where (files) |
|---|---|---|---|---|
| 2 | `@connection-portal/` → `@konnekt/`; `"name": "community-template-frontend"` → `"name": "@konnekt/frontend"` (1 line) | 688 | 298 | `frontend` 191, `rules` 58, `mcp` 30, `specs` 14, root 3, `api-types` 1, `docs` 1 |
| 3 | `connection-portal(?!:)` → `konnekt` | 34 | 15 | `mcp` 6, `specs/007` and `specs/008` 6, root 2 (`package.json`, `README.md`), `.claude-plugin` 1 |
| 4 | `template_db` → `konnekt_db` (with `_test` and the throw-away names) | 151 | 37 | `specs` 21, `.specify/bugs` 8, root 4, `backend` 2 (`.env.example`, `app/config.py`), `.github` 1, `docs` 1 |
| 5 | `github.com/DigitalProductschool/batch27-faro` → `github.com/DigitalProductschool/konnekt` | 1 | 1 | `frontend/src/pages/Account/constants.ts` |

Step 6 and T004's list, by hand:

- `backend/pyproject.toml`: the name `backend` → `konnekt-backend`; the description "FastAPI
  backend with PostgreSQL" → "Konnekt's backend: the middleware between serviceBW forms and the
  EUDI Wallet".
- `README.md:1`: "serviceBW ↔ EUDI Wallet Middleware" → "Konnekt"; the first paragraph opens
  "Konnekt is the middleware between serviceBW forms and the EUDI Wallet" and ends "in Konnekt's
  management UI" (was "in **Konnekt**, the middleware's management UI").
- `CLAUDE.md:1`: "AI Agent Instructions: Konnekt".
- `backend/app/main.py:118`: the API's title "Konnekt".
- `docs/ARCHITECTURE.md:85`: `dps-react-python-template/` → `konnekt/`.
- `.claude-plugin/marketplace.json`: the owner "DO.IT, City of Stuttgart" → "Team Faro".
- The plugin's, the marketplace's and the MCP server's name (`.claude-plugin/marketplace.json`,
  `mcp/plugin/.claude-plugin/plugin.json`, `mcp/plugin/.mcp.json`, `mcp/src/server.ts`,
  `mcp/plugin/README.md`, `README.md`) and `mcp/src/guidance.test.ts`, `mcp/test/server.test.ts`
  were already `konnekt` after step 3; nothing left by hand.

The rename changes the order of imports (`@konnekt/` sorts after `@kern-ux…`) and lets some
imports fit on one line. The project's own tools fixed 31 of the renamed files and nothing else:
`eslint --fix` (`simple-import-sort`) on 8 files of `frontend/src`, then `prettier --write` on
those and on the 23 files `npm run format:check` named (`rules` 6, `frontend` 12, `mcp` 5).

In all, 338 files changed (962 insertions, 1,059 deletions), the two lockfiles included and this
record not.

### The storage keys

Before the script and after step 3, outside `specs/012-open-source-release/`: `connection-portal:`
on **44 lines in 27 files**, as R7 counts, and no `connection-portal` without a colon after it
outside the exclusions. Every match is a storage key or a test's key (`…:local-draft:v1:`,
`…:language:v1`, two test keys of other shapes).

### The lockfiles

- `package-lock.json`: only the five names and their workspace links (`@konnekt/api-types`,
  `@konnekt/rules`, `@konnekt/mcp`, `@konnekt/frontend`, `konnekt`), 27 lines in, 27 out; written
  by `npm install` with npm 9.2.0 (Node 20.19.2). Node 26.13.1 / npm 11.20.0 (`node:26-alpine`,
  `npm install --package-lock-only` on a copy) writes the same file byte for byte.
- `backend/uv.lock`: only the project's entry, renamed `backend` → `konnekt-backend` and moved to
  its sorted place, 49 lines in, 49 out; written by uv 0.13.0, unchanged by `uv lock` (no
  `--upgrade`). uv 0.12.9, CI's (`uvx uv@0.12.9 lock --check`), accepts it.

### The gates

| Gate | Result | T003 |
|---|---|---|
| `uv run python -m scripts.export_check_fixtures --check` | passes | — |
| `npm run lint` | passes | passes |
| `npm run format:check` (CI's) | passes | — |
| `npm test`, `rules` | 46 files, **2,678 tests passed** | 2,678 |
| `npm test`, `frontend` | 49 files, **2,041 tests passed** | 2,041 |
| `npm test`, `mcp` | 15 files, **513 tests passed** | 513 |
| `npm run build` | passes; the same chunk warning (944.80 kB) | passes (944.81 kB) |
| `uv run ruff check .` | passes | passes |
| `uv run ruff format --check .` | passes (111 files) | passes (111 files) |
| `uv run mypy app/ scripts/ tests/` | passes (97 source files) | passes (97 source files) |
| `uv run pytest`, database `konnekt_db_test` on `localhost:5435` | **2,643 tests passed**, none skipped (13 min 29 s) | 2,643 |

`konnekt_db_test` was created on the PostgreSQL of `docker compose up -d postgres`; the existing
volume keeps its old databases (an existing installation, research R7).

### Migrations and generated files

`git diff --stat` shows nothing under `backend/alembic/versions/`, nothing in the four generated
files, nothing in `specs/012-open-source-release/` before this section, and `LICENSE` and
`LICENSE.de` with the SHA-256 of T003.

### The search

`grep -rnIE 'connection-portal|community-template|template_db|batch27'` over the tree without
`node_modules`, `.venv`, `dist` and the lockfiles prints 144 lines (before this section). One of
them is the checkout's `.git` pointer file, which git does not track and which is not part of the
repository. The other 143, in tracked files:

| Category | Lines | Files |
|---|---|---|
| `specs/012-open-source-release/**` (R7's allowlist: this spec's own text) | 70 | 4 |
| `connection-portal:`, the storage keys (R7's allowlist) | 44 | 27 |
| `batch27-faro` in paths of machines and scratch directories, which phase 5 replaces (R5: L1, L3, S1); two of them are also storage-key lines (`specs/010-revamp-backend-gaps/design-notes.md`) | 31 | 17 |
| anything else | 0 | 0 |

No `batch27` without `-faro` is left, and no `community-template` and no `template_db` outside
this spec.

## T004, amended (2026-11-24): no old name left

The user decided on 2026-11-24 that no old product name stays anywhere in the tree, the browser's
storage keys included (renamed without migration code: old local drafts and the old language
choice are no longer read); R7's allowlist shrinks to `specs/012-open-source-release/**`. Same
tracked files and step-1 exclusions as before.

### What changed

Hand edits first, where a blind replacement would make nonsense: 29 edits (35 places) in 14
files: `.specify/bugs/product-name-header/assessment.md`;
`specs/001-servicebw-eudi-middleware/design-notes.md`; `specs/007-agent-mcp-server/` `data-model.md`,
`plan.md`, `spec.md` (the old name split over two lines); `specs/008-kern-revamp-redesign/`
`design-notes.md`, `figma-audit/report.md`, `figma-audit/requirements.md`, `pr.md`,
`quickstart.md`, `research.md`, `spec.md`, `tasks.md`; and
`specs/010-revamp-backend-gaps/figma-audit/requirements.md`. Lines that set the old name against
Konnekt now state Konnekt alone ("Konnekt" as the product's name; "named Konnekt, and by no other
name"); a synonym list lost the old entry; and the old checks that searched for the old name now
read `grep -rn "<earlier product name>…"` and "0 with the earlier product name". Two of the
passages were re-wrapped afterwards.

Then by script:

| Replacement | Lines | Files |
|---|---|---|
| `connection-portal:` → `konnekt:` (`LOCAL_DRAFT_PREFIX`, `LANGUAGE_STORAGE_KEY`, their tests, comments, docs, specs) | 43 | 27 |
| `CONNECTION_PORTAL_MCP_URL` → `KONNEKT_MCP_URL` | 17 | 8 |
| `Connection Portal` → `Konnekt`, with an article before it on the same line ("the Connection Portal's" → "Konnekt's") | 59 | 22 |

The 44th storage-key line was rewritten by hand (`specs/008-kern-revamp-redesign/design-notes.md`,
§8.2, which listed it among identifiers that keep their names). By hand as well: the plugin's
author in `mcp/plugin/.claude-plugin/plugin.json`, "DO.IT, City of Stuttgart" → "Team Faro"
(`mcp/src/guidance.test.ts` doesn't pin it). The changed lines with "Konnekt" twice or an odd
reading were read once more; none needed another change.

No formatter had to run: lint and the format check passed on the first try.

### Checks

- `git diff -- backend/ | sha256sum` before and after: `f95393a2…1809093` both times; no file under
  `backend/` changed.
- `export_check_fixtures --check` passes; nothing under `backend/alembic/versions/`, in the four
  generated files or in `LICENSE`/`LICENSE.de` changed.
- `npm run lint` and `npm run format:check` pass; `npm test`: rules **2,678**, frontend **2,041**,
  mcp **513** (T003: the same); `npm run build` passes, with the same chunk warning (944.76 kB).
  pytest was not run again: no file under `backend/` changed.
- `git ls-files | grep -v '^specs/012-open-source-release/' | xargs grep -nIiE
  'connection[ _-]?portal|community-template|template_db|batch27'` prints exactly the 31
  `batch27-faro` lines listed for phase 5 above, and nothing else.

## Phase 3, package C1: the terms (2026-11-24)

T007 to T014, by task agents on `HEAD` `a2adea1`, branch `opensource`; nothing committed. The
coordinator's checks at the end, below.

### What was made

| Task | Files | Result |
|---|---|---|
| T007 | the five `package.json`, `package-lock.json`, `backend/LICENSE`, `backend/pyproject.toml` | `"license": "EUPL-1.2"` in each manifest (`"private": true` kept); `backend/LICENSE` byte-identical to `LICENSE`; `license = "EUPL-1.2"` and `license-files = ["LICENSE"]`, no classifier; the lockfile gained the five licence lines only; `backend/uv.lock` unchanged (`uv lock`; uv 0.12.9's `lock --check` passes) |
| T008 | `frontend/src/index.css`, `docs/KERN-DESIGN-SYSTEM.md` | attribution comments at A's three sub-blocks, B's six rules and C's rule (`@kern-ux/native` 2.8.2, `dist/kern.css` lines, EUPL-1.2); the "add the kit's styles" sentence in both files asks for the same attribution; D's section names `@kern-ux-annex/kern-react-kit` 2.40.0 and EUPL-1.2. A Vite build before and after: all 39 output files byte-identical |
| T009 | `NOTICE.md` | from R4's draft with R2 and R3; KERN's design kit on Figma Community: publisher "KERN UX-Standard", "KERN 2 Design-Kit"; the page states no terms, so "terms not stated here" |
| T010 | `LICENSES/` (`EUPL-1.2.txt` = `LICENSE`, `OFL-1.1.txt`, `Apache-2.0.txt`, `MIT.txt`, `Unicode-3.0.txt`), `REUSE.toml`, research R9 | `reuse` 6.3.0 compliant with REUSE 3.3; R9's "To be verified" answered there; the Unicode data's identifier is `Unicode-3.0` |
| T011 | research R3, "Data sets" | the English country names, the persona pools and the Stuttgart streets are the team's own compilations: clear, nothing replaced |
| T012 | `frontend/scripts/third-party-notices.mjs`, `frontend/public/THIRD-PARTY-NOTICES.txt`, `frontend/package.json` (`notices`), `eslint.config.mjs` (Node globals for `frontend/scripts/*.mjs`) | 26 packages, the same set as R4, checked against the build's source maps; hand-kept sections for the theme, lodash and the JSX runtime, the Fira fonts with the OFL, the ICC profile, brotli, `dfa`, `fontkit`; 84,024 bytes, SHA-256 `373b371a…`; the build copies it to the output's root, and nginx 1.31.9 with the repository's `nginx.conf` serves `/THIRD-PARTY-NOTICES.txt` with `200` |
| T013 | `.github/workflows/ci.yml` | new job `licensing` (`uvx --from reuse==6.3.0 reuse lint`); `actions/checkout` pinned to v7.0.1's commit, `actions/setup-node` to v7.1.0's, each checked with `git ls-remote` and GitHub's API |
| T014 | research R3 | the four star files are gone (`320728d`) and nothing imports them; the eight `.webp` pictures viewed, none shows the star; the user's answer (2026-11-24): the designer drew and rendered them herself in a design or 3D tool, no third-party images or models |

### Decisions taken during the phase

- **The Tailwind packages** (T007, research R4's proposal): the task's condition, "the MCP image
  then installs just the six runtime packages", failed by one package: after the move,
  `npm ci -w mcp --omit=dev` installs seven, the six and `fast-deep-equal` 3.1.3 (MIT), which npm
  lets through from the frontend's tree (before the move: 29, with Vite, rolldown, postcss and
  `lightningcss` 1.33.0). The research's reading that every extra package came from Tailwind's
  placement was partly wrong. The user decided on 2026-11-24 to make the move: the coordinator
  moved `@tailwindcss/vite` and `tailwindcss` to `devDependencies` and ran `npm install`;
  `package-lock.json` keeps every entry and version, only `dev` flags and the workspace's manifest
  copy changed. Rechecked in a scratch copy: seven packages. No image or CI step installs with
  `--omit=dev` apart from the MCP image's last stage. `NOTICE.md` says what the MCP image holds.
- **Email addresses in the served notices**: `THIRD-PARTY-NOTICES.txt` holds two authors'
  addresses, both inside upstream licence notices reproduced verbatim (`@noble/ciphers`,
  `clone`), which their MIT licences require to be kept. They stay; no other file of the phase
  holds an address.

### The gates (coordinator, on the finished phase, after a reboot of the machine)

| Gate | Result |
|---|---|
| `npm run lint`, `npm run format:check` | pass |
| `npm test` | rules **2,678**, frontend **2,041**, mcp **513** (T003: the same) |
| `npm run build` | passes; `dist/THIRD-PARTY-NOTICES.txt` identical to `public/`'s |
| `npm run notices -w frontend` | leaves the file unchanged |
| `reuse lint` (6.3.0, with the two git variables) | compliant; 1,168 of 1,168 files with copyright and licence information |
| `uv run ruff check .`, `ruff format --check .`, `mypy app/ scripts/ tests/` | pass (111 files; 97 source files) |
| `uv run pytest` | **2,643 passed**, by T007 after its backend changes; nothing under `backend/` changed afterwards except the new `backend/LICENSE` |
| `uvx uv@0.12.9 lock --check` in `backend/` | passes |
| `sha256sum LICENSE`; `cmp LICENSE backend/LICENSE LICENSES/EUPL-1.2.txt` | `6fc9e709…1e665`; identical |
| `git diff` of `LICENSE`, `LICENSE.de`, `backend/alembic/versions/`, the four generated files | no change |
| T005's old-name search outside this feature's directory | only the 31 lines of machine paths that phase 5 replaces; none in a file of this phase |

### Handed on

- **T028**: the backend Dockerfiles need not copy `backend/LICENSE` before `uv sync`: hatchling
  1.33.0 builds and installs the project without the file (it then leaves `License-File` out of
  the metadata, without a warning), and both images' `uv sync` steps passed without it in
  throwaway builds. Hatchling is not pinned in `[build-system]`; a later version could start
  failing on a pattern without a match, and one `COPY` line would remove that risk.
- **Phase 6** (`frontend/nginx.conf`): nginx serves `THIRD-PARTY-NOTICES.txt` as `text/plain`
  without a charset, and the file is UTF-8 (the German EUPL text, ©); `charset utf-8;` would fix
  it.
- **T029 and T032**: README's "Continuous integration" still counts seven jobs; the REUSE job and
  `npm run notices -w frontend` are in neither README nor `CLAUDE.md` yet.
- **T036**: this checkout's `.venv` still holds the project's distribution under its old name
  beside `konnekt-backend`, which the `pip-licenses` command of `NOTICE.md` would list; a fresh
  `uv sync` or clone does not.
- **The `licensing` job** runs `uvx` on the runner's own Python (the root has no
  `.python-version`); `--python 3.13` would pin it. Not run on GitHub yet.
