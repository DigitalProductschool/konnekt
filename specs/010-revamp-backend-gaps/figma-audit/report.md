# Figma ↔ spec audit — 2026-11-10

## Summary
Units audited 49/101 (OUT 52, UNCERTAIN 0, FAILED 0). Figma calls: 1 in this remap (U100, per units.md; the other 45 remapped units reused their inventories). 115 across the whole audit (mapper 1, unit files 114).

This run was a remap. The report is built from the 49 unit files and the rebuilt `requirements.md` (390 items; `changes.md`: 79 added, 11 changed). U75, U77 and U78 were not remapped. Items found in several units count once: "Download PDF", for example, appears in 19 units and is the single item F12.

The spec has no "Figma decides wording" governance. `RULE wording` therefore sends copy-only drift to "Figma must change", and there is no "Copy from outside the frontend" section. All 26 Clarifications of 2026-11-10 are design decisions except #2. Every UI requirement that no frame draws is settled by one of them, so no spec-only item is open.

| category | count |
|---|---|
| Conflicts (open) | 4 |
| Spec-only (open) | 0 |
| Figma-only — behavioural (open) | 3 |
| Partial matches (open) | 4 |
| Figma-only — cosmetic (FYI) | 14 |
| Figma must change (decided) | 27 |
| Build without frames (decided) | 18 |
| Clarify questions | 11 |

Top 5 issues (open items only):
1. **Data groups (P9), Partial #2.** The frames place Driving licence's groups and items differently from FR-077b/FR-078d and note 20: "Other details" is not last, Birth shows 5 items instead of 6, and Other details shows more than 1. CLAR #6 adopted the drawn groups, but the frames still differ (Q9).
2. **Welcome page, Conflict #1.** Note 16 says the welcome page has one button. FR-053a, 1b and 1g put "Start from an example" beside "Create connection" (Q1).
3. **Leaving the create flow, Behavioural #3.** Frame 2 asks "Leave this connection?" with "Discard connection", while 6a saves silently. The two contradict each other, and the first may delete data (Q7).
4. **Links card, Partial #1.** On the page reached after publishing (P9, P10), the Links card stays open while Summary or Activity is open. FR-022d allows only one open card (Q8).
5. **Scope of the build notes, Behavioural #1.** The notes restate or change spec 001–009 behaviour outside the nine items, and note 23 says "v9 builds every change since v8". The spec ports only the nine items (Q5).

## Conflicts
| # | req | Figma (unit, node-id) | conflict |
|---|---|---|---|
| 1 | FR-053a, US7-AS1 | U04 6703:39317 (note 16) | Note 16, updated 06.11.2026, says the empty state has "one Create connection button". FR-053a and frames 1b and 1g (U11 6793:47828, U18 6793:47706) add "Start from an example" beside it → Q1 |
| 2 | FR-056 | U18 7344:96398, 7344:96454 (1i, 1i-c) | The example's variant tabs carry a count badge ("1", component "Rules/Variant tab · fixes"). If it counts findings, the example is not finding-free [35%] → Q2 |
| 3 | FR-055d–g, FR-060b | U73 7137:50091, 7137:50181, 7137:50210 (16b) | 16b is the unchanged example, yet the test step behind the dialog shows a "School transport" variant and Standard Rules 03–04. The dialog lists only "Standard · 2 rules" [55%] → Q3 |
| 4 | OUT-7 | U93 7362:54923 (V-Draft · S2); U07 7370:55192 (note 36) | View-only draft details without "Edit" need roles, which OUT-7 excludes. Notes 12, 36 and 37 also mark this out of scope → Q4 |

## Spec-only (not in Figma)
None open. Every UI requirement that no unit covers is settled by a decision and listed under "Build without frames" (W1–W18).

| # | req | prio | expected surface | note |
|---|---|---|---|---|
| — | — | — | — | — |

## Figma-only — behavioural
| # | item | where (units, node-ids) | suggested requirement |
|---|---|---|---|
| 1 | Behaviour of specs 001–009 that build notes and frames restate or change outside the nine items. Sub-items a–n below; includes U01 #6, #8 and U05 #9 (mapped PARTIAL) and U06 #15 | U01, U02, U04–U07, U11–U14, U17, U21–U24, U58, U65, U73, U77, U79, U88–U90, U96, U98, U99 (node-ids per sub-item) | None: FR-074 keeps them as built → Q5 |
| 2 | Tooltip with the full text of a cut description on overview rows (1k). Note 37 #2 leaves keyboard and touch access open | U13 7366:55201, 7366:55276; U04 6703:39317 (note 16); U08 7370:55195 (note 37) | "A cut description shows its full text in a tooltip on hover and on keyboard focus of the name; none when it fits" → Q6 |
| 3 | Frame 2 "Leave this connection?" in the create flow ("Discard connection" / "Save progress") contradicts 6a, where the same click saves silently like Save and exit | U17 7173:52656, 7173:52682; 6890:46052; 6401:71899; 6699:48002 | A rule for when the dialog shows and what "Discard connection" deletes → Q7 |

Sub-items of Behavioural #1 (all mapped as baseline):
- a. **Menus and popups** (notes 3, 31): top layer, never clipped, open down or up, max height, inner scroll, close on Esc, outside click or choosing, arrow keys. U01 6637:36646; U06 7137:50569 (item 53); U07 7370:55183 (item 11).
- b. **Shell and layout** (notes 2, 4, 5, 15, 30, 31):
  - step line as a progressbar, hidden on the Published page;
  - sticky header and footer;
  - documents step fills the window at ≥ 800 px;
  - rules header and tabs pinned;
  - Publish disabled with "Save the rule first" / "Finish grouping first";
  - disabled buttons explain why on hover;
  - fades and skeletons.

  U01 6637:36649, 6637:36652; U02 6637:36655; U06 7127:49610 (items 34, 45, 47), 7137:50569 (item 54, except reduced motion: F22).
- c. **Overview rows and search** (note 16):
  - start screen; × clears the search; "<n> of <m> connections";
  - "No connections match …" and "Clear search";
  - the name opens View;
  - a description line under the name, and no rule count;
  - rows scroll inside the card.

  U04 6703:39317; U11 6699:44519, 6699:44521, 6699:44580, 6699:44629, 6699:44631; U12 6699:44931, 7173:52294; U13 7366:55201; U17 6699:48028; U05 6716:41045 (item 19); hidden "View (disabled…)" layers U11 6699:44552, U12 6699:44942.
- d. **Create and documents steps** (notes 18, 19, 28):
  - name required, no Connection ID, "Choose documents", Save and exit with an empty name just leaves;
  - Set rules disabled with "Add a document first";
  - V6a and V6;
  - Add document button states;
  - the documents list shows no "x of y" (note 28 and the frames), while note 19 says it does.

  U04 6703:39323, 6711:39375; U05 6716:41042 (items 5, 6); U06 6791:46863 (item 15).
- e. **Removing a document** (A10, A11): "Remove Driving licence?", "Keep document" / "Remove document". When rules use the document, the body names them: "…2 rules check its data: Rule 02 and Rule 03 in Standard. Edit or delete them before you publish." U23 7298:62322; U24 7298:62500.
- f. **Rules step** (notes 21, 26, 28; 10.9–10.11):
  - linked and not-linked variants;
  - finding severities, one banner per tab, tab icon, hover order;
  - footer without Skip; "Restore rule".

  U05 6711:39381; U06 6760:48852, 6791:46863; U58 6522:32982–6522:33103.
- g. **Test step** (note 29): layout, result table, the Edit data toast, the applicant kept across variants, skeleton, error, the green ✓ only in Test, and the red dot plus bold. U06 7058:63148; U65 7057:58754, 7057:59073; U73 7058:62040.
- h. **Publish dialog** (P2, P2b, P5):
  - rule counts per variant;
  - findings as "1 warning on Ambulance" (P2) or as per-variant sentences (P2b);
  - findings don't block publishing;
  - "Back to test" and ×.

  U77 6376:26181, 6760:47979; U73 7058:62120; U79 6376:27178.
- i. **Edit flow** (note 25):
  - step-1 edit copy;
  - clickable step bar;
  - "Check rules again" and "Changes saved.";
  - a variant deleted while editing goes on save;
  - drafts edit like creating;
  - beforeunload.

  U05 6730:40340; U98 6731:39827; U99 6730:39810.
- j. **Leaving and logging out** (Start 3, notes 30, 31): the header acts as Save and exit (6a → 6 → 7, "Draft saved."). "Save before you log out?" with "Log out anyway" / "Save and log out". U17 6408:72919, 6890:46052, 6401:71899, 6699:48002; U06 7127:49610 (items 31, 32), 7137:50569 (item 51).
- k. **Details** (notes 33, 36):
  - a truncated URL copies in full;
  - View or the name opens a draft's details;
  - a draft's Links card has no links, and its footer is as drawn;
  - copy buttons are disabled while deactivated.

  U07 7370:55183, 7370:55192; U89 6417:31309, 6417:31325, 6417:31331, 6417:31337; U96 7246:56338.
- l. **Delete and deactivate dialogs** (note 17, frames 3/4, P15):
  - note 17's active sentence "Both links stop working and applicants can't use it anymore." against the frames' (and product's) "This connection is active. Citizens won’t be able to use it, and its links stop working.";
  - a deactivated connection reuses the draft's body;
  - the scrim does not close the dialog;
  - P15's title, first and third sentences, and buttons.

  U04 6703:39320; U14 6699:44419, 6699:44480; U90 6417:31599; U88 6417:31206.
- m. **Toast types** (note 24): neutral for "logged out" and for "couldn't save" with Retry. U05 6720:39042.
- n. **Scope** (note 23): "v9 builds every change since v8", while FR-070a ports the nine items only. U05 6716:41045.

## Partial matches
| # | req | where | difference |
|---|---|---|---|
| 1 | FR-022d, US3-AS2 | U82 6396:47966 (P9); U86 6396:48338, 6396:48520 (P10) | The Links card is fully shown, with no toggle, while Summary (P9) or Activity (P10) is open. The V-frames (U91–U97) close it → Q8 |
| 2 | FR-077b, FR-078d, US9-AS1, FR-050f, ENT-DataGroup.name | U22 7290:62357, 7290:62967; U23 7298:61791; U24 7298:62402–7298:62447; U27 7298:63343–7298:63380; U28 7298:64184–7298:64220 | Groups read Name, Birth, Address, Licence, Other details, Document, Appearance. FR-077b and CLAR #6 put Document before the own groups and Other details last. Birth draws 5 items (FR-078d: 6), Other details "Nationality, …" (1), Appearance 4 + "…" (6). CLAR 2026-11-10 #6 adopted the drawn groups; the frames still differ → Q9 |
| 3 | FR-019a, FR-019d, FR-017d | U18 6793:47807 (1j) | The just-created example's row reads "Edited 23.10.2026" with no step. Whether creating it records "Connection step" is open; CLAR 2026-11-10 #12 covers drafts with no recorded step → Q10 |
| 4 | FR-081b | U07 7370:55186 (note 34) | Note 34 names the tertiary button "Discard changes". 1m and 1n draw "Discard" (U16 7362:54556; layer "Discard changes"), and FR-081b follows them (CLAR 2026-11-10 #20) → Q11 |

## Figma-only — cosmetic (FYI)
| # | item | where (units, node-ids) | note |
|---|---|---|---|
| 1 | Build-note headings, dates, cross-references and to-do lines; hidden "Old · …" layers | U01 6637:36637; U02 6637:36655 (item 4), 6637:36667; U05 6716:41045 (items 11, 13); U06 7137:50569 (item 55); U08 7370:55194; hidden e.g. U11 6699:44262, U65 7057:58725, U75 6376:25344, U80 7355:61159, U91 7355:60519, U99 7355:60477 | Nothing to build; hidden layers are not ported (FR-070a) |
| 2 | Typography, spacing, colours, info-icon colours, dialog widths, toast position | U01 6637:36652; U02 6637:36667 (item 16); U03 6650:38288, 6703:39311, 6703:39314; U05 6716:41042, 6720:39042 (item 25); U06 6760:48852, 6791:46863, 7058:63148 (item 28); U07 7370:55180, 7370:55183, 7370:55189, 7370:55192 | Ported as drawn with the Revamp tokens |
| 3 | Art and status icons | U02 6637:36664; U11 6699:44509; U18 6793:47707; U81 7355:61825; U89 7355:61535; U91 7355:60521; U92 7355:60607; U93 7362:54716; U94 7355:60682, 7355:60695; U97 7355:61012, 7355:61029 | Status is also in text (FR-072a) |
| 4 | Scrims, scrollbars, temporary parts | U22 7290:62450; U23 7298:61884, 7298:62321; U24 7298:62499; U28 7298:64276; U65 7114:49642; U75 6376:25535; U77 6376:26180; U79 6376:27177; U88 6417:31205; U90 6417:31598; U100 7173:52770 | Scrim click follows the project's dialog rule |
| 5 | Baseline copy shown as context: column headers, overview title, welcome hero, step headers, connection card | U11 6699:44255–6699:44257, 6699:44491; U13 6739:40523; U14 6699:44374; U16 7362:54566; U17 6701:39455; U18 6793:47684, 6793:47723, 7344:96393; U22 7290:62338; U28 7298:64163 | Unchanged (FR-074) |
| 6 | The overview sentence "…or view an active connection to get its links." leaves out scheduled connections' links | U11 6699:44246; U12 6699:44919; U14 6699:44365 | No requirement contradicts it (FR-004b); kept as built |
| 7 | The date in the scheduled delete body is set in a monospaced face | U14 6872:45929 | Use the dialog's text face |
| 8 | Sample-data inconsistencies (not data to port) | U12 6699:44921 (20 vs 14 rows); U13 6699:44358 (Laura / lena); U63 7112:48923 vs 7112:48859; U73 7058:62120; U89 7173:52959; U97 7246:56955; U98 7296:52334 vs 6730:39464; U99 6890:46206; U13 6739:40596 | — |
| 9 | "Create connection" stays in the footer while rows are selected | U15 6699:45258 | RULE ui-detail: built as designed |
| 10 | Select-all hidden while no row is listed (1d) | U11 6699:44584 | RULE ui-detail: built as designed |
| 11 | The dragged row leaves the list during a drag; only the line and the copy show | U27 7298:63333, 7298:63752 | RULE ui-detail: built as designed (reduced motion: F22) |
| 12 | After removing the open document, the first remaining one opens | U24 7298:62570, 7298:62624 | RULE ui-detail: built as designed |
| 13 | Details opened from View land with the Summary card open | U91 7203:50468; U93 7362:54691; U94 7246:52715; U96 7246:55146; U07 7370:55192 | RULE ui-detail: built as designed, within FR-022d |
| 14 | "Add document" pinned above the list; never moves while the list scrolls or a drag runs | U21 7294:61507; U27 7298:63330; U28 7298:64170 | RULE ui-detail: built as designed |

## Figma must change (decided)
Build these as the spec says, keeping Figma's layout and styling, until the design is updated.

| # | req | Figma (unit, node-ids) | Figma shows | build instead | decision |
|---|---|---|---|---|---|
| F1 | FR-071d | U01 6637:36640 (note 1) | `<html lang="en" …>` in every page | `lang` follows the chosen language ("en" or "de", spec 009, as built). `data-kern-theme="light"` and the color-scheme meta stay | CLAR 2026-11-10 #26 |
| F2 | FR-014c, FR-043c | U02 6637:36658 (note 7) | The slim alert is "title only, one line, 64 px" | Spec 008's failure alert with its error ID: slim, but wrapping to fit the error ID; never the large two-part alert | CLAR 2026-11-10 #23 |
| F3 | FR-001a, FR-011a, US1-AS1 | U02 6637:36661 (note 8); U75 6383:66097 (frame name "Becomes active on a date") | "Becomes active" label | "Active from" | RULE wording |
| F4 | FR-076f, OUT-1 | U03 6703:39311 (note 14); U99 6890:46197 (E5a name) | A row reads "Changes not published" while an active connection is edited | No row ever reads it; an active row stays "Active" · "Published <date>" | CLAR 2026-11-10 #3 |
| F5 | FR-076a, OUT-1 | U98 6730:39124 (E2: "Active · unpublished changes"); U99 6890:46199 (E5a), 7173:52812 (E5b); U100 7173:52748 (E7); U05 6730:40340 (note 25, item 30) | Edit-flow header "Active" + "Draft changes" | Only the status pill: "Active", or "Scheduled · <date>" as E6 draws it (U99 7114:49835) | CLAR 2026-11-10 #3 |
| F6 | FR-076b, FR-076e, OUT-1 | U05 6730:40340 (note 25, items 29, 33); U06 7127:49610 (note 30, item 30), 6791:46863 (note 28, "Later: Discard changes") | Footer with "Keep draft and exit"; toast "Draft kept. Your changes take effect when you save them."; "Discard changes" listed as later | Footer "Back · Discard changes · <next step> · Save" (no Back on step 1, no next step on Test). No "Keep draft and exit", no "Draft kept" toast | CLAR 2026-11-10 #3 |
| F7 | FR-076c, FR-076d, OUT-1 | U99 6890:46197 (E5a); U05 6730:40340 (item 37); U06 7127:49610 (item 31) | Konnekt / "Your connections" while editing saves like Save and exit and keeps a draft | E5b "Save your changes?" (U99 7173:52836): "If you leave now, your changes are lost. Save them, or discard them and keep the active version.", with "Discard changes" and "Save". Scheduled version: W7 | CLAR 2026-11-10 #3 |
| F8 | FR-009f | U98 6730:39464 (E3); U05 6730:40340 (item 31) | "Citizens get the new version from the time you choose. Your links stay the same." | Spec 008's body as built: "Citizens keep using the current version until you save. Requests already in progress keep the data and rules they started with." Scheduled sentence: W6 | CLAR 2026-11-10 #1 |
| F9 | FR-009e, US1-AS11, OUT-12 | U98 6730:39464 (E3) | "Active from" radios ("Now" / "On a date") in "Save changes?" | No "Active from"; "Save changes" takes effect at once | CLAR 2026-11-10 #1 |
| F10 | FR-009d, FR-009c, US1-AS11 | U87 6396:48860 (P12) | Hint "Until that date, citizens can't start a new request. Requests already started still finish." | "Until that date, citizens can't start a new request. Requests in progress are cancelled." | CLAR 2026-11-10 #1 |
| F11 | FR-074 (F13), OUT-2 | U88 6417:31206 (P15) | Sentence 2: "Requests already started still finish." | Spec 008's body as built: "The connection will be deactivated and its links will stop working at once. Requests in progress are cancelled. Remember to remove the wallet connection from your service." | RULE wording |
| F12 | FR-076g, OUT-5 | Active: U58 6530:40742; U63 7112:48928; U80 6396:47755; U81 6809:46580; U82 6396:48196; U86 6396:48385; U87 6396:48846; U88 6417:30965; U90 6417:31518; U91 7203:50536, 7246:51508; U92 7246:52087, 7246:52713; U99 6730:39800. Scheduled: U86 6396:48655; U94 7246:52805, 7246:53935; U95 7246:54516, 7246:55144. Deactivated: U89 6417:31343; U96 7246:55236, 7246:56372; U97 7246:56956, 7246:57587. Draft: U93 7362:54813, 7362:55045. Note 36: U07 7370:55192 | "Download PDF" in the Summary card; note 36's draft PDF sentence | No "Download PDF". The header shows "Summary", the count line and "View summary" / "Hide summary" | CLAR 2026-11-10 #4 |
| F13 | FR-076h, FR-076i, OUT-8 | U89 6417:31447 (P16 toast); U05 6720:39042 (note 24, items 21, 24) | "Connection deactivated." with "Undo"; "Everything destructive gets Undo …: deleted, removed, deactivated, unlinked." | "Connection deactivated." success toast without "Undo". Only deleting a connection, removing a document and the rules step's existing undos offer "Undo"; note 24's list reads "deleted, removed" | CLAR 2026-11-10 #5 |
| F14 | OUT-6 | U05 6711:39381 (note 21: 11.2, 11.8, 11.9), 6720:39042 ("unlinked"); U06 6791:46863 (note 28: strip link, 3.16) | "Unlink from Standard": menu item, confirmation, toast "Unlinked from Standard." with Undo, and the strip link | Not built; a linked variant stays linked | CLAR 2026-11-10 #5 |
| F15 | FR-076j, FR-076l, OUT-7 | U21 7295:61184; U04 6711:39375 (note 19) | "12 more documents are coming soon. Search to see them."; "Coming soon" documents shown when searched | Only the wallet's documents ("Available", "Added"), no hint line; search finds wallet documents only | CLAR 2026-11-10 #6 |
| F16 | FR-076k | U22 7294:61852 | "Everything in the wallet is added. Search to see what's coming soon." | "Everything in the wallet is added." | CLAR 2026-11-10 #6 |
| F17 | FR-076q, FR-076r, OUT-21 | U06 6760:48852 (note 26; P9d U85 not audited) | "Published summary lists the same lines (P9d)" | No findings in the details' Summary; a tab's ⓘ shows only the variant's description (as 1i-b, U18 7344:96441) | CLAR 2026-11-10 #21 |
| F18 | FR-076m, FR-076n, OUT-4 | U65 7057:59533–7057:59535; U06 7058:63148 (note 29, item 21) | Green box "Message Anna reads" / "Your wallet data meets the requirements. Other documents are checked separately." | "Result: meets the rules" with the list "Rules <name> meets"; no message box | CLAR 2026-11-10 #8 |
| F19 | FR-076o, OUT-6 | U58 6522:33026 | "Group with other rules" in the group ⋯ menu | In a variant: "Add message", "Reset to Standard", divider, "Remove from <variant>" | CLAR 2026-11-10 #9 |
| F20 | FR-076p, OUT-3 | U13 6699:44358 | Email line "lena.weber@example.org" in the user menu | Name, divider, "Log out" | CLAR 2026-11-10 #10 |
| F21 | FR-082a, FR-082b, FR-036c | U06 7127:49610 (note 30: "Toasts stay 5 s"); U24 7298:62552 (A12: "toast with Undo (5 s)") | 5 s | Every toast closes by itself after 6 s; the time runs only while neither the pointer nor the keyboard focus is on it | CLAR 2026-11-10 #22 |
| F22 | EC-17 | U06 7137:50569 (note 31) | "With prefers-reduced-motion: fades only" | With reduced motion, dragging and reordering have no transitions and the drop just updates the list; everything else follows spec 008's rule | CLAR 2026-11-10 #25 |
| F23 | FR-017a, US2-AS1 | U90 6699:48064 (P18) | Active row "Edited 12.09.2026" | "Published 12.09.2026" | CLAR 2026-11-10 #12 |
| F24 | FR-053a, US7-AS1 | U11 6793:47828 (1b) | "Start with an example" | "Start from an example" | RULE wording |
| F25 | FR-045a, FR-045b, FR-050a | U21 7294:61510; U22 7294:61686, 7294:61850; U23 7298:61781; U24 7298:62390; U27 7298:63333, 7298:63752; U98 7298:63260 | Layer "Added list · scrolls, oldest first" | The team member's order: added documents go to the end and moves change it. R3 names the layer "Added list · scrolls, in the order staff set" (U28 7298:64173) | RULE wording |
| F26 | FR-038b | U17 6699:48025, 6699:48036; U16 7362:54584, 7362:54594; U12 6699:45023, 6699:45036 | Checkbox and delete layers named after another row ("… Hunting licence") | Each control named after its own row: "Select <name>", "Delete <name>" | RULE wording |
| F27 | FR-004a | U93 7362:54708 (S2 7362:54940), 7362:54909 | Draft band: "…They become active when this connection is published."; Links card: "Created when the connection is published and active." | Band: "The links can’t be added to your services yet. They are created when this connection is published." Links card: "Created when the connection is published." | RULE wording |

## Build without frames (decided)
| # | req | expected surface | build from (nearest frame or KERN pattern) | decision |
|---|---|---|---|---|
| W1 | FR-003d, FR-003e, EC-1 | Publish dialog; Change start date; Activate again | P1c's error state (U76 6635:36265): red field, "Enter a date after today." under it, button stays enabled. Also shown when the day changed while the dialog was open, in P1b (U75 6383:66119), P12 (U87 6396:48860) and P16b (U89 7173:52959) | CLAR 2026-11-10 #11 |
| W2 | FR-008d, FR-008f | Change start date; details | P12 (U87 6396:48860) with "Now" selected; "Save date" makes the connection active at once. The details then show the active band with "Active since <date>, <time>" (U80 7355:61155) | CLAR 2026-11-10 #11 |
| W3 | FR-008e | Toast | Success toast (note 24, U05 6720:39042), placed like P16's (U89 6417:31447): "Start date saved."; 6 s (F21) | CLAR 2026-11-10 #11 |
| W4 | FR-011c, FR-011d, FR-011e | Activate again dialog | P16b (U89 7173:52959) with "On a date": date field under the radios as in P1b (U75 6383:66119), hint written in this feature, button "Schedule" | CLAR 2026-11-10 #11 |
| W5 | FR-012b | Deactivate dialog | P15 (U88 6417:31206) with this feature's sentence for a connection that was never active (sentence 2 as F11) | CLAR 2026-11-10 #11 |
| W6 | FR-013c | Save changes dialog | E3 (U98 6730:39464) with this feature's sentence for a scheduled connection, and no "Active from" (F9) | CLAR 2026-11-10 #11 |
| W7 | FR-013d, FR-013e, FR-013f, FR-013g, FR-013h, US1-AS9 | Edit entry confirmation; step-1 note; leave and discard dialogs | Entry (U87 6396:49030; the row's "Edit “<name>”?" title stays, U15 6699:47905): title "Edit this scheduled connection?", body "Your changes only take effect when you save them. Saved changes become active on <date>." Step-1 note (U98 6731:39846): "Scheduled. Your changes become active on <date> once you save them." E5b (U99 7173:52836): "If you leave now, your changes are lost. Save them, or discard them and keep the scheduled version." E7 (U100 7173:52772): "The connection goes back to the version that becomes active on <date>. Citizens aren't affected." German per FR-071 | CLAR 2026-11-10 #24 |
| W8 | FR-014b, FR-014c, FR-043c | Publish, Activate again and Change start date dialogs; bulk delete dialog | P5's layout (U79 6376:27178) with spec 008's failure alert and its error ID (slim, may wrap; F2). P5's sentence shows only when no answer came. "Try again" repeats "Now" or "On a date" with the entered date. A failed reactivation or date change leaves the connection unchanged | CLAR 2026-11-10 #23 |
| W9 | FR-021b, EC-8a, US2-AS6 | Overview; details | Overview date column (U11–U18, U90) and date pill (U80 7355:61155). Rows: "Published <stored publication date>" or "Deactivated <last change time>"; pills: "Active since <publication>". Reactivation moves only "Active since" | CLAR 2026-11-10 #12 |
| W10 | FR-025b, FR-025d (removed, renamed), FR-025g, FR-025h, FR-025j, FR-025k, FR-025m, FR-027b, FR-027c, FR-027d, FR-031a, FR-032a, FR-032b, FR-044c, EC-8c, EC-10, US3-AS4, US3-AS5, US3-AS6 | Activity card | The drawn row (date and time · event · person) of the open card (U86 6396:48527, U92 7246:52096, U95 7246:54525–7246:54545, U97 7246:56965) and the closed line (U80 6396:47761, U89 6417:31345, U96 7246:55328, U97 7246:57191). Build these with the spec's wording:<br>• the scheduling entry with its date, which U95's scheduled connection lacks;<br>• name or description changed;<br>• variant removed or renamed;<br>• became active, with no person;<br>• activated again;<br>• deleted and restored, also after a bulk delete;<br>• member with agent, approver with asking agent, middleware entries without a person;<br>• pre-existing "Created" / "Published" without a person, and the closed line with the time alone;<br>• the list scrolls to the oldest entry;<br>• every team member can read it. | CLAR 2026-11-10 #13 (FR-044c: #15) |
| W11 | FR-034d, FR-034e, FR-036d, FR-037a, FR-037b, US4-AS2, US4-AS3, US4-AS4, EC-6, EC-7 | Overview; toast; welcome page | P18 (U90 6699:48039, 6699:48098) and 1b (U11 6699:44481):<br>• after "Undo" the row returns without a reload and is announced politely: "“<name>” restored.";<br>• a late or second "Undo" changes nothing and the toast reads "“<name>” can no longer be restored.";<br>• deleting the last connection shows 1b with the toast, and "Undo" brings back the overview;<br>• a replaced toast or a left page leaves the deletion standing;<br>• the toast closes after 6 s (F21). | CLAR 2026-11-10 #14, #22 |
| W12 | FR-039b, FR-043b, FR-044a, FR-044b, US5-AS3, US5-AS4, EC-12, EC-13 | Selection bar; bulk delete dialog; overview; toast | Selection bar (U15 6699:45206), bulk dialog (U15 6699:45320), toast (U90 6699:48098):<br>• the count is announced when it changes;<br>• when a selected connection vanished or changed: "Nothing was deleted: “<name>” was deleted or changed in the meantime.";<br>• after deletion the rows are gone, the selection clears, the toolbar returns and the toast reads "<n> connections deleted." with "Undo";<br>• a row that vanishes on refresh leaves the selection;<br>• a long list scrolls inside the dialog while its buttons stay in view. | CLAR 2026-11-10 #15 |
| W13 | FR-046e, FR-047a, FR-047b, FR-047c, FR-047d, FR-047e, FR-049a (edit flow), FR-049d, US6-AS3, US6-AS5, EC-15 | Documents step (create and edit flows) | A ⋯ menu button on each document row (spec 008's menu pattern):<br>• it holds "Move up" and "Move down"; the first row has no "Move up", the last no "Move down";<br>• one document gets no menu (A5, U21 7290:61204);<br>• focus stays on the moved row, and the move is announced: "“<document>” moved to position <n> of <m>.";<br>• Escape or a drop outside the list restores the order;<br>• E1b (U98 7298:63260) gets the same drag and menu.<br>Rows: U22 7290:62348, 7290:62349; U23 7298:61782, 7298:61783; U24 7298:62391, 7298:62392; U27; U28 7298:64174, 7298:64175. Notes 19, 23 and 37: U04 6711:39375, U05 6716:41045, U08 7370:55195 | CLAR 2026-11-10 #16 |
| W14 | FR-050c, FR-060c, FR-065c, FR-065d, FR-065f, FR-065h, FR-066a, FR-066b, FR-067b, US8-AS3 | Approval page (spec 007; not in the file) | The existing approval page, with the spec's wording:<br>• the stored document order;<br>• "This is still the example. Check that the name, documents and rules fit your service.";<br>• "Active from <date>", or that the connection goes live at once;<br>• FR-065d's sentence, written in this feature;<br>• the refusal reasons;<br>• deactivating and deleting a scheduled connection;<br>• no "Undo". | CLAR 2026-11-10 #17 |
| W15 | FR-058d, FR-058f, FR-059, FR-061, EC-19, ENT-ExampleMark.isExample | Wizard (documents and test steps); details | The "Rules/Findings banner" from 1h (U18 6798:122695): "This is an example. Change anything to see how it works." on the documents and test steps. On the test step it sits above the variant tabs (16b, U73 7137:50086), as on the rules step (U18 7344:96396). No banner and no publish line after publishing; texts in the current language. Frames that reuse the example's rules for a plain connection (U65, U76 6635:36265, U77, U78) need nothing | CLAR 2026-11-10 #18 |
| W16 | EC-21 | Every new control | `narrow:` variant and `docs/KERN-DESIGN-SYSTEM.md` §3.1: date pill with ⋯ (U80 7355:61155), "Active from" group and date field (U75 6383:66119), selection bar (U15 6699:45206), bulk dialog (U15 6699:45320), Activity card (U92 7246:52096), reorder menu (W13) | CLAR 2026-11-10 #19 |
| W17 | FR-081f, US5-AS6 | Overview (local drafts banner, selection bar) | 1m / 1n (U16 7362:54550–7362:54557, 7362:54621–7362:54634) stay above the selection bar (U15 6699:45206) while rows are selected. Device-only connections are neither counted nor selectable | CLAR 2026-11-10 #20 |
| W18 | FR-077d, FR-079c, FR-079d, US9-AS4 | Documents step (data item panel; rules question dialog) | A document with 10 data items or fewer keeps today's flat list. Clearing a group asks the existing "All data items" question (002-S1.1), with group wording written in this feature. Panels: U21 7290:61211, U22 7290:62356, U98 7296:52340 | CLAR 2026-11-10 #6 |

## Clarify questions
**Q1 (Conflict #1, FR-053a).** Note 16 says the welcome page has "one Create connection button". FR-053a, 1b and 1g put "Start from an example" beside it. Keep FR-053a, or follow note 16?
- Impact:
  - Welcome page: 1b U11 6699:44508, 6793:47828 (its label is F24); 1g U18 6793:47705, 6793:47706; example dialog U18 6793:47710.
  - Notes: note 16 U04 6703:39317; note 28 U06 6791:46863 (item 16); note 31 U06 7137:50569 (items 48, 52).
  - Overview footers stay "Create connection" only either way (FR-053b).
- (a) Keep FR-053a (recommended). The welcome page shows "Create connection →" (primary) and "Start from an example" (secondary) beside it, as 1g draws. Figma corrects note 16 to "Create connection and Start from an example". Nothing else changes.
- (b) Note 16 wins: one button. The example (FR-053 to FR-061, US7, EC-18 to EC-20) leaves the feature: no example dialog, no banners (1h, 1i, 1i-c), no publish line (16b) and no example line on the approval page. This supersedes CLAR 2026-11-10 #18 and the example line of #17.

**Q2 (Conflict #2, FR-056).** What is the "1" badge on the example's variant tabs?
- Impact:
  - Example rules step: 1i U18 7344:96398; 1i-c U18 7344:96454.
  - The same component "Rules/Variant tab · fixes" on the Summary tab (U94 7246:52833, FR-076r).
  - Tab icons of note 26 (U06 6760:48852, item 4) and note 35 (U07 7370:55189, item 15).
- (a) It is the tab's ⓘ, not a count. The example's tabs show the ⓘ with the variant's description, as 1i-b (U18 7344:96441) and the Summary tabs do. Figma removes the stray "1".
- (b) It is a findings count. The example has no findings (FR-056), so its tabs show no badge. On other connections the rules step's tab icons stay as spec 003 built them (note 26). Figma removes it from 1i and 1i-c.
- (c) It is a new count, such as rules changed here. Not built in this feature (FR-074).
- With any answer, nothing is built on the example's tabs; the answer only decides what Figma removes or relabels. Option (a) agrees with CLAR 2026-11-10 #21; no Clarification is contradicted.

**Q3 (Conflict #3, FR-055, FR-060b).** 16b shows a changed example behind the "unchanged example" dialog. Is that a design slip?
- Impact:
  - Test step: U73 7137:50091 (tabs Standard, Ambulance, School transport), 7137:50181 (Rules 01–04).
  - Publish dialog: 16b U73 7137:50210 ("Standard · 2 rules" and the example line); 16 U73 7058:62120.
  - Example: 1i / 1i-c U18 7344:96406–7344:96465; example dialog body "…with 2 documents and 2 rules" (U18 6793:47710).
- (a) Slip (recommended). The unchanged example is FR-055's: Standard with Rules 01–02, and Ambulance with Rules 01–02 changed. The publish summary lists "Standard · 2 rules" and "Ambulance · 2 rules". The example line shows only while nothing has changed (FR-060b). Figma redraws 16b's background from 1i and adds Ambulance to the summary.
- (b) The example includes "School transport" and Rules 03–04 as drawn. FR-055 and the example dialog's "2 documents and 2 rules" are amended, and 1i / 1i-c are redrawn. No Clarification is contradicted.

**Q4 (Conflict #4, OUT-7).** V-Draft · S2 draws view-only draft details without "Edit" ("needs roles"). Build it, or not?
- Impact:
  - Draft details: U93 7362:54923 (S2), 7362:54920 ("Edit connection" in S), 7362:55152 (S2's hidden Edit).
  - Notes: note 12 U03 6648:42016; note 36 U07 7370:55192; note 37 U08 7370:55195.
- (a) Not built (recommended). Every team member sees "Edit connection" on a draft's details (V-Draft · S). S2 stays a design for a later roles feature, and Figma keeps it marked out of scope. No requirement changes.
- (b) Bring roles and view-only users into scope. This needs new requirements for who is view-only and what they see on every page, and contradicts OUT-7.

**Q5 (Behavioural #1, FR-070a, FR-074).** The build notes and frames restate or change spec 001–009 behaviour outside the nine items (sub-items a–n). Keep the product as built, or adopt the drawings?
- Impact: every node listed under sub-items a–n, by surface:
  - menus (a); shell (b); overview (c); create and documents steps (d, e); rules step (f); test step (g);
  - publish dialog (h); edit flow (i); leaving and log-out (j); details (k);
  - delete and deactivate dialogs (l); toasts (m); note 23 (n).
- (a) Baseline (recommended). Sub-items a–n stay as specs 001–009 built them (FR-074), and no requirement is added. Where a frame of the nine items shows them, the build ports the layout and leaves the behaviour. Where a note disagrees with the product, the product stays:
  - d: whether the documents list shows "x of y";
  - e: the remove dialog that names the rules;
  - l: note 17's active sentence;
  - n: note 23's scope.
- (b) Adopt all as drawn. Each sub-item becomes a requirement of this feature, built from its note or frame. Where notes disagree, the frame wins:
  - d: no "x of y" in the documents list;
  - e: the remove dialog names the rules: "Citizens won't be asked for this document any more. <n> rules check its data: <rules> in <variant>. Edit or delete them before you publish.";
  - l: the frames' "This connection is active. Citizens won’t be able to use it, and its links stop working.";
  - k: copy buttons disabled while deactivated;
  - c: a description line under each row's name.
- (c) Adopt some: name the letters. Those are built as in (b); the rest stay as in (a).
- No Clarification is contradicted. Items already settled are not reopened: F6–F7 (note 25's draft path), F13 (note 24), F22 (note 31's reduced motion).

**Q6 (Behavioural #2).** Build the description tooltip (1k) in this feature, and how do keyboard and touch reach it (note 37 #2)?
- Impact:
  - Overview rows with a cut description: U13 6739:40596; U14 7173:52310; U17 6699:48024; U18 6793:47800.
  - 1k: U13 7366:55201, 7366:55276.
  - Notes: note 16 U04 6703:39317; note 37 U08 7370:55195.
- (a) Build 1k now. A cut description shows its full text in Rules/Tooltip on hover and on keyboard focus of the row's name link (FR-072a). Touch shows no tooltip; the full text is on the details (View). No tooltip when the text fits. Figma closes note 37 #2 with this rule.
- (b) Not in this feature. Rows keep spec 008's description line (FR-074), 1k is not ported, and note 37 #2 stays open.
- No Clarification is contradicted.

**Q7 (Behavioural #3).** When does "Leave this connection?" (frame 2) show, and what does "Discard connection" do?
- Impact:
  - Create-flow header links: U17 7173:52656 / 7173:52682 (frame 2), 6890:46052 (6a), 6401:71899 (6 "Saving your draft…"), 6699:48002 (7 "Draft saved. You can pick it up any time.").
  - Notes: note 18 U04 6703:39323 ("with an empty name it just leaves"); note 30 U06 7127:49610 (item 31); note 31 U06 7137:50569 (item 51).
  - The edit flow's E5b (F7) is not affected.
- (a) Frame 2 is for a connection never saved (a new connection with a name, no stored draft):
  - "Discard connection" drops it; nothing was stored, so there is no toast and no "Undo";
  - "Save progress" saves the draft, then 6 → 7;
  - a stored draft keeps 6a's silent save.
- (b) Frame 2 is a slip. 6a applies on every step: the header acts as Save and exit, and with an empty name it just leaves. Frame 2 is not built.
- (c) Frame 2 applies to every draft:
  - "Discard connection" deletes the stored draft and shows FR-033's toast "“<name>” deleted." with "Undo" (6 s);
  - "Save progress" saves as in 6a.
  - This adds a delete path to FR-033, which names only the overview and the details.
- No Clarification is contradicted.

**Q8 (Partial #1, FR-022d).** Does the Links card follow the one-open-card rule on the page reached after publishing or saving?
- Impact:
  - After publish or save: P7 U80 6396:47708; P8 U81 6809:46533; P9 U82 6396:47966; P10 U86 6396:48338, 6396:48520; P12–P17 U87–U90; E4 U99 6730:39754.
  - From View: U91 7203:50843, 7246:51442; U92 7246:51549; U94 7246:52751, 7246:53864; U95 7246:53973; U96 7246:55182, 7246:56300; U97 7246:56410.
  - Note 30: U06 7127:49610 (items 36, 46, 47).
- (a) FR-022d everywhere. Links, Summary and Activity form one accordion on every details page. After publishing or saving, the page lands with Links open (P7, E4), and opening Summary or Activity closes it with "View links". Figma redraws P9 and P10 with Links closed.
- (b) After publishing or saving, Links stays shown without a toggle and only Summary and Activity toggle. From View, all three form one accordion (V-frames). FR-022d is amended for the page reached after publish or save.
- No Clarification is contradicted.

**Q9 (Partial #2, FR-077b, FR-078d).** Which order and counts do Driving licence's data groups follow?
- Impact:
  - Data item panels: U21 7290:61214–7290:61255, 7290:61956 (Personal ID); U22 7290:62357, 7290:62967; U23 7298:61791; U24 7298:62402–7298:62447, 7298:62579–7298:62613; U27 7298:63343–7298:63380; U28 7298:64184–7298:64220; U98 7296:52340.
  - Note 20: U04 6711:39378.
  - The catalog and its frontend mirror (FR-078a); agents' catalog read (FR-080a).
- (a) FR-077b, FR-078d and note 20 win (recommended):
  - groups in the order Name, Birth, Address, Document, Licence, Appearance, Other details (last), flowing down the three columns;
  - membership from the catalog, which must give Name 4, Birth 6, Address 5, Licence 3, Document 6, Appearance 6, Other details 1;
  - the frames' column placement is layout only; Figma redraws A7–A12 and R1–R3, adding Birth's sixth item and leaving one item in Other details.
- (b) The frames win: the order reads Name, Birth, Address, Licence, Other details, Document, Appearance. FR-077b and note 20 are amended so that Other details is not last; counts follow the catalog. This contradicts the order listed in CLAR 2026-11-10 #6.

**Q10 (Partial #3, FR-019).** Does creating the example record a step?
- Impact:
  - Overview rows: 1j U18 6793:47807 / 6793:47800; FR-019 rows U17 6699:48024 ("· Rules step"), U17 6699:47974, U16 7362:54583, U90 6699:48077 ("Edited 03.10.2026").
  - Agents' read of a draft's step (FR-062b).
- (a) Creating the example records "Connection step", where it opens. The row reads "Edited <date> · Connection step" and agents read that step. Figma updates 1j.
- (b) Creating records no step until the team member saves in a step. The row reads "Edited <date>" alone (FR-019d), as 1j draws, and agents read no step.
- Both agree with CLAR 2026-11-10 #12; neither supersedes it.

**Q11 (Partial #4, FR-081b).** The local drafts banner's tertiary button: "Discard" or "Discard changes"?
- Impact:
  - Overview banner: 1m U16 7362:54556; 1n U16 7362:54625–7362:54634; the product's existing banner in both languages (FR-081h).
  - Note 34: U07 7370:55186.
  - The edit flow's "Discard changes" (U98 6731:39850, 7296:52389, 6730:39145; U99 6890:46220, 7114:49808, 7173:52836; U100 7173:52769, 7173:52772) stays either way (FR-076b, FR-076c).
- (a) "Discard", as 1m and 1n draw and FR-081b says (CLAR 2026-11-10 #20). Figma updates note 34 and the layer names.
- (b) "Discard changes" in the banner, as note 34 and the layers say. FR-081b is amended, which changes CLAR 2026-11-10 #20's wording.

## Coverage
UI = Y requirements. "→ F#/W#" marks a settled item; "→ Q#" points to an open question.

| req-id | status | units |
|---|---|---|
| FR-001a | COVERED; PARTIAL (U02 label) → F3 | U01, U63, U73, U75, U76, U77 |
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
| FR-006c | COVERED (U03's PARTIAL resolved by these) | U07, U86, U94, U95, U99 |
| FR-006d | COVERED | U86, U94, U95 |
| FR-006e | COVERED | U86, U94, U95 |
| FR-006f | COVERED | U07, U14, U99 |
| FR-007 | COVERED | U58, U63, U86, U94, U95, U99 |
| FR-008a | COVERED (scheduled menu not drawn open) | U06, U87, U88 |
| FR-008b | COVERED | U01, U87 |
| FR-008c | COVERED | U87 |
| FR-008d | SPEC-ONLY → W2 | — |
| FR-008e | PARTIAL → W3 | U05 |
| FR-008f | SPEC-ONLY → W2 | — |
| FR-009a | COVERED | U58, U80, U87, U88 |
| FR-009b | COVERED | U87 |
| FR-009c (UI N) | CONFLICT → F10 | U87 |
| FR-009d | CONFLICT → F10 | U87 |
| FR-009e | COVERED; CONFLICT (E3 radios) → F9 | U05, U15, U98, U99, U100 |
| FR-009f | CONFLICT → F8 | U05, U98 |
| FR-010 | COVERED | U14 |
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
| FR-015b | COVERED | U58, U63, U80, U81, U82, U86, U88, U90–U92, U99 |
| FR-015c | COVERED | U86, U94, U95 |
| FR-015d | COVERED | U89, U96, U97 |
| FR-015e | COVERED | U04, U93 |
| FR-016a | COVERED; PARTIAL (U01 menu layer) → Q5 | U07, U58, U80, U86, U89, U93 |
| FR-016b | COVERED | U07, U89, U96, U97 |
| FR-017a | COVERED; CONFLICT (U90) → F23 | U11–U18 |
| FR-017b | COVERED | U13, U14 |
| FR-017c | COVERED | U11–U18, U90 |
| FR-017d | COVERED (U11–U15's PARTIAL resolved by FR-019d, CLAR #12); PARTIAL (U18) → Q10 | U06, U16, U17, U90 |
| FR-019a | COVERED; PARTIAL (U18) → Q10 | U06, U17 |
| FR-019c | COVERED | U11, U12, U13, U16, U17 |
| FR-019d | COVERED (the same row in U11–U15) | U16, U17, U90 |
| FR-020a | COVERED | U02, U06, U11, U13, U16, U92 |
| FR-020b | COVERED | U86, U94, U99 |
| FR-021b | SPEC-ONLY → W9 | — |
| FR-022a | COVERED | U04, U58, U63, U80, U92, U93, U97 |
| FR-022b | COVERED | U58, U80, U81, U92, U94, U97 |
| FR-022c | COVERED | U86, U92, U95, U97 |
| FR-022d | COVERED; PARTIAL → Q8 | U06, U80, U89, U91–U97; PARTIAL U82, U86 |
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
| FR-036c | COVERED; PARTIAL (U06) → F21 | U04 |
| FR-036d | COVERED (note only) → W11 | U04 |
| FR-037a | COVERED (note only) → W11 | U06 |
| FR-037b | SPEC-ONLY → W11 | — |
| FR-038a | COVERED | U01, U11–U18, U90 |
| FR-038b | COVERED; PARTIAL (U17) → F26 | U11–U16, U18, U90 |
| FR-038c | COVERED | U11–U18, U90 |
| FR-039a | COVERED | U04, U12–U18, U90 |
| FR-039b | SPEC-ONLY → W12 | — |
| FR-039c | COVERED | U04, U13, U14, U15 |
| FR-040a | COVERED | U01, U14, U15 |
| FR-040b | COVERED | U04, U12, U14, U15 |
| FR-041a | COVERED | U06, U15 |
| FR-041b | COVERED | U04, U15 |
| FR-041c | COVERED | U04, U15 |
| FR-041d | COVERED (note 17 only; lines written in this feature, FR-041) | U04 |
| FR-041e | COVERED | U15 |
| FR-041f | COVERED (note 17 only) | U04 |
| FR-042a | COVERED | U06, U15 |
| FR-042b | COVERED | U06, U15 |
| FR-043b | SPEC-ONLY → W12 | — |
| FR-043c | PARTIAL → F2, W8 | U02 |
| FR-044a | SPEC-ONLY → W12 | — |
| FR-044b | COVERED (notes only) → W12 | U04, U05 |
| FR-044c | SPEC-ONLY → W10 | — |
| FR-045a (UI N) | PARTIAL → F25 | U21, U23, U24, U27, U98 |
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
| FR-048b | COVERED; PARTIAL ? (U06 note 28) → Q5 | U21–U24, U27, U28, U98 |
| FR-049a | COVERED (create flow) → W13 (edit flow) | U23, U27, U28 |
| FR-049d | PARTIAL → W13 | U98 |
| FR-050a | COVERED | U22, U24, U28, U65, U75, U76 |
| FR-050b | COVERED | U63, U73, U75, U77, U82, U91, U93, U94, U96 |
| FR-050c | SPEC-ONLY → W14 | — |
| FR-050e | COVERED | U21, U23, U27, U82, U91 |
| FR-050f | COVERED; PARTIAL → Q9 | U23, U27, U98; PARTIAL U22, U24, U28 |
| FR-053a | COVERED; CONFLICT (note 16) → Q1; label → F24 | U06, U11, U18 |
| FR-053b | COVERED | U11–U18, U90 |
| FR-054a | COVERED | U06, U18 |
| FR-054b | COVERED | U18 |
| FR-054c | COVERED | U06, U18 |
| FR-055a | COVERED | U06, U18 |
| FR-055b | COVERED | U06, U18, U73 |
| FR-055c | COVERED | U04, U06, U73 |
| FR-055d | COVERED; CONFLICT (16b) → Q3 | U03, U18 |
| FR-055e | COVERED; CONFLICT (16b) → Q3 | U03, U18 |
| FR-055f | COVERED | U18 |
| FR-055g | COVERED | U18 |
| FR-057 | COVERED | U06, U18, U73 |
| FR-058a | COVERED | U06, U18 |
| FR-058b | COVERED | U18 |
| FR-058c | COVERED | U18 |
| FR-058d | COVERED (note 28); PARTIAL → W15 | U06; U73 |
| FR-058e | COVERED | U18 |
| FR-058f | PARTIAL → W15 | U73 |
| FR-059 | SPEC-ONLY → W15 | — |
| FR-060a | COVERED | U06, U73 |
| FR-060b | COVERED; CONFLICT (16b) → Q3 | U73, U75, U77 |
| FR-060c | SPEC-ONLY → W14 | — |
| FR-061 | SPEC-ONLY → W15 | — |
| FR-065c | SPEC-ONLY → W14 | — |
| FR-065d | SPEC-ONLY → W14 | — |
| FR-065f | SPEC-ONLY → W14 | — |
| FR-065h | SPEC-ONLY → W14 | — |
| FR-066a | SPEC-ONLY → W14 | — |
| FR-066b | SPEC-ONLY → W14 | — |
| FR-067b | COVERED (note 17 only) → W14 | U04 |
| FR-070a | COVERED; PARTIAL (U05 note 23 scope) → Q5 | U01, U03, U27, U28, U75, U81 |
| FR-070b | COVERED | U03 |
| FR-070c | COVERED | U04, U21, U22, U23, U27, U98 |
| FR-071a | COVERED | U92, U97 |
| FR-071c | COVERED | U03, U77, U80 |
| FR-071d | CONFLICT → F1 | U01 |
| FR-072a | COVERED; PARTIAL (U01 menus) → Q5 | U01, U08, U13, U15, U76 |
| FR-072b | COVERED | U01 |
| FR-076a | COVERED; CONFLICT rows → F5 | U98, U99, U100 |
| FR-076b | COVERED; PARTIAL (U06) → F6 | U98, U99, U100 |
| FR-076c | COVERED; PARTIAL (U06) → F7 | U99 |
| FR-076d | COVERED | U99 |
| FR-076e | CONFLICT (U05, as OUT-1) → F6 | U05 |
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
| FR-077a | COVERED; PARTIAL → Q9 | U04, U21, U23, U27, U98 |
| FR-077b | COVERED; PARTIAL → Q9 | U04, U21, U27, U98; PARTIAL U22, U23, U24, U28 |
| FR-077c | COVERED | U21, U23, U27, U98 |
| FR-077d | SPEC-ONLY → W18 | — |
| FR-077e | COVERED | U82 |
| FR-078d | COVERED; PARTIAL → Q9 | U04, U27; PARTIAL U22, U23, U24, U28 |
| FR-078e | COVERED | U04, U21, U23, U27, U98 |
| FR-079a | COVERED | U04, U21, U23, U27, U98 |
| FR-079b | COVERED | U04, U21, U98 |
| FR-079c | COVERED ? → W18 | U22 |
| FR-079d | SPEC-ONLY → W18 | — |
| FR-081a | COVERED | U04, U07, U16 |
| FR-081b | COVERED; PARTIAL (note 34) → Q11 | U16; U07 |
| FR-081c | COVERED | U07, U16 |
| FR-081d | COVERED | U07, U16 |
| FR-081e | COVERED | U16 |
| FR-081f | PARTIAL (note only) → W17 | U07 |
| FR-081g | COVERED | U07, U16 |
| FR-081h | COVERED | U07, U16 |
| FR-082a | COVERED; PARTIAL (U06), CONFLICT (U24) → F21 | U17, U99 |
| FR-082b | COVERED | U17, U99 |
| FR-082c | COVERED | U17 |
| CLAR-7 | COVERED | U05, U06, U65, U73, U99 |
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
| US2-AS1 | COVERED | U11–U18 |
| US2-AS2 | COVERED | U11–U18, U90 |
| US2-AS3 | COVERED | U06, U17 |
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
| US7-AS1 | COVERED | U06, U11, U18 |
| US7-AS2 | COVERED | U18 |
| US7-AS3 | COVERED | U06, U18 |
| US7-AS4 | COVERED | U18 |
| US7-AS5 | COVERED | U06, U73 |
| US7-AS6 | COVERED | U11–U18, U90 |
| US8-AS3 | SPEC-ONLY → W14 | — |
| US9-AS1 | COVERED; PARTIAL → Q9 | U04, U27; PARTIAL U22, U23, U24, U28 |
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
| ENT-DataGroup.name | COVERED; PARTIAL → Q9 | U04, U21, U23, U27, U98 |
| ENT-Selection.rows | COVERED | U11, U12, U13, U15 |

Not checked against Figma (UI = N):
- FR-001d, FR-003a, FR-004c, FR-005a–c, FR-013b, FR-018a–d, FR-019b, FR-021a, FR-026a–b, FR-028, FR-029a–c, FR-030a–b, FR-031b, FR-034a–c, FR-035b–c, FR-036a, FR-036e–f, FR-040c, FR-043a, FR-049b–c, FR-050d, FR-051, FR-052, FR-056, FR-062a–c, FR-063, FR-064a–b, FR-065a–b, FR-065e, FR-065g, FR-067a, FR-068, FR-069a–b, FR-071b, FR-073a–b, FR-074, FR-075, FR-078a–c, FR-080a–c;
- US8-AS1, US8-AS2, US8-AS4, US8-AS5, US9-AS5;
- EC-2, EC-4, EC-5, EC-8b, EC-9, EC-18, EC-20;
- ENT-StartDate.*, ENT-ActivityEntry.connection, ENT-DeletedConnection.*, ENT-DataGroup.membership, ENT-DataGroup.effect.

FR-004a, FR-009c and FR-045a are UI = N but appear above because a settled item cites them.

## Not audited
UNCERTAIN 0, FAILED 0, RATE_LIMIT 0. The 52 OUT units below are coverage gaps. What they may draw of an excluded item is settled by the decisions cited:
- U09 Note · 11b · Rule logic table (annotation kept whole)
- U10 Start · 1 · Log in
- U19 Connection · 1 · Create connection
- U20 Documents 1 · A1–A4 (no documents yet)
- U25 Documents 2 · A13, A14 (Set rules with a document that has no data)
- U26 Documents 2 · V9 (deselect data that rules use)
- U29–U57 Rules 1 to 10. "Group with other rules" is not built there either: CLAR #9, F19
- U59–U62, U64 Rules 11 (11.1–11.13) and Rules 12 (sticky selection bar)
- U66–U72, U74 Test 1 · 3–15, 18–20. Generate all / Generate again: CLAR #7. Met message: F18. Example banner: W15
- U83, U84 P9b, P9c (Summary tabs Ambulance, School transport)
- U85 P9d (published summary with findings): not built, CLAR #21, F17
- U101 How other tools do it (research, not app UI)
