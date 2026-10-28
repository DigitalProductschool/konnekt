# Data Model: Conflict and Redundancy Checks for Rules

**Phase 1 output of `/speckit-plan`** | **Date**: 2026-10-28 | **Spec**: [spec.md](spec.md) |
**Decisions**: [research.md](research.md)

**No database change.** Nothing about findings is stored (FR-019), delivered to serviceBW (FR-018)
or logged. Findings exist only in the editor's memory, in the browser (research R1). The only
persistent change is one attribute of the document type catalog, which is code (R9). Spec 002's
tables, snapshot, marks, propagation and dissolution
([../002-connection-rules/data-model.md](../002-connection-rules/data-model.md)) stay as they are.

## Spec entities and where they live

| Spec entity | Here | Where |
|---|---|---|
| Checked rules | `CheckedBranch` | built by `checks/checkedTree.ts` on the main thread |
| Rule check | one `checkBranch()` call, inside a check run | `checks/findings.ts`, in the worker |
| Finding on a rule or group | `ItemFinding` | in a `BranchCheck` |
| Finding on a branch | `BranchNotice` | in a `BranchCheck` |
| Rule, Group, Sub-group, Branch | spec 002's `RuleItem`, `GroupItem`, `BranchInput` | unchanged |

Paths are relative to `frontend/src/utils/rules/`, except where a path starts with `backend/` or
`frontend/`.

## Catalog: `multiple_values` (research R9)

| Where | Attribute | Values |
|---|---|---|
| `backend/app/catalog.py`, `CatalogField` and `CatalogPart` | `multiple_values: bool = False` | true for `pid.nationalities` and for the part `classes` of `mdl.driving_privileges`; false for every other field and part |
| `backend/app/schemas.py`, `DocumentField` and `FieldPart` | `multiple_values: bool` | as in the catalog |
| `frontend/src/types/document-types.ts`, `DocumentField` and `FieldPart` | `multiple_values: boolean` | mirrors the schema |

Images and fields made of parts have `multiple_values` false; a field made of parts declares it on
its parts.

## Checked branch

What the checks read of one branch (spec "Checked rules", research R2). It is serialisable, so it
can be posted to the worker, and carries no names or messages.

| Field | Type | Meaning |
|---|---|---|
| `branchKey` | string | `RulesBranch.key` of the rules step, stable while the branch has no id |
| `operator` | `'and'` \| `'or'` | the top level's combination |
| `items` | `CheckedItem[]` | the top level's items that count, in display order |
| `leftOut` | string[] | ids of the rules left out (FR-002), for tests and the count of checked rules |
| `variables` | `Record<string, Variable>` | every variable a checked rule uses, by key |
| `today` | string | `YYYY-MM-DD`, the calendar date in Germany when the run started |
| `fingerprint` | string | canonical serialisation of everything above except `branchKey`; equal fingerprints have equal results |

`CheckedItem` is one of:
- **rule**: `{ type: 'rule', id, formula: Formula }`. The formula is one literal, or for a licence
  class's date `held(K) ∧ c(date_K)` (research R3).
- **group**: `{ type: 'group', id, operator, items: CheckedItem[] }`, with at least two items.

**Derivation rules** (research R2):
1. Start from `effectiveItems(branch.items, branch.origin === 'based')` (`tree.ts`).
2. Leave out every rule without a target, with a target that isn't among the requested documents'
   fields, or with an incomplete condition (`isComplete` with the field's value set). Keep a rule
   without an error message.
3. A group with one item left becomes that item, in its place. A group with none is left out.
   Apply this bottom-up.
4. A branch without items left has no checks and no findings (EC "A branch without rules",
   W13).

## Variables and literals

`Variable` (research R3):

| Field | Type | Meaning |
|---|---|---|
| `key` | string | `document_type.field`, then `.part` for a field made of parts, then `#class` for a licence class's date, such as `mdl.driving_privileges.issue_date#B` |
| `kind` | `'number'` \| `'text'` \| `'enum'` \| `'date'` | from the catalog |
| `multiple` | boolean | enums only: `multiple_values` of the field or part |
| `values` | `(string \| number)[]` | enums only: the set's keys as the evaluator compares them, codes as integers and texts case-folded |

**Values an applicant can have** (FR-007, FR-009): number, whole numbers from 0; enum, one value of
`values`, or a non-empty subset when `multiple`; text, a text that isn't empty after normalisation;
date, a day from 0001-01-01 to 9999-12-31. A licence class's date has a value whenever the class is
held.

`Literal`: `{ variable, test, negated }`, where `test` is the rule's condition in a form the
theories read:

| Kind | Tests | Values |
|---|---|---|
| number | `gt`, `lt`, `eq`, `ne` | `value`, a finite number, possibly with decimals |
| text | `eq`, `ne`, `contains`, `not_contains` | `text`, normalised as the evaluator does (research R7); `matchCase` |
| enum | `one_of`, `none_of` | `values`, keys of the set |
| date, fixed | `before`, `after`, `on` | `date`, as a day number (proleptic Gregorian ordinal) |
| date, from the day of sharing | `at_least_years_ago`, `less_than_years_ago`, `exactly_years_ago`, `at_least_from_now`, `less_than_from_now` | `count` (a whole number from 1), `unit` (`years` \| `months`) for "from now" |

`negated` is set by the questions of research R4, never by a rule.

## Formulas and questions

`Formula` is `true`, `false`, a `Literal`, `{ and: Formula[] }` or `{ or: Formula[] }`. The negation
of a formula is its De Morgan dual, with each literal's `negated` flipped (research R3).

`DayRange` is `{ from, to }` in day numbers. The questions use `today` alone (conflicts, the
unmeetable branch) or `today` to 9999-12-31 (redundant, always met, every applicant meets, and
whether a conflict holds on later days) (research R4).

`Verdict` is `'sat'`, `'unsat'` or `'unknown'` (research R5).

## Findings

### `ItemFinding`, on a rule or group

| Field | Type | Meaning |
|---|---|---|
| `itemId` | string | the rule or group (`rule-{n}`, `group-{n}`) |
| `kind` | `'conflicting'` \| `'redundant'` \| `'always_met'` | FR-003, FR-005, FR-006 |
| `reason` | see below | why. Null for `always_met` |
| `today` | boolean | conflicting only: true when the finding holds today but not on every later day (FR-008), so the note adds "by applicants who share today" |

`reason` for `conflicting` (FR-003):
- `{ type: 'with', items: string[] }`: can't be met together with these items, a smallest set from
  the AND-context, in display order;
- `{ type: 'members', items: string[] }`: a group that can't be met on its own, because of these
  members;
- `{ type: 'condition' }`: a rule that can't be met on its own.

`reason` for `redundant` (FR-005, research R8):
- `{ type: 'same', item: string }`: the same check as this item;
- `{ type: 'implied_by', items: string[], orItems: string[] }`: anyone who meets `items` also
  meets this item, or else one of `orItems` (empty but for the rare case of research R8);
- `{ type: 'implies', items: string[], givenItems: string[] }`: anyone who meets this item, and
  `givenItems` (empty but for the rare case), also meets one of `items`.

Every id in a reason names an item of the same branch's checked tree. Notes show the current
names (FR-011).

### `BranchNotice`, on a branch

| Field | Type | Meaning |
|---|---|---|
| `kind` | `'none_can_meet'` \| `'all_meet'` | FR-004; FR-006 |
| `today` | boolean | `none_can_meet` only: it holds today but not on every later day, "No applicant who shares today can meet …" (FR-008) |

### `BranchCheck`, the result for one branch

| Field | Type | Meaning |
|---|---|---|
| `branchKey`, `fingerprint` | string | what was checked |
| `complete` | boolean | false when the deadline passed or a question came back `'unknown'` (FR-010) |
| `notice` | `BranchNotice` \| null | |
| `findings` | `ItemFinding[]` | in display order. Only certain findings |
| `checkedRules` | number | the rules checked. 0 means no summary, notice or tab icon (W13) |

**Invariants**, which the tests check (research R13):
1. At most one finding per item.
2. With `notice.kind === 'none_can_meet'`, there are only `conflicting` findings (FR-005, W4).
3. No finding inside a `redundant` or `always_met` group. No `redundant` or `always_met` finding on
   a conflicting item or inside one (FR-005).
4. Deleting every item with a `redundant` finding at once changes no outcome for any applicant on
   any day from today on (FR-005, SC-002).
5. With `complete` true, every conflicting and always-met item has its finding (FR-010). Each item
   without a `redundant` finding makes a difference in the working tree of research R8.

## A check run: lifecycle

State of `useRuleChecks` (`checks/runState.ts`, a pure reducer), per branch key:

```text
            change (new fingerprint)                result posted
  (none) ───────────────────────────▶ pending ─────────────────────▶ done (complete | incomplete)
                                        │  ▲                               │
                    deadline/watchdog   │  │ change (new fingerprint)      │ change
                                        ▼  │                               ▼
                               done (incomplete, ◀──────────────────── pending
                                no findings)
```

- **pending** shows the last `done` result of that branch, without findings on items that are gone,
  so notes don't flicker (research R10).
- A cached `done` result with the same fingerprint, from an earlier state such as before an undo,
  is used at once, without a run.
- **Run**: `{ runId, startedAt, branchKeys }`. A newer change ends the run: the worker is
  terminated and the result of any branch not yet posted is dropped.
- **Cache**: the latest result per branch key, and up to 50 earlier results by fingerprint.

## Announcements (FR-015)

`announcements.ts` compares, per branch, the previous `done` result with the new one, after a
change the team member made. It never compares on the first result of a branch, nor when only the
day changed. It yields, in display order:

| Change | Sentence (the spec's wording for rules) |
|---|---|
| a conflicting finding appears | "Rule 02 conflicts with Rule 01." |
| a redundant finding appears, `same` | "Rule 06 is the same as Rule 03." |
| a redundant finding appears, other reasons | "Rule 01 makes no difference beside Rule 02." |
| an always-met finding appears | "Every applicant meets Rule 05." |
| a conflicting finding goes | "Rule 02 no longer conflicts with Rule 01." |
| a redundant finding goes | "Rule 06 is no longer redundant." |
| an always-met finding goes | "Rule 05 is no longer always met." |
| a branch notice appears | the notice's own text (FR-004, FR-006) |

A finding that changes kind counts as one going and one appearing. Disappearances are announced
only when the new result is `complete`. Findings in a branch other than the shown one, and findings
on groups, use the wording that `design-notes.md` settles (research R12, items 6).

## Generated fixtures (research R7, R13)

Written by `backend/scripts/export_check_fixtures.py`, never by hand. `--check` reports drift.

| File | Content | Used by |
|---|---|---|
| `frontend/src/utils/rules/checks/caseFolding.ts` | Python's `str.casefold()` for every code point it changes, compressed into ranges, with the Unicode version (15.1.0) and a header naming its generator | `text.ts`, at run time, in the worker's chunk |
| `frontend/src/utils/rules/checks/fixtures/evaluator-vectors.json` | inputs and Python's results for `_normalised_text()` (including the whitespace set, ß, ẞ, İ, ı, combining marks), `years_after()`, `months_after()` (29 February, month ends, the clamp at 9999), and rule outcomes for chosen conditions, values and days | the Vitest tests of `text.ts`, `calendar.ts` and `testEvaluator.ts` |
