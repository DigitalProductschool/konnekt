# Bug Assessment: Buttons keep a focus ring after a click, and the eye toggle shows a hover box

- **Slug**: password-eye-icon-border
- **Created**: 2026-10-10
- **Updated**: 2026-10-10. At the user's request, the scope grew from the eye toggle to every
  button, with one global rule.
- **Source**: pasted text (no URL)
- **Verdict**: valid
- **Severity**: low. This is a visual defect, and every button still works.
  - Every KERN button (`.kern-btn`) shows a thick dark ring once it's clicked or tapped. That's
    "Log in", "Back to log in" and the eye toggle today, and any KERN button added later. On "Log
    in" the ring stays after a failed sign-in until focus moves.
  - The eye toggle also gets a tinted box on hover.
  - The ring appears in Chromium-based browsers, Firefox on Windows and Linux, and on Android. The
    hover box appears for every mouse user.
  - The screens don't match the Figma design, but there's no functional, data or security impact.
  - It has been there since the first KERN button was built. The toggle came with `814a306`
    (2026-10-09).

## Report (verbatim or summarized)

> Using the design for the login page from figma, we got a border in the eye icon of the password
> field. The border must be removed and when hovering/click the icon only the icon itself should
> move (open close), not any border or other distracting things

Follow-up, 2026-10-10, after the first version of this assessment pointed out that other buttons
show the same ring:

> I didn't notice the border for the other buttons (like login and log-out). Can you also fix
> those? I would say a global rule to override this behaviour for every button is the best. Add
> this to the same bug fix so we can fix once and for all

Expected behaviour, from the two messages:

- **The eye toggle**: hovering or clicking it changes only the icon, which switches between the
  open and the crossed-out eye. No border, no background, nothing else.
- **Every button**: a click or tap leaves no ring. One global rule does it (the user's decision),
  in this same fix.
- **Keyboard focus**: the ring stays when the keyboard focuses a button. WCAG 2.1 AA requires it;
  see Proposed Remediation.

## Symptom

- **The eye toggle** on `/login` matches Figma at rest: a 20 px blue eye (#2044AA), with no border
  and no background.
  - On hover, a 40×40 box tinted 8% blue appears behind it.
  - When the mouse button goes down, KERN's focus ring appears around it: 4 px solid #454B6B,
    2 px out, with rounded corners. The ring reaches 2 px past the field's top and bottom edges.
  - After the click, the ring stays when the mouse moves away, until focus moves (for example back
    into the input). This is the "border" in the first report.
- **"Log in"** on `/login` gets the same ring when the mouse button goes down. After a failed
  sign-in, the ring stays around the button until focus moves.
- **"Back to log in"** on `/forgot-password` gets the ring while the mouse button is held down.
  Releasing it navigates to `/login`.
- **Not affected**:
  - "Log out" and the avatar button of the user menu are plain buttons whose rings only use
    `focus-visible:`, so they show no ring after a click.
  - "Forgot password?" is a KERN link, and KERN links show their ring only on `:focus-visible`.
  - While the menu is open, the avatar button has a blue 1 px border on a light blue background.
    That's the designed open state (design notes §3, lines 120–121), not a focus ring, and it stays.

## Reproduction

1. `cd frontend && npm ci && npm run dev` (this worktree has no `node_modules` yet). The backend
   isn't needed for steps 3–6: when `/api/auth/me` fails, the app treats the visitor as signed out
   (`components/CurrentUserProvider/index.tsx:16`).
2. Open `http://localhost:5173/login` in Chrome, Edge or Chromium.
3. Hover the eye at the right end of the Password field. A light blue-grey box appears behind it.
4. Click the eye. A thick, dark, rounded ring appears as soon as the mouse button goes down. The
   password shows, and the eye switches to the crossed-out eye. Move the mouse away: the box goes,
   but the ring stays until you click into the input.
5. Click "Log in". The ring appears around the button. With the backend down or a wrong password,
   the error message appears and the ring stays.
6. Open `/forgot-password`, press the mouse button on "Back to log in" and hold it. The ring appears
   until you release.
7. Compare with Figma "Middleware – V2" (`BZUNank5VjCzqr2BcyhifB`), frame "01 Log in" (`153:7661`).
   The design shows no border and no background on the toggle (`I153:7699;151:1094`) or on "Log in".

### How it was reproduced

The steps were run on 2026-10-10 in headless Chromium 154 at 1455×900. A script drove it over the
DevTools protocol with real mouse, touch and key events, so `:hover`, `:active` and focus were set
the way a person sets them.

- The dev server ran from a scratch copy of `frontend/`.
- It used another worktree's `node_modules`, installed from a byte-identical `package-lock.json`:
  - `@kern-ux/native` 2.8.2
  - `@kern-ux-annex/kern-react-kit` 2.40.0
  - `@digitalservicebund/kern-ux-tailwind-theme` 4.0.0
  - `tailwindcss` 4.3.3
- A stub stood in for the backend:
  - `/api/auth/me` answered 401, or a signed-in user for the user-menu checks;
  - `/api/auth/login` answered 401;
  - `/api/auth/logout` answered 200.

Every button, before any change:

| Button | Element | Mouse click or tap | Keyboard (Tab) |
|---|---|---|---|
| Eye toggle | `button.kern-btn--tertiary.kern-btn--small` | 8% box on hover; **ring** from mouse down until focus moves | 4 px ring |
| "Log in" | `KernButton`, which renders `button.kern-btn--primary` | **ring** from mouse down; it stays after a failed sign-in | 4 px ring |
| "Back to log in" | React Router `Link` with `kern-btn kern-btn--primary` | **ring** while the mouse button is down | 4 px ring |
| Avatar (user menu) | plain `<button>`, `focus-visible:` utilities | none | 4 px ring |
| "Log out" | plain `<button role="menuitem">`, `focus-visible:` utilities | none (also none when the mouse opened the menu and the script moved focus to it) | 4 px ring, inset 4 px |
| "Forgot password?" (a link, for comparison) | `a.kern-link` | none | not probed |

Every ring above is 4 px solid #454B6B. All but the "Log out" one sit 2 px out.

The eye toggle in detail (computed values of the `<button>`):

| State | `:focus` / `:focus-visible` | background | outline | icon |
|---|---|---|---|---|
| Rest | no / no | transparent | none | eye, #2044AA |
| Hover | no / no | #2044AA at 8% | none | eye |
| Mouse button down | yes / no | #2044AA at 8% | 4px solid #454B6B, offset 2px | eye |
| Released, still hovered | yes / no | #2044AA at 8% | 4px solid #454B6B, offset 2px | crossed-out eye |
| Mouse moved away | yes / no | transparent | **4px solid #454B6B, offset 2px** | crossed-out eye |
| Clicked into the input | no / no | transparent | none | crossed-out eye |
| Keyboard: Tab to the toggle | yes / yes | transparent | 4px solid #454B6B, offset 2px | crossed-out eye |
| Touch screen (no hover), after a tap | yes / no | #2044AA at 8% (`:hover` sticks) | 4px solid #454B6B, offset 2px | crossed-out eye |

Chromium reports the colours in OKLCH. Converted to sRGB:

- The icon is `oklch(0.4284 0.1689 265.02)`, KERN's `action-default`, which is #2044AA. That is the
  eye's fill in the Figma asset.
- The ring is `oklch(0.4213 0.0539 275.67)`, KERN's `action-focus-default` (neutral-700), which is
  #454B6B.

Other browsers weren't run. According to MDN's "Clicking and focus" table for `<button>`, Safari and
Firefox on macOS don't focus a button when it's clicked. There, the ring should show only for
keyboard focus, but the toggle's hover box shows in every browser.

### Figma reference

The toggle was checked on 2026-10-10: a `figma-node-finder` subagent found the nodes, then
`get_design_context` read the toggle.

- **The toggle** `I153:7699;151:1094` ("show password") is an instance of KERN's
  "button-tertiary-small" (component `41:335`, from an external library).
  - It's 48×48, 4 px from the field's right end and level with the 48 px input box.
  - Inside it, "visible-size" (40×40, radius 4, no fill, no stroke) holds the 20×20 eye, filled
    #2044AA.
- **States in the file**: the button's "focus" layer (`I153:7699;151:1094;1914:12800`) is hidden.
  The file shows no hover, pressed, focused or password-visible state, and has no closed-eye icon.
  The main component is in an external library, so its other variants can't be checked.
- **Behaviour note**: the page "🤖 Flow for AI" (note `2081:4027`) says only "Click eye icon → show /
  hide password".

So the resting state already matches Figma. The ring and the box are KERN's interaction states:
the design doesn't show them, and the user asks for them to go.

## Suspected Code Paths

- **`frontend/node_modules/@kern-ux/native/dist/kern.css`** (2.8.2), which
  `frontend/src/index.css:10` imports without a cascade layer:
  - `:1986-1989`: `.kern-btn:not([disabled]):not([tabindex="-1"]):focus { outline: 4px solid
    var(--kern-color-action-focus-default-contextual); outline-offset: 2px }`. The rule uses `:focus`,
    not `:focus-visible`, so the ring also appears when a mouse click or a tap focused the button.
    **This is the ring on every KERN button.**
    - Its specificity is 0,4,0.
    - A second selector in the same rule, with `aria-disabled`, has the same specificity.
  - `:1990-1997`: in forced colors, `:focus-visible` gets `outline: auto !important`. That is the
    High Contrast focus indicator, and it must stay.
  - `:2079-2081`: `.kern-btn--tertiary:not(:disabled):hover` sets the background to
    `--kern-color-action-state-indicator-tint-hover-opacity`. That is `action-default` at 8% in the
    pinned light theme (`:900`, `:936`).
  - `:2082-2084`: `.kern-btn--tertiary:active` sets 16% (`:901`, `:937`). It loses to the hover rule
    while the mouse is over the button, so it shows only when the button is pressed without hover:
    Space on the keyboard, or touch.
  - `:2070-2072`: `.kern-btn--tertiary > .kern-icon` colours the eye #2044AA, as in Figma.
  - `:2147-2191`: the small size. The box is 40×40, and its `::before` widens the hit area to 48×48.
  - `:4560`: `.kern-link` draws its ring only on `:focus-visible`, which is why "Forgot password?"
    isn't affected.
- **The KERN buttons**:
  - `frontend/src/pages/Login/PasswordField.tsx:29-40`: the toggle. Line 33 sets
    `kern-btn kern-btn--tertiary kern-btn--small`. Lines 35–38 swap the icon, the "open close" to
    keep.
  - `frontend/src/pages/Login/LoginCard.tsx:79`: `KernButton` for "Log in", which renders a
    `button.kern-btn.kern-btn--primary`.
  - `frontend/src/pages/ForgotPassword/ForgotPasswordCard.tsx:34-37`: "Back to log in", a `Link`
    with the classes `kern-btn kern-btn--primary kern-btn--block`.
- **Already keyboard-only, unaffected**: the plain buttons in
  `frontend/src/components/UserMenu/index.tsx:77` (avatar) and `:108` ("Log out"). They draw KERN's
  ring with `focus-visible:outline-4 …` utilities, the pattern the global rule brings to KERN's
  buttons.
- **`frontend/src/index.css`**: the place for the global rule. It already holds the app's overrides
  of KERN: the adaptive type in the unlayered `:root` block, and the light-only `color-scheme`.
- **`specs/001-servicebw-eudi-middleware/design-notes.md`**:
  - `:176-177`: "KERN tertiary small button, icon only" for the toggle.
  - `:348-349`: "the design has no focus states, so KERN's focus outline is used".
- **`docs/KERN-DESIGN-SYSTEM.md`**:
  - `:410-413`: recommends the native tertiary small markup for icon-only buttons, but doesn't
    mention the focus or hover states.
  - `:389-391`: KERN's unlayered CSS beats Tailwind's utilities.
- **Tailwind 4.3.3's `hover:` variant** wraps its rule in `@media (hover: hover)`
  (`tailwindcss/dist/lib.mjs`), but KERN's hover rule has no media query. So a `hover:` override
  doesn't reach touch screens, where `:hover` sticks after a tap. This was verified in the scratch
  copy.

## Root Cause Hypothesis

KERN 2.8.2 draws the focus ring of every `.kern-btn` on `:focus` instead of `:focus-visible`. Some
browsers focus a button when it's clicked or tapped: Chromium, Firefox on Windows and Linux, and
Android. In those, the ring appears as soon as the mouse button goes down and stays until focus
moves. On the eye, that looks like a border; on "Log in" and "Back to log in", like a thick frame.

The tertiary variant adds its own tint on hover and press. That's the "other distracting things" on
the toggle.

The app's own plain buttons and KERN's links already use `:focus-visible`, so they never showed a
ring after a click. Figma shows only the default states, so the screens matched at rest, and the
states slipped through the visual check.

Confidence: high.

- Every value was reproduced in a browser and matches a KERN rule exactly.
- The global rule below, applied in a scratch copy, removes the rings after clicks and taps on
  every KERN button. Keyboard focus stays as it was.

## Proposed Remediation

**Preferred** (the user chose a global rule for every button on 2026-10-10):

1. **A global rule in `frontend/src/index.css`**, unlayered, after the `:root` block:

   ```css
   /*
    * KERN draws its button focus ring on any :focus, so a click or a tap leaves the ring on the
    * button until focus moves on. Like the browser's own ring, show it for keyboard focus only.
    */
   .kern-btn:focus:not(:focus-visible) {
     outline: none !important;
   }
   ```

   - **Why `.kern-btn`**: KERN's button rule is the only source of rings after a click among the
     app's buttons. Targeting the class covers every KERN button, now and later, whether it renders
     as `<button>` or as `<a>` ("Back to log in"). The app's plain buttons and the browser's own
     focus ring already use `:focus-visible`.
   - **Why `!important`**: KERN's selector has specificity 0,4,0, and this simple one has 0,3,0.
     `!important` makes it win whatever KERN's selector looks like, so the rule doesn't have to copy
     KERN's two selectors. It doesn't touch forced colors: KERN's `outline: auto !important` there
     applies only to `:focus-visible`.
   - **What stays**: keyboard focus (`:focus-visible`) keeps KERN's 4 px ring.
     - WCAG 2.1 AA SC 2.4.7 requires it, and the spec makes AA an acceptance criterion (SC-009).
     - Figma's KERN button has it too, as its hidden "focus" layer.
     - Browsers without `:focus-visible` drop the whole rule and keep KERN's ring, as today.

2. **The eye toggle** in `frontend/src/pages/Login/PasswordField.tsx` needs only the tint override
   now, because the global rule removes the ring:

   ```tsx
   // Only the icon changes: KERN tints tertiary buttons on hover and press
   className="kern-btn kern-btn--tertiary kern-btn--small [&:is(:hover,:active)]:bg-transparent!"
   ```

   - It uses an arbitrary variant rather than `hover:`. Tailwind 4's `hover:` applies only under
     `@media (hover: hover)`, while KERN's hover rule also applies to the `:hover` that sticks after
     a tap.
   - The `!` is needed because kern.css isn't in a cascade layer (`CLAUDE.md` line 400). The input
     already uses `pr-56!` for the same reason.
   - Everything else stays KERN's: size, position, the 48 px hit area, the icon colour, the pointer
     cursor, the icon swap and the accessible name.
   - Other KERN buttons keep their designed hover states, such as the darker blue of "Log in" on
     hover. The report only asks to remove the tint from the toggle.

3. **Record the convention**:
   - **`CLAUDE.md`**, Frontend Development Guidelines: a bullet after the light-only one. It says:
     - KERN's focus ring shows only for keyboard focus, because `index.css` turns it off after
       clicks and taps on every `.kern-btn`;
     - keep that rule;
     - give custom interactive elements `focus-visible:` rings, as `UserMenu` does, never `focus:`.
   - **`docs/ARCHITECTURE.md`**, the KERN key decision (line 126): add the focus rule to the list of
     what `index.css` overrides.
   - **`docs/KERN-DESIGN-SYSTEM.md` §7**, a gotcha:
     - KERN draws the ring of buttons, checkboxes and radios on `:focus`, so it shows after clicks;
     - tertiary buttons tint on hover and press;
     - `hover:` can't override KERN on touch screens;
     - the `index.css` rule and the toggle's override.
   - **`specs/001-servicebw-eudi-middleware/design-notes.md`**:
     - §4 (line 176): the toggle shows no background on hover or press;
     - §10 (line 348): KERN's focus outline is used for keyboard focus only (decided 2026-10-10).

**Checked in a scratch copy** (not in this worktree), with the same Chromium setup, after applying
steps 1 and 2:

| Button | Mouse click or tap | Keyboard (Tab) |
|---|---|---|
| Eye toggle | only the icon changes (details below) | ring, byte-identical crops to before |
| "Log in" | no ring on mouse down or after a failed sign-in | ring, byte-identical crop to before |
| "Back to log in" | no ring while the mouse button is down | ring, byte-identical crop to before |
| Avatar, "Log out" | unchanged: no ring | unchanged ring; "Log out" crop byte-identical |

| Eye toggle state | Before | After |
|---|---|---|
| Rest | no box, no ring | byte-identical crop to before |
| Hover | 8% box | nothing: crop identical to rest, pointer cursor |
| Mouse button down | box and ring | nothing: crop identical to rest |
| Released, then mouse moved away | box, then ring | only the crossed-out eye (both crops identical) |
| Keyboard: Tab, then Space | ring; Space switches the eye | byte-identical crops to before |
| Touch screen, after a tap | box and ring | only the crossed-out eye |
| Forced colors, keyboard focus | `outline: 3px auto`, offset 4px | unchanged |

- The toggle's box (40×40 with a 4 px margin), its icon position and its colour were the same in
  every state.
- A variant using `hover:bg-transparent!` still showed the 8% box after a tap on the touch screen.
  That's why the fix needs the arbitrary variant.
- An earlier local-only variant gave the toggle results byte-identical to these.
- The probe scripts and screenshots were working files in the scratchpad and are gone.

**Alternatives**:

- **The local-only fix from the first version of this assessment**: add
  `[&:focus:not(:focus-visible)]:outline-none!` to the toggle only. The user's decision supersedes
  it, since it leaves the ring on "Log in" and "Back to log in".
- **No `!important`**: copy KERN's two selectors and add `:not(:focus-visible)`, for specificity
  0,5,0. That works, but it's longer and tied to the exact shape of KERN's selectors.
- **A universal `:focus:not(:focus-visible)` rule** for every element.
  - For: it would also cover KERN checkboxes and radios (`kern.css:2543`), which draw the ring on
    click as well.
  - Against: the app doesn't use them yet, so nothing can be checked, and it goes beyond "every
    button". Text inputs would keep their ring either way, because a focused text input always
    matches `:focus-visible`.
- **A plain `<button>` for the toggle**, or keeping focus in the input with
  `onMouseDown={(event) => event.preventDefault()}`. With the global rule in place, both are
  unnecessary.
  - A plain button rebuilds KERN's geometry and icon colour by hand.
  - `preventDefault` changes focus behaviour to solve a styling problem.

**Files likely to change**:

- `frontend/src/index.css`
- `frontend/src/pages/Login/PasswordField.tsx`
- `CLAUDE.md`
- `docs/ARCHITECTURE.md`
- `docs/KERN-DESIGN-SYSTEM.md`
- `specs/001-servicebw-eudi-middleware/design-notes.md`

**Tests to add or update**:

- The frontend has no test runner (`frontend/package.json` has no test script). Adding one is out
  of scope, as it was for `force-light-mode`.
- Instead, `/speckit-bug-test` should drive a real browser (the Playwright MCP, or CDP as here)
  through the tables above.
  - Send real mouse, key and touch events, not `element.click()`.
  - Start each mouse scenario on a fresh page: a button that was keyboard-focused stays
    `:focus-visible` when clicked.
  - Use stubs or the real backend for `/api/auth/me`, `/login` and `/logout`.
- Expected results:
  - On "Log in", "Back to log in" and the eye toggle, mouse down, after the click and after a tap:
    `outline-style` is none.
  - On the same buttons after Tab: a 4px solid #454B6B outline at offset 2px.
  - In forced colors, keyboard focus shows `outline: auto`.
  - The eye toggle shows a transparent background on hover and press.
  - Each click toggles `aria-pressed` and the input's `type`, and swaps the icon between
    `kern-icon--visibility` and `kern-icon--visibility-off`.
  - The avatar and "Log out" behave as before.
  - At rest, `/login`, `/forgot-password` and the signed-in screen look as before. The toggle still
    matches Figma (`I153:7699;151:1094`).
- Run `npm run lint`, `npm run format:check` and `npm run build`. prettier-plugin-tailwindcss may
  reorder the new classes.

## Risks & Considerations

- **Global by design**: every KERN button, now and later (dialog footers, card actions, …), stops
  showing the ring after mouse clicks and taps. That is the user's decision.
  - Keyboard users keep the full ring. That is the standard `:focus-visible` split, and it meets
    SC 2.4.7.
  - Someone who tabbed to a button and then clicks it still sees the ring, because focus didn't
    move. That's normal browser behaviour.
- **The `!important`** also overrides a `focus:outline-*` utility on a `.kern-btn` while the mouse
  has focused it. That's intended: custom rings belong on `focus-visible:`, as the `CLAUDE.md`
  bullet will say.
- **KERN upgrades**:
  - If KERN moves the ring to `:focus-visible`, the rule becomes a harmless leftover.
  - If KERN renames `.kern-btn`, or draws the ring as a `box-shadow` instead, the rings after
    clicks come back without any error. Recheck on every `@kern-ux/native` upgrade.
- **No hover feedback on the toggle**: apart from the pointer cursor, the toggle no longer reacts to
  hover. The report asks for that, but it departs from KERN's tertiary states, so it goes into the
  design notes.
- **Not covered, by decision**:
  - KERN checkboxes and radios (`kern.css:2543`) also draw the ring on click. The app doesn't use
    them yet; decide when Phase 3 adds them.
  - Text inputs keep their ring when clicked, as they should.
- **Already there, unchanged by the fix**:
  - In forced colors, KERN paints the eye white with `forced-color-adjust: none`.
  - On a light high-contrast palette (Chromium's emulation, as captured here), the eye is
    invisible, before and after the fix.
  - That's a KERN issue, for a separate follow-up.
- There's no backend, API, migration, performance or security impact.

## Open Questions

None left. On 2026-10-10 the user decided:

- **Scope**: a global rule for every button, in this same fix.

Defaults kept, because the report doesn't ask otherwise:

- **Keyboard focus** keeps the ring, which WCAG 2.1 AA (SC-009) requires.
- **The avatar's open-state border** (1 px blue on light blue while the menu is open) stays. It's
  the Figma design (design notes §3), not a focus ring. "Log out" itself never showed a ring after a
  click.
