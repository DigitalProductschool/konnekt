---

description: "Task list for the serviceBW ↔ EUDI Wallet Form Connections middleware"
---

# Tasks: serviceBW ↔ EUDI Wallet Form Connections

**Input**: Design documents from `/specs/001-servicebw-eudi-middleware/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: Included because the plan asks for them: plan.md "Testing", research R17, and
quickstart §3. Each story's tests come after its implementation, because the plan doesn't ask for
test-first. They are not a merge gate (constitution TODO(TEST_STRATEGY)).

**Organization**: Tasks are grouped by user story, so that each story can be implemented and
tested as an increment.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel, because it touches different files and depends on no unfinished
  task in the same phase.
- **[Story]**: Which user story the task belongs to (US1, US2 and US4; US3, webhook mode, was
  removed on 2026-10-19).
- Every description names the exact files.

## Path Conventions

- **Backend**: `backend/app/`, with routers in `backend/app/routers/`, domain logic in
  `backend/app/services/`, and tests in `backend/tests/`.
- **Frontend**: `frontend/src/`, using `api/`, `components/`, `hooks/`, `pages/`, `types/` and
  `utils/`.
- **Rules**: constitution v1.0.0 applies to every task.
  - Sync SQLAlchemy `Session`, with `select()`, `db.get()` and `db.scalars()`.
  - Plain `def` handlers.
  - Errors as `HTTPException` with an `{'error', 'message'}` detail.
  - `{data, message?}` response envelopes.
  - `logging`, never `print()`.
  - No inline styles, `useReducer` for related state, and list items as sub-components.
- **Personal data**: no claims, tokens, secrets or request references in any log (research R8).

---

## Phase 1: Setup (cleanup and dependencies)

**Purpose**: Remove the template's test project, and add the test tooling and the KERN packages
(research R1, plan "Cleanup of the template code"). Every other new dependency is added by the task
that first imports it, so that no merge declares a dependency nothing imports (constitution IV).

- [X] T001 Remove the template's example and mock code from the backend:
  - delete `backend/app/routers/team_members.py` and `backend/app/routers/id_verification.py`;
  - remove the `TeamMember` model from `backend/app/models.py`;
  - remove `TeamMemberResponse`, `CreateTeamMemberRequest`, `UpdateTeamMemberRequest`, `AskIdResponse` and `PersonIdResponse` from `backend/app/schemas.py`, keeping `ApiResponse`, `ApiErrorResponse` and `to_iso_utc`;
  - in `backend/app/main.py`, remove both router registrations and `GET /`, set the API title to "serviceBW ↔ EUDI Wallet Middleware", and make `GET /api/health` return `{"data": {"status": "ok", "timestamp": …}}` without `api_key`;
  - remove the `api_key` field from `backend/app/config.py`.
- [X] T002 [P] Remove `API_KEY` from `backend/.env.example` and from the `backend` environment in `docker-compose.prod.yml`.
- [X] T003 [P] Remove the template's frontend example:
  - delete `frontend/src/pages/TeamMembers/` and `frontend/src/api/team-members.ts`;
  - reduce `frontend/src/types/api.ts` to `ApiResponse<T>` and `ApiErrorResponse`;
  - move the `VITE_API_URL` normalization, `ApiError`, `isApiErrorResponse` and `handleResponse` into a new `frontend/src/api/client.ts`;
  - make `frontend/src/App.tsx` render an empty shell;
  - delete the tracked `frontend/tsconfig.app.tsbuildinfo`, and add `*.tsbuildinfo` to `.gitignore`.
- [X] T004 [P] Prepare the backend tests in `backend/pyproject.toml`, then run `uv lock` and `uv sync` in `backend/` so `backend/uv.lock` is refreshed (research R17):
  - add `pytest` to the `dev` group;
  - delete `asyncio_mode = "auto"` from `[tool.pytest.ini_options]`.

  The runtime dependencies are added by the tasks that first import them: `argon2-cffi` in T015, `httpx2` in T019 and `segno` in T046.
- [X] T005 [P] Add the KERN packages in `frontend/` with `npm install --save-exact @kern-ux/native @kern-ux-annex/kern-react-kit @digitalservicebund/kern-ux-tailwind-theme`. Then add the four CSS imports to `frontend/src/index.css` in the order of `docs/KERN-DESIGN-SYSTEM.md` §2; they use all three packages. Keep the existing `@theme` block until T025. `react-router` is added by T028.
- [X] T006 Check that the cleaned-up project still builds and starts: `uv run ruff check . && uv run mypy app/` in `backend/`, `npm run lint && npm run build` in `frontend/`, and `docker compose up --build`. Fix any remaining reference to the removed code in `backend/app/` or `frontend/src/`.

---

## Phase 2: Foundational (blocking prerequisites)

**Purpose**: Configuration, the full database schema, sign-in, the EUDIPLO client, the worker
framework, the test harness and the frontend shell.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Configuration and database

- [X] T007 Add the settings from research R18 to `Settings` in `backend/app/config.py`, and add every variable with a short comment to `backend/.env.example`:
  - fields:
    - `connection_base_url: str | None = None`;
    - `eudiplo_url`, `eudiplo_client_id`, `eudiplo_client_secret` and `eudiplo_trust_list_id`, each `str = ''`;
    - `request_lifetime_seconds: int = 600`;
    - `document_retention_seconds: int = 1800`;
    - `pull_repeat_window_seconds: int = 60`;
    - `request_record_retention_seconds: int = 604800`;
    - `allow_plain_http: bool = False`;
    - `worker_enabled: bool = True`;
    - `login_session_hours: int = 8`.
  - a validator: in development an unset `connection_base_url` becomes `http://localhost:3000`. In any other environment, startup fails if it is unset, or if it isn't `https://` while `allow_plain_http` is false.
- [X] T008 [P] Raise the connection pool in `backend/app/db.py` to `pool_size=10, max_overflow=20`, keeping `pool_pre_ping=True` (research R15).
- [X] T009 Pass the backend settings through compose:
  - `docker-compose.yml`: add `env_file: [{path: ./backend/.env, required: false}]` to `backend`.
  - `docker-compose.prod.yml`: add these variables to `backend` as `${VAR}`, or as `${VAR:-default}` with the research R18 defaults: `CONNECTION_BASE_URL`, `EUDIPLO_URL`, `EUDIPLO_CLIENT_ID`, `EUDIPLO_CLIENT_SECRET`, `EUDIPLO_TRUST_LIST_ID`, `REQUEST_LIFETIME_SECONDS`, `DOCUMENT_RETENTION_SECONDS`, `PULL_REPEAT_WINDOW_SECONDS`, `REQUEST_RECORD_RETENTION_SECONDS`, `ALLOW_PLAIN_HTTP`, `WORKER_ENABLED` and `LOGIN_SESSION_HOURS`.
- [X] T010 Add `UserAccount` (`user_accounts`) and `LoginSession` (`login_sessions`) to `backend/app/models.py`, exactly as in data-model.md:
  - `username`: "`String(100)`, unique, indexed", "Stored in lowercase. 3–100 characters from `a–z 0–9 . _ -`";
  - `password_hash`: "`String(255)`";
  - `user_account_id`: "FK → `user_accounts.id`, indexed, `ON DELETE CASCADE`";
  - `token_hash`: "`String(64)`, unique, indexed";
  - `expires_at`: "`DateTime(timezone=True)`, indexed";
  - `String(36)` UUID4 ids, and `created_at`/`updated_at` as `DateTime(timezone=True)` with `server_default=func.now()`.
- [X] T011 Add `FormConnection` (`form_connections`) and `FormConnectionRevision` (`form_connection_revisions`) to `backend/app/models.py`, exactly as in data-model.md (webhook parts removed by T092):
  - form connection:
    - `name`: "`String(200)`", "1–200 characters after trimming";
    - `servicebw_form`: "`String(500)`", "1–500 characters after trimming";
    - `is_active`: "`Boolean`, default `true`";
    - `webhook_url`: "`String(2000)`, nullable";
    - `current_revision`: "`Integer`";
    - `deleted_at`: "`DateTime(timezone=True)`, nullable, indexed";
  - revision:
    - `form_connection_id`: FK, indexed;
    - `revision`: "`Integer`", "Unique together with `form_connection_id`";
    - `documents`: "`JSONB`";
    - `lifetime_seconds`: "`Integer`";
    - `config_hash`: "`String(64)`";
    - `eudiplo_config_id`: "`String(255)`, unique";
    - `eudiplo_config_deleted_at`: nullable;
  - the partial index on `(form_connection_id)`, `WHERE eudiplo_config_deleted_at IS NULL`.
- [X] T012 Add `DocumentRequest` (`document_requests`) to `backend/app/models.py`, exactly as in data-model.md (webhook parts removed by T092):
  - `reference`: "`String(64)`, unique, indexed";
  - `form_connection_id` and `revision_id`: FKs, indexed;
  - `mode`: "`String(16)`" (`pull` or `webhook`);
  - `webhook_url`: "`String(2000)`, nullable";
  - `status`: "`String(32)`, indexed", one of `pending`, `completed`, `declined`, `verification_failed`, `expired` or `unavailable`;
  - `failure_code`: "`String(100)`, nullable";
  - `eudiplo_session_id`: "`String(255)`, unique";
  - `expires_at`: indexed;
  - `status_changed_at`;
  - nullable timestamps: `completed_at`, `documents_delivered_at`, `eudiplo_session_deleted_at`, and `ended_at` (indexed);
  - the composite index `(status, expires_at)`;
  - the partial index on `(status)`, `WHERE eudiplo_session_deleted_at IS NULL`.
- [X] T013 Add `WebhookDelivery` (`webhook_deliveries`) to `backend/app/models.py`, exactly as in data-model.md (webhook parts removed by T092):
  - `document_request_id`: "FK → `document_requests.id`, indexed, `ON DELETE CASCADE`";
  - `status`: "`String(32)`";
  - `occurred_at`;
  - `attempts`: "`Integer`, default `0`";
  - `next_attempt_at`;
  - `claimed_until`: nullable;
  - `deadline_at`;
  - `delivered_at` and `abandoned_at`: nullable;
  - `last_error`: "`String(255)`, nullable";
  - the partial index on `(next_attempt_at)`, `WHERE delivered_at IS NULL AND abandoned_at IS NULL`.
- [X] T014 First add `import app.models  # noqa: F401` to `backend/alembic/env.py`: autogenerate only sees models whose module is imported, and `env.py` imports only `Base` from `app.db`. Then generate the migration in `backend/` with `uv run alembic revision --autogenerate -m "form connections"`, and review the new file in `backend/alembic/versions/`:
  - it drops `team_members` and `ix_team_members_git_handle`;
  - it creates the six tables, with the `ON DELETE CASCADE` foreign keys, the `JSONB` column and the partial indexes;
  - `v0_add_team_members.py` stays untouched.

  Then run `uv run alembic upgrade head`.

### Sign-in (FR-007)

- [X] T015 Implement `backend/app/services/auth.py` (research R14):
  - add `argon2-cffi` to `dependencies` in `backend/pyproject.toml`, with its current release as the version floor, and run `uv lock` and `uv sync` in `backend/`;
  - Argon2id hashing with `argon2.PasswordHasher`;
  - `create_login_session(db, user)`, which stores the SHA-256 hex of a `secrets.token_urlsafe(32)` token with `expires_at` = now + `LOGIN_SESSION_HOURS`;
  - `set_session_cookie()` and `clear_session_cookie()`: cookie `session`, `HttpOnly`, `SameSite=Strict`, `Path=/api`, `Secure` unless `APP_ENV=development`, `Max-Age` = the session lifetime;
  - dependency `get_current_user`: a missing, unknown or expired session gets 401 `{"error": "Unauthorized", "message": "Sign in to continue"}`;
  - dependency `require_json`: a `POST`, `PUT` or `DELETE` whose `Content-Type` isn't `application/json` gets 415 `{"error": "Unsupported media type", "message": "Send the request body as JSON."}`.
- [X] T016 Add `UserView` and `LoginRequest` to `backend/app/schemas.py`, and implement `backend/app/routers/auth.py` as in contracts/management-api.md "Authentication". Register the router in `backend/app/main.py`.
  - `POST /api/auth/login` returns 200 `{"data": UserView}` and sets the cookie. A wrong username and a wrong password both get the same 401 `{"error": "Unauthorized", "message": "Invalid username or password"}`.
  - `POST /api/auth/logout` deletes the session row, clears the cookie, and returns 200 `{"data": null, "message": "Signed out"}`.
  - `GET /api/auth/me` returns the signed-in user.
- [X] T017 [P] Implement `backend/app/cli.py` with `argparse`, run as `uv run python -m app.cli …` (research R14). Write short confirmations to standard output, never the password.
  - `create-user <username>` lowercases the name, checks "3–100 characters from `a–z 0–9 . _ -`", prompts twice with `getpass`, and requires "at least 12 characters".
  - `set-password <username>` also deletes the account's `login_sessions`.
  - `delete-user <username>` removes the account; the cascade deletes its sessions.

### EUDIPLO client

- [X] T018 Check the EUDIPLO API before writing the client. Ask the user for `EUDIPLO_URL` and the API client's credentials, and fetch `$EUDIPLO_URL/api/docs-json` (`.info.version` must be 9.x). Compare it with the seven calls in `specs/001-servicebw-eudi-middleware/contracts/eudiplo-usage.md`. Answer the research R19 item 4 points that the OpenAPI settles, and record any difference in `specs/001-servicebw-eudi-middleware/research.md`.
- [X] T019 Implement `backend/app/services/eudiplo.py` as in contracts/eudiplo-usage.md:
  - move `httpx2>=2.12.0` from the `dev` group to `dependencies` in `backend/pyproject.toml`, and run `uv lock` and `uv sync` in `backend/` (research R15);
  - a synchronous `httpx2.Client` with a 5 s connect and 10 s read timeout;
  - a token from `POST /api/oauth2/token`, cached in memory behind a lock, renewed 5 minutes before `expires_in` ends, and fetched again once after a 401;
  - methods `create_config`, `delete_config`, `create_offer`, `list_sessions`, `get_session` and `delete_session`;
  - hand-written Pydantic response models with `extra='ignore'`;
  - exceptions:
    - `EudiploNotConfigured`, carrying the name of the missing setting: raised by every call when `EUDIPLO_URL` or the client credentials are empty, and by `create_config` when `EUDIPLO_TRUST_LIST_ID` is empty;
    - `EudiploNotFound` (404) and `EudiploConflict` (409);
    - `EudiploUnavailable` for other errors and timeouts.
  - `http_error_for(exc, upstream_message)`, which returns an `HTTPException`: 503 `{"error": "Not configured", "message": "<SETTING> is not set"}`, or 502 `{"error": "Upstream error", "message": upstream_message}`;
  - `get_eudiplo_client()`, which tests can override with an `httpx2.MockTransport`;
  - tokens, secrets and `credentials` are never logged.

### Worker framework

- [X] T020 Implement the worker framework in `backend/app/services/worker.py`, and start and stop it from a FastAPI lifespan in `backend/app/main.py` when `WORKER_ENABLED` is true (research R7).
  - A daemon thread runs the registered steps every 2 seconds.
  - Each step uses its own `SessionLocal()` session and short transactions, and is a plain function that tests can call directly.
  - An exception is logged without personal data, and the loop continues.
  - A bounded `ThreadPoolExecutor` (8 workers) runs outbound calls. A set of in-flight keys keeps a call from being dispatched twice, and the loop never waits for these calls.
  - The first registered step deletes expired `login_sessions`.

### Test harness

- [X] T021 Create the test harness:
  - `backend/tests/conftest.py`:
    - before importing `app`, set `WORKER_ENABLED=false` and fake EUDIPLO settings in `os.environ`;
    - refuse to run unless the database name in `DATABASE_URL` ends in `_test`;
    - create the schema with Alembic `upgrade head` once per session, and empty every table between tests;
    - fixtures `client` (FastAPI `TestClient`), `signed_in_client` (a user with a session cookie) and `fake_eudiplo`.
  - `backend/tests/fake_eudiplo.py`: an `httpx2.MockTransport` double of the seven calls in contracts/eudiplo-usage.md. Session state can be set to `active`, `fetched`, `completed`, `failed` with a `failureCode`, or `expired`, with `consumedAt`, `updatedAt` and `credentials`, and any call can be forced to answer `404`, `409` or `5xx`.
- [X] T022 [P] Write `backend/tests/api/test_auth.py` and `backend/tests/unit/test_cli.py`:
  - sign-in sets the cookie with the required flags;
  - a wrong username and a wrong password get the same 401;
  - `/api/auth/me` with and without a session;
  - sign-out deletes the session, and an expired session is rejected;
  - a `POST` without JSON gets 415;
  - `create-user` refuses a password shorter than 12 characters and an invalid username;
  - `set-password` ends the account's sessions.

### Frontend shell

- [X] T023 Get the design. Ask the user for the Figma URL, load the `figma:figma-design-to-code` skill, and pull the design context and screenshots for the sign-in, overview, create/edit and details screens. Write `specs/001-servicebw-eudi-middleware/design-notes.md` recording:
  - the UI language and copy, including the catalog's field labels;
  - the KERN components and tokens;
  - fonts and colours;
  - any difference from contracts/ui-screens.md, whose behavior stays authoritative.
- [X] T024 [P] Update `frontend/src/api/client.ts` (research R14, R16):
  - add `apiFetch`, which uses `credentials: 'include'`;
  - every `POST`, `PUT` and `DELETE` sends `Content-Type: application/json`, with a `{}` body when it has none;
  - `{data, message}` envelopes are unwrapped, and `{error, message}` envelopes become an `ApiError`;
  - keep the `VITE_API_URL` normalization.
- [X] T025 [P] Apply the design basics from `specs/001-servicebw-eudi-middleware/design-notes.md`:
  - `<title>` and `lang` in `frontend/index.html`;
  - in `frontend/src/index.css`, keep or replace the template's `@theme` block, its font and `frontend/src/fonts/`;
  - tokens stay in `@theme` or the KERN theme, and there are no inline styles.
- [X] T026 Add `frontend/src/types/auth.ts` (`UserView`, `LoginRequest`, mirroring `backend/app/schemas.py`) and `frontend/src/api/auth.ts` (`login`, `logout`, `getMe`, using `apiFetch`).
- [X] T027 Implement sign-in state in `frontend/src/hooks/useCurrentUser.ts`, with a context provider if the design needs one. It loads `GET /api/auth/me` once, treats a 401 as signed out, and exposes `user`, `signIn` and `signOut`.
- [X] T028 Set up routing:
  - add `react-router` in `frontend/` with `npm install --save-exact react-router@7`;
  - `frontend/src/main.tsx` wraps the app in react-router's `BrowserRouter`;
  - `frontend/src/App.tsx` declares `/login`, `/`, `/form-connections/new`, `/form-connections/:id` and `/form-connections/:id/edit`, with placeholders for screens not built yet;
  - a guard sends signed-out users to `/login`, and back to the requested route after sign-in;
  - every route sets its own document title.
- [X] T029 Build `frontend/src/components/AppLayout/` (with `types.ts`) from the design. It shows the signed-in user's name and a sign-out action, and provides a `<main>` landmark with one main heading per page (contracts/ui-screens.md).
- [X] T030 Build `frontend/src/pages/Login/` as in contracts/ui-screens.md "Sign in" and design-notes.md:
  - KERN username and password fields with visible labels, and a submit action;
  - after a failed sign-in, one generic "Invalid username or password" message, announced to screen readers;
  - after success, a redirect to the requested route.

The design changed after Phase 2: the user shared Figma "Middleware – V2" (`BZUNank5VjCzqr2BcyhifB`)
for the sign-in, with a separate forgot-password screen. T084 and T085 redo T023's sign-in part
and T030 against it; the backend and the database stay as they are.

- [X] T084 Update `specs/001-servicebw-eudi-middleware/design-notes.md` to the V2 frames "01 Log in" (`153:7661`) and "01b Forgot password" (`2041:7569`):
  - record the user's decisions: the product name "Product name", the illustration's chips as designed, the Phase 2 message for a failed sign-in, and the `--shadow-chip` token;
  - add the `/forgot-password` screen to `specs/001-servicebw-eudi-middleware/contracts/ui-screens.md`;
  - mark the sections that still describe V1.
- [X] T085 Rebuild the signed-out screens from V2, as in design-notes.md §3–4:
  - `frontend/src/components/AuthLayout/`: the top bar, the intro with the decorative wallet scene, and the card;
  - `frontend/src/components/RequireSignedOut/`: signed-in users go on to the app;
  - `frontend/src/pages/Login/`: the card without subtitle and shadow, and a "Forgot password?" link;
  - `frontend/src/pages/ForgotPassword/` at `/forgot-password`, with "Back to log in";
  - remove the logged-out alert (`loggedOut` in `frontend/src/components/CurrentUserProvider/`), the benefit rows and `frontend/src/components/LegalFooter/`;
  - `APP_NAME` in `frontend/src/constants.ts`, the `<title>` in `frontend/index.html`, the 16 px logo mark in `frontend/src/components/TopBar/`, and `--shadow-chip` in `frontend/src/index.css`.

**Checkpoint**: The foundation is ready. A team member created with the CLI can sign in and out of
an empty app shell.

---

## Phase 3: User Story 1 - Set up a form connection and obtain its connection URLs (Priority: P1) 🎯 MVP

**Goal**: A signed-in DO.IT team member creates a form connection: name, serviceBW form, and
documents with selected fields from the catalog. They then see its trigger URL and pull URL, and
can copy each in one action. Until T092 removed webhook mode, the API also stored a webhook
address (T036, T044), which the UI stopped offering with T086.

**Independent Test**:
1. Create a form connection with the PID and the mDL and some fields, then save.
2. The details screen shows both URLs, and each copies in one click. It offers no webhook address.
3. Reopening the form connection shows the same URLs.
4. Saving without a document, or with a document that has no fields, is refused with a message
   that names the problem.

This is quickstart V1, steps 3–6. Phase 4 adds the first-connection screen (steps 1–2 and 7–8).

### Implementation for User Story 1

- [X] T031 [P] [US1] Create `backend/app/catalog.py` with the two document types exactly as listed in data-model.md "Document type catalog". Use immutable dataclasses and lookup helpers by key. Use the labels from design-notes.md where T023 changed them.
  - `pid`: format `dc+sd-jwt`, `vct_values` `urn:eudi:pid:1` and `urn:eudi:pid:de:1`, and the 25 fields with their keys, claim paths and labels;
  - `mdl`: format `mso_mdoc`, doctype `org.iso.18013.5.1.mDL`, namespace `org.iso.18013.5.1`, and the 31 fields.
- [X] T032 [P] [US1] Add `DocumentField`, `DocumentType`, `RequestedDocument`, `RequestedDocumentView`, `FormConnectionSummary`, `FormConnection`, `FormConnectionCreate` and `FormConnectionUpdate` to `backend/app/schemas.py`, exactly as in contracts/management-api.md "Schemas" (webhook parts removed by T092):
  - field names are snake_case;
  - timestamps are converted with `to_iso_utc`;
  - request schemas accept empty lists;
  - `FormConnectionUpdate` tells an absent `webhook_url` from `null` through `model_fields_set`.
- [X] T033 [US1] Create `backend/app/services/dcql.py` (depends on T031). It builds the EUDIPLO presentation configuration body of a revision exactly as in contracts/eudiplo-usage.md "Presentation configuration (call 2)".
  - One credential query per document:
    - `id` is the document type key, with `format` and `meta` (`vct_values` or `doctype_value`);
    - every query carries the same `trusted_authorities` `[{"type": "etsi_tl", "values": [{"trustListId": EUDIPLO_TRUST_LIST_ID}]}]`;
    - claims are in catalog order, as `[namespace, element]` for mdoc;
    - there are no `credential_sets` and no `claim_sets`.
  - The body also has `id` `fc-{form_connection_id}-r{revision}`, `description` (the form connection's name), `lifeTime` and `statusCheckMode: "strict"`.
  - `config_hash` is the SHA-256 hex of the canonical JSON (sorted keys, compact separators) of the body without `id` and `description`.
- [X] T034 [US1] Implement `backend/app/routers/document_types.py`: `GET /api/document-types`, for signed-in users only, returning `200 {"data": DocumentType[]}` in catalog order. Register it in `backend/app/main.py`.
- [X] T035 [US1] Implement creating, reading and listing in `backend/app/services/form_connections.py` (webhook parts removed by T092):
  - **Validation**: the rules and messages of data-model.md "Validation (FR-003)", for example "Add at least one document.", "Select at least one field for 'ID (PID)'." and "The webhook address must be an https:// URL." `http://` is allowed only with `ALLOW_PLAIN_HTTP`. Documents are stored in catalog order.
  - **Create**: create the EUDIPLO configuration with `create_config`, then insert the form connection and revision 1 (`lifetime_seconds` = `REQUEST_LIFETIME_SECONDS`, plus `config_hash`). If the commit fails, delete the configuration again (best effort, logged).
  - **Get**: 404 for unknown or deleted form connections.
  - **List**: form connections that aren't deleted, most recently updated first.
  - **Derived values**: `mode`, `trigger_url` = `{CONNECTION_BASE_URL}/api/connect/{id}/requests`, and `pull_url` = `…/requests/{reference}` with the literal placeholder.
- [X] T036 [US1] Implement updating `name`, `servicebw_form` and `webhook_url` in `backend/app/services/form_connections.py` (webhook parts removed by T092):
  - an absent field is unchanged, and `webhook_url: null` removes the address;
  - the same validation applies as on creation;
  - no revision is created ("never because the name, the serviceBW form or the webhook address changed", data-model.md).
- [X] T037 [US1] Implement `backend/app/routers/form_connections.py`, and register it in `backend/app/main.py`:
  - `GET /api/form-connections`;
  - `POST /api/form-connections` (201, message "Form connection created");
  - `GET /api/form-connections/{id}`;
  - `PUT /api/form-connections/{id}` (message "Form connection updated");
  - every endpoint depends on `get_current_user`, and the state-changing ones also on `require_json`;
  - EUDIPLO exceptions are mapped with `http_error_for`.
- [X] T038 [P] [US1] Add `frontend/src/types/document-types.ts` and `frontend/src/types/form-connections.ts`, mirroring the T032 schemas. Add `frontend/src/api/document-types.ts` (`getDocumentTypes`) and `frontend/src/api/form-connections.ts` (`listFormConnections`, `createFormConnection`, `getFormConnection`, `updateFormConnection`).
- [X] T039 [P] [US1] Build `frontend/src/components/CopyableUrl/` (with `types.ts`): a read-only URL with a one-action copy button using `navigator.clipboard`. A visually hidden live region announces "copied" (contracts/ui-screens.md "Accessibility").
- [X] T040 [US1] Build the overview `frontend/src/pages/FormConnectionList/` as in contracts/ui-screens.md "Overview". US4 adds the active/deactivated state.
  - each row is a `FormConnectionRow` sub-component showing the name and serviceBW form, and opens `/form-connections/:id`;
  - a "Create form connection" action;
  - loading, empty (with a prompt to create the first one) and error states.
- [X] T041 [US1] Build the create screen `frontend/src/pages/FormConnectionEditor/` as in contracts/ui-screens.md "Create and edit":
  - `useReducer` state, with the actions defined in `types.ts`;
  - name and serviceBW form fields;
  - a `DocumentPicker` sub-component that adds catalog types, each once, and removes them again;
  - a `FieldChecklist` sub-component with the fields of one document;
  - client-side checks with the same messages as the API, shown next to their field, moving the focus to the first invalid field;
  - `POST`, then navigate to the details screen, and show the API's 400 `message` if it refuses;
  - constants and helpers in `constants.ts` and `utils.ts`.
- [X] T042 [US1] Build the details screen `frontend/src/pages/FormConnectionDetail/` as in contracts/ui-screens.md "Details" (webhook parts removed by T092):
  - the trigger URL and pull URL, each in a `CopyableUrl`, with a hint that serviceBW fills in `{reference}`;
  - the current mode, pull or webhook;
  - the webhook address field, with save and remove (`PUT` with `webhook_url`, or with `null`), its validation message, and an announced "saved" status;
  - a configuration summary listing the documents and field labels.

### Tests for User Story 1

- [X] T043 [P] [US1] Write `backend/tests/unit/test_catalog.py` and `backend/tests/unit/test_dcql.py`:
  - catalog: unique keys, 25 PID and 31 mDL fields, and the claim paths and formats of data-model.md;
  - DCQL: the body for the PID + mDL example equals contracts/eudiplo-usage.md, claims follow catalog order, and every query has the same trust list;
  - hash: it ignores `id` and `description`, and changes with the trust list or the lifetime.
- [X] T044 [US1] Write `backend/tests/api/test_form_connections.py` (webhook parts removed by T092):
  - creating with two documents returns stable URLs and `mode: "pull"`;
  - every validation message of data-model.md;
  - 503 when a EUDIPLO setting is empty, and 502 with nothing stored when the fake EUDIPLO fails;
  - get and list, with deleted form connections hidden;
  - `PUT` with a webhook address switches `mode` to `webhook`, `null` removes it, and `http://` is refused unless `ALLOW_PLAIN_HTTP`;
  - 401 without a session.

The UI follows Figma "Middleware – V2"'s signed-in screens, with the user's decisions of
2026-10-10 in design-notes.md §5–9:
- creating is a three-step wizard whose first two steps stay in the browser; "Publish" sends the
  one `POST` (no drafts, no "Save and exit");
- the full catalog with the design's labels, and adding a document selects no field;
- the details screen is an overview-style page with the link cards, a webhook card (removed by
  T086 and T092) and a documents card;
- the overview opens the wizard with "New connection".

Until T065, `PUT /api/form-connections/{id}` answers `400` "Changing the documents is not
supported yet." when the body has `documents`.

On 2026-10-11 the user moved the webhook address to US3 on the frontend (spec Clarifications,
Session 2026-10-11): the UI was to offer it only once webhook updates were delivered, and T086
took the card off the details screen. On 2026-10-19 the user removed webhook mode altogether (spec
Clarifications, Session 2026-10-19): US3 and its phase are gone, and T092 removes the webhook code
that T011–T013, T032–T044 and T049–T059 built.

- [X] T086 [US1] Take the webhook card off the details screen in `frontend/src/pages/FormConnectionDetail/index.tsx` (contracts/ui-screens.md "Details", design-notes.md §7) (webhook parts removed by T092):
  - remove the `<WebhookCard … />` element and its import, and drop the webhook address from the component's doc comment;
  - keep `WebhookCard.tsx`, `webhookReducer` and `saveErrorNotice` in `utils.ts`, the webhook types in `types.ts` and the webhook texts in `DETAIL_COPY` unchanged, so that the card could be rendered again later (T092 deletes them instead). `npm run build` still type-checks them, and ESLint has no rule against an unused module;
  - keep `updateFormConnection` in `frontend/src/api/form-connections.ts`;
  - a form connection that got a webhook address while the card was shown keeps webhook mode, and its requests deliver nothing through the pull URL. Before Phase 5 tests pull mode, find such form connections with `GET /api/form-connections` (`mode: "webhook"`) and clear the address with `PUT /api/form-connections/{id}` and `{"webhook_url": null}`.

**Checkpoint**: User Story 1 works on its own, without a webhook address in the UI (quickstart V1,
steps 3–6).

---

## Phase 4: User Story 1 (continued) - First connection screen (Priority: P1)

**Goal**: While no form connection exists, signing in opens the first-connection screen at
`/get-started`: the create wizard with the step-1 heading "Create your first connection" (Figma
"02 Create connection"). With form connections, sign-in opens the overview, and a route requested
before signing in still wins. The product name leads to the overview (spec FR-022 and US1,
scenarios 5–7; research R16; contracts/ui-screens.md "First connection"; design-notes.md §6).

**Independent Test**:
1. With no form connection, sign in. `/get-started` opens with "Create your first connection", and
   publishing from it opens the new form connection's details.
2. Before publishing, select "Connection Portal". The overview shows its empty state, and signing out
   and in again opens `/get-started` again.
3. With a form connection, sign in, then open `/get-started` by its address. Both show the
   overview.
4. Signed out, open a form connection's details address and sign in. The details open.

This is quickstart V1, steps 1–2 and 7–8. The backend doesn't change, and the frontend has no test
runner (research R17), so the phase is checked with the quickstart and the gates of T080.

### Implementation for the first connection screen

- [X] T087 [US1] Let the wizard in `frontend/src/pages/FormConnectionEditor/` open as the first-connection screen (design-notes.md §6, "First connection"):
  - add `firstConnectionTitle: 'Create your first connection'` to `EDITOR_COPY` in `constants.ts`;
  - `FormConnectionEditorPage` in `index.tsx` takes an optional `firstConnection` prop, declared in `types.ts`. With it, the tab title (`useDocumentTitle`) and step 1's `PageTitle` use `firstConnectionTitle` instead of `connectionTitle`; `ConnectionStep.tsx` gets the heading through a new `title` prop;
  - nothing else changes: the header title "New connection", the progress, the card, the "Continue" footer, the validation, the documents step, the publish dialog and the move to the details screen;
  - check the screen against Figma 02 (`2080:6059`) and 02a (`2080:6160`) as the "Figma implementation workflow" in `CLAUDE.md` describes. Only the heading differs from the built 02d.
- [X] T088 [US1] Build `frontend/src/pages/FirstConnection/` for `/get-started` (contracts/ui-screens.md "First connection"), with its texts in `constants.ts` and its state type in `types.ts`, and register it (depends on T087):
  - add `firstConnection: '/get-started'` to `ROUTES` in `frontend/src/constants.ts`, and the route to the `SignedInWizards` group in `frontend/src/App.tsx`;
  - call `listFormConnections()` once when the page opens, passing failures through `useSignOutOnUnauthorized()` first, and ignore an answer that arrives after the page has closed, as the other pages do;
  - while the call runs, render `AppLayout` with `FeedbackLoader` and "Loading your connections…" (Figma L1, `2073:5601`), from a small loading sub-component that also sets that text as the tab title with `useDocumentTitle()`. Keeping the hook in the sub-component lets the wizard's own tab title take over once it renders;
  - an empty list renders `<FormConnectionEditorPage firstConnection />`;
  - a non-empty list, or a failure other than `401`, renders `<Navigate to={ROUTES.overview} replace />`. The overview then shows its list, or its own error state with "Try again".
- [X] T089 [US1] Send a sign-in without a requested route to `/get-started` (FR-022), in `frontend/src/components/RequireSignedOut/utils.ts` (depends on T088):
  - `redirectTarget()` returns `ROUTES.firstConnection` where it returns `ROUTES.overview` today: without router state, without a usable `from`, and for `from` = `/login`. It also does so for `from` = `/`, because opening the app's address isn't a request for the overview;
  - any other requested route comes back unchanged, with its search and hash;
  - update the doc comments in `utils.ts` and in `frontend/src/components/RequireSignedOut/index.tsx`;
  - the logo links of `frontend/src/components/AppLayout/index.tsx` and `frontend/src/components/WizardLayout/index.tsx` keep `ROUTES.overview`.
- [X] T090 [P] [US1] Document the routing change in `CLAUDE.md` and `docs/ARCHITECTURE.md`, as the documentation checklist asks:
  - `CLAUDE.md`, "Frontend Development Guidelines": the create wizard also renders at `/get-started` (`pages/FirstConnection/`), with its own `WizardLayout`, and a sign-in without a requested route lands there;
  - `docs/ARCHITECTURE.md`, the frontend's routing paragraph: `RequireSignedOut` sends a sign-in without a requested route to `/get-started`, which opens the wizard while no form connection exists and the overview otherwise.

**Checkpoint**: Until a form connection exists, signing in starts with "Create your first
connection" (quickstart V1, steps 1–2 and 7–8). User Story 1 is complete.

---

## Phase 5: User Story 2 - Retrieve a citizen's documents in pull mode (Priority: P1) 🎯 MVP

**Goal**:
- serviceBW calls the trigger URL and receives a wallet link, a QR code and a reference.
- The worker detects the citizen's answer.
- The pull URL returns the status and, once, exactly the configured fields, with a 60-second repeat window.
- Expiry, declines and failed verification are reported explicitly.
- Personal data is deleted on time, and `/api/connect/` is restricted to serviceBW in production.

**Independent Test**:
1. With a saved form connection, call the trigger URL and scan the QR code with Paradym. The wallet
   asks for exactly the configured fields.
2. Pulling shows `pending`, then `completed` with exactly those fields, the same documents again
   within 60 seconds, and `null` afterwards.
3. A decline shows `declined`, and 10 minutes without an answer shows `expired`.

These are quickstart V2, V3 and V6.

### Implementation for User Story 2

- [X] T045 [P] [US2] Add `TriggerResponse`, `DeliveredField`, `DeliveredDocument` and `PullResponse` to `backend/app/schemas.py`, exactly as in contracts/integration-api.md: snake_case, `expires_at` as ISO 8601 UTC with `Z`, and nullable `documents`.
- [X] T046 [P] [US2] Add `segno` to `dependencies` in `backend/pyproject.toml`, with its current release as the version floor, and run `uv lock` and `uv sync` in `backend/`. Then create `backend/app/services/qr.py`: render a link as a PNG data URI (`data:image/png;base64,…`) with `segno`, using error correction M, a scale that gives a scannable image, and a quiet zone of 4 (research R11).
- [X] T047 [P] [US2] Create `backend/app/services/documents.py` (research R9). It turns an EUDIPLO session's `credentials` (`[{"id": <document type key>, "values": [{…}]}]`) into `DeliveredDocument`s for a revision:
  - take the first `values` entry of each document;
  - SD-JWT VC values are found by walking the claim path, and mdoc values by element name, because EUDIPLO merges mdoc claims into one flat object;
  - copy only the selected fields, in configuration order, with their catalog labels;
  - bytes become base64 strings, and dates become ISO 8601 strings;
  - a missing value becomes `null` and is logged by field key only. Values are never logged.
- [X] T048 [US2] Create `backend/app/services/document_requests.py` with:
  - the status mapping of research R5:
    - wallet error codes → `declined`;
    - verification codes, unknown codes and no code → `verification_failed`;
    - `completed` → `completed`, `expired` → `expired`, and `active` or `fetched` → `pending`.
  - `apply_status(db, request, new_status, *, failure_code=None, completed_at=None)`, which:
    - locks the row with `SELECT … FOR UPDATE` and checks the current status again;
    - sets `status`, `status_changed_at`, `failure_code` and `completed_at` (EUDIPLO's `consumedAt`);
    - sets `ended_at` for `declined`, `verification_failed`, `expired` and `unavailable`.
- [X] T049 [US2] Implement `trigger` in `backend/app/services/document_requests.py`, as in contracts/integration-api.md "Trigger URL" (webhook parts removed by T092):
  - check in this order: 404 for an unknown form connection, 409 for a deactivated or deleted one, 503 when not configured;
  - read the current revision, and end the read transaction before calling EUDIPLO;
  - call `create_offer` with `requestId` = `eudiplo_config_id` and `reference` = the new request's id. On a 409, re-create the configuration from the revision with T033 and retry once;
  - insert the `DocumentRequest`:
    - `status` "pending", and `reference` = `secrets.token_urlsafe(32)`;
    - `expires_at` = now + the revision's `lifetime_seconds`;
    - `mode` and `webhook_url` copied from the form connection;
  - if the insert fails, delete the EUDIPLO session again;
  - return `wallet_link` (`uri`), `qr_code_link` (`crossDeviceUri`) and `qr_code` (T046).
- [X] T050 [US2] Implement `pull` in `backend/app/services/document_requests.py`, as in contracts/integration-api.md "Pull URL" and research R9 (webhook parts removed by T092):
  - use the same check order as the trigger, then 404 "Request not found" for an unknown reference or one that belongs to another form connection;
  - lock the row;
  - a `pending` request past `expires_at` gets the last check: `get_session` plus the mapping, otherwise `expired`;
  - for a `completed` pull-mode request:
    - the first pull reads and extracts the documents (T047), sets `documents_delivered_at` and `ended_at`, commits, then answers;
    - pulls within `PULL_REPEAT_WINDOW_SECONDS` after that return the same documents;
    - after the window, or once the EUDIPLO session is deleted, answer `documents: null`;
    - EUDIPLO 404 sets `eudiplo_session_deleted_at` (and `ended_at`) and answers `null`;
    - other EUDIPLO errors answer 502, and nothing is consumed;
  - webhook-mode requests always answer `documents: null`.
- [X] T051 [US2] Implement `backend/app/routers/connect.py`, with no sign-in and no `require_json`, and register it in `backend/app/main.py`:
  - `POST /api/connect/{form_connection_id}/requests` (201, message "Document request started");
  - `GET /api/connect/{form_connection_id}/requests/{reference}`;
  - error bodies exactly as in contracts/integration-api.md:
    - 404 "Form connection not found" / "Request not found";
    - 409 `{"error": "unavailable", "message": "This form connection is deactivated or deleted"}`;
    - the 502 messages and 503.
- [X] T052 [US2] Add a `logging.Filter` on the `uvicorn.access` logger in `backend/app/main.py`. It replaces the reference segment of `/api/connect/<id>/requests/<reference>` with the text `<reference>`, so references never reach the logs (research R13).
- [X] T053 [US2] Add the sync and expiry steps to `backend/app/services/worker.py` (research R6, R7):
  - **Sync**:
    - call `list_sessions(type=presentation, updatedFrom=cursor)`. The cursor is the latest EUDIPLO `updatedAt` seen minus 5 s, starting at the creation time of the oldest open request;
    - apply the mapping through `apply_status` to known `pending` requests only;
    - for items without `failureCode` or `consumedAt`, fall back to `get_session` and discard `credentials` right away.
  - **Expiry**: `pending` requests whose `expires_at` has passed get the last check, dispatched to the pool.
- [X] T054 [US2] Add the EUDIPLO session deletion step to `backend/app/services/worker.py` (research R8). Calls are dispatched to the pool, a 404 counts as success, and each deletion sets `eudiplo_session_deleted_at`. A session is deleted:
  - when a pull-mode delivery's repeat window has ended;
  - when a request has a final status other than `completed`;
  - for undelivered `completed` requests, at `completed_at` + `DOCUMENT_RETENTION_SECONDS` − 60 s, also setting `ended_at`.

  The 30-minute limit also ends a repeat window early.
- [X] T055 [US2] Add the record retention step to `backend/app/services/worker.py`. It deletes `document_requests` whose `ended_at` is older than `REQUEST_RECORD_RETENTION_SECONDS`, and the cascade deletes their `webhook_deliveries` (FR-021) (webhook parts removed by T092).
- [X] T056 [P] [US2] Restrict `/api/connect/` in the production nginx (research R13):
  - `frontend/nginx/40-servicebw-access.sh` writes two files:
    - `/etc/nginx/servicebw-allow.conf`: one `allow <cidr>;` per entry of `SERVICEBW_ALLOWED_CIDRS`, then `deny all;`. If the variable is empty, only `deny all;`.
    - `/etc/nginx/real-ip.conf`: `set_real_ip_from <cidr>;` per entry of `TRUSTED_PROXY_CIDRS`, then `real_ip_header X-Forwarded-For;` and `real_ip_recursive on;`. If the variable is unset, the file is empty.
  - `frontend/nginx.conf`:
    - includes `real-ip.conf` in the server block;
    - adds `location /api/connect/ { include /etc/nginx/servicebw-allow.conf; … }`, proxying with the same headers as `/api/`;
    - adds a `map` and a `log_format` that log `/requests/<reference>` instead of the real reference.
  - `frontend/Dockerfile` copies the script into `/docker-entrypoint.d/` as an executable.
  - `docker-compose.prod.yml` passes `SERVICEBW_ALLOWED_CIDRS` and `TRUSTED_PROXY_CIDRS` to `frontend`.

### Tests for User Story 2

- [X] T057 [P] [US2] Write `backend/tests/unit/test_status_mapping.py` and `backend/tests/unit/test_documents.py`:
  - status mapping: every code of research R5, unknown codes, and no code;
  - extraction: the SD-JWT claim path walk, flat mdoc claims, only the selected fields in order, technical claims dropped, bytes and dates converted, and a missing value.
- [X] T058 [US2] Write `backend/tests/api/test_connect.py` (webhook parts removed by T092):
  - **Trigger**: 201 with every field and a stored `pending` request; the check order 404/409/404; 503 and 502; a 409 from the offer re-creates the configuration once.
  - **Pull**:
    - `pending`, then the first pull returns exactly the configured fields;
    - a repeat within the window returns them again, and the answer is `null` after it;
    - webhook mode always answers `null`;
    - EUDIPLO 404 gives `null`, and a 502 consumes nothing;
    - the last check before expiry gives `completed`, `declined` or `expired`;
    - two simultaneous pulls inside the window both get the documents.
- [X] T059 [US2] Write `backend/tests/api/test_worker_requests.py` (webhook parts removed by T092):
  - sync applies statuses and ignores unknown sessions, and the cursor works;
  - expiry runs the last check as soon as `expires_at` has passed;
  - EUDIPLO sessions are deleted at the right time: at the end of the window, for final statuses, and at 30 minutes − 60 s;
  - request records are deleted after the retention period, together with their webhook deliveries.

**Checkpoint**: User Stories 1 and 2 form the MVP: a serviceBW form can retrieve verified documents
in pull mode (quickstart V1–V3, V6).

---

## Phase 6: User Story 4 - Maintain form connections (Priority: P3)

**Goal**:
- The overview shows whether each form connection is active.
- A form connection can be edited: a new revision, with the same URLs, while requests in progress keep their configuration.
- It can be deactivated (its URLs answer `unavailable`, and its open requests are cancelled), reactivated and deleted.
- The worker cleans up unused EUDIPLO configurations, and re-syncs configurations after a settings change.

**Independent Test**: With several form connections in place:
1. The overview shows each one's state.
2. Editing one leaves its URLs unchanged, and a request still in progress delivers the old fields.
3. Deactivating gives `409 unavailable` on its URLs; reactivating restores them.
4. Deleting removes it from the overview, and its URLs answer `409` for good.

This is quickstart V5.

### Implementation for User Story 4

- [ ] T065 [US4] Extend `update` in `backend/app/services/form_connections.py` to changes of `documents`, as in data-model.md "Creating a revision". Editing is also allowed while deactivated, and a deleted form connection answers 404.
  - lock the `form_connections` row (`SELECT … FOR UPDATE`) and validate;
  - take revision n+1 and call `create_config`;
  - insert the revision and set `current_revision`;
  - if the commit fails, delete the new configuration again.
- [ ] T066 [US4] Add `deactivate`, `activate` and `delete` to `backend/app/services/form_connections.py`. `delete` sets `deleted_at`, and none of them calls EUDIPLO. Add the matching endpoints to `backend/app/routers/form_connections.py`, with the bodies and messages of contracts/management-api.md:
  - `POST /api/form-connections/{id}/deactivate` ("Form connection deactivated");
  - `POST /api/form-connections/{id}/activate` ("Form connection activated");
  - `DELETE /api/form-connections/{id}` (`{"data": null, "message": "Form connection deleted"}`).
- [ ] T067 [US4] Add the cancel step to `backend/app/services/worker.py`:
  - every open request (data-model.md "Open requests") of a deactivated or deleted form connection becomes `unavailable` through `apply_status`;
  - the deletion step (T054) then removes the EUDIPLO sessions.
- [ ] T068 [US4] Add the configuration cleanup step to `backend/app/services/worker.py`. It covers revisions that are no longer current, or whose form connection is deleted, on which no request still has an EUDIPLO session. For each, call `delete_config` (a 404 counts as success) and set `eudiplo_config_deleted_at`.
- [ ] T069 [US4] Add the re-sync step to `backend/app/services/worker.py`, which runs after each start until it has succeeded once (research R2). For every form connection that isn't deleted, it rebuilds the configuration body of the current revision. If the hash differs from `config_hash`, it creates a new revision with the same documents through the T065 revision path.
- [ ] T070 [P] [US4] Add `activateFormConnection`, `deactivateFormConnection` and `deleteFormConnection` to `frontend/src/api/form-connections.ts`.
- [ ] T071 [P] [US4] Build `frontend/src/components/ConfirmDialog/` (with `types.ts`) from KERN's dialog, with a title, text, and confirm and cancel actions (contracts/ui-screens.md "Accessibility"). The focus moves into the dialog, stays there while it is open, and returns to the button that opened it.
- [ ] T072 [P] [US4] Show in `frontend/src/pages/FormConnectionList/` whether each form connection is active or deactivated, using a KERN badge with text, not colour alone.
- [ ] T073 [P] [US4] Add the edit mode to `frontend/src/pages/FormConnectionEditor/` for `/form-connections/:id/edit`:
  - load the form connection and prefill the reducer state;
  - `PUT` the changes;
  - show the note that requests already in progress keep their previous configuration (FR-005).
- [ ] T074 [US4] Add the "Edit" action and the status actions to `frontend/src/pages/FormConnectionDetail/`, using `ConfirmDialog`, and show the deactivated state:
  - **Deactivate**: the text says the URLs stop at once, and requests in progress are cancelled within a few seconds;
  - **Reactivate**;
  - **Delete**: the text says the URLs stop permanently; afterwards the app returns to the overview.

### Tests for User Story 4

- [ ] T075 [US4] Write `backend/tests/api/test_form_connection_maintenance.py`:
  - editing the documents creates revision 2, a pending request keeps revision 1, and the URLs stay the same;
  - renaming creates no revision;
  - concurrent edits get distinct revision numbers;
  - deactivating:
    - the trigger and the pull answer 409;
    - the cancel step turns `pending` and undelivered `completed` requests into `unavailable`;
  - reactivating restores the URLs;
  - deleting: 409 on the URLs, and 404 in the management API;
  - configuration cleanup;
  - re-sync after `EUDIPLO_TRUST_LIST_ID` changes.

**Checkpoint**: User Stories 1, 2 and 4 work (quickstart V1–V3 and V5–V7).

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**:
- **Removing webhook mode (T092)**: the user removed webhook mode on 2026-10-19 (spec
  Clarifications, Session 2026-10-19). T092 takes out what Phases 2, 3 and 5 built for it, before
  Phase 6 builds on the worker and the details screen.
- **Merge gate (T076–T080)**: these tasks run before each change is proposed for merge, from the
  first merge on, because the constitution requires the documentation checklist and the quality
  gates before every merge ("Development Workflow"). Each run covers what exists at that point.
  Tick them after the last run.
- **Validation (T081–T083)**: the finished feature, with real wallets, real users and the
  deployment.

- [X] T092 Remove webhook mode from the code (spec Clarifications, Session 2026-10-19):
  - **Migration**: generate a new one in `backend/` with `uv run alembic revision --autogenerate -m "remove webhook mode"` and review it: it drops `webhook_deliveries` with its indexes, `form_connections.webhook_url`, `document_requests.webhook_url` and `document_requests.mode`. `5a6252e936e4_form_connections.py` stays untouched. Then run `uv run alembic upgrade head`;
  - **Models and schemas**: `WebhookDelivery`, both `webhook_url` columns and `DocumentRequest.mode` in `backend/app/models.py`; `FormConnectionMode`, `mode` and `webhook_url` in `backend/app/schemas.py`;
  - **Services**: `clean_webhook_url`, its length limit and `mode_of` in `backend/app/services/form_connections.py`; the mode constants in `backend/app/services/document_requests.py`, where a delivered `completed` request's EUDIPLO session is now deleted when the pull repeat window ends, with no webhook branch; the webhook notes in `backend/app/services/worker.py` and `backend/app/routers/form_connections.py`;
  - **CLI**: `WebhookDelivery` in `clear-connections` in `backend/app/cli.py`;
  - **Frontend**: `frontend/src/pages/FormConnectionDetail/WebhookCard.tsx`, `webhookReducer` and `saveErrorNotice` in `utils.ts`, the webhook types in `types.ts` and the webhook texts in `DETAIL_COPY`; `FormConnectionMode`, `mode` and `webhook_url` in `frontend/src/types/form-connections.ts`. Keep `updateFormConnection` in `frontend/src/api/form-connections.ts` for T073;
  - **Tests**: the webhook cases in `backend/tests/api/test_form_connections.py`, `backend/tests/api/test_connect.py`, `backend/tests/api/test_worker_requests.py` and `backend/tests/unit/test_cli.py`;
  - **Docs**: `README.md`, `docs/ARCHITECTURE.md`, `CLAUDE.md` and `backend/.env.example`. `DOCUMENT_RETENTION_SECONDS` is no longer a retry limit, and `ALLOW_PLAIN_HTTP` covers only `CONNECTION_BASE_URL`. Mentions of EUDIPLO's own webhooks stay;
  - run the gates of T080, including `uv run pytest` against a `_test` database.
- [ ] T076 [P] Update `README.md`:
  - the middleware's purpose;
  - local setup with `backend/.env` and the account CLI;
  - the backend settings of research R18 and the two nginx variables;
  - the EUDIPLO prerequisites from contracts/eudiplo-usage.md;
  - each new dependency and why it was added: `httpx2`, `segno`, `argon2-cffi`, `pytest`, `react-router` and the three KERN packages.
- [ ] T077 [P] Update `docs/ARCHITECTURE.md`:
  - the system overview, with EUDIPLO, the worker thread and its steps, and the nginx allow-list, as far as they exist;
  - the environment variable tables for the backend and the frontend container;
  - the new repository structure;
  - replace the team-member examples.
- [ ] T078 [P] Update `CLAUDE.md`: the services-layer and worker patterns, the backend structure listing and the "Full Stack Example". Keep the generic examples in the naming-convention tables.
- [ ] T079 [P] Update `docs/EUDIPLO.md`: §4 ("Our middleware's client") and the §11 "Middleware client" row become `presentation:request` + `presentation:manage`, with no allow-list.
- [ ] T080 Run the quality gates and fix every finding:
  - in `backend/`: `uv run ruff check .`, `uv run ruff format --check .` and `uv run mypy app/`;
  - in `frontend/`: `npm run lint` and `npm run build`.

  Once `backend/tests/` exists, also run `uv run pytest` against a `_test` database. Tests don't gate merges yet (plan, Constitution Check, "Tests").
- [ ] T081 Run quickstart.md V1–V3 and V5–V7 with the user against the hosted EUDIPLO and Paradym; it needs EUDIPLO access and a test wallet. Record the results in `specs/001-servicebw-eudi-middleware/research.md`, R19 item 4:
  - the remaining "Verify at implementation" answers;
  - whether an expired credential fails verification (V3);
  - whether Paradym reports a decline (V3).
- [ ] T082 Do the accessibility review of quickstart.md V9 (SC-009): an axe DevTools or Lighthouse scan, keyboard only, a screen reader, and 200% zoom at 320 px. Fix every WCAG 2.1 AA failure in `frontend/src/`.
- [ ] T083 After the first Coolify deployment, run the deployment checks of quickstart.md §6 with the user, and record the results in `specs/001-servicebw-eudi-middleware/research.md`:
  - `403` from outside `SERVICEBW_ALLOWED_CIDRS`;
  - startup refused without `CONNECTION_BASE_URL`;
  - the UI served over HTTPS;
  - references redacted in the nginx logs.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies; it starts immediately.
- **Foundational (Phase 2)**: depends on Setup, and blocks every user story.
  - T018 needs the user's EUDIPLO access.
  - T023 needs the user's Figma URL.
  - T084 and T085 follow T023 and T030, after the design changed to V2.
- **User stories (Phases 3–6)**: depend on Foundational, and on each other as described below.
- **Polish (Phase 7)**:
  - T092 follows Phase 5, and runs before Phase 6 (US4).
  - T076–T080 are the merge gate: they run before every merge, from the first one on.
  - T081–T083 depend on the stories that are to be delivered. T081 needs a test wallet, and T083
    needs a Coolify deployment.

### User Story Dependencies

- **US1 (P1)**: starts after Foundational and depends on no other story.
  - T086 can run at any time after T042.
  - Phase 4 (T087–T090, the first-connection screen) follows Phase 3 and changes only the frontend.
- **US2 (P1)**: starts after the US1 backend (T031–T037), because a request needs a saved form
  connection and its EUDIPLO configuration. It has no frontend: serviceBW calls the URLs.
- **US3**: removed on 2026-10-19 with webhook mode (spec Clarifications, Session 2026-10-19).
  T092 removes the webhook code that the other stories built.
- **US4 (P3)**: starts after US1 and T092. Its worker steps (T067–T069) act on US2's requests and
  use the US2 deletion step.

### Within Each User Story

- Schemas and models → services → endpoints → worker steps → frontend → tests.
- Tasks that touch the same file run in order:
  - `backend/app/main.py`: T001, T016, T020, T034, T037, T051, T052;
  - `backend/app/services/worker.py`: T020, T053–T055, T092, T067–T069;
  - `backend/app/services/document_requests.py`: T048–T050, T092;
  - `backend/app/schemas.py`: T016, T032, T045, T092;
  - `backend/app/models.py`: T010–T013, T092;
  - `frontend/src/pages/FormConnectionDetail/`: T042, T086, T092, T074;
  - `frontend/src/pages/FormConnectionEditor/`: T041, T087, T073;
  - `frontend/src/App.tsx`: T088, T073;
  - `CLAUDE.md` and `docs/ARCHITECTURE.md`: T090, T092, then the merge-gate runs of T077 and T078.

### Parallel Opportunities

- **Setup**: T002, T003, T004 and T005 run in parallel after or alongside T001.
- **Foundational**:
  - T008 runs alongside T007;
  - T017 runs alongside T016;
  - T022 runs after T021;
  - T024 and T025 run alongside each other once T023 is done;
  - the frontend shell (T023–T030) runs alongside the backend tasks T015–T022.
- **US1**: T031 and T032 together; T038 and T039 together, and alongside the backend tasks; T043 after T033.
- **US1, first connection (Phase 4)**: T090 alongside T087–T089. The phase changes only the frontend, so it can also run alongside US2's backend tasks.
- **US2**: T045, T046 and T047 together; T056 (nginx) alongside all backend tasks; T057 alongside T058.
- **US4**: T070–T073 together, and alongside the backend tasks T065–T069.

---

## Parallel Example: User Story 1

```bash
# Backend building blocks:
Task: "Create backend/app/catalog.py with the pid and mdl document types (T031)"
Task: "Add the form connection schemas to backend/app/schemas.py (T032)"

# Frontend building blocks, alongside the backend:
Task: "Add frontend/src/types/form-connections.ts and frontend/src/api/form-connections.ts (T038)"
Task: "Build frontend/src/components/CopyableUrl/ (T039)"
```

## Parallel Example: First connection screen (Phase 4)

```bash
Task: "Add the first-connection heading to the wizard in frontend/src/pages/FormConnectionEditor/ (T087)"
Task: "Document the /get-started routing in CLAUDE.md and docs/ARCHITECTURE.md (T090)"
```

## Parallel Example: User Story 2

```bash
Task: "Add TriggerResponse and PullResponse schemas to backend/app/schemas.py (T045)"
Task: "Create backend/app/services/qr.py (T046)"
Task: "Create backend/app/services/documents.py (T047)"
Task: "Restrict /api/connect/ in frontend/nginx.conf and frontend/nginx/40-servicebw-access.sh (T056)"
```

## Parallel Example: User Story 4

```bash
Task: "Add the status actions to frontend/src/api/form-connections.ts (T070)"
Task: "Build frontend/src/components/ConfirmDialog/ (T071)"
Task: "Show the active state in frontend/src/pages/FormConnectionList/ (T072)"
Task: "Add the edit mode to frontend/src/pages/FormConnectionEditor/ (T073)"
```

---

## Implementation Strategy

### MVP First (User Stories 1 and 2, both P1)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational. Ask the user for EUDIPLO access (T018) and the Figma URL (T023).
3. Complete Phase 3: US1, including T086. **Validate** with quickstart V1, steps 3–6.
4. Complete Phase 4: the first-connection screen. **Validate** with quickstart V1, steps 1–2 and
   7–8.
5. Complete Phase 5: US2. **Validate** with quickstart V2, V3 and V6, using Paradym.
6. Run the merge gate (T076–T080) and merge.
7. Deploy or demo: a serviceBW form can now retrieve verified documents in pull mode.

US1 on its own produces configurations and URLs but retrieves no documents, so the useful MVP is
US1 and US2 together.

### Incremental Delivery

Merge often, at least at the end of each step below, to keep the history light. Run the merge gate
(T076–T080) before each merge.

1. Setup + Foundational: sign-in and the empty shell.
2. + US1: form connections and URLs.
3. + First connection: until a form connection exists, sign-in starts with "Create your first
   connection".
4. + US2: pull mode end to end. **This is the MVP.**
5. − Webhook mode (T092): the code built for it is removed, and serviceBW uses pull mode only.
6. + US4: overview states, editing, deactivation and deletion.
7. Polish: validation with real wallets, the accessibility review, and the deployment checks.

### Parallel Team Strategy

- After Foundational, developer A takes US1's backend and then US2, while developer B takes US1's
  frontend, the first-connection screen (Phase 4) and then US4's frontend.
- T092 follows US2 and comes before US4. US4's backend follows US1.

---

## Notes

- [P] tasks touch different files and depend on no unfinished task.
- The [Story] label maps a task to its user story.
- **Not tasks, because people run them**:
  - the usability sessions of quickstart V8 (SC-001, SC-003, SC-008), with DO.IT and citizen participants;
  - the confirmations with serviceBW in research R20.
- **Decisions still pending** (research R19): `intent_to_retain`, the tenant's session TTL, and a
  separate production tenant. None of them blocks a task.
- Commit after each task or logical group, and stop at any checkpoint to validate a story.
