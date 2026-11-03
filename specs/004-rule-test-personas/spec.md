# Feature Specification: Test Rules with Personas

**Feature Branch**: `rules-tests`

**Created**: 2026-10-29

**Status**: Draft

**Input**: User description: "At the moment feature 003 is not fully implement, ignore this factor and assume it's implemented. We now need to add a page between the rules and the publish page that is used to "test rules". The idea of the page is to create 3 fake personas that will then be checked against the rules and marked if they are able to pass them or not. This will help a user understand if the rules created make sense. The personas are generated randomly and they should cover more or less all the rules. They will then be tested again all the variants and marked if they will be able to pass or not. The user can also modify these personans: change age, name, nationality, ecc. to tweak them to the to rules that he actually wants to tests. It make sense to allow only fields that are used in the rules."

## Clarifications

### Session 2026-10-29

- Q: Do publishing and saving move from the rules step to the test step, or does the rules step
  keep them so that testing can be skipped? → A: They move. The rules step has a single button to
  go on, "Test rules", and testing the rules becomes a step of the wizard, whose button publishes
  the form connection ("Save" when editing) (FR-003).
- Q: What happens to the personas once the form connection is published or saved? → A: They are
  thrown away. Nothing is stored before publishing (spec 001), so leaving the flow discards them
  too, and the next create or edit flow starts with new personas (FR-019).
- Q: When no variant has any rule yet, should the rules step's button to go on still be "Test
  rules", or stay "Publish without rules" as spec 002 has it? → A: "Publish without rules" ("Save
  without rules" when editing), which skips the test step, while no branch has any rule and no rule
  editor is open; "Test rules" as soon as a rule exists. The documents step keeps its own "Publish
  without rules" (FR-001, FR-003).

### Session 2026-11-01

Answers to the Figma audit's questions ([figma-audit/report.md](figma-audit/report.md), "Clarify
questions"). Frame and node references are to Figma file "Middleware – V4", section "Test · 1 ·
Test rules" (node 7057:58708).

- Q: When a team member edits a persona's values, do the results update live with every change,
  or only once the edit is confirmed (Figma: a modal "Edit Mia's data" dialog with Cancel and "Save
  and test", frames 4–6)? → A: Live, as the spec says, and editing happens inside the persona
  panel, not in a dialog. "Edit data" turns the persona's values into fields, grouped under the
  document headings of Figma's dialog ("Personal ID", "Driving licence"), and "Done" turns them
  back. Every valid change applies at once and the results next to it update. An invalid field
  shows its error under it, such as "Enter a date that exists, e.g. 28.02.2007.", and keeps its
  last valid value while the persona's other changes apply. There is no Cancel, Close or "Save and
  test". Figma's dialog (frames 4–5) and its "after Save and test" frame (frame 6) are to be
  replaced (FR-006, FR-008, FR-017).
- Q: When the publish dialog is opened from the test step, does its secondary action stay "Check
  rules again" or become "Back to test" (Figma: frame 16, node 7058:62120)? → A: It stays "Check
  rules again": the dialog is unchanged, and the action still closes it and opens the rules step at
  the first branch, in tab order, with findings (spec 003), also when the dialog was opened from the
  test step. Figma's "Back to test" is to be changed back (FR-003, Assumptions, "Out of scope").
- Q: Must generation always give, for every branch that some applicant can meet, a persona who
  meets it (Figma: nobody meets Ambulance in frames 8–10)? → A: Yes, as FR-011 goal 1 and US1-AS3
  say. Figma's sample data is a slip: frames 8–10 should show at least one applicant who meets
  Ambulance, such as one who holds class C1. No UI element changes (FR-011).
- Q: Where and when does the test step name the test day (no Figma frame has it)? → A: Built
  without frames: one line directly under the step's intro, "Tested as if shared today, 1 Nov
  2026." (today's date in Germany, in that format). It shows whenever results are shown, also while
  one persona is generated anew (frame 19), and is hidden in the first-open loading state (frame
  18) and in a failure state without results (FR-016).
- Q: Are the rules step's and documents step's changes built without Figma frames, which show
  only the test step? → A: Yes, from the current steps: the rules step's button to go on reads
  "Test rules" while any branch has a rule or a rule editor is open, and "Publish without rules"
  ("Save without rules" when editing) otherwise, which opens the publish dialog and skips the test
  step, as the progress does. The documents step keeps its own "Publish without rules". "Test
  rules" is refused with publishing's existing message, naming the rule and the variant, and
  unsaved editor changes first raise the existing question, such as "Save changes to Rule 01?"
  (FR-001, FR-002, FR-003).
- Q: Where is the action that generates all three personas anew, and how does it confirm (no Figma
  frame has it)? → A: Built without frames: a tertiary button "Generate all again", with a refresh
  icon, at the right end of the applicants row. When any persona has changes, it first asks with
  frame 7's dialog: title "Generate new data for all applicants?", body "Your changes to Mia's data
  will be replaced.", naming every persona with changes ("Your changes to Mia's and Anna's data
  will be replaced."), buttons "Cancel" and "Generate new data". Without changes it doesn't ask.
  While it runs, the step shows frame 18's loading state (FR-012).
- Q: Can generating the personas fail, and what does the test step show then (Figma: frame 20)?
  → A: Yes, it can stop with an error, for example when the browser can't run it. The persona area
  then shows "Couldn't create sample applicants" and "Try again, or publish without testing." ("Try
  again, or save without testing." when editing), and a "Try again" button, which generates all
  three anew with frame 18's loading state. The variant tabs, Back and "Publish" / "Save" stay
  usable. Frame 20's "Your rules are saved." is left out, since nothing is stored before publishing
  (FR-013, Edge Cases).
- Q: Does the test step show one selected persona at a time, as Figma does, and how does each
  persona's chip state its outcome? → A: The selection model stays: the three personas are chips,
  the first is selected by default, and the selection stays when the variant tab changes; only the
  selected persona's data ("Mia's data") and results fill the panel. The chips stay icon-only, and
  each chip's accessible name carries the outcome for the selected variant: "Mia Schulz: meets the
  rules of Standard" or "Mia Schulz: doesn't meet the rules of Standard". Visible text appears only
  in the selected persona's "Result: …" heading. The intro stays "Choose a sample applicant to see
  which rules they meet and which messages they'd see. The data is made up, and nothing is shared."
  (FR-004, FR-015).
- Q: What does the result table show for the selected persona (Figma: name and message only, one
  icon for every failure, met rules listed, a success message)? → A: (1) Each reported row shows
  the rule's name, its statement as the rules step words it, the status "Not met" or "Couldn't be
  checked", each with its own icon, and its message. (2) Met rules are listed too, as Figma has
  them: every top-level rule and group with its outcome as the evaluation judges it, reported ones
  first; under a met variant they are headed "Rules Mia meets". A rule inside a group that is met
  doesn't count as failing. (3) There is no success message: a met variant has no message column,
  since the evaluation gives none. (4) Built without frames: a reported group gets a row with its
  name, statement, status and message, and below it, indented, its members that aren't met or
  couldn't be checked, each with name, statement and status. The heading counts reported items, a
  group as one: "Result: meets the rules" or "Result: doesn't meet 1 rule and 1 group" (FR-014,
  FR-015, Key Entities).
- Q: Where does the notice for a branch that no applicant can meet go, and how is it worded
  (Figma: a warning icon on the variant tab, the notice only in its hover tooltip, frame 14)? → A:
  Both: spec 003's notice next to the branch's results, above the "Result: …" heading, "No
  applicant can meet the rules of Standard.", and Figma's warning icon on the variant tab, whose
  tooltip shows the same text and opens on keyboard focus as well as on hover. Figma's tooltip
  wording "Rule 01 and Rule 02 can't be met together, so no applicant can meet these rules." is
  not used (FR-018, Edge Cases).
- Q: How does the persona panel show the age and the licence class dates, and what happens when a
  class is removed and added again (Figma: no age in the panel, one date per row of classes such
  as "B, BE since 02.05.2010")? → A: As the spec says. (1) The panel shows the age next to the date
  of birth, "08.07.2007 (age 19)", and in edit mode the age can be entered too. (2) "Licence
  classes" lists the codes, such as "B, BE", and each class date a rule checks gets its own row
  under "Driving licence", labelled as the rules name it ("Licence class B – Issue date"), shown
  only while the class is held. (3) Built without frames: removing class B hides its date and the
  rule on it reports "Not met"; adding B again brings the earlier date back (FR-005, FR-007,
  FR-020, US2-AS4).
- Q: Which fields does the persona editor have, how are several values entered, and which errors
  and name fields does it need (Figma: no Nationality field, a hidden Expiry date row, licence
  classes as plain text, rules on data without a value in frame 15)? → A: (1) As the spec says:
  the editor has a field for every value the persona shows, including Nationality, Expiry date and
  every row of frame 15's longer list, and the persona has a value for every field a rule checks,
  such as "Licence not suspended" and class B's expiry date; Figma's gaps are slips. (2) Several
  values are picked from a list: licence classes by code (B, BE, C1, …), nationalities by label
  (German, Italian, …). (3) Built without frames: "Enter a name." under Name, and the persona keeps
  its previous name; "Enter a whole number, e.g. 25." under "Age today" for letters or decimals.
  (4) Built without frames: when rules check them, given name and family name are fields of their
  own under "Personal ID", labelled as the rules name them; generation fills them from the persona
  name ("Mia Schulz" gives "Mia" and "Schulz"), and afterwards they are edited separately, so
  renaming the persona changes neither (FR-005, FR-006, FR-008, FR-009).
- Q: Is a persona's change of outcome announced by a visible toast, an invisible announcement, or
  both (Figma: toast "Results updated. Mia now meets Rule 01.", frame 6)? → A: Only an invisible
  polite status region, which doesn't move the focus and announces changes of outcome per persona
  and variant: "Mia Schulz now meets the rules of Standard." / "Mia Schulz no longer meets the
  rules of Standard." There is no toast (FR-017).
- Q: While one persona is generated anew, may editing that persona wait until its new values
  arrive (Figma: frame 19 shows it as a skeleton without "Edit data" and "Generate again")? → A:
  Yes, as Figma has it: the persona being generated can't be edited until its values arrive,
  within 5 seconds, and on first open none can be edited until all three arrive. Editing the other
  personas, going back, publishing and saving never wait for generation (FR-013).
- Q: Are the remaining behaviours that no frame shows, and that add no UI element, built without
  frames? → A: Yes. Evaluation boundaries (a birthday exactly 21 years ago, letter case in a city,
  a branch every applicant meets) appear in the existing results. After returning from the rules
  step, the panel shows rows only for the fields that evaluated rules check, so rows come and go
  (as between frame 1's 4 rows and frame 15's 10), and the results follow the current rules and
  branches. A later create or edit flow opens with frame 18's loading state and three new personas.
  The step lives only in the signed-in editor (US2-AS2, US2-AS3, US3-AS1, US3-AS3, US3-AS5,
  FR-020, FR-021).
- Q: Do the result table's rows for rules the persona meets show the rule's statement as well as
  its name (Figma: "Rule NN · <name>" and a check icon only)? → A: Yes. Every met rule and group
  shows its name and its statement as the rules step words it, the same as reported rows, with the
  check icon and no message. In a branch the persona doesn't meet, a met row shows "–" in the
  message column; a branch the persona meets has no message column. Figma is to add the statement
  to its met rows and to the skeleton rows of frames 18–19 (FR-015).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See which personas meet the rules of each variant (Priority: P1)

A team member has set up the rules of spec 002's "Passenger transport licence" form connection
([spec 002](../002-connection-rules/spec.md), User Story 3). The main branch "Standard" requires an
applicant who is at least 21, lives in Stuttgart, holds licence class B and has held it for at
least 2 years. The "Ambulance" branch, based on it, lowers the age to 19. Reading the rules one by
one, it is hard to be sure that they let through the applicants the form is meant for and turn
away the others. Spec 003 points out rules that conflict with or repeat each other
([spec 003](../003-rule-consistency-checks/spec.md)), but not rules that are consistent and still
wrong, such as an age limit in the wrong variant.

After the rules step, the create and edit flow now has a test step, before publishing or saving.
There the system makes up three personas: fictitious applicants, each with a name and a value for
exactly the data that the rules check. For this example they could be a 25-year-old from Stuttgart
who has held class B for 6 years, a 20-year-old from Stuttgart who has held it for 3 years, and a
45-year-old from Esslingen without class B. The system tests each persona against the rules of
every variant, as the rules would be evaluated if that person shared their documents today. For
each persona and each variant, the step shows whether the persona meets the rules and, if not,
which rules it doesn't meet and the messages the form would show. The team member sees at once
that the 20-year-old meets the rules of Ambulance but not those of Standard, as intended.

**Why this priority**: This is what the feature is for. A form connection whose rules turn away
the wrong applicants, or let them through, is only noticed once citizens use the form. The test
step shows how the rules decide for concrete applicants before the form connection goes live,
without real documents or a wallet.

**Independent Test**: Set up the "Passenger transport licence" form connection with its two
branches and go on to the test step. Compare each persona's results with the evaluation that
serviceBW receives for test documents with the same values, shared on the same day (spec 002,
User Story 3).

**Acceptance Scenarios**:

1. **Given** the rules above, **When** the team member chooses "Test rules", the rules step's only
   button to go on, **Then** the test step shows three personas, each with a name and a value for
   "Personal ID – Date of birth (Age)", "Personal ID – City or town" and "Driving licence – Licence
   classes", and, for a persona that holds class B, for "Driving licence – Licence class B – Issue
   date", and no other data.
2. **Given** those personas, **When** the step shows their results, **Then** each persona shows,
   for Standard and for Ambulance, whether it meets the rules. Where it doesn't, the step names
   each rule or group whose message serviceBW would receive, says whether it isn't met or couldn't
   be checked, and shows its error message.
3. **Given** the rules above, **When** the personas are generated, **Then** one persona meets the
   rules of both variants, one meets those of Ambulance but not those of Standard, and one meets
   neither (FR-011).
4. **Given** the test step, **When** the team member reads the results, **Then** the step says that
   the personas are tested as if they shared their documents today, and names today's date.
5. **Given** a persona, **When** the team member generates it anew, **Then** it gets new values, the
   other two personas keep theirs, and its results update.
6. **Given** personas that don't meet the rules of a branch, **When** the team member publishes or
   saves from the test step, **Then** it goes ahead as it would without this feature: the results
   never refuse or delay publishing or saving.
7. **Given** a form connection whose branches have no rules, **When** the team member goes on from
   the documents step or the rules step, **Then** "Publish without rules" publishes as before,
   without the test step.
8. **Given** a rule without an error message in Ambulance, **When** the team member tries to go on
   to the test step, **Then** it is refused with the message that publishing would give, naming
   the rule and Ambulance (spec 002, FR-006).

---

### User Story 2 - Adjust a persona to test a case that matters (Priority: P2)

The generated personas are random, but the team member often has a specific applicant in mind:
one who turns 21 today, one who writes their city in capitals, one whose licence lists class BE
but not class B. They change a persona's values, only for the data that the rules check, and its
results update at once.

**Why this priority**: Generated personas cover the rules broadly, but the cases a team member
worries about are usually at a boundary that random values rarely hit. The test step is already
useful without editing (User Story 1).

**Independent Test**: In the "Passenger transport licence" example, edit personas into the cases
below and compare their results with the evaluation of test documents with the same values.

**Acceptance Scenarios**:

1. **Given** a 25-year-old persona who meets the rules of both variants, **When** the team member
   changes its age to 20, **Then** its date of birth changes to one that gives that age today, and
   at once the persona no longer meets the rules of Standard, which name the age rule with its
   message, and still meets those of Ambulance.
2. **Given** a persona, **When** the team member sets its date of birth to the day 21 years before
   today, **Then** the persona meets "Personal ID – Date of birth (Age) is at least 21 years old"
   (spec 002, Edge Cases, "Birthday on the day of sharing").
3. **Given** the rule "Personal ID – City or town is equal to Stuttgart" respecting letter case,
   **When** the team member changes a persona's city or town to "STUTTGART", **Then** the persona
   doesn't meet the rule; **When** the rule ignores letter case instead, **Then** it does (spec
   002, FR-013).
4. **Given** a persona that holds class B, **When** the team member removes class B from its
   licence classes, **Then** its "Licence class B – Issue date" is no longer shown, and the rule on
   it is reported as not met, not as couldn't be checked (spec 002, FR-014); **When** they add
   class B again, **Then** the date comes back with its earlier value.
5. **Given** a persona, **When** the team member clears its date of birth, **Then** every rule on
   it is reported as couldn't be checked, and the persona doesn't meet the rules of a branch that
   needs them (spec 002, FR-014).
6. **Given** a persona, **When** the team member looks for data that no rule checks, such as the
   family name in this example, **Then** the persona doesn't have it.
7. **Given** a persona, **When** the team member renames it, **Then** the step shows the new name,
   and none of its results changes.

---

### User Story 3 - Keep testing while the rules change (Priority: P2)

A result surprises the team member: a persona they expected to pass doesn't. They go back to the
rules step, change a rule and come back. The personas are still there, with the values they
edited, and their results follow the changed rules. When a rule starts checking data that no rule
checked before, every persona gets a value for it, chosen to test the new rule.

**Why this priority**: The test step is most useful in a loop with the rules step. If the personas
were lost at every round trip, the team member would have to edit them again each time.

**Independent Test**: Edit the personas, go back to the rules step, change, add and delete rules
and branches, and return to the test step.

**Acceptance Scenarios**:

1. **Given** edited personas, **When** the team member goes back to the rules step, changes
   Standard's age rule from 21 to 18 and returns, **Then** the personas keep all of their values,
   and their results follow the changed rule.
2. **Given** the personas, **When** the team member adds "Personal ID – Nationality includes one of
   Germany" to Standard and returns, **Then** each persona has a value for "Personal ID –
   Nationality", at least one persona meets the new rule and at least one doesn't, and no value
   the personas already had has changed.
3. **Given** the personas, **When** the team member deletes the only rule on "Personal ID – City or
   town" and returns, **Then** no persona shows a city or town, and no result depends on it.
4. **Given** the personas, **When** the team member adds the branch "School transport" and
   returns, **Then** every persona has results for it; **When** they delete it and return,
   **Then** its results are gone.
5. **Given** edited personas, **When** the team member publishes the form connection and later
   opens its edit flow and goes on to the test step, **Then** it shows three new personas.

---

### Edge Cases

- **No rules at all**: While no branch has any rule and no rule editor is open, there is nothing to
  test. The rules step's button to go on reads "Publish without rules" ("Save without rules" when
  editing) instead of "Test rules" and goes straight to publishing or saving, as spec 002 defines
  it, and the progress skips the test step as it skips the rules step (FR-001).
- **The first rule discarded**: While the first rule is being edited, the button reads "Test rules"
  (spec 002, FR-006: a rule being edited counts as a rule). If the team member discards it when
  asked to keep or discard their changes, no rule is left: they stay in the rules step, whose
  button then reads "Publish without rules".
- **A branch without rules**: Every persona meets it, as every applicant does (spec 002, FR-009).
  The same goes for a branch based on the main branch whose rules are all removed there.
- **A branch that no applicant can meet** (spec 003, FR-004): No persona meets it, and generation
  doesn't try. The step shows spec 003's notice for it, such as "No applicant can meet the rules
  of Ambulance.", above the personas' results for that branch, and a warning icon on its tab
  (FR-018).
- **A branch that every applicant meets** (spec 003, FR-006): Every persona meets it, and
  generation doesn't try to make one fail it.
- **Rules removed in a branch**: They aren't tested in that branch, as they aren't evaluated there
  (spec 002, FR-009). The data they check stays on the personas as long as a rule evaluated in
  some branch checks it, such as the main branch's version of the removed rule.
- **Rules with problems**: A rule whose condition is incomplete, that has no error message, or that
  checks data the form connection no longer requests keeps the team member in the rules step: going
  on to the test step is refused with the message that publishing would give (spec 002, FR-006),
  so the test step only ever tests rules that could be published (FR-002).
- **The rule being edited**: Going on to the test step while a rule editor has unsaved changes
  first asks to keep or discard them, as publishing does (spec 002, FR-006).
- **Birthday today and 29 February**: A persona who turns 21 today is 21 years old. A persona born
  on 29 February reaches the next age on 1 March in years without 29 February. Both are tested as
  the evaluation counts them (spec 002, FR-012).
- **Rules that depend on the day of sharing**: Every persona is tested as if they shared today, by
  the calendar date in Germany, which the step names (FR-016). A persona that meets "Expiry date is
  at least 6 months from now" today may not next week. Testing for another day is out of scope.
- **A rule on a class the persona doesn't hold**: "Licence class B – Issue date is at least 2 years
  ago" isn't met by a persona whose licence doesn't list class B, and is reported as not met, as
  the evaluation does (spec 002, FR-014). A class's issue date and expiry date are offered only for
  the classes the persona holds.
- **A class without an expiry date of its own**: A persona may hold class B with an empty "Licence
  class B – Expiry date". A rule on it is then reported as couldn't be checked, as for a licence
  that gives no such date (spec 002, Assumptions, "Licence classes").
- **Several values**: A persona's "Personal ID – Nationality" and "Driving licence – Licence
  classes" can hold several values; every other enum field holds one (spec 003, FR-007). A persona
  with German and Italian nationality meets both "includes one of Germany" and "includes one of
  Italy".
- **Fields that describe the same fact**: The "Date of birth" of the Personal ID and of the driving
  licence, and the licence's "Age in years" and "Year of birth", are separate data, as for the
  evaluation (spec 003, FR-007). Generation gives a persona values that agree, but changing one
  doesn't change the others, so the team member can also test documents that disagree.
- **Names**: A persona's name is a label for the team, like the name of a rule (spec 002, FR-005).
  When rules check the "Given name" or "Family name", generation takes the persona's values for them
  from its name, but renaming the persona doesn't change them, and changing them doesn't rename it.
- **Unlikely values**: A team member may give a persona a date of birth in the future or an age of
  200, which the test evaluates like any other value. Generation gives such values only when a
  rule can't be met, or can't be failed, otherwise (FR-010).
- **An entry that isn't a value**: A date that doesn't exist, such as 31 February, or a number with
  letters or decimals is pointed out under its field, and the results keep using that field's last
  valid value until it is corrected, while the persona's other changes apply (FR-008).
- **More rules than three personas can cover**: Three personas can't always meet and fail every
  rule. Generation reaches its goals in the order of FR-011 as far as three personas allow, and the
  team member can edit or generate the personas anew to test the rest.
- **Generation takes too long**: In a branch at spec 002's limit of 200 rules and groups,
  generation stops after 5 seconds with the best personas found so far, which still have valid
  values (FR-013). Nothing but the persona being generated waits for it.
- **Generation fails**: If generation stops with an error, for example because the browser can't
  run it, the step says "Couldn't create sample applicants" and offers "Try again". The team member
  can still go back or publish without testing (FR-013).
- **Documents changed meanwhile**: The team member goes back to the documents step and stops
  requesting data that rules check. The rules then have a problem, and the test step can be reached
  again only once it is fixed (spec 002, FR-029 and FR-006).
- **A rule that the main branch changes**: Branches based on the main branch follow it (spec 002,
  FR-021), and the personas' results for them follow too, once the team member returns to the test
  step.

## Requirements *(mandatory)*

### Functional Requirements

#### The test step

- **FR-001**: The create and edit flow of a form connection MUST include a test step after the
  rules step and before publishing or saving, so that the progress shows Connection, Documents,
  Rules, Test and Publish. While no branch has any rule and no rule editor is open, the flow MUST
  skip the test step: the rules step's single button to go on reads "Publish without rules" ("Save
  without rules" when editing) instead of "Test rules", and goes straight to publishing or saving,
  as the documents step's "Publish without rules" does (spec 002, FR-001 and FR-006).
- **FR-002**: Going on from the rules step to the test step MUST be subject to the checks that
  publishing and saving are subject to (spec 002, FR-006): while a rule in any branch has an
  incomplete condition or no error message, or checks data that the form connection doesn't
  request, or a branch has no name or a duplicate one, it MUST be refused with the message that
  publishing would give, where publishing shows it. While a rule editor has unsaved changes, it
  MUST first ask to keep or discard them with the editor's existing question, such as "Save
  changes to Rule 01?", as publishing does. The test step therefore tests exactly the rules that
  publishing or saving would store.
- **FR-003**: Once a branch has a rule, or a rule editor is open, the rules step's single button to
  go on MUST be "Test rules", which opens the test step (FR-002); the rules step MUST NOT offer
  "Publish" or "Save" any more, nor "Publish without rules" except as FR-001 says. The test step
  MUST offer going back to the rules step, and "Publish" ("Save" when editing), which opens the
  publish and save dialog of specs 002 and 003, unchanged: its secondary action stays "Check rules
  again", which closes the dialog and opens the rules step at the first branch, in tab order, with
  findings (spec 003), also when the dialog was opened from the test step. Every publish or save of
  a form connection with rules therefore goes through the test step. The personas' results MUST NOT
  refuse, delay or add a question to publishing or saving, nor disable any action.

#### Personas

- **FR-004**: The test step MUST show three personas: fictitious applicants, each with a name and a
  value for every piece of data that the rules check (FR-005). The system MUST generate them when
  the test step first opens (FR-010, FR-011). The step MUST show the personas as a row of three
  chips, of which one is selected at a time: the first by default, and the selection MUST stay when
  the branch tab changes. Only the selected persona's values, under the heading "<Name>'s data"
  (such as "Mia's data"), and its results fill the panel. The step's intro reads "Choose a sample
  applicant to see which rules they meet and which messages they'd see. The data is made up, and
  nothing is shared."
- **FR-005**: A persona MUST have values for exactly the fields, and parts of fields, that at least
  one rule evaluated in some branch checks (spec 002, FR-009), and for no other data. Its values
  MUST be grouped by document and named as the rules name them (spec 002, FR-005), such as
  "Personal ID – Date of birth (Age)" or "Driving licence – Licence class B – Issue date". On
  screen, each document's values MUST appear under its heading, such as "Personal ID" or "Driving
  licence", which stands in for the document in their names, such as "Date of birth (Age)" under
  "Personal ID". When a rule checks the issue date or expiry date of a licence class, the persona
  MUST also have the "Licence classes" it holds, and MUST have that date only while it holds the
  class. "Licence
  classes" MUST list the codes in one row, such as "B, BE", and each class date that a rule checks
  MUST have a row of its own, such as "Licence class B – Issue date", not one date for several
  classes.
- **FR-006**: The team member MUST be able to change every value of a persona, with a value of its
  kind (spec 002, FR-003): any text; a whole number; a date; or values from the field's set, shown
  by their labels, and for the licence classes by their codes. "Personal ID – Nationality" and
  "Driving licence – Licence classes" take one or more values, every other enum field one; several
  values MUST be picked from a list, the licence classes by code (B, BE, C1, …) and nationalities by
  label (German, Italian, …), not typed. Every value the persona shows MUST have a field, with none
  left read-only or hidden. The team member MUST also be able to clear a value, which stands for a
  document that doesn't give it: an empty text or an empty list counts as missing, as for the
  evaluation (spec 002, FR-014). Editing MUST happen in the persona's panel, not in a dialog: "Edit
  data" turns the persona's values into fields, under the same document headings, and "Done" turns
  them back into values. There is nothing to confirm or cancel: every valid change applies at once
  (FR-017).
- **FR-007**: Next to a persona's "Date of birth", the step MUST show the age it gives today
  (FR-016), such as "08.07.2007 (age 19)", also while the values aren't being edited. The team
  member MUST be able to change the date of birth as a date, or by entering an age in "Age today",
  which sets a date of birth that gives that age today, keeping its day and month where possible.
- **FR-008**: An entry that isn't a valid value of its kind, such as a date that doesn't exist or a
  number with letters or decimals, MUST be pointed out under its field, such as "Enter a date that
  exists, e.g. 28.02.2007.", or "Enter a whole number, e.g. 25." under "Age today" for letters or
  decimals. Until it is corrected, the results MUST keep using that field's last valid value, while
  the persona's other changes apply.
- **FR-009**: A persona's name is a label for the team, not data that the rules check. The team
  member MUST be able to change it; a name left empty is pointed out under its field with "Enter a
  name.", and the persona keeps its previous name. When rules check a "Given name" or "Family
  name", they MUST be fields of their own under "Personal ID", labelled as the rules name them.
  Generation takes the persona's values for them from its name ("Mia Schulz" gives "Mia" and
  "Schulz"), but they are changed separately from it: renaming the persona changes neither.

#### Generating personas

- **FR-010**: Generated personas MUST be fictitious, with values that are plausible for an
  applicant to a serviceBW form unless a goal of FR-011 needs otherwise: a realistic name, a
  different one for each persona; a date of birth that gives an age between 18 and 80; no issue
  date before the date of birth and no expiry date before its issue date; and values that agree
  where two fields describe the same fact, such as the "Date of birth" of both documents and the
  licence's "Age in years" and "Year of birth". Each generation MUST draw new random values, so
  that two generations for the same rules normally differ.
- **FR-011**: Generation MUST choose the three personas so that, together, they reach these goals,
  in this order, as far as three personas allow:
  1. for every branch that some applicant can meet (spec 003, FR-004), a persona that meets its
     rules;
  2. for every branch that not every applicant meets (spec 003, FR-006), a persona that doesn't;
  3. for every two branches that some applicant meets differently, a persona that meets the rules
     of one and not those of the other;
  4. for every rule and group evaluated in some branch, a persona that meets it and a persona that
     doesn't, where applicants can do both.

  A goal that three personas can't reach together with the goals before it MUST be reached as far
  as possible. Generation MUST NOT trade a goal for a later one.
- **FR-012**: The team member MUST be able to generate one persona anew, which gives it new values
  chosen to reach the goals of FR-011 together with the other two personas, which don't change, and
  to generate all three anew. Either replaces the values the team member changed, and MUST first ask
  to confirm when it would. Generating all three anew MUST be a tertiary button "Generate all
  again", with a refresh icon, at the right end of the row of personas. Its question MUST be titled
  "Generate new data for all applicants?", say "Your changes to Mia's data will be replaced.",
  naming every persona with changes ("Your changes to Mia's and Anna's data will be replaced."),
  and offer "Cancel" and "Generate new data". While it runs, the step MUST show the same loading
  state as when the personas are first generated.
- **FR-013**: Generation MUST finish within 5 seconds, with the best personas found by then, whose
  values are still valid (FR-010). Editing the other personas, going back to the rules step,
  publishing and saving MUST NOT wait for it. The persona being generated MUST be shown as a
  placeholder, without "Edit data" and "Generate again", until its values arrive; while the
  personas are first generated, none can be edited until all three arrive. If generation stops
  with an error, such as a browser that can't run it, the step MUST show "Couldn't create sample
  applicants" and "Try again, or publish without testing." ("Try again, or save without testing."
  when editing) in place of the personas, with a "Try again" button that generates all three anew,
  and the branch tabs, going back, publishing and saving MUST stay usable.

#### Testing the personas

- **FR-014**: The system MUST test every persona against the rules of every branch, including the
  branches without rules, exactly as the evaluation would evaluate documents that give the persona's
  values and no others, shared today (spec 002, FR-009 to FR-014). For every persona and branch, the
  result MUST be what serviceBW would receive in the evaluation: whether the rules are met overall,
  the rules and groups reported, and their messages. For showing it (FR-015), the result MUST also
  hold the outcome of every top-level rule and group of the branch as the evaluation judges it.
- **FR-015**: For every persona and branch, the step MUST show whether the persona meets the
  branch's rules, not by colour alone: on each persona's chip by an icon that differs in shape, not
  only in colour, whose accessible name states the outcome, such as "Mia Schulz: meets the rules of
  Standard" or "Mia Schulz: doesn't meet the rules of Standard"; and for the selected persona in
  visible text, in its "Result: …" heading: "Result: meets the rules", or the number of reported
  items, a group counting as one, such as "Result: doesn't meet 1 rule and 1 group".
  For the selected persona, the step MUST list every rule and group whose error message serviceBW
  would receive (spec 002, FR-011), and after them every other top-level rule and group of the
  branch, each with its outcome as the evaluation judges it: a rule inside a group that is met
  doesn't count as failing. Under a branch the persona meets, the list MUST be headed "Rules
  <first name> meets", such as "Rules Mia meets". Each reported rule or group MUST show its name,
  its statement as the rules step words it (spec 002, FR-005), the status "Not met" or "Couldn't be
  checked" (spec 002, FR-014), each with its own icon, and its message. A met rule or group MUST
  show its name and its statement as the rules step words it, the same as a reported one, with a
  check icon and no message: in a branch the persona doesn't meet, its message column shows "–",
  and a branch the persona meets has no message column, since the evaluation gives no message
  then. Below a reported group, indented, the step MUST show
  its rules and sub-groups that aren't met or couldn't be checked, each with its name, statement
  and status, so that the team member sees why the group isn't met; the members of a group that
  isn't reported aren't listed. Branches MUST appear by their names, in the order of their tabs in
  the rules step.
- **FR-016**: "Today" MUST be the calendar date in Germany when the results are made, as for the
  evaluation (spec 002, FR-012). The step MUST say that the personas are tested as if they shared
  their documents today, and name the date, in one line directly under the step's intro: "Tested
  as if shared today, 29 Oct 2026." The line MUST show whenever results are shown, also while one
  persona is generated anew, and MUST NOT show while no results are shown: while the personas are
  first generated, or when generation failed.
- **FR-017**: After every valid change to a persona's values, the results MUST update at once,
  without the team member asking or confirming the change. Each persona whose outcome for a branch
  changes MUST be announced to assistive technologies through a polite status region that isn't
  visible, without moving the focus, such as "Mia Schulz now meets the rules of Standard." or "Mia
  Schulz no longer meets the rules of Standard." The step MUST NOT show a visible toast for it.
- **FR-018**: For a branch that no applicant can meet, the step MUST show spec 003's notice next to
  the personas' results for it, above the "Result: …" heading, such as "No applicant can meet the
  rules of Ambulance." (spec 003, FR-004), so that the team member doesn't try to edit a persona
  into meeting them. The branch's tab MUST also carry a warning icon whose tooltip shows the same
  text and opens on keyboard focus as well as on hover.

#### Keeping the personas while the rules change

- **FR-019**: The personas, with the team member's changes, MUST stay as they are while the team
  member moves between the steps of the create or edit flow, also after an attempt to publish or
  save that failed, and MUST be tested against the current rules each time the test step opens.
  They MUST be discarded once the form connection is published or saved, or the team member leaves
  the flow, and MUST NOT be stored: the next create or edit flow starts with new personas.
- **FR-020**: When the test step opens after the rules changed, the system MUST give every persona a
  value for each piece of data that rules now check and that it has no value for, chosen as
  generation would choose it (FR-010, FR-011), without changing any value the personas already
  have. Data that no evaluated rule checks any more MUST no longer be shown, and no result may
  depend on it; when a rule checks it again, it MUST come back with its earlier value. The results
  MUST follow the branches as they are: a branch added since gets results, and a deleted one loses
  them. The same holds for a licence class's dates when the persona stops and starts holding the
  class again (FR-005).

#### Access and data

- **FR-021**: Personas and their results MUST be visible only to signed-in DO.IT team members, in
  the test step (spec 002, FR-031). They MUST NOT be stored with the form connection (FR-019), MUST
  NOT be sent to a wallet or to EUDIPLO, MUST NOT be delivered to serviceBW, MUST NOT change any
  evaluation or anything else that specs 001 to 003 deliver, and MUST NOT be written to any log.

### Key Entities *(include if feature involves data)*

- **Persona**: A fictitious applicant used only in the test step. It has a name for the team and a
  value, possibly empty, for each piece of data that the rules check (FR-005). A form connection's
  create or edit flow has three, which last until the flow ends and are never stored (FR-019).
- **Persona value**: The persona's value for one field, or one part of a field, of one document,
  of the field's kind of value (spec 002, FR-003), or empty for a document that doesn't give it.
- **Test result**: The outcome of evaluating one persona against the rules of one branch, as if
  shared today: whether the rules are met overall, and the rules and groups whose messages
  serviceBW would receive, each not met or couldn't be checked, with their messages; and, for
  showing them, the outcome of every top-level rule and group as the evaluation judges it (FR-014,
  FR-015).
- **Test day**: Today's calendar date in Germany, on which every persona is tested (FR-016).
- **Rule, Group, Sub-group, Branch** (spec 002) and **Finding** (spec 003): unchanged. The test
  step evaluates the rules and shows spec 003's notice of a branch that no applicant can meet.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In acceptance testing, for every persona and branch, the test step's result matches
  in 100% of cases the evaluation that serviceBW receives for test documents that give the same
  values, shared on the same day: the overall outcome, the rules and groups reported, whether each
  isn't met or couldn't be checked, and the messages. The cases include those of spec 002, SC-003:
  a birthday on the day of sharing, a 29 February birthday, an age exactly at the limit, a date
  some months from now at the end of a month, a rule on a class the licence doesn't hold, letter
  case, German letters and spaces at the start and end.
- **SC-002**: For every rule set of an acceptance catalogue with up to 3 branches of up to 20 rules,
  groups and sub-groups each, for which three personas can reach goals 1 to 3 of FR-011, 20
  generations in a row each reach them. Across the catalogue, at least 90% of the rules that
  applicants can both meet and fail are met by at least one persona and failed by at least one.
- **SC-003**: In branches of up to 50 rules, groups and sub-groups, the personas and their results
  appear within 2 seconds of the test step opening, and the results update within 1 second of
  each change to a persona. At spec 002's limits, nothing but the persona being generated waits
  for generation, which ends within 5 seconds.
- **SC-004**: In usability testing with a rule set that contains a mistake that spec 003 doesn't
  report, such as the age limits of Standard and Ambulance swapped, at least 4 of 5 DO.IT
  participants find the mistake with the test step within 3 minutes and without help.
- **SC-005**: In usability testing, at least 4 of 5 DO.IT participants turn a generated persona
  into a given case, such as an applicant who turns 21 today and holds class BE but not class B,
  within 2 minutes and without help.
- **SC-006**: In 100% of requests, serviceBW receives exactly what it would receive without this
  feature, and no persona value or test result leaves the management interface.
- **SC-007**: The test step meets WCAG 2.1 level AA, like the rest of the management interface
  (spec 002, SC-009): the accessibility review before release finds no unresolved failures.

## Assumptions

- **Builds on specs 002 and 003**: This feature adds the "trying rules out with sample data in the
  management interface" that [spec 002](../002-connection-rules/spec.md) left out of scope. Every
  requirement of specs 001 to 003 still applies, and references such as "spec 002, FR-009" point to
  them. Spec 003 isn't fully implemented yet; this spec assumes that it is, as the feature
  description says, and uses its notion of a branch that no applicant, or every applicant, can meet.
- **The evaluation decides**: The test step shows what the evaluation of spec 002 decides for
  documents with the personas' values. It doesn't judge whether a rule is right; that stays with
  DO.IT (spec 002, "Lawful rules").
- **Fictitious data only**: Personas are made up by the system or the team member, and are never
  real people's data. No wallet, test document or EUDIPLO is involved, so the test step works
  before the form connection is published.
- **Three personas**: The feature description asks for three. Adding or removing personas is out of
  scope; generating them anew and editing them covers further cases.
- **Plausible values**: The age range of 18 to 80 and the other limits of FR-010 apply only to
  generated values where the rules allow them. Team members can enter any value of the right kind.
- **The test step's place**: The feature description puts the test step between the rules step and
  publishing, and publishing and saving move there (Clarifications, 2026-10-29). A form connection
  without rules has nothing to test, so the flow skips the step, as "Publish without rules" already
  skips the rules step.
- **Design**: The test step is designed in Figma file "Middleware – V4", section "Test · 1 · Test
  rules" (node 7057:58708). That file also redesigns the whole site, which is out of scope here:
  only what this spec covers is built from it. Where the design and this spec differed, the
  Clarifications of 2026-11-01 decide. The rules and documents steps have no frames: their changes
  are built from the current steps. The step is built from KERN patterns, inside the wizard
  frame of spec 001 (header, progress, action bar), and the progress names the step "Test".
  The UI says "persona", "variant" for branch and "connection" for form connection, as in specs 002
  and 003. Final wording belongs to the design notes.
- **Out of scope**: more or fewer than three personas; expected outcomes that the team member
  records for a persona, such as "should meet Ambulance", and checks against; keeping personas
  after the form connection is published or saved, for example to test the next edit with them
  again (Clarifications, 2026-10-29); testing as if shared on another day than today; testing
  with real documents or a wallet; showing which rules no persona meets or fails; showing personas
  or results on a form connection's details or in the overview; and changing the publish and save
  dialog.
