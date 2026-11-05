# Bug Fix: A draft's details highlight the wrong step in the progress bar

- **Slug**: draft-view-stepper
- **Fixed**: 2026-11-05
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

`WizardProgress` gets an optional `reached` prop, separate from `current`, which says how many
steps are done. A draft's details now always show Publish as current. Only the steps up to the
stored step are done and linked. The steps in between use the existing to-do style and are not
links. Without `reached`, the editor and a published connection's details render as before.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `frontend/src/components/WizardProgress/types.ts` | modified | Optional `reached?: number` on `WizardProgressProps`, defaults to `current` |
| `frontend/src/components/WizardProgress/utils.ts` | added | Pure `stepStateOf(index, current, reached)`, replacing the inline `stateOf` |
| `frontend/src/components/WizardProgress/utils.test.ts` | added test | Wizard, published and draft cases |
| `frontend/src/components/WizardProgress/index.tsx` | modified | Uses `stepStateOf`; a step links back only when `index < reached` |
| `frontend/src/pages/FormConnectionDetail/DraftDetails.tsx` | modified | `current={CONNECTION_STEPS.length - 1}` (Publish), `reached={reachedStepsOf(draft.step)}`; doc comment updated |
| `frontend/src/pages/FormConnectionDetail/utils.ts` | modified | `reachedStepsOf`'s doc comment says it is passed as `reached` (comment only) |
| `specs/005-connection-drafts/contracts/ui-screens.md` | modified | S6 "Progress": Publish is current; the steps between are to do, an interim look until Figma has a design |

`WizardStep.tsx`, styles and copy are unchanged, as agreed ("least damage" until Figma has a
design).

## Diff Highlights

```tsx
// components/WizardProgress/utils.ts
export function stepStateOf(index: number, current: number, reached: number): WizardStepState {
  if (index === current) {
    return 'current';
  }
  return index < reached ? 'done' : 'todo';
}
```

```tsx
// pages/FormConnectionDetail/DraftDetails.tsx
<WizardProgress
  steps={CONNECTION_STEPS}
  current={CONNECTION_STEPS.length - 1}
  reached={reachedStepsOf(draft.step)}
  onSelect={continueAt}
/>
```

Result per stored step (✓ done and linked, ○ to do, ● current):

| `draft.step` | Connection | Documents | Rules | Test | Publish |
|---|---|---|---|---|---|
| `connection` | ✓ | ○ | ○ | ○ | ● |
| `documents` | ✓ | ✓ | ○ | ○ | ● |
| `rules` | ✓ | ✓ | ✓ | ○ | ● |
| `test` | ✓ | ✓ | ✓ | ✓ | ● |

## Tests Added or Updated

- `frontend/src/components/WizardProgress/utils.test.ts`:
  - "finishes every step before the current one in the wizard (reached = current)": guards the
    default behaviour that the editor relies on.
  - "finishes every step of a published connection": `current = reached = 5`, every step done.
    This is `ConnectionDetails`' case.
  - "leaves the steps a draft hasn't reached to do, with Publish current": `current = 4` with
    `reached` 1, 2 and 4.
- The existing `reachedStepsOf (S6)` cases in `FormConnectionDetail/utils.test.ts` are unchanged
  and pass.

## Local Verification

- `npx prettier --check` on the changed frontend files → all formatted.
- `npm run lint` → clean.
- `npx vitest run src/components/WizardProgress src/pages/FormConnectionDetail` → 2 files, 22
  tests passed.
- `npm test` (full suite) → 2728 passed, 2 failed, and 3 failed on a second run. All the failures
  were time-budget tests in `src/utils/rules/personas/performance.test.ts` and
  `src/utils/rules/checks/findings.test.ts` (one 9.1 s timeout), which this change doesn't touch.
  Load average was about 8.4 on 8 cores. Run alone
  (`npx vitest run <those two files> --no-file-parallelism`) → 59 passed. Not caused by this fix.
- `npm run build` → built. Only the existing chunk-size warning.
- Manual checks: none in a browser yet. That is `/speckit-bug-test`'s job: "View" a draft saved
  in each step and check that Publish is current and carries `aria-current="step"`, and that only
  the reached steps are links.

## Deviations from Assessment

- None. `stateOf` moved out of `index.tsx` into `utils.ts` as `stepStateOf`, as the assessment
  proposed, so it is no longer a private function in the component.

## Follow-ups

- When Figma has a design for a draft's progress, revisit the look of the unreached in-between
  steps. They currently reuse the to-do style.
- The timing tests in `utils/rules/` fail under a loaded machine. They are unrelated to this bug,
  but may be worth a look if they also flake in CI.
