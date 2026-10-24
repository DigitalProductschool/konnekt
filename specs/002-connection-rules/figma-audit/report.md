# Figma ↔ spec audit — 2026-10-24

Spec: `specs/002-connection-rules/spec.md` · Figma file `s8mU9oJDq3411e8bxMjQO9`, root 6263:12360 · Glossary: variant = branch, "Standard" = main branch, "Request link" = trigger URL, "Result link" = pull URL.

Design decisions are cited as `CLAR 2026-10-24 #n`, where n is the answer's position in spec.md's Clarifications, Session 2026-10-24. That session has 31 answers, all raised by the earlier audit of the design. The 2026-10-22 and 2026-10-23 sessions never mention the design, so they settle nothing here. This merge uses requirements.md, rebuilt after Session 2026-10-24, and the 32 IN units remapped against it.

## Summary
Units audited 32/39 (OUT 7, UNCERTAIN 0, FAILED 0). Figma calls 0. This run only remapped; the inventories come from the earlier full run.

| category | count |
|---|---|
| CONFLICT | 0 |
| SPEC-ONLY (not in Figma) | 1 |
| FIGMA-ONLY behavioural | 3 |
| PARTIAL | 2 |
| FIGMA-ONLY cosmetic | 8 |
| Figma must change (decided) | 28 |
| Build without frames (decided) | 6 |

Clarify questions: 4.

Coverage of the 143 requirements with `UI = Y`: COVERED 83, PARTIAL 21, CONFLICT 26, SPEC-ONLY 13. Every CONFLICT now points to a settled F# item. The open items are listed below.

Top 5 issues (open items only):
1. **S1 – Identifiers on the details (FR-010h, P1).** No frame shows a rule's or group's identifier, and no decision says where or how to show it.
2. **B1 – Rename keyboard contract.** U15 has the hint "Enter saves · Esc cancels", but no requirement or decision covers it.
3. **B2 – Cancelling select mode for grouping** (U16, U19). No requirement or decision covers it.
4. **B3 – Toast after copying a rule**, with a "Show" link to the target variant (U20). CLAR #21 doesn't mention it.
5. **P1 – From-now wording.** CLAR #2 added the from-now conditions in the spec's words ("is at least 6 months from now"). Every saved row and the editor still say "at least 6 months left".

The following are closed **as designed**, because the decision adopts the design or calls it UI detail. They are not counted above:
- The age wording for the Date of birth (#1). The remaining differences are F6.
- The from-now conditions (#2). Their wording is still open as P1.
- "includes one of" / "includes none of" (#6).
- The editor's inline errors and its disabled "Save rule" (#15, #19).
- The Add variant missing-name error (#8).
- U10's dialogs, including their per-branch rule count (#16).
- Rule, group and sub-group names, and renaming them (#18).
- Save rule / Cancel, the "Rule 01 saved." toast and the leave guard (#19).
- Duplicate, the delete confirmation, undo toasts after deleting or grouping, Restore-only menus, and the notice after switching AND/OR (#20).
- Grouping in one branch only (#10).
- Copy to variant (#21).
- The optional branch description in the (i) tooltip (#22).
- The "Ready to publish?" summary, "Publishing…", "Couldn't publish" with Try again, "Check rules again" and the close X (#23).
- The success dialog opening the details (#14).

## Conflicts
| # | req | Figma (unit, node-id) | conflict |
|---|---|---|---|
| — | — | — | None open. All 26 conflicting req-ids are settled (F1–F28) |

## Spec-only (not in Figma)
| # | req | prio | expected surface | note |
|---|---|---|---|---|
| S1 | FR-010h, ENT-Rule.identifier, ENT-Group.identifier, ENT-Sub-group.identifier | P1 | Details | No unit shows an identifier (U37 and U38 list it as missing). CLAR #18 defines identifiers (set by the system, never reused) and #14 the details' layout. Neither says how the details show them, and the rules-step layout that #14 points to has no identifier either. Not settled |

## Figma-only — behavioural
| # | item | where (units, node-ids) | suggested requirement |
|---|---|---|---|
| B1 | Inline rename field with the hint "Enter saves · Esc cancels" | U15 6344:53364, 6344:53389, 6344:53505 | UI detail of FR-005c renaming. No decision covers it: #18 adopts the names, not the field |
| B2 | "Cancel" leaves grouping select mode without grouping | U16 6344:53544; U19 6344:53768 | UI detail of FR-008a. #20 covers undo after grouping, not select mode |
| B3 | Success toast "Rule 06 copied to School transport." with a "Show" link to the target variant | U20 6344:54042 | UI detail of FR-022e. #21 settles what a copy is, not its feedback |

## Partial matches
| # | req | where | difference |
|---|---|---|---|
| P1 | FR-003j, FR-005a, FR-003a, ENT-Rule.condition (CLAR #2, #28) | Saved rows: U14 6094:6521; U15 6344:53333; U16 6344:53522; U17 6134:8527, 6134:9078; U18 6163:4865; U19 6344:53716; U20 6344:53893; U21 6168:7020; U23 6185:8570, 6185:8821; U27 6197:11419; U28 6197:11076. Editor: U30 6324:15667–15670 | As amended by #2, the spec says "is at least / is less than N years or months from now". Figma says "≥ at least 6 months left": no "is", and "left" instead of "from now". #2 adopted the design's time-left condition but in the spec's words, and #28 rules only on the Date of birth statement, so the wording isn't settled |
| P2 | FR-006d, FR-006a (CLAR #15) | U25 6196:10398, 6196:10533 | The editor rejects "0" with "Enter a number greater than 0.". The spec has no value range, and FR-006a refuses only an incomplete condition, a missing message or an unrequested field. #15 keeps the editor's errors "as the design shows" but doesn't say whether this one also blocks publishing |

## Figma-only — cosmetic (FYI)
| # | item | where |
|---|---|---|
| K1 | Hover and selection styling: red trash on hover, outlined active editor, scrolling field area | U10 6324:40012; U13 6357:42890; U07 6235:17134 |
| K2 | Hidden layers: the rules card header, the "Hints" slots (their content is F7), hidden pickers | U11 6348:40215; U13 6357:42628; U24 6191:42071, 6191:42083; U32 6324:17633, 6324:17647 |
| K3 | Help tooltips: "What is a variant", (i) on Request link and Result link, (i) on based variant tabs (the description tooltip of #22) | U17 6151:33809; U21 6168:7013; U26 6197:11978, 6197:12011; U27 6197:10691; U38 6396:48977, 6396:48991; U18 6163:4857; U23 6185:8905 |
| K4 | Visual grammar: AND filled and OR outlined, plain-language group subtitles, faded connectors next to removed items, one dropdown per connector. U14 6094:7052 ("Applies to every rule in Group 01") shows that the whole level switches, so FR-007c holds | U14 6094:7052; U15 6344:53460; U17 6134:8526; U19 6344:53715; U23 6185:8569; U27 6197:10703 |
| K5 | Link-strip counter "2 of 3 Standard rules are removed here." | U21 6344:60075; U23 6344:60085 |
| K6 | Sample-data slips: the wrong message on Rule 02 after grouping; description samples that differ; a 506 px footer; a dangling AND; a link icon only inside the new group; a faded sub-group "Add rule" in a removed group; counts that disagree (5 vs 6 rules, 7 vs 6 data items); V4 and V4b enabling the footer differently; "Published page" vs "connection page" | U16 6344:53613; U17 6139:32939, 6148:4702; U19 6344:53865, 6344:53871; U23 6185:41182; U33 6376:26181; U36 6376:27630; U08 6242:51124; U35 6376:26662 |
| K7 | Static copy and frames: page headings, frame names, scrollbar, illustration, URL truncation (the copy action must still copy the full URL) | U08 6235:17251; U21 6168:7004; U26 6274:33733; U34 6396:48607; U37 6396:47748 |
| K8 | Spec 001 elements, built as spec 001 has them: "Back", the Live badge and success card, "Create new connection", the connection name in the header | U25 6196:10256; U29 6198:12366; U36 6376:27409; U38 6396:48910, 6396:48956; U34 6424:34919; U37 6424:34839, 6396:47649 |

## Figma must change (decided)
Build these as the spec says, keeping Figma's layout and styling, until the design is updated.

| # | req | Figma (unit, node-ids) | Figma shows | build instead | decision |
|---|---|---|---|---|---|
| F1 | FR-003f, FR-003j, FR-003a, FR-012c, FR-012e, OUT-25 | U11 6348:40681, 6348:40539; U30 6324:15613, 6324:15429. Unit pickers: U12 6350:42585, U25 6196:10399, U26 6196:10579–10584, U28 6197:10974 | "at least" (≥) and "at most" (≤) for both time passed and time left. A years/months unit on every duration. No "is exactly", no "is less than … ago", no "is (a date)". "before"/"after" without "is". A hint that leaves out the from-now conditions | The six conditions of FR-003: is before, is after, is (a date); is at least, is less than, is exactly N years ago, in whole years. Every date field, the Date of birth included, also offers "is at least" and "is less than" N years or months from now (wording: P1). No "at most". Months only on the from-now conditions | CLAR 2026-10-24 #2 |
| F2 | FR-003h, FR-003a, FR-003d, FR-014a, FR-014b, EC-5, EC-6, US1-AS2, ENT-Rule.field, OUT-28, OUT-29 | U12 6350:41548, 6350:41890/41892/41904, 6350:42064, 6350:42352, 6350:42724, 6350:42725, 6350:42948; U30 6324:16305, 6324:16308, 6324:16410, 6324:16310; U35 6376:26342; U37 6396:48235/48251/48267 | Compound checks "has held class B for at least 2 years" and "has class B valid today / on the day of sharing". No per-class parts. "BE, C and D licences always include class B". A class without an expiry date falls back to the licence's. "Counted from the date class B was first issued" | Licence classes are checked through their parts only. The held classes are an enum ("includes one of" / "includes none of"). "Licence class B – Issue date" and "– Expiry date" are dates with F1's conditions, e.g. "Driving licence – Licence class B – Issue date is at least 2 years ago". No fallback. Only a licence that lists class B meets a rule on class B | CLAR 2026-10-24 #3 |
| F3 | FR-003b, FR-002c, EC-8, OUT-26 | U31 6324:17134, 6324:17198/17199/17201/17304, 6324:17203 | at least, at most, between (two values, "Both numbers count") | is greater than, is less than, is equal to, is not equal to. All strict, one value each. A range takes two rules | CLAR 2026-10-24 #4 |
| F4 | FR-003c, FR-013a, FR-013c, FR-002c, EC-8, FR-005a, OUT-27 | U13 6357:42841, 6357:42895, 6357:43063, 6357:42900, 6357:42901; U31 6324:16757, 6324:16762, 6324:16763 | is / is not / starts with. Two values in one text rule ("Met if … any of these"). Letter case always ignored, with no control | is equal to, is not equal to, contains, doesn't contain, one value each. Each condition has its own letter-case choice, which ignores letter case by default, and the saved rule says whether letter case counts. "Lives in Stuttgart or Esslingen" takes two rules in an OR group. Spaces at either end are still ignored | CLAR 2026-10-24 #5 |
| F5 | FR-003d, FR-003a, FR-003e, FR-005a, US1-AS2 | U12 6350:41850; U27 6197:10699; U31 6324:17577, 6324:17370; U37 6396:48274 | "includes" / "doesn't include". Nationality as a separate "List" kind. Hint "The rule checks all of them." | "includes one of" / "includes none of" for every enum field, Nationality included. Met if any (or none) of the citizen's values is in the set. Rows that already say so stay (U14 6094:6357, U24 6191:42079, U27 6197:10706) | CLAR 2026-10-24 #6 |
| F6 | FR-005a, FR-005b, FR-003k, FR-003a, US1-AS1, ENT-Rule.condition | U11 6348:40749–40752, 6348:40889; U12 6350:41102; U14 6094:6469, 6094:6276; U15 6344:53330; U16 6344:53519; U17 6134:8524, 6134:8544; U18 6163:4862; U19 6344:53713; U20 6344:53890; U21 6168:7017; U23 6185:8567, 6185:41180; U25 6196:10397–10400; U26 6197:11982; U27 6197:11416; U28 6197:11073, 6197:11090; U33 6376:25788; U34 6383:66110; U37 6396:48228/48244/48260. "years ago" for the Date of birth: U35 6376:26339. Hidden "old" on other fields: U30 6324:15427; U31 6324:16760; U32 6324:17644 | "Personal ID · Date of birth ≥ at least 21 years old". "21 years ago" in U35. An "old" suffix in the shared editor | "Personal ID – Date of birth is at least 21 years old", and the same "Document – Field condition" form for every statement. ≥ and < stay as decoration, hidden from assistive technologies. "… years old" for the Date of birth only; other dates keep "years ago" | CLAR 2026-10-24 #28, #1 |
| F7 | FR-003g, FR-003l, FR-014c, FR-014a, EC-5 | U11 6348:40754, 6348:40756; U12 6350:42726; U28 6197:10983, 6197:10984; U30 6324:15673. Hints hidden in U25 6196:10401 and U26 6196:10585 | "Today (23 Oct 2026) this means: …" without the counting note. "If the date of birth is missing, the rule isn't met." | In the rule editor, next to every date condition: "Counted from the day the applicant shares. Today (…) this means: …" and "If the {field} is missing or can't be read, the rule isn't met and is reported as couldn't be checked." Saved rules don't repeat them. U30 6324:15672 is already right | CLAR 2026-10-24 #29 |
| F8 | FR-004b | U25 6196:10254, 6196:10405 | A proposed message before any condition is chosen, and "at least 21 years old" while 0 is entered | Propose the message once the condition is complete, matching it as entered | CLAR 2026-10-24 #19 |
| F9 | FR-006g, FR-006e, FR-006f, FR-001b | U11 6348:40236, 6348:40255, 6348:40542, 6348:40759; U13 6357:42905; U24 6191:42089, 6191:42283; U25 6196:10256, 6196:10407, 6197:11782; U26 6196:10591; U28 6197:10987; U30 6324:15434; U31 6324:16767, 6324:16932, 6324:17208, 6324:17375; U32 6324:17651. Dialog to reuse: U28 6197:10988 | "Publish without rules" stays enabled next to an open, unsaved rule. The keep/discard dialog appears only when leaving the editor | While an editor is open, the button says "Publish" ("Save" in the edit flow). With unsaved changes, Publish and Save first show U28's "Save changes to Rule 01?". "Save changes" keeps the rule even if it is incomplete, and FR-006 then refuses it. "Discard" drops the changes. Publishing or saving then continues. The editor's disabled "Save rule" stays | CLAR 2026-10-24 #31 |
| F10 | FR-008e, FR-008f, EC-9, EC-16, EC-27, US2-AS7, ENT-Group.members, ENT-Branch Change.dissolved_group, FR-023c, OUT-31 | U14 6113:29148; U23 6185:41610/41611/41613/41627; U27 6197:11425, 6197:11431, 6197:11434; U28 6197:11080 | Groups with one member or none persist, offer "+ Add rule" and "Add a sub-group", and can be published. Group 01 stays active in Ambulance after Sub-group 01 is removed | A group or sub-group left with fewer than two members dissolves: the remaining member moves up, and the group's AND/OR and message are dropped. In a branch based on main, an inherited group dissolves in that branch only, is shown removed (as U23 6185:41167), and comes back when the removal is undone. A group formed in the branch shrinks or dissolves when main removes its rules. No new frames | CLAR 2026-10-24 #7 |
| F11 | FR-022b, EC-12, FR-021b | U23 6185:8847 | "This rule will be removed from Standard and from every variant that uses it (Ambulance, School transport)." | The dialog must not say "every variant": branches that changed the rule keep their version, which then counts as added. The rest of the dialog stays (#20) | CLAR 2026-10-24 #9 |
| F12 | FR-023b, EC-15, FR-021d, US3-AS2 | U23 6185:41167/41610 vs 6185:8827; U23 6185:41180, 6185:41623 | Ambulance's Group 01 is AND and Standard's is OR, with no mark. The changed Rule 05 inside a removed group has only an outline | Both are slips. The group gets "Changed here" (as U18 6163:5438), and the rule gets the "Changed here" text mark (U18 6163:4884) | CLAR 2026-10-24 #10 |
| F13 | FR-019d, FR-019a, FR-018a | U11 6348:40209–6348:40735 (the tabs appear only at 6348:40882); U29 6197:11646, 6197:11652; U13 6357:42628; U24 6191:42071; U32 6324:17633 | Variant tabs and "+ Add variant" appear only once the first rule is saved | The "Standard" tab and "+ Add variant" are there from the start of the rules step: in the empty state and while the first rule is edited | CLAR 2026-10-24 #11 |
| F14 | FR-006a, FR-006c, FR-005f, US1-AS6 | U27 6197:10696, 6197:10714 | The banner names the problem and the rule but not the branch. Publish is disabled before any attempt | Publish and Save stay enabled. While any branch has an incomplete condition, a missing message or a field that is no longer requested, they are refused with a message naming the problem, the rule and its branch (U27's banner plus the branch). The editor's inline errors stay | CLAR 2026-10-24 #15 |
| F15 | FR-006a, FR-006c, OUT-32 | U33 6376:26181 | A non-blocking "1 warning on Ambulance" in the publish dialog | Leave the warnings line out until "Problems" (U22) is specified. The rest of the dialog follows #23 | CLAR 2026-10-24 #15 |
| F16 | FR-029, US4-AS3, FR-005f, FR-006a, OUT-34 | U10 6324:40071, 6324:40396 (copy "before you publish"); U09 6235:18711, 6235:18757; U06 6235:19061; U07 6242:18487, 6235:16997; U08 6242:18503, 6235:17317 | U10's dialogs name the rules and their branches, but afterwards only publishing is blocked. U09 gives a count only and removes the document at once. U07 and U08 remove or deselect without any notice | Build U10's dialogs for removing a document and for deselecting a field. The change applies once confirmed. Publishing and saving are then refused while those rules remain (F14), in both the create and the edit flow | CLAR 2026-10-24 #16 |
| F17 | FR-001c, FR-001b, US1-AS3 | U09 6235:18684, 6235:18396; U10 6324:40069, 6324:40394 | "Publish without rules" on the Documents step while Standard and Ambulance have rules | Offer it only while no branch has any rule. Otherwise the documents step goes on to the rules step. U07, U08 and U36 show the allowed state | CLAR 2026-10-24 #17 |
| F18 | FR-018a, FR-025f, FR-025g, EC-18, FR-026a, US3-AS7, ENT-Branch.pull_url, ENT-Connection URL.pull_url | U34 6396:48632–48649 (6396:48636); U37 6396:47732–47749; U38 6396:48993–49005 (6396:48997) | ".../result/standard" for the main branch, and slugs of the names for the others | These URLs are placeholders. The main branch keeps the connection's existing pull URL. Every other branch's pull URL carries an identifier fixed when the branch is added, never its name. The labels and "Copy link" stay | CLAR 2026-10-24 #13 |
| F19 | FR-030a, FR-023a, FR-023b, FR-023c, FR-005a, FR-005c, FR-020e, US1-AS1, ENT-Branch.rules, ENT-Rule.name, ENT-Form Connection.branches | U37 6396:48222–48277, 6396:47756, 6396:48197, 6421:31777; U38 6396:49011; U34 6396:48654 | A collapsible summary with a flat numbered list per variant: no groups, no AND/OR, no marks, no removed items, no names (only "01"), no descriptions, and statements without the document | Spec 001's details, plus each branch's rules read-only in the layout of the rules step, one section per branch. They show groups, AND/OR, the changed, removed and added marks, rule names, statements as in F6, and the branch description with its name. Identifiers are still open (S1) | CLAR 2026-10-24 #14, #22 |
| F20 | FR-030b, FR-030c, US4-AS1, FR-028a, OUT-33 | U37 6424:34839; U34 6424:34919; U38 6424:34959, 6396:48909, 6396:49030 | A generic "Edit connection". Clicking an earlier step asks "Edit this live connection?" on entry | Changing the rules opens the rules step of spec 001's edit flow, with no dialog on entry. The flow ends with saving, which asks for confirmation in spec 001's save dialog, extended per #23. U38's body copy fits there | CLAR 2026-10-24 #14 |
| F21 | OUT-18 | U33 6376:26181; U34 6383:66119, 6396:48549, 6396:48601, 6421:31811, 6421:31805, 6396:48606, 6396:48739, 6396:48860; U36 6376:27630; U37 6396:47706; U38 6396:48967 | "Goes live" Now / On a date, "Schedule", a "Scheduled" status and screen, "Change go-live date" | No scheduling. Publishing goes live at once, as in spec 001 | CLAR 2026-10-24 #24 |
| F22 | OUT-19, OUT-20, OUT-22, FR-026b | U34 6396:48654–48663, 6421:31818; U37 6396:47705, 6396:47753–47763, 6396:47841, 6396:48527–48547; U38 6396:48964, 6396:49011–49024 | Counters, "Download PDF", an activity log with actors, "Live since", "✓ Copied" | None of these extras. The "Copied" feedback follows spec 001 | CLAR 2026-10-24 #25 |
| F23 | OUT-23, OUT-24 | The "Draft" badge and "Save and exit" in every wizard frame (e.g. U11 6348:40210, 6348:40218; U10 6324:40069; U27 6197:10714; U35 6376:26327). Sticky bars: U17 6148:4674, U06 6235:19052 | A Draft status, saving a draft and leaving, a sticky step and variant bar | Spec 001's wizard shell: no drafts, no "Save and exit", no Draft badge, and nothing sticky beyond spec 001's header and action bar | CLAR 2026-10-24 #26, #16 |
| F24 | OUT-24 | U06 6235:19050–19061; U07 6257:15055, 6257:15064, 6242:18632, 6242:50494, 6242:51053, 6235:16855–16857, 6235:16980, 6235:16987, 6235:17135; U08 6257:15151, 6257:15160, 6242:18522, 6235:17422; U09 6257:15277, 6235:19045, 6257:15312, 6235:18671; U10 6324:40008, 6324:40065; U36 6376:27347, 6376:27405 | A documents step redesign: search including "Upcoming" documents, suggestions, counters, a pager, select-all, dashed empty panels, animations, Remove on hover, Undo after removing | Spec 001's documents step, plus F16's dialogs | CLAR 2026-10-24 #26 |
| F25 | OUT-24 | U11 6348:40401, 6348:40520; U12 6350:41628, 6350:42145; U24 6191:42209; U25 6197:11783; U31 6324:16762; U30 6324:15429 | Rule editor aids: search in the data and option menus, "Need other data? Add it in Documents", "No options match "XL".", hints that repeat the entered value | Leave them out. The editor offers what spec 002 requires, including F7's notes | CLAR 2026-10-24 #26 |
| F26 | OUT-30, OUT-16 | U08 6235:18042 | "Age over 18" can be requested from the driving licence | Remove it. "Age in years" and "Year of birth" stay as spec 001 fields, which rules check as numbers | CLAR 2026-10-24 #27 |
| F27 | FR-005d, EC-28, FR-005f | U15 6344:53413, 6344:53414; U26 6196:10710 | "Another rule is already called Rule 01." | An inline message that always names the branch: "Another rule in Ambulance is already called Rule 01.". This also applies when renaming a rule in main clashes with a name in a branch based on it | CLAR 2026-10-24 #30 |
| F28 | FR-028d, FR-028c | U28 6197:11098 | The toast "Couldn't save. Check your internet connection and try again." with Retry, after saving a single rule | Rules are stored only when publishing or saving (there are no drafts), so saving a single rule can't fail. Failures show in the publish/save dialog with Try again, as in U35 6376:27178 | CLAR 2026-10-24 #23, #26 |

## Build without frames (decided)
| # | req | expected surface | build from (nearest frame or KERN pattern) | decision |
|---|---|---|---|---|
| W1 | FR-020a, FR-020b, FR-020c, FR-020d, US3-AS9, FR-006b | Rules step: variant tabs, Add variant dialog | A KERN menu on each branch tab: rename every branch, Standard included, and delete every other branch after a KERN confirmation dialog. A missing or duplicate name is reported where it is entered, like U26 6197:12011 ("Enter a name for the variant.") and F27's inline error. FR-006 still refuses it at publish or save (F14) | CLAR 2026-10-24 #8 |
| W2 | FR-022b, EC-11, EC-12, EC-13, FR-021c, EC-14, FR-021d, US3-AS3 | Rules step: a branch based on main | The existing marks: "Changed here" (U18 6163:4884; on a group 6163:5438, also for a switched top level), "New addition" (U18 6163:4893), removed rows (U23 6185:8570), and unmarked linked rows under "Linked to Standard" (U17 6344:60005). EC-11: the branch keeps its version. EC-12: the branch's version shows as added. EC-13: the rule disappears from the branch. FR-021c / EC-14: a rule added to main appears unmarked in based branches only | CLAR 2026-10-24 #9 |
| W3 | EC-17 | Rules step: a branch without rules | U29 6197:11646 ("No rules yet") inside the branch's tab | CLAR 2026-10-24 #11 |
| W4 | FR-004c, FR-004d, ENT-Group.error_message, ENT-Sub-group.error_message | Rules step: group and sub-group headers | U14 6324:39410/39411 (message card under the header, with a pencil) and 6324:39419 (hint). The ⋯ menus of groups and sub-groups (U14 6094:6413, 6094:6320) offer adding and removing the message | CLAR 2026-10-24 #12 |
| W5 | FR-026c | After publishing; Details | Spec 001's URL display: the trigger URL and one pull URL without branch names, e.g. U37's Request link block (6396:47715–47721) with a single unlabelled Result link | CLAR 2026-10-24 #13 |
| W6 | US4-AS2, US4-AS1, FR-030c | Rules step (edit flow); save dialog | The create flow's rules-step frames (U14 6094:6127, U29 6197:11646) inside spec 001's edit flow. The save confirmation comes from spec 001's save dialog, extended like U33 6376:25536 | CLAR 2026-10-24 #14 |

## Clarify questions
1. **Identifiers on the details** (S1, FR-010h, P1). No frame shows them. CLAR 2026-10-24 #18 defines the identifiers and #14 the details' layout, but neither says how the identifiers appear. Options:
   - (a) Show each rule's and group's identifier read-only next to its name, on the details only.
   - (b) Do (a), and also show it in the rules step.
   - (c) Drop FR-010h and give serviceBW the identifiers another way?
2. **Figma-only conveniences that no decision covers** (B1–B3): "Enter saves · Esc cancels" on rename (U15 6344:53364), "Cancel" in select mode (U16 6344:53544, U19 6344:53768), and the copy toast with "Show" (U20 6344:54042). Options:
   - (a) Treat them as UI detail built as designed, as CLAR 2026-10-24 #20 does for similar conveniences.
   - (b) Leave them out.
   - (c) Add requirements for them?
3. **From-now wording** (P1). CLAR 2026-10-24 #2 adds "is at least / is less than N years or months from now", and #28 rules on the Date of birth statement only. Figma says "≥ at least 6 months left" everywhere (U14 6094:6521, U30 6324:15667–15670, …). Options:
   - (a) Use the spec's words in the editor and in the statement: "Driving licence – Expiry date is at least 6 months from now".
   - (b) Adopt "left" for every date field and amend FR-003j and FR-005a.
   - (c) Use "from now" in the editor and "left" in saved rules?
4. **Value checks in the editor** (P2). U25 6196:10533 rejects 0 with "Enter a number greater than 0.". CLAR 2026-10-24 #15 keeps the editor's errors, but FR-006a lists only incomplete conditions, missing messages and unrequested fields. Options:
   - (a) Years and months must be at least 1. The editor flags 0, and publishing or saving refuses it as an incomplete condition.
   - (b) Flag 0 in the editor only.
   - (c) No range check, and drop the error?

## Coverage
Status per requirement with `UI = Y`. Units with a PARTIAL or CONFLICT row are marked (P) or (C).

| req-id | status | units |
|---|---|---|
| FR-001a | COVERED | U06–U38 |
| FR-001b | COVERED → F9 | U11, U29, U36; with an open editor (C) → F9 |
| FR-001c | CONFLICT → F17 | U07, U08, U09, U36; U09, U10 (C) |
| FR-002a | COVERED | U11–U33 |
| FR-002b | COVERED | U11, U12, U30, U31 |
| FR-002c | CONFLICT → F3, F4 | U12, U14, U24, U25; U13, U31 (C) |
| FR-002d | COVERED | U11, U12, U24, U25, U27, U32 |
| FR-003a | CONFLICT → F1, F2, F4, F5 | U25, U30, U31; U13, U30 (C) |
| FR-003b | CONFLICT → F3 | U31 (C) |
| FR-003c | CONFLICT → F4 | U13, U31 (C) |
| FR-003d | PARTIAL → F5 | U14, U16, U24, U25, U27; U12, U27, U31, U37 (P) |
| FR-003f | CONFLICT → F1 | U11, U12, U30 (C) |
| FR-003g | PARTIAL → F7 | U30; U12, U25, U26 (P) |
| FR-003h | CONFLICT → F2 | U14, U24, U26; U12, U30, U35, U37 (C) |
| FR-003i | COVERED | U32 (part picker); U11 (P, resolved by U32) |
| FR-003j | CONFLICT → F1; open P1 | U30; U11, U30 (C); U14–U28 (P, wording) |
| FR-003k | COVERED → F6 | U11, U25, U33; U12, U14–U21, U27, U28, U35 (P) |
| FR-003l | COVERED → F7 | U11, U28, U30 |
| FR-004a | COVERED | U11–U37 |
| FR-004b | CONFLICT → F8 | U11–U32; U25 (C) |
| FR-004c | COVERED → W4 | U14 (group only) |
| FR-004d | COVERED → W4 | U14 (message shown, no control) |
| FR-005a | PARTIAL → F6, F19 | U23, U33; U11–U28, U37 (P) |
| FR-005b | COVERED → F6 | U14 |
| FR-005c | COVERED → F19 | U11–U33 |
| FR-005d | PARTIAL → F27 | U16; U15, U26 (P) |
| FR-005e | COVERED | U18, U19 |
| FR-005f | COVERED → F14 | U10, U16, U19, U20; U27 (P) |
| FR-006a | PARTIAL → F14, F15, F16 | U25, U27; U27, U33 (P, C) |
| FR-006b | COVERED → W1 | U26 (missing name only) |
| FR-006c | PARTIAL → F14 | U27 (P) |
| FR-006d | COVERED | U24, U25 |
| FR-006e | COVERED → F9 | U28 (leaving the editor only) |
| FR-006f | COVERED → F9 | U24, U28, U31 |
| FR-006g | CONFLICT → F9 | U12; U11, U13, U24–U26, U28, U30–U32 (C) |
| FR-007a | COVERED | U12, U14–U21, U28, U33–U35 |
| FR-007b | COVERED | U14–U21, U23, U28, U33 |
| FR-007c | COVERED | U14, U16, U18, U20, U23 |
| FR-008a | COVERED | U14–U21, U33 |
| FR-008b | COVERED | U14–U18, U20, U26, U28, U33 |
| FR-008c | COVERED | U14–U21, U23, U26, U28 |
| FR-008d | COVERED | U14, U15, U18–U21, U23, U26 |
| FR-008e | CONFLICT → F10 | U15, U16; U14, U27, U28 (C) |
| FR-008f | CONFLICT → F10 | U23 (C) |
| FR-010h | SPEC-ONLY → open S1 | — |
| FR-013a | CONFLICT → F4 | U13, U31 (C) |
| FR-013c | CONFLICT → F4 | U13 (C) |
| FR-014c | PARTIAL → F7 | U28; U11, U30 (P) |
| FR-018a | CONFLICT → F13, F18 | U10–U35; U34, U37, U38 (C) |
| FR-019a | COVERED → F13 | U11–U35; U29 (C) |
| FR-019b | COVERED | U17, U26 |
| FR-019d | CONFLICT → F13 | U12, U14–U28; U11, U29 (C) |
| FR-020a | SPEC-ONLY → W1 | — |
| FR-020b | SPEC-ONLY → W1 | — |
| FR-020c | SPEC-ONLY → W1 | — |
| FR-020d | COVERED → W1 | U26 (missing name only) |
| FR-020e | COVERED → F19 | U17, U26 (rules step only, not on the details) |
| FR-021a | COVERED | U17–U20, U23, U26 |
| FR-021b | COVERED → F11 | U17–U20, U23 |
| FR-021c | COVERED → W2 | U20 (copy-to-main helper only) |
| FR-021d | PARTIAL → F12, W2 | U21, U35; U19, U23 (P) |
| FR-022a | COVERED | U17–U20, U23, U26 |
| FR-022b | PARTIAL → F11, W2 | U23 (P) |
| FR-022c | COVERED | U18, U19 |
| FR-022d | COVERED | U14–U20 |
| FR-022e | COVERED | U18, U19, U20 |
| FR-022f | COVERED | U18, U19, U20 |
| FR-023a | COVERED → F19 | U17–U20, U23, U33 (not on the details) |
| FR-023b | COVERED → F12, F19 | U17–U20, U33; U23 (P) |
| FR-023c | COVERED → F10, F19 | U18, U19, U21, U23; U23 (C) |
| FR-024a | COVERED | U18, U23 |
| FR-024b | COVERED | U23 (restoring the inner removals isn't drawn) |
| FR-024c | COVERED | U23 |
| FR-025b | COVERED | U34, U37, U38 |
| FR-026a | CONFLICT → F18 | U34, U37, U38; U34 (C); U35 (P, closed by #14) |
| FR-026b | COVERED → F22 | U34, U37, U38 |
| FR-026c | SPEC-ONLY → W5 | — |
| FR-028d | COVERED → F28 | U35; U28 (P) |
| FR-029 | COVERED → F16 | U09, U10; U06, U07, U09 (P) |
| FR-030a | PARTIAL → F19 | U37, U38 (P) |
| FR-030b | PARTIAL → F20 | U34, U37, U38 (P) |
| FR-030c | CONFLICT → F20, W6 | U33, U34; U35, U37 (P); U38 (C) |
| FR-031 | COVERED | U09–U36 (signed-in view only; U01 is OUT) |
| US1-AS1 | PARTIAL → F19 | U11, U16, U21, U35; U35, U37 (P) |
| US1-AS2 | PARTIAL → F2, F5 | U11, U24, U25, U31; U12, U27, U31, U37 (P) |
| US1-AS3 | COVERED → F17 | U09, U11, U29, U35, U36 |
| US1-AS6 | PARTIAL → F14 | U27 (P) |
| US2-AS1 | COVERED | U12, U14, U16, U18, U20, U28 |
| US2-AS6 | COVERED | U14, U15, U18–U21, U23, U26 |
| US2-AS7 | CONFLICT → F10 | U14–U16, U20; U14 (C) |
| US3-AS1 | COVERED | U17, U20 |
| US3-AS2 | COVERED → F12 | U17–U20, U33; U23 (P) |
| US3-AS3 | COVERED → W2 | U20 (static only) |
| US3-AS4 | COVERED | U17–U21, U23, U33 |
| US3-AS5 | COVERED | U18, U23 |
| US3-AS6 | COVERED | U17, U26 |
| US3-AS7 | COVERED → F18 | U37, U38 |
| US3-AS9 | SPEC-ONLY → W1 | — |
| US4-AS1 | PARTIAL → F20, W6 | U15; U37, U38 (P) |
| US4-AS2 | SPEC-ONLY → W6 | — |
| US4-AS3 | PARTIAL → F16 | U10; U06, U07, U09 (P) |
| EC-8 | CONFLICT → F3, F4 | U12, U14–U20, U24, U25; U13 (C) |
| EC-9 | CONFLICT → F10 | U15, U16; U14, U27, U28 (C) |
| EC-11 | SPEC-ONLY → W2 | — |
| EC-12 | PARTIAL → F11, W2 | U23 (P) |
| EC-13 | PARTIAL → W2 | U23 (P) |
| EC-14 | COVERED → W2 | U17, U20, U26 |
| EC-15 | COVERED → F12 | U18; U23 (P) |
| EC-16 | CONFLICT → F10 | U23 (C) |
| EC-17 | SPEC-ONLY → W3 | — |
| EC-27 | COVERED → F10 | U19 |
| EC-28 | PARTIAL → F27 | U14, U16; U15 (P) |
| ENT-Rule.document | COVERED | U11–U33 |
| ENT-Rule.field | PARTIAL → F2 | U11, U13, U24, U25, U30–U32; U12 (P) |
| ENT-Rule.condition | PARTIAL → F1, F6; open P1 | U11, U13, U23, U30; U12, U14, U17, U19, U20, U28 (P) |
| ENT-Rule.error_message | COVERED | U11–U33 |
| ENT-Rule.identifier | SPEC-ONLY → open S1 | — |
| ENT-Rule.name | COVERED → F19 | U11–U32 |
| ENT-Rule.branch | COVERED | U17, U20, U21 |
| ENT-Rule.parent | COVERED | U15–U17, U20, U21 |
| ENT-Group.members | CONFLICT → F10 | U14, U16, U17; U14, U27, U28 (C) |
| ENT-Group.operator | COVERED | U14–U21, U26, U28, U33 |
| ENT-Group.error_message | COVERED → W4 | U14 |
| ENT-Group.identifier | SPEC-ONLY → open S1 | — |
| ENT-Group.name | COVERED | U14–U21, U23, U26–U28, U33 |
| ENT-Sub-group.members | COVERED | U14, U15, U17, U18, U20, U28 |
| ENT-Sub-group.operator | COVERED | U14, U17–U20, U23, U26, U28, U33 |
| ENT-Sub-group.error_message | SPEC-ONLY → W4 | — |
| ENT-Sub-group.identifier | SPEC-ONLY → open S1 | — |
| ENT-Sub-group.name | COVERED | U14, U15, U17–U20, U23, U26, U28, U33 |
| ENT-Branch.name | COVERED | U10–U38 |
| ENT-Branch.description | COVERED → F19 | U17, U26 |
| ENT-Branch.rules | COVERED → F19 | U12, U17, U20, U21; U37 (P) |
| ENT-Branch.operator | COVERED | U12, U14, U16, U18, U20, U21, U28, U34 |
| ENT-Branch.pull_url | CONFLICT → F18 | U34, U38; U37, U38 (C) |
| ENT-Branch.origin | COVERED | U17–U21, U23, U26, U33 |
| ENT-Branch Change.item | COVERED | U17, U18, U20, U21 |
| ENT-Branch Change.kind | COVERED | U17–U21, U23, U33 |
| ENT-Branch Change.undoable | COVERED | U18, U23 |
| ENT-Branch Change.dissolved_group | CONFLICT → F10 | U23 (C) |
| ENT-Form Connection.branches | COVERED → F19 | U17–U21, U23, U33 |
| ENT-Connection URL.trigger_url | COVERED | U34, U37, U38 |
| ENT-Connection URL.pull_url | CONFLICT → F18 | U34, U37, U38 (C) |

Requirements with `UI = N` that units touched (FYI):
- FR-003e: U12, U21; U31 → F5.
- FR-009a: U15, U21.
- FR-009c / EC-1: U11, U29, U36.
- FR-011b / US2-AS4: U14, U21.
- FR-012c / EC-2: U11; U30 → F1.
- FR-012d: U11.
- FR-012e: U30.
- FR-012f: U30.
- FR-013d: U13, U31.
- FR-014a / EC-5: U11, U30 → F2, F7.
- FR-014b / EC-6: U12 → F2.
- FR-019c: U07, U33, U37.
- FR-025a: U34, U37, U38.
- FR-025f / FR-025g / EC-18: U34, U37, U38 → F18.
- FR-028a: U38 → F20.
- FR-028c: U35 → F28.
- FR-010f: U28.

## Not audited
| UNIT-ID | name | status | coverage gap |
|---|---|---|---|
| U01 | Log in (empty, filled, wrong, forgot, loading, logged out) | OUT | Spec 001 sign-in. It would show FR-031's signed-out side, which no audited unit shows |
| U02 | Your connections (list, user menu, delete/edit dialogs) | OUT | Spec 001 overview. Its edit entry bears on F20 (FR-030b, US4) |
| U03 | Save and exit (saving, draft saved) | OUT | Drafts are dropped (F23, CLAR 2026-10-24 #16, #26) |
| U04 | Log out with unsaved changes | OUT | Spec 001 shell |
| U05 | Create connection (first, filled, info, empty, Form ID used, returning) | OUT | Spec 001 create step |
| U22 | Problems: contradiction, duplicate, suggestion | OUT | Marked "later: not in spec yet". The publish dialog's warnings it would define are left out (F15, CLAR 2026-10-24 #15) |
| U39 | Deactivate / delete connection (menu, dialogs, deactivated, after delete) | OUT | Spec 001 lifecycle. Bears on FR-027c / EC-19 (UI N) and on the details' actions menu (F19) |

No unit is UNCERTAIN, FAILED or RATE_LIMIT.
