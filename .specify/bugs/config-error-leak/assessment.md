# Bug Assessment: Backend setting names appear in the UI's error messages

- **Slug**: config-error-leak
- **Created**: 2026-10-11
- **Source**: pasted text (no URL)
- **Verdict**: valid
- **Severity**: low. The UI shows the names of backend settings ("EUDIPLO_TRUST_LIST_ID is not set"),
  never their values. Only signed-in DO.IT team members see it, and only while the deployment is
  misconfigured. Once the trigger endpoint exists (T049), serviceBW would see it too. The names are also listed in the README, so nothing secret is revealed. Still, it
  happens in production builds, not only in development. That path writes no log line either, so
  today the browser is the only place where the cause shows up. In development, an unexpected error
  also shows the exception's own text, such as the database host and port.

## Report (verbatim or summarized)

> If in the backend the EUDIPLO env variables are not set (EUDIPLO_URL, EUDIPLO_TRUST_LIST_ID, ecc.)
> an error on the frontend is shown and the specific variable is shown. Altough this is not a
> security issue by iteselft, it should not happen. All the enviroment variable end everything
> backend related should not be visible on the frontend. A better approach would be to show a
> generic error with an UUID and log everything in the backend the also the UUID in order to admins
> to debug the problem

Expected behaviour, from the report: when a request fails on the backend's side, the UI shows a
generic message and a UUID. The backend logs the details under the same UUID, so an admin can find
them. No setting name, and nothing else from the backend's internals, reaches the frontend.

The current behaviour is the specified one. Research R3 (`research.md:216-218`) and
`contracts/management-api.md:34` say that the 503 "message names the missing setting". The fix
therefore reverses a documented decision, and those documents change with it.

## Symptom

Saving a form connection while an EUDIPLO setting is empty answers
`503 {"error": "Not configured", "message": "EUDIPLO_TRUST_LIST_ID is not set"}`. The create
wizard shows that message in its "Couldn’t publish" alert, so the user reads the backend's variable
name. The backend logs nothing about it. Expected: a generic message with an error ID in the UI,
and a backend log line that names the setting under the same ID.

## Reproduction

**In the UI** (traced through the code, not run in a browser):

1. Start the backend with one of `EUDIPLO_URL`, `EUDIPLO_CLIENT_ID`, `EUDIPLO_CLIENT_SECRET` or
   `EUDIPLO_TRUST_LIST_ID` empty, for example `EUDIPLO_TRUST_LIST_ID=` in `backend/.env`.
   `backend/.env.example` leaves all four empty. In production, `docker-compose.prod.yml:40-43`
   passes `${EUDIPLO_…}` through, and Compose turns a host variable that isn't set into an empty
   string.
2. Sign in and open `/form-connections/new`. Enter a name and a form ID and choose "Continue". Add
   a document with at least one field, choose "Publish", then "Confirm and publish".
3. The danger alert "Couldn’t publish" reads "EUDIPLO_TRUST_LIST_ID is not set". The first empty
   setting is named, checked in the order URL, client ID, client secret, trust list.
4. The backend console only has uvicorn's access line for `POST /api/form-connections … 503`.
   Nothing says why.

**Against the API** (run on 2026-10-11): these cases ran the real app through FastAPI's
`TestClient`, with every log record captured at DEBUG level. No database was needed: a signed-in user
was faked with `get_current_user` overridden, and `DATABASE_URL` pointed at a closed port. The
dependencies came from `uv.lock` (fastapi 0.141.1, starlette 1.6.0, uvicorn 0.52.4) and went into a
scratch venv outside the repo.

| # | Setup | Answer | `app.*` log lines |
|---|---|---|---|
| 1 | `APP_ENV=production`, all four EUDIPLO settings empty, `POST /api/form-connections` | `503 {"error": "Not configured", "message": "EUDIPLO_URL is not set"}` | none |
| 2 | Same, only `EUDIPLO_TRUST_LIST_ID` empty | `503 {"error": "Not configured", "message": "EUDIPLO_TRUST_LIST_ID is not set"}` | none |
| 3 | Everything set, EUDIPLO unreachable | `502 {"error": "Upstream error", "message": "EUDIPLO could not create the request configuration, so nothing was saved. Try again in a moment."}` | `WARNING app.services.eudiplo: EUDIPLO token failed: ConnectError`, with nothing that links it to the answer |
| 4 | Everything set, EUDIPLO answers `404` to `create_config` | `502`, same body as case 3 | none |
| 5 | `APP_ENV=production`, database down, `GET /api/form-connections` | `500 {"error": "Internal server error", "message": "Something went wrong"}` | none (under uvicorn, its traceback, with nothing that links it to the answer) |
| 6 | Same as case 5 with `APP_ENV=development` | `500 {"error": "Internal server error", "message": "(psycopg.OperationalError) connection failed: connection to server at \"127.0.0.1\", port 1 failed: Connection refused\n\tIs the server running on that host and accepting TCP/IP connections?"}` | none |

The harness, to repeat the run (from a directory without a `.env`, with a venv made by
`UV_PROJECT_ENVIRONMENT=<dir> uv sync --frozen --no-dev --no-install-project` in `backend/`):

```python
os.environ.update(
    {
        "APP_ENV": "production",
        "CONNECTION_BASE_URL": "https://middleware.example",
        "WORKER_ENABLED": "false",
        "DATABASE_URL": "postgresql+psycopg://nobody:nothing@127.0.0.1:1/unreachable",
        "EUDIPLO_URL": "",
        "EUDIPLO_CLIENT_ID": "",
        "EUDIPLO_CLIENT_SECRET": "",
        "EUDIPLO_TRUST_LIST_ID": "",
    }
)
sys.path.insert(0, "<repo>/backend")  # then import the app
app.dependency_overrides[auth.get_current_user] = lambda: None
client = TestClient(app, raise_server_exceptions=False)
client.post(
    "/api/form-connections",
    json={
        "name": "Test",
        "servicebw_form": "FS-1",
        "documents": [{"document_type": "pid", "fields": ["family_name"]}],
    },
)
# Case 4: eudiplo._client = EudiploClient(transport=httpx2.MockTransport(...)) answering 404
```

The existing tests assert the leak: `backend/tests/unit/test_eudiplo_client.py:53` and
`backend/tests/api/test_form_connections.py:368` expect `'message': f'{name} is not set'`.

## Suspected Code Paths

Where the setting's name gets into the answer:

- `backend/app/services/eudiplo.py:40-45`: `EudiploNotConfigured(setting)` gets the message
  `'<SETTING> is not set'`. `_require()` raises it (`:217-220`). `_request()` checks the connection
  settings on every call (`:267`), and `create_config()` also checks the trust list (`:156`). It's fine
  for the exception to carry the name, because the exception doesn't leave the backend by itself.
- `backend/app/services/eudiplo.py:359-369` **(root cause)**: `http_error_for()` copies `str(error)`
  into the 503's `message` (`:364`). It logs nothing, for the 503 and for the 502 alike.
- `backend/app/routers/form_connections.py:44-47`: `create_form_connection` turns every
  `EudiploError` into `http_error_for(error, CONFIG_FAILED)`. The 502 text `CONFIG_FAILED` (`:17-20`)
  names EUDIPLO, a backend component.
- `backend/app/errors.py:11-23`: `http_exception_handler` passes the `{error, message}` dict through
  unchanged, as designed.

Where it reaches the screen:

- `frontend/src/api/client.ts:42-56`: `handleResponse` throws `ApiError(status, {error, message})`
  for every error answer.
- `frontend/src/pages/FormConnectionEditor/utils.ts:220-223`: `publishErrorMessage()` returns
  `error.data.message` for any `ApiError`, including 5xx. `index.tsx:86-97` dispatches it as
  `publishFailed`.
- `frontend/src/pages/FormConnectionEditor/DocumentsStep.tsx:37-41`: the `KernAlert` "Couldn’t
  publish" renders it.
- `frontend/src/pages/FormConnectionDetail/utils.ts:37-40`: `saveErrorMessage()` does the same for
  the webhook address (`PUT`), and `WebhookCard.tsx:47` shows it under the field. That path doesn't
  call EUDIPLO, but in development a 500 would show the exception text there.

Related paths with the same pattern:

- `backend/app/errors.py:35-50`: in development (`APP_ENV=development`), the catch-all handler answers
  500 with `exception.args[0]` as the message (case 6). It doesn't log anything. Starlette 1.6.0
  re-raises after the handler (`starlette/middleware/errors.py:183-186`), so uvicorn logs the
  traceback, but nothing ties that traceback to the answer. `docs/ARCHITECTURE.md:271` documents the
  echo and requires production to run with something other than `APP_ENV=development`. Yet
  `development` is the default of `Settings.app_env` (`backend/app/config.py:23`).
- `backend/app/services/eudiplo.py:308-317`: `_raise_for_status()` doesn't log 404 and 409, as
  "answers the callers handle". `create_form_connection` doesn't handle them, though: they become a 502
  with no log line at all (case 4). `quickstart.md:263` ("the backend logs EUDIPLO `404`") assumes
  otherwise.
- Logging setup: the app never configures logging, and the production command
  (`backend/Dockerfile:27`) passes no `--log-config`. uvicorn's default `LOGGING_CONFIG` only sets up
  the `uvicorn`, `uvicorn.error` and `uvicorn.access` loggers. The `app.*` loggers reach stderr
  through Python's last-resort handler. It passes WARNING and above only, as the bare message,
  without time, level or logger name. INFO lines such as "Worker started" are dropped. This was
  checked against uvicorn 0.52.4.

## Root Cause Hypothesis

`http_error_for()` was designed to make a missing setting obvious, and it does that by putting the
exception's text, which names the setting, into the API answer. Research R3: "answers
`503 Not configured` with a message that names the setting". The frontend shows the API's `message`
as it is, which suits 4xx answers whose messages are written for users ("Enter a name."). It doesn't
treat 5xx answers any differently. Nothing along the way writes the cause to the log or gives the
failure an ID, so today the message in the browser is the only diagnostic. The development echo in
the catch-all handler follows the same pattern for unexpected errors.

The problem has been there since the EUDIPLO client was built (T019). It wasn't introduced by a later
change. The git history couldn't be checked: this worktree's `.git` points to a path that doesn't
exist on this machine.

Confidence: high. Cases 1–6 were reproduced against the real app, and the tests assert the
behaviour. The UI step is traced through the code only.

## Proposed Remediation

**Preferred**: keep the details in the backend's log, and give every 5xx answer an error ID that
the UI shows.

1. **Error ID in the error envelope.** Add an optional `error_id: str | None = None` to
   `ApiErrorResponse` in `backend/app/schemas.py:17-19`. Add `error_id?: string` to `ApiErrorResponse`
   in `frontend/src/types/api.ts:6-9` in the same change (Constitution I). Only 5xx answers set it,
   to a fresh `str(uuid.uuid4())`. 4xx answers stay as they are: their messages are meant for the
   user. Don't call the field `reference` or `request_id`. In this project a "request reference" is
   the secret token in the pull URL, which must never be logged (FR-019, `integration-api.md:14`).
   The error ID, by contrast, must be logged.
2. **One helper that logs and creates the ID**, in `backend/app/errors.py`. It takes the error and
   a short description, creates the ID, and logs one line with the ID, the description and
   `describe_error(error)`. Then it returns the ID. Log at ERROR, or at WARNING for a 502 if that's
   preferred. Never log an exception's message, a setting's value, a request reference or the raw
   URL path: the pull URL contains the reference. If the route matters, log its template,
   `request.scope['route'].path`.
3. **`http_error_for()`** (`eudiplo.py:359-369`) uses the helper:
   - **503**: log the setting's name from `error.setting` ("EUDIPLO_TRUST_LIST_ID is not set"), and
     answer `{"error": "Not configured", "message": <generic text>, "error_id": …}`. A suggestion for
     the text: "Something went wrong on our side, so nothing was saved. Contact an administrator and
     give them the error ID."
   - **502**: log `describe_error(error)`, and answer with the caller's message plus `error_id`. This
     also logs case 4.

   The pending trigger and pull endpoints (T049–T051) get the same behaviour: `CLAUDE.md:103-107`
   tells every router to map EUDIPLO errors with `http_error_for()`, and T051 copies the error bodies
   from `integration-api.md`, which is updated with this fix.
4. **Catch-all handler** (`errors.py:35-50`): use the helper. Answer
   `{"error": "Internal server error", "message": <generic text>, "error_id": …}` in every
   environment, and drop the development-only echo of `exception.args[0]`. Developers find the
   details in the console under the ID, next to uvicorn's traceback.
5. **`CONFIG_FAILED`** (`routers/form_connections.py:17-20`): write "The wallet service" instead of
   "EUDIPLO", as the integration API's 502 message already does (`integration-api.md:77`).
6. **Frontend**: wherever the UI shows an API message, it also shows the error ID, when there is
   one. That means the "Couldn’t publish" alert (`DocumentsStep.tsx`, fed by `publishErrorMessage()`)
   and the webhook address error (`saveErrorMessage()`). For example, add a second line
   "Error ID: 3f0c…" in selectable text, with the label in the page's `constants.ts`. A small shared
   component (for example `src/components/ErrorId/`) keeps the two the same. The editor's
   `publishError` becomes `{ message, errorId? }`, or gets a sibling `publishErrorId`.
7. **Docs**: see "Files likely to change".

**Alternatives**:

- **Request ID middleware**: a middleware gives every request an ID, and a contextvar plus a
  `logging.Filter` put it on every log line. 5xx answers return the ID. This also tags lines logged
  deep inside the EUDIPLO client, like case 3's `EUDIPLO token failed: ConnectError`, which the
  preferred fix only links by time. It's more machinery, though:
  - the plain-`def` handlers run in a threadpool, so you'd need to check that the contextvar reaches
    it;
  - the worker thread has no request;
  - nothing may log a path that contains a reference.

  It pays off once there's a log aggregator. This bug doesn't need it.
- **The ID inside the message text** ("Something went wrong (error ID …)"): no envelope change, but
  copy and data share one string, which is harder to test and to lay out.
- **Frontend only**: show fixed copy for every 5xx. This hides the text in this UI, but the API
  still sends it to every other client (serviceBW, curl), and still nothing is logged. It could be
  added on top as defence in depth, at the cost of the 502's specific message.
- **Hide the name in production only**: development would still show it, and the report asks that
  nothing from the backend reaches the frontend.

**Files likely to change**:

- `backend/app/services/eudiplo.py`
- `backend/app/errors.py`
- `backend/app/schemas.py`
- `backend/app/routers/form_connections.py`
- `backend/tests/unit/test_eudiplo_client.py`
- `backend/tests/api/test_form_connections.py`
- `backend/tests/api/test_errors.py` (new)
- `frontend/src/types/api.ts`
- `frontend/src/api/client.ts` (only if `isApiErrorResponse` should check the type of `error_id`)
- `frontend/src/pages/FormConnectionEditor/`: `utils.ts`, `types.ts`, `index.tsx`,
  `DocumentsStep.tsx`, `constants.ts`
- `frontend/src/pages/FormConnectionDetail/`: `utils.ts`, `WebhookCard.tsx`, `constants.ts`
- `frontend/src/components/ErrorId/` (new, if extracted)
- `specs/001-servicebw-eudi-middleware/contracts/management-api.md`: the envelope (`:9-11`) and
  the 503 row (`:34`)
- `specs/001-servicebw-eudi-middleware/contracts/integration-api.md`: the envelope (`:15-17`) and
  the 502 and 503 rows (`:77-78`)
- `specs/001-servicebw-eudi-middleware/research.md`: R3 (`:216-218`). The log names the setting,
  not the answer. Record the decision and its date.
- `specs/001-servicebw-eudi-middleware/quickstart.md`: troubleshooting (`:261`, `:263`)
- `specs/001-servicebw-eudi-middleware/design-notes.md`: the alert shows the error ID (`:291-292`)
- `docs/ARCHITECTURE.md`:
  - `http_error_for` (`:210-211`);
  - the error format (`:244-250`);
  - the handler table and the `APP_ENV` warning (`:254-272`).
- `CLAUDE.md`: the EUDIPLO bullet (`:103-107`) and the frontend `apiFetch` bullet (`:228-232`).
  5xx answers carry `error_id`, the backend logs it, and the UI shows it.

**Tests to add or update**:

- `test_eudiplo_client.py::test_saving_a_configuration_needs_every_setting` (`:40`): stop expecting
  `'<SETTING> is not set'` in the detail. Assert instead that:
  - the detail has the generic message and no `EUDIPLO_` text;
  - `error_id` is a UUID;
  - `caplog` has one record with the setting's name and the same ID.
- `test_eudiplo_client.py::test_error_answers` (`:155`): the 502 detail has an `error_id`, and a log
  record carries it.
- `test_form_connections.py::test_creating_answers_503_while_a_eudiplo_setting_is_empty` (`:354`):
  - the body has the generic message and an `error_id`;
  - `name not in response.text`;
  - the log names the setting under the same ID.
- `test_form_connections.py::test_creating_answers_502_and_saves_nothing_when_eudiplo_fails`
  (`:375`): compare `error` and `message` and check that `error_id` is a UUID, instead of comparing
  the whole body.
- New: a 502 caused by an EUDIPLO `404` to `create_config` is logged with its ID (case 4).
- New, `tests/api/test_errors.py`: make a route raise an unexpected error whose message looks
  sensitive. For example, monkeypatch `form_connections.list_form_connections` to raise
  `RuntimeError('postgresql://user:secret@db')`, and call it through
  `TestClient(app, raise_server_exceptions=False)`. Under `APP_ENV=development`, which the tests use:
  - the 500 body has the generic message and an `error_id`, and none of the exception text;
  - the log line has the same ID and none of the exception text either.
- Frontend: there's no test runner (`frontend/package.json`). Run `npm run lint` and
  `npm run build`, then check in the browser with `/speckit-bug-test`, with `EUDIPLO_TRUST_LIST_ID`
  empty:
  - publishing shows the generic message and an error ID;
  - no `EUDIPLO_` text appears anywhere on the page;
  - the backend console names the setting under the same ID.

## Risks & Considerations

- **Spec change**: R3 and both contracts promise the setting name in the message. The 503 is what
  stops FR-010 from being bypassed silently, and it stays. Only the place where the name shows up
  changes, from the answer to the log. Record this as a decision in R3.
- **Diagnosis moves to the logs**: today the browser shows the cause. After the fix, an admin needs
  the backend's log, so the new lines must actually show up:
  - log at WARNING or ERROR, because INFO is dropped with the current setup;
  - the lines come out without time, level or logger name (`docker compose logs -t` adds the time).

  A minimal logging configuration (time, level and logger name for `app.*`, in `backend/app/main.py`)
  would make them easier to read. It fits this fix or a follow-up (see Open Questions). If it sets
  `propagate=False` on `app`, `caplog` stops seeing the records.
- **Contract shape**: `error_id` is optional and additive. The frontend's `isApiErrorResponse` checks
  only `error` and `message`, so an older frontend keeps working. The integration API's 502 and 503
  get the field too, so serviceBW can quote it.
- **Logging rules** (`CLAUDE.md:114-116`, FR-019): a new log line may contain the error ID, the
  setting's name, the route's template, and the exception's type and code location. It must never
  contain the setting's value (think `EUDIPLO_CLIENT_SECRET`), an exception's message, a request
  reference, a token or a response body.
- **Development loses the exception text in the browser**: developers read it in the console, where
  uvicorn already prints the traceback. The `APP_ENV` warning in `ARCHITECTURE.md:271` loses this
  reason. `APP_ENV` still decides the cookie's `Secure` flag and the `CONNECTION_BASE_URL` check.
- **uvicorn's traceback** for an unhandled error includes the exception's message, which the
  project's own log lines leave out. That's how it works today and is out of scope here.
- **No ID when the backend is down**: nginx's own 502 page isn't JSON, so the frontend falls back to
  "An unexpected error occurred" without an ID. That's expected, because the backend never saw the
  request.
- **Related, out of scope**: `frontend/nginx.conf:31-40` deliberately exposes FastAPI's `/docs` and
  `/openapi.json` without sign-in. They list the API's routes and schemas, not settings, but they are
  backend details on the frontend's origin. That needs a separate decision.

## Open Questions

`/speckit-bug-fix` applies these defaults unless the user decides otherwise:

- [NEEDS CLARIFICATION: Keep `"error": "Not configured"` on the 503? Default: keep. It names no
  setting, and it lets serviceBW tell an operator error from an outage. The alternative is a
  generic `"Service unavailable"`.]
- [NEEDS CLARIFICATION: The exact user-facing text of the generic 503 and 500 messages. Default: the
  suggestion in step 3, without "so nothing was saved" for the 500. `design-notes.md` records the
  final wording.]
- [NEEDS CLARIFICATION: Configure app logging (time, level, logger name) in this fix, or in a
  follow-up? Default: a follow-up, provided the new lines are logged at WARNING or ERROR.]
