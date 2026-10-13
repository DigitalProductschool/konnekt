# Bug Assessment: The "Couldn’t publish" alert is off-screen, so publishing seems to do nothing

- **Slug**: publish-error-offscreen
- **Created**: 2026-10-13
- **Source**: pasted text (no URL)
- **Verdict**: valid
- **Severity**: medium. The main flow of the app is affected: a failed publish looks like a
  click that did nothing, so the user can't tell whether the form went live and doesn't see the
  error ID they would need for an administrator. Nothing is lost or published by mistake. The
  wizard keeps its state and "Publish" can be tried again. It happens whenever the documents
  step has been scrolled, which is normal with two documents and their fields. The cause has
  been there since the wizard was built and is not a regression.

## Report (verbatim or summarized)

> When the EUDIPLO connection is not live or in general there is an error when publishing the
> form, the error card/message is shown on top of the documents but it an orrible placement. If
> you scroll down in the page (becuase you are adding a lot of documents) you don't see it and
> publish seems to do nothing. Try to come up with a better ui placement or something different
> to show the error

The report asks for a different placement or presentation, not only a fix to the scroll
position.

## Symptom

When `POST /api/form-connections` fails (EUDIPLO unreachable or not configured, a `5xx`, a
network error, or a `400`), the dialog closes and the "Couldn’t publish" danger alert is
inserted as the first element of the documents step's scrolling area. If that area is scrolled
down, the alert appears above the visible part and the user sees the dialog close with nothing
else changing. Expected: after a failed publish the user immediately sees the error and its
error ID, where they are looking, whatever the scroll position.

## Reproduction

1. Make the create call fail: stop EUDIPLO or leave `EUDIPLO_URL` empty in the backend (`502`
   or `503` with an error ID), or stop the backend (network error, fallback text "Nothing went
   live. Check your connection and try again.").
2. Sign in, open `/form-connections/new` (or `/get-started`), enter a name and Form ID, and
   click "Continue".
3. Add "Personal ID" and "Driving licence", select some fields in each, and scroll the right
   column down until the top of the step is out of view. From 1024 × 640 (`split:`) the head
   stays put and only the body scrolls. Below that the whole area scrolls.
4. Click "Publish", then "Confirm and publish".
5. Observed: the button shows "Publishing…", the dialog closes, and the focus returns to
   "Publish" in the footer. The scroll position doesn't change and the visible cards stay as
   they were. The alert is rendered above them, out of view. Screen-reader users do hear it,
   because `KernAlert` has `role="alert"` (kit 2.40.0); sighted users get nothing.

When the step isn't scrolled the alert is visible, which is why the problem only shows on
longer setups.

## Suspected Code Paths

- `frontend/src/pages/FormConnectionEditor/DocumentsStep.tsx:30-35`: renders `publishError` as
  a `KernAlert` before the catalog and the cards, at the top of the scrolling body. Nothing
  scrolls it into view or focuses it.
- `frontend/src/pages/FormConnectionEditor/utils.ts:126-127`: `publishFailed` sets
  `dialogOpen: false` together with `publishError`, so the dialog, which is centred in the
  window and where the user is looking, disappears just as the error is set.
- `frontend/src/pages/FormConnectionEditor/utils.ts:120-121`: `openDialog` clears
  `publishError`, so every retry removes the alert and adds it again.
- `frontend/src/pages/FormConnectionEditor/index.tsx:95-106`: `handleConfirm` dispatches
  `publishFailed`, and the native `<dialog>`'s `close()` (`PublishDialog.tsx:28`) returns the
  focus to the footer's "Publish" button, far from the alert.
- `frontend/src/components/WizardLayout/index.tsx:47-56`: the step's body is its own scroll
  container (`split:overflow-y-auto`), and the head and footer stay put. Content added at the top
  of the body goes above the scrolled-to part.
- `frontend/src/pages/FormConnectionEditor/DocumentPicker.tsx:21`: the panel is `lg:sticky`,
  so with a scrolled body it covers the area where a user might look for feedback.
- `backend/app/routers/form_connections.py:40-48` and `backend/app/services/form_connections.py`:
  the possible failures are `400 Validation error` (mostly caught earlier by the client's own
  checks), `502`/`503` from `http_error_for` with an `error_id`, and `500` from the catch-all
  handler. There is no `409`. Most failures are transient or server-side, and "try again" or
  "tell an administrator" is the useful next step.

## Root Cause Hypothesis

The error is put where the page's validation messages go, at the top of the step, although the
action that fails happens in the modal dialog and the footer, and the step scrolls on its own.
Closing the dialog on failure takes the user's attention to the footer. The alert appears where
the user isn't looking, the scroll position stays the same, and the focus doesn't move to the
alert. Confidence: **high**. Steps 4 and 5 follow directly from the reducer and the layout, and
nothing else on the page reacts to `publishError`.

## Proposed Remediation

**Preferred: keep the dialog open and show the error inside it.** On `publishFailed`, set
`publishing: false` and the error, but keep `dialogOpen: true`. `PublishDialog` takes a new
`error: ErrorNotice | null` prop. When it is set, the dialog shows a KERN danger alert ("Couldn’t
publish" + `ErrorNoticeText`, so a `5xx`'s error ID stays selectable) in its body, above the
summary. Its primary button reads "Try again" (it calls `onConfirm` again). "Check again" and
Escape still close the dialog. The dialog is modal and centred in the window, so the error
appears where the user's attention already is, whatever the scroll position and window size. The
alert's `role="alert"` announces it, and the focus stays in the dialog. Remove the
`publishError` block and prop from `DocumentsStep`. Clear the error when the dialog opens or
closes. The next "Publish" runs the client-side validation again anyway.

This fits the design's existing frame: no new component, only a KERN alert inside KERN's dialog.
It also covers a `400`: the dialog shows the message ("Select at least one field for 'Personal
ID'."), and "Check again" takes the user back to the page to fix it.

**Alternatives**:
- **A fixed error bar above the footer**, in `WizardLayout`'s `overlay` (like the toast, 24 px
  above the action bar, but persistent and danger-styled, with a close button). It is visible at
  any scroll position and stays after the dialog closes, so the user can re-read it while
  correcting. The trade-off: it is a new pattern with no Figma frame and no KERN component, it
  covers the bottom of the cards, and it competes with the "Removed · Undo" toast in the same
  place.
- **The minimal fix: keep the in-page alert, then scroll to it and focus it** after
  `publishFailed` (`tabIndex={-1}` on a wrapper, `scrollIntoView` + `focus()` after
  `flushSync`, as `refuse()` already does for validation). It is the smallest change and the
  same mechanism as the field errors. The trade-off: the user loses their scroll position. With
  `split:` the jump is inside the body while the sticky panel stays. The error is still far from
  "Publish", which is what the report objects to ("horrible placement").

**Files likely to change**:
- `frontend/src/pages/FormConnectionEditor/PublishDialog.tsx`: the alert and the "Try again"
  label.
- `frontend/src/pages/FormConnectionEditor/types.ts`: `PublishDialogProps.error`. Remove
  `publishError` from `DocumentsStepProps`.
- `frontend/src/pages/FormConnectionEditor/utils.ts`: `publishFailed` keeps the dialog open,
  and `closeDialog` clears the error.
- `frontend/src/pages/FormConnectionEditor/index.tsx`: pass the error to the dialog, not the
  step.
- `frontend/src/pages/FormConnectionEditor/DocumentsStep.tsx`: drop the alert.
- `frontend/src/pages/FormConnectionEditor/constants.ts`: probably no change, since
  `EDITOR_COPY.retry` ("Try again") already exists for the catalog error.
- `specs/001-servicebw-eudi-middleware/design-notes.md` §6 ("Validation" and "Dialog 06d"):
  record the decision that a refused `POST` shows its message in the dialog.

**Tests to add or update**:
- The frontend has no test runner (`package.json` has no vitest or Playwright tests), so the
  verification is in the browser, with the Playwright MCP, at 1455 × 900 and at 390 × 844:
  - With EUDIPLO unconfigured (`503`) and the step scrolled to the bottom, "Confirm and publish"
    leaves the dialog open with "Couldn’t publish", the generic message and a selectable error
    ID. The alert's `getBoundingClientRect()` is inside the viewport.
  - "Try again" calls the API again and shows "Publishing…". On success it navigates to the
    details page with the "Your connection is live" title.
  - "Check again" and Escape close the dialog, focus returns to "Publish", and no alert is left
    on the page. The next "Publish" opens the dialog without the old error.
  - Below 576 px (the bottom-sheet dialog), the alert and both buttons fit without horizontal
    scrolling.
  - With the backend stopped (network error), the dialog shows the fallback text, without an
    error ID.
- Backend: no change. The existing API tests for the `502`/`503` answers and their `error_id`
  still apply.
- `npm run lint`, `npm run format:check` and `npm run build` pass.

## Risks & Considerations

- **Accessibility**: an alert added to an open modal dialog is announced through `role="alert"`.
  The dialog keeps the focus trap. Moving the focus to the alert isn't needed, and it would take
  the focus off "Try again". Point the dialog's `aria-describedby` at the alert while it shows,
  so that a re-opened or re-read dialog describes the error.
- **Dialog height**: the alert, a two-line `5xx` message and the error ID make the dialog taller.
  At 576 px or narrower (bottom sheet) and on short windows, check that the footer buttons stay
  reachable and the body scrolls if needed.
- **Copy**: "Check again" means going back to review the selection. After a server error the
  primary action changes to "Try again". Confirm whether the secondary button keeps its label.
  See the open questions.
- **Design**: there is no Figma frame for a failed publish (as for server errors, design-notes
  §6). This is a design decision and gets an entry in the design notes.
- **No API, migration, performance or security impact**: the change is frontend-only. The
  message and `error_id` shown stay as they are (bug `config-error-leak`).

## Open Questions

- [NEEDS CLARIFICATION: after "Check again" closes a failed dialog, should the error stay
  visible on the page too (for example at the top, as now), or is the dialog the only place?
  Recommended: dialog only, because a page alert brings back the off-screen problem, and the
  next "Publish" validates again.]
- [NEEDS CLARIFICATION: after a failure, should the primary button read "Try again" or keep
  "Confirm and publish"? Recommended: "Try again", which already labels retries elsewhere in
  the app (`EDITOR_COPY.retry`).]
