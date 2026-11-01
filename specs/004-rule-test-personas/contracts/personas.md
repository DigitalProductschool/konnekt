# Contract: the personas' interface

**Users**: the editor page and its test step. **Requirements**: FR-004 to FR-021, SC-001 to
SC-003, SC-006. **Decisions**: research R1–R13. **Shapes**: [../data-model.md](../data-model.md).

Personas are pure functions in `frontend/src/utils/rules/personas/`. The worker runs generation;
everything else runs on the main thread. Besides the worker entry, only the hooks `usePersonas()`
and `useTodayInGermany()` touch browser APIs. This file fixes what each part promises the others.

**Privacy, for every part** (FR-021, SC-006): nothing is stored (no `localStorage`, no API call),
nothing is sent (the worker talks only to the page), and nothing is logged (no `console.*` in
`personas/`, the worker or the hook). Persona values and results never leave the tab.

## The evaluator: `utils/rules/evaluation.ts` (research R2)

Moved from `checks/testEvaluator.ts`. Each function names the Python function it ports.

- `evaluateBranch(branch, applicant, sharedOn, context): BranchEvaluation`: `evaluate_branch()`.
  It returns `met`, the items that count with their outcomes, and, new, `messages`, the reported
  items `{ id, message }` in `_messages()`'s order. It throws where Python raises `ValueError`. The
  test step only evaluates rules that pass `firstProblem()`, so it never throws there.
- `ruleOutcome(rule, applicant, sharedOn, context): Outcome`: `_rule_outcome()`, which substitution
  uses (R8).
- Unchanged: `kindOf()`, `numberHolds()`, `textHolds()`, `enumHolds()` and the rest of the port.
- **Parity**: `evaluation.test.ts` replays every `rule_outcomes` vector and every
  `branch_evaluations` vector of `checks/fixtures/evaluator-vectors.json`, and asserts the same
  `met`, results and messages.
- **Separation**: it imports neither `literals.ts`, the theories, `checkedTree.ts` nor `solver.ts`.

## Pure functions, on the main thread

### `personaFieldsOf(branches, context): PersonaField[]`

`personas/fields.ts`.
- **Takes** the rules state's branches (`KeyedBranch`) and the `RuleContext` of the requested
  documents with the value sets.
- **Returns** the persona fields of data-model.md, in display order, with labels from
  `dataOfResolved()`.
- **Total**: it never throws. A rule that `buildCheckedBranch()` leaves out adds no field.

### `applicantOf(persona, fields): Applicant`

`personas/applicant.ts`. It returns the documents that give the persona's values for `fields` and
nothing else, as data-model.md maps them. Empty values are left out. Class dates go only into the
entries of the classes held.

### `testResultsOf(personas, fields, branches, context, today): TestResults`

`personas/results.ts`, loaded with `import()` (research R9).
- **Returns**, by persona id and branch key, a `PersonaBranchResult` for every persona whose
  `status` is `'ready'`, against every branch, including branches without rules.
- **Exact** (FR-014, SC-001): equal to `evaluateBranch(branch, applicantOf(persona, fields), today,
  context)`.
- **Fast** (SC-003): under 100 ms at spec 002's limits (3 × 20 branches × 200 items).

### `resultViewOf(result, branch, persona, context): ResultView`

`personas/results.ts`. It gives the rows, headings and failing fields of data-model.md (FR-015,
F3, F8, F14, W10, K1), with the items' current names, and statements worded as the rules step words
them.

### `messages.ts`

The only place where persona texts that depend on data are written (research R13). The wording
comes from [../design-notes.md](../design-notes.md):
- `testDayLineOf(today)`: "Tested as if shared today, 1 Nov 2026." (FR-016, W1)
- `chipNameOf(persona, branchName, meets)`: "Mia Schulz: meets the rules of Standard" or "Mia
  Schulz: doesn't meet the rules of Standard" (FR-015)
- `dataHeadingOf(persona)`: "Mia's data" (FR-004)
- `resultHeadingOf(counts)`: "Result: meets the rules", "Result: doesn't meet 2 rules", "Result:
  doesn't meet 1 rule and 1 group" (FR-015, W10)
- `meetsHeadingOf(persona)`: "Rules Mia meets". `messageColumnOf(persona)`: "Message Mia reads"
- `confirmOneOf(persona)`: "Generate new data for Mia?" with "Your changes to Mia's data will be
  replaced. The other two applicants stay as they are." (U04)
- `confirmAllOf(changed)`: "Generate new data for all applicants?" with "Your changes to Mia's and
  Anna's data will be replaced." (FR-012, W9)
- `creatingAllText`: "Creating 3 sample applicants…". `creatingOneOf(persona)`: "Creating new data
  for Mia…" (U11)
- `failureHintOf(editing)`: "Try again, or publish without testing." or "Try again, or save without
  testing." (FR-013, F7)
- `ageSuffixOf(dateOfBirth, today)`: " (age 19)" (FR-007, F10)

### `announcementOf(before, after, persona, branches): string`

`personas/announcements.ts`, as data-model.md describes (FR-017, F2).

### Editing helpers

`pages/FormConnectionEditor/TestStep/utils.ts` (state-independent, with `utils.test.ts`):
- `parseDisplayDate(text)`: a `dd.mm.yyyy` entry gives `YYYY-MM-DD`; an empty entry gives `null`;
  anything else gives the error "Enter a date that exists, e.g. 28.02.2007." (FR-008).
  `formatDisplayDate(iso)` turns `YYYY-MM-DD` back into `dd.mm.yyyy`.
- `parseWholeNumber(text)`: digits give a number; an empty entry gives `null`; letters or decimals
  give "Enter a whole number, e.g. 25." (FR-008, W11).
- `dateOfBirthForAge(age, current, today)`: a date of birth that gives `age` today, keeping the day
  and month of `current` (a 29 February becomes 1 March in a year without it). For any age it
  accepts, `ageOn(result, today) === age` (FR-007).
- `nameProblem(text)`: "Enter a name." for a name that is empty after trimming (FR-009).

### `personaStateReducer(state, action): PersonaState`

`personas/personaState.ts`: the actions and lifecycle of data-model.md, pure, with
`initialPersonaState`. It decides:
- which run to start, with which slot kinds (merging a request into a running run);
- when to ask before generating anew;
- which answers to ignore (older `runId`);
- what to announce.

## Pure functions, in the worker

### `generatePersonas(request, options): GenerationResult`

`personas/generation.ts`.
- `options`: `{ deadline: number, now: () => number }`. The clock is injected, as for spec 003's
  `checkBranch()`.
- **Valid** (FR-010, FR-013): every value it returns is of its field's kind. With fixed values
  there's nothing to check, since they are passed through unchanged.
- **Keeps** (FR-012, FR-020): kept slots come back unchanged. Filled slots change only the fields
  that were absent. Hidden values are fixed, never filled.
- **Plausible** (FR-010): generated values keep FR-010's limits unless a goal needs otherwise. The
  names drawn differ from each other and from the kept personas' names.
- **Goals** (FR-011): returns the personas with the best score found, compared goal by goal. When
  the vector search is exhaustive (research R6), goals 1 to 3 are reached as far as three personas
  allow.
- **Random** (FR-010): equal requests with different seeds normally differ. Equal seeds give equal
  results (tests).
- **Bounded** (FR-013): returns no later than `deadline` plus one solver step, with the best
  personas so far: at least the fallback set of plausible values, built before planning.
- **Private**: no side effects, no logging.

Its parts, each with its test: `random.ts` (seeded generator), `goals.ts` (branch classes,
realizable vectors, targets, score), `substitute.ts` (fixed values into formulas), `models.ts`
(`modelOf()`, random self-reduction over `satisfiable()`), `sampling.ts` and `samples.ts` (values
from a model, agreement, order, pools).

## Worker protocol

`personas/worker.ts`, a module worker. The page creates it on the first run and terminates it when
a run is superseded, fails or misses its watchdog, and when the page unmounts.

**Page → worker**:

```ts
interface GenerateMessage {
  type: 'generate';
  runId: number;
  /** When to stop planning, in ms of performance.timeOrigin + performance.now(): request + 4500 */
  deadline: number;
  /** From crypto.getRandomValues() */
  seed: number;
  /** YYYY-MM-DD, the calendar date in Germany */
  today: string;
  /** Every branch, in tab order: its checked tree, and its rules by id for substitution */
  branches: { checked: CheckedBranch; rules: Record<string, RuleItem> }[];
  fields: PersonaField[];
  context: RuleContext;
  /** Three slots, in persona order */
  slots: { kind: 'free' | 'kept' | 'filled'; name: string | null; values: Record<string, PersonaValue> }[];
}
```

**Worker → page**, once per run:

```ts
interface GeneratedMessage {
  type: 'generated';
  runId: number;
  /** In persona order: for free and filled slots, the new values (all of a free slot's fields; the
   *  absent fields of a filled slot) and, for a free slot without a name, the name drawn */
  slots: { values: Record<string, PersonaValue>; name: string | null }[];
}
```

**Failure**: the worker's `error` or `messageerror` event, a worker that can't be constructed, or
no `generated` message by request + 5500 ms. The page treats each as `runFailed`. The worker holds
no state between messages.

## `usePersonas(input): Personas`

`hooks/usePersonas.ts`, in `pages/FormConnectionEditor/index.tsx`.

**Input**: `{ active, branches, context, openBranchKey }`.
- `active`: whether the test step is shown.
- `branches`: the rules state's branches.
- `context`: the requested documents and value sets, or `null` while they load.
- `openBranchKey`: the rules step's open branch.

**Returns**:
- `state`: the `PersonaState`.
- `fields`: the persona fields for the current branches.
- `results`: `TestResults`, or `null` while `results.ts` loads.
- `today`: from `useTodayInGermany()`.
- `dispatch`: the reducer's dispatch, for selections, edits and confirm answers.
- `generateOne(slot)`, `generateAll()` and `retry()`.

**Behaviour**:
- When `active` turns true, it dispatches `opened` (research R9). It never starts a run while
  `active` is false, but a run already started continues.
- It loads `personas/results.ts` with `import()` on the first activation. A load failure dispatches
  `runFailed`.
- It posts each run to the worker, seeded with `crypto.getRandomValues()`, and arms the 5.5-second
  watchdog. Answers go to the reducer.
- It recomputes `fields` and `results` with `useMemo` from the branches, the personas, the context
  and today.
- It terminates the worker on unmount.
