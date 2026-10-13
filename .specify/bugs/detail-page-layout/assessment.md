# Bug Assessment: The details page doesn't follow Figma "22 Published": its title is on the page, and the progress and action bar are missing

- **Slug**: detail-page-layout
- **Created**: 2026-10-13
- **Source**: pasted text plus a Figma link:
  `https://www.figma.com/design/BZUNank5VjCzqr2BcyhifB/Middleware---V2---SCOPED?node-id=2080-8271&m=dev`
  - Host: `www.figma.com`
  - Policy branch: **confirmed-by-user** (the host is not on the safe list). The page wasn't
    fetched. The frame was read through the Figma MCP: `get_screenshot` of `2080:8271`, and
    `get_metadata` of `2080:8271` and `2080:8406`, run by the `figma-node-finder` agent. No
    `get_design_context` call was made yet; the fix needs it (see "Proposed Remediation").
- **Verdict**: valid. The page does differ from frame 22 in every point of the report. It isn't a
  regression: the current layout follows a recorded decision (design-notes.md §7, 2026-10-10),
  which the reporter now overrides.
- **Severity**: medium. No data, backend or security impact. But this is the screen every new
  connection ends on, it looks unlike the rest of the flow, and it lacks the design's next actions.
  The only way to start another connection from it is the logo, then "New connection".

## Report (verbatim or summarized)

> The published page is quite different from the figma design. This is the figma link:
> https://www.figma.com/design/BZUNank5VjCzqr2BcyhifB/Middleware---V2---SCOPED?node-id=2080-8271&m=dev
>
> Things i noticed:
> - Product name should be in the header of the page, having it on the page itselft push down
>   everything.
> - You can put the id in the header as well
> - The breadcrumbs are not showned in the current version, but are present in the design
> - I Like the document summary, keep it
> - We are also missing the footer. Edit documents is not implmeneted yet so you can skip it and
>   put "home" as a button, but implement the "create new connection button". THis is a footer that
>   should be sticky, so if i scroll the page it stays there. Same as header

How the report's terms map to the code and the design:

| Report | Code today | Figma "22 Published" (`2080:8271`) |
|---|---|---|
| "Product name" | The connection's name, rendered as the page's `h1` by `PageTitle`. The app name `APP_NAME` ("Product name") is already in the top bar. | The "service" text `I2080:8272;37:20` in "App/Header", after the logo and the separator ("Passenger transport licence") |
| "the id" | "Form ID …", the hint under that `h1` | The header has a "meta" text `I2080:8272;37:33` before the user menu, reading "Live since 5 Oct 2026, 09:41" |
| "breadcrumbs" | none | "App/Progress" `2080:8275`: Connection ✓, Documents ✓, Publish ✓, all done. Figma has no breadcrumb component. This is the wizard's step bar. |
| "document summary" | `DocumentsSummary` card | no frame (the design has no counterpart) |
| "footer" | none | "App/Footer" `2080:8278`, 80 px: "Edit documents" (pencil, tertiary) on the left, "Create new connection" (plus, outlined secondary) on the right |

## Symptom

The details page `/form-connections/:id`, which opens right after "Publish", renders in the
overview frame. It has a full-width top bar with only the logo and the user menu, and a 1040 px
column whose first block is a 48/56 `h1` with the connection's name and a "Form ID …" hint. That
title takes about 88 px plus a 24 px gap above the links card. There is no step bar and no action
bar.

Frame 22 uses the wizard's frame instead:
- "App/Header" (logo | connection name, "Live" badge … meta, user menu) on the 1120 px column;
- the three-step progress, all done;
- the 900 px "Publish/Success card" centred in the 1120 px column;
- a fixed 80 px "App/Footer" with the next actions.

## Reproduction

1. Sign in. Open `/form-connections/new`, fill in the connection step, add a document with at least
   one field, then choose "Publish" and "Confirm and publish". The editor navigates to
   `/form-connections/:id` with `{ published: true }` (`FormConnectionEditor/index.tsx:99-100`).
   Opening any connection from the overview ("View") shows the same layout, without the "live"
   confirmation.
2. Size the window to 1455 × 900 (a 1440 frame plus KERN's scrollbar gutter, see CLAUDE.md
   "Visual verification").
3. Compare with frame `2080:8271`:
   - Top bar: full width (logo at x = 32) with no title, badge or meta. Figma: the 1120 column
     (logo at x = 160), then name, badge and meta.
   - Content: the `h1` and hint at y = 104, and the links card at about y = 216, 1040 px wide.
     Figma: the progress at y = 104, and the card at y = 176, 900 px wide, centred.
   - No action bar at the bottom. When the documents card makes the page taller than the window,
     the window scrolls, and only the top bar stays in place.

The symptom was established from the code, not in a running app: no dev server was running during
the assessment. Every point follows directly from the code paths below.

## Suspected Code Paths

- `frontend/src/App.tsx:51`: the details route is inside `SignedInScreens`, so it renders in
  `AppLayout`. The wizard routes (`SignedInWizards`, line 57) render their own `WizardLayout`.
- `frontend/src/components/AppLayout/index.tsx:15-23`: its `TopBar` has no `title` and spans the
  full width. Its column is 1040 px, and it has no footer slot.
- `frontend/src/pages/FormConnectionDetail/index.tsx:97-100`: `PageTitle` with the connection's name
  and `DETAIL_COPY.formId(...)`. This is the block that "pushes down everything".
- `frontend/src/pages/FormConnectionDetail/index.tsx:95-108`: no `WizardProgress` and no footer.
- `frontend/src/components/TopBar/index.tsx:39-48`: renders the title as a `span`. It has no slot
  after the title (the badge) and none before the user menu (the meta): `children` sit after the
  `flex-1` spacer, and `WizardLayout` fills them with `UserMenu`.
- `frontend/src/components/WizardLayout/index.tsx:19-50`: already gives most of frame 22.
  - It has "App/Header" with `title` on the 1120 column.
  - Its `head` slot starts 40 px below the header, with 32 px below it.
  - Its 80 px footer bar never scrolls, and neither does the header. That is the "sticky" behaviour
    the reporter asks for.
  - Missing: `title` is required, there is no badge or meta slot, and the body can't centre a
    loading or error state, which `AppLayout`'s column can.
- `frontend/src/components/WizardProgress/index.tsx:75-90`: with `current={steps.length}` every step
  is "done", and without `onSelect` none is a link. That needs no change.
  `WizardStep.tsx:41-46`: a done step that isn't a link doesn't get the `DONE_SUFFIX` (", done")
  for screen readers.
- `frontend/src/pages/FormConnectionEditor/constants.ts:4`: `STEPS` lives in the editor's constants.
  The details page would need it too.
- `frontend/src/pages/FirstConnection/LoadingConnections.tsx`: the precedent for a route under
  `SignedInWizards` that renders one of its states in `AppLayout`.
- `specs/001-servicebw-eudi-middleware/design-notes.md:333-336` (§7) records the decision behind
  the current layout: "an overview-style page (top bar, 1040 px column), as V2 has no frame for an
  existing connection". §3 (lines 159-163) leaves the header's status badge and meta out of the
  wizard, "since there are no drafts".
- `CLAUDE.md:438-450`: the layout rules name the create wizard as the only signed-in screen outside
  `AppLayout`. The heading rule reads "one `h1`: `PageTitle` on signed-in screens".

## Root Cause Hypothesis

This isn't a coding error. It's a layout decision the reporter now reverses. On 2026-10-10 the
details page was specified as an overview-style page, because V2 seemed to have no frame for it
(design-notes §7, §9 point 5). So it was built inside `AppLayout`, with `PageTitle` carrying the
name and the form ID. The parts of frame 22 that belong to the wizard's frame were left out: the
header title, badge and meta, the progress, the 900 px card column and "App/Footer".

Frame 22 is in fact the wizard's last step (section "3 · Publish"), and it uses the same frame as
every other wizard step. The reporter wants the details page to look like it. Confidence: high.

## Proposed Remediation

**Preferred**: render the details page in the wizard's frame, and reuse `WizardLayout` instead of
building a third layout.

1. **Route**: in `App.tsx`, move `ROUTES.formConnection` from `SignedInScreens` to
   `SignedInWizards`. The page renders `WizardLayout` itself in **every** state:
   - Loading, failed and not found show no title, badge, meta or progress, and the same footer.
   - Coming from "Publish", the frame then stays put (wizard → details) and only the content
     changes. Rendering the loading state in `AppLayout`, as `LoadingConnections` does, would make
     the header jump twice, from the column to the full width and back.
   - `WizardLayout` needs a way to centre a state in its body. `NotFound` and the loader rely on
     `AppLayout`'s full-height column (`flex-1`). Its `title` becomes optional (`TopBar` already
     allows that).
2. **Header ("App/Header", `2080:8272`)**:
   - The connection's name becomes `WizardLayout`'s `title`.
   - Extend `TopBar` (passed through by `WizardLayout`) with:
     - a slot after the title, for KERN's small success badge "Live" (`KernBadge
       variant="success" withIcon`), shown while `is_active` (every connection, until US4 adds
       deactivating);
     - a slot before the user menu, for the meta text. Put "Form ID …"
       (`DETAIL_COPY.formId`) in the place of Figma's "Live since …" (see Open Questions).
   - On this page `TopBar` renders the title as the `h1`, so the page keeps one `h1` naming the
     connection, and its outline doesn't change: h1 name → h2 "Your connection is live" / "Links
     for your form" → h3 link titles → h2 "Documents".
   - Remove `PageTitle` from the page.
3. **Progress ("App/Progress", `2080:8275`)**: `head={<WizardProgress steps={STEPS}
   current={STEPS.length} />}`, with all steps done and none a link, because editing doesn't exist
   yet (T073).
   - Move `STEPS` to a shared module (e.g. `src/constants.ts`), so that the editor and the details
     page both import it.
   - Give the non-link done step its ", done" suffix in `WizardStep`.
4. **Body**: the links card ("Publish/Success card", `2080:8277`, 900 px wide), then
   `DocumentsSummary`, unchanged, in the same centred 900 px column. Keep the wizard body's 32 px
   gap; the summary has no frame. The focus still moves to "Your connection is live" right after
   publishing.
5. **Footer ("App/Footer", `2080:8278`)**: a new `DetailFooter.tsx` beside the page. On the left is
   "Home", in the place of "Edit documents": a React Router `Link` to `ROUTES.overview`,
   `kern-btn kern-btn--tertiary` with `kern-icon--home`. On the right is "Create new connection": a
   `Link` to `ROUTES.newFormConnection`, `kern-btn kern-btn--secondary` with `kern-icon--add`.
   Both icon classes exist in KERN 2.8 (`kern.min.css`). The copy goes in `DETAIL_COPY`.
6. **Exact values**: follow CLAUDE.md's Figma workflow during the fix. Run `get_design_context` and
   `get_screenshot` on `I2080:8272;37:21` (badge), `I2080:8272;37:33` (meta), `2080:8275`,
   `2080:8277` and `I2080:8278;37:65` (footer content). The footer's button variants are read off
   the screenshot so far and need confirming there.
7. **Docs**: record the new decision, which supersedes the one of 2026-10-10:
   - design-notes.md §7, §3 (the header's badge and meta on the details page) and §9 point 5;
   - `contracts/ui-screens.md` "Details": the name and the form are now in the header;
   - CLAUDE.md "Frontend Development Guidelines": the details page also renders `WizardLayout`,
     and its `h1` is the header title.

**Alternatives**:
- **Give `AppLayout` optional header and footer slots** and keep the route where it is. This keeps
  one layout for signed-in screens. But it rebuilds what `WizardLayout` already does: the column
  header, the non-scrolling footer, and the `split:` head that stays put. The details page would
  also switch from the 1120 to the 1040 column, unlike frame 22. Not recommended.
- **Make the links card's heading the `h1`** instead of the header title. The `h1` stays in `main`,
  but it then says "Links for your form" on every connection rather than naming it, and the link
  cards' `h3`s skip a level. Use it only if the header must not hold a heading.

**Files likely to change**:
- `frontend/src/App.tsx`
- `frontend/src/components/TopBar/index.tsx`, `types.ts`
- `frontend/src/components/WizardLayout/index.tsx`, `types.ts`
- `frontend/src/components/WizardProgress/WizardStep.tsx`
- `frontend/src/constants.ts`, `frontend/src/pages/FormConnectionEditor/constants.ts`
  (`STEPS` moves), `frontend/src/pages/FormConnectionEditor/index.tsx` (its import)
- `frontend/src/pages/FormConnectionDetail/index.tsx`, `constants.ts`, `types.ts`, a new
  `DetailFooter.tsx`, `ConnectionLinks.tsx` (900 px width)
- `specs/001-servicebw-eudi-middleware/design-notes.md`, `contracts/ui-screens.md`, `CLAUDE.md`

**Tests to add or update**: the frontend has no test runner (`package.json` has no `test`
script), and the backend isn't touched. So the fix is verified with:
- `npm run build`, `npm run lint` and `npm run format:check`.
- CLAUDE.md's visual verification at 1455 × 900 against `2080:8271`. Check:
  - header: logo x = 160, separator x = 302, title x = 319, badge x = 537, meta right-aligned
    before the user menu at x = 1216;
  - progress 1120 × 40 at y = 104;
  - card 900 px wide at x = 270, y = 176;
  - footer 80 px at y = 820, content 1120 × 48 at x = 160.
  Repeat for `2080:8406` (link copied).
- Scrolling, with a connection whose documents card makes the body taller than the window: the
  header and the footer stay in place, and only the area between them scrolls. From 1024 × 640 the
  progress stays put too.
- 375 px wide: the header fits (see Risks), and the footer's two buttons fit or wrap without a
  horizontal scrollbar.
- Right after publishing, the focus is on "Your connection is live". A screen reader's heading list
  shows one `h1` with the connection's name. The progress is announced as "Steps", with each step
  done.
- Every state stays in the same frame: loading, not found (an unknown ID) and failed (backend
  stopped), with "Try again" working.

## Risks & Considerations

- **Narrow screens**: logo, name, badge, meta and user menu don't fit at 375 px (about 470 px of
  content for 343). The name already truncates. The meta needs hiding or moving below a
  breakpoint, which means the Form ID drops out of view on phones (see Open Questions).
- **Upcoming tasks on this page**: they must fit the new frame.
  - T074 adds "Edit" and the status actions. "Edit" takes the footer's left slot ("Edit documents"
    in Figma) and replaces "Home". Its dialogs go in `WizardLayout`'s `overlay`.
  - T091 brings the webhook card back, in the body below the links.
  - T073 could later make the done steps link to the edit steps.
- **Tooltips in the scrolling area**: the link cards' (i) tooltips now sit inside
  `WizardLayout`'s scroll container. The wizard's own tooltips work there, but check that the
  request link's tooltip isn't clipped at the top edge of the area.
- **Conventions change**: two signed-in screens, not one, will render outside `AppLayout`. The
  details page's `h1` is in the header rather than `PageTitle`. Both have to be written into
  CLAUDE.md, or later work will "fix" them back.
- **"Live" wording**: the API has no drafts, so "Live" means saved and active (design-notes §9,
  point 3). US4 adds deactivation, and then the badge has to show the deactivated state.

## Open Questions

- [NEEDS CLARIFICATION: header meta. Should it show "Form ID …" in the place of Figma's "Live since
  5 Oct 2026, 09:41", or both ("Form ID … · Live since …", from `created_at`)? Default if not
  answered: Form ID only.]
- [NEEDS CLARIFICATION: should the "Live" badge after the name be shown? The report doesn't mention
  it, but frame 22 has it. Default: yes, while `is_active`.]
- [NEEDS CLARIFICATION: on phones, should the Form ID be hidden or moved under the header? Default:
  hidden below `sm` (640 px).]
- [NEEDS CLARIFICATION: should the progress show on every visit, or only right after publishing?
  Default: on every visit. The frame is the same either way.]
- Assumed: "Product name" in the report means the connection's name, i.e. the page's current
  `h1`. The app name "Product name" is already in the top bar.

## Unverified

Nothing instruction-like came from the Figma file. Only frame structure and a screenshot were read.
