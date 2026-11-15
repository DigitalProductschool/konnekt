# Bug Fix: the overview's description tooltip is cut off by the rows' scroll box

- **Slug**: connection-tooltip-clipped
- **Fixed**: 2026-11-15
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

A row's description bubble is now a `popover="manual"` in the top layer. It is anchored to its
description with CSS anchor positioning, expressed as Tailwind classes. The list card and its
scrolling rows no longer cut it off, and it no longer counts as the rows' overflow, so the rows
get no scrollbar. The browser opens it below the description, flips it above where the window
has no room below, and moves it to the window's top where neither side has room. In a browser
without anchor positioning the row keeps today's bubble inside the card.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `frontend/src/pages/FormConnectionList/FormConnectionRow.tsx` | modified | `RowDescription`: the bubble gets a ref, `popover="manual"` (when `TOP_LAYER`) and `rowBubbleClass(...)`. An effect on `open` calls `showPopover()` / `hidePopover()`. The wrapper names the anchor (`ROW_DESCRIPTION_ANCHOR`) and takes `popupWrapperClass()` only on the fallback path. `TOP_LAYER = supportsAnchoredPopups()` at module level |
| `frontend/src/pages/FormConnectionList/constants.ts` | modified | `ROW_DESCRIPTION_ANCHOR`, `ROW_BUBBLE_CLASSES` (`start` / `end` / `full`: the UA popover reset, `top-[anchor(bottom)]`, `[position-anchor:--row-description]`, `[position-try-fallbacks:flip-block,--row-description-top]`, `py-8`, `open:flex`), and `[anchor-scope:--row-description]` on `ROW_CLASSES.row` |
| `frontend/src/pages/FormConnectionList/utils.ts` | modified | `rowBubbleClass(placement, open, topLayer)`: the top-layer set by side, otherwise the previous `absolute z-40 ${bubblePlacementClass('button', …)} flex/hidden` |
| `frontend/src/utils/popupPlacement.ts` | modified (scope expansion) | `supportsAnchoredPopups()`: checks for `showPopover`, `CSS.supports('anchor-scope', …)` and `CSS.supports('position-try-fallbacks', 'flip-block')`, and is false outside a browser |
| `frontend/src/index.css` | modified (scope expansion) | `@position-try --row-description-top { top: 0 }`: the third position option, for windows with no room on either side |
| `frontend/src/pages/FormConnectionList/utils.test.ts` | added tests | `rowBubbleClass` |
| `frontend/src/utils/popupPlacement.test.ts` | added tests | `supportsAnchoredPopups` |
| `docs/ARCHITECTURE.md` | modified | "Popups": the top-layer variant for a popup inside a box that scrolls or clips |
| `CLAUDE.md` | modified | "Popups": the same as a one-line rule that points to ARCHITECTURE |

## Diff Highlights

The bubble's open state drives the popover. It stays the wrapper's child in the DOM, so
`onPointerEnter` / `onPointerLeave`, the outside-press check and Escape are unchanged:

```tsx
// A popover shows only through the API: its `open` follows the state
useEffect(() => {
  const bubble = bubbleRef.current;
  if (!TOP_LAYER || !bubble) {
    return;
  }
  if (open && !bubble.matches(':popover-open')) {
    bubble.showPopover();
  } else if (!open && bubble.matches(':popover-open')) {
    bubble.hidePopover();
  }
}, [open]);
…
<span
  ref={bubbleRef}
  aria-hidden="true"
  popover={TOP_LAYER ? 'manual' : undefined}
  className={rowBubbleClass(placement, open, TOP_LAYER)}
>
```

The position is set by classes only, with no coordinates. `placementFrom()` still chooses the
side:

```ts
const ROW_BUBBLE =
  'm-0 inset-auto top-[anchor(bottom)] overflow-visible border-0 bg-transparent px-0 py-8 open:flex [position-anchor:--row-description] [position-try-fallbacks:flip-block,--row-description-top]';

export const ROW_BUBBLE_CLASSES: Record<PopupPlacement, string> = {
  start: `${ROW_BUBBLE} left-[anchor(left)] ${ROW_BUBBLE_WIDTH}`,
  end: `${ROW_BUBBLE} right-[anchor(right)] ${ROW_BUBBLE_WIDTH}`,
  full: `${ROW_BUBBLE} inset-x-16 w-auto`,
};
```

```css
@position-try --row-description-top {
  top: 0;
}
```

## Tests Added or Updated

- `frontend/src/pages/FormConnectionList/utils.test.ts`, `rowBubbleClass (FR-051 (35), FR-052)`:
  - "anchors the bubble to its own row's description, below it or flipped above it": every
    side has the anchor, `top-[anchor(bottom)]`, the fallbacks, the UA reset and the 8 px gap
    on both sides.
  - "lines the bubble up with the side placementFrom() chose": `left-[anchor(left)]`,
    `right-[anchor(right)]`, or `inset-x-16 w-auto` without `w-280`.
  - "places it with the anchor and the gutters, never with coordinates": every
    `top/bottom/left/right/translate` class is an `anchor()` one.
  - "leaves the direction and the showing to the browser in the top layer": the same classes
    for up and down, open and closed; `open:flex`, never `hidden` or `absolute`.
  - "keeps the bubble inside the row where the browser lacks anchor positioning": the exact
    previous classes.
- `frontend/src/utils/popupPlacement.test.ts`, `supportsAnchoredPopups`: false outside a
  browser; true with popovers, `anchor-scope` and `position-try-fallbacks` (stubbed globals);
  false where any one of them is missing.

## Local Verification

- `npm ci --offline --ignore-scripts` (the worktree had no `node_modules`) → 373 packages from
  the cache.
- `npx vitest run` on the two changed test files → 134 passed.
- `npm run format:check` and `npm run lint` (root) → clean. The first run flagged the new test
  file's import order and formatting; fixed with `eslint --fix` and `prettier --write`.
- `npm test` (root) → frontend 1979/1979 and mcp 513/513 passed. rules: 2674/2675, the one
  failure being `rules/src/personas/performance.test.ts` "generates for three different
  50-item branches within 1.5 s". That is a timing budget in a package this fix doesn't touch,
  run while two browsers and a dev server were busy. Run alone twice, it passed 7/7 both times.
- `npm run build` (root) → typecheck and builds pass. In the built CSS, `@position-try`
  survives Lightning CSS, every arbitrary property is emitted, and `inset-auto` comes before
  `inset-x-16` / `top-[…]` / `left-[…]` / `right-[…]`, so the side insets override it.
- **Browser checks**: this worktree's dev server ran on 5180, with the API mocked by Playwright
  as in the assessment (`/api/auth/me`, `/api/form-connections`; a 620-character description,
  bubble 280 × 424). Each case ran in Chromium 156 and Firefox 159. Scripts:
  `.playwright-mcp/check-tooltip.js`, `check-interactions.js`, `check-layouts.js` (git-ignored).

  | Case (1280 × 900 unless stated) | Result in both browsers |
  |---|---|
  | 1 row, hovered | below, whole: 91/91 sample points hit the bubble; `<ul>` 80/80 (no scrollbar). Before the fix: 32 of 424 px visible |
  | 2 rows, first hovered (the report's case) | below, whole, 91/91; `<ul>` 161/161. Before the fix: 89 of 424 px visible, scrollHeight 496 |
  | 3 rows, last hovered | flips above (388 px free below < 440), whole, 91/91; `<ul>` 242/242 |
  | 20 rows, the long one at the top of the rows | below, whole |
  | 20 rows, the long one at the bottom of the rows | above, whole |
  | 20 rows, opened by keyboard, rows scrolled by 120 px | bubble and description both move by 120 px |
  | Hover from the description into the bubble, below the card | stays open; leaving both closes it |
  | Escape; a press elsewhere | both close it |
  | Tab to the name; Tab on to "View" | opens; closes |
  | Touch (`pointerType: 'touch'`): tap, tap | opens; closes |
  | A short description ("Short one") | no bubble |
  | 320 × 700 | `full`: 16 px from the content edge on both sides (Chromium's 15 px classic scrollbar beside the page's `scrollbar-gutter: stable` takes the rest; every fixed element is 305 px wide there); no sideways scroll |
  | 640 × 450 (1280 × 900 at 200 %) | neither side has room → at the window's top (8–432), over the description, whole, 91/91 |
  | 320 × 360 | the bubble (448 px) is taller than the window: it opens below and is cut off (Chromium 28/91). Known limit, see Follow-ups |
  | Fallback: `CSS.supports('anchor-scope', …)` forced to false | no `popover`; the previous `absolute z-40 top-full left-0 pt-8 w-280 …` classes; wrapper `relative` |

- Screenshots (Chromium): `fix-1280-two-rows-first.png` (the report's case, whole bubble over
  the page, no scrollbar) and `fix-640x450-window-top.png` (the short window, at the window's
  top).
- Not checked: Safari / WebKit (no WebKit on this machine).

## Deviations from Assessment

1. **A fallback instead of an unconditional top layer.** The open question on browser support
   is unresolved, and the assessment's risk section says a fallback or a guard is needed. So
   `supportsAnchoredPopups()` decides per browser. Where it is false (for example Firefox ESR
   140, or a Safari without `anchor-scope`), the row renders exactly today's in-card bubble.
   Because of this, the component still calls `placementFrom(…, TOOLTIP_HEIGHT)` and still uses
   `popupWrapperClass()`, both only for that path. The assessment had proposed removing them.
2. **A third position option for short windows** (`@position-try --row-description-top` in
   `index.css`, a file the assessment did not list). The assessment left this to the fix. Where
   neither side of the description has room, the bubble moves to the window's top, over the
   description: the pointer then stays on it, and the whole bubble shows as long as it is no
   taller than the window. There is no `max-h` with scrolling inside: Chromium makes an
   overflowing scroller keyboard-focusable, which inside an `aria-hidden` bubble that a blur
   closes would trap the Tab sequence. A bubble taller than the whole window is therefore still
   cut off.
3. **Gap on both sides**: `py-8` instead of `pt-8`. `flip-block` mirrors insets and margins but
   not padding, and the gap has to stay padding (inside the bubble) so that the mouse crosses it
   without a `pointerleave`.
4. **Display through `open:flex`** in the top layer. In Tailwind 4.3 that variant matches
   `:popover-open`, so the popover's own state shows it. No `flex` / `hidden` toggle is needed,
   which would have overridden the UA's `display: none` on a closed popover.
5. **Scope expansion**: `frontend/src/utils/popupPlacement.ts` (+ test), for the feature check
   as a shared helper the documents can name, and `frontend/src/index.css`, for the
   `@position-try` rule.

## Follow-ups

- Decide which browsers the overview supports (the assessment's open question). If only
  evergreen browsers with anchor positioning, the fallback path can go: `TOOLTIP_HEIGHT`,
  `popupWrapperClass()` and the in-card branch of `rowBubbleClass()`.
- Check Safari / WebKit (anchor positioning, `anchor-scope`, `@position-try`) in
  `/speckit-bug-test` or by hand.
- A bubble taller than the window (about 500 characters in a window under about 400 px tall)
  is still cut off at the bottom. "View" shows the full description, and screen readers get it
  whole from the page.
- Other `InfoTooltip`s or popovers inside boxes that scroll (such as the test step's panel) may
  be clipped the same way. They were not checked, and the new pattern applies there too.
- The Figma frame U13 7366:55276 was not compared (open question in the assessment).
- `rules/src/personas/performance.test.ts` fails on a busy machine (1.5 s budget). Not caused
  by this fix, but CI may see the same flake under load.
