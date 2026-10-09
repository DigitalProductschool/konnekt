# Design notes: management UI

**Tasks**: T023, T084 | **Date**: 2026-10-09 | **Contract**: [contracts/ui-screens.md](contracts/ui-screens.md)

**Sources**:
- **Figma "Middleware – V2"** (`BZUNank5VjCzqr2BcyhifB`), page "✅ Final Screens" (`33:3`): the
  signed-out screens "01 Log in" (`153:7661`) and "01b Forgot password" (`2041:7569`), with the
  top bar they use. Sections 1–4 follow V2, except the user menu in section 3.
- **Figma "Middleware – V1"** (`hsxN4JO9iGWVxMHHehpOwC`), page "Final Screens" (`33:3`): the
  user menu and every signed-in screen. The user menu and sections 5–8 still describe V1 and have
  not been checked against V2.

Node ids can change when the files are edited.

The design decides presentation (layout, wording, language, components). The contract decides
behavior. Where they differ, section 9 lists the difference and what was decided or is still
open.

## 1. Language and naming

- **Language**: English (`<html lang="en">`).
- **Product name**: **Decision (2026-10-09, V2)**: "Product name", as in V2, which doesn't name
  the product yet (V1 called it "BridgeID"). Tab titles read "{page} – Product name".
  `APP_NAME` in `frontend/src/constants.ts` holds it, and `frontend/index.html` repeats it.
- **"Use case"** is the UI's word for a form connection. The API, the code and the spec keep
  "form connection".
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
| `heading/display` | 48/56 (`2x-large-adaptive`) | 500 | sign-in headline |
| `heading/large` | 26/32 (`large-adaptive`) | 600 | page title, forgot-password title |
| `heading/medium`, `title/default` | 21/24 (`medium-adaptive`) | 600 | card, section and alert titles |
| `title/small`, `label/default`, `body/default/bold` | 18/24 | 600 | labels, names, buttons |
| `body/default/regular` | 18/24 | 400 | body text, inputs |
| `body/large/regular` | 21/32 | 400 | page hints, sign-in lead |
| `body/small/regular`, `label/small` | 16/24 | 400 / 600 | metadata, small buttons, menu |

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

- **Frame**: 1440 wide. On the signed-in screens (V1) the content column is 1040 px, centred
  (x = 200), 40 px below the 64 px top bar, 48 px above the bottom on the overview, with 24 px
  between blocks. The signed-out screens are in section 4.
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
- **Page title ("App/Page title", `37:56`)**: the page's `h1` (26/32, 600), with an optional hint
  under it (21/32, muted), gap 8.
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
  48 px target), 4 px from the field's right end.
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

## 5. Overview (`/`, frame "R1 Your use cases" `142:7687`)

The R frames sit in a section named "Later · returning users (not in this test)".
- Page title "Use cases", hint "3 use cases"; primary button "Create new use case" (add icon);
  caption "Use cases (3)" (16/24 muted, "Text/Caption"); list gap 8.
- Row ("UseCase/Row", `141:1595`), 1040×76: white card, padding 12/12/12/16, gap 16; name
  column 260 px (name 18/24 600, meta "Form ID FS-20417 · 2 rules" 16/24 muted); status column
  130 px with a small KERN badge ("Live · v1" success, "Draft · v2" info); "Edited 12 Sep
  2026" (16/24 muted); spacer; "View" (tertiary small, underlined) and "Edit" (secondary small,
  edit icon).
- No loading, empty or error frames.

## 6. Create and edit

**Wizard header ("App/Header", `37:15`)**: logo, a separator, the form name (16/24 600), a status
badge, the version ("v1 · saved 09:41", muted), and the stepper ("App/Step", `37:14`: pills with
a 28 px number circle; current, done and todo states): "Use case", "Documents", "Rules", "Test",
"Publish". **Wizard footer ("App/Footer", `37:64`)**: 80 px white bar: "Back", "Save and exit"
(tertiary) on the left; "Continue" (primary) on the right.

**02/02a "Create use case" (`153:7903`, `153:8066`)**: page title "Create your first use case",
hint "A use case connects one form to the EUDI Wallet. Applicants share verified data instead
of uploading documents." Card "Which form are you connecting?" / "You can change these details
later." with "Form name" ("As applicants see it.", placeholder "e.g. Passenger transport
licence") and "Form ID" ("From your form management system.", placeholder "e.g. FG-48213",
320 px). Footer: badge "Draft · v1", "Nothing goes live until you publish.", primary "Create
use case" (disabled until both fields are filled).

**03–06 "Documents" (`52:409`, `65:3868`, `65:4299`, `52:824`)**: page title "Add documents",
hint "Choose which wallet documents applicants share, and which data from each."
- Left, 408 px: catalogue card with "Search documents"; group "Available in the wallet" (2):
  "Personal ID" ("Name, birth date, address") and "Driving licence" ("Classes, issue dates"),
  each with "Add" (secondary small) or "Added" (primary small); group "Upcoming documents in the
  wallet" (6, greyed, no action, "You can add these once the wallet supports them."):
  "Certificate of good conduct", "Proof of expertise", "Eye test certificate", "Medical fitness
  certificate", "Residence permit", "Vehicle registration".
- Right, 608 px: "In this setup" with "Nothing added yet" / "1 document · choose the data it
  shares" / "2 documents · choose the data each one shares"; empty state "No documents yet" /
  "Add Personal ID or Driving licence from the list." (dashed neutral-300 border).
- Data card ("Doc/Data card", `41:887`): tile, document name, "{n} of {total} shared", an
  icon-only remove (×) button, an "All data" checkbox (indeterminate when partial) and the
  fields as KERN checkboxes (32 px box, label 18/24 400) in two 260 px columns. Adding a
  document selects all its fields.

**R2 "New use case" (`142:7841`)**: an inline editor on the overview ("Form name", "Form ID",
"Version": "Draft", "Version 1"; "Cancel", "Create use case").
**R3 "Edit a live version" (`142:8035`)**: KERN dialog over a scrim: "Create version 2 of
Fishing licence?" / "You’ll edit a copy. Version 1 stays live until you publish version 2." /
"Cancel", "Create version 2".

## 7. Details ("22 Published" `59:3630`, "23 Published – link copied" `65:6676`)

- Success alert "Published" / "Add both links to your form. Each goes in its own field."
- Two link cards ("Publish/Link", `50:888`): number circle; "Wallet check link" (chip "For
  applicants", "Paste into Settings › Wallet sign-in › Start link.") and "Result link" (chip
  "For your form", "Paste into Settings › Wallet sign-in › Result address."); a read-only URL
  box and "Copy link" (secondary, copy icon; "Copied" after copying).
- Toast "Link copied" ("Feedback/Toast", `87:844`, announced politely, closes by itself).
- Footer: "Edit rules" (secondary) and "Create new use case" (primary).
- Error pattern from "F4" (`88:8938`): KERN danger alert "Couldn’t publish" / "Nothing went live.
  Check your connection and try again."

## 8. Field labels: design versus catalog

The design offers 7 Personal ID fields and 5 Driving licence fields; the catalog in
[data-model.md](data-model.md#document-type-catalog) has 25 and 31.

| Design label | Catalog key | Catalog label |
|---|---|---|
| Given name | `pid.given_name` | Given names |
| Family name | `pid.family_name` | Family name |
| Date of birth | `pid.birthdate` | Date of birth |
| Address | none (`address_formatted` or the `address_*` group) | — |
| Nationality | `pid.nationalities` | Nationalities |
| Place of birth | `pid.place_of_birth` | Place of birth |
| Photo | `pid.picture` | Facial image |
| Licence classes | `mdl.driving_privileges` | Driving privileges |
| Class B issue date | none (inside `driving_privileges`) | — |
| Card format | none (no ISO 18013-5 element) | — |
| Expiry date | `mdl.expiry_date` | Date of expiry |
| Restrictions | none (codes inside `driving_privileges`) | — |

Document names: "Personal ID" (catalog "ID (PID)") and "Driving licence" (catalog "Mobile
driving licence").

## 9. Differences from the contract

**Decided in Phase 2** (2026-10-09): the "Username" field, the user menu with the username only,
Figma's type sizes on every width, the KERN import setup, and the shadow tokens (sections 2–4).
The V2 sign-in replaced four more Phase 2 decisions: the forgot-password text, the footer without
links, the benefit wording and the logged-out alert.

**Decided with the V2 sign-in** (2026-10-09, sections 1–4):
- the product name "Product name", as in the design;
- a separate forgot-password screen at `/forgot-password`, which the contract now lists;
- the plain sign-in screen after logging out, with no alert;
- the illustration's chips as designed;
- the Phase 2 message for a failed sign-in, which V2 has no frame for;
- the `--shadow-chip` token, with the illustration's tints written as the success token with an
  opacity.

**Open, to decide before Phase 3** (the contract keeps the behavior until then). These were
raised against V1; check them against V2 first, since V2 may have changed those screens:
1. **Field catalog**: cut the catalog to the design's subset and labels, or show every catalog
   field. Three design fields have no data source (section 8), and "Address" needs a mapping.
2. **Wizard**: the 5-step stepper. Rules, Test and Publish have no API. Which steps to show, and
   what "Save and exit" and "Continue" do, given that the API saves name, form and documents in
   one call.
3. **Drafts, versions and publishing**: the API has no drafts; a saved form connection works at
   once, and editing keeps the URLs (FR-005). The "Draft"/"Live"/"Published" badges, "v1",
   "Nothing goes live until you publish." and R3's new-version dialog need replacement wording
   (active/deactivated, and the FR-005 note that requests in progress keep their configuration).
4. **Create layout**: the 02 card on `/form-connections/new` or the R2 inline editor on `/`.
5. **Details screen**: there is no frame. Proposed: the frame of 22 with the two link cards for
   `trigger_url` ("Wallet check link"?) and `pull_url` ("Result link"?), plus the `{reference}`
   hint, the mode, the webhook address field, the configuration summary, "Edit", and
   deactivate/reactivate/delete with KERN dialogs (R3 pattern). Also whether the chip "For
   applicants" fits, since serviceBW, not the applicant, calls the trigger URL.
6. **Overview row**: "· n rules" and the version have no data; the meta line would show the
   serviceBW form. "Live"/"Draft" become active/deactivated (wording and badge style), and the
   order is most recently updated first.
7. **Missing states**: loading, empty and error states of the overview, validation errors on the
   create and documents screens (the design disables buttons instead; SC-009 needs messages and
   focus on the first problem), and the details screen's loading and error states.
8. **Upcoming documents and search**: not in the API; hard-code them or leave them out.

## 10. Assets and implementation notes

- Glyphs used so far are in `frontend/src/assets/icons/` (Material Symbols from the design, not
  changed): `lock` (grey), `lock-blue`, `check` (white, the seal), `check-circle` (success, the
  chips), `emergency-home` (error), `logout`, `expand-more` (chevron). The dot grid of the
  sign-in illustration is `frontend/src/assets/illustrations/dot-grid.svg`. The V1 benefit
  glyphs (`verified-user`, `task-alt`, `schedule`) were removed with the benefits. KERN's own
  icons are used where the design uses KERN's icon components (visibility, info, danger in
  alerts). The document glyphs (personal-id, driving-licence, document), `save` and `remove` are
  still to be exported from Figma.
- KERN kit notes for Phase 3: `KernInput` passes `placeholder` and other input attributes
  through, but its hint and error ids are fixed, so two inputs with hints share an id.
  `KernCheckbox` has no indeterminate state (it needs a ref). Buttons and badges have no size
  prop (use the `kern-btn--small` class).
- Icon-only buttons (remove ×, toast close, dialog close) need accessible names; the design
  has no focus states, so KERN's focus outline is used.
