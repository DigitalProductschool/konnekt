# Bug Fix: "Group with other rules" breaks onto two centred lines in the rule's ⋯ menu

- **Slug**: group-option-alignment
- **Fixed**: 2026-10-27
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

The ⋯ menus (rule, group and variant) are now 248 px wide instead of Figma's 220 px, so every fixed
label fits on one line in a 40 px row at KERN 2.8's 16 px. Each row's label is its own
left-aligned span that may break inside a word, so a label that still wraps (e.g. "Reset to" a
long variant name) starts every line at the text column and stays inside the menu. Its icon sits
beside the first line.

Both open questions of the assessment were answered by the user on 2026-10-27, each with the
recommended option:

- **Menu width**: 248 px.
- **Icon in a wrapped row**: beside the first line.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `frontend/src/pages/FormConnectionEditor/RulesStep/RuleMenuItem.tsx` | modified | Label in a `<span className="wrap-anywhere">`. The button now has `text-left` and `items-start` instead of `items-center`. The icon (`kern-icon` span or `<img>`) gets `mt-2`. The doc comment describes the wrap. |
| `frontend/src/pages/FormConnectionEditor/RulesStep/constants.ts` | modified | `ACTION_MENU_WIDTH` 220 → 248; `ACTION_MENU_PLACEMENTS.start` / `.end` `w-220` → `w-248`. The shared doc comment is split so `COPY_POPOVER_WIDTH` keeps its own. |
| `specs/002-connection-rules/design-notes.md` | modified | §9, after "Decision (2026-10-25)": records the 248 px width as a "KERN 2.8 vs Revamp" consequence, with the arithmetic and the wrap behaviour. |
| `.specify/bugs/group-option-alignment/app-rule-menu-fixed.png` | added | Screenshot of the fixed menu (see Local Verification). |

## Diff Highlights

`RuleMenuItem.tsx`:

```tsx
// before
className={`… flex w-full cursor-pointer items-center gap-8 p-8 leading-(…) …`}
…
<span className={`kern-icon kern-icon--small ${icon.kern} …`} />
…
<img src={icon.src} alt="" className="size-20" />
…
{label}

// after
className={`… flex w-full cursor-pointer items-start gap-8 p-8 text-left leading-(…) …`}
…
<span className={`kern-icon kern-icon--small mt-2 ${icon.kern} …`} />
…
<img src={icon.src} alt="" className="mt-2 size-20" />
…
<span className="wrap-anywhere">{label}</span>
```

The `mt-2` is (24 px line − 20 px icon) / 2. A one-line row keeps Figma's geometry: the icon at
y = 10 in a 40 px row, as `items-center` gave it.

`constants.ts`:

```ts
export const ACTION_MENU_WIDTH = 248; // was 220
start: 'absolute top-full left-0 w-248', // was w-220
end: 'absolute top-full right-0 w-248',  // was w-220
```

`placementFrom()` in `ActionMenu.tsx` reads `ACTION_MENU_WIDTH`, so the side the menu opens to
follows the new width with no further change. `w-248` is 248 px: the KERN Tailwind theme sets
`--spacing: 0.0625rem`.

## Tests Added or Updated

- None, as the assessment planned. Vitest runs in Node without a DOM, for pure functions only, and
  this change is layout. The regression check is visual (below, and `/speckit-bug-test`).

## Local Verification

- Commands run (in `frontend/`):
  - `npx prettier --check` on both changed files → pass (Tailwind class order included)
  - `npx eslint` on both changed files → no findings
  - `npm run build` (`tsc -b && vite build`) → pass. Its only warning is about chunk size, and it
    was there before the change.
  - `npm test` → 16 files, 518 tests passed
- Manual check: the real `ActionMenu` mounted on `/login` of the dev server at 1455 × 900 in
  Chromium, as the assessment did, then opened.
  - `document.fonts.check('600 16px "Fira Sans"')` is true.
  - The menu is 248 px wide and opens with `right-0` (`end`), as before.
  - The labels include the three that used to wrap, a one-word long variant name and "Restore rule"
    without an icon.
  - Screenshot: `app-rule-menu-fixed.png`.

  | Row | Height | Lines | Line x (from menu edge) | Right edge of text | Icon x / y | text-align | Font | scrollWidth / clientWidth |
  |---|---|---|---|---|---|---|---|---|
  | Edit rule, Rename, Duplicate, Copy to variant | 40 | 1 | 45 | ≤ 155.8 | 17 / 10 | left | 16px 600 | 230 / 230 |
  | Group with other rules | **40** (was 64) | **1** (was 2) | **45** (was 62.0 / 105.7) | 209.5 | 17 / 10 | **left** (was center) | 16px 600 | 230 / 230 |
  | Remove error message | 40 | 1 | 45 | 211.6 | 17 / 10 | left | 16px 600 | 230 / 230 |
  | Remove from this variant | 40 | 1 | 45 | 228.6 | 17 / 10 | left | 16px 600 | 230 / 230 |
  | Reset to Landesverwaltungsstandardvariante | 88 | 3 | 45 / 45 / 45 | 228 (inside 231) | 17 / 10 (first line) | left | 16px 600 | 230 / 230 (was 304 / 202) |
  | Restore rule (no icon) | 40 | 1 | 17 | 106.4 | – | left | 16px 600 | 230 / 230 |

  - The 16 px font against Figma's 14 px is "KERN 2.8 vs Revamp" (design-notes §9), not a mismatch.
    So is the 248 px width, now recorded there.
- Not run: the placement at 320 px wide and at 200 % zoom (the menus switch to `full` across the
  card). The `full` class has no width, and `popupPlacement()` is unchanged, so it should behave as
  before, 28 px sooner. The assessment leaves this check to `/speckit-bug-test`.
- `git diff` couldn't be used: the worktree's `.git` points to a path that doesn't exist on this
  machine. The changes above are listed by hand.

## Deviations from Assessment

None. The preferred remediation was applied as proposed, including the optional icon alignment
(step 1), with the two open questions answered by the user. One small addition: the shared doc
comment over `ACTION_MENU_WIDTH` and `COPY_POPOVER_WIDTH` was split in two, so that the popover's
300 px doesn't sit under the menu's new explanation.

## Follow-ups

- `/speckit-bug-test slug=group-option-alignment`, in the real Rules step, with a signed-in user
  and the backend running:
  - the rule menu, the inherited rule's menu and the group menu with an error message;
  - the variant tab menu (`BranchMenu`), which only gets wider;
  - 320 px wide and 200 % zoom.
- The team should know that the ⋯ menus now differ from Figma's frame width on purpose
  (design-notes §9). If Figma is updated to KERN 2.8 values, 248 px is the width to draw.
- Unchanged, as the assessment notes: Figma calls the item "Remove from variant", with a
  minus-circle icon, where the app says "Remove from this variant" with the bin icon
  (design-notes §4).
