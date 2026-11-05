# Bug Assessment: A draft's details highlight the wrong step in the progress bar

- **Slug**: draft-view-stepper
- **Created**: 2026-11-05
- **Source**: pasted text
- **Verdict**: valid
- **Severity**: low

## Report (verbatim or summarized)

> When clicking on view for drafts, the top bar that indicates the position (conenctions,
> documents, rules, ecc.) should show the publish page with the links not present (the according
> is deactivated). At the moment the summary is showed, but the top bar always point to something
> different (sometimes documents, sometimes rules). It should point to publish always when viewing
> because that's the place of the summary

## Symptom

On the overview, "View" on a draft opens its details (S6): the documents and rules summary, which
is the content of the Publish step. The progress bar ("Connection · Documents · Rules · Test ·
Publish") does not mark Publish as the current step. It marks the step *after* the one the draft was
saved in, so the highlighted step changes from draft to draft: Documents for a draft saved in the
connection step, Rules for one saved in documents, and so on.

Expected: Publish is always the current step while viewing a draft. The steps the draft has reached
stay done and lead to the flow. The steps it hasn't reached are not links.

"The links not present" in the report means the connection links (request and result URLs). A
draft's details already hide them (FR-006, the info alert), so that part needs no change (confirmed
by the reporter, 2026-11-05).

## Reproduction

1. Sign in and create a connection. On the documents step choose "Save and exit". The draft is
   stored with `step = 'documents'`.
2. On the overview, choose "View" on that draft (`/form-connections/:id`).
3. Observed: Connection and Documents show a tick. **Rules** is the current step (filled circle,
   bold label, `aria-current="step"`). Test and Publish are to do.
4. Repeat with drafts saved in the other steps:

   | Saved in (`draft.step`) | `current` passed | Step shown as current |
   |---|---|---|
   | `connection` | 1 | Documents |
   | `documents` | 2 | Rules |
   | `rules` | 3 | Test |
   | `test` | 4 | Publish (correct only by coincidence) |

The table follows from the code (`reachedStepsOf` and `WizardProgress.stateOf`). It has not been
checked in a browser.

## Suspected Code Paths

- `frontend/src/pages/FormConnectionDetail/DraftDetails.tsx:89`: passes
  `current={reachedStepsOf(draft.step)}`, a **count** of reached steps, to `WizardProgress`'s
  `current`, which is the **index** of the current step. This is the line that causes the bug.
- `frontend/src/pages/FormConnectionDetail/utils.ts:155` `reachedStepsOf()`: returns
  `DRAFT_STEPS.indexOf(step) + 1`. Its doc comment says `WizardProgress` shows those steps "as done
  and leading to the flow there". That is true, but it also makes index `n` (the next step) current.
- `frontend/src/components/WizardProgress/index.tsx:5` `stateOf()` and `:26`: one number decides
  both "done/linkable" (`index < current`) and "current" (`index === current`). There is no way to
  express "current = Publish, but only the first *n* steps are done". Any `current` above
  `reached` would wrongly tick and link the unreached steps in between.
- `frontend/src/components/WizardProgress/types.ts:7`: `current` is documented as "The index of
  the current step". `DraftDetails` uses it as a count.
- `frontend/src/components/WizardProgress/WizardStep.tsx:17,37`: puts `aria-current="step"` on
  the current step and renders a link only for `done` steps. Screen readers therefore also announce
  the wrong step.
- `frontend/src/pages/FormConnectionDetail/constants.ts:102-104`: the comment on `DRAFT_STEPS`
  ("Publish, CONNECTION_STEPS' last, is never reached by a draft") is still accurate. Publish is
  current, not reached.
- For comparison, `frontend/src/pages/FormConnectionDetail/ConnectionDetails.tsx:95-99`: a
  published connection passes `current={CONNECTION_STEPS.length}`. Every step is done and none is
  current (Figma "22 Published").
- Spec: `specs/005-connection-drafts/contracts/ui-screens.md:174-175` (S6 "Progress") and
  `tasks.md` T028 only say that steps up to and including the stored step are reached. They do not
  say which step is current, so the implementation fell back to `WizardProgress`'s "next step is
  current" behaviour.

## Root Cause Hypothesis

`WizardProgress` has one number for two things: the current step and the number of done steps. The
editor needs only one, because everything before the current step is done. A draft's details need
two: the current step should be Publish, because the summary is the Publish step's content, and
the done steps are those up to the stored step. `DraftDetails` passes the reached count as
`current`, so the step right after the stored one is shown as current. The spec (S6) never said
which step is current, which let this through. **Confidence: high.** It follows directly from
`stateOf()` and `reachedStepsOf()`, and it explains why the highlighted step varies ("sometimes
documents, sometimes rules").

## Proposed Remediation

**Preferred**: give `WizardProgress` an optional `reached` prop, separate from `current`.

- `components/WizardProgress/types.ts`: add `reached?: number`, documented as "How many steps,
  from the first, are done and lead back; defaults to `current`".
- `components/WizardProgress/index.tsx`: compute each step's state from both numbers:
  - `index < reached` → `'done'`, with `onSelect`;
  - `index === current` → `'current'`;
  - otherwise → `'todo'`, with no link.

  Move this into a pure helper, for example `stepStateOf(index, current, reached)` in
  `components/WizardProgress/utils.ts`, so it can be unit-tested (vitest runs in `node`, and the
  repo has no component tests). Without `reached`, the output must be exactly what it is today, so
  the editor and `ConnectionDetails` don't change.
- `pages/FormConnectionDetail/DraftDetails.tsx`: pass `current={CONNECTION_STEPS.length - 1}`
  (Publish) and `reached={reachedStepsOf(draft.step)}`, with a one-line comment that the details
  are the Publish step's summary. `continueAt` stays as it is: it only receives indices below
  `reached`, and those always map into `DRAFT_STEPS`.

With this change, a draft saved in documents shows Connection ✓ and Documents ✓ (links), Rules and
Test as to-do (no link, grey), and Publish as current. A draft saved in test shows four ticks and
Publish as current.

**Keep it small**: the in-between steps reuse the existing to-do style. No new visual state, no
changes to `WizardStep.tsx`, no new copy. Figma has no design for them yet, and this will be
revisited once it does (reporter, 2026-11-05).

Also update the spec contract S6 "Progress" (`contracts/ui-screens.md`) and, if useful, T028's
bullet so the behaviour is written down: *"Publish is the current step, since the details are its
summary. Every step up to and including the stored step is reached and leads to the flow at that
step. The steps between are not reached and are not links."*

**Alternatives**:
- *Pass a per-step state array* (`states: WizardStepState[]`) instead of `current` + `reached`.
  It is the most flexible, but every caller has to build an array, and the "done steps lead back"
  rule would be spread across callers. More churn than one optional prop.
- *Make Publish current and leave `WizardProgress` alone* by passing `current={4}`. This is
  wrong: Rules and Test would show ticks and links for a draft saved in documents, which claims
  progress the draft hasn't made and breaks `continueAt` for no reason. Rejected.

**Files likely to change**:
- `frontend/src/components/WizardProgress/types.ts`
- `frontend/src/components/WizardProgress/index.tsx`
- `frontend/src/components/WizardProgress/utils.ts` (new, the pure `stepStateOf`)
- `frontend/src/components/WizardProgress/utils.test.ts` (new)
- `frontend/src/pages/FormConnectionDetail/DraftDetails.tsx`
- `frontend/src/pages/FormConnectionDetail/utils.ts` (`reachedStepsOf`'s doc comment only)
- `specs/005-connection-drafts/contracts/ui-screens.md` (S6 "Progress", one sentence)

**Tests to add or update**:
- `WizardProgress/utils.test.ts`:
  - without `reached`: `index < current` is done, `index === current` is current, and the rest is
    to do. This is the regression guard for the editor and the published details.
  - with `current = 4, reached = 2`: indices 0–1 done, 2–3 to do, 4 current.
  - with `current = 4, reached = 4`: 0–3 done, 4 current.
  - with `current = 5` (the published details): every step done.
- `FormConnectionDetail/utils.test.ts`: the existing `reachedStepsOf` cases stay unchanged.
- Manual check: "View" a draft saved in each step. Publish is current every time, only the reached
  steps are links, and `aria-current="step"` is on Publish.

## Risks & Considerations

- **Shared component**: `WizardProgress` is used by the editor (`FormConnectionEditor/index.tsx:928`),
  `ConnectionDetails` and `DraftDetails`. The new prop must be optional and default to `current`, so
  the other two render the same as before. The no-`reached` test case guards this.
- **Accessibility**: `aria-current="step"` moves to Publish, which matches what the page shows.
  To-do steps between done steps and the current one are plain text, so keyboard and screen-reader
  users only meet links to steps the draft actually reached. Each done step keeps its ", done"
  suffix.
- **Visuals**: grey bars (to do) between blue ones (done, current) are a new combination for the
  progress bar. This is a stopgap: Figma has no design for the in-between steps yet, and the look
  will change once it does.
- No backend, API, migration or data impact. The change is frontend-only and presentational.

## Open Questions

Resolved with the reporter on 2026-11-05:

- "The links not present" means the connection links (request and result URLs). They are already
  hidden on a draft's details, so no change is needed there.
- The in-between steps use the existing to-do style for now (least change). Figma will define
  their final look later.
