# Requirements index — spec.md mtime 1792861966 (2026-10-24 17:12:46 UTC)

Source: specs/002-connection-rules/spec.md (read in full, Clarifications included; rebuilt after the last 2026-10-24 Clarifications: identifiers on the details, from-now wording, whole number ≥ 1, rule editor aids, branch description tooltip, Edit variant).
Flags: `CLAR` = settled in Clarifications (date given); `COPY` = spec fixes wording that should appear in the UI; `A11Y` = accessibility constraint; `NEW` = item added by the previous rebuild; `ADDED` = item added by this rebuild (see changes.md). No `[NEEDS CLARIFICATION]` markers present.
ID stability: FR sub-letters and EC-1..EC-28 keep the IDs of the previous index (the spec's Clarifications cite EC-15 and EC-16 in that numbering). Items added by this rebuild take the next free sub-letter of their FR; items that only Clarifications define (rule editor aids) are filed under the FR they extend, with the Clarifications as their Spec §.

| ID | Requirement (≤ 20 words) | Prio | UI | Surface | State | Flags | Spec § |
|---|---|---|---|---|---|---|---|
| FR-001a | Create and edit flow include a rules step after the documents step, before publishing or saving | P1 | Y | Rules step | default | | FR / Defining rules |
| FR-001b | Rules step is optional; publish or save works without any rule | P1 | Y | Rules step | empty | | FR / Defining rules |
| FR-001c | Documents step may offer publishing/saving without rules step only while no branch has any rule | P1 | Y | Documents step | default | NEW, CLAR 2026-10-24, COPY "Publish without rules" | FR / Defining rules |
| FR-002a | A rule checks one field, or one part of a field, of a requested document with one condition | P1 | Y | Rules step | default | | FR / Defining rules |
| FR-002b | Every requested field except images can be checked, by one or several rules | P1 | Y | Rules step | default | | FR / Defining rules |
| FR-002c | Only enum conditions take several values; other multi-value checks or ranges need one rule each | P1 | Y | Rules step | default | CLAR 2026-10-23, CLAR 2026-10-24 | FR / Defining rules |
| FR-002d | A rule must not check a field the form connection doesn't request (only requested fields offered) | P1 | Y | Rules step | default | | FR / Defining rules |
| FR-002e | Long rule-editor menus have a search field: "Search {document}" in the data menu, "Search classes", "Search options" | P1 | Y | Rules step – rule editor | default | ADDED, COPY "Search Personal ID", "Search Driving licence", CLAR 2026-10-24 | Clarifications 2026-10-24; Assumptions / Design |
| FR-002f | A menu search without matches shows an empty-result message | P1 | Y | Rules step – rule editor | empty | ADDED, COPY "No options match "{typed text}".", CLAR 2026-10-24 | Clarifications 2026-10-24 |
| FR-002g | Data menu ends with a link that opens the documents step | P1 | Y | Rules step – rule editor | default | ADDED, COPY "Need other data? Add it in Documents", CLAR 2026-10-24 | Clarifications 2026-10-24; Assumptions / Design |
| FR-002h | Menu footers that state a requirement stay as designed | P1 | Y | Rules step – rule editor | default | ADDED, COPY "Lists the documents you added", "Only documents you request are listed.", "Select at least one option.", CLAR 2026-10-24 | Clarifications 2026-10-24 |
| FR-003a | Each checkable field has one of four kinds; conditions worded identically per kind, except Date of birth | P1 | Y | Rules step – rule editor | default | CLAR 2026-10-24 | FR / Defining rules |
| FR-003b | Number conditions: is greater than, is less than, is equal to, is not equal to (strict, one value) | P1 | Y | Rules step – rule editor | default | COPY, CLAR 2026-10-24 | FR / Defining rules |
| FR-003c | Text conditions: is equal to, is not equal to, contains, doesn't contain; one value, letter-case choice each | P1 | Y | Rules step – rule editor | default | COPY, CLAR 2026-10-24 | FR / Defining rules |
| FR-003d | Enum conditions: "includes one of", "includes none of" a set of one or more fixed values | P1 | Y | Rules step – rule editor | default | COPY, CLAR 2026-10-24 | FR / Defining rules |
| FR-003e | "Includes one of" met if any document value in set; "includes none of" if none is | P1 | N | ? | ? | | FR / Defining rules |
| FR-003f | Date conditions: is before/after/is a date; is at least/less than/exactly N years ago | P1 | Y | Rules step – rule editor | default | COPY, CLAR 2026-10-23 | FR / Defining rules |
| FR-003g | Rule editor states, where these conditions are entered, that years/months count from the sharing day | P1 | Y | Rules step – rule editor | default | COPY "Counted from the day the applicant shares.", CLAR 2026-10-24 | FR / Defining rules |
| FR-003h | Licence classes checked via parts: held classes (enum), each class's issue and expiry date (dates) | P1 | Y | Rules step – rule editor | default | COPY "Licence class B – Issue date", CLAR 2026-10-24 | FR / Defining rules |
| FR-003i | Place of birth checked via parts: country (enum), region and city or town (text) | P1 | Y | Rules step – rule editor | default | CLAR 2026-10-24 | FR / Defining rules |
| FR-003j | Every date field offers "is at least" / "is less than" N years or months from now | P1 | Y | Rules step – rule editor | default | NEW, COPY, CLAR 2026-10-24 | FR / Defining rules |
| FR-003k | Date of birth words its three years-ago conditions as age: is at least/less than/exactly N years old | P1 | Y | Rules step – rule editor | default | NEW, COPY, CLAR 2026-10-24 | FR / Defining rules |
| FR-003l | Editor may add today's worked example; saved rules don't repeat the counting note | P1 | Y | Rules step – rule editor | default | NEW, COPY "Today (…) this means: …", CLAR 2026-10-24 | FR / Defining rules |
| FR-003m | Years or months of a date condition must be a whole number of at least 1; otherwise incomplete | P1 | Y | Rules step – rule editor | error | ADDED, CLAR 2026-10-24 | FR / Defining rules |
| FR-003n | Number fields, such as Height (cm), keep accepting any number | P1 | Y | Rules step – rule editor | default | ADDED, CLAR 2026-10-24 | Clarifications 2026-10-24 |
| FR-003o | Licence class lists show each code with its description; saved statements keep the codes only | P1 | Y | Rules step – rule editor | default | ADDED, COPY "B Cars up to 3.5 t", CLAR 2026-10-24 | Clarifications 2026-10-24; Assumptions / Design |
| FR-003p | Part pickers of Place of birth and Licence classes are built like the data menu, with search | P1 | Y | Rules step – rule editor | default | ADDED, CLAR 2026-10-24 | Clarifications 2026-10-24 |
| FR-004a | Every rule has an error message for the citizen | P1 | Y | Rules step – rule editor | default | | FR / Defining rules |
| FR-004b | Once condition complete, system proposes an editable message matching the condition as entered | P1 | Y | Rules step – rule editor | default | CLAR 2026-10-24 | FR / Defining rules |
| FR-004c | Groups and sub-groups may have an error message of their own | P2 | Y | Rules step | default | | FR / Defining rules |
| FR-004d | Group/sub-group menu offers adding and removing its message, shown under its header | P2 | Y | Rules step | default | NEW, CLAR 2026-10-24 | FR / Defining rules |
| FR-005a | Rule shown as readable statement: document, field/part, condition in FR-003 words, text letter-case setting | P1 | Y | Rules step; Details | default | COPY "Personal ID – Date of birth is at least 21 years old" | FR / Defining rules |
| FR-005b | Symbols such as "≥" are decoration only, not announced by assistive technologies | P1 | Y | Rules step; Details | default | NEW, A11Y, CLAR 2026-10-24 | FR / Defining rules |
| FR-005c | Every rule, group, sub-group has a renamable team name, default "Rule 07", "Group …", "Sub-group …" | P1 | Y | Rules step; Details | default | NEW, COPY, CLAR 2026-10-24 | FR / Defining rules |
| FR-005d | Names unique per branch; duplicate refused inline with message naming the branch | P2 | Y | Rules step | error | NEW, COPY "Another rule in Ambulance is already called Rule 01.", CLAR 2026-10-24 | FR / Defining rules |
| FR-005e | Renaming an inherited rule or group in a based branch changes it there | P2 | Y | Rules step | default | NEW, CLAR 2026-10-24 | FR / Defining rules |
| FR-005f | Management-interface messages name rules and groups by their name and branch | P1 | Y | Rules step; Documents step | error | NEW | FR / Defining rules |
| FR-005g | Rule editor and saved statements both carry FR-003 words, e.g. "is at least 6 months from now", never "left" | P1 | Y | Rules step – rule editor; Rules step; Details | default | ADDED, COPY "Driving licence – Expiry date is at least 6 months from now", CLAR 2026-10-24 | FR / Defining rules |
| FR-006a | Publish/save refused while any branch has incomplete condition, missing message, or unrequested field | P1 | Y | Rules step | error | | FR / Defining rules |
| FR-006b | Publish/save refused for branch without name or with duplicate branch name | P2 | Y | Rules step | error | | FR / Defining rules |
| FR-006c | Refusal message names the problem, the rule concerned if any, and its branch | P1 | Y | Rules step | error | | FR / Defining rules |
| FR-006d | Editor may flag a problem in the rule being edited; publish/save stay available, refused on attempt | P1 | Y | Rules step – rule editor | error | NEW, CLAR 2026-10-24 | FR / Defining rules |
| FR-006e | Publish/save with unsaved rule-editor changes first asks keep or discard, same dialog as leaving editor | P1 | Y | Rules step – rule editor | default | NEW, COPY "Save changes to Rule 01?", CLAR 2026-10-24 | FR / Defining rules |
| FR-006f | Keep saves the rule (still checked), discard drops changes; publishing or saving then continues | P1 | Y | Rules step – rule editor | default | NEW, CLAR 2026-10-24 | FR / Defining rules |
| FR-006g | While a rule editor is open, no "without rules" publish/save is offered | P1 | Y | Rules step | default | NEW, CLAR 2026-10-24 | FR / Defining rules |
| FR-006h | Data menu's Documents link with unsaved editor changes first asks to keep or discard them | P1 | Y | Rules step – rule editor | default | ADDED, COPY "Save changes to Rule 01?", CLAR 2026-10-24 | Clarifications 2026-10-24 |
| FR-007a | Top level, each group and each sub-group combine with AND by default, per branch | P2 | Y | Rules step | default | | FR / Combining rules |
| FR-007b | Team member can switch each level to OR and back | P2 | Y | Rules step | default | | FR / Combining rules |
| FR-007c | All rules and groups of one level combine the same way; mixing needs a group | P2 | Y | Rules step | default | | FR / Combining rules |
| FR-008a | Put two or more top-level rules into a group | P2 | Y | Rules step | default | | FR / Combining rules |
| FR-008b | Put two or more rules of a group into a sub-group | P2 | Y | Rules step | default | | FR / Combining rules |
| FR-008c | Add rules to groups and sub-groups | P2 | Y | Rules step | default | | FR / Combining rules |
| FR-008d | A sub-group cannot contain further groups | P2 | Y | Rules step | disabled | | FR / Combining rules |
| FR-008e | Group with fewer than two members dissolves; remaining member moves up; its AND/OR and message drop | P2 | Y | Rules step | default | CLAR 2026-10-24 (no empty groups) | FR / Combining rules |
| FR-008f | Based branch: members removed or regrouped there don't count; inherited group dissolves there only, returns at two | P2 | Y | Rules step | default | CLAR 2026-10-24 | FR / Combining rules |
| FR-009a | AND level met when all members met; OR level when at least one met | P2 | N | ? | ? | | FR / Combining rules |
| FR-009b | A group or sub-group counts as a single rule of its containing level | P2 | N | ? | ? | | FR / Combining rules |
| FR-009c | Branch met when its top level is met; branch without rules always met | P1 | N | ? | ? | | FR / Combining rules |
| FR-010a | Pull answer includes evaluation of the rules of the branch whose pull URL was called | P1 | N | ? | ? | | FR / Evaluating |
| FR-010b | Evaluation states whether the rules are met overall | P1 | N | ? | ? | | FR / Evaluating |
| FR-010c | Evaluation gives each rule/group outcome (met, not met, couldn't be checked) with its identifier | P1 | N | ? | ? | | FR / Evaluating |
| FR-010d | Evaluation includes the error messages explaining why rules aren't met | P1 | N | ? | ? | | FR / Evaluating |
| FR-010e | Rest of pull answer unchanged from spec 001 | P1 | N | ? | ? | | FR / Evaluating |
| FR-010f | Identifier set at creation, unchanged on rename or change, never reused within the form connection | P1 | N | ? | ? | NEW, CLAR 2026-10-24 | FR / Evaluating |
| FR-010g | Inherited items keep main's identifier in every based branch; branch-added items get new ones | P2 | N | ? | ? | NEW, CLAR 2026-10-24 | FR / Evaluating |
| FR-010h | Details show each rule's, group's and sub-group's identifier read-only next to its name, in every branch's section | P1 | Y | Details | default | NEW, CLAR 2026-10-24 | FR / Evaluating |
| FR-010i | Rules step doesn't show identifiers | P1 | Y | Rules step | default | ADDED, CLAR 2026-10-24 | FR / Evaluating |
| FR-011a | When rules are met overall, no error message is reported | P1 | N | ? | ? | | FR / Evaluating |
| FR-011b | When not met: failing top-level rules' messages; failing group's own message, else its failing members' | P2 | N | ? | ? | | FR / Evaluating |
| FR-012a | Date conditions use the calendar date in Germany at the moment of sharing | P1 | N | ? | ? | | FR / Evaluating |
| FR-012b | Years count in whole calendar years; 29 February anniversaries fall on 1 March in common years | P1 | N | ? | ? | | FR / Evaluating |
| FR-012c | "At least" from Nth anniversary; "less than" until day before; "exactly" until day before next | P1 | N | ? | ? | CLAR 2026-10-23 | FR / Evaluating |
| FR-012d | Date of birth age wording evaluated as years ago: "at least 21 years old" met from 21st birthday | P1 | N | ? | ? | NEW, CLAR 2026-10-24 | FR / Evaluating |
| FR-012e | "At least N from now": on/after sharing day plus N; "less than": before it, including past dates | P1 | N | ? | ? | NEW, CLAR 2026-10-24 | FR / Evaluating |
| FR-012f | N months later: same day of month, else first day of the following month | P1 | N | ? | ? | NEW | FR / Evaluating |
| FR-013a | Team member chooses per text condition whether letter case is respected or ignored | P1 | Y | Rules step – rule editor | default | CLAR 2026-10-23 | FR / Evaluating |
| FR-013b | Text conditions are evaluated according to the chosen letter-case setting | P1 | N | ? | ? | | FR / Evaluating |
| FR-013c | A new text condition ignores letter case until the team member changes it | P1 | Y | Rules step – rule editor | default | CLAR 2026-10-24 | FR / Evaluating |
| FR-013d | Leading and trailing spaces of citizen and rule values are ignored | P1 | N | ? | ? | | FR / Evaluating |
| FR-014a | Missing or uninterpretable value: rule not met, reported as couldn't be checked | P1 | N | ? | ? | | FR / Evaluating |
| FR-014b | Rule on a date of a licence class not held is reported as not met | P1 | N | ? | ? | CLAR 2026-10-24 | FR / Evaluating |
| FR-014c | Rule editor states missing/unreadable handling next to every date condition | P1 | Y | Rules step – rule editor | default | NEW, COPY "If the {field} is missing or can't be read, the rule isn't met and is reported as couldn't be checked.", CLAR 2026-10-24 | FR / Evaluating |
| FR-015 | Documents delivered whether or not rules met; request status "completed" either way | P1 | N | ? | ? | | FR / Evaluating |
| FR-016 | Fields checked by rules are delivered like any other requested field | P1 | N | ? | ? | CLAR 2026-10-22 | FR / Evaluating |
| FR-017a | Evaluation delivered, repeated and deleted together with its documents | P1 | N | ? | ? | | FR / Evaluating |
| FR-017b | Evaluation contains no checked field values and is never logged | P1 | N | ? | ? | | FR / Evaluating |
| FR-018a | Every form connection has a main branch using the existing pull URL | P2 | Y | Rules step; Details | default | CLAR 2026-10-24 | FR / Branches |
| FR-018b | Pre-feature form connections get a rule-less main branch and keep their URLs | P1 | N | ? | ? | | FR / Branches |
| FR-019a | Team members can add branches, starting empty or based on the main branch | P2 | Y | Rules step | default | | FR / Branches |
| FR-019b | A branch cannot be based on any branch other than main | P2 | Y | Rules step | disabled | | FR / Branches |
| FR-019c | All branches share the connection's documents and fields; only rules differ | P2 | N | ? | ? | | FR / Branches |
| FR-019d | Branches can be added from the start of the rules step, before main has any rule | P2 | Y | Rules step | empty | NEW, COPY "+ Add variant", CLAR 2026-10-24 | FR / Branches |
| FR-020a | Branch names are unique within the form connection | P2 | Y | Rules step | error | | FR / Branches |
| FR-020b | Every branch, main included, can be renamed and have its description changed via its tab menu | P2 | Y | Rules step | default | CLAR 2026-10-24 | FR / Branches |
| FR-020c | Every branch except main can be deleted after a confirmation dialog | P2 | Y | Rules step | default | CLAR 2026-10-24 | FR / Branches |
| FR-020d | Missing or duplicate branch name may be refused where entered; FR-006 still applies | P2 | Y | Rules step | error | NEW, CLAR 2026-10-24 | FR / Branches |
| FR-020e | Optional branch description, main included, shown with its name in rules step, details and URLs after publishing; not delivered | P2 | Y | Rules step; Details; After publishing | default | NEW, CLAR 2026-10-24 | FR / Branches |
| FR-020f | Information button "(i)" right after the branch name on its tab, rules section heading and pull URL label | P2 | Y | Rules step; Details; After publishing | default | ADDED, COPY "(i)", CLAR 2026-10-24 | FR / Branches |
| FR-020g | The (i) shows the branch description in a tooltip, on hover and on keyboard focus | P2 | Y | Rules step; Details; After publishing | default | ADDED, A11Y, CLAR 2026-10-24 | FR / Branches |
| FR-020h | A branch without a description shows no (i) button | P2 | Y | Rules step; Details; After publishing | empty | ADDED, CLAR 2026-10-24 | FR / Branches |
| FR-020i | Add variant dialog has an optional description field with a helper text | P2 | Y | Add variant dialog | default | ADDED, COPY "Description - Optional", "Shown when someone hovers the (i) next to the variant name.", CLAR 2026-10-24 | Clarifications 2026-10-24; FR / Branches |
| FR-020j | Tab menu "Rename" opens "Edit variant": name and description fields, no "Start with"; every branch, main included | P2 | Y | Edit variant dialog | default | ADDED, COPY "Rename", "Edit variant", CLAR 2026-10-24 | Clarifications 2026-10-24; FR / Branches |
| FR-021a | Based branch starts with all main rules and groups, linked to them | P2 | Y | Rules step | default | | FR / Branches |
| FR-021b | Linked items follow every main-branch change, including removal | P2 | Y | Rules step | default | | FR / Branches |
| FR-021c | Rules and groups later added to main appear, linked, in every based branch | P2 | Y | Rules step | default | | FR / Branches |
| FR-021d | Top-level AND/OR counts as a group: follows main until switched in the branch | P2 | Y | Rules step | default | | FR / Branches |
| FR-022a | Item changed, removed or added in a based branch no longer follows main | P2 | Y | Rules step | default | | FR / Branches |
| FR-022b | Main changes never overwrite branch changes; main-removed but branch-changed item counts as added | P2 | Y | Rules step | default | CLAR 2026-10-24 (delete copy) | FR / Branches |
| FR-022c | Branch-formed group of inherited rules counts as added; rules inside follow main, unmarked, stay grouped | P2 | Y | Rules step | default | NEW, CLAR 2026-10-24 | FR / Branches |
| FR-022d | Duplicating a rule creates a new rule with new identifier; counts as added in based branch | P2 | Y | Rules step | default | NEW, CLAR 2026-10-24 | FR / Branches |
| FR-022e | Copy a rule to other branches: new, unlinked, new identifier, default name, end of top level | P2 | Y | Rules step | default | NEW, COPY "Copy to variant", CLAR 2026-10-24 | FR / Branches |
| FR-022f | Copy counts as added in based branch; copy to main appears linked in every based branch | P2 | Y | Rules step | default | NEW, CLAR 2026-10-24 | FR / Branches |
| FR-023a | Changed, removed and added items in based branch marked with a distinguishing colour | P2 | Y | Rules step; Details | default | | FR / Branches |
| FR-023b | Marks also carry text or symbol stating changed, removed or added; not colour alone | P2 | Y | Rules step; Details | default | A11Y, CLAR 2026-10-24 | FR / Branches |
| FR-023c | Removed items, including dissolved groups, stay visible in the branch, marked removed | P2 | Y | Rules step; Details | default | | FR / Branches |
| FR-024a | Team member can undo a branch's change or removal so the item follows main again | P2 | Y | Rules step | default | | FR / Branches |
| FR-024b | Undoing a group's removal also undoes removals of its rules and sub-groups | P2 | Y | Rules step | default | | FR / Branches |
| FR-024c | Item removed in a branch can only be restored there, not changed or deleted | P2 | Y | Rules step | disabled | NEW, CLAR 2026-10-24 | FR / Branches |
| FR-025a | A form connection keeps one trigger URL that starts requests for all branches | P2 | N | ? | ? | CLAR 2026-10-22 | FR / Branches |
| FR-025b | Each branch has its own pull URL | P2 | Y | After publishing; Details | default | CLAR 2026-10-22 | FR / Branches |
| FR-025c | Pull URLs of branches existing at trigger time return identical status and documents | P2 | N | ? | ? | | FR / Branches |
| FR-025d | Evaluation uses called branch's rules as they were when the request was triggered | P2 | N | ? | ? | | FR / Branches |
| FR-025e | Pull URL of a branch added after trigger answers an error, without status or documents | P2 | N | ? | ? | CLAR 2026-10-22 | FR / Branches |
| FR-025f | A branch's pull URL stays the same on rename or rule change | P2 | N | ? | ? | | FR / Branches |
| FR-025g | Non-main branch identified in pull URL by identifier fixed when added, never by name | P2 | N | ? | ? | NEW, CLAR 2026-10-24 | FR / Branches |
| FR-026a | After publishing and on details: trigger URL once, each branch's pull URL labelled with its name | P2 | Y | After publishing; Details | success | | FR / Branches |
| FR-026b | Each URL is copyable in one action | P2 | Y | After publishing; Details | default | | FR / Branches |
| FR-026c | Connection with only the main branch shows its URLs as before, without branch names | P1 | Y | After publishing; Details | default | CLAR 2026-10-24 | FR / Branches |
| FR-027a | Deleted branch's pull URL answers every call with "unavailable" | P2 | N | ? | ? | | FR / Branches |
| FR-027b | In-progress requests continue via trigger URL and other branches' pull URLs after a branch deletion | P2 | N | ? | ? | | FR / Branches |
| FR-027c | Deactivate, reactivate and delete of a connection apply to trigger URL and all branches | P2 | N | ? | ? | | FR / Branches |
| FR-028a | Rule and branch changes apply to requests triggered after save; no existing URL changes | P3 | N | ? | ? | | FR / Changing rules |
| FR-028b | In-progress request evaluated with each branch's rules as at trigger time | P3 | N | ? | ? | | FR / Changing rules |
| FR-028c | Publish/save stores documents, branches and rules together or not at all | P1 | N | ? | ? | NEW, CLAR 2026-10-24 | FR / Changing rules |
| FR-028d | After a publish/save failure nothing changed, and the team member can try again | P1 | Y | Publish/save dialog | error | NEW, CLAR 2026-10-24 | FR / Changing rules |
| FR-029 | Removing a document or deselecting a field used by rules names those rules and branches before saving | P3 | Y | Documents step | error | CLAR 2026-10-24 | FR / Changing rules |
| FR-030a | Details show every branch's rules, groups, AND/OR, marks and identifiers, read-only, one section per branch | P2 | Y | Details | default | CLAR 2026-10-24 | FR / Changing rules |
| FR-030b | Details lead to the rules step of the edit flow to change the rules | P3 | Y | Details | default | | FR / Changing rules |
| FR-030c | Edit flow asks for confirmation when saving, not on entry | P3 | Y | Rules step (edit); Publish/save dialog | default | NEW, CLAR 2026-10-24 | FR / Changing rules |
| FR-031 | Rules and branches visible and changeable only for signed-in DO.IT team members | P1 | Y | Rules step; Details | ? | role-dependent | FR / Changing rules |
| US1-AS1 | Three rules added in rules step and published are saved and shown on details | P1 | Y | Rules step; Details | success | | US1 AS1 |
| US1-AS2 | Field choice offers only requested fields, each with its kind's conditions ("includes one of"/"includes none of") | P1 | Y | Rules step – rule editor | default | COPY | US1 AS2 |
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
| US4-AS3 | Deselecting checked field or removing document names rules and branches; publish/save blocked while they remain | P3 | Y | Documents step | error | CLAR 2026-10-24 | US4 AS3 |
| EC-1 | Branch without rules always met, no message; includes pre-feature connections | P1 | N | ? | ? | | Edge Cases / No rules |
| EC-2 | Turning 21 on sharing day meets "at least" and "exactly 21 years old", not "less than" | P1 | N | ? | ? | | Edge Cases / Birthday on the day of sharing |
| EC-3 | 29 February dates reach next anniversary on 1 March in common years, incl. licence issue dates | P1 | N | ? | ? | | Edge Cases / Born on 29 February |
| EC-4 | Dates count by German calendar date at sharing, regardless of wallet/serviceBW time zone | P1 | N | ? | ? | | Edge Cases / Sharing around midnight |
| EC-5 | Unparseable value (year-only birth date, class without issue date): not met, couldn't be checked | P1 | N | ? | ? | | Edge Cases / Values that can't be checked |
| EC-6 | Rule on issue date of a class not held: reported not met, not couldn't-be-checked | P1 | N | ? | ? | | Edge Cases / A rule on a class the licence doesn't hold |
| EC-7 | Case-insensitive match incl. German letters (Ö, ß/SS); trimmed spaces; "contains" vs "is equal to" | P1 | N | ? | ? | | Edge Cases / Letter case and spaces |
| EC-8 | Several conditions on one field: enum takes several values; others need one rule each | P1 | Y | Rules step | default | | Edge Cases / Several conditions on one field |
| EC-9 | Single-rule group impossible; deleting one of two rules dissolves the group | P2 | Y | Rules step | default | | Edge Cases / Group with a single rule |
| EC-10 | Documents failing verification end "verification failed" without evaluation | P1 | N | ? | ? | | Edge Cases / Documents that fail verification |
| EC-11 | Main changes a rule the branch changed: branch keeps its version | P2 | Y | Rules step | default | | Edge Cases / Main changes a rule a branch changed |
| EC-12 | Main removes a rule the branch changed: branch version now counts as added | P2 | Y | Rules step | default | | Edge Cases / Main removes a rule a branch changed |
| EC-13 | Main removes a rule the branch removed: it disappears from the branch too | P2 | Y | Rules step | default | | Edge Cases / Main removes a rule a branch removed |
| EC-14 | Main adds a rule: appears following main in based branches, not in empty-started ones | P2 | Y | Rules step | default | | Edge Cases / Main adds a rule |
| EC-15 | Branch switching inherited group's AND/OR or message marks group changed; inner rules still follow | P2 | Y | Rules step | default | CLAR 2026-10-24 | Edge Cases / A branch changes an inherited group |
| EC-16 | Branch removing one rule of inherited two-rule group: dissolved there, group shown removed; undo restores | P2 | Y | Rules step | default | CLAR 2026-10-24 | Edge Cases / A branch removes one rule of an inherited group of two |
| EC-17 | Empty-started branch without rules is allowed; always counts as met | P2 | Y | Rules step | empty | | Edge Cases / A branch that started empty and has no rules |
| EC-18 | Renaming a branch keeps its pull URL | P2 | N | ? | ? | | Edge Cases / Branch renamed |
| EC-19 | Connection deactivated or deleted mid-request: request cancelled as "unavailable" | P2 | N | ? | ? | | Edge Cases / Form connection deactivated or deleted |
| EC-20 | Branch deleted mid-request: request continues; only that branch's pull URL answers "unavailable" | P2 | N | ? | ? | | Edge Cases / Branch deleted while a request is in progress |
| EC-21 | Rules changed mid-request: evaluated with rules at trigger time | P3 | N | ? | ? | | Edge Cases / Rules changed while a request is in progress |
| EC-22 | Branch added mid-request: its pull URL errors for that request, no status or documents | P2 | N | ? | ? | | Edge Cases / Branch added while a request is in progress |
| EC-23 | Applicant switching branch after sharing: other pull URL works only within 60-second repeat window | P2 | N | ? | ? | | Edge Cases / The applicant changes branch after sharing |
| EC-24 | Once documents are gone, the evaluation is gone too | P1 | N | ? | ? | | Edge Cases / Pulling after the documents are gone |
| EC-25 | Two team members editing rules concurrently: later save wins | P3 | N | ? | ? | | Edge Cases / Two team members editing |
| EC-26 | Shared 31 Jan: "at least 1 month from now" met from 1 March; past dates are "less than" | P1 | N | ? | ? | NEW | Edge Cases / Months from now at the end of a month |
| EC-27 | Branch groups inherited rules: group marked added; main removals shrink/dissolve it; main regrouping doesn't move them | P2 | Y | Rules step | default | NEW, CLAR 2026-10-24 | Edge Cases / A branch groups inherited rules |
| EC-28 | Rule rename keeps identifier; main rename clashing with a based branch's name refused, naming that branch | P2 | Y | Rules step | error | NEW, CLAR 2026-10-24 | Edge Cases / Rule renamed |
| ENT-Rule.document | Document the rule checks | P1 | Y | Rules step | default | | Key Entities |
| ENT-Rule.field | Requested field, or part of a field, the rule checks | P1 | Y | Rules step | default | | Key Entities |
| ENT-Rule.condition | Condition with its value(s), e.g. "is at least 21 years old" | P1 | Y | Rules step | default | | Key Entities |
| ENT-Rule.error_message | Error message for the citizen | P1 | Y | Rules step | default | | Key Entities |
| ENT-Rule.identifier | Identifier for serviceBW, fixed at creation (FR-010) | P1 | Y | Details | default | NEW | Key Entities |
| ENT-Rule.name | Team name, unique within its branch (FR-005) | P1 | Y | Rules step; Details | default | NEW | Key Entities |
| ENT-Rule.branch | Branch the rule belongs to | P2 | Y | Rules step | default | | Key Entities |
| ENT-Rule.parent | Position: top level, inside a group, or inside a sub-group | P2 | Y | Rules step | default | | Key Entities |
| ENT-Group.members | Two or more rules or sub-groups | P2 | Y | Rules step | default | | Key Entities |
| ENT-Group.operator | AND or OR | P2 | Y | Rules step | default | | Key Entities |
| ENT-Group.error_message | Optional own error message | P2 | Y | Rules step | default | | Key Entities |
| ENT-Group.identifier | Identifier like a rule's | P2 | Y | Details | default | NEW | Key Entities |
| ENT-Group.name | Team name like a rule's | P2 | Y | Rules step; Details | default | NEW | Key Entities |
| ENT-Sub-group.members | Two or more rules; no further groups | P2 | Y | Rules step | default | | Key Entities |
| ENT-Sub-group.operator | AND or OR | P2 | Y | Rules step | default | | Key Entities |
| ENT-Sub-group.error_message | Optional own error message | P2 | Y | Rules step | default | | Key Entities |
| ENT-Sub-group.identifier | Identifier like a rule's | P2 | Y | Details | default | NEW | Key Entities |
| ENT-Sub-group.name | Team name like a rule's | P2 | Y | Rules step; Details | default | NEW | Key Entities |
| ENT-Branch.name | Name unique within the form connection | P2 | Y | Rules step; Details | default | | Key Entities |
| ENT-Branch.description | Optional description, shown in a tooltip next to its name; not delivered to serviceBW | P2 | Y | Rules step; Details; After publishing | default | NEW, CLAR 2026-10-24 | Key Entities |
| ENT-Branch.rules | Set of rules, groups and sub-groups | P2 | Y | Rules step; Details | default | | Key Entities |
| ENT-Branch.operator | Top-level AND or OR | P2 | Y | Rules step | default | | Key Entities |
| ENT-Branch.pull_url | Own pull URL; main branch uses the original one | P2 | Y | After publishing; Details | default | | Key Entities |
| ENT-Branch.origin | Main, based on main, or started empty | P2 | Y | Rules step | default | | Key Entities |
| ENT-Branch Change.item | Rule or group differing from main in a based branch | P2 | Y | Rules step; Details | default | | Key Entities |
| ENT-Branch Change.kind | Changed, removed or added | P2 | Y | Rules step; Details | default | | Key Entities |
| ENT-Branch Change.undoable | Changes and removals can be undone | P2 | Y | Rules step | default | | Key Entities |
| ENT-Branch Change.dissolved_group | Group left with fewer than two by branch removals counts as removed | P2 | Y | Rules step; Details | default | NEW | Key Entities |
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
| OUT-15 | Field-specific conditions or wording, other than the Date of birth's age wording | FR-003; Clarifications 2026-10-24 |
| OUT-16 | Wallet-side evaluation of conditions (e.g. "age over 21" attributes) | Assumptions / Where rules are evaluated |
| OUT-17 | Middleware judging whether a rule is lawful or appropriate | Assumptions / Lawful rules |
| OUT-18 | Going live on a scheduled date ("On a date", "Scheduled" status) | Clarifications 2026-10-24; Assumptions / Out of scope |
| OUT-19 | Activity log of who changed what | Clarifications 2026-10-24; Assumptions / Out of scope |
| OUT-20 | PDF export of a form connection | Clarifications 2026-10-24; Assumptions / Out of scope |
| OUT-21 | Warnings about rules that contradict or repeat each other | Assumptions / Out of scope |
| OUT-22 | Published page counters and "Live since" | Clarifications 2026-10-24 |
| OUT-23 | Drafts, "Save and exit" and the wizard's draft badge | Clarifications 2026-10-24 |
| OUT-24 | Wizard shell's draft badge, "Save and exit", sticky bars; documents step redesign; rule editor aids other than FR-002e–h, FR-003o/p | Clarifications 2026-10-24 (aids answer superseded in part) |
| OUT-25 | Date condition "is at most"; months unit on years-ago conditions | Clarifications 2026-10-24 |
| OUT-26 | Number conditions "at least", "at most", "between" (a range takes two rules) | Clarifications 2026-10-24 |
| OUT-27 | Text condition "starts with"; text conditions with several values; always-ignore-case text | Clarifications 2026-10-24 |
| OUT-28 | Composite licence checks ("has held class B for…", "has class B valid on…") | Clarifications 2026-10-24 |
| OUT-29 | Class expiry falling back to the licence's expiry date; BE/C/D counting as B | Clarifications 2026-10-24 |
| OUT-30 | Driving licence "Age over 18" field (not in catalog) | Clarifications 2026-10-24; Assumptions / Where rules are evaluated |
| OUT-31 | Empty or single-rule groups (design frames for them don't apply) | Clarifications 2026-10-24; FR-008 |
| OUT-32 | Non-blocking "warnings"/"Problems" section in the publish dialog, until specified | Clarifications 2026-10-24 |
| OUT-33 | Confirmation on entering edit of a live connection ("Edit this live connection?") | Clarifications 2026-10-24; FR-030 |
| OUT-34 | Saving or publishing while rules check removed documents/fields | Clarifications 2026-10-24; FR-006, FR-029 |

## Glossary
form connection = connection, use case (V1 wording)
rules step = Rules, Conditions, Rules & conditions, Eligibility
rule editor = rule card, edit rule, rule panel, Save rule / Cancel
rule = condition, check, requirement, criterion, Rule 01
condition = operator, comparison, criteria
rule name = name, label, Rule 01, Rule 07
identifier = ID, rule ID, key, result key
group = rule group, group of rules, condition group, Group 01
sub-group = subgroup, nested group, inner group, Sub-group 01
AND / OR = all / any, match all / match any, all of / any of, combinator, logic toggle
branch = variant, scenario, rule set, path, version
main branch = main, default, base, primary, standard
branch description = description, subtitle, variant description, Description - Optional
information button = (i), info icon, info button, tooltip, description tooltip
based on the main branch = inherited, linked, follows main, copy of main
started empty = blank, empty branch, from scratch, start fresh
add branch = + Add variant, new variant, Add variant dialog, Start with
rename / delete branch = tab menu, variant menu, rename variant, delete variant, Rename, Edit variant
changed (in branch) = modified, edited, overridden, customised
removed (in branch) = deleted, excluded, struck through
added (in branch) = new, branch-only
undo = revert, reset, restore, follow main again
duplicate rule = duplicate, copy rule
copy to other branches = Copy to variant, copy to
error message = message, message for citizen, error text, failure message, hint, group message
letter case = case sensitive, match case, ignore case, Aa
is at least {years} old = at least N years old, minimum age, older than, ≥
is less than {years} old = younger than, under, <
is at least {years} ago = at least N years ago, held for, ≥
is at least / less than {n} from now = time left, valid for, expires in, months from now, left
whole number of at least 1 = Enter a number greater than 0., invalid number
includes one of / includes none of = includes, doesn't include, one of, none of, any of, is in, is not in
counted from the day the applicant shares = day of sharing, Today (…) this means
couldn't be checked = can't be read, missing, not checkable
unsaved changes = Save changes to Rule 01?, keep, discard
data menu = choose data, data picker, field menu, Need other data? Add it in Documents
menu search = Search Personal ID, Search Driving licence, Search classes, Search options, No options match, search field, filter
part picker = choose part, value with parts, part menu
licence class description = class description, B Cars up to 3.5 t
menu footer = Lists the documents you added, Only documents you request are listed., Select at least one option.
trigger URL = start URL, request link, trigger link
pull URL = result URL, fetch URL, poll URL, pull link, .../result/…
copy (one action) = copy button, copy to clipboard, copy icon, Copied
details = connection details, overview, summary, connection page, published page
after publishing = published, success screen, connection created
publish/save dialog = publish confirmation, Publish, Save, publishing, try again
publish without rules = skip rules, Publish without rules
documents step = documents, select documents, fields, data
publish = create connection, finish, done, save
Personal ID = ID, PID, identity card, Personalausweis
Driving licence = driving license, driver's licence, mDL, Führerschein
Licence classes = license classes, vehicle categories, driving categories, classes
Licence class B – Issue date = class B issue date, held since
Date of birth = birth date, birthdate, DOB, age
Place of birth = birthplace, birth place
City or town = city, locality, town
Nationality = citizenship
team member = user, DO.IT team member, admin
citizen = applicant, user (of the form)
evaluation = result, rule result, outcome, rules met
unavailable = deactivated, deleted, no longer available
