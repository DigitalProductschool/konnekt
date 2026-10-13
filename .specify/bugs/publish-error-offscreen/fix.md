# Bug Fix: The "Couldn’t publish" alert is off-screen, so publishing seems to do nothing

- **Slug**: publish-error-offscreen
- **Fixed**: 2026-10-13
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

A failed publish no longer closes the "Is this all the data you need?" dialog. The dialog shows
the "Couldn’t publish" danger alert (the API's message, and the error ID after a `5xx`) above its
summary, and its primary button reads "Try again". The alert at the top of the documents step,
which was above the visible cards once the step was scrolled, is removed. The dialog is modal and
centred in the window, so the error appears where the user is looking, whatever the scroll
position and window size.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `frontend/src/pages/FormConnectionEditor/utils.ts` | modified | `publishFailed` keeps `dialogOpen`. `publish` and `closeDialog` clear `publishError` (`openDialog` and `goToStep` already did) |
| `frontend/src/pages/FormConnectionEditor/PublishDialog.tsx` | modified | New `error` prop: a `KernAlert` (`id="publish-dialog-error"`, `w-full`) with `ErrorNoticeText` above the summary. `aria-describedby` names the alert too while it shows. The primary label reads "Try again" after a failure |
| `frontend/src/pages/FormConnectionEditor/DocumentsStep.tsx` | modified | Removed the `publishError` alert, its prop and the `ErrorNoticeText` import |
| `frontend/src/pages/FormConnectionEditor/types.ts` | modified | `PublishDialogProps.error` added. `DocumentsStepProps.publishError` removed |
| `frontend/src/pages/FormConnectionEditor/index.tsx` | modified | Passes `state.publishError` to the dialog, not to the step |
| `specs/001-servicebw-eudi-middleware/design-notes.md` | modified | §6 "Validation": the decision of 2026-10-13 (alert in dialog 06d, "Try again", nothing on the page) |
| `.specify/bugs/publish-error-offscreen/browser-check.mjs` | added | Browser check (playwright-core + system Chromium, API mocked) for `/speckit-bug-test` |

## Diff Highlights

```ts
// utils.ts
case 'closeDialog':
  return state.publishing ? state : { ...state, dialogOpen: false, publishError: null };
case 'publish':
  // A retry takes the old message away, so that a new failure is announced again
  return { ...state, publishing: true, publishError: null };
case 'publishFailed':
  return { ...state, publishing: false, publishError: action.error };   // dialog stays open
```

```tsx
// PublishDialog.tsx
<div className="kern-dialog__body">
  {error && (
    <KernAlert id="publish-dialog-error" variant="danger"
      title={EDITOR_COPY.publishErrorTitle} className="w-full">
      <ErrorNoticeText notice={error} />
    </KernAlert>
  )}
  <p id="publish-dialog-summary" …>{summary}</p>
</div>
…
{publishing ? EDITOR_COPY.publishing : error ? EDITOR_COPY.retry : EDITOR_COPY.confirm}
```

`kern-dialog__body` is already a flex column with a 16 px gap and `align-items: flex-start`, so
the alert only needs `w-full`. `EDITOR_COPY.retry` ("Try again") already existed. Clearing the
error on `publish` matters for screen readers: the alert is mounted again on each failure, so
`role="alert"` announces it again, even with the same text.

## Tests Added or Updated

The frontend has no test runner, as the assessment noted, so no unit test was added. The
regression check is a browser script:

- `.specify/bugs/publish-error-offscreen/browser-check.mjs`. It runs the Vite dev server's
  wizard in headless Chromium, mocks `/api/auth/me`, `/api/document-types` (the real catalog,
  exported from `backend/app/catalog.py`) and `POST /api/form-connections` (first a `503` with an
  `error_id`, then a network failure, then `201`). It scrolls the step to the bottom and asserts,
  at 1455 × 900 and at 390 × 844 (the bottom sheet):
  - the alert is in the open dialog, inside the viewport, with title, message and error ID
  - the dialog is described by the alert and the summary
  - no `role="alert"` is on the page behind it, and the step's scroll position is unchanged
  - "Check again" and "Try again" are both in view, with no horizontal overflow, and the focus
    stays in the dialog
  - "Try again" posts again. The network failure shows the fallback text without an error ID
  - "Check again" closes the dialog, leaves no alert, and returns the focus to "Publish"
  - reopening shows "Confirm and publish" without the old error, and a success opens
    `/form-connections/conn-1`

  To run it: start `npm run dev` in `frontend/`. In a scratch directory, `npm i
  playwright-core@1.48.2`, put `catalog.json` there (`uv run python -c` over
  `app.catalog.DOCUMENT_TYPES`, see the script's mock), then run `node browser-check.mjs <that dir>`.

## Local Verification

- `npm ci` (the worktree had no `node_modules`) → OK, 0 vulnerabilities
- `npm run lint` → clean
- `npm run format:check` → "All matched files use Prettier code style!"
- `npm run build` (`tsc -b` + Vite) → built, no type errors
- `node browser-check.mjs` → **34/34 PASS** (17 checks × desktop and mobile). The step was
  scrolled to 826 px (desktop) and 2565 px (mobile) when publishing failed
- Manual checks: screenshots of the dialog after the `503`, at both sizes. The alert spans the
  body's width above the summary, 16 px from it, and the two footer buttons keep their layout
  (side by side on desktop, stacked in the bottom sheet). The layout matches the KERN dialog
  otherwise
- Not run: backend tests (no backend change), and no check against a real EUDIPLO. The `503`
  body was mocked in the shape `http_error_for` returns

## Deviations from Assessment

None in substance. Two notes:
- The open questions were resolved with the assessment's recommendations: the error shows only
  in the dialog (none on the page after "Check again"), and the primary button reads "Try
  again".
- `constants.ts` needed no change, since `EDITOR_COPY.retry` already exists, as the assessment
  expected.

## Follow-ups

- If the team wants unit tests for the reducer, the frontend needs a test runner (Vitest).
  `editorReducer`'s publish cases would be the first candidates.
- Optionally ask the designer for a frame for the failed-publish dialog, since none exists
  (recorded in design-notes §6).
- Committing: `git` doesn't work in this worktree (its `.git` points to
  `/home/samu/.../worktrees/fix-error-message`), so the change can't be committed from here as is.
