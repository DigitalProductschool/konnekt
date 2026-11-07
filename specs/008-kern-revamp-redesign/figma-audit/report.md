# Figma ↔ spec audit — 2026-11-07

## Summary
Units audited 100/101 (OUT 1, UNCERTAIN 0, FAILED 0). Figma calls 290 (289 recorded in the unit files + 1 mapper); units.md records 12 calls in this remap (U19 4, U38 3, U70 3, U96 2).

Requirements index: spec.md mtime 2026-11-07 16:00:35 UTC (196 added, 158 changed, 1 removed ID).

Governance: spec.md says **"Figma decides wording"**. A pure wording difference is copy to port (listed under cosmetic with `RULE wording`, no question). Copy from outside the frontend and renamed concepts are C items. Every question carries its kind (F, W or C) from the spec's drift table.

Design decisions applied:
- Session 2026-11-06: #1 (defer what needs a change outside the frontend) and #2 (adjust colour pairs that fail AA). #3 (verification tables) settles nothing here.
- Session 2026-11-07: #1–#45 (= Q1–Q45 of the previous report). Every answer refers to the design.
- Two decisions settle the same point differently in two places:
  - The ⓘ next to "Connection name": #45 is later than #15, so the name-field ⓘ is built as drawn (U19 #11). OUT-42 and FR-051i's conflict note should be removed from the spec.
  - 005-S6.3: #41 lists it for building, #7 removed it. The row's own interim look applied only "until Figma has a design", and U93 is that design, so the draft details show no step line (W8).
- Most of the previous report's open items are now settled. They moved to "Figma must change", "Build without frames" and "Copy from outside the frontend". What stays open is new drift that the decisions did not reach, or a decision whose amendment still doesn't match a frame.

| category | count |
|---|---|
| Conflicts (open) | 3 |
| Spec-only (open) | 1 |
| Figma-only, behavioural (open) | 1 |
| Partial matches (open) | 10 |
| Figma-only, cosmetic: copy to port, layout and ui-detail (FYI) | 35 |
| Figma must change (decided) | 62 |
| Build without frames (decided) | 20 |
| Copy from outside the frontend (decided) | 6 |

Top 5 issues (open items only):
1. **Test-step data card and result heading.** The newer Test 1 frames (U65–U74, U99) draw a flat list, a date of birth without the age, "B since <date>" without the years, merged classes and "Result: doesn't meet 2 rules". CLAR #6 and #31 (c) took the document column and the formats from the older Publish frames (U75–U79). Conflict 1, Q1.
2. **Leaving and saving in the edit flow of a published connection.** E5b's "Save your changes?" dialog (U99) is undecided. CLAR #8 applies the create flow's Save and exit, which the edit flow doesn't have. It is also open whether "Save" is disabled while a rule is open. Conflict 2, Q2.
3. **Menus in variants and on groups.** Build note 10 hides Rename and Duplicate on items linked to Standard and limits when "Copy to variant" shows. Group menus have no "Rename" and no "Remove message". Partials 4–5, Q8, Q9.
4. **Details gaps the decisions left.** These are the draft details' main heading and button placement (Q6), where the connection ⋯ and "Activate again" go once the date pill is gone (Q7), and the drawn text of the "Result link" ⓘ (Q4).
5. **Grouping depth.** "Group with other rules" appears on a rule inside a sub-group and on a group that already holds one, which would create a third level. Conflict 3, Q3.

## Conflicts
| # | req | Figma (unit, node-id) | conflict |
|---|---|---|---|
| 1 | FR-024a, FR-024c, FR-024d, FR-043b, 004-S8.4.2, 004-S8.4.3 | CONFLICT: U66 #19, #25; U68 #21, #32; U72 #26 (7058:61750); U73 #13 (7058:62077, 7137:50166). PARTIAL: U65 #15, #16, #18, #21, #26 (7057:58772, 7057:59071, 7057:59079, 7057:58811, 7057:59186); U67 #14–#16, #20 (7058:60746, 7058:60752); U68 #14, #15, #18; U69 #15, #16, #18, #24 (7057:60456, 7057:60779, 7057:60495); U70 #15, #17, #18 (7057:61649); U71 #15, #17, #19, #21 (7058:61436, 7058:61444, 7058:61454); U72 #15, #16, #18, #22 (7058:61720); U73 #12 (7058:62058); U99 #43, #44 (7114:49747, 7114:49766); build note U06 #31 | The Test 1 frames, which CLAR #32 makes the reference for the persona row, draw a different data card and heading from the one CLAR #6 and #31 (c) adopted: a flat list with no document column, "08.07.2007" without " · 19", "B since 20.08.2025" without " · <n> year(s)", "B, BE since 02.05.2010" in one row, "ID valid until" as a label, and "Result: doesn't meet 2 rules" with a count. The decided formats exist only in the older Publish frames (U63, U75–U79). |
| 2 | FR-026a, FR-045c, FR-045e, 005-S0.7 | U99 #33 (7173:52810), #34, #35 (7173:52836); E5a U99 #22 (6890:46197) | In the edit flow, "Your connections" opens "Save your changes?" ("If you leave now, your changes are lost. Save them, or discard them and keep the active version.") with "Discard changes" and "Save". CLAR #8 (a) lists U99 #33 under "runs Save and exit", but a published connection's edit flow has no Save and exit (005-S0.7, F5). The create flow's "Leave this connection?" wording doesn't fit, and whether "Save" goes through "Save changes?" (FR-045c) is open. |
| 3 | 002-S2.10, FR-036c, FR-036d, FR-038e | U55 #27 (6531:39068), #30 (6522:32424); U58 #20; build note U54 #5 (6522:33107) | "Group with other rules" is offered on a rule inside a sub-group and on a group that already contains a sub-group. Both would create a third level, which 002-S2.10 forbids. CLAR #22 decided only a rule's menu (adopt) and a sub-group's menu (Figma error). A top-level group's menu, and the build note's condition "only when another rule or group is on the same level", are undecided. |

## Spec-only (not in Figma)
| # | req | prio | expected surface | note |
|---|---|---|---|---|
| 1 | 004-S8.6.1 | P3 | Test step, result card of a variant no citizen can meet: "No citizen can meet the rules of Standard." above the heading | Build note 29 says "⚠ on the variant tab + hover tooltip, no banner" (U06 #35, 7058:63148), and U71 #21 (7058:61454) draws no line above the heading. No decision names the row (CLAR #42's test-step set doesn't list it). W item, Q5. |

All other spec-only requirements are settled. See W1–W20 and the Coverage table.

## Figma-only — behavioural
| # | item | where (units, node-ids) | suggested requirement |
|---|---|---|---|
| 1 | The variant dialog's "Start with" preselects "Linked to Standard (recommended)" | U37 #23 (6139:32693); U52 #27 (6197:12011); U62 #25 | "The variant dialog preselects 'based on Standard', labelled 'Linked to Standard (recommended)'." A default changes what is stored when the team member doesn't choose, so `RULE ui-detail` doesn't apply. Q14 (8). |

## Partial matches
| # | req | where | difference |
|---|---|---|---|
| 1 | FR-046d, 001-S6.5, US4-AS2 | U81 #14 (6809:46555, 6809:46590); text not drawn in U80 #13, U85 #13, U87 #10, U88 #15, U90 #17 | The "Result link" ⓘ is drawn with "Your service gets the citizen's shared data from this link. Each variant has its own." CLAR #35 (e) puts "serviceBW replaces {reference} with the request reference." in that ⓘ. The decision may have missed the drawn text. Q4. |
| 2 | 005-S6.1, FR-049a, FR-049b, FR-012a | U93 #3 (7362:54693), #6 (7362:54697), #20 (7362:54920), #21 (7362:54922, 7362:55154); build notes U07 #23–#27, U02 #16 | "This connection is a draft" is drawn as the page's main heading, with the name and Draft badge in the breadcrumb. 005-S6.1 still makes the name the draft details' h1 (FR-046a moves the h1 only on the published details). "Edit connection" and "Go to connections" sit in the footer, while FR-049b says the status band offers them. Q6. |
| 3 | 002-S6.7, 001-S6.9–S6.11, FR-048b | U07 #7, #8 (7370:55183); U87 #8; U88 P14/P15 (6417:30900, 6417:31060); U89 #9, #10 (7355:61548, 7355:61549); U90 #7 (7355:61614); U94 #8; U95 #10; U97 #8, #9 (7355:61025, 7355:61094, 7355:61026, 7355:61095) | The connection ⋯ menu sits inside the status-date pill, with "Activate again" next to it. CLAR #37 (c) drops the pill, so both need another place. Q7. |
| 4 | 002-S2.16, 002-S4.10, FR-036b, FR-040b | build note 10 U54 #3, #4 (6522:33107); U39 #27e, #28b; U56 #40; U57 #18, #19 | Build note 10 hides Rename, Duplicate, Ungroup and "Remove from group" on rules and groups linked to Standard in a variant. It shows "Copy to variant" only while another variant could still receive the item. CLAR #22 builds Rename and Copy to variant "on rule menus" without saying whether that includes linked rules. Q8. |
| 5 | 002-S2.11, 002-S2.17, 002-S2.19 | U54 #2; U55 #28, #33, #34 (frames 6530:40150, 6522:32038, 6531:39026, 6522:32382); U56 #23, #28, #30; U57 #22; U58 #19; message card with pencil U35 #26 (6324:39411) | Group and sub-group menus have "Add message" but no "Remove message" and no "Rename". U55's frame names still promise "Rename" and "Add error message". CLAR #22's W list names neither. Q9. |
| 6 | FR-033a, FR-031g | U51 #22 (6197:11098); U25 #19 (7299:52174); build notes U05 #22 (6720:39042), U04 #32 (6711:39375) | The decided labels differ from the drawn frames. CLAR #17 (a) chose "Retry" from a build note, but the one drawn failure toast says "Try again". CLAR #14 (c) chose "Remove them and continue" from a build note, but the drawn dialog says "Remove 1 document" (title "No data selected in 1 document"). Q10. |
| 7 | 002-S4.15, 002-S4.17 | U34 #29 (6113:29056) | The delete-rule body describes the rule's effect, "Citizens won't be checked for licence classes C or D any more.", which needs a sentence built from each check. It doesn't say that Group 01 dissolves. Q11. |
| 8 | FR-035a, 004-S8.2.1 | U65 #10 (7057:58718); U67 #10; U68 #10; U72 #10; U75 #19; U79 #19 | FR-035a and CLAR #20 put the variant ⓘ "after '+ Add variant' on the Rules and Test steps", but the Test step has no "+ Add variant". The (i) the Test frames draw after "Standard" is Standard's description icon (F27). Q12. |
| 9 | 005-S1.3 (copy:server), 005-S1.2 | U19 #17, #17b (6699:45379, 6699:45398) | The name-missing message reads "Enter a name for the connection." The server and the baseline say "Enter a name.", and CLAR #16 quotes that wording. `RULE copy-source`, C item. Q13. |
| 10 | FR-034a, FR-045c | build note 5 U01 #21 (6637:36652); edit-flow rules step U98 #18, U99 #32c, U100 #17 | Build note 5 disables the primary action while a rule is open or rules are being grouped. CLAR #18 disables only "Test rules", and it is undecided whether the edit flow's "Save" on the rules step is disabled. Q2. |

## Figma-only — cosmetic (FYI)
Copy to port follows `RULE wording`: under "Figma decides wording" no question is needed. Layout and styling follow the design. Rows 29–35 are `RULE ui-detail` items. They are F items, and Q14 asks whether to adopt them as designed or drop them.

| # | item | where | rule / note |
|---|---|---|---|
| 1 | "Create connection" (footer bar, arrow) for "Create form connection" | U11 #20; U12 #22; U13 #19; U14 #16; U15 #22; U16 #31; U17 #40; U18 #46; U90 #34 | RULE wording: copy to port |
| 2 | Draft rows offer "View" and "Edit" for "Continue" (Edit opens the stored step, U06 #64) | U04 #8; U06 #64; U11 #18; U12 #19; U13 #17; U14 #26; U15 #19; U16 #29; U17 #36; U18 #44; U90 #32 | RULE wording: same action. A draft gets no entry confirmation (FR-045a covers published connections). |
| 3 | Dates as dd.mm.yyyy and "dd.mm.yyyy, hh:mm" wherever the frontend formats them (005-CP.1) | U02 #8; U06 #21; U11 #16; U13 #25; U14 #22; U15 #16; U16 #19; U17 #34; U18 #43; U30 #16; U32 #24; U53 #22; U87 #17; U93 #7 | RULE wording. Test-step formats are C6 and Q1. |
| 4 | Local-drafts offer texts: "Unsaved changes in "<name>"", "Unsaved changes in 2 connections", "Saved only on this device when the page closed. Nobody else can see them.", "Resume editing", "Discard changes", "Edited · …", "New, never saved · …" | U07 #13, #14; U16 #8, #11, #12, #15, #16 | RULE wording. Structure per CLAR #12 (d), (e); writes stay continuous (FR-026k). |
| 5 | "Draft saved. You can pick it up any time." as a toast, for "Draft <name> saved." | U06 #56; U17 #4, #39 | RULE wording. It is still announced (001-S7.7). |
| 6 | Step 1 and footers: "Connection name", "Description (optional)" (the marker stays in the label, 006-S4.3), placeholder "e.g. For people who live in the area and park on the street", "Choose documents →", "Set rules →", edit-flow step 1 "Connection details" / "Rename this connection or update its description." | U04 #26; U05 #27, #32; U18 #19, #21; U19 #10b, #12b, #12c, #15; U21 #20; U27 #23; U28 #24; U98 #12, #14, #16, #28 | RULE wording |
| 7 | Documents copy: search no-results "No documents match "…".", removal dialog body, "Keep document" / "Remove document" | U20 #20; U23 #21; U26 #24 | RULE wording |
| 8 | Rules-step menus, toasts, marks and strip: "Add message", "Delete sub-group", "Restore rule/group/sub-group", "Remove from <variant>", "Reset to Standard" (= Undo), "Delete variant", "Discard changes", "Rule 03 deleted.", "Rule 02 and Rule 03 are now in Group 01.", "Ungrouped. Rules 03 to 05 use their own messages again.", "Rule 01 saved.", "Grouped in Ambulance only. Standard stays the same.", "Added here" / "Removed here", "Linked to Standard", "Group 01 is removed here." | U05 #1; U30 #37; U32 #30; U35 #22, #41; U36 #27; U37 #30; U38 #23, #25; U39 #24, #26, #27b; U40 #23, #31; U41 #19; U42 #17, #18; U43 #27; U44 #37; U46 #35; U47 #12, #15, #29, #33, #34; U50 #30; U54 #7, #8, #13; U56 #23, #28, #36; U57 #17, #18, #21, #22; U58 #17, #19, #21, #22, #26; U59 #11, #20; U60 #18; U61 #21; U62 #18; U84 #30 | RULE wording. Marks keep text plus colour (002-ACC.1). |
| 9 | Rule-editor texts: "Not for rules", a "Fixed date" section (other dates only), "Search options" in the class menu, "Choose options", "Choose at least one option.", "Need other data? Add it in Documents" (asks "Save changes to Rule 01?" first, 002-S2.25), the nationality hint "… The rule checks all of them.", class-specific counting and missing notes, the boundary sentence | U09 #19, #30, #37; U29 #21; U30 #16, #17; U31 #23, #24, #41; U32 #24, #25; U48 #14, #16, #22, #23; U53 #14, #22, #29 | RULE wording (none of these rows is flagged copy:server or copy:rules) |
| 10 | Variant dialog: "*", "Description (optional)", helper "Shows when you hover the ⓘ next to the variant name.", "Linked to Standard (recommended)" / "Start empty" with hints, intro sentence | U37 #20, #22, #23; U52 #22, #23, #27; U62 #24, #25 | RULE wording. The preselection is Q14 (8). |
| 11 | Delete-Standard-rule body: "This deletes it from Standard and from the variants that follow it: Ambulance and School transport. If a variant changed this rule, it keeps its own version." | U47 #26 (6185:8847) | RULE wording. U34's effect sentence is Q11. |
| 12 | Test step: "Test rules with sample citizen data"; intro "Choose a sample citizen to check that your rules work as intended. See which rules they meet and which message they'd see. The data is made up."; "Generate all" | U63 #6; U65–U79 #7, #8, #12/#13; U74 #13, #19; U99 #39 | RULE wording. "citizen" is C2. |
| 13 | Publish texts: "Publish connection", "Save changes?", "Publishing… This takes a few seconds.", "Opening your connection page…", "Couldn't publish. Check your internet connection and try again.", the new body sentence | U05 #34; U63 #25; U73 #21, #27; U75 #9; U78 #2; U79 #3 | RULE wording |
| 14 | Edit-entry dialog body "Your changes only take effect … Started connections don't get interrupted or modified even after saving." | U15 #24; U87 #24 | RULE wording. The flow's own note is F49. |
| 15 | Details texts: "Edit connection", "Go to connections", "Activate again", "Request link" / "Result link", "Links for your service", "View links" / "Hide links", status sentences and sub-lines, the draft band's sub-line "The links can't be added to your services yet. …", the draft Links card "Created when the connection is published and active." | U07 #8; U58 #42; U63 #38; U80–U99; U88 #7; U93 #6, #17 | RULE wording |
| 16 | Status marks as Status/Connection pills with a dot instead of KERN's icon badge | #3 of the wizard units; U07 #1; U11 #13; U12 #14; U14 #11; U15 #13; U16 #26; U17 #8, #33; U18 #13, #42; U90 #30; U93 #3 | Styling per design. 005-ACC.1 holds: the text stays, so a mark is never colour alone. |
| 17 | "Save and exit" tertiary at the footer's left beside Back; "Test rules" outlined beside "Save" in the edit flow | U05 #32; U06 #69; U18 #21, #30; U19 #14; U20 #13; U26 #20; U28 #23; U33 #24; U36 #17; U38 #27; U42 #29; U43 #18; U52 #18; U70 #24; U76 #23; U100 #16 | Layout per design (005-S0.3 allows Figma's order) |
| 18 | Sticky header and footer; step head, tabs and selection bar pinned | U01 #14, #17–#19; U38 #26; U64 #13 | Layout per design (002-S0.2, 002-S0.3 hold) |
| 19 | Inner scroll regions; the documents layout fills the viewport at ≥ 800 px | U01 #16; U04 #15; U12 #21; U21 #16, #26; U23 #17; U24 #16; U25 #14; U26 #17; U27 #19; U28 #27 | Layout per design; FR-010a holds (W2) |
| 20 | Menus in the top layer: side, max height, inner scroll, closing on Esc or a click outside | U01 #9–#13; U06 #92 | Layout. placementFrom() stays (FR-009d). |
| 21 | Kit anatomy and styling: 72 px footer with 40 px buttons, check and radio anatomy and mixed state, dialog widths, × close, skeleton loading, toast types and position, scroll lock | U01 #5, #6, #8, #20; U05 #19; U06 #22, #95, #96, #98; U24 #23; U68 #28 | Styling per design and kit |
| 22 | Statement chips, symbol chips, document icons, values as comma text, the same purple for "Changed here" and "New addition" | U06 #12; U32 #34; U42 #32; rules and details units | Styling. Symbols stay hidden from assistive technology (002-S2.6); the text tells the marks apart. |
| 23 | Pencil as the edit action on rule and group messages | U33 #22; U35 #26; U48 #17 | Styling of the existing edit action. Group menus are Q9. |
| 24 | Read-only connector pill on the details; rule names in link colour on the details | U83 #31; U84 #38 | Neither is a control or a link (CLAR #24 (a), FR-046b, FR-047c) |
| 25 | Illustrations, hero and tagline, status pictures, highlighted links card, numbered markers, glyphs, scrollbars, backgrounds, heading colours, muted (i), stable button width, Fira Sans preload, "Your login is encrypted", decorative alt="" | U02 #12; U03 #28, #39; U05 #10, #11, #16, #25; U06 #20, #99, #100; U10 #3, #10; U11 #24, #27; U15 #33; U18 #9; U35 #24; U37 #18; U38 #28; U39 #30; U41 #30; U43 #29; U45 #22; U46 #37; U47 #36; U52 #19; U55 #19, #36; U57 #24; U59 #24; U60 #27; U61 #27; U64 #34; U80 #24–#26; U81 #10, #19; U82 #9; U83 #38–#42; U84 #10, #19; U85 #10; U86 #29–#31; U87 #6, #11; U88 #17, #25; U89 #11, #20; U90 #14; U91 #9; U92 #10; U93 #8; U95 #11; U96 #10; U97 #10; U99 #9, #10 | cosmetic |
| 26 | Sample data, not ported: name-like variant URL slugs (002-S6.8's identifiers stay), row order, stale layer names, "Height (cm)", Place of birth parts, a reactivate summary listing only Standard, a repeated condition, a disabled "Save rule" under an open menu | U11 #21; U12 #20; U13 #24; U16 #32, #33; U17 #38; U32 #40; U51 #18; U53 #27, #30; U63 #33; U81 #17; U82 #13; U84 #17; U89 #18, #31; U91 #15; U93 #21; U96 #17; U99 #13 | OUT-8 |
| 27 | Process notes: provenance, "Old ·" layers, open-question markers, construction layers, the note title "Rules", the design's open question on skipping Rules (the baseline stays), "Documents list: no 'x of y'" (the count stays in the document header, FR-051k) | U01 #1; U02 #22; U05 #13, #17, #18; U06 #24; U07 #21; U08 #1; U09 #1, #4; U23 #23; U64 #5 | cosmetic |
| 28 | The text of the "Leave site?" warning | U05 #43 | The browser writes its own text. FR-026e holds, and the local draft stays the safety net (FR-026k). |
| 29 | A click on the scrim closes dialogs that don't delete or publish | U06 #57 (7127:49610) | RULE ui-detail, Q14 (1). The restore dialog is F57. |
| 30 | Disabled buttons explain why on hover, beyond "Test rules" and "Set rules →" | U06 #58 (7127:49610) | RULE ui-detail, Q14 (2). They also open on focus (FR-051q). |
| 31 | A page change scrolls to the top | U06 #94 (7137:50569) | RULE ui-detail, Q14 (3) |
| 32 | Draft row meta "Edited 28.10.2026 · Rules step" | U06 #89; U17 #34, #34b (6699:48031) | RULE ui-detail, Q14 (4) |
| 33 | "Added (n)" group in the documents search card | U21 #24 (7290:62277–7290:62279); U22 #25 (7290:63546) | RULE ui-detail, Q14 (5) |
| 34 | Links accordion counts "1 request link · 3 result links" | U91 #10 (7203:50843); U92 #11; U94 #9; U95 #12; U96 #11; U97 #11 | RULE ui-detail, Q14 (6) |
| 35 | Tooltips also open on touch | U08 #4 (7370:55193) | RULE ui-detail, Q14 (7) |

## Figma must change (decided)
Build these as the spec says, keeping Figma's layout and styling, until the design is updated.

| # | req | Figma (unit, node-ids) | Figma shows | build instead | decision |
|---|---|---|---|---|---|
| F1 | 002-S5.7, 002-S5.8, 002-S6.7 | U02 #9, #10, #17; U05 #34, #38; U06 #19, #49, #65; U07 #2; U13 #12; U14 #13, #21; U58 #33; U63 #21; U73 #24; U75 #7, #11–#13 (6376:25536); U76 #27, #29–#31, #33, #34 (6635:36265); U77 #7; U86 #4, #10, #11; U87 #19–#22 (6396:48860); U88 #10, #33; U89 #32; U94 #3, #6, #7; U95 #4, #7–#9; U98 #38, #40; U99 #36, #37 | Go-live scheduling: "Active from: Now / On a date", a date field, "Enter a date after today.", "Schedule", the "Scheduled" status, rows and screens, "Active from <date>", "Change start date", "from the time you choose" | Publishing goes live at once. There is no "Active from" choice or date, the save body has no "from the time you choose", and there is no Scheduled status or screen. The ⋯ menu holds Deactivate (or Reactivate) and Delete. | CLAR 2026-11-06 #1 |
| F2 | 002-S6.9, OUT-35 | U06 #60, #82; U07 #26; U58 #41; U63 #37; U80 #20, #21; U81 #22 (6809:46582); U82 #23; U83 #33, #34; U84 #35; U85 #24; U86 #22–#26; U87 #14; U88 #21, #22; U89 #24, #25; U90 #20; U91 #26; U92 #14–#16; U93 #18, #19; U94 #20; U95 #17–#19, #22 (7246:54525); U96 #28; U97 #14, #15; U99 #17, #18 | Activity accordion, "Last edited by", the event log, "View activity" / "Hide activity", "Deactivated by …" | No Activity accordion and no editor or timestamp lines; only Links and Summary | CLAR 2026-11-06 #1; CLAR 2026-11-07 #35 |
| F3 | 002-S1.8, FR-031c | U04 #39 (6711:39375); U20 #18, #19; U21 #25; U22 #24 | "Coming soon" / "Upcoming" documents | Only the catalog's documents under "Available (n)". The all-added state doesn't point to upcoming documents. | CLAR 2026-11-06 #1 |
| F4 | 001-S6.11, 001-S6.12 | U04 #21; U05 #24; U90 #22 (6417:31520) | "Undo" in the toast after deleting a connection | Deletion stays permanent; the toast (FR-051p) has no Undo | CLAR 2026-11-06 #1 |
| F5 | 005-S0.7, 004-S0.4, FR-045b | U03 #36; U05 #31, #33, #36; U06 #50; U60 #33, #35; U98 #5; U99 #22, #23; U100 #3 | A live connection's pending changes kept as a draft: "Keep draft and exit", the "Draft changes" label, "Changes not published", E5a | No Save and exit or "Keep draft and exit" in the edit flow, and only "Active" in the header. Changes exist until saved through "Save changes?" or discarded. | CLAR 2026-11-06 #1; CLAR 2026-11-07 #34 |
| F6 | 001-S7.9 | Header of every frame U10–U100 (e.g. U15 6699:45201, U19 6699:45323, U98 6731:39823); U03 #31 | DE/EN language switch | No switch: one English UI with lang="en" | CLAR 2026-11-06 #1 |
| F7 | 002-S2.12, 002-S2.13, 002-S2.15 | U34 #27; U36 #29 (6344:53657); U54 #6, #14 (6522:33107); U55 #25, #26 (6522:32071); U56 #27 (6522:32540) | "Remove from group", "Remove from sub-group", moving a sub-group out | Group menus offer "Ungroup" and "Delete group" (inherited groups: Remove and Restore) | CLAR 2026-11-06 #1 |
| F8 | 002-S2.16 | U54 #15; U55 #29 (6522:32424); U56 #24; U57 #22 | "Duplicate group" / "Duplicate sub-group" | Duplicate stays a rule action | CLAR 2026-11-06 #1 |
| F9 | 002-S3.1, 002-S2.9, 002-S2.15 | U34 #19; U35 #20; U36 #26; U38 #21; U39 #25b; U40 #24; U41 #20; U42 #26; U43 #22; U44 #29; U45 #20; U47 #24; U51 #19, #25; U52 #17; U54 #9; U55 #21; U56 #21; U57 #16; U58 #18; U59 #22; U60 #24; U62 #14 | "+ Add rule" inside a group or sub-group | One "+ Add rule" per variant, adding at the end of the top level. Groups form only by selecting items. | CLAR 2026-11-06 #1 |
| F10 | 002-S4.14, 002-S4.31, 002-S4.4 | U03 #23 (6648:42016); U05 #4, #5, #20 (6711:39381); U06 #16 (6791:46863); U08 #5 (7370:55195) | "Unlink from Standard", its result and the toast "Unlinked from Standard." | The tab menu offers Rename, Delete and Copy link, and based variants stay based | CLAR 2026-11-06 #1 |
| F11 | 004-S8.6.4 | U06 #40 | Persona generation that makes every rule testable | Generation as today; "Couldn't be checked" stays | CLAR 2026-11-06 #1 |
| F12 | – (OUT-2) | U06 #27; U07 #29; U08 #6; U93 #22 | View-only users, roles, a view-only draft page | Every team member has the same rights | CLAR 2026-11-06 #1 |
| F13 | 001-S6.9, US4-AS3 | U88 #28 (6417:31206) | "The connection will be deactivated and its links will stop working. Requests already started still finish. Remember to remove the wallet connection from your service." | "The connection will be deactivated and its links will stop working at once. Requests in progress are cancelled. Remember to remove the wallet connection from your service." | CLAR 2026-11-06 #1; CLAR 2026-11-07 #38 |
| F14 | FR-028a, US1-AS3, OUT-10 | U04 #4, #14, #19; U06 #66; U11 #9; U12 #8, #10; U13 #9; U14 #8; U15 #8, #21, #27–#31 (6699:45206); U16 #23; U17 #29; U18 #39; U90 #27 | Row and select-all checkboxes; selection bar "N selected · Cancel · Delete"; bulk dialog with "Keep connections" / "Delete connections" | A per-row Delete with the details' dialog; no checkboxes | CLAR 2026-11-07 #11 |
| F15 | FR-027a, US1-AS5, OUT-9 | U06 #25 (6791:46863), #91; U11 #26; U18 #8, #10–#12, #16, #23, #32; U73 #25 | "Start from an example", the example dialog, example banners, the publish-dialog example line | The welcome page with "Create connection" only | CLAR 2026-11-07 #9 |
| F16 | US1-AS1, 001-S1.2, OUT-18 | U10 #13 (6401:28435) | Only Username gets the error fill | Both fields invalid, with the one message "Username or password is wrong. Check both and try again." | CLAR 2026-11-07 #10 |
| F17 | FR-030a, FR-030b, 007-S2.1, OUT-11 | U03 #32; U10 #18; U13 #22, #23 (6699:44358) | A menu with an email line and no "Your account"; a signed-in frame without the pill | The pill on every signed-in screen. Its menu shows the name (bold), "Your account" and "Log out", with no email. | CLAR 2026-11-07 #13 |
| F18 | 005-S1.2, OUT-16 | U04 #27 (6703:39321) | With no name, "Save and exit" just leaves | Step 1 with the name message under "Connection name" (wording: Q13), the field focused, nothing stored | CLAR 2026-11-07 #16 |
| F19 | FR-026a, FR-026c, FR-026f, 001-S0.6, OUT-15 | U03 #35 (6703:39311); U05 #41 (6730:40338); U06 #51, #90 (7137:50569); U17 #5, #24 (7173:52656, 6890:46052) | In a create flow, the product name and the breadcrumb save at once ("saving…", "Draft saved"), and an open editor's state is stored with the draft | Both open "Leave this connection?". "Save progress" runs Save and exit, and a validation error keeps the member in the flow. An open rule editor asks "Save changes to Rule 01?" first, and no editor state is stored. | CLAR 2026-11-07 #8 |
| F20 | FR-026i, FR-026j | U17 #20 (6408:72919) | Log-out dialog with × only | Adds "Cancel", which returns the focus to the user menu | CLAR 2026-11-07 #8 |
| F21 | FR-033d, 005-S0.4, 005-S1.4, OUT-17 | U17 #3, #23 (6401:71898, 6401:71899) | Blocking modal "Saving your draft…" | No modal: "Save and exit" is aria-disabled and reads "Saving…", and a polite status says "Saving draft…" | CLAR 2026-11-07 #17 |
| F22 | FR-033c, 005-ACC.3, 005-S8.1–S8.4, 007-S1.11, 007-S3.25, 007-S5.3 | U02 #5, #6 (build note 7) | Every page-level alert title-only | Title-only only for an alert that carries a title alone. The error ID, list, "Try again", "Remove it" and "Dismiss" stay, in the design's alert style. | CLAR 2026-11-07 #17 |
| F23 | FR-031j, FR-009a, 001-S7.2, OUT-12 | U04 #42, #43; U08 #2, #3 (7370:55193); U23 #13; U27 #11–#13, #24 (7298:63317); U28 #12 (7298:64157); "oldest first" U20 #10, U21 #10, U22 #11, U24 #10 | A drag handle, drop line, drag image and Move up/down; the list ordered "oldest first" | Catalog order with no handle and no reordering | CLAR 2026-11-07 #14 |
| F24 | FR-031j, 001-S5.3, 002-S1.2, OUT-13 | U04 #44–#47; U21 #14; U22 #16; U23 #16; U24 #14; U25 #13; U26 #14 (6324:40326); U27 #17; U28 #17; U98 #25 | Field groups (Name, Birth, Address, Document, Other details) with tri-state group checkboxes | Fields in catalog order without group rows; select-all per document (002-S1.2) | CLAR 2026-11-07 #14 |
| F25 | FR-025c, US2-AS1 | U02 #2 (6637:36653); U19 #6b (6716:40931) | The step line is never clickable | Clickable while editing, not while creating | CLAR 2026-11-07 #7 |
| F26 | 002-S2.1–S2.3, OUT-43 | U30 #25; U33 #8; U49 #5; U50 #32; U51 #27, #37; U53 #8 | No variant tab row before the first rule or while a rule is edited | "Standard" and "+ Add variant" from the start of the step and while editing; "No rules yet" in each variant | CLAR 2026-11-07 #19 |
| F27 | FR-035a–FR-035c, OUT-41, 004-S8.2.6 | Standard (i) without a description: U30 #26, U59 #9, and the Test frames U65 #10, U67 #10, U68 #10, U72 #10, U75 #19, U79 #19; variant ⓘ missing: U37 #26 (6134:8722, frames 3.2, 3.2b), U46 #28 | An (i) on Standard without a description; the variant ⓘ only while no variant exists | Standard's (i) only with a description. The variant ⓘ follows "+ Add variant" in every state and opens on hover and focus, with the design's text "A separate set of rules for citizens with different requirements. Each variant gets its own result link." (U37 6151:33820). Test step: Q12. | CLAR 2026-11-07 #20 |
| F28 | 002-S4.4, 002-S4.22, 002-S4.24, FR-023b, OUT-19 | U59 #10, #13–#15 (6523:37251, 6523:37532, 6523:37662, 6523:37665); U60 #9, #10 (6523:37675, 6523:37683); U62 #6 (7112:47821, 7112:48213) | Inline rename in the tab, double-click, "Enter saves · Esc cancels", ⋯ on the active tab only, the duplicate error beside the tab | "Rename" opens "Edit variant" (name, description). The duplicate error "There's already a variant called "Ambulance"." shows in the dialog next to the field. Every tab has its ⋯. | CLAR 2026-11-07 #21 |
| F29 | 007-S4.1, 007-S4.2, 007-S4.6, 002-S2.16, FR-036a, FR-036b, US3-AS1 | U09 #44; U34 #25; U36 #15, #28; U39 #27e, #28b; U41 #22; U47 #17, #30, #34; U54 #2, #10 (6522:33105); U55 #33; U56 #29; U57 #18, #19, #22; U58 #23, #28; U59 #11; U61 #25 | Menus without "Copy link"; removed items "Restore only"; rule menus without "Rename" and "Copy to variant" | "Copy link" last before the destructive entries in every rule, group and variant menu, also after "Restore". "Rename" and "Copy to variant" in rule menus (linked rules: Q8). | CLAR 2026-11-07 #22 |
| F30 | FR-036d, 002-S2.10, OUT-20 | U56 #25 | "Group with other rules" in a sub-group's menu | No grouping entry in a sub-group's menu | CLAR 2026-11-07 #22 |
| F31 | FR-037c, 002-S2.13, 002-S2.14, 002-S4.18, OUT-21 | U35 #21, #40; U47 #35; U51 #21, #24, #25 | A group with one member, an empty group with its own copy, and a sub-group renamed "Group 01" when it moves up | Groups left with one member or none dissolve, and a sub-group that moves up keeps its name | CLAR 2026-11-07 #23 |
| F32 | FR-037a, 002-S2.5 | U35 #28 (6324:39055, 6324:39062, 6324:39065) | Members of a group with its own message show no message line | Each member's message row reads "Not shown while this rule is in Group 01. Citizens see the group message instead." | CLAR 2026-11-07 #23 |
| F33 | FR-038d, FR-038e, 002-S2.8, 002-S2.9, 002-S4.31, OUT-22 | U40 #13, #29, #30 (6961:56291); U62 #19, #21; U64 #22 | No connector between groups, a trailing connector, the link icon on some linked rules only, groups without checkboxes in select mode | One connector between items; the link icon on every linked rule or none; groups have checkboxes and are selectable | CLAR 2026-11-07 #24 |
| F34 | 002-S3.12–S3.18, 002-S3.30, OUT-23, OUT-24 | U03 #2; U09 #22, #24, #27 (6986:50041); U29 #24, #26, #27; U31 #43; U46 #13; U49 #18; U50 #24; U53 #36 | Date-of-birth fixed-date checks, no "from now" for it, "Time passed / Time left", "at most", "on", a unit picker on age checks, "starts with", sections "Age" / "Date of birth" | Date of birth: "Time ago" and "Time from now" checks, with whole years as fixed text. Hint: "Check the time since or until this date, or compare it with a fixed date." | CLAR 2026-11-07 #25 |
| F35 | 002-S2.7, 002-S6.12, OUT-25 | rules step U03 #10; details U82 #20, U83 #24, U85 #22, U93 #14 | "Saved rules show their ID"; details without identifiers | No identifiers in the rules step. On the details, a read-only identifier (rule-7, group-3) next to each rule, group and sub-group name. | CLAR 2026-11-07 #26 |
| F36 | FR-040c, 002-S4.19, 002-ACC.1, OUT-27 | U43 #27; U47 #15, #32; U58 #26 | Removed items hide their message line; a changed rule in a removed group has no "Changed here" | The message line and the "Changed here" text stay | CLAR 2026-11-07 #28 |
| F37 | FR-040d, 002-S4.29, OUT-26 | U05 #3 (6711:39381) | A Standard-based variant shown "not linked" while Standard has no rules | It stays linked | CLAR 2026-11-07 #28 |
| F38 | FR-041c, 004-S8.2.2, 004-S8.2.3, OUT-28 | U03 #21; U06 #9; U72 #10 (if a finding marker) | Every finding kind on the Test tabs; a ⚠ hard-coded with no logic | Only "no citizen can meet", from the evaluator | CLAR 2026-11-07 #29 |
| F39 | FR-041d, 003-S2.16, 003-ACC.3 | U44 #17; U45 #28, #34 (6753:40144); U46 #11 | Names in banner lines as plain text | Links that scroll the item into view and focus its row or header | CLAR 2026-11-07 #29 |
| F40 | FR-042d, 004-S8.5.3–S8.5.5 | U66 #30, #31 (7058:60514); U67 #32, #34 (7058:60806) | Licence classes as a text input; no Nationality or Expiry date field | Classes picked from a list by code; Nationality and Expiry date fields; "Class B since" | CLAR 2026-11-07 #30 |
| F41 | FR-043d, 004-S8.6.7, OUT-30 | U06 #32; U65 #28 (7057:59533); U70 #22 | "Message Mia reads" box: "Your wallet data meets the requirements. Other documents are checked separately." | No success message for a met variant | CLAR 2026-11-07 #31 |
| F42 | FR-043a, 004-S8.6.3, 004-S8.6.4, 004-S8.6.6, 004-ACC.1, OUT-31 | U63 #14, #15; U65 #23, #24 (7057:59087, 7057:59096, 7057:59105, 7057:59114); U66 #21, #22, #25; U67 #22, #23; U68 #23, #24, #33; U69 #26, #27; U71 #23, #24; U72 #28, #29; U73 #15; U75 #25, #26; U76 #20, #21; U77 #25, #26; U78 #23, #24; U79 #31, #32; U99 #46, #47 | Result rows without the statement or status text; "19, needs 21"; a "Mia sees" box | Each row has the name, the statement, "Not met" / "Couldn't be checked" as text with the design's icon and tint, and the message. Met rows have the statement and "–". | CLAR 2026-11-07 #31 |
| F43 | FR-043c, 004-S8.4.11 | U01 #15; U65 #20 (7114:49642, 7114:49643); U66 #18; U67 #24; U68 #20; U69 #23; U70 #20a; U71 #20; U72 #23, #24; U73 #16 | Each card scrolls on its own; "only the page scrolls" | The panel scrolls as a whole; header, step line, tabs, applicants row and footer stay | CLAR 2026-11-07 #31 |
| F44 | 004-S8.3.1, 004-S8.3.2, OUT-32 | U07 #4; U63 #8; U75 #20; U76 #10, #11; U77 #21; U78 #16; U79 #20, #21 | Persona cards with avatar, age · nationality and "Meets the rules" / "Doesn't meet the rules" | Chips with the name and an outcome icon, no outcome text (U65 7057:58755) | CLAR 2026-11-07 #32 |
| F45 | 004-S8.1.2, 004-S8.2.3, 004-S8.3.4, 004-S8.3.5, 004-S8.4.1, 004-S8.7.1, 004-S8.9.3, OUT-33 | U05 #15; U06 #37, #80 (7058:63148, 7127:49610); U63 #9; U74 #21, #24 (7062:51784); U75 #21; U76 #13; U77 #22; U78 #18; U79 #23 | Generating always asks first; no test-day line during one persona's regeneration; no "Generate again" / "Generate all again"; the tab tooltip without hover; "Your rules are saved." | Asks only when there are changes. The test-day line shows during one persona's regeneration. Both buttons show in every results state. The tooltip opens on hover and focus. No "Your rules are saved." | CLAR 2026-11-07 #32 |
| F46 | FR-044e, FR-008, 002-S5.3 | U79 #3–#5 (6376:26984, 6376:27178) | "Couldn't publish" without an error ID, and the summary dropped | The "Couldn't publish" sentence with the error ID, and the summary kept | CLAR 2026-11-07 #33 |
| F47 | FR-022a, FR-044c, 003-CP.11 | U77 #8 | "1 warning on Ambulance" | "Ambulance: no citizen can meet these rules. 2 rules contradict each other, and 1 rule is a duplicate.", warnings first | CLAR 2026-11-07 #4, #33 |
| F48 | FR-045a | U87 #23, #25 (6396:49030) | "Edit this active connection?" | "Edit "<name>"?" with "Cancel" / "Edit connection" | CLAR 2026-11-07 #34 |
| F49 | FR-045f, 001-S5.9 | U05 #27; U98 #15 | "Active. Your changes take effect when you save them." | "Your changes take effect when you save them. Requests already in progress keep their previous configuration." | CLAR 2026-11-07 #34 |
| F50 | FR-046c | U85 #18; U92 #16; U95 #22 | Links not an accordion and both open; Activity open | Links and Summary accordions, one open at a time; Summary opens on arrival from "View" | CLAR 2026-11-07 #35 |
| F51 | FR-046f, 002-S6.11, 002-S4.3 | U58 #37; U63 #33; U80 #14; U81 #15; U82 #13; U83 #13; U84 #15; U85 #14; U86 #16; U87 #10; U88 #15; U89 #15; U90 #17; U91 #13, #21; U94 #11; U96 #13; U99 #12 | Variant labels without an ⓘ | A branch ⓘ after each variant name in Links and in the Summary tabs, holding the description (none without one, 002-S4.3) | CLAR 2026-11-07 #35 |
| F52 | FR-048b, 005-S3.3, OUT-37 | Details U58 #31, U63 #28, U80 #7 (7355:61158), U81 #8 (7355:61822), U82 #7, U83 #7, U84 #8, U85 #8 (7355:61738), U86 #8, U87 #7, U88 #8, U90 #15, U91 #7, U92 #8, U99 #7; deactivated U89 #8 (7355:61546), U96 #7 (7355:60885), U97 #7; overview U11 #15, U12 #16, U13 #13, #15, U14 #10, #12, U15 #15, #17, U16 #27, U17 #35, U18 #43, U90 #31; build note U07 #6 | "Active since …" / "Deactivated since …" pills; rows "Published <date>" / "Deactivated <date>" | No status-date pill, and every row reads "Edited <date>". The placement of the ⋯ is Q7. | CLAR 2026-11-07 #37 |
| F53 | 002-S6.9, OUT-36 | U07 #28; U58 #40; U63 #36; U80 #18; U81 #21; U82 #15; U83 #17; U84 #21; U85 #17; U86 #20 (6396:48385); U87 #13; U88 #19; U89 #22 (6417:31343); U90 #19; U91 #17; U92 #13; U93 #10; U94 #14; U95 #15; U96 #20; U97 #13; U99 #15 | "Download PDF" | Not built | CLAR 2026-11-07 #37 |
| F54 | 001-S6.9, 001-S6.10, OUT-38 | U05 #24; U89 #26 | Undo after deactivating | No Undo; a deactivation is reversed through "Activate again" | CLAR 2026-11-07 #37 |
| F55 | FR-029c, 005-S6.10 | U14 #18 | The draft's delete body "Its documents and rules will be deleted too." | A draft keeps "<name> will be deleted for good. It was never live, …"; title and buttons as drawn ("Delete connection" / "Keep connection") | CLAR 2026-11-07 #12 |
| F56 | FR-049c, 005-S6.9, US4-AS4 | U93 #20 | No "Delete draft" | A visible "Delete draft" on the draft details | CLAR 2026-11-07 #39 |
| F57 | FR-049d, 005-S5.5, OUT-40 | U06 #57 (7127:49610) | × and scrim close with no change | In the restore dialog, Escape, × and the scrim open the draft's details and keep the local draft | CLAR 2026-11-07 #39 |
| F58 | FR-023b, FR-023c, FR-023e, FR-023f | U49 #17, #21 (6196:10710); U50 #11 (6863:47363, 7173:52333) | "Enter a number greater than 0."; "There's already a rule called "Rule 02"."; the banner without "in Standard"; "Add it again in Documents" as plain text | "Enter a whole number greater than 0."; "There's already a rule called "Rule 02" in Standard."; "Rule 02 in Standard checks data that's no longer requested. Add it again in Documents, or edit or delete the rule.", with the "Add it in Documents" action | CLAR 2026-11-07 #5 |
| F59 | FR-051h, FR-020a | U09 #26 | "Applicants who turn 21 that day count." | "Citizens who turn 21 that day count." | CLAR 2026-11-07 #2, #45 |
| F60 | FR-032d, 006-S1.4, 006-S1.5, FR-051i, OUT-42 | U18 #18, #19; U19 #11, #11b (6809:46396, 6809:46408); U98 #13, #14 | An ⓘ on "Connection name" only, with "This name helps you … Citizens never see it." | Both ⓘ. The name field's is built as drawn (CLAR #45 is later than #15's "not built"). The description gets "About the description" / "A note for your team, such as the form's ID in your form management system. Citizens never see it." | CLAR 2026-11-07 #15, #45 |
| F61 | FR-051a, FR-051q, 001-S7.4 | U11 #7; U12 #7; U13 #7; U15 #7 (6699:47855); U16 #21; U17 #28; U90 #26 | Overview search with a placeholder only | A visible label, plus ×, "n of m connections", the no-results message and "Clear search" as in U11 #29–#33 | CLAR 2026-11-07 #45 |
| F62 | FR-050c | U06 #101 (7137:50569) | "With prefers-reduced-motion: fades only." | Transitions turned off | CLAR 2026-11-07 #40 |

## Build without frames (decided)
| # | req | expected surface | build from (nearest frame or KERN pattern) | decision |
|---|---|---|---|---|
| W1 | FR-013b, EC-8 | All screens | The design's colour tokens. A pair that fails AA gets the nearest passing value, recorded in the design notes with the pair, and the designer is told. | CLAR 2026-11-06 #2 |
| W2 | 001-S0.2, 001-S0.4, EC-9, 001-S3.7, 001-S6.14, US4-AS6, FR-012b, 005-ACC.4, EC-6, FR-010a, 001-S7.11, FR-002c, FR-005, EC-2, 001-S7.10 | Sign-in guard; overview error; deleted or unknown connection; tab titles; footer wrap; reflow | Guard as today. Overview and details errors use the design's alert with the error ID and the way back to the overview (U02 #5 pattern). A tab title for every route, with the product name per C1. The footer wraps and "Save and exit" keeps its label. Reflow below 1024 px down to 320 px and 200 % follows the design's spacing (U02 #14), with nothing hidden. | CLAR 2026-11-07 #44 |
| W3 | 005-S2.1–S2.13, US2-AS5 | Conflict dialog (draft_changed, draft_published, draft_deleted) | U90's dialog (6417:31453) | CLAR 2026-11-07 #41 |
| W4 | 005-S5.1–S5.4 | Restore dialog (Escape, ×, scrim: F57) | U17's dialog (7173:52681) | CLAR 2026-11-07 #41 |
| W5 | 005-S4.8, 005-S4.10–S4.13 | Local-drafts offer: discard dialog, status and focus after discarding, other tabs, no storage | U16's offer (7362:54543) and U14's dialog | CLAR 2026-11-07 #41 |
| W6 | 005-S8.1–S8.6 | Documents step: data the catalog no longer offers | The design's warning alert with the list and "Remove it" (F22) | CLAR 2026-11-07 #41 |
| W7 | 002-S5.4–S5.6 | Publish dialog: rules_changed conflict, "Publish without rules?" | U73 / U75's publish dialog | CLAR 2026-11-07 #41 |
| W8 | 005-S6.7, 005-S6.12, 005-S6.13, 005-S6.3 | Draft details: rule placeholders, delete errors (409, 404) | U93, and U90's dialog for the errors. 005-S6.3's interim step look applied "until Figma has a design", and U93 is that design, so no step line is shown (FR-025e). | CLAR 2026-11-07 #41 (#7 for the step line) |
| W9 | 003-S7.1, 004-S7.2 | Edit flow: checks when it opens; "Try again, or save without testing." | U98–U99; the test step's failure state (U74) | CLAR 2026-11-07 #41 |
| W10 | 006-S1.8, 006-S3.1–S3.3, 001-S5.7, 001-S5.10, 001-S5.11 | Step 1 too-long description; the description meta on the details and draft details; wizard loading and load errors; the API's 400 message | U19 #17's field error; the breadcrumb row of U80 / U91 for the meta; skeletons (U06 #95); the design's alert | CLAR 2026-11-07 #41 |
| W11 | 005-R.1, 005-R.2, 005-S0.6, 005-S0.10, 005-S0.11, 005-S1.6, 005-S1.9, 005-S1.10, 001-S4.3, 001-S4.5, 005-S4.11, 005-S3.9 | Flow key in the URL, no badge before the first save, the move to documents for dropped data, checks re-run, a failure keeps the work, 401, alert lifetime, first-connection validation and reopening; a draft counts as a connection on the homepage | Behaviour only | CLAR 2026-11-07 #41 (#9 for 005-S3.9) |
| W12 | 002-S2.20, 002-S2.21, 002-S2.24, 002-S2.36, 002-S3.31, 002-S4.9, 002-S4.18, 002-S4.27, 002-S4.28, 002-S4.30, 004-S2.5 | Rules step: reserved "Rule NN" names, names an undo could bring back, focus after a refused attempt, Standard's delete-group dialog naming variants, letter case in the statement, the switched top-level AND/OR and its badge, propagation, an inherited group dissolving in a variant, "Save changes?" leaving no rule | The design's banner, toast and outline patterns (U35, U44–U47) | CLAR 2026-11-07 #42 (#23 for 002-S4.18) |
| W13 | 003-S2.5, 003-S2.17, 003-S2.19–S2.21, 003-S4.4, 003-ACC.5, 003-ACC.6, 003-CP.3, 003-CP.6, 003-CP.15, 003-CP.17, 003-CP.18, FR-022b | Findings: hidden kind text, a notice without links, update in place, the status region, the tab's accessible name, reflow, the undrawn texts | U44–U46's banner, notes and outlines; texts per C2 and C4 | CLAR 2026-11-07 #42 |
| W14 | 004-S8.5, 004-S8.5.8, 004-S8.5.13, 004-S8.6.5, 004-S8.7.3, 004-S8.7.4, 004-ACC.2, 004-ACC.3 | Test step: a later flow's loading, clearing fields, class dates returning, group members, the "all" dialog, the name kept, arrow keys, focus | U65–U74 | CLAR 2026-11-07 #42 |
| W15 | 007-S4.5, 007-S5.1–S5.8, US3-AS5 | Deep links into the rules step: "This link points to a variant that no longer exists." / "This link points to a rule or group that no longer exists." with "Dismiss"; focus; history; the toast announcement | The design's warning alert (F22) and toast | CLAR 2026-11-07 #42 |
| W16 | US5-AS1–US5-AS4, 007-R.1–R.3, 007-S1.1–S1.12, 007-S2.2–S2.15, 007-S3.1–S3.26, FR-019b | Consent, account and approval pages | The design's card, radio group (AccessLevelChoice), list rows with a ⋯ menu (as the rule menu), dialogs, the copyable field with "✓ Copied", alerts. 007's wording, with the product name per C1, the noun per C2 and findings per C4. 007-S3.25's failure follows CLAR #17. | CLAR 2026-11-07 #43 |
| W17 | FR-040b, 002-S4.13 | Copy-to-variant popover: choosing Standard covers its based variants, shown as included and not choosable | U41's popover (6344:53928) | CLAR 2026-11-07 #28 |
| W18 | 002-S4.24, FR-023b | "Edit variant" dialog: duplicate-name error next to the field | U52's error state (6197:12011) | CLAR 2026-11-07 #21, #5 |
| W19 | FR-039a–FR-039e, 002-S3.2, 002-S3.8, 002-S3.10, 002-S3.19, 002-S3.22, 002-S3.33, 002-S3.37, 002-S3.38 | Rule editor: pickers disabled until the previous one is chosen, inline flags, counting and missing notes next to every date condition, "Choose part" after "Licence classes", the placeholder "Message for citizens: Suggested once you choose a check. You can edit it.", class options "B Cars up to 3.5 t" | U30 #42, #46; U31 #20; U32 #19; U33 #15; U35 #32; U48 #15, #24; U49 #9; U51 #31; U53 #30, #31, #35 | CLAR 2026-11-07 #27 |
| W20 | FR-033a, FR-033b, FR-033d, 005-S0.4, 005-S1.4 | Wizard footer while saving; the failed-save toast for a server error, with its error ID | U51's toast (6197:11098); the footer button | CLAR 2026-11-07 #17 |

## Copy from outside the frontend (decided)
| # | req | source | Figma shows | current text | decision (CLAR …) |
|---|---|---|---|---|---|
| C1 | FR-019a–FR-019c, EC-4, US5-AS4, 001-S0.6, 007-S1.2, 007-S2.5 | Frontend; MCP guidance (`mcp/plugin/skills`); backend and MCP server texts naming the product; README and docs | "Konnekt" (e.g. "Welcome to Konnekt", "… Konnekt checks each rule …") | "Connection Portal" | CLAR 2026-11-07 #1 |
| C2 | FR-020a–FR-020c | Frontend; `rules/src/checks/findingMessages.ts`; the rules package's test-step texts; the MCP guidance that repeats findings | "citizen(s)", "Message for citizens:", "sample citizen", "Creating 3 sample citizens…" | "applicant(s)", "Error message applicants read", "sample applicant" | CLAR 2026-11-07 #2 |
| C3 | FR-021a–FR-021c, 002-S2.4, 002-S2.27, 002-S2.29, 002-S3.9 | The rules package (statements, proposed messages); MCP outputs quoting statements | "Personal ID · Date of birth (Age) is at least 21 years old"; "Driving licence · Licence class B – Issue date …"; "must be met"; the COPY-BRIEF messages | "Personal ID – Date of birth (Age) is at least 21 years old"; "must be true" | CLAR 2026-11-07 #3 |
| C4 | FR-022a–FR-022c, 003-CP.1–CP.18, 004-S8.2.3, 007-S3.8 | `rules/src/checks/findingMessages.ts`; MCP guidance | "Rule 01 and Rule 02 contradict each other, so no citizen can meet the rules of Standard."; "2 rules contradict each other, and 1 rule is a duplicate" | "<items> can't be met together."; counts joined by " · " | CLAR 2026-11-07 #4 |
| C5 | FR-023a–FR-023f, 001-S1.2, 002-S2.18, 002-S2.19, 002-S2.22, 002-S3.16, 002-S4.24 | The backend's auth and rules services; `rules/src/validation.ts` (word for word); MCP server | "Username or password is wrong. Check both and try again."; "There's already a rule called "Rule 01" in Ambulance."; "There's already a variant called "Ambulance"."; "Rule 02 in Standard checks data that's no longer requested. …"; "Enter a whole number greater than 0." | "Invalid username or password"; "Another rule in Ambulance is already called Rule 01."; "Another variant is already called Ambulance." | CLAR 2026-11-07 #5 |
| C6 | FR-024a–FR-024e | The rules package's persona formatting | "08.07.2007 · 19"; "Valid until <date>"; "B since <date> · <n> year(s)"; "Result: doesn't meet the rules"; "Tested as if shared today, 01.11.2026." | "08.07.2007 (age 19)"; a bare date; "B, BE" plus a row per class date; "Result: doesn't meet 2 rules"; "1 Nov 2026" | CLAR 2026-11-07 #6 (the Test 1 frames reopen part of it: Q1) |

## Clarify questions
**Q1. C/F — Test-step data card and result heading (Conflict 1).** CLAR #6 and #31 (c) took their formats and the document column from the Publish frames (U75–U79), which CLAR #32 calls the older design. The newer Test 1 frames draw the card differently.
- **Impact:**
  - Data card, Test 1 frames: U65 7057:58772, 7057:59071, 7057:59079, 7057:59186; U66 #14, #15, #24; U67 #14, #15, 7058:60746; U68 #14, #15, #18; U69 7057:60456, 7057:60891, 7057:60779; U70 7057:61649 (#15, #17, #18 "Expiry date"); U71 7058:61436, 7058:61444, #19; U72 #15, #16, 7058:61720, #22 ("ID valid until"); U73 7058:62058, 7137:50147; U99 7114:49747.
  - Result heading: U65 7057:58811; U66 #19, #25; U67 7058:60752; U68 #21, #32; U69 7057:60495, 7057:60930; U71 7058:61454; U72 7058:61750; U73 7058:62077, 7137:50166; U99 7114:49766; build note U06 #31.
  - Publish frames, already in the decided form: U63 #10, #12, 7112:48790; U75 #22, #24; U76 #15–#17, 6863:47775; U77 #22–#24; U78 #21, #22; U79 #25–#27, 6863:48492.
  - Edit data dialog: "Age today" (004-S8.5.6), "Class B since" (FR-042d; U66 #30, U67 #33).
  - Source: the rules package's persona formatting and its tests (C6).
- **Options:**
  - **keep as decided:** every data card shows the document as a column whose name is the row group's accessible heading. "Date of birth" reads "08.07.2007 · 19". Each class gets its own row, "B since 20.08.2025 · 1 year" (never "B, BE since …"). "Expiry date" reads "Valid until 19.08.2040" under the rules' label. The heading reads "Result: doesn't meet the rules". Figma must change on U65–U74 and U99.
  - **follow the Test 1 frames:** a flat list with the rules' labels and no visible document column (the document stays the row group's accessible name). "08.07.2007" without the age, "B since 20.08.2025" without the years, classes with the same issue date merged ("B, BE since 02.05.2010"), and "Result: doesn't meet 2 rules" / "Result: doesn't meet 1 rule". This supersedes CLAR #6 (all formats except "Valid until" and the test-day line) and CLAR #31 (c)'s document column; panel scrolling (F43) stays.
  - **per point:** decide each of (1) the document column, (2) the age after the date of birth (CLAR #6's "no age where the frame shows none" would then mean no age on the Test step), (3) the years after a class date, (4) one row per class, (5) the count in the heading.
- **Supersedes or contradicts:** CLAR 2026-11-07 #6 and #31 (c) under the second and third options.

**Q2. F — The edit flow of a published connection: leaving and saving (Conflict 2, Partial 10).**
- **Impact:**
  - Leaving:
    - E5b: U99 7173:52810 (frame), 7173:52836 (dialog: title, body, "Discard changes", "Save", ×).
    - E5a: U99 6890:46197 (F5, not built).
    - Build notes: U05 #36 (6730:40338), U06 #51.
    - The product name and "Your connections" in U98–U100.
  - Saving: "Save" on every step: U98 6731:39850, 7296:52389, 6730:39145; U99 #32c; U100 #17. Build note 5: U01 6637:36652.
- **Options (a), leaving through the product name or the breadcrumb:**
  - **adopt E5b:** the dialog reads "Save your changes?" / "If you leave now, your changes are lost. Save them, or discard them and keep the active version.", with "Discard changes" (danger outline) and "Save" (primary). "Save" opens the save dialog "Save changes?" (FR-045c) and leaves once saved; a validation error keeps the member in the flow. "Discard changes" leaves without saving (FR-045e). × and Escape keep the member in the flow. This amends CLAR #8 (a) for the edit flow.
  - **adopt E5b with a direct save:** as above, but "Save" saves at once, without "Save changes?". This amends CLAR #34 (b) for this path.
  - **use the create flow's dialog** "Leave this connection?" (CLAR #8 (b)). Its body "you lose all progress … discard the connection" doesn't fit a live connection.
  - **no leave dialog:** the product name and the breadcrumb ask "Discard your changes?" (FR-045d's dialog) only when there are changes.
- **Options (b), "Save" on the rules step while a rule is open, incomplete or in error, or while grouping:**
  - **disabled** with "Save the rule first" / "Finish grouping first", as "Test rules" is (CLAR #18; build note 5).
  - **enabled:** it first asks "Save changes to Rule 01?" (005-S1.1's pattern).
- **Supersedes or contradicts:** CLAR 2026-11-07 #8 (a), (b) for the edit flow; #34 (b) under the direct-save option; #18 is extended by (b) "disabled".

**Q3. F — "Group with other rules" beyond a top-level rule (Conflict 3).**
- **Impact:**
  - Rules step:
    - U55 6531:39068 (rule inside Sub-group 01) and 6522:32424 (group holding a sub-group).
    - U58 #20 (group menu).
    - Build note 10: U54 6522:33107 (#5).
  - Rule menus with the adopted entry: U34 #26, U36 #15, #28, U39 #27c, U41 #22, U64 #2.
  - Select mode: U36, U40, U64.
- **Options:**
  - **two levels only:** the entry appears on top-level rules (FR-036c) and on top-level groups that hold no sub-group, starting select mode with that item selected (FR-038e). It appears only when another rule or group is on the same level. It never appears in a sub-group's menu, on a rule inside a sub-group, or on a group that holds a sub-group (002-S2.10). This extends CLAR #22.
  - **rules only:** CLAR #22 as written. Top-level rules carry it when another item is on their level. Groups are grouped through select mode only. A rule inside a sub-group never carries it (002-S2.10).
- **Supersedes or contradicts:** CLAR 2026-11-07 #22 is extended under the first option.

**Q4. F — Text of the ⓘ on "Result link" (Partial 1).**
- **Impact:**
  - The drawn text on the details: U81 6809:46555, 6809:46590.
  - The same ⓘ without drawn text: U80 6396:47723, U85 6760:48480, U87 #10, U88 #15, U90 #17.
  - Unchanged: the "Request link" ⓘ, U80 6809:46501 (FR-051i).
  - Not affected: draft details, which show no links.
- **Options:**
  - **decided text only:** "serviceBW replaces {reference} with the request reference." (CLAR #35 (e)). Figma must change on U81.
  - **design text only:** "Your service gets the citizen's shared data from this link. Each variant has its own." The {reference} hint then appears nowhere. This supersedes CLAR #35 (e) and drops 001-S6.5's hint.
  - **both:** "Your service gets the citizen's shared data from this link. Each variant has its own. serviceBW replaces {reference} with the request reference." This amends CLAR #35 (e).
- **Supersedes or contradicts:** CLAR 2026-11-07 #35 (e) under the second and third options.

**Q5. W — The line above the result heading for a variant no citizen can meet (Spec-only 1).**
- **Impact:**
  - Test step result card: U71 7058:61454.
  - Build note 29: U06 7058:63148.
  - Unchanged: the tab ⚠ and its tooltip, U71 7058:61618, 7058:61632 (FR-041c, C4).
- **Options:**
  - **build:** "No citizen can meet the rules of Standard." above the heading (004-S8.6.1 with C2's noun), in the design's title-only warning alert.
  - **drop:** the design removes it on purpose ("no banner"); the tab's ⚠ and tooltip carry the finding. This is a behaviour change recorded against 004-S8.6.1.
- **Supersedes or contradicts:** no Clarification.

**Q6. F — Draft details: main heading and the two actions (Partial 2).**
- **Impact:**
  - Draft details: U93 7362:54697 (band title and sub-line), 7362:54693 (Draft badge after the breadcrumb's name), 7362:54920 ("Edit connection", footer left), 7362:54922 and 7362:55154 ("Go to connections →", footer right).
  - Build notes: U07 #23–#27, U02 #16.
  - The tab title.
- **Options (a), heading:**
  - **as on the published details (FR-046a):** "This connection is a draft" is the page's one h1. The name is the breadcrumb's current item, with the Draft badge, and the tab title. This supersedes 005-S6.1.
  - **keep 005-S6.1:** the name stays the h1 with the badge, and the band title becomes a lower heading. Figma must change on U93.
- **Options (b), actions:**
  - **footer as drawn:** "Edit connection" (secondary, left) and "Go to connections →" (primary, right). FR-049b's "the status band offers" then reads "the page offers".
  - **in the status band:** FR-049b as written. Figma must change on U93.
  - Either way, "Delete draft" is F56.
- **Supersedes or contradicts:** CLAR 2026-11-07 #35 (c) is extended to drafts by (a)'s first option; #39's placement words are amended by (b)'s first option.

**Q7. F — Where the connection ⋯ and "Activate again" go once the date pill is gone (Partial 3).**
- **Impact:** U07 7370:55183. Details:
  - Active: U87 #8; U88 6417:30900, 6417:31060; U90 7355:61614.
  - Deactivated: U89 7355:61548, 7355:61549; U97 7355:61025, 7355:61094, 7355:61026, 7355:61095; U96 S/L.
  - Scheduled (F1, not built): U94 7355:60689, U95 #10.
- **Options:**
  - **in the status band:** at the band's right end, where the pill was, the ⋯ menu (Deactivate, Delete) and, while deactivated, "Activate again" before it.
  - **in the breadcrumb row:** at the right, before the user pill.
  - **split:** "Activate again" in the band, and the ⋯ in the footer beside "Edit connection".
- **Supersedes or contradicts:** no Clarification. It follows CLAR 2026-11-07 #37 (c).

**Q8. F/W — Menus of rules and groups linked to Standard in a variant (Partial 4).**
- **Impact:**
  - Build note 10: U54 6522:33107 (#3, #4).
  - Changed rule: U39 #27e; U57 #18 (frames 6522:32682, 6522:32774, 6522:32862).
  - Inherited rule: U39 #28b, U56 #40, U57 #19.
  - Inherited group: U58 #21, #22.
  - Copy-to-variant popover: U41 #24 (W17).
- **Options:**
  - **adopt build note 10:** a rule or group linked to Standard in a variant has no Rename, Duplicate, Ungroup or "Remove from group". "Copy to variant" shows only while some variant could still receive the item: always for "New addition" and "Changed here", and for a Standard rule only while a variant isn't linked to it or has removed it. "Copy link" stays everywhere (F29). This narrows CLAR #22's "Rename and Copy to variant on rule menus" to unlinked rules.
  - **keep every rule menu complete:** CLAR #22 as written. Rename and Duplicate also appear on linked rules: a rename marks the rule "Changed here", and a duplicate is a "New addition" in that variant. "Copy to variant" always shows, and the popover shows covered variants as included and not choosable (FR-040b).
- **Supersedes or contradicts:** CLAR 2026-11-07 #22 is narrowed under the first option.

**Q9. W — Group and sub-group menus: "Rename" and "Remove message" (Partial 5).**
- **Impact:**
  - Group menus: U54 6522:33107 (#2); U55 #28, #33, #34 (frames 6530:40150, 6522:32038, 6531:39026, 6522:32382); U56 #23, #28, #30; U57 #22; U58 #19.
  - Message card with its pencil: U35 6324:39410, 6324:39411.
- **Options:**
  - **build both:** in the design's menu and wording, "Rename" (inline on the name, with 002-S2.19's duplicate check) and, while the group has a message, "Remove message" next to "Add message" (002-S2.11, 002-S2.17).
  - **drop:** a group is renamed only by editing its name in place, and a message is removed by clearing it through the pencil. This is a behaviour change recorded against 002-S2.11 and 002-S2.17.
- **Supersedes or contradicts:** no Clarification. CLAR #22's W list names neither entry.

**Q10. F — Two decided labels that a frame draws differently (Partial 6).**
- **Impact:**
  - (a) The failed-save toast: U51 6197:11098 draws "Couldn't save. Check your internet connection and try again." with "Try again". Build note U05 6720:39042 says "with Retry". It shows on every wizard step (CLAR #17 (a): U17 #3, #23; U79 #4).
  - (b) The nothing-chosen dialog: U25 7299:52174 has the title "No data selected in 1 document", the body "Driving licence has no data chosen yet. Choose data for it or remove it." and "Remove 1 document". Build note 19 (U04 6711:39375) says "Remove them and continue".
- **Options:**
  - (a) **"Retry"**, as CLAR #17 (a) decided; or **"Try again"**, as drawn, which amends CLAR #17 (a)'s word.
  - (b) **"Remove them and continue"**, as CLAR #14 (c) decided; or **"Remove 1 document"** / **"Remove 3 documents"** with the count, as the title has, which amends CLAR #14 (c)'s label.
- **Supersedes or contradicts:** CLAR 2026-11-07 #17 (a) and #14 (c) under the second choices.

**Q11. F — Body of the delete-rule dialog (Partial 7).**
- **Impact:**
  - U34 6113:29056 (a rule only in Standard): "Citizens won't be checked for licence classes C or D any more."
  - Copy to port either way: U47 6185:8847 (a Standard rule with variants).
  - Title: "Delete Rule 03?" (002-S2.33).
- **Options:**
  - **adopt the effect sentence:** the body says what citizens no longer have to meet, built from the rule's check for every check kind. That needs a sentence per check in the rules package (copy:rules), so CLAR 2026-11-06 #1 defers it as a later feature. Until then the dialog uses the second option.
  - **drop:** no effect sentence. A Standard rule with variants gets U47's body. The other dialogs keep the current app's body, plus 002-S4.17's "Ambulance's changes to Group 01 go with it." where a group dissolves.
- **Supersedes or contradicts:** no Clarification.

**Q12. F — The variant ⓘ on the Test step (Partial 8).**
- **Impact:**
  - Test frames: the (i) after "Standard" (U65 7057:58718, U67 #10, U68 #10, U72 #10, U75 #19, U79 #19) is Standard's description icon (F27).
  - Rules step ⓘ: U18 7344:96402; U37 6151:33809, 6151:33820.
- **Options:**
  - **at the end of the Test step's tab row:** hover and focus, with the Rules step's text "A separate set of rules for citizens with different requirements. Each variant gets its own result link."
  - **not on the Test step:** this amends FR-035a.
- **Supersedes or contradicts:** CLAR 2026-11-07 #20's "on the Rules and Test steps" under the second option.

**Q13. C — "Enter a name for the connection." (Partial 9).**
- **Impact:**
  - Step 1: U19 6699:45379, 6699:45398 (after Continue).
  - The same message on step 1 after "Save and exit", "Save progress" or "Save and log out" with no name (CLAR #8, #16; U04 #27; F18), and in the edit flow's step 1 (U98).
  - Sources: the backend's validation of the connection and draft name (400 message); the frontend's step-1 check; the MCP server and guidance where they pass the message on to agents that create drafts; docs.
  - Not affected: "Enter a name for the variant." (already the design's), the persona name's "Enter a name." in Edit data (004-S8.5.11), "The name can have at most 200 characters." (not drawn).
- **Options:**
  - **adopt:** "Enter a name for the connection." in every place that provides or repeats it.
  - **drop:** "Enter a name." stays everywhere.
- **Supersedes or contradicts:** under adopt, CLAR 2026-11-07 #16's quoted wording and 005-S1.2 / 005-S1.3's text.

**Q14. F — Small additions the design makes (cosmetic 29–35, Figma-only behavioural 1).**
- **Impact:**
  1. A scrim click closes dialogs that don't delete or publish (U06 7127:49610). The restore dialog is F57.
  2. Disabled buttons explain why on hover, and also on focus (FR-051q), beyond "Test rules" and "Set rules →": e.g. "Save rule", and the copy buttons while deactivated (FR-046e) (U06 7127:49610).
  3. A page change scrolls to the top (U06 7137:50569).
  4. Draft row meta "Edited 28.10.2026 · Rules step" (U06 #89; U17 6699:48031).
  5. An "Added (n)" group in the documents search card (U21 7290:62277–7290:62279; U22 7290:63546).
  6. Links accordion counts "1 request link · 3 result links" (U91 7203:50843; U92 7246:51546, 7246:52172; U94 7246:52751, 7246:53863; U95 7246:53973, 7246:54601; U96 7246:55182, 7246:56300; U97 7246:56410, 7246:57041).
  7. Tooltips also open on touch (U08 7370:55193).
  8. "Start with" preselects "Linked to Standard (recommended)" (U37 6139:32693; U52 6197:12011; U62 #25). This default changes what is stored when the member doesn't choose.
- **Options:**
  - **adopt all as designed:** each tooltip opens on hover and focus, each count is plain text that screen readers read, and items 1–7 change no stored data.
  - **drop listed numbers:** a dropped item isn't built. For 8, no option is preselected, or the current app's default stays.
- **Supersedes or contradicts:** no Clarification.

## Coverage
Shorthand:
- **wizard frames** = U17–U79, U98–U100
- **rules frames** = U17, U18, U29–U64, U98–U100
- **test frames** = U63, U65–U79, U99
- **details frames** = U58, U63, U80–U99
- **overview frames** = U04, U11–U18, U90
- **every frame** = U10–U100

Rows that the merge read as covered (a unit flagged them, but an adopted requirement already holds them):
- FR-051f, the group subtitle: U35 #16, U36 #24, U38 #18, U40 #20, U42 #25, U43 #19, U44 #31, U46 #25, U51 #16, U55 #18, U56 #19, U57 #14, U58 #14, U64 #28.
- FR-051j, "Discard rule": U06 #75, U30 #21, U31 #28, U33 #16, U35 #37, U48 #18, U50 #28.
- FR-051k: U04 #31, U28 #15, U98 #23. FR-051l and FR-051m: U43 #25, U58 #25, #27.
- FR-031a, FR-031b and FR-031d: U23 #12, U28 #14, U98 #20, #27.
- FR-036c: U34 #26, U36 #15, U39 #27c, U41 #22, U64 #2.
- FR-035a: U17 #14b, U32 #10, U40 #35, U62 #28, U99 #27b.
- FR-025a: U63 #5. FR-025c: U05 #29. FR-045c: U99 #32c, U100 #17.
- FR-041a and FR-041b: the design's severity icons per CLAR #29 (a), which cites build note U06 #7. Rows: U07 #19, U44 #9, #13, U45 #25, #31, U46 #8, #22, U50 #22, U85 #21.
- FR-046c and FR-046g: U03 #25, U07 #17, U91 #10, U96 #11, U93 #9, #13. FR-038a, read-only: U83 #31.
- CLAR #38: U06 #17, U60 #34. FR-023c's removed-document message: U50 #12. FR-029b: U16 #25. FR-051b: U13 #6, U16 #20.
- FR-051i: U18 #18, U98 #13 (CLAR #45 over #15).
- The "C item" rows for "Konnekt", "citizen", "·" statements, "Message for citizens:", findings, server wording and the U75–U79 test formats are now C1–C6.

| req-id | status | units |
|---|---|---|
| FR-001a, FR-001b | COVERED | U01, U02, U03, U07, U10, U26, U89, U95 |
| FR-002a | COVERED, PARTIAL (copy to port) | most frames |
| FR-002b | COVERED | U10, U14, U19, U25 |
| FR-002c, FR-005 | SPEC-ONLY → W2 | – |
| FR-003 | COVERED | U03, U07, U09, U26, U62 |
| FR-006 | COVERED | U10, U26 |
| FR-008 | COVERED, PARTIAL → F22, F46 | U01, U02, U05, U54; P U79 |
| FR-009a | COVERED, CONFLICT → F23 | U01; X U04 |
| FR-009b | COVERED | U01 |
| FR-009c | COVERED | U14, U15, U23, U26, U52, U62, U73, U75, U89, U100 |
| FR-009d | COVERED, PARTIAL (layout) | U01, U06, U07, U13 |
| FR-010a | PARTIAL → W2 | U02, U12 |
| FR-010b | COVERED | U02, U07 |
| FR-011 | COVERED | U01 |
| FR-012a | COVERED, PARTIAL open (Q6) | U03, U10, U13, rules and details frames; P U93 |
| FR-012b | SPEC-ONLY → W2 | – |
| FR-013a | COVERED | U07, U52 |
| FR-013b | SPEC-ONLY → W1 | – |
| FR-004, FR-007, FR-014a–FR-018, FR-019c, FR-020c, FR-021c, FR-022c, FR-023d, FR-027d, FR-037b, FR-047a, FR-047d | UI = N (not mapped to frames) | – |
| FR-019a | COVERED → C1 | every frame |
| FR-019b | SPEC-ONLY → W16, C1 | – |
| FR-020a, FR-020b | COVERED → C2 | U14, U15, U18, U20, U26, rules and test frames, U44–U46, U63, U77 |
| FR-021a, FR-021b | COVERED → C3 | U03, U09, rules and details frames |
| FR-022a | COVERED, PARTIAL → F47, C4 | U44–U46, U63, U71, U85; P U77 |
| FR-022b | SPEC-ONLY → W13, C4 | – |
| FR-023a | COVERED → C5 | U10 |
| FR-023b, FR-023c, FR-023e, FR-023f | COVERED, PARTIAL → F58, F28, C5 | U49, U50, U52, U60 |
| FR-024a, FR-024c | COVERED, PARTIAL open (Q1) | U63, U75–U79; P U65–U73, U99 |
| FR-024b, FR-024e | COVERED → C6 | U02, test frames |
| FR-024d | COVERED, PARTIAL, CONFLICT open (Q1) | U63, U76, U78, U79; P U65, U67, U69, U71, U99; X U66, U68, U72, U73 |
| FR-025a, FR-025b, FR-025d, FR-025e | COVERED | U02, U06, wizard and details frames |
| FR-025c | COVERED, PARTIAL → F25 | U06, U17, U26; P U02, U19 |
| FR-026a | COVERED, CONFLICT → F19; open (Q2) | U17, wizard frames; X U03, U05, U06, U99 |
| FR-026b–FR-026d, FR-026g, FR-026h, FR-026k | COVERED | U05, U06, U07, U16, U17, U18, U19 |
| FR-026e | COVERED, PARTIAL (cosmetic 28) | U05, U06 |
| FR-026f | COVERED, CONFLICT → F19 | U50; X U06 |
| FR-026i, FR-026j | COVERED, PARTIAL → F20 | U05, U17 |
| FR-027a–FR-027c, FR-027e | COVERED, CONFLICT → F15 | U02, U04, U06, U11, U18 |
| FR-028a, FR-028b | COVERED, CONFLICT → F14 | overview frames |
| FR-029a, FR-029b, FR-029e | COVERED | overview frames, U16 |
| FR-029c | COVERED, PARTIAL → F55 | U14, U90 |
| FR-029d | PARTIAL (visual as drawn; list kept for screen readers per CLAR #12) | U07, U16 |
| FR-030a, FR-030b | COVERED, PARTIAL → F17 | signed-in frames; P U03, U10, U13 |
| FR-031a–FR-031f, FR-031h, FR-031i | COVERED, PARTIAL → F23 | U04, U06, U20–U28, U98 |
| FR-031g | COVERED, PARTIAL open (Q10) | U04, U25 |
| FR-031j | COVERED, CONFLICT → F23, F24 | U08, U20–U28, U98 |
| FR-032a–FR-032c | COVERED | U04, U12, U18, U19, U52, U98 |
| FR-032d | PARTIAL → F60 | U18, U19, U98 |
| FR-033a, FR-033b | COVERED, PARTIAL → W20; open (Q10) | U05; P U02, U51 |
| FR-033c | PARTIAL → F22 | U02 |
| FR-033d | PARTIAL → F21, W20 | U17 |
| FR-034a, FR-034b | COVERED, PARTIAL open (Q2) | rules frames, U06; P U01 |
| FR-035a | COVERED, PARTIAL → F27; open (Q12) | U02, U07, U18, rules frames; P U37, U46, test frames |
| FR-035b, FR-035c | COVERED, PARTIAL → F27 | U18, U37, U38, U59 |
| FR-036a, FR-036b | PARTIAL → F29; open (Q8) | rules frames |
| FR-036c | COVERED; open (Q3) | U09, U34, U36, U39, U41, U54, U55, U64 |
| FR-036d | COVERED, CONFLICT → F30; open (Q3) | U54; X U55, U56 |
| FR-037a | PARTIAL → F32 | U35 |
| FR-037c | CONFLICT → F31 | U35, U47, U51 |
| FR-038a–FR-038c | COVERED | rules frames, U83 |
| FR-038d, FR-038e | COVERED, CONFLICT → F33 | U40, U45; X U40, U62, U64 |
| FR-039a–FR-039e | PARTIAL → W19 | U30–U33, U35, U48, U49, U51, U53 |
| FR-039f | COVERED | U32, U48 |
| FR-040a | COVERED | U41 |
| FR-040b | PARTIAL → W17 | U41, U42 |
| FR-040c | CONFLICT, PARTIAL → F36 | U43, U47, U58 |
| FR-040d | PARTIAL, CONFLICT → F37 | U06; X U05 |
| FR-041a, FR-041b | COVERED (severity icons, CLAR #29) | U06, U07, U44–U46, U50, U85 |
| FR-041c | COVERED, PARTIAL, CONFLICT → F38 | U68; P U71, U72; X U06 |
| FR-041d | COVERED, PARTIAL → F39 | U06; P U44–U46 |
| FR-042a–FR-042c | COVERED | U06, U66, U67 |
| FR-042d | PARTIAL → F40 | U66, U67 |
| FR-043a | PARTIAL → F42 | test frames |
| FR-043b | COVERED, PARTIAL open (Q1) | U75–U79; P U65–U73, U99 |
| FR-043c | COVERED, CONFLICT → F43 | U06; X U01, U65–U73 |
| FR-043d | COVERED, CONFLICT → F41 | U06; X U65, U70 |
| FR-044a–FR-044d | COVERED | U06, U63, U73, U75–U79 |
| FR-044e | PARTIAL → F46 | U79 |
| FR-045a | COVERED, PARTIAL → F48 | U05, U06, U15; P U87 |
| FR-045b | COVERED, PARTIAL → F5 | U98, U99, U100 |
| FR-045c–FR-045e | COVERED; open (Q2) | U05, U06, U98–U100 |
| FR-045f | PARTIAL → F49 | U05, U15, U87, U98 |
| FR-046a | COVERED, PARTIAL → W10 | details frames; P U63 |
| FR-046b, FR-046e, FR-046g–FR-046i | COVERED | details frames |
| FR-046c | COVERED, PARTIAL → F50 | details frames; P U85, U92, U95 |
| FR-046d | COVERED, PARTIAL open (Q4) | U80, U87; P U81, U88 |
| FR-046f | PARTIAL → F51 | details frames |
| FR-047b, FR-047c | COVERED | U06, U85 |
| FR-048a | COVERED | U06, U81 |
| FR-048b | COVERED, PARTIAL, CONFLICT → F52 | overview and details frames |
| FR-049a, FR-049b | COVERED, PARTIAL open (Q6) | U02, U07; P U93 |
| FR-049c | COVERED, PARTIAL → F56 | U07; P U93 |
| FR-049d | PARTIAL → F57 | U06 |
| FR-050a, FR-050b | COVERED, PARTIAL (Q14) | U03, U05, U06, U78 |
| FR-050c | COVERED, PARTIAL → F62 | U03, U05; P U06 |
| FR-051a, FR-051q | COVERED, PARTIAL → F61 | overview frames |
| FR-051b–FR-051g, FR-051j–FR-051p | COVERED | U05, U10, U17, U34, U39, U41, U47, U58, U61, U78, U89, U99 and the rows the merge read as covered |
| FR-051h | COVERED, PARTIAL → F59 | U31, U53; P U09 |
| FR-051i | COVERED, CONFLICT settled (CLAR #45 over #15) → F60 | U04, U13, U19, U80, U86; X U18, U98 |
| US1-AS1 | COVERED, CONFLICT → F16 | U02, U03, U05, U10 |
| US1-AS2 | COVERED | U02, U10 |
| US1-AS3 | COVERED, CONFLICT → F14 | U02, U04, U05, U11–U16 |
| US1-AS4 | COVERED, PARTIAL | U04, U05, U16; P U07 |
| US1-AS5 | COVERED, CONFLICT → F15 | U10, U11, U18 |
| US2-AS1 | COVERED, PARTIAL → F25 | wizard frames; P U02, U19 |
| US2-AS2, US2-AS3, US2-AS4 | COVERED | U02, U04, U05, U13, U17, U18, U20–U28 |
| US2-AS5 | SPEC-ONLY → W3 | – |
| US3-AS1 | COVERED, PARTIAL → F29 | rules frames |
| US3-AS2 | COVERED, PARTIAL → W19 | U49; P U48 |
| US3-AS3, US3-AS4 | COVERED | U42, U43, U57, U65, U68–U72, U74 |
| US3-AS5 | SPEC-ONLY → W15 | – |
| US4-AS1 | COVERED | U06, U73, U75–U81, U83, U85, U99 |
| US4-AS2 | COVERED, PARTIAL open (Q4) | U02, U05, U07, details frames; P U81 |
| US4-AS3 | COVERED → F13 | U04, U06, U07, U14, U15, U60, U88–U90 |
| US4-AS4 | COVERED, PARTIAL → F56; open (Q6) | U05, U07; P U93 |
| US4-AS5 | COVERED, PARTIAL → F48, F49 | U05, U15, U87, U98–U100 |
| US4-AS6 | SPEC-ONLY → W2 | – |
| US5-AS1, US5-AS2, US5-AS3 | SPEC-ONLY → W16 | – |
| US5-AS4 | COVERED → C1 | every frame with the product name |
| EC-1, EC-3, EC-5, EC-7, EC-10 | COVERED | U01, U03, U07, U09, U10, U14, U17, U19, U23, U34 |
| EC-2, EC-9 | SPEC-ONLY → W2 | – |
| EC-4 | COVERED → C1, C2 | every frame |
| EC-6 | PARTIAL → W2 | U02, U23 |
| EC-8 | SPEC-ONLY → W1 | – |
| 001-S0.1, 001-S0.3 | COVERED | U03, U06, U10 |
| 001-S0.2, 001-S0.4 | SPEC-ONLY → W2 | – |
| 001-S0.5 | COVERED (superseded by FR-030) | signed-in frames |
| 001-S0.6 | COVERED, CONFLICT → F19, C1 | every frame; X U03, U05 |
| 001-S1.1, 001-S1.3, 001-S2.1, 001-S2.2 | COVERED | U10 |
| 001-S1.2 | COVERED → C5, F16 | U10 |
| 001-S3.1–S3.4, 001-S3.6 | COVERED, PARTIAL (copy) | overview frames, U02 |
| 001-S3.5, 001-S6.13 | PARTIAL (skeletons, cosmetic 21) | U06 |
| 001-S3.7, 001-S6.14 | SPEC-ONLY → W2 | – |
| 001-S4.1, 001-S4.2, 001-S4.8 | superseded by FR-027 (COVERED) | U11, U18 |
| 001-S4.3, 001-S4.5 | SPEC-ONLY → W11 | – |
| 001-S4.4, 001-S4.6, 001-S4.7 | COVERED | U06, U10, U11 |
| 001-S5.1–S5.4, 001-S5.8 | COVERED | U04, U05, U20–U28, U98 |
| 001-S5.5, 001-S5.6 | superseded by FR-031 (COVERED) | U05, U25 |
| 001-S5.7, 001-S5.10, 001-S5.11 | SPEC-ONLY → W10 | – |
| 001-S5.9 | COVERED, PARTIAL → F49 | U05, U15, U87, U98 |
| 001-S6.1–S6.3, 001-S6.5 | superseded (FR-046, FR-025) | details frames |
| 001-S6.4, 001-S6.6–S6.8, 001-S6.10 | COVERED | details frames, U02, U05 |
| 001-S6.9 | COVERED → F13, F54 | U06, U07, U89 |
| 001-S6.11, 001-S6.12 | COVERED, PARTIAL, CONFLICT → F4 | U14, U90; P U04; X U04, U90 |
| 001-S7.1, 001-S7.3–S7.5, 001-S7.7, 001-S7.8 | COVERED | dialog and form frames, U03, U10, U13, U25 |
| 001-S7.2 | CONFLICT → F23 | U04, U08 |
| 001-S7.6 | superseded by FR-031 | – |
| 001-S7.9 | COVERED (F6) | U01 |
| 001-S7.10 | SPEC-ONLY → W2 | – |
| 001-S7.11 | PARTIAL → W2 | U02 |
| 002-S0.1–S0.3 | COVERED | wizard frames |
| 002-S1.1–S1.4, 002-S1.6, 002-S1.7, 002-S1.10, 002-S1.11 | COVERED | U04, U09, U20–U28 |
| 002-S1.5, 002-S1.8, 002-S1.9 | superseded by FR-031 (F3 for the catalogue) | U04, U20–U28 |
| 002-S2.1 | COVERED | rules frames |
| 002-S2.2, 002-S2.3 | COVERED, CONFLICT → F26 | rules frames; X U30, U33, U49–U51, U53 |
| 002-S2.4–S2.7 | COVERED → C2, C3 | rules frames |
| 002-S2.8, 002-S2.9 | COVERED, CONFLICT → F33 | rules frames; X U40, U62, U64 |
| 002-S2.10 | COVERED, CONFLICT → F30; open (Q3) | U03, U36; X U55, U56 |
| 002-S2.11 | COVERED, PARTIAL open (Q9) | U51; P U54, U55 |
| 002-S2.12 | COVERED, PARTIAL (copy) → F7 | U51, U55, U57 |
| 002-S2.13, 002-S2.14 | COVERED, CONFLICT → F31 | X U35, U51 |
| 002-S2.15 | COVERED → F9 | rules frames |
| 002-S2.16 | COVERED, PARTIAL → F29; open (Q8) | rules frames |
| 002-S2.17 | COVERED, PARTIAL open (Q9) | U29–U35, U48, U49, U51, U53; P U55, U56 |
| 002-S2.18, 002-S2.19, 002-S2.22 | COVERED, PARTIAL → F58, C5 | U49, U50, U55 |
| 002-S2.20, 002-S2.21, 002-S2.24, 002-S2.36 | SPEC-ONLY → W12 | – |
| 002-S2.23, 002-S2.27 | superseded (FR-034, FR-021 → C3) | – |
| 002-S2.25, 002-S2.26, 002-S2.28–S2.35 | COVERED, PARTIAL (copy) | U05, U06, U34, U36, U40, U47, U50, U55, U57, U64, U99 |
| 002-S3.1, 002-S3.3–S3.7, 002-S3.9, 002-S3.11, 002-S3.20, 002-S3.21, 002-S3.23–S3.29, 002-S3.32, 002-S3.34–S3.36, 002-S3.39–S3.41 | COVERED, PARTIAL (copy) | U01, U03, U09, rules frames |
| 002-S3.2, 002-S3.8, 002-S3.10, 002-S3.19, 002-S3.22, 002-S3.33, 002-S3.37, 002-S3.38 | COVERED, PARTIAL → W19 | U09, rules frames |
| 002-S3.12–S3.18, 002-S3.30 | COVERED, PARTIAL, CONFLICT → F34 | U03, U09, U29, U31, U46, U49, U50, U53 |
| 002-S3.26 | UI = N | – |
| 002-S3.31 | SPEC-ONLY → W12 | – |
| 002-S4.1–S4.3, 002-S4.5–S4.8, 002-S4.10–S4.12, 002-S4.14, 002-S4.20, 002-S4.21, 002-S4.23, 002-S4.25, 002-S4.26 | COVERED, PARTIAL (copy) | rules frames |
| 002-S4.4, 002-S4.22, 002-S4.24 | COVERED, CONFLICT → F28, W18 | U18, U37, U52; X U59, U60, U62 |
| 002-S4.9, 002-S4.27, 002-S4.28, 002-S4.30 | SPEC-ONLY → W12 | – |
| 002-S4.13 | PARTIAL → W17 | U41 |
| 002-S4.15–S4.17 | PARTIAL (copy U47); open (Q11) | U34, U47 |
| 002-S4.18 | CONFLICT → F31, W12 | U47 |
| 002-S4.19 | COVERED, CONFLICT → F36 | U39, U57, U58; X U47 |
| 002-S4.29 | COVERED, CONFLICT → F37 | rules frames; X U05 |
| 002-S4.31 | COVERED, CONFLICT → F33 | U43; X U40, U62 |
| 002-S5.1–S5.3, 002-S5.10 | superseded or amended (FR-044, FR-045) | U63, U73, U75–U79 |
| 002-S5.4–S5.6 | SPEC-ONLY → W7 | – |
| 002-S5.7, 002-S5.8 | COVERED, CONFLICT → F1 | many |
| 002-S5.9 | COVERED | U75 |
| 002-S6.1, 002-S6.11 | COVERED, PARTIAL → F51 | details frames |
| 002-S6.2, 002-S6.5, 002-S6.8, 002-S6.13 | COVERED, PARTIAL (sample) | U07, U80, U83, U84 |
| 002-S6.3, 002-S6.4, 002-S6.6, 002-S6.10 | superseded or amended by FR-046 | details frames |
| 002-S6.7 | COVERED, CONFLICT → F1 | details frames |
| 002-S6.9 | CONFLICT → F2, F52, F53 | details frames |
| 002-S6.12 | PARTIAL → F35 | U82, U83, U85, U93 |
| 002-S7.1, 002-S7.3 | superseded by FR-045 | – |
| 002-S7.2 | COVERED | U05, U19 |
| 002-S7.4 | UI = N | – |
| 002-ACC.1, 002-ACC.3, 002-ACC.4 | COVERED, PARTIAL → F36 | rules frames, U01, U18, U37 |
| 002-ACC.2 | superseded by FR-038 | – |
| 003-S2.1–S2.4, 003-S2.6–S2.14, 003-S2.18, 003-S2.22, 003-S2.23, 003-S3.1, 003-S4.1, 003-S4.5–S4.7, 003-S5.2–S5.4 | COVERED | U06, U42–U46, U50, U63, U73, U76, U77 |
| 003-S2.15, 003-S2.24 | COVERED → C4 | U06, U44–U46 |
| 003-S2.16, 003-ACC.3 | COVERED, PARTIAL → F39 | U06; P U44–U46 |
| 003-S2.5, 003-S2.17, 003-S2.19–S2.21, 003-S4.4, 003-ACC.5, 003-ACC.6 | SPEC-ONLY → W13 | – |
| 003-S4.2, 003-S4.3, 003-S6.1 | superseded (FR-041, FR-047) | – |
| 003-S5.1 | COVERED (amended by FR-044c) | U06, U63 |
| 003-S7.1 | SPEC-ONLY → W9 | – |
| 003-ACC.1, 003-ACC.2, 003-ACC.4 | COVERED | U07, U44–U46 |
| 003-CP.1, 003-CP.2, 003-CP.4, 003-CP.5, 003-CP.7–CP.14, 003-CP.16 | COVERED, PARTIAL → C4 | U44–U46, U63, U71, U77 |
| 003-CP.3, 003-CP.6, 003-CP.15, 003-CP.17, 003-CP.18 | SPEC-ONLY → W13, C4 | – |
| 004-S0.1–S0.4, 004-S1.1, 004-S2.1, 004-S2.3, 004-S2.4, 004-S2.6, 004-S2.7, 004-S5.1, 004-S5.3, 004-S7.3 | superseded (FR-025, FR-031, FR-034, FR-044, FR-045) | – |
| 004-S2.2, 004-S5.2, 004-S5.4, 004-S5.5, 004-S7.1 | COVERED | U04–U06, U75, U79, U98, U99 |
| 004-S2.5 | SPEC-ONLY → W12 | – |
| 004-S7.2 | SPEC-ONLY → W9 | – |
| 004-S8.1, 004-S8.2, 004-S8.3 | COVERED, PARTIAL (copy) → C2 | test frames |
| 004-S8.4 | UI = N | – |
| 004-S8.5, 004-S8.5.8, 004-S8.5.13, 004-S8.6.5, 004-S8.7.3, 004-S8.7.4, 004-ACC.2, 004-ACC.3 | SPEC-ONLY → W14 | – |
| 004-S8.1.1 | COVERED → C6 | U02, test frames |
| 004-S8.1.2, 004-S8.3.4, 004-S8.3.5, 004-S8.4.1, 004-S8.7.1 | COVERED, PARTIAL → F45 | test frames |
| 004-S8.2.1–S8.2.5 | COVERED, CONFLICT → F45, F38 | test frames; X U05 |
| 004-S8.2.6 | superseded by FR-035 | – |
| 004-S8.3.1–S8.3.3 | COVERED, CONFLICT → F44 | U65–U72; X U63, U75–U79 |
| 004-S8.4.2, 004-S8.4.3 | COVERED, PARTIAL open (Q1) | test frames |
| 004-S8.4.4, 004-S8.4.6 | superseded by FR-024 → C6 | test frames |
| 004-S8.4.5, 004-S8.4.7–S8.4.10 | COVERED | test frames |
| 004-S8.4.11 | COVERED → F43 | U03, U06 |
| 004-S8.5.1, 004-S8.5.2, 004-S8.5.9, 004-S8.5.10, 004-S8.10.3, 004-ACC.4 | superseded by FR-042 | – |
| 004-S8.5.3–S8.5.7 | COVERED, PARTIAL → F40 | U06, U66, U67 |
| 004-S8.5.11, 004-S8.5.12, 004-S8.5.14 | COVERED, PARTIAL (copy) | U09, U67 |
| 004-S8.6.1 | SPEC-ONLY open (Q5) | – |
| 004-S8.6.2 | superseded by FR-024 → C6 | – |
| 004-S8.6.3, 004-S8.6.4, 004-S8.6.6, 004-ACC.1 | COVERED, PARTIAL → F42 | test frames |
| 004-S8.6.7 | COVERED, CONFLICT → F41 | U65; X U06, U65, U70 |
| 004-S8.6.8, 004-S8.7.2, 004-S8.8.1–S8.8.6, 004-S8.9.1, 004-S8.9.2, 004-S8.9.4, 004-S8.10.1, 004-S8.10.2, 004-ACC.5, 004-ACC.6 | COVERED | U06, U67, U68, U70, U74 |
| 004-S8.9.3 | CONFLICT → F45 | U74 |
| 005-R.1, 005-R.2, 005-S0.6, 005-S0.10, 005-S0.11, 005-S1.6, 005-S1.9, 005-S1.10, 005-S3.9 | SPEC-ONLY → W11 | – |
| 005-S0.1–S0.3, 005-S0.5, 005-S0.8, 005-S0.9, 005-S1.1, 005-S1.5, 005-S3.1–S3.5, 005-S4.4, 005-S4.5, 005-S4.7, 005-S4.9, 005-S6.5, 005-S6.6, 005-S7.1, 005-S7.6, 005-S8.7, 005-ACC.1, 005-ACC.2, 005-CP.1 | COVERED, PARTIAL (copy, styling) | overview, wizard and dialog frames |
| 005-S0.4, 005-S1.4 | PARTIAL → F21, W20 | U06, U17 |
| 005-S0.7 | COVERED, CONFLICT → F5 | U98, U100; X U03, U05, U60, U99 |
| 005-S1.2 | COVERED, CONFLICT → F18 | U02; X U04 |
| 005-S1.3 | COVERED, PARTIAL open (Q13) | U04; P U19 |
| 005-S1.7, 005-S1.8 | superseded by FR-033 | – |
| 005-S2.1–S2.13 | SPEC-ONLY → W3 | – |
| 005-S3.6, 005-S3.7, 005-S4.1–S4.3, 005-S4.6, 005-S6.2, 005-S6.4, 005-S6.8, 005-S6.10, 005-S6.11, 005-S6.14, 005-S7.2–S7.5 | superseded or amended (FR-025, FR-026, FR-029, FR-049) | overview frames, U16, U93 |
| 005-S3.8 | PARTIAL (copy, cosmetic 5) | U06, U17 |
| 005-S4.8, 005-S4.10–S4.13 | SPEC-ONLY → W5 | – |
| 005-S5.1–S5.4 | SPEC-ONLY → W4 | – |
| 005-S5.5 | PARTIAL → F57 | U06 |
| 005-S6.1 | COVERED, PARTIAL open (Q6) | U07; P U93 |
| 005-S6.3, 005-S6.7, 005-S6.12, 005-S6.13 | SPEC-ONLY → W8 | – |
| 005-S6.9 | COVERED, PARTIAL → F56 | U07; P U93 |
| 005-S8.1–S8.4 | PARTIAL → W6 | U02 |
| 005-S8.5, 005-S8.6 | SPEC-ONLY → W6 | – |
| 005-ACC.3 | PARTIAL → F22 | U02, U51 |
| 005-ACC.4 | SPEC-ONLY → W2 | – |
| 006-S0.1, 006-S2.1, 006-S2.2, 006-S4.1, 006-S4.2, 006-S5.1 | COVERED | overview frames, U13, U19 |
| 006-S1.1, 006-S2.3 | superseded (FR-032, FR-029) | – |
| 006-S1.2, 006-S1.3, 006-S1.6, 006-S1.7, 006-S4.3 | COVERED, PARTIAL (copy) | U04, U18, U19, U98 |
| 006-S1.4, 006-S1.5 | PARTIAL → F60 | U18, U19 |
| 006-S1.8, 006-S3.2, 006-S3.3 | SPEC-ONLY → W10 | – |
| 006-S3.1 | PARTIAL → W10 | U63 |
| 007-R.1–R.3, 007-S1.1–S1.10, 007-S1.12, 007-S2.2–S2.15, 007-S3.1–S3.24, 007-S3.26 | SPEC-ONLY → W16 | – |
| 007-S1.11, 007-S3.25 | PARTIAL (alert note) → W16, F22 | U02 |
| 007-S2.1 | COVERED, PARTIAL → F17 | signed-in frames; P U03, U13 |
| 007-S4.1, 007-S4.2 | COVERED, PARTIAL, CONFLICT → F29 | rules frames |
| 007-S4.3 | UI = N | – |
| 007-S4.4, 007-S4.6 | COVERED | U05, U06, U54 |
| 007-S4.5, 007-S5.1, 007-S5.2, 007-S5.4–S5.7 | SPEC-ONLY → W15 | – |
| 007-S5.3 | PARTIAL → W15 | U02 |
| 007-S5.8 | superseded by FR-046 (entry) | – |
| 007-S6.1, 007-S6.2 | COVERED | U11, details frames |
| 007-CP.1, 007-CP.2 | COVERED, PARTIAL (copy) | U14, U35, U43, U44, U46, U48, U61, U62, U75, U87, U100 |

## Not audited
| UNIT-ID | node-ids | name | reason |
|---|---|---|---|
| U101 | 6895:46858 | How other tools do it (research) | OUT: research and inspiration, not app UI |

No unit is UNCERTAIN, FAILED or RATE_LIMIT.
