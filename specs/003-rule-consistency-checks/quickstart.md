# Quickstart and validation guide: Conflict and Redundancy Checks for Rules

**Phase 1 output of `/speckit-plan`** | **Date**: 2026-10-28 | **Spec**: [spec.md](spec.md)

How to prove the feature works: the automated checks, then manual scenarios in the running app.
The expected texts are those of [contracts/ui-screens.md](contracts/ui-screens.md), "Copy"; the
shapes are in [data-model.md](data-model.md).

## 1. Prerequisites

- The stack of spec 002's quickstart
  ([../002-connection-rules/quickstart.md](../002-connection-rules/quickstart.md), section 1):
  `docker compose up postgres -d`, the backend (`cd backend && uv sync && uv run alembic upgrade
  head && uv run uvicorn app.main:app --reload`), the frontend (`cd frontend && npm install && npm
  run dev`), and a sign-in account (`uv run python -m app.cli create-user <name>`).
- No new setting or environment variable. EUDIPLO is needed only for V6's check that serviceBW
  receives what it did before.
- A browser with a screen reader for V7 (NVDA with Firefox, or VoiceOver with Safari).

## 2. Automated checks

```bash
cd frontend
npm run lint
npm test          # every checks/*.test.ts: theories, solver, findings, messages, scenarios, oracle, performance
npm run build     # tsc -b, and a separate chunk for the checks' worker under dist/assets/

cd ../backend
uv run ruff check . && uv run mypy app/ scripts/ tests/
uv run python -m scripts.export_check_fixtures --check   # the committed case-folding table and vectors match this interpreter
uv run pytest tests/unit/test_check_fixtures.py tests/unit tests/api   # DATABASE_URL must end in _test
```

Expected:
- `npm test` passes, including `scenarios.test.ts` (every acceptance scenario and edge case),
  `oracle.test.ts` (SC-001: no untrue finding and none missed; SC-002: deleting the redundant items
  changes nothing) and `performance.test.ts` (SC-003).
- `--check` prints nothing and exits 0. After a Python upgrade, or a change to the evaluator's
  comparisons, it fails until the fixtures are regenerated with `uv run python -m
  scripts.export_check_fixtures` and committed.
- `GET /api/document-types` returns `multiple_values` on every field and part
  ([contracts/management-api.md](contracts/management-api.md)).

## 3. Validation scenarios

Create a form connection that requests the Personal ID (with Date of birth, Nationality, Place
of birth and the address's City or town) and the driving licence (with Nationality, Licence
classes, Age in years and Expiry date). Go to the Rules step. "Rule 01" and so on are the default
names in the order of adding.

### V1: Conflicts at the top level (US1-AS1, AS2, AS6, AS7; FR-003, FR-004, FR-011, FR-016)

1. Add Rule 01 "Driving licence – Nationality includes one of Germany" and Rule 02 "Driving licence
   – Nationality includes one of Italy", combined with AND.
   **Expect**: both rules outlined in the warning colour. Rule 01's note reads "Can't be met
   together with Rule 02." beside the warning triangle, and Rule 02's "… with Rule 01.". A single
   warning banner at the top of the rules reads "Rule 01 and Rule 02 can't be met together. So no
   applicant can meet the rules of Standard." (U01). The "Standard" tab shows the warning icon.
   Nothing had to be pressed.
2. Activate the banner's "Rule 02", then its "Rule 01". **Expect**: each scrolls its rule into view
   and moves the focus to its row.
3. Switch the level to OR. **Expect**: the notes, the banner and the tab's findings icon disappear at once.
4. Switch back to AND, then edit Rule 02 to "includes one of Germany". **Expect**: the conflict
   goes, Rule 02's note reads "Same as Rule 01. You can delete one of them." beside the info icon,
   and the banner turns info: "Rule 02 is the same as Rule 01." Undo the change: the conflict comes back.
5. With the conflict in place, press "Publish". **Expect**: the dialog lists "Standard: 2
   rules can't be met together" and "No applicant can meet the rules of Standard.". "Publish" is enabled and
   publishes without a further question. The details show no findings (FR-020).

### V2: Groups and sub-groups (US1-AS3, AS4, AS5; A4, A5, W2, W3)

1. Top level AND: a group (AND) of "Driving licence – Age in years is greater than 30" and "… is
   less than 20". **Expect**: both rules marked as conflicting with each other, the group outlined
   with "Rule 01 and Rule 02 in this group can't be met together." under its header, and the
   branch notice. The banner has one line, "Group 01: Rule 01 and Rule 02 can't be met
   together.". Move the two rules into a sub-group of a group: the same marks
   on the sub-group.
2. Switch the top level to OR and add "Personal ID – Nationality includes one of Germany".
   **Expect**: the group and its two rules keep their marks, and the notice goes.
3. New connection, top level AND: Rule 01 "Personal ID – Date of birth (Age) is at least 21 years
   old" and an OR group of Rule 02 "… is less than 18 years old" and Rule 03 "Driving licence –
   Licence classes includes one of B". **Expect**: only Rule 02 is marked, "Can't be met together with
   Rule 01.". Rule 01, Rule 03 and the group stay plain, and there is no notice
   (W2).
4. EC-11: four rules "Age in years is greater than 17", "is less than 20", "is not equal to 18", "is
   not equal to 19", combined with AND. **Expect**: each note names the other three, and the banner has one line naming all four
   (W3).

### V3: Redundancy and always met (US2-AS1 to AS7; FR-005, FR-006, FR-019)

1. AND: Rule 01 "Driving licence – Age in years is greater than 10", Rule 02 "… greater than 11".
   **Expect**: Rule 01 "Anyone who meets Rule 02 also meets this rule. You can delete the rule.";
   Rule 02 plain. Switch to OR: now Rule 02 "Anyone who meets this rule also meets Rule 01. You can
   delete the rule.", and Rule 01 plain.
2. Duplicate a rule. **Expect**: the copy's note reads "Same as" the original, the original stays
   plain. Change the copy's value: the mark goes, unless the new condition still makes no
   difference.
3. AND: "Driving licence – Licence classes includes one of B" and "Licence class B – Issue date is
   at least 2 years ago". **Expect**: the first is redundant, naming the second.
4. An OR group of "Age in years is greater than 18" and "… less than 21". **Expect**: the group is
   outlined with "Every applicant meets this group." beside the info icon, and the banner reads
   "Every applicant meets Group 01, so it doesn't check anything." (U06).
5. AND: Rule 01 "Personal ID – Date of birth (Age) is at least 21 years old" and an OR group of "…
   at least 18 years old" and "Personal ID – Nationality includes one of Germany". **Expect**: the
   group is redundant, naming Rule 01, and the rules inside it stay plain.
6. Delete every item marked redundant, one after the other, without other changes. **Expect**:
   the branch's notice, if any, stays as it was, and no always-met mark appears or goes (US2-AS7).
   That no applicant's outcome changes is proved by `oracle.test.ts`; a new check may mark an item
   that makes no difference only now.
7. In a branch that no applicant can meet (V1 step 1), add a duplicate of Rule 01. **Expect**: no
   redundancy note until the conflict is gone (W4).

### V4: How conditions are judged (edge cases; FR-007, FR-008)

Each pair, combined with AND unless stated:

| Rules | Expect |
|---|---|
| "Personal ID – Nationality includes one of Germany", "… of Italy" | no finding (several nationalities) |
| "Driving licence – Licence classes includes one of B", "… of C" | no finding |
| "Personal ID – City or town is equal to Stuttgart" and "is equal to STUTTGART", both ignoring case | the second redundant, "Same as" the first |
| the same, both respecting case | conflicting |
| the first respecting case, the second ignoring it | the second redundant |
| "… contains straße" and "… contains STRASSE", ignoring case | "Same as" |
| "… is equal to Stuttgart", "… doesn't contain gart" | conflicting |
| "… is equal to Stuttgart", "… contains Stutt" | the second redundant |
| "Age in years is greater than 20", "… less than 21" | conflicting (whole numbers) |
| "Expiry date is before 1 Jan 2030", "… is after 31 Dec 2029" | conflicting |
| "Expiry date is at least 12 months from now", "… at least 1 year from now" | the second "Same as" the first |
| "Date of birth (Age) is exactly 21 years old", "… at least 18 years old" | the second redundant |
| "Personal ID – Date of birth is after 1 Jan 2010", "Date of birth (Age) is at least 21 years old" | conflicting, "… at the moment.", banner ending "Right now, no applicant can meet the rules of Standard." (U08) |
| "Date of birth is before 1 Jan 2010", "Date of birth (Age) is at least 18 years old" | no finding |
| "Driving licence – Nationality includes none of" every country | conflicting, "No applicant can meet this rule." (W18) |
| "Personal ID – Date of birth (Age) is at least 21 years old", "Driving licence – Age in years is less than 18" | no finding (separate fields) |

### V5: Variants (US3-AS1 to AS5; FR-001, FR-014, A6, W9, W20)

1. Set up spec 002's "Passenger transport licence" with Standard's Rule 02 "Driving licence –
   Licence classes includes one of B", and "Ambulance" based on it, adding Rule 05 "… includes none
   of C". In Standard, change Rule 02 to "includes one of C". **Expect**: the "Ambulance" tab shows
   the warning icon while Standard is shown (U09). Its accessible name is "Ambulance has findings",
   and hovering or focusing it shows Ambulance's description, then the conflict, "1 conflict: Rule
   02 and Rule 05 can't be met together.", with the notice after it where it applies.
   In Ambulance, Rule 02 ("Changed here" is not shown, as Rule 02 follows Standard) and Rule 05 are
   marked as conflicting. Standard has no conflict.
2. In Ambulance, remove Rule 02. **Expect**: the removed state, no note, and Rule 05's note and the
   tab icon go. Restore it: they come back.
3. Add a variant that starts empty and give it rules. **Expect**: checked without Standard's rules.
4. Put a conflict among Standard's rules that Ambulance inherits unchanged. **Expect**: the same
   notes and banner in both tabs, and both tabs show the icon.
5. A rule with "Changed here" and a finding shows both, told apart by the note's icon and text
   (US3-AS5; the orange "Changed here" stays, O3).

### V6: Publishing and saving with findings (US4-AS1 to AS5; FR-016 to FR-018, SC-004)

1. Ambulance with a conflict, Standard with a duplicate rule. Open the publish dialog. **Expect**:
   "Standard: 1 duplicate rule" in the info style and "Ambulance: 2 rules can't be met together"
   in the warning style, in tab order. "Publish" is enabled.
2. Press "Check rules again". **Expect**: the rules step opens on Standard, the first branch with
   findings in tab order.
3. Publish. Trigger and complete a request with a test wallet (spec 002 quickstart V2). **Expect**:
   the pull answer has the same shape and values as without this feature: the evaluation of the
   rules as they are, with no trace of findings (FR-018).
4. Edit the connection: the rules step checks the published rules when it opens (W14). Save with
   findings: no further question.
5. A connection without findings: the dialog is as in spec 002.

### V7: Accessibility (SC-006, FR-012 to FR-015)

- With a screen reader, cause and remove a conflict (V1 steps 1 and 3). **Expect**: "Rule 02
  conflicts with Rule 01." and "Rule 02 no longer conflicts with Rule 01." are announced, and the
  focus stays where it was.
- Tab to a marked rule. **Expect**: its note is read as its description, starting with the
  icon's hidden kind text ("Conflicting:", "Redundant:", "Always met:").
- With two or more lines, the banner's chevron is read as "Show findings", collapsed; activated,
  "Hide findings", expanded, and the lines' names are reachable with Tab.
- Tab to a variant tab's findings icon. **Expect**: "Ambulance has findings" is read, and the
  tooltip shows on focus.
- Check the notes', banner's and tooltip's contrast with the browser's accessibility tools (AA),
  and that the banner, notes and tooltip reflow at 320 px width and 200 % zoom.

### V8: Timing, and a branch that can't be checked completely (SC-003, SC-005; FR-010)

- Changes in a branch of about 30 rules: findings update without a noticeable pause, and typing in
  the rule editor never stutters.
- `performance.test.ts` covers the limits: 50 items within 1 second, 200 items within 5 seconds.
  To see the incomplete state by hand, run the dev server with the deadline lowered in
  `checks/constants.ts` (local only, not committed). **Expect**: the banner adds "The rules of
  Standard couldn't be checked completely. Only findings that are certain are shown.", or shows it
  alone in a single info banner, and editing, publishing and saving don't wait.
- Usability (SC-005): with five DO.IT participants, plant a conflict in a sub-group and a redundant
  rule at the top level; at least four find both and name the rules within 2 minutes.

## 4. Troubleshooting

| Symptom | Likely cause |
|---|---|
| No findings anywhere, and every banner says the rules couldn't be checked completely | The worker didn't start: check the console and that `dist/assets/` has the worker's chunk |
| A text finding where the evaluation disagrees (letter case, ß) | Stale fixtures: run `uv run python -m scripts.export_check_fixtures --check` |
| "Nationality" pairs reported as conflicting on the Personal ID | `multiple_values` missing from `GET /api/document-types` |
| Notes that name a deleted rule for a moment | Expected while a check is pending for a large branch; they go when it finishes |
