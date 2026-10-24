# Requirements index — spec.md mtime unavailable (no shell access; spec Created 2026-10-22, last Clarifications session 2026-10-23)

Source: specs/002-connection-rules/spec.md (read in full, Clarifications included).
Flags: `CLAR` = settled in Clarifications (date given); `COPY` = spec fixes wording that should appear in the UI; `A11Y` = accessibility constraint. No `[NEEDS CLARIFICATION]` markers present.

| ID | Requirement (≤ 20 words) | Prio | UI | Surface | State | Flags | Spec § |
|---|---|---|---|---|---|---|---|
| FR-001a | Create and edit flow include a rules step after the documents step, before publishing or saving | P1 | Y | Rules step | default | | FR / Defining rules |
| FR-001b | Rules step is optional; publish or save works without any rule | P1 | Y | Rules step | empty | | FR / Defining rules |
| FR-002a | A rule checks one field, or one part of a field, of a requested document with one condition | P1 | Y | Rules step | default | | FR / Defining rules |
| FR-002b | Every requested field except images can be checked, by one or several rules | P1 | Y | Rules step | default | | FR / Defining rules |
| FR-002c | Only enum conditions take several values; other multi-value checks need one rule each | P1 | Y | Rules step | default | CLAR 2026-10-23 | FR / Defining rules |
| FR-002d | A rule must not check a field the form connection doesn't request (only requested fields offered) | P1 | Y | Rules step | default | | FR / Defining rules |
| FR-003a | Each checkable field has one of four kinds; conditions worded identically for every field of a kind | P1 | Y | Rules step | default | CLAR 2026-10-23 | FR / Defining rules |
| FR-003b | Number conditions: is greater than, is less than, is equal to, is not equal to | P1 | Y | Rules step | default | COPY | FR / Defining rules |
| FR-003c | Text conditions: is equal to, is not equal to, contains, doesn't contain; each with letter-case choice | P1 | Y | Rules step | default | COPY | FR / Defining rules |
| FR-003d | Enum conditions: is in, is not in a set of one or more fixed values | P1 | Y | Rules step | default | COPY | FR / Defining rules |
| FR-003e | Multi-valued enum: "is in" met if any value in set; "is not in" if none | P1 | N | ? | ? | | FR / Defining rules |
| FR-003f | Date conditions: is before/after/is a date; is at least/less than/exactly N years ago | P1 | Y | Rules step | default | COPY, CLAR 2026-10-23 | FR / Defining rules |
| FR-003g | Rules step states, next to the three years-ago conditions, that years count back from sharing day | P1 | Y | Rules step | default | COPY | FR / Defining rules |
| FR-003h | Licence classes checked via parts: held classes (enum), each class's issue and expiry date (dates) | P1 | Y | Rules step | default | COPY "Licence class B – Issue date", CLAR 2026-10-23 | FR / Defining rules |
| FR-003i | Place of birth checked via parts: country (enum), region and city or town (text) | P1 | Y | Rules step | default | CLAR 2026-10-23 | FR / Defining rules |
| FR-004a | Every rule has an error message for the citizen | P1 | Y | Rules step | default | | FR / Defining rules |
| FR-004b | System proposes an editable error message describing the rule's condition | P1 | Y | Rules step | default | | FR / Defining rules |
| FR-004c | Groups and sub-groups may have an error message of their own | P2 | Y | Rules step | default | | FR / Defining rules |
| FR-005 | Rule shown as readable statement: document, field/part, condition, and for text whether letter case counts | P1 | Y | Rules step; Details | default | COPY "Personal ID – Date of birth is at least 21 years ago" | FR / Defining rules |
| FR-006a | Publish/save refused while any branch has incomplete condition, missing message, or unrequested field | P1 | Y | Rules step | error | | FR / Defining rules |
| FR-006b | Publish/save refused for branch without name or with duplicate branch name | P2 | Y | Rules step | error | | FR / Defining rules |
| FR-006c | Refusal message names the problem, the rule concerned if any, and its branch | P1 | Y | Rules step | error | | FR / Defining rules |
| FR-007a | Top level, each group and each sub-group combine with AND by default, per branch | P2 | Y | Rules step | default | | FR / Combining rules |
| FR-007b | Team member can switch each level to OR and back | P2 | Y | Rules step | default | | FR / Combining rules |
| FR-007c | All rules and groups of one level combine the same way; mixing needs a group | P2 | Y | Rules step | default | | FR / Combining rules |
| FR-008a | Put two or more top-level rules into a group | P2 | Y | Rules step | default | | FR / Combining rules |
| FR-008b | Put two or more rules of a group into a sub-group | P2 | Y | Rules step | default | | FR / Combining rules |
| FR-008c | Add rules to groups and sub-groups | P2 | Y | Rules step | default | | FR / Combining rules |
| FR-008d | A sub-group cannot contain further groups | P2 | Y | Rules step | disabled | | FR / Combining rules |
| FR-008e | Group with fewer than two members dissolves; remaining member moves up; its AND/OR and message drop | P2 | Y | Rules step | default | CLAR 2026-10-23 | FR / Combining rules |
| FR-008f | In based branch, inherited group dissolves there only; remainder follows main; group returns at two members | P2 | Y | Rules step | default | CLAR 2026-10-23 | FR / Combining rules |
| FR-009a | AND level met when all members met; OR level when at least one met | P2 | N | ? | ? | | FR / Combining rules |
| FR-009b | A group or sub-group counts as a single rule of its containing level | P2 | N | ? | ? | | FR / Combining rules |
| FR-009c | Branch met when its top level is met; branch without rules always met | P1 | N | ? | ? | | FR / Combining rules |
| FR-010a | Pull answer includes evaluation of the rules of the branch whose pull URL was called | P1 | N | ? | ? | | FR / Evaluating |
| FR-010b | Evaluation states whether the rules are met overall | P1 | N | ? | ? | | FR / Evaluating |
| FR-010c | Evaluation gives each rule/group outcome (met, not met, couldn't be checked), distinctly identified | P1 | N | ? | ? | | FR / Evaluating |
| FR-010d | Evaluation includes the error messages explaining why rules aren't met | P1 | N | ? | ? | | FR / Evaluating |
| FR-010e | Rest of pull answer unchanged from spec 001 | P1 | N | ? | ? | | FR / Evaluating |
| FR-011a | When rules are met overall, no error message is reported | P1 | N | ? | ? | | FR / Evaluating |
| FR-011b | When not met: failing top-level rules' messages; failing group's own message, else its failing members' | P2 | N | ? | ? | | FR / Evaluating |
| FR-012a | Date conditions use the calendar date in Germany at the moment of sharing | P1 | N | ? | ? | | FR / Evaluating |
| FR-012b | Years count in whole calendar years; 29 February anniversaries fall on 1 March in common years | P1 | N | ? | ? | | FR / Evaluating |
| FR-012c | "At least" from Nth anniversary; "less than" until day before; "exactly" until day before next | P1 | N | ? | ? | CLAR 2026-10-23 | FR / Evaluating |
| FR-013a | Team member chooses per text condition whether letter case is respected or ignored | P1 | Y | Rules step | default | CLAR 2026-10-23 | FR / Evaluating |
| FR-013b | Text conditions are evaluated according to the chosen letter-case setting | P1 | N | ? | ? | | FR / Evaluating |
| FR-013c | A new text condition ignores letter case until the team member changes it | P1 | Y | Rules step | default | | FR / Evaluating |
| FR-013d | Leading and trailing spaces of citizen and rule values are ignored | P1 | N | ? | ? | | FR / Evaluating |
| FR-014a | Missing or uninterpretable value: rule not met, reported as couldn't be checked | P1 | N | ? | ? | | FR / Evaluating |
| FR-014b | Rule on a date of a licence class not held is reported as not met | P1 | N | ? | ? | | FR / Evaluating |
| FR-015 | Documents delivered whether or not rules met; request status "completed" either way | P1 | N | ? | ? | | FR / Evaluating |
| FR-016 | Fields checked by rules are delivered like any other requested field | P1 | N | ? | ? | CLAR 2026-10-22 | FR / Evaluating |
| FR-017a | Evaluation delivered, repeated and deleted together with its documents | P1 | N | ? | ? | | FR / Evaluating |
| FR-017b | Evaluation contains no checked field values and is never logged | P1 | N | ? | ? | | FR / Evaluating |
| FR-018a | Every form connection has a main branch using the existing pull URL | P2 | Y | Rules step; Details | default | | FR / Branches |
| FR-018b | Pre-feature form connections get a rule-less main branch and keep their URLs | P1 | N | ? | ? | | FR / Branches |
| FR-019a | Team members can add branches, starting empty or based on the main branch | P2 | Y | Rules step | default | | FR / Branches |
| FR-019b | A branch cannot be based on any branch other than main | P2 | Y | Rules step | disabled | | FR / Branches |
| FR-019c | All branches share the connection's documents and fields; only rules differ | P2 | N | ? | ? | | FR / Branches |
| FR-020a | Branch names are unique within the form connection | P2 | Y | Rules step | error | | FR / Branches |
| FR-020b | Every branch can be renamed | P2 | Y | Rules step | default | | FR / Branches |
| FR-020c | Every branch except main can be deleted after confirming | P2 | Y | Rules step | default | | FR / Branches |
| FR-021a | Based branch starts with all main rules and groups, linked to them | P2 | Y | Rules step | default | | FR / Branches |
| FR-021b | Linked items follow every main-branch change, including removal | P2 | Y | Rules step | default | | FR / Branches |
| FR-021c | Rules and groups later added to main appear, linked, in every based branch | P2 | Y | Rules step | default | | FR / Branches |
| FR-021d | Top-level AND/OR counts as a group: follows main until switched in the branch | P2 | Y | Rules step | default | | FR / Branches |
| FR-022a | Item changed, removed or added in a based branch no longer follows main | P2 | Y | Rules step | default | | FR / Branches |
| FR-022b | Main changes never overwrite branch changes; main-removed but branch-changed item counts as added | P2 | Y | Rules step | default | | FR / Branches |
| FR-023a | Changed, removed and added items in based branch marked with a distinguishing colour | P2 | Y | Rules step; Details | default | | FR / Branches |
| FR-023b | Marks also carry text or symbol stating changed, removed or added; not colour alone | P2 | Y | Rules step; Details | default | A11Y | FR / Branches |
| FR-023c | Removed items, including dissolved groups, stay visible in the branch, marked removed | P2 | Y | Rules step; Details | default | | FR / Branches |
| FR-024a | Team member can undo a branch's change or removal so the item follows main again | P2 | Y | Rules step | default | | FR / Branches |
| FR-024b | Undoing a group's removal also undoes removals of its rules and sub-groups | P2 | Y | Rules step | default | | FR / Branches |
| FR-025a | A form connection keeps one trigger URL that starts requests for all branches | P2 | N | ? | ? | CLAR 2026-10-22 | FR / Branches |
| FR-025b | Each branch has its own pull URL | P2 | Y | After publishing; Details | default | CLAR 2026-10-22 | FR / Branches |
| FR-025c | Pull URLs of branches existing at trigger time return identical status and documents | P2 | N | ? | ? | | FR / Branches |
| FR-025d | Evaluation uses called branch's rules as they were when the request was triggered | P2 | N | ? | ? | | FR / Branches |
| FR-025e | Pull URL of a branch added after trigger answers an error, without status or documents | P2 | N | ? | ? | CLAR 2026-10-22 | FR / Branches |
| FR-025f | A branch's pull URL stays the same on rename or rule change | P2 | N | ? | ? | | FR / Branches |
| FR-026a | After publishing and on details: trigger URL once, each branch's pull URL labelled with its name | P2 | Y | After publishing; Details | success | | FR / Branches |
| FR-026b | Each URL is copyable in one action | P2 | Y | After publishing; Details | default | | FR / Branches |
| FR-026c | Connection with only the main branch shows its URLs as before this feature | P1 | Y | After publishing; Details | default | | FR / Branches |
| FR-027a | Deleted branch's pull URL answers every call with "unavailable" | P2 | N | ? | ? | | FR / Branches |
| FR-027b | In-progress requests continue via trigger URL and other branches' pull URLs after a branch deletion | P2 | N | ? | ? | | FR / Branches |
| FR-027c | Deactivate, reactivate and delete of a connection apply to trigger URL and all branches | P2 | N | ? | ? | | FR / Branches |
| FR-028a | Rule and branch changes apply to requests triggered after save; no existing URL changes | P3 | N | ? | ? | | FR / Changing rules |
| FR-028b | In-progress request evaluated with each branch's rules as at trigger time | P3 | N | ? | ? | | FR / Changing rules |
| FR-029 | Removing a document or deselecting a field used by rules names those rules and branches before saving | P3 | Y | Documents step | error | | FR / Changing rules |
| FR-030a | Details show every branch's rules, groups, AND/OR and branch-change marks | P2 | Y | Details | default | | FR / Changing rules |
| FR-030b | Details lead to the rules step to change the rules | P3 | Y | Details | default | | FR / Changing rules |
| FR-031 | Rules and branches visible and changeable only for signed-in DO.IT team members | P1 | Y | Rules step; Details | ? | role-dependent | FR / Changing rules |
| US1-AS1 | Three rules added in rules step and published are saved and shown on details | P1 | Y | Rules step; Details | success | | US1 AS1 |
| US1-AS2 | Field choice offers only requested fields, each with its kind's conditions | P1 | Y | Rules step | default | | US1 AS2 |
| US1-AS3 | Publishing from rules step with no rules publishes connection without rules | P1 | Y | Rules step | empty | | US1 AS3 |
| US1-AS4 | Citizen meeting all rules: evaluation met, no error message | P1 | N | ? | ? | | US1 AS4 |
| US1-AS5 | Citizen aged 20, class B 1 year: not met, age and 2-year messages only | P1 | N | ? | ? | | US1 AS5 |
| US1-AS6 | Rule lacking message or value: publishing refused with message naming rule and problem | P1 | Y | Rules step | error | | US1 AS6 |
| US1-AS7 | Pre-feature connection: same documents, evaluation says rules met | P1 | N | ? | ? | | US1 AS7 |
| US2-AS1 | Rules at one level combine with AND; switching level to OR changes all of them | P2 | Y | Rules step | default | | US2 AS1 |
| US2-AS2 | Stuttgart, 20, class B 3 years: evaluation met | P2 | N | ? | ? | | US2 AS2 |
| US2-AS3 | Stuttgart, 20, class B 1 year: not met; 21-year and 3-year messages reported | P2 | N | ? | ? | | US2 AS3 |
| US2-AS4 | Unmet group with own message reports that message instead of inner rules' messages | P2 | N | ? | ? | | US2 AS4 |
| US2-AS5 | OR group with one met rule counts as met; no inner messages reported | P2 | N | ? | ? | | US2 AS5 |
| US2-AS6 | Adding a group inside a sub-group isn't offered | P2 | Y | Rules step | disabled | | US2 AS6 |
| US2-AS7 | Deleting one rule of a two-rule group dissolves it; other rule takes its place | P2 | Y | Rules step | default | | US2 AS7 |
| US3-AS1 | Adding "Ambulance" based on main copies four rules, shown as following main | P2 | Y | Rules step | default | | US3 AS1 |
| US3-AS2 | Changing branch age rule to 19 shows branch-change colour and changed mark; main keeps 21 | P2 | Y | Rules step | default | | US3 AS2 |
| US3-AS3 | Main class B change 2→3 years propagates to branch; branch age stays 19 | P2 | Y | Rules step | default | | US3 AS3 |
| US3-AS4 | Removed inherited rule stays visible marked removed; new rule marked added; main unchanged | P2 | Y | Rules step | default | | US3 AS4 |
| US3-AS5 | Undoing a branch change or removal makes the rule follow main again | P2 | Y | Rules step | default | | US3 AS5 |
| US3-AS6 | Rules added to empty-started branch carry no marks and ignore main changes | P2 | Y | Rules step | default | | US3 AS6 |
| US3-AS7 | Details show one trigger URL and per-branch pull URLs labelled by name, each copyable | P2 | Y | Details | default | | US3 AS7 |
| US3-AS8 | Same request: Ambulance pull URL met; main pull URL not met with age message | P2 | N | ? | ? | | US3 AS8 |
| US3-AS9 | Deleting a branch after confirming; its pull URL answers "unavailable", others keep working | P2 | Y | Rules step | ? | delete confirmation | US3 AS9 |
| US4-AS1 | Changing a rule on live connection and saving keeps URLs; only new requests use change | P3 | Y | Rules step (edit) | success | | US4 AS1 |
| US4-AS2 | Adding rules to live rule-less connection keeps URLs; new requests use them | P3 | Y | Rules step (edit) | success | | US4 AS2 |
| US4-AS3 | Deselecting checked field or removing document names rules and branches; save blocked while they remain | P3 | Y | Documents step | error | | US4 AS3 |
| EC-1 | Branch without rules always met, no message; includes pre-feature connections | P1 | N | ? | ? | | Edge Cases |
| EC-2 | Turning 21 on sharing day meets "at least" and "exactly 21", not "less than" | P1 | N | ? | ? | | Edge Cases |
| EC-3 | 29 February dates reach next anniversary on 1 March in common years | P1 | N | ? | ? | | Edge Cases |
| EC-4 | Dates count by German calendar date at sharing, regardless of wallet/serviceBW time zone | P1 | N | ? | ? | | Edge Cases |
| EC-5 | Unparseable value (year-only birth date, class without issue date): not met, couldn't be checked | P1 | N | ? | ? | | Edge Cases |
| EC-6 | Rule on issue date of a class not held: reported not met, not couldn't-be-checked | P1 | N | ? | ? | | Edge Cases |
| EC-7 | Case-insensitive match incl. German letters (ß/ss, Ö); trimmed spaces; "contains" vs "is equal to" | P1 | N | ? | ? | | Edge Cases |
| EC-8 | Several conditions on one field: enum takes several values; others need one rule each | P1 | Y | Rules step | default | | Edge Cases |
| EC-9 | Single-rule group impossible; deleting one of two rules dissolves the group | P2 | Y | Rules step | default | | Edge Cases |
| EC-10 | Documents failing verification end "verification failed" without evaluation | P1 | N | ? | ? | | Edge Cases |
| EC-11 | Main changes a rule the branch changed: branch keeps its version | P2 | Y | Rules step | default | | Edge Cases |
| EC-12 | Main removes a rule the branch changed: branch version now counts as added | P2 | Y | Rules step | default | | Edge Cases |
| EC-13 | Main removes a rule the branch removed: it disappears from the branch too | P2 | Y | Rules step | default | | Edge Cases |
| EC-14 | Main adds a rule: appears following main in based branches, not in empty-started ones | P2 | Y | Rules step | default | | Edge Cases |
| EC-15 | Branch switching inherited group's AND/OR or message marks group changed; inner rules still follow | P2 | Y | Rules step | default | | Edge Cases |
| EC-16 | Branch removing one rule of inherited two-rule group: dissolved there, group shown removed; undo restores | P2 | Y | Rules step | default | | Edge Cases |
| EC-17 | Empty-started branch without rules is allowed; always counts as met | P2 | Y | Rules step | empty | | Edge Cases |
| EC-18 | Renaming a branch keeps its pull URL | P2 | N | ? | ? | | Edge Cases |
| EC-19 | Connection deactivated or deleted mid-request: request cancelled as "unavailable" | P2 | N | ? | ? | | Edge Cases |
| EC-20 | Branch deleted mid-request: request continues; only that branch's pull URL answers "unavailable" | P2 | N | ? | ? | | Edge Cases |
| EC-21 | Rules changed mid-request: evaluated with rules at trigger time | P3 | N | ? | ? | | Edge Cases |
| EC-22 | Branch added mid-request: its pull URL errors for that request, no status or documents | P2 | N | ? | ? | | Edge Cases |
| EC-23 | Applicant switching branch after sharing: other pull URL works only within 60-second repeat window | P2 | N | ? | ? | | Edge Cases |
| EC-24 | Once documents are gone, the evaluation is gone too | P1 | N | ? | ? | | Edge Cases |
| EC-25 | Two team members editing rules concurrently: later save wins | P3 | N | ? | ? | | Edge Cases |
| ENT-Rule.document | Document the rule checks | P1 | Y | Rules step | default | | Key Entities |
| ENT-Rule.field | Requested field, or part of a field, the rule checks | P1 | Y | Rules step | default | | Key Entities |
| ENT-Rule.condition | Condition with its value(s), e.g. "is at least 21 years ago" | P1 | Y | Rules step | default | | Key Entities |
| ENT-Rule.error_message | Error message for the citizen | P1 | Y | Rules step | default | | Key Entities |
| ENT-Rule.branch | Branch the rule belongs to | P2 | Y | Rules step | default | | Key Entities |
| ENT-Rule.parent | Position: top level, inside a group, or inside a sub-group | P2 | Y | Rules step | default | | Key Entities |
| ENT-Group.members | Two or more rules or sub-groups | P2 | Y | Rules step | default | | Key Entities |
| ENT-Group.operator | AND or OR | P2 | Y | Rules step | default | | Key Entities |
| ENT-Group.error_message | Optional own error message | P2 | Y | Rules step | default | | Key Entities |
| ENT-Sub-group.members | Two or more rules; no further groups | P2 | Y | Rules step | default | | Key Entities |
| ENT-Sub-group.operator | AND or OR | P2 | Y | Rules step | default | | Key Entities |
| ENT-Sub-group.error_message | Optional own error message | P2 | Y | Rules step | default | | Key Entities |
| ENT-Branch.name | Name unique within the form connection | P2 | Y | Rules step; Details | default | | Key Entities |
| ENT-Branch.rules | Set of rules, groups and sub-groups | P2 | Y | Rules step; Details | default | | Key Entities |
| ENT-Branch.operator | Top-level AND or OR | P2 | Y | Rules step | default | | Key Entities |
| ENT-Branch.pull_url | Own pull URL; main branch uses the original one | P2 | Y | After publishing; Details | default | | Key Entities |
| ENT-Branch.origin | Main, based on main, or started empty | P2 | Y | Rules step | default | | Key Entities |
| ENT-Branch Change.item | Rule or group differing from main in a based branch | P2 | Y | Rules step; Details | default | | Key Entities |
| ENT-Branch Change.kind | Changed, removed or added | P2 | Y | Rules step; Details | default | | Key Entities |
| ENT-Branch Change.undoable | Changes and removals can be undone | P2 | Y | Rules step | default | | Key Entities |
| ENT-Rule Evaluation.met_overall | Whether the branch's rules are met overall | P1 | N | ? | ? | | Key Entities |
| ENT-Rule Evaluation.outcomes | Outcome of each rule and group | P1 | N | ? | ? | | Key Entities |
| ENT-Rule Evaluation.error_messages | Error messages to show the citizen | P1 | N | ? | ? | | Key Entities |
| ENT-Rule Evaluation.lifecycle | Delivered, repeated and deleted with the documents | P1 | N | ? | ? | | Key Entities |
| ENT-Form Connection.branches | Holds its branches and their rules | P2 | Y | Rules step; Details | default | | Key Entities |
| ENT-Document Request.trigger | Started through the connection's single trigger URL | P2 | N | ? | ? | | Key Entities |
| ENT-Document Request.rules_snapshot | Every branch's rules as at trigger time | P3 | N | ? | ? | | Key Entities |
| ENT-Document Request.evaluated_branch | Branch whose pull URL serviceBW calls | P2 | N | ? | ? | | Key Entities |
| ENT-Connection URL.trigger_url | One trigger URL per form connection | P2 | Y | After publishing; Details | default | | Key Entities |
| ENT-Connection URL.pull_url | One pull URL per branch; main keeps the original | P2 | Y | After publishing; Details | default | | Key Entities |

## Exclusions
| OUT-ID | Excluded behaviour | Spec § |
|---|---|---|
| OUT-1 | Marking a field "only for rules" / holding checked fields back from serviceBW | Clarifications 2026-10-22; Assumptions / Out of scope |
| OUT-2 | Comparing two fields with each other (e.g. names on ID vs driving licence) | Assumptions / Out of scope |
| OUT-3 | Calculations across fields | Assumptions / Out of scope |
| OUT-4 | Free-form expressions | Assumptions / Out of scope |
| OUT-5 | Conditions on a licence class's restriction codes | Assumptions / Out of scope |
| OUT-6 | Trying rules out with sample data in the management interface | Assumptions / Out of scope |
| OUT-7 | Reports or statistics on evaluation outcomes | Assumptions / Out of scope |
| OUT-8 | Deactivating single branches | Assumptions / Out of scope |
| OUT-9 | Branches with their own documents or fields | Assumptions / Out of scope; FR-019 |
| OUT-10 | Branches based on a branch other than the main branch | Assumptions / Out of scope; FR-019 |
| OUT-11 | Groups nested more than two levels deep | Assumptions / Out of scope; FR-008 |
| OUT-12 | Error messages in several languages (one message per rule/group) | Assumptions / Out of scope; Assumptions / Error messages |
| OUT-13 | Changes to serviceBW itself | Assumptions / serviceBW's role |
| OUT-14 | Rules on images (photos, portraits, signatures) | FR-002; Assumptions / Images |
| OUT-15 | Field-specific condition wording (e.g. a dedicated "minimum age" condition) | FR-003; Clarifications 2026-10-23 |
| OUT-16 | Wallet-side evaluation of conditions (e.g. "age over 21" attributes) | Assumptions / Where rules are evaluated |
| OUT-17 | Middleware judging whether a rule is lawful or appropriate | Assumptions / Lawful rules |

## Glossary
form connection = connection, use case (V1 wording)
rules step = Rules, Conditions, Rules & conditions, Eligibility
rule = condition, check, requirement, criterion
condition = operator, comparison, criteria
group = rule group, group of rules, condition group
sub-group = subgroup, nested group, inner group
AND / OR = all / any, match all / match any, all of / any of, combinator, logic toggle
branch = variant, scenario, rule set, path, version
main branch = main, default, base, primary
based on the main branch = inherited, linked, follows main, copy of main
started empty = blank, empty branch, from scratch, start fresh
changed (in branch) = modified, edited, overridden, customised
removed (in branch) = deleted, excluded, struck through
added (in branch) = new, branch-only
undo = revert, reset, restore, follow main again
error message = message, message for citizen, error text, failure message, hint
letter case = case sensitive, match case, ignore case, Aa
is at least {years} ago = at least N years ago, minimum age, older than
is less than {years} ago = younger than, under
is in / is not in = one of / none of, includes / excludes, any of
trigger URL = start URL, request link, trigger link
pull URL = result URL, fetch URL, poll URL, pull link
copy (one action) = copy button, copy to clipboard, copy icon
details = connection details, overview, summary, connection page
after publishing = published, success screen, connection created
documents step = documents, select documents, fields, data
publish = create connection, finish, done, save
Personal ID = ID, PID, identity card, Personalausweis
Driving licence = driving license, driver's licence, mDL, Führerschein
Licence classes = license classes, vehicle categories, driving categories, classes
Licence class B – Issue date = class B issue date, held since
Date of birth = birth date, birthdate, DOB
Place of birth = birthplace, birth place
City or town = city, locality, town
Nationality = citizenship
team member = user, DO.IT team member, admin
citizen = applicant, user (of the form)
evaluation = result, rule result, outcome, rules met
unavailable = deactivated, deleted, no longer available
