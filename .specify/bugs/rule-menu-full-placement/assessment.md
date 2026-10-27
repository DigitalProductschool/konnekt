# Bug Assessment: a nested rule's ⋯ menu opens 18 px wide when it spans the rules card

- **Slug**: rule-menu-full-placement
- **Created**: 2026-10-27
- **Source**: pasted text. It was found while testing `group-option-alignment`
  (`../group-option-alignment/test.md`, "Residual Risks", `test-320-nested-rule-menu.png`). No
  URL was given, so nothing was fetched.
- **Verdict**: valid. I reproduced it in Chromium on "Edit rules" from a connection's details and
  measured it. With the suspected wrapper made non-positioned in the live DOM, the menu came out
  right. Screenshots are in this folder (see Reproduction).
- **Severity**: medium
  - The menu becomes unusable. It is 18 px wide and up to 1,639 px tall, with a few letters per
    line. Every rule action is in this menu: edit, rename, duplicate, copy, group and delete.
  - It hits the 320 px reflow case (WCAG 1.4.10) for a rule in a group or sub-group. On a real
    320 px phone (overlay scrollbars) it probably hits only rules in a sub-group (estimate, see
    Symptom).
  - The bug is old. It has existed since commit `24650cc` (T073–T077), which added the wrapper and
    `popupWrapperClass`. Raising `ACTION_MENU_WIDTH` from 220 to 248 px in `10ebe8b` exposed it
    28 px sooner, so it now reaches the rule-in-a-group case at 320 px.
  - No data is at risk. Widening the window or zooming out avoids it.

## Report (verbatim or summarized)

> On a narrow screen, the ⋯ menu of a rule inside a group opens only 18 px wide: each label breaks
> into one or two letters per line, and rows grow up to 928 px tall. The group's ⋯ menu and a
> top-level rule's ⋯ menu are fine at the same width.

The report's reproduction was in Chromium with a 320 px window (`clientWidth` 305), in the create
wizard. The ⋯ of a rule in a group ends at x = 248, so `end` no longer fits (248 − 248 = 0 < 16)
and `placementFrom()` returns `full`. The menu then gets `absolute inset-x-16`, but its
containing block is a 32 px `DIV.relative`. The report suspected the wrapper at
`RuleListItem.tsx:81`. The expected result is a menu across the rules card less 16 px on each
side, as the group menu gets (239 px at 320 px), with 40 px rows, labels at the text column and
no horizontal scroll. The 248 px width stays.

The report asks three questions, answered below: whether the wrapper is the whole cause and how to
fix it without breaking "Copy to variant", whether sub-groups and "Edit rules" are affected, and
whether the bug predates the 248 px change.

## Symptom

When neither side has room for the ⋯ menu of a **rule** (`placementFrom()` returns `full`), the
menu is positioned from a 32 px box instead of the rules card. Its width works out to the 18 px of
its own padding and border (8 + 8 + 1 + 1). Each label then breaks letter by letter
(`wrap-anywhere`) into rows 160–448 px tall. Group menus use the same `full` placement and span the
card correctly.

**What triggers `full`**: `end` fits only while the ⋯'s right edge is at x ≥ menu width + 16
(264 for 248 px, 236 for 220 px). `start` never fits on a narrow window. Where the ⋯ sits depends
on the rule's depth, and on whether its row is *framed*. A framed row has a problem flag or a
variant tint (`changed`, `added`), which adds `px-8` in `RuleRow`. I swept window widths in steps
of 4 px. In this run the page's layout box was 15 px narrower than the viewport (`html`'s
`scrollbar-gutter: stable`).

| Rule whose ⋯ is opened | ⋯ right edge at window W | `full`, so broken, now (248 px) | `full` before `10ebe8b` (220 px) |
|---|---|---|---|
| Top level | W − 48 | W < 312 | W < 284 (computed) |
| Top level, framed | W − 56 | W < 320 (computed) | W < 292 (computed) |
| In a group | W − 64 | **W < 328**, so 320 px is broken | W < 300 |
| In a group, framed (changed in a variant) | W − 72 (stops at 240.5 below 316, row overflow) | W < 336 | never in 300–368 |
| In a sub-group | W − 80 | **W < 344** | **W < 316** |
| In a sub-group, framed (changed in a variant) | stops at 259.5 below 348 (row overflow, see Risks) | W < 352 | never in 300–368 |

At **360 px and at 200 % zoom (728 px)** every rule menu opens `end`, so neither is affected.

The report measured the ⋯ of a rule in a group at x = 248 with a 320 px window. This run measured
256 for an unframed one and 248 for a framed one. The rows' horizontal geometry is the same in the
create and edit wizards, so the difference most likely comes from the environment (window
scrollbar) or a framed row. The cause and the fix don't depend on it.

**Estimate, not measured**: on a phone with overlay scrollbars nothing reserves the 15 px gutter,
so each ⋯ sits about 15 px further right. At 320 px, a rule in a group would then open `end`
(about 271), while a rule in a sub-group would still open `full` and break (about 255).

## Reproduction

I set this up without a backend. Playwright (`page.route`) answered `/api/*` on the running dev
server (5173) with the `{data}` envelope:

- `/auth/me` returned a user.
- `/form-connections/fc-1` returned a connection with variants "Standard" and "Students" (based
  on it). Each has Rule 01, Rule 02 and Group 01 = {Rule 03, Rule 04, Group 02 = {Rule 05,
  Rule 06}}. In "Students", Rule 03 and Rule 05 are marked `changed`.
- `/document-types` and `/option-sets` returned `[]`.

No database was used, and nothing was saved.

1. Open `/form-connections/fc-1` (the details) and choose **Edit rules**. This opens
   `/form-connections/fc-1/edit` at the Rules step.
2. Set the viewport to 320 × 800.
3. Open the ⋯ of Rule 03 (in a group) or Rule 05 (in a sub-group).

Measured at 320 px with the current code:

| ⋯ of | ⋯ right | Placement | Menu x / width | Containing block (`offsetParent`) | Row heights |
|---|---|---|---|---|---|
| Rule 01 (top level) | 272 | end | 24–272 / 248 | `ActionMenu`'s wrapper, `relative`, 32 px | 40 × 6 |
| Group 01 | 256 | full | 33–272 / 239 | rules card `SECTION.relative`, 273 px | 40 × 4 |
| **Rule 03** (in Group 01) | 256 | full | **240–258 / 18** | **`RuleListItem`'s wrapper, `relative`, 32 px** | 208, 160, 208, 328, 448, 256 (menu 1,639 px tall) |
| Group 02 (sub-group) | 240 | full | 33–272 / 239 | rules card | 40 × 4 |
| **Rule 05** (in Group 02) | 240 | full | **224–242 / 18** | **`RuleListItem`'s wrapper** | 208, 160, 208, 328, 256 (1,189 px) |

Screenshot of the bug: `assess-320-rule-in-group.png`. The create wizard wasn't rerun here. The
original report reproduced it there (`../group-option-alignment/test-320-nested-rule-menu.png`),
and it renders the same `RulesStep` → `TreeItem` → `RuleListItem`.

## Suspected Code Paths

- `frontend/src/pages/FormConnectionEditor/RulesStep/RuleListItem.tsx:81`:
  `<div ref={actionsRef} className={popupWrapperClass(copying ? copyPlacement : null)}>`. While
  "Copy to variant" is closed this passes `null`, and `popupWrapperClass(null)` is `'relative'`.
  So the wrapper around the ⋯ is positioned whenever the copy popover isn't open in `full`.
- `frontend/src/utils/popupPlacement.ts:20`, `popupWrapperClass()`. It returns `'static'` for
  `full` and `'relative'` for everything else, `null` (closed) included. Its doc comment (lines
  6–13) assumes that the box around the popup's own wrapper is the rules card or the scrolling
  area. A second wrapper around it breaks that assumption.
- `frontend/src/pages/FormConnectionEditor/RulesStep/ActionMenu.tsx:77`. It makes its own wrapper
  `static` for `full`, so the menu's `absolute inset-x-16` (`ACTION_MENU_PLACEMENTS.full`,
  `RulesStep/constants.ts:33`) is positioned from the next positioned ancestor. That ancestor is
  the 32 px `RuleListItem` wrapper.
- `frontend/src/pages/FormConnectionEditor/RulesStep/GroupListItem.tsx:85` (and `GroupMenu`) put
  `ActionMenu` straight into `GroupHeader`, with no positioned box in between. That is why group
  menus work.
- Between the `RuleListItem` wrapper and the rules card (`RulesStep/index.tsx:216`), nothing else
  is positioned. That covers `RuleRow`, `TreeItem`, `GroupFrame` ("Nothing in it is positioned")
  and `GroupHeader`. The only other users of `popupWrapperClass()` are `ActionMenu`, `Connector`
  and `InfoTooltip`, and none of them is nested inside another popup's wrapper.
- `frontend/src/pages/FormConnectionDetail/SummaryItem.tsx:22`. The details show `RuleRow` and
  `GroupFrame` without `actions`, so the details page itself has no ⋯ menus. "Edit rules" leads
  to `FormConnectionEditPage` → `FormConnectionEditorPage` → the same `RulesStep`. The bug is
  there, as reproduced above, and in both create routes (`/form-connections/new`, `/get-started`).

## Root Cause Hypothesis

**Confidence: high.** `RuleListItem` nests the ⋯ menu's wrapper inside a second popup wrapper,
the one "Copy to variant" anchors on. That outer wrapper is `relative` whenever the popover isn't
open in `full`, because `popupWrapperClass(null)` returns `'relative'`. When the ⋯ menu falls back
to `full`, `ActionMenu` makes its own wrapper `static` as designed. The nearest positioned
ancestor is then the 32 px outer wrapper, not the rules card, and `inset-x-16` leaves the menu its
minimum 18 px.

**The wrapper is the whole cause.** I cleared only that wrapper's class in the live DOM. Without
it, the ⋯ menus of Rule 03 and Rule 05 at 320 px spanned the card at x 33–272 (239 px), with
`offsetParent` the rules card `SECTION`. Every row was 40 px, every label started at x = 45 from
the menu's edge, and the menu sat 4 px below its ⋯. This matches the group menu exactly
(`assess-320-rule-in-group-static-wrapper.png`, `assess-320-rule-in-sub-group-static-wrapper.png`).

## Proposed Remediation

**What the "Copy to variant" popover needs from the wrapper.** `actionsRef` and the wrapper do
three jobs:

1. They measure the popover's placement (`getBoundingClientRect()`, which doesn't depend on
   `position`).
2. They give the focus back to the ⋯ (`querySelector`).
3. They are `CopyPopover`'s `parentElement`, which its outside-pointer and blur checks use
   (`CopyPopover.tsx:45`, `:66`).

None of these needs the wrapper to be positioned, but 1 and 3 need the wrapper to **stay in the
DOM**. Only the popover's own `start` / `end` placements (`COPY_POPOVER_PLACEMENTS`,
`absolute … left-0 / right-0`) need it positioned, and only while the popover is open. The ⋯
menu's `start` / `end` are positioned from `ActionMenu`'s own wrapper, so they never need the
outer one.

**Preferred: a wrapper is positioned only while its popup is open beside its control.** In
`utils/popupPlacement.ts`, make `popupWrapperClass()` return `'relative'` for `start` and `end`
only, and `'static'` for `full` and for `null` (closed). Then:

- `RuleListItem`'s existing call, `popupWrapperClass(copying ? copyPlacement : null)`, gives
  `static` whenever the copy popover is closed. The ⋯ menu's `full` then reaches the rules card,
  and `RuleListItem.tsx` doesn't change.
- While the popover is open, the wrapper is `relative` for its `start` / `end` and `static` for
  its `full`, exactly as today. The popover's placement doesn't change.
- `ActionMenu`, `Connector` and `InfoTooltip` change only while closed. Then they show no
  positioned content: `ActionMenu` and `Connector` don't render their menu, and `InfoTooltip`'s
  bubble is `hidden`. So nothing visible changes for them.
- The rule now holds wherever popup wrappers end up nested, and a unit test covers it, which
  matters because Vitest has no DOM for a layout test.
- Update the two doc comments in `popupPlacement.ts` (the `PopupPlacement` one and
  `popupWrapperClass`'s) to say that a wrapper is a containing block only while its popup is open
  beside its control, so that one popup's wrapper around another never catches that popup's
  `full`.

Expected result at 320 px: the menus of Rule 03 and Rule 05 at x 33–272 (239 px), rows 40 px,
labels at x = 45, as the experiment above showed.

**Alternatives**:

- **Local only.** In `RuleListItem.tsx:81`, use
  `className={copying ? popupWrapperClass(copyPlacement) : undefined}` and leave the helper
  alone. The change is the same for this bug, and the blast radius is the smallest possible. But
  the shared helper keeps its trap (`null` → `relative`) for the next nested wrapper, and no unit
  test can lock the fix in.
- **Lift the ⋯ menu's placement.** Add an `onPlacementChange` prop to `ActionMenu` → `RuleMenu`,
  keep the placement in `RuleListItem`, and use
  `popupWrapperClass(copying ? copyPlacement : menuPlacement)`. This also covers the case where
  the ⋯ is reopened while the popover is open beside it (see Risks), but it adds a prop chain for
  a case that only a resize between the two openings produces. Not recommended.
- **Not recommended:** dropping the outer wrapper, or moving `CopyPopover` into `ActionMenu`'s
  wrapper. That breaks the `parentElement` containment checks (2, 3 above) and ties the generic
  `ActionMenu` to one caller.

**Files likely to change**:

- `frontend/src/utils/popupPlacement.ts` (`popupWrapperClass`, two doc comments)
- `frontend/src/utils/popupPlacement.test.ts` (the `popupWrapperClass` case)

**Tests to add or update**:

- `popupPlacement.test.ts`, `describe('popupWrapperClass')`: expect `'static'` for `null`, and
  `'relative'` for `'start'` and `'end'`. Name the case after the reason: a closed popup's
  wrapper doesn't capture a popup inside it. This case fails before the fix, because it expects
  `'relative'` for `null` today.
- No component test, since Vitest runs in Node without a DOM. The layout is checked by
  `/speckit-bug-test`, as below.

**Verification for `/speckit-bug-test`** (the report's list, with what this assessment adds).
Measure x, width, `offsetParent`, row heights, label x and horizontal scroll at each step:

1. The ⋯ menus of a top-level rule, a rule in a group and a rule in a sub-group at **320 px**,
   **360 px** and **200 % zoom (728 px)**. At 320 px, every rule menu that opens `full` should
   span the card (239 px), with rows of 40 px. At 360 and 728 px they open `end` at 248 px, as
   today.
2. The same at 320 px in a based variant, for a rule `changed` in a group and in a sub-group
   (framed rows sit 8 px further left).
3. The group and sub-group menus at 320 px, unchanged at 239 px.
4. "Copy to variant" at 320 px from a rule in a group (`full`, 239 px, wrapper `static`). Then on
   a wide window (1455 px), where it opens `end` at 300 px, so the wrapper must be `relative`.
   Repeat the popover's checks there: a click on a variant's name ticks it, Cancel and Escape
   close it, and the focus returns to the ⋯.
5. An AND/OR connector menu and an info tooltip, opened and closed once, to confirm that the
   helper change doesn't affect them.
6. A sweep from 300 to 368 px in steps of 4 px. No rule menu may open narrower than the card.

The API mock above lets this run without a backend. The previous test used a backend on port 3000
with a scratch database instead.

## Risks & Considerations

- **Shared helper.** `popupWrapperClass()` also serves `ActionMenu`, `Connector` and
  `InfoTooltip`. For them only the closed state changes, and closed they render no positioned
  content. A positioned box paints after static ones, so the closed ⋯, connector pill or info
  icon could move under a neighbour that overlaps it. I found no such overlap: open menus and
  popovers are `z-20`, and the select boxes are absolute from the card. Step 5 above checks
  this.
- **The ⋯ can be reopened while "Copy to variant" is open**, and then both are open at once
  (`assess-320-copy-popover-and-menu.png`; this behaviour already exists). With the fix, the menu
  is still positioned from the outer wrapper if the popover opened `start` / `end` and the menu
  opens `full`. Under the same layout that can't happen: both measure the same 32 px box, and the
  popover (300 px) is wider than the menu (248 px), so a menu in `full` means a popover in `full`.
  Only a resize between the two openings could produce it.
- **Out of scope, separate bug.** In a based variant on narrow windows (≤ 344 px for a sub-group,
  ≤ 312 px for a group), a `changed` rule's row doesn't fit its mark and its ⋯. At 320 px the
  "Changed here" chip covers the rule's name, and the ⋯ reaches 11 px past the tinted frame (row
  `scrollWidth` 196 against `clientWidth` 185; `assess-320-students-sub-group.png`). The ⋯ then
  stops moving left (240.5 / 259.5 in the table above). This doesn't cause the narrow menu, but
  it moves where `full` starts. It deserves its own slug.
- **Also existing and out of scope:** with both popups open, Escape closes the menu and gives the
  focus to the ⋯. A second Escape doesn't close the popover, because the focus is outside it.
- `placementFrom()` measures against `document.documentElement.clientWidth`. In this run that was
  320 while the layout box was 305 (`html`'s `scrollbar-gutter`). `end` only compares the ⋯'s
  right edge with the width plus the gutter, so this doesn't change which placement the rule
  menus get here. It may matter for `start`, which wasn't examined.
- I tested in Chromium on Linux only.

## Open Questions

- None block the fix. Before `/speckit-bug-fix`, choose the preferred fix (shared helper) or the
  local alternative (only `RuleListItem.tsx:81`). The preferred one is recommended, because it
  can be unit-tested and protects any future nested wrapper.
- [NEEDS CLARIFICATION, optional] Should the row overflow of a `changed` rule in a narrow
  sub-group ("Changed here" over the name) be assessed as its own bug?
