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

## 6. Closing report
