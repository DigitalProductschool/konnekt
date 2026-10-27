# Bug Verification: a nested rule's ⋯ menu opens 18 px wide when it spans the rules card

- **Slug**: rule-menu-full-placement
- **Tested**: 2026-10-27
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: verified

## Summary

The bug no longer reproduces. At 320 px, the ⋯ menus of a rule in a group and of a rule in a
sub-group now span the rules card at x 33–272 (239 px). Their `offsetParent` is the rules card
`SECTION`, the rows are 40 px and the labels start 45 px from the menu's edge, exactly as the
assessment's DOM experiment predicted. It worked for framed and unframed rows, in "Standard" and
in a based variant. Across the 300–368 px sweep no menu opened narrower than the card. "Copy to
variant", the AND/OR connector menu and the info tooltip behave as before. No regressions were
found.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Reproduction (post-fix), 320 px | Chromium (Playwright MCP), dev server 5173, `/api/*` mocked with `page.route` as in the assessment. Details → "Edit rules" → open the ⋯ of Rule 01 / 03 / 05 and Group 01 / 02, in "Standard" and "Students" | pass | Rule 03 / Rule 05: x 33–272, 239 px, `offsetParent` the rules card (273 px), rows 40 px, label x 45. Before: 18 px, `offsetParent` the 32 px wrapper, rows 160–448 px |
| Framed rows (problem flag) | Same, with a mock that requests no documents, so every row is framed | pass | ⋯ at 263 / 247 / 231. Rule 01 now opens `full` too: 239 px from the card |
| Based variant, `changed` rules | "Students": Rule 03 (in a group) and Rule 05 (in a sub-group) marked `changed` | pass | Both 239 px from the card. See Residual Risks for the 64 px row |
| 360 px and 728 px (200 % zoom of a 1455 px window) | Viewport 360 × 800 and 728 × 800, all 8 ⋯ menus in both variants | pass | All open beside the ⋯, 248 px, rows 40 px, no horizontal scroll |
| Group and sub-group menus, 320 px | Group 01 / Group 02 ⋯ | pass | Unchanged: 33–272, 239 px |
| Sweep 300–368 px, step 4 | All 8 ⋯ menus × 2 variants at each width | pass | Minimum width = card − 32 (219 px at 300, 239 at 320). Every side-placed menu is 248 px. No horizontal scroll at any width |
| "Copy to variant", 320 px | Rule 03 ⋯ → Copy to variant | pass | Popover x 33, 239 px, from the card, wrapper `static`. A click on "Students" ticks it. Cancel and Escape close it, and the focus returns to the ⋯ |
| "Copy to variant", 1455 px | Same | pass | Opens beside the ⋯ at 300 px, wrapper `relative` (`offsetParent` the 32 px wrapper). Same ticking, Cancel, Escape and focus results. After closing, both wrappers are `static` |
| AND/OR connector menu | "AND, switch Group 01…" at 320 and 1455 px, opened and closed with Escape | pass | Wrapper `static` while closed. It opens (221 px at 320, 282 px at 1455) and closes, with no horizontal scroll |
| Info tooltip | Connection step, the name field's info icon, hovered and left, at 320 and 1455 px | pass | Wrapper `static` while closed. At 320 px it is `full` (16–289), at 1455 px it is beside the icon, 320 px, wrapper `relative`. It hides on leave |
| New / updated tests | `npx vitest run src/utils/popupPlacement.test.ts` | pass | 8 passed |
| Regression suite | `npm test` | pass | 16 files, 520 tests passed |
| Lint / type-check / format | `npm run lint`, `npx tsc -b`, `npx prettier --check` on the two changed files | pass | All clean |
| Create wizard (`/form-connections/new`) | — | not-run | It renders the same `RulesStep` → `TreeItem` → `RuleListItem`. Only "Edit rules" was exercised |
| Test fails before the fix | — | not-run | It wasn't run against the old helper, because that would mean reverting source. By reading: the old helper returned `'relative'` for `null`, and the new case expects `'static'` |

## Output Excerpts

```
 Test Files  16 passed (16)
      Tests  520 passed (520)
```

The 320 px measurement of the ⋯ menus (unframed rows, "Standard"):

```
Rule 01  ⋯ 272  x 24  w 248  offsetParent DIV.relative w32 (end)  rows 40
Rule 03  ⋯ 256  x 33  w 239  offsetParent SECTION … w273 (full)   rows 40  label x 45
Rule 05  ⋯ 240  x 33  w 239  offsetParent SECTION … w273 (full)   rows 40  label x 45
Group 01 ⋯ 256  x 33  w 239  offsetParent SECTION … w273 (full)   rows 40
Group 02 ⋯ 240  x 33  w 239  offsetParent SECTION … w273 (full)   rows 40
```

The sweep (excerpt):

```
300: min 219 full=16 side=0  maxRow=64 hscroll=false
320: min 239 full=12 side=4  maxRow=64 hscroll=false
328: min 247 full=7  side=9  maxRow=40 hscroll=false
352: min 248 full=0  side=16 maxRow=40 hscroll=false
```

Screenshots in this folder:

- `test-320-rule-in-group.png` and `test-320-rule-in-sub-group.png`: taken with the first mock,
  so the rows have red problem frames.
- `test-320-copy-popover.png` and `test-1455-copy-popover.png`.
- `test-320-info-tooltip.png` and `test-1455-info-tooltip.png`.

## Residual Risks

- **"Remove from this variant" wraps to two lines (64 px row) at widths ≤ 324 px.** This is in a
  based variant's rule and group menus when they span a card of 243 px or less. Group menus show
  it too, and the fix doesn't touch them, so the fix didn't cause it. It does go against the
  one-line labels of `10ebe8b`, and it could be a follow-up if labels must never wrap.
- The AND/OR connector menu's rows are 64 / 88 px at 320 px. This behaviour is unchanged by the
  fix, which affects only the closed state. It wasn't compared with the pre-fix build.
- Tested in Chromium on Linux only, against a mocked API. There was no backend, and nothing was
  saved. 200 % zoom was approximated by a 728 px viewport. Overlay-scrollbar phones were not
  tested.
- Not exercised: the case of reopening the ⋯ while "Copy to variant" is open beside it and then
  resizing. The assessment's Risks call it unreachable without a resize.
- Separate, already noted in the assessment: a `changed` row overflows in a narrow sub-group
  ("Changed here" covers the name).

## Recommendation

Close the bug: it is verified end-to-end. The original reproduction ("Edit rules", 320 px, rule
in a group and in a sub-group) now gives a 239 px menu spanning the card, and the full
verification list from the assessment passed. The two-line "Remove from this variant" at
≤ 324 px could get its own slug if labels must never wrap.
