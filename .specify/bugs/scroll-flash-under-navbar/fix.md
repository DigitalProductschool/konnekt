# Bug Fix: Scrolled content shows through the header for a moment after a fast scroll from the top

- **Slug**: scroll-flash-under-navbar
- **Fixed**: 2026-11-18
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

The header area now turns white in the frame its `bg-…` class lands, with no fade in. Before,
it faded from transparent to white over 150 ms, so a fast scroll from the top showed the
content between the pills for about 100 ms. The 150 ms fade is kept for the way back to
transparent at the top, where nothing is under the header any more. This is the assessment's
preferred remediation, in the shared `TopBar`, so it covers every layout (sign-in, overview,
wizard, details).

## Changes

| File | Change | Notes |
|------|--------|-------|
| `frontend/src/components/TopBar/utils.ts` | added | `headerBackgroundClasses(scrolled)`: white and no `transition-*` when scrolled; no background, plus `transition-colors duration-(--duration-colour)`, when not scrolled |
| `frontend/src/components/TopBar/index.tsx` | modified | the header's static `transition-colors duration-(--duration-colour)` removed and the helper used instead; `.motion` kept; the doc comment on #39 updated |
| `frontend/src/components/TopBar/utils.test.ts` | added test | pins both class sets |
| `specs/008-kern-revamp-redesign/design-notes.md` | modified | §4 motion table (new row, see Deviations), the `TopBar` row of the component table, and the U03 #39 check rows (scrolled; reduced motion), each with a history note naming this bug |

## Diff Highlights

`frontend/src/components/TopBar/utils.ts` (new):

```ts
export function headerBackgroundClasses(scrolled: boolean): string {
  return scrolled
    ? 'bg-kern-layout-background-default'
    : 'transition-colors duration-(--duration-colour)';
}
```

`frontend/src/components/TopBar/index.tsx`, the header:

```diff
-      className={`motion top-0 z-30 … px-16 pt-16 transition-colors duration-(--duration-colour) md:flex-nowrap … ${scrolled ? 'bg-kern-layout-background-default' : ''}`}
+      className={`motion top-0 z-30 … px-16 pt-16 md:flex-nowrap … ${headerBackgroundClasses(scrolled)}`}
```

A CSS transition uses the after-change style's `transition-*` properties. Going to white, the
after-change style has `transition-duration: 0s`, so there is no transition. Going back to
transparent, it has `transition-colors` at 150 ms, so the fade still runs.

## Tests Added or Updated

- `frontend/src/components/TopBar/utils.test.ts`:
  - `is white once the page has scrolled, at once: no transition into white`: the scrolled set
    contains `bg-kern-layout-background-default` and no `transition*`, `duration-*`, `ease-*` or
    `delay-*` class.
  - `is transparent at the top and fades back over the colour duration`: the not-scrolled set has
    no `bg-*` class and is exactly `transition-colors duration-(--duration-colour)`.

## Local Verification

- Commands run:
  - `npx vitest run --root frontend src/components/TopBar` → 1 file, 2 tests passed
  - `npm run lint` (root) → clean in `api-types`, `rules`, `frontend` and `mcp`
  - `npx prettier --check frontend/src/components/TopBar/` → clean (after formatting the new
    test file)
  - `npm test` (root) → all passed: 46 files / 2675 tests, 47 / 2012, 15 / 513
  - `npm run build` (root) → built; only the existing chunk-size warning
- Manual checks (Vite dev server, Playwright Chrome, computed style sampled every animation
  frame, as in the assessment's reproduction):
  - `/login`, 800 × 560, `scrollTo` 0 → 300 (lands at 256): 0 ms and 2 ms transparent (no class
    yet); **15 ms `oklch(1 0 0)`, `transition-duration: 0s`**, and white on every later frame.
    Before the fix, the class landed at 6 ms with alpha 0 and reached white only at 156 ms. No
    frame is partly transparent any more.
  - `/login`, scroll inside the page (256 → 120): white on the first frame, as before.
  - `/login`, back to 0: the fade to transparent runs over about 150 ms (alpha 0.97 at 33 ms,
    0.54 at 66 ms, 0.08 at 116 ms, transparent at 183 ms), `transition-duration: 0.15s`.
  - `/login` with `reducedMotion: 'reduce'`: `transition-property: none` both ways; white on the
    first frame with the class, and transparent at once at the top.
  - `/login`, animations slowed 20× (CDP `Animation.setPlaybackRate` 0.05), screenshot of the top
    200px 60 ms after the scroll: the strip is white between the pills and the card is cut off at
    64px. That step of the assessment showed the card and the gradient running through the strip.
  - Signed-in layout (`AppLayout`, the overview `/`, the API mocked with Playwright routes, 40
    connections, 1280 × 500): the overview fits the window there and its rows scroll inside the
    table, so the page itself doesn't scroll. To make it scroll, a 1200px spacer was added to
    `main` in the page (not in the code). Scrolling 0 → 400: transparent at 3 ms, then
    `oklch(1 0 0)`, `0s` from 12 ms on. Slowed 20×, scrolling 0 → 70 (the h1 from 96 to 26): the
    strip is white and the title is hidden behind it.
  - Not checked: the wizard's rules step and the details with real data. They need the backend
    and the database, which aren't running here. They render the same `TopBar`.

## Deviations from Assessment

- **Scope, within a listed file**: besides the `TopBar` row and the U03 #39 check rows, a row
  was added to the design notes' §4 motion table (`design-notes.md` §4, after "Colour changes").
  The assessment's risk asks that the departure from FR-050's 150 ms be recorded "so that a later
  Figma audit doesn't 'fix' it back". §4 is where the motion rules are read from, so the
  exception is recorded there too.
- **The residual frame**: as the assessment expected, one frame between the browser's scroll and
  React's commit remains. In the samples above, the first animation frame after the scroll
  (2–3 ms) still has the transparent header, and the next one (12–15 ms) is white. That is one
  frame, down from about 150 ms.
- **The overview**: the assessment lists "a long overview list" among the affected pages. At
  1280 × 720 and 1280 × 500 the overview's rows scroll inside the table and the page doesn't
  scroll, so the overview can't show the flash itself. The fix covers it anyway.
- The project's `.git` points at a worktree on another machine, so there is no `git diff` to
  attach. The changes above are the complete list.

## Follow-ups

- If the residual frame is still visible on very fast wheel or trackpad flings (the browser and
  input the reporter used are still an open question in the assessment), take the assessment's
  first alternative for the white pages. `TopBar` would take a `transparentAtTop` prop, true only
  from `AuthLayout`, and the signed-in layouts would keep the header white at all times. A
  cheaper intermediate step: `flushSync` in `useScrolled`'s listener. That commits in the scroll
  event, before the frame paints, for keyboard and programmatic scrolls. It doesn't help a
  compositor-driven wheel scroll, which paints before the main thread's scroll event.
- The unit test pins the helper, not the header: if someone put `transition-colors` back into
  the header's static class string, the test would still pass. The frontend's Vitest runs in
  Node without a DOM, so the browser check above (`/speckit-bug-test`) is the guard. A browser
  test runner would allow it to be automated.
- `/speckit-bug-test slug=scroll-flash-under-navbar`: repeat the frame sampling on the wizard's
  rules step with many rules and on the details (the summary with the links), with the backend
  running, and in Firefox.
