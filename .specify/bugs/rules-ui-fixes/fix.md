# Bug Fix: Eight Rules UI fixes (B1, B5 applied)

- **Slug**: rules-ui-fixes
- **Fixed**: 2026-10-26
- **Assessment**: ./assessment.md
- **Status**: partial (B1, B5 applied; B2–B4, B6–B8 not yet)

## Summary

The assessment's items are applied one at a time. This report covers each item as it is fixed.

- **B1** (applied): a variant without rules now shows the dashed "No rules yet" box with 24px
  on every side, top included, as in Figma frame 1.1 (Empty wrap 6504:43840). The card still
  hugs the box and doesn't stretch to the window's height.
- **B5** (applied): the value picker of an enum rule no longer closes when the user presses on an
  option's text. Its blur handler now closes the menu only when the focus moves to a real target
  outside it, as `ChoiceMenu` and `CopyPopover` already do. The row's `<label>` then ticks the
  option, and "Select at least one option." no longer appears by mistake.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `frontend/src/pages/FormConnectionEditor/RulesStep/RulesEmptyState.tsx` | modified | B1. Wrapper `px-24 pb-24` → `p-24`; comment cites frame 1.1 instead of U11's "no space above" |
| `frontend/src/pages/FormConnectionEditor/RulesStep/RuleEditor/ValuesPicker.tsx` | modified | B5. `handleBlur` closes only for a non-null `relatedTarget` outside the container. Comment records why |

## Diff Highlights (optional)

B1:

```tsx
-    <div className="px-24 pb-24">
+    <div className="p-24">
```

The elements that can come before the box in the card (`RulesStep/index.tsx:217-227`) end in
their own padding. The box therefore sits 24px under the link strip (which has no outer
padding), and 32px under the switch note (`pb-8`) or the problems banner (`p-8`). Those
elements' own spacing was not changed.

B5:

```tsx
// Tab or Shift+Tab out of the menu. A press on an option's text blurs to nowhere
// (relatedTarget null) and must not close it; a pointer outside closes it through the listener
function handleBlur(event: FocusEvent<HTMLDivElement>) {
  const next = event.relatedTarget;
  if (open && next && !containerRef.current?.contains(next)) {
    dispatch({ type: 'closeMenu' });
  }
}
```

Other ways of closing are unchanged. A pointer outside closes the menu through the document
`pointerdown` listener. Escape closes it and returns focus to the trigger. Tab or Shift+Tab out of
the menu closes it (a non-null `relatedTarget` outside the container). No `onClick` was added to
the row, because the `<label>` already toggles the checkbox and a second handler would toggle it
twice.

## Tests Added or Updated

- None for B1: it is a CSS change only, and Vitest has no DOM. It needs a browser check (see
  Local Verification).
- None for B5. Vitest runs without a DOM (`frontend/vite.config.ts`), and the handler depends on
  focus events. The assessment calls for a browser check instead (see Local Verification).

## Local Verification

B1:

- Commands run:
  - `npx tsc -b --noEmit` → no errors
  - `npx eslint …/RulesEmptyState.tsx` → clean
  - `npx prettier --check …/RulesEmptyState.tsx` → clean
  - `npm test` → 14 files, 494 tests passed
- Manual checks: **not done**. The frontend dev server answered on `:5173`, but the backend on
  `:8000` did not, so there was no way to sign in and open the Rules step. Checks still to do in
  the app (Figma workflow, 1455×900 and 320px):
  - The box's top, left, right and bottom edges are each 24px from the card's inner border, in
    Standard.
  - The same in a based variant: 24px under the link strip.
  - The same with a switch note shown: 32px under it.

B5:

- Commands run:
  - `npx tsc -b --noEmit` → no errors
  - `npx eslint …/ValuesPicker.tsx` → clean
  - `npx prettier --check …/ValuesPicker.tsx` → clean
  - `npm test` → 14 files, 494 tests passed
- Sibling check: every other `onBlur` in `RulesStep/` and `components/` was looked at.
  `ChoiceMenu.tsx:94` and `CopyPopover.tsx:58` already have the guard. The rest are field
  `touch` or tooltip handlers, not menu closers. No other handler needs it.
- Manual checks: **not done**. No dev servers were running (`localhost:5173` and `:8000` did not
  answer). The assessment's standalone Chromium repro (`label-blur-fixed.html`, from the
  assessment session) showed the same guard ticking the option. Checks still to do in the app:
  - Chromium and Firefox: click an option's text and its box with the mouse.
  - Search field focused, then click a row.
  - Escape, Tab out, and a click outside each close the menu.
  - Ideally Safari as well.

## Deviations from Assessment

None for B1 or B5. For B1, the assessment's docs list includes "design-notes §2 empty state".
No spec document records the empty state's padding (design-notes:48 lists only its wording), so
no doc changed.

## Follow-ups

- Apply B2–B4 and B6–B8 (`/speckit-bug-fix slug=rules-ui-fixes B<n>`), adding each one to this
  report.
- Browser verification of B1 and B5 in `/speckit-bug-test`.
