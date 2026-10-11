# Bug Verification: Backend setting names appear in the UI's error messages

- **Slug**: config-error-leak
- **Tested**: 2026-10-11
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: verified

## Summary

The bug no longer reproduces. All six API cases of the assessment were re-run, and so was the UI
reproduction, in a real browser. Every 5xx answer has a generic message and an `error_id`. The cause
(the missing setting, the failed EUDIPLO call, or the exception's type) is in the backend log under
that same ID, and nowhere in the answer or on the page. No regressions were found: 120/120 backend
tests pass, and lint, format, type checks and the frontend build are clean.

One gap remains, and it is not a regression. In the cross-origin dev setup, a catch-all `500` has
no CORS headers, so the browser can't read its body and the UI shows its fallback text without the
ID. Nothing leaks through it. See Residual Risks.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Code inspection | Read `errors.py`, `eudiplo.py` (`http_error_for`, `NOT_CONFIGURED_MESSAGE`), `schemas.py`, `routers/form_connections.py`, `api/client.ts`, `ErrorNoticeText`, both pages' call sites | pass | Matches `fix.md`. There was no git diff to compare: the worktree's `.git` points to a path that doesn't exist on this machine |
| Reproduction, API (assessment cases 1–6) | Assessment harness re-run: the real app through `TestClient`, `get_current_user` overridden, DB at a closed port, every `app.*` record captured. Case 4 uses `tests/fake_eudiplo.py` with `create_config` → `404` | pass | Each answer is generic and has an `error_id`. Each has exactly one ERROR line under that ID (table below). Case 6 (`APP_ENV=development`) no longer echoes the psycopg host and port |
| Reproduction, UI: publish with `EUDIPLO_TRUST_LIST_ID` empty | Live uvicorn plus the Vite dev server, headless Chromium (Playwright with `/usr/bin/chromium`): sign in, `/form-connections/new`, name and form ID, Continue, Add, All data, Publish, Confirm and publish | pass | The "Couldn’t publish" alert shows the generic message and "Error ID: 63a7d77e-…". The page text contains neither `EUDIPLO` nor `TRUST_LIST`. The backend console has `Error 63a7d77e-…: EUDIPLO is not configured: EUDIPLO_TRUST_LIST_ID is not set`. No row in `form_connections` |
| UI: webhook address, real 500 | Backend with the tests' in-memory EUDIPLO stand-in. A connection published in the browser, the test DB container stopped, then "Save address". Playwright forwarded the `PUT` and added the CORS headers that a same-origin (nginx) deployment doesn't need | pass | The field's error, the element that `aria-describedby` points to, shows the generic message and "Error ID: 7c6934f0-…". The log has `Error 7c6934f0-…: Unexpected error in PUT /api/form-connections/{form_connection_id} (OperationalError …)`, with the route template and not the URL. No psycopg text, host or port on the page |
| UI: webhook address, cross-origin dev, no stand-in | Same as above without the CORS stand-in | fail (pre-existing, not a leak) | The backend answered `500` with an `error_id` and logged it, but the browser couldn't read the answer. The field showed no ID. `curl` confirms the catch-all 500 has no `access-control-allow-origin`, while a `401` does |
| New and updated tests | `uv run pytest -v tests/api/test_errors.py tests/unit/test_eudiplo_client.py::{test_saving_a_configuration_needs_every_setting,test_error_answers} tests/api/test_form_connections.py::{test_creating_answers_503_…,test_creating_answers_502_…}` | pass | 16 passed |
| Backend regression suite | `DATABASE_URL=…@127.0.0.1:55433/middleware_test uv run pytest` | pass | 120 passed in 26.97 s, on a throwaway `postgres:18-alpine` container, now removed |
| Backend lint and type check | `uv run ruff check .`, `uv run ruff format --check .`, `uv run mypy app/ tests/` | pass | All checks passed. 34 files already formatted. No issues in 31 source files |
| Frontend lint, format and build | `npm run lint`, `npm run format:check`, `npm run build` | pass | No ESLint output. Prettier clean. Built in 1.17 s |
| Fix's revert check (old code against the new tests) | — | not-run | Not repeated. `fix.md` records 16 failed against the old code. Here, the reproduction cases above show the behaviour change directly |

## Output Excerpts

Assessment cases, re-run against the fix (abridged IDs):

| # | Answer | `app.*` log lines |
|---|---|---|
| 1 | `503 {"error": "Not configured", "message": "Something went wrong on our side, so nothing was saved. Contact an administrator and give them the error ID.", "error_id": "eb983fb5-…"}` | `ERROR app.errors: Error eb983fb5-…: EUDIPLO is not configured: EUDIPLO_URL is not set (EudiploNotConfigured in _require (eudiplo.py:226))` |
| 2 | `503`, same body, `error_id` `fb399bf7-…` | `… EUDIPLO_TRUST_LIST_ID is not set …` under `fb399bf7-…` |
| 3 | `502 {"error": "Upstream error", "message": "The wallet service could not create the request configuration, so nothing was saved. Try again in a moment.", "error_id": "b804b665-…"}` | `WARNING … EUDIPLO token failed: ConnectError`; `ERROR … Error b804b665-…: EUDIPLO call failed (EudiploUnavailable in _send (eudiplo.py:312))` |
| 4 | `502`, same body, `error_id` `e1bb127e-…` | `ERROR … Error e1bb127e-…: EUDIPLO call failed (EudiploNotFound in _raise_for_status (eudiplo.py:319))`. Before the fix: none |
| 5 | `500 {"error": "Internal server error", "message": "Something went wrong on our side. Contact an administrator and give them the error ID.", "error_id": "436bd3c0-…"}` | `ERROR … Unexpected error in GET /api/form-connections (OperationalError in _connection_for_bind (<string>:2))` |
| 6 | `500`, same body as case 5 (`APP_ENV=development`) | Same as case 5. Before the fix, the body quoted `connection to server at "127.0.0.1", port 1 failed` |

Browser, publish (alert text):

```text
Couldn’t publish
Something went wrong on our side, so nothing was saved. Contact an administrator and give them the error ID.
Error ID: 63a7d77e-ff4d-40ac-8df6-f464e2ed8d09
```

uvicorn console for that request:

```text
Error 63a7d77e-ff4d-40ac-8df6-f464e2ed8d09: EUDIPLO is not configured: EUDIPLO_TRUST_LIST_ID is not set (EudiploNotConfigured in _require (eudiplo.py:226))
INFO:     127.0.0.1:42242 - "POST /api/form-connections HTTP/1.1" 503 Service Unavailable
```

CORS on a catch-all 500 compared with an `HTTPException` (DB down, `Origin: http://localhost:5173`):

```text
HTTP/1.1 500 Internal Server Error          ← no access-control-allow-origin
{"error":"Internal server error","message":"Something went wrong on our side. …","error_id":"49d68edb-…"}

HTTP/1.1 401 Unauthorized
access-control-allow-credentials: true
access-control-allow-origin: http://localhost:5173
```

Tests: `120 passed in 26.97s`; targeted run `16 passed in 3.59s`.

## Residual Risks

- **The ID is missing for a 500 in a cross-origin setup.** The catch-all `Exception` handler's
  answer comes from Starlette's `ServerErrorMiddleware`, which sits outside `CORSMiddleware`. So a
  `500` carries no CORS headers. When the frontend calls the backend on another origin (local dev:
  5173 → 3000), the browser can't read the body. `apiFetch` then throws a `TypeError`, and the page
  shows its fallback copy ("Saving didn’t work…") without an error ID. The ID is still in the
  backend log.
  - Production is unaffected: it is same-origin, with nginx proxying `/api`.
  - The 502 and 503, the subject of this bug, are `HTTPException`s, so their answers get CORS
    headers and show the ID in dev too.
  - The problem predates the fix (the old development echo couldn't reach the browser either), and
    nothing leaks through it.
  - A possible follow-up: add the CORS headers to the catch-all answer, or wrap the app in
    `CORSMiddleware` outside `ServerErrorMiddleware`.
- **The webhook check used a stand-in for nginx.** Playwright forwarded the `PUT` and added CORS
  headers to emulate the same-origin production setup. The real nginx container wasn't run.
- **Browser coverage**: only headless Chromium at 1455×1000. No Firefox or WebKit, and no mobile
  width. The visible layout was checked from screenshots only, not against Figma.
- **Log format**: as `fix.md` notes, the `app.*` lines reach the console without a time, level or
  logger name (follow-up already recorded). An admin finds them by grepping for the ID.
- **Not exercised**: the integration API (T049–T051 are pending), so serviceBW's 502 and 503 bodies
  were only checked through `http_error_for`'s unit tests.
- **Workspace**: `frontend/dist/` was rebuilt by `npm run build` (gitignored). The scratch venvs,
  scripts and screenshots are in the session's scratchpad. The throwaway DB containers are removed,
  and the existing `phase3-postgres-1` container was not touched.

## Recommendation

Close the bug: verified end-to-end. The original symptom, the setting's name in the "Couldn’t
publish" alert with no log line, no longer reproduces in the API or in a real browser. Every 5xx now
carries an `error_id` that matches exactly one ERROR log line naming the cause. Track the missing
CORS headers on catch-all `500` answers as a separate, low-priority dev-experience issue. It only
hides the ID in cross-origin setups, and it reveals nothing.
