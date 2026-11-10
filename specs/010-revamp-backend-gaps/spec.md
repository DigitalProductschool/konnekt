# Feature Specification: The stored-data features of the KERN Revamp design (deferred group A)

**Feature Branch**: `010-revamp-backend-gaps` (feature directory `specs/010-revamp-backend-gaps/`;
no git branch was created, the worktree's repository is not reachable from this machine)

**Created**: 2026-11-10

**Status**: Draft

**Input**: User description: "Add to the management UI the stored-data features the KERN Revamp
design draws and feature 008 deferred: go-live scheduling, the activity log, undo after deleting,
the example draft, a stored document order with drag reordering, the publish and deactivation
dates, a draft row's step on the overview, and bulk delete on the overview. The frames are listed
in specs/008-kern-revamp-redesign/deferred.md, group A, with their node ids; the frontend ports
them as drawn, and each item adds its backend field or endpoint, its api-types mirror and its MCP
tool where agents need it. All the things not mentioned (pdf, email, ...) are out of scope"

## Context

Spec 008 ported the redesigned management UI ("KERN Revamp", Figma "Middleware – V5", file
`s8mU9oJDq3411e8bxMjQO9`) and changed nothing outside the frontend: whatever the design draws
that needs data the middleware does not keep was left out and recorded in
`specs/008-kern-revamp-redesign/deferred.md` (spec 008, Clarification 2026-11-06 #1). This
feature builds eight items of that file's group A and one of its group C, the data groups
(Clarification 2026-11-10 #6), each with the data it needs. Spec 008's screens and behaviour and
spec 009's two languages are the baseline and are taken as complete.

| # | Item (id in `deferred.md`) | What the middleware lacks today | Baseline it supersedes |
|---|---|---|---|
| 1 | Go-live scheduling (F1) | a start date for a published connection, and something that makes it active on that date | 002-S5.7, 002-S5.8, 002-S6.7 (publishing goes live at once); spec 008's F1 decision |
| 2 | Status dates (Q37 (c)) | when a connection became active and when it was deactivated | 005-S3.3, spec 008 FR-048 ("Edited <date>" on every row, no date pill), spec 008 #52 (the ⋯ menu's place) |
| 3 | A draft row's step (F71) | the draft's step in the overview's list | spec 008 #62 (the step is left out) |
| 4 | The activity log (F2) | a record of who did what to a connection | 002-S6.9, spec 008's F2 decision (no Activity card) |
| 5 | Undo after deleting (F4) | a deletion that can be taken back | 001-S6.11, 001-S6.12 (deletion is permanent); spec 008's F4 decision |
| 6 | Bulk delete on the overview (Q11) | deleting several connections in one step | spec 008 FR-028 (row delete only) |
| 7 | A stored document order with drag reordering (Q14 (e)) | the order of a connection's documents | 002-S1, spec 008 FR-031j (catalog order, no reordering) |
| 8 | The example draft (Q9 (b)) | a draft that knows it is the example | spec 008 FR-027 (the welcome page without the entry) |
| 9 | Data groups (Q14 (f), group C; Clarification 2026-11-10 #6) | the group each data item of a document belongs to, in the catalog | 002-S1, spec 008 FR-031 (data items in catalog order without group rows) |

**The design decides the screens.** The frames are listed per item in `deferred.md`, group A,
and are ported as drawn, wording included, under spec 008's rules (its sources table, "Figma
decides wording", its verification tables). The frames this spec quotes, with the nodes found
when they were read for it on 2026-11-10 (some node ids in `deferred.md` point at a neighbouring
frame; these are the ones that hold the text):

| Item | Frames (node ids) |
|---|---|
| Scheduling | publish dialog P1 `6376:25342`, P1b `6383:66097` (dialog `6383:66119`), P1c `6635:36242` (error); scheduled details `7246:52715`, `7246:53289`, `7246:53937`, `7246:54565`, P11 `6396:48548`; ⋯ menu P14 `6417:30900` (`6417:31045`); "Change start date" P12 `6396:48739` (dialog `6396:48860`); reactivate P16b `7173:52874` (dialog `7173:52959`); editing a scheduled connection E6 `7114:49683`; overview row `6739:40517`; deleting a scheduled connection `6872:45855` (dialog `6872:45929`) |
| Status dates | details pills `7355:61158`, `7355:61822` (active), `7355:60692` (scheduled), `7355:60885`, `7355:61546` (deactivated), `7362:54712` (draft); overview rows in `6699:44240` |
| Draft step | `6699:48031` in `6699:47943` |
| Activity | open: P10 `6396:48278` (rows `6396:48527`), scheduled `7246:53937` (rows `7246:54525`), deactivated `7246:56374` (rows `7246:56965`); closed `6809:46582`; draft `7362:54691` |
| Undo | P18 `6699:48039` (toast `6699:48098`) |
| Bulk delete | selection bar `6699:45199` (`6699:45206`); dialog `6699:45259` (`6699:45320`) |
| Document order | R1 `7298:63317`, R2 `7298:63736`, R3 `7298:64157`; build notes 19 and 37 (`7370:55193`) |
| Example | section `7321:52067`: entry 1b `6699:44481`, dialog 1g `6793:47676` (`6793:47710`), step 1 `6793:47711`, rules `7344:96387`, `7344:96414`, `7344:96442`, the list `6793:47768`; publish dialog `7137:50083` (`7137:50210`) |
| Data groups | build note 20 `6711:39378`; the data item panel in `7290:61214`–`7290:61255`, `7290:61956` (mixed state), `7290:62357`, `7290:62967`, `7298:61791`, `7298:62400`–`7298:62447`, `7298:62579`–`7298:62613`, `7298:63343`–`7298:63380`, `7298:64184`–`7298:64220`; the edit flow `7296:52340` (nodes as the Figma audit of 2026-11-10 lists them) |

**What the design leaves undrawn** (a result page, a toast, a state, a text for a second case) is
built from spec 008's patterns for undrawn states, with copy written in this feature in the
drawn style and recorded in its contracts. Each such place is named where it occurs below. The
Figma audit of 2026-11-10 (`figma-audit/report.md`) listed these places and where the frames and
this spec disagree; Clarifications 2026-11-10 #3 to #26 settle them, and none waits for a frame.
The audit's remap of the same day, run against the spec with those Clarifications, asked eleven
further questions; Clarifications 2026-11-10 #27 to #37 settle them.

## Clarifications

### Session 2026-11-10

- Q: The design also draws a start date for a connection that is already active, in "Change start
  date" ("also after 'Now'") and in "Save changes?" ("Citizens get the new version from the time
  you choose."). How far does scheduling go for an active connection? → A: "Change start date"
  only. An active connection can be given a later start date: it is scheduled from then on, its
  links stop until the date as after a deactivation, and requests in progress are cancelled,
  since F13 stays out of scope. "Save changes?" keeps taking effect at once: saved changes that
  wait for a date would need a second version beside the live one, which is what the excluded
  item F5 needed, and the design draws no screen for it (FR-009).
- Q: An approved request of an agent publishes or reactivates at once today. May agents ask for a
  start date? → A: Yes, with approval. A request to publish or to reactivate may name a start
  date, and agents with "Read, edit drafts and manage live connections" may ask to change a
  connection's start date; the approval page shows the date, and approving schedules it (FR-065).
- Q: The edit flow's frames keep a live connection's pending changes as a draft ("Draft changes",
  "Keep draft and exit", "Changes not published"; F5), which this spec excludes. Keep it
  excluded, or bring F5 into scope? (Figma audit Q1, C1) → A: Keep it excluded; Figma changes.
  The header shows only the status pill: "Active", or "Scheduled · <date>" as E6 draws it (U99
  `7114:49835`). The footer is "Back · Discard changes · <next step> · Save". Konnekt and "Your
  connections" open E5b "Save your changes?" ("If you leave now, your changes are lost. Save
  them, or discard them and keep the active version.", with "Discard changes" and "Save")
  instead of E5a. There is no "Draft kept" toast, and rows never show "Changes not published".
  Figma removes "Draft changes", "Keep draft and exit", E5a's annotation and note 14's sentence.
  Surfaces: the edit flow's header (U98 `6730:39124` (E2); U99 `6890:46199` (E5a), `7173:52812`
  (E5b); U100 `7173:52748` (E7); note 25, U05 `6730:40340`, item 30); its footer (note 25, item
  29, and note 30, U06 `7127:49610`; the frames E1–E7 already draw it without "Keep draft and
  exit": U98 `6731:39850`, `7296:52389`, `6730:39145`; U99 `6890:46220`, `7114:49808`; U100
  `7173:52769`); leaving the edit flow (E5a, U99 `6890:46197`; note 25, item 37; note 30; E5b,
  U99 `7173:52836`); the toast "Draft kept. Your changes take effect when you save them." (note
  25, item 33); the overview rows' "Changes not published" (note 14, U03 `6703:39311`). The
  hidden "badge-small (Live, replaced)" layers (U11, U12, U13, U15) stay hidden (FR-076).
- Q: "Download PDF" (Q37 (b)) is drawn in the details' Summary card for every status, and this
  spec excludes it. Not built, or bring it into scope? (Figma audit Q2, C2) → A: Not built
  (FR-070). The Summary header shows "Summary", the count line and "View summary" / "Hide
  summary". Figma hides the button and note 36's PDF sentence. Surfaces: the details' Summary
  card at every node the audit lists: active (U58 `6530:40742`, U63 `7112:48928`, U80
  `6396:47755`, U81 `6809:46580`, U82 `6396:48196`, U86 `6396:48385`, U87 `6396:48846`, U88
  `6417:30965`, U90 `6417:31518`, U91 `7203:50536`, `7246:51508`, U92 `7246:52087`,
  `7246:52713`, U99 `6730:39800`); scheduled (U86 `6396:48655`, U94 `7246:52805`, `7246:53935`,
  U95 `7246:54516`, `7246:55144`); deactivated (U89 `6417:31343`, U96 `7246:55236`,
  `7246:56372`, U97 `7246:56956`, `7246:57587`); draft (U93 `7362:54813`, `7362:55045`); note
  36 (U07 `7370:55192`) (FR-076).
- Q: The deactivation toast offers "Undo" (F54), and note 24 promises "Undo" for every
  destructive action. Keep F54 excluded, or bring it in? (Figma audit Q3, C3) → A: Keep it
  excluded. The toast reads "Connection deactivated." (success type, note 24) without "Undo".
  Only deleting a connection (FR-033), removing a document (FR-045) and the rules step's
  existing undos offer "Undo". Figma trims note 24's list to "deleted, removed". Unlinking stays
  deferred (note 37). Surfaces: the toasts P16 (U89 `6417:31447`) and note 24 (U05
  `6720:39042`, items 21 and 24); not affected are the deletion toast (U90 `6699:48098`) and the
  document removal toast (U24 `7298:62627`) (FR-076).
- Q: The Documents frames show "coming soon" documents and data groups, which look like the
  excluded "upcoming documents" and "field groups". Are they excluded, already built by spec
  008, or to be adopted now? (Figma audit Q4, C4, C5) → A: Upcoming documents: excluded. The Add
  document card lists only the wallet's documents ("Available", "Added") with no hint line. The
  all-added state reads "Everything in the wallet is added.", and search finds wallet documents
  only. Surfaces: the Add document card (U21 `7295:61184` (A6), U22 `7294:61852` (A8), note 19,
  U04 `6711:39375`) (FR-076). Data groups (formerly referred to as "field groups"; `deferred.md`,
  group C, Q14 (f)): adopt now, as a ninth item of this feature. Data items sit under the group
  headings Name, Birth, Address, Document, Licence, Appearance and Other details, each with a
  group checkbox that can show a mixed state, in catalog order inside each group; the grouping
  comes from the catalog, with its mirror for the frontend. Surfaces: the data item panel of the
  create and edit flows (U21 `7290:61214`–`7290:61255`, `7290:61956`; U22 `7290:62357`,
  `7290:62967`; U23 `7298:61791`; U24 `7298:62400`–`7298:62447`, `7298:62579`–`7298:62613`; U27
  `7298:63343`–`7298:63380`; U28 `7298:64184`–`7298:64220`; U98 `7296:52340`; note 20, U04
  `6711:39378`). Not affected: the details' Summary lists data items flat (U82 `6396:48199`,
  U91 `7203:50539`). Asked in addition, because the grouping is new data: do agents get the
  groups? Yes: agents' read of the catalog carries each data item's group, the guidance
  describes it in the same change, and agents still choose data items one by one (FR-077 to
  FR-080).
- Q: "Generate all" is new in the design's v9 (note 23), and this spec excludes "persona
  generation". Is it excluded, or part of spec 004's regenerate? (Figma audit Q5, C6) → A: Both
  "Generate all" and "Generate again" are spec 004's regenerate (one applicant or all), which
  the product already has: "Generate all" is built as drawn, asking first like "Generate again"
  (FR-074). The excluded "persona generation" is `deferred.md`'s F11, persona generation that
  makes every rule testable ("Couldn't be checked" stays). Surfaces: the test step's applicants
  row (U65 `7344:96178`, `7344:96189`; U73 `7344:96343`); the applicant data's head (U65
  `7057:58771`, `7057:59185`; U73 `7058:62054`; U99 `7114:49742` (E6)); note 23 (U05
  `6716:41045`), note 29 (U06 `7058:63148`), note 30 (U06 `7127:49610`). The Test section (U66
  to U72, U74) was not audited.
- Q: The test step shows a success message for an applicant who meets every rule (Q31 (a)),
  which this spec excludes. Keep it excluded, or adopt it? (Figma audit Q6, C7) → A: Keep it
  excluded. The result reads "Result: meets the rules" with the list "Rules Anna meets", and
  there is no "Message Anna reads" box. Surfaces: the test result for a met applicant (U65
  `7057:59533`–`7057:59535` and `7057:59239`); note 29 (U06 `7058:63148`). The Test section (U66
  to U72) was not audited (FR-076).
- Q: A group's ⋯ menu offers "Group with other rules", which groups a group and which this spec
  excludes. Keep it excluded, or adopt it? (Figma audit Q7, C8) → A: Keep it excluded. In a
  variant, a group's menu shows "Add message", "Reset to Standard", a divider and "Remove from
  Ambulance". Surfaces: the rules step's group menu (U58 `6522:33026`). The Rules sections U29
  to U57, U59 to U62 and U64 were not audited and may draw the same entry; it is not built
  there either (FR-076).
- Q: The account menu shows an email line (Q13), which this spec excludes. Keep it excluded, or
  adopt it? (Figma audit Q8, C9) → A: Keep it excluded. The menu shows the name ("Laura
  Weber"), a divider and "Log out". Surfaces: the user menu (U13 `6699:44358`); the menu button
  in every header is unchanged (FR-076).
- Q: Six states of go-live scheduling have no frame. Build them from the spec on the nearest
  frame, or have the designer draw them first? (Figma audit Q9, S1 to S5, P5) → A: Build them
  without frames, with the spec's wording. The day change (FR-003): P1c's error (U76
  `6635:36265`) also shows when the day changed while the dialog was open, in the publish dialog
  and in "Change start date" (U87 `6396:48860`) and "Activate again". "Now" on a scheduled
  connection (FR-008): P12 (U87 `6396:48860`) with "Now" selected; "Save date" makes it active
  at once, and the details then show the active band with "Active since <date>, <time>" (U80
  `7355:61155`). "Activate again" on a date (FR-011): P16b (U89 `7173:52959`) with "On a date",
  the date field under the radios as in P1b (U75 `6383:66119`), the hint written in this feature
  and the button "Schedule". Deactivating a scheduled connection (FR-012): P15 (U88
  `6417:31206`) with this feature's sentence for a connection that was never active. Saving a
  scheduled connection (FR-013): E3 (U98 `6730:39464`) with this feature's sentence and no
  "Active from". The toast after a start date change (FR-008): a success toast (note 24, U05
  `6720:39042`), placed like P16's toast (U89 `6417:31447`), reading "Start date saved.".
  Clarification #1 is kept.
- Q: What do the dates of pre-existing and reactivated connections read, and what does a draft
  without a recorded step read? (Figma audit Q10, P8, S6, S7) → A: (1) A draft without a
  recorded step reads "Edited <date>" alone, as U17 draws it (the draft row with no step, U17
  `6699:47974`). (2) Build from the spec; nothing visible changes: rows read "Published <stored
  publication date>" or "Deactivated <last change time>", pills read "Active since
  <publication>" (FR-021), and reactivation moves only "Active since" (User Story 2, scenario
  6). Surfaces: the overview's date column (U11 to U18, U90); the details' date pill (U80
  `7355:61155` and the other details units) (FR-019, FR-021).
- Q: Activity entries and states that are not drawn: build them from the spec, or have them
  drawn first? (Figma audit Q11, P6, S8 to S12) → A: Build them without frames, using the drawn
  row (date and time · event · person) and the spec's wording in the same style (FR-025): the
  scheduling entry with its date; name or description changed, became active on the date with
  no person, activated again, deleted, restored; the team member together with the agent, the
  approver together with the asking agent, and middleware entries without a person; a
  pre-existing connection's "Created" and "Published" without a person, and a closed line with
  the time alone; the open card's list scrolls down to the oldest entry; the card is readable
  for every team member. Surfaces: the open card (U86 `6396:48527`; U92 `7246:52096`; U95
  `7246:54525`–`7246:54545`; U97 `7246:56965`); the closed line (U80 `6396:47761`; U89
  `6417:31345`; U96 `7246:55328`; U97 `7246:57191`) (FR-025, FR-027, FR-031, FR-032).
- Q: The undo and restore states are not drawn: build them from P18 and 1b, or have them drawn
  first? (Figma audit Q12, S13 to S16) → A: Build them without frames. After "Undo", the row
  comes back in the list without a reload and a polite announcement says so: "“<name>”
  restored.". "Undo" after the restore time, or a second time, changes nothing, and the toast
  says so: "“<name>” can no longer be restored.". Deleting the last connection shows 1b with
  the toast, and "Undo" brings back the overview with the row. A replaced toast or a left page
  leaves the deletion standing. Surfaces: the overview and the toast, P18 (U90 `6699:48039`,
  `6699:48098`); the welcome page, 1b (U11 `6699:44481`). How long the toast stays is
  Clarification #22 (FR-034, FR-036, FR-037).
- Q: The bulk-delete outcomes are not drawn: build them from frames 8, 9 and P18, or have them
  drawn first? (Figma audit Q13, S17 to S20) → A: Build them without frames. The count is
  announced when it changes. When a selected connection vanished or changed, nothing is deleted
  and the dialog names it: "Nothing was deleted: “<name>” was deleted or changed in the
  meantime.". After deletion, the rows are gone, the selection clears, the toolbar comes back
  and a toast shows the count with "Undo": "<n> connections deleted.". Each deletion appears in
  the connection's activity. A selected row that vanishes on refresh leaves the selection. A
  long list scrolls inside the dialog while its buttons stay in view. Surfaces: the selection
  bar (U15 `6699:45206`); the bulk delete dialog (U15 `6699:45320`); the toast (U90
  `6699:48098`) (FR-039, FR-043, FR-044).
- Q: Reordering without dragging (WCAG 2.5.7), and in the edit flow: build from the spec, or
  have it drawn first? (Figma audit Q14, P4, S21, S22) → A: Build it without frames. A ⋯ menu
  button on each document row (spec 008's menu pattern) holds "Move up" and "Move down". The
  first row has no "Move up" and the last no "Move down" (FR-047). With one document there is no
  menu (as A5 shows, U21 `7290:61204`). Focus stays on the moved row, and the move is announced:
  "“<document>” moved to position <n> of <m>.". Escape, or a drop outside the list, restores
  the order. E1b gets the same drag and menu (FR-049; User Story 6, scenario 5). Surfaces: the
  document rows of the create flow (U22 `7290:62348`, `7290:62349`; U23 `7298:61782`,
  `7298:61783`; U24 `7298:62391`, `7298:62392`; U27; U28 `7298:64174`, `7298:64175`); the
  document rows of the edit flow (E1b, U98 `7298:63260`); note 19 (U04 `6711:39375`), note 23
  (U05 `6716:41045`), note 37 (U08 `7370:55195`). The user then decided for the session: where
  a question's options are to build from the spec or to wait for the design, the answer is to
  build from the spec; Clarifications #17 to #19 follow from that.
- Q: The approval page is not in the Figma file. Build its new content on spec 007's existing
  page, or have the designer draw it? (Figma audit Q15, S23, S26, S27) → A: Build it on the
  existing page with the spec's wording: the stored document order (FR-050); "This is still the
  example. Check that the name, documents and rules fit your service." (FR-060); "Active from
  <date>", or that the connection goes live at once (FR-065); FR-065's sentence for an active
  connection that gets a later date, written in this feature; the refusal reasons (FR-065,
  FR-066); deactivating and deleting a scheduled connection (FR-066). Surfaces: the approval
  page, which no unit of the file draws. Clarification #2 is kept.
- Q: The example's banner on the documents and test steps, and the example after publishing and
  across languages: build from 1h, or have them drawn first? (Figma audit Q16, P7, S24, S25) →
  A: Build them without frames. The "Rules/Findings banner" instance from 1h reads "This is an
  example. Change anything to see how it works." on the documents step and the test step; on
  the test step it sits above the variant tabs, as on the rules step. There is no banner and no
  publish line after publishing. The example's texts are created in the current language.
  Surfaces: the example banner (U18 `6798:122695` (1h), `7344:96396` (1i), `7344:96451`
  (1i-c)); the example's test step, 16b (U73 `7137:50086`); the example's documents step, which
  is not drawn. The Test frames U66 to U72 and U74 were not audited (FR-058, FR-059, FR-061).
- Q: No frame shows the new controls at 320 px and 200 % zoom. Build them by the narrow rules,
  or have them drawn first? (Figma audit Q17, S28) → A: Build them without frames, following the
  `narrow:` variant and `docs/KERN-DESIGN-SYSTEM.md` §3.1. Surfaces: the date pill with its ⋯
  (U80 `7355:61155`); the "Active from" group and date field (U75 `6383:66119`); the selection
  bar (U15 `6699:45206`) and the bulk dialog (U15 `6699:45320`); the Activity card (U92
  `7246:52096`); the reorder menu (Clarification #16) (FR-072).
- Q: The overview banner for unsaved work on this device (note 34) is a change of the design's
  v9 that no requirement covers. Keep spec 005's current handling, or build 1m and 1n now?
  (Figma audit Q18, B1) → A: Build them as drawn. One connection: "Unsaved changes in
  “<name>”", "Saved only on this device on <date>, <time>, when the page closed. Nobody else
  can see them.", "Discard", "Resume editing". Several: "Unsaved changes in <n> connections",
  "Saved only on this device when the page closed. Nobody else can see them.", and one line
  each with "Edited · <date>, <time>" or "New, never saved · <date>, <time>". The banner stays
  above the selection bar while rows are selected. Device-only connections are neither counted
  nor selectable. This needs German copy (FR-071) and a new requirement (FR-081). Surfaces: the
  overview (U16 `7362:54550`–`7362:54557`, `7362:54621`–`7362:54634`); note 34 (U07
  `7370:55186`), note 16 (U04 `6703:39317`), note 23 (U05 `6716:41045`). Found when the question
  was asked: the product already shows a banner for local drafts with this wording in both
  languages (spec 008), so the build checks it against 1m and 1n, changes what differs and
  adds the two rules for the selection.
- Q: Show rule findings in the published Summary (P9d, note 26), or keep spec 003's FR-020?
  (Figma audit Q19, B2) → A: Keep spec 003's FR-020 (FR-074). The Summary shows no findings, and
  the tab's ⓘ only shows the variant's description, as in 1i-b (U18 `7344:96441`). Figma drops
  P9d and note 26's clause about the published summary. Surfaces: the rule tabs of the details'
  Summary (U94 `7246:52833`; U91 `7203:50562`; U93 `7362:54840`; U96 `7246:55263`); note 26 (U06
  `6760:48852`). P9d (U85 `6760:48437`) was not audited (FR-076).
- Q: Does the deletion toast close after 5 s, or keep "Undo" until it is used, dismissed or
  replaced? (Figma audit Q20, P1) → A: It closes by itself, as note 30 says of every toast, so
  a deletion can be undone only for as long as its toast shows. Asked in addition, because the
  product's toasts without an action close after 6 s today (spec 008, from the design's
  "Rules/Toast" component) and its toasts with an action stay until used: the time is 6 s, not
  note 30's 5 s, and it holds for every toast, with or without an action: the deletion toasts,
  the document removal's "Undo", "Try again" after a failed save and the rules step's undos.
  The time runs only while the pointer and the keyboard focus are not on the toast. FR-036 and
  User Story 4, scenario 4, change accordingly; FR-036's 5 minutes stay as the server's limit
  and matter only while a toast is held open. This changes spec 008's rule that a toast with an
  action stays until it is used or dismissed, is an exception to FR-074, and weakens FR-072
  (timing). Figma changes the "5 s" of note 30 and of A12 to 6 s. Surfaces: the deletion toast
  (U90 `6699:48098`) and the bulk toast; note 30 (U06 `7127:49610`), A12 (U24 `7298:62552`);
  the other toasts (U24 `7298:62627`, U99 `6730:39810`, U17 `6699:48002`) (FR-036, FR-082).
- Q: Should failures show the error ID, as spec 008 does, and does "Try again" keep the chosen
  date? (Figma audit Q21, P2) → A: Spec 008. A server failure shows spec 008's failure alert
  with its error ID. P5's sentence "Couldn’t publish, so nothing has changed. Check your
  internet connection and try again." shows only when no answer came. The alert stays slim but
  may wrap to fit the error ID. "Try again" repeats the same choice: "Now", or "On a date" with
  the entered date. Surfaces: the failed states, P5 (U79 `6376:27178`), note 7 (U02
  `6637:36658`), the failures of "Schedule", "Activate again" and "Save date" (FR-014, not
  drawn) and the bulk dialog (FR-043).
- Q: What wording do the edit dialogs use for a scheduled connection? (Figma audit Q22, P3) → A:
  Scheduled wording. The entry's title: "Edit this scheduled connection?" (the row's "Edit
  “<name>”?" stays). The entry's body: "Your changes only take effect when you save them. Saved
  changes become active on <date>.". The step-1 note: "Scheduled. Your changes become active on
  <date> once you save them.". The leave dialog: "If you leave now, your changes are lost. Save
  them, or discard them and keep the scheduled version.". The discard dialog: "The connection
  goes back to the version that becomes active on <date>. Citizens aren't affected.". Each text
  also needs German (FR-071). Surfaces: the entry confirmation (U87 `6396:49030`, details, and
  U15 `6699:47905`, row); the step-1 note (U98 `6731:39846`); the leave dialog (U99
  `7173:52836`); the discard dialog (U100 `7173:52772`) (FR-013).
- Q: Under reduced motion, should dragging and reordering keep fades (note 31) or have no
  transitions? (Figma audit Q23, P9) → A: No transitions, as the edge case "Reduced motion"
  says. With reduced motion, dragging and reordering have no transitions, and the drop just
  updates the list. Everything else follows spec 008's rule. Surfaces: the documents step's
  reorder (U27, U28); note 31 (U06 `7137:50569`).
- Q: Does the page language follow the chosen language, or stay "en" as note 1 says?
  (Figma audit Q24, P10) → A: `lang` follows the chosen language ("en" or "de", spec 009, as
  built). Note 1's `data-kern-theme="light"` and color-scheme meta stay. Surfaces: every page's
  `<html>` element, note 1 (U01 `6637:36640`) (FR-071).
- Q: Build note 16 says the welcome page has "one Create connection button", while FR-053 and
  frames 1b and 1g put "Start from an example" beside it. Keep FR-053, or follow note 16?
  (Figma audit remap, Q1, Conflict #1) → A: Keep FR-053. The welcome page shows "Create
  connection →" (primary) and "Start from an example" (secondary) beside it, as 1g draws. Figma
  corrects note 16 to "Create connection and Start from an example". Nothing else changes, and
  the overview's footers stay "Create connection" only. Surfaces: the welcome page, 1b (U11
  `6699:44508`, `6793:47828`, whose label "Start with an example" is a slip) and 1g (U18
  `6793:47705`, `6793:47706`); the example dialog (U18 `6793:47710`); note 16 (U04
  `6703:39317`), note 28 (U06 `6791:46863`, item 16), note 31 (U06 `7137:50569`, items 48 and
  52) (FR-053).
- Q: What is the "1" beside the example's variant tabs (1i, 1i-c; component "Rules/Variant tab ·
  fixes")? A findings count would contradict FR-056. (Figma audit remap, Q2, Conflict #2) → A:
  It is the tab's ⓘ, not a count. The example's tabs show the ⓘ with the variant's description,
  as 1i-b (U18 `7344:96441`) and the Summary's tabs do. Figma removes the stray "1". Nothing is
  built on the example's tabs, and Clarification #21 is kept. Surfaces: the example's rules
  step, 1i (U18 `7344:96398`) and 1i-c (U18 `7344:96454`); the same component on the Summary's
  tab (U94 `7246:52833`, FR-076); the tab icons of note 26 (U06 `6760:48852`, item 4) and note
  35 (U07 `7370:55189`, item 15) (FR-056).
- Q: 16b shows a changed example ("School transport", Standard Rules 03–04) behind the dialog
  for the unchanged example. Is that a design slip? (Figma audit remap, Q3, Conflict #3) → A:
  Yes, a slip. The unchanged example is FR-055's: Standard with Rules 01–02, and Ambulance with
  Rules 01–02 changed. The publish summary lists "Standard · 2 rules" and "Ambulance · 2
  rules". The example line shows only while nothing has changed (FR-060). Figma redraws 16b's
  background from 1i and adds Ambulance to the summary. Surfaces: the test step behind the
  dialog (U73 `7137:50091`, tabs Standard, Ambulance, School transport; `7137:50181`, Rules
  01–04); the publish dialog, 16b (U73 `7137:50210`, "Standard · 2 rules" and the example
  line) and 16 (U73 `7058:62120`); the example, 1i and 1i-c (U18 `7344:96406`–`7344:96465`);
  the example dialog's body "…with 2 documents and 2 rules" (U18 `6793:47710`) (FR-055,
  FR-060).
- Q: V-Draft · S2 draws view-only draft details without "Edit" ("needs roles"), and roles are
  out of scope. Build it, or not? (Figma audit remap, Q4, Conflict #4) → A: Not built. Every
  team member sees "Edit connection" on a draft's details (V-Draft · S). S2 stays a design for
  a later roles feature, and Figma keeps it marked out of scope. No requirement changes.
  Surfaces: the draft's details (U93 `7362:54923` (S2), `7362:54920` ("Edit connection" in S),
  `7362:55152` (S2's hidden Edit)); note 12 (U03 `6648:42016`), note 36 (U07 `7370:55192`),
  note 37 (U08 `7370:55195`) (FR-076).
- Q: The build notes and frames restate or change behaviour of specs 001 to 009 outside the
  nine items (the audit's sub-items a to n). Keep the product as built, or adopt the drawings?
  (Figma audit remap, Q5, Behavioural #1) → A: Keep the product as built. Sub-items a to n stay
  as specs 001 to 009 built them (FR-074), and no requirement is added. Where a frame of the
  nine items shows them, the build ports the layout and leaves the behaviour. Where a note
  disagrees with the product, the product stays: whether the documents list shows "x of y"
  (d); the remove dialog that names the rules (e); note 17's active sentence (l); note 23's
  scope, "v9 builds every change since v8" (n). Items already settled are not reopened:
  Clarifications #3 (note 25's draft path), #5 (note 24) and #25 (note 31's reduced motion).
  Surfaces, by sub-item: (a) menus and popups, notes 3 and 31 (U01 `6637:36646`; U06
  `7137:50569`, item 53; U07 `7370:55183`, item 11); (b) shell and layout, notes 2, 4, 5, 15,
  30 and 31 (U01 `6637:36649`, `6637:36652`; U02 `6637:36655`; U06 `7127:49610`, items 34, 45
  and 47, and `7137:50569`, item 54); (c) overview rows and search, note 16 (U04 `6703:39317`;
  U11 `6699:44519`, `6699:44521`, `6699:44580`, `6699:44629`, `6699:44631`; U12 `6699:44931`,
  `7173:52294`; U13 `7366:55201`; U17 `6699:48028`; U05 `6716:41045`, item 19; the hidden
  "View (disabled…)" layers, U11 `6699:44552`, U12 `6699:44942`); (d) create and documents
  steps, notes 18, 19 and 28 (U04 `6703:39323`, `6711:39375`; U05 `6716:41042`, items 5 and 6;
  U06 `6791:46863`, item 15); (e) removing a document, A10 and A11 (U23 `7298:62322`; U24
  `7298:62500`); (f) rules step, notes 21, 26 and 28 and 10.9 to 10.11 (U05 `6711:39381`; U06
  `6760:48852`, `6791:46863`; U58 `6522:32982`–`6522:33103`); (g) test step, note 29 (U06
  `7058:63148`; U65 `7057:58754`, `7057:59073`; U73 `7058:62040`); (h) publish dialog, P2, P2b
  and P5 (U77 `6376:26181`, `6760:47979`; U73 `7058:62120`; U79 `6376:27178`); (i) edit flow,
  note 25 (U05 `6730:40340`; U98 `6731:39827`; U99 `6730:39810`); (j) leaving and logging out,
  Start 3 and notes 30 and 31 (U17 `6408:72919`, `6890:46052`, `6401:71899`, `6699:48002`; U06
  `7127:49610`, items 31 and 32, and `7137:50569`, item 51); (k) details, notes 33 and 36 (U07
  `7370:55183`, `7370:55192`; U89 `6417:31309`, `6417:31325`, `6417:31331`, `6417:31337`; U96
  `7246:56338`); (l) delete and deactivate dialogs, note 17, frames 3 and 4, P15 (U04
  `6703:39320`; U14 `6699:44419`, `6699:44480`; U90 `6417:31599`; U88 `6417:31206`); (m) toast
  types, note 24 (U05 `6720:39042`); (n) note 23's scope (U05 `6716:41045`) (FR-070, FR-074).
- Q: Build the description tooltip (1k) in this feature, and how do keyboard and touch reach it
  (note 37 #2)? (Figma audit remap, Q6, Behavioural #2) → A: Keep it as built; nothing is built
  in this feature (FR-074). Found when the question was asked: spec 008 already built 1k's
  tooltip (its FR-051 and FR-052). A cut description shows its full text in the tooltip on
  hover, while the row's name has the keyboard focus, and after a tap on touch screens; Escape
  or a tap elsewhere closes it; there is no tooltip when the text fits. Neither of the audit's
  options is taken as worded: (a) would remove the tap, and (b) would leave the note open.
  Figma closes note 37 #2 with the built rule. Surfaces: the overview rows with a cut
  description (U13 `6739:40596`; U14 `7173:52310`; U17 `6699:48024`; U18 `6793:47800`); 1k (U13
  `7366:55201`, `7366:55276`); note 16 (U04 `6703:39317`), note 37 (U08 `7370:55195`)
  (FR-074).
- Q: When does "Leave this connection?" (frame 2) show, and what does "Discard connection" do,
  given that 6a saves silently on the same click? (Figma audit remap, Q7, Behavioural #3) → A:
  Keep spec 008's rule; nothing is built in this feature (FR-074). Found when the question was
  asked: spec 008 already settled the two frames (its Clarification 2026-11-07 #8, its FR-026)
  and built frame 2. In a new connection's or a stored draft's flow, the product name and "Your
  connections" open "Leave this connection?" on every step: "If you leave now, you lose all
  progress. Save it to continue later, or discard the connection.", with "Discard connection"
  and "Save progress". "Save progress" saves as Save and exit does (frames 6 and 7 follow; a
  missing name keeps the team member in the flow). "Discard connection" leaves without saving
  and discards the flow's local draft (spec 005): a new connection is dropped, a stored draft
  stays as it was last saved, nothing stored is deleted, and there is no toast and no "Undo".
  6a's silent save is not built. None of the audit's options is taken: (a) and (b) would
  change the product, and (c) would add a delete path to FR-033. Figma corrects 6a and the
  notes that describe the silent save (note 30, item 31; note 31, item 51). The edit flow's E5b
  (Clarification #3) is not affected. Surfaces: the create flow's header links (U17
  `7173:52656` and `7173:52682` (frame 2), `6890:46052` (6a), `6401:71899` (6, "Saving your
  draft…"), `6699:48002` (7, "Draft saved. You can pick it up any time.")); note 18 (U04
  `6703:39323`, "with an empty name it just leaves"), note 30 (U06 `7127:49610`, item 31), note
  31 (U06 `7137:50569`, item 51) (FR-033, FR-074).
- Q: Does the Links card follow the one-open-card rule on the page reached after publishing or
  saving, where P9 and P10 keep it shown while Summary or Activity is open? (Figma audit remap,
  Q8, Partial #1) → A: Yes, FR-022 holds everywhere. Links, Summary and Activity form one
  accordion on every details page. After publishing or saving, the page lands with Links open
  (P7, E4), and opening Summary or Activity closes it with "View links". Figma redraws P9 and
  P10 with Links closed. Surfaces: the details reached after publishing or saving (P7, U80
  `6396:47708`; P8, U81 `6809:46533`; P9, U82 `6396:47966`; P10, U86 `6396:48338`,
  `6396:48520`; P12 to P17, U87 to U90; E4, U99 `6730:39754`); the details reached from View
  (U91 `7203:50843`, `7246:51442`; U92 `7246:51549`; U94 `7246:52751`, `7246:53864`; U95
  `7246:53973`; U96 `7246:55182`, `7246:56300`; U97 `7246:56410`); note 30 (U06 `7127:49610`,
  items 36, 46 and 47) (FR-022).
- Q: Which order and counts do the Driving licence's data groups follow: the frames' (Name,
  Birth, Address, Licence, Other details, Document, Appearance; Birth 5, Other details more
  than 1), or FR-077's, FR-078's and note 20's? (Figma audit remap, Q9, Partial #2) → A:
  FR-077, FR-078 and note 20 win. The groups stand in the order Name, Birth, Address, Document,
  Licence, Appearance, Other details (last), flowing down the three columns. Membership comes
  from the catalog, which must give Name 4, Birth 6, Address 5, Licence 3, Document 6,
  Appearance 6 and Other details 1. The frames' column placement is layout only; Figma redraws
  A7 to A12 and R1 to R3, adding Birth's sixth item and leaving one item in Other details. The
  order of Clarification #6 is kept. Surfaces: the data item panels (U21
  `7290:61214`–`7290:61255`, `7290:61956` (Personal ID); U22 `7290:62357`, `7290:62967`; U23
  `7298:61791`; U24 `7298:62402`–`7298:62447`, `7298:62579`–`7298:62613`; U27
  `7298:63343`–`7298:63380`; U28 `7298:64184`–`7298:64220`; U98 `7296:52340`); note 20 (U04
  `6711:39378`); the catalog and its mirror for the frontend (FR-078); agents' read of the
  catalog (FR-080) (FR-077, FR-078).
- Q: Does creating the example record a step? 1j draws its row as "Edited 23.10.2026" with no
  step. (Figma audit remap, Q10, Partial #3) → A: Yes. Creating the example records
  "Connection step", where it opens. The row reads "Edited <date> · Connection step", and
  agents read that step. Figma updates 1j. Clarification #12 is kept: only a draft with no
  recorded step reads "Edited <date>" alone. Surfaces: the overview rows, 1j (U18 `6793:47807`
  and `6793:47800`); the rows of FR-019 (U17 `6699:48024` ("· Rules step"), U17 `6699:47974`,
  U16 `7362:54583`, U90 `6699:48077` ("Edited 03.10.2026")); agents' read of a draft's step
  (FR-062) (FR-019, FR-055).
- Q: The local drafts banner's tertiary button: "Discard", as 1m and 1n draw, or "Discard
  changes", as note 34 and the layer names say? (Figma audit remap, Q11, Partial #4) → A:
  "Discard", as 1m and 1n draw and FR-081 says; Clarification #20's wording is kept. Figma
  updates note 34 and the layer names. Found when the question was asked: the product's banner
  already reads "Discard" ("Verwerfen" in German), and its accessible name adds the connection
  ("Discard changes in <name>"), which stays. The edit flow's "Discard changes" is another
  button and stays (FR-076). Surfaces: the overview's banner, 1m (U16 `7362:54556`) and 1n (U16
  `7362:54625`–`7362:54634`), and the product's existing banner in both languages (FR-081);
  note 34 (U07 `7370:55186`); not affected, the edit flow's "Discard changes" (U98
  `6731:39850`, `7296:52389`, `6730:39145`; U99 `6890:46220`, `7114:49808`, `7173:52836`; U100
  `7173:52769`, `7173:52772`) (FR-081).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Schedule when a connection goes live (Priority: P1)

A team member of DO.IT has finished a connection, but the serviceBW form that will use it starts
on a fixed day. Today publishing goes live at once, so they either publish early or come back on
the day. With this feature the publish dialog asks "Active from": "Now" or "On a date". With a
date, the connection is published and its links exist at once, so that the form can be prepared,
but citizens can use it only from that day on. Until then the connection is "Scheduled": the
overview, the header and the details say so and show the date, and the team member can move the
date, start it now, edit what will go live, or delete it. On the day, the connection becomes
active by itself. Activating a deactivated connection again offers the same choice.

**Why this priority**: it is the largest item and the only one that changes what citizens can do
and when. The other items show or tidy what is already there.

**Independent Test**: can be fully tested by publishing a draft with a date, checking the
scheduled state on the overview, the details and the links' answers, changing the date, letting
the date arrive, and repeating with "Activate again" on a deactivated connection.

**Acceptance Scenarios**:

1. **Given** the publish dialog, **When** it opens, **Then** it shows "Active from" with "Now"
   selected and "On a date", the sentence "When you publish, the connection is ready to be added
   to your services." and the button "Publish connection", and publishing with "Now" goes live at
   once, as today.
2. **Given** the publish dialog, **When** the team member chooses "On a date", **Then** the
   sentence reads "The connection becomes active on the date you choose. You get the links now,
   so your service can be ready in time.", a date field "DD.MM.YYYY" shows under the radios and
   the button reads "Schedule".
3. **Given** "On a date" with no date, with today's date, a past date or something that is no
   date, **When** the team member chooses "Schedule", **Then** the field turns to its error state,
   "Enter a date after today." shows under it and nothing is published.
4. **Given** "On a date" with 01.12.2026, **When** the team member chooses "Schedule", **Then**
   the details open with "Your connection is scheduled", the sub-line "The links are ready to be
   added to your service. They become active on the scheduled date below.", the date pill "Active
   from 01.12.2026, 00:00" and the header pill "Scheduled · 01.12.2026"; the links are shown and
   can be copied; and serviceBW gets the same answer from them as from a deactivated connection.
5. **Given** a scheduled connection, **When** the overview lists it, **Then** its row shows the
   status "Scheduled" and "Active from 01.12.2026", with View, Edit and Delete as on other rows.
6. **Given** a scheduled connection, **When** 01.12.2026 begins in Germany, **Then** within a
   minute, with nobody signed in, the connection is active: its links work, the details read
   "Your connection is active" with "Active since 01.12.2026, 00:00", and the overview shows
   "Active".
7. **Given** a scheduled connection's details, **When** the team member opens the ⋯ on the date
   pill and chooses "Change start date", **Then** a dialog asks "Choose when citizens can use
   this connection." with "Now" and "On a date", "Cancel" and "Save date"; a new date replaces
   the old one everywhere, and "Now" makes the connection active at once.
8. **Given** a deactivated connection, **When** the team member chooses "Activate again",
   **Then** "Activate this connection again?" shows the summary and "Active from"; "Now" with
   "Activate" works as today, and "On a date" schedules the connection for that day.
9. **Given** a scheduled connection, **When** the team member edits it and saves, **Then** the
   edit flow is the one of an active connection with the header pill "Scheduled · 01.12.2026",
   and what was saved is what becomes active on the date; the date stays.
10. **Given** a scheduled connection, **When** the team member chooses Delete, **Then** the
    dialog reads "This connection will be active from 01.12.2026. If you delete it, it won't
    become active and its links won't work."
11. **Given** an active connection, **When** the team member chooses "Change start date" and saves
    a later date, **Then** the connection is scheduled for that day, its links answer as a
    deactivated connection's until then, and requests in progress are cancelled, as the dialog
    said; "Save changes?" on an active connection offers no date and takes effect at once.

---

### User Story 2 - See when a connection was published, became active or was deactivated (Priority: P2)

A team member looks at the overview or at a connection's details and wants to know since when it
has been in its state. Today every row reads "Edited <date>", which says nothing about a
connection that has been live for months. With this feature each row carries the date of its
state ("Published 12.09.2026", "Deactivated 20.10.2026"), a draft's row says which step it was
left in ("Edited 28.10.2026 · Rules step"), and the details carry a date pill under the status
("Active since 23.10.2026, 14:32", "Deactivated since 24.10.2026, 10:05") that also holds the
connection's ⋯ menu, as the design draws it.

**Why this priority**: small, visible on the two most used screens, and the date pill is where
User Story 1's "Active from" and menu live.

**Independent Test**: can be fully tested by publishing, deactivating and reactivating a
connection and saving a draft in each step, and reading the overview rows and the details' date
pill after each.

**Acceptance Scenarios**:

1. **Given** an active connection published on 12.09.2026, **When** the overview lists it,
   **Then** its row reads "Published 12.09.2026".
2. **Given** a connection deactivated on 20.10.2026, **When** the overview lists it, **Then** its
   row reads "Deactivated 20.10.2026".
3. **Given** a draft last saved in the rules step on 28.10.2026, **When** the overview lists it,
   **Then** its row reads "Edited 28.10.2026 · Rules step"; a draft left in another step names
   that step.
4. **Given** an active connection, **When** its details open, **Then** a date pill under the
   status sentence reads "Active since 23.10.2026, 14:32" and carries the ⋯ menu; saving changes
   to the connection does not change the pill.
5. **Given** a deactivated connection, **When** its details open, **Then** the pill reads
   "Deactivated since 24.10.2026, 10:05" with its ⋯, and "Activate again" stands next to it.
6. **Given** a connection that was deactivated and activated again, **When** its details open,
   **Then** "Active since" shows the time it was activated again, and its row still reads
   "Published" with the date it was published.

---

### User Story 3 - See who did what to a connection (Priority: P3)

Several team members, and their agents, work on the same connections. When something is
different from what a team member remembers, they want to know who changed it and when. The
details get the "Activity" card the design draws: closed, it shows "Last edited by <name> ·
<date, time>" and "View activity"; open, it lists what happened to the connection, newest first,
each entry with its time, what happened and who did it.

**Why this priority**: it answers a question that otherwise needs asking around, and it makes
agents' work traceable; nothing else depends on it.

**Independent Test**: can be fully tested by creating a draft, changing its documents, adding a
variant, changing rules, publishing, deactivating and reactivating with two team members and an
agent, and reading the card after each step.

**Acceptance Scenarios**:

1. **Given** a connection's details, in any status, **When** they open, **Then** an "Activity"
   card shows under the Summary with "Last edited by <name> · 23.10.2026, 14:32" and "View
   activity".
2. **Given** the Activity card, **When** the team member chooses "View activity", **Then** the
   entries show newest first, each with its date and time, its event and the person, for
   example "Published", "Rules changed in Ambulance", "Variant added: Ambulance", "Documents
   changed", "Created"; the control reads "Hide activity", and the other open card closes.
3. **Given** a deactivated connection, **When** its details open, **Then** the card's line reads
   "Deactivated by <name> · 24.10.2026, 10:05" and the list's newest entry is "Deactivated".
4. **Given** an agent changed a draft's rules for a team member, **When** the card is opened,
   **Then** the entry names the team member and the agent.
5. **Given** a team member approved an agent's request to publish, **When** the card is opened,
   **Then** "Published" names the team member who approved and the agent that asked.
6. **Given** a scheduled connection whose date arrived, **When** the card is opened, **Then** an
   entry says that it became active, without a person.

---

### User Story 4 - Take back a deletion (Priority: P4)

A team member deletes a connection and sees at once that it was the wrong one. Today it is gone
for good. With this feature the toast that confirms the deletion offers "Undo", and Undo brings
the connection back as it was.

**Why this priority**: deleting is the one action that cannot be repaired today, and User Story 5
makes it faster to delete several at once.

**Independent Test**: can be fully tested by deleting a draft, an active, a scheduled and a
deactivated connection from the overview and from the details, choosing "Undo" in the toast, and
comparing the connection before and after.

**Acceptance Scenarios**:

1. **Given** a connection was deleted from the overview or the details, **When** the overview
   shows, **Then** the toast reads ""<name>" deleted." with "Undo".
2. **Given** that toast, **When** the team member chooses "Undo", **Then** the connection is in
   the list again with its name, description, documents, variants, rules, status, dates and
   activity, and a published connection has the same links as before.
3. **Given** the last connection was deleted and the welcome page shows, **When** the team member
   chooses "Undo", **Then** the overview shows again with the connection.
4. **Given** a toast held open by the pointer or the keyboard focus until the time in which a
   deletion can be taken back has passed, **When** the team member chooses "Undo", **Then** they
   are told that the connection can no longer be restored, and nothing changes; a toast that is
   left alone closes by itself after 6 seconds, and the deletion stands.

---

### User Story 5 - Delete several connections at once (Priority: P5)

After a round of trials the overview holds a handful of drafts and old connections. Today each
needs its own Delete and its own confirmation. With this feature every row has a checkbox and the
header a select-all; selecting rows swaps the toolbar for a selection bar "N selected · Cancel ·
Delete", and one dialog lists what will be deleted, with each connection's status and a warning
for those that are active.

**Why this priority**: a convenience for tidying up; row delete already exists.

**Independent Test**: can be fully tested by selecting connections of different statuses,
deleting them through the bar and the dialog, undoing, and by making one of them change in
another tab before confirming.

**Acceptance Scenarios**:

1. **Given** the overview, **When** the team member ticks two of three rows, **Then** the
   toolbar is replaced by "2 selected", "Cancel" and "Delete", and the select-all checkbox shows
   its mixed state.
2. **Given** two rows are selected, one active and one a draft, **When** the team member chooses
   "Delete", **Then** the dialog "Delete 2 connections?" shows "Their documents and rules will be
   deleted too.", one line per connection with its name and status, "<name> is active. Citizens
   won't be able to use it." for the active one, and "Keep connections" and "Delete connections".
3. **Given** that dialog, **When** the team member chooses "Delete connections", **Then** both
   are deleted together, the selection is cleared, the toolbar is back and a toast says so, with
   "Undo" that brings both back.
4. **Given** one of the selected connections was deleted or changed its status in the meantime,
   **When** the team member confirms, **Then** nothing is deleted, the dialog says which
   connection changed, and the list shows the current state.
5. **Given** rows are selected, **When** the team member chooses "Cancel", **Then** the selection
   is cleared and the toolbar is back as it was.
6. **Given** the banner for unsaved work kept on this device shows ("Unsaved changes in …"),
   **When** rows are selected, **Then** the banner stays above the selection bar, and a
   connection that exists only on this device is neither counted nor selectable.

---

### User Story 6 - Put the documents in the order that makes sense (Priority: P6)

A connection requests two or more documents. Today the documents step lists them in the
catalog's order, whatever the team member added first. With this feature the list keeps the
order the team member sets: a new document goes to the end, and a document can be moved by
dragging it (press and hold on touch) or, without dragging, with "Move up" and "Move down". The
order is saved with the connection and used wherever its documents are listed.

**Why this priority**: it changes how a connection reads, not what it does.

**Independent Test**: can be fully tested by adding documents in an order that differs from the
catalog's, reordering them with the mouse, by touch and with the keyboard alone, saving, and
finding the same order in the pager, the test step, the publish dialog and the details.

**Acceptance Scenarios**:

1. **Given** "Personal ID" then "Driving licence" in the list, **When** the team member drags
   "Driving licence" above "Personal ID", **Then** while dragging a line marks where it will
   land and a faded copy follows the pointer, and after the drop the list reads "Driving
   licence", "Personal ID", the open document stays open and the pager reads "Document 1 of 2".
2. **Given** a touch screen, **When** the team member presses and holds a document and moves it,
   **Then** it is dragged as with the mouse, and a short touch still scrolls the list.
3. **Given** the keyboard alone, **When** the team member chooses "Move up" on the second
   document, **Then** it becomes the first, the focus stays with it, and the move is announced
   with the document's new position.
4. **Given** a reordered draft, **When** it is saved, reopened and published, **Then** the
   documents step, the test step's data, the publish dialog's summary and the details' Summary
   list the documents in that order.
5. **Given** a published connection, **When** its documents are reordered in the edit flow and
   saved, **Then** the new order shows in the management UI and nothing changes for citizens or
   for serviceBW.

---

### User Story 7 - Start from an example (Priority: P7)

A team member opens the product for the first time. The welcome page offers "Create connection"
and, with this feature, "Start from an example": a dialog explains that it creates a draft
"Passenger transport licence (example)" with 2 documents and 2 rules, and "Create the example"
opens that draft in the wizard. Banners in the steps say that it is an example and what to try.
The example is a normal draft: it can be changed, tested, published and deleted. If it is
published without any change, the publish dialog reminds the team member to check that it fits
their service.

**Why this priority**: it helps once per team; everything it creates could also be typed.

**Independent Test**: can be fully tested on an installation without connections: creating the
example, walking its steps, publishing it unchanged and changed, and finding it on the overview.

**Acceptance Scenarios**:

1. **Given** no connection exists, **When** the welcome page shows, **Then** "Start from an
   example" stands beside "Create connection".
2. **Given** the welcome page, **When** the team member chooses "Start from an example", **Then**
   the dialog "Start from an example?" reads "This creates a draft called "Passenger transport
   licence (example)" with 2 documents and 2 rules. It only becomes active when you publish.",
   with "Go back" and "Create the example".
3. **Given** that dialog, **When** the team member chooses "Create the example", **Then** the
   draft exists, the wizard opens its first step with the name and the description filled in and
   the banner "This is an example. Change anything to see how it works.".
4. **Given** the example's rules step, **When** it shows Standard, **Then** it holds Rule 01
   (at least 21 years old) AND Rule 02 (class B for at least 2 years) with the banner "Try
   changing the age to 18 or adding a rule. Then use Test rules to check the result."; the
   variant "Ambulance" follows Standard with both rules changed (19 years, 1 year) and the banner
   "Ambulance is more lenient than Standard. Rules 01 and 02 are changed here.".
5. **Given** the unchanged example, **When** the publish dialog opens, **Then** it adds "This is
   still the example. Check that the name, documents and rules fit your service." and publishing
   still works; after any change to the example the line is gone.
6. **Given** the example exists, **When** the overview lists it, **Then** it is a draft like any
   other, named "Passenger transport licence (example)", and the overview offers only "Create
   connection".

---

### User Story 8 - Agents see and use the new data (Priority: P8)

A team member's agent (spec 007) reads and prepares connections through the MCP server. What
this feature adds for people must not be invisible or contradictory for agents: an agent sees
that a connection is scheduled and from when, since when it has been active or deactivated,
which step a draft was left in, the documents in the team's order, that a draft is the example,
and the connection's activity; it can move a document in a draft; and it can ask, with approval,
for a start date. What an agent does shows up in the activity.

**Why this priority**: it keeps spec 007's promise that agents read everything a team member sees
and change drafts as the editor does; no person's story depends on it.

**Independent Test**: can be fully tested with an MCP client at each access level: reading a
scheduled connection, an example draft and a connection's activity, moving a document in a
draft, and asking for a scheduled publication and approving it in the browser.

**Acceptance Scenarios**:

1. **Given** a scheduled connection, **When** an agent searches for or reads it, **Then** the
   answer says "scheduled", gives the start date and says that its links answer "unavailable"
   until then; a search can be limited to scheduled connections.
2. **Given** a draft with two documents, **When** an agent with "Read and edit drafts" moves the
   second document to the first place, **Then** the stored draft has that order, exactly as after
   the same move in the editor.
3. **Given** a publishable draft, **When** an agent asks to publish it on 01.12.2026 and the team
   member approves, **Then** the approval page showed "Active from 01.12.2026" before approving,
   and the connection is scheduled for that day.
4. **Given** any connection, **When** an agent with "Read only" asks for its activity, **Then**
   it gets the same entries as the Activity card.
5. **Given** an agent, **When** it looks for a way to restore a deleted connection, to delete
   several at once or to create the example, **Then** there is none: these stay actions of a
   person in the browser.

---

### User Story 9 - Choose a document's data by group (Priority: P9)

A document such as the driving licence offers some thirty data items in one list, and a team
member looks for the few they need. With this feature a document with more than 10 data items
shows them under group headings (Name, Birth, Address, Document, the document's own groups such
as Licence and Appearance, and Other details), and each heading has a checkbox that chooses or
clears its whole group. The story was added by Clarification 2026-11-10 #6, which brought the
data groups into this feature.

**Why this priority**: it makes a long list easier to read; every data item can already be
chosen one by one.

**Independent Test**: can be fully tested by adding the driving licence to a connection,
choosing data through group checkboxes and single data items in the create flow and in the edit
flow, clearing a group whose data a rule checks, and reading the catalog as an agent.

**Acceptance Scenarios**:

1. **Given** the driving licence in the documents step, **When** its data item panel shows,
   **Then** its data items stand in three columns under "All data items", under the headings
   "Name" (4 data items), "Birth" (6), "Address" (5), "Document" (6), "Licence" (3),
   "Appearance" (6) and "Other details" (1), in that order, each heading with a checkbox.
2. **Given** a group with no data item chosen, **When** the team member ticks the group's
   checkbox, **Then** all of its data items are chosen, as if each had been ticked.
3. **Given** a group with some of its data items chosen, **When** the panel shows, **Then** the
   group's checkbox shows its mixed state.
4. **Given** a group with data that a rule checks, **When** the team member clears the group,
   **Then** the question that names those rules shows first, as it does for "All data items"
   today.
5. **Given** an agent, **When** it reads the catalog, **Then** each data item of a grouped
   document carries its group, and the agent still chooses data items one by one.

---

### Edge Cases

- **Midnight between opening and confirming**: a dialog opened on 30.11. with the date 01.12.
  and confirmed after midnight is refused with "Enter a date after today."; nothing is published
  or changed.
- **The service was not running when the start date came**: the connection becomes active as
  soon as the service runs again; its "Active since" is the scheduled start.
- **A scheduled connection is deactivated**: the schedule is cancelled; the connection is
  deactivated and can be activated again, now or on a date.
- **A scheduled connection is deleted and restored after its date has come**: it becomes active
  at once.
- **Requests in progress when a connection is deleted**: they are cancelled at once, as today,
  and stay cancelled after "Undo"; citizens start again. Approval requests that were waiting for
  the connection stay cancelled too.
- **Undo is chosen twice, or after a colleague's later action**: the second Undo changes nothing
  and says so, with FR-036's sentence.
- **The toast with "Undo" closes by itself after its 6 seconds, is replaced by a later toast, or
  the page is left**: the deletion stands; there is no other place to restore from.
- **Connections that existed before this feature**: their rows and pills show the dates that are
  known (FR-021), their documents keep the order they have today, and their activity starts
  with what is known, without a person (FR-032).
- **A team member's account is removed**: the activity keeps the name as it was when the entry
  was made.
- **A long activity**: the list stays usable with hundreds of entries and reaches the oldest one:
  the open card's list scrolls down to it. No frame draws this (Clarification 2026-11-10 #13).
- **A selection and the search**: select-all selects the rows that are listed, that is, those the
  search shows; rows hidden by the search are not selected.
- **A selected row disappears** (a colleague deleted it and the list refreshed): it leaves the
  selection, and the count follows.
- **A long selection**: the bulk dialog lists every selected connection and scrolls inside
  itself; its buttons stay in view.
- **Only one document**: nothing can be reordered and no reorder control shows.
- **A drag is dropped outside the list or ended with Escape**: the order is unchanged.
- **A removed document is brought back with the documents step's "Undo"** (spec 008): it returns
  to the place it had.
- **Reduced motion**: dragging and reordering follow spec 008's rule (transitions off): they
  have no transitions, not the "fades only" of build note 31, and the drop just updates the list
  (Clarification 2026-11-10 #25).
- **The example is created twice** (two team members on a fresh installation at the same
  moment): two example drafts exist; each is a normal draft.
- **The example and the language** (spec 009): the example is created in the language the team
  member uses at that moment and stays as created; its banners follow the language.
- **The catalog changes**: the example always fits the catalog it is created from; a catalog
  without one of its documents must not ship with a broken example.
- **Narrow windows, zoom, keyboard**: every new control and state keeps spec 008's bar (320 px
  at 200 % zoom, no horizontal scroll, visible keyboard focus). No frame is narrower than 1440
  px: the date pill with its ⋯, the "Active from" group and its date field, the selection bar,
  the bulk dialog, the Activity card and the reorder menu are built for narrow windows by spec
  008's rules for them, without frames (Clarification 2026-11-10 #19).

## Requirements *(mandatory)*

### Functional Requirements

#### Go-live scheduling (User Story 1)

- **FR-001**: The publish dialog MUST show "Active from" with the choices "Now" (selected when
  the dialog opens) and "On a date", as drawn. With "Now" it MUST read "When you publish, the
  connection is ready to be added to your services.", its button MUST read "Publish connection",
  and publishing MUST go live at once, as today.
- **FR-002**: With "On a date" the dialog MUST read "The connection becomes active on the date
  you choose. You get the links now, so your service can be ready in time.", MUST show a date
  field (DD.MM.YYYY) under the radios, and its button MUST read "Schedule".
- **FR-003**: A start date MUST be a calendar day after today in Germany. For an empty field,
  today, a past day or something that is no date, the field MUST turn to its error state with
  "Enter a date after today." under it, and nothing MUST be published or changed; "Schedule"
  stays enabled and shows the error. The same refusal MUST hold when the day changes between
  opening the dialog and confirming, in the publish dialog, in "Change start date" and in
  "Activate this connection again?", each with the error state the publish dialog draws (P1c;
  Clarification 2026-11-10 #11).
- **FR-004**: Scheduling MUST publish the connection in every respect except that it is not
  active yet: it is a published connection, no draft; its links exist from that moment, are shown
  on its details and can be copied; and until the start its links MUST answer serviceBW exactly
  as a deactivated connection's do, so that no request can be started and serviceBW cannot tell
  the two apart.
- **FR-005**: The start MUST be the beginning of the chosen day in Germany (00:00). The
  connection MUST become active by itself at that time, within one minute, with nobody signed
  in, and MUST from then on be an active connection in every respect. If the middleware was not
  running at that time, it MUST become active as soon as the middleware runs again.
- **FR-006**: "Scheduled" MUST be a status of its own wherever a connection's status shows: the
  overview row (status "Scheduled", date "Active from <date>"), the header pill ("Scheduled ·
  <date>"), the details' status band ("Your connection is scheduled", "The links are ready to be
  added to your service. They become active on the scheduled date below.", the date pill "Active
  from <date>, 00:00"), the edit flow's header, and the delete dialogs (FR-010, FR-041).
- **FR-007**: A scheduled connection's details MUST otherwise be those of an active connection:
  the Links card with every link and its copy button enabled, the Summary, the Activity card and
  the footer's "Edit connection" and "Go to connections".
- **FR-008**: The connection's ⋯ menu of a scheduled connection MUST hold "Change start date",
  "Deactivate" and, after a divider, "Delete connection". "Change start date" MUST open the
  dialog as drawn: the title "Change start date", "Choose when citizens can use this
  connection.", the choices "Now" and "On a date" with the date field, "Cancel" and "Save date".
  A new date (checked as FR-003) MUST replace the start everywhere it shows; "Now" MUST make the
  connection active at once, and the details then MUST show the active band with "Active since
  <date>, <time>". A success toast MUST confirm the change, placed as the other toasts are:
  "Start date saved." (not drawn; Clarification 2026-11-10 #11).
- **FR-009**: An active connection's ⋯ menu MUST also hold "Change start date", before
  "Deactivate", as drawn ("also after 'Now'"). Its dialog MUST open with "Now (active since
  <date>, <time>)" selected, and saving with "Now" MUST change nothing. Saving with "On a date"
  (checked as FR-003) MUST make the connection scheduled for that day: from that moment its links
  answer as a deactivated connection's do until the start, and requests in progress are treated
  as a deactivation treats them today, that is, cancelled. The dialog's hint MUST say so: of the
  drawn "Until that date, citizens can't start a new request. Requests already started still
  finish.", the first sentence stays and the second names the cancellation, because letting
  started requests finish is the excluded item F13. "Save changes?" on an active connection MUST
  have no "Active from" choice and MUST take effect at once, as today; its body stays spec 008's,
  without "from the time you choose" (Clarification 2026-11-10 #1).
- **FR-010**: Deleting a scheduled connection MUST ask with the body "This connection will be
  active from <date>. If you delete it, it won't become active and its links won't work.", in
  the delete dialog spec 008 built.
- **FR-011**: "Activate this connection again?" MUST show "Active from" with "Now" (selected) and
  "On a date" under its summary. "Now" with "Activate" MUST work as today. "On a date" MUST
  schedule the deactivated connection for that day (FR-003 to FR-006); that case is not drawn
  and is built on the drawn dialog: the date field shows under the radios as in the publish
  dialog, the hint is written in this feature and the button reads "Schedule" (Clarification
  2026-11-10 #11).
- **FR-012**: Deactivating a scheduled connection MUST cancel its schedule: it is deactivated,
  with "Deactivated since" the time of that action, and can be activated again, now or on a date.
  The deactivate dialog's sentence for a connection that was never active is not drawn and is
  written in this feature, in the drawn deactivate dialog (Clarification 2026-11-10 #11).
- **FR-013**: Editing a scheduled connection MUST go through the entry confirmation and the edit
  flow of an active connection (spec 008, FR-045), with the header pill "Scheduled · <date>".
  What is saved MUST be what becomes active on the date, and saving MUST NOT change the date. The
  save dialog's sentence for this case is not drawn and is written in this feature, in the
  drawn "Save changes?" without "Active from" (Clarification 2026-11-10 #11). Where the active
  connection's texts say "active", a scheduled connection's MUST read, though no frame draws
  them (Clarification 2026-11-10 #24): the entry confirmation's title "Edit this scheduled
  connection?" (the row's "Edit “<name>”?" stays) and its body "Your changes only take effect
  when you save them. Saved changes become active on <date>."; the first step's note
  "Scheduled. Your changes become active on <date> once you save them."; the leave dialog's "If
  you leave now, your changes are lost. Save them, or discard them and keep the scheduled
  version."; and the discard dialog's "The connection goes back to the version that becomes
  active on <date>. Citizens aren't affected.".
- **FR-014**: After "Schedule", the publish dialog's states and the way to the details MUST follow
  spec 008's publish dialog (publishing, done, failed with the error ID); a failure MUST leave
  the draft a draft, and a failed reactivation or change of the date MUST leave the connection
  as it was. A server failure MUST show spec 008's failure alert with its error ID, slim but
  wrapping where the error ID needs it; the drawn sentence "Couldn’t publish, so nothing has
  changed. Check your internet connection and try again." MUST show only when no answer came.
  "Try again" MUST repeat the same choice: "Now", or "On a date" with the entered date
  (Clarification 2026-11-10 #23).

#### Status dates and the draft's step (User Story 2)

- **FR-015**: A published connection's details MUST show a date pill under the status sentence,
  as drawn, with date and time: "Active since <date>, <time>" while active, "Active from <date>,
  00:00" while scheduled, "Deactivated since <date>, <time>" while deactivated. A draft's details
  keep "Edited <date>, <time>".
- **FR-016**: The connection's ⋯ menu MUST sit on the date pill, as drawn, and while the
  connection is deactivated "Activate again" MUST stand next to the pill; a draft's pill has no
  ⋯. This supersedes spec 008's Clarification #52, which moved both to the band's right end
  because the pill was not built.
- **FR-017**: An overview row's date MUST read by status: "Published <date>" for an active
  connection, "Active from <date>" for a scheduled one, "Deactivated <date>" for a deactivated
  one, and "Edited <date> · <step> step" for a draft.
- **FR-018**: The dates MUST mean: "Published", the day the connection was published (with "Now"
  or with a date); "Active since", the time it last became active, through publishing with
  "Now", through its start date or through "Activate again"; "Deactivated", the time it was last
  deactivated. Saving changes, renaming and reordering MUST NOT change any of them.
- **FR-019**: A draft's row MUST name the step the draft was last saved in, for each of the four
  steps ("Connection step", "Documents step", "Rules step", "Test step"), whoever saved it, a
  team member or an agent. A published connection's row names no step. Should a draft have no
  recorded step, its row MUST read "Edited <date>" alone (Clarification 2026-11-10 #12).
- **FR-020**: Dates MUST read DD.MM.YYYY, and dates with a time "DD.MM.YYYY, HH:MM", in both
  languages (spec 009, FR-012). A start date and its "00:00" MUST read the same for every team
  member, as the day in Germany.
- **FR-021**: A connection that existed before this feature MUST show the dates that are known:
  its publication as stored, "Active since" as its publication, and, if it is deactivated,
  "Deactivated" as the time of its last change. Its row and pill MUST never be empty.

#### Activity (User Story 3)

- **FR-022**: The details of every connection, draft, scheduled, active or deactivated, MUST show
  the "Activity" card as drawn, after the Summary: closed, the title, the line "Last edited by
  <name> · <date>, <time>" and "View activity"; open, the entries and "Hide activity". It MUST
  open and close with the Links and Summary cards as spec 008's FR-046 says for those two: the
  three form one accordion with one card open at a time, on every details page. The page
  reached after publishing or saving lands with Links open (P7, E4), and opening Summary or
  Activity there closes Links, whose control then reads "View links"; frames P9 and P10, which
  keep Links shown beside an open Summary or Activity, are not followed (Clarification
  2026-11-10 #34).
- **FR-023**: An entry MUST show its date and time, what happened, and who did it. Entries MUST
  be listed newest first.
- **FR-024**: The line of the closed card MUST name the person and the time of the newest entry
  that has a person. While the connection is deactivated it MUST read "Deactivated by <name> ·
  <date>, <time>" instead.
- **FR-025**: The activity MUST record, for every connection, at the moment it happens: that it
  was created; that its name or description changed; that its documents changed (a document
  added, removed or moved, or its data chosen differently); that a variant was added, removed or
  renamed, with the variant's name; that the rules of a variant changed, with the variant's name;
  that it was published; that it was scheduled or its start date changed, with the date; that it
  became active on its start date; that it was deactivated; that it was activated again; that
  it was deleted and that it was restored. The drawn wording is used word for word ("Created",
  "Documents changed", "Variant added: <name>", "Rules changed in <variant>", "Published",
  "Deactivated"); the others are written in this feature in the same style and shown in the
  drawn row (date and time · event · person), without frames of their own, as are the entries
  of FR-027 and FR-032 (Clarification 2026-11-10 #13).
- **FR-026**: One save that changes several things MUST give one entry per kind of change. The
  same kind of change by the same person on the same variant, with no other entry in between,
  MUST show as one entry with the latest time, so that an agent's twenty rule edits or a team
  member's repeated saves do not fill the list.
- **FR-027**: The person of an entry MUST be the team member who acted, shown by the name the
  user menu shows. For a change an agent made, the entry MUST name the team member the agent
  acts for and the agent. For an action a team member approved for an agent, it MUST name the
  team member who approved and the agent that asked. An entry for something the middleware did by
  itself (FR-005) has no person.
- **FR-028**: An entry MUST keep its person's name as it was when it was made, also after the
  account is gone.
- **FR-029**: The activity MUST hold only what FR-025 lists. It MUST NOT hold the content of a
  rule, a message for citizens, a value, a finding, a test persona or its result, anything about
  a citizen or a request, or anything a team member did without changing the connection (views,
  copies, tests, declined or expired approval requests).
- **FR-030**: The activity MUST be kept as long as the connection exists, MUST come back with a
  restored connection, and MUST be gone for good once a deletion can no longer be taken back.
- **FR-031**: Every team member MUST be able to read every connection's activity, as every team
  member can read every connection; no one can change or remove an entry.
- **FR-032**: The activity of a connection that existed before this feature MUST start with what
  is known, "Created" and, if published, "Published", with their times and without a person; the
  closed card's line then shows the time alone until someone acts.

#### Undo after deleting (User Story 4)

- **FR-033**: After a connection is deleted, from the overview or from the details, the toast
  MUST read ""<name>" deleted." with the action "Undo", as drawn, for a connection of every
  status.
- **FR-034**: "Undo" MUST bring the connection back as it was before the deletion: its name,
  description, documents and their order, variants and rules, its status (a draft with its step,
  an active, scheduled or deactivated connection with its dates and start date), its activity
  and, for a published connection, the same links, which work again as its status says. The
  restored connection MUST appear in the list without a reload, and the restore MUST be
  announced politely: "“<name>” restored." (not drawn; Clarification 2026-11-10 #14).
- **FR-035**: A deletion MUST take effect at once, as today: the connection is gone from the
  overview, the search, the details and agents' reads, its links stop, and requests in progress
  are cancelled. "Undo" MUST NOT bring back requests that were cancelled or approval requests
  that were waiting.
- **FR-036**: A deletion MUST be restorable for a limited time, 5 minutes unless the middleware's
  settings say otherwise, and only through the toast's "Undo" of the team member who deleted.
  The toast offers "Undo" for as long as it shows, and it closes by itself after 6 seconds, as
  every toast does (FR-082): the restore time is the server's limit and matters only while a
  toast is held open. An "Undo" after the time, or a second "Undo", MUST change nothing, and the
  toast MUST say so: "“<name>” can no longer be restored." (not drawn; Clarification 2026-11-10
  #14). After the time, the deletion MUST be final exactly as a deletion is today.
- **FR-037**: When the last connection is deleted, the welcome page MUST show with the toast, and
  "Undo" MUST bring back the overview with the connection (spec 008, FR-027).

#### Bulk delete (User Story 5)

- **FR-038**: Every overview row MUST have a checkbox and the list's header a select-all
  checkbox, as drawn, each with an accessible name that names the connection or "all". Rows of
  every status can be selected.
- **FR-039**: While at least one row is selected, the toolbar (the count and the search) MUST be
  replaced by the selection bar "<n> selected", "Cancel" and "Delete", as drawn, and the count
  MUST be announced when it changes. The rows' own actions stay.
- **FR-040**: The select-all checkbox MUST select every listed row, MUST clear the selection when
  all are selected, and MUST show its mixed state while some are. "Cancel" MUST clear the
  selection and bring the toolbar back as it was. The selection MUST NOT outlive the page.
- **FR-041**: "Delete" with two or more rows selected MUST open one dialog, as drawn: "Delete <n>
  connections?", "Their documents and rules will be deleted too.", one line per selected
  connection with its name and status, a warning line for each connection that citizens can use
  or will be able to use ("<name> is active. Citizens won't be able to use it."; the lines for
  several active connections and for a scheduled one are written in this feature after the
  single dialogs' sentences), and "Keep connections" and "Delete connections". With exactly one
  row selected, "Delete" MUST open that connection's own delete dialog.
- **FR-042**: The dialog MUST follow the rule of dialogs that delete: "Keep connections", × and
  Escape close it without a change and return the focus to the bar; a click on the scrim does
  not close it; nothing closes it while the deletion runs.
- **FR-043**: "Delete connections" MUST delete all selected connections or none. If one of them
  no longer exists or no longer has the status the dialog showed, nothing MUST be deleted, the
  dialog MUST say which connection changed ("Nothing was deleted: “<name>” was deleted or
  changed in the meantime."; not drawn, Clarification 2026-11-10 #15), and the list MUST show
  the current state. A failure
  MUST show as spec 008's failures do, with the error ID where there is one.
- **FR-044**: After a bulk deletion the rows MUST be gone, the selection cleared, the toolbar back,
  and a toast MUST say how many connections were deleted, with "Undo" that brings all of them
  back or none (FR-034 to FR-036). The toast's sentence is not drawn: "<n> connections
  deleted." (Clarification 2026-11-10 #15). Each connection's deletion and restore MUST show in
  its activity.

#### Document order (User Story 6)

- **FR-045**: A connection's documents MUST be kept in the order the team member gives them. A
  document that is added MUST go to the end; removing one MUST leave the others' order; a removed
  document that the documents step's "Undo" brings back MUST return to its place.
- **FR-046**: In the documents step a document MUST be movable by dragging its row with a
  pointer and, on touch, by pressing and holding it, as drawn: a line marks where it will land, a
  faded copy follows the pointer, and after the drop the list shows the new order. A short touch
  MUST still scroll. A drop outside the list and Escape MUST leave the order unchanged.
- **FR-047**: Every document MUST also be movable without dragging, by "Move up" and "Move
  down", operable with the keyboard and with a single pointer; the first document has no "Move
  up" and the last no "Move down". After a move the focus MUST stay with the moved document and
  the move MUST be announced with the document's name and new position: "“<document>” moved to
  position <n> of <m>.". The design names this need without drawing it (build note 37), so the
  controls follow spec 008's menu pattern: a ⋯ menu button on each document row holds "Move up"
  and "Move down", and with one document there is no menu (Clarification 2026-11-10 #16).
- **FR-048**: Reordering MUST NOT change which document is open, and the pager ("Document n of
  m") MUST count in the list's order.
- **FR-049**: Reordering MUST work in the create flow, in a draft and in the edit flow of a
  published connection, and MUST be saved as every other change of that flow is: with the draft,
  with publishing, and with "Save" in the edit flow. A draft kept on the device (spec 005) MUST
  keep the order too. The edit flow's documents step draws no reordering; it MUST get the same
  dragging and the same menu as the create flow (Clarification 2026-11-10 #16).
- **FR-050**: Wherever a connection's documents are listed, they MUST be in the stored order: the
  documents step and its pager, the test step's data, the summaries of the publish, save and
  reactivate dialogs, the details' Summary, the approval page and agents' reads. The data items
  inside a document stay in the catalog's order, inside each data group where the document has
  groups (FR-077).
- **FR-051**: The order MUST NOT change what serviceBW receives or what the wallet is asked for:
  reordering alone changes nothing for citizens, for requests in progress or for the links.
- **FR-052**: A connection that existed before this feature MUST keep the order its documents
  show today.

#### The example (User Story 7)

- **FR-053**: While no connection exists, the welcome page MUST offer "Start from an example"
  (secondary) beside "Create connection →" (primary), as frame 1g draws; build note 16's "one
  Create connection button" does not hold (Clarification 2026-11-10 #27). The overview, shown
  once a connection exists, MUST NOT offer it: its footer keeps "Create connection" only.
- **FR-054**: "Start from an example" MUST open the dialog as drawn: "Start from an example?",
  "This creates a draft called "Passenger transport licence (example)" with 2 documents and 2
  rules. It only becomes active when you publish.", "Go back" and "Create the example". "Go
  back", × and Escape MUST close it without creating anything.
- **FR-055**: "Create the example" MUST store a draft and open it in the wizard at its first
  step. Creating it MUST record that step, so that its row reads "Edited <date> · Connection
  step" (FR-019) and agents read that step (FR-062); the row of frame 1j, which names no step,
  is not followed (Clarification 2026-11-10 #36). The draft MUST hold what the frames draw: the
  name "Passenger transport licence (example)"; the description "Licence to drive taxis, rental
  cars and ambulances. Checks age and driving experience."; the documents Personal ID (7 data
  items) and Driving licence (2 data
  items); in Standard, Rule 01 "Date of birth (Age) is at least 21 years old" with "You need to
  be at least 21 years old." AND Rule 02 "Licence class B – Issue date is at least 2 years ago"
  with "You need to have held a class B driving licence for at least 2 years."; and the variant
  "Ambulance", linked to Standard, described "For ambulance services. Some rules differ from
  Standard.", with Rule 01 changed to 19 years and Rule 02 to 1 year and their messages to match.
- **FR-056**: The example MUST always be a complete, publishable draft: publishing's checks pass
  on it unchanged, and the rule checks find nothing in it. Its variant tabs therefore carry no
  finding icon and no count: they show the ⓘ with the variant's description, as 1i-b draws, and
  the "1" that 1i and 1i-c draw beside a tab is not built (Clarification 2026-11-10 #28).
- **FR-057**: The example MUST be a normal draft in every other respect: listed on the overview
  as a draft, editable by team members and agents, testable, publishable, deletable, and counted
  as a connection for the homepage (spec 008, FR-027).
- **FR-058**: While the draft is the example, the wizard MUST show the example banners as drawn:
  on the connection step "This is an example. Change anything to see how it works."; on the
  rules step, for Standard, "Try changing the age to 18 or adding a rule. Then use Test rules to
  check the result." and, for Ambulance, "Ambulance is more lenient than Standard. Rules 01 and
  02 are changed here.". The design asks for a banner on each step and draws none for the
  documents and test steps; they show the connection step's sentence in the connection step's
  banner, on the test step above the variant tabs, as on the rules step (Clarification
  2026-11-10 #18). A banner is information only: it has no action and cannot be dismissed.
- **FR-059**: A draft MUST stop being the example when it is published; a published connection
  shows no example banner. Until then it stays the example, whatever is changed in it.
- **FR-060**: When the example is published while nothing in it was changed since it was created
  (its name, description, documents, data items, variants and rules are the example's), the
  publish dialog MUST add the line "This is still the example. Check that the name, documents and
  rules fit your service."; publishing MUST still work. After any saved change the line MUST NOT
  show. The approval page of a request to publish it MUST show the same line. The dialog's
  summary of the unchanged example lists "Standard · 2 rules" and "Ambulance · 2 rules"; the
  "School transport" tab and Rules 03 and 04 behind frame 16b's dialog are a slip
  (Clarification 2026-11-10 #29).
- **FR-061**: The example's own texts (its name, description, the variant's name and description,
  the rules' messages) MUST be created in the language the team member uses at that moment and
  are content from then on (spec 009, FR-007).

#### Agents (User Story 8)

- **FR-062**: Agents' reads of a connection and their search MUST carry what this feature adds
  for team members: the status "scheduled" with its start date and what its links answer until
  then; the dates of FR-018; a draft's step; the documents in the stored order; and that a draft
  is the example. The search MUST accept "scheduled" as a status beside draft, live and
  deactivated (spec 007, FR-007).
- **FR-063**: Agents of every access level MUST be able to read a connection's activity, with the
  same entries as the Activity card.
- **FR-064**: Agents with "Read and edit drafts" or more MUST be able to move a document in a
  draft, one change per call, with the same stored result as the same move in the editor (spec
  007, FR-012 to FR-016). A document an agent adds goes to the end.
- **FR-065**: Agents MUST be able to ask for a start date, with the team member's approval as
  spec 007's FR-021 says. A request to publish a draft or to reactivate a connection MAY name a
  start date; without one it acts at once, as today. Agents with "Read, edit drafts and manage
  live connections" MUST be able to ask to change the start date of a scheduled or an active
  connection, to another date or to now (FR-008, FR-009). The approval page MUST show the start
  as part of what will happen: "Active from <date>", or that the connection goes live at once,
  and, for an active connection that gets a later date, that its links stop until then and
  requests in progress are cancelled. A date that is not after today, when the request is made
  or when it is approved, MUST be refused with the reason; at the request, no approval request
  is made (spec 007, FR-022). The agent MUST be able to learn the outcome, with the date the
  connection is scheduled for (Clarification 2026-11-10 #2). The approval page is not in the
  design file: everything this feature adds to it (here and in FR-050, FR-060 and FR-066) MUST
  be built on spec 007's existing page, with this spec's wording (Clarification 2026-11-10 #17).
- **FR-066**: Requests to deactivate or delete MUST be accepted for a scheduled connection too,
  and their approval pages MUST say what happens in that case, as the dialogs of FR-010 and
  FR-012 do. For spec 007's FR-024, a connection's status includes "scheduled" and its start
  date: a request made for a scheduled connection does nothing once the connection has become
  active or its date has changed, and the page says why.
- **FR-067**: An approved request MUST act exactly as the same action in the browser (spec 007,
  FR-027), including its entry in the activity (FR-027). Approving a deletion offers no "Undo":
  the approval page keeps saying that deleting can't be undone.
- **FR-068**: Agents MUST NOT get a way to restore a deleted connection, to delete several
  connections with one request, or to create the example.
- **FR-069**: The guidance for agents MUST describe every new or changed tool and the scheduled
  status in the same change (spec 007, FR-038), and what agents receive stays English (spec 009,
  FR-017).

#### Across the feature

- **FR-070**: Every frame that belongs to the nine items (the eight of group A and the data
  groups) MUST be ported as drawn,
  layout, styling and wording, and verified as spec 008 verifies its screens. What a frame of
  these items shows of an item that stays deferred (FR-074) MUST NOT be built. Build note 23's
  "v9 builds every change since v8" does not widen this: only the nine items are ported
  (Clarification 2026-11-10 #31).
- **FR-071**: Every text this feature adds MUST exist in English and German (spec 009, FR-004),
  the German written in this feature with spec 009's glossary, which gains this feature's terms
  (scheduled, start date, activity, example, selected). The English copy of the frames is used
  word for word. The page's language mark MUST keep following the chosen language, English or
  German, as spec 009 built it, not the fixed "en" of build note 1 (Clarification 2026-11-10
  #26).
- **FR-072**: Every new screen, state and control MUST keep spec 008's quality bar: operable with
  the keyboard alone, keyboard focus visible, status changes announced, no information by colour
  alone, AA contrast, light only, usable at 320 px and at 200 % zoom without horizontal scroll.
- **FR-073**: Nothing this feature stores MUST hold anything about a citizen, a request, a
  finding or a test persona, and nothing of it MUST be written to the logs beyond what the
  middleware logs today (identifiers and counts).
- **FR-074**: Everything else MUST stay as specs 001 to 009 leave it, but for the time after
  which a toast closes (FR-082). In particular the items of
  group A that this feature does not build stay as spec 008 built around them: no pending
  changes kept as a draft beside a live connection (F5), requests in progress are cancelled by a
  deactivation (F13), no email line in the user menu (Q13), no success message for met citizens
  (Q31 (a)), no "Download PDF" (Q37 (b)), and no "Undo" after deactivating (spec 008, F54). The
  same holds for what the design's build notes and frames restate or change of specs 001 to 009
  outside the nine items (menus and popups, the shell, the overview's rows and search, the
  create and documents steps, removing a document, the rules step, the test step, the publish
  dialog, the edit flow, leaving and logging out, the details, the delete and deactivate
  dialogs, the toast types): none of it is a requirement of this feature. Where a frame of the
  nine items shows it, its layout is ported and the product's behaviour stays; where a build
  note disagrees with the product, the product stays (Clarification 2026-11-10 #31). The
  overview's description tooltip (frame 1k) is one such part: it stays as spec 008 built it, on
  hover, on keyboard focus of the row's name and after a tap on touch (Clarification 2026-11-10
  #32). Leaving a new connection's or a stored draft's flow is another: "Leave this
  connection?" stays as spec 008's FR-026 built it, its "Discard connection" deletes nothing
  that was stored, and frame 6a's silent save is not built (Clarification 2026-11-10 #33).
- **FR-075**: What serviceBW receives MUST change in one respect only: a scheduled connection's
  links answer as a deactivated connection's do until its start date.
- **FR-076**: Where a frame of the nine items draws something that stays out of scope (FR-070,
  FR-074), this MUST be built in its place:
  - **Pending changes kept as a draft (F5)**: the edit flow of an active or a scheduled
    connection shows only the status pill in its header ("Active", or "Scheduled · <date>"),
    never "Draft changes"; its footer reads "Back · Discard changes · <next step> · Save",
    without "Keep draft and exit"; Konnekt and "Your connections" open "Save your changes?"
    ("If you leave now, your changes are lost. Save them, or discard them and keep the active
    version.", for a scheduled connection FR-013's sentence, with "Discard changes" and
    "Save"); no toast reads "Draft kept. Your changes take
    effect when you save them."; and no overview row reads "Changes not published"
    (Clarification 2026-11-10 #3).
  - **"Download PDF" (Q37 (b))**: the details' Summary card has no "Download PDF" button, for a
    connection of any status; its header shows "Summary", the count line and "View summary" /
    "Hide summary" (Clarification 2026-11-10 #4).
  - **"Undo" after deactivating (F54)**: the deactivation toast reads "Connection deactivated."
    (success type) without "Undo". Only deleting a connection (FR-033), removing a document
    (FR-045) and the rules step's existing undos offer "Undo" (Clarification 2026-11-10 #5).
  - **Upcoming documents (F3)**: the Add document card lists only the wallet's documents
    ("Available", "Added") and has no hint line about documents that are coming soon; when
    every wallet document is added it reads "Everything in the wallet is added."; and its search
    finds wallet documents only (Clarification 2026-11-10 #6).
  - **A success message for met citizens (Q31 (a))**: for an applicant who meets every rule,
    the test step's result reads "Result: meets the rules" with the list "Rules <name> meets",
    and no "Message <name> reads" box shows (Clarification 2026-11-10 #8).
  - **Grouping a group**: a group's ⋯ menu has no "Group with other rules", on any frame that
    draws it; the menu keeps the entries spec 008 gives it, in a variant "Add message", "Reset
    to Standard", a divider and "Remove from <variant>" (Clarification 2026-11-10 #9).
  - **The email line (Q13)**: the user menu shows the name, a divider and "Log out", without an
    email (Clarification 2026-11-10 #10).
  - **Findings in the published Summary (P9d, build note 26)**: the details' Summary shows no
    findings, as spec 003's FR-020 says, and the ⓘ of a variant's tab shows only the variant's
    description (Clarification 2026-11-10 #21).
  - **Roles and view-only users (V-Draft · S2)**: a draft's details show "Edit connection" for
    every team member, as V-Draft · S draws; the view-only details without it are not built
    (Clarification 2026-11-10 #30).
- **FR-077**: In the documents step's data item panel, in the create flow, in a draft and in the
  edit flow, a document with more than 10 data items MUST show its data items under group
  headings, as drawn: in three columns under "All data items", the groups "Name", "Birth",
  "Address" and "Document", then the document's own groups ("Licence", "Appearance"), and
  "Other details" last. The groups MUST stand in that order and flow down the three columns;
  where the frames place a group elsewhere (the Driving licence's "Licence" and "Other details"
  before "Document"), their placement is not followed (Clarification 2026-11-10 #35). A
  document with 10 data items or fewer keeps today's list without groups. Everywhere
  else data items MUST stay listed without groups, as today: the details' Summary, the dialogs'
  summaries and the approval page (Clarification 2026-11-10 #6).
- **FR-078**: The data groups MUST come from the catalog. Every data item of a grouped document
  MUST belong to exactly one group; a group MUST keep its name across documents and MUST hold at
  least 2 data items, and what is left goes into "Other details" (build note 20). The Driving
  licence's groups MUST hold Name 4, Birth 6, Address 5, Document 6, Licence 3, Appearance 6 and
  Other details 1 data items; the frames that draw 5 data items under Birth or more than one
  under Other details are not followed (Clarification 2026-11-10 #35). The groups' names are
  labels of the catalog, in English and German (FR-071; Clarification 2026-11-10 #6).
- **FR-079**: Every group heading MUST have a checkbox, as drawn, that selects all of its group's
  data items and shows its mixed state while some of them are chosen. It MUST do for its group
  what "All data items" does for the document today, including the question that names the
  rules before data that a rule checks stops being requested (002-S1.1); that dialog's wording
  for a group is not drawn and is written in this feature (Clarification 2026-11-10 #6).
- **FR-080**: Agents' read of the catalog MUST carry each data item's group, in English, and the
  guidance for agents MUST describe it in the same change (FR-069). Agents MUST keep choosing
  data items one by one: there is no way to choose a whole group (Clarification 2026-11-10 #6).
- **FR-081**: While work kept on this device exists (spec 005's local drafts), the overview MUST
  show the banner the design draws above the toolbar (frames 1m and 1n). For one connection it
  MUST read "Unsaved changes in “<name>”" and "Saved only on this device on <date>, <time>, when
  the page closed. Nobody else can see them.", with "Discard" and "Resume editing"; the
  tertiary button reads "Discard", as 1m and 1n draw, not build note 34's "Discard changes"
  (Clarification 2026-11-10 #37). For several
  it MUST read "Unsaved changes in <n> connections" and "Saved only on this device when the page
  closed. Nobody else can see them.", with one line per connection that reads "Edited · <date>,
  <time>" or "New, never saved · <date>, <time>". The banner MUST stay above the selection bar
  while rows are selected (FR-039), and a connection that exists only on this device MUST be
  neither counted nor selectable (FR-038, FR-040). The product already shows a banner for local
  drafts with this wording (spec 008): this feature checks it against the frames, changes what
  differs and adds its behaviour with the selection (Clarification 2026-11-10 #20).
- **FR-082**: Every toast, with or without an action, MUST close by itself after 6 seconds, and
  the time MUST run only while neither the pointer nor the keyboard focus is on the toast. This
  holds for this feature's toasts (a deletion, a bulk deletion, a start date change) and for the
  existing toasts with an action (the document removal's "Undo", "Try again" after a failed
  save, the rules step's undos). It supersedes spec 008's rule that a toast with an action
  stays until it is used or dismissed, and is an exception to FR-074 (Clarification 2026-11-10
  #22).

### Key Entities

- **Start date**: the day from which a scheduled connection is active, a calendar day in
  Germany, beginning at 00:00. A connection has at most one; it is set when publishing or
  reactivating "On a date" or through "Change start date", and it ends when the day comes, when
  "Now" is chosen, or when the connection is deactivated or deleted.
- **Connection status**: draft, scheduled, active or deactivated. "Scheduled" is new: published,
  with links, not yet usable by citizens.
- **Status dates**: when a connection was published, when it last became active, and when it was
  last deactivated; shown on the overview and in the details' date pill.
- **Activity entry**: one thing that happened to one connection: when, what (one of the kinds of
  FR-025, with a variant's name or a date where the kind has one), and who (a team member, a
  team member with an agent, or nobody for what the middleware did by itself). Belongs to the
  connection and goes with it.
- **Deleted connection**: a connection that was deleted less than the restore time ago. It is
  gone for everyone and everything except "Undo", which returns it unchanged; afterwards it is
  deleted as connections are today.
- **Document order**: the position of each document among a connection's documents; part of a
  draft's and of a published connection's content.
- **Example mark**: the fact that a draft was created by "Start from an example" and not yet
  published, and whether anything in it has been changed since.
- **Data group**: a named set of a document's data items in the catalog ("Name", "Birth",
  "Address", "Document", a document's own groups, "Other details"). Every data item of a
  document with more than 10 data items belongs to exactly one; it arranges the documents
  step's checkboxes and changes nothing a connection stores.
- **Selection**: the overview rows a team member has ticked; it lives in the page only and is
  never stored.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A team member schedules a connection in the publish dialog with one choice and one
  date, and the connection becomes active within one minute of the start of that day in Germany,
  in 100 % of the cases tested, with nobody signed in.
- **SC-002**: Before its start date a scheduled connection's links answer serviceBW exactly as a
  deactivated connection's, and from the start date on exactly as an active one's, in 100 % of
  the cases tested.
- **SC-003**: On the overview and the details, a team member can tell a connection's status and
  since when it holds, and which step a draft was left in, without opening anything else; the
  dates shown match what happened in 100 % of the cases tested (publish, schedule, start, save,
  deactivate, reactivate).
- **SC-004**: For every action of FR-025, done by a team member, by an agent or through an
  approval, the Activity card shows an entry with the right time, event and person within five
  seconds of reopening the details, and a review of the stored activity finds nothing that
  FR-029 excludes.
- **SC-005**: "Undo", used while its toast shows and within the restore time, brings back 100 %
  of what FR-034 lists, for
  a connection of each status and for a bulk deletion; after the restore time, a deleted
  connection cannot be brought back by any means the product offers.
- **SC-006**: Ten connections are deleted with one confirmation in under 30 seconds, and a bulk
  deletion never deletes only some of the selected connections.
- **SC-007**: A team member reorders documents with a mouse, by touch and with the keyboard
  alone, and the order is the same after saving, reloading and publishing in every place that
  lists the documents (FR-050), while the answers serviceBW receives are unchanged.
- **SC-008**: On an installation without connections, a team member gets from the welcome page to
  a complete example draft in the wizard with two activations and in under 10 seconds, and can
  publish it unchanged.
- **SC-009**: Every frame of the nine items passes spec 008's visual verification, and every new
  screen and state passes spec 008's checks (keyboard walkthrough, 320 px at 200 % zoom, AA
  contrast) in both languages.
- **SC-010**: An agent reads the scheduled status, the dates, the step, the document order, the
  example mark and the activity of a connection, moves a document in a draft, and its work shows
  in the Activity card; the tools' guidance describes each of these.
- **SC-011**: Every existing automated check of the product still passes, and the behaviours this
  feature does not name are unchanged.
- **SC-012**: A team member chooses or clears all data items of a group with one activation, with
  the same result as ticking each data item, in 100 % of the cases tested, and an agent reads
  each data item's group from the catalog.

## Assumptions

- **Specs 008 and 009 are complete.** The redesigned screens, the toasts with actions, the
  accordions of the details, the delete dialogs and the two languages are in place; this feature
  adds to them.
- **The frontend side is decided by the frames**, as `deferred.md` says: the later feature ports
  them and does not re-decide them. The Figma audit of the group's frames against this spec
  (`deferred.md`, "How to use it") ran on 2026-11-10, and Clarifications 2026-11-10 #3 to #26
  settle what it found; #27 to #37 settle the questions of its remap. The undrawn places this
  spec names are built from the spec without
  waiting for frames, and what the Clarifications do not word is written in this feature: the
  toast after scheduling or changing a date, the button of "Activate again" on a date, the save
  dialog's sentence for a scheduled connection, the ⋯ menu of a scheduled connection, the
  activity's undrawn events and its long lists, the bulk toast and its warnings for several
  connections, "Move up" and "Move down" and their announcements, the banners of the documents
  and test steps, and the German of everything.
- **Each item brings its data along**: what the server stores and answers, its mirror for the
  frontend and the MCP server, and the agents' tool and guidance where FR-062 to FR-069 name one,
  in one change per item (constitution, Principle I; spec 007, FR-038).
- **The start is a day, not a time.** The design's field takes a date only and its pill reads
  "00:00"; the day is Germany's, as the test step's "today in Germany" already is. Today is not
  a valid start date: "Now" is for today.
- **A scheduled connection is published.** It has its links from the moment of scheduling
  ("You get the links now"), it is edited as an active connection is, and for serviceBW it is
  indistinguishable from a deactivated one until its start.
- **"Deactivate" is how a schedule is cancelled** without deleting the connection; the design
  shows the ⋯ on a scheduled connection's pill but not its open menu.
- **"Published <date>" and "Active since <date>" are two facts.** The row shows when the
  connection was published; the pill shows since when citizens can use it, which moves with a
  start date or a reactivation. The frames use different connections for the two, so they do not
  settle it.
- **Names in the activity are the names the user menu shows.** The design draws full names;
  accounts carry a username only, and the email line (Q13) is out of scope.
- **Deleting takes effect at once and "Undo" reverses it**, as `deferred.md` describes it (a
  deletion that can be restored), rather than holding the deletion back until the toast is gone.
  Requests in progress are therefore cancelled as today and not brought back; the delete dialog
  already says that citizens won't be able to use the connection.
- **The restore time is 5 minutes** by default. Every toast, the deletion toast included, closes
  by itself after 6 seconds (Clarification 2026-11-10 #22), so in practice a deletion can be
  undone for as long as its toast shows; the restore time limits how long a deleted connection
  is kept and matters only while a toast is held open by the pointer or the keyboard focus.
- **Only the team member who deleted can undo**, from their toast; there is no bin and no list
  of deleted connections.
- **The document order belongs to the management UI.** It does not reorder what serviceBW
  receives or what the wallet shows, so reordering a live connection needs nothing from the
  wallet-communication service and is safe at any time.
- **The example stays the example until it is published**; the banners do not disappear with the
  first change, because the rules banner invites a change and then a test. Only the publish
  dialog's line depends on whether anything was changed.
- **The example has Standard and Ambulance.** The dialog's "2 documents and 2 rules" counts
  Standard's rules; frame 16b's third tab ("School transport") and its Rules 03 and 04 are a
  slip (Clarification 2026-11-10 #29). The entry
  reads "Start from an example", as the dialog's title and `deferred.md` do; one frame's "Start
  with an example" is a slip.
- **Every draft row shows its step.** The frames that show a draft row without one are sample
  data; every stored draft has a step (spec 005). A draft without one would read "Edited <date>"
  alone (Clarification 2026-11-10 #12). The example is no exception: creating it records
  "Connection step" (Clarification 2026-11-10 #36).
- **Agents get what they need to stay consistent with people** (spec 007's "every read", "every
  change the create flow offers", and approval for what changes a live connection): reads of all
  new data, moving a document, and a start date with approval (Clarification 2026-11-10 #2).
  Restoring, bulk deletion and the example are for people in the browser.
- **Every team member has the same rights** (spec 008, OUT-2): anyone can schedule, delete in
  bulk, restore their own deletion and read every connection's activity.

## Out of Scope

- The other items of `deferred.md`, group A: a live connection's pending changes kept as a draft
  ("Keep draft and exit", "Draft changes", "Changes not published", F5); a deactivation that lets
  started requests finish (F13); the email line in the user menu (Q13); a success message for met
  citizens (Q31 (a)); "Download PDF" (Q37 (b)).
- Groups B and C of `deferred.md`: the rules-package actions (remove from group, duplicate
  group, add into a group, unlink from Standard, grouping a group, persona generation that makes
  every rule testable (F11)), upcoming documents, roles and view-only users, and with them the
  view-only draft details of V-Draft · S2 (Clarification 2026-11-10 #30). The test step's
  "Generate all" and "Generate again" are not that persona generation: they are spec 004's
  regenerate and stay (Clarification 2026-11-10 #7). The data groups of group C are in scope
  (Clarification 2026-11-10 #6).
- "Undo" after deactivating, after deleting a variant, a rule or a group beyond what exists, and
  "Undo" on the approval page.
- A bin or a list of deleted connections, and restoring after the restore time.
- Saved changes of an active connection that take effect on a date ("Active from" in "Save
  changes?"), and with them a second version of a connection beside the live one.
- A start time of day, a time zone choice, recurring or repeated schedules, an end date, and a
  schedule for deactivating.
- Notifications when a scheduled connection becomes active (email, in-app).
- Filtering, searching or exporting the activity; activity across connections; recording who
  viewed or copied something.
- Reordering the data items inside a document, the variants or the overview's rows.
- More than one example, choosing among examples, and the example entry on the overview.
- Bulk actions other than delete (deactivate, activate, export).
- Anything the citizen sees and the shape of what serviceBW receives.
