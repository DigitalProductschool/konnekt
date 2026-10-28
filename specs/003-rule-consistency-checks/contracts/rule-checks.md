# Contract: the rule checks' interface

**Users**: the editor page and its rules step, and the publish and save dialog. **Requirements**:
FR-001 to FR-011, FR-015, FR-018, FR-019, SC-001 to SC-003. **Decisions**: research R1–R13.
**Shapes**: [../data-model.md](../data-model.md).

The checks are pure functions in `frontend/src/utils/rules/checks/`, run in a Web Worker and used
through one hook. This file fixes what each part promises the others.

## Pure functions

### `buildCheckedBranch(branch, context, today): CheckedBranch`

`checks/checkedTree.ts`, on the main thread.

- `branch`: a `RulesBranch` of the rules state. `context`: the requested documents with their
  fields (`requestedRuleDocuments`), including `multiple_values`, and the value sets. `today`:
  `YYYY-MM-DD`, the date in Germany (`todayInGermany()`).
- Returns the branch's checked tree as data-model.md derives it, with its fingerprint.
- Total and fast: linear in the number of items, and it never throws on a branch of the rules
  state, whatever its problems.

### `checkBranch(checked, options): BranchCheck`

`checks/findings.ts`, called in the worker, and directly in the tests.

- `options`: `{ deadline: number, now: () => number }`. The clock is injected, so that the
  tests can drive the deadline.
- **Sound**: every finding and notice it returns is true by FR-007 to FR-009, for the rules of
  `checked` (FR-010).
- **Complete when `complete` is true**: every conflicting and always-met item, and every notice,
  is there. The redundant findings are those of the procedure in research R8, step 4.
- **Joint deletion** (SC-002): deleting every item with a `redundant` finding at once changes no
  outcome.
- **Deterministic**: equal fingerprints give equal results, whatever ran before. Ties go to the
  earlier item in display order.
- **Bounded**: it returns no later than `deadline`, plus the time of one theory step, with
  `complete: false` and its certain findings when the deadline cuts it short.
- **Private**: no side effects, no logging, no network.

### `findingMessages.ts`

Pure functions from a finding or result, the current tree and the branch's name, to text:
`noteOf(finding, names)`, `summaryOf(check, branch, names)`, `tabLabelOf(branchName)`,
`dialogLineOf(check, branchName)`, `announcementOf(change, names, shownBranch)`. They are the only
place where finding texts are written. Wording: [ui-screens.md](ui-screens.md), "Copy".

### `announcements.ts`

`announcementsFor(previous, next, cause)` returns the changes of data-model.md's
"Announcements", in display order. `cause` is `'action'`, `'first'` or `'new_day'`, and only
`'action'` returns anything.

## Worker protocol

`checks/worker.ts` is the module worker's entry. It holds no state between messages.

**Main thread → worker**:

```ts
{ type: 'check'; runId: number; deadline: number /* ms, performance.timeOrigin + now */; branches: CheckedBranch[] }
```

`branches` are sent in the order to check: the shown branch first, then tab order.

**Worker → main thread**, once per branch as it finishes, then once at the end:

```ts
{ type: 'result'; runId: number; check: BranchCheck }
{ type: 'done'; runId: number }
```

- The main thread ignores messages of a run it no longer waits for.
- The main thread terminates the worker when a newer change arrives during a run, and when no
  `done` has come 5.5 seconds after the change (watchdog). It starts a new worker for the next run.
- If the worker can't be created, or reports an error, the branches of the run count as not
  checked completely, with no findings (research R10).

## `useRuleChecks(branches, context, shownBranchKey): RuleChecks`

`frontend/src/hooks/useRuleChecks.ts`, used once, in `pages/FormConnectionEditor/index.tsx`.

```ts
interface RuleChecks {
  /** Per branch key: the result to show, or null while a branch has never been checked */
  byBranch: Record<string, BranchCheck | null>;
  /** The latest announcement, for the status region; '' when there is none */
  announcement: string;
}
```

- Runs when the catalog and value sets are loaded, after every change of `branches` or `context`,
  and when the day in Germany changes (FR-011, research R10). A change of `shownBranchKey` alone
  doesn't run the checks; it only orders the next run.
- Never blocks rendering. Editing, publishing and saving never wait for it (FR-010, FR-016).
- What to show per branch while a run is pending: the last result, without findings on items that
  are gone.
