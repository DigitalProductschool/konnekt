# Figma ↔ spec audit — 2026-10-23

Spec: `specs/002-connection-rules/spec.md` · Figma file `s8mU9oJDq3411e8bxMjQO9`, root 6263:12360 · Glossary: variant = branch, "Standard" = main branch, "Request link" = trigger URL, "Result link" = pull URL.

## Summary
Units audited 32/39 (OUT 7, UNCERTAIN 0, FAILED 0). Figma calls 121 (120 in the unit audits, 1 by the mapper; 0 for this merge).

| category | count |
|---|---|
| CONFLICT | 10 |
| SPEC-ONLY (not in Figma) | 8 items (10 req-ids) |
| FIGMA-ONLY behavioural | 19 |
| PARTIAL | 21 |
| FIGMA-ONLY cosmetic | 7 |
| Clarify questions | 27 |

Coverage of the 107 requirements with `UI = Y`: COVERED 63, PARTIAL 19, CONFLICT 15, SPEC-ONLY 10.

The units listed 317 "missing here" rows in total (U12 64, U21 49, U17 43, U20 39). Each unit counted every Rules-step requirement it didn't show. I checked those rows against the COVERED and PARTIAL rows of all other units. Only 10 req-ids are covered or partial in no unit, and only those are listed as spec-only.

Top 5 issues:
1. **Date conditions don't match FR-003f / OUT-15** (C1–C3). About 20 units word the years conditions as "at least N years old" with a ≥ chip. They add "at most" (≤), "Time left" and a months unit, and leave out "is exactly N years ago" and "is (a date)".
2. **Licence classes use field-specific checks** (C4, C5). The design checks "has held class B for at least 2 years" and "has class B valid on the day of sharing" instead of the per-class parts "Licence class B – Issue date / – Expiry date" with generic date conditions. It also falls back to the licence's expiry date, which no requirement mentions.
3. **Text and number conditions are a different set** (C6–C8). Text offers is / is not / starts with, not contains / doesn't contain, and has no letter-case choice (FR-013a). Number offers at least / at most / between, not greater / less / equal / not equal. Text and number conditions take several values, which the CLAR 2026-10-23 rule (FR-002c) allows only for enum conditions.
4. **Groups with fewer than two members don't dissolve** (C9, C10). This contradicts FR-008e / FR-008f, US2-AS7, EC-9 and EC-16 in U14, U23, U27 and U28.
5. **Branch management and main-vs-branch cases aren't designed** (S2–S7): rename, delete with confirmation, unique names, FR-022b, EC-11, EC-13 and the empty branch. Also missing: the P1 view that shows a main-only connection's URLs "as before" (FR-026c, S1).

## Conflicts
| # | req | Figma (unit, node-id) | conflict |
|---|---|---|---|
| C1 | FR-003f, FR-003a, FR-005, OUT-15 | Editor: U11 6348:40749–40752, U25 6196:10397–10400, U26 6196:10579–10584, U28 6197:10974; hidden "old" suffix U30 6324:15427, U32 6324:17644. Saved rows: U11 6348:40889, U12 6350:41102, U14 6094:6469, U15 6344:53330, U16 6344:53519, U17 6134:8524/8544, U18 6163:4862, U19 6344:53713, U20 6344:53890, U21 6168:7017, U23 6185:8567, U27 6197:11416, U28 6197:11073/11090, U33 6376:25788, U34 6383:66110. Details: U37 6396:48228 | The spec (COPY, CLAR 2026-10-23) words this condition the same for every date field: "Personal ID – Date of birth is at least 21 years ago". The design says "Personal ID · Date of birth ≥ at least 21 years old". That is age-specific wording, the "minimum age" kind of condition OUT-15 excludes, and it wouldn't fit an issue date. Only one frame, U35 6376:26339, already reads "at least 21 years ago", so the design isn't consistent either |
| C2 | FR-003f, FR-003a, FR-012c | U11 6348:40681 (check menu with the headings "Age" (at least ≥, at most ≤) and "Date of birth" (before, after)); U30 6324:15613 ("Time passed" at least/at most, "Fixed date" before/after) | Spec: is before / is after / is (a date) / is at least / is less than / is exactly N years ago. The design's "at most" is inclusive, while "is less than" is exclusive, so the boundary differs: "at most 21" includes people who are 21. "is exactly N years ago" and "is (a date)" are missing. The headings are field-specific ("Age") |
| C3 | FR-003f, FR-003a, FR-012b, OUT-15 | U30 6324:15613 ("Time left" at least/at most), 6324:15667–15670 ("≥ at least 6 months left"); unit picker with months U12 6350:42585, U25 6196:10399, U30 6324:15669; rows U14 6094:6521, U15 6344:53333, U16 6344:53522, U17 6134:8527/9078, U18 6163:4865, U19 6344:53716, U20 6344:53893, U21 6168:7020, U23 6185:8570, U27 6197:11419, U28 6197:11076 | Spec date conditions count back in whole calendar years or compare with a fixed date. The design adds a forward-looking condition ("N months left") and a months unit, and words Expiry date differently from Date of birth, so FR-003a's identical wording per kind doesn't hold |
| C4 | FR-003h, FR-003a, FR-005, OUT-15 | U12 6350:41890/41892/41904 (checks for one class: "has held class … for at least", "has class … valid today"), 6350:41548 (the data menu has no per-class parts), 6350:42948 (saved row); U30 6324:16305/16308 ("has class B valid on the day of sharing"); U35 6376:26342; U37 6396:48235; U33 6376:25771 ("Expiry date" without a class, 50%) | The spec checks a licence class through parts: held classes (enum) and each class's issue and expiry dates (dates, COPY "Licence class B – Issue date"), with generic date conditions. The design uses compound, field-specific conditions instead. With the generic date conditions only, "class B held for 2 years" (US1-AS5, US2-AS2) can't be expressed as the spec words it, and "valid today" has no generic equivalent |
| C5 | FR-014a, EC-5 (UI N) | U30 6324:16310 | The hint says: "If class B has no expiry date, the licence's expiry date counts." The spec says a missing value means the rule is not met and is reported as "couldn't be checked". The unit rated this 60% |
| C6 | FR-003b | U31 6324:17134 (at least ≥ / at most ≤ / between), 6324:17198–17304, 6324:17203 ("Both numbers count") | Spec (COPY): is greater than / is less than / is equal to / is not equal to, all strict. The design has inclusive bounds, a "between" condition, and no equal or not-equal conditions |
| C7 | FR-003c, FR-003a, FR-013a | U13 6357:42841 (is / is not / starts with), 6357:42895, 6357:42901 ("Capital letters and spaces at the start or end don't matter."); U31 6324:16757 (starts with), 6324:16763 | Spec (COPY): is equal to / is not equal to / contains / doesn't contain, each with a letter-case choice (CLAR 2026-10-23). The design has "starts with" instead of contains / doesn't contain. It presents letter case as fixed, with no control, and the readable statement never says whether letter case counts (FR-005). The units rated FR-013a PARTIAL; it is listed here because the design states the opposite of a required choice |
| C8 | FR-002c, EC-8 | U13 6357:43063 (text "is" with Stuttgart and Esslingen), 6357:42900 ("Met if the city or town is any of these."); U31 6324:17198 ("between 150 and 210") | CLAR 2026-10-23: only enum conditions take several values, and other multi-value checks need one rule each. The design lets a text condition and a number condition take two values |
| C9 | FR-008e, EC-9, US2-AS7, ENT-Group.members, FR-006a | U14 6113:29148 (after Rule 03 is deleted, Group 01 is left with only Sub-group 01); U28 6197:11080 (a group with one member); U27 6197:11425 (an empty group: "This group is empty. Add a rule or a sub-group, or delete the group."), 6197:11434 (Publish enabled); the delete dialogs U14 6113:29056 and U23 6185:8847 don't warn that the group dissolves | The spec dissolves a group once it has fewer than two members: the remaining member moves up, and the group's AND/OR and message are dropped. In the design, groups with zero or one member persist, can be published, and are offered as containers to fill |
| C10 | FR-008f, FR-023c, EC-16 | U23 6185:41610/41611/41627 (6.4: Sub-group 01 removed in Ambulance) | Removing one of the two members of an inherited group should dissolve the group in that branch and show it as removed, with undo. The design keeps Group 01 active with one effective member and an active "+ Add rule" |

## Spec-only (not in Figma)
| # | req | prio | expected surface | note |
|---|---|---|---|---|
| S1 | FR-026c | P1 | After publishing; Details | No frame shows a connection with only the main branch and its URLs "as before": a single Result link without variant labels. Every after-publishing frame shows 3 variants (U34, U37, U38), and U35 defers to the Published page |
| S2 | FR-020a | P2 | Rules step: Add variant dialog and branch rename | No error for a duplicate branch name. U17 6139:32693 shows no validation, and U26 6197:12011 shows only the missing-name error. The duplicate-name errors in U15 6344:53413 and U26 6196:10710 are about rule names |
| S3 | FR-020b | P2 | Rules step: variant tabs | No rename for branches, including "Standard". The rename that is designed (U15) is for rules and groups |
| S4 | FR-020c, US3-AS9 | P2 | Rules step: variant tabs, confirmation dialog | No delete action and no confirmation for a branch. U17 #23 guessed at 40% that an unseen kebab menu holds it, but that menu is on rule and group rows, not on the branch tabs, so it isn't counted |
| S5 | FR-022b, EC-11 | P2 | Rules step: based branch | Not drawn: main changes a rule that the branch already changed, and the branch keeps its own version. Also not drawn: main removes a rule that the branch changed, and the branch version then counts as added. U23's delete dialog copy (6185:8847) touches that second case, see P15 |
| S6 | EC-13 | P2 | Rules step: based branch | Not drawn: main removes a rule that the branch already removed, and it disappears from the branch too |
| S7 | EC-17 | P2 | Rules step: empty state inside a branch | No empty state for a branch that started empty and has no rules. U29 shows only the main branch's empty state, without branch tabs |
| S8 | ENT-Sub-group.error_message (sub-group half of FR-004c) | P2 | Rules step: sub-group header | A sub-group's own error message is never shown. Only a group message appears (U14 6324:39410) |

## Figma-only — behavioural
| # | item | where (units, node-ids) | suggested requirement |
|---|---|---|---|
| B1 | Rules, groups and sub-groups have auto-numbered names ("Rule 01", "Group 01", "Sub-group 01"). They can be renamed (pencil on hover, double-click, or ⋯ › Rename; "Enter saves · Esc cancels"), rule names must be unique ("Another rule is already called Rule 01."), and numbers aren't reused after a deletion. Dialogs, toasts and banners name items this way | U15 6344:53333/53363/53413/53479; U26 6196:10653/10710; U14 6113:28988; U28 6197:11073 (numbering gap); U10 6324:40071 ("Rule 01 and Rule 05 in Standard"); U11–U33 rule rows | "Each rule, group and sub-group has a name, by default 'Rule NN' / 'Group NN' / 'Sub-group NN', which is never renumbered. A team member can rename it, and names are unique within [the branch / the connection]. Refusal messages (FR-006c), warnings and the evaluation (FR-010c) identify items by name" |
| B2 | Each rule is edited in an editor with "Save rule" and "Cancel". Save rule stays disabled until the rule is complete, a toast confirms "Rule 01 saved.", and leaving with unsaved changes asks "Save changes to Rule 01?" (Discard / Save changes). The footer still says "Publish without rules" while an unsaved rule is open | U11 6348:40758, 6369:62602; U12 6369:62608; U28 6197:10988; U24 6191:42283; U25 6196:10256; U32 6324:17651 | "A rule is added to its branch only with Save rule, which is enabled once the rule is complete. Leaving an editor with changes asks to save or discard them. Publishing while an editor is open [discards the open rule / asks first]" |
| B3 | Rule menu › "Duplicate" | U14 6113:28988; U15 6344:53479; U16 6344:53529; U18 6324:39971; U19 6344:53750; U20 6344:53927 | "A team member can duplicate a rule within its level. In a based branch the copy counts as added" |
| B4 | Rule menu › "Copy to variant": choose one or more target variants, the current one excluded ("Variants based on Standard get it too."), then a toast "Rule 06 copied to School transport." with "Show". The copy is appended at the target's top level, renumbered, and marked "New addition", not linked | U18 6324:39971; U19 6344:53750; U20 6344:53982–53988, 6344:54042, 6344:54090 | "A team member can copy a rule to other branches. In each target the copy is an added rule that isn't linked, placed at the end of the top level. A copy to main appears, linked, in every based branch (FR-021c)" |
| B5 | Deleting a rule asks for confirmation ("Delete Rule 03? … You can undo this right after.") and then shows an Undo toast. Grouping also shows an Undo toast ("Rule 02 and Rule 03 are now Group 01." / "Grouped in Ambulance only.") | U14 6113:29056, 6113:29469; U23 6185:8847; U16 6344:53623; U19 6344:53873 | "Deleting a rule asks for confirmation that names the effect: the group dissolving (FR-008e) and the branches affected. Deleting and grouping can be undone right afterwards" |
| B6 | The menu of a removed item in a based branch offers only "Restore rule", "Restore group" or "Restore sub-group", with no edit or delete | U23 6185:8802, 6185:41586, 6185:42029 | "An item removed in a based branch can only be restored (FR-024a). It can't be edited or deleted" |
| B7 | After the AND/OR switch, a notice says "Group 01 now needs only one rule to be true." | U14 6329:19219 | "After a level's AND/OR changes, the UI states what the level now requires" (feedback only) |
| B8 | A variant can have an optional description, shown as a tooltip on the (i) of its tab | U17 6139:32693, 6139:32939; U26 6197:12011 | "ENT-Branch.description: optional text, shown on hover next to the branch name" |
| B9 | Before publishing, a confirmation dialog "Ready to publish?" lists documents with field counts, rules per variant, and a warnings line ("1 warning on Ambulance"), with "Check rules again". From the Documents step, "Publish without rules?" asks for confirmation | U33 6376:25536, 6376:26181; U34 6383:66119; U35 6376:27178; U36 6376:27630 | "Publishing asks for confirmation and shows a summary of documents, rules per branch and open warnings. The team member can go back to the rules step" |
| B10 | Scheduled go-live: "Goes live" Now / On a date (date only, shown as 00:00 with no time zone), "Schedule", a "Scheduled" status, and "Change go-live date" (also after going live). Until that date "the links don't accept requests. Requests already started keep running." | U33 6376:26181; U34 6383:66119, 6396:48549, 6421:31811, 6396:48860; U36 6376:27630; U37 6396:47705/47706; U38 6396:48967 | Decide the scope first. If it is kept: "A connection goes live now or on a chosen date. Before that date the trigger and pull URLs answer [state] to new requests, and started requests continue. The date can be changed, even after going live." This must be squared with FR-027 and EC-19, where a deactivation cancels requests in progress |
| B11 | Publishing shows progress ("Publishing…", can't be closed), then success ("Published", 0.5 s, then the page opens itself) or failure ("Couldn't publish. Nothing went live." with Try again / Check rules again). A failed save shows "Couldn't save … Retry" | U35 6387:65280, 6387:65289, 6376:27178; U28 6197:11098 | "Publishing is all or nothing and can't be cancelled while it runs. A failure leaves nothing live and offers a retry. A failed save offers a retry" |
| B12 | Extras on the published page: counters ("2 documents · 9 data items · 3 variants · 6 rules"), a collapsible summary, "Download PDF", an activity log with actors and per-branch events ("Rules changed in Ambulance"), "✓ Copied" feedback, "Live since …", and a connection actions menu | U34 6396:48654–48663; U37 6396:47753–47763, 6396:48527–48547, 6396:47841, 6421:31777; U38 6396:49011–49024 | "Details show a summary with counts, a PDF export and an activity log (who changed what, in which branch)". Decide whether this belongs to spec 002 |
| B13 | Clicking an earlier step on a live connection asks "Edit this live connection? … Your changes only go live when you publish again." | U38 6396:48909, 6396:49030 | "Editing a live connection asks for confirmation first. Changes apply only on publishing again (FR-028a)" |
| B14 | Wizard shell from spec 001: Draft / Live / Scheduled badge, "Save and exit", "Back", a sticky step and variant bar when scrolling. "Save and exit" stays available while rules check data that is no longer requested | All units; U17 6148:4674; U10 6324:40069; U27 6197:10714 | None for spec 002 beyond one decision: can a draft be saved while rules fail FR-006a or FR-029? |
| B15 | Documents step redesign: search including "Upcoming" documents, suggestions, counters, pager, select-all, the "nothing chosen" validation, empty states, scroll containment, first-add animation respecting reduced motion, Remove on hover | U06 6235:19050–19061; U07 6257:15055, 6242:18632, 6242:51053; U08 6235:18227, 6242:51200; U09; U10; U36 | None for spec 002: record it in spec 001 / design-notes |
| B16 | Removing a document asks for confirmation, then shows an Undo toast and offers the document again as a suggestion. U08 removes on hover without any confirmation, which is inconsistent | U06 6235:19061; U08 6242:18503; U09 6235:18711, 6235:19045, 6257:15312 | "Removing a document asks for confirmation and can be undone right afterwards" (when rules use the document, FR-029 applies) |
| B17 | Rule editor aids: "Need other data? Add it in Documents" link, search in the data, class and option menus, "No options match "XL".", hints that repeat the entered value, pickers that unlock in order | U11 6348:40520, 6348:40401; U12 6350:41628, 6350:42145; U24 6191:42209; U25 6197:11783; U31 6324:16762 | None needed (UI aids). The link to the Documents step could be noted next to FR-002d |
| B18 | "BE, C and D licences always include class B", so a class B rule counts as met by them | U12 6350:42352, 6350:42725 | Drop it, or define it next to FR-014b: "A rule on class B is met by a licence that holds BE, C or D" |
| B19 | Driving licence "Age over 18" (also "Age in years", "Year of birth") can be requested as data. U08 flagged it CONFLICT? at 30% against OUT-16 | U08 6235:18042 | Decide whether wallet age attributes may be requested at all. Spec 002 checks age only through Date of birth (OUT-16) |

## Partial matches
| # | req | where | difference |
|---|---|---|---|
| P1 | FR-003d, FR-003a, FR-003e | U12 6350:41850; U14 6094:6357; U24 6191:42079; U25 6197:11774; U27 6197:10699/10706/10711; U31 6324:17577, 6324:17370; U16–U23, U28, U33 rows; U37 6396:48274 | The enum conditions read "includes one of", "includes", "includes none of" or "doesn't include". The spec's COPY is "is in" / "is not in". The Glossary lists the synonym, but the spec fixes the wording. One kind is worded two ways in U27 ("includes [German]" and "includes one of [B][BE]"), which breaks FR-003a. "The rule checks all of them" (U31) is ambiguous next to FR-003e. U31 treats Nationality as a fifth "List" kind |
| P2 | FR-003g, FR-012a | U11 6348:40754; U12 6350:42724; U28 6197:10983; U30 6324:15672; hints hidden in U25 6196:10401 and U26 6196:10585; absent next to saved conditions (U18–U23, U27, U33) | The hint says "Today (23 Oct 2026) this means…" and doesn't say that years count back from the day the applicant shares. It appears only in the editor. U30's "Counted from the day the applicant shares" sits on the time-left condition, not on the years-ago ones. The German calendar date isn't mentioned |
| P3 | FR-006a, FR-006c, US1-AS6 | U11 6348:40758; U13 6357:42904; U24 6194:42246, 6191:42283; U25 6196:10249, 6196:10533; U27 6197:10696, 6197:10714; U30 6324:15433; U31 6324:16931; U32 6324:17650 | Incomplete rules are blocked at rule level: Save rule is disabled, and the inline errors name only the problem. Publish stays enabled while an incomplete rule is open. The missing-message case is never shown. The U27 banner names the problem and the rule but not the branch, and Publish is disabled rather than refused with a message. U25 adds "Enter a number greater than 0.", which no requirement asks for |
| P4 | FR-006a, FR-006c | U33 6376:26181 | "1 warning on Ambulance" doesn't block publishing and names only the branch and a count. The spec knows only blocking refusals that name the problem, rule and branch. The warnings probably come from the OUT unit U22 ("Problems", marked "later: not in spec yet") |
| P5 | FR-006b | U26 6197:12011 | "Enter a name for the variant." is checked inline in the Add variant dialog, so a branch without a name can't exist; the spec refuses publish or save instead. The duplicate-name half is S2 |
| P6 | US4-AS3, FR-029 | U10 6324:40071, 6324:40396 (names the rules and branches, so FR-029 is covered); U09 6235:18711 (gives a count only); U06 6235:19061; U07 6242:18487; U27 6197:10696 | The change applies once confirmed, and the copy blocks only publishing ("edit or delete these rules before you publish"). "Save and exit" stays available (U10 6324:40069). The blocked state isn't drawn on the Documents step. Deselecting everything with select-all isn't covered (U10 6324:40019). A linked rule is counted once per branch. The older U09 dialog gives only a count |
| P7 | FR-001b, US1-AS3, FR-001a | U07 6235:16862; U08 6235:17424; U36 6376:27409, 6376:27630; U09 6235:18684; U10 6324:40069 | "Publish without rules" on the Documents step skips the Rules step. It is offered even while Standard and Ambulance have rules, and what happens to those rules isn't defined |
| P8 | FR-018a, FR-019a | U29 6197:11646; U11 6348:40209 vs 6348:40882; U24 | Variant tabs and "+ Add variant" appear only after the first rule is saved. The main branch isn't shown before that, so a branch can't be added before the first rule |
| P9 | FR-004b | U25 6196:10254, 6196:10405 | A proposed message is shown before any condition is chosen (8.1), and one contradicts the entered value (8.2: "at least 21 years old" with 0) |
| P10 | FR-004c, ENT-Group.error_message | U14 6324:39410, 6324:39419 (shown); group menus empty (U14 6094:6413); absent in U16–U23, U27, U28 | A group's own message appears in one frame, but nothing shows how to add or remove it. The sub-group half is S8 |
| P11 | FR-021d, EC-15 | U21 6168:7680 (the top-level AND follows main); U18 6163:5438 (the group switch is marked, so EC-15 is covered); U23 6185:41167/41610 vs 6185:8827 | Switching the top-level AND/OR inside a branch is never drawn. In U23, Ambulance's Group 01 is AND and Standard's is OR, with no "Changed here" mark |
| P12 | FR-021c, EC-14 | U20 6344:53984 ("Variants based on Standard get it too.") | Only implied through Copy to variant. A rule added on Standard that appears, linked, in the based branches isn't drawn |
| P13 | FR-022a, FR-021b, FR-024a | U19 6344:53826, 6344:53871, 6344:53873 | Inherited rules moved into a branch-only group stay linked and carry no mark, and the spec is silent on this. The toast undoes an addition, while the spec's undo covers only changes and removals. Undefined: what happens when main removes one of these rules |
| P14 | FR-023b, US3-AS2 | U23 6185:41180, 6185:41623 | The changed Rule 05 inside a removed parent has only an outline, with no "Changed here" text |
| P15 | EC-12, FR-021b, FR-008e | U23 6185:8847 | Deleting a Standard rule asks for confirmation (the spec requires none) and says it is removed "from every variant that uses it". That ignores a branch's changed copy, which should remain as added (EC-12). The dialog doesn't say that Group 01, of which Rule 03 is one of two members, dissolves |
| P16 | FR-018a, FR-025f, EC-18, ENT-Branch.pull_url, ENT-Connection URL.pull_url | U34 6396:48636; U37 6396:47732–47749; U38 6396:48997 | Main's pull URL is ".../result/standard" and the others are slugs of the variant names. The spec says main keeps its existing pull URL from before this feature, and that no pull URL changes on rename |
| P17 | FR-030a, FR-023a/b/c (Details), FR-005 | U37 6396:48222–48277; U34 6396:48654; U38 6396:49011 | The per-variant summary is a flat list, collapsed by default. It shows no groups, no AND/OR, no changed, added or removed marks, and no removed items, and its statements leave out the document ("Date of birth ≥ at least 21 years old") |
| P18 | FR-030b, US4-AS1, US4-AS2 | U34 6424:34919; U37 6424:34839; U38 6396:49030, 6424:34959 | "Edit connection" is generic and its target step isn't shown. Clicking an earlier step adds a confirmation. No edit-mode Rules step is drawn: every Rules frame is in the Draft create flow. The design says "publish again" where the spec says "save" |
| P19 | FR-026a, US1-AS1 | U35 6387:65289, 6376:26662 | The success dialog moves on by itself after 0.5 s to the "Published page" (annotation) or "connection page" (copy), which are named inconsistently. The URLs appear only on that page (U37) |
| P20 | FR-014a, EC-5 (UI N) | U11 6348:40756; U28 6197:10984; U30 6324:15673 | The hint "If the … is missing, the rule isn't met." covers missing values only. It doesn't mention values that can't be interpreted, or that the rule is reported as "couldn't be checked" |
| P21 | FR-003i | U32 6324:17863 (parts Country / Region / City or town); U11 6348:40454; U13 6357:42894; U37 6396:48199 | The parts are offered as specified, but their kinds (country enum, region and city text) aren't visible. U13's "City or town" as a plain Personal ID field may be the residence city or the birthplace part, so it's ambiguous. U37 lists City or town as a separate field |

## Figma-only — cosmetic (FYI)
| # | item | where |
|---|---|---|
| F1 | Motion and hover: animation timings, the dropped ⋯ menu on document rows, hover styling, the outline of the selected editor, the scrolling field area | U06 6235:19056, 6235:19061; U07 6235:17134; U10 6324:40012; U13 6357:42890 |
| F2 | Hidden layers: rules card header, "Hints" slots, the "old" suffix, the hidden "Change go-live date" icon button | U11 6348:40215; U13 6357:42628; U24 6191:42071; U32 6324:17633, 6324:17647; U37 6396:47706 |
| F3 | Help tooltips and info icons ("What is a variant", (i) on Request link and Result link, (i) on the variant tabs, whose meaning isn't defined) | U17 6151:33809; U21 6168:7013; U26 6197:11978; U27 6197:10691; U38 6396:48977; U18 6163:4857; U23 6185:8905 |
| F4 | Visual grammar: "≥" glyph chips, the "·" separator, AND filled and OR outlined, plain-language group subtitles, faded connectors next to removed items, one dropdown per connector (the whole level switches, see U14 6094:7052) | U14 6094:6469; U23 6185:8569; U26 6197:11991 |
| F5 | Link-strip counter "2 of 3 Standard rules are removed here." | U21 6344:60075; U23 6344:60085 |
| F6 | Sample-data and mock slips: the wrong message on Rule 02 after grouping (U16 6344:53613); description samples that differ (U17 6139:32939); a 506 px footer (U17 6148:4702); a dangling AND connector (U19 6344:53865); a link icon only inside the new group (U19 6344:53871); a faded sub-group "Add rule" inside a removed group (U23 6185:41182); counts that disagree, 5 vs 6 rules (U33 6376:26181), 7 vs 6 data items (U36 6376:27630), 6 vs 7 rules (U37 6396:47754); V4 and V4b enabling the footer differently (U08 6235:17424 vs 6242:51124) | as listed |
| F7 | Static copy, shell and frame annotations: page headings, frame names, scrollbars, illustration, URL truncation (the copy action must still copy the full URL) | U08 6235:17251; U21 6168:7004; U26 6274:33733; U34 6396:48607; U37 6396:47748 |

## Clarify questions
Resolved on 2026-10-24 with /speckit-clarify. The answers are recorded in spec.md, Clarifications, Session 2026-10-24.
1. **Date wording and hints** (C1, P2, P20). Figma words the years conditions as "at least N years old" with a ≥ chip (U11 6348:40749, U37 6396:48228). Only U35 6376:26339 says "21 years ago". The hint reads "Today (23 Oct 2026) this means…" (U11 6348:40754), not "years count back from the day the applicant shares". The missing-value hint (U11 6348:40756) doesn't mention values that can't be interpreted. Spec: FR-003f / FR-005 COPY "is at least N years ago", OUT-15, FR-003g. Options: (a) Figma takes the spec's wording and hint text everywhere, (b) amend FR-003f, FR-005 and OUT-15 to allow age wording, (c) design error to fix in Figma only?
   → **Resolved 2026-10-24**: Age wording for the "Date of birth" ("is at least / is less than / is exactly N years old"); every other date keeps "years ago". The rules step still says that years count from the day of sharing. Spec amended: FR-003, FR-005, FR-012, US1, Edge Cases.
2. **Set of date conditions** (C2, C3). Figma offers "at most" (≤), "Time left … months" and a years/months unit picker, and lacks "is exactly N years ago" and "is (a date)" (U11 6348:40681, U30 6324:15613, U12 6350:42585). Spec FR-003f (CLAR 2026-10-23) has six conditions in whole years. Options: (a) Figma adopts the spec's six conditions, (b) the spec adds time-left, months and "at most", with evaluation rules in FR-012, (c) mixed, listing which to keep?
   → **Resolved 2026-10-24**: The spec's six conditions stay, in whole years, plus "is at least / is less than N years or months from now" on every date field, "Date of birth" included. No "at most", and no months on years-ago conditions. Spec amended: FR-003, FR-012, new edge case, SC-003.
3. **Licence classes and parts** (C4, C5, B18, P21). Figma uses "has held class B for at least 2 years" and "has class B valid on the day of sharing" (U12 6350:41890, U30 6324:16305). It falls back to the licence's expiry date (U30 6324:16310), treats BE, C and D as including B (U12 6350:42352), and offers no "Licence class B – Issue date / – Expiry date" parts. Spec: FR-003h, OUT-15, FR-014a / EC-5. Options: (a) Figma adds the per-class date parts and drops the compound checks, the fallback and the B-inclusion rule, (b) amend FR-003h, OUT-15 and FR-014a to adopt them, (c) keep the parts and add the compound checks as shortcuts? Also confirm the kinds of the Place of birth parts in U32 6324:17863: country enum, region and city text.
   → **Resolved 2026-10-24**: (a) Per-class parts only. Figma drops the compound class checks, the fallback to the licence's expiry date and "BE, C, D include B". Place of birth kinds confirmed: country enum, region and city or town text. No spec change.
4. **Number conditions** (C6, C8 between). Figma has at least / at most / between, inclusive and with two values (U31 6324:17134, 6324:17198). Spec FR-003b: greater / less / equal / not equal, strict, one value. Options: (a) Figma follows the spec, (b) amend FR-003b and FR-002c to allow ≥, ≤ and between, (c) add "between" only?
   → **Resolved 2026-10-24**: (a) The spec's four strict number conditions, one value each. Figma follows the spec. No spec change.
5. **Text conditions and letter case** (C7, C8 text). Figma has is / is not / starts with, a text condition with several values ("Stuttgart, Esslingen"), and letter case as fixed text with no control (U13 6357:42841, 6357:43063, 6357:42901; U31 6324:16757). Spec: FR-003c, FR-002c (CLAR), FR-013a (CLAR). Options: (a) Figma adds contains / doesn't contain, a per-condition letter-case choice and one value per text rule, (b) amend the spec to allow starts with, several values and always ignoring letter case, (c) mixed, listing which?
   → **Resolved 2026-10-24**: (a) The spec's text conditions, each with its own letter-case choice, one value per rule, and no "starts with". Figma follows the spec. Edge case example added.
6. **Enum wording** (P1). Figma says "includes one of", "includes", "includes none of" and "doesn't include", worded two ways within one kind (U27 6197:10699 vs 6197:10711). Spec COPY: "is in" / "is not in". Options: (a) Figma uses "is in" / "is not in", (b) amend the COPY to "includes one of" / "includes none of", used consistently, (c) accept the Glossary synonym?
   → **Resolved 2026-10-24**: (b) "includes one of" / "includes none of" for every enum field. Spec amended: FR-003, US1, Edge Cases.
7. **Groups below two members** (C9, C10, P15 dissolve part). Groups with zero or one member persist (U14 6113:29148, U27 6197:11425, U28 6197:11080), an inherited group isn't dissolved in Ambulance (U23 6185:41610), and the delete dialogs don't mention dissolving (U14 6113:29056, U23 6185:8847). Spec: FR-008e / FR-008f, EC-9, EC-16 (CLAR). Options: (a) Figma redraws these frames to dissolve and mark as removed, (b) amend the spec to allow empty and single-member groups (then define their evaluation), (c) design error, fix without new frames?
   → **Resolved 2026-10-24**: (c) Groups dissolve per FR-008 / EC-16, built without new frames; the delete dialog says when a group dissolves. No spec change.
8. **Branch management** (S2, S3, S4, P5). Not designed: duplicate branch name, renaming a branch (including "Standard"), deleting a branch with confirmation (FR-020a/b/c, US3-AS9). The missing name is caught inline in the dialog, not by refusing to publish (U26 6197:12011). Options: (a) design the frames (where: tab menu?), (b) implement per spec without frames, using KERN patterns, (c) take renaming or deleting out of scope (amend the spec)?
   → **Resolved 2026-10-24**: (b) FR-020 built with KERN patterns (tab menu, confirmation dialog), without new frames. Inline name checks allowed (FR-020).
9. **Propagation from main** (S5, S6, P12, P15 EC-12 part). Not drawn: main changes or removes a rule the branch changed (FR-022b, EC-11, EC-12), main removes a rule the branch removed (EC-13), main adds a rule (FR-021c, seen only through U20 6344:53984). U23's dialog says "removed from every variant that uses it" (6185:8847). Options: (a) design these states, (b) implement per spec without frames and fix U23's copy, (c) simplify the spec?
   → **Resolved 2026-10-24**: (b) Built per spec with the existing marks, without new frames. U23's delete copy must say that branches that changed the rule keep it as added.
10. **Marks in based branches** (P11, P13, P14). The operator differs from Standard without a mark (U23 6185:41167). Inherited rules moved into a branch-only group stay linked (U19 6344:53871). A changed rule inside a removed parent has no text mark (U23 6185:41180). Options: (a) Figma adds "Changed here" and defines grouped rules as linked, (b) the spec defines these cases (EC-15 extension, FR-022a), (c) sample-data slip, ignore?
   → **Resolved 2026-10-24**: (a) Inherited rules grouped in a branch stay linked inside a group marked added (FR-008, FR-022, new edge case). P11 and P14 are Figma slips: they get FR-023's marks.
11. **Empty branches and the first rule** (S7, P8). There is no empty state for a branch that started empty (EC-17), and branch tabs and "+ Add variant" are hidden until the first rule is saved (U29 6197:11646, U11 6348:40882). Options: (a) show tabs and Add variant from the start and design the empty branch state, (b) keep them hidden before the first rule and amend FR-019a, (c) design error?
   → **Resolved 2026-10-24**: (a) "+ Add variant" from the start of the rules step; an empty branch reuses U29's empty state (FR-019).
12. **Own messages of groups and sub-groups** (S8, P10). A group message appears once (U14 6324:39410), with no control to add or remove it, and a sub-group message never appears. Spec: FR-004c, ENT-Sub-group.error_message. Options: (a) design the control (group ⋯ menu?) and the sub-group message, (b) groups only, amending the spec for sub-groups, (c) implement per spec without frames?
   → **Resolved 2026-10-24**: (c) Per FR-004, groups and sub-groups alike: add or remove the message from the item's menu, without new frames (FR-004).
13. **URLs** (S1, P16). No frame shows a main-only connection with its URLs "as before" (FR-026c, P1), and main's pull URL is ".../result/standard" while the others are name slugs (U37 6396:47732). FR-018a and FR-025f keep main's original URL and keep every URL unchanged on rename. Options: (a) design the main-only view and use stable IDs in the URLs, (b) keep the slugs and amend FR-018a / FR-025f (migration for connections from before this feature?), (c) slugs fixed at creation and never renamed?
   → **Resolved 2026-10-24**: (a) The main branch keeps today's pull URL; every other branch is identified by an identifier fixed at creation (FR-025). A main-only connection shows its URLs as spec 001 does. Figma's URLs are placeholders.
14. **Details and editing a live connection** (P17, P18, P19, B13). The published page summary has no groups, AND/OR or change marks (U37 6396:48222). "Edit connection" leads to an unspecified step (U37 6424:34839) through an "Edit this live connection?" confirmation (U38 6396:49030), and no edit-mode Rules step is drawn. The success dialog moves on by itself to a page named two ways (U35 6376:26662). Spec: FR-030a/b, US4-AS1/2, FR-026a. Options: (a) design the full per-branch rules view, the edit entry into the rules step and an edit-mode rules frame, (b) accept the flat summary and amend FR-030a, (c) mixed?
   → **Resolved 2026-10-24**: FR-030 kept: details show each branch's rules read-only with groups, AND/OR and marks. "Edit" opens the rules step of spec 001's edit flow, which confirms at saving, not on entry (FR-030).
15. **Validation and refusal** (P3, P4). Figma blocks at rule level (disabled Save rule, inline errors without the branch), leaves Publish enabled with an incomplete rule open, never shows the missing-message case, and shows non-blocking warnings in the publish dialog (U33 6376:26181). Spec: FR-006a/c and US1-AS6 refuse publish or save with a message naming the problem, rule and branch. Options: (a) add a refusal state at publish naming rule and branch, and say what the warnings are, (b) amend the spec to rule-level validation plus a publish banner (as in U27 6197:10696), (c) both?
   → **Resolved 2026-10-24**: (c) Both: inline errors in the editor, and FR-006's refusal naming the problem, rule and branch, with Publish kept enabled. The publish dialog's "warnings" are dropped until "Problems" (U22) is specified (FR-006, Out of scope).
16. **Documents that rules use** (P6, B14 drafts, B16). U10 names the rules and branches, but the change goes through and only publishing is blocked ("before you publish"). "Save and exit" stays available (U10 6324:40069, U27 6197:10714). U09 6235:18711 shows only a count, and U08 6242:18503 removes without confirmation. US4-AS3 blocks save. Options: (a) keep the design and amend US4-AS3 to "publish blocked, drafts may hold invalid rules", (b) block save as well, (c) say which removal frames (U08, U09, U10) are current?
   → **Resolved 2026-10-24**: (b) U10 is current. Publishing and saving are refused while the rules remain, and "Save and exit" is dropped, since spec 001 has no drafts (US4-AS3).
17. **Publishing from the Documents step** (P7). "Publish without rules" skips the Rules step and is offered even while rules exist (U36 6376:27630, U10 6324:40069). FR-001a puts the Rules step before publishing, and US1-AS3 publishes from the rules step. Options: (a) keep the shortcut but hide or relabel it when rules exist, (b) remove the shortcut, (c) amend FR-001a and US1-AS3 to allow it, and define what happens to existing rules?
   → **Resolved 2026-10-24**: (a) "Publish without rules" only while no branch has any rule (FR-001).
18. **Rule names** (B1). Rules, groups and sub-groups have auto-numbered, renamable, unique names (U15 6344:53363, 6344:53413; U26 6196:10710), not in the spec. Options: (a) add a requirement, saying the uniqueness scope (branch or connection) and whether numbers are reused, (b) out of scope, identify rules by their statement, (c) design error?
   → **Resolved 2026-10-24**: Revised: serviceBW identifies results by a stable identifier, fixed at creation, never reused, and shared by a rule's versions across branches (FR-010). Names are team labels, "Rule NN" by default, unique per branch; renaming an inherited rule in a branch is a branch change (FR-005, new edge case, Key Entities).
19. **Per-rule editor** (B2, P9). There is Save rule / Cancel, a "Rule 01 saved." toast and an unsaved-changes guard (U28 6197:10988). Publishing with an open editor isn't defined (U24 6191:42283), and the proposed message appears before the condition exists (U25 6196:10254). Options: (a) add requirements for rule-level saving, the guard and open editors at publish, and say when the message is proposed, (b) treat it as UI detail and only define open editors at publish, (c) design error?
   → **Resolved 2026-10-24**: (b) UI detail, plus two rules: unsaved editor changes are confirmed before publishing or saving (FR-006), and the proposed message appears once the condition is complete and matches it (FR-004).
20. **Convenience actions** (B3, B5, B6, B7). Duplicate, the delete confirmation with Undo, Undo after grouping, Restore-only menus for removed items, and the notice after switching (U14 6113:28988, 6113:29056; U16 6344:53623; U23 6185:8802; U14 6329:19219) aren't in the spec. Options: (a) add requirements, (b) accept them as UI detail with no requirement, (c) out of scope for v1?
   → **Resolved 2026-10-24**: (a) UI detail, plus: a duplicate is a new rule that counts as added in a based branch (FR-022); a removed item can only be restored (FR-024).
21. **Copy to variant** (B4). Copying rules between branches (U20 6344:53982–54090) isn't in the spec, and its link semantics (added vs linked, propagation through Standard) are undefined. Options: (a) add a requirement with those semantics, (b) out of scope, remove it from Figma, (c) later?
   → **Resolved 2026-10-24**: (a) Copy to variant added: a new, unlinked rule with a new identifier and its default name, at the end of the target's top level (FR-022).
22. **Variant description** (B8). There is an optional description shown on the tab (U17 6139:32693). Options: (a) add it to ENT-Branch, (b) out of scope, (c) design error?
   → **Resolved 2026-10-24**: (a) Optional branch description, not sent to serviceBW (FR-020, Key Entities).
23. **Publish confirmation and progress** (B9, B11). There is a "Ready to publish?" summary dialog, a "Publish without rules?" confirmation, a progress dialog that can't be closed, and "Couldn't publish. Nothing went live." (U33 6376:26181, U36 6376:27630, U35 6387:65280, 6376:27178). Options: (a) add requirements (all-or-nothing publishing, retry), (b) spec 001 / design-notes scope, (c) out of scope?
   → **Resolved 2026-10-24**: (a) Extends spec 001's publish/save dialog with a rules-per-branch summary (wording for the design notes). Publishing or saving is all or nothing, with a retry (FR-028).
24. **Scheduled go-live** (B10). The design has Now / On a date, a "Scheduled" status, changing the date even after going live, and links that refuse requests before go-live (U34 6383:66119, 6396:48860). None of this is in spec 002, and it interacts with FR-027 and EC-19. Options: (a) add it to spec 002 with the URL behaviour defined, (b) a separate spec, (c) out of scope, remove from Figma?
   → **Resolved 2026-10-24**: (c) Out of scope; remove scheduling from Figma (Assumptions, Out of scope).
25. **Extras on the published page** (B12). The activity log with actors, the PDF export, counters and "Copied" feedback (U37 6396:48527, 6396:47755, 6396:47841) aren't in the spec. Options: (a) add requirements (the activity log affects logging rules), (b) spec 001 / later, (c) remove from Figma?
   → **Resolved 2026-10-24**: (b) Later: the activity log and PDF export need their own spec (Assumptions, Out of scope).
26. **Items from the spec 001 scope** (B14, B15, B17). The wizard shell, the Documents step redesign and the rule editor aids (U06–U10, U36; U11 6348:40520) have no spec 002 requirement. Options: (a) record them in spec 001 / design-notes, (b) add them to spec 002, (c) out of scope?
   → **Resolved 2026-10-24**: (c) Out of scope: implement what spec 001 and spec 002 require; spec 001's no-drafts decision stays.
27. **Wallet age attributes** (B19). "Age over 18", "Age in years" and "Year of birth" can be requested (U08 6235:18042). Spec 002 checks age only through Date of birth and excludes wallet-side evaluation (OUT-16). Options: (a) keep them as ordinary requested data, (b) hide them or warn when rules exist, (c) remove them?
   → **Resolved 2026-10-24**: (a) Spec 001's catalog stays: "Age in years" and "Year of birth" can be requested and checked as numbers; "Age over 18" is removed from Figma (Assumptions).

## Coverage
Status per requirement with `UI = Y`. Units with a PARTIAL or CONFLICT row are marked (P) or (C), and a ? marks a unit's own confidence below 70%.

| req-id | status | units |
|---|---|---|
| FR-001a | COVERED | U07–U38 (all except U06, which is 60%) |
| FR-001b | COVERED | U07, U09, U11, U13–U15, U17, U18, U21, U23–U26, U28–U32, U34, U36; U08 (P), U10 (P), U29 (P), U36 (P) → P7 |
| FR-002a | COVERED | U11–U17, U20, U24, U25, U27, U29–U34; U26 (P), U28 (P) |
| FR-002b | COVERED | U11, U12, U13, U30, U31 |
| FR-002c | CONFLICT (C8) | U12, U15, U20, U24, U25, U28; U14/U17/U21/U23 (P); U13 (C), U31 (C) |
| FR-002d | COVERED | U11, U12, U24, U25, U27, U32; U08 ? |
| FR-003a | CONFLICT (C1, C3, C4) | U25, U30, U31, U32; U11–U13, U15–U17, U20, U21, U23, U25, U27, U28, U30, U33, U37 (C) |
| FR-003b | CONFLICT (C6) | U31 (C) |
| FR-003c | CONFLICT (C7) | U13 (C/P), U31 (C) |
| FR-003d | PARTIAL (P1) | U12, U15, U20, U24, U25, U28; U12, U14, U16–U19, U21, U23–U25, U27, U31, U33, U37 (P); U30 (C, see C4) |
| FR-003f | CONFLICT (C1–C3) | U11, U12, U14–U21, U23, U25–U28, U30, U33, U37 (C); U19–U21, U30, U32, U34 (P); U35 (shows "years ago") |
| FR-003g | PARTIAL (P2) | U28; U11, U12, U25, U26, U30 (P) |
| FR-003h | CONFLICT (C4) | U12, U15, U20, U24, U26, U28; U14, U17, U19, U21, U23, U25, U33, U35, U37 (P); U12, U30, U37 (C) |
| FR-003i | COVERED | U32; U08 ?; U11 (P), U13 (P) → P21 |
| FR-004a | COVERED | U11–U38 (all Rules-step units) |
| FR-004b | COVERED | U11, U12, U13, U24, U26, U28, U30, U31, U32; U25 (P) → P9 |
| FR-004c | PARTIAL (P10) | U14 (group message only) |
| FR-005 | CONFLICT (C1, C4) | U17, U18, U23, U26, U33, U35; U11, U12, U14, U15, U19–U21, U26, U27, U34, U37 (P); U17, U18, U27, U28, U37 (C) |
| FR-006a | PARTIAL (P3, P4) | U27; U11, U13, U24, U25, U27, U30–U33 (P); U27 #22 (C, see C9) |
| FR-006b | PARTIAL (P5) | U26; U26 (P) |
| FR-006c | PARTIAL (P3) | U27; U11, U24, U25, U27, U32, U33 (P) |
| FR-007a | COVERED | U12, U14–U16, U18, U20, U21, U23, U26, U28, U33–U35; U17/U19/U27 (P) |
| FR-007b | COVERED | U14–U16, U18, U20, U21, U23, U26, U28, U33–U35 |
| FR-007c | COVERED | U12, U14 (6094:7052 "Applies to every rule in Group 01"), U16, U18, U20, U21, U23, U28; U15/U17/U19/U27 (P, settled by U14) |
| FR-008a | COVERED | U14–U21, U23, U26, U33 |
| FR-008b | COVERED | U14–U18, U20, U21, U23, U26, U28, U33; U27 (P) |
| FR-008c | COVERED | U14–U21, U23, U26, U28, U33; U27 (P) |
| FR-008d | COVERED | U14, U18–U21, U23, U26; U15 ?, U17 ? |
| FR-008e | CONFLICT (C9) | U14, U27, U28 (C); U23 (P) |
| FR-008f | CONFLICT (C10) | U23 (C); U19 (P) |
| FR-013a | CONFLICT (C7) | U13, U31 (rated P by the units) |
| FR-013c | PARTIAL | U13, U31 (P): ignoring letter case is shown as fixed, not as a default |
| FR-018a | PARTIAL (P16) | U10–U12, U14–U21, U23, U26–U28, U33–U35 (main branch shown as "Standard"); U29, U34, U37, U38 (P, pull URL) |
| FR-019a | COVERED | U11, U12, U14–U21, U23, U26–U28, U33–U35; U29 (P) |
| FR-019b | COVERED | U17 |
| FR-020a | SPEC-ONLY (S2) | — |
| FR-020b | SPEC-ONLY (S3) | — |
| FR-020c | SPEC-ONLY (S4) | — (U17 #23 at 40% on rule menus is not counted) |
| FR-021a | COVERED | U17–U21, U23, U26, U33 |
| FR-021b | COVERED | U17–U20, U23, U26; U19 (P), U23 (P) |
| FR-021c | PARTIAL (P12) | U20 (P) |
| FR-021d | PARTIAL (P11) | U21 ?; U23 (P) |
| FR-022a | COVERED | U17–U21, U23, U26; U19 (P), U20 (P) |
| FR-022b | SPEC-ONLY (S5) | — |
| FR-023a | COVERED (Rules step) | U17–U21, U23, U33; U23 (P); missing on Details (U37) → P17 |
| FR-023b | COVERED (Rules step) | U17–U21, U23, U33; U23 (P) → P14; missing on Details → P17 |
| FR-023c | COVERED | U18, U19, U21, U23; U23 #28 (C, dissolved groups) → C10 |
| FR-024a | COVERED | U18, U23; U19 (P) |
| FR-024b | COVERED | U23 (whether restoring a group also restores its inner removals isn't shown) |
| FR-025b | COVERED | U34, U37, U38; U17 ?; U37 (P) |
| FR-026a | COVERED | U34, U37, U38; U35 (P) |
| FR-026b | COVERED | U34, U37, U38 |
| FR-026c | SPEC-ONLY (S1) | — |
| FR-029 | COVERED | U10; U06, U07, U09, U10, U27 (P) → P6 |
| FR-030a | PARTIAL (P17) | U34, U37, U38 (P) |
| FR-030b | PARTIAL (P18) | U34, U37, U38 (P) |
| FR-031 | COVERED | U13–U15, U17, U19, U23, U27, U29; U10/U20/U24/U25/U36/U38 ? (signed-in view only, no frame for other roles) |
| US1-AS1 | COVERED | U11, U16; U11, U35, U37 (P) |
| US1-AS2 | COVERED | U11, U12, U31; U08 ? |
| US1-AS3 | COVERED | U09, U11, U13, U24–U26, U28–U32; U07, U08, U10, U36 (P) → P7 |
| US1-AS6 | PARTIAL (P3) | U27 (case of a field no longer requested); U25 (P) |
| US2-AS1 | COVERED | U14, U20, U21, U26, U28; U17/U27 (P) |
| US2-AS6 | COVERED | U14, U15, U18–U21, U23, U26; U17 ? |
| US2-AS7 | CONFLICT (C9) | U14–U16, U20 ?, U27 ?; U14 (C) |
| US3-AS1 | COVERED | U17 |
| US3-AS2 | COVERED | U17–U20, U33; U23 (P) |
| US3-AS3 | COVERED | U20 (static only: an unchanged rule follows Standard; the propagation itself isn't drawn) |
| US3-AS4 | COVERED | U17–U21, U23, U33 |
| US3-AS5 | COVERED | U18, U23 |
| US3-AS6 | COVERED | U17, U26 (the "Start empty" option) |
| US3-AS7 | COVERED | U37, U38; U37 (P) |
| US3-AS9 | SPEC-ONLY (S4) | — |
| US4-AS1 | PARTIAL (P18) | U15, U20, U38; U37 (P), U38 (P) |
| US4-AS2 | PARTIAL (P18) | U38 (P) |
| US4-AS3 | PARTIAL (P6) | U10; U06, U07, U09, U10 (P) |
| EC-8 | CONFLICT (C8) | U12, U20, U25, U28; U17/U21 (P); U13, U31 (C) |
| EC-9 | CONFLICT (C9) | U14, U15, U20 ?; U14, U27, U28 (C) |
| EC-11 | SPEC-ONLY (S5) | — |
| EC-12 | PARTIAL (P15) | U23 (P) |
| EC-13 | SPEC-ONLY (S6) | — |
| EC-14 | COVERED | U17, U26 (started-empty half); U20 (P) → P12 |
| EC-15 | COVERED | U18; U19 (P), U23 (P) → P11 |
| EC-16 | CONFLICT (C10) | U23 (C) |
| EC-17 | SPEC-ONLY (S7) | — |
| ENT-Rule.document | COVERED | U11–U13, U17, U23–U25, U30–U32; U20/U21/U28 (P) |
| ENT-Rule.field | COVERED | U11, U13, U17, U23–U25, U30–U32; U12 (P) |
| ENT-Rule.condition | COVERED | U13, U23, U24, U30–U32; U14 (P) |
| ENT-Rule.error_message | COVERED | U11–U33 (Rules-step units) |
| ENT-Rule.branch | COVERED | U17, U21 |
| ENT-Rule.parent | COVERED | U15, U17, U20, U21 |
| ENT-Group.members | CONFLICT (C9) | U14, U16–U18, U20, U21; U14, U27, U28 (C) |
| ENT-Group.operator | COVERED | U14–U21, U23, U26, U28, U33 |
| ENT-Group.error_message | COVERED | U14 (no add or remove control → P10) |
| ENT-Sub-group.members | COVERED | U14, U15, U17, U18, U20, U28 |
| ENT-Sub-group.operator | COVERED | U14, U17–U20, U23, U26, U28, U33 |
| ENT-Sub-group.error_message | SPEC-ONLY (S8) | — |
| ENT-Branch.name | COVERED | U10–U12, U14, U16–U21, U23, U26–U28, U33, U38 |
| ENT-Branch.rules | COVERED (Rules step) | U17–U21, U23 rule lists; U12 (P), U37 (P, Details) |
| ENT-Branch.operator | COVERED | U12, U14, U18, U20, U21, U28; U17 (P) |
| ENT-Branch.pull_url | PARTIAL (P16) | U34, U38; U37 (P) |
| ENT-Branch.origin | COVERED | U17–U21, U23, U26, U33 |
| ENT-Branch Change.item | COVERED | U17, U21 |
| ENT-Branch Change.kind | COVERED | U17–U21, U23 |
| ENT-Branch Change.undoable | COVERED | U18, U23; U19 (P) |
| ENT-Form Connection.branches | COVERED | U17, U18, U20, U21, U23, U33; U37 (P) |
| ENT-Connection URL.trigger_url | COVERED | U34, U37, U38 |
| ENT-Connection URL.pull_url | PARTIAL (P16) | U34, U37, U38; U34 (P), U37 (P) |

Requirements with `UI = N` that units touched (FYI): FR-003e (U12 covered; U25 and U31 partial), FR-009a (U15, U21), FR-009c / EC-1 (U11, U29, U36), FR-010d (U27), FR-011b / US2-AS4 (U14, U21), FR-012a (U11, U12, U30 partial: "Today" instead of the sharing day), FR-012b (U30 partial: months), FR-012c / EC-2 (U11 covered; U30 partial: "at most"), FR-014a / EC-5 (U11, U28, U30 partial; U30 C5), FR-014b / EC-6 (U12 covered; B18), FR-019c (U33), FR-025a (U34, U37, U38), FR-028a (U38), ENT-Document Request.trigger (U37), ENT-Document Request.evaluated_branch (U17 ?).

## Not audited
| UNIT-ID | name | status | coverage gap |
|---|---|---|---|
| U01 | Log in (empty, filled, wrong, forgot, loading, logged out) | OUT | Spec 001 sign-in. Would show FR-031's signed-out side, which no audited unit shows |
| U02 | Your connections (list, user menu, delete/edit dialogs) | OUT | Spec 001 overview. Its edit entry may bear on FR-030b / US4 (P18) |
| U03 | Save and exit (saving, draft saved) | OUT | Drafts aren't in spec 002, but they bear on Q16 (saving with invalid rules) |
| U04 | Log out with unsaved changes | OUT | Spec 001 shell |
| U05 | Create connection (first, filled, info, empty, Form ID used, returning) | OUT | Spec 001 create step |
| U22 | Problems: contradiction, duplicate, suggestion | OUT | Marked "later: not in spec yet". It probably defines the publish warnings in U33 (P4) |
| U39 | Deactivate / delete connection (menu, dialogs, deactivated, after delete) | OUT | Spec 001 lifecycle. Bears on FR-027c / EC-19 (UI N) and on the scheduled go-live semantics (B10) |

No unit is UNCERTAIN, FAILED or RATE_LIMIT.
