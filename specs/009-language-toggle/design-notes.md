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
phases 5 and 6; one row per screen of spec 008's contract and width. Phase 5's screen tasks run
side by side, so each writes only under its own heading below (the coordinator, 2026-11-10).
Phase 5's checks: Chromium (Playwright scripts, one browser per task), the Vite dev server and
the backend on a scratch copy of the dev database (`template_db_009`, worker off, no EUDIPLO);
"320" is a 320 CSS px viewport at device scale 2 (a 640 px window at 200 %), as spec 008's
"320 px (200 %)" rows.

#### S1, S2 Sign in, forgot password (T033)

| screen | state | width | english text left | layout | result | fix |
|---|---|---|---|---|---|---|
| S1 | default, first visit in an `en-US` browser, typed username and password, password shown; "DE" clicked | 1440 | none (only "Konnekt", "DE" / "EN" and the switch's language names "Deutsch" / "English") | as English: card 832, 202, 440 × 496 in both; no clip, no sideways scroll | no reload (a `window` sentinel survives), `<html lang="de">`, tab "Anmelden · Konnekt"; the typed values, the shown password and `aria-pressed="true"` of "Passwort anzeigen" kept | — |
| S1 | the same | 320 | none (as above) | card 273 wide as English; "Ihre Anmeldung ist verschlüsselt" wraps to two lines next to the lock (card 520 high, English 496); the tagline's heading breaks after "EUDI-" (T031's `AuthLayout`); no clip, no sideways scroll | as at 1440 | — |
| S1 | wrong password (the real backend), then "EN", then a second attempt | 1440 | none | the alert's title wraps to two lines in the card; fields as English | the alert "Benutzername oder Passwort ist falsch. Überprüfen Sie beides und versuchen Sie es erneut." (the server's German, split as in English); both fields `aria-invalid`; after "EN" the page is English, the alert stays German and both fields stay invalid with their values (quickstart V1 step 2); the next attempt's alert is English | — |
| S1 | the same | 320 | none | the alert's text wraps over seven lines inside the alert; no clip, no sideways scroll | as at 1440 | — |
| S1 | the request running (`POST /api/auth/login` held by Playwright) | 1440, 320 | none | the button's label "Anmeldung läuft …" fits one line at both widths | busy as in English (`aria-disabled`) | — |
| S1 | server error (`500` with the server's German message and an error ID, by Playwright routing), then "EN" | 1440, 320 | none | at 320 the title "Die Anmeldung ist fehlgeschlagen." wraps to three lines, the body to eleven; no clip, no sideways scroll | title "Die Anmeldung ist fehlgeschlagen.", the server's message, "Fehler-ID: 3f2c9a7e-0000"; after "EN" the website's own texts switch ("Logging in failed.", "Error ID") and the server's message stays German (the spec's edge case "A notice from the server") | — |
| S1 | network failure (the request aborted) | 1440, 320 | none | as the server error | "Die Anmeldung ist fehlgeschlagen." / "Versuchen Sie es in einem Moment erneut." | — |
| S1 | the logged-out toast (the history entry's `loggedOut` flag, first visit in a `de-DE` browser), then "EN" | 1440, 320 | none | the toast at the bottom centre as English | "Sie sind abgemeldet."; after "EN" the toast shown reads "You’re logged out." (the website's own text follows the language) | — |
| S2 | default, reached by "Forgot password?" in English, "DE" clicked, then "EN", "DE" and "Zurück zur Anmeldung" | 1440 | none | the text wraps to three lines (English two): card 264 high (English and the design 240); no clip | heading "Passwort vergessen?", tab "Passwort vergessen · Konnekt"; back in English the texts are spec 008's, identical to before; "Zurück zur Anmeldung" opens `/login`, tab "Anmelden · Konnekt" | — |
| S2 | the same | 320 | none | the small tertiary button "Zurück zur Anmeldung" wraps to two lines (56 high, English one line, 40); the text six lines; card 384 high (English 296); no clip, no sideways scroll | as at 1440 | — |

#### S3, S4, S5 Welcome page, overview, local-drafts offer (T034)

Account `lang-check` (its four server drafts, untouched); the list's `GET` routed to add a published
active "Fishing licence" (a 150-character description) and a deactivated "Residents’ parking
permit", or answered `[]` (welcome page), `500` with an `error_id`, or held (loading); `DELETE`s of
the routed rows routed (`200`, `500`, aborted). Local drafts written into `localStorage` in format 2
(one stored draft's record, an unnamed one, an 81-character name) in fresh contexts, gone with
them. Each state opened in English (`en-US`), the switch clicked (or written by another tab where a
dialog makes the header inert), the texts and `layoutProblems()` compared, and back to English.
Every switch: no reload (a `window` sentinel kept), the switch then offers "English". "Content"
below: the rows' and drafts' names and descriptions as entered, "lang-check", "Konnekt",
"Name", "Status" (allowlist).

| screen | state | width | english text left | layout | result | fix |
|---|---|---|---|---|---|---|
| S4 | with rows (active, deactivated, drafts) | 1440 | none (content only) | as English; the hint wraps to 2 lines | pass: "Ihre Anbindungen", "6 Anbindungen", "Suchen", "Datum", "Aktiv" / "Deaktiviert" / "Entwurf", "Bearbeitet 03.10.2026", "Ansehen", "Bearbeiten", "Anbindung erstellen"; tab "Ihre Anbindungen · Konnekt"; the description cut with "…" | — |
| S4 | with rows | 320 | none | no problem; rows wrap as in English, "Bearbeitet 20.10.2026" on its own line, the description cut with "…" | pass | — |
| S4 | searching "fish", typed | 1440, 320 | none | none | pass: "1 von 6 Anbindungen", the query kept through the switch | — |
| S4 | search field, empty | 320 | none | the placeholder "Anbindungen durchsuchen" (195 px) was cut to "Anbindungen durchsuc…" in its 181 px (the field kept the ×'s 48 px while empty) | pass after the fix: 213 px of room, whole; English unchanged (its placeholder fits either way) | `SearchToolbar`: `pr-48!` only with a query, `pr-16!` while empty (the × shows only then; R9 has no step for a placeholder) |
| S4 | no results "taxi" | 1440, 320 | none | none | pass: "Keine Anbindung passt zu „taxi“.", the hint, "Suche leeren"; query kept | — |
| S4 | delete dialog: active, deactivated, draft | 1440, 320 | none | none; 320: the title wraps over 4 lines with a long name, as in English | pass (other tab): „Fishing licence“ löschen?, the three bodies, "Anbindung behalten" / "Anbindung löschen"; the dialog stays open; at 320 the page's `scrollY` moved 249 → 297 under the dialog (the longer German above keeps the same rows in view: scroll anchoring) | — |
| S4 | delete failed: no answer, `5xx` | 1440, 320 | none | none | pass: "Konnte nicht gelöscht werden", "Es wurde nichts geändert. Prüfen Sie Ihre Internetverbindung …", the server's German with "Fehler-ID:", "Erneut versuchen" | — |
| S4 | after delete (in German) | 1440, 320 | none | none | pass: toast "„Fishing licence“ gelöscht.", "5 Anbindungen", focus on the h1 | — |
| S4 | edit entry question (published row's "Edit") | 1440, 320 | "Edit “Fishing licence”?", its text, "Cancel", "Edit connection" | none | open: `EDIT_ENTRY_COPY` is `FormConnectionEdit`'s (T035, marked `TODO(009, T035)` in `index.tsx`) | T035: **closed after wave 3** (`EDIT_ENTRY_DIALOG_COPY`; T035's row "S17, S18 the overview's entry question" is clean) |
| S4 | failed load (routed `500`) | 1440, 320 | the routed answer's English message (the route's content; the server answers in German) | none | pass: "Ihre Anbindungen konnten nicht geladen werden", "Erneut versuchen", the error ID | — |
| S4 | loading (memory none, the list held) | 1440, 320 | none | none | pass: "Ihre Anbindungen werden geladen …" (loader and h1) | — |
| S4 | after Save and exit (router state, reload) | 1440, 320 | none | none | pass: toast "Entwurf gespeichert. Sie können jederzeit weiterarbeiten." | — |
| S3 | welcome page (list `[]`) | 1440, 320 | none | none | pass: "Willkommen bei Konnekt", "Erstellen Sie Ihre erste Anbindung", the sentence, steps "Dokumente auswählen", "Regeln festlegen", "Testen", "Veröffentlichen" (keyed by glyph, not re-keyed), "Anbindung erstellen"; tab "Willkommen · Konnekt" | — |
| S5 | one draft, welcome and overview | 1440 | none | none | pass: the heading "Nicht gespeicherte Änderungen in „Taxi licence“", the dated sub-line "Am 06.11.2026, 13:20 beim Schließen der Seite nur auf diesem Gerät gespeichert. …" | — |
| S5 | several (3), welcome and overview | 1440 | none | none | pass: "… in 3 Anbindungen", "Bearbeitet · 06.11.2026, 13:20", "Neu, nie gespeichert · …", "Unbenannte Anbindung", "Verwerfen" | — |
| S5 | one and several, welcome and overview | 320 | none | "Bearbeitung fortsetzen" (a nowrap button) ran to 343 px: page scrolled sideways (352 > 320) | pass after the fix: no problem; the buttons wrap under each line as in English | R9 step 1, the short form: "Fortsetzen" (the task's own word; glossary row amended) |
| S5 | discard dialog open | 1440, 320 | none | none | pass (other tab): "Nicht gespeicherte Arbeit verwerfen?", the body with "Der gespeicherte Entwurf bleibt unverändert.", "Abbrechen" / "Verwerfen"; the dialog stays open | — |
| S5 | after discard (in German) | 1440, 320 | none | none | pass: status "Nicht gespeicherte Arbeit verworfen.", focus "Fortsetzen Unbenannte Anbindung", "… in 2 Anbindungen" | — |

#### S6, S7, S14, S18 Entering and leaving a flow, step 1, publish and save, editing (T035)

Checked 2026-11-10 (scripts in the session's scratchpad `browser/T035/`), signed in as `lang-check`,
on new flows (discarded) and on one own draft with four rules of which two contradict each other
(Personal ID with 3 data items, Driving licence without; since deleted), its GET routed as a
published connection for S17/S18; failures, conflicts, the held and the answered publish and save
by Playwright routing (no EUDIPLO). Each state opened in English (`en-US`), the switch clicked, or
written by another tab where a dialog makes the header inert ("other tab"), the texts compared and
`layoutProblems()` plus a check of text running past its bordered box (button, alert, dialog, card)
run in both languages, and back to English, which read spec 008's words each time. Every switch:
no reload (a `window` sentinel kept), typed input, the step, the open dialog and its tick kept.
The root parts of S8 (T036's rows "root") are here too. "Content": the typed name and description,
the connections' and variants' names, "Rule 03", data keys such as "birthdate", the servers'
messages already shown (the spec's edge case), "(optional)" (G§2: the same word).

| screen | state | width | english text left | layout | result | fix |
|---|---|---|---|---|---|---|
| S7 | create flow, step 1 empty; "Deutsch" clicked | 1440 | none | as English, no problem | clean: "Schritt 1 von 4", "Weiter: Dokumente", h1 and tab "Benennen Sie Ihre Anbindung (· Konnekt)", header "Neue Anbindung", the card ("Welchen Dienst binden Sie an?", "Name der Anbindung", "Beschreibung", the placeholders "z. B. …", the draft note), footer "Speichern und verlassen" / "Dokumente auswählen" | — |
| S7 | the same | 320 | none | **V4**: the step line "Schritt 1 von 4 · Weiter: Dokumente" stays one row; the footer wraps as in English, "Speichern und verlassen" (251 px) on its own row, "Dokumente auswählen" under it at the right; h1 two lines; no clip, overlap or sideways scroll | clean | — |
| S7 | missing name ("Speichern und verlassen" without a name, a description typed); EN, DE by click | 1440, 320 | none (the description is content) | none | clean: the field's message "Geben Sie einen Namen für die Anbindung ein." (the server's German, word for word) ↔ "Enter a name for the connection." at each switch (worded at render: `connectionErrorsOf()`); description kept | — |
| S7 | too long name and description (`maxlength` removed) | 1440, 320 | none | none | clean: "Der Name darf höchstens 200 Zeichen lang sein." / "Die Beschreibung darf höchstens 500 Zeichen lang sein.", English again after "EN" | — |
| S7 | the name's ⓘ hovered | 1440, 320 | none | none | clean: the two lines in German | — |
| S7 | `/get-started` (list routed `[]`): its loading (list held) and step 1 | 1440, 320 | none | none | clean: loader and tab "Ihre Anbindungen werden geladen …", the hidden h1 "Erstellen Sie Ihre erste Anbindung"; step 1 as the create flow's | — |
| S7 | a stored draft's step 1 (badge "Entwurf", the draft note) | 1440, 320 | none | at 320 the header's name is cut to "T…" beside "Entwurf" (spec 008's cut; English "Draft" leaves more) | clean | — |
| S6 | leave question after typing name and description; other tab | 1440, 320 | none | none | clean: "Diese Anbindung verlassen?", its text, "Anbindung verwerfen" / "Fortschritt speichern"; open across both switches; Escape keeps name and description | — |
| S6 | log-out question; other tab | 1440, 320 | none | none (three buttons stacked as in English) | clean: "Vor dem Abmelden speichern?", "Ihre letzten Änderungen gehen verloren, wenn Sie sich jetzt abmelden.", "Abbrechen", "Trotzdem abmelden", "Speichern und abmelden" | — |
| S6 | failed "Speichern und verlassen" (PUT routed `500` with an error ID); switched by click while the toast shows | 1440, 320 | none | at 320 the message wraps beside "Erneut versuchen" in the Toast's own layout, inside the toast | clean: "Konnte nicht gespeichert werden. Prüfen Sie Ihre Internetverbindung …", "Fehler-ID: …", "Erneut versuchen"; the same toast reads English after "EN" (`saveFailureToastOf()`) | — |
| S6 | conflicts after "Speichern und verlassen": `draft_changed` (`409` routed), `draft_deleted` (`404`); other tab | 1440, 320 | the routed server message (content of the edge case) | none | clean: "Dieser Entwurf wurde geändert" / "… gelöscht", the hint, "Abbrechen", "Neu laden", "Mit Ihrer Version überschreiben" / "Als neuen Entwurf speichern"; the deleted text, the website's own, follows the switch | — |
| S6 | restore question (the app's own local draft, page reloaded); other tab | 1440, 320 | none (the date is the single format, FR-012) | none | clean: "Nicht gespeicherte Änderungen wiederherstellen?" (also the tab), "Auf diesem Gerät gibt es nicht gespeicherte Änderungen an T035 publish check vom 10.11.2026, 01:59.", "Verwerfen" / "Änderungen wiederherstellen" | — |
| S8 (root) | a data item's question (unticking "Geburtsdatum", rules check it) and a document's trash question; other tab, EN and back | 1440, 320 | none | none | clean: the names follow the switch in the open dialog („Geburtsdatum“ ↔ "Date of birth"; T036's stale name closed: the question words the names from the catalog of the moment, `removalInLanguage()`); the box stays ticked after Escape | — |
| S8 (root) | "Führerschein entfernt." toast, switched by click EN and DE, then "Rückgängig" | 1440, 320 | none | none | clean: the shown toast follows ("Driving licence removed." / "Undo"), not shown again; Undo puts the document back | — |
| S8 (root) | "Regeln festlegen" with Führerschein without data: the no-data question; other tab | 1440, 320 | none | none | clean: "Keine Daten in 1 Dokument ausgewählt", "Für Führerschein sind noch keine Daten ausgewählt. …", "1 Dokument entfernen" / "Daten auswählen", the name following the switch | — |
| S8 (root) | catalog failed (`500` routed) and loading (held) | 1440, 320 | none | none | clean: "Die Wallet-Dokumente konnten nicht geladen werden", "Prüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.", "Erneut versuchen"; "Die Wallet-Dokumente werden geladen …" | — |
| S8 (root) | the dropped-data note (catalog routed without "Date of birth"), "Entfernen" and its question; other tab | 1440, 320 | none ("birthdate" is the key) | none | clean: "Die Wallet bietet einige Daten dieses Entwurfs nicht mehr an", "Personalausweis – birthdate"; the question's name follows the switch | — |
| S14 | summary from the test step, with findings; other tab | 1440, 320 | none of the dialog's; behind it the test step's own texts (T039's) | none | clean: "Bereit zum Veröffentlichen?", "Nach dem Veröffentlichen kann die Anbindung in Ihre Dienste eingebunden werden.", "Personalausweis · 3 Felder", "Führerschein · 0 Felder", "Standard · 4 Regeln", "Standard: Niemand kann diese Regeln erfüllen. 2 Regeln widersprechen einander." (T026's line), "Zurück zum Test", "Anbindung veröffentlichen"; open across the switches | — |
| S14 | failed (publish routed `500` with an error ID); other tab | 1440 | none | none | clean: the alert, "Fehler-ID: abc123def456", the summary kept, "Erneut versuchen" | — |
| S14 | the same | 320 | none | **was**: "Internetverbindung" in the alert's bold title ran 7 px past the alert's border (text to 264, alert to 257; English fits) | clean after the fix: the word breaks "Internet-" / "verbindung" inside the alert; English unchanged | R9 step 3: a soft hyphen in the German `publishFailed` and `saveFailed`; step 1 has no shorter form, step 2 (`break-words`, also with `min-w-0`) leaves the word whole in the kit's flex title (measured) |
| S14 | publishing (publish held), then published (answered `200`); other tab while publishing | 1440, 320 | none | none | clean: "Wird veröffentlicht …" (also the dialog's name), "Das dauert einige Sekunden." ↔ English; "Veröffentlicht", "Die Seite Ihrer Anbindung wird geöffnet …", then the details | — |
| S14 | without rules (a new flow, discarded) | 1440, 320 | none | none | clean: "Ohne Regeln veröffentlichen?", "Ohne Regeln können alle, die diese Dokumente teilen, einen Antrag stellen.", "Personalausweis · 1 Feld", "Keine Regeln", "Regeln hinzufügen" | — |
| S17, S18 | the overview's entry question (the row routed as published); other tab | 1440, 320 | none (the rows' names) | none | clean: "„T035 publish check“ bearbeiten?", its text, "Abbrechen" / "Anbindung bearbeiten" (T034's open row closed) | — |
| S18 | step 1 of the edit flow (GET routed as published); click | 1440 | none | none | clean: h1 and tab "Details der Anbindung", the hint, badge "Aktiv", the card's hint, F49's note "Ihre Änderungen werden wirksam, wenn Sie sie speichern. …", footer "Änderungen verwerfen", "Dokumente auswählen", "Speichern" | — |
| S18 | the same | 320 | none | as English: the step links "Anbindung Dokumente Regeln Test" in one row, the footer wraps as in English | clean | — |
| S18 | leave question after renaming; "Änderungen verwerfen" question; other tab | 1440, 320 | none | none | clean: "Ihre Änderungen speichern?", its text, "Änderungen verwerfen" / "Speichern"; "Ihre Änderungen verwerfen?", "Weiter bearbeiten" / "Änderungen verwerfen" | — |
| S18, S14 | "Speichern" → the no-data question (Führerschein without data) → "1 Dokument entfernen" → "Änderungen speichern?"; other tab; then "Gespeichert" (PUT routed `200`) | 1440, 320 | none | none | clean: the save dialog's intro, summary and "Regeln erneut prüfen" / "Speichern"; "Gespeichert", then the details | — |

#### S8 Documents step (T036)

Checked 2026-11-10 (scripts in the session's scratchpad `browser/T036/`), signed in as
`lang-check`, on two own drafts (Personal ID with 3 data items that rules check and Driving
licence without data; no document), since deleted, and the first with its GET routed as a
published connection for the edit flow (U98). "Step's own" = `DocumentsStep/`; the step head
("Choose documents and data" and its hint), the footer ("Back", "Save and exit", "Set rules",
"Discard changes", "Save"), the tooltip "Add a document first", the two dialogs (removal
question, "No data selected …") and the tab title are the editor root's (T035) and still English:
listed per row as "root", not counted against this screen. **Closed by T035 (wave 3)**: its "S8 (root)" rows find the step head, the footer, the
tooltip, both dialogs (their names following a switch) and the tab title German.

| screen | state | width | english text left | layout | result | fix |
|---|---|---|---|---|---|---|
| S8 | Personal ID shown, 3 of 25 chosen; switch by a click on "Deutsch" | 1440 | none of the step's own; root: step head, footer, tab title | no clip, overlap or sideways scroll (`layoutProblems` empty, as in English) | clean: "Hinzugefügte Dokumente (2)", "Dokument hinzufügen", "Personalausweis" / "Führerschein", "3 von 25 Feldern ausgewählt", "Alle Felder", the 25 German field labels, "Dokument 1 von 2"; US3-AS1: list item ids, order, glyphs (hash of `src`) and `aria-current`, and the 26 checkbox ids, order and ticks identical before and after; **V9**: German labels 121–156 ms after the pointerdown (4 runs: three at 1440, one at 320; prefetch landed: `de` `document-types` and `option-sets` fetched once after load, no request on the switch) | — |
| S8 | the same | 320 | the same | none; the header's count wraps to 2 lines beside "Alle Felder" (English: 4 lines, "3 of 25 data items chosen"); long labels ("Persönliche Verwaltungsnummer", "Ausstellende Gebietskörperschaft") wrap under their text as in English | clean | — |
| S8 | Driving licence shown, none chosen | 1440, 320 | none of the step's own | none | clean: "Noch keine Felder ausgewählt", "Dokument 2 von 2"; "Ausstellende Gebietskörperschaft" fits the third column at 1440 | — |
| S8 | no document (empty panel) | 1440, 320 | root only | none | clean: "Hinzugefügte Dokumente (0)", "Noch keine Dokumente", "Hinzugefügte Dokumente erscheinen hier, mit den Daten, die Sie auswählen können." | — |
| S8 | search card open: "Verfügbar (2)"; with both added and "Per" typed: "Hinzugefügt (1)", "Personalausweis" tagged "Hinzugefügt"; "xyz": "Keine Dokumente passen zu „xyz“."; "Füh" + Enter adds Führerschein | 1440 | none | none | clean | — |
| S8 | search card, an added row | 320 | none | **was**: "Personalausweis" (106 px) ran 7 px out of its 99 px box, 1 px from the "Hinzugefügt" tag (English "Personal ID" leaves 70 px) | clean after the fix: the name breaks (row 56 px instead of 40), 12 px from the tag; English rows unchanged (40 px) | R9 step 2: `break-words` (plus `hyphens-auto`, so a browser with a German dictionary hyphenates; this Chromium has none and breaks "Personalauswe-is" without a hyphen) on `SearchResultItem`'s name; step 1 has no shorter form for "Hinzugefügt", step 3 (`&shy;`) can't apply: the name is the catalog's (UNCERTAIN in T036's report) |
| S8 | search card open with "Per" typed; switch by a **click** on the header's switch, EN → DE → EN | 1440, 320 | none | none | clean: the card stays open, the query "Per" stays, its groups and rows follow the language ("Added (1)" / "Personal ID" ↔ "Hinzugefügt (1)" / "Personalausweis"), the focus on the switch's button; a click elsewhere, Escape (focus on "Add document") and Shift+Tab out still close it, reopening starts empty | the card's outside-press and blur ignore the header's switch (`LANGUAGE_SWITCH_SELECTOR`, T036 UNCERTAIN); the search matches the shown language's labels ("Dri" finds nothing in German) |
| S8 | "Set rules" with Driving licence empty → "Choose data": flags | 1440, 320 | root: the dialog ("No data selected in 1 document", "Choose data") | none | clean: "1 Dokument braucht Daten" in red, the red item, "Wählen Sie mindestens ein Feld aus oder entfernen Sie dieses Dokument."; switching back gives the English flags word for word | — |
| S8 | removal question (trash of Personal ID, rules check it), a data item's question (unticking "Geburtsdatum"); switch from another tab with the dialog open | 1440, 320 | root: the dialogs' words (`RemoveDataDialog` doesn't pass the language yet; "Citizens won’t share their geburtsdatum any more." mixes the German label into the English sentence) | none | dialog and its tick kept over the switch; German words ready in `removalDialogCopyOf(…, language)` (tested) for T035 | T035: pass the language to `removalDialogCopyOf`, `noDataTitle`, `noDataText`, `removeDocumentsLabel` and read `DOCUMENTS_COPY` |
| S8 | edit flow (U98, published, GET routed) | 1440, 320 | root: step head, "Back", "Discard changes", "Set rules", "Save", tab title | none | clean (the step's parts as in the create flow) | — |
| S8 | Driving licence shown, a box ticked, page scrolled 400 (320) / 188 (1440); switch by a click | 1440, 320 | — | — | clean: scroll, shown document and tick kept | — |

#### S9, S11, S12 Rules step, variants, findings (T037)

Checked 2026-11-10 (scripts in the session's scratchpad `browser/T037/`: `check.mjs`, `banner.mjs`,
`tabs.mjs`), signed in as `lang-check`, on an own draft (since deleted): Standard with Rule 02
(Nationality includes one of DE, AT), Group 02 (AND) with Rule 03 (age ≥ 21) and Rule 04 (age <
18), a conflict, Rule 05 and Rule 06 on data no longer requested (Family name); "Ambulance" linked
to Standard, "School transport" started empty. Each state opened in English (`en-GB`), the switch
clicked, or written by another tab where a menu, popover or modal is open, the texts compared
with `visibleTexts()` and `layoutProblems()` run. "Content" below: the rules' and groups' names,
the saved English citizen messages, the variant names, "Standard", "Konnekt", the symbols ≥ < ·.
Every run: `updated_at` and the branches' JSON of `GET /api/form-connections/<id>` identical before
and after, no request but GETs (the switch itself fetches the connection once with `de`: T030's
`useFormConnection` refetch; the catalog's prefetch had landed before), the browser storage
unchanged by a switch but for the language, no console error.

| screen | state | width | english text left | layout | result | fix |
|---|---|---|---|---|---|---|
| S9 | the list: a finding under a group, the banner, the unrequested banner, page scrolled 400; switch by a click | 1440 | none (content only) | no problem; the item at the top of the view stays at 250 px (scroll anchoring: `scrollY` 400 → 424 as the longer German above grows) | clean: US3-AS2 "Personalausweis · Staatsangehörigkeit enthält eines von Deutschland, Österreich"; notes "Kann nicht zusammen mit Rule 04 erfüllt werden." under Rule 03 and the reverse under Rule 04; banner "Group 02: Rule 03 und Rule 04 widersprechen einander, daher kann niemand die Regeln von Standard erfüllen."; group note "Rule 03 und Rule 04 in dieser Gruppe widersprechen einander."; tab "Standard hat Befunde"; subtitle "Alle Regeln müssen erfüllt sein"; "Rule 06 in Standard prüft Daten, die nicht mehr angefordert werden. …", "In „Dokumente“ hinzufügen", "Familienname wird nicht mehr angefordert."; step head "Regeln zur Antragsberechtigung festlegen" (the root's, T035) | — |
| S9 | the same | 320 | none | no problem; "In „Dokumente“ hinzufügen" (nowrap) fits under the text; `scrollY` 400 → 480 with the item in view at 196 px before and after | clean | — |
| S9 | a rule's ⋯ menu open, focus on "Edit rule"; switch from another tab | 1440, 320 | none | no problem | clean: the menu stays open with "Regel bearbeiten", "Umbenennen", "Duplizieren", "In Variante kopieren", "Mit anderen Regeln gruppieren", "Link kopieren", "Regel löschen"; the focus stays on its entry | — |
| S9 | select mode, Rule 02 and Rule 05 chosen; switch by a click; then "Regeln gruppieren" and "Rückgängig" | 1440, 320 | none | no problem | clean: bar "2 Regeln ausgewählt", "Abbrechen", "Regeln gruppieren", the boxes "Rule 02 auswählen" / "Rule 05 auswählen" still ticked; toast "Rule 02 und Rule 05 sind jetzt in Group 03." with "Rückgängig" | — |
| S9 | inline rename of Rule 02 to "Rule 03", refused; switch by a click | 1440, 320 | none | no problem | clean: the field stays open with "Rule 03" and the refusal follows: "In Standard gibt es bereits eine Regel namens „Rule 03“."; the next press elsewhere ends the rename as leaving the field does | `ItemName`: a blur onto the language switch keeps the field (`isLanguageSwitchTarget`), a later press elsewhere ends it; the refusal is recomposed in the language shown |
| S9 | "Delete Rule 03?" in Standard with Ambulance linked; switch from another tab | 1440, 320 | none | no problem | clean: "Rule 03 löschen?", "Dadurch wird die Regel aus Standard und aus den Varianten gelöscht, die Standard folgen: Ambulance. Hat eine Variante diese Regel geändert, behält sie ihre eigene Version. Group 02 enthält nur noch eine Regel, daher wird die Gruppierung in Standard und den darauf basierenden Varianten aufgehoben.", "Abbrechen", "Regel löschen"; the dialog stays open | — |
| S9 | AND / OR → UND / ODER: the connector pill and the group header after switching Group 02 to ODER (T032's component) | 320 | none | pill "UND" 74 × 28 (English "AND" 73), "ODER" 83 × 30 (English "OR" 66 × 30), one line, 1 px of `scrollWidth` over its box in both languages; the group header 81 high in both ("Mindestens eine Regel muss erfüllt sein" and "At least one rule must be met" both wrap to two lines) | clean | — |
| S9 | a link to a rule that no longer exists (German stored, a new page) | 1440, 320 | none | no problem; at 320 the title wraps over four lines | clean: "Dieser Link verweist auf eine Regel oder Gruppe, die es nicht mehr gibt.", "Ausblenden" | — |
| S9 | "Link kopieren" from a rule's menu | 1440, 320 | none | no problem | clean: the toast in German (headless Chromium has no clipboard: "Der Link konnte nicht kopiert werden. …") | — |
| S11 | the tab row: Standard, Ambulance, School transport, "+ Variante hinzufügen" with its ⓘ | 320 | none | the tabs wrap one per row as in English (67, 81, 122 px wide, unchanged); "Variante hinzufügen" with its ⓘ on its own row; no clip | clean: "Varianten" (the tab list's name), "Informationen zu Varianten", "Informationen zu School transport", "Aktionen für Ambulance" | — |
| S11 | "Add variant" with "ambulance" typed and refused; switch from another tab (the header is inert) | 1440, 320 | none ("*" and "(optional)" are the same in both, G§2 "optional") | no problem | clean: "Variante hinzufügen", the intro, "Name der Variante", "Es gibt bereits eine Variante namens „Ambulance“.", "Beschreibung (optional)", "Beginnen mit", "Mit Standard verknüpft (empfohlen)", "Leer beginnen"; the typed name and the refusal kept, the refusal recomposed in German | `VariantDialog`: the refusal is recomposed in the language shown |
| S11 | "Copy to variant" popover with School transport ticked; switch from another tab; "Kopieren", then "Anzeigen" | 1440, 320 | none | no problem | clean: "Rule 02 in Varianten kopieren", the tick kept; toast "Rule 02 in School transport kopiert." with "Anzeigen" | — |
| S11 | Ambulance (linked), Rule 05 removed there; switch by a click | 1440, 320 | none | no problem | clean: "Mit Standard verknüpft", "1 von 5 Regeln aus Standard ist hier entfernt. Regeln, die Sie nicht ändern, folgen Standard und werden mit Standard aktualisiert.", the mark "Hier entfernt" | — |
| S11 | "Delete “Ambulance”?" from the tab's ⋯; switch from another tab; "Variante löschen", "Rückgängig" | 1440, 320 | none | no problem | clean: "„Ambulance“ löschen?", "Regeln, die Sie in Ambulance geändert oder hinzugefügt haben, werden gelöscht. Standard und School transport bleiben unverändert.", "Variante behalten"; toast "Ambulance gelöscht." | — |
| S11 | School transport, no rules | 1440, 320 | none | no problem | clean: "Noch keine Regeln", "Auch ohne Regeln gibt Konnekt die geprüften Daten an Ihren Dienst weiter. …", "Regel hinzufügen" | — |
| S12 | two duplicates (Group 02 on ODER, Rule 05 and Rule 02 duplicated): the banner collapsed, then expanded, switched EN → DE | 1440, 320 | none ("Redundant:" is the same in both, G§3) | no problem | clean: "2 Regeln sind Duplikate", "Befunde anzeigen" / "Befunde ausblenden", "Rule 07 ist gleich wie Rule 05.", "Rule 08 ist gleich wie Rule 02."; expanded kept over both switches | — |
| S12 | the tab tooltips (hover on Ambulance's icon) | 1440, 320 | none | no problem | clean: the problem's sentence, then "2 Regeln sind Duplikate"; School transport "Keine Befunde."; Ambulance's description as entered | — |

#### S10 Rule editor (T038)

Checked 2026-11-10 (scripts in the session's scratchpad `browser/T038/`: `check.mjs` 59/59 at
both widths, `footer.mjs`, `date.mjs`), signed in as `lang-check`, on an own draft (since deleted):
Standard with Rule 02 (Nationality includes one of DE, AT, the team member's English message "You
need German or Austrian nationality."), Rule 03 (age ≥ 21, the English proposal saved), Rule 04
(City or town is equal to "Stuttgart", the German proposal saved), a new Rule 05 in the editor.
Each state opened in English (`en-GB`), the switch clicked, or written by another tab where noted,
the texts compared with `visibleTexts()`, `layoutProblems()` and `textOverflow()` run in both
languages. "Content": the rule names, the saved and typed messages, typed values, "Standard",
"Konnekt", the licence class codes, the symbol chips ≥ < = > (unchanged). Every run: `updated_at`
and the branches of `GET /api/form-connections/<id>` identical before and after, no request but
GETs, no console error.

| screen | state | width | english text left | layout | result | fix |
|---|---|---|---|---|---|---|
| S10 | new rule, Personal ID chosen, the data menu open with "dat" typed; switch by a click, then from another tab both ways | 1440 | none | no problem | clean: the menu stays open with "dat" and the focus kept; "Personalausweis durchsuchen", "Geburtsdatum (Alter)", "Ablaufdatum", "Andere Daten benötigt?", "In „Dokumente“ hinzufügen"; the pickers "Dokumente: Personalausweis", "Daten auswählen", "Prüfung auswählen" | `ChoicePicker`, `ChoiceMenu`: a press on the switch neither closes the menu nor counts as leaving it (`isLanguageSwitchTarget`); a later press elsewhere closes it |
| S10 | the same | 320 | none | "In „Dokumente“ hinzufügen" (nowrap, 176 px) ran 12 px past the menu (58–247) and squeezed "Andere Daten benötigt?" to 0 px under it; after the fix the button moves under the question and wraps in the menu (row 171 × 92); English measured unchanged (row 171 × 84, "Need other data?" 27 px beside "Add it in Documents"); the input cuts its placeholder "Personalausweis durchsuchen" after "du…" (English "Search Personal ID" fits; "Search Driving licence" is cut in English too) | clean after the fix; the cut placeholder noted (the field's accessible name is whole) | `MenuFooter`: the row wraps (`flex-wrap`) and the button may wrap its words (R9 step 2); the placeholder: an ellipsis in `MenuSearchField` (components, reported) |
| S10 | the date check menu of the Date of birth open; switch by a click | 1440, 320 | none | no problem | clean: "Zeit bis heute" (ist mindestens ≥, ist weniger als <, ist genau =), "Zeit ab heute" (liegt mindestens ≥, liegt weniger als <), "Festes Datum" (liegt vor dem <, liegt nach dem >, ist der =); the menu stays open | — |
| S10 | age complete (21 typed), the proposal untouched; switch DE → EN → DE by a click (V8) | 1440, 320 | none | no problem | clean: the message follows, "Sie müssen mindestens 21 Jahre alt sein." ↔ "You need to be at least 21 years old.", "21" kept; "ist mindestens", "Jahre alt"; "Gezählt ab dem Tag, an dem die antragstellende Person ihre Daten teilt. Heute (10.11.2026) bedeutet das: geboren am oder vor dem 10.11.2005.", "Wer an diesem Tag 21 wird, zählt mit.", "Fehlt das Feld „Geburtsdatum“ oder kann es nicht gelesen werden, ist die Regel nicht erfüllt. Konnekt meldet dann „konnte nicht geprüft werden“.", "Nachricht für Bürgerinnen und Bürger:", "Regel verwerfen", "Regel speichern" | `index.tsx`: the editor's context carries `language`; an effect proposes an untouched proposal anew when the context (language or catalog) changes (R10); the open rule's local draft (spec 005) is rewritten with the new message, nothing goes to the server |
| S10 | a written message "Only adults can apply."; switch both ways; then emptied and the years changed to 18 | 1440, 320 | none (the message is content) | no problem | clean: the written message stays; emptied, it follows the condition again in German "Sie müssen mindestens 18 Jahre alt sein." (F9) | — |
| S10 | years 0, the field error; switch by a click | 1440, 320 | none | no problem | clean: "Geben Sie eine ganze Zahl größer als 0 ein." under the check row | — |
| S10 | Expiry date: "Time ago" 2 years, then "Time from now" 6 with the unit menu open (switch by a click), then "Fixed date" 23.04.2027 | 1440, 320 | none | no problem | clean: the menu reads "liegt mindestens / liegt weniger als / liegt genau" under "Zeit bis heute" and the picker "liegt mindestens … Jahre zurück" (not "ist mindestens", design-notes §4's carry); "Heute (10.11.2026) bedeutet das: Ablauf am oder vor dem 10.11.2024."; the unit menu stays open, "Jahre", "Monate", "in der Zukunft"; messages "Das Ablaufdatum Ihres Personalausweises muss mindestens 2 Jahre zurückliegen.", "… muss vor dem 23.04.2027 liegen." | `utils.ts`: `checkLabelOf()` takes `STATEMENT_TEXTS.yearsAgoWords` on a date other than the Date of birth |
| S10 | the fixed date's field (`<input type="date">`), in contexts `de-DE` and `en-GB` | 1440, 320 | — | no problem | the field shows 04/23/2027 in both: headless Chromium formats a date field by the browser's own UI language, not the page's `lang` nor the context's locale; the notes and messages show 23.04.2027 | not settable by the page; a person's step in a German browser (expected TT.MM.JJJJ) |
| S10 | Nationality, "includes one of", the values menu with "fra" typed; switch from another tab, then by a click | 1440, 320 | none | no problem | from another tab: the menu stays with "fra" ("Optionen durchsuchen", "Frankreich"); by a click: the menu closes and the typed "fra" is gone (the chosen values stay): `ValuesPicker`'s press-outside handler doesn't know the switch; after choosing: "Sie brauchen die Staatsangehörigkeit von Frankreich." ↔ "You need the nationality of France." | reported: `components/ValuesPicker` needs `isLanguageSwitchTarget` in `closeOnOutsidePointer` and `handleBlur` (not T038's file). **Fixed by the coordinator after wave 4 (2026-11-10):** both handlers let a press on the switch through; T038's `check.mjs` rerun at 1440: "values menu after a click on the switch: open, search kept", 59/59 |
| S10 | Licence classes: the part hint, the part menu with "b" typed (switch by a click), a class's issue date, then the classes' values menu (switch from another tab) | 1440, 320 | none (class codes) | no problem; at 320 "Klassen durchsuchen" is cut by the input after "durchsuch…" (English "Search classes" fits) | clean: "Das Feld „Führerscheinklassen“ hat Bestandteile. Wählen Sie den zu prüfenden Bestandteil.", "Führerscheinklasse B – Ausstellungsdatum", "b" kept; "Gezählt ab dem Datum, an dem die Klasse B erstmals ausgestellt wurde. Heute (10.11.2026) bedeutet das: am oder vor dem 10.11.2024.", "Fehlt die Klasse B oder kann sie nicht gelesen werden, …"; "Sie müssen seit mindestens 2 Jahren einen Führerschein der Klasse B besitzen."; "Wählen Sie mindestens eine Option aus.", "Fertig", "Erfüllt, wenn der Führerschein mindestens eine der ausgewählten Klassen enthält." | the placeholder as above (`MenuSearchField`, reported) |
| S10 | US3-AS3: rules saved earlier opened in German | 1440, 320 | none (saved messages are content) | no problem | clean: Rule 03 shows its saved English proposal "You need to be at least 21 years old.", Rule 02 "You need German or Austrian nationality.", Rule 04 "Sie müssen in Stuttgart wohnen."; over a switch Rule 02's own message stays, while a saved proposal is an untouched proposal and follows (Rule 04 → "You need to live in Stuttgart." and back; Rule 03 EN unchanged, back to DE "Sie müssen mindestens 21 Jahre alt sein.", after which "Regel verwerfen" asks "Änderungen an Rule 03 speichern?") | — (R10's rule as specified) |

#### S13 Test step (T039)

Checked 2026-11-10 (scripts in the session's scratchpad `browser/T039/`: `check.mjs`, `table.mjs`),
signed in as `lang-check`, on an own draft at the test step (since deleted): Standard with Rule 02
(Nationality includes one of DE, AT), Group 02 (AND: age ≥ 21, licence classes B or BE), Rule 05
(City or town = Stuttgart) and Rule 06 (class B issue date ≥ 2 years ago), "School transport"
without rules, "Ambulance" with two contradicting rules (its ⚠). Each state opened in English
(`en-GB`), the switch clicked, or written by another tab where a dialog is modal ("other tab"), the
texts compared with `visibleTexts()` and `layoutProblems()` plus `textOverflow()` run in both
languages, and back to English, which read spec 008's words each time. "Content": the personas'
names and generated values (places such as "Esslingen am Neckar", country names German writes
alike such as "Afghanistan"), the rules' and variants' names, the saved English citizen messages,
the variant's description, "Standard", "Konnekt", the symbols ≥ · –. The personas are random per
open, so each run names others. To switch while the personas' worker runs, the script held its
answers back by 3 s (wrapping the page's `message` listener; nothing read or kept), and dropped
them for the failure (the 5.5 s watchdog fails the run). No console error in any run.

| screen | state | width | english text left | layout | result | fix |
|---|---|---|---|---|---|---|
| S13 | results, Standard, each of the three personas (two not meeting, one meeting); switch by a click | 1440, 320 | none | no problem; at 320 the chips one per row as in English | clean: tab and h1 "Regeln mit Daten von Beispielpersonen testen (· Konnekt)", the intro, "Getestet, als würde heute geteilt: 10.11.2026.", "Beispielpersonen" (the chips' list), chips "Emre Zimmermann: erfüllt die Regeln von Standard nicht" / "Lea Müller: erfüllt die Regeln von Standard", "Alle neu erstellen", "Daten von Emre", "Daten bearbeiten", "Neu erstellen", "Geburtsdatum", "Staatsangehörigkeit", "Ort", "Führerscheinklassen", "B seit 02.06.2024", hidden "Erfüllt eine Regel nicht:"; "Ergebnis: erfüllt 4 Regeln nicht", "Regel" / "Nachricht für Emre", "Nicht erfüllt", "Alle Regeln müssen erfüllt sein" (the group), the statements "Personalausweis · Staatsangehörigkeit enthält eines von Deutschland, Österreich"; for the meeting persona "Ergebnis: erfüllt alle Regeln", "Regeln, die Lea erfüllt", hidden "Erfüllt". The same personas, values and outcomes (chip icons, row icons) before and after; English again word for word | — |
| S13 | the result table of a persona not meeting the rules | 320 | none | the statement's parts (`RuleSentence`, flex items) didn't break inside a word: German "Personalausweis", "Staatsangehörigkeit", "Führerscheinklasse B – Ausstellungsdatum" ran up to 104 px past the 153 px rule column into the message column (15 texts; English "Nationality", "Germany", "Stuttgart" by up to 18 px, already before the feature); `textOverflow()` misses it (the cell has no box of its own: `table.mjs` measures each text against its cell) | clean after the fix: no text past its cell in either language for all three personas; at 1440 nothing breaks | `ResultRow`: `[&_p>span]:min-w-0 [&_p>span]:break-words` on the statement's column (R9's second step), so a word wider than the column breaks inside it; at 320 English words break too ("Nationa lity") where they ran past the cell before |
| S13 | School transport (no rules); switch by a click | 1440, 320 | none | no problem | clean: "Ergebnis: erfüllt alle Regeln", "School transport hat noch keine Regeln und wird daher von allen erfüllt. Fügen Sie im Schritt „Regeln“ Regeln hinzu, um sie zu testen.", the chips "… erfüllt die Regeln von School transport" | — |
| S13 | Ambulance (contradicting rules): its ⚠ hovered | 1440, 320 | none (the description is content) | no problem | clean: "Ambulance hat Befunde", tooltip "Niemand kann die Regeln von Ambulance erfüllen.", "Ergebnis: erfüllt 1 Regel nicht", the chips "… erfüllt die Regeln von Ambulance nicht" | — |
| S13 | "Edit data" open, "31.02.2007" typed as the date of birth and "abc" as the age; switch from another tab, then back | 1440, 320 | none | no problem; at 320 one field per row | clean: "Daten von Laura bearbeiten", "Ändern Sie die Werte, um einen bestimmten Fall zu testen. Die Ergebnisse werden beim Speichern aktualisiert.", "Name", "Geburtsdatum", "Alter heute", "Personalausweis", "Führerschein", "Abbrechen", "Speichern und testen"; the dialog stays open with both typed entries, the errors worded again: "Geben Sie ein gültiges Datum ein, z. B. 28.02.2007.", "Geben Sie eine ganze Zahl ein, z. B. 25.", and in English again after the switch back | `EditDataDialog`: a draft kept its error in the language it was typed in; the errors shown are worded again in the language of the moment (`draftsInLanguage()`, the verdicts unchanged) |
| S13 | the dialog's values picker (Nationality) open; switch from another tab | 1440, 320 | none | no problem | clean: "Optionen durchsuchen" (field and placeholder), "Fertig", the German country labels; the menu stays open after the switch, in English | — |
| S13 | date of birth cleared, "Speichern und testen"; the toast showing, switch by a click | 1440, 320 | none | no problem | clean: "Nicht geteilt · bearbeitet" (hidden ", bearbeitet"), "Konnte nicht geprüft werden", toast "Ergebnisse aktualisiert. Maximilian erfüllt Group 02 nicht mehr."; the toast follows the switch: "Results updated. Maximilian no longer meets Group 02." and "Couldn’t be checked" | `TestStep`: the toast was worded once and kept as text; it now keeps its rows and words them in the language of the moment |
| S13 | "Neu erstellen" on the edited persona asks first; switch from another tab | 1440, 320 | none | no problem | clean: "Neue Daten für Maximilian erstellen?", "Ihre Änderungen an den Daten von Maximilian werden ersetzt. Die beiden anderen Beispielpersonen bleiben unverändert.", "Abbrechen", "Neue Daten erstellen"; open and in English after the switch | — |
| S13 | a regeneration of one persona (frame 19), switched while the worker ran: DE → EN, then EN → DE | 1440, 320 | none | no problem (frame 19 at 1440 and 320) | clean: the status region (`role="status"`) read "Neue Daten für Lukas werden erstellt …", then "Creating new data for Lukas…" after the switch while the run went on; the result arrived in the language chosen when it arrived ("Result: …"; the other way "Ergebnis: …"); after it, no English left | — |
| S13 | "Alle neu erstellen" (frame 18, skeletons) | 1440, 320 | none | no problem | clean: the status "3 Beispielpersonen werden erstellt …", announced, then emptied | — |
| S13 | the failure (the worker never answered); switch by a click, then "Try again" | 1440, 320 | none | no problem | clean: "Beispielpersonen konnten nicht erstellt werden", "Versuchen Sie es erneut oder veröffentlichen Sie, ohne zu testen.", "Erneut versuchen"; English after the switch ("Couldn’t create sample citizens", "Try again, or publish without testing."); "Try again" generated them anew | — |

#### S15, S16, S17 Details, draft details, confirmations (T040)

Checked 2026-11-10 (scripts in the session's scratchpad `browser/T040/`), signed in as
`lang-check`, on an own draft "T040 Anwohnerparkausweis für die Innenstadtzonen" (description
"PT-1"; Personal ID with 3 data items, Driving licence with 2; Standard with four rules, one
group and a contradiction, "Ambulance" (empty origin, with a description) with two equal rules),
deleted after the check. S15: its `GET` routed as a published connection (`status: 'published'`,
`is_active` true or false, ids, `trigger_url`, `pull_url` per variant), fetched through the real
server so that the catalog's labels came in the request's language; the actions' `POST`s routed
(success, the server's generic `500` in the request's language with an error ID) or passed to
the real server. Each state opened in English (`en-US`), switched by a click on "Deutsch" or,
with a menu or dialog open, from another tab; compared with `visibleTexts()` and
`layoutProblems()`; back to English, the texts identical to before every time; no reload (a
`window` sentinel kept) on every switch. "Content" below: the connection's name and
description, the variants' names, "Rule 0n" / "Group 02" and the identifiers "rule-n", the saved
citizen messages, the URLs, "lang-check", "Konnekt".

| screen | state | width | english text left | layout | result | fix |
|---|---|---|---|---|---|---|
| S15 | active, Summary open (from "View"), page scrolled (300 / 900) | 1440, 320 | none (content only) | none; scroll 300 → 324 (1440), 900 → 978 (320): the longer German band and counts above keep the same rows in view (scroll anchoring) | clean: h1 "Ihre Anbindung ist aktiv", "Bürgerinnen und Bürger können ihre Daten jetzt mit Ihnen teilen. …", "Aktiv", "Links für Ihren Dienst", "1 Anfragelink · 2 Ergebnislinks", "Links ansehen", "Zusammenfassung", "2 Dokumente · 5 Felder · 2 Varianten · 6 Regeln", "Zusammenfassung ausblenden", "Dokumente" / "Regeln", "Personalausweis 3 Felder" with the German field chips (server), the two findings lines in German (after `findingLinesOf(…, language)` was connected; before, T035's English bridge), the tabs' findings icons, the statements ("Staatsangehörigkeit" "enthält eines von" with the chips "Deutschland", "Österreich"; "UND"), "Anbindung bearbeiten", "Zu den Anbindungen"; tab "<name> · Konnekt" (content) | — |
| S15 | the Ambulance tab selected | 1440, 320 | none | none | clean: the selected tab kept through the switch and back | — |
| S15 | Links open | 1440, 320 | none | none; at 320 the URLs cut with "…" as in English | clean: "Links ausblenden" (`aria-expanded` kept true), "Anfragelink", "Ergebnislink", the ⓘ names "Informationen zum Anfragelink" / "… Ergebnislink", "Link kopieren" | — |
| S15 | the ⋯ menu open (other tab) | 1440 | none | none | clean: "Deaktivieren", "Anbindung löschen", the ⋯ named "Aktionen für die Anbindung"; the menu stays open | — |
| S15 | the ⋯ menu open (other tab) | 320 | none | the menu is 18 px wide in **both** languages (its 'full' placement spans the band's action box, which is positioned at ≥ 320 CSS px; `narrow:static` applies only below 320), so its entries can't be clicked at their centre | German as at 1440, the menu stays open; the layout as English | open, not a language issue: reported to the coordinator (spec 008, `StatusBand`'s action box at 320–350 px) |
| S15 | deactivated (Summary, Links, menu) | 1440, 320 | none | none | clean: "Anbindung deaktiviert", "Bürgerinnen und Bürger können keine neue Anfrage starten. …", "Deaktiviert", "Wieder aktivieren", the copy buttons off (their hover text is `CopyableUrl`'s, T032; not hovered here), the menu "Anbindung löschen" | — |
| S15 | loading (`GET` held) | 1440, 320 | none | none | clean: the skeleton and the footer "Zu den Anbindungen" | — |
| S15 | arrival after saving an edit (router state `saved`, German chosen) | 1440, 320 | none | none | clean: toast "Änderungen gespeichert." | — |
| S17 | deactivate dialog open (other tab) | 1440, 320 | none | none | clean: "Diese Anbindung deaktivieren?", F13's body in German, "Aktiv lassen" / "Deaktivieren", × "Schließen"; the dialog stays open | — |
| S17 | **US1-AS4**: deactivation failed with the server's `500` in English, German chosen (other tab), "Erneut versuchen" | 1440, 320 | the first notice's message until the retry (the spec's edge case "a notice from the server that is already on the screen") | none | pass: after the switch the dialog's own texts are German ("Konnte nicht deaktiviert werden", "Fehler-ID:") and the English message stays; the retry sends `Accept-Language: de` and shows "Etwas ist auf unserer Seite schiefgelaufen. Wenden Sie sich an eine Administratorin oder einen Administrator und nennen Sie die Fehler-ID." with "Fehler-ID: 7c1e2d3f-…" as before | — |
| S17 | US1-AS4 with the real server (the draft isn't published: its `409 not_published`) | 1440, 320 | as above | none | pass: "This connection is a draft. …" → after the retry in German "Diese Anbindung ist ein Entwurf. Setzen Sie ihn fort, um ihn zu speichern oder zu veröffentlichen." | — |
| S17 | deactivated in German (routed success) | 1440, 320 | none | none | clean: toast "Anbindung deaktiviert.", the grey band, "Wieder aktivieren" | — |
| S17 | reactivate dialog with its summary (other tab) | 1440, 320 | none | none; at 320 the dialog's body scrolls as in English | clean: "Diese Anbindung wieder aktivieren?", the body, "Dokumente": "Personalausweis · 3 Felder", "Führerschein · 2 Felder", "Regeln": "Standard · 4 Regeln", "Ambulance · 2 Regeln" (`PUBLISH_DIALOG_COPY`, T035), "Abbrechen" / "Aktivieren" | — |
| S17 | delete dialog of the active connection (other tab) | 1440, 320 | none | none | clean: "„<name>“ löschen?", the active body, "Anbindung behalten" / "Anbindung löschen" (the overview's `DELETE_CONNECTION_COPY`, T034) | — |
| S17 | edit entry question (other tab) | 1440, 320 | none | none | clean: "„<name>“ bearbeiten?", the body, "Abbrechen" / "Anbindung bearbeiten" (`EDIT_ENTRY_DIALOG_COPY`, T035) | — |
| S16 | the draft's details, Summary open, scrolled 250 | 1440, 320 | none | none; scroll 250 → 250 (1440), 250 → 274 (320) | clean: h1 "Diese Anbindung ist ein Entwurf", the sub-line, the date pill "Bearbeitet 10.11.2026, hh:mm", "Entwurf löschen", "Entwurf" pill, the Summary (unchecked, German statements), the Links card "Werden erstellt, sobald die Anbindung veröffentlicht und aktiv ist."; tab "<name> (Entwurf) · Konnekt" | — |
| S16 / S17 | delete dialog of the draft (other tab) | 1440, 320 | none | none | clean: "„<name>“ löschen?", "<name> wird endgültig gelöscht. …", "Anbindung behalten" / "Anbindung löschen"; the dialog stays open | — |
| S16 / S17 | delete failed: published meanwhile (`409 draft_published`), deleted meanwhile (`404`), switched with the alert shown (other tab) | 1440, 320 | none, after the fix | none | **was**: the dialog's own alert ("This draft has been published since you opened it." / "… already been deleted.") stayed English, kept in the reducer's state; clean after the fix: "Dieser Entwurf wurde veröffentlicht, nachdem Sie ihn geöffnet haben." / "Dieser Entwurf wurde bereits gelöscht.", "Anbindung öffnen" / "Zur Übersicht" | `deleteDraftNoticeOf(failure, language)` words these two alerts from the failure's kind at render time (the page's own copy follows the switch); a server message still keeps its language |

#### S19, S20 Consent page, account page (T041)

Checked 2026-11-10 (scripts in the session's scratchpad `browser/T041/`), signed in as
`lang-check`, against the backend: an OAuth client "T041 Claude Code" registered with
`/api/oauth/register` and a kept PKCE verifier, the redirect URI answered `204` by Playwright so
that the page stays; personal access tokens created with the API; failures by routing (the
backend's flat `{error, message, error_id}`, its generic `5xx` in the request's language). For
V5, `GET /api/agent-access` routed through the real server (so its `levels` came in the
request's language) with six extra rows whose `last_used_at` lay 5 min, 3 h, 26 h, 12 days and
40 days back, or none. Each state opened in English (`en-US`), switched by a click on "Deutsch"
or, with a menu or dialog open, from another tab; compared with `visibleTexts()`,
`layoutProblems()` and `textOverflow()` at both widths in both languages (none found in any
state); back to English, the texts identical to before every time. Content: "T041 Claude Code",
the tokens' names, "lang-check", "Konnekt", the dates. Everything created was revoked or deleted
afterwards (the client and its code from the scratch database).

| screen | state | width | english text left | layout | result | fix |
|---|---|---|---|---|---|---|
| S19 | request, scope `read drafts manage` | 1440, 320 | none (content only) | none; at 320 the h1 wraps to three lines and "Lesen, Entwürfe bearbeiten und aktive Anbindungen verwalten" to four beside its radio, wrapping, not clipped | clean: h1 "Zugriff für T041 Claude Code erlauben?", "T041 Claude Code möchte in Konnekt in Ihrem Namen handeln. Wählen Sie, was der Agent tun darf.", "Zugriffsstufe", the three levels and descriptions (`AccessLevelChoice`'s table, the server's `ACCESS_LEVEL_TEXTS` word for word), "Ablehnen" / "Erlauben", "Angemeldet als lang-check. Sie können diesen Zugriff später auf Ihrer Kontoseite ändern oder widerrufen."; tab "Zugriff erlauben · Konnekt"; the focus stays on the switch | — |
| S19 | loading (the client's `GET` held) | 1440, 320 | none | none | clean: "Zugriff erlauben", "Die Anfrage wird geladen …" | — |
| S19 | invalid on the page: `state` missing; `response_type=token` | 1440, 320 | none | none | clean: "Diese Anmeldeanfrage ist nicht gültig. Starten Sie sie erneut über Ihren Agenten.", "In der Anfrage fehlt state." / "Die Anfrage muss einen Autorisierungscode anfordern (response_type=code).", "Zu den Anbindungen"; the reason follows the switch and the alert doesn't take the focus from the switch (it does for a new reason) | — (built so: the page words the reading's reason at render time, `requestOf(…, language)`) |
| S19 | invalid from the server: unknown client (`404 invalid_client`) | 1440, 320 | "The client is unknown." (the server's notice, already on screen: the spec's edge case) | none | the alert's title and way back German | — |
| S19 | load failed (`500` routed) | 1440, 320 | the server's English message, already on screen (edge case) | none | "Diese Anfrage konnte nicht geladen werden", "Fehler-ID:" with the ID, "Zu den Anbindungen" | — |
| S19 | sending failed (`500` routed), switched, then "Erlauben" | 1440, 320 | the first message until the retry (edge case) | none; at 320 scroll 722 → 826 (the longer German above; scroll anchoring) | "Ihre Antwort konnte nicht gesendet werden"; the retry sends `Accept-Language: de` and shows "Etwas ist auf unserer Seite schiefgelaufen. …" with "Fehler-ID:" | — |
| S19 | leaving after "Allow" (the redirect answered `204`) | 1440, 320 | none | none | clean: "Sie können zu T041 Claude Code zurückkehren."; switched by a click in the page (Playwright's locators wait for the pending navigation) | — |
| S19 | the real decision in German: "Nur lesen", "Erlauben" | 1440 | — | — | one `POST /api/oauth/authorize` with the seven parameters + `decision: "allow"`, `access_level: "read"` (the baseline's body), `Accept-Language: de`; the code exchanged → `scope read`; the row on the account page | — |
| S19 | step-up (the connection at `read`, scope `read drafts`) | 1440, 320 | none | none; the strip wraps to three lines at 320 | clean: "T041 Claude Code bittet um mehr Zugriff als bisher.", "Lesen und Entwürfe bearbeiten" preselected | — |
| S20 | loading (`GET` held) | 1440, 320 | none | none | clean: "Ihre Agentenzugriffe werden geladen …" | — |
| S20 | empty | 1440, 320 | none | none | clean: "Verbundene Agenten", "Noch ist kein Agent verbunden. Fügen Sie Ihrem Agenten den MCP-Server von Konnekt hinzu, um ihn zu verbinden." (the link ends at the comma), "Persönliche Zugriffstokens", "Token erstellen", "Noch kein persönliches Zugriffstoken vorhanden."; tab "Ihr Konto · Konnekt" | — |
| S20 | listed, **V5** relative times | 1440, 320 | none | none; at 320 the long level name wraps to three lines and "Zuletzt verwendet vor 5 Minuten" breaks after "5" (as English breaks "5 minutes ago"), no clip | clean: "Zuletzt verwendet gerade eben", "vor 5 Minuten", "vor 3 Stunden", "gestern", "vor 12 Tagen", from 30 days "01.10.2026, 02:35", "Nie verwendet"; "Verbunden am", "Erstellt am", "Gültig bis" with the dates as in English; the level names German once the switch's `GET` (with `de`) answered | — (built so: a switch asks the server for the levels again, `levelsLoaded`) |
| S20 | listed, scrolled 400 | 1440, 320 | none | scroll 400 → 400 (1440), 400 → 472 (320: the longer German rows above; scroll anchoring) | clean | — |
| S20 | ⋯ menu open (other tab) | 1440, 320 | none | none | clean: "Zugriffsstufe ändern", "Widerrufen", the ⋯ named "Aktionen für T041 drei Stunden"; the menu stays open | — |
| S20 | "Change access level" open, "Read only" chosen (other tab) | 1440, 320 | none | none; at 320 the dialog scrolls inside as in English | clean: "Zugriffsstufe für T041 drei Stunden ändern", × "Schließen", the levels German; the chosen level kept | — |
| S20 | change failed (`500` routed; other tab) | 1440, 320 | the server's message, already on screen (edge case) | none | "Die Zugriffsstufe konnte nicht geändert werden", "Fehler-ID:", "Erneut versuchen" | — |
| S20 | level changed in German (the real `PUT`), then "EN" while the toast shows | 1440, 320 | — | none | the green toast "Zugriffsstufe geändert. Sie gilt ab dem nächsten Aufruf des Agenten."; after "EN" the toast keeps its German until it goes (6 s), as the details' toasts (T040); the row reads "Lesen und Entwürfe bearbeiten" | — (UNCERTAIN: a toast keeps the language it was shown in) |
| S20 | "Revoke" open; revoke failed (`500` routed; other tab) | 1440, 320 | the failure's server message (edge case) | none | clean: "Zugriff für T041 vierzig Tage widerrufen?", "Der nächste Aufruf des Agenten wird abgelehnt, und seine offenen Freigabeanfragen werden abgebrochen.", "Abbrechen" / "Widerrufen"; "Der Zugriff konnte nicht widerrufen werden" | — |
| S20 | "Create token" with a typed name, "Read and edit drafts", 90 days (other tab) | 1440, 320 | none | none | clean: "Persönliches Zugriffstoken erstellen", the intro, "Name", "Zugriffsstufe", "Gültigkeitsdauer", "90 Tage", "Abbrechen" / "Token erstellen"; name, level, days and the focus in the field kept | — |
| S20 | create token without a name (other tab) | 1440, 320 | none | none | clean: "Geben Sie einen Namen für das Token ein." under the field (it follows the switch); the focus stays in the field | — (built so: the field error is worded at render time) |
| S20 | create failed (`500` routed; other tab) | 1440, 320 | the server's message (edge case) | none | "Das Token konnte nicht erstellt werden", the typed name kept | — |
| S20 | token created (the real `POST`; other tab), "Kopieren" | 1440, 320 | none | none | clean: "Token T041 Dialog … erstellt", "Kopieren Sie es jetzt. Es wird nicht noch einmal angezeigt.", "Ihr Token", "Kopieren" → "Kopiert", status "Token kopiert", "Fertig", × "Schließen" (`KERN_TRANSLATIONS`) | — |
| S20 | revoked in German (the real `DELETE`) | 1440, 320 | none | none | the toast "Zugriff widerrufen." | — |
| S20 | load failed (`500` routed) | 1440, 320 | the server's message (edge case) | none | clean: "Ihre Agentenzugriffe konnten nicht geladen werden", "Fehler-ID:", "Erneut versuchen", "Zu den Anbindungen" | — |

#### S21 Approval page (T042)

Checked 2026-11-10 (scripts in the session's scratchpad `browser/T042/`), signed in as
`lang-check`, against the backend: a personal access token "T042 Claude Code" (`manage`) and a
draft "T042 Parking permit" (a long description; four rules, two of which contradict each other
in Group 02) created with the API; the requests made with the token as an agent makes them
(`POST /api/approval-requests` with the bearer), a fresh one for every state, since they expire
after 10 minutes. Real: publish and delete_draft waiting, the working approve (held 15 s by
Playwright, then sent), the failed approve (`503`: no EUDIPLO here), the request read again
after it, declined, replaced. Routed as spec 008's T088 did: the status actions' previews (no
published connection here: the real preview with `action`, `connection` and `urls` patched),
done, expired and every cancel reason (`status` / `cancel_reason` patched), the failed decline
(`503`), a `409 approval_expired` to approving, another team member's request (`403
not_yours`), the load failure (`500` with `error_id`), the loading state (held), the value sets
held (checking) and the catalog failing. Each state opened in English (`en-US`), switched by a
click on "Deutsch" (the ⓘ open: from another tab), compared with `visibleTexts()`,
`layoutProblems()` and `textOverflow()` at both widths in both languages (none found in any
state), switched back: the English texts identical to before every time. Content left English
as entered (FR-007): the connection's name and description, the agent's name, "Standard",
"Ambulance", "Rule 02", the identifiers ("rule-2"), the rules' saved messages, the URLs, the
error IDs. After every switch the focus stayed on the switch: no alert took it. Everything
created was removed afterwards (the token revoked, the draft deleted, the 177 request rows
deleted from the scratch database).

| screen | state | width | english text left | layout | result | fix |
|---|---|---|---|---|---|---|
| S21 | publish, waiting, the checks done (a contradiction) | 1440, 320 | none (content only) | none; at 320 the h1 and the sub-line wrap, the description is cut with "…" as in English | clean: h1 "„T042 Parking permit“ veröffentlichen?", "Angefordert von T042 Claude Code · läuft um 03:10 Uhr ab", the table "Dokumente" / "Personalausweis · 3 Felder", "Regeln" / "Standard · 4 Regeln", "Regelprüfung", "Standard: Niemand kann diese Regeln erfüllen. 2 Regeln widersprechen einander." (`dialogLineOf(…, language)`), the Summary card with German statements, "Freigeben" / "Ablehnen"; tab "„T042 Parking permit“ veröffentlichen? · Konnekt" | — (built so: the preview is loaded once, so `documentsInLanguageOf()` labels its documents and data items from the catalog in the language; no request on a switch but the catalog's) |
| S21 | publish, scrolled 400 | 1440, 320 | none | scroll 400 → 400 (1440), 400 → 440 (320: the longer German above; scroll anchoring) | clean | — |
| S21 | publish, checking (the value sets held) | 1440, 320 | none | none | clean: "Die Regeln werden geprüft …" in the status region, "Die Regeln werden geladen …" in the Summary | — |
| S21 | publish, the catalog failed (`500` routed, both languages) | 1440, 320 | the preview's labels "Personal ID", "Date of birth", "Nationality", "City or town", loaded in English: without a catalog nothing relabels them (the spec's edge case: a text shown keeps until replaced) | none | "Die Regeln konnten nicht geprüft werden."; the rest German | — (UNCERTAIN: accepted as the edge case; a reload in German shows the server's German labels) |
| S21 | delete_draft, waiting | 1440, 320 | none | none | clean: "Entwurf „T042 Parking permit“ löschen?", "Zuletzt gespeichert am 10.11.2026, 02:58", "Sein Inhalt wird endgültig gelöscht." | — |
| S21 | deactivate, reactivate, delete, waiting (routed) | 1440, 320 | none | none; at 320 the lead wraps to four lines in the card, the URL boxes cut with "…", "Link kopieren" under them as in English | clean: "„…“ deaktivieren?" / "reaktivieren?" / "löschen?", "Links für Ihren Dienst", "Diese URLs der Anbindung antworten mit „unavailable“, bis die Anbindung reaktiviert wird:" / "… funktionieren wieder:" / "… funktionieren endgültig nicht mehr:", "Anfragelink", "Ergebnislink", "Link kopieren", "Laufende Anfragen werden abgebrochen.", "Das Löschen kann nicht rückgängig gemacht werden." | — |
| S21 | deactivate, the request link's ⓘ open (other tab) | 1440, 320 | none | none | clean: "Ihr Dienst erzeugt mit diesem Link einen QR-Code, …"; the tooltip stays open, the focus kept | — |
| S21 | working (the approve held 15 s) | 1440, 320 | none | none | clean: "Wird veröffentlicht …" in the status region, both buttons `aria-disabled` | — |
| S21 | failed approve (the real `503`), switched | 1440, 320 | the server's message, already on screen (edge case) | none | "Konnte nicht veröffentlicht werden", "Fehler-ID:" with the ID, "Erneut versuchen"; "Erneut versuchen" in German sends `Accept-Language: de` and shows "Etwas ist auf unserer Seite schiefgelaufen, daher wurde nichts gespeichert. …" | — |
| S21 | failed before (the request read again) | 1440, 320 | none | none | clean: "Konnte nicht veröffentlicht werden", "Der letzte Versuch hat nicht funktioniert. Es wurde nichts geändert.", "Fehler-ID:", "Erneut versuchen"; the sentence follows every switch | — (built so: the failure read with the request is marked `readAgain` and worded at render time, `outcomeViewOf(state, language)`) |
| S21 | failed decline (`503` routed) | 1440, 320 | the server's message (edge case) | none | "Konnte nicht abgelehnt werden", "Fehler-ID:" | — |
| S21 | `409 approval_expired` answered to approving (routed) | 1440, 320 | the server's sentence as delivered (edge case; in German when the call asks in German, T018) | none | the title German; the alert keeps its sentence | — |
| S21 | done: publish, reactivate (routed) | 1440, 320 | none | none | clean: "Veröffentlicht." / "Anbindung reaktiviert.", the Links card "Fügen Sie beide Links in Ihr Formular ein. Jeder Link gehört in ein eigenes Feld.", "Anbindung öffnen" | — |
| S21 | done: deactivate, delete, delete_draft (routed) | 1440, 320 | none | none | clean: "Anbindung deaktiviert.", "Anbindung gelöscht.", "Entwurf gelöscht." (the server's words, T018) | — |
| S21 | declined (the real decline) | 1440, 320 | none | none | clean: "Sie haben diese Anfrage abgelehnt. Es wurde nichts geändert." | — |
| S21 | replaced (the agent asked again) | 1440, 320 | none | none | clean: "Der Agent hat für diese Aktion eine neuere Anfrage gestellt." | — |
| S21 | expired (routed) | 1440, 320 | none | none | clean: "Diese Anfrage ist um 02:59 Uhr abgelaufen. Es wurde nichts geändert. Der Agent kann erneut fragen." | — |
| S21 | cancelled: `draft_changed`, `draft_published`, `draft_deleted`, `connection_deleted`, `access_changed`, `revoked`, `access_ended`, none, `connection_changed` (routed) | 1440, 320 | none | none | clean: each sentence word for word as the server's German (T018), "Die Anbindung wurde in der Zwischenzeit reaktiviert." | — |
| S21 | not yours (`403` routed) | 1440, 320 | none | none; at 320 the alert wraps to six lines | clean: h1 "Freigabeanfrage", "Diese Anfrage wurde für ein anderes Teammitglied gestellt. Nur dieses Teammitglied kann sie freigeben."; tab "Freigabeanfrage · Konnekt" | — |
| S21 | not found (an unknown id) | 1440, 320 | none | none | clean: "Seite nicht gefunden", "Zu den Anbindungen" (`NotFound`, T031) | — |
| S21 | load failed (`500` routed) | 1440, 320 | the server's message (edge case) | none | "Diese Anfrage konnte nicht geladen werden", "Fehler-ID:", "Zu den Anbindungen" | — |
| S21 | loading (the `GET` held) | 1440, 320 | none | none | clean: "Wird geladen …", tab "Freigabeanfrage · Konnekt" | — |
| S21 | **US2-AS5**: the request's `link` opened in a fresh browser whose stored choice is `de` and whose language is `en-US`; and the reverse (`en` stored, `de-DE`) | 1440, 320 | none | none | the page in the stored language: `<html lang="de">`, h1 "„T042 Parking permit“ veröffentlichen?", "Freigeben" / "Ablehnen", the `GET` with `Accept-Language: de` (the reverse: English, `en`); the link `http://localhost:5173/approvals/<id>` carries no language and stays unchanged | — |

#### S22 Not found and load states (T031's components; checked at T043)

Checked by the coordinator (T043, 2026-11-10; `browser/lead/s22.mjs` in the session's
scratchpad), Chromium, an `en-GB` browser signed in as `lang-check` (signed out for the guard),
each state opened in English, switched by a click, checked, and switched back; an unknown
connection id; failures by routing `GET /api/form-connections/<id>` (and `/api/form-connections`
for the overview). `layoutProblems()` and `textOverflow()` found nothing in either language at
either width; English came back identical every time; no console error.

| screen | state | width | english text left | layout | result | fix |
|---|---|---|---|---|---|---|
| S22 | an unknown connection (`/form-connections/<unknown>`): `NotFound` | 1440, 320 | none | none | clean: "Seite nicht gefunden", "Der Link ist möglicherweise fehlerhaft, oder die Seite wurde verschoben oder gelöscht.", "Zu den Anbindungen"; tab "Seite nicht gefunden · Konnekt" | — |
| S22 | an unknown connection's edit route (`/edit`) | 1440, 320 | none | none | clean: as above, with "Startseite" | — |
| S22 | load failed (routed `500`; network failure; a non-JSON `502`) | 1440, 320 | none | none | clean: "Die Anbindung konnte nicht geladen werden", "Prüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.", "Erneut versuchen", "Zu den Anbindungen"; the client's fallback "Ein unerwarteter Fehler ist aufgetreten" (the switch's refetch asks again in German); tab title the failure | — |
| S22 | loading (the answer held) | 1440, 320 | none | none | clean: "Die Anbindung wird geladen …", the skeleton; tab title "Die Anbindung wird geladen … · Konnekt" | — |
| S22 | the overview's load failed with a non-JSON `502` | 1440, 320 | "An unexpected error occurred": the client's stand-in for the server's message, worded in the request's language and kept, as a server message is, until the next request (spec Edge Cases; T030) | none | the page's own texts German ("Ihre Anbindungen konnten nicht geladen werden", "Erneut versuchen"); "Erneut versuchen" asks again in German | — |
| S22 | the sign-in guard (signed out, `/`) | 1440, 320 | none | none | clean: redirected to `/login`, the sign-in page German (T033) | — |
| S22 | an unknown route (`/no-such-page`) | 1440, 320 | none (connection names, "Name" and "Status" equal in both) | none | clean: redirected to `/`, the overview German (T034) | — |

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
- 2026-11-09: checkpoint of the backend's texts (T021; FR-005, FR-017, FR-018, SC-007; quickstart
  V3 steps 3 and 4). T014 by one agent, T015 with T020 by a second, T016–T018 by a third, T019 by
  a fourth, the waves one after another (one test database). Gates: Ruff and mypy clean (82 source
  files); `export_check_fixtures --check` current; `npm run lint`, `npm test`, `npm run build`
  green apart from one test, `rules/` 45 files 2362 tests, `frontend/` 31, 988, `mcp/` 15,
  408, all unchanged. The one: `personas/performance.test.ts`'s 1.5 s budget for "three
  different 50-item branches" failed under the full `npm test` after waves 1, 2 and 3 (1565,
  1837 and 1637 ms; no `rules/` source changed) and passed alone each time. The phase's one
  full pytest: 2160 passed, 0 failed (2062 + 98 new; no test removed; the existing English
  assertions unchanged; nine test files had only the way they read a raised `Text` adapted).
  Backend (uvicorn on 3000, `template_db_test`, worker off, debug log, a throwaway account):
  with `de` a wrong password answers "Benutzername oder Passwort ist falsch. …" with the same
  `error`; `/api/document-types` 64 German labels (only "Region" equal) and the body without
  labels identical; `/api/option-sets` 294 labels, 177 German (the 117 equal: 98 country names,
  the 17 licence class codes, "Inter", "Blond"), the values and order identical; the access
  levels "Nur lesen", "Lesen und Entwürfe bearbeiten", "Lesen, Entwürfe bearbeiten und aktive
  Anbindungen verwalten" with the same codes; an empty name "Geben Sie einen Namen für die
  Anbindung ein."; the `503` of the unconfigured EUDIPLO the German generic message with its
  `error_id`; `/api/connect/<unknown>/requests` the English `404` with or without the header.
  The 24 lines of the run's log hold no `Accept-Language` and no German. `grep -rn
  "Accept-Language\|current_language"` over `worker.py`, `documents.py`, `dcql.py` is empty.
  The parity fixture `rules/src/fixtures/server-messages.json`: 39 cases (`RULES_MESSAGES` 27
  for 19 keys, one per noun where the noun varies; `CONDITION_PROBLEM_MESSAGES` 11, the part after
  the prefix; `EDIT_MESSAGES.unknownVariant` 1) and 4 client-only keys (`variantNameMissing`,
  `variantNameTaken`, `nameMissing`, `nameTooLong`); `unknownPart` alone carries `params_de`
  (the German names the field by its German label). Plan changes in this phase: the rules'
  message templates live in a new leaf `backend/app/services/rules_texts.py` (it imports only
  `app.language`), because `services/rules.py` imports `app.config` and the fixture script must
  not; `RULES_MESSAGES` has 23 keys, not the 28 tasks.md counts; T015's API case uses a published
  connection's `PUT` (a draft's accepts an incomplete rule, spec 005); `routers/oauth.py` changed
  one line so the consent page's `404` follows the language, while `routers/agent_access.py` and
  `routers/approval_requests.py` needed no change (their three messages are
  `ApiResponse.message`, English); the string "EUDIPLO is not available right now. …" that T017
  names doesn't exist: `NOT_CONFIGURED_MESSAGE` (the `503`) became the `Text` and the `502`
  carries its caller's message; the approval view carries codes, no sentence, so T018's German
  outcome is asserted on the `409`s; T019 walks the constants at any depth and also reads every
  `Text(...)` call in `app/` (113), as the module walk cannot see a raise site's; seven test
  files outside the task lines had only their reading of a raised `Text` adapted
  (`test_identifiers.py`, `test_form_connection_drafts.py`, `test_agent_principal.py`,
  `test_approval_requests.py`, `test_form_connections.py`, `test_form_connection_maintenance.py`,
  `test_connect.py`), beside the two T015 names. The glossary gained the sex values, the
  eye and hair colours and the 17 licence class descriptions (T014), nine rules terms such as
  "Hauptvariante", "Kennung", "Fehlermeldung", "Ergebnislink" (T015), and nineteen sign-in,
  agent and approval terms such as "Agentenzugriff", "Freigabe", "Weiterleitungs-URI" (T016–T018).
  Open: a German-speaking team member skims the country names in V11 (phase 6), above all
  "Kongo", "Korea, Republik", "Russische Föderation", "Palästinensische Gebiete", "Vatikanstadt",
  "Macau", "Moldau"; and `INVALID_PAYLOAD_MESSAGE` ends the German "Ungültige Anfrage." with a
  period the English "Invalid request payload" lacks (written so in T008).
- 2026-11-10: checkpoint of the rules package (T029; FR-006, FR-014, FR-017, SC-006 for the
  composed sentences, SC-007). T022 with T023 by one agent (xhigh); T024 with T025 and T026 with
  T027 by two agents side by side (high); T028 by a fourth (high). Gates: `npm run lint`,
  `npm test`, `npm run build` green: `rules/` 45 files, 2642 tests (2362 + 280, none removed);
  `frontend/` 31, 988 and `mcp/` 15, 408, both unchanged, with `mcp/src/*.test.ts`,
  `guidance.test.ts` and `mcp/plugin/` untouched. Ruff and mypy clean (82 source files),
  `export_check_fixtures --check` current, and the phase's one full pytest: 2160 passed, 0
  failed (phase 3's count; no backend test added). `rules/src/copy.test.ts` finds 16 tables
  (`RULES_MESSAGES`, `EDIT_MESSAGES`, `CONDITION_PROBLEM_MESSAGES`, `RELATION_WORDS`,
  `DATE_OF_BIRTH_RULE_LABEL`, `OPERATOR_LABELS`, `ITEM_NOUNS`, `TIME_UNITS`, `SUFFIX_TEXTS`,
  `STATEMENT_TEXTS`, `DATE_TEXTS`, `MESSAGE_TEXTS`, `DROPPED_TEXTS`, `FINDING_TEXTS`,
  `PERSONA_TEXTS`, `GROUP_SUBTITLES`), all complete and translated, with one allowlist entry
  ("Redundant:"). `validation.test.ts` renders all 39 cases of the parity fixture in both languages
  (`params_de` for `unknownPart`), checks that the 4 client-only keys are the only ones left
  out, and checks the condition prefix: 41 tests. `grep -rn "language" mcp/src` finds only the
  `DEFAULT_LANGUAGE` import in `tools/checks.ts` and two doc comments: no language is passed,
  and the agents' texts stay English. English assertions: of the 20 test files changed, none has
  fewer `expect(` than before, and every English literal on a removed line is still in its file
  (the removed lines are imports, a helper's signature, `toEqual` objects that gained `code`,
  and three persona constants now read as `…Of('en')`). Every German sentence of G§3 comes out of
  a composer and is asserted in a test (two with other sample values: "01.01.2010", "3 Jahren").
  No `console.*` in `rules/src/`, `workers/`, `usePersonas` or `useRuleChecks`. The glossary
  gained 52 rows and changed none: T023 11 (remove, restore, reset, follows, based on, ungroup,
  level, copy; the "weniger als" and "Time ago" / "Time from now" labels), T024 3, T025 13 (the
  proposed messages' sentences, the dative counts, the subjects), T026 13 (the kinds, the banner,
  the notices, the counts, the agents' resolutions), T028 12 (the persona chips, headings,
  announcements, "von Mia", "erstellen / ergänzen", "Gültig bis"). Plan changes in this phase:
  `defineTexts` types `de` as `NoInfer<T>` (the coordinator, after wave 1: its doc promised the
  check of a missing or extra German key, which an inline column didn't get);
  `backend/tests/unit/test_check_fixtures.py`'s `_ts_table` reads the English column `const
  <NAME>_EN = {…}` (the coordinator: T023's table shape broke three of its tests, which the
  phase's Node gates don't run); T027 made no `ANNOUNCEMENT_TEXTS` table, because
  `checks/announcements.ts` had no strings ("Checking the rules…" is the frontend's
  `Approval/constants.ts`, T042's); T024's `formatDate` was `dd.mm.yyyy` in English before the
  feature (the task's "23 Oct 2005" didn't exist), so its `language` is unused; `EditRefusal`'s
  `code` is optional (the MCP's `draftEdit.ts` builds refusals without one), and validation gained
  `nameProblemOf`, `variantNameProblemOf` and `isConditionProblem` beside `ruleProblemOf` and
  `groupProblemOf`; T028 also edited `personas/types.ts` (the `setValue` action carries the
  language) and added `outcomeNameOf(outcome, language)` for T039, since `resultViewOf` composes
  no outcome names; the German proposed messages need each label's gender, kept in a private
  table in `messages.ts` keyed by catalog keys, with "Das Feld „…“" as the fallback (to follow
  if a German catalog label changes its gender). For phase 5: T030 dispatches `language` on the
  checks' `'change'` action and adds it to `sameRunBranches`'s comparison, and `usePersonas`
  passes a context with `language` and `language` on `'setValue'`; T038's operator picker joins
  `labelOf()` and `suffixOf()`, which for a German date other than the date of birth would read
  "ist mindestens 2 Jahre zurück": it needs the field-aware words of
  `STATEMENT_TEXTS.yearsAgoWords` ("liegt mindestens"); T039 uses `outcomeNameOf`. Open for V11
  (phase 6): the server's German copied word for word that reads stiffly ("Geben Sie als Anzahl
  der Jahre mindestens 1 ein.", "… prüft einen Bestandteil, den das Feld „X“ nicht hat."), and
  the agents' choices "jünger als 18 Jahre", "Ihrer Klasse B", "Sie brauchen die
  Staatsangehörigkeit von …", "Gültig bis" (capitalised); the German of the 12 agent-only
  `EDIT_MESSAGES` is never shown.
- 2026-11-10: checkpoint of the frontend's copy (T043; FR-004, FR-014, SC-001, SC-002 for the
  frontend, SC-004). Phase 5 ran in one chat, in the plan's five waves: T030 (high) with T031 and
  T032 (medium); T033, T034, T036; T035, T037, T040; T038, T039, T041; T042 (all high); T043 by
  the coordinator. Gates: `npm run lint`, `npm test`, `npm run build`, `npm run format:check`
  green: `rules/` 45 files 2642 tests and `mcp/` 15, 408, both unchanged (no file changed in
  `rules/`, `mcp/`, `api-types/` or `backend/`); `frontend/` 31 files, 1265 tests (988 + 277,
  none removed). `personas/performance.test.ts`'s 1.5 s budget failed under the full `npm test`
  after waves 4 and 5 and passed alone each time; `mcp/src/checks.test.ts` "keeps the results the
  worker posted…" failed once under an agent's full run and passed alone. The phase's full pytest:
  2160 passed (phase 4's count; no backend change). `frontend/src/copy.test.ts` checks 61 tables
  in 36 `constants.ts` files: the 34 copy files of the screens and components, the root's
  (`KERN_TRANSLATIONS`, `CONNECTION_STEP_LABELS`) and `LanguageSwitch`'s; `LanguageProvider`'s
  holds the context, no copy; seven more hold no copy (`ActionMenu`, `CurrentUserProvider`,
  `FindingNote`, `InfoTooltip`, `Toast`, `WizardLayout`, `utils/language`). `grep -rn
  "TODO(009" frontend/src` is empty; `.en` / `.de` outside tests only inside a table's
  definition reading the same column of another table (`ConfirmDialog`, `RuleEditor`,
  `TestStep`); no `console.*` in the provider, the hooks, `utils/language`, `utils/localDrafts`
  or the workers. English word for word (FR-014, US1-AS5): of the 203 frontend source files
  changed, every English text of phase 4's version (857 string literals and JSX texts) is still
  in the sources; of the 16 test files changed, none has fewer `expect(` than before and none
  lost an English literal; every task's walk switched back and found the English identical.
  §2.2: 177 rows over S1–S22 at 1440 and 320, each clean or with its fix (the coordinator wrote
  S22's 7), apart from what is listed below. R9's fixes: the overview's empty search field keeps
  16 px on the right (`pr-16!`; the × had kept 48), "Fortsetzen" for "Resume editing" (the short
  form), `break-words hyphens-auto` on the documents' search result name, a soft hyphen in
  "Internet&shy;verbindung" (the publish and save alerts' titles), the rule editor's data-menu
  footer wraps, and the test step's result statements break inside a word (`ResultRow`). That
  last one changes the English at 320 too: before the feature "Nationality", "Germany",
  "Stuttgart" ran up to 18 px past their cell into the message column; now they break inside
  the word ("Nationa lity"): kept, as an overlap is worse than a break and no word changed; a
  person decides (or moves the fix into `RuleSentence`, which T039 suggests). V8 done (T038: an
  untouched proposal follows a switch, a written message stays, a saved message shows as saved);
  V9 done (T036: German labels 121–156 ms after the switch, the prefetched catalog).
  Plan changes in this phase: T030's UNCERTAIN "status after a switch before the prefetch" (the
  catalog hooks reported `'loading'`, so the documents, rules and test steps would have swapped
  their open editor, typed search and personas for a loader) was rerun at xhigh, with T031's
  "the sign-out list keeps the old language" in the same brief: the hooks report `'loaded'` once
  a list is on screen, showing the other language's until the new one arrives, and the dialog
  words its list at render (verified in the browser with the German catalog held and failing).
  The browser checks ran as Playwright scripts, one Chromium per agent, with a shared helper,
  instead of the Playwright MCP tools, which drive one browser for every agent of a wave; against
  the Vite dev server and the backend on `template_db_009` (a copy of the dev database, worker
  off, no EUDIPLO; published states by routing), with a throwaway account `lang-check`; §2.2
  got one heading per screen task so that three agents could write at once. T034 also took
  "Untitled connection" (`utils/localDrafts/content.ts`); T035 took T036's editor-root items
  (the step head, footer and dialogs, the names in an open dialog worded at render). Waves 3–5
  ran with bridges (a table's English column under the old name, or a `language` defaulting to
  English, marked with the consumer's task): the coordinator removed `EDIT_ENTRY_COPY` after
  wave 3, T039 and T041 theirs, T042 the last four. The coordinator added `data-language-switch`
  on the switch's group and `isLanguageSwitchTarget()` (`LanguageSwitch/utils.ts`), so that a
  popup holding typed input lets a press on the switch through (the documents' search card,
  the rule editor's pickers, the inline rename, and `ValuesPicker`, which the coordinator fixed
  after T038 found it closing and marking its values touched); a plain menu still closes on a
  press outside, the switch included (the baseline's behaviour; a switch from another tab keeps
  it). The glossary gained 85 rows in this phase and changed none.
  Kept on purpose: a server's message (or the client's stand-in "An unexpected error occurred")
  already on screen keeps its language until the next request (spec Edge Cases); toasts and
  announcements keep the language they were shown in (R4); the approval page's preview keeps
  the English labels when the catalog failed to load (nothing to relabel from); the account
  page's toast style still compares the toast's text, now in both languages (R10 asks for a
  code; the branch is unchanged); a saved English proposal holding catalog or option labels
  ("You need the nationality of Germany.") opened in German counts as written, because the editor
  composes the other language's proposal with the current catalog (T038; shown as saved, so
  nothing is lost). Found outside the language work, open: the details' ⋯ menu at exactly 320 to
  about 350 CSS px opens 18 px wide in both languages (spec 008's placement: its 'full' set spans
  the band's action box, positioned from 320 px; T040); keyboard focus on a sticky header control
  scrolls Chromium to the top (spec 008's header; T047's keyboard run); the menus' search
  placeholders are cut at 320 in both languages ("Personalausweis durchsuchen", English "Search
  Driving licence"; `MenuSearchField`, T046); at 320 an open data or classes menu at its 160 px
  height shows the search and the footer with the list scrolled away (both languages; T046).
  Open for a person (tasks.md, phase 5 "Needs a person"): the 200 % zoom with the browser's own
  zoom (the chat used a 320 CSS px viewport at device scale 2), V9's one-second bound by hand,
  the German prose in V11 (phase 6), and the rule editor's native date field in a German browser
  (Chromium formats `<input type="date">` by its own UI language, mm/dd/yyyy here; FR-012's
  hints and messages show dd.mm.yyyy).
