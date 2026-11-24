# Bug Fix: The UI follows the browser's dark mode and breaks

- **Slug**: force-light-mode
- **Fixed**: 2026-10-10
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

`<html>` now carries `data-kern-theme="light"`, which pins KERN's light theme, so `kern.css` no
longer switches its semantic colour tokens when the browser prefers dark. `color-scheme: only light`
keeps the browser's own parts light and opts the page out of Chromium's auto dark theme. The
light-only convention is recorded in `CLAUDE.md`, `docs/ARCHITECTURE.md` and
`docs/KERN-DESIGN-SYSTEM.md`.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `frontend/index.html` | modified | `<html lang="en" data-kern-theme="light">`, with a one-line comment above it on why |
| `frontend/src/index.css` | modified | `color-scheme: only light;` in the existing `@layer base { html { … } }` rule, with a comment |
| `CLAUDE.md` | modified | Frontend Development Guidelines: a light-only bullet after the KERN bullet. It says to keep the attribute and `color-scheme`, and not to use `dark:` |
| `docs/ARCHITECTURE.md` | modified | Frontend key decisions: a light-only bullet right after the KERN one |
| `docs/KERN-DESIGN-SYSTEM.md` | modified | §7 gotcha: `kern.css` follows the browser's dark mode unless a theme is pinned. Primitives, SVG colours and shadows don't switch. Covers how to pin and the 2.1.0 rename (`data-theme` → `data-kern-theme`) |

## Diff Highlights

```html
<!doctype html>
<!-- The app is light-only: without data-kern-theme, kern.css follows the browser's dark mode -->
<html lang="en" data-kern-theme="light">
```

```css
@layer base {
  html {
    /* … why, see the file … */
    color-scheme: only light;
    color: var(--kern-color-layout-text-default);
```

## Tests Added or Updated

- None, as the assessment planned: the frontend has no test runner, and adding one is out of scope
  for this fix. The browser checks below take the place of tests, and `/speckit-bug-test` repeats
  them with the Playwright MCP.

## Local Verification

### Commands run

- `npm ci --ignore-scripts` in `frontend/` → 314 packages from the lockfile; the worktree had no
  `node_modules`. `--ignore-scripts` skips the `prepare` hook, which runs `uv`/pre-commit in the
  backend.
- `npm run lint` → passes.
- `npm run format:check` → "All matched files use Prettier code style!"
- `npm run build` (`tsc -b && vite build`) → passes. In the output:
  - `dist/index.html` has `<html lang="en" data-kern-theme="light">`.
  - The CSS has `html{…color-scheme:light only…}` in the base layer.
  - All ten pieces that Lightning CSS split the `[data-kern-theme=light]` token rule into come
    after the bundle's only `@media (prefers-color-scheme:dark)` block, so the attribute still wins.
  - Lightning CSS also adds its unused `light-dark()` polyfill variables there.
- `git diff --check` → clean; the added lines are at most 100 characters.

### Facts checked in the installed packages

- `@kern-ux/native` 2.8.2:
  - the dark `:root` block is at kern.css:743, the `[data-kern-theme=light]` block at :875;
  - the light block sets the same 49 tokens as the system-light block (:809) with the same values,
    a line-for-line diff with only the selector differing;
  - kern.css declares no `color-scheme` and uses no `light-dark()`.
- KERN's changelog has the rename (2.1.0), "light utilities override system dark mode" (2.6.1) and
  "global data-kern-theme forcing" (2.7.2).
- React kit 2.40.0: only `KernToggleDarkMode` touches `data-kern-theme`, and the app doesn't use
  it. Nothing calls `matchMedia` or reads `localStorage`, so nothing changes the attribute at
  runtime.
- Tailwind 4: its CSS has no `color-scheme` rule, and `src/` uses no `dark:` utility.

### Browser checks

Setup: Chromium 154 via the Playwright MCP at 1440×900. `/api/auth/me` was stubbed with
`page.route`, so no backend was needed: 401 for the signed-out screens, and a user `laura.weber`
for the signed-in one.

The probe ran on the dev server against five states: `/login`, `/forgot-password`, `/` signed in,
`/` with the user menu open, and the log-out item hovered. Each ran under
`prefers-color-scheme: light` and under `dark`. It read 76 computed values (colours, backgrounds,
borders, shadows, `color-scheme`) and took full-page screenshots, once before the change and once
after.

| Check | Before the fix | After the fix |
|---|---|---|
| `data-kern-theme` on `<html>` | not set | `light` |
| Computed values equal in dark and light | 25 of 76 | 76 of 76 |
| Screenshots, dark vs light | 105,232–501,972 of 1,296,000 px differ, depending on the state | pixel-identical in all 5 states |
| Screenshots, light before vs light after | | pixel-identical in all 5 states |

- **Reproduction, before the fix:** the assessment's steps 3–5 now observed in a browser.
  - Under dark, the h1 had `oklch(0.9672 0.0041 271.37)`, which is `neutral-025`, on the fixed
    `neutral-025` page, so it was invisible.
  - The body, top bar, cards, user menu, chips and wallet scene turned black.
  - The inputs turned dark navy and the primary button light blue.
  - The light-mode screenshot of `/login` matched the design.
- **Light mode after the fix:** only three computed values changed, all invisible:
  - `data-kern-theme` itself;
  - `<html>`'s `color-scheme`, from `normal` to `light only`;
  - `<html>`'s `background-color`, from transparent to white. kern.css:57–62 gives any
    `[data-kern-theme=light]` element `background-color: var(--kern-color-layout-background-default)`,
    which is white in light mode, the same as the default canvas. The identical screenshots
    confirm it changes nothing.
- **Production build** (`vite preview`): on `/login`, `/forgot-password` and `/` with the menu
  open, dark and light screenshots are byte-identical. Under dark,
  `matchMedia('(prefers-color-scheme: dark)')` still reports `true`, so the attribute, not
  `color-scheme`, is what fixes the bug, as the assessment said.
- **Auto dark theme and the `only` keyword**, checked with CDP `Emulation.setAutoDarkModeOverride`
  on the production build:
  - With `prefers-color-scheme: dark`, which is how Android's "Darken websites" runs: `/login`
    stays byte-identical to the light reference. A control with plain `color-scheme: light`
    injected gets darkened, so `only` is what opts the page out.
  - With `prefers-color-scheme: light` emulated, the override darkened every page tested,
    including minimal pages with `color-scheme: dark`, `light dark` or `only light` (as CSS or
    meta). A page can't opt out in that setup, so it isn't a gap in this fix.

The screenshots and probe output were working files and are gone. The numbers above come from
those runs.

## Deviations from Assessment

None. The fix is the preferred remediation, applied in the five listed files.

- The two code changes each got a short comment. Nothing in the code reads `data-kern-theme`, so
  without the comment it would look unused.
- In `docs/ARCHITECTURE.md` the decision is a bullet of its own next to the KERN key decision,
  rather than more text in that bullet.
- One effect the assessment didn't mention: kern.css:57–62 gives `<html>` a white background. It
  is checked above and has no visible effect.

## Follow-ups

- Run `/speckit-bug-test slug=force-light-mode`, preferably signed in against the real backend:
  these checks stubbed `/api/auth/me`.
- On every `@kern-ux/native` upgrade, check that `data-kern-theme` still pins the theme: compare a
  dark screenshot with a light one. Once the frontend has a test runner, that comparison makes a
  good regression test.
- Optional: record the light-only decision in
  `specs/001-servicebw-eudi-middleware/design-notes.md` as well. It lists the design's decisions,
  but it wasn't in the assessment's file list.
- `git` doesn't work here as is: the worktree's `.git` points to another machine's path. Read-only
  commands work with `GIT_DIR=<git-dir>/worktrees/light-mode` and
  `GIT_WORK_TREE=<checkout>/light-mode`.
- `frontend/node_modules/` stays installed (it's gitignored) for `/speckit-bug-test`.
