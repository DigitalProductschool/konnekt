# Bug Fix: The German copy after four rounds of user tests

- **Slug**: german-copy-user-tests
- **Fixed**: 2026-11-22
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

The German wording of `tmp-german` is in the product: the four commits were cherry-picked unchanged,
the wallet note's code was taken out again, and the gaps around the wording were closed: the
glossary first (23 rows), the review's log, the English delete-draft sentence, the seven backend
assertions, the spec contracts and the message label's comment. Nothing of the copy was retyped.

## Changes

49 files: 38 of the diff's 48 (35 as on the branch, 3 in part), 3 backend tests, 8 spec files.

| File | Change | Notes |
|---|---|---|
| `backend/app/catalog.py` | modified (branch) | the driving licence's four German labels |
| `backend/app/services/rules_texts.py` | modified (branch) | `choose_data`, four `CONDITION_PROBLEMS` with "aus" |
| `frontend/src/components/AuthLayout/constants.ts`, `GroupFrame/constants.ts` | modified (branch) | |
| `frontend/src/components/RuleRow/constants.ts` | modified (branch + Gap 5) | the label from the branch; the comment's width corrected (below) |
| `frontend/src/pages/{Account,Authorize,ForgotPassword,FormConnectionDetail}/constants.ts` | modified (branch) | |
| `frontend/src/pages/FormConnectionEditor/constants.ts`, `ConnectionStep.tsx`, `utils.test.ts` | modified (branch) | `nameInfoLines`, one line in German, two in English |
| `frontend/src/pages/FormConnectionEditor/{RulesStep,TestStep}/constants.ts`, `utils.test.ts` | modified (branch) | |
| `frontend/src/pages/FormConnectionEditor/DocumentsStep/constants.ts` | modified (branch, in part) | new `emptyText` kept; `notInGermanWallet` and its comment dropped from both columns |
| `frontend/src/pages/FormConnectionEditor/RulesStep/RuleEditor/constants.ts` | modified (branch, in part) | wording kept; `notInGermanWallet` (both columns) and `CHOICE_MENU_METRICS.notedRow` dropped with their comments |
| `frontend/src/pages/FormConnectionEditor/RulesStep/RuleEditor/utils.test.ts` | modified (branch, in part) | "Alter (Geburtsdatum)" and the date notes kept; the note's test and its three imports dropped |
| `frontend/src/pages/FormConnectionList/constants.ts`, `utils.test.ts` | modified (branch + decision) | German from the branch; English delete-draft sentence "…for your service." |
| `frontend/src/utils/connectionPdf/{constants,testData}.ts`, `gaps.test.ts`, `model.test.ts` | modified (branch) | |
| `rules/src/constants.ts`, `personas/messages.ts`, `statements.ts` and 9 `*.test.ts` | modified (branch) | |
| `rules/src/fixtures/example-connection.json`, `server-messages.json` | modified (branch, generated) | `--check` passes, so they match the generator |
| 8 note-only files under `FormConnectionEditor/DocumentsStep/` and `RulesStep/RuleEditor/` | restored to `HEAD` | `DocumentDetail.tsx`, `FieldGroup.tsx`, `FieldRow.tsx`, `types.ts`; `MenuChoiceItem.tsx`, `index.tsx`, `types.ts`, `utils.ts` |
| `frontend/src/utils/germanWallet.ts`, `germanWallet.test.ts` | not added | new on the branch, the note's only |
| `backend/tests/unit/test_rules_validation.py` | updated test | five assertions (Gap 1) |
| `backend/tests/unit/test_check_fixtures.py` | updated test | the glossary's reference sentence |
| `backend/tests/api/test_language.py` | updated test | the German validation message |
| `specs/009-language-toggle/contracts/glossary.md` | modified | the 23 rows of Gap 2, each marked "changed 2026-11-22 in the user tests, design-notes §3.2" |
| `specs/009-language-toggle/design-notes.md` | modified | §3.2: a dated entry and 40 rows; §5.1 SC-006; §5.4 second bullet |
| `specs/009-language-toggle/contracts/rules-texts.md`, `api-language.md` | modified | example sentences |
| `specs/008-kern-revamp-redesign/spec.md` | modified | the test-day line and its full stops; the message label's German and its width (see Deviations) |
| `specs/011-connection-pdf/contracts/pdf-document.md` | modified | "Das Wallet fragt …", `messageLabel`, `writeMessage` |
| `specs/011-connection-pdf/design-notes.md` | modified | the reversed "not „Nachricht an …“" decision, dated |
| `specs/005-connection-drafts/contracts/ui-screens.md` | modified | the English delete-draft sentence, twice |

## Diff Highlights

How the branch came in (from this worktree, whose `.git` points at another machine's path):

```bash
export GIT_DIR=/home/debian/batch27-faro/worktrees/german-copy-user-tests \
       GIT_WORK_TREE=/home/debian/batch27-faro/german-copy-user-tests
git cherry-pick -n 7f7609e..38a9d09        # applied cleanly on de825a5 (7f7609e + the assessment)
git restore --source=HEAD --staged --worktree <the 8 note-only files>
git rm --cached frontend/src/utils/germanWallet{,.test}.ts   # and the files themselves
```

The English decision (`FormConnectionList/constants.ts`):

```diff
-      `${name} will be deleted for good. It was never live, so nothing changes for serviceBW.`,
+      `${name} will be deleted for good. It was never live, so nothing changes for your service.`,
```

Gap 5 (`RuleRow/constants.ts`). The branch's "about 270px" was neither the measured width nor
within 100 columns:

```diff
- * label ("Nachricht für Bürgerinnen und Bürger:", 243px at 14/600) leaves the message 200px or more
+ * label leaves the message room: sized for 200px beside the old label (243px at 14/600), it is
+ * about 184px beside "Nachricht an die antragstellende Person:" (259px at 14/600)
```

## Tests Added or Updated

- `backend/tests/unit/test_rules_validation.py::test_a_rule_needs_its_data_in_german`: "Rule 01
  in Standard: Wählen Sie die zu prüfenden Daten aus."
- `backend/tests/unit/test_rules_validation.py::test_every_condition_problem_in_german`: four
  cases, "Wählen Sie eine Prüfung / mindestens einen Wert / jeden Wert nur einmal / Jahre oder
  Monate aus."; "Wählen Sie Werte aus der Liste." stays as it was, on purpose
- `backend/tests/unit/test_check_fixtures.py::test_the_reference_sentence_is_the_glossarys`: the
  glossary's row and the parity fixture agree on the new sentence
- `backend/tests/api/test_language.py::test_a_rules_validation_message_follows_the_header`:
  `Accept-Language: de` answers the new sentence
- `frontend/src/pages/FormConnectionList/utils.test.ts` (`deleteDialogCopyOf`): the English
  "…for your service." and the German "…für Ihren Dienst nichts."
- From the branch, unchanged: the rules package's 9 test files and the frontend's 7 (one of them
  in part), and `connectionPdf/testData.ts`. Removed with the note: the test "notes the data and
  parts the German EUDI Wallet leaves out" and `germanWallet.test.ts`

## Local Verification

- `docker compose up -d postgres` (this worktree's own container,
  `german-copy-user-tests-postgres-1`, a new volume) and `createdb template_db_test`
- `uv run ruff check .` → all checks passed; `uv run ruff format --check .` → 111 files formatted
- `uv run mypy app/ scripts/ tests/` → no issues in 97 source files
- `uv run python -m scripts.export_check_fixtures --check` → exit 0
- `DATABASE_URL=…5435/template_db_test uv run pytest` → 2643 passed, 0 failed
  (16 min), the seven assertions of Gap 1 among them
- `npm run lint` → pass; `npm run format:check` → pass
- `npm test` → pass: `rules/` 46 files, 2678 tests; `frontend/` 49 files, 2041 tests (50 and 2044
  on the branch: `germanWallet.test.ts`'s 2 tests and the note's test in
  `RuleEditor/utils.test.ts` are gone);
  `mcp/` 15 files, 513 tests
- `npm run build` → pass (Vite's usual chunk-size warning)
- Searches: `germanWallet`, `notInGermanWallet`, `notedRow`, "German EUDI Wallet", "deutschen
  EUDI" in `frontend/`, `rules/`, `mcp/`, `backend/app` → nothing. "geprüfte Daten", "der/die
  EUDI-Wallet", "Die Wallet" in the copy → nothing. serviceBW in a `constants.ts` → only a code
  comment in `Approval/constants.ts` (an identifier, not copy)
- Manual checks: none. Nothing was looked at in a browser; that is the test step's (assessment,
  "What the test step must check in the running app")

## Deviations from Assessment

- **Gap 5 says more than the number.** Next to the new width (259 px, from the assessment's
  measurement), the comment no longer claims that the message keeps "200px or more". At a 560 px
  container it keeps about 184 px, 16 px less, as the assessment's test-step list says. The same
  claim in `specs/008-kern-revamp-redesign/spec.md` (lines 1424–1425, two lines below the label's
  German that Gap 3 names) was corrected the same way. That file is on the assessment's list; that
  sentence is not.
- **The glossary's row 69** (wallet) gives the neuter in the German column as well ("das Wallet,
  das EUDI-Wallet"), as row 189 does for "das Token".
- **The glossary's row 152** records the testers' "Ihre Administratoren" and "bitte" as an
  exception to its §1 (neutral forms; "bitte" only for "please"), so that a later pass doesn't
  "fix" them. The wording itself is the branch's.
- **The review's log** (§3.2) has 40 rows. Related strings of one screen share a row, as the
  entry of 2026-11-10 does. The dated rows of 2026-11-10 and line 711 are left as they were; the
  new entry says which of them it supersedes.

## Follow-ups

- `/speckit-bug-test slug=german-copy-user-tests`: the walk of "What the test step must check in
  the running app". This worktree's Postgres was stopped afterwards; `docker compose start
  postgres` brings it back with the test database.
- Nothing is committed. `cherry-pick -n` staged the branch's files and the later edits are
  unstaged, so `git add -A` before the commit. Git needs the `GIT_DIR` / `GIT_WORK_TREE` pair
  above.
- Open with the German reviewer, not part of this record: "Bürgerinnen und Bürger" against
  "antragstellende Person" across the app (spec 009 design-notes §5.4).
- `npm install`'s `prepare` couldn't run `pre-commit install` (git can't find the repository
  through the worktree's `.git`). The shared hooks directory already has the hook from an
  earlier install, so a commit made with the `GIT_DIR` / `GIT_WORK_TREE` pair still runs it.

## Amendment after the test (2026-11-22)

The fix was committed as `49a3cde`. The test step (`test.md`, R1) then found one regression. The
longer "Neue Daten erstellen" squeezed the Test step's heading "Daten von <Name>" to 26 px at
1024 px and up, where it broke mid-word over six lines. The wording stays; the layout changes.
This change is not committed yet.

| File | Change | Notes |
|---|---|---|
| `frontend/src/pages/FormConnectionEditor/TestStep/PersonaHead.tsx` | modified | The heading is `flex-auto` (it keeps the width of its words) instead of `flex-1` (basis 0), and both buttons sit in one wrapping group. Where they don't fit beside the heading, they move together to the line under it, at its start, as "Generate all again" does in the chips row |
| `specs/008-kern-revamp-redesign/spec.md` | modified | The 48 px data-card head may now grow when its buttons wrap (the result head already could) |

Measured in the running app (`PersonaHead`'s row, DE and EN):

| Width | German | English |
|---|---|---|
| 1455, 1024 | heading 376 px on one line; both buttons on the line below (head 72 px) | one 48 px line, as before |
| 641 | one line, as before | one line, as before |
| 320 | heading 205 px on one line (it was "Date / n von" before, at `main` too); buttons below | heading on one line; buttons below |
| 160 | heading on two lines, split at the space; buttons break mid-word, like all text in the narrow block | the same |

No horizontal overflow at any width. "Daten bearbeiten" still opens its dialog and gets the focus
back; "Neue Daten erstellen" still makes new values. Checks, all passing: `npm run lint`,
`npm run format:check`, `npm test` (rules 2678, frontend 2041, mcp 513) and `npm run build`.
No backend change. Not changed: test.md's N1 (the "about 184px" in `RuleRow/constants.ts` and
spec 008).
