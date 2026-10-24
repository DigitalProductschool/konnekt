# Figma ↔ spec audit — 2026-10-24
## Summary
Units audited 32/39 (OUT 7, UNCERTAIN 0, FAILED 0). Figma calls 3, as units.md logs them: 1 by the mapper and 2 by U32.
- This run remapped U12, U25, U31 and U32 for FR-003p and reused their inventories. The requirements index rebuilt after CLAR 2026-10-24 #39 changed FR-003p (changes.md).
- U12, U25 and U31 log 0 calls. U32's unit-file header still shows the same 2 calls as after its inventory run, so those 2 calls may not come from this remap.
- The other 28 audited units keep the mappings from earlier runs. None of them maps FR-003p.

| category | count |
|---|---|
| Conflicts (open) | 0 |
| Spec-only (open) | 0 |
| Figma-only behavioural (open) | 0 |
| Partial matches (open) | 0 |
| Figma-only cosmetic (FYI) | 20 |
| Figma must change (decided) | 32 |
| Build without frames (decided) | 7 |

F1–F32 and W1–W7 keep their numbers from the previous report. CLAR 2026-10-24 #39 answered its only question (Q1):
- **Place of birth part picker:** it lists "Country", "Region" and "City or town" without a search field, as U32 draws it. This is built as designed, so the previous report's partial #1 is closed.
- **Licence classes part picker:** no frame draws it. It gets the search field "Search classes" and the empty result "No options match "{typed text}".". F5 now says so. It also lists U24 and U25, which go from "Licence classes" straight to the check, with no part picker in between.
- **Class value menus:** they keep "Search classes" (F32).

Top 5 issues (open items only): none. A Clarification settles every audited item (F1–F28, F31, F32, W1–W7), or a standing rule does (F29 and F30 by RULE wording, three FYI items by RULE ui-detail).

## Conflicts
| # | req | Figma (unit, node-id) | conflict |
|---|---|---|---|
| – | – | – | None open. Every CONFLICT row in U06–U38 is settled, see "Figma must change (decided)" |

## Spec-only (not in Figma)
| # | req | prio | expected surface | note |
|---|---|---|---|---|
| – | – | – | – | None open. FR-010h, FR-020a, FR-020b, FR-020c, FR-020j, FR-026c, US3-AS9, US4-AS2, EC-11, EC-17, ENT-Sub-group.error_message and the identifier entities are settled, see W1–W7 |

## Figma-only — behavioural
| # | item | where (units, node-ids) | suggested requirement |
|---|---|---|---|
| – | – | – | None open. The rule editor's aids are FR-002e–h, FR-003o and FR-003p (CLAR 2026-10-24 #36, #39) |

## Partial matches
| # | req | where | difference |
|---|---|---|---|
| – | – | – | None open. CLAR 2026-10-24 #39 settles the Place of birth part picker without a search field (U32 6324:17863) as designed. It was partial #1 in the previous report |

## Figma-only — cosmetic (FYI)
| # | item | where (units, node-ids) | note |
|---|---|---|---|
| 1 | Help tooltips ("What is a variant", info icons on the links) | U11 6348:40885; U12 6350:41098; U14 6151:33779; U16 6344:53515; U17 6151:33809, 6151:33820; U21 6168:7013; U26 6197:11978; U27 6197:10691; U28 6197:11069; U33 6376:25351; U34 6383:66106; U35 6376:26331; U38 6396:48977, 6396:48991 | RULE ui-detail. Only U17 has the tooltip text: "A variant is a separate set of rules for some of your applicants." These aren't the branch-description (i) of FR-020f |
| 2 | Hidden layers (card header, hint slots, value inputs) | U11 6348:40215, 6348:40887; U13 6357:42628; U24 6191:42071, 6191:42083; U25 6196:10238, 6196:10250; U32 6324:17633, 6324:17642–6324:17644, 6324:17647 | F16 covers the card header, F4 the hints and F1 the hidden "old" |
| 3 | Selected rule-editor outline | U13 6357:42631 | |
| 4 | Static copy and header context | U08 6235:17251; U10 6324:40005; U29 6197:11647; U36 6376:27345 | Spec 001 |
| 5 | Scrollbars | U07 6235:17134; U26 6274:33733 | |
| 6 | Hover style of the trash button | U10 6324:40012 | |
| 7 | Wrong error message on Rule 02 after grouping | U16 6344:53613 | Mock copy slip |
| 8 | The description sample differs between the dialog and the tooltip | U17 6139:32693 vs 6139:32939 | Sample data |
| 9 | Dangling AND connector after the last top-level item | U19 6344:53865 | Design slip |
| 10 | Link icon only on the linked rules inside the new group | U19 6344:53871 | Per CLAR 2026-10-24 #10, the rules in a group formed in a branch carry no mark of their own. Show the icon on every linked rule or on none |
| 11 | Faded connectors, and a faded "+ Add rule" inside a removed group | U23 6185:8569, 6185:8572, 6185:41182 | Inconsistent styling |
| 12 | Summary counts disagree with the frames ("School transport · 5 rules" with 6 drawn; "7 data items" vs "6 of 25") | U33 6376:26181; U36 6376:27630 | Sample data |
| 13 | Long URL truncated in its field | U37 6396:47748 | Copy must still copy the full URL |
| 14 | "Published page" (annotation) vs "connection page" (copy) | U35 6376:26662, 6387:65289 | Both mean the details |
| 15 | Artefacts and decoration: frame annotations, the footer overlap in the sticky frame, the illustration | U21 6168:7004; U17 6148:4702; U34 6396:48607 | The sticky bar is out (F19) |
| 16 | Add variant dialog intro "Your form decides which variant applies to each applicant." | U17 6139:32693; U26 6197:12011 | Matches FR-025b implicitly |
| 17 | The details keep the rules in a collapsible card ("View summary" / "Hide summary") | U37 6396:47756, 6396:48197; U38 6396:49017 | RULE ui-detail: built as designed and collapsed by default. F25 removes the card's counters and "Download PDF". F26, F31 and W1 set what the card contains |
| 18 | Removed-items counter in the link strip: "2 of 3 Standard rules are removed here. The rest update with Standard." | U21 6344:60075; U23 6344:60085 | RULE ui-detail |
| 19 | "Based on Standard (recommended)" preselected in Add variant | U17 6139:32693; U26 6197:12011 | RULE ui-detail |
| 20 | The document menu's footer has two wordings: "Lists the documents you added" and "Only documents you request are listed." | U11 6348:40237; U12 6350:41316 | Both are FR-002h copy (CLAR 2026-10-24 #36). Use one of them in the menu and record which in the design notes |

Settled as designed (no action):
| item | where | basis |
|---|---|---|
| Rule editor aids, all built as designed:<br>- the data menus' search fields ("Search Personal ID", "Search Driving licence")<br>- the class menus' search field ("Search classes")<br>- the empty result "No options match "XL"."<br>- class codes with their descriptions<br>- the data menu's "Need other data? Add it in Documents"<br>- the menu footers that state a requirement | U11 6348:40401, 6348:40520, 6348:40237; U12 6350:41420, 6350:41628, 6350:41316, 6350:42145, 6357:43382; U24 6191:42209, 6194:42246 ("Select at least one option."); U25 6197:11783 | CLAR 2026-10-24 #36 (FR-002e–h, FR-003o), confirmed by #39:<br>- "Add it in Documents" opens the documents step. With unsaved editor changes, U28's "Save changes to Rule 01?" (6197:10988) comes first (FR-006h).<br>- F32 fixes U24's class menu.<br>- The part pickers follow #39: Place of birth's has no search field (next row), Licence classes' has "Search classes" (F5) |
| Place of birth part picker: "Choose part" lists "Country", "Region" and "City or town" without a search field | U32 6324:17746, 6324:17863 (6324:17895, 6324:17901, 6324:17907) | CLAR 2026-10-24 #39 (FR-003p, FR-003i). It narrows #36's "built the same way": only long menus get a search field |
| The editor's hints:<br>- "Applicants who turn 21 that day count."<br>- "Met if the licence has at least one of the chosen classes."<br>- "Place of birth has parts. Choose the part to check."<br>- "Shown instead of the rules' own messages when this group isn't met."<br>- "Check the time since or until this date, or compare it with a fixed date." | U11 6348:40755; U12 6357:43117; U32 6324:17646; U14 6324:39419; U30 6324:15429 | CLAR 2026-10-24 #36 ("the editor's hints stay"). Other hints are reworded or removed: U11 6348:40539 (F3), the date notes (F4), the BE/C/D hints (F5), the text hints (F7) and U31 6324:17370 (F30) |
| The (i) after a branch's name on its tab, with the description tooltip; none after "Standard" while main has no description | U17 6134:8719, 6134:9160, tooltip 6139:32939; U18 6163:4857 (tooltip 6324:39473); U19 6344:53704; U20 6344:53881; U21 6168:7673; U23 6185:8562, 6185:8905, 6185:8906; U33 6376:25757 | CLAR 2026-10-24 #37 (FR-020f–h). The tooltip opens on hover and on keyboard focus. The details and the URLs after publishing get the same (i) (F31) |
| "Save rule" stays disabled until the rule is complete, with inline flags in the editor | U11 6348:40758; U12 6350:42728; U13 6357:42904; U24 6191:42282, 6194:42246; U25 6196:10255, 6196:10249; U26 6196:10590; U30 6324:15433; U31 6324:16931; U32 6324:17650 | CLAR 2026-10-24 #19, #15. "Save changes" in F10's dialog still saves an incomplete rule |
| Toasts after saving, deleting and grouping | U11 6369:62602; U12 6369:62608; U14 6113:29469; U16 6344:53623; U19 6344:53873 | CLAR 2026-10-24 #19, #20. F29 sets their copy |
| Delete-rule confirmation and its undo promise; the notice after switching AND/OR | U14 6113:29056, 6329:19219; U23 6185:8847 | CLAR 2026-10-24 #20. F14 sets the body of U23's dialog |
| "Enter saves · Esc cancels"; "Cancel" in select mode; the copy toast with "Show" | U15 6344:53364; U16 6344:53544; U19 6344:53768; U20 6344:54042 | CLAR 2026-10-24 #35 |
| Publish dialog and its states:<br>- the documents and the per-branch rule summary<br>- Close and "Check rules again"<br>- "Publishing…", then "Published", then the details<br>- "Couldn't publish" with "Try again"<br>- "Publish without rules?" from the documents step | U33 6376:25536, 6376:26181; U34 6383:66119 (summary rows, actions); U35 6387:65280, 6376:26519, 6387:65289, 6376:26662, 6376:27178; U36 6376:27629, 6376:27630 | CLAR 2026-10-24 #23, #14. F22 removes the go-live choice and F21 the warnings |
| Years or months must be a whole number of at least 1 ("Enter a number greater than 0.") | U25 6196:10398, 6196:10533 | FR-003m, CLAR 2026-10-24 #34 |
| The removal dialog counts an inherited rule once per branch ("3 rules … Rule 05 in Standard, Rule 05 in Ambulance") | U10 6324:40071 | CLAR 2026-10-24 #16 (the design's dialog) |
| Undoing a grouping in a branch from its toast | U19 6344:53873 | CLAR 2026-10-24 #20 |
| A connector chip on every gap switches the whole level | U14 6094:7052 ("Applies to every rule in Group 01") | FR-007c. This settles the doubts in U15, U17, U19, U21, U26, U27 and U33 |
| Place of birth: the whole field in the data menu, then the part picker | U11 6348:40454 → U32 6324:17746 | FR-003i, drawn in U32 |
| Pickers unlock in order (document → data → check) | U11 6348:40232, 6348:40233; U25 6196:10247 | Follows from FR-003a (U25 #8) |
| "Driving licence · Expiry date" in U33 | U33 6376:25771 | This is the licence's own Expiry date (U08 6235:17929), not a class part. F1 and F2 set its wording |
| "City or town" as its own Personal ID field | U13 6357:42635; U37 6396:48199–6396:48220 | This is the catalog's address field (U07 6235:16997), not the Place of birth part |

Spec 001 scope (no spec 002 action):
- "Back" in every footer.
- "Create new connection" (U34 6424:34919, U37 6424:34839, U38 6424:34959).
- The "Live" badge and the success card (U37 6396:47649, 6396:47701; U38 6396:48910, 6396:48956).
- The connection actions ⋮ (U37 6421:31777, U38 6421:31819). F22 removes its go-live item. Deactivate and delete are in U39, which was not audited.
- The requested-fields summary on the details (U37 6396:48199–6396:48220).
- The documents step's field selection, counters, select-all and validation are built as in spec 001 (F19), plus F18's dialog. Nodes: U07 6235:16862 (disabled footer); U08 6235:17314, 6235:18227, 6242:18586, 6242:51200; U09 6235:18529, 6235:18533; U10 6324:40019, 6324:40020; U36 6376:27353.
- Image fields can be requested (U08 6235:17993). The rules step marks them "Can't be checked" (U11 6348:40517; U12 6350:41622, 6350:41625).

## Figma must change (decided)
Build these as the spec says, keeping Figma's layout and styling, until the design is updated.
| # | req | Figma (unit, node-ids) | Figma shows | build instead | decision (CLAR … or RULE wording) |
|---|---|---|---|---|---|
| F1 | FR-005a, FR-005b, FR-003k, ENT-Rule.condition | Saved rows: U11 6348:40889; U12 6350:41102; U14 6094:6469, 6094:6276, 6094:6357, 6094:6223; U15 6344:53330, 6344:53336; U16 6344:53519, 6344:53525; U17 6134:8524, 6134:8534, 6134:8544; U18 6163:4862, 6163:4872; U19 6344:53713, 6344:53723; U20 6344:53890, 6344:53900; U21 6168:7017, 6168:7226; U23 6185:8567; U26 6197:11982; U27 6197:11416; U28 6197:11073, 6197:11087, 6197:11090; U33 6376:25778, 6376:25788; U34 6383:66110; U37 6396:48228.<br>"years ago" on the Date of birth: U35 6376:26339.<br>Hidden "old" on other dates: U30 6324:15427; U32 6324:17644 | "Personal ID · Date of birth ≥ at least 21 years old" ("·", no "is"); one frame reads "at least 21 years ago"; the shared editor carries "old" on other dates | "Personal ID – Date of birth is at least 21 years old" in every saved statement:<br>- "–" goes between the document, the field and the part.<br>- "is" goes before the condition.<br>- Further examples: "Driving licence – Licence classes includes one of B, BE" and "Driving licence – Licence class B – Issue date is at least 2 years ago".<br>- The ≥, < and = chips stay as decoration that assistive technologies don't announce.<br>- "old" appears only on the Date of birth, so U35's row reads "is at least 21 years old" | CLAR 2026-10-24 #28 (and #1) |
| F2 | FR-003j, FR-005a, FR-005g | U14 6094:6521; U15 6344:53333; U16 6344:53522; U17 6134:8527, 6134:9078; U18 6163:4865; U19 6344:53716; U20 6344:53893; U21 6168:7020; U23 6185:8570, 6185:8821; U26 6197:11985; U27 6197:11419; U28 6197:11076; U30 6324:15667–6324:15670 | "≥ at least 6 months left" in the editor and in the saved rows | "Driving licence – Expiry date is at least 6 months from now" and "is less than 6 months from now":<br>- in the editor: picker "is at least", a number, unit "months", suffix "from now"<br>- in saved rules<br>No "left". "≥" is decoration | CLAR 2026-10-24 #33 |
| F3 | FR-003f, FR-003j, FR-003k, FR-003a | U11 6348:40681 (menu), 6348:40539 (hint), 6348:40749, 6348:40751; U12 6350:42447–6350:42449, 6350:42585; U25 6196:10397–6196:10400; U26 6196:10579–6196:10584; U28 6197:10974; U30 6324:15613 (menu), 6324:15426 | Age "at least / at most"; Time passed and Time left "at least / at most"; "before / after"; a years/months unit on years-ago conditions; no "is exactly", "is (a date)" or "is less than … from now" | The picker labels use FR-003's words:<br>- Date of birth: is at least / is less than / is exactly N years old.<br>- Every other date: is before / is after / is <date>; is at least / is less than / is exactly N years ago.<br>- Every date, the Date of birth included: is at least / is less than N years or months from now.<br>Units and values:<br>- The unit picker (years, months) appears only on from-now conditions.<br>- Age and years-ago conditions take whole years, shown as fixed text.<br>- N is a whole number ≥ 1 (FR-003m).<br>- No "at most".<br>Copy:<br>- The menu sections read "Time ago" and "Time from now" instead of "Time passed" and "Time left".<br>- U11's hint becomes "Check an age, the time from now, or compare the date with a fixed date."<br>- U30's hint 6324:15429 already fits | CLAR 2026-10-24 #2 (and #1, #33, #34) |
| F4 | FR-003g, FR-014c, FR-003l | U11 6348:40754, 6348:40756; U12 6350:42724, 6350:42726; U25 6196:10250, 6196:10401 (hidden); U26 6196:10585 (hidden); U28 6197:10983, 6197:10984; U30 6324:15673; U32 6324:17647, 6324:17648 (hidden slots) | A worked example without the counting sentence, or "Counted from the date class B was first issued."; "If the date of birth is missing, the rule isn't met."; hints hidden in error states | Next to every date condition in the editor, error states included, show:<br>- "Counted from the day the applicant shares. Today (23 Oct 2026) this means: born on or before 23 Oct 2005."<br>- "If the date of birth is missing or can't be read, the rule isn't met and is reported as couldn't be checked." {field} is the checked field or part ("the expiry date", "the issue date of class B").<br>Also:<br>- Saved rules don't show these notes.<br>- U30 6324:15672 already has the first one right.<br>- A class B rule may keep "If class B is missing, the rule isn't met." (FR-014b) | CLAR 2026-10-24 #29 |
| F5 | FR-003h, FR-003p, FR-005a, ENT-Rule.field | U12 6350:41548, 6350:41890, 6350:41892, 6350:41904, 6350:42064, 6350:42145, 6350:42352, 6350:42725, 6350:42727, 6350:42948; U24 6191:42078, 6191:42272; U25 6197:11773; U30 6324:16305, 6324:16410, 6324:16308, 6324:16310, 6324:16313; U35 6376:26342; U37 6396:48235 | The composite checks "has held class … for at least" and "has class … valid today / on the day of sharing"; "BE, C and D licences always include class B."; a fallback to the licence's expiry date; the saved "Licence classes has held class B for at least 2 years"; no part picker, so U24 and U25 go from "Licence classes" straight to "includes one of" | Licence classes are checked through their parts.<br>The part picker:<br>- After "Licence classes" in the data menu, a part picker ("Choose part") follows, also in U24's and U25's frames.<br>- It is built like the data menu and like Place of birth's part picker (U32 6324:17746).<br>- It has the search field "Search classes", with the empty result "No options match "{typed text}"." (FR-003p, FR-002f).<br>- It lists "Licence classes" (the held classes) and, for every class, "Licence class B – Issue date" and "Licence class B – Expiry date".<br>The conditions:<br>- The held classes are an enum: includes one of / includes none of, several values, with the value menu of F32.<br>- The dates take F3's date conditions, e.g. "Driving licence – Licence class B – Issue date is at least 2 years ago".<br>- Only a licence that lists class B meets a class B rule.<br>- A class without its own expiry date doesn't fall back to the licence's.<br>- The proposed messages follow the new conditions (FR-004b) | CLAR 2026-10-24 #3 (and #39 for the part picker's search field) |
| F6 | FR-003b, FR-002c | U31 6324:17134, 6324:17198, 6324:17199, 6324:17201, 6324:17304, 6324:17203, 6324:17206 | "at least", "at most", "between 150 and 210" (both bounds inclusive) | is greater than / is less than / is equal to / is not equal to, strict, one value each. A range takes two rules. The messages follow the condition. The value field keeps accepting any number (FR-003n) | CLAR 2026-10-24 #4 |
| F7 | FR-003c, FR-013a, FR-013c, FR-002c, EC-8 | U13 6357:42841, 6357:42895, 6357:43063, 6357:42900, 6357:42901, 6357:42903; U31 6324:16757, 6324:16762, 6324:16763, 6324:16765 | "is", "is not", "starts with"; several values ("Stuttgart", "Esslingen") with "Met if the city or town is any of these."; the fixed hint "Capital letters and spaces at the start or end don't matter." | Conditions: is equal to / is not equal to / contains / doesn't contain, each with one value.<br>Letter case:<br>- Each text condition has its own letter-case choice next to the value.<br>- It is a KERN checkbox, labelled as in the design notes, e.g. "Match letter case".<br>- It is unchecked by default, which means letter case is ignored.<br>- The saved statement shows the setting.<br>Hint: "Spaces at the start or end don't matter." (FR-013d).<br>No "starts with" and no hint about it. "Lives in Stuttgart or Esslingen" takes two rules in an OR group | CLAR 2026-10-24 #5 |
| F8 | FR-003d | U12 6350:41850 (6350:41853, 6350:41877); U27 6197:10699; U31 6324:17577; U37 6396:48274 | "includes" / "doesn't include" | "includes one of" / "includes none of", for every enum field and any number of values | CLAR 2026-10-24 #6 |
| F9 | FR-004b | U25 6196:10254 (8.1), 6196:10405 (8.2); placeholder U11 6348:40234, U12 6350:41266 | A message is proposed while no data or check is chosen, or one that doesn't match the value (0); the placeholder says "Suggested once you choose a check." | The message is proposed only once the condition is complete, and it matches the condition as entered. Until then the placeholder reads "Error message applicants read: Suggested once you complete the check. You can edit it." | CLAR 2026-10-24 #19 |
| F10 | FR-006g, FR-006e, FR-006f, FR-001c | U11 6348:40236, 6348:40255, 6348:40542, 6348:40759; U13 6357:42646, 6357:42905; U24 6191:42089, 6191:42283; U25 6196:10256, 6196:10407, 6197:11782; U26 6196:10591; U28 6197:10987; U30 6324:15434; U31 6324:16767, 6324:16932, 6324:17208, 6324:17375; U32 6324:17651 | "Publish without rules" while a rule editor is open, publishing straight away | The primary label:<br>- It reads "Publish without rules" only while no branch has any rule and no rule editor is open.<br>- Otherwise it reads "Publish" ("Save" in the edit flow).<br>With unsaved editor changes, Publish and Save first open U28's "Save changes to Rule 01?" (6197:10988, "Discard" / "Save changes"):<br>- "Save changes" saves the rule even if it is incomplete, and FR-006 still checks it.<br>- "Discard" drops the changes.<br>- Either way, publishing or saving then goes on | CLAR 2026-10-24 #31 (and #17, #19) |
| F11 | FR-006a, FR-006c, FR-005f, US1-AS6, US4-AS3 | U27 6197:10714 (Publish disabled), 6197:10696 (banner) | Publish is disabled while a rule checks data that is no longer requested; the banner names the rule but not its branch | Publish and Save stay enabled.<br>The refusal:<br>- An attempt is refused while any branch has an incomplete condition, a missing message or an unrequested field.<br>- The message names the problem, the rule and its branch, e.g. "Rule 02 in Standard checks data that's no longer requested."<br>The banner and the inline flags stay and name the branch: "Rule 02 in Standard checks data that's no longer requested. Add the data again in Documents, or edit or delete the rule." | CLAR 2026-10-24 #15 |
| F12 | FR-005d, FR-005f, EC-28 | U15 6344:53413, 6344:53414; U26 6196:10653, 6196:10710 | "Another rule is already called Rule 01." | "Another rule in Ambulance is already called Rule 01." It always names the branch and shows inline where the name is entered. The same applies:<br>- to groups and sub-groups<br>- to a main-branch rename that clashes with a name in a based branch, which names that branch | CLAR 2026-10-24 #30 (and #18) |
| F13 | FR-008e, FR-008f, EC-9, EC-16, US2-AS7, ENT-Group.members, ENT-Branch Change.dissolved_group | U14 6113:29148, 6113:29150; U23 6185:41610, 6185:41611, 6185:41613, 6185:41627; U27 6197:11425, 6197:11431, 6197:11434; U28 6197:11080 | Groups kept with one member or none; an empty group inviting "Add a rule or a sub-group"; Publish enabled with it | A group or sub-group left with fewer than two members dissolves:<br>- The remaining member moves to the containing level.<br>- The group's AND/OR and message are dropped.<br>In a based branch:<br>- An inherited group dissolves there only and is shown removed (like U23 6185:41167).<br>- It comes back when the removal is undone or main adds a member.<br>Empty groups never exist. Built without new frames | CLAR 2026-10-24 #7 |
| F14 | FR-022b, EC-12, EC-13 | U23 6185:8847, 6185:8846 | "This rule will be removed from Standard and from every variant that uses it (Ambulance, School transport)." | The body must not say the rule leaves every variant:<br>- Variants that follow the rule lose it.<br>- Variants that changed it keep their version, which then counts as added. Name them.<br>- Variants that removed it drop it.<br>Proposed copy: "This rule will be removed from Standard and from the variants that follow it. Ambulance changed it and keeps its own version. You can undo this right after." The design notes hold the final wording.<br>If the rule is one of a group's two members, the group dissolves (F13) | CLAR 2026-10-24 #9 |
| F15 | FR-023b, EC-15, FR-021d | U23 6185:41180, 6185:41623 (changed rule inside the removed group); U23 6185:41610 and 6185:41167 (Ambulance AND vs Standard OR 6185:8827) | A changed rule marked only by an outline; a switched operator without a mark | A switched operator marks the group "Changed here" (EC-15, as U18 6163:5440). A changed rule keeps its "Changed here" text mark, also inside a removed group | CLAR 2026-10-24 #10 |
| F16 | FR-019d, FR-018a | U11 6348:40209, 6348:40219, 6348:40238, 6348:40523, 6348:40735, 6348:40215 (tab 6348:40882 only in 1.6); U13 6357:42628, 6357:42887; U24 6191:42071, 6191:42265; U25 6196:10238, 6196:10389, 6197:11766; U29 6197:11646, 6197:11652; U32 6324:17633 | The tab row ("Standard", "+ Add variant") appears only after the first rule is saved | Show the tab row from the start of the rules step: in the empty state, and while the first rule is edited | CLAR 2026-10-24 #11 |
| F17 | FR-001c, OUT-34 | U09 6235:18684, 6235:19019; U10 6324:40069, 6324:40394 | "Publish without rules" on the documents step while branches have rules | Offer it only while no branch has any rule. Otherwise the footer offers only "Add rules →" | CLAR 2026-10-24 #17 |
| F18 | FR-029, US4-AS3, FR-005f, OUT-34 | U06 6235:19061; U07 6242:18487, 6235:16997; U08 6242:18495, 6242:18503, 6235:17314, 6235:17317; U09 6235:18711, 6235:18758; U10 6324:40071, 6324:40396, 6324:40019 | A count-only removal dialog ("2 rules use its data and will need to be changed."); removal at once with no names; copy that mentions only publishing | Use U10's dialogs ("Remove Personal ID?", "Stop requesting Date of birth?"), which name the rules with their branches. Use them for every removal or deselection of data that rules check, including through the select-all checkbox. After confirming:<br>- Publishing and saving are refused while those rules remain (F11).<br>- In the edit flow the copy reads "… before you save." | CLAR 2026-10-24 #16 |
| F19 | OUT-24 | U06 6235:19050–6235:19061; U07 6235:16794, 6257:15055, 6257:15064, 6257:15112, 6235:16855, 6235:16857, 6242:18632, 6242:18633, 6242:50494, 6242:51053, 6235:16980, 6235:16987, 6235:17135; U08 6257:15151, 6257:15160, 6235:17304, 6242:18503, 6242:18522, 6235:17311, 6235:17422, 6235:18227, 6235:18310, 6242:18586, 6242:51200; U09 6235:18449, 6257:15277, 6235:18502, 6235:18523, 6235:18671, 6235:19045, 6257:15312; U10 6324:40008, 6324:40010, 6324:40065; U36 6376:27347, 6376:27405; sticky bars U06 6235:19052, U17 6148:4674 | A redesigned documents step:<br>- search with suggestions and an "Upcoming" catalogue<br>- an added-documents list with a counter and a pager<br>- dashed empty panels and animations (with reduced motion)<br>- inline Remove on hover and an undo toast<br>- nothing-chosen validation<br>- a 10-document catalogue (Student ID …)<br>- sticky bars | Spec 001's documents step and wizard shell. Spec 002 adds only F17 and F18's dialog | CLAR 2026-10-24 #26 (#36 supersedes it only for the rule editor's aids) |
| F20 | OUT-30 | U08 6235:18042 (list 6235:17929) | The Driving licence's "Age over 18" can be requested | Not in the catalog: age is checked through the Date of birth. "Age in years" and "Year of birth" stay as number fields | CLAR 2026-10-24 #27 |
| F21 | OUT-32, FR-006a, FR-006c | U33 6376:26181 (warnings line) | "1 warning on Ambulance", with Publish still enabled | No warnings line. Problems refuse publishing (F11) | CLAR 2026-10-24 #15 |
| F22 | OUT-18 | U33 6376:26181 (Goes live); U34 6383:66119, 6396:48549, 6396:48601, 6396:48602, 6421:31811, 6421:31805, 6396:48606, 6396:48739, 6396:48860; U36 6376:27630 (Goes live); U37 6396:47706; U38 6396:48967 | "Now / On a date", "Schedule", the "Scheduled" status and screen, the "Goes live …" chip, "Change go-live date" | No go-live choice: "Publish" goes live at once. No Schedule, no Scheduled status, no chip and no change-date action | CLAR 2026-10-24 #24 |
| F23 | FR-028c, FR-028d | U28 6197:11098 | "Couldn't save. Check your internet connection and try again." with Retry on the rules step | Nothing is stored before publishing or saving (no drafts). A failure shows in the publish/save dialog with "Try again", and nothing has changed (U35 6376:27178) | CLAR 2026-10-24 #23, #26 |
| F24 | FR-018a, FR-025f, FR-025g, EC-18, ENT-Branch.pull_url, ENT-Connection URL.pull_url | U34 6396:48632–6396:48649 (6396:48636); U37 6396:47732–6396:47749; U38 6396:48993, 6396:48997, 6396:48999, 6396:49005 | ".../result/standard", ".../result/ambulance", ".../result/school-tran…" | Main keeps the connection's existing pull URL. Every other branch's pull URL uses an identifier fixed when the branch is added, never its name. The labels and "Copy link" stay as designed, plus F31's (i) | CLAR 2026-10-24 #13 |
| F25 | OUT-19, OUT-20, OUT-22 | U37 6396:47705, 6396:47753, 6396:47754, 6396:47755, 6396:47760, 6396:47761, 6396:47763, 6396:48526, 6396:48527–6396:48547, 6396:47841; U34 6421:31818, 6396:48654, 6396:48655, 6396:48661, 6396:48663; U38 6396:48964, 6396:49011 (counts), 6396:49016, 6396:49018 | "Live since", counters, "Download PDF", Activity / "Last edited by", a "✓ Copied" button | None of these. The copy feedback follows spec 001 | CLAR 2026-10-24 #25 |
| F26 | FR-030a, FR-023a, FR-023b, FR-023c, FR-005a, FR-005c | U37 6396:48222–6396:48277 (6396:48228, 6396:48235, 6396:48274); U38 6396:49011 | A flat numbered list per variant ("01", "02"), with no groups, AND/OR or marks, and statements without the document | One read-only section per branch, in the rules step's layout, with:<br>- names ("Rule 01")<br>- statements as in F1<br>- groups and sub-groups with their AND/OR and own messages<br>- branch marks ("Changed here", "New addition", "Removed") and removed items<br>- identifiers (W1) and the branch (i) (F31) | CLAR 2026-10-24 #14 |
| F27 | FR-030b, FR-030c, US4-AS1, OUT-33 | U38 6396:48909, 6396:49030; U34 6424:34919; U37 6424:34839; U38 6424:34959 | "Edit this live connection?" on entering edit; a generic "Edit connection" | No confirmation on entry. The details lead to the rules step of spec 001's edit flow, which asks for confirmation when saving (W7). The dialog's message may move to the save confirmation (design notes) | CLAR 2026-10-24 #14 |
| F28 | OUT-23, OUT-34 | Draft badge: U07 6235:16742, U08 6235:17199, U09 6235:18397, U10 6324:40002, U11 6348:40210, U12 6350:41090, U13 6357:42623, U14 6094:6128, U15 6344:53318, U16 6344:53507, U17 6134:8516, U18 6163:4851, U19 6344:53698, U20 6344:53875, U21 6168:7005, U23 6185:8556, U24 6191:42066, U25 6196:10233, U26 6196:10568, U27 6197:10683, U28 6197:10964, U29 6197:11647, U30 6324:15411, U31 6324:16744, U32 6324:17628, U33 6376:25343, U34 6383:66098, U35 6376:26327, U36 6376:27342.<br>Save and exit: U07 6235:16862, U08 6235:17424, U09 6235:18684, U10 6324:40069, U11 6348:40218, U12 6350:41105, U13 6357:42646, U14 6094:6195, U15 6344:53339, U16 6344:53528, U17 6134:8551, U18 6163:4896, U19 6344:53747, U20 6344:53924, U21 6168:7044, U23 6185:8576, U24 6191:42089, U25 6196:10256, U26 6196:10591, 6197:12009, U27 6197:10714, U28 6197:10987, 6197:11097, U29 6198:12366, U30 6324:15434, U31 6324:16767, U32 6324:17651, U33 6376:25361, U34 6383:66116, U35 6376:26345, U36 6376:27409 | A "Draft" status badge in the wizard header; "Save and exit" in every footer, also while rules check removed data | No draft badge: the header is spec 001's. The footer has Back and the primary action only (F10, F17). No "Save and exit" | CLAR 2026-10-24 #26 (and #16) |
| F29 | FR-005f | U11 6369:62602; U12 6369:62608; U14 6113:29469; U16 6344:53623; U19 6344:53873 | "Rule 01 saved.", "Rule 02 saved.", "Rule 03 deleted.", "Rule 02 and Rule 03 are now Group 01.", "Grouped in Ambulance only. Standard stays the same." | Toasts name the rules and groups together with their branch:<br>- "Rule 01 in Standard saved."<br>- "Rule 02 in Standard saved."<br>- "Rule 03 in Standard deleted." (Undo as designed)<br>- "Rule 02 and Rule 03 in Standard are now Group 01." (Undo as designed)<br>- "Rule 01 and Rule 02 in Ambulance are now Group 02. Standard stays the same." (Undo as designed)<br>No change needed:<br>- The copy toast "Rule 06 copied to School transport." (U20 6344:54042) already names its branch.<br>- Prompts about the rule on screen (dialog titles such as "Delete Rule 03?", selection bars) keep the design's copy, as the spec's own "Save changes to Rule 01?" does | RULE wording (CLAR 2026-10-24 #19 and #20 settle that these toasts exist, not their copy) |
| F30 | FR-003e | U31 6324:17370 | "Nationality can have more than one value. The rule checks all of them." | "Nationality can have more than one value. "Includes one of" is met if any of them is one of the chosen values, "includes none of" if none of them is." U12 6357:43117 ("Met if the licence has at least one of the chosen classes.") already fits | RULE wording |
| F31 | FR-020e, FR-020f, FR-020g, FR-020h, ENT-Branch.description, FR-030a | Details, rules section headings: U37 6396:48223, 6396:48239, 6396:48255.<br>Details, pull URL labels: U37 6396:47732–6396:47749; U38 6396:48993, 6396:48999, 6396:49005.<br>After publishing: U34 6396:48632–6396:48649 | The branch names "Standard", "Ambulance", "School transport" without an (i), so a branch's description shows nowhere outside the rules step | Use the rules step's (i) (U17 6134:8719, tooltip U17 6139:32939).<br>Where it goes:<br>- right after the branch's name, in the heading of each branch's rules section<br>- in the label of its pull URL<br>- the same where the URLs are shown after publishing<br>How it works:<br>- It shows the description in a tooltip, on hover and on keyboard focus.<br>- A branch without a description, main included, shows no (i).<br>- Where FR-026c shows the URLs without branch names (W2), no (i) appears either | CLAR 2026-10-24 #37 |
| F32 | FR-002e, FR-003o | U24 6191:42209 (Rules/Multi-select menu of the Licence classes value field 6191:42191); U25 6197:11783 (same component, typed search) | Placeholder "Search options"; the options as bare codes (A, A1, B, BE, C, C1, D) | Build it like U12's class menu (6357:43382, "Rules/Menu item · class" rows):<br>- The placeholder is "Search classes".<br>- Each option shows its code with its description, e.g. "B Cars up to 3.5 t", as in U12 6350:42145, with checkboxes for several values.<br>- The footer "Select at least one option." (FR-002h) stays.<br>- The empty result "No options match "XL"." (U25) stays.<br>- The chips in the field (U24 6191:42191) and the saved statements keep the codes only ("B", "BE").<br>- Option menus of other enums, such as Nationality, keep "Search options" | CLAR 2026-10-24 #36 (the question behind it listed this menu as codes-only), confirmed by #39 ("the class value menus' "Search classes"") |

## Build without frames (decided)
| # | req | expected surface | build from (nearest frame or KERN pattern) | decision |
|---|---|---|---|---|
| W1 | FR-010h, ENT-Rule.identifier, ENT-Group.identifier, ENT-Sub-group.identifier | Details, in every branch's section | A read-only identifier next to each rule, group and sub-group name. Use the name label of the rule row (U14 6094:6469) and the group header (U14 6094:6413). Not in the rules step (FR-010i), which U14 already follows | CLAR 2026-10-24 #32 |
| W2 | FR-026c | After publishing; details | Spec 001's URL display for a connection with only the main branch: the trigger URL plus one pull URL without a branch label. Nearest Figma: U37 Request link row 6396:47720, 6396:47721 and Result link section 6396:47729–6396:47731 | CLAR 2026-10-24 #13 |
| W3 | FR-020a, FR-020b, FR-020c, FR-020d, FR-020j, FR-006b, US3-AS9 | Rules step, branch tabs (U17 6134:8603, 6134:8719); Edit variant dialog | A KERN menu on each tab, like the rule ⋯ menu U14 6113:28988:<br>- "Rename" for every branch, main included.<br>- "Delete" for every other branch, after a KERN confirmation dialog like U14 6113:29056.<br>"Rename" opens the Add variant dialog (U17 6139:32693):<br>- titled "Edit variant", with "Variant name" and "Description - Optional"<br>- with the helper "Shown when someone hovers the (i) next to the variant name."<br>- without "Start with"<br>Name errors:<br>- A missing name is reported in the dialog as in U26 6197:12011 ("Enter a name for the variant."), and a duplicate name the same way.<br>- Proposed copy for a duplicate, after U15 6344:53414: "Another variant is already called Ambulance." The design notes hold the final wording.<br>- FR-006 still refuses either at publish/save.<br>Once main has a description, "Standard" gets the (i) like the other tabs | CLAR 2026-10-24 #8, #38 |
| W4 | FR-021c, FR-021d, FR-022b, EC-11, EC-12, EC-13, EC-14, US3-AS3 | Rules step, based branches | The existing marks: "Changed here" (U17 6134:9009), "New addition" (U17 6134:9064), "Removed" (U18 6163:5856) and the link strip (U18 6344:60020). When main changes things:<br>- Main changes a rule the branch changed: the branch keeps its version, still "Changed here".<br>- Main removes a rule the branch changed: the branch's version shows "New addition".<br>- Main removes a rule the branch removed: it disappears from the branch.<br>- Main adds a rule or changes a followed one: it shows unmarked in based branches, not in empty-started ones.<br>The top-level AND/OR follows main until switched. Then it is marked like the group in U18 6163:5438, with the badge on the first top-level connector, since the top level has no header | CLAR 2026-10-24 #9 (and #10) |
| W5 | EC-17 | Rules step, a branch without rules | The main branch's empty state, under the branch's tab: U29 6197:11654 ("No rules yet", "+ Add rule") | CLAR 2026-10-24 #11 |
| W6 | FR-004d, ENT-Group.error_message, ENT-Sub-group.error_message | Rules step, group and sub-group headers | "Add error message" / "Remove error message" in each group's and sub-group's ⋯ menu (U14 6094:6413, 6094:6320). The message card sits under the header as in U14 6324:39410, with the hint 6324:39419 | CLAR 2026-10-24 #12 |
| W7 | FR-030c, US4-AS1, US4-AS2 | Rules step (edit); publish/save dialog | The create flow's rules step (U14 6094:6127) inside spec 001's edit flow, with "Save" as the primary action. Spec 001's save dialog, extended with U33's per-branch summary rows (6376:26181). A failure shows as in U35 6376:27178 | CLAR 2026-10-24 #14, #23 |

## Clarify questions
None open. CLAR 2026-10-24 #39 answered the previous report's only question, about a search field in the Place of birth part picker (see the Summary).

## Coverage
| req-id | status | units |
|---|---|---|
| FR-001a | COVERED | all 32 audited units |
| FR-001b | COVERED | U07–U09, U11, U14–U17, U23, U29, U31, U32, U34, U36 |
| FR-001c | CONFLICT → F17, F10 | U07–U10, U13, U24, U25, U29–U32, U36 |
| FR-002a | COVERED | U11–U17, U20, U21, U24–U34 |
| FR-002b | COVERED | U11–U13, U30, U31 |
| FR-002c | CONFLICT → F6, F7 | U12–U15, U17, U19–U21, U23–U25, U28, U30, U31 |
| FR-002d | COVERED | U08, U11, U12, U24, U25, U27, U32 |
| FR-002e | PARTIAL → F32 (part pickers per CLAR 2026-10-24 #39, see FR-003p) | U11, U12, U24, U25 |
| FR-002f | COVERED | U25 |
| FR-002g | COVERED | U11, U12 |
| FR-002h | COVERED (two wordings of one footer, FYI 20) | U11, U12, U24 |
| FR-003a | CONFLICT → F3, F5, F7, F8 | U11–U13, U17, U20, U21, U23, U25–U28, U30–U32 |
| FR-003b | CONFLICT → F6 | U31 |
| FR-003c | CONFLICT → F7 | U13, U31 |
| FR-003d | PARTIAL → F8, F5 | U12, U14–U21, U23–U28, U30, U31, U33, U37 |
| FR-003f | CONFLICT → F3 | U11, U12, U20, U21, U25, U30, U32 |
| FR-003g | PARTIAL → F4 | U12, U25, U26, U28, U30 |
| FR-003h | CONFLICT → F5 | U08, U12, U14–U20, U23–U26, U28, U30, U33, U35, U37 |
| FR-003i | COVERED | U08, U11, U13, U32 (U32's part picker resolves U11's PARTIAL) |
| FR-003j | CONFLICT → F2, F3 | U11, U14–U21, U23, U27, U28, U30 |
| FR-003k | CONFLICT → F1, F3 | U11, U12, U14–U21, U23, U25–U28, U30, U32–U35, U37 |
| FR-003l | PARTIAL → F4 | U11, U12, U15, U18, U21, U25, U26, U28, U30 |
| FR-003m | COVERED (U25's message for 0 → F9) | U25 |
| FR-003n | COVERED | U31 (its note on the Height inputs 6324:17199, 6324:17304; the row itself is F6's "between") |
| FR-003o | PARTIAL → F32 | U12 (6350:42145 shows code and description), U24 (codes only) |
| FR-003p | COVERED (Place of birth part picker as designed, CLAR 2026-10-24 #39) → F5 (Licence classes part picker) | U32 (U12 and U25 have no Licence classes part picker) |
| FR-004a | COVERED | U11–U21, U23–U35, U37 |
| FR-004b | CONFLICT → F9 | U11–U13, U24–U26, U28, U30–U32 |
| FR-004c | COVERED | U14 |
| FR-004d | PARTIAL → W6 | U14, U17, U28, U33 |
| FR-005a | PARTIAL → F1, F26 | U11, U12, U14–U21, U23, U26–U28, U33–U35, U37 |
| FR-005b | PARTIAL → F1 | U11–U21, U23, U25–U28, U30, U33–U35, U37 |
| FR-005c | COVERED (details → F26) | U10–U21, U23–U28, U30–U35 |
| FR-005d | PARTIAL → F12 | U15, U16, U23, U26 |
| FR-005e | COVERED | U18–U20 |
| FR-005f | PARTIAL → F11, F12, F18, F29 | U06, U07, U09, U10, U15, U16, U19, U20, U23, U26–U28 |
| FR-005g | CONFLICT → F2 | U30 (FR-003j maps F2's saved rows) |
| FR-006a | PARTIAL → F11, F21 | U10, U11, U25, U27, U33 |
| FR-006b | COVERED (duplicate name → W3) | U26 |
| FR-006c | PARTIAL → F11, F21 | U27, U32, U33 |
| FR-006d | COVERED | U11–U13, U24–U26, U30–U32 (the disabled "Save rule" is settled as designed) |
| FR-006e | CONFLICT → F10 | U11, U13, U16, U24–U26, U28, U30, U32 |
| FR-006f | COVERED (built per F10) | U12, U13, U24, U25, U28, U30–U32 |
| FR-006g | CONFLICT → F10 | U11–U13, U24–U26, U28–U32 |
| FR-006h | COVERED | U28 |
| FR-007a | COVERED | U12, U14–U21, U23, U26, U28, U33–U35 |
| FR-007b | COVERED | U12, U14–U21, U23, U26–U28, U33–U35 |
| FR-007c | COVERED | U12, U14–U21, U23, U27, U28, U33 |
| FR-008a | COVERED | U14–U21, U23, U26, U33 |
| FR-008b | COVERED | U14–U21, U23, U26–U28, U33 |
| FR-008c | COVERED | U14–U21, U23, U26–U28, U33 |
| FR-008d | COVERED | U14, U15, U17–U21, U23, U26 |
| FR-008e | CONFLICT → F13 | U14–U16, U20, U23, U27, U28 |
| FR-008f | CONFLICT → F13 | U23 |
| FR-010h | SPEC-ONLY → W1 | – |
| FR-010i | COVERED | U14 |
| FR-013a | CONFLICT → F7 | U13, U31 |
| FR-013c | CONFLICT → F7 | U13, U31 |
| FR-014c | PARTIAL → F4 | U11, U25, U26, U28, U30 |
| FR-018a | CONFLICT → F16, F24 | U10–U12, U14–U21, U23, U26–U28, U33–U35, U37, U38 |
| FR-019a | COVERED | U11, U12, U14–U21, U23, U26–U28, U33–U35 |
| FR-019b | COVERED | U17, U26 |
| FR-019d | CONFLICT → F16 | U11, U12, U14–U21, U23, U26–U29, U33–U35 |
| FR-020a | SPEC-ONLY → W3 | – |
| FR-020b | SPEC-ONLY → W3 | – (U10 cites it only for its dialogs' branch names, U29 for the missing control) |
| FR-020c | SPEC-ONLY → W3 | – (U23 cites it only for contrast) |
| FR-020d | COVERED (duplicate name → W3) | U26 |
| FR-020e | COVERED (details and after publishing → F31) | U17–U21, U23, U26 |
| FR-020f | COVERED (details and after publishing → F31) | U17–U21, U23 |
| FR-020g | COVERED (details and after publishing → F31) | U17–U21 |
| FR-020h | COVERED | U17–U21, U23 |
| FR-020i | COVERED | U17, U26 |
| FR-020j | SPEC-ONLY → W3 | – |
| FR-021a | COVERED | U17–U21, U23, U26, U33 |
| FR-021b | COVERED | U17–U21, U23, U26 |
| FR-021c | COVERED (copy to main) → W4 | U20 |
| FR-021d | PARTIAL → W4 | U19, U21, U23 |
| FR-022a | COVERED | U17–U21, U23, U26 |
| FR-022b | PARTIAL → F14, W4 | U23 |
| FR-022c | COVERED | U18, U19 |
| FR-022d | COVERED | U12, U14–U16, U18–U20 |
| FR-022e | COVERED | U12, U18–U20 |
| FR-022f | COVERED | U18–U20 |
| FR-023a | COVERED (details → F26) | U17–U21, U23, U33 |
| FR-023b | PARTIAL → F15, F26 | U17–U21, U23, U33 |
| FR-023c | COVERED (details → F26) | U18, U19, U21, U23 |
| FR-024a | COVERED | U18, U19, U23 |
| FR-024b | COVERED | U23 |
| FR-024c | COVERED | U23 |
| FR-025b | COVERED | U17, U34, U37, U38 |
| FR-026a | COVERED | U34, U35, U37, U38 |
| FR-026b | COVERED | U34, U37, U38 |
| FR-026c | SPEC-ONLY → W2 | – |
| FR-028d | COVERED (U28's toast → F23) | U28, U33–U36 |
| FR-029 | PARTIAL → F18 | U06, U07, U09, U10, U27 |
| FR-030a | PARTIAL → F26, F31, W1 | U34, U37, U38 |
| FR-030b | PARTIAL → F27 | U34, U37, U38 |
| FR-030c | PARTIAL → F27, W7 | U33–U35, U37, U38 |
| FR-031 | COVERED | U09, U10, U13–U15, U17, U19, U20, U23–U25, U27–U30, U36, U38 |
| US1-AS1 | COVERED | U11, U16, U21, U35, U37 |
| US1-AS2 | CONFLICT → F3, F5, F8 | U08, U11, U12, U16, U24, U25, U27, U31, U37 |
| US1-AS3 | COVERED | U09, U11, U29, U32 |
| US1-AS6 | PARTIAL → F11 | U27 |
| US2-AS1 | COVERED | U12, U14–U16, U18–U21, U26–U28 |
| US2-AS6 | COVERED | U14, U15, U17–U21, U23, U26 |
| US2-AS7 | CONFLICT → F13 | U14–U16, U20, U23, U27 |
| US3-AS1 | COVERED | U17, U20 |
| US3-AS2 | COVERED (U23 → F15) | U16–U20, U23, U33 |
| US3-AS3 | COVERED → W4 | U20 |
| US3-AS4 | COVERED | U17–U19, U21, U23, U33 |
| US3-AS5 | COVERED | U18, U23 |
| US3-AS6 | COVERED | U17, U26 |
| US3-AS7 | COVERED | U37, U38 |
| US3-AS9 | SPEC-ONLY → W3 | – |
| US4-AS1 | PARTIAL → F27, W7 | U15, U37, U38 |
| US4-AS2 | SPEC-ONLY → W7 | – |
| US4-AS3 | PARTIAL → F18, F11 | U06, U07, U09, U10, U27 |
| EC-8 | CONFLICT → F7 | U12–U15, U17, U19–U21, U24, U25, U28 |
| EC-9 | CONFLICT → F13 | U14–U16, U20, U27, U28 |
| EC-11 | SPEC-ONLY → W4 | – |
| EC-12 | PARTIAL → F14, W4 | U23 |
| EC-13 | PARTIAL → F14, W4 | U23 |
| EC-14 | COVERED | U17, U20, U26 |
| EC-15 | PARTIAL → F15 | U18, U23 |
| EC-16 | CONFLICT → F13 | U23 |
| EC-17 | SPEC-ONLY → W5 | – |
| EC-27 | COVERED | U19 |
| EC-28 | PARTIAL → F12 | U14–U16 |
| ENT-Rule.document | COVERED | U11–U13, U17, U20, U21, U23–U25, U28, U30–U33 |
| ENT-Rule.field | COVERED (licence class parts → F5) | U11–U13, U17, U20, U21, U23–U25, U28, U30–U33 |
| ENT-Rule.condition | PARTIAL → F1 | U11–U14, U17, U19–U21, U23, U24, U26, U28, U30–U32 |
| ENT-Rule.error_message | COVERED | U11–U14, U16–U21, U23–U28, U31, U33, U37 |
| ENT-Rule.identifier | SPEC-ONLY → W1 | – |
| ENT-Rule.name | COVERED | U10–U21, U23–U28, U30–U33 |
| ENT-Rule.branch | COVERED | U17, U20, U21 |
| ENT-Rule.parent | COVERED | U15–U17, U20, U21, U34 |
| ENT-Group.members | CONFLICT → F13 | U14–U18, U21, U27, U28 |
| ENT-Group.operator | COVERED | U14–U21, U23, U26, U28, U33 |
| ENT-Group.error_message | COVERED (add/remove → W6) | U14 |
| ENT-Group.identifier | SPEC-ONLY → W1 | – |
| ENT-Group.name | COVERED | U14–U21, U23, U26–U28, U33 |
| ENT-Sub-group.members | COVERED | U14, U15, U17, U18, U20, U28 |
| ENT-Sub-group.operator | COVERED | U14, U15, U17, U19, U20, U23, U26, U28, U33 |
| ENT-Sub-group.error_message | SPEC-ONLY → W6 | – |
| ENT-Sub-group.identifier | SPEC-ONLY → W1 | – |
| ENT-Sub-group.name | COVERED | U14, U15, U17–U20, U23, U26, U28, U33 |
| ENT-Branch.name | COVERED | U10–U12, U14–U21, U23, U26–U28, U33, U34, U37, U38 |
| ENT-Branch.description | COVERED (details and after publishing → F31) | U17, U18, U20, U21, U23, U26 |
| ENT-Branch.rules | COVERED | U12, U17, U20, U21, U37 |
| ENT-Branch.operator | COVERED | U12, U14–U17, U19–U21, U27, U28, U34, U35 |
| ENT-Branch.pull_url | CONFLICT → F24 | U34, U37, U38 |
| ENT-Branch.origin | COVERED | U17–U21, U23, U26, U33 |
| ENT-Branch Change.item | COVERED | U17, U18, U20, U21 |
| ENT-Branch Change.kind | COVERED | U17–U21, U23, U33 |
| ENT-Branch Change.undoable | COVERED | U18, U19, U23 |
| ENT-Branch Change.dissolved_group | CONFLICT → F13 | U23 |
| ENT-Form Connection.branches | COVERED | U17–U21, U23, U33, U37 |
| ENT-Connection URL.trigger_url | COVERED | U34, U37, U38 |
| ENT-Connection URL.pull_url | CONFLICT → F24 | U34, U37, U38 |
| FR-003e (UI N) | PARTIAL → F30 | U12, U21, U25, U31 |
| FR-009a, FR-009c, EC-1 (UI N) | COVERED (copy) | U11, U15, U21, U29, U36 |
| FR-011b, US2-AS4 (UI N) | COVERED (hint) | U14, U21 |
| FR-012c, FR-012d, EC-2 (UI N) | COVERED (hints) | U11, U30 |
| FR-012e, FR-012f (UI N) | COVERED (hints) | U23, U30 |
| FR-013d (UI N) | COVERED (hint kept by F7) | U13, U31 |
| FR-014a, EC-5 (UI N) | CONFLICT → F4, F5 | U11, U30 |
| FR-014b, EC-6 (UI N) | COVERED | U12 |
| FR-019c (UI N) | COVERED | U07, U33, U37 |
| FR-025a (UI N) | COVERED | U34, U37, U38 |
| FR-025f, FR-025g, EC-18 (UI N) | CONFLICT → F24 | U34, U37, U38 |
| FR-028a (UI N) | COVERED | U38 |
| FR-028c (UI N) | PARTIAL → F23 | U28, U35 |
| FR-010f (UI N) | COVERED | U28 |
| ENT-Document Request.trigger, ENT-Document Request.evaluated_branch (UI N) | COVERED | U17, U37 |
| Other UI = N requirements | not drawable (evaluation, pull answer, storage) | – |

## Not audited
| unit | status | content | coverage gap |
|---|---|---|---|
| U01 | OUT | Log in (empty, filled, wrong, forgot, loading, logged out) | None for spec 002 (spec 001 sign-in) |
| U02 | OUT | Your connections (list, user menu, delete/edit dialogs) | None for spec 002 (spec 001 overview) |
| U03 | OUT | Save and exit (saving, draft saved) | Drafts are out (OUT-23, F28) |
| U04 | OUT | Log out with unsaved changes | None for spec 002 (spec 001 shell) |
| U05 | OUT | Create connection (first, filled, info, empty, Form ID used, returning) | None for spec 002 (spec 001 create step) |
| U22 | OUT | Problems: contradiction, duplicate, suggestion (marked "later: not in spec yet") | Out of scope (OUT-21, OUT-32) |
| U39 | OUT | Deactivate / delete connection (menu, dialogs, deactivated, after delete) | Spec 001 lifecycle. FR-027c (deactivate, reactivate and delete apply to the trigger URL and every branch's pull URL) is UI = N, but these dialogs' copy wasn't checked for branches |

No unit is UNCERTAIN, FAILED or RATE_LIMIT. This run remapped only U12, U25, U31 and U32. The other 28 audited units keep their mappings from earlier runs.
