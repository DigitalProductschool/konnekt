# Implementation Plan: Rules for Form Connections, with Groups and Branches

**Branch**: `002-connection-rules` (spec header: `rules`) | **Date**: 2026-10-24 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/002-connection-rules/spec.md`, with its
Clarifications of 2026-10-22 to 2026-10-24, and the Figma audit
[figma-audit/report.md](figma-audit/report.md).

**Note**: this checkout's `.git` points to a worktree path that doesn't exist here, so git couldn't
confirm the branch; `setup-plan.sh` resolved the feature from `.specify/feature.json`.

## Summary

DO.IT team members add **rules** to a form connection in a new **Rules step** of the create and
edit wizard, between Documents and Publish. A rule checks one requested field, or one part of it,
with one condition of the field's kind (number, text, enum, date), and has an error message for
the citizen. Rules combine with AND or OR per level, in groups and sub-groups two levels deep.
**Branches** ("variants" in the UI) give one form connection several rule sets: a branch is based
on the main branch, following it except where it changes, removes or adds rules, or starts empty.
When serviceBW pulls a completed request through a branch's pull URL, the answer carries the
documents as before plus the **evaluation** of that branch's rules as they were at the trigger.

**Technical approach** (research R1–R13):
- **Storage**: immutable, numbered **rule sets** beside spec 001's revisions, each a JSONB snapshot
  of every branch and its tree with branch marks; `form_connection_branches` holds branch
  identities for stable pull URLs. Requests record the rule set they started with.
- **Branches**: based branches are stored materialised, with marks. The editor propagates the main
  branch's changes (pure TypeScript functions, unit-tested with Vitest); the server validates
  invariants and refuses an inconsistent snapshot.
- **Evaluation**: a pure Python module, run at each delivery on the documents just read from
  EUDIPLO; dates by Germany's calendar day of sharing; never stored or logged.
- **API**: additive. The pull answer gains `evaluation`; other branches get
  `…/branches/{branch_id}/requests/{reference}`; the management API accepts and returns rules with
  the form connection, saved atomically with its documents.
- **UI**: spec.md decides behaviour and wording, Figma layout and styling only. Figma is out of sync
  and won't be updated soon, so [contracts/ui-screens.md](contracts/ui-screens.md) lists the
  audit's decided deviations (F1–F32, W1–W7) per screen, and **every UI task cites the items it
  covers** (research R13).

## Technical Context

**Language/Version**: Python 3.13 (backend), TypeScript 6.0 with React 19.2 (frontend), as on this
branch.

**Primary Dependencies**: unchanged at runtime. FastAPI, SQLAlchemy 2 (sync `Session`), Alembic,
psycopg 3, Pydantic 2 on the backend; React Router 7, Tailwind 4 and the KERN packages on the
frontend. No runtime dependency is added: time zones come from the standard library's `zoneinfo`
with the image's tz database (verified in `python:3.13-slim`), and the country list is a static
table (research R6, R7). The frontend gains one development dependency, **Vitest**, the test
runner of constitution v1.1.0 (research R12). The dev script `issue_test_credentials` gains two
options (research R12).

**Storage**: PostgreSQL 18. New tables `form_connection_branches` and `form_connection_rule_sets`;
new columns on `form_connections` (`current_rule_set`, `next_rule_number`, `next_group_number`) and
`document_requests` (`rule_set_id`). One migration, which gives existing form connections a main
branch without rules ([data-model.md](data-model.md)). Still no citizen data at rest; evaluations
aren't stored.

**Testing**: pytest unit tests for the evaluator, its date and text edge cases (SC-003), messages,
dissolution, snapshot validation and identifier allocation; pytest API tests for saving, refusals,
atomicity, branch pull URLs and logs; Vitest unit tests for the pure modules in
`frontend/src/utils/rules/` (propagation and marks, dissolution, numbering, statements, messages,
conditions, pre-checks), run with `npm test`; frontend lint, tests and build as gates; manual
scenarios with a real wallet ([quickstart.md](quickstart.md)).

**Target Platform**: unchanged (Linux containers; DO.IT's evergreen desktop browsers; citizens'
EUDI wallets talk only to EUDIPLO).

**Project Type**: web application (React SPA behind nginx, FastAPI backend with its worker,
PostgreSQL).

**Performance Goals**: rules don't delay results: 95% within 5 seconds of approval, as in spec 001
(SC-004). Evaluation is in-memory over a few dozen rules.

**Constraints**:
- **Compatibility**: every existing URL and answer field stays; `evaluation` is additive (FR-010,
  FR-018, SC-005).
- **Personal data**: the evaluation contains no field values, isn't stored or logged, and goes
  with the documents (FR-017).
- **Atomicity**: documents, branches and rules are saved together or not at all (FR-028).
- **Snapshot**: requests use the rules of the trigger time (FR-025, FR-028).
- **Accessibility**: WCAG 2.1 AA (SC-009); marks never by colour alone (FR-023).
- **Design**: spec over Figma for behaviour and wording; F1–F32 and W1–W7 apply.

**Scale/Scope**: one team; tens of form connections, each with a few branches and a few dozen
rules (server limits: 20 branches, 200 items per branch); one new wizard step and its dialogs; the
details' URLs and rules card.

**Open points**: none (all resolved in [research.md](research.md)). Points to check while coding
are in research R14: the PID's `sex` codes, the licence class list and descriptions, EUDIPLO's mdoc
fix, the claim shapes, serviceBW's use of the evaluation (DO.IT), and a Vitest release that
supports Vite 8.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design below.*

Checked against constitution v1.1.0 (`.specify/memory/constitution.md`), which makes the
frontend's tests a gate. (The plan was first checked against v1.0.1; v1.1.0 changes the rows III,
IV, Tests, and Workflow and documentation.)

| Principle or rule | How the plan complies | Result |
|---|---|---|
| **I. Contract parity** | New shapes (`DocumentField` kinds and parts, `OptionSet`, rules, branches, `evaluation`) are Pydantic schemas in `schemas.py`; the management shapes are mirrored in `frontend/src/types/` in the same change. The serviceBW shapes are documented in [contracts/integration-api.md](contracts/integration-api.md). Every answer uses `{data, message?}` or `{error, message}` through `HTTPException`, including the new `409 branch_added_later` | PASS |
| **II. Sync persistence (NON-NEGOTIABLE)** | Handlers stay plain `def` with `Depends(get_db)`; `select()`, `db.get()`, `db.scalars()` only. The rules save extends `create_revision`'s ordering: no transaction is held while EUDIPLO answers; rows are locked with `with_for_update` before the final commit | PASS |
| **III. Quality gates** | Ruff, mypy (`app/ scripts/ tests/`), ESLint, Prettier, `npm test` and the build. Vitest is configured in the `test` block of `frontend/vite.config.ts` with the `node` environment; no `vitest.config.ts`, no `pytest.ini` | PASS |
| **IV. Dependencies and config** | No new runtime dependency and no new setting. One development dependency, `vitest`, imported by the frontend's tests and documented in `README.md` with its reason. `zoneinfo` is standard library; the country list is code | PASS |
| **V. Schema evolution** | One autogenerated migration, completed by hand for the data step (main branch and rule set 1 per form connection) and reviewed; committed migrations untouched. New tables use UUID4 `String(36)` keys, `created_at`/`updated_at`, `snake_case`, and indexes on looked-up columns (data-model.md, "Indexes"). No `datetime.utcnow()` | PASS |
| **Technology and structure** | Stack as in v1.1.0: Vitest, now part of it, is installed by this feature; no jsdom. Routers stay one per resource: the branch pull URL joins `routers/connect.py`, `GET /api/option-sets` joins `routers/document_types.py`. Domain logic in `app/services/` (`rules.py`, `evaluation.py`). Frontend: `useReducer` for the rules step and the rule editor; list items as sub-components; sibling `types.ts`, `constants.ts`, `utils.ts`; no inline styles, no `any` | PASS |
| **Logging** | `logging` only. No claims, references, evaluations or messages in logs (FR-017). The new pull path is covered by the existing reference redaction in uvicorn's and nginx's access logs (research R3), pinned by a test | PASS |
| **Workflow and documentation** | Backend: model → schema → migration → services → router; frontend: types → api → components. Documentation checklist: `docs/ARCHITECTURE.md` (rule sets, branches, evaluation, the branch pull URL), `CLAUDE.md` (rules modules, structure listing, the F#/W# citation rule already in "Figma implementation workflow"), `README.md` (the script's new options; Vitest and why it was added); `CLAUDE.md` and `README.md` (`npm test` in their command tables); no new variables, one new development dependency | PASS |
| **Tests (III)** | A `*.test.ts` next to each pure module of `src/utils/rules/`, run by `npm test` as a gate for every frontend change (research R12). Backend pytest as a practice, not a gate, with the coverage of research R12 | PASS |

**Gate result (before research)**: PASS, with no violations to justify.

## Project Structure

### Documentation (this feature)

```text
specs/002-connection-rules/
├── spec.md              # Feature spec with Clarifications (2026-10-22 to 2026-10-24)
├── plan.md              # This file
├── research.md          # Phase 0: decisions R1–R14
├── data-model.md        # Phase 1: tables, the snapshot, marks, propagation, validation, migration
├── quickstart.md        # Phase 1: automated checks and validation scenarios V1–V8
├── contracts/           # Phase 1
│   ├── integration-api.md   # serviceBW: branch pull URLs and the evaluation
│   ├── management-api.md    # DO.IT UI ↔ backend: catalog kinds, option sets, rules in create/edit
│   └── ui-screens.md        # Screens S0–S7, and "Deviations from Figma" (F1–F32, W1–W7)
├── design-notes.md      # Written by the first UI task: copy the decisions leave to the design notes
├── figma-audit/         # The audit (report.md, units.md, requirements.md)
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 output (/speckit-tasks, not created here)
```

### Source Code (repository root)

```text
backend/
├── app/
│   ├── models.py                 # + FormConnectionBranch, FormConnectionRuleSet; new columns on
│   │                             #   FormConnection and DocumentRequest
│   ├── schemas.py                # + catalog kinds and parts, OptionSet, rule and branch schemas,
│   │                             #   RulesInput, Evaluation; FormConnection, Create, Update, PullResponse extended
│   ├── catalog.py                # + each field's kind, option set, parts, date_of_birth
│   ├── option_sets.py            # new: countries, sex, licence classes, eye and hair colours
│   ├── cli.py                    # clear-connections also deletes branches and rule sets
│   ├── routers/
│   │   ├── document_types.py     # + GET /api/option-sets
│   │   ├── form_connections.py   # create/edit accept and return rules (thin, unchanged shape of handlers)
│   │   └── connect.py            # + GET /api/connect/{fc}/branches/{branch_id}/requests/{reference}
│   └── services/
│       ├── rules.py              # new: snapshot validation (FR-006, R4 invariants), identifier
│       │                         #   allocation (R5), branch rows, saving a rule set
│       ├── evaluation.py         # new: pure evaluator, dates (Europe/Berlin), messages (R7)
│       ├── form_connections.py   # create/update save documents, branches and rules atomically (R9)
│       └── document_requests.py  # trigger records rule_set_id; pull per branch, check order (R3);
│                                 #   _deliver adds the evaluation (R8)
├── alembic/versions/
│   └── <rev>_connection_rules.py # new: tables, columns, main branch and rule set 1 per connection
├── scripts/issue_test_credentials/  # + --birth-date, --licence-class CODE:ISSUE_DATE
└── tests/
    ├── unit/                     # + test_evaluation.py, test_rule_dates.py, test_rules_validation.py,
    │                             #   test_identifiers.py, catalog kinds
    └── api/                      # + test_form_connection_rules.py, test_connect_branches.py

frontend/
├── package.json                  # + vitest (devDependencies), "test": "vitest run"
├── vite.config.ts                # + test block: node environment (constitution III)
└── src/
    ├── types/                    # form-connections.ts (+ branches, rules), document-types.ts (+ kinds,
    │                             #   parts), option-sets.ts (new)
    ├── api/                      # option-sets.ts (new); form-connections.ts sends rules
    ├── hooks/                    # useOptionSets.ts (new)
    ├── utils/rules/              # pure: tree.ts, branches.ts (propagation, marks), statements.ts,
    │                             #   messages.ts, conditions.ts, dates.ts, validation.ts,
    │                             #   each with its *.test.ts beside it (research R12)
    ├── components/               # shared read-only rule display: RuleRow, GroupFrame, Connector,
    │                             #   BranchMark, BranchName (name + (i), reuses InfoTooltip)
    ├── constants.ts              # CONNECTION_STEPS gains the Rules step
    └── pages/
        ├── FormConnectionEditor/ # EditorStep 'rules'; DocumentsStep footer (F17) and removal dialogs (F18)
        │   └── RulesStep/        # new: tabs, list, groups, select mode, dialogs, footer (S2, S4)
        │       └── RuleEditor/   # new: data menu, part picker, checks per kind, value inputs, message (S3)
        └── FormConnectionDetail/ # pull URL per branch (F24, F31, W2); RulesSummary card (F26, W1)
```

**Structure Decision**: the web-application layout of spec 001 stays. Backend domain logic goes
into two new service modules beside the existing ones, so the routers stay thin and the pull path
(`document_requests`) calls a pure evaluator. Frontend logic that both the Rules step and the
details need lives in `src/utils/rules/` and shared `src/components/`; the Rules step is a folder
inside the editor page, with the rule editor nested in it, each with its sibling `types.ts`,
`constants.ts` and `utils.ts`.

## Rules for `/speckit-tasks`

- **Every UI task cites the F# and W# items it covers**, from
  [contracts/ui-screens.md](contracts/ui-screens.md), with its screen id (S0–S7), for example
  "Build the date conditions of the rule editor (S3; F3, F4)". Every item of the coverage index is
  cited by at least one task.
- A UI task builds the spec's behaviour and wording with Figma's layout and styling, following
  CLAUDE.md's "Figma implementation workflow"; its visual check lists prescribed differences by
  item number instead of fixing them.
- The first UI task writes `design-notes.md` with the copy the decisions leave open (F7's checkbox
  label, F14's dialog body, W3's duplicate-name message, FYI #20's footer wording, the licence class
  descriptions).
- Backend tasks follow model → schema → migration → services → router; the evaluator's unit tests
  come with it (research R12).
- **A Setup task installs Vitest** before any other frontend task: the `vitest` development
  dependency, `"test": "vitest run"`, the `test` block in `vite.config.ts` with the `node`
  environment, and at least one test, because `vitest run` fails when it finds no test file (for
  example for an existing pure function in a page's `utils.ts`). The same task applies the
  documentation checklist: `npm test` in the command tables of `CLAUDE.md` and `README.md`, and
  Vitest in `README.md` with the reason it was added. From then on every frontend task passes
  `npm run lint`, `npm test` and `npm run build` (constitution v1.1.0).
- **Each task that writes a module of `src/utils/rules/` writes its `*.test.ts` with it**, covering
  that module's cases from research R12; `branches.ts` is not done until every propagation rule
  and mark transition of data-model.md has a test.

## Constitution Check: after Phase 1 design

- [contracts/management-api.md](contracts/management-api.md) and
  [contracts/integration-api.md](contracts/integration-api.md) use only the documented envelopes;
  the new `409` answers carry `{error, message}` (I). The frontend types mirror the management
  schemas in the same change (I).
- [data-model.md](data-model.md): two new tables and four columns, all following the model
  conventions, indexed where looked up; one reviewed migration with a hand-written data step;
  history untouched (V).
- The save path keeps spec 001's "no transaction while EUDIPLO answers" and adds the rules to the
  one final locked commit; the evaluator is synchronous and pure (II).
- No runtime dependency, setting or environment variable is added; one development dependency,
  Vitest, is imported by the frontend's tests and documented in `README.md` (IV).
- The propagation that only the browser runs is pinned by Vitest tests next to its module and
  gated by `npm test`; the server's invariant checks stay as the last line (III, research R4, R12).
- Logging stays free of references, values and evaluations; the redaction covers the new path (IV
  and the logging rule).

**Gate result (after design)**: PASS, with no violations.

## Complexity Tracking

No constitution violations, so nothing needs justifying here.
