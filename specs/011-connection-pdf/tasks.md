# Tasks: Download a connection's details as a PDF

**Input**: Design documents from `specs/011-connection-pdf/`: [plan.md](plan.md) (its "Delivery
order"), [spec.md](spec.md), [research.md](research.md) (R1–R14 and the Phase 0 spike),
[data-model.md](data-model.md), [contracts/](contracts/) (`api-version.md`, `pdf-worker.md`,
`pdf-document.md`), [quickstart.md](quickstart.md), [design-notes.md](design-notes.md) (§1–§3 the
button and the version, §4 colours, §5 differences from the prototype) and the sketch in
[prototype/](prototype/) (`make.mjs`, `paginate.mjs`, `data.mjs`, `spike/`).

**Prerequisites**: specs 008, 009 and 010 are implemented and are the baseline: the details page
with its Summary card, spec 010's scheduled state, start date and documents' order (spec,
Clarifications 2026-11-12), and the two languages with `defineTexts`, `useCopy`, `useLanguage`,
`RuleContext.language`, the problems' `code`, `ApiFetchOptions.language` and `copy.test.ts`. T002
records those names as built; every later task uses the names of design-notes §8.1.

**Tests**: the plan asks for them (plan.md "Testing", research R14): Vitest beside every pure
module, the Node smoke test of the rendered PDF, pytest for the version. They are written in the
task that makes the module, never in a separate pass.

**Organization**: nine phases, one chat per phase: setup; the version in the API (US3, built first
because every page of the PDF carries it); the pure core; the published PDF's document (US1); the
download on the details page (US1); the draft's PDF (US2); the version end to end (US3); German
and accessibility (US4); limits, edge cases, documentation and close.

## Format: `[ID] [P?] [Story] [Level] Description`

- **[P]**: can run in parallel: different files, no dependency on an unfinished task. The waves
  and batches of a phase are in its "Delegation" section; nothing else lists them.
- **[Story]**: the user story a task delivers: US1 (a published connection's PDF), US2 (a draft's
  PDF), US3 (the version), US4 (language and accessibility). Setup, core, checkpoint and
  documentation tasks carry none.
- **[Level]**: who takes the task in `/speckit-implement`, judged for Claude Opus 5.5 at that
  effort.
  - **[medium]**: `speckit-task-medium`: mechanical or fully specified work: moves, renames,
    config, mirrors of existing types, glue code, documentation, tests of behaviour that already
    exists, a scripted check that only reports.
  - **[high]**: `speckit-task-high`: new logic that needs design within the task: algorithms,
    state machines, retry loops, parsers, workers, pages with several states, the Figma loop, a
    sweep that judges and fixes what it finds.
  - **[xhigh]**: `speckit-task-xhigh`: a mistake is costly and tests written alongside the code
    are unlikely to catch it: authentication, authorization, tokens and secrets, concurrency and
    row locks, transactions around external calls, refactors across many files that must not
    change behaviour, rules that other specs depend on.
  - **[lead]**: the coordinator does it itself: the checkpoints, and tasks that settle an open
    decision in the spec documents that later tasks depend on.
- **Every task line carries**: what it builds, the requirements it meets (FR-#, SC-#), the
  decision it applies (R#), the files it edits, its gates, and its size (screens or states,
  expected screenshots, rough tool calls).

## Path Conventions

Web application, the npm workspace (constitution 1.2.1):

- `backend/app/services/versions.py` (new), `rules.py`, `form_connections.py`, `drafts.py`;
  `backend/app/schemas.py`; tests in `backend/tests/{unit,api}/`.
- `api-types/src/form-connections.ts`; `rules/src/validation.ts` with its `validation.test.ts`.
- `frontend/src/utils/connectionPdf/` (new, pure, every module with its `*.test.ts`): `types.ts`,
  `constants.ts`, `model.ts`, `gaps.ts`, `blocks.ts`, `paginate.ts`, `wrapUrl.ts`, `fileName.ts`,
  `render.ts`, `testData.ts`. `frontend/src/workers/pdf.ts`, `frontend/src/hooks/useConnectionPdf.ts`,
  `frontend/src/utils/connectionSummary.ts`, `frontend/src/assets/fonts/`,
  `frontend/src/pages/FormConnectionDetail/` (`PdfDownload.tsx` is new).
- `mcp/src/views.ts`, `mcp/src/tools/read.ts`, `mcp/plugin/skills/`.
- **The feature's records**, all in `specs/011-connection-pdf/design-notes.md`, whose headings T001
  adds: §7 "Verification" (§7.1 the button's per-node table, §7.2 the details page's states,
  §7.3 the PDF's pages, §7.4 tags, contrast and veraPDF, §7.5 version, limits, edge cases and
  privacy), §8 "Decisions and history" (§8.1 spec 009's API as built, §8.2 decisions D#, §8.3 the
  test connections, §8.4 history), §9 "Closing report".
- **The scratchpad**: the chat's scratchpad directory, one folder per task (`011/T0xx/`), for
  scripts, CSVs, PDFs and screenshots. Nothing in it is committed; a table that must outlive the
  chat is copied into design-notes §7.
- **The test connections** A–E are quickstart §0's; `specs/011-connection-pdf/prototype/seed.ts`
  (T028) creates them, and their ids are in design-notes §8.3.

## Rules every task follows

- **Nothing stored, sent or logged** (FR-041, FR-042): no `console.*` in
  `utils/connectionPdf/`, `workers/pdf.ts` or `useConnectionPdf`; the backend logs nothing about a
  version or a PDF; no finding, persona or citizen data enters the model; no request that names or
  carries a connection beyond the ones the details page makes anyway (the worker's static files,
  its chunks and the fonts, are the only others: SC-008).
- **Only the worker and the hook touch browser APIs**; `utils/connectionPdf/` stays pure and
  receives PDFKit's constructor, the fonts' bytes and the clock as arguments.
- **A draft's PDF holds no URL** (FR-013), in any task that touches the model, the blocks or the
  drawing.
- **Texts are reused, not copied**: what the details page or the create flow already says comes
  from its table (`DETAIL_COPY`, `BRANCH_MARK_COPY`, the editor's constants, `rules/src/`); the
  PDF's own texts are `PDF_TEXTS`, both columns written in the task that adds a key, German from
  spec 009's glossary and decision D2.
- **Measured equals drawn** (R11): a block kind's geometry is computed by one function,
  `layoutOf()` in `blocks.ts`, which `blocksOf()` calls for the height and `render.ts` calls to
  draw. No task measures in one place and positions in another.
- **The prototype is a sketch**: its numbers and wording are the reference, its code is not
  copied file for file, and nothing under `prototype/` except `seed.ts` is edited.
- **Gates**: a task in a Node package ends with `npm run lint && npm test && npm run build` from
  the root ("Node gates"); a backend task with `uv run ruff check --fix . && uv run ruff format . &&
  uv run mypy app/ scripts/ tests/` and `DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5435/template_db_test
  uv run pytest` in `backend/` ("backend gates"). A task that edits only `specs/` runs no gate.
  Backend batches never run side by side: the tests empty one database.
- **Verification sweeps are script-first.** A sweep that checks many items across many states
  writes one script that measures everything measurable and writes a CSV plus a grouped summary
  (pass, fail, unsure per check and per state) to its scratchpad folder. The agent reads the
  summary and opens a screenshot or a page image only for a row that fails or that the script
  flags as unsure.
  - *The page*: one `browser_run_code_unsafe` call per browser through the Playwright MCP tools
    (Chromium and Firefox; no `playwright` package is added). It measures horizontal scroll
    (`scrollWidth <= clientWidth`), clipped or off-screen elements (each text node's
    `scrollWidth` against its box, each box against the viewport), the `h1` count,
    `:focus-visible` after a click and after Tab, contrast (colours converted through a canvas,
    alpha and opacity composited over what lies behind), computed transition durations and label
    widths.
  - *The PDF*: a Node script (`npx vite-node`) that renders with PDFKit's Node build through the
    recording wrapper of `render.test.ts` and reads the pages `paginate()` returns: per page the
    texts drawn, their tag or artifact, colours and positions, the blocks and their places.
  - *Page images*, when a row needs one: the PDF opened in the Firefox Playwright MCP's built-in
    viewer and captured there. This machine has no poppler, qpdf, Java or veraPDF (checked
    2026-11-09); T001 records what is installed.
- **A sweep counts earlier evidence**: it re-checks only the states its line calls new, and cites
  the earlier table (design-notes §7.#, or a test) for the rest.
- **A parallel sweep reports and doesn't fix.** Its report lists each defect with the CSV row,
  the file and the suspected cause; the fix task named in the phase's Delegation fixes them and
  re-runs the failing rows with the sweep's script. A sweep that runs alone in its wave owns its
  fixes when its line says so.
- **Sizes**: every line gives its size. A task that turns out to need more than about 40
  screenshots or 150 tool calls is split by the coordinator before it is delegated, by screen
  group (one user story, or about 8 screens or 40 states, whichever is smaller), into parallel
  tasks of the same level.
- **For the coordinator: "carried from" notes.** A finding that a task leaves for a later one is
  appended to that later task's line as "carried from T0xx: …". When a task line collects more
  than 3 such notes, move them into a separate "decide" task in the same phase, placed before
  the task that depends on the answers, instead of appending them to a sweep. Open questions,
  "check X and decide" notes and designer questions never go into a sweep.
- **Reports**: a task's report lists the files it changed, every UNCERTAIN decision, the rows it
  added to design-notes §7 and, for a sweep, the path of its script, CSV and summary. The
  coordinator ticks a task only when its gates are green and its rows are clean or handed to a
  fix task.

---

## Phase 1: Setup

**Purpose**: a green baseline, the names spec 009 built, the two decisions the documents leave
open, the one dependency, the build options and the fonts. No Figma.

- [X] T001 [medium] Record the baseline: `npm install` at the root and `uv sync` in `backend/`, then the Node gates and the backend gates; add the empty headings §7 (§7.1–§7.5), §8 (§8.1–§8.4) and §9 to `specs/011-connection-pdf/design-notes.md` as "Path Conventions" names them; record in §8.4 the test counts of `rules/`, `frontend/`, `mcp/` and pytest, the size of the main entry chunk from `npm run build -w frontend` (quickstart §1 compares against it), the Node version (if `npm install` or Vite 8 fails on Node 20, use `nvm use 22` and say so), and which of `verapdf`, `java`, `qpdf`, `pdftotext`, `pdftoppm` and `docker` are on the PATH; items: SC-001 (bundle), constitution III; files: `specs/011-connection-pdf/design-notes.md`; gates: the four suites green; size: no screens, 0 screenshots, about 15 tool calls
- [X] T002 [lead] Settle spec 009's API as built: find each name the plan uses and write "name in plan.md → name as built → file" into design-notes §8.1: `Language`, `defineTexts`, `useCopy`, `useLanguage`, `RuleContext.language`, the problems' `code` on `RulesProblem` and `ruleProblemOf`, `statementPartsOf` and `statementOf` with a language, `ApiFetchOptions.language`, `getOptionSets(language)` and `getDocumentTypes(language)` (the per-language caches), `frontend/src/copy.test.ts` (its glob and its allowlist of words equal in both languages), `DETAIL_COPY` and `BRANCH_MARK_COPY` as tables, the editor's texts for "Enter a name for the connection.", "Add at least one document." and "Choose at least one data item, or remove this document.", and the polite live region the details page uses for "Link copied"; where a name differs, the name as built wins and later task lines are read with §8.1; if spec 009 is not implemented in this checkout, stop the feature and tell the user; items: plan.md "Note", R3, R9; files: `specs/011-connection-pdf/design-notes.md` (§8.1); gates: none; size: about 20 lookups, 0 screenshots
- [X] T003 [lead] Settle the two open decisions and record them in design-notes §8.2. **D1, how PDFKit is typed**: `pdfkit` 0.20.2 ships no type declarations (its `exports` hold only JavaScript), and plan.md allows one new package. Recommended: a small interface of our own in `utils/connectionPdf/types.ts` (`PdfKitDocument`, `PdfKitConstructor`) that declares only the calls `render.ts` makes, with the two imports of PDFKit (the worker's and the smoke test's) cast to it at the import, each with a one-line justification; the alternative, `@types/pdfkit` as a dev dependency, is a second package (README entry, constitution IV) and may not know 0.20's structure and outline calls. **D2, the German terms the glossary lacks** (contracts/pdf-document.md §5, "Glossary additions"): compare each proposal ("data item" → "Datenfeld", "Added here" → "Hier hinzugefügt", "Removed here" → "Hier entfernt", "Not live" → "Nicht veröffentlicht", "version" → "Version") with what spec 009's code already says for the same English (the Documents step, `BRANCH_MARK_COPY`, the status texts); what the code says wins; add the settled terms to `specs/009-language-toggle/contracts/glossary.md` §2 and correct the proposal table in `contracts/pdf-document.md` §5 and design-notes §3 where they differ; items: R1, R3, constitution IV, FR-034; files: `specs/011-connection-pdf/design-notes.md` (§8.2), `specs/011-connection-pdf/contracts/pdf-document.md`, `specs/011-connection-pdf/plan.md` (only if D1 takes the package), `specs/009-language-toggle/contracts/glossary.md`; gates: none; size: 2 decisions, 0 screenshots
- [X] T004 [P] [medium] Add the dependency and the build options: `pdfkit` pinned exactly at `0.20.2` in `frontend/package.json` (no caret) with the root `package-lock.json` updated by `npm install`; `worker: { format: 'es' }` in `frontend/vite.config.ts` beside the `test` block (R2; the two existing workers must still build: check that `npm run build -w frontend` emits both); `font/ttf` appended to `gzip_types` in `frontend/nginx.conf` (R7); in the root ESLint configuration, add `frontend/src/utils/connectionPdf/**`, `frontend/src/workers/pdf.ts` and `frontend/src/hooks/useConnectionPdf.ts` to the block that sets `'no-console': 'error'` for the checks and personas; D1's dev dependency only if T003 took it; items: R1, R2, R7, FR-042, constitution IV; files: `frontend/package.json`, `package-lock.json`, `frontend/vite.config.ts`, `frontend/nginx.conf`, the root ESLint configuration; gates: Node gates; size: 5 files, 0 screenshots, about 20 tool calls; carried from T002: no block for `frontend/src/` sets `'no-console'` (the checks' and personas' rule is in the `{api-types,rules}/src/**/*.ts` block), so add a block of its own for the three PDF paths after the SPA's block (design-notes §8.1)
- [X] T005 [P] [medium] Commit the fonts as files (R7): run `npm install` inside `specs/011-connection-pdf/prototype/` (its own lockfile; `node_modules` there stays uncommitted) and copy from `node_modules/@expo-google-fonts/` the five TTFs the prototype's `make.mjs` loads to `frontend/src/assets/fonts/` as `FiraSans-Regular.ttf`, `FiraSans-Medium.ttf`, `FiraSans-SemiBold.ttf`, `FiraMono-Regular.ttf`, `FiraMono-Medium.ttf`, with the SIL OFL 1.1 text as `OFL.txt` beside them; record each file's size and SHA-256 in design-notes §8.4; each file must stay under the 500 KB of the `check-added-large-files` hook (the largest is about 473 KB): if the hook would refuse one, stop and report, never bypass it; items: R7, FR-043; files: `frontend/src/assets/fonts/` (6 new files), `specs/011-connection-pdf/design-notes.md` (§8.4); gates: Node gates; size: 6 files, 0 screenshots, about 15 tool calls
- [ ] T006 [lead] Checkpoint of the setup: the gates are green with `pdfkit` installed, §8.1 has a row for every name, §8.2 holds D1 and D2, the fonts' hashes are recorded; if T001 found no `verapdf` (or no `java` or `docker` to run it), tell the user now that Phase 8 needs a person with veraPDF 1.28 or PAC 2024 and a screen reader, ask who that is and note the answer in §8.4, so that SC-006 doesn't wait at the end of Phase 8; note the result in design-notes §8.4; items: SC-006 (who checks it); files: `specs/011-connection-pdf/design-notes.md` (§8.4)

**Checkpoint**: the baseline is green and every later task knows spec 009's names, how PDFKit is
typed and the German terms.

### Delegation

- **Wave 1**: T001 [medium].
- **Wave 2**: T002 [lead] (later tasks call spec 009's API by the names it records), then T003
  [lead] (D1 decides whether a second package is declared; D2 fixes terms that three tables use).
- **Wave 3**: T004 [medium] ∥ T005 [medium] (the build files and the font files; no shared file;
  T005's `npm install` runs in `prototype/`, with its own lockfile).
- **Wave 4**: T006 [lead].
- **Needs a person**: PostgreSQL on 5435 with `template_db_test` for the backend gates, if Docker
  isn't reachable from the chat. Network access for `npm install` (PDFKit, the prototype's font
  packages).

---

## Phase 2: User Story 3 — The version in the API (Priority: P2), part 1

**Goal**: `version_fingerprint` on every answer that carries a connection or a draft, computed
from the content in its publishable form, so that a draft published unchanged keeps it (FR-028 to
FR-031). Built before US1 because every page of the PDF and the details page show it.

**Independent Test**: `GET /api/form-connections/{id}` shows `version_fingerprint` matching
`^[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$`; pytest proves that publishing a draft unchanged,
deactivating, activating and `Accept-Language: de` keep it and that each kind of content change
alters it.

- [X] T007 [US3] [xhigh] Compute the version (R6; data-model §1; contracts/api-version.md §2, §3). In `backend/app/services/rules.py` add `publishable_condition(condition)`, the key selection of data-model §1's table without any check: `contains`, `not_contains`, and `equal_to` / `not_equal_to` with a string `value` keep `operator`, `value`, `match_case` as a boolean (`false` when absent); `greater_than`, `less_than`, and `equal_to` / `not_equal_to` with a number `value` (a `bool` is not a number) keep `operator`, `value`; `includes_one_of`, `includes_none_of` keep `operator`, `values` in order; `before`, `after`, `on` keep `operator`, `date`; the three years-ago operators keep `operator`, `years` (a whole float as an int); the two from-now operators keep `operator`, `amount` (a whole float as an int), `unit`; anything else, or no condition, stays as stored. `_clean_condition()` keeps every check and every message it has and returns `publishable_condition()`'s result for the condition it accepted, so the two can't drift; `backend/tests/unit/test_rules_validation.py` and the API rule tests pass unedited. In the new `backend/app/services/versions.py`, `version_fingerprint(...)`: pure, no session, catalog, settings or logging; SHA-256 over one canonical JSON document (keys sorted, separators `,` and `:`, `ensure_ascii=False`, UTF-8) of `id`, `name`, `description` (`''` when none), `documents` (`[{document_type, fields: [key, …]}]`, keys only, the documents in the order they are passed: the team's order of spec 010, as the answer lists them, since the order is content (spec, Clarifications 2026-11-12)) and `branches` (`[{id, name, description, origin, operator, operator_mark, items}]` in stored order; each rule `{type, id, name, mark, target, condition, message}` with `target`'s four keys and `None` as `null`, each group `{type, id, name, mark, operator, message, items}`); left out: `status`, `is_active`, `state`, `start_date`, the status dates, `last_activity`, `example`, every URL, `rule_set_version`, `next_rule_number`, `next_group_number`, `step`, the draft's `version`, `created_at`, `updated_at`, labels, `is_main`; the result is the first 12 hex digits, upper case, as `XXXX-XXXX-XXXX`. Its signature takes plain content, so that T008 can call it with a stored draft's `DraftContent` and with a published revision's documents and snapshot branches alike. `backend/tests/unit/test_versions.py`: the format; a fixed vector for the prototype's sample (`prototype/data.mjs` as a Python fixture), so a change of the canonical form is noticed; one test per kind of element that changes it (the name, the description, a document, a data item, a variant's name, description, origin, AND/OR and its mark, a rule's name, target, condition value, message and mark, the order of two items, the order of two documents, a group's operator and message, the nesting); what doesn't change it (`is_active`, `state`, `start_date`, `example`, URLs, counters, `step`, the save number, times, labels); the publishable form (extra keys, a missing `match_case`, `years: 5.0`, `amount: 2.0` equal the cleaned condition); items: FR-028, FR-029, FR-030, FR-031, SC-004; files: `backend/app/services/versions.py`, `backend/app/services/rules.py`, `backend/tests/unit/test_versions.py`; gates: backend gates; size: 3 files, 0 screenshots, about 60 tool calls
- [X] T008 [US3] [high] Put the version on the answers (contracts/api-version.md §1, §3): `version_fingerprint: str` on `FormConnection` and `FormConnectionDraft` in `backend/app/schemas.py`; `_view()` in `backend/app/services/form_connections.py` and `draft_view()` in `backend/app/services/drafts.py` set it by calling `version_fingerprint()` with the content they already hold, the documents in the order the answer lists them (`ordered_documents()` with the row's `document_order`, spec 010; never the revision's catalog order) (no new query; `FormConnectionSummary` gets nothing). API tests: `DRAFT_KEYS` and the key sets of a published connection and of the approval preview's `draft` and `connection` gain the field; a complete draft published unchanged with `publish_stored_draft()` (as `test_publish_stored_draft_publishes_as_the_editor_does` builds it, plus a condition saved with extra keys and `years: 5.0`) keeps its fingerprint, also when an approval request publishes it; saving a draft unchanged keeps it while its save number grows; deactivating and activating keep it, and so do publishing with a start date and changing or clearing the start date (spec 010); an edit of a rule's message changes it; a save that only reorders the documents changes it, and a draft whose documents aren't in catalog order keeps its fingerprint when published; `Accept-Language: de` gives the same value as English. If publishing changes the value for a reason T007's form doesn't cover (a description stored as `None` on one side and `''` on the other, a different order of a document's fields), fix it in `versions.py` and add the case to `test_versions.py`; items: FR-029, FR-030, FR-031, SC-004, constitution I; depends on T007; files: `backend/app/schemas.py`, `backend/app/services/form_connections.py`, `backend/app/services/drafts.py`, `backend/app/services/versions.py`, `backend/tests/api/test_form_connection_drafts.py`, `backend/tests/api/test_form_connections.py`, `backend/tests/api/test_approval_requests.py`, `backend/tests/unit/test_versions.py`; gates: backend gates; size: 8 files, 0 screenshots, about 60 tool calls
- [X] T009 [P] [US3] [medium] Mirror the field (constitution I): `version_fingerprint: string` on `FormConnection` and `FormConnectionDraft` in `api-types/src/form-connections.ts`, with a doc comment saying it is the "Version" the details page and the PDF show and not the draft's `version` (its save number); give every fixture that builds one of the two shapes a value so that `tsc` passes: `frontend/src/pages/Approval/utils.test.ts`, `frontend/src/pages/FormConnectionEditor/utils.test.ts`, `frontend/src/pages/FormConnectionEdit/utils.test.ts`, `frontend/src/pages/FormConnectionDetail/utils.test.ts`, `mcp/src/views.test.ts`, `mcp/src/draftEdit.test.ts`, `mcp/test/fakeBackend.ts`, `mcp/test/server.test.ts`, and any other place `npm run build` names; no behaviour changes; items: FR-032 (the field the page reads), constitution I; files: `api-types/src/form-connections.ts` and the fixtures above; gates: Node gates; size: about 10 files, 0 screenshots, about 30 tool calls
- [X] T010 [US3] [medium] Show the version to agents (R12; contracts/api-version.md §4): `get_connection` returns `version_fingerprint` for a published connection and a draft (the view in `mcp/src/views.ts` or `mcp/src/tools/read.ts`, wherever it is composed), with a case in `mcp/src/views.test.ts`; in the same change `mcp/plugin/skills/connection-workflow/SKILL.md` says what the version is (a fingerprint of the content, equal content equal version, not a counter, compared with a printout, different from `draft.version`) and `mcp/plugin/skills/publishing-and-live-connections/SKILL.md` says that a draft published unchanged keeps it; no other tool changes and nothing new is logged (`mcp/src/log.ts`); items: R12, US3; depends on T009; files: `mcp/src/views.ts` or `mcp/src/tools/read.ts`, `mcp/src/views.test.ts`, the two `SKILL.md` files; gates: Node gates (`guidance.test.ts` stays green); size: 4 files, 0 screenshots, about 25 tool calls
- [X] T011 [lead] Checkpoint of the version in the API: with the stack running, `curl` a published connection and a draft and see the field in the documented format; the backend and Node gates are green; note the result in design-notes §8.4; items: FR-028, SC-004 (the API's half); files: `specs/011-connection-pdf/design-notes.md` (§8.4)

**Checkpoint**: every answer carries the version; a draft published unchanged keeps it.

### Delegation

- **Wave 1**: batch (T007, T008) [xhigh] (the canonical form is permanent: every printed version
  depends on it, and a later change makes every existing printout look out of date; it also
  touches the function that cleans every published condition, which must not change what
  publishing accepts or stores; T008's publish test is the proof of T007's form, so one agent
  keeps both) ∥ batch (T009, T010) [medium] (the Node packages; no file shared with the backend).
- **Wave 2**: T011 [lead].
- **Needs a person**: PostgreSQL on 5435 for pytest; a running stack for T011's `curl`.

---

## Phase 3: Foundational — the pure core

**Purpose**: everything the PDF needs that knows neither PDFKit nor the browser: the shapes and
texts, the paginator, the URL lines and file name, every publishing problem, the Summary's
counting, the test data, the gaps and the content model. Blocks every later phase. No Figma.

- [X] T012 [high] Write the shapes in `frontend/src/utils/connectionPdf/types.ts`: `ConnectionPdfModel`, `PdfLinks`, `PdfDocument`, `PdfVariant`, `PdfItem`, `PdfRule`, `PdfStatement`, `PdfGroup`, `PdfGap` exactly as data-model §2; `Measure`, `Block`, `PagePlace`, `Page` as data-model §4; `PdfRequest`, `PdfAnswer` as §5; `PdfDownloadState` and its actions as §6; `TextStyle` (a font of the five, a size, a colour, optional strike-through); `BlockContent`, a union with one member per block kind of contracts/pdf-document.md §2 (page 1's title block, the status line, the details table, the note, the gaps heading, a gap, a section heading and lead, a link with its label, the links-to-create box, a document, a variant's header, a rule, a rule's continuation, a group's header, a group's closing message, an AND/OR connector, a placeholder), each holding the texts and flags to draw, never positions; `BlockLayout`, what `layoutOf()` returns (the height and the positioned text runs and shapes, each with its tag or artifact role), so that measuring and drawing share one geometry; and, per D1, `PdfKitDocument` and `PdfKitConstructor`; items: data-model §2, §4–§6, R3, R11; files: `frontend/src/utils/connectionPdf/types.ts`; gates: Node gates; size: 1 file, 0 screenshots, about 30 tool calls
- [X] T013 [P] [medium] Write `frontend/src/utils/connectionPdf/constants.ts`: `PDF_LAYOUT` (contracts/pdf-document.md §1: A4 595.28 × 841.89 pt, side margins 56.69, top 84, bottom 52, the band at y 24 and 38 high, the bottom rule at 841.89 − 52 + 18 with its text 8 pt below; the sizes, gaps and paddings of `prototype/make.mjs`), `PDF_COLOURS` (design-notes §4: every hex with its token's name in a comment, the watermark's 6 %), `PDF_STYLES` (a `TextStyle` per role), `PDF_WATCHDOG_MS = 120_000` (R13), and `PDF_TEXTS = defineTexts(en, de)` with every key of contracts/pdf-document.md §5 in both columns as T003 corrected them (functions for the keys with arguments; singular forms for one document, data item, variant and rule in both languages; the list in `linksToCreate` joined with "and" / "und"); keys the details page already has are not added (the links' lead, "Request link", its explanation, the result link's explanation, "Created when the connection is published and active.", the placeholders, the marks): `constants.ts` re-exports nothing of them; `constants.test.ts`: the WCAG contrast of every text colour on every background it sits on in design-notes §4 is at least 4.5:1 (FR-039), and the body is 481.9 × 705.89 pt; spec 009's `copy.test.ts` must pass for the new table; items: FR-034, FR-039, FR-043, R8; depends on T012; files: `frontend/src/utils/connectionPdf/constants.ts`, `constants.test.ts`; gates: Node gates; size: 2 files, about 45 text keys, 0 screenshots, about 35 tool calls; carried from T002/T003: reuse, don't add, the keys existing tables hold (the statuses from `STATUS_PILL_COPY`, the AND/OR chips and sentences from `CONNECTOR_COPY`, `messageLabel` from `RULE_ROW_COPY`, `section1`, `dataItems` and `contents` from `CONNECTION_DETAIL_COPY`; contracts/pdf-document.md §5 after its table); `DETAIL_COPY` is `CONNECTION_DETAIL_COPY`; a string key whose German equals its English ("Version") needs the word in `copy.test.ts`'s `EQUAL_IN_BOTH_LANGUAGES`, added in this task (design-notes §8.1, §8.2 D2); carried from T012: `TextStyle` holds no line gap, so put the line gap's factor (the prototype's `size * 0.22`) in `PDF_LAYOUT`, for T024's `Measure` and drawing to share
- [X] T014 [P] [high] Port the paginator (R4; data-model §4): `paginate(blocks, pageHeight)` in `frontend/src/utils/connectionPdf/paginate.ts` from `prototype/paginate.mjs`, typed on `Block`: a block is placed whole; a chain (`keepWithNext`) breaks only before its first block, or inside only on a real overflow; at a chain's first block, every unit a block of the chain opens is checked, and a unit that fits a fresh page with the chain leading into it but not the rest of this page moves; a unit taller than a page flows; gaps before a block are dropped at the top of a page; plus `placeLabelOf(page, blocks, texts)`, the bottom's text for a page (FR-021: the section, in section 3 "› Variant <name>", and "(continued)" unless the page's first block opens it; nothing on page 1). `paginate.test.ts` with made-up heights: blocks never split; a chain moves whole; a unit that fits a fresh page moves; **the pinned bug** (a variant moved to the next page takes the section heading chained to it along: the test fails if the unit check runs only for the chain's first block's own units, or if a block inside a chain breaks without an overflow); an oversized unit flows and splits between blocks; an overflow inside a chain breaks there; the dropped gap; the page count; every case of `placeLabelOf`; items: FR-021, FR-023 to FR-027, SC-005; depends on T012; files: `frontend/src/utils/connectionPdf/paginate.ts`, `paginate.test.ts`; gates: Node gates; size: 2 files, about 12 test cases, 0 screenshots, about 40 tool calls; carried from T012: `placeLabelOf()`'s third argument is `PlaceLabelTexts` (`types.ts`), so the paginator doesn't depend on the shape of `PDF_TEXTS`
- [X] T015 [P] [medium] Write the URL lines and the file name. `urlLines(url, width, measure)` in `wrapUrl.ts` (R11, FR-011): lines broken only after a "/", never at a hyphen, the whole URL kept character for character when the lines are joined; a segment wider than the line alone breaks at the line's end. `fileNameOf(model)` in `fileName.ts` (data-model §7, FR-044): `<name>_<version>.pdf`, a draft's `<name>_draft_<version>.pdf`; in the name each of `/ \ : * ? " < > |`, every control character and a leading or trailing dot or space becomes `-`; the name part keeps at most 100 code points, cut at a code point boundary and trimmed of a trailing space, dot or `-`; `_draft_`, the version and `.pdf` are never cut; an empty result reads `connection`. Tests beside each: a UUID's hyphens, a long path, a too-wide segment; every forbidden character, a 200-character name, a name of emoji (code points), an empty name, a draft; items: FR-011, FR-033, FR-044; depends on T012; files: `frontend/src/utils/connectionPdf/wrapUrl.ts`, `wrapUrl.test.ts`, `fileName.ts`, `fileName.test.ts`; gates: Node gates; size: 4 files, 0 screenshots, about 30 tool calls; carried from T012: `urlLines()`' third parameter is a `LineWidth` (`(text) => number`, `types.ts`); its caller passes `(t) => measure.width(t, PDF_STYLES.url)`
- [X] T016 [P] [high] Collect every publishing problem (R10; data-model §3): `publishProblems(branches, context): RulesProblem[]` in `rules/src/validation.ts` beside `firstProblem()`, walking the same checks in the same order but collecting: the number of variants and the main variant (these two end the walk, as nothing below them can be judged); then per variant its own name, description, size and identifiers (one problem per variant), then its items in display order, each item's first problem (name before content, a group before its members), every problem with its `branchIndex`, `itemId` and spec 009's `code`; a name counts as taken for later items whether or not its item had another problem. `firstProblem()` keeps its behaviour and its tests unedited; share helpers, don't rewrite it into `publishProblems()[0]` unless every existing `firstProblem` test still passes unedited. `validation.test.ts`: for every existing `firstProblem` case, `publishProblems(...)[0]` equals it (or both are empty and null); two incomplete rules in two variants give two problems in display order; a rule with a missing name and no check gives one problem (the name); a clean connection gives `[]`; messages stay the server's word for word in both languages; items: FR-010, FR-018; files: `rules/src/validation.ts`, `rules/src/validation.test.ts`; gates: Node gates; size: 2 files, 0 screenshots, about 45 tool calls
- [X] T017 [P] [medium] Move the Summary's counting where the PDF can reach it (data-model §2, FR-008): `frontend/src/utils/connectionSummary.ts` gets `summaryNumbersOf(documents, branches)` (`{ documents, dataItems, variants, rules }`, counted as `summaryCountsOf()` counts today: Standard is a variant, every distinct rule once, groups not at all) and `draftRuleDocumentsOf()`, moved unchanged from `pages/FormConnectionDetail/utils.ts`; `summaryCountsOf()` builds its text from `summaryNumbersOf()`, and the page imports `draftRuleDocumentsOf` from the new module; the existing cases move to `connectionSummary.test.ts` and `pages/FormConnectionDetail/utils.test.ts` keeps passing with the same strings; no text and no count changes; items: FR-008; files: `frontend/src/utils/connectionSummary.ts`, `connectionSummary.test.ts`, `frontend/src/pages/FormConnectionDetail/utils.ts`, `utils.test.ts`, `RulesSummary.tsx` (the import); gates: Node gates; size: 5 files, 0 screenshots, about 25 tool calls
- [X] T018 [P] [high] Write the test data in `frontend/src/utils/connectionPdf/testData.ts` (quickstart §0), as API shapes with real catalog keys and valid conditions: `SAMPLE_PUBLISHED` (A: "Taxi and private hire driver licence" from `prototype/data.mjs`: Personal ID and Driving licence with 12 data items; Standard; Taxi based on Standard with a changed rule, an added rule, a removed rule and an added group; Hire car with its own rules; 12 distinct rules), `SAMPLE_DRAFT_GAPS` (C: the same as a draft, Hire car's rule-11 without a message and rule-12 without a check), `SAMPLE_DRAFT` (D: no gaps), `largestConnection()` (E: 20 variants of 200 rules, groups and sub-groups each, removed ones included, names of 100 and messages of 500 characters, one nationality rule with all 249 countries inside a sub-group; `prototype/spike/src/pdf/big.js` shows the shape), the context they need (`SAMPLE_OPTION_SETS`, `SAMPLE_DOCUMENT_TYPES` in English and German) and `SEED_BODIES` (the create bodies of A, C, D and E for `POST /api/form-connections` and `POST /api/form-connections/drafts`; B is A deactivated; F is A published with a `start_date` some days ahead, spec 010's scheduled state). The based variants must satisfy the server's invariants for marks and inherited items (`backend/app/services/rules.py`; `rules/src/branches.ts`). `testData.test.ts`: `firstProblem()` is null for A, D and E; `publishProblems()` gives exactly the two gaps of C; `summaryNumbersOf()` gives 2, 12, 3, 12 for A; E has 20 variants of 200 items; no fixture holds a finding, a persona or citizen data; items: FR-045, SC-002, FR-041; depends on T016, T017 (their functions in its test); files: `frontend/src/utils/connectionPdf/testData.ts`, `testData.test.ts`; gates: Node gates; size: 2 files, 5 connections, 0 screenshots, about 60 tool calls; carried from T007: `backend/tests/unit/test_versions.py` already holds A as a Python fixture with real catalog keys (birth_date → `birthdate`, nationality → `nationalities`, address → `address_country`, resident_city → `address_locality`; rule-6 as `equal_to 'Stuttgart'`, rule-12 as `after 2026-11-09`; every member of the added group-2 marked `added`) and ids (connection `3f9a1c2e-7b4d-4c1a-9e2f-5d8b6a0c4e71`, Standard `5d0b8f6e-2c4a-4e1b-9f3d-7a6c5b4e3d2c`, Taxi `0c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f`, Hire car `9e8d7c6b-5a49-4382-a716-05f4e3d2c1b0`); reuse that mapping and those ids so that A is the same connection on both sides, and give `SAMPLE_PUBLISHED.version_fingerprint` the backend's value for it, `FA7E-47BB-5368`
- [X] T019 [high] Write the gaps (R10; data-model §3; FR-010, FR-018): in `frontend/src/utils/connectionPdf/gaps.ts`, `gapsOf(draft, context, language): PdfGap[]`: first the connection's own, in the create flow's words taken from the editor's tables (§8.1): no name, a name or description too long, no documents, each document without data items ("<document>: Choose at least one data item, or remove this document."); then every problem of `publishProblems()` in its order, in the server's words in the language, naming its rule and variant; and `missingOf(problem, language): string | null`, the short instruction for a rule's "Not complete:" line: the problem's `code` mapped to the create flow's instruction with a capital letter ("Choose a check.", "Choose the data to check.", "Write the message for citizens.", …, one entry per code a rule can have, checked exhaustively by the compiler), and null when the rule's only problem is its name. No rule check's finding ever enters (FR-041). `gaps.test.ts`: each kind of gap, the order, none, both languages, the exhaustive mapping; items: FR-010, FR-018, FR-041; depends on T013, T016, T018; files: `frontend/src/utils/connectionPdf/gaps.ts`, `gaps.test.ts`; gates: Node gates; size: 2 files, 0 screenshots, about 45 tool calls; carried from T002: "Add at least one document." exists only in the server's `clean_documents()` (German "Fügen Sie mindestens ein Dokument hinzu."), so it needs a key with both columns; the other two are `VALIDATION_MESSAGES.nameRequired` and `DOCUMENTS_COPY.needsDataLine` (design-notes §8.1); carried from T016: after a variant's own problem `publishProblems()` still lists its items' problems, so a variant without a name gives item messages that name an empty variant ("… in : …"); decide how `gapsOf()` words them, the smallest reasonable choice, marked UNCERTAIN
- [X] T020 [high] Build the content model (R3, R9; data-model §2): `connectionPdfModelOf(connection, context, { language, now })` in `frontend/src/utils/connectionPdf/model.ts`, pure, never throwing on incomplete content: `kind` and `status` from the answer (a published connection's `state`, spec 010: `scheduled`, `live` as "active", `deactivated`) and `startDate` from a scheduled connection's `start_date` as "dd.mm.yyyy" (`null` otherwise; FR-035); `name` and `description` as entered (`null` when empty); `version` from `version_fingerprint`; `generatedAt` and a draft's `lastSaved` (`updated_at` and the save number) as "dd.mm.yyyy, hh:mm" through `Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', hourCycle: 'h23', … })` in both languages (FR-035); `counts` from `summaryNumbersOf()`; `links` for a published connection (`trigger_url`, each variant's `pull_url` in the details' order) and `null` for a draft, whose `linksToCreate` are the variants' names; no URL of any kind in a draft's model (FR-013); `documents` with the answer's labels or the keys the catalog no longer has; `variants` in order with `operatorChanged` from the operator's mark; items through `shownItems(items, based)` with `mark`, `faded` (removed, or inside a removed or dissolved group) and dissolved groups as `SummaryBranch` and `SummaryItem` show them; `statement` from `statementPartsOf(rule, context)` in the language, with `values` kept apart and `null` when the target can't be resolved; a draft's `gaps` from `gapsOf()` and each rule's `missing` from `missingOf()`. `model.test.ts`: A, C and D in English; F's `status` and `startDate`; the documents in the answer's order; a rule's joined statement equals `statementOf(rule, context).text` when the condition is complete; a draft's model, serialised, contains no "http"; counts equal the Summary's; marks, faded and dissolved items; empty parts; a document missing from the catalog; a time just before and after midnight and across the daylight-saving change in Berlin; the model survives `structuredClone` unchanged; items: FR-005 (content as fetched), FR-007, FR-008, FR-013 to FR-019, FR-034, FR-035, FR-041; depends on T017, T018, T019; files: `frontend/src/utils/connectionPdf/model.ts`, `model.test.ts`; gates: Node gates; size: 2 files, 3 connections, 0 screenshots, about 70 tool calls; carried from T018: B and F have no fixtures of their own: build F as `{ ...SAMPLE_PUBLISHED, state: 'scheduled', is_active: false, start_date, activated_at: null }` and B with `state: 'deactivated'`; the statements' rule context follows the details page (a published connection's `ruleDocumentsOf(answer.documents)`, a draft's `draftRuleDocumentsOf(answer.documents, documentTypes)`, plus the option sets and the language), while `sampleRuleContext()` is validation's context
- [X] T021 [lead] Checkpoint of the core: the Node gates are green; `copy.test.ts` covers `PDF_TEXTS`; no `console.*` and no browser API in `utils/connectionPdf/`; note the test counts in design-notes §8.4; files: `specs/011-connection-pdf/design-notes.md` (§8.4)

**Checkpoint**: the model of any connection or draft exists in both languages, and pages can be
planned from heights alone.

### Delegation

- **Wave 1**: T012 [high] ∥ T016 [high] ∥ T017 [medium] (`utils/connectionPdf/types.ts`,
  `rules/src/`, the details page's utilities; no shared file).
- **Wave 2**: T013 [medium] ∥ T014 [high] ∥ T015 [medium] ∥ T018 [high] (each its own files in
  `utils/connectionPdf/`; all read `types.ts`, none edits it).
- **Wave 3**: T019 [high].
- **Wave 4**: T020 [high].
- **Wave 5**: T021 [lead].
- **Needs a person**: nothing.

---

## Phase 4: User Story 1 — A published connection's PDF, the document (Priority: P1) 🎯 MVP, part 1

**Goal**: the model of a published connection becomes a tagged A4 PDF with page 1, the three
sections, the band and the bottom of every page, in Node (FR-007 to FR-009, FR-011, FR-012,
FR-014 to FR-017, FR-019 to FR-021, FR-023 to FR-027, FR-036 to FR-038, FR-043).

**Independent Test**: `render.test.ts` renders sample A with PDFKit's Node build: `/Lang`,
`/StructTreeRoot`, `/MarkInfo`, `/DisplayDocTitle true`, `/Outlines`, `pdfuaid:part`, no `/CIDSet`;
every page carries the connection ID, "Version …" and "Page n of N"; the pages match the agreed
`prototype/published-ids-top.pdf` apart from design-notes §5.

- [X] T022 [US1] [high] Build the blocks of page 1 and of sections 1 and 2 in `frontend/src/utils/connectionPdf/blocks.ts` (contracts/pdf-document.md §2, §3; R11): `layoutOf(content, measure)` for each of these kinds (the one place that computes geometry) and `blocksOf(model, measure): Block[]` assembling them in reading order: the eyebrow (capitals, no letter spacing), the name, the description when there is one, the status line ("Active" or "Deactivated" with "as of <generated>"; "Scheduled" with "as of <generated> · starts on <start date>"), the details table (Connection ID, Version, Generated "(Germany)", Contents with the Summary's count text), the note of FR-009; "1 Links for your service" with its lead, a deactivated connection's "unavailable" sentence and a scheduled connection's sentence with its start date (FR-012), "Request link" with its explanation and URL, "Result links" with their explanation and the {reference} sentence, then "Variant · <name>" and its URL per variant, each label and URL one block, the URLs cut by `urlLines()`, the result links one unit (FR-026); "2 Documents and data items" with its lead and one block per document (its name, "<n> data items", the items in two columns, left column first), with the placeholders; every heading `keepWithNext`; each block's `place`, `startsUnits`, `unitOf` and `bookmark` (the three sections). Section 3 is a call to a function that T023 fills (it returns `[]` here). `blocks.test.ts` with a stub `Measure` (width = characters × a constant): the order of kinds for A, B and F; a heading is never the last of a chain; a link's label and URL share a block; twenty result links form one unit of twenty blocks; a document with no data items shows the placeholder; items: FR-007, FR-008, FR-009, FR-011, FR-012, FR-014, FR-023, FR-024, FR-026; files: `frontend/src/utils/connectionPdf/blocks.ts`, `blocks.test.ts`; gates: Node gates; size: 2 files, about 10 block kinds, 0 screenshots, about 70 tool calls
- [X] T023 [P] [US1] [high] Build the blocks of section 3 in `frontend/src/utils/connectionPdf/blocks.ts` (contracts/pdf-document.md §2 "3 Rules per variant", §3; R11): the section's heading and lead; per variant a unit: its header (name, origin badge, description, the AND/OR in words, "Changed here" when switched) chained to its first item; a rule block (identifier and name as one heading at level 4, 5 or 6 by depth, the mark badge, the statement with its values as chips, "Message for citizens: <message>"); a group's header chained to its first member, its members one level deeper, its own message as a closing block chained from its last member, the group a unit; the AND/OR connector chained to the item after it; removed items and the members of a removed or dissolved group faded and struck through with "Removed here" in words (FR-017); "No rules. Anyone who shares the requested documents can apply." for an empty variant; each variant's bookmark at level 2 and its `place` (`opens: 'variant'`); **a rule taller than the page body** (FR-027) cut into a head block and continuation blocks of the remaining values and then the message, at value boundaries, each at most a page tall. `blocks.test.ts` gains: the nesting levels; the chains of FR-023; a faded group's members; the tall rule (all 249 countries in a sub-group with a 100-character name and a 500-character message) gives blocks none taller than the body and all values in order; and, for `largestConnection()` with the stub measure, `paginate()`'s pages obey SC-005 (no page ends with a heading, a group's header shares a page with its first member, a connector with the item after it, every page after a variant's first names the variant with "(continued)"); items: FR-015, FR-016, FR-017, FR-019, FR-023, FR-024, FR-025, FR-027, FR-045, SC-005; depends on T022; files: `frontend/src/utils/connectionPdf/blocks.ts`, `blocks.test.ts`; gates: Node gates; size: 2 files, about 7 block kinds, 0 screenshots, about 80 tool calls; carried from T013: `PDF_STYLES` has no style for a value chip (the prototype draws the statement as plain text); if the chips get a style of their own, add it (e.g. `statementValue`) to `PDF_STYLES` in `constants.ts` with its contrast pair in `constants.test.ts`
- [X] T024 [P] [US1] [high] Draw the document in `frontend/src/utils/connectionPdf/render.ts` (contracts/pdf-worker.md §3, §4; contracts/pdf-document.md §1, §4; R5, R14): `renderConnectionPdf(model, { PDFDocument, fonts, measure? })` creates the document (A4, PDF 1.7, `tagged: true`, `subset: 'PDF/UA'`, `displayTitle: true`, `font: null`, `lang` `en-GB` or `de-DE`, the properties of §4: `Title` "<name> – Connection details", `Subject` "Connection <id>, version <version>", `Keywords`, `Author` and `Creator` "Konnekt", no custom keys), registers the five fonts, builds the `Measure` from `heightOfString` and `widthOfString` with the options the drawing uses, calls `blocksOf()` and `paginate()`, and draws page by page: each block through its `layoutOf()` result, inside the structure tree (`Document` › a `Sect` per part › `H1`–`H6`, `P`, `L`/`LI`/`LBody`, `Table`/`TR`/`TH` with `scope: Row`/`TD`, `Div`, `Span`), every shape, bullet, pill, chip and frame as an artifact; the band of every page (the name on one line cut with "…", "Connection ID <id>", "Version <version>", "Generated <date>") and the bottom (`placeLabelOf()` from page 2, "Page n of N" on every page) as `Pagination` artifacts; the outline from the blocks' bookmarks (FR-038); and, before `end()`, `withoutCidSet(doc)`, the one function that touches PDFKit's private `_fontFamilies` (R5; `prototype/spike/src/pdf/render.js` shows it). This task draws the kinds of T022; section 3's kinds are T025's. `render.test.ts` (PDFKit's Node build, the TTFs read with `node:fs`, `compress: false`): for A in English the raw bytes hold `/Lang`, `/StructTreeRoot`, `/MarkInfo`, `/DisplayDocTitle true`, `/Outlines` and `pdfuaid:part` and no `/CIDSet`; through a thin recording wrapper around the document, exported for the sweeps as `recordingDocument()`, every page's drawn text holds the connection ID, "Version <version>" and "Page n of N", and no text is drawn outside a tag or an artifact; for A given a 100-character name, the band records the name on one line, ending in "…" and no wider than its box, while page 1's `H1` and the `Title` property hold it in full (FR-020, the spec's edge case); items: FR-020, FR-021, FR-033, FR-036, FR-037, FR-038, FR-040, FR-043, SC-003; depends on T022; files: `frontend/src/utils/connectionPdf/render.ts`, `render.test.ts`; gates: Node gates; size: 2 files, 0 screenshots, about 90 tool calls; carried from T012: the line gap is `PDF_LAYOUT`'s factor (T013), not part of `TextStyle`, and the `Measure` and the drawing both use it; a `PlacedRect` with `joinsAbove` is extended upward by its block's `gapBefore` when the block isn't the first on its page; carried from T013: `PDF_TEXTS` has no key for `Subject` and `Keywords`: build them as contracts/pdf-document.md §4 words them ("Connection <id>, version <version>", "connection <id>; version <version>[; draft]"), the same in both languages, since T039 reads "version <version>" from them
- [X] T025 [US1] [high] Draw section 3 in `frontend/src/utils/connectionPdf/render.ts`: a `Sect` per variant; the variant's header (`H3`, the origin badge, the AND/OR in words); a rule (its heading at the block's level holding identifier and name, the mark badge's word as text and its shape as an artifact, the statement, the chips' frames as artifacts and their texts as text, the message); a group's header, members and closing message; the AND/OR chips as artifacts; struck-through and muted text for faded items (the strike line an artifact); a rule's continuation blocks. `render.test.ts` gains: A's recorded text holds "Changed here", "Added here" and "Removed here" and each rule's identifier in the Summary's order; `largestConnection()` renders (it took 2.5 s in the spike), every one of its pages carries the ID, the version and "Page n of N", and from page 2 on a place label; items: FR-015, FR-016, FR-017, FR-027, FR-045, SC-002, SC-003; depends on T023, T024; files: `frontend/src/utils/connectionPdf/render.ts`, `render.test.ts`; gates: Node gates; size: 2 files, 0 screenshots, about 70 tool calls; carried from T012: PDFKit's `strike` option draws the line inside the tagged content, while this line asks for an artifact: draw `PlacedLine` artifacts where `layoutOf()` knows the line (one-line texts), or accept PDFKit's strike; choose, and record the choice in design-notes §8.2; carried from T024: the strike is either `strike: style.strike` in `render.ts`'s `textOptionsOf()` or `PlacedLine` parts (`artifact: 'Layout'`) in `layoutOf()`, which draw as they are; T023 gives every one-line struck text its measured `width` and only flags wrapped ones; `render.test.ts` names Node's types with `/// <reference types="node" />`, which puts Node's globals into the whole app program (`tsconfig.app.json` types only `vite/client`): load the fonts without it (e.g. `import.meta.glob` with `query: '?inline'`, decoded with `atob`) and remove the reference, or report why it must stay
- [X] T026 [US1] [high] Compare the published sample with the agreed layout (design-notes §5, §6; quickstart §2 step 4), script-first: a Node script in the scratchpad renders A in English through `recordingDocument()` and, from a scratchpad copy of `prototype/make.mjs` wrapped the same way (after `npm install` in `prototype/`; the copy is never committed), the prototype's `published-ids-top.pdf`; it writes a CSV with one row per page and text (page, text, x, y, size, font, colour) for both and a grouped summary: texts only in one, texts on a different page, positions more than 1 pt apart, each row marked "intended" when design-notes §5 explains it (colours, the eyebrow's spacing, the links' explanations, the outline, the properties) and "unsure" otherwise. The agent reads the summary and opens page images (the Firefox viewer) only for pages with unsure or failing rows. New here: all 6 pages; nothing was verified earlier. This sweep runs alone and owns its fixes, in `blocks.ts`, `render.ts` and `constants.ts`; the summary goes to design-notes §7.3; items: FR-007 to FR-021, SC-002; depends on T025; files: `frontend/src/utils/connectionPdf/blocks.ts`, `render.ts`, `constants.ts` (fixes), `specs/011-connection-pdf/design-notes.md` (§7.3); gates: Node gates; size: 6 pages × 2 files, at most 12 page images, about 80 tool calls; carried from T023: two numbers differ from the prototype by design of the layout, check whether they are intended: a rule card is about 0.9 pt taller (the statement's words are centred on the chips' line) and the AND/OR connector is 14.05 pt high instead of 14 (its word's line gap); carried from T025: a removed or dissolved group's "Group · <AND/OR in words>" line is drawn in `groupCombines`' accent colour, neither muted nor struck, while contract §2 and FR-017 want removed items muted and struck (E has 98 faded groups): fix it in `blocks.ts`/`constants.ts`; carried from T025: the spaces in the tagged text: a variant's H3 reads "Variant  Standard" and the section headings "3  Rules per variant" (two spaces, `wordSeparator`), and a rule's or group's heading reads "rule-1Minimum age" (identifier and name are two marked contents with no space), where contract §4 and R5 want "rule-7 Minimum age": make the extracted text read with one space without moving what is drawn, and add a test in `render.test.ts`
- [ ] T027 [lead] Checkpoint of the document: `render.test.ts` is green for A and E; §7.3 has no unsure row; open the PDF of A once in a reader or the Firefox viewer and read page 1; note the result in design-notes §8.4; items: SC-002, SC-003, SC-005; files: `specs/011-connection-pdf/design-notes.md` (§8.4)

**Checkpoint**: a published connection's PDF exists in Node, tagged, with every page traceable.

### Delegation

- **Wave 1**: T022 [high].
- **Wave 2**: T023 [high] ∥ T024 [high] (`blocks.ts` and `render.ts`; T024 draws only T022's
  kinds and reads `blocks.ts` without editing it).
- **Wave 3**: T025 [high].
- **Wave 4**: T026 [high] (alone, so it may fix the three files).
- **Wave 5**: T027 [lead].
- **Needs a person**: network access for `npm install` in `prototype/` (T026), unless T005 left
  it installed. T027's look at the PDF in a real reader, once.

---

## Phase 5: User Story 1 — The download on the details page (Priority: P1) 🎯 MVP, part 2

**Goal**: "Download PDF" and the version in the Summary card's header; one activation fetches the
connection as stored, builds the model, has the worker draw and saves the file; busy, failed and
gone states (FR-001 to FR-006, FR-032, FR-044, SC-001).

**Independent Test**: on A's and B's details, in Chromium and Firefox, one click saves
"<name>_<version>.pdf" within 3 s with no dialog; the button is busy meanwhile and a double click
gives one file; offline gives the alert with "Try again" and no file; the header matches Figma
`6396:48196` and `6809:46423` (design-notes §7.1).

- [ ] T028 [P] [US1] [medium] Seed the test connections: `specs/011-connection-pdf/prototype/seed.ts`, run with `npx vite-node`, signs in with the README's test account, posts `SEED_BODIES` (T018) to the running backend and prints the ids: A published and active; B a second copy of A, then `POST /{id}/deactivate`; C and D as drafts; E published. It reads the base URL and the credentials from its arguments, holds no secret, and is not shipped (it lives in the sketch folder). Write the ids into design-notes §8.3. If the backend refuses E (a limit, or EUDIPLO's setup for 20 variants), keep E as a draft, say so in §8.3 and report it UNCERTAIN; items: quickstart §0, FR-045; files: `specs/011-connection-pdf/prototype/seed.ts`, `specs/011-connection-pdf/design-notes.md` (§8.3); gates: none (a sketch-folder script); size: 5 connections, 0 screenshots, about 25 tool calls; carried from T018: E's create body is about 1.56 MB, above nginx's default `client_max_body_size` of 1 MB (`frontend/nginx.conf` sets none), so post to the backend directly (port 3000) or through Vite's dev proxy, never through nginx
- [ ] T029 [P] [US1] [high] Write the worker (R2; contracts/pdf-worker.md §3): `frontend/src/workers/pdf.ts`, a module worker with its own typed scope as `checks.ts` has (`interface PdfWorkerScope`); on its first `{ type: 'render', runId, model }` it loads, with dynamic `import()`, PDFKit's browser build and `frontend/src/workers/pdfFonts.ts` (the five TTFs' `?url` imports), fetches the fonts as `ArrayBuffer`s, and keeps both for later messages; it runs `renderConnectionPdf(model, { PDFDocument, fonts })`, collects the document's `data` chunks until `end`, and posts `{ type: 'rendered', runId, bytes }` with the buffer in the transfer list; any exception of a run answers `{ type: 'failed', runId }` with no reason; no state between runs but the loaded modules and fonts, no `console.*`, no request but the fonts'. Check in the build output that PDFKit and the fonts are in chunks and assets of their own and that the main entry has grown by no more than a few KB against T001's size; items: FR-003, FR-042, SC-001, R2, R7; files: `frontend/src/workers/pdf.ts`, `frontend/src/workers/pdfFonts.ts`; gates: Node gates; size: 2 files, 0 screenshots, about 40 tool calls; carried from T024: `renderConnectionPdf()` returns `Promise<Uint8Array>` (its `data`/`end`/`error` listeners are attached before drawing; a drawing exception rejects it), so the worker awaits the bytes and transfers their buffer instead of collecting chunks
- [ ] T030 [P] [US1] [high] Write the hook (R9, R13; contracts/pdf-worker.md §2; data-model §6): the reducer `pdfDownloadReducer` with its initial state in `frontend/src/hooks/utils.ts` (`idle`, `fetching`, `rendering`, `failed` with its notice; a `start` while `fetching` or `rendering` changes nothing) and its cases in `frontend/src/hooks/utils.test.ts`; `frontend/src/hooks/useConnectionPdf.ts` with `useConnectionPdf({ id, onFetched, onGone })` returning `{ state, download }`. `download()`: captures the language and `new Date()`; fetches `getFormConnection(id, { language })`: a 401 signs out (`useSignOutOnUnauthorized`), a 404 calls `onGone()`, another failure is `failed` with `errorNoticeOf(error, <the copy's pdfFailedText>)`, success calls `onFetched(connection)`; takes the option sets and, for a draft, the catalog in the captured language from spec 009's caches (their failure fails the run); builds the model; posts it to the worker, created on first use inside a try/catch with `new Worker(new URL('../workers/pdf.ts', import.meta.url), { type: 'module' })` and kept for later runs; a watchdog of `PDF_WATCHDOG_MS` fails a run that never answers; on `rendered` for the current `runId` saves the file (`new Blob([bytes], { type: 'application/pdf' })`, `URL.createObjectURL`, a detached anchor with `download = fileNameOf(model)` clicked, `URL.revokeObjectURL` in a later task, since Firefox can lose a download revoked in the same task) and returns to `idle`; on `failed`, `error`, `messageerror` or the watchdog: `failed`, the worker terminated, no file. The effect's cleanup terminates the worker and sets the ignore flag, so a late fetch or answer does nothing. `useFormConnection`'s `replace` takes a draft too (`frontend/src/hooks/useFormConnection.ts`; `formConnectionReducer` already stores what it is given: check, and add a case). The hook's state also carries what the live region says ("Creating the PDF…", "PDF saved."); items: FR-002, FR-003, FR-004, FR-005, FR-034 (the language captured), FR-042, FR-044; files: `frontend/src/hooks/useConnectionPdf.ts`, `frontend/src/hooks/useFormConnection.ts`, `frontend/src/hooks/utils.ts`, `frontend/src/hooks/utils.test.ts`, `frontend/src/hooks/types.ts`; gates: Node gates; size: 5 files, 4 states, 0 screenshots, about 60 tool calls; carried from T002: `getFormConnection(id)` takes no options yet: add the optional `language`; `useOptionSets()` and `useDocumentTypes()` keep their per-language lists in their own reducers and show the other language's list until the current one's arrives, so take the list cached for the captured language (widen the hooks to expose it) and fetch only what isn't cached (design-notes §8.1); carried from T020: `connectionPdfModelOf(connection, context, { language, now })` takes `PdfModelContext` `{ optionSets: OptionSet[]; documentTypes: DocumentType[] | null }` in the captured language (`documentTypes` is read only for a draft; without it a draft's gaps fall back to the answer's documents)
- [ ] T031 [US1] [high] Build the button and the version in the Summary card's header (design-notes §1–§3; `docs/FIGMA-WORKFLOW.md` §1–§3 with the `figma-node-finder` agent; file `s8mU9oJDq3411e8bxMjQO9`, nodes `6396:48196` and `6809:46423`, the draft's details U93 #10): `DetailAccordion` gets an optional `actions` slot between the heading block and the toggle (`DetailAccordionProps` in `types.ts`); `PdfDownload.tsx` renders, in this order, "Version <code>" as plain text (the label small and muted, the code medium weight with `tabular-nums`, one line that never breaks inside the code) and the secondary button of regular size with the download glyph, the asset `get_design_context` returns for `6396:48196` saved under `frontend/src/assets/icons/` (KERN's `kern-icon` classes only if it is KERN's own); busy: the label "Creating PDF…", the glyph kept, `aria-disabled="true"`, clicks ignored (the pattern of `ConfirmDialog`'s busy button); failed: a KERN danger alert inside the card under the header row, full width, open or closed, with the title, `ErrorNoticeText`'s text and a secondary "Try again" (`DETAIL_COPY.retry`) that starts a new run, gone when a run starts; the announcements through the details' existing live region (§8.1); new keys in `DETAIL_COPY` in both columns (`downloadPdf`, `creatingPdf`, `creatingPdfAnnouncement`, `pdfSaved`, `pdfFailedTitle`, `pdfFailedText`, `version(code)`; German from design-notes §3 as T003 left it); `RulesSummary` passes `PdfDownload` as `actions` only when its new optional props (the id, the version, `onFetched`, `onGone`) are given, which `ConnectionDetails.tsx` does in full and the approval page's `PublishSummary` does not (FR-006); `DraftDetails.tsx` passes the version only, so a draft's details show "Version …" (FR-032) and no button until T036 has drawn the draft's kinds and turns it on; `index.tsx` wires `onFetched` to `replace` (a draft published meanwhile then shows the published details) and `onGone` to the not-found state; the comment in `RulesSummary.tsx` that says the PDF isn't built (F53) is corrected; narrow (`narrow:` variant, 320 px at 200 %): the slot moves under the heading as its own row, the toggle stays last, nothing overlaps, the button keeps its label and 48 px; Tailwind classes only, `focus-visible:` only, one `h1` as before; items: FR-001, FR-003, FR-004, FR-005, FR-006, FR-032; depends on T030; files: `frontend/src/pages/FormConnectionDetail/{PdfDownload.tsx,DetailAccordion.tsx,RulesSummary.tsx,ConnectionDetails.tsx,DraftDetails.tsx,index.tsx,constants.ts,types.ts}`, `frontend/src/assets/icons/download-*.svg`, `frontend/src/hooks/utils.ts` (only if the page's reducer needs a "gone" action); gates: Node gates; size: 2 Figma nodes, 3 screens (A, B, C), about 6 screenshots, about 90 tool calls; carried from T002: the details page has no shared live region (each `CopyableUrl` has its own `role="status"`), so `PdfDownload` gets its own polite region, present from mount; `DETAIL_COPY` is `CONNECTION_DETAIL_COPY` (design-notes §3, §8.1)
- [ ] T032 [US1] [high] Run the per-node loop on the header (`docs/FIGMA-WORKFLOW.md` §4; design-notes §6): `npm run dev -w frontend` against the seeded stack; for `6396:48196` and `6809:46423` at 1440 px, on A with the Summary open and closed and on C (the version alone until T036): the font check, the numeric check with `getBoundingClientRect` and `getComputedStyle` against `get_design_context` (the button 48 px high with its border, label and glyph colours, the gap between the version, the button and the toggle, the vertical centring in the row), the screenshot comparison; the narrow check at 320 px / 200 % on A; one row per node × state in design-notes §7.1 with the version's placement listed as a deviation the designer hasn't drawn (design-notes §2); fix what fails in T031's files; items: FR-001, FR-032; depends on T031; files: T031's files (fixes), `specs/011-connection-pdf/design-notes.md` (§7.1); gates: Node gates; size: 2 nodes × 4 states, about 10 screenshots, about 60 tool calls
- [ ] T033 [US1] [high] Verify the run in both browsers (quickstart §2 steps 1, 2, 6, 8; §5 step 5), script-first: one `browser_run_code_unsafe` script per browser (Chromium, Firefox) drives A and B and writes a CSV with a grouped summary: the click to the `download` event in ms (5 runs each; SC-001: under 3 s), the suggested file name against `fileNameOf`, the button's label and `aria-disabled` while busy, the live region's two texts, a double click giving one download, the requests made during a run (exactly `GET /api/form-connections/{id}`, plus the option sets and catalog when cold, the worker's chunk and the fonts on the first run only), console messages (none), the focus staying on the button, Tab reaching it after the counts and Enter and Space starting a run, offline (the alert with "Try again", no download; online again and "Try again" saves the file), and the longest gap between 50 ms timer ticks on the page during a run. New here: every one of these states; §7.1 covered only the idle layout. This sweep runs alone and owns its fixes, in the hook, the worker and `PdfDownload.tsx`; the summary goes to design-notes §7.2; items: FR-002, FR-003, FR-004, FR-042, FR-044, SC-001 (the sample), SC-008 (the requests); depends on T029, T032; files: `frontend/src/hooks/useConnectionPdf.ts`, `frontend/src/workers/pdf.ts`, `frontend/src/pages/FormConnectionDetail/PdfDownload.tsx` (fixes), `specs/011-connection-pdf/design-notes.md` (§7.2); gates: Node gates; size: about 14 states × 2 browsers, at most 6 screenshots, about 80 tool calls
- [ ] T034 [lead] Checkpoint of US1: download A's PDF from the page and read it against quickstart §2 steps 3, 5 and 6; §7.1 and §7.2 have no open row; note the result in design-notes §8.4; **stop and validate the MVP with the user**; items: SC-001, SC-002, SC-003; files: `specs/011-connection-pdf/design-notes.md` (§8.4)

**Checkpoint**: US1 is complete: a team member downloads a published connection's PDF from its
details.

### Delegation

- **Wave 1**: T028 [medium] ∥ T029 [high] ∥ T030 [high] (the sketch folder, `workers/`,
  `hooks/`; no shared file).
- **Wave 2**: batch (T031, T032) [high] (one agent reads the two Figma nodes once and fixes the
  build it just made).
- **Wave 3**: T033 [high] (alone, so it may fix the hook, the worker and the button).
- **Wave 4**: T034 [lead].
- **Needs a person**: the stack running with PostgreSQL and EUDIPLO for T028 (publishing A, B
  and E sets them up there). T032's 200 % zoom confirmed once with the browser's own zoom. T033:
  if headless Chromium can't start from the chat (the spike's sandbox couldn't), a person runs
  the script's page in a real browser. T034: the user looks at the MVP.

---

## Phase 6: User Story 2 — Share a draft for review (Priority: P2)

**Goal**: a stored draft's PDF: "Draft for review", "Draft · Not live" on every page, the faint
"DRAFT" watermark, no URL anywhere, the links publishing will create, the "To finish before
publishing (n)" box and each incomplete rule's "Not complete: …" (FR-007 to FR-010, FR-013,
FR-018, FR-020, FR-022, FR-044).

**Independent Test**: C's PDF is named "<name>_draft_<version>.pdf", holds no "http" on any page,
lists both gaps on page 1 and ends the two rules with "Not complete: …"; D's has no box; both
match `prototype/draft-ids-top.pdf` apart from design-notes §5.

- [ ] T035 [US2] [high] Add the draft's blocks to `frontend/src/utils/connectionPdf/blocks.ts` (contracts/pdf-document.md §2): the eyebrow "Connection details · Draft for review"; the status "Draft" with "Not live yet"; the details table's "Last saved" row ("<date> (draft save <n>)") after the version; the draft's note (FR-009); the gaps box when `gaps` isn't empty: its heading "To finish before publishing (n)" and its sentence chained to the first gap, then one block per gap (a list item), so that hundreds of gaps continue on later pages, with no `place` section and no bookmark; in section 1 the dashed box with "Created when the connection is published and active." and "There will be one request link for all variants, and a result link for each variant: …" in place of every link; in section 2 "No documents yet" and "No data chosen yet"; in section 3 a rule's "Not complete: <missing>" line after what the rule has, a statement shown as far as it goes (`words` or `values` missing). `blocks.test.ts` gains: C's order of kinds; no block of a draft holds a URL; no gaps box for D; 300 gaps paginate with the heading on the first gap's page; the "Not complete" line for each kind of `missing`; items: FR-007, FR-008, FR-009, FR-010, FR-013, FR-014, FR-018, FR-019; files: `frontend/src/utils/connectionPdf/blocks.ts`, `blocks.test.ts`; gates: Node gates; size: 2 files, about 6 block kinds, 0 screenshots, about 60 tool calls; carried from T014: `placeLabelOf()` gives a page whose first block has no section (the gaps: `section: null`) no place label, as FR-021 names only the sections; decide whether a page that begins inside a long gaps list reads "To finish before publishing (continued)", the smallest reasonable choice, marked UNCERTAIN; carried from T023: `ruleBlocksOf()` sets `RuleContent.missing` to `null` and `layoutOf()` doesn't lay it out; the "Not complete" line (and an incomplete rule's dashed frame) must go into a cut rule's last piece with the message (`rulePiecesOf()` moves only the message today)
- [ ] T036 [US2] [high] Draw the draft in `frontend/src/utils/connectionPdf/render.ts`: T035's kinds (the gaps box an `H2` with its sentence and an `L` of `LI`/`LBody`; the dashed frame an artifact); the "Draft · Not live" pill in the band left of the version (white on `#05669E`, a `Pagination` artifact like the band); the watermark on every page ("DRAFT" / "ENTWURF", rotated −38°, 150 pt SemiBold, the draft blue at 6 % opacity, centred, drawn last, an artifact); the title "Draft – <name> – Connection details" and "; draft" in the keywords; then turn the button on for a draft: `DraftDetails.tsx` passes the id, `onFetched` and `onGone` as `ConnectionDetails.tsx` does (FR-001, the draft's details U93 #10). `render.test.ts` gains, for C and D in English: no recorded text of any page contains "http" or the backend's `/api/connect` path; every page records the watermark and the band's pill as artifacts; page 1 of C lists two gaps and D has no gaps heading; the two rules' "Not complete: …" lines; the same PDF/UA checks as A; items: FR-001, FR-013, FR-020, FR-022, FR-036, FR-037, SC-002; depends on T035; files: `frontend/src/utils/connectionPdf/render.ts`, `render.test.ts`, `frontend/src/pages/FormConnectionDetail/DraftDetails.tsx`; gates: Node gates; size: 3 files, 0 screenshots, about 60 tool calls; carried from T024: the title, the keywords and the band's draft colours are already drawn; the pill and the watermark are not; `recordingDocument()` tracks opacity through `save()`/`restore()` but records the watermark's coordinates before rotation
- [ ] T037 [US2] [high] Verify the draft's PDF (quickstart §3; §6 "Published meanwhile", "Deleted meanwhile"), script-first, in two parts. *The file*: the Node script of T026 run for C and D against a wrapped scratchpad copy of the prototype's `draft-ids-top.pdf`, with the same CSV and summary (texts, pages, positions; "intended" per design-notes §5: the gaps box lists everything publishing refuses and says "parts"); page images only for unsure or failing pages. *The page*: one `browser_run_code_unsafe` script per browser checks the button in C's header against §7.1's rows for A (the same position, size and gaps: the draft's details U93 #10), downloads C and D from their details and records the file name ("…_draft_<version>.pdf"), then, with a second page as the other tab, publishes a fresh copy of D and downloads from the first (the first shows the published details, the file has no "_draft_") and deletes a second copy and downloads (the not-found state, no file). *The gaps against the server* (FR-010; research R10 "Not gaps"): the script asks the API to publish C with its stored content and records a 400 whose message is the first gap of C's page 1 (publishing's order) with nothing written, and D's copy above publishing with a PDF that has no gaps box. New here: C and D, the two "meanwhile" cases and the gaps' agreement with the server; A's layout is cited from §7.3 and the run's states from §7.2. This sweep runs alone and owns its fixes, in `blocks.ts`, `render.ts`, the hook and the details' wiring; the summaries go to design-notes §7.3 and §7.2; items: FR-005, FR-010, FR-013, FR-018, FR-022, FR-044, SC-002; depends on T036; files: `frontend/src/utils/connectionPdf/blocks.ts`, `render.ts`, `frontend/src/hooks/useConnectionPdf.ts`, `frontend/src/pages/FormConnectionDetail/index.tsx` (fixes), `specs/011-connection-pdf/design-notes.md` (§7.2, §7.3); gates: Node gates; size: 2 files of about 6 pages plus 4 page states × 2 browsers, at most 16 page images and screenshots, about 90 tool calls
- [ ] T038 [lead] Checkpoint of US2: read C's PDF from the page against quickstart §3; search it for "http"; §7.3 has no unsure row for C and D; note the result in design-notes §8.4; items: SC-002, SC-007 (prepared: the team's reading is under "Needs a person"); files: `specs/011-connection-pdf/design-notes.md` (§8.4)

**Checkpoint**: US2 is complete: a draft can be shared for review, with nothing live in it.

### Delegation

- **Wave 1**: batch (T035, T036) [high] (the draft's kinds are measured and drawn by one agent,
  about a third of phase 4's volume).
- **Wave 2**: T037 [high] (alone, so it may fix what it finds).
- **Wave 3**: T038 [lead].
- **Needs a person**: SC-007: a colleague who has never opened the website reads C's PDF and says,
  per variant, what is asked for, which rules apply, what a citizen is told and what is left to
  finish. Two fresh copies of D for T037 come from `seed.ts`; the stack must be running.

---

## Phase 7: User Story 3 — Tell whether a printout is current (Priority: P2), part 2

**Goal**: the version on the page, in the file, in its name and in its properties agree, stay
the same when nothing of the content changes and differ when it does (FR-030 to FR-033, SC-004).

**Independent Test**: quickstart §4, steps 1 to 7, as one scripted run.

- [ ] T039 [US3] [medium] Verify the version end to end (quickstart §4; §6 "Changed meanwhile"), script-first and report-only: one `browser_run_code_unsafe` script (Chromium) with a CSV and a grouped summary. For A: the header's "Version …" equals the API's `version_fingerprint` and the version in the downloaded file's name; the file's raw bytes hold "version <version>" in `Subject` and `Keywords` (read as latin-1; the smoke test already proves the band of every page); a second download and a download in German give the same version; deactivating and activating keep it; an edit of one rule's message through the API changes the header's version after "Download PDF" in a tab opened before the edit (FR-005: the page, the file name and the content agree), and editing it back gives the first version again. For a fresh copy of D: publishing it unchanged keeps the version on the published details and in the new file's name. New here: the agreement of page, file name and properties, and the browser's side of FR-005; each kind of content change is cited from `test_versions.py` and the API tests (T007, T008). The summary goes to design-notes §7.5; a defect is reported, not fixed; items: FR-005, FR-030, FR-031, FR-032, FR-033, SC-004; files: `specs/011-connection-pdf/design-notes.md` (§7.5); gates: none; size: about 10 rows, 0 screenshots expected, about 40 tool calls
- [ ] T040 [lead] Checkpoint of US3: §7.5's version rows all pass; a defect T039 reported becomes a new task in this phase with its level, files and gates before the phase closes; note the result in design-notes §8.4; items: SC-004; files: `specs/011-connection-pdf/design-notes.md` (§8.4), this file (an appended task, if any)

**Checkpoint**: US3 is complete: a printout's version can be compared with the details page.

### Delegation

- **Wave 1**: T039 [medium].
- **Wave 2**: T040 [lead].
- **Needs a person**: the stack running. Nothing else.

---

## Phase 8: User Story 4 — Language and assistive technology (Priority: P3)

**Goal**: the PDF in German when the website is German, with content as entered and the same
dates; tagged so that a screen reader reads title, headings, lists and the details table in
order and skips the band, the bottom and the watermark; PDF/UA-1 (FR-034 to FR-040, SC-006).

**Independent Test**: the same connection downloaded in both languages differs only in texts
that aren't content; the structural checks and veraPDF's PDF/UA-1 profile report no failure for
A, B, C and D in both languages; the details page's header holds in German at 320 px / 200 %.

- [ ] T041 [US4] [lead] Decide the German copy with a German-speaking team member, or the user in their place (spec, Assumptions; contracts/pdf-document.md §5 "to review"): download C and A in German from the running app and walk the reviewer through `PDF_TEXTS`' German column and `DETAIL_COPY`'s seven new keys with spec 009's glossary at hand; record every correction in design-notes §8.2 (`where | english | german before | german after | glossary changed?`); a better term replaces the glossary's entry first, then every table that uses it; hand the corrections to T042; items: FR-034, SC-006; files: `specs/011-connection-pdf/design-notes.md` (§8.2), `specs/009-language-toggle/contracts/glossary.md`; gates: none; size: about 52 strings, 2 PDFs, 0 screenshots
- [ ] T042 [US4] [medium] Apply T041's corrections and pin the German (FR-034, FR-035): the corrected strings in `frontend/src/utils/connectionPdf/constants.ts` and `frontend/src/pages/FormConnectionDetail/constants.ts`; `model.test.ts` gains German cases (A and C: a rule's joined statement equals `statementOf(rule, context).text` in German; the documents' and data items' names are the German labels; names, descriptions, messages and values typed as text are as entered; `generatedAt` and `lastSaved.at` are the same strings as in English); `render.test.ts` gains A and C in German (`/Lang (de-DE)`, "Seite n von N" on every page, the watermark "ENTWURF", the title "… – Anbindungsdetails" or as T041 settled it, no English own-text left: every recorded text is content, a German `PDF_TEXTS` or details text, a rules-package text or a catalog label). Assertions refer to the tables, not to literal German, so a later correction doesn't break them; items: FR-034, FR-035; depends on T041; files: `frontend/src/utils/connectionPdf/constants.ts`, `model.test.ts`, `render.test.ts`, `frontend/src/pages/FormConnectionDetail/constants.ts`; gates: Node gates; size: 4 files, 0 screenshots, about 40 tool calls; carried from T003: "Connection details" is "Details der Anbindung" (D2), so the title reads "… – Details der Anbindung" unless T041 changes it; carried from T020: the fixtures C and D are answered in English, so a German model of them needs its documents re-labelled with `documentViewsOf(requested, 'de')` (as `model.test.ts`'s `answeredIn()` does), else the subjects mix the languages
- [ ] T043 [P] [US4] [high] Sweep the PDF's structure and contrast (quickstart §5 steps 2 to 4; R5; FR-036 to FR-040), script-first and report-only: a Node script renders A, B, C and D in both languages and E in English (9 files) through `recordingDocument()` into the scratchpad and writes a CSV with a grouped summary per file: exactly one `H1`; heading levels never skip going down; every text inside a tag or an artifact; the band, the bottom line and its text, the watermark, frames, chips and bullets recorded only as artifacts; the details table's rows with a `TH` of `scope: Row`; the data items, the gaps and the links to create as `L`/`LI`/`LBody`; the outline's entries (the three sections and, under the third, one per variant) pointing to the page where each starts; `/Lang`, the title, `/DisplayDocTitle`, `pdfuaid:part`, no `/CIDSet`; every font embedded; the contrast of every recorded text against the fill drawn under it, with the watermark's 6 % composited over it (at least 4.5:1, faded items included); for the three pages of A that carry marks, the same text rows with colours reduced to grey (marks, statuses, AND/OR and removed items still told apart by words and strike-through, not by grey level). If `verapdf` is installed (T001), run `verapdf --flavour ua1` on the 9 files and add its failed rules to the CSV; if not, mark those rows "needs a person". No recorded text or shape other than the watermark lies within 14.17 pt (5 mm) of a page's edge (FR-043). One more file outside the 9 (the spec's edge case "Characters KERN's typeface doesn't have"): A named "申請 🚕 Taxi" renders without throwing, its `Title` and `fileNameOf()` keep the characters, and what veraPDF says about it is recorded as information, never as a failure. Page images only for failing or unsure rows. New here: B, D, E and every German file; A's and C's raw-byte checks are cited from `render.test.ts`. The summary goes to design-notes §7.4; items: FR-036 to FR-040, FR-043, SC-006; depends on T042; files: `specs/011-connection-pdf/design-notes.md` (§7.4); gates: none; size: 9 files and 1 extra, about 20 checks each, at most 6 page images, about 70 tool calls
- [ ] T044 [P] [US4] [high] Sweep the PDF's German texts and dates (quickstart §5 step 1; FR-034, FR-035), script-first and report-only: a Node script renders A and C in both languages and writes a CSV with one row per recorded text pair (the same block and run in English and German) and a grouped summary: own texts equal in both languages that aren't in `copy.test.ts`' allowlist; content that differs between the languages (it must not); every date matching `\d\d\.\d\d\.\d{4}, \d\d:\d\d` and identical in both languages and under `TZ=America/New_York` and `TZ=Asia/Tokyo`; each German statement equal to the rules package's; German texts wider than the box `layoutOf()` gives them (the band's right group, the badges, the pills, the details table's key column, the bottom's place label), measured with `widthOfString`; German pagination still obeying SC-005 (T023's invariants on the German pages). Page images only for failing or unsure rows. New here: every German row; the English wording is cited from §7.3. The summary goes to design-notes §7.4; items: FR-034, FR-035, SC-005; depends on T042; files: `specs/011-connection-pdf/design-notes.md` (§7.4); gates: none; size: about 80 text pairs × 2 files, at most 6 page images, about 60 tool calls; carried from T023: the German SC-005 check can reuse `expectPagesKeepChains()` and `expectChainsAndUnits()` from `blocks.test.ts` (not exported: copy or move them)
- [ ] T045 [P] [US4] [high] Sweep the details page's header across languages and widths (quickstart §5 step 5, §6 "Narrow screen"; design-notes §2, §3), script-first and report-only: one `browser_run_code_unsafe` script per browser over {A open, A closed, B, C} × {English, German} × {1440 px, 320 px at 200 %} (16 states) plus the busy and the failed state in German at both widths (4 states), with a CSV and a grouped summary: horizontal scroll, clipped or off-screen elements, the `h1` count (one), `:focus-visible` on the button and on "Try again" after a click (no ring) and after Tab (ring), the contrast of the version's label and code, the button's label and the alert's texts (canvas conversion, alpha and opacity composited), the label widths against their boxes, the version never broken inside its code, the button 48 px high, the live region's German texts; and FR-006, in English at 1440 px: no element named "Download PDF" and no "Version …" header on the create flow's last step with a local draft open, on the edit flow of A, or on the approval page of a request to publish a copy of D (made through the API and withdrawn at the end; if none can be made from the chat, cite `PublishSummary`, which passes none of `RulesSummary`'s new props, and mark the row "needs a person"). New here: every German state, B, the closed header at 320 px, the focus and contrast rows, the three pages of FR-006; the English header at 1440 px and its narrow idle state are cited from §7.1, the run's behaviour from §7.2. A screenshot only for a failing or unsure row. The summary goes to design-notes §7.2; items: FR-001, FR-003, FR-006, FR-032, FR-034; depends on T042; files: `specs/011-connection-pdf/design-notes.md` (§7.2); gates: none; size: 20 states and 3 pages × 2 browsers, at most 8 screenshots, about 60 tool calls
- [ ] T046 [US4] [high] Fix what T043, T044 and T045 reported: each defect from their reports in the file it names (`render.ts`, `blocks.ts`, `constants.ts`, `PdfDownload.tsx`, `DetailAccordion.tsx`, `DETAIL_COPY`); a German label that doesn't fit is fixed in spec 009's order (the glossary's short form first, then the one element's wrapping), never by shrinking the type; after each fix, re-run the failing rows with the sweep's script (its path is in the sweep's report) and replace the rows in design-notes §7.2 and §7.4; with no defect reported, tick the task with "nothing to fix"; items: FR-034 to FR-040, SC-006; depends on T043, T044, T045; files: the files the reports name, `specs/011-connection-pdf/design-notes.md` (§7.2, §7.4); gates: Node gates; size: by the reports; split by the coordinator if they list more than about 15 defects; about 60 tool calls
- [ ] T047 [lead] Checkpoint of US4: §7.2 and §7.4 have no failing row; the rows marked "needs a person" (veraPDF, the screen reader, the printout) are listed for the user; note the result in design-notes §8.4; items: SC-006; files: `specs/011-connection-pdf/design-notes.md` (§8.4)

**Checkpoint**: US4 is complete as far as a chat can check; the validator, the screen reader and
the printout wait for a person.

### Delegation

- **Wave 1**: T041 [lead] (the review settles German terms that two tables and the glossary
  then follow, and the sweeps measure the settled words).
- **Wave 2**: T042 [medium].
- **Wave 3**: T043 [high] ∥ T044 [high] ∥ T045 [high] (three sweeps that only report: none edits
  a source file, each appends its own rows to design-notes).
- **Wave 4**: T046 [high] (the one task that fixes, so no two agents edit `render.ts`).
- **Wave 5**: T047 [lead].
- **Needs a person**: T041's reviewer. veraPDF 1.28 or later with Java (`verapdf --flavour ua1`)
  on the 9 files of T043, or PAC 2024 on Windows, if neither is installed where the chat runs.
  The screen-reader walk of quickstart §5 step 3 (NVDA with Acrobat Reader; say which was used).
  A black-and-white printout of A (quickstart §2 step 7). T045's 200 % zoom confirmed once with
  the browser's own zoom.

---

## Phase 9: Limits, edge cases, documentation and close

**Purpose**: the product's limits (FR-045, SC-001), the edge cases no earlier sweep covered,
privacy (SC-008), the convergence check, the documentation checklist and the closing report.

- [ ] T048 [P] [high] Sweep the limits (quickstart §6 "Limits"; FR-045, SC-001, SC-005), script-first and report-only. *The file*: a Node script renders `largestConnection()` in English and German through `recordingDocument()` and writes a CSV grouped by check over all pages (about 800): blocks split (0 apart from the tall rule's continuations), pages ending with a heading (0), a group's header without its first member (0), a connector without its item (0), pages after a variant's or group's first without "(continued)" (0), the nationality rule's continuation between values with all 249 in order, pages without the ID, the version or "Page n of N" (0), the render time in Node. *The page*: one `browser_run_code_unsafe` script per browser downloads E five times and records the click to the `download` event (under 60 s), the longest gap between 50 ms timer ticks (the page responsive), the file's size, and a scroll and an accordion toggle answered during the run. New here: E in the browser and in German; E in English in Node is cited from `render.test.ts` and `blocks.test.ts`. Page images only for failing or unsure pages. The summary goes to design-notes §7.5; items: FR-023 to FR-027, FR-045, SC-001, SC-005; files: `specs/011-connection-pdf/design-notes.md` (§7.5); gates: none; size: 2 files of about 800 pages measured, 10 timed runs, at most 6 page images, about 60 tool calls
- [ ] T049 [P] [high] Sweep the remaining edge cases and privacy (quickstart §6; SC-008), script-first and report-only: one `browser_run_code_unsafe` script (Chromium, then Firefox) with a CSV and a grouped summary for the cases no earlier table holds: the language switched right after activating on E (the file is in the language at activation: its recorded title and `/Lang` read from the bytes); leaving for the overview right after activating on E (no `download` event within 90 s); A renamed through the API to `A/B: "test" <1>?` (each forbidden character replaced in the file name, the name as entered in the header) and to a 200-character name (the file name's first 100 code points; the band's "…" is cited from `render.test.ts`, T024); privacy: the requests of one download with a warm cache (exactly one `GET /api/form-connections/{id}`), the row counts of every table before and after five downloads (`psql`, unchanged apart from what a sign-in writes), and the backend's log lines during them (none naming a PDF or a version). Cited, not re-checked: the double activation and offline (§7.2, T033), published and deleted meanwhile (§7.2, T037), changed meanwhile (§7.5, T039), the narrow screen (§7.2, T045). The summary goes to design-notes §7.5; items: FR-034, FR-042, FR-044, SC-008; files: `specs/011-connection-pdf/design-notes.md` (§7.5); gates: none; size: 5 new cases × 2 browsers, at most 4 screenshots, about 50 tool calls
- [ ] T050 [high] Fix what T048 and T049 reported, in the files their reports name (`blocks.ts`, `paginate.ts`, `render.ts`, the hook, the worker, `fileName.ts`), each with a test beside the module where the defect is pure logic; re-run the failing rows with the sweeps' scripts and replace the rows in design-notes §7.5; with no defect reported, tick the task with "nothing to fix"; items: FR-045, SC-001, SC-005, SC-008; depends on T048, T049; files: the files the reports name, `specs/011-connection-pdf/design-notes.md` (§7.5); gates: Node gates; size: by the reports; about 50 tool calls
- [ ] T051 [lead] Run `/speckit-converge` on this feature: it assesses the code against spec.md, plan.md and this file and appends any unbuilt work as new tasks here; give each its level, files, gates and size, and complete them before T052; items: SC-002; files: `specs/011-connection-pdf/tasks.md` (appended tasks), the files they name; carried from T010: decide whether the MCP's text for a draft keeps "Version {n}, last saved …" for the save number now that `get_connection` also says "Version 62D0-…, as the details page and the PDF show it." (the "Avoid" list: no `version` label on the draft's save number); changing it to "save {n}" touches every draft tool's answer text (`mcp/src/tools/`), `mcp/test/server.test.ts` and `mcp/plugin/skills/connection-workflow/SKILL.md` ("The draft's step"); carried from T018: `frontend/nginx.conf` sets no `client_max_body_size`, so nginx refuses a request body over 1 MB with `413`, and saving a connection near FR-045's limits through nginx fails (E's body is 1.56 MB): a product question outside the PDF; tell the user and, if they agree, add a task with the limit
- [ ] T052 [medium] Apply the documentation checklist (CLAUDE.md "Documentation checklist"; plan.md "Delivery order" 5): `README.md` (the dependency `pdfkit` 0.20.2, pinned exactly, and why; the committed Fira TTFs and their licence); `docs/ARCHITECTURE.md` gains "The connection PDF (spec 011)" (the version and where it is computed; the run: fetch, model on the main thread, the worker, the save; the pure modules and "measured equals drawn"; pagination's rules; tagging and `withoutCidSet`; the fonts and nginx's `font/ttf`; what is never stored, sent or logged) and its "frontend" section names the `actions` slot; `CLAUDE.md` gets one rule under the frontend rules pointing to that section (no `console.*` in `utils/connectionPdf/`, `workers/pdf.ts`, `useConnectionPdf`; only the worker and the hook touch browser APIs; `version_fingerprint` is computed only in `versions.py`) and the third worker entry where it lists the two; `docs/KERN-DESIGN-SYSTEM.md` says that KERN 2.8.2 ships no Fira Mono; `specs/008-kern-revamp-redesign/deferred.md` marks Q37 (b) as built by spec 011; CI needs no new check (the same gates): say so in the report; items: constitution "Development Workflow" step 4; depends on T051; files: `README.md`, `docs/ARCHITECTURE.md`, `CLAUDE.md`, `docs/KERN-DESIGN-SYSTEM.md`, `specs/008-kern-revamp-redesign/deferred.md`; gates: Node gates (Prettier over the Markdown, if the hook covers it); size: 5 files, 0 screenshots, about 35 tool calls
- [ ] T053 [medium] Write the closing report and the texts a person sends: design-notes §9 with SC-001 (T033's and T048's timings), SC-002 (§7.3), SC-003 and SC-005 (the smoke test, §7.5), SC-004 (pytest and §7.5), SC-006 (§7.4 and what waits for a person), SC-007 (the team's reading), SC-008 (§7.5); the deviation for the designer (the version's placement, design-notes §2); `specs/011-connection-pdf/pr.md` (the summary of the change, the verification, what waits for a person, the attribution line); `specs/011-connection-pdf/pdfkit-cidset-issue.md`, the report of PDFKit's incomplete `CIDSet` (R5) with the minimal case and veraPDF's rule, for a person to file upstream; §8.4 completed; items: SC-001 to SC-008; depends on T052; files: `specs/011-connection-pdf/design-notes.md` (§8.4, §9), `specs/011-connection-pdf/pr.md`, `specs/011-connection-pdf/pdfkit-cidset-issue.md`; gates: none; size: 3 files, 0 screenshots, about 25 tool calls; carried from T024: PDFKit 0.20.2 writes an outline item's `/XYZ` left as `pageWidth − left`, so `render.ts` passes the page width to get 0; worth reporting upstream with the `CIDSet` bug
- [ ] T054 [lead] Final checkpoint: every gate is green; quickstart §1 to §6 each have their rows in design-notes §7; the list of what waits for a person is in §9; tell the user the feature is ready to commit; files: `specs/011-connection-pdf/design-notes.md` (§8.4)

**Checkpoint**: the feature is complete; what only a person can check is listed.

### Delegation

- **Wave 1**: T048 [high] ∥ T049 [high] (two sweeps that only report; T049's renames of A happen
  through the API and are undone at its end, so T048's runs on E are not disturbed).
- **Wave 2**: T050 [high] (the one task that fixes).
- **Wave 3**: T051 [lead] (`/speckit-converge` runs in the coordinator's chat; appended tasks get
  their own levels and waves).
- **Wave 4**: T052 [medium].
- **Wave 5**: T053 [medium].
- **Wave 6**: T054 [lead].
- **Needs a person**: T048's timing of E confirmed once by hand in a real Chromium and Firefox
  (a stopwatch from the click to the saved file). Filing `pdfkit-cidset-issue.md` with PDFKit.
  Telling the designer about the version's placement. Committing and opening the PR.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 Setup**: none. T001 → T002 → T003 → (T004 ∥ T005) → T006.
- **Phase 2 The version in the API (US3, part 1)**: after Phase 1. T007 → T008; T009 → T010.
- **Phase 3 The pure core**: after Phase 2 (the model reads `version_fingerprint`; the fixtures
  need the field). T012 before T013, T014, T015; T016 and T017 before T018; T019 before T020.
- **Phase 4 The document (US1, part 1)**: after Phase 3. T022 → (T023 ∥ T024) → T025 → T026.
- **Phase 5 The download (US1, part 2)**: after Phase 4. T030 before T031; T029 and T032 before
  T033; T028 before T032.
- **Phase 6 The draft (US2)**: after Phase 5 (the button and the hook; `blocks.ts` and
  `render.ts` as phase 4 left them). T035 → T036 → T037.
- **Phase 7 The version end to end (US3, part 2)**: after Phase 5; after Phase 6 for the
  publish-unchanged row, which downloads a draft's PDF.
- **Phase 8 Language and accessibility (US4)**: after Phase 6 (the draft's kinds are swept too).
  T041 → T042 → (T043 ∥ T044 ∥ T045) → T046.
- **Phase 9 Limits and close**: after Phase 8. (T048 ∥ T049) → T050 → T051 → T052 → T053 → T054.

### User Story Dependencies

- **US1 (P1)**: needs Phases 1 to 3 and the version field of Phase 2; complete after Phase 5.
- **US2 (P2)**: adds the draft's kinds to US1's blocks and drawing; the model and the button
  already handle a draft. Complete after Phase 6.
- **US3 (P2)**: its API half (Phase 2) is built first because US1 shows the version; its
  end-to-end check (Phase 7) needs US1's button and US2's draft file.
- **US4 (P3)**: German is written with every table and tagging with every drawing task, so US4's
  phase is the review, the German tests, the sweeps and their fixes.

### Within Each Phase

- Shapes before the modules that use them; a pure module with its tests before what calls it;
  measuring (`blocks.ts`) before drawing (`render.ts`); a decide task before the sweep that
  depends on its answer; a fix task after the sweeps that report to it.
- Every task ends with its gates green; a phase ends with its checkpoint and a note in
  design-notes §8.4.

### Parallel Opportunities

- The waves and batches of each phase are in its "Delegation" section; nothing else lists them.
  The phases run in order, one chat per phase.
- Across phases, a second person can run Phase 3's wave 1 (T012, T016, T017) while Phase 2's
  backend batch (T007, T008) runs: they share no file, and only T018 and T020 need the field.
- Phase 7 (US3's end-to-end check) and Phase 8's T041 (the German review) can overlap: one is a
  report-only script, the other a conversation.
- Backend batches never run side by side, in any phase: the tests empty one database.
- `specs/011-connection-pdf/design-notes.md` is the one file every verifying task appends to,
  each under its own heading, so it is no conflict between batches; the coordinator checks the
  rows after each wave.

---

## Implementation Strategy

### MVP First (User Story 1)

1. Phase 1 Setup, Phase 2 the version in the API, Phase 3 the pure core.
2. Phase 4 the document, Phase 5 the download.
3. **STOP and VALIDATE** (T034): a team member downloads A's and B's PDF from the details page;
   the file matches the page and the agreed layout. This is shippable for published connections,
   with the German copy still unreviewed (T041, Phase 8); a draft's details show the version and
   get the button in Phase 6.

### Incremental Delivery (one chat per phase)

1. Setup → the baseline, the decisions, PDFKit and the fonts.
2. The version in the API → `curl` shows it; pytest proves its invariants.
3. The pure core → the model and the paginator, tested in Node.
4. The document → a published PDF in Node, compared with the agreed layout.
5. The download → US1 on the page (MVP).
6. The draft → US2.
7. The version end to end → US3.
8. German and accessibility → US4, and the list for a person.
9. Limits and close → SC-001 and SC-008, the documentation, the report.

---

## Coverage check

- **FR-001** T031, T032, T036, T037, T045; **FR-002** T030, T033; **FR-003** T029, T030, T031, T033, T045;
  **FR-004** T030, T031, T033; **FR-005** T020, T030, T031, T037, T039; **FR-006** T031, T045;
  **FR-007** T022, T035; **FR-008** T017, T020, T022, T035; **FR-009** T022, T035; **FR-010**
  T016, T019, T035, T037; **FR-011** T015, T022; **FR-012** T022; **FR-013** T020, T035, T036,
  T037; **FR-014** T020, T022, T035; **FR-015** T020, T023, T025; **FR-016** T020, T023, T025;
  **FR-017** T020, T023, T025, T043; **FR-018** T016, T019, T035, T037; **FR-019** T020, T023,
  T035; **FR-020** T024, T036; **FR-021** T014, T024; **FR-022** T036, T037; **FR-023** to
  **FR-027** T014, T022, T023, T048; **FR-028** to **FR-031** T007, T008, T039; **FR-032** T009,
  T031, T032, T039, T045; **FR-033** T015, T024, T039; **FR-034** T003, T013, T020, T030, T041,
  T042, T044, T045, T049; **FR-035** T020, T042, T044; **FR-036** to **FR-038** T024, T025,
  T036, T043; **FR-039** T013, T043; **FR-040** T024, T043; **FR-041** T018, T019, T020;
  **FR-042** T004, T029, T030, T033, T049; **FR-043** T005, T013, T024, T043; **FR-044** T015, T030,
  T033, T037, T049; **FR-045** T018, T023, T025, T048.
- **SC-001** T029, T033, T048; **SC-002** T018, T025, T026, T036, T037, T051; **SC-003** T024,
  T025; **SC-004** T007, T008, T039; **SC-005** T014, T023, T044, T048; **SC-006** T041, T043,
  T046, T047 and a person; **SC-007** T038 and a person; **SC-008** T033, T049.
- **Research**: R1 T003, T004; R2 T004, T029; R3 T012, T020; R4 T014; R5 T024, T043, T053; R6
  T007, T008; R7 T004, T005, T029; R8 T013; R9 T020, T030; R10 T016, T019; R11 T012, T015, T022,
  T023; R12 T010; R13 T030, T031; R14 T024, T025, T036.
- **Contracts**: `api-version.md` T007 to T010; `pdf-worker.md` T029 to T031, T033;
  `pdf-document.md` T013, T022 to T026, T035 to T037, T041 to T044.
- **Quickstart**: §1 T001, T021, T029; §2 T026, T033, T034; §3 T037, T038; §4 T039; §5 T042 to
  T045 and a person; §6 T033, T037, T039, T045, T048, T049.

## Notes

- `[P]` = different files, no unfinished dependency.
- The checkboxes here and the tables in design-notes §7 and §8 are the only state between chats:
  tick a task only when its gates are green and its rows are clean.
- Git works in this checkout only with `GIT_DIR=/home/debian/batch27-faro/worktrees/pdf-summary`
  and `GIT_WORK_TREE=/home/debian/batch27-faro/pdf-summary`; a task agent never commits, and the
  coordinator commits only when the user asks.
- Avoid: a second package for PDFs or fonts (R1, R7), an import of fontkit or any other package
  that only arrives through PDFKit (constitution IV), KERN's WOFF2 files in the PDF (R7), a URL in
  a draft's model, a `console.*` in the PDF's modules, a stored or logged version or file
  (FR-042), a `version` label on the draft's save number, a second computation of the
  fingerprint outside `versions.py`, a `vitest.config.ts` in `frontend/`, a `pytest.ini`, an edit
  to a file under `prototype/` other than `seed.ts`.
