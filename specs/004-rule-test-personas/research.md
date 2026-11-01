# Research: Test Rules with Personas

**Phase 0 output of `/speckit-plan`** | **Date**: 2026-11-01 | **Spec**: [spec.md](spec.md)

This file records each technical decision behind the plan, with the reason for it and the
alternatives that were weighed. It builds on the research of spec 002
([../002-connection-rules/research.md](../002-connection-rules/research.md)) and spec 003
([../003-rule-consistency-checks/research.md](../003-rule-consistency-checks/research.md)), whose
decisions still apply. In this file, "003-R5" means spec 003's R5.

**Sources**:
- the spec, with its 3 Clarifications of 2026-10-29 and its 16 of 2026-11-01
- the Figma audit [figma-audit/report.md](figma-audit/report.md), with items F1–F14, W1–W13 and
  K1–K4
- the code on this branch: `frontend/src/utils/rules/` (spec 003's `checks/`, including the
  solver, the theories and `testEvaluator.ts`), `frontend/src/pages/FormConnectionEditor/`,
  `frontend/src/hooks/useRuleChecks.ts`, `backend/app/services/evaluation.py`,
  `backend/app/catalog.py` and `backend/scripts/export_check_fixtures.py`

Points to confirm while coding are marked **Verify at implementation** and collected in R16.

**Who decides what**: spec.md and its Clarifications decide what the test step does. Figma
section "Test · 1 · Test rules" (file `s8mU9oJDq3411e8bxMjQO9`, node `7057:58708`) decides the
step's look and layout. Two kinds of audit item override or extend it:
- F1–F14 say where Figma must change.
- W1–W13 are built without frames.

K1–K4 are cosmetic details, built as designed. The page around the step stays as built (O1–O6 in
[contracts/ui-screens.md](contracts/ui-screens.md)).

## Technical Context: open points and how they were resolved

| Open point | Resolved in |
|---|---|
| Where personas, their results and their generation are computed, and on which thread | R1 |
| How the results match the evaluation exactly (FR-014, SC-001) | R2 |
| Which data a persona has, in which order, under which names (FR-005, FR-009) | R3 |
| How a persona's values become the documents that the evaluation reads | R4 |
| What the step shows for a persona and a branch (FR-015, FR-018) | R5 |
| How generation reaches goals 1 to 3 of FR-011, which concern branches | R6 |
| How generation reaches goal 4, which concerns rules and groups, with plausible values (FR-010) | R7 |
| How one persona is generated anew, and how new data is filled in (FR-012, FR-020) | R8 |
| How generation runs within 5 seconds without making anything wait, and how it fails (FR-013, SC-003) | R9 |
| Where the personas live, how long they last, and what is announced (FR-017, FR-019) | R10 |
| How the test step fits into the wizard (FR-001 to FR-003) | R11 |
| How a persona is edited (FR-006 to FR-009) | R12 |
| Where the texts come from, and which copy the decisions leave open | R13 |
| How it is tested to SC-001 and SC-002 | R14 |
| How the Figma items reach the tasks | R15 |
| What still needs a check at implementation | R16 |

No open point blocks the plan.

---

## R1. Everything stays in the browser

**Decision**: personas, their generation and their test results are computed in the browser, by
pure TypeScript modules in a new folder, `frontend/src/utils/rules/personas/`.
- **Generation** runs off the main thread, in one dedicated module Web Worker.
- **Evaluation** of the personas against the branches runs on the main thread, synchronously,
  whenever a persona, the rules or the day changes.

There is no new endpoint, nothing is stored, and the server never sees a persona.

**Rationale**:
- **The input lives in the browser.** The rules being tested aren't stored until "Publish" or
  "Save" (spec 001), and the personas must never be stored (FR-019, FR-021). Keeping both in the
  tab makes FR-021 hold by construction: nothing is stored, sent or logged.
- **Evaluation is cheap enough for the main thread.** It is linear in the rules: at spec 002's
  limits, 3 personas × 20 branches × 200 items, about 12,000 rule outcomes, take a few
  milliseconds. Results can follow each keystroke at once (FR-017), well within SC-003's second,
  without a round trip.
- **Generation needs a worker.** It searches for up to 5 seconds (FR-013), and editing the other
  personas, going back, publishing and saving must not wait for it. A worker keeps the page
  responsive, and the main thread can stop a worker that runs too long.
- **The logic that must be exact is tested by the gate.** Vitest runs it in `node` (constitution
  III), which backend tests don't do.
- **There is precedent**: spec 003 checks rules in a worker for the same reasons (003-R1).

**Alternatives considered**:
- *A backend endpoint that runs `evaluate_branch()`*: parity would come free. But every edit would
  send the unsaved rules and the persona to the server. Generation's CPU would run in the API
  process, where 003-R1 rejected the checks' for the same reason. The UI would gain a
  network-failure state, and the tests that matter most wouldn't be a gate. Rejected.
- *Evaluation in the worker too*: a round trip per keystroke, and a "results pending" state that
  FR-017's "at once" doesn't allow. Rejected.
- *Generation on the main thread*: it could block typing for up to 5 seconds, which FR-013 forbids.
  Rejected.

## R2. One evaluator in the browser: spec 003's port of `evaluation.py`

**Decision**: `checks/testEvaluator.ts` is a plain port of the evaluator's comparisons and its AND/OR
evaluation. Spec 003 wrote it as test support for its oracle (003-R13), and Python's vectors already
pin it. It moves to `frontend/src/utils/rules/evaluation.ts` and becomes production code. Its test
moves with it, from `checks/testEvaluator.test.ts` to `evaluation.test.ts`, and `checks/testOracle.ts`
imports it from the new place.
- **It gains the parts of `evaluate_branch()` it left out**:
  - `_messages()`: the reported items with their messages. It walks the top level in order, and a
    group that isn't met reports its own message, or its members' if it has none.
  - `_results()`'s order: each group followed by its members, with the group that contains them.
- **It keeps spec 003's separation.** It shares no code with `literals.ts`, the theories,
  `checkedTree.ts` or the solver. Generation plans with the solver (R6, R7), the step's results come
  from the evaluator, and the tests compare the two. A mistake in one shows up as a disagreement
  with the other.
- **Whole-branch vectors**: `backend/scripts/export_check_fixtures.py` gains `branch_evaluations`.
  Each vector holds:
  - a branch
  - the delivered documents
  - a day of sharing
  - `evaluate_branch()`'s `met`
  - its `results`: id, group and outcome
  - its `messages`: id and message

  The branches cover:
  - AND and OR levels
  - groups and sub-groups, with and without a message of their own
  - a based branch with removed items and a dissolved inherited group
  - a branch without items
  - rules that are met, not met, or couldn't be checked
  - a rule on a class that the licence doesn't list
  - a class list that is empty

  `evaluation.test.ts` replays them. The existing `--check` and
  `backend/tests/unit/test_check_fixtures.py` catch drift. With the 129 rule-outcome vectors already
  replayed, this pins every part of SC-001: the overall outcome, the items reported, "not met" or
  "couldn't be checked", and the messages.
- **One part stays unported**: date-times with a time zone (`_DATE_TIME`). Persona dates are always
  `YYYY-MM-DD` (R4), so the evaluator's refusal of a date-time never fires for a persona.

**Rationale**: FR-014 asks for exactly what the evaluation would return, and spec 003 already wrote
and pinned the port. A second port would be a second thing to keep equal to Python.

**Alternatives considered**:
- *Importing `testEvaluator.ts` from production code under its test name*: misleading, since
  production code would depend on test support. Rejected.
- *A second, production-only port*: two evaluators would drift. Rejected.
- *Evaluating on the server*: see R1. Rejected.

## R3. Which data a persona has

**Decision**: `personaFieldsOf(branches, context)` (`personas/fields.ts`) derives the **persona
fields**.
- **Which fields**: each spec 003 variable (003-R3) that a rule counting in some branch checks: the
  document type, field, part and, for a class's dates, licence class. The function takes the union
  of the variables of every branch's `buildCheckedBranch()` (FR-005, EC "Rules removed in a
  branch"). The test step can only be reached while no rule has a problem (FR-002), so no rule is
  left out and every rule that counts is in a checked tree.
- **Licence classes** (`mdl.driving_privileges.classes`) are a field whenever a class's date is one,
  even if no rule checks the classes themselves (FR-005).
- **Order**: by document, in catalog order (Personal ID, then Driving licence), then by the catalog's
  field order, with parts in their part order. Class dates come right after "Licence classes", by
  the licence-class set's order, the issue date before the expiry date.
- **Names** come from `dataOfResolved()` (`utils/rules/statements.ts`), the rules' own wording
  without the document, under the document's label as heading: "Date of birth (Age)" under
  "Personal ID", "Licence class B – Issue date" under "Driving licence" (FR-005, F9, F11). The
  kind, value set and cardinality (`multiple_values`) come from the catalog, and so does
  `date_of_birth`, which shows the age (FR-007).
- **Class dates** show only while the persona's classes include their class (FR-005, FR-020, W4).
- **Given and family names** are fields like any other when rules check them (FR-009, W12).
  Generation fills them from the persona's name (R7).

**Rationale**: the variables are exactly "the fields, and parts of fields, that at least one rule
evaluated in some branch checks". Deriving them from `buildCheckedBranch()` makes the test step, the
checks and the evaluation agree, by construction, on which rules count.

**Alternatives considered**: *walking the rules state again*: a second definition of "the rules
that count" beside `effectiveItems()` and `buildCheckedBranch()`. Rejected.

## R4. Persona values, and the documents they stand for

**Decision** ([data-model.md](data-model.md), "Persona"):
- **Values by field key**: a whole number for a number field, a text for a text field, an option
  value of the field's set for a single-value enum, a list of option values for a field that holds
  several, and `YYYY-MM-DD` for a date.
- **Empty and absent are different.** An empty value (`null`, `''` or `[]`) stands for a document
  that doesn't give it (FR-006). An absent key means the persona never had a value, which only
  matters for what FR-020 fills in (R8).
- **Hidden values stay.** Values of fields that are no longer persona fields stay with the persona,
  hidden, so that they come back with their earlier value (FR-020). So do the dates of classes the
  persona doesn't hold (W4).
- **`generated`**: the values as generation last gave them. A value is changed while it differs
  from its generated value. This drives the confirm questions (FR-012) and the "· edited" marker
  (K2).
- **`applicantOf(persona, fields)`** builds the documents that the evaluator reads, "documents that
  give the persona's values and no others" (FR-014):
  - only the current persona fields, by document type and field key;
  - the parts of the place of birth in one object;
  - `driving_privileges` as one entry per class held, `{ vehicle_category_code, issue_date?,
    expiry_date? }`, with each class date that is a field and isn't empty;
  - empty values left out, so that the evaluator reads them as missing.
- **What follows, pinned by tests**: removing class B while another class remains makes the rules on
  B's dates "not met" (US2-AS4). Removing every class makes them "couldn't be checked", because the
  evaluator reads an empty list of classes as missing (`_privileges_value()`). The evaluation
  decides (FR-014).
- **Enum values** are picked from lists, never typed (FR-006), so they are the set's own values, and
  class codes are canonical.

**Rationale**: the evaluator reads delivered documents, and building them from the persona is
the one place where the persona's shape meets the evaluation's.

## R5. Test results, and what the step shows

**Decision**:
- **Results**: `testResultsOf(personas, fields, branches, context, today)` (`personas/results.ts`)
  evaluates every persona that isn't being generated against every branch (FR-014), including the
  branches without rules, which every persona meets. It is pure, runs on the main thread, and is
  recomputed whenever the personas, the rules or today change (FR-017, FR-019, FR-020).
- **Rows**: `resultViewOf(result, branch, persona, context)` lists, in this order (FR-015):
  1. **The reported items**, in the order of the evaluation's messages. Each shows its name, its
     statement, its status ("Not met" or "Couldn't be checked"; a group is never "couldn't be
     checked") and its message (F8). Under a reported group, indented, come its members that
     aren't met, recursively for sub-groups, each with name, statement and status (W10).
  2. **Every other top-level item that counts**, in display order, with its outcome:
     - met: a check icon, and "–" in the message column of a branch the persona doesn't meet
       (F14);
     - a group that isn't met without being reported (it has no message of its own, so its
       members are reported instead): its status and "–".

  A branch the persona meets has the heading "Rules Mia meets" and no message column (F3). The
  "Result: …" heading counts the reported items, a group as one (W10).
- **Statements**: a rule's statement is worded as the rules step words it (`statementOf()`, and
  `RuleSentence` for the drawing). A group's statement is its header's wording on the rules step
  (design-notes, R13).
- **Failing values** (K1): the fields read by the rules that the selected branch's rows show as
  failing. So a rule inside a group that is met marks nothing, as the Clarification requires.
- **Chips**: each chip's icon and accessible name state the outcome for the selected branch
  (FR-015).
- **"No applicant can meet the rules of Standard."** (FR-018, F6) comes from spec 003's results,
  `ruleChecks.byBranch`. The `none_can_meet` notice's text, `noticeText()` in `findingMessages.ts`
  (to be exported), sits above the heading. The tab's warning icon shows the same text in its
  tooltip. Spec 003's checks are the editor's one source for this notice; generation doesn't decide
  it. While spec 003's check of a branch is pending or incomplete, no notice shows, as on the rules
  step.

**Rationale**: the rows are the evaluation's own data, ordered as FR-015 says. Reusing spec 003's
notice keeps the rules step, the tabs and the test step saying the same thing.

## R6. Generation, goals 1 to 3: which branches each persona meets

FR-011's first three goals depend only on which branches each persona meets, its **outcome
vector**: a meet or fail per branch.

**Decision** (`personas/goals.ts`, `personas/generation.ts`):
- **Branch formulas**: each checked branch's items as one formula. Rules contribute
  `CheckedRule.formula`, groups combine their items with their own operator, and the top level uses
  the branch's operator (`branchFormulaOf()`, as `levelFormula()` does in `findings.ts`). A branch
  without items is `true`. Branches with the same formula, by canonical serialisation, form one
  **class**, since no applicant can meet them differently.
- **Realizable vectors**: a depth-first search over the classes adds B or `negate(B)` per class and
  asks spec 003's `satisfiable(conjunction, today)`. It uses one solver memo per run, with the
  variables of all branches merged, and drops a prefix as soon as the answer is `'unsat'`. Only
  `'sat'` counts as realizable. `'unknown'` (003-R7's text corner, or the deadline) counts as not
  realizable, never as a guess. The search is exhaustive up to `MAX_VECTORS` (256) realizable
  vectors. Beyond that, which happens only near spec 002's limits, each target of goals 1 to 3 is
  asked directly (`B`, `¬B`, `B_a ∧ ¬B_b`), which finds a vector for each target that can be
  reached.
- **Targets**:
  - goal 1: meet each class that some applicant can meet;
  - goal 2: fail each class that some applicant can fail;
  - goal 3: for each pair of classes that some realizable vector tells apart, differ on that pair.
- **Choice**: the free slots' vectors maximise the score (goal 1 covered, goal 2 covered, goal 3
  covered), compared in that order, given the vectors of the personas that stay (the evaluator gives
  those). The search tries every combination when there are at most `MAX_COMBINATIONS` (4096).
  Otherwise it works greedily, with random restarts. Ties break at random, and the order of the
  personas is shuffled, so that two generations normally differ (FR-010).
- **The spec's example**: Standard implies Ambulance, so the realizable vectors (Standard,
  Ambulance) are (meet, meet), (fail, meet) and (fail, fail). Only all three together reach every
  target, which is US1-AS3.

**Rationale**: comparing scores goal by goal is FR-011's "MUST NOT trade a goal for a later one",
and maximising each is "as far as possible". With few branches the search is exact. SC-002's
catalogue has at most 3 branches, so at most 8 vectors and 512 combinations.

**Alternatives considered**:
- *Random applicants scored by the evaluator*: rarely hits narrow conditions such as "City or town
  is equal to Stuttgart" or an exact date, so goals 1 to 3 wouldn't be reliable, against SC-002.
  Rejected.
- *A MaxSAT or ILP encoding of all three personas at once*: a new solver, which 003-R5 already
  turned down as a dependency, for a problem that the vectors make small. Rejected.

## R7. Generation, goal 4, and the values themselves

**Decision**:
- **Item targets**: each distinct formula of an item that counts in some branch gives two targets,
  meet X and fail X. Items are rules, groups and sub-groups. Goal 4 asks for both only "where
  applicants can do both", so only when X and ¬X are each `'sat'`. Items are told apart by
  canonical formula, so a rule that several branches inherit is one pair of targets.
- **Assignment**: each free slot starts with the constraint of its vector, C_p. The targets that the
  personas who stay don't already cover are visited in random order, and each is added to the first
  slot, in random order, for which `satisfiable(C_p ∧ t)` is `'sat'`. Restarts with new orders, and
  with the tied vector choices of R6, continue until every target that can be covered is covered,
  until `MAX_RESTARTS_WITHOUT_GAIN` (20) restarts bring nothing, or until the deadline. The best
  final score wins.
- **Models by random self-reduction** (`personas/models.ts`) turn C_p into literals per variable.
  The function walks C_p's tree: an AND keeps every child, and an OR keeps the first child, in
  random order, that keeps the conjunction `'sat'`. Any values that meet every chosen literal meet
  C_p, since formulas are positive in their literals. It tries first with the plausibility literals
  below, and without them if that isn't `'sat'`. `solver.ts` doesn't change.
- **Values** (`personas/sampling.ts`): for each variable, candidates are tried in order of
  preference. The first one that meets every literal of the model on that variable wins, as judged
  by the theory's `holds()`, which is the evaluator's comparison (003-R6, R7). The theory's
  `decide()` witness comes last, so a value always exists. The order:
  1. **Agreement**: a second date of birth equals the first. "Age in years" is the age that the date
     of birth gives today, and "Year of birth" its year. Family and given names follow the persona's
     name. A city, country or nationality follows its counterpart in the other document (FR-010, EC
     "Fields that describe the same fact"). The pairs are listed in `personas/constants.ts`.
  2. **Order**: no issue date before the date of birth, and no expiry date before the issue date of
     the same document or class (FR-010).
  3. **Plausible random values**, by field:
     - dates of birth for ages 18 to 80;
     - issue dates in the past, and expiry dates from two years ago to fifteen years ahead;
     - height and weight in human ranges;
     - enums from their set, with countries weighted towards Germany and licence classes taken from
       common combinations (B; B and BE; AM and B; A and B; B and C1);
     - texts from per-field pools (towns of Baden-Württemberg, streets, postal codes, issuing
       authorities), with document numbers, emails and phone numbers made up in their format
       (`personas/samples.ts`).
  4. **Boundary values** of the model's literals: each constant and its neighbours, and each date
     threshold for today (`yearsAgoThreshold()`, `yearsAfter()`, `monthsAfter()` of
     `checks/calendar.ts`) and the days next to it. They make narrow ranges reachable.
  5. **The theory's witness**.
- **Plausibility literals**, which give way when a goal needs otherwise (FR-010, EC "Unlikely
  values"): "at least 18 years ago" and "less than 81 years ago" on a date of birth, greater than
  17 and less than 81 on "Age in years", and the matching range on "Year of birth". Each is on one
  variable, so the solver handles them.
- **Class dates** are generated for every class-date field, whether or not the class is held. The
  dates of classes not held stay hidden until the class is added (W4), so adding a class never shows
  an empty date that generation could have filled.
- **Names**: drawn when a persona is created, from pools of realistic given and family names, a
  different one for each persona (FR-010). Names whose parts meet the slot's literals on the name
  fields come first. Generation fills the given and family name fields from the persona's name when
  that meets the literals, and from the candidates above otherwise (FR-009, W12, EC "Names").
  Generating anew keeps the name (R10).
- **The final check**: every candidate set of personas is evaluated with the evaluator (R2), so its
  score counts exactly what the step will show. A target that the plan reached but sampling missed
  lowers the score instead of being claimed.
- **Randomness**: a small seeded generator (`personas/random.ts`, pure). The hook seeds each run with
  `crypto.getRandomValues()`, and the tests use fixed seeds.

**Rationale**: the solver decides what the rules allow, and the samplers choose values within that
which look like a person. Verifying with `holds()` keeps every value inside the allowed set. The
final evaluation makes the score honest.

**Alternatives considered**:
- *Returning the solver's leaf from `solver.ts`*: it would change a spec 003 module, and its
  deterministic choice gives no variety. Rejected.
- *Sampling without verification*: could produce values that the evaluator judges otherwise.
  Rejected.
- *A fake-data package*: a dependency (constitution IV) for a few word lists. Rejected.

## R8. Generating one persona anew, and filling in new data

**Decision**: one algorithm, with three kinds of slot:
- **free**: all values new. This covers first generation, "Generate again", "Generate all again"
  and "Try again".
- **kept**: all values fixed: the other personas while one is generated anew (FR-012).
- **filled**: the fields the persona has no value for are free, and the others fixed (FR-020).

Fixed values enter the formulas by **substitution**, rule by rule and before any negation
(`personas/substitute.ts`):
- A rule whose values are all fixed becomes `true` if `ruleOutcome()` (R2) says it is met, and
  `false` otherwise. "Not met" and "couldn't be checked" both count as not met (FR-014).
- A rule on class K's date, with the classes fixed: `false` when the list is empty or doesn't hold
  K. Otherwise it becomes the date's literal while the date is free, or the evaluator's outcome
  once the date is fixed.
- The same rule with the date fixed and the classes free: `false` when the date is empty, since the
  rule would then be "not met" or "couldn't be checked" whatever the classes. Otherwise it becomes
  `held(K)` and the evaluator's outcome for the date.

Substituting before negation keeps "couldn't be checked" right: ¬X is true for a rule X on an empty
value, as the evaluation counts it. Kept slots take their vectors and item outcomes from the
evaluator. Free and filled slots are planned as in R6 and R7, on their substituted formulas. Hidden
values count as values, so they are fixed, not filled, and come back as they were (FR-020).

**Rationale**: FR-012 ("chosen to reach the goals of FR-011 together with the other two personas,
which don't change") and FR-020 ("chosen as generation would choose it … without changing any value
the personas already have") are the same problem with some values fixed. Substitution through the
evaluator keeps the fixed values' outcomes exactly as the step will show them. US3-AS2 follows: a
new nationality rule leaves the nationality free in all three personas, and goal 4 makes one meet it
and another fail it.

## R9. Running generation

**Decision**:
- **Hook and worker**: a hook, `hooks/usePersonas.ts`, in the editor page, so that the personas
  outlive changes of step (FR-019). Its state is the pure reducer of `personas/personaState.ts`.
  The worker is `new Worker(new URL('../utils/rules/personas/worker.ts', import.meta.url), { type:
  'module' })`, a chunk of its own, as spec 003's is.
- **When it starts**: the first time the test step opens (FR-004). Each later opening starts a fill
  run when a persona lacks a value for a current field (FR-020).
- **Messages**: a request carries the run id, the deadline, a seed, today, the branches' checked
  trees and their rules (for substitution), the persona fields, and per slot its kind, name and
  fixed values. The worker answers once, by the deadline, with the slots' new values (and names for
  new personas) ([contracts/personas.md](contracts/personas.md)).
- **One run at a time.** A request during a run supersedes it: the hook terminates the worker and
  starts a new run whose free slots are the union of both. "Generate again" on Anna while Mia is
  generated frees both, and "Generate all again" frees all three. Editing another persona doesn't
  touch the run. Leaving the step doesn't stop it either, and its values apply when they arrive.
- **Deadline** (FR-013, SC-003): 5 seconds from the request. The worker first builds a valid fallback
  set (plausible random values, no planning), stops planning at 4.5 seconds (`GENERATION_STOP_MS`)
  and posts the best personas found. The hook terminates a worker that hasn't answered at 5.5
  seconds. Small rule sets finish far sooner: generation stops once every target that can be covered
  is covered, or after 20 restarts without gain (R7).
- **Failure** (FR-013, F7): the run fails when the worker can't start, raises an error, misses the
  watchdog, or its module can't load. The step then shows "Couldn't create sample applicants" with
  "Try again", which generates all three anew. The variant tabs, Back and "Publish" / "Save" stay
  usable.
- **Bundle**: the evaluator reaches `text.ts` and its case-folding table, which spec 003 keeps out of
  the main bundle with a dynamic import (003-R10). The hook loads `personas/results.ts` with
  `import()` when the test step first opens, and until then the step shows its loading state. The
  worker bundles its own copy.
- **Today**: the calendar date in Germany, read again every minute and whenever the page becomes
  visible, as spec 003 does. `useRuleChecks()` and `usePersonas()` share it through a small hook,
  `hooks/useTodayInGermany.ts`, extracted from `useRuleChecks()`, so that the notice and the results
  never disagree about the day. A new day changes the results and the test-day line, and is never
  announced.

**Alternatives considered**:
- *A worker per persona*: more lifecycle code for three personas. Rejected.
- *Queuing a request behind the running one*: a queued "Generate again" could wait 5 seconds more.
  Rejected.
- *Stopping the run when the team member leaves the step*: it would silently drop a "Generate
  again". Rejected.

## R10. The personas' state and lifecycle

**Decision** ([data-model.md](data-model.md), "Persona state"):
- **What the reducer holds, at the page level**:
  - the three personas;
  - the selected persona: the first by default, and kept when the variant changes (FR-004);
  - the test step's selected variant, which is the rules step's open branch when the step opens;
  - the run and its failure;
  - the persona being edited (its fields' drafts are the panel's own);
  - the open confirm question;
  - the last announcement.
- **Lifetime**: publishing or saving navigates to the details, and leaving the flow unmounts the
  page. So the personas never outlive the flow, and nothing is stored (FR-019, FR-021). A failed
  publish keeps the page, and the personas with it. "Reload" after `409 rules_changed` opens the
  wizard anew with the server's rules, and the personas go with the rules they were made for.
- **Names**: drawn when a persona is created (first generation, or "Try again" when there are no
  personas yet). Generating anew replaces values, not names. "Generate new data for Mia?" (U04)
  keeps Mia, and the confirm questions are about data, as their text says. A rename isn't a change
  of data.
- **Confirm** (FR-012): a question appears when a persona to be generated anew has a changed value
  (R4, `generated`), and it names each such persona.
- **Announcements** (FR-017, F2): after an edit, the step announces each branch whose outcome changed
  for the edited persona: "Mia Schulz now meets the rules of Standard." or "Mia Schulz no longer
  meets the rules of Standard.". The polite status region sits in the test step, since only its
  edits are announced. Generation, a new day and changes made in the rules step aren't announced.
  Spec 003's region already covers the rules step.

**Rationale**: a persona's name is a label (FR-009), kept like a rule's name. Keeping it on
regeneration keeps the chip that the team member chose.

**Alternatives considered**: *new names on regeneration*: the selected chip would change identity
under the team member. Rejected.

## R11. The test step in the wizard

**Decision**:
- **Steps**: `EditorStep` gains `'test'`, `STEP_ORDER` becomes `['connection', 'documents', 'rules',
  'test']`, and `CONNECTION_STEPS` becomes `['Connection', 'Documents', 'Rules', 'Test', 'Publish']`
  (FR-001). Back from the test step opens the rules step.
- **The rules step's footer** has one button to go on:
  - "Test rules", primary, with the forward arrow, while a branch has a rule or a rule editor is
    open;
  - "Publish without rules" ("Save without rules" when editing) otherwise, which goes straight to
    the dialog as today (FR-001, FR-003, W2).

  The documents step keeps its own "Publish without rules".
- **"Test rules"** calls `leaveEditor({ type: 'test' })`:
  1. Unsaved editor changes first ask "Save changes to Rule 01?" (FR-002, W8).
  2. Then come the same pre-checks as publishing. They refuse with the server's message and move the
     focus to the rule (W3). The checks move out of `publishRules()` into one function that both
     use.
  3. Then the test step opens.

  If the answer to the question leaves no rule (EC "The first rule discarded"), the team member
  stays in the rules step.
- **The test step's footer**: Back, and "Publish" ("Save" when editing), primary and without an
  arrow, which opens the publish and save dialog unchanged (FR-003, F4, F13). Opened from the test
  step, its "Check rules again" opens the rules step at the first branch with findings, or at the
  rules step's open branch when none has any.
- **Results never get in the way**: they refuse, delay and disable nothing (FR-003).
- **Title**: the page title is "Test rules", with the intro as its hint (FR-004). The test-day line
  is the first line of the step's content, directly below (FR-016, W1).
- **Access**: personas exist only in the signed-in editor (FR-021, W13), since the step is part of
  the wizard behind `RequireSignIn`.

**Rationale**: the gate reuses publishing's checks, so the test step tests exactly what publishing
would store (FR-002), and the dialog's existing secondary action stays the way back to the rules.

## R12. Editing a persona

**Decision**:
- **In the panel** (FR-006, F1): "Edit data" turns the values into fields, under the same headings,
  and "Done" turns them back. Every valid entry applies at once. An invalid entry shows its error
  under its field and leaves the persona's value as it was (FR-008). The drafts live in the panel's
  own reducer, and "Done" drops the invalid ones.
- **Fields by kind** (FR-006, F12):
  - a text field for text;
  - a whole-number field for numbers;
  - a date as text in the design's `dd.mm.yyyy` (U02), parsed by a pure function, with "Enter a
    date that exists, e.g. 28.02.2007." for a date that doesn't exist;
  - a select of the labels for one value of a set;
  - a list to pick from for several: licence classes by code, nationalities by label. This reuses
    the rule editor's values picker if its interface allows, or that picker moves to
    `components/` (R16).

  Clearing a field makes its value empty.
- **Date of birth** (FR-007, F10): the panel shows "08.07.2007 (age 19)". "Age today" sets a date of
  birth that gives that age today, with the same day and month. A 29 February becomes 1 March in a
  year without it, as the evaluator counts anniversaries (`checks/calendar.ts`), and the result is
  verified to give the age entered.
- **Names** (FR-009, W11, W12): an empty name shows "Enter a name." and the persona keeps its name.
  The given and family name fields are edited separately from it.
- **Scope**: edit mode belongs to the selected persona. Switching persona or variant ends it
  (design-notes). The persona being generated has neither "Edit data" nor "Generate again"
  (FR-013).

**Rationale**: the Clarification of 2026-11-01 (#1) replaces Figma's dialog with editing in place.
Parsing and age arithmetic are pure functions, so the gate tests them.

## R13. Messages, and the copy the decisions leave open

**Decision**: `personas/messages.ts` builds every text that depends on data, as spec 003's
`findingMessages.ts` does:
- the test-day line;
- the chips' accessible names;
- the "Result: …" headings with their counts, and "Rules Mia meets";
- the message column's header, "Message Mia reads";
- the confirm questions' titles and bodies;
- the status texts "Creating 3 sample applicants…" and "Creating new data for Mia…";
- the announcements;
- the failure text.

Fixed copy sits in `TestStep/constants.ts`. The tests pin every wording that the spec, its
Clarifications and Figma give.

The first UI task writes `specs/004-rule-test-personas/design-notes.md` with the copy that the
decisions leave open:
1. A group's statement in the result rows (R5).
2. The tab's warning icon's accessible name (F6).
3. The hidden text of the failing-value marker (K1) and of "· edited" (K2).
4. A persona's first name for "Mia's data" and "Rules Mia meets", and the possessive of a name
   ending in s.
5. The panel's empty value. Figma has "Not shared".
6. The age next to a date of birth in the future, and the error for an age that gives no date of
   birth (beyond year 1).
7. The status text of a fill run after returning from the rules step.
8. The heading's counts in general: plurals, and groups only ("Result: doesn't meet 2 groups").
9. What "Done" does with invalid drafts, and that switching persona or variant ends edit mode.

## R14. Tests

**Decision**:
- **Vitest, a gate**: each module of `personas/` has its `*.test.ts` beside it and runs in `node`.
  The worker entry and the hook are glue, covered by lint, the build and the quickstart.
- **Parity**: `evaluation.test.ts` replays the rule-outcome vectors and the new whole-branch vectors
  (R2).
- **Spec scenarios**: `personas/scenarios.test.ts` covers every acceptance scenario and edge case
  that a rule set expresses, with the exact fields, outcomes, rows and texts. For example:
  - US1-AS1 to AS5;
  - US2-AS1 to AS7;
  - US3-AS1 to AS4;
  - birthday today, 29 February, letter case, a class not held, an empty class list, several
    nationalities, a branch without rules, a branch that no applicant can meet, a branch that every
    applicant meets.
- **Generation against an oracle** (SC-002): `personas/generation.test.ts` takes rule sets of one to
  three branches made of `testOracle.ts`'s seeded random branches over shared variables. For each
  rule set, the oracle enumerates every applicant in its domain, on a branch that holds every
  branch's items, so that the domain covers all constants. From that it computes the realizable
  vectors and the best score for goals 1 to 3 that three personas can reach, with no solver
  involved. For each rule set, 20 generations with different seeds must each reach that score. Across
  the catalogue, at least 90 % of the items that applicants can both meet and fail must be met by
  one persona and failed by another. A hand-written catalogue adds the spec's example and its
  variants.
- **Properties**, on every generated persona:
  - FR-010's limits hold unless a goal needs otherwise;
  - the names differ;
  - two seeds give different personas;
  - the personas who stay keep every value (FR-012);
  - a fill changes no existing value (FR-020);
  - the deadline returns valid personas, driven by a fake clock.
- **Performance** (SC-003): `personas/performance.test.ts` checks that generation for branches of 50
  items ends within 1.5 seconds and that the results for spec 002's limits take under 100 ms. A
  200-item branch built to be hard must return by the deadline.
- **The rest**: the reducer, the announcements, the messages, the fields, the applicant, the
  substitution and the editing helpers (dates, ages, whole numbers, names) each have their unit
  tests.
- **Backend**: the generated `branch_evaluations` are covered by `test_check_fixtures.py`'s drift
  check, and mypy covers the script.
- **Manually**: [quickstart.md](quickstart.md) V1–V10 cover the worker, the UI, the status
  regions, accessibility (SC-007), usability (SC-004, SC-005) and privacy (SC-006).

**Rationale**: SC-002's "for which three personas can reach goals 1 to 3" needs a ground truth that
doesn't come from the solver. The oracle's enumeration is that ground truth, as it is for spec 003's
findings.

## R15. The Figma items reach every UI task

**Decision**: as in 003-R14. [contracts/ui-screens.md](contracts/ui-screens.md) lists the audit's
items per screen: F1–F14 (Figma must change), W1–W13 (built without frames), K1–K4 (cosmetic, built
as designed; K4 implies nothing) and O1–O6 (out of scope: the redesign's page chrome). Every UI task
cites the items it covers, with the screen's id, and builds the test step as Figma draws it, changed
by the F items. Its visual check lists each difference that an O item explains, or that only "KERN
2.8 vs Revamp" explains, and doesn't fix it.

## R16. Points to verify at implementation

- Whether the rule editor's values picker (`RulesStep/RuleEditor/ValuesPicker.tsx`) can serve
  persona fields as it is, or should move to `components/` with a narrower interface.
- That `vite build` emits the personas worker and the lazily loaded results module as chunks of
  their own, and that the main bundle doesn't contain `caseFolding.ts`.
- Exporting `noticeText()` from `findingMessages.ts` without changing its wording.
- The wording of a group's header on the rules step, which the result rows reuse as its statement.
- The chips' pattern: tabs inside the variant's tab panel, as proposed (one selected, controlling
  the panel), or a radio group. Check with NVDA and VoiceOver that each chip's name, with its
  outcome, is read.
- That the loading status ("Creating 3 sample applicants…") and the announcements' region don't
  interrupt each other.
- KERN 2.8's input for a `dd.mm.yyyy` date (a text input with `inputmode="numeric"`), and its error
  pattern under a field.
- The time of the vector search with 20 branches that differ, against the 4.5-second stop.
