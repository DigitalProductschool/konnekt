# Quickstart: validating the language toggle

**Phase 1 output of `/speckit-plan`** | **Date**: 2026-11-09 | **Spec**: [spec.md](spec.md) |
**Plan**: [plan.md](plan.md)

What proves the feature works: the gates (the type checker and the tests that cover
completeness, the German composers, the header and the mirror), the per-node loop for the
switch, and the scenarios V1–V11 that walk the three user stories and the edge cases in German.
Implementation details are in `tasks.md` and the contracts, not here.

## Prerequisites

- The stack of `README.md`: PostgreSQL (the compose file or a local server), the backend, the
  frontend dev server, the fake EUDIPLO for tests; the test accounts of the README.
- **This checkout had no `node_modules` on 2026-11-09** (research R11): run `npm install` at the
  root once (Node 20.19 is installed; the constitution says 22+: V5), and `uv sync` in
  `backend/`.
- The browser checks use the Playwright MCP tools from the chat (Chromium and Firefox); Figma is
  read for one node (the switch, research R2). A 1440 px frame needs a 1455 px window in
  Chromium on Linux (`docs/FIGMA-WORKFLOW.md` §4).
- A screen reader for V9: Orca (Linux) or NVDA (Windows).
- Git here is unreachable; nothing commits.

## Gates (every task; constitution III)

```bash
# the root: api-types/, rules/, frontend/, mcp/
npm run lint && npm test && npm run build

# backend/
uv run ruff check --fix . && uv run ruff format . && uv run mypy app/ scripts/ tests/
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5435/konnekt_db_test uv run pytest
uv run python -m scripts.export_check_fixtures --check   # the parity fixture is current
```

Expected: all green. `tsc` (inside `npm run build`) fails on a German table that lacks a key;
`copy.test.ts` fails on a German string equal to its English one outside the allowlist;
`validation.test.ts` fails when the client's and the server's validation messages differ in
either language; `npm test -w mcp` passes unchanged.

## The per-node loop (the switch; contracts/language-switch.md)

1. `npm run dev -w frontend` (port 5173); `get_design_context` and `get_screenshot` on
   `7341:101654` (file `s8mU9oJDq3411e8bxMjQO9`).
2. For each state (signed out `/login`, signed in `/`, in a connection
   `/form-connections/:id`, scrolled, 320 px at 200 %): `browser_resize`, `browser_navigate`,
   the font check, the numeric check (`getBoundingClientRect`, `getComputedStyle`) of the pill,
   the two segments, the labels and the shadows, the screenshot comparison.
3. Append the table to `design-notes.md` §2.1; `result` is `match` or the deviation it cites (D1
   the AA fix, D2 the ink token, D3 the hover).

Expected: no open row; both labels at ≥ 4.5:1 on the pill (V1).

## Scenarios

"Matches" means the screen's row in design-notes §2.2 is clean. Every scenario is run in
Chromium and Firefox at 1440 px and at 320 px / 200 % zoom unless it says otherwise.

### V1. The switch on every screen (US1; FR-001, FR-003)

1. Signed out, open `/login`: the header shows the Konnekt pill (white), the spacer and the
   switch; no account pill. Activate "DE": the sign-in page, its labels, placeholders, the
   forgot-password link and the tab title are German; the page did not reload (the dev server's
   connection count is unchanged, or a `beforeunload` sentinel stays); `<html lang="de">`.
2. Type a wrong password → the alert's message is German and both fields are marked invalid (as
   spec 008's F16). Switch to "EN": the alert stays German (a server notice already shown keeps
   its text; Edge Cases) until the next attempt, which is English.
3. Sign in: the overview is German (the switch was not touched). Walk every screen of spec 008's
   contract S1–S22 (the overview and welcome page, the wizard's four steps, the rule editor, the
   test step, the publish dialog, the details and the draft details, the edit entry and its
   dialogs, the account page, the consent page, an approval request, the not-found redirect):
   the switch is in the header of each, in the same place, and one activation switches the whole
   screen.
4. On the rules step, open the rule editor, fill half a rule, have a finding shown under a group,
   open a menu: switch to German → the editor stays open with its values, the rule's sentence,
   the proposed message, the finding's note, the step heading and the buttons are German; the
   menu stays open; nothing was saved (the draft's `updated_at` is unchanged; no request in the
   network log but the two catalog prefetches).
5. Switch back to English on any screen: the copy is spec 008's, word for word (compare with the
   screenshot matrix of spec 008's pass I).

### V2. Remembered (US2; FR-008, FR-009)

1. With German chosen, close the browser, return: German. Open a second tab: German. Change the
   language in one tab: the other follows (the `storage` event).
2. Sign out and in: German. Open a connection's link from an approval request or a colleague's
   link (no language in the URL): German.
3. A fresh profile with the browser language `de-AT`: German on the first visit; with `en-US` or
   `fr`: English. Choose once: the choice wins from then on.
4. Private mode or site data blocked: the switch works for the visit; the next visit follows the
   first-visit rule; no error in the console.
5. Put `fr` or garbage into `localStorage['konnekt:language:v1']`: treated as no choice.

### V3. The server's copy (US3; FR-005)

1. German, the documents step: every document type, field and part is German; the order, the
   icons and the keys (the `data-*` or `name` attributes) are as in English.
2. German, the rule editor: the countries and other options are German; a saved rule's values
   are the same keys as before (the draft's JSON is unchanged).
3. German, force a validation error from the server (a name of 201 characters through the dev
   tools, or a publish of an incomplete draft): the notice's message is German, the `error`
   code English, the error ID shown when present. Force a `5xx` (stop the fake EUDIPLO): the
   generic German message with the error ID.
4. `curl -H 'Accept-Language: de' /api/document-types` → German labels, same keys and order as
   without the header; `curl /api/connect/...` with `Accept-Language: de` → English.

### V4. The rules' sentences (US3; FR-006)

1. German, a rule "Nationality includes one of Germany, Austria": the statement in the rules
   step, the details and the publish dialog is "Personalausweis · Staatsangehörigkeit enthält
   eines von Deutschland, Österreich"; the saved rule is unchanged.
2. Complete a condition in the editor: the proposed message is German; switch to English with
   the proposal untouched: it is the English proposal; edit it, switch: the edited text stays
   (V8). Open a rule saved earlier with an English message in German: the message is shown as
   saved.
3. Make a contradiction: the finding's note, the banner, the tab's label and the dialog line are
   German and name the same rules and variants; the screen reader announcement (the live region)
   is German.
4. The test step: the personas' chips, the data heading, the result heading, "Nachricht für Mia",
   the group subtitles, the test-day line with `dd.mm.yyyy`, "Nicht erfüllt" and "Konnte nicht
   geprüft werden" are German; the personas and outcomes are the same as in English.

### V5. Dates and times (FR-012)

German: the overview's "Bearbeitet 28.10.2026" (fixed, unchanged), the details' saved time, the
account page's relative times ("vor 5 Minuten", "gestern"), the local drafts' "06.11.2026, 14:20"
(fixed), the rule editor's dates `dd.mm.yyyy`, statements "23.10.2005"; English: as spec 008.

### V6. Content stays (FR-007)

A connection "Parking permit" with a variant "Students", a rule value typed as text, a saved
citizen message, the username and an agent's request read the same in both languages;
"Standard", "Konnekt", URLs, references, error IDs and "Rule 01" are unchanged.

### V7. Longer text (FR-015; research R9)

At 320 px / 200 %, in German, every screen of S1–S22: no horizontal scroll, no clipped or
overlapping text, "…" truncation where spec 008 cuts (the header's name, a row's description),
the step header and footer buttons intact; a fix follows R9's order and is logged in
design-notes §2.2.

### V8. What leaves the website (FR-017)

1. The MCP server's tools (`npm run dev -w mcp`, an agent's token): findings, statements, the
   catalog and errors in English while the browser is German.
2. The connect flow against the fake EUDIPLO: the DCQL request and the delivered documents'
   labels unchanged (compare with `tests/helpers.py`'s `DELIVERED_DOCUMENTS`).
3. The backend's logs during the whole run: no `Accept-Language`, no `de` / `en` marker, no
   message text.

### V9. Screen reader and keyboard (FR-010, FR-011; SC-005)

Tab to the switch: "Deutsch, button" is read in a German voice and "English, button" in an
English one; the current one says "current"; Enter switches; the page's language changes with
it (the reader's voice for the following text); the focus stays on the switch; the focus ring
shows only after keyboard focus.

### V10. The gates in both languages (SC-007)

`npm run lint && npm test && npm run build` and the backend's gates: green; the number of
English assertions in the tests is unchanged from before the feature (`git diff --stat` on the
other machine shows additions only in test files).

### V11. The team's review (SC-006)

The team walks the German screens with the glossary; every correction is logged in
design-notes §3 and applied (glossary first, then the code); the walk is repeated until no
product term is used against the glossary and no composed sentence is ungrammatical.
