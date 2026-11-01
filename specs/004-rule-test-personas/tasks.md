---

description: "Task list for testing rules with personas"
---

# Tasks: Test Rules with Personas

**Input**: Design documents from `/specs/004-rule-test-personas/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/personas.md](contracts/personas.md),
[contracts/ui-screens.md](contracts/ui-screens.md), [quickstart.md](quickstart.md),
[figma-audit/report.md](figma-audit/report.md) (F1–F14, W1–W13, K1–K4)

**Tests**: Included, because the plan asks for them (plan.md "Testing" and "Rules for
/speckit-tasks", research R14, quickstart §2).
- Vitest is a merge gate (constitution v1.1.0, III), in the `node` environment. Each task that
  writes a module of `personas/` or `evaluation.ts` writes its `*.test.ts` beside it, in the same
  task. `types.ts` and `constants.ts` hold no logic and have no test, as in `checks/`.
- `generation.ts` isn't done until three tests pass: `generation.test.ts` against the oracle with at
  least several hundred seeded rule sets (SC-002), `scenarios.test.ts` with every acceptance
  scenario and edge case that a rule set expresses, and `performance.test.ts` (SC-003). They come
  with `generation.ts` (T019 to T022), not after the UI. US2 and US3 add their scenarios to
  `scenarios.test.ts` with their logic (T041, T052).
- Backend pytest covers the fixtures' drift (`tests/unit/test_check_fixtures.py`), a practice, not
  a gate.
- The worker entry, the hooks and the components are glue: lint, the build and quickstart V1–V10
  cover them. The editor's and the test step's pure helpers (`utils.ts`) have unit tests.

**Organization**: Tasks are grouped by user story, so that each story can be implemented and
tested as an increment. Inside each story, the plan's order holds: vectors, then the evaluator,
then the modules of `personas/` bottom-up, then the worker and the hooks, then the wizard, then
the test step's UI. The documentation is the last task.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel, because it touches different files and depends on no unfinished
  task in the same phase.
- **[Story]**: Which user story the task belongs to (US1 to US3).
- Every description names the exact files.

## Path Conventions

- **Personas**: `frontend/src/utils/rules/personas/`, written `personas/` below. Every module is
  pure. Only the worker entry (`personas/worker.ts`) and the hooks
  (`frontend/src/hooks/usePersonas.ts`, `frontend/src/hooks/useTodayInGermany.ts`) touch browser
  APIs.
- **The evaluator**: `frontend/src/utils/rules/evaluation.ts`, moved from
  `frontend/src/utils/rules/checks/testEvaluator.ts` (T005). Spec 003's modules are in
  `frontend/src/utils/rules/checks/`, written `checks/` below.
- **Editor**: `frontend/src/pages/FormConnectionEditor/`, written `editor/` below. The test step is
  `editor/TestStep/`, written `TestStep/` below. The rules step is `editor/RulesStep/`.
- **Backend**: only `backend/scripts/export_check_fixtures.py` changes. No model, migration,
  endpoint, setting, environment variable or dependency is added (plan "Constitution Check").
- **Rules**: constitution v1.1.0 and CLAUDE.md apply to every task.
  - No `any`, no `require()`, no inline styles, Tailwind only, KERN classes, `focus-visible:`
    only, light theme only.
  - `useReducer` with pure reducers for related state (`personas/personaState.ts`, the panel's
    drafts), every JSX list as a sub-component, sibling `types.ts`, `constants.ts` and `utils.ts`.
  - Single quotes, Ruff and mypy (`app/ scripts/ tests/`) on the backend.
- **Privacy** (FR-019, FR-021, SC-006): nothing about personas is stored, sent or logged. No
  `console.*`, `localStorage`, `sessionStorage`, IndexedDB, `fetch` or `apiFetch` in `personas/`,
  the worker, the two hooks or `TestStep/`. Personas exist only in the editor page's memory and
  are discarded with it.
- **Bundle** (research R9, R16): `checks/checkedTree.ts`, `checks/literals.ts`, `checks/text.ts`
  (with `checks/caseFolding.ts`) and `evaluation.ts` stay out of the main bundle. Code in the main
  bundle (`personas/personaState.ts`, `personas/values.ts`, `personas/messages.ts`,
  `personas/announcements.ts`, the hooks, `TestStep/`) never imports them, or `personas/fields.ts`
  and `personas/results.ts`, statically. They arrive through the hook's one dynamic `import()` of
  `personas/results.ts`, and the worker bundles its own copy.
- **Generated files**: `checks/fixtures/evaluator-vectors.json` and `checks/caseFolding.ts` change
  only through `uv run python -m scripts.export_check_fixtures` (from `backend/`), never by hand.
- **Copy**: every persona text that depends on data is built in `personas/messages.ts`, with the
  wording of contracts/ui-screens.md "Copy" and, where the decisions leave it open, of
  `specs/004-rule-test-personas/design-notes.md` (T001). Fixed copy sits in `TestStep/constants.ts`.
  Use the typographic apostrophe (’) that the existing UI uses. The UI says "variant" for branch
  and "connection" for form connection.
- **Gates**: every frontend task passes `npm run lint`, `npm test` and `npm run build` (in
  `frontend/`). Every backend task passes `uv run ruff check .`, `uv run ruff format --check .` and
  `uv run mypy app/ scripts/ tests/` (in `backend/`).
- **UI tasks** (plan "Rules for /speckit-tasks", research R15): spec.md decides what the test step
  does; Figma section "Test · 1 · Test rules" decides its look; the page around it stays as built.
  - Every UI task cites its screen (S0, S2, S5, S7, S8.x) and the items it covers from
    contracts/ui-screens.md "Items from the audit": F1–F14 (Figma must change), W1–W13 (built
    without frames), K1–K4 (cosmetic, built as designed), O1–O6 (out of scope).
  - It follows `docs/FIGMA-WORKFLOW.md` on section `7057:58708` of file `s8mU9oJDq3411e8bxMjQO9`,
    for the nodes it names: `get_design_context` and `get_screenshot` per node (the node ids are in
    `figma-audit/units/U01.md`–`U12.md` and `figma-audit/report.md`, so `figma-node-finder` is
    needed only for a node they don't list); exact values; then the numeric and visual checks.
  - Its visual-verification table lists each difference that an O item explains ("page design
    (O1)") or that only "KERN 2.8 vs Revamp" explains, and doesn't fix it. A difference that an F
    or W item prescribes isn't a mismatch: list it with its item.

---

## Phase 1: Setup (design groundwork)

**Purpose**: Settle the copy and the tokens that `personas/messages.ts` and the UI tasks need.

- [ ] T001 Write `specs/004-rule-test-personas/design-notes.md`, the copy that the decisions leave open. This is the first UI task, and T013 needs it to complete `personas/messages.ts` (plan "Rules for /speckit-tasks"; research R13; S8.2, S8.4, S8.5, S8.6, S8.8; F6, F10, K1, K2, W10).
  - Use the format of `specs/003-rule-consistency-checks/design-notes.md`. Mark each text that no decision gives as "proposed".
  - Settle research R13's nine items:
    1. a group's statement in the result rows: read how the rules step words a group's header (`editor/RulesStep/GroupListItem.tsx`, `ItemName.tsx`) and reuse that wording (R16);
    2. the accessible name of the tab's warning icon (F6), next to its tooltip "No applicant can meet the rules of Standard.";
    3. the hidden text of the failing-value marker (K1) and of "· edited" (K2);
    4. a persona's first name for "Mia’s data", "Rules Mia meets" and "Message Mia reads" (the name up to its first space, data-model.md `firstName()`), and the possessive of a name ending in s ("Jonas’ data" or "Jonas’s data");
    5. the panel's empty value: Figma's "Not shared";
    6. the age next to a date of birth in the future, and the error for an "Age today" that gives no date of birth (before year 1);
    7. the status text of a fill run after returning from the rules step (S8.8), one persona and several;
    8. the heading's counts in general: singular and plural, rules before groups, groups only ("Result: doesn’t meet 2 groups"), sub-groups counting as their reported top-level group;
    9. what "Done" does with invalid drafts (proposed: drops them, the value stays its last valid one), and that switching persona or variant ends edit mode.
  - Also record the decision on the chips' keyboard pattern, to be confirmed by T032 and T056 (research R16): tabs inside the variant's tab panel (one selected, controlling the panel), or a radio group.
- [ ] T002 Map the Figma variables to KERN 2.8 tokens, once (`docs/FIGMA-WORKFLOW.md` step 2; research R15). It runs after T001, since both write `specs/004-rule-test-personas/design-notes.md`.
  - Call `get_variable_defs` on the section `7057:58708`, and map every variable to an existing token of `frontend/src/index.css` (KERN's Tailwind theme and the `@theme` block). Start from the "Tokens" sections of `specs/002-connection-rules/design-notes.md` and `specs/003-rule-consistency-checks/design-notes.md`, since the file is the same.
  - Record the mapping in a "Tokens" section of design-notes.md. List each value that differs only for the Revamp as "KERN 2.8 vs Revamp".
  - Settle the icons the step needs, as KERN 2.8 `kern-icon` classes or as SVGs from the design in `frontend/src/assets/icons/`: the chips' check circle and warning diamond (U01 7057:58755, 7057:58758), "Generate again"'s refresh and "Edit data"'s pencil (7057:58771, 7057:58770), the status icons of "Not met" and "Couldn't be checked" (F8: one icon each, different in shape), the result rows' check icon, the tab's warning icon (U07 7058:61618), the failing-value dot (K1, 7057:59074), and the skeleton's colours (U11 7062:51206).
  - Ask the user before adding any token to `@theme`. Don't invent tokens.

---

## Phase 2: Foundational (blocking prerequisites)

**Purpose**: The vectors that pin the evaluator's whole-branch behaviour, the evaluator's move to
production with its messages, and the personas' shapes, randomness, fields, values and documents.
After this phase, evaluating a persona gives exactly what `evaluate_branch()` gives.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Whole-branch vectors (backend, research R2)

- [ ] T003 Add `branch_evaluations` to `backend/scripts/export_check_fixtures.py` (research R2; data-model.md "Generated fixtures"; FR-014, SC-001).
  - A generator `_branch_evaluation_vectors() -> Iterator[dict[str, object]]`, with a docstring, beside `_rule_outcome_vectors()`, and `'branch_evaluations': list(_branch_evaluation_vectors())` in the vectors dict (next to `'rule_outcomes'`).
  - Each vector is hand-written as the `SnapshotBranch` and `DeliveredDocument`s that `evaluate_branch()` reads, and its output comes from `evaluate_branch(branch, documents, shared_on)` (`backend/app/services/evaluation.py`), in data-model.md's shape: `name`, `branch` (`origin`, `operator`, `items`), `documents`, `shared_on`, `met`, `results` (`id`, `group`, `outcome`, without names) and `messages` (`id`, `message`).
  - The branches cover research R2's list: AND and OR levels; groups and sub-groups, with and without a message of their own (an OR group without a message reports its members); a based branch with removed items and a dissolved inherited group; a branch without items; rules that are met, not met and couldn't be checked; a rule on a class that the licence doesn't list; a class list that is empty.
  - Deterministic output (fixed days, no `date.today()`), single quotes, Ruff and mypy clean. The script never imports `app.config` (CLAUDE.md).
- [ ] T004 Regenerate `frontend/src/utils/rules/checks/fixtures/evaluator-vectors.json` (depends on T003).
  - In `backend/`: `uv run python -m scripts.export_check_fixtures`, then `uv run python -m scripts.export_check_fixtures --check`, which prints nothing and exits 0.
  - `DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5435/template_db_test uv run pytest tests/unit/test_check_fixtures.py` passes, its drift check now covering `branch_evaluations`.
  - The diff adds only the `branch_evaluations` key; `checks/caseFolding.ts` is unchanged. Never edit either file by hand.

### The evaluator in production (frontend, research R2)

- [ ] T005 [P] Move `checks/testEvaluator.ts` to `frontend/src/utils/rules/evaluation.ts` and `checks/testEvaluator.test.ts` to `frontend/src/utils/rules/evaluation.test.ts`, without changing behaviour (research R2; contracts/personas.md "The evaluator").
  - Update every import: `checks/testOracle.ts` (imports the evaluator from `../evaluation`), `checks/solver.test.ts`, `checks/testOracle.test.ts`, and the test's own fixture path (`./checks/fixtures/evaluator-vectors.json`). Update the comments that name `testEvaluator.ts` in `checks/testOracle.ts` and `checks/oracle.test.ts`.
  - The module's header says it is production code, the browser port of `backend/app/services/evaluation.py`, and each exported function names the Python function it ports (`evaluateBranch` ← `evaluate_branch()`, `ruleOutcome` ← `_rule_outcome()`, …).
  - Separation (contracts/personas.md): it imports none of `checks/literals.ts`, the theories, `checks/checkedTree.ts` or `checks/solver.ts`. Check the current imports and keep it so.
  - `npm test` passes with the same results as before the move.
- [ ] T006 Port `_messages()` and `_results()`'s order into `frontend/src/utils/rules/evaluation.ts`, and replay the whole-branch vectors in `frontend/src/utils/rules/evaluation.test.ts` (depends on T004, T005; research R2; FR-014, SC-001).
  - `BranchEvaluation` gains `messages: { id: string; message: string }[]`: empty when met; otherwise the reported items in `_messages()`'s order. It walks the top level in order, and a group that isn't met reports its own message, or its members' if it has none.
  - The evaluated items follow `_results()`'s order: each group followed by its members, each member with the id of the group that contains it.
  - `evaluateBranch()` still throws where Python raises `ValueError`. Date-times with a time zone (`_DATE_TIME`) stay unported (research R2).
  - `evaluation.test.ts` replays every `branch_evaluations` vector: it builds the branch and the `Applicant` from the vector's documents, and asserts the same `met`, `results` (`id`, `group`, `outcome`) and `messages` (`id`, `message`). The `rule_outcomes` replay stays.

### The personas' groundwork (pure, with Vitest)

- [ ] T007 [P] Write `personas/types.ts` and `personas/constants.ts`, the shapes of data-model.md and the numbers of research R6–R9 (data-model.md; contracts/personas.md).
  - `types.ts`, field for field as data-model.md gives them:
    - `PersonaField`: `key` (spec 003's `variableKey()`), `documentType`, `documentLabel`, `label`, `field`, `part: string | null`, `licenceClass: string | null`, `kind: 'number' | 'text' | 'enum' | 'date'`, `optionSet: string | null`, `multiple: boolean`, `dateOfBirth: boolean`.
    - `PersonaValue = number | string | readonly (string | number)[] | null`. "Empty: `null`, `''` or `[]`, for a document that doesn't give the value". "Absent: the key is missing from `values`, because the persona never had a value. Only a fill run gives absent values."
    - `PersonaId = 'persona-1' | 'persona-2' | 'persona-3'` ("Stable for the flow: React keys, element ids"); `Persona` with `id`, `name` ("Never empty"), `values: Record<string, PersonaValue>` ("Every value the persona has, including hidden ones"), `generated: Record<string, PersonaValue>` ("The values as generation last gave them"), `status: 'ready' | 'generating'`.
    - `PersonaState` (`personas: Persona[] | null`, `selected: 0 | 1 | 2`, `branchKey: string | null`, `run: GenerationRun | null`, `failed: boolean`, `editing: 0 | 1 | 2 | null`, `confirm: { type: 'one'; slot } | { type: 'all' } | null`, `announcement: string`), `GenerationRun` (`{ runId, startedAt, slots: SlotKind[] }`), `SlotKind = 'free' | 'kept' | 'filled'`.
    - `PersonaBranchResult` (`met`, `items: EvaluatedItem[]`, `messages`), `TestResults` (by persona id, then branch key), `ResultView` (`meets`, `heading`, `listHeading: string | null`, `messageColumn: string | null`, `rows`, `failingFields`), `ResultRow` (`itemId`, `type: 'rule' | 'group'`, `name`, `statement`, `status: 'met' | 'not_met' | 'not_checked'`, `message: string | null`, `reported`, `members: ResultRow[]`).
    - The generation shapes `SlotPlan`, `BranchClass`, `OutcomeVector`, `Target`, `Score` (`[goal1, goal2, goal3, goal4]`), `Model`, and the worker messages `GenerateMessage` and `GeneratedMessage` exactly as contracts/personas.md "Worker protocol" gives them.
    - `PersonaAction`, the reducer's actions, starts with US1's (T023); T040 and T051 add theirs.
  - `constants.ts`: `PERSONA_IDS`; `GENERATION_STOP_MS = 4500` (the deadline posted to the worker); `GENERATION_WATCHDOG_MS = 5500`; `MAX_VECTORS = 256`; `MAX_COMBINATIONS = 4096`; `MAX_RESTARTS_WITHOUT_GAIN = 20`; the plausible ranges of research R7 (ages 18 to 80, issue dates in the past, expiry dates from two years ago to fifteen years ahead, human height and weight); and the agreeing field pairs (research R7 step 1): `pid.birthdate` and `mdl.birth_date`; `mdl.age_in_years` and `mdl.age_birth_year` from the date of birth; `pid.family_name`/`mdl.family_name` and `pid.given_name`/`mdl.given_name` from the persona's name; `pid.address_locality` and `mdl.resident_city`; `pid.address_postal_code` and `mdl.resident_postal_code`; `pid.address_region` and `mdl.resident_state`; `pid.address_country` and `mdl.resident_country`; `pid.nationalities` and `mdl.nationality`.
- [ ] T008 [P] Write `personas/random.ts` with `random.test.ts`, a small seeded generator (research R7 "Randomness").
  - `createRandom(seed: number)` with `next()` in [0, 1), `int(min, max)`, `pick(list)`, `shuffle(list)` (a new array) and `weighted(list, weights)`. A few lines (e.g. mulberry32), no dependency, never `Math.random()`.
  - Tests: equal seeds give equal sequences; different seeds give different ones; bounds hold; `shuffle` returns a permutation.
- [ ] T009 [P] Write `personas/values.ts` with `values.test.ts`, the persona's derived values that the main bundle needs (depends on T007; data-model.md "Persona", "Derived"; FR-005, FR-007, FR-012; research R4).
  - `isEmptyValue(value)`: `null`, `''` or `[]`.
  - `changedKeys(persona, fields)`: the current fields whose value differs from `generated`, by `sameValue()` of `utils/rules/branches.ts` (K2, FR-012).
  - `shownFieldsOf(persona, fields)`: the fields shown for this persona; a class date only while the persona's `mdl.driving_privileges.classes` includes its `licenceClass` (FR-005, W4).
  - `ageOn(dateOfBirth, today)`: "the largest N for which `yearsAfter(dateOfBirth, N)` ≤ today, as the evaluator counts it" (`checks/calendar.ts`), `null` for an empty date (FR-007).
  - It imports nothing that reaches `checks/checkedTree.ts`, `checks/text.ts` or `evaluation.ts` (Bundle rule).
  - Tests: a birthday today (21 today is 21); 29 February reaches the next age on 1 March in years without it; a date of birth in the future; an empty value; class dates hidden and shown with the classes; `changedKeys` for lists in another order, `''` against `null`, and hidden values (never counted).
- [ ] T010 [P] Write `personas/fields.ts` with `fields.test.ts`: `personaFieldsOf(branches, context)` and `checkedBranchesOf(branches, context)` (depends on T007; research R3; data-model.md "Persona field"; contracts/personas.md; FR-005, FR-009).
  - `personaFieldsOf`: the union of every branch's `buildCheckedBranch().variables` (`checks/checkedTree.ts`), plus `mdl.driving_privileges.classes` whenever a class date is a field. Order: catalog document order (Personal ID, then Driving licence), then catalog field order, then part order; each class's dates right after "Licence classes", in the licence-class set's order, the issue date before the expiry date. Labels from `dataOfResolved()` (`utils/rules/statements.ts`), without the document; `documentLabel` is the document's heading. Kind, value set, `multiple` (`multiple_values` of the field or part) and `dateOfBirth` (`date_of_birth`) from the catalog. Total: it never throws, and a rule that `buildCheckedBranch()` leaves out adds no field.
  - `checkedBranchesOf`: every branch, in tab order, as the worker request needs it: `{ checked: CheckedBranch; rules: Record<string, RuleItem> }` (contracts/personas.md "Worker protocol").
  - Tests: the spec's example gives exactly "Date of birth (Age)" and "City or town" under "Personal ID", and "Licence classes" and "Licence class B – Issue date" under "Driving licence" (US1-AS1), and no family name (US2-AS6); a rule removed in a based branch keeps its data while the main branch's version checks it (EC "Rules removed in a branch"); a class date alone brings "Licence classes"; given and family name are fields of their own when checked (W12); nationalities and classes are `multiple`; the order rules above.

- [ ] T011 Write `personas/applicant.ts` with `applicant.test.ts`: `applicantOf(persona, fields)` (depends on T006, T009, T010; research R4; data-model.md "The documents a persona stands for"; FR-014).
  - From the current fields only, empty values left out: a field without parts as `{ [documentType]: { [field]: value } }`; the parts of `place_of_birth` in one object; `mdl.driving_privileges` as one entry per class held, `{ vehicle_category_code: code, issue_date?, expiry_date? }`, with a date only where it is a field and not empty. An empty list of classes delivers `[]`.
  - Tests, each also through `evaluateBranch()` (`evaluation.ts`): hidden values and dates of classes not held are never delivered; removing class B while another class remains makes a rule on B's issue date `'not_met'` (US2-AS4); removing every class makes it `'not_checked'` (research R4); an empty value makes its rule `'not_checked'` (US2-AS5).

**Checkpoint**: the evaluator gives Python's `met`, results and messages for every vector, and a
persona's documents are built as the evaluation reads them.

---

## Phase 3: User Story 1 - See which personas meet the rules of each variant (Priority: P1) 🎯 MVP

**Goal**: "Test rules" opens a test step between the rules step and publishing. It generates three
personas with values for exactly the data that the rules check, chosen to reach FR-011's goals,
and shows for each persona and variant whether it meets the rules, with the reported rules,
statuses and messages. One persona, or all three, can be generated anew. Publishing and saving
move to the test step and never wait for it.

**Independent Test**: Set up spec 002's "Passenger transport licence" (quickstart §3), press "Test
rules", and check quickstart V1, V2, V4.2, V6, V7 and V8: the fields, the three outcome patterns
across Standard and Ambulance, the result rows, the test-day line, the refusals, publishing from
the test step, and the failure state.

### Logic for User Story 1 (with Vitest)

- [ ] T012 [P] [US1] Export `noticeText()` from `checks/findingMessages.ts` without changing its wording, and pin "No applicant can meet the rules of Standard." in `checks/findingMessages.test.ts` (research R5, R16; FR-018).
- [ ] T013 [P] [US1] Write `personas/messages.ts` with `messages.test.ts`, every persona text that depends on data (depends on T001, T009; research R13; contracts/personas.md "messages.ts"; contracts/ui-screens.md "Copy").
  - `testDayLineOf(today)`: "Tested as if shared today, 1 Nov 2026." with `formatDate()` (FR-016, W1).
  - `chipNameOf(persona, branchName, meets)`: "Mia Schulz: meets the rules of Standard" / "Mia Schulz: doesn’t meet the rules of Standard" (FR-015).
  - `firstName(persona)` and the possessive (design-notes item 4); `dataHeadingOf(persona)`: "Mia’s data"; `meetsHeadingOf(persona)`: "Rules Mia meets"; `messageColumnOf(persona)`: "Message Mia reads".
  - `resultHeadingOf(counts)`: "Result: meets the rules", "Result: doesn’t meet 2 rules", "Result: doesn’t meet 1 rule and 1 group", and design-notes item 8's other counts (FR-015, W10).
  - `noRulesNoteOf(branchName)`: "School transport has no rules yet, so every applicant meets it. Add rules in the Rules step to test them." (U06).
  - `confirmOneOf(persona)`: "Generate new data for Mia?" / "Your changes to Mia’s data will be replaced. The other two applicants stay as they are."; `confirmAllOf(changed)`: "Generate new data for all applicants?" / "Your changes to Mia’s and Anna’s data will be replaced.", naming every persona with changes (FR-012, W9; used by T046).
  - `creatingAllText`: "Creating 3 sample applicants…"; `creatingOneOf(persona)`: "Creating new data for Mia…"; the fill run's text (design-notes item 7; used by T053).
  - `failureHintOf(editing)`: "Try again, or publish without testing." / "Try again, or save without testing." (FR-013, F7).
  - `ageSuffixOf(dateOfBirth, today)`: " (age 19)", with `ageOn()` (T009) and design-notes item 6 for a future date (FR-007, F10).
  - `nowMeetsOf(persona, branchName)`: "Mia Schulz now meets the rules of Standard."; `noLongerMeetsOf(persona, branchName)`: "Mia Schulz no longer meets the rules of Standard." (FR-017; used by T039).
  - The hidden texts of the failing-value marker and of "· edited" (design-notes item 3; K1, K2).
  - The tests pin every wording that the spec, its Clarifications and Figma give, word for word.
- [ ] T014 [US1] Write `personas/results.ts` with `results.test.ts`: `testResultsOf()` and `resultViewOf()` (depends on T011, T013; research R5; data-model.md "Test result"; contracts/personas.md; FR-014, FR-015, FR-018).
  - `testResultsOf(personas, fields, branches, context, today)`: for every persona whose `status` is `'ready'`, against every branch including branches without rules, by persona id then branch key, a `PersonaBranchResult` equal to `evaluateBranch(branch, applicantOf(persona, fields), today, context)` (`met`, `items`, `messages`).
  - `resultViewOf(result, branch, persona, context)`, rows in this order:
    1. the reported items, in the order of the evaluation's messages, each with its current name, its statement (rules: `statementOf()` as the rules step words it; groups: design-notes item 1), its status (`'not_met'` or `'not_checked'`; a group is never `'not_checked'`), its message, and under a reported group its members that aren't met, recursively for sub-groups, each with name, statement and status (F8, W10);
    2. every other top-level item that counts, in display order: met (a check icon, and "–" when there is a message column), or a group that isn't met without being reported, with its status and "–" (F14).
  - `meets`, `heading` (`resultHeadingOf()`, a group counting as one), `listHeading` ("Rules Mia meets" under a met variant, otherwise `null`), `messageColumn` ("Message Mia reads" under a variant the persona doesn't meet, otherwise `null`) (F3), and `failingFields`: the keys of the fields read by the rules that the rows show as failing, so that a rule inside a met group marks nothing (K1).
  - Re-exports `personaFieldsOf()` and `checkedBranchesOf()` from `fields.ts`, so that the hook's one dynamic `import()` brings everything that reaches the case-folding table (research R9, R16).
  - Tests: the spec's example rows, statuses and messages for a persona failing Standard; a met variant (no message column, "Rules Mia meets"); a branch without rules (met, no rows); a group with its own message; an OR group without one (its members reported, the group "–"); nested members; `failingFields` with a rule inside a met group; `'generating'` personas get no result; equality with `evaluateBranch()`.
- [ ] T015 [P] [US1] Write `personas/goals.ts` with `goals.test.ts`: branch classes, realizable vectors, targets and the score (depends on T007, T008; research R6, R7 "Item targets"; data-model.md "Generation"; FR-011).
  - `branchFormulaOf(checked)`: rules contribute `CheckedRule.formula`, groups combine their items with their operator, the top level uses the branch's operator, as `levelFormula()` does in `checks/findings.ts` (mirror it, or export it from there without changing its behaviour); a branch without items is `true`. Branches with the same canonical serialisation form one `BranchClass`.
  - `realizableVectors(classes, today, options)`: a depth-first search that adds B or `negate(B)` per class and asks `satisfiable(conjunction, today)` (`checks/solver.ts`), with one solver memo per run and the variables of all branches merged, dropping a prefix as soon as the answer is `'unsat'`. Only `'sat'` counts as realizable; `'unknown'` (the text corner or the deadline) counts as not realizable. Exhaustive up to `MAX_VECTORS`; beyond it, each target of goals 1 to 3 is asked directly (`B`, `¬B`, `B_a ∧ ¬B_b`).
  - `targetsOf(classes, vectors, itemFormulas)`: goal 1 meet each class some applicant can meet; goal 2 fail each class some applicant can fail; goal 3 differ on each pair some realizable vector tells apart; goal 4 meet X and fail X for each distinct item formula (rules, groups, sub-groups, told apart by canonical formula) when X and ¬X are each `'sat'`.
  - `scoreOf()` and `compareScores()`: covered targets per goal, compared goal by goal, never trading a goal for a later one (FR-011).
  - Tests: the spec's example gives exactly (meet, meet), (fail, meet) and (fail, fail) for (Standard, Ambulance) (research R6); identical branches form one class; an unmeetable branch has no goal-1 target and an always-met branch no goal-2 target (EC); `'unknown'` isn't realizable; the `MAX_VECTORS` fallback finds a vector for each reachable target; lexicographic comparison.
- [ ] T016 [P] [US1] Write `personas/models.ts` with `models.test.ts`: `modelOf()`, random self-reduction over `satisfiable()` (depends on T007, T008; research R7 "Models", "Plausibility literals").
  - Walks a formula's tree: an AND keeps every child; an OR keeps the first child, in random order, that keeps the conjunction `'sat'`. Returns per variable the literals chosen (`Model`), or `null` when the formula isn't `'sat'`.
  - Tries first with the plausibility literals ("at least 18 years ago" and "less than 81 years ago" on a date of birth; greater than 17 and less than 81 on "Age in years"; the matching range on "Year of birth"), and without them if that isn't `'sat'` (FR-010, EC "Unlikely values").
  - `checks/solver.ts` doesn't change.
  - Tests: any values that meet every chosen literal meet the formula (checked with the theories' `holds()`); different seeds choose different OR children; the plausibility literals give way to "at least 90 years old"; an unsatisfiable formula gives `null`.
- [ ] T017 [P] [US1] Write `personas/samples.ts` with `samples.test.ts`, the name and text pools (research R7 step 3, "Names"; FR-010).
  - Realistic, fictitious given and family names (enough for three different names per generation, e.g. "Mia Schulz", "Anna Keller", "Yusuf Demir"); towns of Baden-Württemberg; streets; postal codes; regions; issuing authorities; makers of document numbers, emails and phone numbers in their format; licence-class combinations (B; B and BE; AM and B; A and B; B and C1); country weights towards Germany.
  - Data only, no dependency. Tests: pools non-empty and without duplicates; made-up values match their formats.
- [ ] T018 [US1] Write `personas/sampling.ts` with `sampling.test.ts`: values from a model (depends on T009, T010, T016, T017; research R7 "Values", "Class dates", "Names"; FR-009, FR-010).
  - For each variable, candidates in order of preference; the first one that meets every literal of the model on that variable wins, as judged by the theory's `holds()` (spec 003's theories, the evaluator's comparisons):
    1. agreement with the pairs of `personas/constants.ts` (FR-010, EC "Fields that describe the same fact"); given and family name from the persona's name ("Mia Schulz" gives "Mia" and "Schulz", W12);
    2. order: no issue date before the date of birth, no expiry date before the issue date of the same document or class;
    3. plausible random values by field (`samples.ts`, `constants.ts`);
    4. boundary values of the model's literals: each constant and its neighbours, each date threshold for today (`yearsAgoThreshold()`, `yearsAfter()`, `monthsAfter()` of `checks/calendar.ts`) and the days next to it;
    5. the theory's `decide()` witness, so that a value always exists.
  - Class dates are generated for every class-date field, whether or not the class is held (W4). Every value is of its field's kind (`PersonaValue`).
  - Tests: each agreement pair; the order rule; ages 18 to 80 unless the literals force otherwise; narrow ranges reached ("City or town is equal to Stuttgart", an exact date); the witness fallback; kinds.
- [ ] T019 [US1] Write `personas/generation.ts` with the property tests of `personas/generation.test.ts`: `generatePersonas(request, options)` for free and kept slots (depends on T011, T015, T018; research R6–R8; contracts/personas.md "generatePersonas"; FR-010 to FR-013).
  - `options`: `{ deadline: number, now: () => number }`, the clock injected.
  - Steps: build a valid fallback set first (plausible random values, no planning); find the realizable vectors (`goals.ts`); choose the free slots' vectors to maximise the score given the kept slots' vectors (exhaustively up to `MAX_COMBINATIONS`, otherwise greedily with random restarts; ties at random; the persona order shuffled); assign the uncovered item targets in random order to the first slot for which `satisfiable(C_p ∧ t)` is `'sat'`, restarting until every coverable target is covered, `MAX_RESTARTS_WITHOUT_GAIN` restarts bring nothing, or the deadline; take each slot's model (`models.ts`) and values (`sampling.ts`); evaluate every candidate set with `applicantOf()` and `evaluateBranch()`, so that the score counts what the step will show; return the best set found by the deadline.
  - Kept slots come back unchanged; their vectors and item outcomes come from the evaluator (research R8). Free slots without a name get one drawn, different from each other and from the kept personas' names. Structure the planning so that each slot plans on its own branch formulas, identical for free slots, which T050 substitutes for filled slots; until then the reducer never sends a filled slot.
  - Pure: no side effects, no logging. Returns no later than `deadline` plus one solver step.
  - Property tests in `generation.test.ts`: every value of its field's kind; FR-010's limits unless a goal needs otherwise; the names differ; equal seeds give equal results and two seeds normally differ; kept slots keep every value (FR-012); the deadline, driven by a fake clock, returns valid personas (at least the fallback).
- [ ] T020 [US1] Add the oracle catalogue to `personas/generation.test.ts` (depends on T019; research R14; SC-002).
  - Rule sets of one to three branches made of `checks/testOracle.ts`'s seeded random branches over shared variables, at least several hundred. For each, the oracle enumerates every applicant in its domain on a branch that holds every branch's items, and computes the realizable vectors and the best score for goals 1 to 3 that three personas can reach, with no solver involved.
  - For each rule set that three personas can reach goals 1 to 3 for, 20 generations with different seeds each reach that score. Across the catalogue, at least 90 % of the items that applicants can both meet and fail are met by one persona and failed by another.
  - A hand-written catalogue adds the spec's example and its variants (Ambulance at 19, an unmeetable variant, an always-met variant).
  - Keep the suite's time reasonable: a clock that doesn't depend on the machine's speed, so that results come from `MAX_RESTARTS_WITHOUT_GAIN` and full coverage, not from timing.
- [ ] T021 [P] [US1] Write `personas/scenarios.test.ts` with US1's scenarios and edge cases (depends on T014, T019; research R14).
  - Build spec 002's "Passenger transport licence" (quickstart §3): Standard with Rule 01 "Date of birth (Age) is at least 21 years old", Rule 02 "City or town is equal to Stuttgart" ignoring letter case, Rule 03 "Licence classes includes one of B", Rule 04 "Licence class B – Issue date is at least 2 years ago", AND, each with a message; Ambulance based on Standard with Rule 01 at 19. Reuse `utils/rules/testData.ts`'s helpers where they fit.
  - US1-AS1: the fields, and each persona has values for them and no other data; class B's date only for holders. US1-AS2: per persona and branch, `met`, the reported items with status and message. US1-AS3: across seeds, one persona meets both variants, one only Ambulance, one neither. US1-AS4: `testDayLineOf(today)`. US1-AS5: generating one persona anew changes its values, keeps the other two's, and its results follow.
  - Edge cases: a branch without rules, and a based branch whose rules are all removed, are met by every persona; a branch that no applicant can meet is met by none, and generation doesn't try; a branch every applicant meets is met by all, and generation doesn't try to fail it; rules removed in a branch aren't tested there; a birthday today and 29 February; a rule on a class not held is "not met"; an empty class list and an empty class B expiry date are "couldn't be checked"; German and Italian nationality meet both "includes one of Germany" and "includes one of Italy"; generated fields on the same fact agree; more rules than three personas can cover reach FR-011's goals in order.
- [ ] T022 [P] [US1] Write `personas/performance.test.ts` (depends on T014, T019; research R14, R16; SC-003).
  - Generation for branches of 50 items ends within 1.5 seconds; `testResultsOf()` for 3 personas × 20 branches × 200 items takes under 100 ms; a 200-item branch built to be hard returns by the deadline plus one solver step; the vector search with 20 branches that differ stays within `GENERATION_STOP_MS` (R16). Follow `checks/performance.test.ts`'s style for budgets.
- [ ] T023 [US1] Write `personas/personaState.ts` with `personaState.test.ts`: `personaStateReducer()` and `initialPersonaState`, US1's actions (depends on T007; research R9, R10; data-model.md "Persona state"; FR-004, FR-012, FR-013).
  - `opened` (fields, the rules step's open branch, the branch keys): selects the variant; without personas and without a run, starts the first run, all slots free.
  - `generateOne` (slot) / `generateAll`: start a run; during a run, merge into it: a new run id whose free slots are the union of both, the others kept (research R9). Placeholders: the personas of free slots get `status: 'generating'`. (The confirm question comes with T040.)
  - `retry`: clears `failed`, starts a run with all slots free.
  - `runSucceeded` (run id, slots): for the current run id only, writes the new values into `values` and `generated`, the names of new personas (ids `persona-1` to `persona-3`, created on the first success), drops the hidden values of free slots, sets `status: 'ready'`, clears `run`. Answers for an older run id are ignored.
  - `runFailed` (run id): `failed: true`, `run: null`; the personas keep their last values, and those being generated go back to `'ready'`.
  - `select` / `selectBranch`: change the selection, keep the other one (FR-004), and end edit mode.
  - Pure. It imports neither `results.ts`, `fields.ts` nor `evaluation.ts` (Bundle rule). Tests: every transition of data-model.md's lifecycle diagram, the merge, stale run ids, the first persona selected by default.

### The worker and the hooks for User Story 1

- [ ] T024 [P] [US1] Write `personas/worker.ts`, the module worker's entry (depends on T019; research R9; contracts/personas.md "Worker protocol").
  - On a `generate` message: `generatePersonas(request, { deadline, now: () => performance.timeOrigin + performance.now() })`, then posts one `generated` message with the same run id. Holds no state between messages, catches nothing (an error reaches the page's `error` event), logs nothing. Glue: lint and build cover it.
- [ ] T025 [P] [US1] Extract `useTodayInGermany()` from `frontend/src/hooks/useRuleChecks.ts` into `frontend/src/hooks/useTodayInGermany.ts`, unchanged (today in Germany, `YYYY-MM-DD`, read again every `TODAY_REFRESH_MS` and when the page becomes visible), and use it in `useRuleChecks.ts` (research R9).
- [ ] T026 [US1] Write `frontend/src/hooks/usePersonas.ts` (depends on T014, T023, T024, T025; research R9; contracts/personas.md "usePersonas()").
  - Input `{ active, branches, context, openBranchKey }`. Returns `state`, `fields`, `results` (`null` while the module loads), `today`, `dispatch`, `generateOne(slot)`, `generateAll()`, `retry()`, and `viewOf(result, branch, persona)`, the loaded module's `resultViewOf()`, so that the step never imports `results.ts` statically. Add `viewOf` to contracts/personas.md's "Returns".
  - On the first activation, one dynamic `import('../utils/rules/personas/results')`; a load failure dispatches `runFailed`. Once it has loaded and `context` isn't `null`, each activation dispatches `opened` with `personaFieldsOf()`. It never starts a run while `active` is false, but a started run continues.
  - For each new run (`state.run.runId`): creates the worker lazily (`new Worker(new URL('../utils/rules/personas/worker.ts', import.meta.url), { type: 'module' })`), terminating a superseded one first; posts the `GenerateMessage` with a seed from `crypto.getRandomValues()`, `deadline = performance.timeOrigin + performance.now() + GENERATION_STOP_MS`, today, `checkedBranchesOf()`, the fields, the context and per slot its kind, name and fixed values; arms the `GENERATION_WATCHDOG_MS` watchdog. `generated` → `runSucceeded`; `error`, `messageerror`, a constructor that throws or the watchdog → terminate and `runFailed`. Terminates the worker on unmount.
  - `fields` and `results` with `useMemo` from the branches, the personas, the context and today.
  - Nothing stored, sent or logged. Then run `npm run build` and confirm in `frontend/dist/assets/` a chunk for the personas' worker, a chunk with `caseFolding`, and no `caseFolding` in the main `index-*.js` (R16, quickstart §2).

### The wizard for User Story 1

- [ ] T027 [P] [US1] Add the test step to the editor's shapes and helpers: `editor/types.ts`, `editor/constants.ts`, `editor/utils.ts` with `editor/utils.test.ts`, `frontend/src/constants.ts` and `editor/RulesStep/types.ts` (research R11; S0, S2, S7; W2, O2; FR-001, FR-003).
  - `EditorStep` gains `'test'`; `STEP_ORDER` becomes `['connection', 'documents', 'rules', 'test']`; `CONNECTION_STEPS` becomes `['Connection', 'Documents', 'Rules', 'Test', 'Publish']` (the current progress with five entries, not Figma's "Step 4 of 4", O2).
  - `pageTitleOf('test', mode)`: title "Test rules", hint "Choose a sample applicant to see which rules they meet and which messages they’d see. The data is made up, and nothing is shared." (FR-004).
  - `EDITOR_COPY.testRules` "Test rules"; the test step's ids in `ELEMENT_IDS` (heading, tabs, chips, panel, fields).
  - A pure `rulesNextActionOf(rules)`: `'test'` while any branch has a rule or a rule editor is open, `'publishWithoutRules'` otherwise (FR-001, EC "The first rule discarded").
  - `LeaveEditorAction` gains `{ type: 'test' }`.
  - Tests: `pageTitleOf('test', …)` in both modes; `rulesNextActionOf()` with no rule, a rule in a based branch only, and an open editor for the first rule.
- [ ] T028 [US1] Change the footer in `editor/EditorFooter.tsx` (depends on T027; S2, S7, S8; W2, F13, O1, O3, O5; FR-001, FR-003).
  - Rules step: one button to go on. "Test rules" (primary, with the forward arrow) when `rulesNextActionOf()` is `'test'`, otherwise "Publish without rules" ("Save without rules" when editing). No "Publish" or "Save" on the rules step any more.
  - Test step: "Back" (to the rules step) and "Publish" ("Save" when editing), primary and without an arrow (F13: not "Publish changes"). Neither is ever disabled by the personas or by generation (FR-003, FR-013).
  - The documents step keeps "Add rules →" and its own "Publish without rules" (S1). The action bar's look stays as built (O1); no "Save and exit" (O3).
  - Figma U10 `7058:62440` for F13's label only; U10's clickable step bar isn't built (O5).
- [ ] T029 [US1] Route "Test rules" through publishing's checks, and the dialog's way back, in `editor/index.tsx` (depends on T027, T028; research R11; S2, S5; W3, W8, F4, O6; FR-002, FR-003, FR-019).
  - Move publishing's pre-checks out of `publishRules()` into one function that both use: `firstProblem()` refuses with the server's message where publishing shows it, selects the branch and moves the focus to the rule (W3).
  - The footer's button on the rules step: `'test'` → `leaveEditor({ type: 'test' })`, otherwise the existing publish-without-rules path. `continueWith()` gains `'test'`: after the editor's question ("Save changes to Rule 01?", W8), if `rulesNextActionOf()` of the state after the answer isn't `'test'`, stay in the rules step; otherwise the pre-checks, then `goToStep('test')`.
  - On the test step, "Publish" / "Save" opens the publish and save dialog, unchanged (O6), whatever the personas' results.
  - `handleDialogCancel()` ("Check rules again", F4): from the test step, go to the rules step and open the first branch with findings, in tab order, or keep the rules step's open branch when none has any. From the documents step, as today.
  - A failed publish or save keeps the page, the step and the personas (FR-019). "Reload" after `409 rules_changed` stays as it is.

### UI for User Story 1

- [ ] T030 [US1] Build the test step's frame: `TestStep/index.tsx`, `TestStep/types.ts`, `TestStep/constants.ts`, `TestStep/utils.ts` with `TestStep/utils.test.ts`, `TestStep/TestDayLine.tsx`, and its place in `editor/index.tsx` (depends on T013, T026, T029; S8, S8.1; W1, W13, K3, O1, O2, O3; FR-004, FR-016; Figma U01 frame `7057:58709`, intro `7057:58714`).
  - `editor/index.tsx`: `usePersonas({ active: state.step === 'test', branches: rules.branches, context, openBranchKey })`, the step rendered while `state.step === 'test'`, the page title and hint from `pageTitleOf('test', mode)`, and the focus on the step's heading when it opens, as every step does.
  - `TestStep/index.tsx`: the layout under the intro, in Figma's order (test-day line, variant tabs, applicants row, the panel with data and results), and the three states: loading (no personas yet), failure (`state.failed`) and results. Only the panel scrolls; the header, progress, tabs, applicants row and action bar stay put (K3).
  - `TestStep/constants.ts`: the fixed copy of contracts/ui-screens.md "Copy" ("Generate all again", "Edit data", "Done", "Generate again", "Not shared", "Rule", "Not met", "Couldn’t be checked", "–", "Couldn’t create sample applicants", "Try again", "Cancel", "Generate new data").
  - `TestStep/utils.ts`: `formatDisplayDate(iso)`, `YYYY-MM-DD` to `dd.mm.yyyy`, with its test.
  - `TestDayLine.tsx`: `testDayLineOf(today)`, the first line of the content directly under the intro, shown whenever results are shown (also while one persona is generated anew), hidden while the personas are first generated and in the failure state (W1).
  - The step lives only in the signed-in wizard, behind `RequireSignIn`, with no new route (W13). Keep the page chrome and the progress as built (O1, O2) and no "Save and exit" (O3).
- [ ] T031 [US1] Build the variant tabs: `TestStep/VariantTabs.tsx` and `TestStep/VariantTab.tsx` (depends on T012, T030; S8.2; F6, O4; FR-015, FR-018; Figma tabs `7057:58717`, U07 tab `7058:61618`, tooltip `7058:61632`).
  - One tab per variant, by its name, in the rules step's tab order, with `BranchName` and the description's (i) as today. The selected tab is `state.branchKey`; changing it dispatches `selectBranch` and keeps the selected persona (FR-004). Arrow keys move between tabs.
  - A variant whose spec 003 check has the `none_can_meet` notice (`useRuleChecks().byBranch`) carries a warning icon after its name, whose tooltip shows `noticeText()` ("No applicant can meet the rules of Standard.", not Figma's "Rule 01 and Rule 02 can’t be met together, …") and opens on keyboard focus as well as on hover, with design-notes item 2's accessible name. Reuse `BranchName`'s findings segment if its `TabFindings` can carry the notice alone, otherwise a segment of `VariantTab`. No notice while the check is pending or incomplete (research R5).
  - Don't build the redesign's "What is a variant" tooltip (O4).
- [ ] T032 [US1] Build the applicants row: `TestStep/ApplicantsRow.tsx`, `TestStep/PersonaChip.tsx` and `TestStep/GenerateAllButton.tsx` (depends on T030; S8.3; W9; FR-004, FR-012, FR-015; Figma row `7057:58754`, chip icons `7057:58755`, `7057:58758`, `7057:58761`, U05 chips `7057:60317`, `7057:60322`, `7057:60327`).
  - Three chips, one per persona, with its name and an icon whose shape states the outcome for the selected variant: a check circle when the persona meets it, the warning diamond when not. No visible outcome text; each chip's accessible name is `chipNameOf()`. One chip selected, the first by default.
  - The keyboard pattern of design-notes (research R16): tabs inside the variant's tab panel, one selected and controlling the panel, or a radio group, with arrow keys.
  - "Generate all again": a tertiary button with a refresh icon at the right end of the row, styled like "Generate again" (`7057:58771`), calling `generateAll()` (W9). Its question comes with T046. The row keeps a slot at its right end for S8.8's status text.
- [ ] T033 [US1] Build the persona panel in read mode: `TestStep/PersonaPanel.tsx`, `TestStep/PersonaHead.tsx`, `TestStep/PersonaData.tsx`, `TestStep/DocumentValues.tsx` and `TestStep/ValueRow.tsx` (depends on T030; S8.4; F9, F10, F11, K1, K3; FR-004, FR-005, FR-007, FR-013; Figma heading `7057:58769`, values `7057:58772`, `7057:59186`, `7057:59599`, document headings U02 `7058:60654`, `7058:60659`, K1 `7057:59074`, `7057:59082`, U08 values `7058:61711`, scroll `7058:61704`, `7058:61705`, `7058:61835`).
  - Head: `dataHeadingOf()` ("Mia’s data") and "Generate again" (tertiary, refresh icon, `generateOne(selected)`), absent for a persona being generated. "Edit data" comes with T043.
  - Values: `shownFieldsOf()` grouped under the document headings "Personal ID" and "Driving licence", in catalog order, each labelled without the document ("Date of birth (Age)") (F9). Dates as `dd.mm.yyyy` (`formatDisplayDate()`); a date of birth with its age, "08.07.2007 (age 19)" (`ageSuffixOf()`, F10); enums by their labels (option sets); "Licence classes" as the codes in one row, "B, BE", and each class date in a row of its own, "Licence class B – Issue date", shown only while the class is held (F11); an empty value as "Not shared".
  - Failing values (K1): a value in the view's `failingFields` has Figma's red dot and bold text, with design-notes item 3's hidden text.
  - Only the panel scrolls (K3), with the data list and the results sharing its scrollbar as Figma draws it (U08).
- [ ] T034 [US1] Build the results: `TestStep/ResultSection.tsx`, `TestStep/ResultTable.tsx`, `TestStep/ResultRow.tsx` and `TestStep/MemberRows.tsx` (depends on T012, T030; S8.6; F3, F5, F6, F8, F14, W5, W10, K4; FR-014, FR-015, FR-018; Figma heading `7057:58811`, table `7057:58825`, met list `7057:59239`, U06 note `7057:61658`, U07 heading `7058:61454`, U08 table `7058:61764`).
  - Notice (F6): for a variant with spec 003's `none_can_meet` notice, `noticeText()` above the heading.
  - Heading: the view's `heading` ("Result: doesn’t meet 1 rule and 1 group", W10).
  - A variant the persona doesn't meet: columns "Rule" and "Message Mia reads". Reported rows show name, statement (`RuleSentence` from `components/RuleRow/RuleSentence.tsx` for a rule; design-notes item 1 for a group), the status "Not met" or "Couldn’t be checked" each with its own icon, and the message (F8). Below a reported group, indented, `MemberRows` lists its members that aren't met, recursively, with name, statement and status (W10). Then the other rows: check icon, name, statement and "–" (F14).
  - A variant the persona meets: "Result: meets the rules", the list "Rules Mia meets" with every top-level rule and group (check icon, name, statement), no message column and no success message (F3, F14).
  - A variant without rules: "Result: meets the rules" and `noRulesNoteOf()` (U06).
  - F5, W5 and K4 add no element: generation's goal 1 (T019), the evaluation's boundaries and frame 15's naming need nothing here.
- [ ] T035 [US1] Build the loading states: `TestStep/PersonaPlaceholder.tsx`, and their place in `TestStep/index.tsx`, `TestStep/ApplicantsRow.tsx` and `TestStep/PersonaPanel.tsx` (depends on T032, T033, T034; S8.8; F14, W7, W9; FR-004, FR-012, FR-013; Figma U11 frames `7062:50960`, `7062:51249`, pills `7062:51206`–`7062:51208`, status `7062:51210`, `7062:51497`, cards `7062:51211`, `7062:51226`, `7062:51498`, `7062:51513`).
  - First open, "Generate all again" and "Try again" (frame 18): the tabs and the action bar are real; three skeleton pills replace the chips; `creatingAllText` sits at the right end of the applicants row in a polite `role="status"`; skeleton data and result cards keep the layout, the result rows with a placeholder for the statement (F14); no test-day line; nothing can be edited.
  - One persona (frame 19): only its pill, data card and result card are skeletons, without "Edit data" or "Generate again"; the status reads `creatingOneOf(persona)`; the other personas stay usable and the test-day line shows.
  - The focus is never lost when a loading state ends (V9). A later create or edit flow opens with frame 18 and three new personas, since the state lives with the page (W7).
- [ ] T036 [US1] Build the failure state: `TestStep/GenerationFailed.tsx` in `TestStep/index.tsx` (depends on T030; S8.9; F7; FR-013; Figma U12 frame `7062:51536`, `7062:51782`–`7062:51785`).
  - In place of the applicants row and the panel: "Couldn’t create sample applicants", `failureHintOf(mode === 'edit')`, and a "Try again" button that calls `retry()` and shows frame 18's loading state. No "Your rules are saved." (F7). The tabs, Back and "Publish" / "Save" stay usable; no test-day line.
- [ ] T037 [US1] Validate User Story 1 with `specs/004-rule-test-personas/quickstart.md` V1, V2, V4.2, V6, V7 and V8, and the gates (`npm run lint`, `npm test`, `npm run build`). Record any difference from the expected texts, and fix it in the task that owns it.

**Checkpoint**: the test step shows three personas and their results per variant, generates one or
all anew, and fails gracefully; publishing and saving go through it unchanged. This is the MVP.

---

## Phase 4: User Story 2 - Adjust a persona to test a case that matters (Priority: P2)

**Goal**: "Edit data" turns the selected persona's values into fields in the panel; every valid
change applies at once and the results follow; invalid entries are pointed out under their field;
changes of outcome are announced; generating anew asks first when it would replace changes.

**Independent Test**: In the "Passenger transport licence" example, edit personas into the cases
of US2-AS1 to AS7 and check quickstart V3 and V4: the fields, the errors, the results, the
announcements, "· edited", and the questions before generating anew.

### Logic for User Story 2 (with Vitest)

- [ ] T038 [P] [US2] Add the editing helpers and the panel's drafts reducer to `TestStep/utils.ts`, with `TestStep/utils.test.ts` (contracts/personas.md "Editing helpers"; research R12; FR-007 to FR-009).
  - `parseDisplayDate(text)`: a `dd.mm.yyyy` entry gives `YYYY-MM-DD`, an empty entry `null`, anything else "Enter a date that exists, e.g. 28.02.2007.".
  - `parseWholeNumber(text)`: digits give a number, an empty entry `null`, letters or decimals "Enter a whole number, e.g. 25." (W11).
  - `dateOfBirthForAge(age, current, today)`: a date of birth that gives `age` today, keeping the day and month of `current` (a 29 February becomes 1 March in a year without it); for any age it accepts, `ageOn(result, today) === age`; an age that gives no date of birth has design-notes item 6's error.
  - `nameProblem(text)`: "Enter a name." for a name that is empty after trimming.
  - `draftsReducer()`: the panel's drafts by field key, with their errors; "Done" drops the invalid ones (design-notes item 9).
  - Tests: 31.02.2007, 29.02 in leap and other years, empty entries, "2.5" and "12a", US2-AS1's age 20 keeping day and month, US2-AS2's day 21 years before today, the property over many ages and days.
- [ ] T039 [P] [US2] Write `personas/announcements.ts` with `announcements.test.ts`: `announcementOf(before, after, persona, branches)` (data-model.md "Announcements"; FR-017, F2).
  - Compares the edited persona's `met` per branch before and after one change; in tab order, one sentence per change (`nowMeetsOf()`, `noLongerMeetsOf()`), joined with a space; empty when nothing changed.
- [ ] T040 [US2] Add the editing and confirm actions to `personas/personaState.ts` and `personas/types.ts`, with `personaState.test.ts` (depends on T039; data-model.md "Actions"; research R10, R12; FR-006, FR-008, FR-009, FR-012, FR-017).
  - `setValue` (slot, key, value, the persona's `met` per branch before and after): changes one value, never `generated`, and sets `announcement` with `announcementOf()`. The hook computes the two `met` maps with the loaded results module, so that the reducer stays out of the evaluator's chunk (Bundle rule).
  - `rename` (slot, a non-empty name): changes the name, no announcement (US2-AS7).
  - `startEditing` / `stopEditing`: set or clear `editing`; never for a persona being generated (FR-013). `select` and `selectBranch` already end edit mode (T023).
  - `generateOne` / `generateAll` carry the current fields: if a persona to generate anew has `changedKeys()`, set `confirm` instead of starting the run (FR-012). `confirmed` starts it (merged as in T023); `cancelled` closes the question. Generating anew keeps the names (research R10).
  - Tests: each action; the question only with changes, naming every persona with changes; `generated` untouched by edits; announcements only from `setValue`.
- [ ] T041 [US2] Add US2's scenarios and edge cases to `personas/scenarios.test.ts` (depends on T039; research R14; SC-001).
  - US2-AS1: a date of birth giving age 20 no longer meets Standard, naming Rule 01 with its message, still meets Ambulance, and `announcementOf()` gives "… no longer meets the rules of Standard." (the date arithmetic is pinned in T038). US2-AS2: the day 21 years before today meets "at least 21 years old". US2-AS3: "STUTTGART" fails Rule 02 respecting letter case and meets it ignoring case. US2-AS4: removing class B hides its date (`shownFieldsOf()`) and Rule 04 is "Not met"; adding B again shows the earlier date. US2-AS5: an empty date of birth makes Rule 01 "Couldn't be checked" in both variants. US2-AS6: no family name. US2-AS7: a rename changes no result.
  - Edge cases: a date of birth in the future and an age of 200 evaluate like any value; changing `pid.birthdate` leaves `mdl.birth_date` unchanged; SC-001's cases: an age exactly at the limit, a date some months from now at the end of a month, German letters, spaces at the start and end.
- [ ] T042 [US2] Wire editing into `frontend/src/hooks/usePersonas.ts` (depends on T026, T040).
  - `setValue(slot, key, value)` computes the persona's `met` per branch before and after with the loaded module, then dispatches; `rename`, `startEditing`, `stopEditing`; `generateOne`, `generateAll` pass the current fields; `confirmed` and `cancelled`.

### UI for User Story 2

- [ ] T043 [US2] Build edit mode in the panel: `TestStep/PersonaEditor.tsx`, with "Edit data" / "Done" in `TestStep/PersonaHead.tsx` and the switch in `TestStep/PersonaPanel.tsx` (depends on T038, T042; S8.5; F1, W11; FR-006, FR-008, FR-009, FR-017; Figma U02 frames `7058:60514`, `7058:60670`, Name `7058:60652`, invalid state `7058:60812`, `7058:60824`, "Edit data" `7057:58770`).
  - "Edit data" (tertiary, pencil icon) turns the values into fields under the same document headings and becomes "Done", which turns them back. No dialog, Cancel, Close, "Save and test" or intro "Results update when you save." (F1).
  - The panel's drafts live in `useReducer(draftsReducer)`. Every valid entry applies at once (`setValue`, `rename`); an invalid one shows its error under its field (`aria-describedby`, `aria-invalid`), KERN 2.8's error pattern, and the persona keeps its last valid value while its other changes apply (FR-008).
  - Name: "Enter a name." under it when empty, and the persona keeps its name (W11).
  - Focus: "Edit data" moves it to the first field, "Done" back to "Edit data". Switching persona or variant ends edit mode. A persona being generated has no "Edit data".
- [ ] T044 [US2] Build the fields by kind: `TestStep/ValueField.tsx`, `TestStep/DateOfBirthField.tsx`, `TestStep/ChoiceField.tsx` and `TestStep/ValuesField.tsx`, used by `TestStep/PersonaEditor.tsx` (depends on T043; S8.5; F10, F12, W4, W11, W12; FR-005 to FR-009; Figma Age today `7058:60657`, licence classes `7058:60661`, class date `7058:60662`, Nationality `7058:60663` and Expiry date `7058:60664` (hidden in Figma, built here)).
  - A field for every value shown, none read-only or hidden (F12): `ValueField` for text, a whole number (`parseWholeNumber()`, W11) and a date as `dd.mm.yyyy` (`parseDisplayDate()`); `DateOfBirthField` for a date of birth, with "Age today" beside it (`dateOfBirthForAge()`, F10); `ChoiceField`, a select of labels for one value of a set; `ValuesField` for several values picked from a list, licence classes by code (B, BE, C1, …) and nationalities by label (German, Italian, …), never typed.
  - `ValuesField` reuses `editor/RulesStep/RuleEditor/ValuesPicker.tsx` if its interface serves persona fields as it is; otherwise move it to `frontend/src/components/` with a narrower interface, keeping the rule editor's behaviour (R16).
  - The date input: a text input with `inputmode="numeric"`, as KERN 2.8 allows (R16).
  - Every field can be cleared, which makes the value empty.
  - Class date rows only for the classes held: removing B hides its dates, adding B again brings the earlier ones back (W4). Given and family name are fields of their own under "Personal ID", labelled as the rules name them, edited separately from the persona's name (W12).
- [ ] T045 [P] [US2] Add "· edited" to `TestStep/ValueRow.tsx` (S8.4; K2; FR-012; Figma U03 `7058:61193`): after each value in `changedKeys()`, with design-notes item 3's hidden text.
- [ ] T046 [US2] Build the questions before generating anew: `TestStep/RegenerateDialog.tsx`, with `ConfirmDialog`, opened from `state.confirm` in `TestStep/index.tsx` (depends on T042; S8.7; W9; FR-012; Figma U04 frame `7058:61209`, dialog `7058:61334`).
  - One persona: `confirmOneOf()` with "Cancel" and "Generate new data". All: `confirmAllOf()` naming every persona with changes, with "Cancel" and "Generate new data". "Generate again" and "Generate all again" ask only when a persona to generate anew has changes.
- [ ] T047 [US2] Build the announcements: `TestStep/PersonasAnnouncer.tsx` in `TestStep/index.tsx` (depends on T042; S8.10; F2; FR-017).
  - A visually hidden, polite `role="status"` region with `state.announcement`, which never moves the focus; the same sentence twice is announced twice. No visible toast (F2).
  - Check that the loading status (T035) and this region don't interrupt each other (R16); keep them separate regions.
- [ ] T048 [US2] Validate User Story 2 with `specs/004-rule-test-personas/quickstart.md` V3 and V4, and the gates. Record and fix any difference in the task that owns it.

**Checkpoint**: personas can be edited into any case; results and announcements follow every
valid change; generating anew asks first when it would replace changes.

---

## Phase 5: User Story 3 - Keep testing while the rules change (Priority: P2)

**Goal**: The personas keep their values across round trips to the rules step; data that rules
start checking is filled in as generation would choose it, without changing existing values;
data that no rule checks any more is hidden and comes back with its earlier value; results follow
the current rules and branches.

**Independent Test**: Edit the personas, go back to the rules step, change, add and delete rules
and branches, and return (quickstart V5).

### Logic for User Story 3 (with Vitest)

- [ ] T049 [P] [US3] Write `personas/substitute.ts` with `substitute.test.ts` (research R8; data-model.md "Substitution").
  - Turns a branch's checked tree and a slot's fixed values into a formula over the free variables, rule by rule and before any negation:
    - all of a rule's values fixed: `true` if `ruleOutcome()` (`evaluation.ts`) is `'met'`, `false` otherwise;
    - none fixed: its formula, unchanged;
    - class K's date, classes fixed and date free: `false` if the classes are empty or lack K, the date's literal otherwise;
    - class K's date, date fixed and classes free: `false` if the date is empty, `held(K) ∧ (ruleOutcome() for the date is 'met')` otherwise.
  - Tests: each row; ¬X is true for a rule X on an empty value, as the evaluation counts it; hidden values count as fixed.
- [ ] T050 [US3] Add filled slots to `personas/generation.ts`, with properties in `personas/generation.test.ts` (depends on T019, T049; research R8; contracts/personas.md "Keeps"; FR-020).
  - A filled slot plans on its substituted formulas (`substitute.ts`) for goals 1 to 4, and its new values cover only the fields that were absent. Hidden values are fixed, never filled.
  - Properties: a fill changes no existing value; a new rule on a free field is met by one persona and failed by another where applicants can do both (US3-AS2).
- [ ] T051 [P] [US3] Add the fill run to `personas/personaState.ts`, with `personaState.test.ts` (depends on T040; research R9, R10; data-model.md "Actions"; FR-019, FR-020).
  - `opened` with personas that lack a value for a current field starts a fill run: those slots filled, the rest kept, merged with a running run as in T023. A filled slot's persona shows as a placeholder for its new fields.
  - `runSucceeded` for a filled slot writes only the new fields into `values` and `generated`.
  - `opened` selects the rules step's open branch, so a deleted variant's tab never stays selected (US3-AS4).
  - Tests: no fill without missing values; a fill alongside a running "Generate again"; hidden values never filled.
- [ ] T052 [US3] Add US3's scenarios to `personas/scenarios.test.ts` (depends on T050, T051; research R14).
  - US3-AS1: Standard's Rule 01 from 21 to 18 keeps every value and the results follow. US3-AS2: a new rule "Nationality includes one of Germany" gives every persona a nationality, at least one meets it and one doesn't, and no earlier value changes. US3-AS3: deleting the only rule on "City or town" removes the field and every result's dependence on it; adding it back brings the earlier values. US3-AS4: a branch added has results, a branch deleted has none. EC "A rule that the main branch changes": a based branch's results follow.

### UI for User Story 3

- [ ] T053 [US3] Show fill runs and the rows that come and go in `TestStep/ApplicantsRow.tsx`, `TestStep/PersonaPanel.tsx` and `TestStep/PersonaPlaceholder.tsx` (depends on T051; S8.4, S8.8; W6, W7; FR-019, FR-020).
  - Filling after returning from the rules step: as frame 19 for each persona being filled, with design-notes item 7's status text (T013).
  - The panel shows rows only for the current fields, so rows come and go with the rules, and a row that comes back keeps its earlier value (W6). Check that `usePersonas()` posts filled slots with their fixed values.
  - A later create or edit flow opens with frame 18 and three new personas (W7, US3-AS5).
- [ ] T054 [US3] Validate User Story 3 with `specs/004-rule-test-personas/quickstart.md` V5, and the gates. Record and fix any difference in the task that owns it.

**Checkpoint**: all three stories work; the personas follow the rules through round trips.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Privacy, accessibility, the full validation, and the documentation checklist (last).

- [ ] T055 [P] Audit privacy (FR-019, FR-021, SC-006; quickstart V10): no `console.*`, `localStorage`, `sessionStorage`, IndexedDB, `fetch` or `apiFetch` in `personas/`, `frontend/src/hooks/usePersonas.ts`, `frontend/src/hooks/useTodayInGermany.ts` or `TestStep/`; the publish payload is unchanged; the network tab shows no request with persona values or results; no console output from the step, the worker or the hook.
- [ ] T056 [P] Review accessibility (SC-007; quickstart V9; research R16): keyboard only (tabs and chips by arrow keys, the tab tooltip on focus, edit mode and "Done"); NVDA with Firefox or VoiceOver with Safari (chip names with outcomes, announcements once and politely, "Creating 3 sample applicants…", errors with their fields, statuses as text, hidden texts of K1 and K2); 200 % zoom and 320 px width with only the panel scrolling; focus rings for keyboard focus only. Record the chips' pattern as confirmed, or change it, in `specs/004-rule-test-personas/design-notes.md`.
- [ ] T057 Run every gate and the whole quickstart (`specs/004-rule-test-personas/quickstart.md` §2 and V1–V10): `npm run lint`, `npm test`, `npm run build` with the chunk checks; `uv run ruff check .`, `uv run ruff format --check .`, `uv run mypy app/ scripts/ tests/`, `uv run python -m scripts.export_check_fixtures --check`, and `tests/unit/test_check_fixtures.py`. Collect the UI tasks' unresolved visual-check items, each with its O item or "KERN 2.8 vs Revamp".
- [ ] T058 Apply the documentation checklist to `CLAUDE.md`, `docs/ARCHITECTURE.md` and `README.md`, the last task (plan "Rules for /speckit-tasks"; CLAUDE.md "Documentation checklist").
  - `CLAUDE.md`: in "Rules and rule checks", one-line rules for spec 004 that point to `docs/ARCHITECTURE.md`: the evaluator is `utils/rules/evaluation.ts`, the port of `evaluation.py` pinned by the generated vectors (`rule_outcomes`, `branch_evaluations`); personas live in `utils/rules/personas/`, pure, each module with its `*.test.ts`, never stored, sent or logged (no `console.*` in `personas/`, its worker, `usePersonas` or `useTodayInGermany`); the evaluator and the checked trees reach the page only through `usePersonas`'s dynamic `import()`.
  - `docs/ARCHITECTURE.md`: the test step in the wizard (steps, the gate through publishing's checks, the dialog's way back), generation in a module worker with its deadline and watchdog, evaluation on the main thread, the personas' lifetime, and nothing stored or sent.
  - `README.md`: the fixture script's new `branch_evaluations` vectors, under "Common Commands". No new environment variable or dependency to list.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies. T002 follows T001 (same file).
- **Foundational (Phase 2)**: T003 → T004 (backend); T005 in parallel with them; T006 after T004
  and T005; T007 and T008 at any time; T009 and T010 after T007; T011 after T006, T009 and T010.
  It blocks every user story.
- **User Story 1 (Phase 3)**: after Phase 2 (and T001 for T013). The MVP.
- **User Story 2 (Phase 4)** and **User Story 3 (Phase 5)**: after User Story 1, which builds the
  test step they extend. They don't depend on each other, but both change
  `personas/personaState.ts` (T040, T051), `personas/scenarios.test.ts` (T041, T052) and the
  panel's components: run those tasks one after the other if the stories run in parallel.
- **Polish (Phase 6)**: after the stories it covers. T058, the documentation, is the last task.

### User Story Dependencies

- **US1 (P1)**: after Foundational. No dependency on other stories.
- **US2 (P2)**: after US1 (the step, the panel and the reducer). Testable on its own with
  quickstart V3 and V4.
- **US3 (P2)**: after US1 (the step and generation). Testable on its own with quickstart V5;
  without US2, the round trips are tested with generated values only.

### Within Each User Story

- The plan's order: the logic of `personas/` bottom-up, each module with its test; then the worker
  and the hooks; then the wizard; then the UI; then the story's validation.
- In US1: T012, T013, T015, T016 and T017 first; T014 after T013; T018 after T016 and T017; T019
  after T014's dependencies, T015 and T018; T020, T021 and T022 after T019; T023 any time after
  T007; T024 after T019; T026 after T014, T023, T024 and T025; T027 any time; T028 → T029; T030
  after T026 and T029; T031 to T036 after T030, T035 after T032 to T034.
- In US2: T038, T039 and T045 first; T040 and T041 after T039; T042 after T040; T043 → T044; T046
  and T047 after T042.
- In US3: T049 and T051 first; T050 after T049; T052 after T050 and T051; T053 after T051.
- UI tasks: `get_design_context` and `get_screenshot` on their nodes, then the numeric and visual
  checks, before the task is done.

### Parallel Opportunities

- Phase 2: T003/T004 (backend), T005, T007 and T008 together; then T009 with T010.
- US1: T012, T013, T015, T016, T017, T025 and T027 together; T021 with T022; T024 with T023.
- US2: T038, T039 and T045 together; T046 with T047.
- US3: T049 with T051.
- Polish: T055 with T056.

---

## Parallel Example: Foundational

```bash
# Backend vectors and the frontend move at once:
Task: "Add branch_evaluations to backend/scripts/export_check_fixtures.py"            # T003, then T004
Task: "Move checks/testEvaluator.ts to frontend/src/utils/rules/evaluation.ts"         # T005
Task: "Write personas/types.ts and personas/constants.ts"                             # T007
Task: "Write personas/random.ts with random.test.ts"                                  # T008
```

## Parallel Example: User Story 1

```bash
# Independent modules and helpers:
Task: "Export noticeText() from checks/findingMessages.ts"                             # T012
Task: "Write personas/messages.ts with messages.test.ts"                               # T013
Task: "Write personas/goals.ts with goals.test.ts"                                     # T015
Task: "Write personas/models.ts with models.test.ts"                                   # T016
Task: "Write personas/samples.ts with samples.test.ts"                                 # T017
Task: "Extract useTodayInGermany() into frontend/src/hooks/useTodayInGermany.ts"       # T025
Task: "Add the test step to editor/types.ts, constants.ts, utils.ts"                   # T027

# Once generation.ts exists:
Task: "Write personas/scenarios.test.ts with US1's scenarios"                          # T021
Task: "Write personas/performance.test.ts"                                             # T022
```

## Parallel Example: User Story 2

```bash
Task: "Add the editing helpers and drafts reducer to TestStep/utils.ts"                # T038
Task: "Write personas/announcements.ts with announcements.test.ts"                     # T039
Task: "Add '· edited' to TestStep/ValueRow.tsx"                                        # T045
```

## Parallel Example: User Story 3

```bash
Task: "Write personas/substitute.ts with substitute.test.ts"                           # T049
Task: "Add the fill run to personas/personaState.ts"                                   # T051
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1: design notes and tokens.
2. Phase 2: vectors, the evaluator, and the personas' groundwork. **Stop and check** that every
   vector replays.
3. Phase 3: User Story 1.
4. **Stop and validate** (T037): quickstart V1, V2, V4.2, V6, V7, V8. The step can ship: every
   publish with rules goes through it, and nothing waits for it.

### Incremental Delivery

1. Setup + Foundational → the evaluator is exact.
2. US1 → generated personas and their results (MVP).
3. US2 → editing, announcements and the questions before generating anew.
4. US3 → round trips with the rules step, filling new data.
5. Polish → privacy, accessibility, full quickstart, documentation.

### Parallel Team Strategy

1. Together: Setup and Foundational (backend and frontend in parallel).
2. During US1: one developer on generation (T015–T022), one on the wizard and the hooks
   (T023–T029), then the UI together (T030–T036).
3. After US1: US2 and US3 in parallel, taking turns on `personaState.ts`, `scenarios.test.ts` and
   the panel's components.

---

## Notes

- [P] tasks touch different files and depend on no unfinished task in their phase.
- [Story] labels map tasks to user stories for traceability.
- Every UI task cites its screen and items; together they cite every item of contracts/ui-screens.md's
  coverage index: O1 (T028, T030), O2 (T027, T030), O3 (T028, T030), O4 (T031), O5 (T028), O6 (T029), W1 (T030), W2 (T027, T028), W3 (T029), W4 (T044),
  W5 (T034), W6 (T053), W7 (T035, T053), W8 (T029), W9 (T032, T035, T046), W10 (T034), W11 (T043,
  T044), W12 (T044), W13 (T030), F1 (T043), F2 (T047), F3 (T034), F4 (T029), F5 (T034, T019),
  F6 (T031, T034), F7 (T036), F8 (T034), F9 (T033), F10 (T033, T044), F11 (T033), F12 (T044),
  F13 (T028), F14 (T034, T035), K1 (T033), K2 (T045), K3 (T030, T033), K4 (T034).
- Never edit `evaluator-vectors.json` or `caseFolding.ts` by hand; never add a dependency, a
  setting, a `vitest.config.ts` or a `pytest.ini`.
- Commit after each task or logical group, and stop at any checkpoint to validate the story.
