# Implementation Plan: serviceBW ↔ EUDI Wallet Form Connections

**Branch**: `sk-proto-1` | **Date**: 2026-10-07, amended 2026-10-11 and 2026-10-19 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-servicebw-eudi-middleware/spec.md`

**Note**: The spec directory is `001-servicebw-eudi-middleware`, but the work happens on the
existing git branch `sk-proto-1`.

## Summary

DO.IT team members sign in to a React UI and create **form connections**. A form connection names
a serviceBW form and the documents and fields it needs: the PID and/or the mobile driving licence,
picked from a catalog.

- **Saving a form connection** stores an immutable **revision**. The backend then creates a
  matching EUDIPLO **presentation configuration**: a DCQL query that requires every chosen document
  and field and trusts only the issuers on the configured trust list.
- **Triggering a request**: serviceBW calls the form connection's **trigger URL**. The backend
  asks EUDIPLO for an OpenID4VP request and returns three things: the same-device wallet link, a
  QR code (PNG data URI) of the cross-device link, and an unguessable request reference.
- **Verification**: EUDIPLO handles all wallet protocols and checks every document. It verifies
  the issuer signature, the trust list, revocation and suspension status, and holder binding.
- **Getting results**: a background worker inside the backend polls EUDIPLO every 2 seconds. It
  maps outcomes to the six request statuses (including explicit `declined` and
  `verification_failed`), expires requests after 10 minutes, and cancels requests of deactivated
  form connections.
- **Delivery**: the documents are delivered **once**, reduced to exactly the configured fields.
  They go out through the **pull URL**, and repeated pulls return them for 60 seconds in case an
  answer gets lost. After delivery the EUDIPLO session is deleted, and an
  undelivered one is deleted within 30 minutes of the citizen sharing.
- **No stored documents**: the middleware never writes a citizen's documents to its own storage,
  and it deletes each request record 7 days after the request ends.

The work starts by **removing the template's test project**: the team-members example and the
mock ID-verification API. The stack, tooling and deployment setup stay (research R1).

**The user's decisions on 2026-10-07**:
- **Recorded in the spec's Clarifications**:
  - DO.IT team members have personal accounts;
  - network restriction, not credentials, controls access to the connection URLs;
  - webhook updates carry no authentication, and may be repeated in the rare case that
    serviceBW's confirmation was lost (both moot since webhook mode was removed on 2026-10-19);
  - serviceBW waits for a final status, and never times out before a request expires;
  - repeated pulls return the documents for 60 seconds (FR-018);
  - the risk of a forwarded link or QR code is accepted, and serviceBW checks the applicant;
  - the management UI meets WCAG 2.1 AA (SC-009);
  - request records are deleted 7 days after the request ends (FR-021).
- **Recorded in [research.md](research.md)**:
  - the hosted EUDIPLO instance (R2);
  - the network restriction is enforced by an allow-list in the repository's nginx (R13);
  - one shared EUDIPLO tenant, accepted until real citizens use the service (R2, R19);
  - what serviceBW can do is still to be confirmed by DO.IT (R20).

**The user's decisions on 2026-10-11** (spec Clarifications, research R16), frontend only:
- **Webhook address with US3**: the details screen shows the webhook card only once webhook
  updates are delivered. The backend keeps accepting `webhook_url`, as built in US1. Superseded
  on 2026-10-19, see below.
- **First-connection screen**: without a requested route, sign-in opens `/get-started`. While no
  form connection exists, it is the create wizard headed "Create your first connection" (Figma
  "02 Create connection"); otherwise it gives way to the overview. The logo leads to the
  overview. No API, schema or setting changes.

**The user's decision on 2026-10-19** (spec Clarifications, Session 2026-10-19): **webhook mode is
removed**. User Story 3 and FR-014 to FR-016 are out of scope, and pull mode is the only way
serviceBW gets results. The code built so far loses the webhook address, the `webhook_deliveries`
outbox and the connection mode (`mode`), through a new migration (tasks.md T092).

## Technical Context

**Language/Version**: Python 3.13 (backend) and TypeScript 6.0 with React 19.2 (frontend), the
versions already in the repository.

**Primary Dependencies**:
- **Backend, kept**: FastAPI 0.141, SQLAlchemy 2.0 (sync `Session`), Alembic 1.19, psycopg 3.3,
  Pydantic 2.13 and pydantic-settings 2.15.
- **Backend, added**:
  - `httpx2`: a sync HTTP client for EUDIPLO. It is already locked at 2.12 and moves
    from `dev` to runtime;
  - `segno`: QR codes;
  - `argon2-cffi`: password hashing;
  - `pytest` (dev group): tests.
- **Frontend, kept**: Vite 8.2, Tailwind CSS 4.3, and nginx for production.
- **Frontend, added**: `react-router` 7, plus the KERN packages `@kern-ux/native`,
  `@kern-ux-annex/kern-react-kit` and `@digitalservicebund/kern-ux-tailwind-theme`, with exact
  versions pinned.
- **External service**: the EUDIPLO 9.x management API, hosted on Coolify, tenant `<tenant>`
  ([contracts/eudiplo-usage.md](contracts/eudiplo-usage.md)).

**Storage**: PostgreSQL 18 through the sync SQLAlchemy `Session`.
- New tables: `user_accounts`, `login_sessions`, `form_connections`, `form_connection_revisions`
  and `document_requests` ([data-model.md](data-model.md)). The `webhook_deliveries` table of the
  first migration is dropped again with webhook mode (2026-10-19).
- No citizen documents are stored. They stay in EUDIPLO until they are delivered or deleted.

**Testing**:
- **Backend**: `pytest` with FastAPI's `TestClient`, a dedicated test database on the compose
  PostgreSQL, and a fake EUDIPLO built on `httpx2.MockTransport`. The worker's steps are called
  directly.
- **Frontend**: `npm run lint` and `npm run build`, which are the constitution's gates.
- **End to end**: a manual run with the Paradym wallet against the hosted EUDIPLO
  ([quickstart.md](quickstart.md)). It is followed by usability sessions for SC-001, SC-003 and
  SC-008, and an accessibility review against WCAG 2.1 AA for SC-009.

**Target Platform**:
- Linux containers: Docker Compose locally, Coolify in production.
- The DO.IT UI runs in evergreen desktop browsers over HTTPS.
- Citizens use their own EUDI Wallet app. It talks only to EUDIPLO.

**Project Type**: Web application. It has a React SPA served by nginx, a FastAPI backend that also
runs the background worker thread, and PostgreSQL.

**Performance Goals**:
- Documents are available to serviceBW within 5 seconds of approval for 95% of requests (SC-004).
  The 2-second polling cycle is sized for this, and outbound calls never block it.
- 100 document requests triggered within one minute and in progress at the same time (SC-007).

**Constraints**:
- **Personal data**: no documents in the middleware's storage or logs, and none left in EUDIPLO
  more than 30 minutes after sharing, apart from the delay an outage causes (FR-020, SC-006).
  Request records are deleted 7 days after the request ends (FR-021).
- **Expiry**: requests expire after 10 minutes (FR-012).
- **Delivery**: exactly the configured fields, once, with a 60-second repeat window for pulls
  (FR-013, FR-018, SC-005).
- **Accessibility**: the management UI meets WCAG 2.1 AA (SC-009).
- **Access**: `/api/connect/` is reachable only from the allow-listed serviceBW network (FR-017),
  and request references never appear in logs.
- **EUDIPLO**: the management token never reaches the browser, and the API is strict (unknown keys
  are rejected).

**Scale/Scope**:
- One team, the DO.IT staff of the City of Stuttgart.
- Tens of form connections.
- Up to 100 requests at the same time.
- 7 UI routes (the Figma design added `/forgot-password` and `/get-started`); two document types
  at launch.

**Open points**: none block the plan. Every unknown was resolved in [research.md](research.md),
where the user's decisions are marked. [Research R19](research.md#r19-points-that-dont-block-the-plan-but-need-attention-later)
lists the points that still need someone else's decision or a check at implementation time:
- `intent_to_retain`, for data protection;
- the tenant's session TTL, and a separate production tenant, for the EUDIPLO operators;
- the EUDIPLO API details marked **Verify at implementation**.

[Research R20](research.md#r20-what-servicebw-is-expected-to-do-user-not-sure-yet-to-be-confirmed-by-doit)
lists what DO.IT has to confirm with serviceBW, including that serviceBW checks the documents
belong to the applicant.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design below.*

Checked against constitution v1.0.1 (`.specify/memory/constitution.md`). The plan was first
checked against v1.0.0; the PATCH 1.0.1 of 2026-10-19 only corrects the Vite version and the
status of the test suite.

| Principle or rule | How the plan complies | Result |
|---|---|---|
| **I. Contract parity** | Every request and response shape is a Pydantic schema in `backend/app/schemas.py`. The shapes the frontend consumes (the management API) are mirrored in `frontend/src/types/` in the same change. The serviceBW-facing shapes are documented in [contracts/](contracts/), because no frontend code consumes them. Every response uses `{data, message?}` (with `data: null` when there is nothing to return), or `{error, message}` raised through `HTTPException`. This includes logout, delete and health. The template's `GET /` is removed | PASS |
| **II. Sync persistence (NON-NEGOTIABLE)** | All route handlers are plain `def` and use `Depends(get_db)` with `select()`, `db.get()` and `db.scalars()`. The worker thread opens its own sync `Session` from `SessionLocal`. EUDIPLO calls use a synchronous `httpx2.Client`. There is no `AsyncSession`, no `db.query()`, and no blocking I/O in an `async def` | PASS |
| **III. Quality gates** | Ruff, mypy, ESLint, Prettier and the build stay as configured, and pre-commit is not bypassed. pytest is configured in `[tool.pytest.ini_options]` only, with no `pytest.ini`; the line referring to the missing asyncio plugin is removed | PASS |
| **IV. Dependencies and config** | Every new package is imported directly and declared, and `uv.lock` is refreshed. Every new backend environment variable is a `Settings` field and is also listed in `.env.example`, `README.md` and `docs/ARCHITECTURE.md`. The nginx variables are documented next to `BACKEND_HOST` (research R18). The unused `API_KEY` is removed. Secrets live only in `.env` or Coolify. `APP_ENV=production` stays in production | PASS |
| **V. Schema evolution** | One autogenerated migration, reviewed before commit. The committed `v0_add_team_members.py` is kept, and the new migration drops `team_members` (research R1). All new models follow the conventions: UUID4 `String(36)` keys, `created_at` and `updated_at`, `snake_case`. Every scanned column is indexed, including partial indexes for the worker ([data-model.md](data-model.md#indexes)). No `datetime.utcnow()` | PASS |
| **Technology and structure** | The stack is unchanged, and there is no root `package.json`. Routers stay in `app/routers/`, one per resource. The database module stays `app/db.py`. The frontend uses `src/api`, `components`, `pages`, `hooks`, `utils` and `types`. KERN design tokens enter Tailwind's theme through imports in `index.css`. No inline styles. `useReducer` is used for the editor's state. List items are sub-components. `any` is not used: claim values are typed `unknown` and JSON value types. `package.json` has Vite 8.2, which the constitution (since 1.0.1), `CLAUDE.md`, `README.md` and `docs/ARCHITECTURE.md` name as well | PASS |
| **Extensions to the prescribed layout** (not violations) | Four additions sit inside `backend/app/` without changing the prescribed modules: `app/services/` for domain logic shared by the routers and the worker, `app/catalog.py`, `app/cli.py`, and an in-process worker thread. Their patterns are added to `CLAUDE.md` and `docs/ARCHITECTURE.md` | PASS |
| **Logging** | The `logging` module only. Log lines never contain claims, tokens or secrets. Request references are redacted from uvicorn's and nginx's access logs (research R8, R13) | PASS |
| **Workflow and documentation** | Backend work follows model → schema → migration → router → registration, except that the settings of research R18 came first, in one task (T007), so that every later task finds its setting. Frontend work follows types → api → components. The documentation checklist covers: `README.md` (new variables, dependencies and why they were added, the account CLI, EUDIPLO prerequisites, the nginx allow-list); `docs/ARCHITECTURE.md` (EUDIPLO, the worker, the nginx allow-list, variables, the structure listing); `CLAUDE.md` (the services layer and worker patterns, the structure listing); and `docs/EUDIPLO.md` §4 and §11 (the middleware client's roles) | PASS |
| **Tests (TODO TEST_STRATEGY)** | This plan does not amend the constitution. Backend pytest coverage is added as a practice that doesn't gate merges, and the test-strategy amendment remains a separate decision | PASS (no amendment) |

**Gate result (before research)**: PASS, with no violations to justify.

## Project Structure

### Documentation (this feature)

```text
specs/001-servicebw-eudi-middleware/
├── spec.md              # Feature spec (updated with the 2026-10-07 answers)
├── plan.md              # This file
├── research.md          # Phase 0: decisions R1–R21
├── data-model.md        # Phase 1: tables, open requests, state transitions, indexes, catalog
├── quickstart.md        # Phase 1: setup, validation scenarios V1–V9, deployment checks
├── design-notes.md      # The Figma design's copy, tokens and the decisions taken (T023, T084)
├── contracts/           # Phase 1
│   ├── integration-api.md   # serviceBW → middleware: trigger URL and pull URL
│   ├── management-api.md    # DO.IT UI → backend
│   ├── eudiplo-usage.md     # middleware → EUDIPLO (the subset used)
│   └── ui-screens.md        # Screens and behavior (visual design from Figma)
├── checklists/
│   ├── requirements.md  # Spec quality checklist
│   └── review-gate.md   # Requirements quality review, done before /speckit-tasks
└── tasks.md             # Phase 2 output (/speckit-tasks, not created here)
```

### Source Code (repository root)

```text
backend/
├── app/
│   ├── __init__.py               # kept: Python version guard
│   ├── main.py                   # rewritten: lifespan starts and stops the worker; registers routers;
│   │                             # access-log filter that redacts references; health in the envelope; no GET /
│   ├── config.py                 # Settings: new fields from research R18, startup check on
│   │                             # CONNECTION_BASE_URL; api_key removed
│   ├── db.py                     # kept; pool raised to pool_size=10, max_overflow=20 (research R15)
│   ├── errors.py                 # kept
│   ├── models.py                 # UserAccount, LoginSession, FormConnection, FormConnectionRevision,
│   │                             # DocumentRequest
│   ├── schemas.py                # envelopes kept, plus auth, document-type, form-connection and integration schemas
│   ├── catalog.py                # document type catalog: pid (SD-JWT VC) and mdl (mdoc)
│   ├── cli.py                    # create-user / set-password / delete-user, and clear-connections,
│   │                             # which deletes the EUDIPLO sessions before the rows (T093)
│   ├── routers/
│   │   ├── auth.py               # /api/auth/login, /logout, /me
│   │   ├── document_types.py     # /api/document-types
│   │   ├── form_connections.py   # /api/form-connections/*
│   │   └── connect.py            # /api/connect/*: serviceBW trigger and pull (allow-listed in nginx)
│   └── services/
│       ├── auth.py               # Argon2 hashing, sign-in sessions, get_current_user, JSON-only (CSRF) dependency
│       ├── eudiplo.py            # EUDIPLO client: token cache, configs, offers, sessions (hand-written models)
│       ├── dcql.py               # revision documents + catalog → configuration body and config_hash
│       ├── documents.py          # EUDIPLO credentials → configured fields only
│       ├── form_connections.py   # create and edit (locked revision numbering), deactivate, activate, delete, re-sync
│       ├── document_requests.py  # trigger, status mapping, last check before expiry, delivery once
│       ├── qr.py                 # QR PNG data URI (segno)
│       └── worker.py             # loop: sync, expire, cancel, delete sessions, re-sync,
│                                 # clean configs, end sign-ins, delete old request records
├── alembic/versions/
│   ├── v0_add_team_members.py    # kept (committed history)
│   ├── <rev>_form_connections.py # new: drops team_members, creates the six tables and the indexes
│   └── <rev>_remove_webhook_mode.py # new (2026-10-19): drops webhook_deliveries, the two webhook_url
│                                 # columns and document_requests.mode
├── scripts/
│   └── issue_test_credentials/   # developer script, not in the image: issues a test PID and mDL
│                                 # with random data to a test wallet (CLAUDE.md, README.md)
└── tests/
    ├── conftest.py               # test DB guard (name must end in _test), app client, fake EUDIPLO
    ├── fake_eudiplo.py           # httpx2.MockTransport-based EUDIPLO double
    ├── unit/                     # catalog, dcql and config hash, documents (allow-list extraction),
    │                             # status mapping, EUDIPLO client, CLI, issue_test_credentials
    └── api/                      # auth and CSRF, errors, form connections, connect (pull, expiry,
                                  # unavailable, check order), worker steps

frontend/
├── index.html                    # title and lang from the Figma design
├── nginx.conf                    # adds: location /api/connect/ with the allow-list include; real client
│                                 # address from TRUSTED_PROXY_CIDRS; access-log format that redacts references
├── nginx/
│   └── 40-servicebw-access.sh    # /docker-entrypoint.d script: writes the allow-list and real-IP includes
│                                 # from SERVICEBW_ALLOWED_CIDRS and TRUSTED_PROXY_CIDRS (empty list = deny all)
├── Dockerfile                    # copies the script into /docker-entrypoint.d/
└── src/
    ├── main.tsx                  # router root
    ├── App.tsx                   # routes and sign-in guard
    ├── index.css                 # Tailwind + KERN imports (KERN-DESIGN-SYSTEM.md §2)
    ├── api/                      # client.ts (fetch, credentials, always JSON, ApiError), auth.ts,
    │                             # document-types.ts, form-connections.ts
    ├── types/                    # api.ts (envelopes), auth.ts, document-types.ts, form-connections.ts
    ├── hooks/                    # current-user / sign-in state
    ├── components/               # app layout and header, sign-in layout, route guards,
    │                             # copyable URL field, confirm dialog
    ├── pages/
    │   ├── Login/
    │   ├── ForgotPassword/       # says whom to ask; passwords are reset with the account CLI
    │   ├── FirstConnection/      # /get-started: the create wizard headed "Create your first
    │   │                         # connection" while no form connection exists, else the overview
    │   ├── FormConnectionList/
    │   ├── FormConnectionEditor/ # create and edit; components/ for document and field pickers
    │   └── FormConnectionDetail/ # URLs, activate/deactivate, delete
    └── utils/
```

**Structure Decision**: The repository keeps its web-application layout: `backend/` (FastAPI) and
`frontend/` (React SPA behind nginx), built and deployed separately, with no shared types.

- **`app/services/`** holds the domain logic, so that the routers stay thin and the worker reuses
  the same functions: the EUDIPLO client, DCQL building, field extraction, request lifecycle and
  the worker.
- **`app/catalog.py`** and **`app/cli.py`** are single-purpose modules beside `config.py`.
- **The production nginx** gains the `/api/connect/` allow-list, because in the documented Coolify
  topology it is the only public entry point (research R13).
- **Frontend page directories** follow the constitution's component rules: sibling `types.ts`,
  `constants.ts` and `utils.ts`, `useReducer`, and list sub-components. The exact component split
  follows the Figma design.

### Cleanup of the template code (first tasks)

This list comes from research R1. Each step leaves the app building and starting.

1. **Backend**:
   - delete `app/routers/team_members.py` and `app/routers/id_verification.py`;
   - remove `TeamMember` from `models.py`;
   - remove the team-member, `AskIdResponse` and `PersonIdResponse` schemas; keep `ApiResponse`,
     `ApiErrorResponse` and `to_iso_utc`;
   - remove the `api_key` setting and its use in `/api/health`, and remove `GET /`;
   - remove `API_KEY` from `backend/.env.example` and `docker-compose.prod.yml`;
   - rename the FastAPI title and description.
2. **Frontend**:
   - delete `src/pages/TeamMembers/` and `src/api/team-members.ts`;
   - remove the team-member and pagination types;
   - move `ApiError` and `handleResponse` into `src/api/client.ts`;
   - leave `App.tsx` as an empty shell;
   - delete the tracked `tsconfig.app.tsbuildinfo` and add `*.tsbuildinfo` to `.gitignore`.
3. **Kept unchanged**: Dockerfiles and compose files (apart from the new variables), Alembic setup,
   lint, format and type configuration, pre-commit, and `v0_add_team_members.py`.
4. **Docs**: `README.md` has no example code. Rewrite to the new structure:
   - in `CLAUDE.md`: the backend structure listing, which shows `routers/team_members.py`, and the
     "Full Stack Example";
   - in `docs/ARCHITECTURE.md`: the error and naming examples.

   The generic `TeamMember` names in `CLAUDE.md`'s naming-convention tables stay, because they only
   illustrate conventions.

## Constitution Check: after Phase 1 design

The design artifacts were checked against the constitution once more:

- [contracts/management-api.md](contracts/management-api.md) and
  [contracts/integration-api.md](contracts/integration-api.md) use only the documented envelopes,
  including `data: null` for logout, delete and health, and `HTTPException` details (I).
- [data-model.md](data-model.md) follows the model conventions, including indexes for every
  scan, and the migration plan keeps the committed history (V).
- The worker, its leases and the EUDIPLO client are synchronous and use their own sync `Session`s
  (II).
- Every setting in research R18 is a `Settings` field and is documented. The two nginx variables
  are documented like `BACKEND_HOST` (IV).
- The new dependencies are each imported directly (IV).
- The 2026-10-11 amendment changes only the frontend. There is no new schema, migration,
  dependency or setting (I, IV, V), because `/get-started` reuses `GET /api/form-connections`.
  `pages/FirstConnection/` follows the component rules: sibling `constants.ts` and `types.ts`,
  no inline styles. The routing change goes into `CLAUDE.md` and `docs/ARCHITECTURE.md`
  (documentation checklist).
- The 2026-10-19 amendment removes webhook mode. A new migration drops the `webhook_deliveries`
  table and the `webhook_url` and `mode` columns, and the committed migrations stay as they are
  (V). `mode` and `webhook_url` leave the management API's schemas and the frontend types in the
  same change (I). No setting is removed: `ALLOW_PLAIN_HTTP` now covers only `CONNECTION_BASE_URL`
  (IV).

**Gate result (after design)**: PASS, with no violations.

## Complexity Tracking

No constitution violations, so nothing needs justifying here.
