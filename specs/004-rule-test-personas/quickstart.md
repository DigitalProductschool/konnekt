# Quickstart and validation guide: Test Rules with Personas

**Phase 1 output of `/speckit-plan`** | **Date**: 2026-11-01 | **Spec**: [spec.md](spec.md)

How to prove the feature works: the automated checks first, then manual scenarios in the running
app. The expected texts are those of [contracts/ui-screens.md](contracts/ui-screens.md), "Copy".
The shapes are in [data-model.md](data-model.md), and the functions in
[contracts/personas.md](contracts/personas.md).

## 1. Prerequisites

- The stack of spec 002's quickstart
  ([../002-connection-rules/quickstart.md](../002-connection-rules/quickstart.md), section 1):
  - `docker compose up postgres -d`;
  - the backend: `cd backend && uv sync && uv run alembic upgrade head && uv run uvicorn
    app.main:app --reload`;
  - the frontend: `cd frontend && npm install && npm run dev`;
  - a sign-in account: `uv run python -m app.cli create-user <name>`.
- No new setting, environment variable or dependency. EUDIPLO and the test credentials (README,
  "Test credentials") are needed for V1's comparison with a real evaluation (SC-001), for V10's
  check of what serviceBW receives, and for every step that publishes (V1.6, V5.5, V7.2–3): the
  backend needs `EUDIPLO_URL`, `EUDIPLO_CLIENT_ID`, `EUDIPLO_CLIENT_SECRET` and
  `EUDIPLO_TRUST_LIST_ID` (README, "Environment variables"); without them publishing answers
  `503` "EUDIPLO is not configured".
- A browser with a screen reader for V9: NVDA with Firefox, or VoiceOver with Safari.

## 2. Automated checks

```bash
cd frontend
npm run lint
npm test          # evaluation.test.ts (Python vectors), every personas/*.test.ts, and the existing suites
npm run build     # tsc -b; separate chunks for the personas' worker and the results module under dist/assets/

cd ../backend
uv run ruff check . && uv run ruff format --check .
uv run mypy app/ scripts/ tests/
uv run python -m scripts.export_check_fixtures --check   # the committed vectors, branch_evaluations included, match the evaluator
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5435/konnekt_db_test uv run pytest tests/unit/test_check_fixtures.py
```

**Expect**:
- `npm test` passes, including:
  - `evaluation.test.ts`: every `rule_outcomes` and `branch_evaluations` vector gives Python's `met`,
    results and messages (SC-001);
  - `personas/scenarios.test.ts`: every acceptance scenario and edge case that a rule set expresses;
  - `personas/generation.test.ts`: for every rule set of the catalogue for which three personas can
    reach goals 1 to 3, as the oracle computes it, 20 generations in a row reach them, and at least
    90 % of the items that applicants can both meet and fail are covered both ways (SC-002);
  - `personas/performance.test.ts`: SC-003's budgets.
- `--check` prints nothing and exits 0. After a change to `evaluation.py`, it fails until the
  fixtures are regenerated (`uv run python -m scripts.export_check_fixtures`) and committed.
- `dist/assets/` has a chunk for `personas/worker` and one that holds `caseFolding`, which isn't in
  the main `index-*.js`.

## 3. Validation scenarios

Set up spec 002's "Passenger transport licence" (its User Story 3):
1. Create a form connection that requests the Personal ID with "Date of birth" and the address's
   "City or town", and the driving licence with "Licence classes".
2. On the Rules step, give **Standard**:
   - Rule 01 "Personal ID – Date of birth (Age) is at least 21 years old";
   - Rule 02 "Personal ID – City or town is equal to Stuttgart" (letter case ignored);
   - Rule 03 "Driving licence – Licence classes includes one of B";
   - Rule 04 "Driving licence – Licence class B – Issue date is at least 2 years ago";
   - each with a message, combined with AND.
3. Add the variant **Ambulance**, based on Standard, and change its Rule 01 to 19 years.

### V1: The personas and their results (US1-AS1 to AS4; FR-004, FR-005, FR-014 to FR-016; W1)

1. On the Rules step, check the button to go on. **Expect**: it reads "Test rules", with a forward
   arrow, and there's no "Publish" button. Press it.
2. **Expect**:
   - the progress shows Connection, Documents, Rules, **Test** (current), Publish;
   - the title is "Test rules", with the intro below it, then "Tested as if shared today, <today>.",
     with today's date in Germany ("1 Nov 2026");
   - for a moment, frame 18's loading state with "Creating 3 sample applicants…";
   - within 2 seconds, three chips with different realistic names (SC-003).
3. Select each chip in turn. **Expect**:
   - Under "Personal ID": "Date of birth (Age)" with the age ("08.07.2007 (age 19)") and "City or
     town".
   - Under "Driving licence": "Licence classes" as codes and, for a persona holding B, "Licence
     class B – Issue date".
   - No other data: no family name (US2-AS6).
   - An age between 18 and 80, and no issue date before the date of birth (FR-010).
4. Compare the chips on Standard and on Ambulance. **Expect**: one persona meets both variants, one
   meets Ambulance but not Standard, and one meets neither (US1-AS3). The chips' icons differ in
   shape. Changing the tab keeps the selected persona.
5. For a persona that doesn't meet Standard, **expect**:
   - "Result: doesn't meet N rules";
   - the columns "Rule" and "Message <first name> reads";
   - the reported rules first, each with name, statement, "Not met" or "Couldn't be checked", and
     its message;
   - then the met rules, with a check icon, name, statement and "–".

   For a persona that meets it: "Result: meets the rules", the list "Rules <first name> meets", and
   no message column.
6. Optionally (SC-001): issue test documents with one persona's values (README, "Test
   credentials"), share them for this form connection on the same day, and compare serviceBW's
   evaluation with the step: the same outcome, the same items reported, and the same messages.

### V2: Going on, refusing, and skipping (US1-AS7, AS8; FR-001 to FR-003; W2, W3, W8)

1. Open Rule 02 in the editor, change its text without saving, and press "Test rules".
   **Expect**: "Save changes to Rule 02?" first. "Discard" then opens the test step.
2. Go back to the Documents step and stop requesting the data that Rule 02 checks (City or
   town), return to the rules step and press "Test rules". **Expect**: refused with publishing's
   message ("Rule 02 in Standard checks data that’s no longer requested. …"), you stay on the
   rules step with the focus on the rule. Request the data again. (The rule editor can't save an
   empty message, so that refusal can't be reproduced here.)
3. Start a new form connection, open the rules step, add the first rule, and with its editor open
   press "Test rules", then choose to discard it. **Expect**: you stay in the rules step, whose
   button now reads "Publish without rules".
4. From the documents step of a connection without rules, press "Publish without rules".
   **Expect**: the dialog opens, and there's no test step.

### V3: Editing a persona (US2-AS1 to AS7; FR-006 to FR-009, FR-017; F1, F10–F12, W4, W11, W12)

Select the persona that meets both variants and press "Edit data". **Expect**: fields under the same
headings, a "Done" button, and no dialog.
1. Enter 20 in "Age today". **Expect**: at once, the date of birth gives age 20 with the same day
   and month. The chip and the result show that the persona no longer meets Standard (naming Rule 01
   with its message) and still meets Ambulance. The screen reader says "<Name> no longer meets the
   rules of Standard." There's no toast (US2-AS1, F2).
2. Enter the day 21 years before today as the date of birth (`dd.mm.yyyy`). **Expect**: Rule 01 is
   met (US2-AS2).
3. Enter "31.02.2007". **Expect**: "Enter a date that exists, e.g. 28.02.2007." under the field.
   The results keep the last valid date while other changes still apply (FR-008).
4. Enter "STUTTGART" as the city or town. **Expect**: Rule 02 is met (letter case ignored). On the
   rules step, set Rule 02 to respect letter case and come back. **Expect**: it isn't met (US2-AS3).
5. Remove B from "Licence classes", which is picked from a list by code. **Expect**: the "Licence
   class B – Issue date" row disappears, and Rule 04 is "Couldn't be checked" when B was the only class (an empty list counts as missing), and "Not met" when another class such as C1 is still held. Add B again.
   **Expect**: the date comes back with its earlier value (US2-AS4, W4).
6. Clear the date of birth. **Expect**: Rule 01 "Couldn't be checked", in both variants (US2-AS5).
7. Rename the persona, then empty the name. **Expect**: the new name shows on the chip and in
   "<Name>'s data", and no result changes. An empty name shows "Enter a name." and keeps the
   previous one (US2-AS7, W11).
8. Enter "2.5" in "Age today". **Expect**: "Enter a whole number, e.g. 25." (W11).
9. Press "Done". **Expect**: the values again, with "· edited" after the changed ones.

### V4: Generating anew (US1-AS5; FR-012, FR-013; W9, U04, U11)

1. On the edited persona, press "Generate again". **Expect**: "Generate new data for <first name>?"
   with "Cancel" and "Generate new data". Confirm. **Expect**:
   - frame 19: only that persona is a placeholder, with "Creating new data for <first name>…";
   - the other two personas stay usable and unchanged;
   - the new values arrive within 5 seconds, and the name is kept.
2. Press "Generate again" on a persona without changes. **Expect**: no question.
3. Edit two personas, then press "Generate all again". **Expect**: "Generate new data for all
   applicants?" with "Your changes to <A>'s and <B>'s data will be replaced." Confirm. **Expect**:
   frame 18's loading state, then new values for all three, with their names kept.

### V5: Round trips with the rules step (US3-AS1 to AS5; FR-019, FR-020; W6, W7)

1. Edit a persona, go Back, change Standard's Rule 01 from 21 to 18, and return. **Expect**: every
   value kept, and the results follow the new rule (US3-AS1).
2. Request the Personal ID's Nationality, add "Personal ID – Nationality includes one of Germany" to
   Standard, and return. **Expect**: every persona has a Nationality, at least one meets the rule and
   one doesn't, and no earlier value changed (US3-AS2).
3. Delete Rule 02 and return. **Expect**: no "City or town" row, and no result depends on it. Add
   the rule again and return. **Expect**: each persona's earlier city or town is back (US3-AS3,
   FR-020).
4. Add the variant "School transport" without rules and return. **Expect**: a tab for it, "Result:
   meets the rules" for everyone, and the note "School transport has no rules yet, so every
   applicant meets it. …". Delete the variant and return. **Expect**: its tab is gone (US3-AS4).
5. Publish, then open the connection's edit flow and go on to the test step. **Expect**: frame 18,
   then three new personas (US3-AS5, W7).

### V6: Special variants (edge cases; FR-018; F6)

1. In Ambulance, add "Personal ID – Date of birth (Age) is less than 18 years old". **Expect**:
   - on the test step, the Ambulance tab carries a warning icon;
   - focusing it with the keyboard, or hovering it, shows "No applicant can meet the rules of
     Ambulance.";
   - the same notice sits above the result heading;
   - no persona meets Ambulance.

   Remove the rule.
2. Make a variant whose rules every applicant meets (for example "Date of birth (Age) is less than
   200 years old" alone). **Expect**: every persona meets it.

### V7: Publishing and saving from the test step (US1-AS6; FR-003, FR-019; F4, F13)

1. With personas that don't meet Standard, press "Publish". **Expect**: the dialog, unchanged, with
   "Check rules again". Press it. **Expect**: the rules step, at the first variant with findings, or
   at the variant that was open there.
2. Press "Publish" again and confirm. **Expect**: the connection is published as without this
   feature, with no question about personas.
3. In the edit flow, **expect** "Save" (not "Publish changes"). Make the save fail, for example by
   stopping the backend. **Expect**: the test step and the personas stay as they were.

### V8: Failure and timing (FR-013, SC-003; F7)

1. In the browser's developer tools, block the request for the `personas/worker` chunk and open
   the test step in a fresh flow. **Expect**: "Couldn't create sample applicants", "Try again, or
   publish without testing." and "Try again". The tabs, Back and "Publish" work. Unblock the chunk
   and press "Try again". **Expect**: frame 18, then three personas.
2. With a variant of about 50 rules, **expect** the personas within 2 seconds, and results that
   follow each edit without a noticeable pause (SC-003). `performance.test.ts` covers spec 002's
   limits.

### V9: Accessibility (SC-007; FR-015, FR-017, FR-018)

- With the keyboard only:
  - move through the variant tabs and the chips with the arrow keys;
  - open the tab's tooltip by focus;
  - enter edit mode, change a value, and leave with "Done".

  **Expect**: visible focus rings for keyboard focus only, and the focus never lost when the
  loading state ends.
- With a screen reader:
  - each chip is read with its outcome ("<Name>: doesn't meet the rules of Standard");
  - a change of outcome is announced once, politely;
  - "Creating 3 sample applicants…" is read;
  - errors are read with their fields;
  - statuses are read as text;
  - failing and changed values have their hidden texts.
- Zoom to 200 % and to 320 px width: nothing is cut off, and only the panel scrolls (K3).
- Usability (SC-004, SC-005): with five DO.IT participants:
  - swap the age limits of Standard and Ambulance; at least four find the mistake on the test step
    within 3 minutes;
  - ask them to turn a persona into an applicant who turns 21 today and holds BE but not B; at
    least four manage it within 2 minutes.

### V10: Privacy (FR-021, SC-006)

- With the developer tools' network tab open, run V1 to V5. **Expect**: no request carries persona
  values or results. The only requests are the existing ones (document types, option sets) and,
  when publishing, the unchanged payload of the form connection.
- **Expect** no console output from the test step, the worker or the hook.
- After publishing, share test documents. **Expect**: serviceBW receives exactly what it received
  before this feature.

## 4. Troubleshooting

| Symptom | Likely cause |
|---|---|
| The failure state on every first open | The worker didn't start: check that `dist/assets/` has the personas' worker chunk, and that nginx serves it |
| The loading state never ends | `personas/results.ts` didn't load (dynamic import): check the console and the chunk |
| A result that the evaluation disagrees with | Stale fixtures, or an evaluator change not regenerated: `uv run python -m scripts.export_check_fixtures --check` |
| No "No applicant can meet …" notice on a variant that nobody meets | Spec 003's check for that variant is still pending, or incomplete; it appears when the check finishes |
| Publishing (V1.6, V5.5, V7.2–3) answers 503 "EUDIPLO is not configured" | The backend's `EUDIPLO_*` settings are empty: set them in `backend/.env` and restart |
| A persona that doesn't vary between generations | The seed isn't taken from `crypto.getRandomValues()` |
