# Bug Fix: Eight Rules UI fixes (B1, B5, B6, B7 applied)

- **Slug**: rules-ui-fixes
- **Fixed**: 2026-10-26
- **Assessment**: ./assessment.md
- **Status**: partial (B1, B5, B6, B7 applied; B2–B4, B8 not yet)

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
- **B7** (applied): the rules UI now calls the date of birth "Date of birth (Age)". This applies
  to the data menu and its search, the chosen data, and every statement, so the rule rows, the
  publish dialog, the details page and the delete dialog all change. The new
  `ruleFieldLabel(field)` returns it for a field with `date_of_birth`, in the PID and in the mDL.
  The documents step, the citizen-facing messages (proposed or written), the editor's hints,
  the validation messages (the server's words) and the backend keep "Date of birth".

## Changes

| File | Change | Notes |
|------|--------|-------|
| `frontend/src/pages/FormConnectionEditor/RulesStep/RulesEmptyState.tsx` | modified | B1. Wrapper `px-24 pb-24` → `p-24`; comment cites frame 1.1 instead of U11's "no space above" |
| `frontend/src/pages/FormConnectionEditor/RulesStep/RuleEditor/ValuesPicker.tsx` | modified | B5. `handleBlur` closes only for a non-null `relatedTarget` outside the container. Comment records why |
| `frontend/src/utils/messageField.ts` | added | B6. `focusMessageOnPress`, the mousedown handler both message fields share |
| `frontend/src/pages/FormConnectionEditor/RulesStep/RuleEditor/MessageField.tsx` | modified | B6. Handler on the field's box; `cursor-pointer` on the pencil; doc comment |
| `frontend/src/components/GroupFrame/GroupMessage.tsx` | modified | B6. Handler on the field's box only when editable (`field`); `cursor-pointer` on the pencil; doc comment |
| `frontend/src/utils/rules/constants.ts` | modified | B7. `DATE_OF_BIRTH_RULE_LABEL = 'Date of birth (Age)'` |
| `frontend/src/utils/rules/statements.ts` | modified | B7. New `ruleFieldLabel(field)`; `dataOfResolved` uses it for a field without parts, which `subjectOfResolved` and the statements follow; comments |
| `frontend/src/pages/FormConnectionEditor/RulesStep/RuleEditor/utils.ts` | modified | B7. `dataSections` labels its choices with `ruleFieldLabel`, so the data menu's search (`matchesSearch` on the label) finds "age" too |
| `frontend/src/pages/FormConnectionEditor/RulesStep/RuleEditor/index.tsx` | modified | B7. The data picker's chosen value uses `ruleFieldLabel` |
| `frontend/src/utils/rules/statements.test.ts` | updated + added tests | B7. Expectations now read "Date of birth (Age)"; new `describe('ruleFieldLabel')` |
| `frontend/src/pages/FormConnectionEditor/RulesStep/RuleEditor/utils.test.ts` | added tests | B7. Data menu, its search, the check menu's headings, the missing-value note |
| `frontend/src/utils/rules/messages.test.ts` | added test | B7. A from-now message on the date of birth keeps "date of birth", without "(Age)" |
| `frontend/src/pages/FormConnectionEditor/RulesStep/utils.test.ts` | updated | B7. The delete dialog's input statement reads "(Age)" (the test passes the statement in; the text is only made consistent) |
| `specs/002-connection-rules/spec.md` | modified | B7. New "Session 2026-10-26 (bug fixes)" clarification; FR-005's example |
| `specs/002-connection-rules/contracts/ui-screens.md` | modified | B7. The rule list's example statement (S2) |
| `specs/002-connection-rules/design-notes.md` | modified | B7. §3 date pickers: the field's rules name, and why the "Date of birth" section keeps its name |

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

B7:

```ts
/**
 * A field's name in the rules UI: "Date of birth (Age)" for the date of birth (B7), the catalog's
 * label otherwise. Messages, hints and validation keep `field.label`, the citizen's wording.
 */
export function ruleFieldLabel(field: DocumentField): string {
  return field.date_of_birth ? DATE_OF_BIRTH_RULE_LABEL : field.label;
}

export function dataOfResolved({ field, part, licenceClass }: ResolvedTarget): string {
  if (!part) {
    return ruleFieldLabel(field);
  }
  …
```

The branches below `if (!part)` still use `field.label`. That is safe because a field with parts
is never a date of birth (`resolveTarget` sets `dateOfBirth: false` for parts).

Where "Date of birth" stays, deliberately:

- `messages.ts` (proposed messages, e.g. "The date of birth of your personal ID must …").
- `RuleEditor/utils.ts` `checkedDateOf` (the missing-value note: "If the date of birth is
  missing …").
- `validation.ts` `unknownPart` (the server's words).
- The documents step.
- The backend.

## Tests Added or Updated

- None for B1: it is a CSS change only, and Vitest has no DOM. It needs a browser check (see
  Local Verification).
- None for B5. Vitest runs without a DOM (`frontend/vite.config.ts`), and the handler depends on
  focus events. The assessment calls for a browser check instead (see Local Verification).
- None for B6: the handler depends on DOM focus and selection, and Vitest has no DOM. Browser
  check instead (see Local Verification).

- B7, `src/utils/rules/statements.test.ts`:
  - Existing statement, parts and `dataOfResolved` expectations now read "Date of birth (Age)" for
    the PID and the mDL.
  - `ruleFieldLabel › names the date of birth as an age in the rules only (B7)` and `› keeps the
    catalog's label for every other field`.
- B7, `src/pages/FormConnectionEditor/RulesStep/RuleEditor/utils.test.ts`, `date of birth in the
  rule editor (B7)`:
  - The data menu lists "Date of birth (Age)" (PID and mDL), not "Date of birth".
  - The search finds it by "age" and by "birth".
  - The check menu's headings stay "Age", "Time from now", "Date of birth".
  - The missing-value note says "If the date of birth is missing" without "(Age)".
- B7, `src/utils/rules/messages.test.ts › date of birth in messages (B7)`: a from-now message on
  the date of birth reads "…date of birth of your personal ID…", without "(age)".
- `validation.test.ts:280-281` and `FormConnectionEditor/utils.test.ts:224,292` were left
  unchanged and still pass. They pin the server's words and the documents step's "Stop requesting
  Date of birth?".

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

B7:

- Commands run:
  - `npx tsc -b --noEmit` → no errors
  - `npx eslint` on the 8 changed frontend files → clean
  - `npx prettier --check` → one test file reformatted with `--write`, then clean
  - `npm test` (`vitest run`) → 14 files, 501 tests passed (494 before, 7 new)
- Manual checks: **not done** (no backend to sign in with, as for the other items). Checks still to
  do in the app:
  - Data menu of the PID and the mDL shows "Date of birth (Age)", and typing "age" finds it.
  - The chosen data and the saved row read "Personal ID – Date of birth (Age) is at least 21
    years old".
  - The details page and the delete dialog say the same.
  - The documents step still says "Date of birth".
  - A proposed message still says "date of birth".

## Deviations from Assessment

None for B1, B5 or B6. For B6, the handler lives in a new shared `src/utils/messageField.ts`
(not listed in the assessment), so that the two components don't duplicate it. For B1, the assessment's docs list includes "design-notes §2 empty state".
No spec document records the empty state's padding (design-notes:48 lists only its wording), so
no doc changed.

For B7:

- The assessment's open question on the check menu's "Date of birth" section heading is decided:
  it keeps its name. It doesn't name the field as data. It names the section of fixed-date checks
  ("is before / is after / is <date>"), and it sits below the "Age" section. "Date of birth (Age)"
  there would label as an age the one section that isn't one. Recorded in design-notes §3 and in
  the spec's new clarification.
- Docs: the assessment lists the F1 rows of `contracts/ui-screens.md` (:216, :259, :281, :300).
  Those rows are the record of the old Figma deviations, so they were left as they are; the new
  dated clarification in `spec.md` supersedes their example. Only the live S2 contract line (:63)
  and FR-005's example were updated.

## Follow-ups

- Apply B2–B4 and B8 (`/speckit-bug-fix slug=rules-ui-fixes B<n>`), adding each one to this
  report.
- Browser verification of B1, B5, B6 and B7 in `/speckit-bug-test`.
- B7: if the reporter also wants "(Age)" in the documents step's rule-removal dialogs ("Stop
  requesting Date of birth?"), that is a documents-step string and was left out by the "only in the
  rules" scope.
