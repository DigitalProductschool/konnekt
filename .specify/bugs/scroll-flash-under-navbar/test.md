# Bug Verification: Scrolled content shows through the header for a moment after a fast scroll from the top

- **Slug**: scroll-flash-under-navbar
- **Tested**: 2026-11-18
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: verified

## Summary

The ~150 ms window in which scrolled content showed through the header strip is gone. The
check ran on the pages from the report (the wizard's rules step and the details page with the
links) and on `/login`, in Chrome 156 and Firefox 159, against a real backend. A positive
control that re-creates the old fade in the browser (no source change) still shows 9–10 leaky
frames up to 150 ms in the same harness. With the fixed code, the header is white from the
second frame. As the assessment and fix predicted, the one frame between the browser's scroll
and React's commit remains. A scroll that jumps a whole page within that frame shows content in
the strip for that frame (~16 ms). A smooth scroll moves only 2–9 px in it, and nothing visible
reaches the strip. No regressions: lint, all unit tests and the build pass.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Reproduction (post-fix), `/login` (Chrome, Firefox) | 800 × 560; scroll from 0 by instant `scrollTo`, Playwright wheel, smooth `scrollTo`, `End`; header's computed background sampled every animation frame | pass | 1 frame without the class, then `oklch(1 0 0)` with `transition-duration: 0s` at 16–17 ms. Before the fix it reached white at 156 ms |
| Reproduction (post-fix), rules step (Chrome) | real backend, "Start from an example" draft, wizard step 3; 800 × 560 (step header not pinned) and 1280 × 720 (pinned; one rule added so the page scrolls 415 px); instant, wheel 600, smooth, `End`, `PageDown` | pass | smooth / keyboard: **0** frames with content in a non-white strip; instant / unsmoothed wheel: **1** residual frame (strip fully covered for that frame) |
| Reproduction (post-fix), rules step (Firefox) | same, 800 × 560 | pass | instant / wheel: 1 residual frame; smooth: 0 |
| Reproduction (post-fix), details page / summary with the links (Chrome, Firefox) | 1280 × 720 and 800 × 560 (Chrome), 1280 × 720 (Firefox); instant, wheel, smooth | pass | instant / wheel: 1 residual frame. Smooth: in that frame only 2 px (Chrome) / 9 px (Firefox) of `main`'s blank top padding is under the strip; the first text is 66 px below it |
| Positive control (pre-fix fade re-created) | injected `header{transition:background-color 150ms … !important}` on each page above, same scrolls | reproduces the bug | 9–10 partly transparent frames up to 150 ms on every page and both browsers; rules step at 800 × 560, smooth (Chrome): 5 frames with up to 53 px of rule content in the strip |
| Visual check, rules step | Chrome, 1280 × 720, animations slowed 20× (CDP `Animation.setPlaybackRate` 0.05), screenshot of the top 230 px 60 ms after `scrollTo(300)` | pass | fixed: white strip between the pills; control: a rule card's border and its blue "…01" label run through the strip |
| Fade back to transparent kept | scroll from the bottom to 0 (Chrome: `/login`, details; Firefox: `/login`) | pass | `transition-duration: 0.15s`, alpha 0.97 → 0.82 → 0.54 … over ~150 ms |
| Reduced motion | Chrome, details page, `reducedMotion: 'reduce'` | pass | `transition-property: none` both ways; white on the next frame, transparent at once at the top |
| New unit tests | `npx vitest run --root frontend src/components/TopBar --reporter=verbose` | pass | 1 file, 2 tests (both class sets of `headerBackgroundClasses`) |
| Regression suite | `npm test` (root) | pass | 46 files / 2675 tests, 47 / 2012, 15 / 513; exit 0 |
| Lint / format | `npm run lint` (root); `npx prettier --check frontend/src/components/TopBar/` | pass | exit 0; Prettier clean |
| Build | `npm run build` (root) | pass | exit 0; only the existing chunk-size warning |
| Backend Ruff / mypy / pytest | n/a | skipped | the fix touches no backend code |
| Design notes record the change | `grep scroll-flash-under-navbar specs/008-kern-revamp-redesign/design-notes.md` | pass | §4 motion table (line 310), `TopBar` row (252), U03 #39 check rows (1343, 1344) |
| Overview page | n/a | not-run | needs many connections to scroll the page (fix.md: its rows scroll inside the table); same `TopBar` |
| Physical wheel / trackpad in a headed browser | n/a | not-run | only synthetic input (Playwright wheel, keyboard, `scrollTo`) in headless browsers |

Environment: the Vite dev server, the backend (`uvicorn`, worker off, no EUDIPLO) and a
throwaway `postgres:18-alpine` container (`--rm`, no volume, port 5436, image already cached),
with a local test account. All of it was stopped and removed afterwards. Sampling method as in
the assessment: per `requestAnimationFrame`, the header's computed `background-color` and
`transition-duration`, `scrollY`, and how far the page content's top edge sits above the
header's bottom edge.

## Output Excerpts

Rules step, Chrome, 1280 × 720, `scrollTo` 0 → bottom (frames relative to the first scrolled
frame; `in` = px of content above the header's bottom edge, ≥ 64 fills the strip):

```
fixed:   -17ms y=0 a=0 in=0 | 0ms y=415 a=0 in=263 | 17ms y=415 a=1 in=263 | 33ms y=415 a=1 …
         leakyFrames=1 framesShowingContent=1 until=0ms
control: -17ms y=0 a=0 in=0 | 0ms y=415 a=0 in=263 | 17ms y=415 a=0 | 33ms a=0.03 | 50ms a=0.17 …
         leakyFrames=10 framesShowingContent=10 until=150ms
fixed, smooth: 0ms y=2 a=0 in=0 | 17ms y=12 a=1 in=0 | 33ms y=33 a=1 in=0   → 0 frames showing content
```

Firefox 159, `/login`, 800 × 560:

```
fixed:   0ms y=256 a=0 td=0.15s | 16ms y=256 a=1 td=0s          leakyFrames=1
control: 0ms y=256 a=0 | 16ms a=0 | 33ms a=0.04 | 50ms a=0.18 … leakyFrames=10 until=149ms
```

Unit test:

```
✓ … > is white once the page has scrolled, at once: no transition into white
✓ … > is transparent at the top and fades back over the colour duration
Test Files  1 passed (1)   Tests  2 passed (2)
```

## Residual Risks

- **The residual frame (by design)**: the white class still arrives through a `scroll` event
  and a React commit, one frame after the browser has painted the scrolled page. A scroll that
  moves content more than the gap between the strip and the content within that frame (instant
  `scrollTo`, an unsmoothed wheel step, a jump to an anchor) shows it in the strip for that frame
  (~16 ms at 60 Hz), with the header fully transparent. The gap is about 150 px on the rules
  step, 66 px of padding on the details page, and the step header's height when it is pinned.
  This is a tenth of the reported window and has no fade, but it is not zero.
- **Compositor-driven scrolling under load was not exercised**: with a physical wheel or
  trackpad, the browser may scroll on the compositor thread ahead of a busy main thread. Then
  the residual could last more than one frame. Here the main thread was idle and synthetic
  input was used.
- **The reporter's browser and input** are still an open question in the assessment. Smooth
  scrolling (both browsers' default for wheels and keys) showed nothing in this test. A browser
  with smooth scrolling turned off is the case closest to the residual frame.
- **"Many rules"** was approximated with three rules: the rules page was 1135 px tall and scrolled
  415 px. That is enough for content to pass behind the pinned step header into the strip, but it
  is not a long real-world list.
- The unit test pins the helper, not the header's class string (fix.md follow-up). Only a
  browser check like this one guards against `transition-colors` returning to the header.

## Recommendation

Close the bug: verified end to end on the reported pages in Chrome and Firefox. The reported
"split second" (≈150 ms of fading header) no longer reproduces, while the positive control
reproduces it in the same harness. Ask the reporter to confirm on their own browser and input.
If they still notice a one-frame flicker on a hard flick, take the assessment's first
alternative: keep the header white at all times on the white signed-in layouts
(`transparentAtTop` only from `AuthLayout`). That removes the residual frame where it matters
most.
