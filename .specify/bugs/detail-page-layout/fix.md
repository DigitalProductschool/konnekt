# Bug Fix: The details page now follows Figma "22 Published": the wizard's frame with header, progress and footer

- **Slug**: detail-page-layout
- **Fixed**: 2026-10-13
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

`/form-connections/:id` now renders in `WizardLayout`, the wizard's frame, like frame 22.
- **Header**: the connection's name (as the page's `h1`), the "Live" badge and "Form ID …".
- **Progress**: all three steps done.
- **Body**: the links card and the documents summary in a centred 900 px column.
- **Footer**: a fixed bar with "Home" and "Create new connection".

`PageTitle` no longer pushes the content down, and the loading, not-found and error states keep
the same frame.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `frontend/src/App.tsx` | modified | The details route moves from `SignedInScreens` (AppLayout) to `SignedInWizards` |
| `frontend/src/components/TopBar/index.tsx`, `types.ts` | modified | New `titleAsHeading` (title as `h1`), `badge` (after the title) and `meta` (muted, before the user menu). Badge and meta are hidden below `sm`, and the meta truncates |
| `frontend/src/components/WizardLayout/index.tsx`, `types.ts` | modified | `title` and `head` are optional, and the new header props pass through. Without `head` the body gets the 40 px top padding itself. The body and its column fill the height (`flex-1`), so a state can centre in them |
| `frontend/src/components/WizardProgress/WizardStep.tsx`, `constants.ts` | modified | A done step that isn't a link now also gets ", done" for screen readers |
| `frontend/src/constants.ts` | modified | `CONNECTION_STEPS`, moved from the editor's `STEPS` |
| `frontend/src/pages/FormConnectionEditor/constants.ts`, `index.tsx` | modified | `STEPS` removed, `CONNECTION_STEPS` imported |
| `frontend/src/pages/FormConnectionDetail/index.tsx` | modified | Renders `WizardLayout` in every state. The loaded state has the header title, badge and meta, the progress, the 900 px column and the footer. `PageTitle` is removed |
| `frontend/src/pages/FormConnectionDetail/DetailFooter.tsx` | added | "Home" (tertiary, `kern-icon--home`, only the icon below `sm`) and "Create new connection" (secondary, `kern-icon--add`, `ml-auto`) |
| `frontend/src/pages/FormConnectionDetail/DetailFailed.tsx` | added | The error state (title, "Try again", "Go to your connections"), moved out of `index.tsx` unchanged |
| `frontend/src/pages/FormConnectionDetail/constants.ts`, `types.ts` | modified | Copy `live`, `home`, `newConnection`, and `DetailFailedProps` |
| `specs/001-servicebw-eudi-middleware/design-notes.md` | modified | §3 (the header's badge and meta on the details), §7 (new decision of 2026-10-13, superseding the one of 2026-10-10, plus the states), §9 point 5 |
| `specs/001-servicebw-eudi-middleware/contracts/ui-screens.md` | modified | Details: the frame, and the name and form in the header |
| `CLAUDE.md` | modified | Frontend guidelines: the details also render `WizardLayout`, and the loaded details' `h1` is the header title |

## Diff Highlights

```tsx
// pages/FormConnectionDetail/index.tsx (loaded state)
<WizardLayout
  title={formConnection.name}
  titleAsHeading
  badge={formConnection.is_active ? <KernBadge variant="success" label={DETAIL_COPY.live} withIcon className="kern-badge--small" /> : undefined}
  meta={DETAIL_COPY.formId(formConnection.servicebw_form)}
  head={<WizardProgress steps={CONNECTION_STEPS} current={CONNECTION_STEPS.length} />}
  footer={<DetailFooter />}
>
  <div className="mx-auto flex w-full max-w-900 flex-col gap-32">
    <ConnectionLinks … />
    <DocumentsSummary … />
  </div>
</WizardLayout>
```

```tsx
// components/WizardLayout/index.tsx: the head is optional, and the body fills the height
{head && (<div className="px-16 pt-40 pb-32">…{head}</div>)}
<div className={`flex flex-1 flex-col px-16 pb-40 ${head ? '' : 'pt-40'} … split:overflow-y-auto …`}>
  <div className="mx-auto flex w-full max-w-1120 flex-1 flex-col gap-32">{children}</div>
</div>
```

## Tests Added or Updated

None. The frontend has no test runner (`package.json` has no `test` script), and the backend
isn't touched, so the assessment calls for build, lint, format and visual verification instead
(see below).

## Local Verification

- Commands run:
  - `npm run lint` → clean.
  - `npm run format:check` → "All matched files use Prettier code style!"
  - `npx tsc -b` → no errors.
  - `npm run build` → built.
- Environment for the manual checks:
  - There was no backend `.env` in this worktree, so a small stub of `/api` ran on port 3901, in
    the session's scratchpad, not in the repo. It returned fixtures for two connections (a
    normal one and one with a long name and form ID), a 404, a 500 and a delayed answer.
  - Vite ran with `VITE_API_URL=http://localhost:3901` on port 5199.
  - The system Chromium ran headless and was driven over CDP, with the viewport set to
    1455 × 900. `document.body` is then 1440 wide, matching the frame.
- Fonts: `document.fonts.check` is true for Fira Sans at 400 16px, 600 16px and 600 18px.
- Numeric check against `2080:8271` at 1455 × 900:

  | Element | Property | Figma | Actual |
  |---|---|---|---|
  | Logo | x | 160 | 160 |
  | Separator | x, size | 302, 1×24 | 301.9, 1×24 |
  | Title (`h1`) | x; font; colour | 319; 16/24 600; #131525 | 318.9; 16/24 600; #131525 |
  | Badge "Live" | x; bg; border; padding; radius | 537; #cdf2e4; 1px #007155; 0 8 0 4; 4 | 538.3 (title text 1.4 px wider); #cdf2e4; 1px inset #007155 (KERN draws it as a shadow); 0 8 0 4; 4 |
  | Meta | font; colour; right edge | 16/24 400; #51577a; 16 px before the menu | 16/24 400; #51577a; ends at 1200, menu at 1216 |
  | Progress | x, y, w × h | 160, 104, 1120×40 | 160, 104, 1120×40 |
  | Card | x, y, w; padding | 270, 176, 900; 40 | 270, 176, 900; 40 |
  | Footer bar | y, h; bg; border-top | 820, 80; #fff; 1px #dfe1ea | 820, 80; #fff; 1px #dfe1ea |
  | Footer content | x, w | 160, 1120 | 160, 1120 |
  | "Home" (tertiary) | h; label | 48; 18/24 600 #2044aa | 48; 18/24 600 #2044aa |
  | "Create new connection" (secondary) | right edge; h; border; radius | 1280; 48; 1px #2044aa; 4 | 1280; 48; 1px #2044aa; 4 |

- Visual check: the screenshot matches Figma's frame 22, in the plain state and right after
  publishing (ring tick, "Published", "Your connection is live", the card ending at y = 753).
  Only the intended content differs: "Form ID PK-30051" in place of "Live since …", and "Home"
  in place of "Edit documents".
- Right after publishing (router state `{ published: true }`):
  - The focus is on the h2 "Your connection is live", and the router state is cleared.
  - There is one `h1`, the connection's name. The outline is h1 → h2 "Your connection is live"
    → h3 Request/Result link → h2 Documents → h3 per document.
  - The progress reads "Connection, done", "Documents, done", "Publish, done".
- Scrolling at 1455 × 900 (`split:`): with the body scrolled by 400 px, the header (y = 0), the
  progress (y = 104) and the footer (y = 820) stay put, and the window doesn't scroll. At
  1024 × 600 (below `split:`) the progress scrolls with the body, and the header and footer stay.
- States, all in the same frame with the footer, and without title, badge, meta or progress:
  - Loading (connection delayed by 6 s): the loader is centred and the tab title reads
    "Loading the connection…".
  - Not found: E1 is centred, with its own `h1`.
  - Failed (500): the "Couldn’t load the connection" `h1` and the "Try again" button.
- Long name and form ID at 1455: the title truncates (474 px), and the badge and meta stay
  visible.
- 375 × 800 and 320 × 700:
  - No horizontal scroll: the document is as wide as the body.
  - The header shows the logo, the truncated name and the user menu; the badge and meta are
    hidden.
  - "Home" shows only its icon (accessible name "Home").
  - "Create new connection" wraps onto two lines inside the 80 px bar. Headless Chromium
    reserves a 15 px scrollbar gutter there, which leaves a 328 px column for 333 px of buttons.
    This is within the assessment's "fit or wrap" criterion; see Follow-ups.
- Tooltip: "About the request link" opens below its button (y = 360, below the scroll area's top
  at 176), so it isn't clipped.
- Regression of the create wizard (`/form-connections/new`), which shares `WizardLayout`:
  - Step 1 is laid out as before: progress y = 104, `h1` y = 176, form y = 296.
  - On step 2 the header title is the form name, and the done step reads "Connection, done".
  - At 1455 × 700 with both documents added, the picker stays sticky at y = 296 while the body
    scrolls, and its `max-height` (`100cqh - 40px`) is 244 px, the same as before.

## Deviations from Assessment

- **Open questions**: the assessment's verdict is `valid`, so its defaults were applied without
  asking.
  - The meta shows Form ID only.
  - The "Live" badge shows while `is_active`.
  - The Form ID is hidden below `sm`.
  - The progress shows on every visit.
- **The badge is hidden below `sm` too**, not just the meta. At 375 px the logo, the name, the
  badge and the user menu left about 18 px for the name.
- **"Home" shows only its icon below `sm`** (Tailwind `sr-only` on its label, as CLAUDE.md
  prescribes inside a `kern-btn`), so that both footer actions fit. The assessment left the
  phone layout of the footer open.
- **`DetailFailed.tsx` was added** (not listed in the assessment): the error state's markup moved
  out of `index.tsx` unchanged, so the page keeps one `WizardLayout` per state branch and stays
  small (CLAUDE.md: extract new functionality to components).
- **`ConnectionLinks.tsx` wasn't changed**: the 900 px width comes from a column around the card
  and the documents summary, so both share it.
- **The footer's right action uses `ml-auto` instead of a spacer `div`**, unlike `EditorFooter`.
  A spacer adds a second 16 px gap, and every pixel counts on phones.

## Follow-ups

- On phones, "Create new connection" wraps onto two lines (see above). If that's unwanted, use a
  shorter label below `sm` ("New connection", the editor's header title) or hide its icon there.
- Things outside this fix:
  - The footer content's y is 836.5, against Figma's 836.
  - The header items' y is 19.5, against Figma's 20.

  Both come from the 1 px borders taking layout space in `WizardLayout`'s bar and `TopBar`.
  Figma draws its strokes inside the frame. The wizard has the same offset.
- T074 (Edit, status actions):
  - "Edit" replaces "Home" in `DetailFooter`'s left slot ("Edit documents" in Figma).
  - The dialogs go in `WizardLayout`'s `overlay`.
  - The badge needs the deactivated state with US4.
- T091 brings the webhook card back: put it in the 900 px column below the links.
- T073: when editing exists, pass `onSelect` to the details' `WizardProgress`, so the done steps
  link to the edit steps.
- Next: `/speckit-bug-test slug=detail-page-layout`.
