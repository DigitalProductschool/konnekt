# Bug Verification: The UI follows the browser's dark mode and breaks

- **Slug**: force-light-mode
- **Tested**: 2026-10-10
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: verified

## Summary

The bug no longer reproduces. With the browser set to prefer dark, every screen in the assessment's
reproduction renders pixel-identical to light mode, in the dev server and in the production build.
The pre-fix build still shows the bug, with the assessment's contrast values. No regressions were
found: light mode and Windows High Contrast render exactly as before the fix.

The sign-in used the real login form, but the backend's three auth answers were stubbed in the
browser. This machine has no Postgres, `uv` or Docker (see Residual Risks).

## Checks Performed

Browser checks ran in Chromium 154 via the Playwright MCP at 1440×900, with full-page
screenshots. Each colour scheme got a fresh browser context, so both started with the same
visited-link history.

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Reproduction (post-fix), dev server | `npm run dev`, then the assessment's steps 3–6 under `colorScheme: 'dark'` and again under `'light'`: `/login` → *Forgot password?* → back → log in with the form → page title and avatar → open the user menu → hover *Log out* → log out | pass | All 5 states byte-identical between dark and light, and every probed computed value equal (14–19 per state). `data-kern-theme` is `light` and `color-scheme` is `light only`. Logging out returns to `/login`. |
| Contrast under dark (WCAG 2.1 AA, spec SC-009) | Computed colours converted to sRGB, then the WCAG formula | pass | Headline and page title 16.44:1, lead and hint 6.38:1, avatar initials 14.92:1, log-out icon 18.08:1, `#51577A` lock and chevron 7.01:1, hovered log-out item 14.92:1. Same values as light. |
| Control: pre-fix build | `git archive HEAD frontend`, built with `vite build` and served on :4174, same states | pass (bug reproduces) | Dark differs from light by 105,232–501,972 of 1,296,000 px. Contrast under dark is 1.00 (headline, page title), 1.83 (lead), 1.10 (avatar), 1.16 (log-out icon) and 2.99 (lock, chevron), matching the assessment's table. |
| Production build (fixed) | `npm run build`, `vite preview` on :4173, same 5 states | pass | Dark and light byte-identical. Fixed dark is also identical to the pre-fix light build. |
| Light mode before vs after | Pre-fix light vs fixed light, 5 states | pass | Pixel-identical, so no regression for people in light mode. |
| Forced colors (Windows High Contrast) | `forcedColors: 'active'` with the light and dark palettes, `/login` and the open menu, pre-fix vs fixed | pass | Identical before and after, with both palettes. The emulation really applied: 77–90% of the pixels differ from the normal render. Chromium forces `color-scheme` to `light dark` there, so `only light` has no effect. |
| Auto dark theme opt-out | CDP `Emulation.setAutoDarkModeOverride` with a dark preference, `/login` on the fixed build | pass | Identical to the light reference. Control: the same page with plain `color-scheme: light` injected gets darkened. |
| Visual check | Screenshot of the signed-in page under dark, menu open, *Log out* hovered | pass | Light design: title, hint and initials readable, white menu, grey hover, icon visible |
| New / updated tests | none | not-run | The fix added no tests. The frontend has no test runner, and the assessment ruled one out of scope. The browser checks above stand in for them. |
| Lint | `npm run lint` | pass | exit 0 |
| Format | `npm run format:check` | pass | "All matched files use Prettier code style!" |
| Type-check and build | `npm run build` (`tsc -b && vite build`) | pass | The output has `<html lang="en" data-kern-theme="light">` and `html{…color-scheme:light only…}`. All 10 pieces of the light token rule come after the only dark media block. |
| Diff hygiene | `git diff --check`; `git diff --stat HEAD -- frontend` | pass | Clean. In `frontend/`, only `index.html` and `src/index.css` changed. |
| Real-backend sign-in | backend with Postgres and `uv run uvicorn …` | skipped | No `uv`, Docker or Postgres on this machine, and installing them needs the network. `/api/auth/me`, `/login` and `/logout` were stubbed with `page.route`. |
| Backend tests | `uv run pytest` | not-run | The fix changes no backend code, and `uv` and Postgres aren't available. |

## Output Excerpts

Dev server, after the fix, dark vs light:

```
login (/login): theme=light, color-scheme=light only | values equal 17/17 | screenshot dark vs light: byte-identical
forgot-password (/forgot-password): … | values equal 16/16 | … byte-identical
signed-in (/): … | values equal 14/14 | … byte-identical
menu-open (/): … | values equal 19/19 | … byte-identical
menu-hover (/, item hovered): … | values equal 19/19 | … byte-identical
menu item background: open rgba(0, 0, 0, 0), hovered oklch(0.935 0.0081 278.63)
after log-out: light /login, dark /login
```

Production builds:

```
fixed: dark vs light -> all 5 states identical
light: pre-fix vs fixed -> all 5 states identical
fixed dark vs pre-fix light -> all 5 states identical
CONTROL pre-fix: dark vs light -> login: 501972 of 1296000 px differ; forgot-password: 425338 …;
  signed-in: 105232 …; menu-open: 132906 …; menu-hover: 119977 …
pre dark: {"theme":"unset","colorScheme":"normal","prefersDark":true}
  contrast {"headline":1,"lead":1.83,"page title":1,"avatar initials":1.1,"log-out icon #131525 on menu":1.16, …}
post dark: {"theme":"light","colorScheme":"light only","prefersDark":true}
  contrast {"headline":16.44,"lead":6.38,"page title":16.44,"avatar initials":14.92,"log-out icon #131525 on menu":18.08, …}
```

Forced colors and auto dark:

```
login: forced+light pre vs fixed: identical | forced+dark pre vs fixed: identical
menu-open: forced+light pre vs fixed: identical | forced+dark pre vs fixed: identical
auto dark + prefers dark, fixed build [light only]: identical to the light reference (not darkened)
auto dark + prefers dark, control with plain 'light' [light]: differs (darkened)
```

The first dev-server run had two bugs in my own probe. The contrast helper read the `#root > div`
selector as a hex colour, and the snapshot step moved the pointer off the hovered item. Both were
fixed, and the numbers above come from the rerun. The byte-identical results of the other states
didn't change.

## Residual Risks

- **Sign-in was stubbed.** The real login form and log-out ran, but against fake backend answers.
  The backend can't affect colours, yet no end-to-end run with the real backend took place.
- **Chromium only.** The MCP is set up for Chromium. Firefox and Safari use the same CSS mechanism:
  an attribute rule that comes later than the `:root` media rule, plus `color-scheme`, which both
  support. Firefox wasn't run, although the assessment names its "Website appearance: Dark"
  setting as one way to reproduce.
- **Emulated preference.** The checks set `prefers-color-scheme` with Playwright, not the OS
  setting. Pages see the same media feature either way.
- **Desktop Chrome's force-dark flag with a light OS theme** darkens every page, including ones
  that declare dark support, so no page can opt out (see fix.md).
- **Silent breakage on a KERN upgrade.** If `@kern-ux/native` renames `data-kern-theme` again,
  nothing fails loudly. The guards are the docs in `CLAUDE.md` and `docs/KERN-DESIGN-SYSTEM.md` §7,
  and no automated test exists.
- **Current screens only.** The check covered the screens that exist today: sign-in, forgot
  password and the placeholder signed-in screen. Later screens get the global pin automatically.
  Only `dark:` utilities would undo it, and `CLAUDE.md` rules them out.

## Recommendation

Close the bug: verified end to end in Chromium, with a pre-fix control and regression checks for
light mode and High Contrast. Before closing, a two-minute manual look in Firefox with "Website
appearance: Dark" would cover the one browser the assessment names that wasn't run. Once the
frontend gets a test runner, turn the dark-vs-light screenshot comparison into a regression test.
