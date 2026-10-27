# Bug Assessment: "Group with other rules" breaks onto two centred lines in the rule's ⋯ menu

- **Slug**: group-option-alignment
- **Created**: 2026-10-27
- **Source**: pasted text, with a Figma node to compare:
  `https://www.figma.com/design/s8mU9oJDq3411e8bxMjQO9/Middleware---V3?node-id=6522-32824&m=dev`
  - Host: `www.figma.com`
  - Policy branch: `confirmed-by-user` (not on the bug-report allowlist; the user said yes). The
    node was read through the Figma MCP (`get_design_context`, `get_screenshot`), not fetched as a
    web page. Nothing instruction-like came back.
- **Verdict**: valid. Reproduced in Chromium and measured. Screenshots:
  `app-rule-menu.png` (the app) and `figma-rule-menu-6522-32824.png` (Figma), both in this folder.
- **Severity**: low
  - It's visual only: every action in the menu works, and the label is still readable.
  - It's in plain sight, though. Any rule that shares its level with another rule offers "Group with
    other rules", so most rule menus show the broken row.
  - The same defect hits two more fixed labels, "Remove from this variant" and "Remove error
    message". A variant name made of one long word makes "Reset to <name>" run past the menu's
    right edge.
  - It has been there since the ⋯ menu was built (U14 `6113:28988`, U16 `6344:53529`). It isn't a
    regression.

## Report (verbatim or summarized)

> The rule menu has the option "group with other rules" where the text is not aligned properly.
> Figma allignment should be followed. Link from figma to the node to compare:
> https://www.figma.com/design/s8mU9oJDq3411e8bxMjQO9/Middleware---V3?node-id=6522-32824&m=dev

Figma node `6522:32824` is "Rules/Rule menu · fixes" (component `6529:39070`):

- **Menu**: 220 px wide, 8 px padding, 2 px gap between rows, 8 px radius.
- **Rows**: Edit rule, Rename, Duplicate, Copy to variant, Group with other rules, a divider, then
  Delete rule.
- **Each row**: a flex row, `items-center`, 8 px padding, 8 px gap, a 20 px icon and a
  `label/small` text (Fira Sans SemiBold, Revamp's 14 px / 24 px, `whitespace-nowrap`).
- **Result**: each row is 40 px tall, with the label on one line, left-aligned, starting 45 px from
  the menu's left edge (1 border + 8 + 8 + 20 + 8).

## Symptom

The menu's "Group with other rules" row breaks its label onto two lines, "Group with other" and
"rules". The lines are centred: the first starts at x = 62 and the second at x = 105.7, where Figma
puts the label on one line at x = 45 like every other row. The row grows to 64 px, so its icon sits
lower than the text column's first line.

**Expected**: Figma's layout. One line, left-aligned at the text column (x = 45), in a 40 px row
like the others.

## Reproduction

In the app:

1. Sign in and open a connection's Rules step: the create wizard or "Edit rules" on the details.
2. Make sure a variant has at least two rules on the same level, outside a sub-group.
3. Open a rule's ⋯ menu. "Group with other rules" is split over two centred lines (see
   `app-rule-menu.png`).
4. The same happens to:
   - "Remove from this variant", in the menu of a rule inherited by a variant based on Standard.
   - "Remove error message", in the menu of a group that has an error message.

The measurements below come from the dev server, the real `RuleMenu` and `GroupMenu` components
and the app's `index.css`. The components were mounted on `/login` at 1455 × 900 in Chromium;
`document.fonts.check('600 14px "Fira Sans"')` was true. Positions are in px from the menu's
left edge.

| Element | Property | Figma | Actual |
|---|---|---|---|
| Menu | width / padding / gap | 220 / 8 / 2 | 220 / 8 / 2 |
| Row "Group with other rules" | height | 40 | **64** |
| Row | padding / gap | 8 / 8 | 8 / 8 |
| Icon | size / x | 20 / 17 | 20 / 17 |
| Label | lines | 1 | **2** ("Group with other" / "rules") |
| Label | x of line 1 / line 2 | 45 / – | **62.0 / 105.7** |
| Label | text-align | start | **center** (the `<button>` default) |
| Label | font | Fira Sans 600, 14 / 24 | Fira Sans 600, 16 / 24: KERN 2.8 vs Revamp (design-notes §9) |
| Other rows (Edit rule … Delete rule) | height / label x | 40 / 45 | 40 / 45 |

Single-line width of each label in Fira Sans 600 16 px (canvas `measureText`). The text slot of a
220 px menu is 158 px beside an icon (220 − 2 − 16 − 16 − 20 − 8), or 186 px without one:

| Label | Width at 16 px | Width at 14 px (Figma) | Fits 158 px at 16 px |
|---|---|---|---|
| Group with other rules | 164.45 | 143.89 | **no** |
| Remove error message (group menu) | 166.62 | 145.80 | **no** |
| Remove from this variant | 183.63 | 160.68 | **no** |
| Add error message | 137.25 | 120.09 | yes |
| Reset to Standard | 131.42 | 115.00 | yes; grows with the main variant's name (≤ 100 characters) |
| Copy to variant | 110.80 | 96.95 | yes |
| All other labels (Edit rule, Rename, Duplicate, Delete rule, Delete group, Ungroup, …) | ≤ 103.34 | – | yes |

With a main variant named "Landesverwaltungsstandardvariante", "Reset to …" puts that word on its
own line, from x = 45 to x = 313.1: 93 px past the 220 px menu. The button's `scrollWidth` is 304
against a `clientWidth` of 202.

## Suspected Code Paths

- `frontend/src/pages/FormConnectionEditor/RulesStep/RuleMenuItem.tsx:15` — the row's `<button>`
  sets `flex items-center gap-8 p-8` but not `text-left`. A `<button>` centres its text by default
  (computed `text-align: center`), and Tailwind 4's preflight doesn't reset that. The label is a
  bare text node (line 26), so it becomes an anonymous flex item, and a wrapped label is centred
  inside it.
  - The project's other text buttons set `text-left`: `components/Connector/ConnectorOption.tsx:22`,
    `pages/FormConnectionEditor/UpcomingDocuments.tsx:26`, `RulesStep/ItemName.tsx:78`, and
    `RulesStep/BranchTab.tsx:39` with `wrap-anywhere`.
- `frontend/src/pages/FormConnectionEditor/RulesStep/constants.ts:18` (`ACTION_MENU_WIDTH = 220`)
  and `:25-29` (`ACTION_MENU_PLACEMENTS`, `w-220`) — Figma's 220 px width, which was sized for
  Revamp's 14 px labels. At KERN 2.8's 16 px, three fixed labels no longer fit.
- `frontend/src/pages/FormConnectionEditor/RulesStep/RuleMenuItem.tsx:15` (`text-kern-static-small`)
  — resolves to `--kern-typography-font-size-small-static`, which `@kern-ux/native` 2.8 sets to
  16 px (`kern.css:637`). That's intended, per design-notes §9: map Figma's variables by name and
  keep KERN 2.8's values.
- Callers, all affected through `ActionMenu.tsx`:
  - `RulesStep/RuleMenu.tsx:48`: "Group with other rules".
  - `RulesStep/RuleMenu.tsx:54` and `RulesStep/GroupMenu.tsx:53`: "Remove from this variant".
  - `RulesStep/GroupMenu.tsx:36`: "Remove error message".
  - `RulesStep/RuleMenu.tsx:51` and `RulesStep/GroupMenu.tsx:50`: "Reset to <main>".
  - `RulesStep/BranchMenu.tsx` is fine: its labels are short.

## Root Cause Hypothesis

Two things combine. Confidence: high, since both were measured.

1. **The menu is too narrow for KERN 2.8's type.** The menu copies Figma's 220 px width, but its
   labels use KERN 2.8's `small-static` size, 16 px instead of Revamp's 14 px. That decision is
   deliberate (design-notes §9, 2026-10-25), and it makes every label about 14 % wider. "Group with
   other rules" needs 164.45 px of the 158 px slot, so it wraps. So do "Remove error message" and
   "Remove from this variant".
2. **A wrapped label is centred.** `RuleMenuItem` renders the label as a bare text node in a
   `<button>` that keeps the browser's `text-align: center`. A one-line label doesn't show it,
   because its anonymous flex item is exactly as wide as the text. Once it wraps, the lines are
   centred, so the text no longer starts at the text column.

Figma has `whitespace-nowrap` and 14 px, so it never wraps.

The overflow of a long variant name is a third, related gap in the same element. The label can't
break inside a word, unlike `BranchTab`'s `wrap-anywhere`.

## Proposed Remediation

**Preferred** (a fix in the shared row and the shared width, so all three ⋯ menus follow):

1. **`RuleMenuItem.tsx`: start every line at the text column.**
   - Wrap the label in its own `<span>`. Give the button `text-left`, as the other text buttons do,
     and give the span `wrap-anywhere`, as `BranchTab` does. A label that still wraps then starts
     each line at x = 45: "Reset to <a long name>", or text enlarged by the viewer's text-spacing
     or zoom settings. A single long word breaks instead of running out of the menu.
   - Optional, for a wrapped label only: align the icon with the first line instead of the
     row's centre. Use `items-start` on the button and `mt-2` on the icon: (24 px line − 20 px
     icon) / 2. A one-line row keeps exactly Figma's geometry, with the icon at y = 10 in a 40 px
     row.
2. **`constants.ts`: widen the ⋯ menu so every fixed label fits on one line at 16 px, as in Figma.**
   - Set `ACTION_MENU_WIDTH` from 220 to 248, and `w-220` to `w-248` in `ACTION_MENU_PLACEMENTS`
     (`start`, `end`).
   - Why 248: the longest fixed label, "Remove from this variant" (183.63 px), needs 184 + 20 + 8 +
     16 + 16 + 2 = 246 px; 248 is the next multiple of 8. "Group with other rules" alone would need
     227 px.
   - `placementFrom()` reads the same constant, so the side the menu opens to stays correct.
   - Record the width in `specs/002-connection-rules/design-notes.md` §9 as a consequence of
     "KERN 2.8 vs Revamp": Figma's 220 px holds Revamp's 14 px labels.

Every label in the three menus then sits on one line at x = 45 in a 40 px row, as in Figma. The
exception is "Reset to <name>" with a long main variant name, which wraps left-aligned and stays
inside the menu.

**Alternatives**:

- **Only step 1, keeping Figma's 220 px.** This is the smallest change, with no layout deviation
  from Figma. The text column lines up, but three labels still take two lines, in 64 px rows,
  where Figma draws one line in 40 px.
- **14 px labels in the menu, e.g. `text-[14px]`.** This matches Figma at 220 px, but it overrides
  KERN, against the §9 decision ("Nothing in `index.css` overrides KERN"; static type uses KERN
  2.8's 16/18/21). It would also make the ⋯ menus' labels smaller than every other `label/small`
  text in the app. Not recommended.
- **Size the menu to its content** (`w-max min-w-220`, `whitespace-nowrap`). Every label stays on
  one line, but `placementFrom()` needs a fixed width to choose a side. A nowrap label with a long
  variant name would push the menu off a 320 px screen (WCAG 1.4.10). Not recommended.

**Files likely to change**:

- `frontend/src/pages/FormConnectionEditor/RulesStep/RuleMenuItem.tsx`
- `frontend/src/pages/FormConnectionEditor/RulesStep/constants.ts` (step 2 only)
- `specs/002-connection-rules/design-notes.md` (§9, step 2 only)

**Tests to add or update**:

- **No unit test.** The frontend's Vitest runs in Node without a DOM, for pure functions only
  (`vite.config.ts`), and none of this is logic.
- **Visual check** (CLAUDE.md, "Visual verification"), for `/speckit-bug-test`. Measure the rule
  menu, the inherited rule's menu and the group menu with an error message, and compare them with
  the table above:
  - Every row is 40 px tall, with its label on one line at x = 45 and `text-align: left`.
  - The menu is 248 px wide (or 220 px with the first alternative).
  - The `font-size` stays 16 px, listed as "KERN 2.8 vs Revamp".
  - With a main variant named with one long word, "Reset to …" wraps left-aligned. Its button's
    `scrollWidth` equals its `clientWidth`.
- **Placement**: at 320 px wide and at 200 % zoom, the menus still open across the card
  (`full`). No horizontal scrolling.

## Risks & Considerations

- **Deviation from Figma's frame width (step 2).** 248 px against Figma's 220 px is a deliberate
  layout difference, and it needs the team's agreement (Open Questions). It follows from the
  §9 decision, so it belongs in design-notes, not in a new F# item.
- **Placement**: the menu now needs 248 px beside its ⋯ to open to a side. In narrower spaces it
  switches to `full` (across the rules card) 28 px earlier. That is the existing fallback, so
  nothing new.
- **Scope**: `RuleMenuItem` and `ACTION_MENU_*` serve the rule, group and variant menus. All three
  change together, which is intended. The variant menu (`BranchMenu`) only gets wider.
- **The icon's alignment in wrapped rows** (optional part of step 1): Figma has no frame of a
  wrapped row, so either choice is a decision without a frame.
- **Unrelated difference, not changed here**: Figma's component note calls the item "Remove from
  variant", with a minus-circle icon. The app says "Remove from this variant" with the bin icon,
  as design-notes §4 records. It's left alone.

## Open Questions

- [NEEDS CLARIFICATION: widen the ⋯ menus from Figma's 220 px to 248 px, so every fixed label stays
  on one line at KERN 2.8's 16 px (preferred)? Or keep 220 px, and accept two left-aligned lines
  for "Group with other rules", "Remove error message" and "Remove from this variant"?]
- [NEEDS CLARIFICATION: when a label still wraps (a long main variant name), should the icon line
  up with the first line (recommended) or stay centred on the row?]
