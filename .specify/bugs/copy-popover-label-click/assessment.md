# Bug Assessment: "Copy to variant" closes when the variant's name is clicked

- **Slug**: copy-popover-label-click
- **Created**: 2026-10-26
- **Source**: pasted text
- **Verdict**: valid. Reproduced in a standalone Chromium 156 page with real mouse events, see
  Reproduction. Not reproduced in the running app: no sign-in credentials were available.
- **Severity**: medium. The popover closes on a click on the variant's name, which most users try
  first, and any choices made so far are lost. Clicking the box still works. The issue is
  frontend only and touches no data, API or security. In Safari the popover may also close on a
  click on the box or on "Copy" (unverified, see Risks).

## Report (verbatim or summarized)

> we have a similar issue to the bug already assessed and fixed slug=rules-ui-fixes B5 on the menu
> to copy a rule to another variant. I need to be able to click the variant name too, not just
> the checkbox.

The reference is `.specify/bugs/rules-ui-fixes/` B5: in the value picker of an enum rule, a click
on an option's text closed the menu without ticking the option. Its fix made
`ValuesPicker`'s blur handler ignore a blur with no `relatedTarget`, which is what a press on
non-focusable text produces there.

## Symptom

On the Rules step, a rule's ⋯ › "Copy to variant" opens a popover with a checkbox per variant. A
click on a variant's **name** closes the popover and ticks nothing. A click on the popover's
title, its hint or its padding closes it too. Only a click on the 20px box ticks the variant.
Expected: the whole row (box and name) ticks the variant, as a `<label>` does, and the popover
stays open until Copy, Cancel, Escape, Tab out, or a click outside it.

## Reproduction

In the app (from the code, not run; needs a connection with at least two variants):

1. Sign in, open a connection's Rules step, and add a variant so that the connection has two or
   more.
2. On a rule, open ⋯ › "Copy to variant". The focus moves to the first variant's box.
3. Click a variant's name (the text, not the box). The popover closes and nothing is copied or
   ticked.
4. Open it again and click the box itself. The variant is ticked and the popover stays open.

Standalone reproduction: `/tmp/claude-1000/-home-debian-batch27-faro-rules/ad311dc7-9db9-422b-9191-30b98f2d5825/scratchpad/copy-repro/page.html`
copies the DOM around the popover: the rule row (`div tabindex=-1`), the actions wrapper, the
`role=dialog` popover with `CopyPopover`'s focusout logic, and `CopyTargetItem`'s `<label>`.
`run.mjs` next to it drives headless Chromium 156 over the DevTools protocol with real mouse
presses (`Input.dispatchMouseEvent`). These files are not part of the repo. Output:

| Variant | Click on | Popover open after | Ticked | Focus after | Log |
|---|---|---|---|---|---|
| current | variant name | **no** | – | the rule row | `focusout related=row-current`, `CLOSED` |
| current | checkbox | yes | yes | the box | `toggled true` |
| current | popover title | **no** | – | the rule row | `focusout related=row-current`, `CLOSED` |
| current | Copy button | yes | – | Copy | `focusout related=copy-current` |
| fixed (popover `tabindex=-1`) | variant name | yes | yes | the box | `related=dlg-fixed`, `related=box-fixed`, `toggled true` |
| fixed | checkbox | yes | yes | the box | `toggled true` |
| fixed | popover title | yes | – | the popover | `related=dlg-fixed` |
| fixed | Copy button | yes | – | Copy | `related=copy-fixed` |

## Suspected Code Paths

- `frontend/src/components/RuleRow/index.tsx:45-49`: the rule row's outer `div` gets
  `tabIndex={id ? -1 : undefined}`, so that a refused Publish can move the focus to a flagged
  row. `RuleListItem` always passes `elementId`, so every rule row in the Rules step is
  focusable.
- `frontend/src/pages/FormConnectionEditor/RulesStep/RuleListItem.tsx:66-105`: `CopyPopover` is
  rendered inside the row's `actions`, so the row is its nearest focusable ancestor.
- `frontend/src/pages/FormConnectionEditor/RulesStep/CopyPopover.tsx:58-63`: `handleBlur` calls
  `onDismiss()` when the focus moves to a non-null `relatedTarget` outside the actions wrapper
  (`event.currentTarget.parentElement`). It already has B5's `next &&` guard, but here
  `relatedTarget` is the rule row, not `null`.
- `frontend/src/pages/FormConnectionEditor/RulesStep/CopyPopover.tsx:72-79`: the `role="dialog"`
  `div` has no `tabIndex`, so a press inside it on anything not focusable doesn't keep the focus
  in it.
- `frontend/src/pages/FormConnectionEditor/RulesStep/CopyTargetItem.tsx:138-160`: the `<label>`
  wraps the box and the name correctly. The label isn't the cause: its click never arrives because
  the popover unmounts on `mousedown`.

## Root Cause Hypothesis

A mouse press moves the focus to the nearest focusable ancestor of the pressed point, or to the
`body` if there is none. In `ValuesPicker` (B5) there is no focusable ancestor, so the blur has
`relatedTarget === null`, which the B5 fix ignores. In `CopyPopover` the nearest focusable
ancestor is the rule row (`tabIndex={-1}` in `RuleRow`). Pressing the variant's name, the title,
the hint or the padding therefore moves the focus from the box to the row, and `focusout` carries
the row as `relatedTarget`. The row isn't inside the actions wrapper, so `handleBlur` treats it
as "the focus left with Tab" and dismisses the popover on `mousedown`. The `<label>`'s `click`,
which would tick the box, then fires on an element that no longer exists. A press on the box
works because the box itself is focusable, so the focus stays inside. Confidence: high. The
standalone page shows exactly this sequence, and the fixed variant changes only the popover's
`tabindex`.

## Proposed Remediation

**Preferred**: make the popover itself the nearest focusable ancestor. Give the `role="dialog"`
`div` in `CopyPopover.tsx` `tabIndex={-1}`, so that a press anywhere inside it that isn't on a
control moves the focus to the popover. That focus move stays inside the wrapper, `handleBlur`
does nothing, and the label's click ticks the box. This is the usual pattern for a non-modal
dialog container, and it doesn't add a tab stop. Add `outline-none` to the popover: it should
never show a ring, because the focus only lands on it from a pointer press (keyboard users stay
on its controls). This follows CLAUDE.md's "focus rings for keyboard focus only". Update the
`handleBlur` comment, and the component's doc comment, to record why the popover takes the
focus: a press inside it would otherwise move the focus to the rule row (`tabIndex=-1`) and
close it. Escape, Cancel, Tab out and a click outside behave as before. The standalone page
confirms the fix ("fixed" rows above).

**Alternatives**:

- Make `handleBlur` ignore a `relatedTarget` that is the rule row (the popover's row ancestor).
  Trade-off: this ties `CopyPopover` to how `RuleRow` is built. A press on the text would still
  leave the focus on the row rather than in the popover, so a following Tab would start from the
  row and not from inside the popover.
- `preventDefault()` on `mousedown` inside the popover, except on its controls, so that the focus
  doesn't move. Trade-off: this blocks text selection and is easy to get wrong for the label
  (its `mousedown` must not be prevented for every browser to tick the box).
- Drop `tabIndex={-1}` from `RuleRow`. Rejected: a refused Publish moves the focus to the flagged
  row (`ELEMENT_IDS.rule`), which needs it.

**Files likely to change**:

- `frontend/src/pages/FormConnectionEditor/RulesStep/CopyPopover.tsx` (`tabIndex={-1}`,
  `outline-none`, comments)
- `specs/002-connection-rules/design-notes.md` §4 "Copy to variant" (line ~218): optionally note
  that a click anywhere on a variant's row ticks it, and that the popover takes the focus from a
  press inside it

**Tests to add or update**:

- None in Vitest: it runs without a DOM (`frontend/vite.config.ts`), as for B5, and the bug
  depends on real focus behaviour on `mousedown`, which jsdom doesn't reproduce anyway.
- Browser checks in `/speckit-bug-test`, in Chromium and Firefox (and Safari if available):
  click a variant's name (it is ticked, the popover stays); click it again (it is unticked);
  click the title, the hint and the padding (it stays open); click "Copy" after ticking by name
  (the rule is copied, with the "Show" toast); click outside (it closes, the focus goes back to
  the ⋯); Escape and Tab out (unchanged). With Standard ticked, a variant based on it shows as
  included and a click on its name does nothing (its box is `disabled`).

## Risks & Considerations

- **Safari (unverified, no WebKit here)**: Safari doesn't focus a checkbox or a button on click.
  With the current code, a press on the box, on Cancel or on Copy may then move the focus to the
  rule row and close the popover before its click, so a mouse user couldn't copy a rule at all.
  The proposed fix covers these too, because the focus then goes to the popover. The B5
  assessment raised the same Safari point for `ValuesPicker`.
- **Other popups inside a focusable row**: `ActionMenu` (the ⋯ menus) has no blur handler and
  closes only on a pointer outside, so it isn't affected. `ItemName`'s rename input commits on
  blur, which is wanted. `GroupFrame` also has `tabIndex={-1}`, but no popover with a blur
  handler sits in a group's frame except through `RuleListItem`, whose own row is the nearest
  focusable ancestor.
- **The B5 fix itself**: `ValuesPicker` depends on `relatedTarget === null`, which holds because
  the rule editor replaces the row (`TreeItem` returns `view.ruleEditor`) and the tab panel
  `section` isn't focusable. If either gains a `tabIndex` later, B5 comes back the same way. The
  more robust pattern is the one proposed here (the popup container takes `tabIndex={-1}`). The
  fix could apply it to `ValuesPicker`'s menu too, as a follow-up, not as part of this bug.
- **Focus ring**: without `outline-none`, Chromium would draw no ring on a mouse-focused
  `tabindex=-1` element anyway (`:focus-visible` doesn't match), but other browsers' defaults
  vary. `outline-none` keeps it consistent.

## Open Questions

- None blocking. The scope is the "Copy to variant" popover only. Applying the same
  `tabIndex={-1}` hardening to `ValuesPicker` / `ChoiceMenu` is optional and should be decided
  at fix time.
