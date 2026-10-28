# Feature Specification: Conflict and Redundancy Checks for Rules

**Feature Branch**: `rules-check`

**Created**: 2026-10-28

**Status**: Draft

**Input**: User description: "Rules can be created and at the moment they allow duplications and conflicts. For example if we have R1: age > 10, R2: age > 11, then R1 AND R2 makes the R2 redundant. Or we can have conflicts: R3: nationality == Germany, R4: nationality == Italy, R3 AND R4 cannot be satisfied and this means that every applicant will not met this rules. We now want to create a new feature that does statics check on the rules created and check if they can be satisfied or if they are redundant.

The rule page will then make these check every time we create/modify/duplicate/delete a rule and mark conflicts or duplication. Rules are checked also inside groups and subgroups. The totality of the rules needs to be satisfiable, but does not block the user to publish the connection."

## Clarifications

### Session 2026-10-28

- Q: Can a team member dismiss a finding about a rule they keep on purpose, such as "Licence classes
  includes one of B" next to "Licence class B – Issue date is at least 2 years ago", kept for its
  clearer message? → A: No. Findings stay shown while their cause remains, and nothing about them is
  stored. Redundant and always-met findings are shown less prominently than conflicts, since they
  turn no one away (FR-019).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See rules that no applicant can meet (Priority: P1)

A team member sets up the rules of a form connection ([spec 002](../002-connection-rules/spec.md))
and, by mistake, combines rules that exclude each other, such as "Driving licence – Nationality
includes one of Germany" and "Driving licence – Nationality includes one of Italy" with AND. Today
the rules step accepts them, the form connection goes live, and every applicant is told that they
don't meet the rules; DO.IT finds out only when citizens complain. With this feature, the rules step
checks the rules whenever they change and marks the rules and groups that can't be met together, at
the top level, in groups and in sub-groups. When a conflict means that no applicant can meet a
branch's rules at all, the rules step says so for the whole branch. The marks are advice: the team
member can still publish or save.

**Why this priority**: A branch whose rules no one can meet turns away every applicant of the form.
It is the most harmful mistake a team member can make in the rules step, and the hardest to notice
by reading the rules one by one.

**Independent Test**: In the rules step, build the conflicting rules of the scenarios below, at the
top level, in a group and in a sub-group. Check that the marks, their explanations and the branch's
notice appear and disappear as the rules change, and that publishing stays possible.

**Acceptance Scenarios**:

1. **Given** the main branch with Rule 01 "Driving licence – Nationality includes one of Germany",
   **When** the team member adds Rule 02 "Driving licence – Nationality includes one of Italy" to
   the same level, combined with AND, **Then** both rules are marked as conflicting, each naming the
   other, and the rules step says that no applicant can meet the branch's rules.
2. **Given** those two rules, **When** the team member switches their level to OR, **Then** the
   marks and the notice disappear, since an applicant can meet either rule.
3. **Given** a top level combined with AND that holds a group combined with AND of "Driving licence
   – Age in years is greater than 30" and "Driving licence – Age in years is less than 20", **When**
   the checks run, **Then** both rules are marked as conflicting, the group is marked as one that no
   applicant can meet, and the rules step says that no applicant can meet the branch's rules. The
   same holds for a sub-group inside a group.
4. **Given** a top level combined with OR that holds the group of scenario 3 and Rule 03 "Personal
   ID – Nationality includes one of Germany", **When** the checks run, **Then** the group and its
   two rules are marked, but the branch has no notice, since applicants can still meet Rule 03.
5. **Given** a top level combined with AND that holds Rule 01 "Personal ID – Date of birth (Age) is
   at least 21 years old" and an OR group of Rule 02 "Personal ID – Date of birth (Age) is less than
   18 years old" and Rule 03 "Driving licence – Licence classes includes one of B", **When** the
   checks run, **Then** Rule 02 is marked as conflicting with Rule 01: it can never let an applicant
   through, since every applicant must also meet Rule 01. Rule 01, Rule 03 and the group aren't
   marked, and the branch has no notice.
6. **Given** a conflict, **When** the team member edits, deletes or ungroups the rules involved so
   that they can be met together, or undoes such a change, **Then** the marks update at once,
   without the team member asking for a check.
7. **Given** a branch that no applicant can meet, **When** the team member publishes or saves,
   **Then** the form connection is published or saved, and serviceBW receives what spec 002 defines
   for it: an evaluation that says the rules aren't met, for every applicant.

---

### User Story 2 - See rules that make no difference (Priority: P2)

Rules that repeat or imply each other make a branch longer and harder to read, and a team member
who changes one of them may believe that the form's requirement changed when it didn't. The rules
step also marks every rule and group that makes no difference to whether applicants meet the
branch's rules: a duplicate, a rule implied by another one, a group that every applicant meets.
Within a level combined with AND, it is the weaker rule that adds nothing: next to "Age in years is
greater than 11", "is greater than 10" is met by everyone who meets the first. Within a level
combined with OR, it is the stronger one: next to "is greater than 10", "is greater than 11" lets
no one through that the first doesn't. Each mark names the rules that make the item redundant, and
the team member decides whether to delete it or keep it.

**Why this priority**: Redundant rules don't turn anyone away, so they matter less than conflicts.
They do hide mistakes, such as an OR that should have been an AND, and they make branches harder to
maintain.

**Independent Test**: Build the rules of the scenarios below and check the marks and their
explanations. Then delete every item marked redundant and check with test documents that every
applicant gets the same overall result as before.

**Acceptance Scenarios**:

1. **Given** Rule 01 "Driving licence – Age in years is greater than 10" and Rule 02 "Driving
   licence – Age in years is greater than 11" in a level combined with AND, **When** the checks run,
   **Then** Rule 01 is marked redundant, naming Rule 02, and Rule 02 isn't marked.
2. **Given** the same two rules in a level combined with OR, **When** the checks run, **Then** Rule
   02 is marked redundant, naming Rule 01, and Rule 01 isn't marked.
3. **Given** a rule, **When** the team member duplicates it, **Then** the copy is marked as the same
   check as the original, which isn't marked; **When** the team member then changes the copy's
   value, **Then** the mark disappears, unless the new condition still makes no difference.
4. **Given** Rule 01 "Driving licence – Licence classes includes one of B" and Rule 02 "Driving
   licence – Licence class B – Issue date is at least 2 years ago" in a level combined with AND,
   **When** the checks run, **Then** Rule 01 is marked redundant, naming Rule 02, since a rule on a
   class's date is met only by a licence that lists the class (spec 002, FR-014).
5. **Given** an OR group of "Driving licence – Age in years is greater than 18" and "Driving licence
   – Age in years is less than 21", **When** the checks run, **Then** the group is marked as met by
   every applicant, and the team member sees that they probably meant AND.
6. **Given** a top level combined with AND that holds Rule 01 "Personal ID – Date of birth (Age) is
   at least 21 years old" and an OR group of "Personal ID – Date of birth (Age) is at least 18 years
   old" and "Personal ID – Nationality includes one of Germany", **When** the checks run, **Then**
   the group is marked redundant, naming Rule 01, and the rules inside it aren't marked.
7. **Given** a branch with items marked redundant, **When** the team member deletes all of them,
   **Then** whether an applicant meets the branch's rules stays the same for every applicant whose
   documents give every value that the rules check.

---

### User Story 3 - Checks in every branch (Priority: P2)

Each branch of a form connection is evaluated on its own (spec 002, FR-025), so each branch is
checked on its own too, with the rules it inherits from the main branch, changes and adds. A change
to the main branch can cause a conflict in a branch based on it that the team member isn't looking
at, so each branch's tab shows whether the branch has findings.

**Why this priority**: Forms with branches depend on it, but forms with a single branch get the full
value of the checks from User Stories 1 and 2.

**Independent Test**: Set up spec 002's "Passenger transport licence" form connection with an
"Ambulance" branch based on the main branch. Cause a conflict in "Ambulance" by changing the main
branch, and check the marks in both branches and on their tabs.

**Acceptance Scenarios**:

1. **Given** the main branch "Standard" with Rule 02 "Driving licence – Licence classes includes
   one of B", and the "Ambulance" branch based on it, which adds Rule 05 "Driving licence – Licence
   classes includes none of C", **When** the team member changes Rule 02 in Standard to "includes
   one of C", **Then** the "Ambulance" tab shows that the branch has findings, Rule 02 and Rule 05
   are marked as conflicting there, and Standard gets no conflict.
2. **Given** a rule that the "Ambulance" branch removed (spec 002, FR-023), **When** the checks run,
   **Then** it isn't checked in "Ambulance" and carries no finding there, and the findings it took
   part in disappear from "Ambulance"; **When** the team member restores it, **Then** it is checked
   again.
3. **Given** a branch that started empty, **When** the team member adds rules to it, **Then** they
   are checked without the main branch's rules.
4. **Given** a conflict in the main branch between rules that the "Ambulance" branch inherits
   unchanged, **When** the checks run, **Then** the conflict is shown in both branches.
5. **Given** a rule in "Ambulance" that carries the branch mark "Changed here" and a finding, **When**
   the team member looks at it, **Then** both marks are shown, and they can be told apart.

---

### User Story 4 - See the findings before publishing (Priority: P3)

When the team member publishes or saves, the dialog that summarises the documents and the rules of
each branch (spec 002, FR-028) also names the branches with findings, so that no one publishes a
branch that no applicant can meet without having seen it. The findings never block publishing or
saving: the team member may keep a rule on purpose, and the rules work as the evaluation defines
them, even when they aren't what the team member meant.

**Why this priority**: The rules step already shows every finding (User Stories 1 to 3). The dialog
is a last reminder.

**Independent Test**: Publish a form connection with a conflict in one branch and a redundant rule
in another. Check the dialog's summary, "Check rules again", and that publishing succeeds.

**Acceptance Scenarios**:

1. **Given** the "Ambulance" branch with a conflict and the main branch with a redundant rule,
   **When** the team member opens the publish or save dialog, **Then** the dialog names both
   branches, each with the number of its findings of each kind, and "Publish" or "Save" is
   available.
2. **Given** a branch that no applicant can meet, **When** the dialog opens, **Then** it says, for
   that branch, that no applicant can meet its rules.
3. **Given** the dialog with findings, **When** the team member chooses "Check rules again",
   **Then** the rules step opens on the first branch, in tab order, that has findings.
4. **Given** a form connection without findings, **When** the dialog opens, **Then** it shows
   nothing about findings, as before this feature.
5. **Given** findings, **When** the team member publishes or saves, **Then** it goes ahead without
   a further question.

---

### Edge Cases

- **Fields with several values**: The Personal ID's "Nationality" can list several countries, and a
  driving licence lists several classes. "Personal ID – Nationality includes one of Germany" and
  "includes one of Italy", combined with AND, are met by a citizen with both nationalities, so they
  don't conflict. With the driving licence's "Nationality", which holds one country, they do
  (FR-007). "Licence classes includes one of B" and "includes one of C" don't conflict either.
- **Letter case**: "Personal ID – City or town is equal to Stuttgart" and "is equal to STUTTGART",
  both ignoring letter case, are the same check, and the later one is redundant. Both respecting
  letter case, they conflict. If only the first respects letter case, the second is redundant in a
  level combined with AND, since whoever meets the first meets it. German letters, accents and
  spaces at the start and end count as the evaluation counts them (spec 002, FR-013): ignoring
  letter case, "contains straße" and "contains STRASSE" are the same check.
- **Text inside other text**: "City or town is equal to Stuttgart" and "doesn't contain gart",
  combined with AND, conflict. "Is equal to Stuttgart" makes "contains Stutt" redundant there.
- **Whole numbers**: "Age in years is greater than 20" and "is less than 21", combined with AND,
  conflict, since the number fields hold whole numbers (FR-007).
- **Adjacent dates**: "Expiry date is before 1 Jan 2030" and "is after 31 Dec 2029", combined with
  AND, conflict, since "is before" and "is after" exclude the date itself (spec 002, FR-003).
- **Years and months**: "Expiry date is at least 12 months from now" and "is at least 1 year from
  now" are the same check. "Date of birth (Age) is exactly 21 years old" makes "is at least 18 years
  old" redundant in a level combined with AND.
- **A fixed date against the day of sharing**: "Personal ID – Date of birth is after 1 Jan 2010"
  and "Date of birth (Age) is at least 21 years old", combined with AND, can't be met by anyone who
  shares today, though they can from 2 Jan 2031 on. The finding says that it applies to applicants
  who share today (FR-008). "Date of birth is before 1 Jan 2010" next to "is at least 18 years old"
  isn't reported as redundant, although it adds nothing today: from 1 Jan 2028 on, it would.
- **An enum rule with every value**: A rule that "includes none of" every value of its field's set
  can't be met by any applicant. One that "includes one of" every value is met by every applicant
  (FR-007).
- **Duplicates and copies**: A duplicated rule is the same check as its original until the team
  member changes it, so it is marked redundant at first (US2-AS3). A rule copied to another branch
  (spec 002, FR-022) is checked there, with that branch's rules.
- **Rules that are redundant only because of each other**: Of two rules with the same check, only
  the later one in the order shown is marked, so that deleting every marked item at once changes
  nothing (FR-005).
- **A conflict among more than two rules**: "Age in years is greater than 17", "is less than 20",
  "is not equal to 18" and "is not equal to 19", combined with AND, can't all be met, although any
  three of them can. Each of the four is marked, naming the other three (FR-003).
- **Removed rules and dissolved groups**: In a branch based on the main branch, the rules and groups
  removed there aren't checked, and a group dissolved there is checked as its remaining member, as
  the evaluation does (spec 002, FR-009).
- **Rules with problems**: A rule whose condition is incomplete, or that checks data the form
  connection no longer requests, is left out of the checks until it is fixed. The rules step shows
  its problem as before (spec 002, FR-006). A rule without an error message is checked, since its
  message doesn't change who meets it.
- **The rule being edited**: Unsaved changes in an open rule editor aren't checked. The rule counts
  as it was last saved in the rules step, and a new rule counts once it is added (FR-002).
- **A branch without rules**: It has no findings. A branch without rules is met by every applicant
  by definition (spec 002, FR-009), which isn't reported. The same goes for a branch based on the
  main branch whose rules are all removed there.
- **Missing values**: A rule whose value is missing, or can't be read, is never met (spec 002,
  FR-014), so missing values can't make conflicting rules met. The checks consider applicants whose
  documents give every value that the rules check (FR-009).
- **Fields that describe the same fact**: The "Date of birth" of the Personal ID and that of the
  driving licence, and the licence's "Age in years" and "Year of birth", are checked as separate
  fields. "Personal ID – Date of birth (Age) is at least 21 years old" and "Driving licence – Age in
  years is less than 18" aren't reported as conflicting, though the two documents should describe
  the same person (FR-007).
- **Unlikely values**: A date of birth in the future, an age of 200 or a licence that expired ten
  years ago are values an applicant could have in principle, so rules that require them aren't
  reported (Assumptions).
- **Checks that take too long**: If a branch's checks can't finish in time, the rules step says that
  the branch's rules couldn't be checked completely, shows only the findings that are certain, and
  doesn't hold up editing, publishing or saving (FR-010).
- **A branch that no applicant can meet, with redundant rules**: Only its conflicts are reported.
  Its redundant items are marked once the conflict is resolved (FR-005).
- **Rules published before this feature**: They are checked when a team member opens the rules step
  of the edit flow. Nothing changes for serviceBW (FR-018).

## Requirements *(mandatory)*

### Functional Requirements

#### What is checked

- **FR-001**: The system MUST check the rules of every branch of the form connection being created
  or edited for conflicts and for redundancy, at the top level, in every group and in every
  sub-group, with their AND and OR. Each branch MUST be checked on its own, as it is evaluated (spec
  002, FR-009): with the rules it inherits from the main branch, changes and adds, without the rules
  and groups removed in it, and with a group dissolved in it checked as its remaining member.
  Branches MUST NOT be compared with each other.
- **FR-002**: The checks MUST cover every rule whose condition is complete and that checks data the
  form connection requests, whether or not it has an error message. A rule whose condition is
  incomplete, or that checks data the form connection no longer requests, MUST be left out until it
  is fixed; the rules step reports it as spec 002, FR-006 says. Unsaved changes in an open rule
  editor MUST NOT be checked: the rule counts as it was last saved in the rules step, and a new rule
  counts once it is added. The rule editor MAY point out, before the rule is saved, that its
  condition would conflict with another rule or make no difference.

#### Conflicts

- **FR-003**: A rule or group MUST be reported as **conflicting** when no applicant can meet it on
  its own, or when an applicant can meet the rules and groups combined by AND with it, or with a
  group that contains it, but no applicant can meet those and it as well. The report MUST say why:
  the rules and groups it can't be met together with, as a smallest such set; for a group that can't
  be met on its own, the conflicting rules and sub-groups inside it; for a rule that can't be met on
  its own, its condition. A rule or group MUST NOT be reported as conflicting only because something
  it is combined with can't be met on its own.
- **FR-004**: When no applicant can meet a branch's top level, the rules step MUST say, for the
  whole branch, that no applicant can meet its rules, such as "No applicant can meet the rules of
  Ambulance.", for as long as this is so.

#### Redundancy

- **FR-005**: A rule or group MUST be reported as **redundant** when deleting it would change, for no
  applicant (FR-009) on any day of sharing from today on, whether the branch's rules are met (spec
  002, FR-009). The report MUST say why: the rules and groups whose check is the same, those that
  imply it in a level combined with AND, or those it implies in a level combined with OR. A group
  that is redundant or always met (FR-006) MUST be reported, and the rules and sub-groups inside it
  MUST NOT be. Of items that are
  redundant only because of each other, such as two rules with the same check, only the one that
  comes later in the order shown (spec 002, FR-007) MUST be reported, so that deleting every item
  reported redundant at once never changes whether an applicant meets the branch's rules. Redundancy
  MUST NOT be reported in a branch that no applicant can meet, nor for a conflicting rule or group or
  anything inside one.
- **FR-006**: A rule or group that every applicant meets, on every day of sharing from today on,
  MUST be reported as **always met** instead of as redundant, also in a level combined with OR,
  where deleting it would make a difference. It MUST NOT be reported where FR-005 rules out
  reporting redundancy. When every applicant
  meets a branch's top level, and the branch has rules that are checked, the rules step MUST say so
  for the whole branch, such as "Every applicant meets the rules of Standard."

#### How the checks judge the rules

- **FR-007**: The checks MUST judge every condition as the evaluation does (spec 002, FR-003 and
  FR-012 to FR-014), so that no finding contradicts an evaluation. In particular:
  - text is compared with or without letter case as each rule says, with German letters and
    accents counted as the evaluation counts them, and without spaces at the start and end;
  - years and months are counted as spec 002, FR-012 counts them, and "is before" and "is after"
    exclude the given date;
  - an enum field's values come from its set. The Personal ID's "Nationality" and the driving
    licence's "Licence classes" hold one or more values; every other enum field, and the country of
    the "Place of birth", holds one;
  - the number fields hold whole numbers;
  - a rule on the issue date or the expiry date of a licence class is met only by a licence that
    lists the class, so it implies that "Licence classes includes one of" that class;
  - apart from that, every field and every part of a field is independent of the others, also where
    two fields describe the same fact, such as the "Date of birth" of two documents.
- **FR-008**: Some findings depend on the day the applicant shares, because they compare a fixed
  date with a number of years or months counted from that day. Such a conflict, including a branch
  that no applicant can meet, MUST be judged for applicants who share today, by the calendar date in
  Germany, and MUST say that it applies to applicants who share today. Redundant and always-met
  items, and a branch that every applicant meets, MUST be reported only when they hold on every day
  from today on, so that acting on them never changes an outcome later.
- **FR-009**: The checks MUST consider applicants whose documents give every value that the rules
  check. A missing value, or one that can't be read, only makes rules fail (spec 002, FR-014), so it
  can't make conflicting rules met. For an applicant whose documents lack a value, an item reported
  redundant or always met may still make the rules fail, which the evaluation reports as couldn't
  be checked.
- **FR-010**: Every finding MUST be true by FR-007 to FR-009, and the checks MUST find every
  conflicting, redundant and always-met item of the rules they check. If the checks of a branch
  can't finish within 5 seconds, the rules step MUST say that the branch's rules couldn't be checked
  completely, and MUST show only findings that are certain. Editing, publishing and saving MUST NOT
  wait for the checks.

#### When the checks run

- **FR-011**: The checks MUST run when the rules step opens, in the create and in the edit flow, and
  again after every change to the rules of any branch, without the team member asking: adding,
  editing, duplicating, copying, renaming, grouping, ungrouping and deleting rules and groups,
  switching AND or OR, removing, restoring and undoing in a
  branch based on the main branch, adding and deleting branches, and every change that a branch
  follows from the main branch (spec 002, FR-021). A change in the documents step that leaves rules
  checking data the form connection no longer requests MUST update the findings too (FR-002).
  Findings MUST name rules and groups by their current names.

#### Showing the findings

- **FR-012**: In the rules step, every rule and group with a finding MUST carry a mark that says
  whether it is conflicting, redundant or always met, in text or with a symbol that has a text
  alternative, so that the kind doesn't rest on colour alone. The marks MUST be distinguishable from
  the branch marks of spec 002, FR-023, which an item can carry at the same time, and from the
  problems that refuse publishing (spec 002, FR-006). The finding's explanation MUST be available
  from its mark and name the rules and groups involved by their names (spec 002, FR-005), such as
  "Can't be met together with Rule 02." or "Makes no difference: whoever meets Rule 02 meets this
  rule too."
- **FR-013**: For the branch shown, the rules step MUST summarise its findings above its rules: how
  many there are of each kind, and the notice of FR-004 or FR-006. From the summary, the team member
  MUST be able to reach every rule and group with a finding.
- **FR-014**: Each branch's tab MUST show whether the branch has findings, and how many, so that the
  findings of a branch other than the one shown are noticed, such as those that a change to the main
  branch causes. The indication MUST have a text alternative.
- **FR-015**: When an action changes the findings, the change MUST be announced to assistive
  technologies without moving the focus, such as "Rule 02 conflicts with Rule 01." or "No conflicts
  left in Ambulance."

#### Publishing and saving

- **FR-016**: Findings MUST NOT refuse, delay or add a step to publishing or saving, nor disable any
  action. A form connection with findings, including a branch that no applicant can meet, MUST be
  published and saved like any other.
- **FR-017**: The publish and save dialog (spec 002, FR-028) MUST name every branch that has
  findings, with how many of each kind, and MUST say, for a branch that no applicant can meet, that
  no applicant can meet its rules. Without findings, it shows nothing about them. Its "Check rules
  again" MUST open the rules step on the first branch, in tab order, that has findings.
- **FR-018**: Findings MUST NOT be delivered to serviceBW, and MUST NOT change the evaluation or
  anything else that spec 002 delivers. They follow from the rules each time the checks run.
- **FR-019**: A finding MUST stay shown for as long as the rules that cause it stay as they are:
  team members can't dismiss it, and nothing about findings is stored. Since redundant and
  always-met items, and a branch that every applicant meets, turn no one away, the rules step and
  the publish and save dialog MUST show them less prominently than conflicts and a branch that no
  applicant can meet, so that a rule kept on purpose, such as "Licence classes includes one of B"
  next to "Licence class B – Issue date is at least 2 years ago", doesn't read as a mistake.
- **FR-020**: Findings MUST be visible only to signed-in DO.IT team members, as the rules are (spec
  002, FR-031).

### Key Entities *(include if feature involves data)*

- **Checked rules**: The rules and groups of one branch that the evaluation would use (spec 002,
  FR-009), less the rules with an incomplete condition or that check data no longer requested
  (FR-002).
- **Rule check**: The check of one branch's checked rules for conflicts and redundancy, made when
  the rules step opens and after every change (FR-011). It changes no rule, and nothing of it is
  delivered to serviceBW.
- **Finding**: What a rule check reports. On a rule or group: conflicting (FR-003), redundant
  (FR-005) or always met (FR-006), with the rules and groups it names as the reason. On a branch:
  that no applicant can meet its rules (FR-004), or that every applicant does (FR-006). A finding
  that depends on the day of sharing says that it applies today (FR-008).
- **Rule, Group, Sub-group, Branch** (spec 002): unchanged. Findings are about them.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In acceptance testing with a catalogue of rule sets that covers every kind of
  condition, the examples and edge cases of this spec, groups, sub-groups, AND and OR, and branches
  based on the main branch, 100% of the conflicting, redundant and always-met items and branches
  that the catalogue contains are reported, and 0 findings are reported that aren't true.
- **SC-002**: In every branch of that catalogue, deleting all items reported redundant at once
  changes whether the rules are met for 0 of the test applicants whose documents give every value
  that the rules check.
- **SC-003**: In 95% of changes to branches of up to 50 rules, groups and sub-groups, the findings
  update within 1 second. In branches at spec 002's limit of 200, no change makes the team member
  wait for the checks, and every branch is checked, or reported as not checked completely, within
  5 seconds.
- **SC-004**: 100% of the form connections with findings, including branches that no applicant can
  meet, can be published and saved, and serviceBW receives exactly what it would receive without
  this feature.
- **SC-005**: In usability testing, at least 4 of 5 DO.IT participants find a conflict planted in a
  sub-group and a redundant rule planted at the top level, and name the rules involved in each,
  within 2 minutes and without help.
- **SC-006**: The marks, the branch's summary, the tabs' indications and the publish dialog's
  findings meet WCAG 2.1 level AA, like the rest of the management interface (spec 002, SC-009): the
  accessibility review before release finds no unresolved failures.

## Assumptions

- **Builds on spec 002**: This feature adds the "warnings about rules that contradict or repeat each
  other" that [spec 002](../002-connection-rules/spec.md) left out of scope. Every requirement of
  spec 002, and of spec 001, still applies, and references such as "spec 002, FR-009" point to it.
- **Advice, not validation**: Findings say what the rules mean, not whether they are valid. Spec
  002's checks still refuse incomplete rules when publishing or saving (FR-006); findings never
  refuse anything. DO.IT stays responsible for rules that match each form's legal requirements
  (spec 002, "Lawful rules").
- **Which rule is redundant**: The feature description says that "age > 10" AND "age > 11" makes the
  second rule redundant. It is the first: everyone over 11 is over 10, so "age > 10" never decides
  an outcome. With OR, it is the second. FR-005 and User Story 2 follow this logic.
- **The description's nationality example**: "Nationality is Germany" AND "Nationality is Italy"
  conflict only for a field that holds one value, such as the driving licence's "Nationality". The
  Personal ID can list several nationalities, so a citizen with both meets both rules (Edge Cases).
- **Outcomes, not messages**: The checks judge only whether applicants meet the rules. A redundant
  rule may still add its message to an evaluation (spec 002, FR-011): for an applicant without class
  B, "Licence classes includes one of B" adds its message to that of "Licence class B – Issue date
  is at least 2 years ago".
- **Logic, not plausibility**: The checks report rules that exclude, repeat or imply each other.
  They don't judge whether a value is likely, such as a date of birth in the future, and they know
  nothing about the world beyond FR-007.
- **Values**: An enum field's values come from its set, as spec 002, FR-003 says. The Personal ID
  can list several nationalities and a driving licence several classes; the other enum fields hold
  one value. The number fields, the driving licence's "Height (cm)", "Weight (kg)", "Age in years"
  and "Year of birth", are whole numbers in the driving licence's standard, while a rule's value may
  still have decimals.
- **Size**: A branch has at most 200 rules, groups and sub-groups (spec 002, Assumptions), and real
  forms stay far below that. The 5-second limit of FR-010 is for unusually large or tangled
  branches.
- **Design**: No UI design for findings exists yet. The marks, the branch summary and the tab
  indications are built from KERN patterns next to the branch marks of spec 002. The publish
  dialog's findings start from the design's warnings line ("1 warning on Ambulance", U33
  `6376:26181`), which spec 002 left out (its F21). The UI says "variant" for branch and
  "connection" for form connection, as in spec 002.
- **Out of scope**: showing findings on a form connection's details or in the overview; comparing
  branches with each other, such as two branches with the same rules; relations between different
  fields or documents; judging whether values are likely; fixing findings automatically, such as
  deleting a redundant rule in one action; and warning ahead of a conflict that will only arise on
  a later day of sharing (FR-008).
