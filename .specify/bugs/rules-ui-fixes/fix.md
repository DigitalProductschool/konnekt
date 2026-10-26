# Bug Fix: Eight Rules UI fixes (B1, B5, B6 applied)

- **Slug**: rules-ui-fixes
- **Fixed**: 2026-10-26
- **Assessment**: ./assessment.md
- **Status**: partial (B1, B5, B6 applied; B2–B4, B7, B8 not yet)

## Summary

The assessment's items are applied one at a time. This report covers each item as it is fixed.

- **B1** (applied): a variant without rules now shows the dashed "No rules yet" box with 24px
  on every side, top included, as in Figma frame 1.1 (Empty wrap 6504:43840). The card still
  hugs the box and doesn't stretch to the window's height.
- **B5** (applied): the value picker of an enum rule no longer closes when the user presses on an
  option's text. Its blur handler now closes the menu only when the focus moves to a real target
  outside it, as `ChoiceMenu` and `CopyPopover` already do. The row's `<label>` then ticks the
  option, and "Select at least one option." no longer appears by mistake.
- **B6** (applied): the pencil beside a message now puts the focus into it. A primary press
  anywhere in the field's box outside the textarea (the pencil, the label, the padding) focuses
  the textarea with the caret at the end of the text. This holds for the rule editor's message
  and for a group's editable message in the list; the read-only group message on the details
  page is unchanged. The pencil stays `aria-hidden` with no tab stop, and gets a pointer cursor.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `frontend/src/pages/FormConnectionEditor/RulesStep/RulesEmptyState.tsx` | modified | B1. Wrapper `px-24 pb-24` → `p-24`; comment cites frame 1.1 instead of U11's "no space above" |
| `frontend/src/pages/FormConnectionEditor/RulesStep/RuleEditor/ValuesPicker.tsx` | modified | B5. `handleBlur` closes only for a non-null `relatedTarget` outside the container. Comment records why |
| `frontend/src/utils/messageField.ts` | added | B6. `focusMessageOnPress`, the mousedown handler both message fields share |
| `frontend/src/pages/FormConnectionEditor/RulesStep/RuleEditor/MessageField.tsx` | modified | B6. Handler on the field's box; `cursor-pointer` on the pencil; doc comment |
| `frontend/src/components/GroupFrame/GroupMessage.tsx` | modified | B6. Handler on the field's box only when editable (`field`); `cursor-pointer` on the pencil; doc comment |

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

B6:

```tsx
export function focusMessageOnPress(event: MouseEvent<HTMLElement>) {
  const textarea = event.currentTarget.querySelector('textarea');
  if (event.button !== 0 || !textarea || textarea.contains(event.target as Node)) {
    return;
  }
  event.preventDefault();
  textarea.focus();
  const end = textarea.value.length;
  textarea.setSelectionRange(end, end);
}
```

```tsx
<div onMouseDown={focusMessageOnPress} className="… has-[:focus-visible]:outline-4 …">
```

A press on the textarea itself is left to the browser, so the caret lands where the user clicked.
`preventDefault` keeps the mousedown from moving the focus elsewhere (or to nowhere) after the
handler. A press on the `<label>` is handled too; its click then focuses the already focused
textarea, which changes nothing. Right and middle clicks are ignored. A textarea matches
`:focus-visible` whenever focused (it takes keyboard input), so the field's focus ring should show
after a press on the pencil.

## Tests Added or Updated

- None for B1: it is a CSS change only, and Vitest has no DOM. It needs a browser check (see
  Local Verification).
- None for B5. Vitest runs without a DOM (`frontend/vite.config.ts`), and the handler depends on
  focus events. The assessment calls for a browser check instead (see Local Verification).
- None for B6: the handler depends on DOM focus and selection, and Vitest has no DOM. Browser
  check instead (see Local Verification).

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

B6:

- Commands run:
  - `npx tsc -b --noEmit` → no errors
  - `npx eslint` on the three files → clean
  - `npx prettier --write` on the three files → unchanged
  - `npm test` → 14 files, 494 tests passed
- Manual checks: **not done**. The frontend answered on `:5173`, the backend on `:8000` did not,
  so there was no way to sign in. Checks still to do in the app (Chromium and Firefox):
  - Rule editor with a message: click the pencil → focus ring on the field, caret after the last
    character, typing appends. Same for a click in the field's padding.
  - Click inside the text → caret where clicked (unchanged).
  - A group's message in the list: same as above.
  - Empty rule message (dashed placeholder, no pencil): a click in the padding focuses it.
  - Details page: the group's read-only message doesn't react.
  - Keyboard: Tab order unchanged, no new tab stop.

## Deviations from Assessment

None for B1, B5 or B6. For B6, the handler lives in a new shared `src/utils/messageField.ts`
(not listed in the assessment), so that the two components don't duplicate it. For B1, the assessment's docs list includes "design-notes §2 empty state".
No spec document records the empty state's padding (design-notes:48 lists only its wording), so
no doc changed.

## Follow-ups

- Apply B2–B4, B7 and B8 (`/speckit-bug-fix slug=rules-ui-fixes B<n>`), adding each one to this
  report.
- Browser verification of B1, B5 and B6 in `/speckit-bug-test`.
