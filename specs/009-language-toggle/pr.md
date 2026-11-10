# Spec 009: an English–German language toggle for the whole website

## Summary

Team members can now use the whole website in English or German. A "DE | EN" switch in the
header's right group (every layout, signed in or out; the buttons named "Deutsch" and "English"
for screen readers) changes every text of the screen in one activation, with no reload and
nothing typed, selected or opened lost. The choice is remembered in the browser
(`connection-portal:language:v1`) and followed by other tabs; on a first visit a German browser
language opens German, anything else English. `<html lang>` and the tab title follow the choice.

How it's built:

- **Frontend**: `LanguageProvider` holds the choice; every component reads its copy with
  `useCopy()` from a `defineTexts(en, de)` table in its sibling `constants.ts`; KERN's own field
  texts, dates (`dd.mm.yyyy`, "vor 5 Minuten") and the documents' catalog follow the language.
  Every API call carries `Accept-Language`.
- **Rules package**: the composers (statements, proposed messages, findings, personas,
  validation) take the language and default to English; `validation.ts` uses the server's
  messages word for word in both languages, pinned by the new parity fixture
  `rules/src/fixtures/server-messages.json` (written by `export_check_fixtures`). Callers branch on
  a problem's `code`, never its message.
- **Backend**: `app/language.py` and a middleware read `Accept-Language`; server messages are
  `Text(en, de)` resolved in `errors.py`; the catalog's and option sets' labels come from
  `label_of()`.

What stays English: `/api/connect/` (serviceBW), everything sent to EUDIPLO, the MCP server and the
agents' texts, `ApiResponse.message`, the OAuth (RFC) bodies, the logs, and stored data
(connection and variant names, saved citizen messages, typed values). "Standard", "Konnekt",
URLs, references and error IDs are the same in both languages.

Documentation: ARCHITECTURE's new section "Languages (spec 009)" and the sections it touches,
CLAUDE.md's one-line rules, README (`Accept-Language`, the fixture's third file). 001-S7.9 is
marked superseded, spec 008's F6 "built by spec 009". The full record is in
`specs/009-language-toggle/design-notes.md`, its closing report in §5.

## Verification

- **Gates**: `npm run lint`, `npm run format:check`, `npm test`, `npm run build` green: `rules/`
  45 files 2642 tests (baseline 43 / 2351), `frontend/` 31 / 1267 (29 / 969), `mcp/` 15 / 408
  (unchanged). Ruff, `ruff format --check`, mypy (82 source files) clean,
  `export_check_fixtures --check` current, pytest 2161 passed, 0 failed (baseline 1998).
  Assertions 8368 → 9493, no test file with fewer, no English literal lost.
  `personas/performance.test.ts`'s 1.5 s budget fails now and then under the full run and passes
  alone, as before.
- **Copy completeness**: `copy.test.ts` checks 61 tables in 36 files (frontend) and 16 (rules
  package); `test_texts.py` reads the server's 113 `Text`s.
- **The walk** (quickstart V1–V11, Playwright scripts, Chromium and Firefox): V1 every screen
  S1–S22 at 1440, 70 states per browser, 0 English left, the English identical after a round trip,
  a click to `lang="de"` in 160 ms (Chromium, median) / 189 ms (Firefox); V2 the remembered choice,
  9 cases; V3–V5, V8 the catalog, server errors, statements, dates, the MCP server and the connect
  flow (English) and the logs (no language, no message text); V6 content unchanged, 36 checks per
  browser; V7 every screen at 320 px, clean after five R9 fixes (short forms, `break-words`, three
  soft hyphens); V9 keyboard, the accessibility trees and the live regions; V10 the gates and
  assertion counts; V11 the German reviewed, 13 corrections applied.
- **Confirmed by a person (2026-11-10)**: the first visit in a German-language browser, the
  private window, the native date field (`TT.MM.JJJJ`), the browser's own 200 % zoom on a narrow
  window, the switch's hover shade, and the one-second bound by hand.

## Open, for a person

- **Screen reader** (V9 9): a pass with Orca or NVDA: the two buttons in their voices, "current",
  the page read in German after a switch, the announcements, the dialog titles read whole.
- **German skim**: the reviewer was the user standing in for the team, who doesn't read German; a
  German-speaking team member's skim of the live screens is still advisable.
- **The designer** hasn't been told the switch's deviations yet (below).
- **Spec 008's items**, kept as they were (the same in English): the details' ⋯ menu 18 px wide
  from 320 to about 350 px; the rule editor's data menu showing no list at 320; "Search Driving
  licence" and the name field's example cut at 320; keyboard focus on a sticky header control
  scrolls Chromium to the top.

The user commits the branch and opens this PR.

## For the designer: the switch against the node `7341:101654`

- **D1**: inactive label `#4a5468` instead of `#6b7380` (4.38:1 on `#f2f5fb`, below AA; now
  6.97:1).
- **D2**: current label `#0b1220` instead of `#1f2433` (no KERN name; no visible difference).
- **D3**: a hover shade on the inactive segment (`kern-action-default` at 8 %, 150 ms), not drawn
  in the node.
- **D4**: below 350 px signed in (334 px in a connection) the right group takes its own row under
  the Konnekt pill, at the right end; the design has no frame below `md`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
