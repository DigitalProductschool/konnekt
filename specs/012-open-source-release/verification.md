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

## Phase 5, package C3: the scrub (2026-11-24)

T021 to T023, by the coordinator on `HEAD` `1c36415`, branch `opensource`; nothing committed.

### T021: the scrub

A script in scratch, not committed, applied research R5's "Scrub patterns" in their order to
`specs/001-…` to `specs/011-…` and `.specify/bugs/` and nothing else; one line was then changed by
hand (below). 30 files, 80 lines.

| Pattern | Replacement | Places |
|---|---|---|
| H1a, H1b | `middleware.example.org`, `eudiplo.example.org` | 3, 7 |
| H2 | `my-team.example.org` | 1 |
| T1a | `` `<tenant>` `` | 11 |
| T2 | `<trust-list-id>` | 5 |
| L1 | `<git-dir>/worktrees/…`, `<checkout>/…` | 13, 12 |
| L2 | `<checkout>/…` | 1 |
| L3 | `<scratchpad>` | 8 |
| L4 (this task's own, see below) | `<downloaded-assets>/` | 3 |
| I1, I2 | `<form-connection-id>`, `<session-id>` | 5, 4 |
| S1 | `<form-prototype-repo>/`, then "the form prototype" | 1, then 12 (and 1 by hand) |
| S3 | `Konnekt's`, `konnekt_verify` | 1, 1 |

Where the run differs from R5's table (counted at `9fbce6c`):

- **L1**: 25 places instead of 21. The bug record `german-copy-user-tests` (`assessment.md`,
  `fix.md`), written after the audit, holds four more lines of the same kind.
- **L4, new** (UNCERTAIN): the bug record `new-visuals` (`assessment.md` twice, `fix.md` once),
  also written after the audit, names a download folder in the home directory of the machine
  the fix ran on. R5's second check matches it and no allowlist line covers it, so it got a
  placeholder in the style of L1 to L3.
- **S1**: `.specify/bugs/password-eye-icon-border/fix.md:57` names `sk-proto-1-phase2`. That is
  this repository's own old branch (merged as pull request #61), not the form prototype, so R5's
  replacement would have made the sentence false. Changed by hand to "another worktree of this
  repository" (UNCERTAIN). Two possessives (`` `sk-proto-1`'s ``, "sk-proto-1 quickstart")
  became "the form prototype's" so that the sentences still read. The bare name stays in
  `specs/001-servicebw-eudi-middleware/spec.md:3` and `plan.md:3,8`, as R5 proposes.
- **Not applied**, as the task says: the Figma patterns; T3 in the specs (`9.0.0-mdocfix.1` stays
  in `specs/001-…/research.md` and `specs/002-…/quickstart.md`, `research.md`); C1 in the specs
  (Coolify stays as the record of how the project was built).

R5's five "Checks after the scrub", counted in the two folders (git grep, this feature's
directory left out):

| Check | `specs/` before → after | `.specify/bugs/` before → after | Left after, in the whole tree |
|---|---|---|---|
| 1 `dpschool\.(app\|io)` | 2 → 0 | 8 → 0 | the contact address in `README.md`, `SECURITY.md`, `CONTRIBUTING.md` (allowlist) |
| 2 machine paths | 18 → 0 | 16 → 0 | none |
| 3 `dps` as a word | 8 → 0 | 3 → 0 | `backend/.env.example:20` (T1b, T028's file) |
| 4 hosted ids, trust list | 1 → 0 | 11 → 0 | none |
| 5 the sibling project | 3 → 3 | 13 → 0 | `specs/001-…/spec.md:3`, `plan.md:3,8` (allowlist) |

T005's old-name search over the tracked and untracked files, without this feature's directory, now
prints **nothing** (before: the 31 lines of machine paths listed for phase 5).

### T022: the tests' tenant

`'dps'` → `'test-tenant'` at `backend/tests/fake_eudiplo.py:69,229` and
`backend/tests/unit/test_issue_test_credentials.py:413`, nothing else. At line 229 the statement grew
to 91 columns, and Ruff's formatter split it over two lines.

### T023: the blank screenshot

`.specify/bugs/published-sticky-bar/before-activity-open-scrolled-to-end.png` (an empty white
capture, viewed again) is deleted. The two places that pointed to it were reworded:
`assessment.md`, reproduction step 4, and `test.md`'s list of screenshots. The other eight
screenshots stay. `test.md` also names three `after-*.png` screenshots that were never committed.
That was already so, and this task left it unchanged.

### The gates

| Gate | Result |
|---|---|
| R5's five checks, the old-name search | as above |
| `uv run ruff check .`, `ruff format --check .` | pass (111 files) |
| `uv run mypy app/ scripts/ tests/` | passes (97 source files) |
| `uv run pytest`, database `konnekt_db_test` on `localhost:5435` | **2,643 passed**, none skipped (T003: the same; 14 min 7 s) |
| Node gates | not run: no file of `api-types/`, `rules/`, `frontend/` or `mcp/` changed |
| `sha256sum LICENSE` | `6fc9e709…1e665`, unchanged |

## Phase 6, package C4: the security fixes (2026-11-24)

T024 to T028, by task agents one after the other (they share `frontend/nginx.conf`, `schemas.py`
and `config.py`) on `HEAD` `440a170`, branch `opensource`; nothing committed. The coordinator's
checks at the end, below.

### What was made

| Task | Finding | Files | Result |
|---|---|---|---|
| T024 | 3, the headers | `frontend/nginx.conf` | `add_header_inherit merge;` at server level (nginx 1.31.9 accepts it; it appeared in 1.29.3), `X-Frame-Options: DENY`, `Content-Security-Policy: frame-ancestors 'none'` (no page of the app frames another; the PDF is a download), `X-Content-Type-Options` kept, `X-XSS-Protection` left as it was. On the built image the three headers were missing on `/`, `/index.html`, SPA routes and every asset before, and are on every answer after, each once, proxied and error answers included; `Cache-Control` unchanged |
| T025 | 4, the sign-in | `backend/app/services/sign_in_throttle.py` (new), `routers/auth.py`, `models.py`, `schemas.py` (`LoginRequest`), `config.py`, `services/worker.py`, `errors.py`, migration `ef2b83b1b34c_sign_in_throttle.py` (new), `.env.example`, `frontend/nginx.conf`, 21 tests | table `sign_in_throttles`, one row per submitted username keyed by the SHA-256 of its stored form, under a row lock (an upsert then `FOR UPDATE`); every attempt counts before its hash, a correct one deletes the row; from the 5th failure in a row a wait of 30 s, doubling to at most 900 s; an attempt during the wait answers `429 rate_limited` with `Retry-After`, runs no hash and doesn't count; the worker deletes forgotten rows. `max_length` 200 (username) and 1024 (password), refused with `400` before anything counts. nginx: `limit_req` 30 a minute per address, burst 5 queued, its own `429` in the `{error, message}` envelope in both languages. The sign-in page already shows the server's message (no change) |
| T026 | 5, client registration | `backend/app/services/oauth.py`, `routers/oauth.py`, `schemas.py` (`RegisterRequest`), `config.py`, `services/worker.py` (the shared "unused" condition), `.env.example`, `frontend/nginx.conf`, 28 tests | at most 10 redirect URIs of at most 2,000 characters, bounds on every other field, refused with RFC 7591's `400 invalid_client_metadata`; at most `OAUTH_MAX_UNUSED_REGISTRATIONS` (1,000) unused registrations: a new one **removes the oldest unused ones** rather than being refused, because refusing would let an attacker block every new client with about 17 registrations a minute, while removing reaches a legitimate client only between its registration and its consent. Registrations take turns under an advisory lock; removal locks with `SKIP LOCKED` and checks again; `create_code` locks the client (`FOR KEY SHARE`), so a consent racing a removal answers `400` instead of a `500`. nginx: `/api/oauth/register` 10 a minute, burst 20; the rest of `/api/oauth/` 60 a minute, burst 60; 16 KB bodies; an RFC-shaped JSON `429` |
| T027 | 6, the consent page | `frontend/src/pages/Authorize/` (`ClientFacts.tsx` new, `utils.ts`, `types.ts`, `constants.ts`, `index.tsx`, `ConsentForm.tsx` comment, `utils.test.ts`), 17 tests | "Read only" is checked for a client the account has no connection with, whatever the request asks for; with a connection, the requested level as before, with the step-up line. Under the intro: that the agent registered itself and chose its name (`dcr`), or publishes it on its host (`cimd`); and where the browser goes after the answer: the redirect URI's host as the browser parses it (no userinfo, no port, IDN as `xn--`), "an app on this computer" for loopback, the scheme for an app's own links. No API change. Checked in Chromium at 1280 and 320 px in both languages, end to end to a code with scope `read` |
| T028 | 10, 13, 14 (start), 20 (`server_tokens`); FR-007 | `backend/Dockerfile`, `frontend/Dockerfile`, `mcp/Dockerfile`, `docker-compose.yml`, `frontend/nginx.conf`, `frontend/nginx/40-servicebw-access.sh`, `backend/.env.example` | `ENV APP_ENV=production` and `ENV UV_NO_SYNC=1` in the backend image (its start ran the migrations and uvicorn with no sync and no dev package in the venv); `127.0.0.1:` on the four published ports of the development compose file; `server_tokens off;`; `LICENSE` and `NOTICE.md` at `/usr/share/doc/konnekt/` in all three images (`LICENSE`'s SHA-256 checked in each); `backend/LICENSE` not copied before `uv sync` (T007's report: not needed); the two Coolify comments reworded; the tenant's name gone from `.env.example`; `/THIRD-PARTY-NOTICES.txt` served with `charset=utf-8` (phase 3's handed-on note), nothing else's charset changed |

### Decisions taken during the phase

- **`backend/app/errors.py`** (T025, outside its list, accepted): the `HTTPException` handler
  dropped the exception's headers, so `Retry-After` never reached the client; it now passes them
  through. No exception raised before this phase set headers.
- **Validation errors are `400`** in this codebase, not `422`: the over-long sign-in fields answer
  `400 Validation error`.

### The gates (coordinator, on the finished phase)

| Gate | Result |
|---|---|
| `uv run pytest`, database `konnekt_db_test` | **2,692 passed**, none skipped (T003: 2,643; +21 T025, +28 T026), by T026 on the backend as it now stands; afterwards only a comment line of `.env.example` and the Dockerfile changed under `backend/` |
| `uv run ruff check .`, `ruff format --check .`, `mypy app/ scripts/ tests/` | pass (115 files; 100 source files) |
| `uv run python -m scripts.export_check_fixtures --check` | passes |
| `npm run lint`, `npm run format:check` | pass |
| `npm test` (T027) | rules **2,678**, frontend **2,058** (+17), mcp **513** |
| `npm run build` (T027) | passes |
| `reuse lint` (6.3.0) | compliant; 1,174 of 1,174 files |
| `nginx -t`, on the template rendered by `nginx:1.31.9-alpine`'s entrypoint | passes (each of T024 to T028) |
| The three production images | build; run checks as in the table |
| `sha256sum LICENSE`; `cmp LICENSE backend/LICENSE LICENSES/EUPL-1.2.txt` | `6fc9e709…1e665`; identical |
| `backend/alembic/versions/` | one new file, nothing else changed; the four generated files, both lockfiles and `LICENSE`/`LICENSE.de` unchanged |
| The old names and R5's patterns over the changed files | nothing |

### Handed on

- **T032, `SECURITY.md`**: findings 3 to 6, 10, 13, 14 (start command), 20 (`server_tokens`)
  are fixed; 14 keeps the root user and the base images' digests, 20 the rest. Two limitations
  the fixes leave: someone who knows a username can keep it waiting with one wrong attempt per
  wait (at most 15 minutes each), and a password longer than 1,024 characters, which the CLI
  can still set, can no longer sign in.
- **T032, README and ARCHITECTURE**: the settings `SIGN_IN_FAILURES_BEFORE_WAIT` (5),
  `SIGN_IN_FIRST_WAIT_SECONDS` (30, `0` switches the waits off), `SIGN_IN_MAX_WAIT_SECONDS` (900,
  also how long failures are remembered) and `OAUTH_MAX_UNUSED_REGISTRATIONS` (1,000, at least 1);
  the table `sign_in_throttles` and the worker step `delete_expired_sign_in_throttles`; the error
  handler passing headers through; nginx's three `limit_req` zones and their `429` bodies (the
  sign-in's `{error, message}`, OAuth's RFC-shaped `too_many_requests`), and that behind a proxy
  without `TRUSTED_PROXY_CIDRS` every client shares one bucket; the consent page's preselection
  and facts line; the development compose file's ports bound to `127.0.0.1`; the backend image's
  `APP_ENV=production` and `UV_NO_SYNC=1`; the licence files at `/usr/share/doc/konnekt/` in the
  images; the notices' charset.
- **Not changed, as records**: spec 007's `contracts/oauth.md` and `ui-screens.md` (S1) and spec
  008's design notes (§5.2, S19) still say the requested level is preselected; they record how
  spec 007 was built.
- **This machine**: the running `postgres` container was started before T028 and stays published
  on all interfaces until it is recreated.

### Needs a person

On a running stack: a wrong password six times, then the refusal and its message in both
languages, then the right password after the wait; the consent page for a client the account
has never connected, with a real agent (Claude Code or another MCP client).

## Phase 7: the checklist and the files for agents (2026-11-24)

T029 to T034, by four task agents side by side on `HEAD` `c57dffc`, branch `opensource`, each on
its own files; nothing committed. The coordinator's checks at the end, below.

### What was made

| Task | Files | Result |
|---|---|---|
| T029 | `CLAUDE.md` | the rename was complete; added: `NOTICE.md` and `REUSE.toml` in the documents' table, one rule each for the sign-in throttle and the registration limits (pointing to ARCHITECTURE's "Sign-in (DO.IT team members)" and "Agent access and the MCP server (spec 007)"), `npm run notices -w frontend` and `uvx --from reuse==6.3.0 reuse lint` among the commands, the REUSE check in "Before you finish" and the CI paragraph, `LICENSE` under "Never" with its two copies, and the notices in the documentation checklist |
| T030 | `.specify/memory/constitution.md` | 1.2.1 → 1.2.2 (patch), with its Sync Impact Report: the title "Konnekt Constitution", "this repository" for "this template", the `@konnekt/` package names, the REUSE check as a gate of Principle III |
| T031 | `mcp/plugin/README.md` | the install command names `DigitalProductschool/konnekt` instead of a placeholder; the manifests, the server's name, its instructions and the eight skills already used the new names. The Account page's link `#installing-the-plugin` resolves in the root README |
| T032 | `README.md`, `docs/ARCHITECTURE.md`, `SECURITY.md` | everything phases 3 and 6 handed on: the eighth CI job and the REUSE check, the served notices, the four settings, the throttle, the registration limits, the consent page, nginx's three zones and headers, the worker's new step 9 (later steps renumbered), the error handler's headers, the images' `APP_ENV`, `UV_NO_SYNC` and licence files, the ports on `127.0.0.1`; the README's plugin command as in T031; `SECURITY.md` names what was fixed and the two limitations the fixes leave (items 10 and 11); the open findings checked against the code, none changed |
| T033 | `pr.md` | title, five-line summary, who posts (research R8), how to post, what the mentor's statement fills in (the repository, the date, the notice), `LICENSE`'s SHA-256, the attribution line |
| T034 | `handover.md` | ten steps in FR-043's order, each with "When" and "Done when"; the existing repository only as "the existing repository" and `<existing-repository-url>` |

### Decisions taken during the phase

- **The consent statement's wording** (T033): the mentor's text is not in the repository (spec,
  Context, step 9 names the step, not the words). The statements are posted with the mentor's
  wording as comments on `LICENSE` in the pull request (user, 2026-11-24), so `pr.md` names what
  is filled in (repository, date, notice) and does not repeat the text.
- **Three more merged branches** (T034, coordinator): `german-copy-user-tests`,
  `login-welcome-motion` and `new-visuals` were merged after research R5's audit; `handover.md`
  lists them with the 18 (21, then `opensource`). `tmp-german` is still not merged; its tip has
  moved since R5.
- **`SECURITY.md`** (coordinator): the paragraph on what was fixed stands before the list of what
  was not, so that the list's introduction leads into it.

### The gates (coordinator, on the finished phase)

| Gate | Result |
|---|---|
| `npm test -w mcp`, `npm run lint -w mcp` (T031) | **513** passed; clean |
| `reuse lint` (6.3.0, with the two git variables) | compliant; 1,176 of 1,176 files |
| The old names over the eight changed files | nothing |
| Machine paths over the same files | nothing |
| `sha256sum LICENSE` | `6fc9e709…1e665` |
| Prettier | `SECURITY.md`, `pr.md`, `handover.md`, the constitution and the plugin's README pass; `README.md`, `docs/ARCHITECTURE.md` and `CLAUDE.md` failed before the phase too and are outside the hook's scope |

Only Markdown changed, so the other gates were not rerun; T035 runs all of them on the finished
tree.
