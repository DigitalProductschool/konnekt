# Design notes: English–German language toggle

**Phase 1 skeleton of `/speckit-plan`**, filled by the tasks | **Date**: 2026-11-09 | **Spec**:
[spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Contracts**: [language-switch.md](contracts/language-switch.md),
[glossary.md](contracts/glossary.md)

This file holds the evidence and the decisions that `tasks.md` produces: the switch's tokens and
its deviations from the node (§1), the verification tables (§2) and the team's review of the
German copy (§3). It is appended to; nothing here is re-decided.

## 1. The switch

### 1.1 Deviations from the node `7341:101654` (decided in planning, research R2)

| # | Property | Figma | Built | Reason | Told the designer |
|---|---|---|---|---|---|
| D1 | inactive label colour | `#6b7380` on `#f2f5fb` (4.38:1) | `text-kern-layout-text-muted` `#4a5468` | AA for 14 px text (spec 008, Clarification 2026-11-06 #2) | pending |
| D2 | current label colour | `#1f2433` (no KERN name) | `text-kern-layout-text-default` `#0b1220` | the ink every label uses; no visible difference | pending |
| D3 | hover of the inactive segment | not drawn | `hover:bg-kern-action-default/8`, 150 ms `.motion` | spec 008's hover shade for transparent controls | pending |

A task that finds another difference between the node and the build lists it here with its
reason, or fixes the build.

### 1.2 Tokens

| Token | Value | Where |
|---|---|---|
| `--shadow-segment` (new, `@theme`) | `0 1px 2px rgb(18 20 38 / 0.12)` | the current segment |
| `shadow-card` (spec 008) | `0 6px 20px rgb(19 21 37 / 0.05), 0 1px 2px rgb(19 21 37 / 0.05)` | the pill |
| `layout-background-hued` | `#f2f5fb` | the pill |

## 2. Verification tables

### 2.1 The switch (per-node loop; quickstart)

Template: `node | state | element | property | figma | actual | result`. Filled by phase 2.

| node | state | element | property | figma | actual | result |
|---|---|---|---|---|---|---|
| | | | | | | |

### 2.2 The German walk (quickstart V1–V9)

Template: `screen (S#) | state | width | english text left | layout | result | fix`. Filled by
phases 5 and 6; one row per screen of spec 008's contract and width.

| screen | state | width | english text left | layout | result | fix |
|---|---|---|---|---|---|---|
| | | | | | | |

### 2.3 Contrast (V1)

| pair | where | ratio | result |
|---|---|---|---|
| | | | |

## 3. The German review

### 3.1 The glossary review (FR-013; phase 1)

**2026-11-09**: the user accepted [contracts/glossary.md](contracts/glossary.md) as written,
including the contested terms of research R3 ("Anbindung", "Befund", "Beispielperson",
"Freigabeanfrage", "Zugriffsstufe"), because no team member is available to review it. This is
the team's decision for FR-013; the glossary review step of phase 1 is done, and the German copy
may be written from the glossary. Corrections, if any, come from the walk of §3.2.

### 3.2 Corrections from the walk (SC-006; phase 6)

| date | where | english | german before | german after | glossary changed? | applied in |
|---|---|---|---|---|---|---|
| | | | | | | |

## 4. History

- 2026-11-09: skeleton written by `/speckit-plan`; the switch read from Figma (research R2); the
  glossary drafted ([contracts/glossary.md](contracts/glossary.md)).
- 2026-11-09: green baseline before the feature (T001; V5, V10). Node v20.19.2, npm 9.2.0:
  `npm ci` and Vite 8 work on Node 20 (no engines warning; only npm's deprecation note for
  `eslint@9.39.5`); `package-lock.json` and `backend/uv.lock` unchanged. `npm run lint`,
  `npm test` and `npm run build` green: `rules/` 43 test files, 2351 tests; `frontend/` 29 test
  files, 969 tests; `mcp/` 15 test files, 408 tests; `api-types/` has no tests. The frontend
  build warns that a chunk is over 500 kB (as before the feature). Backend: Ruff clean (no file
  changed), mypy clean over 77 source files, pytest 1998 passed, 0 skipped, 0 failed.
- 2026-11-09: checkpoint of the foundations (T010; FR-008, FR-009, FR-010, FR-018; V2, V5, V6,
  V10). Gates: `npm run lint`, `npm test`, `npm run build` green (`rules/` 45 files, 2362 tests;
  `frontend/` 31, 985; `mcp/` 15, 408, unchanged); Ruff and mypy clean (80 source files);
  `export_check_fixtures --check` current; the phase's one full pytest: 2062 passed, 0 failed
  (1998 + 64 new). Browser (Playwright, Chromium, dev server; fresh contexts, nothing stored):
  `de-AT` renders `<html lang="de">`, the sign-in page's loader "Wird geladen …" and
  `Accept-Language: de` on `/api/auth/me`, while the page's own copy stays English (expected
  until phase 5); `en-US` gives `lang="en"`, "Loading…", `en`. `setLanguage('de')` in tab A
  writes `connection-portal:language:v1` = `de` and tab B follows; tab B's `en` is followed by
  tab A; choosing the current language changes nothing; a reload in an `en-US` browser keeps the
  stored `de`; another tab's `fr` or a cleared storage falls back to the browser's language.
  Backend (uvicorn on 3000, `template_db_test`, worker off, debug log): `GET
  /api/document-types` with `de` (and `de-AT,de;q=0.9,en;q=0.8`) gives 64 German labels, only
  "Region" equal in both, and the body without its labels is identical to the English one (keys,
  kinds, option sets, flags, parts, order); an empty connection name answers "Geben Sie einen
  Namen für die Anbindung ein." with `de`, the English message with `fr` or no header;
  `/api/connect/…/requests` with `de` answers in English; the 19 lines of the backend's debug log
  hold no `Accept-Language`, no `de` marker and no German text. Open: a person confirms the
  first visit once in a real German-language browser (tasks.md, phase 1 "Needs a person").
  Plan changes in this phase: T004 also switched `PageLoader`'s default label to `useCopy` (the
  checkpoint's loader check needs it; T031 finds it done); the glossary gained "the kit's field
  texts", "administrator", "Invalid request payload" and nine catalog labels (T009), and its
  "loading" note was corrected (KERN's kit writes "Wird geladen...", the German column keeps the
  space); from wave 4 on the full pytest runs once per phase, at the checkpoint (the user's
  request), the agents running Ruff, mypy and their targeted tests.
