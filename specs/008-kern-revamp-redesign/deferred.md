# Deferred features — drawn in the design, left out of feature 008

Every item here is something the Figma design "Middleware – V5" (file `s8mU9oJDq3411e8bxMjQO9`)
draws that feature 008 does not build, because it needs a change outside the frontend (a backend
endpoint or field, a rules-package capability, an MCP tool), which Clarification 2026-11-06 #1 of
`spec.md` defers. Each item carries the frames (unit and node ids of `figma-audit/units.md`), the
design's wording, what it needs, and the baseline item it would supersede, so that a later feature
can be specified from this file alone.

How to use it: pick one group below, paste its "`/speckit-specify` description" into a new chat
after `/speckit-specify`, and run `/figma-audit` on the group's frames only (the node ids are the
scope). The groups are cut by the package they change, so one feature stays reviewable. The
frontend side of every item is already decided here: the later feature ports the frames, it does
not re-decide them.

Updated as `/speckit-clarify` (session 2026-11-07) runs; items Q# come from
`figma-audit/report.md` "Clarify questions", items F# from its "Figma must change (decided)".

Spec 010 (`specs/010-revamp-backend-gaps/`, 2026-11) built F1, F2, F4, Q9 (b), Q14 (e), Q14 (f),
Q37 (c), F71 and Q11, each marked "built by spec 010" in its row; where it decided a detail
differently from this file, its spec and design notes win. Spec 011
(`specs/011-connection-pdf/`, 2026-11) built Q37 (b), marked "built by spec 011" in its row, the
same way. The other items stay deferred.

## Group A — Stored data the backend lacks (backend + api-types + frontend)

| # | Feature | Frames | Design's wording | Needs | Would supersede |
|---|---|---|---|---|---|
| F1 | Go-live scheduling: "Active from: Now / On a date", a date field, the "Scheduled" status, rows and screen, "Change start date" (built by spec 010, `specs/010-revamp-backend-gaps/`) | U02 #9, #10, #17; U05 #34, #38; U06 #19, #49, #65; U07 #2; U13 #12; U14 #13, #21; U58 #33; U63 #21 (7112:48859); U73 #24; U75 #7, #11–#13 (6376:25536); U76 #27, #29–#31, #33, #34 (6635:36265); U77 #7; U86 #4, #10, #11 (7355:61329); U87 #19–#22 (6396:48860); U88 #10; U89 #32 (7173:52959); U94 #3, #6, #7; U95 #4, #7–#9; U98 #38, #40 (6730:39464); U99 #36, #37 | "Active from: Now / On a date", "Enter a date after today.", "Schedule", "Scheduled", "Active from <date>", "Change start date", "Save date", "from the time you choose" | a scheduled activation time and a worker step that activates it | 002-S5.7, 002-S5.8, 002-S6.7 (publishing goes live at once) |
| F2 | Activity card: "Last edited by", the event log, "View activity" / "Hide activity", "Deactivated by …" (built by spec 010, `specs/010-revamp-backend-gaps/`) | U06 #60; U07 #26; U58 #41; U63 #37; U80 #20, #21; U81 #22 (6809:46582); U82 #23; U83 #33, #34; U84 #35; U85 #24; U86 #22–#26; U87 #14; U88 #21, #22; U89 #24, #25; U90 #20 (6417:31520); U91 #26; U92 #14, #15; U93 #18, #19; U94 #20; U95 #17–#19 (7246:54525); U96 #28; U97 #14, #15; U99 #17, #18 | "Last edited by", "View activity", "Hide activity", "Deactivated by …" | an event log per connection with the acting team member | 002-S6.9 (details without an Activity card) |
| F4 | Undo after deleting a connection (a toast with "Undo") (built by spec 010, `specs/010-revamp-backend-gaps/`) | U04 #21; U05 #24; U90 #22 | toast with "Undo" | a soft delete with a restore endpoint | 001-S6.11, 001-S6.12 (deletion is permanent) |
| F5 | A live connection's pending changes kept as a draft: "Keep draft and exit", the "Draft changes" badge, "Changes not published" | U03 #36; U05 #31, #33, #36; U06 #50; U60 #33, #35; U98 #5; U99 #22, #23; U100 #3, #24 | "Keep draft and exit", "Draft changes", "Changes not published" | a draft next to a published revision (spec 005 allows one or the other) | 005-S0.7, 004-S0.4 |
| F13 | Deactivation lets requests already started finish | U88 #28 (6417:31206) | "The connection will be deactivated and its links will stop working. Requests already started still finish. Remember to remove the wallet connection from your service." | the backend keeps serving in-flight requests of a deactivated revision | 001-S6.9, US4-AS3 (requests in progress are cancelled) |
| Q9 (b) | "Start from an example": a dialog creates the stored draft "Passenger transport licence (example)" (2 documents, 2 rules, a variant), example banners per step, a publish-dialog line (built by spec 010, `specs/010-revamp-backend-gaps/`) | U06 #25 (6791:46863), #91; U11 #26, #28; U18 #8, #10–#12, #16, #23, #32; U73 #25 | "Start from an example"; "This is still the example. Check that the name, documents and rules fit your service." | a draft marked as an example (stored attribute) | 001-S4 (the welcome page is built without the entry, Q9) |
| Q13 | Email line in the user menu | U13 #22, #23 (6699:44358) | "<email>" under the name | an email attribute on team members and in the current-user response | — (the menu is built without it, Q13) |
| Q14 (e) | Drag reordering of documents (press and hold on touch), with Move up / Move down as the keyboard way (built by spec 010, `specs/010-revamp-backend-gaps/`) | U04 #42, #43; U08 #2, #3 (7370:55193); U23 #13; U27 #11–#13, #24 (7298:63317); U28 #12 (7298:64157) | — | the stored document order (the API returns catalog order) | 002-S1 (catalog order) |
| Q31 (a) | A success message a met citizen reads, shown on the test step as "Message Mia reads" | U06 #32; U65 #28; U70 #22 | "Your wallet data meets the requirements. Other documents are checked separately." | a stored per-connection success message delivered with the evaluation | 004-S8.6.7 (no success message) |
| Q37 (b) | "Download PDF" of a connection's details (links, documents, rules per variant) (built by spec 011, `specs/011-connection-pdf/`: a client-side PDF made with PDFKit in a module worker, with the connection's version beside the button) | U07 #28; U58 #40; U63 #36; U80 #18; U81 #21; U82 #15; U83 #17; U84 #21; U85 #17; U86 #20 (6396:48385); U87 #13; U88 #19; U89 #22 (6417:31343); U90 #19; U91 #17; U92 #13; U93 #10; U94 #14; U95 #15; U96 #20; U97 #13; U99 #15 | "Download PDF" | a PDF rendered by the server, or a client-side PDF library and its layout | 002-S6.9 |
| Q37 (c) | Status dates: "Active since <date>" / "Deactivated since <date>" on the details, "Published <date>" / "Deactivated <date>" on overview rows (built by spec 010, `specs/010-revamp-backend-gaps/`) | details U58 #31, U63 #28, U80 #7 (7355:61158), U81 #8 (7355:61822), U82 #7, U83 #7, U84 #8, U85 #8, U86 #8, U87 #7, U88 #8, U90 #15, U91 #7, U92 #8, U99 #7; deactivated U89 #8, U96 #7 (7355:60885), U97 #7; overview U11 #15, U13 #13, #15, U14 #10, #12, U15 #15, #17, U17 #35, U18 #43, U90 #31 | "Active since …", "Deactivated since …", "Published <date>", "Deactivated <date>" | `published_at` and a deactivation time in the form connection responses and api-types | 002-S6.9, 005-S3.3 ("Edited <date>") |
| F71 | A draft row's step: "Edited <date> · <step> step" (#62) (built by spec 010, `specs/010-revamp-backend-gaps/`) | U11 #15; U12 #16; U13 #14; U14 #11; U15 #16; U16 #27; U18 #43; U17 6699:48031; build note U06 #89 | "Edited 28.10.2026 · Rules step" | `step` (the draft's stored step, null when published) in `FormConnectionSummary` and its api-types mirror; the frontend's `rowMetaOf` already shows it | 005-S3.3 ("Edited <date>") |
| Q11 | Bulk delete on the overview: row and select-all checkboxes, the selection bar, one dialog listing the connections with status badges (built by spec 010, `specs/010-revamp-backend-gaps/`) | U04 #4, #14, #19; U06 #66; U11 #9, #19; U12 #8, #10, #20; U13 #9, #18; U14 #8, #15; U15 #8, #20, #21, #27 (6699:45206), #29; U16 #23, #30; U17 #29; U18 #39, #45; U90 #27, #33 | "N selected · Cancel · Delete" | one endpoint that deletes several connections atomically | — (row delete is built, Q11) |

`/speckit-specify` description (draft, to complete when the group is scheduled):

> Add to the management UI the stored-data features the KERN Revamp design draws and feature 008
> deferred: go-live scheduling, the activity log, undo after deleting, pending changes of a live
> connection kept as a draft, deactivation that lets started requests finish, the example draft,
> the email line in the user menu, a stored document order with drag reordering, a success
> message for met citizens on the test step, "Download PDF", the publish and deactivation dates,
> a draft row's step on the overview, and bulk delete on the overview. The frames are listed in specs/008-kern-revamp-redesign/deferred.md,
> group A, with their node ids; the frontend ports them as drawn, and each item adds its backend
> field or endpoint, its api-types mirror and its MCP tool where agents need it.

## Group B — Rules-package capabilities (rules + frontend, MCP where agents edit)

| # | Feature | Frames | Design's wording | Needs | Would supersede |
|---|---|---|---|---|---|
| Q2-I | Grouping a group: "Group with other rules" on a top-level group without a sub-group, and groups selectable in select mode (#64, Implement Q2) | U57 #22 (6522:32862); U36 (6344:53506, 6344:53530); U40 #13; U64 #22 | "Group with other rules" | `canGroup` in `rules/src/tree.ts` accepting a top-level group without a sub-group (it becomes a sub-group), propagation of that move in `rules/src/branches.ts`, the server's checks (`backend/app/services/rules.py`) and the MCP skill | FR-036's and FR-038's group clauses (built for rules only) |
| F7 | "Remove from group" / "Remove from sub-group", moving a sub-group out | U34 #27; U36 #29 (6344:53657); U54 #6, #14 (6522:33107); U55 #25, #26 (6522:32071); U56 #27 (6522:32540) | "Remove from group", "Remove from sub-group" | a new edit action in `rules/src/edits.ts` and its MCP tool | 002-S2.12, 002-S2.13, 002-S2.15 (group menus offer "Ungroup" and "Delete group" only) |
| F8 | "Duplicate group" / "Duplicate sub-group" | U54 #15; U55 #29 (6522:32424); U56 #24; U57 #22 | "Duplicate group", "Duplicate sub-group" | a group duplicate action in the rules package | 002-S2.16 (Duplicate is a rule action) |
| F9 | Adding into an empty group (the "+ Add rule" inside a group or sub-group with members is the baseline, 002 FR-008 and `edits.addRule` with `parentId`, and stays built: T057, 2026-11-08) | U34 #19; U35 #20; U36 #26; U38 #21; U40 #24; U41 #20; U42 #26; U43 #22; U44 #29; U45 #20; U47 #24; U51 #19, #25; U52 #17; U54 #9; U55 #21; U56 #21; U57 #16; U58 #18; U59 #22; U60 #24; U62 #14 | "+ Add rule" | an insert-into-group action in the rules package | 002-S3.1, 002-S2.9, 002-S2.15, 002-S2.13 |
| F10 | "Unlink from Standard", its result and the toast | U03 #23 (6648:42016); U05 #4, #5 (6711:39381); U06 #16 (6791:46863); U08 #5 (7370:55195) | "Unlink from Standard", "Unlinked from Standard." | an unlink transition in `rules/src/branches.ts` and the server's checks | 002-S4.14, 002-S4.31, 002-S4.4 |
| F11 | Persona generation that makes every rule testable | U06 #40 | — | the personas generator in the rules package | 004-S8.6.4 ("Couldn't be checked" stays) |

`/speckit-specify` description (draft):

> Extend the rules of a connection with the editing actions the KERN Revamp design draws and
> feature 008 deferred: remove a rule from its group, duplicate a group, add a rule inside a group,
> unlink a variant from Standard, group a group with other rules, and generate test personas that make every rule testable. The
> frames are listed in specs/008-kern-revamp-redesign/deferred.md, group B; each action goes into
> rules/src/edits.ts (or branches.ts) with its test, its MCP tool and skill, and the frontend ports
> the frames as drawn.

## Group C — Product-wide (backend + rules + frontend + MCP)

| # | Feature | Frames | Design's wording | Needs | Would supersede |
|---|---|---|---|---|---|
| F3 | "Coming soon" / "Upcoming" documents in the catalog | U04 #39 (6711:39375); U20 #18, #19; U21 #25; U22 #24 | "Coming soon", "Upcoming" | catalog entries flagged as upcoming | 002-S1.8 (only the catalog's documents are offered) |
| F6 | DE/EN language switch (built by spec 009, `specs/009-language-toggle/`) | header of every frame U10–U100 (e.g. U15 6699:45201, U19 6699:45323, U98 6731:39823); U03 #31 | "DE" / "EN" | translated server, rules and findings copy | 001-S7.9 (one English UI, `lang="en"`) |
| F12 | View-only users, roles, a view-only draft page | U06 #27; U07 #29; U08 #6; U93 #22 | — | roles on team members and per-endpoint authorisation | OUT-2 (every team member has the same rights) |

| Q14 (f) | Field groups (Name, Birth, Address, Document, Other details) with tri-state group checkboxes; the mixed state opens 002-S1.1's dialog for rule-checked fields (built by spec 010, `specs/010-revamp-backend-gaps/`) | U28 #17; U98 #25; U04 #44, #46; U21 #14; U22 #16; U24 #14; U25 #13; U26 #14; U27 #17 | "Name", "Birth", "Address", "Document", "Other details" | the grouping in the catalog (backend) and its mirror in api-types | 002-S1 (fields in catalog order) |

`/speckit-specify` description (draft): one feature per row; each is a product decision first.
