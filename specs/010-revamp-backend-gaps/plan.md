# Implementation Plan: The stored-data features of the KERN Revamp design (deferred group A)

**Branch**: `010-revamp-backend-gaps` (feature directory `specs/010-revamp-backend-gaps/`) |
**Date**: 2026-11-11 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/010-revamp-backend-gaps/spec.md` (Clarifications
2026-11-10 #1 to #37), its Figma audit of 2026-11-10 ([figma-audit/report.md](figma-audit/report.md):
no open item; F1 to F43 and W1 to W18 decided), and spec 008's
[deferred.md](../008-kern-revamp-redesign/deferred.md), group A with the data groups of group C.

**Note**: `.git` in this checkout points at another machine's path, so `setup-plan.sh` resolved
the feature from `.specify/feature.json`. Git works here with
`GIT_DIR=/home/debian/batch27-faro/worktrees/010-revamp-backend-gaps` and
`GIT_WORK_TREE=/home/debian/batch27-faro/010-revamp-backend-gaps`, on the branch
`010-revamp-backend-gaps`; planning committed nothing. No Figma node was read for the plan: the
audit's unit inventories hold the frames' texts, and the tasks read the nodes in the per-node loop.

## Summary

Nine things the redesigned management UI draws and spec 008 left out for lack of data are built,
each with the data it needs: a connection can be **scheduled** to go live on a day; rows and
details show the **dates** of a connection's status and a draft's **step**; the details show an
**Activity** card with who did what; a deletion can be taken back with **"Undo"**; several
connections can be **deleted at once**; the documents keep the **order** the team gives them,
changed by dragging or by "Move up" and "Move down"; the welcome page offers a ready **example**;
long documents show their data items under **groups**; and **agents** read all of it, move
documents and ask for a start date with approval. Every toast now closes after 6 seconds. What
serviceBW receives changes in one respect: a scheduled connection's links answer as a deactivated
connection's until its start.

**Technical approach** (research R1 to R15):
- **Scheduled is a published connection that is not active and has a start date** (R1):
  `form_connections.start_date`, with `is_active = false`. Everything that decides whether a
  connection is usable already reads `is_active`, so serviceBW gets a deactivated connection's
  answer with no change to `/api/connect/`. `state_of()` derives `draft`, `scheduled`, `live` or
  `deactivated`, answered as `state` beside the unchanged `status` and `is_active`.
- **The start is a day in Germany, and one worker step activates** (R2): a `Date` column, checked
  as "after today in Germany" at every path and again under the row lock; a new first worker step
  makes due connections active within its 2-second cycle, also after a downtime.
- **Two dates beside `published_at`** (R3): `activated_at` and `deactivated_at`, moved only by the
  status transitions of data-model §1.3, backfilled from what is known.
- **The activity is a table the services write** (R4): `connection_activity`, written under the
  connection's row lock with the acting person passed in as an `Actor` (a team member, a team
  member with an agent, an approver with the asking agent, or nobody). A pure
  `changes_between()` says what a save changed; repeated changes merge at the write.
- **A deletion marks the row and has an id** (R5): drafts keep their row too until the restore
  time (`DELETION_UNDO_SECONDS`, 300) has passed; `deletion_id` groups the rows deleted together,
  and one restore endpoint brings all back or none. The worker's cleanup waits for that time.
- **The document order is a list on the connection** (R6): the order of `documents` in a request
  is stored and answered; revisions, the DCQL query and the delivery stay in catalog order, so a
  reorder needs no EUDIPLO. The move is one function in `rules/src/edits.ts`; dragging is Pointer
  Events with a pure state machine, without a library.
- **The example is built by the server** (R7): `POST /api/form-connections/example` from
  `app/example.py`, in the request's language, with a mark on the row; a generated fixture lets
  the rules package prove that it is publishable and without findings.
- **Data groups are catalog data** (R8), answered with the document types and grouped by the
  panel.
- **Agents** (R9): `start_date` on approval requests, the new action `set_start_date`, a snapshot
  that includes the start date, two new MCP tools (`get_activity`, `move_document`), and the
  guidance in the same change.
- **Copy** (R11): [contracts/copy.md](contracts/copy.md) words what no frame draws, in English and
  German, and names the glossary's new terms.

## Technical Context

**Language/Version**: Python 3.13 (backend); TypeScript 6.0 with React 19.2 (frontend), TypeScript
6.0 on Node 22+ (the rules package, api-types, the MCP server; Node 20.19 in this checkout, Node
26 in CI).

**Primary Dependencies**: unchanged (constitution IV): FastAPI, Pydantic 2, SQLAlchemy 2 (sync),
Alembic, psycopg 3; `@kern-ux/native` 2.8.2, `@kern-ux-annex/kern-react-kit` 2.40.0, Tailwind CSS
4, React Router 7, Vite 8, Vitest 4; `@modelcontextprotocol/server` 2.4.0 with `zod` 4. No
drag-and-drop, date or scheduling library (R2, R6, R13).

**Storage**: PostgreSQL 18. One new table (`connection_activity`), seven new columns on
`form_connections` (`start_date`, `activated_at`, `deactivated_at`, `document_order`, `example`,
`deletion_id`, `deleted_by_id`), two on `approval_requests` (`start_date`, `was_start_date`), two
CHECK constraints and a partial index, in five Alembic revisions with one backfill
([data-model.md](data-model.md) §9). One new setting, `DELETION_UNDO_SECONDS`. No new
`localStorage` key and no change to the local drafts' format. One new generated file,
`rules/src/fixtures/example-connection.json`.

**Testing**:
- **Vitest** (the gate) in `node`: the pure reducers and helpers this feature adds, each beside
  its module: `moveDocument()` and its siblings in `rules/src/edits.test.ts`, the example's
  fixture through the validation and the rule checks, the date field's `startDateOf()`, the
  selection reducer, the drag's state machine, `groupedFieldsOf()`, the row's and the pill's
  texts, the activity's sentences, the dialogs' reducers; `copy.test.ts` for every new table; the
  MCP server's tools against the fake backend and `guidance.test.ts`. No DOM tests.
- **pytest** (a practice, run anyway): the transitions of data-model §1.3 with their dates and
  entries, the date's checks under the lock, the worker's two new steps with a patched day,
  `changes_between()` and the merge, the soft delete and the restore of every status, the bulk
  deletion's all-or-none, the stored order with an unchanged revision, the example in both
  languages, the catalog's group rules, the approvals' new cases, `/api/connect/` word for word,
  the migration's backfill, the fixtures' `--check`.
- **Visual and manual**: the per-node loop for every ported frame and the scenarios V1 to V15 of
  [quickstart.md](quickstart.md) with the Playwright MCP tools, in both languages, at 1440 px and
  320 px / 200 %.

**Target Platform**: unchanged: DO.IT's evergreen desktop browsers (Chromium-based and Firefox),
light only, usable at 320 px and 200 % zoom; a Linux container each for the backend (with its
worker thread) and the MCP server. Pointer Events, `IntersectionObserver` and `Intl` are in all of
the browsers.

**Project Type**: web application (React SPA behind nginx, FastAPI backend with a worker thread,
PostgreSQL, the MCP server in its own container). This feature touches `backend/`, `api-types/`,
`rules/`, `frontend/` and `mcp/`.

**Performance Goals**: a scheduled connection is active within one minute of its start (SC-001;
the worker's cycle is 2 seconds, one indexed scan per cycle); the activity list answers 50 entries
per page from an index on the connection and the time, and the details read one entry for the
closed card; ten connections are deleted in one transaction and one request (SC-006); the example
is one request (SC-008); a save writes its activity in the transaction it already has.

**Constraints**:
- **serviceBW sees one change** (FR-075): `/api/connect/` is not edited except that a deleted
  draft keeps answering `404`; a scheduled connection's answer is a deactivated one's by
  construction (R1). Reordering changes no revision, no DCQL query and no delivery (FR-051).
- **Never a transaction while EUDIPLO answers** (CLAUDE.md): publishing with a date goes through
  `create_revision()` unchanged; the status changes, the deletion, the restore and the worker's
  new steps call no EUDIPLO.
- **Approval requests run the existing services** (CLAUDE.md): the same functions with a date and
  a snapshot, never a second path (R9).
- **Nothing stored or logged about citizens, requests, findings, personas or rule content**
  (FR-029, FR-073): the activity holds kinds, names of team members and agents, variants' names
  and dates; log lines keep ids and counts.
- **What agents receive stays English** (spec 009 FR-017), and every tool change lands with its
  skill (spec 007 FR-038).
- **Everything else stays as specs 001 to 009 built it** (FR-074), but for the toasts' time
  (FR-082); the frames' out-of-scope parts are not built (FR-076).
- **Figma decides layout, styling and wording** of the nine items' frames; this feature's copy
  for undrawn states is [contracts/copy.md](contracts/copy.md)'s.

**Scale/Scope**: 82 functional requirements in nine user stories; about 60 frames to port and 18
states built without frames; 5 new endpoints, and new fields or cases on 16 existing ones; 2 new
worker steps and 1 changed; 3 new backend modules (`start_dates.py`, `activity.py`,
`deletions.py`) and `example.py`; 2 new MCP tools and 6 changed, 6 guidance files; about 10 new
frontend components and 6 new reducers or
pure helpers with tests; about 120 new texts in two languages; 5 migrations.

**Open points**: none. All are resolved in [research.md](research.md); the points to check while
coding are R15's V1 to V12; six judgment calls are recorded under Complexity Tracking for the user
to confirm or reverse.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design below.*

Checked against constitution v1.2.1 (`.specify/memory/constitution.md`).

| Principle or rule | How the plan complies | Result |
|---|---|---|
| **I. Contract parity** | Every new or changed shape is in [contracts/management-api.md](contracts/management-api.md); `schemas.py` and `api-types/src/` change in the same task, per slice. The envelopes stay; the two new refusals use `{error, message}` with an extra key, as `needs_access_level` does. No handler builds an error body by hand | PASS |
| **II. Sync persistence (NON-NEGOTIABLE)** | Every new handler is a plain `def` with the injected `Session`, 2.0-style `select()`; the worker's steps are plain functions with their own short sessions; no `AsyncSession`, no `db.query()` | PASS |
| **III. Quality gates** | Pure logic with a `*.test.ts` beside it in `node` (no jsdom, no `vitest.config.ts` beside a `vite.config.ts`); the drag, the selection and the date field are pure state machines for that reason. `npm run lint`, `npm test`, `npm run build` from the root and Ruff, mypy and pytest after every task; no `pytest.ini`; `guidance.test.ts` stays the gate for the tools | PASS |
| **IV. Dependencies and config** | No dependency added. One setting, `DELETION_UNDO_SECONDS`, a field on `Settings`, documented in `README.md`, `docs/ARCHITECTURE.md` and `backend/.env.example` | PASS |
| **V. Schema evolution** | Five revisions generated with `--autogenerate`, each read and completed by hand (the CHECK constraints, the partial index, the backfill, the named foreign key); no committed migration is edited; `Mapped` / `mapped_column`, `String(36)` keys, timezone-aware timestamps, indexes on the looked-up columns; `datetime.now(tz=timezone.utc)` only | PASS |
| **Technology and structure** | Stack unchanged. Backend: one router per resource stays (`form_connections.py` gains the endpoints), logic in `app/services/`. Frontend: new parts in `components/`, `pages/<Name>/` and `hooks/`, each with sibling `types.ts`, `constants.ts`, `utils.ts`; several state variables in reducers; lists as sub-components. Tailwind classes only: the dragged row's copy is placed by two CSS custom properties set at run time, which the v1.2.1 clarification allows for a measured value (Complexity Tracking). No `any`, no `require()` | PASS |
| **Logging** | `logging` only; the new log lines carry connection ids and counts (activated, purged, deleted), never a name, a date, an activity text or an exception message. The MCP server logs only through `log.ts` | PASS |
| **Security (CLAUDE.md "Auth")** | New endpoints depend on `get_current_principal`; the writes on `require_json`; restoring, bulk deleting, the example and the start-date endpoint on `require_browser_session` (FR-068); restoring is for the account that deleted. Agents reach the start date only through approval requests at level `manage` | PASS |
| **Workflow and documentation** | Backend order per slice: model → schemas → migration → services → router → settings → tests; then api-types → `src/api/` → components and pages; then the MCP tool with its skill. The last phase applies the documentation checklist (below) | PASS |

**Gate result (before research)**: PASS, with no violations to justify.

## Project Structure

### Documentation (this feature)

```text
specs/010-revamp-backend-gaps/
├── spec.md              # Feature spec, Clarifications 2026-11-10 #1–#37
├── plan.md              # This file
├── research.md          # Phase 0: decisions R1–R15
├── data-model.md        # Phase 1: the columns, the activity table, the states and transitions,
│                        #   the example, the catalog's groups, the migrations
├── quickstart.md        # Phase 1: gates, the per-node loop, scenarios V1–V15
├── contracts/
│   ├── management-api.md    # Endpoints, shapes, refusals, the worker, what serviceBW sees
│   ├── mcp-tools.md         # The tools' changes and the guidance that goes with them
│   ├── ui-screens.md        # The screens that change (spec 008's S#), their frames, states and rules
│   └── copy.md              # The undrawn copy in English and German; the glossary's new terms
├── figma-audit/         # The audit of 2026-11-10: report, requirements, units (inventories)
├── checklists/
│   └── requirements.md
├── design-notes.md      # Created by the first task: the verification tables of the per-node loop,
│                        #   the deviations, the German review log
└── tasks.md             # Phase 2 output (/speckit-tasks, not created here)
```

### Source Code (repository root)

```text
backend/
├── app/
│   ├── models.py                  # FormConnection: 7 columns, 2 CHECKs; ConnectionActivity (new);
│   │                              #   ApprovalRequest: start_date, was_start_date
│   ├── schemas.py                 # ConnectionState, ExampleState, Activity*, Deletion*, FieldGroup,
│   │                              #   StartDateUpdate, ActivateRequest; the new fields
│   ├── config.py                  # deletion_undo_seconds
│   ├── catalog.py                 # CatalogField.group, the groups' table and labels, label_of()
│   ├── example.py                 # new leaf: the example's content, Text(en, de)
│   ├── services/
│   │   ├── start_dates.py         # new leaf: today_in_germany(), start_instant(), clean_start_date()
│   │   ├── activity.py            # new: Actor, actor_of(), SYSTEM, record(), changes_between(),
│   │   │                          #   list and last entry
│   │   ├── deletions.py           # new: the bulk deletion, restore_deletion(), finish_deletions()
│   │   ├── form_connections.py    # state_of(), the views' new fields, ordered_documents(), the
│   │   │                          #   status changes with a start date, set_start_date(),
│   │   │                          #   activate_due_connections(), _mark_deleted(), the search's filters
│   │   ├── drafts.py              # the order, the example mark, create_example(), the marked delete
│   │   ├── approvals.py           # set_start_date, the date and the snapshot, the stored reasons, texts
│   │   ├── document_requests.py   # a deleted draft's URLs keep answering 404
│   │   └── worker.py              # activate_scheduled_connections, finish_deletions; the config
│   │                              #   cleanup waits for the restore time
│   └── routers/
│       ├── form_connections.py    # activity, start-date, example, deletions, restore; the actor
│       ├── approval_requests.py   # the actor of an approval
│       └── document_types.py      # field_groups, group
├── alembic/versions/              # 5 revisions (data-model §9)
├── scripts/export_check_fixtures.py   # also writes rules/src/fixtures/example-connection.json
├── tests/api/, tests/unit/        # the cases of "Testing" above
└── .env.example                   # DELETION_UNDO_SECONDS

api-types/src/
├── form-connections.ts            # the new fields and types; Activity*, Deletion*
├── approvals.ts, document-types.ts
└── routing.ts                     # OverviewLocationState.deleted: the names and the deletion id

rules/src/
├── edits.ts, edits.test.ts        # moveDocument(), appendDocument(), restoreDocument()
├── constants.ts                   # EDIT_MESSAGES: the move's refusals
├── example.test.ts                # new: validation and rule checks on the generated example
└── fixtures/example-connection.json   # new, generated: never edited by hand

frontend/src/
├── api/form-connections.ts        # setStartDate, getActivity, createExample, deleteConnections,
│                                  #   restoreDeletion; activate with a date
├── hooks/useRowDrag.ts            # new: the pointer listeners of the documents' drag
├── components/
│   ├── ActiveFromChoice/          # new: the radio group and the date field (C2)
│   ├── ExampleBanner/             # new (C4)
│   ├── ConnectionStatusBadge/     # the state 'scheduled' and the header pill's date (C1)
│   └── Toast/                     # the 6 seconds for every toast (C3)
├── pages/
│   ├── FormConnectionList/        # the rows' dates and checkbox, SelectionBar, BulkDeleteDialog,
│   │                              #   the deletion's toast and "Undo", WelcomePage + ExampleDialog
│   ├── FormConnectionDetail/      # StatusBand with the date pill, ActivityCard, StartDateDialog,
│   │                              #   the menus and dialogs per state, the three-card accordion
│   ├── FormConnectionEditor/      # PublishDialog with "Active from" and the example's line; the
│   │   │                          #   editor's reducer without catalog sorting; the banners
│   │   └── DocumentsStep/         # the drag and the ⋯ menu, the grouped data item panel
│   ├── FormConnectionEdit/        # the scheduled wording of the edit flow
│   └── Approval/                  # the start date, set_start_date, the scheduled cases, the example's line
└── index.css                      # @theme tokens the drag's frames need, if any

mcp/
├── src/views.ts, tools/read.ts, tools/drafts.ts, tools/approvals.ts, tools/catalog.ts
├── src/guidance.test.ts           # the approval actions' list
├── plugin/instructions.md, plugin/skills/{publishing-and-live-connections,connection-workflow,
│       documents-and-catalog,access-levels,links}/SKILL.md
└── test/fakeBackend.ts, test/server.test.ts

docs/ARCHITECTURE.md, CLAUDE.md, README.md
specs/008-kern-revamp-redesign/deferred.md, specs/009-language-toggle/contracts/glossary.md
```

**Structure Decision**: the web-application layout of specs 001 to 009 stays. The backend gets
three service modules and one data module, each for one concern that `form_connections.py` (1134
lines today) should not absorb: the day arithmetic, the activity and the deletions; the status
changes stay in `form_connections.py`, where their lock helper is. `start_dates.py` and
`example.py` are leaves, so the fixture script can import them without `app.config`. The frontend
keeps one folder per screen; new folders appear only for the two shared components. The MCP server
gets no new module: the two tools join `tools/read.ts` and `tools/drafts.ts`.

## Rules for `/speckit-tasks`

- **Phases**, in this order (research R14). Each story is a vertical slice: the backend with its
  migration and tests, the api-types mirror, the frontend, and the MCP change with its guidance
  where the story has one, so that every phase ends with the gates green and something to show.
  1. **Setup**: `npm install`, `uv sync`; `design-notes.md` (the tables' skeleton); the glossary's
     new terms ([contracts/copy.md](contracts/copy.md) §1) added to spec 009's glossary.
  2. **Foundations** (blocks every story): `start_dates.py` with its tests; the `Actor`, threaded
     through every mutating service and its router with no behaviour change; migration 1 (the
     status dates, `start_date`, `connection_activity`, the backfill); `state_of()` and the new
     fields in both views, the list and the search, mirrored in api-types, the MCP's views and
     the fake backend; `activity.record()` and `changes_between()` hooked into every existing
     path (create, save, publish, update, deactivate, activate, delete) with the activity
     endpoint; the toasts' 6 seconds (C3).
  3. **US2, dates and the draft's step**: the rows' texts, the date pill with the ⋯ menu (C1),
     the pre-existing connections' dates.
  4. **US1, scheduling**: the transitions with a date, the start-date endpoint, the worker's
     step, the search's `scheduled`; `ActiveFromChoice` (C2), the publish dialog, the scheduled
     details, "Change start date", "Activate again", the scheduled wording of the delete,
     deactivate and edit dialogs and of the edit flow. US2 and US1 together are the first
     deliverable.
  5. **US3, the Activity card**: the card on both details pages, the three-card accordion,
     `get_activity` with its skill.
  6. **US4, Undo**: migration 2, `_mark_deleted()` for drafts too, the stored cancellation of
     approval requests, the restore endpoint, the worker's `finish_deletions` and the cleanup's
     wait, the connection URLs' `404` for a deleted draft; the toast with "Undo" on the overview
     and from the details.
  7. **US5, bulk delete**: the endpoint; the checkboxes, the selection bar, the bulk dialog; the
     local-drafts banner against 1m and 1n.
  8. **US6, document order**: migration 3, the stored order in every path and view;
     `moveDocument()` and its siblings; the editor's reducer; the drag and the ⋯ menu;
     `move_document` and `set_document` with their skill.
  9. **US7, the example**: migration 4, `example.py`, the endpoint, the fixture and its two
     tests; the welcome page's entry and dialog, the banners, the publish dialog's line.
  10. **US9, data groups**: the catalog's groups and their test, the API, the grouped panel and
      the group's question, `get_catalog`.
  11. **US8, agents and the start date**: migration 5, the approvals' date, action and snapshot,
      the approval page (W14), `request_approval` and `check_approval`, the instructions and the
      skills, the run of quickstart V12.
  12. **Verify and close**: quickstart V13 to V15, the German review of every new text in the
      running app, the keyboard and narrow walk, `/speckit-converge`, the documentation checklist.
- **Every task names** the requirements it meets (FR-#), the research decision it applies (R#),
  the contract section it implements (the endpoint or shape, the screen S# or C#, the tool), the
  files it edits, and ends with the gates. A UI task also names its frames and the audit's items
  (F#, W#) and appends its verification table to `design-notes.md`.
- **Task shape**: `[ID] [P?] [US?] <what> — <contract section>, <items>; files: …`. `[P]` only for
  tasks on different folders; at most three tasks with Figma calls run at a time, and a task reads
  at most about ten nodes.
- **Agents**: `speckit-task-xhigh` for the `Actor` threading (every service's signature), the
  status transitions and the worker's step (row locks, the date under the lock), the marked
  delete, the restore and the bulk deletion (locks, all-or-none), and the approvals' snapshot;
  `speckit-task-high` for `changes_between()` and the merge, the drag's state machine, the
  example, and every task with Figma checks; `speckit-task-medium` for the catalog's groups, the
  api-types mirrors, the fake backend, the copy tables, the skills and the docs.
- **One migration per slice**, generated with `--autogenerate`, then read and completed by hand
  as data-model §9 says; a committed migration is never edited, a correction is a new one.
- **Contract parity per task**: a task that changes `schemas.py` changes `api-types/src/` and
  whatever reads the shape (the frontend's API module, the MCP's views, the fake backend) in the
  same task.
- **The MCP guidance in the same task as the tool** (spec 007 FR-038): `npm test -w mcp` fails
  otherwise.
- **Copy**: the frames' and the spec's English word for word; the undrawn sentences from
  [contracts/copy.md](contracts/copy.md), changed there first if a task needs another wording;
  German in the task that makes the table, from the glossary; a term the glossary lacks is added
  to it in the same task.
- **Behaviour stays the baseline's** outside the nine items: a task that touches an existing
  reducer, service or helper keeps its tests passing; a test changes only for a requirement of
  this spec, and the task names it. What a frame shows of an out-of-scope item is not built
  (FR-076): the task lists it in its verification table as "not built" with the audit's F#.
- **A frame that changed since the audit** is reported, not built: the task stops on that node
  and the coordinator takes it to clarify.
- **Nothing new in the logs** beyond ids and counts; no `console.*` in the places CLAUDE.md
  names; the activity is never logged.
- **Generated files** are written by `uv run python -m scripts.export_check_fixtures` only.
- **Gates**: every task in a Node package passes `npm run lint`, `npm test` and `npm run build`
  from the root; every backend task passes Ruff, mypy and pytest; a task that touches the example
  or the server's messages runs the fixture script and its `--check`.
- **The last task applies the documentation checklist**:
  - `docs/ARCHITECTURE.md`: "Form connections" (the scheduled state and its transitions, the
    status dates, the document order, the example, the restorable deletion and what it changes for
    drafts); a new section on the activity (the table, the `Actor`, what a save records, the
    merge); "Background worker" (the two new steps, the cleanup's wait, the steps' numbering);
    "serviceBW's connection URLs" (scheduled, a deleted draft); "Agent access" (the start date,
    `set_start_date`, the snapshot, the 26 tools); the frontend section (the date pill, the three
    cards, the selection, the documents' reordering, the toasts' time); the environment variables.
  - `CLAUDE.md`, one line each: a start date is a day in Germany, checked by
    `clean_start_date()`, and only the worker's step activates on a date; a service that changes a
    connection takes the `actor` and records the change with `activity.record()` under the row
    lock; the order of `documents` in a body is the stored order, while revisions and the DCQL
    query stay in catalog order; deleting is `_mark_deleted()` for drafts too, and only
    `restore_deletion()` undoes it; every toast closes after 6 seconds; the styling rule's
    half-sentence becomes "a measured value (a height, a drag's offset)"; the generated files'
    list gains `rules/src/fixtures/example-connection.json`.
  - `README.md` (`DELETION_UNDO_SECONDS`, the fixture, the MCP tools), `backend/.env.example`.
  - `specs/008-kern-revamp-redesign/deferred.md`: F1, F2, F4, Q9 (b), Q14 (e), Q14 (f), Q37 (c),
    F71 and Q11 marked "built by spec 010"; spec 008's Clarification #52 and its toast rule marked
    superseded where they are stated.

## Constitution Check: after Phase 1 design

- **Contracts** ([contracts/](contracts/)): the management API with every new shape and refusal,
  the MCP tools with their guidance, the screens and the copy. `schemas.py` stays the source of
  truth and `api-types/src/` its mirror, changed together per slice; the envelopes are unchanged
  (I).
- **Data model** ([data-model.md](data-model.md)): one table and nine columns in the documented
  conventions, CHECK constraints and a partial index added by hand, a backfill in raw SQL, five
  append-only revisions (V). No table or column holds a citizen, a request, a finding, a persona
  or rule content.
- **Persistence**: every new read and write is synchronous, under the existing row locks; the
  worker's steps keep short transactions and lock with `SKIP LOCKED` (II).
- **Tests**: the new logic is cut so that it is pure where the gate can test it (the diff, the
  move, the drag, the selection, the date field, the example's fixture) and covered by pytest
  where it needs the database (III).
- **Dependencies and config**: none added; one declared and documented setting (IV).
- **Structure**: routers thin, logic in three new service modules; components small with their
  sibling files; Tailwind only, with the drag's offset as a custom property under the v1.2.1
  clarification.
- **Logging and data**: ids and counts; the activity, the names and the dates never reach a log
  line.

**Gate result (after design)**: PASS under constitution 1.2.1, with no violations.

## Complexity Tracking

No constitution violations, so nothing needs justifying here. Six judgment calls are the record,
for the user to confirm or reverse by amending the spec or the contracts:

| Decision | Why | What the alternative would be |
|---|---|---|
| The dragged row's copy follows the pointer through two CSS custom properties set at run time (`--drag-x`, `--drag-y`) | The frames draw a copy that follows the pointer; the constitution (v1.2.1) allows a value measured at run time as a custom property that classes read, and the pointer's offset is one. `CLAUDE.md` words the rule for "a measured height" and is widened in the documentation task | The browser's own drag and drop, which sets no coordinate but behaves differently on touch between browsers and cannot be tested in the gate (research R6) |
| The nationality sits under "Birth" in the driving licence and under "Other details" in the Personal ID | Clarification #35 fixes the driving licence's counts (Birth 6, Other details 1); the Personal ID's frame (A5) draws Birth with 3 and Other details with 5, and no decision overrules it | Move the Personal ID's nationality to "Birth" too (Birth 4, Other details 4), so that the same data item is in the same group in both documents |
| The example requests seven named data items of the Personal ID and two of the driving licence ([data-model.md](data-model.md) §5) | The frames give the counts and the two rules, not the data items; the rules need the date of birth and the licence classes, the rest is a plausible choice | Other data items with the same counts |
| A change of a variant's description alone writes no activity entry | FR-025 lists added, removed and renamed for variants, and FR-029 allows only what FR-025 lists | An entry "Variant changed: <name>", which needs a requirement |
| A scheduled connection that was deleted before its start and restored after it reads "Active since" its scheduled start | One rule for every start that was missed (the spec's edge case for a downtime), and one place that activates (research R2) | "Active since" the moment of the restore, with the restore activating the connection itself |
| The example variant's banner shows on a variant named as the example's variant ("Ambulance", "Krankentransport") | The banner's sentence names that variant and its two changed rules; a renamed or new variant is no longer what it describes | Recognise the variant by an id the response would have to carry, or show the sentence on every linked variant |

**Settled with the user on 2026-11-11 (task T003; design-notes §4.1)**: calls 1, 3, 4, 5 and 6
confirmed as written. Call 2 reversed: the Personal ID's nationality stands under "Birth" too
(Name 4, Birth 4, Address 7, Document 6, Other details 4), recorded in spec.md (Clarification
2026-11-11, FR-078), data-model.md §6 and research.md R8; it changes T072 and T073's counts and
T074's check of frame A5.
