# Bug Fix: Eight Rules UI fixes (B1, B3, B4, B5, B6, B7, B8 applied)

- **Slug**: rules-ui-fixes
- **Fixed**: 2026-10-26
- **Assessment**: ./assessment.md
- **Status**: partial (B1, B3, B4, B5, B6, B7, B8 applied; B2 not yet)

## Summary

The assessment's items are applied one at a time. This report covers each item as it is fixed.

- **B1** (applied): a variant without rules now shows the dashed "No rules yet" box with 24px
  on every side, top included, as in Figma frame 1.1 (Empty wrap 6504:43840). The card still
  hugs the box and doesn't stretch to the window's height.
- **B3** (applied): in select mode, the bar with "N rules selected", "Cancel" and "Group rules"
  now pins under the wizard's head once the rules card's top scrolls past, and lets go when the
  user scrolls back up or reaches the card's end (Figma note 6524:38720). Pinned, it has square
  corners and a 1px line under it (Figma 6524:38485). Keyboard focus never lands under it. Its text
  now takes its own line at narrow widths, so the bar is at most 120px tall at 320px; it was 280px
  at 360px, which a pinned bar would have made unusable.
- **B4** (applied): every toast now goes after 6 seconds, including the ones with "Undo" (after
  deleting, grouping or ungrouping) and "Show" (after copying). The timer still pauses while the
  pointer or the focus is on the toast. Undo stays reachable after the toast has gone: Ctrl+Z
  (Cmd+Z on a Mac) undoes the last change until the next one. Leaving a step drops its toast, so
  it no longer comes back on return.
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
- **B8** (applied): on the details page, the closed "Rules" card now shows under its title how
  many variants and rules the connection has, e.g. "3 variants · 6 rules" (Figma 10.11
  6530:40737). Standard counts as a variant. Every distinct rule counts once, so a rule that
  variants inherit, change or remove isn't counted twice. Grouped rules count one by one, groups
  don't. The hint hides while the card is open.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `frontend/src/pages/FormConnectionEditor/RulesStep/RulesEmptyState.tsx` | modified | B1. Wrapper `px-24 pb-24` → `p-24`; comment cites frame 1.1 instead of U11's "no space above" |
| `frontend/src/pages/FormConnectionEditor/RulesStep/SelectionBar.tsx` | modified | B3. `sticky top-0 z-1`; a 1px sentinel before the bar; resting/pinned classes; the text gets `basis-192` so it wraps onto its own line when narrow; doc comment |
| `frontend/src/hooks/usePinned.ts` | added | B3. `IntersectionObserver` on the sentinel and the bar; each callback compares their tops |
| `frontend/src/utils/stickyPin.ts` | added | B3. Pure `isPinned(sentinelTop, barTop)` |
| `frontend/src/utils/stickyPin.test.ts` | added tests | B3 |
| `frontend/src/pages/FormConnectionEditor/RulesStep/constants.ts` | modified | B3. `SELECTION_BAR_STATES` (resting: 7px top corners; pinned: inset 1px bottom line), `SELECTION_SCROLL_MARGIN` |
| `frontend/src/pages/FormConnectionEditor/RulesStep/index.tsx` | modified | B3. The rules card takes `SELECTION_SCROLL_MARGIN` in select mode |
| `specs/002-connection-rules/spec.md`, `design-notes.md`, `contracts/ui-screens.md` | modified | B3. New clarification (the one exception to F19); design-notes §5 "Select mode's bar"; the F19 row names the exception |
| `frontend/src/pages/FormConnectionEditor/RulesStep/RuleEditor/ValuesPicker.tsx` | modified | B5. `handleBlur` closes only for a non-null `relatedTarget` outside the container. Comment records why |
| `frontend/src/utils/messageField.ts` | added | B6. `focusMessageOnPress`, the mousedown handler both message fields share |
| `frontend/src/pages/FormConnectionEditor/RulesStep/RuleEditor/MessageField.tsx` | modified | B6. Handler on the field's box; `cursor-pointer` on the pencil; doc comment |
| `frontend/src/components/GroupFrame/GroupMessage.tsx` | modified | B6. Handler on the field's box only when editable (`field`); `cursor-pointer` on the pencil; doc comment |
| `frontend/src/components/Toast/ToastMessage.tsx` | modified | B4. `holdAction` removed: every toast runs its 6s timer, paused on hover/focus as before |
| `frontend/src/components/Toast/index.tsx`, `types.ts` | modified | B4. `holdAction` prop removed; `onDismiss`'s doc comment records the new rule |
| `frontend/src/pages/FormConnectionEditor/RulesStep/utils.ts` | modified | B4. `dismissToast` keeps `undo` (still drops `showBranch`); `changed()`'s comment |
| `frontend/src/pages/FormConnectionEditor/utils.ts` | modified | B4. `goToStep` clears `toast` and `removed` |
| `frontend/src/pages/FormConnectionEditor/index.tsx` | modified | B4. No `holdAction`; the step-change effect dismisses the rules toast; `undoRules()` split out of `handleRulesToastAction`; `useUndoShortcut` |
| `frontend/src/hooks/useUndoShortcut.ts` | added | B4. Document keydown listener for Ctrl/Cmd+Z while enabled; skips text fields and an open `<dialog>` |
| `frontend/src/utils/undoShortcut.ts` | added | B4. Pure `isUndoShortcut` and `keepsOwnUndo` |
| `frontend/src/utils/undoShortcut.test.ts` | added tests | B4 |
| `frontend/src/pages/FormConnectionEditor/RulesStep/utils.test.ts` | added tests | B4. Undo kept after the toast goes, dropped by the next change; Show dropped with its toast |
| `frontend/src/pages/FormConnectionEditor/utils.test.ts` | added test | B4. `goToStep` drops the documents toast and its Undo |
| `specs/002-connection-rules/design-notes.md` | modified | B4. §10 "Timing" rewritten with the new rule and its date |
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
| `frontend/src/pages/FormConnectionDetail/utils.ts` | modified | B8. `rulesCountsOf(branches)`: variant count and distinct countable rule ids (removed items skipped, as `countRules` does) |
| `frontend/src/pages/FormConnectionDetail/constants.ts` | modified | B8. `DETAIL_COPY.rulesCounts(variants, rules)`, pluralised, joined with " · " |
| `frontend/src/pages/FormConnectionDetail/RulesSummary.tsx` | modified | B8. Muted `<p hidden={open}>` under the h2; doc comment no longer says the counts aren't built |
| `frontend/src/pages/FormConnectionDetail/utils.test.ts` | added tests | B8. `describe('rulesCountsOf')` |
| `specs/002-connection-rules/spec.md` | modified | B8. Clarification in "Session 2026-10-26 (bug fixes)"; it supersedes the "no counters" answer for these two counts only |
| `specs/002-connection-rules/design-notes.md` | modified | B8. §7 details: the hint is back, with Figma 10.11's values and the counting rule |
| `specs/002-connection-rules/contracts/ui-screens.md` | modified | B8. F25 row: the rules card's counts are the exception |

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

B3:

```tsx
<div ref={sentinelRef} aria-hidden="true" className="-mb-px h-px" />
<div
  ref={barRef}
  className={`bg-kern-layout-background-hued sticky top-0 z-1 flex flex-wrap items-center gap-8 px-16 py-8 ${SELECTION_BAR_STATES[pinned ? 'pinned' : 'resting']}`}
>
```

```ts
// hooks/usePinned.ts
const observer = new IntersectionObserver(() => {
  setPinned(isPinned(sentinel.getBoundingClientRect().top, bar.getBoundingClientRect().top));
});
observer.observe(sentinel);
observer.observe(bar);
```

The observer uses the viewport root. Every scrolling ancestor clips the intersection, so it
follows whichever area scrolls at the current width: the step's body at `split:`, the whole area
below the header otherwise. The sentinel shares the bar's top while the bar rests. Once the bar
pins, the sentinel scrolls on above it. The first version watched only the sentinel and read
`isIntersecting`. The browser check showed it stuck in the pinned look after a single jump back to
the top (Home, dragging the scrollbar): the sentinel went from out of view above to out of view
below, with no callback between. Watching the bar too catches that jump, because the bar leaves
the view instead. Each callback now compares the two tops.

`z-1` puts the bar over the rows' select boxes (`absolute`) and KERN buttons (`relative`). The
popups (z-20) and the user menu (z-10, in the sticky header outside the scroller) stay above it.
The pinned line is an inset box shadow, not a border, so pinning doesn't move the rows by 1px.

Focus not obscured: in select mode, the card gives every descendant `scroll-margin-top` 72px
(the bar's 64px and 8px to spare), and 152px below 640px, where the buttons wrap under the text
(up to 144px with three lines of text).

B4:

```ts
// RulesStep/utils.ts: the toast goes, its Undo stays until the next change
case 'dismissToast':
  return { ...state, toast: null, showBranch: null };
```

```tsx
// FormConnectionEditor/index.tsx
useUndoShortcut(state.step === 'rules' && rules.undo !== null && !rules.editing, undoRules);
```

The shortcut does nothing:

- in a text field (`input` that takes text, `textarea`, `select`, contenteditable), which keeps
  the browser's own undo;
- while a modal `<dialog>` is open (every dialog of the wizard is `ConfirmDialog`'s
  `showModal()`);
- while the rule editor is open;
- for Shift+Ctrl+Z, Alt, a held key, or an event already handled.

On a checkbox (select mode), a button or the page, it undoes. It shares `undoRules()` with the
toast's Undo, so the focus goes to the restored item. Leaving a step: `goToStep` clears the editor
state's `toast` and `removed`, and the existing step-change effect dispatches the rules
`dismissToast`, which keeps `undo`, so Ctrl+Z still works on return until the next change.

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

B8:

```ts
// pages/FormConnectionDetail/utils.ts
export function rulesCountsOf(branches: Pick<BranchInput, 'items'>[]): string {
  const ruleIds = new Set(branches.flatMap((branch) => countableRuleIds(branch.items)));
  return DETAIL_COPY.rulesCounts(branches.length, ruleIds.size);
}
```

```tsx
// RulesSummary.tsx, in the title column under the h2
<p
  hidden={open}
  className="text-kern-static-small text-kern-layout-text-muted leading-(--kern-typography-line-height-medium-static)"
>
  {counts}
</p>
```

The classes are the Documents card's hint's (`DocumentsSummary.tsx`), which match Figma 10.11's
"body/small/regular" (14/24, `layout-text-muted`). Figma's title column has no gap, so none was
added. Figma's line also starts with "2 documents · 9 data items". That part was left out because
the report asks only for variants and rules, and the Documents card next to it already lists the
documents.

## Tests Added or Updated

- None for B1: it is a CSS change only, and Vitest has no DOM. It needs a browser check (see
  Local Verification).
- None for B5. Vitest runs without a DOM (`frontend/vite.config.ts`), and the handler depends on
  focus events. The assessment calls for a browser check instead (see Local Verification).
- None for B6: the handler depends on DOM focus and selection, and Vitest has no DOM. Browser
  check instead (see Local Verification).

- B3, `src/utils/stickyPin.test.ts`: `isPinned` is false while the sentinel rests on the bar (in
  view or below it) and for subpixel rounding, and true once the sentinel is above the bar. The
  sticky position, the observer and the scroll margin need a DOM and were checked in the browser.

- B4, `src/utils/undoShortcut.test.ts`: `isUndoShortcut` takes Ctrl+Z, Cmd+Z and Caps Lock's
  "Z", and ignores Z alone, Shift (redo), Alt, Ctrl+Cmd, other keys and a held key.
  `keepsOwnUndo` is true for text inputs, textareas and contenteditable, and false for buttons,
  checkboxes, the body and no focus.
- B4, `RulesStep/utils.test.ts › undo after other changes`: `keeps the Undo after its toast has
  gone, for Ctrl/Cmd+Z` and `drops the kept Undo with the next change`.
  `› copying … › drops the Show with its toast, which has no shortcut`.
- B4, `FormConnectionEditor/utils.test.ts › editorReducer and the toast on leaving a step`:
  `goToStep` clears `toast` and `removed`.

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
- B8, `src/pages/FormConnectionDetail/utils.test.ts › rulesCountsOf (Figma 10.11, B8)`:
  - "1 variant · 0 rules" for Standard without rules.
  - "1 variant · 1 rule" (singular).
  - The rules in groups and sub-groups count one by one, the groups don't (4 rules).
  - Standard (3 rules), a based variant that inherits, changes and removes them and adds one, and
    an empty variant with 2 rules: "3 variants · 6 rules".
  - The rules of a removed group, and a removed rule, don't count when no other branch holds them.
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

B3:

- Commands run:
  - `npx prettier --write` on the six files → unchanged
  - `npx tsc -b --noEmit` → no errors
  - `npx eslint src/hooks src/utils/stickyPin* src/pages/FormConnectionEditor/RulesStep` → clean
  - `npm test` → 16 files, 517 tests passed (514 before, 3 new)
- Manual checks, done in Chromium (Playwright). The dev server ran on `:5173` and the API was mocked
  in the browser (`/api/auth/me`, `/api/document-types`, `/api/option-sets`, a connection with 18
  rules), since no backend was up. Edit wizard › Rules › Rule 1's ⋯ › "Group with other rules":
  - 1455×900 (`split:`): at rest, top 362, 64px tall, 7px corners, no shadow. Pinned at scroll 900:
    top 296 (the step's scroller top, under the head), 64px, square corners, inset 1px line in
    `decorative-border-default`, z-index 1. Back at scroll 0: rest again, 7px corners.
  - 1455×600 (below `split:`, the whole area scrolls): pinned at top 64, under the app header.
  - 727×450 (200% zoom of 1455×900): pinned, 64px.
  - 320×640: 120px tall with the buttons wrapped under the text, pinned at 109, and back to rest
    after a single jump to the top. That jump is what showed the observer bug described above.
  - Bar height by width, after the fix: 120px up to 480px, 64px from 520px. Before the fix it was
    144 / 280 / 160 / 112 / 88px at 320 / 360 / 400 / 440 / 480px.
  - Keyboard: with the bar pinned, 14 × Shift+Tab upward from Rule 18's box (boxes, names, ⋯,
    connectors). No focused element was under the bar, at 1455×900 and at 320×640.
  - Ticking a rule's box with Space while pinned: the status reads "2 rules selected".
  - A row's ⋯ menu opened just below the pinned bar is painted on top (`elementFromPoint`). The
    user menu (header) opens outside the scroller and isn't reached by the bar.
  - Screenshots compared with Figma 12.2 (bar pinned under the head, rows scroll beneath it).
    Saved to the scratchpad (`b3-pinned.png`, `b3-320-pinned.png`), not part of the repo.
- Not checked: Firefox and Safari, and a variant's link strip (the mock had only Standard). Per
  the code, the strip is a sibling before the bar and scrolls away.

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

B4:

- Commands run:
  - `npx tsc -b --noEmit` → no errors
  - `npx eslint` on the changed folders and files (react-hooks rules on) → clean
  - `npx prettier --write` → two files reformatted, then clean
  - `npm test` → 15 files, 509 tests passed (501 before, 8 new)
- Manual checks: **not done** (no backend to sign in with, as for the other items). Checks still to
  do in the app:
  - Group two rules: the toast with "Undo" goes after 6s, and stays while hovered or focused.
  - After it goes, Ctrl+Z (Cmd+Z on a Mac) with the focus on the page or a rule's ⋯ restores the
    rules and focuses the item.
  - Ctrl+Z in a rule name being renamed or in a group's message undoes the typing, not the rules.
  - Ctrl+Z does nothing with a dialog open or the rule editor open, and nothing after a later
    change.
  - A copy's "Show" toast goes after 6s.
  - Leave the Rules step with a toast shown and come back: no toast. The same for the documents
    step's "removed" toast.
  - Screen reader: each toast is still announced once.

B8:

- Commands run:
  - `npx prettier --write` on the four files → unchanged
  - `npx tsc -b --noEmit` → no errors
  - `npx eslint src/pages/FormConnectionDetail` → clean
  - `npm test` → 15 files, 514 tests passed (509 before, 5 new)
- Figma: `get_design_context` on 6530:40737 (the collapsed Summary card), for the hint's type,
  colour and gap. No asset from it is used ("Download PDF" stays unbuilt).
- Manual checks: **not done**. Neither `:5173` nor `:8000` answered, so there was no way to sign
  in. Checks still to do in the app (Figma workflow, 1455×900 and 320px):
  - A published connection with variants: the closed card reads e.g. "3 variants · 6 rules" under
    "Rules", 14/24 muted, flush under the title.
  - "View summary" hides the hint, and "Hide summary" shows it again.
  - At 320px the actions still wrap under the title column.
  - A screen reader reads the hint after the heading while the card is closed.

## Deviations from Assessment

None for B1, B5 or B6. For B6, the handler lives in a new shared `src/utils/messageField.ts`
(not listed in the assessment), so that the two components don't duplicate it. For B1, the assessment's docs list includes "design-notes §2 empty state".
No spec document records the empty state's padding (design-notes:48 lists only its wording), so
no doc changed.

For B3:

- **Narrow layout** (scope expansion): the bar's text got `basis-192`. The assessment didn't ask
  for it. Before, the text had `flex-1` with a zero basis and never wrapped onto its own line, so
  it was squeezed beside the buttons: 280px tall at 360px. Pinned, that would cover half the
  screen.
- **Pinned detection**: the assessment proposed an observer on the sentinel alone. That missed
  single scroll jumps (see Diff Highlights), so the bar is observed too and the decision compares
  positions. Logic in `hooks/usePinned.ts` and `utils/stickyPin.ts`, files the assessment didn't
  name.
- **Pinned line**: an inset shadow instead of the 1px bottom border, so the rows don't shift when
  the bar pins.
- **Scroll margin**: on every descendant of the card in select mode (`**:scroll-mt-*`), not only
  the rows and boxes. 72px, and 152px below 640px, both measured in the browser.
- Docs: `figma-audit/report.md` was left as it is, as for B7 and B8. The spec's clarification,
  design-notes §5 and the F19 row record the change.

For B4:

- The shortcut sits in a new hook, `src/hooks/useUndoShortcut.ts`, with its pure key checks in
  `src/utils/undoShortcut.ts` (and tests). The assessment named only `RulesStep/index.tsx` for it;
  the editor page owns the rules state and the focus after Undo, so the hook is called there
  instead.
- The shortcut is also off while the rule editor or a dialog is open, which the assessment didn't
  ask for. While the editor is open, a Ctrl+Z on one of its menus would otherwise silently change
  the rules behind the draft.
- `goToStep` also clears the documents step's `removed` with its toast: its Undo would otherwise
  outlive the toast with no way to reach it.
- No doc comment at `components/Toast/types.ts:12-17` to update: that comment was on `holdAction`,
  which is gone; `onDismiss`'s comment records the rule instead.

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

For B8:

- The assessment's open question on a connection without rules is decided by its default: "0
  rules" ("1 variant · 0 rules"), following the `items` pattern. It is recorded in the spec's
  clarification.
- Docs: the assessment also lists `contracts/ui-screens.md:366` (FYI #17) and
  `figma-audit/report.md` (:64, :127). They were left as they are, as for B7's F1 rows: they
  record the audit's decisions of 2026-10-24. The live F25 contract row, design-notes §7 and the
  spec's new clarification record the change. design-notes' T077 log entry (:543) stays as history.

## Follow-ups

- Apply B2 (`/speckit-bug-fix slug=rules-ui-fixes B2`), adding it to this report.
- B3: check in Firefox and Safari, and in a based variant (the link strip scrolls away, the bar
  pins). Check against a real backend once one is available.
- Browser verification of B1, B4, B5, B6, B7 and B8 in `/speckit-bug-test` (B3 has had a Chromium check against a mocked API).
- B8: if the reporter expects the rules summed per variant rather than counted once, only
  `rulesCountsOf` changes.
- B4: nothing in the UI mentions Ctrl/Cmd+Z. If users should know, the Undo toast or the delete
  dialogs' "You can undo this right after." could name it; that is a copy decision for the
  reporter.
- B7: if the reporter also wants "(Age)" in the documents step's rule-removal dialogs ("Stop
  requesting Date of birth?"), that is a documents-step string and was left out by the "only in the
  rules" scope.
