---

description: "Task list for conflict and redundancy checks for rules"
---

# Tasks: Conflict and Redundancy Checks for Rules

**Input**: Design documents from `/specs/003-rule-consistency-checks/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md),
[figma-audit/report.md](figma-audit/report.md) (redesign of 2026-11-01; the audit of 2026-10-28 is
in [figma-audit/archive-2026-10-28/](figma-audit/archive-2026-10-28/))

**Tests**: Included, because the plan asks for them: plan.md "Testing" and "Rules for
/speckit-tasks", research R13, quickstart §2.
- Vitest is a merge gate (constitution v1.1.0, III). Each task that writes a module of
  `frontend/src/utils/rules/checks/` writes its `*.test.ts` beside it, in the `node` environment.
- `scenarios.test.ts` and `oracle.test.ts` come with `findings.ts` (T020, T034), not after the UI.
  `findings.ts` isn't done until `scenarios.test.ts` covers every acceptance scenario and edge case
  that a rule set expresses (T022, T036, T040), and `oracle.test.ts` passes with at least several
  thousand seeded branches (T037).
- Backend pytest covers the catalog attribute and the fixtures' drift check. It is a practice, not
  a gate.
- The worker entry and the hook are glue code: lint, build and quickstart V1–V8 cover them.

**Organization**: Tasks are grouped by user story, so that each story can be implemented and
tested as an increment.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel, because it touches different files and depends on no unfinished
  task in the same phase.
- **[Story]**: Which user story the task belongs to (US1 to US4).
- Every description names the exact files.

## Path Conventions

- **Checks**: `frontend/src/utils/rules/checks/`, written `checks/` below. Its modules are pure. The
  worker entry (`checks/worker.ts`) and the hook (`frontend/src/hooks/useRuleChecks.ts`) are the
  only code that touches browser APIs.
- **Rules step**: `frontend/src/pages/FormConnectionEditor/RulesStep/`, written `RulesStep/` below.
  The editor page is `frontend/src/pages/FormConnectionEditor/`.
- **Backend**: `backend/app/`, `backend/scripts/` and `backend/tests/`. No model, migration,
  endpoint, setting, environment variable or dependency is added (plan "Constitution Check").
- **Rules**: constitution v1.1.0 applies to every task.
  - No `any`, no inline styles, Tailwind only.
  - `useReducer` for related state, list items as sub-components, sibling `types.ts`,
    `constants.ts` and `utils.ts`.
  - Single quotes, ruff and mypy (`app/ scripts/ tests/`) on the backend.
- **Privacy** (FR-018 to FR-020): nothing about findings is stored, sent or logged, in the browser
  or on the server. There is no `console.*` in `checks/`, the worker or the hook. Findings appear
  only in the rules step and in the publish and save dialog, never on the details
  (`frontend/src/pages/FormConnectionDetail/`) or in the overview.
- **Generated files** (plan "Rules for /speckit-tasks"): `checks/caseFolding.ts` and
  `checks/fixtures/evaluator-vectors.json` change only through `uv run python -m
  scripts.export_check_fixtures` (from `backend/`), never by hand.
- **Copy**: every finding text is built in `checks/findingMessages.ts` (research R12), with the
  wording of contracts/ui-screens.md "Copy" and, where the decisions leave it open, of
  `specs/003-rule-consistency-checks/design-notes.md` (T001).
  - No text words a finding as something "to fix" (FR-016).
  - The UI says "variant" for branch and "connection" for form connection.
- **Gates**: every frontend task passes `npm run lint`, `npm test` and `npm run build`. Every
  backend task passes `uv run ruff check .` and `uv run mypy app/ scripts/ tests/`.
- **UI tasks** (revised 2026-11-01, the Figma section was redesigned): spec.md decides what is a
  finding; the redesigned section decides the findings' look, behaviour and wording; the page
  around the findings stays as built.
  - Every UI task cites its screen (S2–S7) and the items it covers, from contracts/ui-screens.md
    "Items from the audit": A1–A8 (adopted from Figma), W1–W15 and W17–W20 (built without frames),
    O1–O6 (page design, out of scope). Tasks completed before 2026-11-01 cite F1–F8 and W1–W16 of
    the archived audit; Phase 3R reworks what the redesign changed.
  - It follows CLAUDE.md's "Figma implementation workflow" on section `6171:6748` of file
    `s8mU9oJDq3411e8bxMjQO9`, for the nodes it names: `get_design_context` and `get_screenshot`
    per node (the node ids are in figma-audit/units.md and report.md, so `figma-node-finder` is
    needed only for a node they don't list); exact values; then the numeric and visual checks.
  - Its visual-verification table lists each difference that an O# item explains ("page design
    (O2)"), and each value that differs only because the file binds KERN's names to the unreleased
    "Revamp" ("KERN 2.8 vs Revamp", O6). Neither is fixed.

---

## Phase 1: Setup (design groundwork)

**Purpose**: Settle the copy and the tokens that the messages and the UI tasks need.

- [X] T001 [P] Write `specs/003-rule-consistency-checks/design-notes.md`, the copy that the decisions leave open. This is the first UI task, and T021 needs it to complete `checks/findingMessages.ts` (plan "Rules for /speckit-tasks"; research R12; S2, S4, S5; F1, F5, W1, W3, W5, W6, W8, W10).
  - Use the format of `specs/002-connection-rules/design-notes.md`. Mark each text that no decision gives as "proposed".
  - Settle research R12's seven items:
    1. the note of a rule that can't be met on its own (FR-003: "its condition"), such as "Driving licence – Nationality includes none of" every country (quickstart V4);
    2. the note of an OR group none of whose members can be met;
    3. the summary's clause after the counts, when the first conflict isn't a pair ("nobody can meet both …" fits two items), such as EC-11's four rules, and when a branch has several conflicts;
    4. the summary's counts in general: the order of the kinds, rules before groups ("2 conflicting rules and 1 conflicting group"), singular and plural, when to say "in this variant" (U03 `6616:44417`), where FR-008's "who share today" goes, and where FR-010's incomplete sentence goes (after the notice, contracts/ui-screens.md "Copy");
    5. the reasons of a redundancy that comes through an enclosing level (research R8, step 4), starting from "Anyone who meets this rule and Rule 05 also meets Rule 01." and "Anyone who meets Rule 02 also meets this rule or Group 03.";
    6. the announcements for groups and sub-groups, and for findings in a branch other than the one shown (proposed: "In Ambulance: Rule 02 conflicts with Rule 05.");
    7. the dialog's line for a branch whose only finding is that every applicant meets its rules.
  - Also settle what these items imply:
    - a group's conflict note with FR-008's words ("… can't be met together by applicants who share today");
    - the dialog's unmeetable line with FR-008's words;
    - the dialog's counts for groups and always-met items, such as "Ambulance: 1 conflicting group, 1 always-met rule".
  - Every proposal:
    - starts each note with FR-012's kind ("Conflicting.", "Redundant.", "Always met.");
    - names items by their current names, and lists them as "Rule 02, Rule 03 and Rule 04" (W3);
    - never words a finding as something "to fix" (FR-016).
- [X] T002 Map the Figma variables to KERN 2.8 tokens, once (CLAUDE.md "Figma implementation workflow", step 2; F2, F4, F7; research R15). It runs after T001, since both write `specs/003-rule-consistency-checks/design-notes.md`.
  - Redesign 2026-11-01: design-notes.md §1–§6 and §7's update were rewritten for the redesigned section by T055.
  - Call `get_variable_defs` on the section `6171:6748`, and map every variable to an existing token of `frontend/src/index.css` (KERN's Tailwind theme and the `@theme` block). Start from the "Tokens" section of `specs/002-connection-rules/design-notes.md`, since the section is in spec 002's file.
  - Record the mapping in a "Tokens" section of design-notes.md. List each value that differs only for the Revamp as "KERN 2.8 vs Revamp" (CLAUDE.md, decision 2026-10-25).
  - Settle research R15's first point:
    - the icon classes of KERN 2.8's warning triangle and info icon in `@kern-ux/native` (`kern-icon--warning` or its 2.8 name);
    - the text colour of a warning note and of an info note that reaches WCAG 2.1 AA (4.5:1) on white and on the group frame's background. Use KERN's text token if `feedback-warning` or `feedback-info` is too light for text.
  - Ask the user before adding any token to `@theme`. Don't invent tokens.

---

## Phase 2: Foundational (blocking prerequisites)

**Purpose**: The catalog's `multiple_values`, the fixtures that pin the evaluator's behaviour, and
the checks' engine that every finding builds on: shapes, calendar, text, the four theories,
literals, the checked tree and the solver. After this phase, `satisfiable()` answers questions
about any branch exactly, as the brute-force oracle confirms. Only the API's new attribute is
visible.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Catalog attribute (backend, then its mirror)

- [X] T003 [P] Add `multiple_values` to the catalog in `backend/app/catalog.py` (FR-007, third bullet; research R9; data-model.md "Catalog").
  - `CatalogPart` and `CatalogField` gain `multiple_values: bool = False`, as their last field, with a comment like their siblings'.
  - `_claim()` and `_mdl_element()` build `CatalogField` positionally, so they take `multiple_values: bool = False` as a keyword and pass it on.
  - Values, verbatim from data-model.md: "true for `pid.nationalities` and for the part `classes` of `mdl.driving_privileges`; false for every other field and part". "Images and fields made of parts have `multiple_values` false; a field made of parts declares it on its parts."
  - Extend `backend/tests/unit/test_catalog.py`: exactly those two are true, and no field of kind `image` or `parts` is.
- [X] T004 Return the attribute from `GET /api/document-types` (depends on T003; constitution I; contracts/management-api.md).
  - `backend/app/schemas.py`: `FieldPart.multiple_values: bool` and `DocumentField.multiple_values: bool`, read from the catalog by `from_attributes` as the other attributes are. Each gets a comment, such as "Whether a document can give several values for it".
  - Extend `test_the_catalog_returns_each_fields_kind_and_parts` in `backend/tests/api/test_form_connections.py`: every field and every part has `multiple_values`. It is true for the Personal ID's `nationalities` and the driving licence's part `classes` only.
- [X] T005 Mirror the attribute in the frontend, in the same change set as T004 (depends on T004; constitution I; contracts/management-api.md).
  - `frontend/src/types/document-types.ts`: `multiple_values: boolean` on `FieldPart` and `DocumentField`, with a comment that names the two fields that hold several values.
  - `frontend/src/utils/rules/testData.ts`: `multiple_values` on every field and part of `PID` and `MDL`, true for `PID`'s `nationalities` and `MDL`'s part `classes`.
  - Fix every other object literal of these types that `tsc -b` now refuses.

### Fixtures from Python (parity, research R7 and R13)

- [X] T006 [P] Write the fixture generator `backend/scripts/export_check_fixtures.py`, run as `uv run python -m scripts.export_check_fixtures` from `backend/` (research R7, R13; data-model.md "Generated fixtures"; CLAUDE.md "Developer scripts").
  - It reads the interpreter and the evaluator themselves: `str.casefold()`, `unicodedata`, and, from `backend/app/services/evaluation.py`, `_normalised_text()`, `years_after()`, `months_after()` and the rule outcomes (`_rule_outcome()`, or `evaluate_branch()` on a branch of one rule).
  - It may import `app.catalog`, `app.option_sets`, `app.schemas` and `app.services.evaluation`, but never `app.config`. `app/` never imports it.
  - It writes `frontend/src/utils/rules/checks/caseFolding.ts`:
    - "Python's `str.casefold()` for every code point it changes, compressed into ranges, with the Unicode version (15.1.0) and a header naming its generator";
    - the header also says that the file is never edited by hand;
    - its export is a lookup that `checks/text.ts` reads (T010), written so that `npm run lint` passes without `--fix`.
  - It writes `frontend/src/utils/rules/checks/fixtures/evaluator-vectors.json`: "inputs and Python's results for `_normalised_text()` (including the whitespace set, ß, ẞ, İ, ı, combining marks), `years_after()`, `months_after()` (29 February, month ends, the clamp at 9999), and rule outcomes for chosen conditions, values and days".
    - The texts cover both letter-case settings, U+FEFF (which Python keeps) and U+0085 (which it strips).
    - The outcomes cover every operator of `OPERATORS` in `frontend/src/utils/rules/constants.ts`.
    - They include numbers with decimals, and enums with one and with several values (codes as integers, texts case-folded).
    - They include a licence class's issue and expiry dates, for a class that is held and for one that isn't.
  - The output is deterministic: stable order, sorted keys, a final newline. Add both files to `frontend/.prettierignore`, so that the pre-commit hook's `prettier --write` can't change them behind the generator's back.
  - `--check` writes nothing. It compares what it would write with the committed files, byte for byte.
    - When they match, it prints nothing and exits 0.
    - Otherwise it names each stale file on stderr, as `scripts/issue_test_credentials` reports its warnings, and exits 1.
- [X] T007 Generate the fixtures and test their drift check (depends on T006; research R13).
  - Run `uv run python -m scripts.export_check_fixtures`, and add both generated files to the change.
  - Write `backend/tests/unit/test_check_fixtures.py`:
    - the committed files match what the current interpreter and evaluator produce, through the script's `--check` path called in-process;
    - spot checks: ẞ (U+1E9E) folds to "ss" in the table, and the table names Unicode 15.1.0.

### The checks' engine (frontend, pure, with Vitest)

- [X] T008 [P] Write `checks/types.ts` and `checks/constants.ts`, the shapes and budgets of the checks (data-model.md; contracts/rule-checks.md; research R5, R8, R10). These hold types and constants only, so they have no test file.
  - `types.ts`, with data-model.md's field descriptions as comments:
    - `CheckedBranch`, with `branchKey`, `operator`, `items`, `leftOut`, `variables`, `today` ("`YYYY-MM-DD`, the calendar date in Germany when the run started") and `fingerprint` ("canonical serialisation of everything above except `branchKey`; equal fingerprints have equal results");
    - `CheckedItem`: a rule `{ type: 'rule', id, formula }`, or a group `{ type: 'group', id, operator, items }` "with at least two items";
    - `Variable` (`key`, `kind`, `multiple`, `values`) and `Literal` (`variable`, `test`, `negated`), with the tests of data-model.md's table:
      - number `gt`, `lt`, `eq`, `ne`, with `value`;
      - text `eq`, `ne`, `contains`, `not_contains`, with `text` and `matchCase`;
      - enum `one_of`, `none_of`, with `values`;
      - fixed dates `before`, `after`, `on`, with `date` as a day number;
      - dates counted from the day of sharing `at_least_years_ago`, `less_than_years_ago`, `exactly_years_ago`, `at_least_from_now`, `less_than_from_now`, with `count` "(a whole number from 1)" and `unit` (`years` | `months`);
    - `Formula` (`true`, `false`, a `Literal`, `{ and: Formula[] }`, `{ or: Formula[] }`), `DayRange` `{ from, to }` in day numbers, and `Verdict` (`'sat' | 'unsat' | 'unknown'`);
    - `ItemFinding` (`itemId`, `kind` `'conflicting' | 'redundant' | 'always_met'`, `reason`, `today`) with its reasons:
      - conflicting: `{ type: 'with', items }`, `{ type: 'members', items }`, `{ type: 'condition' }`;
      - redundant: `{ type: 'same', item }`, `{ type: 'implied_by', items, orItems }`, `{ type: 'implies', items, givenItems }`;
      - `null` for `always_met`;
    - `BranchNotice` (`kind` `'none_can_meet' | 'all_meet'`, `today`), and `BranchCheck` (`branchKey`, `fingerprint`, `complete`, `notice`, `findings`, `checkedRules`: "0 means no summary, notice or tab icon (W13)");
    - the worker messages of contracts/rule-checks.md (`'check'`, `'result'`, `'done'`), and `RuleChecks` (`byBranch`, `announcement`).
  - `constants.ts`:
    - the run's deadline of 5 seconds, the worker's stop at 4.5 seconds and the watchdog at 5.5 seconds after the change (research R10);
    - the first and the last day the evaluator can read, 0001-01-01 and 9999-12-31;
    - the conflict and redundancy searches' budget of questions per item (research R8);
    - up to 50 earlier results in the cache (data-model.md "A check run: lifecycle");
    - today read again every 60 seconds.
- [X] T009 [P] Write `checks/calendar.ts` with `calendar.test.ts` (depends on T007, T008; FR-007, second bullet; research R6).
  - Day numbers are proleptic Gregorian ordinals, as Python's `date.toordinal()` gives them (0001-01-01 is 1), converted to and from `YYYY-MM-DD`.
  - `yearsAfter(day, n)` and `monthsAfter(day, n)` use the evaluator's arithmetic:
    - 29 February plus a year is 1 March;
    - a month end without its day moves to the 1st of the next month;
    - years beyond 9999 are clamped to 9999-12-31, as `_calendar_day()` does. `utils/rules/dates.ts` doesn't clamp, so this module reimplements the arithmetic on day numbers.
  - L_N(d), the threshold of "N years ago": the latest date whose N-th anniversary falls on or before d.
  - Tests:
    - every calendar vector of `fixtures/evaluator-vectors.json`;
    - `monthsAfter(d, 12N)` equals `yearsAfter(d, N)`, and neither ever decreases as d grows, over a sample of days for N = 1, 2 and 21 (research R6's measurement).
- [X] T010 [P] Write `checks/text.ts` with `text.test.ts` (depends on T007, T008; FR-007, first bullet; research R7).
  - `normalisedText(text, matchCase)` reproduces `_normalised_text()`:
    - it strips Python's whitespace only: U+0009–U+000D, U+001C–U+001F, U+0020, U+0085, U+00A0, U+1680, U+2000–U+200A, U+2028, U+2029, U+202F, U+205F and U+3000. Not `trim()`, which keeps U+001C–U+001F and U+0085 and strips U+FEFF;
    - it normalises to NFC;
    - ignoring letter case, it then folds with `caseFolding.ts` and normalises to NFC again.
  - It also exports the inverse of the folding, the case variants of a folded character, which `textTheory.ts` needs (T014).
  - It never uses `toUpperCase().toLowerCase()` or `foldName()` (`utils/rules/tree.ts`), which put ẞ and 58 other code points into other classes than Python does.
  - Tests: every `_normalised_text()` vector of `fixtures/evaluator-vectors.json`, and "STRAẞE" equals "straße" when letter case is ignored.
- [X] T011 [P] Write `checks/numberTheory.ts` with `numberTheory.test.ts` (depends on T007, T008; FR-007, fourth bullet; research R3, R6).
  - The values are whole numbers from 0. A variable's literals give an integer interval within [0, ∞), minus a finite set of excluded values:
    - "greater than c" sets the lower bound to ⌊c⌋ + 1;
    - "less than c" sets the upper bound to ⌈c⌉ − 1;
    - "equal to c" needs a whole number c;
    - "not equal to c" excludes a whole number c;
    - a negated literal takes the complement: ≤ for >, ≥ for <, ≠ for =.
  - The literals can be met when the interval holds more values than it excludes. A "can be met" answer comes with a witness value.
  - Tests:
    - "greater than 20" and "less than 21" can't be met together;
    - "less than 0" can't be met;
    - "greater than 20.5" means at least 21, "equal to 20.5" can't be met, and "not equal to 20.5" is always met;
    - EC-11's four literals can't all be met, while any three can;
    - the literal's membership test agrees with every number outcome vector.
- [X] T012 [P] Write `checks/enumTheory.ts` with `enumTheory.test.ts` (depends on T007, T008; FR-007, third bullet; research R6, R9).
  - One value: the allowed values are the set, within every "includes one of", without every "includes none of". They can be met when one value is left.
  - Several values (`multiple`): the applicant's values lie in the set without every "includes none of", and meet every "includes one of" V. They can be met when each V keeps a value outside the "none of" values, and the set keeps at least one.
  - Negation swaps "includes one of" and "includes none of". Values compare as the evaluator compares them (codes as integers, texts case-folded), in the form `literals.ts` gives them (T016).
  - Tests:
    - EC "Fields with several values": the Personal ID's Nationality "Germany" and "Italy" can be met together, the driving licence's can't, and Licence classes "B" and "C" can;
    - EC "An enum rule with every value": "includes none of" every value can't be met, and "includes one of" every value is always met;
    - the literal's membership test agrees with every enum outcome vector.
- [X] T013 [P] Write `checks/dateTheory.ts` with `dateTheory.test.ts` (depends on T009; FR-007, FR-008; research R6).
  - On one day d, each literal is a set of days within 0001-01-01 to 9999-12-31:
    - "before", "after" and "on" are strict comparisons;
    - "at least N years ago" is v ≤ L_N(d), "less than" is v > L_N(d), and "exactly" is L_{N+1}(d) < v ≤ L_N(d);
    - "at least N years/months from now" is v ≥ A(d), with A `yearsAfter(d, N)` or `monthsAfter(d, N)`, and "less than" is v < A(d);
    - negation takes the complement.
    The literals can be met when the intersection, a union of intervals, isn't empty.
  - Over a range of days, the thresholds never decrease as d grows. So whether the literals can be met changes only on a day where a threshold meets a fixed date of the variable or a calendar bound.
    - Find those days by binary search over d, cut the range there, and decide one day in each piece.
    - Return the days on which the literals can be met, as a union of ranges.
    - A variable without conditions counted from the day of sharing can be met on every day or on none.
  - Tests, with today 2026-10-28:
    - "before 1 Jan 2030" and "after 31 Dec 2029" can't be met together;
    - "at least 12 months from now" and "at least 1 year from now" hold for the same values on every day of the range;
    - "exactly 21 years old" implies "at least 18 years old";
    - EC-7: "after 1 Jan 2010" and "at least 21 years old" can't be met today, but can from 2031-01-02 on;
    - "at least 18 years old" without "before 1 Jan 2010" can't be met up to 2027-12-31, but can from 2028-01-01 on;
    - for seeded literal sets, the answers equal a brute-force pass over every day of a small window;
    - the literal's membership test agrees with every date outcome vector.
- [X] T014 [P] Write `checks/textTheory.ts` with `textTheory.test.ts` (depends on T010; FR-007, first bullet; research R7).
  - A variable's literals are "is equal to", "is not equal to", "contains" and "doesn't contain", each respecting or ignoring letter case, on texts that `literals.ts` has already normalised (T016). An applicant's text isn't empty after normalisation.
  - Research R7's three cases:
    1. A case-respecting "is equal to" fixes the value, and every literal is evaluated on it.
    2. All literals ignore letter case, or all respect it. With an "is equal to", every literal is evaluated on its value. Without one, the literals can be met unless a "doesn't contain" text occurs inside a "contains" text. The witness is the "contains" texts joined by a separator that occurs in no "doesn't contain" text, varied to avoid every "is not equal to".
    3. Letter case is mixed.
       - The candidate witnesses are the rules' texts, the folded value, and case variants (T010's inverse) that avoid the occurrences of case-respecting "doesn't contain" texts.
       - The literals are refuted by case 2 within each form, or by a case-respecting "doesn't contain" text without case variants that every candidate contains.
       - Otherwise the answer is `'unknown'`.
  - Every `'sat'` carries a witness, verified with the evaluator's comparison. Every `'unsat'` rests on a refutation that holds whatever the folding does. `'unknown'` arises only when one text field mixes letter-case settings with "contains" conditions.
  - Tests:
    - EC "Letter case": "is equal to Stuttgart" and "is equal to STUTTGART" hold for the same values when both ignore letter case, can't be met together when both respect it, and the first implies the second when only the first respects it;
    - "contains straße" and "contains STRASSE", ignoring letter case, hold for the same values;
    - EC "Text inside other text": "is equal to Stuttgart" with "doesn't contain gart" can't be met, and "is equal to Stuttgart" implies "contains Stutt";
    - the `'unknown'` corner;
    - every witness is re-checked;
    - the literal's membership test agrees with every text outcome vector.
- [X] T015 [P] Write `checks/testEvaluator.ts`, test support, with `testEvaluator.test.ts` (depends on T009, T010; research R13). Only tests import it.
  - It is a plain port of `evaluation.py`'s comparisons: `_number_holds()`, `_text_holds()`, `_enum_holds()`, `_date_holds()` with `_from_now()`, and a licence class's dates through `_privileges_value()`.
  - It evaluates a branch's levels with AND and OR, for an applicant whose documents give every value.
  - It uses `calendar.ts` and `text.ts`, which the vectors pin. It shares no code with the theories, `literals.ts` or the solver.
  - Its test replays every rule-outcome vector of `fixtures/evaluator-vectors.json`.
- [X] T016 [P] Write `checks/literals.ts` with `literals.test.ts` (depends on T005, T009, T010; FR-007; research R3; data-model.md "Variables and literals" and "Formulas and questions").
  - The variable of a target:
    - its key: "`document_type.field`, then `.part` for a field made of parts, then `#class` for a licence class's date, such as `mdl.driving_privileges.issue_date#B`";
    - its kind, from the catalog;
    - `multiple`, from `multiple_values` of the field or part;
    - `values`: "the set's keys as the evaluator compares them, codes as integers and texts case-folded".
  - The formula of a rule is one literal per operator of `OPERATORS` (`utils/rules/constants.ts`), with values as the evaluator reads them:
    - numbers as given, decimals kept;
    - texts through `normalisedText()` with the rule's `match_case`;
    - enum keys normalised as above;
    - dates as day numbers.
  - A rule on the issue or expiry date of class K is `held(K) ∧ c(date_K)`, where `held(K)` is "Licence classes includes one of K" on the `classes` variable (FR-007, fifth bullet).
  - `negate(formula)` gives the De Morgan dual, with each literal's `negated` flipped. A class's date becomes `¬held(K) ∨ ¬c(date_K)`. `negated` "is set by the questions of research R4, never by a rule".
  - It simplifies `true` and `false` inside `and` and `or`.
  - Tests: every operator of every kind; `negate(negate(f))` equals `f`; a class date's formula and its negation; the variable keys.
- [X] T017 Write `checks/checkedTree.ts` with `checkedTree.test.ts`: `buildCheckedBranch(branch, context, today)` (depends on T016; FR-001, FR-002, FR-011; research R2; data-model.md "Checked branch"; contracts/rule-checks.md).
  - `branch` is a `BranchInput` with the rules step's `key`. `RulesBranch` is one, but `utils/` doesn't import from `pages/`.
  - `context` holds the requested documents (`requestedRuleDocuments()`) and the value sets. `today` is `YYYY-MM-DD`, from `todayInGermany()`.
  - The derivation rules, in order, verbatim from data-model.md:
    1. "Start from `effectiveItems(branch.items, branch.origin === 'based')` (`tree.ts`)."
    2. "Leave out every rule without a target, with a target that isn't among the requested documents' fields, or with an incomplete condition (`isComplete` with the field's value set). Keep a rule without an error message." Use `resolveTarget()` and `checksUnrequestedData()`.
    3. "A group with one item left becomes that item, in its place. A group with none is left out. Apply this bottom-up."
    4. "A branch without items left has no checks and no findings (EC "A branch without rules", W13)."
  - `leftOut` lists the ids of the rules left out, and `variables` holds every variable that a checked rule uses (T016).
  - The fingerprint is a "canonical serialisation of everything above except `branchKey`". It has no names or messages, so a rename needs no new check (FR-011).
  - It never throws on a branch of the rules state, whatever its problems, and it is linear in the number of items.
  - Tests:
    - EC "Removed rules and dissolved groups": in a based branch, removed rules and groups are left out, and a dissolved group is replaced by its remaining member, in its place;
    - W11: a rule with an incomplete condition, without a target, or checking data no longer requested is left out, and its group is then checked as its remaining member;
    - a rule without an error message is kept;
    - the fingerprint stays the same after a rename or a new message. It changes with a condition, an operator, an AND or OR, the requested documents or the day;
    - W13: an empty branch, and a based branch whose rules are all removed, have no items.
- [X] T018 Write `checks/testOracle.ts`, test support (depends on T015, T017; SC-001, SC-002; research R13). Only tests import it.
  - `randomBranch(seed)` builds seeded random branches:
    - one to three levels, AND and OR, with two to eight rules over a few variables with small values;
    - the variables: numbers 0 to 5, an enum of three values, a set of three values that holds several, a per-class date of that set (FR-007, fifth bullet), two dates near a fixed today with conditions counted from the day of sharing, and texts over a, A, b and ß with both letter-case settings;
    - its own small `RuleContext`, so that the generated rules pass `buildCheckedBranch()`.
  - It enumerates every applicant in a domain large enough to stand for every case: numbers up to the largest constant plus 2, every value and every non-empty set of values, the dates of a window, and texts up to the constants' total length. It also enumerates every day of sharing in a window.
  - `met(branch, applicant, day)` evaluates through `testEvaluator.ts` (T015). Helpers for the oracle tests answer whether a set of items can be met on a day, and whether deleting items changes an outcome.
  - An assertion that fails prints its seed, so that the branch can be replayed.
- [X] T019 Write `checks/solver.ts` with `solver.test.ts`: `satisfiable(formula, days, options)` answers `'sat'`, `'unsat'` or `'unknown'` (depends on T011–T014, T016, T018; research R5).
  - It is a tableau over the tree:
    - it keeps the literals chosen so far, per variable, and adds the literals under each AND;
    - it branches over the children of one OR at a time, starting with the OR that has the fewest children left;
    - it drops a child that contradicts the chosen literals, skips an OR that a chosen literal already satisfies, and backtracks on a contradiction.
  - Independent parts: it splits a conjunction into parts that share no variable, and solves each alone. Over a range of days, the date variables with conditions counted from the day of sharing share that day, so they stay in one part.
  - After each step, each variable's literals are decided by its theory (T011–T014). Over a range of days, the variables' sets of feasible days are intersected.
  - It answers `'unknown'` when a theory can't decide or the deadline passes, and never turns `'unknown'` into `'sat'` or `'unsat'`. `options` holds `deadline`, the injected clock `now`, and a per-run memo keyed by formula and range of days.
  - Tests:
    - sat, unsat and unknown on hand-built formulas;
    - independent parts;
    - EC-7 for today and for a range of days;
    - the deadline, with a fake clock, answers `'unknown'`;
    - the memo's hits;
    - for a thousand seeded branches of T018 (built with `buildCheckedBranch()` and `literals.ts`), the answer for the branch, for today and for a window of days, equals the oracle's enumeration.

**Checkpoint**: the engine is exact against the oracle. `GET /api/document-types` returns
`multiple_values`, and `--check` passes. Nothing else visible has changed.

---

## Phase 3: User Story 1 - See rules that no applicant can meet (Priority: P1) 🎯 MVP

**Goal**: The rules step marks the rules and groups that can't be met together, at the top level,
in groups and in sub-groups. It says when no applicant can meet a branch's rules, updates after
every change without being asked, and announces the changes. Publishing and saving go on as
before.

**Independent Test**: In the rules step, build the conflicting rules of US1-AS1 to AS6 at the top
level, in a group and in a sub-group (quickstart V1, V2, and V4's conflict rows). Check that the
marks, their explanations and the branch's notice appear and disappear as the rules change, and
that publishing stays possible.

### Logic for User Story 1 (with Vitest)

- [X] T020 [US1] Write `checks/findings.ts` with `findings.test.ts`: `checkBranch(checked, { deadline, now })`, research R8's steps 1, 2 and 5 (depends on T017, T019; FR-003, FR-004, FR-008, FR-010; research R4, R8; contracts/rule-checks.md "checkBranch").
  - Step 1: can the branch be met today? If not, it gets the notice `none_can_meet`, with `today: true` when a later day, up to 9999-12-31, could meet it (FR-004, FR-008).
  - Step 2, for every item, top-down: X is conflicting when it belongs to a minimal set of A(X) ∪ {X} that can't be met today. A(X) is X's AND-context along the path to the top level; its OR-alternatives play no part (research R4).
    - The candidates for T are the items of A(X) that share a variable with X, directly or through other candidates. Items that can't be met on their own never join T, because T must be meetable (FR-003's last sentence).
    - If all candidates together can be met, both without X and with it, X isn't conflicting.
    - Otherwise, try sets T of growing size, ties going to the earlier items in display order. Past the budget of questions per item (T008), settle for a minimal set: drop members as long as T ∧ X stays unmeetable.
    - The reasons:
      - `with`: T's items, in display order;
      - `members`: for a group that can't be met on its own, a smallest set of its members that can't be met together (AND group), or its members, none of which can be met (OR group). The group is marked as well as the items inside it (FR-003);
      - `condition`: for a rule that can't be met on its own.
    - `today: true` when the finding's set can be met on a later day (FR-008).
  - Step 5 (FR-010):
    - an `'unknown'` answer or the deadline makes `complete` false, and the findings made so far stay;
    - a later step runs only for items whose earlier answers are certain.
  - The result:
    - `checkedRules`, and the findings in display order, at most one per item (data-model.md invariant 1);
    - deterministic for equal fingerprints, with no side effects and no logging;
    - returned no later than the deadline plus one theory step.
  - `findings.test.ts`: each reason type; the `today` flag; the deadline with a fake clock (`complete: false`, with the certain findings kept); determinism.
- [X] T021 [P] [US1] Write `checks/findingMessages.ts` with `findingMessages.test.ts`, the texts of conflicts (depends on T001, T008; FR-004, FR-008, FR-010, FR-012 to FR-015; research R12; contracts/ui-screens.md "Copy").
  - Redesign 2026-11-01: the texts, `summaryOf()` and the kind prefix are superseded; T056 reworks this module.
  - `noteOf(finding, names)`:
    - "Conflicting. Can't be met together with <items>.", and with FR-008, "… with <items> by applicants who share today.";
    - "Conflicting. <items> in this group can't be met together.";
    - the notes of a rule that can't be met on its own and of an OR group, from design-notes.md.
  - `summaryOf(check, branch, names)`, in this order:
    1. the counts per kind, such as "2 conflicting rules and 1 conflicting group";
    2. ": " and the first finding's clause, such as "nobody can meet both Rule 01 and Rule 02", with the other cases from design-notes.md;
    3. the notice: "No applicant can meet the rules of <branch>." or "No applicant who shares today can meet the rules of <branch>.";
    4. FR-010's "The rules of <branch> couldn't be checked completely. Only findings that are certain are shown.", which stands alone when no finding is certain.
  - `tabLabelOf(branchName)`: "<branch> has findings".
  - `announcementOf(change, names, shownBranch)` for conflicts: "Rule 02 conflicts with Rule 01.", "Rule 02 no longer conflicts with Rule 01.", a new notice's own text, and the wording for groups and for other branches from design-notes.md.
  - Lists read "Rule 02, Rule 03 and Rule 04" (W3). Names come from `names`, the current tree's, so a rename shows at once (FR-011).
  - This module is the only place where finding texts are written. Its tests pin every wording above, F1's U01 text "2 conflicting rules: nobody can meet both Rule 01 and Rule 02. No applicant can meet the rules of Standard.", and the texts taken from design-notes.md.
- [X] T022 [US1] Write `checks/scenarios.test.ts` with the conflicts of the spec (depends on T020, T021). Each case builds its branch with `testData.ts`' helpers, sets today to 2026-10-28, runs `buildCheckedBranch()` and `checkBranch()`, and asserts the exact findings and their `noteOf()` texts.
  - US1-AS1 and AS2.
  - US1-AS3 at the top level, in a group and in a sub-group, with the group's `members` note.
  - US1-AS4.
  - US1-AS5 (W2): only Rule 02 is marked, naming Rule 01, and the branch has no notice.
  - US1-AS6: `tree.ts`' edit, delete and ungroup, and their undo, between two checks.
  - EC-11 (W3): each of the four rules names the other three.
  - EC "Fields with several values"; EC "Letter case" (both respecting letter case: conflicting); EC "Text inside other text"; EC "Whole numbers"; EC "Adjacent dates".
  - EC-7 (W5): the notes' and the notice's `today`, and no finding on 2031-01-02.
  - EC "An enum rule with every value": the `condition` reason.
  - EC "Fields that describe the same fact" and EC "Unlikely values": no finding.
  - EC "Rules with problems" (W11): left out, and not counted in `checkedRules`.
  - Quickstart V4's conflict rows.
- [X] T023 [P] [US1] Write `checks/oracle.test.ts` for conflicts and the unmeetable branch (depends on T018, T020; SC-001; research R13). Over a thousand seeded branches of T018 to start with, assert that:
  - every reported conflicting finding holds: its T can be met today, T ∧ X can't, and `today` matches whether a later day of the window can meet them;
  - with `complete` true, every conflicting item has its finding;
  - the notice `none_can_meet` appears exactly when no applicant can meet the branch today.
  T037 raises the number of seeds.
- [X] T024 [US1] Write `checks/announcements.ts` with `announcements.test.ts`: `announcementsFor(previous, next, cause)` (depends on T021; FR-015; data-model.md "Announcements"; contracts/rule-checks.md).
  - Only the cause `'action'` returns anything. `'first'` (a branch's first result) and `'new_day'` return nothing.
  - Per branch, it compares the previous done result with the new one. It yields, in display order and with `announcementOf()`'s texts: a conflicting finding appearing or going, and a notice appearing.
  - "A finding that changes kind counts as one going and one appearing. Disappearances are announced only when the new result is `complete`."
  - Tests: each change; `'first'` and `'new_day'`; no disappearance after an incomplete result.
- [X] T025 [US1] Write `checks/runState.ts` with `runState.test.ts`, the hook's pure reducer (depends on T024; research R10; data-model.md "A check run: lifecycle").
  - Per branch key:
    - none → pending on a change with a new fingerprint → done (complete or incomplete) when its result is posted;
    - a deadline or the watchdog turns the branches still pending into done, incomplete, with no findings;
    - a change during a run supersedes it.
  - A run is `{ runId, startedAt, branchKeys }`, with the shown branch first, then tab order. Messages of another run are ignored.
  - "A cached `done` result with the same fingerprint, from an earlier state such as before an undo, is used at once, without a run." The cache holds "the latest result per branch key, and up to 50 earlier results by fingerprint".
  - "pending shows the last `done` result of that branch, without findings on items that are gone", so notes don't flicker. A branch that no longer exists leaves `byBranch`.
  - If the worker can't start, or reports an error, every branch with checked rules is done, incomplete, with no findings, so FR-010's sentence stands alone.
  - It keeps the latest announcement, from `announcementsFor()` with the change's cause.
  - Tests: every transition; an undo answered from the cache; stale messages; pending results without gone items; the cache's limit; a deleted branch; a worker failure.
- [X] T026 [P] [US1] Write the worker's entry, `checks/worker.ts` (depends on T020; research R10, R15; contracts/rule-checks.md "Worker protocol").
  - On `{ type: 'check', runId, deadline, branches }`, it calls `checkBranch()` for each branch in the order given, with `deadline` and the clock `performance.timeOrigin + performance.now()`.
  - It posts `{ type: 'result', runId, check }` as each branch finishes, then `{ type: 'done', runId }`.
  - It holds no state between messages, logs nothing, and imports only `checks/` modules.
  - It types the worker's global scope with a minimal local interface, instead of adding the `WebWorker` library to `tsconfig.app.json`, which conflicts with `DOM` (research R15).
  - It is glue code, covered by lint, build and the quickstart, so it has no test file.
- [X] T027 [US1] Write `frontend/src/hooks/useRuleChecks.ts`: `useRuleChecks(branches, context, shownBranchKey): RuleChecks` (depends on T017, T025, T026; FR-010, FR-011; W14; research R10; contracts/rule-checks.md "useRuleChecks"). Local types go in `frontend/src/hooks/types.ts`, and helpers without React in `frontend/src/hooks/utils.ts`.
  - It starts once the catalog and the value sets are loaded, in the create and in the edit flow. In the edit flow, it checks the published rules when the rules step opens (W14).
  - After every change of `branches` or of `context`, including the documents step's (FR-011):
    - it builds each branch's checked tree on the main thread (`buildCheckedBranch()`), and dispatches the change to `runState`. It loads `checks/checkedTree.ts` with a dynamic `import()` when it starts, never statically: the checked tree reaches `checks/caseFolding.ts` through `literals.ts` and `text.ts`, so a static import would put the case-folding table in the main bundle (decision 2026-10-29, option 1 of the bundle review). Until the module has loaded, no branch counts as checked;
    - it sends the branches without a cached result to the worker, the shown branch first, then tab order.
    A change of `shownBranchKey` alone doesn't run the checks.
  - Today comes from `todayInGermany()`, read again every minute and when the page becomes visible (`visibilitychange`). A new day reruns the checks with the cause `'new_day'`.
  - The worker:
    - it is created with `new Worker(new URL('../utils/rules/checks/worker.ts', import.meta.url), { type: 'module' })`, one at a time;
    - a change during a run terminates it and starts a new one; the results already posted stay;
    - the `deadline` it receives is the change's time plus 4.5 seconds, and the watchdog terminates a worker without `done` 5.5 seconds after the change;
    - a worker that can't be created, or reports an error, is handled as T025 says;
    - it is terminated on unmount.
  - The hook never blocks rendering, and nothing waits for it (FR-010, FR-016).
  - Check that `npm run build` emits the worker as a chunk of its own under `dist/assets/`, and keeps the solver and the case-folding table out of the main bundle (research R10, R15).
- [X] T028 [P] [US1] Test that findings change nothing on the server (FR-016, FR-018; US1-AS7; SC-004). No application code changes.
  - In `backend/tests/api/test_form_connection_rules.py`: publishing, and then saving, a connection whose main branch no applicant can meet (the driving licence's "Nationality includes one of Germany" AND "… of Italy") is accepted like any other.
  - In `backend/tests/api/test_connect.py`: a completed request's pull answers the evaluation "not met" for that branch, in the shape of spec 002's integration contract, with nothing about findings.

### UI for User Story 1

- [X] T029 [P] [US1] Build `frontend/src/components/FindingNote/` (`index.tsx`, `types.ts`, `constants.ts`), the note under a rule or group header (depends on T002; S2; F4, F5; FR-012, FR-019; Figma U01 `6171:7010`, `6171:7024`, U04 `6178:8216`, in the layout of spec 002's `Rules/Problem note` `6110:3657`).
  - Redesign 2026-11-01: the look (coloured semibold text, 8 px gap) is superseded by A3; T057 reworks it.
  - Props: the note's `id`, the finding's `kind`, and its `text` from `noteOf()`.
  - Conflicting: KERN's warning colour and warning triangle icon. Redundant and always met: KERN's info colour and info icon. Use the icon classes and the text colours that T002 settled.
  - The icon is `aria-hidden`, since the text starts with the kind. Spec 002's `ProblemNote` stays as it is.
  - Visual check against the three nodes, listing F4's colours and icons and F5's kind prefix as prescribed differences.
- [X] T030 [US1] Give the shared `RuleRow` and `GroupFrame` an optional `finding` prop, in `frontend/src/components/RuleRow/` and `frontend/src/components/GroupFrame/` (`index.tsx`, `types.ts`, and `GroupHeader.tsx` as needed) (depends on T029; S2, S6; F4, F6; FR-012, FR-020; research R11; Figma U01 outlines `6171:7008`, `6171:7022`; U02 outline `6171:7487`, sub-group frame `6171:7091` and header `6171:7093`).
  - Redesign 2026-11-01: the outlines stay (A4); T057 verifies their values against the redesign.
  - `finding?: { kind, text }`:
    - the row, or the group, is outlined in the finding's colour, with the drawn outline's width and radius;
    - its `FindingNote` sits under the row, or under the group's header;
    - the row or the frame is described by the note (`aria-describedby` `${id}-finding`), as it is by a problem.
  - Spec 002's `flag` wins: a flagged rule shows its red outline and `ProblemNote`, and no finding (research R2; W11).
  - A branch mark ("Changed here", "New addition") shows beside a finding (US3-AS5).
  - The details (`frontend/src/pages/FormConnectionDetail/`) never pass `finding` (S6; FR-020).
  - Visual check of a conflicting rule and a conflicting sub-group, listing F4 and F6.
- [X] T031 [US1] Check the rules in the editor, and mark each rule and group in the Rules step (depends on T021, T027, T030; S2, S3, S7; F4, F5, F6, F8, W1, W2, W3, W5, W11, W14, W15; FR-002, FR-011, FR-012, FR-016; Figma U01 `6171:6749`, U02 `6171:7064`). Files: `frontend/src/pages/FormConnectionEditor/index.tsx`, `RulesStep/index.tsx`, `RulesStep/TreeItem.tsx`, `RulesStep/RuleListItem.tsx`, `RulesStep/GroupListItem.tsx` and `RulesStep/types.ts`.
  - The editor page calls `useRuleChecks(rules.branches, …, rules.openBranch)` once, with the requested documents (`requestedRuleDocuments()`) and the value sets, and passes `byBranch` to the Rules step.
  - Each item finds its `ItemFinding` by id, turns it into the note's text with `noteOf()` and the current names (FR-011), and passes it to `RuleRow` or `GroupFrame`. Items left out or removed get none.
  - The rule editor (`RulesStep/RuleEditor/`) shows nothing about findings, and the rule open in it counts as last saved (S3; W15).
  - "Publish" and "Save" in `EditorFooter.tsx` don't read the findings. Only spec 002's problems refuse them (F8; FR-016).
  - The edit flow's rules step shows the findings of the published rules when it opens (S7; W14; step headers U01 `6702:41182`, U02 `6702:41215`).
  - Verify W1: switching U01's connector `6171:6764` to OR removes both notes at once, and switching back brings them back.
  - Visual check, listing F4, F5, F6 and F8:
    - U01's notes `6171:7010` and `6171:7024`;
    - U02's notes `6171:7490` and `6171:7500`;
    - U02's Sub-group 01 `6171:7093`, with F6's note "Conflicting. Rule 04 and Rule 05 in this group can't be met together.".
- [X] T032 [US1] Build `RulesStep/FindingsSummary.tsx`, the summary above the rules (depends on T031; S2; F1, F2, F3, W5, W12, W13, W16; FR-004, FR-008, FR-010, FR-013; research R11; Figma U01 `6616:44378`, U02 `6616:44400`).
  - Redesign 2026-11-01: superseded by the findings banner (A1); T058 replaces this component.
  - It is a `KernAlert` where the alerts are drawn: `warning` when the branch has a conflict or no applicant can meet it, `info` otherwise. Its text comes from `summaryOf()`.
  - "Go to next finding" (KERN tertiary, F3):
    - each press scrolls the next rule or group with a finding, in display order (the order of `findings`, research R2), into view, and moves the focus to its row (`ELEMENT_IDS.rule()`) or group header. After the last one, it starts over;
    - check that the group header can take the focus (research R15). If the id sits on the frame only, add a header id to `ELEMENT_IDS` in `frontend/src/pages/FormConnectionEditor/constants.ts`;
    - the choice of the next target is a pure function in `RulesStep/utils.ts`, tested in `RulesStep/utils.test.ts`.
  - The button is left out when no rule or group has a finding, such as a summary with only a notice (W16).
  - After an incomplete check, it visits only the certain findings. FR-010's sentence stands alone in an info alert, without the button, when no finding is certain (W12).
  - There is no summary for a branch whose `checkedRules` is 0 (W13), or for a branch that hasn't been checked yet.
  - W5's notice "No applicant who shares today can meet the rules of Standard." goes in the warning alert.
  - Visual check of U01 `6616:44378` and U02 `6616:44400`, listing F1's wording, F2's colours and F3's button. Check F3's cycle in U01: Rule 01 `6171:6762` → Rule 02 `6171:6765`.
- [X] T033 [US1] Build `frontend/src/pages/FormConnectionEditor/FindingsAnnouncer.tsx`, the status region (depends on T027; S2; W1; FR-015; research R11).
  - It is one visually hidden (`sr-only`), polite `role="status"` region. The editor page renders it outside the steps, beside the toast in `WizardLayout`'s `overlay`, so that it outlives a change of step.
  - It shows `announcement`, with the sentences of one change together, and never takes the focus.
  - Check with a screen reader that causing and removing U01's conflict announces "Rule 02 conflicts with Rule 01." and "Rule 02 no longer conflicts with Rule 01.", while the focus stays where it was (quickstart V7).

**Checkpoint**: conflicts are marked, summarised and announced at every level. Validate with
quickstart V1, V2, V4's conflict rows, and V7's announcements. This is the MVP.

---

## Phase 3R: Redesign rework (2026-11-01)

**Purpose**: The Figma section `6171:6748` was redesigned after Phase 3: 11 frames (U01–U11), a
findings banner instead of the summary alert and "Go to next finding", notes without a kind label
in the default text colour, the tab icon merged with the description's (i), and new wording.
Decisions of 2026-11-01 (spec Clarifications): the redesign decides the findings' look, behaviour
and wording; the page around them stays as built (O1–O6); notes carry the kind only as the icon's
hidden text. This phase brings the built US1 UI in line before US2 builds on it.

**⚠️ Blocks** T035, T039 and every later UI task.

- [X] T055 Re-audit the redesigned section and re-plan (decisions 2026-11-01). Done in the session that found the redesign:
  - `figma-audit/report.md` and `units.md`: targeted delta audit, items A1–A8, O1–O6, W1–W15 and W17–W20; F1–F8 and W16 retired; the audit of 2026-10-28 moved to `figma-audit/archive-2026-10-28/`.
  - `spec.md`: Clarifications session 2026-11-01; FR-003, FR-005, FR-006, FR-008, FR-010, FR-012 to FR-015, FR-017 and the "Design" assumption updated.
  - `design-notes.md` §1–§6 rewritten in the redesign's voice, every undrawn text marked **Proposed**; §7 updated.
  - `contracts/ui-screens.md`, `contracts/rule-checks.md` (`bannerOf()`, `countsOf()`, `tabFindingsOf()`), research R11, R12, R14, `plan.md`, `data-model.md` and `quickstart.md` updated.
- [X] T056 [US1] Rework `checks/findingMessages.ts` for the redesign, with its tests, for conflicts, notices and the incomplete sentence (depends on T055; A1, A2, A3, A5, A7, W2, W3, W5, W12, W17, W18, W20; FR-003, FR-004, FR-008, FR-010, FR-012 to FR-015; design-notes.md §1–§5; contracts/rule-checks.md).
  - `noteOf()`: the texts of design-notes §2.1–§2.3, without the kind prefix: "Can’t be met together with Rule 02.", "… at the moment.", "Rule 04 and Rule 05 in this group can’t be met together.", "No applicant can meet this rule.", and the OR-group and one-member forms.
  - Add `kindTextOf(kind)` for the icons' hidden text: "Conflicting:", "Redundant:", "Always met:" (A3).
  - Replace `summaryOf()` with `bannerOf(check, branch, names)`, which returns the banner as data (contracts/rule-checks.md): its kind; its lines (design-notes §3.1), each with its icon's kind and its text as parts, plain text or `{ itemId, name }`; the counts row; the notice, as an item and as the appended sentence (§3.2); the incomplete sentence; `null` without a banner (W13).
    - Conflicts with equal sets share a line, and a set contained in the members a group's own conflict names goes on the group's line (§3.1): U01 one line, U05 "Sub-group 01: Rule 04 and Rule 05 can’t be met together.", EC-11 one line of four (W3).
    - Lines in display order of their first item; the notice, then the incomplete sentence, after them.
  - Add `countsOf(check)`: the counts row of §3.4, for conflicts here ("2 rules can’t be met together", "1 rule and 1 group can’t be met together", "1 rule can’t be met"); a group with the `members` reason isn't counted.
  - Add `tabFindingsOf(check, branch, names)` for the tooltip (§4): "1 conflict: <line>", or the counts row, then the notice. Keep `tabLabelOf()`.
  - `announcementOf()`: today's wording "at the moment" and "Right now, no applicant …" (§5); the other sentences stay.
  - Update the texts that `findingMessages.test.ts`, `scenarios.test.ts` (T022) and `announcements.test.ts` (T024) pin, and pin the drawn ones: U01 "Rule 01 and Rule 02 can’t be met together. So no applicant can meet the rules of Standard.", U05's line, U08 "Rule 01 and Rule 02 can’t be met together at the moment. Right now, no applicant can meet the rules of Standard.", the notes U01 `6171:7010`, U02 `6750:41000`, U08 `6753:41332`.
  - Remove `summaryOf()` and every text of the old voice ("Conflicting.", "nobody can meet both …", "who share today"). No text words a finding as something "to fix".
- [X] T057 [P] [US1] Restyle `frontend/src/components/FindingNote/` (`index.tsx`, `constants.ts`, `types.ts`) and verify the outlines of `RuleRow` and `GroupFrame` (depends on T055; S2; A3, A4, A5, W11, W19; FR-012, FR-019; Figma `Rules/Problem note` `6177:7837` (levels `conflicting`, `redundant`): U01 `6171:7010`/`6171:7008`, U02 `6171:7510`/`6171:7508`, U02 group note `6750:41000` in frame `6171:7091`, U08 `6753:41332`).
  - The note: the 20 px kind icon (KERN's `kern-icon--warning` in the warning colour; `kern-icon--info` in the colour `get_design_context` gives, drawn darker than the banner's), 4 px gap, then the text in body/small regular and `layout-text-default`; 24 px left, 8 px below. Drop the coloured, semibold text.
  - The icon gets a visually hidden kind text from `kindTextOf()` (T056), so that the note, the row's description, is read "Conflicting: Can’t be met together with Rule 02." (W19). The icon itself stays `aria-hidden`.
  - Outlines (A4): 1 px, radius 8, all round, warning or info; a group's in place of its left border. Fix any value that differs from the nodes.
  - Spec 002's `ProblemNote` (level `blocking`) stays as it is (W11).
  - Visual check of the five nodes, listing O2 (rule row restyle) and O6 (Revamp values) as page design.
- [X] T058 [US1] Replace `RulesStep/FindingsSummary.tsx` with `RulesStep/FindingsBanner.tsx`, with `FindingsBannerLine.tsx` for each line and `FindingLink.tsx` for each name (depends on T056; S2, S7; A1, A2, A7, W1, W12, W13, W14, W17, W19; FR-010, FR-013; Figma `Rules/Findings banner` `6750:40865`, `Rules/Finding item` `6750:40604`: U01 `6750:40882`, U02 `6750:40933`, U05 `6753:40144`, U08 `6753:41324`).
  - Draw what `bannerOf()` returns (no text is built in the component): kind (warning or info background and 1 px border, radius 8, padding 8 with 16 on the left), body/small text in `layout-text-default`, no title; inside the rules card, at the top, below `LinkStrip` and `UnrequestedBanner`, where `FindingsSummary` sits.
  - States (design-notes §3.3): single (no chevron); collapsed (counts row, chevron) by default with two or more lines; expanded (one item per line with its 20 px kind icon and hidden kind text, then the notice and the incomplete sentence without a link).
  - The chevron is a button with `aria-expanded`, named "Show findings" / "Hide findings" (constants in `RulesStep/constants.ts`), with the project's `expand-less.svg` / `expand-more.svg` if they match the MCP's `icon-expand_less-small`, otherwise the MCP asset. Whether a variant's banner is expanded is kept per variant while the editor is open (in the rules step's reducer or the banner's parent), never stored.
  - `FindingLink`: a link-styled button (`action-default`, underlined) that scrolls its rule or group into view and moves the focus to its row (`ELEMENT_IDS.rule()`) or group header, as `FindingsSummary`'s `goToNextFinding()` did. Only items with a row on the screen are links; the rule open in the rule editor stays plain text.
  - Remove `FindingsSummary.tsx`, `RULES_COPY.goToNextFinding`, `WITHOUT_ALERT_ROLE` if unused, and `nextFindingTarget()` with its tests; rename `summaryVariantOf()` to the banner's kind, or replace it with `bannerOf()`'s kind, in `RulesStep/utils.ts` and `utils.test.ts`.
  - No banner before the first check or for a variant without checked rules (W13). The banner isn't a live region: the status region announces the changes (FR-015).
  - Verify W1: switching U01's connector `6171:6764` to OR removes both notes and the banner at once. Verify W14: the edit flow's rules step shows the banner of the published rules when it opens.
  - Visual check of the four banners, single, collapsed and expanded, listing O1, O2 and O6. Check the links' focus targets in U01 (Rule 01 `6171:6762`, Rule 02 `6171:6765`) and U05 (Sub-group 01's header `6753:40164`, Rule 04, Rule 05, Rule 06).

**Checkpoint**: the US1 UI matches the redesign. Validate with quickstart V1, V2, V4's conflict rows
and V7, and the gates (`npm run lint`, `npm test`, `npm run build`).

---

## Phase 4: User Story 2 - See rules that make no difference (Priority: P2)

**Goal**: The rules step also marks every rule and group that is redundant or always met, names the
items that make it so, shows these findings less prominently than conflicts, and reports a branch
that every applicant meets.

**Independent Test**: Build the rules of US2-AS1 to AS6 (quickstart V3, and V4's redundancy rows),
and check the marks and their explanations. Then delete every item marked redundant, and check
that the branch's notice and always-met marks stay as they were (US2-AS7; `oracle.test.ts` proves
that no outcome changes).

### Logic for User Story 2 (with Vitest)

- [X] T034 [US2] Add research R8's steps 3 and 4 to `checks/findings.ts`, with tests in `findings.test.ts` (depends on T020; FR-005, FR-006, FR-008; research R4, R8; data-model.md "Findings").
  - Step 3 runs only when step 1 found the branch meetable and the branch has a checked rule. The branch gets the notice `all_meet` when no applicant fails to meet it on any day from today to 9999-12-31.
  - Step 4 visits the items from the last in display order to the first, each group before its members (reverse post-order), and skips conflicting items and what is inside them:
    - an item that no applicant fails to meet, on any day from today on, is `always_met`, also in a level combined with OR, and its members are skipped;
    - otherwise, it is `redundant` when no applicant meets `pivotal(X) ∧ ¬X` (in a level combined with AND) or `pivotal(X) ∧ X` (with OR) on any day from today on, in the **working tree**: the branch without the items already found redundant;
    - a redundant item is deleted from the working tree, and its members are skipped. Otherwise, its members are visited. Always-met items stay in the working tree;
    - the top level's only item is redundant only when it is always met, which is reported instead (research R4).
  - The reasons are smallest sets in the working tree:
    - in an AND level, the smallest S ⊆ A(X) with S ⇒ X (`implied_by`);
    - in an OR level, the smallest R among X's siblings with X ⇒ ⋁R (`implies`);
    - `same` when S or R is one item Y, and X and Y imply each other;
    - otherwise, through an enclosing level, with `orItems` or `givenItems`.
  - No redundant or always-met finding is reported (FR-005; W4):
    - in a branch that no applicant can meet;
    - on a conflicting item or inside one;
    - inside a redundant or always-met group;
    - for an item, or inside an item, whose conflict question came back `'unknown'` (step 5).
  - `findings.test.ts` checks data-model.md's invariants on every result: "1. At most one finding per item. 2. With `notice.kind === 'none_can_meet'`, there are only `conflicting` findings (FR-005, W4). 3. No finding inside a `redundant` or `always_met` group. No `redundant` or `always_met` finding on a conflicting item or inside one (FR-005)." It also covers each reason type.
- [X] T035 [P] [US2] Add the texts of redundant and always-met findings to `checks/findingMessages.ts`, with tests in `findingMessages.test.ts` (depends on T056; FR-005, FR-006, FR-015, FR-019; A2, A3, A5, W6, W7, W8, W20; design-notes.md §2.4, §2.5, §3, §4).
  - Notes (§2.4, §2.5): "Same as <item>. You can delete one of them."; "Anyone who meets <items> also meets this rule. You can delete the rule." and "… this group. You can delete the group."; "Anyone who meets this rule also meets <items>. You can delete the rule."; the reasons through an enclosing level; "Every applicant meets this rule." and "… this group.".
  - Banner lines (§3.1): "<item> is the same as <y>.", "Anyone who meets <items> also meets <item>.", the OR and enclosing-level forms, "Every applicant meets <item>, so it doesn’t check anything."; the notice "Every applicant meets the rules of <branch>." (§3.2).
  - Counts (§3.4): "1 duplicate rule", "1 rule already covered", "1 group every applicant meets", after the conflicts, joined with " · ".
  - Tooltip (§4): "1 duplicate: <line>", "1 finding: <line>".
  - Announcements: "Rule 06 is the same as Rule 03.", "Rule 01 makes no difference beside Rule 02.", "Every applicant meets Rule 05.", "Rule 06 is no longer redundant.", "Rule 05 is no longer always met.".
  - Tests pin the drawn texts: U02 counts row "2 rules can’t be met together · 1 duplicate rule"; U04 "Rule 06 is the same as Rule 03." and note `6178:8216` "Same as Rule 03. You can delete one of them."; U06 "Every applicant meets Group 01, so it doesn’t check anything." and `6753:40824`; U07 "Anyone who meets Rule 01 also meets Group 01." and `6753:41298` "Anyone who meets Rule 01 also meets this group. You can delete the group."; U11 "1 duplicate: Rule 06 is the same as Rule 03.".
- [X] T036 [US2] Add the redundancy scenarios to `checks/scenarios.test.ts` (depends on T034, T035).
  - US2-AS1 to AS6, each with its note.
  - US2-AS3 through `tree.ts`' `duplicateRule()`, and then a changed value.
  - US2-AS7: delete every redundant item, and compare outcomes with `testOracle.ts`.
  - EC "Letter case": both ignoring letter case, the later rule is `same`; the first respecting it and the second ignoring it, the second is redundant.
  - "contains straße" and "contains STRASSE" (`same`); "is equal to Stuttgart" makes "contains Stutt" redundant.
  - EC "Years and months".
  - EC-7's second example: "before 1 Jan 2010" next to "at least 18 years old" gives no finding.
  - EC "An enum rule with every value": "includes one of" every value is always met.
  - EC "Duplicates and copies"; EC "Rules that are redundant only because of each other" (only the later one is reported).
  - EC-20 (W4): no redundant finding while the branch can't be met, and the duplicate's note once the conflict is gone.
  - EC "A branch without rules": no notice.
  - Quickstart V3, and V4's redundancy rows.
- [X] T037 [P] [US2] Complete `checks/oracle.test.ts`, over at least 5,000 seeded branches (depends on T023, T034; SC-001, SC-002; research R13). Assert that:
  - every reported finding holds: an always-met item is met by every applicant on every day of the window; a redundant item, deleted from the working tree, changes no outcome; the `all_meet` notice holds;
  - with `complete` true, every always-met item and every notice is reported;
  - deleting every item reported redundant at once changes no outcome for any applicant on any day of the window (SC-002; data-model.md invariant 4);
  - every item not reported as redundant changes an outcome in the working tree (invariant 5).
  Keep the run within what `npm test` can afford. Lower the number of seeds only if it can't, and say so in the file.
- [X] T038 [US2] Announce redundant and always-met findings in `checks/announcements.ts`, with tests in `announcements.test.ts` (depends on T024, T035; FR-015).
  - A redundant finding appearing (`same`: "is the same as"; other reasons: "makes no difference beside") or going.
  - An always-met finding appearing or going, and the notice `all_meet` appearing.
  - A finding that changes kind, such as a duplicate's once its conflict is gone, counts as one going and one appearing.

### UI for User Story 2

- [X] T039 [US2] Show redundant and always-met findings in the Rules step, in `RulesStep/` and `RulesStep/FindingsBanner.tsx` (depends on T035, T057, T058; S2; A1–A5, W4, W6, W7, W8, W17, W19; FR-005, FR-006, FR-013, FR-019; Figma U02 `6171:7508`/`6171:7510`; U04 `6750:41077`, `6178:8168`/`6178:8216`, Sub-group 01 `6178:7829` plain; U05 `6753:40144` (expanded), `6753:40184`/`6753:40187`; U06 `6753:40514`, Group 01 `6753:40525`/`6753:40527`, note `6753:40824`; U07 `6753:40851`, Group 01 `6753:40862`/`6753:40864`, note `6753:41298`).
  - Rule notes and outlines in the info look (A3, A4). A covered or always-met group gets the outline and the header note in the info look, and the rules inside it stay plain (A5; U06, U07).
  - The banner: info without a conflict (U04, U06, U07), warning with one, the duplicate's line in the expanded list with the info icon (U05); the notice "Every applicant meets the rules of Standard." without a link (W8).
  - The names in every line are links (A1): U05 Sub-group 01 `6753:40164`, Rule 04, Rule 05, Rule 06 `6753:40185`; U04 Rule 06 `6178:8168` and Rule 03; U07 Rule 01 and Group 01 `6753:40864`.
  - A variant that no applicant can meet shows only its conflicts (W4).
  - Visual check of U04, U06 and U07, and of U02's and U05's duplicate note, listing O2 and O6. The info look reads less prominently than the warning look (FR-019).

**Checkpoint**: every kind of finding is marked and summarised. Validate with quickstart V3 and V4.

---

## Phase 5: User Story 3 - Checks in every branch (Priority: P2)

**Goal**: Each branch is checked on its own, with the rules it inherits, changes and adds, and
each branch's tab shows whether the branch has findings, so that a conflict that a change to the
main branch causes in another branch is noticed.

**Independent Test**: Set up spec 002's "Passenger transport licence" with an "Ambulance" branch
based on the main branch. Cause a conflict in Ambulance by changing the main branch, and check
the marks in both branches and on their tabs (quickstart V5).

### Logic for User Story 3 (with Vitest)

- [X] T040 [P] [US3] Add the variants' scenarios to `checks/scenarios.test.ts` (depends on T036; FR-001; research R2). Each case builds its branches with `branches.ts` (`newBranch()`, `propagateMain()`, `removeItem()`, `restoreItem()`, `copyRule()`) and checks each branch on its own with `buildCheckedBranch()`.
  - US3-AS1: changing Standard's Rule 02 to "includes one of C" makes Rule 02 and Rule 05 conflicting in Ambulance, and Standard gets no conflict.
  - US3-AS2: a rule removed in Ambulance carries no finding there, and the findings it took part in leave Ambulance. Once restored, it is checked again.
  - US3-AS3: a branch that started empty is checked without Standard's rules.
  - US3-AS4: a conflict among inherited rules shows in both branches.
  - EC "Removed rules and dissolved groups": a dissolved group is checked as its remaining member.
  - EC "Duplicates and copies": a rule copied to another branch is checked with that branch's rules.
  - Two branches with the same rules: no finding compares them (FR-001).
  With this task, `scenarios.test.ts` covers every acceptance scenario and edge case that a rule set expresses, which completes `findings.ts`.
- [X] T041 [P] [US3] Word the variants' findings (depends on T025, T038; FR-014, FR-015; research R12, item 6), with tests beside each module.
  - `checks/findingMessages.ts`: `tabLabelOf()` and `tabFindingsOf()` for any variant ("Ambulance has findings"; U10's segment "2 rules can’t be met together · 1 duplicate rule"). The banner says no "in this variant" (U03 `6750:41008`).
  - `checks/announcements.ts`: the findings of a branch other than the one shown use design-notes.md's wording ("In Ambulance: Rule 02 conflicts with Rule 05."), so that a change to Standard that causes a conflict in Ambulance is announced.
  - `checks/runState.test.ts`:
    - a change to Standard reruns the based branches whose fingerprints change;
    - a new variant is checked, and a deleted one leaves `byBranch`;
    - the shown branch is sent first.

### UI for User Story 3

- [X] T042 [US3] Show on each variant tab whether its branch has findings, merged with the description's (i), in `RulesStep/BranchTab.tsx`, `RulesStep/BranchTabs.tsx` and `frontend/src/components/BranchName/` (`index.tsx`, `types.ts`, `constants.ts`), with the tooltip's findings segment in a new `frontend/src/components/BranchName/FindingsSegment.tsx` (depends on T027, T041; S4; A6, W9, W12, W13, W19, W20; FR-014; Figma U01 `6171:6755`, U03 `6171:7541`/`6171:7542`, U09 `6753:41605`/`6753:41694`, U10 `6758:43059`/`6758:43060` and tooltip `6758:43524`, U11 `6758:43549` and tooltip `6758:43967`; `Rules/Tooltip` `6139:3739`).
  - `BranchName` takes an optional `findings` (the icon's kind and `tabFindingsOf()`'s segment). With findings, its (i) becomes the findings icon: KERN's warning icon when the branch has a conflict or no applicant can meet it, the info icon otherwise ("ⓘ stays", U11). Without findings, it is spec 002's (i), shown only with a description. The details never pass `findings` (S6; FR-020).
  - The icon's accessible name is `tabLabelOf()` ("Standard has findings") with findings, spec 002's "About Standard" otherwise. On hover and keyboard focus, the tooltip (`InfoTooltip`, as `Rules/Tooltip` draws it) shows the description, if any, then a divider and the findings segment with its kind icon (W20).
  - Every tab whose branch has findings shows the icon, selected or not (U09). Only certain findings count (W12). A branch without checked rules shows none (W13).
  - The ⋯ menu keeps its place.
  - Visual check of the tabs and both tooltips, listing O5 (tab styling) and O6. U03's "Standard" `6171:7541` shows only its description's (i), if any.
- [X] T043 [US3] Check the variants' findings in the Rules step, in `RulesStep/` (depends on T039, T042; S2, S4; A1–A6, W9, O3, O4; FR-001, FR-012; US3-AS2, AS4, AS5; Figma U03 `6171:7535`: tabs `6171:7541`/`6171:7542`, link strip `6344:60080`, banner `6750:41008`, Sub-group 01 `6171:7561`/`6171:7563` with note `6750:41069`, notes `6171:7960`, `6171:7968`, `6171:7983`; U10 `6758:43049`).
  - A rule removed in Ambulance shows spec 002's removed state and no note. It leaves Ambulance's banner lines, counts and tab icon, and restoring it brings them back (W9).
  - A conflict among inherited rules shows the same notes and banner in both tabs, and both tabs show the warning icon (W9).
  - A rule with "Changed here" and a finding shows both, told apart by the note's icon and text (US3-AS5). "Changed here" and "New addition" stay orange and purple as built (O3), although U03 draws "Changed here" purple and "Added here". Note `6171:7960` reads "Can’t be met together with Rule 05.".
  - The banner sits below the link strip (U03), whose copy stays as built (O4).
  - Visual check of U03, listing O3, O4, O2 and O6.

**Checkpoint**: every branch is checked, and every tab shows its findings. Validate with
quickstart V5.

---

## Phase 6: User Story 4 - See the findings before publishing (Priority: P3)

**Goal**: The publish and save dialog names every branch with findings, with its counts, and leads
back to the first of them, while "Publish" and "Save" go ahead as before.

**Independent Test**: Publish a connection with a conflict in one branch and a redundant rule in
another. Check the dialog's lines, "Check rules again", and that publishing succeeds (quickstart
V6).

- [X] T044 [US4] Add `dialogLineOf(check, branchName)` to `checks/findingMessages.ts`, with tests in `findingMessages.test.ts` (depends on T035; FR-017, FR-019; W10; design-notes.md §6). It runs after T041 when both are built, since both change this file.
  - "<branch>: <counts row>", with `countsOf()`: "Ambulance: 2 rules can’t be met together · 1 duplicate rule".
  - "No applicant can meet the rules of <branch>." for a branch that no applicant can meet, "Right now, no applicant can meet the rules of <branch>." when it applies today.
  - "Every applicant meets the rules of <branch>." for a branch whose only finding it is (design-notes §6).
  - Nothing for a branch without findings.
- [X] T045 [US4] List the findings in the publish and save dialog (depends on T031, T044; S5; A8, W10; FR-016, FR-017, FR-019; US4-AS1, AS2, AS4, AS5; Figma spec 002's dialog U33 `6376:25536` and its warnings line `6376:26181`). Files: `frontend/src/pages/FormConnectionEditor/PublishDialog.tsx`, a new `PublishFindingLine.tsx`, and `types.ts`, `utils.ts` and `utils.test.ts` beside them.
  - Spec 002 left the warnings line out (its F21), so the lines go below the dialog's summary (research R11).
  - One `PublishFindingLine` per branch with findings, in tab order, with `dialogLineOf()`'s text: in the warning style when the branch has a conflict or no applicant can meet it, in the info style otherwise (FR-019).
  - A pure `findingLinesOf(branches, byBranch)` in `utils.ts`, tested in `utils.test.ts`: tab order, only branches with certain findings, and the style of each line.
  - Without findings, the dialog is as in spec 002 (US4-AS4). "Publish" and "Save" stay enabled, and go ahead without a further question (A8; US4-AS5).
  - Visual check against U33's lines, listing W10.
- [X] T046 [US4] Make "Check rules again" open the first branch with findings, in `frontend/src/pages/FormConnectionEditor/index.tsx` and `utils.ts` (depends on T045; S5; W10; FR-017; US4-AS3; research R11).
  - `handleDialogCancel()` opens the rules step on the first branch, in tab order, that has findings, through the rules reducer's action that opens a branch, as `BranchTabs` dispatches it. Without findings, it keeps spec 002's behaviour.
  - The dialog's other secondary actions, "Add rules" without rules and "Reload" after `409 rules_changed`, stay as they are.
  - A pure `firstBranchWithFindings(branches, byBranch)` in `utils.ts`, tested in `utils.test.ts`.

**Checkpoint**: all four stories work. Validate with quickstart V6.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Performance budgets, documentation, accessibility, coverage of the Figma deviations,
validation on the running stack, and the merge gate.

- [X] T047 [P] Write `checks/performance.test.ts` (depends on T034; SC-003; research R13), with the real clock.
  - A generated 50-item branch is checked within 1 second after at least 95 % of a series of single-item changes.
  - A generated 200-item branch built to be hard returns by the deadline, checked completely or not.
  - 20 branches of 200 items stay within the run's 5 seconds when the deadline cuts them short.
  If a budget fails, speed up the solver or the searches (research R5, R8). Don't change the budget.
- [X] T048 [P] Update `docs/ARCHITECTURE.md` (CLAUDE.md "Documentation Checklist": architectural changes):
  - the checks run in the browser, in a module Web Worker that the editor starts;
  - findings are never stored, sent or logged;
  - the catalog's `multiple_values`;
  - the generated fixtures that keep the checks in step with `evaluation.py`.
- [X] T049 [P] Update `CLAUDE.md` (Documentation Checklist: new patterns):
  - the frontend structure: `src/utils/rules/checks/` (its modules, the worker's entry, the generated `caseFolding.ts` and `fixtures/`), `src/hooks/useRuleChecks.ts`, `src/components/FindingNote/`, the `finding` prop of `RuleRow` and `GroupFrame`, `RulesStep/FindingsBanner.tsx`, and the `findings` prop of `BranchName`;
  - the backend structure: `scripts/export_check_fixtures.py`, and `multiple_values` in `catalog.py`'s description;
  - the rules:
    - the checks judge conditions as `evaluation.py` does;
    - a change to the evaluator's comparisons, or a Python upgrade, comes with regenerated fixtures (`uv run python -m scripts.export_check_fixtures`), and their `--check` must pass;
    - the generated files are never edited by hand;
    - every finding text comes from `findingMessages.ts`;
    - findings stay in the rules step and the publish and save dialog;
  - the command table: the fixture script, and its `--check`.
- [X] T050 [P] Update `README.md`: the fixture script, when to run it (after a Python upgrade, or a change to the evaluator's comparisons), and its `--check`. No dependency or environment variable is added.
- [X] T051 Review accessibility (SC-006; quickstart V7; contracts/ui-screens.md "Accessibility"; W19; research R15) in `RulesStep/`, `frontend/src/components/FindingNote/`, `RuleRow/`, `GroupFrame/`, `BranchName/`, `FindingsAnnouncer.tsx` and `PublishDialog.tsx`:
  - the kind never rests on colour alone: the icons differ in shape, each note's and banner item's icon carries its hidden kind text, and the tab icon's accessible name says "<variant> has findings";
  - icons and outlines reach 3:1, texts 4.5:1, in KERN 2.8;
  - the banner's chevron is a button with `aria-expanded`, and each name link moves the focus to a row or group header that its note describes;
  - the tab's tooltip opens on keyboard focus as on hover;
  - the status region is polite and never takes the focus, and NVDA with Firefox and VoiceOver with Safari read announcements that follow each other quickly;
  - the banner, the notes, the tooltip and the dialog's lines reflow at 320 px and 200 % zoom.
  Fix every failure in the files concerned.
- [X] T052 Check the coverage of the Figma deviations (research R14) against `specs/003-rule-consistency-checks/contracts/ui-screens.md`:
  - every item of its "Coverage index" (A1–A8, W1–W15, W17–W20) was built by the tasks that cite it, and no task built anything from O1–O6;
  - every visual-verification table lists the page-design differences (O1–O5) and the "KERN 2.8 vs Revamp" values (O6), with their item numbers;
  - record what is unresolved, and why, in `specs/003-rule-consistency-checks/design-notes.md`.
- [ ] T053 Validate on the running stack: quickstart.md V1 to V8. V6 needs EUDIPLO and a test wallet (`uv run python -m scripts.issue_test_credentials`). Include research R15's remaining checks:
  - EUDIPLO's mdoc decoding delivers `height`, `weight`, `age_in_years` and `age_birth_year` as integers (research R3);
  - the production image (`docker compose up`) serves the worker's chunk under nginx's immutable cache rule.
  Record the results in the pull request.
- [ ] T054 Run the merge gate:
  - backend: `uv run ruff check .`, `uv run ruff format --check .`, `uv run mypy app/ scripts/ tests/`, `uv run python -m scripts.export_check_fixtures --check`, and `uv run pytest` with a `DATABASE_URL` whose database name ends in `_test`;
  - frontend: `npm run lint`, `npm test`, `npm run build` (with the worker's chunk under `dist/assets/`) and `npm run format:check`;
  - the pull request describes the manual checks that the gates can't make (constitution, "Development Workflow and Quality Gates"): V1, V2 and V7 for US1; V3 and V4 for US2; V5 for US3; V6 for US4; and V8. T053 records the full run.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies, so it starts at once.
  - T001 and T002 need the Figma file. T002 follows T001, because both write design-notes.md.
  - Neither blocks Foundational. T021 needs T001, and T029 needs T002.
- **Foundational (Phase 2)**: blocks every user story.
  - Backend: T003 → T004 → T005 (T005 is the frontend mirror, in the same change set as T004). T006 → T007.
  - Engine:
    - T008 can start at once;
    - T009, T010, T011 and T012 follow T007 and T008;
    - T013 follows T009, and T014 follows T010;
    - T015 follows T009 and T010;
    - T016 follows T005, T009 and T010;
    - T017 → T018 (which also needs T015) → T019 (which also needs T011–T014 and T016).
- **User stories (Phases 3–6)**: depend on Foundational, and on each other as described below.
- **Redesign rework (Phase 3R)**: follows US1 (Phase 3) and blocks US2 to US4's UI tasks.
  - T056 first; T057 alongside it ([P]); T058 after T056.
  - T035 needs T056; T039 needs T035, T057 and T058; T042 needs T041 (and so T056).
- **Polish (Phase 7)**:
  - T047 can start once T034 is done;
  - T048–T050 can start once the stories they describe are done;
  - T051–T053 depend on every story being delivered;
  - T054 runs before every merge.

### User Story Dependencies

- **US1 (P1)**: starts after Foundational, and depends on no other story. It is the MVP.
- **US2 (P2)**: starts after US1 and Phase 3R. Step 4 of `findings.ts` skips the conflicts of step 2 (T020), and
  its UI extends US1's notes and summary (T031, T032).
- **US3 (P2)**: starts after US2.
  - Its checked trees already follow `effectiveItems()` (T017), so it adds scenarios, wording and
    the tabs.
  - U03 draws a redundancy note too (T043 needs T039).
  - Its conflict-only parts (T040's conflict cases, T042) could follow US1 directly.
- **US4 (P3)**: starts after US2, since the dialog's lines count every kind (T044 needs T035). It
  can run alongside US3, except that T041 and T044 both change `findingMessages.ts`.

### Within Each User Story

- Pure modules with their tests → worker and hook → shared components → screens.
- `findings.ts` is complete only with T020, T034, the scenarios (T022, T036, T040) and the oracle
  (T023, T037).
- Tasks that touch the same file run in order:
  - `checks/findings.ts` and `findings.test.ts`: T020, T034;
  - `checks/findingMessages.ts` and its test: T021, T056, T035, T041, T044;
  - `checks/announcements.ts` and its test: T024, T056 (texts only), T038, T041;
  - `checks/runState.ts` and its test: T025, T041;
  - `checks/scenarios.test.ts`: T022, T056 (texts only), T036, T040;
  - `checks/oracle.test.ts`: T023, T037;
  - `frontend/src/pages/FormConnectionEditor/index.tsx`: T031, T033, T046;
  - `frontend/src/pages/FormConnectionEditor/utils.ts` and `utils.test.ts`: T045, T046;
  - `frontend/src/pages/FormConnectionEditor/constants.ts`: T032;
  - `RulesStep/` (`index.tsx`, `TreeItem.tsx`, `RuleListItem.tsx`, `GroupListItem.tsx`, `FindingsSummary.tsx` then `FindingsBanner.tsx`, `constants.ts`, `types.ts`, `utils.ts`): T031, T032, T058, T039, T043;
  - `RulesStep/BranchTab.tsx`, `BranchTabs.tsx` and `frontend/src/components/BranchName/`: T042;
  - `frontend/src/components/RuleRow/` and `GroupFrame/`: T030, T057 (verify only);
  - `frontend/src/components/FindingNote/`: T029, T057;
  - `frontend/src/utils/rules/testData.ts`: T005;
  - `frontend/.prettierignore`: T006;
  - `backend/tests/api/test_form_connections.py`: T004;
  - `backend/tests/api/test_form_connection_rules.py` and `test_connect.py`: T028;
  - `specs/003-rule-consistency-checks/design-notes.md`: T001, T002, T055, T052.

### Parallel Opportunities

- **Setup**: T001 alongside Foundational's T003, T006 and T008.
- **Foundational**:
  - T003, T006 and T008 together;
  - T009–T012 together once T007 and T008 are done;
  - T013–T016 together once T009 and T010 are done (T016 also needs T005).
- **US1**:
  - T021 alongside T020;
  - T022 and T023 together once T020 is done;
  - T026 alongside T024 and T025;
  - T028 and T029 at any time in the phase (T029 needs T002).
- **Phase 3R**: T057 alongside T056.
- **US2**: T034 alongside Phase 3R (it touches only `findings.ts`); T035 after T056; T036 and T037 together.
- **US3**: T040 and T041 together.
- **US4**: T044 alongside US3's T040 and T042.
- **Polish**: T047–T050 together.

---

## Parallel Example: Foundational

```bash
# Backend, fixtures and shapes at the same time:
Task: "Add multiple_values to backend/app/catalog.py (T003)"
Task: "Write backend/scripts/export_check_fixtures.py (T006)"
Task: "Write checks/types.ts and checks/constants.ts (T008)"

# Once T007 and T008 are done:
Task: "Write checks/calendar.ts with calendar.test.ts (T009)"
Task: "Write checks/text.ts with text.test.ts (T010)"
Task: "Write checks/numberTheory.ts with numberTheory.test.ts (T011)"
Task: "Write checks/enumTheory.ts with enumTheory.test.ts (T012)"
```

## Parallel Example: User Story 1

```bash
Task: "Write checks/findings.ts: conflicts and the unmeetable branch (T020)"
Task: "Write checks/findingMessages.ts: the texts of conflicts (T021)"
Task: "Test that findings change nothing on the server (T028)"
Task: "Build frontend/src/components/FindingNote/ (T029)"

# Once T020 is done:
Task: "Write checks/scenarios.test.ts with the conflicts (T022)"
Task: "Write checks/oracle.test.ts for conflicts (T023)"
Task: "Write checks/worker.ts (T026)"
```

## Parallel Example: User Story 2

```bash
Task: "Add steps 3 and 4 to checks/findings.ts (T034)"
Task: "Add the texts of redundant and always-met findings to checks/findingMessages.ts (T035)"

# Once T034 and T035 are done:
Task: "Add the redundancy scenarios to checks/scenarios.test.ts (T036)"
Task: "Complete checks/oracle.test.ts over 5,000 seeds (T037)"
```

## Parallel Example: User Story 3

```bash
Task: "Add the variants' scenarios to checks/scenarios.test.ts (T040)"
Task: "Word the variants' findings in findingMessages, announcements and runState (T041)"
```

## Parallel Example: User Story 4

```bash
# After T041, which also changes findingMessages.ts:
Task: "Add dialogLineOf to checks/findingMessages.ts (T044)"
# Then, in order:
Task: "List the findings in the publish and save dialog (T045)"
Task: "Make Check rules again open the first branch with findings (T046)"
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Complete Phase 1, Setup: the design notes and the tokens.
2. Complete Phase 2, Foundational. **Validate**: `npm test` (the solver against the oracle),
   `--check`, and `GET /api/document-types` with `multiple_values`.
3. Complete Phase 3, US1, and Phase 3R, the redesign rework. **Validate** with quickstart V1, V2,
   V4's conflict rows, and V7.
4. Run the merge gate (T054) and merge. Team members now see the rules that no applicant can meet.

### Incremental Delivery

Merge at least at the end of each step, after the merge gate (T054):

1. Setup + Foundational: the engine and the catalog attribute. Nothing visible changes in the UI.
2. + US1 and Phase 3R: conflicts, the unmeetable branch, the findings banner and the announcements.
   **This is the MVP.**
3. + US2: redundant and always-met findings, and the branch that every applicant meets.
4. + US3: the variants' scenarios, wording and tab icons. `findings.ts` is complete.
5. + US4: the publish and save dialog's lines, and "Check rules again".
6. Polish: performance budgets, documentation, accessibility, the coverage check, and validation
   on the running stack.

### Parallel Team Strategy

- Developer A takes the backend and the fixtures: T003–T007 and T028, then T048–T050.
- Developer B takes the engine and the findings: T008–T027 and T034–T038, then T040, T041, T044
  and T047.
- Developer C takes the UI: T001 and T002, then T029 and T030 early, then T031–T033, T057, T058,
  T039, T042–T043, T045–T046 and T051–T052. Developer B takes T056.
- The UI can be built against hand-made `BranchCheck` results before the engine is done, but it
  can be checked end to end only once T027 is in.

---

## Notes

- [P] tasks touch different files and depend on no unfinished task in the same phase.
- The [Story] label maps a task to its user story.
- Every UI task cites its screen and its A#, W# and O# items. Every item of the coverage index
  (A1–A8, W1–W15, W17–W20) is cited by at least one open or reworked task, and T052 checks that it
  was built. Tasks completed before 2026-11-01 cite the retired F1–F8 and W16.
- Research R15's points to verify are assigned to tasks:
  - KERN's warning icon and text contrast: T002 and T051;
  - the worker's global scope: T026;
  - the number fields' delivered type: T053;
  - the worker's chunk: T027 and T053;
    - the group header's focus target: T032, T058;
  - quickly following announcements: T051.
- **Not tasks, because people run them**: the usability sessions of quickstart V8 (SC-005), with
  five DO.IT participants.
- Commit after each task or logical group, and stop at any checkpoint to validate a story. This
  checkout's `.git` points to a worktree path that doesn't exist here (plan.md "Note"), so fix the
  checkout before committing.
