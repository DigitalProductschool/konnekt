# Tasks: Publish the repository as open source under the EUPL-1.2

**Input**: Design documents from `specs/012-open-source-release/`: [spec.md](spec.md) (FR-001 to
FR-044, and its three Clarifications sessions: the latest one wins where they differ),
[plan.md](plan.md) (its "Phases and file ownership") and [research.md](research.md) (R1–R11: the
audit records, every decision, the rename's and the scrub's rules, the drafts of `NOTICE.md` and
`REUSE.toml`, and "Open points"). There is no data model, no contract and no quickstart.

**Prerequisites**: none in the code. These tasks run in a session that knows nothing of the
planning session: everything a task needs is in the three documents and in the repository.

**Deadline**: everything is merged by **27.11.2026**, the last day the contributors' consent
statements cover (FR-010).

**Tests**: only the security fixes of phase 6 change behaviour, and each comes with its tests in
the same task. Everywhere else the existing gates are the test: the same tests pass as in the
baseline of T003.

**Organization**: nine phases. Phases 3 to 6 are the plan's packages C1 to C4 and run side by
side, each on its own files; all other phases run alone. Phase 9 prepares the history rewrite,
which only the user runs.

## Format: `[ID] [P?] [Story] [Level] Description`

- **[P]**: can run in parallel with the other `[P]` tasks of its phase: different files, no
  dependency on an unfinished task. Phases 3 to 6 are parallel to each other as a whole.
- **[Story]**: US1 (the terms are clear), US2 (nothing private becomes public), US3 (one name),
  US4 (status, and running it without DPS), US5 (the mentor's checklist). Setup and verification
  tasks carry none.
- **[Level]**: who takes the task in `/speckit-implement`: **[medium]** `speckit-task-medium`
  (mechanical or fully specified), **[high]** `speckit-task-high` (needs design or judgement
  within the task), **[xhigh]** `speckit-task-xhigh` (a mistake is costly and tests alongside are
  unlikely to catch it: authentication, the consent page). The agents run on the model their
  definition sets. A subagent that a task starts on its own for searching or reading runs on
  Opus unless the work needs more.

## Path Conventions

- All paths are relative to the repository root, `/home/debian/batch27-faro/opensource`.
- "The Node gates": `npm run lint && npm test && npm run build`, from the root.
- "The backend gates", from `backend/`: `uv run ruff check . && uv run ruff format --check .`,
  `uv run mypy app/ scripts/ tests/`, and `uv run pytest` with `DATABASE_URL` naming the test
  database on `localhost:5435` (`template_db_test` before T004, `konnekt_db_test` after it;
  PostgreSQL from `docker compose up -d postgres`; create the database if it is missing). If no
  PostgreSQL can be started, say so in the report; never skip silently.
- "Scratch": a directory the task makes outside the repository for scripts, downloads and build
  output. Nothing in a committed file names it.
- `verification.md` in the feature directory is the run's record: T003 starts it, phase 8
  finishes it. `research.md` is edited only by the tasks that say so.

## Rules every task follows

1. **`LICENSE` never changes** (FR-002). No task opens it for writing. Its SHA-256 is
   `6fc9e709ccbfe0d77fbffa2427a983282be2eb88e47b1cdb49f21a83b4d1e665`.
2. **No stored or sent identifier changes** (FR-012): cookie names, tables, columns, API paths,
   environment variables' names (`SERVICE_PASSWORD_POSTGRES` …), the MCP tools' names. The one
   exception (user, 2026-11-24): the browser's two storage keys and the plugin's variable were
   renamed with everything else (T004, amended); no old name is written back anywhere.
3. **Generated files and migrations**: `rules/src/checks/caseFolding.ts`,
   `rules/src/checks/fixtures/evaluator-vectors.json`, `rules/src/fixtures/server-messages.json`,
   `rules/src/fixtures/example-connection.json`, `package-lock.json` and `backend/uv.lock` change
   only through their tools (`uv run python -m scripts.export_check_fixtures`, `npm install`,
   `uv lock`). No file under `backend/alembic/versions/` is edited; a new migration is a new
   file.
4. **File ownership**: a task edits only the files it names. In phases 3 to 6 other agents work
   in the same checkout at the same time.
5. **Nothing private is written**: no secret value, no full connection or session ID, no email
   address other than `hello@dpschool.io`, no path of the machine the task runs on.
6. **No task commits or switches branches.** Git reads work only with
   `GIT_DIR=/home/debian/batch27-faro/worktrees/opensource` and
   `GIT_WORK_TREE=/home/debian/batch27-faro/opensource` set; with any other `GIT_DIR`, `git
   status` shows every file as deleted and must be ignored.
7. **`CLAUDE.md` and the constitution apply** to every code change: sync database access,
   `ApiResponse`, `Text(en, de)` messages, `defineTexts`, Tailwind classes only, no new
   dependency (plan, Constitution Check).
8. **When the documents leave a choice open**, take the smallest reasonable one and mark it
   `UNCERTAIN` in the report. When a finding of research turns out wrong, stop and report; do not
   work around it.
9. **Every task's report** names the files changed, the gates run with their results, and what
   was not checked.

---

## Phase 1: Setup

**Purpose**: the licence texts are in place and the starting state is recorded.

- [X] T001 [US1] `LICENSE` in the root: the European Commission's English EUPL-1.2 text,
  byte-identical to the download (research R1; SHA-256 `6fc9e709…1e665`, 13,827 bytes).
- [X] T002 [US1] `LICENSE.de` in the root: the Commission's German text with its whitespace
  normalised, words unchanged (research R1; SHA-256 `849b8890…5d67f`, 15,096 bytes).
- [X] T003 [medium] Record the baseline in `specs/012-open-source-release/verification.md` (new):
  the commit of `HEAD`; `sha256sum LICENSE LICENSE.de` against rule 1 and T002; the Node gates and
  the backend gates run on the untouched tree, with the number of tests passed per package
  (`rules`, `frontend`, `mcp`) and for pytest; whether Docker and a PostgreSQL on port 5435 are
  available on this machine (phases 6 and 8 need them); the versions of Node, npm and uv. Items:
  SC-009; files: `verification.md`; gates: the ones it records.

### Delegation

- T003 [medium], alone.
- **Needs a person**: the user commits `LICENSE` and `LICENSE.de`, and nothing else, as the
  first commit of the pull request and opens it, so that the consent statements can be posted from now on (FR-002, FR-009; the
  statement's text is in T033's `pr.md`, and until then in spec.md, Context, step 9, with the
  repository `DigitalProductschool/konnekt`, "Batch#27" and the date 27.11.2026).

---

## Phase 2: User Story 3 — The product has one name (Priority: P2)

**Goal**: Konnekt everywhere a reader takes a name for the product's; nothing stored or sent
changes. Runs before everything else because every later file carries the name (plan, phase B).

**Independent Test**: the search of T005 prints only the allowlist; the same tests pass as in
T003.

**Amended on 2026-11-24 (user), after T004 and T005 had run**: no old name stays anywhere, the
storage keys included (spec, Clarifications "no old name left"). T004's second pass renamed
`connection-portal:` → `konnekt:`, `CONNECTION_PORTAL_MCP_URL` → `KONNEKT_MCP_URL` and
"Connection Portal" → "Konnekt" (the lines that set it against Konnekt by hand), and the plugin's
author → Team Faro. The search's allowlist is now only this feature's directory, which T041
cleans last. Where T004's and T005's text below says otherwise, this paragraph wins.

- [X] T004 [US3] [high] Rename by script, as research R7 "The rename script" gives it, steps 1 to
  6, with nothing else in flight. The script lives in scratch and is not committed. Step 1's
  exclusions exactly (`backend/alembic/versions/`, the four generated files, this feature's
  directory, both lockfiles, `LICENSE`, `LICENSE.de`, binary files). Steps 2 to 5 are the ordered
  replacements; check after step 3 that exactly the storage-key lines R7 counts still read
  `connection-portal:`. Step 6 by hand, plus: `docs/ARCHITECTURE.md:85`
  (`dps-react-python-template/` → `konnekt/`); `.claude-plugin/marketplace.json`'s owner →
  `Team Faro` (spec, Clarifications); the plugin's, the marketplace's and the MCP server's name
  → `konnekt` in the places R7's table lists, with `mcp/src/guidance.test.ts` following; the
  API's title in `backend/app/main.py`. Not renamed: `CONNECTION_PORTAL_MCP_URL`, "Connection
  Portal" spelled out in `specs/` and `.specify/bugs/`, the paths holding `batch27-faro` (phase
  5 replaces them). Items: FR-011, FR-012, FR-015; files: every file the rules match; gates:
  none yet (T005).
- [X] T005 [US3] [high] Regenerate and prove the rename: `npm install` from the root and `uv lock`
  in `backend/` without `--upgrade` (rule 3), then
  `uv run python -m scripts.export_check_fixtures --check`; create `konnekt_db_test`; the Node
  gates and the backend gates, with the same test counts as T003; `git diff --stat` shows no
  change under `backend/alembic/versions/` and none in the four generated files unless the
  generator made it; `grep -rnIE 'connection-portal|community-template|template_db|batch27'`
  over the tree (without `node_modules`, `.venv`, `dist`, the lockfiles) prints only R7's
  allowlist plus the `batch27-faro` paths phase 5 removes, listed in the report. Append the
  result to `verification.md`. Items: FR-012, FR-013, SC-009; depends on T004; files:
  `package-lock.json`, `backend/uv.lock`, `verification.md`; gates: all.
- [X] T006 [US3] [medium] `specs/README.md` (new): one short page saying what `specs/` and
  `.specify/bugs/` hold (how the project was built, feature by feature and bug by bug), and that on
  the rename's date (2026-11-24) the names in these records (packages, databases, the
  repository, the product's earlier name, the browser's storage keys) were updated to the current
  ones after the fact, so a record may name something by a name it did not have when it was
  written. It names **no** old name (amended 2026-11-24, user). Items: FR-014; depends on T004;
  files: `specs/README.md`; gates: the search of T005 finds nothing in it.

### Delegation

- One agent: T004 [high], then T005 [high]. Then T006 [medium].
- **Needs a person**: commit the rename as one commit. If the mentor names another repository
  than `DigitalProductschool/konnekt`, step 5 of the script is run again with it (research,
  Open points 2).

**Checkpoint**: phases 3 to 6 start only when T005's gates are green.

---

## Phase 3: User Story 1 — The terms are clear (Priority: P1), package C1

**Goal**: every file has a licence and a copyright holder a machine can read; everything from
others is named with its source and terms.

**Independent Test**: `reuse lint` passes; `NOTICE.md` answers "whose, under which terms" for
every item of research R3's inventory.

**Owns**: `backend/LICENSE`, `LICENSES/`, `REUSE.toml`, `NOTICE.md`, the five `package.json`
files, `package-lock.json`, `backend/pyproject.toml`, `backend/uv.lock`,
`.github/workflows/ci.yml`, `frontend/src/index.css`, `docs/KERN-DESIGN-SYSTEM.md`,
`frontend/public/`, `frontend/scripts/`, `frontend/src/assets/`.

- [X] T007 [P] [US1] [high] Licence metadata. `"license": "EUPL-1.2"` in the root's,
  `api-types/`, `rules/`, `frontend/` and `mcp/` `package.json`, `"private": true` kept, then
  `npm install`. `backend/LICENSE` as a byte-identical copy of the root's (`cmp`). In
  `backend/pyproject.toml`'s `[project]`: `license = "EUPL-1.2"` and
  `license-files = ["LICENSE"]`, no licence classifier, then `uv lock`. First check, before
  anything else in the task (research R1, "Not checked"): `uv build --out-dir <scratch>` in
  `backend/` with and without `backend/LICENSE`, to learn whether the build backend fails on a
  pattern without a match; the report states the result and whether `uv sync` in an image needs
  `backend/LICENSE` copied before it (T027 acts on that sentence). In the same task, research
  R4's proposal: move `@tailwindcss/vite` and `tailwindcss` to `devDependencies` of
  `frontend/package.json` only if the frontend still builds and `npm ci -w mcp --omit=dev` in a
  scratch copy then installs just the six runtime packages; otherwise leave them and say so for
  T009. Items: FR-003, FR-004; files: the five `package.json`, `package-lock.json`,
  `backend/LICENSE`, `backend/pyproject.toml`, `backend/uv.lock`; gates: all.
- [X] T008 [P] [US1] [medium] KERN attribution, comments only (research R2, exceptions A to D and
  its Decision): in `frontend/src/index.css` a comment at each of A's three sub-blocks, at each
  of B's six rules and at C's rule, naming the upstream file and lines, `@kern-ux/native` 2.8.2
  and EUPL-1.2; the sentence at `index.css:5-7` and at `docs/KERN-DESIGN-SYSTEM.md:88-91` gains
  that a rule taken from the kit's stylesheet needs the same attribution; in
  `docs/KERN-DESIGN-SYSTEM.md` the section that holds the nine repeated lines names the kit's
  version and licence. No declaration changes: build the frontend into scratch before and after
  and show that the CSS output is byte-identical. Items: FR-019; files: `frontend/src/index.css`,
  `docs/KERN-DESIGN-SYSTEM.md`; gates: Node.
- [X] T009 [US1] [high] `NOTICE.md` in the root, from research R4's draft, as proper Markdown
  with a header row per table and working links, corrected by R2 and R3 where they are more
  precise. It must hold: the three KERN packages (the Tailwind theme under MIT with its
  copyright line); both Fira families with the OFL's exact title and the copyright lines of
  `frontend/src/assets/fonts/OFL.txt`; KERN's own Fira Sans; all 48 icons by group, the five
  changed ones named as changed; the restated KERN declarations; Spec Kit; the Unicode data; the
  template; the test portrait and signature as generated by the team with an AI image tool; the
  four illustrations only if research R3 records for them a source other than the designer's
  own work (T014), and the replaced star artwork not at all; Plus
  Jakarta Sans as only in the history; psycopg and what its binary package bundles; the
  dependencies under MPL-2.0 and CC-BY-4.0; the parts inside bundled packages (lodash, React's
  JSX runtime, the ICC profile, brotli's files); KERN's design file on Figma Community as the
  source of the design's values, with the terms its Community page states (read the page; if it
  cannot be reached, "terms not stated here" and an `UNCERTAIN`); the references and the courtesy
  line; the sentence of FR-022 about others' names; the closing sentence with "declare"; the two
  commands of R4, the second ignoring `konnekt-backend`; and where the served notices file of
  T012 is. The data sources come from T011. Items: FR-017, FR-018, FR-020 to FR-022; depends on
  T007 (the MCP image's sentence), T011, T014 (R3's record of the illustrations); files:
  `NOTICE.md`; gates: none (links: T039).
- [X] T010 [US1] [high] `LICENSES/` and `REUSE.toml` (research R9). `LICENSES/EUPL-1.2.txt` is a
  byte-identical copy of the root's `LICENSE`; `OFL-1.1.txt`, `Apache-2.0.txt`, `MIT.txt` and the
  Unicode licence come from SPDX's licence list by identifier; there is no `LicenseRef-` text,
  since the illustrations are the team's (T014). `REUSE.toml` as R9's draft, then settle R9's "To be
  verified" list with the tool itself, run without being declared anywhere
  (`uvx --from reuse==<current version> reuse lint`, the version pinned in the report and in
  T013), with the two git variables set: the Unicode identifier, the root `LICENSE` and
  `LICENSE.de` and `backend/LICENSE` beside `LICENSES/`, which block wins, how a file without a
  licence grant is expressed. Fix the draft until `reuse lint` passes with every file covered
  and no unused licence text. Record what was settled in research R9 (replace its "To be
  verified" paragraph by the answers). Items: FR-006, SC-001; depends on T007, T009 (the same
  groups); files: `LICENSES/*`, `REUSE.toml`, `research.md` (R9 only); gates: `reuse lint`.
- [X] T011 [P] [US1] [medium] Record the sources research R3 leaves open, by reading the history
  and the specs (`git log -S`, `git blame`) for the commit and the task that added each: the
  English country names (`backend/app/option_sets.py`), the name and town pools
  (`rules/src/personas/samples.ts`), the streets and postcodes
  (`backend/scripts/issue_test_credentials/person.py`). If they were compiled by the team from
  general knowledge, as the German country names were, that is the source: write one line per
  list for T009 and into research R3's table (status "clear"). Replace nothing unless a list
  turns out to be copied from a source with terms that forbid it; then stop and report. Items:
  FR-017, FR-018; files: `research.md` (R3's "Data sets" table only); gates: none.
- [X] T012 [US1] [high] The served third-party notices (research R4, "The built frontend"):
  `frontend/scripts/third-party-notices.mjs` (Node only, no dependency) writes
  `frontend/public/THIRD-PARTY-NOTICES.txt` from the licence files of the packages that reach
  the bundle (R4 lists 26), and appends by hand-kept sections what has no file: lodash inside
  the kit, the Fira fonts with the OFL's text, the ICC profile, brotli's Apache-2.0 files, `dfa`
  and `fontkit` with their upstream sources. An npm script `notices` in `frontend/package.json`
  runs it; the file is committed, and the script fails when a listed package is missing or has
  no licence text and no hand-kept section. Check that the build copies the file to the output's
  root and that it is served at `/THIRD-PARTY-NOTICES.txt` beside the app. Items: FR-023;
  depends on T007 (`frontend/package.json`); files: `frontend/scripts/third-party-notices.mjs`,
  `frontend/public/THIRD-PARTY-NOTICES.txt`, `frontend/package.json`, and `eslint.config.mjs`
  only if the linter must be told about the new folder; gates: Node.
- [X] T013 [US1] [medium] The CI (the only task that edits `.github/workflows/ci.yml`): a new
  read-only job that runs the REUSE check of T010 at its pinned version, and research R6's
  finding 22: `actions/checkout` and `actions/setup-node` pinned by commit with the tag in a
  comment, as `setup-uv` is. Items: FR-006, FR-041; depends on T010; files:
  `.github/workflows/ci.yml`; gates: the file parses (`python -c 'import yaml…'` or `actionlint`
  if present).
- [X] T014 [US1] [medium] The star artwork's replacement, checked and recorded (research R3,
  decision 1; decided on 2026-11-21). The replacement itself is not this spec's work: the
  designer's new visuals (the Figma page "New visuals": eight pictures in place of the four, a
  rebuilt sign-in page, a redrawn not-found page, changed placements on the welcome page, the
  status band and the empty documents step) are built as the bug record
  `.specify/bugs/new-visuals/`, in a session of its own; a second record,
  `login-welcome-motion`, may follow it and adds no picture. If that fix is not in the tree yet, stop and say so. Once it is: none of
  `login-art@2x.png`, `wallet-star@2x.png`, `published-art@2x.png` and
  `published-art-grey@2x.png` is left in `frontend/src/assets/illustrations/` and nothing
  imports them; no file the bug record added, its screenshots included, shows the old artwork
  (look at each picture); the Node gates pass. Record in research R3 (the illustrations' row
  and decision 1) the new files by name. Who made them is recorded (the designer, entirely her
  own work; user, 2026-11-21); ask the user with which tool and from what, and record the
  answer; if any part is not the designer's own work, name its source and licence there, for
  T009. Items: FR-018, SC-002; files: `research.md` (R3 only); gates: Node.

### Delegation

- **Wave 1** (parallel): T007 [high]; T008 [medium]; T011 [medium].
- **Wave 2**: T009 [high]; T012 [high] (different files).
- **Wave 3**: T010 [high], then T013 [medium].
- T014 [medium] as soon as the bug record `new-visuals` is fixed in the tree, beside any wave;
  T009 waits for its record in R3.

---

## Phase 4: User Story 4 — Status, and running it without DPS (Priority: P2), package C2

**Goal**: a visitor knows the project's status within the README's first screen and can deploy
without anything from DPS.

**Independent Test**: the README opens with the banner; a search of the README and `docs/` for
Coolify and for the Spec Kit installation finds nothing; `docker compose -f
docker-compose.prod.yml config` works with only the documented variables.

**Owns**: `README.md`, `SECURITY.md`, `CONTRIBUTING.md`, `docs/ARCHITECTURE.md`,
`docs/EUDIPLO.md`, `docker-compose.prod.yml`.

- [ ] T015 [US4] [medium] `README.md`, top to "Common Commands": the title "Konnekt" with the
  line that it is the middleware between serviceBW forms and the EUDI Wallet; directly under it
  the status banner (not actively maintained; pull requests and issues closed;
  `hello@dpschool.io` for contributions or a takeover); the copyright notice "Copyright 2026 Team
  Faro, Batch#27, Digital Product School. Licensed under the EUPL-1.2." with links to `LICENSE`
  and `NOTICE.md`; the introduction kept, with the template's credit; "Dependencies added to the
  template" kept as the list of dependencies and why (the constitution asks for it). Items:
  FR-005, FR-011, FR-024, SC-008; files: `README.md`; gates: none.
- [ ] T016 [US4] [high] `README.md`, the rest, by research R10's table: the frontend container's
  variables without Coolify; "Spec-Driven Development with Spec Kit" reduced to one sentence
  that `specs/` records how the project was built, with a link to Spec Kit; "Deployment"
  rewritten for any Docker host behind a reverse proxy that provides HTTPS: every variable the
  production compose file needs, how the proxy reaches nginx, the first account, backups, no
  preview deployments; the wrong `APP_ENV` sentence corrected (research R6, finding 21); **no**
  paragraph for an installation from before the rename (FR-016 withdrawn 2026-11-24) and no old
  name anywhere in the README; the scrub's README lines (research R5: H2, T1a, T3, and item 5 of
  its confidential-items table). Items: FR-025, FR-026, FR-033; depends on T015 (same file);
  files: `README.md`; gates: none.
- [ ] T017 [P] [US4] [high] `docker-compose.prod.yml` without what only Coolify provides
  (research R10): comments rewritten; `SERVICE_PASSWORD_POSTGRES` stays by name and fails with a
  clear message when unset (`${VAR:?…}`); the `SERVICE_NAME_*` indirections become the fixed
  service names; `SERVICE_FQDN_FRONTEND` handled as R10's Decision says; how the proxy reaches
  nginx as T016 documents it. `docker compose -f docker-compose.prod.yml config` must pass with
  only the documented variables set (if Docker is not available, say so; T038 builds it). Items:
  FR-025; files: `docker-compose.prod.yml`; gates: `config`.
- [ ] T018 [P] [US4] [medium] `docs/ARCHITECTURE.md` and `docs/EUDIPLO.md` by research R10's
  table and R5's scrub lines for these files (T1d, T1e, T3, H2): the tree, the settings tables
  and "Production Deployment" describe the generic deployment of T016 and T017, no Coolify, no
  previews; the sentence at ARCHITECTURE `:608` about previews reworded to the general case
  (several applications under one registrable domain); EUDIPLO's "This project's deployment"
  without the team's hosting. Items: FR-025, FR-033; files: `docs/ARCHITECTURE.md`,
  `docs/EUDIPLO.md`; gates: none.
- [ ] T019 [P] [US4] [medium] `SECURITY.md` in the root: no security updates are planned; report
  a vulnerability anyway to `hello@dpschool.io`; the known limitations of research R6's table
  "`SECURITY.md`'s known limitations", items 1 to 11, with for item 11 each remaining finding
  and its fix in one line. Do not describe findings 3 to 6, 10, 13, 14 (start command), 20
  (`server_tokens`), 21 and 22 as open: phase 6 and T013 fix them (T032 reconciles). Items:
  FR-027; files: `SECURITY.md`; gates: none.
- [ ] T020 [P] [US4] [medium] `CONTRIBUTING.md` in the root: the project is not actively
  maintained; write to `hello@dpschool.io` before starting anything; contributions are accepted
  under the EUPL-1.2 only; a contributor confirms the work is theirs; where the checks are
  (`CLAUDE.md`, "Before you finish"). Items: FR-028; files: `CONTRIBUTING.md`; gates: none.

### Delegation

- One agent: T015 [medium], then T016 [high] (the README).
- **In parallel**: T017 [high]; batch (T018, T019, T020) [medium].

---

## Phase 5: User Story 2 — Nothing private becomes public, the scrub (Priority: P1), package C3

**Goal**: the records of how the project was built stay, without the team's hosts, tenant, IDs
and local paths.

**Independent Test**: research R5's five "Checks after the scrub" print only its allowlist.

**Owns**: `specs/001-…` to `specs/011-…`, `.specify/bugs/`, `backend/tests/fake_eudiplo.py`,
`backend/tests/unit/test_issue_test_credentials.py`.

- [ ] T021 [US2] [medium] The scrub by script (scratch, not committed), research R5's "Scrub
  patterns" in their order with the replacements and the "Applied" column of its table, over
  `specs/001-…` to `specs/011-…` and `.specify/bugs/` only: H1a, H1b, H2, T1a, T2, L1, L2, L3,
  I1, I2, S1 (the path everywhere; the bare name kept where the table says), S3. Not applied:
  the Figma patterns, T3 in the specs, C1 in the specs. Mind R5's cautions (`faro` and `dps`
  alone are unsafe patterns). Afterwards the five checks of R5 for these two folders; write the
  counts before and after into `verification.md`. Items: FR-032, FR-033, FR-035; files: the
  matched files under the two folders, `verification.md`; gates: the five checks.
- [ ] T022 [P] [US2] [medium] The tests' tenant (research R5, T1c): `'dps'` → `'test-tenant'` on
  the three lines named there, nothing else in those files. Items: FR-033; files:
  `backend/tests/fake_eudiplo.py`, `backend/tests/unit/test_issue_test_credentials.py`; gates:
  backend.
- [ ] T023 [P] [US2] [medium] Delete the blank screenshot
  `.specify/bugs/published-sticky-bar/before-activity-open-scrolled-to-end.png` and reword the
  lines of that bug record that point to it; the other eight screenshots stay (research R3,
  decision 5). Items: FR-034; files: that folder; gates: none.

### Delegation

- T021 [medium]; batch (T022, T023) [medium] in parallel with it.

---

## Phase 6: User Story 2 — Nothing private becomes public, the security fixes (Priority: P1), package C4

**Goal**: the four weaknesses that become one-step attacks once the code is public are closed,
each with its tests; the one-line hardening is done.

**Independent Test**: each fix's tests pass; the headers, the limits and the consent page behave
as the tasks say on a running stack.

**Owns**: `frontend/nginx.conf`, `frontend/nginx/`, `frontend/Dockerfile*`, `backend/Dockerfile*`,
`mcp/Dockerfile*`, `docker-compose.yml`, `backend/app/` (auth, OAuth, settings, models,
schemas), `backend/alembic/versions/` (new files only), `backend/tests/` (except T022's two
files), `backend/.env.example`, `api-types/src/` (only if a shape changes),
`frontend/src/pages/Authorize/`, `frontend/src/pages/Login/` or wherever the sign-in page is.

The four fixes touch `frontend/nginx.conf` one after the other: T024, T025, T026 and T027 are
not parallel to each other. Each fix follows research R6's table (place, fix) and its Decision:
a `429` uses the `{error, message}` envelope with `Text(en, de)`; the OAuth endpoints keep the
bodies their RFCs prescribe; new copy goes through `defineTexts(en, de)`; new settings are
fields on `Settings` and go into `backend/.env.example` (the README and ARCHITECTURE follow in
T032).

- [ ] T024 [US2] [xhigh] Finding 3, the security headers: `X-Frame-Options`,
  `X-Content-Type-Options` and a `Content-Security-Policy` with `frame-ancestors` reach every
  answer of nginx, the SPA's page and its assets included, in the locations that set headers of
  their own too. Use `add_header_inherit merge;` only if `nginx -t` of the image's version
  accepts it; otherwise repeat the headers in those locations (an include file). Choose
  `frame-ancestors 'none'` unless a page of the app frames another one of its own (search for
  `iframe`); then `'self'`. Check on the built image if Docker is available: the three headers
  on `/`, on an asset and on `/index.html`. Items: FR-037 (finding 3); files:
  `frontend/nginx.conf`, a new include under `frontend/nginx/` if needed; gates: `nginx -t`, the
  header check, or "needs a person" with the exact commands.
- [ ] T025 [US2] [xhigh] Finding 4, the sign-in throttle. Constraints: failed attempts are counted
  per submitted username whether or not the account exists (no difference an attacker can
  measure, as today); after a small number of failures the next attempts for that username are
  refused for a short, growing time with `429` and `Retry-After`, without running the password
  hash; a correct sign-in after the wait works, so nobody can lock an account for good; the
  state is shared by every worker process (a table with a new migration, read and written under
  a row lock, sync), unless the image provably runs one process, in which case say so and keep
  it in memory; the limits are settings; `max_length` on the username and the password in the
  schema; nginx limits `/api/auth/login` per client address as `real-ip.conf` resolves it, so
  that the hash's memory cannot be multiplied. The sign-in page shows the server's message for
  a `429`. Tests: pytest for the counting, the refusal without hashing, the reset after success
  and after the wait, the unknown username, the over-long fields. Items: FR-037 (finding 4);
  files: `backend/app/routers/auth.py`, `backend/app/services/auth.py`, `backend/app/models.py`,
  `backend/app/schemas.py`, `backend/app/config.py`, one new migration,
  `backend/.env.example`, `backend/tests/`, `frontend/nginx.conf`, the sign-in page only if it
  does not already show a server message; depends on T024 (`nginx.conf`); gates: backend, Node.
- [ ] T026 [US2] [xhigh] Finding 5, open client registration: at most 10 redirect URIs and
  bounded lengths for every field of the registration body; nginx accepts a few kilobytes for
  `/api/oauth/` and limits its request rate per client address; a cap on registrations that were
  never used, with the oldest unused ones removed or the call refused, whichever keeps a
  legitimate client working (say which, and why). Refusals use the error body RFC 7591
  prescribes. Tests: pytest for each limit and for a normal registration still working. Items:
  FR-037 (finding 5); files: `backend/app/routers/oauth.py`, `backend/app/services/oauth.py`,
  `backend/app/schemas.py`, `backend/app/config.py` and `backend/.env.example` if a limit is a
  setting, `backend/tests/`, `frontend/nginx.conf`; depends on T025 (`nginx.conf`, `schemas.py`,
  `config.py`); gates: backend.
- [ ] T027 [US2] [xhigh] Finding 6, the consent page: it shows the host of the redirect URI and
  says that the client registered itself and that its name is its own claim; "Read only" is
  preselected whenever the signed-in account has no existing connection with that client,
  whatever the request asks for; the member can still choose a higher level. If the page needs a
  fact the API does not give, add it to the response in `backend/app/schemas.py` and its mirror
  in `api-types/src/` in the same task. Copy in both languages through `defineTexts`, KERN's
  components and the frontend rules of `CLAUDE.md`. Tests: Vitest for the pure helpers (the
  preselection, the host shown), pytest if the API changed. Items: FR-037 (finding 6); files:
  `frontend/src/pages/Authorize/*`, and only if needed `backend/app/schemas.py`,
  `backend/app/services/oauth.py`, `api-types/src/`, `backend/tests/`; depends on T026
  (`schemas.py`, `services/oauth.py`); gates: backend, Node.
- [ ] T028 [US2] [medium] The one-line hardening and the images' files, each as research R6's
  table says: finding 10 (`ENV APP_ENV=production` in `backend/Dockerfile`); 13 (`127.0.0.1:` on
  every published port of `docker-compose.yml`); 14, the start command only (no second sync at
  start, no `dev` group); 20, `server_tokens off;` only. Also: the three production Dockerfiles
  copy `LICENSE` and `NOTICE.md` from the root context into the image (FR-007), and the backend
  Dockerfiles copy `backend/LICENSE` before `uv sync` if T007's report says the build needs it;
  the Coolify comments at `frontend/Dockerfile:29` and `frontend/nginx/40-servicebw-access.sh:9`
  reworded to "the proxy in front"; `backend/.env.example:20` without the tenant's name
  (research R5, T1b). If Docker is available, build the three production images. Items: FR-007,
  FR-025, FR-033, FR-037; depends on T007 (its report), T009 (`NOTICE.md` must exist to be
  copied), T027 (`nginx.conf` is free); files: the six Dockerfiles, `docker-compose.yml`,
  `frontend/nginx.conf`, `frontend/nginx/40-servicebw-access.sh`, `backend/.env.example`; gates:
  the builds, or "needs a person".

### Delegation

- One agent at a time on the chain T024 → T025 → T026 → T027 [xhigh] (shared files).
- T028 [medium] last.
- **Needs a person**: on a running stack, a wrong password six times (the refusal and its
  message in both languages), then the right one after the wait; the consent page for a client
  the account has never connected; the headers, if no Docker was available here.

---

## Phase 7: User Story 5 — The mentor's checklist, and the files for agents (Priority: P3)

**Goal**: what describes the repository agrees with it, and the mentor and the team have their
texts. Starts when phases 3 to 6 are done.

**Independent Test**: `handover.md` can be acted on line by line; `pr.md` holds the consent
statement ready to post.

- [ ] T029 [P] [medium] `CLAUDE.md` in line with the repository (FR-029): the title and the
  names (T004 did the mechanical part; read it through); the REUSE check among the commands and
  in "Before you finish" and the CI paragraph; a rule that `LICENSE` never changes and that
  `LICENSES/EUPL-1.2.txt` and `backend/LICENSE` are its copies; in the documentation checklist,
  that a new dependency, font, icon, picture or copied file goes into `NOTICE.md` and
  `REUSE.toml`, and a bundled package into the served notices (`npm run notices -w frontend`);
  the backend rules for the sign-in throttle and the registration limits in one line each,
  pointing to ARCHITECTURE. Items: FR-029; files: `CLAUDE.md`; gates: none.
- [ ] T030 [P] [medium] `.specify/memory/constitution.md` as a patch amendment (FR-029): the
  wording "this template" and the template's name where they describe this repository, the
  package names, the REUSE check under Principle III's gates as run by the CI; version and
  amendment note as the file's own governance section prescribes. Items: FR-029; files:
  `.specify/memory/constitution.md`; gates: none.
- [ ] T031 [P] [medium] The MCP guidance read through after the rename (FR-015, FR-029):
  `mcp/plugin/README.md`, `mcp/plugin/skills/*`, the server's instructions in `mcp/src/`: the
  plugin's and the server's names, the installation commands, the repository's address; `npm
  test -w mcp` (the guidance tests). Items: FR-015, FR-029; files: `mcp/plugin/**`, `mcp/src/`
  texts only; gates: Node.
- [ ] T032 [medium] Documentation of what phases 3 to 6 added, in the files phase 4 owned: the
  README's "Continuous integration", "What runs where" and "Environment Variables" (the REUSE
  job; every new setting of T025 and T026, also in `docs/ARCHITECTURE.md`); ARCHITECTURE's
  sign-in and OAuth sections for the throttle, the registration limits and the consent page;
  `SECURITY.md` reconciled with what phase 6 really fixed (a finding a task could not fix is
  listed as open, with its report's reason). Items: FR-027, FR-029, constitution IV; depends on
  phases 3 to 6; files: `README.md`, `docs/ARCHITECTURE.md`, `SECURITY.md`; gates: none.
- [ ] T033 [US1] [medium] `specs/012-open-source-release/pr.md`: the pull request's title and
  description: what the change does in five lines; the consent statement in the mentor's words
  (spec.md, Context, step 9) with `DigitalProductschool/konnekt`, "up to and including
  27.11.2026" and the notice "Copyright 2026 Team Faro, Batch#27, Digital Product School"
  filled in; the instruction to post it as a comment on the `LICENSE` file with full name,
  GitHub handle, place and date; who must post it (research R8: three people, and the mentor
  for DPS's template); the sentence that `LICENSE` is the first commit and never changes, with
  its SHA-256; the pull request's attribution line as the session's rules give it. Items:
  FR-008, FR-009, FR-010; files: `pr.md`; gates: none.
- [ ] T034 [US5] [medium] `specs/012-open-source-release/handover.md` for the mentor, in FR-043's
  order, each line with what "done" looks like, from research R11's table as amended by the
  spec's Clarifications: first what the route decided on 2026-11-24 needs from the mentor
  (the new repository `DigitalProductschool/konnekt`, created empty and private, with push
  access for the user; why the existing one stays private, what stays reachable in it and who
  needs which access: research R11, "The history rewrite", and `history-rewrite.md`), and the
  one open question (whether the consent statements must be visible in the public repository);
  then the 18 merged branches to delete, by name (research R5, "Branches"), and `opensource`
  after the merge; detaching infrastructure, connectors and the review bot from the existing
  repository and archiving it; the new repository's protection rules for `main`; closing
  issues and pull requests there as the banner says; a tag on the published commit; the hosted
  instance (research R11, item 10). Not in it: `tmp-german`, the pull requests' texts and
  logs, which stay private, Coolify's previews (decided or handled outside, spec
  Clarifications). Items: FR-043, SC-010; files: `handover.md`; gates:
  none.

### Delegation

- **Wave 1** (parallel): batch (T029, T030) [medium]; T031 [medium]; T032 [medium]; batch (T033,
  T034) [medium].

---

## Phase 8: Verification

**Purpose**: FR-038 to FR-041 and the success criteria, on the finished tree. Reports only; a
failure goes back to the task that owns the file. Everything is appended to `verification.md`.

- [ ] T035 [high] The gates on the finished tree: the Node gates and the backend gates;
  the test counts against T003 (the same tests plus phase 6's new ones; none removed or
  skipped: `git diff` over the test files); `sha256sum LICENSE` against rule 1,
  `cmp LICENSE backend/LICENSE LICENSES/EUPL-1.2.txt`; `uv run python -m
  scripts.export_check_fixtures --check`; `git diff --stat` under `backend/alembic/versions/`
  shows only added files. Items: FR-002, FR-038, SC-009; gates: all.
- [ ] T036 [P] [medium] Licence and secret checks: `reuse lint` (SC-001); the two commands of
  `NOTICE.md` run as written, on the machine's Node and, if Docker is available, in
  `node:26-alpine`, with no tracked file changed afterwards; gitleaks at the version and
  checksum the CI pins (`.github/workflows/ci.yml`), over the tree and with
  `--log-opts=--all`, `--redact`, both without findings; `npm run notices -w frontend` leaves
  the committed file unchanged. Items: FR-021, FR-030, SC-001, SC-005.
- [ ] T037 [P] [medium] The searches: the old names (T005's command, plus "Connection Portal"
  in any case: `grep -rnIiE 'connection[ _-]?portal|community-template|template_db|batch27'`)
  print nothing outside this feature's directory (research R7, as amended 2026-11-24); research
  R5's five checks against its allowlist; `README.md` and `docs/` for
  `coolify` (any case) and for the Spec Kit installation command; every internal link of
  `README.md`, `NOTICE.md`, `SECURITY.md`, `CONTRIBUTING.md`, `docs/*.md` and `specs/README.md`
  resolves in the tree, every external one answers (list the ones that do not, with the
  status). Write R5's final allowlist into research if a line was added or went away, with its
  reason; it stays under 20 lines (SC-004). Items: FR-013, FR-025, FR-035, FR-040, SC-004;
  files: `research.md` (R5's allowlist only).
- [ ] T038 [high] The fresh clone (FR-039): since nothing is committed here, copy exactly what a
  clone would hold, `git ls-files -co --exclude-standard`, into an empty scratch directory,
  and there follow `README.md`'s "Quick Start" word for word with nothing else: the time from
  the first command to the sign-in page and a first account (SC-007, under 30 minutes); then
  `docker compose -f docker-compose.prod.yml build` with only the documented variables; then in
  the built MCP image the count of installed packages against research R4 (six, or what
  `NOTICE.md` says). Every place where the README was not enough is a finding for T016. Without
  Docker on this machine: write the exact commands under "Needs a person". Items: FR-039,
  SC-007.
- [ ] T041 [US3] [high] Clean this feature's own files of the old names (spec, Clarifications
  2026-11-24), last of all the edits: every file under `specs/012-open-source-release/`
  (`spec.md`, `plan.md`, `research.md`, `tasks.md`, `verification.md`, `pr.md`, `handover.md`,
  `history-rewrite.md`, `checklists/`). Replace each old name by neutral words that keep the
  sentence true: "the old package scope", "the old database name", "the earlier working name",
  "the existing repository", "the old storage prefix"; a command that needs the existing
  repository's address takes the placeholder `<existing-repository-url>`, with one sentence saying
  that the mentor and the user know it. Also remove the checkout's paths (the `GIT_DIR` and
  `GIT_WORK_TREE` values, the clone path of T040's rehearsal): describe them in words. Keep
  `LICENSE`'s hash, the commit hashes and everything else. Then
  `grep -rnIiE 'connection[ _-]?portal|community-template|template_db|batch27'` over the whole
  tree (without `node_modules`, `.venv`, `dist`, the lockfiles, the untracked `.git` pointer)
  prints **nothing**; append that result to `verification.md` in the same neutral words. From
  here on no task writes an old name. Items: FR-013, SC-004; depends on T035 to T038, and on
  T040 if it runs before; files: this feature's directory; gates: the search.
- [ ] T039 [medium] The record: `verification.md` ends with one table, one row per success
  criterion SC-001 to SC-010 and per user story's Independent Test, each "met", "not met" or
  "needs a person" with the evidence; the list of open points still open (research, "Open
  points"); and what a person must still do, in order. Tick nothing that was not run. It writes
  no old name (T041 ran before it; SC-004's row cites T041's search). Items: FR-042; depends on
  T035 to T038 and T041; files: `verification.md`.

### Delegation

- T035 [high]; batch (T036, T037) [medium] in parallel with it; then T038 [high]; then T041
  [high]; then T039 [medium].
- **Needs a person**, in order: the commits (below); the consent statements on `LICENSE`, counted
  against research R8 before the merge (SC-003); the mentor's new repository; the manual checks
  of phase 6; in a browser that holds a local draft from before the rename, Konnekt opens as on
  a first visit, without an error (spec, US3, scenario 2); the Account page's "Installing the
  plugin" link (scenario 3); last, the history rewrite of phase 9.

---

## Phase 9: The history rewrite (prepared here, run by the user)

**Purpose**: FR-044. The star artwork is in every commit since `48fb277` (2026-11-08). This
phase writes the step down and rehearses it on a copy. Only the user runs it, once, after
everything is merged and before anything is public; no task rewrites this checkout, the local
repository or the one on GitHub.

- [ ] T040 [US2] [high] `specs/012-open-source-release/history-rewrite.md`, the runbook, and its
  rehearsal (research R11, "The history rewrite", holds what was already tried).
  **What is removed**: the four files' objects, each path having one version in all refs
  (checked 2026-11-21): `27f50dd49ece474eb385266a7f60dcaf507d4d9d` (`login-art@2x.png`),
  `04ddbc085f557cb8139edd25b16946090bcf230d` (`wallet-star@2x.png`),
  `c04e0e40a340dc714f86585586ac4e033c83b921` (`published-art@2x.png`),
  `d932b5ab1c2a697195d8316766595d1f9a237bcc` (`published-art-grey@2x.png`); on 2026-11-24, with
  the new visuals in `main`, they were still the only versions, deleted from the tree by
  `320728d`, and the eight new pictures are `.webp` files under other names. Check them again
  (`git log --all --format= --raw --no-abbrev -- 'frontend/src/assets/illustrations/*.png'`),
  then look at every other picture of the history (`git rev-list --all --objects`, the paths
  ending in an image extension: nine screenshots under `.specify/bugs/`, two test images, the
  icons): one that reproduces the star artwork joins the list with its reason, and if it is
  still in the tree it is deleted there with the lines that link it.
  **How**: `git filter-repo --strip-blobs-with-ids <file of IDs>`, run without being declared
  (`uvx git-filter-repo`, the version written into the runbook), in a fresh clone that holds
  only `main`. Never `--invert-paths --path …`: it would also remove new files that kept an old
  name.
  **The runbook** is for a person who has not read this spec, every command written out, in
  this order: what must be true before (everything merged into `main`, the consent statements
  counted, the new visuals and T014 in `main`, nobody holding unpushed work, the new repository
  `DigitalProductschool/konnekt` created by the mentor, empty and private, with push access); the fresh clone; the tree's hash and the commit count noted; the rewrite; the checks
  (`git cat-file -e <id>` fails for every ID, and `git rev-list --all --objects` names none of
  them; `git rev-parse 'HEAD^{tree}'` and `git rev-list --count HEAD` equal the noted values;
  `sha256sum LICENSE` equals rule 1; gitleaks over the result); the push of `main` into the
  new, empty, still private repository and the look at it on GitHub; the tag; then what every
  holder of an old clone does (delete it and clone anew; a branch pushed from an old clone
  brings the files back) with the one command that tells whether a clone still holds them.
  Nothing rewritten is pushed to the existing repository (decided 2026-11-24): the runbook says
  in one paragraph why it stays private, naming what would still show the files there (the
  pull request that merged `48fb277`, by its number from the merge commit, and the old hashes).
  **What it must say plainly**: every commit gets a new hash and loses its signature (count
  the signed ones again; 300 of the 301 on `main` on 2026-11-24); the hashes that the specs and bug records cite are those of the history
  before the rewrite (count the cited strings that resolve to a commit and give the number;
  add one sentence saying so to `specs/README.md`); done after publication, the rewrite no
  longer removes anything from GitHub or from anyone's copy.
  **Rehearsal**: in scratch, `git clone --no-local /home/debian/batch27-faro`, there commit
  the tree as this checkout holds it (`git ls-files -co --exclude-standard`, copied over) as
  one commit on top with a neutral author, which rule 6 allows because it is not the
  repository; run the runbook's commands up to the push; write the checks' output and the date
  under "Rehearsed" in the runbook; delete the clone. Items: FR-044, SC-002; depends on T014;
  files: `history-rewrite.md`, `specs/README.md` (one sentence), a screenshot's deletion if one
  is found; gates: the rehearsal's checks.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1** first. **Phase 2** alone, after it.
- **Phase 9** needs only T014 and may run at any time after it; the runbook checks itself when
  the user runs it on the final history.
- **Phases 3, 4, 5, 6** after T005's gates, side by side; each owns its files (see "Owns").
- Across them: T028 (phase 6) waits for T007's report and for T009's `NOTICE.md`; T019's
  `SECURITY.md` is reconciled by T032.
- **Phase 7** after phases 3 to 6. **Phase 8** last.
- **T041** after every other edit of this feature's directory (T040 included, if it runs in the
  same session); a task that runs after T041 writes no old name.

### Commits (the user's, on their machine)

1. `LICENSE` and `LICENSE.de`, nothing else (now), then the pull request is opened.
2. Phase 2, the rename, as one commit.
3. Phases 3 to 6, one commit per package, in any order.
4. Phases 7 and 8.
5. The new visuals (the bug records `new-visuals` and `login-welcome-motion`) were pull
   requests of their own, outside this spec, and are in `main` since 2026-11-24.
6. Last, after the merge and before anything is public: the history rewrite by
   `history-rewrite.md` (phase 9). It is not a commit; it gives every commit a new hash.

`LICENSE` is in commit 1 only. A later commit that shows it as changed is a mistake.

### User Story Dependencies

- **US3** (the name) blocks all others in time.
- **US1** (the terms): phase 1, phase 3, T033; independent of US2 and US4 apart from the files
  T028 copies.
- **US2** (nothing private): phases 5 and 6, independent of each other.
- **US4** (status and deployment): phase 4.
- **US5** (the checklist): T034, after everything it reports on.

### Parallel Opportunities

- Phases 3 to 6 as four sessions or four agents at once.
- Inside phase 3: T007, T008, T011; then T009 and T012.
- Inside phase 4: the README chain beside T017 and the batch T018 to T020.
- Phase 7's wave; T036 and T037 beside T035.

## Implementation Strategy

- **What must not slip**: commit 1 and the pull request today, since the consent statements
  need the week; phase 2 next, because phases 3 to 6 cannot start before it.
- **If time runs short**, in this order of what to keep: phases 3 and 5 (the terms and the
  scrub are conditions of publishing), phase 4, T024 to T027 (each can stand alone; a fix that
  cannot be finished is described in `SECURITY.md` with the mentor's agreement, FR-037), T028.
- **One session per phase** works; one coordinator with task agents works as well, as long as
  the ownership lists hold.

## Coverage check

| Requirement | Tasks |
|---|---|
| FR-001, FR-002 | T001, T002, T003, T035 |
| FR-003, FR-004 | T007 |
| FR-005 | T015 |
| FR-006 | T010, T013, T036 |
| FR-007 | T028 |
| FR-008 to FR-010 | T033, the people's steps |
| FR-011 to FR-013 | T004, T005, T037, T041 |
| FR-014 | T006 |
| FR-015 | T004, T031 |
| FR-016 | withdrawn 2026-11-24 |
| FR-017, FR-018 | T009, T011, T014 |
| FR-019 | T008 |
| FR-020 to FR-022 | T009 |
| FR-023 | T012 |
| FR-024 to FR-026 | T015, T016, T017, T018 |
| FR-027, FR-028 | T019, T020, T032 |
| FR-029 | T029, T030, T031, T032 |
| FR-030, FR-031 | research R5 (done: no credential found), T036 |
| FR-032 to FR-035 | T021, T022, T023, T016, T018, T028, T037 |
| FR-036 | research R5's table (all items decided), T016, T021 |
| FR-037 | T024 to T028, T013, T019, T032 |
| FR-038 to FR-041 | T035 to T038, T013 |
| FR-042 | research, T039 |
| FR-043 | T034 |
| FR-044 | T014, T040, the user's step |

## Notes

- `[P]` = different files, no unfinished dependency.
- The checkboxes here and `verification.md` are the only state between sessions: tick a task
  only when its gates are green.
- Git: `GIT_DIR=/home/debian/batch27-faro/worktrees/opensource` and
  `GIT_WORK_TREE=/home/debian/batch27-faro/opensource`; a task agent never commits, and the
  coordinator commits only when the user asks.
- Decided by the mentor on 2026-11-24: the repository's name `DigitalProductschool/konnekt` is
  final, and it is a new repository that receives the rewritten history; T040 has no other
  route. Open and stopping no task: whether the consent statements must be visible in the
  public repository.
- The branch must be based on `main` at `2d3f0f3` or later, which holds the new visuals, the
  sign-in motion and the German copy of the user tests (`git merge-base --is-ancestor 2d3f0f3
  HEAD`); if it is not, stop and say so. Counts and line numbers that research.md gives were
  taken at `9fbce6c`: check a cited line before relying on it.
- Avoid: opening `LICENSE` for writing; per-file SPDX headers; a second licence text that
  differs from the root's; renaming an environment variable (other than the plugin's, done) or a
  migration; writing an old name back anywhere (amended 2026-11-24);
  hand edits to lockfiles or generated fixtures; a new dependency for the notices, the REUSE
  check or the throttle; scrubbing the Figma keys or `FS-20417` (both decided to stay);
  rewriting history anywhere but in T040's scratch clone; writing a secret, a full ID or a local path into any file; a `pytest.ini`
  or a `vitest.config.ts` in `frontend/`.
