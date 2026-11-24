# Implementation Plan: English–German language toggle for the whole website

**Branch**: `009-language-toggle` (feature directory `specs/009-language-toggle/`) | **Date**:
2026-11-09 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/009-language-toggle/spec.md` (its checklist
passed on 2026-11-09, iteration 2), spec 008's deferred item F6 and its baseline, and the header
components of Figma "Middleware – V5" (research R2).

**Note**: git in this checkout is not reachable (`.git` points to a worktree on another
machine), so `setup-plan.sh` resolved the feature from `.specify/feature.json`; nothing here
commits on the other machine; here git runs with `GIT_DIR=<git-dir>/worktrees/de-lang
GIT_WORK_TREE=<checkout>/de-lang` (the mirrored repository), on the branch
`de-lang`. The user shared the header's URL after planning
(`…?node-id=6699-44241`, the "Header area" frame, an instance of "Shell/Header · two pills"
`6688:41392`): it is the same header in every screen and the same as spec 008's, so the switch
is the "Pill · Language" node inside it (research R2) and **no `/figma-audit` is run** for this
feature; the per-node loop on that one node is the only Figma work.

## Summary

Every screen gets the design's "DE | EN" pill in the header, and the whole website exists in
German beside spec 008's English: the website's own copy, the texts the server sends (its error
and validation messages, the catalog's and option sets' labels) and the sentences the rules
package composes (rule statements, proposed citizen messages, findings, personas). Content stays
as entered, what leaves the website (serviceBW, EUDIPLO, the MCP server) stays English, and the
choice lives in the browser.

**Technical approach** (research R1–R12):
- **Typed copy tables, no i18n library** (R1): each copy object of spec 008's `constants.ts`
  files becomes `defineTexts(en, de)`, typed from the English column so that `tsc` refuses a
  missing German entry; components read their table through `useCopy()`; a shared
  `rules/src/language.ts` holds `Language` and `defineTexts` for the frontend, the rules package
  and the MCP server.
- **The switch** (R2): a new `LanguageSwitch` component after the design's node, in `TopBar`'s
  right group before the account pill, two buttons with `aria-current`, `lang` and the languages'
  own names; two colour deviations recorded (AA and a tokenless value).
- **The glossary first** (R3): [contracts/glossary.md](contracts/glossary.md) binds all four
  sources of copy; the German is written in the task that makes each table and reviewed by the
  team in the running app.
- **The rules package takes the language** (R4): `RuleContext.language` and a trailing
  `language` on the composers without a context, English by default, so the MCP server keeps
  answering agents in English with no change; German templates with German structure, per module,
  with tests.
- **The backend answers in the requested language** (R6): `Accept-Language` from `apiFetch`, a
  `ContextVar` set by a small middleware, `Text(en, de)` messages resolved by the error handler,
  `label_of()` for the catalog and option sets; response shapes, keys and order unchanged;
  `/api/connect/` pinned to English.
- **The choice** (R7): `LanguageProvider` reads `localStorage` and the browser's language before
  the first render, writes the choice, follows other tabs, sets `<html lang>` before paint.
- **Evidence** (R8, R9): the type checker and a glob test for completeness, German cases beside
  every English sentence test, pytest for the header, a generated parity fixture for the mirrored
  validation messages, and a German walk of spec 008's verification tables at 1440 and 320 px.

## Technical Context

**Language/Version**: TypeScript 6.0 with React 19.2 (frontend, the rules package, the MCP
server untouched except for a type and a code field); Python 3.13 (backend: a leaf module, a
middleware, texts).

**Primary Dependencies**: unchanged (constitution IV): `@kern-ux/native` 2.8.2,
`@kern-ux-annex/kern-react-kit` 2.40.0 (its `translations` prop already carries the kit's seven
texts; the kit's defaults are German), Tailwind CSS 4, React Router 7, Vite 8, Vitest 4; FastAPI,
Pydantic 2, SQLAlchemy 2. No i18n library, no date library (R1, R5).

**Storage**: no database or API shape change. One new `localStorage` key,
`konnekt:language:v1`, read and written only by `LanguageProvider` (R7).

**Testing**:
- **Vitest** (the gate) in `node`: `tsc` proves both columns of every table; `copy.test.ts`
  (frontend and rules) walks the tables with `import.meta.glob`; German cases beside every English
  sentence test in `rules/src/`; the resolver's tests; the parity test against the generated
  `rules/src/fixtures/server-messages.json` (R8). No DOM tests.
- **pytest** (a practice, run anyway): `language_of()`, the header on each path, `/api/connect/`
  in English, the catalog's keys and order, every `Text` complete, the fixture current.
- **The MCP's tests**: unchanged and green (English by default).
- **Visual and manual**: the per-node loop for the switch (four header states) and the German
  walk of spec 008's tables with the Playwright MCP tools (quickstart V1–V9).

**Target Platform**: unchanged: DO.IT's evergreen desktop browsers (Chromium-based and Firefox),
light only, every screen usable at 320 px and 200 % zoom in both languages (FR-015); `Intl`,
`localStorage`, `navigator.language` and the `storage` event are in all of them.

**Project Type**: web application (React SPA behind nginx, FastAPI backend, PostgreSQL, the MCP
server in its own container); this feature touches `frontend/`, `rules/`, `backend/` and, for a
type and a problem code, `mcp/`.

**Performance Goals**: a switch re-renders with the other table and finishes within one second
(SC-001); both languages ship in the one bundle (about 60–80 kB of text uncompressed, R1); the
catalog and option sets are fetched once per language, the second in the background (R6); the
rule checks and personas keep running in their Workers, which carry no text (findings and
personas are data; the texts are composed on the main thread as today).

**Constraints**:
- **No English text changes** (FR-014): moving a string into a table keeps it word for word; the
  existing English assertions in every test stay.
- **No behaviour change** (FR-016): the same routes, steps, reducers, checks and personas; codes
  replace string comparisons (R10) without changing what they decide.
- **Nothing leaves differently** (FR-017): `/api/connect/`, EUDIPLO, the MCP server, stored
  data; the worker and the services' outbound calls never read the language.
- **Nothing logged** (FR-018): the header, the `ContextVar` and the stored choice appear in no
  log line, no `console.*`; findings, personas and local drafts stay unlogged (specs 003–005).
- **Spec 008 decides the rest**: the header's layout (W2), the frames' layout for the German
  screens (no German frames exist), the fixed date formats (FR-012).
- **Git read-only** here; `npm install` first; Node 20 here vs 22+ in the constitution (R11, V5).

**Scale/Scope**: the frontend's 34 copy files (about 645 prose strings and 165 templates), the
rules package's 13 text modules (about 110 literals and 40 composers, 24 test files to extend),
the backend's about 101 error templates, 49 catalog labels, 294 option labels (249 countries) and
17 class descriptions, the access levels and approval texts; one new component, one provider, one
hook pair, one resolver, one middleware, one leaf module; one glossary of about 70 terms; the
German walk over spec 008's 91 screen units.

**Open points**: none. All are resolved in [research.md](research.md); the points to check while
coding are R13's V1–V10; the two colour deviations of R2 and the glossary's contested terms (R3)
are recorded under Complexity Tracking for the user to confirm or reverse.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design below.*

Checked against constitution v1.2.0 (`.specify/memory/constitution.md`).

| Principle or rule | How the plan complies | Result |
|---|---|---|
| **I. Contract parity** | No request or response shape changes: the catalog's, option sets' and connections' `label` stays a string (in the requested language), the `{error, message}` envelope is unchanged with the `error` code English, `ApiResponse.message` stays English; `api-types/` is untouched except that nothing mirrors `Text` (it never leaves the server). The one addition to a shared type is `RulesProblem.code` in `rules/src/types.ts` (not an API type). The OAuth RFC bodies stay RFC bodies | PASS |
| **II. Sync persistence (NON-NEGOTIABLE)** | No database access changes; handlers stay plain `def`; the middleware is pure ASGI and touches no database | PASS |
| **III. Quality gates** | Pure helpers and composers with `*.test.ts` beside them in `node`; `copy.test.ts` and the parity test in Vitest; no jsdom, no `vitest.config.ts` beside `vite.config.ts`, no `pytest.ini`; `npm run lint`, `npm test`, `npm run build` from the root after every task, Ruff, mypy and pytest for the backend; the MCP's `guidance.test.ts` keeps passing because no tool changes; the generated fixture gets its `--check` in `test_check_fixtures.py` | PASS |
| **IV. Dependencies and config** | No dependency, setting or environment variable; `Intl` and the DOM APIs are built in; the one new generated file follows the existing export script | PASS |
| **V. Schema evolution** | No migration | PASS |
| **Technology and structure** | Stack unchanged; `frontend/src/` keeps its folders: `components/LanguageSwitch/`, `components/LanguageProvider/`, `hooks/useLanguage.ts`, `utils/language/`; `rules/src/language.ts` and the text tables inside the composing modules (or a sibling `<module>Texts.ts`); the backend's `app/language.py` beside `errors.py`; components small with sibling `types.ts` / `constants.ts` / `utils.ts`; Tailwind classes only, one new `@theme` shadow token; no `any`, no `require()` | PASS |
| **Logging** | Nothing new is logged: no `console.*` in the provider, the hooks, `rules/src/`, `mcp/src/` outside `log.ts`; the backend's log lines keep their shape and never carry the header (FR-018) | PASS |
| **Security (CLAUDE.md "Auth")** | No endpoint or guard changes; the middleware reads one header and sets a `ContextVar`; the header is not trusted for anything but choosing texts | PASS |
| **Workflow and documentation** | Frontend order: types (`Language` in `rules/`) → API (`apiFetch`'s header, the hooks' caches) → pure helpers → provider and hook → components → pages. Backend order: no model or schema, the leaf module and middleware, then the services' texts, then tests. The documentation checklist is the last phase: `docs/ARCHITECTURE.md` (a "Languages" section; the frontend's provider and header; the error handling's `Text`; what stays English), `CLAUDE.md` (one-line rules: copy tables and `useCopy`; the composers' `language`; the server's `Text` and `/api/connect/`; the third `localStorage` hook; the fixture command), `README.md` (the header and the fixture), spec 001's 001-S7.9 and spec 008's F6 marked superseded | PASS |

**Gate result (before research)**: PASS, with no violations to justify.

## Project Structure

### Documentation (this feature)

```text
specs/009-language-toggle/
├── spec.md              # Feature spec (checklist passed 2026-11-09)
├── plan.md              # This file
├── research.md          # Phase 0: decisions R1–R13
├── data-model.md        # Phase 1: the language, the choice, the copy table, the server text, the problem code
├── quickstart.md        # Phase 1: gates, the per-node loop, scenarios V1–V11
├── design-notes.md      # Phase 1 skeleton, filled by the tasks: the switch's tokens and deviations,
│                        #   the verification tables, the German review log
├── contracts/
│   ├── glossary.md      # FR-013: style, product terms, the rules' vocabulary, the catalog's names
│   ├── language-switch.md   # The switch and the header: anatomy, tokens, states, semantics
│   ├── api-language.md  # Accept-Language, Text resolution, what stays English, the parity fixture
│   └── rules-texts.md   # The rules package's text API: Language, RuleContext.language, the composers
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 output (/speckit-tasks, not created here)
```

### Source Code (repository root)

```text
rules/src/
├── language.ts                    # new: Language, LANGUAGES, DEFAULT_LANGUAGE, defineTexts, languageNames, isLanguage
├── types.ts                       # RuleContext.language?; RulesProblem.code (R10)
├── constants.ts                   # OPERATORS' labelOf(definition, language); RULES_MESSAGES,
│                                  #   CONDITION_PROBLEM_MESSAGES, EDIT_MESSAGES, RELATION_WORDS,
│                                  #   DATE_OF_BIRTH_RULE_LABEL as tables
├── statements.ts, messages.ts, validation.ts, conditions.ts, dates.ts, dropped.ts, tree.ts
│                                  # composers take the language; texts in tables (or <module>Texts.ts)
├── checks/findingMessages.ts, checks/findingTexts.ts (new), checks/announcements.ts, checks/runState.ts
├── personas/messages.ts, personas/results.ts, personas/fields.ts, personas/constants.ts,
│   personas/announcements.ts, personas/personaState.ts
├── fixtures/server-messages.json  # new, generated: the server's validation messages in both languages
├── copy.test.ts                   # new: every table complete and translated
└── *.test.ts                      # German cases beside the English ones

frontend/
├── index.html                     # lang="en" stays the static default
├── src/
│   ├── index.css                  # @theme: --shadow-segment (the current segment's shadow)
│   ├── constants.ts               # CONNECTION_STEPS as keys + a label table; KERN_TRANSLATIONS as a table
│   ├── main.tsx                   # LanguageProvider above KernContextProvider
│   ├── copy.test.ts               # new: every copy table complete and translated (import.meta.glob)
│   ├── api/
│   │   └── client.ts              # Accept-Language from setRequestLanguage(); fallbacks from a table
│   ├── hooks/
│   │   ├── useLanguage.ts         # new: useLanguage(), useCopy()
│   │   ├── useDocumentTypes.ts, useOptionSets.ts, useFormConnection.ts   # per-language cache, prefetch (R6)
│   │   ├── useRuleChecks.ts, usePersonas.ts   # the language into the reducers' contexts (R4)
│   │   └── useDocumentTitle.ts    # unchanged (re-runs on the title string)
│   ├── utils/language/            # new, pure: resolveLanguage(), the storage key, their tests
│   ├── components/
│   │   ├── LanguageProvider/      # new: state, localStorage, storage event, <html lang>, setRequestLanguage
│   │   ├── LanguageSwitch/        # new: the pill (index.tsx, constants.ts, types.ts)
│   │   ├── TopBar/                # the right group: switch + account pill (R2)
│   │   └── */constants.ts         # copy tables (34 files)
│   └── pages/
│       ├── */constants.ts         # copy tables; Intl formatter tables (R5)
│       ├── */utils.ts             # helpers take the language
│       └── FormConnectionEditor/RulesStep/{TreeItem.tsx,utils.ts}, RuleEditor/utils.ts   # codes, not strings (R10)

backend/app/
├── language.py                    # new leaf: Language, language_of(), Text, request_language ContextVar, current_language()
├── main.py                        # the pure-ASGI language middleware (English for /api/connect/)
├── errors.py                      # the handlers resolve a Text message; INTERNAL_ERROR_MESSAGE as Text
├── catalog.py, option_sets.py     # label_de on every item; label_of()
├── routers/document_types.py, routers/option_sets.py, services/form_connections.py (documents_view)
├── services/{auth,form_connections,document_requests,approvals,agent_access,rules,eudiplo,oauth}.py
│                                  # messages as Text; access levels and approval texts localized
├── scripts/export_check_fixtures.py   # also writes rules/src/fixtures/server-messages.json
└── tests/                         # the header on each path; every Text complete; the fixture current

mcp/src/
├── findings.ts, tools/checks.ts   # branch on RulesProblem.code (R10); everything else unchanged
└── test/                          # unchanged and green

docs/ARCHITECTURE.md, CLAUDE.md, README.md
specs/001-servicebw-eudi-middleware/ (001-S7.9), specs/008-kern-revamp-redesign/deferred.md (F6)   # "superseded by spec 009"
```

**Structure Decision**: the web-application layout of specs 001–008 stays, and the frontend's
folders stay. Copy stays where spec 008 put it, in the sibling `constants.ts` files, which become
tables; new folders appear only for what no component covers (`LanguageSwitch/`,
`LanguageProvider/`, `utils/language/`). The rules package keeps each text in the module that
composes it and gets one new leaf module for the language; the backend gets one leaf module and a
middleware, and otherwise changes string literals into `Text`s in the files named above, each with
its tests. The MCP server changes two comparisons.

## Rules for `/speckit-tasks`

- **Phases**, in this order (research R12; one chat per phase, phase 5 three or four):
  1. **Foundations**: `rules/src/language.ts`; the frontend's resolver, provider, hook pair, the
     request header, `<html lang>`, `KERN_TRANSLATIONS` and `CONNECTION_STEPS`, `copy.test.ts` (an
     empty pass at first); the backend's `app/language.py`, the middleware, the handlers'
     resolution, `label_of()`, their tests. The glossary review is **done**: the user accepted
     [contracts/glossary.md](contracts/glossary.md) as written on 2026-11-09 (design-notes §3.1),
     so no task waits on it and phases 3–5 write the German from the glossary as it stands.
  2. **The switch** (`LanguageSwitch`, `TopBar`, `index.css`) through the per-node loop on
     `7341:101654` in the four header states, the AA fix and the ink deviation recorded in
     design-notes §1, the table in §2.
  3. **The backend's texts**: the catalog and option sets (the glossary's §4 and the German
     country names), the messages of each service as `Text`, the access levels, the approval
     texts, the `5xx` and `400` texts, pytest for each path, `/api/connect/` pinned, the parity
     fixture generated.
  4. **The rules package**: `RuleContext.language` and `RulesProblem.code`; then module by module
     (statements and conditions, messages, validation and constants with the parity test, dates,
     dropped and tree, findings with `findingTexts.ts`, announcements and `runState`, personas'
     messages, results, fields, constants, `personaState`), each with its German test cases from
     the glossary; the MCP's two comparisons; `npm test -w mcp` green.
  5. **The frontend's copy**, one task per screen of spec 008's contract (S1–S22 in its order)
     plus one per group of shared components: each task turns the screen's copy files into
     tables with the German written from the glossary, gives the helpers the language, makes the
     `Intl` tables (R5), fixes the comparisons (R10), passes `'en'` in the existing tests and
     adds German cases, and checks the screen in German at 1440 and 320 px / 200 % against spec
     008's table for that screen (no new frame: the English frame's layout).
  6. **The German walk**: quickstart V1–V9 end to end, the screenshot matrix, the keyboard run,
     the screen reader pass, the fixes of R9, the team's review and its log (SC-006).
  7. **Documentation and close**: the checklist above, 001-S7.9 and F6 marked superseded,
     `/speckit-converge`.
- **Every task names** the requirements it meets (FR-#), the research decision it applies (R#),
  the glossary section it uses, the files it edits, and ends with the gates. Phase 5's tasks also
  name the screen (S#) and the spec 008 table they check against; phase 2's names the node.
- **Task shape**: `[ID] [P?] [US?] <what> — <screen or module>, <items>; files: …`. `[P]` only
  for tasks on different folders; the copy tasks of phase 5 are parallel by screen, at most three
  at a time (Figma is not read in phase 5; the browser checks are).
- **Agents**: `speckit-task-xhigh` for the foundations' provider and resolver (the first render
  and the storage), the backend's middleware and handler resolution (V2, V3), `RulesProblem.code`
  and the comparisons (R10); `speckit-task-high` for the switch (Figma), the rules composers
  (German grammar, plural forms) and the screens' German checks; `speckit-task-medium` for the
  catalog's and option sets' labels, the message `Text`s per service, the docs.
- **German is written in the task that makes the table**, from the glossary; a term the glossary
  lacks is added to the glossary in the same task, never translated ad hoc; every German string
  differs from the English one unless it is in `copy.test.ts`'s allowlist.
- **English stays word for word** (FR-014): a task that changes an English string stops and
  reports; the existing English assertions in tests are not edited, only given `'en'`.
- **Behaviour stays the baseline's**: a reducer, hook or helper keeps its tests passing; a code
  replaces a string comparison without changing the branch taken (R10).
- **Nothing logged, stored or sent** about the language, findings, personas or local drafts; the
  MCP's output stays English; `/api/connect/` stays English.
- **Gates**: every task in a Node package passes `npm run lint`, `npm test` and `npm run build`
  from the root; every backend task passes Ruff, mypy and pytest; the fixture task runs
  `uv run python -m scripts.export_check_fixtures --check`; nothing commits (git is unreachable
  here).
- **The last task applies the documentation checklist**: `docs/ARCHITECTURE.md` (a "Languages
  (spec 009)" section: the provider and the stored choice, the header and the switch, the copy
  tables and `useCopy`, the rules' `language`, the backend's `Text`, middleware and `label_of`,
  what stays English, the parity fixture; the frontend section's layouts and the error handling's
  `Text`), `CLAUDE.md` (one-line rules: "copy lives in `defineTexts(en, de)` tables next to the
  component and is read with `useCopy()`; a helper that builds text takes `language`"; "the rules'
  composers take the language and default to English; the MCP never passes one"; "server messages
  are `Text(en, de)` resolved by `errors.py`; `/api/connect/` is always English"; "only
  `useLocalDraftStore`, `useRememberedHomepage` and `LanguageProvider` touch `localStorage`"; the
  fixture command), `README.md` (the header, the fixture), spec 001's 001-S7.9 and spec 008's F6
  ("superseded by spec 009").

## Constitution Check: after Phase 1 design

- **Contracts** ([contracts/](contracts/)): a UI contract (the switch), a glossary, an API
  behaviour contract (the header and what it changes: texts only, no shapes) and the rules
  package's text API; no response shape changes, so Principle I is untouched; the `error` codes
  stay English and the MCP keeps branching on them.
- **Data model** ([data-model.md](data-model.md)): no schema; the choice is one `localStorage`
  key confined to one provider; the language is React state and a `ContextVar`, never a column
  or a log line (structure, III, FR-018).
- **Tests**: the type checker and `copy.test.ts` for completeness, German cases beside the English
  ones, pytest for the header, the generated parity fixture with `--check`; no DOM test, no
  `vitest.config.ts` (III).
- **Dependencies**: none added; `Intl`, `localStorage`, `navigator.language`, the `storage`
  event and a `ContextVar` are built in (IV).
- **Structure**: new folders only for the switch, the provider and the pure resolver; copy stays
  in the sibling files; the rules' texts stay in their composing modules; the backend's leaf
  module imports nothing from the app, as `errors.py` requires; Tailwind only, one `@theme` token
  (structure, workflow).
- **Logging and data**: nothing about the language is logged or sent; findings, personas and
  local drafts stay unlogged and unsent (specs 003–005, FR-018).

**Gate result (after design)**: PASS under constitution 1.2.0, with no violations.

## Complexity Tracking

No constitution violations, so nothing needs justifying here. Three judgment calls are the
record, for the user to confirm or reverse by amending the spec or the glossary:

| Decision | Why | What the alternative would be |
|---|---|---|
| The switch's inactive label uses `text-kern-layout-text-muted` (#4a5468) instead of the design's #6b7380 (4.38:1 on the pill, under AA for 14 px) | spec 008's AA rule (Clarification 2026-11-06 #2): fix to the nearest passing value and tell the designer | keep #6b7380 and accept a failing pair (FR-015 forbids it) |
| The switch's current label uses the ink token (#0b1220) instead of the design's tokenless #1f2433 | a `@theme` token for an invisible difference would outlive its reason; KERN's ink is what every other label uses | mint `--color-segment-text` with #1f2433 (FIGMA-WORKFLOW §2's letter) |
| The glossary's contested terms: "Anbindung", "Befund", "Beispielperson", "Freigabeanfrage", "Zugriffsstufe" (research R3) | one translation per term across four sources; **accepted by the user on 2026-11-09** in place of a team review, since no reviewer is available (design-notes §3.1) | the team's own words, applied to the glossary first if the walk of SC-006 finds better ones |
