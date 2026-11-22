# Bug Assessment: The German copy after four rounds of user tests

- **Slug**: german-copy-user-tests
- **Created**: 2026-11-22
- **Source**: pasted text (no URL), the branch `tmp-german` (`git diff 7f7609e 38a9d09`, 48 files,
  +318 −162) and the testers' feedback (a temporary file, condensed under Report)
- **Verdict**: valid. Grounded in the diff and the feedback. Nothing was looked at in a running
  app (see Reproduction).
- **Severity**: medium. No data is lost and nothing has a security impact, but German speakers
  stumbled over the wording on almost every screen, and the branch as it stands fails pytest, so
  it can't be merged as it is.

The German copy was corrected outside speckit on `tmp-german` (four commits, `3d7644c`,
`af9823f`, `ca85b76`, `38a9d09`; `7f7609e` is `main`). This record brings the corrections into
the product. It is the German speaker's review that spec 009 left open (SC-006; spec 009
design-notes §3.2 and §5.4), so the glossary's rule applies: a correction goes into the glossary
first, then into the code.

**Scope: the wording only.** The diff also holds one change of behaviour, a note under data that
the German wallet lacks. The reporter left it out of this bug on 2026-11-22: its code is not
applied (Proposed Remediation, step 3 names the hunks), and this record doesn't assess it.

**The wording is decided.** The reporter chose it round by round, so this assessment doesn't
re-translate it or reopen it.

## Report (verbatim or summarized)

The feedback came from live recordings of German speakers using the product, in four rounds. The
reporter notes it is "probably not 100% accurate" and partly contradictory, because rounds ran in
parallel. Each item below is followed by what the branch does with it.

**Round 1**

- Sign-in page: "verifiziert" instead of "geprüft", "to convey automated verification rather than
  manual checks". Done (`AUTH_INTRO_COPY.lead`).
- Naming the connection: "Empfehlung" instead of "empfohlen"; "Entwurf" for the draft status;
  "Von Standard übernehmen" for the variant templates. Done for the first two (`nameInfoLines`,
  `draftNote`). The third was replaced in round 4, which keeps "Mit Standard verknüpft
  (empfohlen)".
- Rules page: "Eine Regel ist eine Bedingung, die die antragstellende Person erfüllen muss." Done
  (`RULES_STEP_COPY.hint`).
- Rules page: "Add a comma in the English 'Rules don't change' text". Not done; the English stays
  (Decisions).
- Test page: "Wählen Sie eine Beispielperson aus". Done (`TEST_STEP_COPY.intro`).
- Test personas' data: "abgerufen" instead of "geteilt". Done for the empty value (`notShared`:
  "Nicht abgerufen").
- Forgot password: "wenden Sie sich bitte an Ihre Administratoren". Done, in round 4's wording.

**Round 2** (a chat between testers, pasted)

- Documents hint and the Rules step's empty state. Three wordings were discussed ("Daten ziehen /
  auslesen" was rejected: "the citizen shares and consents, Konnekt doesn't pull"; "geprüften"
  was dropped: it "would suggest that Konnekt will somehow check the data according to some hidden
  rules"). Round 4 replaced both texts again.
- "Not sure what that means: Ihr Team entscheidet, wer einen Antrag stellen kann." The sentence is
  gone from the German empty state.
- "BTW what is the official Gender Term? Bürger*innen? Your current phrase is too bulky." Open
  with the German reviewer (see "Left out on purpose").

**Round 3**

- "mit dem EU-DI-Wallet", not "mit der": "either article works as long as you use the same one
  everywhere". Done: the wallet is neuter in every German text (see Suspected Code Paths).
- Description example: "…im Gebiet wohnen und auf der Straße parken möchten." Done.
- "Körpergröße" and "Gewicht" should match. Done: "Körpergewicht (kg)" (`catalog.py`).
- "Aufnahmedatum des Lichtbildes", the -es form "reads more official". Done (`catalog.py`).
- Rule date note: "Es zählt der Tag, an dem die antragstellende Person ihre Daten teilt." and
  "…erfüllt die Regel". Done (`countedFrom`, `turnsThatDay`).
- Test step: "…als würden die Daten heute abgerufen werden." Replaced in round 4.
- Test result label: "Put the age (Alter) first and the Geburtsdatum in brackets." Done for the
  rules' label everywhere: "Alter (Geburtsdatum)" (`DATE_OF_BIRTH_RULE_LABEL`).

**Round 4**

1. Whole app: add "aus" to the separable verb in nine sentences. Done for all nine, and for five
   more of the same kind (each value only once, years or months, a document's position, the
   consent page, the token dialog). "„geprüfte Daten“ → „verifizierte Daten“ wherever it means
   data from the wallet": done; no "geprüfte Daten" is left in the code.
2. Forgot password: "Wenden Sie sich bitte an Ihre Administratoren, um das Passwort
   zurückzusetzen, und versuchen Sie es erneut." Done.
3. Overview: the hint ("…oder wählen Sie eine aktive Anbindung, um den Anfrage- und den
   Ergebnislink zu kopieren"): done. "„verbindet eine Ihrer Dienste“ → „einen Ihrer Dienste“":
   `main` already says "einen". The delete-draft dialog: "für serviceBW" → "für Ihren Dienst",
   because "the current text is wrong for any city other than Stuttgart": done in German on the
   branch; the English follows in this bug (Decisions).
4. Name step: "Welchen Dienst möchten Sie anbinden?"; the name's tooltip is only "Empfehlung:
   Verwenden Sie den Namen des Dienstes."; "Entwurf: Die Anbindung wird erst aktiv, wenn Sie sie
   veröffentlichen."; the subtitle. All done.
5. Documents: the empty state, and the hint in one sentence. Done.
6. Field lists: "Unterschrift"; "Wohnsitzland" for the driving licence, "to match the ID card".
   Done.
7. Rules: the empty state's two sentences; the nationality hint. Done. "If an example says „21“
   → „mindestens 21 Jahre alt“": no example says so; nothing to change.
8. Message: the label "Nachricht an die antragstellende Person"; the placeholder's second
   sentence. Done, in the rule row, the group, the rule editor and the PDF.
9. Variants: the explanation (ⓘ and dialog), the help of both choices, "Leer", the linked
   banner. Done. "Keep the last part only if step 11 confirms it": kept; every variant has its
   own result link (glossary §2, "result link"; the PDF's `section3Lead`).
10. Test: the date line "Sie testen Ihre Regeln anhand von Beispieldaten. Als Referenzdatum wird
    das heutige Datum verwendet ({0})."; "Neue Daten erstellen" / "Für alle neue Daten
    erstellen". Done. "If the build says „… um falsche Testergebnisse zu vermeiden“": it doesn't;
    nothing to change.
11. Publish: "nach der Veröffentlichung". Done.
12. Published page: the request link's and the result link's explanations. Done.

**Left out on purpose** (the reporter's decisions; not to be reopened):

- "{0} zurück" stays ("liegt mindestens 2 Jahre zurück"); "vor {0}" was rejected.
- "Wählen Sie Werte aus der Liste." and "Wählen Sie, ab wann …" get no added "aus".
- "Bürgerinnen und Bürger" versus "antragstellende Person" across the whole app is open with the
  German reviewer. No such pass here.
- The English empty state of the Rules step is not changed to match the new German.
- Round 4's request for a note on data the German wallet lacks is not part of this bug.

**Decisions** (answered by the reporter on 2026-11-22, before the fix):

- **The wallet note stays out.** Its code on the branch is not applied, and no follow-up is
  planned here.
- **The English delete-draft dialog changes too**: "…so nothing changes for serviceBW." becomes
  "…so nothing changes for your service.", for the testers' reason and because `ui-fixes-batch`
  (B4) already ruled serviceBW out of the UI.
- **All other English stays** as spec 008 has it, word for word (FR-014), the missing comma of
  round 1 included. Where the German now says something else than the English, that is known
  (Risks).

## Symptom

The German reads wrong to German speakers. Terms miss their meaning ("geprüft" for data the
wallet verified), the wallet has the wrong article for the testers ("die Wallet"), imperatives of
"auswählen" lack their "aus", several sentences are unclear ("Ihr Team entscheidet, wer einen
Antrag stellen kann."), a dialog names serviceBW, and four catalog labels are stiff or
inconsistent. Expected: the wording of `tmp-german`.

## Reproduction

At `main` (`7f7609e`), signed in, with "DE" chosen:

1. Sign-in page: "Mit der EUDI-Wallet verbinden", "Geprüfte Daten …".
2. Create a connection: "Welchen Dienst binden Sie an?"; the name's ⓘ has two lines.
3. Documents: the hint has two sentences. With the driving licence: "Gewicht (kg)", "Land des
   Wohnorts", "Unterschrift oder übliches Zeichen".
4. Rules without a rule: "Auch ohne Regeln gibt Konnekt die geprüften Daten …". A rule without a
   check: "Wählen Sie eine Prüfung."
5. Test: "Getestet, als würden die Daten heute geteilt: <date>".
6. Overview, deleting a draft: "…daher ändert sich für serviceBW nichts."

These steps weren't run in a browser: this worktree has no `node_modules` and no `.venv`, and no
database answers on port 5435. They follow from the copy tables at `7f7609e`.

What was run, read-only, at the branch tip (the worktree `tmp-german`, clean at `38a9d09`, with
the wallet note's code still in):

| Check | Result |
|---|---|
| `npm run lint` | pass |
| `npm test` | pass: `rules/` 46 files, 2678 tests; `frontend/` 50 files, 2044 tests; `mcp/` 15 files, 513 tests |
| `npm run build` | pass |
| `npm run format:check` | pass |
| `ruff check`, `ruff format --check` | pass (111 files) |
| `mypy app/ scripts/ tests/` | pass (97 source files) |
| `python -m scripts.export_check_fixtures --check` | exit 0: both regenerated fixtures are current |
| `pytest` | **not run in full**: no database. Seven unit files were run without `conftest.py` (`--noconftest`): 428 passed, 14 failed. Six fail on the new wording (Gap 1); the other eight need the database |

The earlier session's logs (lint, test, build) were written before the last commit, so they don't
cover the tip; the table above does.

## Suspected Code Paths

**The diff's wording** (38 of its 48 files; the other ten hold only the wallet note):

- Frontend copy tables, 14 `constants.ts`: `AuthLayout`, `GroupFrame`, `RuleRow`, `Account`,
  `Authorize`, `ForgotPassword`, `FormConnectionDetail`, `FormConnectionEditor` (and its
  `DocumentsStep`, `RulesStep`, `RulesStep/RuleEditor`, `TestStep`), `FormConnectionList`,
  `utils/connectionPdf`.
- `frontend/src/pages/FormConnectionEditor/ConnectionStep.tsx:80`: the one component the wording
  touches. The name's ⓘ renders `copy.nameInfoLines` (one line in German, two in English) instead
  of the two keys `nameInfo` and `nameInfoAdvice`.
- Rules package: `rules/src/constants.ts` (`DATE_OF_BIRTH_RULE_LABEL`, `RULES_MESSAGES`,
  `EDIT_MESSAGES`, `CONDITION_PROBLEM_MESSAGES`), `rules/src/personas/messages.ts`
  (`testDayLine`), a comment in `rules/src/statements.ts`.
- Backend: `backend/app/services/rules_texts.py` (`choose_data`, four of `CONDITION_PROBLEMS`),
  `backend/app/catalog.py` (four German labels of the driving licence).
- Generated: `rules/src/fixtures/server-messages.json`, `rules/src/fixtures/example-connection.json`
  (regenerated on the branch; `--check` passes).
- Tests that pin the wording: 8 in `rules/src/`, 7 in `frontend/src/` (one of them in part), and
  `frontend/src/utils/connectionPdf/testData.ts`.

**Not on the branch, added by the decision of 2026-11-22**:

- `frontend/src/pages/FormConnectionList/constants.ts:265` (`DELETE_CONNECTION_COPY`, English):
  "…so nothing changes for serviceBW."
- `frontend/src/pages/FormConnectionList/utils.test.ts:327`: pins that sentence.
- `specs/005-connection-drafts/contracts/ui-screens.md:191` and `:287`: the contract that words
  it.

Checked and fine:

- **The wallet's article**: every German text with an article now has the neuter ("dem
  EUDI-Wallet", "das EUDI-Wallet", "Das Wallet"). "die Wallet-Anbindung"
  (`FormConnectionDetail/constants.ts:237`) is a compound of "Anbindung" and is right as it is.
- **The proposed messages**: `GERMAN_FIELD_GENDERS` (`rules/src/messages.ts:45`) is keyed by the
  field's key, and `weight`, `resident_country` and `portrait_capture_date` are neuter before and
  after. So "Ihr Körpergewicht (kg) muss …" and "Ihr Wohnsitzland …" stay grammatical.
- **The version** (spec 011): `version_fingerprint()` leaves out every label and the language
  (`backend/app/services/versions.py:8-19`), so the four new catalog labels change no
  connection's version and make no printout look out of date.
- **The MCP server**: `mcp/src/` never passes a language, and neither `mcp/` nor
  `mcp/plugin/skills/` quotes German. Nothing to change there.
- **`docs/`, `README.md`, `CLAUDE.md`**: none quotes a replaced sentence.
- **serviceBW in the UI**: after the fix no copy table names it; the delete-draft sentence was
  the last one in both languages.

**Gap 1: backend tests pin the old sentences** (confirmed; pytest fails on the branch). Seven
assertions:

| Test | Line | Old sentence | Confirmed by |
|---|---|---|---|
| `backend/tests/unit/test_rules_validation.py::test_a_rule_needs_its_data_in_german` | 1294 | "Rule 01 in Standard: Wählen Sie die zu prüfenden Daten." | run, fails |
| `…::test_every_condition_problem_in_german` | 1406 | "Wählen Sie eine Prüfung." | run, fails |
| same | 1416 | "Wählen Sie mindestens einen Wert." | run, fails |
| same | 1426 | "Wählen Sie jeden Wert nur einmal." | run, fails |
| same | 1441 | "Wählen Sie Jahre oder Monate." | run, fails |
| `backend/tests/unit/test_check_fixtures.py::test_the_reference_sentence_is_the_glossarys` | 319 | "Rule 01 in Standard: Wählen Sie die zu prüfenden Daten." | run, fails |
| `backend/tests/api/test_language.py` | 630 | the same sentence | read only (needs the database) |

No backend test pins one of the four changed catalog labels (searched `backend/tests/` for
"Gewicht (kg)", "Lichtbilds", "Land des Wohnorts", "übliches Zeichen": no hit).

**Gap 2: the glossary** (`specs/009-language-toggle/contracts/glossary.md`). The fix changes it
first, in 23 rows:

| Line | Row | What changes |
|---|---|---|
| 40 | condition, check | "Wählen Sie eine Prüfung aus." |
| 50 | field, data | "Wählen Sie die zu prüfenden Daten aus." |
| 69 | wallet, EUDI Wallet | add the gender: neuter, "das Wallet", "das EUDI-Wallet", "mit dem EUDI-Wallet" (as line 189 does for "das Token") |
| 84 | today in Germany | the new test-day line |
| 121 | copy (a rule to a variant) | "Wählen Sie eine andere Variante aus, in die …" |
| 135 | verified citizen data | "verifizierte Daten von Bürgerinnen und Bürgern"; "Verifizierte Daten … einfach empfangen"; "Mit dem EUDI-Wallet verbinden" |
| 139 | "Message for citizens:" | "Nachricht an die antragstellende Person:" |
| 152 | admin (forgot password) | the new sentence |
| 167 | the wizard's step 1 | "Welchen Dienst möchten Sie anbinden?" |
| 177 | eligibility rules | the German of "Your team decides who can apply." is no longer used; the empty state has the two new sentences |
| 179 | linked to, "Start with", "Start empty" | "Leer"; the link strip's new sentence |
| 185 | the consent page | "Wählen Sie aus, was der Agent tun darf." |
| 191 | the test step's intro | "Wählen Sie eine Beispielperson aus, …" |
| 192 | "Generate all" / "Generate again" | "Für alle neue Daten erstellen" / "Neue Daten erstellen" |
| 195 | "Not shared" | "Nicht abgerufen"; its note no longer points at the old test-day line |
| 201 | the message field's placeholder | the new second sentence |
| 271 | "Rule 01 in Standard: choose the data to check." | "… Wählen Sie die zu prüfenden Daten aus." (`test_check_fixtures.py:319` pins this row) |
| 293 | the date notes | "Es zählt der Tag, an dem …"; "Wer an diesem Tag 21 wird, erfüllt die Regel." |
| 295 | the rule editor's hints | "… Wählen Sie den zu prüfenden Bestandteil aus."; the nationality hint |
| 303 | Date of birth (Age) | "Alter (Geburtsdatum)" |
| 316 | Weight (kg) | "Körpergewicht (kg)" |
| 317 | Portrait capture date, Signature or usual mark | "Aufnahmedatum des Lichtbildes", "Unterschrift" |
| 321 | Resident country | "Wohnsitzland" |

**Gap 3: other specs that quote replaced wording.** Searched `specs/`, `docs/`, `.specify/`,
`mcp/`, `README.md` and `CLAUDE.md` for every replaced sentence. Each hit is either a contract
(update) or a dated record (leave):

| Place | Kind | Action |
|---|---|---|
| `specs/009-language-toggle/contracts/rules-texts.md:27`, `:29` | contract (example sentences of the composers) | update: "Alter (Geburtsdatum)", "… Daten aus." |
| `specs/009-language-toggle/contracts/api-language.md:104` | contract (the parity fixture's example) | update |
| `specs/009-language-toggle/design-notes.md` §3.2 | the review's log | add a dated entry "2026-11-22, user tests" with one row per correction, in the table's columns; it supersedes "Geburtsdatum (Alter)" as "kept on purpose" (line 711) and the rows of lines 725 and 727 |
| same, §5.1 (SC-006's row) and §5.4 (second bullet) | closing report | update: the German speakers' review happened, with a pointer to this record |
| same, §2.2 (about 20 rows between lines 225 and 658) and §3.2's rows of 2026-11-10 | dated verification records | leave |
| `specs/009-language-toggle/tasks.md:117`, `:118`, `:187`, `:231` | history | leave |
| `specs/008-kern-revamp-redesign/spec.md:1357` | contract: the test-day line in both languages, "without a final full stop in either language" | update the German, and that sentence: the German is now two sentences with full stops |
| `specs/008-kern-revamp-redesign/spec.md:1420` | contract: the message label's German | update |
| `specs/008-kern-revamp-redesign/design-notes.md:3494` | dated verification row | leave |
| `specs/011-connection-pdf/contracts/pdf-document.md:174`, `:182`, `:184` | contract (the table of `PDF_TEXTS`) | update: "Das Wallet fragt …", the label, `writeMessage` |
| `specs/011-connection-pdf/design-notes.md:1319` | a wording decision ("…, not "Nachricht an …"") that is now reversed | update, with the date |
| `specs/011-connection-pdf/design-notes.md:1255` | a record of where the PDF's texts live, with two German examples | leave |
| `specs/010-revamp-backend-gaps/design-notes.md:3914` | a task's note that quotes "Wählen Sie eine Position von 1 bis <n>." (not in the reporter's list) | leave |
| `specs/005-connection-drafts/contracts/ui-screens.md:191`, `:287` | contract: the English delete-draft sentence | update: "…for your service." |
| `specs/005-connection-drafts/tasks.md:401`; `specs/008-kern-revamp-redesign/design-notes.md:2051`, `:4744`, `:4817` | history and dated verification rows with the English sentence | leave |
| `.specify/bugs/test-results-v5/` (9 lines), `.specify/bugs/new-visuals/assessment.md:364` | other bug records | leave |
| `specs/*/prototype/` | history | no hit |

**Gap 4: the English column.** The glossary says its English column is spec 008's copy, word for
word (FR-014). With the wallet note left out, the diff changes English in one place, and the
decision adds one:

| English string | Change | What it needs |
|---|---|---|
| `EDITOR_COPY.en.nameInfo`, `.nameInfoAdvice` → `.nameInfoLines[0]`, `[1]` | restructured; both sentences word for word | nothing: no spec and no glossary row names the keys |
| `DELETE_CONNECTION_COPY.en.draft` | "…for serviceBW." → "…for your service." (decision) | its test and spec 005's two contract lines (Gap 3). No glossary row quotes it; "your service" is the glossary's term (line 160) |

No English catalog label, server message, rules text or fixture line changes. Spec 008's
`spec.md` needs no English change, and the glossary's English column stays as it is.

**Gap 5: a comment's number.** `frontend/src/components/RuleRow/constants.ts:46` (on the branch)
says the new label is "about 270px at 14/600". It measures 259 px (see "What the test step must
check"). The line is also 109 columns long.

## Root Cause Hypothesis

Spec 009's German was written and reviewed without a German speaker. The glossary was "accepted
as written by the user … because no one is available to review it", and the walk of the screens
was done by the user, who "does not read German" (spec 009 design-notes §3.1, §3.2). §5.4 left "a
German-speaking team member's skim of the live German screens" open. The user tests are that
review. Confidence: **high**.

## Proposed Remediation

**Preferred**: apply the branch's wording as it is, and close the gaps around it. In this order,
because the glossary comes first:

1. **Glossary** (`specs/009-language-toggle/contracts/glossary.md`): change the 23 rows of Gap 2.
2. **The review's log** (spec 009 design-notes §3.2): a dated entry with one row per correction
   (where, English, German before, German after, glossary changed?, applied in), taken from the
   diff; then §5.1 and §5.4.
3. **The code**: from this worktree, `git cherry-pick -n 7f7609e..38a9d09`. `HEAD` is `7f7609e`,
   the range's base, so the four commits apply without conflicts, and `-n` leaves them staged and
   uncommitted. Git needs
   `GIT_DIR=/home/debian/batch27-faro/worktrees/german-copy-user-tests` and
   `GIT_WORK_TREE=/home/debian/batch27-faro/german-copy-user-tests` here (the worktree's pointer
   names a path on another machine). Nothing of the copy is retyped.

   Then take the wallet note out again, the one part that isn't applied:
   - **Restore to `HEAD`** (every hunk is the note's): in `frontend/src/pages/FormConnectionEditor/`,
     `DocumentsStep/DocumentDetail.tsx`, `DocumentsStep/FieldGroup.tsx`,
     `DocumentsStep/FieldRow.tsx`, `DocumentsStep/types.ts`,
     `RulesStep/RuleEditor/MenuChoiceItem.tsx`, `RulesStep/RuleEditor/index.tsx`,
     `RulesStep/RuleEditor/types.ts`, `RulesStep/RuleEditor/utils.ts`.
   - **Remove** (new files): `frontend/src/utils/germanWallet.ts`,
     `frontend/src/utils/germanWallet.test.ts`.
   - **Edit** (wording and note in one file; keep the wording):
     - `DocumentsStep/constants.ts`: drop `notInGermanWallet` and its comment from both columns;
       keep the new `emptyText`.
     - `RulesStep/RuleEditor/constants.ts`: drop `notInGermanWallet` and its comment from both
       columns, and `CHOICE_MENU_METRICS.notedRow` with its comment; keep the rest.
     - `RulesStep/RuleEditor/utils.test.ts`: drop the imports `OPTION_SETS_DE`,
       `choiceMenuHeight` and `partSections` and the test "notes the data and parts the German
       EUDI Wallet leaves out"; keep "Alter (Geburtsdatum)" and the two date-note expectations.
   - Afterwards a search of `frontend/` for `germanWallet`, `notInGermanWallet` and `notedRow`
     finds nothing.
4. **The English delete-draft sentence**: `FormConnectionList/constants.ts:265` and
   `utils.test.ts:327` to "…so nothing changes for your service."
5. **Backend tests**: change the seven assertions of Gap 1 to the new sentences.
6. **Spec contracts**: the "update" rows of Gap 3.
7. **The comment** of Gap 5: the measured width, within 100 columns.
8. **Checks**: `npm run lint`, `npm test` and `npm run build` from the root; Ruff, mypy and
   pytest in `backend/` (pytest needs the test database on port 5435);
   `uv run python -m scripts.export_check_fixtures --check`.

**Alternatives**:

- **Apply the diff file by file**, leaving the ten note-only files out of the patch
  (`git diff 7f7609e 38a9d09 -- . ':(exclude)<file>' … | git apply --index`). The same result;
  the three mixed files still need the edits of step 3.
- **Retype the copy** from the feedback: ruled out by the reporter, and the feedback is not the
  decided wording.

**Files likely to change**:

- 38 of the diff's files: 35 as they are on the branch, three in part (step 3)
- `frontend/src/pages/FormConnectionList/constants.ts` and `utils.test.ts` (also the English
  sentence), `frontend/src/components/RuleRow/constants.ts` (also the comment)
- `backend/tests/unit/test_rules_validation.py`, `backend/tests/unit/test_check_fixtures.py`,
  `backend/tests/api/test_language.py`
- `specs/009-language-toggle/contracts/glossary.md`, `contracts/rules-texts.md`,
  `contracts/api-language.md`, `design-notes.md` (§3.2, §5.1, §5.4)
- `specs/008-kern-revamp-redesign/spec.md`
- `specs/011-connection-pdf/contracts/pdf-document.md`, `design-notes.md`
- `specs/005-connection-drafts/contracts/ui-screens.md`

**Tests to add or update**:

- The seven backend assertions of Gap 1. No new backend test is needed.
- `FormConnectionList/utils.test.ts:327`, the English delete-draft sentence.
- The frontend's and the rules package's other tests are already updated on the branch. With the
  note's test and `germanWallet.test.ts` gone, the frontend has 49 test files again, as at
  `main`.
- `rules/src/validation.ts` and the server agree word for word: the parity fixture is regenerated
  and current.

### What the test step must check in the running app

Nothing has been looked at in a browser. The widths below are measured from the repo's Fira Sans
(`frontend/src/assets/fonts/`) with fontkit, not in the app; the old message label measures 242.9
px this way and 243 px in the app (`test-results-v5`), so the method holds.

- **Every German screen the diff touches**, read once in the app: sign-in, forgot password,
  welcome, overview and its delete-draft dialog, step 1 (the card, the name's ⓘ with one line in
  German and two in English), Documents (hint, empty panel, the driving licence's four labels),
  Rules (hint, empty state, the linked banner, the variants' ⓘ and the add-variant dialog with
  "Leer"), the rule editor (hints, date notes, the message's label and placeholder, each changed
  field error), Test (intro, date line, both buttons, "Nicht abgerufen"), the publish dialog, the
  details page (both ⓘ), the consent page, the account page's token dialog.
- **The longer strings wrap and nothing is cut**, at 1455 × 900 and at 320 px:
  - the test-day line: 733 px at 14 px, where the old one was 345 px. It will wrap in the result
    card's head at desktop widths, and the head grows past 48 (spec 008 allows this);
  - "Für alle neue Daten erstellen" (209 px, was 127) and "Neue Daten erstellen" (153 px, was 97)
    in their buttons, beside the sample citizens' chips;
  - the message label, 259 px (was 243): at a container of exactly 560 px the message beside it
    keeps about 16 px less than the 200 px `HANGING_MESSAGE` was sized for;
  - the variants' explanation in the ⓘ bubble and in the dialog, and the rules' empty state;
  - "Nicht abgerufen" (102 px, was 77) on the data card.
- **Windows below 320 px** (320 px at 200 % zoom): the test-day line, the two buttons, the
  message label and the add-variant dialog, in German.
- **The connection PDF in German**: "Das Wallet fragt …", "Alter (Geburtsdatum)" in the rules, the
  four catalog labels in the fields' list, and a draft's gaps ("Wählen Sie eine Prüfung aus.",
  "Schreiben Sie die Nachricht an die antragstellende Person."). A printed version is unchanged
  for an unchanged connection.
- **No wallet note anywhere**: the Documents step's field rows and the rule editor's data and
  part menus look as at `main`.
- **English is unchanged**, apart from the delete-draft dialog ("…for your service."): walk the
  same screens once in English.
- **The server's German**: a rule without a check saved with `Accept-Language: de` answers the
  new sentence, the same words the website composes.

## Risks & Considerations

- **Merging the branch as it is breaks CI**: pytest fails on seven assertions. The fix must
  include step 5.
- **Taking the note out is the one manual part.** A leftover (an unused import, `notedRow`, a
  `note` prop) would pass a quick look. `npm run lint` catches unused imports, and step 3's
  search catches the rest.
- **German and English now say different things in places**, by decision: step 1's subtitle, the
  name's ⓘ (one sentence against two), the draft note, the documents hint (one sentence against
  two), the rules' hint, the rules' empty state, the variants' explanation (the German has an
  example), the test-day line, the result link's explanation, "Leer" against "Start empty", and
  the forgot-password text. Spec 009's check that no English is left in German (SC-002) still
  passes. A later translator must not "fix" one language from the other.
- **Longer German**: the test-day line more than doubles, and two buttons grow by about 60 %.
  Nothing overflows by construction (the texts wrap), but only the app shows it.
- **Catalog labels are read live**, so the four new labels appear at once in every existing
  connection, rule statement and PDF. Rule messages that team members wrote with the old labels
  are their own text and don't change.
- **Local drafts and saved drafts** hold no copy, so nothing stored goes stale.
- No API change, no migration, no new dependency, no security or performance impact.

## Open Questions

None. The three questions this assessment raised were answered on 2026-11-22 (Report,
"Decisions").
