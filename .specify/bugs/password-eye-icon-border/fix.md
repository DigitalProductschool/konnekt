# Bug Fix: Buttons keep a focus ring after a click, and the eye toggle shows a hover box

- **Slug**: password-eye-icon-border
- **Fixed**: 2026-10-10
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

A global, unlayered rule in `index.css` now shows KERN's button focus ring for keyboard focus only.
A click or a tap no longer leaves the ring on "Log in", "Back to log in", the eye toggle or any
later KERN button. The eye toggle also drops KERN's tertiary tint on hover and press, so hovering
or clicking it changes only the icon. The convention is recorded in `CLAUDE.md`,
`docs/ARCHITECTURE.md`, `docs/KERN-DESIGN-SYSTEM.md` and the design notes.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `frontend/src/index.css` | modified | Adds `.kern-btn:focus:not(:focus-visible) { outline: none !important; }` after the `:root` block. A comment says why the rule exists and why it needs `!important`. |
| `frontend/src/pages/Login/PasswordField.tsx` | modified | Adds `[&:is(:hover,:active)]:bg-transparent!` to the toggle. A comment says why it isn't `hover:`. |
| `CLAUDE.md` | modified | Frontend Development Guidelines: a new bullet after the light-only one. Focus rings show for keyboard focus only; keep the rule; give your own elements `focus-visible:` rings, never `focus:` ones. |
| `docs/ARCHITECTURE.md` | modified | The KERN key decision now lists the focus rule among `index.css`'s overrides. |
| `docs/KERN-DESIGN-SYSTEM.md` | modified | §7, two new gotchas. 1: KERN draws the button ring on `:focus`; the rule above fixes it, and needs `!important` because KERN's selector is 0,4,0; checkboxes and radios do the same. 2: the tertiary tint on hover and press, and why `hover:` can't override it on touch screens. |
| `specs/001-servicebw-eudi-middleware/design-notes.md` | modified | §4: the toggle's decision. §10: KERN's focus outline is for keyboard focus only. Both dated 2026-10-10. |

## Diff Highlights

```css
/*
 * KERN draws its button focus ring on any :focus, so a click or a tap leaves the ring on the
 * button until focus moves on. Like the browser's own ring, show it for keyboard focus only.
 * !important, because KERN's selector is more specific than this one.
 */
.kern-btn:focus:not(:focus-visible) {
  outline: none !important;
}
```

```tsx
// Only the icon changes: no KERN tint on hover or press. Not `hover:`, which Tailwind
// limits to devices that can hover, while a tap leaves :hover on touch screens
className="kern-btn kern-btn--tertiary kern-btn--small [&:is(:hover,:active)]:bg-transparent!"
```

## Tests Added or Updated

- None, as the assessment planned. The frontend has no test runner, and adding one is out of scope
  for this fix.
- The browser checks below take the place of tests. `/speckit-bug-test` should repeat them.

## Local Verification

### Commands run

- **Dependencies**: `frontend/node_modules` was copied from the sibling worktree
  `sk-proto-1-phase2`, whose `package-lock.json` is byte-identical, so nothing came from the
  network.
  - `npm ls --depth=0` → exit 0.
  - All 25 top-level packages are at their locked versions, among them `@kern-ux/native` 2.8.2,
    `tailwindcss` 4.3.3 and `vite` 8.2.2.
- `npm run lint` → passes.
- `npm run format:check` → "All matched files use Prettier code style!"
- `npm run build` (`tsc -b && vite build`) → passes. The built CSS has:
  - the global rule: `.kern-btn:focus:not(:focus-visible){outline:none!important}`;
  - the toggle's utility:
    `.\[\&\:is\(\:hover\,\:active\)\]\:bg-transparent\!:is(:hover,:active){background-color:#0000!important}`;
  - KERN's own focus rule, unchanged.
- `git diff --check` → clean. One added line is longer than 100 characters: the toggle's
  `className` string (104). Prettier keeps string literals whole, and `format:check` passes.

### Browser checks

Setup:

- Headless Chromium 154, driven over CDP at 1455×900 (scale 2), with real mouse, key and touch
  events.
- The backend was stubbed:
  - `/api/auth/me` answered 401, or a signed-in user;
  - `/api/auth/login` answered 401;
  - `/api/auth/logout` answered 200.
- The checks ran against three builds:
  - the worktree's dev server;
  - the production build (`vite preview`);
  - for comparison, the original code (`HEAD`) in a scratch copy.

Every button. The dev server and the production build gave identical results.

| Button | Mouse click or tap, before | Mouse click or tap, after | Keyboard (Tab) |
|---|---|---|---|
| Eye toggle | box on hover; ring from mouse down until focus moves | only the icon changes | ring, byte-identical crops to before |
| "Log in" | ring from mouse down; stays after a failed sign-in | none | ring, byte-identical crop to before |
| "Back to log in" | ring while the mouse button is down | none | ring, byte-identical crop to before |
| Avatar, "Log out" | none | none | ring; "Log out" crop byte-identical to before |
| "Forgot password?" (a KERN link) | none | none | not probed |

The eye toggle after the fix:

| State | Result |
|---|---|
| Rest | byte-identical crop to before (still matches Figma) |
| Hover, mouse button down | crops identical to rest. Background transparent, no outline, pointer cursor |
| Click | the icon swaps (`kern-icon--visibility` ↔ `-off`). `aria-pressed` and the input's `type` toggle. Nothing else changes |
| Mouse moved away after the click | no ring (before: 4px solid #454B6B ring) |
| Tab, then Space | ring kept: 4px solid #454B6B, offset 2px |
| Space held (`:active` without hover) | transparent (original: #2044AA at 16%); ring kept |
| Touch screen, after a tap | transparent, no ring (original: 8% box and ring) |
| Forced colors, keyboard focus | `outline: 3px auto`, offset 4px, unchanged |

Comparisons:

- **Prototype**: the worktree's crops are byte-identical to those of the scratch prototype the
  assessment checked (8 toggle states, 6 button crops, the touch tap).
- **Production**: the production build's crops are byte-identical to the dev server's (7 toggle
  states, 6 button crops).
- **At rest**: full-viewport screenshots (2910×1800 px) of `/login`, `/forgot-password` and the
  signed-in screen are byte-identical between the original and the fixed code.
- **Geometry**: the toggle's box (40×40 with a 4 px margin), its 48 px hit area, the icon's position
  and the icon's colour (#2044AA) are the same in every state.

The probe scripts and screenshots were working files in the scratchpad. The numbers above come from
those runs.

## Deviations from Assessment

The code follows the preferred remediation exactly, in the six files listed. Small differences:

- **Comments**: the `index.css` comment adds a line on why the rule needs `!important`. The
  toggle's comment also says why it isn't `hover:`, so nobody "simplifies" it.
- **One extra check**: the assessment described the 16% `:active` tint during a Space press but
  didn't run it. It now ran: there before the fix, gone after.

## Follow-ups

- Run `/speckit-bug-test slug=password-eye-icon-border`. If possible, sign in and out once against
  the real backend, because these checks stubbed the API.
- A quick look in Firefox on Windows or Linux would cover the other browser that focuses buttons on
  click. Only Chromium was run.
- KERN checkboxes and radios draw their ring on `:focus` too (`kern.css:2543`). Decide when Phase 3
  adds them; `docs/KERN-DESIGN-SYSTEM.md` §7 notes it.
- On every `@kern-ux/native` upgrade, click a KERN button and check that no ring stays. The rule
  depends on the `.kern-btn` class and on KERN drawing the ring as an `outline`.
- Already there, unchanged by this fix: in forced colors on a light palette, KERN paints the eye
  white, so it's invisible. That's a KERN issue, for a separate follow-up.
- `frontend/node_modules/` and `frontend/dist/` stay in place for `/speckit-bug-test`. Both are
  gitignored.
- `git` doesn't work here as is: the worktree's `.git` file points to another machine's path.
  Read-only commands work with `GIT_DIR=/home/debian/batch27-faro/worktrees/border-password-eye-icon`
  and `GIT_WORK_TREE=/home/debian/batch27-faro/border-password-eye-icon`.
- Nothing is committed.
