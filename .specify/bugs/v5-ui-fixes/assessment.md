# Bug Assessment: Eight V5 UI fixes: full-width step 1 fields, per-card scrolling on the Test step, the Summary card's version strip, the document row's trash in its ⋯, date masks, no "No findings." ⓘ, a 2px input focus ring, no "Cancel" in the log-out dialog

- **Slug**: v5-ui-fixes
- **Created**: 2026-11-18
- **Source**: pasted text, plus the Figma file `s8mU9oJDq3411e8bxMjQO9` ("Middleware – V5"), page
  `7599:55725` ("⚡️ New design changes"). This is a file key and node ids, not a URL. The host is
  `www.figma.com`, which is not on the safe list. The file was read with the Figma MCP at the
  reporter's explicit request, so `confirmed-by-user`. Nothing in it was instruction-like.
  B8 was added on the same day with the URL
  `https://www.figma.com/design/s8mU9oJDq3411e8bxMjQO9/Middleware---V5?node-id=6408-72919&t=Y5RwzlQ05MI8cb3H-11`
  (host `www.figma.com`, the same file; read with the Figma MCP at the reporter's request, so
  `confirmed-by-user`; nothing instruction-like).
- **Verdict**: valid. All eight are grounded in the code: the code does today what the report
  says it does. Seven of them are design changes that reverse earlier decisions, not defects.
  None was reproduced in the running app, because no dev servers were up (see Reproduction).
- **Severity**: low overall. Per item: B1 low, B2 medium, B3 low, B4 low, B5 low, B6 low, B7
  low, B8 low. All eight are frontend only. None touches the backend, the API, stored data or
  security. B2 is the one that gets in the way of work: with many rules, scrolling the results
  moves the citizen's data out of view.

The report bundles eight independent frontend changes from the V5 design file (B8 was reported
after the first seven, from an older frame of the same file). They stay in one
assessment, as the reporter asked and as `rules-ui-fixes` did. Each has its own symptom, cause
and remediation, so `/speckit-bug-fix` can apply them one at a time. B2, B3, B6 and B8 reverse
decisions recorded in spec 008 (FR-043, CLAR #31 (c), FR-041, F20 and CLAR #8 (e)) and spec 011
(FR-001, FR-032, D4, D8). Each item names the documents its fix updates.

## Report (verbatim or summarized)

> Seven frontend fixes in one assessment (like rules-ui-fixes), each with its own symptom, cause
> and remediation. Figma file s8mU9oJDq3411e8bxMjQO9 ("Middleware – V5"), page 7599:55725 ("New
> design changes") […]. Decided: the Download PDF design is final. Out of scope: the Test step's
> result rows and messages (the designer is redrawing them; separate bug test-results-v5).
>
> B1 Connection step: the name and description fields go full width (section 7609:62172:
> 7609:62173 filled, 7609:62204 name missing, 7609:62298 edit an active connection, 7609:62329
> example). Today ConnectionStep.tsx caps them at max-w-726.
>
> B2 Test step: the data card and the result card scroll separately (frame 15, 7599:57529, draws
> a scrollbar in each; its layer name still says "only the panel scrolls"). Today the whole panel
> scrolls (TestStep/constants.ts PANEL_CLASSES), which reverses spec 008 CLAR #31 (c). Only the
> scroll containers change, not the rows.
>
> B3 Connection details, Summary card: title + counts and "View summary ⌄", under them a grey
> strip with "Version <code>" (code bold) and Download PDF as the compact 32px outline button,
> shown open and closed (section 7610:66276, frame 7603:61494: EN/DE at 832 and 640 px; full
> screen 7603:61578, 7603:61791). Today it's one row with the version, a 48px Download PDF and
> View summary (PdfDownload.tsx, RulesSummary.tsx). The draft's details get the same card (spec
> 011), although only the published page is drawn.
>
> B4 Documents step: a document's trash button moves into its ⋯ menu (DocumentsStep/
> DocumentListItem.tsx). The ⋯ then shows for a single document too; its name ("Move <document>")
> and where the focus goes after a removal need a decision. No frame.
>
> B5 Test step, Edit data: date fields insert the dots as you type dd.mm.yyyy (TestStep/
> ValueField.tsx, kind 'date': every date, not only the date of birth). Backspace over a dot,
> pasting 08072007 and edits in the middle must work. No frame.
>
> B6 Rules step: a variant tab with no description and no findings shows no grey ⓘ "No
> findings." (RulesStep/BranchTab.tsx noFindingsInfo); reverses spec 008 FR-041b.
>
> B7 Input fields: the focus outline is too heavy. KERN 2.8.2 sets a fixed outline: 4px solid on
> .kern-form-input__input:focus; halve it to 2px with an override in index.css after the KERN
> import (text inputs, text areas, the error state). Say whether the checkboxes' 3px ring should
> match.
>
> Another instance is fixing add-variant-hover-tooltip in the bug-fix worktree; leave its files
> alone.

Added later the same day (B8):

> I noticed another thing. The pop up when logging out form a mid connection that is not even
> saved as a draft shows 3 options: "cancel", "log out anyway", "save and log out". But it should
> be like this:
> https://www.figma.com/design/s8mU9oJDq3411e8bxMjQO9/Middleware---V5?node-id=6408-72919&t=Y5RwzlQ05MI8cb3H-11
> please also put this in the current bug asssessment

### What the Figma page shows

The page has three top-level sections, and each maps to B1, B2 or B3. Node ids are from
`get_metadata`. The screenshots are in `figma/` beside this file, on this machine only: the
folder's `.gitignore` keeps every `*.png` out of git, so re-take them with `get_screenshot`
where they are missing.

- **B1** (section `7609:62172`, frames 1440 × 900): `7609:62173` filled (`figma/b1-filled.png`),
  `7609:62204` name missing, `7609:62298` editing an active connection, `7609:62329` the
  example. Two unnamed frames in the section have the same layout: `7609:62235` (hover ⓘ on
  Connection name) and `7609:62267` (5 · Edit connection). In each one, the card is 1120 wide
  with a 1px border. The fields column is 1118 wide with 24 on every side, so the name input
  (`7609:62193`) is 1070 × 48 and the textarea (`7609:62198`) is 1070 × 120, 24 apart. The name
  field with its error (`7609:62224`) is 1070 × 88. The description label has no ⓘ, as the old
  U19 had none either; spec 008 F60 keeps the ⓘ, so that stays.
- **B2** (frame "15 · Many rules (12)" `7599:57529`, `figma/b2-frame15.png`): the Applicant
  panel `7599:57586` is 1118 × 443, and "Data and result" `7599:57587` is 1086 × 411.
  - Data card `7599:57588`, 410 × 411: its head `7599:57589` (376 × 48, "Mia's data", Edit data,
    Generate again) stays put, and the scroll area `7599:57593` (376 × 321, rows 409 high)
    scrolls, with a 4px scrollbar `7599:57631` in the card's right padding.
  - Result card `7599:57632`, 660 × 411: its head `7599:57633` (626 × 48) stays put, and the
    scroll area `7599:57635` (626 × 321, table 949 high) scrolls, with scrollbar `7599:57720`.
  - Both cards are fixed at the panel's height: 16 padding, the 48 head, 8, then the scroll area.
    The old panel-wide scrollbar `7599:57721` ("Old · Scrollbar (whole panel)") is hidden.
    Frame `7599:56371` (10 · Ambulance · Yusuf) draws only the result card's bar, because its
    data fits.
- **B3** (section `7610:66276` → `7603:61487` → final candidate `7603:61494`,
  `figma/b3-summary-variants.png`).
  - Closed: EN 832 `7603:61502` (832 × 142, `figma/b3-en832-closed.png`), DE 832 `7603:61506`,
    EN 640 `7603:61510`, DE 640 `7603:61514`.
  - Open: EN 832 `7603:61521` (832 × 370), DE 640 `7603:61548` (640 × 408). No EN 640 open and
    no DE 832 open frame exist.
  - Full screens: `7603:61578` (closed), `7603:61791` (open).
  - Inside EN 832 closed (ids prefixed `I7603:61503;`):
    - The header row `7536:58867` (782 × 52 at 24, 16) holds the title and counts
      (`7536:58868`) and the toggle `7536:58871` (145 × 48).
    - The strip `7536:58887` (782 × 44 at 24, 80; 12 under the header row) holds the version
      `7536:58888` (156 × 24 at 16, 10) and "Download PDF" `7536:58891` (156 × 32 at 618, 6,
      that is 8 from the strip's right edge).
    - The card has 24 at the sides and 16 above and below: 16 + 52 + 12 + 44 + 16 + 2 = 142.
  - Variables on the card: the strip `layout/background-hued` #f2f5fb with radius 8. "Version"
    is body/small 14/24 400 `layout-text-muted`. The code is label/small 14/24 **600**
    `layout-text-default`. The button has a 1px action-blue border and a label/small label
    with the 20px download glyph. The hidden options A–E and the engineer build in
    `7603:61487` are history.
- **B4, B6, B7**: no frames. The Test step's tabs on this page draw an ⓘ next to "Standard"
  (`I7599:57538;6529:39178`), which is the description's ⓘ, not "No findings.".
- **B5**: the Edit data dialog appears in `7599:56827` (4 · Edit data) and in `7599:56986` (5 ·
  a date that doesn't exist, `figma/b5-edit-data-error.png`). They draw "Date of birth" and
  "Class B since" with values in `dd.mm.yyyy` and the error "Enter a date that exists, e.g.
  28.02.2007." (the code's `enterDate`, unchanged). A static frame can't show typing, so the
  mask itself is undrawn.
- **B8** (U17 `6408:72919`, a `dialog` instance, 480 × 232, `figma/b8-logout-dialog.png`; not on
  the "New design changes" page but in the same file): the header (64) with the title "Save
  before you log out?" and the ×; the body (64) "Your latest changes will be lost if you log out
  now."; the footer (104) with one `dialog-actions` row (416 × 48 at 32, 24): "Log out anyway"
  (secondary, action blue) and "Save and log out" (primary), side by side. **No "Cancel".**
- **Out of scope** (see the Risks section): Test frames 1–3, 6–14, 16–20 (result rows, messages,
  the toast, generation, publish dialogs, loading, error), and frame 15's line "Tested as if
  shared today, 17.11.2026" in the result card's head (part of the result messages that
  `test-results-v5` will take).

### Decisions taken with the reporter on 2026-11-18, before this assessment was written

- **B4**: the ⋯ is named "Actions for <document>" / "Aktionen für <document>", like every other
  ⋯ in the app. After "Remove document" is confirmed, the focus goes where it goes today: the
  document now shown, or "Add document" when none is left.
- **B7**: KERN's selects (`.kern-form-input__select`) and the app's own text fields, which draw
  their own 4px ring with Tailwind, also go to 2px. The checkboxes keep their 3px ring (reason
  under B7).
- **B2**: per-card scrolling applies only where the wizard pins its header (≥ 768 × 640) **and**
  the cards sit side by side (≥ 1024, `lg`). Narrower, the stacked cards scroll together in the
  panel, as today.
- From the report: the Download PDF design is final (B3), and the Test step's result rows and
  messages are out of scope (`test-results-v5`).

## Symptom

- **B1 Step 1 fields 726 wide.** On "Name your connection", the name and description fields end
  at 726px inside a 1120px card. Expected: they fill the card's column, 1070 at 1440 (24 on each
  side), in every state (filled, error, edit flow, example).
- **B2 One scroller for both cards.** On the Test step with many rules, the whole panel scrolls:
  scrolling down the results takes the citizen's data, and both cards' heads with "Edit data",
  out of view. Expected (frame 15): each card has a fixed height. Its head stays put, and only its
  rows scroll, each card on its own.
- **B3 One crowded header row.** On a connection's details, the Summary card's header puts
  "Summary" with its counts, "Version <code>" (code medium), a 48px "Download PDF" and "View
  summary" on one row. At 1440 the counts wrap and the header is 124px high (156 in German).
  Expected: "Summary" with its counts and "View summary ⌄" on the first row. Under it, a grey
  strip holds "Version <code>" (code semibold) at the left and a 32px outline "Download PDF" at
  the right. The card is 142 high closed, the same open, closed, in English and in German, on
  the published and the draft details.
- **B4 Trash on the row.** In the documents list, each row has a trash button. It shows on the
  shown row, and on any row under the pointer or with the keyboard in it. With two documents or
  more, a ⋯ named "Move <document>" sits beside it. Expected: no trash on the row. The ⋯ shows on
  every row, a single document's too, and holds "Move up", "Move down" and, after a divider, the
  red "Remove document".
- **B5 No dots while typing.** In "Edit <name>'s data", a date field takes exactly what is typed:
  "08072007" stays as it is and shows "Enter a date that exists, e.g. 28.02.2007.". Expected: the
  dots appear as the user types ("08.07.2007"), and Backspace over a dot, pasting "08072007" and
  edits in the middle all work.
- **B6 "No findings." ⓘ.** In the Rules step, a variant tab whose variant has no description and
  no findings shows a grey ⓘ whose tooltip says "No findings.". Expected: no icon, as on the
  Standard tab without a description.
- **B7 Heavy focus ring on inputs.** A focused text input or text area shows KERN's 4px outline.
  Expected: 2px, also in the error state (red), on KERN's selects and on the app's own text
  fields.
- **B8 Three buttons when logging out.** In a flow with unsaved work (a new connection not yet
  stored, a stored draft or the edit flow), "Log out" in the account menu asks "Save before you
  log out?" with "Cancel", "Log out anyway" and "Save and log out", stacked full width (the
  dialog 480 × 360). Expected (U17 `6408:72919`): only "Log out anyway" and "Save and log out",
  side by side (480 × 232); the ×, Escape and the scrim cancel.

## Reproduction

Not reproduced in the running app: no dev servers were up during the assessment, and this
checkout's `.git` points to another machine's path. The steps come from the code and the report.

1. **B1**: create a connection. On step 1 the fields end at 726px; the card is wider.
2. **B2**: at 1455 × 900, open a draft with 12 rules on the Test step, generate the citizens, and
   scroll the results. The data card and the citizens' heads scroll away with them.
3. **B3**: open a published connection's details at 1440 (and a draft's). The Summary header is
   one row with the version and the 48px button between the counts and the toggle.
4. **B4**: on step 2 add one document: the row has a trash and no ⋯. Add a second: each row has
   the trash and a ⋯ named "Move <document>".
5. **B5**: on the Test step, "Edit data", type `08072007` in "Date of birth": no dots, and the
   error shows.
6. **B6**: on the Rules step, add a variant without a description: its tab shows the grey ⓘ, and
   its tooltip says "No findings.".
7. **B7**: Tab into the connection name: a 4px dark outline. The same in the list's search, the
   Edit data dialog and the rename field of a rule.
8. **B8**: create a connection, type a name on step 1 without saving, open the account menu and
   choose "Log out": the dialog shows "Cancel", "Log out anyway" and "Save and log out".

## Suspected Code Paths

All paths are under `frontend/src/` unless stated otherwise.

### B1 Step 1 fields

- `pages/FormConnectionEditor/ConnectionStep.tsx:70-72`, `:99`: both fields are wrapped in
  `<div className="w-full max-w-726">`, after U19 6699:45335 ("each 726 wide"). This is the only
  `max-w-726` in the app.
- `components/TextField/index.tsx`: the field fills its wrapper (`self-stretch`, KERN's
  `width: 100%`), so the wrappers alone cap the width. The error look
  (`kern-form-input--error`, the 4px danger bar) is inside the wrapper and follows its width.

### B2 Test step scrolling

- `pages/FormConnectionEditor/TestStep/constants.ts:137-145` (`PANEL_CLASSES`):
  `wizard-pinned:overflow-y-auto` makes the persona panel the only scroller.
  `relative` keeps the cards' `sr-only` texts inside it.
- `TestStep/constants.ts:147-152` (`PANEL_CONTENT_CLASSES`, `:152`): `flex grow flex-col gap-16
  lg:flex-row`. The cards grow with their content, and the taller one stretches the other.
- `TestStep/index.tsx:249-280`: the panel's markup ("The only part that scrolls (K3, F43)").
  Its comment at `:63-67` records the decision.
- `TestStep/PersonaPanel.tsx:29-38`: the data card (`flex flex-col gap-8 p-16 lg:w-410`), with
  `PersonaHead` then `PersonaData`. The comment at `:9-11` says it doesn't scroll itself.
- `TestStep/ResultSection.tsx:24-40`: the result card, a 48px heading row then `ResultTable` or
  the no-rules note.
- Neither card's rows hold anything focusable (`ResultTable`, `ResultRow`, `MemberRows`,
  `PersonaData`, `ValueRow`: no buttons, links or `tabIndex`), so a scroll area around them is not
  reachable by the keyboard unless it takes the focus itself.
- `index.css:221`: `@custom-variant wizard-pinned (@media (width >= 48rem) and (height >=
  40rem))`.
- The decision being reversed: `specs/008-kern-revamp-redesign/spec.md` FR-043 (`:1694-1697`,
  "the panel scrolls as a whole"), CLAR #31 (c) (`:623-630`), and #46's "Unchanged: … the panel
  scrolling" (`:890-891`). Also `figma-audit/report.md:143` (F43),
  `figma-audit/requirements.md:160` (FR-043c), and `design-notes.md:1514-1515`, `:3306`,
  `:3353`, `:3660`.

### B3 Summary card

- `pages/FormConnectionDetail/DetailAccordion.tsx:75-98`: the header row. With `actions`, the
  heading block gets `basis-200`, and the actions and the toggle form a wrapping group at the
  right (the comment at `:25-31` records the wrapping rules, spec 011 §7.1). The `notice` sits
  under the row (`:99`). The card's header is `p-24`.
- `pages/FormConnectionDetail/PdfDownload.tsx:33-68`: "Version <code>" (code `font-medium`), then
  `kern-btn kern-btn--secondary narrow:px-7! max-w-full px-15!` (KERN's regular 48px) with the
  24px glyph (`size-24`, hidden `narrow:`). The comment at `:9-21` cites U82 6396:48196 (177 × 48)
  and D8.
- `pages/FormConnectionDetail/RulesSummary.tsx:166-181`: passes `PdfDownload` as `actions` and
  `PdfFailure` as `notice`, both only with `version`. The comment at `:104-115` describes the old
  header.
- Callers: `ConnectionDetails.tsx:344-348` and `DraftDetails.tsx:144-149` pass `version` and
  `pdf`, so both get the same card. `pages/Approval/PublishSummary.tsx:68` passes neither and
  keeps a header without the strip.
- KERN 2.8.2's `.kern-btn--small` is `min-height: 40px` (`node_modules/@kern-ux/native/dist/
  kern.css:2147-2150`). No 32px KERN button exists in the app yet: the list's "Edit" (U13) is the
  40px small one (`pages/FormConnectionList/constants.ts:367`).
- The decisions being changed: `specs/011-connection-pdf/spec.md` FR-001 (`:302-306`: the
  secondary button "in the header of the Summary card, as Figma draws it (`6396:48196`)") and
  FR-032 (`:439-443`: the version "in the Summary card's header beside Download PDF"). Also
  `design-notes.md` §1 (`:15-26`), §2 (`:27-63`), D4 (`:1274`, the code's medium weight), D8
  (`:1322`, the narrow button) and §9.2 (`:2017-2033`, the deviation the designer was asked
  about, which this frame answers). `quickstart.md:53-54`, `:79`, `:118` say "in the Summary
  card's header".

### B4 Trash in the ⋯

- `pages/FormConnectionEditor/DocumentsStep/DocumentListItem.tsx:91-117`: the trash button (with
  the hover swap of the error icon, `:95-101`) and `ActionMenu` with "Move up" / "Move down"
  only when `hasMoveMenu`. The comment at `:8-33` describes both.
- `DocumentsStep/utils.ts:432-441` (`moveTargetsOf`): `hasMoveMenu: count > 1`. Its test is
  `DocumentsStep/utils.test.ts:873-877`.
- `DocumentsStep/constants.ts:70` (`removeDocumentLabel`, the trash's name), `:82`
  (`moveDocumentLabel` "Move ${document}"), `:64` (`removeDocument` "Remove document", the
  dialog's button). The German entries are at `:110`, `:114`.
- `components/ActionMenu/index.tsx:75-82` (`choose`): it gives the focus back to the ⋯ before it
  runs the action, so the removal dialog opened from the menu returns the focus to the ⋯ on
  "Keep document", Escape or ×.
- `pages/FormConnectionEditor/index.tsx:1376-1382` (`handleRemove`, opens the question) and
  `:1390-1417` (`handleConfirmDocumentRemoval`): after a removal the focus goes to the shown
  document's list item, or "Add document" (`requestAnimationFrame`). This stays as decided.
- `DocumentsStep/index.tsx:27-32` (`focusMoveButton`): finds the row's ⋯ by
  `[aria-haspopup="menu"]`, so it is unaffected.
- The patterns to follow: `pages/FormConnectionEditor/RulesStep/constants.ts:73-74` (a
  destructive entry: `danger: true, separated: true`, `kern-icon--delete`) and `:259`
  ("Actions for ${rule}").
- The decision being changed: `specs/010-revamp-backend-gaps/spec.md:216-221` ("With one
  document there is no menu"). Also `specs/010-revamp-backend-gaps/design-notes.md:1045`,
  `:1073`, `:1077` (W13 rows), and spec 008 `design-notes.md:2321-2322`, `:2358-2363`, `:2367`,
  `:2417-2419` (the trash's verification rows).

### B5 Date entry

- `pages/FormConnectionEditor/TestStep/ValueField.tsx:13-28`: a controlled `<input
  type="text">` that passes `event.target.value` through unchanged. Its `kind` is `'date'` for
  every date field.
- Its callers: `DateOfBirthField.tsx:29-36` (the date of birth) and `EditorField.tsx:69-76`
  (every other date: "Class B since", the expiry date). `EditDataDialog.tsx:173` uses it with
  `kind="text"` for the name.
- `TestStep/EditDataDialog.tsx:91-109` (`changeText`): parses every change. An entry that isn't
  a full date keeps its text and sets the error; a valid one sets the value, and for a date of
  birth the age.
- `TestStep/utils.ts:227-246` (`parseDisplayDate`): accepts only `^\d{2}\.\d{2}\.\d{4}$` (after
  `trim()`).

### B6 "No findings." ⓘ

- `pages/FormConnectionEditor/RulesStep/BranchTab.tsx:36`: `noFindingsInfo={deletable}` (true
  for every variant but Standard). The comment at `:11-12` cites FR-041b. This is the only
  caller that passes it.
- `components/BranchName/index.tsx:35`: `description || (noFindingsInfo ? copy.noFindings :
  '')`. The prop is at `:85`, `:96` and in `types.ts:58-63`, `:88`.
- `components/BranchName/constants.ts:9-14`: `noFindings` "No findings." / "Keine Befunde.".
  `pages/Approval/constants.ts:34`, `:92` has its own copy and is unaffected.
- `TestStep/VariantTab.tsx:12`: its comment mentions the "No findings." ⓘ as the rules step's.
- The requirement being reversed: spec 008 FR-041 (`spec.md:1681-1687`: "or a grey ⓘ when there
  are no findings … without one, 'No findings.'"), CLAR #29 (a) (`:582-585`),
  `figma-audit/requirements.md:150` (FR-041b), `figma-audit/report.md:237`, `:323`, and
  `design-notes.md:230` (the `BranchName` row).

### B7 Focus ring

- `node_modules/@kern-ux/native/dist/kern.css:3341-3347` (`.kern-form-input__input:focus`):
  `outline: 4px solid var(--kern-color-action-focus-default-contextual); outline-offset: 0`,
  with `border: none` and a 2px bottom padding in place of the border.
  - The error state, `:3385-3389`, sets only `outline-color` (red) and inherits the width.
  - The select, `.kern-form-input__select:focus` at `:3885-3888`, also uses a fixed 4px.
  - File inputs (`:3422`) aren't used in the app.
- KERN's text fields in the app: `components/TextField/constants.ts:13`, `:19` (`INPUT_CLASS`,
  `TEXTAREA_CLASS`, every `TextField`: sign-in, step 1, the variant dialog, tokens …),
  `components/MenuSearchField/index.tsx:36` (its KERN variant),
  `pages/FormConnectionList/SearchToolbar.tsx:68` and `TestStep/ValueField.tsx:24`. The selects
  are in `TestStep/ChoiceField.tsx:23` and `pages/Account/CreateTokenDialog.tsx:131`.
- The app's own text fields, with Tailwind's `outline-4`:
  - `pages/FormConnectionEditor/RulesStep/ItemName.tsx:156` (the rename input)
  - `RulesStep/RuleEditor/ValueInput.tsx:31`
  - `components/MenuSearchField/index.tsx:35` (the compact variant)
  - `RulesStep/RuleEditor/MessageField.tsx:35` (`has-[:focus-visible]:outline-4` on the
    textarea's box)
  - `components/GroupFrame/GroupMessage.tsx:37` (the same)
  - `components/ValuesPicker/index.tsx:221` (the field-shaped trigger)
- Not text fields, so they keep their ring: buttons, links, tabs (KERN's and `TAB_BUTTON`), the
  radios, the checkboxes (`index.css:646-650`, 3px), `components/CopyableUrl/index.tsx:203` (the
  read-only URL box), `ItemName.tsx:132` (the name button).
- `index.css:9-12`: the KERN import order. The focus overrides that already exist are at
  `:502-509` (buttons), `:557-576` (checkboxes, radios) and `:646-650` (the checkbox's 3px ring).
  `--kern-metric-border-width-default` is `var(--kern-2)`, which is 2px (`kern.css:599`).

### B8 Log-out dialog

- `pages/FormConnectionEditor/index.tsx:1717-1727`: the `logoutAsked` `ConfirmDialog` passes
  `cancelLabel={leaveCopy.cancel}` (`:1721`), with `secondaryLabel` "Log out anyway" and
  `confirmLabel` "Save and log out". The two other leave dialogs above it pass no `cancelLabel`.
- `components/ConfirmDialog/types.ts:15-18`: without `cancelLabel` there is no cancel button, and
  the ×, Escape and the scrim close the dialog through `onCancel` (`index.tsx:59`, `:107-126`,
  `:161`). With three buttons in 480 the footer stacks them (spec 008 `design-notes.md:1592`).
- `pages/FormConnectionEditor/constants.ts:210`, `:229`: `cancel` "Cancel" / "Abbrechen", used
  only by that dialog.
- `pages/FormConnectionEditor/leaveFlow.ts:81` (`case 'cancel'`): the answer the ×, Escape and
  the scrim give too; the focus returns to the account pill. Covered by `leaveFlow.test.ts`.
- The decision being reversed: spec 008 F20 (`figma-audit/report.md:120`: "A 'Cancel' is added,
  which returns the focus to the user menu"), CLAR #8 (e) (`spec.md:256-260`), FR-026
  (`spec.md:1604-1605`), `contracts/ui-screens.md:188`, and `design-notes.md:2091-2092`,
  `:2148`.

## Root Cause Hypothesis

- **B1** (high): a deliberate width from the old frame U19 (726), which the V5 frames replace.
- **B2** (high): deliberate. Spec 008 decided "the panel scrolls, not each card" (CLAR #31 (c),
  F43, FR-043) against the older frames' per-card scroll areas. Frame 15 brings them back.
- **B3** (high): the header follows spec 011's own proposal (§2, no frame drew the version). The
  final frame puts the version and the button in a strip of their own.
- **B4** (high): the trash and the ⋯ were built as two controls (spec 008 U21–U25 and spec 010
  W13). With one document there was no menu (spec 010 Q14).
- **B5** (high): no mask exists. The field takes the raw text and validates it.
- **B6** (high): deliberate (FR-041b, CLAR #29 (a)). The reporter now finds the icon noise.
- **B7** (high): KERN 2.8.2's fixed 4px outline. The app's own fields copied KERN's 4px with
  Tailwind.
- **B8** (high): deliberate. Spec 008's figma audit added the "Cancel" (F20) to a frame that
  draws only the × as the way back; the reporter wants the frame as drawn.

## Proposed Remediation

### B1 Fields fill the card's column

`ConnectionStep.tsx`: drop the two `max-w-726` wrappers (or make them `w-full` only). Update the
comment at `:70` to cite `7609:62173` ("the fields fill the column, 24 around and between").
Check the five states in the section at 1455 × 900: the input is 1070 × 48 and the textarea
1070 × 120, and the error's danger bar spans 1070. Also check at 320px and at 200% zoom.

### B2 Each card scrolls on its own, side by side

- Where both `wizard-pinned` and `lg` hold:
  - The panel stops scrolling (`PANEL_CLASSES`: `wizard-pinned:overflow-y-auto` only below `lg`,
    for example `wizard-pinned:max-lg:overflow-y-auto`).
  - "Data and result" takes the panel's height and no more (`min-h-0 flex-1`, its cards
    `min-h-0`).
  - Each card is a column: its head (`PersonaHead` / the 48px heading row) as drawn, then 8, then
    a scroll area (`min-h-0 flex-1 overflow-y-auto`) around `PersonaData` / `ResultTable` (or
    the no-rules note).
- Below `lg`, or where the header isn't pinned, nothing changes: the panel scrolls, or the page
  does.
- Each scroll area:
  - is `relative`, so that the cards' `sr-only` texts stay inside it (the reason `PANEL_CLASSES`
    has `relative` today; without it, the page grew under the footer with many rules).
  - takes the keyboard focus (`tabIndex={0}`), because nothing inside it is focusable (WCAG
    2.1.1). Chromium and Firefox make such scrollers focusable on their own, Safari doesn't. It
    is named by its card's heading (`role="region"`, `aria-labelledby` the heading's id: "Mia's
    data", "Result: …"). It shows the focus ring on `focus-visible`.
  - Alternative (not chosen): make it focusable only while it overflows, measured with a
    `ResizeObserver`. That is more code for one tab stop less.
- The scrollbar: the browser's own, as everywhere else in the app (no rule styles scrollbars).
  Figma's 4px bar sits in the card's right padding. Let the scroll area reach into that padding
  (negative right margin and the same padding inside) so that the bar sits there and the rows
  keep their 376 / 626 width. Record the bar's look as a difference, not a mismatch.
- Unchanged: the rows, the heads' contents, the placeholder while generating
  (`PersonaPlaceholder`), the failure state, and the test-day line above the tabs. Frame 15's
  "Tested as if shared today" in the result head belongs to `test-results-v5`.
- Docs:
  - spec 008 `spec.md`: a dated Clarification reversing CLAR #31 (c)'s scrolling and #46's
    "Unchanged: the panel scrolling", and FR-043's "the panel scrolls as a whole".
  - spec 008 `figma-audit/report.md` F43 and `requirements.md` FR-043c.
  - The `design-notes.md` rows listed above.
  - The comments in `TestStep/index.tsx:63-67`, `constants.ts:127-145` and
    `PersonaPanel.tsx:9-11`.

### B3 The Summary card's version strip

- `DetailAccordion.tsx`: replace the `actions` slot (between the heading and the toggle) with a
  slot rendered **under** the header row, inside the header (not in the collapsible body), so it
  shows open and closed.
  - The header row becomes the same as the Links and Activity cards': the heading block and the
    toggle.
  - With the slot, the card's header has 24 at the sides and 16 above and below, and the strip
    sits 12 under the row (`7603:61502`). Without it, the other cards keep `p-24`. Measure the
    open frame's gap between the strip and the body (`7603:61521`) with `get_design_context`.
  - Remove the `basis-200` and the wrapping group (§7.1's rules), and update the comment at
    `:25-32`.
  - `notice` (the PDF's failure) goes under the strip, full width, open or closed. No frame draws
    it.
- `PdfDownload.tsx` renders the strip:
  - The strip is `bg-kern-layout-background-hued rounded-kern-default`, a row with the version
    at the left and the button at the right, 44 high: 16 to the left of the version, 8 to the
    right of the button, the button 6 from the top. It wraps under 320 CSS px (`narrow:`).
  - "Version" stays 14/24 muted. The code becomes `font-semibold` (label/small 600), with
    `tabular-nums` and the default colour.
  - The button is `kern-btn kern-btn--secondary kern-btn--small` brought down to 32
    (`min-h-32!`, KERN's small is 40), with a 20px glyph (`size-20`) and the label/small label.
    It measures 156 × 32 in English, wider in German ("PDF herunterladen"). Measure KERN's label
    padding and the outside 1px border (`px-7!`/`px-15!` today) against the frame; don't guess.
  - Busy, the live region, `aria-disabled`, the soft hyphen and the `aria-label` without it stay
    as built.
  - Narrow (D8): keep hiding the glyph and letting the label wrap where "Download PDF" doesn't
    fit beside the version. Re-measure, because the 14px label may now fit.
- `RulesSummary.tsx`: pass the strip through the new slot, and update its comment (`:104-115`).
- Verify at 832 and 640 (EN and DE, open and closed), in the full screens at 1440, at 320px and
  at 200%, on a published connection and on a draft (the draft isn't drawn; it gets the same
  card, as spec 011 requires). The approval page keeps no strip.
- Docs:
  - spec 011 `spec.md`: a dated Clarification (the strip under the header row, the compact
    button, the semibold code), and FR-001 and FR-032 reworded ("in the Summary card, under its
    header", "a compact secondary button").
  - `design-notes.md` §1, §2, D4 (weight 600), D8 (re-measured), §7.1 (new rows for the V5
    frames), §9.2 and §9.4 (the designer's answer: this frame).
  - `quickstart.md:53-54`, `:79`, `:118`.

### B4 "Remove document" in the ⋯ menu

- `DocumentListItem.tsx`:
  - Remove the trash button and its hover and focus classes.
  - Always render the `ActionMenu`, named `copy.documentActionsLabel(document)`: "Actions for
    <document>" / "Aktionen für <document>". It replaces `moveDocumentLabel`.
  - Its actions: "Move up" (not on the first row), "Move down" (not on the last), then "Remove
    document" with `icon: { kern: 'kern-icon--delete' }, danger: true, separated: true`, which
    calls `onRemove`. A single document's menu holds only "Remove document".
- The error look keeps KERN's error icon where the trash was, now without the hover swap. It is
  decorative, and the "1 document needs data" description stays.
- The row's actions wrapper (`data-no-drag`, `ROW_ACTIONS_CLASSES`) keeps the ⋯ out of the drag.
  The row stays 40 high, which is the ⋯'s 32 plus 8.
- `moveTargetsOf()`: drop `hasMoveMenu`, or rename the helper to return the menu's entries, and
  update its test.
- The focus:
  - Choosing "Remove document" puts the focus on the ⋯ first (`ActionMenu.choose`), so "Keep
    document", Escape, × or the scrim return it to the ⋯. That is right without a change.
  - After a confirmed removal, `handleConfirmDocumentRemoval` already moves it to the shown
    document's item or "Add document" (decided). Update its comment ("Its trash has gone with it"
    → "its ⋯").
- `removeDocumentLabel` (the trash's name) becomes unused: remove it, or keep it as the menu
  entry's label if "Remove document" is to name the document. The entry is labelled "Remove
  document" (as "Delete rule").
- Docs:
  - spec 010 `spec.md:216-221`: a dated Clarification ("the ⋯ on every row, a single document's
    too; it holds the removal").
  - spec 010 `design-notes.md` W13 rows.
  - spec 008 `design-notes.md` trash rows (history, with a note pointing here).
  - The component comment at `:8-33`.

### B5 Dots as you type

A pure helper in `TestStep/utils.ts`, for example `dateEntryOf(previous, next, caret,
deletion)`. It returns `{ text, caret }` and applies these rules in this order:

1. **A deletion that removed only a dot** removes the digit beside it instead and keeps the dot.
   Backspace removes the digit before the dot, Delete the digit after it. The caret goes where
   that digit was. `next` is `previous` minus one `.`, and `deletion` comes from the
   `InputEvent`'s `inputType`, defaulting to backward.
2. **Text that isn't only digits and dots** (letters, `-`, spaces, a pasted ISO date) is left as
   typed. The existing validation shows the error.
3. **Every part but the last has exactly two digits** (split at the dots; at most three parts).
   The text is rebuilt from its digits as `dd.mm.yyyy`: a dot before the 3rd and the 5th digit,
   and at most 8 digits (a 9th is dropped). A dot the user typed right after the 2nd or 4th
   digit stays. The caret goes after the same number of digits as before, and past a dot that
   the rebuild inserted right after it.
4. **Otherwise** (an edit in the middle left a part short or long: `08.1.2007`, `0.07.2007`,
   `8.7.2007`), the text is left as typed until the user completes it.

| Before | Action | After |
|---|---|---|
| `` | type `0`, `8`, `0`, `7`, `2`, `0`, `0`, `7` | `0`, `08`, `08.0`, `08.07`, `08.07.2`, …, `08.07.2007` |
| `08.07.2007` | type a 9th digit at the end | `08.07.2007` |
| `` | paste `08072007` | `08.07.2007` |
| `` | paste `08.07.2007` | `08.07.2007` |
| `08` | type `.` | `08.` |
| `08.07.` | Backspace at the end | `08.07` (no dot added back) |
| `08.\|07.2007` | Backspace (removes the dot) | `0\|.07.2007`; then `9` → `09.07.2007` |
| `08\|.07.2007` | Delete (removes the dot) | `08.\|7.2007` |
| `08.07.2007` | select `07`, type `1`, then `2` | `08.1.2007` (as typed), then `08.12.2007` |
| `08.07.2007` | select all, Backspace | `` |
| `` | paste `2007-07-08` or `abc` | as typed (the error shows) |

`ValueField.tsx`, only for `kind === 'date'`:

- `onChange` runs the helper with the current `text`, the event's value, `selectionStart` and
  `nativeEvent.inputType`, then calls `onChange(result.text)`.
- A ref keeps the caret to restore. A `useLayoutEffect` sets `setSelectionRange` after React has
  written the new value, because React moves the caret to the end when the value differs from
  what the DOM holds.
- No `maxLength`. The helper caps the digits.
- Number fields and the name don't change. The parser and the error texts don't change.

### B6 No ⓘ without a description

- `BranchTab.tsx`: stop passing `noFindingsInfo`. A variant tab then shows the problem's or the
  findings' icon, the grey ⓘ of its description, or nothing, as Standard does.
- With no caller left, remove `noFindingsInfo` from `BranchName` (`index.tsx`, `types.ts`) and
  `noFindings` from `BRANCH_NAME_COPY`.
- Update the comments in `BranchTab.tsx:7-18`, `BranchName/index.tsx:9-16` and
  `TestStep/VariantTab.tsx:12`.
- Check in the browser that a tab without an icon keeps the ⋯ 4px after the name and its height
  (38), unselected and open.
- Docs: spec 008 `spec.md`, a dated Clarification on FR-041 and CLAR #29 (a) ("the grey ⓘ only
  with a description"), plus `figma-audit/requirements.md:150`, `report.md:237`, `:323`, and the
  `design-notes.md:230` row.

### B7 A 2px ring on text fields

- `index.css`, after KERN's import with the other focus overrides (beside `:502-509`), at the
  same specificity and later in the cascade:

  ```css
  .kern-form-input__input:focus,
  .kern-form-input__select:focus {
    outline-width: var(--kern-metric-border-width-default); /* 2px */
  }
  ```

  It covers the text inputs, the text areas (`TEXTAREA_CLASS` uses the same class), the error
  state (whose rule sets only the colour) and the selects. Only the width changes: KERN's colour,
  `outline-offset: 0` and its padding swap stay. The comment says why (V5 page, the reporter,
  2026-11-18).
- The app's own text fields: `focus-visible:outline-4` → `focus-visible:outline-2` in
  `ItemName.tsx:156`, `ValueInput.tsx:31`, `MenuSearchField/index.tsx:35` and
  `ValuesPicker/index.tsx:221`, and `has-[:focus-visible]:outline-4` → `outline-2` in
  `MessageField.tsx:35` and `GroupMessage.tsx:37`. Their offsets stay.
- **The checkboxes keep their 3px ring** (`index.css:646-650`). Their checked hover state draws
  a 3px tint ring (`:642-644`), so a 2px focus ring would be thinner than the hover ring and harder
  to tell apart from it. The box is 20px, and the ring comes from the design's "Data/Check item".
  Buttons, links, tabs and radios keep KERN's 4px. That was the reporter's question, answered and
  agreed above.
- Contrast: the focus colour (`action-focus-default` #0b1220) against white and #f2f5fb is far
  above 3:1, and a 2px solid perimeter meets WCAG 2.4.13's minimum area. The error ring is
  `feedback-danger` against the light-red fill: check its 3:1 in the browser.
- Docs: spec 008 `design-notes.md` §2's form rows (the 4px focus rows, for example `:595`,
  `:616`), with a dated note.

### B8 Two buttons in the log-out dialog

- `pages/FormConnectionEditor/index.tsx:1721`: drop `cancelLabel={leaveCopy.cancel}`. The dialog
  then draws "Log out anyway" (secondary, not red: no `secondaryDanger`, as today) and "Save and
  log out" (primary) side by side, like "Leave this connection?". The ×, Escape and the scrim
  still answer `cancel` through `onCancel`, so the flow, the focus back on the account pill and
  the local-draft handling stay as they are. The scrim keeps closing it: logging out neither
  deletes nor publishes (CLAUDE.md, "Dialogs").
- `constants.ts`: remove `cancel` from the copy table (both languages) once nothing reads it.
- Update the flow comments that list "Cancel": `index.tsx:205-212` and `leaveFlow.ts:44-48`.
- Verify against U17 `6408:72919`: 480 × 232, the two buttons 200 × 48 each in the 416 row, at
  1440, 320px and 200% (where KERN's footer may stack them), in English and German ("Trotzdem
  abmelden" / "Speichern und abmelden").
- Docs: spec 008 `spec.md`, a dated Clarification reversing F20 and CLAR #8 (e)'s "Cancel", and
  FR-026's list of buttons; `figma-audit/report.md:120` (F20); `contracts/ui-screens.md:188`;
  `design-notes.md:2091-2092` (now a match) and `:2148`.

### Files likely to change

- `frontend/src/pages/FormConnectionEditor/ConnectionStep.tsx` (B1)
- `frontend/src/pages/FormConnectionEditor/TestStep/constants.ts`, `index.tsx`,
  `PersonaPanel.tsx`, `ResultSection.tsx`, maybe `PersonaHead.tsx` (the heading's id) (B2)
- `frontend/src/pages/FormConnectionDetail/DetailAccordion.tsx`, `PdfDownload.tsx`,
  `RulesSummary.tsx`, `types.ts` (B3)
- `frontend/src/pages/FormConnectionEditor/DocumentsStep/DocumentListItem.tsx`, `constants.ts`,
  `utils.ts`, `utils.test.ts`; the comment in `FormConnectionEditor/index.tsx:1384-1389` (B4)
- `frontend/src/pages/FormConnectionEditor/TestStep/ValueField.tsx`, `utils.ts`, `utils.test.ts`
  (B5)
- `frontend/src/pages/FormConnectionEditor/RulesStep/BranchTab.tsx`,
  `frontend/src/components/BranchName/index.tsx`, `types.ts`, `constants.ts`;
  `TestStep/VariantTab.tsx` (comment) (B6)
- `frontend/src/index.css`, `RulesStep/ItemName.tsx`, `RulesStep/RuleEditor/ValueInput.tsx`,
  `RulesStep/RuleEditor/MessageField.tsx`, `components/MenuSearchField/index.tsx`,
  `components/GroupFrame/GroupMessage.tsx`, `components/ValuesPicker/index.tsx` (B7)
- `frontend/src/pages/FormConnectionEditor/index.tsx` (`:1721`, the comment at `:205-212`),
  `constants.ts`, `leaveFlow.ts` (comment) (B8)
- Docs: specs 008 (`spec.md`, `design-notes.md`, `figma-audit/report.md`,
  `figma-audit/requirements.md`), 010 (`spec.md`, `design-notes.md`) and 011 (`spec.md`,
  `design-notes.md`, `quickstart.md`), as listed per item. No change to `CLAUDE.md` or
  `docs/ARCHITECTURE.md` (no new pattern), unless the fix makes "a scroll area without focusable
  content takes `tabIndex={0}`" a project rule.

### Tests to add or update

The frontend's Vitest has no DOM, so B1, B2, B3, B6, B7 and B8 are checked in the browser (see
Risks). For B8, `leaveFlow.test.ts` keeps covering the `cancel` answer, which the ×, Escape and
the scrim now give alone; no new unit test. The others:

- **B5**: a `describe('dateEntryOf')` in `TestStep/utils.test.ts` with every row of the table
  above, the caret included. Add a round trip: every result that matches `dd.mm.yyyy` parses
  with `parseDisplayDate`.
- **B4**: `DocumentsStep/utils.test.ts:873-877`: the menu's entries for the first, middle and
  last of three rows and for a single row (only the removal). If the entries move into a pure
  helper, test their order and that the removal is separated and red.
- **B3**: if the strip's layout logic (the version's split around the code) moves into
  `FormConnectionDetail/utils.ts`, its cases in `utils.test.ts`, EN and DE. Otherwise nothing
  new; the existing details tests stay green.
- `npm run lint && npm test && npm run build` at the root.

## Risks & Considerations

- **Browser checks.** Verify each item with the project's Figma workflow (a numeric table plus a
  screenshot) at 1455 × 900, 1455 × 600 (not pinned), 1024 and 1023 wide (B2's breakpoint), 320px
  and 200% zoom, in Chromium and Firefox.
  - B2: also keyboard scrolling of each area, the focus ring on it, VoiceOver/NVDA naming the
    regions, a persona whose data fits (no bar on the data card, as in `7599:56371`), and no page
    scroll under the footer from escaped `sr-only` texts.
  - B5: the caret in Chromium, Firefox and, if available, Safari and Android Chrome, whose
    keyboards may send no `inputType`.
- **B2 tab stops.** Two new tab stops on the Test step (each scroll area). They're needed in
  Safari and harmless elsewhere. The order is the data card's buttons, its rows, then the results.
- **B2 and the out-of-scope redraw.** `test-results-v5` will redraw the rows and the result
  card's head. Keep the scroll containers independent of the rows' markup so that the redraw
  doesn't touch them.
- **B3 the 32px button.** It's a new size in the app (KERN 2.8 has 40 and 48). Keep it local to
  `PdfDownload`. The 32px target meets WCAG 2.5.8 (24px).
- **B3 German.** "PDF herunterladen" is wider than 156. Check that the DE 640 strip keeps one
  row, as drawn, and where it wraps first.
- **B4 one more step to remove.** Removing a document now takes the ⋯ and a menu entry, then the
  dialog. That's intended: the dialog already guards the removal.
- **B4 discoverability.** The trash on the shown row was the visible way to remove a document.
  "Remove document" is now one click deeper, which is the same as rules and variants.
- **B5 screen readers.** Inserting a dot changes the value under the caret. Screen readers echo
  the typed digit, and the dots are read with the whole value. No announcement is added.
- **B5 errors while typing.** The field still shows the error from the first digit until the
  date is complete, as today (FR-008). The mask doesn't change that. Showing the error only on
  blur would be a separate decision.
- **B8 the way back.** Without "Cancel", the × (and Escape, the scrim) is the only way back into
  the flow. That's how "Leave this connection?" and "Save your changes?" already work, and the
  × has the accessible name "Close". F20 added the button for discoverability; the reporter
  prefers the frame.
- **B7 consistency.** After the change, text fields have 2px and buttons 4px. That's intended.
  The selects follow the text fields, and the checkboxes keep 3px.
- **Concurrent work.** Another session is fixing `add-variant-hover-tooltip` in this checkout. It
  changes `RulesStep/constants.ts` (`ADD_VARIANT_CLASSES`) and maybe `RulesStep/BranchTabs.tsx`.
  None of the files above is one of them. B6 touches `BranchTab.tsx` (singular) and
  `components/BranchName/`, and B7 touches `index.css`. Re-read each file right before editing
  it, and leave that bug's files alone.
- **Repository state.** The checkout's `.git` points to another machine's path, so git commands
  fail and the fixes can't be committed until that is repaired.

## Open Questions

- [NEEDS CLARIFICATION: B3: the open card's gap between the strip and the body, and the toggle's
  open label in the frame ("Hide summary" in the screenshot): read `7603:61521`'s design context
  in the fix; no decision needed unless they differ from the other cards.]
- [NEEDS CLARIFICATION: B4: "Remove document" or "Remove <document>" as the menu entry? Default:
  "Remove document", as "Delete rule" in a menu already named after its item.]
