# Bug Fix: Four UI fixes: hover tooltips, steady picker buttons, fixed wizard frame, no serviceBW in the UI

- **Slug**: ui-fixes-batch
- **Fixed**: 2026-10-12
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

All four items of the assessment are fixed in the frontend:

- **B1**: the (i) bubbles show on hover and close as soon as the mouse leaves. Keyboard focus,
  Escape and a tap on touch screens keep working.
- **B2**: "+ Add", "✓ Added" and "Remove" share one 99 px width.
- **B3**: header and action bar never scroll. On "Add documents" only the field cards move. The
  header, progress, title, document list and footer stay put.
- **B4**: the detail page no longer names serviceBW.

The backend is untouched. `CLAUDE.md` and the design notes record the decisions.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `frontend/src/components/InfoTooltip/index.tsx` | added (replaces `InfoToggletip/index.tsx`) | B1. Hover tooltip: `pointerenter`/`pointerleave` (not touch), keyboard `:focus-visible`, Escape, tap toggles on touch. `role="tooltip"` + `aria-describedby`; the bubble stays in the DOM, hidden. The 2 px gap is padding (`top-full pt-2`), so it counts as hovering |
| `frontend/src/components/InfoTooltip/types.ts` | added (replaces `InfoToggletip/types.ts`) | Same props, plus the reducer's state and actions |
| `frontend/src/components/InfoTooltip/utils.ts`, `constants.ts` | added | `tooltipReducer`, `isOpen`, `CLOSED` (several state variables → `useReducer`, per `CLAUDE.md`) |
| `frontend/src/components/InfoToggletip/` | removed | Renamed to `InfoTooltip`, as the assessment proposed |
| `frontend/src/pages/FormConnectionEditor/ConnectionStep.tsx` | modified | `InfoTooltip`; the page title moved to the wizard's head (see Deviations) |
| `frontend/src/components/TextField/index.tsx`, `types.ts` | modified | Comments: "tooltip", `InfoTooltip` |
| `frontend/src/pages/FormConnectionEditor/DocumentPickerItem.tsx` | modified | B2. `BUTTON_WIDTH = 'w-99'` on the "+ Add" `kern-btn` and on the inner span of "✓ Added"/"Remove", which is now `justify-center` |
| `frontend/src/components/WizardLayout/index.tsx`, `types.ts` | modified | B3. `h-dvh` frame; header, then a `head` slot (progress, page title), the scrolling body, and the fixed 80 px bar. Also an `overlay` slot for the dialog and toast. `split:` keeps the head still; the scrolling areas are size containers (`cqh`); symmetric scrollbar gutters from 1197 px |
| `frontend/src/pages/FormConnectionEditor/index.tsx` | modified | Renders `WizardProgress` and `PageTitle` in `head`, `PublishDialog` and `Toast` in `overlay`; one `pageTitle` for the tab and the `h1` |
| `frontend/src/pages/FormConnectionEditor/DocumentsStep.tsx` | modified | No page title of its own (now in the head); doc comment |
| `frontend/src/pages/FormConnectionEditor/DocumentPicker.tsx` | modified | `lg:sticky lg:top-0 lg:max-h-[calc(100cqh-40px)] lg:overflow-y-auto` |
| `frontend/src/pages/FormConnectionEditor/types.ts` | modified | `title`/`titleRef` removed from `ConnectionStepProps`, `titleRef` from `DocumentsStepProps` |
| `frontend/src/components/AppLayout/index.tsx` | modified | B3. Top bar in a `sticky top-0 z-30` wrapper (above the bubbles' `z-20`) |
| `frontend/src/index.css` | modified | `@custom-variant split` (≥ 1024 px wide and ≥ 640 px tall); `scroll-padding-top: 64px` on `html` |
| `frontend/src/pages/FormConnectionDetail/constants.ts` | modified | B4. `resultLinkHint` removed. `requestLinkInfo`, `resultLinkInfo`, `webhookHint` and `modeHints.pull` now say "your form management system" |
| `frontend/src/pages/FormConnectionDetail/ConnectionLinks.tsx`, `LinkCard.tsx`, `types.ts` | modified | B4. The `hint` prop and its line are gone; `LinkCard` uses `InfoTooltip` |
| `CLAUDE.md` | modified | Frontend guidelines: headers and action bars never scroll, `head`/`overlay`, the `split:` variant |
| `specs/001-servicebw-eudi-middleware/design-notes.md` | modified | Decisions of 2026-10-12 in §3 (frame), §6 (tooltip, picker width, sticky panel, fixed footer) and §7 (copy without serviceBW) |

## Diff Highlights (optional)

The wizard frame (`WizardLayout/index.tsx`):

```tsx
const CENTRED_GUTTERS = 'min-[1197px]:[scrollbar-gutter:stable_both-edges]';
…
<div className="bg-kern-neutral-025 flex h-dvh flex-col">
  <TopBar … />
  <main className="flex min-h-0 flex-1 flex-col">
    <div className={`flex min-h-0 flex-1 flex-col overflow-y-auto lg:[container-type:size] ${CENTRED_GUTTERS} split:overflow-hidden split:[scrollbar-gutter:auto]`}>
      <div className="px-16 pt-40 pb-32">…{head}…</div>
      <div className={`px-16 pb-40 ${CENTRED_GUTTERS} split:min-h-0 split:flex-1 split:overflow-y-auto split:[container-type:size]`}>…{children}…</div>
    </div>
    <div className="… flex h-80 shrink-0 border-t px-16">…{footer}…</div>
    {overlay}
  </main>
</div>
```

The tooltip's open state (`InfoTooltip/utils.ts`): open while any reason holds. Escape or a tap
elsewhere clears all of them, and blur also clears a tap.

```ts
export function isOpen(state: TooltipState): boolean {
  return state.hovered || state.focused || state.tapped;
}
```

## Tests Added or Updated

None in the repository. The frontend has no test runner (no Vitest or Jest, and no `test`
script), and adding one was out of scope per the assessment. Verification ran as throwaway
Playwright scripts in the session's scratchpad, not committed, against the real frontend (see
below). `/speckit-bug-test` can repeat them.

## Local Verification

- Commands run:
  - `npm ci` → 314 packages (this worktree had no `node_modules`).
  - `npx tsc -b` → no errors.
  - `npm run lint` → clean.
  - `npm run format:check` → "All matched files use Prettier code style!"
  - `npm run build` → built. The CSS contains `@media (width>=64rem) and (height>=40rem)` for
    `split:`, the `100cqh` cap, `h-dvh`, `w-99`, `scroll-padding-top` and
    `scrollbar-gutter:stable both-edges`. The `split:[scrollbar-gutter:auto]` rule comes after the
    `min-[1197px]:` one, so it wins on the outer area. `dist/` was deleted afterwards.
  - The backend is unchanged, so `pytest` wasn't run. A stray `ruff check .` passed.
- Setup for the manual checks: the Vite dev server on port 5181, with `VITE_API_URL` pointing to a
  small mock of the API in the scratchpad. The mock serves `auth/me`, `document-types` from the
  real `app.catalog` (25 + 31 fields) and `form-connections` (list, create, get). Ports 3000 and
  5173 were taken by another project's dev servers, which were left alone. A real backend wasn't
  used, so as not to touch the Postgres container running on this machine. Chromium 154
  (system), driven by `playwright-core`, ran at 1455 × 900 as `CLAUDE.md` prescribes (body
  1440 px). The tests ran both with Playwright's hidden scrollbars and with classic 15 px
  scrollbars. The fonts loaded (`document.fonts.check('600 16px "Fira Sans"')` true).
- **B1** (step 1 and the detail page), all as expected:
  - The bubble is hidden at first. Hovering the (i) shows it, moving down onto the bubble keeps
    it, and moving away hides it.
  - Hover + Escape hides it, and it stays hidden while the mouse moves within. Leaving and
    re-entering shows it again.
  - A click doesn't pin it: after a click, moving away hides it, though the button keeps the
    focus.
  - Keyboard focus (Shift+Tab) shows it, Escape hides it, Enter shows it again, and Tab away
    hides it.
  - "Form ID" (arrow at the end) behaves the same.
  - Touch (390 × 844, `hasTouch`): a tap shows it, a second tap hides it, and a tap elsewhere
    hides it.
  - Accessibility: the button's `aria-describedby` points to the `role="tooltip"` element, which
    holds the text, and `aria-expanded` is gone.
- **B2**:

  | State | Box | Natural content width |
  |---|---|---|
  | + Add | 99 px | 82.5 |
  | ✓ Added | 99 px | 98.9 |
  | Remove (hover) | 99 px | 89.8 |
  | Remove (keyboard focus) | 99 px | 89.8 |

  The pointer entering 2 px inside the left edge keeps `:hover` (no flicker). "Personal ID" and
  "Driving licence" stay on one line (24 px high, 111 px column). Screenshots match the design
  apart from the width.
- **B3**:
  - **1455 × 900**: after scrolling 700 px with the wheel over the cards, then 500 px with the
    wheel over the document list, these stay put: header top 0, progress 104, `h1` 176,
    document list 296, footer 820–900. `window.scrollY` stays 0, and the first card moved from
    296 to −530.
  - **Cards**: 800 px with three fields per row, also with classic scrollbars.
  - **Validation**: "Publish" with nothing selected focuses `document-pid-all` at y = 407,
    inside the visible area, and scrolls it into view.
  - **Toast**: its bottom is at 796, footer top 820: 24 px, as designed.
  - **Alignment with classic scrollbars**: left and right edges of header, `h1`, list, cards and
    footer are equal (160/1280) at 1455, 1300 and 1197 px, and at 1455 × 600.
  - **1455 × 600** (below `split:`): the head scrolls away, and the list docks at 64 under the
    header. With "Coming to the wallet" open, the list is capped at 64–480 (40 px above the bar)
    and scrolls itself (414 of 520 px shown).
  - **390 × 844**: header at 0 and footer at 764–844 after scrolling 1500 px; the window doesn't
    scroll.
  - **Detail page**: after scrolling 800 px the top bar is still at 0. `scrollIntoView` puts
    "Result link" at 64 (`scroll-padding-top`). The user menu opens above the content.
  - **Overview**: the top bar's wrapper is `position: sticky`.
  - **`/get-started`** with no connection: one `h1` "Create your first connection", the hint and
    the tab title are as before.
- **B4**, after publishing:
  - "serviceBW" appears neither in `innerText` nor in `textContent`, which includes the hidden
    tooltip texts.
  - The "{reference}" line is gone.
  - The two tooltips read "Your form management system calls this link…", seen in a screenshot.

## Deviations from Assessment

1. **Page title moved to the wizard's head (scope expansion).** To keep the progress and title
   still above a scrolling body, `WizardLayout` gets a `head` slot. The page title had been
   rendered inside each step, so `PageTitle` moved from `ConnectionStep` and `DocumentsStep` into
   `FormConnectionEditor/index.tsx`. Their `title`/`titleRef` props are gone from
   `FormConnectionEditor/types.ts`, which wasn't on the assessment's list. Behaviour is unchanged:
   one `h1`, the same texts, and the focus still moves to it on a step change.
2. **`overlay` slot.** `PublishDialog` and `Toast` were children of the step area. The scrolling
   areas are now size containers (`container-type: size`, for the `cqh` cap). So the fixed toast
   is rendered outside them, in `overlay`, still inside `<main>`, rather than depending on how
   browsers treat containment. The toast stays 24 px above the bar (verified).
3. **Document list height cap.** The assessment asked to cap the list "at the body's height". This
   uses container query units (`max-h-[calc(100cqh-40px)]`), with the scrolling area as the size
   container, so the cap is right whether the head is still (`split:`) or scrolls (short
   windows).
4. **Scrollbar position (new finding).** The assessment expected a full-width body to put its
   scrollbar at the window's edge. In fact, KERN keeps its reserved gutter on `html`
   (`scrollbar-gutter: stable`, 15 px). So the body's own scrollbar sits at the area's right edge,
   left of that gutter, and narrows the area. With a classic scrollbar that moved the centred
   column 7.5 px left of the header's and footer's (list at x = 152.5 instead of 160).
   - The fix: the scrolling area keeps a gutter on both sides (`scrollbar-gutter: stable
     both-edges`) from 1197 px, where the column is centred. Alignment is then exact.
   - Below that the column is left-aligned, as before. There, the scrollbar takes the last 15 px
     of its right side: cards end at 1054 vs. footer 1069 at 1100 px. Between 1182 and 1196 px
     the column is off by up to 7.5 px (measured: 20 vs. 27.5 at 1190 px).
   - With overlay scrollbars (macOS, phones) none of this applies.
5. **When the head stays still.** The assessment said "from `lg` up". The `split:` variant also
   requires 640 px of height, so the fixed parts can't squeeze the step on short windows. Below
   that the head scrolls, and the list docks under the header.
6. **Width value.** `w-99` (99 px), the widest state measured in the running app (98.9 px), as
   the assessment asked.
7. **Keyboard after Escape.** Not spelled out in the assessment: Enter or Space on a focused (i)
   shows the bubble again after Escape (`event.detail === 0`). A mouse click does nothing, so
   only hover shows it, as the report asks.

## Follow-ups

- **Escape right after opening:** the Escape and outside-tap listeners are attached in a
  `useEffect` after the bubble opens. An Escape within the same frame as the hover isn't caught,
  which only an automated test can hit. The removed toggletip had the same pattern.
- **Known before this fix, not changed**:
  - On a 390 px phone the "Form name" bubble runs past the right edge. Its
    `max-w-[calc(100vw-32px)]` ignores the icon's offset from the left (screenshot of the touch
    check).
  - The user avatar in the wizard header is squeezed at 390 px.
  - Both deserve their own bug.
- **Cosmetic:** on the wizard, KERN's reserved 15 px `html` gutter stays empty to the right of
  the scrolling area's own scrollbar (classic scrollbars only). Removing it on the wizard would
  need `html:has(...)` and a change to the 1455 px verification rule, so it's left as is.
- **Real backend:** run `/speckit-bug-test` against the real backend; this verification used a
  mock of the API.
- **Tests:** consider a frontend test runner (Vitest + Testing Library) for `tooltipReducer` and
  the picker's width, so B1 and B2 can't regress silently.
