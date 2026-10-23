# Feature Specification: Rules for Form Connections, with Groups and Branches

**Feature Branch**: `rules`

**Created**: 2026-10-22

**Status**: Draft

**Input**: User description: "We need to implement "rules" in this application. The application is a middleware from a citizen form to the EUDI-Wallet and we want to implement rules in order to return errors when some fields shared by the wallet don't match them. An example of a rule could be that the birthdate in the PID must be at least 21 years old.

Rules are an intermediate step in the UI flow and are defined per-connections. A user story could be:
- The user of the middleware creates a new connection and adds both the PID and the Driving License as documents (adding the needed fields from them)
- Then creates the following rules:
    - Person must be at least 21 (rule on the birth date field of PID)
    - Person must have a class B driving license (rule on the Driving License)
    - Person must hold the driving license for at list 2 years

Given these rules, if a users is using a form that uses the connection created above, it will receive an error from the form if the rules are not matched. This because instead of returning just the data from the wallet, we also includes the rules evaluation and they respective error messages.

Every field of every document could potentially have a rule. Rules are not mandatory and the creation of them can be skipped.

Rules are generally related with an AND condition that can be changed to an OR condition. To allow complex rule-matching there is the possiblity to create Groups and Sub-Groups of rules (just these 2, no more nesting). Groups are then evaluated and treated as a single rule in the final evaluation and concatenated with all the other rules. In the outer group and in every group/sub-group, if the relation between two rule is AND, all the relations are AND. Same with OR. This avoid creating confusion on evaluation order and force people to use groups to specify different relation conditions.

Sometimes a form can have the possiblity of having two different (but very similar) set of rules depending on a previous part of the form. A use case for this would be the "Passenger transport license" form. If the citizen is applying for a taxi they must be 21, but if they are applying for an ambulance they can just be 19. In both cases the citizen has to live in stuttgart and need the class b license from at least 2 years. Becuase of this duplication, instead of creating a complete new connection, we allow branching inside the rules. Branching uses the same documents, but creates a different set of rules that can be empty or based on the "main" branch. If the new branch is based on the main one, all the rules are copied and linked back to the main branch. If a rules is modified in the main branch, is also modified in the branch that are based on it. If we modify, delete or add a new rule in a separate branch we are gonna see it with a different color. Branching creates also different type of links in the end (during the connection creation), becuase we need different evaluations."

## Clarifications

### Session 2026-10-22

- Q: Is a field that rules check still delivered to serviceBW, or can a team member mark a requested field as "only for rules", so that the wallet shares it and rules check it, but serviceBW never receives it? → A: Every requested field is delivered to serviceBW, including the fields that rules check; rules only add their evaluation (FR-016). Marking a field "only for rules" is out of scope.
- Q: Does every branch need its own trigger URL, or can a form connection keep one trigger URL and let serviceBW choose the branch through the pull URL it calls? → A: One trigger URL per form connection and one pull URL per branch. The rules are evaluated when serviceBW pulls, for the branch whose pull URL it calls, with the rules as they were when the request was triggered (FR-025).
- Q: How does the pull URL of a branch that was added after a request was triggered answer for that request? → A: With an error saying that the branch didn't exist when the request was triggered. A request uses the rules as they were when it was triggered, and those didn't include the branch (FR-025).

### Session 2026-10-23

- Q: Which conditions can a rule use? → A: The conditions of the field's kind of value, one of four, worded the same for every field: numbers (is greater than, is less than, is equal to, is not equal to), text (is equal to, is not equal to, contains, doesn't contain), enums (is in, is not in a set of values) and dates (is before, is after or is a given date; is more than, is less than or is exactly a number of years ago, always counted back from the day of sharing, which the rules step notes). The licence classes are an enum like any other, and no field, such as the "Date of birth", gets wording of its own (FR-003).
- Q: Does letter case count when text is compared? → A: The team member chooses for each text condition in the rules step, and the check follows that choice (FR-013).
- Q: Can one rule check a field against several values? → A: Only an enum rule, such as "Licence classes is in B, C". Any other combination of conditions on one field takes a rule for each (FR-002).
- Q: Can a group or sub-group hold a single rule? → A: No. A group needs at least two rules. When one of its two rules is deleted, the group is dissolved and the other rule moves to the level that contained the group (FR-008).
- Q: How do rules check the two fields made of parts, the driving licence's "Licence classes" and the ID's "Place of birth"? → A: Through their parts, each with one of the four kinds: the classes a licence holds as an enum, each class's issue date and expiry date as dates (such as "Licence class B – Issue date"), and the place of birth's country as an enum and its region and city or town as text (FR-003).
- Q: Does "Date of birth is more than 21 years ago" count as met on the citizen's 21st birthday? → A: Yes, and the condition is labelled "is at least {years} ago" instead of "is more than". It is met from the date's N-th anniversary on; "is less than {years} ago" is met until the day before it, and "is exactly {years} ago" from the N-th anniversary until the day before the next one (FR-003, FR-012).
- Q: When a branch based on the main branch removes one of the two rules of an inherited group, what happens to the group in that branch? → A: It is dissolved in that branch only: the remaining rule takes the group's place there and still follows the main branch. The group is shown as removed in the branch, and comes back when the removal is undone or the main branch adds a rule to it (FR-008, FR-023, FR-024).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Check shared documents against rules (Priority: P1)

Some serviceBW forms are open only to applicants who meet conditions, such as a minimum age or a
driving licence class. A member of the DO.IT team sets up a form connection that requests the ID
with its "Date of birth" and the driving licence with its "Licence classes". After the documents
step, the create flow now has a rules step, before publishing. There the team member adds the rules
the form requires:

- the applicant is at least 21 years old: the ID's "Date of birth" is at least 21 years ago;
- the applicant holds driving licence class B: the driving licence's "Licence classes" is in B;
- the applicant has held class B for at least 2 years: "Licence class B – Issue date" is at least
  2 years ago.

Each rule comes with an error message for the citizen. A form that needs no rules skips the step.
When a citizen shares their documents, serviceBW receives them as before, together with the
evaluation of the rules: whether the citizen meets them and, if not, the error messages of the
rules they don't meet, which the form shows to the citizen.

**Why this priority**: This is what the feature is for. Without rules, every form, or a caseworker,
has to check these conditions on the data it receives. With rules, DO.IT sets them up once per form
connection, without software development.

**Independent Test**: Create a form connection with the ID, the driving licence and the three rules,
publish it, and run requests with test documents that meet every rule and with documents that break
some of them. Check that serviceBW receives the documents with an evaluation that names exactly the
rules that aren't met, with their messages.

**Acceptance Scenarios**:

1. **Given** a team member creating a form connection that requests the ID's "Date of birth" and
   the driving licence's "Licence classes", **When** they add the three rules in the rules step and
   publish, **Then** the rules are saved with the form connection and shown on its details.
2. **Given** the rules step, **When** the team member chooses the field a rule checks, **Then** only
   the fields the form connection requests are offered, each with the conditions of its kind of
   value (FR-003), such as date conditions for the "Date of birth" and "is in" or "is not in" for
   the "Licence classes".
3. **Given** the rules step without any rule, **When** the team member goes on and publishes,
   **Then** the form connection is published without rules.
4. **Given** a published form connection with the three rules, **When** a citizen who is 25 and has
   held class B for 5 years shares their documents and serviceBW pulls them, **Then** serviceBW
   receives the documents and an evaluation that says the rules are met, without any error message.
5. **Given** the same form connection, **When** a citizen who is 20 and has held class B for 1 year
   shares their documents, **Then** serviceBW receives the documents and an evaluation that says the
   rules aren't met, with the error messages of the age rule and of the 2-year rule, but not that of
   the class B rule, which is met.
6. **Given** a rule without an error message, or without the value its condition needs, **When**
   the team member tries to publish, **Then** publishing is refused with a message that names the
   rule and the problem.
7. **Given** a form connection published before rules existed, **When** serviceBW pulls a completed
   request, **Then** it receives the same documents as before, with an evaluation that says the
   rules are met.

---

### User Story 2 - Combine rules with OR, groups and sub-groups (Priority: P2)

Some forms accept applicants on one of several conditions, for example applicants who are at least
21, or who are at least 19 and have held class B for at least 3 years. The rules of a form
connection are combined with AND unless the team member switches them to OR. For conditions that
mix both, the team member puts two or more rules into a group, and two or more rules of a group into
a sub-group, each with its own AND or OR. Within one level, all rules are combined the same way, so
the order of evaluation is never in doubt: a different combination needs a group. A group counts as
a single rule of the level that contains it.

**Why this priority**: Without OR and groups, a form connection can only require conditions that
must all hold, which doesn't fit forms with alternative ways to qualify. Forms whose conditions must
all hold can go live with User Story 1.

**Independent Test**: Build "lives in Stuttgart AND (at least 21 OR (at least 19 AND has held class
B for at least 3 years))" with a group and a sub-group. Check the evaluation with documents for each
way to qualify, and for an applicant who qualifies in neither.

**Acceptance Scenarios**:

1. **Given** several rules at one level, **When** the team member adds them, **Then** they're
   combined with AND, and switching the level to OR changes how all of that level's rules are
   combined.
2. **Given** the rules above, **When** a 20-year-old citizen from Stuttgart who has held class B for
   3 years shares their documents, **Then** the evaluation says the rules are met.
3. **Given** the same rules, **When** a 20-year-old citizen from Stuttgart who has held class B for
   1 year shares their documents, **Then** the evaluation says the rules aren't met and reports the
   messages of the 21-year rule and of the 3-year rule, but not that of the 19-year rule, which is
   met.
4. **Given** a group with an error message of its own, **When** the group isn't met, **Then** the
   evaluation reports the group's message instead of those of the rules inside it.
5. **Given** an OR group in which one rule is met, **When** the documents are evaluated, **Then**
   the group counts as met, and none of the messages of its other rules is reported.
6. **Given** a sub-group, **When** the team member wants to add a group inside it, **Then** the
   system doesn't offer it: rules are grouped two levels deep at most.
7. **Given** a group of two rules, **When** the team member deletes one of them, **Then** the group
   is dissolved, and the other rule takes the group's place in the level that contained it.

---

### User Story 3 - Variants of a form with branches (Priority: P2)

The "Passenger transport licence" form serves applicants for a taxi, who must be at least 21, and
applicants for an ambulance, who must be at least 19. Both must live in Stuttgart and have held
licence class B for at least 2 years. The applicant chooses taxi or ambulance in an earlier part of
the form. Instead of setting up two form connections with the same documents and nearly the same
rules, the team member adds a branch to the form connection's rules. The main branch holds the taxi
rules. The "Ambulance" branch is based on the main branch: it starts with the same rules, which stay
linked to the main branch, and the team member changes only the age to 19. Rules changed, removed or
added in a branch are shown in a different colour, so the team member sees at a glance where the
branch differs. The form connection keeps one trigger URL, and each branch gets its own pull URL:
the serviceBW form fetches the result through the pull URL of the branch that matches the
applicant's choice.

**Why this priority**: Without branches, each variant of a form needs a form connection of its own,
and the rules the variants share must be kept the same by hand. Forms without variants don't need
branches.

**Independent Test**: Set up the "Passenger transport licence" example with an "Ambulance" branch
based on the main branch. Change the age in the branch and the class B duration in the main branch,
then pull requests with the same test documents through the pull URLs of both branches and compare
the evaluations.

**Acceptance Scenarios**:

1. **Given** a form connection whose main branch has the four taxi rules, **When** the team member
   adds the branch "Ambulance" based on the main branch, **Then** the branch has the same four
   rules, shown as following the main branch.
2. **Given** the "Ambulance" branch, **When** the team member changes its age rule to "at least
   19", **Then** that rule is shown in the colour for branch changes and marked as changed in this
   branch, and the main branch still requires 21.
3. **Given** that change, **When** the team member changes the main branch's class B rule from 2 to
   3 years, **Then** the "Ambulance" branch requires 3 years as well, and its age rule stays at 19.
4. **Given** a branch based on the main branch, **When** the team member removes an inherited rule
   from it, or adds a new rule to it, **Then** the removed rule stays visible in the branch, marked
   as removed, the new rule is marked as added, and the main branch doesn't change.
5. **Given** a rule that a branch changed or removed, **When** the team member undoes the change,
   **Then** the rule follows the main branch again.
6. **Given** a branch that started empty, **When** the team member adds rules to it, **Then** they
   don't follow the main branch, carry no marks, and later changes to the main branch don't affect
   them.
7. **Given** a published form connection with the main branch and the "Ambulance" branch, **When**
   the team member opens its details, **Then** they see the form connection's one trigger URL and
   a pull URL for each branch, labelled with the branch's name, each copyable in one action.
8. **Given** a completed request of a 20-year-old citizen from Stuttgart who has held class B for 3
   years, **When** serviceBW pulls it through the "Ambulance" branch's pull URL, **Then** the
   evaluation says the rules are met; **When** it pulls it through the main branch's pull URL
   instead, **Then** the evaluation says they aren't, with the message of the age rule.
9. **Given** a branch that is no longer needed, **When** the team member deletes it and confirms,
   **Then** its pull URL answers every call with "unavailable", while the trigger URL and the
   other branches' pull URLs keep working, also for requests already in progress.

---

### User Story 4 - Change the rules of a live form connection (Priority: P3)

The conditions of a form change over time, and a form that went live without rules may need some
later. A team member changes the rules of a published form connection, or adds its first ones,
without replacing the URLs already in serviceBW and without affecting requests in progress.

**Why this priority**: This becomes necessary once forms with rules are in use. The first forms can
go live without it.

**Independent Test**: On a live form connection with rules, start a request, change a rule, start a
second request, and let both complete. The first is evaluated with the old rule, the second with the
new one, and no URL has changed.

**Acceptance Scenarios**:

1. **Given** a live form connection with rules, **When** a team member changes a rule and saves,
   **Then** its URLs stay the same, requests triggered afterwards are evaluated with the changed
   rule, and requests already in progress are evaluated with the rules they started with.
2. **Given** a live form connection without rules, **When** a team member adds rules and saves,
   **Then** its URLs stay the same, and requests triggered afterwards are evaluated with the new
   rules.
3. **Given** a rule in any branch that checks the ID's "Date of birth", **When** the team member
   deselects that field or removes the ID in the documents step, **Then** the system names the rules
   that check it and their branches, and the form connection can't be saved while any of them
   remains.

---

### Edge Cases

- **No rules**: A branch without rules always counts as met, and its evaluation reports no message.
  This includes every form connection published before this feature.
- **Birthday on the day of sharing**: A citizen who turns 21 on the day they share their documents
  meets "Date of birth is at least 21 years ago" and "is exactly 21 years ago", but not "is less
  than 21 years ago" (FR-012).
- **Born on 29 February**: In years without 29 February, the citizen reaches the next age on 1 March
  (FR-012). The same applies to every other date on 29 February, such as a licence class's issue
  date.
- **Sharing around midnight**: Dates count by the calendar date in Germany at the moment the citizen
  shared (FR-012), whatever the time zone of the wallet or of serviceBW.
- **Values that can't be checked**: A date of birth that gives only the year can't be checked
  against a date condition, nor a licence class without an issue date against a condition on its
  issue date. The rule counts as not met, and the evaluation says that it couldn't be checked
  (FR-014).
- **A rule on a class the licence doesn't hold**: "Licence class B – Issue date is at least 2 years
  ago" isn't met by a licence without class B, and is reported as not met rather than as couldn't
  be checked (FR-014).
- **Letter case and spaces**: "STUTTGART" meets "City or town is equal to Stuttgart" only if the
  rule ignores letter case, as a new text condition does until the team member changes it (FR-013).
  Ignoring letter case covers German letters too: "KÖLN" meets "is equal to Köln", and
  "HEIDESTRASSE 17" meets "contains straße". " Stuttgart " meets the rule either way, since spaces
  at the start and end don't count. "Stuttgart-Vaihingen" doesn't meet it, but meets "City or town
  contains Stuttgart".
- **Several conditions on one field**: Only an enum condition takes several values, such as
  "Licence classes is in B, C", which a licence with class B, class C or both meets. Any other
  combination takes a rule for each condition, such as "Date of birth is at least 19 years ago"
  and "Date of birth is less than 66 years ago" on the same field (FR-002).
- **Group with a single rule**: Not possible. A group or sub-group is formed from at least two
  rules, and when one of its two rules is deleted, it is dissolved and the other rule moves to the
  level that contained it (FR-008).
- **Documents that fail verification**: Rules are evaluated only on documents that passed
  verification (spec 001, FR-010). A request whose documents don't pass ends as "verification
  failed", without an evaluation.
- **The main branch changes a rule that a branch changed**: The branch keeps its own version
  (FR-022).
- **The main branch removes a rule that a branch changed**: The branch keeps its version, which now
  counts as added in the branch.
- **The main branch removes a rule that a branch removed**: The rule disappears from the branch too.
- **The main branch adds a rule**: It appears in every branch based on the main branch, following
  it, and in no branch that started empty.
- **A branch changes an inherited group**: Switching the group between AND and OR, or changing its
  message, marks the group as changed in the branch. The rules inside it keep following the main
  branch unless they were changed themselves.
- **A branch removes one rule of an inherited group of two**: The group is dissolved in that branch
  only. The other rule takes the group's place there and keeps following the main branch, and the
  group stays visible, marked as removed (FR-008). Undoing the removal, or a rule that the main
  branch adds to the group, brings the group back in the branch.
- **A branch that started empty and has no rules**: Allowed. Every request pulled through it counts
  as met.
- **Branch renamed**: Its pull URL stays the same (FR-025).
- **Form connection deactivated or deleted while a request is in progress**: The request is
  cancelled with the status "unavailable" (spec 001, FR-006).
- **Branch deleted while a request is in progress**: The request carries on. Only the deleted
  branch's pull URL answers "unavailable"; the other branches' pull URLs still return it (FR-027).
- **Rules changed while a request is in progress**: The request is evaluated with the rules the
  branch had when the request was triggered (FR-028).
- **Branch added while a request is in progress**: The branch didn't exist when the request was
  triggered, so its pull URL answers for that request with an error saying so, without status or
  documents. The branches that existed then still answer for it (FR-025).
- **The applicant changes branch after sharing**: serviceBW knows the branch before it polls, and
  polls through that branch's pull URL. If the applicant then changes their choice, for example
  from taxi to ambulance, the ambulance branch's pull URL returns the documents with its own
  evaluation only within the 60-second repeat window (spec 001, FR-018), because documents are
  handed over only once. After that, the other branch needs a new request, and the citizen shares
  their documents again.
- **Pulling after the documents are gone**: Once the documents can no longer be obtained (spec 001,
  FR-018 and FR-020), neither can the evaluation (FR-017).
- **Two team members editing the rules at the same time**: The later save wins, as for the rest of a
  form connection (spec 001, Edge Cases).

## Requirements *(mandatory)*

### Functional Requirements

#### Defining rules

- **FR-001**: The create and edit flow of a form connection MUST include a rules step after the
  documents step and before publishing or saving. The step MUST be optional: a team member MUST be
  able to publish or save a form connection without any rule.
- **FR-002**: A rule MUST check one field of one document that the form connection requests, or one
  part of such a field (FR-003), with one condition. Every requested field except an image MAY be
  checked, by one rule or by several. Only an enum condition takes several values at once (FR-003);
  checking a field against several values or limits of another kind takes a rule for each. A rule
  MUST NOT check a field that the form connection doesn't request.
- **FR-003**: Every field that rules can check MUST have one of four kinds of value, and MUST offer
  the conditions of its kind, worded the same for every field of that kind. No field has conditions
  or wording of its own: a minimum age, for example, is a date condition on the "Date of birth".
  - **Numbers**, such as the "Height (cm)": is greater than, is less than, is equal to, or is not
    equal to a given number.
  - **Text**, such as the "City or town": is equal to, is not equal to, contains, or doesn't contain
    a given text, each either respecting or ignoring letter case (FR-013).
  - **Enums**, whose values come from a fixed set, such as the "Licence classes", the "Nationality"
    or the "Sex": is in, or is not in, a set of one or more of those values. Where a document holds
    several values for the field, such as several licence classes, "is in" MUST count as met when
    at least one of them is in the set, and "is not in" when none of them is.
  - **Dates**, such as the "Date of birth": is before, is after, or is a given date; or is at
    least, is less than, or is exactly a given number of years ago (FR-012). The years MUST be
    counted back from the day the citizen shares their documents, never from a fixed date, and the
    rules step MUST say so next to these three conditions.

  Fields made of parts MUST be checked through their parts, each with the conditions of its kind:
  the driving licence's "Licence classes" through the classes it holds (an enum) and each class's
  issue date and expiry date (dates), such as "Licence class B – Issue date"; the ID's "Place of
  birth" through its country (an enum), and its region and its city or town (text).
- **FR-004**: Every rule MUST have an error message for the citizen. The system MUST propose a
  message that describes the rule's condition, which the team member MAY change. Groups and
  sub-groups MAY have an error message of their own (FR-011).
- **FR-005**: The system MUST show every rule as a readable statement that names the document, the
  field or part of a field it checks, and the condition, and for text whether letter case counts,
  such as "Personal ID – Date of birth is at least 21 years ago" or "Driving licence – Licence
  class B – Issue date is at least 2 years ago".
- **FR-006**: The system MUST refuse to publish or save a form connection while, in any of its
  branches, a rule's condition is incomplete, a rule has no error message, or a rule checks a field
  that the form connection doesn't request. It MUST also refuse a branch without a name, or with
  the name of another branch of the same form connection. The message MUST name the problem, the
  rule concerned, if any, and its branch.

#### Combining rules

- **FR-007**: In each branch, the rules and groups at the top level, in each group and in each
  sub-group MUST be combined with AND by default. The team member MUST be able to switch each of
  these levels to OR and back. All rules and groups of one level MUST be combined the same way: a
  different combination needs a group.
- **FR-008**: Team members MUST be able to put two or more rules of a branch's top level into a
  group, and two or more rules of a group into a sub-group, and to add rules to both. A sub-group
  MUST NOT contain further groups. A group or sub-group MUST always hold at least two rules or
  sub-groups: when fewer remain, it MUST be dissolved, the one that remains, if any, MUST take its
  place in the level that contained it, and the group's AND or OR and its message no longer apply.
  In a branch based on the main branch, the rules and sub-groups removed in the branch don't count:
  an inherited group they leave with fewer than two MUST be dissolved in that branch only, the one
  that remains MUST keep following the main branch, and the group MUST count again in the branch
  as soon as two or more remain, because a removal was undone (FR-024) or the main branch added to
  it.
- **FR-009**: A level combined with AND MUST count as met when all of its rules and groups are met,
  and a level combined with OR when at least one of them is met. A group or sub-group MUST count as
  a single rule of the level that contains it. A branch's rules MUST count as met overall when its
  top level is met, and a branch without rules MUST always count as met.

#### Evaluating rules and delivering the result

- **FR-010**: When serviceBW pulls the documents of a completed request (spec 001, FR-013), the
  answer MUST also contain the evaluation of the rules of the branch whose pull URL serviceBW
  called (FR-025):
  - whether the rules are met overall;
  - for each rule and group, whether it is met, isn't met or, for a rule, couldn't be checked
    (FR-014), identified so that serviceBW can tell the results apart;
  - the error messages that explain why the rules aren't met (FR-011).

  Everything else in the answer MUST stay as spec 001 defines it, so that serviceBW forms that
  don't read the evaluation keep working.
- **FR-011**: When the rules are met overall, the evaluation MUST NOT report any error message. When
  they aren't, it MUST report the message of every rule at the top level that isn't met and, for
  every group at the top level that isn't met, the group's own message if it has one, or otherwise,
  in the same way, the messages of the rules and sub-groups inside it that aren't met.
- **FR-012**: Conditions on dates MUST be evaluated against the calendar date in Germany at the
  moment the citizen shared their documents. Years ago MUST be counted in whole calendar years:
  N years have passed since a date on its N-th anniversary, which for 29 February falls on 1 March
  in years without 29 February. A date MUST count as "at least N years ago" from its N-th
  anniversary on, as "less than N years ago" until the day before it, and as "exactly N years ago"
  from its N-th anniversary until the day before the next one. "Date of birth is at least 21 years
  ago" is thus met from the citizen's 21st birthday on.
- **FR-013**: Each text condition MUST either respect or ignore letter case, as the team member
  chooses in the rules step, and MUST be evaluated accordingly. A new text condition ignores letter
  case until the team member changes that. Spaces at the start and end of the citizen's value and
  of the rule's value MUST be ignored in both cases.
- **FR-014**: A rule whose value is missing, or can't be interpreted for its condition, MUST count
  as not met and MUST be reported as couldn't be checked, so that serviceBW can tell it apart from
  a value that breaks the rule. A rule on a date of a licence class that the licence doesn't hold
  is the exception: it MUST be reported as not met, since the citizen doesn't hold that class.
- **FR-015**: The documents MUST be delivered whether or not the rules are met, and the request's
  status MUST be "completed" in both cases. serviceBW decides how to proceed, for example by showing
  the error messages to the citizen.
- **FR-016**: The fields that rules check MUST be delivered to serviceBW like every other requested
  field (spec 001, FR-013). Rules only add their evaluation, and never hold a field back.
- **FR-017**: The evaluation MUST be delivered, repeated and deleted together with the documents it
  was made from (spec 001, FR-018 and FR-020): once they can no longer be obtained, neither can the
  evaluation. It MUST NOT contain the values of the fields it checked, and MUST NOT be written to
  any log.

#### Branches

- **FR-018**: Every form connection MUST have a main branch, whose pull URL is the pull URL the
  form connection already has. Form connections created before this feature MUST get a main branch
  without rules, and keep their trigger URL and pull URL.
- **FR-019**: Team members MUST be able to add branches to a form connection, each starting either
  empty or based on the main branch. A branch MUST NOT be based on any other branch. All branches
  MUST request the form connection's documents and fields; only their rules differ.
- **FR-020**: Every branch MUST have a name that is unique within its form connection. Team members
  MUST be able to rename every branch, and to delete every branch except the main branch after
  confirming.
- **FR-021**: A branch based on the main branch MUST start with all of the main branch's rules and
  groups, linked to them. While a rule or group is linked, the branch MUST follow every change the
  main branch makes to it, including its removal. Rules and groups that the main branch adds later
  MUST appear, linked, in every branch based on it. Here and in FR-022 to FR-024, the AND or OR of
  the top level counts as a group: a branch based on the main branch starts with the main branch's
  and follows it until the team member switches it in the branch.
- **FR-022**: A rule or group that the team member changes, removes or adds in a branch based on the
  main branch MUST no longer follow the main branch. Changes to the main branch MUST NOT overwrite
  or discard it: when the main branch removes a rule or group that the branch changed, the branch
  keeps its version, which then counts as added in the branch.
- **FR-023**: In a branch based on the main branch, the system MUST mark every rule and group that
  was changed, removed or added in the branch, with a colour that sets it apart from those that
  follow the main branch and with a text or symbol that says which of the three it is, so that the
  difference doesn't rest on colour alone. Rules and groups removed in the branch, including groups
  dissolved there (FR-008), MUST stay visible there, marked as removed.
- **FR-024**: For a rule or group that a branch changed or removed, the team member MUST be able to
  undo the change, so that it follows the main branch again. Undoing the removal of a group,
  including one dissolved in the branch (FR-008), MUST also undo the removals of the rules and
  sub-groups in it.
- **FR-025**: A form connection MUST keep one trigger URL, which starts requests for all of its
  branches, and each branch MUST have its own pull URL. For a request, the pull URL of every branch
  that existed when the request was triggered MUST answer with the same status and documents; only
  the evaluation differs. The evaluation MUST use the rules of the branch whose pull URL serviceBW
  called, as they were when the request was triggered. The pull URL of a branch added after that
  MUST answer with an error saying that the branch didn't exist when the request was triggered,
  without status or documents. A branch's pull URL MUST stay the same when the branch is renamed or
  its rules change.
- **FR-026**: After publishing, and on a form connection's details, the system MUST show the
  trigger URL once and the pull URL of every branch, labelled with the branch's name, each copyable
  in one action (spec 001, FR-004). A form connection with only the main branch MUST show its URLs
  as it did before this feature.
- **FR-027**: Once a branch is deleted, its pull URL MUST answer every call with "unavailable", as
  for a deleted form connection (spec 001, FR-006). Requests in progress MUST carry on: the trigger
  URL and the other branches' pull URLs keep working for them. Deactivating, reactivating and
  deleting a form connection MUST apply to its trigger URL and to all of its branches.

#### Changing rules

- **FR-028**: Changes to rules and branches MUST apply to the requests triggered after they are
  saved, and MUST NOT change any existing URL. A request in progress MUST be evaluated with the
  rules each branch had when the request was triggered, even if they change before it completes
  (spec 001, FR-005).
- **FR-029**: When a team member removes a document, or deselects a field, that rules check in any
  branch, the system MUST name those rules and their branches before the change is saved.
- **FR-030**: A form connection's details MUST show the rules of every branch, with their groups,
  their AND and OR, and the marks of FR-023, and MUST lead to the rules step to change them.
- **FR-031**: Rules and branches MUST be visible and changeable only for signed-in DO.IT team
  members (spec 001, FR-007).

### Key Entities *(include if feature involves data)*

- **Rule**: A condition on one requested field of one document, or on one part of such a field,
  such as "Date of birth is at least 21 years ago", with an error message for the citizen. It
  belongs to one branch, either at the branch's top level or inside a group or sub-group.
- **Group**: Two or more rules or sub-groups, combined with either AND or OR, and counted as a
  single rule of the branch's top level. It may have an error message of its own.
- **Sub-group**: Two or more rules inside a group, combined with either AND or OR, and counted as a
  single rule of that group. It may have an error message of its own, and contains no further
  groups.
- **Branch**: A named set of rules of one form connection, combined at its top level with AND or OR,
  with its own pull URL. Every form connection has one main branch, which uses the form
  connection's original pull URL. Every other branch is either based on the main branch or started
  empty. All branches share the form connection's documents, fields and trigger URL.
- **Branch Change**: In a branch based on the main branch, a rule or group that was changed, removed
  or added in the branch, and therefore doesn't follow the main branch. It is marked, and a change
  or removal can be undone. A group that removals in the branch leave with fewer than two rules or
  sub-groups counts as removed there.
- **Rule Evaluation**: The result of applying the rules of the branch whose pull URL serviceBW
  called to the documents of one request: whether the rules are met overall, the outcome of each
  rule and group, and the error messages to show. It is delivered, repeated and deleted together
  with the documents.
- **Form Connection** (spec 001): now also holds its branches and their rules.
- **Document Request** (spec 001): still started through the form connection's one trigger URL. It
  keeps the rules of every branch as they were when it was triggered, and is evaluated for the
  branch whose pull URL serviceBW calls. Branches added later don't apply to it.
- **Connection URL** (spec 001): still one trigger URL per form connection, and now one pull URL per
  branch. The main branch's pull URL is the one the form connection had before branches existed.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A DO.IT team member can add the three rules of User Story 1, with their error
  messages, to a form connection in under 5 minutes without help from a developer.
- **SC-002**: A DO.IT team member can set up the "Passenger transport licence" form connection, with
  the main branch's four rules and an "Ambulance" branch based on it that lowers the age to 19, and
  copy its trigger URL and the pull URLs of both branches, in under 10 minutes.
- **SC-003**: In acceptance testing with test documents on both sides of every condition, 100% of
  the evaluations match the expected outcome, including a birthday on the day of sharing, a
  29 February birthday, an age exactly at the limit, and text that differs only in letter case,
  under rules that respect it and rules that ignore it. Every evaluation whose rules aren't met
  carries at least one error message.
- **SC-004**: Rules don't delay the result: in 95% of requests, the documents and their evaluation
  are ready for serviceBW within 5 seconds of the citizen approving the request in their wallet, as
  spec 001 requires without rules (SC-004).
- **SC-005**: 100% of the form connections created before this feature keep working without any
  change in serviceBW: the same URLs, the same documents, and an evaluation that says the rules are
  met.
- **SC-006**: In acceptance testing, after a rule of the main branch changes, 100% of the branches
  based on it that haven't changed that rule evaluate the next request with the new version, and 0
  of the changes made in those branches are lost.
- **SC-007**: In usability testing, at least 4 of 5 DO.IT participants tell correctly, for every
  rule of a branch based on the main branch, whether it follows the main branch or was changed,
  removed or added in the branch.
- **SC-008**: In usability testing, at least 4 of 5 DO.IT participants build a given set of rules
  that needs a group, a sub-group and OR correctly on their first attempt without assistance.
- **SC-009**: The rules step, and every screen that shows rules or branches, meet WCAG 2.1 level AA,
  like the rest of the management interface (spec 001, SC-009): the accessibility review before
  release finds no unresolved failures.

## Assumptions

- **Builds on spec 001**: This feature adds the "custom logic on document fields" that
  [spec 001](../001-servicebw-eudi-middleware/spec.md) planned for a later iteration. Every
  requirement of spec 001 still applies, and references such as "spec 001, FR-005" point to it.
- **Where rules are evaluated**: The middleware evaluates the rules on the verified documents once
  the citizen has shared them. Wallets aren't asked to evaluate conditions themselves, for example
  through "age over 21" attributes, which the PID no longer offers. For an age rule, the citizen
  therefore shares their full date of birth, as their wallet shows them, and serviceBW receives it
  like every other requested field (FR-016).
- **serviceBW's role**: serviceBW reads the evaluation, shows the error messages to the citizen and
  decides how to proceed, for example by not accepting the application. Its form decides which
  branch applies, from what the applicant entered earlier in the form, and fetches the result
  through that branch's pull URL. DO.IT agrees the use of the evaluation with serviceBW when it
  connects a form; changes to serviceBW itself stay out of scope, as in spec 001.
- **Lawful rules**: DO.IT is responsible for rules that match each form's legal requirements. The
  middleware doesn't judge whether a rule is appropriate.
- **Error messages**: The team member writes them in the language of the serviceBW form that shows
  them, and the proposed message is a starting point. Each rule and group has one message.
- **Licence classes**: How long a licence class has been held is checked on that class's own issue
  date, such as "Licence class B – Issue date". The driving licence's "Issue date" is the date of
  the current document, which changes whenever the licence is renewed, so it doesn't tell how long
  a class has been held. Many classes, such as class B in Germany, have no expiry date of their
  own, so a rule on their expiry date can't be checked for them (FR-014).
- **Images**: Photos, portraits and signatures can't be checked by rules, since no meaningful
  condition exists for them. Every other field can.
- **Branches differ only in rules**: All branches of a form connection request the same documents
  and fields, so one trigger URL serves them all, and the citizen's wallet shows the same request
  whichever branch applies. If branches ever needed documents or fields of their own, the trigger
  would have to know the branch again. Branches are based only on the main branch, one level deep.
  A branch that started empty carries no marks, since nothing in it follows the main branch.
- **Design**: The layout and wording of the rules step and of the branches come from the UI design,
  as in spec 001. The UI's words may differ from this spec's, as "connection" stands for "form
  connection" there.
- **Out of scope**: holding back from serviceBW the fields that rules check (see Clarifications);
  comparing two fields with each other, such as the names on the ID and on the driving licence;
  calculations across fields; free-form expressions; conditions on the restriction codes of a
  licence class; trying rules out with sample data in the management interface; reports or
  statistics on evaluation outcomes; deactivating single branches;
  branches with their own documents or fields; branches based on a branch other than the main
  branch; groups nested more than two levels deep; and error messages in several languages.
