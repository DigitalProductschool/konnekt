---

description: "Task list for connection drafts (Save and exit) and crash recovery"
---

# Tasks: Connection Drafts ("Save and exit") and Crash Recovery

**Input**: Design documents from `/specs/005-connection-drafts/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md) (with its Clarifications of 2026-11-04),
[research.md](research.md) (R1–R16), [data-model.md](data-model.md),
[contracts/management-api.md](contracts/management-api.md),
[contracts/integration-api.md](contracts/integration-api.md),
[contracts/local-drafts.md](contracts/local-drafts.md),
[contracts/ui-screens.md](contracts/ui-screens.md) (S0–S8, W1–W10), [quickstart.md](quickstart.md)
(V1–V14)

**Tests**: Included, because the plan asks for them (plan.md "Testing" and "Rules for
/speckit-tasks", research R14, quickstart "Automated checks").
- **Vitest is a merge gate** (constitution v1.1.0, III), in the `node` environment. Each task that
  writes a module of `utils/localDrafts/` writes its `*.test.ts` beside it, in the same task.
  `types.ts` and `constants.ts` hold no logic and have no test. The editor's, the overview's, the
  details' and the user menu's new pure helpers get tests in the sibling `utils.test.ts`.
- **Backend pytest is a practice, run anyway**: the API tests for drafts, conflicts, publish
  parity (SC-003) and concurrency, the URLs of drafts (SC-002), the structural checks and the
  worker. The parity test comes with `publish_draft` (T017), and the concurrency tests come with
  the `create_revision` guard (T018, T046), not after the UI.
- Hooks and components are glue: lint, the build and quickstart V1–V14 cover them.

**Organization**: Tasks are grouped by user story, so that each story is an increment that can be
tested. Inside each story the plan's order holds: backend bottom-up (rules → form connections →
drafts service → router → connection URLs and worker → tests), then frontend types and API, the
pure modules with their tests, the hooks, the editor, the pages, and the documentation last.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel: it touches different files and depends on no unfinished task in
  the same phase.
- **[Story]**: The user story the task belongs to (US1 to US3).
- Every description names the exact files.

## Path Conventions

- **Backend**: `backend/app/` and `backend/tests/`. The draft logic goes into the new
  `backend/app/services/drafts.py`, which imports `form_connections` and `rules`, never the other
  way round. Its endpoints join `backend/app/routers/form_connections.py`.
- **Editor**: `frontend/src/pages/FormConnectionEditor/`, written `editor/` below. The rules step
  is `editor/RulesStep/`.
- **Local drafts**: `frontend/src/utils/localDrafts/`, written `localDrafts/` below. Every module
  is pure and takes an injected `StorageLike`. Only `frontend/src/hooks/useLocalDraftStore.ts`
  touches `window.localStorage` (contracts/local-drafts.md).
- **Rules**: the constitution (v1.1.0) and CLAUDE.md apply to every task.
  - Backend: sync `Session`, 2.0-style `select()` / `db.get()`, plain `def` handlers, thin
    routers, services take the `Session` first and raise `HTTPException` with an
    `{error, message}` detail, `ApiResponse[...]`, `get_current_user` on every endpoint and
    `require_json` on every `POST` / `PUT` / `DELETE`, `datetime.now(tz=timezone.utc)`,
    single quotes, docstrings. No transaction is held while EUDIPLO answers.
  - Logging: ids only ("Draft %s saved", "published", "deleted"), never a name, a draft's content,
    a rule or an exception message (`describe_error(error)`).
  - Frontend: no `any`, no `require()`, no inline styles, Tailwind only, KERN classes,
    `focus-visible:` only, light theme only, `useReducer` actions for related state, every JSX
    list as a sub-component, sibling `types.ts` / `constants.ts` / `utils.ts`, links between
    routes as React Router `Link`s with KERN classes, `sr-only` (not `kern-sr-only`) inside a
    labelled `kern-btn`.
- **Contract parity** (constitution I): every schema change in `backend/app/schemas.py` is
  mirrored field for field (snake_case) in `frontend/src/types/form-connections.ts` in the same
  phase (T003 with T007).
- **Published connections are left alone** (FR-025, FR-026, SC-007): no task changes the published
  edit flow beyond refusing drafts. A task that touches a reader of `current_revision` or
  `current_rule_set` narrows it with a guard that refuses drafts, never with `# type: ignore`, and
  mypy passes.
- **Privacy** (FR-015, FR-020): no `console.*` in `localDrafts/`, the three local-draft hooks,
  `LocalDraftsOffer/` or the sign-out dialog. Nothing about a local draft is sent anywhere, except
  as the body of "Save and exit" or publishing. A local draft never holds personas, findings or
  citizen data.
- **Copy**: the wording of contracts/ui-screens.md "Copy", word for word, with the typographic
  apostrophe (’) that the existing UI uses (`Couldn’t save your draft`, `This can’t be undone.`).
  The UI says "connection" and "variant", and the main variant is "Standard". Validation messages
  are the server's, word for word (data-model.md "Validation").
- **UI tasks** (plan "Rules for /speckit-tasks", research R13): spec.md decides behaviour and
  wording, Figma decides layout. Every UI task cites its screen (S0–S8) and the W-items it covers.
  The Figma-backed parts ("Save and exit", the "Draft" badge, U28's save failure) follow
  `docs/FIGMA-WORKFLOW.md` on spec 002's F28 nodes in file `s8mU9oJDq3411e8bxMjQO9`
  (`specs/002-connection-rules/contracts/ui-screens.md`, row F28, lists every node): first
  `get_design_context` and `get_screenshot` per node, then exact values mapped to the tokens of
  the "Tokens" sections in `specs/002-connection-rules/design-notes.md` and
  `specs/003-rule-consistency-checks/design-notes.md`, then the numeric and visual checks. The
  W-items have no frame. They are built from KERN's alert, dialog and button patterns and the
  existing components (`ConfirmDialog`, `KernBadge`, `ErrorNoticeText`, `DocumentsSummary`,
  `RulesSummary`).
- **Gates**: every backend task passes `uv run ruff check .`, `uv run ruff format --check .` and
  `uv run mypy app/ scripts/ tests/` (in `backend/`), and runs
  `DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5435/template_db_test uv run pytest`.
  Every frontend task passes `npm run lint`, `npm test` and `npm run build` (in `frontend/`).

---

## Phase 1: Setup

**Purpose**: A known starting point. No dependency, setting or environment variable is added
(plan "Constitution Check", IV).

- [X] T001 Record the baseline before any change, in `backend/` and `frontend/`.
  - In `backend/`: `uv sync`, `uv run alembic heads` shows `d5a4c9462af7` as the only head, and `uv run alembic upgrade head` succeeds on the development database (port 5435). Run Ruff, mypy and pytest (with the `_test` database).
  - In `frontend/`: `npm run lint`, `npm test` and `npm run build`.
  - Note any failure that already exists, so that later tasks don't take the blame for it. Change no file.
  - **Baseline (2026-11-04)**: no failures.
    - Backend: the only head is `d5a4c9462af7`, `alembic check` finds no difference, Ruff and mypy pass (62 files), and pytest passes 1282 tests in about 4 minutes.
    - Frontend: lint has 0 problems, Vitest passes 2447 tests in 53 files, and the build passes.
    - Warnings that predate this feature: the main chunk is 620 kB, over Vite's 500 kB limit; Vite warns "ESM syntax in a file loaded as CommonJS (vite.config.ts:2:1)"; and `npm audit` reports 8 vulnerabilities in the lockfile (one high, in `zod` < 4.6.6).

---

## Phase 2: Foundational (blocking prerequisites)

**Purpose**: The two states of a form connection in the database, the API shapes on both sides,
and the published-only code paths that must never treat a draft as live. After this phase a draft
row, however it gets in, is listed with its status, refused by every published endpoint, and
answers "unavailable" at its URLs.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Backend

- [X] T002 Extend `FormConnection` in `backend/app/models.py` (research R1; data-model.md section 1).
  - New: `published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)`: "When the connection was published. **Null exactly while it is a draft**".
  - New: `draft: Mapped[dict[str, Any] | None] = mapped_column(JSONB)`: a draft's content (data-model.md section 2), "Null once published".
  - New: `draft_version: Mapped[int | None] = mapped_column(Integer)`: "1 when created, +1 on every save (FR-022, R6). Null once published".
  - Changed: `current_revision` and `current_rule_set` become `Mapped[int | None]` ("Null exactly while a draft").
  - `__table_args__` declares `CheckConstraint(..., name='ck_form_connections_draft_or_published')` with exactly this condition:
    `(published_at IS NULL AND current_revision IS NULL AND current_rule_set IS NULL AND draft IS NOT NULL AND draft_version IS NOT NULL) OR (published_at IS NOT NULL AND current_revision IS NOT NULL AND current_rule_set IS NOT NULL AND draft IS NULL AND draft_version IS NULL)`.
  - Update the class docstring and the column comments: `is_active` "stays `true` on a draft and means nothing until it is published"; `deleted_at` is for published connections only, since a draft is deleted by removing its row (R7); `next_rule_number` / `next_group_number` are also the draft's numbering (R4).
  - mypy now reports every reader of the two nullable columns. T005 and T006 fix them; this task may leave them failing only until those two tasks land in the same change set.
- [X] T003 Add the shapes of contracts/management-api.md "Schemas" to `backend/app/schemas.py` (research R2; data-model.md sections 2 and 5).
  - `ConnectionStatus = Literal['draft', 'published']` and `EditorStep = Literal['connection', 'documents', 'rules', 'test']`.
  - `FormConnectionSummary` gains `status: ConnectionStatus`, and `FormConnection` gains `status: Literal['published'] = 'published'`. Each field comment says what it means.
  - `DraftContent(BaseModel)`: `documents: list[RequestedDocument]` (may be empty, and a document may have no fields), `branches: list[BranchInput]` (main branch first, every `id` null), `step: EditorStep`. Add `DRAFT_CONTENT = TypeAdapter(DraftContent)` beside `RULE_SET_SNAPSHOT`, with a comment that the name and the serviceBW form live in their columns, and that personas, findings, the open tab and the rule editor's position are never stored.
  - `FormConnectionDraft`: `status: Literal['draft'] = 'draft'`, `id`, `name`, `servicebw_form` (`''` possible), `documents: list[RequestedDocumentView]`, `branches: list[BranchInput]`, `next_rule_number`, `next_group_number`, `step: EditorStep`, `version: int`, `created_at`, `updated_at`. It has no URLs, no `rule_set_version` and no `is_active` (FR-006, FR-007).
  - `DraftRules`: `branches: list[BranchInput]`, `numbering_base: NumberingBase`. `DraftCreate`: `name: str`, `servicebw_form: str`, `documents: list[RequestedDocument]`, `rules: DraftRules`, `step: EditorStep`. `DraftUpdate(DraftCreate)`: `version: int`, `replace: bool = False`. `DraftPublish(FormConnectionCreate)`: `version: int`, `replace: bool = False`, with a docstring that `rules.base_version` and `rules.replace` are ignored. As in specs 001 and 002, these request schemas accept empty texts and lists and incomplete rules, and the service layer checks the content.
  - `FormConnectionOrDraft = Annotated[FormConnection | FormConnectionDraft, Field(discriminator='status')]`.
  - Research R16: check that `ApiResponse[FormConnectionOrDraft]` serialises both members and that `/openapi.json` stays valid (`uv run python -c "from app.main import app; app.openapi()"`). If the generic doesn't take the annotated union, define `FormConnectionOrDraftResponse` explicitly and record why in its docstring.
- [X] T004 Create the migration `backend/alembic/versions/<rev>_connection_drafts.py` (research R15; constitution V). Depends on T002 and T003: model → schemas → migration, the order of the constitution's Development Workflow.
  - `uv run alembic revision --autogenerate -m "connection drafts"`. Its `down_revision` is `d5a4c9462af7`. Read the generated file and keep: `published_at` (nullable, with index `ix_form_connections_published_at`), `draft` (`postgresql.JSONB`, nullable), `draft_version` (integer, nullable), and `current_revision` / `current_rule_set` made nullable.
  - Add by hand, after the columns: `UPDATE form_connections SET published_at = created_at` (every existing row is published; FR-026), then `op.create_check_constraint('ck_form_connections_draft_or_published', 'form_connections', <the condition of T002>)`.
  - Downgrade, by hand, in this order: delete the revisions of drafts (`DELETE FROM form_connection_revisions WHERE form_connection_id IN (SELECT id FROM form_connections WHERE published_at IS NULL)`), delete the drafts (`DELETE FROM form_connections WHERE published_at IS NULL`), drop the constraint, drop the index and the three columns, and make `current_revision` and `current_rule_set` non-null again.
  - Write a module docstring like `d5a4c9462af7_connection_rules.py`'s: what the upgrade does and that the downgrade deletes drafts first.
  - Check: `uv run alembic upgrade head`, `uv run alembic downgrade -1`, `uv run alembic upgrade head` on the development database, then `uv run alembic check` reports no difference. After the commit, never edit this file again.
- [X] T005 Make the published-only paths of `backend/app/services/form_connections.py` and `backend/app/services/rules.py` refuse or skip drafts (research R2, R8; data-model.md "Reading the state in code"). Depends on T002, T003.
  - `NOT_PUBLISHED_DETAIL = {'error': 'not_published', 'message': 'This connection is a draft. Continue it to save or publish it.'}`. Add helpers that refuse a draft with `409` and this detail: one for reading (`find_published_form_connection`) and one under the row lock (`_lock_published_form_connection`). `update_form_connection`, `deactivate_form_connection`, `activate_form_connection` and `delete_form_connection` use them (contracts/management-api.md, the rows for `PUT`, `…/deactivate`, `…/activate`, `DELETE`).
  - `_summary()` sets `status='draft'` when `published_at is None`, and `'published'` otherwise. `_view()` sets `status='published'`. `list_form_connections()` keeps its query, so drafts are listed with the published connections, most recently updated first (FR-007, FR-011).
  - Narrow every reader of `current_revision` / `current_rule_set` that mypy reports from `int | None` to `int` behind a guard that refuses drafts. Among them: `_view()`'s `rule_set_version`, the `number > form_connection.current_revision` comparison in `create_revision()`, and `rules.current_branches()`'s `_rule_set(...)` call. Check `_current_revision()`, `rules._loaded_branches()` and `rules.check_rules_version()` too. No `# type: ignore`.
  - `resync_config()` returns `False` at once for a draft (`published_at is None`): FR-005, nothing is set up with EUDIPLO for a draft.
  - Update the module docstring: a connection is a draft until it is published, and the published paths refuse drafts.
  - Existing tests in `backend/tests/api/` must pass. Where a test compares a whole summary or view, add `'status': 'published'` to the expected value, and change nothing else.
- [X] T006 [P] Keep drafts away from the connection URLs and the worker (research R8; contracts/integration-api.md "A draft's URLs"). Depends on T002. It touches files other than T005's.
  - `backend/app/services/document_requests.py`: `_usable_form_connection()` answers `409` with the unchanged `UNAVAILABLE_DETAIL` when `form_connection.published_at is None`, in the same condition as a deleted or deactivated connection, and before anything reads a revision. Update its docstring (FR-006). The branch pull URL keeps spec 002's "Order of the checks": the draft's `409` comes at step 2, before the branch is looked at (`_check_branch`). `trigger()` narrows `current_revision` and `current_rule_set` after that check, without `# type: ignore`.
  - `backend/app/services/worker.py`: `resync_configs()` selects `FormConnection.deleted_at.is_(None)` **and** `FormConnection.published_at.is_not(None)`. Update its docstring. `delete_unused_configs()` stays as it is: on a draft, `current_revision` is null, so `revision < current_revision` never holds for a revision that a publish in flight has reserved. Say so in a comment.

### Frontend

- [X] T007 [P] Mirror the shapes of T003 in `frontend/src/types/form-connections.ts`, and add the draft API functions to `frontend/src/api/form-connections.ts` (constitution I; contracts/management-api.md). Same change set as T003.
  - Types: `ConnectionStatus`, `EditorStep` (moved here from `editor/types.ts`; `editor/types.ts` re-exports it so that existing imports keep working), `FormConnectionSummary.status`, `FormConnection.status: 'published'`, `FormConnectionDraft`, `DraftRules`, `DraftCreate`, `DraftUpdate`, `DraftPublish` and `FormConnectionOrDraft = FormConnection | FormConnectionDraft`. Use snake_case field names, field for field, each with its comment.
  - API: `createDraft(data: DraftCreate): Promise<FormConnectionDraft>` (`POST /form-connections/drafts`), `saveDraft(id, data: DraftUpdate): Promise<FormConnectionDraft>` (`PUT /form-connections/{id}/draft`), `publishDraft(id, data: DraftPublish): Promise<FormConnection>` (`POST /form-connections/{id}/publish`), `deleteDraft(id): Promise<null>` (`DELETE /form-connections/{id}/draft`), all through `apiFetch` with `encodeURIComponent(id)`. `getFormConnection(id): Promise<FormConnectionOrDraft>` changes here too, so that the frontend accepts a draft before T014 can send one (constitution I).
  - Hook and pages: in `frontend/src/hooks/types.ts`, `frontend/src/hooks/utils.ts` and `frontend/src/hooks/useFormConnection.ts`, the `loaded` state holds `FormConnectionOrDraft`; `replace` still takes a `FormConnection`. `frontend/src/pages/FormConnectionDetail/index.tsx` and `frontend/src/pages/FormConnectionEdit/index.tsx` check `status === 'published'` and show their not-found state for a draft, until T029 routes drafts.
- [X] T008 [P] Write `frontend/src/utils/localDrafts/types.ts` with the contract's interfaces, word for word (contracts/local-drafts.md "Pure modules"; data-model.md section 6): `StorageLike` (`setItem` may throw), `LocalDraftRecord` (`format: 1`, `flowKey`, `draftId: string | null`, `draftVersion: number | null`, `changedAt` as ISO 8601, `step: EditorStep`, `content`) and `LocalDraftContent` (`name`, `servicebwForm`, `documents`, `branches`, `numberingBase`, `counters`), each field with its comment. US1's "Save and exit" builds its body from `LocalDraftContent` (T021), so this file comes first. It holds no logic and has no test.

**Checkpoint**: Ruff, mypy and pytest pass with the migration applied. A row inserted as a draft is
listed with `status: 'draft'`, refused by `PUT`, `…/deactivate`, `…/activate` and `DELETE` with
`409 not_published`, and answers `409 unavailable` at its URLs. The frontend builds.

---

## Phase 3: User Story 1 - Save and exit a new connection, and continue later (Priority: P1) 🎯 MVP

**Goal**: Every step of the create flow offers "Save and exit", which stores the work as a draft
that isn't live. Any team member can continue a draft on any device at its stored step, publish it
through the existing save path, or delete it.

**Independent Test**: As in spec.md, US1. Start a new connection, enter a name, add a document
without fields, a variant without rules and a rule on data that isn't requested, and choose "Save
and exit". The overview lists the draft as a draft, and its trigger URL starts no request. Open
it in another browser as another team member: the same step and content appear. Complete it and
publish it: it is live, and serviceBW can start requests through its URLs (quickstart V1–V5).

### Backend: checks and numbering

- [X] T009 [US1] Add the `complete` switch to the rules checks in `backend/app/services/rules.py` (research R3, its table; data-model.md section 3; FR-003, FR-004).
  - `clean_rules(rules, documents, main_branch_id, *, complete: bool = True)` and `clean_branches(..., *, complete: bool = True)` pass it to `_clean_branch()`, `_branch_name()` and, through a new `complete` field of `_BranchCheck`, to `_clean_item()` and `_item_name()`. With `complete=True`, nothing changes: the same checks, the same order, the same messages.
  - Kept with `complete=False` (structure): at most 20 variants; exactly one main variant, first, with `id` equal to `main_branch_id` (None for drafts); variant name ≤ 100 and description ≤ 500 characters; ≤ 200 rules, groups and sub-groups per variant; identifiers `rule-{n}` / `group-{n}`, unique in a variant; a sub-group holds rules only; a group that isn't dissolved has at least two members (`_check_members`); marks (`_check_marks`, `_check_follows`); rule and group names ≤ 100 characters; messages ≤ 500 characters.
  - Skipped with `complete=False` (completeness): the variant name being present and unique; rule and group names being present, unique and not reserved (`reserved_name_problem`); the rule's data being chosen, requested and a valid part (`_clean_target`); the condition being present and complete for its kind (`_clean_condition`); the message being present. A draft's `target` and `condition` are stored as sent, not reduced to the operator's keys, so `_check_follows` compares them as sent. Names, descriptions and messages are still trimmed.
  - Messages that name a variant or an item whose name is empty use `Variant <n>` (its position, Standard being 1) or the item's identifier (`rule-7`), for example "The variant Variant 3 is out of step with Standard. …" and "The error message of rule-7 in Taxi can have at most 500 characters." (data-model.md "Validation").
  - Update the docstrings of `clean_rules` and `clean_branches` with what `complete=False` checks.
- [X] T010 [US1] Number drafts from the connection's counters in `backend/app/services/rules.py` (research R4; data-model.md section 4). Depends on T009 (same file).
  - `_first_numbering(save, counters: tuple[int, int] | None = None)`. With `None` it is the create path, unchanged: counters `(1, 1)`, and no identifier counts as loaded. With counters, it is the draft path: the counters are the row's, and the identifiers below `save.numbering_base` (per kind) are passed to `_allocate()` as `loaded` and `known`. Below the base they keep their number. At or above it they are new, and they shift past numbers taken meanwhile, the same way in every variant. `_check_branch_ids(save.branches, set(), {})` still refuses any branch id ("Unknown variant.").
  - `check_first_save(save, counters=None)` and `first_rule_set(db, form_connection, save, counters=None)` pass `counters` through. Without `save`, `first_rule_set` keeps the given counters (or `(1, 1)`) instead of resetting them. Its docstring says that publishing a draft passes the row's counters.
  - New `number_draft(save: RulesSave, counters: tuple[int, int]) -> DraftNumbering`: a frozen dataclass with `branches` (renumbered with `_renumber_items`, default names following their new numbers) and `next_rule_number` / `next_group_number`, each `max(counter, highest identifier + 1)` and never lower. It is used for creating (`(1, 1)`) and saving (the row's, under the lock) a draft. Give it a docstring.
- [X] T011 [P] [US1] Add the `complete` switch to the document and form checks in `backend/app/services/form_connections.py` (research R3; FR-003, FR-004). It touches a file other than T009/T010's. Depends on T005.
  - `clean_servicebw_form(value, *, complete: bool = True)`: with `complete=False`, an empty form ID is allowed (stored as `''`), and more than 500 characters is still refused with "The form ID can have at most 500 characters.".
  - `clean_documents(documents, *, complete: bool = True)`: with `complete=False`, "Add at least one document." and "Select at least one field for '…'." are skipped. Unknown document types, unknown fields, a document added twice and a field selected twice are still refused, with the same messages. A document without fields stays in the result, in catalog order.
  - `clean_name` is unchanged: a draft needs a name too.
  - Rename `_documents_view` to `documents_view` (public, with a docstring), since `drafts.py` shows a draft's documents with it. A type or field that the catalog dropped keeps its key as its label, as today.

### Backend: publishing, the drafts service and the router

- [X] T012 [US1] Add the draft guard to `create_revision()` in `backend/app/services/form_connections.py` (research R5; contracts/management-api.md "Publishing a draft, step by step"). Depends on T010, T011.
  - `DRAFT_PUBLISHED_DETAIL = {'error': 'draft_published', 'message': 'This draft has been published since you opened it.'}`.
  - `@dataclass(frozen=True) class DraftGuard` with `version: int` and `replace: bool`, and a method `check(form_connection) -> None` that raises `409` with `DRAFT_PUBLISHED_DETAIL` when `published_at is not None`. The version comparison is added in T045. It lives here, not in `drafts.py`, so that `create_revision` needs no import of `drafts`.
  - `create_revision(..., guard: DraftGuard | None = None)`:
    - under the first row lock it calls `guard.check()` before it reserves the next revision. On a draft without revisions, that is revision 1, or 2 if a concurrent attempt still holds 1;
    - after `create_config` it locks the row again (`404` if the draft was deleted meanwhile, and then the existing `_delete_unsaved_config`) and calls `guard.check()` again. A refusal takes the existing `HTTPException` path: the configuration is deleted and the revision removed;
    - with a guard, the final commit makes the revision current, writes rule set 1, the branch rows and the counters with `rules.first_rule_set(db, form_connection, save, counters=(row.next_rule_number, row.next_group_number))`, applies `changes` (the name and the serviceBW form), sets `published_at = datetime.now(tz=timezone.utc)`, and clears `draft` and `draft_version`, in that one commit.
    - Without a guard, nothing changes for published connections.
  - Extend the docstring with the draft path. The log line names the id and the revision only.
- [X] T013 [US1] Write `backend/app/services/drafts.py` (research R2–R7; contracts/management-api.md "Saving a draft", "Publishing a draft" and "Deleting a draft", step by step). Depends on T003, T009–T012.
  - Module docstring: what a draft is, the two states, that publishing goes through `form_connections.create_revision()` and no second save path, and that nothing here calls EUDIPLO except through publishing.
  - `draft_view(form_connection) -> FormConnectionDraft`: the content through `DRAFT_CONTENT.validate_python(form_connection.draft)`, the documents through `form_connections.documents_view()`, `version=form_connection.draft_version`, ISO timestamps through `to_iso_utc`.
  - `get_form_connection_or_draft(db, form_connection_id) -> FormConnection | FormConnectionDraft`: `404` for unknown or deleted, `draft_view()` for a draft, `form_connections.get_form_connection()` otherwise.
  - A private `_check_state(form_connection)`: `409 DRAFT_PUBLISHED_DETAIL` when the row is published. A missing row is `404` (`find_form_connection`, `_lock_form_connection`). T045 adds the version check.
  - `create_draft(db, data: DraftCreate) -> FormConnectionDraft`: `clean_name`, `clean_servicebw_form(complete=False)`, `clean_documents(complete=False)`, and `rules.clean_rules(RulesInput(branches=data.rules.branches, numbering_base=data.rules.numbering_base), documents, main_branch_id=None, complete=False)`, then `rules.number_draft(save, (1, 1))`. Then one insert: `published_at=None`, `current_revision=None`, `current_rule_set=None`, `draft=DRAFT_CONTENT.dump_python(DraftContent(documents=..., branches=..., step=data.step), mode='json')`, `draft_version=1`, and the counters. No EUDIPLO call, revision, rule set or branch row (FR-005). Log "Draft %s saved".
  - `save_draft(db, form_connection_id, data: DraftUpdate) -> FormConnectionDraft`, in three steps:
    1. read the row and `_check_state`, before the content is checked;
    2. the structural checks of `create_draft`, refusing with `400` before anything is written (FR-003, FR-013);
    3. `_lock_form_connection`, `_check_state` again, `rules.number_draft(save, row counters)`, then write the content, the name and the serviceBW form, raise the counters (never lower them), add 1 to `draft_version`, and commit once.
    `version` and `replace` are accepted. T045 compares them.
  - `publish_draft(db, form_connection_id, data: DraftPublish) -> FormConnection`:
    1. read the row and `_check_state`;
    2. the create path's checks, unchanged and in its order: `clean_name`, `clean_servicebw_form`, `clean_documents`, then, if `data.rules` is set, `rules.clean_rules(data.rules, documents, main_branch_id=None)` and `rules.check_first_save(save, counters=(row counters))` (FR-009);
    3. `db.rollback()`, then `form_connections.create_revision(db, form_connection_id, documents, changes={'name': …, 'servicebw_form': …}, save=save, guard=DraftGuard(data.version, data.replace))`;
    4. answer `form_connections.get_form_connection()`.
    `EudiploError` reaches the router. Log "Draft %s published".
  - `delete_draft(db, form_connection_id) -> None`: lock the row (`404` if missing), `409 DRAFT_PUBLISHED_DETAIL` if published. Otherwise delete any revision of it, which only a publish in flight can have reserved, then the row, and commit (FR-010, R7). No EUDIPLO call. Log "Draft %s deleted".
  - Every function has a docstring and full type hints. Every `HTTPException` carries an `{error, message}` detail.
- [X] T014 [US1] Add the draft endpoints to `backend/app/routers/form_connections.py` (contracts/management-api.md "Endpoints"). Depends on T013.
  - `POST /api/form-connections/drafts` (`201`, `ApiResponse[FormConnectionDraft]`, message `'Draft saved'`), `PUT /{form_connection_id}/draft` (`ApiResponse[FormConnectionDraft]`, `'Draft saved'`), `POST /{form_connection_id}/publish` (`ApiResponse[FormConnection]`, `'Form connection published'`, `EudiploError` → `http_error_for(error, CONFIG_FAILED)`), `DELETE /{form_connection_id}/draft` (`ApiResponse[None]`, `data=None`, `'Draft deleted'`). Each is a plain `def` with `dependencies=[Depends(require_json)]` and a docstring that names its refusals.
  - `GET /{form_connection_id}` answers `ApiResponse[FormConnectionOrDraft]` through `drafts.get_form_connection_or_draft()`. Update its docstring: a draft answers its content without URLs.
  - The router stays thin: no logic beyond the calls and the error mapping. `app.include_router()` in `backend/app/main.py` is unchanged, since the router already exists.

### Backend: tests

- [X] T015 [P] [US1] Write `backend/tests/unit/test_draft_validation.py` for the `complete=False` checks (research R3 table; FR-003, FR-004). Depends on T009–T011.
  - **Accepted**, each in its own test:
    - no documents;
    - a document without fields;
    - an empty form ID;
    - a rule without `target`, without `condition` or with `message: ''`;
    - a rule on data that isn't requested, with its condition kept as sent;
    - a condition whose operator doesn't fit its data;
    - a variant without rules;
    - missing or duplicate names of variants, rules and groups;
    - "Rule 03" on `rule-5`.
  - **Refused**, with the exact message:
    - an unknown document type ("Unknown document type 'x'.") or field;
    - a document added twice;
    - 21 variants;
    - two main variants;
    - a main variant that isn't first;
    - a variant with an `id` ("The rules need exactly one main branch." or "Unknown variant.", whichever the create path gives);
    - `rule-x` ("The rules contain an invalid identifier. Reload the connection and try again.");
    - a sub-group holding a group;
    - a group with one member;
    - a based variant out of step;
    - 201 items;
    - a name of 201 characters ("The name can have at most 200 characters.");
    - a form ID of 501 characters;
    - a message of 501 characters on an unnamed rule, named by its identifier.
  - **Numbering**: `number_draft` keeps identifiers below the base, shifts new ones past the counters in every variant alike, and never lowers the counters. With `counters=None`, `_first_numbering` refuses an identifier below the base as before.
- [X] T016 [US1] Write `backend/tests/api/test_form_connection_drafts.py`, part 1: the draft lifecycle (research R14; contracts/management-api.md; FR-001–FR-011, FR-027). Depends on T014.
  - Helpers at the top: `draft_body(**changes)`, `create_draft(client, **changes) -> str`, `get(client, id)`. Reuse `backend/tests/helpers.py` (`main_branch`, `variant`, `rule`, `rules_input`) for the trees.
  - **Create**: `201` with `status: 'draft'`, `version: 1`, the `step`, no `trigger_url`, `pull_url` or `is_active`. The fake EUDIPLO received no call, and no revision, rule set or branch row exists (FR-005, SC-002).
  - **Get and list**: `GET` answers `FormConnectionDraft`. `GET /api/form-connections` lists it with `status: 'draft'` among published ones, ordered by `updated_at` (FR-007). A team with only a draft lists one connection, which is what the first-connection screen counts (FR-011).
  - **Save**: `200` and `version: 2`, with name, form ID, documents, branches and step as sent (FR-002). Each FR-004 state is accepted. Each FR-003 state of quickstart V4 is refused with its message, and afterwards `GET` shows the content and the version unchanged.
  - **Numbering**: identifiers below `numbering_base` keep their numbers, and new ones shift past the row's counters. Counters never go down.
  - **Publish**: `200` and a `FormConnection` with `status: 'published'`, `trigger_url`, one pull URL per variant the draft has then, and rule set 1. The row has `published_at` set, `draft` and `draft_version` null, and EUDIPLO holds its configuration. A publish refused for completeness (no documents, a rule on data that isn't requested) gives `400` with the create path's message and leaves the draft unchanged (US1-AS7). An EUDIPLO failure (`fake_eudiplo.fail('create_config', 503)`) gives the `502`/`503` of `http_error_for` with the router's `CONFIG_FAILED` message, and the draft stays a draft without a revision.
  - **Delete**: `200` with `data: null`. The row and any reserved revision are gone, and `GET` gives `404`. Another connection's `updated_at` is unchanged (FR-010).
  - **Boundaries**: `PUT /api/form-connections/{draft}`, `…/deactivate`, `…/activate` and `DELETE /api/form-connections/{draft}` give `409 not_published` with its message. `PUT …/{published}/draft`, `POST …/{published}/publish` and `DELETE …/{published}/draft` give `409 draft_published`, and the published connection is unchanged.
  - **Auth**: without a session, each new endpoint gives `401`. Without a JSON content type, `POST`, `PUT` and `DELETE` give `415`.
- [X] T017 [US1] Add the publish parity test (SC-003, FR-009) to `backend/tests/api/test_form_connection_drafts.py`. Depends on T016 (same file).
  - One `pytest.mark.parametrize` table of `FormConnectionCreate` payloads: two valid ones (with rules and variants, and without `rules`), and one per refusal of the create path. The refusals cover a missing name, a missing form ID, no documents, a document without a field, an unknown field, a missing variant name, an unnamed rule, a rule without data, data that isn't requested, an incomplete condition, a missing message and an invalid identifier.
  - Each payload goes through `POST /api/form-connections` and through `POST /api/form-connections/drafts` (a minimal valid draft), then `POST …/{id}/publish` with the payload plus `version`. Compare the status code, `error` and `message`. For the valid ones, also compare the published shape, apart from ids, URLs' ids and timestamps: the documents, the variants, the items with their identifiers, conditions and messages, `rule_set_version: 1`, and that a trigger then answers `201`.
- [X] T018 [US1] Add the concurrency tests of research R14 to `backend/tests/api/test_form_connection_drafts.py`. Use the pattern of `test_concurrent_edits_get_distinct_revision_numbers` in `backend/tests/api/test_form_connection_maintenance.py`: monkeypatch `fake_eudiplo._create_config` and call the service functions with their own `SessionLocal()`. Depends on T017 (same file).
  - **Two publishes of one draft**, both waiting in EUDIPLO at once. One answers the `FormConnection`, the other `409 draft_published`. They reserved different revisions. The winner's configuration is still in `fake_eudiplo.configs`, unchanged (`config_hash`), and the loser's is deleted. The connection's current revision is the winner's (R5, quickstart V12).
  - **A delete during a publish**: `drafts.delete_draft` runs inside the publish's `create_config`. The publish answers `404`, the row and its revisions are gone, and the configuration it created is deleted (R7).
- [X] T019 [P] [US1] Cover the URLs of drafts and the worker (SC-002, FR-006, FR-010; research R8, R14). Depends on T014. It touches files other than T016–T018's.
  - `backend/tests/api/test_connect.py`: a draft's trigger URL and main pull URL answer `409` with exactly `UNAVAILABLE_DETAIL`. No `document_requests` row is written, and the fake EUDIPLO received no call. After `DELETE …/draft`, the trigger answers `404` "Form connection not found" and the pull URL `404` "Request not found".
  - `backend/tests/api/test_connect_branches.py`: a draft's branch pull URL answers the same `409`, for any branch id, before the branch is looked at.
  - `backend/tests/api/test_worker_requests.py`: with one published connection and one draft, `worker.resync_configs()` dispatches the published one only, and `form_connections.resync_config(db, draft_id)` returns `False` without an EUDIPLO call.

### Frontend: the editor's model

- [X] T020 [US1] Give the editor an origin and the draft-save state (research R12; data-model.md section 7; contracts/ui-screens.md "Copy").
  - `editor/types.ts`:
    - `EditorOrigin = { kind: 'new' } | { kind: 'draft'; draftId: string; draftVersion: number } | { kind: 'published'; formConnection: FormConnection }`. T038 adds `flowKey` to the first two kinds.
    - `FormConnectionEditorPageProps` replaces `formConnection?` with `origin?: EditorOrigin` (default `{ kind: 'new' }`), and gains `initialStates?: { editor: EditorState; rules: RulesState }`.
    - `EditorState` gains `savingDraft: boolean` ("Save and exit" in progress) and `draftError: DraftSaveError | null` (a refused or failed draft save, shown above the step; FR-013). `DraftSaveError = { notice: ErrorNotice; retryable: boolean }` (data-model.md section 7): the flag decides whether "Try again" shows (only for a network failure or a `5xx`; T021, S1.5).
    - `EditorAction` gains `{ type: 'saveDraft' }` and `{ type: 'saveDraftFailed'; error: DraftSaveError }`.
    - The props of this story's new and changed components, so that T023 and T024 touch only their own files: `SaveDraftAlertProps { error: DraftSaveError | null; retrying: boolean; onRetry: () => void }`, and `EditorFooterProps` gains `canSaveDraft: boolean` (origin `new` or `draft`), `savingDraft: boolean` and `onSaveAndExit: () => void`.
  - `editor/RulesStep/types.ts`: `LeaveEditorAction` gains `{ type: 'saveAndExit' }`, with a comment: "Save and exit" closes the rule editor through "Save changes to Rule 01?" first (FR-012).
  - `editor/utils.ts`, `editorReducer`:
    - `saveDraft` sets `savingDraft` and clears `draftError`;
    - `saveDraftFailed` clears `savingDraft` and sets `draftError`;
    - `goToStep` also clears `draftError`, because the alert goes when the step changes (S1.5);
    - `INITIAL_EDITOR_STATE` in `editor/constants.ts` gets `savingDraft: false` and `draftError: null`.
  - `editor/constants.ts`: a `DRAFT_COPY` object with `saveAndExit`, `saving`, `savingStatus`, `saveErrorTitle`, `saveNetworkError`, `tryAgain`, `draftBadge`, `untitled`, `noFormId`, `draftSaved(name)`, word for word from contracts/ui-screens.md "Copy".
  - `frontend/src/types/routing.ts`: `OverviewLocationState { draftSaved?: string }`, the name of the draft "Save and exit" just stored (W1). `EditLocationState.step` also accepts `'test'`, for a draft's details (T028).
  - Tests in `editor/utils.test.ts` for the three reducer cases.
- [X] T021 [US1] Write the editor's pure draft functions in `editor/utils.ts`, with tests in `editor/utils.test.ts` (contracts/local-drafts.md "The editor's own pure functions"; research R12; FR-002, FR-008). Depends on T008, T020.
  - `localContentOf(state: EditorState, rules: RulesState): LocalDraftContent`: name and form ID as typed, documents, branches as `branchInputs()` gives them, `numberingBase`, `counters`. A rule open in the rule editor counts as kept, complete or not, as `rulesReducer`'s `'saveRule'` would keep it (`rulesReducer(rules, { type: 'saveRule' })` when `rules.editing`).
  - `draftPayload(content: LocalDraftContent, step: EditorStep): DraftCreate`: name and form ID trimmed, `rules: { branches, numbering_base: content.numberingBase }`, and `step`.
  - `openingStepOf(step: EditorStep, rules: RulesState): EditorStep`: `'test'` without any rule in any variant becomes `'rules'`. Otherwise it is unchanged.
  - `initialStatesFromDraft(draft: FormConnectionDraft, step: EditorStep = draft.step): { editor: EditorState; rules: RulesState }`:
    - `editor`: the name, the form ID, and the documents as keys (`RequestedDocumentView` → `RequestedDocument`, dropped types and fields kept);
    - `rules`: the variants with the editor's keys (`MAIN_BRANCH_KEY` for the main variant, `newBranchKey()` for the others, in order), `counters` and `numberingBase` from `next_rule_number` / `next_group_number`, and `ruleSetVersion: null`;
    - the step comes from `openingStepOf`.
  - `draftNameErrors(name: string): EditorErrors`: the name part of `validateConnection` only (`{ name }` or `{}`), so "Save and exit" never asks for the form ID.
  - `draftSaveErrorOf(error: unknown): DraftSaveError` (S1.5, W3):
    - a `400`: the server's message, with `retryable: false`;
    - an `ApiError` with a status of 500 or more, or an error that isn't an `ApiError` (a network failure): U28's text, `{ message: DRAFT_COPY.saveNetworkError, error_id }` with the server's `error_id` when it sent one, and `retryable: true`. `errorNoticeOf` alone isn't enough: it shows the server's generic text for a `5xx`, and nginx's `502`/`503` carry no JSON;
    - any other status (a `404` or `409` before T050 turns them into conflicts, a `413`): the server's message through `errorNoticeOf`, with `retryable: false`.
  - Tests:
    - `localContentOf` with and without an open rule, an incomplete one included;
    - `draftPayload`'s trimming and shape;
    - `openingStepOf` for all four steps;
    - `initialStatesFromDraft` with zero, one and three variants, an empty form ID and a dropped field;
    - `draftNameErrors` for an empty name, 200 and 201 characters;
    - `draftSaveErrorOf` for a `400`, a `404`, a `500` with `error_id`, a `502` without a JSON body, and a `TypeError`.

### Frontend: the editor's screens

- [X] T022 [P] [US1] Add the "Draft" badge to `frontend/src/components/ConnectionStatusBadge/` (S0, S3, S6; FR-007; F28 badge nodes, such as U07 `6235:16742` and U11 `6348:40210`).
  - `types.ts`: an optional `draft?: boolean`. Existing callers stay unchanged.
  - `index.tsx`: with `draft`, KERN's small info badge (`variant="info"`, `withIcon`, `kern-badge--small`) with the label `STATUS_BADGE_COPY.draft` ("Draft"), so a draft is never told apart by colour alone. Extend the docstring.
  - `constants.ts`: `draft: 'Draft'`.
  - Follow `docs/FIGMA-WORKFLOW.md` on the two nodes. List the differences that only "KERN 2.8 vs Revamp" explains, and don't fix them.
- [X] T023 [P] [US1] Write `editor/SaveDraftAlert.tsx` (S1.5, W3; F23 reversed: U28 `6197:11098`). Depends on T020, which declares its props.
  - Render: a KERN danger alert titled `DRAFT_COPY.saveErrorTitle` ("Couldn’t save your draft"), with `error.notice`'s message and the error ID on its own line through `ErrorNoticeText`. A "Try again" secondary button shows only while `error.retryable`. It is `aria-disabled` while `retrying`. Nothing renders without an error.
  - The alert takes the focus when it appears (`tabIndex={-1}` and a ref focused in an effect), because an alert that refuses something takes the focus (contracts/ui-screens.md "Accessibility").
  - Follow `docs/FIGMA-WORKFLOW.md` on U28 `6197:11098` for spacing, the icon and the button.
- [X] T024 [US1] Add "Save and exit" to `editor/EditorFooter.tsx` (S0, S1, W9; FR-001; F28 "Save and exit" nodes, such as U09 `6235:18684` on the documents step and U11 `6348:40218` on the rules step, and the other steps' nodes in spec 002's F28 row). Depends on T020.
  - Use the props that T020 added to `EditorFooterProps`.
  - Place it on every step while `canSaveDraft`. It is a secondary button (`kern-btn kern-btn--secondary`), before the step's primary action, with Back on the left as today.
    - Step 1, without Back: it stands before "Continue".
    - Documents and rules steps: it stands beside "… without rules" and "Add rules →" / "Test rules →", in Figma's order and with Figma's gap.
    - Test step: it stands before "Publish".
  - It is never `disabled`. While a save runs it is `aria-disabled`, reads `DRAFT_COPY.saving` ("Saving…") and ignores clicks.
  - The published edit flow (`canSaveDraft` false) renders exactly as today (FR-026).
  - Replace the docstring's sentence "Nothing is saved until then, so the design's 'Save and exit' is left out (F28, O3)" with the new behaviour.
  - At 320 px and 200 % zoom the actions wrap as spec 004's do, and "Save and exit" keeps its label.
  - Follow `docs/FIGMA-WORKFLOW.md` on the F28 footer nodes for each step's order and spacing.
- [X] T025 [US1] Wire the origin, "Save and exit" and publishing a draft into `editor/index.tsx` (S0, S1, W1, W3, W9; FR-001, FR-008, FR-009, FR-012, FR-013, FR-026; research R12). Depends on T021–T024.
  - **Initial state**: `useReducer` starts from `initialStates` when given, and otherwise from `initialEditorState` / `initialRulesState` as today, with `origin.formConnection` for `published`. `editing` becomes `origin.kind === 'published'`. Every place that read `formConnection` reads it from the published origin.
  - **"Save and exit"**: `handleSaveAndExit = () => leaveEditor({ type: 'saveAndExit' })`. In `continueWith`, `'saveAndExit'` calls `saveDraftAndExit(current)`:
    1. With `draftNameErrors(state.name)` failing, go to step 1 (`goToStep`), then `refuse(errors)`, so the message shows under "Form name" and the field gets the focus. Nothing is stored (S1.2).
    2. Otherwise `dispatch({ type: 'saveDraft' })`, then build `draftPayload(localContentOf(state, current), state.step)`. Send it with `createDraft` (origin `new`) or with `saveDraft(origin.draftId, { ...payload, version: origin.draftVersion, replace: false })` (origin `draft`).
    3. On success, `navigate(ROUTES.overview, { state: { draftSaved: name } satisfies OverviewLocationState })`.
    4. On failure, `handleUnauthorized(error)` first. Otherwise `saveDraftFailed` with `draftSaveErrorOf(error)`: the team member stays in the flow with their work (FR-013).
  - **Unsaved rule changes**: "Save changes to Rule 01?" is asked first through `hasUnsavedChanges`, and either answer goes on with the save. Closing the dialog cancels it (FR-012). `answerSaveChanges` already passes the kept or dropped rule state on.
  - **Saving status**: `<SaveDraftAlert>` sits above the step's content, under the page title, inside the `WizardLayout` children. Its "Try again" calls `handleSaveAndExit`. A polite live region (`role="status"`) says `DRAFT_COPY.savingStatus` ("Saving draft…") while `savingDraft`.
  - **Footer**: pass `canSaveDraft={origin.kind !== 'published'}`, `savingDraft` and `onSaveAndExit`.
  - **Badge**: for origin `draft`, `WizardLayout`'s `badge` is `<ConnectionStatusBadge isActive draft />` (S0). A new connection has no badge.
  - **Publishing a draft** (`handleConfirm`): for origin `draft`, call `publishDraft(origin.draftId, { ...createPayload(state, rules), version: origin.draftVersion, replace: false })`, then navigate to the details with `{ published: true }`. Origin `new` keeps `createFormConnection`, and `published` keeps `updateFormConnection`, unchanged.
  - **Step 1's note**: it stays "Nothing goes live until you publish." (R13).
  - **Docstring**: rewrite the page's docstring. Drop "the API has no drafts", and describe the three origins and "Save and exit".
  - **Other callers**: `frontend/src/pages/FirstConnection/index.tsx` and the `/form-connections/new` route in `frontend/src/App.tsx` keep rendering the page without `origin` (default `new`). `frontend/src/pages/FormConnectionEdit/index.tsx` passes `origin={{ kind: 'published', formConnection }}` until T029.
- [X] T026 [US1] Point out data that the catalog dropped, on the documents step (S8, W10; FR-003 edge case "The catalog drops a document type or field"; research R12). Depends on T025.
  - `editor/utils.ts`: `droppedDataOf(documents: RequestedDocument[], documentTypes: DocumentType[]): DroppedData[]`, in document order. A document whose type the catalog lacks is one entry, labelled with its key, since the catalog no longer has its label. A missing field of a known document is "<document label> – <field key>". Add tests in `editor/utils.test.ts`.
  - `editor/types.ts`: `PendingRemoval` gains `{ type: 'dropped'; items: DroppedData[]; label: string }`. `removalAction()` turns it into one action that removes every dropped type and field at once. `rulesCheckingRemoval()` finds the rules that check any of it, so spec 002's removal dialog names them first. Add tests.
  - New `editor/CatalogDroppedNote.tsx`: a KERN warning alert at the top of the documents step, titled "The wallet no longer offers some data of this draft", with the list as a `ul` of a sub-component `editor/CatalogDroppedItem.tsx`, and a "Remove it" button that calls `removeOrAsk({ type: 'dropped', … })`. It shows only while `droppedDataOf` isn't empty and the catalog is loaded. Put its copy in `editor/constants.ts`.
  - `editor/DocumentsStep.tsx` renders it above the picker. The cards show only what the catalog offers, as today: check that a dropped document renders no card.
  - **Opening on another step** (S0, S8): a flow that opens elsewhere, at a stored draft's saved step or a resumed local draft's step, moves to the documents step once the catalog has loaded and dropped data exists, so that the note is seen before a save is refused.
    - `editor/utils.ts`: `stepForDroppedData(step: EditorStep, dropped: DroppedData[]): EditorStep | null` gives `'documents'` when `dropped` isn't empty and `step` is another step, and `null` otherwise. Add tests.
    - `editor/index.tsx` applies it once per opening (a ref), through `goToStep`. The note then takes the focus (`tabIndex={-1}` and a ref focused in an effect, as `SaveDraftAlert`). Moving between steps afterwards works as usual.
  - "Save and exit" and publishing are refused while dropped data remains, with the server's message in `SaveDraftAlert` or in the publish dialog. No new client check.

### Frontend: the overview, the details and the edit route

- [X] T027 [P] [US1] List drafts on the overview in `frontend/src/pages/FormConnectionList/` (S3, W1, W2; FR-007, SC-005). Depends on T007, T020, T022.
  - `constants.ts` (`LIST_COPY`): `saved(date)` ("Saved {date}"), `noFormId` ("No form ID yet"), `continue` ("Continue"), `hintWithDrafts` ("Pick up your draft or connect another form."), `draftSaved(name)` ("Draft {name} saved.").
  - `utils.ts`: `hintOf(formConnections, localDraftCount = 0)`. It gives `hintWithDrafts` while any summary has `status: 'draft'` or `localDraftCount > 0`, and otherwise the existing hint. Also `formIdLineOf(summary)` ("No form ID yet" for an empty form ID). New `utils.test.ts` covers both.
  - `FormConnectionRow.tsx`:
    - a draft shows `<ConnectionStatusBadge isActive draft />`, "Saved 4 Nov 2026" (`formatEditedDate`), and "No form ID yet" when the form ID is empty;
    - its actions are "Continue" (a `Link` to `ROUTES.editFormConnection`) and "View", each with the name in an `sr-only` span. There is no "Edit" for a draft;
    - a published row is unchanged.
  - `index.tsx`:
    - read `OverviewLocationState.draftSaved` once (`useState` initializer, as `FormConnectionDetail` reads `arrival`), then clear the router state with `navigate(location.pathname, { replace: true })`;
    - while it is set, a polite live region (`role="status"`) under the page title says "Draft <name> saved." (W1);
    - the `PageTitle` hint is `hintOf(...)` once loaded.
- [X] T028 [P] [US1] Write the details of a draft in `frontend/src/pages/FormConnectionDetail/` (S6, W2, W7; FR-006, FR-007, FR-010; research R16 "Rendering an incomplete rule"). Depends on T007, T022.
  - New `DraftDetails.tsx` (props `draft: FormConnectionDraft`), in the `WizardLayout` frame:
    - the name as the `h1` (`titleAsHeading`), the "Draft" badge, and the meta "Form ID …" or "No form ID yet";
    - `WizardProgress` with every step up to and including `draft.step` reached. A reached step navigates to `ROUTES.editFormConnection` with `{ step }` (`EditLocationState`);
    - a KERN info alert "This draft isn’t live. Its connection links appear once you publish it.";
    - no `ConnectionLinks` and no URL anywhere (FR-006);
    - the documents and rules cards (`DocumentsSummary`, `RulesSummary`) with the draft's content;
    - `DraftCard` in place of `ConnectionStatus`;
    - `DetailFooter` with "Continue" in place of "Edit documents", and "Create new connection".
  - New `DraftCard.tsx`:
    - heading "Draft" and the text "Saved 4 Nov 2026, 14:32. Continue to finish and publish it.";
    - "Continue" (primary `Link` to the edit route);
    - "Delete draft" (tertiary, with the delete icon).
    - No deactivate or reactivate (FR-007).
  - **Delete confirmation**: a `ConfirmDialog` titled "Delete this draft?", with the text "<name> will be deleted for good. It was never live, so nothing changes for serviceBW." and the buttons "Delete draft" (danger) and "Cancel".
    - Confirming calls `deleteDraft`. On success the overview opens.
    - `409 draft_published` shows the dialog's error "This draft has been published since you opened it." with "Open the connection", which reloads the details.
    - `404` says it was already deleted and leads to the overview.
    - Other failures go through `errorNoticeOf` and `ErrorNoticeText`, and a `401` through `useSignOutOnUnauthorized()`.
  - `DocumentsSummary`, `SummaryDocument` and `RulesSummary` / `SummaryBranch` / `SummaryItem` gain a `draft` prop (or accept the draft's shapes):
    - a document without fields reads "No data chosen yet", and no documents reads "No documents yet";
    - a rule without data, check or message shows the rules step's placeholders, and renders without errors;
    - no variant shows a result or pull link.
    - The published rendering is unchanged.
  - `constants.ts`: the copy above, from contracts/ui-screens.md "Copy" (`draftNotLive`, `draftCardText(date)`, `deleteDraft`, `deleteDraftTitle`, `deleteDraftText(name)`, `noFormId`, `continue`). Dates use the overview's format with the 24-hour time.
  - `utils.ts`: `reachedStepsOf(step: EditorStep): number`, `savedLineOf(updatedAt: string): string` and `deleteDraftErrorOf(error)`, with tests in `utils.test.ts`.
  - The component isn't wired yet; T029 renders it.
- [X] T029 [US1] Route drafts on the details and the edit route (S0, S5 without the restore question, S6; FR-008; research R10). Depends on T025, T028.
  - `getFormConnection` and `useFormConnection` already answer `FormConnectionOrDraft` (T007). Replace T007's not-found state for drafts on both pages, as below, and update the hook's docstring.
  - `frontend/src/pages/FormConnectionDetail/index.tsx`: a draft renders `<DraftDetails draft={…} />`, and a published connection renders `ConnectionDetails` unchanged.
  - `frontend/src/pages/FormConnectionEdit/index.tsx` and its `utils.ts`:
    - a published connection keeps today's behaviour, with `origin={{ kind: 'published', formConnection }}`;
    - a draft renders the editor with `origin={{ kind: 'draft', draftId: draft.id, draftVersion: draft.version }}` and `initialStates={initialStatesFromDraft(draft, requestedStep ?? draft.step)}`, keyed by `${id}:${attempt}`;
    - `initialStepOf()` returns `'test'` only for a draft, with a test in `FormConnectionEdit/utils.test.ts`;
    - update the page's docstring.
- [X] T030 [US1] Validate User Story 1: run `specs/005-connection-drafts/quickstart.md` V1–V5 and V13 against a running stack, with the gates of both sides green. Fix what fails in the task that owns it. FR-011 needs no code: `FirstConnection` counts the list's entries, and drafts are among them. Check it with V5.3.

**Checkpoint**: User Story 1 is fully functional. Drafts are stored, listed, continued on another
device at their step, published through `create_revision`, and deleted, and their URLs are never
live. This is the MVP.

---

## Phase 4: User Story 2 - Recover unsaved work after a crash (Priority: P2)

**Goal**: While a team member works in the create flow of a new connection or of a stored draft,
the browser keeps a local draft of the unsaved work. After a crash, a reload, a closed tab or an
expired session, the app offers to resume or discard it. Opening a stored draft with unsaved
changes offers to restore them.

**Independent Test**: As in spec.md, US2. Start a new connection with a name, documents and a
rule, don't save, kill the browser, open it again and sign in. The app offers the local draft.
Resume it, check the step and content, choose "Save and exit", and check that the overview lists
the draft and no longer offers the local draft (quickstart V6–V9).

### Pure modules (each with its test)

- [ ] T031 [P] [US2] Write `localDrafts/constants.ts` and `localDrafts/keys.ts` with `localDrafts/keys.test.ts` (contracts/local-drafts.md "Format"; research R9, R10; data-model.md section 6). Depends on T008.
  - `constants.ts`: `LOCAL_DRAFT_PREFIX = 'connection-portal:local-draft:v1:'`, `LOCAL_DRAFT_FORMAT = 1`, `LOCAL_DRAFT_MAX_AGE_MS` (30 days), `LOCAL_DRAFT_WRITE_INTERVAL_MS = 1000` and `LOCAL_DRAFT_PARAM = 'local'`, each with its reason in a comment.
  - `keys.ts`:
    - `storageKeyOf(username, flowKey)` gives `connection-portal:local-draft:v1:<username>:<flowKey>`;
    - `newFlowKey(uuid)` gives `'new-<uuid>'`, and `flowKeyOfDraft(draftId)` gives `'draft-<id>'`;
    - `isFlowKey(value)` accepts exactly those two forms (UUID-shaped);
    - `parseStorageKey(key): { username; flowKey } | null` reads a key back, for listing. A username may contain `:`, so split at the last `:`.
  - Tests: round trips, a username with `:`, rejected flow keys (empty, `new-`, `draft-`, other prefixes), and keys of other apps.
- [ ] T032 [P] [US2] Write `localDrafts/content.ts` with `localDrafts/content.test.ts` (contracts/local-drafts.md). Depends on T008 and T021: its test checks `emptyContent()` against the editor's `localContentOf`.
  - `emptyContent()`: the content of a fresh create flow. Its name and form ID are empty, it has no documents, and its branches are what `initialRulesState()` gives for a new connection: Standard, `main`, AND, no items, with numbering base and counters `{ rule: 1, group: 1 }`. Build it without importing the editor, and pin it with a test against `localContentOf(initialEditorState(...), initialRulesState())`, so that the two can't drift.
  - `sameContent(a, b)`: a structural comparison that ignores key order and treats `undefined` and a missing key alike.
  - `displayNameOf(content)`: the trimmed name, or `'Untitled connection'`.
  - Tests for each, including nested rule trees in different key order.
- [ ] T033 [US2] Write `localDrafts/format.ts` with `localDrafts/format.test.ts` (contracts/local-drafts.md "Accepted records"). Depends on T031.
  - `serializeRecord(record): string` is `JSON.stringify`.
  - `parseRecord(raw, flowKey): LocalDraftRecord | null` never throws. It returns `null` when any of these fails:
    - the JSON parses;
    - `format === LOCAL_DRAFT_FORMAT`;
    - `flowKey` equals the key's flow key and `isFlowKey`;
    - `draftId` is `string | null`, and is the id in `flowKey` for a `draft-` key and `null` for a `new-` key;
    - `draftVersion` is `number | null`;
    - `changedAt` parses as a date;
    - `step` is one of the four steps;
    - `content` has every field of `LocalDraftContent` with its type: documents as `{ document_type: string; fields: string[] }[]`, and branches with `name`, `origin` (`main` / `based` / `empty`), `operator` and `items`, each tree item with `type`, `id` and `name`, groups with `operator` and `items`, and `target` / `condition` as `object | null`. The server checks the rest on save.
  - Tests: a valid record round-trips. Each broken field gives `null`: bad JSON, another format, a mismatched flow key, a wrong type at each level, a tree item without `type`, `__proto__` keys. No input throws.
- [ ] T034 [US2] Write `localDrafts/store.ts` with `localDrafts/store.test.ts` (contracts/local-drafts.md `createLocalDraftStore`; research R9, R11; FR-015, FR-018, FR-019, FR-021). Depends on T031, T033.
  - `createLocalDraftStore(storage: StorageLike | null, now: () => Date): LocalDraftStore`, with `available` (false without storage: everything is a no-op), `list`, `read`, `write`, `remove`, `removeAll`, `close` and `reopen`, as in the contract. Every storage access is in `try/catch`, and a failing storage reads as empty (FR-021).
    - `list(username)` returns the account's valid, unexpired records, newest first. It removes expired records (`changedAt` older than `LOCAL_DRAFT_MAX_AGE_MS`) and invalid ones that carry this app's prefix for this account. It never touches other prefixes or other accounts' entries.
    - `read` validates the record, and removes it when it is invalid or expired.
    - `write` returns `false` on a quota or blocked error, and for a closed account.
    - `removeAll(username)` returns how many records it removed.
    - `close(username)` refuses the account's writes until `reopen(username)`.
  - `registerFlush(flush: () => void): () => void` and `flushPendingLocalDrafts(): void`, a module-level registry through which `UserMenu` reaches the editor's pending write (R11).
  - Tests use an in-memory `StorageLike` fake (in the test file, or `localDrafts/testStorage.ts`, imported by tests only). They cover:
    - write, then read and list, newest first;
    - two accounts kept apart;
    - expiry at 30 days, with `now` injected;
    - invalid records removed on list;
    - another app's keys left alone;
    - `setItem` throwing (`QuotaExceededError`) gives `false` and no throw;
    - a storage whose every method throws gives an empty list;
    - `null` storage gives `available: false`;
    - `close` refuses writes, and `reopen` allows them again;
    - `removeAll` counts;
    - the flush registry calls every registered flush, and unregistering works.
  - No `console.*` in any of `localDrafts/`.

### Hooks

- [ ] T035 [US2] Write `frontend/src/hooks/useLocalDraftStore.ts`, the only code that touches `window.localStorage` (contracts/local-drafts.md "Hooks"; FR-019, FR-021). Depends on T034.
  - It returns `{ store, username }`. The store is one module-level instance, created lazily from `window.localStorage` inside `try/catch` (`createLocalDraftStore(null, …)` when the storage can't be reached). Every caller therefore shares the closed accounts of `close()`.
  - `username` comes from `useCurrentUser()` (`user?.username ?? null`).
  - An effect calls `store.reopen(username)` when the account signs in (the username changes from `null`).
  - Docstring: why it is the only binding, and that an expired session never removes anything.
- [ ] T036 [P] [US2] Write `frontend/src/hooks/useLocalDraft.ts`, the editor's autosave (contracts/local-drafts.md `useLocalDraft`; research R9; FR-014, FR-015, FR-018, SC-004). Depends on T032, T035.
  - Signature: `useLocalDraft({ flowKey, draftId, draftVersion, baseline, content, step, enabled }): { flush(): void; forget(): void }`, with `baseline: LocalDraftContent | null`: what is already safe elsewhere, or `null` when the flow doesn't know it (T039; data-model.md section 6).
  - **Writing**: after the first change in the flow, while `enabled` and the content differs from the baseline (on every change with `null`), it writes the record. The first write is at once, and later ones at most once per `LOCAL_DRAFT_WRITE_INTERVAL_MS`, trailing. `changedAt` is the time of the change. Mounting writes nothing, so a resumed record keeps its time of last change.
  - **Removing**: with a baseline, it removes the record when a change brings the content back to the baseline. With `null`, only `forget()` removes it. Mounting never removes a record.
  - **Flushing**: pending writes flush on `pagehide`, on `visibilitychange` to `hidden`, and on unmount. On unmount the record stays. Research R16: `pagehide` also fires in Firefox's back-forward cache, where `unload` doesn't.
  - **Other tabs**: on a `storage` event that removes its key while this flow holds unsaved work (it has written the record and hasn't called `forget()`), it writes again at once.
  - **`forget()`**: it cancels pending writes, removes the record, and stops writing until `flowKey` changes.
  - **`flush()`**: it writes now. The hook registers it with `registerFlush` while mounted.
  - No `console.*`, no `fetch` or `apiFetch`.
- [ ] T037 [P] [US2] Write `frontend/src/hooks/useLocalDrafts.ts`, the offers' list (contracts/local-drafts.md `useLocalDrafts`; FR-016, FR-018). Depends on T035.
  - `useLocalDrafts(exceptFlowKey?: string): { drafts: LocalDraftRecord[]; discard(flowKey: string): void }`.
  - It holds `store.list(username)` without `exceptFlowKey`, and refreshes on `storage` events and after `discard`. Without a username or an available store, the list is empty.
  - No `console.*`.

### The editor and the screens

- [ ] T038 [US2] Extend the editor's model for local drafts in `editor/types.ts` and `editor/utils.ts`, with tests in `editor/utils.test.ts` (contracts/local-drafts.md "Rules for callers" 1; research R10). Depends on T021, T031.
  - `EditorOrigin`'s `new` and `draft` kinds gain `flowKey: string`. Update T025's and T029's construction sites: the edit route builds `flowKeyOfDraft(draft.id)`.
  - `initialStatesFromLocal(record: LocalDraftRecord): { editor: EditorState; rules: RulesState }`: the content, at `openingStepOf(record.step, rules)`. The variants get the editor's keys (`MAIN_BRANCH_KEY`, then `newBranchKey()`). `counters` and `numberingBase` come from the record.
  - `originOfRecord(record): EditorOrigin`: `{ kind: 'draft', draftId, draftVersion, flowKey }` when `draftId` is set, and otherwise `{ kind: 'new', flowKey }`.
  - `entryOf(param: string | null, record: LocalDraftRecord | null): { kind: 'fresh' } | { kind: 'local'; record } | { kind: 'missingDraft'; draftId: string } | { kind: 'empty'; flowKey: string }`. It decides what `/form-connections/new?local=…` opens:
    - no or invalid param: a fresh flow;
    - a record: open it;
    - a `draft-<id>` key without a record: go to the draft's edit route;
    - a `new-` key without a record: start empty under that key.
  - Tests for each branch and for both origins of a record.
- [ ] T039 [US2] Wire local drafts into `editor/index.tsx` (S0, S1; FR-014, FR-017, FR-018; research R10, R16). Depends on T036, T038.
  - **Origin and flow key**:
    - On the `new` routes (`/form-connections/new` and `/get-started`), read `?local=` once with `useSearchParams` in a `useState` initializer, read the record through `useLocalDraftStore`, and apply `entryOf`.
    - A record opens with `initialStatesFromLocal` and `originOfRecord`. `missingDraft` navigates to `generatePath(ROUTES.editFormConnection, { id })` with `replace`.
    - A fresh flow gets `newFlowKey(crypto.randomUUID())` and writes it into the URL with `setSearchParams({ local: flowKey }, { replace: true })`, without remounting (R16: check that the editor keeps its state and that no history entry is added).
    - The origin lives in state, since a resumed `draft-<id>` record turns the `new` route into a draft flow.
  - **Baseline** (data-model.md section 6): what is already safe elsewhere, so that the local draft holds only unsaved work. It is computed once, in a `useState` initializer:
    - `emptyContent()` for a new connection, fresh or resumed from a `new-` record;
    - `null` for a `draft-` record resumed through `?local=`, since R10 opens it without reading the stored draft;
    - on the edit route of a stored draft, the stored draft as loaded: `localContentOf` of the initial states, or the new prop `baseline?: LocalDraftContent` of `FormConnectionEditorPageProps` when T042's "Restore changes" opens the editor with the record's content.
    - Never the record's own content. That copy exists only on the device, so a change that is undone after resuming would delete the only copy.
  - **Autosave**: call `useLocalDraft` with `enabled` for origins `new` and `draft` only, never `published` (FR-014). Its `content` is `localContentOf(state, rules)`, memoised on `state` and `rules`.
  - **Forget**: after a successful "Save and exit" and after a successful publish, call `forget()` before navigating (FR-018). A failed save keeps the record (FR-013).
  - **Badge**: a resumed `draft-` record shows the "Draft" badge.
  - **First-connection screen**: `/get-started` uses the same logic, so a reload or the sign-in round trip returns into the flow (R10).
  - Update the page's docstring: local drafts and the `?local=` parameter.
- [ ] T040 [P] [US2] Write `frontend/src/components/LocalDraftsOffer/` (S4, W5; FR-016, FR-018, FR-021; SC-004, SC-005). Depends on T032, T037.
  - `index.tsx`: `LocalDraftsOffer({ exceptFlowKey?: string })`. It uses `useLocalDrafts(exceptFlowKey)`, and renders nothing while the list is empty or the storage is unavailable.
  - **Section**: an `h2` "Unsaved work on this device" with the text "These changes weren’t saved. Resume to go on, or discard them.", then a `ul` of `LocalDraftItem`.
  - **`LocalDraftItem.tsx`**:
    - the name through `displayNameOf` ("Untitled connection" when it has none);
    - the line "New connection · Last change 4 Nov 2026, 14:32" or "Draft · Last change …";
    - "Resume", a `Link` to `${ROUTES.newFormConnection}?local=<flowKey>` with KERN button classes;
    - "Discard", a button.
    - Both carry the name in an `sr-only` span.
  - **Discard**: a `ConfirmDialog` titled "Discard unsaved work?", with the text "The unsaved changes to <name> will be deleted from this device. This can’t be undone." plus, for a stored draft, "The saved draft stays as it is.". The buttons are "Discard" (danger) and "Cancel". After discarding:
    - the item goes;
    - a polite status says "Unsaved work discarded.";
    - the focus moves to the next item's "Resume", or else to the section's heading (`tabIndex={-1}`).
  - **Sibling files**: `constants.ts` (the copy of contracts/ui-screens.md "Copy": `localTitle`, `localText`, `localNew(date)`, `localDraft(date)`, `resume`, `discard`, `discardTitle`, `discardText(name)`, `discarded`, `untitled`), `types.ts`, and `utils.ts` with `metaLineOf(record)` and `formatChangedAt(iso)` (the overview's date format with the 24-hour time, in the browser's time zone) and `utils.test.ts`.
  - No `console.*`.
- [ ] T041 [US2] Offer local drafts on the overview and the first-connection screen (S3, S4; FR-016; US2-AS1, AS5). Depends on T027, T039, T040.
  - `frontend/src/pages/FormConnectionList/index.tsx`: `<LocalDraftsOffer />` above the connections list, also while the list is loading, empty or failed. The hint becomes `hintOf(formConnections, drafts.length)`, through `useLocalDrafts()`.
  - `editor/index.tsx`: when `firstConnection` and on step 1, render `<LocalDraftsOffer exceptFlowKey={flowKey} />` above step 1's card, so the flow's own local draft isn't offered.
  - `frontend/src/pages/FirstConnection/index.tsx`: its docstring mentions the offer. Its check that drafts count as connections is unchanged.
- [ ] T042 [US2] Ask to restore a stored draft's unsaved changes on the edit route (S5, W6; FR-016, US2-AS6; contracts/local-drafts.md "Rules for callers" 2 and 3). Depends on T039.
  - `frontend/src/pages/FormConnectionEdit/utils.ts`: `restoreChoiceOf(record: LocalDraftRecord | null, draft: FormConnectionDraft): 'none' | 'ask' | 'same'`. It compares `record.content` with `localContentOf(initialStatesFromDraft(draft))` through `sameContent`. Add tests in `utils.test.ts`.
  - New `frontend/src/pages/FormConnectionEdit/RestoreDialog.tsx`, in the wizard frame with the "Draft" badge, before the editor mounts. It is a native modal dialog with the focus inside:
    - title "Restore your unsaved changes?";
    - text "This device has changes to <name> from 4 Nov 2026, 14:32 that weren’t saved.";
    - "Restore changes" (primary) opens the editor with `initialStatesFromLocal(record)`, the origin at `record.draftVersion`, so a save meets US3's conflict if the draft has changed since, and `baseline` set to the stored draft as loaded (T039);
    - "Discard them" (secondary) removes the record and opens the stored draft;
    - Escape (the dialog's `cancel` event) navigates to the draft's details (`generatePath(ROUTES.formConnection, { id })`, with `replace`) and keeps the record, which is offered again next time. The editor doesn't mount, so its autosave can't write over the kept record (S5).
  - `frontend/src/pages/FormConnectionEdit/index.tsx`:
    - for a draft, read the record of `flowKeyOfDraft(id)`. `'ask'` shows the dialog, `'same'` removes the record silently, and `'none'` opens the editor;
    - for a published connection, remove any `draft-<id>` record (rule 3).
    - Keep the copy in a sibling `constants.ts`.
- [ ] T043 [P] [US2] Warn before logging out with local drafts in `frontend/src/components/UserMenu/` (S7, W8; FR-019; research R11). Depends on T035.
  - `index.tsx`, `handleSignOut`:
    1. call `flushPendingLocalDrafts()`;
    2. read `store.list(username)`. Without records, sign out at once, as today;
    3. with records, close the menu and open `SignOutDialog`;
    4. on confirm, `store.removeAll(username)`, `store.close(username)`, then `await signOut()`;
    5. "Cancel" returns the focus to the menu button (`triggerRef`).
    `CurrentUserProvider.signOut()` stays unchanged, so an expired session never removes records.
  - New `SignOutDialog.tsx`, `ConfirmDialog`-based:
    - title "Log out and discard unsaved work?";
    - text "Logging out deletes the unsaved changes on this device to: <names>. Saved drafts stay as they are.";
    - "Log out" (danger) and "Cancel".
  - `utils.ts`: `signOutNamesOf(records)` joins at most 5 display names as "a, b and c", then "and 3 more". Add tests in a new `utils.test.ts`, with 0, 1, 2, 5 and 8 records and untitled ones. The copy goes in `constants.ts`.
  - No `console.*`.
- [ ] T044 [US2] Validate User Story 2: run `specs/005-connection-drafts/quickstart.md` V6–V9, with the gates of the frontend green. Fix what fails in the task that owns it.

**Checkpoint**: User Stories 1 and 2 work. Unsaved work in the create flow survives a crash, a
reload, a closed tab and an expired session. It is offered only to its account and discarded at
sign-out after the warning.

---

## Phase 5: User Story 3 - Two team members working on one draft (Priority: P3)

**Goal**: A save or publish of a draft that another team member saved, published or deleted since
it was opened is refused before anything is stored. The team member then chooses between
"Reload" and "Replace their changes", or "Open the connection", or "Save as new draft".

**Independent Test**: As in spec.md, US3. Open the same draft in two browsers. Save the name in
the first, and change a rule and save in the second. The second save is refused with "Reload" /
"Replace their changes". "Reload" shows the first's name, and "Replace their changes" stores the
second's version whole (quickstart V10–V12).

### Backend

- [ ] T045 [US3] Compare draft versions in `backend/app/services/drafts.py` and `DraftGuard.check()` in `backend/app/services/form_connections.py` (research R6; FR-022–FR-024; contracts/management-api.md "Errors"). Depends on T013.
  - `DRAFT_CHANGED_DETAIL = {'error': 'draft_changed', 'message': 'Another team member saved this draft after you opened it.'}`. The message names no variant, since no variant of a draft has a pull URL.
  - `_check_state(form_connection, version, replace)`: `409 draft_published` first, even with `replace` (FR-023), then `409 draft_changed` when `version != form_connection.draft_version` and not `replace`. `save_draft` and `publish_draft` call it in step 1, before the content is checked, so a stale editor meets the conflict and not a refusal that its staleness causes. `save_draft` calls it again under the lock.
  - `DraftGuard.check()` does the same comparison under both of `create_revision()`'s locks. A refusal there deletes the configuration and removes the revision, as T012 set up.
  - A deleted draft keeps answering `404 Not found`, which the editor turns into "This draft has been deleted since you opened it." (FR-024).
  - Update the docstrings.
- [ ] T046 [US3] Test the conflicts in `backend/tests/api/test_form_connection_drafts.py` (research R14; SC-006). Depends on T045.
  - **Save with an outdated version**: `409 draft_changed` with its message, and nothing is stored (content, version and counters unchanged). The same with `replace: true` stores the whole draft and adds 1 to the version. The first team member's next save of their old version meets the same `409` (US3-AS3).
  - **Publish with an outdated version**: `409 draft_changed` before validation. Content that would also be refused for completeness still gives `draft_changed`, not `400`. With `replace: true`, it publishes.
  - **Published since**: save and publish give `409 draft_published`, also with `replace: true`, and the published connection is unchanged (FR-023).
  - **Deleted since**: save and publish give `404`.
  - **A save during a publish** (concurrency, the T018 pattern): `drafts.save_draft` runs inside the publish's `create_config`. The publish answers `409 draft_changed`, its configuration is deleted, its revision removed, and the draft keeps the saved content as a draft. With `replace: true` on the publish, it publishes.

### Frontend

- [ ] T047 [US3] Add the editor's conflict model in `editor/types.ts`, `editor/utils.ts` and `editor/constants.ts`, with tests in `editor/utils.test.ts` (data-model.md section 7; contracts/local-drafts.md `conflictOf`). Depends on T020.
  - `DraftConflict = { kind: 'draft_changed' | 'draft_published' | 'draft_deleted'; during: 'save' | 'publish'; message: string }`. `EditorState` gains `conflict: DraftConflict | null`. `EditorAction` gains `{ type: 'draftConflict'; conflict }` (it also clears `savingDraft` and `publishing`) and `{ type: 'closeConflict' }`. `rulesChanged` stays for the published edit flow.
  - `conflictOf(error: unknown, origin: EditorOrigin, during: 'save' | 'publish'): DraftConflict | null` gives:
    - `409` with `error: 'draft_changed'` or `'draft_published'` → that kind, with the server's message;
    - `404` while `origin.kind === 'draft'` → `draft_deleted`;
    - anything else, or a published or new origin → `null`.
  - The props, so that T048 and T049 touch only their component files: `DraftConflictDialogProps { conflict: DraftConflict | null; busy: boolean; onReload; onReplace; onOpenConnection; onSaveAsNew; onCancel }`, and `PublishDialogProps` gains `conflict: DraftConflict | null`, `onOpenConnection` and `onSaveAsNew`. Pass `conflict={null}` and no-op handlers from `editor/index.tsx` until T050 wires them, so that the build passes.
  - `DRAFT_COPY` gains `draftChangedTitle`, `draftChangedHint`, `draftPublishedTitle`, `draftPublishedHint`, `draftDeletedTitle`, `draftDeletedText`, `reload`, `replaceTheirChanges`, `openConnection`, `saveAsNewDraft`, `cancel`, word for word from contracts/ui-screens.md "Copy".
  - Tests: every branch of `conflictOf`, and the two reducer cases.
- [ ] T048 [P] [US3] Write `editor/DraftConflictDialog.tsx`, the conflict dialog after "Save and exit" (S2, W4; FR-022–FR-024). Depends on T047.
  - `ConfirmDialog`-based, with the props that T047 declared.
  - Per kind, as in the S2 table:
    - `draft_changed`: title "This draft has changed", the server's message, then the hint, and the buttons "Reload" (secondary), "Replace their changes" (primary) and "Cancel" (tertiary);
    - `draft_published`: title "This draft has been published", the message and its hint, and "Open the connection" (primary) and "Cancel";
    - `draft_deleted`: title "This draft has been deleted", the text "This draft has been deleted since you opened it. Save your work as a new draft to keep it.", and "Save as new draft" (primary) and "Cancel".
  - It is a native modal with the focus inside. Escape is "Cancel", and the focus returns to "Save and exit".
- [ ] T049 [P] [US3] Show draft conflicts in `editor/PublishDialog.tsx` (S2, W4; as spec 002's W9 for `rules_changed`). Depends on T047.
  - Use the props that T047 added to `PublishDialogProps`.
  - With a `conflict`, the dialog shows its message and buttons in place of "Publish", as it does for `rulesChanged`. In `draft_changed`, "Replace their changes" publishes (`onReplace`).
  - Without a conflict, the dialog is unchanged.
- [ ] T050 [US3] Wire the conflicts into `editor/index.tsx` and `frontend/src/pages/FormConnectionEdit/index.tsx` (S2; FR-022–FR-024; research R6; contracts/local-drafts.md "Rules for callers" 3). Depends on T039, T048, T049.
  - A failed "Save and exit" or publish first tries `conflictOf(error, origin, during)`. A conflict dispatches `draftConflict`, and otherwise the existing handling applies.
  - **"Replace their changes"** resends the same request with `replace: true`: `saveDraft` for a save, `publishDraft` for a publish. If it meets another conflict, that conflict shows (US3-AS3).
  - **"Reload"**:
    - call `forget()`;
    - on the edit route, the page's `onReload` refetches the draft (`retry()`) and opens a new editor at the draft's stored step (`initialStatesFromDraft(draft)`), with `reloaded` moving the focus to the page title;
    - on `/form-connections/new?local=draft-<id>`, navigate to the edit route with `replace`.
  - **"Open the connection"** calls `forget()` and navigates to the published connection's details.
  - **"Save as new draft"** calls `createDraft(draftPayload(localContentOf(state, rules), state.step))`, then `forget()` on the old flow key, then continues as S1's success: the overview with "Draft <name> saved.".
  - **"Cancel"** closes the dialog and keeps the team member in the flow with their work, so the local draft keeps it.
  - On the edit route, `FormConnectionEditPage.handleReload` keeps today's published behaviour. For a draft, it opens at the stored step instead of `'rules'`.
- [ ] T051 [US3] Validate User Story 3: run `specs/005-connection-drafts/quickstart.md` V10–V12 with two browsers and two accounts, with the gates of both sides green. Fix what fails in the task that owns it.

**Checkpoint**: All three stories work. No save of a draft silently replaces another's (SC-006).

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: The documentation checklist, the privacy and structure checks, accessibility, and the
final gates.

- [ ] T052 [P] Update `docs/ARCHITECTURE.md` (plan "Rules for /speckit-tasks", last bullet; CLAUDE.md "Documentation checklist").
  - Section "Form connections":
    - drafts and the two states (`published_at`, `draft`, `draft_version`, the CHECK constraint);
    - the draft endpoints and their refusals (`not_published`, `draft_published`, `draft_changed`);
    - publishing through `create_revision()` with `DraftGuard`;
    - the `complete` switch of the checks, and deleting a draft by removing its row.
  - "Rules and branches (spec 002)": drafts number from the row's counters, with identifiers below `numbering_base` counting as loaded.
  - "serviceBW's connection URLs": a draft answers `409 unavailable`, and a deleted draft `404`.
  - "Background worker": re-sync skips drafts.
  - Line 203 ("nothing reaches the API before Publish"): correct it, since "Save and exit" stores a draft.
  - Add a section "Local drafts (spec 005)":
    - the storage key and the format;
    - the pure modules and the one binding hook;
    - the `?local=` parameter;
    - the autosave throttle and the flushes;
    - expiry, account scope and the sign-out discard;
    - the known limit of R11;
    - "never holds personas, findings or citizen data".
- [ ] T053 [P] Add one-line rules to `CLAUDE.md`, each pointing to `docs/ARCHITECTURE.md` (plan "Rules for /speckit-tasks"): "drafts are never live: their URLs answer `409 unavailable` and they set nothing up with EUDIPLO"; "publishing a draft goes through `create_revision()` with a `DraftGuard`, never a second save path"; "only `hooks/useLocalDraftStore.ts` touches `localStorage`"; "local drafts never hold personas, findings or citizen data, and nothing in `utils/localDrafts/` or its hooks logs". Keep the file's style: a short bullet under a new "Drafts and local drafts (spec 005)" heading, or added to "Rules, rule checks and test personas".
- [ ] T054 [P] Mark the superseded decisions (contracts/ui-screens.md "Superseded decisions"; plan "Constitution Check", Workflow).
  - Add a "Superseded by spec 005 (connection drafts) for the create flow" note to:
    - `specs/001-servicebw-eudi-middleware/design-notes.md` §6 ("Create") and §8, where it says there are no drafts and no "Save and exit";
    - `specs/002-connection-rules/contracts/ui-screens.md`, rows F28 and F23;
    - `specs/004-rule-test-personas/contracts/ui-screens.md`, row O3.
  - Never delete the old text.
  - `README.md` lists no form-connection endpoints, so it needs no change. Confirm that and record it in the commit message. No new dependency or environment variable exists, so `.env.example` files are unchanged.
- [ ] T055 Check the privacy and structure rules by search, and fix any hit (FR-015, FR-020; plan "Rules for /speckit-tasks").
  - `grep -rn "console\." frontend/src/utils/localDrafts frontend/src/hooks/useLocalDraft*.ts frontend/src/components/LocalDraftsOffer frontend/src/components/UserMenu` finds nothing.
  - `grep -rn "localStorage" frontend/src --include=*.ts --include=*.tsx` finds only `hooks/useLocalDraftStore.ts`.
  - `grep -rn "fetch\|apiFetch" frontend/src/utils/localDrafts frontend/src/hooks/useLocalDraft*.ts` finds nothing.
  - No `dark:`, no `focus:` (only `focus-visible:`), no inline `style=` and no `any` in the new frontend files.
  - The backend's new log lines carry ids only: `grep -n "logger\." backend/app/services/drafts.py`.
- [ ] T056 Check accessibility: run `specs/005-connection-drafts/quickstart.md` V14 (FR-028, SC-008).
  - Use the keyboard only, a screen reader (NVDA + Firefox or VoiceOver + Safari), 320 px width and 200 % zoom, on: "Save and exit" and "Saving…", the badge, the offer, the restore question, the conflict dialogs, the draft details, the delete confirmation and the sign-out warning.
  - Run axe DevTools on: the overview with drafts and an offer, a draft's details, and the create flow of a stored draft.
  - Fix every WCAG 2.1 AA finding in the task's files, and record the run in the commit message.
- [ ] T057 Run the final gates and the full quickstart.
  - Backend: `uv run ruff check .`, `uv run ruff format --check .`, `uv run mypy app/ scripts/ tests/`, pytest with the `_test` database, and `uv run alembic check`.
  - Frontend: `npm run lint`, `npm test`, `npm run build`.
  - Then `specs/005-connection-drafts/quickstart.md` V1–V14, once, end to end. Compare with T001's baseline: no new failure.

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (Phase 1)**: no dependencies.
- **Foundational (Phase 2)**: after Setup. **Blocks every story.** T002 → T003 → T004 (model → schemas → migration, the constitution's order), and T002 + T003 → T005. T006 needs T002 only. T007 goes with T003 (contract parity), and T008 is independent.
- **US1 (Phase 3)**: after Foundational. The MVP.
- **US2 (Phase 4)**: after US1. Its "Save and exit" from a resumed flow, the draft's restore question and its `?local=draft-<id>` entries need US1's editor origin (T025), its pure functions (T021) and the draft routes (T029). T031, T033, T034, T035 and T037 can start right after Foundational. T032, and T036 after it, also need US1's T021.
- **US3 (Phase 5)**: after US1. Its backend (T045, T046) needs only T013. Its frontend wiring (T050) also calls US2's `forget()` (T039) on "Reload", "Open the connection" and "Save as new draft". If US3 is built before US2, leave those calls out and add them with T039.
- **Polish (Phase 6)**: after the stories it documents.

### Within US1

- Backend: T009 → T010 (same file). T011 runs in parallel with T009/T010. Then T012 → T013 → T014. Then T015 [P], T016 → T017 → T018 (same file), and T019 [P].
- Frontend: T020 → T021. T022 runs in parallel with T020/T021. T023 and T024 need T020, and then run in parallel with T021. T025 needs T021–T024. T026 needs T025. T027 and T028 run in parallel once T020 and T022 are done. T029 needs T025 and T028. T030 comes last.
- The frontend's pure tasks (T020–T024, T027, T028) need no backend. T025's save, and everything after it, needs T014 to be tried in a browser.

### Within US2

- T031 and T032 (after T021) run in parallel → T033 → T034 → T035. Then T036 and T037 run in parallel. T038 needs T021 and T031. T039 needs T036 and T038. T040 runs in parallel after T032 and T037. T041 needs T027, T039 and T040. T042 needs T039. T043 runs in parallel after T035. T044 comes last.

### Within US3

- T045 → T046. T047, then T048 and T049 in parallel. T050 needs T039, T048 and T049. T051 comes last.

---

## Parallel Example: User Story 1

```bash
# Backend checks in two files at once:
Task: "T009 [US1] complete switch in backend/app/services/rules.py"
Task: "T011 [US1] complete switch in backend/app/services/form_connections.py"

# Frontend pieces that touch separate files:
Task: "T022 [US1] Draft badge in frontend/src/components/ConnectionStatusBadge/"
Task: "T023 [US1] SaveDraftAlert in frontend/src/pages/FormConnectionEditor/SaveDraftAlert.tsx"
Task: "T027 [US1] Draft rows in frontend/src/pages/FormConnectionList/"
Task: "T028 [US1] DraftDetails in frontend/src/pages/FormConnectionDetail/"

# Tests in separate files, once T014 is done:
Task: "T015 [US1] backend/tests/unit/test_draft_validation.py"
Task: "T019 [US1] backend/tests/api/test_connect.py, test_connect_branches.py, test_worker_requests.py"
```

## Parallel Example: User Story 2

```bash
Task: "T031 [US2] localDrafts/constants.ts + keys.ts + keys.test.ts"
Task: "T032 [US2] localDrafts/content.ts + content.test.ts"
# after T035:
Task: "T036 [US2] hooks/useLocalDraft.ts"
Task: "T037 [US2] hooks/useLocalDrafts.ts"
Task: "T043 [US2] UserMenu sign-out warning"
```

## Parallel Example: User Story 3

```bash
# The backend and the frontend model don't touch each other:
Task: "T045 [US3] version check in backend/app/services/drafts.py"
Task: "T047 [US3] conflict model in frontend/src/pages/FormConnectionEditor/"
# after T047:
Task: "T048 [US3] DraftConflictDialog.tsx"
```

---

## Implementation Strategy

### MVP first (User Story 1 only)

1. Phase 1: Setup (T001).
2. Phase 2: Foundational (T002–T008). It is critical, because it blocks every story.
3. Phase 3: User Story 1 (T009–T030).
4. **Stop and validate**: quickstart V1–V5 and V13. Drafts can be stored, continued, published and deleted, and published connections are unchanged.
5. Deploy or demo. Without US3, a later save of a draft wins silently, as the name of a published connection does today, and a draft published or deleted meanwhile shows the server's message in the save alert, without the conflict dialog. Say so if the MVP ships alone.

### Incremental delivery

1. Setup + Foundational: the database and the API shapes are ready, and drafts can't leak into published paths.
2. US1: "Save and exit", drafts, publishing, deleting (MVP).
3. US2: crash recovery through local drafts.
4. US3: the conflict of two team members on one draft.
5. Polish: the documentation, accessibility and the final gates.

### Notes

- [P] tasks touch different files and depend on no unfinished task.
- Commit after each task or logical group, with the gates of the side it touches green.
- The migration (T004) is reviewed by hand and never edited after its commit.
- Stop at any checkpoint to validate a story on its own.
