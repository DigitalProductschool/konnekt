---

description: "Task list for rules for form connections, with groups and branches"
---

# Tasks: Rules for Form Connections, with Groups and Branches

**Input**: Design documents from `/specs/002-connection-rules/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: Included because the plan asks for them: plan.md "Testing", research R12, quickstart §2.
- The frontend's tests (Vitest) are a merge gate (constitution v1.1.0). Each task that writes a module
  of `frontend/src/utils/rules/` writes its `*.test.ts` with it.
- The evaluator's unit tests come with it (plan "Rules for /speckit-tasks").
- The other backend tests follow each story's implementation, as in spec 001. Backend pytest is a
  practice, not a gate.

**Organization**: Tasks are grouped by user story, so that each story can be implemented and
tested as an increment.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel, because it touches different files and depends on no unfinished
  task in the same phase.
- **[Story]**: Which user story the task belongs to (US1 to US4).
- Every description names the exact files.

## Path Conventions

- **Backend**: `backend/app/`, with routers in `backend/app/routers/`, domain logic in
  `backend/app/services/`, and tests in `backend/tests/`.
- **Frontend**: `frontend/src/`, using `api/`, `components/`, `hooks/`, `pages/`, `types/` and
  `utils/`. The pure rules logic lives in `frontend/src/utils/rules/`, the Rules step in
  `frontend/src/pages/FormConnectionEditor/RulesStep/`, and the rule editor in
  `RulesStep/RuleEditor/`.
- **Rules**: constitution v1.1.0 applies to every task.
  - Sync SQLAlchemy `Session`, with `select()`, `db.get()` and `db.scalars()`, and plain `def` handlers.
  - Errors as `HTTPException` with an `{'error', 'message'}` detail.
  - `{data, message?}` response envelopes.
  - No transaction held while EUDIPLO answers.
  - `logging`, never `print()`.
  - No inline styles, no `any`, `useReducer` for related state, list items as sub-components, and
    sibling `types.ts`, `constants.ts` and `utils.ts`.
- **Personal data**: no claims, request references, field values, evaluations or error messages
  for citizens in any log (FR-017).
- **Frontend gate**: from T001 on, every frontend task passes `npm run lint`, `npm test` and
  `npm run build`.
- **UI tasks**: spec.md decides behaviour and wording; Figma decides layout and styling only.
  - Every UI task cites its screen (S0–S7) and the F# and W# items it covers, from
    [contracts/ui-screens.md](contracts/ui-screens.md) "Deviations from Figma" (research R13).
  - It follows CLAUDE.md's "Figma implementation workflow" (file `s8mU9oJDq3411e8bxMjQO9`, root
    `6263:12360`) on the units and node-ids it names: node discovery through `figma-node-finder`;
    `get_design_context` and `get_screenshot` per node; exact values; then the numeric and visual
    checks.
  - The visual-verification table lists a difference that a cited item prescribes, with its item
    number, instead of fixing it.
  - The copy the decisions leave open comes from `design-notes.md` (T002).
  - The UI says "connection" for form connection and "variant" for branch, and calls the main
    branch "Standard" until it is renamed.

---

## Phase 1: Setup (test runner and design groundwork)

**Purpose**: Install the frontend's test runner before any other frontend task (constitution
v1.1.0), and settle the copy and tokens that the UI tasks need.

- [X] T001 Install Vitest as the frontend's test runner and apply the documentation checklist (plan "Rules for /speckit-tasks"; constitution v1.1.0, III; research R12, R14):
  - check which Vitest release supports Vite 8 (its peer dependency on `vite`), then add it as a development dependency in `frontend/package.json` and `frontend/package-lock.json` (`npm install --save-dev vitest@<version>`), and add the script `"test": "vitest run"`;
  - in `frontend/vite.config.ts`, add a `test` block with `environment: 'node'`, typed by `/// <reference types="vitest/config" />` at the top of the file;
  - add no `frontend/vitest.config.ts`, no jsdom and no DOM testing library;
  - write the first test, `frontend/src/pages/FormConnectionEdit/utils.test.ts`, because `vitest run` fails without a test file:
    - it tests `initialStepOf`: `{ step: 'documents' }` gives `'documents'`; `null`, `undefined`, `{}` and any other step give `'connection'`;
    - it imports `describe`, `it` and `expect` from `vitest` (no globals);
  - check that `npm run build` (`tsc -b`) type-checks the `*.test.ts` files and the `test` block, and that `npm run lint`, `npm test` and `npm run build` pass;
  - documentation:
    - add `npm test` ("Run the unit tests once, without watching") to the frontend command tables of `CLAUDE.md` and `README.md`;
    - describe Vitest in `README.md`, with why it was added: the frontend's pure logic, such as the rules' propagation between variants, runs only in the browser, and its tests in Node are a quality gate (constitution v1.1.0).
- [X] T002 [P] Write `specs/002-connection-rules/design-notes.md`, the copy that the decisions leave to the design notes (S2–S7; F7, F14, F27, F32, W3, W8, W9; plan "Rules for /speckit-tasks"; research R13).
  - Use the format of `specs/001-servicebw-eudi-middleware/design-notes.md`.
  - Read the frames with `get_design_context` and `get_screenshot` (file `s8mU9oJDq3411e8bxMjQO9`). Where Figma has no copy, propose some and mark it as proposed.
  - The notes cover:
    - the Rules step's label in the progress bar (U11 `6348:40209`);
    - F7: the label of the text conditions' letter-case checkbox, such as "Match letter case", and how a saved statement shows whether letter case counts (FR-005);
    - F14: the body of Standard's delete confirmation, starting from the proposed copy in contracts/ui-screens.md (S4, F14). It includes the sentence for a group that dissolves in a variant that changed it;
    - W3: the missing and duplicate variant name messages ("Enter a name for the variant."; proposed: "Another variant is already called Ambulance."), the variant delete confirmation, and the Edit variant dialog's title and buttons;
    - W8: "Delete Group 01?" with a body saying that its rules are deleted with it, its buttons, and the toasts "Group 01 in Standard ungrouped." and "Group 01 in Standard deleted.";
    - W9: the save dialog's heading and body when another team member saved the rules, and its actions "Reload" and "Replace their changes";
    - F27: whether the message of "Edit this live connection?" (U38 `6396:48909`) moves to the save confirmation, and its words;
    - S5: the publish and save dialog's rules summary per variant (U33 `6376:26181`), including a variant without rules;
    - FYI #20: one footer wording for the document menu (U11 `6348:40237` against U12 `6350:41316`);
    - F32 (research R6, R14): the licence classes AM, A1, A2, A, B1, B, BE, C1, C1E, C, CE, D1, D1E, D, DE, L and T, each with the description that U12 `6350:42145` and U24 `6191:42191` show, such as "B Cars up to 3.5 t". Add a description for every class that the frames don't show.
- [X] T003 Map the Figma variables to the project's tokens, once (CLAUDE.md "Figma implementation workflow", step 2). It runs after T002, since both write `specs/002-connection-rules/design-notes.md`:
  - call `get_variable_defs` on the root `6263:12360`, and map every variable to an existing token of `frontend/src/index.css` (KERN's Tailwind theme and the `@theme` block);
  - record the mapping in a "Tokens" section of design-notes.md. Include the colours of the variant marks "Changed here" (U17 `6134:9009`), "New addition" (U17 `6134:9064`) and "Removed" (U18 `6163:5856`), and of the group frames (U14 `6094:6413`);
  - list every value without a matching token, and ask the user before adding any to `@theme`. Don't invent tokens.

---

## Phase 2: Foundational (blocking prerequisites)

**Purpose**: Store rule sets and branches, give the catalog its kinds of value, and define the
shapes that every story reads and writes. After this phase, every form connection, old and new,
has a main branch "Standard" without rules, and the API returns it (FR-018).

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Storage and catalog (backend)

- [X] T004 Add the models to `backend/app/models.py`, following data-model.md and constitution V: `Mapped` and `mapped_column`, UUID4 `String(36)` keys, and `created_at` and `updated_at` as `DateTime(timezone=True)` with `server_default=func.now()`.
  - `FormConnectionBranch` (`form_connection_branches`), the branch identity:
    - `id`: "`String(36)` PK"; "UUID4, set when the branch is first saved. Part of the branch's pull URL, so it never changes (FR-025). Never reused";
    - `form_connection_id`: "FK → `form_connections.id`, indexed";
    - `is_main`: "`Boolean`"; "Exactly one main branch per form connection: partial unique index on `form_connection_id` `WHERE is_main`";
    - `deleted_at`: "`DateTime(timezone=True)`, nullable"; "Set when a save leaves the branch out. Its pull URL then answers `409 unavailable` for good (FR-027). The main branch can't be deleted".
  - `FormConnectionRuleSet` (`form_connection_rule_sets`):
    - `id`: "`String(36)` PK", UUID4;
    - `form_connection_id`: "FK → `form_connections.id`, indexed";
    - `version`: "`Integer`"; "Starts at 1. Unique together with `form_connection_id`";
    - `branches`: "`JSONB`"; "every branch that isn't deleted, main branch first. Never changed after insert".
  - New columns on `FormConnection`:
    - `current_rule_set`: "`Integer`, not null". It is the rule set version that new requests use, set together with `current_revision` when both change;
    - `next_rule_number` and `next_group_number`: "`Integer`, default 1". They are never lowered, and groups and sub-groups share the second.
  - New column on `DocumentRequest`: `rule_set_id`, "FK → `form_connection_rule_sets.id`, nullable, indexed". It is empty only for requests triggered before this feature.
  - The indexes of data-model.md "Indexes":
    - unique `(form_connection_id, version)` on rule sets;
    - `(form_connection_id)` and the partial unique `(form_connection_id) WHERE is_main` on branches;
    - `(rule_set_id)` on requests.
  - Update the models' docstrings.
- [X] T005 Create the migration (depends on T004 and T008, since the constitution's order is model, schemas, migration; constitution V; data-model.md "Migration"; research R11).
  - Run `cd backend && uv run alembic revision --autogenerate -m "connection rules"`. It writes `backend/alembic/versions/<rev>_connection_rules.py`, after `9a22d4b976f8`.
  - Read the file and complete it by hand, in this order:
    1. create `form_connection_branches` and `form_connection_rule_sets` with the indexes of T004, and check that the partial unique index carries `postgresql_where`;
    2. add `form_connections.next_rule_number` and `next_group_number` with server default 1, and add `current_rule_set` as nullable;
    3. for every form connection, insert a main branch row (a new UUID4, with `is_main` true) and rule set 1. Its snapshot has only that branch: `[{"id": <branch id>, "name": "Standard", "description": null, "origin": "main", "operator": "and", "operator_mark": null, "items": []}]`. Then set `current_rule_set = 1`;
    4. make `current_rule_set` not null;
    5. add `document_requests.rule_set_id`, nullable, with its index.
  - The downgrade drops them in reverse.
  - Check `uv run alembic upgrade head`, then `downgrade -1` and `upgrade head` again, on a database with an existing form connection.
  - Committed migrations stay unchanged.
- [X] T006 [P] Create `backend/app/option_sets.py` with the value sets of enum fields and parts (research R6). It depends on T002 for the licence class descriptions, and imports nothing from `app.config`.
  - Each set is a list of options with a `value`, a `label` and an optional `description`.
  - The sets, by key:
    - `countries`: the ISO 3166-1 alpha-2 codes with their English short names, as a static list (no new dependency such as `pycountry`);
    - `sex`: the codes of ISO/IEC 5218 and of the PID rulebook, as integers. **Verify** them against the PID rulebook v1.7 (research R14);
    - `licence_classes`: AM, A1, A2, A, B1, B, BE, C1, C1E, C, CE, D1, D1E, D and DE (ISO/IEC 18013-5, Directive 2006/126/EC), plus Germany's L and T, each with its description from design-notes.md (F32);
    - `eye_colours` and `hair_colours`: the values of ISO/IEC 18013-5.
- [X] T007 Give every catalog field its kind of value in `backend/app/catalog.py` (depends on T006; research R6; FR-002, FR-003; S1, F20).
  - `CatalogField` gains:
    - `kind`: `text`, `number`, `date`, `enum`, `image` or `parts`;
    - `option_set`: a T006 key for enums, otherwise `None`;
    - `date_of_birth`: true for the dates that are worded as an age;
    - `parts`.
  - A new frozen dataclass, `CatalogPart`, has `key`, `label`, `kind` (`text`, `enum` or `date`), `option_set` and `per_licence_class`.
  - The kinds follow research R6's table:
    - **text**: the names, the address parts, the postal codes, the document and administrative numbers, the issuing authority and jurisdiction, the email and phone number, and these `mdl` fields: `birth_place`, `resident_address`, `resident_city`, `resident_state`, `resident_postal_code`, `un_distinguishing_sign`, and the names in national characters;
    - **number**: the `mdl` fields `height`, `weight`, `age_in_years` and `age_birth_year`;
    - **date**: `pid` `birthdate`, `date_of_issuance` and `date_of_expiry`, and `mdl` `birth_date`, `issue_date`, `expiry_date` and `portrait_capture_date`. `date_of_birth` is true on `pid` `birthdate` and `mdl` `birth_date` only;
    - **enum**:
      - `countries`: `pid` `nationalities` (a list), `mdl` `nationality` (one value), `issuing_country`, `address_country` and `resident_country`;
      - `sex`: `sex`;
      - their own sets: `mdl` `eye_colour` and `hair_colour`;
    - **parts**:
      - `pid` `place_of_birth`: `country` (enum, `countries`, labelled "Country"), `region` (text, "Region") and `locality` (text, "City or town");
      - `mdl` `driving_privileges`: `classes` (enum, `licence_classes`, "Licence classes"), plus `issue_date` and `expiry_date` (dates, `per_licence_class`, "Issue date" and "Expiry date");
    - **image**: `pid` `picture`, and `mdl` `portrait` and `signature_usual_mark`. The UI offers them as "Can't be checked".
  - Keep the `age_over_NN` elements out of the catalog (F20). Age is checked through the Date of birth; "Age in years" and "Year of birth" stay number fields.
- [X] T008 Add the shapes of contracts/management-api.md "Schemas" to `backend/app/schemas.py` (depends on T007; Constitution I).
  - **Catalog**:
    - `DocumentField` gains `kind`, `option_set`, `date_of_birth`, and `parts: list[FieldPart] | None`;
    - new `FieldPart`, `OptionSet`, and `Option` (`value: str | int`, `label`, `description: str | None`).
  - **Rules**:
    - `RuleTarget`;
    - `Condition`, with every key but `operator` optional;
    - `RuleItem` and `GroupItem`, a recursive union discriminated by `type`;
    - `Mark`: `'changed' | 'removed' | 'added'`;
    - `BranchInput`;
    - `RulesInput`: `branches`, `numbering_base: {rule: int, group: int}`, `base_version: int | None`, and `replace: bool = False`;
    - `Branch`: `BranchInput` with `id: str`, `is_main` and `pull_url`.
  - The request schemas accept incomplete rules: an empty `message`, and a `null` `target` or `condition`. The service then names the problem, the rule and its branch (management-api.md). `Literal` types still refuse unknown `type`, `origin`, `operator` and `mark` values.
  - The request schemas keep each value's JSON type, since Pydantic otherwise turns `"2"` into 2 and `true` into 1 (management-api.md):
    - `value: StrictFloat | StrictStr | None`, `years` and `amount: StrictInt | StrictFloat | None`, `values: list[StrictStr | StrictInt] | None`, and `match_case: StrictBool`;
    - a string where a number belongs, or a boolean, is refused with spec 001's `400` "Invalid request payload", since the editor never sends one;
    - a fractional number, or one below 1, reaches T015, which names the rule.
  - Add a type adapter for the stored snapshot: the branches, without `is_main` and `pull_url`. It reads and writes `form_connection_rule_sets.branches` (research R2).
  - **Form connections**:
    - `FormConnection` gains `branches` (main branch first, in tab order), `rule_set_version`, `next_rule_number` and `next_group_number`;
    - `FormConnectionCreate` and `FormConnectionUpdate` gain `rules: RulesInput | None`. In an update, an absent `rules` leaves the rules unchanged, through `model_fields_set` as for `documents`.
- [X] T009 Serve the kinds and the value sets, one router module per resource (depends on T008; FR-031; constitution, "Technology and Structure Constraints"; plan "Constitution Check"):
  - in `backend/app/routers/document_types.py`, `GET /api/document-types` fills each field's `kind`, `option_set`, `date_of_birth` and `parts` from the catalog;
  - a new `backend/app/routers/option_sets.py` has its own `APIRouter` (prefix `/api/option-sets`, tag `option-sets`, `dependencies=[Depends(get_current_user)]`). Its `GET /api/option-sets` returns `ApiResponse[list[OptionSet]]` with the five sets of T006, for signed-in users only;
  - `backend/app/main.py` registers it with `app.include_router`, beside the other routers;
  - both handlers have docstrings.
- [X] T010 Give every form connection its main branch, and return the branches (depends on T005, T008; FR-018; research R9, R11).
  - Create `backend/app/services/rules.py` with a module docstring and two functions:
    - one returns the main branch's snapshot without rules: "Standard", `origin: "main"`, `operator: "and"`, `operator_mark: null`, and no items;
    - `pull_url_of(form_connection_id, branch_id, is_main)` returns the main branch's pull URL from spec 001, and for every other branch `{CONNECTION_BASE_URL}/api/connect/{form_connection_id}/branches/{branch_id}/requests/{reference}`, with the literal placeholder `{reference}` (contracts/integration-api.md).
  - In `backend/app/services/form_connections.py`:
    - `create_form_connection` also inserts the main branch row and rule set 1, with `current_rule_set = 1` and both counters at 1. This happens in the transaction that inserts the form connection and revision 1. A `rules` in the request is ignored until T018;
    - the form connection view (`_view`) returns the current rule set's branches, each with `is_main` and `pull_url`, plus `rule_set_version`, `next_rule_number` and `next_group_number`;
    - the main branch's `pull_url` equals the form connection's `pull_url`.
- [X] T011 Delete the branches and rule sets with their form connections in `backend/app/cli.py` (depends on T004; research R11).
  - `clear_connections` deletes the `FormConnectionRuleSet` and `FormConnectionBranch` rows after the document requests, which reference rule sets, and before the form connections.
  - Update:
    - the module docstring;
    - `backend/tests/unit/test_cli.py`;
    - the `clear-connections` row of `CLAUDE.md`'s backend command table: "every form connection with its revisions, branches, rule sets and requests".
- [X] T012 Test the foundation (depends on T009, T010).
  - `backend/tests/unit/test_catalog.py`:
    - every field has a kind, and the kinds match research R6's table;
    - `place_of_birth` and `driving_privileges` have their parts;
    - every `option_set` names a set of `option_sets.py`;
    - `date_of_birth` is set on the two dates of birth only;
    - no `age_over_NN` element is in the catalog (F20);
    - every option set is non-empty and has no duplicate values;
    - the 17 licence classes have descriptions.
  - `backend/tests/api/test_form_connections.py`:
    - `GET /api/document-types` returns kinds and parts;
    - `GET /api/option-sets` returns the five sets, and answers `401` without a session;
    - a form connection created without `rules` returns:
      - one branch, "Standard", with `is_main` set;
      - its `pull_url`, which equals the form connection's;
      - `rule_set_version` 1, and both counters at 1.

### Shapes and value sets (frontend)

- [X] T013 Mirror T008's shapes in `frontend/src/types/` (depends on T008). Constitution I puts this in the same change set as T008.
  - `document-types.ts`: `DocumentField` gains `kind`, `option_set`, `date_of_birth` and `parts`; add `FieldPart`.
  - `option-sets.ts` (new): `OptionSet` and `Option`.
  - `form-connections.ts`:
    - add `RuleTarget`, `Condition`, `RuleItem`, `GroupItem`, a `RuleTreeItem` union, `Mark`, `BranchInput`, `RulesInput` and `Branch`;
    - `FormConnection` gains `branches`, `rule_set_version`, `next_rule_number` and `next_group_number`;
    - `FormConnectionCreate` and `FormConnectionUpdate` gain `rules?`.
  - Field names stay snake_case, and a comment names the schema each type mirrors.
- [X] T014 Load the value sets in the frontend (depends on T013):
  - `frontend/src/api/option-sets.ts` with `getOptionSets()`, through `apiFetch`;
  - `frontend/src/hooks/useOptionSets.ts`, built like `useDocumentTypes`:
    - it returns its status, `optionSets` and `retry`;
    - failures go through `useSignOutOnUnauthorized`;
    - it loads the sets once per page;
    - its reducer goes in `frontend/src/hooks/utils.ts`, and its state type in `frontend/src/hooks/types.ts`.

**Checkpoint**: The migration has run. Every form connection has a main branch "Standard" and rule
set 1. The API returns kinds, parts, value sets and branches. `npm test` runs.

---

## Phase 3: User Story 1 - Check shared documents against rules (Priority: P1) 🎯 MVP

**Goal**: In the create and edit flow, a new Rules step comes between Documents and Publish. In it,
a DO.IT team member adds rules to the main branch:
- each rule checks one requested field, or one part of a field, with one condition of the field's
  kind;
- each rule has an error message;
- the rules are combined with AND.

The rules are saved together with the documents and shown on the details. When serviceBW pulls a
completed request, it receives the documents as before, plus the evaluation of the rules.

**Independent Test**: Create a connection with the Personal ID ("Date of birth") and the Driving
licence ("Licence classes"), with three rules:
- "Personal ID – Date of birth is at least 21 years old";
- "Driving licence – Licence classes includes one of B";
- "Driving licence – Licence class B – Issue date is at least 2 years ago".

Publish it. Pull requests with test documents that meet every rule, and with documents that break
some of them. serviceBW must receive the documents, with an evaluation that names exactly the
rules that aren't met, with their messages. This is quickstart V1 (steps 1 and 3–7) and V2. V1
step 2's tab row and "+ Add variant" (F16) come with US3 (T062).

### Implementation for User Story 1 (backend)

- [X] T015 [US1] Validate the rules of a save in `backend/app/services/rules.py` (FR-002 to FR-006, FR-020; data-model.md "The snapshot" and "Validation").
  - A function takes the `RulesInput` and the documents that the save leaves current, and returns the cleaned snapshot, with names, descriptions and messages trimmed.
  - On the first problem it finds, it raises `400` `{"error": "Validation error", "message": …}` through the service's validation error.
  - Each message names the problem, the rule by its name, and its branch (FR-005, FR-006). T032 uses the same strings in the frontend.
  - The checks:
    - main branch: "Exactly one main branch, listed first, with the form connection's main branch id (or none yet)". Message: "The rules need exactly one main branch.";
    - branch `name`: "1–100 characters after trimming". Message: "Enter a name for every variant.";
    - branch `description`: "Up to 500 characters";
    - "A rule checks a requested field, which isn't an image". Message: "Rule 02 in Standard checks data that's no longer requested." (F11);
    - "A rule's part and licence class fit its field":
      - `part` is `country`, `region` or `locality` for the ID's place of birth; `classes`, `issue_date` or `expiry_date` for the licence classes; and `null` for every other field;
      - `licence_class` is a code of `licence_classes` for `issue_date` and `expiry_date`, and `null` otherwise;
      - message: "Rule 04 in Ambulance checks a part that Licence classes doesn't have.";
    - "A rule's condition is complete and fits the field's kind": the operators and keys of data-model.md "Conditions" for the target's kind:
      - number: `value` is a number (T008's strict types already refuse strings and booleans);
      - text: `value` is "text that isn't empty after trimming (FR-006)", and `match_case` is "boolean, `false` by default (FR-013)";
      - enum: `values` are "one or more values of the field's set, no duplicates";
      - date: `date` is "`YYYY-MM-DD`", or the condition has `years`, or `amount` with a `unit` of "`years` or `months`";
      - "Every number of years or months is a whole number of at least 1";
      - messages: "Rule 03 in Standard: enter a number of years of at least 1.", "Rule 05 in Ambulance: choose at least one value." and "Rule 06 in Standard: enter a text to compare with.";
      - a missing target or condition gets a message of the same pattern: "Rule 03 in Standard: choose the data to check." and "Rule 03 in Standard: choose a check.";
    - `message`: "1–500 characters after trimming (FR-004)". Message: "Rule 02 in Standard has no error message.";
    - names: "1–100 characters after trimming, unique within the branch", compared after trimming and ignoring letter case. Message: "Another rule in Ambulance is already called Rule 01." (F12);
    - reserved names: "Rule NN" is accepted only on `rule-{NN}`, with or without leading zeros. Message: "Rule 08 is kept for the rule numbered 08.";
    - "Identifiers are well-formed, unique within each branch". Message: "The rules contain an invalid identifier. Reload the connection and try again.";
    - "Size limits" (spec Assumptions): at most 20 branches, the main branch included, and 200 items per branch, counting every rule, group and sub-group, removed ones and group members included. Messages: "A connection can have at most 20 variants." and "Ambulance can have at most 200 rules and groups.".
  - Groups (T045) and based branches (T053) add their checks later.
- [X] T016 [US1] Allocate identifiers and keep the counters in `backend/app/services/rules.py` (research R5 "Allocation"; FR-010).
  - A function runs under the form connection's row lock, with the cleaned snapshot, the `numbering_base` and the current rule set.
  - Every identifier that is in neither the current rule set nor the rule set the editor loaded (`base_version`) is new, and must be at or above the base. Otherwise the save is refused with T015's invalid-identifier message.
  - An identifier in the loaded rule set only belongs to a rule or group that another save deleted. It comes back under that identifier when the team member replaces that save (T068, FR-028): the same item returns, so no identifier is reused.
  - If another save advanced the counters since the base:
    - shift every new identifier by the difference, the same way in every branch;
    - rename the default names that still match. For example, "Rule 03" becomes "Rule 05", and the same applies to "Group" and "Sub-group".
  - Store `next_rule_number` and `next_group_number` as the highest number used plus one, never lower than before. No identifier is then reused within the form connection, also after deletions.
- [X] T017 [US1] Save a rule set in `backend/app/services/rules.py` (depends on T016; research R9; data-model.md).
  - A function runs inside the caller's locked transaction, and doesn't commit. It:
    - allocates the identifiers (T016);
    - gives every branch with `id: null` a UUID4, and inserts its `form_connection_branches` row;
    - sets `deleted_at` on the current rule set's branches that the save leaves out;
    - inserts the next rule set version only when the cleaned snapshot differs from the current one. An unchanged rule set creates no version;
    - sets `current_rule_set`.
  - It writes the snapshot through T008's type adapter.
  - It logs only the form connection's id and the new version.
- [X] T018 [US1] Save documents and rules together in `backend/app/services/form_connections.py` (depends on T015, T017; FR-001, FR-006, FR-028; research R9; management-api.md "Saving, step by step").
  - **Validation first**, before anything is written or EUDIPLO is called:
    - check the name, the serviceBW form and the documents (spec 001);
    - then check the rules against the documents that the save leaves current;
    - a `PUT` that changes the documents without `rules` checks the current rule set against the new documents. A save that would leave a rule checking data no longer requested is refused (FR-006).
  - **Create**:
    - without `rules`, the form connection gets the main branch "Standard" without rules (T010);
    - with `rules`, create the EUDIPLO configuration first. Then, in one transaction, insert the form connection, revision 1, the branch rows and rule set 1 (T017), as today;
    - if the commit fails, delete the configuration again.
  - **Update, rules only**: one transaction under `_lock_form_connection` saves the rule set (T017) and any change to the name or the serviceBW form, then commits once.
  - **Update, documents too**:
    - `create_revision` takes the cleaned rules;
    - its final locked transaction, which makes the revision current, also saves the rule set, before its one commit;
    - if EUDIPLO or the commit fails, the previous revision and rule set stay current, and nothing has changed (FR-028).
  - The handlers in `backend/app/routers/form_connections.py` keep their shape. Update their docstrings.
- [X] T019 [P] [US1] Add the evaluation's shapes to `backend/app/schemas.py` (contracts/integration-api.md "evaluation"; research R8).
  - The new shapes:
    - `EvaluationBranch`: `id` and `name`;
    - `EvaluationResult`: `id`, `type: 'rule' | 'group'`, `name`, `group: str | None`, and `outcome: 'met' | 'not_met' | 'not_checked'`;
    - `EvaluationMessage`: `id` and `message`;
    - `Evaluation`: `branch`, `met`, `results` and `messages`.
  - `PullResponse` gains `evaluation: Evaluation | None`. It is `null` whenever `documents` is `null`, and present whenever they are. Update the docstring.
- [X] T020 [US1] Evaluate conditions in a new pure module, `backend/app/services/evaluation.py`, with its unit tests (depends on T007, T019; FR-003, FR-012 to FR-014; research R7). The module uses no database and no EUDIPLO, and logs no values.
  - **Day of sharing**: the calendar date in `Europe/Berlin` of the request's `completed_at`, through `zoneinfo`. The zone loads at import, so a missing time zone database fails at start-up, not at a pull.
  - **Values**:
    - read from the delivered documents (`DeliveredDocument`), by document type and field key;
    - the place of birth's parts come from its object: `country`, `region` and `locality`;
    - the licence classes come from `driving_privileges`: each class's code, `issue_date` and `expiry_date`;
    - **verify** these shapes with `uv run python -m scripts.issue_test_credentials --show-claims` (research R14).
  - **Text** (FR-013):
    - trim both sides, and normalise them to Unicode NFC. Spaces inside a value count as written;
    - ignoring letter case compares `str.casefold()`, and `match_case` respects letter case;
    - "contains" and "doesn't contain" are substring tests.
  - **Numbers**: strict comparisons with one value. A JSON boolean isn't a number.
  - **Enums** (FR-003):
    - "includes one of" holds when at least one of the document's values is in the set, and "includes none of" when none is;
    - a single value counts as a list of one;
    - strings compare ignoring letter case, and codes as integers;
    - a value outside the field's set matches none of the rule's values.
  - **Dates** (FR-012):
    - "before" and "after" are strict, and "on" means equal;
    - the N-th anniversary of a date is the same day N years later, or 1 March where 29 February doesn't exist;
    - "at least N years ago", and "years old", hold from the anniversary on; "less than" holds until the day before; "exactly" holds from the N-th anniversary to the day before the (N+1)-th;
    - "from now" counts N years or months after the day of sharing: the same day of the month, or the 1st of the following month where that day doesn't exist. "At least" holds on or after that day, and "less than" before it, past dates included;
    - don't use `dateutil`: it clamps 31 January + 1 month to 28 February.
  - **Outcomes** (FR-014):
    - each rule ends as `met`, `not_met` or `not_checked`;
    - `not_checked`: the value is missing, `null`, an empty list, a text that is empty after trimming, or can't be read for the condition, such as a date of birth with only a year;
    - a rule on a class's date is `not_met` when the licence doesn't list the class;
    - a class is held when the licence lists it, whatever its own expiry date;
    - a held class without its own expiry date is `not_checked`. It never falls back to the licence's expiry date.
  - **Tests**, covering SC-003:
    - `backend/tests/unit/test_evaluation.py`:
      - every operator of every kind, on both sides;
      - the parts;
      - letter case, with and without `match_case`: "KÖLN" against "Köln", and "HEIDESTRASSE 17" containing "straße";
      - a composed and a decomposed "ö";
      - spaces at the ends and inside a value;
      - booleans given as numbers;
      - values outside an enum's set;
      - missing, `null`, empty and unreadable values;
      - classes that are held, not held, and expired;
    - `backend/tests/unit/test_rule_dates.py`:
      - a birthday on the day of sharing, for "at least", "less than" and "exactly";
      - 29 February;
      - "exactly N years" on the day before the next anniversary;
      - 31 January + 1 month, which is 1 March;
      - past dates, which are "less than" any amount from now;
      - strict "before" and "after";
      - sharing at 23:30 UTC, which is already the next day in Germany.
- [X] T021 [US1] Evaluate a branch's top level in `backend/app/services/evaluation.py`, with tests in `backend/tests/unit/test_evaluation.py` (depends on T020; FR-009 to FR-011).
  - A function takes the branch's snapshot, the delivered documents and the day of sharing, and returns an `Evaluation`.
  - It combines the top-level rules with the branch's operator: AND when all are met, OR when at least one is. `not_checked` counts as not met.
  - A branch without rules is met.
  - `results` follow the branch's order, with `group: null`.
  - `messages` is empty when the branch is met. Otherwise it holds the message of every top-level rule that isn't met, in order.
  - The evaluation contains no field value (FR-017).
  - Groups come with T044, and marks with T054.
- [X] T022 [US1] Deliver the evaluation with the documents in `backend/app/services/document_requests.py` (depends on T010, T021; FR-010, FR-015 to FR-017, FR-025, FR-028; research R8).
  - `trigger` stores the current rule set's id in `rule_set_id`. It reads it from the same `form_connections` row as `current_revision`.
  - `_deliver`:
    - reads the request's rule set before it ends the read transaction;
    - computes the evaluation right after `extract_documents`, before the delivery is counted under the row lock;
    - lets an exception from the evaluator reach spec 001's catch-all handler, which answers `500` with an `error_id`. The repeat window doesn't start, and serviceBW can pull again.
  - `pull`:
    - returns `evaluation` for the main branch with the documents, and `null` whenever `documents` is `null`;
    - computes it again at every delivery in the repeat window. It is never stored and never logged.
  - A request without `rule_set_id`, triggered before this feature, gets `met: true` with no results and no messages, plus the main branch's `id` and its name in the current rule set (US1-AS7, SC-005).
  - The documents are delivered whether or not the rules are met, and the status stays `completed` (FR-015).
- [X] T023 [P] [US1] Add two options to `backend/scripts/issue_test_credentials/` (research R12; SC-003):
  - the options: `--birth-date YYYY-MM-DD`, and `--licence-class CODE:ISSUE_DATE`, which can be repeated;
  - `cli.py` parses them;
  - where the person and the claims are built, they set:
    - the fake person's date of birth, in the PID and in the driving licence, and the licence's age fields that follow from it;
    - the licence's `driving_privileges`;
  - an invalid date or class code is refused with a usage error;
  - document both options in `README.md`, "Test credentials for a test wallet";
  - test them in `backend/tests/unit/test_issue_test_credentials.py`.

### Tests for User Story 1 (backend)

- [X] T024 [US1] Write `backend/tests/unit/test_rules_validation.py` and `backend/tests/unit/test_identifiers.py` (depends on T016).
  - Validation, covering every check and message of T015, including:
    - a text value of spaces only;
    - `years` of `0` and `1.5`, refused with the named message (T008 refuses `"2"`, and T025 tests it);
    - a duplicate enum value;
    - a name that differs from another only in letter case and outer spaces;
    - "Rule 8" and "Rule 08" on another rule;
    - a target that the documents no longer request, and an image;
    - the size limits.
  - Identifiers:
    - two-digit default names;
    - the check against the base;
    - an identifier that the loaded rule set (`base_version`) has and the current one lacks, which is accepted;
    - the shift, which renames default names and keeps custom ones;
    - counters that are never lowered;
    - no identifier reused after a deletion.
- [X] T025 [US1] Write `backend/tests/api/test_form_connection_rules.py`, with helpers for rules payloads in `backend/tests/helpers.py` (depends on T018). It covers:
  - creating with US1's three rules, and reading them back with identifiers and counters (US1-AS1);
  - creating without rules (US1-AS3);
  - every refusal: `400`, with a message naming the problem, the rule and "Standard", and nothing saved (US1-AS6);
  - a `"2"` for `years` and a `true` for a number's `value`, refused with `400` "Invalid request payload" (T008);
  - editing the rules only, and editing the documents and rules together;
  - editing documents that a rule checks without sending `rules`, which is refused;
  - saving an unchanged rule set, which creates no new version;
  - a configuration call that the fake EUDIPLO fails: neither the revision nor the rule set changes (FR-028);
  - `401` without a session, and `415` without JSON.
- [X] T026 [US1] Extend `backend/tests/api/test_connect.py`, giving the fake EUDIPLO's sessions credentials (depends on T022). On a connection with US1's three rules:
  - a 25-year-old who has held class B for 5 years: the documents arrive with `evaluation` `met: true` and no messages (US1-AS4);
  - the documents still contain the fields that the rules check, such as `birthdate` (FR-016);
  - a 20-year-old who has held class B for 1 year: `met: false`, with the messages of the age rule and the 2-year rule but not the class rule (US1-AS5);
  - pulls within the repeat window repeat the same evaluation; after it, `documents` and `evaluation` are both `null` (FR-017);
  - `pending` answers carry `evaluation: null`;
  - a request with an empty `rule_set_id` is met, with no results (US1-AS7);
  - an evaluator that raises (patched) gives a `500` with an `error_id`, and the next pull still delivers (research R8);
  - the logs (`caplog`) hold no reference, field value, outcome or message.

### Implementation for User Story 1 (frontend logic, with Vitest)

- [X] T027 [P] [US1] Write `frontend/src/utils/rules/conditions.ts` with `conditions.test.ts` (FR-003, FR-006, FR-013; data-model.md "Conditions").
  - The operators of each kind, with their labels in FR-003's words:
    - numbers: "is greater than", "is less than", "is equal to", "is not equal to";
    - text: "is equal to", "is not equal to", "contains", "doesn't contain";
    - enums: "includes one of", "includes none of";
    - dates:
      - "is before", "is after", "is";
      - "is at least", "is less than", "is exactly", with "years ago", or "years old" on a field with `date_of_birth`;
      - "is at least", "is less than", with an amount, a unit (years or months) and "from now".
  - The kind of a target, from its field or part.
  - A new condition's defaults, such as `match_case: false`.
  - `isComplete`:
    - years and amounts are whole numbers of at least 1;
    - a text isn't empty after trimming;
    - an enum has one or more values, without duplicates;
    - a date is a valid `YYYY-MM-DD`;
    - a number is a number.
  - Tests: every operator, the age wording only on the Date of birth, and each incomplete case.
- [X] T028 [P] [US1] Write `frontend/src/utils/rules/dates.ts` with `dates.test.ts` (FR-003, FR-012; F4). It holds the backend's calendar arithmetic (T020), for the rule editor's example:
  - the N-th anniversary, where 29 February becomes 1 March;
  - N months later, the 1st of the following month where the day doesn't exist;
  - the boundary date that each date condition means for a given day;
  - the design's date format: "23 Oct 2005".
  - Tests:
    - the design's example: on 23 Oct 2026, "at least 21 years old" means born on or before 23 Oct 2005;
    - 29 February;
    - 31 January + 1 month;
    - "is exactly".
- [X] T029 [US1] Write `frontend/src/utils/rules/statements.ts` with `statements.test.ts` (depends on T027, T028; S2, S3, S5, S6; F1, F2, F5, F8; FR-005).
  - A rule's statement in FR-005's words, with "–" between the document, the field and the part, and "is" before the condition:
    - "Personal ID – Date of birth is at least 21 years old";
    - "Driving licence – Licence classes includes one of B, BE", with codes only (F32);
    - any other enum by its values' labels, such as "Personal ID – Nationality includes one of Germany" (FR-005). The function takes the value sets (T014);
    - "Driving licence – Licence class B – Issue date is at least 2 years ago";
    - "Driving licence – Expiry date is at least 6 months from now", without "left";
    - a fixed date: "is before 1 Jan 2020";
    - a number;
    - a text, with whether letter case counts, worded as design-notes.md says (F7).
  - The decoration symbol of the design's chip for each operator (≥, < or =, or none). The UI hides it from assistive technologies.
  - Tests: every kind and operator, "years old" only on the Date of birth, labels from the catalog, and enum values by label except the licence classes' codes.
- [X] T030 [US1] Write `frontend/src/utils/rules/messages.ts` with `messages.test.ts` (depends on T027; S3; F9; FR-004).
  - A complete condition gets a proposed error message that matches it as entered, in the design's style (U11 `6348:40735`, U12). For example, from data-model.md: "You must be at least 21 years old.", "You must live in Stuttgart." and "You must have held class B for at least 2 years.".
  - Enum values appear by their label, and licence classes by their code, as in the statements (FR-005).
  - An incomplete condition gets none.
  - Tests: one per kind and operator, and none for an incomplete condition.
- [X] T031 [P] [US1] Write `frontend/src/utils/rules/tree.ts` with `tree.test.ts`, the tree operations of one branch that US1 needs (FR-005, FR-007, FR-010; research R5):
  - number new rules from the counters (`rule-{n}`), and give them default names with at least two digits, such as "Rule 07";
  - add a rule at the end of its level;
  - update, rename and delete a rule, returning what an undo restores;
  - duplicate a rule as a new rule, with a new identifier and its default name, at the end of the original's level;
  - tell whether a branch has any rule.
  - Groups come with T047, and the derived dissolution with T060.
- [X] T032 [US1] Write `frontend/src/utils/rules/validation.ts` with `validation.test.ts` (depends on T027, T031; FR-005, FR-006).
  - The pre-checks of T015, with the same messages, run before Publish or Save:
    - each problem comes with the rule and branch it names, so that the UI can move the focus there;
    - the first problem is the one shown.
  - `nameProblem(name, item, branch)` for inline renaming, with the duplicate message ("Another rule in Standard is already called Rule 01.") and the reserved one ("Rule 08 is kept for the rule numbered 08.").
  - Tests: every check, with the server's strings.

### Implementation for User Story 1 (UI)

- [X] T033 [US1] Add the Rules step to the wizard (S0; F19, F28; FR-001; research R10), in `frontend/src/constants.ts` and `frontend/src/pages/FormConnectionEditor/` (`types.ts`, `utils.ts`, `index.tsx`).
  - `CONNECTION_STEPS` becomes Connection, Documents, Rules, Publish, with the Rules label from design-notes.md (U11 `6348:40209`).
  - `EditorStep` gains `'rules'`.
  - The progress bar marks the current step through a step-to-index map. The details still show every step as done.
  - Create `frontend/src/pages/FormConnectionEditor/RulesStep/` with `types.ts`, `constants.ts` and `utils.ts`:
    - `rulesReducer` and its actions cover the branches (with a client key for branches not saved yet), the open branch, the counters, the loaded `rule_set_version`, the rule being edited, the dialogs and the toasts;
    - its initial state comes from `formConnection.branches` and the counters when editing. When creating, it is a main branch "Standard" without rules, with both counters at 1.
  - The page holds `useReducer(rulesReducer, …)` next to `editorReducer`, so that the documents step, the footer and the publish dialog read the rules.
  - The page loads the value sets with `useOptionSets` (T014) next to `useDocumentTypes`, and shows their loading and failure the same way. It passes them to the Rules step, the rule editor and the publish dialog, for the labels of statements and messages (FR-005).
  - The shell stays spec 001's `WizardLayout`:
    - no draft badge and no "Save and exit" (F28);
    - its header and action bar already stay in place while the step scrolls. Nothing else is built for Figma's sticky bars (F19).
- [X] T034 [US1] Change the documents step's footer (S1; F17, F19, F20; FR-001) in `frontend/src/pages/FormConnectionEditor/EditorFooter.tsx` and its types and constants. Figma: U09 `6235:18684`, `6235:19019`; U10 `6324:40069`, `6324:40394`; U36 `6376:27342`.
  - The primary action, "Add rules →", runs the documents' checks, then goes on to the Rules step.
  - "Publish without rules" ("Save without rules" when editing) shows beside it only while no branch has any rule, and opens the publish dialog (T042) (F17).
  - Otherwise the documents step stays spec 001's: none of Figma's redesign (F19), and no "Age over 18" (F20).
- [X] T035 [US1] Build the shared read-only rule display in `frontend/src/components/` (depends on T029; S2, S6; F1, F2, F5, F8; FR-005; research R10). Each folder has `index.tsx` and `types.ts`.
  - `RuleRow/`: the rule's name, its statement (T029) with the design's ≥, < or = chip marked `aria-hidden`, its error message, and a slot for actions (U14 `6094:6469`, U12 `6350:41102`).
  - `Connector/`: the AND or OR chip between two items of a level (U14), read-only for now. T049 makes it switchable.
  - The Rules step (T036) and the details (T043) both use them, so the details show the rules in the Rules step's layout (FR-030).
- [X] T036 [US1] Build the Rules step's rule list in `frontend/src/pages/FormConnectionEditor/RulesStep/` (S2; F1, F2, F8, F12, F29; FR-001, FR-005, FR-007; Figma U14 `6094:6127`, U15, U21 `6168:7004`, U29 `6197:11646`).
  - `index.tsx` renders the open branch:
    - without rules: the empty state "No rules yet" with "+ Add rule" (U29 `6197:11654`);
    - with rules: `RuleRow`s in the order of adding, `Connector`s between them, and "+ Add rule" after them;
    - no identifiers (FR-010).
  - Each list item is a sub-component with a ⋯ menu (U14 `6113:28988`):
    - edit: opens the rule editor in the rule's place;
    - rename: inline, as U15 `6344:53317`–`6344:53481` shows ("Enter saves · Esc cancels"). An empty, duplicate or reserved name is refused where it is entered (T032), for example "Another rule in Standard is already called Rule 01." (F12);
    - duplicate: a new rule with a new identifier and its default name (T031);
    - delete: the confirmation "Delete Rule 03?" (U14 `6113:29056`), then the toast "Rule 03 in Standard deleted." with Undo (U14 `6113:29469`; F29).
- [X] T037 [US1] Build the rule editor's frame and its choice of data in `frontend/src/pages/FormConnectionEditor/RulesStep/RuleEditor/` (S3; F5, FYI #20; FR-002, FR-003; Figma U11 `6348:40219`, `6348:40238`, U32 `6324:17627`).
  - `index.tsx`, `types.ts`, `constants.ts`, and `utils.ts` with `ruleEditorReducer` for the rule being edited. The editor shows the rule's name, by default "Rule NN".
  - The choice goes document → data → part → check → value, each unlocked in order.
  - The data menu:
    - lists only the documents and fields that the connection requests ("Lists the documents you added", "Only documents you request are listed."), and images as "Can't be checked";
    - has the search field "Search Personal ID" or "Search Driving licence", with the empty result "No options match "{typed text}".";
    - has the footer wording that design-notes.md chose (FYI #20);
    - ends with "Need other data? Add it in Documents", which opens the documents step. With unsaved changes, T040's guard asks first.
  - The part pickers ("Choose part") are built like the data menu:
    - Place of birth lists "Country", "Region" and "City or town", without a search field (U32 `6324:17746`);
    - Licence classes, also in U24's and U25's frames, lists "Licence classes" (the held classes) and, for every class, "Licence class B – Issue date" and "Licence class B – Expiry date". It has the search field "Search classes" (F5).
  - Each menu item is a sub-component, and the menus work with the keyboard.
- [X] T038 [US1] Build the checks and values of numbers, text and enums in `frontend/src/pages/FormConnectionEditor/RulesStep/RuleEditor/` (S3; F6, F7, F8, F30, F32; FR-003, FR-013; Figma U31 `6324:16743`–`6324:17351`, U13 `6357:42622`, U12 `6350:41850`, U24 `6191:42065`, `6191:42259`, U25 `6197:11760`).
  - **Numbers**: "is greater than", "is less than", "is equal to" and "is not equal to", strict, with one value each. The value field accepts any number (F6).
  - **Text** (F7):
    - "is equal to", "is not equal to", "contains" and "doesn't contain", with one value each;
    - next to the value, a KERN checkbox for letter case, labelled as design-notes.md says and unchecked by default, so that letter case is ignored;
    - the hint "Spaces at the start or end don't matter.";
    - no "starts with", and no multiple values.
  - **Enums**:
    - "includes one of" and "includes none of", with any number of values (F8);
    - a value menu with checkboxes, the search field "Search options" (empty result "No options match "XL"."), the footer "Select at least one option.", and chips for the chosen values;
    - for Licence classes, U12's menu (`6357:43382`): the search field "Search classes", and each option with its code and description, such as "B Cars up to 3.5 t". The chips and statements show codes only (F32);
    - Nationality's hint: "Nationality can have more than one value. "Includes one of" is met if any of them is one of the chosen values, "includes none of" if none of them is." (F30). U12 `6357:43117`'s hint for licence classes stays.
  - The options come from the page's value sets (T033), and the conditions and their completeness from T027.
- [X] T039 [US1] Build the date checks in `frontend/src/pages/FormConnectionEditor/RulesStep/RuleEditor/` (S3; F1, F2, F3, F4; FR-003, FR-012, FR-014; Figma U11 `6348:40539`, `6348:40681`, `6348:40749`–`6348:40756`; U12 `6350:42447`–`6350:42449`, `6350:42724`; U25 `6196:10397`–`6196:10401`; U30 `6324:15410`–`6324:16291`).
  - The picker uses FR-003's words, in the sections "Time ago" and "Time from now" (F1, F3):
    - on the Date of birth: "is at least", "is less than" and "is exactly" N "years old";
    - on every other date: "is before", "is after" and "is" a date, and "is at least", "is less than" and "is exactly" N "years ago";
    - on every date: "is at least" and "is less than" N years or months "from now";
    - no "at most", and "old" only on the Date of birth.
  - The unit picker (years, months) appears only on from-now conditions. Age and years-ago conditions take whole years, shown as fixed text. N is a whole number of at least 1: "Enter a number greater than 0." (U25). No "left" (F2).
  - U11's hint becomes "Check an age, the time from now, or compare the date with a fixed date.".
  - Next to every date condition, also in error states (F4):
    - the counting note, with today's example from T028: "Counted from the day the applicant shares. Today (23 Oct 2026) this means: born on or before 23 Oct 2005.";
    - the missing-value note: "If the date of birth is missing or can't be read, the rule isn't met and is reported as couldn't be checked.". It names the checked field or part, such as "the expiry date" or "the issue date of class B";
    - a class rule may add "If class B is missing, the rule isn't met.".
  - Saved rules don't show these notes. The ≥ and < chips are decoration, marked `aria-hidden`.
- [X] T040 [US1] Finish the rule editor: its message, saving and leaving, in `frontend/src/pages/FormConnectionEditor/RulesStep/RuleEditor/` and `RulesStep/` (S2, S3; F9, F10, F29; FR-004, FR-006; Figma U11 `6348:40234`, `6348:40876`, U12 `6350:41266`, U25 `6196:10232`, `6196:10383`, U28 `6197:10963`).
  - The error message field (F9):
    - its placeholder is "Error message applicants read: Suggested once you complete the check. You can edit it.";
    - once the condition is complete, it proposes T030's message, which the team member may change;
    - the proposal follows the condition until the team member edits it.
  - "Save rule" stays disabled until the rule is complete, with U25's inline flags. Saving closes the editor and shows the toast "Rule 01 in Standard saved." (F29). "Cancel" closes it.
  - Leaving the editor with unsaved changes opens U28's "Save changes to Rule 01?" (`6197:10988`, "Discard" and "Save changes") (F10):
    - leaving means Cancel, editing another rule, or "Need other data? Add it in Documents";
    - "Save changes" keeps the rule as it is, even if incomplete; FR-006 still checks it at publishing;
    - the dialog is a `SaveChangesDialog` sub-component, which T041 reuses.
- [X] T041 [US1] Build the Rules step's footer and the checks before publishing (S2, S3; F10, F11; FR-001, FR-006; Figma U11 `6348:40236`, `6348:40255`, U27 `6197:10682`, `6197:10696`, U29 `6197:11646`), in `frontend/src/pages/FormConnectionEditor/EditorFooter.tsx`, `index.tsx` and `RulesStep/`.
  - "Back" returns to the documents.
  - The primary action reads "Publish" ("Save" when editing). It reads "Publish without rules" ("Save without rules") only while no branch has any rule and no rule editor is open (F10).
  - With unsaved editor changes, Publish and Save first open "Save changes to Rule 01?" (T040). "Save changes" keeps the rule even if incomplete, and "Discard" drops the changes. Either way, publishing or saving then goes on (F10).
  - Publish and Save stay enabled (F11):
    - an attempt runs T032's pre-checks;
    - a refusal shows the message naming the problem, the rule and its branch, and moves the focus to that rule.
  - A rule that checks data no longer requested shows a banner and an inline flag: "Rule 02 in Standard checks data that's no longer requested. Add the data again in Documents, or edit or delete the rule." (U27 `6197:10696`; F11).
- [X] T042 [US1] Extend the publish and save dialog, and send the rules (S5; F1, F5, F10, F21, F22, F23; FR-001, FR-028; Figma U33 `6376:25342`, `6376:26181`, U35 `6376:26326`–`6376:26984`, U36 `6376:27341`), in `frontend/src/pages/FormConnectionEditor/PublishDialog.tsx`, `utils.ts` and `constants.ts`.
  - The dialog summarises the documents and, for each branch, its rules as statements (T029), in design-notes.md's wording:
    - "Personal ID – Date of birth is at least 21 years old" (F1);
    - a licence class rule shows the part's statement (F5);
    - each summary row is a sub-component.
  - There is no warnings line (F21), and no go-live choice: publishing goes live at once (F22).
  - States (F23):
    - while it runs: "Publishing…" ("Saving…"), then the details open;
    - on failure: "Couldn't publish" ("Couldn't save") with "Try again", and nothing has changed (U35 `6376:27178`);
    - the API's `400` message shows in the dialog too.
  - From the documents step, while no branch has rules, the dialog asks "Publish without rules?" (U36).
  - `createPayload` sends `rules`:
    - the branches, main branch first, with their items;
    - `numbering_base` from the counters the editor started from;
    - `base_version`: `null` when creating, and the loaded `rule_set_version` when editing;
    - `replace: false`.
- [X] T043 [US1] Show the rules on the details (S6; F1, F5, F8, F22, F25, F26, W1, FYI #17; FR-010, FR-030; Figma U37 `6396:47756`, `6396:48222`–`6396:48277`), in a new `frontend/src/pages/FormConnectionDetail/RulesSummary.tsx` with its sub-components, types and constants.
  - A collapsible card, "View summary" / "Hide summary", collapsed by default (FYI #17).
  - The details load the value sets with `useOptionSets` (T014) for the statements' labels (FR-005), and show their loading and failure like the rest of the page.
  - One read-only section per branch, in the Rules step's layout, from the shared `RuleRow` and `Connector`:
    - names, statements (F1, F5, F8) and messages;
    - each rule's identifier, read-only next to its name, such as `rule-7` (W1);
    - a branch without rules says so.
  - None of Figma's "Live since", counters, "Download PDF", activity or "✓ Copied" (F25).
  - No go-live chip and no change-date action (F22).
  - The URLs stay as spec 001 shows them while only the main branch exists (T067, W2).

**Checkpoint**: A connection with rules can be created, edited and published. serviceBW receives
the evaluation with the documents. US1's acceptance scenarios pass, and so do quickstart V1
(without step 2's tab row) and V2.

---

## Phase 4: User Story 2 - Combine rules with OR, groups and sub-groups (Priority: P2)

**Goal**:
- Each level switches between AND and OR.
- Two or more rules form a group, and two or more rules of a group form a sub-group.
- Groups have their own AND or OR and, optionally, their own error message.
- Groups can be ungrouped or deleted, and dissolve when fewer than two members remain.
- The evaluation reports groups and their messages as FR-011 says.

**Independent Test**: Build "lives in Stuttgart AND (at least 21 OR (at least 19 AND has held class
B for at least 3 years))" with a group and a sub-group. Check the evaluation with documents for
each way to qualify, and for an applicant who qualifies in neither (quickstart V3).

### Implementation for User Story 2 (backend)

- [X] T044 [US2] Evaluate groups and sub-groups in `backend/app/services/evaluation.py`, with tests in `backend/tests/unit/test_evaluation.py` (FR-009, FR-011; research R7 "Levels" and "Messages"; contracts/integration-api.md).
  - Every level is combined with its own operator, and a group or sub-group counts as one item of its level.
  - `results` follow the tree's order: the top level first, with each group's members after it. `group` names the containing group's identifier. Groups get `met` or `not_met`, never `not_checked`.
  - `messages` (FR-011) is empty when the top level is met. Otherwise, walking the top level in order, it holds:
    - the message of each item that isn't met;
    - for a group without its own message, the messages of its members that aren't met, found the same way.
  - Tests:
    - the example "lives in Stuttgart AND (at least 21 OR (at least 19 AND class B for 3 years))", for each way to qualify and for neither (US2-AS2, AS3);
    - a group's own message, reported instead of its members' (AS4);
    - an OR group with one rule met (AS5);
    - the result list of the contract's example.
- [X] T045 [US2] Validate groups in `backend/app/services/rules.py`, with tests in `backend/tests/unit/test_rules_validation.py` (FR-004, FR-005, FR-008; data-model.md "Group and sub-group" and "Validation"):
  - `operator`: "`and` or `or`";
  - `message`: "Its own error message, 1–500 characters, or none";
  - `items`: "A group holds rules and sub-groups; a sub-group holds rules only", with "At least two active members". Message: "Group 02 in Standard needs at least two rules.";
  - group names follow the rules for rule names, and "Group NN" and "Sub-group NN" are kept for `group-{NN}`;
  - identifiers `group-{n}` come from the group counter (T016).
- [X] T046 [US2] Test groups through the API (depends on T044, T045).
  - `backend/tests/api/test_form_connection_rules.py`:
    - a save with a group and a sub-group, with identifiers from the group counter;
    - the refusals of a one-member group, and of a group inside a sub-group.
  - `backend/tests/api/test_connect.py`: the pulls of US2-AS2 and AS3, with their messages.

### Implementation for User Story 2 (frontend)

- [X] T047 [P] [US2] Add groups to `frontend/src/utils/rules/tree.ts`, with tests in `tree.test.ts` (FR-007, FR-008; data-model.md "Dissolution"). Each operation returns what an undo restores.
  - Group two or more top-level items into a group, or two or more rules of a group into a sub-group:
    - the new group takes its first member's place;
    - it is numbered from the group counter, and named "Group NN" or "Sub-group NN";
    - nothing can be grouped inside a sub-group.
  - Add a rule at the end of a group's level.
  - Switch a level between AND and OR. The top level's operator is the branch's `operator`.
  - Set or remove a group's message.
  - Ungroup: the members take the group's place.
  - Delete a group with its members.
  - Dissolve a group whose members drop below two: the remaining member takes its place, and the group's AND/OR and message are dropped.
  - A sub-group that reaches the top level, through dissolution or ungrouping, becomes a group. It keeps its identifier, name, AND/OR and message.
- [X] T048 [US2] Add T045's group checks to `frontend/src/utils/rules/validation.ts`, with tests in `validation.test.ts` (depends on T047).
  - Add group names to the inline name checks: "Another group in Standard is already called Group 01." and "Group 03 is kept for the group numbered 03.".
- [X] T049 [P] [US2] Build `frontend/src/components/GroupFrame/`, and make `Connector` switchable (S2, S6; W6; FR-007, FR-008; Figma U14 `6094:6413`, `6094:6320`, `6324:39410`, U16 `6344:53590`–`6344:53658`).
  - `GroupFrame` draws a group or sub-group:
    - its header, with the name and a slot for the ⋯ menu;
    - its own message, under the header (U14 `6324:39410`; W6);
    - its members, with connectors between them.
  - `Connector` takes an optional switch handler. With one, it is a button whose accessible name says the level it switches, such as "Switch Group 01 to OR" (ui-screens.md, "Accessibility"). Without one, it stays read-only.
- [X] T050 [US2] Group rules in the Rules step, in `RulesStep/` (S2; F12, F13, F29; FR-007, FR-008; Figma U14 `6094:6597` (connector menu), U16 `6344:53506`–`6344:53658`, U21 `6168:7263`).
  - A connector switches its whole level between AND and OR, with the notice after switching as designed.
  - Select mode (U16), which works with the keyboard:
    - choose two or more items of one level, then "Group", or "Cancel";
    - grouping shows the toast "Rule 02 and Rule 03 in Standard are now Group 01." with Undo (F29);
    - a group's members can form a sub-group, but a sub-group offers no grouping (US2-AS6).
  - "+ Add rule" inside groups and sub-groups.
  - Deleting a member below two dissolves the group: the remaining member takes its place (US2-AS7). Empty and single-member groups never show (F13).
  - Groups and sub-groups are renamed inline, like rules, with T048's messages (F12).
- [X] T051 [US2] Build the group and sub-group menus in `RulesStep/` (S2; W6, W8; FR-004, FR-008; Figma U14 `6094:6413`, `6094:6320`, `6324:39410`, `6324:39419`, `6113:29056`, `6113:29469`):
  - "Add error message" and "Remove error message": the message card, with its hint, sits under the header (W6);
  - "Ungroup": the members take the group's place, and the toast "Group 01 in Standard ungrouped." offers Undo (W8);
  - "Delete group": design-notes.md's confirmation ("Delete Group 01?", saying that its rules are deleted with it), then a toast with Undo (W8, US2-AS8);
  - "Rename", as for rules.
  - T064 adds "Remove" and "Restore" for inherited groups in based branches.
- [X] T052 [US2] Show groups on the details and in the publish dialog, in `frontend/src/pages/FormConnectionDetail/RulesSummary.tsx` and `frontend/src/pages/FormConnectionEditor/PublishDialog.tsx` (S5, S6; F26, W1; FR-030).
  - Groups and sub-groups show through `GroupFrame`, with their AND/OR and their own messages.
  - On the details, each one shows its identifier next to its name, such as `group-3` (W1).

**Checkpoint**: US1 and US2 work together. Quickstart V3 passes.

---

## Phase 5: User Story 3 - Variants of a form with branches (Priority: P2)

**Goal**: A connection can have variants. Each variant is:
- based on Standard: it follows Standard's rules except where it changes, removes or adds them, and
  shows those changes with marks;
- or started empty.

Each variant has its own pull URL, fixed by an identifier. A deleted variant answers
"unavailable", and a variant added after a request was triggered answers `branch_added_later`.
Since a save can now delete a variant for good, a save over another team member's newer rules is
refused unless the team member replaces them (FR-028).

**Independent Test**: Set up the "Passenger transport licence" with an "Ambulance" variant based on
Standard. Change the age in Ambulance, and the class B duration in Standard. Pull requests with the
same test documents through both pull URLs, and compare the evaluations (quickstart V4 and V5).

### Implementation for User Story 3 (backend)

- [X] T053 [US3] Validate branches and their marks in `backend/app/services/rules.py` (FR-005, FR-006, FR-019 to FR-024; research R4; data-model.md "Marks in a based branch" and "Validation").
  - "Branch names are unique", compared ignoring letter case and outer spaces. Message: "Two variants are called Ambulance. Give each variant its own name.".
  - `origin` is "`main`, `based` or `empty`": "`main` for the main branch only. Fixed when the branch is added". A saved branch keeps its origin.
  - "A saved branch id belongs to this form connection and isn't deleted". Message: "Unknown variant.". The main branch can't be left out of a save. With `replace: true`, T068 lets a branch that another save deleted come back as a new branch.
  - The R4 invariants, with the message "The variant Ambulance is out of step with Standard. Reload the connection and try again.":
    - "Marks appear only in based branches";
    - "every main-branch item appears once in each based branch";
    - "unmarked and removed items equal the main branch's", equal as data-model.md "Validation" defines it: only the fields that count as a change, never a group's members or an item's place. A rule added to an inherited group, and inherited rules grouped in the branch, pass;
    - `operator_mark` is "`changed` or `null`", "Only in a based branch", and an unmarked top-level operator equals the main branch's;
    - a `changed` item may equal the main branch's item (FR-024).
  - In a based branch, an inherited group may have fewer than two active members, through derived dissolution (data-model.md "Dissolution"). An `added` group needs two.
  - Taken names in a based branch: the names of removed items, and the main branch's name of every `changed` item (FR-005).
  - Removed items are checked like the others.
  - A problem in an item that based branches inherit unchanged (unmarked or removed) is reported once, for the main branch (FR-006).
- [X] T054 [US3] Evaluate a branch's marks in `backend/app/services/evaluation.py`, with tests in `backend/tests/unit/test_evaluation.py` (FR-008, FR-009; research R7; data-model.md "Dissolution").
  - Items marked `removed` aren't evaluated or reported.
  - An inherited group whose active members (data-model.md "Dissolution": not `removed`, and not moved into a group of the branch's own) number fewer than two counts as dissolved:
    - it isn't reported;
    - its remaining member, if any, is evaluated in its place, with `group` naming the level that contained the group.
  - A branch whose rules are all removed is met.
  - `evaluation.branch` carries the branch's `id` and its name in the request's rule set.
  - Tests: removed rules and groups, a dissolved group, its return once two members are active, and a sub-group the branch formed inside an inherited group, which counts as one member of it.
- [X] T055 [US3] Serve the pull URL of every other branch, in `backend/app/services/document_requests.py` and `backend/app/routers/connect.py` (FR-025, FR-027; research R3; contracts/integration-api.md "Order of the checks").
  - The route: `GET /api/connect/{form_connection_id}/branches/{branch_id}/requests/{reference}` (`get_branch_document_request`):
    - a plain `def`, which maps EUDIPLO errors like the main pull URL;
    - the main branch's URL keeps evaluating the main branch.
  - The checks, in order:
    1. unknown form connection: `404` ("Request not found");
    2. deactivated or deleted form connection: `409 unavailable`;
    3. unknown branch, a branch of another form connection, or the main branch, whose pull URL is spec 001's: `404`;
    4. deleted branch: `409` `{"error": "unavailable", "message": "This variant was deleted"}`, for every request;
    5. unknown reference, or a reference of another form connection: `404`;
    6. a branch not in the request's rule set, including every request triggered before this feature: `409` `{"error": "branch_added_later", "message": "This variant didn't exist when the request was triggered"}`, without status or documents;
    7. otherwise: `200`, with the status, the documents and the branch's evaluation.
  - Delivery state stays per request. Every branch's pull URL answers with the same status and documents, and the first delivery through any branch starts the repeat window for all.
  - Check that the new path is covered by `_REFERENCE_IN_PATH` in `backend/app/main.py`, and by the `connect_path` map and the `location /api/connect/` allow-list in `frontend/nginx.conf`. Change them only if they don't cover it (research R3).

### Tests for User Story 3 (backend)

- [X] T056 [US3] Extend `backend/tests/unit/test_rules_validation.py` with T053's checks (depends on T053):
  - variant names that differ only in letter case;
  - an unknown or deleted branch id;
  - a changed origin;
  - marks in the main branch or in an empty branch;
  - a main-branch item that is missing from a based branch, or there twice;
  - an unmarked item that differs from the main branch's;
  - a changed item that equals it, which is accepted;
  - a rule added to an inherited group, and inherited rules grouped in the branch, which are accepted;
  - taken names;
  - a problem reported once, for the main branch;
  - 21 branches.
- [X] T057 [US3] Write `backend/tests/api/test_connect_branches.py` (depends on T055). It covers:
  - each answer of the order of checks, including `404` for the main branch's id in a branch URL;
  - the same status and documents through both branches, with different evaluations (US3-AS8);
  - after a save in which Standard changes a rule that Ambulance follows, the next request pulled through Ambulance's URL is evaluated with Standard's new version, while Ambulance's changed rule stays its own (SC-006, US3-AS3);
  - the repeat window, shared across branches;
  - a renamed branch, which keeps its URL;
  - a branch added after the trigger, which answers `branch_added_later`, also for a request from before this feature;
  - a deleted branch, which answers `unavailable` while the trigger URL and the other branches keep working, also for requests in progress (US3-AS9);
  - deactivating, which makes every branch answer `unavailable`, and reactivating, which restores them (FR-027);
  - the reference on the new path, which the access-log redaction in `backend/app/main.py` replaces.
- [X] T058 [US3] Extend `backend/tests/api/test_form_connection_rules.py` with branches:
  - a save with a based and an empty branch returns their ids and pull URLs;
  - a rename keeps the id and the URL;
  - a branch that a save leaves out is deleted (`deleted_at`), and its id isn't reused;
  - the main branch can't be left out;
  - an out-of-step based branch is refused, and nothing is saved.

### Implementation for User Story 3 (frontend)

- [ ] T059 [P] [US3] Write `frontend/src/utils/rules/branches.ts` with `branches.test.ts` (FR-019 to FR-024; SC-006; research R4, R12; data-model.md "Marks in a based branch" and "Propagation from the main branch"). `branches.ts` isn't done until every propagation rule and mark transition has a test.
  - **New branches**: based on the main branch (a copy of its items, unmarked, following its operator), or empty.
  - **`propagateMain(oldMain, newMain, branch)`** updates a based branch with the rules of data-model.md, and never touches a branch that started empty:
    1. each unmarked or removed item takes the main branch's new content;
    2. an item the main branch deleted disappears, unless the branch changed it: then it stays where it was, marked `added`, with its identifier (EC-12, EC-13);
    3. an item the main branch added appears unmarked, after the nearest preceding sibling that both branches have in the same parent, or first in that parent (EC-14):
       - a rule added to a group that the branch removed appears in it, and isn't evaluated until the group is restored;
       - a rule added to a group that the branch changed appears in it, and follows the main branch;
    4. moves follow the main branch, except a rule inside a group of the branch's own, which stays there (FR-022);
    5. a group the main branch dissolved is dissolved in the branch too, unless the branch changed it. A changed group kept that way with fewer than two members dissolves all the same, and the branch's change goes (FR-022's one exception);
    6. the top-level operator follows the main branch while `operator_mark` is `null`;
    7. a name the main branch gives an item can't clash in a based branch, whether the branch follows the item or changed it, since an undo would bring the name back; a helper returns that branch, so that the rename is refused naming it;
    8. the main branch's ungroup is a deletion plus moves: where the branch follows the group, the group goes and its members take its place; where the branch changed it, it stays as `added` with its members. The main branch's "Delete group" reaches based branches as deletions.
  - **Mark transitions**:
    - edit → `changed`;
    - undo → follows again, with the main branch's content;
    - an edit that makes a `changed` item equal to the main branch's clears the mark, but a main-branch change that makes them equal doesn't (FR-024);
    - remove → `removed`, dropping a changed item's change;
    - restore → follows again. Restoring a group, also one dissolved in the branch, restores the members removed inside it (FR-024);
    - a removed item can only be restored, not changed or deleted;
    - switching an inherited group's AND/OR, or changing its name or message, → `changed` (EC-15);
    - adding a rule into an inherited group marks only the new rule `added`;
    - a group formed in the branch from inherited rules is `added`, and its members stay unmarked and keep following;
    - a duplicate is `added`, with a new identifier;
    - deleting an `added` item removes it.
  - **`copyRule`** (FR-022):
    - each copy is a new rule, not linked, with a new identifier and its default name, at the end of the target's top level;
    - it is `added` in a based branch;
    - a copy to the main branch appears, linked and unmarked, in every based branch, and choosing the main branch covers them;
    - a copy from a based branch to the main branch appears there beside its original.
  - **Confirmations**: the branches whose changed group a main-branch deletion dissolves, and the branches that keep their changed version, for F14's confirmation (rules 2 and 5).
  - A helper in the test file checks every result against T053's invariants, with data-model.md's definition of equal.
- [ ] T060 [US3] Add the derived dissolution to `frontend/src/utils/rules/tree.ts` and the branch checks to `frontend/src/utils/rules/validation.ts`, with tests in `tree.test.ts` and `validation.test.ts` (depends on T059; FR-005, FR-006, FR-008, FR-020; EC-16).
  - `tree.ts`: an inherited group in a based branch counts as dissolved while its active members number fewer than two. Active members are those not removed, and not moved into a group of the branch's own:
    - the view shows the group as removed, with its remaining member in its place;
    - the group comes back once two members are active, through an undo or a member the main branch adds;
    - tests: dissolution in the main branch, in an empty branch and in a branch's own group, which dissolve at once, and the derived dissolution and return in a based branch.
  - `validation.ts`:
    - variant names: a missing one ("Enter a name for every variant.") and a duplicate, ignoring letter case and outer spaces ("Two variants are called Ambulance. Give each variant its own name.");
    - the variant dialog's name check, worded as design-notes.md says (W3);
    - taken names in based branches;
    - a rename in the main branch that would clash in a based branch, which follows the item or changed it, naming that branch (propagation rule 7);
    - problems in inherited, unchanged items reported once, for the main branch;
    - removed items checked like the others;
    - at most 20 variants.
- [ ] T061 [P] [US3] Build `frontend/src/components/BranchMark/` and `frontend/src/components/BranchName/` (S4, S6; W4, F15, F31; FR-020, FR-023; Figma U17 `6134:9009`, `6134:9064`, `6134:8719`, tooltip `6139:32939`; U18 `6163:5856`, `6163:5438`).
  - `BranchMark`: "Changed here", "New addition" or "Removed", each with its colour (tokens from T003) and its text, never colour alone.
  - `BranchName`: the branch's name and, when it has a description, an (i) right after it. The (i) reuses `InfoTooltip` and opens on hover and on keyboard focus. A branch without a description shows no (i).
- [ ] T062 [US3] Add the variant tabs and adding a variant, in `RulesStep/` (S2, S4; F16, W5; FR-019 to FR-021; Figma U17 `6134:8515`–`6148:4545`).
  - `BranchTabs.tsx`, with a `BranchTab` sub-component (F16):
    - one tab per branch, main branch first, each with `BranchName`;
    - "+ Add variant" (U17 `6134:8603`), from the start of the step: also before the first rule, and while a rule is being edited;
    - KERN's tab pattern, with the keyboard. Add the styles of kit components that ship their own, as CLAUDE.md says.
  - The Add variant dialog (U17 `6139:32693`):
    - "Variant name";
    - "Description - Optional", with the helper "Shown when someone hovers the (i) next to the variant name.";
    - "Start with": based on Standard, or empty;
    - name errors shown inline: "Enter a name for the variant." (U26 `6197:12011`), and the duplicate message of design-notes.md.
  - A variant without rules shows the same empty state as Standard (W5, U29 `6197:11654`).
  - `rulesReducer`:
    - every action that changes the main branch runs `propagateMain` on every based branch;
    - actions in a based branch go through T059's functions.
  - The payload sends the branches in tab order, with `id: null` for new ones.
- [ ] T063 [US3] Build each variant tab's menu, in `RulesStep/` (S4; W3; FR-020; Figma U14 `6113:28988`, `6113:29056`; U17 `6139:32693`).
  - A KERN menu on each tab, like the rule's ⋯ menu.
  - "Rename", for every branch, Standard included, opens the Add variant dialog titled "Edit variant", without "Start with", with the same name checks.
  - "Delete", for every other branch, asks for confirmation in design-notes.md's words. The deletion takes effect when the connection is saved.
  - Once Standard has a description, its tab shows the (i) too.
- [ ] T064 [US3] Show and handle marks in based branches, in `RulesStep/` (S2, S4; F12, F13, F15, F29, W4, W8, FYI #10; FR-021 to FR-024; Figma U17, U18 `6163:4850`–`6324:39426`, U19 `6344:53697`–`6344:53873`, U23 `6185:41146`, `6185:41589`).
  - Marks:
    - every changed, added and removed rule and group shows its `BranchMark`. The marked group header follows U18 `6163:5438`;
    - a changed rule keeps its "Changed here" text mark inside a removed group, and a switched operator marks its inherited group "Changed here" (F15);
    - once switched, the top-level operator shows the mark on the first top-level connector (W4).
  - Removed items stay visible, and their menu offers only "Restore".
  - Changed items offer an undo: "Reset to Standard" (U18 `6324:39426`).
  - The link strip (U18 `6344:60020`) shows, and the link icon appears on every linked rule or on none (FYI #10).
  - An inherited group's menu has "Remove" and "Restore" instead of "Ungroup" and "Delete group" (W8). Groups the branch added keep T051's menu.
  - An inherited group dissolved in the branch shows as removed, with its remaining member in its place (F13, U23 `6185:41167`). It comes back once two members are active again.
  - Grouping in a based branch shows the toast "Rule 01 and Rule 02 in Ambulance are now Group 02. Standard stays the same." (F29, U19 `6344:53873`).
  - A rename in Standard that would clash in a based branch is refused where it is entered, naming that branch (F12, U26 `6196:10653`).
  - Standard's changes show at once in every based branch (W4).
- [ ] T065 [US3] Build Standard's delete confirmations, in `RulesStep/` (S4; F14, W8; FR-022; Figma U23 `6185:8805`, `6185:8846`, `6185:8847`).
  - When Standard deletes a rule, the body uses design-notes.md's words:
    - it doesn't say that the rule leaves every variant;
    - it names the variants that changed the rule, which keep their version as "New addition";
    - if the rule is one of a group's two members, it also names the variants whose changed group dissolves with it (FR-022's one exception).
  - Standard's "Delete group" confirmation (W8) names the variants that keep their changed version of the group in the same way.
- [ ] T066 [US3] Copy a rule to other variants, in `RulesStep/` (S4; F29; FR-021, FR-022; Figma U20 `6344:53874`–`6344:54043`).
  - The rule's ⋯ menu offers "Copy to variant".
  - The dialog lists the other branches, with checkboxes. Once Standard is chosen, the branches based on it show as included, and can't be chosen on their own.
  - The copy uses T059's `copyRule`.
  - The toast "Rule 06 copied to School transport." offers "Show", which opens that variant (F29).
- [ ] T067 [US3] Show every branch's pull URL and rules on the details (S6; F24, F26, F31, W2, FYI #13; FR-020, FR-026, US3-AS7), in `frontend/src/pages/FormConnectionDetail/ConnectionLinks.tsx`, `LinkCard.tsx` and `RulesSummary.tsx`.
  - The trigger URL shows once, then one pull URL per branch from its `pull_url`, never derived from its name (F24):
    - each pull URL is labelled with its branch's `BranchName`, (i) included, and has "Copy link" (F31);
    - this also applies right after publishing (U34 `6396:48632`–`6396:48649`, U37 `6396:47732`–`6396:47749`, U38 `6396:48993`–`6396:49005`).
  - With only the main branch, the URLs show exactly as in spec 001, without a branch name or (i) (W2).
  - A truncated URL still copies in full (FYI #13).
  - In `RulesSummary`:
    - each branch's section heading shows `BranchName` with its (i) (F31; U37 `6396:48223`, `6396:48239`, `6396:48255`);
    - the marks and removed items show (F26).

### Protection of other team members' rules (ships with US3)

From US3 on, a save can delete a variant for good, and serviceBW may already use its pull URL. So
a save over another team member's newer rules is refused unless the team member chooses to replace
them (FR-028). These tasks are done before US3 merges, and their backend and UI ship together.

- [ ] T068 [US3] Refuse a save over newer rules, and replace them on request, in `backend/app/services/form_connections.py` and `backend/app/services/rules.py` (FR-028; research R5, R9; management-api.md "Errors added by this feature" and "Saving, step by step").
  - When `rules` is present without `replace`, and `base_version` isn't `current_rule_set`, refuse the save with `409` `{"error": "rules_changed", "message": …}`:
    - check after the name, the serviceBW form and the documents, but before the rules are checked (T015, T053) and before EUDIPLO is called. A stale editor then meets the `409`, not a refusal that its staleness causes, such as "Unknown variant.";
    - check again under the row lock (step 3);
    - save nothing.
  - The message names every branch that replacing would delete (the current branches that the save leaves out), and every branch that it would bring back (the save's branches that another save deleted). It uses the UI's words, "variant" and "result link" (spec Assumptions, "Design"). For example: "Another team member saved the rules of this connection after you opened it. Replacing their changes deletes the variant School transport and brings back the variant Taxi with a new result link.".
  - With `replace: true`, the save goes on and keeps the editor's version whole (FR-028):
    - rules and groups that the other save deleted come back under their identifiers, which T016 accepts because the loaded rule set has them;
    - a branch that the other save deleted comes back as a new branch: T053's branch check lets it through, and T017 gives it a new UUID4 and row, so a new pull URL. Its old pull URL keeps answering `409 unavailable` (FR-027);
    - T016's shift keeps new identifiers unique.
  - The name and the documents keep "the later save wins".
  - A save without `rules` never meets this `409`.
- [ ] T069 [US3] Test saving over newer rules, and changing live rules (depends on T068).
  - `backend/tests/api/test_form_connection_rules.py`:
    - the `409`, with the names of the branches that replacing would delete, and nothing saved;
    - `replace: true`, which saves and shifts new identifiers;
    - `replace: true` over a save that deleted a rule, which comes back under its identifier;
    - `replace: true` over a save that deleted a variant: the `409` named it, it comes back with a new id and pull URL, and its old pull URL answers `unavailable`;
    - a stale save that still holds a variant that another save deleted, which gets the `409`, not "Unknown variant.";
    - a name-only save from a stale editor, which passes;
    - a stale save of documents and rules, which creates no EUDIPLO configuration (the fake's call names).
  - `backend/tests/api/test_connect.py`:
    - request A, triggered before a rule changes, is evaluated with the old rules, and request B with the new ones (US4-AS1, FR-028);
    - adding rules to a live connection without rules (US4-AS2);
    - unchanged URLs in both cases.
- [ ] T070 [P] [US3] Send rules only when they changed, and handle `409 rules_changed` (S5, S7; W9; FR-028; Figma U35 `6376:27178`, U14 `6113:29056`). Files: `frontend/src/pages/FormConnectionEditor/utils.ts`, `PublishDialog.tsx` and `constants.ts`, and `frontend/src/pages/FormConnectionEdit/index.tsx`.
  - When editing, the payload carries `rules` only when the branches differ from the loaded ones, compared rather than tracked by a dirty flag. A save of the name or the documents alone never meets the `409`.
  - On `ApiError` `409` `rules_changed`, the dialog shows design-notes.md's heading, the API's message, which names the variants that replacing deletes or brings back with a new result link, and two actions:
    - "Replace their changes": saves again with `replace: true`;
    - "Reload": fetches the connection again and remounts the editor at the Rules step, dropping the unsaved changes. `FormConnectionEdit/index.tsx` passes an `onReload`, and a key that changes with each load.

**Checkpoint**: Variants work in the Rules step and through their pull URLs, and a stale save can't
delete one silently. Quickstart V4, V5, and V6 steps 7 and 8 pass.

---

## Phase 6: User Story 4 - Change the rules of a live form connection (Priority: P3)

**Goal**: A team member changes the rules of a live connection from its details, without
replacing any URL and without affecting requests in progress. US1 already saves rules in the edit
flow, and the protection against saving over another team member's rules (FR-028) ships with US3
(T068–T070). This story adds:
- the way from the details to the Rules step;
- the warning when data that rules check is removed (FR-029).

**Independent Test**: On a live connection with rules:
1. start a request;
2. change a rule from the details, and save;
3. start a second request;
4. let both complete.

The first request is evaluated with the old rule, the second with the new one, and no URL has
changed. Then deselect a field that a rule checks: the dialog names the rule, and saving is refused
(quickstart V6).

### Implementation for User Story 4

- [ ] T071 [US4] Open the Rules step from the details (S6, S7; F10, F27, W7; FR-030; Figma U37 `6424:34839`, U38 `6396:48909`, `6396:49030`).
  - `frontend/src/types/routing.ts`: `EditLocationState.step` gains `'rules'`.
  - `frontend/src/pages/FormConnectionEdit/utils.ts`: `initialStepOf` returns `'rules'`. Extend T001's `utils.test.ts`.
  - `RulesSummary.tsx` gets an "Edit rules" link, a `Link` with `state: { step: 'rules' }`. `DetailFooter` keeps "Edit documents".
  - The edit wizard opens at the Rules step with "Save" as its primary action (F10), without "Edit this live connection?" on entry (F27).
  - Saving asks for confirmation in the save dialog (W7), in the words design-notes.md took over (F27).
- [ ] T072 [US4] Name the rules before removing the data they check (S1, S7; F18; FR-029, US4-AS3; Figma U10 `6324:40001`, `6324:40326`).
  - In `frontend/src/utils/rules/validation.ts`, `rulesCheckingData(branches, documentType, field?)` returns the rules of every branch, removed items included, that check a document or a field. Test it in `validation.test.ts`.
  - The documents step (`DocumentsStep.tsx`, `DocumentPicker.tsx`, `FieldChecklist.tsx`, and `index.tsx`'s reducer, with the pending removal) opens a new `RemoveDataDialog.tsx` before:
    - removing a document that rules check;
    - deselecting a field that rules check, also through "All data".
  - The dialog follows U10's frames, "Remove Personal ID?" and "Stop requesting Date of birth?":
    - it names the rules with their branches, such as "Rule 01 in Standard" and "Rule 01 in Ambulance", in a list sub-component;
    - in the edit flow, the copy reads "… before you save.".
  - After confirming, the change applies and the rules stay. Publishing and saving are refused while they remain (F11).

**Checkpoint**: Every user story works on its own and together. Quickstart V6 passes.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, accessibility, validation with a real wallet, and the merge gate.

- [ ] T073 [P] Update `docs/ARCHITECTURE.md` (CLAUDE.md "Documentation Checklist": architectural changes):
  - rule sets and branch identities, and the snapshot with its marks;
  - the evaluation at each delivery: Germany's calendar day, never stored, never logged;
  - the branch pull URL and its order of checks;
  - the save ordering with rules, and `409 rules_changed`;
  - `GET /api/option-sets`;
  - propagation, which runs in the browser and is checked by the server's invariants.
- [ ] T074 [P] Update `CLAUDE.md` (Documentation Checklist: new patterns):
  - the backend structure listing: `option_sets.py`, `routers/option_sets.py`, `services/rules.py`, `services/evaluation.py`, and the new endpoint in `routers/connect.py`;
  - the frontend structure: `src/utils/rules/` with its tests, `RulesStep/` and `RuleEditor/`, and the shared `RuleRow`, `GroupFrame`, `Connector`, `BranchMark` and `BranchName`;
  - the rule that propagation lives only in `branches.ts`, every change to it comes with a Vitest case, and the server checks the invariants;
  - the wizard's steps, and `EditLocationState.step` `'rules'`.
  - Keep the F#/W# citation rule of "Figma implementation workflow".
- [ ] T075 [P] Check `README.md` against this feature: Vitest and `npm test` (T001), the script's new options (T023), and the branch pull URLs wherever the README describes the connection URLs.
- [ ] T076 Review accessibility (SC-009; quickstart V7; ui-screens.md "Accessibility"). Apply spec 001's walkthrough to the Rules step (`frontend/src/pages/FormConnectionEditor/RulesStep/`), the rule editor (`RulesStep/RuleEditor/`), the variant dialogs and menus, the publish dialog (`frontend/src/pages/FormConnectionEditor/PublishDialog.tsx`) and the details' rules card (`frontend/src/pages/FormConnectionDetail/RulesSummary.tsx`):
  - marks readable without colour;
  - ≥, < and = not announced;
  - connectors, tab menus and select mode usable with the keyboard;
  - (i) tooltips that open on focus;
  - the focus on the named problem after a refused Publish;
  - 200% zoom and 320 px width.
  Fix every failure in the files concerned.
- [ ] T077 Check the coverage of the Figma deviations (research R13), against `specs/002-connection-rules/contracts/ui-screens.md`:
  - every item of its "Coverage index" (F1–F32, W1–W9) was built by its tasks;
  - every visual-verification table lists the prescribed differences with their item numbers;
  - list what is unresolved, and why, in `specs/002-connection-rules/design-notes.md`.
- [ ] T078 Validate with a real wallet: `specs/002-connection-rules/quickstart.md` V1 to V6, and SC-004's load run of V8, on the local stack with the hosted EUDIPLO. Include the research R14 checks:
  - `driving_privileges` arrives in full;
  - the shapes of `place_of_birth` and `nationalities`;
  - the timings of SC-001 and SC-002.
  Record the results in the pull request.
- [ ] T079 Run the merge gate:
  - backend: `uv run ruff check .`, `uv run ruff format --check .`, `uv run mypy app/ scripts/ tests/`, and `uv run pytest`, with a `DATABASE_URL` whose database name ends in `_test`;
  - frontend: `npm run lint`, `npm test`, `npm run build` and `npm run format:check`;
  - the pull request describes the manual checks of what the gates can't check (constitution, "Development Workflow and Quality Gates"): the quickstart scenarios run for this increment, and their results. That is V1 and V2 for US1, V3 for US2, V4, V5 and V6 steps 7 and 8 for US3, and V6 for US4; T078 records the full run.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies, so it starts at once.
  - T001 comes before every other frontend task.
  - T002 and T003 need the Figma file. T003 follows T002, because both write design-notes.md.
- **Foundational (Phase 2)**: depends on T002 (T006) and T001 (T013, T014). It blocks every user story.
  - Backend order: T006 → T007 → T008 → T009; T004 and T008 → T005 → T010; T004 → T011; T009 and T010 → T012. The migration follows the schemas, as the constitution's workflow orders them.
  - Frontend order: T008 → T013 → T014.
- **User stories (Phases 3–6)**: depend on Foundational, and on each other as described below.
- **Polish (Phase 7)**: T073–T075 can start once the stories they describe are done. T076–T078
  depend on every story being delivered. T079 runs before every merge.

### User Story Dependencies

- **US1 (P1)**: starts after Foundational, and depends on no other story. It is the MVP.
- **US2 (P2)**: starts after US1. It extends US1's rule list, `tree.ts`, `validation.ts`, the
  evaluator's levels and the details' summary.
- **US3 (P2)**: starts after US2. Its propagation (T059) handles groups, ungrouping and dissolution
  (rules 5 and 8), so it needs US2's tree operations. Its backend tasks (T053–T058, T068, T069)
  need only US1's and US2's backend. It merges only with T068–T070 done, because its saves can
  delete a variant for good.
- **US4 (P3)**: starts after US3, and is frontend only. T071 needs US1's details (T043). T072 needs
  `validation.ts` after US3 (T060) to name the rules of every branch.

### Within Each User Story

- Backend: services → router → tests. The evaluator's unit tests come with each evaluator task.
- Frontend: pure modules with their tests → shared components → screens.
- Tasks that touch the same file run in order:
  - `backend/app/schemas.py`: T008, T019;
  - `backend/app/services/rules.py`: T010, T015, T016, T017, T045, T053, T068;
  - `backend/app/services/form_connections.py`: T010, T018, T068;
  - `backend/app/services/evaluation.py` and `backend/tests/unit/test_evaluation.py`: T020, T021, T044, T054;
  - `backend/app/services/document_requests.py`: T022, T055;
  - `backend/tests/unit/test_rules_validation.py`: T024, T045, T056;
  - `backend/tests/api/test_form_connection_rules.py`: T025, T046, T058, T069;
  - `backend/tests/api/test_connect.py`: T026, T046, T069;
  - `frontend/src/utils/rules/tree.ts`: T031, T047, T060;
  - `frontend/src/utils/rules/validation.ts`: T032, T048, T060, T072;
  - `frontend/src/components/Connector/`: T035, T049;
  - `frontend/src/pages/FormConnectionEditor/` (`index.tsx`, `utils.ts`, `types.ts`, `EditorFooter.tsx`, `PublishDialog.tsx`): T033, T034, T041, T042, T052, T070, T072;
  - `frontend/src/pages/FormConnectionEditor/RulesStep/`: T033, T036, T040, T041, T050, T051, T062–T066;
  - `frontend/src/pages/FormConnectionEditor/RulesStep/RuleEditor/`: T037, T038, T039, T040;
  - `frontend/src/pages/FormConnectionDetail/`: T043, T052, T067, T071;
  - `frontend/src/pages/FormConnectionEdit/`: T001, T070, T071;
  - `CLAUDE.md`: T001, T011, T074;
  - `README.md`: T001, T023, T075;
  - `specs/002-connection-rules/design-notes.md`: T002, T003.

### Parallel Opportunities

- **Setup**: T002 alongside T001.
- **Foundational**:
  - T006 alongside T004;
  - T011 alongside T006–T010;
  - T013 and T014 alongside T009–T012.
- **US1**:
  - the backend (T015–T026) and the frontend pure modules (T027–T032) run alongside each other;
  - T019 and T023 run alongside T015–T018;
  - T027, T028 and T031 start together, then T029 and T030 together;
  - T035 follows T029, alongside T030–T032;
  - the UI tasks T033–T043 follow T032 and T035;
  - T024 runs alongside T025 and T026.
- **US2**: the backend (T044–T046) alongside the frontend (T047–T052); T047 and T049 together.
- **US3**:
  - the backend (T053–T058, T068, T069) alongside the frontend (T059–T067, T070);
  - T059 and T061 together;
  - T056 alongside T057;
  - T068 and T069 alongside T070.
- **US4**: T071 alongside T072.

---

## Parallel Example: User Story 1

```bash
# Backend services and frontend pure modules at the same time:
Task: "Validate the rules of a save in backend/app/services/rules.py (T015)"
Task: "Add the evaluation's shapes to backend/app/schemas.py (T019)"
Task: "Add --birth-date and --licence-class to backend/scripts/issue_test_credentials/ (T023)"
Task: "Write frontend/src/utils/rules/conditions.ts with conditions.test.ts (T027)"
Task: "Write frontend/src/utils/rules/dates.ts with dates.test.ts (T028)"
Task: "Write frontend/src/utils/rules/tree.ts with tree.test.ts (T031)"
```

## Parallel Example: User Story 2

```bash
Task: "Evaluate groups and sub-groups in backend/app/services/evaluation.py (T044)"
Task: "Add groups to frontend/src/utils/rules/tree.ts (T047)"
Task: "Build frontend/src/components/GroupFrame/ and a switchable Connector (T049)"
```

## Parallel Example: User Story 3

```bash
Task: "Validate branches and their marks in backend/app/services/rules.py (T053)"
Task: "Write frontend/src/utils/rules/branches.ts with branches.test.ts (T059)"
Task: "Build BranchMark and BranchName in frontend/src/components/ (T061)"
Task: "Refuse a save over newer rules, and replace them on request (T068)"
Task: "Send rules only when changed, and handle 409 rules_changed (T070)"
```

## Parallel Example: User Story 4

```bash
Task: "Open the Rules step from the details (T071)"
Task: "Name the rules before removing the data they check (T072)"
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Complete Phase 1, Setup: Vitest, the design notes and the tokens.
2. Complete Phase 2, Foundational. **Validate**: the migration on a copy of a database with
   connections; their URLs and pulls are unchanged (SC-005).
3. Complete Phase 3, US1. **Validate** with quickstart V1 (without step 2's tab row) and V2,
   using a test wallet.
4. Run the merge gate (T079) and merge. Forms whose conditions must all hold can go live.

### Incremental Delivery

Merge at least at the end of each step, after the merge gate (T079):

1. Setup + Foundational: every connection has a main branch; nothing visible changes.
2. + US1: rules on the main branch, and the evaluation in the pull answer. **This is the MVP.**
3. + US2: OR, groups and sub-groups.
4. + US3: variants, their marks and their pull URLs, with the protection of other team members'
   rules (T068–T070), since a save can now delete a variant for good.
5. + US4: editing from the details, and the removal warning.
6. Polish: documentation, the accessibility review, validation with a real wallet.

### Parallel Team Strategy

- Developer A takes the backend: Foundational, then T015–T026, T044–T046, T053–T058 and T068–T069.
- Developer B takes the frontend: T013–T014, then T027–T043, T047–T052, T059–T067 and T070–T072.
- The frontend's pure modules have their own tests. The UI can be built before its backend is
  done, but it can be checked end to end only once the matching backend task is in.

---

## Notes

- [P] tasks touch different files and depend on no unfinished task in the same phase.
- The [Story] label maps a task to its user story.
- Every UI task cites its screen and its F# and W# items. Every item of the coverage index is cited
  by at least one task, and T077 checks that it was built.
- **Not tasks, because people run them**:
  - the usability sessions of quickstart V4 step 13 and V8 (SC-007, SC-008), with five DO.IT
    participants each;
  - the agreement with serviceBW on how it reads `evaluation` (research R8, R14), which DO.IT
    makes.
- Commit after each task or logical group, and stop at any checkpoint to validate a story.
