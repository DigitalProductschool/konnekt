# Bug Fix: "Add variant"'s hover tint covers only part of its ⓘ

- **Slug**: add-variant-hover-tooltip
- **Fixed**: 2026-11-18
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

The button's own box now reaches 8px past the ⓘ. The button's right padding is 24px instead of
KERN's 8px, and the pull towards the ⓘ is 28px instead of 12px. KERN's hover tint, the pressed
tint in `index.css` and the disabled overrides are all drawn on that box, so they now cover the
whole ⓘ. The resting layout is unchanged: the ⓘ still starts 4px after the label.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `frontend/src/pages/FormConnectionEditor/RulesStep/constants.ts` | modified | `ADD_VARIANT_CLASSES`: `'flex items-center [&>.kern-btn]:-mr-12!'` → `'flex items-center pr-8 [&>.kern-btn]:-mr-28! [&>.kern-btn]:pr-24!'`; the comment says why |
| `specs/008-kern-revamp-redesign/design-notes.md` | modified | U43 `6168:7011` / `6168:7012`–`7013` rows: a note on the new padding and pull, plus a new "hover / pressed · tint's extent" row recorded as a `decision` |
| `.specify/bugs/add-variant-hover-tooltip/fix-hover.png` | added | screenshot of the hovered group after the fix (mock, see below) |

## Diff Highlights

```ts
// before
export const ADD_VARIANT_CLASSES = 'flex items-center [&>.kern-btn]:-mr-12!';
// after
export const ADD_VARIANT_CLASSES =
  'flex items-center pr-8 [&>.kern-btn]:-mr-28! [&>.kern-btn]:pr-24!';
```

The `!` is needed because KERN's `.kern-btn--small { padding: 0 8px }` beats Tailwind's
utilities. The group's `pr-8` keeps the button's last 8px, which overflow the ⓘ, inside the
group's box and the row's layout.

## Tests Added or Updated

- No unit test: jsdom does no layout, so it can't see this bug (as the assessment says). The fix
  was measured in Chromium instead (below). `/speckit-bug-test` should repeat those measurements
  in the running app.

## Local Verification

- `npm ci --offline` (from the npm cache; the checkout had no `node_modules`).
- Commands run from the root:
  - `npm run lint` → clean (all workspaces)
  - `npm test` → 3 suites, 2675 + 1992 + 513 tests passed (`api-types` has no test script)
  - `npm run build` → built
  - `npx prettier --check` on `constants.ts` → clean
- **Browser measurements**: Chromium (Playwright), on a static mock of `BranchTabs`'s tab row with
  the exact class names, served with the frontend's **built** CSS (KERN 2.8.2 + `index.css` +
  Tailwind, Fira Sans loaded). The CSS was built once before and once after the change. This is
  not the running app: there was no backend or seeded data in this checkout.

  | 1440px | before | after |
  |---|---|---|
  | ⓘ's left edge after the label's text | 4px | 4px (ⓘ at the same x, 204.9–224.9) |
  | button's right edge after the label's text | 16px | 32px |
  | button's edge after the ⓘ | −8px (8px of the ⓘ outside) | +8px |
  | tab row height | 49px | 49px |
  | button padding / margin-right | `0 8px` / −12px | `0 24px 0 8px` / −28px |
  | `elementFromPoint` across the ⓘ (every 2px) | the ⓘ's icon | the ⓘ's icon; the button on the 8px after it |
  | hovered: button background | — | `oklch(0.52463 0.23766 264.041 / 0.08)` (8 % tint) over the whole box |
  | pressed: button background | — | `color(srgb 0.858 0.894 0.991)` (the `index.css` 16 % tint over white) |
  | pointer on the ⓘ | — | ⓘ `:hover`, button not hovered (no tint) |
  | pointer on the 8px after the ⓘ | — | button `:hover`, tinted |

  At 320px (one line, and wrapped onto a second line with three tabs): the row is 49px / 81px
  high both before and after. `scrollWidth` equals `clientWidth` (no overflow), the ⓘ stays 4px
  after the label, and the button ends 8px after the ⓘ.

- **Why the ⓘ stays clickable**: KERN's `.kern-btn` is `position: relative`, and the ⓘ's wrapper is
  static while its tooltip is closed, so the button would normally paint over the ⓘ. KERN's
  `kern-icon--info` is a CSS `mask`, though, and a mask gives the icon its own stacking context.
  The icon therefore paints after the button (it comes later in the tree) and wins the hit test.
  Measured above; the new comment on `ADD_VARIANT_CLASSES` records it.
- Screenshots (hover, pressed, pointer on the ⓘ, focus ring, 320px before/after):
  `/tmp/claude-1000/-home-debian-batch27-faro-bug-fix/3a8e3eb4-c4b7-4543-96db-cc96f04c6b6f/scratchpad/shots/`.
  The hover one is also kept as `fix-hover.png` in this directory.

## Deviations from Assessment

- None in the remediation itself: the preferred fix was applied with the assessment's numbers
  (`pr-24!`, `-mr-28!`, group `pr-8`).
- The assessment's three open questions were not asked during the fix, because the verdict is
  `valid` and this command doesn't require it. They were settled with the assessment's own
  recommendations, which the user confirmed afterwards (2026-11-18):
  1. The tint disappears while the pointer is on the ⓘ (the ⓘ is hovered, not the button).
  2. The tint ends 8px past the ⓘ.
  3. The keyboard focus ring of "+ Add variant" now encloses the ⓘ too (confirmed in the
     browser). This is the risk the assessment flagged, accepted by the user.
- One scope expansion: `fix-hover.png` was added to this bug directory as evidence.

## Follow-ups

- `/speckit-bug-test`: repeat the measurements in the running app on the Rules step at 1440px
  and 320px. Also check that the ⓘ's tooltip opens on hover, focus and tap, and that the label
  stays on the tab labels' line (design-notes U43 `6168:7011`).
