# Contract: management UI screens, with the test step

**Users**: signed-in DO.IT team members (FR-021). **Requirements**: FR-001 to FR-018, SC-003 to
SC-005, SC-007; US1 to US3. **Decisions**: research R5, R9 to R13 and R15; the spec's
Clarifications of 2026-10-29 and 2026-11-01; the Figma audit of 2026-11-01
([../figma-audit/report.md](../figma-audit/report.md)).

This extends the screen contracts of spec 002
([../../002-connection-rules/contracts/ui-screens.md](../../002-connection-rules/contracts/ui-screens.md))
and spec 003
([../../003-rule-consistency-checks/contracts/ui-screens.md](../../003-rule-consistency-checks/contracts/ui-screens.md)),
which still apply. It reuses their screen ids (S0 wizard shell, S1 documents step, S2 rules step,
S5 publish and save dialog, S7 edit flow) and adds **S8, the test step**. No route changes: the
test step is a step of the wizard at `/form-connections/new`, `/get-started` and
`/form-connections/:id/edit`.

**What decides what**: spec.md decides what the test step does. Figma section "Test · 1 · Test
rules" (node `7057:58708` of file `s8mU9oJDq3411e8bxMjQO9`, frames 1–20 in units U01–U12) decides
its look and layout, except where an F item below says that Figma must change. W items are built
without frames, and K items are built as designed. **The page around the step stays as built**
(O1–O6). The file binds KERN's names to an unreleased KERN ("Revamp"): use the KERN 2.8 token of
the same name, and list a value that differs only for that reason as "KERN 2.8 vs Revamp"
(CLAUDE.md, `docs/FIGMA-WORKFLOW.md`).

| Unit | Frames | What it shows |
|---|---|---|
| U01 | 1–3 | Standard, with Mia, Anna and Yusuf selected in turn |
| U02 | 4–5 | Figma's edit dialog: **replaced** by editing in the panel (F1) |
| U03 | 6 | After "Save and test": **replaced** (F1, F2); its "· edited" marker stays (K2) |
| U04 | 7 | The question before generating one persona anew |
| U05 | 8–10 | Ambulance, with the selection kept |
| U06 | 11–13 | A variant without rules |
| U07 | 14 | A variant that no applicant can meet |
| U08 | 15 | Many rules: only the panel scrolls |
| U09 | 16 | The publish dialog from the test step: its "Back to test" is **changed back** (F4) |
| U10 | 17 | The edit flow: "Publish changes" becomes "Save" (F13) |
| U11 | 18–19 | Loading on first open, and while one persona is generated anew |
| U12 | 20 | Generation failed |

---

## Screens and behaviour

### S0. Wizard shell

- The progress has five entries: Connection, Documents, Rules, **Test**, Publish (FR-001). The test
  step is current while it is shown. Finished steps lead back, as today. Figma's compact "Step 4 of
  4" header is the redesign's (O2).
- The header's title, the breadcrumb and the action bar's look stay as built (O1).

### S1. Documents step

- Unchanged: "Add rules →", and "Publish without rules" ("Save without rules" when editing) while no
  branch has any rule, which skips the rules and test steps (FR-001, W2).

### S2. Rules step: its button to go on (W2, W3, W8)

- **One button to go on.** It reads "**Test rules**" (primary, with the forward arrow) while any
  branch has a rule or a rule editor is open. Otherwise it reads "Publish without rules" ("Save
  without rules" when editing), which opens the publish and save dialog as today and skips the test
  step (FR-001, FR-003). There's no "Publish" or "Save" on the rules step any more.
- **The question first** (W8): with unsaved editor changes, "Test rules" first asks the editor's
  existing question, such as "Save changes to Rule 01?" (FR-002). If the answer leaves no rule, the
  team member stays in the rules step, whose button then reads "Publish without rules" (EC "The
  first rule discarded").
- **Refused like publishing** (W3): "Test rules" is refused with publishing's message, shown where
  publishing shows it and naming the rule and the variant, while a rule is incomplete, has no
  message or checks data that isn't requested, or a variant's name is invalid (FR-002). The focus
  moves to the rule, as for publishing.

### S5. Publish and save dialog

- Opened from the test step by "Publish" ("Save" when editing), **unchanged** (FR-003, F4): "Ready
  to publish?" or "Ready to save?", its lines and spec 003's findings lines. Its secondary action
  stays "**Check rules again**": it closes the dialog and opens the rules step at the first variant,
  in tab order, with findings, or at the rules step's open variant when none has any. Figma's "Back
  to test" isn't built.
- The personas' results add nothing to it and refuse, delay or disable nothing (FR-003). A failed
  publish or save closes nothing: the test step and its personas stay as they were (FR-019).

### S7. Edit flow

- The test step's primary button reads "**Save**" (F13). The rules step's reads "Save without
  rules" when there are no rules. The failure hint reads "Try again, or save without testing."

### S8. Test step

The step's content sits in the wizard frame (S0), under the page title "Test rules" and its hint,
the intro (FR-004): "Choose a sample applicant to see which rules they meet and which messages
they'd see. The data is made up, and nothing is shared." The action bar has Back (to the rules step)
and "Publish" ("Save" when editing). Neither ever waits for generation (FR-013).

**S8.1 Test-day line** (FR-016, W1): "Tested as if shared today, 1 Nov 2026.", today's date in
Germany as `formatDate()` writes it, as the first line of the content, directly under the intro.
It shows whenever results are shown, including while one persona is generated anew, and is hidden
during the first generation and in the failure state.

**S8.2 Variant tabs** (FR-015, FR-018, F6):
- One tab per variant, by its name, in the rules step's tab order. When the step opens, the rules
  step's open variant is selected.
- A variant that no applicant can meet carries a **warning icon** after its name. Its tooltip shows
  "No applicant can meet the rules of Standard." (spec 003's notice text) and opens on keyboard
  focus as well as on hover. The tab uses `BranchName`, with the description's (i) as today and
  this one finding segment.
- Changing the tab keeps the selected persona (FR-004).

**S8.3 Applicants row** (FR-004, FR-012, FR-015, W9):
- **Three chips**, one per persona, with its name and an icon whose shape states the outcome for the
  selected variant: a check circle when the persona meets it, the warning diamond when not (not by
  colour alone). The chips show no text for the outcome. Each chip's accessible name carries it:
  "Mia Schulz: meets the rules of Standard" or "Mia Schulz: doesn't meet the rules of Standard". One
  chip is selected, the first by default.
- **"Generate all again"**: a tertiary button with a refresh icon, at the right end of the row,
  styled like "Generate again" (W9). When any persona has changes, it first asks (S8.7). Without
  changes it doesn't ask. While it runs, the step shows S8.8's loading state.

**S8.4 Persona panel, read mode** (FR-004 to FR-007, F9–F11, K1–K3):
- **Head**: "Mia's data", with "Edit data" (tertiary, pencil icon) and "Generate again" (tertiary,
  refresh icon).
- **Values**: grouped under the document headings "Personal ID" and "Driving licence", in catalog
  order (F9). Each row shows the field's label as the rules name it, without the document ("Date of
  birth (Age)"), and the value:
  - a date as `dd.mm.yyyy`; a date of birth with its age, "08.07.2007 (age 19)" (F10);
  - enums by their labels;
  - "Licence classes" as the codes in one row, "B, BE", and each class date that a rule checks in a
    row of its own, "Licence class B – Issue date", shown only while the class is held (F11);
  - an empty value as "Not shared" (Figma; design-notes).

  Only data that evaluated rules check appears (FR-005). After returning from the rules step, rows
  come and go with the rules (W6).
- **Failing values** (K1): a value read by a rule shown as failing in the selected variant has
  Figma's red dot and bold text, with hidden text for screen readers (design-notes).
- **Changed values** (K2): "· edited" after a value that differs from its generated value, with
  hidden text (design-notes).
- **Scrolling** (K3): only the panel scrolls. The header, progress, tabs, applicants row and action
  bar stay put.

**S8.5 Persona panel, edit mode** (FR-006 to FR-009, F1, F12, W4, W11, W12):
- "Edit data" turns the values into fields, under the same headings, and becomes "**Done**", which
  turns them back. No dialog, no Cancel, no Close, no "Save and test", and no intro "Results update
  when you save." (F1).
- **Fields**:
  - Name;
  - a field for every value shown, of its kind: text, whole number, a date as `dd.mm.yyyy`;
  - one value of a set as a select of labels;
  - several values picked from a list: licence classes by code (B, BE, C1, …), nationalities by
    label (German, Italian, …) (F12);
  - the class date rows for the classes held;
  - "Age today" next to each date of birth (F10);
  - given and family name as fields of their own under "Personal ID" when rules check them,
    labelled as the rules name them (W12).

  Every field can be cleared, which makes the value empty.
- **Every valid change applies at once** (FR-017), and the results next to it update. An invalid
  field shows its error under it and keeps its last valid value, while the persona's other changes
  apply (FR-008):
  - "Enter a date that exists, e.g. 28.02.2007.";
  - "Enter a whole number, e.g. 25." (W11);
  - "Enter a name." (W11), the persona keeping its name.
- **Licence classes** (W4): removing class B hides its date rows, and the rule on B's date reports
  "Not met" (or "Couldn't be checked" when no class is left, as the evaluation decides). Adding B
  again brings its earlier dates back.
- Switching persona or variant ends edit mode (design-notes).

**S8.6 Results** (FR-014, FR-015, FR-018, F3, F6, F8, F14, W5, W10):
- **Notice**: for a variant that no applicant can meet, spec 003's notice "No applicant can meet
  the rules of Standard." sits above the heading (F6).
- **Heading**: "Result: meets the rules", or the count of reported items, a group counting as one:
  "Result: doesn't meet 2 rules", "Result: doesn't meet 1 rule and 1 group" (W10).
- **A variant the persona doesn't meet** has two columns, "Rule" and "Message Mia reads":
  1. The reported rules and groups first. Each shows its name, its statement as the rules step
     words it, the status "**Not met**" or "**Couldn't be checked**" with an icon of its own, and
     its message (F8). Below a reported group, indented, come its members that aren't met or
     couldn't be checked, each with name, statement and status (W10).
  2. Then every other top-level rule and group, with its outcome. A met one has a check icon, its
     name and statement, and "–" in the message column (F14).
- **A variant the persona meets** has the heading "Result: meets the rules", the list "Rules Mia
  meets" with every top-level rule and group (check icon, name, statement) and **no message column**
  (F3, F14). There is no success message.
- **A variant without rules**: "Result: meets the rules" and Figma's note "School transport has no
  rules yet, so every applicant meets it. Add rules in the Rules step to test them." (U06, EC "A
  branch without rules").
- The boundaries of the evaluation need no element of their own (W5): a birthday exactly 21 years
  ago meets "at least 21 years old", "STUTTGART" fails a case-sensitive "is equal to Stuttgart", and
  every persona meets a variant that every applicant meets.

**S8.7 Questions before generating anew** (FR-012, U04, W9): `ConfirmDialog`.
- **One persona**, when it has changes: "Generate new data for Mia?", "Your changes to Mia's data
  will be replaced. The other two applicants stay as they are.", with "Cancel" and "Generate new
  data" (U04).
- **All**, when any persona has changes: "Generate new data for all applicants?", "Your changes to
  Mia's data will be replaced." It names every persona with changes: "Your changes to Mia's and
  Anna's data will be replaced." The buttons are "Cancel" and "Generate new data" (W9).
- Generating anew replaces values and keeps the persona's name (research R10).

**S8.8 Loading** (FR-004, FR-012, FR-013, U11, F14):
- **First open, "Generate all again" and "Try again"** (frame 18): the tabs and the action bar are
  real. Three skeleton pills replace the chips. The status "Creating 3 sample applicants…", read
  out (`role="status"`), sits at the right end of the applicants row. Skeleton data and result
  cards keep the layout, and the result rows have a placeholder for the statement (F14). No persona
  can be edited, and there's no test-day line.
- **One persona** (frame 19): only that persona's pill, data card and result card are skeletons,
  without "Edit data" or "Generate again". The status reads "Creating new data for Mia…". The other
  personas stay usable, and the test-day line shows.
- **Filling new data after returning from the rules step**: as frame 19, for each persona being
  filled. The status text is in design-notes.

**S8.9 Failure** (FR-013, U12, F7): in place of the applicants row and the panel: "Couldn't create
sample applicants", "Try again, or publish without testing." ("Try again, or save without testing."
when editing), and a "**Try again**" button, which generates all three anew with S8.8's loading
state. Figma's "Your rules are saved." isn't built (F7). The tabs, Back and "Publish" / "Save" stay
usable.

**S8.10 Status region** (FR-017, F2): a visually hidden, polite `role="status"` region in the
step. After an edit, it announces each change of outcome for the edited persona, per variant,
without moving the focus: "Mia Schulz now meets the rules of Standard." or "Mia Schulz no longer
meets the rules of Standard.". There is no visible toast (F2).

### Accessibility (SC-007)

- **The outcome is never by colour alone**: chip icons differ in shape and carry the outcome in
  their accessible name. Statuses are text ("Not met", "Couldn't be checked"). Failing and changed
  values have hidden text (FR-015, K1, K2).
- **Keyboard**:
  - the variant tabs and the persona chips work by arrow keys (research R16);
  - the tab tooltip opens on focus (FR-018);
  - every button and field is reachable in order;
  - opening the step moves the focus to its heading, as every step does;
  - "Edit data" moves the focus to the first field, and "Done" back to "Edit data".
- **Errors**: each error is tied to its field (`aria-describedby`, `aria-invalid`).
- **Status texts**: the loading status and the announcements are polite and never move the focus.
- **Focus rings**: for keyboard focus only (`focus-visible:`).
- **Light theme only**.

---

## Items from the audit

Build the F items as listed, keeping Figma's layout and styling. Build the W items without frames,
from the nearest frame or KERN pattern named, and the K items as designed.

### S0. Wizard shell

| Item | Build |
|---|---|
| O2 | Keep the current progress with five entries (FR-001), not Figma's "Step 4 of 4" |

### S2. Rules step

| Item | Build |
|---|---|
| W2 | "Test rules" while any branch has a rule or an editor is open; "Publish without rules" / "Save without rules" otherwise, skipping the test step; the documents step keeps its own |
| W3 | "Test rules" refused with publishing's existing message, naming the rule and the variant |
| W8 | Unsaved editor changes raise "Save changes to Rule 01?" first |

### S5. Publish and save dialog

| Item | Build |
|---|---|
| F4 | "Check rules again", as today, also from the test step; not "Back to test" |

### S7. Edit flow

| Item | Build |
|---|---|
| F13 | "Save", not "Publish changes" with an arrow |

### S8. Test step

| Item | Build |
|---|---|
| F1 | Editing in the panel ("Edit data" / "Done"), changes applied at once, errors under fields; no dialog (frames 4–6 replaced) |
| F2 | No toast; the polite status region of S8.10 |
| F3 | No success message and no message column under a met variant |
| F5 | Generation follows FR-011 goal 1 (sample data only; no UI change) |
| F6 | Warning icon on the tab with the notice in a focusable tooltip, and the notice above the heading |
| F7 | No "Your rules are saved." in the failure state |
| F8 | Reported rows: name, statement, status with its own icon, message |
| F9 | Values under "Personal ID" and "Driving licence", labelled without the document |
| F10 | "08.07.2007 (age 19)" in the panel; "Age today" in edit mode |
| F11 | "Licence classes" as codes; one row per class date, shown while the class is held |
| F12 | A field for every value (Nationality, Expiry date, …); several values picked from a list |
| F14 | Met rows show name and statement with the check icon; "–" in a failing variant; skeleton rows get a statement placeholder |
| W1 | The test-day line under the intro, as S8.1 says |
| W4 | Removing a class hides its dates, and adding it again brings them back |
| W5 | Evaluation boundaries in the existing results |
| W6 | Rows follow the current rules after returning from the rules step; earlier values come back |
| W7 | A later flow opens with frame 18 and three new personas |
| W9 | "Generate all again", its question, its loading state |
| W10 | Reported groups with their failing members indented; the heading's count |
| W11 | "Enter a whole number, e.g. 25." and "Enter a name." |
| W12 | Given and family name as fields of their own, filled from the name, edited separately |
| W13 | The step exists only in the signed-in editor |
| K1 | Red dot and bold text on failing values, with hidden text |
| K2 | "· edited" after changed values, with hidden text |
| K3 | Only the panel scrolls |
| K4 | Frame 15's name and row count disagree; implies nothing |

### Out of scope (O1–O6)

| Item | Not built |
|---|---|
| O1 | The redesign's page chrome: app header, breadcrumb, Draft, Live and "Unpublished changes" badges, footer styling, colours, typography, spacing, the arrow on "Publish changes" |
| O2 | The compact step header "Step 4 of 4" |
| O3 | "Save and exit" in the action bar (left out on purpose, `EditorFooter.tsx`). *Superseded by spec 005 (connection drafts) for the create flow: "Save and exit" is now built (spec 005's S0). See [spec 005](../../005-connection-drafts/spec.md).* |
| O4 | The Standard tab's info icon and "What is a variant" tooltip of the redesign (the tabs keep today's description (i)) |
| O5 | U10's clickable step bar |
| O6 | The publish dialog's redesign beyond F4 |

### Coverage index

| Screen | Items |
|---|---|
| S0 | O1, O2 |
| S1 | W2 |
| S2 | W2, W3, W8 |
| S5 | F4, O6 |
| S7 | F13, O5 |
| S8.1 | W1 |
| S8.2 | F6, O4 |
| S8.3 | W9 |
| S8.4 | F9, F10, F11, K1, K2, K3, W6 |
| S8.5 | F1, F10, F12, W4, W11, W12 |
| S8.6 | F3, F5, F6, F8, F14, W5, W10, K4 |
| S8.7 | W9 |
| S8.8 | F14, W7, W9 |
| S8.9 | F7 |
| S8.10 | F2 |
| S8 (all) | W13, O3 |

---

## Copy

Exact texts, from the spec, its Clarifications and Figma. Texts that depend on data are built in
`personas/messages.ts` ([personas.md](personas.md)). Use the typographic apostrophe (’) the
existing UI uses. design-notes.md gives the copy the decisions leave open (research R13).

| Where | Text |
|---|---|
| Progress | "Test" |
| Rules step button | "Test rules"; "Publish without rules" / "Save without rules" |
| Page title / hint | "Test rules" / "Choose a sample applicant to see which rules they meet and which messages they’d see. The data is made up, and nothing is shared." |
| Test-day line | "Tested as if shared today, 1 Nov 2026." |
| Chip names | "Mia Schulz: meets the rules of Standard" / "Mia Schulz: doesn’t meet the rules of Standard" |
| Applicants row | "Generate all again" |
| Panel head | "Mia’s data", "Edit data", "Done", "Generate again" |
| Headings | "Personal ID", "Driving licence" |
| Value | "08.07.2007 (age 19)"; "B, BE"; empty: "Not shared" |
| Edit fields | "Name", "Age today" |
| Field errors | "Enter a date that exists, e.g. 28.02.2007."; "Enter a whole number, e.g. 25."; "Enter a name." |
| Result heading | "Result: meets the rules"; "Result: doesn’t meet 2 rules"; "Result: doesn’t meet 1 rule and 1 group" |
| Result table | "Rule", "Message Mia reads"; "Rules Mia meets"; "Not met", "Couldn’t be checked"; "–" |
| Notice and tab tooltip | "No applicant can meet the rules of Standard." |
| Variant without rules | "School transport has no rules yet, so every applicant meets it. Add rules in the Rules step to test them." |
| Question, one | "Generate new data for Mia?" / "Your changes to Mia’s data will be replaced. The other two applicants stay as they are." / "Cancel", "Generate new data" |
| Question, all | "Generate new data for all applicants?" / "Your changes to Mia’s and Anna’s data will be replaced." / "Cancel", "Generate new data" |
| Loading status | "Creating 3 sample applicants…"; "Creating new data for Mia…" |
| Failure | "Couldn’t create sample applicants" / "Try again, or publish without testing." ("Try again, or save without testing.") / "Try again" |
| Announcements | "Mia Schulz now meets the rules of Standard." / "Mia Schulz no longer meets the rules of Standard." |
| Footer | "Back"; "Publish" / "Save" |
