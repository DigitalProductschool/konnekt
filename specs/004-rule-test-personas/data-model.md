# Data Model: Test Rules with Personas

**Phase 1 output of `/speckit-plan`** | **Date**: 2026-11-01 | **Spec**: [spec.md](spec.md) |
**Research**: [research.md](research.md)

Every shape here lives in the browser's memory, in the editor page or in the generation worker.
**There is no table, column, migration, API shape or setting**: personas are never stored, sent
or logged (FR-019, FR-021). The shapes are TypeScript types in `frontend/src/utils/rules/personas/
types.ts`, unless noted otherwise. Shapes that cross into the worker are plain data.

## Spec entities and where they live

| Spec entity | Shape | Where |
|---|---|---|
| Persona | `Persona` | `PersonaState.personas` (editor page, `usePersonas()`) |
| Persona value | `PersonaValue`, by `PersonaField.key` | `Persona.values` |
| Test result | `PersonaBranchResult`, and `ResultView` for showing it | derived on the main thread by `testResultsOf()` and `resultViewOf()`, never kept |
| Test day | `today`, `YYYY-MM-DD` in Germany | `useTodayInGermany()`, shared with `useRuleChecks()` |
| Rule, Group, Sub-group, Branch (spec 002) | `RulesBranch`, `RuleTreeItem` | unchanged: the rules state |
| Finding (spec 003) | `BranchCheck.notice` of kind `none_can_meet` | unchanged: `useRuleChecks().byBranch` |

## Persona field (research R3)

The data that rules check, which every persona has a value for. `personaFieldsOf(branches,
context)` derives the list, in display order.

| Field | Type | Notes |
|---|---|---|
| `key` | `string` | Spec 003's variable key (`variableKey()`): `pid.birthdate`, `pid.place_of_birth.locality`, `mdl.driving_privileges.classes`, `mdl.driving_privileges.issue_date#B` |
| `documentType` | `string` | `pid`, `mdl` |
| `documentLabel` | `string` | The heading: "Personal ID", "Driving licence" |
| `label` | `string` | `dataOfResolved()`: "Date of birth (Age)", "City or town", "Licence classes", "Licence class B – Issue date" |
| `field` | `string` | The catalog field's key |
| `part` | `string \| null` | The part's key, for a field made of parts |
| `licenceClass` | `string \| null` | The class, for a class's issue or expiry date |
| `kind` | `'number' \| 'text' \| 'enum' \| 'date'` | From the catalog |
| `optionSet` | `string \| null` | Enums: the value set's key |
| `multiple` | `boolean` | Enums: `multiple_values` of the field or part |
| `dateOfBirth` | `boolean` | The field's `date_of_birth`: show the age, offer "Age today" (FR-007) |

**Rules**:
- **Which fields**: the union of every branch's `buildCheckedBranch().variables` (FR-005). On top of
  that, `mdl.driving_privileges.classes` whenever a class date is a field.
- **Order**: catalog document order, then catalog field order, then part order. Each class's dates
  follow "Licence classes", in the licence-class set's order, the issue date before the expiry date.
- **Class dates** are shown only while the persona's classes include `licenceClass`.

## Persona value (research R4)

```ts
type PersonaValue =
  | number                        // a number field's whole number, or the code of a single-value enum
  | string                        // text as typed; a date as YYYY-MM-DD; a single-value enum's text value
  | readonly (string | number)[]  // an enum that holds several values
  | null;                         // empty
```

- **Empty**: `null`, `''` or `[]`, for a document that doesn't give the value (FR-006). The
  evaluator reads each of them as missing, so rules on an empty value "couldn't be checked"
  (FR-014).
- **Absent**: the key is missing from `values`, because the persona never had a value. Only a fill
  run gives absent values (FR-020).
- **Enum values** are the value set's own values. A single-value enum holds one or `null`; a field
  that holds several holds a list. Licence classes hold their codes ("B", "BE").

## Persona

| Field | Type | Notes |
|---|---|---|
| `id` | `'persona-1' \| 'persona-2' \| 'persona-3'` | Stable for the flow: React keys, element ids |
| `name` | `string` | A label for the team, drawn when the persona is created and kept when it is generated anew (FR-009; research R10). Never empty |
| `values` | `Record<string, PersonaValue>` | Every value the persona has, including hidden ones: fields no longer checked, and dates of classes not held (FR-020, W4) |
| `generated` | `Record<string, PersonaValue>` | The values as generation last gave them |
| `status` | `'ready' \| 'generating'` | `'generating'` shows the placeholder, without "Edit data" or "Generate again" (FR-013) |

**Derived**:
- **`changedKeys(persona, fields)`**: the current fields whose value differs from `generated`
  (`sameValue()` of `branches.ts`). This drives the "· edited" marker (K2) and the confirm questions
  (FR-012).
- **`firstName(persona)`**: the name up to its first space. It appears in "Mia's data", "Rules Mia
  meets" and "Message Mia reads" (design-notes).
- **`ageOn(dateOfBirth, today)`**: the largest N for which `yearsAfter(dateOfBirth, N)` ≤ today, as
  the evaluator counts it (FR-007).

**Rules**:
- Exactly three personas, in a fixed order. The first is selected by default (FR-004).
- The names differ when generated (FR-010). Afterwards the team member may give two personas the
  same name.
- A value set by the team member applies at once, but only if it is valid for its kind (FR-008).
  `generated` changes only when generation gives values.

## The documents a persona stands for: `applicantOf(persona, fields)` (research R4)

The evaluator's `Applicant` (`utils/rules/evaluation.ts`): documents by type, then fields by key,
each field's value as delivered. It is built from the **current fields only** and leaves out empty
values:

| Field | Delivered as |
|---|---|
| A field without parts | `{ [documentType]: { [field]: value } }` |
| A part of `place_of_birth` | `pid.place_of_birth` = `{ country?, region?, locality? }` from the parts that are fields |
| `mdl.driving_privileges.classes` and class dates | `mdl.driving_privileges` = one entry per class held, `{ vehicle_category_code: code, issue_date?, expiry_date? }`, with a date only where it is a field and not empty. An empty list of classes delivers `[]`, which the evaluator reads as missing |

## Persona state: `PersonaState` (research R9, R10)

The state of `usePersonas()`, changed only by the pure `personaStateReducer()` of
`personas/personaState.ts`.

| Field | Type | Notes |
|---|---|---|
| `personas` | `Persona[] \| null` | `null` until the first generation gives values |
| `selected` | `0 \| 1 \| 2` | The selected persona. Kept when the variant changes (FR-004) |
| `branchKey` | `string \| null` | The test step's selected variant. When the step opens, it is set to the rules step's open branch |
| `run` | `GenerationRun \| null` | The run in progress |
| `failed` | `boolean` | The last run failed: the failure state (FR-013, F7) |
| `editing` | `0 \| 1 \| 2 \| null` | The persona whose panel is in edit mode (FR-006) |
| `confirm` | `{ type: 'one'; slot } \| { type: 'all' } \| null` | The open question before generating anew (FR-012) |
| `announcement` | `string` | The latest text for the status region (FR-017) |

`GenerationRun`: `{ runId, startedAt, slots: SlotKind[] }`, where `SlotKind` is `'free' | 'kept' |
'filled'` (research R8). The personas of `'free'` slots (and of `'filled'` slots, for their new
fields) show as placeholders.

**Actions**:

| Action | From | Effect |
|---|---|---|
| `opened` | the step opens with the current fields | Selects the variant. Without personas and without a run, starts the first run (all free). With personas lacking a value for a current field, starts a fill run (those slots filled, the rest kept) |
| `generateOne` / `generateAll` | "Generate again" / "Generate all again" | If a persona to regenerate has changed values: sets `confirm`. Otherwise starts the run, merged with a running one (research R9) |
| `confirmed` / `cancelled` | the question's buttons | Starts the run / closes the question |
| `retry` | "Try again" | Clears `failed`, starts a run with all slots free (a new persona keeps its slot's name if it had one) |
| `runSucceeded` | the worker's answer for the current `runId` | Writes the new values (and names of new personas) into `values` and `generated`, drops the hidden values of free slots, sets `status: 'ready'`, clears `run`. Answers for an older `runId` are ignored |
| `runFailed` | error, watchdog, module that can't load | `failed: true`, `run: null`. The personas keep their last values, and those being generated go back to `'ready'` with them |
| `setValue` | a valid entry | Changes one value, then sets `announcement` from the outcome changes (FR-017) |
| `rename` | a non-empty name | Changes the name; no announcement, since no result changes (US2-AS7) |
| `select` / `selectBranch` | chips / variant tabs | Changes the selection, ends edit mode |
| `startEditing` / `stopEditing` | "Edit data" / "Done" | Sets or clears `editing` |

**Lifecycle**:

```text
          opened (no personas)                     runSucceeded
 [empty] ─────────────────────▶ [first run] ───────────────────────▶ [ready]
                                    │                                 │  ▲
                          runFailed │     generateOne / generateAll / │  │ runSucceeded
                                    ▼     opened (fill needed)        ▼  │
                               [failed] ◀──────── runFailed ───── [ready + run]
                                    │
                                    └── retry ──▶ [run, all free]
```

The state lives as long as the editor page. Publishing or saving navigates away, and so does leaving
the flow, which discards it (FR-019). Nothing in it is written anywhere.

## Test result (research R5)

### `PersonaBranchResult`: what the evaluation decides

`testResultsOf()` gives one for each ready persona and each branch, by persona id, then branch key.

| Field | Type | Notes |
|---|---|---|
| `met` | `boolean` | `Evaluation.met`. True for a branch without rules |
| `items` | `EvaluatedItem[]` | Each top-level item that counts, with its outcome, and a group's members with theirs (`evaluation.ts`) |
| `messages` | `{ id: string; message: string }[]` | `Evaluation.messages`: empty when met. Otherwise the reported items, in the evaluation's order (FR-014) |

### `ResultView`: what the step shows for the selected persona and variant

| Field | Type | Notes |
|---|---|---|
| `meets` | `boolean` | Whether the persona meets the variant |
| `heading` | `string` | "Result: meets the rules", "Result: doesn't meet 1 rule and 1 group" (FR-015, W10) |
| `listHeading` | `string \| null` | "Rules Mia meets" under a met variant, otherwise null (F3) |
| `messageColumn` | `string \| null` | "Message Mia reads" under a variant the persona doesn't meet, otherwise null (F3, F14) |
| `rows` | `ResultRow[]` | Reported items first, then the other top-level items |
| `failingFields` | `string[]` | The keys of the fields read by rules shown as failing (K1) |

`ResultRow`: `{ itemId, type: 'rule' | 'group', name, statement, status: 'met' | 'not_met' |
'not_checked', message: string | null, reported: boolean, members: ResultRow[] }`.
- **`message`** holds the item's message for a reported row, and is `null` for other rows, which the
  step draws as "–" when there is a message column.
- **`members`** holds a reported group's members that aren't met, recursively. It is empty for
  everything else (W10, FR-015).

## Generation (research R6–R8)

Internal to the worker. The messages between the hook and the worker are in
[contracts/personas.md](contracts/personas.md).

| Shape | Meaning |
|---|---|
| `SlotPlan` | A slot's kind, its fixed values (kept, filled) and its name (kept, or drawn) |
| `BranchClass` | Branches with the same formula, by canonical serialisation, and that formula |
| `OutcomeVector` | Per class: meet or fail. "Realizable" when `satisfiable()` answers `'sat'` for the conjunction today |
| `Target` | Goal 1 `meet(class)`, goal 2 `fail(class)`, goal 3 `differ(a, b)`, goal 4 `meet(item)` and `fail(item)` |
| `Score` | `[goal1, goal2, goal3, goal4]`: covered targets per goal, compared in that order (FR-011) |
| `Model` | Per variable, the literals that a satisfying choice of OR children picked (`modelOf()`, by random self-reduction) |

**Substitution** (`substitute.ts`, research R8) turns a branch's checked tree and a slot's fixed
values into a formula over the free variables only. It works rule by rule and before any negation:

| The rule's values | Becomes |
|---|---|
| All fixed | `true` if `ruleOutcome()` is `'met'`, `false` otherwise |
| None fixed | Its formula, unchanged |
| Class K's date: classes fixed, date free | `false` if the classes are empty or lack K, the date's literal otherwise |
| Class K's date: date fixed, classes free | `false` if the date is empty, `held(K) ∧ (ruleOutcome() for the date is 'met')` otherwise |

## Announcements (FR-017)

`announcementOf(before, after, persona, branches)` (`personas/announcements.ts`) compares the edited
persona's `met` per branch before and after one `setValue`. In tab order, it gives one sentence per
change: "Mia Schulz now meets the rules of Standard." or "Mia Schulz no longer meets the rules of
Ambulance.". The sentences are joined with a space, or the text is empty when nothing changed. Only
`setValue` sets `announcement`.

## Generated fixtures (research R2)

`frontend/src/utils/rules/checks/fixtures/evaluator-vectors.json` gains one key, written by
`backend/scripts/export_check_fixtures.py` and never edited by hand:

```json
"branch_evaluations": [
  {
    "name": "OR group without a message reports its members",
    "branch": { "origin": "main", "operator": "and", "items": [ /* RuleItem | GroupItem */ ] },
    "documents": [ { "document_type": "pid", "fields": [ { "key": "birthdate", "value": "2005-10-23" } ] } ],
    "shared_on": "2026-10-23",
    "met": false,
    "results": [ { "id": "rule-1", "group": null, "outcome": "not_met" } ],
    "messages": [ { "id": "rule-1", "message": "…" } ]
  }
]
```

The branch and documents use the shapes `evaluate_branch()` reads (`SnapshotBranch`,
`DeliveredDocument`). `results` and `messages` are its output, without names. The `--check` mode
and `backend/tests/unit/test_check_fixtures.py` cover the new key like the existing ones.
