# Implementation Plan: Connection Drafts ("Save and exit") and Crash Recovery

**Branch**: `005-connection-drafts` | **Date**: 2026-11-04 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/005-connection-drafts/spec.md`, with its
Clarifications of 2026-11-04.

**Note**: this checkout's `.git` points to a worktree path that doesn't exist here, so git couldn't
confirm the branch. `setup-plan.sh` resolved the feature from `.specify/feature.json`.

## Summary

The create flow of a connection can be left at any step with **"Save and exit"**. What the team
member has entered is stored as a **draft**:
- a draft isn't live: it sets nothing up with EUDIPLO, its URLs answer "unavailable", and its
  content may be incomplete;
- any team member can continue it on any device, at the step where it was left, and publish it.
  Publishing runs the same checks and the same save as publishing a new connection;
- a draft can be deleted.

While the team member works, the browser keeps a **local draft** of the unsaved work. After a
crash, a reload, a closed tab or an expired session, the app offers to resume it. When two team
members save the same draft, the later save is refused with "Reload" or "Replace their changes",
as for spec 002's rules.

**Technical approach** (research R1–R16):
- **Storage**: a draft is a `form_connections` row whose `published_at` is null. It has no
  current revision or rule set, its content is in one JSONB column, `draft`, with a
  `draft_version`, and a CHECK constraint keeps the two states apart (R1, R15).
- **API**: four draft endpoints beside the form connection endpoints. `GET` answers a union
  discriminated by `status`. Published endpoints refuse drafts with `409 not_published`, and
  draft endpoints refuse published connections with `409 draft_published` (R2).
- **One implementation of the checks**: the existing validators get a `complete` switch. Drafts
  get the structural checks, and publishing gets the create path's checks unchanged, so the
  messages are the same (R3). Identifiers come from the connection's counters (R4).
- **One implementation of saving**: publishing a draft runs `create_revision()` with a draft guard:
  reserve a revision under the row lock, create the EUDIPLO configuration, then lock again,
  re-check, and write rule set 1 with `first_rule_set()`. Two publishes of one draft therefore
  can't touch each other's configuration (R5).
- **Conflicts**: `draft_version`, checked before validation and again under the lock;
  `409 draft_changed` or `draft_published`, a `404` for a deleted draft, and `replace` (R6).
  Deleting a draft removes the row (R7). A draft's URLs answer the existing `409 unavailable`, and
  the worker skips drafts (R8).
- **Local drafts**: `localStorage`, one record per account and flow, written at most once a
  second while the content differs from its start, flushed on `pagehide`. It holds no personas,
  findings or citizen data (R9). The flow's URL names its local draft (`?local=`), so reloads and
  the sign-in round trip return into the flow (R10). Signing out warns and discards, and an
  expired session keeps the local drafts (R11).
- **Editor**: three origins: `new`, `draft` and `published`. "Save and exit" goes through the rule
  editor's existing question. The conflict dialogs, the restore question and the catalog-dropped
  note are new (R12).
- **UI**: Figma's "Draft" badge and "Save and exit" (spec 002's F28 nodes) are now built, and
  what has no frame is decided as W1–W10 in [contracts/ui-screens.md](contracts/ui-screens.md)
  (R13).

## Technical Context

**Language/Version**: Python 3.13 (backend); TypeScript 6.0 with React 19.2 (frontend).

**Primary Dependencies**: unchanged.
- **Backend**: FastAPI, SQLAlchemy 2 (sync), Alembic, psycopg 3, Pydantic 2.
- **Frontend**: React Router 7, the KERN React kit, Tailwind CSS 4.
- **Browser API**: `window.localStorage`, which needs no dependency.

**Storage**:
- **PostgreSQL**: `form_connections` gains `published_at`, `draft` (JSONB) and `draft_version`;
  `current_revision` and `current_rule_set` become nullable; one CHECK constraint is added. One
  migration ([data-model.md](data-model.md), R15).
- **Browser**: `localStorage` for local drafts, which never leave the device (R9).

**Testing**:
- **pytest** (a practice, run anyway): API tests for drafts, conflicts, publish parity (SC-003),
  concurrency with the fake EUDIPLO, and the URLs of drafts (SC-002). A unit test for the
  structural checks.
- **Vitest** (the gate) in `node`: every module of `src/utils/localDrafts/`, against an in-memory
  `StorageLike`, and the editor's new pure functions.
- **Manual scenarios** V1–V14 in [quickstart.md](quickstart.md) cover crashes, two browsers,
  blocked storage, sign-out, an expired session and accessibility (R14).

**Target Platform**: unchanged: DO.IT's evergreen desktop browsers, and Linux containers behind
nginx.

**Project Type**: web application (React SPA behind nginx, FastAPI backend, PostgreSQL).

**Performance Goals**:
- A draft save is one transaction without EUDIPLO, well under a second.
- Publishing a draft costs what publishing a new connection does.
- A local draft write serialises a few kilobytes at most once a second, and under 1 MB at spec
  002's limits.
- A crash loses at most about one second of work, well under the spec's 5 seconds (SC-004).

**Constraints**:
- **One implementation** of the checks and of saving (spec Assumptions; R3, R5).
- **Published connections stay as they are**: the same URLs, answers and edit flow (FR-025,
  FR-026; SC-007).
- **Local drafts stay on the device**, scoped to their account. They never hold personas,
  findings or citizen data (FR-015, FR-019, FR-020).
- **No transaction while EUDIPLO answers**, and the revision is reserved before the call
  (ARCHITECTURE).
- **WCAG 2.1 AA** for every new screen part (FR-028).

**Scale/Scope**: one team; dozens of connections, a few drafts at a time. New code:
- **Backend**: one service module (`services/drafts.py`); changes to `form_connections.py`,
  `rules.py`, `document_requests.py` and `worker.py`; four endpoints; one migration.
- **Frontend**: one folder of 6 pure modules (`utils/localDrafts/`); 3 hooks; changes to the
  editor page, its footer, dialogs and reducer, the edit, details, overview and first-connection
  pages, the user menu and the status badge; about 10 new small components.

**Open points**: none. All are resolved in [research.md](research.md). The points to check while
coding are R16:
- the union response in FastAPI;
- incomplete rules on the details page;
- `useSearchParams` without remounting;
- flushing on `pagehide` in the back-forward cache;
- the 1 MB body limit;
- `crypto.randomUUID()`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design below.*

Checked against constitution v1.1.0 (`.specify/memory/constitution.md`).

| Principle or rule | How the plan complies | Result |
|---|---|---|
| **I. Contract parity** | The new schemas (`FormConnectionDraft`, `DraftCreate`, `DraftUpdate`, `DraftPublish`, `DraftRules`, `FormConnectionOrDraft`) and the new `status` fields are mirrored in `frontend/src/types/form-connections.ts` in the same change. Every error is an `HTTPException` with an `{error, message}` detail: `draft_changed`, `draft_published`, `not_published` and the existing `Validation error` / `Not found` | PASS |
| **II. Sync persistence (NON-NEGOTIABLE)** | The new handlers are plain `def` with the sync `Session`, 2.0-style `select()` and `db.get()`, and row locks with `with_for_update()`. No transaction is held while EUDIPLO answers (R5) | PASS |
| **III. Quality gates** | The local-draft logic is pure in `src/utils/localDrafts/`, written against an injected `StorageLike`, with `*.test.ts` beside each module, run in `node`. No jsdom, no `vitest.config.ts`, no `pytest.ini`. Hooks and components are glue, covered by lint, the build and the quickstart. Backend: Ruff and mypy (`app/ scripts/ tests/`), with pytest run | PASS |
| **IV. Dependencies and config** | No dependency, setting or environment variable. The interval, the 30-day expiry and the storage prefix are frontend constants | PASS |
| **V. Schema evolution** | One migration, generated with `--autogenerate`, then corrected by hand for the backfill of `published_at` and the CHECK constraint, which autogenerate doesn't emit (R15). No committed migration is edited. `Mapped` / `mapped_column`, an index on `published_at`, `datetime.now(tz=timezone.utc)` for publishing | PASS |
| **Technology and structure** | Stack unchanged. Draft logic in `app/services/drafts.py`, endpoints in the existing `routers/form_connections.py` (same resource), thin. Frontend: types → API functions → pure modules → hooks → components. Small components, every list a sub-component (offer items, the sign-out dialog's names), sibling `types.ts` / `constants.ts` / `utils.ts`, related state in reducers (the editor's new fields go through `editorReducer` actions). Tailwind only, no `any`, no `require()` | PASS |
| **Logging** | The backend logs ids only ("Draft %s saved", "published", "deleted"), never content. The browser logs nothing: no `console.*` in `localDrafts/` or the hooks | PASS |
| **Security (CLAUDE.md "Auth")** | Every new endpoint depends on `get_current_user`, and its state changes on `require_json`. The connect URLs of drafts reveal nothing beyond a deactivated connection's answer (R8) | PASS |
| **Workflow and documentation** | Backend: model → schemas → migration → services → router → tests. Frontend: types → API → logic → hooks → pages. The documentation checklist is the last task: `docs/ARCHITECTURE.md` (drafts, local drafts, "nothing reaches the API before Publish" corrected); `CLAUDE.md` (one-line rules for drafts and local drafts); `README.md` (the draft endpoints in the API table, if listed). Spec 001's design-notes §6 and §8, spec 002's F28 and F23, and spec 004's O3 get a "superseded by spec 005" note | PASS |

**Gate result (before research)**: PASS, with no violations to justify.

## Project Structure

### Documentation (this feature)

```text
specs/005-connection-drafts/
├── spec.md              # Feature spec with Clarifications (2026-11-04)
├── plan.md              # This file
├── research.md          # Phase 0: decisions R1–R16
├── data-model.md        # Phase 1: columns, states, draft content, validation, identifiers, local draft, editor state
├── quickstart.md        # Phase 1: automated checks and scenarios V1–V14
├── contracts/           # Phase 1
│   ├── management-api.md    # draft endpoints, changed shapes, errors, step by step
│   ├── integration-api.md   # a draft's and a deleted draft's connection URLs
│   ├── local-drafts.md      # format, pure modules, hooks, rules for callers
│   └── ui-screens.md        # S0–S8, W1–W10, superseded decisions, copy, accessibility
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 output (/speckit-tasks, not created here)
```

### Source Code (repository root)

```text
backend/
├── alembic/versions/<rev>_connection_drafts.py   # columns, backfill, CHECK (R15)
├── app/
│   ├── models.py            # FormConnection: published_at, draft, draft_version; current_* nullable; CHECK
│   ├── schemas.py           # status; FormConnectionDraft, DraftRules, DraftCreate, DraftUpdate,
│   │                        #   DraftPublish, FormConnectionOrDraft, DRAFT_CONTENT
│   ├── routers/form_connections.py   # POST /drafts, PUT /{id}/draft, POST /{id}/publish,
│   │                                 #   DELETE /{id}/draft; GET → union
│   └── services/
│       ├── drafts.py              # new: create, save, publish (guard), delete, view, guards (R2–R7)
│       ├── form_connections.py    # clean_documents(complete=); list/get with status;
│       │                          #   create_revision(draft guard, first rule set); published-only
│       │                          #   paths refuse drafts; resync_config skips drafts
│       ├── rules.py               # complete switch through clean_branches and the item checks;
│       │                          #   first numbering with counters and below-base identifiers;
│       │                          #   check_first_save(counters); first_rule_set with the row's counters
│       ├── document_requests.py   # _usable_form_connection: draft → 409 unavailable (R8)
│       └── worker.py              # resync_configs: published connections only
└── tests/
    ├── api/test_form_connection_drafts.py   # new: drafts, conflicts, parity, concurrency
    ├── api/test_connect.py                  # + draft and deleted-draft URLs
    ├── api/test_worker_requests.py          # + re-sync skips drafts
    └── unit/test_draft_validation.py        # new: complete=False checks

frontend/src/
├── types/form-connections.ts      # + status, FormConnectionDraft, Draft*, FormConnectionOrDraft
├── api/form-connections.ts        # + createDraft, saveDraft, publishDraft, deleteDraft; get → union
├── utils/localDrafts/             # new; each module with its *.test.ts
│   ├── types.ts, constants.ts
│   ├── keys.ts                    # storage keys, flow keys
│   ├── format.ts                  # serialize / parse and validate untrusted records
│   ├── content.ts                 # emptyContent, sameContent, displayNameOf
│   └── store.ts                   # createLocalDraftStore over StorageLike; flushPendingLocalDrafts registry
├── hooks/
│   ├── useLocalDraftStore.ts      # the only code that touches window.localStorage
│   ├── useLocalDraft.ts           # the editor's autosave (throttle, flush, storage event, forget)
│   ├── useLocalDrafts.ts          # the offers' list and discard
│   └── useFormConnection.ts       # answers the union
├── components/
│   ├── ConnectionStatusBadge/     # + draft (KERN info badge "Draft")
│   ├── LocalDraftsOffer/          # S4: section, LocalDraftItem, discard confirmation
│   └── UserMenu/                  # S7: SignOutDialog before logging out
└── pages/
    ├── FormConnectionEditor/      # origin; Save and exit; conflicts; restore; catalog note
    │   ├── index.tsx, EditorFooter.tsx (Save and exit), PublishDialog.tsx (draft conflicts)
    │   ├── DraftConflictDialog.tsx, SaveDraftAlert.tsx, CatalogDroppedNote.tsx
    │   ├── RulesStep/types.ts     # LeaveEditorAction + { type: 'saveAndExit' }
    │   └── types.ts, constants.ts, utils.ts (+ utils.test.ts)
    ├── FormConnectionEdit/        # draft → restore question (RestoreDialog) → draft flow; published unchanged
    ├── FormConnectionDetail/      # draft → DraftDetails, DraftCard, delete confirmation
    ├── FormConnectionList/        # Draft rows ("Continue", "Saved …"), hint, offer, saved status
    └── FirstConnection/           # ?local, the offer above step 1
```

**Structure Decision**: the web-application layout of specs 001 to 004 stays.
- **Backend**:
  - drafts are a sub-resource of form connections, so their endpoints join
    `routers/form_connections.py`, and their logic gets its own service module;
  - the shared validators and the save path stay in `form_connections.py` and `rules.py`, extended
    with switches, not copied (R3, R5).
- **Frontend**:
  - local drafts get a pure folder under `utils/`, with the browser binding confined to one hook,
    as `checks/` confines its worker;
  - the create flow stays one editor page with an explicit origin;
  - the overview, the details, the edit page and the first-connection screen branch on `status`.

## Rules for `/speckit-tasks`

- **Order**:
  1. **Backend, bottom-up**: model and migration (with the hand-added backfill and CHECK) →
     schemas → `rules.py` (the `complete` switch, the first numbering with counters) →
     `form_connections.py` (`clean_documents(complete=)`, the guard in `create_revision`, refusing
     drafts on published paths, list and get) → `services/drafts.py` → router →
     `document_requests.py` and `worker.py` → tests.
  2. **Frontend types and API**.
  3. **`utils/localDrafts/`** with its tests.
  4. **Hooks**.
  5. **Editor**: origin, Save and exit, conflicts, restore, catalog note.
  6. **Pages**: overview, offer, first connection, details, edit page, user menu.
  7. **Documentation**.
- **The parity test** (SC-003) comes with `publish_draft`, not after the UI. It runs the same table
  of payloads through `POST /api/form-connections` and through a draft then `…/publish`, and
  compares status, `error` and `message`.
- **The concurrency tests** of research R14 (two publishes, a save during a publish, a delete
  during a publish) come with the `create_revision` guard. They show that the winner's EUDIPLO
  configuration is neither overwritten nor deleted.
- **Every UI task cites** the screen (S0–S8) and the W-items it covers from
  [contracts/ui-screens.md](contracts/ui-screens.md), and every W-item is cited at least once.
  Tasks on Figma-backed parts ("Save and exit", the "Draft" badge, U28's save failure) follow
  `docs/FIGMA-WORKFLOW.md` on spec 002's F28 nodes in file `s8mU9oJDq3411e8bxMjQO9`.
- **Each module of `utils/localDrafts/` comes with its test.** No `console.*` there, in the hooks
  or in the offer, and nothing about a local draft is ever sent except through "Save and exit"
  and publishing (FR-020).
- **Published connections are left alone**: no task changes the published edit flow beyond
  refusing drafts. A task that touches a reader of `current_revision` or `current_rule_set`
  narrows it with a guard, and mypy passes.
- **The migration is reviewed by hand** (constitution V): autogenerate doesn't emit the backfill
  or the CHECK constraint. Downgrade removes drafts first.
- **Gates**: every backend task passes `uv run ruff check`, `uv run ruff format`,
  `uv run mypy app/ scripts/ tests/` and the pytest suite. Every frontend task passes
  `npm run lint`, `npm test` and `npm run build`.
- **The last task applies the documentation checklist**:
  - `docs/ARCHITECTURE.md`: the form connections section (drafts, states, publishing through the
    revision path), "nothing reaches the API before Publish" corrected, and a section on local
    drafts;
  - `CLAUDE.md`: one-line rules pointing to ARCHITECTURE: "drafts are never live", "publishing a
    draft goes through `create_revision`", "only `useLocalDraftStore` touches `localStorage`",
    "local drafts never hold personas or findings";
  - the "superseded by spec 005" notes in spec 001's design-notes §6/§8, spec 002's F28/F23 and
    spec 004's O3.

## Constitution Check: after Phase 1 design

- **API contracts** ([contracts/management-api.md](contracts/management-api.md),
  [contracts/integration-api.md](contracts/integration-api.md)):
  - every shape has its TypeScript mirror, and every error the `{error, message}` envelope (I);
  - the connect URLs keep their contract for published connections, and answer the existing
    `409 unavailable` for drafts (SC-007).
- **Data model** ([data-model.md](data-model.md)): one migration, reviewed, with a CHECK
  constraint. `published_at` is indexed, and Python-side timestamps use
  `datetime.now(tz=timezone.utc)` (V).
- **Local drafts** ([contracts/local-drafts.md](contracts/local-drafts.md)):
  - pure modules over an injected `StorageLike`, tested in `node`, and one hook with browser
    access (III);
  - no console output, nothing sent;
  - no dependency (IV).
- **UI** ([contracts/ui-screens.md](contracts/ui-screens.md)): reuses `ConfirmDialog`,
  `KernBadge`, `ErrorNoticeText` and the summaries, with every list item as a sub-component
  (structure).
- **Database access** ([research R5](research.md#r5-publishing-a-draft-through-the-existing-save-path)):
  publishing holds no transaction while EUDIPLO answers, reserving first and re-checking under the
  row lock (II; ARCHITECTURE).

**Gate result (after design)**: PASS, with no violations.

## Complexity Tracking

No constitution violations, so nothing needs justifying here.
