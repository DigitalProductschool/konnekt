# Bug Assessment: "Connection Portal" name and a left-aligned header brand on every page

- **Slug**: product-name-header
- **Created**: 2026-10-13
- **Source**: pasted text, plus the Figma link
  `https://www.figma.com/design/BZUNank5VjCzqr2BcyhifB/Middleware---V2---SCOPED?node-id=33-3&m=dev`
  (host: `www.figma.com`, not on the safe list; **confirmed-by-user**, read through the Figma MCP:
  metadata via the `figma-node-finder` subagent, and screenshots of headers `2131:4628` and
  `2131:4385`. Nothing in the file was treated as an instruction.)
- **Verdict**: valid
- **Severity**: low

## Report (verbatim or summarized)

> We have to fix two things. The first one is really simple: every time there is 'Product name' we
> have to change it to 'Connection Portal' this is now the temporary name of this middleware. You
> can change this only in the frontend, backend and docs are fine as they are.
> The second things is related to the header. From the old figma design the 'Product name' and
> logo where changing position based on the page, so sometime they where completly on the left
> (like in the connection list page), and other times they were more central (like in the new
> connection page). Now figma is fixed and we want both logo and name to be completly on the left
> in every page. New figma link for reference:
> https://www.figma.com/design/BZUNank5VjCzqr2BcyhifB/Middleware---V2---SCOPED?node-id=33-3&m=dev

What the Figma page shows (node `33:3`, "✅ Final Screens", every screen is 1440 px wide):

- Every header instance (`2131:4758` overview S3, `2131:4773` S4, `2131:4385` wizard 02 and its
  variants, `2131:4467` documents 03 and later, `2131:4628` "22 Published" (the details screen),
  `2131:4341`/`2131:4363`/`2131:4374` log in and forgot password, `2131:5013`/`2131:5028`
  loading and 404) is a 1440 × 64 instance with **padding 0 32**. The brand is at **x = 32**: a
  16 px mark, an 8 px gap, then the name at x = 56. No screen centres it.
- The screenshots of `2131:4628` and `2131:4385` read **"Connection Portal"**.
- Wizard and details header, left to right with gaps of 16: brand (32–187), a 1 × 24 separator
  at x = 203, the title at x = 220, the status pill (documents step and details), a flexible
  spacer, the meta text (details only, ends at 1328), then the user menu at x = 1344–1408. The
  header has **no 1120 px column**. That column (x = 160) exists only in the body (for example
  `2080:6062`).

## Symptom

1. The app calls itself "Product name": in the header's brand on every screen, in every tab title
   ("{page} – Product name"), and in the static `<title>` shown before the app loads. Expected:
   "Connection Portal".
2. On the overview and the sign-in screens the logo and name sit 32 px from the left edge. On the
   create wizard (`/form-connections/new`, `/get-started`) and the details (`/form-connections/:id`)
   they move inward to the left edge of the centred 1120 px column (x = 160 in a 1440 px window),
   and the user menu moves in to x = 1280. Expected: the brand at x = 32 and the user menu at the
   right padding on every screen, as in the fixed Figma.

## Reproduction

1. Sign in and look at the overview (`/`) at a 1455 × 900 window (a 1440 frame plus KERN's
   scrollbar gutter, see CLAUDE.md "Visual verification"). The header reads "Product name" with
   its logo at x = 32. The tab reads "… – Product name".
2. Choose "New connection" (`/form-connections/new`), or sign in with no connections
   (`/get-started`). The logo and name jump to x = 160. The user menu ends at x = 1280 instead of
   1408.
3. Open a connection from the overview (`/form-connections/:id`). The header shows the same
   inward shift.
4. Sign out (`/login`). The brand is back at x = 32.

These positions follow from the code (`TopBar` with `width="column"` versus the default) and
match the earlier assessment `detail-page-layout`, which measured "logo at x = 160" on the
1120 column. They were not re-measured in a running browser during this assessment.

## Suspected Code Paths

- `frontend/src/constants.ts:1-2`: `APP_NAME = 'Product name'`, with the comment "As in the Figma
  design, which doesn't name the product yet". It is the only source of the name at runtime.
- `frontend/index.html:8`: `<title>Product name</title>`, the static title shown before React
  runs `useDocumentTitle()`.
- `frontend/src/components/TopBar/index.tsx:30`: renders `APP_NAME` in the brand. No change is
  needed here for the rename.
- `frontend/src/hooks/useDocumentTitle.ts:8`: `"{page} – {APP_NAME}"`. It picks up the rename
  automatically.
- `frontend/src/components/WizardLayout/index.tsx:38`: passes `width="column"` to `TopBar`. This
  is the only caller that does. `AppLayout` (`components/AppLayout/index.tsx:16`) and
  `AuthLayout` (`components/AuthLayout/index.tsx:14`) use the default `'full'`.
- `frontend/src/components/TopBar/index.tsx:37-40`: with `width === 'column'` the header keeps
  `px-16` on every width (it drops `sm:px-32`). Its inner row also becomes
  `mx-auto max-w-1120`, so the brand, title, badge, meta and user menu all line up with the
  centred column. This causes the inward shift.
- `frontend/src/components/TopBar/types.ts:12-13`: the `width?: 'full' | 'column'` prop and its
  doc comment ("'column' lines the content up with the wizard's 1120 px column ('App/Header')").
- `frontend/src/components/WizardLayout/index.tsx:6-9`: the `CENTRED_GUTTERS` comment explains
  the gutter by keeping the column "lined up with the header's and footer's". After the fix only
  the footer is centred, so the comment needs to drop "header's". The code itself stays, because
  the footer still uses the 1120 px column.

## Root Cause Hypothesis

Both issues come from the old V2 design, which the code followed faithfully. The old Figma left
the product unnamed ("Product name", recorded as a decision in `design-notes.md` §1), and its
"App/Header" (`37:15`) put the wizard's header on the 1120 px content column (design-notes §3:
"lined up with the wizard's 1120 px column (x = 160)"). `TopBar` implemented that as
`width="column"`, and `WizardLayout`, which the create wizard, the first-connection screen and
the details page all render, opted into it. The fixed Figma names the product "Connection
Portal" and uses one full-width header with 32 px padding everywhere. The code is outdated, not
broken. **Confidence: high.** Both causes are in single, well-located lines, and the Figma
screenshots confirm the new text and position.

## Proposed Remediation

**Preferred**:

1. **Rename (frontend only)**: set `APP_NAME = 'Connection Portal'` in
   `frontend/src/constants.ts`, and change its comment to say this is the middleware's temporary
   name, as in the fixed Figma (2026-10-13). Change `<title>` in `frontend/index.html` to
   `Connection Portal`. The header brand and every tab title follow through `APP_NAME`. Leave the
   backend, `docs/` and `specs/` as they are, as the report asks.
2. **Header**: remove the `width` prop from `TopBar`, since its only `'column'` caller goes
   away. The `<header>` then always gets `px-16 sm:px-32`, and the inner row loses the
   conditional `mx-auto max-w-1120`, keeping `flex w-full min-w-0 items-center gap-16`. Remove
   `width="column"` from `WizardLayout`'s `TopBar`. Update the comments that describe the old
   layout: `TopBar`'s doc block ("With a title and the column width it is 'App/Header'" → "With a
   title it is 'App/Header'"), and `CENTRED_GUTTERS` in `WizardLayout` (the column now lines up
   with the footer's only). The body's 1120 px column, the `head` and the footer bar stay as
   they are. In Figma the 1120 px column remains in the body.

   Result at 1440 px: the brand at x = 32 and the name at x = 56 on every screen. On the wizard
   and details screens the separator comes at x = 203 and the title at x = 220, with the user menu
   ending at x = 1408. This is the same right edge as on the overview, and it matches Figma
   `2131:4385` and `2131:4628`. Below `sm` the header keeps its 16 px padding, as all screens do
   today.

**Alternatives**:
- *Keep the prop and pass `width="full"` from `WizardLayout`* (or just drop the attribute). This
  is a one-line diff, but it leaves `'column'` as a dead option whose doc comment still points to
  a layout the design no longer has. It is not recommended, because the project removes unused
  options instead of keeping them.

**Files likely to change**:
- `frontend/src/constants.ts`
- `frontend/index.html`
- `frontend/src/components/TopBar/index.tsx`
- `frontend/src/components/TopBar/types.ts`
- `frontend/src/components/WizardLayout/index.tsx`

**Tests to add or update**:
- The frontend has no test runner (no Vitest or Playwright in `package.json`), and no test in the
  repo matches "Product name". Lock the fix in with checks instead:
  - `npm run build` (tsc catches any leftover `width=` prop), `npm run lint` and
    `npm run format:check` in `frontend/`.
  - Search for leftovers: `grep -rn "Product name" frontend/src frontend/index.html` should
    return nothing.
  - Visual check at 1455 × 900, following CLAUDE.md's workflow, with `getBoundingClientRect` on
    the logo mark, the name and the user-menu trigger on `/login`, `/`, `/get-started`,
    `/form-connections/new` (both the connection and documents steps) and `/form-connections/:id`.
    Expected on each: mark x = 32, name x = 56, header `padding-left` 32px, user-menu right
    edge 1408 (no menu on `/login`). The wizard title should be at x = 220. Compare with Figma
    screenshots `2131:4758`, `2131:4385`, `2131:4467` and `2131:4628`.
  - `document.title` should end in "– Connection Portal" on each screen.
  - At 375 px wide, the header padding should be 16 px and the title or name truncated, not
    overflowing, on the details screen.

## Risks & Considerations

- **Intended visual change on the wizard and details**: the header title no longer lines up with
  the body's 1120 px column below it, and on windows wider than 1440 px the user menu moves to
  the window's right edge, as it already does on the overview. Figma shows exactly this.
- **Docs drift (accepted for the rename)**: `specs/001-servicebw-eudi-middleware/design-notes.md`
  (§1 "Product name" decision, the tab-title example, and §3 "Wizard header … lined up with the
  wizard's 1120 px column … `TopBar` draws it with `title` and `width="column"`"), plus
  `contracts/ui-screens.md`, `spec.md`, `quickstart.md` and `tasks.md`, will still say "Product
  name". The §3 header lines will also describe a prop that no longer exists. The report asks to
  leave the docs for the rename. See the open question about the header lines.
- **No backend impact**: the backend contains no "Product name" string (searched), and the name
  isn't part of any API contract.
- **No change to the `split:` or scrolling behaviour**: the header is outside `WizardLayout`'s
  scrolling area, so its gutters (`CENTRED_GUTTERS`) are unaffected. They still keep the body's
  column lined up with the footer bar's.
- **Prior decisions superseded**: `.specify/bugs/detail-page-layout/` built the details header on
  the 1120 column, following the old "App/Header" `2080:8272`. This fix supersedes that part only.
  The details page stays in the wizard frame.

## Open Questions

- [NEEDS CLARIFICATION: the report says "docs are fine as they are" for the rename. Should
  `design-notes.md` §3 (and the "App/Header" line in §7) still be updated for the **header** change,
  so that the recorded decision matches the code? Without that update, §3 keeps describing
  `width="column"` and x = 160. Default if unanswered: leave all docs untouched, as asked.]
- Out of scope, noted only: Figma's wizard header reads "New Connection" (capital C), while the
  code uses "New connection" (`pages/FormConnectionEditor/constants.ts:7`), which matches the
  UI's sentence case elsewhere. Not part of this report, so not proposed for change.

## Unverified

- The Figma node text was read from screenshots, not from text data. `get_metadata` returns no
  characters, and the screenshots of `2131:4628` and `2131:4385` clearly read "Connection
  Portal". The other header instances share the same component and brand geometry (a 155 px
  brand frame with the name at x = 56), so they are assumed to read the same.
- The current app's positions (x = 160 on wizard and details) are derived from the code and the
  earlier `detail-page-layout` measurement, not re-measured in a browser for this assessment.
