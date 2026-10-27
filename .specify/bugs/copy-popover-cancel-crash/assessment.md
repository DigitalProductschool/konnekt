# Bug Assessment: Cancel in "Copy to variant" crashes the Rules editor

- **Slug**: copy-popover-cancel-crash
- **Created**: 2026-10-26
- **Source**: pasted text (found during `/speckit-bug-test` of `copy-popover-label-click`, see
  `.specify/bugs/copy-popover-label-click/test.md`, "Residual Risks")
- **Verdict**: valid
- **Severity**: high

## Report (verbatim or summarized)

> Clicking "Cancel" in the rule's "Copy to variant" popover (Rules step, rule ⋯ › Copy to variant)
> crashes the whole editor: the page goes blank and unsaved rule edits are lost. Mouse click and
> keyboard Enter on Cancel both crash it. Escape, Copy, Tab out and a click outside work.
>
> The crash also happens with that fix's tabIndex removed, so it was already there before that fix.
>
> Page error: "TypeError: targets.map is not a function" at copyFromDialog
> (RulesStep/utils.ts:515) ← rulesReducer, case 'copyRule'; then "An error occurred in the
> \<FormConnectionEditorPage\> component", which unmounts the page.
>
> Suspected cause: CopyPopover.tsx renders Cancel with onClick={onClose}. RuleListItem.tsx passes
> closeCopy as both onCopy and onClose, and closeCopy(targets?: string[]) dispatches
> { type: 'copyRule', targets } whenever targets is truthy. React passes the click event as the
> first argument, so the event is dispatched as targets. Escape doesn't crash because handleKeyDown
> calls onClose() with no arguments. TypeScript doesn't catch it because a function with an
> optional parameter fits onClose's type.
>
> Expected: Cancel closes the popover without copying, and the focus returns to the rule's ⋯, as
> Escape does.

The earlier test report recorded the same failure in Chromium and Firefox
(`pageerrors: ["targets.map is not a function"]`, `page still rendered: false`).

## Symptom

Activating Cancel in the "Copy to variant" popover, by mouse or by Enter/Space, throws in the rules
reducer and unmounts `FormConnectionEditorPage`. The page goes blank and every unsaved change in
the wizard is lost. Cancel should close the popover without copying and put the focus back on the
rule's ⋯, as Escape does.

## Reproduction

1. Sign in and open a connection that has at least 2 variants (Standard + one more) in the edit
   wizard, or create one.
2. Go to the Rules step.
3. Open a rule's ⋯ menu and choose "Copy to variant".
4. Activate Cancel, by mouse click or with Tab to Cancel and Enter. No variant needs to be ticked.
5. Observed: the page goes blank, and the console shows `TypeError: targets.map is not a function`
   followed by React's "An error occurred in the \<FormConnectionEditorPage\> component".

Control paths that do **not** crash: Escape, Copy (with a variant ticked), Tab out of the popover,
and a pointer press outside it.

## Suspected Code Paths

- `frontend/src/pages/FormConnectionEditor/RulesStep/CopyPopover.tsx:111`: Cancel is
  `onClick={onClose}`. React calls `onClose(event)` with the `MouseEvent`, and Enter/Space on a
  `<button>` fire a synthetic click, which is also a `MouseEvent`.
- `frontend/src/pages/FormConnectionEditor/RulesStep/RuleListItem.tsx:42-45`: `closeCopy(targets?:
  string[])` serves both copy and close: `dispatch(targets ? { type: 'copyRule', targets } :
  { type: 'closeDialog' })`. A `MouseEvent` is truthy, so it dispatches `copyRule` with the event
  as `targets`.
- `frontend/src/pages/FormConnectionEditor/RulesStep/RuleListItem.tsx:100-101`: the same
  `closeCopy` is passed as both `onCopy` and `onClose`.
- `frontend/src/pages/FormConnectionEditor/RulesStep/types.ts:484-487`: `onCopy: (targets:
  string[]) => void` and `onClose: () => void`. Under TypeScript's parameter-arity rules,
  `(targets?: string[]) => void` can be assigned to `() => void`. `onClick={onClose}` then
  type-checks because a `() => void` can be assigned to a `MouseEventHandler`. Each step is legal,
  so the compiler never sees the event reach `targets`.
- `frontend/src/pages/FormConnectionEditor/RulesStep/utils.ts:860-861` → `utils.ts:515`
  (`copyFromDialog`) → `utils.ts:529`: `targets.map(...)` throws on the event object.
- The reducer runs during render, and the app has no error boundary (no `ErrorBoundary` or
  `errorElement` anywhere in `frontend/src`). React 19 therefore unmounts the whole route, and the
  wizard's unsaved state, kept in the page's reducer until Save, is lost.

The other close paths in `CopyPopover.tsx` don't pass an argument: Escape at `:56` calls
`onClose()`, and the outside pointer press at `:45` calls `closeRef.current()`. Tab out goes to
`onDismiss`, which dispatches `closeDialog` directly. This matches the report.

A sweep of the frontend found no other component affected. `closeCopy` is the only `.tsx` callback
declared with an optional parameter. Every other `onClick={onX}` is either typed `() => void` and
given a zero-argument function, or wrapped in an arrow by its parent (for example
`WizardProgress` → `() => onSelect(index)`, `DocumentPicker` → `() => onRemove(documentType)`).

## Root Cause Hypothesis

`RuleListItem` overloads one function, `closeCopy(targets?: string[])`, to mean "copy" when it
gets an argument and "close" when it gets none, and hands it to `CopyPopover` as both `onCopy` and
`onClose`. `CopyPopover` wires Cancel as `onClick={onClose}`, so React passes the click event as the
first argument, and `closeCopy` takes that truthy event for a list of targets. It dispatches
`{ type: 'copyRule', targets: <MouseEvent> }`, and `copyFromDialog` throws on `targets.map`. With no
error boundary, the page unmounts. TypeScript's parameter-arity compatibility lets the overload
through both prop boundaries. **Confidence: high.** The stack trace, the code and the control paths
that work (Escape and the outside press call with no argument) all agree.

## Proposed Remediation

**Preferred**: Remove the overload in `RuleListItem.tsx`. Use two callbacks with exact signatures:

- `closeCopy()` takes no parameters. It dispatches `{ type: 'closeDialog' }` and moves the focus
  back to the rule's ⋯ (`[aria-haspopup=menu]` inside `actionsRef`).
- `copyTo(targets: string[])` dispatches `{ type: 'copyRule', targets }` and moves the focus back
  to the ⋯ the same way. It can share a small helper with `closeCopy` for the focus, or call the
  dispatch and then the same focus line.

Pass `onCopy={copyTo}` and `onClose={closeCopy}`. Even if a caller passes an event, a zero-argument
`closeCopy` ignores it, so the reducer can no longer receive it.

As a cheap second guard, also change Cancel in `CopyPopover.tsx` to `onClick={() => onClose()}`.
This matches the Escape path and keeps the DOM event out of any `() => void` prop, whatever the
parent passes later. Update the component's doc comment and the `closeCopy` comment if they no
longer describe the code.

**Alternatives**:

- *Only `onClick={() => onClose()}` in `CopyPopover`.* This is one line and fixes the symptom, but
  it leaves the overloaded `closeCopy` in `RuleListItem`. The next `onClick={onClose}`-style wiring
  would bring the bug back. Acceptable as a minimal hotfix, not preferred.
- *Guard in the reducer (`Array.isArray(targets)` in `copyFromDialog`).* Rejected. It hides a
  wiring bug behind a silent no-op, and the action is typed `targets: string[]`.
- *An error boundary around the editor.* This would make any future render-time throw less
  destructive, but the wizard's state would still be lost, and it is a separate, wider design
  decision. Out of scope here; listed under Open Questions.

**Files likely to change**:

- `frontend/src/pages/FormConnectionEditor/RulesStep/RuleListItem.tsx`
- `frontend/src/pages/FormConnectionEditor/RulesStep/CopyPopover.tsx` (second guard, comment)

**Tests to add or update**:

- The frontend's Vitest suite runs in Node without a DOM, and covers only pure functions
  (`vite.config.ts`: "The unit tests cover pure functions only"). The component wiring can't be
  unit-tested without adding jsdom and Testing Library, which are new dependencies and out of scope
  for this fix. The existing reducer tests in `RulesStep/utils.test.ts` already cover `copyRule`
  with real target arrays, and the reducer itself is correct.
- Optional reducer test in `utils.test.ts`: `askCopyRule` then `closeDialog` leaves the branches,
  counters and toast as they were and clears `dialog`. This documents the close path the fix
  dispatches.
- End-to-end verification in `/speckit-bug-test` (Playwright MCP, Chromium and Firefox, reusing
  `.playwright-mcp/copy-popover-*.js` from the previous bug):
  - Cancel by mouse with nothing ticked: the popover closes, there are no page errors, the editor
    is still rendered, nothing is copied, and the focus is on the rule's ⋯.
  - Cancel by mouse with a variant ticked: same as above, and nothing is copied.
  - Cancel by keyboard (Tab to Cancel, Enter; also Space): same as above.
  - Regression checks: Escape, Copy (toast "… copied to …", focus on ⋯), Tab out, outside click,
    and the variant-name click fixed in `copy-popover-label-click`.
  - `npm test`, `npm run lint`, `npx prettier --check`, `npx tsc -b --noEmit` all pass.

## Risks & Considerations

- **Low change risk.** Two frontend files, no API, schema, migration or backend change. Copying
  stays client-side until Save.
- **Focus behaviour must stay the same.** Copy and Cancel/Escape both return the focus to the
  rule's ⋯ today. The split must keep that for both callbacks, or keyboard users lose their place
  (WCAG 2.4.3).
- **Outside-click focus**: the earlier test noted that the focus ends on `body` after a click
  outside. That is a separate, minor issue. The fix shouldn't try to change it.
- **Type-system blind spot**: the compiler can't catch this pattern. Avoid overloaded callbacks
  with optional parameters passed as event handlers. A lint rule could flag them, but none exists
  in the current ESLint configuration, and adding one is out of scope.
- **Data loss**: until this is fixed, every crash discards the user's unsaved rule edits. This is
  why the bug is rated high rather than medium.

## Open Questions

- Should the editor get an error boundary, so that a render-time throw shows an error state
  instead of a blank page? This is out of scope for this fix and would need its own decision and
  design. It wouldn't keep the unsaved state either.
- No clarification is needed for the fix itself. The expected behaviour (close without copying,
  focus back on the ⋯) is stated in the report and matches the Escape path and the component's
  documented contract ("Escape, Cancel and a click elsewhere close it").
