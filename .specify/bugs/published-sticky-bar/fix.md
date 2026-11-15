# Bug Fix: the details page's sticky footer stops sticking, with blank space under it

- **Slug**: published-sticky-bar
- **Fixed**: 2026-11-15
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

The details cards' body is now `relative` as well as `overflow-hidden` while it clips (closed or
moving). That makes the clip the containing block of the `sr-only` / `kern-sr-only` texts and the
variant tabs' `absolute` list inside it. They no longer escape to `WizardLayout`'s content box at
their unclipped positions, so they no longer make the page longer than its content and the
footer stays at the bottom of the window. Open and settled, the body is unchanged: neither clipped
nor positioned.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `frontend/src/pages/FormConnectionDetail/utils.ts` | added `accordionBodyClassesOf(clipped)` | `'relative min-h-0 overflow-hidden'` while clipped, `'min-h-0'` otherwise; its docstring explains the containing-block rule and why the body stays unpositioned when open (V6 tooltips, `full` popups) |
| `frontend/src/pages/FormConnectionDetail/DetailAccordion.tsx` | modified | the body uses the helper; a sentence in the docstring and a one-line JSX comment say why |
| `frontend/src/pages/FormConnectionDetail/utils.test.ts` | added test | `accordionBodyClassesOf (FR-046, V6)`, two cases |
| `docs/KERN-DESIGN-SYSTEM.md` | modified | §7 gotcha: an `overflow: hidden` box hides `sr-only` text only if it is positioned |

## Diff Highlights

```tsx
// DetailAccordion.tsx (before)
<div id={bodyId} inert={!open} className={`min-h-0 ${clipped ? 'overflow-hidden' : ''}`}>
// after
{/* Positioned while it clips, or its sr-only texts escape the clip */}
<div id={bodyId} inert={!open} className={accordionBodyClassesOf(clipped)}>
```

```ts
// utils.ts
export function accordionBodyClassesOf(clipped: boolean): string {
  return clipped ? 'relative min-h-0 overflow-hidden' : 'min-h-0';
}
```

## Tests Added or Updated

- `frontend/src/pages/FormConnectionDetail/utils.test.ts` › `accordionBodyClassesOf (FR-046, V6)`
  › "positions the body whenever it clips, so the clip holds its absolute descendants": a clipped
  body carries `relative` together with `overflow-hidden` (and `min-h-0`), so the clip can't lose
  its positioning without failing a test.
- … › "neither clips nor positions the body once it is open and settled": the open body is exactly
  `min-h-0`, so a tooltip or the full URL's bubble can still reach past the card and a `full` popup
  still spans `WizardLayout`'s content box.

The layout itself can't be unit-tested: the frontend's Vitest runs in the `node` environment
without a DOM (assessment, "Tests to add or update").

## Local Verification

- `npx prettier --check` on the three changed source files → all formatted.
- `npm run lint` (root) → exit 0, no findings in any of the four packages.
- `npm test` (root) → exit 0: 46 + 46 + 15 test files, 2675 + 1981 + 513 tests passed.
- `npx vitest run src/pages/FormConnectionDetail/utils.test.ts -t accordionBodyClassesOf` → the 2
  new cases pass.
- `npm run build` (root) → exit 0. Vite printed its usual chunk-size warning, which this change did
  not cause.
- `DetailAccordion` now imports `./utils`. The Approval page's `PublishSummary` reuses the
  accordion, but its `RulesSummary` already imports `./utils`, so the Approval page's bundle gains
  nothing new.
- Manual / browser checks: not run here. The assessment's live-DOM prototype of this exact class
  change brought `scrollHeight` down to `<html>`'s height in all three measured states. The full
  browser matrix (Chromium and Firefox, Links open, Activity open with 12 rules per variant, Summary
  after the Activity, 768 × 800, a window under 480 px tall, draft details, the Approval page with
  its Summary closed, and the regression checks for tooltips, the URL bubble, the animation and
  `inert`) is left to `/speckit-bug-test`, as the assessment plans.

## Deviations from Assessment

None. The assessment marked the helper and the doc gotcha as optional; both were done. The
`[NEEDS CLARIFICATION]` on whether the draft details and the Approval page show it too was not
blocking: they use the same `DetailAccordion`, so the fix covers them either way.

## Follow-ups

- `/speckit-bug-test slug=published-sticky-bar` with the browser checks listed in the assessment,
  including the draft details and the Approval page.
- Optional audit elsewhere in `frontend/src` for a non-positioned `overflow: hidden` box around
  `sr-only` text inside a positioned page box (assessment, "Risks & Considerations"). The new gotcha
  in `docs/KERN-DESIGN-SYSTEM.md` §7 covers new code.
