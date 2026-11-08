# Contract: the management UI in the KERN Revamp design

**Users**: signed-in DO.IT team members, and an agent's user on the consent page.
**Requirements**: FR-001 to FR-052, SC-001 to SC-007, US1 to US5. **Decisions**: the spec's
Clarifications (2026-11-06 #1–#3, 2026-11-07 #1–#61), the audit's decided items
([../figma-audit/report.md](../figma-audit/report.md): F1–F72, W1–W22, C1–C7), research R1–R15.

**What decides what**: Figma "Middleware – V5" (file `s8mU9oJDq3411e8bxMjQO9`, page
`6263:12360`) decides layout, styling and wording, the Design Kit (`xqEw2Om11uKfESdRgTfuVe`) a
component's anatomy, and specs 001–007's `contracts/ui-screens.md` decide behaviour. A difference
is a decided item: an **F#** is built as the spec says with Figma's layout and styling, a **W#** is
built without a frame from the pattern it names, a **C#** changes copy outside the frontend too.
A task cites the screen (L#, S#), the units and frames it builds, and the items it meets; the
[coverage index](#coverage-index) at the end lists every item with its screens, and every item is
cited by at least one task.

**How to read a unit**: `U##` is a unit of [../figma-audit/units.md](../figma-audit/units.md);
its file in `../figma-audit/units/` holds the frame's inventory (one row per element, with node
ids), the mapping to requirements and the states no frame draws ("Missing here"). The build notes
(U01–U08) and the rule logic table (U09) are rules for every screen; a task reads the notes its
screen cites. Frame widths are 1440 px. Sample data in a frame (names, forms, dates) is not copy.

**Shorthand** (as in the report): wizard frames = U17–U79, U98–U100; rules frames = U17, U18,
U29–U64, U98–U100; test frames = U63, U65–U79, U99; details frames = U58, U63, U80–U99; overview
frames = U04, U11–U18, U90.

## Routes

No route changes (FR-003). What each route shows:

| Route | Screen | Change |
|---|---|---|
| `/login` | S1 | the sign-in frame |
| `/forgot-password` | S2 | the sign-in frame |
| `/` | S3 while no connection or draft exists, S4 otherwise (FR-027, research R6); the sign-in without a requested route lands here | the welcome page is new |
| `/get-started` | the first-connection flow in the wizard shell (L3), S7–S13 | opened by the welcome page's "Create connection" |
| `/form-connections/new` | the create flow, S7–S13 | four steps and the publish dialog (FR-025) |
| `/form-connections/:id` | S15 (published, deactivated) or S16 (draft) | the status band, accordions and tabs |
| `/form-connections/:id/edit` | S18 (published) or the draft flow at its stored step | entry confirmation, Save on every step |
| `/authorize`, `/account`, `/approvals/:id` | S19, S20, S21 | built without frames (W16) |
| any other | S22 | the baseline's redirect to `/` |

Every route sets its tab title "<page> · Konnekt" through `useDocumentTitle()` (FR-012, W2, C1)
and has one `h1`.

---

## Shells

### L1. Signed-out frame (`AuthLayout`)

- **Frames**: U10 `6401:27994` (sign-in), `6401:28457` (forgot password). **Build notes**: U02
  #11–#14 (the login art 331 × 617 px with the tagline "Connect to the EUDI Wallet" / "Receive
  verified citizen data with ease" in one row pinned left; the card 153 px from the right edge,
  centred vertically), U03 #33 (the Konnekt pill white, no account pill).
- **States**: 1440 px; about 1280 px (the image slides left); under 1024 px (image hidden, 80 px
  margins); 320 px at 200 % (W2: the card full width, nothing hidden).
- **Items**: F6 (no DE/EN switch), C1, W2, FR-010, FR-011.

### L2. Signed-in header (`TopBar`, `UserMenu`, `AppLayout`)

- **Frames**: every signed-in frame's header, e.g. U11 `6699:44242`, U13 `6699:44358` (the open
  menu), U17 `7173:52656` (inside a connection); **build notes** U03 #29–#40.
- **Anatomy**: two fixed 48 px pills 16 px from the top and sides; left "Konnekt" (home); right the
  account pill (person icon + chevron, white with a 12 % action layer; FR-030) whose menu shows
  the name in bold, "Your account" and "Log out" (F17: no email); inside a connection a second
  pill "Your connections / <name> · <status pill>" grows out of the Konnekt pill in 240 ms (U03
  #40, FR-050); the header area turns white when content scrolls under it (U03 #39); the name
  truncates with "…" (U03 #38).
- **Behaviour**: the product name and "Your connections" go home, except in a flow, where they
  run FR-026 (S6, S18); "Log out" asks "Save before you log out?" when a flow has unsaved changes
  (FR-026, F20) and shows "You're logged out." on the sign-in screen (FR-051 (30)); the sign-in
  guard is the baseline's (W2).
- **Items**: F6, F17, F19, F20, C1, FR-030, FR-050, W2.

### L3. Wizard shell (`WizardLayout`, `WizardProgress`, the footer)

- **Frames**: U19 `6699:45321` (step 1), U17 `6408:72716`, `7173:52656` (the leave dialog),
  `6401:71705` (saving), `6890:46052`, `6699:47943` (back on the overview with the toast); U63
  `7112:47827`, U67 `7058:60675` (the step header on later steps); U98 `6731:39821` (the edit
  flow's header with "Active"). **Build notes** U01 #14–#22, U02 #1–#4, U03 #42–#44.
- **Anatomy**: the compact step header "Step n of 4" (four 4 px segments 8 px above the title,
  `role="progressbar"` with `aria-valuenow`, "Next: <step>" / "Last step"; the title in
  `heading/large`, the description in `body/small`, no gap), sticky with a white background;
  the footer 72 px with 40 px buttons, sticky: Back and the step's primary action right, "Save
  and exit" tertiary at the left beside Back (cosmetic 17), "Discard changes" in the edit flow
  (FR-045); **the page scrolls** (research R4); the rules step pins the step head, the tabs and
  the selection bar; the step line is not clickable while creating and clickable while editing
  (F25); the details show no step line (FR-025).
- **States**: creating (the Draft badge after the first save, 005-S0), editing a published
  connection ("Active" in the header, F5), saving ("Save and exit" aria-disabled, "Saving…", the
  polite status "Saving draft…"; F21, W20), a failed save (the toast "Couldn't save. Check your
  internet connection and try again." with "Try again" and the error ID; F67, W20), loading and
  load errors of a flow (W10: skeletons, the alert with the error ID), the "Leave site?" warning.
- **Items**: F19, F21, F25, F67, W10, W20, FR-025, FR-026, FR-033, FR-050.

### L4. Details frame

- **Frames**: U80 `6396:47648`, U07 #5–#11. **Anatomy**: `WizardLayout`'s frame without a step
  line, an 832 px centred column, the status band (32 px status icon in its column, the h1 and
  the sub-line 4 px apart, padding 32, the picture bottom right in colour or grey; the ⋯ menu
  and "Activate again" at the right end, F66; no date pill, F52), the Links and Summary accordions
  (FR-046), the draft's footer (FR-049).
- **Items**: F1, F2, F52, F53, F66, FR-025e, FR-046, FR-049.

---

## Screens and behaviour

### User Story 1: sign-in, forgot password, welcome page, overview, local drafts

#### S1. Sign in (`/login`, `pages/Login/`)

- **Units**: U10 (`6401:27994` default, `6401:28088` filled, `6401:28182` error,
  `6401:28567` "After log in: loading your workspace", `7128:74204` "Logged out", the toast
  `7128:74220`). **Baseline**: 001-S1, 001-S0.1–S0.4; US1-AS1.
- **States**: default; filled; the request running ("Log in" busy, W2/FR-008); the failed
  sign-in: the alert "Username or password is wrong." / "Check both and try again." above the
  fields and **both** fields marked invalid (F16, C5); a server error with its error ID (FR-008,
  the design's alert); after sign-in the loading frame "Loading your connections…" with the 56 px
  spinner and no account pill (U10 #17–#18); after signing out, "You're logged out." as a toast
  (FR-051 (30)); the password toggle (FR-051 (29)) with an accessible name and state; "Your login
  is encrypted" (cosmetic 25).
- **Items**: F6, F16, C1, C5, W2, FR-023a, FR-051.

#### S2. Forgot password (`/forgot-password`, `pages/ForgotPassword/`)

- **Units**: U10 `6401:28457` (heading "Forgot your password?", "Ask your admin to reset it. Then
  come back and log in.", "Back to log in" tertiary small with the left arrow, card 240 px
  high). **Baseline**: 001-S2 (going back keeps the requested route).
- **Items**: C1, W2.

#### S3. Welcome page (`/` while empty; `pages/FormConnectionList/WelcomePage.tsx`)

- **Units**: U11 `6699:44481` (frame 1b; the h1 `6699:44486` "Welcome to Konnekt"), U18
  `6793:47676` (the same page in the example section; its "Start from an example" entry, the
  example dialog and banners are F15 and not built). **Build notes** U06 #85, #86.
- **Behaviour**: shown while no connection or draft exists (a draft counts, W11), after a sign-in
  without a requested route, and again after the last connection is deleted; "Create connection"
  opens the first-connection flow (`/get-started`) at step 1 with its loading state; the device
  remembers the state across a reload (research R6). The local-drafts offer (S5) shows above the
  page when the device holds unsaved work (005-S4, 001-S4.5).
- **Items**: F15, C1, W11, FR-027.

#### S4. Overview (`/`, `pages/FormConnectionList/`)

- **Units**: U11 (`6699:44240` with rows, `6699:44511`, `6699:44570`), U12 `6699:44915` (rows
  scroll inside the card), U13 (`6739:40517`, `7366:55201`, `6699:44299`: the scheduled row is
  F1, built as an active row; the open user menu `6699:44358`), U15 `6699:47845` (the search
  with results), U16 (the local-drafts banner, S5), U17 `6699:47943` (after Save and exit, the
  toast "Draft saved. You can pick it up any time."), U14 and U90 `6699:48039` (row delete,
  S17). **Build notes** U04 #16 (the toolbar), U07 #1–#3 (the status pill). **Baseline**: 001-S3,
  005-S3, 006-S2, 007-S6.
- **Anatomy and copy**: "Your connections" in `heading/x-large` with the `body/default` hint
  (one sentence for every state, FR-029a), the toolbar with the search (visible label, ×, "n of m
  connections", a no-results message, "Clear search"; F61, FR-051 (27)), the count (FR-051 (28))
  and "Create connection" with the arrow (cosmetic 1); rows of equal height (FR-029b) with the
  name, the description cut to one line with a hover tooltip holding the full text (FR-032,
  FR-051 (35)), the Status/Connection pill (Active, Draft, Deactivated; "Draft is blue"), "Edited
  <date>" (a draft adds " · <step> step", F71, FR-052d), the actions "View" / "Edit" (a draft's
  "Edit" opens its stored step, cosmetic 2) and "Delete" with a per-row accessible name (FR-028);
  no checkboxes or selection bar (F14); no "Published <date>" (F52); no Undo after deleting (F4).
- **States**: loading (skeleton rows, 001-S3.5); empty (the welcome page, S3, replaces the empty
  state); published, deactivated and draft rows; the search's no-results state; the error state
  with the error ID and the way back (W2); the delete dialog (S17); the local-drafts offer (S5);
  the after-save toast; 320 px at 200 % (W2).
- **Items**: F1, F4, F14, F52, F61, F71, C1, W2, W11, FR-028, FR-029, FR-032, FR-048, FR-051,
  FR-052.

#### S5. Local-drafts offer (`components/LocalDraftsOffer/`, on S3, S4 and `/get-started`)

- **Units**: U16 (`7362:54543` one draft, `7362:54614` several), U07 #12–#15. **Baseline**:
  005-S4, 001-S4.5.
- **Anatomy and copy**: one grey banner above the toolbar: "Unsaved changes in "<name>"" /
  "Unsaved changes in 2 connections", "Saved only on this device when the page closed. Nobody
  else can see them.", per item "Edited · …" / "New, never saved · …", "Discard changes"
  (tertiary) and "Resume editing" (secondary outline; also for a never-saved item, FR-029e);
  a single draft heading-only with the h2 and a one-item list for screen readers (FR-029d).
- **States**: one draft; several; the discard dialog, the status and focus after discarding,
  other tabs, blocked storage (W5, from U14's dialog and U16's banner).
- **Items**: W5, FR-029, cosmetic 4.

### User Story 2: the wizard shell, step 1 and the documents step

#### S6. Entering and leaving a flow (`pages/FormConnectionEditor/`, `pages/FormConnectionEdit/`, `pages/FirstConnection/`)

- **Units**: U17 (the leave dialog `7173:52681` / `7173:52682` "Leave this connection?"; the
  log-out dialog `6408:72737` / `6408:72919` "Save before you log out?"; saving `6401:71898` /
  `6401:71899` is F21, not built as a modal), U05 #41–#43, U06 #51, #57, #90, U07 #18
  (the info strip "Starts as a draft. It only becomes active when you publish."), U51
  `6197:11098` (the failed-save toast). **Baseline**: 005-S0, 005-S1, 005-S2, 005-S5, 005-S7,
  005-R; 002-S0.
- **Behaviour** (FR-026, research R9, data-model "Leaving a flow"): in a create or draft flow the
  product name and the breadcrumb open "Leave this connection?" ("If you leave now, you lose all
  progress. Save it to continue later, or discard the connection."; "Discard connection" danger
  outline, "Save progress" primary, ×); "Save progress" runs Save and exit (a missing name sends
  the flow to step 1 with "Enter a name for the connection.", F18, C7); "Discard connection"
  leaves and forgets the flow's local draft; log-out asks "Save before you log out?" ("Your
  latest changes will be lost if you log out now."; "Save and log out", "Log out anyway",
  "Cancel", F20); an open rule editor asks "Save changes to Rule 01?" first; closing the tab shows
  the browser's warning; the local draft is the safety net after a crash (the restore dialog W4
  from U17's dialog: Escape, × and the scrim open the draft's details and keep it, F57); the
  conflict dialogs W3 (`draft_changed`, `draft_published`, `draft_deleted`) from U90's dialog;
  the flow key `?local=` and the rest of W11.
- **States**: the leave dialog; the log-out dialog; saving; the failed save (toast); the restore
  dialog; each conflict; loading and load errors (W10); the first-connection flow's validation
  and reopening from a bookmark (W11).
- **Items**: F18, F19, F20, F21, F57, F67, C7, W3, W4, W10, W11, W20, FR-026, FR-033.

#### S7. Step 1: Connection (`ConnectionStep.tsx`)

- **Units**: U19 (`6699:45321` default, `6809:46378` the name ⓘ, `6699:45350`, `6699:45379`
  the missing name, `6716:40925`), U18 `6793:47711` (the step with the example banner, F15);
  U98 `6731:39821` (the edit flow's step 1 "Connection details" / "Rename this connection or
  update its description."). **Build notes** U04 #18, U07 #16, #18. **Baseline**: 001-S5.1–S5.4,
  006-S1, 005-S1.2–S1.3.
- **Anatomy and copy**: "Connection name" with its ⓘ (the frame's text, F60) and "Description
  (optional)" as a multi-line textarea (≤ 500 characters, spell check on, placeholder "e.g. For
  people who live in the area and park on the street") with "About the description" / "A note for
  your team, such as the form's ID in your form management system. Citizens never see it."
  (FR-032, F60); the info strip "Starts as a draft. It only becomes active when you publish."
  (blue ⓘ, create flow only); the footer "Choose documents →".
- **States**: empty; the missing name "Enter a name for the connection." (C7) with the field
  focused; the too-long name and description (W10); the API's 400 message (W10); the edit flow's
  note (S18).
- **Items**: F15, F18, F60, C2, C7, W10, W11, FR-023g, FR-032.

#### S8. Step 2: Documents (`DocumentsStep/`)

- **Units**: U20 (`7290:60367` no documents, `7290:60503`, `7290:60724`, `7290:60968`), U21
  (`7290:61188`, `7290:61915` Personal ID added; the search card with "Added (n)",
  `7290:62277`–`7290:62279`), U22 (`7290:62332`, `7290:62942` two documents), U23 (`7298:61765`
  the remove confirmation "Keep document" / "Remove document", `7298:62196`), U24 (`7298:62374`,
  `7298:62552` removing a document rules use: 002-S1.1's dialog), U25 (`7298:62636`,
  `7298:62814`; the dialog `7299:52174` "No data selected in 1 document"), U26 `6324:40326`
  (deselecting data rules check), U27 and U28 (drag reordering: F23, built in catalog order), U98
  `7296:52315` (the edit flow). **Build notes** U04 #19–#20, U01 #16. **Baseline**: 001-S5.3,
  002-S1, 005-S8, 004-S1.1 (dropped).
- **Anatomy and copy** (FR-031, research R8): the master-detail list with the "Document n of m"
  pager and "Added documents (n)"; the search card with "Available (n)" / "Added (n)" and "No
  documents match "…"."; per document "6 of 25 data items chosen" / "No data items chosen yet"
  (FR-051 (37)); inline trash with the undo toast; the footer "Set rules →" disabled with "Add a
  document first"; the empty panel's picture (U02 #19); fields in catalog order without group
  rows (F24), no "Coming soon" (F3), no drag handle (F23), no "Publish without rules" (FR-031).
- **States**: no document; a document added; two; hover (the trash); the removal confirmation;
  removal that rules use; a document without data ("1 document needs data", the dialog "Choose
  data" / "Remove 1 document" / "Remove <n> documents", F67); the undo toast; data the catalog no
  longer offers (W6: the warning alert listing the data with "Remove it"); at ≥ 800 px tall the
  panels fill the viewport and their lists scroll (U01 #16); 320 px at 200 %.
- **Items**: F3, F23, F24, F67, F72, C2, W6, FR-031, FR-051.

### User Story 3: the rules step, the rule editor, the variants, the findings and the test step

#### S9. Rules step: frame, list, groups, menus, select mode (`RulesStep/`)

- **Units**: U29 (`6504:43833` "No rules yet" `6504:43841`, `6348:40219`, `6348:40238`,
  `6348:40523`), U34 (`6094:6127`, `6094:6597`, `6113:28651`, `6113:29018` groups and a
  sub-group; the delete dialog `6113:29056`), U35 (`6113:29132`, `6324:39032`, `6965:49996`,
  `6965:50045` rule deleted and undo; the group message `6324:39410`), U36 (`6344:53506`,
  `6344:53530`, `6344:53560`, `6344:53590`, `6344:53624`, `6344:53658` select, group,
  sub-group; select mode inside a group `6616:44240`), U43 (`6168:7004`, `6168:7263`,
  `6168:7666` simple cases), U50 (`6197:10682`, `7173:52316`, `7375:101511`, `6197:10963` data
  no longer requested), U51 (`6197:11060`, `6197:11403`, `6197:11646`, `6197:11760` saving
  failed), U54 `6522:33105` (build note 10, the menus), U55 (`6530:40150`, `6522:32038`,
  `6531:39026`, `6522:32382` rule menus), U56 (`6522:32498`, `6522:32594` sub-group menus), U57
  (`6522:32682`, `6522:32774`, `6522:32862` a variant's changed rule), U58 (`6522:32977`,
  `6522:33080`, `6530:40675` a variant's changed group), U64 (`6524:38299`, `6524:38489`, the
  note `6524:38720` the sticky selection bar), U98 `6730:39122` and U99 (the edit flow's rules
  step). **Build notes** U01 #17–#22, U03 #17–#18. **Baseline**: 002-S2, 002-S4 (marks), 003-S2,
  004-S2, 007-S4, 007-S5.
- **Anatomy and copy**: the title "Set eligibility rules for citizens" and the intro naming
  Konnekt (C1, C2); the variant tab row from the start (F26; S11); the rule rows with statements
  in the design's form (C3), "Message for citizens:" (C2), the ⋯ menus per FR-036 (data-model
  "The rules step's menus"; F29, F30, F68, F69, W22; "Copy link" everywhere, 007-S4); the AND/OR
  connector pill with its two-option menu and "Applies to every rule in Group 01" (FR-038);
  groups with "At least one rule must be met" / "All rules must be met" and the note "Group 01
  now needs only one rule to be true." (FR-051 (32)); the group message hiding its members'
  messages with "Not shown while this rule is in Group 01. Citizens see the group message
  instead." (F32); select mode with checkboxes on rules and groups (F33), the sticky bar "Choose
  at least one more rule to group with Rule 03." / "2 rules selected. They become a sub-group of
  Group 01." and "Group rules"; the toasts "Rule 03 deleted." (Undo), "Rule 02 and Rule 03 are
  now in Group 01.", "Ungrouped. Rules 03 to 05 use their own messages again.", "Rule 01 saved."
  (cosmetic 8); "Test rules" disabled while a rule is open, incomplete or in error, or while
  grouping, with "Save the rule first" / "Finish grouping first" on hover and focus (F65, W21);
  no identifiers in the step (F35); the unrequested-data banner "Rule 02 in Standard checks data
  that's no longer requested. Add it again in Documents, or edit or delete the rule." with the
  "Add it in Documents" action (F58, C5); the delete-rule dialog "Delete Rule 03?" with the
  current body, U47's body for a Standard rule with variants, no effect sentence (F70).
- **States**: no rules; rules and groups; a sub-group; select mode (top level, inside a group);
  a rule deleted with undo; a group message; data no longer requested; saving failed; the delete
  dialogs; the deep-link notices "This link points to a variant / a rule or group that no longer
  exists." with "Dismiss" and the highlighted item (W15; `FormConnectionEdit`'s `LinkNotice`);
  reserved names, undo-able names, focus after a refused attempt, Standard's delete-group dialog
  naming variants, the switched top-level AND/OR and its badge (W12); the pinned head, tabs and
  bar while scrolling.
- **Items**: F7, F8, F9, F26, F29, F30, F31, F32, F33, F35, F58, F65, F68, F69, F70, C1, C2,
  C3, C5, W12, W15, W21, W22, FR-034, FR-036, FR-037, FR-038, FR-051.

#### S10. Rule editor (`RulesStep/RuleEditor/`)

- **Units**: U30 (`6348:40735`, `6348:40876`, `6350:41089` ≥ 21 years, hints and message), U31
  (`6350:41330`, `6635:36492`, `6350:41631`, `6350:41916` choose data), U32 (`6350:42354`,
  `6350:42627`, `6350:42833`, `6357:43090` years ago, ready to save, the values picker), U33
  (`6357:42622`, `6357:42881` text checks), U48 (`6191:42065`, `6191:42259` list values), U49
  (`6196:10232`, `6196:10383`, `6196:10567` empty field, "Save rule" disabled), U53
  (`6324:15410`, `6324:15653`, `6324:16908`, `6324:17351`, `6324:17627` other kinds of data),
  U09 `6986:50041` (the rule logic table: the menu words, the proposed messages). **Build
  notes** U03 #1–#16. **Baseline**: 002-S3, 003-S3.
- **Anatomy and copy**: the pickers unlocking in order, inline flags, the counting and missing
  notes on date conditions, "Choose part" after "Licence classes", the placeholder "Message for
  citizens: Suggested once you choose a check. You can edit it.", class options "B Cars up to
  3.5 t" (W19); the values picker with "Done" (FR-039); "Discard rule" (FR-051 (36)); the hints
  "Licence classes has parts. Choose the part to check.", "Citizens who turn 21 that day count."
  (F59), the born-between hint and the date hint "Check the time since or until this date, or
  compare it with a fixed date." (F34); the Date of birth keeps "Time ago" / "Time from now"
  (F34; "Time passed / Time left", "at most", "on", a unit picker and "starts with" are not
  built); the field errors under the field ("Enter a whole number greater than 0.", F58, C5;
  "There's already a rule called "Rule 02" in Standard."); the statement preview in the design's
  form (C3); "Need other data? Add it in Documents" asks "Save changes to Rule 01?" first
  (cosmetic 9).
- **States**: new rule; each kind of condition (age, date, text with "Match letter case", number,
  licence classes with its part, lists, place of birth); the values picker open; errors; "Save
  rule" disabled with its explanation (W21); the message edited.
- **Items**: F34, F58, F59, C2, C3, C5, W19, W21, FR-039, FR-051.

#### S11. Variants: tabs, dialogs, copying, the link strip (`RulesStep/` tabs, `VariantDialog`, `CopyPopover`, `LinkStrip`)

- **Units**: U37 (`6134:8515`, `6139:32650` the variant dialog, `6134:8628`, `6643:37123`; the
  ⓘ text `6151:33820`), U38 (`6134:9066`, `6148:4545`, `6163:4850` two variants), U39
  (`6163:5419`, `6163:5841`, `6324:39426`, `6344:53697` a variant's group logic changed), U40
  (`6344:53751`, `6344:53811`, `6961:56291` select in a variant), U41 (`6344:53874`,
  `6344:53928` the copy-to-variant popover, `6344:53989`), U42 `6344:54043` (the copy), U47
  (`6185:8555`, `6185:8805`, `6185:41146`, `6185:41589` removing in variants; the
  delete-Standard-rule body `6185:8847`), U52 `6197:11969` (the dialog's name error), U59
  (`6523:37251`, `6523:37385`, `6523:37532` the tab ⋯: F28), U60 (`6523:37675`,
  `6523:37818`, `6790:44983` rename, name taken), U61 (`6523:37941`, `6545:39421` deleted,
  the toast with Undo), U62 (`7112:47821`, `7112:48216`, `7112:48608`, `7112:48676` renaming
  Standard). **Build notes** U05 #1–#5. **Baseline**: 002-S4, 003-S4.
- **Anatomy and copy**: the tab row "Standard", the variants, "+ Add variant" and the ⓘ "A
  separate set of rules for citizens with different requirements. Each variant gets its own
  result link." (F27); Standard's (i) only with a description; every tab's ⋯ (Rename → the "Edit
  variant" dialog, Delete, "Copy link"; F28, F10); the variant dialog ("Variant name",
  "Description (optional)" textarea, "Start with" preselecting "Linked to Standard
  (recommended)", FR-052h; the duplicate error "There's already a variant called "Ambulance"."
  next to the field, W18, C5); the marks "Changed here", "Added here", "Removed here" with their
  texts (report cosmetic 8; T019 2026-11-08), "Linked to Standard", the link strip with "2 of 3 Standard rules are removed here."
  (FR-051 (38)), faded connectors (FR-051 (39)); the copy-to-variant popover with its help text
  and the based variants included (W17, FR-040); "Reset to Standard", "Remove from <variant>",
  "Restore …" (cosmetic 8); after deleting a variant, the tab to the left opens and the toast
  offers Undo (FR-051 (33)); removed items keep their message line and "Changed here" (F36); a
  Standard-based variant stays linked when Standard has no rules (F37).
- **States**: no variant; the dialog (new, edit, name missing, name taken); two variants; a
  changed rule and group in a variant; removed items; the popover; a deleted variant with undo;
  renaming Standard; propagation when Standard removes a rule and an inherited group dissolving
  (W12); the tab's problem icon and ⓘ (S12).
- **Items**: F10, F26, F27, F28, F36, F37, F68, C2, C5, W12, W17, W18, FR-035, FR-040, FR-051,
  FR-052.

#### S12. Findings: banner, notes, outlines, tab icons, tooltips (`FindingsBanner`, `FindingNote`, `BranchName`)

- **Units**: U44 (`6171:6749`, `6171:7064`, `6171:7535` a conflict: no citizen can meet Standard;
  the banner `6750:40882`), U45 (`6178:7800`, `6753:40127`, `6753:40497`, `6753:40834`
  redundant only; `6753:40144`), U46 (`6753:41307`, `6753:41595`, `6758:43049` the tab
  tooltip `6758:43524`, `6758:43539` duplicates only), U50 (the unrequested banner), U85
  (the details, S15), U71 (the test tab, S13). **Build note** U06 #7–#9 (note 26). **Baseline**:
  003-S2, 003-S4, 003-ACC, 003-CP.
- **Anatomy and copy**: the banner with one sentence per finding in the design's texts ("Rule 01
  and Rule 02 contradict each other, so no citizen can meet the rules of Standard.", "… so right
  now …" for today-only findings), the counts row "2 rules contradict each other, and 1 rule is a
  duplicate" (C4), the names as links that scroll to and focus the item (F39), each line's kind
  icon; the notes under rules and groups; the outlines; the tab's red error icon with the problem
  text in its tooltip, the grey ⓘ without findings (FR-041b: the merged icon of 003-A6, its tooltip
  holding the description or "No findings."; on Standard only with a description, FR-035c), opening
  on hover and on focus; the
  hidden kind text, a notice without links, update in place, the status region, the tab's
  accessible name, reflow, the undrawn texts (W13).
- **States**: conflict; redundant only; today-only conflict; duplicates only; no findings; an
  unselected tab with an icon; the tooltip.
- **Items**: F39, C2, C4, W13, FR-041, FR-047 (S15).

#### S13. Test step (`TestStep/`)

- **Units**: U65 (`7057:58709`, `7057:59123` Mia; the data card `7057:58772`, `7057:59071`,
  `7057:59079`, `7057:59186`; the result heading `7057:58811`), U66 (`7057:59536`,
  `7058:60514` Yusuf without a driving licence; the edit-data dialog), U67 (`7058:60670`,
  `7058:60945` a date that doesn't exist, "Save and test"; `7058:60806`, `7058:60824`), U68
  (`7058:61209`, `7057:59952` "Generate again" asks first), U69 (`7057:60393`, `7057:60828`
  Ambulance · Anna), U70 (`7057:61267`, `7057:61659`, `7057:62051` a variant without rules), U71
  `7058:61372` (contradicting rules: the ⚠ on the tab `7058:61618` and its tooltip
  `7058:61632`, no line above the heading), U72 `7058:61648` (12 rules: the panel scrolls), U74
  (`7062:50960` loading, `7062:51249` one persona, `7062:51536` "Couldn't create sample
  citizens"), U99 `7114:49683` (the edit flow). **Build notes** U06 #29–#44. **Baseline**:
  004-S8, 004-S2, 004-ACC.
- **Anatomy and copy**: "Test rules with sample citizen data" and the intro (cosmetic 12, C2);
  the persona chips with name and outcome icon (F44), "Generate all" / "Generate again" /
  "Generate all again" in every results state (F45); the data card as a flat list with the C6
  formats and the document's name as the row group's accessible heading (F63, FR-043); the
  result heading "Result: doesn't meet 2 rules"; result rows with the statement (C3), "Not met" /
  "Couldn't be checked" as text with the icon and tint, and the message (F42); no success box
  (F41); "Edit data" opening the dialog "Change the values to try a particular case. Results
  update when you save." with "Cancel" / "Save and test", classes picked by code, Nationality and
  Expiry date fields, "Class B since" (F40, FR-042), the toast "Results updated. Mia now meets
  Rule 01."; the test-day line "Tested as if shared today, 01.11.2026."; no variant ⓘ (F27); the
  tab's "no citizen can meet" finding from the evaluator only (F38, FR-041), no line above the
  heading (Clarification #50); the panel scrolls, header, tabs, chips and footer stay (F43);
  "Publish" opening the publish dialog (S14).
- **States**: loading (first open; one persona regenerating with the ring and the test-day
  line, F45); generation failed; met; not met; couldn't be checked; a variant without rules
  ("<variant> has no rules yet, so every citizen meets it. …"); the edit dialog with an error;
  the regeneration question only when there are changes; the "all" dialog, clearing fields,
  class dates coming back, group members, the name kept, arrow keys, focus (W14); many rules.
- **Items**: F11, F27, F38, F40, F41, F42, F43, F44, F45, F63, C2, C3, C4, C6, W14, FR-041,
  FR-042, FR-043.

### User Story 4: the publish dialog, the details, the draft details, the confirmations and the edit flow

#### S14. Publish and save dialog (`PublishDialog.tsx`)

- **Units**: U73 (`7058:61995`, `7137:50083` from the test step, "Back to test"), U63
  (`7112:48724`, `7112:48860` summary and findings after renaming Standard), U75 (`6376:25342`,
  `6383:66097` Standard only), U76 `6635:36242` (the go-live date: F1, not built), U77
  (`6376:25752`, `6760:47924` warnings per variant), U78 (`6376:26326`, `6376:26662`
  publishing, can't close), U79 `6376:26984` (couldn't publish). **Baseline**: 002-S5, 003-S5,
  004-S5, 005-S2.
- **Anatomy and copy** (FR-044, data-model "The publish dialog"): the counts "7 data items",
  "Standard · 2 rules"; the findings lines warnings first in C4's texts ("Ambulance: no citizen
  can meet these rules. 2 rules contradict each other, and 1 rule is a duplicate.", F47); "Back to
  test" and "Publish connection"; "Publishing… This takes a few seconds." with the loader and no
  close (FR-051 (41)); "Published" and "Opening your connection page…" for 0.5 s; "Couldn't
  publish. Check your internet connection and try again." with the error ID and the summary kept
  (F46); no "Active from" (F1); the older persona cards and data columns in U75–U79 are F44 and
  F63; "Publish without rules?" and the `rules_changed` conflict (W7); the save dialog "Save
  changes?" in the edit flow with the same states (FR-045).
- **States**: summary (Standard only; with variants and warnings); publishing; published; failed;
  without rules; conflict.
- **Items**: F1, F42, F44, F46, F47, F63, C3, C4, W3, W7, FR-044, FR-045.

#### S15. Details of a published or deactivated connection (`pages/FormConnectionDetail/`)

- **Units**: U80 (`6396:47648`, `6809:46423` published; the "Request link" ⓘ `6809:46501`), U81
  (`6809:46512` the "Result link" ⓘ `6809:46555` / `6809:46590`, `6396:47768` "✓ Copied"
  `6396:47841`), U82 `6396:47966` (Summary open, Standard), U83 `6648:68395` (Ambulance tab,
  changed rule), U84 `6648:68792` (new rule), U85 `6760:48437` (findings on the published
  summary), U86 (`6396:48278`, `6396:48548` Activity: F2, not built), U87 (`6396:48739`,
  `6396:48909`: "Change start date" is F1; the edit entry dialog `6396:49030` is S17), U88
  (`6417:30900`, `6417:31060` the ⋯ menu: Deactivate, Delete), U89 (`6417:31278`, `7173:52874`
  deactivated: links off, "Activate again"), U90 `6417:31453` (delete, S17), U91 (`7203:50468`,
  `7246:50864` from "View": Summary open), U92 (`7246:51510`, `7246:52136`), U94–U97 (the
  scheduled frames are F1, built as active; the deactivated frames `7246:55146`, `7246:55723`,
  `7246:56374`, `7246:57005`), U99 `6730:39732` (after saving: "Changes saved."). **Build
  notes** U03 #25–#28, U07 #5–#11. **Baseline**: 001-S6, 002-S6, 003-S6, 006 details header,
  007-S4, 007-S6.
- **Anatomy and copy** (FR-046 to FR-048): the status band with the status sentence as the h1
  ("Your connection is active", the deactivated sentence) and its sub-line, the picture, the ⋯
  menu at the right end ("Deactivate" / "Delete"; "Activate again" before it while deactivated,
  F66); the name and status in the header pill, the description meta (W10); the Links accordion
  "Links for your service" with "View links" / "Hide links", the heading count "1 request link ·
  3 result links" (FR-052f), the "Request link" ⓘ, the "Result link" ⓘ "Your service gets the
  citizen's shared data from this link. Each variant has its own." (Clarification #49), result
  links grouped per variant with a branch ⓘ (F51), one-line URLs cut with "…", the copy buttons
  reading "✓ Copied" for 2 s (FR-048), disabled while deactivated with their explanation; the
  Summary accordion with the documents, the counts "2 documents · 9 data items · 3 variants · 4
  rules", the rules as variant tabs with read-only rows (U03 #25–#27: no menus, no "+ Add
  variant", the connector without the arrow, the marks kept), the identifiers "rule-7" next to
  each name (F35), the findings lines and tab icons from the checks run in the browser (FR-047,
  S12); one "Edit connection" (after the entry confirmation, S17); no Activity (F2), no PDF
  (F53), no "Active since" pill (F52), no "Create new connection"; the Documents and Rules
  headings in action blue (U03 #28).
- **States**: active (Links open from the publish dialog; Summary open from "View"); deactivated;
  each variant tab; findings on the summary; "✓ Copied"; the menu; loading; the error state and
  the deleted or unknown connection with the way back (W2); long names and URLs; 320 px at
  200 %.
- **Items**: F1, F2, F35, F50, F51, F52, F53, F66, C2, C3, C4, W2, W10, FR-046, FR-047, FR-048,
  FR-052.

#### S16. Draft details (`DraftDetails.tsx`)

- **Units**: U93 (`7362:54691`, `7362:54923`; the band `7362:54697`, the Draft badge in the
  breadcrumb `7362:54693`, "Edit connection" `7362:54920`, "Go to connections →" `7362:54922` /
  `7362:55154`). **Build notes** U07 #22–#28. **Baseline**: 005-S6, 006 details header.
- **Anatomy and copy** (FR-049): "This connection is a draft" as the h1 in the status band with
  "Edited <date>" and the sub-line "The links can't be added to your services yet. …", the grey
  picture, no ⋯; the name with the Draft badge in the breadcrumb and the tab title; the Summary
  open first, the Links card "Created when the connection is published and active." with no
  links; the footer "Edit connection" (secondary) and "Go to connections →" (primary); a visible
  "Delete draft" (F56); rule placeholders for incomplete rules and the delete errors 409 and 404
  (W8); no step line (FR-025e); no Activity (F2), no PDF (F53); the view-only variant is F12.
- **States**: a complete draft; an incomplete one (placeholders); the delete dialog (S17) and its
  errors; loading and the error state (W2, W10).
- **Items**: F2, F12, F53, F56, W2, W8, W10, FR-049.

#### S17. Confirmations: delete, deactivate, reactivate, edit entry (`ConfirmDialog`, the pages' dialogs)

- **Units**: U14 (`6699:44359`, `6699:44420`, `6872:45855` "Delete connection" / "Keep
  connection" for a draft and a deactivated connection; the dialog `6699:44480`), U90
  (`6417:31453` from the ⋯, `6699:48039` from the row; the body `6417:31599`), U88 `6417:31206`
  (deactivate: F13's body), U89 `7173:52874` (reactivate with the documents and rules summary,
  FR-051 (40); `6417:31343`), U15 (`6699:47845`, `6699:45199`, `6699:45259`) and U87
  `6396:49030` (the edit entry "Edit "<name>"?" with "Cancel" / "Edit connection", F48, and the
  body of cosmetic 14), U100 `7173:52746` ("Discard your changes?", S18). **Baseline**: 001-S6.9,
  001-S6.11, 005-S6.10, 002-S7.3.
- **Copy**: as the design writes it (Clarification #38; the noun per C2): the delete body
  "<name> will be deleted for good. It was never live, …" for a draft (F55), the design's body
  for a published or deactivated connection; the deactivation body "The connection will be
  deactivated and its links will stop working at once. Requests in progress are cancelled.
  Remember to remove the wallet connection from your service." (F13); the reactivate dialog with
  its summary; no Undo after deleting (F4) or deactivating (F54); a scrim click closes the edit
  entry and the reactivate dialogs but not the delete dialogs (FR-052a); the toasts after each
  action (FR-051 (42)).
- **States**: each dialog; working; a failure with the error ID (FR-008); focus returned to the
  opener (FR-009).
- **Items**: F4, F13, F48, F54, F55, C2, FR-028, FR-029c, FR-038, FR-051, FR-052.

#### S18. Editing a published connection (`pages/FormConnectionEdit/`, the wizard in `published` origin)

- **Units**: U98 (`6731:39821` step 1 "Connection details", `7296:52315` documents,
  `6730:39122` rules with Save, `6730:39438`), U99 (`6730:39732` back on the details with
  "Changes saved.", `6890:46197` E5a is F5, `7173:52810` E5b with the dialog `7173:52836`
  "Save your changes?", `7114:49683` the test step), U100 `7173:52746` ("Discard your
  changes?"), U15 (the entry from the row). **Build notes** U05 #26–#36, U06 #65. **Baseline**:
  002-S7, 004-S7, 003-S7, 005-S0.7, 001-S5.9.
- **Behaviour and copy** (FR-045, FR-026): the entry confirmation (S17); "Active" in the header
  (F5: no "Draft changes"); the note "Your changes take effect when you save them. Requests
  already in progress keep their previous configuration." (F49); Save on every step opening
  "Save changes?" from the current step, on the rules step disabled while a rule is open,
  incomplete or in error, or while grouping, with its explanation (F65, W21); "Discard changes"
  in every footer with "Discard your changes?" ("…goes back to the version that's active now.
  Citizens aren't affected."; "Keep editing" / "Discard changes"); leaving through the product
  name or the breadcrumb asks "Save your changes?" ("If you leave now, your changes are lost.
  Save them, or discard them and keep the active version."; "Discard changes" danger outline,
  "Save" primary, ×; F64); no Save and exit (005-S0.7); the step line clickable (F25); the checks
  when the flow opens and "Try again, or save without testing." (W9); the new revision and the
  `rules_changed` conflict (W3, W7); deep links opening the rules step (W15).
- **States**: each step in the edit flow; the leave dialog; the discard dialog; the save dialog
  and its conflict; the disabled Save; back on the details with the toast.
- **Items**: F5, F25, F49, F64, F65, W3, W7, W9, W15, W21, FR-026, FR-034, FR-045.

### User Story 5: the consent, account and approval pages (W16, no frames)

Built from the components and patterns the design establishes (design-notes §3): the card, the
radio group (`AccessLevelChoice` on the kit's radios, build note 2), list rows with a ⋯ menu as
the rule rows have, the dialogs, the copyable read-only field with "✓ Copied" (FR-048), the
alerts with the error ID (F22), the toasts. The wording is spec 007's with the product name per
C1 ("{client_name} wants to act on your behalf in Konnekt. Choose what it may do."; "No agent is
connected yet. Add Konnekt's MCP server to your agent to connect it."), the noun per C2 and the
findings per C4. Each page keeps its one `h1`, its tab title and every state of 007.

#### S19. Consent page (`/authorize`, `pages/Authorize/`)

- **Baseline**: 007-S1.1–S1.12, 007-R.1; US5-AS1. **States**: the request with the three levels
  preselected from the scope; the step-up line; allow and deny with the redirect; the invalid
  request shown on the page; the failed authorization with its error ID (007-S1.11, F22).
- **Items**: W16, F22, C1, C2.

#### S20. Account page (`/account`, `pages/Account/`) and the menu entry

- **Baseline**: 007-S2.1–S2.15, 007-R.2; US5-AS2. **States**: empty (the Konnekt sentence);
  agents and tokens listed with their menus; "Change access level", "Revoke", "Create token", the
  token shown once in its dialog with the copyable field; each dialog's failure.
- **Items**: W16, F17 (the entry "Your account" in the user menu), C1, C2, FR-048.

#### S21. Approval page (`/approvals/:id`, `pages/Approval/`)

- **Baseline**: 007-S3.1–S3.26, 007-R.3; US5-AS3. **States**: each action's body (publish with
  the stored draft's summary in the publish dialog's style and the findings per C4; the others
  with the connection and its URLs); approve and decline; working; done, declined, expired,
  replaced, cancelled with its reason, another team member's request, failed with "Try again" and
  the error ID (007-S3.25 per FR-033).
- **Items**: W16, F22, C1, C2, C3, C4.

### Cross-cutting

#### S22. Not found, the sign-in guard, errors, tab titles, reflow

- **Baseline**: 001-S0.1–S0.4, 001-S3.7, 001-S6.14, 001-S7.10, 001-S7.11, 005-ACC.4, EC-6.
- **Behaviour**: the guard as today (W2); an unknown route redirects to `/`; `NotFound` in the
  design's alert and empty-state style; every error state uses the design's alert with the error
  ID and the way back (W2, F22); every route's tab title (W2, C1); the footer wraps and "Save and
  exit" keeps its label (005-ACC.4); below 1024 px down to 320 px at 200 % zoom the layout
  reflows by the design's spacing with nothing hidden (W2, FR-010); light only (FR-011).
- **Items**: W2, F22, C1, FR-010, FR-011, FR-012.

#### Patterns every screen uses

Alerts (title-only vs with a body, F22), toasts (announced; with actions), dialogs (the kit's
set; the scrim rule FR-052a), menus and tooltips placed with class sets (build note 3, R10; on hover, focus
and touch, FR-052g), disabled buttons' explanations (FR-052b, W21), skeletons (U06 #95, U74),
the status pill (U07 #1–#4), dates as dd.mm.yyyy (cosmetic 3), a page change scrolling to the
top (FR-052c), the motion rules (FR-050, F62), AA contrast (W1). Their anatomy is in
[../design-notes.md §3](../design-notes.md#3-patterns-for-the-states-the-design-does-not-draw).

---

## Components

The kit's pages and where the app uses them; the build option per component is decided in
[../design-notes.md §2](../design-notes.md#2-component-decisions).

| Kit page | Component(s) | Used on |
|---|---|---|
| P06 Accordion | the details' Links and Summary (`ConnectionLinks`, `RulesSummary`) | S15, S16 |
| P07 Alert | `ErrorNoticeText`, `FormConnectionLoadState`, the warning and info alerts, `LinkNotice`, `UnrequestedBanner` | every screen (F22) |
| P08 Badge | the Draft badge in the breadcrumb, "Meets the rules" / "Doesn't meet the rules" (U07 #4) | L2, S13 |
| P09 Button | every button; the 40 px footer buttons (option b); the danger outline | every screen |
| P10 Card | the sign-in card, the overview's list card, the search card, the documents panels, the status band, the persona panel, 007's cards | S1–S21 |
| P11 Description List | the reactivate summary, 007's summaries | S17, S21 |
| P12 Dialog | `ConfirmDialog` and every dialog | S6, S8, S9, S11, S13, S14, S17, S18, S20, S21 |
| P13 Divider | separators in menus and summaries | S9, S15 |
| P14 Form Inputs, P15 Fieldset, P33 base-* | `TextField`, the textarea, selects, the password field, `Checkbox`, radios (`AccessLevelChoice`), the date field | S1, S7, S10, S11, S13, S19, S20 |
| P16 Footer, P17 Grid, P18 Header, P19 Kopfzeile | not used as drawn: the app's shells are the design's own (L1–L4) | — |
| P20 Icon | `kern-icon` classes; the exported glyphs | every screen |
| P21 Link | `kern-link`, the breadcrumb link, "Forgot password?", "Back to log in", the banner's finding links | S1, S2, S12, L2 |
| P22 Loader | `FeedbackLoader`, `PageLoader`, the publish dialog's loader | S1, S6, S14 |
| P25 Progress | the step line (`WizardProgress`, `role="progressbar"`) | L3 |
| P26 Search | the overview search, `MenuSearchField`, the documents search card | S4, S8, S10 |
| P27 Summary | the publish summary, the details' summary | S14, S15 |
| P28 Table | not used (the summaries are lists) | — |
| P29 Tabs, P33 states | the variant tabs (`BranchTabs`, `VariantTabs`, the details' tabs) | S9, S11, S13, S15 |
| P31 Text | the type classes by name (`heading/x-large`, `heading/large`, `title/default`, `body/*`, `label/*`) | every screen |
| P33 subcomponents | the interaction states of every component's verification table | — |

The project's components rebuilt in place under their names (35 folders of
`frontend/src/components/`) and the own components of research R11 keep their folder structure;
the pages' sub-components are listed in `plan.md`'s source tree.

---

## Coverage index

Every decided item with the screens where a task meets it. A task cites the items of its screen;
`/speckit-tasks` checks that each row has at least one task.

| Item | Screens |
|---|---|
| F1 | S4, S14, S15, S18 |
| F2 | S15, S16 |
| F3, F23, F24, F67 (dialog), F72 | S8 |
| F4 | S4, S17 |
| F5 | S18 |
| F6 | L1, L2 |
| F7, F8, F9, F29, F30, F31, F32, F33, F69, F70 | S9 |
| F10, F27, F28, F36, F37, F68 | S11 |
| F11, F38, F40, F41, F43, F45 | S13 |
| F12 | S16 |
| F13, F48, F54, F55 | S17 |
| F14, F52, F61, F71 | S4 |
| F15 | S3, S7 |
| F16 | S1 |
| F17 | L2, S20 |
| F18 | S6, S7 |
| F19, F20, F21, F67 (toast) | S6, L2, L3 |
| F22 | S22 and every error state (S1, S4, S6, S8, S15, S16, S17, S19, S21) |
| F25 | L3, S18 |
| F26 | S9, S11 |
| F34, F58, F59 | S10 (F58 also S9) |
| F35 | S9, S15 |
| F39 | S12 |
| F42, F44, F46, F47, F63 | S14 (F42, F44, F63 also S13) |
| F49, F64, F65 | S18 (F65 also S9) |
| F50, F51, F53, F66 | S15 (F53 also S16) |
| F56, F57 | S16 (F57 also S6) |
| F60 | S7 |
| F62 | every screen (design-notes §4) |
| W1 | the foundations (design-notes §1) |
| W2 | S1, S4, S15, S16, S22 |
| W3 | S6, S14, S18 |
| W4 | S6 |
| W5 | S5 |
| W6 | S8 |
| W7 | S14, S18 |
| W8 | S16 |
| W9 | S18 |
| W10 | S6, S7, S15, S16 |
| W11 | S3, S4, S6, S7 |
| W12 | S9, S11 |
| W13 | S12 |
| W14 | S13 |
| W15 | S9, S18 |
| W16 | S19, S20, S21 |
| W17, W18 | S11 |
| W19 | S10 |
| W20 | L3, S6 |
| W21 | S9, S10, S15, S18 |
| W22 | S9 |
| C1 | L1, L2, S1, S3, S9, S19, S20, S22 and the packages (research R2) |
| C2 | S7–S13, S17, S19–S21 and the packages |
| C3 | S9, S10, S13, S14, S15, S21 and the rules package |
| C4 | S12, S13, S14, S21 and the rules package, the MCP guidance |
| C5 | S1, S9, S10, S11 and the backend, the rules package, the MCP server |
| C6 | S13 and the rules package |
| C7 | S6, S7 and the backend, the MCP server |
