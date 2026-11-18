# Figma ↔ spec audit — 2026-11-10

## Summary
Units audited 49/101 (OUT 52, UNCERTAIN 0, FAILED 0). Figma calls: 0 in this remap, because the 43 remapped units reused their stored inventories (units.md lists no new calls). Across the whole audit: 115 (mapper 1, units 114, as the previous report counted).

This run was a remap. `requirements.md` was rebuilt against the updated spec: 411 items, 21 added and 2 changed (`changes.md`). 43 of the 49 DONE units were remapped. U15, U63, U75, U76, U78 and U100 are unchanged. An item found in several units counts once: "Download PDF", for example, appears in 19 units and is the single item F12.

The spec has no "Figma decides wording" governance. `RULE wording` therefore sends copy-only drift to "Figma must change" (F3, F25, F26, F27), and there is no "Copy from outside the frontend" section. Clarifications 2026-11-10 #1 to #37 are all design decisions except #2. #27 to #37 answer the previous report's Q1 to Q11:
- Q1 → F28 (with F24)
- Q2 → F29
- Q3 → F30
- Q4 → F31
- Q5 → F32 to F37, with F11
- Q6 → F38
- Q7 → F39
- Q8 → F40
- Q9 → F41
- Q10 → F42
- Q11 → F43

The remap found no new open item. F1 to F27 and W1 to W18 keep their numbers from the previous report. F11 and F24 now cite a decision (CLAR #31, #27) instead of `RULE wording`. F28 to F43 are new.

| category | count |
|---|---|
| Conflicts (open) | 0 |
| Spec-only (open) | 0 |
| Figma-only — behavioural (open) | 0 |
| Partial matches (open) | 0 |
| Figma-only — cosmetic (FYI) | 13 |
| Figma must change (decided) | 43 |
| Build without frames (decided) | 18 |
| Clarify questions | 0 |

Top 5 issues (open items only): none. Every item is settled by a Clarification of 2026-11-10 or by a standing rule.

## Conflicts
None open. Every conflict is settled under "Figma must change" (F1 to F43).

| # | req | Figma (unit, node-id) | conflict |
|---|---|---|---|
| — | — | — | — |

## Spec-only (not in Figma)
None open. Every UI requirement that no unit covers is settled by a decision and listed under "Build without frames" (W1 to W18). Two new requirements are cited by no mapping row, but frames draw their point, so they are settled in other sections:
- FR-055h is the point of U18 1j (#39), settled as F42.
- FR-070d is the point of U05 note 23 (#9), settled as F36.

| # | req | prio | expected surface | note |
|---|---|---|---|---|
| — | — | — | — | — |

## Figma-only — behavioural
None open.

| # | item | where (units, node-ids) | suggested requirement |
|---|---|---|---|
| — | — | — | — |

Some rows are mapped FIGMA-ONLY "behavioural; baseline", meaning they restate specs 001–009 outside the nine items. These count as covered by FR-074b (CLAR 2026-11-10 #31, F32) and are not listed as items:
- U06: 1, 4, 5, 7, 8, 10, 14, 19, 20, 22, 23, 24, 26, 27, 32, 34, 37, 41, 43, 53
- U07: 10, 17, 20, 21
- U11: 1, 3, 4, 8, 13, 14, 17, 23, 24, 26, 28, 29
- U12: 15
- U16: 1
- U17: 1–4, 9, 10, 26
- U18: 10, 16, 17, 25, 26, 27
- U21: 1–6, 9, 10, 14, 16–18, 25, 26
- U22: 5, 11
- U24: 1–5, 7, 11, 13, 18
- U28: 1, 2, 4
- U63: 2–4, 6, 10, 12, 14, 21
- U76: 1–7, 9, 12–14, 20
- U87: 1, 2, 12
- U88: 1, 3, 16, 20
- U93: 18
- U94: 1, 3, 13, 24

Notes on some of these rows:
- **Summary open on arrival from View** (U07 #20, U93 #18, U94 #24, U96 #16): this is spec 008's FR-046 ("Summary open from 'View'"), kept by FR-074.
- **P15's sentences** (U88 #17, #19): part of F11.

## Partial matches
None open. These PARTIAL rows are resolved without an item of their own:
- **U03 #19**: note 14's header pill refers to note 32, which names "Scheduled · 01.12.2026" (U07 7370:55180).
- **U05 #18**: "draft View page (36)" is note 36, audited in U07 (FR-015e, FR-016a covered; PDF in F12; S2 in F31).
- **U11 #11, U12 #10, U13 #11, U14 #12, U15 #7**: the draft row "Edited 03.10.2026" reads as FR-019d's draft with no recorded step (CLAR 2026-11-10 #12, kept by #36). The stepped row is drawn in U17 6699:48024.
- **U91 #22**: arriving from View with Summary open is spec 008's FR-046, kept (FR-074). Links, Summary and Activity form one accordion everywhere (CLAR 2026-11-10 #34). The S frame draws "View links" (U91 7203:50843).
- **U65 #11, U76 #22, U77 #18, U78 #14**: plain connections that reuse the example's rules. The example's banner and line don't apply to them (W15).

| # | req | where | difference |
|---|---|---|---|
| — | — | — | — |

## Figma-only — cosmetic (FYI)
| # | item | where (units, node-ids) | note |
|---|---|---|---|
| 1 | Build-note headings, dates, cross-references and process notes; hidden "Old · …" layers | U01 6637:36637; U02 6637:36664 (update date), 6637:36667 (item 17); U06 7137:50569 (item 55); U08 7370:55194; hidden layers, e.g. U11 6699:44262, U65 7057:58725, U75 6376:25344, U80 7355:61159, U91 7355:60519, U99 7355:60477, U100 7173:52770 | Nothing to build; hidden layers are not ported (FR-070a) |
| 2 | Typography, spacing, colours, info-icon colours, dialog widths, toast position, backgrounds | U02 6637:36667 (item 16); U03 6650:38288, 6703:39311, 6703:39314; U05 6716:41042 (items 7, 8), 6716:41045 (item 13), 6720:39042 (item 25); U06 6760:48852 (item 3), 6791:46863 (item 13), 7058:63148 (item 28); U07 7370:55180, 7370:55183, 7370:55189, 7370:55192 | Ported as drawn with the Revamp tokens |
| 3 | Art and status icons | U11 6699:44509; U18 6793:47707; U81 7355:61825; U89 7355:61535; U91 7355:60521; U92 7355:60607; U93 7362:54716; U94 7355:60682, 7355:60695; U97 7355:61012, 7355:61029 | Status is also in text (FR-072a) |
| 4 | Scrims, scrollbars, temporary parts, a pressed button | U21 7290:61927; U22 7290:62450; U23 7298:61884, 7298:62321; U24 7298:62499; U28 7298:64276; U65 7114:49642; U75 6376:25535; U77 6376:26180; U88 6417:31205; U90 6417:31598 | A scrim click follows the project's dialog rule |
| 5 | Baseline copy shown as context: column headers, welcome hero, step headers, connection card, rules behind dialogs | U11 6699:44255–6699:44257, 6699:44491, 6699:44494; U14 6699:44374; U16 7362:54548, 7362:54566; U17 6701:39455, 6408:72721, 6408:72728; U18 6793:47684, 6793:47723, 7344:96393, 6793:47774, 6793:47784; U22 7290:62334, 7290:62338; U24 7298:62380; U28 7298:64163 | Unchanged (FR-074b) |
| 6 | The overview sentence "…or view an active connection to get its links." leaves out scheduled connections' links | U11 6699:44246; U12 6699:44919; U14 6699:44365 | Baseline copy, kept (FR-074b); no requirement contradicts it (FR-004b) |
| 7 | The date in the scheduled delete body is set in a monospaced face | U14 6872:45929 | Use the dialog's text face |
| 8 | Sample-data inconsistencies (not data to port) | U12 6699:44921 (20 vs 14 rows); U13 6699:44358 (Laura / lena), 6739:40596 (example-like row without "(example)"); U63 7112:48923 vs 7112:48859; U89 7173:52959; U97 7246:56955; U98 7296:52334 vs 6730:39464; U99 6890:46206 | — |
| 9 | "Create connection" stays in the footer while rows are selected | U15 6699:45258 | RULE ui-detail: built as designed |
| 10 | Select-all is hidden while no row is listed (1d) | U11 6699:44584 | RULE ui-detail: built as designed |
| 11 | The dragged row leaves the list during a drag; only the line and the copy show | U27 7298:63333, 7298:63752 | RULE ui-detail: built as designed (reduced motion: F22) |
| 12 | After the open document is removed, the first remaining one opens | U24 7298:62570, 7298:62624 | RULE ui-detail: built as designed |
| 13 | "Add document" stays put while a drag runs | U27 7298:63330; U28 7298:64170 | RULE ui-detail: built as designed. Staying pinned while the list scrolls is spec 008's layout (F32 d) |

## Figma must change (decided)
Build these as the spec says, keeping Figma's layout and styling, until the design is updated.

| # | req | Figma (unit, node-ids) | Figma shows | build instead | decision |
|---|---|---|---|---|---|
| F1 | FR-071d | U01 6637:36640 (note 1) | `<html lang="en" …>` in every page | `lang` follows the chosen language ("en" or "de", spec 009, as built). `data-kern-theme="light"` and the color-scheme meta stay | CLAR 2026-11-10 #26 |
| F2 | FR-014c, FR-043c | U02 6637:36658 (note 7) | The slim alert is "title only, one line, 64 px" | Spec 008's failure alert with its error ID: slim, but wrapping to fit the error ID; never the large two-part alert | CLAR 2026-11-10 #23 |
| F3 | FR-001a, FR-011a, US1-AS1 | U02 6637:36661 (note 8); frame names U75 6383:66097 (P1b), U76 6635:36242 (P1c) | "Becomes active" label | "Active from" | RULE wording |
| F4 | FR-076f, OUT-1 | U03 6703:39311 (note 14); U99 6890:46197 (E5a name) | A row reads "Changes not published" while an active connection is being edited | No row ever reads it. An active row stays "Active" · "Published <date>" | CLAR 2026-11-10 #3 |
| F5 | FR-076a, OUT-1 | U98 6730:39124 (E2: "Active · unpublished changes"); U99 6890:46199 (E5a), 7173:52812 (E5b); U100 7173:52748 (E7); U05 6730:40340 (note 25, item 30) | Edit-flow header "Active" + "Draft changes" | Only the status pill: "Active", or "Scheduled · <date>" as E6 draws it (U99 7114:49835) | CLAR 2026-11-10 #3 |
| F6 | FR-076b, FR-076e, OUT-1 | U05 6730:40340 (note 25, items 29, 33); U06 7127:49610 (note 30, item 30), 6791:46863 (note 28, item 18: "Later: Discard changes") | A footer with "Keep draft and exit"; the toast "Draft kept. Your changes take effect when you save them."; "Discard changes" listed as later | Footer "Back · Discard changes · <next step> · Save" (no Back on step 1, no next step on Test). No "Keep draft and exit", no "Draft kept" toast | CLAR 2026-11-10 #3 |
| F7 | FR-076c, FR-076d, OUT-1 | U99 6890:46197 (E5a); U05 6730:40340 (item 37); U06 7127:49610 (item 31, the E5a part) | Konnekt / "Your connections" while editing saves like Save and exit and keeps a draft | E5b "Save your changes?" (U99 7173:52836): "If you leave now, your changes are lost. Save them, or discard them and keep the active version.", with "Discard changes" and "Save". The scheduled version is W7 | CLAR 2026-11-10 #3 |
| F8 | FR-009f | U98 6730:39464 (E3); U05 6730:40340 (item 31) | "Citizens get the new version from the time you choose. Your links stay the same." | Spec 008's body as built: "Citizens keep using the current version until you save. Requests already in progress keep the data and rules they started with." The scheduled sentence is W6 | CLAR 2026-11-10 #1 |
| F9 | FR-009e, US1-AS11, OUT-12 | U98 6730:39464 (E3) | "Active from" radios ("Now" / "On a date") in "Save changes?" | No "Active from". "Save changes" takes effect at once | CLAR 2026-11-10 #1 |
| F10 | FR-009d, FR-009c, US1-AS11 | U87 6396:48860 (P12) | Hint "Until that date, citizens can't start a new request. Requests already started still finish." | "Until that date, citizens can't start a new request. Requests in progress are cancelled." | CLAR 2026-11-10 #1 |
| F11 | FR-074b, FR-074d, OUT-2 | U88 6417:31206 (P15) | "The connection will be deactivated and its links will stop working." / "Requests already started still finish." / "Remember to remove the wallet connection from your service." | Spec 008's body as built: "The connection will be deactivated and its links will stop working at once. Requests in progress are cancelled. Remember to remove the wallet connection from your service." The never-active sentence is W5 | CLAR 2026-11-10 #31 (l) |
| F12 | FR-076g, OUT-5 | Active: U58 6530:40742; U63 7112:48928; U80 6396:47755; U81 6809:46580; U82 6396:48196; U86 6396:48385; U87 6396:48846; U88 6417:30965; U90 6417:31518; U91 7203:50536, 7246:51508; U92 7246:52087, 7246:52713; U99 6730:39800. Scheduled: U86 6396:48655; U94 7246:52805, 7246:53935; U95 7246:54516, 7246:55144. Deactivated: U89 6417:31343; U96 7246:55236, 7246:56372; U97 7246:56956, 7246:57587. Draft: U93 7362:54813, 7362:55045. Note 36: U07 7370:55192 | "Download PDF" in the Summary card; note 36's draft-PDF sentence | No "Download PDF". The header shows "Summary", the count line and "View summary" / "Hide summary" | CLAR 2026-11-10 #4 |
| F13 | FR-076h, FR-076i, OUT-8 | U89 6417:31447 (P16 toast); U05 6720:39042 (note 24, items 21, 24) | "Connection deactivated." with "Undo"; "Everything destructive gets Undo …: deleted, removed, deactivated, unlinked." | "Connection deactivated." as a success toast without "Undo". Only deleting a connection, removing a document and the rules step's existing undos offer "Undo". Note 24's list reads "deleted, removed" | CLAR 2026-11-10 #5 |
| F14 | OUT-6 | U05 6711:39381 (note 21: 11.2, 11.8, 11.9), 6720:39042 ("unlinked"); U06 6791:46863 (note 28, item 9: strip link, 3.16) | "Unlink from Standard": menu item, confirmation, toast "Unlinked from Standard." with Undo, and the strip link | Not built; a linked variant stays linked | CLAR 2026-11-10 #5 |
| F15 | FR-076j, FR-076l, OUT-7 | U21 7295:61184; U04 6711:39375 (note 19, item 33) | "12 more documents are coming soon. Search to see them."; "Coming soon" documents shown when searched | Only the wallet's documents ("Available", "Added"), with no hint line. Search finds wallet documents only | CLAR 2026-11-10 #6 |
| F16 | FR-076k | U22 7294:61852 | "Everything in the wallet is added. Search to see what's coming soon." | "Everything in the wallet is added." | CLAR 2026-11-10 #6 |
| F17 | FR-076q, FR-076r, OUT-21 | U06 6760:48852 (note 26, item 6); P9d U85 not audited | "Published summary lists the same lines (P9d)" | No findings in the details' Summary. A tab's ⓘ shows only the variant's description (as 1i-b, U18 7344:96441) | CLAR 2026-11-10 #21 |
| F18 | FR-076m, FR-076n, OUT-4 | U65 7057:59533–7057:59535; U06 7058:63148 (note 29, item 21) | Green box "Message Anna reads" / "Your wallet data meets the requirements. Other documents are checked separately." | "Result: meets the rules" with the list "Rules <name> meets"; no message box | CLAR 2026-11-10 #8 |
| F19 | FR-076o, OUT-6 | U58 6522:33026 | "Group with other rules" in the group ⋯ menu | In a variant: "Add message", "Reset to Standard", divider, "Remove from <variant>" | CLAR 2026-11-10 #9 |
| F20 | FR-076p, OUT-3 | U13 6699:44358 | Email line "lena.weber@example.org" in the user menu | Name, divider, "Log out" | CLAR 2026-11-10 #10 |
| F21 | FR-082a, FR-082b, FR-082c, FR-036c | U06 7127:49610 (note 30, item 35: "Toasts stay 5 s"); U24 7298:62552 (A12: "toast with Undo (5 s)") | 5 s | Every toast closes by itself after 6 s. The time runs only while neither the pointer nor the keyboard focus is on it | CLAR 2026-11-10 #22 |
| F22 | EC-17 | U06 7137:50569 (note 31, item 54) | "With prefers-reduced-motion: fades only" | With reduced motion, dragging and reordering have no transitions, and the drop just updates the list. Everything else follows spec 008's rule | CLAR 2026-11-10 #25 |
| F23 | FR-017a, US2-AS1 | U90 6699:48064 (P18) | Active row "Edited 12.09.2026" | "Published 12.09.2026" | CLAR 2026-11-10 #12 |
| F24 | FR-053a, FR-053c, US7-AS1 | U11 6793:47828 (1b) | "Start with an example" | "Start from an example" | CLAR 2026-11-10 #27 |
| F25 | FR-045a, FR-045b, FR-050a | U21 7294:61510; U22 7294:61686, 7294:61850; U23 7298:61781; U24 7298:62390; U27 7298:63333, 7298:63752; U98 7298:63260 | Layer "Added list · scrolls, oldest first" | The team member's order: an added document goes to the end, and moves change the order. Name the layer as R3 does: "Added list · scrolls, in the order staff set" (U28 7298:64173) | RULE wording |
| F26 | FR-038b | U17 6699:48025, 6699:48036; U16 7362:54584, 7362:54594; U12 6699:45023, 6699:45036 | Checkbox and delete layers named after another row ("… Hunting licence") | Each control is named after its own row: "Select <name>", "Delete <name>" | RULE wording |
| F27 | FR-004a | U93 7362:54708 (S2 7362:54940), 7362:54909 | Draft band: "The links can't be added to your services yet. They become active when this connection is published."; Links card: "Created when the connection is published and active." | Band: "The links can’t be added to your services yet. They are created when this connection is published." Links card: "Created when the connection is published." | RULE wording |
| F28 | FR-053a, FR-053c, US7-AS1 | U04 6703:39317 (note 16); note 28 U06 6791:46863 (item 16); note 31 U06 7137:50569 (items 48, 52) | The empty state (1b) has "one Create connection button" | The welcome page shows "Create connection →" (primary) and "Start from an example" (secondary) beside it, as 1g draws (U18 6793:47705, 6793:47706; 1b U11 6699:44508, 6793:47828). The overview's footers keep "Create connection" only (FR-053d). Figma corrects note 16 to "Create connection and Start from an example" | CLAR 2026-11-10 #27 |
| F29 | FR-056b, FR-056c | U18 7344:96398 (1i), 7344:96454 (1i-c) | A "1" beside a variant tab (component "Rules/Variant tab · fixes") | The example's tabs show the ⓘ with the variant's description, as 1i-b (U18 7344:96441) and the Summary's tabs (U94 7246:52833) do: no count and no finding icon. The rules step's tab icons of note 26 (U06 6760:48852, item 4) and note 35 (U07 7370:55189, item 15) stay as spec 003 built them. Figma removes the stray "1" | CLAR 2026-11-10 #28 |
| F30 | FR-060d, FR-060e, FR-055d–g, FR-060b | U73 7137:50091, 7137:50181 (16b test step), 7137:50210 (16b dialog), 7058:62120 (16) | Behind the unchanged example's dialog: tabs Standard, Ambulance, School transport and Standard Rules 01–04. The summary lists only "Standard · 2 rules" | The unchanged example is FR-055's: Standard with Rules 01–02, and Ambulance with Rules 01–02 changed. The publish summary lists "Standard · 2 rules" and "Ambulance · 2 rules". The example line shows only while nothing has changed. Figma redraws 16b's background from 1i and adds Ambulance to the summary | CLAR 2026-11-10 #29 |
| F31 | FR-076t, OUT-7 | U93 7362:54923 (S2), 7362:55152 (S2's hidden Edit); U07 7370:55192 (note 36, item 25); note 12 U03 6648:42016; note 37 U08 7370:55195 | View-only draft details without "Edit connection" ("needs roles"). The notes already mark them out of scope | Not built. Every team member sees "Edit connection" on a draft's details (V-Draft · S, U93 7362:54920). Figma keeps S2 marked out of scope | CLAR 2026-11-10 #30 |
| F32 | FR-074, FR-074b, FR-074c, FR-074d | Sub-items a–n below | Behaviour of specs 001–009 that build notes and frames restate, or change, outside the nine items | The product as specs 001–009 built it; no requirement is added. Where a frame of the nine items shows such a part, its layout is ported and the behaviour stays. Where a note disagrees with the product, the product stays: F11, F33–F37 | CLAR 2026-11-10 #31 |
| F33 | FR-074d, FR-048b | U04 6711:39375 (note 19, items 26, 28: "x of y", "0 of y"); U06 6791:46863 (note 28, item 15: "no 'x of y'") | The two notes disagree on whether the documents list shows "x of y" chosen | The documents list as the product shows it today (spec 008); neither note is a requirement. The pager keeps "Document n of m" (FR-048b) | CLAR 2026-11-10 #31 (d) |
| F34 | FR-074d, FR-045b | U04 6711:39375 (note 19, item 35); U06 7127:49610 (note 30, item 42) | "Remove asks first when rules use the document" | The product's remove dialog, as A10 (U23 7298:62322) and A11 (U24 7298:62500) draw it, before every removal:<br>• "Remove <document>?" and "Citizens won’t be asked for this document any more.";<br>• when rules check its data, a sentence naming them, e.g. "2 rules check its data: Rule 02 and Rule 03 in Standard. Edit or delete them before you publish.";<br>• "Keep document" / "Remove document". | CLAR 2026-11-10 #31 (e) |
| F35 | FR-074d, FR-041c | U04 6703:39320 (note 17, item 17) | Active connection's delete sentence: "Both links stop working and applicants can't use it anymore." | The product's sentence, as frames 4 and P17 draw it: "This connection is active. Citizens won’t be able to use it, and its links stop working." (U14 6699:44480, U90 6417:31599) | CLAR 2026-11-10 #31 (l) |
| F36 | FR-070a, FR-070d | U05 6716:41045 (note 23, item 9) | "v8 is built. From 06.11.2026 changes happen in Figma first; v9 builds them. Changed since v8: …" | Only the nine items' frames are ported (FR-070a, FR-070c). Everything else stays as specs 001–009 leave it (FR-074, FR-074b) | CLAR 2026-11-10 #31 (n) |
| F37 | FR-074d | U06 6760:48852 (note 26, item 2) | The findings banner has no "Go to next finding" and no kind labels ("differs from FR-012/013, agreed with design") | The findings banner as the product shows it today (spec 003, as spec 008 built it); the note is no requirement | CLAR 2026-11-10 #31 (f) |
| F38 | FR-074e | U08 7370:55195 (note 37 #2); 1k U13 7366:55201, 7366:55276; U14 7173:52310; note 16 U04 6703:39317 | The description tooltip is "designed for hover; keyboard focus and touch need a way too" (open question) | Kept as spec 008 built it (its FR-051, FR-052); nothing is built in this feature:<br>• a cut description shows its full text in the tooltip on hover, while the row's name has keyboard focus, and after a tap;<br>• Escape or a tap elsewhere closes it;<br>• there is no tooltip when the text fits.<br>Figma closes note 37 #2 with this rule. | CLAR 2026-11-10 #32 |
| F39 | FR-074f | U17 6890:46052 (6a); note 18 U04 6703:39323 (item 23); note 30 U06 7127:49610 (item 31); note 31 U06 7137:50569 (item 51) | In the create flow, Konnekt / "Your connections" saves silently like Save and exit (6a → 6 → 7); with an empty name it just leaves | Spec 008's rule (its FR-026). In a new connection's or a stored draft's flow, the product name and "Your connections" open "Leave this connection?" on every step (frame 2, U17 7173:52656, 7173:52682): "If you leave now, you lose all progress. Save it to continue later, or discard the connection.", with "Discard connection" and "Save progress".<br>• "Save progress" saves as Save and exit does; 6 and 7 follow, and a missing name keeps the team member in the flow.<br>• "Discard connection" leaves without saving and discards the flow's local draft. Nothing stored is deleted; there is no toast and no "Undo".<br>• 6a is not built. E5b (F7) is not affected. | CLAR 2026-11-10 #33 |
| F40 | FR-022d, FR-022f | U82 6396:47966 (P9); U86 6396:48338, 6396:48520 (P10) | The Links card is fully shown, with no toggle, while Summary (P9) or Activity (P10) is open | Links, Summary and Activity form one accordion on every details page. After publishing or saving, the page lands with Links open (P7 U80 6396:47708, E4 U99 6730:39754). Opening Summary or Activity closes Links, whose control then reads "View links" (as U91 7203:50843 draws it). Figma redraws P9 and P10 with Links closed | CLAR 2026-11-10 #34 |
| F41 | FR-077b, FR-077f, FR-078d, FR-078f, US9-AS1, FR-050f, ENT-DataGroup.name | Driving licence panels: U22 7290:62357, 7290:62967; U23 7298:61791; U24 7298:62402–7298:62447; U27 7298:63343–7298:63380; U28 7298:64184–7298:64220 | Groups placed Name, Birth, Address, Licence, Other details, Document, Appearance; Birth with 5 items; Other details "Nationality, …" (more than 1) | The groups stand in the order Name, Birth, Address, Document, Licence, Appearance, Other details (last), flowing down the three columns. Membership comes from the catalog: Name 4, Birth 6, Address 5, Licence 3, Document 6, Appearance 6, Other details 1. The frames' column placement is layout only. Figma redraws A7–A12 and R1–R3 | CLAR 2026-11-10 #35 |
| F42 | FR-055h, FR-019a, FR-017d, US2-AS3 | U18 6793:47807, 6793:47800 (1j) | The just-created example's row reads "Edited 23.10.2026", with no step | "Edited <date> · Connection step" (e.g. "Edited 23.10.2026 · Connection step"), and agents read that step (FR-055i). Only a draft with no recorded step reads "Edited <date>" alone (CLAR #12). Figma updates 1j | CLAR 2026-11-10 #36 |
| F43 | FR-081b, FR-081i, CLAR-37 | U07 7370:55186 (note 34); layer names U16 7362:54556, 7362:54625–7362:54634 | Note 34 and the layers name the banner's tertiary button "Discard changes" | "Discard" ("Verwerfen"), as 1m and 1n draw it. Its accessible name stays "Discard changes in <name>". The edit flow's "Discard changes" is another button and stays (FR-076b, FR-076c) | CLAR 2026-11-10 #37 |

F32's sub-items. Each stays as specs 001–009 built it; the node-ids are the surfaces listed in CLAR 2026-11-10 #31:
- a. **Menus and popups** (notes 3, 31, 33): top layer, never clipped by a card, open down or up, max height, inner scroll, close on Esc, outside click or choosing, arrow keys. This includes U01 #6 and #8, mapped PARTIAL against FR-016a / FR-072a. Surfaces: U01 6637:36646; U06 7137:50569 (item 53); U07 7370:55183 (item 11).
- b. **Shell and layout** (notes 2, 4, 5, 9, 15, 30, 31):
  - the step line as a progress bar, hidden on the Published page;
  - sticky header and footer, and the 72 px footer;
  - the documents step filling the window at ≥ 800 px;
  - the rules header and tabs pinned;
  - Publish disabled with "Save the rule first" / "Finish grouping first";
  - disabled buttons that explain why on hover;
  - fades and skeletons;
  - log-in art and empty-state art.

  Surfaces: U01 6637:36649, 6637:36652; U02 6637:36655, 6637:36664; U06 7127:49610 (items 34, 45, 47), 7137:50569 (item 54, except reduced motion: F22).
- c. **Overview rows and search** (note 16):
  - start screen; × clears the search; "<n> of <m> connections";
  - "No connections match …" and "Clear search";
  - the name opens View;
  - a description line under the name, and no rule count;
  - rows scroll inside the card.

  Surfaces: U04 6703:39317; U11 6699:44519, 6699:44521, 6699:44580, 6699:44629, 6699:44631; U12 6699:44931, 7173:52294; U13 7366:55201; U17 6699:48028; U05 6716:41045 (item 19); the hidden "View (disabled…)" layers U11 6699:44552, U12 6699:44942. The tooltip is F38.
- d. **Create and documents steps** (notes 18, 19, 28):
  - name required, no Connection ID, "Choose documents";
  - Set rules disabled with "Add a document first";
  - V6a and V6;
  - the Add document button's states and pinned place.

  Surfaces: U04 6703:39323, 6711:39375; U05 6716:41042 (items 5, 6); U06 6791:46863. "x of y" is F33; the save on leaving is F39.
- e. **Removing a document** (A10, A11): U23 7298:62322; U24 7298:62500. See F34.
- f. **Rules step** (notes 21, 26, 28; 10.9–10.11):
  - linked and not-linked variants;
  - finding severities, the tab icon, the hover order;
  - the footer without Skip; "Restore rule".

  Surfaces: U05 6711:39381; U06 6760:48852, 6791:46863; U58 6522:32982–6522:33103. Unlink is F14; the findings banner is F37.
- g. **Test step** (note 29):
  - layout and result table;
  - the "Edit data" toast;
  - the applicant kept across variants;
  - skeleton and error states;
  - the green ✓ only in Test, and the red dot plus bold.

  Surfaces: U06 7058:63148; U65 7057:58754, 7057:59073; U73 7058:62040. The met message is F18; "Generate all" is CLAR #7.
- h. **Publish dialog** (P2, P2b, P5, 11.14):
  - rule counts per variant;
  - findings shown as "1 warning on Ambulance" (P2) or as one sentence per variant (P2b);
  - findings don't block publishing;
  - "Back to test" and ×.

  Surfaces: U77 6376:26181, 6760:47979; U73 7058:62120; U79 6376:27178; U63 7112:48859.
- i. **Edit flow** (note 25):
  - step-1 edit copy;
  - the clickable step bar;
  - "Check rules again" and "Changes saved.";
  - a variant deleted while editing goes on save;
  - drafts edit like creating;
  - beforeunload.

  Surfaces: U05 6730:40340; U98 6731:39827; U99 6730:39810. The draft path is F4 to F9.
- j. **Leaving and logging out** (Start 3, notes 30, 31): "Save before you log out?" with "Log out anyway" / "Save and log out"; Save and exit (6 "Saving your draft…", 7 "Draft saved. You can pick it up any time."). Surfaces: U17 6408:72919, 6401:71899, 6699:48002; U06 7127:49610 (item 32). 6a is F39.
- k. **Details** (notes 33, 36):
  - a truncated URL copies in full;
  - View or the name opens a draft's details;
  - Summary is open on arrival from View (spec 008 FR-046);
  - a draft's Links card has no links;
  - copy buttons are disabled while deactivated.

  Surfaces: U07 7370:55183, 7370:55192; U89 6417:31309, 6417:31325, 6417:31331, 6417:31337; U96 7246:56338; U91 7203:50468; U93 7362:54691; U94 7246:52715; U96 7246:55146.
- l. **Delete and deactivate dialogs** (note 17, frames 3 and 4, P15):
  - a deactivated connection reuses the draft's body;
  - the scrim does not close the dialog;
  - P15's title and buttons.

  Surfaces: U04 6703:39320; U14 6699:44419, 6699:44480; U90 6417:31599; U88 6417:31206. Note 17's sentence is F35; P15's body is F11.
- m. **Toast types** (note 24): neutral for "logged out" and for "couldn't save" with Retry. Surface: U05 6720:39042. "Undo" is F13.
- n. **Scope** (note 23): U05 6716:41045. See F36.

## Build without frames (decided)
| # | req | expected surface | build from (nearest frame or KERN pattern) | decision |
|---|---|---|---|---|
| W1 | FR-003d, FR-003e, EC-1 | Publish dialog; Change start date; Activate again | P1c's error state (U76 6635:36265): red field, "Enter a date after today." under it, button stays enabled. It also shows when the day changed while the dialog was open, in P1b (U75 6383:66119), P12 (U87 6396:48860) and P16b (U89 7173:52959) | CLAR 2026-11-10 #11 |
| W2 | FR-008d, FR-008f | Change start date; details | P12 (U87 6396:48860) with "Now" selected; "Save date" makes the connection active at once. The details then show the active band with "Active since <date>, <time>" (U80 7355:61155) | CLAR 2026-11-10 #11 |
| W3 | FR-008e | Toast | Note 24's success toast (U05 6720:39042; U05 #21 lists no start-date toast), placed like P16's toast (U89 6417:31447): "Start date saved."; closes after 6 s (F21) | CLAR 2026-11-10 #11 |
| W4 | FR-011c, FR-011d, FR-011e | Activate again dialog | P16b (U89 7173:52959) with "On a date": the date field under the radios as in P1b (U75 6383:66119), a hint written in this feature, and the button "Schedule" | CLAR 2026-11-10 #11 |
| W5 | FR-012b | Deactivate dialog | P15 (U88 6417:31206) with this feature's sentence for a connection that was never active (the other sentences as F11) | CLAR 2026-11-10 #11 |
| W6 | FR-013c | Save changes dialog | E3 (U98 6730:39464) with this feature's sentence for a scheduled connection, and no "Active from" (F9) | CLAR 2026-11-10 #11 |
| W7 | FR-013d, FR-013e, FR-013f, FR-013g, FR-013h, US1-AS9 | Edit entry confirmation; step-1 note; leave and discard dialogs | German for every text per FR-071:<br>• entry (U87 6396:49030): title "Edit this scheduled connection?" and body "Your changes only take effect when you save them. Saved changes become active on <date>." The row's "Edit “<name>”?" title stays (U15 6699:47905);<br>• step-1 note (U98 6731:39846): "Scheduled. Your changes become active on <date> once you save them.";<br>• E5b (U99 7173:52836): "If you leave now, your changes are lost. Save them, or discard them and keep the scheduled version.";<br>• E7 (U100 7173:52772): "The connection goes back to the version that becomes active on <date>. Citizens aren't affected." | CLAR 2026-11-10 #24 |
| W8 | FR-014b, FR-014c, FR-043c | Publish, Activate again and Change start date dialogs; bulk delete dialog | P5's layout (U79 6376:27178) with spec 008's failure alert and its error ID (slim, may wrap; F2):<br>• P5's sentence shows only when no answer came;<br>• "Try again" repeats "Now", or "On a date" with the entered date;<br>• a failed reactivation or date change leaves the connection unchanged. | CLAR 2026-11-10 #23 |
| W9 | FR-021b, EC-8a, US2-AS6 | Overview; details | The overview's date column (U11–U18, U90) and the date pill (U80 7355:61155):<br>• rows read "Published <stored publication date>" or "Deactivated <last change time>";<br>• pills read "Active since <publication>";<br>• reactivation moves only "Active since". | CLAR 2026-11-10 #12 |
| W10 | FR-025b, FR-025d (removed, renamed), FR-025g, FR-025h, FR-025j, FR-025k, FR-025m, FR-027b, FR-027c, FR-027d, FR-031a, FR-032a, FR-032b, FR-044c, EC-8c, EC-10, US3-AS4, US3-AS5, US3-AS6 | Activity card | The drawn row (date and time · event · person) of the open card (U86 6396:48527, U92 7246:52096, U95 7246:54525–7246:54545, U97 7246:56965) and the closed line (U80 6396:47761, U89 6417:31345, U96 7246:55328, U97 7246:57191). Build these with the spec's wording:<br>• the scheduling entry with its date, which U95's scheduled connection lacks (U95 #14);<br>• name or description changed;<br>• variant removed or renamed;<br>• became active, with no person;<br>• activated again;<br>• deleted and restored, also after a bulk delete;<br>• a team member with an agent, an approver with the asking agent, and middleware entries without a person;<br>• a pre-existing connection's "Created" / "Published" without a person, and the closed line with the time alone;<br>• the list scrolls down to the oldest entry;<br>• every team member can read it. | CLAR 2026-11-10 #13 (FR-044c: #15) |
| W11 | FR-034d, FR-034e, FR-036d, FR-037a, FR-037b, US4-AS2, US4-AS3, US4-AS4, EC-6, EC-7 | Overview; toast; welcome page | P18 (U90 6699:48039, 6699:48098) and 1b (U11 6699:44481):<br>• after "Undo" the row returns without a reload and a polite announcement says "“<name>” restored.";<br>• a late or second "Undo" changes nothing, and the toast reads "“<name>” can no longer be restored.";<br>• deleting the last connection shows 1b with the toast, and "Undo" brings back the overview;<br>• a replaced toast or a left page leaves the deletion standing;<br>• the toast closes after 6 s (F21). | CLAR 2026-11-10 #14, #22 |
| W12 | FR-039b, FR-043b, FR-044a, FR-044b, US5-AS3, US5-AS4, EC-12, EC-13 | Selection bar; bulk delete dialog; overview; toast | Selection bar (U15 6699:45206), bulk dialog (U15 6699:45320), toast (U90 6699:48098):<br>• the count is announced when it changes;<br>• when a selected connection vanished or changed, nothing is deleted and the dialog says "Nothing was deleted: “<name>” was deleted or changed in the meantime.";<br>• after deletion the rows are gone, the selection clears, the toolbar comes back and the toast reads "<n> connections deleted." with "Undo";<br>• a row that vanishes on refresh leaves the selection;<br>• a long list scrolls inside the dialog while its buttons stay in view. | CLAR 2026-11-10 #15 |
| W13 | FR-046e, FR-047a, FR-047b, FR-047c, FR-047d, FR-047e, FR-049a (edit flow), FR-049d, US6-AS3, US6-AS5, EC-15 | Documents step (create and edit flows) | A ⋯ menu button on each document row (spec 008's menu pattern):<br>• it holds "Move up" and "Move down"; the first row has no "Move up", the last no "Move down";<br>• one document gets no menu (A5, U21 7290:61204) (superseded 2026-11-18, bug v5-ui-fixes (B4), spec Clarification 2026-11-18: every row has the ⋯, a single document's too, named "Actions for <document>"; it ends with the red "Remove document" after a divider, a single document's holds only that, and the row has no trash);<br>• focus stays on the moved row, and the move is announced: "“<document>” moved to position <n> of <m>.";<br>• Escape, or a drop outside the list, restores the order;<br>• E1b (U98 7298:63260) gets the same drag and menu.<br>Rows: U22 7290:62348, 7290:62349; U23 7298:61782, 7298:61783; U24 7298:62391, 7298:62392; U27; U28 7298:64174, 7298:64175. Notes: 19 (U04 6711:39375), 23 (U05 6716:41045, including its "Documents · 1–3 and E1b" item) and 37 (U08 7370:55195) | CLAR 2026-11-10 #16; CLAR 2026-11-18 |
| W14 | FR-050c, FR-060c, FR-065c, FR-065d, FR-065f, FR-065h, FR-066a, FR-066b, FR-067b, US8-AS3 | Approval page (spec 007; not in the file) | The existing approval page, with the spec's wording:<br>• the stored document order;<br>• "This is still the example. Check that the name, documents and rules fit your service.";<br>• "Active from <date>", or that the connection goes live at once;<br>• FR-065d's sentence, written in this feature;<br>• the refusal reasons;<br>• deactivating and deleting a scheduled connection;<br>• no "Undo". | CLAR 2026-11-10 #17 (#2 kept) |
| W15 | FR-058d, FR-058f, FR-059, FR-061, EC-19, ENT-ExampleMark.isExample | Wizard (documents and test steps); details | The "Rules/Findings banner" from 1h (U18 6798:122695): "This is an example. Change anything to see how it works." on the documents and test steps. On the test step it sits above the variant tabs (16b, U73 7137:50086), as on the rules step (U18 7344:96396). After publishing there is no banner and no publish line; the texts are in the current language. Frames that reuse the example's rules for a plain connection need nothing (U65 #11, U76 #22 6635:36265, U77 #18, U78 #14) | CLAR 2026-11-10 #18 |
| W16 | EC-21 | Every new control | The `narrow:` variant and `docs/KERN-DESIGN-SYSTEM.md` §3.1, for:<br>• the date pill with its ⋯ (U80 7355:61155);<br>• the "Active from" group and date field (U75 6383:66119);<br>• the selection bar (U15 6699:45206) and the bulk dialog (U15 6699:45320);<br>• the Activity card (U92 7246:52096);<br>• the reorder menu (W13). | CLAR 2026-11-10 #19 |
| W17 | FR-081f, US5-AS6 | Overview (local drafts banner, selection bar) | 1m / 1n (U16 7362:54550–7362:54557, 7362:54621–7362:54634) stay above the selection bar (U15 6699:45206) while rows are selected. Device-only connections are neither counted nor selectable | CLAR 2026-11-10 #20 |
| W18 | FR-077d, FR-079c, FR-079d, US9-AS4 | Documents step (data item panel; rules question dialog) | A document with 10 data items or fewer keeps today's flat list. Clearing a group asks the existing "All data items" question (002-S1.1), with group wording written in this feature. Panels: U21 7290:61211, U22 7290:62356, U98 7296:52340 | CLAR 2026-11-10 #6; #16 (session rule: build from the spec) |

## Clarify questions
None. CLAR 2026-11-10 #27 to #37 answered the previous report's Q1 to Q11 (see the Summary). The remap found no new open item, so no answer is pending.

## Coverage
UI = Y requirements. "→ F#/W#" marks a settled item.

| req-id | status | units |
|---|---|---|
| FR-001a | COVERED; PARTIAL (U02 note 8 label) → F3 | U01, U63, U73, U75, U76, U77; PARTIAL U02 |
| FR-001b | COVERED | U63, U73, U75, U77 |
| FR-001c | COVERED | U63, U73, U75, U77 |
| FR-002a | COVERED | U75, U76 |
| FR-002b | COVERED | U02, U75, U76 |
| FR-002c | COVERED | U75, U76 |
| FR-003b | COVERED | U02, U76 |
| FR-003c | COVERED | U02, U75, U76 |
| FR-003d | SPEC-ONLY → W1 | — |
| FR-003e | SPEC-ONLY → W1 | — |
| FR-004a (UI N) | PARTIAL → F27 | U93 |
| FR-004b | COVERED | U06, U86, U90, U94 |
| FR-006a | COVERED | U07, U11, U13, U58, U63, U86 |
| FR-006b | COVERED | U13 |
| FR-006c | COVERED (U03 note 14's PARTIAL resolved by note 32, U07) | U07, U86, U94, U95, U99 |
| FR-006d | COVERED | U86, U94, U95 |
| FR-006e | COVERED | U86, U94, U95 |
| FR-006f | COVERED | U04, U07, U14, U99 |
| FR-007 | COVERED | U58, U63, U86, U94, U95, U99 |
| FR-008a | COVERED (scheduled menu not drawn open); PARTIAL (U01 note 3) → F32 | U06, U87, U88, U95 |
| FR-008b | COVERED | U01, U87 |
| FR-008c | COVERED | U87 |
| FR-008d | SPEC-ONLY → W2 | — |
| FR-008e | PARTIAL → W3 | U05 |
| FR-008f | SPEC-ONLY → W2 | — |
| FR-009a | COVERED | U06, U58, U80, U87, U88 |
| FR-009b | COVERED | U87 |
| FR-009c (UI N) | CONFLICT → F10 | U87 |
| FR-009d | CONFLICT → F10 | U87 |
| FR-009e | COVERED; CONFLICT (E3 radios) → F9 | U05, U15, U98, U99, U100 |
| FR-009f | CONFLICT → F8 | U05, U98 |
| FR-010 | COVERED | U04, U14 |
| FR-011a | COVERED | U01, U89, U96, U97 |
| FR-011b | COVERED | U89 |
| FR-011c | SPEC-ONLY → W4 | — |
| FR-011d | SPEC-ONLY → W4 | — |
| FR-011e | SPEC-ONLY → W4 | — |
| FR-012a | COVERED | U96, U97 |
| FR-012b | SPEC-ONLY → W5 | — |
| FR-013a | COVERED | U05, U06, U15, U87, U99 |
| FR-013c | SPEC-ONLY → W6 | — |
| FR-013d | COVERED (row title only) → W7 | U15, U87 |
| FR-013e | COVERED (active body only) → W7 | U87 |
| FR-013f | SPEC-ONLY → W7 | — |
| FR-013g | SPEC-ONLY → W7 | — |
| FR-013h | COVERED (active body only) → W7 | U100 |
| FR-014a | COVERED | U02, U78, U79 |
| FR-014b | COVERED (publish) → W8 | U79 |
| FR-014c | PARTIAL → F2, W8 | U02 |
| FR-014d | COVERED | U79 |
| FR-014e | COVERED | U79 |
| FR-015a | COVERED | U07, U58, U63, U80, U86, U89 |
| FR-015b | COVERED | U58, U63, U80–U82, U86, U88, U90–U92, U99 |
| FR-015c | COVERED | U86, U94, U95 |
| FR-015d | COVERED | U89, U96, U97 |
| FR-015e | COVERED (U05 #18's PARTIAL resolved by note 36, U07) | U04, U93 |
| FR-016a | COVERED; PARTIAL (U01 note 3, menus) → F32 | U07, U58, U80, U86, U89, U93 |
| FR-016b | COVERED | U07, U89, U96, U97 |
| FR-017a | COVERED; CONFLICT (U90) → F23 | U11–U18 |
| FR-017b | COVERED | U13, U14 |
| FR-017c | COVERED | U11–U18, U90 |
| FR-017d | COVERED (U11–U15's "Edited <date>" rows read as FR-019d, CLAR #12); PARTIAL (U18 1j) → F42 | U06, U16, U17, U90 |
| FR-019a | COVERED; PARTIAL (U18 1j) → F42 | U06, U17 |
| FR-019c | COVERED | U11, U12, U13, U16, U17 |
| FR-019d | COVERED (also the same row in U11–U15) | U16, U17, U90 |
| FR-020a | COVERED | U02, U06, U11, U13, U16, U92 |
| FR-020b | COVERED | U86, U94, U99 |
| FR-021b | SPEC-ONLY → W9 | — |
| FR-022a | COVERED | U04, U58, U63, U80, U92, U93, U97 |
| FR-022b | COVERED | U58, U80, U81, U92, U94, U97 |
| FR-022c | COVERED | U86, U92, U95, U97 |
| FR-022d | COVERED; CONFLICT (P9, P10) → F40 | U06, U80, U89, U91–U97; CONFLICT U82, U86 |
| FR-022e | COVERED (U91's arrival from View is spec 008 FR-046, kept: CLAR #31, #34) | U06, U80, U87, U90, U99; PARTIAL U91 |
| FR-022f | COVERED ("View links" drawn in U91, U94–U97); CONFLICT (P9, P10) → F40 | U80, U95; PARTIAL U91; CONFLICT U82, U86 |
| FR-023a | COVERED | U86, U92, U95, U97 |
| FR-023b | COVERED | U86, U92, U95, U97 |
| FR-024a | COVERED | U58, U63, U80, U86, U92, U94 |
| FR-024b | COVERED | U89, U96, U97 |
| FR-025a | COVERED | U86, U92, U95, U97 |
| FR-025b | COVERED ? (the edit, not the entry) → W10 | U98 |
| FR-025c | COVERED | U86, U92, U95, U97 |
| FR-025d | COVERED (added); removed or renamed → W10 | U86, U92, U95, U97 |
| FR-025e | COVERED | U86, U92, U95, U97 |
| FR-025f | COVERED | U86, U92, U95, U97 |
| FR-025g | PARTIAL → W10 | U95 |
| FR-025h | SPEC-ONLY → W10 | — |
| FR-025i | COVERED | U97 |
| FR-025j | SPEC-ONLY → W10 | — |
| FR-025k | SPEC-ONLY → W10 | — |
| FR-025l | COVERED | U86, U92, U95, U97 |
| FR-025m | COVERED (row format) → W10 | U95 |
| FR-027a | COVERED | U80, U82, U86, U92, U95, U97, U99 |
| FR-027b | SPEC-ONLY → W10 | — |
| FR-027c | SPEC-ONLY → W10 | — |
| FR-027d | SPEC-ONLY → W10 | — |
| FR-031a | SPEC-ONLY → W10 | — |
| FR-032a | SPEC-ONLY → W10 | — |
| FR-032b | SPEC-ONLY → W10 | — |
| FR-033 | COVERED | U04, U05, U11, U12, U90 |
| FR-034d | SPEC-ONLY → W11 | — |
| FR-034e | SPEC-ONLY → W11 | — |
| FR-035a | COVERED | U14, U90 |
| FR-036b | COVERED | U90 |
| FR-036c | COVERED; PARTIAL (U06 note 30) → F21 | U04 |
| FR-036d | COVERED (note only) → W11 | U04 |
| FR-037a | COVERED (note only) → W11 | U06 |
| FR-037b | SPEC-ONLY → W11 | — |
| FR-038a | COVERED | U01, U11–U18, U90 |
| FR-038b | COVERED; PARTIAL (U17 layer names) → F26 | U11–U16, U18, U90 |
| FR-038c | COVERED | U11–U18, U90 |
| FR-039a | COVERED | U04, U12–U18, U90 |
| FR-039b | SPEC-ONLY → W12 | — |
| FR-039c | COVERED | U04, U13, U14, U15 |
| FR-040a | COVERED | U01, U14, U15 |
| FR-040b | COVERED | U04, U12, U14, U15 |
| FR-041a | COVERED | U06, U15 |
| FR-041b | COVERED | U04, U15 |
| FR-041c | COVERED | U04, U15 |
| FR-041d | COVERED (note 17 only; the lines are written in this feature) | U04 |
| FR-041e | COVERED | U15 |
| FR-041f | COVERED (note 17 only) | U04 |
| FR-042a | COVERED | U06, U15 |
| FR-042b | COVERED | U06, U15 |
| FR-043b | SPEC-ONLY → W12 | — |
| FR-043c | PARTIAL → F2, W8 | U02 |
| FR-044a | SPEC-ONLY → W12 | — |
| FR-044b | COVERED (notes only) → W12 | U04, U05 |
| FR-044c | SPEC-ONLY → W10 | — |
| FR-045a (UI N) | PARTIAL (layer "oldest first") → F25 | U21, U23, U24, U27, U98 |
| FR-045b | COVERED | U04, U21–U24, U28, U98 |
| FR-045c | COVERED | U24 |
| FR-046a | COVERED; PARTIAL (U22, U24, U98) → W13 | U04, U23, U27, U28 |
| FR-046b | COVERED | U27 |
| FR-046c | COVERED | U28 |
| FR-046d | COVERED (note) | U04 |
| FR-046e | SPEC-ONLY → W13 | — |
| FR-047a | PARTIAL → W13 | U04, U05, U22, U24, U98 (COVERED U08) |
| FR-047b | COVERED (one document) → W13 | U21 |
| FR-047c | COVERED (note) → W13 | U08 |
| FR-047d | COVERED (note) → W13 | U08 |
| FR-047e | COVERED (note) → W13 | U08 |
| FR-048a | COVERED | U27, U28 |
| FR-048b | COVERED; CONFLICT (U06 note 28, "x of y") → F33 | U21–U24, U27, U28, U98 |
| FR-049a | COVERED (create flow) → W13 (edit flow) | U23, U27, U28 |
| FR-049d | PARTIAL → W13 | U98 |
| FR-050a | COVERED | U22, U24, U28, U65, U75, U76 |
| FR-050b | COVERED | U63, U73, U75, U77, U82, U91, U93, U94, U96 |
| FR-050c | SPEC-ONLY → W14 | — |
| FR-050e | COVERED | U21, U23, U27, U82, U91 |
| FR-050f | COVERED; CONFLICT (Driving licence frames) → F41 | U23, U98; CONFLICT U22, U24, U28; PARTIAL U27 |
| FR-053a | COVERED; CONFLICT (note 16) → F28; label → F24 | U06, U11, U18; CONFLICT U04 |
| FR-053b | COVERED | U11–U18, U90 |
| FR-053c | COVERED; PARTIAL (1b label) → F24; CONFLICT (note 16) → F28 | U11; CONFLICT U04 |
| FR-053d | COVERED | U11, U13, U16 |
| FR-054a | COVERED | U06, U18 |
| FR-054b | COVERED | U18 |
| FR-054c | COVERED | U06, U18 |
| FR-055a | COVERED | U06, U18 |
| FR-055b | COVERED | U06, U18, U73 |
| FR-055c | COVERED | U04, U06, U73 |
| FR-055d | COVERED; 16b's background → F30 | U03, U18, U73 |
| FR-055e | COVERED; 16b's background → F30 | U03, U18, U73 |
| FR-055f | COVERED | U18 |
| FR-055g | COVERED | U18 |
| FR-055h | Cited by no row; 1j (U18 #39, mapped FR-019a) draws the same point → F42 | U18 |
| FR-056b | CONFLICT (the "1" beside the tabs) → F29 | U18 |
| FR-056c | CONFLICT → F29 | U18 |
| FR-057 | COVERED | U06, U18, U73 |
| FR-058a | COVERED | U06, U18 |
| FR-058b | COVERED | U18 |
| FR-058c | COVERED | U18 |
| FR-058d | COVERED (note 28); PARTIAL → W15 | U06; PARTIAL U73 |
| FR-058e | COVERED | U18 |
| FR-058f | PARTIAL → W15 | U73 |
| FR-059 | SPEC-ONLY → W15 | — |
| FR-060a | COVERED | U06, U73 |
| FR-060b | COVERED; 16b's background → F30 | U73, U75, U77 |
| FR-060c | SPEC-ONLY → W14 | — |
| FR-060d | COVERED ? (only "Standard · 2 rules" drawn) → F30 | U73 |
| FR-060e | COVERED → F30 | U73 |
| FR-061 | SPEC-ONLY → W15 | — |
| FR-065c | SPEC-ONLY → W14 | — |
| FR-065d | SPEC-ONLY → W14 | — |
| FR-065f | SPEC-ONLY → W14 | — |
| FR-065h | SPEC-ONLY → W14 | — |
| FR-066a | SPEC-ONLY → W14 | — |
| FR-066b | SPEC-ONLY → W14 | — |
| FR-067b | COVERED (note 17 only) → W14 | U04 |
| FR-070a | COVERED; PARTIAL (U05 note 23 scope) → F36 | U01, U03, U27, U28, U75, U81; PARTIAL U05 |
| FR-070b | COVERED | U03 |
| FR-070c | COVERED | U04, U21, U22, U23, U27, U98 |
| FR-070d | Cited by no row; note 23 (U05 #9, mapped FR-070a) draws the same point → F36 | U05 |
| FR-071a | COVERED | U92, U97 |
| FR-071c | COVERED | U03, U77, U80 |
| FR-071d | CONFLICT → F1 | U01 |
| FR-072a | COVERED; PARTIAL (U01 note 3, menu keys) → F32 | U01, U08, U13, U15, U76 |
| FR-072b | COVERED | U01 |
| FR-074b | COVERED → F32 | U01, U02, U04–U07, U11–U14, U24, U58, U65, U77, U79, U88, U96, U98, U99 |
| FR-074c | COVERED → F32 | U01, U02, U05, U07, U11, U13, U14, U23, U24, U58, U65, U73, U77, U79, U89, U90, U96, U98, U99 |
| FR-074d | COVERED; CONFLICT (notes 17, 19, 26, 28, 30) → F33, F34, F35, F37 | U02, U05, U23, U24; CONFLICT U04, U06 |
| FR-074e | COVERED; PARTIAL (U14 description line) → F38 | U04, U08, U13; PARTIAL U14 |
| FR-074f | COVERED; CONFLICT (6a, notes 18, 30, 31) → F39 | U17; CONFLICT U04, U06, U17 |
| FR-076a | COVERED; CONFLICT rows → F5 | U98, U99, U100 |
| FR-076b | COVERED; PARTIAL (U06 note 28) → F6 | U98, U99, U100 |
| FR-076c | COVERED; CONFLICT (E5a, note 30) → F7 | U99; CONFLICT U06, U99 |
| FR-076d | COVERED | U99 |
| FR-076e | CONFLICT (U05 note 25, as OUT-1) → F6 | U05 |
| FR-076f | CONFLICT → F4 | U03 |
| FR-076g | COVERED; Download PDF → F12 | U63, U82, U87–U90, U93, U95, U99 |
| FR-076h | PARTIAL, CONFLICT → F13 | U05, U89 |
| FR-076i | COVERED; CONFLICT (U05) → F13 | U04 |
| FR-076j | COVERED; CONFLICT → F15 | U04, U21, U22 |
| FR-076k | CONFLICT → F16 | U22 |
| FR-076l | COVERED; CONFLICT → F15 | U21, U22 |
| FR-076m | COVERED; CONFLICT (U06) → F18 | U65 |
| FR-076n | CONFLICT → F18 | U06, U65 |
| FR-076o | COVERED; CONFLICT → F19 | U58 |
| FR-076p | CONFLICT (as OUT-3) → F20 | U13 |
| FR-076q | COVERED; CONFLICT (U06) → F17 | U91, U93, U94 |
| FR-076r | COVERED | U91, U93, U94 |
| FR-076s | COVERED | U11, U12, U13, U15 |
| FR-076t | COVERED; CONFLICT (V-Draft · S2) → F31 | U03, U07, U93; CONFLICT U07, U93 |
| FR-077a | COVERED; CONFLICT (Driving licence frames) → F41 | U04, U21, U23, U27, U98 |
| FR-077b | COVERED; CONFLICT → F41 | U04, U21, U98; CONFLICT U22, U23, U24, U28; PARTIAL U27 |
| FR-077c | COVERED | U21, U23, U27, U98 |
| FR-077d | SPEC-ONLY → W18 | — |
| FR-077e | COVERED | U82 |
| FR-077f | COVERED; CONFLICT → F41 | U04, U21, U98; CONFLICT U22, U23, U24, U28; PARTIAL U27 |
| FR-078d | COVERED; CONFLICT → F41 | U04; CONFLICT U22, U23, U24, U28; PARTIAL U27 |
| FR-078e | COVERED | U04, U21, U23, U27, U98 |
| FR-078f | COVERED; CONFLICT → F41 | U04; CONFLICT U22, U23, U24, U28; PARTIAL U27 |
| FR-079a | COVERED | U04, U21, U23, U27, U98 |
| FR-079b | COVERED | U04, U21, U22, U98 |
| FR-079c | COVERED ? → W18 | U22 |
| FR-079d | SPEC-ONLY → W18 | — |
| FR-081a | COVERED | U04, U05, U07, U16 |
| FR-081b | COVERED; CONFLICT (note 34) → F43 | U16; CONFLICT U07 |
| FR-081c | COVERED | U07, U16 |
| FR-081d | COVERED | U07, U16 |
| FR-081e | COVERED | U16 |
| FR-081f | Not drawn (U07 cites it only in the label conflict) → W17 | U07 |
| FR-081g | COVERED | U07, U16 |
| FR-081h | COVERED | U07, U16 |
| FR-081i | COVERED; CONFLICT (note 34) → F43 | U16; CONFLICT U07 |
| FR-082a | COVERED; PARTIAL (U06), CONFLICT (U24) → F21 | U17, U99 |
| FR-082b | COVERED | U17, U99 |
| FR-082c | COVERED; CONFLICT (U24 A12) → F21 | U17 |
| CLAR-7 | COVERED | U05, U06, U65, U73, U99 |
| CLAR-37 | COVERED; CONFLICT (note 34) → F43 | U16; CONFLICT U07 |
| US1-AS1 | COVERED | U63, U73, U75, U77 |
| US1-AS2 | COVERED | U75, U76 |
| US1-AS3 | COVERED | U02, U76 |
| US1-AS4 | COVERED | U07, U86, U94, U95 |
| US1-AS5 | COVERED | U05, U12, U13, U14 |
| US1-AS6 | COVERED | U58, U63, U80, U81, U82, U86 |
| US1-AS7 | COVERED | U07, U87, U94 |
| US1-AS8 | COVERED | U89, U97 |
| US1-AS9 | COVERED → W7 (scheduled wording) | U05, U06, U15, U99 |
| US1-AS10 | COVERED | U14 |
| US1-AS11 | CONFLICT → F9, F10 | U87, U98 |
| US2-AS1 | COVERED; CONFLICT (U90) → F23 | U11–U18 |
| US2-AS2 | COVERED | U11–U18, U90 |
| US2-AS3 | COVERED; PARTIAL (U18 1j) → F42 | U06, U17 |
| US2-AS4 | COVERED | U58, U63, U80, U81, U86, U99 |
| US2-AS5 | COVERED | U07, U89, U96, U97 |
| US2-AS6 | SPEC-ONLY → W9 | — |
| US3-AS1 | COVERED | U58, U63, U80, U92, U94 |
| US3-AS2 | COVERED | U06, U81, U86, U92, U95, U97 |
| US3-AS3 | COVERED | U89, U96, U97 |
| US3-AS4 | SPEC-ONLY → W10 | — |
| US3-AS5 | SPEC-ONLY → W10 | — |
| US3-AS6 | SPEC-ONLY → W10 | — |
| US4-AS1 | COVERED | U05, U90 |
| US4-AS2 | SPEC-ONLY → W11 | — |
| US4-AS3 | SPEC-ONLY → W11 | — |
| US4-AS4 | SPEC-ONLY → W11 | — |
| US5-AS1 | COVERED | U04, U15 |
| US5-AS2 | COVERED | U15 |
| US5-AS3 | SPEC-ONLY → W12 | — |
| US5-AS4 | SPEC-ONLY → W12 | — |
| US5-AS5 | COVERED | U15 |
| US5-AS6 | SPEC-ONLY → W17 | — |
| US6-AS1 | COVERED | U27, U28 |
| US6-AS2 | COVERED | U04, U27 |
| US6-AS3 | COVERED (note 37) → W13 | U08 |
| US6-AS4 | COVERED | U65, U73, U75, U76, U77, U82, U91 |
| US6-AS5 | SPEC-ONLY → W13 | — |
| US7-AS1 | COVERED; CONFLICT (note 16) → F28; label → F24 | U06, U11, U18; CONFLICT U04 |
| US7-AS2 | COVERED | U18 |
| US7-AS3 | COVERED | U06, U18 |
| US7-AS4 | COVERED | U18 |
| US7-AS5 | COVERED | U06, U73 |
| US7-AS6 | COVERED | U11–U18, U90 |
| US8-AS3 | SPEC-ONLY → W14 | — |
| US9-AS1 | COVERED; CONFLICT → F41 | U04; CONFLICT U22, U23, U24, U28; PARTIAL U27 |
| US9-AS2 | COVERED | U04 |
| US9-AS3 | COVERED | U04, U21, U22, U98 |
| US9-AS4 | SPEC-ONLY → W18 | — |
| EC-1 | COVERED (error copy) → W1 | U02 |
| EC-3 | COVERED | U96, U97 |
| EC-6 | SPEC-ONLY → W11 | — |
| EC-7 | SPEC-ONLY → W11 | — |
| EC-8a | SPEC-ONLY → W9 | — |
| EC-8c | SPEC-ONLY → W10 | — |
| EC-10 | SPEC-ONLY → W10 | — |
| EC-11 | COVERED | U11, U15, U16 |
| EC-12 | SPEC-ONLY → W12 | — |
| EC-13 | SPEC-ONLY → W12 | — |
| EC-14 | COVERED | U21, U24 |
| EC-15 | SPEC-ONLY → W13 | — |
| EC-16 | COVERED | U24 |
| EC-17 | PARTIAL → F22 | U06 |
| EC-19 | SPEC-ONLY → W15 | — |
| EC-21 | SPEC-ONLY → W16 | — |
| ENT-ConnectionStatus.value | COVERED | U07, U11, U13, U15, U58, U63 |
| ENT-StatusDates.published | COVERED | U11, U12, U14–U17 |
| ENT-StatusDates.activeSince | COVERED | U58, U63, U80–U82, U86, U90–U92, U99 |
| ENT-StatusDates.deactivated | COVERED | U11, U14–U17, U89, U96, U97 |
| ENT-ActivityEntry.when | COVERED | U86, U92, U95, U97 |
| ENT-ActivityEntry.what | COVERED | U86, U92, U95, U97 |
| ENT-ActivityEntry.who | COVERED | U86, U92, U95, U97 |
| ENT-DocumentOrder.position | COVERED | U22, U23, U28, U96 |
| ENT-ExampleMark.isExample | SPEC-ONLY → W15 | — |
| ENT-ExampleMark.changed | COVERED | U73, U77 |
| ENT-DataGroup.name | COVERED; CONFLICT → F41 | U04, U21, U23, U98; CONFLICT U22, U24, U28; PARTIAL U27 |
| ENT-Selection.rows | COVERED | U11, U12, U13, U15 |

Not checked against Figma (UI = N):
- FR-001d, FR-003a, FR-004c, FR-005a–c, FR-013b, FR-018a–d, FR-019b, FR-021a, FR-026a–b, FR-028, FR-029a–c, FR-030a–b, FR-031b, FR-034a–c, FR-035b–c, FR-036a, FR-036e–f, FR-040c, FR-043a, FR-049b–c, FR-050d, FR-051, FR-052, FR-055i, FR-056, FR-062a–c, FR-063, FR-064a–b, FR-065a–b, FR-065e, FR-065g, FR-067a, FR-068, FR-069a–b, FR-071b, FR-073a–b, FR-074, FR-075, FR-078a–c, FR-080a–c;
- US8-AS1, US8-AS2, US8-AS4, US8-AS5, US9-AS5;
- EC-2, EC-4, EC-5, EC-8b, EC-9, EC-18, EC-20;
- ENT-StartDate.*, ENT-ActivityEntry.connection, ENT-DeletedConnection.*, ENT-DataGroup.membership, ENT-DataGroup.effect.

FR-004a, FR-009c and FR-045a are UI = N but appear above because a settled item cites them. FR-074 (UI = N) is cited by F32.

## Not audited
UNCERTAIN 0, FAILED 0, RATE_LIMIT 0. The 52 OUT units below are coverage gaps. Where they may draw an excluded item, the cited decisions settle it:
- U09 Note · 11b · Rule logic table (annotation kept whole)
- U10 Start · 1 · Log in
- U19 Connection · 1 · Create connection
- U20 Documents 1 · A1–A4 (no documents yet). Any coming-soon hint is not built: CLAR #6, F15
- U25 Documents 2 · A13, A14 (Set rules with a document that has no data)
- U26 Documents 2 · V9 (deselect data that rules use)
- U29–U57 Rules 1 to 10. "Group with other rules" is not built there either: CLAR #9, F19. Unlink: CLAR #5, F14
- U59–U62, U64 Rules 11 (11.1–11.13) and Rules 12 (sticky selection bar)
- U66–U72, U74 Test 1 · 3–15, 18–20:
  - Generate all / Generate again: CLAR #7;
  - met message: F18;
  - example banner: W15.
- U83, U84 P9b, P9c (Summary tabs Ambulance, School transport). "Download PDF" is not built: CLAR #4, F12
- U85 P9d (published summary with findings): not built, CLAR #21, F17
- U101 How other tools do it (research, not app UI)
