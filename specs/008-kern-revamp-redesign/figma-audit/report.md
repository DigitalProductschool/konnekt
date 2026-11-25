# Figma ↔ spec audit — 2026-11-07

## Summary
Units audited 100/101 (OUT 1, UNCERTAIN 0, FAILED 0). Figma calls 271 (270 recorded in the unit files + 1 mapper). This remap made no Figma calls: units.md shows calls=0 for all 11 remapped units. Its calls=1 on U72 comes from an earlier remap. Some remapped unit files record only their remap's calls (U05, for example, notes the full run's 5). Together, the unit-file headers still add up to 270.

Requirements index: spec.md mtime 2026-11-07 21:27:35 UTC, compared with the baseline of 20:58:30 UTC. The index holds 254 items, 232 of them with UI = Y, plus 560 baseline items. changes.md lists 1 changed ID (FR-036c) and 1 added ID (OUT-53). 11 of the 100 audited units were remapped against it: U09, U34, U36, U39, U40, U41, U54, U55, U56, U58 and U64. The other 89 haven't changed since the previous merge.

Governance: spec.md says **"Figma decides wording"**. A pure wording difference is copy to port. It is listed under cosmetic with `RULE wording` and needs no question. Copy from outside the frontend and renamed concepts are C items. Each question carries its kind (F, W or C) from the spec's drift table.

Design decisions applied:
- Session 2026-11-06: #1 (defer whatever needs a change outside the frontend) and #2 (adjust colour pairs that fail AA). #3 (verification tables) settles nothing here.
- Session 2026-11-07: #1–#61, all of which refer to the design.
  - The second round (#46–#59) answered the Q1–Q14 of the first remap's report:
    - #46 → F63, C6. It supersedes #6's formats (except "Valid until" and the test-day line) and #31 (c)'s document column.
    - #47 → F64, F65, W21. From now on #8 (a) and (b) apply only to the create and draft flows (F19).
    - #48 → F30. #49 → FR-046d is covered by U81. #50 → 004-S8.6.1 is dropped; the frames already draw no line. #51 → U93 is covered.
    - #52 → F66. #53 → F68, F29. #54 → F69, W22. #55 → F67. #56 → F70. #57 → F27. #58 → C7, F18.
    - #59 → FR-052a–FR-052h are covered; F71, W21.
  - The third round (#60, "Remap 2 Q1") answered Conflict 1 of the second remap's report:
    - A rule inside a top-level group carries "Group with other rules". U36 #28 and U55 #24 are covered as drawn (FR-036c, FR-036i).
    - F30 takes #60's restated "never" list.
    - F33 notes #60's select mode inside a group.
  - The fourth round (#61, "Remap 3 Q1") answered the previous report's Q1 (Partial 1):
    - Inside a top-level group, the entry needs another rule directly in that group. The group's sub-groups are no neighbour (FR-036c, OUT-53).
    - U34 #26 (Rule 03 beside Sub-group 01, frame 2.3, 6113:28988) is a Figma error and joins F30. The same Rule 03 carries no entry in U34 2.1, 2.2 and 2.4 or in U55 10.1, 10.2b and 10.3.
    - Build note 10's "only when another rule or group is on the same level" (U54 #5) holds at the top level only (F30).
    - #61 moves U58 #20 (whose Group 01 holds Sub-group 01) to #48's Figma errors. The previous report already read it that way under F30.
    - Nothing is deferred: letting a rule join an existing sub-group isn't a feature of the design.
- Three places where the merge had to choose a reading:
  - **U55 #24.** The remap maps it as CONFLICT ? [80%]. It reads frame 10.2's Group 01 as Rule 03 plus Sub-group 01, as in frame 10.1.
    - Frame 10.2's tree (6522:32038) shows Group 01 (6522:32058) holding two rule rows (6522:32061, 6522:32064) and no sub-group.
    - The unit's own inventory #25 says "Rule 03 in Group 01 with two members".
    - #60 and #61 both list U55 #24 as built as drawn. The merge reads it as covered.
  - **U88 #28.** #38 names F13's deactivation body. The remap reads U88 #28 as covered under OUT-39, but F13 stands.
  - **005-S6.3.** #41 lists it for building, but #7 removed it. U93 is the design that row was waiting for, so the draft details show no step line (W8).

| category | count |
|---|---|
| Conflicts (open) | 0 |
| Spec-only (open) | 0 |
| Figma-only, behavioural (open) | 0 |
| Partial matches (open) | 0 |
| Figma-only, cosmetic: copy to port, layout, styling (FYI) | 28 |
| Figma must change (decided) | 72 |
| Build without frames (decided) | 22 |
| Copy from outside the frontend (decided) | 7 |

Top 5 issues (open items only): none. Every item is decided. The previous report's only open item was Partial 1 (U34 #26). Since CLAR 2026-11-07 #61 it is part of F30.

## Conflicts
None open. The remap maps U34 #26 as CONFLICT (OUT-53); CLAR 2026-11-07 #61 decides it (F30). The remap's CONFLICT on U55 #24 misreads frame 10.2 (see Summary), so the row is covered.

## Spec-only (not in Figma)
None open. Every UI requirement that no unit covers is settled: see W1–W22 and the Coverage table.

## Figma-only — behavioural
None open. Everything the design adds is decided: F1–F12 are deferred or not built, and FR-051 and FR-052 are adopted.

## Partial matches
None open. The previous Partial 1 (U34 #26, FR-036c, FR-036i) is part of F30 since CLAR 2026-11-07 #61.

## Figma-only — cosmetic (FYI)
Copy to port follows `RULE wording`: under "Figma decides wording" it needs no question. Layout and styling follow the design. The ui-detail rows of the first remap's report (29–35) have been FR-052a–FR-052g since CLAR #59, and they are covered.

| # | item | where | rule / note |
|---|---|---|---|
| 1 | "Create connection" (footer bar, arrow) for "Create form connection" | U11 #20; U12 #22; U13 #19; U14 #16; U15 #22; U16 #31; U17 #40; U18 #46; U90 #34 | RULE wording: copy to port |
| 2 | Draft rows offer "View" and "Edit" for "Continue"; Edit opens the stored step (U06 #64) | U04 #8; U06 #64; U11 #18; U12 #19; U13 #17; U14 #26; U15 #19; U16 #29; U17 #36; U18 #44; U90 #32 | RULE wording: the same action. A draft gets no entry confirmation (FR-045a covers published connections). |
| 3 | Dates as dd.mm.yyyy and "dd.mm.yyyy, hh:mm" wherever the frontend formats them (005-CP.1) | U02 #8; U06 #21; U11 #16; U13 #25; U14 #22; U15 #15–#17; U16 #19; U17 #34; U18 #43; U30 #16; U32 #24; U53 #22; U87 #17; U90 #31; U93 #7 | RULE wording. The test step's formats are C6. |
| 4 | Local-drafts offer texts: "Unsaved changes in "<name>"", "Unsaved changes in 2 connections", "Saved only on this device when the page closed. Nobody else can see them.", "Resume editing", "Discard changes", "Edited · …", "New, never saved · …" | U07 #13, #14; U16 #8, #11, #12, #15, #16 | RULE wording. Structure per CLAR #12 (d), (e). Writes stay continuous (FR-026k). |
| 5 | "Draft saved. You can pick it up any time." as a toast, for "Draft <name> saved." | U06 #56; U17 #4, #39 | RULE wording. It is still announced (001-S7.7). |
| 6 | Step 1 and footers: "Connection name", "Description (optional)" (the marker stays in the label, 006-S4.3), placeholder "e.g. For people who live in the area and park on the street", "Choose documents →", "Set rules →", the edit flow's step 1 "Connection details" / "Rename this connection or update its description." | U04 #26; U05 #27, #32; U18 #19, #21; U19 #10b, #12b, #12c, #15; U21 #20; U27 #23; U28 #24; U98 #12, #14, #16, #28 | RULE wording |
| 7 | Documents copy: the search's no-results "No documents match "…".", the removal dialog body, "Keep document" / "Remove document" | U20 #20; U23 #21; U26 #24 | RULE wording |
| 8 | Rules-step menus, toasts, marks and strip: "Add message", "Delete sub-group", "Restore rule/group/sub-group", "Remove from <variant>", "Reset to Standard" (= Undo), "Delete variant", "Discard changes", "Rule 03 deleted.", "Rule 02 and Rule 03 are now in Group 01.", "Ungrouped. Rules 03 to 05 use their own messages again.", "Rule 01 saved.", "Grouped in Ambulance only. Standard stays the same.", "Added here" / "Removed here", "Linked to Standard", "Group 01 is removed here." / "Sub-group 01 is removed here." | U05 #1; U30 #37; U32 #30; U35 #22, #41; U36 #27; U37 #30; U38 #23, #25; U39 #24, #26, #27b; U40 #23, #31; U41 #19; U42 #17, #18; U43 #27; U44 #37; U46 #35; U47 #12, #15, #29, #33, #34; U50 #30; U54 #7, #8, #13; U56 #23, #28, #36; U57 #17, #18, #21, #22; U58 #17, #19, #21, #22, #26; U59 #11, #20; U60 #18; U61 #21; U62 #18; U84 #30 | RULE wording. Marks keep text as well as colour (002-ACC.1). |
| 9 | Rule-editor texts: "Not for rules", a "Fixed date" section (other dates only), "Search options" in the class menu, "Choose options", "Choose at least one option.", "Need other data? Add it in Documents" (asks "Save changes to Rule 01?" first, 002-S2.25), the nationality hint "… The rule checks all of them.", class-specific counting and missing notes, the boundary sentence | U09 #19, #30, #37; U29 #21; U30 #16, #17; U31 #23, #24, #41; U32 #24, #25; U48 #14, #16, #22, #23; U53 #14, #22, #29 | RULE wording. None of these rows is flagged copy:server or copy:rules. |
| 10 | Variant dialog: "*", "Description (optional)", the helper "Shows when you hover the ⓘ next to the variant name.", "Linked to Standard (recommended)" / "Start empty" with their hints, the intro sentence | U37 #20, #22, #23; U52 #22, #23, #27; U62 #24, #25 | RULE wording. The preselection is FR-052h (CLAR #59 (8)). |
| 11 | Delete-Standard-rule body: "This deletes it from Standard and from the variants that follow it: Ambulance and School transport. If a variant changed this rule, it keeps its own version." | U47 #26 (6185:8847) | RULE wording (CLAR #56). U34's effect sentence is F70. |
| 12 | Test step: "Test rules with sample citizen data"; the intro "Choose a sample citizen to check that your rules work as intended. See which rules they meet and which message they'd see. The data is made up."; "Generate all"; data-card labels "Date of birth", "Expiry date", "ID valid until" | U63 #6; U65–U79 #7, #8, #12/#13; U66 #14; U67 #14; U70 #18; U72 #22; U74 #13, #19; U99 #39 | RULE wording. CLAR #46 takes the rows' labels as drawn. "citizen" is C2; the values are C6 and F63. |
| 13 | Publish texts: "Publish connection", "Save changes?", "Publishing… This takes a few seconds.", "Opening your connection page…", "Couldn't publish. Check your internet connection and try again.", the new body sentence | U05 #34; U63 #25; U73 #21, #27; U75 #9; U78 #2; U79 #3 | RULE wording |
| 14 | Edit-entry dialog body "Your changes only take effect … Started connections don't get interrupted or modified even after saving." | U15 #24; U87 #24 | RULE wording. The flow's own note is F49. |
| 15 | Details texts: "Edit connection", "Go to connections", "Activate again", "Request link" / "Result link", "Links for your service", "View links" / "Hide links", the status sentences and sub-lines, the draft band's sub-line "The links can't be added to your services yet. …", the draft Links card "Created when the connection is published and active." | U07 #8; U58 #42; U63 #38; U80–U99; U88 #7; U93 #6, #17 | RULE wording |
| 16 | Status marks as Status/Connection pills with a dot instead of KERN's icon badge | #3 of the wizard units; U07 #1; U11 #13; U12 #14; U14 #11; U15 #13; U16 #26; U17 #8, #33; U18 #13, #42; U90 #30; U93 #3 | Styling per design. 005-ACC.1 holds: the text stays, so a mark never relies on colour alone. |
| 17 | "Save and exit" as a tertiary button at the footer's left beside Back; "Test rules" outlined beside "Save" in the edit flow | U05 #32; U06 #69; U18 #21, #30; U19 #14; U20 #13; U26 #20; U28 #23; U33 #24; U36 #17; U38 #27; U42 #29; U43 #18; U52 #18; U70 #24; U76 #23; U100 #16 | Layout per design (005-S0.3 allows Figma's order) |
| 18 | Sticky header and footer; step head, tabs and selection bar pinned | U01 #14, #17–#19; U38 #26; U64 #13 | Layout per design (002-S0.2 and 002-S0.3 hold) |
| 19 | Inner scroll regions; the documents layout fills the viewport at ≥ 800 px | U01 #16; U04 #15; U12 #21; U21 #16, #26; U23 #17; U24 #16; U25 #14; U26 #17; U27 #19; U28 #27 | Layout per design; FR-010a holds (W2) |
| 20 | Menus in the top layer: side, max height, inner scroll, closing on Esc or on a click outside | U01 #9–#13; U06 #92 | Layout. placementFrom() stays (FR-009d). |
| 21 | Kit anatomy and styling: 72 px footer with 40 px buttons, check and radio anatomy with a mixed state, dialog widths, × close, skeleton loading, toast types and position, scroll lock | U01 #5, #6, #8, #20; U05 #19; U06 #22, #95, #96, #98; U24 #23; U68 #28 | Styling per design and kit |
| 22 | Statement chips, symbol chips, document icons, values as comma text, the same purple for "Changed here" and "New addition" | U06 #12; U32 #34; U42 #32; rules and details units | Styling. Symbols stay hidden from assistive technology (002-S2.6), and the text tells the marks apart. |
| 23 | Pencil as the edit action on rule and group messages | U33 #22; U35 #26; U48 #17 | Styling of the existing edit action. Group menus: F69, W22. |
| 24 | Read-only connector pill on the details; rule names in link colour on the details | U83 #31; U84 #38 | Neither is a control or a link (CLAR #24 (a), FR-046b, FR-047c) |
| 25 | Illustrations, hero and tagline, status pictures, highlighted links card, numbered markers, glyphs, scrollbars, backgrounds, heading colours, muted (i), stable button width, Fira Sans preload, "Your login is encrypted", decorative alt="" | U02 #12; U03 #28, #39; U05 #10, #11, #16, #25; U06 #20, #99, #100; U10 #3, #10; U11 #24, #27; U15 #33; U18 #9; U35 #24; U37 #18; U38 #28; U39 #30; U41 #30; U43 #29; U45 #22; U46 #37; U47 #36; U52 #19; U55 #19, #36; U57 #24; U59 #24; U60 #27; U61 #27; U64 #34; U80 #24–#26; U81 #10, #19; U82 #9; U83 #38–#42; U84 #10, #19; U85 #10; U86 #29–#31; U87 #6, #11; U88 #17, #25; U89 #11, #20; U90 #14; U91 #9; U92 #10; U93 #8; U95 #11; U96 #10; U97 #10; U99 #9, #10 | cosmetic |
| 26 | Sample data, not ported: variant URL slugs that look like names (002-S6.8's identifiers stay), row order, stale layer names, "Height (cm)", Place of birth parts, a reactivate summary listing only Standard, a repeated condition, a disabled "Save rule" under an open menu | U11 #21; U12 #20; U13 #24; U16 #32, #33; U17 #38; U32 #40; U51 #18; U53 #27, #30; U63 #33; U81 #17; U82 #13; U84 #17; U89 #18, #31; U91 #15; U93 #21; U96 #17; U99 #13 | OUT-8 |
| 27 | Process notes: provenance, "Old ·" layers, open-question markers, construction layers, the note title "Rules", the design's open question on skipping Rules (the baseline stays), "Documents list: no 'x of y'" (the pager FR-031b and the count FR-051k stay) | U01 #1; U02 #22; U05 #13, #17, #18; U06 #24; U07 #21; U08 #1; U09 #1, #4; U23 #23; U64 #5 | cosmetic |
| 28 | The text of the "Leave site?" warning | U05 #43 | The browser writes its own text. FR-026e holds, and the local draft stays the safety net (FR-026k). |

## Figma must change (decided)
Build these as the spec says, keeping Figma's layout and styling, until the design is updated.

| # | req | Figma (unit, node-ids) | Figma shows | build instead | decision |
|---|---|---|---|---|---|
| F1 | 002-S5.7, 002-S5.8, 002-S6.7, OUT-48 | U02 #9, #10, #17; U05 #34, #38; U06 #19, #49, #65; U07 #2; U13 #12; U14 #13, #21; U58 #33; U63 #21; U73 #24; U75 #7, #11–#13 (6376:25536); U76 #27, #29–#31, #33, #34 (6635:36265); U77 #7; U86 #4, #10, #11; U87 #19–#22 (6396:48860); U88 #10, #33; U89 #32; U94 #3, #6, #7; U95 #4, #7–#9; U98 #38, #40; U99 #36, #37 | Go-live scheduling: "Active from: Now / On a date", a date field, "Enter a date after today.", "Schedule", the "Scheduled" status, rows and screens, "Active from <date>", "Change start date", "from the time you choose" | Publishing goes live at once. No "Active from" choice or date, no "from the time you choose" in the save body, no Scheduled status or screen. The ⋯ menu holds Deactivate (or Reactivate) and Delete. | CLAR 2026-11-06 #1; CLAR 2026-11-07 #52 |
| F2 | 002-S6.9, OUT-35 | U06 #60, #82; U07 #26; U58 #41; U63 #37; U80 #20, #21; U81 #22 (6809:46582); U82 #23; U83 #33, #34; U84 #35; U85 #24; U86 #22–#26; U87 #14; U88 #21, #22; U89 #24, #25; U90 #20; U91 #26; U92 #14–#16; U93 #18, #19; U94 #20; U95 #17–#19, #22 (7246:54525); U96 #28; U97 #14, #15; U99 #17, #18 | Activity accordion, "Last edited by", the event log, "View activity" / "Hide activity", "Deactivated by …" | No Activity accordion and no editor or timestamp lines; only Links and Summary | CLAR 2026-11-06 #1; CLAR 2026-11-07 #35 |
| F3 | 002-S1.8, FR-031c | U04 #39 (6711:39375); U20 #18, #19; U21 #25; U22 #24 | "Coming soon" / "Upcoming" documents | Only the catalog's documents, under "Available (n)". The all-added state doesn't point to upcoming documents. | CLAR 2026-11-06 #1 |
| F4 | 001-S6.11, 001-S6.12 | U04 #21; U05 #24; U90 #22 (6417:31520) | "Undo" in the toast after deleting a connection | Deletion stays permanent; the toast (FR-051p) has no Undo | CLAR 2026-11-06 #1 |
| F5 | 005-S0.7, 004-S0.4, FR-045b | U03 #36; U05 #31, #33; U06 #50; U60 #33, #35; U98 #5; U99 #22, #23; U100 #3 | A live connection's pending changes kept as a draft: "Keep draft and exit", the "Draft changes" label, "Changes not published", E5a | No Save and exit or "Keep draft and exit" in the edit flow, and only "Active" in the header. Changes exist until they are saved through "Save changes?" or discarded. Leaving: F64. | CLAR 2026-11-06 #1; CLAR 2026-11-07 #34, #47 |
| F6 | 001-S7.9 | Header of every frame U10–U100 (e.g. U15 6699:45201, U19 6699:45323, U98 6731:39823); U03 #31 | DE/EN language switch | No switch: one English UI with lang="en" | CLAR 2026-11-06 #1 |
| F7 | 002-S2.12, 002-S2.13, 002-S2.15, OUT-49 | U34 #27; U36 #29 (6344:53657); U54 #6, #14 (6522:33107); U55 #25, #26 (6522:32071); U56 #27 (6522:32540) | "Remove from group", "Remove from sub-group", moving a sub-group out | Group menus offer "Ungroup" and "Delete group" (inherited groups: Remove and Restore) | CLAR 2026-11-06 #1; CLAR 2026-11-07 #53 |
| F8 | 002-S2.16 | U54 #15; U55 #29 (6522:32424); U56 #24; U57 #22 (6522:32923) | "Duplicate group" / "Duplicate sub-group" | Duplicate stays a rule action | CLAR 2026-11-06 #1 |
| F9 | 002-S3.1, 002-S2.9, 002-S2.15 | U34 #19; U35 #20; U36 #26; U38 #21; U39 #25b; U40 #24; U41 #20; U42 #26; U43 #22; U44 #29; U45 #20; U47 #24; U51 #19, #25; U52 #17; U54 #9; U55 #21; U56 #21; U57 #16; U58 #18; U59 #22; U60 #24; U62 #14 | "+ Add rule" inside a group or sub-group | One "+ Add rule" per variant, adding at the end of the top level. Groups form only by selecting items. | CLAR 2026-11-06 #1 |
| F10 | 002-S4.14, 002-S4.31, 002-S4.4 | U03 #23 (6648:42016); U05 #4, #5, #20 (6711:39381); U06 #16 (6791:46863); U08 #5 (7370:55195) | "Unlink from Standard", its result and the toast "Unlinked from Standard." | The tab menu offers Rename, Delete and Copy link, and based variants stay based | CLAR 2026-11-06 #1 |
| F11 | 004-S8.6.4 | U06 #40 | Persona generation that makes every rule testable | Generation as today; "Couldn't be checked" stays | CLAR 2026-11-06 #1 |
| F12 | – (OUT-2) | U06 #27; U07 #29; U08 #6; U93 #22 | View-only users, roles, a view-only draft page | Every team member has the same rights | CLAR 2026-11-06 #1 |
| F13 | 001-S6.9, US4-AS3 | U88 #28 (6417:31206) | "The connection will be deactivated and its links will stop working. Requests already started still finish. Remember to remove the wallet connection from your service." | "The connection will be deactivated and its links will stop working at once. Requests in progress are cancelled. Remember to remove the wallet connection from your service." The remap reads this row as covered under OUT-39, but #38 names this body. | CLAR 2026-11-06 #1; CLAR 2026-11-07 #38 |
| F14 | FR-028a, US1-AS3, OUT-10 | U04 #4, #14, #19; U05 #12; U06 #66; U11 #9; U12 #8, #10; U13 #9; U14 #8; U15 #8, #21, #27–#31 (6699:45206); U16 #23; U17 #29; U18 #39; U90 #27 | Row and select-all checkboxes; the selection bar "N selected · Cancel · Delete"; a bulk dialog with "Keep connections" / "Delete connections" | A Delete on each row with the details' dialog; no checkboxes | CLAR 2026-11-07 #11 |
| F15 | FR-027a, US1-AS5, OUT-9 | U06 #25 (6791:46863), #91; U11 #26; U18 #8, #10–#12, #16, #23, #32; U73 #25 | "Start from an example", the example dialog, example banners, the publish-dialog example line | The welcome page with "Create connection" only | CLAR 2026-11-07 #9 |
| F16 | US1-AS1, 001-S1.2, OUT-18 | U10 #13 (6401:28435) | Only Username gets the error fill | Both fields invalid, with the one message "Username or password is wrong. Check both and try again." | CLAR 2026-11-07 #10 |
| F17 | FR-030a, FR-030b, 007-S2.1, OUT-11 | U03 #32; U10 #18; U13 #22, #23 (6699:44358) | A menu with an email line and no "Your account"; a signed-in frame without the pill | The pill on every signed-in screen. Its menu shows the name (bold), "Your account" and "Log out", with no email. | CLAR 2026-11-07 #13 |
| F18 | 005-S1.2, FR-023g, OUT-16 | U04 #27 (6703:39321) | With no name, "Save and exit" just leaves | Step 1 opens with "Enter a name for the connection." under "Connection name", the field focused and nothing stored (C7) | CLAR 2026-11-07 #16, #58 |
| F19 | FR-026a, FR-026c, FR-026f, 001-S0.6, OUT-15 | U03 #34, #35 (6703:39311); U05 #41 (6730:40338); U06 #51, #90 (7137:50569); U17 #5, #24 (7173:52656, 6890:46052) | In a create flow, the product name and the breadcrumb save at once ("saving…", "Draft saved"), and an open editor's state is stored with the draft | In a create or draft flow, both open "Leave this connection?". "Save progress" runs Save and exit; a validation error keeps the member in the flow. An open rule editor asks "Save changes to Rule 01?" first, and no editor state is stored. The edit flow is F64. | CLAR 2026-11-07 #8, #47 |
| F20 | FR-026i, FR-026j | U17 #20 (6408:72919) | Log-out dialog with × only | ~~A "Cancel" is added, which returns the focus to the user menu~~ Reversed 2026-11-18 by bug v5-ui-fixes: built as drawn, "Log out anyway" and "Save and log out" side by side and no "Cancel"; the ×, Escape and the scrim return the focus to the account pill | CLAR 2026-11-07 #8; CLAR 2026-11-18 #3 |
| F21 | FR-033d, 005-S0.4, 005-S1.4, OUT-17 | U17 #3, #23 (6401:71898, 6401:71899) | Blocking modal "Saving your draft…" | No modal: "Save and exit" is aria-disabled and reads "Saving…", and a polite status says "Saving draft…" | CLAR 2026-11-07 #17 |
| F22 | FR-033c, 005-ACC.3, 005-S8.1–S8.4, 007-S1.11, 007-S3.25, 007-S5.3 | U02 #5, #6 (build note 7) | Every page-level alert title-only | An alert is title-only only when it carries a title alone. The error ID, list, "Try again", "Remove it" and "Dismiss" stay, in the design's alert style. | CLAR 2026-11-07 #17 |
| F23 | FR-031j, FR-009a, 001-S7.2, OUT-12 | U04 #42, #43; U08 #2, #3 (7370:55193); U23 #13; U27 #11–#13, #24 (7298:63317); U28 #12 (7298:64157); "oldest first" U20 #10, U21 #10, U22 #11, U24 #10 | A drag handle, drop line, drag image and Move up/down; the list ordered "oldest first" | Catalog order, with no handle and no reordering | CLAR 2026-11-07 #14 |
| F24 | FR-031j, 001-S5.3, 002-S1.2, OUT-13 | U04 #44–#47; U21 #14; U22 #16; U23 #16; U24 #14; U25 #13; U26 #14 (6324:40326); U27 #17; U28 #17; U98 #25 | Field groups (Name, Birth, Address, Document, Other details) with tri-state group checkboxes | Fields in catalog order without group rows; select-all per document (002-S1.2) | CLAR 2026-11-07 #14 |
| F25 | FR-025c, US2-AS1 | U02 #2 (6637:36653); U19 #6b (6716:40931) | The step line is never clickable | Clickable while editing, not while creating | CLAR 2026-11-07 #7 |
| F26 | 002-S2.1–S2.3, OUT-43 | U30 #25; U33 #8; U49 #5; U50 #32; U51 #27, #37; U53 #8 | No variant tab row before the first rule or while a rule is edited | "Standard" and "+ Add variant" from the start of the step and while editing; "No rules yet" in each variant | CLAR 2026-11-07 #19 |
| F27 | FR-035a–FR-035d, 004-S8.2.6, OUT-41, OUT-52 | Standard (i) without a description: U30 #26, U59 #9, and the Test frames U65 #10, U67 #10, U68 #10, U72 #10, U75 #19, U77 #20, U78 #15, U79 #19; variant ⓘ missing: U37 #10, #26 (6134:8722, frames 3.2, 3.2b), U46 #28, U56 #10 (frame 10.5), U64 #15 (frame 12.2) | An (i) on Standard without a description; the variant ⓘ only while no variant exists | Standard's (i) shows only with a description. On the Rules step the variant ⓘ follows "+ Add variant" in every state, opens on hover and on focus, and reads "A separate set of rules for citizens with different requirements. Each variant gets its own result link." (U37 6151:33820). The Test step shows no variant ⓘ: an (i) after "Standard" there is its description icon. | CLAR 2026-11-07 #20, #57 |
| F28 | 002-S4.4, 002-S4.22, 002-S4.24, FR-023b, OUT-19 | U59 #10, #13–#15 (6523:37251, 6523:37532, 6523:37662, 6523:37665); U60 #9, #10 (6523:37675, 6523:37683); U62 #6 (7112:47821, 7112:48213) | Inline rename in the tab, double-click, "Enter saves · Esc cancels", ⋯ on the active tab only, the duplicate error beside the tab | "Rename" opens "Edit variant" (name, description). The duplicate error "There's already a variant called "Ambulance"." shows in the dialog next to the field. Every tab has its ⋯. | CLAR 2026-11-07 #21 |
| F29 | 007-S4.1, 007-S4.2, 007-S4.6, 002-S2.16, FR-036a, FR-036b, US3-AS1 | U09 #44; U34 #25; U36 #15, #28; U39 #27e, #28b; U41 #22; U47 #17, #30, #34; U54 #2, #10 (6522:33105); U55 #33; U56 #29, #40; U57 #18, #19, #22; U58 #23, #28; U59 #11; U61 #25 | Menus without "Copy link"; removed items "Restore only"; menus of unlinked rules without "Rename" and "Copy to variant" | "Copy link" is the last entry before the destructive ones in every rule, group and variant menu of a stored draft or a published connection (007-S4.6), and follows "Restore" on removed items. Rule menus carry "Rename" and "Copy to variant", except on items linked to Standard in a variant (F68). "Copy to variant" shows only while some variant could still receive the item (FR-036f). | CLAR 2026-11-07 #22, #53 |
| F30 | FR-036c, FR-036d, FR-036i, 002-S2.10, OUT-20, OUT-53 | U34 #26 (6113:28988, frame 2.3; Group 01 6113:28667 holds Rule 03 6113:28670 and Sub-group 01 6113:28674); U39 #27f (6324:39971); U55 #27 (6531:39068), #30 (6522:32424); U56 #25 (6522:32540); U58 #20 (6522:33026); build note 10 U54 #5 (6522:33107) | "Group with other rules" in four places: a sub-group's menu; a rule inside a sub-group; a group that holds a sub-group; a rule whose only neighbour in its top-level group is a sub-group (U34's Rule 03 beside Sub-group 01). Build note 10 sets no level limit ("only when another rule or group is on the same level"). | None of these places has a grouping entry. The entry appears on top-level rules and on top-level groups without a sub-group, beside a neighbour on the same level; build note 10's "another rule or group" holds there. On a rule inside a top-level group, it appears only when another rule sits directly in that group, whether or not the group holds a sub-group (#60). The group's sub-groups are no neighbour (#61). It starts select mode with that item selected; inside a group, the selection is limited to that group's rules. In U34 2.3, Rule 03's menu keeps "Edit rule", "Duplicate" and "Delete rule", and gains F29's "Rename", "Copy to variant" and "Copy link". "Remove from group" stays out (F7). The same Rule 03 carries no entry in U34 2.1, 2.2, 2.4 or U55 10.1, 10.2b, 10.3. #61 moves U58 #20 (whose Group 01 holds Sub-group 01) to #48's Figma errors. | CLAR 2026-11-07 #22, #48, #60, #61 |
| F31 | FR-037c, 002-S2.13, 002-S2.14, 002-S4.18, OUT-21 | U35 #21, #40; U47 #35; U51 #21, #24, #25 | A group with one member, an empty group with its own copy, and a sub-group renamed "Group 01" when it moves up | Groups left with one member or none dissolve, and a sub-group that moves up keeps its name | CLAR 2026-11-07 #23 |
| F32 | FR-037a, 002-S2.5 | U35 #28 (6324:39055, 6324:39062, 6324:39065) | Members of a group with its own message show no message line | Each member's message row reads "Not shown while this rule is in Group 01. Citizens see the group message instead." | CLAR 2026-11-07 #23 |
| F33 | FR-038d, FR-038e, 002-S2.8, 002-S2.9, 002-S4.31, OUT-22 | U40 #13, #29, #30 (6961:56291); U62 #19, #21; U64 #22 | No connector between groups, a trailing connector, the link icon on some linked rules only, groups without checkboxes in select mode | One connector between items; the link icon on every linked rule or on none; groups have checkboxes and can be selected. Select mode started inside a group gives boxes to that group's rules only, as U36 2.19 draws (6616:44240). | CLAR 2026-11-07 #24; #60 for select mode inside a group |
| F34 | 002-S3.12–S3.18, 002-S3.30, OUT-23, OUT-24 | U03 #2; U09 #22, #24, #27 (6986:50041); U29 #24, #26, #27; U31 #43; U46 #13; U49 #18; U50 #24; U53 #36 | Fixed-date checks on the Date of birth, no "from now" for it, "Time passed / Time left", "at most", "on", a unit picker on age checks, "starts with", the sections "Age" / "Date of birth" | Date of birth: "Time ago" and "Time from now" checks, with whole years as fixed text. Hint: "Check the time since or until this date, or compare it with a fixed date." | CLAR 2026-11-07 #25 |
| F35 | 002-S2.7, 002-S6.12, OUT-25 | rules step U03 #10; details U82 #20, U83 #24, U85 #22, U93 #14 | "Saved rules show their ID"; details without identifiers | No identifiers in the rules step. On the details, a read-only identifier (rule-7, group-3) next to each rule, group and sub-group name. | CLAR 2026-11-07 #26 |
| F36 | FR-040c, 002-S4.19, 002-ACC.1, OUT-27 | U43 #27; U47 #15, #32; U58 #26 | Removed items hide their message line; a changed rule in a removed group has no "Changed here" | The message line and the "Changed here" text stay | CLAR 2026-11-07 #28 |
| F37 | FR-040d, 002-S4.29, OUT-26 | U05 #3 (6711:39381) | A Standard-based variant shown "not linked" while Standard has no rules | It stays linked | CLAR 2026-11-07 #28 |
| F38 | FR-041c, 004-S8.2.2, 004-S8.2.3, OUT-28 | U03 #21; U06 #9; U72 #10 (if it is a finding marker) | Every finding kind on the Test tabs; a ⚠ hard-coded with no logic | Only "no citizen can meet", from the evaluator | CLAR 2026-11-07 #29 |
| F39 | FR-041d, 003-S2.16, 003-ACC.3 | U44 #17; U45 #28, #34 (6753:40144); U46 #11 | Names in banner lines as plain text | Links that scroll the item into view and focus its row or header | CLAR 2026-11-07 #29 |
| F40 | FR-042d, 004-S8.5.3–S8.5.5 | U66 #30, #31 (7058:60514); U67 #32, #34 (7058:60806) | Licence classes as a text input; no Nationality or Expiry date field | Classes picked from a list by code; Nationality and Expiry date fields; "Class B since" | CLAR 2026-11-07 #30 |
| F41 | FR-043d, 004-S8.6.7, OUT-30 | U06 #32; U65 #28 (7057:59533); U70 #22 | "Message Mia reads" box: "Your wallet data meets the requirements. Other documents are checked separately." | No success message for a met variant | CLAR 2026-11-07 #31 |
| F42 | FR-043a, 004-S8.6.3, 004-S8.6.4, 004-S8.6.6, 004-ACC.1, OUT-31 | U63 #14, #15; U65 #23, #24 (7057:59087, 7057:59096, 7057:59105, 7057:59114); U66 #21, #22, #25; U67 #22, #23; U68 #23, #24, #33; U69 #26, #27; U71 #23, #24; U72 #28, #29; U73 #15; U75 #25, #26; U76 #20, #21; U77 #25, #26; U78 #23, #24; U79 #31, #32; U99 #46, #47 | Result rows without the statement or the status text; "19, needs 21"; a "Mia sees" box | ~~Each row has the name, the statement, "Not met" / "Couldn't be checked" as text with the design's icon and tint, and the message. Met rows have the statement and "–".~~ Reversed 2026-11-19 by bug test-results-v5 (V5 frames 1 `7599:55727`, 2 `7599:55854`, "Long rules" `7644:65669`): built as the V5 rows, a list without a head; each row has KERN's status icon, the name coloured by its outcome, the statement, and "Message for citizens: <its message>", met rows too (no "–"); "Not met" and "Met" are hidden text, "Couldn't be checked" stays visible (F8 of spec 004 kept; V5 frame 3 `7599:55980` draws it as not met, a Figma error); no tint | CLAR 2026-11-07 #31; CLAR 2026-11-19 #2, #3 |
| F43 | FR-043c, 004-S8.4.11 | U01 #15; U65 #20 (7114:49642, 7114:49643); U66 #18; U67 #24; U68 #20; U69 #23; U70 #20a; U71 #20; U72 #23, #24; U73 #16 | Each card scrolls on its own; "only the page scrolls" | ~~The panel scrolls as a whole~~; header, step line, tabs, applicants row and footer stay. Reversed 2026-11-18 by bug v5-ui-fixes (V5 frame 15 `7599:57529`): where the step header is pinned and the cards sit side by side (`lg`), each card's head stays and only its rows scroll, each card on its own; elsewhere the panel or the page scrolls as before | CLAR 2026-11-07 #31, #46; CLAR 2026-11-18 #1 |
| F44 | 004-S8.3.1, 004-S8.3.2, OUT-32 | U07 #4; U63 #8; U75 #20; U76 #10, #11; U77 #21; U78 #16; U79 #20, #21 | Persona cards with avatar, age · nationality and "Meets the rules" / "Doesn't meet the rules" | Chips with the name and an outcome icon, no outcome text (U65 7057:58755) | CLAR 2026-11-07 #32 |
| F45 | 004-S8.1.2, 004-S8.2.3, 004-S8.3.4, 004-S8.3.5, 004-S8.4.1, 004-S8.7.1, 004-S8.9.3, OUT-33 | U05 #15; U06 #37, #80 (7058:63148, 7127:49610); U63 #9; U74 #21, #24 (7062:51784); U75 #21; U76 #13; U77 #22; U78 #18; U79 #23 | Generating always asks first; no test-day line during one persona's regeneration; no "Generate again" / "Generate all again"; the tab tooltip without hover; "Your rules are saved." | It asks only when there are changes. ~~The test-day line shows during one persona's regeneration.~~ Amended 2026-11-19 by bug test-results-v5 (V5 frame 19 `7599:58022`): the date is in the result card's head, so the regenerating persona's skeleton card shows none, while another persona's card does. Both buttons show in every results state. The tooltip opens on hover and on focus. No "Your rules are saved." | CLAR 2026-11-07 #32; CLAR 2026-11-19 #1 |
| F46 | FR-044e, FR-008, 002-S5.3 | U79 #3–#5 (6376:26984, 6376:27178) | "Couldn't publish" without an error ID, and the summary dropped | The "Couldn't publish" sentence with the error ID, and the summary kept | CLAR 2026-11-07 #33 |
| F47 | FR-022a, FR-044c, 003-CP.11 | U77 #8 | "1 warning on Ambulance" | "Ambulance: no citizen can meet these rules. 2 rules contradict each other, and 1 rule is a duplicate.", warnings first | CLAR 2026-11-07 #4, #33 |
| F48 | FR-045a | U87 #23, #25 (6396:49030) | "Edit this active connection?" | "Edit "<name>"?" with "Cancel" / "Edit connection" | CLAR 2026-11-07 #34 |
| F49 | FR-045f, 001-S5.9 | U05 #27; U98 #15 | "Active. Your changes take effect when you save them." | "Your changes take effect when you save them. Requests already in progress keep their previous configuration." | CLAR 2026-11-07 #34 |
| F50 | FR-046c | U85 #18; U92 #16; U95 #22 | Links not an accordion, and both open; Activity open | Links and Summary are accordions, one open at a time; Summary opens on arrival from "View" | CLAR 2026-11-07 #35 |
| F51 | FR-046f, 002-S6.11, 002-S4.3 | U58 #37; U63 #33; U80 #14; U81 #15; U82 #13; U83 #13; U84 #15; U85 #14; U86 #16; U87 #10; U88 #15; U89 #15; U90 #17; U91 #13, #21; U94 #11; U96 #13; U99 #12 | Variant labels without an ⓘ | A branch ⓘ after each variant name, in Links and in the Summary tabs, holding the description (none without one, 002-S4.3) | CLAR 2026-11-07 #35 |
| F52 | FR-048b, 005-S3.3, OUT-37 | Details U58 #31, U63 #28, U80 #7 (7355:61158), U81 #8 (7355:61822), U82 #7, U83 #7, U84 #8, U85 #8 (7355:61738), U86 #8, U87 #7, U88 #8, U90 #15, U91 #7, U92 #8, U99 #7; deactivated U89 #8 (7355:61546), U96 #7 (7355:60885), U97 #7; overview U11 #15, U12 #16, U13 #13, #15, U14 #10, #12, U15 #15, #17, U16 #27, U17 #35, U18 #43, U90 #31; build note U07 #6 | "Active since …" / "Deactivated since …" pills; rows reading "Published <date>" / "Deactivated <date>" | No status-date pill, and every row reads "Edited <date>" (a draft adds its step, F71). The ⋯ menu moves to the band's right end (F66). | CLAR 2026-11-07 #37, #52 |
| F53 | 002-S6.9, OUT-36 | U07 #28; U58 #40; U63 #36; U80 #18; U81 #21; U82 #15; U83 #17; U84 #21; U85 #17; U86 #20 (6396:48385); U87 #13; U88 #19; U89 #22 (6417:31343); U90 #19; U91 #17; U92 #13; U93 #10; U94 #14; U95 #15; U96 #20; U97 #13; U99 #15 | "Download PDF" | Not built | CLAR 2026-11-07 #37 |
| F54 | 001-S6.9, 001-S6.10, OUT-38 | U05 #24; U89 #26 | Undo after deactivating | No Undo; a deactivation is reversed through "Activate again" | CLAR 2026-11-07 #37 |
| F55 | FR-029c, 005-S6.10 | U14 #18 | The draft's delete body "Its documents and rules will be deleted too." | A draft keeps "<name> will be deleted for good. It was never live, …"; title and buttons as drawn ("Delete connection" / "Keep connection") | CLAR 2026-11-07 #12 |
| F56 | FR-049c, 005-S6.9, US4-AS4 | U93 #20 | No "Delete draft" | A visible "Delete draft" on the draft details; since bug `new-visuals` (2026-11-21) the one entry of the draft date pill's ⋯ | CLAR 2026-11-07 #39; bug `new-visuals` Decisions 4 |
| F57 | FR-049d, 005-S5.5, OUT-40 | U06 #57 (7127:49610) | × and scrim close with no change | In the restore dialog, Escape, × and the scrim open the draft's details and keep the local draft | CLAR 2026-11-07 #39 |
| F58 | FR-023b, FR-023c, FR-023e, FR-023f | U49 #17, #21 (6196:10710); U50 #11 (6863:47363, 7173:52333) | "Enter a number greater than 0."; "There's already a rule called "Rule 02"."; the banner without "in Standard"; "Add it again in Documents" as plain text | "Enter a whole number greater than 0."; "There's already a rule called "Rule 02" in Standard."; "Rule 02 in Standard checks data that's no longer requested. Add it again in Documents, or edit or delete the rule.", with the "Add it in Documents" action | CLAR 2026-11-07 #5 |
| F59 | FR-051h, FR-020a | U09 #26 | "Applicants who turn 21 that day count." | "Citizens who turn 21 that day count." | CLAR 2026-11-07 #2, #45 |
| F60 | FR-032d, 006-S1.4, 006-S1.5, FR-051i | U18 #18, #19; U19 #11, #11b (6809:46396, 6809:46408); U98 #13, #14 | An ⓘ on "Connection name" only, with "This name helps you … Citizens never see it." | Both ⓘ. The name field's is built as drawn. The description gets "About the description" / "A note for your team, such as the form's ID in your form management system. Citizens never see it." | CLAR 2026-11-07 #15, #45 |
| F61 | FR-051a, FR-051q, 001-S7.4 | U11 #7; U12 #7; U13 #7; U15 #7 (6699:47855); U16 #21; U17 #28; U90 #26 | Overview search with a placeholder only | A visible label, plus ×, "n of m connections", the no-results message and "Clear search" as in U11 #29–#33 | CLAR 2026-11-07 #45 |
| F62 | FR-050c | U06 #101 (7137:50569) | "With prefers-reduced-motion: fades only." | Transitions turned off | CLAR 2026-11-07 #40 |
| F63 | FR-024a, FR-024c, FR-024d, FR-043b, 004-S8.4.2, 004-S8.6.2, OUT-44 | Publish frames U63 #10–#13 (7112:48790); U75 #22, #24; U76 #14–#16, #19 (6863:47775); U77 #22, #23, #25; U78 #19, #21, #22; U79 #24–#26, #30 (6863:48492); Test frame U72 #15, #22 (7058:61720) | The document column, "08.07.2007 · 19", "B since 20.08.2025 · 1 year" with one row per class, "Result: doesn't meet the rules"; in U72 the two documents' rows interleaved, and "ID valid until" with a plain date | A flat list under the rows' labels with no visible document column. Rows are grouped per document in catalog order, with the document's name as the row group's accessible heading. "08.07.2007" (no age); "B since 20.08.2025" (no years); classes with the same issue date share a row ("B, BE since 02.05.2010"); the expiry row reads "Valid until <date>" under its drawn label ("Expiry date", "ID valid until"); "Result: doesn't meet 2 rules" / "Result: doesn't meet 1 rule". Values: C6. | CLAR 2026-11-07 #46 |
| F64 | FR-026l–FR-026n, FR-045d, FR-045e, EC-10, OUT-45 | build notes U05 #36 (6730:40338), U06 #27, #51; E5a U99 #22 (6890:46197) | Leaving the edit flow through the product name or "Your connections" keeps a draft silently ("Draft kept. …", "Changes not published"); "Discard changes" marked "Later" | Both open E5b's "Save your changes?" (U99 7173:52836): "If you leave now, your changes are lost. Save them, or discard them and keep the active version.", "Discard changes" (danger outline), "Save" (primary) and ×. "Save" opens "Save changes?" and leaves to the details once saved; a validation error keeps the member in the flow. "Discard changes" leaves without saving. × and Escape keep the member in the flow. "Discard changes" is in every edit-flow footer now. | CLAR 2026-11-07 #34, #47 |
| F65 | FR-034a, FR-034b, FR-034c | build note 5 U01 #21, #22 (6637:36652) | "Publish" disabled while a rule is open or rules are being grouped, with a short reason next to it | The rules step has no Publish. "Test rules" (create and draft flows) and "Save" (edit flow) are disabled while a rule is open, incomplete or in error, or while grouping. "Save the rule first" / "Finish grouping first" open on hover and on focus (W21). | CLAR 2026-11-07 #18, #47 |
| F66 | FR-048c, FR-048d, FR-048b, OUT-37 | U07 #7, #8 (7370:55183); U87 #8 (7355:61377); U88 P14, P15 (6417:30900, 6417:31060); U89 #9, #10 (7355:61548, 7355:61549); U90 #7 (7355:61614); U94 #8 (7355:60694); U95 #10 (7355:60790); U96 #8, #9 (7355:60887, 7355:60888); U97 #8, #9 (7355:61025, 7355:61094; 7355:61026, 7355:61095) | The connection ⋯ menu inside the status-date pill, with "Activate again" beside the pill (U96 draws the ⋯ before the button) | No pill. The ⋯ menu ("Deactivate" while active, "Delete") sits at the status band's right end; while the connection is deactivated, "Activate again" stands before the ⋯. | CLAR 2026-11-07 #52 |
| F67 | FR-033a, FR-031g, FR-031k, OUT-50 | build notes U05 #22 (6720:39042), U04 #32 (6711:39375) | The failed-save toast "with Retry"; the nothing-chosen dialog's "Remove them and continue" | The toast reads "Couldn't save. Check your internet connection and try again." with "Try again" (U51 6197:11098). The dialog reads "No data selected in 1 document" / "No data selected in <n> documents", with "Driving licence has no data chosen yet. Choose data for it or remove it." and the buttons "Choose data" and "Remove 1 document" / "Remove <n> documents" (U25 7299:52174). | CLAR 2026-11-07 #55 |
| F68 | FR-036e, FR-036f, 002-S2.16, 002-S2.19, 002-S4.10 | U57 #19 (6522:32824, anchored at Rule 05's ⋮ 6522:32810) | A rule menu with "Duplicate" and "Delete rule" at Rule 05, a rule linked to Standard (the frame title says "new addition", which is Rule 06) | A rule or group linked to Standard in a variant has no "Rename", "Duplicate" or "Ungroup", and offers "Remove from <variant>" instead of Delete. Rule 06 ("Added here") keeps the drawn menu, with "Rename" and "Copy link" added (F29). | CLAR 2026-11-07 #53 |
| F69 | FR-036g, 002-S2.17, 002-S2.19 | U55 #33, #34 (6522:32424; frame names 6530:40150, 6522:32382); U56 #30 (6522:32540); U57 #22 (6522:32923); build note U54 #2 (6522:33107) | Group and sub-group menus without "Rename", although U55's frame names promise it | "Rename" in every group and sub-group menu, except on a group linked to Standard in a variant. It renames inline on the name, with 002-S2.19's duplicate check. | CLAR 2026-11-07 #54 |
| F70 | FR-037d, 002-S4.15, 002-S4.17, OUT-51 | U34 #29 (6113:29056) | The body "Citizens won't be checked for licence classes C or D any more.", which also doesn't say that Group 01 dissolves | No effect sentence. The title is "Delete Rule 03?", and the body is the current app's, plus 002-S4.17's "Ambulance's changes to Group 01 go with it." where a group dissolves. A Standard rule with variants gets U47's body (cosmetic 11). | CLAR 2026-11-07 #56 |
| F71 | FR-052d, FR-048b, 005-S3.3 | U11 #15; U12 #16; U13 #14; U14 #11; U15 #16; U16 #27; U18 #43; U90 (Missing FR-052d) | Draft rows read "Edited <date>" without the step | "Edited <date> · <step> step", e.g. "Edited 28.10.2026 · Rules step" (U17 6699:48031; build note U06 #89) | CLAR 2026-11-07 #59 |
| F72 | FR-031e, 002-S1.1 | build note U06 #73 (7127:49610) | "Remove asks first when rules use the document." | Removing a document always asks first: "Keep document" / "Remove document" when no rule checks it (U23 7298:61765), and 002-S1.1's dialog naming the rules when one does | CLAR 2026-11-07 #14 |

## Build without frames (decided)
| # | req | expected surface | build from (nearest frame or KERN pattern) | decision |
|---|---|---|---|---|
| W1 | FR-013b, EC-8 | All screens | The design's colour tokens. A pair that fails AA gets the nearest passing value, recorded in the design notes with the pair, and the designer is told. | CLAR 2026-11-06 #2 |
| W2 | 001-S0.2, 001-S0.4, EC-9, 001-S3.7, 001-S6.14, US4-AS6, FR-012b, 005-ACC.4, EC-6, FR-010a, 001-S7.11, FR-002c, FR-005, EC-2, 001-S7.10 | Sign-in guard; overview error; deleted or unknown connection; tab titles; footer wrap; reflow | The guard stays as today. Overview and details errors use the design's alert with the error ID and the way back to the overview (U02 #5 pattern). Every route gets a tab title, with the product name per C1. The footer wraps, and "Save and exit" keeps its label. Below 1024 px, down to 320 px and 200 %, the layout reflows by the design's spacing (U02 #14), with nothing hidden. | CLAR 2026-11-07 #44 |
| W3 | 005-S2.1–S2.13, US2-AS5 | Conflict dialog (draft_changed, draft_published, draft_deleted) | U90's dialog (6417:31453) | CLAR 2026-11-07 #41 |
| W4 | 005-S5.1–S5.4 | Restore dialog (Escape, ×, scrim: F57) | U17's dialog (7173:52681) | CLAR 2026-11-07 #41 |
| W5 | 005-S4.8, 005-S4.10–S4.13 | Local-drafts offer: discard dialog, status and focus after discarding, other tabs, no storage | U16's offer (7362:54543) and U14's dialog | CLAR 2026-11-07 #41 |
| W6 | 005-S8.1–S8.6 | Documents step: data the catalog no longer offers | The design's warning alert with the list and "Remove it" (F22) | CLAR 2026-11-07 #41 |
| W7 | 002-S5.4–S5.6 | Publish dialog: the rules_changed conflict, "Publish without rules?" | U73 / U75's publish dialog | CLAR 2026-11-07 #41 |
| W8 | 005-S6.7, 005-S6.12, 005-S6.13, 005-S6.3 | Draft details: rule placeholders, delete errors (409, 404) | U93, and U90's dialog for the errors. 005-S6.3's interim step look applied only "until Figma has a design"; U93 is that design, so no step line is shown (FR-025e). | CLAR 2026-11-07 #41 (#7 for the step line) |
| W9 | 003-S7.1, 004-S7.2 | Edit flow: checks when it opens; "Try again, or save without testing." | U98–U99; the test step's failure state (U74) | CLAR 2026-11-07 #41 |
| W10 | 006-S1.8, 006-S3.1–S3.3, 001-S5.7, 001-S5.10, 001-S5.11 | Step 1's too-long description; the description meta on the details and draft details; wizard loading and load errors; the API's 400 message | U19 #17's field error; the breadcrumb row of U80 / U91 for the meta; skeletons (U06 #95); the design's alert | CLAR 2026-11-07 #41 |
| W11 | 005-R.1, 005-R.2, 005-S0.6, 005-S0.10, 005-S0.11, 005-S1.6, 005-S1.9, 005-S1.10, 001-S4.3, 001-S4.5, 005-S4.11, 005-S3.9 | Flow key in the URL; no badge before the first save; the move to Documents for dropped data; checks rerun; a failure keeps the work; 401; alert lifetime; first-connection validation and reopening; a draft counts as a connection on the homepage | Behaviour only | CLAR 2026-11-07 #41 (#9 for 005-S3.9) |
| W12 | 002-S2.20, 002-S2.21, 002-S2.24, 002-S2.36, 002-S3.31, 002-S4.9, 002-S4.18, 002-S4.27, 002-S4.28, 002-S4.30, 004-S2.5 | Rules step: reserved "Rule NN" names; names an undo could bring back; focus after a refused attempt; Standard's delete-group dialog naming variants; letter case in the statement; the switched top-level AND/OR and its badge; propagation; an inherited group dissolving in a variant; "Save changes?" leaving no rule | The design's banner, toast and outline patterns (U35, U44–U47) | CLAR 2026-11-07 #42 (#23 for 002-S4.18) |
| W13 | 003-S2.5, 003-S2.17, 003-S2.19–S2.21, 003-S4.4, 003-ACC.5, 003-ACC.6, 003-CP.3, 003-CP.6, 003-CP.15, 003-CP.17, 003-CP.18, FR-022b | Findings: hidden kind text, a notice without links, update in place, the status region, the tab's accessible name, reflow, the undrawn texts | U44–U46's banner, notes and outlines; texts per C2 and C4 | CLAR 2026-11-07 #42 |
| W14 | 004-S8.5, 004-S8.5.8, 004-S8.5.13, 004-S8.6.5, 004-S8.7.3, 004-S8.7.4, 004-ACC.2, 004-ACC.3 | Test step: a later flow's loading, clearing fields, class dates coming back, group members, the "all" dialog, the name kept, arrow keys, focus | U65–U74 | CLAR 2026-11-07 #42 |
| W15 | 007-S4.5, 007-S5.1–S5.8, US3-AS5 | Deep links into the rules step: "This link points to a variant that no longer exists." / "This link points to a rule or group that no longer exists." with "Dismiss"; focus; history; the toast announcement | The design's warning alert (F22) and toast | CLAR 2026-11-07 #42 |
| W16 | US5-AS1–US5-AS4, 007-R.1–R.3, 007-S1.1–S1.12, 007-S2.2–S2.15, 007-S3.1–S3.26, FR-019b | Consent, account and approval pages | The design's card, radio group (AccessLevelChoice), list rows with a ⋯ menu (as the rule menu), dialogs, the copyable field with "✓ Copied", alerts. 007's wording, with the product name per C1, the noun per C2 and findings per C4. 007-S3.25's failure follows CLAR #17. | CLAR 2026-11-07 #43 |
| W17 | FR-040b, 002-S4.13 | Copy-to-variant popover: choosing Standard covers its based variants, shown as included and not choosable | U41's popover (6344:53928) | CLAR 2026-11-07 #28 |
| W18 | 002-S4.24, FR-023b | "Edit variant" dialog: the duplicate-name error next to the field | U52's error state (6197:12011) | CLAR 2026-11-07 #21, #5 |
| W19 | FR-039a–FR-039e, 002-S3.2, 002-S3.8, 002-S3.10, 002-S3.19, 002-S3.22, 002-S3.33, 002-S3.37, 002-S3.38 | Rule editor: pickers disabled until the previous one is chosen, inline flags, counting and missing notes next to every date condition, "Choose part" after "Licence classes", the placeholder "Message for citizens: Suggested once you choose a check. You can edit it.", class options "B Cars up to 3.5 t" | U30 #42, #46; U31 #20; U32 #19; U33 #15; U35 #32; U48 #11, #15, #24; U49 #9; U51 #31; U53 #30, #31, #35 | CLAR 2026-11-07 #27 |
| W20 | FR-033a, FR-033b, FR-033d, 005-S0.4, 005-S1.4 | Wizard footer while saving; the failed-save toast for a server error, with its error ID | U51's toast (6197:11098); the footer button | CLAR 2026-11-07 #17, #55 |
| W21 | FR-034b, FR-034c, FR-052b, 002-S3.10 | Disabled buttons' explanations, opening on hover and on focus: "Save the rule first" / "Finish grouping first" on "Test rules" and on the edit flow's "Save" on the rules step (drawn enabled only, U98, U99); "Save rule"; the copy buttons while deactivated | The design's tooltip (the variant ⓘ, U37 6151:33820) on the drawn disabled buttons (U29 #18, U30 #46, U89 #13, #19) | CLAR 2026-11-07 #18, #47, #59 |
| W22 | FR-036h, 002-S2.11 | A group or sub-group menu while the group has a message: "Remove message" next to "Add message" | U58's group menu (6522:33026) and U35's message card (6324:39410, 6324:39411) | CLAR 2026-11-07 #54 |

## Copy from outside the frontend (decided)
| # | req | source | Figma shows | current text | decision (CLAR …) |
|---|---|---|---|---|---|
| C1 | FR-019a–FR-019c, EC-4, US5-AS4, 001-S0.6, 007-S1.2, 007-S2.5 | Frontend; MCP guidance (`mcp/plugin/skills`); backend and MCP server texts naming the product; README and docs | "Konnekt" (e.g. "Welcome to Konnekt", "… Konnekt checks each rule …") | the product's earlier name | CLAR 2026-11-07 #1 |
| C2 | FR-020a–FR-020c | Frontend; `rules/src/checks/findingMessages.ts`; the rules package's test-step texts; the MCP guidance that repeats findings | "citizen(s)", "Message for citizens:", "sample citizen", "Creating 3 sample citizens…" | "applicant(s)", "Error message applicants read", "sample applicant" | CLAR 2026-11-07 #2 |
| C3 | FR-021a–FR-021c, 002-S2.4, 002-S2.27, 002-S2.29, 002-S3.9 | The rules package (statements, proposed messages); MCP outputs that quote statements | "Personal ID · Date of birth (Age) is at least 21 years old"; "Driving licence · Licence class B – Issue date …"; "must be met"; the COPY-BRIEF messages | "Personal ID – Date of birth (Age) is at least 21 years old"; "must be true" | CLAR 2026-11-07 #3 |
| C4 | FR-022a–FR-022c, 003-CP.1–CP.18, 004-S8.2.3, 007-S3.8 | `rules/src/checks/findingMessages.ts`; MCP guidance | "Rule 01 and Rule 02 contradict each other, so no citizen can meet the rules of Standard."; "2 rules contradict each other, and 1 rule is a duplicate" | "<items> can't be met together."; counts joined by " · " | CLAR 2026-11-07 #4 |
| C5 | FR-023a–FR-023f, 001-S1.2, 002-S2.18, 002-S2.19, 002-S2.22, 002-S3.16, 002-S4.24 | The backend's auth and rules services; `rules/src/validation.ts` (word for word); MCP server | "Username or password is wrong. Check both and try again."; "There's already a rule called "Rule 01" in Ambulance."; "There's already a variant called "Ambulance"."; "Rule 02 in Standard checks data that's no longer requested. …"; "Enter a whole number greater than 0." | "Invalid username or password"; "Another rule in Ambulance is already called Rule 01."; "Another variant is already called Ambulance." | CLAR 2026-11-07 #5 |
| C6 | FR-024a–FR-024e, 004-S8.1.1, 004-S8.4.4, 004-S8.4.6, 004-S8.6.2 | The rules package's persona formatting and its tests | "08.07.2007"; "Valid until 19.08.2040"; "B since 20.08.2025"; "B, BE since 02.05.2010" (one row per issue date); "Result: doesn't meet 2 rules" / "Result: doesn't meet 1 rule"; ~~"Tested as if shared today, 01.11.2026."~~ "Tested as if shared today, 17.11.2026" (V5 `7599:61800`: amended 2026-11-19 by bug test-results-v5, no full stop, in the result card's head under the heading, not above the variant tabs) | "08.07.2007 (age 19)"; a bare expiry date; "B, BE" plus one row per class date; "Result: doesn't meet 2 rules" / "… 1 rule and 1 group"; "1 Nov 2026" | CLAR 2026-11-07 #6, #46; CLAR 2026-11-19 #1 |
| C7 | FR-023g, FR-023h, 005-S1.2, 005-S1.3 | The backend's validation of the connection and draft name (the 400 message); the frontend's step-1 check; the MCP server and its guidance where they pass the message on to agents that create drafts; docs | "Enter a name for the connection." (U19 6699:45379, 6699:45398) | "Enter a name." (the persona name's "Enter a name." in Edit data and "Enter a name for the variant." are unaffected) | CLAR 2026-11-07 #58 |

## Clarify questions
None open. The previous report's Q1 asked about "Group with other rules" on a rule whose only neighbour in its group is a sub-group (U34 #26). CLAR 2026-11-07 #61 answered it: the entry needs another rule directly in that group, so U34 #26 is a Figma error, and it is part of F30.

## Coverage
Shorthand:
- **wizard frames** = U17–U79, U98–U100
- **rules frames** = U17, U18, U29–U64, U98–U100
- **test frames** = U63, U65–U79, U99
- **details frames** = U58, U63, U80–U99
- **overview frames** = U04, U11–U18, U90
- **every frame** = U10–U100

Rows that the merge read as covered (a unit flagged them, but an adopted requirement or decision already holds them):
- Stale rows that still cite a superseded requirement: U28 #14, #15 (FR-031d, FR-051k); U98 #20, #27 (FR-031a, FR-031b); U63 #5 (FR-025a); U05 #29 (FR-025c); U99 #32c (FR-045c); U93 #9, #13 (FR-046c, FR-046g, FR-046h); U76 #17, U77 #24, U79 #27 ("Valid until", FR-024b); U71 #11 (the Test tab tooltip's wording is C4's).
- FR-051f, the group subtitle: U35 #16, U36 #24, U38 #18, U40 #20, U42 #25, U43 #19, U44 #31, U46 #25, U51 #16, U55 #18, U56 #19, U57 #14, U58 #14, U64 #28.
- FR-051j, "Discard rule": U06 #75, U30 #21, U31 #28, U33 #16, U35 #37, U48 #18, U50 #28.
- FR-051k: U04 #31, U28 #15, U98 #23. FR-051l and FR-051m: U43 #25, U47 #12, U58 #25, #27. FR-051b: U13 #6, U14 #5, U16 #20.
- FR-031a, FR-031d and FR-031e: U23 #12, #20.
- FR-036c and FR-036i where the design matches (a unit's PARTIAL on these rows is F29's missing entries):
  - top-level rules: U36 #15, U39 #27c, U41 #22, U56 #38, U64 #2;
  - a top-level group without a sub-group: U57 #22;
  - rules inside a top-level group that holds another rule (CLAR #60, #61): U36 #28, U55 #24.
    - The remap maps U55 #24 as CONFLICT ? [80%], reading Group 01 as Rule 03 plus Sub-group 01, as in frame 10.1.
    - Frame 10.2's tree (6522:32038) shows Group 01 (6522:32058) holding two rule rows (6522:32061, 6522:32064) and no sub-group.
    - #60 and #61 list U55 #24 as built as drawn.
- FR-036e: U39 #27e and U58 #22 (CLAR #53 cites U39 #27e).
- FR-041a and FR-041b: the design's severity icons per CLAR #29 (a), which cites build note U06 #7. Rows: U07 #19, U44 #9, #13, U45 #25, #31, U46 #8, #22, U50 #22, U85 #21. FR-041b's grey ⓘ "No findings." (undrawn) was reversed 2026-11-18 by bug v5-ui-fixes (CLAR 2026-11-18 #2): a variant tab without a description and without findings shows no icon.
- FR-046c and FR-046g: U03 #25, U07 #17. FR-038a, read-only: U83 #31.
- CLAR #38: U06 #17, U60 #34. FR-023c's removed-document message: U50 #12. FR-029b: U16 #25.
- FR-052h ("Start with"): U37 #23, U52 #27, U62 #25. CLAR #46's drawn labels: U66 #14, U67 #14, U70 #18, U72 #22 (U72's value is F63).
- The "C item" rows for "Konnekt", "citizen", "·" statements, "Message for citizens:", findings, server wording and test formats are C1–C7.
- Read as F13, not as covered: U88 #28. Read as F30 (CLAR #61): U34 #26.

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
| FR-012a | COVERED | U03, U10, U13, U93, rules and details frames |
| FR-012b | SPEC-ONLY → W2 | – |
| FR-013a | COVERED | U07, U52 |
| FR-013b | SPEC-ONLY → W1 | – |
| FR-004, FR-007, FR-014a–FR-018, FR-019c, FR-020c, FR-021c, FR-022c, FR-023d, FR-023h, FR-027d, FR-037b, FR-047a, FR-047d | UI = N (not mapped to frames) | – |
| FR-019a | COVERED → C1 | every frame |
| FR-019b | SPEC-ONLY → W16, C1 | – |
| FR-020a, FR-020b | COVERED → C2 | U14, U15, U18, U20, U26, rules and test frames, U44–U46, U63, U77 |
| FR-021a, FR-021b | COVERED → C3 | U03, U09, rules and details frames |
| FR-022a | COVERED, PARTIAL → F47, C4 | U44–U46, U63, U71, U85; P U77 |
| FR-022b | SPEC-ONLY → W13, C4 | – |
| FR-023a | COVERED → C5 | U10 |
| FR-023b, FR-023c, FR-023e, FR-023f | COVERED, PARTIAL → F58, F28, C5 | U49, U50, U52, U60 |
| FR-023g | COVERED, CONFLICT → F18, C7 | U02, U04, U19; X U04 |
| FR-024a, FR-024c | COVERED, CONFLICT → F63, C6 | U65–U74, U99; X U63, U75–U79 |
| FR-024b, FR-024e | COVERED → C6; FR-024e amended 2026-11-19 by bug test-results-v5 (CLAR 2026-11-19 #1: under the result heading, no full stop) | U02, test frames; V5 `7599:61800` |
| FR-024d | COVERED, PARTIAL, CONFLICT → F63, C6 | U65–U73, U99; P U75–U79; X U63 |
| FR-025a, FR-025b, FR-025d, FR-025e | COVERED | U02, U06, U63, wizard and details frames |
| FR-025c | COVERED, PARTIAL → F25 | U05, U06, U17, U26; P U02, U19 |
| FR-026a | COVERED, CONFLICT → F19, F64 | U17, wizard frames; X U03, U05, U06, U99 |
| FR-026b–FR-026d, FR-026g, FR-026h, FR-026k | COVERED | U05, U06, U07, U16, U17, U18, U19 |
| FR-026e | COVERED, PARTIAL (cosmetic 28) | U05, U06 |
| FR-026f | COVERED, CONFLICT → F19 | U50; X U06 |
| FR-026i, FR-026j | COVERED, PARTIAL → F20 | U05, U17 |
| FR-026l–FR-026n | COVERED, CONFLICT → F64 | U98–U100; X U05, U06 |
| FR-027a–FR-027c, FR-027e | COVERED, CONFLICT → F15 | U02, U04, U06, U11, U18 |
| FR-028a, FR-028b | COVERED, CONFLICT → F14 | overview frames |
| FR-029a, FR-029b, FR-029e | COVERED | overview frames, U16 |
| FR-029c | COVERED, PARTIAL → F55 | U14, U90 |
| FR-029d | PARTIAL (visual as drawn; the h2 and a one-item list stay for screen readers, CLAR #12 (d)) | U07, U16 |
| FR-030a, FR-030b | COVERED, PARTIAL → F17 | signed-in frames; P U03, U10, U13 |
| FR-031a–FR-031d, FR-031f, FR-031h, FR-031i | COVERED, PARTIAL → F3, F23 | U04, U06, U20–U28, U98 |
| FR-031e | COVERED, PARTIAL → F72 | U23, U24; P U06 |
| FR-031g, FR-031k | COVERED, PARTIAL → F67 | U25; P U04 |
| FR-031j | COVERED, CONFLICT → F23, F24 | U08, U20–U28, U98 |
| FR-032a–FR-032c | COVERED | U04, U12, U18, U19, U52, U98 |
| FR-032d | PARTIAL → F60 | U18, U19, U98 |
| FR-033a, FR-033b | COVERED, PARTIAL → W20, F67 | U05, U51; P U02 |
| FR-033c | PARTIAL → F22 | U02 |
| FR-033d | PARTIAL → F21, W20 | U17 |
| FR-034a, FR-034b | COVERED, PARTIAL → F65, W21 | rules frames, U06; P U01 |
| FR-034c | COVERED, PARTIAL → F65, W21 | U100; P U01, U98, U99 |
| FR-035a | COVERED, PARTIAL → F27 | U02, U07, U18, rules frames; P U37, U46 |
| FR-035b, FR-035c | COVERED, PARTIAL → F27 | U18, U37, U38, U59 |
| FR-035d | COVERED → F27 (Standard's (i) only with a description) | test frames |
| FR-036a, FR-036b | PARTIAL → F29 | rules frames |
| FR-036c | COVERED, PARTIAL, CONFLICT → F29, F30 | U36, U39, U41, U55, U56, U57, U64; P U09, U54; X U34, U39, U55, U58 |
| FR-036d | COVERED, CONFLICT → F30 | U36, U54; X U39, U55, U56, U58 |
| FR-036e, FR-036f | COVERED, CONFLICT → F68 | U39, U50, U54, U56–U58, U61; X U57 |
| FR-036g | PARTIAL → F69 | U54–U57 |
| FR-036h | COVERED, PARTIAL → W22 | U57, U58; P U35, U54 |
| FR-036i | COVERED, CONFLICT → F30 | U36, U55, U56, U64; X U34 |
| FR-037a | PARTIAL → F32 | U35 |
| FR-037c | CONFLICT → F31 | U35, U47, U51 |
| FR-037d | COVERED, CONFLICT → F70 | U47; X U34 |
| FR-038a–FR-038c | COVERED | rules frames, U83 |
| FR-038d, FR-038e | COVERED, CONFLICT → F33 | U36, U45; X U40, U62, U64 |
| FR-039a–FR-039e | PARTIAL → W19 | U30–U33, U35, U48, U49, U51, U53 |
| FR-039f | COVERED | U32, U48 |
| FR-040a | COVERED | U41 |
| FR-040b | PARTIAL → W17 | U41, U42 |
| FR-040c | CONFLICT, PARTIAL → F36 | U43, U47, U58 |
| FR-040d | PARTIAL, CONFLICT → F37 | U06; X U05 |
| FR-041a, FR-041b | COVERED (severity icons, CLAR #29 (a)); FR-041b reversed 2026-11-18 by bug v5-ui-fixes (CLAR 2026-11-18 #2: no "No findings." ⓘ) | U06, U07, U44–U46, U50, U85 |
| FR-041c | COVERED, PARTIAL, CONFLICT → F38 | U68, U71; X U03, U06 |
| FR-041d | COVERED, PARTIAL → F39 | U06; P U44–U46 |
| FR-041e | COVERED | U06, U65–U74 |
| FR-042a–FR-042c | COVERED | U06, U66, U67 |
| FR-042d | PARTIAL → F40 | U66, U67 |
| FR-043a | PARTIAL → F42; reversed 2026-11-19 by bug test-results-v5 (CLAR 2026-11-19 #2, #3: built as the V5 rows) | test frames; V5 `7599:55726` |
| FR-043b | COVERED, PARTIAL, CONFLICT → F63 | U65–U71, U73, U99; P U72; X U63, U75–U79 |
| FR-043c | COVERED, CONFLICT → F43 | U06; X U01, U65–U73 |
| FR-043d | COVERED, CONFLICT → F41 | U06; X U65, U70 |
| FR-044a–FR-044d | COVERED | U06, U63, U73, U75–U79 |
| FR-044e | PARTIAL → F46 | U79 |
| FR-045a | COVERED, PARTIAL → F48 | U05, U06, U15; P U87 |
| FR-045b | COVERED, PARTIAL → F5 | U98–U100 |
| FR-045c, FR-045e | COVERED | U05, U06, U98–U100 |
| FR-045d | COVERED, PARTIAL → F64 | U98, U100; P U06 |
| FR-045f | PARTIAL → F49 | U05, U15, U87, U98 |
| FR-046a | COVERED, PARTIAL → W10 | details frames; P U63 |
| FR-046b, FR-046e, FR-046g–FR-046i | COVERED | details frames |
| FR-046c | COVERED, PARTIAL → F50 | details frames; P U85, U92, U95 |
| FR-046d | COVERED | U81 (text drawn); the ⓘ without drawn text in U80, U85, U87, U88, U90, U99 |
| FR-046f | PARTIAL → F51 | details frames |
| FR-047b, FR-047c | COVERED | U06, U85 |
| FR-048a | COVERED | U06, U81 |
| FR-048b | COVERED, PARTIAL, CONFLICT → F52, F71 | overview and details frames |
| FR-048c, FR-048d | COVERED, PARTIAL → F66 | U89; P U07, U87, U88, U90, U94–U97 |
| FR-049a, FR-049b, FR-049e | COVERED | U02, U07, U93 |
| FR-049c | COVERED, PARTIAL → F56 | U07; P U93 |
| FR-049d | PARTIAL → F57 | U06 |
| FR-050a, FR-050b | COVERED | U03, U05, U06, U78 |
| FR-050c | COVERED, PARTIAL → F62 | U03, U05; P U06 |
| FR-051a, FR-051q | COVERED, PARTIAL → F61 | overview frames |
| FR-051b–FR-051g, FR-051j–FR-051p | COVERED | U05, U10, U17, U34, U39, U41, U47, U58, U61, U78, U89, U99 and the rows the merge read as covered |
| FR-051h | COVERED, PARTIAL → F59 | U31, U53; P U09 |
| FR-051i | COVERED, PARTIAL → F60 | U04, U13, U18, U19, U80, U86, U98 |
| FR-052a, FR-052c, FR-052e–FR-052i | COVERED | U06, U08, U14, U21, U22, U26, U37, U52, U62, U73, U90–U97, U100 |
| FR-052b | COVERED → W21 (the explanation isn't drawn) | U06, U29, U33, U48, U49; P U30 |
| FR-052d | COVERED, PARTIAL, CONFLICT → F71 | U06, U14, U17; P U13–U16; X U11, U12, U18 |
| US1-AS1 | COVERED, CONFLICT → F16 | U02, U03, U05, U10 |
| US1-AS2 | COVERED | U02, U10 |
| US1-AS3 | COVERED, CONFLICT → F14 | U02, U04, U05, U11–U16 |
| US1-AS4 | COVERED, PARTIAL | U04, U05, U16; P U07 |
| US1-AS5 | COVERED, CONFLICT → F15 | U10, U11, U18 |
| US2-AS1 | COVERED, PARTIAL → F25 | wizard frames; P U02, U19 |
| US2-AS2, US2-AS3, US2-AS4 | COVERED | U02, U04, U05, U13, U17, U18, U20–U28 |
| US2-AS5 | SPEC-ONLY → W3 | – |
| US3-AS1 | COVERED, PARTIAL → F29, F69 | rules frames |
| US3-AS2 | COVERED, PARTIAL → W19 | U49; P U48 |
| US3-AS3, US3-AS4 | COVERED | U42, U43, U57, U65, U68–U72, U74 |
| US3-AS5 | SPEC-ONLY → W15 | – |
| US4-AS1 | COVERED | U06, U73, U75–U81, U83, U85, U99 |
| US4-AS2 | COVERED | U02, U05, U07, details frames |
| US4-AS3 | COVERED → F13 | U04, U06, U07, U14, U15, U60, U88–U90 |
| US4-AS4 | COVERED, PARTIAL → F56 | U05, U07, U93 |
| US4-AS5 | COVERED, PARTIAL → F48, F49, F64 | U05, U15, U87, U98–U100 |
| US4-AS6 | SPEC-ONLY → W2 | – |
| US5-AS1, US5-AS2, US5-AS3 | SPEC-ONLY → W16 | – |
| US5-AS4 | COVERED → C1 | every frame with the product name |
| EC-1, EC-3, EC-5, EC-7 | COVERED | U01, U03, U07, U09, U10, U14, U19, U23, U34 |
| EC-10 | COVERED, CONFLICT → F19, F64 | U05, U06, U17, U98–U100 |
| EC-2, EC-9 | SPEC-ONLY → W2 | – |
| EC-4 | COVERED → C1, C2 | every frame |
| EC-6 | PARTIAL → W2 | U02, U23 |
| EC-8 | SPEC-ONLY → W1 | – |
| 001-S0.1, 001-S0.3 | COVERED | U03, U06, U10 |
| 001-S0.2, 001-S0.4 | SPEC-ONLY → W2 | – |
| 001-S0.5 | COVERED (superseded by FR-030) | signed-in frames |
| 001-S0.6 | COVERED, CONFLICT → F19, F64, C1 | every frame; X U03, U05 |
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
| 001-S6.1–S6.3, 001-S6.5 | superseded (FR-046, FR-025; CLAR #49 drops 001-S6.5's hint) | details frames |
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
| 002-S1.5, 002-S1.8, 002-S1.9 | superseded by FR-031 (F3 for the catalogue) | U04, U20–U28, U98 |
| 002-S2.1 | COVERED | rules frames |
| 002-S2.2, 002-S2.3 | COVERED, CONFLICT → F26 | rules frames; X U30, U33, U49–U51, U53 |
| 002-S2.4–S2.7 | COVERED → C2, C3 | rules frames |
| 002-S2.8, 002-S2.9 | COVERED, CONFLICT → F33 | rules frames; X U40, U62, U64 |
| 002-S2.10 | COVERED, CONFLICT → F30, F33 | U03, U36, U39, U55, U56; X U34, U39, U40, U55, U56, U58 |
| 002-S2.11 | COVERED, PARTIAL (copy) → W22 | U51, U58; P U54, U55, U56 |
| 002-S2.12 | COVERED, PARTIAL (copy) → F7 | U51, U55, U57 |
| 002-S2.13, 002-S2.14 | COVERED, CONFLICT → F31 | X U35, U47, U51 |
| 002-S2.15 | COVERED → F9 | rules frames |
| 002-S2.16 | COVERED, PARTIAL → F29, F68 | rules frames |
| 002-S2.17 | COVERED, PARTIAL → F69 | U29–U35, U48, U49, U51, U53; P U55 |
| 002-S2.18, 002-S2.19, 002-S2.22 | COVERED, PARTIAL → F58, F69, C5 | U49, U50, U55, U56 |
| 002-S2.20, 002-S2.21, 002-S2.24, 002-S2.36 | SPEC-ONLY → W12 | – |
| 002-S2.23, 002-S2.27 | superseded (FR-034, FR-021 → C3) | – |
| 002-S2.25, 002-S2.26, 002-S2.28–S2.35 | COVERED, PARTIAL (copy) | U05, U06, U34, U36, U40, U47, U50, U55, U57, U64, U99 |
| 002-S3.1, 002-S3.3–S3.7, 002-S3.9, 002-S3.11, 002-S3.20, 002-S3.21, 002-S3.23–S3.29, 002-S3.32, 002-S3.34–S3.36, 002-S3.39–S3.41 | COVERED, PARTIAL (copy) | U01, U03, U09, rules frames |
| 002-S3.2, 002-S3.8, 002-S3.10, 002-S3.19, 002-S3.22, 002-S3.33, 002-S3.37, 002-S3.38 | COVERED, PARTIAL → W19, W21 (002-S3.10) | U09, rules frames |
| 002-S3.12–S3.18, 002-S3.30 | COVERED, PARTIAL, CONFLICT → F34 | U03, U09, U29, U31, U46, U49, U50, U53 |
| 002-S3.26 | UI = N | – |
| 002-S3.31 | SPEC-ONLY → W12 | – |
| 002-S4.1–S4.3, 002-S4.5–S4.8, 002-S4.11, 002-S4.12, 002-S4.14, 002-S4.20, 002-S4.21, 002-S4.23, 002-S4.25, 002-S4.26 | COVERED, PARTIAL (copy) | rules frames |
| 002-S4.4, 002-S4.22, 002-S4.24 | COVERED, CONFLICT → F28, W18 | U18, U37, U52; X U59, U60, U62 |
| 002-S4.9, 002-S4.27, 002-S4.28, 002-S4.30 | SPEC-ONLY → W12 | – |
| 002-S4.10 | COVERED, PARTIAL (copy) → F29, F68 | U47, U54, U58 |
| 002-S4.13 | PARTIAL → W17 | U41 |
| 002-S4.15–S4.17 | COVERED, CONFLICT → F70 | U47; X U34 |
| 002-S4.18 | CONFLICT → F31, W12 | U47 |
| 002-S4.19 | COVERED, CONFLICT → F36 | U39, U57, U58; X U47 |
| 002-S4.29 | COVERED, CONFLICT → F37 | rules frames; X U05 |
| 002-S4.31 | COVERED, CONFLICT → F33 | U43; X U40, U62 |
| 002-S5.1–S5.3, 002-S5.10 | superseded or amended (FR-044, FR-045) | U63, U73, U75–U79 |
| 002-S5.4–S5.6 | SPEC-ONLY → W7 | – |
| 002-S5.7, 002-S5.8 | COVERED, CONFLICT → F1 | many |
| 002-S5.9 | COVERED | U75 |
| 002-S6.1, 002-S6.11 | COVERED, PARTIAL → F51 | details frames |
| 002-S6.2, 002-S6.5, 002-S6.8, 002-S6.13 | COVERED, PARTIAL (sample) | U03, U07, U80, U83, U84 |
| 002-S6.3, 002-S6.4, 002-S6.6, 002-S6.10 | superseded or amended by FR-046 | details frames |
| 002-S6.7 | COVERED, CONFLICT → F1, F66 | details frames |
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
| 004-S8.1.1 | COVERED → C6; amended 2026-11-19 by bug test-results-v5 (CLAR 2026-11-19 #1: in the result card's head) | U02, test frames; V5 `7599:61800` |
| 004-S8.1.2, 004-S8.3.4, 004-S8.3.5, 004-S8.4.1, 004-S8.7.1 | COVERED, PARTIAL → F45; 004-S8.1.2 amended 2026-11-19 by bug test-results-v5 (CLAR 2026-11-19 #1: no date on a regenerating persona's skeleton) | test frames |
| 004-S8.2.1–S8.2.5 | COVERED, CONFLICT → F45, F38 | test frames; X U03, U05 |
| 004-S8.2.6 | holds per FR-035 (CLAR #57) → F27 | U30, U77, U78 |
| 004-S8.3.1–S8.3.3 | COVERED, CONFLICT → F44 | U65–U72; X U63, U75–U79 |
| 004-S8.4.2, 004-S8.4.3 | COVERED, PARTIAL, CONFLICT → F63 | test frames; P U72; X U63, U75–U79 |
| 004-S8.4.4, 004-S8.4.6 | superseded by FR-024 → C6, F63 | test frames |
| 004-S8.4.5, 004-S8.4.7–S8.4.10 | COVERED | test frames |
| 004-S8.4.11 | COVERED → F43 | U03, U06 |
| 004-S8.5.1, 004-S8.5.2, 004-S8.5.9, 004-S8.5.10, 004-S8.10.3, 004-ACC.4 | superseded by FR-042 | – |
| 004-S8.5.3–S8.5.7 | COVERED, PARTIAL → F40 | U06, U66, U67 |
| 004-S8.5.11, 004-S8.5.12, 004-S8.5.14 | COVERED, PARTIAL (copy) | U09, U67 |
| 004-S8.6.1 | superseded by FR-041e (CLAR #50); no frame draws the line | – |
| 004-S8.6.2 | amended by FR-024 → F63, C6 | test frames |
| 004-S8.6.3, 004-S8.6.4, 004-S8.6.6, 004-ACC.1 | COVERED, PARTIAL → F42; amended 2026-11-19 by bug test-results-v5 (CLAR 2026-11-19 #2, #3: no columns, hidden status but "Couldn't be checked", every row's message) | test frames; V5 `7599:55726` |
| 004-S8.6.7 | COVERED, CONFLICT → F41; its list heading "Rules Mia meets" removed 2026-11-19 by bug test-results-v5 (CLAR 2026-11-19 #3) | U65; X U06, U65, U70 |
| 004-S8.6.8, 004-S8.7.2, 004-S8.8.1–S8.8.6, 004-S8.9.1, 004-S8.9.2, 004-S8.9.4, 004-S8.10.1, 004-S8.10.2, 004-ACC.5, 004-ACC.6 | COVERED | U06, U67, U68, U70, U74 |
| 004-S8.9.3 | CONFLICT → F45 | U74 |
| 005-R.1, 005-R.2, 005-S0.6, 005-S0.10, 005-S0.11, 005-S1.6, 005-S1.9, 005-S1.10, 005-S3.9 | SPEC-ONLY → W11 | – |
| 005-S0.1–S0.3, 005-S0.5, 005-S0.8, 005-S0.9, 005-S1.1, 005-S1.5, 005-S3.1, 005-S3.2, 005-S3.4, 005-S3.5, 005-S4.4, 005-S4.5, 005-S4.7, 005-S4.9, 005-S6.5, 005-S6.6, 005-S7.1, 005-S7.6, 005-S8.7, 005-ACC.1, 005-CP.1 | COVERED, PARTIAL (copy, styling) | overview, wizard and dialog frames |
| 005-S0.4, 005-S1.4 | PARTIAL → F21, W20 | U06, U17 |
| 005-S0.7 | COVERED, CONFLICT → F5, F64 | U98, U100; X U03, U05, U60, U99 |
| 005-S1.2 | COVERED, CONFLICT → F18, C7 | U02, U19, U98; X U04 |
| 005-S1.3 | COVERED → C7 | U04, U19 |
| 005-S1.7, 005-S1.8 | superseded by FR-033 (CLAR #55 keeps 005-S1.8's sentence and "Try again") | – |
| 005-S2.1–S2.13 | SPEC-ONLY → W3 | – |
| 005-S3.3 | COVERED, amended (FR-048, FR-052) → F52, F71 | overview frames |
| 005-S3.6, 005-S3.7, 005-S4.1–S4.3, 005-S4.6, 005-S6.2, 005-S6.4, 005-S6.8, 005-S6.10, 005-S6.11, 005-S6.14, 005-S7.2–S7.5 | superseded or amended (FR-025, FR-026, FR-029, FR-049) | overview frames, U16, U93 |
| 005-S3.8 | PARTIAL (copy, cosmetic 5) | U06, U17 |
| 005-S4.8, 005-S4.10–S4.13 | SPEC-ONLY → W5 | – |
| 005-S5.1–S5.4 | SPEC-ONLY → W4 | – |
| 005-S5.5 | PARTIAL → F57 | U06 |
| 005-S6.1 | superseded by FR-049 (CLAR #51), COVERED | U07, U93 |
| 005-S6.3, 005-S6.7, 005-S6.12, 005-S6.13 | SPEC-ONLY → W8 | – |
| 005-S6.9 | COVERED, PARTIAL → F56 | U07; P U93 |
| 005-S8.1–S8.4 | PARTIAL → W6 | U02 |
| 005-S8.5, 005-S8.6 | SPEC-ONLY → W6 | – |
| 005-ACC.2 | COVERED (amended by FR-052a) | dialog frames |
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
