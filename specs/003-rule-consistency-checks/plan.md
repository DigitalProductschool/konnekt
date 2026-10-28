# Implementation Plan: Conflict and Redundancy Checks for Rules

**Branch**: `003-rule-consistency-checks` (spec header: `rules-check`) | **Date**: 2026-10-28 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/003-rule-consistency-checks/spec.md`, with its 15
Clarifications of 2026-10-28, and the Figma audit [figma-audit/report.md](figma-audit/report.md)
(F1–F8, W1–W16).

**Note**: this checkout's `.git` points to a worktree path that doesn't exist here, so git couldn't
confirm the branch; `setup-plan.sh` resolved the feature from `.specify/feature.json`.

## Summary

The rules step checks every branch's rules for **conflicts** (rules and groups that no applicant
can meet together), **redundancy** (rules and groups whose deletion changes no outcome) and items
that are **always met**, at the top level, in groups and in sub-groups. The checks run after every
change, without being asked. Findings are marked on the rules and groups, summarised above the
rules, shown on the variant tabs, announced to screen readers and listed in the publish and save
dialog. They never block anything, are never stored and never reach serviceBW.

**Technical approach** (research R1–R14):
- **Where**: pure TypeScript in `frontend/src/utils/rules/checks/`, run in a Web Worker started
  by the editor. No new endpoint. Findings never leave the tab (R1).
- **What**: each branch's checked tree, made of the items that count (spec 002's
  `effectiveItems`) without the rules that have problems, with a fingerprint for caching (R2).
- **How**: rules become literals over independent variables (R3). The spec's definitions become
  satisfiability questions, asked for today or for every day from today on (R4). A small
  tableau solver answers them (R5), with exact decision procedures for numbers, enums, dates
  (including the day of sharing as a range) and text (R6, R7). Findings come from smallest-set
  searches and a reverse-order pass over a working tree, which makes "deleting all redundant
  items at once changes nothing" hold by construction (R8).
- **Parity with the evaluator** (FR-007): the same calendar arithmetic, and Python's own
  `str.casefold()` as a generated table. JavaScript's tools put 59 code points, ẞ among them, into
  different classes. Python-generated vectors pin both, with a drift check (R7, R13).
- **One API change**: the catalog marks the fields that hold several values (`multiple_values`),
  returned by `GET /api/document-types` (R9).
- **Running**: a hook in the editor page sends changed branches to the worker, shown branch
  first. It has a 5-second deadline per run and a watchdog, keeps the previous findings while a
  check runs, and diffs results for the status region (R10, R11).
- **UI**: spec.md decides behaviour and wording, Figma layout and styling.
  [contracts/ui-screens.md](contracts/ui-screens.md) lists F1–F8 and W1–W16 per screen, and
  **every UI task cites the items it covers** (R14).

## Technical Context

**Language/Version**: TypeScript 6.0 with React 19.2 (frontend), where the checks live; Python 3.13
(backend), for the catalog attribute and the fixture generator.

**Primary Dependencies**: unchanged. The worker uses the browser's Web Worker API with Vite's
built-in worker bundling (`new Worker(new URL(…), { type: 'module' })`). There is no new runtime or
development dependency: no solver library and no case-folding package (research R5, R7).

**Storage**: none. Findings exist in memory only (FR-019). The catalog's `multiple_values` is code;
there is no migration ([data-model.md](data-model.md)).

**Testing**: Vitest, a gate, in the `node` environment, for every module of `checks/`. They include
spec scenario tests, a brute-force oracle with seeded random branches (SC-001, SC-002), Python
vectors for text and calendar parity, and performance budgets (SC-003). pytest covers the catalog
attribute and the fixtures' drift check. Manual scenarios V1–V8 in [quickstart.md](quickstart.md)
cover the worker, the UI, the status region and accessibility (research R13).

**Target Platform**: unchanged: DO.IT's evergreen desktop browsers, which all support module Web
Workers; Linux containers behind nginx.

**Project Type**: web application (React SPA behind nginx, FastAPI backend, PostgreSQL).

**Performance Goals**: findings update within 1 second for 95 % of changes to branches of up to 50
items. Every branch is checked, or reported as not checked completely, within 5 seconds of a change
at spec 002's limit of 200 items per branch and 20 branches (SC-003). The main thread never waits
(FR-010).

**Constraints**:
- **Exactness**: no untrue finding, none missed (FR-010, SC-001). Undecidable corners and timeouts
  report "couldn't be checked completely" instead of guessing (research R5, R7, R8).
- **Parity**: findings judge conditions as `evaluation.py` does (FR-007); the fixtures are
  generated from the backend's interpreter.
- **Privacy**: nothing stored, sent, logged or shown outside the rules step and the dialog (FR-018
  to FR-020).
- **Accessibility**: WCAG 2.1 AA; the kind of a finding never rests on colour alone (FR-012,
  SC-006).
- **Design**: spec over Figma for behaviour and wording; F1–F8 and W1–W16 apply.

**Scale/Scope**: one team; branches of a few dozen rules in practice, at most 200 items and 20
branches. New: one module folder (about 15 pure modules with tests), one hook, four small
components, changes to the rule row, group frame, tabs and dialog, one catalog attribute, one
developer script.

**Open points**: none (all resolved in [research.md](research.md)). The points to check while
coding are in research R15: KERN 2.8's warning icon and its text contrast, how the worker's global
scope is typed, the delivered type of the number fields, the worker's chunk under nginx, the group
header's focus target, and how screen readers read announcements that follow each other quickly.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design below.*

Checked against constitution v1.1.0 (`.specify/memory/constitution.md`).

| Principle or rule | How the plan complies | Result |
|---|---|---|
| **I. Contract parity** | The only shape change, `multiple_values` on `DocumentField` and `FieldPart`, is made in `schemas.py` and mirrored in `frontend/src/types/document-types.ts` in the same change ([contracts/management-api.md](contracts/management-api.md)). No new endpoint, no new error | PASS |
| **II. Sync persistence (NON-NEGOTIABLE)** | No database access is added; the catalog is code | PASS |
| **III. Quality gates** | Every checks module is pure logic in `src/` with its `*.test.ts` beside it, run by `npm test` in `node`; no jsdom; no `vitest.config.ts`, no `pytest.ini`. The worker entry and the hook are glue code, covered by lint, build and quickstart. Backend: Ruff, mypy (`app/ scripts/ tests/`), pytest as a practice | PASS |
| **IV. Dependencies and config** | No new dependency of any kind, no setting, no environment variable. The case-folding table is generated code, not a package | PASS |
| **V. Schema evolution** | No model or migration change | PASS |
| **Technology and structure** | Stack unchanged. Logic in `src/utils/rules/checks/`, the hook in `src/hooks/`, components in `src/components/` and the rules step's folder. Small components (summary, note, tab icon, dialog line); list items as sub-components; sibling `types.ts`, `constants.ts`, `utils.ts`; the hook's related state through `useReducer` with a pure reducer (`runState.ts`); Tailwind only, no inline styles, no `any` | PASS |
| **Logging** | Nothing is logged, in the browser or on the server. Findings never leave the tab | PASS |
| **Workflow and documentation** | Backend: catalog → schema → router (no model, no migration); frontend: types → api (unchanged) → logic → components. Documentation checklist: `CLAUDE.md` (the checks modules and their rules, the structure listing, the fixture script in the command table, regenerating after a Python upgrade), `docs/ARCHITECTURE.md` (checks in the browser's worker, nothing stored or sent), `README.md` (the fixture script). No new variable or dependency | PASS |

**Gate result (before research)**: PASS, with no violations to justify.

## Project Structure

### Documentation (this feature)

```text
specs/003-rule-consistency-checks/
├── spec.md              # Feature spec with Clarifications (2026-10-28)
├── plan.md              # This file
├── research.md          # Phase 0: decisions R1–R15
├── data-model.md        # Phase 1: catalog attribute, checked tree, literals, findings, run lifecycle
├── quickstart.md        # Phase 1: automated checks and validation scenarios V1–V8
├── contracts/           # Phase 1
│   ├── management-api.md    # GET /api/document-types: multiple_values (the only API change)
│   ├── rule-checks.md       # The checks' functions, worker protocol and hook
│   └── ui-screens.md        # S2–S7 behaviour, "Deviations from Figma" (F1–F8, W1–W16), copy
├── design-notes.md      # Written by the first UI task: the copy the decisions leave open (research R12)
├── figma-audit/         # The audit (report.md, units, tree)
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 output (/speckit-tasks, not created here)
```

### Source Code (repository root)

```text
backend/
├── app/
│   ├── catalog.py                # + multiple_values on CatalogField and CatalogPart (pid.nationalities,
│   │                             #   mdl.driving_privileges.classes)
│   └── schemas.py                # + DocumentField.multiple_values, FieldPart.multiple_values
├── scripts/
│   └── export_check_fixtures.py  # new: writes the case-folding table and the evaluator vectors; --check
└── tests/
    ├── unit/test_check_fixtures.py   # new: the committed fixtures match the interpreter and evaluator
    └── api/ + unit/              # catalog and /api/document-types cover multiple_values

frontend/src/
├── types/document-types.ts       # + multiple_values on DocumentField and FieldPart
├── utils/rules/
│   ├── testData.ts               # + multiple_values in the test catalog
│   └── checks/                   # new; each module with its *.test.ts beside it
│       ├── types.ts, constants.ts       # shapes of data-model.md; deadline and search budgets
│       ├── checkedTree.ts        # buildCheckedBranch: counted items, rules left out, fingerprint (R2)
│       ├── literals.ts           # rules → literals and formulas, negation, class dates (R3)
│       ├── calendar.ts           # day numbers, years_after/months_after with the 9999 clamp (R6)
│       ├── numberTheory.ts, enumTheory.ts, dateTheory.ts, textTheory.ts   # per-variable decisions (R6, R7)
│       ├── text.ts               # normalisedText as _normalised_text (R7)
│       ├── caseFolding.ts        # generated by backend/scripts/export_check_fixtures.py; never edited
│       ├── solver.ts             # tableau search, independent parts, day ranges, deadline (R5)
│       ├── findings.ts           # checkBranch: conflicts, notices, always met, redundancy, reasons (R8)
│       ├── findingMessages.ts    # every finding text (R12)
│       ├── announcements.ts      # status region diff (FR-015)
│       ├── runState.ts           # the hook's reducer: runs, results by branch, cache (R10)
│       ├── worker.ts             # the module worker's entry (glue, not unit-tested)
│       ├── testEvaluator.ts, testOracle.ts   # test support: evaluator port and brute-force oracle
│       ├── scenarios.test.ts, oracle.test.ts, performance.test.ts
│       └── fixtures/evaluator-vectors.json   # generated, test-only
├── hooks/useRuleChecks.ts        # new: worker lifecycle, deadline watchdog, today, results (R10)
├── components/
│   ├── FindingNote/              # new: the note under a rule or group header, warning or info look
│   ├── RuleRow/                  # + optional `finding` prop (outline + FindingNote)
│   └── GroupFrame/               # + optional `finding` prop
└── pages/FormConnectionEditor/
    ├── index.tsx                 # useRuleChecks; passes results to the Rules step and the dialog;
    │                             #   the status region (FindingsAnnouncer)
    ├── FindingsAnnouncer.tsx     # new: polite role="status" region
    ├── PublishDialog.tsx         # + findings lines; "Check rules again" opens the first branch with findings
    ├── PublishFindingLine.tsx    # new: one branch's line
    └── RulesStep/
        ├── FindingsSummary.tsx   # new: KERN warning/info alert, counts, notice, "Go to next finding"
        ├── BranchTab.tsx         # + findings icon with its text alternative
        └── RuleListItem.tsx, GroupListItem.tsx, TreeItem.tsx   # pass each item's finding down
```

**Structure Decision**: the web-application layout of specs 001 and 002 stays. The checks are a
folder of their own inside `utils/rules/`, beside the modules they build on (`tree.ts`,
`conditions.ts`, `validation.ts`, `dates.ts`), so that every module is pure and tested. The worker
entry and the hook are the only code that touches browser APIs. UI changes extend the shared
`RuleRow` and `GroupFrame` with an optional prop that only the rules step passes, so the details
stay without findings. The backend gains one catalog attribute and one developer script.

## Rules for `/speckit-tasks`

- **Every UI task cites the F# and W# items it covers**, from
  [contracts/ui-screens.md](contracts/ui-screens.md), with its screen id (S2–S7), such as "Build the
  sub-group's conflict mark (S2; F4, F6)". Every item of the coverage index is cited by at least one
  task. UI tasks follow CLAUDE.md's "Figma implementation workflow" on section `6171:6748`, and
  their visual check lists the prescribed differences, and "KERN 2.8 vs Revamp" values, by item
  instead of fixing them.
- **The first UI task writes `design-notes.md`** with the copy research R12 lists, before
  `findingMessages.ts` is completed.
- **Order**: the catalog attribute and its TS mirror, then the fixture script and its generated
  files, then the checks modules bottom-up (calendar, text, theories, literals, checked tree,
  solver, findings, messages, announcements, run state), then the worker and the hook, then the UI.
  The scenario and oracle tests come with `findings.ts`, not after the UI.
- **Each task that writes a module of `checks/` writes its `*.test.ts` with it.** `findings.ts`
  isn't done until `scenarios.test.ts` covers every acceptance scenario and edge case of the spec
  that a rule set expresses, and `oracle.test.ts` passes with at least several thousand seeded
  branches.
- **No hand edits of generated files**: `caseFolding.ts` and `fixtures/evaluator-vectors.json`
  change only through `uv run python -m scripts.export_check_fixtures`.
- Every frontend task passes `npm run lint`, `npm test` and `npm run build`; every backend task
  `uv run mypy app/ scripts/ tests/`. The last task applies the documentation checklist (CLAUDE.md,
  docs/ARCHITECTURE.md, README.md).

## Constitution Check: after Phase 1 design

- [contracts/management-api.md](contracts/management-api.md): one additive attribute, mirrored in
  the same change; envelopes unchanged; serviceBW's contract untouched (I).
- [data-model.md](data-model.md): no table, column or migration (II, V).
- [contracts/rule-checks.md](contracts/rule-checks.md): pure functions with an injected clock, so
  that the deadline is tested in `node`. The worker protocol is plain messages, and the hook's state
  is a reducer of pure functions (III, structure).
- No dependency, setting or environment variable is added. The generator is a developer script in
  `backend/scripts/` that `app/` never imports, and its outputs are committed and checked for
  drift (IV).
- Nothing is logged or sent. Findings stay in the tab (logging rule; FR-018 to FR-020).

**Gate result (after design)**: PASS, with no violations.

## Complexity Tracking

No constitution violations, so nothing needs justifying here.
