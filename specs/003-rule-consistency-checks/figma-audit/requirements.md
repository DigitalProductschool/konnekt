# Requirements index — spec.md mtime 2026-10-28 15:53:58 +0000 (1793202838)

| ID | Requirement (≤ 20 words) | Prio | UI | Surface | State | Flags | Spec § |
|----|--------------------------|------|----|---------|-------|-------|--------|
| FR-001a | Check every branch's rules for conflicts and redundancy at top level, groups and sub-groups, with AND/OR | — | N | ? | ? | | FR / What is checked |
| FR-001b | Check each branch on its own as evaluated: inherited, changed, added rules; removed excluded; dissolved group as remaining member | — | N | ? | ? | | FR / What is checked |
| FR-001c | Branches are never compared with each other | — | N | ? | ? | | FR / What is checked |
| FR-002a | Check every rule with complete condition on requested data, with or without error message | — | N | ? | ? | | FR / What is checked |
| FR-002b | Leave out incomplete rules or rules on no longer requested data; rules step shows their problem as before | — | Y | Rules step | error | | FR / What is checked |
| FR-002c | Unsaved changes in an open rule editor aren't checked; new rule counts once added | — | N | Rule editor | ? | | FR / What is checked |
| FR-002d | Rule editor shows nothing about findings; a new rule is checked once added | — | Y | Rule editor | default | clarified 2026-10-28 | FR / What is checked |
| FR-003a | Rule or group is conflicting when unmeetable alone, or unmeetable together with items combined by AND | — | N | ? | ? | | FR / Conflicts |
| FR-003b | Says why: smallest conflicting set; unmeetable group marked too, "Rule 04 and Rule 05 in this group can't be met together."; rule's condition | — | Y | Rules step – finding explanation | error | clarified 2026-10-28 | FR / Conflicts |
| FR-003c | Item not conflicting only because something combined with it is unmeetable on its own | — | N | ? | ? | | FR / Conflicts |
| FR-004 | When no applicant can meet the top level, branch notice "No applicant can meet the rules of Ambulance." | — | Y | Rules step – branch summary | error | | FR / Conflicts |
| FR-005a | Item is redundant when deleting it changes no applicant's outcome on any sharing day from today | — | N | ? | ? | | FR / Redundancy |
| FR-005b | Says why: "Same as Rule 03…"; AND: "Anyone who meets Rule 02 also meets this rule…"; OR: "…also meets Rule 01…" | — | Y | Rules step – finding explanation | default | clarified 2026-10-28 | FR / Redundancy |
| FR-005c | Redundant or always-met group is reported; rules and sub-groups inside it are not | — | Y | Rules step – rule/group mark | default | | FR / Redundancy |
| FR-005d | Of items redundant only because of each other, only the later in display order is reported | — | Y | Rules step – rule/group mark | default | | FR / Redundancy |
| FR-005e | No redundancy reported in an unmeetable branch, nor for conflicting items or anything inside them | — | Y | Rules step – rule/group mark | default | | FR / Redundancy |
| FR-006a | Item every applicant meets every day from today: "Always met. Every applicant meets this rule/group.", not redundant, also in OR | — | Y | Rules step – rule/group mark | default | clarified 2026-10-28 | FR / Redundancy |
| FR-006b | Always met isn't reported where FR-005 rules out redundancy | — | Y | Rules step – rule/group mark | default | | FR / Redundancy |
| FR-006c | When every applicant meets the top level and the branch has checked rules: "Every applicant meets the rules of Standard." | — | Y | Rules step – branch summary | default | | FR / Redundancy |
| FR-007a | Checks judge every condition as the evaluation does; no finding contradicts an evaluation | — | N | ? | ? | | FR / How the checks judge |
| FR-007b | Text compared with/without letter case per rule, German letters and accents as evaluation, trimmed | — | N | ? | ? | | FR / How the checks judge |
| FR-007c | Years and months counted as spec 002 FR-012; "is before"/"is after" exclude the date | — | N | ? | ? | | FR / How the checks judge |
| FR-007d | Enum values from set; PID Nationality and Licence classes multi-valued; other enums and birthplace country single | — | N | ? | ? | | FR / How the checks judge |
| FR-007e | Number fields hold whole numbers | — | N | ? | ? | | FR / How the checks judge |
| FR-007f | Rule on a licence class's issue or expiry date implies "Licence classes includes one of" that class | — | N | ? | ? | | FR / How the checks judge |
| FR-007g | Otherwise every field and part is independent, even fields describing the same fact | — | N | ? | ? | | FR / How the checks judge |
| FR-008a | Day-dependent conflicts, including unmeetable branch, judged for sharing today by Germany's calendar date | — | N | ? | ? | | FR / How the checks judge |
| FR-008b | Day-dependent conflict: "…by applicants who share today."; branch: "No applicant who shares today can meet the rules of Standard." | — | Y | Rules step – finding explanation; branch summary | error | clarified 2026-10-28 | FR / How the checks judge |
| FR-008c | Redundant, always-met items and all-meet branch reported only when true on every day from today | — | N | ? | ? | | FR / How the checks judge |
| FR-009 | Checks consider applicants giving every checked value; missing values only make rules fail | — | N | ? | ? | | FR / How the checks judge |
| FR-010a | Every finding must be true by FR-007 to FR-009 | — | N | ? | ? | | FR / How the checks judge |
| FR-010b | Checks find every conflicting, redundant and always-met item of the checked rules | — | N | ? | ? | | FR / How the checks judge |
| FR-010c | Past 5 s: "…couldn't be checked completely. Only findings that are certain are shown."; info alert alone if none; tab too | — | Y | Rules step – branch summary; branch tab | error | clarified 2026-10-28 | FR / How the checks judge |
| FR-010d | Editing, publishing and saving never wait for the checks | — | N | ? | ? | performance | FR / How the checks judge |
| FR-011a | Checks run when rules step opens, in create and edit flow | — | N | Rules step | ? | | FR / When the checks run |
| FR-011b | Checks rerun after every rule, group, AND/OR, branch or inherited change, unasked | — | N | Rules step | ? | | FR / When the checks run |
| FR-011c | Documents step change leaving rules on unrequested data updates findings | — | N | Documents step | ? | | FR / When the checks run |
| FR-011d | Findings name rules and groups by their current names | — | Y | Rules step – finding explanation | default | | FR / When the checks run |
| FR-012a | Each rule/group with a finding carries a mark: conflicting, redundant or always met; not colour alone | — | Y | Rules step – rule/group mark | default | no Figma design (KERN) | FR / Showing the findings |
| FR-012b | Finding marks distinguishable from spec 002 branch marks, which may appear on the same item | — | Y | Rules step – rule/group mark | default | no Figma design (KERN) | FR / Showing the findings |
| FR-012c | Distinct from spec 002 problems: conflicts KERN warning colour and icon, others KERN info colour and icon; problems stay red | — | Y | Rules step – rule/group mark | default | clarified 2026-10-28 (Figma uses problem look) | FR / Showing the findings |
| FR-012d | Explanation from the mark starts with kind ("Conflicting.", "Redundant.", "Always met.") and names items, e.g. "Can't be met together with Rule 02." | — | Y | Rules step – finding explanation | default | clarified 2026-10-28 | FR / Showing the findings |
| FR-012e | Group finding: outline round the group and note under its header; rules inside plain unless they have their own finding | — | Y | Rules step – rule/group mark | default | clarified 2026-10-28; built without frames | Clarifications; FR-003, FR-005 |
| FR-013a | Summary above the shown branch's rules: count per kind plus FR-004 or FR-006 notice | — | Y | Rules step – branch summary | default | no Figma design (KERN) | FR / Showing the findings |
| FR-013b | Summary's "Go to next finding" (KERN tertiary) scrolls next rule/group with finding into view, focuses it, cycles | — | Y | Rules step – branch summary | default | clarified 2026-10-28; button not in Figma alerts | FR / Showing the findings |
| FR-013c | Summary is a KERN warning alert when the branch has a conflict, KERN info alert otherwise; "There's also …" after conflicts | — | Y | Rules step – branch summary | default | clarified 2026-10-28 | Clarifications; FR-013 |
| FR-013d | "Go to next finding" left out when no rule or group has a finding; visits only certain findings | — | Y | Rules step – branch summary | default | clarified 2026-10-28; built without frames | Clarifications; FR-013 |
| FR-014a | Each tab, selected or not, shows an icon without number: KERN warning icon with a conflict, info icon otherwise | — | Y | Rules step – branch tab | default | clarified 2026-10-28; Figma U03 `6171:7542` | FR / Showing the findings |
| FR-014b | Tab's findings indication has a text alternative | — | Y | Rules step – branch tab | default | | FR / Showing the findings |
| FR-015 | Each changed finding announced in a polite status region without moving focus: appearing, gone ("no longer …"), FR-004/FR-006 notices | — | Y | Rules step | ? | clarified 2026-10-28; built without frames | FR / Showing the findings |
| FR-016a | Findings never refuse, delay or add a step to publish/save, nor disable any action | — | Y | Publish/save dialog | default | | FR / Publishing and saving |
| FR-016b | Connection with findings, including unmeetable branch, is published and saved like any other | — | N | ? | ? | | FR / Publishing and saving |
| FR-016c | "Publish" and "Save" stay enabled while anything conflicts, unless a spec 002 FR-006 problem refuses them | — | Y | Rules step – footer; Publish/save dialog | default | clarified 2026-10-28 (Figma disables Publish) | FR / Publishing and saving |
| FR-016d | No finding is worded as something "to fix" | — | Y | Rules step – branch summary; Publish/save dialog | default | clarified 2026-10-28 | FR / Publishing and saving |
| FR-017a | Dialog lists branches with findings below warnings line, one per branch in tab order: "Ambulance: 2 conflicting rules, 1 redundant rule" | — | Y | Publish/save dialog | default | base: U33 `6376:26181` warnings line; built without frames | FR / Publishing and saving |
| FR-017b | Dialog says, for an unmeetable branch, that no applicant can meet its rules | — | Y | Publish/save dialog | error | | FR / Publishing and saving |
| FR-017c | Without findings, dialog shows nothing about them | — | Y | Publish/save dialog | empty | | FR / Publishing and saving |
| FR-017d | Dialog's "Check rules again" (KERN secondary) opens rules step on first branch in tab order with findings | — | Y | Publish/save dialog | default | | FR / Publishing and saving |
| FR-018 | Findings never delivered to serviceBW and never change the evaluation or other spec 002 deliveries | — | N | ? | ? | | FR / Publishing and saving |
| FR-019a | Finding stays shown while its cause remains; team members can't dismiss it | — | Y | Rules step | default | clarified 2026-10-28 | FR / Publishing and saving |
| FR-019b | Nothing about findings is stored | — | N | ? | ? | clarified 2026-10-28 | FR / Publishing and saving |
| FR-019c | Redundant, always-met items and all-meet branch shown less prominently than conflicts, in rules step and dialog | — | Y | Rules step; Publish/save dialog | default | clarified 2026-10-28 | FR / Publishing and saving |
| FR-020 | Findings visible only to signed-in DO.IT team members, and only in rules step and publish/save dialog | — | Y | Rules step; Publish/save dialog | default | role visibility | FR / Publishing and saving |
| US1-AS1 | Adding AND rule "Nationality Italy" beside "Germany" (driving licence): both marked conflicting, naming each other; branch notice | P1 | Y | Rules step | error | | US1 |
| US1-AS2 | Switching those rules' level to OR removes marks and notice | P1 | Y | Rules step | default | | US1 |
| US1-AS3 | AND group "age > 30" and "age < 20": rules and group marked; branch notice; same for sub-group | P1 | Y | Rules step | error | | US1 |
| US1-AS4 | Same group under OR top level with another rule: group and rules marked, no branch notice | P1 | Y | Rules step | error | | US1 |
| US1-AS5 | Rule inside OR group conflicting with AND sibling marked; sibling, group, other rule unmarked; no notice | P1 | Y | Rules step | error | | US1 |
| US1-AS6 | Editing, deleting, ungrouping or undoing updates marks at once, unasked | P1 | Y | Rules step | default | | US1 |
| US1-AS7 | Unmeetable branch still publishes or saves; serviceBW gets "rules not met" for every applicant | P1 | Y | Publish/save dialog | success | | US1 |
| US2-AS1 | AND level "age > 10" and "age > 11": Rule 01 marked redundant naming Rule 02 | P2 | Y | Rules step | default | | US2 |
| US2-AS2 | Same rules under OR: Rule 02 marked redundant naming Rule 01 | P2 | Y | Rules step | default | | US2 |
| US2-AS3 | Duplicated rule's copy marked same check; mark disappears when copy's value changes, unless still redundant | P2 | Y | Rules step | default | | US2 |
| US2-AS4 | AND "Licence classes includes B" redundant beside "Licence class B – Issue date at least 2 years ago" | P2 | Y | Rules step | default | | US2 |
| US2-AS5 | OR group "age > 18" or "age < 21" marked met by every applicant | P2 | Y | Rules step | default | | US2 |
| US2-AS6 | OR group implied by AND sibling rule marked redundant naming it; its rules unmarked | P2 | Y | Rules step | default | | US2 |
| US2-AS7 | Deleting every redundant item leaves every complete applicant's outcome unchanged | P2 | N | ? | ? | | US2 |
| US3-AS1 | Main-branch change causing conflict in "Ambulance": its tab shows findings, rules marked there; Standard unaffected | P2 | Y | Rules step – branch tab | error | | US3 |
| US3-AS2 | Rule removed in "Ambulance" isn't checked there and its findings vanish; restored, checked again | P2 | Y | Rules step | default | | US3 |
| US3-AS3 | Rules added to a branch that started empty are checked without the main branch's rules | P2 | N | ? | ? | | US3 |
| US3-AS4 | Main-branch conflict among rules inherited unchanged shows in both branches | P2 | Y | Rules step | error | | US3 |
| US3-AS5 | Rule with branch mark "Changed here" and a finding shows both, distinguishable | P2 | Y | Rules step – rule/group mark | default | | US3 |
| US4-AS1 | Dialog names both branches with findings, counts per kind; "Publish" or "Save" available | P3 | Y | Publish/save dialog | default | | US4 |
| US4-AS2 | Dialog says, for an unmeetable branch, that no applicant can meet its rules | P3 | Y | Publish/save dialog | error | | US4 |
| US4-AS3 | "Check rules again" opens rules step on first branch in tab order with findings | P3 | Y | Publish/save dialog | default | | US4 |
| US4-AS4 | Without findings, dialog shows nothing about them, as before | P3 | Y | Publish/save dialog | empty | | US4 |
| US4-AS5 | With findings, publish or save goes ahead without a further question | P3 | Y | Publish/save dialog | success | | US4 |
| EC-1 | Multi-value fields (PID Nationality, Licence classes): "includes one of" different values don't conflict | — | N | ? | ? | | Edge Cases |
| EC-2 | Letter case: case-insensitive equal values same check; case-sensitive ones conflict; German letters as evaluation | — | N | ? | ? | | Edge Cases |
| EC-3 | Text inside text: "equal Stuttgart" conflicts with "doesn't contain gart", makes "contains Stutt" redundant | — | N | ? | ? | | Edge Cases |
| EC-4 | Whole numbers: "age > 20" AND "age < 21" conflict | — | N | ? | ? | | Edge Cases |
| EC-5 | Adjacent dates: "before 1 Jan 2030" AND "after 31 Dec 2029" conflict | — | N | ? | ? | | Edge Cases |
| EC-6 | 12 months equals 1 year; "exactly 21 years old" makes "at least 18" redundant under AND | — | N | ? | ? | | Edge Cases |
| EC-7 | Fixed date vs age conflicts today, finding says it applies today; not-yet-redundant date rules not reported | — | Y | Rules step – finding explanation | error | | Edge Cases |
| EC-8 | Enum "includes none of" every value never met; "includes one of" every value always met | — | N | ? | ? | | Edge Cases |
| EC-9 | Duplicate marked redundant until changed; rule copied to another branch checked with that branch | — | Y | Rules step – rule/group mark | default | | Edge Cases |
| EC-10 | Of two same-check rules, only the later shown is marked | — | Y | Rules step – rule/group mark | default | | Edge Cases |
| EC-11 | Four-rule conflict unmeetable only together: each marked, naming the other three | — | Y | Rules step – rule/group mark | error | | Edge Cases |
| EC-12 | Removed rules/groups not checked; dissolved group checked as its remaining member | — | N | ? | ? | | Edge Cases |
| EC-13 | Rule with a problem left out until fixed: problem shown as before, no finding, not counted in summary; message-less rule checked | — | Y | Rules step | error | clarified 2026-10-28 | Edge Cases |
| EC-14 | Open editor's unsaved changes not checked; new rule counts once added | — | N | Rule editor | ? | | Edge Cases |
| EC-15 | Branch without rules, or all removed: no findings, rules step as spec 002 with no summary, notice or tab indication | — | Y | Rules step – branch summary; branch tab | empty | clarified 2026-10-28 | Edge Cases |
| EC-16 | Missing or unreadable values never met, can't satisfy conflicting rules | — | N | ? | ? | | Edge Cases |
| EC-17 | Fields describing same fact checked separately; cross-document contradictions not reported | — | N | ? | ? | | Edge Cases |
| EC-18 | Unlikely values (future birth date, age 200) not reported | — | N | ? | ? | | Edge Cases |
| EC-19 | Checks too long: "couldn't be checked completely", only certain findings, nothing held up | — | Y | Rules step – branch summary | error | | Edge Cases |
| EC-20 | Unmeetable branch reports only conflicts; redundant items marked once conflict resolved | — | Y | Rules step – rule/group mark | error | | Edge Cases |
| EC-21 | Rules published before this feature checked when edit flow's rules step opens; serviceBW unchanged | — | Y | Rules step | default | | Edge Cases |
| ENT-CheckedRules.scope | Rules and groups the evaluation would use, less incomplete or unrequested-data rules | — | N | ? | ? | | Key Entities |
| ENT-RuleCheck.trigger | Made when rules step opens and after every change | — | N | ? | ? | | Key Entities |
| ENT-RuleCheck.effects | Changes no rule; nothing delivered to serviceBW | — | N | ? | ? | | Key Entities |
| ENT-Finding.target | On a rule, a group, or a branch | — | Y | Rules step | ? | | Key Entities |
| ENT-Finding.kind | Item finding: conflicting, redundant or always met | — | Y | Rules step – rule/group mark | ? | | Key Entities |
| ENT-Finding.reason | Rules and groups named as the reason | — | Y | Rules step – finding explanation | ? | | Key Entities |
| ENT-Finding.branchKind | Branch finding: no applicant can meet its rules, or every applicant does | — | Y | Rules step – branch summary | ? | | Key Entities |
| ENT-Finding.appliesToday | Day-dependent finding says it applies today | — | Y | Rules step – finding explanation | ? | | Key Entities |

## Exclusions
| OUT-ID | Excluded behaviour | Spec § |
|--------|--------------------|--------|
| OUT-1 | Showing findings on a form connection's details or in the overview | Assumptions – Out of scope |
| OUT-2 | Comparing branches with each other (e.g. two branches with the same rules) | Assumptions – Out of scope; FR-001 |
| OUT-3 | Relations between different fields or documents | Assumptions – Out of scope; FR-007 |
| OUT-4 | Judging whether values are likely (plausibility) | Assumptions – Out of scope, Logic not plausibility |
| OUT-5 | Fixing findings automatically, e.g. deleting a redundant rule in one action | Assumptions – Out of scope |
| OUT-6 | Warning ahead of a conflict that only arises on a later day of sharing | Assumptions – Out of scope; FR-008 |
| OUT-7 | Dismissing a finding, or storing anything about findings | Clarifications 2026-10-28; FR-019 |
| OUT-8 | Any hint about findings in the rule editor (conflict or redundancy before the rule is added) | Clarifications 2026-10-28; FR-002 |

## Glossary
branch = variant, tab, Standard, Ambulance, BranchName
main branch = Standard, main variant
form connection = connection
rules step = Rules, Rules step, rules card, step 3
rule = Rule 01, rule row, RuleRow, condition
group = group, sub-group, Group 01, Sub-group 01, GroupFrame, nested group, group header
AND / OR = all of, any of, connector, Connector, level
finding = warning, issue, hint, check result, notice, suggestion, problem
conflicting = conflict, Conflicting., can't be met, can't be met together, contradiction, unsatisfiable, Problem, blocks
redundant = Redundant., makes no difference, duplicate, same check, Same as, repeats, unnecessary, suggestion
always met = Always met., met by every applicant, always true, makes no difference
branch notice (FR-004) = "No applicant can meet the rules of …", "No applicant who shares today can meet …", unmeetable, impossible
branch notice (FR-006) = "Every applicant meets the rules of …"
findings summary = summary, summary alert, slim alert, banner, alert, notice, warnings count
Go to next finding = next finding, jump to finding, go to, link to rule, tertiary button in alert
finding mark = badge, tag, chip, icon, warning icon, info icon, note, Rules/Problem note, outline, "Problem" outline, Suggestion
finding explanation = tooltip, popover, details, reason, note
tab indicator = tab icon, findings icon, "Standard has findings"
branch mark = BranchMark, "Changed here", "New", "New addition", variant mark, Variant outline, changed, new
problem (spec 002 FR-006) = error, incomplete rule, missing data, Rules/Problem note (red)
status region = live region, announcement, aria-live
publish/save dialog = publish dialog, save dialog, Publish, Save, summary, "1 warning on Ambulance" (U33 `6376:26181`)
footer = action bar, Publish button, Continue
Check rules again = review rules, back to rules, go to rules
team member = DO.IT team member, user
applicant = citizen
couldn't be checked completely = check incomplete, timeout, partial check
