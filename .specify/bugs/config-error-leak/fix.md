# Bug Fix: Backend setting names appear in the UI's error messages

- **Slug**: config-error-leak
- **Fixed**: 2026-10-11
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

Every 5xx answer now has a generic message and an `error_id`, a UUID. The cause is written to the
backend's log under that ID and nowhere else: the missing EUDIPLO setting, the failed EUDIPLO call,
or an unexpected exception's type and code location. The UI shows the error ID with the message, the
catch-all handler no longer echoes exception text in development, and the 502 text no longer names
EUDIPLO. The user accepted the assessment's defaults on 2026-10-11:

- the 503 keeps `"error": "Not configured"`;
- the generic texts are the suggested ones;
- logging configuration is a follow-up, and the new lines are logged at ERROR.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `backend/app/errors.py` | modified | New `log_server_error(error, description)` (`:19`). It creates a UUID4, logs one ERROR line, `Error <id>: <description> (<describe_error>)`, and returns the ID. The catch-all handler (`:68`) answers `INTERNAL_ERROR_MESSAGE` with an `error_id` in every environment, and logs the method and the route's template (`_route_of`, `:32`), never the URL. The development echo of `exception.args[0]` and the `settings` import are gone |
| `backend/app/services/eudiplo.py` | modified | `http_error_for()` (`:365`) logs through the helper: the 503 logs `error.setting`, and the 502 logs the error's type and location. Both answers add `error_id`, and the 503's message is now `NOT_CONFIGURED_MESSAGE` (`:36`) instead of `str(error)` |
| `backend/app/schemas.py` | modified | `ApiErrorResponse.error_id: str \| None = None` (Constitution I, mirrored in the frontend) |
| `backend/app/routers/form_connections.py` | modified | `CONFIG_FAILED` says "The wallet service" instead of "EUDIPLO" |
| `backend/tests/conftest.py` | modified | New `error_log` fixture (`:112`). It checks that an `error_id` is a UUID4 named by exactly one ERROR record, and returns that line |
| `backend/tests/unit/test_eudiplo_client.py` | modified | The 503 and 502 tests assert the generic answer, the `error_id`, and the log line |
| `backend/tests/api/test_form_connections.py` | modified | The 503 test asserts that the setting is named only in the log. The 502 test adds EUDIPLO `404` and `409` (assessment case 4), and asserts that the log has the error's type but not EUDIPLO's body |
| `backend/tests/api/test_errors.py` | added | The 500 path: a generic answer with an `error_id`, no exception text in the answer or the log, and the route's template instead of the URL |
| `frontend/src/types/api.ts` | modified | `ApiErrorResponse.error_id?`, and `ErrorNotice = Pick<ApiErrorResponse, 'message' \| 'error_id'>`, which is what a page shows |
| `frontend/src/api/client.ts` | modified | `isApiErrorResponse` also checks that `error_id` is a string when present (`:38`). New `errorNoticeOf(error, fallback)` (`:46`) |
| `frontend/src/components/ErrorNoticeText/` (`index.tsx`, `types.ts`, `constants.ts`) | added | Renders the message and, if there is an `error_id`, a line "Error ID: <id>". One click selects the ID (`select-all`). The output is inline content, so it fits inside KernAlert's `<p>` |
| `frontend/src/components/FormErrorMessage/types.ts` | modified | `message: string` → `ReactNode` |
| `frontend/src/components/TextField/types.ts` | modified | `error?: string \| null` → `ReactNode` |
| `frontend/src/pages/FormConnectionEditor/types.ts`, `utils.ts`, `index.tsx`, `DocumentsStep.tsx` | modified | `publishError` is an `ErrorNotice`. `publishErrorNotice()` replaces `publishErrorMessage()`. The "Couldn’t publish" alert renders `ErrorNoticeText` |
| `frontend/src/pages/FormConnectionDetail/types.ts`, `utils.ts`, `WebhookCard.tsx` | modified | `WebhookState.error` is an `ErrorNotice`. `saveErrorNotice()` replaces `saveErrorMessage()`. The field's error renders `ErrorNoticeText` |
| `specs/001-servicebw-eudi-middleware/contracts/management-api.md` | modified | New "Server errors" rule. New `500` row, and `error_id` in the `502` and `503` rows. The 503 no longer names the setting |
| `specs/001-servicebw-eudi-middleware/contracts/integration-api.md` | modified | Rule on the `5xx` envelope. The trigger's `502` and `503` bodies and the pull's `502` body carry `error_id`, and the 503 gets the generic message |
| `specs/001-servicebw-eudi-middleware/research.md` | modified | R3: the decision **(user, 2026-10-11)**. Only the log names the missing setting |
| `specs/001-servicebw-eudi-middleware/quickstart.md` | modified | Troubleshooting: look up the setting in the log line of the `error_id`. A trigger's 502 after an EUDIPLO 404 names `EudiploNotFound` |
| `specs/001-servicebw-eudi-middleware/design-notes.md` | modified | New "Server errors" bullet with the final wording and the error ID line. The webhook bullet mentions the ID |
| `docs/ARCHITECTURE.md` | modified | `http_error_for`, the error format with `error_id`, the handler table, `log_server_error`, what `APP_ENV` still decides, `errorNoticeOf` and `ErrorNoticeText` |
| `CLAUDE.md` | modified | 5xx rule under "Key points". The EUDIPLO bullet. The `apiFetch` bullet (`{error, message, error_id?}`) and `errorNoticeOf`/`ErrorNoticeText`. A "Do Not" entry. The `errors.py` comment in the structure tree |

## Diff Highlights

The answer, before and after (assessment case 2, re-run against the fix):

```text
before: 503 {"error": "Not configured", "message": "EUDIPLO_TRUST_LIST_ID is not set"}
        (no log line)
after:  503 {"error": "Not configured", "message": "Something went wrong on our side, so nothing
        was saved. Contact an administrator and give them the error ID.",
        "error_id": "16ba586f-3b50-4ddf-97b0-a23e60cf40dd"}
        log: Error 16ba586f-3b50-4ddf-97b0-a23e60cf40dd: EUDIPLO is not configured:
             EUDIPLO_TRUST_LIST_ID is not set (EudiploNotConfigured in _require (eudiplo.py:226))
```

`backend/app/errors.py`:

```python
def log_server_error(error: BaseException, description: str) -> str:
    error_id = str(uuid.uuid4())
    logger.error("Error %s: %s (%s)", error_id, description, describe_error(error))
    return error_id
```

`backend/app/services/eudiplo.py`:

```python
if isinstance(error, EudiploNotConfigured):
    error_id = log_server_error(
        error, f"EUDIPLO is not configured: {error.setting} is not set"
    )
    return HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail={
            "error": "Not configured",
            "message": NOT_CONFIGURED_MESSAGE,
            "error_id": error_id,
        },
    )
error_id = log_server_error(error, "EUDIPLO call failed")
```

`frontend/src/components/ErrorNoticeText/index.tsx`:

```tsx
<>
  {notice.message}
  {notice.error_id && (
    <span className="block">
      {ERROR_NOTICE_COPY.errorId} <span className="select-all">{notice.error_id}</span>
    </span>
  )}
</>
```

## Tests Added or Updated

- `backend/tests/unit/test_eudiplo_client.py::test_saving_a_configuration_needs_every_setting`
  (4 cases): the 503 detail is exactly `{error, message: NOT_CONFIGURED_MESSAGE, error_id}`. The
  setting's name isn't in the detail. One ERROR line says "<SETTING> is not set" under the same ID,
  without the client secret's value.
- `backend/tests/unit/test_eudiplo_client.py::test_error_answers` (3 cases): the 502 detail has an
  `error_id`, and its log line names the error class (`EudiploNotFound`, `EudiploConflict`,
  `EudiploUnavailable`).
- `backend/tests/api/test_form_connections.py::test_creating_answers_503_while_a_eudiplo_setting_is_empty`
  (3 cases): the answer has the generic message and an `error_id`. The response contains no
  `EUDIPLO` text. The log names the setting under the same ID, and nothing is saved.
- `backend/tests/api/test_form_connections.py::test_creating_answers_502_and_saves_nothing_when_eudiplo_fails`
  (5 cases; `404` and `409` are new, which is assessment case 4): every case answers `502` with an
  `error_id` and no `EUDIPLO` text. The log line names the error class but not EUDIPLO's error body,
  and nothing is saved.
- `backend/tests/api/test_errors.py::test_an_unexpected_error_answers_500_with_only_an_error_id`
  (new). A route raises `RuntimeError` with a database URL in its message, under the tests'
  `APP_ENV=development`. Checks:
  - the 500 answer is generic, with an `error_id`;
  - neither the answer nor the log contains the message;
  - the log line has `GET /api/form-connections/{form_connection_id}`, not the id in the URL.
- `backend/tests/conftest.py::error_log` (new fixture): used by all of the above.

## Local Verification

- Commands run:
  - `uv run ruff check .` → all checks passed.
  - `uv run ruff format --check .` → 34 files already formatted.
  - `uv run mypy app/ tests/` → no issues in 31 source files. The first run flagged indexing
    `HTTPException.detail`, which mypy types as `str`; the unit tests now `cast` it to the dict that
    `http_error_for` builds.
  - `DATABASE_URL=…/middleware_test uv run pytest` → **120 passed**.
    - The database was a throwaway `postgres:18-alpine` container on `127.0.0.1:55432`, removed
      afterwards. No existing database was used.
  - **Regression check**: in a scratch copy of the backend, the old `http_error_for` and the old
    catch-all handler were put back, and the new tests run against them: **16 failed, 57 passed**.
    These are every new or updated case. All of them pass against the fix.
  - Frontend: `npm ci`, then `npm run lint` → clean, `npm run format:check` → clean,
    `npm run build` → built. The same three were clean before the change.
- Manual checks:
  - **The assessment's reproduction, re-run against the fix.** Every answer is generic with an
    `error_id`, and each has one ERROR line under that ID:

    | Case | Answer | Log line under the `error_id` |
    |---|---|---|
    | 1–2 | `503` | "EUDIPLO is not configured: EUDIPLO_URL is not set" (or `EUDIPLO_TRUST_LIST_ID`) |
    | 3 | `502`, "The wallet service could not create…" | `EudiploUnavailable in _send (eudiplo.py:312)`, next to the client's own `EUDIPLO token failed: ConnectError` |
    | 4 | `502` | `EudiploNotFound in _raise_for_status (eudiplo.py:319)`. Before the fix, nothing was logged |
    | 5–6 | `500`, "Something went wrong on our side. Contact an administrator and give them the error ID." | "Unexpected error in GET /api/form-connections (OperationalError …)" |

    Case 6 used to return the psycopg error text with the database host and port. The development
    echo is gone.
  - **Live uvicorn** (all EUDIPLO settings empty, sign-in and `POST /api/form-connections` with
    curl):
    - the answer was `503` with the generic message and `error_id` `8c57822e-…`;
    - uvicorn printed `Error 8c57822e-…: EUDIPLO is not configured: EUDIPLO_URL is not set
      (EudiploNotConfigured in _require (eudiplo.py:226))`, just before the access line.

    So the line reaches the console without a logging configuration, but without a time or level
    prefix.
  - **Markup**: the alert and the webhook field were rendered through Vite's SSR loader with
    `renderToStaticMarkup`:
    - the alert's `<p class="kern-body">` holds the message and
      `<span class="block">Error ID: <span class="select-all">…</span></span>`;
    - in the webhook field, the ID line sits inside the error `<p>` that the input's
      `aria-describedby` points to;
    - a validation error (no `error_id`) renders as before.
  - Not checked in a browser: this session had no browser tool. That is left to `/speckit-bug-test`.

## Deviations from Assessment

- **Component name and label**: the assessment suggested `ErrorId`. The shared component is
  `ErrorNoticeText`, which renders the message and the ID together, because both call sites need
  both. Its "Error ID:" label lives in the component's own `constants.ts`, not in each page's.
  `FormConnectionEditor/constants.ts` and `FormConnectionDetail/constants.ts` didn't change.
- **Field name in the frontend**: the page state is `ErrorNotice` with the API's own `error_id`,
  not a camelCase `errorId`. In this codebase, `errorId` props hold the DOM id of an error message
  (`TextField`, `DocumentPicker`, `FieldChecklist`), and the logged error's ID shouldn't be
  confused with them.
- **Files outside the assessment's list**:
  - `frontend/src/components/FormErrorMessage/types.ts` and `frontend/src/components/TextField/types.ts`:
    `message` and `error` widen from `string` to `ReactNode`, so the webhook field's error can
    include the ID line. The ID stays inside the element that `aria-describedby` points to.
    Callers that pass strings are unaffected.
  - `backend/tests/conftest.py`: the `error_log` fixture that the unit and API tests share.
- **Docs, a little wider**:
  - `integration-api.md`: the pull URL's `502` also gets `error_id`, not only the trigger's rows.
  - `management-api.md`: the common errors table gets a `500` row.
  - `contracts/ui-screens.md` is unchanged; `design-notes.md` records the UI.
- **`tasks.md:184` left as it was**: it describes the original 503 body of the completed task T019,
  as a record. The pending T049–T051 take their bodies from `integration-api.md`, which is updated.
- **Log level**: ERROR for the 503, the 502 and the 500. The assessment allowed WARNING for a 502;
  a single level gives one rule: every error ID that a user sees has one ERROR line.
- **Test text**: `test_error_answers` passes "The wallet service could not start it" instead of
  "EUDIPLO could not start the request", to match the new wording. This is cosmetic.

## Side Effects in the Workspace

- `npm ci` in `frontend/` runs the package's `prepare` script,
  `cd ../backend && uv run pre-commit install || exit 0`.
  - It created `backend/.venv`, which is gitignored and is what `uv sync` creates as well.
  - It tried to install the git hooks and failed, because this worktree's `.git` points to a
    worktree path that doesn't exist on this machine. No hooks were installed.
- `frontend/node_modules/` and `frontend/dist/` now exist (both gitignored).
- The reproduction scripts, a scratch venv and the scratch copy for the regression check live in the
  session's scratchpad, outside the repo. The test database container is removed.

## Follow-ups

- **Logging configuration** (the accepted default: a follow-up). Give the `app.*` loggers a format
  with the time, level and logger name, for example in `backend/app/main.py` or with a uvicorn
  `--log-config`. Keep propagation to the root logger so that `caplog` still sees the records.
  Today the lines come out bare (`Error <id>: …`), and INFO lines such as "Worker started" are
  dropped.
- **`/speckit-bug-test slug=config-error-leak`**: in a browser, with `EUDIPLO_TRUST_LIST_ID` empty:
  - publishing shows the generic message and the "Error ID" line;
  - no `EUDIPLO_` text appears on the page;
  - the backend's console has the setting's name under the same ID.
- **T049–T051** (trigger and pull): map EUDIPLO errors with `http_error_for()`, as `CLAUDE.md` says,
  so that serviceBW gets the `error_id` too.
- **`describe_error()`** reports `<string>:2` for SQLAlchemy errors, which come from generated code,
  for example `OperationalError in _connection_for_bind (<string>:2)`. The type still says what
  failed, but skipping `<string>` frames in its filter would give a useful location.
- **Load failures** on the list and details pages show fixed copy without an error ID. They never
  showed API messages, so nothing leaks, but they could use `ErrorNoticeText` for consistency.
- **Unchanged and out of scope** (from the assessment):
  - uvicorn still logs the full traceback, including the exception's message, for unhandled errors;
  - nginx exposes `/docs` and `/openapi.json`.
