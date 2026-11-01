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
  of Ambulance.", next to the personas' results for that branch (FR-018).
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
  letters or decimals is pointed out where it is entered, and the results keep using the persona's
  last valid value until it is corrected (FR-008).
- **More rules than three personas can cover**: Three personas can't always meet and fail every
  rule. Generation reaches its goals in the order of FR-011 as far as three personas allow, and the
  team member can edit or generate the personas anew to test the rest.
- **Generation takes too long**: In a branch at spec 002's limit of 200 rules and groups,
  generation stops after 5 seconds with the best personas found so far, which still have valid
  values (FR-013). Nothing waits for it.
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
  publishing would give. While a rule editor has unsaved changes, it MUST first ask to keep or
  discard them, as publishing does. The test step therefore tests exactly the rules that
  publishing or saving would store.
- **FR-003**: Once a branch has a rule, or a rule editor is open, the rules step's single button to
  go on MUST be "Test rules", which opens the test step (FR-002); the rules step MUST NOT offer
  "Publish" or "Save" any more, nor "Publish without rules" except as FR-001 says. The test step
  MUST offer going back to the rules step, and "Publish" ("Save" when editing), which opens the publish
  and save dialog of specs 002 and 003, unchanged. Every publish or save of a form connection with
  rules therefore goes through the test step. The personas' results MUST NOT refuse, delay or add
  a question to publishing or saving, nor disable any action.

#### Personas

- **FR-004**: The test step MUST show three personas: fictitious applicants, each with a name and a
  value for every piece of data that the rules check (FR-005). The system MUST generate them when
  the test step first opens (FR-010, FR-011).
- **FR-005**: A persona MUST have values for exactly the fields, and parts of fields, that at least
  one rule evaluated in some branch checks (spec 002, FR-009), and for no other data. Its values
  MUST be grouped by document and named as the rules name them (spec 002, FR-005), such as
  "Personal ID – Date of birth (Age)" or "Driving licence – Licence class B – Issue date". When a
  rule checks the issue date or expiry date of a licence class, the persona MUST also have the
  "Licence classes" it holds, and MUST have that date only while it holds the class.
- **FR-006**: The team member MUST be able to change every value of a persona, with a value of its
  kind (spec 002, FR-003): any text; a whole number; a date; or values from the field's set, shown
  by their labels, and for the licence classes by their codes. "Personal ID – Nationality" and
  "Driving licence – Licence classes" take one or more values, every other enum field one. The team
  member MUST also be able to clear a value, which stands for a document that doesn't give it: an
  empty text or an empty list counts as missing, as for the evaluation (spec 002, FR-014).
- **FR-007**: Next to a persona's "Date of birth", the step MUST show the age it gives today (FR-016).
  The team member MUST be able to change the date of birth as a date, or by entering an age, which
  sets a date of birth that gives that age today, keeping its day and month where possible.
- **FR-008**: An entry that isn't a valid value of its kind, such as a date that doesn't exist or a
  number with letters or decimals, MUST be pointed out where it is entered. Until it is corrected,
  the results MUST keep using the persona's last valid value.
- **FR-009**: A persona's name is a label for the team, not data that the rules check. The team
  member MUST be able to change it; a name left empty is pointed out where it is entered, and the
  persona keeps its previous name. When rules check a "Given name" or "Family name", generation
  takes the persona's values for them from its name, but they are changed separately from it.

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
  to confirm when it would.
- **FR-013**: Generation MUST finish within 5 seconds, with the best personas found by then, whose
  values are still valid (FR-010). Editing the personas, going back to the rules step, publishing
  and saving MUST NOT wait for it.

#### Testing the personas

- **FR-014**: The system MUST test every persona against the rules of every branch, including the
  branches without rules, exactly as the evaluation would evaluate documents that give the persona's
  values and no others, shared today (spec 002, FR-009 to FR-014). For every persona and branch, the
  result MUST be what serviceBW would receive in the evaluation: whether the rules are met overall,
  the rules and groups reported, and their messages.
- **FR-015**: For every persona and branch, the step MUST show whether the persona meets the
  branch's rules, in text and not by colour alone. When it doesn't, the step MUST show each rule and
  group whose error message serviceBW would receive (spec 002, FR-011), by its name and its
  statement (spec 002, FR-005), whether it isn't met or couldn't be checked (spec 002, FR-014), and
  the message. For a group reported with a message of its own, the step MUST also show which of its
  rules and sub-groups aren't met or couldn't be checked, so that the team member sees why the
  group isn't met. Branches MUST appear by their names, in the order of their tabs in the rules
  step.
- **FR-016**: "Today" MUST be the calendar date in Germany when the results are made, as for the
  evaluation (spec 002, FR-012). The step MUST say that the personas are tested as if they shared
  their documents today, and name the date, such as "Tested as if shared today, 29 Oct 2026."
- **FR-017**: After every change to a persona's values, the results MUST update at once, without the
  team member asking. Each persona whose outcome for a branch changes MUST be announced to assistive
  technologies through a polite status region, without moving the focus, such as "Lena Hoffmann now
  meets the rules of Ambulance." or "Lena Hoffmann no longer meets the rules of Standard."
- **FR-018**: For a branch that no applicant can meet, the step MUST show spec 003's notice next to
  the personas' results for it, such as "No applicant can meet the rules of Ambulance." (spec 003,
  FR-004), so that the team member doesn't try to edit a persona into meeting them.

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
  serviceBW would receive, each not met or couldn't be checked, with their messages (FR-014,
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
  each change to a persona. At spec 002's limits, nothing waits for generation, which ends within
  5 seconds.
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
- **Design**: No UI design for the test step exists yet. It is built from KERN patterns, inside the
  wizard frame of spec 001 (header, progress, action bar), and the progress names the step "Test".
  The UI says "persona", "variant" for branch and "connection" for form connection, as in specs 002
  and 003. Final wording belongs to the design notes.
- **Out of scope**: more or fewer than three personas; expected outcomes that the team member
  records for a persona, such as "should meet Ambulance", and checks against; keeping personas
  after the form connection is published or saved, for example to test the next edit with them
  again (Clarifications, 2026-10-29); testing as if shared on another day than today; testing
  with real documents or a wallet; showing which rules no persona meets or fails; showing personas
  or results on a form connection's details or in the overview; and changing the publish and save
  dialog.
