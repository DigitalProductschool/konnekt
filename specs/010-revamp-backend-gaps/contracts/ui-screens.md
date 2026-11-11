# Contract: the screens this feature changes

**Users**: signed-in DO.IT team members. **Requirements**: FR-001 to FR-061, FR-070 to FR-082,
SC-001 to SC-009, SC-012, User Stories 1 to 7 and 9. **Decisions**: the spec's Clarifications
2026-11-10 #1 to #37, the audit's decided items ([../figma-audit/report.md](../figma-audit/report.md):
F1 to F43, W1 to W18), research R1 to R12. **Copy**: [copy.md](copy.md). **Data**:
[management-api.md](management-api.md).

**What decides what**: as in [spec 008's contract](../../008-kern-revamp-redesign/contracts/ui-screens.md),
which stays in force for everything not named here. Figma "Middleware – V5" (file
`s8mU9oJDq3411e8bxMjQO9`) decides layout, styling and wording of the nine items' frames; this spec
decides behaviour. An **F#** of this feature's audit is built as the spec says with the frame's
layout; a **W#** is built without a frame, from the pattern it names, with the copy of
[copy.md](copy.md). What a frame shows of an item that stays out of scope is not built (FR-076; the
audit's F4 to F7, F12 to F20, F31). The screens keep spec 008's ids (S3 to S21); `U##` is a unit of
[../figma-audit/units.md](../figma-audit/units.md), whose file under `../figma-audit/units/` holds
the frame's inventory.

No route is added or changed. Every new page state keeps one `h1` and its tab title.

---

## Shared parts

### C1. Status pill and band (`ConnectionStatusBadge`, `StatusBand`)

- **Frames**: the header pill "Scheduled · 01.12.2026" E6 U99 `7114:49835`; the overview row
  `6739:40517`; the bands `7355:61158`, `7355:61822` (active), `7355:60692` (scheduled),
  `7355:60885`, `7355:61546` (deactivated), `7362:54712` (draft).
- **Change**: `ConnectionStatusBadge` takes the API's `state` (`draft`, `scheduled`, `live`,
  `deactivated`) and, for the header pill, the start date; `live` reads "Active". `StatusBand`
  gains the tone `scheduled` and renders the **date pill** under the status sentence: a calendar
  icon, the line of data-model §1.4 and, for a published connection, the ⋯ menu inside the pill
  (FR-015, FR-016). "Activate again" stands next to the pill while deactivated. A draft's pill has
  no ⋯. This replaces spec 008's chip at the band's right end (its Clarification #52).
- **States**: each status; the pill wrapped at 320 px / 200 % (W16): the line wraps, the ⋯ stays
  on the first row.

### C2. "Active from" (`components/ActiveFromChoice/`, new)

- **Frames**: P1 `6376:25342`, P1b `6383:66119`, P1c `6635:36265` (the error).
- **What**: a radio group labelled "Active from" with "Now" (selected at first) and "On a date";
  with "On a date", a text field with the placeholder "DD.MM.YYYY" under the radios, named for
  screen readers ([copy.md](copy.md) §2); a hint line whose text the caller gives per choice.
- **Rules** (FR-003): the field takes a day typed as `DD.MM.YYYY` (also `D.M.YYYY`);
  `startDateOf(text, today)` in the component's `utils.ts` answers the ISO day or the error. An
  empty field, today, a past day or something that is no date turns the field to its error state
  with "Enter a date after today." under it, announced (`errorRole="alert"`), when the dialog's
  button is pressed; the button stays enabled. Today is today in Germany, from
  `useTodayInGermany()`. The server's `400 invalid_start_date` shows the same error (the day
  changed while the dialog was open; W1). The choice and the text are the dialog's state, kept
  through a failure, so "Try again" repeats them (FR-014).
- **Used by**: the publish dialog (S14), "Change start date" (S15) and "Activate this connection
  again?" (S17).

### C3. Toasts (`components/Toast/`)

- **Change** (FR-082, F21): every toast closes by itself after `TOAST_DURATION_MS` (6 s), with or
  without an action; the time runs only while neither the pointer nor the keyboard focus is on the
  toast, as it does today for toasts without an action. This covers the deletion toasts, the
  document removal's "Undo", "Try again" after a failed save, the rules step's "Undo" and "Show".
- **What closing means**: the documents step's removal and the overview's deletion stand; the
  rules step keeps its Ctrl/Cmd+Z, as today.

### C4. The example banner (`components/ExampleBanner/`, new)

- **Frames**: 1h U18 `6798:122695`, 1i `7344:96396`, 1i-c `7344:96451`: an instance of
  "Rules/Findings banner" in its info look.
- **What**: information only: an icon and one sentence, no action, no close button (FR-058). Shown
  while the loaded draft's `example` is set, whatever was changed; never for a published
  connection (FR-059).

---

## Screens

### S3. Welcome page (`pages/FormConnectionList/WelcomePage.tsx`)

- **Frames**: 1b U11 `6699:44481` (`6699:44508`, `6793:47828`), 1g U18 `6793:47676`
  (`6793:47705`, `6793:47706`, dialog `6793:47710`).
- **Change** (FR-053, FR-054; F24, F28): "Start from an example" (secondary) beside "Create
  connection →" (primary). It opens the dialog "Start from an example?" with "Go back" and "Create
  the example"; "Go back", × and Escape close it without creating anything; a click on the scrim
  closes it too (it neither deletes nor publishes).
- **Creating**: "Create the example" calls `POST /api/form-connections/example` and opens the
  draft's edit route, the create flow at its stored step, step 1 (FR-055). While it runs the
  dialog is busy; a failure shows in the dialog as spec 008's failures do, with the error ID.
- **Not here**: the overview's footers keep "Create connection" only (FR-053).
- **After deleting the last connection** the welcome page shows with the deletion toast (S4).

### S4. Overview (`pages/FormConnectionList/`)

- **Frames**: rows in `6699:44240`, the scheduled row `6739:40517`, the draft row with its step
  `6699:48031` (in `6699:47943`); selection bar `6699:45199` (`6699:45206`); bulk dialog
  `6699:45259` (`6699:45320`); P18 `6699:48039` with the toast `6699:48098`.
- **The row's date** (FR-017, FR-019; F23, F42): `rowMetaOf()` reads the row's `state`: "Published
  <date>", "Active from <date>", "Deactivated <date>", "Edited <date> · <step> step"; a draft
  without a step reads "Edited <date>" alone. The status shows "Scheduled" for a scheduled row.
- **Selection** (FR-038 to FR-040; F26): a checkbox on every row and a select-all checkbox in the
  list's header, each named for screen readers ([copy.md](copy.md) §4). Select-all selects every
  listed row (the rows the search shows), clears the selection when all are selected and shows
  its mixed state while some are. The selection is the pure `selectionReducer` (`toggle`,
  `toggleAll`, `clear`, `prune`); `prune` runs when the list changes, so a row that left the list
  leaves the selection. It is never stored.
- **Selection bar**: while at least one row is selected it replaces the toolbar (the count and the
  search): "<n> selected" in a `role="status"` region, "Cancel", "Delete". "Cancel" clears the
  selection and the toolbar comes back with its search text. The rows' own actions stay.
- **"Delete"** with one row selected opens that row's own delete dialog; with two or more, the
  **bulk dialog** (FR-041 to FR-043; W12): "Delete <n> connections?", "Their documents and rules
  will be deleted too.", one line per connection with its name and status pill, a warning line per
  active or scheduled connection, "Keep connections" and "Delete connections". It follows the rule
  of dialogs that delete (`dismissOnScrim={false}`, nothing closes it while busy); a long list
  scrolls inside the dialog and the buttons stay in view. It sends each row's `id` and `state`.
  `409 selection_changed` keeps the dialog open with "Nothing was deleted: “<name>” was deleted or
  changed in the meantime." (the first changed id's name from the dialog's rows) and reloads the
  list behind it; another failure shows as spec 008's failures do, with the error ID.
- **After a deletion** (FR-033, FR-037, FR-044; W11): the rows are gone, the selection is cleared,
  the toolbar is back, and the toast reads "“<name>” deleted." or "<n> connections deleted." with
  "Undo". The page keeps the deletion's id with the toast. A deletion made on the details arrives
  the same way (`OverviewLocationState.deleted` carries the names and the deletion id).
  The toast is of the kind `danger` (red `#c4271c`, the white delete icon; P18 `6699:48098`), the
  restored toast `success`, the two failures `neutral` (design-notes §4.2, T038).
- **"Undo"** calls the restore endpoint. Success: the answered rows are put back into the list
  without a reload, the welcome page gives way to the overview, and a toast says "“<name>”
  restored.". `409 not_restorable`: "“<name>” can no longer be restored.", and nothing changes. No
  answer or a server failure: "Couldn’t restore. Try again.", with "Undo" again. A toast that
  closed, was replaced or was left with the page leaves the deletion standing (FR-036).
- **The local-drafts banner** (S5) stays between the title and the bar while rows are selected; a
  connection that exists only on this device is no row, so it is neither counted nor selectable
  (FR-081; W17).
- **Narrow** (W16): the selection bar wraps its buttons under the count; the row's checkbox keeps
  a 24 px target.

### S5. Local-drafts offer (`components/LocalDraftsOffer/`)

- **Frames**: 1m U16 `7362:54550`–`7362:54557`, 1n `7362:54621`–`7362:54634`.
- **Change** (FR-081; F43): none expected. The built banner already carries this wording in both
  languages; the task checks it against the two frames through the per-node loop and changes what
  differs. The tertiary button stays "Discard".

### S7. Step 1, S8. Step 2, S9/S11. Rules step, S13. Test step: the example's banners

- **Frames**: 1h `6793:47711` (step 1), rules `7344:96387`, `7344:96414`, `7344:96442`; the
  documents and test steps are not drawn (W15).
- **Change** (FR-058): `ExampleBanner` (C4) with "This is an example. Change anything to see how it
  works." on step 1, on the documents step above the list, and on the test step above the variant
  tabs; on the rules step, for Standard, "Try changing the age to 18 or adding a rule. Then use
  Test rules to check the result." and, on the example's variant, "Ambulance is more lenient than
  Standard. Rules 01 and 02 are changed here." ([copy.md](copy.md) §6: the variant is recognised by
  its name). Another variant shows no banner on the rules step.
- **The tabs** carry no finding icon and no count (FR-056; F29).

### S8. Step 2: Documents (`FormConnectionEditor/DocumentsStep/`), in the create and the edit flow

- **Frames**: R1 `7298:63317`, R2 `7298:63736`, R3 `7298:64157`; the grouped panels
  `7290:61214`–`7290:61255`, `7290:61956`, `7290:62357`, `7290:62967`, `7298:61791`,
  `7298:62400`–`7298:62447`, `7298:62579`–`7298:62613`, `7298:63343`–`7298:63380`,
  `7298:64184`–`7298:64220`, the edit flow `7296:52340`; build notes 19, 20, 37.
- **The list's order** (FR-045, FR-048; F25): the list shows the documents in the editor's array
  order. A document that is added goes to the end; removing one leaves the others; the removal's
  "Undo" puts it back at the index it had. The open document stays open through a move, and the
  pager counts in the list's order.
- **Dragging** (FR-046; R6): pressing a row and moving it with a mouse or pen drags it at once
  (after 4 px); on touch, after a press held for 400 ms without moving, while a shorter touch
  scrolls the list as today. While dragging, a line marks where the document will land and a faded
  copy of the row follows the pointer. Releasing inside the list moves the document; releasing
  outside the list, Escape, a lost pointer or a second pointer ends the drag with the order
  unchanged. With reduced motion nothing transitions and the drop just updates the list (F22).
- **Without dragging** (FR-047; W13): a ⋯ button on each row, named "Move <document>", with "Move
  up" and "Move down"; the first row has no "Move up", the last no "Move down"; with one document
  there is no ⋯. After a move, by menu or by drag, the focus is on the moved row's button and a
  polite region says "“<document>” moved to position <n> of <m>.".
- **Data groups** (FR-077, FR-079; F41, W18): a document whose `field_groups` is not empty shows
  its data items under the group headings, in the catalog's group order, flowing down the three
  columns; a group never splits across columns. Each heading is a checkbox: ticked when all of its
  data items are chosen, mixed when some are; ticking chooses all, clearing clears all. Clearing a
  group whose data a rule checks first asks the question that names the rules, as "All data items"
  does. A document without groups keeps today's flat list. The count line and "All data items"
  stay.
- **Both flows**: everything above works the same in the edit flow of a published connection
  (FR-049), whose frames draw no reordering.

### S14. Publish and save dialog (`FormConnectionEditor/PublishDialog.tsx`)

- **Frames**: P1 `6376:25342`, P1b `6383:66097` (dialog `6383:66119`), P1c `6635:36242`; the
  example's `7137:50083` (`7137:50210`); P5 `6376:27178` (the failure).
- **Publishing** (FR-001 to FR-003, FR-014; F3): the summary gains `ActiveFromChoice` (C2). With
  "Now": the sentence "When you publish, the connection is ready to be added to your services."
  and the button "Publish connection". With "On a date": "The connection becomes active on the date
  you choose. You get the links now, so your service can be ready in time." and the button
  "Schedule", which sends `start_date`. "Publish without rules?" gets the same group.
- **States**: summary; the field's error; "Publishing…"; "Published"; a failure. A server failure
  shows spec 008's alert with its error ID, which may wrap; the drawn sentence "Couldn’t publish,
  so nothing has changed. Check your internet connection and try again." shows only when no answer
  came (F2, W8). "Try again" sends the same choice.
- **Saving a published connection** (FR-009, FR-013; F8, F9, W6): no "Active from". For an active
  or deactivated connection the dialog is spec 008's; for a scheduled one its sentence is
  [copy.md](copy.md) §2's.
- **The example's line** (FR-060; F30): "This is still the example. Check that the name, documents
  and rules fit your service." shows while the loaded draft says `example: 'unchanged'` and the
  page holds no change against it; publishing still works.
- **Document lines** are in the stored order (FR-050).

### S15. Details of a published connection (`pages/FormConnectionDetail/`)

- **Frames**: scheduled `7246:52715`, `7246:53289`, `7246:53937`, `7246:54565`, P11 `6396:48548`;
  the ⋯ menu P14 `6417:30900` (`6417:31045`); "Change start date" P12 `6396:48739` (dialog
  `6396:48860`); the pills of C1; Activity open P10 `6396:48278` (rows `6396:48527`), scheduled
  `7246:53937` (rows `7246:54525`), deactivated `7246:56374` (rows `7246:56965`), closed
  `6809:46582`.
- **A scheduled connection** (FR-006, FR-007): the band "Your connection is scheduled", "The links
  are ready to be added to your service. They become active on the scheduled date below.", the
  pill "Active from <date>, 00:00"; otherwise an active connection's details, with every link and
  its copy button, the Summary, the Activity card and the footer.
- **The ⋯ menu** (FR-008, FR-009): scheduled and active: "Change start date", "Deactivate", a
  divider, "Delete connection". Deactivated: "Delete connection".
- **"Change start date"** (`StartDateDialog.tsx`, new): the title, "Choose when citizens can use
  this connection.", `ActiveFromChoice`, "Cancel" and "Save date". For a scheduled connection it
  opens with "On a date" and the stored date; "Now" makes it active at once (W2). For an active
  one it opens with "Now (active since <date>, <time>)" selected, saving with "Now" changes
  nothing, and "On a date" shows [copy.md](copy.md) §2's hint (F10). A scrim click closes it. After
  saving, the page shows the answered connection and the toast "Start date saved." (W3). Failures
  as S14.
- **The three cards** (FR-022; F40): Links, Summary and Activity are one accordion with at most
  one card open, on every details page: `DetailAccordionName` gains `'activity'`. The page reached
  after publishing or saving lands with Links open; opening another card closes it.
- **The Activity card** (`ActivityCard.tsx`, new; FR-022 to FR-024, W10): closed, the title, the
  line from `last_activity` ("Last edited by <person> · <date>, <time>", or "Deactivated by …"
  while deactivated, or the time alone) and "View activity". Open, "Hide activity" and the list,
  newest first, one row per entry: date and time, the event, the person
  ([copy.md](copy.md) §3). The first page loads when the card first opens; the list scrolls inside
  the card, can be scrolled with the keyboard, and loads the next page when its end comes into
  view, down to the oldest entry. Loading and a failure with "Try again" show inside the card. The
  card reloads after an action on the page changed the connection.
- **Arriving after "Schedule"**: as after publishing, with Links open.
- **Narrow** (W16): an entry's three parts stack; the card keeps no horizontal scroll.

### S16. Draft details (`DraftDetails.tsx`)

- **Frames**: `7362:54691`, the pill `7362:54712`.
- **Change** (FR-022): the Activity card after the Summary; Summary and Activity open one at a
  time. The draft's Links card stays as built, without a toggle. "Edit connection" shows for every
  team member (F31).

### S17. Confirmations

- **Delete** (FR-010): for a scheduled connection, the body "This connection will be active from
  <date>. If you delete it, it won't become active and its links won't work." in spec 008's delete
  dialog; frame `6872:45855` (dialog `6872:45929`). The other statuses keep their sentences (F35).
- **Deactivate** (FR-012; W5, F11): for a scheduled connection, [copy.md](copy.md) §2's sentence
  and "Keep scheduled". The toast stays "Connection deactivated.", without "Undo" (F13).
- **Activate again** (FR-011; W4): frame P16b `7173:52874` (dialog `7173:52959`): the summary, then
  `ActiveFromChoice`. "Now" with "Activate" as today. "On a date": [copy.md](copy.md) §2's hint,
  the button "Schedule", then the scheduled details and the toast "Connection scheduled for
  <date>.". Failures as S14; a failure leaves the connection as it was.
- **Edit entry** (FR-013; W7): for a scheduled connection, the details' title "Edit this scheduled
  connection?" and the body "Your changes only take effect when you save them. Saved changes
  become active on <date>."; the row's "Edit “<name>”?" stays.

### S18. Editing a published connection (`pages/FormConnectionEdit/`, the wizard in `published` origin)

- **Frame**: E6 U99 `7114:49683` (the header `7114:49835`).
- **Change** (FR-013; F4 to F7, W7): the header pill reads "Active", "Deactivated" or "Scheduled ·
  <date>", never "Draft changes"; the footer stays "Back · Discard changes · <next step> · Save".
  For a scheduled connection: step 1's note "Scheduled. Your changes become active on <date> once
  you save them.", the leave dialog's "… keep the scheduled version.", the discard dialog's "The
  connection goes back to the version that becomes active on <date>. Citizens aren't affected.".
  Saving never changes the date.

### S21. Approval page (`pages/Approval/`)

- **Frames**: none (W14); spec 007's page.
- **Change** (FR-050, FR-060, FR-065 to FR-067): the documents in the stored order; for `publish`
  and `reactivate`, "Active from <date>" or "The connection goes live at once." as part of what
  will happen; the new action `set_start_date` with its title and sentences; deactivating and
  deleting a scheduled connection with the dialogs' sentences; the example's line for an unchanged
  example; the outcomes and reasons of [copy.md](copy.md) §7. Approving a deletion offers no
  "Undo", and the page keeps saying "Deleting can’t be undone.".

---

## Verification

- **Every frame named above** goes through spec 008's per-node loop
  (`docs/FIGMA-WORKFLOW.md`): `get_design_context` and `get_screenshot` on the node, the numeric
  check, the screenshot comparison, at 1440 px, and the state at 320 px / 200 % by the narrow
  rules. Each task appends its table to `design-notes.md`.
- **Every W# state** is checked against the frame it is built from and the copy of
  [copy.md](copy.md), in both languages.
- **Keyboard**: every new control is reached and operated with the keyboard alone, with a visible
  focus ring: the radios and the date field, the ⋯ on the pill, the checkboxes and the selection
  bar, "Undo" in the toast (focusable while it shows), "Move up" and "Move down", the group
  checkboxes, the Activity list.
- **Announcements**: the selection's count, the move, the restore, the field's error, the
  activity's loading.

## Coverage of the audit's W items

| W# | Screen |
|---|---|
| W1, W8 | C2, S14, S15, S17 |
| W2, W3 | S15 |
| W4, W5, W7 | S17, S18 |
| W6 | S14 |
| W9 | C1, S4 |
| W10 | S15, S16 |
| W11, W12, W17 | S4 |
| W13, W18 | S8 |
| W14 | S21 |
| W15 | S7, S8, S9, S13 |
| W16 | C1, C2, S4, S8, S15 |
