---

description: "Task list for spec 006: optional connection description in place of the form ID"
---

# Tasks: Optional Connection Description in Place of the Form ID

**Input**: Design documents from `/specs/006-connection-description/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md) (R1–R7),
[data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: Included. The plan names them: pytest for the API paths, Vitest (the gate) for the
editor's validation, the list helper and `utils/localDrafts/`. Within each story, write the tests
first and see them fail.

**Organization**: Phase 2 renames `servicebw_form` / `servicebwForm` to `description` through
every layer **without changing behaviour** (the field stays required on publish, the screens still
say "Form ID"), so that every gate stays green. The stories then change behaviour: US1 makes the
field optional, US2 changes how it is shown, US3 retires the old local drafts.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

## Path Conventions

Web application: `backend/` (FastAPI, run commands in `backend/`) and `frontend/src/` (React, run
commands in `frontend/`). Line numbers below are from the checkout of 2026-11-05 and only help to
find the place.

---

## Phase 1: Setup (Baseline)

**Purpose**: Make sure later failures belong to this change. No dependency, setting or
environment variable is added (plan, constitution IV).

- [X] T001 Confirm the backend baseline in `backend/`: `uv run alembic heads` prints exactly `d2b97ba4a2c7` (the new migration's `down_revision`), and `uv run ruff check . && uv run mypy app/ scripts/ tests/` and `DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5435/template_db_test uv run pytest` pass
- [X] T002 [P] Confirm the frontend baseline in `frontend/`: `npm run lint && npm test && npm run build` pass

---

## Phase 2: Foundational (the rename, behaviour unchanged)

**Purpose**: The value is called `description` in the database, the API, the types, the editor's
state and the local draft content (FR-008), in one change on both sides (constitution I). Messages,
copy, requiredness and the local draft format number stay as they are; US1–US3 change them.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Backend

- [X] T003 Rename the column attribute in `backend/app/models.py` (line 106): `servicebw_form: Mapped[str] = mapped_column(String(500))` becomes `description: Mapped[str] = mapped_column(String(500))`. Keep "`String(500)`, NOT NULL", no index and no unique constraint ("several connections may share a description", data-model §1)
- [X] T004 Create the migration `backend/alembic/versions/<rev>_connection_description.py` with `uv run alembic revision --autogenerate -m "connection description"` (depends on T003), then, before committing, replace autogenerate's drop and add by a rename (R1): `down_revision = 'd2b97ba4a2c7'`; `upgrade()` is `op.alter_column('form_connections', 'servicebw_form', new_column_name='description')`; `downgrade()` is `op.alter_column('form_connections', 'description', new_column_name='servicebw_form')`. No backfill, no type or nullability change: every value carries over byte for byte (FR-007). Run `uv run alembic upgrade head` and `uv run alembic downgrade -1 && uv run alembic upgrade head` against the dev database to check both directions
- [X] T005 [P] Rename `servicebw_form` to `description` in the six schemas of `backend/app/schemas.py` (`FormConnectionSummary`, `FormConnection`, `FormConnectionCreate`, `FormConnectionUpdate`, `FormConnectionDraft`, `DraftCreate`; lines 317–421), keeping each field's type and default for now (US1's T025 changes them), and change the comment at line 306 ("…name and the serviceBW form live in their columns") to say "description". Keep no alias (R3)
- [X] T006 Rename in `backend/app/services/form_connections.py` (depends on T003, T005): `SERVICEBW_FORM_MAX_LENGTH` → `DESCRIPTION_MAX_LENGTH` (still `500`); `clean_servicebw_form` → `clean_description`, keeping its `complete` switch and messages for now (US1's T023 replaces it); `_view()` and `_summary()` (`description=form_connection.description`); `create_form_connection()` (`description = clean_description(data.description)`, `FormConnection(description=…)`); `update_form_connection()` (`if 'description' in changed: changes['description'] = clean_description(data.description)`); and the docstrings at lines 715 and 732 ("the name and the description create no revision")
- [X] T007 Rename in `backend/app/services/drafts.py` (depends on T006): `draft_view()` (line 71), `_clean_draft()` and its docstring (lines 137–153; returns "the name, the description, …"), `create_draft()` (line 180), `save_draft()` and its docstring (lines 199, 224), and `publish_draft()` (line 263 and `changes={'name': name, 'description': description}` at line 282)
- [X] T008 [P] Change the docstring of the `PUT` handler in `backend/app/routers/form_connections.py` (line 143) to "Change a form connection's name, description, documents or rules."
- [X] T009 [P] Rename the field in the backend fixtures that only pass it along: `backend/tests/helpers.py` (line 17, `'description': 'FS-20417'`), `backend/tests/unit/test_identifiers.py` (lines 71, 386), `backend/tests/unit/test_rules_validation.py` (line 1092) and `backend/tests/api/test_form_connection_maintenance.py` (lines 219, 225)
- [X] T010 [P] Rename the field and the function in `backend/tests/api/test_form_connections.py`, `backend/tests/api/test_form_connection_drafts.py` and `backend/tests/unit/test_draft_validation.py` (`servicebw_form` → `description`, `clean_servicebw_form` → `clean_description`), keeping every case and message as it is; US1 (T019–T021) rewrites the cases whose behaviour changes

### Frontend

- [X] T011 Rename `servicebw_form` to `description` in the six interfaces of `frontend/src/types/form-connections.ts` (`FormConnectionSummary`, `FormConnection`, `FormConnectionCreate`, `FormConnectionUpdate`, `FormConnectionDraft`, `DraftCreate`), keeping each field's optionality for now (US1's T026 changes the create bodies)
- [X] T012 [P] Rename `servicebwForm` to `description` in the local draft content: `LocalDraftContent` in `frontend/src/utils/localDrafts/types.ts` (line 45, "as typed, untrimmed"), `emptyContent()` and its comment in `frontend/src/utils/localDrafts/content.ts` (lines 10, 16), and the content check in `frontend/src/utils/localDrafts/format.ts` (lines 98–111: `typeof description !== 'string'`). Keep `LOCAL_DRAFT_FORMAT = 1` and `format: 1` for now (US3's T041 bumps them)
- [X] T013 Rename the editor's identifiers in `frontend/src/pages/FormConnectionEditor/types.ts` and `frontend/src/pages/FormConnectionEditor/constants.ts` (data-model §4): `EditorErrors.servicebwForm` → `description`; `EditorState.servicebwForm` → `description`; action `{ type: 'changeServicebwForm' }` → `{ type: 'changeDescription'; value: string }`; `ConnectionStepProps.servicebwForm` / `onChangeServicebwForm` → `description` / `onChangeDescription`; `SERVICEBW_FORM_MAX_LENGTH` → `DESCRIPTION_MAX_LENGTH` (`500`); `ELEMENT_IDS.servicebwForm = 'connection-form-id'` → `ELEMENT_IDS.description = 'connection-description'`; the initial state's `servicebwForm: ''` (line 229) → `description: ''`. Leave `EDITOR_COPY` and `VALIDATION_MESSAGES` for US1
- [X] T014 Rename through `frontend/src/pages/FormConnectionEditor/utils.ts` (depends on T011–T013): the state from a published connection (line 76), the reducer case `changeDescription` (lines 308–312, clearing `errors.description`), `validateConnection(name, description)` writing `errors.description` (lines 471–484, messages unchanged for now), the error checks and `firstInvalidElementId` (lines 511, 524 → `ELEMENT_IDS.description`), `createPayload` (line 658, `description: state.description.trim()`), `localContentOf` (line 730), `draftPayload` (line 742), `initialStatesFromDraft` (line 773), `initialStatesFromLocal` (line 795), and the comments at lines 722, 738 and 758 ("the name and the description")
- [X] T015 Rename the props in `frontend/src/pages/FormConnectionEditor/ConnectionStep.tsx` (`description`, `onChangeDescription`, `id={ELEMENT_IDS.description}`, `maxLength={DESCRIPTION_MAX_LENGTH}`, `error={errors.description}`) and their use in `frontend/src/pages/FormConnectionEditor/index.tsx` (lines 333, 857, 860: `validateConnection(state.name, state.description)`, `description={state.description}`, `dispatch({ type: 'changeDescription', value })`). Keep the label, tooltip and placeholder for US1 (depends on T013, T014)
- [X] T016 [P] Read the renamed field where it is shown, without changing what is shown: `summary.description` in `frontend/src/pages/FormConnectionList/utils.ts` (`formIdLineOf`, lines 30–34), `formConnection.description` in `frontend/src/pages/FormConnectionDetail/ConnectionDetails.tsx` (line 93) and `draft.description` in `frontend/src/pages/FormConnectionDetail/DraftDetails.tsx` (line 85). US2 changes the display
- [X] T017 [P] Rename the field in the frontend test fixtures, keeping every expectation: `frontend/src/pages/FormConnectionEditor/utils.test.ts`, `frontend/src/pages/FormConnectionEdit/utils.test.ts` (including the case label `['the form ID', …]` → `['the description', { description: 'PT-2' }]`), `frontend/src/pages/FormConnectionDetail/utils.test.ts` (line 46), `frontend/src/pages/FormConnectionList/utils.test.ts` (line 11), `frontend/src/hooks/utils.test.ts` (line 173), `frontend/src/utils/localDrafts/content.test.ts`, `frontend/src/utils/localDrafts/format.test.ts` and `frontend/src/utils/localDrafts/store.test.ts` (`servicebwForm` → `description`, `servicebw_form` → `description`, "form ID" → "description" in test names)
- [X] T018 Checkpoint: in `backend/`, `uv run ruff check --fix . && uv run ruff format . && uv run mypy app/ scripts/ tests/` and pytest (the suite runs the new migration through `alembic upgrade head`); in `frontend/`, `npm run lint && npm test && npm run build`. All pass with today's behaviour

**Checkpoint**: The value is `description` everywhere; the app behaves as before.

---

## Phase 3: User Story 1 - Create and publish a connection without a description (Priority: P1) 🎯 MVP

**Goal**: An empty description blocks nothing: step 1's "Continue", saving a draft, publishing and
saving a published connection (FR-002). More than 500 characters is refused with one message on
every path (FR-003). Step 1 offers "Description - Optional" with the new help text (FR-004).

**Independent Test**: Create a connection with only a name, publish it, and check that its URLs
work (quickstart V1); a 501-character description is refused with "The description can have at
most 500 characters." (V3).

### Tests for User Story 1 ⚠️

> Write these first and see them fail against Phase 2's code.

- [X] T019 [P] [US1] Rewrite and add the API cases in `backend/tests/api/test_form_connections.py`: `POST /api/form-connections` without `description` answers 201 with `"description": ""`; `"   "` is stored as `''` (edge case "Only spaces"); the cases expecting `'Enter the form ID.'` (lines 478, 740) now expect success; `'x' * 501` answers 400 `Validation error`, `The description can have at most 500 characters.` on create and on `PUT`; `PUT` with `"description": null` and with `""` clears it, and without the field leaves it unchanged; a body with a 201-character name and a 501-character description answers with the name's message (contracts/management-api.md, "checked after the name"); and in `test_renaming_changes_only_what_is_sent_and_creates_no_revision` (line 700), clearing a description creates no revision, no rule set and no EUDIPLO call (`fake_eudiplo.calls` unchanged) and keeps `trigger_url` and `pull_url` (FR-010, US1-AS3)
- [X] T020 [P] [US1] Rewrite and add the draft cases in `backend/tests/api/test_form_connection_drafts.py`: creating and saving a draft without `description` stores `''`; publishing a complete draft with an empty description succeeds (the `'missing form ID'` param at line 1111 expecting `'Enter the form ID.'` becomes a success case, US1-AS2); a 501-character description answers 400 `The description can have at most 500 characters.` on save (line 564) and on publish; rename the param id `'no form ID'` (line 375) to `'no description'`
- [X] T021 [P] [US1] Rewrite the unit cases in `backend/tests/unit/test_draft_validation.py` for `clean_description(value)` without `complete=`: `None`, `''` and `'  \n'` give `''`; `' FS-1 '` gives `'FS-1'`; 500 characters are accepted; 501 characters raise 400 with `The description can have at most 500 characters.` (line 431)
- [X] T022 [P] [US1] Add a `describe('validateConnection (FR-002, FR-003)')` block in `frontend/src/pages/FormConnectionEditor/utils.test.ts`: a name with an empty or space-only description gives `{}`; 500 characters give `{}`; 501 characters give `{ description: 'The description can have at most 500 characters.' }`, and `firstInvalidElementId` of that answer is `'connection-description'`; a missing name still gives the name's error first. Rename the `draftNameErrors` case "never asks for the form ID" (line 1286) to "never asks for a description"

### Implementation for User Story 1

- [X] T023 [US1] Replace the switch with one check in `backend/app/services/form_connections.py` (R2): `clean_description(value: str | None) -> str` trims, returns `''` for `None`, empty or space-only input, and raises `_validation_error(f'The description can have at most {DESCRIPTION_MAX_LENGTH} characters.')` for more than `DESCRIPTION_MAX_LENGTH` code points (`len`); no `complete` parameter and no "required" message. Docstring: optional free text of 0–500 characters, a note for the team that nothing reads. Update the calls in `create_form_connection()` and `update_form_connection()`
- [X] T024 [US1] Call `form_connections.clean_description(data.description)` without `complete=` in `_clean_draft()` and `publish_draft()` in `backend/app/services/drafts.py` (depends on T023)
- [X] T025 [P] [US1] Set the defaults in `backend/app/schemas.py` (R3): `FormConnectionCreate.description: str = ''` and `DraftCreate.description: str = ''` (`DraftUpdate` and `DraftPublish` inherit them; check that they do); `FormConnectionUpdate.description: str | None = None` with a docstring line "absent leaves it unchanged; null or '' clears it"; answers keep `description: str`
- [X] T026 [P] [US1] Mirror the defaults in `frontend/src/types/form-connections.ts`: `description?: string` in `FormConnectionCreate`, `FormConnectionUpdate` and `DraftCreate`; `description: string` in the answers
- [X] T027 [P] [US1] Add an `optional?: boolean` prop to `frontend/src/components/TextField/types.ts` (doc comment: "Marks the field as optional after its label, as KERN does") and render it in `frontend/src/components/TextField/index.tsx` inside the `<label>`, after the label text and a space: `<span className="kern-label__optional">{OPTIONAL_MARKER}</span>`, with `OPTIONAL_MARKER = '- Optional'` in a new `frontend/src/components/TextField/constants.ts` (the text of `RULES_COPY.optional` in `RulesStep/VariantDialog.tsx`). Check that the marker looks as it does in `VariantDialog`, whose label has `kern-label`; if KERN only styles it inside `.kern-label`, reproduce the look with Tailwind classes (`docs/KERN-DESIGN-SYSTEM.md`). The input's accessible name becomes "Description - Optional"
- [X] T028 [US1] Update the copy in `frontend/src/pages/FormConnectionEditor/constants.ts` (contracts/ui-screens.md, R7): replace `formIdLabel`, `formIdPlaceholder`, `formIdInfoLabel` and `formIdInfo` with `descriptionLabel: 'Description'`, `descriptionPlaceholder: 'e.g. serviceBW form PK-30051'`, `descriptionInfoLabel: 'About the description'` and `descriptionInfo: 'A note for your team, such as the form’s ID in your form management system. Applicants never see it.'` (typographic apostrophe, as the rest of `EDITOR_COPY`); remove the unused `EDITOR_COPY.noFormId` (line 81); in `VALIDATION_MESSAGES`, remove `servicebwFormRequired` and replace `servicebwFormTooLong` with ``descriptionTooLong: `The description can have at most ${DESCRIPTION_MAX_LENGTH} characters.` `` (the server's message word for word)
- [X] T029 [US1] Drop the required case from `validateConnection` in `frontend/src/pages/FormConnectionEditor/utils.ts` (lines 471–484): trim, and set `errors.description = VALIDATION_MESSAGES.descriptionTooLong` only when the trimmed text is longer than `DESCRIPTION_MAX_LENGTH`; update its doc comment ("Step 1: the name, required, and the optional description, with the API's rules and messages") and the comment of `draftNameErrors` (line 945), which no longer has a form ID to skip (depends on T028)
- [X] T030 [US1] Change the field in `frontend/src/pages/FormConnectionEditor/ConnectionStep.tsx` (lines 68–86): `label={EDITOR_COPY.descriptionLabel}`, `optional`, the `InfoTooltip` with `descriptionInfoLabel` / `descriptionInfo` (`arrow="end"` as now), `placeholder={EDITOR_COPY.descriptionPlaceholder}`; remove `required` and `spellCheck={false}`; keep `maxLength={DESCRIPTION_MAX_LENGTH}`, `autoComplete="off"`, the single-line input and the `md:w-320` wrapper (depends on T027, T028)
- [X] T031 [US1] Checkpoint: backend gates (ruff, mypy, pytest) and frontend gates (`npm run lint && npm test && npm run build`) pass, and T019–T022 now pass

**Checkpoint**: A connection without a description can be created, saved as a draft and published.

---

## Phase 4: User Story 2 - See the description in the overview and the details (Priority: P1)

**Goal**: The overview row and the details header show the description as written, with no
prefix, on one line cut with "…", and nothing when it is empty (FR-005, FR-006, SC-003, SC-004).

**Independent Test**: Three connections with a short, an empty and a 500-character description;
the overview and each details page at 320, 768, 1024 and 1440px (quickstart V4).

### Tests for User Story 2 ⚠️

- [X] T032 [P] [US2] Replace the `formIdLineOf` cases in `frontend/src/pages/FormConnectionList/utils.test.ts` (lines 38–46) with `describe('descriptionOf (FR-005)')`: it returns the description as written for a published connection and a draft (`'12345'`, no "Form ID" prefix), and `null` for `''`, published or draft

### Implementation for User Story 2

- [X] T033 [US2] Replace `formIdLineOf` with `descriptionOf(summary: FormConnectionSummary): string | null` (the description, or `null` when it is `''`) in `frontend/src/pages/FormConnectionList/utils.ts`, and remove `LIST_COPY.formId` and `LIST_COPY.noFormId` from `frontend/src/pages/FormConnectionList/constants.ts` (lines 16, 21)
- [X] T034 [US2] Show the line only when there is a description in `frontend/src/pages/FormConnectionList/FormConnectionRow.tsx`: `const description = descriptionOf(formConnection)` and `{description && <p className={`${SMALL_TEXT} text-kern-layout-text-muted truncate`}>{description}</p>}`, keeping `truncate` and no `title` attribute; update the component's doc comment ("name and description", no "No form ID yet") (depends on T033)
- [X] T035 [P] [US2] Show the description as the details header's meta: `meta={formConnection.description || undefined}` in `frontend/src/pages/FormConnectionDetail/ConnectionDetails.tsx` (line 93) and `meta={draft.description || undefined}` in `frontend/src/pages/FormConnectionDetail/DraftDetails.tsx` (line 85, and its doc comment at line 29); remove `DETAIL_COPY.formId` and `DETAIL_COPY.noFormId` from `frontend/src/pages/FormConnectionDetail/constants.ts` (lines 7, 70)
- [X] T036 [P] [US2] Cut the meta to one line at every width in `frontend/src/components/TopBar/index.tsx` (R6): give the meta `<p>` its own classes instead of `SMALL_TEXT` (whose `wrap-break-word` stays for the title): below `lg`, `min-w-0 truncate` on the second row; on `lg`, `lg:flex-1 lg:min-w-96 lg:text-right`, so that it takes only the space the title, badge and menu leave and a long description never shortens the title; hide the spacer (`order-2 … flex-1` div) on `lg` while there is a meta. No `title` attribute and no tooltip. Update the component's doc comment (the meta is the description, cut with "…" at every width; the title still wraps below `lg`, decision 2026-10-19) and the `meta` comment in `frontend/src/components/TopBar/types.ts` ("such as the connection's description; one line, cut with '…'")
- [X] T037 [US2] Check the layout in the running app (the `run` skill, or Playwright): the overview and both details pages (published and draft) at 320, 768, 1024 and 1440px with a 500-character description and a 200-character name: one line ending in "…" in the row and the header, the name not shortened by the description on `lg`, no horizontal scroll, nothing shown for an empty description, and the whole text in the accessibility tree (depends on T034–T036)
- [X] T038 [US2] Checkpoint: `npm run lint && npm test && npm run build` pass

**Checkpoint**: The team sees the descriptions it enters; no screen says "Form ID".

---

## Phase 5: User Story 3 - Existing form IDs become descriptions (Priority: P2)

**Goal**: Former form IDs carry over as descriptions (FR-007, done by T004's rename), and local
drafts saved before the update are never offered and are removed, not converted (FR-009, R5).

**Independent Test**: Quickstart V5: with a published connection `PK-30051`, a stored draft
`FS-20417` and a local draft saved before the update, apply the migration, sign in, and open the
overview.

### Tests for User Story 3 ⚠️

- [ ] T039 [P] [US3] In `frontend/src/utils/localDrafts/format.test.ts`: change the fixtures to `format: 2` (lines 37, 76) so that a format-2 record with `description` round-trips; extend "rejects another format" (line 173) with a format-1 record holding `servicebwForm` instead of `description`; add that a format-2 record with `servicebwForm` and no `description` is refused; keep "a description that is not text" in the content cases (line 285)
- [ ] T040 [P] [US3] In `frontend/src/utils/localDrafts/store.test.ts`: change the fixture to `format: 2` (line 21), and add under `describe('invalid records')` that `list()` skips and removes a format-1 entry with `servicebwForm` under the account's key, and that `read()` gives `null` and removes it
- [ ] T041 [P] [US3] In `frontend/src/utils/localDrafts/content.test.ts`: assert `emptyContent().description === ''` (line 117), and that `sameContent` notices a changed description (line 218, "notices a changed name, description, numbering base or counter")

### Implementation for User Story 3

- [ ] T042 [US3] Bump the format (R5): `LOCAL_DRAFT_FORMAT = 2` in `frontend/src/utils/localDrafts/constants.ts`, with its comment saying that format 1 held the form ID and is removed, not converted (spec 006, FR-009); `format: 2` in `LocalDraftRecord` in `frontend/src/utils/localDrafts/types.ts` (line 24). Keep `LOCAL_DRAFT_PREFIX = 'connection-portal:local-draft:v1:'`: a new prefix would leave the old entries unread and never removed
- [ ] T043 [P] [US3] Change the remaining local draft fixtures from `format: 1` to `format: 2`: `frontend/src/pages/FormConnectionEditor/utils.test.ts` (line 1033), `frontend/src/pages/FormConnectionEdit/utils.test.ts` (lines 141, 214), `frontend/src/components/LocalDraftsOffer/utils.test.ts` (line 27) and `frontend/src/components/UserMenu/utils.test.ts` (line 10)
- [ ] T044 [US3] Checkpoint: `npm run lint && npm test && npm run build` pass, and T039–T041 pass

**Checkpoint**: Old local drafts are dropped; stored drafts and connections keep their values.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T045 [P] Update `docs/ARCHITECTURE.md`: line 346 ("The name and the description create no revision"); line 361 (a draft's description may be `''`, now like a published connection's); lines 386–388 (remove `clean_servicebw_form` from the `complete` switch's list and "a form ID" from what completeness checks; `clean_description` runs the same on every path); line 398 (publishing applies the name and the description); lines 645–647 (local drafts: `format: 2`, content "name, description, documents, …"; format-1 records are removed); line 888 (replace the column example `servicebw_form` with an existing one, such as `published_at`)
- [ ] T046 [P] Search for leftovers from the repository root: `grep -rn -i "servicebw_\?form\|formid\|form id" backend/app backend/tests frontend/src docs`. Only the committed migrations and this feature's migration may still name the old column (FR-008, SC-003)
- [ ] T047 Run the backend gates in `backend/`: `uv run ruff check --fix . && uv run ruff format .`, `uv run mypy app/ scripts/ tests/`, and `DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5435/template_db_test uv run pytest`
- [ ] T048 Run the frontend gates in `frontend/`: `npm run format`, then `npm run lint && npm test && npm run build`
- [ ] T049 Walk through the manual scenarios V1–V6 of `specs/006-connection-description/quickstart.md` (V5 needs a database at `d2b97ba4a2c7` with `PK-30051`, `FS-20417` and a local draft made on a checkout without this change), and note any deviation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: none.
- **Foundational (Phase 2)**: depends on Setup; blocks every story, since every layer must carry
  `description` before any behaviour changes.
- **US1 (Phase 3)**, **US2 (Phase 4)**, **US3 (Phase 5)**: each depends only on Phase 2. They
  touch different files except `frontend/src/pages/FormConnectionEditor/utils.test.ts` (T022 in
  US1, T043 in US3) and `frontend/src/types/form-connections.ts` (T026 only), so they can run in
  parallel with care on that test file, or in the order P1 → P1 → P2.
- **Polish (Phase 6)**: after the stories you ship.

### Within Phase 2

- Backend: T003 → T004; T003 + T005 → T006 → T007; T008, T009, T010 in parallel with them.
- Frontend: T011, T012, T013 in parallel → T014 → T015; T016 after T011; T017 in parallel.
- T018 last.

### Within Each Story

- Tests first (T019–T022, T032, T039–T041), and they fail.
- US1: T023 → T024; T025, T026, T027 in parallel; T028 → T029; T027 + T028 → T030; T031 last.
- US2: T033 → T034; T035 and T036 in parallel; T037 after T034–T036; T038 last.
- US3: T042 and T043 after the tests; T044 last.

---

## Parallel Example: Phase 2

```text
Task: "T005 Rename the field in the six schemas of backend/app/schemas.py"
Task: "T008 Docstring of the PUT handler in backend/app/routers/form_connections.py"
Task: "T009 Rename the field in backend/tests/helpers.py and the fixtures that pass it along"
Task: "T010 Rename in test_form_connections.py, test_form_connection_drafts.py, test_draft_validation.py"
Task: "T011 Rename the field in frontend/src/types/form-connections.ts"
Task: "T012 Rename servicebwForm in frontend/src/utils/localDrafts/{types,content,format}.ts"
Task: "T017 Rename the field in the frontend test fixtures"
```

## Parallel Example: User Story 1

```text
# Tests together:
Task: "T019 API cases in backend/tests/api/test_form_connections.py"
Task: "T020 Draft cases in backend/tests/api/test_form_connection_drafts.py"
Task: "T021 Unit cases in backend/tests/unit/test_draft_validation.py"
Task: "T022 validateConnection cases in frontend/src/pages/FormConnectionEditor/utils.test.ts"

# Then, in parallel with the services (T023 → T024):
Task: "T025 Defaults in backend/app/schemas.py"
Task: "T026 Optional create bodies in frontend/src/types/form-connections.ts"
Task: "T027 optional prop in frontend/src/components/TextField/"
```

## Parallel Example: User Story 2

```text
Task: "T035 Details meta in FormConnectionDetail/{ConnectionDetails,DraftDetails}.tsx"
Task: "T036 One-line meta in frontend/src/components/TopBar/"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 and Phase 2: the rename, with every gate green.
2. Phase 3: the description is optional everywhere, and step 1 says so.
3. **Stop and validate**: quickstart V1 and V3. The overview and the details still show
   "Form ID …" until US2, which is acceptable for an internal checkpoint but not for a release.

### Incremental Delivery

1. Setup + Foundational → the rename.
2. US1 → nothing blocks on an empty description (MVP).
3. US2 → the description is shown without "Form ID" (release together with US1: SC-003).
4. US3 → old local drafts are dropped.
5. Polish → docs, leftover search, gates, V1–V6.

All three stories ship in one release with the migration: the frontend and backend are released
together (R3).

---

## Notes

- [P] tasks touch different files and depend on no unfinished task.
- Never log the description (constitution, Logging), as the form ID never was.
- Don't edit committed migrations; T004's file is edited only before it is committed (R1).
- Specs 001 and 005 stay as written (spec, "Supersedes").
- Commit after each task or logical group.
