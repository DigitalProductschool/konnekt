# Design notes: the connection PDF

**Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

Two kinds of design are involved:
- **The button** has Figma frames and follows `docs/FIGMA-WORKFLOW.md` in its task: "Middleware
  – V5" (`s8mU9oJDq3411e8bxMjQO9`), nodes `6396:48196` (the button) and `6809:46423` (the
  published details with the Summary card), and the draft's details (U93 #10). The decisions
  that spec 008 recorded for these frames stay in force (`specs/008-kern-revamp-redesign/
  design-notes.md`, F53 is what this feature lifts).
- **The PDF** has no Figma frame. Its reference is the prototype's agreed layout,
  `prototype/published-ids-top.pdf` and `prototype/draft-ids-top.pdf` (the `*-bottom.pdf` files
  are the rejected alternative), adjusted by the spec and by §4 and §5 below.

## 1. What the frames show (read during planning, 2026-11-09)

- `6396:48196`: "Download PDF", a KERN **secondary** button (white, action-blue border and label)
  with a download glyph before the label, 177 × 48 px: the regular size, not `kern-btn--small`.
- `6809:46423`: the Summary card's header row holds, left, "Summary" and its counts ("2 documents
  · 9 data items · 3 variants · 4 rules"); right, "Download PDF" and then the tertiary "View
  summary ⌄" toggle, vertically centred. The same header shows whether the Summary is open or
  closed.
- The glyph is the asset `get_design_context` returns for `6396:48196`, saved in
  `frontend/src/assets/icons/` (FIGMA-WORKFLOW §3.5: never substituted); KERN's `kern-icon`
  classes only if the asset is KERN's own download icon.

## 2. The Summary card's header (published and draft details)

`DetailAccordion` gets an optional `actions` slot, rendered between the heading block and the
toggle; only the Summary passes it. The slot holds, in this order:

```text
┌ Summary ───────────────────────────────────────────────────────────────────────────┐
│ Summary                          Version 62D0-715F-01D1  [⤓ Download PDF]  View summary ⌄ │
│ 2 documents · 9 data items · 3 variants · 4 rules                                  │
└────────────────────────────────────────────────────────────────────────────────────┘
```

**The version** (FR-032; the spec's clarification of 2026-11-09 placed it beside the button; no
frame draws it, so this is the proposal):
- Text "Version 62D0-715F-01D1", one line, `whitespace-nowrap`, left of the button with KERN's
  8 px gap: "Version" in `text-kern-static-small` and `text-kern-layout-text-muted`, the code in
  the page's Fira Sans, medium weight, `tabular-nums`, in the default text colour, so a reader
  compares it character by character with a printout. Not `font-kern-mono`: KERN 2.8.2 ships no
  Fira Mono file (spike), so that class falls back to the system's monospace. (Option, not
  taken: an `@font-face` "Fira Mono" in `index.css` on the committed `FiraMono-Regular.ttf`,
  which browsers would load only where the class is used, would print the code as the PDF does.)
- Plain text, not a control and not a tooltip; screen readers read it in place, after the
  counts. No copy button (the details' copy buttons are for links).
- Shown open or closed, on the published (scheduled, active and deactivated) and the draft
  details; the
  value comes from the loaded connection and changes when the page loads a newer one (FR-005).
- Rejected places: in the counts line (it would read as one more count, and the clarification
  put it beside the button); in the status band (not where a reader looks when comparing with the
  PDF the button makes); under the button (a second line in a header that is otherwise one row).

**Narrow screens** (320 px at 200 %, spec 008's rule for the header): the row wraps; the slot
moves under the heading block as its own row (version, then the button) and the toggle stays
last; nothing overlaps and the button keeps its full label and 48 px height. The version wraps
before the button, never inside the code.

## 3. States without frames (build from KERN patterns, as spec 008's W# items)

| State | What shows | Assistive technology |
|---|---|---|
| Idle | "Download PDF" with the glyph | a button |
| Busy (fetching and rendering) | label "Creating PDF…", the glyph kept, `aria-disabled="true"`, clicks ignored (the pattern of `ConfirmDialog`'s busy button); the rest of the page responds (FR-003) | the polite live region says "Creating the PDF…" once |
| Saved | back to idle; the browser's own download indicator shows the file | the live region says "PDF saved." |
| Failed | a KERN danger alert inside the Summary card, under the header row, full width, open or closed: title "Couldn’t create the PDF", the text `ErrorNoticeText` gives (the server's message with a 5xx's error id, or "Check your connection and try again."), and a secondary "Try again" button that starts a new run (FR-004); it disappears when a run starts | the alert's `role="alert"` |
| Gone (404 at activation) | the details' not-found state, as `FormConnectionLoadState` shows it | as today |

The announcements go to a polite `role="status"` region of the button's own, present from mount,
as each `CopyableUrl` has one for "Link copied": the details page has no shared region (§8.1).
Copy goes into `CONNECTION_DETAIL_COPY` (plan.md's `DETAIL_COPY`, §8.1) in
`pages/FormConnectionDetail/constants.ts` as `defineTexts(en, de)` (spec 009): `downloadPdf`,
`creatingPdf`, `creatingPdfAnnouncement`, `pdfSaved`, `pdfFailedTitle`, `pdfFailedText`,
`version(code)`; "Try again" reuses `CONNECTION_DETAIL_COPY.retry` ("Erneut versuchen"). German
proposals: "PDF herunterladen", "PDF wird erstellt …", "Das PDF wird erstellt …", "PDF
gespeichert.", "Das PDF konnte nicht erstellt werden", "Prüfen Sie Ihre Internetverbindung und
versuchen Sie es erneut." (the code's German for the same English, `rulesErrorText`; D2),
"Version {code}".

## 4. The PDF's colours: KERN's tokens and contrast (FR-039)

The prototype's hues are replaced by the app's tokens (the KERN Revamp values of
`frontend/src/index.css`), so the PDF looks like the details page. Contrast against the
background each text sits on:

| Role | Prototype | PDF (token) | Text on background | Ratio |
|---|---|---|---|---|
| Text | `#171A2B` | `#0B1220` layout-text-default | on white | 18.7 |
| Muted text | `#585C6E` | `#4A5468` layout-text-muted | on white / on `#F2F5FB` band | 7.6 / 7.0 |
| Accent (section numbers, rules, AND/OR words, step numbers) | `#0B4F9E` | `#1D56F0` action-default | on white / on `#EEF3FE` action-tint | 5.8 / 5.2 |
| Top band, details box | `#EEF3FA` | `#F2F5FB` layout-background-hued | muted text on it | 7.0 |
| Active pill | `#16683A` on `#E5F3EA` | `#1D7A2E` on `#EAF7E6` (feedback-success) | | 4.9 |
| Deactivated pill | `#5F6270` on `#F2F3F6` | `#4A5468` on `#EFF1F4`, dot `#8C94A1` (ConnectionStatusBadge) | | 6.7 |
| Scheduled pill (spec 010; not in the prototype) | none | as the Active pill, with a hollow dot (ConnectionStatusBadge) | | 4.9 |
| Draft pill, draft accents, dashed box | `#05669E`, dot `#0284C7`, `#E3F1FB` | `#05669E`, dot `#0284C7`, `#E0F2FE` (ConnectionStatusBadge, feedback-info-background) | | 5.4 |
| "Draft · Not live" pill in the band | white on `#0284C7` (**4.1, fails**) | white on `#05669E` | | 6.2 |
| Marks "Changed here", "Added here" | purple `#6B2D8F`, teal `#0D6B6B` | `#8A22B5` on `#F8F1FC` (BranchMark: variant-changed and variant-new share it; the words tell them apart) | | 6.4 |
| Mark "Removed here", removed card | `#5F6270` on `#F2F3F6` | `#4A5468` on `#EEF1F6` (feedback-default) | | 6.7 |
| Removed text (struck through, "faded") | `#8A8D9B` (**3.0, fails**) | `#4A5468` muted, struck through | on `#EEF1F6` | 6.7 |
| Faded AND/OR chip | `#8A8D9B` on `#F2F3F6` (**3.0**, artifact) | `#4A5468` on `#EEF1F6` | | 6.7 |
| Gaps box | `#8A4500` on `#FFF5E6`, bar `#D98A1C` | `#9A4A00` on `#FFF4E0` (feedback-warning), bar the same hue | | 5.8 |
| Lines, frames | `#D3D6E0` | `#D0D5DD` card-divider, `#E1E6F0` decorative-border | (no text) | |
| Watermark | `#0284C7` at 6 % | the same | exempt (FR-039); text under it stays above 15:1 | |

"Faded" therefore means the muted colour plus the strike-through and the "Removed here" badge,
not a light grey: a light grey that keeps 4.5:1 on the removed tint can't be told from the muted
text anyway. All values are written into `utils/connectionPdf/constants.ts` as hex with the
token's name beside each, since the worker can't read CSS.

## 5. Differences from the prototype (intended)

1. Colours as §4, which also fixes the two contrast failures.
2. "To finish before publishing" lists everything publishing would refuse (FR-010, the spec's
   clarification), each gap its own block; its sentence says "parts", not "rules".
3. The rule's "Not complete" note uses the create flow's instruction for every kind of problem,
   not only "Choose a check." and "Write the message for citizens.".
4. A deactivated connection's links section adds the "unavailable" sentence (FR-012).
5. The request link's and the result link's explanations are the details page's texts
   (`DETAIL_COPY.requestLinkInfo`, `resultLinkInfo`), with the PDF's {reference} sentence after
   the latter; the prototype paraphrased them.
6. Headings hold the identifier and the name together ("rule-7 Minimum age"), so moving by
   headings names both.
7. URLs break only after "/" (`urlLines()`), never at a hyphen of a UUID.
8. A rule taller than a page continues on the next page between values; the prototype had no
   such case.
9. The outline (bookmarks) of FR-038, which the prototype lacked.
10. The document's `Author` and `Creator` are the product's name, "Konnekt".
11. Page 1's eyebrow, the top band, the bottom and the watermark are translated in German
    (contracts/pdf-document.md §5); the prototype was English only.
12. The eyebrow keeps its capitals but loses its 1 pt letter spacing, which made copied and
    extracted text read "C O N N E C T I O N D E TA I L S" (spike).
13. The document properties have no custom keys (the prototype wrote `ConnectionId`,
    `ConnectionVersion`, `ConnectionStatus`): Subject and Keywords carry the ID and the version,
    and readers show those.
14. A scheduled connection (spec 010), which the prototype doesn't have: the "Scheduled" pill
    with "as of <generated> · starts on <start date>", and the links section's sentence that the
    links answer "unavailable" until that day (FR-007, FR-012).

## 6. How it is verified

- The button: FIGMA-WORKFLOW §4 at 1440 px (numeric check against `get_design_context`) and the
  narrow check at 320 px / 200 %; the busy, failed and saved states by stubbing the requests.
- The PDF: compared page by page with the prototype's PDFs for the same sample (layout and
  English wording), in a PDF reader at 100 % and printed in black and white (marks, statuses,
  AND/OR and removed items readable without colour); quickstart.md lists the steps.

## 7. Verification

### 7.1 The button, per node

### 7.2 The details page's states

### 7.3 The PDF's pages

### 7.4 Tags, contrast and veraPDF

### 7.5 Version, limits, edge cases and privacy

## 8. Decisions and history

### 8.1 Spec 009's API as built

Looked up on 2026-11-12 (T002) in this checkout, where spec 009 is implemented. Where the name as
built differs from plan.md's, the name as built wins and later task lines are read with this
table; the "for" column names the tasks that must read it.

| Name in plan.md / tasks.md | Name as built | File | For |
|---|---|---|---|
| `Language` | `Language` (`'en' \| 'de'`), with `LANGUAGES`, `DEFAULT_LANGUAGE` (`'en'`) and `isLanguage()`; imported as `@connection-portal/rules/language` | `rules/src/language.ts` | all |
| `defineTexts` | `defineTexts(en, de)`: `de` is typed by `en` (`NoInfer`), so a German column that lacks or adds a key fails `tsc` | `rules/src/language.ts` | T013, T031 |
| `useCopy` | `useCopy(table)`: the table's column in the website's language | `frontend/src/hooks/useLanguage.ts` | T031 |
| `useLanguage` | `useLanguage()` → `{ language, setLanguage }` (`LanguageContextValue`) | `frontend/src/hooks/useLanguage.ts`, `frontend/src/components/LanguageProvider/types.ts` | T030 |
| `RuleContext.language` | `RuleContext.language?: Language`; English when left out | `rules/src/types.ts` | T016, T019, T020 |
| the problems' `code` on `RulesProblem` | `RulesProblem.code: RulesProblemCode` (`RulesMessageKey \| ConditionProblem \| EditMessageKey`), with `message`, `branchIndex`, `itemId` | `rules/src/types.ts` | T016, T019 |
| `ruleProblemOf` | `ruleProblemOf(rule, branchName, context): RuleProblemDetail \| null` (`{ code, message }`); codes `chooseData`, `notRequested`, `unknownPart`, a `ConditionProblem`, `noMessage`, `messageTooLong` | `rules/src/validation.ts` | T016, T019 |
| `firstProblem` | `firstProblem(branches: BranchInput[], context: RuleContext): RulesProblem \| null`; `publishProblems()` goes beside it | `rules/src/validation.ts` | T016 |
| `statementPartsOf`, `statementOf` with a language | `statementOf(rule, context)` and `statementPartsOf(rule, context)`: the language is `context.language`, not a parameter of its own | `rules/src/statements.ts` | T020 |
| `ApiFetchOptions.language` | `ApiFetchOptions.language?: Language`, sent as `Accept-Language` in place of the website's language; the interface is not exported | `frontend/src/api/client.ts` | T030 |
| `getFormConnection(id, { language })` (T030) | `getFormConnection(id)`: **no options**. T030 adds an optional `language` that it passes to `apiFetch` | `frontend/src/api/form-connections.ts` | T030 |
| `getOptionSets(language)`, `getDocumentTypes(language)` | `getOptionSets(language?)`, `getDocumentTypes(language?)` (the website's language when left out) | `frontend/src/api/option-sets.ts`, `frontend/src/api/document-types.ts` | T030 |
| "spec 009's caches" (per language) | **No shared cache.** `useOptionSets()` and `useDocumentTypes()` each keep a `CatalogCacheState` (`loaded` per language) in their own `useReducer`, and return `catalogViewOf(state)`, which shows the *other* language's list until the current one's has arrived. Their `optionSets` / `documentTypes` can therefore be in the wrong language right after a switch | `frontend/src/hooks/useOptionSets.ts`, `useDocumentTypes.ts`, `hooks/utils.ts`, `hooks/types.ts` | T030 |
| `frontend/src/copy.test.ts` | Exists. Glob `import.meta.glob('./**/constants.ts', { eager: true })` from `frontend/src/`, so `utils/connectionPdf/constants.ts` is covered. A table is any export that is a plain object with exactly the keys `en` and `de`. It checks the same keys and kinds in both columns, no empty text, and German ≠ English unless the English is in `EQUAL_IN_BOTH_LANGUAGES` (`Standard`, `Status`, `Details`, `Test`, `DE`, `EN`, `Konnekt`, `Optional`, `optional`, `Link`, `Wallet`, `Agent`, `Name`, `Region`, `serviceBW`, `EUDI Wallet`, `/`, `…`), one character, or punctuation only. Functions are checked by key and kind only | `frontend/src/copy.test.ts` | T013, T031 |
| `DETAIL_COPY` | **`CONNECTION_DETAIL_COPY`** (`defineTexts`). The keys the PDF and the button reuse: `linksTitle`, `linksLead`, `requestLink`, `requestLinkInfo`, `resultLink`, `resultLinkInfo`, `draftLinksText`, `noDocumentsYet`, `noDataYet`, `noRules`, `items(n)`, `summaryCounts(d, i, rulesCounts)`, `rulesCounts(v, r)`, `retry` ("Try again" / "Erneut versuchen"), `rulesErrorText` | `frontend/src/pages/FormConnectionDetail/constants.ts` | T013, T020, T031 |
| `BRANCH_MARK_COPY` | `BRANCH_MARK_COPY` (`defineTexts<Record<Mark, string>>`: `changed`, `added`, `removed`) | `frontend/src/components/BranchMark/constants.ts` | T013, T020 |
| (not in plan.md) other tables with the PDF's texts | `STATUS_PILL_COPY` (`draft`, `scheduled`, `live` = "Active" / "Aktiv", `deactivated`) in `frontend/src/components/ConnectionStatusBadge/constants.ts`; `CONNECTOR_COPY.labels` ("AND" / "UND", "OR" / "ODER") and `.descriptions` ("All rules must be met" / "Alle Regeln müssen erfüllt sein", "At least one rule must be met" / "Mindestens eine Regel muss erfüllt sein") in `frontend/src/components/Connector/constants.ts`; `RULE_ROW_COPY.messageLabel` ("Message for citizens:" / "Nachricht für Bürgerinnen und Bürger:") in `frontend/src/components/RuleRow/constants.ts`; `CONDITION_PROBLEM_MESSAGES` (the create flow's instruction per `ConditionProblem`, "choose a check." / "Wählen Sie eine Prüfung.") in `rules/src/constants.ts` | as named | T013, T019, T020 |
| "Enter a name for the connection." | `VALIDATION_MESSAGES.nameRequired` (with `nameTooLong`, `descriptionTooLong`), the server's `clean_name()` / `clean_description()` word for word in both languages | `frontend/src/pages/FormConnectionEditor/constants.ts` | T019 |
| "Add at least one document." | **Only the server's** `clean_documents()` (German "Fügen Sie mindestens ein Dokument hinzu."); no frontend table has it (the Documents step disables "Set rules →" with `DOCUMENTS_COPY.addDocumentFirst`, "Add a document first", instead) | `backend/app/services/form_connections.py` | T019 |
| "Choose at least one data item, or remove this document." | `DOCUMENTS_COPY.needsDataLine` (German "Wählen Sie mindestens ein Feld aus oder entfernen Sie dieses Dokument."); the server's message for the same gap is "Select at least one field for '{label}'." | `frontend/src/pages/FormConnectionEditor/DocumentsStep/constants.ts` | T019 |
| the polite live region the details page uses for "Link copied" | **No page-level region.** Each `CopyableUrl` renders its own `<p role="status" className="sr-only">` with `COPY_TEXTS.link.announced` ("Link copied" / "Link kopiert"), and `ActivityCard` has its own `role="status"`; a draft's details have no `CopyableUrl` at all. `LIVE_REGION_DELAY_MS` (100 ms, `frontend/src/constants.ts`) is how long a region that has just appeared stays empty | `frontend/src/components/CopyableUrl/index.tsx`, `frontend/src/constants.ts` | T030, T031 |
| (T004) "the block that sets `'no-console': 'error'` for the checks and personas" | The rule is set by the block for `{api-types,rules}/src/**/*.ts` (the checks and personas live in `rules/src/`); no block for `frontend/src/` sets it. T004 adds a block of its own for the three PDF paths | `eslint.config.mjs` | T004 |

What this means for later tasks (the coordinator appends these to their lines as "carried from
T002"):
- **T013**: keys that a table above already has are reused, not added to `PDF_TEXTS`: the statuses
  (`STATUS_PILL_COPY`), the AND/OR chips and the combinator sentences (`CONNECTOR_COPY`, the
  sentence composed as "{description} ({label})"), "Message for citizens:" (`RULE_ROW_COPY`), the
  links' heading (`CONNECTION_DETAIL_COPY.linksTitle`), "{n} data items" (`items`) and the contents
  line (`summaryCounts` with `rulesCounts`). A string key whose German equals its English
  (`version`: "Version") fails `copy.test.ts` unless "Version" is added to
  `EQUAL_IN_BOTH_LANGUAGES` in the same task.
- **T019**: "Add at least one document." needs a key with both columns, from the server's `Text`.
- **T030**: `getFormConnection` gains the `language` option; the option sets and the catalog in the
  captured language are the hooks' lists only when they are in that language: read the list
  cached for that language (widening the hooks to expose it) and fetch only what isn't cached.
- **T031**: `PdfDownload` gets its own polite `role="status"` region, as `CopyableUrl` does, present
  from mount; there is no shared region to reuse.

### 8.2 Decisions (D#)

**D1, how PDFKit is typed** (T003, 2026-11-12; R1, constitution IV). Our own interface, no
second package.
- Checked on 2026-11-12: `pdfkit` 0.20.2's `exports` give `"."` a `node` condition
  (`js/pdfkit.node.mjs` for `import`) and a `default` (`js/pdfkit.browser.mjs`), and no `types`;
  `@types/pdfkit` is at 0.17.7, three minor versions behind, without 0.20's structure and outline
  calls. One specifier, `'pdfkit'`, serves both builds: Vite resolves the browser build for the
  worker, Vitest's `node` environment the Node build for the smoke test.
- `frontend/src/utils/connectionPdf/types.ts` declares `PdfKitDocument` (only the calls and
  properties `render.ts` uses, typed as PDFKit 0.20.2 takes them) and `PdfKitConstructor`
  (`new (options) => PdfKitDocument`). `render()` receives the constructor as an argument.
- Under `strict`, importing a package without types fails `tsc` (TS7016). One ambient declaration,
  `declare module 'pdfkit';` in `frontend/src/utils/connectionPdf/pdfkit.d.ts`, with a comment
  naming D1, makes the import compile. Its default export is untyped, so each of the two imports
  (the worker's dynamic `import('pdfkit')`, the smoke test's) casts it to `PdfKitConstructor`
  where it is imported, with a one-line comment: "pdfkit 0.20 ships no types; D1". Nothing else
  imports `'pdfkit'`, and nothing writes `any`.
- A call `render.ts` needs that the interface lacks is added to the interface, never cast at the
  call. `plan.md` is unchanged: one new package, as planned.

**D2, the German terms the glossary lacked** (T003, 2026-11-12; contracts/pdf-document.md §5,
FR-034). Each proposal was compared with what spec 009's code says for the same English; the code
wins.

| Proposal | What the code says | Settled |
|---|---|---|
| "data item" → "Datenfeld" | "Feld" / "Felder": `CONNECTION_DETAIL_COPY.items` and `summaryCounts`, `DOCUMENTS_COPY` ("6 von 25 Feldern ausgewählt", "Alle Felder"); glossary §2 already has "data item → Feld" (T036 of spec 009) | **Feld** (no glossary change) |
| "Added here" → "Hier hinzugefügt" | `BRANCH_MARK_COPY.de.added`; glossary §2 (T032) | **Hier hinzugefügt**, reused from `BRANCH_MARK_COPY` |
| "Removed here" → "Hier entfernt" | `BRANCH_MARK_COPY.de.removed`; glossary §2 (T032) | **Hier entfernt**, reused from `BRANCH_MARK_COPY` |
| "Not live" → "Nicht veröffentlicht" | "live" is "aktiv": glossary §2 "live connections" → "aktive Anbindungen", "never live" → "nie aktiv" (the draft's delete dialog: "Die Anbindung war nie aktiv"), `Approval`'s "goes live at once" → "wird sofort aktiv". One exception, the publish failure's "Nothing went live." → "Es wurde nichts veröffentlicht." | **nicht aktiv**: "Not live" → "Nicht aktiv", "Not live yet" → "Noch nicht aktiv", "Draft · Not live" → "Entwurf · Nicht aktiv", "it isn’t live" → "er ist nicht aktiv"; added to glossary §2 |
| "version" (the content's fingerprint) → "Version" | no UI text yet; glossary §2 has "revision" → "Version", which no screen shows | **Version**; added to glossary §2 beside "revision". German equals English, so the task that adds a string key "Version" adds the word to `copy.test.ts`'s `EQUAL_IN_BOTH_LANGUAGES` |

Further corrections found by the same comparison (same English in the code, so the code's German
wins; applied to contracts/pdf-document.md §5 and to §3 above):
- "Connection details" is "Details der Anbindung" (the wizard's step 1, glossary §2), not
  "Anbindungsdetails": the eyebrow, the draft's eyebrow and the two titles.
- "result link" is "Ergebnislink" (glossary §2), so "Result links" is "Ergebnislinks", not
  "Ergebnis-Links"; "request link" is "Anfragelink".
- "Documents and data items" is "Dokumente und Felder"; "{n} data items" is
  `CONNECTION_DETAIL_COPY.items` ("{n} Felder", "1 Feld").
- "Message for citizens:" is "Nachricht für Bürgerinnen und Bürger:" (`RULE_ROW_COPY`), not
  "Nachricht an …".
- "Check your connection and try again." is "Prüfen Sie Ihre Internetverbindung und versuchen Sie
  es erneut." (`CONNECTION_DETAIL_COPY.rulesErrorText`), and "Try again" is "Erneut versuchen"
  (`CONNECTION_DETAIL_COPY.retry`).

Not settled here (no code says the same English; T041 reviews them with the rest of the German):
"Connection ID" → "Anbindungs-ID" stays the proposal, although the glossary's pattern for
"connection <noun>" is "<Noun> der Anbindung" ("Name der Anbindung", "URLs der Anbindung"), which
would give "ID der Anbindung".

### 8.3 The test connections

### 8.4 History

**2026-11-12, T001 baseline.** `npm install` and `uv sync` ran on Node 20.19.2 (npm 9.2.0; no
switch to Node 22 was needed), Python 3.13.5 and uv 0.13.0, and changed no tracked file. The
gates were green on the unmodified checkout: lint, tests, build, Ruff (nothing fixed or
reformatted), mypy (95 source files) and pytest.

| Suite | Result |
|---|---|
| `rules/` (Vitest) | 2664 tests passed, 46 files |
| `frontend/` (Vitest) | 1573 tests passed, 36 files |
| `mcp/` (Vitest) | 510 tests passed, 15 files |
| `backend/` (pytest) | 2557 passed, 0 skipped (14 min 8 s) |

The build of `frontend/` (`npm run build -w frontend`, the size quickstart §1 compares against):

| Chunk | Raw | Gzip |
|---|---|---|
| `index-BUwgvwRI.js` (the main entry) | 934.62 kB | 278.94 kB |
| `checks-C766b_cc.js` (worker) | 36.37 kB | not printed |
| `personas-CIJR7rKY.js` (worker) | 70.50 kB | not printed |

On the PATH: `docker` (29.9.2, daemon reachable). Not on the PATH: `verapdf`, `java`, `qpdf`,
`pdftotext`, `pdftoppm`. The PostgreSQL of the tests was started for this run with the repo's
`docker compose up -d postgres` (port 5435), and `template_db_test` was created in it.

**2026-11-12, T005 fonts.** The five TTFs are copied byte for byte from
`@expo-google-fonts/fira-sans` 0.4.1 and `@expo-google-fonts/fira-mono` 0.4.1 (the versions in the
prototype's `package-lock.json`, whose `npm install` left the lockfile unchanged) into
`frontend/src/assets/fonts/`. `OFL.txt` is the packages' `LICENSE_FONT` (the OFL 1.1 text, the
same in both), with both packages' copyright lines at its top: Fira Sans "2012-2015, The Mozilla
Foundation and Telefonica S.A.", Fira Mono "2012-2013, The Mozilla Corporation and Telefonica
S.A.". The largest file is 473160 bytes, under the 500 KB (512000 bytes) of the
`check-added-large-files` hook, which sets no `--maxkb`.

| File | Bytes | SHA-256 |
|---|---|---|
| `FiraSans-Regular.ttf` | 440984 | `3dabf3d48bf4599f95cffd92f99ea426a014d5311f52a5eb5ec3af265e97cd97` |
| `FiraSans-Medium.ttf` | 441384 | `7c2d4961dd4a2dbe3ec9c6a2fc60d7ee21f44dfa7c5c71256b28d15e8af89535` |
| `FiraSans-SemiBold.ttf` | 473160 | `1352f54dafec54419303fd4e55bc4d2aad4379f5105122f78034ddb48499e1d1` |
| `FiraMono-Regular.ttf` | 170204 | `9c1c51abec8b9f7fa24bfb88ebe80b354cc6da9d4036d6bedeaf495d24933e42` |
| `FiraMono-Medium.ttf` | 169056 | `5ebf0b5802814edb228b711b70c02736506bb8bce32da2608dcbf9e0df45798d` |
| `OFL.txt` | 4461 | `4da2f15e9bcb2fc38ce0e9326bebbb904da3377204d4d3d06878cd3f6653c1e0` |

**2026-11-12, T006 checkpoint of the setup.**
- **Gates**: the Node gates are green with `pdfkit` 0.20.2 installed (18 packages added to the
  lockfile, none imported by our code): lint; 2664 / 1573 / 510 tests in `rules/`, `frontend/`,
  `mcp/`; the build, whose main entry is unchanged (934.62 kB, 278.94 kB gzip) and whose two
  workers are still chunks of their own in ES format. Phase 1 changed no backend file, so T001's
  backend gates stand. Twice, while two agents ran the Node gates side by side (load average 8–9),
  the time budgets of `rules/src/personas/performance.test.ts` failed and passed on the rerun:
  parallel Node batches can trip them, so a red run there is re-run alone before it counts.
- **Records**: §8.1 has a row for every name T002 lists, and the as-built differences are carried
  to T004, T013, T019, T030 and T031; §8.2 holds D1 and D2 (the contract's §5, §3 above and spec
  009's glossary corrected); the fonts' sizes and hashes are above (T005).
- **veraPDF**: not on the PATH and no Java (T001), but Docker runs it:
  `docker run --rm --network none -v <dir>:/data:ro verapdf/cli:v1.28.1 --flavour ua1 /data/<file>.pdf`
  (veraPDF 1.28.1, image pulled 2026-11-12). On the prototype's `published-ids-top.pdf` and
  `draft-ids-top.pdf` it fails one rule only, 7.21.4.2 test 2 (font: the incomplete `CIDSet`,
  3 checks; 105 rules passed): the PDFKit bug research R5 names, which the implementation works
  around. So quickstart §5 step 2 runs in the chat.
- **Needs a person**: SC-006's screen-reader walk (quickstart §5 step 3, NVDA with Acrobat or
  another screen reader with a tagged-PDF reader) can't run here. The user was asked on
  2026-11-12 who does it; the answer is pending and goes here.
- **Other**: the tests' PostgreSQL is the container `pdf-summary-postgres-1` that T001 started
  (port 5435). `pdfkit` was moved into alphabetical order in `frontend/package.json` (the
  lockfile is unchanged by it).

**2026-11-12, T011 checkpoint of the version in the API (Phase 2).**
- **`curl`**: the backend ran on the dev database (`template_db`, migrated to head) with the
  tests' fake EUDIPLO (`tests/fake_eudiplo.py`), port 3000, no worker. "Start from an example"
  (`POST /api/form-connections/example`) stored a draft with `version_fingerprint`
  `10F5-92A4-B177` (save number 1), the same with `Accept-Language: de`. Published unchanged
  through `POST /{id}/publish` with the draft's content as the editor sends it, it answered `live`
  with `10F5-92A4-B177`; `GET` in English and German, deactivating and activating kept it. The field
  sits after `description`; both values match `^[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$`; the
  overview's list (`FormConnectionSummary`) has no such field. The account `t011` and the
  published example stay in `template_db` (not the tests' database).
- **The canonical form** (T007): the prototype's sample as stored gives `FA7E-47BB-5368`, its
  draft with C's two gaps `3D3C-F9EA-5FE0`, both cross-checked with the prototype's JS
  `canonical()` and pinned in `backend/tests/unit/test_versions.py` (74 tests, among them a guard
  that fails when a field is added to the content's schemas until it is decided). The fixture's
  mapping of the prototype's composed rules to catalog keys and UUIDs is carried to T018.
  `_clean_condition()` now returns `publishable_condition()`; a grid of 4788 condition × target
  cases gave byte-identical stored JSON and refusal messages (English and German) before and after,
  and `test_rules_validation.py` and the API rule tests passed unedited.
- **Gates**: backend: Ruff, format, mypy (97 source files); the full pytest run 2643 passed,
  0 skipped (14 min 15 s, T008's agent, on the final backend files), and the five changed or
  guarding files again at the checkpoint (689 passed). Node: lint, 2664 / 1573 / 513 tests in
  `rules/`, `frontend/`, `mcp/` (513: 3 new cases of T010), the build with the main entry
  unchanged (934.62 kB, 278.94 kB gzip). `rules/src/personas/performance.test.ts` failed once
  on its time budget while pytest ran beside it and passed alone (7 / 7), as T006 noted.
- **Carried**: T010's question whether the MCP's draft text keeps "Version {n}" for the save
  number goes to T051.

**2026-11-12, T021 checkpoint of the pure core (Phase 3).**
- **Gates**: lint; 2675 / 1741 / 513 tests in `rules/`, `frontend/`, `mcp/` (against T011: +11 in
  `rules/`, +168 in `frontend/` in 8 new files); the build, whose main entry is 934.82 kB
  (278.99 kB gzip), 0.2 kB more than T001's after T017's move, since nothing in the app imports
  `utils/connectionPdf/` yet. `rules/src/personas/performance.test.ts` missed its time budget in
  several agents' runs while four suites ran side by side and passed alone each time; the
  checkpoint's run was green throughout.

  | File | Tests |
  |---|---|
  | `rules/src/validation.test.ts` (with `publishProblems`; every `firstProblem` case also checks `publishProblems(...)[0]`) | 191 |
  | `frontend/src/utils/connectionSummary.test.ts` | 7 |
  | `utils/connectionPdf/constants.test.ts` (contrast of every text colour on its backgrounds, the body) | 37 |
  | `utils/connectionPdf/paginate.test.ts` (the pinned bug fails under both broken variants) | 14 |
  | `utils/connectionPdf/wrapUrl.test.ts`, `fileName.test.ts` | 7, 10 |
  | `utils/connectionPdf/testData.test.ts` | 17 |
  | `utils/connectionPdf/gaps.test.ts` | 22 |
  | `utils/connectionPdf/model.test.ts` | 54 |

- **Copy**: `copy.test.ts` checks `PDF_TEXTS` (its three cases for the table); "Version" is in
  `EQUAL_IN_BOTH_LANGUAGES` (T013).
- **Purity**: no `console.*` and no browser API in `utils/connectionPdf/` or
  `utils/connectionSummary.ts` (searched; T004's `no-console` block covers the folder). The
  modules import only `api-types`, `rules`, each other and the editor's copy tables
  (`pages/FormConnectionEditor/constants.ts`, `DocumentsStep/constants.ts`, whose SVG imports are
  URL strings).
- **Fixtures** (T018, checked with scratchpad scripts, not committed): A gives the backend's
  `FA7E-47BB-5368`, C `3D3C-F9EA-5FE0`, D (A's content and ids as a draft) `FA7E-47BB-5368`, E
  `EDD5-7EDC-E4FD`. The server's create checks (`clean_*`, `clean_rules`, `check_first_save`)
  accept A, D and E and refuse C at its first gap. E's create body is 1.56 MB, above nginx's
  default 1 MB `client_max_body_size`, which `frontend/nginx.conf` doesn't set (carried to T028
  and T051).
- **Decisions the agents marked UNCERTAIN, accepted**: T012: an 18th block kind, `linkHeading`
  (① and ② with their explanations); the structure's identity as `key` and `within`;
  `PlacedRect.joinsAbove`; `PlaceLabelTexts` and `LineWidth` as the paginator's and `urlLines()`'
  parameters. T013: `notComplete` is a label beside its text, as `messageLabel`; a sentence of its
  own for `linksToCreate` with one variant; faded items strike the name too; `#EEF1F6` for the URL
  box and the group header. T014: single spaces around "›". T015: the trailing trim applies after a
  cut only ("name." gives `name-_<version>.pdf`); a name of only `-` reads `connection`. T016: a
  wrong number of variants and a missing main variant are both listed, then the list ends; a name
  already taken stays its first owner's. T019: besides `addDocument`, three keys where no table had
  the instruction (`chooseData`, `addDataAgain`, `shortenMessage`), `unknownPart` reads "Choose
  the data to check.", a variant without a name gives only its own gap. T020: a rule a based
  variant inherits unchanged shows Standard's "Not complete", a removed one none; a blank group
  message is none. The German of every new key goes to T041's review.
- **Plan**: T019 also edited `constants.ts`, outside its file list: the key that T002's carried
  note asks for, allowed by the coordinator since no batch ran beside it, and three more under the
  same brief's rule. Every other task kept its level, batch and files.
- **Carried**: notes appended to T020 (done), T023, T024, T025, T028, T030, T035, T042 and T051.

## 9. Closing report
