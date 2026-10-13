# Design notes: management UI

**Tasks**: T023, T084, T039–T042, T086–T089, T091 | **Date**: 2026-10-11 | **Contract**: [contracts/ui-screens.md](contracts/ui-screens.md)

**Sources**:
- **Figma "Middleware – V2"** (`BZUNank5VjCzqr2BcyhifB`), page "✅ Final Screens" (`33:3`):
  - the signed-out screens "01 Log in" (`153:7661`) and "01b Forgot password" (`2041:7569`);
  - the signed-in screens of Phase 3 (sections 5–7): "S3 Your connections" (`2066:12985`) and
    "S4 New connection" (`2077:18315`), the wizard "02–02d Create connection" (`2080:6059`,
    `2080:6160`, `2080:6261`, `2080:6367`, `2080:6473`), "03–06d Documents" (`2080:6574`,
    `2080:6700`, `2080:7208`, `2080:7480`, `2080:8064`, `2080:6904`, `2080:7753`), "22/23
    Published" (`2080:8271`, `2080:8406`), "L1 Loading" (`2073:5601`) and "E1 Page not found"
    (`2073:5728`).
  - The page "🤖 Flow for AI" (`2081:4013`) maps the actions to their screens. It says to ignore
    S3, 02d and R1–R3; S3 and 02d are used all the same, as decided in section 9. Its sign-in
    path ("Log in" → L1 → 02) is followed only while no connection exists (section 6, decided
    2026-10-11).
- **Figma "Middleware – V1"** (`hsxN4JO9iGWVxMHHehpOwC`), page "Final Screens" (`33:3`): the
  user menu (section 3), which V2 hasn't changed.

Node ids can change when the files are edited.

The design decides presentation (layout, wording, language, components). The contract decides
behavior. Where they differ, section 9 lists the difference and what was decided or is still
open.

## 1. Language and naming

- **Language**: English (`<html lang="en">`).
- **Product name**: **Decision (2026-10-13, bug `product-name-header`)**: "Connection Portal",
  the middleware's temporary name, as in the fixed Figma. Tab titles read "{page} – Connection
  Portal". It replaces "Product name" (decision 2026-10-09, V2, which didn't name the product
  yet; V1 called it "BridgeID").
  `APP_NAME` in `frontend/src/constants.ts` holds it, and `frontend/index.html` repeats it.
- **"Connection"** is the UI's word for a form connection ("Your connections", "New
  connection"; V1 said "use case"). The API, the code and the spec keep "form connection".
- **Tone**: short sentences in the second person ("Ask your admin to reset it.", "Your sign-in is
  encrypted"), typographic apostrophes (’).

## 2. Foundations

### Fonts

Fira Sans, KERN's typeface: Regular 400, Medium 500 (only the sign-in headline) and SemiBold 600.
Every text style sets `"zero" 1, "lnum" 1, "tnum" 1` (slashed zero, lining and tabular figures),
like KERN's own type classes.

### Colours

The design uses KERN 2.8 tokens; every colour has a token. Values in light mode:

| Figma variable | Token | Value | Used for |
|---|---|---|---|
| `layout-text-default` | `--kern-color-layout-text-default` | #131525 | text, logo mark |
| `layout-text-muted` | `--kern-color-layout-text-muted` | #51577a | hints, captions, metadata |
| `layout-background-default` | `--kern-color-layout-background-default` | #ffffff | top bar, cards, menus |
| `neutral-025` | `--kern-color-neutral-025` | #f3f4f7 | page background |
| `layout-layer-surface` | `--kern-color-layout-background-default-surface` | #f3f4f7 | input fields |
| `neutral-050` | `--kern-color-neutral-050` | #e8e9ef | avatar, menu item hover |
| `neutral-100` | `--kern-color-neutral-100` | #dfe1ea | card borders, dividers |
| `neutral-300` | `--kern-color-neutral-300` | #a9aec6 | "todo" step circle, dashed empty state |
| `decorative-border` | `--kern-color-decorative-border-default` | #c0c3d5 | "Personal ID" card in the sign-in illustration |
| `darkblue-050` | `--kern-color-darkblue-050` | #e5ebf7 | icon tiles, open user menu |
| `action-default` | `--kern-color-action-default` | #2044aa | buttons, links, blue glyphs |
| `form-input-border` | `--kern-color-form-input-border` | #1d2034 | input bottom border |
| `feedback-danger` | `--kern-color-feedback-danger` | #c31c13 | error messages |
| `feedback-info` / `-background` | `--kern-color-feedback-info(-background)` | #006b8c / #c0f3ff | info alert, "Draft" badge |
| `feedback-success` / `-background` | `--kern-color-feedback-success(-background)` | #007155 / #cdf2e4 | "Live"/"Published" badge and alert; the sign-in illustration, also at 40% (border) and 8% over white (background) |

### Type styles

| Figma style | Size / line height | Weight | Used for |
|---|---|---|---|
| `heading/display` | 48/56 (`2x-large-adaptive`) | 500 | sign-in headline, page titles (V2) |
| `heading/large`, `title/large` | 26/32 (`large-adaptive`) | 600 | forgot-password title, "Your connection is live", dialog title |
| `heading/medium`, `title/default` | 21/24 (`medium-adaptive`) | 600 | card, section and alert titles |
| `title/small`, `label/default`, `body/default/bold` | 18/24 | 600 | labels, names, buttons |
| `body/default/regular` | 18/24 | 400 | body text, inputs |
| `body/large/regular` | 21/32 | 400 | page hints, sign-in lead |
| `body/small/regular`, `label/small` | 16/24 | 400 / 600 | metadata, small buttons, menu |
| step number of "App/Progress" | 13/16 | 600 | the project token `--text-step` (2026-10-10) |

**Decision (2026-10-09)**: the frames use KERN's adaptive type at its small-screen values (48/56,
26/32, 21/24) on 1440 px. `kern.css` makes these larger from 768 px (72/80, 32/40, 24/32), so
`frontend/src/index.css` keeps the adaptive sizes, their line heights and their baseline paddings
at the small-screen values on every width.

### Spacing, radii and effects

- **Spacing**: KERN's `metric/space` scale (4, 8, 16, 24, 32) plus raw 2, 6, 12, 14, 20 and 40.
- **Radii**: 2 (inputs, logo mark), 4 (buttons, badges, alerts, the illustration's lines), 8
  (cards, menus, icon tiles), 20 (pills: user menu, steps, the illustration's chips), circle (the
  illustration's seal).
- **Effects**: KERN has no shadow tokens. "Elevation/Card" (#1315250D, 0 1 2 and 0 6 20) and
  "Elevation/Menu" (#13152529, 0 10 28) are the project tokens `--shadow-card` and
  `--shadow-menu` (decided 2026-10-09). "Elevation/Footer" (#1315250A, 0 −6 20) belongs to the
  wizard footer and has no token yet. In V2 the sign-in cards have no shadow, so nothing uses
  `--shadow-card` for now. **Decision (2026-10-09, V2)**: the chips of the sign-in illustration
  have a shadow without an effect style (#0071551A, 0 6 16); it is the project token
  `--shadow-chip`.
- **Decision (2026-10-10)**: the values of the V2 signed-in screens that have no token are taken
  exactly. "Feedback/Toast"'s drop shadow (#12142633, 0 8 12) is the project token
  `--shadow-toast`, and the step number (13/16) is `--text-step`. The "todo" step circle's 1.5px
  border and the toast's 6px radius stay raw values in their one component each. Chromium draws
  the 1.5px border 1px wide at a device pixel ratio of 1.
- The dialog's border is `layout-border` (#6e7597), and its scrim is `layout-text-default` at 50%
  (kern.css: black at 72%).

### KERN in code

**Decision (2026-10-09)**: `index.css` imports Tailwind, KERN's Fira Sans files, `kern.css` and
the KERN Tailwind theme, but not the React kit's stylesheet. That stylesheet bundles an older
KERN whose rules override KERN 2.8 (text #171a2b instead of #131525, weight 500 instead of 600,
48 px small buttons, a border on alerts) and inlines 1.8 MB of fonts. The kit components that
ship styles of their own (Menubar, Menu, Tabs, InputDate, Radio error state) need those styles
added before they are used. `docs/KERN-DESIGN-SYSTEM.md` §2 and `CLAUDE.md` describe this setup.

Links between the app's routes are React Router `Link`s with KERN's classes, because `KernLink`
and `KernButton` with `href` reload the page: `kern-link kern-link--small` for "Forgot
password?", and `kern-btn kern-btn--primary kern-btn--block` with a `kern-label` span for "Back
to log in". `kern.css` reserves the scrollbar's width on `html` (`scrollbar-gutter: stable`), so
the page is 15 px narrower than the window in Chromium on Linux: compare with a 1440 px frame in
a 1455 px window.

## 3. App shell

- **Frame**: 1440 wide. On the signed-in screens (V1 and V2) the content column is 1040 px,
  centred (x = 200), 40 px below the 64 px top bar, 48 px above the bottom on the overview, with
  24 px between blocks. The wizard (section 6) has a 1120 px column (x = 160), 40 px below its
  header, with 32 px between blocks, above an 80 px footer bar. The signed-out screens are in
  section 4.
  - **Decision (2026-10-12)**: the header and the footer bar don't scroll. On the signed-in
    screens (`AppLayout`) the top bar sticks to the top, and `scroll-padding-top: 64px` keeps
    what scrolls into view below it. The wizard (`WizardLayout`) fills the window, which doesn't
    scroll: the header and the bar stay put and the step scrolls between them. From 1024 px wide
    and 640 px tall (the `split:` variant) the head (progress and page title) stays put too, and
    only the area below it scrolls; shorter or narrower windows scroll the head with the step.
    Where the column is centred (windows from 1197 px), the scrolling area keeps a scrollbar
    gutter on both sides, so that its column stays lined up with the footer bar's.
- **Top bar ("App/Top bar", `141:959`)**: 64 px, white, 1 px neutral-100 bottom border (inside
  the 64 px), padding 0 32, gap 16. Logo (V2): a 16 px text-default square with radius 2 (V1:
  20 px, radius 4), 8 px gap, then the product name (16/24, 600); the logo sits at y = 19.5, the
  square at 23.5. On the signed-out screens the user block is hidden. Inside a use case the
  design uses "App/Header" (`37:15`) instead, with the form name, a status badge, the version and
  a 5-step stepper (section 6).
- **User menu (V1: "App/User menu", `238:7965`; trigger in `37:15`)**:
  - Trigger: a pill (radius 20, padding 2/6/2/2, gap 4) with the 32 px avatar (neutral-050,
    initials 16/24 600) and a 20 px chevron (muted). Open: darkblue-050 background and a 1 px
    action-default border.
  - Panel: 280 px, 8 px below the trigger and right-aligned, white, 1 px neutral-100 border,
    radius 8, Elevation/Menu. The account block (padding 14/16, gap 2, divider) shows the name
    (16/24 600) and the email (16/24 muted). The action list (padding 4/0) holds "Log out":
    48 px, padding 0 16, gap 12, 20 px icon, 16/24 600; hover neutral-050.
  - **Decision (2026-10-09)**: the signed-in top bar uses this trigger and panel. Accounts have
    only a username, so the panel shows the username and no email line.
- **Page title ("App/Page title", `37:56`)**: the page's `h1`, with an optional hint under it,
  gap 8. V2 made it 48/56, 500 (`heading/display`), with an 18/24 muted hint (V1: 26/32 and
  21/32).
- **Logo**: on the signed-in screens it links to the overview, as V2's flow says ("logo → S4"),
  also from the first-connection screen, where the overview then shows its empty state.
- **Wizard header ("App/Header", `37:15` in V2)**: the logo, a 1px × 24px neutral-100 separator
  and the step's title (16/24, 600). **Decision (2026-10-13, bug `product-name-header`)**: like
  every header, it spans the full width with padding 0 32, so the logo sits at x = 32 on every
  screen, the separator at 203, the title at 220 and the user menu at 1344 (fixed Figma `33:3`,
  e.g. `2131:4385`). It replaces V2's header on the wizard's 1120 px column (logo at x = 160).
  `TopBar` draws it with `title`; `WizardLayout` adds the 1120 px column below it and the
  footer bar. The title is "New connection", and from the documents step the form name. V2's
  status badge and meta are left out of the wizard, since there are no drafts. The details
  screen shows them (§7): `TopBar`'s `badge` and `meta`, both hidden below `sm` so the name
  keeps some room, and there the title is the page's `h1` (`titleAsHeading`).
- **Legal footer**: removed. V2's sign-in screens have no footer, and V2 moves "App/Legal footer"
  (`151:995`) to "Deprecated (unused)". In Phase 2 it showed "© 2026 BridgeID" under the sign-in
  screen.

## 4. Sign in and forgot password (V2)

Frames "01 Log in" (`153:7661`, `/login`) and "01b Forgot password" (`2041:7569`,
`/forgot-password`), both 1440×900. Code: `components/AuthLayout/`, `pages/Login/`,
`pages/ForgotPassword/`.

**Layout (both frames)**: the top bar, then content 1120×508, centred in the 836 px below it
(x = 160, y = 228): the intro (600 px) on the left and the card (440 px) on the right, 80 px
apart. There is no footer. In code the two columns start at 1152 px, where 600 + 80 + 440 and
the 16 px page padding fit; narrower screens stack intro and card.

**Intro ("Auth/Intro", `151:967`)**: a column with 16 px gaps.
- "Connect your forms to the EUDI Wallet" (`h1`, 48/56, 500). At 600 px it breaks after "the".
- "Sharing verified data made easy." (21/32, muted).
- The "wallet scene", 600×300, 48 px below the lead (a 16 px spacer between two gaps). Figma
  calls it decorative and says to hide it from screen readers, so it is `aria-hidden`. Its
  parts are absolutely positioned and don't scale, so code shows it only where the intro is at
  least 600 px wide (a container query); narrow screens leave it out.
  - Frame: radius 8, 1 px feedback-success border at 40%, white background with an 8%
    feedback-success tint, and a 578×290 dot grid at 8/8 (`assets/illustrations/dot-grid.svg`).
  - Two document cards, 260×164, radius 8, padding 24, gap 8: a title (16/24 600, success) and
    two 8 px placeholder lines (radius 4). Behind: "Driving licence" (success-background, success
    border and lines of 130 and 88 px, rotated 5° clockwise, bounding box at 152.71/29 inside the
    border). In front: "Personal ID" (white, decorative-border border and lines of 160 and 100
    px, rotated 3° counter-clockwise, bounding box at 35/93.39).
  - A seal over the back card's corner: a 48 px success circle with a 4 px white border and a
    24 px white check, at 271/83.
  - Three chips at 399/76, right-aligned, 10 px apart: white, 1 px success-background border,
    radius 20, padding 8/14/8/10, gap 8, `--shadow-chip`, a 20 px success check-circle and a
    label (16/24 600): "Identity verified", "Age checked", "Eligible to apply". **Decision
    (2026-10-09)**: kept as designed, although the middleware checks neither age nor
    eligibility, because Figma presents the scene as generic and decorative.
- V1's benefit rows ("Auth/Benefit") are gone; V2 moves the component to "Deprecated (unused)".

**Sign-in card ("Auth/Login card", `141:1172`)**: 440×470, white, 1 px neutral-100 border,
radius 8, padding 32, gap 20, no shadow (V1: Elevation/Card). It is centred against the intro
(y = 19 within the content).
- "Log in" (`h2`, 21/24 600). V1's "Use your work account." is gone.
- KERN text inputs "Username" and "Password": label 18/24 600 with 6/2 baseline padding, 8 px
  gap, field 48 px high (layer surface, 2 px form-input-border bottom border, radius 2, padding
  0 16, 18 px text). "Username", not "Email", because accounts have usernames (Phase 2 decision;
  V2 has it too).
- Password with a "show password" toggle: KERN tertiary small button, icon only (40 px visible,
  48 px target), 4 px from the field's right end. **Decision (2026-10-10)**: only the icon
  changes (open ↔ crossed-out eye). KERN's background tint on hover and press is turned off,
  and its focus ring shows for keyboard focus only, as on every KERN button (section 10).
- "Forgot password?": KERN small link (16/24, action-default, underlined, 7/1 baseline padding),
  right-aligned on its own 32 px row. It opens `/forgot-password`, and replaces the Phase 2 text
  "Forgot your password? / Ask an administrator to reset it." Its icon slot is collapsed in
  Figma and not shown.
- "Log in": KERN primary button, full width, 48 px. Its arrow icon is collapsed in Figma and not
  shown.
- "Your sign-in is encrypted" with an 18 px muted lock glyph, centred, gap 8.
- **Failed sign-in** (no frame in V1 or V2): "Form/Error message" (`87:837`, still in V2's
  Components › Shared): 20 px danger icon and "Invalid username or password" (16/24 600,
  danger), announced as an alert, above the fields. The card grows by 44 px. **Decision
  (2026-10-09, V2)**: kept from Phase 2.

**Forgot-password card ("Forgot password card", `2041:7845`)**: 440×300, white, 1 px
neutral-100 border, radius 8, padding 32, no shadow. It is as tall as the wallet scene and lines
up with it (y = 208 within the content, so its bottom meets the intro's). Its three parts are
spread over the height (space-between, 38 px apart at this size); code keeps at least 20 px
between them where the text wraps.
- "Icon/Tile": 48 px, darkblue-050, radius 8, with the 24 px blue lock glyph.
- "Forgot your password?" (`h2`, 26/32 600) over "Ask your admin to reset it." (18/24, muted),
  gap 6. Passwords are reset by the operators with the account CLI (research R14).
- "Back to log in": KERN primary button, full width, 48 px, a link to `/login`. Its arrow icon is
  collapsed in Figma and not shown.

Both links pass the router state on, so that a sign-in after the detour still returns to the
route that asked for it. On both screens the `h1` is the intro's headline and the card's title is
an `h2`; the tab titles are "Log in" and "Forgot password".

**After logging out**: **Decision (2026-10-09, V2)**: the plain sign-in screen. V2 has no
logged-out frame, so the Phase 2 "You’re logged out" alert ("U2 Logged out" in V1) is gone.

## 5. Overview (`/`, frames "S3 Your connections" `2066:12985` and "S4" `2077:18315`)

**Decision (2026-10-10)**: S3's layout with a "New connection" button, not S4's inline form,
which has no submit button. The overview stays at `/`. **Decision (2026-10-11)**: right after
signing in, it opens only when a connection exists; otherwise sign-in opens the first-connection
screen (section 6). The logo always leads here.
- Page title "Your connections" with the hint "Open a connection to copy its links, or connect
  another form." (S3: "Pick up your draft or connect another form."; there are no drafts).
- "New connection" (primary, add icon, 203×48), 24 px below the title; then "Connections (n)"
  ("Text/Caption", 16/24 muted) and the rows, gap 8.
- Row ("UseCase/Row", `141:1595`), 1040×76: white card, padding 12/12/12/16, gap 16; the name
  column (260 px: name 18/24 600, "Form ID …" 16/24 muted), "Edited 5 Oct 2026" (16/24 muted),
  a spacer and "View" (KERN tertiary small, underlined). The status badge (130 px column) and
  "Edit" come with US4 (T072, T074), and "· n documents" would need a count in the API's summary.
- **States** (no frames): loading is "Feedback/Loader" from L1 ("Loading your connections…");
  the empty list is the "Doc/Empty setup" pattern ("No connections yet" / "Create your first
  connection. …") under the button; an error is a KERN danger alert with "Try again".

## 6. Create (`/form-connections/new`, frames 02–06d)

**Decision (2026-10-10)**: a wizard whose first two steps stay in the browser. "Publish" creates
the connection with the one `POST` the API has, after the dialog "Is this all the data you
need?". The API has no drafts, so "Save and exit" (S1/S2), the "Draft" badge and "Starts as a
draft." are left out.
- **Progress ("App/Progress" style B, `2006:8022`)**: "Connection", "Documents", "Publish";
  current = blue circle and 16/24 600 name, done = darkblue-050 circle with a 16 px tick and a
  blue name that leads back, todo = 1.5 px decorative-border circle and a muted name; 4 px bars,
  gap 10 below the names. The steps are a `nav` with an ordered list.
- **Step 1 (02, 02a; the title of 02d)**: "Create a connection" (02d, as the wizard is opened
  from the overview) / "Connect any form to the EUDI Wallet for applicants to share verified
  information." The card "UseCase/Create card": "Which form are you connecting?" / "You can
  change these details later.", "Form name" (`name`) and "Form ID" (`servicebw_form`, 320 px),
  each with an (i) tooltip ("Tooltip/Info": 320 px, darkblue-050, darkblue-500 border,
  `--shadow-menu`, arrow on the left or right, 2 px below the icon). **Decision (2026-10-12)**:
  it shows while the mouse is over the (i) or the bubble and goes as soon as it leaves (it was a
  toggletip that a click opened). Keyboard focus shows it too, Escape closes it, and on touch
  screens a tap opens and closes it; its text is the button's description (`role="tooltip"`). The footer note says only
  "Nothing goes live until you publish." The footer's button says **"Continue"**, not "Create
  connection", because nothing is created yet.
- **First connection (`/get-started`; 02 `2080:6059`, 02a `2080:6160`, tooltips 02b `2080:6261`
  and 02c `2080:6367`)**: **Decision (2026-10-11)**: the same wizard, with 02's heading "Create
  your first connection" as step 1's `h1` and tab title. 02 differs from 02d only in that
  heading. The hint, the header title "New connection", the progress, the card and the footer
  are the same, and so are the decisions above:
  - "Continue" instead of 02's "Create connection";
  - the button stays enabled (02 disables it until both fields are filled);
  - the note leaves out "Starts as a draft."

  While `/get-started` checks whether a connection exists, it shows L1's "Feedback/Loader"
  ("Loading your connections…", `2073:5601`) in the app frame, since V2's flow puts L1 between
  "Log in" and 02.
- **Step 2 (03–06)**: "Add documents" / "Choose which wallet documents applicants share, and which
  data from each." The panel "Doc/Panel" (296 px: "Available in the wallet", a row per catalog
  document with "+ Add", or "✓ Added", which turns into a red "Remove" on hover and keyboard
  focus as in 06a; then "Coming to the wallet (6)", closed by default) and, 24 px to the right,
  "Doc/Empty setup" or one "Doc/Data card" per document (800 px, 12 px apart): tile, name, "n of
  m shared", "All data" and the fields as KERN checkboxes, 236 px each (three per row on
  desktop, fewer on narrow screens).
  - **Decision (2026-10-12)**: "+ Add", "✓ Added" and "Remove" share one width, that of the
    widest, "✓ Added" (99 px; Figma sizes each to its content: 82.5, 98.9 and 89.8 px). The
    button no longer jumps, and "Remove" no longer slips out from under the pointer.
  - **Decision (2026-10-12)**: from 1024 px the panel stays put while the data cards scroll past
    it (section 3, "Frame"). It scrolls itself when it is taller than the scrolling area.
  - **Decision (2026-10-10)**: adding a document selects **no** field (V2: all of them). With the
    full catalog that would request 25 or 31 fields, and a field missing from a citizen's PID
    makes the wallet decline. "All data" is mixed (a dash) while only some fields are selected.
  - Removing a document shows the toast "Driving licence removed · Undo" (04a: centred 24 px
    above the footer bar, 6 s). Its time stops while the pointer or the focus is on it; Undo
    brings the document back with its selection and focuses its row.
- **Footer ("App/Footer")**: "Back" (KERN tertiary) and "Publish" (primary); a fixed bar, so
  that "Publish" stays in reach on long field lists.
- **Dialog 06d**: KERN's dialog on a native modal `<dialog>`: "Is this all the data you need?" /
  "Applicants will be asked to share Personal ID (4 items) and Driving licence (3 items). Once you
  publish, the form goes live with this data." / "Check again", "Confirm and publish". It matches
  the KERN Figma dialog, whose strokes are inside: the outline is an inset ring, the footer's top
  padding 23 px, the title 8 px lower than kern.css puts it, and the two buttons equally wide.
  Below 576 px it is KERN's bottom sheet.
- **Validation (contract over design)**: the buttons stay enabled (V2 disables them). A click
  with missing input shows the API's message next to its field ("Enter a name.", "Enter the
  form ID.", "Add at least one document.", "Select at least one field for 'Personal ID'.") and
  moves the focus there. A refused `POST` shows the API's message in a danger alert "Couldn’t
  publish".
  - **Decision (2026-10-13, bug `publish-error-offscreen`; no frame)**: the alert is in dialog
    06d, above the summary, and the dialog stays open; "Confirm and publish" turns into "Try
    again". At the top of the step it was above the cards once they were scrolled, so a failed
    publish looked like nothing had happened. "Check again", Escape and the next attempt take the
    message away; the page itself shows none.
- **Server errors** (no frame; decided 2026-10-11, bug `config-error-leak`): after a `5xx` answer
  the API's message is generic, "Something went wrong on our side, so nothing was saved. Contact an
  administrator and give them the error ID." (a `500` leaves out "so nothing was saved"). A second
  line, "Error ID: " and the answer's `error_id`, follows it in the same text style; one click
  selects the ID (`select-all`). The shared `ErrorNoticeText` renders both, in the alert and under
  the webhook address alike.

## 7. Details (`/form-connections/:id`; frames "22 Published" `2080:8271` and "23" `2080:8406`)

**Decision (2026-10-13, bug `detail-page-layout`)**: the page renders in the wizard's frame,
as frame 22 does, for every connection and every visit. It supersedes the overview-style page
of 2026-10-10 (top bar, 1040 px column, `PageTitle`), whose title pushed the links down.
- **Header ("App/Header", `2080:8272`; full width since 2026-10-13, `2131:4628`)**: logo |
  the connection's name (16/24 600, the page's `h1`, truncated), then KERN's small success
  badge "Live" while `is_active` (US4 adds the deactivated state). Before the user menu, the
  meta (16/24 muted) shows "Form ID …" in the place of 22's "Live since 5 Oct 2026, 09:41";
  badge and meta are hidden below `sm`.
- **Progress ("App/Progress", `2080:8275`)**: the three steps, all done, none a link until
  editing exists (T073); each is read with ", done".
- **Body**: a 900 px column, centred in the 1120 px one: the links card (22's
  "Publish/Success card", `2080:8277`), then the documents, 32 px apart.
- **Footer ("App/Footer", `2080:8278`)**: "Home" (`kern-btn--tertiary`, home icon; only the
  icon below `sm`) in the place of "Edit documents" until T074 adds editing, and "Create new
  connection" (`kern-btn--secondary`, add icon) at the right. Header, footer and, from `split:`,
  the progress stay put while the body scrolls.
- **Links ("Publish/Success card", `2017:6932`)**: padding 40, gap 16. Right after publishing it
  shows the 72 px ring tick, the "Published" badge and "Your connection is live" (26/32 600),
  which takes the focus; otherwise the title is "Links for your form". Then "Add both links to
  your form. Each one goes in its own field." and the two "Publish/Link card"s (number, title,
  (i), URL box and "Copy link"; 12 px apart): "Request link" = trigger URL, "Result link" = pull
  URL. The (i) tooltips have no frame; their text explains what the form management system
  does with each link. **Decision (2026-10-12)**: the UI doesn't name serviceBW. The line
  "serviceBW puts the request’s reference in place of {reference}." under the result link is
  gone, and the tooltips say "Your form management system calls this link…", the term of the
  Form ID's tooltip. Code, specs and docs keep the name. "Copy link"
  turns into "Copied" with a tick for 3 s (23); V2 has no toast. Below 576 px the number goes
  above the link.
- **Updates by webhook** (no frame): **Decision (2026-10-11)**: not on the page until webhook
  updates are delivered (US3). T086 takes the card off the page, and T091 brings it back
  unchanged. The card: the card pattern of "UseCase/Create card": the mode ("Mode:
  Pull – Your form management system calls the result link." or "Mode: Webhook – …"; reworded
  on 2026-10-12 like the tooltips), the field "Webhook address"
  and "Save address" / "Remove address"; the API's message (with its error ID after a `5xx`)
  shows next to the field, and "Webhook address saved/removed. New requests use … mode." is
  announced.
- **Documents** (no frame): each requested document with the header of "Doc/Data card" ("n
  items") and its fields in the data card's columns.
- **States**: "Feedback/Loader" while loading; "E1 Page not found" (404, with "Go to your
  connections") for an unknown or deleted connection; otherwise a title with "Try again". They
  keep the frame and its footer, without the header's title, badge and meta or the progress,
  so the header doesn't jump when the connection arrives.

## 8. Field labels: design versus catalog

**Decision (2026-10-10)**: the full catalog of [data-model.md](data-model.md#document-type-catalog)
(25 and 31 fields), with the design's wording where the design names a field, and the same
wording for the same words elsewhere (Given name, Issue date, Expiry date):

| Design label | Catalog key | Label in code (was) |
|---|---|---|
| Personal ID | `pid` | Personal ID (ID (PID)) |
| Driving licence | `mdl` | Driving licence (Mobile driving licence) |
| Given name | `pid.given_name`, `mdl.given_name` | Given name (Given names) |
| Family name, Date of birth, Place of birth | `pid.family_name`, `pid.birthdate`, `pid.place_of_birth` | unchanged |
| Nationality | `pid.nationalities` | Nationality (Nationalities) |
| Photo | `pid.picture` | Photo (Facial image) |
| Licence classes | `mdl.driving_privileges` | Licence classes (Driving privileges) |
| Issue date | `mdl.issue_date`, `pid.date_of_issuance` | Issue date (Date of issue) |
| Expiry date | `mdl.expiry_date`, `pid.date_of_expiry` | Expiry date (Date of expiry) |
| Address | none (`address_formatted` or the `address_*` fields) | catalog labels |
| Card format, Restrictions, Class B issue date | none in the credentials | not offered |

Also changed with them: "Given name at birth" and "Given name (national characters)". The labels
appear in the API and in the documents delivered to serviceBW.

## 9. Differences from the contract

**Decided in Phase 2** (2026-10-09): the "Username" field, the user menu with the username only,
Figma's type sizes on every width, the KERN import setup, and the shadow tokens (sections 2–4).
The V2 sign-in replaced four more Phase 2 decisions: the forgot-password text, the footer without
links, the benefit wording and the logged-out alert.

**Decided with the V2 sign-in** (2026-10-09, sections 1–4):
- the product name "Product name", as in the design (now "Connection Portal", §1);
- a separate forgot-password screen at `/forgot-password`, which the contract now lists;
- the plain sign-in screen after logging out, with no alert;
- the illustration's chips as designed;
- the Phase 2 message for a failed sign-in, which V2 has no frame for;
- the `--shadow-chip` token, with the illustration's tints written as the success token with an
  opacity.

**Decided with the V2 signed-in screens** (2026-10-10, sections 5–8; the eight points that were
open before Phase 3):
1. **Field catalog**: the full catalog with the design's wording; adding selects no field.
2. **Wizard**: three steps; the first two stay in the browser, and "Publish" saves (no drafts,
   no "Save and exit").
3. **Drafts, versions, publishing**: none in the API. "Published"/"live" stand for a saved
   connection; the active/deactivated badge comes with US4.
4. **Create layout**: the wizard at `/form-connections/new`, opened by S3's "New connection".
5. **Details**: 22's frame (header with name, badge and form ID; all steps done; footer) with
   its link card and a documents card; the webhook card returns with T091. Until 2026-10-13
   it was an overview-style page.
6. **Overview row**: name, "Form ID …", "Edited …", "View"; status and "Edit" come with US4.
7. **Missing states**: from L1, E1 and "Doc/Empty setup"; validation messages instead of
   disabled buttons.
8. **Upcoming documents**: shown as designed, from a fixed list in the frontend; search is gone
   in V2.

**Decided on 2026-10-11** (sections 5–7):
1. **Sign-in**: it opens the first-connection screen (02) only while no connection exists; V2's
   flow sends every sign-in there. With connections, sign-in opens the overview.
2. **First-connection screen**: the wizard at `/get-started` with 02's heading. The wizard's
   2026-10-10 decisions apply to it.
3. **Logo**: still the overview in S3's layout, also from the first-connection screen.
4. **Webhook card**: hidden until webhook updates are delivered (US3).

## 10. Assets and implementation notes

- Glyphs used so far are in `frontend/src/assets/icons/` (Material Symbols from the design, not
  changed): `lock` (grey), `lock-blue`, `check` (white, the seal), `check-circle` (success, the
  chips and the webhook confirmation), `emergency-home` (error), `logout`, `expand-more` and
  `expand-less` (chevrons), `personal-id` and `driving-licence` (muted and `-blue`), `document`,
  `document-blue` and `document-small` (16.8 px), `check-blue-small` (the stepper's tick),
  `tooltip-arrow` and `loader` (56 px). The illustrations are `dot-grid.svg` and
  `success-tick.svg` (72 px). `utils/documentGlyphs.ts` picks a document type's glyph. KERN's own
  icons are used where the design uses KERN's icon components: visibility, info (in the muted
  colour), danger, add, arrows, close, check, content-copy and draft.
- KERN kit notes for Phase 3: `KernInput` passes `placeholder` and other input attributes
  through, but its hint and error ids are fixed, so two inputs with hints share an id.
  `KernCheckbox` has no indeterminate state (it needs a ref). Buttons and badges have no size
  prop (use the `kern-btn--small` class).
- Icon-only buttons (remove ×, toast close, dialog close) need accessible names; the design
  has no focus states, so KERN's focus outline is used. **Decision (2026-10-10)**: for
  keyboard focus only (`:focus-visible`). `kern.css` draws it on any `:focus`, so it stayed on
  buttons after a click; `index.css` turns that off for every KERN button, and for KERN's
  checkboxes too.
- Phase 3 notes: `.kern-btn:has(.kern-sr-only)` is 48 px wide in kern.css, so visually hidden
  text inside a labelled KERN button uses Tailwind's `sr-only`. KERN checkbox labels get the
  design's 6/2 baseline padding (kern.css: 4/2). Because kern.css isn't in a cascade layer, a
  Tailwind state variant on a KERN-classed element needs `!` too (`group-hover:hidden!`).
  KERN's own Fira Sans files give the slash wide sidebearings, so URLs show "https:/ /" more
  spaced than in Figma; that is the font file, not the CSS.
