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
| `uv run pytest`, the test database under the old database name on `localhost:5435` | **2,643 tests passed**, none skipped (14 min 17 s) |

Total: 7,875 tests (Node 5,232, pytest 2,643). SC-009 and T035 compare against these counts.

### The machine

- **Docker**: available (Docker 29.9.2, Compose v5.6.1).
- **PostgreSQL on port 5435**: available through `docker compose up -d postgres` (PostgreSQL
  18.6). It was not running at the start, and the test database (then under the old database
  name) was missing: T003 created it. Phases 6 and 8 can rely on both.
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
| 2 | the old package scope → `@konnekt/`; the template's frontend package name → `"name": "@konnekt/frontend"` (1 line) | 688 | 298 | `frontend` 191, `rules` 58, `mcp` 30, `specs` 14, root 3, `api-types` 1, `docs` 1 |
| 3 | the earlier working name, where no colon follows it → `konnekt` | 34 | 15 | `mcp` 6, `specs/007` and `specs/008` 6, root 2 (`package.json`, `README.md`), `.claude-plugin` 1 |
| 4 | the old database name → `konnekt_db` (with `_test` and the throw-away names) | 151 | 37 | `specs` 21, `.specify/bugs` 8, root 4, `backend` 2 (`.env.example`, `app/config.py`), `.github` 1, `docs` 1 |
| 5 | the existing repository's GitHub address → `github.com/DigitalProductschool/konnekt` | 1 | 1 | `frontend/src/pages/Account/constants.ts` |

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

Before the script and after step 3, outside `specs/012-open-source-release/`: the old storage
prefix on **44 lines in 27 files**, as R7 counts, and no earlier working name without a colon
after it outside the exclusions. Every match is a storage key or a test's key
(`…:local-draft:v1:`, `…:language:v1`, two test keys of other shapes).

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

T005's old-name search (the earlier working name, the template's package name, the old database
name, the existing repository's name) over the tree without `node_modules`, `.venv`, `dist` and
the lockfiles prints 144 lines (before this section). One of them is the checkout's `.git`
pointer file, which git does not track and which is not part of the repository. The other 143, in
tracked files:

| Category | Lines | Files |
|---|---|---|
| `specs/012-open-source-release/**` (R7's allowlist: this spec's own text) | 70 | 4 |
| the old storage prefix, the storage keys (R7's allowlist) | 44 | 27 |
| the existing repository's name in paths of machines and scratch directories, which phase 5 replaces (R5: L1, L3, S1); two of them are also storage-key lines (`specs/010-revamp-backend-gaps/design-notes.md`) | 31 | 17 |
| anything else | 0 | 0 |

The first part of the existing repository's name is left nowhere without the rest of it, and the
template's package name and the old database name are left nowhere outside this spec.

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
| the old storage prefix → `konnekt:` (`LOCAL_DRAFT_PREFIX`, `LANGUAGE_STORAGE_KEY`, their tests, comments, docs, specs) | 43 | 27 |
| the plugin's variable under its old name → `KONNEKT_MCP_URL` | 17 | 8 |
| the product's earlier name, as two words → `Konnekt`, with an article before it on the same line (the earlier name's possessive after "the" → "Konnekt's") | 59 | 22 |

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
- The old-name search in its case-insensitive form (later T037's), over the tracked files
  (`git ls-files`) without this feature's directory, prints exactly the 31 lines of paths
  holding the existing repository's name listed for phase 5 above, and nothing else.

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

## Phase 8: verification (2026-11-24)

T035 to T039 and T041 on `HEAD` `f3091e0`, branch `opensource`, with phases 1 to 7 committed; nothing
committed during the phase. T035 and the batch T036/T037 ran side by side, by task agents.

### T035: the gates on the finished tree

On `HEAD` `f3091e0`, branch `opensource`, 2026-11-24; the tree clean before the gates, and no
gate changed a tracked file. The machine as in T003: Node 20.19.2, npm 9.2.0, uv 0.13.0 (CI's uv
0.12.9 for the lock check). No `npm install` and no `uv sync` was needed.

| Gate | Result | T003 |
|---|---|---|
| `npm run lint` (api-types, rules, frontend, mcp) | passes | passes |
| `npm run format:check` (CI's) | passes | — |
| `npm test`, `rules` | 46 files, **2,678 tests passed** | 2,678 |
| `npm test`, `frontend` | 49 files, **2,058 tests passed** (+17, T027) | 2,041 |
| `npm test`, `mcp` | 15 files, **513 tests passed** | 513 |
| `npm run build` (typecheck of api-types, rules, mcp; frontend and mcp builds) | passes; the same chunk warning (`index-*.js` 947.36 kB) | passes (944.81 kB) |
| `uv run ruff check .` | passes | passes |
| `uv run ruff format --check .` | passes (115 files) | passes (111 files) |
| `uv run mypy app/ scripts/ tests/` | passes (100 source files) | passes (97 source files) |
| `uv run pytest`, database `konnekt_db_test` on `localhost:5435` | **2,692 tests passed**, none skipped (16 min 13 s, beside the Node gates) | 2,643 |
| `uv run python -m scripts.export_check_fixtures --check` | passes | — |
| `uvx uv@0.12.9 lock --check` in `backend/` | passes (60 packages) | — |
| `sha256sum LICENSE` | `6fc9e709…1e665`, rule 1's | the same |
| `cmp LICENSE backend/LICENSE LICENSES/EUPL-1.2.txt` | identical | — (the copies came with T007, T010) |
| `sha256sum LICENSE.de` | `849b8890…5d67f` | the same |

Total: 7,941 tests (Node 5,249, pytest 2,692); T003: 7,875. The difference, 66, is phase 6's
new tests: +17 in the frontend (T027), +21 (T025) and +28 (T026) in pytest.

- **The test files** (`git diff <T003>..HEAD`, over `*.test.ts(x)`, `mcp/test/` and
  `backend/tests/`): 70 files, 2 added (`test_sign_in_throttle.py`,
  `test_oauth_registration_limits.py`), 68 modified, none deleted or renamed (`--diff-filter=DR`
  prints nothing); 151 test files before, 153 after. No added line holds a `skip`, `xfail`,
  `.skip`, `.only` or `todo`, and `git grep` finds none of them at `HEAD` (none at T003 either).
  Declarations (`describe`/`it`/`test`, `def test_`): 5,060 at T003, 5,113 at `HEAD`. Five
  declaration lines left the diff, each replaced, none dropped: two `mcp` titles renamed with the
  product (the old name → `konnekt`); in `frontend/src/pages/Authorize/utils.test.ts` the
  old `preselectedLevelOf` block became `requestedLevelOf` with the same assertions ("preselects"
  → "asks for"), and the reducer's "shows the form with the preselected level" became two cases
  for T027's new preselection (without a connection: "Read only"; with one: the requested level).
  No Python test function was removed.
- **Migrations**: `git diff --name-status <T003>..HEAD -- backend/alembic/versions/` prints one
  line, `A ef2b83b1b34c_sign_in_throttle.py` (78 lines, T025); with `--diff-filter=a` (anything
  but added) it prints nothing.
- **Generated files and the licence texts**: `git diff --stat <T003>..HEAD` over the four
  generated files, `LICENSE` and `LICENSE.de` prints nothing.
- **The lockfiles**: `git log <T003>..HEAD` over `package-lock.json` and `backend/uv.lock` names
  two commits only, the rename (T004) and the terms (T007 and the Tailwind move), both recorded
  above; uv 0.12.9 accepts `backend/uv.lock` as it stands.

### T036: licences and secrets

On `HEAD` `f3091e0`, branch `opensource`, clean before and after (2026-11-24), beside T035. The
commands that write files ran in scratch copies of what a clone holds (`git ls-files -co
--exclude-standard`: 1,188 files, none untracked), never in the checkout: one copy for this
machine's Node 20.19.2 / npm 9.2.0 / uv 0.13.0, one for `node:26-alpine` (Node 26.13.1, npm
11.20.0) in Docker, one without dependencies for gitleaks.

| Check | Result |
|---|---|
| `uvx --from reuse==6.3.0 reuse lint`, on the checkout with the two git variables | compliant with REUSE 3.3; 1,176 of 1,176 files with copyright and licence information; licences used: Apache-2.0, EUPL-1.2, MIT, OFL-1.1, Unicode-3.0; none missing, unused or bad |
| `NOTICE.md`'s first command (`license-checker-rseidelsohn@4.4.2`), from the root after `npm install` | runs as written on both Nodes; **369 packages**; the two lists are identical line for line |
| `NOTICE.md`'s second command (`uv run --locked --with pip-licenses==5.5.5 …`), from `backend/` | runs as written with uv 0.13.0 on this machine and with CI's uv 0.12.9 (the official binary, mounted) in `node:26-alpine`; **56 packages**; identical lists; the project itself is left out, and no distribution under an old name appears |
| Tracked files after the commands | the 1,188 files of each copy are byte-identical to the checkout; no new file outside `node_modules` and `backend/.venv` |
| `npm run notices -w frontend`, in both copies | writes 26 packages; `cmp` against the committed `frontend/public/THIRD-PARTY-NOTICES.txt`: identical (84,024 bytes, SHA-256 `373b371a…`) |
| gitleaks 8.30.1, `gitleaks_8.30.1_linux_x64.tar.gz` | SHA-256 equal to `GITLEAKS_SHA256` in `.github/workflows/ci.yml` (`sha256sum --check --strict`: OK) |
| `gitleaks dir --redact`, over the clean copy of the tree (about 20.9 MB) | **no leaks found** |
| `gitleaks git --log-opts=--all --redact`, on the checkout | **no leaks found**; 271 commits (all refs: 315, of which 44 merges, which gitleaks skips) |
| `gitleaks git --log-opts=HEAD --redact` (CI's form) | no leaks found |

The repository has no gitleaks configuration (`.gitleaks.toml`), so the default rules ran, as in
CI.

**`NOTICE.md`'s "All other dependencies"** holds for both lists. Outside its list of permissive
licences, the commands print only what `NOTICE.md` names elsewhere:

| List | Licence outside the paragraph's list | Packages | In `NOTICE.md` |
|---|---|---|---|
| npm | EUPL-1.2 | `@kern-ux/native` 2.8.2, `@kern-ux-annex/kern-react-kit` 2.40.0 | "Shipped with the running product" |
| npm | MPL-2.0 | `lightningcss` 1.32.0 and 1.33.0, `lightningcss-linux-x64-gnu` and `-musl` at both versions (6) | "Used to build and develop it" |
| npm | CC-BY-4.0 | `caniuse-lite` 1.0.30001810 | "Used to build and develop it" |
| Python | LGPL-3.0-only | `psycopg`, `psycopg-binary` 3.3.5 | "Shipped with the running product" |
| Python | MPL-2.0 | `pathspec` 1.1.1 | "Used to build and develop it" |

Labels that differ from the paragraph's identifiers but name a licence on its list: `png-js`
2.0.0 `MIT*` (license-checker's guess from the file; the package's `LICENSE` is MIT);
`nodeenv` 1.10.0 and `segno` 1.6.6 `BSD License` (their licence files are three-clause BSD texts);
`distlib` 0.4.3 `Python Software Foundation License` (its metadata: `PSF-2.0`); `uvloop` 0.22.1
`Apache Software License; MIT License`; `packaging` `Apache-2.0 OR BSD-2-Clause`; `greenlet`
`MIT AND PSF-2.0`. Tally of the npm list: MIT 313, Apache-2.0 23, ISC 13, MPL-2.0 6,
BSD-2-Clause 6, BSD-3-Clause 2, EUPL-1.2 2, Python-2.0 1, MIT* 1, CC-BY-4.0 1, BlueOak-1.0.0 1.

Notes:

- `npm install` in a copy runs the root's `prepare` script, which fails to install the pre-commit
  hook outside a git repository and exits 0 as written; in `node:26-alpine` uv is missing at that
  point, and the script exits 0 as well. Both installs report 7 moderate `npm audit` findings
  (not this task's subject).
- `node:26-alpine` has no uv. The second command ran there with uv 0.12.9 taken from Astral's
  image, which is CI's version, not something `NOTICE.md` asks for (UNCERTAIN: the smallest way
  to run "the two commands" in that image).

### T037: the searches and the links

On the same tree, 2026-11-24.

| Check | Result |
|---|---|
| T005's old-name search, and T037's case-insensitive form of it with the earlier product name, over the tree without `node_modules`, `.venv`, `dist` and the lockfiles | outside `specs/012-open-source-release/` only the untracked `.git` pointer file, which is not part of the repository; inside it 93 lines in 4 files (`research.md` 40, `spec.md` 19, `tasks.md` 17, `verification.md` 17), which T041 cleans |
| R5's check 1, the DPS domains | 3 lines: the contact address in `README.md:6`, `SECURITY.md:8`, `CONTRIBUTING.md:5` (allowlist) |
| R5's check 2, machine and scratch paths | nothing |
| R5's check 3, `dps` as a word | nothing (`backend/.env.example:20` is gone since T028) |
| R5's check 4, hosted ids and the trust list | nothing |
| R5's check 5, the sibling project | 3 lines: `specs/001-servicebw-eudi-middleware/spec.md:3`, `plan.md:3,8`, the repository's own old branch name (allowlist) |
| The Figma keys (allowlist, no check prints them) | still in `specs/`, `.specify/bugs/` and `docs/FIGMA-WORKFLOW.md:72` only |
| `coolify`, any case, in `README.md` and `docs/` | nothing |
| The Spec Kit installation command (`specify init`, `spec-kit.git`, `specify-cli`, `uv tool install`) in `README.md` and `docs/` | nothing; `README.md:884-887` says, with a link to Spec Kit, that `specs/` records how the project was built (R10) |
| Internal links of `README.md`, `NOTICE.md`, `SECURITY.md`, `CONTRIBUTING.md`, `docs/*.md`, `specs/README.md` | **122, all resolve** (`docs/ARCHITECTURE.md` 54, `README.md` 40, `NOTICE.md` 24, `CONTRIBUTING.md` 3, `SECURITY.md` 1; the other files have none); 58 carry an `#anchor`, each checked against GitHub's heading slugs (duplicates numbered) |
| External links of the same files | 30 distinct addresses (Markdown links, `<…>` autolinks and the bare URLs GitHub links; the four `localhost` addresses of the README's Quick Start left out); 27 answer `200` to `curl -sSIL`, one more on GET; **two answer `403`** (below) |

R5's allowlist neither gained nor lost a line: every printed line is covered, and the only
change is that the `.env.example` line of check 3 no longer prints, which no allowlist line
covered. `research.md` is unchanged.

External links that do not answer `200` to `HEAD`:

| Address | In | HEAD | GET |
|---|---|---|---|
| `https://www.figma.com/@kern_ux` | `NOTICE.md:119` | `404` | `200` |
| `https://www.npmjs.com/package/@kern-ux/native` | `docs/KERN-DESIGN-SYSTEM.md:564` | `403` | `403` |
| `https://www.npmjs.com/package/@kern-ux-annex/kern-react-kit` | `docs/KERN-DESIGN-SYSTEM.md:565` | `403` | `403` |

Both npm pages exist in the registry (the registry addresses on the same lines answer `200`);
npmjs.com refuses scripted requests (UNCERTAIN: the refusal is the site's bot protection, not a
missing page; not checked in a browser).

The section names the old-name search by task only; the pattern is in tasks.md (T005, T037).

### T038: the fresh clone

On `HEAD` `f3091e0`, branch `opensource`, 2026-11-24, after T035 to T037. The copy: the 1,188
files of `git ls-files -co --exclude-standard`, each equal to its blob at `HEAD` (`git hash-object`
against `git rev-parse HEAD:<path>`), in a new, empty directory named `konnekt` outside the
repository, as a clone of the repository gets; Compose took the project name `konnekt` from it. No
container, volume or image named `konnekt…` existed before. Docker 29.9.2, Compose v5.6.1. The
checkout's own PostgreSQL held port 5435 and was stopped for the run, then started again.

**README's "Quick Start", Option 1, word for word** (nothing else was run in the copy):

| Step | Command | Time (UTC) | Since the first command | Result |
|---|---|---|---|---|
| 1 | `cp backend/.env.example backend/.env` | 21:15:39 | 0:00 | done |
| 2 | `docker compose up` | 21:15:42 | 0:03 | three images built, four containers started; the backend ran all 14 migrations to `ef2b83b1b34c` and logged "Application startup complete"; no service logged a warning or an error |
| (a) | `http://localhost:5173` serves the app | 21:18:28 | **2:49** | `200`; in Chromium it renders the sign-in page ("Log in · Konnekt", username, password, "Forgot password?"); the console's only errors are the two expected `401` of `/api/auth/me` before sign-in |
| | `http://localhost:3000/api/health` | 21:18:41 | 3:02 | `200` |
| 3 | `docker compose exec backend uv run python -m app.cli create-user <username>`, in a pseudo-terminal, a fictitious username, the password typed twice at the prompts | 21:18:57 to 21:19:02 | 3:23 | "Created user '…'."; exit 0 |
| (b) | `POST /api/auth/login` with that account | 21:19:03 | **3:23** | `200`, the session cookie set; `GET /api/auth/me` with it: `200` |

**SC-007 met**: the sign-in page after 2 min 49 s, the first account signed in after 3 min 23 s,
under 30 minutes. The time is shorter than on a new machine: the base images (`node:26-alpine`,
`postgres:18-alpine`, `python:3.13-slim`, uv's) were already pulled, and Docker's build cache
already held the development backend image's layers, `uv sync --frozen` among them (earlier
builds of the same Dockerfile and lockfile), so no Python package was downloaded. The two npm
installs ran in full (frontend 92 s, MCP server 7 s). Not measured on an empty machine.

The other addresses the Quick Start lists: `http://localhost:3000/docs` `200`;
`http://localhost:3100/mcp` `401` without a token, as expected. All four ports are published on
`127.0.0.1` only. Then `docker compose down -v` in the copy.

**The production build**: `docker compose -f docker-compose.prod.yml build`, with a `.env` beside
the compose file (Deployment, "1. Settings") holding only the two variables marked "always":
`SERVICE_PASSWORD_POSTGRES` (64 hex characters, `openssl rand -hex 32`, made up for the run) and
`CONNECTION_BASE_URL=https://konnekt.example.org`.

| Check | Result |
|---|---|
| `config -q` without a `.env` | stops: "required variable SERVICE_PASSWORD_POSTGRES is missing a value: SERVICE_PASSWORD_POSTGRES must be set to the database password", the message README quotes; also for a plain `build` |
| `build` with the two variables | passes in 38 s (the frontend's `npm ci` layer from the build cache); images: backend 355 MB, MCP server 281 MB, frontend 110 MB; four Compose warnings (finding 5) |
| The backend image's environment | `APP_ENV=production`, `UV_NO_SYNC=1` |
| `LICENSE` and `NOTICE.md` at `/usr/share/doc/konnekt/`, in each of the three images | present in all three; `LICENSE` SHA-256 `6fc9e709…1e665`, rule 1's; `NOTICE.md` byte-identical to the repository's (SHA-256 `846519ee…2df2f`) |

**The MCP image's packages**: **seven**, as `NOTICE.md` says and phase 3 recorded; research R4's
six runtime packages and `fast-deep-equal`.

| Package | Version | Licence |
|---|---|---|
| `@modelcontextprotocol/server` | 2.4.0 | Apache-2.0 |
| `@modelcontextprotocol/node` | 2.1.2 | Apache-2.0 |
| `@modelcontextprotocol/core` | 2.4.0 | Apache-2.0 |
| `zod` | 4.6.7 | MIT |
| `hono` | 4.13.16 | MIT |
| `@hono/node-server` | 2.1.6 | MIT |
| `fast-deep-equal` | 3.1.3 | MIT |

How counted: in the built image's final stage (`docker run --entrypoint sh` on it), every directory
with a `package.json` directly under `/app/node_modules/` and `/app/node_modules/@*/`: ten, of which
three are the workspace's own symlinks (`@konnekt/api-types`, `@konnekt/rules`, `@konnekt/mcp`),
left out; no nested `node_modules`. npm's log of the stage says the same: "added 10 packages".
`npm ls --omit=dev --all` in the image lists the six under `@konnekt/mcp` and marks
`fast-deep-equal` "extraneous": nothing in the runtime tree requires it (phase 3: npm lets it
through from the frontend's tree). `licence` fields as read from each package's `package.json`.

**Findings for T016** (where the README was not enough; reported only, nothing changed):

1. **`README.md:135-139`, "Prerequisites"**: it asks for Node.js 20+, npm 9+, Python 3.13+ and uv
   per component, without saying that Option 1 needs only Docker with Compose v2
   (`docker compose`). Nor does it name the disk space: the three development images take 1.9 GB
   (frontend 826 MB, MCP server 545 MB, backend 511 MB) plus the build cache. On this machine the
   free space fell under 650 MB during the build and the unused build cache had to be pruned
   (`docker builder prune -f`) for the run to go on.
2. **`README.md:165-166`**: "In another terminal" does not say when. The account can be created
   once the backend has migrated and started ("Application startup complete" in the log, or
   `http://localhost:3000/api/health` answering `200`), which on a first start is minutes after
   `docker compose up`. The run waited for the health address, which the README does not mention.
   What the command does earlier was not tried.
3. **`README.md:186-188`** names the four ports but not that they must be free before
   `docker compose up`: a local PostgreSQL on 5435, or anything on 3000, 5173 or 3100, stops it.
   The run had to stop the checkout's own database first.
4. **Warnings during the first `docker compose up`** that the README does not mention:
   `npm warn deprecated eslint@9.39.5` (frontend and MCP server images), "7 moderate severity
   vulnerabilities" after the frontend image's `npm install` (T036 saw the same seven), and
   PostgreSQL's first start, inside its container: "no usable system locales were found" and
   "enabling \"trust\" authentication for local connections" (the image's defaults). None stops
   anything.
5. **`README.md:908-923`, Deployment, "1. Settings"**: with the two "always" variables alone,
   every `build` (and `up`) prints four Compose warnings: "The \"EUDIPLO_URL\" variable is not
   set. Defaulting to a blank string.", and the same for `EUDIPLO_CLIENT_ID`,
   `EUDIPLO_CLIENT_SECRET` and `EUDIPLO_TRUST_LIST_ID`. README says empty values make EUDIPLO's
   calls answer `503`, not that unset ones warn, nor that writing them empty (`EUDIPLO_URL=`)
   silences the warnings. The production MCP image's build also prints npm's "New major version
   of npm available" notice and "npm warn using --force Recommended protections disabled." (from
   `npm cache clean --force`), and the builder's `eslint@9.39.5` deprecation.

Notes:

- README has no plain `build` command; Deployment's step 4 builds and starts together
  (`up -d --build`). The task's `build` ran with what step 1 calls "always" needed.
- The production stack was built, not started (no proxy, no EUDIPLO); T028's run checks of the
  images stand.
- Removed afterwards: the `konnekt` project's containers, its volume and network, the three
  development and the three production images, and the copy's two `.env` files; the copy never
  had a `node_modules` or `.venv` (everything ran in the images). Only unused build cache was
  pruned, once. The checkout's PostgreSQL runs again, recreated by `docker compose up -d
  postgres` with the `127.0.0.1` binding (phase 6's handed-on note), its volume and
  `konnekt_db_test` kept.
- UNCERTAIN: the time on a machine without pulled base images and without build cache; an
  estimate is not given.

**After T038, by the coordinator** (`README.md` is T016's file; phase 4 is done and nothing else
edits it now): findings 1, 2, 3 and 5 are fixed in `README.md`. "Prerequisites" says that
Option 1 needs only Docker with Compose v2 and about 3 GB of free disk. Option 1's `create-user`
comment says to wait for "Application startup complete". The ports paragraph says that the four
ports must be free. The EUDIPLO row of Deployment's settings table says that leaving the four out
of `.env` makes Compose warn, and that empty values start without EUDIPLO. No heading changed, so
T037's anchors stand. Finding 4 stays as it is: upstream warnings that stop nothing.

### T041: this feature's files without the old names

On `HEAD` `f3091e0`, branch `opensource`, 2026-11-24, after T035 to T038; T040 has not run, so
`history-rewrite.md` does not exist yet. Every file under `specs/012-open-source-release/` was
read in full. The old names and the checkout's paths were replaced by neutral words, by hand and
sentence by sentence, each changed sentence read again; paragraphs kept their wrap width and the
tables their columns. Nothing outside this directory changed, no checkbox changed, and `LICENSE`'s
hash, the commit hashes, counts, dates and the IDs of tasks and requirements stand as they were.

Before, the old-name search (T037's case-insensitive form of T005's command) matched 93 lines
here, and the search for machine and scratch paths 14 lines, 3 of them (all in `research.md`)
without an old name.

| File | Lines before: old names; paths | Passages changed | Where |
|---|---|---|---|
| `spec.md` | 19; 2 | 13 | Context (the existing repository; the mentor's step 2; the survey's three names); Clarifications of 2026-11-20 and 2026-11-24 (the old storage prefix, the plugin's variable, the product's earlier name); US3's text and scenario 1; Edge Cases (an existing installation, old links); FR-011, FR-012, FR-013; Assumptions (the git variables) |
| `tasks.md` | 17; 6 | 12 | Path Conventions (the root, the old test database); rule 6; phase 2's amendment; T004, T005, T037, T041 (the searches as descriptions); T040 (the rehearsal's clone, the runbook's clone command); Notes (the git variables) |
| `research.md` | 40; 6 (43 lines in all) | 29 | R5: the shipped defaults, the infrastructure table's rows of paths and of the sibling project, scrub patterns L1 to L3, S1 and S2 with a note, S1's row, checks 2 and 5 with a note, "Only in the history"; R7: the counts, four rows of the inventory, the plugin's variable, the earlier name, the tools' prefix, the script's steps 2 to 5 and 8, the amendment, the existing installation, the alternatives; R10's README row; R11's findings, decision and handover item 5; open point 1 |
| `verification.md` | 17; 0 | 15 | T003 (the test database, twice); T004 and T005 (the rules of steps 2 to 5, the storage keys, the search, its table and its conclusion); T004 amended (three rows, the last check) |
| `plan.md`, `pr.md`, `handover.md`, `checklists/requirements.md` | 0; 0 | 0 | read; no old name and no machine path |

**The words chosen**:

- The earlier working name as a package, plugin or root name → "the earlier working name"; as two
  words → "the product's earlier name"; in imports → "the old package scope"; in the storage
  keys → "the old storage prefix"; the plugin's environment variable → "the plugin's variable"
  (with "under its old name" where the old one is meant).
- The template's frontend package → "the template's frontend package name"; the databases → "the
  old database name" and its `_test` form.
- The existing repository's name and address → "the existing repository", "the existing
  repository's GitHub address". A command that needs the address takes
  `<existing-repository-url>`: T040's text now says so for the runbook's clone; the mentor and
  the user know the address.
- Recorded searches → "T005's old-name search" or "the search for the old names (the earlier
  working name, the template's package name, the old database name, the existing repository's
  name)".

**The paths**:

- `GIT_DIR` and `GIT_WORK_TREE` (`tasks.md` rule 6 and Notes, `spec.md`'s Assumptions): "this
  checkout's directory under `worktrees/` in the bare repository that holds it (the checkout's
  parent directory)" and "the checkout's root".
- The repository root (`tasks.md`, Path Conventions): "this checkout's top directory".
- T040's rehearsal: `git clone --no-local <bare-repository>`, where `<bare-repository>` is the
  bare repository that holds this checkout.
- Research R5: the infrastructure table's row of paths ("paths of this machine's checkouts; a path
  in a team member's home directory on another machine; agent sessions' scratch directories");
  scrub patterns L1 to L3 as "(in words)" lines in the pattern block, with a note that they ran
  as patterns in T021 and the words record what they matched; S1's parent folder as
  `<the sibling project's parent folder>`; S2 as "the existing repository's GitHub address";
  check 2 as a comment in words; "Only in the history" as "this machine's home-directory paths".

**The gates**:

| Gate | Result |
|---|---|
| The old-name search (T037's case-insensitive form of T005's command), from the root, without `node_modules`, `.venv`, `dist`, the lockfiles and the untracked `.git` pointer file | **prints nothing** (exit 1); with the pointer file, only its one line, which is not part of the repository |
| The search for home-directory and agent-scratch paths over this feature's directory | prints nothing |
| `uvx --from reuse==6.3.0 reuse lint`, with the two git variables | compliant with REUSE 3.3; 1,176 of 1,176 files with copyright and licence information |

UNCERTAIN:

- R5's check 2 is now a comment in words, not a command: a runnable form would have to spell the
  paths' first directories, a team member's home directory among them, which this directory may
  no longer hold. T037 ran it as it stood; the history before T041 keeps that form.
- R5's check 5 now searches for the sibling project's name alone. It prints the same lines as
  before, since the project's path ends in that name.
- T040's text gained one parenthesis: the runbook's clone command takes
  `<existing-repository-url>`, so that T040 can write the runbook without an old name.
- FR-013's list says "the existing repository's name in full or its first part alone" for the
  two forms the search names.

The section names the old-name search by task only, as T037's does.

## The record (T039, 2026-11-24)

On `HEAD` `f3091e0`, branch `opensource`, with phase 8's changes uncommitted (this file,
`tasks.md`, `spec.md`, `research.md`, `README.md`). Nothing was run for this section beyond
reading the README's first lines (SC-008) and repeating R5's checks and the old-name search on the
tree as it stands, after the coordinator's README fix that followed T038: R5's check 1 prints the
three allowlisted contact lines, checks 3 and 4 nothing, check 5 the three allowlisted lines of
spec 001, the search for home-directory and agent-scratch paths outside this feature's directory
nothing, and the old-name search (T037's form) over the whole tree, the untracked `.git` pointer
file left out, nothing. Every other status below rests on the sections it cites.

### Success criteria and Independent Tests

| Item | What it asks | Status | Evidence |
|---|---|---|---|
| SC-001 | every file has a licence and a copyright holder | met | T036 (phase 8): `reuse lint` 6.3.0 compliant with REUSE 3.3, 1,176 of 1,176 files, licences Apache-2.0, EUPL-1.2, MIT, OFL-1.1, Unicode-3.0, none missing or unused; again in T041 (1,176 of 1,176) |
| SC-002 | no third-party item of unknown source or without licence; the star artwork in no published commit | needs a person | The inventory part ran: T011 (phase 3, the data sets are the team's own), T014 (phase 3, the four star files deleted by `320728d`, nothing imports them, the eight `.webp` pictures drawn by the designer), T009 (`NOTICE.md`; KERN's Figma kit named with "terms not stated here", open point 5). The artwork is still in every commit since `48fb277`: T040 has not run, and the user's history rewrite comes after the merge |
| SC-003 | the count of consent statements equals the count of contributors | needs a person | The list is research R8: four (Samuele Musiani, Vrinda Pasrija, Amber Rafique, and DPS through the mentor). `pr.md` (T033, phase 7) says who posts what and how. No statement is recorded here; the count is the user's before the merge, with `LICENSE` still `6fc9e709…1e665` (T035) |
| SC-004 | the old-name search prints nothing; the scrub searches only allowlisted lines; the allowlist under 20 lines | met | T041 (phase 8): the old-name search over the whole tree, the untracked `.git` pointer left out, **prints nothing**; T037 (phase 8): R5's five checks print only allowlisted lines (3 contact lines, 3 lines of spec 001), the allowlist unchanged at 4 lines (research R5); repeated in this section on the current tree with the same result |
| SC-005 | the secret scan over the full history finds nothing; no credential that ever appeared still works | met | T036 (phase 8): gitleaks 8.30.1 (checksum equal to CI's) `git --log-opts=--all --redact`: no leaks, 271 commits; `dir --redact` over the tree and CI's `--log-opts=HEAD`: no leaks; research R5 found no credential, so nothing to rotate. Rest, a person: the scan once more over the new repository's history before it is public (`handover.md`, step 10) |
| SC-006 | no blocking finding of the security review open at publication | met | Phase 6: research R6's blocking findings 3 to 6 fixed with tests (T024 to T027: +21 and +28 pytest, +17 frontend), and 10, 13, 14 (start), 20 (`server_tokens`) by T028; the open ones in `SECURITY.md` (T032, phase 7); finding 1 handled outside by the team (R6). Rest, a person: phase 6's "Needs a person" checks on a running stack |
| SC-007 | from a fresh clone to the sign-in page in under 30 minutes with the README alone | met | T038 (phase 8): Quick Start word for word in a copy of the 1,188 files a clone holds; the sign-in page after 2 min 49 s, the first account signed in after 3 min 23 s. Rest: base images were already pulled and the build cache held the backend's Python layers, so the time on an empty machine was not measured; README findings 1, 2, 3 and 5 were fixed after the run, which was not repeated |
| SC-008 | status, licence and contact on the README's first screen | met | Read in this task: `README.md` lines 1 to 12 hold the status banner ("not actively maintained", pull requests and issues closed) with `hello@dpschool.io`, the copyright line and "Licensed under the EUPL-1.2" with links to `LICENSE`, `NOTICE.md`, `SECURITY.md`, `CONTRIBUTING.md`. Not looked at as rendered on GitHub |
| SC-009 | the same tests pass; the product behaves as before | met | T035 (phase 8): 7,941 tests passed (rules 2,678, frontend 2,058, mcp 513, pytest 2,692) against T003's 7,875 (phase 1); the 66 more are phase 6's; no test file deleted, no test skipped, five declarations renamed or split, none dropped. Rest, a person: behaviour by hand (phase 6's manual checks; US3's scenario 2) |
| SC-010 | the mentor needs no further question for the handover list | needs a person | `handover.md` (T034, phase 7): ten steps, each with "When" and "Done when". Only the mentor's reading can show it |
| US1 | any file's owner and licence from `LICENSE`, `NOTICE.md`, `REUSE.toml`; the check; the consent count | needs a person | The check ran: T036 `reuse lint`, 1,176 of 1,176 files; the files: T009, T010 (phase 3), `NOTICE.md` byte-identical in all three images (T038). The consent count is SC-003's, not done |
| US2 | the secret scan over all history; the scrub search; the blocking findings closed | met | T036 (gitleaks, no leaks over `--all`), T037 and this section (R5's checks, only allowlisted lines), phase 6 (findings 3 to 6 fixed). Rest, a person: T040 and the history rewrite (FR-044, tagged US2), phase 6's manual checks, the last scan of `handover.md` step 10 |
| US3 | the old-name search prints only the allowlist; "Before you finish" passes | met | T041: the search prints nothing; T035: the Node and backend gates and `export_check_fixtures --check` pass; T036: REUSE check passes. Rest, a person: scenario 2 (a browser holding an old local draft opens Konnekt as on a first visit) and scenario 3 (the Account page's "Installing the plugin" link, once the new repository holds `main`) |
| US4 | a fresh clone to the sign-in page and an account with the README alone | met | T038 (phase 8), as SC-007; the production build with the two "always" variables, `APP_ENV=production` in the image, the MCP image's seven packages as `NOTICE.md` says. Rest: run on a machine with more than the README's prerequisites and with a warm cache, not on one with Docker alone |
| US5 | the mentor acts on every line of `handover.md` without asking | needs a person | `handover.md` (T034, phase 7) exists in FR-043's order; the test is the mentor's |

### The open points still open

From research's "Open points":

- **1**, the part still open: whether the consent statements must be visible in the public
  repository (the mentor; `handover.md` step 2; before the first statement). The rest was
  closed by the mentor's decision of 2026-11-24 (the rewritten history goes to a new repository).
- **4**: the consent statements of Samuele Musiani, Vrinda Pasrija and Amber Rafique, and DPS's
  through the mentor (research R8), by 2026-11-27; none is recorded.
- **6**: the hosted instance, shut down or kept with its own tenant and settings (the mentor;
  `handover.md` step 9).

Closed: **2** by the mentor's decision of 2026-11-24 (the name `DigitalProductschool/konnekt` is
final); **3** by T011 (the country names, persona pools and streets are the team's own
compilations, nothing replaced); **5** by T009 through its fallback (`NOTICE.md` names KERN's
Figma kit with its source and "terms not stated here"; the Community page states no terms, so
they remain unknown).

What phase 8 left open:

- The two npmjs.com package pages (`@kern-ux/native`, `@kern-ux-annex/kern-react-kit`, linked
  from `docs/KERN-DESIGN-SYSTEM.md`) answer `403` to scripted requests (T037); the packages exist
  in the registry, but the pages were not opened in a browser.
- T038's finding 4: the upstream warnings of the first `docker compose up` (the `eslint`
  deprecation, the seven moderate `npm audit` findings, PostgreSQL's first-start notices) stay as
  they are and are not mentioned in the README.
- SC-007's time was measured with the base images pulled and the build cache warm (T038); the
  time on an empty machine is unknown, and the run was not repeated after the README fix.
- Phase 6's manual checks (its "Needs a person"): the sign-in throttle on a running stack in both
  languages, and the consent page with a real agent.
- T040 (phase 9, `history-rewrite.md` and its rehearsal) has not run; its plan was amended on
  2026-11-24 in `tasks.md`, `spec.md` (FR-044) and research R11.
- `tmp-german`, the one unmerged branch, is outside this spec (spec, Clarifications: "Not asked
  of this spec"); `handover.md` step 3 names it as not part of its list, as T034 asks. Not an
  open point of this spec.
- Phase 3's note: the CI's new `licensing` job has not run on GitHub yet.

### What a person must still do, in order

1. **The user**: commit phase 8 (`verification.md`, `tasks.md`, `spec.md`, `research.md`,
   `README.md`), on their machine (tasks.md, "Commits", item 4). The same files hold another
   session's amendments of phase 9's plan (T040's "How", spec's clarification and FR-044, R11).
2. **The mentor**: create `DigitalProductschool/konnekt`, empty and private, with push access
   for the user (`handover.md` step 1).
3. **The mentor**: answer whether the consent statements must be public (`handover.md` step 2),
   before the first statement.
4. **The user**: open the pull request with `pr.md`'s text, if it is not open yet: in the
   existing repository, or in the new one if the mentor's answer is yes.
5. **The contributors** (Samuele Musiani, Vrinda Pasrija, Amber Rafique) and **the mentor** for
   DPS: post the consent statement on `LICENSE` in the pull request, by 2026-11-27. **The user**
   counts them against research R8 (four) and checks that `LICENSE` is still `6fc9e709…1e665`
   (SC-003).
6. **The user** (or a team member), on a running stack: phase 6's manual checks, the sign-in
   throttle in both languages and the consent page with a real agent.
7. **The user**: in a browser that holds a local draft or a language choice from before the
   rename, Konnekt opens as on a first visit, without an error (US3, scenario 2).
8. **The user**: merge the pull request once every statement is in, by 2026-11-27.
9. **The mentor**: delete the merged branches, `opensource` with them (`handover.md` step 3),
   and detach infrastructure, connectors and the review bot (step 4).
10. **The user**: run T040 in a session (the runbook `history-rewrite.md` and its rehearsal),
    after the merge.
11. **The user**: the history rewrite by `history-rewrite.md`, and the push of `main` alone into
    the new, still private repository (tasks.md, "Commits", item 6). Then **the contributors**
    delete their old clones and clone anew, and **the user** follows the Account page's
    "Installing the plugin" link to the new repository's README (US3, scenario 3).
12. **The mentor**: `handover.md` steps 5 to 10, in their order: archive the existing
    repository, protect `main` in the new one, close issues and pull requests, tag the published
    commit, decide on the hosted instance, run the last secrets scan and make the new repository
    public. Whether the mentor needed to ask anything is SC-010's and US5's answer.

Steps 10 and 11 are the last ones of the team, after the merge and before anything is public;
only the mentor's steps that need the rewritten `main` in the new repository follow them, and
making it public is the very last.
