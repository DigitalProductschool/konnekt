# Design notes: testing rules with personas

**Tasks**: T001 (copy, §1–§9), T002 (tokens and icons, §10) | **Date**: 2026-11-01 | **Contract**: [contracts/ui-screens.md](contracts/ui-screens.md)

**Sources**:
- **Figma "Middleware – V4"** (`s8mU9oJDq3411e8bxMjQO9`), section `7057:58708` ("Test · 1 · Test
  rules"), frames 1–20 in units U01–U12 of the [audit](figma-audit/report.md): items F1–F14
  (Figma must change), W1–W13 (built without frames), K1–K4 (cosmetic, built as designed) and
  O1–O6 (out of scope).
- [spec.md](spec.md) with its Clarifications of 2026-10-29 and 2026-11-01; research R5, R9–R13 and
  R16; [data-model.md](data-model.md); [contracts/personas.md](contracts/personas.md) "messages.ts";
  [contracts/ui-screens.md](contracts/ui-screens.md) "Copy" and "Items from the audit".
- The built copy that the test step reuses: `GROUP_FRAME_COPY` in
  `frontend/src/components/GroupFrame/constants.ts` (a group's header), `findingMessages.ts` in
  `frontend/src/utils/rules/checks/` (the notice, the tab's icon, how counts are phrased), and
  `RULES_COPY.possessive` in `frontend/src/pages/FormConnectionEditor/RulesStep/constants.ts`.
- Spec 002's and spec 003's design notes
  ([../002-connection-rules/design-notes.md](../002-connection-rules/design-notes.md),
  [../003-rule-consistency-checks/design-notes.md](../003-rule-consistency-checks/design-notes.md)),
  which still apply, in particular their §1 (language).

Node ids can change when the file is edited.

**What decides what**: spec.md decides what the test step does and says; Figma decides its look,
changed by the F items; the page around it stays as built (O1–O6). These notes give every text of
the test step with its source, and settle the copy that the decisions leave open (research R13's
nine items, and the chips' keyboard pattern of R16). A text that no decision gives is marked
**Proposed**. `personas/messages.ts` builds every text below that depends on data, and fixed copy
sits in `TestStep/constants.ts` (contracts/personas.md "messages.ts"); their tests pin the
wording.

**Where R13's items are settled**: 1 → §6.2; 2 → §2; 3 → §4.2; 4 → §1.1; 5 → §4.1; 6 → §4.1 and
§5.2; 7 → §8; 8 → §6.3; 9 → §5.3. The chips' keyboard pattern → §3.2.

## 1. Language and conventions

As in spec 002, §1, and spec 003, §1: English, "variant" for a branch, "connection" for a form
connection, the main branch called "Standard" until it is renamed. In addition:
- **Apostrophes are typographic (’)** in every built string: "Mia’s data", "doesn’t meet",
  "Couldn’t be checked", "they’d see". spec.md, data-model.md and contracts/personas.md write
  straight apostrophes; the UI uses ’ (tasks.md "Copy").
- **"Sample applicant"** is the UI's word for a persona ("Choose a sample applicant …", "Creating
  3 sample applicants…"). "Persona" never appears in the UI.
- **Variants** are named by their current names, as the rules step shows them; rules, groups and
  sub-groups too ("Rule 01", "Group 01", "Sub-group 01").
- **Lists** of names read "Mia", "Mia and Anna", "Mia, Anna and Yusuf", without a serial comma,
  as spec 003's `listOf()` writes them (003 §1, W3). Personas in a list follow the chips' order.
- **Numbers** are digits: "2 rules", "age 19", "3 sample applicants".
- **Dates** in the panel and its fields are `dd.mm.yyyy` ("08.07.2007", U01; R12). The test-day
  line uses `formatDate()` ("1 Nov 2026", FR-016, W1).

### 1.1 A persona's names (R13 item 4)

| Text | Uses | Source |
|---|---|---|
| Chip names, announcements | the **full name**: "Mia Schulz: meets the rules of Standard", "Mia Schulz now meets the rules of Standard." | FR-015, FR-017; contracts Copy |
| "Mia’s data", "Rules Mia meets", "Message Mia reads" | the **first name** | FR-004, FR-015; data-model.md `firstName()` |
| "Generate new data for Mia?", "Your changes to Mia’s data …", "Creating new data for Mia…" | the **first name** | U04, U11 7062:51497; contracts Copy |
| The fill run's status (§8) | the **first name** | **Proposed**, as "Creating new data for Mia…" |

- **First name** (data-model.md `firstName()`): the name, trimmed, up to its first space. A name
  without a space is its own first name: "Mia" gives "Mia", "Anna-Lena Roth" gives "Anna-Lena".
  The name is never empty (FR-009), so neither is the first name.
- **Possessive: always ’s**, also after an s: "Jonas’s data", "Your changes to Jonas’s and Mia’s
  data will be replaced.", "Your changes to Hans’s data will be replaced." **Proposed.** Why:
  - the built UI already forms every possessive this way, without a case for a final s
    (`RULES_COPY.possessive`: "Ambulance’s", in the rules step's dialogs), and the test step should
    not bring a second rule;
  - it is what English style guides recommend for singular names (Chicago 7.17), and it is read
    as it is said ("Jonas-iz");
  - the team can rename a persona to anything (FR-009); a rule on the spelling would misjudge names
    such as "Louis" or "Max", and one rule has no exceptions to test.
- Two personas may share a first name after renaming (data-model.md "Rules"). The texts then use
  it as it is ("Your changes to Mia’s and Mia’s data will be replaced."). **Proposed**: nothing
  disambiguates, as the chips show the full names right above.

## 2. Variant tabs (S8.2; FR-018, F6, O4)

| Element | Text | Source |
|---|---|---|
| Tab | the variant's name | S8.2 |
| Tooltip's finding segment | "No applicant can meet the rules of Standard."; when it holds only for applicants who share today, "Right now, no applicant can meet the rules of Standard." | FR-018, F6; spec 003's `noticeText()` (R5), 003 §3.2 and A7 |
| **Warning icon's accessible name** (R13 item 2) | "Standard has findings" | **Proposed**: spec 003's name for the same icon (003 §4, `tabLabelOf()`) |

- The tab uses `BranchName` with one finding segment, the notice, as contracts/ui-screens.md S8.2
  says. `BranchName` names its findings icon with `tabLabelOf()`, so the test step's icon reads
  as it does on the rules step: the same icon, on the same variant, has the same name in both
  steps. The tooltip is the icon's description, so a screen reader reads "Standard has findings",
  then "No applicant can meet the rules of Standard." No new text and no change to `BranchName`.
- With a description, the tooltip shows it first, then the segment below its divider, as on the
  rules step (003 §4). The (i) of a variant without the notice stays "About Standard" (spec 002).
- The notice text comes from `noticeText()` unchanged (R16, "Exporting `noticeText()` … without
  changing its wording"). contracts/ui-screens.md quotes only its first form; the "Right now, …"
  form follows from reusing it.

## 3. Applicants row (S8.3; FR-004, FR-012, FR-015, W9)

### 3.1 Texts

| Element | Text | Source |
|---|---|---|
| Chip's visible text | the full name, "Mia Schulz" | U01 |
| Chip's accessible name | "Mia Schulz: meets the rules of Standard" / "Mia Schulz: doesn’t meet the rules of Standard" | FR-015; contracts Copy |
| Chip of a persona with no result for the variant (being generated, §8) | "Mia Schulz", the name alone | **Proposed** |
| The chips' group (tab list) name | "Sample applicants" | **Proposed**, from the intro's "sample applicant" |
| Button | "Generate all again" | FR-012, W9 |

### 3.2 Keyboard pattern of the chips (R16) — confirmed by T056 for the browser, screen readers pending

**Decision: tabs inside the variant's tab panel.** The chips are a tab list, named "Sample
applicants", inside the selected variant's tab panel. Each chip is a tab; exactly one is selected
(`aria-selected="true"`), the first by default. The persona panel ("Mia’s data" and the results)
is the tab panel the chips control, labelled by the selected chip.
- **Keys**, as the variant tabs (WAI-ARIA tab pattern, `BranchTabs.tsx`): one tab stop on the
  selected chip; Left and Right move to the previous and next chip, wrapping; Home and End to the
  first and last. Selection follows focus (automatic activation), since showing another persona
  costs nothing and refuses nothing.
- **"Generate all again"** sits after the tab list in the tab order, outside it.
- **Why tabs, not a radio group**:
  - choosing a chip changes what the panel next to it shows, which is what a tab means, and the
    tab pattern ties the chip to that panel (`aria-controls`); a radio group chooses a value, and
    has no tie to the content that changes;
  - a screen reader announces "selected", which matches the chip's selected look; a radio announces
    "checked", as for a form's answer, which nothing submits here;
  - both chip rows of the step (variants and applicants) then work alike, with the same keys.
- **What T032 and T056 check** (R16): with NVDA and Firefox, and with VoiceOver and Safari, that a
  tab list inside another tab list's panel is announced clearly, and that each chip's name with its
  outcome is read on arrow keys. If the nesting confuses, the fallback is a radio group named
  "Sample applicants" with the same names, the same arrow keys and the same order. T056 records
  the result here.
- **T056's result (2026-11-03, Chromium, keyboard and accessibility tree): the pattern is
  confirmed, unchanged.** Checked:
  - the tree reads `tablist "Variants"` > `tab` > `tabpanel "Standard"` > `tablist "Sample
    applicants"` > `tab "Ioana Russo: doesn’t meet the rules of Standard"` > `tabpanel` labelled by
    the selected chip; the chips' names carry their outcomes, and the name is the name alone while
    a persona is generated;
  - one tab stop on the selected chip and on the selected variant tab; Left, Right (wrapping),
    Home and End move and select; Up and Down do nothing; the panel's `aria-labelledby` follows
    the selected chip; selecting a chip announces nothing;
  - `axe-core` 4.12 (WCAG 2.2 AA and best practice) reports no violation in read mode, edit mode
    with an invalid field, and with the dialog open.
  - **Still pending, as no screen reader runs in the test environment**: that NVDA with Firefox
    and VoiceOver with Safari announce the nested tab lists clearly (a tab inside a panel of
    another tab list), and read each chip's name on the arrow keys. The pattern stays unless one of
    them confuses; then the fallback above applies, with these same names and keys. The list of
    what a human checks is in T056's report.

## 4. Persona panel, read mode (S8.4; FR-004–FR-007, F9–F11, K1, K2)

### 4.1 Texts

| Element | Text | Source |
|---|---|---|
| Head | "Mia’s data" (first name, §1.1); "Edit data"; "Generate again" | FR-004; U01 7057:58770, 7057:58771 |
| Document headings | "Personal ID", "Driving licence" | F9; U02 7058:60654, 7058:60659 |
| Labels | as the rules name the field, without the document: "Date of birth (Age)", "Licence classes", "Licence class B – Issue date" | FR-005, F9, F11 (R3 `dataOfResolved()`) |
| A date | "08.07.2007" | U01 |
| A date of birth | "08.07.2007 (age 19)" | FR-007, F10 |
| A date of birth that gives age 0 (born within the last year, or today) | "01.11.2026 (age 0)" | as `ageOn()` counts (data-model.md) |
| **A date of birth in the future** (R13 item 6) | "01.01.2030 (not born yet)" | **Proposed** |
| Licence classes | the codes, "B, BE", in the licence-class set's order | F11; order **Proposed** (as R3 orders the class dates) |
| Several values of another set | the labels, "German, Italian", in the value set's order | **Proposed**, as "B, BE" |
| One value of a set | its label, "German" | FR-006 |
| Text, number | as stored, "Stuttgart", "3" | FR-006 |
| **An empty value** (R13 item 5) | "Not shared" | Figma U01 7057:59599 (Yusuf's licence classes and expiry date); S8.4 |

- **"Not shared"** stands for every empty value (`null`, `''`, `[]`; data-model.md "Persona
  value"), whatever the field's kind. An empty date of birth shows "Not shared" without an age. An
  empty "Licence classes" shows "Not shared", and no class date row shows, since no class is held
  (FR-005). A held class whose date is empty shows "Not shared" in that date's row (EC "A class
  without an expiry date of its own").
- **A future date of birth** (EC "Unlikely values"): `ageOn()` would give a negative number, which
  isn't an age. The suffix says what the evaluator's rules will find: no age yet. The rules still
  evaluate the date as it is (FR-014). The suffix keeps the brackets of " (age 19)", so the
  `ageSuffixOf()` of contracts/personas.md gives either form.

### 4.2 Hidden texts (R13 item 3)

| Marker | Visible | Hidden text for screen readers | Source |
|---|---|---|---|
| Failing value (K1) | Figma's red dot before the value, and the value in bold | "Fails a rule:" before the value, at the dot | **Proposed**; Figma's layer name "Failing rule dot" (U01 7057:59074) |
| Changed value (K2) | "· edited" after the value | ", edited" after the value, in place of the visible "· edited", which is hidden from screen readers | **Proposed**; Figma U03 7058:61193 |

- Read in order, a row gives "Date of birth (Age): Fails a rule: 08.07.2004 (age 22), edited".
- **K1** marks the values that the selected variant's rows show as failing, "Not met" and
  "Couldn’t be checked" alike (R5, "Failing values"), so one text covers both: "Not shared" with a
  dot reads "Fails a rule: Not shared". It goes before the value, as spec 003's hidden kind texts
  go before the note they mark ("Conflicting:", 003 §1), and where the dot is.
- **K2**: the visible middle dot is a separator, which some screen readers read as "dot"; the
  hidden ", edited" keeps the word and drops the symbol. It shows while the value differs from its
  generated value (data-model.md `changedKeys()`), so editing a value back removes it.

## 5. Persona panel, edit mode (S8.5; FR-006–FR-009, F1, F10, F12, W4, W11, W12)

### 5.1 Texts

| Element | Text | Source |
|---|---|---|
| Head | "Mia’s data"; "Done" in place of "Edit data"; "Generate again" | FR-006, F1 |
| Fields | "Name"; one per value shown, labelled as in read mode, under the same headings; "Age today" next to each date of birth | FR-006, FR-007, F1, F10, F12, W12 |
| Date error | "Enter a date that exists, e.g. 28.02.2007." | FR-008; U02 7058:60812 |
| Whole-number error | "Enter a whole number, e.g. 25." | FR-008, W11 |
| Name error | "Enter a name." | FR-009, W11 |
| **"Age today" that gives no date of birth** (R13 item 6) | "Enter a smaller age, e.g. 25." | **Proposed** |

### 5.2 "Age today" (R13 item 6)

- **Its value**: the age the date of birth gives today (`ageOn()`); empty while the date of birth
  is empty or in the future (§4.1). **Proposed.**
- **Too large an age**: an age so large that the date of birth it gives, keeping its day and month
  (`dateOfBirthForAge()`), would fall before 1 January of year 1 shows "Enter a smaller age, e.g.
  25." under "Age today", and the date of birth stays its last valid value (FR-008). It follows the
  pattern of the other errors ("Enter …, e.g. …"), and names no limit, since the limit depends on
  today and on the day and month kept. Any age that gives a date in year 1 or later is accepted, so
  "200" works (EC "Unlikely values"). **Proposed.**
- Letters, decimals and a minus sign give "Enter a whole number, e.g. 25." (contracts/personas.md
  `parseWholeNumber()`). A date field with year 0000 gives "Enter a date that exists, e.g.
  28.02.2007.".
- With an empty date of birth, "Age today" gives a date of birth with today's day and month.
  **Proposed** (`dateOfBirthForAge()` has no day and month to keep).

### 5.3 Leaving edit mode (R13 item 9)

- **"Done" drops the invalid drafts.** A field that shows an error is reset: its error goes, and
  the value stays its last valid one, which the results have used all along (FR-008). The valid
  changes applied when they were made, so "Done" changes no value and announces nothing. The focus
  moves back to "Edit data" (contracts/ui-screens.md "Accessibility"). **Proposed** (R12: "'Done'
  drops the invalid ones").
- An invalid name is dropped the same way: the persona keeps its name (FR-009).
- **Switching persona or variant ends edit mode**, as "Done" does, dropping the invalid drafts.
  The focus stays on the chip or tab that was chosen. The newly selected persona's panel opens in
  read mode (R12 "Scope"; data-model.md `select`, `selectBranch`).
- **Also ending edit mode**, the same way (**Proposed**): generating the edited persona anew
  ("Generate again", or "Generate all again", once confirmed), since its panel becomes a
  placeholder (FR-013); and leaving the step, since the drafts are the panel's own and go with it.
  Editing the persona ends nothing else.

## 6. Results (S8.6; FR-014, FR-015, FR-018, F3, F6, F8, F14, W10)

### 6.1 Texts

| Element | Text | Source |
|---|---|---|
| Notice above the heading | "No applicant can meet the rules of Standard." / "Right now, no applicant can meet the rules of Standard." | FR-018, F6; `noticeText()` (§2) |
| Heading | §6.3 | FR-015, W10 |
| Columns, variant not met | "Rule", "Message Mia reads" | U01 7057:58825; FR-015 |
| List heading, variant met | "Rules Mia meets"; no message column | F3, F14; U01 7057:59239 |
| Statuses | "Not met", "Couldn’t be checked" (a group is only ever "Not met") | FR-015, F8; R5 |
| Message cell of a row without a message | "–" | F14 |
| Rule's statement | as the rules step words it (`statementOf()`, `RuleSentence`) | FR-015; R5 |
| Group's statement | §6.2 | **R13 item 1** |
| Variant without rules | "School transport has no rules yet, so every applicant meets it. Add rules in the Rules step to test them." | U06; EC "A branch without rules" |

### 6.2 A group's statement (R13 item 1)

A group's or sub-group's row reuses the subtitle of its header on the rules step
(`GROUP_FRAME_COPY.subtitles`, Figma "Rules/Group header" U14 6094:6413, 6094:6320; R16):

| Group's operator | Statement |
|---|---|
| AND | "All of these must be true" |
| OR | "At least one of these must be true" |

- The same for a reported group, a group listed with its outcome, and a sub-group listed indented
  under a reported group. The wording is taken over word for word, without a full stop, as the
  header has none; the result rows import the constant rather than copying it.
- The name in front ("Group 01") says which group; its members are on the rules step, and a
  reported group's members that aren't met follow it, indented (W10).

### 6.3 The heading's counts (R13 item 8)

`resultHeadingOf()` (contracts/personas.md):
- **Met**: "Result: meets the rules" (U01 7057:59225; FR-015). Also for a variant without rules.
- **Not met**: "Result: doesn’t meet " followed by the count, then nothing (no full stop, as
  Figma's headings):
  - **What is counted**: the reported items, one per message the evaluation gives (FR-014,
    FR-015, W10). The count is what serviceBW would receive.
  - **Rule or group**: by the reported item's type. A sub-group that is reported counts as a group.
  - **A reported group counts as one** (FR-015, W10). The rules and sub-groups listed indented
    under it, because they aren't met, aren't counted: they count as their reported group.
  - **A group that isn't met without being reported** (it has no message of its own) isn't
    counted. Its reported members are, by their own type.
  - **Phrase**: rules before groups, joined with "and"; a part with nothing is left out; "1 rule",
    "2 rules", "1 group", "2 groups". This is how spec 003 phrases its counts (`itemsPhrase()` in
    `findingMessages.ts`, 003 §3.4).
  - A variant that isn't met always has at least one reported item: a saved group has at least two
    members, one that isn't met has a member that isn't met, and every rule has a message
    (`evaluate_branch()`). So there is no "doesn’t meet 0".

| Reported | Heading | Source |
|---|---|---|
| 1 rule | "Result: doesn’t meet 1 rule" | U03 7058:61027 |
| 2 rules | "Result: doesn’t meet 2 rules" | U01 7057:58811, U07 7058:61454 |
| 1 rule, 1 group | "Result: doesn’t meet 1 rule and 1 group" | FR-015; contracts Copy |
| 2 groups, no rule | "Result: doesn’t meet 2 groups" | tasks.md T001 item 8; **Proposed** rule |
| 2 rules, 3 groups | "Result: doesn’t meet 2 rules and 3 groups" | **Proposed** rule |
| 1 group, no rule | "Result: doesn’t meet 1 group" | **Proposed** rule |

### 6.4 Worked examples

Standard's top level is AND unless said otherwise.
- **U07**: Rule 01 and Rule 02 not met. Rows: Rule 01, Rule 02 (reported, "Not met", messages),
  then Rule 03 and Rule 04 (check icon, "–"). "Result: doesn’t meet 2 rules".
- **A group with a message**: Group 01 (AND, message "You need …") not met because Rule 03 is not
  met and Sub-group 01 is not met. Rows: Group 01 ("All of these must be true", "Not met", its
  message), indented under it Rule 03 and Sub-group 01 ("At least one of these must be true",
  "Not met"), each without a message; then the other top-level items. "Result: doesn’t meet 1
  group".
- **A group without a message**: Group 01 (OR, no message) not met, because Rule 03 and Rule 04
  both aren't. The evaluation reports Rule 03 and Rule 04. Rows: Rule 03, Rule 04 (reported, with
  their messages), then Group 01 among the other top-level items, "Not met" and "–", without
  members. "Result: doesn’t meet 2 rules".
- **A reported sub-group**: Group 01 (AND, no message) not met, because Sub-group 01 (with a
  message) and Rule 05 aren't met. The evaluation reports Sub-group 01 and Rule 05. "Result:
  doesn’t meet 1 rule and 1 group".
- **Groups only**: Group 01 and Group 02, each with a message, not met; every rule met.
  "Result: doesn’t meet 2 groups".
- **A rule on an empty value**: Rule 03 on an empty expiry date, "Couldn’t be checked", reported
  with its message; it counts like a rule that isn't met. "Result: doesn’t meet 1 rule".
- **Met**: Anna meets Standard. "Result: meets the rules", the list "Rules Anna meets" with every
  top-level item, no message column (U01, F3).
- **No applicant can meet Standard**: "No applicant can meet the rules of Standard." above
  "Result: doesn’t meet 2 rules" (U07, F6), and the tab's warning icon (§2).

## 7. Questions before generating anew (S8.7; FR-012, U04, W9)

| Question | Title | Body | Buttons | Source |
|---|---|---|---|---|
| One persona with changes | "Generate new data for Mia?" | "Your changes to Mia’s data will be replaced. The other two applicants stay as they are." | "Cancel", "Generate new data" | U04 7058:61334 |
| All, one persona with changes | "Generate new data for all applicants?" | "Your changes to Mia’s data will be replaced." | "Cancel", "Generate new data" | FR-012, W9 |
| All, two with changes | the same | "Your changes to Mia’s and Anna’s data will be replaced." | the same | FR-012, W9 |
| All, three with changes | the same | "Your changes to Mia’s, Anna’s and Yusuf’s data will be replaced." | the same | **Proposed**, the list of §1 |

- First names, each with ’s (§1.1), in the chips' order, only the personas with changes.

## 8. Loading and status texts (S8.8; FR-004, FR-012, FR-013, FR-020, U11; R13 item 7)

One status at the right end of the applicants row (`role="status"`, polite), chosen by the run's
slots (data-model.md `GenerationRun`):

| Run | Status | Source |
|---|---|---|
| All three slots free: first open, "Generate all again", "Try again" | "Creating 3 sample applicants…" | U11 7062:51210 |
| One slot free, the others kept | "Creating new data for Mia…" | U11 7062:51497 |
| Two slots free (one request merged into a running one, R9) | "Creating new data for Mia and Anna…" | **Proposed** |
| **Filled slots** (fill after returning from the rules step, FR-020), one | "Adding new data for Mia…" | **Proposed** |
| Filled slots, two | "Adding new data for Mia and Anna…" | **Proposed** |
| Filled slots, three | "Adding new data for Mia, Anna and Yusuf…" | **Proposed** |
| Free and filled slots in one merged run | "Creating new data for Yusuf. Adding new data for Mia…" | **Proposed** |

- **"Adding", not "Creating"**, for a fill: it gives values only for data that rules check now and
  the persona has none for, and changes no value it has (FR-020). "Creating new data" would sound
  like "Generate again", which replaces the data.
- First names, in the chips' order, listed as in §1.
- The ellipsis is the single character "…", as in Figma.
- The status is empty without a run, so that a new run's text is announced when it starts.

## 9. Failure and announcements (S8.9, S8.10; FR-013, FR-017, F2, F7)

| Element | Text | Source |
|---|---|---|
| Failure title | "Couldn’t create sample applicants" | FR-013, F7; U12 7062:51783 |
| Failure hint | "Try again, or publish without testing." / "Try again, or save without testing." when editing | FR-013, F7 |
| Failure button | "Try again" | U12 7062:51785 |
| Announcement | "Mia Schulz now meets the rules of Standard." / "Mia Schulz no longer meets the rules of Standard." | FR-017, F2 |
| Test-day line | "Tested as if shared today, 1 Nov 2026." | FR-016, W1 |
| Page title, hint | "Test rules" / "Choose a sample applicant to see which rules they meet and which messages they’d see. The data is made up, and nothing is shared." | FR-004 |
| Footer | "Back"; "Publish" / "Save" | FR-003, F13 |

- Several changes from one edit go in one announcement, in tab order, joined with a space
  (data-model.md "Announcements").

## 10. Tokens (T002)

`get_variable_defs` on the section `7057:58708` ("Test · 1 · Test rules") returns 82 entries: 71
variables, 9 text styles and 2 effects. Every variable is one that spec 002 §9 has already mapped,
by name or by group (`metric-dimension-*`, `metric-border-width-*`, `metric-baseline-*`); spec 003
§7 adds nothing this section needs. As there, the file binds KERN's names with the values of the
unreleased "Revamp", and the UI uses the KERN 2.8 token of the same name with KERN 2.8's value
(decision 2026-10-25, spec 002 §9). A value that differs only for that reason is listed in a visual
check as "KERN 2.8 vs Revamp", not fixed (research R15).

What is new here is not a variable but four raw values that Figma draws without one (the selected
chip's outline, the skeleton's two greys and the loading ring), settled below in §10.3. **No token is added** to `@theme`.

### 10.1 What the section binds

| Group | Variables | KERN 2.8 |
|---|---|---|
| Spacing | `metric-space-none` 0, `-x-small` 4, `-small` 8, `-default` 16, `-large` 24, `-x-large` 32, `-5x-large` 64, `-10x-large` 160 | same |
| Dimensions | `metric-dimension-small` 20, `-default` 24, `-x-large` 48, `-3x-large` 64 | same (`-3x-large` is new to the rules screens; KERN 2.8 has it at 64) |
| Borders | `metric-border-width-none` 0, `-light` 1, `-default` 2, `-bold` 4 | same (`-none` and `-bold` are new to the rules screens; KERN 2.8 has 0 and 4) |
| Baselines | `metric-baseline-title-large-padding-*` 7/9, `-label-default-*` 6/2, `-body-default-*` 6/2, `-body-large-*` 1/7 | same |
| Radii | `none` 0, `small` 4, `default` 8, `large` 12, `circle` 9999 | KERN 2.8 vs Revamp: 0, 2, 4, 8, 50 % (spec 002 §9) |
| Type | `heading/large`, `title/large`, `title/small`, `label/default`, `label/small`, `body/large/regular`, `body/default/regular`, `body/small/regular`; weights `body` 400, `title` / `label` / `heading` 600 | KERN 2.8 vs Revamp for `small-static` 14 (16), `large-static` 18 (21, line height 24 → 32), `large-adaptive` 24 (26); the rest same (spec 002 §9) |
| Font family | `typography-font-family-default` "Fira Sans" | `--kern-typography-font-family-default` (Fira Sans), already the app's `--default-font-family` in `@theme` |
| Effects | `Elevation/Card`, `Elevation/Menu` | `--shadow-card`, `--shadow-menu` (spec 001, spec 002 §9) |
| Opacity | `action-state-opacity-overlay` 72 | same (KERN's dialog backdrop) |
| Grid | `metric-grid-col-overflow-6` 1536 | the dialogs' `max-width`, set by KERN's dialog (spec 002 §9) |

The table head of the results (`7057:58826`) and the tab's tooltip are `body/small/regular`, 14 px
in Figma. Spec 003's 14 px exception (§7, "Font size") covers only the rules step's notes, so here
the general rule holds: KERN 2.8's 16 px, listed as "KERN 2.8 vs Revamp".

### 10.2 Colours

Every colour is in spec 002 §9's table. `-contextual` and plain names map to the same token. The
ones the test step uses:

| Figma variable | Figma (Revamp) | Token (Tailwind class) | KERN 2.8 | Used for (node) |
|---|---|---|---|---|
| `layout-text-default(-contextual)`, `action-state-indicator-shade` | #0b1220 | `--kern-color-layout-text-default` (`text-kern-layout-text-default`) | #131525 | chip names (`7057:58757`), rule names, values, messages |
| `layout-text-muted(-contextual)` | #4a5468 | `--kern-color-layout-text-muted` (`text-kern-layout-text-muted`) | #51577a | results table head (`7057:58826`), "–" in the message column |
| `layout-text-inverse(-contextual)` | #ffffff | `--kern-color-layout-text-inverse` | #f3f4f7 | tab tooltip text (`7058:61632`), see `layout-background-inverse` |
| `layout-background-default(-contextual)` | #ffffff | `--kern-color-layout-background-default` (`bg-kern-layout-background-default`) | #ffffff | chips, cards |
| `layout-background-hued`, `layout-layer-surface-contextual` | #f2f5fb | `--kern-color-layout-background-hued` (`bg-kern-layout-background-hued`) | #f3f4f7 | the variant's area behind the chips (`7057:58754`) |
| `decorative-border-default`, `decorative-border-contextual` | #e1e6f0 | `--kern-color-decorative-border-default` (`border-(--kern-color-decorative-border-default)`, no Tailwind class) | #c0c3d5 | unselected chip's 1 px outline (`7057:58758`), skeleton pill (`7062:51206`), row dividers |
| `layout-border(-contextual)` | #6b7488 | `--kern-color-layout-border` | #6e7597 | KERN inputs in edit mode |
| `form-input-border-contextual` | #22293a | `--kern-color-form-input-border` | #1d2034 | KERN inputs in edit mode (set by KERN) |
| `action-default(-contextual)` | #1d56f0 | `--kern-color-action-default` (`text-kern-action-default`) | #2044aa | "Edit data", "Generate again" (tertiary buttons), selected tab indicator |
| `action-on-default-contextual` | #ffffff | `--kern-color-action-on-default` | #ffffff | primary button text (set by KERN) |
| `feedback-danger(-contextual)` | #c4271c | `--kern-color-feedback-danger` (`bg-kern-feedback-danger`) | #c31c13 | "not met" icon on chips (`7057:59056`) and rows (`7057:59088`); failing-value dot (`7057:59074`) |
| `feedback-danger-background-contextual` | #fef1f0 | `--kern-color-feedback-danger-background` | #fee4e0 | KERN's danger alert / field errors in edit mode (set by KERN) |
| `feedback-success(-contextual)` | #1d7a2e | `--kern-color-feedback-success` (`bg-kern-feedback-success`) | #007155 | "met" icon on chips (`7057:59061`) and rows (`7057:59106`) |
| `feedback-success-background-contextual` | #eaf7e6 | `--kern-color-feedback-success-background` | #cdf2e4 | KERN's success alert, if used (set by KERN) |
| `feedback-warning` | #9a4a00 | `--kern-color-feedback-warning` (`bg-kern-feedback-warning`) | #925400 | the tab's warning icon (`I7058:61618;6529:39178`) |
| `feedback-info(-contextual)`, `feedback-info-background-contextual` | #0284c7 / #e0f2fe | `--kern-color-feedback-info(-background)` | #006b8c / #c0f3ff | KERN's info alert (set by `kern-alert--info`) |
| `layout-background-inverse` | #0b1220 | none in KERN 2.8. It is the dark tab tooltip (`7058:61632`). The tab keeps the tooltip spec 003 built (`InfoTooltip` with `BranchName/FindingsSegment`, 003 §4), so nothing new is needed | – | – |

All of these are KERN 2.8 tokens; every value differs only as "KERN 2.8 vs Revamp" except
`layout-background-default` and `action-on-default` (#ffffff in both).

### 10.3 Values without a variable

Figma draws four values raw (from `get_design_context`). Each maps to an existing token; none
needs a new one.

| Where (node) | Figma | Token (Tailwind class) | KERN 2.8 | Why |
|---|---|---|---|---|
| Selected chip's 2 px outline (`7057:58755`, `7062:51295`) | #1d56f0 | `--kern-color-action-default` (`border-kern-action-default`) | #2044aa | Figma's raw value is exactly Revamp's `action-default`; "KERN 2.8 vs Revamp" |
| Skeleton, strong bars: titles, rule names, the 16 px icon placeholders (`7062:51212`, `7062:51227`, `7062:51230`…) and the loading ring's track (`7062:51495`, stroke 2) | #e4e8ef | `--kern-color-feedback-default-background` (`bg-(--kern-color-feedback-default-background)`, `border-(--kern-color-feedback-default-background)`; no Tailwind class) | #dfe1ea | the colour of KERN 2.8's own loader track (`.kern-loader`), the nearest semantic grey |
| Skeleton, light bars: labels and messages (`7062:51215`, `7062:51233`…) | #eff1f5 | `--kern-color-layout-background-hued` (`bg-kern-layout-background-hued`) | #f3f4f7 | the nearest semantic grey (KERN's neutral-025) |
| Skeleton pill (`7062:51206`) | white, 1 px #e1e6f0 (bound) | `bg-kern-layout-background-default`, `border-(--kern-color-decorative-border-default)` | #ffffff / #c0c3d5 | the unselected chip's look, "KERN 2.8 vs Revamp" for the border |

The skeleton's bars have a raw radius of 4 px, which is KERN 2.8's `default`
(`rounded-kern-default`); the 16 px icon placeholders have 8, a circle (`rounded-kern-circle`). Figma's loading ring (`7062:51495`, 16 px) is a static track with no
arc; the UI task that builds it adds the arc in `action-default`, as spec 001's `FeedbackLoader`
does, and stops spinning under `prefers-reduced-motion` (proposed).

### 10.4 Icons (research R15)

KERN 2.8.2 (`@kern-ux/native/dist/kern.css`) ships every glyph the step needs as a mask icon, and
the Figma instances are KERN's own icons (`icon-*-small`, KERN component docs), so the step uses
`kern-icon` classes at `kern-icon--small` (20 px, `metric-dimension-small`) and needs **no new SVG**.
A mask icon takes its colour from a `bg-*!` class, as `ProblemNote` and `FindingNote` do.

| Icon | Class | Colour | Figma (component) | Shape |
|---|---|---|---|---|
| Chip: meets the variant | `kern-icon kern-icon--success kern-icon--small` | `bg-kern-feedback-success!` | `7057:59061` in chip `7057:58758` (`icon-check_circle-small` `6008:19342`) | filled check circle |
| Chip: doesn't meet the variant | `kern-icon kern-icon--danger kern-icon--small` | `bg-kern-feedback-danger!` | `7057:59056` in chip `7057:58755` (`icon-emergency_home-small` `6008:19364`) | filled diamond with "!" |
| Chip while its persona is generated | the loading ring (above), 16 px, in place of the icon | track `feedback-default-background`, arc `action-default` | `7062:51495` (icon `7062:51296` hidden) | ring |
| "Generate again" (and W9's "Generate all again") | `kern-icon kern-icon--autorenew kern-icon--small` | KERN's tertiary button colour | `I7057:58771;1914:12733` (`icon-autorenew-small`) | two arrows in a circle |
| "Edit data" | `kern-icon kern-icon--edit kern-icon--small` | KERN's tertiary button colour | `I7057:58770;1914:12733` (`icon-edit-small`) | pencil, as spec 002's "Edit" |
| Result row status "Not met" (F8) | `kern-icon kern-icon--danger kern-icon--small` | `bg-kern-feedback-danger!` | `7057:59088`, `7057:59097` in `7057:58825` (`icon-emergency_home-small`) | filled diamond with "!" |
| Result row status "Couldn't be checked" (F8) | `kern-icon kern-icon--help kern-icon--small` (proposed) | `bg-kern-layout-text-muted!` (proposed) | no frame: F8 asks for an icon of its own. Figma draws these rows with the failed icon (`7057:59925`, `7057:61231`) | circled "?", outlined |
| Result row: met rule or group (F14) | `kern-icon kern-icon--success kern-icon--small` | `bg-kern-feedback-success!` | `7057:59106`, `7057:59115` in `7057:58825` (`icon-check_circle-small`) | filled check circle |
| Tab: no applicant can meet the variant (F6) | `kern-icon kern-icon--warning kern-icon--small`, as spec 003's tab icon (`BranchName/constants.ts` `FINDINGS_ICONS.warning`) | `bg-kern-feedback-warning!` | `I7058:61618;6529:39178` (`icon-warning-small`) | triangle with "!" |
| Failing value (K1) | no icon: a 6 px dot, `size-6 rounded-kern-circle bg-kern-feedback-danger`, beside the bold value, with hidden text (§4.2) | `feedback-danger` | `7057:59074` (ellipse 6 × 6, y 9) | dot |

The three status shapes differ (check circle, diamond, circled "?"), so the outcome never rests on
colour alone (FR-015a, F8). "Couldn't be checked" takes the muted, non-alarming colour because the
rule didn't fail: it couldn't be judged. Spec 003's `kern-icon--info` is avoided there, since the
rules step's notes already use it for "redundant" and "always met".

The repo's `emergency-home.svg` (spec 001's field errors) has the same path as Figma's
`icon-emergency_home-small` in KERN 2.8's danger red, and `check-circle.svg` (the sign-in
illustration) is a different check circle at #007155. The step uses the KERN classes instead,
which are the same glyphs as Figma's and take their colour from tokens.

### 10.5 Contrast (WCAG 2.1)

| Foreground | On | Ratio | Needs |
|---|---|---|---|
| `feedback-danger` #c31c13 (icon, dot) | white / `layout-background-hued` #f3f4f7 | 6.0:1 / 5.5:1 | 3:1 (graphics) |
| `feedback-success` #007155 (icon) | white / #f3f4f7 | 6.0:1 / 5.5:1 | 3:1 |
| `layout-text-muted` #51577a (icon, table head) | white / #f3f4f7 | 7.0:1 / 6.4:1 | 3:1 icon, 4.5:1 text |
| `feedback-warning` #925400 (tab icon) | white / #f3f4f7 | 6.0:1 / 5.5:1 (spec 003 §7) | 3:1 |
| `action-default` #2044aa (selected chip outline) | white / #f3f4f7 | 8.5:1 / 7.7:1 | 3:1 (non-text) |

The skeleton's greys are decorative placeholders, hidden from assistive technology (the status
line announces the loading), so they need no contrast. The failing-value dot carries meaning by
colour and the value's weight only, so it gets hidden text (K1, §4.2).
