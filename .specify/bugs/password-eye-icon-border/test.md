# Bug Verification: Buttons keep a focus ring after a click, and the eye toggle shows a hover box

- **Slug**: password-eye-icon-border
- **Tested**: 2026-10-10
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: verified

## Summary

In Chromium 154 and Firefox 157, with real mouse, touch and key events, the bug reproduces on the
original code (`HEAD`) and no longer on the fixed code. A click or a tap leaves no ring on "Log
in", "Back to log in" or the eye toggle, and the toggle changes only its icon. That holds against
the real backend too. Keyboard focus, forced colors, the user menu and every screen at rest are
byte-identical to before. The frontend's lint, format check and build pass, and so does the
backend suite.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Reproduction, pre-fix control | Assessment steps 3–6 on `HEAD`'s `frontend/`: a scratch copy, `vite build`, `vite preview` | pass: the bug reproduces | The ring appears after mouse down, after release, after moving away, after a failed sign-in and after a tap. The toggle tints 8% on hover and 16% on press. This proves the probe can see the bug. |
| Reproduction (post-fix) | Same steps on the worktree: the production build (`npm run build`, `vite preview`) and the dev server (`vite`) | pass | No ring after any click or tap. The toggle's crops on hover, press, release and tap are byte-identical to its unfocused, unhovered state. |
| Keyboard focus kept | Tab to each button, hold Space on the toggle, press Enter on "Log in" and "Back to log in" | pass | 4px solid #454B6B ring at offset 2px. Crops are byte-identical to `HEAD`. Tabbing to the toggle and then clicking it keeps the ring, as the assessment expects. |
| Forced colors | Emulated `forced-colors: active`, then Tab, then a mouse click | pass | Keyboard: `outline: 3px auto`, offset 4px, crop byte-identical to `HEAD`. Mouse: `HEAD` keeps a 4px solid ring, the fix shows none. |
| Unaffected controls | The avatar, "Log out" and "Forgot password?" by mouse and keyboard, then sign out | pass | Same computed values as `HEAD`, and byte-identical crops for the avatar and the open menu. The avatar's 1px open-state border stays. |
| At rest | Full viewport of `/login`, `/forgot-password` and the signed-in screen, 2910×1800 px | pass | Byte-identical to `HEAD` |
| Dev vs production | All 31 crops of the dev server against the production build | pass | Byte-identical |
| Desktop media | The whole probe again with `(hover: hover)` and a fine pointer emulated | pass | Same results. All 93 crops are byte-identical to the default-media runs. |
| New / updated tests | none added | not-run | The frontend has no test runner, as the assessment and the fix note. The browser probe stands in for tests. |
| Lint | `npm run lint` | pass | |
| Format | `npm run format:check` | pass | |
| Type-check and build | `npm run build` (`tsc -b && vite build`) | pass | The built CSS has the global rule and the toggle's utility. KERN's own focus rules are unchanged. |
| Dependencies | `npm ls --depth=0` | pass | All at their locked versions, among them `@kern-ux/native` 2.8.2 and `tailwindcss` 4.3.3 |
| Diff hygiene | `git diff --check`, plus a search for conflict markers | pass | One line is 104 characters long: the toggle's `className` string, which Prettier keeps whole. |
| Docs | The four doc diffs, read against `kern.css`, Tailwind and the section headings | pass | The specificity (0,4,0 against 0,3,0), the 8% and 16% tints, Tailwind's `@media (hover: hover)` wrapper and every section reference are accurate. |
| Real backend, Chromium | The probe without the stub, against `uvicorn` on local PostgreSQL 17, for `HEAD`, the production build and the dev server. A wrong password, then the right one, then the user menu and sign-out | pass | 202/202 checks. The wrong password shows the backend's "Invalid username or password". The ring stays after the failed sign-in on `HEAD`, and is gone with the fix. The right password signs in, and "Log out" ends the session, which stays ended after a reload. The toggle and Tab crops match the stubbed runs. |
| Firefox | WebDriver BiDi probe, headless Firefox 157.0.1, `HEAD` against the fix, real backend | pass | 62/63 checks. Firefox focuses buttons on click, and `HEAD` shows the ring and the tints there just as Chromium does. The fix clears them, and the keyboard crops are byte-identical. The one miss is a Chromium-only expectation: Firefox doesn't match `:active` while Space is held, in either build, so the 16% press state never appears there. |
| Firefox forced colors | Pref `browser.display.document_color_use = 2`, Tab, then a click | pass | 6/6 checks. Keyboard focus keeps `3px auto`, offset 4px, in both builds. A click leaves a 4px solid ring on `HEAD`, and none with the fix. |
| Backend suite | `uv run pytest`, `ruff check`, `ruff format --check`, `mypy app/ tests/` | pass | 39 passed against a `_test` database. No backend file changed, so this only confirms nothing else broke. |
| Figma (assessment step 7) | none | skipped | Not run, by the command's rule against network checks without consent. It's covered transitively: the screens at rest are byte-identical to `HEAD`, which the assessment matched to Figma (`I153:7699;151:1094`). |

### Setup

- **Browser**: headless Chromium 154.0.8037.92, driven over the DevTools protocol (pipe) at 1455×900,
  scale 2.
  - The page body is 1440 px wide, the Figma frame.
  - The probe sends real `Input.dispatchMouseEvent`, `dispatchKeyEvent` and `dispatchTouchEvent`
    events, and opens a fresh tab for each scenario.
- **Builds**: three, served side by side.
  - `HEAD`'s `frontend/`, a scratch copy that differs from the worktree only in `index.css` and
    `PasswordField.tsx`.
  - The worktree's production build.
  - The worktree's dev server.
- **API stub**: `/api/auth/*` was stubbed inside the browser.
  - `me` answered 401, or `{data: {username}}` for the signed-in checks.
  - `login` answered 401 with the backend's own body, `{error: 'Unauthorized', message: 'Invalid
    username or password'}`.
  - `logout` answered 200.
- **Touch**: Chromium's touch emulation, which sets `hover: none` and `pointer: coarse`. `:hover`
  stuck after a tap, as it does on touch screens.
- **Forced colors**: `Emulation.setEmulatedMedia`.
- **Compared**:
  - computed styles and `:focus`, `:focus-visible`, `:hover` and `:active` matches;
  - crops of each button with 8 px around it, compared byte by byte. Where they differed, they were
    compared pixel by pixel, inside and outside the element's box.
- **Runs**: 14 scenarios on 3 builds, with 239 checks and 93 crops per run.
  - Two runs with headless Chromium's default media, `hover: none`.
  - One run with Playwright's desktop flag
    `--blink-settings=primaryHoverType=2,availableHoverTypes=2,primaryPointerType=4,availablePointerTypes=4`.
- **Real backend and Firefox** (a second session, the same day):
  - PostgreSQL 17 on localhost: a throwaway role, an app database and a `_test` database, all
    dropped afterwards. The backend ran with `WORKER_ENABLED=false`, and the account `test.user`
    was created through `app.cli create-user`.
  - `HEAD`'s and the fix's production builds were served by a small static server that proxies
    `/api` to the backend, as nginx does. The dev server used `VITE_API_URL=http://localhost:3000`.
  - `uv sync --locked` fetched the missing locked packages from PyPI into the gitignored
    `backend/.venv`.
  - Firefox ran at 1440×900, scale 2. BiDi `input.performActions` sent the mouse, touch and key
    actions.
- **Side effects**: the checks wrote only gitignored build output in the worktree: `frontend/dist/`,
  `*.tsbuildinfo` and `node_modules/.vite`.

## Output Excerpts

```text
$ npm ls --depth=0        → exit 0
$ npm run lint            → exit 0
$ npm run format:check    → All matched files use Prettier code style!
$ npm run build           → ✓ built in 1.05s (exit 0)
built CSS: .kern-btn:focus:not(:focus-visible){outline:none!important}
           .\[\&\:is\(\:hover\,\:active\)\]\:bg-transparent\!:is(:hover,:active){background-color:#0000!important}
```

Crops, `HEAD` against the fix, in device pixels. "Inside" is the button's own box, and "outside" is
the 8 px around it, where the ring is drawn.

```text
toggle-hover            5914 px differ (inside 5914, outside 0)       the 8% box
toggle-pressed          8869 px differ (inside 5914, outside 2955)    box and ring
toggle-released         8880 px differ (inside 5925, outside 2955)    box and ring
toggle-moved-away       2955 px differ (inside 0, outside 2955)       the ring
toggle-key-space-held   5919 px differ (inside 5919, outside 0)       the 16% press tint
toggle-touch-tapped     8880 px differ (inside 5925, outside 2955)    box and ring
login-pressed          13903 px differ (inside 0, outside 13903)      the ring
login-after-fail       13903 px differ (inside 0, outside 13903)      the ring
back-pressed           13903 px differ (inside 0, outside 13903)      the ring
the other 22 crops, among them every keyboard crop, the forced-colors crop,
the user menu and the three full screens: identical (bytes)
```

Computed values of the toggle, `HEAD` → fix:

```text
hover        background  oklch(0.4284 0.1689 265.02 / 0.08) → rgba(0, 0, 0, 0)
mouse down   outline     4px solid oklch(0.4213 0.0539 275.67), offset 2px → none   (:focus true, :focus-visible false)
Space held   background  oklch(0.4284 0.1689 265.02 / 0.16) → rgba(0, 0, 0, 0)
Tab          outline     4px solid oklch(0.4213 0.0539 275.67), offset 2px → unchanged
geometry     40×40 box with a 4 px margin, 48×48 hit area, 20×20 icon #2044AA → unchanged
```

```text
run 2, default headless media: 239/239 checks passed, 0 scenario errors
run 3, desktop media:          239/239 checks passed, 0 scenario errors
```

Run 1 passed 233 of 236 checks. The other three were a defect in the probe, not the app: they read
a field the probe didn't record (`outlineStyle`). The values it recorded showed the expected result
(`HEAD`: a 4px solid ring, the fix: none), and runs 2 and 3 ran with the corrected check.

## Residual Risks

- **Other browsers**: Chromium and Firefox on Linux were run. Android, Windows and Safari weren't.
  Safari and Firefox on macOS don't focus a button on click, so there only the toggle's tint change
  shows.
- **Emulation**: touch and forced colors were emulated, not tried on a touch device or in Windows
  High Contrast.
- **Global by design**: a later KERN button focused by script after a mouse action shows no ring
  either, for example the first button of a dialog opened by a click. The browser's own ring
  wouldn't show there either. Keyboard flows keep the ring.
- **KERN upgrades**: the rule depends on the `.kern-btn` class and on KERN drawing the ring as an
  `outline`. Recheck on every `@kern-ux/native` upgrade, as the fix's follow-ups say.
- **Not covered, by decision**: KERN checkboxes and radios also draw their ring on `:focus`
  (`kern.css:2543`).
- **Already there, unchanged**: in forced colors, KERN paints the eye white.

## Recommendation

Close the bug: it's verified end-to-end in Chromium and Firefox, with both the stubbed API and the
real backend. The symptom reproduces on `HEAD` and is gone with the fix, in both the production
build and the dev server, and nothing changes at rest or for keyboard focus.
