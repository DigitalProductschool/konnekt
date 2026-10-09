# Bug Assessment: The UI follows the browser's dark mode and breaks

- **Slug**: force-light-mode
- **Created**: 2026-10-10
- **Source**: pasted text (no URL)
- **Verdict**: valid
- **Severity**: high. Every screen breaks for everyone whose browser or OS prefers dark: headings, page
  titles and avatar initials become invisible (1.00–1.10:1 contrast). That fails WCAG 2.1 AA, an
  acceptance criterion of the spec (SC-009). There's no data, security or backend impact, and switching
  the browser to light avoids it.

## Report (verbatim or summarized)

> When the browsers is in dark mode, the frontend is broken because it's not made for it.
> Frontend should only be in light mode, always. Probably tailwind is trying to be smart.

The expected behaviour comes from the report: the frontend always renders in light mode, whatever the
browser or the operating system prefers. The suspected cause, Tailwind, doesn't hold up (see Root Cause
Hypothesis).

## Symptom

When the browser prefers a dark colour scheme, KERN's stylesheet switches its semantic colour tokens to
dark values, but the app's page backgrounds, borders, avatar and SVG icons keep fixed light colours.
Every screen renders half dark and half light: a black top bar and black cards on a light grey page,
and text that disappears (the sign-in headline and the page titles have 1.00:1 contrast). Expected:
the light Figma design on every screen.

## Reproduction

1. `cd frontend && npm install && npm run dev` (this worktree has no `node_modules` yet).
2. Make the browser prefer dark in one of these ways:
   - set the OS appearance to dark;
   - in Firefox, Settings → General → Website appearance → Dark;
   - in Chromium DevTools, Rendering → "Emulate CSS media feature prefers-color-scheme" → dark.
3. Open `http://localhost:5173/login`. The headline left of the card can't be seen, because it has the
   page's colour, and the lead text below it is faint. The top bar and the sign-in card are black with
   light grey borders. The inputs are dark navy, the primary button is light blue, and the wallet
   illustration is a dark panel.
4. Open `http://localhost:5173/forgot-password`. It has the same frame, with a light blue icon tile on
   a black card.
5. Sign in (backend running, account from `uv run python -m app.cli create-user <name>`). The page title
   can't be seen, and the avatar initials can't be seen on their light grey circle. The open user menu
   is black and its log-out icon can't be seen. When you hover the log-out item, it turns light grey
   behind near-white text.
6. Switch the preference back to light. The screens match Figma again.

These steps weren't run in a browser during this assessment: this worktree has no `node_modules`, and
the app wasn't started. Steps 3–5 follow from the compiled CSS of the exact locked versions:
`@kern-ux/native` 2.8.2, `@digitalservicebund/kern-ux-tailwind-theme` 4.0.0, `tailwindcss` 4.3.3 and
`@kern-ux-annex/kern-react-kit` 2.40.0. They were downloaded from npm and checked against the hashes in
`package-lock.json`. The contrast values below were computed from KERN's OKLCH token values with the
WCAG formula.

The bug showed up with the system and browser dark mode setting (`prefers-color-scheme`), not with an
extension (answered on 2026-10-10).

Contrast in dark mode. WCAG 2.1 AA (SC 1.4.3) requires at least 4.5:1 for body text and 3:1 for large
text.

| Where | Foreground on background | Contrast |
|---|---|---|
| Sign-in headline, page titles | `layout-text-default` (dark: neutral-025) on `bg-kern-neutral-025` | 1.00:1 |
| Sign-in lead, page hints | `layout-text-muted` (dark: neutral-250) on `bg-kern-neutral-025` | 1.83:1 |
| Avatar initials | `layout-text-default` (dark: neutral-025) on `bg-kern-neutral-050` | 1.10:1 |
| Log-out icon | `logout.svg` #131525 on the menu (dark: black) | 1.16:1 |
| Chevron, lock icon | `expand-more.svg`, `lock.svg` #51577A on black | 2.99:1 |
| Light mode, for comparison: headline | neutral-950 on neutral-025 | 16.43:1 |

## Suspected Code Paths

- `frontend/src/index.css:10` imports `@kern-ux/native/dist/kern.css`. When the browser prefers dark,
  its `@media (prefers-color-scheme: dark) { :root { … } }` rule (kern.css:743) redefines all 49
  semantic colour tokens (`--kern-color-layout-*`, `-action-*`, `-feedback-*`, `-form-input-*`, …).
  kern.css never declares `color-scheme`.
- `frontend/index.html:2`: `<html lang="en">` sets no `data-kern-theme`. Nothing pins KERN to a theme,
  so it follows the browser's preference.
- `frontend/src/index.css:11`: the KERN Tailwind theme maps its colours with `@theme inline`, for
  example `--color-kern-layout-text-default: var(--kern-color-layout-text-default)`. So the semantic
  utilities (`bg-kern-layout-background-default`, `text-kern-layout-text-default`,
  `text-kern-layout-text-muted`, `border-kern-action-default`, …) switch along with KERN. Tailwind
  itself adds no dark-mode CSS: its preflight declares no `color-scheme`, and its `dark:` variant
  appears nowhere in `src/`.
- These colours are fixed light values, so they don't switch:
  - the page background `bg-kern-neutral-025` (#f3f4f7) in
    `frontend/src/components/AuthLayout/index.tsx:13`, `components/AppLayout/index.tsx:8` and
    `components/PageLoader/index.tsx:6`. The headline and lead in
    `components/AuthLayout/AuthIntro.tsx:9,12` and the page title and hint in
    `components/PageTitle/index.tsx:7,10` sit on it, in `text-kern-layout-text-default` and `-muted`.
  - in `frontend/src/components/UserMenu/index.tsx`: `bg-kern-darkblue-050` on the open trigger (:77)
    and `bg-kern-neutral-050` behind the initials (:81) and as the log-out item's hover and focus
    background (:108).
  - `border-kern-neutral-100`, around surfaces that turn black: `components/TopBar/index.tsx:7`,
    `pages/Login/LoginCard.tsx:38`, `pages/ForgotPassword/ForgotPasswordCard.tsx:17` and
    `components/UserMenu/index.tsx:91,92`. `ForgotPasswordCard.tsx:19` also has a `bg-kern-darkblue-050`
    tile.
  - `frontend/src/assets/icons/*.svg` and `assets/illustrations/dot-grid.svg`: fixed hex fills used as
    `<img>`, so they can't follow a token (`logout.svg` #131525, `expand-more.svg` and `lock.svg`
    #51577A).
  - `frontend/src/index.css:18-21`: `--shadow-card`, `--shadow-menu` and `--shadow-chip`, with fixed
    rgb values.

## Root Cause Hypothesis

`@kern-ux/native` 2.8.2 has an automatic dark theme. Unless the page pins a theme with
`data-kern-theme` (or the `.kern-light` or `.kern-dark` class), `kern.css` follows
`prefers-color-scheme` and switches KERN's semantic colour tokens on `:root`. The app pins no theme,
but its design and code are light-only. They mix those switching tokens, which the KERN Tailwind
theme's `@theme inline` passes through, with fixed light primitives, fixed-colour SVGs and fixed
shadows. In dark mode the tokens flip and the fixed colours stay light.

Tailwind isn't the cause: it adds no dark-mode rule of its own and only passes KERN's variables
through. The behaviour has been there since `kern.css` was imported in `a66f2fb` (2026-10-08), so
every screen built since then has it; no later change introduced it.

Confidence: high. The mechanism was read in the compiled CSS of the locked version, but the bug hasn't
been observed in a browser yet.

## Proposed Remediation

**Preferred**: pin KERN's light theme on the root element, and declare the page light-only.

1. In `frontend/index.html`, write `<html lang="en" data-kern-theme="light">`. This attribute is KERN's
   own switch: its changelog adds "global data-kern-theme forcing" (2.7.2) and makes "light utilities
   override system dark mode" (2.6.1). The React kit's `KernToggleDarkMode` sets the same attribute on
   `document.documentElement`.
   - The light rule wins: on `<html>`, `[data-kern-theme=light]` (kern.css:875) and the dark `:root`
     rule (kern.css:744) have the same specificity and are both unlayered, and the light rule comes
     later.
   - Nothing changes for people in light mode: the rule sets the same 49 tokens to exactly the values of
     the system-light block (kern.css:809), compared token by token.
   - There's no dark first paint: a static attribute applies before any CSS or JS runs.
   - It reaches production: nginx serves the built `index.html` unchanged.
2. In `frontend/src/index.css`, add `color-scheme: only light;` to the existing
   `@layer base { html { … } }` rule. This makes the browser draw its own parts (scrollbars, native
   controls, autofill) in light. The `only` keyword also opts the page out of Chromium's Auto Dark
   Theme (forced darkening), as Chrome documents at https://developer.chrome.com/blog/auto-dark-theme.
   The user decided on this opt-out on 2026-10-10. On its own, this line wouldn't fix the bug:
   `color-scheme` doesn't change what `prefers-color-scheme` reports to KERN's media query.
3. Record the convention in three places:
   - a bullet in `CLAUDE.md` "Frontend Development Guidelines", next to the KERN bullet at line 384:
     the app is light-only, keep the attribute, don't use `dark:`. This rule is the only guard against
     `dark:` classes: Tailwind's `dark:` variant isn't rebound (decided on 2026-10-10);
   - the KERN key decision in `docs/ARCHITECTURE.md`;
   - a gotcha in `docs/KERN-DESIGN-SYSTEM.md` §7: kern.css follows the OS dark mode unless
     `data-kern-theme` pins a theme, and primitives like `neutral-025` don't switch while the semantic
     tokens do.

**Alternatives**:
- `class="kern-light"` on `<html>` uses the same rule and works equally well. The attribute is what
  KERN's changelog and toggle use.
- Setting the attribute from `main.tsx` at runtime works too, but the page paints dark until the
  script runs, and it takes more code than one attribute.
- Copying KERN's light values into an `index.css` override inside `@media (prefers-color-scheme: dark)`
  duplicates 49 values, which drift silently with every KERN upgrade.
- Making the app work in dark mode would need semantic tokens for the backgrounds and borders,
  `currentColor` SVGs and dark variants of the illustration. The Figma design has no dark variant, and
  the report asks for light only, so this is out of scope.

**Files likely to change**:
- `frontend/index.html`
- `frontend/src/index.css`
- `CLAUDE.md`
- `docs/ARCHITECTURE.md`
- `docs/KERN-DESIGN-SYSTEM.md`

**Tests to add or update**:
- The frontend has no test runner (`frontend/package.json` has no test script), and adding one for
  this fix is out of scope. Instead, `/speckit-bug-test` verifies with the Playwright MCP, with
  `browser_emulate_media` set to `colorScheme: 'dark'`. It checks `/login`, `/forgot-password` and a
  signed-in screen with the user menu open:
  - `document.documentElement.dataset.kernTheme` is `light`, and the computed `color-scheme` of
    `<html>` contains `only` and `light`.
  - The computed colours of the h1, the card, the top bar, the avatar and the menu are the same as
    under `colorScheme: 'light'`.
  - A screenshot under dark matches one under light pixel for pixel.
  - Light mode looks as it did before the fix: compare screenshots taken before and after.

## Risks & Considerations

- People who prefer dark get the light theme. The report asks for this, and it leaves one theme to
  review for WCAG 2.1 AA (SC-009). Windows High Contrast (`forced-colors`) still works: KERN's
  `@media (forced-colors: active)` rules stay untouched, and `color-scheme` doesn't affect them.
- `only light` also turns off Chromium's Auto Dark Theme ("Darken websites" on Android, a flag on
  desktop) for people who turned it on. That matches "always light", but some people use it for
  comfort or because of light sensitivity. Extensions such as Dark Reader rewrite colours themselves
  and aren't affected.
- KERN has renamed its theme switch once already (`data-theme` → `data-kern-theme`, see its
  changelog). If an upgrade renames it again, the pin stops working without any error, so check it on
  every `@kern-ux/native` upgrade.
- Tailwind's `dark:` variant still follows `prefers-color-scheme`. Nothing uses it today, but a later
  `dark:` class would bring the mixed rendering back. The `CLAUDE.md` rule guards against that.
- There's no backend, API, migration, performance or security impact.

## Open Questions

None left. The user answered them on 2026-10-10:

- **Which browser and setting showed the bug?** The system and browser dark mode setting
  (`prefers-color-scheme`), not an extension. The preferred fix covers it.
- **Should the page also opt out of Chromium's Auto Dark Theme?** Yes, with `color-scheme: only light`.
- **How should `dark:` utilities be kept out?** With a rule in `CLAUDE.md` only. Tailwind's `dark:`
  variant isn't rebound with `@custom-variant`.
