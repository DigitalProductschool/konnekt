# Figma ↔ spec audit — 2026-10-24

Spec: `specs/002-connection-rules/spec.md` · Figma file `s8mU9oJDq3411e8bxMjQO9`, root 6263:12360 · Glossary: variant = branch, "Standard" = main branch, "Request link" = trigger URL, "Result link" = pull URL.

Design decisions are cited as `CLAR 2026-10-24 #n`, where n is the answer's position in spec.md's Clarifications, Session 2026-10-24. All 27 answers in that session refer to the UI design. The 2026-10-22 and 2026-10-23 sessions never mention the design, so they settle nothing here.

## Summary
Units audited 32/39 (OUT 7, UNCERTAIN 0, FAILED 0). Figma calls 0. This run remapped all 32 IN units without calling Figma. Their inventories come from the earlier full run, which made 120 unit calls and 1 mapper call.

**Note on inputs:** requirements.md predates Session 2026-10-24 (its header names 2026-10-23 as the last session). The remapped units therefore still compare Figma with superseded wording: "is in" / "is not in", "years ago" for the Date of birth, no rule names, no copy to variant, no branch description. This merge applies the 2026-10-24 decisions on top of the unit mappings. Regenerate requirements.md before the next remap.

| category | count |
|---|---|
| CONFLICT | 1 |
| SPEC-ONLY (not in Figma) | 0 |
| FIGMA-ONLY behavioural | 2 |
| PARTIAL | 2 |
| FIGMA-ONLY cosmetic | 7 |
| Figma must change (decided) | 23 |
| Build without frames (decided) | 5 |

Clarify questions: 4.

Coverage of the 107 requirements with `UI = Y`: COVERED 54, PARTIAL 30, CONFLICT 14, SPEC-ONLY 9. Almost every non-COVERED requirement now points to a settled F# or W# item. Two things are still open: FR-003g (P1), and the Date of birth wording within FR-003a, FR-003f and FR-005 (C1).

Top 5 issues (open items only):
1. **C1 – Date of birth statement.** CLAR 2026-10-24 #1 adopted Figma's age wording ("is at least N years old"), but the design still doesn't match the amended spec. Saved rules read "Personal ID · Date of birth ≥ at least 21 years old", with a ≥ chip, no "is", and "·" instead of "–". U35 still says "21 years ago". A hidden "old" suffix in the generic editor would put age wording on other date fields.
2. **P1 – The note that years count back from the day of sharing (FR-003g, P1).** The editor hint says "Today (23 Oct 2026) this means…" and never says that the count starts from the day the applicant shares. It also never appears next to saved conditions.
3. **B2 – Publishing while a rule editor has unsaved changes.** CLAR #19 requires asking whether to keep or discard them. No frame shows this, and Figma keeps "Publish without rules" enabled next to an open editor.
4. **B1 – Duplicate rule names.** CLAR #18 refuses a duplicate with a message that names the branch. Figma's "Another rule is already called Rule 01." doesn't name it.
5. **P2 – The missing-value hint (FR-014a, UI N).** It covers missing values but not values that can't be read, and it doesn't say they are reported as "couldn't be checked".

The following are **built as designed**, because the spec was amended to the design or the decision treats them as UI detail. They are closed and not counted above:
- Age wording for the Date of birth (#1; what still differs is C1).
- The from-now date conditions, which are Figma's "Time left … at least" (#2; F1 drops "at most").
- "includes one of" / "includes none of" (#6; F5 for the other wordings).
- The rule editor's inline errors (#15) and the inline missing-name error in Add variant (#8).
- U10's dialogs, which name the rules and branches (#16).
- Rule, group and sub-group names ("Rule 01"), renaming them, and never reusing numbers (#18; what still differs is B1).
- Save rule / Cancel, the "Rule 01 saved." toast and the leave guard (#19; what still differs is B2).
- Duplicate, the delete confirmation, undo after deleting or grouping, Restore-only menus for removed items, and the notice after switching AND/OR (#20).
- Inherited rules grouped in a branch-only group, which is marked "New addition" while its rules stay linked (#10, U19).
- Copy to variant (#21, U20).
- An optional branch description (#22).
- The "Ready to publish?" summary, the "Publishing…" progress and "Couldn't publish" with Try again (#23).
- The success dialog opening the details (#14).

## Conflicts
| # | req | Figma (unit, node-id) | conflict |
|---|---|---|---|
| C1 | FR-003f, FR-003a, FR-005 (amended by CLAR 2026-10-24 #1) | Editor: U11 6348:40749–40752, U25 6196:10397–10400, U26 6196:10579–10584, U28 6197:10974. Saved rows: U11 6348:40889, U12 6350:41102, U14 6094:6469/6276, U15 6344:53330, U16 6344:53519, U17 6134:8524/8544, U18 6163:4862, U19 6344:53713, U20 6344:53890, U21 6168:7017, U23 6185:8567/41180, U27 6197:11416, U28 6197:11073/11090, U33 6376:25788, U34 6383:66110. Inconsistent frame: U35 6376:26339. Hidden "old" suffix: U30 6324:15427 (Expiry date), U31 6324:16760, U32 6324:17644. Details: U37 6396:48228/48244/48260 | The units rate this CONFLICT against requirements.md's "is at least N years ago", which CLAR #1 has superseded. The amended spec words only the Date of birth as an age ("is at least / is less than / is exactly {years} old"), and every other date keeps "years ago". Four differences remain. (1) Figma's statement reads "Personal ID · Date of birth ≥ at least 21 years old": a ≥ chip instead of "is", and "·" where FR-005's example has "–". (2) U35 says "≥ at least 21 years ago" for the Date of birth. (3) A hidden "old" suffix in the shared date/number editor, including on Expiry date (U30), would give other date fields age wording. (4) The details statements leave out the document, which F16 settles |

## Spec-only (not in Figma)
| # | req | prio | expected surface | note |
|---|---|---|---|---|
| — | — | — | — | None open. All 9 spec-only req-ids are settled: FR-020a, FR-020b, FR-020c and US3-AS9 by W1; EC-11 and EC-13 by W2; EC-17 by W3; ENT-Sub-group.error_message by W4; FR-026c by W5 |

## Figma-only — behavioural
| # | item | where (units, node-ids) | suggested requirement |
|---|---|---|---|
| B1 | Rule, group and sub-group names ("Rule 01", "Group 01", "Sub-group 01"), renamed inline or through ⋯ › Rename. A duplicate is rejected inline with "Another rule is already called Rule 01." and Save rule disabled | U14 6113:28988; U15 6344:53363, 6344:53413; U26 6196:10710; U28 6197:11073 (numbers not reused) | CLAR 2026-10-24 #18 adopted the names: they are unique within each branch, and a duplicate "is refused with a message that names the branch" (FR-005). Still open: Figma's message doesn't name the branch, and it's unclear whether the inline error replaces the refusal or comes in addition to it |
| B2 | Publishing while a rule editor holds unsaved changes. The footer's "Publish without rules" stays enabled next to an open, unsaved rule, which suggests the rule is dropped. The keep/discard dialog "Save changes to Rule 01?" appears only when leaving an editor | U11 6348:40759; U24 6191:42283; U25 6196:10256; U30 6324:15434; U31 6324:16767; U32 6324:17651; dialog U28 6197:10988 | CLAR 2026-10-24 #19: "Publishing or saving while a rule being edited has unsaved changes first asks to keep or discard them (FR-006)." No frame shows this, and the decision doesn't say whether new frames are needed |

## Partial matches
| # | req | where | difference |
|---|---|---|---|
| P1 | FR-003g, FR-012a (UI N) | U11 6348:40754; U12 6350:42724; U28 6197:10983; U30 6324:15672. Hidden in U25 6196:10401 and U26 6196:10585. Absent next to saved conditions (U18–U21, U23, U27, U33) | The hint reads "Today (23 Oct 2026) this means: born on or before 23 Oct 2005.", a worked example for today. It doesn't say that years count back from the day the applicant shares, and it appears only in the editor. U30 says "Counted from the day the applicant shares", but on the from-now (time-left) condition. The German calendar date isn't mentioned. U28 rates this hint COVERED; the other units rate it PARTIAL |
| P2 | FR-014a, EC-5 (UI N) | U11 6348:40756; U12 6350:42726; U28 6197:10984; U30 6324:15673 | "If the date of birth is missing, the rule isn't met." covers missing values only. The spec also covers values that can't be interpreted, and reports both as "couldn't be checked" |

## Figma-only — cosmetic (FYI)
| # | item | where |
|---|---|---|
| K1 | Motion and hover: animation timings, the ⋯ menu dropped from document rows, hover styling, the outline of the selected editor, the scrolling field area | U06 6235:19056, 6235:19061; U07 6235:17134; U10 6324:40012; U13 6357:42890 |
| K2 | Hidden layers: the rules card header, "Hints" slots. The hidden "old" suffix is under C1, and the hidden "Change go-live date" button under F18 | U11 6348:40215; U13 6357:42628; U24 6191:42071; U32 6324:17633, 6324:17647 |
| K3 | Help tooltips and info icons: "What is a variant", (i) on Request link and Result link, (i) after based variants' tab names (its meaning isn't defined) | U17 6151:33809; U18 6163:4857; U21 6168:7013; U23 6185:8905; U26 6197:11978; U27 6197:10691; U38 6396:48977 |
| K4 | Visual grammar: ≥ and < glyph chips, AND filled and OR outlined, plain-language group subtitles, faded connectors next to removed items, one dropdown per connector. U14 shows that the whole level switches, so FR-007c holds | U14 6094:6469, 6094:7052; U23 6185:8569; U26 6197:11991 |
| K5 | Link-strip counter "2 of 3 Standard rules are removed here." | U21 6344:60075; U23 6344:60085 |
| K6 | Sample-data and mock slips: wrong message on Rule 02 after grouping; description samples that differ; a 506 px footer; a dangling AND connector; a link icon only inside the new group; a faded sub-group "Add rule" inside a removed group; counts that disagree (5 vs 6 rules, 7 vs 6 data items, 6 vs 7 rules); V4 and V4b enabling the footer differently; "Published page" vs "connection page" | U16 6344:53613; U17 6139:32939, 6148:4702; U19 6344:53865, 6344:53871; U23 6185:41182; U33 6376:26181; U36 6376:27630; U37 6396:47754; U08 6235:17424 vs 6242:51124; U35 6376:26662 |
| K7 | Static copy, shell and frame annotations: page headings, frame names, scrollbars, illustration, URL truncation (the copy action must still copy the full URL) | U08 6235:17251; U21 6168:7004; U26 6274:33733; U34 6396:48607; U37 6396:47748 |

## Figma must change (decided)
Build these as the spec says, keeping Figma's layout and styling, until the design is updated.

| # | req | Figma (unit, node-ids) | Figma shows | build instead | decision |
|---|---|---|---|---|---|
| F1 | FR-003f, FR-003a, FR-012b, FR-012c | U11 6348:40681, 6348:40539; U30 6324:15613, 6324:15429; unit picker U12 6350:42585, U25 6196:10399, U26 6196:10579–10584, U30 6324:15669 | "at least" (≥) and "at most" (≤) for both time passed and time left. A years/months unit on every duration. No "is exactly N years ago" and no "is (a date)". "before" and "after" without "is" | The six conditions of FR-003: is before, is after, is (a date); is at least, is less than, is exactly N years ago, in whole years ("… years old" for the Date of birth, see C1). Every date field, the Date of birth included, also offers "is at least" and "is less than" N years or months from now, counted forward from the day of sharing. Figma's "Time left … at least" rows (U14 6094:6521, U17 6134:8527, U23 6185:8570, U30 6324:15667–15670 and the like) stay. No "at most". Months only on the from-now conditions | CLAR 2026-10-24 #2 |
| F2 | FR-003h, FR-003a, FR-005, FR-014a, FR-014b (EC-5, EC-6) | U12 6350:41548, 6350:41890/41892/41904, 6350:42447/42585, 6350:42724, 6350:42352, 6350:42725, 6350:42948; U30 6324:16305, 6324:16308, 6324:16310; U35 6376:26342; U37 6396:48235/48251/48267; U33 6376:25771 (if it means a class, 50%) | Compound class checks "has held class B for at least 2 years" (with months) and "has class B valid today / on the day of sharing". No per-class parts in the data menu. "BE, C and D licences always include class B". A class without an expiry date falls back to the licence's | Licence classes are checked through their parts only. The held classes are an enum ("includes one of"). "Licence class B – Issue date" and "Licence class B – Expiry date" are dates with the generic date conditions, e.g. "Licence class B – Issue date is at least 2 years ago". No fallback to the licence's expiry date. Only a licence that lists class B meets a rule on class B | CLAR 2026-10-24 #3 |
| F3 | FR-003b, FR-002c, EC-8 | U31 6324:17134, 6324:17198–17201/17304, 6324:17203 | at least (≥), at most (≤), between (two values, "Both numbers count") | is greater than, is less than, is equal to, is not equal to. All strict, one value each. A range takes two rules | CLAR 2026-10-24 #4 |
| F4 | FR-003c, FR-013a, FR-013c, FR-002c, EC-8, FR-005 | U13 6357:42841, 6357:43063, 6357:42900, 6357:42901; U31 6324:16757, 6324:16763 | is / is not / starts with. Two values in one text rule ("Stuttgart", "Esslingen"; "Met if … any of these"). Letter case stated as fixed, with no control | is equal to, is not equal to, contains, doesn't contain, one value each. Each has its own letter-case choice, which ignores letter case by default, and the statement says whether letter case counts. No "starts with". "Lives in Stuttgart or Esslingen" takes two rules in an OR group | CLAR 2026-10-24 #5 |
| F5 | FR-003d, FR-003a, FR-005 (FR-003e) | U12 6350:41850; U27 6197:10699; U31 6324:17577, 6324:17370, frame 6324:17351; U37 6396:48274 | "includes" and "doesn't include" next to "includes one of" / "includes none of". Nationality treated as a separate "List" kind. Hint "The rule checks all of them." | "includes one of" / "includes none of" for every enum field and any number of values, Nationality included. Met if any (or none) of the citizen's values is in the set. Rows that already say so stay (U14 6094:6357, U24 6191:42079, U27 6197:10706/10711) | CLAR 2026-10-24 #6 |
| F6 | FR-004b | U25 6196:10254, 6196:10405 | A proposed message before any condition is chosen. "at least 21 years old" while 0 is entered | Propose the message once the condition is complete, and keep it matching the condition | CLAR 2026-10-24 #19 |
| F7 | FR-008e, FR-008f, EC-9, EC-16, US2-AS7, ENT-Group.members, FR-023c, FR-006a | U14 6113:29148; U28 6197:11080; U27 6197:11425, 6197:11431, 6197:11434; U23 6185:41610/41611/41627 | Groups with one member or none persist, offer "+ Add rule" and "Add a sub-group", and can be published. Group 01 stays active in Ambulance after Sub-group 01 is removed | A group or sub-group left with fewer than two members dissolves: the remaining member moves up, and the group's AND/OR and message are dropped. In a branch based on main, an inherited group dissolves in that branch only, is shown removed, and undo restores it. Groups are formed only from two or more rules, so an empty group never exists | CLAR 2026-10-24 #7 |
| F8 | FR-022b, EC-12, FR-021b | U23 6185:8847 | "This rule will be removed from Standard and from every variant that uses it (Ambulance, School transport)." | The dialog must not say "every variant". Branches that changed the rule keep their version, which then counts as added ("New addition"). The rest of the dialog stays as designed (#20) | CLAR 2026-10-24 #9 |
| F9 | FR-023b, US3-AS2, EC-15, FR-021d | U23 6185:41167/41610 vs 6185:8827; U23 6185:41180, 6185:41623 | Ambulance's Group 01 is AND and Standard's is OR, with no mark. Changed Rule 05 inside a removed parent has only an outline | Both are slips. The switched operator marks the group "Changed here" (as U18 6163:5438), and the changed rule carries the "Changed here" text mark (U18 6163:4884) | CLAR 2026-10-24 #10 |
| F10 | FR-019a, FR-018a | U29 6197:11646; U11 6348:40209–6348:40735 (no tabs) vs 6348:40882 | Variant tabs and "+ Add variant" appear only once the first rule is saved | The "Standard" tab and "+ Add variant" are there from the start of the rules step, before any rule exists | CLAR 2026-10-24 #11 |
| F11 | FR-006a, FR-006c, US1-AS6 | Inline errors (they stay): U11 6348:40758; U13 6357:42904; U24 6194:42246; U25 6196:10249, 6196:10533; U30 6324:15433; U31 6324:16931; U32 6324:17650. To change: U27 6197:10696, 6197:10714 | Incomplete rules are blocked only in the editor (Save rule disabled). U27's banner names the problem and the rule but not the branch, and Publish is disabled. The missing-message case is never drawn | Keep the editor's inline errors. Publish and Save stay enabled. While any branch has an incomplete condition, a missing message or a field that is no longer requested, they are refused with a message naming the problem, the rule and its branch (U27's banner plus the branch) | CLAR 2026-10-24 #15 |
| F12 | FR-006a, FR-006c | U33 6376:26181 | Non-blocking "1 warning on Ambulance" with "Check rules again" | Leave the warnings out until "Problems" (U22) is specified. The dialog is otherwise built per #23 | CLAR 2026-10-24 #15 |
| F13 | FR-029, US4-AS3, FR-006a | U10 6324:40071, 6324:40396 (copy "before you publish"); "Save and exit" U10 6324:40069, U27 6197:10714; older versions U09 6235:18711 (count only), U08 6242:18503 (removes without confirmation) | U10's dialogs name the rules and their branches, but afterwards only publishing is blocked, and "Save and exit" stays available | Build U10's dialogs for removing a document and for deselecting a field. The change applies. Publishing and saving are then refused while those rules remain (F11). No "Save and exit" | CLAR 2026-10-24 #16 |
| F14 | FR-001a, FR-001b, US1-AS3 | U36 6376:27409, 6376:27630; U10 6324:40069; U08 6235:17424; U09 6235:18684; U07 6235:16862 | "Publish without rules" on the Documents step, even while Standard and Ambulance have rules | Offer it only while no branch has any rule. Otherwise the documents step goes on to the rules step | CLAR 2026-10-24 #17 |
| F15 | FR-018a, FR-025b, FR-025f, EC-18, FR-026a, US3-AS7, ENT-Branch.pull_url, ENT-Connection URL.pull_url | U34 6396:48632–48649 (6396:48636); U37 6396:47732–47749; U38 6396:48993–49005 (6396:48997) | ".../result/standard" for the main branch, and slugs of the names for the others | These URLs are placeholders. The main branch keeps the connection's existing pull URL. Every other branch's pull URL carries an identifier fixed when the branch is added, never its name | CLAR 2026-10-24 #13 |
| F16 | FR-030a, FR-023a, FR-023b, FR-023c, FR-005, US1-AS1, ENT-Branch.rules | U37 6396:48222–48277, header 6396:47649, 6421:31777; U34 6396:48654; U38 6396:49011 | A collapsed summary with a flat numbered list per variant: no groups, no AND/OR, no marks, no removed items, and statements without the document | The details show each branch's rules read-only, in the layout of the rules step, one section per branch, with groups, AND/OR and the changed, removed and added marks. After publishing, the details open as in spec 001, with spec 001's header, status and actions | CLAR 2026-10-24 #14 |
| F17 | FR-030b, US4-AS1, US4-AS2 | U37 6424:34839; U34 6424:34919; U38 6424:34959, 6396:48909, 6396:49030 | A generic "Edit connection". Clicking an earlier step asks "Edit this live connection?" on entry. No edit-mode rules step is drawn | Changing the rules opens the rules step of spec 001's edit flow. That flow ends with saving and asks for confirmation when saving, not on entry | CLAR 2026-10-24 #14 |
| F18 | — (not in spec 002) | U33 6376:26181; U34 6383:66119, 6396:48549, 6396:48601, 6421:31811, 6421:31805, 6396:48606, 6396:48860; U36 6376:27630; U37 6396:47706; U38 6396:48967 | "Goes live" Now / On a date, "Schedule", a "Scheduled" status and screen, "Change go-live date" (also after going live) | No scheduling. Publishing goes live at once, as in spec 001 | CLAR 2026-10-24 #24 |
| F19 | — (not in spec 002) | U34 6396:48654–48663, 6421:31818; U37 6396:47705, 6396:47753–47763, 6396:47841, 6396:48527–48547; U38 6396:49011–49024 | Counters, a collapsible summary, "Download PDF", an activity log with actors, "Live since", "✓ Copied" | None of these extras; the activity log and the PDF export need a spec of their own. The "Copied" feedback follows spec 001 | CLAR 2026-10-24 #25 |
| F20 | — (touches FR-001b, FR-006a, FR-029) | "Draft" badge and "Save and exit" in every rules and documents frame (e.g. U11 6348:40210, 6348:40218; U10 6324:40069; U27 6197:10714); sticky step and variant bar U17 6148:4545, 6148:4674 | A Draft status, saving a draft and leaving, a sticky variant bar | Spec 001's wizard shell: no drafts, no "Save and exit", no Draft badge, and nothing sticky beyond spec 001's fixed header and action bar | CLAR 2026-10-24 #26, #16 |
| F21 | — (spec 001 scope; FR-029 is F13) | U06 6235:19048–19061; U07 6257:15055, 6242:18632, 6242:51053; U08 6235:18227, 6242:51200; U09 6235:18396, 6235:18757; U36 6376:27341 | Documents step redesign: search including "Upcoming" documents, suggestions, counters, pager, select-all, empty states, scroll containment, first-add animation, Remove on hover, Undo after removing | Spec 001's documents step, plus U10's dialogs (F13) | CLAR 2026-10-24 #26 |
| F22 | — (not in spec 002) | U11 6348:40520, 6348:40401; U12 6350:41628, 6350:42145; U24 6191:42209; U25 6197:11783; U31 6324:16762 | Rule editor aids: "Need other data? Add it in Documents", search in the data, class and option menus, "No options match "XL".", hints that repeat the entered value | Leave them out. The editor offers what spec 002 requires, including the FR-003g note (P1) | CLAR 2026-10-24 #26 |
| F23 | OUT-16 | U08 6235:18042 | "Age over 18" offered as driving-licence data | Remove it. "Age in years" and "Year of birth" stay as spec 001 catalog fields, which rules check as numbers | CLAR 2026-10-24 #27 |

## Build without frames (decided)
| # | req | expected surface | build from (nearest frame or KERN pattern) | decision |
|---|---|---|---|---|
| W1 | FR-020a, FR-020b, FR-020c, US3-AS9, FR-006b | Rules step: variant tabs, Add variant dialog | A KERN menu on each branch tab: rename every branch, Standard included, and delete every other branch after a KERN confirmation dialog. A missing or duplicate name is reported where it is entered, like U26 6197:12011 ("Enter a name for the variant.") and the rule-name error U15 6344:53413. FR-006 still refuses it at publish or save (F11) | CLAR 2026-10-24 #8 |
| W2 | FR-022b, EC-11, EC-12, EC-13, FR-021c, EC-14 | Rules step: branch based on main | The existing marks: "Changed here" (U18 6163:4884), "New addition" (U18 6163:4893), removed rows (U23 6185:8570), and unmarked linked rows under "Linked to Standard" (U17 6344:60005). EC-11: a rule the branch changed keeps its version and mark when main changes it. EC-12: when main deletes such a rule, the branch's version shows as added. EC-13: when main deletes a rule the branch removed, it disappears. FR-021c / EC-14: a rule added to main appears unmarked in based branches, and not in empty-started ones | CLAR 2026-10-24 #9, #21 |
| W3 | EC-17 | Rules step: a branch without rules | U29 6197:11646 (the "No rules yet" empty state) inside the branch's tab | CLAR 2026-10-24 #11 |
| W4 | FR-004c, ENT-Group.error_message, ENT-Sub-group.error_message | Rules step: group and sub-group headers | U14 6324:39410/39411 (message card under the group header, with pencil) and 6324:39419 (hint). The ⋯ menu of a group or sub-group (U14 6094:6413, 6094:6320) offers adding and removing the message | CLAR 2026-10-24 #12 |
| W5 | FR-026c | After publishing; Details | Spec 001's URL display: the trigger URL and one pull URL, without branch names. U37's Request link block (6396:47715–47721) with a single unlabelled Result link | CLAR 2026-10-24 #13 |

## Clarify questions
1. **Date of birth statement** (C1). CLAR 2026-10-24 #1 adopted the age wording "is at least / is less than / is exactly {years} old" for the Date of birth only. Figma's statement reads "Personal ID · Date of birth ≥ at least 21 years old" (U11 6348:40889, U14 6094:6469). U35 6376:26339 still says "… 21 years ago". The shared editor carries a hidden "old" suffix, also on Expiry date (U30 6324:15427, U31 6324:16760, U32 6324:17644). Options:
   - (a) Build the spec's text "Personal ID – Date of birth is at least 21 years old", keep the ≥ chip as styling, and correct U35 and the hidden suffix in Figma.
   - (b) Adopt Figma's form ("·" and a chip in place of "is") and amend FR-005's example.
   - (c) Drop the chip and use the spec's text verbatim?
2. **Hints next to date conditions** (P1, P2). The editor hints read "Today (23 Oct 2026) this means: born on or before 23 Oct 2005." and "If the date of birth is missing, the rule isn't met." (U11 6348:40754, 6348:40756; U12 6350:42724; U28 6197:10983). They appear only in the editor. FR-003g wants a note next to the years-ago conditions saying that years count back from the day of sharing. FR-014a (UI N) also covers unreadable values, reported as "couldn't be checked". CLAR 2026-10-24 #2 ("counted forward from the day of sharing") and #3 (no fallback) don't settle this copy. Options:
   - (a) Reword the editor hint to "Counted back from the day the applicant shares. Today (…) this means…", and add "or can't be read" to the missing-value hint.
   - (b) Do (a), and also show the note next to saved years-ago conditions.
   - (c) Keep Figma's hints and amend FR-003g?
3. **Duplicate rule names** (B1). CLAR 2026-10-24 #18 says a name that would appear twice in a branch is refused with a message that names the branch. Figma rejects it inline with "Another rule is already called Rule 01." (U15 6344:53413, U26 6196:10710), without the branch. Options:
   - (a) Add the branch to the inline message ("… in Ambulance").
   - (b) Keep Figma's message, since the editor sits in the branch's tab, and amend FR-005.
   - (c) Keep the inline message as designed, and name the branch only in FR-006's refusal at publish or save?
4. **Publishing with an unsaved rule open** (B2). CLAR 2026-10-24 #19 says that publishing or saving first asks whether to keep or discard a rule editor's unsaved changes. Figma keeps "Publish without rules" enabled next to an open editor (U11 6348:40759, U24 6191:42283, U32 6324:17651). It draws the keep/discard dialog only for leaving an editor (U28 6197:10988). Options:
   - (a) Reuse U28's dialog on Publish and Save, with no new frame, and base the footer label on saved rules only.
   - (b) Design a dedicated frame.
   - (c) Disable Publish while an editor has unsaved changes, and amend the decision?

## Coverage
Status per requirement with `UI = Y`. Units with a PARTIAL or CONFLICT row are marked (P) or (C). A ? marks a unit's own confidence below 70%. "adopted #n" means that CLAR 2026-10-24 #n amended the spec to Figma's version, which closes that unit's partial.

| req-id | status | units |
|---|---|---|
| FR-001a | COVERED | U07–U38 (U06 ?, 60%) |
| FR-001b | PARTIAL → F14, F20 | U07, U09, U11, U13–U15, U17, U21, U23–U26, U28–U32, U34, U36; U08, U09, U10, U36 (P, Documents shortcut); U29 (P, Save and exit) |
| FR-002a | COVERED | U11–U17, U20, U24–U27, U29–U32, U34; U17, U21, U26, U28 (P, condition wording → C1) |
| FR-002b | COVERED | U11, U12, U13 ?, U30, U31 |
| FR-002c | CONFLICT → F3, F4 | U12, U15, U20, U24, U25, U28; U14, U17, U19, U21, U23, U30 (P); U13, U31 (C) |
| FR-002d | COVERED | U11, U12, U24, U25, U27, U32; U08 ? |
| FR-003a | CONFLICT → F1, F2, F5; open C1 | U25, U30, U31, U32; U12, U26 (P); U11, U16 ?, U17, U20, U21, U23, U25 ?, U27, U28, U30, U33 ? (C) |
| FR-003b | CONFLICT → F3 | U31 (C) |
| FR-003c | CONFLICT → F4 | U13 (C, P), U31 (C) |
| FR-003d | PARTIAL → F5 | U12, U15, U20, U24, U25, U28; U12, U14, U16–U19, U21, U23–U25, U27, U31, U33, U37 (P); U30 (C, "has class" → F2) |
| FR-003f | CONFLICT → F1; open C1 | U30, U35; U11, U12, U14, U15, U19, U21, U25, U26, U30, U32 ?, U34 (P); U11, U16 ?, U17, U18 ?, U20, U21, U23, U25 ?, U27, U28, U33 ?, U37 (C) |
| FR-003g | PARTIAL → open P1 | U28; U11, U12, U15, U25, U26, U30 (P) |
| FR-003h | CONFLICT → F2 | U12, U15, U20, U24–U26, U28, U30; U14, U17, U19, U21, U23, U33 ?, U35, U37 (P); U12, U30, U37 (C) |
| FR-003i | COVERED | U32; U08 ?, U13 ?; U11 (P, the parts appear in U32's part picker) |
| FR-004a | COVERED | U11–U38 (all Rules-step units) |
| FR-004b | PARTIAL → F6 | U11, U12, U13, U24, U26, U28, U30, U31, U32; U25 (P) |
| FR-004c | PARTIAL → W4 | U14 (group message only, no control) |
| FR-005 | CONFLICT → F2, F4, F16; open C1 | U18, U23, U26, U33, U35; U11, U12, U14, U15, U17, U19, U21, U26, U27, U34 (P); U17, U18 ?, U23, U28, U37 (C) |
| FR-006a | PARTIAL → F11, F12, F13 | U27; U11, U13 ?, U24, U25, U27 ?, U30, U31, U32, U33 (P); U27 (C, empty group → F7) |
| FR-006b | PARTIAL → W1 | U26 (missing name inline, adopted #8); U26 (P) |
| FR-006c | PARTIAL → F11 | U27; U11, U24, U25, U27, U32, U33 (P) |
| FR-007a | COVERED | U12, U14–U16, U18, U20, U21, U23, U26, U28, U33–U35; U17, U19, U27 (P) |
| FR-007b | COVERED | U14–U16, U18, U20, U21, U23, U26, U28, U33–U35 |
| FR-007c | COVERED | U12, U14 (6094:7052 "Applies to every rule in Group 01"), U16, U18, U20, U21 ?, U23, U28; U15 ?, U17 ?, U19, U27 ? (P, settled by U14) |
| FR-008a | COVERED | U14–U21, U23, U26, U28 ?, U33 |
| FR-008b | COVERED | U14–U18, U20, U21, U23, U26, U28, U33; U27 (P → F7) |
| FR-008c | COVERED | U14–U21, U23, U26, U28, U33; U27 (P) |
| FR-008d | COVERED | U14, U16, U18–U21, U23, U26; U15 ?, U17 ? |
| FR-008e | CONFLICT → F7 | U15, U16, U20 ?, U28 ?; U23 (P); U14, U27, U28 (C) |
| FR-008f | CONFLICT → F7 | U19 (P, adopted #10); U23 (C) |
| FR-013a | PARTIAL → F4 | U13, U31 (P) |
| FR-013c | PARTIAL → F4 | U13, U31 (P) |
| FR-018a | PARTIAL → F10, F15 | U10–U12, U14–U21, U23, U26–U28, U33–U35; U29, U34, U37, U38 (P) |
| FR-019a | PARTIAL → F10 | U11, U12, U14–U21, U23, U26–U28, U33–U35; U29 (P) |
| FR-019b | COVERED | U17, U26 |
| FR-020a | SPEC-ONLY → W1 | — |
| FR-020b | SPEC-ONLY → W1 | — |
| FR-020c | SPEC-ONLY → W1 | — (U17 #23 at 40% is on rule menus, not counted) |
| FR-021a | COVERED | U17–U21, U23, U26, U33 |
| FR-021b | COVERED → F8 | U17–U21, U23, U26; U19 (P, adopted #10); U23 (P) |
| FR-021c | PARTIAL → W2 | U20 (P; copy semantics adopted #21) |
| FR-021d | PARTIAL → F9 | U21 ?, U35; U23 (P) |
| FR-022a | COVERED | U17–U21, U23, U26; U19 (P, adopted #10), U20 (P, adopted #21) |
| FR-022b | PARTIAL → F8, W2 | U23 (P) |
| FR-023a | COVERED (Rules step) → F16 | U17–U21, U23, U33; missing on Details (U37) |
| FR-023b | COVERED (Rules step) → F9, F16 | U17–U21, U23, U33; U23 (P) |
| FR-023c | COVERED → F7, F16 | U18, U19, U21, U23; U23 (C, dissolved groups) |
| FR-024a | COVERED | U18, U23; U19 (P, adopted #20); U17 ? |
| FR-024b | COVERED | U23 (whether restoring a group also restores its inner removals isn't drawn) |
| FR-025b | PARTIAL → F15 | U34, U37, U38; U17 ?; U37 (P) |
| FR-026a | PARTIAL → F15 | U34, U37, U38; U35 (P, adopted #14, #23); U37 (P) |
| FR-026b | COVERED | U34, U37, U38 |
| FR-026c | SPEC-ONLY → W5 | — |
| FR-029 | PARTIAL → F13 | U10; U06, U07, U09, U10, U27 (P) |
| FR-030a | PARTIAL → F16 | U34, U37, U38 (P) |
| FR-030b | PARTIAL → F17 | U34, U37, U38 (P) |
| FR-031 | COVERED | U13–U15, U17, U19, U23, U27, U29; U10, U20, U24, U25, U36, U38 ? (signed-in view only; no frame for other roles) |
| US1-AS1 | PARTIAL → F16 | U11, U16, U21, U35; U11 (P, wording → C1), U35 (P, adopted #14), U37 (P) |
| US1-AS2 | COVERED | U11, U25, U31; U12 (P → F2); U08 ? |
| US1-AS3 | PARTIAL → F14 | U09, U11, U13, U24–U26, U28–U32, U35; U08, U10, U36 (P) |
| US1-AS6 | PARTIAL → F11 | U27; U24, U25, U31 (P) |
| US2-AS1 | COVERED | U14, U18, U20, U21, U26, U28; U12 ?; U15 ?, U17 ?, U19, U27 ? (P, settled by U14) |
| US2-AS6 | COVERED | U14, U15, U18–U21, U23, U26; U17 ? |
| US2-AS7 | CONFLICT → F7 | U14, U15, U16 ?, U20 ?, U27 ?; U23 (P); U14 (C) |
| US3-AS1 | COVERED | U17, U20 |
| US3-AS2 | COVERED → F9 | U17–U20, U33; U23 (P) |
| US3-AS3 | COVERED | U20 (static only: the propagation itself isn't drawn) |
| US3-AS4 | COVERED | U17–U21, U23, U33 |
| US3-AS5 | COVERED | U18, U23 |
| US3-AS6 | COVERED | U17, U26 |
| US3-AS7 | PARTIAL → F15 | U37, U38; U37 (P) |
| US3-AS9 | SPEC-ONLY → W1 | — |
| US4-AS1 | PARTIAL → F17 | U15, U20, U38; U37, U38 (P) |
| US4-AS2 | PARTIAL → F17 | U38 (P) |
| US4-AS3 | PARTIAL → F13 | U10; U06, U07, U09, U10 (P) |
| EC-8 | CONFLICT → F3, F4 | U12, U15, U20, U25, U28; U14, U17, U19, U21 (P); U13, U31 (C) |
| EC-9 | CONFLICT → F7 | U14, U15, U16, U20 ?; U14, U27, U28 (C) |
| EC-11 | SPEC-ONLY → W2 | — |
| EC-12 | PARTIAL → F8, W2 | U23 (P) |
| EC-13 | SPEC-ONLY → W2 | — |
| EC-14 | COVERED → W2 | U17, U26 (started-empty half); U20 (P, adopted #21) |
| EC-15 | COVERED → F9 | U18; U19 (P, adopted #10); U23 (P) |
| EC-16 | CONFLICT → F7 | U23 (C) |
| EC-17 | SPEC-ONLY → W3 | — |
| ENT-Rule.document | COVERED | U11–U13, U17, U23–U25, U30–U32; U20, U21, U28 (P, wording) |
| ENT-Rule.field | COVERED | U11, U13, U17, U23–U25, U30–U32; U12 (P → F2) |
| ENT-Rule.condition | COVERED → F1; open C1 | U13, U23, U24, U30–U32; U12, U14, U19, U21, U28 (P); U11, U17 (C) |
| ENT-Rule.error_message | COVERED | U11–U33 (Rules-step units) |
| ENT-Rule.branch | COVERED | U11, U17, U20, U21 |
| ENT-Rule.parent | COVERED | U15–U17, U20, U21 |
| ENT-Group.members | CONFLICT → F7 | U14, U16–U18, U20, U21; U14, U27, U28 (C) |
| ENT-Group.operator | COVERED | U14–U21, U23, U26, U28, U33 |
| ENT-Group.error_message | COVERED → W4 | U14 (no add or remove control) |
| ENT-Sub-group.members | COVERED | U14, U15, U17, U18, U20, U28 |
| ENT-Sub-group.operator | COVERED | U14, U17–U20, U23, U26, U28, U33 |
| ENT-Sub-group.error_message | SPEC-ONLY → W4 | — |
| ENT-Branch.name | COVERED | U10–U12, U14, U16–U21, U23, U26–U28, U33, U34, U38 |
| ENT-Branch.rules | COVERED (Rules step) → F16 | U17–U21, U23; U37 (P, Details) |
| ENT-Branch.operator | COVERED | U12, U14, U18, U20, U21, U28, U34; U15 ?, U17 ? (P) |
| ENT-Branch.pull_url | PARTIAL → F15 | U34, U38; U37 (P) |
| ENT-Branch.origin | COVERED | U17–U21, U23, U26, U33 |
| ENT-Branch Change.item | COVERED | U17, U18, U20, U21 |
| ENT-Branch Change.kind | COVERED | U17–U21, U23, U33 |
| ENT-Branch Change.undoable | COVERED | U18, U23; U19 (P, adopted #20) |
| ENT-Form Connection.branches | COVERED → F16 | U17–U21, U23, U33; U37 (P) |
| ENT-Connection URL.trigger_url | COVERED | U34, U37, U38 |
| ENT-Connection URL.pull_url | PARTIAL → F15 | U34, U38; U34, U37 (P) |

Requirements with `UI = N` that units touched (FYI):
- FR-003e: U12 covered; U25 and U31 partial → F5.
- FR-009a: U15, U21.
- FR-009c / EC-1: U11, U29, U36.
- FR-010d: U27.
- FR-011b / US2-AS4: U14, U21.
- FR-012a: U11, U12, U30 partial → P1.
- FR-012b: U30 partial → F1.
- FR-012c / EC-2: U11 covered; U30 partial → F1.
- FR-013d: U13, U31.
- FR-014a / EC-5: U11, U28, U30 partial → P2; U30 conflict → F2.
- FR-014b / EC-6: U12 covered → F2.
- FR-019c: U07, U33.
- FR-025a: U34, U37, U38.
- FR-025f / EC-18: U34, U38 partial → F15.
- FR-028a: U38.
- ENT-Document Request.trigger: U37.
- ENT-Document Request.evaluated_branch: U17 ?.

## Not audited
| UNIT-ID | name | status | coverage gap |
|---|---|---|---|
| U01 | Log in (empty, filled, wrong, forgot, loading, logged out) | OUT | Spec 001 sign-in. It would show FR-031's signed-out side, which no audited unit shows |
| U02 | Your connections (list, user menu, delete/edit dialogs) | OUT | Spec 001 overview. Its edit entry bears on F17 (FR-030b, US4) |
| U03 | Save and exit (saving, draft saved) | OUT | Drafts: "Save and exit" is dropped (F20, CLAR 2026-10-24 #16, #26) |
| U04 | Log out with unsaved changes | OUT | Spec 001 shell |
| U05 | Create connection (first, filled, info, empty, Form ID used, returning) | OUT | Spec 001 create step |
| U22 | Problems: contradiction, duplicate, suggestion | OUT | Marked "later: not in spec yet". The publish dialog's warnings it would define are left out (F12, CLAR 2026-10-24 #15) |
| U39 | Deactivate / delete connection (menu, dialogs, deactivated, after delete) | OUT | Spec 001 lifecycle. Bears on FR-027c / EC-19 (UI N) and on the connection actions menu of the published page (F16, F18) |

No unit is UNCERTAIN, FAILED or RATE_LIMIT.
