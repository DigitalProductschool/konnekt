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
| D4 | the right group below `md` (found by T012) | one row: Konnekt, spacer, switch and account (contract; the design has no frame below `md`) | below 350 px signed in (334 px in a connection) the right group takes a row of its own under the Konnekt pill, at the right end (`ml-auto`); signed out it fits row 1 down to 320 px | the Konnekt pill (133) and the right group (152) with spec 008's padding and gaps need 350 px; shrinking spec 008's pills or gaps is out of scope, and the end keeps the right group where every other width has it | pending |

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
| 7341:101654 | signed out `/login`, 1440 | labels | font loaded | Fira Sans 600 | `document.fonts.check('600 14px "Fira Sans"')` true | match |
| 7341:101654 | signed out `/login`, 1440 | pill | size | 92 × 48 | 92 × 48 | match |
| 7341:101654 | signed out `/login`, 1440 | pill | radius | 9999 | 9999px | match |
| 7341:101654 | signed out `/login`, 1440 | pill | background | #f2f5fb | rgb(242 245 251) | match |
| 7341:101654 | signed out `/login`, 1440 | pill | shadow | Elevation/Card 0 1 2 / 0 6 20 rgba(19,21,37,.05) | the same two layers | match |
| 7341:101654 | signed out `/login`, 1440 | pill | padding, gap | 0 4, 4 | 0px 4px, 4px | match |
| 7341:101654 | signed out `/login`, 1440 | DE segment | size, radius | 40 × 40, 9999 | 40 × 40, 9999px | match |
| 7341:101654 | signed out `/login`, 1440 | EN segment | size, radius | 40 × 40, 9999 | 40 × 40, 9999px | match |
| 7341:101654 | signed out `/login`, 1440 | EN segment (current) | background | white | white (`oklch(1 0 0)`) | match |
| 7341:101654 | signed out `/login`, 1440 | EN segment (current) | shadow | 0 1 2 rgba(18,20,38,.12) | 0 1px 2px rgba(18,20,38,.12) | match |
| 7341:101654 | signed out `/login`, 1440 | DE segment (other) | background | transparent | transparent | match |
| 7341:101654 | signed out `/login`, 1440 | labels | type | label/small 600 14/24, spacing 0 | 600 14px/24px Fira Sans, spacing normal (0) | match |
| 7341:101654 | signed out `/login`, 1440 | EN label (current) | colour | #1f2433 | #0b1220 | D2 |
| 7341:101654 | signed out `/login`, 1440 | DE label (other) | colour | #6b7380 | #4a5468 | D1 |
| 7341:101654 | signed out `/login`, 1440 | switch | distance to the right edge | 16 | 16 (1424 of 1440) | match |
| 7341:101654 | signed out `/login`, 1440 | account pill | presence | hidden | absent; the right group holds the switch only | match |
| 7341:101654 | signed out `/login`, 1440 | Konnekt pill | background | white (U10) | white | match |
| 7341:101654 | signed out `/login`, 1440 | switch | screenshot | node render | pill outside the labels: mean diff 2.1/255, max 15 (the page's light blue behind the shadow); labels differ by D1, D2 and the rasteriser | match |
| 7341:101654 | signed out `/login`, 1440 | keyboard | Tab order | DE, EN, then the form | DE → EN → username (the Konnekt pill is no link signed out) | match |
| 7341:101654 | signed in `/`, 1440 | labels | font loaded | Fira Sans 600 | `document.fonts.check('600 14px "Fira Sans"')` true | match |
| 7341:101654 | signed in `/`, 1440 | pill | size | 92 × 48 | 92 × 48 | match |
| 7341:101654 | signed in `/`, 1440 | pill | radius | 9999 | 9999px | match |
| 7341:101654 | signed in `/`, 1440 | pill | background | #f2f5fb | rgb(242 245 251) | match |
| 7341:101654 | signed in `/`, 1440 | pill | shadow | Elevation/Card 0 1 2 / 0 6 20 rgba(19,21,37,.05) | the same two layers | match |
| 7341:101654 | signed in `/`, 1440 | pill | padding, gap | 0 4, 4 | 0px 4px, 4px | match |
| 7341:101654 | signed in `/`, 1440 | DE segment | size, radius | 40 × 40, 9999 | 40 × 40, 9999px | match |
| 7341:101654 | signed in `/`, 1440 | EN segment | size, radius | 40 × 40, 9999 | 40 × 40, 9999px | match |
| 7341:101654 | signed in `/`, 1440 | EN segment (current) | background | white | white (`oklch(1 0 0)`) | match |
| 7341:101654 | signed in `/`, 1440 | EN segment (current) | shadow | 0 1 2 rgba(18,20,38,.12) | 0 1px 2px rgba(18,20,38,.12) | match |
| 7341:101654 | signed in `/`, 1440 | DE segment (other) | background | transparent | transparent | match |
| 7341:101654 | signed in `/`, 1440 | labels | type | label/small 600 14/24, spacing 0 | 600 14px/24px Fira Sans, spacing normal (0) | match |
| 7341:101654 | signed in `/`, 1440 | EN label (current) | colour | #1f2433 | #0b1220 | D2 |
| 7341:101654 | signed in `/`, 1440 | DE label (other) | colour | #6b7380 | #4a5468 | D1 |
| 7341:101654 | signed in `/`, 1440 | right group | size | 152 × 48 (7354:60279) | 152 × 48 (1272–1424) | match |
| 7341:101654 | signed in `/`, 1440 | switch → account pill | gap | 4 | 4 | match |
| 7341:101654 | signed in `/`, 1440 | right group | distance to the right edge | 16 | 16 | match |
| 7341:101654 | signed in `/`, 1440 | switch | screenshot | node render | pill outside the labels: mean diff 0.3/255, max 5; labels differ by D1, D2 and the rasteriser | match |
| 7341:101654 | signed in `/`, 1440 | keyboard | Tab order | Konnekt → DE → EN → account | Konnekt → DE → EN → account pill | match |
| 7341:101654 | signed in `/`, 1440 | accessibility tree | roles, names | group "Language", buttons "Deutsch", "English" | group "Language"; button "Deutsch" (`lang="de"`), button "English" (`lang="en"`, `aria-current="true"`); `<html lang="en">` | match |
| 7341:101654 | in a connection `/form-connections/:id`, 1440 | labels | font loaded | Fira Sans 600 | `document.fonts.check('600 14px "Fira Sans"')` true | match |
| 7341:101654 | in a connection `/form-connections/:id`, 1440 | pill | size | 92 × 48 | 92 × 48 | match |
| 7341:101654 | in a connection `/form-connections/:id`, 1440 | pill | radius | 9999 | 9999px | match |
| 7341:101654 | in a connection `/form-connections/:id`, 1440 | pill | background | #f2f5fb | rgb(242 245 251) | match |
| 7341:101654 | in a connection `/form-connections/:id`, 1440 | pill | shadow | Elevation/Card 0 1 2 / 0 6 20 rgba(19,21,37,.05) | the same two layers | match |
| 7341:101654 | in a connection `/form-connections/:id`, 1440 | pill | padding, gap | 0 4, 4 | 0px 4px, 4px | match |
| 7341:101654 | in a connection `/form-connections/:id`, 1440 | DE segment | size, radius | 40 × 40, 9999 | 40 × 40, 9999px | match |
| 7341:101654 | in a connection `/form-connections/:id`, 1440 | EN segment | size, radius | 40 × 40, 9999 | 40 × 40, 9999px | match |
| 7341:101654 | in a connection `/form-connections/:id`, 1440 | EN segment (current) | background | white | white (`oklch(1 0 0)`) | match |
| 7341:101654 | in a connection `/form-connections/:id`, 1440 | EN segment (current) | shadow | 0 1 2 rgba(18,20,38,.12) | 0 1px 2px rgba(18,20,38,.12) | match |
| 7341:101654 | in a connection `/form-connections/:id`, 1440 | DE segment (other) | background | transparent | transparent | match |
| 7341:101654 | in a connection `/form-connections/:id`, 1440 | labels | type | label/small 600 14/24, spacing 0 | 600 14px/24px Fira Sans, spacing normal (0) | match |
| 7341:101654 | in a connection `/form-connections/:id`, 1440 | EN label (current) | colour | #1f2433 | #0b1220 | D2 |
| 7341:101654 | in a connection `/form-connections/:id`, 1440 | DE label (other) | colour | #6b7380 | #4a5468 | D1 |
| 7341:101654 | in a connection `/form-connections/:id`, 1440 | right group | position | after the spacer, 16 from the edge | after the spacer and the description, 16 from the edge; switch 1272–1364, account 1368–1424 | match |
| 7341:101654 | in a connection `/form-connections/:id`, 1440 | connection pill, description | position | unchanged (spec 008) | unchanged: one row, the description after the connection pill | match |
| 7341:101654 | in a connection `/form-connections/:id`, 1440 | switch → account pill | gap | 4 | 4 | match |
| 7341:101654 | in a connection `/form-connections/:id`, 1440 | switch | screenshot | node render | pill outside the labels: mean diff 0.3/255, max 5 (as `/`) | match |
| 7341:101654 | in a connection `/form-connections/:id`, 1440 | keyboard | Tab order | connection pill's link → DE → EN → account | Konnekt → "Your connections" → DE → EN → account pill | match |
| 7341:101654 | in a connection `/form-connections/:id`, 1440 | keyboard | Enter, Space | Enter and Space activate | Enter on DE: `lang="de"`, "Sprache", `aria-current` on DE, stored `de`; Enter on the current DE: nothing; Space on EN: back to `en`; focus stays on the button | match |
| 7341:101654 | in a connection `/form-connections/:id`, 1440 | keyboard | no reload, no request | none (FR-003) | a `window` sentinel survives, 1 navigation entry, 0 requests during the switches | match |
| 7341:101654 | in a connection `/form-connections/:id`, 1440 | focus ring | keyboard focus | as the other header controls | 4px solid #0b1220, offset 2 (after the 150 ms colour transition) | match |
| 7341:101654 | in a connection `/form-connections/:id`, 1440 | focus ring | mouse click | none | outline none, `:focus-visible` false | match |
| 7341:101654 | scrolled (`scrollY` 32), 1440 | labels | font loaded | Fira Sans 600 | `document.fonts.check('600 14px "Fira Sans"')` true | match |
| 7341:101654 | scrolled (`scrollY` 32), 1440 | pill | size | 92 × 48 | 92 × 48 | match |
| 7341:101654 | scrolled (`scrollY` 32), 1440 | pill | radius | 9999 | 9999px | match |
| 7341:101654 | scrolled (`scrollY` 32), 1440 | pill | background | #f2f5fb | rgb(242 245 251) | match |
| 7341:101654 | scrolled (`scrollY` 32), 1440 | pill | shadow | Elevation/Card 0 1 2 / 0 6 20 rgba(19,21,37,.05) | the same two layers | match |
| 7341:101654 | scrolled (`scrollY` 32), 1440 | pill | padding, gap | 0 4, 4 | 0px 4px, 4px | match |
| 7341:101654 | scrolled (`scrollY` 32), 1440 | DE segment | size, radius | 40 × 40, 9999 | 40 × 40, 9999px | match |
| 7341:101654 | scrolled (`scrollY` 32), 1440 | EN segment | size, radius | 40 × 40, 9999 | 40 × 40, 9999px | match |
| 7341:101654 | scrolled (`scrollY` 32), 1440 | EN segment (current) | background | white | white (`oklch(1 0 0)`) | match |
| 7341:101654 | scrolled (`scrollY` 32), 1440 | EN segment (current) | shadow | 0 1 2 rgba(18,20,38,.12) | 0 1px 2px rgba(18,20,38,.12) | match |
| 7341:101654 | scrolled (`scrollY` 32), 1440 | DE segment (other) | background | transparent | transparent | match |
| 7341:101654 | scrolled (`scrollY` 32), 1440 | labels | type | label/small 600 14/24, spacing 0 | 600 14px/24px Fira Sans, spacing normal (0) | match |
| 7341:101654 | scrolled (`scrollY` 32), 1440 | EN label (current) | colour | #1f2433 | #0b1220 | D2 |
| 7341:101654 | scrolled (`scrollY` 32), 1440 | DE label (other) | colour | #6b7380 | #4a5468 | D1 |
| 7341:101654 | scrolled (`scrollY` 32), 1440 | header | background | white (U03 #39) | white | match |
| 7341:101654 | scrolled (`scrollY` 32), 1440 | switch | position | unchanged | 1272, 16 (as unscrolled) | match |
| 7341:101654 | scrolled (`scrollY` 32), 1440 | switch | screenshot | node render | pill outside the labels: mean diff 0.3/255, max 5 (as unscrolled) | match |
| 7341:101654 | below `md`, 320 px at 200 % (`body.style.zoom`; checked again in a 320 CSS px viewport) | labels | font loaded | Fira Sans 600 | true | match |
| 7341:101654 | below `md`, 320 px at 200 % (`body.style.zoom`; checked again in a 320 CSS px viewport) | pill | size (CSS px) | 92 × 48 | 92 × 48 | match |
| 7341:101654 | below `md`, 320 px at 200 % (`body.style.zoom`; checked again in a 320 CSS px viewport) | DE, EN segments | size (CSS px) | 40 × 40 | 40 × 40 | match |
| 7341:101654 | below `md`, 320 px at 200 % (`body.style.zoom`; checked again in a 320 CSS px viewport) | labels | type, colours | 600 14/24; #1f2433, #6b7380 | 600 14px/24px; #0b1220, #4a5468 | D1, D2 |
| 7341:101654 | below `md`, 320 px at 200 % (`body.style.zoom`; checked again in a 320 CSS px viewport) | switch → account pill | gap | 4 | 4 | match |
| 7341:101654 | below `md`, 320 px at 200 % (`body.style.zoom`; checked again in a 320 CSS px viewport) | header (`/login`) | row 1 | Konnekt, spacer, switch | Konnekt (white), spacer, switch at 212–304, 16 from the edge | match |
| 7341:101654 | below `md`, 320 px at 200 % (`body.style.zoom`; checked again in a 320 CSS px viewport) | header (`/`, in a connection) | row 1 | Konnekt, spacer, switch and account | Konnekt and spacer; the right group (152) on row 2 at 152–304, 16 from the edge; then the connection pill and the description | D4 |
| 7341:101654 | below `md`, 320 px at 200 % (`body.style.zoom`; checked again in a 320 CSS px viewport) | page | horizontal scroll | none | none in the 320 CSS px viewport (`/login`, `/`, connection: `scrollWidth` 320); with `body.style.zoom` `/login` and the connection none, `/` only the overview's search field (`sm:w-360`, the zoom does not move media queries; not the header) | match |
| 7341:101654 | below `md`, 320 px at 200 % (`body.style.zoom`; checked again in a 320 CSS px viewport) | header | 375 px (a phone) | one row | Konnekt, spacer and the right group on one row | match |
| 7341:101654 | German current, after a switch (in a connection and `/login`, 1440) | DE segment (current) | background, shadow | white, 0 1 2 rgba(18,20,38,.12) (the node's EN) | white, 0 1px 2px rgba(18,20,38,.12) | match |
| 7341:101654 | German current, after a switch (in a connection and `/login`, 1440) | DE label (current) | colour | #1f2433 | #0b1220 | D2 |
| 7341:101654 | German current, after a switch (in a connection and `/login`, 1440) | EN label (other) | colour | #6b7380 | #4a5468 | D1 |
| 7341:101654 | German current, after a switch (in a connection and `/login`, 1440) | EN segment (other) | background | transparent | transparent | match |
| 7341:101654 | German current, after a switch (in a connection and `/login`, 1440) | EN segment (other) | hover | not drawn | #1d56f0 at 8 % (`oklab(… / 0.08)`), 150 ms | D3 |
| 7341:101654 | German current, after a switch (in a connection and `/login`, 1440) | pill, segments | size, gap, padding | 92 × 48, 4, 0 4; 40 × 40 | 92 × 48, 4, 0 4; 40 × 40 | match |
| 7341:101654 | German current, after a switch (in a connection and `/login`, 1440) | accessibility tree | `aria-current`, labels | moves to DE; group "Sprache" | `aria-current="true"` on DE only; group "Sprache"; names stay "Deutsch", "English" with their `lang` | match |
| 7341:101654 | German current, after a switch (in a connection and `/login`, 1440) | document | `<html lang>` | `de` | `de` (and `en` again after EN) | match |
| 7341:101654 | German current, after a switch (in a connection and `/login`, 1440) | document | tab title | German | the app name unchanged; the pages' own titles are English until their copy tables (phase 5; T013) | match |
| 7341:101654 | German current, after a switch (in a connection and `/login`, 1440) | page | reload | none | the `window` sentinel survives on `/login` and in a connection | match |

Chromium (Playwright), dev server and backend on `template_db_test`, 2026-11-09 (T012): 1440 px is
a 1455 px viewport (KERN's `scrollbar-gutter: stable` keeps 15 px), positions are in the header's
box. The node's render is 112 × 48 with the pill at its left edge and the shadow on the right;
the screenshots are compared with the pill aligned. Chromium's accessibility tree has no property
for `aria-current`; it is read from the DOM. The build fix of the loop: the current segment's
white is `bg-kern-layout-background-default` (KERN's white), because the KERN theme resets
Tailwind's colours and `bg-white` (T011's wording) produced no class; the right group's `ml-auto`
(D4).

### 2.2 The German walk (quickstart V1–V9)

Template: `screen (S#) | state | width | english text left | layout | result | fix`. Filled by
phases 5 and 6; one row per screen of spec 008's contract and width.

| screen | state | width | english text left | layout | result | fix |
|---|---|---|---|---|---|---|
| | | | | | | |

### 2.3 Contrast (V1)

| pair | where | ratio | result |
|---|---|---|---|
| other label `#4a5468` on the pill `#f2f5fb` (rendered) | the switch, every state (D1) | 6.97:1 | pass (≥ 4.5:1) |
| current label `#0b1220` on the white segment `#ffffff` (rendered) | the switch, every state (D2) | 18.72:1 (17.14:1 on `#f2f5fb`) | pass (≥ 4.5:1) |

The node's own colours would give 4.38:1 (`#6b7380` on `#f2f5fb`, why D1 exists) and 15.46:1
(`#1f2433` on white). The other label on its hover shade (`#1d56f0` at 8 % over `#f2f5fb`, about
`#e1e8fa`): 6.21:1 (D3).

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
- 2026-11-09: checkpoint of the switch (T013; FR-001, FR-003, FR-011, SC-005 keyboard part; V1
  step 1, V9). T011 and T012 by one agent: `LanguageSwitch` in `TopBar`'s right group, every
  state; §2.1 98 rows for `7341:101654` over six states, none open (85 `match`, the rest D1–D4);
  §2.3 two passing pairs (6.97:1 and 18.72:1). The loop fixed one thing in the build (T011's
  `bg-white` is no class under KERN's theme, which resets Tailwind's colours: the current
  segment is `bg-kern-layout-background-default`) and added D4 (below 350 px signed in, 334 px
  in a connection, the right group wraps to its own row at the right end, `ml-auto`; signed out
  it fits row 1 down to 320 px; no horizontal scroll). D3's `kern-action-default/8` renders the
  same `#1d56f0` at 8 % as spec 008's `kern-action-state-indicator-default/8`, which KERN defines
  as `var(--kern-color-action-default)`. Gates: `npm run lint`, `npm test`, `npm run build`
  green (`rules/` 45 files, 2362 tests; `frontend/` 31, 988, the 3 new from `copy.test.ts`
  finding `LANGUAGE_SWITCH_COPY`; `mcp/` 15, 408); no backend file changed, so no pytest ran
  (phase 1's 2062 passed stands). Browser (Playwright, Chromium, dev server, fresh `en-US`
  context, 1455 px): on `/login` the group reads "Language" with "Deutsch" (`lang="de"`) and
  "English" (`lang="en"`, `aria-current="true"`); the first Tab lands on "Deutsch" with
  `:focus-visible`; Enter makes `<html lang="de">`, the group "Sprache", `aria-current` moves to
  "Deutsch", the focus stays on it, `connection-portal:language:v1` = `de`, no request, one
  navigation entry and the `window` sentinel survives (no reload); Tab and Space switch back to
  English the same way; a mouse click switches without the focus ring; the next call after the
  switch (`POST /api/auth/login`) carries `Accept-Language: de` while the alert's text stays
  English (the backend's texts are phase 3); the sign-in page's copy and the pages' tab titles
  stay English until phase 5 (expected; the app name "Konnekt" is the same in both). The
  backend's log of the run holds no `Accept-Language` and no German. Open for a person: T012's
  200 % with the browser's own zoom (the chat used `document.body.style.zoom` and a 320 CSS px
  viewport), D3's hover shade by eye, and telling the designer D1–D4; Firefox and a screen
  reader (V9's voices) come with phase 6.
