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

### Session 2026-10-24

Questions raised by the audit of the UI design against this spec (figma-audit/report.md, "Clarify questions").

- Q: Should the "Date of birth" keep the generic wording "is at least 21 years ago", or use the UI design's age wording "is at least 21 years old"? → A: The age wording. The "Date of birth" of every document words its three years-ago conditions as an age: is at least, is less than, or is exactly {years} old. They are evaluated as before (FR-012). It is the one field with wording of its own, and every other date keeps "years ago" (FR-003, FR-005). This supersedes "no field, such as the 'Date of birth', gets wording of its own" in the session above.
- Q: Which date conditions does a rule offer, given that the UI design adds "at most", a months unit and "time left", and leaves out "is exactly" and "is (a date)"? → A: The six conditions of FR-003, with years ago in whole years. In addition, every date field, the "Date of birth" included, offers "is at least" and "is less than" a number of years or months from now, counted forward from the day of sharing (FR-003, FR-012). "At most" isn't offered, and the years-ago conditions don't take months.
- Q: How does a rule check a licence class: through its parts, or through the UI design's checks "has held class B for at least 2 years" and "has class B valid on the day of sharing"? → A: Through its parts only, with the conditions of their kinds, such as "Licence class B – Issue date is at least 2 years ago". A class without an expiry date of its own doesn't fall back to the licence's expiry date (FR-014). Holding BE, C or D doesn't count as holding B: a rule on class B is met only by a licence that lists class B. The place of birth's parts keep their kinds: the country is an enum, and the region and the city or town are text (FR-003).
- Q: Which number conditions does a rule offer: the spec's four, or the UI design's "at least", "at most" and "between"? → A: The spec's four, each strict and with one value: is greater than, is less than, is equal to, is not equal to. A range takes two rules (FR-002, FR-003).
- Q: Which text conditions does a rule offer, given that the UI design has "is", "is not" and "starts with", takes several values and always ignores letter case? → A: The spec's: is equal to, is not equal to, contains and doesn't contain, each with one value and its own letter-case choice, which ignores letter case by default (FR-003, FR-013). "Starts with" isn't offered, and "lives in Stuttgart or Esslingen" takes two rules in an OR group.
- Q: Which words name the enum conditions, given that the spec says "is in" / "is not in" and the UI design says "includes one of", "includes", "includes none of" and "doesn't include"? → A: "Includes one of" and "includes none of", for every enum field and any number of values (FR-003). This supersedes "is in" and "is not in" in the sessions above.
- Q: What happens to a group left with fewer than two rules or sub-groups, which the UI design keeps, even empty? → A: It is dissolved, as FR-008 says, in a branch based on the main branch too (EC-16). Groups are formed only from two or more rules, so an empty group never exists. The UI design's frames with empty or single-rule groups don't apply, and the behaviour is built without new frames.
- Q: How are branches renamed and deleted, and how is a duplicate branch name reported, given that the UI design has no frames for them? → A: As FR-020 says, built without new frames from KERN patterns: a menu on the branch's tab offers renaming every branch, the main branch included, and deleting every other branch after a confirmation dialog. A missing or duplicate name is reported where it is entered, as for rule names, and FR-006 still refuses it when publishing or saving (FR-020).
- Q: How are the main branch's changes to rules that a branch also touched handled, given that the UI design doesn't show them? → A: As FR-021, FR-022 and the edge cases say, with the marks the design already has, without new frames. The design's confirmation for deleting a main branch rule must not say it is removed from every branch: branches that changed it keep their version, which then counts as added (FR-022).
- Q: In a branch based on the main branch, what happens to inherited rules that the team member groups in that branch only? → A: The new group counts as added in the branch. The rules in it keep following the main branch, including their removal, and carry no mark of their own. The main branch moving them doesn't move them out of that group. If the main branch's removals leave the group with fewer than two, it is dissolved (FR-008, FR-022). The design's switched operator without a mark, and its changed rule inside a removed group without a text mark, are slips: both get the marks of FR-023 and EC-15.
- Q: When can a team member add a branch, given that the UI design shows "+ Add variant" only once the main branch has a rule? → A: From the start of the rules step, before the main branch has any rule, so that a form whose main branch needs no rules can still have a branch with rules. A branch without rules shows the same empty state as the main branch (FR-019).
- Q: How does a team member add or remove the own error message of a group or sub-group, given that the UI design shows one group message and no control for it? → A: As FR-004 says, for groups and sub-groups alike: each one's menu offers adding and removing its message, which shows under its header as in the design's group message. This is built without new frames.
- Q: What pull URLs do the branches get, given that the UI design shows ".../result/standard" for the main branch and a slug of the name for the others? → A: Those URLs are placeholders. The main branch keeps the pull URL the form connection already has (FR-018), so that serviceBW forms keep working (SC-005). Every other branch's pull URL identifies it by an identifier fixed when the branch is added, never by its name, so that a rename can't change it (FR-025). A form connection with only the main branch shows its URLs as spec 001 does, without branch names (FR-026).
- Q: What do a form connection's details show of its rules, and how does a team member get from there to changing them, given that the UI design shows a flat list and asks "Edit this live connection?" on entry? → A: The details show each branch's rules with their groups, AND and OR, and marks, read-only, in the layout of the rules step, one section per branch (FR-030). Changing them opens the rules step of spec 001's edit flow, which ends with saving and asks for confirmation when saving, not on entry. After publishing, the details open as in spec 001.
- Q: Where are incomplete or invalid rules reported, given that the UI design checks each rule in its editor and keeps Publish enabled while an incomplete rule is open? → A: In both places. The rule editor points out the problem as the design shows, and publishing or saving, which stays available, is refused with a message that names the problem, the rule and its branch (FR-006). The design's non-blocking "warnings" in the publish dialog are left out until its "Problems" section is specified.
- Q: Can a form connection still be saved when the team member removes data that rules check, given that the UI design blocks only publishing and keeps "Save and exit"? → A: No. The design's dialog names the rules and their branches, the change applies in the create or edit flow, and publishing or saving is refused while those rules remain (FR-006, FR-029). There are no drafts (spec 001), so "Save and exit" doesn't exist.
- Q: May the documents step offer "Publish without rules", skipping the rules step, as the UI design does even while rules exist? → A: Only while no branch has any rule. Otherwise the documents step goes on to the rules step (FR-001).
- Q: How does serviceBW tell the results of rules and groups apart, and must the names that the UI design gives them ("Rule 01", renamable) be unique? → A: serviceBW identifies results by an identifier that the system sets when a rule or group is created. Renaming or changing the item never changes it, it is never reused within the form connection, and a rule's versions in every branch share it, while a rule added in a branch gets a new one (FR-010). Names are labels for the team: "Rule", "Group" or "Sub-group" and the identifier's number by default, renamable, and unique within each branch. The name is part of the rule, so renaming an inherited rule in a branch changes it there (FR-022). A name that would appear twice in a branch is refused with a message that names the branch (FR-005).
- Q: How much of the UI design's per-rule editor (Save rule, Cancel, a toast, a guard against leaving with unsaved changes) does the spec define? → A: Only two points; the rest is UI detail. Publishing or saving while a rule being edited has unsaved changes first asks to keep or discard them (FR-006). The proposed message appears once the rule's condition is complete, and matches it (FR-004).
- Q: Does the spec cover the UI design's conveniences: duplicating a rule, the delete confirmation and the undo after deleting or grouping, the menus of removed items, and the notice after switching AND or OR? → A: They are UI detail, built as designed. The spec records only what affects branches and identifiers: a duplicate is a new rule with a new identifier, which counts as added in a branch based on the main branch (FR-022). An item removed in a branch can only be restored there, not changed or deleted (FR-024).
- Q: Can a team member copy a rule to other branches, as the UI design's "Copy to variant" does? → A: Yes. A copy works like adding the rule by hand to each chosen branch: it is a new rule, not linked, with a new identifier and its default name, at the end of the branch's top level. It counts as added in a branch based on the main branch, and a copy to the main branch appears, linked, in every branch based on it (FR-021, FR-022).
- Q: Can a branch have a description, as in the UI design? → A: Yes, an optional one, shown with the branch's name in the rules step and on the details, to help tell branches apart. It isn't delivered to serviceBW (FR-020).
- Q: How are the UI design's publish confirmation, publishing progress and failure specified? → A: As an extension of spec 001's publish and save dialog, which also summarises the rules of each branch; the wording belongs to the design notes. The spec adds only that publishing or saving stores the documents, branches and rules together or not at all, and that a failure offers to try again (FR-028).
- Q: Can a form connection go live on a scheduled date, as in the UI design ("Now" or "On a date", a "Scheduled" status)? → A: No. Scheduling is out of scope and is removed from the design. Publishing goes live at once, as in spec 001.
- Q: Does this feature add the extras of the UI design's published page: an activity log of who changed what, a PDF export, counters and "Live since"? → A: No. They are left for later, and the activity log and the PDF export need a spec of their own. "Copied" follows spec 001.
- Q: Does this feature cover the UI design's parts that no requirement asks for: the wizard shell's draft badge, "Save and exit" and sticky bars, the documents step's redesign, and the rule editor's aids? → A: No. They are out of scope, and the implementation builds what spec 001 and this spec require. Spec 001's decisions stay: no drafts, no "Save and exit".
- Q: Can the driving licence's "Age over 18", "Age in years" and "Year of birth" be requested, given that rules check age through the "Date of birth"? → A: "Age in years" and "Year of birth" stay ordinary fields of spec 001's catalog, which rules can check as numbers. "Age over 18" isn't in the catalog, since its name varies by issuer, and is removed from the design.
- Q: How does a "Date of birth" rule read, given that the UI design shows "Personal ID · Date of birth ≥ at least 21 years old", one frame still says "years ago", and the shared editor carries a hidden "old" on other dates too? → A: In the spec's words, "Personal ID – Date of birth is at least 21 years old" (FR-005). The design's ≥ and < symbols stay as decoration, which assistive technologies don't announce. The age wording ("old") belongs to the "Date of birth" only, and the design's other dates and its "years ago" frame for the "Date of birth" are corrected.
- Q: What do the hints under a date condition in the rule editor say, given that the UI design shows only a worked example for today ("Today (23 Oct 2026) this means: born on or before 23 Oct 2005.") and "If the date of birth is missing, the rule isn't met."? → A: Both stay in the rule editor only, reworded. The first says that the count starts from the day the applicant shares, followed by the example: "Counted from the day the applicant shares. Today (…) this means: …" (FR-003). The second also covers values that can't be read and says how they are reported: "If the {field} is missing or can't be read, the rule isn't met and is reported as couldn't be checked." (FR-014). Saved rules don't repeat them.
- Q: What does the message say when a rename gives a rule, group or sub-group a name already used in the branch, given that the UI design says "Another rule is already called Rule 01." without the branch? → A: It always names the branch, also when the clash is in the branch being edited: "Another rule in Ambulance is already called Rule 01." It shows inline where the name is entered, as in the design (FR-005).
- Q: What happens when the team member publishes or saves while a rule editor has unsaved changes, given that the UI design asks to keep or discard them only when leaving the editor, and labels the button "Publish without rules" next to an unsaved first rule? → A: The design's dialog for leaving the editor ("Save changes to Rule 01?") also appears on Publish and Save. Keeping saves the rule, which FR-006 still refuses if it is incomplete, and publishing or saving goes on. Discarding drops the changes, and it goes on. The rule being edited counts as a rule, so the button doesn't say "without rules" while one is open (FR-006).
- Q: Where and how should the details show the identifier of each rule, group and sub-group, given that FR-010 requires it and the UI design shows it nowhere? → A: On the details only: each rule, group and sub-group shows its identifier read-only next to its name, in every branch's section. The rules step doesn't show identifiers. This is built without new frames (FR-010, FR-030).
- Q: Which words do the from-now date conditions use, given that the UI design says "≥ at least 6 months left" in the rule editor and in every saved rule? → A: The spec's, in the rule editor and in saved rules alike: "Driving licence – Expiry date is at least 6 months from now" and "is less than 6 months from now" (FR-003, FR-005). "Left" isn't used, and the design's "≥" stays as decoration.
- Q: Must the number of years or months in a date condition be at least 1, given that the UI design's rule editor rejects 0 with "Enter a number greater than 0." but FR-006 doesn't mention it? → A: Yes. It must be a whole number of at least 1. Anything else leaves the condition incomplete: the rule editor points it out as the design shows, and publishing or saving is refused (FR-003, FR-006). Number fields, such as the "Height (cm)", keep accepting any number.
- Q: Does the spec cover the UI design's remaining conveniences: "Enter saves · Esc cancels" when renaming, "Cancel" to leave the select mode for grouping, and the toast after copying a rule with a "Show" link to the branch? → A: They are UI detail, built as designed, like the conveniences above. They change no rule, branch or identifier, so the spec adds no requirement for them.
- Q: Should the rule editor's menus have a search field, should licence class lists show a description next to each code, and should the data menu end with a link to add more data in Documents? → A: Yes, all three are UI detail, built as designed. Long menus get a search field: "Search {document}" in the data menu (such as "Search Personal ID", "Search Driving licence"), "Search classes" in the class menus and "Search options" in the other option menus, with the empty result "No options match "{typed text}".". Class lists show each code with its description, such as "B Cars up to 3.5 t"; saved statements keep the codes only (FR-005). The data menu ends with "Need other data? Add it in Documents", which opens the documents step; if the open rule editor has unsaved changes, "Save changes to Rule 01?" comes first, as when leaving the editor (FR-006). The part pickers, Place of birth's and the one for Licence classes, are built the same way, with a search field when the menu is long ("Search classes" for Licence classes; none for Place of birth's three parts, see below). The menu footers that state a requirement ("Lists the documents you added", "Only documents you request are listed.", "Select at least one option.") and the editor's hints stay. This supersedes "the rule editor's aids" in the answer above that puts the design's unrequired parts out of scope, as far as these parts go.
- Q: How should a branch's description be displayed in the rules step and on the details? → A: As a tooltip everywhere, opened by an information button "(i)" right after the branch's name, on hover and on keyboard focus. In the rules step, the (i) follows the name on the branch's tab, as in the design. On the details, the same (i) follows the branch's name in the heading of its rules section and in the label of its pull URL, also where the URLs are shown after publishing (FR-026). A branch without a description shows no (i). The Add variant dialog's field keeps the design's "Description - Optional" and its helper "Shown when someone hovers the (i) next to the variant name." (FR-020).
- Q: Can a team member edit a branch's description after the branch is added, and can the main branch have a description at all? → A: Yes to both. "Rename" in the branch tab's menu opens the Add variant dialog's name and description fields, titled "Edit variant", without "Start with", for every branch, the main branch included. A missing or duplicate name is reported there as when adding a branch (FR-020). This extends the earlier answer on renaming and deleting branches, which named only renaming.
- Q: Does the rule editor's part picker for the "Place of birth" get a search field, given that the part pickers are built like the data menu, which has one, while the UI design lists the three parts without one? → A: No. Only long menus get a search field: the part pickers are built like the data menu, with a search field when the menu is long. The "Place of birth" part picker ("Choose part") lists "Country", "Region" and "City or town" as designed, without a search field. The "Licence classes" part picker, which lists the held classes and each class's issue date and expiry date, has the search field "Search classes", with the empty result "No options match "{typed text}".". The data menus' "Search Personal ID" and "Search Driving licence", the class value menus' "Search classes" and the check menus, which have no search field, stay as the answer on the rule editor's aids says. This narrows that answer's "built the same way" for the part pickers.

### Session 2026-10-24 (requirements checklist)

Questions raised by the requirements checklist ([checklists/rules-logic.md](checklists/rules-logic.md)). Its items that the plan had already decided, or that took a simple default, are written straight into the requirements they concern.

- Q: Can team members change the order of rules and groups within a level? → A: No. Rules and groups keep the order in which they were added: a new rule goes at the end of its level, and a new group takes the place of the first of its members. Reordering is out of scope (FR-007).
- Q: When a team member edits an inherited rule or group in a branch back to the main branch's version, does it follow the main branch again? → A: Yes, as after an undo, once the edit leaves it equal to the main branch's version in everything that counts as a change. A change in the main branch that makes the two equal doesn't, so that a later change in the main branch can't overwrite the branch's version (FR-024).
- Q: What can a team member do with a group or sub-group once it exists? → A: Ungroup it, which puts its members in its place, or delete it with its members after confirming. In a branch based on the main branch, an inherited group can only be removed there, with its members, and restored; ungrouping is for the groups the branch owns. An undo after either action is UI detail, as for rules (FR-008).
- Q: What happens when a change to the main branch leaves a group that a branch changed with fewer than two members? → A: The group dissolves in that branch too, and the branch's change to it goes, so that a group never has fewer than two members. The main branch's confirmation of the change names those branches. This is the one exception to FR-022's "MUST NOT overwrite or discard" (FR-008, FR-022).
- Q: What happens when a team member saves rules that another team member saved after the first opened them? → A: The system says so before saving and offers to reload, dropping the team member's unsaved changes, or to replace the other's rules, naming every branch that replacing them deletes. The rules of all branches count as one. For the form connection's name and documents, the later save still wins, as in spec 001 (FR-028).
- Q: How are name clashes prevented that arise without a name being entered, through a rule the main branch adds, a copy, a duplicate or an undo? → A: By keeping the names they could bring in taken: "Rule", "Group" or "Sub-group" followed by a number is kept for the item whose identifier has that number, and in a branch based on the main branch, a name that an undo or a restore could bring back counts as taken. Every clash is then refused where the name is entered (FR-005).
- Q: Do serviceBW forms that don't read the evaluation cope with the new field in the pull answer? → A: Yes. DO.IT has confirmed that serviceBW ignores fields it doesn't know (Assumptions).
- Q: A rule edited to check other data keeps its identifier. How does serviceBW avoid misreading its result? → A: The identifier names the rule, not what it checks, as FR-010 says. When DO.IT changes what a rule checks in a way serviceBW relies on, it agrees the change with serviceBW first, or adds a new rule and deletes the old one (Assumptions).

### Session 2026-10-25 (analysis)

Questions raised by the cross-artifact analysis of the spec, the plan and the tasks.

- Q: When a team member replaces another team member's rules, what happens to the rules, groups and branches that the other deleted? → A: The team member's version is saved whole. Rules and groups that the other deleted come back under their identifiers: the same rule returns, so no identifier is reused. A branch that the other deleted comes back as a new branch with a new pull URL, since the deleted one's pull URL answers "unavailable" for good. The system names it before saving, together with the branches that replacing deletes (FR-028).
- Q: How do the values of enum fields read in statements and proposed messages, given that some value sets are codes, such as the "Sex"? → A: By their label, such as "Personal ID – Nationality includes one of Germany". Only the licence classes read by their code, such as "B, BE" (FR-005).
- Q: How many branches and rules can a form connection have? → A: At most 20 branches, the main branch included, and at most 200 rules, groups and sub-groups per branch, removed ones included. Real forms stay far below these limits. Publishing or saving beyond either is refused with a message (Assumptions).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Check shared documents against rules (Priority: P1)

Some serviceBW forms are open only to applicants who meet conditions, such as a minimum age or a
driving licence class. A member of the DO.IT team sets up a form connection that requests the ID
with its "Date of birth" and the driving licence with its "Licence classes". After the documents
step, the create flow now has a rules step, before publishing. There the team member adds the rules
the form requires:

- the applicant is at least 21 years old: the ID's "Date of birth" is at least 21 years old;
- the applicant holds driving licence class B: the driving licence's "Licence classes" includes
  one of B;
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
   value (FR-003), such as date conditions for the "Date of birth" and "includes one of" or
   "includes none of" for the "Licence classes".
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
8. **Given** a group, **When** the team member ungroups it, **Then** its rules and sub-groups take
   its place in the level that contained it, and its AND or OR and its message no longer apply;
   **When** they delete it instead and confirm, **Then** it is deleted with everything in it.

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
9. **Given** a branch that is no longer needed, **When** the team member deletes it, confirms and
   saves, **Then** its pull URL answers every call with "unavailable", while the trigger URL and
   the other branches' pull URLs keep working, also for requests already in progress.

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
   that check it and their branches, and the form connection can't be published or saved while
   any of them remains.

---

### Edge Cases

- **No rules**: A branch without rules always counts as met, and its evaluation reports no message.
  This includes every form connection published before this feature.
- **Birthday on the day of sharing**: A citizen who turns 21 on the day they share their documents
  meets "Date of birth is at least 21 years old" and "is exactly 21 years old", but not "is less
  than 21 years old" (FR-012).
- **Born on 29 February**: In years without 29 February, the citizen reaches the next age on 1 March
  (FR-012). The same applies to every other date on 29 February, such as a licence class's issue
  date.
- **Months from now at the end of a month**: Shared on 31 January, "Expiry date is at least 1 month
  from now" is met by an expiry date from 1 March on, since February has no 31st (FR-012). An
  expiry date that has already passed is "less than" any number of years or months from now.
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
  "Licence classes includes one of B, C", which a licence with class B, class C or both meets.
  Any other combination takes a rule for each condition, such as "Date of birth is at least 19
  years old" and "Date of birth is less than 66 years old" on the same field, or "City or town is
  equal to Stuttgart" and "is equal to Esslingen" in an OR group (FR-002).
- **Group with a single rule**: Not possible. A group or sub-group is formed from at least two
  rules, and when one of its two rules is deleted, it is dissolved and the other rule moves to the
  level that contained it (FR-008).
- **Documents that fail verification**: Rules are evaluated only on documents that passed
  verification (spec 001, FR-010). A request whose documents don't pass ends as "verification
  failed", without an evaluation.
- **The evaluation fails**: If the evaluation can't be made, the pull fails like any other server
  error and hands nothing over, so serviceBW can pull again. Documents never go out without their
  evaluation (FR-017).
- **The main branch changes a rule that a branch changed**: The branch keeps its own version
  (FR-022).
- **The main branch removes a rule that a branch changed**: The branch keeps its version, which now
  counts as added in the branch, under the same identifier (FR-010).
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
- **The main branch leaves a group that a branch changed with one rule**: For example by deleting
  one of the group's two rules. The group dissolves in the branch too, and the branch's change to
  it goes (FR-008, FR-022). The main branch's confirmation of the deletion names that branch.
- **A branch groups inherited rules**: The new group is marked as added in the branch. The rules in
  it keep following the main branch, and a rule that the main branch removes disappears from the
  group, which is dissolved once fewer than two remain (FR-008). If the main branch puts these
  rules into a group of its own, they stay in the branch's group (FR-022).
- **A branch that started empty and has no rules**: Allowed. Every request pulled through it counts
  as met.
- **Branch renamed**: Its pull URL stays the same (FR-025).
- **Rule renamed**: serviceBW still receives its result under the same identifier (FR-010). If
  the main branch renames a rule to a name that a branch based on it already uses for another rule,
  the rename is refused with a message that names that branch (FR-005).
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
- **Two team members editing the rules at the same time**: The later save doesn't replace the
  other's rules silently. The system says that the rules changed since they were opened, and offers
  to reload or to replace them, naming every branch that replacing them deletes, or brings back
  with a new pull URL because the other team member deleted it (FR-028). For the form connection's
  name and documents, the later save wins (spec 001, Edge Cases).

## Requirements *(mandatory)*

### Functional Requirements

#### Defining rules

- **FR-001**: The create and edit flow of a form connection MUST include a rules step after the
  documents step and before publishing or saving. The step MUST be optional: a team member MUST be
  able to publish or save a form connection without any rule. The documents step MAY offer
  publishing or saving without going through the rules step, but only while no branch has any
  rule.
- **FR-002**: A rule MUST check one field of one document that the form connection requests, or one
  part of such a field (FR-003), with one condition. Every requested field except an image MAY be
  checked, by one rule or by several. Only an enum condition takes several values at once (FR-003);
  checking a field against several values or limits of another kind takes a rule for each. A rule
  MUST NOT check a field that the form connection doesn't request.
- **FR-003**: Every field that rules can check MUST have one of four kinds of value, and MUST offer
  the conditions of its kind, worded the same for every field of that kind, except for the age
  wording of the "Date of birth" (see Dates). No field has conditions of its own: a minimum age,
  for example, is a date condition on the "Date of birth".
  - **Numbers**, such as the "Height (cm)": is greater than, is less than, is equal to, or is not
    equal to a given number.
  - **Text**, such as the "City or town": is equal to, is not equal to, contains, or doesn't contain
    a given text, each either respecting or ignoring letter case (FR-013).
  - **Enums**, whose values come from a fixed set, such as the "Licence classes", the "Nationality"
    or the "Sex": includes one of, or includes none of, a set of one or more of those values, in
    the same words whatever the number of values. "Includes one of" MUST count as met when at
    least one of the document's values for the field is in the set, and "includes none of" when
    none of them is. A field with a single value, such as the "Sex", holds just that one. The
    document's values MUST be compared as the document gives them, ignoring letter case: a value
    outside the field's set matches none of the rule's values.
  - **Dates**, such as the "Expiry date": is before, is after, or is a given date; is at least, is
    less than, or is exactly a given number of years ago; or is at least, or is less than, a given
    number of years or months from now (FR-012). "Is before" and "is after" MUST exclude the
    given date itself. The "Date of birth" of every document words its
    three years-ago conditions as an age instead: is at least, is less than, or is exactly a given
    number of years old. The number of years or months MUST be a whole number of at least 1; a
    condition with any other number is incomplete (FR-006). Years and months MUST be counted from
    the day the citizen shares their documents, back or forward, never from a fixed date, and the
    rule editor MUST say so where these conditions are entered. It MAY add what the condition means for today's date as an
    example. Saved rules don't repeat the note.

  Fields made of parts MUST be checked through their parts, each with the conditions of its kind:
  the driving licence's "Licence classes" through the classes it holds (an enum) and each class's
  issue date and expiry date (dates), such as "Licence class B – Issue date"; the ID's "Place of
  birth" through its country (an enum), and its region and its city or town (text). A licence
  holds a class when it lists it, also if the class's own expiry date has passed; only a rule on
  that expiry date checks it.
- **FR-004**: Every rule MUST have an error message for the citizen. Once the rule's condition is
  complete, the system MUST propose a message that describes the condition as entered, which the
  team member MAY change. Groups and sub-groups MAY have an error message of their own (FR-011),
  which the team member MUST be able to add and remove.
- **FR-005**: The system MUST show every rule as a readable statement that names the document, the
  field or part of a field it checks, and the condition, and for text whether letter case counts,
  such as "Personal ID – Date of birth is at least 21 years old", "Driving licence – Licence
  class B – Issue date is at least 2 years ago" or "Driving licence – Expiry date is at least 6
  months from now". Enum values MUST appear by their label, such as "Personal ID – Nationality
  includes one of Germany", in statements and in proposed messages (FR-004); only the licence
  classes appear by their code, such as "B, BE". The statement, and the rule editor where the
  condition is chosen, MUST carry the condition in the words of FR-003. A symbol the interface adds for it, such as "≥", is decoration only, which
  assistive technologies MUST NOT announce. Every rule, group and sub-group MUST also have a
  name for the team: by default "Rule", "Group" or "Sub-group" and the number of its identifier
  (FR-010), such as "Rule 07", which the team member MAY change. Names MUST be unique within each
  branch, compared ignoring letter case and spaces at the start and end. A name that would appear
  twice in a branch, also through a change to the main branch that a branch based on it follows,
  MUST be refused where the name is entered, with a message that always names that branch, also
  when it is the branch being edited, such as "Another rule in Ambulance is already called Rule
  01.". So that no clash can arise where no name is entered, through a rule the main branch adds,
  a copy, a duplicate or an undo, "Rule", "Group" or "Sub-group" followed by a number MUST be kept
  for the rule, or the group or sub-group, whose identifier has that number, such as "Rule 08 is
  kept for the rule numbered 08."; and in a branch based on the main branch, a name MUST also
  count as taken when an undo or a restore could bring it back: the name of an item removed there,
  and the main branch's name of an item changed there. The name is part of the rule or group:
  renaming one inherited from the main branch in a branch based on it changes it there (FR-022).
  Messages in the management interface MUST name rules and groups by their name and branch.
- **FR-006**: The system MUST refuse to publish or save a form connection while, in any of its
  branches, a rule's condition is incomplete, a rule has no error message, or a rule checks a field
  that the form connection doesn't request. It MUST also refuse a branch without a name, or with
  the name of another branch of the same form connection. The message MUST name the problem, the
  rule concerned, if any, and its branch. A problem in a rule that branches based on the main
  branch inherit unchanged MUST be reported once, for the main branch. Rules marked removed in a
  branch (FR-023) are checked too; they mirror the main branch's version, so fixing or deleting it
  there clears them. A text value that is empty once spaces at the start and end are removed
  leaves its condition incomplete. The rules step MAY also point out a problem in the rule
  being edited, but publishing and saving MUST stay available, and be refused when attempted.
  Publishing or saving while a rule being edited has unsaved changes MUST first ask the team
  member to keep or discard them, with the same question as leaving the rule editor. Keeping saves
  the rule, subject to the checks above, and discarding drops the changes; either way, publishing
  or saving then goes on. A rule being edited counts as a rule: while one is open, the rules step
  MUST NOT offer publishing or saving "without rules".

#### Combining rules

- **FR-007**: In each branch, the rules and groups at the top level, in each group and in each
  sub-group MUST be combined with AND by default. The team member MUST be able to switch each of
  these levels to OR and back. All rules and groups of one level MUST be combined the same way: a
  different combination needs a group. Within a level, rules and groups MUST keep the order in
  which they were added, which is the order in which they are shown and reported: a new rule goes
  at the end of its level, and a new group takes the place of the first of its members. Team
  members can't change the order.
- **FR-008**: Team members MUST be able to put two or more rules of a branch's top level into a
  group, and two or more rules of a group into a sub-group, and to add rules to both. They MUST
  also be able to ungroup a group or sub-group, which puts its members in its place, and to
  delete one with its members after confirming. In a branch based on the main branch, an
  inherited group can only be removed there, with its members, and restored (FR-024); ungrouping
  is for the groups of the main branch, of branches that started empty, and those added in a
  branch (FR-022). A sub-group MUST NOT contain further groups. A group or sub-group MUST always
  hold at least two rules or sub-groups: when fewer remain, it MUST be dissolved, the one that
  remains, if any, MUST take its place in the level that contained it, and the group's AND or OR
  and its message no longer apply. A sub-group that reaches the top level this way, or through
  ungrouping, becomes a group and keeps its identifier, name, AND or OR, and message.
  In a branch based on the main branch, the rules and sub-groups removed in the branch, or put
  there into a group of the branch's own (FR-022), don't count: an inherited group they leave with
  fewer than two MUST be dissolved in that branch only, the one
  that remains MUST keep following the main branch, and the group MUST count again in the branch
  as soon as two or more remain, because a removal was undone (FR-024) or the main branch added to
  it.
- **FR-009**: A level combined with AND MUST count as met when all of its rules and groups are met,
  and a level combined with OR when at least one of them is met. A group or sub-group MUST count as
  a single rule of the level that contains it. A branch's rules MUST count as met overall when its
  top level is met, and a branch without rules MUST always count as met. Rules and groups removed
  in a branch, and groups dissolved there (FR-008), MUST NOT be evaluated: a dissolved group is
  evaluated as its remaining member, and a branch whose rules are all removed counts as a branch
  without rules.

#### Evaluating rules and delivering the result

- **FR-010**: When serviceBW pulls the documents of a completed request (spec 001, FR-013), the
  answer MUST also contain the evaluation of the rules of the branch whose pull URL serviceBW
  called (FR-025):
  - whether the rules are met overall;
  - for each rule and group, whether it is met, isn't met or, for a rule, couldn't be checked
    (FR-014), with its identifier, so that serviceBW can tell the results apart. The system MUST
    set the identifier when the rule or group is created, MUST NOT change it when the item is
    renamed or changed, and MUST NOT reuse it within the form connection. A rule or group keeps
    the main branch's identifier in every branch based on it, whether the branch changed it or
    not, also once its version counts as added because the main branch removed the original
    (FR-022); one added in a branch gets a new identifier. Rules and groups that aren't evaluated
    (FR-009) aren't reported. The details MUST show each identifier,
    read-only next to the item's name in every branch's section (FR-030), so that DO.IT can agree
    its use with serviceBW. The rules step doesn't show identifiers;
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
  from its N-th anniversary until the day before the next one. The age wording of the "Date of
  birth" means the same: "Date of birth is at least 21 years old" is met from the citizen's 21st
  birthday on. A date MUST count as "at least N years (or months) from now" when it falls on or
  after the day N years (or months) after the day of sharing, and as "less than N years (or
  months) from now" when it falls before that day, including dates already past. N months after a
  day is the same day of the month N months later or, where that month has no such day, the first
  day of the month after it, as for 29 February.
- **FR-013**: Each text condition MUST either respect or ignore letter case, as the team member
  chooses in the rules step, and MUST be evaluated accordingly. A new text condition ignores letter
  case until the team member changes that. Spaces at the start and end of the citizen's value and
  of the rule's value MUST be ignored in both cases. A letter written as one character, such as
  "ö", MUST count the same as the letter followed by a separate accent; spaces inside a value
  count as written.
- **FR-014**: A rule whose value is missing, or can't be interpreted for its condition, MUST count
  as not met and MUST be reported as couldn't be checked, so that serviceBW can tell it apart from
  a value that breaks the rule. An empty text or an empty list counts as a missing value. A rule
  on a date of a licence class that the licence doesn't hold
  is the exception: it MUST be reported as not met, since the citizen doesn't hold that class.
  Next to every date condition, the rule editor MUST say that a value that is missing or can't be
  read leaves the rule not met, reported as couldn't be checked. Next to a condition on a licence
  class's date, it MAY add that the rule isn't met when the licence doesn't list the class.
- **FR-015**: The documents MUST be delivered whether or not the rules are met, and the request's
  status MUST be "completed" in both cases. serviceBW decides how to proceed, for example by showing
  the error messages to the citizen.
- **FR-016**: The fields that rules check MUST be delivered to serviceBW like every other requested
  field (spec 001, FR-013). Rules only add their evaluation, and never hold a field back.
- **FR-017**: The evaluation MUST be delivered, repeated and deleted together with the documents it
  was made from (spec 001, FR-018 and FR-020): once they can no longer be obtained, neither can the
  evaluation. It MUST NOT contain the values of the fields it checked, and MUST NOT be written to
  any log. If the evaluation can't be made, the pull MUST fail like any other server error and
  hand nothing over, so that serviceBW can pull again: documents never go out without their
  evaluation.

#### Branches

- **FR-018**: Every form connection MUST have a main branch, whose pull URL is the pull URL the
  form connection already has. Form connections created before this feature MUST get a main branch
  without rules, and keep their trigger URL and pull URL. The main branch is called "Standard"
  until a team member renames it (FR-020), also in form connections created before this feature.
- **FR-019**: Team members MUST be able to add branches to a form connection, each starting either
  empty or based on the main branch, from the start of the rules step, before the main branch has
  any rule. A branch MUST NOT be based on any other branch. All branches MUST request the form
  connection's documents and fields; only their rules differ.
- **FR-020**: Every branch MUST have a name that is unique within its form connection, compared
  ignoring letter case and spaces at the start and end. Team members MUST be able to rename every
  branch and change its description, the main branch included, and to delete every branch except
  the main branch after confirming; the deletion takes effect when the form connection is saved
  (FR-027, FR-028). The rules step MAY refuse a missing or duplicate name as soon as it is entered;
  FR-006 still applies when publishing or saving. A branch MAY have a description, which isn't
  delivered to serviceBW. Wherever the rules step, the details and the URLs after publishing
  show a branch's name, on its tab, its rules section's heading and its pull URL's label, an
  information button right after the name MUST show the description in a tooltip, on hover and
  on keyboard focus. A branch without a description shows no such button.
- **FR-021**: A branch based on the main branch MUST start with all of the main branch's rules and
  groups, linked to them. While a rule or group is linked, the branch MUST follow every change the
  main branch makes to it, including its removal. Rules and groups that the main branch adds later
  MUST appear, linked, in every branch based on it, after the nearest item before them that both
  branches have in the same level, or first in that level if there is none. A rule that the main
  branch adds to a group that the branch removed appears in it and, like the group, isn't
  evaluated until the group is restored; one added to a group that the branch changed appears in
  it and follows the main branch. The branch MUST also follow the main branch's moves of its
  rules and groups, changed ones included, except out of a group the branch formed itself
  (FR-022). Here and in FR-022 to FR-024, the AND or OR of
  the top level counts as a group: a branch based on the main branch starts with the main branch's
  and follows it until the team member switches it in the branch.
- **FR-022**: A rule or group that the team member changes, removes or adds in a branch based on the
  main branch MUST no longer follow the main branch. A change is any edit of the data a rule
  checks, its condition, value, letter-case choice, message or name, and for a group, switching
  its AND or OR or changing its name or message; adding a rule to an inherited group adds the
  rule and doesn't change the group. Changes to the main branch MUST NOT overwrite or discard it: when the main branch removes
  a rule or group that the branch changed, the branch keeps its version, which then counts as
  added in the branch. The one exception is a group that a change to the main branch leaves with
  fewer than two members: it is dissolved in the branch too (FR-008), and the branch's change to
  it goes; where the main branch asks to confirm that change, it MUST name those branches. A group
  that the team member forms in such a branch from inherited rules counts as added. The rules in
  it keep following the main
  branch, including their removal, and carry no mark of their own, but the main branch moving them
  MUST NOT move them out of that group. A rule that the team member duplicates is a new rule with
  a new identifier (FR-010), and counts as added in such a branch. Team members MUST be able to
  copy a rule to one or more other branches: each copy is a new rule, not linked, with a new
  identifier and its default name (FR-005), at the end of the branch's top level, as if added
  there by hand. It counts as added in a branch based on the main branch, and a copy to the main
  branch appears, linked, in every branch based on it (FR-021). Choosing the main branch as a
  target therefore covers the branches based on it, which aren't copied to separately; a copy from
  such a branch to the main branch appears there beside the branch's own original.
- **FR-023**: In a branch based on the main branch, the system MUST mark every rule and group that
  was changed, removed or added in the branch, with a colour that sets it apart from those that
  follow the main branch and with a text or symbol that says which of the three it is, so that the
  difference doesn't rest on colour alone. Rules and groups removed in the branch, including groups
  dissolved there (FR-008), MUST stay visible there, marked as removed.
- **FR-024**: For a rule or group that a branch changed or removed, the team member MUST be able to
  undo the change, so that it follows the main branch again. An edit in the branch that leaves a
  changed rule or group equal to the main branch's version, in everything that counts as a change
  (FR-022), MUST also make it follow again; a change in the main branch that makes them equal MUST
  NOT. Undoing the removal of a group,
  including one dissolved in the branch (FR-008), MUST also undo the removals of the rules and
  sub-groups in it. A rule or group removed in a branch can only be restored there: it MUST NOT be
  changed or deleted in that branch.
- **FR-025**: A form connection MUST keep one trigger URL, which starts requests for all of its
  branches, and each branch MUST have its own pull URL. For a request, the pull URL of every branch
  that existed when the request was triggered MUST answer with the same status and documents; only
  the evaluation differs. The evaluation MUST use the rules of the branch whose pull URL serviceBW
  called, as they were when the request was triggered. The pull URL of a branch added after that
  MUST answer with an error saying that the branch didn't exist when the request was triggered,
  without status or documents. A branch's pull URL MUST stay the same when the branch is renamed or
  its rules change: every branch other than the main branch is identified in it by an identifier
  fixed when the branch is added, never by its name. That identifier MUST NOT be reused, also
  after the branch is deleted (FR-027).
- **FR-026**: After publishing, and on a form connection's details, the system MUST show the
  trigger URL once and the pull URL of every branch, labelled with the branch's name, each copyable
  in one action (spec 001, FR-004). A form connection with only the main branch MUST show its URLs
  as it did before this feature.
- **FR-027**: Once a branch's deletion is saved, its pull URL MUST answer every call with
  "unavailable" for good, as for a deleted form connection (spec 001, FR-006). Requests in
  progress MUST carry on: the trigger URL and the other branches' pull URLs keep working for them.
  Deactivating, reactivating and deleting a form connection MUST apply to its trigger URL and to
  all of its branches.

#### Changing rules

- **FR-028**: Publishing or saving MUST store a form connection's documents, branches and rules
  together or not at all: after a failure, nothing has changed, and the team member MUST be able
  to try again. Changes to rules and branches MUST apply to the requests triggered after they are
  saved, and MUST NOT change any existing URL. A request in progress MUST be evaluated with the
  rules each branch had when the request was triggered, even if they change before it completes
  (spec 001, FR-005). When a team member saves rules that another team member has saved since the
  first opened them, the system MUST say so before saving, and offer to reload the form
  connection, dropping their unsaved changes, or to replace the other's rules, naming every branch
  that replacing them deletes, and every branch that it brings back with a new pull URL. The rules
  of all branches count as one for this. Replacing them saves the team member's version whole:
  rules and groups that the other deleted come back under their identifiers (FR-010), and a branch
  that the other deleted comes back as a new branch with a new pull URL, since the deleted one's
  pull URL answers "unavailable" for good (FR-027). For the form connection's name and documents,
  the later save wins, as in spec 001.
- **FR-029**: When a team member removes a document, or deselects a field, that rules check in any
  branch, the system MUST name those rules and their branches before the change is saved.
- **FR-030**: A form connection's details MUST show the rules of every branch, with their groups,
  their AND and OR, the marks of FR-023, and the identifiers of FR-010, and MUST lead to the rules
  step of the edit flow (spec 001) to change them. That flow asks for confirmation when saving, not on entry.
- **FR-031**: Rules and branches MUST be visible and changeable only for signed-in DO.IT team
  members (spec 001, FR-007).

### Key Entities *(include if feature involves data)*

- **Rule**: A condition on one requested field of one document, or on one part of such a field,
  such as "Date of birth is at least 21 years old", with an error message for the citizen, an
  identifier for serviceBW (FR-010) and a name for the team, unique within its branch (FR-005).
  It belongs to one branch, either at the branch's top level or inside a group or sub-group.
- **Group**: Two or more rules or sub-groups, combined with either AND or OR, and counted as a
  single rule of the branch's top level. It may have an error message of its own, and has an
  identifier and a name like a rule.
- **Sub-group**: Two or more rules inside a group, combined with either AND or OR, and counted as a
  single rule of that group. It may have an error message of its own, has an identifier and a name
  like a rule, and contains no further groups.
- **Branch**: A named set of rules of one form connection, combined at its top level with AND or OR,
  with its own pull URL and an optional description, shown in a tooltip next to its name (FR-020).
  Every form connection has one main branch,
  which uses the form connection's original pull URL. Every other branch is either based on the
  main branch or started empty. All branches share the form connection's documents, fields and
  trigger URL.
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
  29 February birthday, an age exactly at the limit, "is exactly N years" on the day before the
  next anniversary, a date some months from now at the end of a month, a rule on a class the
  licence doesn't hold, text that differs only in letter case, under rules that respect it and
  rules that ignore it, German letters such as "ß" when letter case is ignored, and spaces at the
  start and end. Every evaluation whose rules aren't met carries at least one error message.
- **SC-004**: Rules don't delay the result: in 95% of requests, a pull 5 seconds after the citizen
  approves the request in their wallet returns the documents with their evaluation, as spec 001
  requires without rules (SC-004).
- **SC-005**: 100% of the form connections created before this feature keep working without any
  change in serviceBW: the same URLs, the same documents, and an evaluation that says the rules are
  met.
- **SC-006**: In acceptance testing, after the main branch changes, adds or removes a rule or group,
  100% of the branches based on it evaluate the next request with the main branch's new version
  wherever they follow it, and 0 of the changes made in those branches are lost, apart from the
  change to a group that FR-022's one exception dissolves.
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
  like every other requested field (FR-016). The driving licence's "Age in years" and "Year of
  birth" stay ordinary fields of spec 001's catalog, which rules can check as numbers; its "age
  over" attributes aren't in the catalog.
- **serviceBW's role**: serviceBW reads the evaluation, shows the error messages to the citizen and
  decides how to proceed, for example by not accepting the application. Its form decides which
  branch applies, from what the applicant entered earlier in the form, and fetches the result
  through that branch's pull URL. DO.IT agrees the use of the evaluation with serviceBW when it
  connects a form; changes to serviceBW itself stay out of scope, as in spec 001. serviceBW
  ignores fields of the pull answer it doesn't know, as DO.IT has confirmed, so forms that don't
  read the evaluation keep working (FR-010, SC-005). An identifier names a rule, not what it
  checks (FR-010): when DO.IT changes what a rule checks in a way serviceBW relies on, it agrees
  the change with serviceBW first, or adds a new rule and deletes the old one.
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
- **Size limits**: A form connection has at most 20 branches, the main branch included, and each
  branch at most 200 rules, groups and sub-groups, counting removed ones and the members of
  groups. Real forms stay far below these limits. Publishing or saving beyond either is refused
  with a message, such as "A connection can have at most 20 variants." or "Ambulance can have at
  most 200 rules and groups." (Clarifications, 2026-10-25).
- **Design**: The layout and wording of the rules step and of the branches come from the UI design,
  as in spec 001. The UI's words may differ from this spec's, as "connection" stands for "form
  connection", "variant" for "branch", and "Request link" and "Result link" for the trigger URL and
  a pull URL there, but the conditions keep the wording of FR-003. Messages that the management
  interface shows, the API's included, use the UI's words.
  The rule editor's aids are built as designed: search in long menus (the Licence classes part
  picker has one, the Place of birth's three parts don't), licence class codes with
  their descriptions, and the data menu's link "Need other data? Add it in Documents"
  (Clarifications, 2026-10-24).
- **Out of scope**: holding back from serviceBW the fields that rules check (see Clarifications);
  comparing two fields with each other, such as the names on the ID and on the driving licence;
  calculations across fields; free-form expressions; changing the order of rules and groups;
  conditions on the restriction codes of a
  licence class; trying rules out with sample data in the management interface; warnings about
  rules that contradict or repeat each other; reports or statistics on evaluation outcomes;
  going live on a scheduled date; an activity log of changes, and an export of a form connection
  as a PDF; deactivating single branches;
  branches with their own documents or fields; branches based on a branch other than the main
  branch; groups nested more than two levels deep; and error messages in several languages.
