# Design notes: the stored-data features of the KERN Revamp design

**Created by T001**, filled by the tasks | **Date**: 2026-11-11 | **Spec**: [spec.md](spec.md) |
**Plan**: [plan.md](plan.md) | **Tasks**: [tasks.md](tasks.md) | **Contracts**:
[management-api.md](contracts/management-api.md), [mcp-tools.md](contracts/mcp-tools.md),
[ui-screens.md](contracts/ui-screens.md), [copy.md](contracts/copy.md)

This file holds the evidence and the decisions that `tasks.md` produces: the deviations from the
frames and the tokens (§1), the verification tables, walks and sweeps (§2), the review of the
German copy (§3), the decisions (§4), the history (§5) and the closing report (§6). It is appended
to; nothing here is re-decided.

## 1. Deviations and tokens

- **The Personal ID's nationality stands under "Birth"** (T003, §4.1 call 2; spec Clarification
  2026-11-11, FR-078; data-model §6): frame A5 `7290:61214`–`7290:61255` draws Birth with 3 data
  items and Other details with 5, the nationality among them; the build has Birth 4 (Date of
  birth, Place of birth, Nationality, Sex) and Other details 4. Applies to T072, T073, T074.

## 2. Verification

### 2.1 The per-node tables

| frame | state | width | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|---|

#### T005: every toast closes after 6 s (FR-082, F21, R12, C3)

Editor, documents step, local draft "T005 toast check" (never saved; removed from localStorage
afterwards), 1455 px Chromium window. Toast "Personal ID removed." / "Undo". Times are
`performance.now()` deltas from a MutationObserver on the status region.

| state | measure | expected | actual | result |
|---|---|---|---|---|
| pointer elsewhere | time from "Undo" shown to toast gone | about 6000 ms | 6036 ms | match |
| pointer elsewhere | removal after the toast went | removal stands (documents (0)) | "Added documents (0)", no "Remove Personal ID" | match |
| hovered | toast present after 10 s with the pointer on it | present | present (1) after 10018 ms | match |
| hovered, then pointer left | time from leaving to toast gone | about 6000 ms | 6035 ms | match |
| keyboard focus (Tab from "Set rules") | focus ring on "Undo" | `:focus-visible` | true | match |
| keyboard focus | toast present after 10 s with focus on "Undo" | present | present (1) after 10110 ms | match |
| keyboard focus, pointer entered and left | toast present 8 s after the pointer left, focus still on "Undo" | present (focus still holds it) | present (1) | match |
| focus left (Shift+Tab), pointer elsewhere | time from blur to toast gone | about 6000 ms | 6029 ms | match |
| Escape on focused "Undo" | toast | gone at once | gone (checked after 200 ms) | match |
| Escape on focused "Undo" | focus returns to where it came from | "Set rules" | BUTTON "Set rules" | match |
| Escape on focused "Undo" | removal stands, no dialog | documents (0), 0 dialogs | 0 "Remove Personal ID", 0 dialogs | match |
| hovered, "Undo" clicked after 7 s | action still works after the 6 s mark while held | document back, toast gone | 1 document, toast 0 | match |
| hovered (screenshot t005-hovered.png) | toast layout | unchanged: message and underlined "Undo" | unchanged | match |

### 2.2 The walks (quickstart V1–V12)

### 2.3 The measured sweeps

## 3. The German review

## 4. Decisions

### 4.1 The plan's judgment calls

Settled with the user on 2026-11-11 (T003; plan.md, "Complexity Tracking"). Five confirmed, one
reversed.

| # | Call | Answer | Task it governs | What changed in the documents |
|---|---|---|---|---|
| 1 | The dragged row's copy follows the pointer through `--drag-x` / `--drag-y`, set at run time and read by Tailwind classes (Pointer Events, a pure state machine; R6) | **Confirmed** | T059 | none; the documentation task widens CLAUDE.md's "a measured height" to "a measured value (a height, a drag's offset)" as planned |
| 2 | The nationality under "Birth" in the driving licence and under "Other details" in the Personal ID (frame A5) | **Reversed**: under "Birth" in both documents. Personal ID: Name 4, Birth 4 (`birthdate`, `place_of_birth`, `nationalities`, `sex`, in catalog order), Address 7, Document 6, Other details 4 (`personal_administrative_number`, `picture`, `email`, `phone_number`) | T072 (the catalog's membership and its test), T073 (the test's counts), T074 (frame A5's two groups are a decided deviation, §1) | spec.md: Clarification 2026-11-11 and FR-078; data-model.md §6; research.md R8; plan.md, the note under Complexity Tracking; quickstart.md V11; tasks.md T072, T073 and T074 (carried note). `contracts/` and `contracts/copy.md` state no group membership, so they don't change (copy.md §1 refers to data-model §6 for the names, which are unchanged) |
| 3 | The example requests seven Personal ID data items (`family_name`, `given_name`, `birthdate`, `address_street_address`, `address_house_number`, `address_postal_code`, `address_locality`) and two driving licence ones (`driving_privileges`, `expiry_date`; data-model §5) | **Confirmed** | T064 | none |
| 4 | A change of a variant's description alone writes no activity entry (it still counts as a change for the example's mark) | **Confirmed** | T009 | none |
| 5 | A scheduled connection deleted before its start and restored after it reads "Active since" its scheduled start: the worker activates it with `activated_at` = the start; the restore activates nothing | **Confirmed** | T041 | none |
| 6 | The example variant's banner shows on a variant named as the example's variant ("Ambulance", "Krankentransport", in either language); a renamed or new variant shows none | **Confirmed** | T068 | none |

### 4.2 Decided points

- **T002, the glossary's layout** (T002's UNCERTAIN 1 and 2): copy.md §1's row "Active since /
  Deactivated since (the pill); Published <date> / Deactivated <date> (a row)" stands as two rows
  in the glossary's §2, one for the pill and one for the row, with the wording unchanged; the new
  rows cite "(added 2026-11-11, spec 010, T002)" so that spec 010's task numbers aren't read as
  spec 009's. Kept as T002 wrote them.
- **"Veröffentlicht <date>" / "Deaktiviert <date>" without "am"** (T002's UNCERTAIN 3; the
  coordinator, phase 1): the overview row's date stands where the row's "Edited <date>" stands,
  whose German is "Bearbeitet <date>" without "am" (glossary §2, "view / edit … Edited <date>");
  the four states of one line read alike. The account page's "Verbunden am <date>" and the
  approval page's "Zuletzt gespeichert am <date>" are sentences of other places and don't set the
  row's style. copy.md §1 and T013's line stay as they are.
- **T005, the toast's hold** (T005's UNCERTAIN 1–3; the coordinator, phase 2): the single
  `paused` boolean became a reducer that tracks the pointer and the focus apart
  (`Toast/utils.ts`, tested in `utils.test.ts`), since the boolean restarted the time when one
  left while the other stayed, against FR-082's "restarts when both have left"; CLAUDE.md asks for
  a reducer for several state variables. `utils.ts` is the pure helper the brief's sibling test
  needed. The editor's `showDraftSaveFailure` comment was reworded, not only cut. Kept.
- **T006, the `Actor`** (T006's UNCERTAIN 1–4; the coordinator, phase 2): the moved function is
  public as `activity.agent_name()`, imported by `approvals` as `_agent_name` so that its tests'
  monkeypatch stands; direct test calls of `publish_stored_draft()` pass an approval's actor
  (`agent='Test agent', approved=True`), the others `Actor(name=TEST_USERNAME)`; `actor_of()`
  keeps `agent_name()`'s empty name for an OAuth authorization without its client (not reachable
  today: the client's foreign key has no `ON DELETE`); a bearer's call reads its OAuth client once
  before any lock. Kept.
- **T007, the backfill** (T007's UNCERTAIN 1–3; the coordinator, phase 2): the backfilled entries
  take the positions of §2.2's order (`created` 0, `published` 1, `deactivated` 2), so that a
  connection created published lists "Published" above "Created" instead of by the random id;
  `connection_activity.form_connection_id` has its own index beside
  `ix_connection_activity_connection_time` (data-model §2.1, "indexed"; redundant but harmless);
  the two date `UPDATE`s also fill deleted published rows, as §9's statements are written, while
  the entries are only written for rows that are not deleted. Kept (revision `bfd1be13755d`).
- **T008, the views' state** (T008's UNCERTAIN 1–5; the coordinator, phase 2): T008 added
  `URLS_NOTES.scheduled` to `mcp/src/views.ts` with the contract's sentence (`urlsNoteOf()`
  indexes the notes by state, so it needed the key); T029 checks it, and the direct
  `URLS_NOTES[connection.status]` in `mcp/src/tools/approvals.ts` is carried to T029.
  `_step_of()` reads `draft.get('step')`, so a row whose stored draft is `{}` (the search tests')
  answers `step: null`; `_view()` refuses a draft with `not_published`, as `_published_rule_set()`
  already did; the new rows' `activated_at` and `deactivated_at` stay null until T011 writes
  them; the approval tests' date comparisons are carried to T011. The search's `scheduled` filter
  and `deactivated`'s `start_date IS NULL` are not T008's (its line doesn't name them; US1's
  tasks). Kept.
- **The backfill's `published` entry never before `created`** (the coordinator's review of T007,
  decided with the user on 2026-11-11, phase 2): a connection created published (spec 001's path)
  took its `published_at` from Python a few milliseconds before the database's `now()` set its
  `created_at` (53 of the development database's 66 published rows), so the backfill wrote
  "Published" older than "Created" and the newest-first list read them the wrong way round. The
  user chose to edit the uncommitted revision `bfd1be13755d` rather than add a corrective one: its
  `published` INSERT is written at `GREATEST(published_at, created_at)`, `activated_at` keeps
  `published_at`, `test_migration_status_dates.py` covers both cases, data-model §9 states it, and
  the revision was run down and up again on the development and the scratch database.
- **T009 and T010, the activity's core and endpoint** (their UNCERTAIN 1–7; the coordinator,
  phase 2): `changes_between()` answers `Changes`, a `list[Entry]` with `changed: bool`, true also
  when nothing is recorded but the content differs (a variant's description, the variants' order,
  a linked variant's changes that only follow Standard): the example's mark (T064) reads it. A
  linked variant's own rules are its marked items as (id, kind, its own enclosing group or none,
  content), with `changed` and `added` alike (propagation turns one into the other); a `removed`
  item counts by id and place while Standard keeps that item; "position" is the enclosing own
  group, not an index, which propagation moves. Accepted edge: Standard deleting a member of a
  variant's own group so that the group dissolves gives that variant a second entry. A variant
  added with rules of its own also gets `rules_changed`; one added as a plain copy of Standard
  only `variant_added`. `draft_view()` reads `last_activity` through `object_session(row)`
  (carried to T011, which edits its caller in `approvals.py`); `activity.py` imports from
  `form_connections` inside its functions (the modules import each other); each row of the newest
  instant takes at most one entry of an action; the fake backend's `last_activity` is stored per
  fixture and not recomputed from its `activity` map (the MCP's `get_activity` task checks it).
  Kept.
- **T011, recording in every path** (T011's UNCERTAIN 1–4 and notes; the coordinator, phase 2):
  `drafts.delete_draft()` records nothing while it still removes the row (the cascade would remove
  a `deleted` entry in the same commit); T040's shared `_mark_deleted()` records `deleted` for
  drafts too. A publish whose body has no `rules` (only a hand-made API call: the editor and
  `publish_stored_draft()` always send them) gives Standard a new id in `first_rule_set()`, so it
  records `variant_added` Standard and `variant_removed` for the stored variants: what is stored,
  kept. Deactivating and activating test `is_active`, not `state_of()` (T020 extends deactivating
  to scheduled connections). The name-only `PUT` now takes the row lock, as the line says, so a
  rename racing a delete answers `404`. `draft_view(db, row)` takes `db` at every caller (carried
  T010 note done). `published_shape()` in `test_form_connection_drafts.py` leaves out
  `last_activity` (its own id, time and person), and the test of a failed save's configuration
  cleanup finds the last commit by `current_revision == 2`, since `record()` flushes before the
  commit. Observed, unchanged: if an edit makes a revision current while the worker's re-sync waits
  for EUDIPLO, the re-sync's revision becomes current with the older documents (existing
  behaviour); the activity records it as `documents_changed` without a person. ARCHITECTURE.md
  gets the activity in the documentation task (plan, "The last task applies the documentation
  checklist"). Kept.

### 4.3 Open points

- **The data group "Licence" in German** (T002's UNCERTAIN 4; for T105, before T072): "Führerschein"
  (data-model §6, the glossary's §4 row) is also the name of the document the group sits in;
  T002 proposes "Fahrerlaubnis" or "Führerscheinklassen". Open until T105 asks the user.
- **Spec 009's glossary has two malformed rows** (found by T002; not changed, since T002 changes
  no existing row): the row "the rule editor's field error “Enter a whole number greater than
  0.”" has no third cell, and the row "connection URLs" (spec 009's T042) has a fourth cell that
  holds what reads as the first row's note ("the server's field errors … (added 2026-11-10,
  T038)"). Moving the cell back is a fix to spec 009's record, for the documentation task (T102)
  or the user.

## 5. History

- 2026-11-11: baseline before the feature (T001; R14, R15 V11, SC-011). Node v20.19.2, npm
  9.2.0, uv 0.13.0, Python 3.13.5: `npm install` and Vite 8 work on Node 20.19 (no engines
  warning; only npm's deprecation note for `eslint@9.39.5`), so Node 22 was not needed; CI runs
  the gates on Node 26. `npm install` and `uv sync` left `package-lock.json` and
  `backend/uv.lock` unchanged (`uv sync` noted that the existing `.venv` pointed at a missing
  interpreter and used Python 3.13.5). Root gates green: `npm run lint`, `npm test`,
  `npm run build`. Test counts, the starting point for SC-011: `rules/` 45 test files, 2642
  tests; `frontend/` 31 test files, 1267 tests; `mcp/` 15 test files, 408 tests; `api-types/`
  has no tests. The frontend build warns that a chunk is over 500 kB (as before). Backend: Ruff
  check and format clean (91 files, none changed), mypy clean over 82 source files, pytest
  (`template_db_test`) 2161 passed, 0 skipped, 0 failed; `export_check_fixtures --check`
  current.
- 2026-11-11: the baseline confirmed by the coordinator (T003): every gate rerun after T001 on the
  unchanged code. Lint, build, Ruff (91 files unchanged), mypy (82 files), the fixtures' `--check`
  and pytest (2161 passed) green; `frontend/` 1267 and `mcp/` 408 tests passed. `npm test` failed
  once in `rules/src/personas/performance.test.ts` on two time budgets (SC-003 of spec 004: "three
  different 50-item branches within 1.5 s", 1872 ms on the first of four runs; "3 personas × 20
  branches × 200 items in under 100 ms", 126 ms on the first call) while T001's own run still
  loaded the machine; rerun alone, `rules/` passed 2642 of 2642. **The two budgets fail under
  load**: a later task that sees them fail while another batch runs reruns `npm test -w rules`
  alone before treating it as its own failure.
- 2026-11-11: the plan's six judgment calls settled with the user (T003, §4.1): calls 1, 3, 4, 5
  and 6 confirmed; call 2 reversed (the Personal ID's nationality under Birth), with the
  documents amended before any task builds on it.
- 2026-11-11: phase 2, the foundations (T004–T011), each wave's gates green. Test counts after the
  phase: pytest 2234 passed (2161 at the baseline, +73: `start_dates` 7, the actor 5, the
  migration 3, the views' state 5, the activity's core and endpoint 41, the recording 12);
  `rules/` 2642 and `mcp/` 410 (+2) tests; `frontend/` 32 files, 1274 tests (+7, the toast's
  hold). Ruff, mypy (89 files) and the build clean. Migration
  `bfd1be13755d` (the status dates and the activity) applied to the development database
  `template_db`; its backfill was corrected before any commit (§4.2) and run down and up again.
  Waves ran as planned, with no change of level or batch; the coordinator's pytest rerun was
  skipped for wave 6 at the user's word (the agent's full run, green, came after its last edit),
  and Ruff, mypy and the root gates were rerun.
- 2026-11-11: the foundations' checkpoint (T012, the coordinator). The development database
  holds no published connection that isn't deleted (its 66 published rows are all deleted), so
  the browser check ran on a scratch copy (`template_db_010_t012`, a copy of `template_db` run
  down one revision, one live and one deactivated published row of 2026-11-09 brought back, run
  up again) with this checkout's backend on port 3011 (`WORKER_ENABLED=false`) and Vite on 5175,
  signed in as the development account `p10-alice`, in Chromium (`playwright-chrome`). Results:
  the pre-feature live connection "P11 Führerscheinantrag Esslingen" opens as before (one `h1`,
  "Your connection is active", its links); `GET …/activity` answers its backfilled "published"
  above "created", both without a person, and `last_activity` is "published"; the pre-feature
  draft opens as "This connection is a draft". Deactivating through the details' menu wrote
  `deactivated` by `p10-alice` with `deactivated_at`; "Activate again" wrote `reactivated` by
  `p10-alice`, moved `activated_at` and answers `deactivated_at` null; the draft's "Save and exit"
  after removing a document wrote `documents_changed` by `p10-alice`; a rename and a rename back
  of the live connection merged into one `renamed` row, an unchanged `PUT` wrote nothing, and
  no status date moved (FR-018, FR-026). The documents step's "Driving licence removed." toast
  with "Undo" closed after 6011 ms with the pointer elsewhere (FR-082; T005's table holds the
  hover and focus rows). The backend's log of the run (61 lines) holds no name, person, date or
  entry kind; the app configures no logging, so its own INFO lines don't reach that log: the
  phase's diff adds or changes no log call (`git diff` of `backend/app`, and `activity.py` and
  `start_dates.py` log nothing), and no `console.*` was added. Nothing is left for a person.

## 6. Closing report
