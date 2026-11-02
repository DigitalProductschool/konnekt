# Research: Conflict and Redundancy Checks for Rules

**Phase 0 output of `/speckit-plan`** | **Date**: 2026-10-28 | **Spec**: [spec.md](spec.md)

This file records each technical decision behind the plan, with the reason for it and the
alternatives that were weighed. It builds on spec 002's research
([../002-connection-rules/research.md](../002-connection-rules/research.md)), whose decisions
R1–R14 still apply; "002-R7" below means spec 002's R7.

**Sources**: the spec and its 15 Clarifications of 2026-10-28, the Figma audit
([figma-audit/report.md](figma-audit/report.md); items F1–F8 and W1–W16 of 2026-10-28, revised on
2026-11-01 for the redesign to A1–A8, O1–O6 and W1–W20), the code on this branch
(`frontend/src/utils/rules/`, `backend/app/services/evaluation.py`, `backend/app/catalog.py`), and
measurements taken while planning with the backend's interpreter (Python 3.13.5, Unicode 15.1.0)
and Node 20.19.2 (ICU 76.1, Unicode 16.0). Points to confirm while coding are marked **Verify at
implementation** and collected in R15.

**Who decides what** (revised 2026-11-01): spec.md, with its Clarifications, decides what is a
finding. The redesigned Figma section (file `s8mU9oJDq3411e8bxMjQO9`, section `6171:6748`) decides
the findings' look, behaviour and wording, and the page around them stays as built. The audit's
items A1–A8, O1–O6 and W1–W20 say what to build, and
[contracts/ui-screens.md](contracts/ui-screens.md) lists them per screen (R14).

## Technical Context: open points and how they were resolved

| Open point | Resolved in |
|---|---|
| Where the checks run: browser or server, and on which thread | R1 |
| Which rules and groups of a branch are checked, and in which order | R2 |
| What the checks assume about applicants and values (FR-007, FR-009) | R3, R9 |
| How "conflicting", "redundant" and "always met" become questions a program can answer exactly | R4 |
| How those questions are answered, within 5 seconds (FR-010, SC-003) | R5, R6, R10 |
| How text is compared exactly as the evaluation compares it (FR-007, EC "Letter case") | R7 |
| Which items are reported, with which reasons, so that deleting all redundant items is safe (FR-005, SC-002) | R8 |
| Which fields hold several values, and where that is declared | R9 |
| When the checks run, how results reach the UI, and what happens on a timeout | R10 |
| How findings are shown, announced and summarised | R11, R12 |
| How it is tested to SC-001's "100 % found, 0 untrue" | R13 |
| How the Figma deviations reach the tasks | R14 |
| What still needs a check at implementation | R15 |

No open point blocks the plan.

---

## R1. The checks run in the browser, in a Web Worker

**Decision**: the checks are pure TypeScript modules in `frontend/src/utils/rules/checks/`. The
editor runs them off the main thread in one dedicated module Web Worker. There is no new API
endpoint, and the server never sees a finding.

**Rationale**:
- The input lives in the browser. The rules being created or edited aren't saved until "Publish"
  or "Save", and the branches' propagation from the main branch is computed there
  (`utils/rules/branches.ts`, 002-R4). The checks must follow every change, documents step
  included (FR-011). A round trip per change would only move the work further from its input.
- Findings must not be stored, delivered or logged (FR-018, FR-019) and are only for the signed-in
  team member's rules step and dialog (FR-020). Keeping them inside the tab makes that hold by
  construction.
- Editing must never wait for the checks, which may take up to 5 seconds (FR-010, SC-003). A
  worker keeps the editor responsive, and the main thread can stop a worker that runs too long.
- The checks have to be exactly right (SC-001: every item found, no untrue finding). Pure logic
  in `src/` is tested by Vitest, which is a gate (constitution III); backend tests aren't.
- There is precedent: `utils/rules/dates.ts` already mirrors the evaluator's calendar for the
  rule editor's example, and `validation.ts` uses the server's messages word for word.

The cost is parity: the browser must judge conditions exactly as `evaluation.py` does (FR-007).
R6, R7 and R13 handle it: the same arithmetic, a case-folding table generated from Python, and
test vectors that Python produces and the frontend tests replay.

**Alternatives considered**:
- *A backend endpoint (`POST /api/rule-checks`)* that reuses the evaluator's helpers: parity
  comes free. But every change would send the whole unsaved snapshot, and a search of up to
  5 seconds of CPU would run inside the API process, whose threads share the interpreter lock with
  the pull path and the background worker (spec 001's delivery delay, SC-004). A sync handler
  can't cancel a check that a newer change has made pointless. The UI would gain a network-failure
  state, and the tests that matter most would not be a gate. Rejected.
- *The main thread*: a 200-item branch could block typing and clicking for seconds, against FR-010
  ("Editing … MUST NOT wait"). Rejected.
- *Several workers in parallel*: faster for many large branches, but more lifecycle code for a
  case that real forms don't have (a few branches of a few dozen rules). R10 orders the work
  instead. Rejected for now.

## R2. What is checked: each branch's checked tree

**Decision**: `buildCheckedBranch` (`checks/checkedTree.ts`) derives, for each branch, the
spec's "checked rules":
- **The items that count**: `effectiveItems()` of `utils/rules/tree.ts`, the frontend's mirror of
  the evaluator's `effective_items()`. Removed rules and groups are left out with everything in
  them. An inherited group dissolved in a based branch is replaced by its remaining member, in
  its place (FR-001, EC "Removed rules and dissolved groups").
- **Rules left out** (FR-002, EC "Rules with problems", W11): a rule without a target, with a
  target that isn't among the requested documents' fields (`checksUnrequestedData`,
  `resolveTarget` against `requestedRuleDocuments`), or with an incomplete condition (`isComplete`
  with the field's value set). A missing error message doesn't matter. The rule open in the rule
  editor counts as it was last saved, and a new one isn't in the branch's items until it is added,
  so drafts are never checked (FR-002, EC "The rule being edited", W15).
- **A group left with one checked member** is checked as that member and carries no finding of
  its own; a group left with none is left out. This is what the evaluation does with a group of
  fewer than two members (002 data-model, "Dissolution"). It lasts only while the rule left out
  has a spec 002 problem, which refuses publishing anyway.
- **Display order**: the order of `shownItems()`. For the items that count it is their
  `effectiveItems()` order, so "later in the order shown" (FR-005) and the banner's lines
  (FR-013) need no second ordering.
- **A fingerprint**: a canonical serialisation of what the checks read. It covers the top level's
  AND or OR, each item's id, type, operator, target and condition in order, the kind, value set
  and cardinality (R9) of each field the rules use, and today's date. Names and messages aren't in
  it, because they change no finding. Notes take the current names when they are shown, so a
  rename shows at once without a new check (FR-011).

**Rationale**: reusing `effectiveItems()` and spec 002's validation predicates means the
evaluation, the rules step and the checks agree, by construction, on which rules count.

**Alternatives considered**: *checking rules that have problems as far as possible*: it would
show findings about rules that will change, against FR-002. *Marking the group of a rule left out*:
no basis in the spec. Both rejected.

## R3. The logic the checks reason in

**Decision**: each checked rule becomes a **literal** on one **variable**, as FR-007 and FR-009
describe applicants:
- **Variables**: one per target, meaning document type and field, plus the part, plus the licence
  class for a class's dates. Variables never constrain each other (FR-007, last bullet), with one
  exception. A rule on the issue or expiry date of class K is `held(K) ∧ c(date_K)`, where `held(K)`
  is "Licence classes includes one of K" (FR-007, fifth bullet). This matches the evaluator, which
  answers `not_met` for a class the licence doesn't list.
- **Applicants**: every variable has a value (FR-009), and a class's dates exist when the class is
  held. The values each kind can have:
  - **number**: whole numbers 0, 1, 2, … ISO/IEC 18013-5 encodes `height`, `weight`,
    `age_in_years` and `age_birth_year` as `uint` (spec Assumptions, "Values"). A rule's value may
    still have decimals: "is greater than 20.5" means "at least 21", "is equal to 20.5" can't be
    met, and "is not equal to 20.5" is always met.
  - **enum**: one value of its set, or a non-empty set of values for the fields the catalog marks
    as holding several (R9). Values compare as the evaluator compares them: codes as integers,
    texts case-folded (002-R7).
  - **text**: any text that isn't empty after the evaluator's normalisation (R7).
  - **date**: any calendar day from 0001-01-01 to 9999-12-31, the dates the evaluator can read.
  - **the day of sharing** d: a parameter of each question (R4).
- **A branch is a positive formula**: AND and OR over literals, with no NOT. Questions that need a
  negation (R4) negate an item by De Morgan, with each literal's complement: number ≤ and ≥ for >
  and <, text "is equal to" ↔ "is not equal to", "contains" ↔ "doesn't contain", enum "includes one
  of" ↔ "includes none of", a date literal's complementary set of days, and for a class's date
  `¬held(K) ∨ ¬c(date_K)`.

**Rationale**: for an applicant whose documents give every value, this is what the evaluator
computes, so no finding can contradict an evaluation (FR-007).

**Alternatives considered**: *all integers for the number fields*: then "Age in years is less than
0" could be met, though no licence can hold a negative `uint`. Rejected. **Verify at
implementation** that EUDIPLO delivers these elements as integers (R15).

## R4. The questions, in logic

For an item X, follow the path from X up to the top level: X, the group that holds X, the group
that holds that group, and so on. For each item Y on the path, Y's siblings join X's
**AND-context** A(X) when Y's level combines with AND, and its **OR-alternatives** O(X) when it
combines with OR. An applicant meets `pivotal(X) = ⋀A(X) ∧ ¬⋁O(X)` exactly when X decides
whether the branch's rules B are met.

| Finding | Question | Days |
|---|---|---|
| X **conflicting** (FR-003) | Is there a T ⊆ A(X) that can be met while T ∧ X can't? Equivalently: does X belong to a minimal set of A(X) ∪ {X} that can't be met? T = ∅ when X can't be met on its own. The reason is a smallest such T | today |
| Branch **no applicant can meet** (FR-004) | Can no applicant meet B? | today |
| X **always met** (FR-006) | Can no applicant fail to meet X (¬X)? | every day from today |
| Branch **every applicant meets** (FR-006) | Can no applicant fail to meet B (¬B)? The branch has at least one checked rule | every day from today |
| X **redundant** (FR-005), X in a level combined with AND | Can no applicant meet `pivotal(X) ∧ ¬X`? | every day from today |
| X **redundant**, X in a level combined with OR | Can no applicant meet `pivotal(X) ∧ X`? | every day from today |

- **Why the redundancy questions are exact**: B is monotone in X, and the tree holds each item
  once. So deleting X (TRUE in its AND level, FALSE in its OR level; a group left with one member
  is that member) changes B for exactly the applicants of the two questions. The only item of the
  top level is the exception: deleting it leaves no rules, which every applicant meets by
  definition. That item is redundant only when it is always met, which FR-006 reports instead.
- **FR-003's context is the AND-context only**: O(X) plays no part in conflicts. In a top level
  combined with OR, a group that can't be met conflicts on its own (US1-AS4). Its alternatives
  don't change that.
- **Day of sharing (FR-008)**: conflicts and the unmeetable branch are judged for today, the
  calendar date in Germany. Their text adds "by applicants who share today" ("who shares today"
  in the branch notice) when the same set can be met on a later day, the latest being 9999-12-31.
  Without those words, the finding holds on every day from today on. Redundant, always-met and
  every-applicant findings are only reported when they hold on every day from today on, so they
  never need the words, and acting on them never changes an outcome later.
- **Which findings may be reported** (FR-005, FR-006, EC-20, W4): no redundant or always-met
  finding in a branch that no applicant can meet. None for a conflicting item or anything inside
  it, and none for anything inside a redundant or always-met group.

**Rationale**: these are FR-003 to FR-008 written as satisfiability questions. A solver answers
them exactly (R5, R6), and the tests can confirm every answer by brute force (R13).

**Alternatives considered**: *pattern rules over pairs of rules on the same field*: simple, but
they miss conflicts through groups (US1-AS5), among four rules (EC-11), and between a class's
dates and the classes (US2-AS4), while FR-010 requires every item. Rejected.

## R5. A small solver for AND/OR trees of literals

**Decision**: `checks/solver.ts` answers `satisfiable(formula, days, clock)` with `'sat'`,
`'unsat'` or `'unknown'`:
- **Search**: a tableau (DPLL over the tree). It keeps the literals chosen so far, per variable,
  and adds the literals under each AND. It branches over the children of one OR at a time,
  starting with the OR that has the fewest children left. It drops a child that contradicts the
  literals already chosen, skips an OR that a chosen literal already satisfies, and backtracks on
  a contradiction.
- **Independent parts**: a conjunction is split into parts that share no variable, and each part
  is solved on its own. Over a range of days, every date variable with a condition counted from
  the day of sharing shares that day, so those variables stay in one part.
- **Theories**: after each step, each variable's literals are decided (R6, R7). Over a range of
  days, the variables' sets of feasible days are intersected.
- **`'unknown'`** when a theory can't decide (R7's corner) or the deadline passes (R10). It never
  turns into `'sat'` or `'unsat'`, so findings that depend on it aren't reported (R8).
- **Cache**: answers are memoised per run by formula and range of days. Explanation searches (R8)
  ask many overlapping questions.

**Rationale**: trees are at most three levels deep, with at most 200 rules and groups per branch
(spec 002, Assumptions). With independent parts and pruning by the theories, a question about a
realistic branch takes microseconds. The deadline bounds the pathological ones.

**Alternatives considered**: *a CDCL SAT solver over a Tseitin encoding*: more machinery than
trees of this size need. *An SMT solver compiled to WebAssembly* (such as z3): a large download
and a new dependency, for theories that R6 decides in a few lines each. *Binary decision
diagrams*: they grow quickly with many date thresholds. All rejected.

## R6. Deciding the literals of one variable

**Decision**: each kind has an exact decision procedure in its own module (`numberTheory.ts`,
`enumTheory.ts`, `dateTheory.ts`, `textTheory.ts` in R7):
- **Numbers**: an integer interval within [0, ∞) minus a finite set of excluded values. "Greater
  than c" sets the lower bound to ⌊c⌋ + 1, "less than c" the upper bound to ⌈c⌉ − 1, "equal to c"
  needs a whole number c, "not equal to c" excludes a whole number c. The literals can be met when
  the interval holds more values than it excludes.
- **Enums with one value**: the allowed values are the set, within every "includes one of",
  without every "includes none of". They can be met when one value is left.
- **Enums with several values** (R9): the applicant's values X lie in the set without every
  "includes none of", and meet every "includes one of" V. They can be met when each V keeps a
  value outside the "none of" values, and the set keeps at least one (X isn't empty).
- **Dates on one day d**: each literal is a set of days. "Before", "after" and "on" a date are
  strict comparisons. "At least N years ago" is v ≤ L_N(d), the latest date whose N-th
  anniversary falls on or before d; "less than" is v > L_N(d); "exactly" is
  L_{N+1}(d) < v ≤ L_N(d). "At least N years/months from now" is v ≥ A(d), which is
  `years_after(d, N)` or `months_after(d, N)`; "less than" is v < A(d). Negations take
  complements. The literals can be met when the intersection, a union of intervals, isn't empty.
  The arithmetic is the evaluator's: 29 February plus a year is 1 March, a month end without its
  day moves to the 1st of the next month, and years beyond 9999 are clamped to 9999-12-31 as
  `_calendar_day()` does. `dates.ts` doesn't clamp, so `checks/calendar.ts` reimplements the
  arithmetic on day numbers (proleptic Gregorian ordinals, as Python's `date.toordinal()`), and
  Python's vectors pin it (R13).
- **Dates over a range of days**: as d grows, the thresholds L_N(d) and A(d) never decrease, and
  two thresholds of the same variable keep their order. While planning, every date from
  0001-01-01 to 9999-12-31 was enumerated with the evaluator's functions for N = 1, 2 and 21:
  `months_after(d, 12N) = years_after(d, N)` on every day, and neither anniversaries nor
  `months_after(d, 1)` ever decrease. Different thresholds stay at least 28 days apart. So whether
  a variable's literals can be met changes only on a day where a threshold meets a fixed date of
  that variable or a calendar bound. The theory finds those days by binary search over d. It cuts
  the range at those days, decides one day in each piece, and returns the union of the pieces that
  can be met. A variable without conditions counted from the day of sharing can be met on every
  day or on none.

**Rationale**: every condition of spec 002 is an interval, a finite set or a substring test, and
each of these has an exact decision procedure. The day of sharing enters only through thresholds
that never decrease.

**Alternatives considered**: *trying some sample days* (today, in a year, in ten years): that
can't prove "every day from today on". Rejected.

## R7. Text exactly as the evaluator compares it

**Decision**:
- **Normalisation**: `normalisedText(text, matchCase)` in `checks/text.ts` reproduces
  `_normalised_text()`. It strips Python's whitespace (U+0009–U+000D, U+001C–U+001F, U+0020,
  U+0085, U+00A0, U+1680, U+2000–U+200A, U+2028, U+2029, U+202F, U+205F, U+3000) and normalises
  to NFC. Ignoring letter case, it then applies Python's `str.casefold()` and normalises to NFC
  again. JavaScript's `trim()` keeps U+001C–U+001F and U+0085, and strips U+FEFF, which Python
  keeps.
- **Python's case folding as a table**: `checks/caseFolding.ts` is generated by
  `backend/scripts/export_check_fixtures.py` from the interpreter's own `str.casefold()`
  (Unicode 15.1.0 in Python 3.13), compressed into ranges, and marked as generated. It is never
  edited by hand. Measured while planning: 1,530 code points fold to something else. JavaScript's
  nearest tool, `toUpperCase().toLowerCase()` (which `foldName()` uses for names), puts 59 code
  points into different classes than Python on Node 20 (ICU 76, Unicode 16.0). Among them is the
  capital ẞ (U+1E9E): Python folds it to "ss", JavaScript to "ß", so "STRAẞE" wouldn't equal
  "straße". The others include the dotless ı (U+0131) and the scripts new in Unicode 16.0.
  Even Python's own `lower()` differs from `casefold()` on 297 code points. Browsers' Unicode
  versions vary, so no built-in is a stable stand-in.
- **The text theory** works on the text as written and on its folded form. The literals are "is
  equal to", "is not equal to", "contains" and "doesn't contain", each in one of the two forms:
  1. A case-respecting "is equal to" fixes the value. Every literal is evaluated on it. This is
     exact.
  2. All literals ignore letter case, or all respect it, so the checks work in that one form. With
     an "is equal to", every literal is evaluated on its value. Without one, the literals can be
     met unless some "doesn't contain" text occurs inside a "contains" text. The witness is the
     "contains" texts joined by a separator that occurs in no "doesn't contain" text, varied to
     avoid every "is not equal to", and it is verified with the evaluator's comparison.
  3. Letter case is mixed. The candidate witnesses are the rules' texts, the folded value, and case
     variants (from the table's inverse) that avoid the occurrences of case-respecting "doesn't
     contain" texts. Each is verified exactly. The literals are refuted by the rules of point 2
     within each form, or by a case-respecting "doesn't contain" text without case variants that
     every candidate contains. Otherwise the answer is `'unknown'`.

  Every `'sat'` has a verified witness. Every `'unsat'` rests on a refutation that holds whatever
  the folding does. `'unknown'` arises only when one text field mixes letter-case settings with
  "contains" conditions. It marks the branch as not checked completely (FR-010's sentence), and
  no finding is guessed.
- **NFC** uses the browser's `normalize()`. It gives Python's result for every text whose
  characters Unicode 15.1 already assigns (Unicode's normalisation stability). Characters
  assigned later, such as the scripts new in 16.0, could compose differently. Accepted: they don't
  occur in the rule texts of German administrative forms.

**Rationale**: FR-007 and the edge case "Letter case" require the evaluation's comparison, and the
measurement shows that JavaScript's own tools differ on a letter German texts use.

**Alternatives considered**: *`toUpperCase().toLowerCase()`*: differs on ẞ. *An npm case-folding
package*: a dependency whose Unicode version needn't match Python's. *Unicode's
`CaseFolding.txt`*: matches the standard, not necessarily the interpreter the evaluator runs on,
while the generator reads the interpreter itself. *Comparing text on the server*: see R1. All
rejected.

## R8. Findings: which items, with which reasons

**Decision**: `checks/findings.ts` checks one branch in four steps. Each step builds only on
answers that are certain:
1. **Can the branch be met today?** If not, it gets FR-004's notice, with "who shares today" when
   a later day could meet it (R4).
2. **Conflicts** (FR-003), for every item, top-down. The candidates for T are the items of A(X)
   that share a variable with X, directly or through other candidates. Only they can take part in
   a minimal set. Items that can't be met on their own never join T, because T must be meetable.
   If all candidates together can be met, both without X and with it, X isn't conflicting.
   Otherwise the search tries sets T of growing size, ties going to the earlier items in display
   order. Past a budget of questions per item, it settles for a minimal set instead: it drops
   members as long as T ∧ X stays unmeetable. That set is still a true reason, though perhaps not
   the smallest. The reasons:
   - an item with T ≠ ∅: "Can't be met together with Rule 02 …", naming each item of T (EC-11, W3);
   - a group that can't be met on its own (T = ∅): its members that can't be met together, as a
     smallest set (AND group, A5); or its members, none of which can be met (OR group);
   - a rule that can't be met on its own: its condition (copy open, R12).
3. **Every applicant meets the branch?** (FR-006) Asked only when step 1 found the branch
   meetable.
4. **Always met and redundant** (FR-005, FR-006). The step visits the items from the last in
   display order to the first, each group before its members (reverse post-order). It skips
   conflicting items and what is inside them. An item that is always met gets that finding, and
   its members are skipped. Otherwise the step asks whether the item is redundant in the **working
   tree**: the branch without the items already found redundant. If so, it gets the finding, is
   deleted from the working tree, and its members are skipped. Otherwise its members are visited.
   So when items are redundant only because of each other, the later one is reported. And
   deleting every reported item at once changes no outcome (FR-005, SC-002), since each deletion
   keeps B unchanged given the deletions before it. Always-met items stay in the working tree.

   The reasons are smallest sets in the working tree:
   - **In a level combined with AND**: the smallest S ⊆ A(X) with S ⇒ X. That is "Anyone who
     meets Rule 02 also meets this rule." (US2-AS1, US2-AS4, US2-AS6, W6). If S = {Y} and also
     X ⇒ Y, the reason is "Same as Y" (US2-AS3, EC "Duplicates and copies", A3).
   - **In a level combined with OR**: the smallest R among X's siblings with X ⇒ ⋁R. That is
     "Anyone who meets this rule also meets Rule 01." (US2-AS2, W6), with "Same as" as above.
   - **When no such set exists**, the redundancy comes through an enclosing level, and the reason
     takes it in. In an OR level, it adds the AND-context: "Anyone who meets this rule and Rule 05
     also meets Rule 01." In an AND level, it adds the alternatives of an enclosing OR level:
     "Anyone who meets Rule 02 also meets this rule or Group 03." These cases are rare, and their
     wording isn't decided (R12).
5. **Certainty** (FR-010): an `'unknown'` answer, or the deadline, marks the branch as not checked
   completely. The findings made so far stay, because they are true. A later step runs only for
   items whose earlier answers are certain. For example, an item whose conflict question came
   back `'unknown'` gets no redundancy finding, and neither does anything inside it.

**Rationale**: the reverse order with a working tree is the simplest procedure for which FR-005's
"the later one" and SC-002's "deleting all at once changes nothing" hold by construction. The
smallest-set searches give the explanations FR-003 and FR-005 ask for.

**Alternatives considered**: *reporting every item that is redundant on its own*: deleting two
duplicates at once changes outcomes, against FR-005. *Choosing the largest set of items that can
be deleted together*: no basis in the spec, and costlier. Both rejected.

## R9. Which fields hold several values: from the catalog

**Decision**: `CatalogField` and `CatalogPart` in `backend/app/catalog.py` gain
`multiple_values: bool = False`. It is true for the Personal ID's `nationalities` and for the
`classes` part of the driving licence's `driving_privileges` (FR-007, third bullet). The
`DocumentField` and `FieldPart` schemas, and so `GET /api/document-types`, return it.
`frontend/src/types/document-types.ts` mirrors it in the same change (constitution I). The
evaluator doesn't need it, because it treats a single value as a list of one.

**Rationale**: the catalog is where a field's kind, value set and parts are declared, so a field
added later states its cardinality in the same place. A wrong value would make the checks report
false conflicts (one value assumed where several are possible) or miss real ones.

**Alternatives considered**: *a frontend set beside `NATIONALITY_FIELDS` in
`utils/rules/constants.ts`*: no API change, but a second list of field keys that nothing keeps in
step with the catalog. *Deriving it from the value set*: the countries hold one value in the
licence's nationality and several in the Personal ID's. Both rejected.

## R10. Running the checks

**Decision**:
- **Where**: a hook, `hooks/useRuleChecks.ts`, in the editor page
  (`pages/FormConnectionEditor/index.tsx`), so that the rules step and the publish and save dialog
  share one result. It starts once the catalog and the value sets are loaded, in the create and
  the edit flow (FR-011, W14).
- **Input**: the rules state's branches, the requested documents, the value sets, and today in
  Germany (`todayInGermany()`). Today is read again every minute and whenever the page becomes
  visible, and a new day reruns the checks.
- **Per change**: the main thread builds each branch's checked tree and fingerprint (R2). This is
  linear in the number of items and cheap. It reuses a cached result when the fingerprint matches,
  undo included, and sends the other branches to the worker: the shown branch first, then the
  rest in tab order.
- **Worker**: one module worker, `new Worker(new URL('../utils/rules/checks/worker.ts',
  import.meta.url), { type: 'module' })`. Vite builds it into a chunk of its own, so the solver and
  the case-folding table stay out of the main bundle. It posts each branch's result as soon as
  that branch is done.
- **A superseded run**: when a change arrives during a run, the hook terminates the worker and
  starts a new one, keeping the results already posted. A worker can't read a message in the
  middle of a search, and slicing the search into chunks would cost throughput.
- **Deadline** (FR-010, SC-003): 5 seconds from the change, for the whole run. The worker stops
  asking questions at 4.5 seconds and posts the branch with its certain findings and
  `complete: false`. Branches it didn't reach count as not checked completely, with no findings.
  If the worker hasn't answered 5.5 seconds after the change, the hook terminates it and does the
  same.
- **Display while a check runs**: the previous findings stay until the new ones arrive, without
  those whose item is gone, so notes don't flicker on every change. Names always come from the
  current tree.
- **A worker that can't start**: every branch with checked rules shows FR-010's sentence alone,
  and nothing waits.
- **State**: `useReducer` with a pure reducer in `checks/runState.ts`, which holds the results by
  branch, the pending runs and the announcements (constitution: related state goes into a
  reducer).

**Rationale**: the result belongs to the page because two parts of it show it. Fingerprints keep
the common case, a change in one branch, down to one branch's check. The run's deadline and the
watchdog make SC-003's "within 5 seconds" a property of the code, not of the rules.

**Alternatives considered**: *debouncing changes*: adds delay to every change, while changes are
discrete actions anyway. *Cooperative chunks inside the worker*: more code and slower searches.
*A budget of 5 seconds per branch*: 20 branches could then take 100 seconds, against SC-003. All
rejected.

## R11. Showing the findings

**Decision** (revised 2026-11-01 for the redesign): what is a finding comes from the spec; the
findings' look, behaviour and wording from the redesigned Figma section, with the items A1–A8, O1–O6
and W1–W20 per screen in [contracts/ui-screens.md](contracts/ui-screens.md). The page around the
findings stays as built (O1–O6).
- **Rules and groups** (FR-012, A3–A5, W2–W9, W11): the shared `RuleRow` and `GroupFrame` take an
  optional `finding` prop with the kind and the note's text. The rules step passes it; the details
  never do (FR-020). The shared `components/FindingNote/` draws the note in the layout of Figma's
  `Rules/Problem note` (levels `conflicting`, `redundant`): the kind's icon, with a visually hidden
  kind text, and the text in the default text colour. The outline is 1 px in the warning or info
  colour, all round. Spec 002's red problem flag stays as it is, and a flagged rule never has a
  finding (R2). The row or group header is described by its note (`aria-describedby`).
- **Findings banner** (FR-013, A1, A2, W12, W13, W17): `RulesStep/FindingsBanner.tsx` replaces
  `FindingsSummary.tsx` at the top of the rules card: warning when the branch has a conflict or no
  applicant can meet it, info otherwise; single, collapsed (counts row and chevron) or expanded (one
  item per line). The names in a line are link-styled buttons that scroll the item into view and
  move the focus to its row or group header. Its content comes from `findingMessages.ts` as
  structured lines (the names as references to item ids), so that the component renders the links
  and no text is built in it. A branch without checked rules has no banner.
- **Tabs** (FR-014, A6, W9, W12, W20): `BranchTab` passes the branch's findings to `BranchName`,
  whose (i) of the description becomes the findings icon: warning when the branch has a conflict or
  no applicant can meet it, info otherwise. The icon's accessible name is "Standard has findings",
  and its tooltip adds the findings segment below the description.
- **Status region** (FR-015, W1): one visually hidden `role="status"` region (polite) at the
  editor level, which outlives the step. `checks/announcements.ts` computes what to say: the
  difference between the previous result and the new one, after an action of the team member.
  Nothing is announced for the first result or for a new day. A finding's disappearance is
  announced only when the new result is complete, because an incomplete one may only have failed
  to confirm it.
- **Publish and save dialog** (FR-016, FR-017, W10): below the lines it has, one line per branch
  with findings, in tab order, with the banner's counts row, in the warning style when the branch
  has a conflict and the info style otherwise, adding "No applicant can meet the rules of
  Ambulance." where it applies. The existing secondary action "Check rules again" now opens the
  rules step on the first branch, in tab order, that has findings, and the open branch as before
  when none has. "Publish" and "Save" don't change (A8).
- **Rule editor**: unchanged (FR-002, W15).

**Rationale**: extending the two shared components keeps the rule row's single layout, while the
prop keeps findings out of the details. Building the banner's lines as data keeps every text in
`findingMessages.ts` while the component draws the links. The dialog's existing secondary action is
already the way back to the rules.

## R12. Messages, and the copy the decisions leave open

**Decision**: `checks/findingMessages.ts` builds every text from a finding and the current names:
the notes (FR-012, A3, A5, W2–W8), the banner's lines, counts row and notices (A1, A2, W12, W17),
the tab's accessible name and tooltip segment (A6, W20), the announcements (FR-015, W1) and the
dialog's lines (W10). Its tests pin each wording the spec
gives. Lists read "Rule 02, Rule 03 and Rule 04" (W3).

The first UI task writes `specs/003-rule-consistency-checks/design-notes.md` with the copy the
decisions don't give:
1. The note of a rule that can't be met on its own (FR-003: "its condition").
2. The note of an OR group none of whose members can be met.
3. The summary's clause after the counts, when the first conflict isn't a pair ("nobody can meet
   both …" fits two items), and when a branch has several conflicts.
4. The summary's counts in general: the order of the kinds, singular and plural, when to say "in
   this variant" (U03), where FR-008's words go, and where FR-010's sentence goes.
5. The reasons of a redundancy that comes through an enclosing level (R8, step 4).
6. The announcements for groups and sub-groups, and for findings in a branch other than the one
   shown. The proposal is "In Ambulance: Rule 02 conflicts with Rule 05."
7. The dialog's line for a branch whose only finding is that every applicant meets its rules.

Every proposal keeps FR-012's kind at the start of each note, and never words a finding as
something "to fix" (FR-016).

**Revised 2026-11-01**: the redesign draws the notes without a kind label and words the findings
in plain sentences. [design-notes.md](design-notes.md) §1–§6 now quotes the drawn texts and gives
the undrawn ones (items 1–7 above included) in the same voice; the kind label survives only as the
icons' hidden text.

## R13. Tests

**Decision**:
- **Vitest, a gate**: each module of `checks/` has its `*.test.ts` beside it and runs in the
  `node` environment. `text` is checked against Python's vectors, `calendar` against Python's
  vectors (anniversaries, months, the clamp), and so is every theory. The other modules are
  `literals`, `checkedTree` (counted items, rules left out, fingerprint), `solver` (`'sat'`,
  `'unsat'` and `'unknown'`, independent parts, the deadline with a fake clock), `findings`,
  `findingMessages`, `announcements` and `runState`.
- **Spec scenarios**: `checks/scenarios.test.ts` covers every acceptance scenario and edge case
  that a rule set expresses (US1-AS1 to AS6, US2-AS1 to AS7, US3-AS1 to AS5, and the edge cases)
  with the exact findings and texts.
- **Brute-force oracle** (SC-001, SC-002): `checks/oracle.test.ts` builds seeded random branches:
  one to three levels, AND and OR, two to eight rules over a few variables with small values. The
  variables are numbers 0 to 5, an enum of three values, a set of three values, two dates near a
  fixed today with conditions counted from the day of sharing, and texts over a, A, b and ß. An
  oracle (`checks/testOracle.ts`) enumerates every applicant in a domain large enough to stand for
  every case: numbers up to the largest constant plus 2, every value and set of values, the dates
  of a window, texts up to the constants' total length. It also enumerates every day of sharing in
  a window. The assertions:
  - every reported finding holds;
  - every conflicting or always-met item, and every branch notice, is reported;
  - the reported redundant items can be deleted together without changing an outcome;
  - each item not reported as redundant changes an outcome in the working tree.

  The oracle evaluates rules with `checks/testEvaluator.ts`, a plain port of `evaluation.py`'s
  comparisons that shares no code with the theories, and that Python's vectors pin.
- **Python's vectors**: `backend/scripts/export_check_fixtures.py` writes
  `frontend/src/utils/rules/checks/caseFolding.ts` and
  `frontend/src/utils/rules/checks/fixtures/evaluator-vectors.json`. The vectors hold the results
  of `_normalised_text()`, `years_after()`, `months_after()` and rule outcomes for chosen values
  and days. With `--check`, the script exits with an error when the committed files differ from
  what the current interpreter and evaluator produce. `backend/tests/unit/test_check_fixtures.py`
  runs that check; backend tests stay a practice. CLAUDE.md gains the rule to regenerate the
  fixtures after a Python upgrade or a change to the evaluator's comparisons.
- **Performance** (SC-003): `checks/performance.test.ts` checks a generated 50-item branch within
  1 second, and that a generated 200-item branch built to be hard returns by the deadline, checked
  completely or not.
- **Backend**: the catalog's and `GET /api/document-types`' tests cover `multiple_values`.
- **Manually**: [quickstart.md](quickstart.md) V1–V8 cover the worker, the UI, the status
  region, the dialog, accessibility (SC-006) and usability (SC-005).

**Rationale**: SC-001 asks for 100 % found and 0 untrue. Only an oracle that knows the answers
independently can show both, and only on domains small enough to enumerate. The parity chain
runs from Python's evaluator, through the vectors and the test evaluator, to the oracle, so the
oracle's truth is the evaluation's.

## R14. Figma items reach every UI task

**Decision**: as in 002-R13. [contracts/ui-screens.md](contracts/ui-screens.md) lists the audit's
items per screen: since the redesign of 2026-11-01, A1–A8 (adopted from Figma), O1–O6 (page design,
out of scope) and W1–W20 (built without frames). Every UI task cites the items it covers with the
screen's id and builds the findings as Figma draws them. Its visual check lists each difference
that an O# item explains ("page design (O2)") or that only the Revamp explains ("KERN 2.8 vs
Revamp"), and doesn't fix it. The F1–F8 of 2026-10-28 are retired; the tasks completed before the
redesign cite them ([figma-audit/archive-2026-10-28/](figma-audit/archive-2026-10-28/)).

## R15. Points to verify at implementation

- KERN 2.8's warning icon class (`kern-icon--warning` or its 2.8 name). Also the text colour KERN
  pairs with `feedback-warning`, so that warning notes reach WCAG AA contrast on white (SC-006).
  Use KERN's text token if the feedback colour is too light for text.
- Typing the worker's global scope without adding the `WebWorker` library to `tsconfig.app.json`,
  which conflicts with `DOM`: a minimal local interface in `worker.ts`.
- That EUDIPLO's mdoc decoding delivers `height`, `weight`, `age_in_years` and `age_birth_year` as
  integers (R3).
- That `vite build` emits the worker as its own chunk under `assets/`, which nginx's immutable
  cache rule serves.
- That the group header has an element id that the banner's name links can focus, like the rule
  rows' `ELEMENT_IDS.rule(...)`.
- That NVDA and VoiceOver read polite announcements that follow each other quickly. The sentences
  of one change go into the region together.
