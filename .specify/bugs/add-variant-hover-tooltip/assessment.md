# Bug Assessment: "Add variant"'s hover tint covers only part of its ⓘ

- **Slug**: add-variant-hover-tooltip
- **Created**: 2026-11-18
- **Source**: pasted text
- **Verdict**: valid
- **Severity**: low

## Report (verbatim or summarized)

> In the rules page, when hovering the "Add variant" button, the gray hover does not conver
> completely the info tooltip on the right. It should do that.

## Symptom

On the Rules step, hovering "+ Add variant" shows KERN's tertiary hover tint (8 % action blue,
which reads as grey), but the tint ends partway across the ⓘ ("About variants") right after the
label: the ⓘ's left 12px sit on the tint, its right 8px outside it, and the tint's rounded
corner cuts through the icon. Expected: the tint covers the whole ⓘ.

## Reproduction

1. Open a connection in the editor and go to the Rules step (the tab row with "Standard",
   "+ Add variant" and the ⓘ shows from the start of the step).
2. Move the mouse over "+ Add variant".
3. The hover tint stops in the middle of the ⓘ.

Reproduced with the exact geometry in Chromium on a static mock of the markup
(`BranchTabs.tsx`) with KERN 2.8.2's `kern.css` (the version in `frontend/package.json`) and the
`-mr-12` pull, the hover forced on. Not reproduced in the running app: this checkout has no
`node_modules` and no dev server. Measured:

| | value |
|---|---|
| label text end → button's right edge | 16px (button `px-8` + label `px-8`) |
| label text end → ⓘ's left edge | 4px (the `-mr-12` pull) |
| ⓘ width | 20px (`kern-icon--small`) |
| ⓘ inside the tint / outside it | 12px / 8px |
| `elementFromPoint` across the ⓘ | the ⓘ button over its whole 20px (its target is intact) |

Screenshot of the mock: `hover-mock.png` in this directory (the mock uses KERN's own tint
token, not the Revamp overlay's colour; the geometry is the same).

## Suspected Code Paths

- `frontend/src/pages/FormConnectionEditor/RulesStep/constants.ts:180-185` —
  `ADD_VARIANT_CLASSES = 'flex items-center [&>.kern-btn]:-mr-12!'`: pulls the button 12px
  towards the ⓘ so that the ⓘ sits 4px after the label (Figma U43 `6168:7011`), which leaves the
  button's box, and with it the hover tint, ending 12px into the 20px icon.
- `frontend/src/pages/FormConnectionEditor/RulesStep/BranchTabs.tsx:85-101` — the group: the
  `kern-btn kern-btn--tertiary kern-btn--small` button, then `InfoTooltip` (`iconSize="small"`,
  `tone="action"`) as its sibling.
- KERN 2.8.2 `kern.css` (`.kern-btn--small`: `padding: 0 8px`, 40px, `position: relative`;
  `.kern-btn--small .kern-label`: `padding: 4px 8px`;
  `.kern-btn--tertiary:not(:disabled):hover`: the `tint-hover-opacity` background) — the tint is
  the button's own background, so it covers exactly the button's box.
- `frontend/src/index.css:526` — the pressed tint (16 % over white) on the same box: it has the
  same gap while pressed.
- `frontend/src/components/InfoTooltip/index.tsx:166-198` — the ⓘ: unchanged by the fix, listed
  because the button's box will overlap it.

Not affected: the Test step's `TestStep/VariantTabs.tsx` reuses the row without "Add variant"
and its ⓘ.

## Root Cause Hypothesis

The ⓘ is a separate control beside the button (it can't be inside it), and the design's 4px gap
between the label and the ⓘ is made by pulling the button 12px over the ⓘ. KERN's small tertiary
button keeps 16px of padding after its label, so its box (where the hover and pressed tints are
drawn) ends 16px after the label, while the ⓘ ends 24px after it: 8px of the icon are outside
the tint. Nothing in the code extends the tint to the ⓘ. Confidence: high (the numbers come from
KERN's CSS and the class constant, and were measured on the mock).

## Proposed Remediation

**Preferred**: make the button's own box reach past the ⓘ, keeping the ⓘ where it is. In
`ADD_VARIANT_CLASSES`, give the button a larger right padding and a matching larger pull, so that
the ⓘ still starts 4px after the label and the box ends 8px after the ⓘ (the same 8px the button
keeps before its "+"). Worked out: button right padding 24px (`[&>.kern-btn]:pr-24!`, `!` because
KERN's `.kern-btn--small` padding beats Tailwind) and pull 28px (`[&>.kern-btn]:-mr-28!`), so the
button's edge is 8 + 24 = 32px after the label text and the ⓘ spans 4–24px; give the group
`pr-8` so that its layout box includes those 8px. The hover tint, the pressed tint
(`index.css:526`) and KERN's disabled overrides then cover the ⓘ without new colour rules. The ⓘ
stays on top for the pointer (measured: it wins the hit test over its whole box), so its tooltip
and target are unchanged; the button's target grows by the 8px after the ⓘ. Update the comment on
`ADD_VARIANT_CLASSES` to say why, and measure the result in the browser rather than trusting the
arithmetic (as `rules-ui-fixes` B2 did).

**Alternatives**:
- Draw the tint on the group instead (`has-[>.kern-btn:hover]` / `:active` on the wrapper, the
  button's own hover and pressed tints cancelled): the button's box and focus ring stay as they
  are, but it re-implements the hover, pressed and disabled states that KERN and `index.css`
  already draw, and the 48px slot versus the 40px visible button needs extra offsets. More code
  for the same look.
- Tint the group while the ⓘ is hovered too: would make the ⓘ look like part of the button,
  though clicking it doesn't add a variant. Not recommended (see Open Questions).
- Put the ⓘ inside the button: invalid HTML (a button inside a button) and it would break the
  tooltip's own focus and tap handling. Rejected.

**Files likely to change**:
- `frontend/src/pages/FormConnectionEditor/RulesStep/constants.ts` (`ADD_VARIANT_CLASSES` and its
  comment)
- `specs/008-kern-revamp-redesign/design-notes.md` (the U43 `6168:7011` rows that record
  `mr-[-12px]`: an "Updated" note for this bug)

**Tests to add or update**:
- No jsdom test can see layout; lock the fix with the browser measurements in
  `/speckit-bug-test`, on the Rules step at 1440px and at 320px (wrapped row):
  - the ⓘ's left edge is 4px after the label's text, as before;
  - the button's box contains the ⓘ's box, with 8px after it;
  - while the button is hovered, its computed background is the hover tint over the whole box;
    while pressed, the pressed tint;
  - `elementFromPoint` over the ⓘ still returns the ⓘ's button, its tooltip opens on hover, focus
    and tap;
  - the tab row stays 49px high, "Add variant"'s label stays on the tab labels' line
    (design-notes 008, U43 `6168:7011` rows), and nothing overflows the row at 320px.
- `npm run lint`, `npm test`, `npm run build` from the root.

## Risks & Considerations

- **Focus ring**: KERN's outline is drawn around the button's box, so with the preferred fix the
  keyboard focus ring of "+ Add variant" also encloses the ⓘ, which has its own ring when it gets
  the focus. Slightly ambiguous; the group alternative avoids it.
- **Hover moving onto the ⓘ**: the ⓘ is on top, so while the pointer is over it the button isn't
  hovered and the tint disappears (it comes back on the 8px after the ⓘ). That is today's
  behaviour over the ⓘ too, but now the hole is the whole ⓘ inside a tinted box.
- **Narrow windows**: the group grows by 8px; the row already wraps (`flex-wrap`), check it at
  320px.
- **Design deviation**: Figma U43 `6168:7011` draws the resting state only (the source of the
  `-12` pull); the resting layout must stay pixel-identical, and the hover's new extent is a
  departure from the plain KERN button that the design-notes should record.
- No API, data, security or performance impact.

## Open Questions

- [NEEDS CLARIFICATION: while the pointer is on the ⓘ itself, should the tint stay (the group
  looks hovered, though clicking the ⓘ doesn't add a variant) or disappear (preferred fix,
  recommended)?]
- [NEEDS CLARIFICATION: how far past the ⓘ should the tint end? 8px is assumed, mirroring the
  8px before the "+"; Figma has no hover frame for this group that was found.]
- [NEEDS CLARIFICATION: is a focus ring that encloses both the button and the ⓘ acceptable, or
  should the ring stay around the button's visible part only (the group alternative)?]
