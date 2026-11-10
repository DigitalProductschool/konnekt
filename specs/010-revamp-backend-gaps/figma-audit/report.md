# Figma ↔ spec audit — 2026-11-10

## Summary
Units audited 49/101 (OUT 52, UNCERTAIN 0, FAILED 0). Figma calls 128 (127 in the unit audits, 1 by the mapper).

This is the first report for this feature: there is no baseline and no earlier report. Two kinds of decision settle items here:
- CLAR 2026-11-10 #1 settles F1–F3. It is the only Clarification that refers to the design. #2 does not, so it settles nothing in this report.
- RULE wording settles F4–F9.

The spec does not contain the phrase "Figma decides wording". So the governance rules do not apply: there is no RULE copy-source, no C section and no F/W/C prefixes.

The auditors marked about 200 rows FIGMA-ONLY that describe behaviour from specs 001–009. FR-074 covers that behaviour, so those rows are merged into the FYI rows X6–X11.

| category | count |
|---|---|
| Conflicts | 9 |
| Spec-only (not in Figma) | 28 |
| Figma-only — behavioural | 2 |
| Partial matches | 10 |
| Figma-only — cosmetic (FYI) | 25 |
| Figma must change (decided) | 9 |
| Build without frames (decided) | 0 |

Top 5 issues (open only):
1. **C1:** the edit flow draws F5, a live connection's pending changes kept as a draft ("Draft changes", "Keep draft and exit", "Changes not published"). OUT-1 excludes F5 (Q1).
2. **C2:** "Download PDF" (Q37 (b)) appears on every details frame of every status (20 units), and OUT-5 excludes it (Q2).
3. **C4/C5:** every Documents frame shows data groups and "coming soon" documents, which look like OUT-7's field groups and upcoming documents (Q4).
4. **P1:** toasts close after 5 s, but FR-036c keeps the deletion toast's "Undo" as long as the toast shows, within a 5-minute restore window (Q20).
5. **P4, S21, S22:** no frame draws a non-drag way to reorder ("Move up" / "Move down", WCAG 2.5.7), and the edit flow shows no reordering at all (Q14).

## Conflicts
| # | req | Figma (unit, node-id) | conflict |
|---|---|---|---|
| C1 | OUT-1 (F5), FR-070b, FR-074 | U98 6730:39124 (E2); U99 6890:46199, 6890:46197 (E5a), 7173:52812 (E5b); U100 7173:52748 (E7); U05 6730:40340 (note 25); U06 7127:49610 (note 30); U03 6703:39311 (note 14) | The design keeps a live connection's pending changes as a draft. It draws a muted "Draft changes" next to "Active" (annotation "Active · unpublished changes") and a footer "Keep draft and exit" with the toast "Draft kept. Your changes take effect when you save them.". Clicking Konnekt or "Your connections" while editing is "same as Save and exit → stays active", and the row then shows "Changes not published". F5 is excluded. CLAR 2026-11-10 #1 calls F5 excluded but decides only "Save changes?". Q1 |
| C2 | OUT-5 (Q37 (b)), FR-070b, FR-074 | Active: U58 6530:40742, U63 7112:48928, U80 6396:47755, U81 6809:46580, U82 6396:48196, U86 6396:48385, U87 6396:48846, U88 6417:30965, U90 6417:31518, U91 7203:50536, 7246:51508, U92 7246:52087, 7246:52713, U99 6730:39800. Scheduled: U86 6396:48655, U94 7246:52805, 7246:53935, U95 7246:54516, 7246:55144. Deactivated: U89 6417:31343, U96 7246:55236, 7246:56372, U97 7246:56956, 7246:57587. Draft: U93 7362:54813, 7362:55045; note 36 U07 7370:55192 | A "Download PDF" button sits in the Summary card for every status. Note 36 says a draft's PDF is marked as a draft and carries the download date. The deferred Q37 (b) must not be built (FR-070b). Q2 |
| C3 | OUT-8 (F54), OUT-9, OUT-6 | U89 6417:31447 (P16 toast); U05 6720:39042 (note 24) | The deactivation toast "Connection deactivated." offers "Undo". Note 24 says: "Everything destructive gets Undo in its toast: deleted, removed, deactivated, unlinked." Undo after deactivating is F54, which is excluded. Q3 |
| C4 | OUT-7 (field groups) ?, FR-050e | U04 6711:39378 (note 20); U21 7290:61214–7290:61255, 7290:61956; U22 7290:62357, 7290:62967; U23 7298:61791; U24 7298:62402–7298:62447, 7298:62579–7298:62613; U27 7298:63344–7298:63380; U28 7298:64184–7298:64220; U98 7296:52340 | Data items sit under group headings (Name, Birth, Address, Document, Licence, Appearance, Other details), each with a group checkbox that can show a mixed state. The flat lists are hidden as "Old · Column (flat list)". This is OUT-7's "field groups" unless spec 008 already ships V5; the auditors disagree (U22, U23 and U98 call it baseline). Q4 |
| C5 | OUT-7 (upcoming documents) | U04 6711:39375 (note 19); U21 7295:61184 (A6); U22 7294:61852 (A8) | The Add document card says "12 more documents are coming soon. Search to see them." or "Everything in the wallet is added. Search to see what’s coming soon.". Note 19 says such documents show "only when searched, tagged Coming soon". Q4 |
| C6 | OUT-6 (persona generation) ? | U65 7344:96178, 7344:96189 ("Generate all"), 7057:58771, 7057:59185 ("Generate again"); U73 7344:96343, 7058:62054; U99 7114:49742; U05 6716:41045 (note 23: "Generate all in Test (29)") | "Generate all" is new in v9 (note 23), and OUT-6 excludes persona generation. "Generate again" is probably spec 004's existing action (U06 #25, U99 #29). Q5 |
| C7 | OUT-4 (Q31 (a)), OUT-19 | U65 7057:59533, 7057:59534, 7057:59535; U06 7058:63148 (note 29) | For an applicant who meets every rule, the test step shows a box "Message Anna reads" with "Your wallet data meets the requirements. Other documents are checked separately.". That is the excluded success message for met citizens. Q6 |
| C8 | OUT-6 (grouping a group) | U58 6522:33026 (10.9) | Group 01's ⋯ menu offers "Group with other rules", which groups a group. Q7 |
| C9 | OUT-3 (Q13) | U13 6699:44358 (frame 2) | The account menu shows an email line, "lena.weber@example.org", under "Laura Weber". Q8 |

## Spec-only (not in Figma)
No item below was seen in the 49 audited units. Where an unaudited (OUT) unit could hold one, the note says so. The approval page does not appear in any of the 101 units of the file.

| # | req | prio | expected surface | note |
|---|---|---|---|---|
| S1 | FR-003d | P1 | Publish dialog; Change start date dialog | Refuses the date when the day changes between opening and confirming. The error state is drawn (P1c, U76 6635:36265), and EC-1 is covered by note 9 (U02). Only the trigger can't be drawn. Q9 |
| S2 | FR-008d | P1 | Change start date dialog (scheduled connection) | P12 (U87 6396:48860) draws only an active connection. "Now" making a scheduled connection active at once is not drawn. Q9 |
| S3 | FR-011c, FR-011d (undrawn) | P1 | Activate again dialog | P16b (U89 7173:52959) draws only "Now": no date field, no "Schedule". Q9 |
| S4 | FR-012b (undrawn) | P1 | Deactivate dialog | P15 (U88 6417:31206) has only the active wording. Q9 |
| S5 | FR-013c (undrawn) | P1 | Save changes dialog | E3 (U98 6730:39464) is drawn only for an active connection. Q9 |
| S6 | FR-021b, EC-8a | P2 | Overview; Details | No frame marks a connection as pre-existing. Every drawn row and pill has a date, so the frames don't contradict the requirement. Q10 |
| S7 | US2-AS6 | P2 | Details; Overview | After reactivation, "Active since" shows the reactivation and the row keeps "Published <date>". This is data and can't be told apart in a frame. Q10 |
| S8 | FR-025b, FR-025h, FR-025j, FR-025k, US3-AS6 (undrawn) | P3 | Activity card | No entry for a name or description change, for becoming active on the date (no person), for activation again, or for deletion and restore. U98 maps the name and description fields to FR-025b, but no entry is drawn. Q11 |
| S9 | FR-027b, FR-027c, FR-027d, US3-AS4, US3-AS5 | P3 | Activity card | Every drawn entry names one team member. None names an agent or an approver, and none has no person. Q11 |
| S10 | FR-032a, FR-032b, EC-8c | P3 | Activity card | No frame shows a pre-existing connection's "Created" and "Published" without a person, or the closed line with the time alone. Q11 |
| S11 | EC-10 (undrawn) | P3 | Activity card | Hundreds of entries are not drawn. Q11 |
| S12 | FR-031a | P3 | Activity card | Every team member can read every activity. This is a permission, not visual. Q11 |
| S13 | FR-034d, FR-034e, US4-AS2 | P4 | Overview | After "Undo", the row comes back without a reload and the restore is announced. Q12 |
| S14 | US4-AS4, EC-6 | P4 | Toast | Not drawn: "Undo" after the restore time, or used twice. The toast should say the connection can't be restored. FR-036d is covered only by note 17's "where possible" (U04). Q12 |
| S15 | FR-037b, US4-AS3 | P4 | Welcome page; Overview | "Undo" on the welcome page brings back the overview. Q12 |
| S16 | EC-7 | P4 | Toast | When the toast is replaced or the page is left, the deletion stands. Q12 |
| S17 | FR-039b | P5 | Selection bar | The selection count is announced (not visual). Q13 |
| S18 | FR-043b, US5-AS4 | P5 | Bulk delete dialog | If a selected connection vanished or changed, nothing is deleted and the dialog names it. Q13 |
| S19 | FR-044a, FR-044c, US5-AS3 | P5 | Overview; Toast; Activity card | After "Delete connections": the rows are gone, the selection clears, the toolbar comes back and a toast with the count and "Undo" shows. The activity records each deletion. Q13 |
| S20 | EC-12, EC-13 | P5 | Selection bar; Bulk delete dialog | A selected row that vanishes on refresh, and a long selection that scrolls inside the dialog. Q13 |
| S21 | FR-046e, EC-15 | P6 | Documents step | A drop outside the list, or Escape, leaves the order unchanged. Not expected in the unaudited Documents frames (A1–A4, A13/A14, V9). Q14 |
| S22 | US6-AS5 | P6 | Edit flow (Documents step) | Reordering a published connection is not drawn; see P4. Q14 |
| S23 | FR-050c | P6 | Approval page | Document order on the approval page; the page is not in the Figma file. Q15 |
| S24 | FR-059, ENT-ExampleMark.isExample | P7 | Wizard; Details | The example mark and its banners end at publishing. The published frames show none, so there is nothing else to draw. Q16 |
| S25 | FR-061, EC-19 | P7 | Wizard | The example is created in the current language and its banners follow the language. Q16 |
| S26 | FR-060c | P7 | Approval page | The example line on the approval page; the page is not in the Figma file. Q15 |
| S27 | FR-065c, FR-065d (undrawn), FR-065f, FR-066a, FR-066b, US8-AS3 | P8 | Approval page | Not drawn: the start date or "goes live at once", that links stop and requests are cancelled, the refusals, and deactivating or deleting a scheduled connection. The page is not in the Figma file. Q15 |
| S28 | EC-21 | – | Every new control and state | No frame is narrower than 1440 px. Q17 |

## Figma-only — behavioural
| # | item | where (units, node-ids) | suggested requirement |
|---|---|---|---|
| B1 | Banner on the overview for unsaved work kept on this device (note 34). For one connection it reads "Unsaved changes in “Passenger transport licence”" / "Saved only on this device on 06.11.2026, 14:20, when the page closed. Nobody else can see them.", with "Discard" and "Resume editing". For several it reads "Unsaved changes in 2 connections", with one line per connection ("Edited · <date>, <time>" or "New, never saved · <date>, <time>"). | U16 7362:54550–7362:54557, 7362:54621–7362:54634; U07 7370:55186 (note 34); U04 6703:39317 (note 16); U05 6716:41045 (note 23 lists it as a v9 change) | Either keep spec 005's local-draft UI (FR-074), or add: "While drafts kept on this device exist, the overview shows a banner above the toolbar, per connection, with Discard and Resume editing. The banner stays when rows are selected." Q18 |
| B2 | Findings on the published Summary. Note 26 says: "Same rule on … the published summary tabs (P9d) … Published summary lists the same lines (P9d, not in spec FR-020)". | U06 6760:48852; ⓘ on the Summary's "Standard" tab: U94 7246:52833 (also U91 7203:50562, U93 7362:54840, U96 7246:55263); P9d is U85 6760:48437 (not audited, flagged by the designer) | Spec 003 FR-020, kept by FR-074, shows no findings in the published Summary. Either keep it or add a requirement for P9d. Q19 |

## Partial matches
| # | req | where | difference |
|---|---|---|---|
| P1 | FR-036a, FR-036c, FR-033 | U06 7127:49610 (note 30: "Toasts stay 5 s; Undo restores."); U24 7298:62552 (A12: "toast with Undo (5 s)") | Toasts close after 5 s. FR-036c keeps the deletion toast's "Undo" as long as the toast shows (until used, dismissed or replaced), within the 5-minute restore window of FR-036a. Q20 |
| P2 | FR-014a, FR-014b, FR-043c | U79 6376:27178 (P5); U02 6637:36658 (note 7) | The failed state reads "Couldn’t publish, so nothing has changed. Check your internet connection and try again." with "Back to test" and "Try again", and shows no error ID. Note 7 makes page-level errors title-only, one-line alerts. The requirements show failures as spec 008 does, with the error ID where there is one. Not drawn: whether "Try again" keeps "On a date" and its date. Q21 |
| P3 | FR-013a, FR-013b | U87 6396:49030; U15 6699:47905; U98 6731:39846; U99 7173:52836; U100 7173:52772 | A scheduled connection reuses active's edit flow, but only active's wording is drawn: "Edit this active connection?", "Your changes only take effect when you save them…", "Active. Your changes take effect when you save them.", "…keep the active version", "The connection goes back to the version that's active now." Neither the frames nor the spec word the scheduled case. Q22 |
| P4 | FR-047a (undrawn), FR-049a, FR-046a | U04 6711:39375 (note 19: "A keyboard or menu alternative for reordering is still open (WCAG 2.5.7)"); U05 6716:41045 (note 23); U22 7290:62349; U24 7298:62391, 7298:62392; U98 7298:63260 (E1b) | No row has "Move up" or "Move down"; note 37 (U08 7370:55195) only suggests them. The edit flow's Documents step (E1b) shows no reordering at all. Q14 |
| P5 | FR-008e (undrawn) | U05 6720:39042 (note 24) | The list of success toasts includes "active again" but has no toast for scheduling or for a start date change. Q9 |
| P6 | FR-025g (undrawn), FR-018a | U95 7246:54526 | The scheduled connection's activity ends with "Published". No entry records the scheduling with its date. Q11 |
| P7 | FR-058d (undrawn) | U73 7137:50086 (16b) | The unchanged example's test step has no example banner. Q16 |
| P8 | FR-019a, FR-021b | U17 6699:47974 | A draft row reads "Edited 03.10.2026" with no step, next to "Edited 28.10.2026 · Rules step". It is probably a draft saved before steps were recorded, and the spec doesn't say what such a row reads. Q10 |
| P9 | EC-17 | U06 7137:50569 (note 31) | Note 31 says "With prefers-reduced-motion: fades only". EC-17 turns transitions off for dragging and reordering (spec 008's rule). Q23 |
| P10 | FR-071a | U01 6637:36640 (note 1) | Note 1 puts `<html lang="en" …>` on every page, though every text exists in English and German. Q24 |

## Figma-only — cosmetic (FYI)
None of these needs a decision:
- **RULE ui-detail:** built as designed.
- **Baseline (FR-074):** behaviour of specs 001–009 that this feature does not change.
- **Resolved:** a slip in a note that other frames or notes of the design correct.
- **Agreed exclusion:** the design itself defers the item, as the spec does.

| # | item | where | rule / note |
|---|---|---|---|
| X1 | Overview row: the description sits on one line under the name, cut with "…"; a tooltip on hover shows the full text (note 16) | U04 6703:39317; U12 7173:52294; U13 7366:55201, 7366:55276; U14 7173:52284, 7173:52285, 7173:52310; U17 6699:48028 | RULE ui-detail (a v9 change per note 23, or baseline). FR-072a also needs the tooltip to open on keyboard focus (note 37's open question 2, U08 7370:55195). On touch, the name opens View, which holds the full text. |
| X2 | "Create connection" stays visible and enabled while rows are selected | U15 6699:45258 | RULE ui-detail |
| X3 | The select-all checkbox is hidden when the search lists no row | U11 6699:44584 | RULE ui-detail |
| X4 | During a drag, the dragged row leaves the list (only the line and the browser's faded copy show), "Add document" stays pinned, and the list scrolls while dragging near its edge | U27 7298:63333, 7298:63752, 7298:63330; U01 6637:36649 (note 4) | RULE ui-detail |
| X5 | Removing the open document opens the remaining one ("Document 1 of 1") | U24 7298:62570, 7298:62624 | RULE ui-detail (likely baseline) |
| X6 | Shell and wizard: header, breadcrumb, draft/active/deactivated pill, language switch, user menu, step header and step bar (clickable only while editing), footers, "Save and exit" and Konnekt saving ("Saving your draft…", "Draft saved. You can pick it up any time."), "Save before you log out?", "Leave this connection?", the browser's leave warning, "Publish" disabled with a reason | U01 6637:36649, 6637:36652; U02 6637:36655; U04 6703:39323; U05 6730:40340; U06 6791:46863, 7127:49610, 7137:50569; U17 6408:72716, 7173:52682, 6401:71899, 6699:48002; the headers and footers of all frames | Baseline (FR-074) |
| X7 | Overview: count ("<n> connections", "<n> of <m> connections"), search with ×, the no-results state with "Clear search", the name opens View, rows scroll inside the card | U04 6703:39317; U11 6699:44519–6699:44631; U12 6699:44931; U13 7366:55201 | Baseline (FR-074) |
| X8 | Documents step: the Add document card ("Find a document", Available, Added), "x of y" chosen, "All data items", V6 and V6a, the remove dialog that names the rules using the document (A11), Remove on hover | U04 6711:39375; U05 6716:41042; U21; U22; U23 7298:62322; U24 7298:62500 | Baseline (FR-074). The "coming soon" and group parts are C4 and C5. |
| X9 | Rules and test steps: variant tabs with ⓘ, link strip, Changed/Added/Removed here, Reset to Standard, Restore rule, Remove from variant, findings banner and severities, findings in the publish dialog (P2's "1 warning on Ambulance" against P2b's line per variant), personas, Edit data, result tables, skeletons, variant deletion applied on save | U03; U05 6711:39381, 6730:40340; U06 6760:48852, 7058:63148; U58; U63; U65; U73; U75–U79 (the test step behind the dialogs); U77 6376:26181, 6760:47979 | Baseline (FR-074). Findings in the published Summary are B2. |
| X10 | Details: Links card with ⓘ tooltips, a URL cut with "…" copies in full, "Copied" for 2 s, copy disabled while deactivated, status band texts for active, deactivated and draft, Summary open first when arriving from View, the Summary's read-only rules, the "Changes saved." toast, the edit entry confirmation, "Discard your changes?" and "Save your changes?" | U06 7127:49610; U07 7370:55183, 7370:55192; U80–U82; U89 6417:31309; U91 7203:50468; U93 7362:54691; U94 7246:52715; U96 7246:56326; U99 6730:39810, 7173:52836; U100 7173:52772; U15 6699:47905; U87 6396:49030 | Baseline (FR-074). The scheduled wording of the dialogs is P3. |
| X11 | Menus and dialogs: menus in the top layer, placed by placementFrom(), closing on Esc, a click outside or a choice, arrow keys; dialogs close on Esc, × and the secondary button; a scrim click closes a dialog unless it deletes or publishes | U01 6637:36646; U06 7127:49610 (note 30), 7137:50569 (note 31); U07 7370:55183; the scrims in U14, U87, U90, U100 | Baseline (FR-074, project rule) |
| X12 | Styling: light-only markup, checkbox and radio specs, 72 px footer, slim alerts, image assets and band art, "Add variant" ⓘ spacing, heading colours and typography, header background on scroll, gradient background, 24 px toast offset, card outlines, dialog widths 480/600, pill styling, ⓘ colours, draft band gradient, monospaced date in 4b, illustrations | U01 6637:36640, 6637:36643, 6637:36652; U02 6637:36658, 6637:36664, 6637:36667; U03; U05 6716:41042, 6720:39042; U06 6760:48852, 6791:46863; U07 7370:55180, 7370:55189, 7370:55192; U14 6872:45929; U81 7355:61825; U92 7355:60607; U97 7355:61029 | cosmetic |
| X13 | Hidden "Old · …" layers and leftovers: old rule counts, "badge-small (Live, replaced)", "View (disabled: drafts can't be viewed yet)" (the visible frames enable View on drafts, FR-015e), the old "Change go-live date" button (replaced by ⋯ › "Change start date", FR-009a), the draft pill's hidden ⋯ (FR-016a), hidden toasts | U02 6637:36667; U11 6699:44262, 6699:44291, 6699:44552, 6699:44611; U12 6699:44932; U13 6739:40597, 6739:40569; U15 6699:47867; U65; U75 6376:25344; U80 7355:61159; U81 7355:61823; U82 7355:61244; U91 7355:60519; U93 7362:54714; U99 7355:60477; U100 7173:52770 | cosmetic, not built |
| X14 | Sample-data inconsistencies: "20 connections" against 14 rows; "3 variants · 4 rules" against the dialogs' 5/6/5 and "Standard · 2 rules"; "6 of 25" against "7 data items"; "Laura Weber" against "lena.weber@…"; one "Variant added" for 3 variants; 16b's background is not the unchanged example; drafts without "(example)" carry the example's rules; E5a shows only Standard | U12 6699:44921; U63 7112:48923; U73 7058:62120, 7137:50091, 7137:50181; U89 7173:52959; U98 7296:52334; U13 6699:44358, 7173:52304; U97 7246:56965; U17 6408:72728; U76 6863:47711; U77; U78 6863:48090; U99 6890:46206 | cosmetic. FR-060b and FR-055 govern the example. |
| X15 | Layer names that are not accessible names: "Go to connections" is named "Create new connection"; note text layers are named "Rules/Toast has three types"; note 37's layer is named "Build everything in notes 14–2…"; the step-1 note's layer is named "Starts as a draft…" | U93 7362:54922; U06 (all notes); U08 7370:55195; U98 6731:39846 | cosmetic |
| X16 | Note 16 says the empty state has one "Create connection" button | U04 6703:39317 | Resolved: frames 1b and 1g (U11 6793:47828, U18 6793:47706) and note 28 (U06 6791:46863) draw "Start from an example" beside it (FR-053a). |
| X17 | Note 14 doesn't name the scheduled header pill | U03 6703:39311 | Resolved: note 32 (U07 7370:55180), P11, V-Scheduled and E6 (U86 6701:40276, U94 7246:58076, U99 7114:49835) draw "Scheduled · 01.12.2026". |
| X18 | Layer name "Added list · scrolls, oldest first" | U21 7294:61510; U22 7294:61686; U23 7298:61781; U24 7298:62390; U27 7298:63333; U98 7298:63260 | Resolved: R3 renames it "Added list · scrolls, in the order staff set" (U28 7298:64173), which is FR-045a. |
| X19 | Note 28: "Documents list: no 'x of y'" | U06 6791:46863 | Resolved: the note means the list rows. Every Documents frame draws the pager "Document n of m" (FR-048b). |
| X20 | P9 and P10 show the Links card open, without a toggle, beside an open Summary or Activity | U82 6396:47966; U86 6396:48338, 6396:48520 | Resolved: the V-series (U91–U97) draws Links as an accordion card ("View links" / "Hide links") with one card open (FR-022d). Build the V-series. |
| X21 | A small "badge" on the variant tabs in the example's 1i | U18 7344:96398, 7344:96454 | Resolved: it is the ordinary "Rules/Variant tab · fixes" tab with its ⓘ, and per note 26 a grey ⓘ means no findings. No conflict with FR-056; check in the build that the example shows no finding icon. |
| X22 | Notes word some dialogs differently from the frames. Note 25's entry confirmation and note 17's active delete sentence differ from the frames' copy. Notes say "applicants" where frames say "citizens". Note 17 calls the delete toast "neutral", while note 24 and P18 make it danger. Frame 2 asks "Leave this connection?" while frame 6a saves silently. Note 28 lists "Discard changes" as "Later", while E1–E7 draw it. | U05 6730:40340; U04 6703:39320; U15 6699:47905; U14 6699:44480; U90 6417:31599, 6699:48098; U17 7173:52682, 6890:46052; U06 6791:46863 | The frames win; the wording is baseline (FR-074). |
| X23 | Unlink from Standard (menu item, confirmation, toast, undo, strip link) | U05 6711:39381; U06 6791:46863 | Agreed exclusion: note 37 (U08 7370:55195) defers it, as OUT-6 does. |
| X24 | View-only users and roles (V-Draft S2 without Edit) | U93 7362:54923; U07 7370:55192; U06 6791:46863 | Agreed exclusion: note 37 (U08 7370:55195) defers it, as OUT-7 does. |
| X25 | Note 23: "v9 builds" every Figma change since v8 | U05 6716:41045 | Scope note: FR-070a ports only the eight items' frames, and FR-074 leaves everything else as it is. The v9 changes outside the eight items are C4, C5, C6, B1, X1 and the styling in X12. |

## Figma must change (decided)
Build these as the spec says, keeping Figma's layout and styling, until the design is updated.

| # | req | Figma (unit, node-ids) | Figma shows | build instead | decision |
|---|---|---|---|---|---|
| F1 | FR-009e, FR-009f, US1-AS11 (OUT-12) | U98 6730:39464 (E3); U05 6730:40340 (note 25) | "Save changes?" on an active connection with an "Active from" group ("Now" selected, "On a date") and the body "Citizens get the new version from the time you choose. Your links stay the same." Note 25 reads "Applicants get the new version from the time you choose…". | Remove the "Active from" group: "Save changes" takes effect at once. The body is the one spec 008 builds today, without "from the time you choose" (FR-009f). The summary, "Check rules again" and "Save changes" stay as drawn. A scheduled connection's sentence is S5. | CLAR 2026-11-10 #1 |
| F2 | FR-009c, FR-009d, US1-AS11 (OUT-2) | U87 6396:48860 (P12) | Hint "Until that date, citizens can't start a new request. Requests already started still finish." | "Until that date, citizens can't start a new request." followed by FR-009d's sentence naming the cancellation. If the spec gives no exact text: "Requests already started are cancelled." | CLAR 2026-11-10 #1 |
| F3 | OUT-2 (F13), FR-009c, FR-035b | U88 6417:31206 (P15) | The deactivate dialog's second sentence "Requests already started still finish." | "The connection will be deactivated and its links will stop working. Requests already started are cancelled. Remember to remove the wallet connection from your service." If spec 008's dialog already words requests in progress, keep its sentence. | CLAR 2026-11-10 #1 ("requests in progress are cancelled, since F13 stays out of scope") |
| F4 | FR-017d, FR-019a, US2-AS3 | U11 6699:44278; U12 6699:45031; U13 6739:40556; U14 6699:44397; U15 6699:47876; U16 7362:54583; U18 6793:47807; U90 6699:48077 | Draft rows read "Edited 03.10.2026" (the example's row "Edited 23.10.2026") with no step | "Edited <date> · <step> step", where the step is the one last saved (Connection, Documents, Rules or Test step), for example "Edited 03.10.2026 · Rules step", as frame 7 draws (U17 6699:48024). Drafts without a recorded step: Q10. | RULE wording |
| F5 | FR-017a, US2-AS1 | U90 6699:48064 (P18) | An active row reads "Edited 12.09.2026" | "Published 12.09.2026" | RULE wording |
| F6 | FR-053a, US7-AS1 | U11 6793:47828 (1b) | "Start with an example" | "Start from an example" (as 1g draws it, U18 6793:47706) | RULE wording |
| F7 | FR-004a, FR-002a | U93 7362:54708, 7362:54940 (band), 7362:54909 (Links card) | The draft band reads "The links can't be added to your services yet. They become active when this connection is published."; the Links card reads "Created when the connection is published and active." | Band: "The links can't be added to your services yet. You get them when this connection is published." Links card: "Created when the connection is published." | RULE wording |
| F8 | FR-001a, FR-011a | U02 6637:36661 (note 9) | Radio-group label "Becomes active" | "Active from" (as P1, P1b, P1c and P16b draw it) | RULE wording |
| F9 | FR-038b | U12 6699:45023, 6699:45036; U16 7362:54584, 7362:54594; U17 6699:48025, 6699:48036 | Checkbox and Delete layers named after another row's connection ("Select Hunting licence", "Delete Hunting licence", "Delete Fishing licence") | Accessible names "Select <this row's connection name>" and "Delete <this row's connection name>" | RULE wording |

## Build without frames (decided)
| # | req | expected surface | build from (nearest frame or KERN pattern) | decision |
|---|---|---|---|---|
| – | – | – | – | None. No Clarification says to build a spec state without frames. The undrawn states are open: Q9–Q17. |

## Clarify questions
**Q1 (C1).** Figma draws F5, a live connection's pending changes kept as a draft, which OUT-1, FR-070b and FR-074 exclude. Keep it excluded (Figma changes), or bring F5 into scope?

Impact:
- **Edit-flow header:** U98 6730:39124 (E2); U99 6890:46199 (E5a), 7173:52812 (E5b); U100 7173:52748 (E7); note 25 (U05 6730:40340, item 30).
- **Edit-flow footer:** note 25 (U05 6730:40340, item 29) and note 30 (U06 7127:49610). Frames E1–E7 already draw "Back · Discard changes · <next step> · Save" without "Keep draft and exit": U98 6731:39850, 7296:52389, 6730:39145; U99 6890:46220, 7114:49808; U100 7173:52769.
- **Leaving the edit flow:** E5a (U99 6890:46197), note 25 item 37, note 30 (U06 7127:49610), E5b (U99 7173:52836).
- **Toasts:** "Draft kept. Your changes take effect when you save them." (note 25 item 33).
- **Overview rows:** "Changes not published" (note 14, U03 6703:39311). The hidden "badge-small (Live, replaced)" layers (U11, U12, U13, U15) stay hidden.

Options:
- (a) Keep excluded. The header shows only the status pill: "Active", or "Scheduled · <date>" as E6 draws it (U99 7114:49835). The footer is "Back · Discard changes · <next step> · Save". Konnekt and "Your connections" open E5b "Save your changes?" ("If you leave now, your changes are lost. Save them, or discard them and keep the active version.", with "Discard changes" and "Save") instead of E5a. There is no "Draft kept" toast, and rows never show "Changes not published". Figma removes "Draft changes", "Keep draft and exit", E5a's annotation and note 14's sentence.
- (b) Bring F5 in. A live connection keeps unsaved edits as a second, unpublished version: "Draft changes" in the header, "Changes not published" on its row, "Keep draft and exit" with the toast above. This needs new requirements (storage, agents, activity). It contradicts OUT-1, FR-074 and FR-070b, and the reasoning of CLAR 2026-11-10 #1, which keeps "Save changes?" at once because a second version is F5.

**Q2 (C2).** "Download PDF" (Q37 (b)) is drawn on every details state. Not built (Figma hides it), or bring Q37 (b) into scope?

Impact: the details' Summary card at every node listed in C2:
- active: 14 units
- scheduled: U86, U94, U95
- deactivated: U89, U96, U97
- draft: U93
- note 36: U07 7370:55192

Options:
- (a) Not built (FR-070b). The Summary header shows "Summary", the count line and "View summary" / "Hide summary". Figma hides the button and note 36's PDF sentence.
- (b) Bring it in. This needs requirements for the PDF's content per status (including note 36's draft marking and download date), the file name and the languages. It contradicts OUT-5 and FR-074.

No Clarification is affected.

**Q3 (C3).** The deactivation toast offers "Undo" (F54), and note 24 promises "Undo" for every destructive action. Keep F54 excluded, or bring it in?

Impact:
- **Toasts:** P16 (U89 6417:31447); note 24 (U05 6720:39042, items 21 and 24).
- **Not affected:** the deletion toast (U90 6699:48098) and the document removal toast (U24 7298:62627).

Options:
- (a) Keep excluded. The toast reads "Connection deactivated." (success type, note 24) without "Undo". Only deleting a connection (FR-033), removing a document (FR-045c) and the rules step's existing undos offer "Undo". Figma trims note 24's list to "deleted, removed".
- (b) Bring F54 in. "Undo" makes the connection active again; you would need to decide what happens to the requests the deactivation cancelled, and the activity entries (FR-025i, FR-025j). This contradicts OUT-8 and FR-074.

Unlinking stays deferred either way (note 37, OUT-6). No Clarification is affected.

**Q4 (C4, C5).** The Documents frames show "coming soon" documents and data groups, which look like OUT-7's "upcoming documents" and "field groups". Are they excluded, already built by spec 008, or to be adopted now?

Impact:
- **Add document card:** U21 7295:61184 (A6), U22 7294:61852 (A8), note 19 (U04 6711:39375).
- **Data item panel, create and edit flows:** U21 7290:61214–7290:61255, 7290:61956; U22 7290:62357, 7290:62967; U23 7298:61791; U24 7298:62400–7298:62447, 7298:62579–7298:62613; U27 7298:63343–7298:63380; U28 7298:64184–7298:64220; U98 7296:52340; note 20 (U04 6711:39378).
- **Not affected:** the details' Summary lists data items flat (U82 6396:48199, U91 7203:50539).

Options for upcoming documents:
- (a1) Excluded. The card lists only the wallet's documents ("Available", "Added") with no hint line. The all-added state reads "Everything in the wallet is added.", and search finds wallet documents only.
- (a2) Already built by spec 008, so baseline (FR-074): build as drawn, and name what OUT-7's "upcoming documents" then means.
- (a3) Adopt now. This contradicts OUT-7.

Options for data groups:
- (b1) Excluded. One flat list in catalog order (FR-050e) under "All data items", in three columns, with no group rows or group checkboxes.
- (b2) Already built (spec 008 V5), so baseline: build as drawn, in catalog order inside each group.
- (b3) Adopt now. This contradicts OUT-7.

No Clarification is affected.

**Q5 (C6).** "Generate all" is new in v9 (note 23), and OUT-6 excludes "persona generation". Excluded, or allowed as part of spec 004's regenerate?

Impact:
- **Test step applicants row:** U65 7344:96178, 7344:96189; U73 7344:96343.
- **Applicant data head:** U65 7057:58771, 7057:59185; U73 7058:62054; U99 7114:49742 (E6).
- **Notes:** note 23 (U05 6716:41045), note 29 (U06 7058:63148), note 30 (U06 7127:49610).
- The Test section (U66–U72, U74) was not audited.

Options:
- (a) "Generate all" is the excluded persona generation: not built. "Generate again" stays as spec 004 builds it.
- (b) Both are spec 004's regenerate (one applicant or all): build "Generate all" as drawn, asking first like "Generate again", and name what OUT-6 still excludes.
- (c) Both are excluded: hide "Generate again" too. This is only possible if spec 004 doesn't ship it.

No Clarification is affected.

**Q6 (C7).** The test step shows a success message for an applicant who meets every rule (Q31 (a)). Keep it excluded, or adopt it?

Impact:
- **Test result for a met applicant:** U65 7057:59533–7057:59535 and 7057:59239.
- **Notes:** note 29 (U06 7058:63148).
- The Test section (U66–U72) was not audited.

Options:
- (a) Excluded. The result reads "Result: meets the rules" with the list "Rules Anna meets", and there is no "Message Anna reads" box.
- (b) Adopt. Citizens who meet the rules get "Your wallet data meets the requirements. Other documents are checked separately." This changes what citizens see and contradicts OUT-4, OUT-19, FR-074 and FR-075.

No Clarification is affected.

**Q7 (C8).** A group's ⋯ menu offers "Group with other rules", which groups a group. Excluded, or adopt it?

Impact:
- **Rules step group menu:** U58 6522:33026.
- The Rules sections U29–U57, U59–U62 and U64 were not audited and may draw the same entry.

Options:
- (a) Excluded. In a variant, a group's menu shows "Add message", "Reset to Standard", a divider and "Remove from Ambulance".
- (b) Adopt. This contradicts OUT-6.

No Clarification is affected.

**Q8 (C9).** The account menu shows an email line (Q13). Excluded, or adopt it?

Impact:
- **User menu:** U13 6699:44358. The menu button in every header is unchanged.

Options:
- (a) Excluded. The menu shows the name ("Laura Weber"), a divider and "Log out".
- (b) Adopt. The account's email shows under the name; this needs the email from sign-in and contradicts OUT-3 and FR-074.

No Clarification is affected.

**Q9 (S1–S5, P5).** Six P1 states have no frame. Build them from the spec on the nearest frame, or have the designer draw them first?

Build-from per state:
- **S1 (FR-003d):** P1c's error (U76 6635:36265) also shows when the day changed while the dialog was open, in the publish dialog and in "Change start date" (U87 6396:48860) and "Activate again".
- **S2 (FR-008d):** P12 (U87 6396:48860) on a scheduled connection with "Now" selected. "Save date" makes it active at once, and the details then show the active band with "Active since <date>, <time>" (U80 7355:61155).
- **S3 (FR-011c, FR-011d):** P16b (U89 7173:52959) with "On a date": the date field under the radios as in P1b (U75 6383:66119), the spec's hint, and the button "Schedule".
- **S4 (FR-012b):** P15 (U88 6417:31206) with the spec's sentence for a never-active connection (and F3).
- **S5 (FR-013c):** E3 (U98 6730:39464) for a scheduled connection with the spec's sentence and no "Active from" (F1).
- **P5 (FR-008e):** a success toast (note 24, U05 6720:39042), placed like P16's toast (U89 6417:31447), with the spec's text. If the spec gives none: "Start date saved."

Options:
- (a) Build them as listed, with the spec's wording, without frames. They become W items.
- (b) The designer draws them first: the day change, scheduled + "Now", Activate again "On a date", deactivating a scheduled connection, saving a scheduled connection, and the toast.

Both options keep CLAR 2026-11-10 #1.

**Q10 (P8, S6, S7).** Dates of pre-existing and reactivated connections.

Impact:
- **Overview date column:** U11–U18, U90.
- **Draft row with no step:** U17 6699:47974.
- **Details date pill:** U80 7355:61155 and the other details units.

(1) What does a draft without a recorded step read?
- (a) "Edited <date>" alone, as U17 draws it.
- (b) "Edited <date> · Connection step".
- (c) The step worked out from the content: no documents means "Connection step", documents but no rules means "Documents step", otherwise "Rules step".

(2) S6 and S7 change nothing visible. Rows read "Published <stored publication date>" or "Deactivated <last change time>", pills read "Active since <publication>" (FR-021a), and reactivation moves only "Active since" (US2-AS6).
- (a) Build from the spec.
- (b) The designer marks such a case first.

No Clarification is affected.

**Q11 (P6, S8–S12).** Activity entries and states that are not drawn: build them from the spec, or draw them first?

Impact:
- **Open card:** U86 6396:48527; U92 7246:52096; U95 7246:54525–7246:54545; U97 7246:56965.
- **Closed line:** U80 6396:47761; U89 6417:31345; U96 7246:55328; U97 7246:57191.

Options:
- (a) Build without frames, using the drawn row (date and time · event · person) and the spec's wording in the same style (FR-025l):
  - the scheduling entry with its date (P6)
  - name or description changed, became active on the date with no person, activated again, deleted, restored (S8)
  - the team member together with the agent, the approver together with the asking agent, and middleware entries without a person (S9)
  - a pre-existing connection's "Created" and "Published" without a person, and a closed line with the time alone (S10)
  - the open card's list scrolls down to the oldest entry (S11)
  - the card is readable for every team member (S12)
- (b) The designer draws these entries and the long list first.

No Clarification is affected.

**Q12 (S13–S16).** The undo and restore states are not drawn: build them from P18 and 1b, or draw them first?

Impact:
- **Overview and toast:** P18 (U90 6699:48039, 6699:48098).
- **Welcome page:** 1b (U11 6699:44481).

Options:
- (a) Build without frames:
  - After "Undo", the row comes back in the list without a reload and a polite announcement says so; the spec's text, or if none: "“<name>” restored."
  - "Undo" after the restore time, or a second time, changes nothing, and the toast says so; FR-036d's text, or if none: "“<name>” can no longer be restored."
  - Deleting the last connection shows 1b with the toast, and "Undo" brings back the overview with the row.
  - A replaced toast or a left page leaves the deletion standing.
- (b) The designer draws the restored overview, the too-late toast and 1b with the toast first.

See Q20 for how long the toast stays. No Clarification is affected.

**Q13 (S17–S20).** The bulk-delete outcomes are not drawn: build them from frames 8, 9 and P18, or draw them first?

Impact:
- **Selection bar:** U15 6699:45206.
- **Bulk delete dialog:** U15 6699:45320.
- **Toast:** U90 6699:48098.

Options:
- (a) Build without frames:
  - The count is announced when it changes.
  - When a selected connection vanished or changed, nothing is deleted and the dialog names it. Use FR-043b's text; if none: "Nothing was deleted: “<name>” was deleted or changed in the meantime."
  - After deletion, the rows are gone, the selection clears, the toolbar comes back and a toast shows the count with "Undo". Use FR-044b's text; if none: "<n> connections deleted."
  - Each deletion appears in the connection's activity.
  - A selected row that vanishes on refresh leaves the selection.
  - A long list scrolls inside the dialog while its buttons stay in view.
- (b) The designer draws them first.

No Clarification is affected.

**Q14 (P4, S21, S22).** Reordering without dragging (WCAG 2.5.7), and in the edit flow: build from the spec, or draw it first?

Impact:
- **Document rows, create flow:** U22 7290:62348, 7290:62349; U23 7298:61782, 7298:61783; U24 7298:62391, 7298:62392; U27; U28 7298:64174, 7298:64175.
- **Document rows, edit flow:** E1b, U98 7298:63260.
- **Notes:** note 19 (U04 6711:39375), note 23 (U05 6716:41045), note 37 (U08 7370:55195).

Options:
- (a) Build without frames:
  - A ⋯ menu button on each document row (spec 008's menu pattern) holds "Move up" and "Move down". The first row has no "Move up" and the last no "Move down" (FR-047b). With one document there is no menu (EC-14, as A5 shows, U21 7290:61204).
  - Focus stays on the moved row, and FR-047d's announcement is made; if the spec gives no text: "“<document>” moved to position <n> of <m>."
  - Escape, or a drop outside the list, restores the order.
  - E1b gets the same drag and menu (FR-049a, US6-AS5).
- (b) The designer draws the row menu and the edit-flow reorder first.

No Clarification is affected.

**Q15 (S23, S26, S27).** The approval page is not in the Figma file. Build its new content on spec 007's existing page, or have the designer draw it?

Impact:
- **Approval page:** not drawn in any unit.

Options:
- (a) Build on the existing page with the spec's wording:
  - the stored document order (FR-050c)
  - "This is still the example. Check that the name, documents and rules fit your service." (FR-060c)
  - "Active from <date>", or that the connection goes live at once (FR-065c)
  - the undrawn sentence of FR-065d
  - the refusal reasons (FR-065f, FR-066b)
  - deactivating and deleting a scheduled connection (FR-066a)
- (b) The designer draws the approval page's states first.

Both options keep CLAR 2026-11-10 #2.

**Q16 (P7, S24, S25).** The example's banner on the documents and test steps, and the example after publishing and across languages: build from 1h, or draw first?

Impact:
- **Example banner:** U18 6798:122695 (1h), 7344:96396 (1i), 7344:96451 (1i-c).
- **Example's test step:** 16b (U73 7137:50086).
- **Example's documents step:** not drawn.
- The Test frames U66–U72 and U74 were not audited.

Options:
- (a) Build without frames:
  - The "Rules/Findings banner" instance from 1h reads "This is an example. Change anything to see how it works." on the documents step and the test step. On the test step it sits above the variant tabs, as on the rules step.
  - There is no banner and no publish line after publishing.
  - The example's texts are created in the current language.
- (b) The designer adds the banner to 16b and draws the example's documents step first.

No Clarification is affected.

**Q17 (S28).** No frame shows the new controls at 320 px and 200 % zoom. Build them by the narrow rules, or draw them first?

Impact:
- the date pill with its ⋯ (U80 7355:61155)
- the "Active from" group and date field (U75 6383:66119)
- the selection bar (U15 6699:45206) and the bulk dialog (U15 6699:45320)
- the Activity card (U92 7246:52096)
- the reorder menu (Q14)

Options:
- (a) Build without frames, following the `narrow:` variant and KERN-DESIGN-SYSTEM §3.1.
- (b) The designer draws 320 px variants first.

No Clarification is affected.

**Q18 (B1).** The overview banner for unsaved work on this device (note 34) is a v9 change that no requirement covers. Keep spec 005's current handling, or build 1m and 1n now?

Impact:
- **Overview:** U16 7362:54550–7362:54557, 7362:54621–7362:54634.
- **Notes:** note 34 (U07 7370:55186), note 16 (U04 6703:39317), note 23 (U05 6716:41045).

Options:
- (a) Keep spec 005's local-draft UI (FR-074). 1m and 1n are not built in this feature.
- (b) Build them as drawn. The copy is:
  - one connection: "Unsaved changes in “<name>”", "Saved only on this device on <date>, <time>, when the page closed. Nobody else can see them.", "Discard", "Resume editing"
  - several: "Unsaved changes in <n> connections", "Saved only on this device when the page closed. Nobody else can see them.", and one line each with "Edited · <date>, <time>" or "New, never saved · <date>, <time>"

  The banner stays above the selection bar while rows are selected. Device-only connections are neither counted nor selectable. This needs German copy (FR-071a) and a new requirement.

No Clarification is affected.

**Q19 (B2).** Show rule findings in the published Summary (P9d, note 26), or keep spec 003 FR-020?

Impact:
- **Details' Summary rule tabs:** U94 7246:52833; U91 7203:50562; U93 7362:54840; U96 7246:55263.
- **Notes:** note 26 (U06 6760:48852).
- P9d (U85 6760:48437) was not audited.

Options:
- (a) Keep spec 003 FR-020 (FR-074). The Summary shows no findings, and the tab's ⓘ only shows the variant's description, as in 1i-b (U18 7344:96441). Figma drops P9d and note 26's clause about the published summary.
- (b) Adopt P9d. Finding lines and icons show per variant in the published Summary. This needs a new requirement and contradicts spec 003 FR-020 and FR-074.

No Clarification is affected.

**Q20 (P1).** Does the deletion toast close after 5 s, or keep "Undo" until it is used, dismissed or replaced?

Impact:
- **Deletion toast:** U90 6699:48098, and the bulk toast (S19).
- **Notes:** note 30 (U06 7127:49610), A12 (U24 7298:62552).
- **Other toasts:** U24 7298:62627, U99 6730:39810, U17 6699:48002.

Options:
- (a) FR-036c. The deletion toasts stay until "Undo" is used, they are closed, or another toast replaces them. "Undo" restores within 5 minutes and afterwards says the connection can no longer be restored (FR-036a, FR-036d). All other toasts keep note 30's 5 s. Figma adds "except deletion toasts" to note 30.
- (b) Note 30. Every toast closes after 5 s, so a deletion can be undone for only 5 s. FR-036c and US4-AS4 change, and FR-036a's 5 minutes no longer matter. This also weakens FR-072a (timing).

No Clarification is affected.

**Q21 (P2).** Should failures show the error ID, as spec 008 does, and does "Try again" keep the chosen date?

Impact:
- **Failed states:** P5 (U79 6376:27178), note 7 (U02 6637:36658), the Schedule, Activate again and "Save date" failures (FR-014b, undrawn), and the bulk dialog (FR-043c).

Options:
- (a) Spec 008. A server failure shows spec 008's failure alert with its error ID (errorNoticeOf, ErrorNoticeText). P5's sentence "Couldn’t publish, so nothing has changed. Check your internet connection and try again." shows only when no answer came. The alert stays slim but may wrap to fit the error ID.
- (b) Always P5's sentence, without an error ID. This contradicts FR-014a, FR-043c and the rule that a 5xx shows its error ID.

On "Try again":
- (i) It repeats the same choice: "Now", or "On a date" with the entered date.
- (ii) It falls back to "Now".

No Clarification is affected.

**Q22 (P3).** What wording do the edit dialogs use for a scheduled connection?

Impact:
- **Entry confirmation:** U87 6396:49030 (details) and U15 6699:47905 (row).
- **Step-1 note:** U98 6731:39846.
- **Leave dialog:** U99 7173:52836.
- **Discard dialog:** U100 7173:52772.

Options:
- (a) Reuse active's texts unchanged (FR-013a).
- (b) Scheduled wording:
  - entry title: "Edit this scheduled connection?" (the row's "Edit “<name>”?" stays)
  - entry body: "Your changes only take effect when you save them. Saved changes become active on <date>."
  - step-1 note: "Scheduled. Your changes become active on <date> once you save them."
  - leave dialog: "If you leave now, your changes are lost. Save them, or discard them and keep the scheduled version."
  - discard dialog: "The connection goes back to the version that becomes active on <date>. Citizens aren't affected."

  Each text also needs German (FR-071a).

No Clarification is affected.

**Q23 (P9).** Under reduced motion, should dragging and reordering keep fades (note 31) or have no transitions (EC-17)?

Impact:
- **Documents step reorder:** U27, U28.
- **Notes:** note 31 (U06 7137:50569).

Options:
- (a) EC-17. With reduced motion, dragging and reordering have no transitions, and the drop just updates the list. Everything else follows spec 008's rule.
- (b) Note 31. Fades stay under reduced motion everywhere, including reordering, and EC-17 becomes "fades only".

No Clarification is affected.

**Q24 (P10).** Does the page language follow the chosen language, or stay "en" as note 1 says?

Impact:
- **Every page's `<html>` element:** note 1 (U01 6637:36640).

Options:
- (a) `lang` follows the chosen language ("en" or "de", spec 009, as built). Note 1's `data-kern-theme="light"` and color-scheme meta stay.
- (b) `lang="en"` always. German pages are then announced as English, which contradicts FR-071a and spec 009.

No Clarification is affected.

## Coverage
UI = N requirements (77) are not checked against Figma. "(note only)" means only a build note maps the requirement.

| req-id | status | units |
|---|---|---|
| FR-001a | COVERED → F8 | U01, U02 (PARTIAL), U63, U73, U75, U76, U77 |
| FR-001b | COVERED | U63, U73, U75, U77 |
| FR-001c | COVERED | U63, U73, U75, U77 |
| FR-002a | COVERED | U75, U76 |
| FR-002b | COVERED | U02, U75, U76, U87 |
| FR-002c | COVERED | U75, U76 |
| FR-003b | COVERED | U02, U76 |
| FR-003c | COVERED | U02, U75, U76 |
| FR-003d | SPEC-ONLY (S1) | – |
| FR-004b | COVERED | U06, U86, U90, U94 |
| FR-006a | COVERED | U04, U07, U11, U12, U13, U17, U58, U63, U78, U86, U91, U92, U94, U95 |
| FR-006b | COVERED | U04, U13, U14 |
| FR-006c | COVERED | U07, U86, U94, U95, U99 (PARTIAL U03, X17) |
| FR-006d | COVERED | U02, U07, U86, U94, U95 |
| FR-006e | COVERED | U86, U94, U95 |
| FR-006f | COVERED | U04, U07, U14, U99 |
| FR-007 | COVERED | U02, U05, U58, U63, U80, U82, U86, U88, U90–U95 |
| FR-008a | COVERED | U06, U87, U88, U95 |
| FR-008b | COVERED | U01, U87 |
| FR-008c | COVERED | U87 |
| FR-008d | SPEC-ONLY (S2) | – |
| FR-008e | PARTIAL (P5) | U05 |
| FR-009a | COVERED | U01 (PARTIAL), U06, U58, U80, U82, U87, U88, U91, U92, U99 |
| FR-009b | COVERED | U87 |
| FR-009d | CONFLICT → F2 | U87 |
| FR-009e | COVERED; CONFLICT → F1 | U05, U15, U87, U98, U99 |
| FR-009f | CONFLICT → F1 | U05, U98 |
| FR-010 | COVERED | U04, U14 |
| FR-011a | COVERED → F8 | U01, U02, U89, U96, U97 |
| FR-011b | COVERED | U05, U89 |
| FR-011c | SPEC-ONLY (S3) | – |
| FR-011d | SPEC-ONLY (S3) | – |
| FR-012a | COVERED | U96, U97 |
| FR-012b | SPEC-ONLY (S4) | – |
| FR-013a | COVERED | U05, U06, U15, U87, U99 |
| FR-013c | SPEC-ONLY (S5) | – |
| FR-014a | COVERED | U02, U78, U79 |
| FR-014b | PARTIAL (P2) | U79 |
| FR-015a | COVERED | U07, U58, U63, U80–U82, U86–U92, U94–U97, U99 |
| FR-015b | COVERED | U58, U63, U80–U82, U86–U88, U90–U92, U99 |
| FR-015c | COVERED | U86, U94, U95 |
| FR-015d | COVERED | U89, U96, U97 |
| FR-015e | COVERED | U04, U93 |
| FR-016a | COVERED | U01 (PARTIAL), U07, U58, U63, U80–U82, U86–U97 |
| FR-016b | COVERED | U07, U89, U96, U97 |
| FR-017a | COVERED; CONFLICT → F5 | U04, U11–U18, U90 |
| FR-017b | COVERED | U04, U13, U14 |
| FR-017c | COVERED | U04, U11–U18, U90 |
| FR-017d | COVERED; PARTIAL → F4 | U04, U06, U17; PARTIAL U11–U16, U18, U90 |
| FR-019a | COVERED; PARTIAL → F4 (P8 open) | U04, U06, U17, U22, U65; PARTIAL U11–U16, U18, U90 |
| FR-019c | COVERED | U04, U11, U12, U13, U15, U16, U17 |
| FR-020a | COVERED | U02, U06, U11–U13, U16, U17, U58, U63, U75, U76, U80–U82, U86–U97 |
| FR-020b | COVERED | U86, U94, U99 |
| FR-021b | SPEC-ONLY (S6) | – |
| FR-022a | COVERED | U04, U06, U07, U58, U63, U80–U82, U86, U88, U90–U97 |
| FR-022b | COVERED | U06, U58, U63, U80–U82, U86–U97 |
| FR-022c | COVERED | U86, U92, U95, U97 |
| FR-022d | COVERED | U06, U07, U80, U81, U89, U91–U97 (PARTIAL U82, U86, X20) |
| FR-023a | COVERED | U86, U92, U95, U97 |
| FR-023b | COVERED | U86, U92, U95, U97 |
| FR-024a | COVERED | U58, U63, U80–U82, U86–U97 |
| FR-024b | COVERED | U89, U96, U97 |
| FR-025a | COVERED | U86, U92, U95, U97 |
| FR-025b | SPEC-ONLY (S8) | (U98 maps only the input fields) |
| FR-025c | COVERED | U86, U92, U95, U97 |
| FR-025d | COVERED | U86, U92, U95, U97 |
| FR-025e | COVERED | U86, U92, U95, U97 |
| FR-025f | COVERED | U86, U92, U95, U97 |
| FR-025g | PARTIAL (P6) | U95 |
| FR-025h | SPEC-ONLY (S8) | – |
| FR-025i | COVERED | U97 |
| FR-025j | SPEC-ONLY (S8) | – |
| FR-025k | SPEC-ONLY (S8) | – |
| FR-025l | COVERED | U86, U92, U95, U97 |
| FR-027a | COVERED | U80, U82, U86, U92, U95, U97, U99 |
| FR-027b | SPEC-ONLY (S9) | – |
| FR-027c | SPEC-ONLY (S9) | – |
| FR-027d | SPEC-ONLY (S9) | – |
| FR-031a | SPEC-ONLY (S12) | – |
| FR-032a | SPEC-ONLY (S10) | – |
| FR-032b | SPEC-ONLY (S10) | – |
| FR-033 | COVERED | U04, U05, U06, U11–U17, U90 |
| FR-034d | SPEC-ONLY (S13) | – |
| FR-034e | SPEC-ONLY (S13) | – |
| FR-035a | COVERED | U14, U90 |
| FR-036b | COVERED | U90 (PARTIAL U06) |
| FR-036c | PARTIAL (P1) | U06 |
| FR-036d | COVERED (note only) | U04 |
| FR-037a | COVERED | U06 |
| FR-037b | SPEC-ONLY (S15) | – |
| FR-038a | COVERED | U01, U04, U06, U11–U18, U90 |
| FR-038b | COVERED; PARTIAL → F9 | U11–U16, U18, U90; PARTIAL U17 |
| FR-038c | COVERED | U04, U11–U18, U90 |
| FR-039a | COVERED | U04, U12, U14–U18, U90 |
| FR-039b | SPEC-ONLY (S17) | – |
| FR-039c | COVERED | U04, U13, U14, U15, U16, U17 |
| FR-040a | COVERED | U01, U14, U15, U16, U17, U90 |
| FR-040b | COVERED | U04, U12, U14, U15 |
| FR-041a | COVERED | U06, U15 |
| FR-041b | COVERED | U04, U15 |
| FR-041c | COVERED | U04, U15 |
| FR-041d | COVERED (note only) | U04 |
| FR-041e | COVERED | U15 |
| FR-041f | COVERED (note only) | U04 |
| FR-042a | COVERED | U06, U15 |
| FR-042b | COVERED | U06, U15 |
| FR-043b | SPEC-ONLY (S18) | – |
| FR-043c | COVERED ? (note only; P2) | U02 |
| FR-044a | SPEC-ONLY (S19) | – |
| FR-044b | COVERED | U04, U05 |
| FR-044c | SPEC-ONLY (S19) | – |
| FR-045b | COVERED | U04, U21–U24, U28, U98 |
| FR-045c | COVERED | U24 |
| FR-046a | COVERED | U04, U23, U27, U28 |
| FR-046b | COVERED | U04, U27 |
| FR-046c | COVERED | U28 |
| FR-046d | COVERED | U04 |
| FR-046e | SPEC-ONLY (S21) | – |
| FR-047a | COVERED (note only); PARTIAL (P4) | U08; PARTIAL U04, U05, U22, U24, U98 |
| FR-047b | COVERED | U08, U21 |
| FR-047c | COVERED (note only) | U08 |
| FR-047d | COVERED (note only) | U08 |
| FR-048a | COVERED | U27, U28 |
| FR-048b | COVERED | U21–U24, U27, U28, U98 |
| FR-049a | COVERED; PARTIAL (P4) | U23, U27, U28; PARTIAL U98 |
| FR-050a | COVERED | U21, U22, U63, U65, U75–U79 |
| FR-050b | COVERED | U03, U63, U73, U75–U77, U82, U89, U91, U93, U94, U96, U98 |
| FR-050c | SPEC-ONLY (S23) | – |
| FR-050e | COVERED | U21–U24, U27, U82, U91, U93, U94, U98 |
| FR-053a | COVERED → F6 | U06, U11, U18 (CONFLICT U04, X16) |
| FR-053b | COVERED | U11–U18, U90 |
| FR-054a | COVERED | U06, U18 |
| FR-054b | COVERED | U18 |
| FR-054c | COVERED | U06, U18 |
| FR-055a | COVERED | U06, U18 |
| FR-055b | COVERED | U06, U18, U73 |
| FR-055c | COVERED | U06, U73 |
| FR-055d | COVERED | U03, U18, U82 |
| FR-055e | COVERED | U03, U18, U82 |
| FR-055f | COVERED | U05, U18 |
| FR-055g | COVERED | U05, U18 |
| FR-057 | COVERED | U06, U18, U73 |
| FR-058a | COVERED | U06, U18 |
| FR-058b | COVERED | U18 |
| FR-058c | COVERED | U18 |
| FR-058d | COVERED (note only); PARTIAL (P7) | U06; PARTIAL U73 |
| FR-058e | COVERED | U18 |
| FR-059 | SPEC-ONLY (S24) | – |
| FR-060a | COVERED | U06, U73 |
| FR-060b | COVERED | U73, U75, U77 |
| FR-060c | SPEC-ONLY (S26) | – |
| FR-061 | SPEC-ONLY (S25) | – |
| FR-065c | SPEC-ONLY (S27) | – |
| FR-065d | SPEC-ONLY (S27) | – |
| FR-065f | SPEC-ONLY (S27) | – |
| FR-066a | SPEC-ONLY (S27) | – |
| FR-066b | SPEC-ONLY (S27) | – |
| FR-067b | COVERED (note only) | U04 |
| FR-070a | COVERED | U01, U03, U27, U28, U58 |
| FR-070b | COVERED | U03 |
| FR-071a | PARTIAL (P10) | U01 |
| FR-071c | COVERED | U03, U95 |
| FR-072a | COVERED | U01, U08, U15, U76 |
| FR-072b | COVERED | U01 |
| US1-AS1 | COVERED | U63, U73, U75 |
| US1-AS2 | COVERED | U75, U76 |
| US1-AS3 | COVERED | U02, U76 |
| US1-AS4 | COVERED | U07, U86, U94, U95 |
| US1-AS5 | COVERED | U04, U05, U13, U14 |
| US1-AS6 | COVERED | U58, U63, U80–U82, U86–U88, U90–U92, U99 |
| US1-AS7 | COVERED | U07, U87, U94, U95 |
| US1-AS8 | COVERED | U89, U97 |
| US1-AS9 | COVERED | U05, U06, U15, U99 |
| US1-AS10 | COVERED | U14 |
| US1-AS11 | CONFLICT → F1, F2 | U87, U98 |
| US2-AS1 | COVERED; CONFLICT → F5 | U11–U18; CONFLICT U90 |
| US2-AS2 | COVERED | U11–U18, U90 |
| US2-AS3 | COVERED; PARTIAL → F4 | U06, U17; PARTIAL U11–U16, U18, U90 |
| US2-AS4 | COVERED | U58, U63, U80–U82, U86–U88, U90–U92, U99 |
| US2-AS5 | COVERED | U89, U96, U97 |
| US2-AS6 | SPEC-ONLY (S7) | – |
| US3-AS1 | COVERED | U58, U63, U80–U82, U86–U97, U99 |
| US3-AS2 | COVERED | U06, U81, U86, U92, U95, U97 |
| US3-AS3 | COVERED | U89, U96, U97 |
| US3-AS4 | SPEC-ONLY (S9) | – |
| US3-AS5 | SPEC-ONLY (S9) | – |
| US3-AS6 | SPEC-ONLY (S8) | – |
| US4-AS1 | COVERED | U05, U90 |
| US4-AS2 | SPEC-ONLY (S13) | – |
| US4-AS3 | SPEC-ONLY (S15) | – |
| US4-AS4 | SPEC-ONLY (S14) | – |
| US5-AS1 | COVERED | U04, U15 |
| US5-AS2 | COVERED | U15 |
| US5-AS3 | SPEC-ONLY (S19) | – |
| US5-AS4 | SPEC-ONLY (S18) | – |
| US5-AS5 | COVERED | U15 |
| US6-AS1 | COVERED | U27, U28 |
| US6-AS2 | COVERED | U04, U27 |
| US6-AS3 | COVERED (note only) | U08 |
| US6-AS4 | COVERED | U65, U73, U75, U76, U77, U82, U91 |
| US6-AS5 | SPEC-ONLY (S22) | – |
| US7-AS1 | COVERED → F6 | U18; PARTIAL U11 |
| US7-AS2 | COVERED | U18 |
| US7-AS3 | COVERED | U06, U18 |
| US7-AS4 | COVERED | U18 |
| US7-AS5 | COVERED | U06, U73 |
| US7-AS6 | COVERED | U11–U18, U90 |
| US8-AS3 | SPEC-ONLY (S27) | – |
| EC-1 | COVERED (note only) | U02 |
| EC-3 | COVERED | U96, U97 |
| EC-6 | SPEC-ONLY (S14) | – |
| EC-7 | SPEC-ONLY (S16) | – |
| EC-8a | SPEC-ONLY (S6) | – |
| EC-8c | SPEC-ONLY (S10) | – |
| EC-10 | SPEC-ONLY (S11) | – |
| EC-11 | COVERED | U11, U15, U16 |
| EC-12 | SPEC-ONLY (S20) | – |
| EC-13 | SPEC-ONLY (S20) | – |
| EC-14 | COVERED | U21, U24 |
| EC-15 | SPEC-ONLY (S21) | – |
| EC-16 | COVERED | U24 |
| EC-17 | PARTIAL (P9) | U06 |
| EC-19 | SPEC-ONLY (S25) | – |
| EC-21 | SPEC-ONLY (S28) | – |
| ENT-ConnectionStatus.value | COVERED | U07, U11–U13, U15, U17, U22, U58, U63, U80–U82, U92, U93, U96 |
| ENT-StatusDates.published | COVERED | U11, U13–U17 |
| ENT-StatusDates.activeSince | COVERED | U58, U63, U80–U82, U90–U92, U99 |
| ENT-StatusDates.deactivated | COVERED | U11, U13–U17, U89, U96, U97 |
| ENT-ActivityEntry.when | COVERED | U86, U92, U95, U97 |
| ENT-ActivityEntry.what | COVERED | U86, U92, U95, U97 |
| ENT-ActivityEntry.who | COVERED | U86, U92, U95, U97 |
| ENT-DocumentOrder.position | COVERED | U22, U24, U28, U96 (PARTIAL U23) |
| ENT-ExampleMark.isExample | SPEC-ONLY (S24) | – |
| ENT-ExampleMark.changed | COVERED | U73, U77 |
| ENT-Selection.rows | COVERED | U11, U12, U13, U15 |

## Not audited
52 units are OUT: they were scoped to other features and not audited. No unit is UNCERTAIN, FAILED or RATE_LIMIT.
- U09: Note 11b, the rule logic table
- U10: Start · 1 · Log in
- U19: Connection · 1 · Create connection
- U20: Documents 1 · A1–A4 (no documents yet)
- U25: Documents 2 · A13, A14 (set rules with a document that has no data)
- U26: Documents 2 · V9
- U29–U57, U59–U62, U64: Rules sections 1–12 (only U58 and U63 were audited)
- U66–U72, U74: Test 1 · 3–15, 18–20 (only U65 and U73 were audited)
- U83–U85: Publish 1b · P9b, P9c, P9d. P9d is the designer-flagged Summary with findings; see B2 and Q19.
- U101: How other tools do it (research)

Where these gaps matter:
- The unaudited Test frames may hold more of C6 ("Generate all", "Generate again") and C7 (the met-applicant message), and any example banner on the test step (P7).
- The unaudited Rules frames (2b, 10, 11) may hold more group actions (C8) and undo toasts (C3, OUT-9).
- None of the 101 units holds the approval page, so S23, S26 and S27 are certain gaps, not unaudited ones.
- The other spec-only items (S1–S22, S24, S25, S28) have no likely home in the unaudited units, judging by their titles.
