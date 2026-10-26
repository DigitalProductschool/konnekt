# Bug Fix: "Copy to variant" closes when the variant's name is clicked

- **Slug**: copy-popover-label-click
- **Fixed**: 2026-10-26
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

The "Copy to variant" popover now takes the focus itself (`tabIndex={-1}`) when something inside it
that isn't a control is pressed. Before, that focus went to the rule row (`tabIndex={-1}` in
`RuleRow`), and `handleBlur` treated the move as Tab out and closed the popover before the
`<label>`'s click could tick the box.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `frontend/src/pages/FormConnectionEditor/RulesStep/CopyPopover.tsx` | modified | `tabIndex={-1}` and `outline-none` on the `role="dialog"` div; doc comment and a comment above `handleBlur` explain why |
| `specs/002-connection-rules/design-notes.md` | modified | §4 "Copy to variant": a click on a variant's row, its name included, ticks it; the popover takes the focus from a press inside it |

## Diff Highlights

```tsx
    <div
      ref={popoverRef}
      role="dialog"
      aria-labelledby={`${id}-title`}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      className={`... p-16 outline-none ${COPY_POPOVER_PLACEMENTS[placement]}`}
    >
```

`handleBlur` is unchanged. The focus now moves inside the actions wrapper, so it doesn't dismiss.

## Tests Added or Updated

- None. Vitest runs without a DOM (`frontend/vite.config.ts`), and the bug depends on real focus
  behaviour on `mousedown`, as with rules-ui-fixes B5. The browser checks listed in the assessment
  belong to `/speckit-bug-test`.

## Local Verification

- Commands run:
  - `npx prettier --check` on `CopyPopover.tsx` → clean
  - `npx eslint` on `CopyPopover.tsx` → clean
  - `npx tsc -b --noEmit` → no errors
  - `npm test` → 16 files, 517 tests passed
- Manual checks: none in the running app (no sign-in credentials). The assessment's standalone
  Chromium page already showed this exact change working (its "fixed" rows).

## Deviations from Assessment

None. The optional `tabIndex={-1}` hardening of `ValuesPicker` / `ChoiceMenu` was left out, as the
assessment scoped it as a follow-up.

## Follow-ups

- Optionally apply the same `tabIndex={-1}` pattern to `ValuesPicker`'s menu. B5's fix there relies
  on `relatedTarget === null`, which breaks if a focusable ancestor is added later.
- In `/speckit-bug-test`, check Safari if one is available: it doesn't focus checkboxes or buttons
  on click, and this fix should cover that case too.
