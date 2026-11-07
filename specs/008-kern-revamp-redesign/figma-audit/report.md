# Figma ↔ spec audit — 2026-11-07

## Summary
Units audited 100/101 (OUT 1, UNCERTAIN 0, FAILED 0). Figma calls 290 (289 in units + 1 mapper).

Governance: spec.md says **"Figma decides wording"**. So a pure wording difference is *copy to port* (listed under cosmetic, no question). Only copy that comes from outside the frontend, or a renamed concept, becomes a C question. Each question carries its kind (F, W or C) from the spec's drift table.

The only design decisions are in Clarifications session 2026-11-06:
- **#1** — defer features that would need a backend, rules-package or MCP change.
- **#2** — adjust colour pairs that fail AA.
- **#3** is about verification tables. It settles no item here.

| category | count |
|---|---|
| Conflicts (open) | 38 |
| Spec-only (open) | 25 |
| Figma-only, behavioural (open) | 4 |
| Partial matches (open) | 21 |
| Figma-only, cosmetic, copy to port and ui-detail (FYI) | 42 |
| Figma must change (decided) | 13 |
| Build without frames (decided) | 1 |
| Copy from outside the frontend (decided) | 0 |

Top 5 issues (open items only):
1. **Compact "Step n of 4" header** with four unlabelled, non-clickable steps, against five labelled progress entries (004-S0.1, 004-S0.3). It is in every wizard frame. Conflict 5, Q7.
2. **Product name "Konnekt"** replaces "Connection Portal" on every screen, in the consent and account texts and in the MCP guidance. C item, Q1. "citizen" for "applicant" (Q2) also reaches the findings and rules-package texts.
3. **The documents step is redesigned**: master-detail list, pager, counter, search card, inline remove, undo, nothing-chosen validation and drag reordering. Spec 002 explicitly does not build these (002-S1.8, 002-S1.9). Conflicts 6–10, Q14.
4. **Leaving the wizard stores a draft.** The product name and breadcrumb run Save and exit, there are leave dialogs, and the log-out dialog asks "Save before you log out?". The baseline keeps the work as a local draft instead (spec 005). Conflicts 1–2, Q8.
5. **Whole screens and dialogs aren't drawn**: spec 007's consent, account and approval pages, and spec 005's conflict, restore, discard and catalog-dropped-data states (W items). Spec-only 4–8 and 22–24, Q41 and Q43.

## Conflicts
| # | req | Figma (unit, node-id) | conflict |
|---|---|---|---|
| 1 | 001-S0.6, 005-S0.1, 005-S0.6, 005-S1.1, 005-S4.1, FR-003 | U03 #35 (6703:39311); U05 #41, #43 (6730:40338); U06 #51, #70, #90; U17 #2, #5, #21, #22, #24 (7173:52656, 6890:46052, 7173:52682); U99 #33; strip "Starts as a draft…" U07 #18, U18 #20, U19 #13 | In a flow, the product name and the "Your connections" crumb run Save and exit and store a draft, and validation can block leaving. Leave dialogs say "you lose all progress" and offer "Discard connection" / "Save progress". A beforeunload "Leave site?" warns that changes are lost. An open rule editor is kept in the draft. The baseline navigates, keeps a local draft and offers it on the overview, and asks "Save changes to Rule 01?" first. |
| 2 | 005-S7.2–S7.5 | U05 #42; U17 #19, #20 (6408:72919); U17 #1 | The design's log-out dialog is "Save before you log out?" with "Save and log out" and "Log out anyway", and has no Cancel. The baseline's is "Log out and discard unsaved work?", lists the names, says "Saved drafts stay as they are.", and has "Log out" (danger) and "Cancel". |
| 3 | 001-S4.1, 001-S4.2, 001-S4.8, 001-S3.6 | U11 #28 (6699:44481); U18 #4, #5 (6793:47682); U06 #85, #86 | The welcome page "Welcome to Konnekt" is shown to first-time users, and its state is kept in localStorage. The baseline opens step 1 directly on /get-started, stores nothing, and shows the empty overview only through the product name. |
| 4 | US1-AS1, 001-S1.2 | U10 #13 (6401:28435) | Only the Username field gets the error fill, which hints at which field was wrong. |
| 5 | 004-S0.1, 004-S0.2, 004-S0.3, 004-S7.3, 001-S6.2, 005-S6.2, US2-AS1 | U02 #1, #2, #4 (6637:36653); U03 #42; U05 #29; U06 #23, #67; header of every wizard frame (e.g. U17 6701:39488, U62 7112:47827, U67 7058:60675, U98 #8, #9, U99 #24, U100 #6); details U63 #27, U80 #27, U83 #37, U86 #32 | The header is a compact "Step n of 4" with four unlabelled segments and "Next: …" / "Last step". It isn't clickable when creating and is clickable when editing. The Published page has no step line. The baseline has five labelled entries whose finished steps lead back, and doesn't build the compact header. |
| 6 | 002-S1.8, 001-S5.2, 001-S5.3 | U04 #36–#38 (6711:39373); U06 #71; U20 #8, #15–#17, #20; U21 #8, #10, #17, #21–#23; U22 #9, #11, #20, #23, #25; U23 #8, #10, #18; U24 #8, #10, #17; U25 #8, #15; U26 #8, #9, #19 (6324:40326); U27 #8, #14, #20; U28 #9, #13, #21; U98 #20, #22, #27 | The documents step is a master-detail list showing one document at a time. It adds a "Document n of m" pager, an "Added documents (n)" counter, and a search card with suggestions ("Available (n)"). The baseline keeps spec 001's step. |
| 7 | 002-S1.9, 001-S5.4, 002-S1.1 | U22 #12; U23 #11, #12, #20 (7298:61765); U24 #11, #27 (7298:62374); U25 #10; U26 #11; U28 #14; U98 #22 | The design has an inline trash on the list item, an undo toast after removing a document, and a confirmation for a document no rule checks. The baseline builds none of these. |
| 8 | 002-S1.9, 001-S5.5, 001-S5.6, 001-S7.6, 002-S1.4, US2-AS3 | U04 #30, #32, #33; U05 #9; U20 #14 (7290:60367); U22 #14; U25 #17, #20, #22–#24 (7298:62636) | The design has nothing-chosen validation: an inline red line, "1 document needs data", and a dialog with "Choose data" / "Remove them and continue". "Set rules →" is disabled with the hint "Add a document first". The baseline keeps going on enabled and refuses an attempt with a message, moving the focus. |
| 9 | 002-S1.5, 004-S1.1, 005-S0.3 | U04 #34; U28 #25 | The documents step has no "Publish without rules" while no variant has rules. |
| 10 | FR-009a, 001-S7.2, EC-1 | U04 #42, #43; U08 #2, #3 (7370:55193); U23 #13; U27 #11–#13, #24 (7298:63317); U28 #12 (7298:64157) | Documents are reordered by drag (press and hold on touch) with no keyboard alternative. A stored order may need the API. |
| 11 | 006-S1.1, 006-S1.3, 006-S1.4, 006-S1.5 | U04 #24 (6703:39321); U18 #18, #19; U19 #11; U98 #13, #14; U52 #26 | The description is a multi-line textarea, and the ⓘ sits next to "Connection name" instead of the description. |
| 12 | 005-S1.2 | U04 #27 | With an empty name, "Save and exit" just leaves. The baseline sends the flow to step 1 with "Enter a name." |
| 13 | 005-S1.4, 005-S1.7, 005-S1.8, 005-S0.4, FR-008 | U02 #5, #6 (build note 7); U05 #22; U17 #3, #23; U51 #22; U79 #4 | A failed save shows a neutral toast with Retry. Alerts are title-only, with no error ID, "Try again" or list. Saving is a blocking modal, "Saving your draft…". The baseline uses a KERN danger alert with the error ID and "Try again", moves the focus to it, and shows an aria-disabled "Saving…" button with a polite status. |
| 14 | 004-S2.1, 004-S2.4, 004-S2.6, 004-S2.7, 002-S2.23, 002-S3.11, 003-S2.22 | U01 #21, #22; U06 #58; U29 #18; U30 #24, #47; U31 #33; U32 #42; U33 #25; U35 #38; U36 #20; U40 #26; U48 #21; U49 #14; U50 #21; U51 #36; U53 #34; U64 #33 | "Test rules" (Publish) is disabled while a rule is open, incomplete or in error, or while grouping. It shows "Save the rule first" / "Finish grouping first" and hover explanations. The baseline keeps it enabled, asks "Save changes to Rule 01?", and refuses with a message. |
| 15 | 002-S2.1, 002-S2.2, 002-S2.3 | U30 #25; U33 #8; U49 #5; U50 #32; U51 #27, #37; U53 #8 | No variant tab row is drawn before the first rule or while a rule is edited. |
| 16 | 004-S8.2.6, 002-S4.3, 002-S4.25 | U02 #21; U07 #20; U18 #25 (7344:96402); U30 #26, #29; U31 #11; U32 #10; U34 #10; U35 #10; U36 #9; U37 #10; U40 #35 (6961:56304); U43 #10; U44 #11; U45 #10; U46 #10, #28; U50 #10; U51 #10; U52 #10; U55 #10; U56 #10 (6522:32507); U59 #9; U62 #28 (7112:48689); U64 #15; U65 #10; U67 #10; U68 #10; U72 #10; U75 #19; U78 #15; U79 #19; U98 #31; U99 #27; U100 #9 | The design shows a "What is a variant" ⓘ next to "+ Add variant", and an info icon on the Standard tab even without a description. Both are listed as not built. |
| 17 | 002-S4.4, 002-S4.22, 002-S2.17 | U59 #13–#15 (6523:37251); U60 #9 (6523:37675); U62 #6 (7112:47821) | Variants are renamed inline in the tab (double-click or ⋯ › Rename, "Enter saves · Esc cancels"), so the description can't be edited. The baseline's "Rename" opens the "Edit variant" dialog. |
| 18 | 007-S4.1, 007-S4.2, 007-S4.6, 002-S2.16, 002-S2.19, 002-S2.10 | U09 #44; U34 #25; U36 #15, #28; U41 #22; U47 #17, #30, #34; U54 #2, #10 (6522:33105); U55 #27, #30, #33, #34; U56 #25, #29, #30, #40; U57 #18, #19, #22; U58 #23, #28; U59 #11; U61 #25 | The menus lack "Copy link" (also after Restore), "Rename" and "Copy to variant". Removed items get "Restore only". The sub-group menu offers "Group with other rules", although a sub-group offers no further grouping. |
| 19 | 002-S2.13, 002-S2.14, 002-S4.18 | U35 #21, #40; U47 #35; U51 #21, #24 | A group keeps a single member and an empty group is drawn, but the baseline dissolves both. A sub-group that moves up is renamed "Group 01" instead of keeping its name. |
| 20 | 002-S2.5 | U35 #28 (+ hints #27, #35) | Rules inside a group that has its own message hide their own messages. |
| 21 | 002-S2.8, 002-S4.31 | U40 #29, #30 (6961:56291); U62 #19, #21 | A connector is missing between groups and a trailing one is drawn. The link icon is on some linked rules only. |
| 22 | 002-S3.12–S3.18, 002-S3.30 | U09 #24, #27 (6986:50041); U29 #27; U31 #40, #43; U03 #2; U46 #13; U49 #18; U50 #24; U53 #16, #36 | The design has no "from now" checks for the Date of birth, and its hint drops "the time from now". It shows a fixed date for the Date of birth, "Time passed / Time left", "at most", "on", a unit picker on age checks, and "starts with". |
| 23 | 002-S2.7, 002-S6.12 | U03 #10; U83 #24 | Saved rules show their identifier in the rules step, and the details lack it. |
| 24 | 004-S8.5.1, 004-S8.5.2, 004-S8.5.9, 004-S8.5.10, 004-S8.10.2, 004-S8.10.3, 004-ACC.4 | U06 #36, #43, #79; U66 #26, #27, #32 (7058:60514); U67 #26, #27, #35, #36, #39 (7058:60806, 7058:60824) | "Edit data" opens a dialog with "Results update when you save.", "Cancel" and "Save and test". An error blocks the whole save, and a toast says "Results updated. Mia now meets Rule 01." The baseline edits inline, applies valid changes at once and announces per variant. |
| 25 | 004-S8.6.7 | U06 #32; U65 #28; U70 #22 | A met variant shows a "Message Mia reads" box with "Your wallet data meets the requirements. Other documents are checked separately." |
| 26 | 004-S8.3.1, 004-S8.3.2 | U63 #8; U76 #11; U77 #21; U79 #21 (+ U75 #20, U78 #16) | The persona cards have an avatar, age · nationality and the text "Meets the rules" / "Doesn't meet the rules". The Test 1 frames (U65–U72) draw the baseline chips. |
| 27 | 004-S8.9.3 | U74 #24 (7062:51784) | The design shows "Your rules are saved.", which is listed as not built. |
| 28 | 004-S5.3 | U63 #24; U73 #26; U75 #8 (6376:25536); U76 #32 (6635:36265); U77 #12; U79 #6 (6376:27178) | The publish dialog has "Back to test", which is listed as not built. |
| 29 | 002-S7.3, 002-S5.10 | U05 #26; U06 #65; U15 #23, #25 (6699:47905); U87 #23, #25 (6396:49030) | The design asks "Edit "<name>"?" on entering the edit flow ("Cancel" / "Edit connection"). The baseline doesn't build this; the save dialog asks instead. |
| 30 | 004-S2.3, 004-S5.1, 002-S7.1, 004-S0.4, 002-S5.10 | U05 #33; U98 #4, #18, #43; U99 #35; U100 #17 | The edit flow has Save on every step and opens the save dialog from the rules step. It shows an "Active" badge in the header, and its leave dialog has a "Save" that saves directly. |
| 31 | 002-S6.6, 002-S7.2, 007-S5.8 | U06 #87 | Changing the rules from the details always opens step 1. |
| 32 | 002-S6.3, 002-S6.9 | U06 #60, #83; U91 #19 | The details are accordions (Links, Summary, Activity). Summary opens first when you arrive from "View", and only one accordion is open at a time. The baseline's rules card is collapsed by default. |
| 33 | 003-S6.1 | U06 #10; U85 #1, #20, #21 (6760:48437) | The published details show findings lines and tab icons (the designer flagged this). |
| 34 | 002-S6.9, 001-S7.7 | U06 #81; U81 #25 (6396:47841) | The copy button turns into "✓ Copied" for 2 s, which is listed as not built. |
| 35 | 002-S6.9 | U07 #28; U58 #40; U63 #36; U80 #18; U81 #21; U82 #15; U83 #17; U84 #21; U85 #17; U86 #20 (6396:48385); U87 #13; U88 #19; U89 #22 (6417:31343); U90 #19; U91 #17; U92 #13; U93 #10; U94 #14; U95 #15; U96 #20; U97 #13; U99 #15 | The details have "Download PDF", which is listed as not built. |
| 36 | 002-S6.9, 005-S3.3 | details: U58 #31, U63 #28, U80 #7 (7355:61158), U81 #8 (7355:61822), U82 #7, U83 #7, U84 #8, U85 #8, U86 #8, U87 #7, U88 #8, U90 #15, U91 #7, U92 #8, U99 #7; deactivated: U89 #8, U96 #7 (7355:60885), U97 #7; overview: U11 #15, U13 #13, #15, U14 #10, #12, U15 #15, #17, U17 #35, U18 #43, U90 #31 | The design shows status timestamps: "Active since …" (= "Live since", not built) and "Deactivated since …". Overview rows read "Published <date>" / "Deactivated <date>". These may need dates the API doesn't provide. |
| 37 | 001-S6.9, 001-S6.10 | U05 #24; U89 #26 | A toast with "Undo" follows deactivating. The baseline reverses a deactivation only through Reactivate, and requests in progress are already cancelled. |
| 38 | OUT-6 | U03 #40; U05 #30; U06 #94, #97, #98, #101; U78 #6 | The design defines motion: a pill grows in 240 ms, colour changes take 150 ms, pages fade in 150 ms, heights animate in 150–200 ms, dialogs fade, a 0.5 s delay follows publishing, and there is a reduced-motion rule. OUT-6 assumes the design defines none. |

## Spec-only (not in Figma)
A requirement whose only mapping is a CONFLICT is handled under Conflicts; Coverage shows it as CONFLICT.

| # | req | prio | expected surface | note |
|---|---|---|---|---|
| 1 | 001-S0.2, 001-S0.4, EC-9 | P1 | Sign-in guard (routing) | Nothing to draw. Built as the baseline. Q44 |
| 2 | 001-S3.7 | P1 | Overview: error state | No error frame. Q44 |
| 3 | 001-S4.3, 001-S4.5, 005-S4.11, 005-R.2 | P1 | First connection (/get-started) | Validation as on /form-connections/new, reopening from a bookmark, the flow's own local draft not listed, ?local=. Q41 |
| 4 | 005-S4.8, 005-S4.10, 005-S4.12, 005-S4.13 | P1 | Local drafts offer: discard dialog, status and focus after discarding, other tabs, no storage | U16 draws the offer and its buttons only. Q41 |
| 5 | 005-R.1, 005-S0.6, 005-S0.10, 005-S0.11, 005-S1.6, 005-S1.9, 005-S1.10, 001-S5.7, 001-S5.10, 001-S5.11 | P2 | Wizard: flow key in the URL, no badge before the first save, moving to documents for dropped data, checks rerun, failure keeps the work, 401, alert lifetime, the API's 400 message, loading and load errors | Q41 |
| 6 | 005-S2.1–S2.13, US2-AS5 | P2 | Conflict dialog (draft_changed, draft_published, draft_deleted) | Q41 |
| 7 | 005-S5.1–S5.4 | P2 | Restore dialog | Only build note U06 #57 touches it. Q41 |
| 8 | 005-S8.1–S8.6 | P2 | Documents step: alert for data the catalog no longer offers | Build note 7 (Conflict 13) limits alerts to a title. Q41 |
| 9 | 006-S1.6, 006-S1.8 | P2 | Step 1: description placeholder and too-long error | Q41 |
| 10 | 002-S2.20, 002-S2.21, 002-S2.24, 002-S2.36 | P3 | Rules step: reserved "Rule NN" names, names an undo could bring back, focus after a refused attempt, Standard's delete-group dialog naming variants | 002-S2.20 is copy:server. Q42 |
| 11 | 002-S3.31 | P3 | Rules step: saved statement shows the letter-case setting | Q42 |
| 12 | 002-S4.9, 002-S4.27, 002-S4.28, 002-S4.30 | P3 | Variant marks: switched top-level AND/OR and its badge on the first connector, propagation when Standard removes a rule | Q42 |
| 13 | 003-S2.5, 003-S2.17, 003-S2.19, 003-S2.20, 003-S2.21, 003-S4.4, 003-ACC.5, 003-ACC.6, 003-CP.3, 003-CP.6, 003-CP.15, 003-CP.17, 003-CP.18 | P3 | Findings: hidden kind text, notice without links, update in place, status region, tab accessible name, reflow, undrawn texts | U03 #22: the Flow draws no findings. Q42 |
| 14 | 004-S2.5 | P3 | Rules step: "Save changes?" leaves no rule | Q42 |
| 15 | 004-S8.5, 004-S8.5.8, 004-S8.5.13, 004-S8.6.5, 004-S8.7.3, 004-S8.7.4, 004-S8.10.1, 004-ACC.2, 004-ACC.3 | P3 | Test step: later flow's loading, clearing fields, class dates returning, group members, "all" dialog, name kept, status region, arrow keys, focus | Q42 |
| 16 | 007-S4.5, 007-S5.1, 007-S5.2, 007-S5.4–S5.8, US3-AS5 | P3 | Deep links into the rules step: notices, focus, history; toast announcement | Q42 |
| 17 | 002-S5.4, 002-S5.5, 002-S5.6 | P4 | Publish dialog: rules_changed conflict, "Publish without rules?" | Q41 |
| 18 | 001-S6.14, US4-AS6 | P4 | Details: deleted or unknown connection | Q44 |
| 19 | 005-S6.3, 005-S6.7, 005-S6.12, 005-S6.13 | P4 | Draft details: steps to do, rule placeholders, delete errors | Q41 |
| 20 | 003-S7.1, 004-S7.2 | P4 | Edit flow: checks when it opens; failure hint "Try again, or save without testing." | 004-S7.2 is copy:rules. Q41 |
| 21 | 006-S3.2, 006-S3.3 | P4 | Details: description meta below and at lg | The design draws no meta (U63 #26). Q41 |
| 22 | US5-AS1, 007-R.1, 007-S1.1–S1.10, 007-S1.12 | P5 | Consent page | W item. Q43 |
| 23 | US5-AS2, 007-R.2, 007-S2.2–S2.15 | P5 | Account page | W item. Q43 |
| 24 | US5-AS3, 007-R.3, 007-S3.1–S3.26 | P5 | Approval page | W item. 007-S3.25 is also cited by Conflict 13. Q43 |
| 25 | FR-002c, FR-005, FR-012b, EC-2, 001-S7.10, 005-ACC.4 | – | All screens | General rules for undrawn states, tab titles, contrast, footer wrap. Q44 |

## Figma-only — behavioural
| # | item | where (units, node-ids) | suggested requirement |
|---|---|---|---|
| 1 | Delete from overview rows, row and select-all checkboxes, a selection bar with "N selected" / "Cancel" / "Delete", and a bulk delete dialog listing connections with status badges | U04 #4, #14, #19; U06 #66; U11 #9, #19; U12 #8, #10, #20; U13 #9, #18; U14 #8, #15; U15 #8, #20, #21, #27 (6699:45206), #29; U16 #23, #30; U17 #29; U18 #39, #45; U90 #27, #33 | "Each overview row offers Delete. It asks the same confirmation as the details (001-S6.11) or draft details (005-S6.10), with per-row accessible names (005-S3.5). Selecting rows offers one Delete for all of them." If bulk delete needs a new endpoint, CLAR 2026-11-06 #1 defers it. |
| 2 | "Start from an example": a dialog creates the draft "Passenger transport licence (example)", with example banners per step and a publish-dialog line "This is still the example…" | U06 #25 (6791:46863), #91; U11 #26, #28; U18 #8, #10–#12, #16, #23, #32; U73 #25 | "The empty overview offers 'Start from an example', which creates a stored draft with 2 documents, 2 rules and a variant through the drafts API and opens step 1." Marking a draft as an example may need a stored attribute (CLAR #1). |
| 3 | Field groups (Name, Birth, Address, Document, Other details) with tri-state group checkboxes | U28 #17; U98 #25; also U04 #44, #46, U21 #14, U22 #16, U24 #14, U25 #13, U26 #14, U27 #17 | "Fields of a document are grouped; a group checkbox selects or deselects its fields and opens 002-S1.1's dialog for rule-checked ones." The grouping isn't in the catalog: either a frontend mapping, or deferred under CLAR #1. |
| 4 | "Discard changes" in every edit-flow footer, the dialog "Discard your changes?" ("Keep editing" / "Discard changes": "…goes back to the version that's active now. Citizens aren't affected."), and other items marked "Later" ("Send to your developer") | U98 #17; U100 #15, #20 (7173:52772), #21, #23, #24; U06 #27 | "The edit flow of a published connection offers 'Discard changes', which, after a confirmation, leaves the flow without saving." (Server-side draft changes are deferred, see F5.) |

## Partial matches
| # | req | where | difference |
|---|---|---|---|
| 1 | 001-S0.5, 007-S2.1, 005-S7.1 | Every signed-in frame (#3/#5; e.g. U11 #3, U13 #22, #23, U44 #5, U94 #5); U10 #18 | The user's name isn't visible: the pill shows an icon only. "Your account" is missing from the menu, which also shows an email (the API may not have one). |
| 2 | 005-S3.6, 005-S3.7, 006-S2.3, 005-S6.10, 001-S6.11 | U11 #5, U12 #5, #12, U13 #5, #11, U14 #4, #18, #19, #23, U15 #5, U16 #5, #25, U17 #26, U18 #36, U90 #24 | One fixed sentence replaces the two conditional hints. A row without a description isn't shorter. One delete dialog serves drafts and deactivated connections ("Delete connection" / "Keep connection"). |
| 3 | 005-S4.2, 005-S4.3, 005-S4.6 | U16 #7, #11, #18; U07 #13, #14 | A single local draft collapses into the heading with one line and no list. A never-saved item shows "Resume editing" while its frame name says "Discard / Continue". |
| 4 | 002-S2.8, 002-ACC.2, 002-ACC.4 | U34 #14, #23; chevron pills in U30 #39, U38 #15, U39 #18, U40 #19, U41 #16, U42 #22, U44 #27, U45 #15, U50 #17, U51 #13, U52 #12, U55 #16, U59 #19, U60 #16, U62 #12, U100 #11; read-only U83 #31 | The connector is a pill opening a two-option menu with descriptions, not a button that switches the level. |
| 5 | 002-S2.9, 002-S2.10 | U40 #13; U64 #22 | In select mode, only top-level rules have checkboxes, so groups can't be selected. |
| 6 | 002-S4.19, 002-ACC.1, 002-S2.5 | U43 #27; U47 #15, #32; U58 #26 | Removed items hide their message line. A changed rule inside a removed group has no visible "Changed here" text. |
| 7 | 003-S4.2, 003-S4.3, 003-S2.11, 004-S8.2.2 | U06 #7, #9; U07 #19; U50 #8, #22 | A red error tab icon and tooltip are shown for spec 002 problems, and a grey ⓘ for "no findings". The Test tabs get every finding kind. |
| 8 | 003-S2.15, 003-S2.16, 003-ACC.3 | U44 #17; U45 #28, #30; U46 #11 | The names in banner lines are plain text, not links, and each expanded line has its own kind icon. |
| 9 | 002-S3.2, 002-S3.8, 002-S3.10, 002-S3.19, 002-S3.22, 002-S3.33, 002-S3.37, 002-S3.38 | U30 #42, #46; U31 #20; U32 #19, #39, #40; U33 #15; U35 #32; U48 #15, #24; U49 #9; U51 #31; U53 #30, #31, #35 | Rule-editor states aren't drawn or differ: pickers are drawn enabled before their turn, inline flags are missing, notes are absent in 1.11, the part picker is missing in some frames, there is no message placeholder (or a message is shown while incomplete), class options show codes only, and the values picker has a "Done" button. |
| 10 | 002-S4.1, 002-S4.29, 002-S4.4, 002-S4.5, 002-S4.12, 002-S4.13, 002-S4.14 | U05 #3; U59 #10; U41 #24, #27; U42 #18 | A variant isn't linked when Standard has no rules. The tab ⋯ shows on the active tab only. Copy to variant is a non-modal popover with help text instead of "included, not choosable", and the copy lands unlinked. |
| 11 | 002-S5.1, 003-S5.1, 002-S5.2, 002-S5.3, FR-008 | U73 #21, #23; U75 #5, #6; U77 #5, #6, #11; U78 #3–#6; U79 #3–#5 | The publish dialog summarises as counts ("7 data items", "Standard · 2 rules"). The warning line comes first, not in tab order. There is an interim "Published" state and "Opening your connection page…". The failure shows no error ID and drops the summary. |
| 12 | 004-S8.4.2, 004-S8.4.3, 004-S8.4.6, 004-S8.4.11 | U65 #15, #18, #20; U66 #14, #24; U67 #14, #16; U68 #14, #18, #20; U69 #15, #18, #23; U70 #14, #17; U71 #17, #19, #20; U72 #15, #18, #22–#24; U63 #10, #12; U73 #12; U75 #22; U76 #14, #16; U77 #22; U78 #19; U79 #24, #26; U99 #43; U01 #15 | The data card has no "Personal ID" / "Driving licence" headings: the document is a column instead. It shows "Date of birth" without "(Age)" and merges code with class date. Each card scrolls on its own, and build note 4 says only the page scrolls. |
| 13 | 004-S8.6.2–S8.6.4, 004-S8.6.6, 004-ACC.1 | U65 #23, #24; U66 #21, #22; U67 #22, #23; U68 #23, #24, #33; U69 #26, #27; U71 #23, #24; U72 #28, #29; U73 #15; U63 #13–#15; U75 #24–#26; U76 #19–#21; U77 #25, #26; U78 #22–#24; U79 #30–#32; U99 #46, #47 | Results show no statement and no "Not met" / "Couldn't be checked" text: status is shown by icon, tint and bold only. The older publish frames add "19, needs 21", a "Mia sees" box, and a heading without the count. |
| 14 | 004-S8.5.3–S8.5.6 | U66 #30, #31; U67 #32–#34 | Licence classes are a plain text input, not a pick list. Nationality and Expiry date have no field. The class date is labelled "Class B since". |
| 15 | 004-S8.8.4, 004-S8.1.2, 004-S8.3.4, 004-S8.3.5, 004-S8.7.1, 004-S8.2.3 | U74 #16, #21; U63 #9; U75 #21; U76 #13; U78 #18; U79 #23; U06 #37, #80; U05 #15 | The regenerating chip keeps its name with a ring, and no test-day line shows during one persona's regeneration. "Generate again" and "Generate all again" are missing from the publish frames. Generating asks first even without changes. The Test tab's hover tooltip is removed. |
| 16 | 001-S6.9, 001-S6.10, 001-S6.11, 002-S4.5, US4-AS3 | U04 #17, #18; U14 #18, #20 (6699:44480), #23; U15 #28, #30 (6699:45320); U89 #7, #30; U90 #2 (6417:31599); U06 #17; U60 #34 | Confirmations don't say what happens to URLs and requests: no "permanently", nothing on requests in progress, and the reactivate body doesn't say the URLs work again. The delete-variant body names the broken result link. |
| 17 | 001-S5.9, US4-AS5, 002-S7.4 | U05 #27; U15 #24; U87 #24; U98 #15 | The edit note reads "Your changes take effect when you save them." (or sits in the entry dialog). It doesn't say that requests in progress keep their configuration. |
| 18 | 001-S6.1, 001-S6.3, 001-S6.4, 001-S6.5, 002-S6.4, 002-S6.10, 002-S6.11, FR-012a | U58 #30, #37, #39, #42; U63 #26, #27, #31, #34, #38; details U80–U99 (#2, #6, #12–#22); U89 #13, #19; U96 #16; U82 #18; U83 #21; U84 #25; U91 #10, #21; U92 #11; U94 #9, #16; U96 #11, #22; U97 #11 | On the details page, the status sentence ("Your connection is active") is the main heading, with the name in the crumb. There is no action to a new connection. The ⓘ sits on "Result link" and the reference hint isn't visible. Branch ⓘ are missing. Copy buttons are disabled while deactivated. Links are collapsible. Variants are tabs. The summary holds the documents and counts "2 documents · 9 data items · …". |
| 19 | 005-S6.1, 005-S6.4, 005-S6.8, 005-S6.9, 005-S6.14, US4-AS4 | U93 #3, #6, #7, #9, #17, #20, #21; U07 #23–#25, #27; U02 #16 | On draft details, a status band "This connection is a draft" replaces the draft card and the info alert. "Edit connection" and "Go to connections" replace "Continue" and "Create new connection". The summary is open, and "Delete draft" isn't visible. |
| 20 | 005-S5.5, 005-ACC.2 | U06 #57 | Dialogs add × and scrim-click closing. Escape means "no change", whereas the restore dialog's Escape opens the draft's details. |
| 21 | EC-6, FR-010a, 001-S7.11 | U02 #14 | The design defines reflow only down to about 1024 px, with nothing for 320 px or 200 % zoom. |

## Figma-only — cosmetic (FYI)
Copy to port follows `RULE wording`: the governance says "Figma decides wording", so no question is needed. Layout and styling follow the design under the spec's governance table. ui-detail items follow `RULE ui-detail`; they are F items and are decided together in Q45.

| # | item | where | rule / note |
|---|---|---|---|
| 1 | "Create connection" (footer bar, arrow) for "Create form connection" | U11 #20, #25; U12 #22; U13 #19; U14 #16; U15 #22; U16 #31; U17 #40; U18 #7, #46; U90 #34 | RULE wording: copy to port |
| 2 | Draft rows: "Edit" for "Continue" (opens the stored step, U06 #64) and "Edited <date>" for "Saved <date>" | U04 #8; U06 #64, #89; U11 #18; U12 #16, #19; U13 #14, #17; U14 #11, #26; U15 #16, #19; U16 #27, #29; U17 #34, #36; U18 #43, #44; U90 #31, #32 | RULE wording |
| 3 | Dates as dd.mm.yyyy and "dd.mm.yyyy, hh:mm" wherever the frontend formats them (build note 8) | U02 #8; U06 #21; U11 #16; U13 #25; U14 #22; U16 #19; U87 #17; U93 #7 | RULE wording. The test-day line is rules copy: Q6 |
| 4 | Local drafts offer texts ("Unsaved changes in "<name>"", "Unsaved changes in 2 connections", body, "Resume editing", "Discard changes", "Edited · …", "New, never saved · …") | U16 #7, #8, #10–#12, #15, #16; U07 #13, #14 | RULE wording. Structure: Partial 3 |
| 5 | "Draft saved. You can pick it up any time." as a toast, for "Draft <name> saved." | U06 #56; U17 #4, #39 | RULE wording. It stays polite and announced (001-S7.7) |
| 6 | Forward labels "Choose documents →" and "Set rules →" | U04 #26; U05 #32; U06 #68; U18 #21; U19 #15; U21 #20; U22 #21; U23 #19; U24 #19; U25 #16; U26 #20; U27 #23; U28 #24; U98 #16, #28 | RULE wording |
| 7 | Rules-step menu and toast wording: "Add message", "Delete sub-group", "Restore rule/group/sub-group", "Remove from <variant>", "Reset to Standard" (= Undo), "Delete variant", "Discard changes", "Rule 03 deleted.", "Rule 02 and Rule 03 are now in Group 01.", "Ungrouped. Rules 03 to 05 use their own messages again.", "Rule 01 saved.", "Grouped in Ambulance only. Standard stays the same." | U30 #37; U32 #30; U35 #22, #41; U36 #27; U40 #31; U50 #30; U54 #7, #8, #13; U55 #28; U56 #23, #28; U57 #18, #22; U58 #19, #21, #22; U59 #11 | RULE wording |
| 8 | Marks "Added here" / "Removed here" | U37 #30; U38 #23, #25; U39 #24, #26; U40 #23; U41 #19; U42 #17; U43 #27; U44 #37; U46 #35; U47 #15, #29, #33, #34; U56 #36; U57 #17, #21; U58 #17, #26; U59 #20; U60 #18; U61 #21; U62 #18; U84 #30 | RULE wording. Text plus colour (002-ACC.1) |
| 9 | Variant dialog: "*", "Description (optional)", helper "Shows when you hover the ⓘ next to the variant name.", "Linked to Standard (recommended)" / "Start empty" with hints | U37 #22, #23; U52 #23, #25, #27; U62 #24, #25 | RULE wording |
| 10 | Step 1: "Connection name", "Description (optional)" (the marker stays part of the label, 006-S4.3) | U18 #19; U98 #12, #14 | RULE wording |
| 11 | Rule editor texts: "Not for rules", menu sections, date hint, counting and missing notes, "Search options", "Choose at least one option.", "Need other data? Add it in Documents", nationality hint, placeholder | U29 #21, #24, #27; U30 #16–#19, #45; U31 #23, #24, #27, #40, #41; U32 #20, #24, #25; U48 #14, #16, #23; U50 #25; U53 #14, #16, #22, #23, #29 | RULE wording. "citizen" is Q2, "Konnekt" Q1, from-now Q25 |
| 12 | Document removal dialog body and "Keep document" / "Remove document" | U23 #21, #22; U26 #24 | RULE wording |
| 13 | Delete-Standard-rule dialog body (still names the changed variants) | U34 #29; U47 #26 | RULE wording |
| 14 | Test step title "Test rules with sample citizen data", intro, "Generate all" | U63–U79 (#7, #8, #12, #13); U99 #39 | RULE wording. "citizen" is Q2 |
| 15 | Publish texts: "Publish connection", "Save changes?", "Publishing… This takes a few seconds.", "Opening your connection page…", the merged "Couldn't publish" sentence | U05 #34; U63 #25; U73 #21, #27; U75 #9; U78 #2, #5; U79 #3; U98 #37 | RULE wording |
| 16 | Details texts: "Edit connection", "Go to connections", "Activate again", "Request link" / "Result link", "Links for your service", status sentences | U07 #8; U58 #42; U63 #38; U80–U99 | RULE wording |
| 17 | Draft and status marks as Status/Connection pills with a dot (the text stays, so 005-ACC.1 holds) | U07 #1; #3 of the wizard units; overview badges | layout and styling per design |
| 18 | "Save and exit" tertiary at the footer's left beside Back; "Test rules" outlined in the edit flow | U06 #69; U18 #21, #30; U19 #14; U20 #13; U23 #19; U25 #16; U26 #20; U28 #23; U33 #24; U36 #17; U38 #27; U42 #29; U43 #18; U52 #18; U70 #24; U76 #23; U100 #16 | layout per design |
| 19 | Sticky header and footer; pinned step head, tabs and selection bar | U01 #14, #17–#19; U38 #26; U64 #13 | layout per design (002-S0.2, 002-S0.3 hold) |
| 20 | Inner scroll regions and a documents layout that fills the viewport at ≥ 800 px | U01 #16; U04 #15; U12 #21; U21 #16, #26; U23 #17; U24 #16; U25 #14; U26 #17; U27 #19; U28 #27 | layout per design. FR-010a must hold |
| 21 | Menus in the top layer, side, max height and inner scroll | U01 #9–#13; U06 #92 | layout. placementFrom stays (FR-009d) |
| 22 | Footer 72 px with 40 px buttons, check and radio anatomy, dialog widths, × close, skeleton loading, toast types and position | U01 #5, #6, #8, #20; U05 #19; U06 #22, #95, #96; U24 #23; U68 #28 | styling per design / kit |
| 23 | Statement chips and symbol chips; the same purple for "Changed here" and "New addition" | U06 #12; rules and details units | styling. Symbols stay hidden from AT (002-S2.6), and the text tells marks apart |
| 24 | Illustrations, hero and tagline, status pictures, highlighted links card, numbered markers, glyphs, scrollbars, backgrounds, heading colours, muted (i), stable button width, Fira Sans preload, decorative alt="" | U02 #12; U03 #28, #39; U05 #10, #11, #16, #25; U06 #20, #99, #100; U10 #3, #10; U11 #24, #27; U15 #33; U18 #6, #9; U42 #32; U55 #19; U81 #19; U84 #19, #38; U99 #9, #10; U80–U97 | cosmetic |
| 25 | Sample data, not ported: name-like variant URL slugs (the build keeps identifiers, 002-S6.8), row order, stale layer names, a 31-item licence, "Height (cm)" | U63 #33; U81 #17; U84 #17; U89 #18; U91 #15; U96 #17; U11 #21; U13 #24; U16 #32, #33; U17 #38; U04 #47; U53 #27 | OUT-8 |
| 26 | Process notes: provenance, "Old ·" layers, open-question markers, construction layers | U01 #1; U02 #22; U05 #13, #18; U07 #21; U08 #1; U09 #1, #4; U23 #23 | cosmetic |
| 27 | Overview search or filter with ×, "n of m connections", no-results message, "Clear search" (it needs a visible label, 001-S7.4) | U04 #3; U11 #7, #29–#33; U12 #7; U13 #7; U14 #6; U15 #7 (6699:47855); U16 #21; U17 #28; U18 #38; U90 #26 | RULE ui-detail (Q45) |
| 28 | Connection count in the overview toolbar | U04 #2; U11 #6; U12 #6; U13 #6; U14 #5; U15 #6; U16 #20; U17 #27 (6699:47951); U18 #37; U90 #25 | RULE ui-detail (Q45) |
| 29 | Show/hide password toggle | U10 #7 | RULE ui-detail (Q45) |
| 30 | "You're logged out." message after signing out | U05 #21; U06 #54; U10 #20 | RULE ui-detail (Q45) |
| 31 | Breadcrumb link "Your connections" | U28 #2; U30 #2; U79 #11; U81 #2; U82 #2; U84 #2; U91 #2; U93 #2; U98 #2; U99 #2; #2 of the wizard units | RULE ui-detail (Q45). Leaving a flow through it is Q8 |
| 32 | Group subtitle "At least one rule must be met" / "All rules must be met", and the note "Group 01 now needs only one rule to be true." | U34 #16, #24; U35 #16; U36 #24; U37 #15; U38 #18; U39 #20; U40 #20; U41 #17; U42 #25; U43 #19; U44 #31; U45 #17; U46 #25; U47 #22; U51 #16; U52 #16; U55 #18; U56 #19; U57 #14; U58 #14; U60 #21; U62 #13; U64 #28 | RULE ui-detail (Q45) |
| 33 | Toast actions: "Show" in the copy toast; after deleting a variant, a toast with Undo and the tab to the left opens | U41 #29; U61 #8, #9 | RULE ui-detail (Q45) |
| 34 | Hints: "Licence classes has parts. Choose the part to check.", "Place of birth has parts. Choose the part to check.", "Applicants who turn 21 that day count.", born-between hint | U09 #26, #38, #40; U31 #37; U53 #32 | RULE ui-detail (Q45) |
| 35 | Explanatory ⓘ tooltips on the trigger-URL label and the name field; hover tooltip with the full description on a cut overview row | U04 #12; U13 #20; U80 #10; U81 #12; U82 #11; U84 #12; U85 #12; U86 #34; U98 #13 | RULE ui-detail (Q45). They open on hover and keyboard focus, with no title attribute (006-S4.1) |
| 36 | "Discard rule" in the rule editor | U06 #75; U29 #16; U30 #21; U31 #28; U33 #16; U35 #37; U48 #18; U49 #11; U50 #28; U53 #18 | RULE ui-detail (Q45) |
| 37 | Per-document "6 of 25 data items chosen" / "No data items chosen yet" | U04 #31; U21 #12; U22 #14; U23 #14; U24 #12; U25 #11; U26 #12; U27 #15; U28 #15; U98 #23 | RULE ui-detail (Q45) |
| 38 | Removed count in the link strip, "2 of 3 Standard rules are removed here." | U43 #25; U47 #12; U58 #25 | RULE ui-detail (Q45) |
| 39 | Connectors faded next to removed items or a single active item | U47 #16; U58 #27 | RULE ui-detail (Q45) |
| 40 | Documents and rules summary in the reactivate dialog | U89 #31 | RULE ui-detail (Q45) |
| 41 | The publish dialog can't be closed while publishing | U78 #3 | RULE ui-detail (Q45) |
| 42 | Toasts after deleting, deactivating, reactivating, publishing and saving ("Changes saved.") | U04 #20; U05 #20, #35; U99 #19 | RULE ui-detail (Q45), announced through the toast's live region (001-S7.7) |

## Figma must change (decided)
Build these as the spec says, keeping Figma's layout and styling, until the design is updated.

| # | req | Figma (unit, node-ids) | Figma shows | build instead | decision |
|---|---|---|---|---|---|
| F1 | 002-S5.7, 002-S5.8, 002-S6.7 | U02 #9, #10, #17; U05 #34, #38; U06 #19, #49, #65; U07 #2; U13 #12; U14 #13, #21; U58 #33; U63 #21 (7112:48859); U73 #24; U75 #7, #11–#13 (6376:25536); U76 #27, #29–#31, #33, #34 (6635:36265); U77 #7; U86 #4, #10, #11 (7355:61329); U87 #19–#22 (6396:48860); U88 #10; U89 #32 (7173:52959); U94 #3, #6, #7; U95 #4, #7–#9; U98 #38, #40 (6730:39464); U99 #36, #37 | Go-live scheduling: "Active from: Now / On a date", a date field, "Enter a date after today.", "Schedule", the "Scheduled" status, rows and screens, "Active from <date>", "Change start date" (⋯ item, dialog, "Save date"), "from the time you choose" | Publishing goes live at once. The publish and save dialogs have no "Active from" choice and no date, and the save body leaves out "from the time you choose". There is no Scheduled status or screen, and the connection ⋯ menu holds only Deactivate / Reactivate and Delete. | CLAR 2026-11-06 #1 |
| F2 | 002-S6.9 | U06 #60; U07 #26; U58 #41; U63 #37; U80 #20, #21; U81 #22 (6809:46582); U82 #23; U83 #33, #34; U84 #35; U85 #24; U86 #22–#26; U87 #14; U88 #21, #22; U89 #24, #25; U90 #20 (6417:31520); U91 #26; U92 #14, #15; U93 #18, #19; U94 #20; U95 #17–#19 (7246:54525); U96 #28; U97 #14, #15; U99 #17, #18 | Activity card, "Last edited by", the event log, "View activity" / "Hide activity", "Deactivated by …" | Details without an Activity card and without editor or timestamp lines | CLAR 2026-11-06 #1 |
| F3 | 002-S1.8 | U04 #39 (6711:39375); U20 #18, #19; U21 #25; U22 #24 | "Coming soon" / "Upcoming" documents | Only the catalog's documents are offered. The all-added state doesn't point to upcoming documents. | CLAR 2026-11-06 #1 |
| F4 | 001-S6.11, 001-S6.12 | U04 #21; U05 #24 (delete part); U90 #22 | A toast with "Undo" after deleting a connection | Deletion stays permanent: confirmation, then the overview, with no Undo | CLAR 2026-11-06 #1 |
| F5 | 005-S0.7, 004-S0.4 | U03 #36; U05 #31, #33, #36; U06 #50; U60 #33, #35; U98 #5; U99 #22, #23; U100 #3, #24 | A live connection's pending changes are kept as a draft: "Keep draft and exit", the "Draft changes" badge, "Changes not published", E5a | The published edit flow has no "Save and exit" or "Keep draft and exit" and no draft badge. Changes exist until saved through the save dialog. | CLAR 2026-11-06 #1 |
| F6 | 001-S7.9 | Header of every frame U10–U100 (e.g. U15 6699:45201, U19 6699:45323, U98 6731:39823); U03 #31 | DE/EN language switch (it needs translated server, rules and findings copy) | No switch: one English UI with lang="en" | CLAR 2026-11-06 #1 |
| F7 | 002-S2.12, 002-S2.13, 002-S2.15 | U34 #27; U36 #29 (6344:53657); U54 #6, #14 (6522:33107); U55 #25, #26 (6522:32071); U56 #27 (6522:32540) | "Remove from group", "Remove from sub-group", moving a sub-group out (a new edit action in rules/src/edits.ts) | Group menus offer "Ungroup" and "Delete group" only | CLAR 2026-11-06 #1 |
| F8 | 002-S2.16 | U54 #15; U55 #29 (6522:32424); U56 #24; U57 #22 | "Duplicate group" / "Duplicate sub-group" | Duplicate stays a rule action | CLAR 2026-11-06 #1 |
| F9 | 002-S3.1, 002-S2.9, 002-S2.15, 002-S2.13 | U34 #19; U35 #20; U36 #26; U38 #21; U40 #24; U41 #20; U42 #26; U43 #22; U44 #29; U45 #20; U47 #24; U51 #19, #25; U52 #17; U54 #9; U55 #21; U56 #21; U57 #16; U58 #18; U59 #22; U60 #24; U62 #14 | "+ Add rule" inside a group or sub-group; adding into an empty group | One "+ Add rule" per variant, which adds at the end of the top level. Groups form only by selecting items. | CLAR 2026-11-06 #1 |
| F10 | 002-S4.14, 002-S4.31, 002-S4.4 | U03 #23 (6648:42016); U05 #4, #5 (6711:39381); U06 #16 (6791:46863); U08 #5 (7370:55195) | "Unlink from Standard", its result and the toast "Unlinked from Standard." | The variant tab menu offers Rename, Delete and Copy link, and based variants stay based | CLAR 2026-11-06 #1 |
| F11 | 004-S8.6.4 | U06 #40 | Persona generation that makes every rule testable (rules package) | Generation as today; "Couldn't be checked" stays | CLAR 2026-11-06 #1 |
| F12 | – (OUT-2) | U06 #27; U07 #29; U08 #6; U93 #22 | View-only users, roles, a view-only draft page | Every team member has the same rights | CLAR 2026-11-06 #1 |
| F13 | 001-S6.9, US4-AS3 | U88 #28 (6417:31206) | "The connection will be deactivated and its links will stop working. Requests already started still finish. Remember to remove the wallet connection from your service." | "The connection will be deactivated and its links will stop working at once. Requests in progress are cancelled. Remember to remove the wallet connection from your service." (Finishing started requests would need a backend change.) | CLAR 2026-11-06 #1 |

## Build without frames (decided)
| # | req | expected surface | build from (nearest frame or KERN pattern) | decision |
|---|---|---|---|---|
| W1 | FR-013b, EC-8 | All screens | The design's colour tokens. A pair failing AA gets the nearest passing value, which is recorded in the design notes with the pair, and the designer is told. | CLAR 2026-11-06 #2 |

## Copy from outside the frontend (decided)
None decided yet. Q1–Q6 are open.

## Clarify questions
**Q1. C — Product name.** Figma names the product "Konnekt"; today it is "Connection Portal" (EC-4, 001-S0.6, US5-AS4).
- **Impact:**
  - Header product name in every frame U10–U100 (e.g. U11 6699:44242, U12 6699:45198, U17 6699:47945, U80 6701:40160, U99 6730:39734; sign-in U03 6703:39311).
  - h1 "Welcome to Konnekt" (U11 6699:44486, U18 6793:47682).
  - Rules intro "… Konnekt checks each rule and tells your service whether it's met." in every rules frame (e.g. U29 6702:39345, U41 6702:40918, U98 6730:39128, U99 6890:46203).
  - Rules empty state "Without rules, Konnekt …" (U29 6504:43841, U51 6197:11654).
  - Missing-value notes "… Konnekt reports it as "couldn't be checked"." (U30 6348:40756, U32 6350:42726, U53 6324:15673).
  - Edit-flow notes (U05 6730:40340); tab titles (FR-012b).
  - Undrawn consent text 007-S1.2 and account empty state 007-S2.5.
  - Outside the frontend: MCP guidance (mcp/plugin/skills), any backend or MCP text naming the product, README and docs.
- **adopt:** "Konnekt" in all of these. 007-S1.2 reads "{client_name} wants to act on your behalf in Konnekt. Choose what it may do." 007-S2.5 reads "No agent is connected yet. Add Konnekt's MCP server to your agent to connect it." The guidance, backend texts and docs are renamed in the same change.
- **drop:** "Connection Portal" everywhere. The design's sentences are ported with it: "Welcome to the Connection Portal", "… The Connection Portal checks each rule and tells your service whether it's met.", "Without rules, the Connection Portal …", "… the Connection Portal reports it as "couldn't be checked"."
- **Supersedes:** no Clarification.

**Q2. C — "citizen" for "applicant".**
- **Impact:**
  - Step 1 and documents: U18 6793:47711, U20 7290:60373, U26 6701:39917; removal dialog U26 6324:40396.
  - Rules step: title "Set eligibility rules for citizens" and its intro in every rules frame. "Message for citizens:" on every rule row (rules, details, draft details, e.g. U94 7246:52838) and in the editor placeholder (U30, U31, U32). Counting notes "the citizen shares their data" (U30, U32, U50, U53). Nationality hint (U53 #29). Group-message hints (U35 #27, #35).
  - Findings (rules package): "no citizen can meet", "Every citizen meets" (U44 6750:40882, U45 6753:40514, U46 6753:41324, U71 7058:61632, U63 7112:48859, U77 6760:47979).
  - Test step (rules package): title and intro (U63–U79, U99, e.g. U66 7057:59541); "The other two citizens stay as they are." (U68 7058:61334); "Creating 3 sample citizens…" and "Couldn't create sample citizens" (U74 #12, #23); "every citizen meets it" (U70 #23).
  - Delete dialogs and warnings: U14 6699:44480, U15 6699:45320, U90 6417:31599. Status sub-line: U87 #5.
  - Undrawn: approval page "Rule checks" (007-S3.8).
  - Sources: the frontend, rules/src/checks/findingMessages.ts, the rules package's test texts, MCP guidance that repeats findings.
- **adopt:** "citizen" in every place above, e.g. "No citizen can meet the rules of <variant>.", "Every citizen meets this rule.", "Creating 3 sample citizens…", "Couldn't create sample citizens", "<variant> has no rules yet, so every citizen meets it. …".
- **drop:** "applicant" everywhere. The design's sentences are ported with it: "Set eligibility rules for applicants", "Message for applicants:", "Test rules with sample applicant data", "Applicants won't be able to use it, and its links stop working.", "Applicants won't share their date of birth any more …".
- **Supersedes:** no Clarification.

**Q3. C — Rule statements (copy:rules, 002-S2.27, 002-S3.9).** Figma separates document and field with "·" plus a document icon ("Personal ID · Date of birth (Age) is at least 21 years old"; parts keep "–": "Driving licence · Licence class B – Issue date …"). It also says "must be met" where the current text says "must be true" (U03 #18), and proposes messages from its COPY-BRIEF (U09 #3).
- **Impact:**
  - Rule rows in every rules frame (e.g. U30 #31, U41 #11, U55 #11).
  - Editor proposals.
  - Publish summary.
  - Details and draft-details summaries: U82 #20, U83 #25, #26, U84 #27, #29, U85 #22, U91 #22, U93 #14, U94 #17, #19, U96 #23.
  - Test-step statements.
  - Approval summary (007-S3.7).
  - MCP outputs that quote statements.
- **adopt:** The rules package writes "<document> · <field>[ – <part>] <condition>", "must be met", and the COPY-BRIEF messages, everywhere.
- **drop:** "Personal ID – Date of birth (Age) is at least 21 years old", "must be true" and today's proposals stay. Chips and icons apply as styling only.
- **Supersedes:** no Clarification.

**Q4. C — Findings texts (copy:findings).**
- **Impact:**
  - Rules banner: U44 6750:40882, U45 6753:40144, U46 6753:41324, 6758:43067.
  - Notes: U44 #33, U45 #32, #35, U46 #32.
  - Tab tooltips: U46 6758:43524, U71 7058:61632.
  - Publish-dialog lines: U63 7112:48859, U77 6760:47979.
  - Test-step tab tooltip (004-S8.2.3).
  - Approval "Rule checks" (007-S3.8).
  - MCP guidance.
- **adopt:** The drawn texts become the findings texts:
  - "Rule 01 and Rule 02 contradict each other, so no citizen can meet the rules of Standard." (one sentence; "so right now …" for today-only findings)
  - "Rule 04 and Rule 05 in this group contradict each other."
  - "Sub-group 01: Rule 04 and Rule 05 contradict each other."
  - Counts row "2 rules contradict each other, and 1 rule is a duplicate"
  - Publish lines "Ambulance: no citizen can meet these rules. 2 rules contradict each other, and 1 rule is a duplicate." and "Standard: 1 rule is a duplicate."
  - Tooltip "Rule 01 and Rule 02 contradict each other, so no citizen can meet these rules."
  - Undrawn texts (003-CP.3, CP.5–CP.7, CP.9, CP.10, CP.12–CP.18) keep their sentences with "can't be met together" → "contradict each other" and counts joined by ", and ".
- **drop:** The current findingMessages texts stay. The noun follows Q2.
- **Supersedes:** no Clarification.

**Q5. C — Server messages (copy:server).**
- **Sign-in:** Figma has "Username or password is wrong." / "Check both and try again." (U10 6401:28435); the server says "Invalid username or password".
- **Duplicate rule name:** "There's already a rule called "Rule 02"." (U49 6196:10710); the server says "Another rule in Ambulance is already called Rule 01.".
- **Duplicate variant name:** "There's already a variant called "Ambulance"." (U60 6523:37808); the server says "Another variant is already called Ambulance.".
- **Unrequested data:** "Rule 02 checks data that's no longer requested. Add it again in Documents, or edit or delete the rule." and "Rule 03 checks data from Driving licence, which is no longer requested. Add the document again in Documents, or edit or delete the rule." (U50 6863:47363, 7173:52333, tooltip 7375:101551); the server says "Rule 02 in Standard checks data that's no longer requested. …".
- **Sources:** backend auth and rules services, rules/src/validation.ts (word for word), MCP (agents read these).
- **adopt:** The design's wording, keeping the variant where the baseline names one (002-S2.18, 002-S2.19):
  - "Username or password is wrong. Check both and try again."
  - "There's already a rule called "Rule 01" in Ambulance."
  - "There's already a variant called "Ambulance"."
  - "Rule 02 in Standard checks data that's no longer requested. Add it again in Documents, or edit or delete the rule." and "Rule 03 in Standard checks data from Driving licence, which is no longer requested. Add the document again in Documents, or edit or delete the rule."
- **adopt as drawn:** As above, but without the variant names. This supersedes 002-S2.18 and 002-S2.19's naming of the variant.
- **drop:** The server's texts stay.
- **Either way:**
  - The number check stays whole numbers ≥ 1 (002-S3.16), so U49's "Enter a number greater than 0." reads "Enter a whole number greater than 0.".
  - The "Add it in Documents" action stays (002-S2.25); the design shows it as plain text.
- **Supersedes:** no Clarification.

**Q6. C — Test-step texts from the rules package.**
- **Differences:**
  - Date of birth: "08.07.2007 · 19" (U63, U75–U79) or no age (U65–U72), where the baseline has "08.07.2007 (age 19)".
  - Expiry: "Valid until 19.08.2040", where the baseline has a bare date.
  - Classes: "B since 20.08.2025 · 1 year" in one row, where the baseline has a codes row "B, BE" plus one row per class date.
  - Result heading: "Result: doesn't meet the rules" without the count (U63, U75–U79), where the baseline has "Result: doesn't meet 2 rules".
  - Test-day line: "Tested as if shared today, 1 Nov 2026." in dd.mm.yyyy per build note 8.
- **Impact:** the data cards and headings in U63, U65–U79, U99; the edit form's "Age today".
- **adopt:** "08.07.2007 · 19", "Valid until <date>", "B since <date> · <n> year(s)", "Result: doesn't meet the rules", "Tested as if shared today, 01.11.2026."
- **drop:** "08.07.2007 (age 19)", a bare date, codes in one row with each class date in its own row, "Result: doesn't meet 2 rules", "1 Nov 2026".
- **Supersedes:** no Clarification.

**Q7. F — Compact step header (Conflict 5).**
- **Impact:**
  - Header of every wizard frame: U17 6701:39488, U18 7344:96393, U19–U79 #6, U62 7112:47827, U67 7058:60675, U98 #8, U99 #24, #38, U100 #6.
  - Build notes: U02 #1–#4, U03 #42, U05 #29, U06 #23, #67.
  - Details: U63 #27, U80 #27, U83 #37, U86 #32. Draft details: 005-S6.2, 005-S6.3.
- **adopt:** "Step n of 4" with four segments and "Next: <step>" / "Last step". It is a role="progressbar" with aria-valuenow (U02 #3). It isn't clickable when creating and is clickable when editing. Publish is a dialog, not a step. Details and draft details have no step line. Supersedes 004-S0.1 (labelled entries), 004-S0.2, 004-S0.3, 004-S7.3, 001-S6.2, 005-S6.2, 005-S6.3 and US2-AS1's five steps.
- **drop:** Five labelled entries (Connection, Documents, Rules, Test, Publish) whose finished steps lead back, in the Revamp's tokens. Details keep the all-done progress.
- **Supersedes:** no Clarification.

**Q8. F — Leaving the wizard and logging out (Conflicts 1, 2).**
- **(a) Product name or "Your connections" in a flow:**
  - adopt: runs Save and exit (stores or updates the stored draft, "Saving…" for at least 600 ms, a validation error keeps the member in the flow). Supersedes 001-S0.6's plain link and 005-S4.1 for this case.
  - drop: navigates; the local draft keeps the work and the overview offers it.
- **(b) Leave dialogs (U17 7173:52682) and the "Leave site?" warning:**
  - adopt: as drawn. Their text must not say the work is lost while a local draft keeps it.
  - drop: no dialog.
- **(c) Open rule editor on Save and exit:**
  - adopt the design's stored editor state. It needs storage outside the frontend, so CLAR 2026-11-06 #1 defers it.
  - drop: "Save changes to Rule 01?" first (005-S1.1).
- **(d) "Starts as a draft…" strip (U07 #18, U18 #20, U19 #13):** adopt only with (a)=adopt; otherwise drop.
- **(e) Log-out dialog:**
  - adopt "Save before you log out?" with "Save and log out" and "Log out anyway", plus a "Cancel" that returns the focus to the user menu. Supersedes 005-S7.2–S7.5.
  - drop: "Log out and discard unsaved work?" / "Logging out deletes the unsaved changes on this device to: <name>, … and 3 more." / "Saved drafts stay as they are." / "Log out" (danger) and "Cancel", in the design's dialog.
- **Supersedes or contradicts:** CLAR 2026-11-06 #1 for (c).

**Q9. F — First-time page and example (Conflict 3, Figma-only 2).**
- **Impact:** U11 6699:44481, 6699:44486; U18 6793:47682, #8–#32; U06 #25, #85, #86, #91; U73 #25.
- **(a) The "Welcome to Konnekt" page:**
  - adopt as the first page after a sign-in without connections, with its state in localStorage. Supersedes 001-S4.1, 001-S4.2 and 001-S4.8.
  - adopt as the empty overview only: sign-in still opens step 1; the product name shows it.
  - drop: the baseline's empty overview, in the design's style.
- **(b) "Start from an example":**
  - adopt: creates a stored draft through the drafts API and shows the example banners.
  - defer, because marking a draft as an example needs a stored attribute (CLAR 2026-11-06 #1).
  - drop.
- **Contradicts:** CLAR #1, if (b)=adopt needs a backend field.

**Q10. F — Sign-in error marking (Conflict 4, U10 6401:28435).**
- design error: both fields marked as invalid.
- design error: neither field marked.
- adopt Username only. This contradicts US1-AS1 and 001-S1.2.
- **Supersedes:** no Clarification.

**Q11. F — Overview row delete and bulk delete (Figma-only 1).**
- **Impact:** see the Figma-only table.
- **adopt row delete:** each row's Delete asks the details' confirmation (001-S6.11, or 005-S6.10 for drafts).
- **adopt bulk delete:** checkboxes and a selection bar "N selected · Cancel · Delete" with one confirmation listing the connections; one call per connection.
- **defer bulk delete:** if one call per connection isn't acceptable and an endpoint is needed (CLAR 2026-11-06 #1).
- **drop:** no row checkboxes and no row Delete. Delete stays on the details.

**Q12. F/W — Overview and local-drafts details (Partials 2, 3).**
- **(a) Hint:** adopt the design's one sentence for both states (supersedes 005-S3.6 and 005-S3.7), or keep the two conditional hints "Pick up your draft or connect another form." / "Open a connection to copy its links, or connect another form.".
- **(b) Row height without a description:** adopt equal heights (supersedes 006-S2.3), or a shorter row.
- **(c) Delete dialog:** adopt one dialog for draft and deactivated ("Delete connection" / "Keep connection") but with the draft's body "<name> will be deleted for good. It was never live, …". Or keep two dialogs: drafts "Delete this draft?" with "Delete draft" / "Cancel".
- **(d) A single local draft:** adopt the heading-only layout, keeping the h2 and a one-item list for screen readers. Or show the list.
- **(e) A never-saved item:** Its button reads "Resume editing", as drawn. The frame name "Discard / Continue" is a slip.
- **Supersedes:** no Clarification.

**Q13. F/W — Header and user menu (Partial 1).**
- **Impact:** every signed-in frame #3/#5; U13 #22, #23; U10 #18.
- **adopt:** an icon-only pill whose menu shows the name, then "Your account" above "Log out" (W: build, 007-S2.1). Supersedes 001-S0.5's visible name. The email shows only if the API provides it; otherwise CLAR 2026-11-06 #1 defers it.
- **drop:** the name is visible in the pill, the menu has "Your account" and "Log out", and there is no email.

**Q14. F — Documents step (Conflicts 6–10, Figma-only 3).**
- **(a) Master-detail, pager, "Added documents (n)" and the search card with suggestions:** adopt (supersedes 002-S1.8's "spec 001's step stays"), or drop (one card per added document, design styling).
- **(b) Inline trash, undo toast, and a confirmation for unchecked documents** ("Keep document" / "Remove document"): adopt (supersedes 002-S1.9), or drop. Removal still opens 002-S1.1's dialog when rules check the document.
- **(c) Nothing-chosen validation:**
  - adopt the inline line, "1 document needs data", the dialog "Choose data" / "Remove them and continue", and "Set rules →" disabled with "Add a document first". Supersedes 002-S1.9, 001-S5.5, 001-S5.6 and 001-S7.6's refusal on attempt.
  - drop: going on stays enabled and an attempt is refused with a message naming the problem, moving the focus.
- **(d) "Publish without rules" on Documents:** W: build (002-S1.5, 004-S1.1), or drop (supersedes them).
- **(e) Drag reordering:**
  - adopt with Move up / Move down in a menu as the keyboard way (U08 #3), the order kept in the reducer and sent on save.
  - defer, if the API must store the order (CLAR 2026-11-06 #1).
  - drop.
- **(f) Field groups with group checkboxes:**
  - adopt with a frontend mapping; the mixed state opens 002-S1.1's dialog for rule-checked fields.
  - defer, if the grouping must come from the catalog (CLAR #1).
  - drop.

**Q15. F — Description field (Conflict 11).**
- **Impact:** U04 #24; U18 #18, #19; U19 #11; U98 #13, #14; variant dialog U52 #26.
- **adopt textarea:** multi-line, not required, ≤ 500 characters, spell check on. The overview and meta stay one line, cut with "…". Supersedes 006-S1.1.
- **drop:** a single-line input, design styling.
- **ⓘ:**
  - adopt next to "Connection name" (its text isn't drawn).
  - keep "About the description" / "A note for your team, such as the form's ID in your form management system. Applicants never see it." on the description (006-S1.4, 006-S1.5).
- **Supersedes:** no Clarification.

**Q16. F — "Save and exit" with an empty name (Conflict 12, U04 #27).**
- **adopt:** it leaves without storing a draft, and the local draft keeps the work. Supersedes 005-S1.2.
- **drop:** the flow goes to step 1 with "Enter a name." under "Connection name", the field is focused and nothing is stored.

**Q17. F/W — Save feedback and errors (Conflict 13).**
- **Impact:** U02 #5, #6; U05 #22; U17 #3, #23; U51 #22; U79 #4. Undrawn: 005-S8.1–S8.4, 007-S1.11, 007-S3.25, 007-S5.3–S5.5.
- **(a) A failed save:**
  - adopt the neutral toast with "Retry". It must still show the error ID, and the focus must stay manageable. Supersedes 005-S1.7 and 005-S1.8's alert and focus move.
  - drop: KERN danger alert "Couldn't save your draft" with the server's message, or "Couldn't save. Check your internet connection and try again." with the error ID and "Try again"; the focus moves to it.
- **(b) Title-only alerts (build note 7):**
  - adopt only for alerts that carry a title alone.
  - drop for alerts with a body: alerts that carry an error ID, a list, "Try again", "Remove it" or "Dismiss" keep those parts in the design's alert style.
- **(c) Saving:**
  - adopt the modal "Saving your draft…".
  - drop: "Save and exit" is aria-disabled and reads "Saving…", with a polite status "Saving draft…" (005-S0.4, 005-S1.4).

**Q18. F — Disabled "Test rules" (Conflict 14).**
- **adopt:** "Test rules" is disabled while a rule is open, incomplete or in error, or while grouping. It shows "Save the rule first" / "Finish grouping first" and hover explanations that also open on focus. Supersedes 004-S2.1, 004-S2.4, 004-S2.6, 004-S2.7, 002-S2.23 and 002-S3.11.
- **drop:** it stays enabled; with unsaved changes it asks "Save changes to Rule 01?"; a refusal shows the message and moves the focus.

**Q19. W — Tab row before the first rule (Conflict 15).**
- **Impact:** U30, U33, U49–U51, U53.
- **build:** "Standard" and "+ Add variant" show from the start of the step and while a rule is edited (002-S2.2), with the empty state "No rules yet" in each variant.
- **drop:** the tab row appears only after the first rule. This is a behaviour change to record.

**Q20. F — "What is a variant" ⓘ and Standard's info icon (Conflict 16).**
- **adopt:** an ⓘ after "+ Add variant" on the Rules and Test steps, opening on hover and focus. Its text isn't drawn: say "Variants are other versions of these rules." if none follows. Standard's (i) only with a description. Supersedes 004-S8.2.6.
- **drop:** no ⓘ after "+ Add variant". Standard's (i) only with a description (002-S4.25).

**Q21. F — Inline variant rename (Conflict 17, Partial 10 tab ⋯).**
- **adopt:** double-click or ⋯ › Rename edits the tab name inline (Enter saves, Esc cancels), with the duplicate error beside the tabs. The description is edited elsewhere (say where), and ⋯ shows on the active tab only. Supersedes 002-S4.4 and 002-S4.22's dialog.
- **drop:** "Rename" opens the "Edit variant" dialog (name, description) and every tab has its ⋯.

**Q22. F/W — Rules-step menus (Conflict 18).**
- **W: build:**
  - "Copy link" as the last entry before the destructive ones (007-S4.1).
  - After "Restore" on removed items (007-S4.2).
  - "Rename" and "Copy to variant" on rule menus (002-S2.16, 002-S2.19).
  - Or drop any of them, which is a behaviour change.
- **F, "Group with other rules" in a rule's menu:** adopt (it starts select mode with that rule selected), or drop.
- **F, the same entry in a sub-group's menu:** adopt (supersedes 002-S2.10), or Figma error.

**Q23. F — Groups (Conflicts 19, 20).**
- **(a) Single-member and empty groups (U35 #21, U51 #21, #24, U47 #35):** Figma error (the baseline dissolves groups, 002-S2.13, 002-S4.18), or adopt (supersedes them; needs rules-package changes, so CLAR 2026-11-06 #1 defers it).
- **(b) A sub-group moving up:** keeps its name (002-S2.14, Figma error), or is renamed "Group NN" (rules package, CLAR #1).
- **(c) Group message hides members' messages** ("Not shown while this rule is in Group 01. Citizens see the group message instead."):
  - adopt as display only (supersedes 002-S2.5).
  - drop: every rule shows its message.

**Q24. F — Connectors and selection (Conflict 21, Partials 4, 5).**
- **(a) Connector:**
  - adopt the pill with a two-option menu ("All rules must be met" / "At least one rule must be met", "Applies to every rule in Group 01"), as a menu button whose accessible name says the level. Supersedes 002-ACC.2's toggle.
  - drop: a button that switches the level.
- **(b) Missing connector and trailing connector, link icon on some rules only:** Figma errors. The build keeps one connector between items (002-S2.8) and the link icon on every linked rule or none (002-S4.31).
- **(c) Groups selectable in select mode:** build (002-S2.9), or adopt rules-only selection.

**Q25. F — Date conditions (Conflict 22).**
- **Date of birth "from now" checks (U09 open question):** keep them (002-S3.14), or drop them for the Date of birth. Dropping is a rules-package change, so CLAR 2026-11-06 #1 defers it.
- **A fixed date for the Date of birth:** adopt (rules package, CLAR #1 defers), or drop.
- **"Time passed / Time left", "at most", "on", a unit picker on age, "starts with":** Figma errors. Keep "Time ago" / "Time from now", no "at most", whole years as fixed text, no "starts with".
- **The date hint:** port the design's wording, keeping "the time from now" if from-now stays: "Check the time since or until this date, or compare it with a fixed date."

**Q26. F — Identifiers (Conflict 23).**
- Identifiers only on the details, next to each name (002-S2.7, 002-S6.12); U03 #10's "Saved rules show their ID" means the details.
- Or adopt them in the rules step too, which supersedes 002-S2.7.

**Q27. W/F — Rule-editor states (Partial 9).**
- **build:**
  - Pickers unlock in order (disabled until the previous one is chosen).
  - Inline flags next to incomplete parts.
  - Counting and missing notes next to every date condition.
  - The part picker "Choose part" after "Licence classes" in every frame.
  - The placeholder "Error message applicants read: Suggested once you complete the check. You can edit it." in the design's wording ("Message for … : Suggested once you choose a check. You can edit it.", noun per Q2).
  - Class options show the code and description ("B Cars up to 3.5 t").
- **F, the values picker's "Done":** adopt or drop.

**Q28. F — Variants (Partials 6, 10).**
- **(a) Removed items:** show the message line and the "Changed here" text inside removed groups (002-ACC.1, 002-S4.19), or adopt hiding them.
- **(b) Linking:** a variant based on Standard stays linked when Standard has no rules (002-S4.29), or adopt "not linked". The latter is a rules-package change, so CLAR 2026-11-06 #1 defers it.
- **(c) Copy to variant:**
  - adopt the popover with help text; it must keep the focus inside and return it, or become a dialog.
  - drop: a dialog showing based variants as included and not choosable (002-S4.13).
  - Copies to Standard stay linked in the source branch (002-S4.14).

**Q29. F — Tab icons and banner (Partials 7, 8; U03 #21).**
- **(a) Problem icons:**
  - adopt a red error icon on the tab with the problem text in its tooltip, and a grey ⓘ when there are no findings. Supersedes 003-S4.2 and 003-S4.3.
  - drop: finding icons only.
- **(b) Test tabs:** show only "no applicant can meet" (004-S8.2.2), or all finding kinds.
- **(c) Banner names:** stay links that scroll to and focus the item (003-S2.16, W build). Per-line kind icons are adopted as styling.
- **(d)** The test tab's ⚠ comes from the evaluator, not hard-coded (FR-003); U03 #21's "no logic" is not built.

**Q30. F — Test-step "Edit data" (Conflict 24, Partial 14).**
- **adopt the dialog:** "Change the values to try a particular case. Results update when you save.", "Cancel", "Save and test" (an error blocks saving), and the toast "Results updated. Mia now meets Rule 01.". Supersedes 004-S8.5.1, 004-S8.5.2, 004-S8.5.9, 004-S8.5.10, 004-S8.10.3 and 004-ACC.4.
- **drop:** inline fields under the same headings, "Edit data" ↔ "Done", every valid change applies at once, and per-variant hidden announcements.
- **Either way:** licence classes are picked from a list by code; Nationality and Expiry date get fields (004-S8.5.5, 004-S8.5.3).

**Q31. F — Test-step results and data card (Conflict 25, Partials 12, 13).**
- **(a) Met-variant box:**
  - adopt "Your wallet data meets the requirements. Other documents are checked separately." as fixed text.
  - defer, if it should be a stored per-connection message (CLAR 2026-11-06 #1).
  - drop: no message column and no success message (004-S8.6.7).
- **(b) Rows:** keep the statement and "Not met" / "Couldn't be checked" as text (004-S8.6.4, 004-ACC.1). Or adopt the icon and tint only, which contradicts 004-ACC.1. The older frames' "19, needs 21" and "Mia sees" box are Figma errors.
- **(c) Data card:** document headings (004-S8.4.2), or adopt a document column. Panel scrolling (004-S8.4.11), or adopt per-card scrolling.

**Q32. F — Persona cards and details (Conflicts 26, 27, Partial 15).**
- **Cards:** the Publish frames' cards with avatar, age · nationality and outcome text are an older design; the chips from U65–U72 stay. Or adopt the cards, which supersedes 004-S8.3.1 and 004-S8.3.2.
- **"Your rules are saved.":** drop (004-S8.9.3), or adopt.
- **Regeneration:**
  - The chip becomes a skeleton pill (004-S8.8.4), or keeps its name with a ring.
  - The test-day line shows during one persona's regeneration (004-S8.1.2).
  - "Generate again" and "Generate all again" show in every results frame.
  - Generating asks only with changes (004-S8.3.5).
  - The tab tooltip opens on hover and focus (004-S8.2.3).

**Q33. F — Publish dialog (Conflict 28, Partial 11).**
- **"Back to test":** adopt (supersedes 004-S5.3), or drop.
- **Summary:** adopt counts only (supersedes 002-S5.1), or list the documents with their fields and each variant's rules.
- **Lines:** in tab order (003-S5.1), or warnings first.
- **"Published" interim state and 0.5 s delay:** adopt, or go straight to the details.
- **Failure:** keeps the error ID and the summary (FR-008).

**Q34. F — Edit flow (Conflicts 29, 30, Figma-only 4, Partial 17).**
- **(a) Entry confirmation** "Edit "<name>"?" with "Cancel" / "Edit connection": adopt (supersedes 002-S7.3), or drop (only the save dialog asks).
- **(b) Saving:**
  - adopt Save on every step, with the save dialog opening from the current step, and "Active" in the header. Supersedes 004-S2.3, 004-S5.1, 002-S7.1 and 004-S0.4.
  - drop: Save only from the test step through the save dialog ("Save without rules" on the documents and rules steps), and no badge.
- **(c) "Discard changes" with "Discard your changes?":** adopt as leaving without saving, or drop. "Send to your developer" is dropped as "Later".
- **(d) Note:** keep "Requests already in progress keep their previous configuration." (001-S5.9) in the design's wording, e.g. "Your changes take effect when you save them. Requests already in progress keep their previous configuration."

**Q35. F — Details layout (Conflicts 31, 32, Partial 18).**
- **(a) Edit:**
  - adopt one "Edit connection" opening step 1. Supersedes 002-S6.6 and 007-S5.8's rules entry.
  - keep an entry that opens the Rules step.
- **(b) Accordions** (Links, Summary; Activity is F2): adopt, with Summary open from "View" and one open at a time. Supersedes 002-S6.3's collapsed rules card and the always-shown URLs. Or drop.
- **(c) Heading:** the connection's name stays the h1 (001-S6.1, FR-012a), and the status sentence is a heading below it. Or adopt the status as the h1.
- **(d) "Create new connection":** stays in the action bar (001-S6.3, W build), or drop it.
- **(e) Reference hint:** visible text "serviceBW replaces {reference} with the request reference." (001-S6.5), or only in the ⓘ.
- **(f) Copy buttons while deactivated:** stay working, or adopt disabled.
- **(g) Branch ⓘ** after each variant name: build (002-S6.11).
- **(h) Variants:** adopt tabs (supersedes 002-S6.4's sections), or keep sections.
- **(i) Counts:** adopt "2 documents · 9 data items · 3 variants · 4 rules".

**Q36. F — Findings on details (Conflict 33, U85 6760:48437).**
- Figma error: no findings on the details (003-S6.1).
- adopt: lines and tab icons on the published summary. Supersedes 003-S6.1.

**Q37. F — Details extras (Conflicts 34–37).**
- **(a) "✓ Copied" for 2 s:** adopt (frontend only; supersedes 002-S6.9's item; still announced), or drop.
- **(b) "Download PDF":**
  - adopt as a client-side PDF (a new dependency).
  - defer, if a server PDF is needed (CLAR 2026-11-06 #1).
  - drop.
- **(c) "Active since …", "Deactivated since …", "Published / Deactivated <date>":**
  - adopt, if the API already provides publish and deactivation times.
  - otherwise defer (CLAR #1); then rows read "Edited <date>" and the details show no date pill.
- **(d) Undo after deactivating:** adopt as an immediate Reactivate (requests already cancelled stay cancelled; supersedes 001-S6.9's sole reversal), or drop.

**Q38. F — Confirmation texts (Partial 16).**
- **add the spec's facts to the design's sentences:**
  - Delete active: "This connection is active. Citizens won't be able to use it, and its links stop working for good. Requests in progress are cancelled."
  - Delete deactivated: "Its links stop working for good."
  - Reactivate: "Its links will work again."
  - Delete variant: names the broken result link as drawn.
  - The noun follows Q2.
- **adopt as drawn:** supersedes 001-S6.11's "permanently" and US4-AS3's requests clause.

**Q39. F/W — Draft details and restore dialog (Partials 19, 20).**
- **Draft details:**
  - adopt the status band "This connection is a draft" with "Edited <date>" and "Edit connection" / "Go to connections", plus a visible "Delete draft" (W build, 005-S6.9). Supersedes 005-S6.8 and 005-S6.14's labels and 005-S6.4's info alert.
  - drop: draft card, "Continue", "Delete draft", info alert "This draft isn't live. Its connection links appear once you publish it.".
- **Restore dialog:** Escape opens the draft's details and keeps the local draft (005-S5.5). The × and scrim behave like Escape, or adopt "no change".

**Q40. F — Motion (Conflict 38).**
- adopt the design's motion (240 ms, 150 ms, 150–200 ms, dialog fade, reduced-motion fallback). Supersedes OUT-6.
- drop: motion as KERN provides it, and no 0.5 s publish delay.

**Q41. W — Undrawn wizard, drafts, publish and details states (Spec-only 3–9, 17, 19–21).**
- **build:** each one from the new components (the KERN dialog, alert and form patterns of U14, U23, U51), with baseline behaviour and wording:
  - 005-S2.1–S2.13, from U90's dialog.
  - 005-S5.1–S5.4, from U17's dialog.
  - 005-S4.8–S4.13.
  - 005-S8.1–S8.6, as a warning alert listing the data, with "Remove it".
  - 002-S5.4–S5.6, in the publish dialog.
  - 005-S6.3, S6.7, S6.12, S6.13.
  - 003-S7.1 and 004-S7.2.
  - 006-S1.6, 006-S1.8, 006-S3.2, 006-S3.3, 001-S5.7, 001-S5.10, 001-S5.11.
  - 005-R.1, 005-R.2, 005-S0.6, 005-S0.10, 005-S0.11, 005-S1.6, 005-S1.9, 005-S1.10.
  - 001-S4.3, 001-S4.5, 005-S4.11.
- **drop:** only where the design removes a state on purpose.

**Q42. W — Undrawn rules, findings and test-step states (Spec-only 10–16).**
- **build:** 002-S2.20, S2.21, S2.24, S2.36; 002-S3.31; 002-S4.9, S4.27, S4.28, S4.30; the findings set (003-S2.5, S2.17, S2.19–S2.21, S4.4, ACC.5, ACC.6, CP.3, CP.6, CP.15, CP.17, CP.18; texts per Q2 and Q4); 004-S2.5; the test-step set (004-S8.5 …, ACC.2, ACC.3); the deep-link notices "This link points to a variant that no longer exists." / "This link points to a rule or group that no longer exists." with "Dismiss" (007-S5.x); and the toast announcement (007-S4.5). All in the design's banner, toast and outline patterns.
- **drop:** per item.

**Q43. W — Spec 007 pages (Spec-only 22–24).**
- **build:** the consent, account and approval pages from the new components: the design's card, radio group (AccessLevelChoice), list rows with a ⋯ menu (as the rule menu), dialogs, copyable read-only field and alerts. The wording is 007's (product name per Q1).
- **drop:** not allowed; these pages are baseline features the design doesn't remove.

**Q44. W — Guard, overview error, details error, general rules and narrow widths (Spec-only 1, 2, 18, 25; Partial 21).**
- **build:**
  - 001-S0.2 and 001-S0.4 as today.
  - 001-S3.7 and 001-S6.14 / US4-AS6 as the design's alert with the error ID and the way back.
  - FR-012b tab titles.
  - 005-ACC.4: the footer wraps and "Save and exit" keeps its label.
  - Reflow below 1024 px down to 320 px and 200 % zoom per EC-6 and FR-010a, nothing hidden.
  - FR-002c, FR-005, EC-2 and 001-S7.10 apply to every W item.

**Q45. F — ui-detail items (cosmetic rows 27–42).**
- **adopt as designed (all):** each opens on hover and focus where it is a tooltip, has a visible label where it is a field, and is announced where it is a toast.
- **drop listed rows:** they aren't built.
- **Neither option supersedes** a Clarification.

## Coverage
Shorthand:
- **wizard frames** = U17–U79, U98–U100
- **rules frames** = U17, U18, U29–U64, U98–U100
- **test frames** = U63, U65–U79, U99
- **details frames** = U58, U63, U80–U99
- **overview frames** = U04, U11–U18, U90
- **every frame** = U10–U100

| req-id | status | units |
|---|---|---|
| FR-001a | COVERED | U01, U02, U03, U07, U89, U95 |
| FR-001b | COVERED | U01, U07, U26 |
| FR-002a | COVERED, PARTIAL | most frames (e.g. U03, U10, U24, U31, U43, U44, U73, U75) |
| FR-002b | COVERED, PARTIAL | U19, U25, U62 |
| FR-002c | SPEC-ONLY | (cited U01 #22) |
| FR-003 | COVERED | U03, U07, U09 |
| FR-005 | SPEC-ONLY | – |
| FR-006 | PARTIAL | U03, U09, U10, U26, U29, U34, U39, U44–U46, U48, U49, U59, U60, U71, U74, U77 |
| FR-008 | COVERED, PARTIAL | U01, U02, U05, U20, U51, U52, U54, U78, U79 |
| FR-009a | COVERED, PARTIAL, CONFLICT | U01, U08, U20; X U04 |
| FR-009b | COVERED | U01 |
| FR-009c | COVERED, PARTIAL | U14, U15, U24, U26, U34, U50, U52, U62, U73, U75, U77, U78, U87–U89, U100; P U41 |
| FR-009d | COVERED, PARTIAL | U01, U06, U07, U13, U34, U39, U41 |
| FR-010a | PARTIAL | U02, U12 |
| FR-010b | COVERED | U02, U07 |
| FR-011 | COVERED | U01 |
| FR-012a | COVERED, PARTIAL | U03, U10, U13, rules frames, details frames |
| FR-012b | SPEC-ONLY | – |
| FR-013a | COVERED | U07, U52 |
| FR-013b | SPEC-ONLY → W1 | – |
| EC-1 | COVERED, PARTIAL | U03, U09, U23, U80, U83, U86 |
| EC-2 | SPEC-ONLY | (cited U03 #22) |
| EC-3 | COVERED, PARTIAL | U19, U34, U90 |
| EC-4 | PARTIAL | every frame with the product name |
| EC-5 | COVERED, PARTIAL | U01, U07 |
| EC-6 | PARTIAL | U02, U23 |
| EC-7 | COVERED, PARTIAL | U03, U04, U06, U07, U12, U13, U18, U26, U31, U58, U80, U83, U86, U87, U91, U94, U99 |
| EC-8 | SPEC-ONLY → W1 | – |
| EC-9 | SPEC-ONLY | – |
| US1-AS1 | COVERED, PARTIAL, CONFLICT | U02, U03, U05; P/X U10 |
| US1-AS2 | COVERED | U02, U10 |
| US1-AS3 | COVERED, PARTIAL | U02, U04, U05, U11, U12, U15 |
| US1-AS4 | COVERED, PARTIAL | U04, U05, U16; P U07 |
| US1-AS5 | COVERED | U10 |
| US2-AS1 | COVERED, PARTIAL, CONFLICT | U04, U22, U34, U42, U78; P U06, U21, U100; X wizard frames |
| US2-AS2 | COVERED, PARTIAL | U02, U18; P U25 |
| US2-AS3 | COVERED, PARTIAL | U02, U05, U20, U24; P U04, U22, U23, U25 |
| US2-AS4 | COVERED, PARTIAL | U04; P U13 |
| US2-AS5 | SPEC-ONLY | – |
| US3-AS1 | COVERED, PARTIAL | U34, U35, U42, U55, U59, U61; P U41, U43, U54–U57 |
| US3-AS2 | COVERED, PARTIAL | U49; P U48 |
| US3-AS3 | COVERED, PARTIAL | U42, U57; P U43 |
| US3-AS4 | COVERED, PARTIAL | U65, U68–U72, U74 |
| US3-AS5 | SPEC-ONLY | – |
| US4-AS1 | COVERED, PARTIAL | U06, U78; P U80, U82, U83, U85, U86, U99 |
| US4-AS2 | COVERED, PARTIAL | U02, U05, U07, U80, U82–U87, U99; P U81, U92, U95 |
| US4-AS3 | COVERED, PARTIAL, CONFLICT → F13 | U88–U90, U97; P U04, U07, U14, U15; X U88 |
| US4-AS4 | COVERED, PARTIAL | U05; P U07, U93 |
| US4-AS5 | COVERED, PARTIAL | U05; P U15, U87, U98, U99 |
| US4-AS6 | SPEC-ONLY | – |
| US5-AS1, US5-AS2, US5-AS3 | SPEC-ONLY | – |
| US5-AS4 | PARTIAL | every frame with the product name |
| 001-S0.1 | COVERED | U03 |
| 001-S0.2 | SPEC-ONLY | – |
| 001-S0.3 | COVERED | U06, U10 |
| 001-S0.4 | SPEC-ONLY | – |
| 001-S0.5 | COVERED, PARTIAL | U06, U10; P every signed-in frame |
| 001-S0.6 | COVERED, PARTIAL | U03, U17, U33, U47, U55, U72, U74, U78; P every other frame |
| 001-S1.1, 001-S1.3 | COVERED | U10 |
| 001-S1.2 | PARTIAL, CONFLICT | U10 |
| 001-S2.1, 001-S2.2 | COVERED | U10 |
| 001-S3.1 | COVERED, PARTIAL | overview frames, U07, details frames |
| 001-S3.2 | COVERED, PARTIAL | U04, U06, U07, U11–U16; P U90 |
| 001-S3.3 | COVERED, PARTIAL | U06; P overview frames |
| 001-S3.4 | COVERED, PARTIAL | U04; P U11, U12 |
| 001-S3.5 | PARTIAL | U06 |
| 001-S3.6 | COVERED, PARTIAL | U02; P U04, U06, U11 |
| 001-S3.7 | SPEC-ONLY | – |
| 001-S4.1, 001-S4.2 | PARTIAL, CONFLICT | U06, U18; X U11 |
| 001-S4.3 | SPEC-ONLY | – |
| 001-S4.4 | COVERED, PARTIAL | U04, U06 |
| 001-S4.5 | SPEC-ONLY | – |
| 001-S4.6 | COVERED | U06, U10 |
| 001-S4.7, 001-S4.8 | PARTIAL | U06, U11 |
| 001-S5.1 | COVERED, PARTIAL | U04; P U18, U98 |
| 001-S5.2 | COVERED, PARTIAL | U04, U20–U28, U98; P U06 |
| 001-S5.3 | COVERED, PARTIAL | U04, U06, U09, U21–U28, U98 |
| 001-S5.4 | COVERED, PARTIAL, CONFLICT | U04, U21, U24, U26; P U23; X U22–U25, U28 |
| 001-S5.5, 001-S5.6 | COVERED, PARTIAL, CONFLICT | U02, U25; P U04, U23; X U04, U20 |
| 001-S5.7 | SPEC-ONLY | – |
| 001-S5.8 | PARTIAL | U05, U78, U99 |
| 001-S5.9 | PARTIAL | U05, U15, U87, U98 |
| 001-S5.10, 001-S5.11 | SPEC-ONLY | – |
| 001-S6.1 | COVERED, PARTIAL | U02, U03, U06, details frames |
| 001-S6.2 | PARTIAL, CONFLICT | U63, U80, U83, U86; X U02 |
| 001-S6.3, 001-S6.4, 001-S6.5, 001-S6.7, 001-S6.8 | COVERED, PARTIAL | details frames, U03, U05, U19 |
| 001-S6.6 | COVERED | U05, U80, U83, U86 |
| 001-S6.9 | COVERED, PARTIAL, CONFLICT → F13 | U06, details frames; X U05, U88 |
| 001-S6.10 | COVERED, PARTIAL, CONFLICT | details frames; P U02, U05, U07; X U05 |
| 001-S6.11 | COVERED, PARTIAL, CONFLICT → F4 | U06, details frames; P U04, U07, U14, U15; X U04, U05, U90 |
| 001-S6.12 | COVERED, PARTIAL, CONFLICT → F4 | U90; P U04 |
| 001-S6.13 | PARTIAL | U06 |
| 001-S6.14 | SPEC-ONLY | – |
| 001-S7.1 | PARTIAL | U08 |
| 001-S7.2 | PARTIAL, CONFLICT | U08; X U04 |
| 001-S7.3 | COVERED, PARTIAL | dialog frames (U14, U24, U26, U37, U47, U50, U52, U62, U73, U75, U78, U87–U89, U100); P U06, U23, U41, U99 |
| 001-S7.4 | COVERED, PARTIAL | U10, U37; P U18 |
| 001-S7.5 | COVERED, PARTIAL | U02, U49, U52, U67; P U04, U25, U48, U60 |
| 001-S7.6 | PARTIAL | U04, U25 |
| 001-S7.7 | COVERED, PARTIAL, CONFLICT | U41, U80, U83, U86; P U04, U17, U79, U99; X U81 |
| 001-S7.8 | COVERED | U03, U10, U13 |
| 001-S7.10 | SPEC-ONLY | – |
| 001-S7.11 | PARTIAL | U02 |
| 002-S0.1 | COVERED, PARTIAL | wizard frames |
| 002-S0.2 | COVERED, PARTIAL | U01, U03, U06, U19, U22, U28; P U23–U27, U65 |
| 002-S0.3 | COVERED | U01, U36, U40, U56, U57, U64 |
| 002-S1.1, 002-S1.2 | COVERED, PARTIAL | U01, U04, U06, U21–U28 |
| 002-S1.3, 002-S1.7 | COVERED | U24, U26 |
| 002-S1.4 | PARTIAL, CONFLICT | U04–U06, U21–U28; X U20 |
| 002-S1.5 | COVERED, PARTIAL, CONFLICT | U05, U26; P U22, U24, U28; X U04 |
| 002-S1.6 | COVERED, PARTIAL | U04, U24, U26; P U23 |
| 002-S1.8 | COVERED, PARTIAL, CONFLICT → F3 | U06; P U04, U20, U21, U23, U24; X U04, U20–U28, U98 |
| 002-S1.9 | PARTIAL, CONFLICT | P U22, U24, U26; X U04, U05, U20, U22–U25, U28, U98 |
| 002-S1.10, 002-S1.11 | COVERED, PARTIAL | U09, U21–U24, U27, U28 |
| 002-S2.1, 002-S2.4, 002-S2.6, 002-S2.28–S2.30 | COVERED, PARTIAL | rules frames, details frames |
| 002-S2.2 | COVERED, PARTIAL, CONFLICT | U39, U57; P U33; X U30, U49–U51, U53 |
| 002-S2.3 | COVERED, CONFLICT | U29, U31, U32, U35, U39, U50, U99, U100; X U51 |
| 002-S2.5 | COVERED, PARTIAL, CONFLICT | rules frames; X U35 |
| 002-S2.7 | COVERED, CONFLICT | U34, U35, U38, U42, U43, U56, U57; X U03 |
| 002-S2.8 | COVERED, PARTIAL, CONFLICT | rules frames; X U40, U62 |
| 002-S2.9, 002-S2.15 | COVERED, PARTIAL → F9 | rules frames |
| 002-S2.10 | COVERED, PARTIAL, CONFLICT | rules frames; X U55, U56 |
| 002-S2.11 | COVERED, PARTIAL | rules frames; P U55–U58 |
| 002-S2.12 | COVERED, PARTIAL → F7 | rules frames; P U54, U56 |
| 002-S2.13 | PARTIAL, CONFLICT → F7, F9 | U34; X U35, U47, U51 |
| 002-S2.14 | CONFLICT | U35 |
| 002-S2.16 | COVERED, PARTIAL → F8 | rules frames; P U09, U34, U36, U41, U54–U57 |
| 002-S2.17 | COVERED, PARTIAL, CONFLICT | U29–U35, U48, U49, U51, U53; P U55, U56; X U60 |
| 002-S2.18 | COVERED, PARTIAL | U49 |
| 002-S2.19 | PARTIAL | U55, U56 |
| 002-S2.20, 002-S2.21, 002-S2.24, 002-S2.36 | SPEC-ONLY | – |
| 002-S2.22 | COVERED, PARTIAL | U50; P U06 |
| 002-S2.23 | PARTIAL, CONFLICT | U40; X U01, U29–U33, U35, U48–U51, U53 |
| 002-S2.25 | COVERED, PARTIAL, CONFLICT | U06, U29, U50; P U31, U99; X U01 |
| 002-S2.26 | COVERED, PARTIAL | U51; P U06, U50, U99 |
| 002-S2.27 | PARTIAL | rules frames, details frames |
| 002-S2.31–S2.35 | COVERED, PARTIAL | U05, U06, U34–U36, U40, U47, U55, U57, U64 |
| 002-S3.1 | COVERED, PARTIAL → F9 | rules frames |
| 002-S3.2–S3.10, 002-S3.12, 002-S3.13, 002-S3.19–S3.25, 002-S3.27–S3.29, 002-S3.32–S3.41 | COVERED, PARTIAL | U03, U09, U29–U35, U46, U48–U53, U83, U84, U91, U94, U96, U98–U100 |
| 002-S3.11 | CONFLICT | U49 |
| 002-S3.14 | COVERED, PARTIAL, CONFLICT | U03, U09, U42, U53; P U31; X U09 |
| 002-S3.15, 002-S3.16, 002-S3.17, 002-S3.18 | COVERED, PARTIAL, CONFLICT | U03, U09, U29–U32, U49, U50, U53; X U09, U31, U49 |
| 002-S3.30 | COVERED, CONFLICT | U03, U09, U33; X U53 |
| 002-S3.31 | SPEC-ONLY | – |
| 002-S4.1–S4.3, 002-S4.5–S4.8, 002-S4.10–S4.13, 002-S4.15–S4.17, 002-S4.19–S4.21, 002-S4.23–S4.26, 002-S4.29 | COVERED, PARTIAL | rules frames, U05, U06, U08, details frames |
| 002-S4.4, 002-S4.22 | COVERED, PARTIAL, CONFLICT | rules frames; X U59, U60, U62 |
| 002-S4.9, 002-S4.27, 002-S4.28, 002-S4.30 | SPEC-ONLY | – |
| 002-S4.14 | PARTIAL → F10 | U42 |
| 002-S4.18 | CONFLICT | U47 |
| 002-S4.31 | COVERED, PARTIAL, CONFLICT → F10 | U42, U43, U57; P U03; X U40, U62 |
| 002-S5.1–S5.3, 002-S5.9 | COVERED, PARTIAL | U05, U63, U73, U75–U79, U98 |
| 002-S5.4–S5.6 | SPEC-ONLY | – |
| 002-S5.7 | COVERED, CONFLICT → F1 | U75, U77; X U02, U13, U63, U73, U75–U77, U86, U87, U94, U95, U98, U99 |
| 002-S5.8 | CONFLICT → F1 | U02, U05–U07, U13, U14, U58, U63, U75–U77, U86–U89, U94, U95, U98, U99 |
| 002-S5.10 | COVERED, CONFLICT | U98; X U15, U87, U99 |
| 002-S6.1, 002-S6.2, 002-S6.4, 002-S6.5, 002-S6.10–S6.13 | COVERED, PARTIAL | U03, U06, U07, details frames |
| 002-S6.3 | COVERED, PARTIAL, CONFLICT | U06; P details frames; X U06, U91 |
| 002-S6.6 | PARTIAL, CONFLICT | details frames; X U06 |
| 002-S6.7 | COVERED, PARTIAL, CONFLICT → F1 | U01, U06, details frames |
| 002-S6.8 | COVERED, PARTIAL, CONFLICT | U03, U06, U63, U81, U84, U85; X U81, U84, U91, U96 (sample data) |
| 002-S6.9 | PARTIAL, CONFLICT → F2 (Activity) | U07; X U06, U07, details frames |
| 002-S7.1 | COVERED, PARTIAL, CONFLICT | U05; P U06; X U100 |
| 002-S7.2 | COVERED, CONFLICT | U05, U19; X U06 |
| 002-S7.3 | COVERED, CONFLICT | U98; X U05, U06, U15, U87 |
| 002-ACC.1–ACC.4 | COVERED, PARTIAL | rules frames, U01, U08, U18, U83 |
| 003-S2.1–S2.4, 003-S2.6–S2.16, 003-S2.18, 003-S2.22–S2.24 | COVERED, PARTIAL | U06, U07, U34, U37, U38, U42–U46, U50, U51, U77 |
| 003-S2.5, 003-S2.17, 003-S2.19–S2.21 | SPEC-ONLY | – |
| 003-S2.12 | COVERED, PARTIAL, CONFLICT | rules frames; X U03 |
| 003-S3.1 | COVERED | U30 |
| 003-S4.1, 003-S4.3, 003-S4.5–S4.7 | COVERED, PARTIAL | U06, U18, U39, U42–U47, U58, U61, U71 |
| 003-S4.2 | COVERED, PARTIAL, CONFLICT | rules frames; X U03 |
| 003-S4.4 | SPEC-ONLY | – |
| 003-S5.1–S5.4 | COVERED, PARTIAL | U06, U63, U73, U75–U77 |
| 003-S6.1 | COVERED, CONFLICT | U03, details frames; X U06, U85 |
| 003-S7.1 | SPEC-ONLY | – |
| 003-ACC.1–ACC.4 | COVERED, PARTIAL | U07, U44, U45 |
| 003-ACC.5, 003-ACC.6 | SPEC-ONLY | – |
| 003-CP.1, CP.2, CP.4, CP.5, CP.7–CP.14, CP.16 | COVERED, PARTIAL | U44–U46, U51, U63, U77 |
| 003-CP.3, CP.6, CP.15, CP.17, CP.18 | SPEC-ONLY | – |
| 004-S0.1, 004-S0.2 | COVERED, PARTIAL, CONFLICT | U04, U06, U18, U99, U100; X wizard frames |
| 004-S0.3 | PARTIAL, CONFLICT | U06, U99; X wizard frames |
| 004-S0.4 | CONFLICT → F5 (Draft changes) | U03, U05, U60, U98, U99, U100 |
| 004-S1.1 | COVERED, PARTIAL, CONFLICT | U05, U06, U26; P U28; X U04 |
| 004-S2.1–S2.4 | COVERED, PARTIAL, CONFLICT | rules frames; X see Conflict 14 |
| 004-S2.5 | SPEC-ONLY | – |
| 004-S2.6, 004-S2.7 | CONFLICT | U29–U31, U48–U50, U53 |
| 004-S5.1, 004-S5.2, 004-S5.4, 004-S5.5 | COVERED, PARTIAL | U63, U73, U75–U79, U98 |
| 004-S5.3 | CONFLICT | U63, U73, U75–U77, U79 |
| 004-S7.1, 004-S7.3 | COVERED, PARTIAL, CONFLICT | U99; X U05, U06, U98 |
| 004-S7.2 | SPEC-ONLY | – |
| 004-S8.1–S8.3, 004-S8.1.1, 004-S8.1.2, 004-S8.2.1–S8.2.6, 004-S8.3.1–S8.3.5, 004-S8.4.1–S8.4.11 | COVERED, PARTIAL | test frames, U03, U06, U09 |
| 004-S8.5 | SPEC-ONLY | – |
| 004-S8.5.1, S8.5.3–S8.5.7, S8.5.9–S8.5.12, S8.5.14 | COVERED, PARTIAL, CONFLICT | U06, U09, U66–U68, U72; X U06, U66, U67 |
| 004-S8.5.2 | CONFLICT | U06, U66, U67 |
| 004-S8.5.8, 004-S8.5.13, 004-S8.6.5, 004-S8.7.3, 004-S8.7.4, 004-S8.10.1 | SPEC-ONLY | – |
| 004-S8.6.1–S8.6.3, S8.6.6, S8.6.8 | COVERED, PARTIAL | test frames, U06 |
| 004-S8.6.4 | COVERED, PARTIAL → F11 | test frames, U03, U06, U09 |
| 004-S8.6.7 | COVERED, CONFLICT | U65; X U06, U65, U70 |
| 004-S8.7.1, 004-S8.7.2 | COVERED, PARTIAL | U06, U68 |
| 004-S8.8.1–S8.8.6, 004-S8.9.1, S8.9.2, S8.9.4 | COVERED, PARTIAL | U06, U74 |
| 004-S8.9.3 | CONFLICT | U74 |
| 004-S8.10.2, 004-S8.10.3 | CONFLICT | U06, U67 |
| 004-ACC.1, ACC.5, ACC.6 | COVERED, PARTIAL | test frames |
| 004-ACC.2, ACC.3 | SPEC-ONLY | – |
| 004-ACC.4 | CONFLICT | U66 |
| 005-R.1, 005-R.2 | SPEC-ONLY | – |
| 005-S0.1–S0.5, S0.8, S0.9 | COVERED, PARTIAL | wizard frames, U05, U06, U100 |
| 005-S0.6, S0.10, S0.11 | SPEC-ONLY | – |
| 005-S0.7 | COVERED, CONFLICT → F5 | U99, U100; X U03, U05, U06, U60, U98, U99 |
| 005-S1.1–S1.5, S1.7, S1.8 | COVERED, PARTIAL, CONFLICT | U02, U04, U06, U17, U50, U51, U98; X U04, U05 |
| 005-S1.6, S1.9, S1.10 | SPEC-ONLY | – |
| 005-S2.1–S2.13 | SPEC-ONLY | – |
| 005-S3.1–S3.9 | COVERED, PARTIAL, CONFLICT | overview frames, U04–U07; X (Edit/date) U11–U18 |
| 005-S4.1–S4.7, S4.9 | COVERED, PARTIAL | U04, U06, U07, U16 |
| 005-S4.8, S4.10–S4.13 | SPEC-ONLY | – |
| 005-S5.1–S5.4 | SPEC-ONLY | – |
| 005-S5.5 | PARTIAL | U06 |
| 005-S6.1, S6.4–S6.6, S6.8–S6.11, S6.14 | COVERED, PARTIAL | U02, U04, U06, U07, U14, U15, U24, U28, U93 |
| 005-S6.2 | CONFLICT | U02 |
| 005-S6.3, S6.7, S6.12, S6.13 | SPEC-ONLY | – |
| 005-S7.1, S7.6 | COVERED, PARTIAL | U05, U10, U68; P signed-in frames |
| 005-S7.2–S7.5 | COVERED, PARTIAL, CONFLICT | U06; P U17; X U05, U17 |
| 005-S8.1–S8.4 | CONFLICT (build note only) | U02 |
| 005-S8.5, S8.6 | SPEC-ONLY | – |
| 005-S8.7 | COVERED | U21, U22, U26, U98 |
| 005-ACC.1–ACC.3 | COVERED, PARTIAL | wizard frames, dialog frames, U02, U51 |
| 005-ACC.4 | SPEC-ONLY | – |
| 005-CP.1 | COVERED, PARTIAL, CONFLICT | U04; P U02, U06, U13, U14, U17, U18, U53, U87, U93; X U11, U12, U15, U16 |
| 006-S0.1, S1.2, S1.4, S1.5, S1.7, S2.1–S2.3, S3.1, S4.1–S4.3, S5.1 | COVERED, PARTIAL | U04, U07, U11–U19, U63, U90, U98 |
| 006-S1.1, 006-S1.3 | PARTIAL, CONFLICT | U98; X U04, U18 |
| 006-S1.6, S1.8, S3.2, S3.3 | SPEC-ONLY | – |
| 007-R.1–R.3, 007-S1.1–S1.10, S1.12, 007-S2.2–S2.15, 007-S3.1–S3.26 | SPEC-ONLY | – |
| 007-S1.11, 007-S5.3 | PARTIAL (build note only) | U02 |
| 007-S2.1 | COVERED, PARTIAL | U68; P signed-in frames |
| 007-S4.1, S4.2, S4.4, S4.6 | COVERED, PARTIAL, CONFLICT | rules frames, U05, U06, U54; X U54, U58, U59 |
| 007-S4.5, 007-S5.1, S5.2, S5.4–S5.8 | SPEC-ONLY | – |
| 007-S6.1, S6.2 | COVERED, PARTIAL | U05, U11, U82, U94; P details frames |
| 007-CP.1, CP.2 | COVERED, PARTIAL | U14, U15, U62, U87; P rules frames |
| FR-004, FR-007, FR-014a, FR-014b, FR-015a, FR-015b, FR-016a–c, FR-017a, FR-017b, FR-018, 001-S5.12, 001-S7.9 (→ F6), 002-S3.26, 002-S7.4, 004-S8.4, 007-S4.3 | UI = N | mapped where cited (U01, U05, U09, U15) |

## Not audited
- U101 "How other tools do it (research)" (6895:46858): OUT, research and inspiration, not app UI.
- Hidden layers, including the two hidden "Old ·" sections, were skipped by the mapper.
- No unit is UNCERTAIN, FAILED or RATE_LIMIT.
