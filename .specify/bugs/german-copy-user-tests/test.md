# Bug Verification: The German copy after four rounds of user tests

- **Slug**: german-copy-user-tests
- **Tested**: 2026-11-22
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: partial

## Summary

The original symptom is gone. All six reproduction steps now show the decided wording in the
running app. Every automated check passes, and the server, the PDF and the English say what
they should. The longer button "Neue Daten erstellen" adds one regression. At widths of 1024 px or
more, the Test step's data card squeezes its heading "Daten von <Name>" to 26 px. The heading
then breaks mid-word over six or seven lines ("Dat / en / vo / n / Len / a"). With `main`'s
"Neu erstellen" it keeps 75 px and reads "Daten von / Lena".

Tested at `49a3cde` (the fix, committed after `fix.md` was written; the working tree was clean),
on `de825a5`, which is `7f7609e` plus the assessment.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| The fix matches `fix.md` | `git diff 38a9d09 49a3cde`, `git diff 7f7609e 49a3cde -- <8 note-only files>` | pass | The code differs from the branch only by the wallet note, the English sentence and the comment. The 8 note-only files are identical to `main`, and `germanWallet*.ts` are absent |
| Reproduction 1–6 (post-fix) | Browser walk, DE, at 1455 × 900 (headless Chrome, dev backend; see Residual Risks) | pass | None of the six reproduces (excerpts below) |
| The rest of the walk ("What the test step must check") | Same walk | pass, except R1 | Checked: sign-in, forgot password, welcome, overview and its hint, step 1 (card, both ⓘ, placeholders), Documents (hint, empty panel, the licence's labels), Rules (hint, empty state, linked banner, the variants' ⓘ, add-variant dialog with "Leer", grouping status), rule editor (date notes, the parts hint per unit test, nationality hint, label, placeholder, the three field errors), group message, Test (intro, date line, both buttons, "Nicht abgerufen · bearbeitet"), the publish dialog, the details page and both ⓘ, the consent page, the token dialog |
| Longer strings at 1455, 1024, 641–675, 320 and 160 px | Measured with `getBoundingClientRect`, plus screenshots | **fail (R1)**, otherwise pass | No horizontal overflow at 320 or 160 px. Nothing is clipped apart from `sr-only` labels. The test-day line, both buttons, the message label (259.9 px, assessment 259 px), the variants' explanation, the add-variant dialog and "Nicht abgerufen" all wrap |
| `main`'s label in the same layout | The button's text set back to "Neu erstellen" in the DOM, then measured again | — | Isolates R1: at 1024 px and up the heading is 26 px now and 75 px with `main`'s label. At 320 px it is the same 42 px either way |
| Hanging message room | Narrowest width with the hanging layout (container content box 560 px, viewport 675) | pass, nit | The message keeps 240 px (a rule at the top level or a group) or 212 px (a rule in a group). The comment and spec 008 say "about 184px" (N1) |
| No wallet note | The licence's field rows, the rule editor's data and check menus | pass | Same lists as at `main`; no note |
| The connection PDF in German | Live download, text extracted with `pypdf` (a throwaway `uv` environment) | pass | Published: "Das Wallet fragt …", "Alter (Geburtsdatum)", "Körpergewicht (kg)", "Wohnsitzland", the label. Draft: "Rule 03 in Standard: Wählen Sie eine Prüfung aus.", "Nicht vollständig: Schreiben Sie die Nachricht an die antragstellende Person." |
| The version is unchanged by labels | `GET` of the published connection with `Accept-Language: de` and `en` | pass | `6B9B-6286-CBA9` in both, although the labels differ. `versions.py` is unchanged by the fix and `test_versions.py` passes |
| The server's German | `POST …/publish` of a draft whose rule has no check, `Accept-Language: de` / `en` | pass | `400` "Rule 03 in Standard: Wählen Sie eine Prüfung aus." / "…: choose a check." These are the words the editor composed |
| English unchanged | Code: every changed source line `7f7609e..49a3cde`. App: sign-in, forgot password, step 1 and its ⓘ, overview, delete dialog, details ⓘ, consent | pass | The only English changes are `nameInfoLines` (both sentences word for word) and "…so nothing changes for your service." (decided) |
| Searches | `grep` for `germanWallet`, `notInGermanWallet`, `notedRow`, "geprüfte(n) Daten", "der/die EUDI-Wallet", "Die Wallet", "Geburtsdatum (Alter)", "Nachricht für Bürgerinnen"; serviceBW in `constants.ts` | pass | No hits. The one serviceBW is a code comment in `Approval/constants.ts` |
| New / updated tests | `DATABASE_URL=…5435/template_db_test uv run pytest` (the seven assertions of Gap 1 among them) | pass | 2643 passed, 0 failed (16 min) |
| Regression suite | `npm test` (root) | pass | rules 46 files / 2678 tests; frontend 49 / 2041; mcp 15 / 513, the same as `fix.md` |
| Lint / type-check | `uv run ruff check .`, `ruff format --check .`, `mypy app/ scripts/ tests/`, `python -m scripts.export_check_fixtures --check`; `npm run lint`, `npm run format:check`, `npm run build` | pass | Ruff: 111 files; mypy: 97 files, no issues; fixtures: exit 0; build: the usual chunk-size warning |

## Output Excerpts

Reproduction, DE, post-fix:

```text
1 Sign-in:   "Mit dem EUDI-Wallet verbinden" / "Verifizierte Daten von Bürgerinnen und Bürgern einfach empfangen"
2 Step 1:    "Welchen Dienst möchten Sie anbinden?"; ⓘ DE: "Empfehlung: Verwenden Sie den Namen des Dienstes." (1 line), EN: 2 lines
3 Licence:   "Körpergewicht (kg)", "Wohnsitzland", "Unterschrift", "Aufnahmedatum des Lichtbildes"
4 Rules:     "Legen Sie fest, welche Voraussetzungen … trotzdem an Ihren Dienst weitergegeben."
             save blocked by "Rule 01 in Standard: Wählen Sie eine Prüfung aus."
5 Test:      "Sie testen Ihre Regeln anhand von Beispieldaten. Als Referenzdatum wird das heutige Datum verwendet (22.11.2026)."
6 Delete:    "…daher ändert sich für Ihren Dienst nichts." / EN "…so nothing changes for your service."
```

R1, `PersonaHead.tsx` (heading width × height, card fixed at `lg:w-410`):

```text
viewport   now ("Neue Daten erstellen")   with main's "Neu erstellen"
1455       26 × 144 px (6 lines)          75 × 48 px (2 lines)
1024       26 × 144 px (6 lines)          75 × 48 px (2 lines)
 320       42 × 72 px                     42 × 72 px   (the same: predates the fix)
"Daten von Natalia" at 1455: 26 × 168 px (7 lines)
```

Backend and npm:

```text
2643 passed in 966.11s (0:16:06)
Test Files 46 passed (46) / Tests 2678 passed   (rules)
Test Files 49 passed (49) / Tests 2041 passed   (frontend)
Test Files 15 passed (15) / Tests 513 passed    (mcp)
lint exit=0  format exit=0  test exit=0  build exit=0
```

## Findings

- **R1 (regression from the fix): the persona's heading collapses on the Test step at 1024 px and
  up.** `frontend/src/pages/FormConnectionEditor/TestStep/PersonaHead.tsx:20-23`. The row is
  `flex flex-wrap`, and the `h2` is `min-w-0 flex-1 break-words`. With a flex basis of 0 the
  heading never makes the buttons wrap. "Daten bearbeiten" (163 px) and "Neue Daten erstellen"
  (186 px) take 349 of the 376 px in the 410 px card (`PersonaPanel.tsx:34`). This hits every
  persona, at every `lg` width, in German only. The English buttons are short. The assessment
  checked these buttons "beside the sample citizens' chips", not in this row. The wording is
  decided, so the fix belongs in the layout: for example, give the heading a minimum width or its
  own line, so that the two buttons wrap under it.
- **N1 (nit): the message's room is understated.** `frontend/src/components/RuleRow/constants.ts:46-47`
  and `specs/008-kern-revamp-redesign/spec.md` (lines 1424–1425) say the message keeps "about
  184px" beside the new label at a 560 px container. Measured, it keeps 240 px, or 212 px in a
  group. The label's 259 px is right. The layout is fine; only the number in the text is off.
- **Seen, not caused by the fix** (same strings or layout at `main`):
  - At 320 px the same heading also breaks mid-word ("Date / n von"), driven by "Daten bearbeiten".
  - "Staatsangehörigkeit" breaks in the data card's fixed `sm:w-120` label column.
  - At 160 CSS px every text breaks mid-word (the narrow block).
  - The ⓘ in "Wird angezeigt, wenn Sie auf das ⓘ …" shows as a missing glyph in this headless
    Chrome, because Fira Sans has no U+24D8 and the machine no fallback font.
  - The rule-in-group note keeps "Bürgerinnen und Bürger", which is the open question the
    reporter left out on purpose.

## Residual Risks

- **Not the real environment.** The backend ran on this worktree's dev database, with the tests'
  `FakeEudiplo` installed by a launcher in the session's scratchpad, not in the repo. Publishing,
  the connection URLs and the worker ran against the fake, not EUDIPLO.
- **One browser.** Only headless Chrome on Linux was used, not Firefox or Safari. "320 px at
  200 % zoom" was stood in for by a 160 CSS px viewport, not real zoom. Widths were measured in
  this machine's font rendering.
- **Partial English walk.** English was walked on the screens listed above. The rest is covered by
  the line-by-line diff, not by looking.
- **`main` was not run side by side.** R1's comparison puts `main`'s button text back into the
  same DOM. That is faithful for this CSS-only layout but is not a run of `main`.
- **Test data left behind.** The dev database `template_db` of this worktree's Postgres (stopped
  again) now holds the account `copywalk` and three connections: one published, two drafts.
  `uv run python -m app.cli clear-connections` and `delete-user copywalk` remove them.
- **Outdated note in `fix.md`.** Its "Nothing is committed" no longer holds: the fix is `49a3cde`.

## Recommendation

Hold. The wording is verified end to end in the running app, and nothing else regressed.
R1, the persona heading that collapses on the Test step at 1024 px and wider, is a visible defect
that the fix's own string introduces. Before merging, change the layout of `PersonaHead`, not
the decided wording, and take N1's number along if convenient. Then re-check the Test step at
1455, 1024 and 320 px in both languages. A new assessment is not needed: the cause and the place
are known.
