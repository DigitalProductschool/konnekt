# Bug Fix: Cancel in "Copy to variant" crashes the Rules editor

- **Slug**: copy-popover-cancel-crash
- **Fixed**: 2026-10-26
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

`RuleListItem` passed one function, `closeCopy(targets?: string[])`, as both the copy and the close
callback, and Cancel called it with the click event, which it dispatched as `copyRule` targets. It
now passes two callbacks with exact signatures, `copyTo(targets)` and `closeCopy()`, and Cancel
calls `onClose()` without the event, as Escape does.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `frontend/src/pages/FormConnectionEditor/RulesStep/RuleListItem.tsx` | modified | Split `closeCopy(targets?)` into `closeCopy()` (dispatches `closeDialog`) and `copyTo(targets: string[])` (dispatches `copyRule`); both return the focus to the rule's ⋯ through a shared `focusActions()`. `onCopy={copyTo}`, `onClose={closeCopy}` |
| `frontend/src/pages/FormConnectionEditor/RulesStep/CopyPopover.tsx` | modified | Cancel: `onClick={() => onClose()}` (second guard); doc comment notes it |
| `frontend/src/pages/FormConnectionEditor/RulesStep/utils.test.ts` | added test | Closing "Copy to variant" changes nothing but `dialog` |

## Diff Highlights

`RuleListItem.tsx`:

```tsx
// before
function closeCopy(targets?: string[]) {
  dispatch(targets ? { type: 'copyRule', targets } : { type: 'closeDialog' });
  actionsRef.current?.querySelector<HTMLElement>('[aria-haspopup=menu]')?.focus();
}
…
onCopy={closeCopy}
onClose={closeCopy}

// after
function closeCopy() {
  dispatch({ type: 'closeDialog' });
  focusActions();
}

function copyTo(targets: string[]) {
  dispatch({ type: 'copyRule', targets });
  focusActions();
}
…
onCopy={copyTo}
onClose={closeCopy}
```

`CopyPopover.tsx`:

```tsx
// before
onClick={onClose}
// after
onClick={() => onClose()}
```

Either change alone stops the crash: a zero-argument `closeCopy` ignores the event, and the arrow
never passes it.

## Tests Added or Updated

- `frontend/src/pages/FormConnectionEditor/RulesStep/utils.test.ts` › "variants (FR-019 to
  FR-024)" › `closes "Copy to variant" without copying (bug copy-popover-cancel-crash)`:
  `askCopyRule` then `closeDialog` leaves the branches, counters and toast as they were and only
  clears `dialog`. This pins the close path that Cancel now dispatches. It doesn't cover the
  component wiring itself: as the assessment notes, the Vitest suite runs in Node without a DOM and
  covers pure functions only, so the Cancel click must be verified end to end in
  `/speckit-bug-test`.

## Local Verification

- `cd frontend && npm test` → pass: 16 files, 518 tests (517 before, plus the new case)
- `npx eslint src/pages/FormConnectionEditor/RulesStep/` → clean
- `npx prettier --check` on the three changed files → clean
- `npx tsc -b --noEmit` → no errors
- Manual checks: none. The browser checks the assessment lists (Cancel by mouse and keyboard, with
  and without a ticked variant; Escape, Copy, Tab out, outside click and the variant-name click as
  regressions; the focus on the ⋯ afterwards) are left to `/speckit-bug-test`.

## Deviations from Assessment

None. Both the preferred change and the second guard were applied. The `focusActions()` helper is
the shared focus step the assessment allowed for.

## Follow-ups

- Verify in Chromium and Firefox with `/speckit-bug-test`, reusing
  `.playwright-mcp/copy-popover-*.js` from `copy-popover-label-click`.
- Open question from the assessment, not addressed here: an error boundary around the editor, so
  that a render-time throw shows an error state instead of a blank page.
- Minor and unrelated: after a click outside the popover the focus ends on `body` instead of the ⋯
  (noted in `copy-popover-label-click/test.md`).
