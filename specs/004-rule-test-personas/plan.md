# Implementation Plan: Test Rules with Personas

**Branch**: `004-rule-test-personas` (spec header: `rules-tests`) | **Date**: 2026-11-01 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/004-rule-test-personas/spec.md`, with its
Clarifications of 2026-10-29 and 2026-11-01, and the Figma audit
[figma-audit/report.md](figma-audit/report.md) (F1–F14, W1–W13, K1–K4).

**Note**: this checkout's `.git` points to a worktree path that doesn't exist here, so git couldn't
confirm the branch. `setup-plan.sh` resolved the feature from `.specify/feature.json`.

## Summary

The create and edit flow gets a **test step** between the rules step and publishing. The system
makes up three personas: fictitious applicants with a value for exactly the data that the rules
check. It shows, for each persona and each variant, whether the persona meets the rules and, if not,
which rules it fails and the messages the form would show. The team member can edit the personas,
or generate them anew. The personas survive round trips to the rules step, gain values for data that
new rules check, and are discarded with the flow. Nothing is stored, sent or logged. Publishing and
saving move to the test step, which never refuses or delays them.

**Technical approach** (research R1–R16):
- **Where**: pure TypeScript in a new folder, `frontend/src/utils/rules/personas/`. Generation runs
  in a module Web Worker, and evaluation runs on the main thread at every change. There is no
  endpoint and nothing is stored (R1).
- **Exactness**: spec 003's port of `evaluation.py` (`checks/testEvaluator.ts`) becomes production
  code as `utils/rules/evaluation.ts` and gains `_messages()`. New whole-branch vectors, generated
  from the backend's evaluator, pin its outcomes, reported items and messages (R2).
- **What a persona has**: the variables of the rules that count in some branch, via spec 003's
  `buildCheckedBranch()`, plus the licence classes when a class's date is checked. They are ordered
  by the catalog and named as the rules name them (R3). Values map onto the documents that the
  evaluator reads (R4).
- **Generation** plans with spec 003's solver:
  - **Goals 1 to 3**: an exact search over which branches each persona meets, its outcome vector,
    compared goal by goal (R6).
  - **Goal 4**: greedy over rules and groups, with random restarts (R7).
  - **Values**: chosen by random self-reduction to literals, then sampled. Agreement between fields
    comes first, then order and plausibility, and each value is verified by the theories' `holds()`
    (R7).
  - **Fixed values** (one persona anew, filling new data) enter by substitution through the
    evaluator (R8).
- **Running**: `usePersonas()` in the editor page, with a pure reducer. It runs one run at a time,
  merges requests, has a 4.5-second stop, a 5.5-second watchdog and a failure state, and loads the
  evaluator lazily (R9, R10).
- **Wizard**: the rules step's "Test rules" goes through publishing's checks. The test step's
  "Publish" / "Save" opens the unchanged dialog (R11). Editing happens in the panel and applies at
  once (R12).
- **UI**: spec.md decides what the step does, and Figma section `7057:58708` decides how it looks,
  with the audit's items. [contracts/ui-screens.md](contracts/ui-screens.md) lists them per screen,
  and **every UI task cites the items it covers** (R15).

## Technical Context

**Language/Version**: TypeScript 6.0 with React 19.2 (frontend), where the feature lives. Python
3.13 (backend), only for the fixture generator.

**Primary Dependencies**: unchanged. The worker uses Vite's built-in worker bundling, as spec 003's
does. The feature adds no runtime or development dependency: no fake-data library, random generator
or solver (research R7).

**Storage**: none. Personas and results live in memory for the flow only (FR-019, FR-021). No
table, column or migration ([data-model.md](data-model.md)).

**Testing**: Vitest, a gate, in the `node` environment, for every module of `personas/` and for
`evaluation.ts`. The tests include:
- Python's whole-branch vectors (SC-001);
- spec scenario tests;
- a generation test whose ground truth for goals 1 to 3 comes from spec 003's brute-force oracle
  (SC-002);
- property tests (FR-010, FR-012, FR-020);
- performance budgets (SC-003).

pytest covers the fixtures' drift. Manual scenarios V1–V10 in [quickstart.md](quickstart.md) cover
the worker, the UI, accessibility, usability and privacy (research R14).

**Target Platform**: unchanged: DO.IT's evergreen desktop browsers, which all support module Web
Workers; Linux containers behind nginx.

**Project Type**: web application (React SPA behind nginx, FastAPI backend, PostgreSQL).

**Performance Goals** (SC-003):
- In branches of up to 50 items, the personas and their results appear within 2 seconds of the step
  opening, and results update within 1 second of each change. Evaluation takes milliseconds.
- Generation ends within 5 seconds at spec 002's limits, and nothing but the persona being generated
  waits for it.

**Constraints**:
- **Exactness**: results equal the evaluation's (FR-014). Generation's goals are compared in order
  and never traded (FR-011).
- **Privacy**: nothing stored, sent or logged. Personas exist only in the signed-in editor's test
  step (FR-021).
- **Never in the way**: results refuse, delay and disable nothing (FR-003).
- **Accessibility**: WCAG 2.1 AA. Outcomes are never shown by colour alone (FR-015, SC-007).
- **Design**: Figma's test step, changed by F1–F14, with W1–W13 built without frames. The page
  around it stays as built (O1–O6).

**Scale/Scope**: one team; three personas; branches of a few dozen rules in practice, at most 200
items and 20 branches. New:
- one folder of about 14 pure modules with their tests;
- one moved module, the evaluator;
- two hooks;
- one step of about 20 small components;
- changes to the editor page, its footer, constants and reducer;
- one key in the fixture script.

**Open points**: none; all are resolved in [research.md](research.md). The points to check while
coding are in research R16:
- reusing the rule editor's values picker;
- the chunks `vite build` emits;
- exporting spec 003's notice text;
- a group's statement;
- the chips' keyboard pattern;
- two status regions;
- the date input;
- the vector search's time at 20 branches.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design below.*

Checked against constitution v1.1.0 (`.specify/memory/constitution.md`).

| Principle or rule | How the plan complies | Result |
|---|---|---|
| **I. Contract parity** | No request or response shape changes, and no endpoint is added. The evaluator's browser port is pinned to `evaluation.py` by generated vectors, which is parity with the backend's behaviour, not with an API shape | PASS |
| **II. Sync persistence (NON-NEGOTIABLE)** | No database access is added | PASS |
| **III. Quality gates** | Every module of `personas/` and `evaluation.ts` is pure logic in `src/`, with its `*.test.ts` beside it, run by `npm test` in `node`. No jsdom, no `vitest.config.ts`, no `pytest.ini`. The worker entry, the hooks and the components are glue, covered by lint, the build and the quickstart. Backend: Ruff and mypy (`app/ scripts/ tests/`), with pytest as a practice | PASS |
| **IV. Dependencies and config** | No dependency, setting or environment variable. The name and text pools are code; the random generator is a few lines. The vectors are generated code, not a package | PASS |
| **V. Schema evolution** | No model or migration change | PASS |
| **Technology and structure** | Stack unchanged. Logic in `src/utils/rules/personas/` (and `src/utils/rules/evaluation.ts`), the hooks in `src/hooks/`, the step in `src/pages/FormConnectionEditor/TestStep/`. Small components. Every list (chips, tabs, rows, fields, documents) is a sub-component. Sibling `types.ts`, `constants.ts` and `utils.ts`. Related state goes through `useReducer` with pure reducers (`personaState.ts`, and the panel's drafts). Tailwind only, no inline styles, no `any`, no `require()` | PASS |
| **Logging** | Nothing is logged in the browser or on the server: no `console.*` in `personas/`, the worker or the hooks | PASS |
| **Workflow and documentation** | Frontend: types → logic → hooks → components (no API module, as there is no API change). Backend: the developer script only. Documentation checklist (last task): `CLAUDE.md` (the personas' rules, the evaluator's new place), `docs/ARCHITECTURE.md` (the test step, generation in a worker, nothing stored or sent), `README.md` (the fixture script's new vectors). No new variable or dependency | PASS |

**Gate result (before research)**: PASS, with no violations to justify.

## Project Structure

### Documentation (this feature)

```text
specs/004-rule-test-personas/
├── spec.md              # Feature spec with Clarifications (2026-10-29, 2026-11-01)
├── plan.md              # This file
├── research.md          # Phase 0: decisions R1–R16
├── data-model.md        # Phase 1: persona fields, values, personas, state, results, generation shapes, vectors
├── quickstart.md        # Phase 1: automated checks and validation scenarios V1–V10
├── contracts/           # Phase 1
│   ├── personas.md          # The evaluator, the pure functions, the worker protocol, usePersonas()
│   └── ui-screens.md        # S0, S1, S2, S5, S7 changes; S8 test step; items F#, W#, K#, O#; copy
├── design-notes.md      # Written by the first UI task: the copy the decisions leave open (research R13)
├── figma-audit/         # The audit (report.md, units, tree)
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 output (/speckit-tasks, not created here)
```

### Source Code (repository root)

```text
backend/
├── scripts/
│   └── export_check_fixtures.py   # + branch_evaluations: evaluate_branch() on hand-written branches (R2)
└── tests/unit/test_check_fixtures.py   # unchanged; its drift check now covers branch_evaluations

frontend/src/
├── utils/rules/
│   ├── evaluation.ts             # moved from checks/testEvaluator.ts; + messages (_messages) (R2)
│   ├── evaluation.test.ts        # moved from checks/testEvaluator.test.ts; + branch_evaluations replay
│   ├── checks/
│   │   ├── testOracle.ts         # imports the evaluator from ../evaluation
│   │   ├── findingMessages.ts    # exports noticeText() for the test step (R5)
│   │   └── fixtures/evaluator-vectors.json   # regenerated with branch_evaluations; never edited
│   └── personas/                 # new; each module with its *.test.ts beside it
│       ├── types.ts, constants.ts       # shapes of data-model.md; deadlines, budgets, plausible ranges, agreeing fields
│       ├── fields.ts             # personaFieldsOf: the data a persona has (R3)
│       ├── applicant.ts          # applicantOf: persona → documents for the evaluator (R4)
│       ├── results.ts            # testResultsOf, resultViewOf (R5); loaded with import()
│       ├── random.ts             # seeded generator (R7)
│       ├── substitute.ts         # fixed values into formulas, through ruleOutcome() (R8)
│       ├── goals.ts              # branch classes, realizable vectors, targets, score (R6)
│       ├── models.ts             # modelOf: random self-reduction over satisfiable() (R7)
│       ├── samples.ts            # name and text pools, by field (data)
│       ├── sampling.ts           # values from a model: agreement, order, plausibility, boundaries, witness (R7)
│       ├── generation.ts         # generatePersonas: fallback, plan, sample, evaluate, best by deadline (R6–R8)
│       ├── messages.ts           # every persona text built from data (R13)
│       ├── announcements.ts      # status region text after an edit (FR-017)
│       ├── personaState.ts       # the hook's reducer: personas, runs, selection, edit mode, questions (R10)
│       ├── worker.ts             # the module worker's entry (glue, not unit-tested)
│       ├── scenarios.test.ts, generation.test.ts, performance.test.ts
│       └── (tests reuse checks/testOracle.ts for SC-002's ground truth)
├── hooks/
│   ├── useTodayInGermany.ts      # new: today in Germany, refreshed; extracted from useRuleChecks (R9)
│   ├── useRuleChecks.ts          # uses useTodayInGermany
│   └── usePersonas.ts            # new: worker lifecycle, watchdog, seeds, lazy results, reducer (R9)
├── constants.ts                  # CONNECTION_STEPS + 'Test'
└── pages/FormConnectionEditor/
    ├── index.tsx                 # usePersonas; the test step; "Test rules" through leaveEditor;
    │                             #   shared pre-checks; "Check rules again" from the test step (R11)
    ├── EditorFooter.tsx          # rules: "Test rules" / "Publish without rules"; test: Back, "Publish" / "Save"
    ├── constants.ts, types.ts, utils.ts   # STEP_ORDER + 'test'; EditorStep; pageTitleOf('test')
    ├── RulesStep/types.ts        # LeaveEditorAction + { type: 'test' }
    └── TestStep/                 # new (S8): small components, types.ts, constants.ts, utils.ts (+ test)
        ├── index.tsx             # layout, states (loading, failure, results), status regions
        ├── TestDayLine.tsx, VariantTabs.tsx, VariantTab.tsx
        ├── ApplicantsRow.tsx, PersonaChip.tsx, GenerateAllButton.tsx
        ├── PersonaPanel.tsx, PersonaHead.tsx, PersonaData.tsx, DocumentValues.tsx, ValueRow.tsx
        ├── PersonaEditor.tsx, ValueField.tsx, DateOfBirthField.tsx, ChoiceField.tsx, ValuesField.tsx
        ├── ResultSection.tsx, ResultTable.tsx, ResultRow.tsx, MemberRows.tsx
        ├── PersonaPlaceholder.tsx, GenerationFailed.tsx, RegenerateDialog.tsx, PersonasAnnouncer.tsx
        └── utils.ts              # parseDisplayDate, formatDisplayDate, parseWholeNumber, dateOfBirthForAge, nameProblem
```

**Structure Decision**: the web-application layout of specs 001 to 003 stays.
- **Logic**: the personas get a folder of their own inside `utils/rules/`, beside `checks/`, whose
  solver, theories, calendar and checked trees they build on, so that every module is pure and
  tested.
- **The evaluator** moves out of `checks/` to `utils/rules/evaluation.ts`, mirroring
  `backend/app/services/evaluation.py`, since the oracle and the test step both use it.
- **Browser APIs**: the worker entry and the two hooks (`usePersonas()`, `useTodayInGermany()`) are
  the only code that touches them.
- **UI**: the test step is a folder of the editor page, like `RulesStep/`, and reuses
  `BranchName`, `InfoTooltip`, `RuleSentence`, `ConfirmDialog` and the rule editor's values picker.
- **Backend**: no app code changes; the fixture script gains one key.

## Rules for `/speckit-tasks`

- **Every UI task cites the F#, W#, K# and O# items it covers**, from
  [contracts/ui-screens.md](contracts/ui-screens.md), with its screen id (S0, S2, S5, S7, S8.x),
  such as "Build the result table (S8.6; F3, F8, F14, W10)". Every item of the coverage index is
  cited by at least one task. UI tasks follow `docs/FIGMA-WORKFLOW.md` on section `7057:58708`.
  Their visual check lists, by item, the differences that the O items or "KERN 2.8 vs Revamp"
  explain, instead of fixing them.
- **The first UI task writes `design-notes.md`** with the copy that research R13 lists, before
  `personas/messages.ts` is completed.
- **Order**:
  1. the whole-branch vectors (script, then the regenerated fixture);
  2. the evaluator's move and `_messages()`, with the replay;
  3. the personas' modules, bottom-up: `random`, `fields`, `applicant`, `results`, `substitute`,
     `goals`, `models`, `samples`, `sampling`, `generation`, `messages`, `announcements`,
     `personaState`;
  4. the worker, `useTodayInGermany` and `usePersonas`;
  5. the wizard's changes (step, footer, gate, dialog's way back);
  6. the test step's UI;
  7. the documentation.

  `scenarios.test.ts` and `generation.test.ts` come with `generation.ts`, not after the UI.
- **Each task that writes a module of `personas/` writes its `*.test.ts` with it.**
  `generation.ts` isn't done until three tests pass:
  - `generation.test.ts`, with at least several hundred seeded rule sets against the oracle (SC-002);
  - `scenarios.test.ts`, covering every acceptance scenario and edge case that a rule set expresses;
  - `performance.test.ts`.
- **No hand edits of generated files**: `fixtures/evaluator-vectors.json` changes only through
  `uv run python -m scripts.export_check_fixtures`.
- **No `console.*`** in `personas/`, the worker or the hooks, and nothing stored or sent (FR-021).
- **Gates**: every frontend task passes `npm run lint`, `npm test` and `npm run build`, and every
  backend task `uv run mypy app/ scripts/ tests/`. The last task applies the documentation
  checklist (CLAUDE.md, docs/ARCHITECTURE.md, README.md).

## Constitution Check: after Phase 1 design

- [contracts/personas.md](contracts/personas.md): pure functions with an injected clock and seed, so
  that the deadline and the randomness are tested in `node`. The worker protocol is plain messages,
  and the hook's state is a reducer of pure functions (III, structure).
- [contracts/ui-screens.md](contracts/ui-screens.md): no route, endpoint or envelope changes. The
  publish and save dialog is unchanged (I).
- [data-model.md](data-model.md): no table, column or migration (II, V).
- No dependency, setting or environment variable is added. The fixture generator stays a developer
  script in `backend/scripts/` that `app/` never imports, and its output is committed and checked
  for drift (IV).
- Nothing is logged or sent. Personas stay in the tab and end with the flow (logging rule; FR-019,
  FR-021).

**Gate result (after design)**: PASS, with no violations.

## Complexity Tracking

No constitution violations, so nothing needs justifying here.
