# Bug Verification: "Add variant"'s hover tint covers only part of its ⓘ

- **Slug**: add-variant-hover-tooltip
- **Tested**: 2026-11-18
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: verified

## Summary

The bug no longer reproduces in the running app. This is the first check on the real Rules step;
the assessment and the fix measured only a static mock. While "+ Add variant" is hovered or
pressed, the tint now covers the whole ⓘ and ends 8px after it, in Chromium and in Firefox. The
resting layout is identical to before the fix, and the ⓘ's tooltip and target work as before. The
lint, the tests, the build and the format check pass. The checks found no regression. One width
band now wraps the row earlier (an expected side effect), and one gap below 320px predates the
fix and is unchanged by it; both are under Residual Risks.

## Setup

- Throwaway database: a `postgres:18-alpine` container (`--rm`, no volume) on 5435, migrated with
  `alembic upgrade head`, plus a test account. The backend ran with `uvicorn`,
  `WORKER_ENABLED=false` and no EUDIPLO, which a draft doesn't need. The frontend ran on Vite's
  dev server with `VITE_API_URL=http://localhost:3000`. All settings came from environment
  variables, so no `.env` was written.
- Path, as in the assessment's reproduction: sign in → new connection → name → Personal ID with
  "Date of birth" → "Set rules" → the Rules step (tabs "Standard", "+ Add variant", ⓘ).
- **Pre-fix contrast**: the checkout's git metadata points to another machine's path, so the old
  source couldn't be checked out and built. Instead, the old computed values were set at runtime
  as inline `!important` styles: the button's `margin-right: -12px` and `padding-right: 8px`,
  and the group's `padding-right: 0`. Each measurement was taken with and without them. No
  source file was changed.
- Browsers: Chromium (Playwright) for the full set of checks, and Firefox 159 for the geometry,
  the hit test, the hover and the click.
- Everything was stopped and removed afterwards: the servers, the container and the browser
  tool's `.playwright-mcp/` output folder.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Reproduction (post-fix), 1440px EN | Rules step, real mouse over "+ Add variant" (Chromium) | pass | Button background is the 8 % tint. Pixels 3px above and below the ⓘ are tinted across all of its 20px and up to the button's edge 8px after it (`test-hover-1440.png`) |
| Reproduction (pre-fix values at runtime) | Same, with the old margin and padding as inline styles | pass (bug reproduced) | Tint covers the ⓘ's left ~12px only (`TTTTTTTTTTWWWWWWWWW`), and the rounded corner cuts the icon (`test-hover-prefix-1440.png`) |
| Resting layout unchanged | Geometry pre vs post, 1440px | pass | ⓘ at x 393.44 in both, 4px after the label text. Button left, label and row (49px) identical. Only the button's right edge moved: 16 → 32px after the text |
| Button box contains ⓘ | `getBoundingClientRect` | pass | Button ends 8px after the ⓘ (pre-fix: −8px) |
| Pressed tint | `mouse.down` on the label, released off the button | pass | `color(srgb 0.858 0.894 0.991)` (the `index.css` 16 % tint). Tinted across the ⓘ and 8px after it (`test-pressed-1440.png`). No dialog opened |
| Hit test across the ⓘ | `elementFromPoint` every 1px on the icon's centre line | pass | `iiiiiiiiiiiiiiiiiiiiBBBBBBBB...`: the ⓘ over all 20px, the button over the 8px after it |
| Pointer on the ⓘ | Mouse at the ⓘ's centre | pass | ⓘ `:hover`, button not hovered (no tint), tooltip open (`test-pointer-on-info-1440.png`). This is the agreed behaviour |
| Pointer on the 8px after the ⓘ | Mouse at ⓘ right + 4 | pass | Button `:hover`, tinted, tooltip closed |
| Mouse click on the ⓘ | Click at its centre | pass | Tooltip stays open, the Add variant dialog does **not** open |
| Tooltip via keyboard | Tab from the button to the ⓘ, Escape, Enter | pass | Opens on keyboard focus, Escape closes it, Enter reopens it |
| Tooltip via touch | CDP touch taps (Chromium touch emulation) | pass | Tap 1 on the ⓘ opens it, tap 2 closes it. A tap on the 8px after the ⓘ opens the Add variant dialog, as designed |
| Focus ring | Keyboard focus on "+ Add variant" | pass | 4px ring around the button's box, which now encloses the ⓘ (`test-focus-ring-1440.png`). This is the risk accepted in fix.md |
| Label line (design-notes U43 `6168:7011`) | Line boxes relative to the row | pass | Label 12–36, tab names 14–38 (2px above), row 49. Identical pre and post |
| 320px, one tab, EN | Geometry and overflow | pass | Row 49px, row and document `scrollWidth` = `clientWidth`, ⓘ 4px after the label, button 8px after the ⓘ, group ends 4px inside the row |
| 320px, three tabs (added via the real dialog), EN and DE | Same | pass | Row 125px pre and post, group on its own line, no overflow (`test-320-wrapped.png`). DE "Variante hinzufügen" behaves the same |
| 1440px, DE and three tabs EN | Same | pass | ⓘ 4px after the label, button 8px after the ⓘ, row 49px |
| Width sweep, three tabs EN | 256–1440px (every 4px below 480, every 16px above), pre vs post | pass | Nothing overflows at any width. One sampled width (624px) wraps the group to a second line post-fix (49 → 87px). See Residual Risks |
| Narrow mode (< 320px: 319, 300, 256) | Geometry pre vs post | pass for the fix | Button 24 / −28 / group 8 hold, and the button contains the ⓘ with 8px after it. The ⓘ sits 0px after the label text **both pre and post** (see Residual Risks) |
| Firefox 159, 1440px | Geometry, hit test, hover, click on the ⓘ | pass | Same as Chromium: 4px / 8px / contains, hit test `i`×20 then `B`×8, tint on the label and after the ⓘ, none on the ⓘ, clicking the ⓘ opens no dialog |
| Production CSS | grep in `frontend/dist/assets/*.css` after the build | pass | `.\[\&\>\.kern-btn\]\:-mr-28\!>.kern-btn{margin-right:-1.75rem!important}`, the matching `pr-24!` rule and `.pr-8` are present |
| Browser console | Playwright console logs | pass | Only the expected `401` from `/api/auth/me` before sign-in, React dev timestamps and the test's own canvas warnings. No app errors |
| New / updated tests | none | n/a | The fix added none: jsdom does no layout. The browser checks above stand in for them |
| Unit tests | `npm test` (root) | pass | 46 files / 2675 tests, 46 / 1992, 15 / 513 |
| Lint | `npm run lint` (root) | pass | exit 0, all workspaces |
| Type-check + build | `npm run build` (root) | pass | typecheck and `vite build` succeed |
| Format (CI's check) | `npm run format:check` | pass | "All matched files use Prettier code style!" in every workspace |
| Prettier on the changed files | `npx prettier --check <constants.ts> <design-notes.md>` | pass / warn | `constants.ts` is clean. `design-notes.md` is flagged, as are all 19 spec Markdown files; `specs/` is outside the pre-commit hook's and CI's Prettier scope. Not a regression |
| Backend checks | — | skipped | No backend file changed |

## Output Excerpts

```text
# 1440px, Chromium: pre-fix values vs post-fix
preFix : iconLeftAfterText 4, btnRightAfterText 16, btnRightAfterIcon -8, btnContainsIcon false, rowH 49
postFix: iconLeftAfterText 4, btnRightAfterText 32, btnRightAfterIcon  8, btnContainsIcon true,  rowH 49

# hovered, pixels 3px above the ⓘ (T = tinted, W = white), 19 samples across the ⓘ, then after it
preFix : across ⓘ TTTTTTTTTTWWWWWWWWW   after WWWWWWWWWWW
postFix: across ⓘ TTTTTTTTTTTTTTTTTTT   after TTTTTTWWWWW
pressed (post): from the ⓘ's left edge to the button's edge + 4: TTTTTTTTTTTTTTTTTTTTTTTTTTTTWWWWW

# hit test on the ⓘ's centre line, from its left edge (i = ⓘ, B = button)
Chromium: iiiiiiiiiiiiiiiiiiiiBBBBBBBB...
Firefox : BiiiiiiiiiiiiiiiiiiiiBBBBBBBB...   (first sample 0.4px left of the ⓘ)

# label line, relative to the row (pre = post)
labelLine [12, 36], tabNameLine [14, 38], rowH 49

# width sweep, 117 widths 256–1440px, three EN tabs
diffs: [{ w: 624, pre: { h: 49 }, post: { h: 87 } }]   anyOverflowPost: []

npm test   → Tests 2675 passed | 1992 passed | 513 passed
npm run build → ✓ built in 1.90s
npm run format:check → All matched files use Prettier code style!
```

Screenshots in this directory: `test-hover-prefix-1440.png`, `test-hover-1440.png`,
`test-pressed-1440.png`, `test-pointer-on-info-1440.png`, `test-focus-ring-1440.png`,
`test-320-wrapped.png`.

## Residual Risks

- **The pre-fix comparison was emulated**: the old computed values were set as inline styles,
  not built from the old source (no usable git metadata in this checkout). The emulated
  geometry matches the assessment's mock measurements exactly (12px of the ⓘ inside the tint,
  8px outside).
- **Earlier wrap in a narrow band**: the group is 8px wider, so for a band of at most 8px of
  window width the row now wraps "+ Add variant" to its own line where it used to just fit (seen
  at 624px with "Standard", "Pensioners", "Students"). The band's position depends on the tab
  names and the language. The row wraps by design (`flex-wrap`) and nothing overflows.
- **Below 320px (narrow mode), the ⓘ touches the label**: the label's padding there is 4px all
  round instead of KERN's 4px 8px, so the ⓘ starts 0px after the text instead of 4px. This is the
  same before and after the fix, so it isn't caused by it. design-notes U43 records only the
  ≥ 320px layout. A possible separate follow-up.
- **Agreed trade-offs, confirmed in the app**: the button's focus ring encloses the ⓘ, and the
  tint disappears while the pointer is on the ⓘ itself (fix.md, "Deviations from Assessment").
- **Not covered**: WebKit / Safari, and a physical touch device (taps were emulated through CDP
  in Chromium). The ⓘ's clickability depends on its CSS mask painting it above the button. That
  holds in Chromium and Firefox; Safari wasn't tested.
- The browser checks used Vite's dev CSS. The production bundle was checked by grep for the same
  rules, not measured in a browser.

## Recommendation

Close the bug. The fix is verified end to end in the running app: the hover and pressed tints
now cover the whole ⓘ and end 8px after it in Chromium and Firefox, and the original symptom
reproduces only when the old values are put back. The resting layout, the label line and the ⓘ's
tooltip and target are unchanged, and the lint, tests, build and format checks pass. The ⓘ
touching the label below 320px predates the fix; track it separately if the narrow layout should
keep the 4px gap.
