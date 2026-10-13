# Bug Verification: The "Couldn’t publish" alert is off-screen, so publishing seems to do nothing

- **Slug**: publish-error-offscreen
- **Tested**: 2026-10-13
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: verified

## Summary

The bug reproduces on the unfixed `HEAD` (420c381) and no longer reproduces with the fix. After a
failed publish with the step scrolled, the dialog stays open with "Couldn’t publish", the message
and the error ID in view, at 1455 × 900, 1024 × 640 (`split:`) and 390 × 844. Lint, format and
the type-checked build pass, and no regression was found in the publish flow.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Reproduction (pre-fix) | `node verify.mjs http://localhost:5174 … prefix` against `git archive HEAD frontend`, Vite on 5174 | pass (bug reproduces) | At all three sizes: dialog closed, alert on the page, not visible (out of view or under the header), focus on "Publish". The `400` case was the same |
| Reproduction (post-fix) | `node verify.mjs http://localhost:5173 … fixed` against the worktree, Vite on 5173 | pass | At all three sizes: dialog open, alert in it and visible (hit-tested with `elementFromPoint`), error ID shown, "Try again", focus in the dialog, step scroll position unchanged |
| Escape after a failure | same script | pass | Dialog closes, no alert left, focus back on "Publish", scroll kept |
| `400` from the API | same script, 1024 × 640 | pass | Message "Select at least one field for 'Personal ID'." in the dialog, no error ID |
| Retry in flight | same script, `POST` delayed 800 ms | pass | Label "Publishing…", old alert removed, Escape doesn't close, success opens `/form-connections/conn-1` after 2 `POST`s |
| Short windows (dialog height risk) | same script, 1024 × 480 and 360 × 560 | pass | Dialog (442 / 522 px) scrolls itself (`overflow-y: auto`), both buttons reachable, no horizontal overflow |
| Fix's browser check | `node browser-check.mjs <dir>` (1455 × 900, 390 × 844) | pass | 34/34 PASS: `503` then network error then `201`, "Check again", reopen without the old error |
| Lint | `npm run lint` | pass | exit 0, no findings |
| Format | `npm run format:check` | pass | "All matched files use Prettier code style!" |
| Type-check + build | `npm run build` (`tsc -b` + Vite) | pass | exit 0 |
| Backend tests | `uv run pytest` | skipped | No backend file changed (diff: 5 files in `frontend/src/pages/FormConnectionEditor/` + design notes). It needs a `_test` database |
| Real EUDIPLO outage | stop EUDIPLO / empty `EUDIPLO_URL` | not-run | The API was mocked in the browser. The `503` body was checked against `services/eudiplo.py` (same message text) |

Both scripts use playwright-core 1.48.2 with the system Chromium (`/usr/bin/chromium`), and mock
`/api/auth/me`, `/api/document-types` (the real catalog from `app.catalog.DOCUMENT_TYPES`: PID
25 fields, mDL 31) and `POST /api/form-connections`. `verify.mjs` is saved next to this report.

## Output Excerpts

Pre-fix (`HEAD`), 1455 × 900, step scrolled to 802 px:

```
prefix | desktop repro: after failed publish | {"dialogOpen":false,"alertCount":1,"alertInDialog":false,
  "alertVisible":false, … "focus":"BUTTON:Publish","focusInDialog":false,"scrollTop":978}
prefix | desktop repro: BUG REPRODUCES | true      (split and mobile: true as well)
```

Fixed worktree, same steps:

```
fixed | desktop repro: after failed publish | {"dialogOpen":true,"alertCount":1,"alertInDialog":true,
  "alertVisible":true, … "Error ID: verify-503-id","primaryLabel":"Try again","focusInDialog":true,"scrollTop":826}
fixed | desktop repro: BUG REPRODUCES | false      (split and mobile: false as well)
fixed | in-flight retry | {"label":"Publishing…","alerts":0,"openAfterEscape":true}
fixed | short-mobile: dialog fit | {"open":true,"dialogHeight":522,"viewport":560,"dialogScrolls":true,"buttonsReachable":true}
```

Fix's script: `34/34 PASS` (17 checks × desktop and mobile).

Screenshots (pre-fix at 1024 × 640: no dialog, only the scrolled-to cards; fixed: dialog with
the alert above the summary) were taken in the session's scratchpad and checked by eye. They
aren't kept in the repo.

## Residual Risks

- Step 1 of the reproduction (a real EUDIPLO outage or missing `EUDIPLO_URL`) was replaced by
  mocked API answers. The frontend sees only the status and the `{error, message, error_id}`
  body, which the mock reproduces in the shape `http_error_for` returns, so the risk is low.
- No screen reader was used. Announcement relies on `KernAlert`'s `role="alert"` being mounted
  again on each failure. The DOM shows this (the alert is removed while `publishing`), but it
  wasn't heard.
- Only Chromium was tested. The native `<dialog>` with `showModal()` behaves the same in current
  Firefox and Safari, but this wasn't checked here.
- On very short windows (≤ 560 px tall) the user may have to scroll inside the dialog to reach
  "Try again". The alert comes first, so it's seen right away.
- The frontend still has no automated test runner. The reducer's publish cases are covered only
  by these browser scripts, which aren't wired into CI.

## Recommendation

Close the bug. The original symptom was reproduced on the unfixed code and is gone with the fix,
in the three layouts the assessment named, for `5xx`, `400` and network failures. Escape, "Check
again", retry and success all behave as the assessment proposed. A check against a real EUDIPLO
outage in a dev or staging environment would be a cheap confirmation but isn't needed to close.
