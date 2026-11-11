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
- **"Change start date" uses C2's "Active from" as drawn in P1** (T026's UNCERTAIN 1; the
  coordinator, phase 4): P12 `6396:48860` draws the group without the "Active from" legend, the
  radios at the content's left edge, the date field beside "On a date" and the hint across the
  content's width; the build has C2's group (the legend, the 16 px indent, the field under the
  radios, the hint in the choice column), because ui-screens C2 names one group for S14, S15 and
  S17. With "On a date" the dialog is 432 px high against 392 drawn. The same applies to
  "Activate this connection again?" (P16b `7173:52959`, T027). A compact variant of the
  component would be a change to C2, for the designer to ask for.

## 2. Verification

### 2.1 The per-node tables

| frame | state | width | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|---|

#### T005: every toast closes after 6 s (FR-082, F21, R12, C3)

Editor, documents step, local draft "T005 toast check" (never saved; removed from localStorage
afterwards), 1455 px Chromium window. Toast "Personal ID removed." / "Undo". Times are
`performance.now()` deltas from a MutationObserver on the status region.

| state | measure | expected | actual | result |
|---|---|---|---|---|
| pointer elsewhere | time from "Undo" shown to toast gone | about 6000 ms | 6036 ms | match |
| pointer elsewhere | removal after the toast went | removal stands (documents (0)) | "Added documents (0)", no "Remove Personal ID" | match |
| hovered | toast present after 10 s with the pointer on it | present | present (1) after 10018 ms | match |
| hovered, then pointer left | time from leaving to toast gone | about 6000 ms | 6035 ms | match |
| keyboard focus (Tab from "Set rules") | focus ring on "Undo" | `:focus-visible` | true | match |
| keyboard focus | toast present after 10 s with focus on "Undo" | present | present (1) after 10110 ms | match |
| keyboard focus, pointer entered and left | toast present 8 s after the pointer left, focus still on "Undo" | present (focus still holds it) | present (1) | match |
| focus left (Shift+Tab), pointer elsewhere | time from blur to toast gone | about 6000 ms | 6029 ms | match |
| Escape on focused "Undo" | toast | gone at once | gone (checked after 200 ms) | match |
| Escape on focused "Undo" | focus returns to where it came from | "Set rules" | BUTTON "Set rules" | match |
| Escape on focused "Undo" | removal stands, no dialog | documents (0), 0 dialogs | 0 "Remove Personal ID", 0 dialogs | match |
| hovered, "Undo" clicked after 7 s | action still works after the 6 s mark while held | document back, toast gone | 1 document, toast 0 | match |
| hovered (screenshot t005-hovered.png) | toast layout | unchanged: message and underlined "Undo" | unchanged | match |

#### T013: the overview row's date by state (S4 "The row's date"; F23, F42, W9)

Chromium (`playwright-chrome`), window 1455 × 900 (body 1440). Seeded rows `P3 seed live`,
`P3 seed live 2`, `P3 seed scheduled` (start 2026-12-01), `P3 seed deactivated`, the drafts
`Führerscheinantrag Stuttgart` (rules), `Neue Verbindung` (connection), `Anwohnerparkausweis`
(test), plus `T013 documents draft` (documents) and `T013 draft without step` (its `step` removed
from the stored draft), both deleted after the checks. The dates were read against the API's
`published_at`, `start_date`, `deactivated_at` and `updated_at`. Figma nodes read:
`6699:44265`, `6699:44278`, `6699:44292` (frame `6699:44240`), `6699:48031` and the row
`6699:48024`: their texts are the audit's (U11 #10–#12, U17 #17), so no frame has changed since
the audit. Screenshots: `<scratchpad>/T013/`.

| frame | state | width | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|---|
| 6699:44265 | live | 1440 | row date | text | "Published 12.09.2026" | "Published 09.11.2026" (`published_at` 2026-11-09) | match |
| 6699:44265 | live | 1440 | row date | font | Fira Sans 400 14/24 | "Fira Sans" 400 14px/24px; `document.fonts.check` true | match |
| 6699:44265 | live | 1440 | row date | colour | layout-text-muted #4a5468 | rgb(74, 84, 104) | match |
| 6699:44265 | live | 1440 | row date | letter spacing | 0 | normal | match |
| 6699:44265 | live | 1440 | row date | numerals | `"zero" 1, "lnum" 1, "tnum" 1` | `font-variant-numeric: tabular-nums slashed-zero` | match (spec 008's convention, 008 design-notes "numerals" row) |
| 6699:44265 | live | 1440 | row date | box | 160 wide column, 24 high | 160 × 24 | match |
| 6699:44240 (U11 #10) | live | 1440 | row date | text (FR-017, F23) | P18 U90 draws "Edited 12.09.2026" | "Published <date>" | F23 (CLAR 2026-11-10 #12) |
| 6699:44240 | live, with a step on the summary | unit | row date | text | no step | "Published 28.10.2026" (`utils.test.ts`) | match |
| 6699:44240 | scheduled | 1440 | row date | text | not drawn (U11 Missing: no scheduled row) | "Active from 01.12.2026" | match (FR-017, S4; copy.md §1) |
| 6699:44240 | scheduled | 1440 | row date | font, colour, box | as the live row | 400 14px/24px, rgb(74, 84, 104), 160 × 24 | match |
| 6699:44240 | scheduled, browser in America/New_York | 1440 | row date | text (FR-020) | the day as written | "Aktiv ab 01.12.2026" (`timezoneId` America/New_York) | match |
| 6699:44240 | scheduled, browser in Pacific/Honolulu | 1440 | row date | text (FR-020) | the day as written | "Aktiv ab 01.12.2026" | match |
| 6699:44240 | scheduled, `TZ` America/New_York, Pacific/Honolulu, Pacific/Kiritimati | unit | `rowMetaOf` | text | the day as written | "Active from 01.12.2026" / "Aktiv ab 01.12.2026" | match |
| 6699:44292 | deactivated | 1440 | row date | text | "Deactivated 20.10.2026" | "Deactivated 09.11.2026" (`deactivated_at` 2026-11-09) | match |
| 6699:44292 | deactivated | 1440 | row date | font, colour, box | 400 14/24 #4a5468, 160 | 400 14px/24px, rgb(74, 84, 104), 160 × 24 | match |
| 6699:48031 | draft, rules step | 1440 | row date | text | "Edited 28.10.2026 · Rules step" | "Edited 08.11.2026 · Rules step" | match |
| 6699:48031 | draft, rules step | 1440 | row date | wrap | "Edited 28.10.2026 · Rules" / "step", 2 lines | "Edited 08.11.2026 · Rules" / "step", 160 × 48 | match |
| 6699:48031 | draft, rules step | 1440 | row date | font, colour | 400 14/24 #4a5468 | 400 14px/24px, rgb(74, 84, 104) | match |
| 6699:48031 | draft, connection step | 1440 | row date | text (FR-019, F42) | "· <step> step" | "Edited 08.11.2026 · Connection step" (2 lines) | match (F42: the example's row too) |
| 6699:48031 | draft, documents step | 1440 | row date | text (FR-019) | "· <step> step" | "Edited 11.11.2026 · Documents step" (2 lines) | match |
| 6699:48031 | draft, test step | 1440 | row date | text (FR-019) | "· <step> step" | "Edited 08.11.2026 · Test step" (2 lines) | match |
| 6699:44278 | draft, no step recorded | 1440 | row date | text | "Edited 03.10.2026" | "Edited 11.11.2026", 160 × 24 | match (FR-019, CLAR #12) |
| 6699:44240 | pre-existing, a state's date missing | unit | `rowMetaOf` | text (FR-021) | never empty | "Edited <updated_at>" | match (UNCERTAIN 1 in T013's report) |
| 6699:44240 | live, scheduled, deactivated, 4 drafts | 1440, de | row date | text | glossary §2: "Veröffentlicht", "Aktiv ab", "Deaktiviert", "Bearbeitet … · Schritt „…“" | "Veröffentlicht 09.11.2026", "Aktiv ab 01.12.2026", "Deaktiviert 09.11.2026", "Bearbeitet 08.11.2026 · Schritt „Regeln“" / „Anbindung“ / „Test“, "Bearbeitet 11.11.2026 · Schritt „Dokumente“", "Bearbeitet 11.11.2026" | match (design-notes §4.2: without "am") |
| 6699:48024 | all states | 1440 | the row | screenshot comparison | the drawn row | the same order and alignment: name, pill, date in the 160 column, View, Edit, delete | match |
| 6699:44240 (U11 #7) | all states | 1440 | row checkboxes | presence | a checkbox per row | none | not built here: the selection is US5's (T048, T049) |
| 6699:44240 (U11 #9) | scheduled | 1440 | status tag | pill | not drawn | "Scheduled" | T014's (C1), not this task's |
| 6699:44240 | all 9 rows | 320 | page | horizontal scroll | none | `scrollWidth` 305 ≤ `clientWidth` | match |
| 6699:44240 | all 9 rows | 320 | row dates | clipped / off-screen | none | none clipped, all inside their rows and the viewport (widest 223, x 41–264) | match |
| 6699:44240 | all 9 rows | 320 | page | `h1` count | 1 | 1 | match |
| 6699:44240 | all 9 rows | 320 | name link | focus ring after keyboard (Tab) | shown | `:focus-visible`, outline solid 4px | match |
| 6699:44240 | all 9 rows | 320 | name link | focus ring after a click (pointer down) | none | focused, not `:focus-visible`, outline none | match |
| 6699:44240 | all 9 rows | 160 | page | horizontal scroll | none | `scrollWidth` 160 ≤ `clientWidth` 160 | match |
| 6699:44240 | all 9 rows | 160 | row dates | clipped / off-screen | none | none clipped, all inside their rows (x 21–124; 2–4 lines) | match |
| 6699:44240 | all 9 rows | 160 | page | `h1` count | 1 | 1 | match |
| 6699:44240 | all 9 rows | 160 | name link | focus ring after keyboard (Tab) | shown | `:focus-visible`, outline solid 4px | match |
| 6699:44240 | all 9 rows | 160 | name link | focus ring after a click (pointer down) | none | focused, not `:focus-visible`, outline none | match |

#### T014: the status pill's fourth status (C1; Firefox 159 via the `playwright-firefox` MCP, inner width 1440 CSS px; fonts: `document.fonts.check('600 14px "Fira Sans"')` true)

| frame | state | width | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|---|
| 7114:49835 | scheduled (edit flow, `P3 seed scheduled`) | 1440 | header status pill | label | "Scheduled · 01.12.2026" | "Scheduled · 01.12.2026" | match |
| 7114:49835 | scheduled (edit flow) | 1440 | header status pill | height | 24 | 24 | match |
| 7114:49835 | scheduled (edit flow) | 1440 | header status pill | padding / gap | 2 10 (py hidden at 24) / 6 | 0 10 / 6 | match (spec 008 T019: the instances are 24 high, the 2 px padding doesn't show) |
| 7114:49835 | scheduled (edit flow) | 1440 | header status pill | radius | 8 | 8px | match |
| 7114:49835 | scheduled (edit flow) | 1440 | header status pill | background | #eaf7e6 | rgb(234, 247, 230) (`feedback-success-background`) | match |
| 7114:49835 | scheduled (edit flow) | 1440 | header status pill label | font | Fira Sans SemiBold 14/24 | Fira Sans 600 14px/24px | match |
| 7114:49835 | scheduled (edit flow) | 1440 | header status pill label | colour | #1d7a2e | rgb(29, 122, 46) (`feedback-success`) | match |
| 7114:49835 | scheduled (edit flow) | 1440 | header status pill dot | shape | 8 × 8 ring, stroke 1.5 #1d7a2e (r 3.25), no fill | 8 × 8, transparent, inset ring 1.5px rgb(29, 122, 46) | match (CSS circle as spec 008 T019 decided for the dot; inset shadow because a 1.5 px border rounds to 1 px) |
| 7114:49835 | scheduled (edit flow) | 1440 | header status pill | width | hug (Fira Sans in Figma) | 180.6 | match (hugs its label) |
| 7114:49835 | scheduled (edit flow) | 1440 | "Pill · Where you are" | gap name → status pill | 8 | 8 (`gap-8`, TopBar unchanged) | match |
| 7114:49835 | scheduled (edit flow) | 1440 | header, screenshot | comparison | ring dot, green tint, "Scheduled · 01.12.2026" after the name | same (`figma/header-edit-1440.png`) | match |
| 7114:49835 | scheduled (details, U86 6701:40276) | 1440 | header status pill | label / tone / height | "Scheduled · 01.12.2026", as above | "Scheduled · 01.12.2026", same classes, 24 | match |
| 7114:49835 | scheduled | 1440 | header status pill, German | label | "Geplant · 01.12.2026" (glossary) | "Geplant · 01.12.2026" (163.9 wide) | match |
| 7114:49835 | live (edit flow, details) | 1440 | header status pill | label | "Active" | "Active" | match |
| 7114:49835 | deactivated (edit flow, details) | 1440 | header status pill | label | "Deactivated" | "Deactivated" | match |
| 7114:49835 | draft (editor, draft details) | 1440 | header status pill | label | "Draft" | "Draft" | match |
| 7114:49835 | any | 1440 | "Konnekt" pill, language pill, account pill | layout | drawn | spec 008/009 baseline, unchanged | match (not changed by this task, FR-074) |
| 6739:40517 | scheduled row (`P3 seed scheduled`) | 1440 | row status pill | label | "Scheduled" (no date) | "Scheduled" | match |
| 6739:40517 | scheduled row | 1440 | row status pill | height | 28 (instance of the component's default size, not overridden) | 24 | spec 008 T019 decision (the pill is 24 high as the other rows' instances draw it; the frame's other three pills are 24); UNCERTAIN in the report |
| 6739:40517 | scheduled row | 1440 | row status pill | width | 102 | 101.0 | match (hugs the label; text rendering, as T019's 72.8 against 73) |
| 6739:40517 | scheduled row | 1440 | row status pill | x in the row's status column | status column x 328 in the row, 130 wide | 489 = 161 + 328 (same column as the other pills) | match |
| 6739:40517 | scheduled row | 1440 | row status pill | background / label colour / font | #eaf7e6 / #1d7a2e / Fira Sans SemiBold 14/24 | rgb(234, 247, 230) / rgb(29, 122, 46) / Fira Sans 600 14px/24px | match |
| 6739:40517 | scheduled row | 1440 | row status pill dot | shape | hollow 8 × 8 ring, 1.5 stroke #1d7a2e | 8 × 8, transparent, inset 1.5px rgb(29, 122, 46) | match |
| 6739:40517 | scheduled row | 1440 | row status pill | padding / gap / radius | 10 / 6 / 8 | 0 10 / 6 / 8 | match |
| 6739:40517 | scheduled row | 1440 | row, screenshot | comparison | "○ Scheduled" in green next to "Active from 01.12.2026" | same (`figma/row-scheduled-1440.png`) | match |
| 6739:40517 | live row | 1440 | row status pill | label / size / colours / dot | "Active", 73 × 24, #eaf7e6 / #1d7a2e, filled dot | "Active", 72.8 × 24, same, filled dot | match |
| 6739:40517 | draft row | 1440 | row status pill | label / size / colours | "Draft", #e0f2fe / #05669e, dot #0284c7 | "Draft", 66.3 × 24, same | match |
| 6739:40517 | deactivated row | 1440 | row status pill | label / size / colours | "Deactivated", #eff1f4 / #4a5468, dot #8c94a1 | "Deactivated", 110.6 × 24, same | match |
| 6739:40517 | any row, German | 1440 | row status pills | labels | "Geplant", "Aktiv", "Entwurf", "Deaktiviert" (glossary) | "Geplant", "Aktiv", "Entwurf", "Deaktiviert" | match |
| 6739:40517 | scheduled row | 1440 | date column | text | "Active from 01.12.2026" | "Active from 01.12.2026" | match (T013's row line, not this task's file) |
| 6739:40517 | any | 1440 | row and select-all checkboxes | presence | drawn | not built here | FR-038 (T048, a later phase) |
| 6739:40517 | any | 1440 | example row "Passenger transport licence" | data | drawn sample | seeded rows | match (sample data, U13 #7) |
| narrow | overview (all four statuses) | 320 | page | horizontal scroll / h1 / pills clipped | none / 1 / none | scrollWidth 320 = clientWidth / 1 / none clipped | match |
| narrow | overview | 320 | first row's name link | focus ring keyboard / click | ring / none | `:focus-visible` solid 4px / none | match |
| narrow | details live, deactivated, draft | 320 | page | horizontal scroll / h1 / pill clipped | none / 1 / none | none / 1 / none | match |
| narrow | edit live, deactivated; editor draft | 320 | page | horizontal scroll / h1 / pill clipped | none / 1 / none | none / 1 / none | match |
| narrow | details and edit, every status | 320 | "Your connections" link | focus ring keyboard / click | ring / none | `:focus-visible` solid 4px / none | match |
| narrow | details scheduled | 320 | page | horizontal scroll | none | scrollWidth 320 = clientWidth; the header pill wraps to "Scheduled ·" / "01.12.2026", 107.8 × 48 at x 180.2–288, the "Where you are" pill 288 × 64 (was 354: closed by the TopBar change below md) | match |
| narrow | edit scheduled | 320 | page | horizontal scroll | none | scrollWidth 320; the header pill 107.8 × 48 at x 180.2–288, nav 288 × 64 (was 354) | match |
| narrow | details scheduled, German | 320 | page | horizontal scroll | none | scrollWidth 320; "Geplant ·" / "01.12.2026", 103.4 × 48 at x 184.6–288, nav 288 × 64 (was 341) | match |
| narrow | details and edit scheduled | 320 | page | h1 | 1 | 1 | match |
| narrow | overview (all four statuses) | 160 | page | horizontal scroll / h1 / pills clipped | none / 1 / none | scrollWidth 160 / 1 / none clipped | match |
| narrow | details and edit, every status | 160 | page | horizontal scroll / h1 / pill clipped | none / 1 / none | none / 1 / none | match |
| narrow | details and edit scheduled | 160 | header status pill | wrapping | wraps (`narrow:`) | "Scheduled · 01.12.2026" on two lines, 128 × 48, x 16–144 | match |
| narrow | overview, details and edit, every status | 160 | name link / "Your connections" | focus ring keyboard / click | ring / none | `:focus-visible` solid 4px / none | match |
| narrow | restore dialog (`RestoreDialog.tsx`) | 320, 160 | header status pill | label | "Draft" | not reached in the browser (needs a stored local draft); same `state="draft"` call as the draft details and the draft editor, measured above | match (code-identical call) |
| narrow | edit scheduled, German | 320 | page | horizontal scroll / h1 / clipped / off-screen in the header | none / 1 / none / 0 | scrollWidth 320 / 1 / none / 0; pill 103.4 × 48, nav 288 × 64 | match |
| narrow | details and edit scheduled, EN and DE | 320 | header status pill | wrap point | the date on the 2nd line | "Scheduled ·" / "01.12.2026" ("·" bound by a no-break space; without it the "·" took a 3rd line, 103.4 × 72, its corner outside the 88-high pill) | match (UNCERTAIN in the report) |
| narrow | details and edit scheduled | 320 | header name ("P3 seed scheduled") | width | cut with "…" (U03 #38) | 7.1 (EN), 8 (DE): only "P" shows | match (the baseline cut: "P3 seed deactivated" is 4.3 wide at 320 in the same pill) |
| narrow | details and edit scheduled, EN and DE | 320 | "Where you are" pill | radius / height | full round / 48 (one line) | 9999px / 64 (grows with the two-line status, `max-md:h-auto min-h-48 py-8`) | match (the pill grows as `narrow:` already lets it, W16) |
| narrow | details and edit live, deactivated, draft, EN | 320 | header status pill and nav | box | unchanged from the rows above | Active 215.2–288 × 24, Deactivated 177.4–288 × 24, Draft 221.7–288 × 24; nav 288 × 48, r 9999px; names 42 / 4.3 / 48.6 wide | match (identical to the first measurement) |
| narrow | details and edit live, deactivated, draft, German | 320 | header status pill and nav | box / scroll / h1 | one line, no scroll, 1 | Aktiv 221.8–288 × 24, Deaktiviert 182.7–288 × 24, Entwurf 204.3–288 × 24; nav 288 × 48; scrollWidth 320; 1 h1; 0 off-screen | match |
| narrow | details and edit, every status, EN and DE | 160 | page and header | scroll / h1 / clipped / off-screen | none / 1 / none / 0 | scrollWidth 160 / 1 / none / 0; scheduled 128 × 48 at x 16 (nav 144 × 128 EN, 144 × 160 DE, r 12px), Active 72.8, Deactivated 110.6, Draft 66.3, Aktiv 66.2, Deaktiviert 105.3, Entwurf 83.7, all 24 high | match (EN identical to the first measurement) |
| narrow | overview, every status, EN and DE | 320, 160 | row status pills | box / scroll / h1 | one line, 24 high | Deactivated 110.6, Active 72.8, Scheduled 101, Draft 66.3; Deaktiviert 105.3, Aktiv 66.2, Geplant 84.3, Entwurf 83.7; all × 24 at x 41 (320) / 21 (160); no scroll; 1 h1 | match (a one-word label never shrinks) |
| narrow | details and edit, every status, EN and DE | 320, 160 | "Your connections" (the pill's link) | focus ring after Tab / after a click | ring / none | `:focus-visible` solid 4px / none | match |
| narrow | overview, EN and DE | 320, 160 | first row's name link | focus ring after Tab / after a click | ring / none | `:focus-visible` solid 4px / none | match |
| 7114:49835 | scheduled (details and edit), after the TopBar change | 1440 | header status pill / nav | box | as matched above | pill 433.6,28 180.6 × 24, one line; nav 157.1,16 473.1 × 48, r 9999px; name 119.4 wide | match (unchanged: the change applies below md only) |
| 7114:49835 | live (details and edit), after the TopBar change | 1440 | header status pill / nav | box | as matched above | pill 390.7,28 72.8 × 24; nav 473.1 → 322.4 × 48 (its own name), r 9999px | match (unchanged) |
| narrow | details scheduled | 400, 600, 767 | header status pill | wrap only when needed | one line where it fits | 400: 117.3 × 48 (wrapped), name 77.5; 600 and 767: 180.6 × 24 (one line), name 119.4; no scroll | match |

#### T015: the date pill on the status band (C1, S15, S16; FR-015, FR-016, FR-020, W16; Chromium via the `playwright-chrome` MCP, 1455 px window = 1440 CSS px body; fonts: `document.fonts.check('600 14px "Fira Sans"')` true; the browser in UTC, the dates checked against the database in Europe/Berlin)

| frame | state | width | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|---|
| 7355:61155 (U80) | live (`P3 seed live`) | 1440 | date pill | place | under the sub-line, 20 apart, at the text's left | 384, 208 (sub-line 164 + 24 + 20; text column x 384) | match |
| 7355:61155 | live | 1440 | date pill | size | hug × 48 | 281.6 × 48 (hugs its line) | match |
| 7355:61155 | live | 1440 | date pill | padding / gap / radius / fill | 8 8 8 16 / 8 / 8 / white | 8px 8px 8px 16px / 8px / 8px / oklch(1 0 0) | match |
| 7355:61155 | live | 1440 | calendar | glyph, size, place | icon-calendar_today-small 20, y 14 in the pill, ink | `kern-icon--calendar-today` 20 × 20 at 400, 222 (pill + 16, + 14), rgb(11, 18, 32) | match |
| 7355:61158 | live | 1440 | line | text | "Active since 23.10.2026, 14:32" | "Active since 09.11.2026, 18:20" (`activated_at` 19:20 Berlin = 18:20 UTC, the browser's zone) | match (sample date) |
| 7355:61158 | live | 1440 | line | style | label/small: Fira Sans SemiBold 14/24, #4a5468, tnum/zero | Fira Sans 600 14px/24px rgb(74, 84, 104), tabular-nums slashed-zero (index.css's global rule) | match |
| 7355:61158 | live | 1440 | line | place | x 28 from the icon's left, y 12 | 428 (icon 400 + 20 + 8), text 220 (p 216 + 4) | match |
| 7355:61160 (U80) | live | 1440 | ⋯ | size, radius, place, glyph | 32 × 32, radius 4, 8 from the pill's right and top, more_vert 20 | `ActionMenu` 32 × 32, 4px, 625.6, 216 (pill right 665.6 − 8 − 32), `kern-icon--more-vert` 20 | match |
| 7355:61160 | live | 1440 | ⋯ | name | "More · connection actions" | "Connection actions" (sr-only) | match (spec 008's name, glossary "Aktionen für die Anbindung") |
| 7355:61155 | live | 1440 | band, screenshot | comparison | check icon, title, sub-line, pill with ⋯, colour picture | same (`T015/t015-band-active-1440.png`) | match |
| 7355:61155 | live | 1440 | band | height | 192 (U80 band with the pill row) | 192 | match |
| 7355:61155 | live | 1440 | band picture | size, place | 247 × 145 at right −30 (visible 217 × 129 bottom right) | 217 × 129 at right 0 bottom 0 (919, 159) | match (spec 008 T006's crop, unchanged) |
| 7355:61160 | live | 1440 | ⋯ menu | entries | not drawn in this unit | "Deactivate", divider, "Delete connection" (as before) | match (the entries stay as today; "Change start date" is US1's, T025/T026) |
| 7355:61160 | live | 1440 | ⋯ menu | place | below the ⋯, its right edge at the ⋯'s | 437.6–657.6 × 256 (⋯ bottom 248 + 8), 220 wide | match |
| 7355:61822 (U81) | live | 1440 | line | text, style | "Active since 23.10.2026, 14:32", label/small muted | as 7355:61158 above (same component) | match |
| 7355:60677 (U94) | scheduled (`P3 seed scheduled`) | 1440 | band | fill / size | `feedback-info-background` #e0f2fe / 832 × 216 | rgb(224, 242, 254) / 832 × 216 | match |
| 7355:60682 | scheduled | 1440 | status icon | circle | 32, #0284c7, full round | 32 × 32 at 336, 128, rgb(2, 115, 174), 9999px | match (the overlay's AA value of `feedback-info`, spec 008 design-notes §1.5, as the draft's circle) |
| 7355:60683 | scheduled | 1440 | status icon glyph | glyph, size, place | icon-calendar_today-small white 20, 6 in | `kern-icon--calendar-today` 20 × 20 at 6, 6, oklch(1 0 0) | match |
| 7355:60687 | scheduled | 1440 | title (h1) | text | "Your connection is scheduled" | "Your connection is scheduled" | match |
| 7355:60688 | scheduled | 1440 | sub-line | text, wrap | "The links are ready to be added to your service. They become active on the scheduled date below." on 2 lines, 537 × 48 | same, 537 × 48, wraps after "active on the" | match |
| 7355:60689 | scheduled | 1440 | date pill | place, size | 0, 104 in the text (column y 32), 279 × 48 | 384, 232 (96 + 32 + 84 + 20), 279 × 48 | match |
| 7355:60692 | scheduled | 1440 | line | text, size | "Active from 01.12.2026, 00:00", 187 × 24 | "Active from 01.12.2026, 00:00", 187 wide (start_date 2026-12-01, written as stored) | match |
| 7355:60694 | scheduled | 1440 | ⋯ | place | x 239, y 8 in the pill | 623 − 384 = 239, 240 − 232 = 8 | match |
| 7355:60695 | scheduled | 1440 | band picture | file | "Picture · scheduled" (the colour art, 2000 × 1167 export) | `published-art@2x.png` 217 × 129 bottom right | match (the same art as "Picture · active", compared by eye; T006's crop) |
| 7355:60677 | scheduled | 1440 | band, screenshot | comparison | blue band, calendar icon, two-line sub-line, pill "Active from 01.12.2026, 00:00" with ⋯ | same (`T015/t015-band-scheduled-1440.png`) | match |
| 7355:60694 | scheduled | 1440 | ⋯ menu | entries | not drawn | "Delete connection" (as for any not-active connection today) | match (the entries stay as today; US1's T025 adds "Change start date" and "Deactivate") |
| 7355:61530 (U89) | deactivated (`P3 seed deactivated`) | 1440 | band | fill / height | #f2f5fb / 192 | rgb(242, 245, 251) (spec 008) / 192 | match |
| 7355:61542 | deactivated | 1440 | status row | layout | pill, then "Activate again", 16 apart, centred | pill 384–703.4 × 48 at y 208, button 719.4 × 48 at y 208 (gap 16) | match |
| 7355:61546 | deactivated | 1440 | line | text | "Deactivated since 24.10.2026, 10:05" | "Deactivated since 09.11.2026, 18:34" (`deactivated_at` 19:34 Berlin) | match (sample date) |
| 7355:61543 | deactivated | 1440 | date pill | size / padding | hug × 48 / 8 8 8 16 | 319.4 × 48 / 8px 8px 8px 16px | match |
| 7355:61549 | deactivated | 1440 | "Activate again" | look | button-primary, min-h 48, label/default | `kern-btn kern-btn--primary` 151.1 × 48 (unchanged) | match |
| 7355:61530 | deactivated | 1440 | band, screenshot | comparison | grey band, link-off icon, pill with ⋯, "Activate again" beside it | same (`T015/t015-band-deactivated-1440.png`) | match |
| 7355:61548 | deactivated | 1440 | ⋯ menu | entries / place | not drawn / below the ⋯ | "Delete connection" / 475.4–695.4, y 256 | match |
| 7355:60885 (U96) | deactivated | 1440 | line | text, style | "Deactivated since 24.10.2026, 10:05", label/small muted | as 7355:61546 above (same component) | match |
| 7362:54712 (U93) | draft (`Führerscheinantrag Stuttgart`) | 1440 | date pill | place, size, padding | 384, 232; 215 × 40; 8 16; no ⋯ | 384, 232; 215.4 × 40; 8px 16px; no ⋯ | match (spec 008 T081's numbers unchanged) |
| 7362:54712 | draft | 1440 | line | text | "Edited 03.10.2026, 14:32" | "Edited 08.11.2026, 18:05" (`updated_at` 19:05 Berlin) | match (sample date) |
| 7362:54712 | draft | 1440 | "Delete draft" | place | band's right end (F56) | 944.6, 120, 159.4 × 48 (unchanged) | match (F56) |
| C1 | all four, German | 1440 | line | text | glossary: "Aktiv seit", "Aktiv ab", "Deaktiviert seit", "Bearbeitet" | "Aktiv seit 09.11.2026, 18:20", "Aktiv ab 01.12.2026, 00:00", "Deaktiviert seit 09.11.2026, 18:34", "Bearbeitet 08.11.2026, 18:05"; one line each (265.7 / 258 / 304.8 / 242.2 wide) | match |
| C1 | scheduled, German | 1440 | title / sub-line | text | not in the glossary | "Ihre Anbindung ist geplant" / "Die Links können bereits in Ihren Dienst eingefügt werden. Sie werden am geplanten Datum unten aktiv." | decided, design-notes §4.2 "T015" (the German accepted by the coordinator; carried to T025) |
| C1 | deactivated, German | 1440 | "Wieder aktivieren" | place | beside the pill | 704.8 × 48 at y 232, 16 after the pill | match |
| US2-AS6 | `T015 pill check` (created, then deleted) | 1440 | line after deactivating, then activating again 61 s later | text | "Active since" moves to the reactivation | "Active since 11.11.2026, 11:15" → "Deactivated since 11.11.2026, 11:15" → "Active since 11.11.2026, 11:16"; focus on the ⋯ after deactivating, on the h1 after reactivating | match |
| FR-016 | live, scheduled, deactivated | 1440 | spec 008's chip at the band's right end | presence | gone | no chip; the ⋯ is inside the pill | match (#52 superseded) |
| narrow | live, scheduled, deactivated, draft, EN | 320 | page | horizontal scroll / h1 count | none / 1 | scrollWidth 305 ≤ clientWidth 320 / 1 in each | match |
| narrow | live, scheduled, deactivated, draft, EN | 320 | band | off-screen / clipped | 0 / none | 0 elements outside 0–320; only the ⋯'s sr-only label reports overflow (by design) | match |
| narrow | live, scheduled, deactivated, EN | 320 | date pill | wrap, ⋯ row | the line wraps, the ⋯ on the first row | pill 193 wide; line 101 wide on 3 (live, scheduled) / 4 (deactivated) lines beside the calendar; ⋯ at pill top + 8 (first row) | match (W16) |
| narrow | deactivated, EN | 320 | "Activate again" | place | under the pill where it doesn't fit beside it | 80, 552 (pill bottom 536 + 16), 151.1 × 48 | match (`T015/t015-deactivated-320.png`) |
| narrow | draft, EN | 320 | date pill | wrap | the line wraps, no ⋯ | 193 × 64, line on 2 lines; "Delete draft" under the text at 32, 492 | match |
| narrow | live, scheduled, deactivated, EN | 320 | ⋯ menu open | inside the window / page scroll | inside / none | 32–273 × from y 464/504/464 (spans the band less 16, `placementFrom()`'s 'full'), scrollWidth 305 | match |
| narrow | live, scheduled, deactivated, draft, EN | 160 | page | horizontal scroll / h1 count | none / 1 | scrollWidth 160 = clientWidth / 1 in each | match |
| narrow | live, scheduled, deactivated, draft, EN | 160 | band | off-screen / clipped | 0 / none | 0 / only the sr-only label | match |
| narrow | live, scheduled, deactivated, EN | 160 | date pill | wrap, ⋯ row | the line wraps, the ⋯ stays on the first row | calendar and ⋯ on the first row (⋯ at pill top + 8, right end), the line under them across the pill (97 wide, 3–4 lines); pill 113 × 128 (live, scheduled), 113 × 152 (deactivated) | match (W16; `T015/t015-band-deactivated-160.png`) |
| narrow | deactivated, EN | 160 | "Activate again" | place | under the pill | 16, 856, 113 × 64 (label on 2 lines) | match |
| narrow | draft, EN | 160 | date pill | wrap | the line wraps | 113 × 88, the line beside the calendar on 3 lines; no ⋯ | match |
| narrow | live, scheduled, deactivated, EN | 160 | ⋯ menu open | inside the window / page scroll | inside / none | 24–121 (band less 16 each side), above the ⋯ (y 353–600 live, 366–520 one entry), scrollWidth 160; the entries' labels break inside words (index.css's narrow rule, as the menu did at the band's corner before) | match (`T015/t015-live-160-menu.png`) |
| narrow | live, scheduled, deactivated, EN | 320, 160 | ⋯ | focus ring after Tab / after a click | ring / none | `:focus-visible` true, solid 4px offset 2px / after a mouse click `:focus-visible` false, outline none | match |
| narrow | deactivated, draft, EN | 320, 160 | "Activate again", "Delete draft" | focus ring after Tab | ring | `:focus-visible` true, solid | match (after a click not rechecked: a click opens their dialog; the KERN button is the baseline's) |
| narrow | all four, German | 320, 160 | page / band / pill / menu | scroll, h1, off-screen, ⋯ row, menu inside | none / 1 / 0 / first row / inside | scrollWidth 305 (320), 160 (160); 1 h1; 0 off-screen; ⋯ at pill top + 8; menus 32–273 (320) and 24–121 (160) | match |
| 1440 | live, scheduled, deactivated, EN and DE | 1440 | ⋯ | focus ring after Tab / after a click | ring / none | `:focus-visible` true, solid 4px / false, none | match |

#### T023: "Active from" (`components/ActiveFromChoice/`; C2; FR-001–FR-003, FR-011; F3, W1, W16; Chromium via the `playwright-chrome` MCP, 1455 px window = 1440 CSS px body; fonts: `document.fonts.check('400 14px "Fira Sans"')` and `('600 16px "Fira Sans"')` true; rendered for the check inside the publish dialog of the draft `Anwohnerparkausweis` behind a temporary wrapper (state from the URL hash), removed afterwards; the dialog's intro and buttons are T024's and not compared)

| frame | state | width | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|---|
| P1 6376:25536 (U75) | Now | 1440 | "Go live" row | place | 16 under the summary table, x 32 + 16 in the dialog (420) | y 487.5 (table bottom 471.5 + 16), legend x 468 (420 + 32 + 16) | match |
| P1 6380:26663 | Now | 1440 | row | layout | flex, gap 24, pl 16, items-start | fieldset flex, gap 24px, padding-left 16px, 536 × 32 | match |
| P1 6380:26664 | Now | 1440 | label | text | "Active from" (F3: not "Becomes active") | legend "Active from" | match (F3) |
| P1 6380:26664 | Now | 1440 | label | style, size | label/default SemiBold 16/24, action-default #1d56f0, 112 × 32, centred on the radio row | 600 16px/24px Fira Sans, rgb(29, 86, 240), 112 × 32, flex centred | match |
| P1 6635:36183 | Now | 1440 | radios | layout | row, gap 24, x = label + 24 | x 604 (468 + 112 + 24), "On a date" at 683.6 (Now's 55.6 + 24) | match (kern.css's 16 px row padding taken off) |
| P1 6387:26924 | Now | 1440 | "On a date" radio (unselected) | circle | 20, white, 1 px #6b7488, full round | 20 × 20, oklch(1 0 0), 1px solid rgb(107, 116, 136), 100 % | match |
| P1 6387:26927 | Now | 1440 | "Now" radio (selected) | circle, dot | 1 px #1d56f0 ring, white, dot r 5 #1d56f0 | 1px solid rgb(29, 86, 240), dot 10 × 10 rgb(29, 86, 240) | match |
| P1 6387:26926 | Now | 1440 | radio labels | style | body/small 14/24 Regular, #0b1220, 8 after the circle | 400 14px/24px Fira Sans, rgb(11, 18, 32), label x = circle + 28 | match |
| P1 6387:26931 | Now | 1440 | radio item | padding, height | py 4, 32 | 4px 0px, 32 | match |
| P1 | Now | 1440 | screenshot | comparison | "Active from" ◉ Now ○ On a date under the table | same (`T023/t023-now-1440.png`) | match |
| P1b 6383:66119 (U75) | On a date, empty | 1440 | radios | selection | "On a date" selected | checked, ring and dot as above | match |
| P1b 6380:26675 | On a date, empty | 1440 | date field | place | under the radios, 8 apart, at the choice's left | y 503.5 (radio row 463.5 + 32 + 8), x 604 | match |
| P1b 6380:26675 | On a date, empty | 1440 | date field | size, box | 128 × 40, white, 1 px #e1e6f0, radius 8, px 16 | 128 × 40, oklch(1 0 0), 1px solid rgb(225, 230, 240), 8px, 0 16px | match |
| P1b 6093:3646 | On a date, empty | 1440 | placeholder | text, style | "DD.MM.YYYY", body/default 16/24, muted #4a5468 | "DD.MM.YYYY", 16px/24px, ::placeholder rgb(74, 84, 104) | match |
| P1b | On a date, empty | 1440 | field | name for screen readers | not drawn (copy.md §2) | aria-label "Start date (DD.MM.YYYY)" | match (copy.md §2) |
| P1b | On a date, empty | 1440 | dialog | height | 467 (its intro on 2 lines) | 443 with the "Now" intro on 1 line (+ 48 for the field over 395) | match (the intro is T024's: 443 + 24 = 467) |
| P1b | On a date, empty | 1440 | screenshot | comparison | radios, then the empty field under them | same (`T023/t023-date-1440.png`) | match |
| P1b | On a date, text | 1440 | field | text | not drawn | "01.12.2026", 400 16px/24px rgb(11, 18, 32), 69.6 px in the 94 px content | match |
| P1b | On a date, text | 1440 | field | focus after a click | not drawn | `:focus-visible` true, 4px solid, offset 2 | match (spec 008 sweep: a text field focused after a click shows its field focus) |
| P1c 6635:36265 (U76) | error | 1440 | date field | border | 1 px feedback-danger #c4271c | 1px solid rgb(196, 39, 28); `aria-invalid="true"` | match |
| P1c 6194:42227 | error | 1440 | error line | place | under the field, 8 apart | y 535.5 (field bottom 527.5 + 8), x 604 | match |
| P1c 6194:42227 | error | 1440 | error line | text, style | "Enter a date after today.", body/small 14/24, #c4271c | same text, 400 14px/24px rgb(196, 39, 28), 177.6 × 24 | match |
| P1c 6194:42228 | error | 1440 | error icon | glyph, size, gap | icon-emergency_home-small 20, danger, 4 to the text | `kern-icon--danger kern-icon--small` 20 × 20 rgb(196, 39, 28), gap 4px | match |
| P1c | error | 1440 | error line | announced, linked | not drawn (W1) | `role="alert"` (errorRole), the field's `aria-describedby` names it | match (W1) |
| P1c | error | 1440 | dialog | height | 499 | 475 (+ 32 over "On a date"; the intro is T024's: 475 + 24 = 499) | match |
| P1c | error | 1440 | screenshot | comparison | red field, ◆ "Enter a date after today." under it | same (`T023/t023-error-1440.png`) | match |
| C2 | hint (caller's) | 1440 | hint line | place, style | not drawn | under the field 8 apart, body/small 14/24 muted rgb(74, 84, 104), 384 wide, wraps; `aria-describedby` of the fieldset | match (W1; placement UNCERTAIN, see T023's report) |
| C2 | all, German | 1440 | texts | text, fit | glossary: "Aktiv ab", "Sofort", "Ab einem Datum", "Startdatum (TT.MM.JJJJ)"; the server's "Geben Sie ein Datum nach dem heutigen Tag ein." | same; placeholder "TT.MM.JJJJ"; legend 112 × 32 one line; error 334.4 × 24 one line; nothing overflows (`T023/t023-de-error-1440.png`) | match |
| C2 | keyboard | 1440 | radios | focus ring after Tab / after a click | 3 px ring in action-focus-default / none | Shift+Tab from the field: `:focus-visible` true, 3px solid rgb(11, 18, 32), offset 0; after a click false, outline none | match |
| C2 | keyboard | 1440 | radios | arrow keys | choose | ArrowLeft selects "Now" and removes the field; ArrowRight brings it back with the text kept (props) | match |
| 6387:26931 | hover | 1440 | radios | hover look | unselected: blue ring + tint; selected: tint ring | unselected 2px rgb(29, 86, 240) on oklch(1 0 0); selected a 3 px ring of the tint (KERN's tint token is white in the overlay) | match (the rules step's "Start with" radio, spec 008, same classes) |
| narrow | Now, date empty, date text, error, EN | 320 | page | horizontal scroll / h1 count | none / 1 | scrollWidth 305 ≤ clientWidth 320 / 1 in each | match |
| narrow | Now, date empty, date text, error, EN | 320 | group | layout | below 640 the choice under the label (W16, as the summary's rows) | legend 83 × 24 at 64; choice under it 4 apart, 193 wide; radios on one row (64, 143.6) | match (W16) |
| narrow | Now, date empty, date text, error, EN | 320 | group | off-screen / clipped | 0 / none | 0 elements outside the fieldset or the window; no text overflow; field 128 × 40, placeholder 87.4 in 94 content, "28.08.2028" 75.7 | match |
| narrow | error, EN | 320 | error line | wrap | one line if it fits | 177.6 × 24 (`T023/t023-error-320.png`) | match |
| narrow | Now, date empty, date text, error, EN | 160 | page | horizontal scroll / h1 count | none / 1 | scrollWidth 160 = clientWidth 160 / 1 in each | match |
| narrow | Now, date empty, date text, error, EN | 160 | group | layout | wraps, nothing clipped | fieldset 89 wide without its indent (`narrow:pl-0!`); legend 83 × 24; radios one per row (y 449, 493; "On a date" on 2 lines) | match (W16) |
| narrow | date empty, date text, error, EN | 160 | date field | fit | the placeholder and a date whole | 89 × 40, 14 px with 4 at the sides (`narrow:`): placeholder 76.4 and "28.08.2028" 66.3 in 79 content; scrollWidth 87 = clientWidth 87 | match (W16; before the change "DD.MM.Y" was cut, see the report) |
| narrow | error, EN | 160 | error line | wrap | wraps under the field | 89 × 72, icon then text on 3 lines (`T023/t023-error-160.png`) | match |
| narrow | Now, date empty, date text, error, EN | 160 | group | off-screen / clipped | 0 / none | 0 outside; no text overflow | match |
| narrow | all, EN | 320, 160 | radios | focus ring after Tab / after a click | ring / none | Shift+Tab from the field `:focus-visible` true 3px solid; click on "Now" / "On a date" false, outline none | match |
| narrow | date, EN | 320, 160 | date field | focus ring after Tab / after a click | ring / field focus | Tab: true 4px solid; click: true 4px solid | match (spec 008 sweep: text fields show their field focus after a click) |

#### T024: "Active from" in the publish dialog (S14; FR-001–FR-003, FR-014, US1-AS1–AS4; F2, F3, W1, W8; Chromium via the `playwright-chrome` MCP, 1455 px window = 1440 CSS px body; fonts: `document.fonts.check('400 16px "Fira Sans"')`, `('600 16px "Fira Sans"')`, `('600 24px "Fira Sans"')` true; drafts `T024 now`, `T024 date`, `T024 error`, `T024 fail`, `T024 norules`, `T024 de`, `T024 spare` made through the API from `Anwohnerparkausweis`'s content and published through the UI against the fake EUDIPLO; failures and the slow publish made with `page.route()` in the browser, the backend untouched; screenshots in `.playwright-mcp/T024/` of the checkout, not committed)

| frame | state | width | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|---|
| P1 6376:25536 (U75) | Now | 1440 | dialog | size | 600 × 395 | 600 × 395 | match |
| P1 6376:25536 | Now | 1440 | intro | text | "When you publish, the connection is ready to be added to your services." | same | match |
| P1 6376:25536 | Now | 1440 | intro | style | body/default 16/24 Regular, muted #4a5468, 32 in | 400 16px/24px rgb(74, 84, 104), x 452 (420 + 32), 536 × 24 | match |
| P1 6380:26663 | Now | 1440 | "Active from" row | place | directly under the summary table, 16 apart | table bottom 471.5, fieldset y 487.5, legend "Active from" | match (F3) |
| P1 6376:25536 | Now | 1440 | radios | state | "Now" selected when it opens | `now` checked, `date` not | match |
| P1 6376:25536 | Now | 1440 | buttons | labels, size | "Back to test", "Publish connection", 2 × 260 × 48 | same, 260 × 48 each, y 567.5 | match |
| P1 | Now | 1440 | screenshot | comparison | title, intro, table, ◉ Now ○ On a date, buttons | same (`now-1440.png`) | match |
| P1b 6383:66119 (U75) | On a date, empty | 1440 | dialog | size | 600 × 467 (intro on 2 lines) | 600 × 467 | match |
| P1b 6383:66119 | On a date, empty | 1440 | intro | text, lines | "The connection becomes active on the date you choose. You get the links now, so your service can be ready in time.", 2 lines, broken after "links" | same, 536 × 48, broken after "links" | match |
| P1b 6383:66119 | On a date, empty | 1440 | primary button | label | "Schedule", enabled with the empty field | "Schedule", `aria-disabled="false"` | match |
| P1b 6380:26675 | On a date, empty | 1440 | date field | place, size | under the radios, 8 apart, 128 × 40, placeholder "DD.MM.YYYY" | x 604, y 515.5 (radio row + 32 + 8), 128 × 40, "DD.MM.YYYY", named "Start date (DD.MM.YYYY)" | match |
| P1b | On a date, empty | 1440 | screenshot | comparison | as P1 with the 2-line intro, the field, "Schedule" | same (`date-1440.png`) | match |
| P1c 6635:36265 (U76) | the field's error | 1440 | dialog | size | 600 × 499 | 600 × 499 | match |
| P1c 6635:36265 | the field's error | 1440 | behaviour | "Schedule" with an empty field, today 11.11.2026, 10.11.2026, 31.02.2027, "abc" | the error state, nothing published | each: "Enter a date after today." (`role="alert"`, the field `aria-invalid="true"`, `aria-describedby` the error), red line rgb(196, 39, 28), "Schedule" still enabled; 0 `POST …/publish` | match (FR-003, W1) |
| P1c 6194:42227 | the field's error | 1440 | error line | place, style | under the field 8 apart, 14/24 danger | y 547.5 (field bottom 539.5 + 8), 177.6 × 24, rgb(196, 39, 28) | match |
| P1c | the field's error | 1440 | focus | where it goes | not drawn | the date field (the error is its description); typing or another choice takes the error away | match (W1; UNCERTAIN 3 of the report) |
| P1c | the field's error | 1440 | screenshot | comparison | red field, ◆ "Enter a date after today." | same, plus the field's focus ring (`error-1440.png`) | match (W1) |
| P1c | the server's `400 invalid_start_date` | 1440 | behaviour | the day changed while the dialog was open | the field's error (W1) | real backend: the request's date rewritten to 2026-11-11 by `page.route()`; answer `400 {error: 'invalid_start_date', message: 'Enter a date after today.'}`; the summary again without an alert, the field's error, the focus on the field, the text "12.11.2026" kept, "Schedule"; the draft stays a draft at version 1 | match (FR-003, W1) |
| S14 | Schedule | 1440 | request | body | `start_date` (T019) | `start_date: "2026-12-01"` for "1.12.2026" (D.M.YYYY); "Now" sends no `start_date` | match (FR-001, FR-002) |
| U78 6387:65280 | Publishing… after "Schedule" | 1440 | status dialog | text, size | "Publishing…", "This takes a few seconds.", 400 × 232 | same, 400 × 232, the focus on the dialog | match (FR-014) |
| U78 6387:65289 | Published after "Schedule" | 1440 | status dialog | text, size | "Published", "Opening your connection page…", 400 × 232 | same, 400 × 232 | match (FR-014) |
| S14 | after "Schedule" | 1440 | the way on | page | the details, as after publishing | `/form-connections/<id>` with `{ published: true }`, h1 "Your connection is scheduled" (T025's band); API `state: 'scheduled'`, `start_date: '2026-12-01'`, `activated_at: null` | match (FR-014, US1-AS4) |
| S14 | after "Publish connection" | 1440 | the way on | page | the details, active at once | h1 "Your connection is active", `state: 'live'`, `activated_at` set | match (FR-001) |
| P5 6376:27178 (U79) | no answer (network failure) | 1440 | alert | text, kind | danger alert, title only: "Couldn’t publish, so nothing has changed. Check your internet connection and try again." | same, slim (no body), 536 × 88; "Try again" | match (F2, W8) |
| P5 6376:27178 | no answer | 1440 | dialog | layout | 480 wide, the alert alone | 600 wide: the alert, the intro, the summary and "Active from" as chosen, then the buttons | spec 008's F46 (the summary kept) and W8 ("Try again" repeats the shown choice) |
| P5 | `502` without the API's envelope (nginx) | 1440 | alert | text | the no-answer sentence | the no-answer sentence | match (UNCERTAIN 2 of the report) |
| P5 | server failure (`502` with `error_id`) | 1440 | alert | kind, text | spec 008's alert with its error ID, slim, wrapping for it, never two-part (F2) | one header, no body: the server's message, then "Error ID: <id>" on its own line, 536 × 136, `role="alert"` (`servererror3-1440.png`) | match (F2, W8) |
| P5 | `500` with `error_id` (before the fix) | 1440 | alert | kind | slim | two-part (title "Couldn’t publish", body message + ID): fixed to the slim alert above | match (F2; fixed) |
| P5 | failure | 1440 | "Try again" | what it sends | the same choice (W8) | abort, 500, 502, 400 in a row: each `POST …/publish` carried `start_date: "2026-12-01"`; "On a date" and "01.12.2026" kept; the draft stayed a draft (version 1) | match (FR-014, W8) |
| P5 | failure after a refused date | 1440 | field | error | gone once a valid date is sent | the field's error clears on "Schedule"/"Try again" with a valid day (reducer's `publish`) | match (fixed during the check) |
| S14 | "Publish without rules?" | 1440 | group | presence, intro, hint | the same group (task line) | "Active from" under the table; the intro stays "Without rules, anyone who shares these documents can apply."; with "On a date" the date's sentence as the group's hint (384 × 48), "Schedule"; its error as above; published `start_date: "2027-01-15"`, scheduled (`norules-date-1440.png`) | match (UNCERTAIN 1 of the report) |
| S14 | "Save changes?" (edit flow) | 1440 | group | presence | none (F9) | no fieldset; "Check rules again", "Save" | match (F9) |
| S14 | German | 1440 | texts | words | glossary: "Aktiv ab", "Sofort", "Ab einem Datum", "Planen", "TT.MM.JJJJ" | "Aktiv ab", "Sofort", "Ab einem Datum", "Planen", field "Startdatum (TT.MM.JJJJ)", intro "Die Anbindung wird am gewählten Datum aktiv. Sie erhalten die Links schon jetzt, damit Ihr Dienst rechtzeitig bereit ist.", error "Geben Sie ein Datum nach dem heutigen Tag ein.", no-answer and server alerts ("Fehler-ID: …"), "Erneut versuchen"; 0 clipped (`de-date-1440.png`, `de-server-1440.png`) | match |
| S14 | German | 1440 | dialog | size | – | Now 600 × 419 (intro on 2 lines), On a date 467, error 499 | match |
| S14 | German, Schedule | 160 | status dialog, details | text, fit | – | "Wird veröffentlicht …" / "Veröffentlicht", 113 wide, 0 clipped; h1 "Ihre Anbindung ist geplant" | match |
| narrow | Now, On a date (empty, text), error, EN | 320 | page | horizontal scroll / h1 / off-screen / clipped | none / 1 / 0 / 0 | scrollWidth 305 ≤ 320 / 1 / 0 / 0 in each; dialog 273 wide; legend 83 × 24 over the radios; field 128 × 40 (scrollWidth 126 = clientWidth); error 177.6 × 24; buttons stacked 209 × 48 | match |
| narrow | Now, On a date (empty, text), error, EN | 160 | page | horizontal scroll / h1 / off-screen / clipped | none / 1 / 0 / 0 | 160 = 160 / 1 / 0 / 0 in each; dialog 113; radios one per row; field 89 × 40 (87 = 87); error 89 × 72; "Publish connection" 89 × 88 | match |
| narrow | no answer, server failure, EN | 320 | page, alert | scroll / h1 / off-screen / clipped | none / 1 / 0 / 0 | 305 ≤ 320 / 1 / 0 / 0; alert 209 × 208 (no answer), 209 × 376 (server: message and ID wrapped), title 145 beside the 32 px icon | match |
| narrow | no answer, server failure, EN | 160 | alert | layout | the icon above the title, which takes the whole width (index.css's narrow block) | before: title 41 wide beside the icon, alert 1696 high (kern.css's `flex: 1 0 0` on `.kern-title`); after `narrow:[&_.kern-title]:basis-full!`: icon above, title 73 wide, alert 480 (no answer) / 816 (server) high; scroll 160 = 160, 0 off-screen, 0 clipped (`server-160b.png`) | match (W16; fixed, see the report) |
| narrow | without rules: Now, On a date, error, EN | 320 | page | scroll / h1 / off-screen / clipped | none / 1 / 0 / 0 | 305 ≤ 320 / 1 / 0 / 0; hint 193 × 120 under the field | match |
| narrow | without rules: Now, On a date, error, EN | 160 | page | scroll / h1 / off-screen / clipped | none / 1 / 0 / 0 | 160 = 160 / 1 / 0 / 0; hint 89 × 264; error 89 × 72 | match |
| narrow | Publishing…, Published, EN | 320 | status dialog | scroll / h1 / off-screen / clipped | none / 1 / 0 / 0 | 305 ≤ 320 / 1 / 0 / 0; 273 × 232 | match |
| narrow | Publishing…, Published, EN | 160 | status dialog | scroll / h1 / off-screen / clipped | none / 1 / 0 / 0 | 160 = 160 / 1 / 0 / 0; 113 × 288 / 312 | match |
| narrow | On a date, EN | 320, 160 | focus ring | after Tab / after a press | ring / none | Tab from the field: "Back to test", "Schedule" `:focus-visible` 4px solid; Shift+Tab to the radio 3px solid; a mouse press on "Back to test": no ring | match |
| narrow | the field's error, EN | 320, 160 | date field | focus after "Schedule" | the field's focus | the field focused, 4px ring (a text field shows its focus after a click, spec 008 sweep) | match (W1) |

#### T025: the scheduled connection's details and the ⋯ menu per state (S15; FR-006–FR-009, US1-AS4, US1-AS7; frames `7246:52715`, `7246:53289`, `7246:54565`, P11 `6396:48548`, P14 `6417:30900` (`6417:31045`); F12; Firefox via the `playwright-firefox` MCP, 1440 CSS px viewport (body 1440); fonts: `document.fonts.check('600 24px "Fira Sans"')` and `('400 14px "Fira Sans"')` true; data: `P3 seed scheduled`, `P3 seed live`, `P3 seed deactivated`, `T025 arrival` (a draft created through the API and scheduled for 15.12.2026 with T024's "Schedule"))

| frame | state | width | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|---|
| 7355:60677 (in 7246:52715) | scheduled, EN | 1440 | band | box, background, radius, padding | 832 × 216 at 304, 96; `feedback-info-background` #e0f2fe; 12; 32 / 215 right | 304, 96, 832 × 216; rgb(224 242 254); 12px; 32px 215px 32px 32px | match |
| 7355:60682 | scheduled | 1440 | status icon circle | size, place, colour | 32 × 32 at band 32, 32; `feedback-info` #0284c7 | 32 × 32 at 336, 128; rgb(2 115 174) | match (the overlay's AA value of `feedback-info`, design-notes §4.2 "T015" / spec 008's U07 #23, as the draft band) |
| 7355:60683 | scheduled | 1440 | status icon glyph | glyph, size, colour | `icon-calendar_today-small` (KERN's), 20 × 20 at 6, 6, white | `kern-icon--calendar-today` 20 × 20 at 342, 134, white (oklch(1 0 0)) | match (KERN's own glyph by the instance's name; the carried check, by eye) |
| 7355:60687 | scheduled, EN | 1440 | h1 | text, place, colour | "Your connection is scheduled", heading/large 24/32 600, at text 0, 0 (384, 128), 537 wide | the same text, 384, 128, 537 × 32, rgb(11 18 32) | match |
| 7355:60688 | scheduled, EN | 1440 | sub-line | text, place | "The links are ready to be added to your service. They become active on the scheduled date below.", body/small 14/24 muted, y 36, 537 × 48 | the same text, 384, 164, 537 × 48, rgb(74 84 104) | match |
| 7355:60689 | scheduled, EN | 1440 | date pill | box, padding, radius | 279 × 48 at text y 104, padding 8 8 8 16, radius 8 | 384, 232, 278.9 × 48; 8px 8px 8px 16px; 8px | match |
| 7355:60692 | scheduled, EN | 1440 | pill line | text | "Active from 01.12.2026, 00:00", label/small muted, 187 wide | "Active from 01.12.2026, 00:00", 186.9 wide, rgb(74 84 104) | match |
| 7355:60695 | scheduled | 1440 | band picture | file, place | "Picture · scheduled" 247 × 145 at band 615, 75 (top at 50 % + 39.5 − 72.5), clipped to 217 × 141 | `published-art@2x.png` 217 × 129 at 615, 87 (bottom right) | decision: spec 008 T006's one crop per colour at the bottom right (spec 008 design-notes, the draft band's row `7362:54716`: "the band's picture layer is shared by every tone"); the same art, 12 px lower than drawn (Figma centres the picture on the band, so its place moves with the band's height); decorative, compared by eye (the carried check) |
| 7355:60677 | scheduled, EN | 1440 | band, screenshot | comparison | blue band, white calendar in the blue circle, title, two-line sub-line, pill with ⋯, colour picture | the same (`.playwright-mcp/t025-band-en.png`) | match |
| 7246:52715 | scheduled, from "View", EN | 1440 | accordions | open card | Summary open, Links closed | Summary open ("Hide summary"), Links closed ("View links") | match |
| 7246:52715 | scheduled | 1440 | Summary card | "Download PDF" | secondary button in the header | none (`/PDF/` not in the page's text) | not built, F12 |
| 7246:52715, 7246:53289, 7246:54565 | scheduled | 1440 | Activity card | presence | closed card after the Summary | none | not built here: T033 (S15 "The Activity card", US3) |
| 7246:54565 | scheduled, all cards closed | 1440 | accordions | closed state | Links, Summary, Activity closed | Links and Summary close one at a time (`toggleAccordion`, spec 008) | match (Activity: T033) |
| 7246:53289 | scheduled, after "Schedule" (`T025 arrival`) | 1440 | arrival | open card, focus | Links open, Summary closed | Links open ("Hide links", `aria-expanded` true), Summary closed; the focus on the h1 "Your connection is scheduled"; router state cleared after the read | match (S15 "Arriving after Schedule"; T024's `detailsRouteOf()` sends `published: true`, which `initialAccordionOf()` reads) |
| 7246:53889, 7246:53903 | scheduled, Links open | 1440 | copy buttons | enabled | "Copy link" enabled, primary | both enabled (no `disabled`, no `aria-disabled`, opacity 1, rgb(29 86 240), 139 × 48); a click copies ("Copied", the status "Link copied") | match (FR-007; `linksViewOf()`) |
| 7246:53289 | scheduled, Links open | 1440 | page, screenshot | comparison | band, Links open with request and result links, Summary closed, footer | the same without Activity and "Download PDF" (`.playwright-mcp/t025-scheduled-links-en.png`) | match (F12; Activity T033) |
| P11 6396:48548 | scheduled, Links open | 1440 | Links card | header | the card without its title row (the request link at the top) | spec 008's accordion with "Links for your service", the counts and "Hide links" | match (spec 008's accordion, FR-046 / FR-022; U94 7246:53289 draws the header) |
| 6417:31045 | scheduled, menu open, EN | 1440 | menu | size, frame | 220 × 145, padding 8, radius 8, 1 px #e1e6f0, shadow 0 10 28 rgba(19 21 37 .16) | 220 × 145; 8px; 8px; 1px rgb(225 230 240); the same shadow | match |
| 6417:31045 | scheduled, menu open, EN | 1440 | entries | texts, order, places | "Change start date" (y 9), "Deactivate" (51), divider (93), "Delete connection" (96, danger); rows 202 × 40 | the same at 9, 51, 93, 96 from the menu's top; 202 × 40; "Delete connection" rgb(196 39 28) | match |
| I6417:31045;6529:39189 | scheduled, menu open | 1440 | "Change start date" icon | glyph, size | "Icon/Change date · calendar pencil" 20 × 20 at 8, 10 | `assets/icons/calendar-pencil.svg` (the export, new) 20 × 20 at row 8, 10 | match |
| I6417:31045;6529:39192 | scheduled, menu open | 1440 | "Deactivate" icon | glyph, size | "Icon/Link off" 24 | `link-off.svg` at 20 | match (the menu's 20 px icon slot, spec 008 T021's row for `6417:31045`) |
| 6417:31045 | scheduled, menu open | 1440 | menu, screenshot | comparison | three entries, divider, danger delete | the same (`.playwright-mcp/t025-menu-scheduled-en.png`) | match |
| 6417:31045 | live, menu open, EN | 1440 | entries | texts, order | "Change start date", "Deactivate", divider, "Delete connection" | the same; menu 437.6, 256, 220 × 145 | match (FR-009) |
| 6417:30900 | live, menu open | 1440 | menu | place | left edge at the ⋯'s left (626), 4 px under the ⋯ | right edge at the ⋯'s right (657.6), 8 px under it (256 = ⋯ bottom 248 + 8) | decision: the shared `ActionMenu`'s placement (spec 008 T021: 8 px from the ⋯, `placementFrom()` from the 'end' side), as T015's row for `7355:61160`; `ActionMenu` is not in T025's files (UNCERTAIN 3) |
| 6417:30900 | live, menu open | 1440 | page, screenshot | comparison | the active band with the menu open over the Links card | the same (`.playwright-mcp/t025-active-menu-en.png`) | match |
| — | deactivated, menu open, EN / DE | 1440 | entries | texts | "Delete connection" only (not drawn) | "Delete connection" / "Anbindung löschen" alone, no divider; "Activate again" beside the pill; the copy buttons `aria-disabled` | match (FR-008; S15) |
| — | scheduled, "Change start date" chosen | 1440 | page's dialog state | `actionsReducer` | opens "Change start date" (T026's dialog) | state `{ dialog: 'startDate', dialogOpen: true }` (read from React's fiber); no dialog open (T026 builds it); the menu closed, the focus on the ⋯; choosing "Delete connection" afterwards opens the delete dialog | match (T026 builds the dialog on this state) |
| — | scheduled, DE | 1440 | band / pill / header pill / menu | texts | glossary | "Ihre Anbindung ist geplant", "Die Links können bereits in Ihren Dienst eingefügt werden. Sie werden am geplanten Datum unten aktiv.", "Aktiv ab 01.12.2026, 00:00", "Geplant · 01.12.2026"; menu "Startdatum ändern", "Deaktivieren", divider, "Anbindung löschen"; ⋯ "Aktionen für die Anbindung" | match (glossary "Startdatum ändern"; band German §4.2 "T015") |
| — | live, DE | 1440 | menu | texts | glossary | "Startdatum ändern", "Deaktivieren", divider, "Anbindung löschen" | match |
| narrow | scheduled, Summary open, EN / DE | 320 | page | scroll, h1, off-screen | none / 1 / 0 | scrollWidth 320 / 320; 1 h1; 0 off-screen; pill 80, 456, 208 × 72 | match |
| narrow | scheduled, menu open, EN / DE | 320 | menu | inside, entries | inside the window, no scroll | 32–288 × from y 504 (`placementFrom()`'s 'full'), three entries 40 high, scrollWidth 320 | match |
| narrow | scheduled, Links open (`T025 arrival`), EN / DE | 320 | copy buttons | inside, enabled | inside / enabled | 73–212 (EN), 73–244.5 (DE), enabled; scrollWidth 320; 1 h1 | match |
| narrow | scheduled | 320 | header name | clipped | — | "P3 seed scheduled" truncated in the header pill | not T025's: design-notes §4.3 "The connection's name in the header at narrow widths" (T084 decides; T014's header) |
| narrow | scheduled, ⋯ | 320 | focus ring | after a click / after Tab | none / visible | `:focus-visible` false, outline none / true, 4 px solid rgb(11 18 32), offset 2 | match |
| narrow | scheduled, Summary open, EN / DE | 160 | page | scroll, h1, off-screen, clipped | none / 1 / 0 / 0 | 160 / 160; 1; 0; 0; pill 16, 680, 128 × 104 (⋯ on the first row) | match |
| narrow | scheduled, menu open, EN / DE | 160 | menu | inside, entries | inside | 24–136, above the ⋯ (y 415, 265 high), entries 88 / 64 / 88 high (labels break inside words), its list scrolls inside when the page has scrolled | match (§4.2 "T015": the narrow rule breaks the labels; R10's inner scroll) |
| narrow | scheduled, Links open (`T025 arrival`), EN / DE | 160 | copy buttons / URLs | inside, enabled / ellipsis | inside | 37–139, enabled; URLs 102 wide with an ellipsis; scrollWidth 160; 1 h1 | match (spec 008's URL field) |
| narrow | live, menu closed and open, EN / DE | 320 | page / menu | scroll, h1, off-screen, menu | none / 1 / 0 / inside | 320; 1; 0; menu 32–288, three entries 40 high | match (header name: §4.3) |
| narrow | live, menu closed and open, EN / DE | 160 | page / menu | scroll, h1, off-screen, menu | none / 1 / 0 / inside | 160; 1; 0; menu 24–136 above the ⋯, entries 88 / 64 / 88 | match |
| narrow | deactivated, menu closed and open, EN / DE | 320 | page / menu | scroll, h1, off-screen, menu | none / 1 / 0 / inside | 320; 1; 0; menu 32–288 × 58, "Delete connection" alone | match (header name: §4.3) |
| narrow | deactivated, menu closed and open, EN / DE | 160 | page / menu | scroll, h1, off-screen, menu | none / 1 / 0 / inside | 160; 1; 0; menu 24–136 × 106, one entry 88 high | match |

#### T028: the edit flow of a scheduled connection (S18, S14 “Saving a published connection”; FR-009, FR-013, FR-076, US1-AS9; frames E6 `7114:49683`, its header `7114:49835`; F4–F9, W6, W7; Firefox via the `playwright-firefox` MCP, 1440 CSS px viewport (body 1440); fonts: `document.fonts.check('400 14px "Fira Sans"')` and `('600 14px "Fira Sans"')` true; data: `T028 scheduled` (`3ea5a487-5f05-4e77-8de5-db60fa1a3058`, a draft made through the API from `P3 seed scheduled`’s content and published with `start_date` 2027-01-15, then edited and saved through the UI); `P3 seed live` opened, not saved; narrow rows measured by a Playwright snippet in the MCP (`.playwright-mcp/T028/narrow-*.js`, not committed): the pointer press is released over the dialog’s title or the page corner so nothing is activated; screenshots in `.playwright-mcp/T028/`, not committed)

| frame | state | width | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|---|
| E6 header `7114:49835` | test step, EN | 1440 | header pill | text | “Scheduled · 01.12.2026” | “Scheduled · 15.01.2027” (U+00A0 before “·”; the connection’s date) | match (§4.2 T014: the no-break space) |
| E6 header `7114:49835` | test step, EN | 1440 | header pill | height · padding · gap · radius | 24 · 10/10 · 6 · 8 | 24 · 10/10 · 6 · 8 | match |
| E6 header `7114:49835` | test step, EN | 1440 | header pill | background · label colour | #eaf7e6 · #1d7a2e | rgb(234,247,230) · rgb(29,122,46) | match |
| E6 header `7114:49835` | test step, EN | 1440 | header pill | dot | 8 × 8, hollow | 8 × 8, inset 1.5 px ring rgb(29,122,46) | match (§4.2 T014: the hollow dot as an inset shadow) |
| E6 header `7114:49835` | test step, EN | 1440 | header pill label | font | Fira Sans SemiBold 14/24 | Fira Sans 600 14/24 (`document.fonts.check` true) | match |
| E6 header `7114:49835` | test step, EN | 1440 | header | “Draft changes” beside the pill | none (F5) | none in the page’s text | match (F5) |
| E6 `7114:49683` | test step, EN | 1440 | footer | actions | Back · Discard changes · Save | Back · Discard changes · Save (no next step on Test) | match (F6) |
| E6 `7114:49683` | test step, EN | 1440 | footer | height · button height · left edge | 72 · 40 · 160 | 72 · 40 · 160 | match |
| E6 `7114:49683` | test step, EN | 1440 | footer | Save | primary, no arrow | `kern-btn--primary`, no arrow | match |
| E6 `7114:49683` | test step, EN | 1440 | body | step line, title, variant tabs, persona chips, data, result | E6’s sample content (3 variants, Mia/Anna/Yusuf) | the connection’s own content (1 variant, generated personas); layout as spec 008’s test step | match (content is data; spec 008 baseline, FR-074c) |
| E6 `7114:49683` | step 1, EN | 1440 | header pill | text | “Scheduled · <date>” (E6) | “Scheduled · 15.01.2027” | match |
| E6 `7114:49683` | step 1, EN | 1440 | info strip | text | W7: “Scheduled. Your changes become active on <date> once you save them.” | “Scheduled. Your changes become active on 15.01.2027 once you save them.” | W7 |
| E6 `7114:49683` | step 1, EN | 1440 | info strip | font · background · padding · height | U98 6731:39846: 14/24 regular, info background, 8/24, one line | Fira Sans 400 14/24 · rgb(224,242,254) · 8px 24px · 41 (one line + border) | match (W7 on U98 6731:39846’s strip) |
| E6 `7114:49683` | step 1, EN | 1440 | footer | actions | Discard changes · Choose documents → · Save (no Back on step 1) | Discard changes · Choose documents → · Save | match (F6) |
| E6 `7114:49683` | step 1, DE | 1440 | header pill | text | glossary: “Geplant · 01.12.2026” | “Geplant · 15.01.2027” | match |
| E6 `7114:49683` | step 1, DE | 1440 | info strip | text | W7, German | “Geplant. Ihre Änderungen werden am 15.01.2027 aktiv, sobald Sie sie speichern.” | W7 |
| E6 `7114:49683` | step 1, DE | 1440 | footer | actions | glossary | Zurück · Änderungen verwerfen · Speichern (test step) | match |
| E6 `7114:49683` | leave dialog (“Your connections”), EN | 1440 | “Save your changes?” | body | W7: “If you leave now, your changes are lost. Save them, or discard them and keep the scheduled version.” | the same, 18/24 | W7 |
| E6 `7114:49683` | leave dialog, EN | 1440 | “Save your changes?” | buttons · width | “Discard changes” (danger outline), “Save” (primary), × · 480 (E5b U99 7173:52836) | the same · 480 | match (F7) |
| E6 `7114:49683` | leave dialog, DE | 1440 | “Ihre Änderungen speichern?” | body | W7, German | “Wenn Sie jetzt gehen, gehen Ihre Änderungen verloren. Speichern Sie sie oder verwerfen Sie sie und behalten Sie die geplante Version.” | W7 |
| E6 `7114:49683` | discard dialog (footer), EN | 1440 | “Discard your changes?” | body | W7: “The connection goes back to the version that becomes active on <date>. Citizens aren’t affected.” | “The connection goes back to the version that becomes active on 15.01.2027. Citizens aren’t affected.” | W7 |
| E6 `7114:49683` | discard dialog, EN | 1440 | “Discard your changes?” | buttons · width | “Keep editing”, “Discard changes” (filled danger) · 480 (U100 7173:52772) | the same · 480 | match |
| E6 `7114:49683` | discard dialog, DE | 1440 | “Ihre Änderungen verwerfen?” | body | W7, German | “Die Anbindung kehrt zu der Version zurück, die am 15.01.2027 aktiv wird. Bürgerinnen und Bürger sind davon nicht betroffen.” | W7 |
| E6 `7114:49683` | “Save changes?”, EN | 1440 | dialog | intro | W6, copy.md §2: “Your changes become active with the connection on <date>. Citizens can’t use it before then.” | “Your changes become active with the connection on 15.01.2027. Citizens can’t use it before then.” (16/24, muted) | W6 |
| E6 `7114:49683` | “Save changes?”, EN | 1440 | dialog | “Active from” | none (F9) | no fieldset, 0 radios | match (F9) |
| E6 `7114:49683` | “Save changes?”, EN | 1440 | dialog | buttons · width | “Back to test”, “Save” · 600 (spec 008) | the same · 600 | match |
| E6 `7114:49683` | “Save changes?”, DE | 1440 | dialog | intro | W6, copy.md §2’s German | “Ihre Änderungen werden mit der Anbindung am 15.01.2027 aktiv. Vorher können Bürgerinnen und Bürger sie nicht nutzen.” | W6 |
| E6 `7114:49683` | after saving, EN | 1440 | PUT /api/form-connections/{id} | body | no date (FR-013, S18) | keys `name`, `description`, `documents`; no `start_date` | match |
| E6 `7114:49683` | after saving, EN | 1440 | the stored row | start_date · is_active · activated_at | unchanged: 2027-01-15 · false · null | API: `scheduled`, 2027-01-15, false, null; psql `template_db_010_p4`: 2027-01-15 | f | (null) | match |
| E6 `7114:49683` | after saving, EN | 1440 | details | h1 · pill · toast | “Your connection is scheduled” · “Scheduled · 15.01.2027” · “Changes saved.” (E4 6730:39810) | the same | match |
| E6 `7114:49683` | active connection (`P3 seed live`), EN | 1440 | note · leave · discard · “Save changes?” | texts | spec 008’s: F49 note, “… keep the active version.”, “… the version that’s active now. …”, F8’s body | unchanged; header pill “Active” | match (F8) |
| E6 `7114:49683` | all edit-flow states | 1440 | overview row | “Changes not published” | not built (F4) | not shown; editing leaves no draft row | not built, F4 |
| E6 `7114:49683` | all edit-flow states | 1440 | header | “Draft changes” beside the pill | not built (F5) | absent (EN and DE) | not built, F5 |
| E6 `7114:49683` | all edit-flow states | 1440 | footer · toast | “Keep draft and exit”, “Draft kept. Your changes take effect when you save them.” | not built (F6) | absent | not built, F6 |
| E6 `7114:49683` | all edit-flow states | 1440 | Konnekt / “Your connections” | saving like “Save and exit” and keeping a draft | not built (F7) | opens “Save your changes?” instead | not built, F7 |
| E6 `7114:49683` | step 1 (pill + note), EN | 320 | html | scrollWidth ≤ clientWidth | no horizontal scroll | 320 ≤ 320 | match |
| E6 `7114:49683` | step 1 (pill + note), EN | 320 | page | clipped or off-screen | none | the header’s name “T028 scheduled” cut by the two-line pill; nothing else | match (§4.2 T014 / §4.3 “the name at narrow widths”, T084’s to decide) |
| E6 `7114:49683` | step 1 (pill + note), EN | 320 | document | h1 count | 1 | 1 | match |
| E6 `7114:49683` | step 1 (pill + note), EN | 320 | “Discard changes” (footer) | focus ring: keyboard / pointer press | ring / none | `:focus-visible`, solid 4 px outline / no `:focus-visible`, outline none | match |
| E6 `7114:49683` | step 1 (pill + note), EN | 160 | html | scrollWidth ≤ clientWidth | no horizontal scroll | 160 ≤ 160 | match |
| E6 `7114:49683` | step 1 (pill + note), EN | 160 | page | clipped or off-screen | none | none | match |
| E6 `7114:49683` | step 1 (pill + note), EN | 160 | document | h1 count | 1 | 1 | match |
| E6 `7114:49683` | step 1 (pill + note), EN | 160 | “Discard changes” (footer) | focus ring: keyboard / pointer press | ring / none | `:focus-visible`, solid 4 px outline / no `:focus-visible`, outline none | match |
| E6 `7114:49683` | leave dialog, EN | 320 | html | scrollWidth ≤ clientWidth | no horizontal scroll | 320 ≤ 320 | match |
| E6 `7114:49683` | leave dialog, EN | 320 | open dialog | clipped or off-screen | none | none | match |
| E6 `7114:49683` | leave dialog, EN | 320 | document | h1 count | 1 | 1 | match |
| E6 `7114:49683` | leave dialog, EN | 320 | “Discard changes” | focus ring: keyboard / pointer press | ring / none | `:focus-visible`, solid 4 px outline / no `:focus-visible`, outline none | match |
| E6 `7114:49683` | leave dialog, EN | 160 | html | scrollWidth ≤ clientWidth | no horizontal scroll | 160 ≤ 160 | match |
| E6 `7114:49683` | leave dialog, EN | 160 | open dialog | clipped or off-screen | none | none | match |
| E6 `7114:49683` | leave dialog, EN | 160 | document | h1 count | 1 | 1 | match |
| E6 `7114:49683` | leave dialog, EN | 160 | “Discard changes” | focus ring: keyboard / pointer press | ring / none | `:focus-visible`, solid 4 px outline / no `:focus-visible`, outline none | match |
| E6 `7114:49683` | discard dialog, EN | 320 | html | scrollWidth ≤ clientWidth | no horizontal scroll | 320 ≤ 320 | match |
| E6 `7114:49683` | discard dialog, EN | 320 | open dialog | clipped or off-screen | none | none | match |
| E6 `7114:49683` | discard dialog, EN | 320 | document | h1 count | 1 | 1 | match |
| E6 `7114:49683` | discard dialog, EN | 320 | “Keep editing” | focus ring: keyboard / pointer press | ring / none | `:focus-visible`, solid 4 px outline / no `:focus-visible`, outline none | match |
| E6 `7114:49683` | discard dialog, EN | 160 | html | scrollWidth ≤ clientWidth | no horizontal scroll | 160 ≤ 160 | match |
| E6 `7114:49683` | discard dialog, EN | 160 | open dialog | clipped or off-screen | none | none | match |
| E6 `7114:49683` | discard dialog, EN | 160 | document | h1 count | 1 | 1 | match |
| E6 `7114:49683` | discard dialog, EN | 160 | “Keep editing” | focus ring: keyboard / pointer press | ring / none | `:focus-visible`, solid 4 px outline / no `:focus-visible`, outline none | match |
| E6 `7114:49683` | “Save changes?”, EN | 320 | html | scrollWidth ≤ clientWidth | no horizontal scroll | 320 ≤ 320 | match |
| E6 `7114:49683` | “Save changes?”, EN | 320 | open dialog | clipped or off-screen | none | none | match |
| E6 `7114:49683` | “Save changes?”, EN | 320 | document | h1 count | 1 | 1 | match |
| E6 `7114:49683` | “Save changes?”, EN | 320 | “Back to test” | focus ring: keyboard / pointer press | ring / none | `:focus-visible`, solid 4 px outline / no `:focus-visible`, outline none | match |
| E6 `7114:49683` | “Save changes?”, EN | 160 | html | scrollWidth ≤ clientWidth | no horizontal scroll | 160 ≤ 160 | match |
| E6 `7114:49683` | “Save changes?”, EN | 160 | open dialog | clipped or off-screen | none | none | match |
| E6 `7114:49683` | “Save changes?”, EN | 160 | document | h1 count | 1 | 1 | match |
| E6 `7114:49683` | “Save changes?”, EN | 160 | “Back to test” | focus ring: keyboard / pointer press | ring / none | `:focus-visible`, solid 4 px outline / no `:focus-visible`, outline none | match |
| E6 `7114:49683` | after saving (details), EN | 320 | html | scrollWidth ≤ clientWidth | no horizontal scroll | 320 ≤ 320 | match |
| E6 `7114:49683` | after saving (details), EN | 320 | page | clipped or off-screen | none | the header’s name cut (as above); the links’ URLs end in an ellipsis | match (§4.3 “the name at narrow widths”, T084; the URLs’ ellipsis is spec 008’s, U99 #7) |
| E6 `7114:49683` | after saving (details), EN | 320 | document | h1 count | 1 | 1 | match |
| E6 `7114:49683` | after saving (details), EN | 320 | “Edit connection” | focus ring: keyboard / pointer press | ring / none | `:focus-visible`, solid 4 px outline / no `:focus-visible`, outline none | match |
| E6 `7114:49683` | after saving (details), EN | 160 | html | scrollWidth ≤ clientWidth | no horizontal scroll | 160 ≤ 160 | match |
| E6 `7114:49683` | after saving (details), EN | 160 | page | clipped or off-screen | none | the links’ URLs end in an ellipsis | match (spec 008’s ellipsis, U99 #7) |
| E6 `7114:49683` | after saving (details), EN | 160 | document | h1 count | 1 | 1 | match |
| E6 `7114:49683` | after saving (details), EN | 160 | “Edit connection” | focus ring: keyboard / pointer press | ring / none | `:focus-visible`, solid 4 px outline / no `:focus-visible`, outline none | match |

#### T026: "Change start date" (`StartDateDialog.tsx`; S15; FR-003, FR-008, FR-009, FR-014, US1-AS7, US1-AS11; frames P12 `6396:48739`, the dialog `6396:48860`; F10, W1–W3, W8; Chromium via the `playwright-chrome` MCP, 1455 px window = 1440 CSS px body; connections `T026 live`, `T026 scheduled` (01.12.2026), `T026 narrow live` made through `POST /api/form-connections` from `P3 seed live`'s content; failures and the server's `invalid_start_date` made with `page.route()` in the browser, the backend untouched; screenshots in `.playwright-mcp/T026/` of the checkout, not committed)

| frame | state | width | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|---|
| 6396:48860 (U87) | active, opened | 1440 | dialog | width, radius | 480, radius 12 (KERN's dialog) | 480 wide, radius 12px | match |
| 6396:48860 | active, opened | 1440 | title | text, style | "Change start date", title/large 24/32 600 #0b1220, 32 in | same, 24px/32px 600 rgb(11, 18, 32), x 512 (480 + 32) | match |
| 6396:48860 | active, opened | 1440 | intro | text, style | "Choose when citizens can use this connection.", body/default 16/24 muted #4a5468 | same, 16px/24px 400 rgb(74, 84, 104), 416 × 24 at x 512 | match |
| 6396:48860 | active, opened | 1440 | "Now" radio | label, state | "Now (active since 23.10.2026, 14:32)", selected when it opens (FR-009; the frame draws "On a date" chosen) | "Now (active since 11.11.2026, 12:59)" (the connection's `activated_at` in the browser's zone), checked; radio 20 × 20 | match (FR-009) |
| 6396:48860 | active, opened | 1440 | group | label, indent | no visible label; the radios at the content's left edge | C2's "Active from" legend (112 wide, action blue) 16 in, the radios 24 right of it at x 664 | decision: C2 (the one "Active from" for S14, S15, S17; `ActiveFromChoice` isn't in T026's files) — UNCERTAIN 1 |
| 6396:48860 | active, On a date | 1440 | radios | arrangement | "Now" above "On a date", 16 apart | "Now" and "On a date" on two rows (the long "Now" label wraps C2's radio row), 32 apart (row 32) | decision: C2 — UNCERTAIN 1 |
| 6396:48860 | active, On a date | 1440 | date field | place, size | beside "On a date", 16 apart; 128 × 40, radius 8, 1 px #e1e6f0, placeholder "DD.MM.YYYY" | under the radios, 8 apart (x 664, y 468), 128 × 40, radius 8px, rgb(225, 230, 240), "DD.MM.YYYY", named "Start date (DD.MM.YYYY)" | decision: C2 ("a text field … under the radios"; U87 #16 notes the frame's inline field) — UNCERTAIN 1 |
| 6396:48860 | active, On a date | 1440 | hint | text | "Until that date, citizens can’t start a new request. Requests already started still finish." | "Until that date, citizens can’t start a new request. Requests in progress are cancelled." | F10 |
| 6396:48860 | active, On a date | 1440 | hint | style, place | body/small 14/24 muted, the content's width (416, 2 lines) | 14px/24px rgb(74, 84, 104), in C2's choice column (264 wide, 3 lines), the fieldset's description | decision: C2 — UNCERTAIN 1 |
| 6396:48860 | active, On a date | 1440 | dialog | height | 392 | 432 (On a date with the hint), 304 (Now) | follows the C2 rows above |
| 6396:48860 | any | 1440 | buttons | labels, size | "Cancel" secondary, "Save date" primary, 2 × 200 × 48, the footer's top line, 24 / 32 padding | same, 200 × 48 each, y 572 (Now) | match |
| 6396:48860 | active, On a date | 1440 | dialog, screenshot | comparison | title, ×, intro, ○ Now (active since …), ◉ On a date + field, hint, Cancel, Save date | same with C2's legend, the field under the radios, F10's hint (`live-now-1440.png`, `live-error-1440.png`) | match (C2, F10) |
| P12 6396:48739 | active, opened | 1440 | page | scrim, place | the details dimmed, the dialog centred over the Links card | native modal with the shared scrim, centred (480, 348) | match |
| P12 6396:48739 | active | 1440 | page behind | "Download PDF", Activity card | drawn | none | not built, F12 (Activity: T033) |
| — | scheduled, opened (`T026 scheduled`) | 1440 | radios, field | state | "On a date" with the stored date (W2, S15) | "On a date" checked, field "01.12.2026", radio "Now" plain, no hint; 480 × 320 (`scheduled-open-1440.png`) | match (S15, W2) |
| — | scheduled, "Now", "Save date" | 1440 | request, page | what it sends, what shows | active at once, the active band with "Active since <date>, <time>" (W2) | `PUT …/start-date` `{start_date: null}`; h1 "Your connection is active", pill "Active since 11.11.2026, 13:02"; toast "Start date saved." | match (W2, W3) |
| — | scheduled, another date | 1440 | request, page | moves the start (FR-008) | `{start_date: "2026-12-15"}` for "15.12.2026"; pill "Active from 15.12.2026, 00:00"; toast | match (FR-008) |
| — | scheduled, its own date | 1440 | request | nothing changes | 0 requests, the dialog closes, no toast | match (FR-009; UNCERTAIN 3) |
| — | active, "Now", "Save date" | 1440 | request | changes nothing, sends nothing (FR-009) | 0 requests, the dialog closes, no toast | match (FR-009; UNCERTAIN 3) |
| — | active, On a date, "Save date" | 1440 | request, page | scheduled for that day (FR-009, US1-AS11) | `{start_date: "2026-12-03"}`; h1 "Your connection is scheduled", pill "Active from 03.12.2026, 00:00", header pill "Scheduled · 03.12.2026"; toast "Start date saved." (`live-to-scheduled-1440.png`) | match (FR-009, W3) |
| — | saving | 1440 | buttons, radios | busy | the working state | "Saving…", `aria-disabled="true"`; radios and field disabled | match |
| — | after saving | 1440 | focus | where it goes | — | the ⋯ "Connection actions" (the dialog's native return), no ring after a click | match |
| W3 (U05 6720:39042) | after saving | 1440 | toast | text, place | "Start date saved.", success, as the other toasts | "Start date saved." in the shared success toast at the bottom centre, 6 s (C3) | match (W3) |
| P1c (W1) | the field's error | 1440 | behaviour | "Save date" with an empty field, 11.11.2026 (today), 10.11.2026, 31.02.2027, "abc" | the error state, nothing changed, the button enabled | each: "Enter a date after today." (`role="alert"`), the field `aria-invalid="true"`, red line rgb(196, 39, 28), the focus on the field; 0 `PUT …/start-date`; typing clears it | match (FR-003, W1) |
| P1c (W1) | the server's `400 invalid_start_date` | 1440 | behaviour | the day changed while the dialog was open | the field's error (W1) | the request rewritten to 2026-11-11 by `page.route()` + `route.fetch()`: `400 {error: 'invalid_start_date'}`; no alert, the field's error, the focus on the field, "3.12.2026" kept, "Save date"; the connection still live | match (FR-003, W1) |
| U79 6376:27178 (W8) | no answer (aborted) | 1440 | alert | text, kind | the slim alert, copy.md §2's sentence | slim danger alert (no body), "Couldn’t save the start date, so nothing has changed. Check your internet connection and try again.", `role="alert"`, 416 × 112, above the intro; "Try again" (`live-noanswer-1440.png`) | match (F2, W8) |
| U79 (W8) | `502` without the API's envelope | 1440 | alert | text | the no-answer sentence | the no-answer sentence | match (T024's choice, §4.2) |
| U79 (W8) | server failure (`500` with `error_id`) | 1440 | alert | kind, text | spec 008's alert with its error ID, slim, wrapping (F2) | one header, no body: the server's message, then "Error ID: <id>" on its own line, 416 × 112 (`live-server-1440.png`) | match (F2, W8) |
| — | `409 status_changed` | 1440 | alert | title, body | — | "Couldn’t save the start date" with the server's message as its body, 416 × 144 (`live-409-1440.png`) | match (copy.md §2's title; T024's 4xx look) |
| — | each failure | 1440 | "Try again" | what it sends | the same choice (W8) | abort, 500, 502, 409 in a row: each `PUT` carried `{start_date: "2026-12-03"}`; "On a date" and "3.12.2026" kept; the intro under the alert | match (FR-014, W8) |
| — | scrim, Escape | 1440 | dialog | closes | a scrim click closes it (S15) | closed by a scrim click and by Escape; 0 requests | match |
| — | German | 1440 | texts | words | glossary, copy.md §2 | "Startdatum ändern", "Wählen Sie, ab wann Bürgerinnen und Bürger diese Anbindung nutzen können.", "Aktiv ab", "Sofort (aktiv seit 11.11.2026, 13:02)", "Ab einem Datum", "Geben Sie ein Datum nach dem heutigen Tag ein.", copy.md's hint, "Abbrechen", "Datum speichern", "Erneut versuchen", no answer "Das Startdatum konnte nicht gespeichert werden, daher hat sich nichts geändert. Prüfen Sie …", "Fehler-ID: …", toast "Startdatum gespeichert.", band "Ihre Anbindung ist geplant", pill "Aktiv ab 03.12.2026, 00:00"; 0 clipped (`de-live-error-1440.png`, `de-server-1440.png`) | match (UNCERTAIN 4, 5) |
| — | keyboard | 1440 | radio, Cancel | focus ring | ring for keyboard focus | Shift+Tab from the field to the radio: `:focus-visible`, 3px; Tab to "Cancel": 4px | match |
| narrow | active Now, active On a date (hint), the field's error, scheduled opened, EN | 320 | page | horizontal scroll / h1 / off-screen / clipped | none / 1 / 0 / 0 | 305 ≤ 320 / 1 / 0 / 0 in each; dialog 273 wide; legend 83 × 24 over the radios; field 128 × 40 (126 = 126); buttons stacked 209 × 48 | match |
| narrow | no answer, server failure, EN | 320 | page, alert | scroll / h1 / off-screen / clipped | none / 1 / 0 / 0 | 305 ≤ 320 / 1 / 0 / 0; alert 209 × 208 in both; the dialog scrolls inside (602 high) | match |
| narrow | after saving with the toast, EN | 320 | page, toast | scroll / h1 / off-screen | none / 1 / 0 | 305 ≤ 320 / 1 / 0; toast 305 × 56 inside the window | match |
| narrow | active Now, active On a date (hint), the field's error, scheduled opened, EN | 160 | page | horizontal scroll / h1 / off-screen / clipped | none / 1 / 0 / 0 | 160 = 160 / 1 / 0 / 0 in each; dialog 113 wide; field 89 × 40 (87 = 87); "Save date" 89 × 64 | match |
| narrow | no answer, server failure, EN | 160 | alert | layout | the icon above the title, which takes the whole width (T024's `narrow:[&_.kern-title]:basis-full!`) | alert 89 × 552 (no answer) / 89 × 432 (server); scroll 160 = 160, 0 off-screen, 0 clipped | match (W16) |
| narrow | after saving with the toast, EN | 160 | page, toast | scroll / h1 / off-screen | none / 1 / 0 | 160 = 160 / 1 / 0; toast 145 × 80 inside the window (`saved-160.png`) | match |
| narrow | EN | 320, 160 | focus ring | after a press / after Tab | none / ring | a press on "Cancel": the focus back on the ⋯, `:focus-visible` false; Tab into the dialog: the checked radio, `:focus-visible` true, outline solid | match |

#### T027: the confirmations of a scheduled connection and "Activate again" with "Active from" (S17; FR-010–FR-014, US1-AS8, US1-AS10; frames the delete dialog `6872:45855` (`6872:45929`), P16b `7173:52874` (`7173:52959`); F11, F13, F35, W4, W5, W7, W8; Chromium via the `playwright-chrome` MCP, 1455 px window = 1440 CSS px body; fonts: `document.fonts.check('400 18px "Fira Sans"')`, `('600 24px "Fira Sans"')`, `('400 16px "Fira Sans"')` true; connections `T027 scheduled delete`, `T027 scheduled deactivate`, `T027 scheduled edit` (01.12.2026), `T027 reactivate now`, `T027 reactivate date`, `T027 reactivate fail`, `T027 reactivate de` made through `POST /api/form-connections` from `P3 seed live`'s content and deactivated through the API; failures, the slow call and the server's `invalid_start_date` made with `page.route()`, the backend untouched; screenshots in `.playwright-mcp/T027/` of the checkout, not committed)

| frame | state | width | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|---|
| `6872:45929` | delete, scheduled, overview row (en) | 1440 | dialog | size | 480 × 312 (two-line title) | 480 × 280 (one-line title "Delete “T027 scheduled delete”?"); de 480 × 312 with the two-line title | match |
| `6872:45929` | delete, scheduled, overview row (en) | 1440 | title | font, line height, colour | Fira Sans 600 24/32, #0b1220 | 600 24px/32px, rgb(11,18,32) | match |
| `6872:45929` | delete, scheduled, overview row (en) | 1440 | body | text | "This connection will be active from 01.12.2026. If you delete it, it won’t become active and its links won’t work." | same, line breaks as drawn (3 lines, 416 × 80 incl. baseline padding) | match |
| `6872:45929` | delete, scheduled, overview row (en) | 1440 | body | font | body/large 18/24, #0b1220; the date drawn monospaced | 18px/24px Fira Sans, rgb(11,18,32); the date in the text face with tabular figures | decided: the audit's cosmetic item 7 ("Use the dialog's text face") |
| `6872:45929` | delete, scheduled, overview row (en) | 1440 | buttons | labels, size, look | "Keep connection" secondary, "Delete connection" danger, 200 × 48 each, 16 apart | same: 200 × 48 at x 512 / 728; kern-btn--secondary / kern-btn--danger | match |
| `6872:45929` | delete, scheduled, overview row (en) | 1440 | scrim | closes | not annotated | a scrim click does not close it (FR-052a, unchanged) | match |
| `6872:45929` | delete, scheduled, details ⋯ (en) | 1440 | dialog | texts, size | as the row (FR-010) | same title, body, buttons, 480 × 280 | match |
| `6872:45929` | delete, scheduled, row and details (de) | 1440 | body | text | — | "Diese Anbindung ist ab 01.12.2026 aktiv. Wenn Sie sie löschen, wird sie nicht aktiv und ihre Links funktionieren nicht."; title „T027 scheduled delete“ löschen?, "Anbindung behalten" / "Anbindung löschen" | match |
| `6872:45929` | delete, active and deactivated (unit) | — | body | text | F35: the active and deactivated bodies stay | `deleteDialogCopyOf()` / `dialogCopyOf()` tests unchanged and passing | match |
| W5 (P15 `6417:31206`) | deactivate, scheduled (en) | 1440 | dialog | title, body, buttons | title and "Deactivate" as P15; copy.md §2 sentence; "Keep scheduled" | "Deactivate this connection?"; "This connection will be active from 01.12.2026. If you deactivate it, it won’t become active and its links won’t work. You can activate it again later."; "Keep scheduled" / "Deactivate"; 480 × 280 | W5, F11 |
| W5 | deactivate, scheduled (de) | 1440 | dialog | body, cancel | copy.md §2 | "Diese Anbindung ist ab 01.12.2026 aktiv. Wenn Sie sie deaktivieren, …"; "Geplant lassen"; 480 × 304 | W5 |
| W5 | deactivate, scheduled: after "Deactivate" | 1440 | page | band, pill, toast, focus | F13: "Connection deactivated." without "Undo" | band "Connection deactivated", pill "Deactivated since 11.11.2026, 13:31", toast "Connection deactivated.", no "Undo", focus on the ⋯ (no ring after the click) | F13 |
| W5 | deactivate, active (unit) | — | dialog | body, cancel | F11: spec 008 body and "Keep active" | `dialogCopyOf()` test: unchanged | F11 |
| `7173:52959` | reactivate, "Now" (en) | 1440 | dialog | size | 600 × 419 (metadata: header 64, body 251, footer 104) | 600 × 419 (header 64, body 251, footer 104) | match |
| `7173:52959` | reactivate, "Now" (en) | 1440 | intro | text, font, colour | "Check the summary below. …" body/default 16/24 muted #4a5468, 2 lines | same text, 536 × 48, muted | match |
| `7173:52959` | reactivate, "Now" (en) | 1440 | summary | table | border decorative #e1e6f0, radius 8, Documents / Rules labels 112 px action blue, 536 × 107 for 2 + 1 lines | 536 × 107, labels in action blue (unchanged component) | match |
| `7173:52959` | reactivate, "Now" (en) | 1440 | "Active from" | legend, radios | legend 600 16 action blue, 112 wide, 16 px indent, 24 gap; radios 20 px, "Now" selected, "On a date"; row 32 high, 16 below the table | legend at x 468 (16 indent) 112 × 32, rgb(29,86,240) 600 16px; radios 20 × 20 at x 604 / 683.6, "Now" checked; fieldset 32 high, 16 below the table | match |
| `7173:52959` | reactivate, "Now" (en) | 1440 | buttons | labels, size | "Cancel" secondary, "Activate" primary, 260 × 48 | "Cancel" / "Activate", 260 × 48 each | match |
| `7173:52959` | reactivate, "Now" (en) | 1440 | focus | on open | — | the × (no ring after the click); Tab reaches the radio with a ring | match |
| `7173:52959` | reactivate, "Now": after "Activate" | 1440 | page | band, toast, focus | as today | band "Your connection is active", pill "Active since 11.11.2026, 13:32", toast "Connection reactivated.", focus on the h1; request body `{}` | match |
| W4 on `7173:52959` | reactivate, "On a date" (en) | 1440 | "Active from" | field, hint | field under the radios as P1b; copy.md §2 hint | field 128 × 40 under the radios, placeholder "DD.MM.YYYY", name "Start date (DD.MM.YYYY)"; hint "The connection becomes active again on the date you choose. Until then, its links don’t work." 14/24 muted, linked by aria-describedby; dialog 600 × 523 | W4; design-notes §1 (C2 as P1 draws it) |
| W4 | reactivate, "On a date" (en) | 1440 | confirm button | label | "Schedule" | "Schedule" | W4 |
| W4 / W1 | reactivate, field error (empty field) (en) | 1440 | field | error | P1c: red field, "Enter a date after today." under it, announced | aria-invalid, "Enter a date after today." with role="alert", focus moved to the field (ring: a text field matches :focus-visible), button stays enabled; dialog 600 × 555 | W1 |
| W4 / W1 | reactivate, field error cleared | 1440 | field | error | clears on typing | error gone after typing 01.12.2026 | W1 |
| W4 / W1 | reactivate, server `400 invalid_start_date` (page.route) (en, de) | 1440 | field | error | same as the field error | field error, focus on the field, no alert, button back to "Schedule" / "Planen" | W1 |
| W4 | reactivate, "Scheduling…" (en) | 1440 | buttons, radios, field | busy | copy.md §2 "Scheduling…" | "Scheduling…" aria-disabled, "Cancel" aria-disabled, radios and field disabled | W4 |
| W4 | reactivate, after "Schedule" (en) | 1440 | page | band, pill, toast, focus, links | scheduled details (S15) and "Connection scheduled for <date>." | band "Your connection is scheduled", pill "Active from 01.12.2026, 00:00", header pill "Scheduled · 01.12.2026", toast "Connection scheduled for 01.12.2026.", focus on the h1; copy buttons enabled; request body `{"start_date":"2026-12-01"}` | W4 |
| W8 on `7173:52959` | reactivate failure, no answer (aborted) (en) | 1440 | alert | text, look | as T026: slim alert with the no-answer sentence above the intro | slim danger alert (no body) role=alert, "Couldn’t reactivate, so nothing has changed. Check your internet connection and try again.", intro under it, "Try again" | W8; UNCERTAIN 2 |
| W8 | reactivate failure, `500` with error ID (en) | 1440 | alert | text, look | slim alert, server message and error ID | slim alert "Something went wrong on the server. / Error ID: a1b2…d6", choice "On a date" and 01.12.2026 kept | W8 |
| W8 | reactivate failure, `409 status_changed` (en) | 1440 | alert | text, look | "Couldn’t reactivate" with the server message | KernAlert title "Couldn’t reactivate", body the server message | W8 |
| W8 | reactivate failures (de) | 1440 | alert | text | — | "Die Anbindung konnte nicht reaktiviert werden, daher hat sich nichts geändert. …", "Fehler-ID: …", title "Die Anbindung konnte nicht reaktiviert werden", "Erneut versuchen" | W8 |
| W8 | reactivate failure: "Try again" | 1440 | request | body | repeats the choice (FR-014) | `{}` after "Now", `{"start_date":"2026-12-01"}` after "On a date", each retry the same | match |
| W8 | reactivate failure: closed | 1440 | connection | state | unchanged (FR-014) | API: deactivated, start_date null; band "Connection deactivated"; focus back on "Activate again" | match |
| W7 | edit entry, scheduled, details (en) | 1440 | dialog | title, body | "Edit this scheduled connection?"; "Your changes only take effect when you save them. Saved changes become active on <date>." | same with 01.12.2026; 480 × 256; "Cancel" / "Edit connection" | W7 |
| W7 | edit entry, scheduled, details (de) | 1440 | dialog | title, body | — | "Diese geplante Anbindung bearbeiten?"; "Ihre Änderungen werden erst wirksam, wenn Sie sie speichern. Gespeicherte Änderungen werden am 01.12.2026 aktiv." | W7 |
| W7 (U15 `6699:47905`) | edit entry, scheduled, overview row (en, de) | 1440 | dialog | title, body | the row’s "Edit “<name>”?" stays | "Edit “T027 scheduled edit”?" / „T027 scheduled edit“ bearbeiten? with the existing body | W7 |
| S15 | links of a scheduled connection | 1440 | copy buttons | enabled | enabled (FR-007) | scheduled and live: enabled, opacity 1; deactivated: aria-disabled, 0.68 — `ConnectionLinks` reads `state`, `linksViewOf()` removed | match |
| S15 | "Change start date" after a reactivation refusal | 1440 | focus | on open | the dialog’s own first focus | the × (not the date field): the refusals counter is followed while a dialog is closed | match |
| narrow | delete, scheduled, overview row (en) | 320 | page / dialog | h-scroll, clipped, off-screen, h1, focus | none, none, none, 1, ring on keyboard only | scrollWidth 305/clientWidth 320; 0 clipped; 0 off-screen; 1 h1; after the click no ring on the ×; after Tab the ring | match |
| narrow | delete, scheduled, details (en) | 320 | page / dialog | h-scroll, clipped, off-screen, h1, focus | none, none, none, 1, ring on keyboard only | scrollWidth 305/clientWidth 320; 0 clipped; 0 off-screen; 1 h1; after the click no ring on the ×; after Tab the ring | match |
| narrow | deactivate, scheduled (en) | 320 | page / dialog | h-scroll, clipped, off-screen, h1, focus | none, none, none, 1, ring on keyboard only | scrollWidth 305/clientWidth 320; 0 clipped; 0 off-screen; 1 h1; after the click no ring on the ×; after Tab the ring | match |
| narrow | edit entry, scheduled (en) | 320 | page / dialog | h-scroll, clipped, off-screen, h1, focus | none, none, none, 1, ring on keyboard only | scrollWidth 305/clientWidth 320; 0 clipped; 0 off-screen; 1 h1; after the click no ring on the ×; after Tab the ring | match |
| narrow | reactivate, "Now" (en) | 320 | page / dialog | h-scroll, clipped, off-screen, h1, focus | none, none, none, 1, ring on keyboard only | scrollWidth 305/clientWidth 320; 0 clipped; 0 off-screen; 1 h1; after the click no ring on the ×; after Tab the ring | match |
| narrow | reactivate, "On a date" (en) | 320 | page / dialog | h-scroll, clipped, off-screen, h1, focus | none, none, none, 1, ring on keyboard only | scrollWidth 305/clientWidth 320; 0 clipped; 0 off-screen; 1 h1; focus on the confirm button, no ring after the click | match |
| narrow | reactivate, field error (en) | 320 | page / dialog | h-scroll, clipped, off-screen, h1, focus | none, none, none, 1, ring on keyboard only | scrollWidth 305/clientWidth 320; 0 clipped; 0 off-screen; 1 h1; focus on the field (text field ring) | match |
| narrow | reactivate, failure no answer (en) | 320 | page / dialog | h-scroll, clipped, off-screen, h1, focus | none, none, none, 1, ring on keyboard only | scrollWidth 305/clientWidth 320; 0 clipped; 0 off-screen; 1 h1; focus on the confirm button, no ring after the click | match |
| narrow | reactivate, failure 500 (en) | 320 | page / dialog | h-scroll, clipped, off-screen, h1, focus | none, none, none, 1, ring on keyboard only | scrollWidth 305/clientWidth 320; 0 clipped; 0 off-screen; 1 h1; focus on the confirm button, no ring after the click | match |
| narrow | reactivate, "Scheduling…" (en) | 320 | page / dialog | h-scroll, clipped, off-screen, h1, focus | none, none, none, 1, ring on keyboard only | scrollWidth 305/clientWidth 320; 0 clipped; 0 off-screen; 1 h1; focus on the confirm button, no ring after the click | match |
| narrow | scheduled details with the toast (en) | 320 | page / dialog | h-scroll, clipped, off-screen, h1, focus | none, none, none, 1, ring on keyboard only | scrollWidth 305/clientWidth 320; 0 clipped; 0 off-screen; 1 h1; focus on the h1, no ring | match |
| narrow | delete, scheduled, overview row (en) | 160 | page / dialog | h-scroll, clipped, off-screen, h1, focus | none, none, none, 1, ring on keyboard only | scrollWidth 160/clientWidth 160; 0 clipped; 0 off-screen; 1 h1; after the click no ring on the ×; after Tab the ring | match |
| narrow | delete, scheduled, details (en) | 160 | page / dialog | h-scroll, clipped, off-screen, h1, focus | none, none, none, 1, ring on keyboard only | scrollWidth 160/clientWidth 160; 0 clipped; 0 off-screen; 1 h1; after the click no ring on the ×; after Tab the ring | match |
| narrow | deactivate, scheduled (en) | 160 | page / dialog | h-scroll, clipped, off-screen, h1, focus | none, none, none, 1, ring on keyboard only | scrollWidth 160/clientWidth 160; 0 clipped; 0 off-screen; 1 h1; after the click no ring on the ×; after Tab the ring | match |
| narrow | edit entry, scheduled (en) | 160 | page / dialog | h-scroll, clipped, off-screen, h1, focus | none, none, none, 1, ring on keyboard only | scrollWidth 160/clientWidth 160; 0 clipped; 0 off-screen; 1 h1; after the click no ring on the ×; after Tab the ring | match |
| narrow | reactivate, "Now" (en) | 160 | page / dialog | h-scroll, clipped, off-screen, h1, focus | none, none, none, 1, ring on keyboard only | scrollWidth 160/clientWidth 160; 0 clipped; 0 off-screen; 1 h1; after the click no ring on the ×; after Tab the ring | match |
| narrow | reactivate, "On a date" (en) | 160 | page / dialog | h-scroll, clipped, off-screen, h1, focus | none, none, none, 1, ring on keyboard only | scrollWidth 160/clientWidth 160; 0 clipped; 0 off-screen; 1 h1; focus on the confirm button, no ring after the click | match |
| narrow | reactivate, field error (en) | 160 | page / dialog | h-scroll, clipped, off-screen, h1, focus | none, none, none, 1, ring on keyboard only | scrollWidth 160/clientWidth 160; 0 clipped; 0 off-screen; 1 h1; focus on the field (text field ring) | match |
| narrow | reactivate, failure no answer (en) | 160 | page / dialog | h-scroll, clipped, off-screen, h1, focus | none, none, none, 1, ring on keyboard only | scrollWidth 160/clientWidth 160; 0 clipped; 0 off-screen; 1 h1; focus on the confirm button, no ring after the click | match |
| narrow | reactivate, failure 500 (en) | 160 | page / dialog | h-scroll, clipped, off-screen, h1, focus | none, none, none, 1, ring on keyboard only | scrollWidth 160/clientWidth 160; 0 clipped; 0 off-screen; 1 h1; focus on the confirm button, no ring after the click | match |
| narrow | reactivate, "Scheduling…" (en) | 160 | page / dialog | h-scroll, clipped, off-screen, h1, focus | none, none, none, 1, ring on keyboard only | scrollWidth 160/clientWidth 160; 0 clipped; 0 off-screen; 1 h1; focus on the confirm button, no ring after the click | match |
| narrow | scheduled details with the toast (en) | 160 | page / dialog | h-scroll, clipped, off-screen, h1, focus | none, none, none, 1, ring on keyboard only | scrollWidth 160/clientWidth 160; 0 clipped; 0 off-screen; 1 h1; focus on the h1, no ring | match |

#### T032 and T033: the activity's sentences and the Activity card (S15 "The Activity card", S16; FR-022–FR-025, FR-027, FR-031, FR-032, US3-AS1–AS3; frames P10 `6396:48278` (rows `6396:48527`), scheduled `7246:53937` (rows `7246:54525`), deactivated `7246:56374` (rows `7246:56965`), closed `6809:46582`; W10, W16; Chromium via the `playwright-chrome` MCP, 1455 px window = 1440 CSS px body, browser zone UTC; fonts: `document.fonts.check('600 16px "Fira Sans"')`, `('400 14px "Fira Sans"')`, `('600 14px "Fira Sans"')` true; the card mounted for the check after the Summary of `ConnectionDetails.tsx` with its own open state (Summary's toggle untouched), the mount removed before the gates; connections `T033 open` (66 entries: the frame's five, then 60 seeded over every kind and person form, then "Created"), `T033 scheduled`, `T033 deactivated`, `T033 none`, `T033 agent`, `T033 approved` made through `POST /api/form-connections` from `P3 seed live`'s content, their `connection_activity` rows replaced with `psql` (seed in `<scratchpad>/T033/seed.py`, only data-model §2.2's kinds), the times written in UTC so that they read as the frames' in the browser's zone; loading, failures and no answer made with `page.route()`; the narrow rows by `.playwright-mcp/T033/narrow.js`; screenshots in `.playwright-mcp/T033/`, not committed)

| frame | state | width | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|---|
| 6809:46582 | closed (`T033 open`) | 1440 | card | size, place | 832 × 102, 16 under the Summary | 832 × 102 at 304, 540 (Summary 422 + 102 + 16) | match |
| 6809:46582 | closed | 1440 | card | border / radius / fill | 1 px `decorative-border-default` #e1e6f0 / 12 / white | 1px rgb(225, 230, 240) / 12px / oklch(1 0 0) (`DetailAccordion`) | match |
| 6809:46583 | closed | 1440 | header | padding / gap | 24 / 8 | 24px / 8px | match |
| 6809:46585 | closed | 1440 | title | text, style | "Activity", title/small Fira Sans SemiBold 16/24 #0b1220 | "Activity", 600 16px/24px rgb(11, 18, 32), at 329, 565 | match |
| 6809:46586 | closed | 1440 | line | text, style, place | "Last edited by Laura Weber · 23.10.2026, 14:32", body/small 14/24 #4a5468, 4 under the title | same text, 400 14px/24px rgb(74, 84, 104), y 593 (565 + 24 + 4) | match |
| 6809:46588 | closed | 1440 | toggle | text, style, box | "View activity" label/small #1d56f0, 40 high visible, expand_more 20 | "View activity" 600 14px rgb(29, 86, 240), 132.6 × 40 at 978.4, 571, `expand-more-action-small.svg` 20 × 20, `aria-expanded="false"` | match |
| 6809:46582 | closed | 1440 | card, screenshot | comparison | title, line, toggle | same (`closed-1440.png`) | match |
| 6396:48520 | open (`T033 open`) | 1440 | card | border | `action-default` #1d56f0 | rgb(29, 86, 240) | match |
| 6396:48526 | open | 1440 | toggle | text, glyph | "Hide activity", expand_more | "Hide activity", expand_less | match (`DetailAccordion`'s toggle as built for Links and Summary, spec 008 T078) |
| 6396:48524 | open | 1440 | line | presence | kept under the title | kept | match |
| 6396:48527 | open | 1440 | list body | padding | 0 24 16 | 0px 24px 16px | match |
| 6396:48528 | open | 1440 | entry | box, padding, gap | 782 × 40 at 24, 0; 8 above and below; 16 | 782 × 40 at 329, 641; 8px / 8px; 16px | match |
| 6396:48529 | open | 1440 | date and time | text, style, box | "23.10.2026, 14:32", body/small 14/24 #4a5468, tnum/zero, 160 × 24 | "23.10.2026, 14:32", 400 14px/24px rgb(74, 84, 104), tabular-nums slashed-zero, 160 × 24 (`<time>`) | match |
| 6396:48530 | open | 1440 | event | text, style, box | "Published", label/small SemiBold, x 176, 510 wide | "Published", 600 14px/24px rgb(74, 84, 104), x 505 (329 + 176), 510.5 wide | match |
| 6396:48531 | open | 1440 | person | text, style, box | "Laura Weber", body/small, right, x 702, 80 wide | "Laura Weber", 400 14px, text-align right, x 1031.5 (329 + 702.5), 79.5 wide | match |
| 6396:48527 | open | 1440 | rows | order, texts | Published / Rules changed in Ambulance / Variant added: Ambulance / Documents changed / Created, newest first | the same five, newest first, then the seeded older entries | match |
| 6396:48527 | open | 1440 | list | height | 5 rows, 216 with the padding | 400 (ten rows) of 2000, scrolling inside the card (`max-h-400`); the card 518 high | match (S15: the list scrolls inside the card; 400 px, UNCERTAIN 3) |
| 6396:48520 | open | 1440 | card, screenshot | comparison | the frame's card with five rows | same layout, ten rows visible (`open-1440.png`) | match |
| 6396:48278 | open | 1440 | Links card beside the open Activity | layout | Links expanded with Activity | not built here: one card open at a time is T034's | match (FR-022, Clarification #34; T034) |
| 7246:54525 | scheduled (`T033 scheduled`) | 1440 | rows | texts, style | five rows from "Published" 23.10.2026, 14:32 | "Scheduled for 01.12.2026" above "Published" (same instant, position 1), then the frame's five; rows as 6396:48527 | match (W10: the scheduling entry with its date, U95 #14) |
| 7246:54519 | scheduled | 1440 | line | text | "Last edited by Laura Weber · 23.10.2026, 14:32" | same | match |
| 7246:53937 | scheduled | 1440 | card, screenshot | comparison | the frame's card | same with the sixth row (`scheduled-open-1440.png`) | match (W10) |
| 7246:56965 | deactivated (`T033 deactivated`) | 1440 | rows | texts | "Deactivated" 24.10.2026, 10:05 Laura Weber, then the five | same six rows | match |
| 7246:56962 | deactivated | 1440 | line | text | "Deactivated by Laura Weber · 24.10.2026, 10:05" | same | match (FR-024, US3-AS3) |
| 7246:56374 | deactivated | 1440 | card | size, screenshot | 832 × 358 (100 + 256 + 2) | 832 × 358 (`deactivated-open-1440.png`) | match |
| W10 | closed, agent's change (`T033 agent`) | 1440 | line | text | "Last edited by <name> with <agent> · …" | "Last edited by Laura Weber with Claude Code · 23.10.2026, 14:32" | match (FR-027) |
| W10 | closed, approved (`T033 approved`) | 1440 | line | text | "<name>, asked by <agent>" | "Last edited by Jonas Brandt, asked by Claude Code · 23.10.2026, 14:32" | match (FR-027) |
| W10 | closed, no person (`T033 none`) | 1440 | line | text | "Last edited · <date>, <time>" | "Last edited · 12.09.2026, 08:00" | match (FR-032) |
| W10 | closed, all five, German | 1440 | line, title, toggle | text | copy.md §3 | "Aktivität", "Aktivität ansehen"; "Zuletzt bearbeitet von Laura Weber mit Claude Code · …", "Zuletzt bearbeitet von Jonas Brandt, angefragt von Claude Code · …", "Zuletzt bearbeitet · 12.09.2026, 08:00", "Deaktiviert von Laura Weber · 24.10.2026, 10:05", "Zuletzt bearbeitet von Laura Weber · …" | match |
| W10 | loaded, every kind and person form | 1440 | rows | texts, EN and DE | copy.md §3 | "Name changed" / "Description changed" / "Variant removed: Taxi" / "Variant renamed: School transport" / "Rules changed in Standard" / "Scheduled for 01.12.2026" / "Start date changed to 15.01.2027" / "Start date changed to now" / "Became active" (no person) / "Deactivated" / "Activated again" / "Deleted" / "Restored"; persons "Jonas Brandt with Claude Code", "Laura Weber, asked by Claude Desktop", none; German "Startdatum auf den 15.01.2027 geändert", "Aktiv geworden", "Wieder aktiviert", "Jonas Brandt mit Claude Code", "…, angefragt von Claude Desktop" | match |
| W10 | loading (1.5 s held) | 1440 | status | text, place, style | "Loading activity…" in the card, announced | "Loading activity…" in the card's `role="status"` paragraph at 329, 641, 782 × 40, 14/24 muted; "Hide activity", blue border; no list | match (UNCERTAIN 4: a text line, no spinner) |
| W10 | loading more (1.5 s held) | 1440 | status | text, place | "Loading earlier activity…" | under the 50 entries at 329, 931 (list bottom + 0), announced in the same status; request `?cursor=` | match |
| R15 V6 | loaded | 1440 | next page | trigger | the list's end in view, the list as root | the wheel over the list scrolled it to 1600; the `IntersectionObserver` on the last row with `root: list` asked for the next page; 50 → 66 entries | match |
| W10 | end reached | 1440 | list | last entry, further loads | down to the oldest | 66 entries, the last "18.10.2026, 05:00 · Created", scrolled to the end; no further request, the status empty | match (US3, EC-10) |
| R15 V6 | loaded | 1440 | list | keyboard | takes the focus, scrolls with the keyboard | Tab from "Hide activity" focuses the `ol` "Activity, newest first" (`tabIndex` 0); `End` ×12 scrolled to the end and loaded the second page (66) | match |
| R15 V6 | loaded | 1440 | list | focus ring after Tab / after a click | ring / none | `:focus-visible` true, solid 4px offset 2px / after a click false, outline none | match (KERN's `[tabindex]` rules overridden with `!`, as `PersonaChip`) |
| W10 | failed, `500` with an error ID | 1440 | failure | content | "Couldn’t load the activity" with "Try again" | KERN danger alert (`role="alert"`) "Couldn’t load the activity", the server's message and "Error ID: …", "Try again" (secondary) under it; no list (`failed-1440.png`) | match |
| W10 | failed, no answer (aborted) | 1440 | failure | text | the fallback | "Couldn’t load the activity" with "Check your connection and try again." | match (UNCERTAIN 5) |
| W10 | failed, "Try again" | 1440 | retry | effect | the page again | first page: 50 entries; an older page that failed kept the 50 and the alert under them (`more-failed-1440.png`), "Try again" loaded it: 66 | match |
| FR-022 | loaded, then "Deactivate" on the page (`T033 agent`) | 1440 | reload | effect | the card reloads after an action changed the connection | the answer's `updated_at` as `reloadKey`: a second request, the first row "11.11.2026, 14:41 · Deactivated · p10-alice", the line "Deactivated by p10-alice · 11.11.2026, 14:41", the card still open | match |
| FR-029 | all | 1440 | console | entries, names, dates | never logged | no `console.*` in `ActivityCard.tsx`, `ActivityRow.tsx`, `utils.ts`; the console holds only React's DevTools note and the browser's own lines for the routed `500`s | match |
| narrow | closed, loading, loaded, loading more, end, failed, EN | 320 | page | horizontal scroll / h1 count | none / 1 | scrollWidth 305 ≤ clientWidth 320 / 1 in each | match |
| narrow | closed, loading, loaded, loading more, end, failed, EN | 320 | card | off-screen / clipped | 0 / none | card 16–289; 0 elements outside 0–320; no text box wider than its box; the list's scrollWidth 223 = clientWidth | match |
| narrow | loaded, loading more, end, EN | 320 | entry | the three parts | stacked (W16) | `flex-direction: column`: date 41, 747; event 41, 771; person 41, 795; each 223 wide (`loaded-320.png`) | match (stacked from below `sm`, UNCERTAIN 2) |
| narrow | loaded | 320 | list | focus ring after Tab / after a click | ring / none | true, solid 4px / false, none | match |
| narrow | closed, loading, loaded, loading more, end, failed, EN | 160 | page | horizontal scroll / h1 count | none / 1 | scrollWidth 160 = clientWidth / 1 in each | match |
| narrow | closed, loading, loaded, loading more, end, failed, EN | 160 | card | off-screen / clipped | 0 / none | card 8–137; 0 outside in five states; no text box wider than its box; list 103 = 103 | match |
| narrow | failed | 160 | card | off-screen | 0 | after Playwright's clicks `html.scrollLeft` read 15 with scrollWidth 160 = clientWidth (the tool scrolling into view); opened by script clicks, scrollLeft stayed 0 and no element lay outside 0–160; the alert's title wraps under its icon (`failed-160.png`) | match |
| narrow | loaded | 160 | entry | the three parts | stacked | date 21, 675, 103 × 48 (two lines), event 21, 723, person 21, 747 (`loaded-160.png`) | match (W16) |
| narrow | loaded | 160 | list | focus ring after Tab / after a click | ring / none | true, solid 4px / false, none | match |
| narrow | failed, no answer | 320, 160 | failure | text | the fallback | "Couldn’t load the activity" / "Check your connection and try again." | match |

#### T034: Links, Summary and Activity as one accordion on every details page (S15 "The three cards", S16; FR-022, US3-AS1, US3-AS2; frames V-Active A `7246:51510` (column `7246:51515`, Links `7246:51546`, Summary `7246:52082`, Activity `7246:52089`), the draft's details `7362:54691` (Links `7362:54905`, Activity `7362:54912`); F31, F40; Chromium via the `playwright-chrome` MCP, 1455 px window = 1440 CSS px body; fonts: `document.fonts.check('600 16px "Fira Sans"')`, `('400 14px "Fira Sans"')`, `('600 14px "Fira Sans"')` true; connections made through the API in `template_db_010_p5`: `T034 live`, `T034 status`, `T034 date`, `T034 saved`, `T034 scheduled` (`POST /api/form-connections` from `T033 approved`'s content), drafts `T034 draft`, `T034 publish`, `T034 publish 2`, `T034 schedule at publish` (`POST /api/form-connections/drafts`; the last three published through the UI); the arrivals reached through the real flows (the editor's "Publish without rules" → "Publish connection" / "On a date" → "Schedule", the details' "Edit connection" → the edit flow's "Save" → "Save", the overview's search and row link); the `/activity` requests and the actions' answers counted with `page.on('request' / 'response')`; the narrow rows by `.playwright-mcp/T034/narrow.js` (viewport 320 and 160, overflow by `scrollWidth` and element boxes, not `scrollLeft`); screenshots in `.playwright-mcp/T034/`, not committed)

| frame | state | width | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|---|
| 7246:51510 | frame | 1440 | frame | changed since the audit | U92's inventory: band, Links closed, Summary closed with "Download PDF", Activity open with five rows | the same nodes and texts (`get_metadata` 7246:51515, `get_screenshot` 7246:51510) | match |
| 7362:54691 | frame | 1440 | frame | changed since the audit | U93's inventory: band, Summary open, Links "not created yet", Activity closed, footer "Edit connection" | the same (`get_screenshot` 7362:54691, `get_metadata` 7362:54905 / 7362:54912) | match |
| 7246:51515 | Activity opened (`T034 publish`) | 1440 | column | order | band, Links, Summary, Activity | band, Links, Summary, Activity (`ConnectionDetails.tsx`) | match (FR-022) |
| 7246:51546 | Activity opened | 1440 | Links card | place, size | y 208 in the column, 832 × 102 | y 304 − 96 = 208, 832 × 102 | match |
| 7246:51552 | Activity opened | 1440 | Links toggle | text, state | "View links", expand_more | "View links", `expand-more-action-small.svg`, `aria-expanded="false"` | match (F40) |
| 7246:51546 | Activity opened | 1440 | Links card | border / radius | 1 px #e1e6f0 / 12 | 1px rgb(225, 230, 240) / 12px | match |
| 7246:52082 | Activity opened | 1440 | Summary card | place, size, toggle | y 326, 832 × 102, "View summary" | y 422 − 96 = 326, 832 × 102, "View summary" `aria-expanded="false"` | match |
| 7246:52087 | Activity opened | 1440 | Summary card | "Download PDF" | drawn | none | not built, F12 |
| 7246:52089 | Activity opened | 1440 | Activity card | place | y 444 (326 + 102 + 16) | y 540 − 96 = 444 | match |
| 7246:52089 | Activity opened | 1440 | Activity card | border / height | #1d56f0 / 318 = 100 + 2 + 5 × 40 + 16 | rgb(29, 86, 240) / 198 = 100 + 2 + 2 × 40 + 16 (two entries: "Published", "Created") | match (height by entries, T033's rows) |
| 7246:52095 | Activity opened | 1440 | Activity toggle | text, glyph | "Hide activity", expand_more | "Hide activity", expand_less | match (design-notes §4.2 T032/T033 (7)) |
| 7246:52093 | Activity opened | 1440 | Activity line | text | "Last edited by <person> · <date>, <time>" | "Last edited by p10-alice · 11.11.2026, 14:55" | match |
| 7246:51510 | Activity opened | 1440 | page, screenshot | comparison | band, Links and Summary closed, Activity open | the same without "Download PDF" (`activity-open-1440.png`) | match (F12) |
| 7246:51510 | Activity opened | 1440 | fonts | check | Fira Sans 600 16, 400 14, 600 14 | true, true, true | match |
| F40 (P7 U80 6396:47708) | after publishing (`T034 publish`, the editor's "Publish connection") | 1440 | cards | open state | Links open, Summary and Activity closed | "Hide links" `true`, "View summary" `false`, "View activity" `false`; Links 832 × 359 with the blue border; the focus on the h1 "Your connection is active" (`published-links-1440.png`) | match (FR-022) |
| F40 | after publishing | 1440 | cards | opening Activity | Links closes, its control "View links" | "View links" `false`, "View summary" `false`, "Hide activity" `true` | match (F40) |
| S15 "Arriving after Schedule" | after "Schedule" at publishing (`T034 schedule at publish`, 18.12.2026) | 1440 | cards | open state | as after publishing, Links open | "Hide links" `true`, "View summary" `false`, "View activity" `false`; the focus on the h1 "Your connection is scheduled" | match |
| F40 (E4 U99 6730:39754) | after the edit flow's "Save" (`T034 saved`, description changed) | 1440 | cards | open state | Links open | "Hide links" `true`, "View summary" `false`, "View activity" `false`, the toast "Changes saved." (`saved-links-1440.png`) | match (FR-022; the changed expectation of `initialAccordionOf('saved')`, carried from T028) |
| F40 | after "Save" | 1440 | cards | opening Activity | Links closes | "View links" `false`, "View summary" `false`, "Hide activity" `true`; rows "Description changed", "Published", "Created" | match |
| U91 7203:50843 | opened from the overview (`T034 live`: search, the row's link) | 1440 | cards | open state | Summary open, as today | "View links" `false`, "Hide summary" `true`, "View activity" `false`; Activity at y 944 under the 506 high Summary | match (spec 008 FR-046) |
| U94 7246:52715 | opened directly (`T034 scheduled`) | 1440 | cards | open state | Summary open | "View links" `false`, "Hide summary" `true`, "View activity" `false` | match |
| FR-022 | one card at a time (`T034 publish`) | 1440 | toggles | sequence | at most one open | View summary → Summary only; View links → Links only; Hide links → none; View activity → Activity only; View summary → Summary only | match (`toggleAccordion()`) |
| FR-022 | Activity open, "Deactivate" (`T034 status`) | 1440 | Activity card | reload | the card reloads after an action changed the connection | `updated_at` 14:53 → 14:58:22.84; one new `/activity` request; first row "11.11.2026, 14:58 · Deactivated · p10-alice", the line "Deactivated by p10-alice · 11.11.2026, 14:58", the card still open (`deactivated-activity-reloaded-1440.png`) | match |
| FR-022 | Activity open, "Activate again" on a date (15.12.2026) | 1440 | Activity card | reload | reloads | `updated_at` → 14:58:46.36, state `scheduled`; one new request; first row "Scheduled for 15.12.2026" | match |
| FR-022 | Activity open, "Change start date" to 20.12.2026 (scheduled) | 1440 | Activity card | reload | reloads | `updated_at` → 14:59:00.59; one new request; first row "Start date changed to 20.12.2026" | match |
| FR-022 | Activity open, "Change start date" with "Now" (scheduled) | 1440 | Activity card | reload | reloads | `updated_at` → 14:59:02.77, state `live`; one new request; first row "Start date changed to now" (the server folded the 20.12.2026 change into it: 5 entries) | match (the server's entries) |
| FR-022 | Activity open, "Deactivate", then "Activate again" with "Now" | 1440 | Activity card | reload | reloads | `updated_at` → 14:59:22.48, then 14:59:23.77; one new request after "Activate"; first row "Activated again", 7 rows | match |
| FR-022 | Activity loaded, then closed by "View summary"; "Change start date" 10.12.2026 on a live connection (`T034 date`) | 1440 | Activity card | reload while closed | loads again on the next opening | no request while closed; `updated_at` → 14:59:37.42, state `scheduled`; "View activity" sent one request, first row "Scheduled for 10.12.2026" (before: "Published") | match (T033's `reloadKey`) |
| FR-029 | all | 1440 | console | entries, names, dates | never logged | only React's DevTools note | match |
| 7362:54691 | draft opened (`T034 draft`) | 1440 | column | order | band, Summary (open), Links (static), Activity (closed) | band, Summary "Hide summary" `true`, Links without toggle, Activity "View activity" `false` | match (S16) |
| 7362:54691 | draft opened | 1440 | cards | place, gaps | band 208 high, Summary at 224, cards 16 apart (Links 972, Activity 1090 = 972 + 102 + 16) | band 96–304, Summary at 320 − 96 = 224, Links at 842 = 826 + 16, Activity at 960 = 842 + 102 + 16 | match (the Summary 506 high with 0 rules, the frame's 732 with 4) |
| 7362:54912 | draft opened | 1440 | Activity card | size, border, texts | 832 × 102, #e1e6f0, "Activity", "Last edited by Laura Weber · 03.10.2026, 14:32", "View activity" expand_more | 832 × 102, rgb(225, 230, 240), "Activity", "Last edited by p10-alice · 11.11.2026, 14:54", "View activity" expand_more | match |
| 7362:54905 | draft opened | 1440 | Links card | toggle | none | none ("Created when the connection is published and active.") | match (S16: as built) |
| 7362:54920 | draft opened | 1440 | footer | "Edit connection" | shown (V-Draft · S) | the link `kern-btn kern-btn--secondary` to `/form-connections/<id>/edit`, no role check | match (F31) |
| 7362:54923 | draft, view-only | 1440 | page | presence | V-Draft · S2 without "Edit connection" | none | not built, F31 |
| 7362:54813 | draft opened | 1440 | Summary | "Download PDF" | drawn | none | not built, F12 |
| S16 | draft, Activity opened | 1440 | cards | one at a time | Summary closes | "View summary" `false`, "Hide activity" `true`; row "11.11.2026, 14:54 · Created · p10-alice"; Activity 832 × 158 | match |
| S16 | draft, Summary opened again, then closed | 1440 | cards | sequence | Activity closes; none open | "Hide summary" `true`, "View activity" `false`; then both `false` | match |
| 7362:54691 | draft, Summary open | 1440 | page, screenshot | comparison | the frame | the same without "Download PDF" (`draft-summary-1440.png`, `draft-activity-1440.png`) | match (F12) |
| narrow | after publishing, Links open (`T034 publish 2`) | 320 | page | h-scroll, h1, off-screen, clipped | none, 1, 0, none | scrollWidth 305 ≤ clientWidth 320; 1 h1; 0 outside 0–320; cards 16 + 273; only the header's name "T034 publish 2" ends in an ellipsis | match (spec 008's header truncates the name) |
| narrow | after publishing, Links open | 160 | page | h-scroll, h1, off-screen, clipped | none, 1, 0, none | 160 = 160; 1; 0; none; cards 8 + 129 | match |
| narrow | after publishing | 320, 160 | Activity toggle | focus ring after Tab / after a click | ring / none | `:focus-visible` true, solid 4px / false, none | match |
| narrow | after "Save", Links open (`T034 saved`) | 320 | page | h-scroll, h1, off-screen, clipped | none, 1, 0, none | 305 ≤ 320; 1; 0; the header's name ellipsis only | match (spec 008's header) |
| narrow | after "Save", Links open | 160 | page | h-scroll, h1, off-screen, clipped | none, 1, 0, none | 160 = 160; 1; 0; none | match |
| narrow | after "Save" | 320, 160 | Activity toggle | focus ring after Tab / after a click | ring / none | true, solid 4px / false, none | match |
| narrow | Activity opened, Links and Summary closed (`T034 saved`) | 320 | page | h-scroll, h1, off-screen, clipped | none, 1, 0, none | 305 ≤ 320; 1; 0; the header's name ellipsis only | match (spec 008's header) |
| narrow | Activity opened | 160 | page | h-scroll, h1, off-screen, clipped | none, 1, 0, none | 160 = 160; 1; 0; none | match |
| narrow | Activity opened | 320, 160 | Activity toggle | focus ring after Tab / after a click | ring / none | true, solid 4px / false, none | match |
| narrow | opened from the overview, Summary open (`T034 live`) | 320 | page | h-scroll, h1, off-screen, clipped | none, 1, 0, none | 305 ≤ 320; 1; 0; the header's name ellipsis only | match (spec 008's header) |
| narrow | opened from the overview | 160 | page | h-scroll, h1, off-screen, clipped | none, 1, 0, none | 160 = 160; 1; 0; none | match |
| narrow | opened from the overview | 320, 160 | Activity toggle | focus ring after Tab / after a click | ring / none | true, solid 4px / false, none | match |
| narrow | deactivated, Activity open and reloaded (`T034 status`) | 320 | page | h-scroll, h1, off-screen, clipped | none, 1, 0, none | 305 ≤ 320; 1; 0; none | match |
| narrow | deactivated, Activity reloaded | 160 | page | h-scroll, h1, off-screen, clipped | none, 1, 0, none | 160 = 160; 1; 0; none | match |
| narrow | deactivated, Activity reloaded | 320, 160 | Activity toggle | focus ring after Tab / after a click | ring / none | true, solid 4px / false, none | match |
| narrow | scheduled by "Activate again", Activity open and reloaded (`T034 status`) | 320 | page | h-scroll, h1, off-screen, clipped | none, 1, 0, none | 305 ≤ 320; 1; 0; none | match |
| narrow | scheduled, Activity reloaded | 160 | page | h-scroll, h1, off-screen, clipped | none, 1, 0, none | 160 = 160; 1; 0; none | match |
| narrow | scheduled, Activity reloaded | 320, 160 | Activity toggle | focus ring after Tab / after a click | ring / none | true, solid 4px / false, none | match |
| narrow | draft, Summary open (`T034 draft`) | 320 | page | h-scroll, h1, off-screen, clipped | none, 1, 0, none | 305 ≤ 320; 1; 0; cards 16 + 273 (Links static); the header's name ellipsis only | match (spec 008's header) |
| narrow | draft, Summary open | 160 | page | h-scroll, h1, off-screen, clipped | none, 1, 0, none | 160 = 160; 1; 0; none; cards 8 + 129 | match |
| narrow | draft, Activity open | 320 | page | h-scroll, h1, off-screen, clipped | none, 1, 0, none | 305 ≤ 320; 1; 0; the header's name ellipsis only | match (spec 008's header) |
| narrow | draft, Activity open | 160 | page | h-scroll, h1, off-screen, clipped | none, 1, 0, none | 160 = 160; 1; 0; none | match |
| narrow | draft, Summary open and Activity open | 320, 160 | Activity toggle | focus ring after Tab / after a click | ring / none | true, solid 4px / false, none | match |

### 2.2 The walks (quickstart V1–V12)

#### T017: walk V5, dates and the draft's step (US2; FR-015–FR-021, SC-003, US2-AS1–AS6; scripted `playwright-core` 1.65: Chromium `/usr/bin/chromium` and Firefox 159 (build 1572), 1440 × 900, browser zone Europe/Berlin unless named; English and German through the stored language choice; backend with the fake EUDIPLO; every text compared with the one the script composed from the API's dates (data-model §1.4, the glossary's words), the publish/deactivate/reactivate/save instants checked to fall inside the action; connections `T017 <browser> <lang> <stamp>` made in the UI, one document and one rule seeded through the API between the connection and documents saves so that the rules and test steps open; CSV `<scratchpad>/T017/walk.csv`, summary `<scratchpad>/T017/summary.md`)

| step | language | browser | measures | read (row; pill) | result |
|---|---|---|---|---|---|
| V5.1 draft: connection step | en | Chromium | 7 | "Edited 11.11.2026 · Connection step"; "Edited 11.11.2026, 12:32" | pass |
| V5.1 draft: connection step | de | Chromium | 7 | "Bearbeitet 11.11.2026 · Schritt „Anbindung“"; "Bearbeitet 11.11.2026, 12:32" | pass |
| V5.1 draft: connection step | en | Firefox | 7 | "Edited 11.11.2026 · Connection step"; "Edited 11.11.2026, 12:32" | pass |
| V5.1 draft: connection step | de | Firefox | 7 | "Bearbeitet 11.11.2026 · Schritt „Anbindung“"; "Bearbeitet 11.11.2026, 12:32" | pass |
| V5.1 draft: documents step | en | Chromium | 7 | "Edited 11.11.2026 · Documents step"; "Edited 11.11.2026, 12:32" | pass |
| V5.1 draft: documents step | de | Chromium | 7 | "Bearbeitet 11.11.2026 · Schritt „Dokumente“"; "Bearbeitet 11.11.2026, 12:32" | pass |
| V5.1 draft: documents step | en | Firefox | 7 | "Edited 11.11.2026 · Documents step"; "Edited 11.11.2026, 12:32" | pass |
| V5.1 draft: documents step | de | Firefox | 7 | "Bearbeitet 11.11.2026 · Schritt „Dokumente“"; "Bearbeitet 11.11.2026, 12:32" | pass |
| V5.1 draft: rules step | en | Chromium | 7 | "Edited 11.11.2026 · Rules step"; "Edited 11.11.2026, 12:32" | pass |
| V5.1 draft: rules step | de | Chromium | 7 | "Bearbeitet 11.11.2026 · Schritt „Regeln“"; "Bearbeitet 11.11.2026, 12:32" | pass |
| V5.1 draft: rules step | en | Firefox | 7 | "Edited 11.11.2026 · Rules step"; "Edited 11.11.2026, 12:33" | pass |
| V5.1 draft: rules step | de | Firefox | 7 | "Bearbeitet 11.11.2026 · Schritt „Regeln“"; "Bearbeitet 11.11.2026, 12:33" | pass |
| V5.1 draft: test step | en | Chromium | 7 | "Edited 11.11.2026 · Test step"; "Edited 11.11.2026, 12:33" | pass |
| V5.1 draft: test step | de | Chromium | 7 | "Bearbeitet 11.11.2026 · Schritt „Test“"; "Bearbeitet 11.11.2026, 12:33" | pass |
| V5.1 draft: test step | en | Firefox | 7 | "Edited 11.11.2026 · Test step"; "Edited 11.11.2026, 12:33" | pass |
| V5.1 draft: test step | de | Firefox | 7 | "Bearbeitet 11.11.2026 · Schritt „Test“"; "Bearbeitet 11.11.2026, 12:33" | pass |
| V5.1 publish | en | Chromium | 10 | "Published 11.11.2026"; "Active since 11.11.2026, 12:33" | pass |
| V5.1 publish | de | Chromium | 10 | "Veröffentlicht 11.11.2026"; "Aktiv seit 11.11.2026, 12:33" | pass |
| V5.1 publish | en | Firefox | 10 | "Published 11.11.2026"; "Active since 11.11.2026, 12:33" | pass |
| V5.1 publish | de | Firefox | 10 | "Veröffentlicht 11.11.2026"; "Aktiv seit 11.11.2026, 12:33" | pass |
| V5.2 save (description) | en | Chromium | 10 | "Published 11.11.2026"; "Active since 11.11.2026, 12:33" | pass |
| V5.2 save (description) | de | Chromium | 10 | "Veröffentlicht 11.11.2026"; "Aktiv seit 11.11.2026, 12:33" | pass |
| V5.2 save (description) | en | Firefox | 10 | "Published 11.11.2026"; "Active since 11.11.2026, 12:33" | pass |
| V5.2 save (description) | de | Firefox | 10 | "Veröffentlicht 11.11.2026"; "Aktiv seit 11.11.2026, 12:33" | pass |
| V5.2 rename | en | Chromium | 10 | "Published 11.11.2026"; "Active since 11.11.2026, 12:33" | pass |
| V5.2 rename | de | Chromium | 10 | "Veröffentlicht 11.11.2026"; "Aktiv seit 11.11.2026, 12:33" | pass |
| V5.2 rename | en | Firefox | 10 | "Published 11.11.2026"; "Active since 11.11.2026, 12:33" | pass |
| V5.2 rename | de | Firefox | 10 | "Veröffentlicht 11.11.2026"; "Aktiv seit 11.11.2026, 12:33" | pass |
| V5.1 deactivate | en | Chromium | 10 | "Deactivated 11.11.2026"; "Deactivated since 11.11.2026, 12:33" | pass |
| V5.1 deactivate | de | Chromium | 10 | "Deaktiviert 11.11.2026"; "Deaktiviert seit 11.11.2026, 12:33" | pass |
| V5.1 deactivate | en | Firefox | 10 | "Deactivated 11.11.2026"; "Deactivated since 11.11.2026, 12:34" | pass |
| V5.1 deactivate | de | Firefox | 10 | "Deaktiviert 11.11.2026"; "Deaktiviert seit 11.11.2026, 12:34" | pass |
| V5.3 reactivate | en | Chromium | 10 | "Published 11.11.2026"; "Active since 11.11.2026, 12:34" | pass |
| V5.3 reactivate | de | Chromium | 10 | "Veröffentlicht 11.11.2026"; "Aktiv seit 11.11.2026, 12:34" | pass |
| V5.3 reactivate | en | Firefox | 10 | "Published 11.11.2026"; "Active since 11.11.2026, 12:35" | pass |
| V5.3 reactivate | de | Firefox | 10 | "Veröffentlicht 11.11.2026"; "Aktiv seit 11.11.2026, 12:35" | pass |
| V5.4 pre-feature | en | Chromium | 28 | "Published 09.11.2026", "Published 09.11.2026", "Deactivated 09.11.2026", "Edited 08.11.2026 · Connection step", "Edited 08.11.2026 · Rules step", "Edited 08.11.2026 · Test step"; "Active since 09.11.2026, 19:20", "Active since 09.11.2026, 19:16", "Deactivated since 09.11.2026, 19:34", "Edited 08.11.2026, 18:00", "Edited 08.11.2026, 19:05", "Edited 08.11.2026, 18:00" | pass |
| V5.4 pre-feature | de | Chromium | 28 | "Veröffentlicht 09.11.2026", "Veröffentlicht 09.11.2026", "Deaktiviert 09.11.2026", "Bearbeitet 08.11.2026 · Schritt „Anbindung“", "Bearbeitet 08.11.2026 · Schritt „Regeln“", "Bearbeitet 08.11.2026 · Schritt „Test“"; "Aktiv seit 09.11.2026, 19:20", "Aktiv seit 09.11.2026, 19:16", "Deaktiviert seit 09.11.2026, 19:34", "Bearbeitet 08.11.2026, 18:00", "Bearbeitet 08.11.2026, 19:05", "Bearbeitet 08.11.2026, 18:00" | pass |
| V5.4 pre-feature | en | Firefox | 28 | "Published 09.11.2026", "Published 09.11.2026", "Deactivated 09.11.2026", "Edited 08.11.2026 · Connection step", "Edited 08.11.2026 · Rules step", "Edited 08.11.2026 · Test step"; "Active since 09.11.2026, 19:20", "Active since 09.11.2026, 19:16", "Deactivated since 09.11.2026, 19:34", "Edited 08.11.2026, 18:00", "Edited 08.11.2026, 19:05", "Edited 08.11.2026, 18:00" | pass |
| V5.4 pre-feature | de | Firefox | 28 | "Veröffentlicht 09.11.2026", "Veröffentlicht 09.11.2026", "Deaktiviert 09.11.2026", "Bearbeitet 08.11.2026 · Schritt „Anbindung“", "Bearbeitet 08.11.2026 · Schritt „Regeln“", "Bearbeitet 08.11.2026 · Schritt „Test“"; "Aktiv seit 09.11.2026, 19:20", "Aktiv seit 09.11.2026, 19:16", "Deaktiviert seit 09.11.2026, 19:34", "Bearbeitet 08.11.2026, 18:00", "Bearbeitet 08.11.2026, 19:05", "Bearbeitet 08.11.2026, 18:00" | pass |
| V5.5 start date in America/New_York | en | Chromium | 7 | "Active from 01.12.2026"; "Active from 01.12.2026, 00:00"; "Scheduled · 01.12.2026" | pass |
| V5.5 start date in America/New_York | de | Chromium | 7 | "Aktiv ab 01.12.2026"; "Aktiv ab 01.12.2026, 00:00"; "Geplant · 01.12.2026" | pass |
| V5.5 start date in America/New_York | en | Firefox | 7 | "Active from 01.12.2026"; "Active from 01.12.2026, 00:00"; "Scheduled · 01.12.2026" | pass |
| V5.5 start date in America/New_York | de | Firefox | 7 | "Aktiv ab 01.12.2026"; "Aktiv ab 01.12.2026, 00:00"; "Geplant · 01.12.2026" | pass |
| V5.5 start date in Europe/Berlin (reference) | en | Chromium | 7 | "Active from 01.12.2026"; "Active from 01.12.2026, 00:00"; "Scheduled · 01.12.2026" | pass |
| V5.5 start date in Europe/Berlin (reference) | de | Chromium | 7 | "Aktiv ab 01.12.2026"; "Aktiv ab 01.12.2026, 00:00"; "Geplant · 01.12.2026" | pass |
| V5.5 start date in Europe/Berlin (reference) | en | Firefox | 7 | "Active from 01.12.2026"; "Active from 01.12.2026, 00:00"; "Scheduled · 01.12.2026" | pass |
| V5.5 start date in Europe/Berlin (reference) | de | Firefox | 7 | "Aktiv ab 01.12.2026"; "Aktiv ab 01.12.2026, 00:00"; "Geplant · 01.12.2026" | pass |

48 rows (12 steps × 2 languages × 2 browsers), 48 pass, 0 open; 480 measures, 480 pass, 0 fail, 0 unsure. V5.2's reordering is T061's. No fix was needed; no screenshot opened.

#### T030: walk V1–V4, scheduling (US1; FR-001–FR-014, SC-001, SC-002, US1-AS1–AS11; scripted `playwright-core` 1.65: Chromium 156 (`/usr/bin/chromium`) and Firefox 159 (build 1572), 1440 × 900, browser zone Europe/Berlin; English and German through the stored language choice; backend on 3011 with the worker on (2 s cycle) and the fake EUDIPLO, database `template_db_010_p4`; every text compared with the one the script composed from the API’s dates and copy.md §2 / the glossary; busy states read with the call held back 1.5 s by `page.route()`; the server’s `invalid_start_date` (V2.3) by a `page.route()` that rewrites the body’s date to today; serviceBW’s calls made without a cookie and compared byte for byte (status, content type, body) with a deactivated connection’s; V3.3 by `UPDATE form_connections SET start_date = CURRENT_DATE` with `psql`, the browser on `about:blank` while the links were polled; connections `T030 <browser> <lang> <stamp> {v1,v3,v4 now,deactivated}` made through the API (drafts from `P3 seed live`’s content plus an empty variant “Taxi”) and published, moved, started, deactivated, reactivated, saved and deleted in the UI; V2.2 and V3.1–V3.2 are pytest (`backend/tests/api/test_scheduling.py`: `test_a_day_that_ends_while_eudiplo_answers_is_refused_and_undone`, `test_a_day_that_ends_before_the_lock_is_refused_before_eudiplo`, `test_a_day_that_ends_before_the_lock_is_refused_under_it`, `test_the_worker_makes_a_scheduled_connection_live_on_its_day[on the start day|three days later]`), cited, not rerun; CSV `<scratchpad>/T030/walk.csv`, summary `<scratchpad>/T030/summary.md`)

| step | language | browser | measures | read | result |
|---|---|---|---|---|---|
| V1.1 publish dialog: "Now" | en | Chromium | 13 | "Active from"; "Now\|On a date" | pass |
| V1.1 publish dialog: "Now" | de | Chromium | 13 | "Aktiv ab"; "Sofort\|Ab einem Datum" | pass |
| V1.1 publish dialog: "Now" | en | Firefox | 13 | "Active from"; "Now\|On a date" | pass |
| V1.1 publish dialog: "Now" | de | Firefox | 13 | "Aktiv ab"; "Sofort\|Ab einem Datum" | pass |
| V1.2 publish dialog: "On a date" | en | Chromium | 13 | "DD.MM.YYYY" | pass |
| V1.2 publish dialog: "On a date" | de | Chromium | 13 | "TT.MM.JJJJ" | pass |
| V1.2 publish dialog: "On a date" | en | Firefox | 13 | "DD.MM.YYYY" | pass |
| V1.2 publish dialog: "On a date" | de | Firefox | 13 | "TT.MM.JJJJ" | pass |
| V2.1 refused: nothing | en | Chromium | 9 | "Enter a date after today." | pass |
| V2.1 refused: nothing | de | Chromium | 9 | "Geben Sie ein Datum nach dem heutigen Tag ein." | pass |
| V2.1 refused: nothing | en | Firefox | 9 | "Enter a date after today." | pass |
| V2.1 refused: nothing | de | Firefox | 9 | "Geben Sie ein Datum nach dem heutigen Tag ein." | pass |
| V2.1 refused: today | en | Chromium | 9 | "Enter a date after today." | pass |
| V2.1 refused: today | de | Chromium | 9 | "Geben Sie ein Datum nach dem heutigen Tag ein." | pass |
| V2.1 refused: today | en | Firefox | 9 | "Enter a date after today." | pass |
| V2.1 refused: today | de | Firefox | 9 | "Geben Sie ein Datum nach dem heutigen Tag ein." | pass |
| V2.1 refused: yesterday | en | Chromium | 9 | "Enter a date after today." | pass |
| V2.1 refused: yesterday | de | Chromium | 9 | "Geben Sie ein Datum nach dem heutigen Tag ein." | pass |
| V2.1 refused: yesterday | en | Firefox | 9 | "Enter a date after today." | pass |
| V2.1 refused: yesterday | de | Firefox | 9 | "Geben Sie ein Datum nach dem heutigen Tag ein." | pass |
| V2.1 refused: 31.02.2027 | en | Chromium | 9 | "Enter a date after today." | pass |
| V2.1 refused: 31.02.2027 | de | Chromium | 9 | "Geben Sie ein Datum nach dem heutigen Tag ein." | pass |
| V2.1 refused: 31.02.2027 | en | Firefox | 9 | "Enter a date after today." | pass |
| V2.1 refused: 31.02.2027 | de | Firefox | 9 | "Geben Sie ein Datum nach dem heutigen Tag ein." | pass |
| V2.1 refused: abc | en | Chromium | 9 | "Enter a date after today." | pass |
| V2.1 refused: abc | de | Chromium | 9 | "Geben Sie ein Datum nach dem heutigen Tag ein." | pass |
| V2.1 refused: abc | en | Firefox | 9 | "Enter a date after today." | pass |
| V2.1 refused: abc | de | Firefox | 9 | "Geben Sie ein Datum nach dem heutigen Tag ein." | pass |
| V2.1 refused: the draft unchanged | en | Chromium | 3 | "1" | pass |
| V2.1 refused: the draft unchanged | de | Chromium | 3 | "1" | pass |
| V2.1 refused: the draft unchanged | en | Firefox | 3 | "1" | pass |
| V2.1 refused: the draft unchanged | de | Firefox | 3 | "1" | pass |
| V2.3 server refusal shown as the field error | en | Chromium | 6 | "Enter a date after today."; "1" | pass |
| V2.3 server refusal shown as the field error | de | Chromium | 6 | "Geben Sie ein Datum nach dem heutigen Tag ein."; "1" | pass |
| V2.3 server refusal shown as the field error | en | Firefox | 6 | "Enter a date after today."; "1" | pass |
| V2.3 server refusal shown as the field error | de | Firefox | 6 | "Geben Sie ein Datum nach dem heutigen Tag ein."; "1" | pass |
| V1.3 schedule: publishing, then the details | en | Chromium | 22 | "scheduled"; "2026-12-05"; "Your connection is scheduled"; "Active from 05.12.2026, 00:00"; "Scheduled · 05.12.2026" | pass |
| V1.3 schedule: publishing, then the details | de | Chromium | 22 | "scheduled"; "2026-12-05"; "Ihre Anbindung ist geplant"; "Aktiv ab 05.12.2026, 00:00"; "Geplant · 05.12.2026" | pass |
| V1.3 schedule: publishing, then the details | en | Firefox | 22 | "scheduled"; "2026-12-05"; "Your connection is scheduled"; "Active from 05.12.2026, 00:00"; "Scheduled · 05.12.2026" | pass |
| V1.3 schedule: publishing, then the details | de | Firefox | 22 | "scheduled"; "2026-12-05"; "Ihre Anbindung ist geplant"; "Aktiv ab 05.12.2026, 00:00"; "Geplant · 05.12.2026" | pass |
| V1.4 links answer unavailable | en | Chromium | 11 | "0"; "{"error":"unavailable","message":"This form connection is deactivated or deleted"}" | pass |
| V1.4 links answer unavailable | de | Chromium | 11 | "0"; "{"error":"unavailable","message":"This form connection is deactivated or deleted"}" | pass |
| V1.4 links answer unavailable | en | Firefox | 11 | "0"; "{"error":"unavailable","message":"This form connection is deactivated or deleted"}" | pass |
| V1.4 links answer unavailable | de | Firefox | 11 | "0"; "{"error":"unavailable","message":"This form connection is deactivated or deleted"}" | pass |
| V1.5 overview row | en | Chromium | 6 | "Scheduled"; "Active from 05.12.2026" | pass |
| V1.5 overview row | de | Chromium | 6 | "Geplant"; "Aktiv ab 05.12.2026" | pass |
| V1.5 overview row | en | Firefox | 6 | "Scheduled"; "Active from 05.12.2026" | pass |
| V1.5 overview row | de | Firefox | 6 | "Geplant"; "Aktiv ab 05.12.2026" | pass |
| V3.3 the start arrives (worker) | en | Chromium | 20 | links work: 1314 ms; "live"; "null"; details read active: 2176 ms; "Your connection is active"; "Active since 11.11.2026, 00:00" | pass |
| V3.3 the start arrives (worker) | de | Chromium | 20 | links work: 724 ms; "live"; "null"; details read active: 1717 ms; "Ihre Anbindung ist aktiv"; "Aktiv seit 11.11.2026, 00:00" | pass |
| V3.3 the start arrives (worker) | en | Firefox | 20 | links work: 489 ms; "live"; "null"; details read active: 2331 ms; "Your connection is active"; "Active since 11.11.2026, 00:00" | pass |
| V3.3 the start arrives (worker) | de | Firefox | 20 | links work: 1094 ms; "live"; "null"; details read active: 2700 ms; "Ihre Anbindung ist aktiv"; "Aktiv seit 11.11.2026, 00:00" | pass |
| V4.1 change start date: another date | en | Chromium | 15 | "Change start date"; "Start date saved."; "2026-12-11"; "Active from 11.12.2026, 00:00"; "Scheduled · 11.12.2026"; "Active from 11.12.2026" | pass |
| V4.1 change start date: another date | de | Chromium | 15 | "Startdatum ändern"; "Startdatum gespeichert."; "2026-12-11"; "Aktiv ab 11.12.2026, 00:00"; "Geplant · 11.12.2026"; "Aktiv ab 11.12.2026" | pass |
| V4.1 change start date: another date | en | Firefox | 15 | "Change start date"; "Start date saved."; "2026-12-11"; "Active from 11.12.2026, 00:00"; "Scheduled · 11.12.2026"; "Active from 11.12.2026" | pass |
| V4.1 change start date: another date | de | Firefox | 15 | "Startdatum ändern"; "Startdatum gespeichert."; "2026-12-11"; "Aktiv ab 11.12.2026, 00:00"; "Geplant · 11.12.2026"; "Aktiv ab 11.12.2026" | pass |
| V4.2 change start date: "Now" | en | Chromium | 9 | "Start date saved."; "live"; "Your connection is active"; "Active since 11.11.2026, 14:59" | pass |
| V4.2 change start date: "Now" | de | Chromium | 9 | "Startdatum gespeichert."; "live"; "Ihre Anbindung ist aktiv"; "Aktiv seit 11.11.2026, 15:00" | pass |
| V4.2 change start date: "Now" | en | Firefox | 9 | "Start date saved."; "live"; "Your connection is active"; "Active since 11.11.2026, 15:01" | pass |
| V4.2 change start date: "Now" | de | Firefox | 9 | "Startdatum gespeichert."; "live"; "Ihre Anbindung ist aktiv"; "Aktiv seit 11.11.2026, 15:02" | pass |
| V4.3 active: "Now" changes nothing | en | Chromium | 8 | "Now (active since 11.11.2026, 14:59)" | pass |
| V4.3 active: "Now" changes nothing | de | Chromium | 8 | "Sofort (aktiv seit 11.11.2026, 15:00)" | pass |
| V4.3 active: "Now" changes nothing | en | Firefox | 8 | "Now (active since 11.11.2026, 15:01)" | pass |
| V4.3 active: "Now" changes nothing | de | Firefox | 8 | "Sofort (aktiv seit 11.11.2026, 15:02)" | pass |
| V4.3 active: a later date | en | Chromium | 21 | "Start date saved."; "scheduled"; "2026-11-21"; "Your connection is scheduled"; "Active from 21.11.2026, 00:00"; "{"error":"unavailable","message":"This form connection is deactivated or deleted"}" | pass |
| V4.3 active: a later date | de | Chromium | 21 | "Startdatum gespeichert."; "scheduled"; "2026-11-21"; "Ihre Anbindung ist geplant"; "Aktiv ab 21.11.2026, 00:00"; "{"error":"unavailable","message":"This form connection is deactivated or deleted"}" | pass |
| V4.3 active: a later date | en | Firefox | 21 | "Start date saved."; "scheduled"; "2026-11-21"; "Your connection is scheduled"; "Active from 21.11.2026, 00:00"; "{"error":"unavailable","message":"This form connection is deactivated or deleted"}" | pass |
| V4.3 active: a later date | de | Firefox | 21 | "Startdatum gespeichert."; "scheduled"; "2026-11-21"; "Ihre Anbindung ist geplant"; "Aktiv ab 21.11.2026, 00:00"; "{"error":"unavailable","message":"This form connection is deactivated or deleted"}" | pass |
| V4.4 deactivate a scheduled connection | en | Chromium | 16 | "Deactivate this connection?"; "Connection deactivated."; "deactivated"; "null"; "Connection deactivated"; "Deactivated since 11.11.2026, 14:59" | pass |
| V4.4 deactivate a scheduled connection | de | Chromium | 16 | "Diese Anbindung deaktivieren?"; "Anbindung deaktiviert."; "deactivated"; "null"; "Anbindung deaktiviert"; "Deaktiviert seit 11.11.2026, 15:00" | pass |
| V4.4 deactivate a scheduled connection | en | Firefox | 16 | "Deactivate this connection?"; "Connection deactivated."; "deactivated"; "null"; "Connection deactivated"; "Deactivated since 11.11.2026, 15:01" | pass |
| V4.4 deactivate a scheduled connection | de | Firefox | 16 | "Diese Anbindung deaktivieren?"; "Anbindung deaktiviert."; "deactivated"; "null"; "Anbindung deaktiviert"; "Deaktiviert seit 11.11.2026, 15:02" | pass |
| V4.5 activate again: on a date | en | Chromium | 25 | "Activate this connection again?"; "Enter a date after today."; "Connection scheduled for 26.11.2026."; "scheduled"; "2026-11-26"; "Active from 26.11.2026, 00:00" | pass |
| V4.5 activate again: on a date | de | Chromium | 25 | "Diese Anbindung wieder aktivieren?"; "Geben Sie ein Datum nach dem heutigen Tag ein."; "Anbindung für den 26.11.2026 geplant."; "scheduled"; "2026-11-26"; "Aktiv ab 26.11.2026, 00:00" | pass |
| V4.5 activate again: on a date | en | Firefox | 25 | "Activate this connection again?"; "Enter a date after today."; "Connection scheduled for 26.11.2026."; "scheduled"; "2026-11-26"; "Active from 26.11.2026, 00:00" | pass |
| V4.5 activate again: on a date | de | Firefox | 25 | "Diese Anbindung wieder aktivieren?"; "Geben Sie ein Datum nach dem heutigen Tag ein."; "Anbindung für den 26.11.2026 geplant."; "scheduled"; "2026-11-26"; "Aktiv ab 26.11.2026, 00:00" | pass |
| V4.5 activate again: now | en | Chromium | 7 | "Connection reactivated."; "live"; "Active since 11.11.2026, 15:00" | pass |
| V4.5 activate again: now | de | Chromium | 7 | "Anbindung reaktiviert."; "live"; "Aktiv seit 11.11.2026, 15:00" | pass |
| V4.5 activate again: now | en | Firefox | 7 | "Connection reactivated."; "live"; "Active since 11.11.2026, 15:01" | pass |
| V4.5 activate again: now | de | Firefox | 7 | "Anbindung reaktiviert."; "live"; "Aktiv seit 11.11.2026, 15:02" | pass |
| V4.6 edit a scheduled connection | en | Chromium | 17 | "Edit this scheduled connection?"; "Scheduled · 26.11.2026"; "Save changes?"; "2026-11-26"; "scheduled"; "T030 saved qtze" | pass |
| V4.6 edit a scheduled connection | de | Chromium | 17 | "Diese geplante Anbindung bearbeiten?"; "Geplant · 26.11.2026"; "Änderungen speichern?"; "2026-11-26"; "scheduled"; "T030 saved rsbm" | pass |
| V4.6 edit a scheduled connection | en | Firefox | 17 | "Edit this scheduled connection?"; "Scheduled · 26.11.2026"; "Save changes?"; "2026-11-26"; "scheduled"; "T030 saved srd9" | pass |
| V4.6 edit a scheduled connection | de | Firefox | 17 | "Diese geplante Anbindung bearbeiten?"; "Geplant · 26.11.2026"; "Änderungen speichern?"; "2026-11-26"; "scheduled"; "T030 saved u2m2" | pass |
| V4.7 delete a scheduled connection | en | Chromium | 14 | "Delete “T030 chromium en qtze v1”?"; "“T030 chromium en qtze v1” deleted." | pass |
| V4.7 delete a scheduled connection | de | Chromium | 14 | "„T030 chromium de rsbm v1“ löschen?"; "„T030 chromium de rsbm v1“ gelöscht." | pass |
| V4.7 delete a scheduled connection | en | Firefox | 14 | "Delete “T030 firefox en srd9 v1”?"; "“T030 firefox en srd9 v1” deleted." | pass |
| V4.7 delete a scheduled connection | de | Firefox | 14 | "„T030 firefox de u2m2 v1“ löschen?"; "„T030 firefox de u2m2 v1“ gelöscht." | pass |

88 rows (22 steps × 2 languages × 2 browsers), 88 pass, 0 open; 1084 measures, 1084 pass, 0 fail, 0 unsure. SC-001 measured from the UPDATE: chromium-en links 1314 ms, chromium-en details 2176 ms, chromium-de links 724 ms, chromium-de details 1717 ms, firefox-en links 489 ms, firefox-en details 2331 ms, firefox-de links 1094 ms, firefox-de details 2700 ms (the worker’s cycle is 2 s; SC-001 allows a minute). No fix was needed; no screenshot of a walked state opened (one, of a script error before the first measure, showed the sign-in page: the script’s cookie origin, corrected).

#### T036: walk V6, the activity (US3; FR-022–FR-032, SC-004, US3-AS1–AS6; scripted `playwright-core` 1.65: Chromium 156 (`/usr/bin/chromium`), 1440 × 900, browser zone Europe/Berlin, narrow rows at 320 × 800; English and German through the stored language choice; backend on 3011 with the fake EUDIPLO, `WORKER_ENABLED=false`, database `template_db_010_p5`; accounts `p10-alice` (the browser) and `p10-bob` (API), the agent a personal access token `T036 agent` (level `drafts`) created for `p10-alice` through `POST /api/agent-access/tokens` and revoked at the end (its next call 401); every row compared with the text the script composed from `GET /api/form-connections/{id}/activity` and copy.md §3 (time in Europe/Berlin), the newest entries' kind and person checked against what the action should write, their time inside the action, the closed line against data-model §2.5, the agent's view the same API with the bearer (the MCP not run); drafts made and changed through the API (alice, bob, the agent), published, reactivated, scheduled, saved and approved in the UI (the editor's "Publish" → "Publish connection", "On a date" → "Schedule", the details' "Activate again" → "Activate", "Edit connection" → the edit flow's "Save" → "Save", the approval page's "Approve"); V6.3's propagation sent as the editor sends it (Standard's rule and the linked variant's unmarked copy changed together); V6.7 on `T033 open` (66 seeded entries); V6.8 with `psql`; the loading skeleton read with the connection's GET held back 1.5 s by `page.route()`; connections `T036 <lang> <stamp> {v61 (renamed), v62, v63, v64, v66 scheduled, v66 deactivated, v66 schedule, v66 save}`; CSV `<scratchpad>/T036/walk.csv`, summary `<scratchpad>/T036/summary.md`)

| step | language | measures | pass | fail | unsure | notes |
|---|---|---|---|---|---|---|
| setup | - | 1 | 1 | 0 | 0 |  |
| V6.1 1 create draft (alice) | en | 10 | 10 | 0 | 0 | entry count 1; "Last edited by p10-alice · 11.11.2026, 16:27"; "Created"; "p10-alice" |
| V6.1 2 change documents (bob) | en | 10 | 10 | 0 | 0 | entry count 2; "Last edited by p10-bob · 11.11.2026, 16:27"; "Documents changed"; "p10-bob" |
| V6.1 3 add variant Ambulance (agent) | en | 10 | 10 | 0 | 0 | entry count 3; "Last edited by p10-alice with T036 agent · 11.11.2026, 16:27"; "Variant added: Ambulance"; "p10-alice with T036 agent" |
| V6.1 4 change Ambulance's rules (bob) | en | 10 | 10 | 0 | 0 | entry count 4; "Last edited by p10-bob · 11.11.2026, 16:27"; "Rules changed in Ambulance"; "p10-bob" |
| V6.1 5 rename (alice) | en | 10 | 10 | 0 | 0 | entry count 5; "Last edited by p10-alice · 11.11.2026, 16:27"; "Name changed"; "p10-alice" |
| V6.6 after publishing | en | 3 | 3 | 0 | 0 | "links:open summary:closed activity:closed"; "links:closed summary:closed activity:open" |
| V6.1 6 publish (alice, UI) | en | 10 | 10 | 0 | 0 | "Last edited by p10-alice · 11.11.2026, 16:27"; entry count 6; "Published"; "p10-alice" |
| V6.1 7 deactivate (bob) | en | 10 | 10 | 0 | 0 | entry count 7; "Deactivated by p10-bob · 11.11.2026, 16:27"; "Deactivated"; "p10-bob" |
| V6.5 deactivated closed line | en | 3 | 3 | 0 | 0 | "Deactivated by p10-bob · 11.11.2026, 16:27" |
| V6.1 8 reactivate (alice, UI) | en | 10 | 10 | 0 | 0 | entry count 8; "Activated again"; "p10-alice"; "Last edited by p10-alice · 11.11.2026, 16:27" |
| narrow 320: card closed | en | 4 | 4 | 0 | 0 | "scrollWidth 305 ≤ 320" |
| narrow 320: card open | en | 5 | 5 | 0 | 0 | "scrollWidth 305 ≤ 320" |
| V6.2 twenty changes by the agent: one row | en | 11 | 11 | 0 | 0 | entry count 3; "Last edited by p10-alice with T036 agent · 11.11.2026, 16:27"; "Rules changed in Ambulance"; "p10-alice with T036 agent" |
| V6.2 another person in between | en | 10 | 10 | 0 | 0 | entry count 4; "Last edited by p10-bob · 11.11.2026, 16:27"; "Rules changed in Ambulance"; "p10-bob" |
| V6.2 the agent again: a new row | en | 10 | 10 | 0 | 0 | entry count 5; "Last edited by p10-alice with T036 agent · 11.11.2026, 16:27"; "Rules changed in Ambulance"; "p10-alice with T036 agent" |
| V6.3 propagating change of Standard | en | 11 | 11 | 0 | 0 | "T036 message propagated\|null"; entry count 2; "Last edited by p10-alice · 11.11.2026, 16:27"; "Rules changed in Standard"; "p10-alice" |
| V6.4 approved publish | en | 14 | 14 | 0 | 0 | entry count 2; "Last edited by p10-alice, asked by T036 agent · 11.11.2026, 16:27"; "Published"; "p10-alice, asked by T036 agent"; "Published · p10-alice, asked by T036 agent" |
| V6.6 one card at a time: live | en | 5 | 5 | 0 | 0 | "links:closed summary:open activity:closed" |
| V6.6 one card at a time: scheduled | en | 5 | 5 | 0 | 0 | "links:closed summary:open activity:closed" |
| V6.6 one card at a time: deactivated | en | 5 | 5 | 0 | 0 | "links:closed summary:open activity:closed" |
| V6.6 one card at a time: draft | en | 3 | 3 | 0 | 0 | "summary:open activity:closed" |
| V6.6 after "Schedule" | en | 11 | 11 | 0 | 0 | "links:open summary:closed activity:closed"; "links:closed summary:closed activity:open"; entry count 3; "Scheduled for 20.12.2026"; "p10-alice" |
| V6.6 after the edit flow's "Save" | en | 12 | 12 | 0 | 0 | "links:open summary:closed activity:closed"; "links:closed summary:closed activity:open"; entry count 3; "Description changed"; "p10-alice" |
| skeleton while loading | en | 4 | 4 | 0 | 0 | skeleton cards (published) 3; skeleton cards (draft) 3 |
| V6.7 seeded list | en | 1 | 1 | 0 | 0 |  |
| V6.7 the oldest by wheel | en | 5 | 5 | 0 | 0 | all entries loaded 66; "18.10.2026, 07:00 · Created · " |
| V6.7 the oldest by keyboard | en | 6 | 6 | 0 | 0 | all entries loaded 66; "18.10.2026, 07:00 · Created · " |
| V6.1 1 create draft (alice) | de | 10 | 10 | 0 | 0 | entry count 1; "Zuletzt bearbeitet von p10-alice · 11.11.2026, 16:27"; "Erstellt"; "p10-alice" |
| V6.1 2 change documents (bob) | de | 10 | 10 | 0 | 0 | entry count 2; "Zuletzt bearbeitet von p10-bob · 11.11.2026, 16:27"; "Dokumente geändert"; "p10-bob" |
| V6.1 3 add variant Ambulance (agent) | de | 10 | 10 | 0 | 0 | entry count 3; "Zuletzt bearbeitet von p10-alice mit T036 agent · 11.11.2026, 16:27"; "Variante hinzugefügt: Ambulance"; "p10-alice mit T036 agent" |
| V6.1 4 change Ambulance's rules (bob) | de | 10 | 10 | 0 | 0 | entry count 4; "Zuletzt bearbeitet von p10-bob · 11.11.2026, 16:28"; "Regeln in Ambulance geändert"; "p10-bob" |
| V6.1 5 rename (alice) | de | 10 | 10 | 0 | 0 | entry count 5; "Zuletzt bearbeitet von p10-alice · 11.11.2026, 16:28"; "Name geändert"; "p10-alice" |
| V6.6 after publishing | de | 3 | 3 | 0 | 0 | "links:open summary:closed activity:closed"; "links:closed summary:closed activity:open" |
| V6.1 6 publish (alice, UI) | de | 10 | 10 | 0 | 0 | "Zuletzt bearbeitet von p10-alice · 11.11.2026, 16:28"; entry count 6; "Veröffentlicht"; "p10-alice" |
| V6.1 7 deactivate (bob) | de | 10 | 10 | 0 | 0 | entry count 7; "Deaktiviert von p10-bob · 11.11.2026, 16:28"; "Deaktiviert"; "p10-bob" |
| V6.5 deactivated closed line | de | 3 | 3 | 0 | 0 | "Deaktiviert von p10-bob · 11.11.2026, 16:28" |
| V6.1 8 reactivate (alice, UI) | de | 10 | 10 | 0 | 0 | entry count 8; "Wieder aktiviert"; "p10-alice"; "Zuletzt bearbeitet von p10-alice · 11.11.2026, 16:28" |
| narrow 320: card closed | de | 4 | 4 | 0 | 0 | "scrollWidth 305 ≤ 320" |
| narrow 320: card open | de | 5 | 5 | 0 | 0 | "scrollWidth 305 ≤ 320" |
| V6.2 twenty changes by the agent: one row | de | 11 | 11 | 0 | 0 | entry count 3; "Zuletzt bearbeitet von p10-alice mit T036 agent · 11.11.2026, 16:28"; "Regeln in Ambulance geändert"; "p10-alice mit T036 agent" |
| V6.2 another person in between | de | 10 | 10 | 0 | 0 | entry count 4; "Zuletzt bearbeitet von p10-bob · 11.11.2026, 16:28"; "Regeln in Ambulance geändert"; "p10-bob" |
| V6.2 the agent again: a new row | de | 10 | 10 | 0 | 0 | entry count 5; "Zuletzt bearbeitet von p10-alice mit T036 agent · 11.11.2026, 16:28"; "Regeln in Ambulance geändert"; "p10-alice mit T036 agent" |
| V6.3 propagating change of Standard | de | 11 | 11 | 0 | 0 | "T036 message propagated\|null"; entry count 2; "Zuletzt bearbeitet von p10-alice · 11.11.2026, 16:28"; "Regeln in Standard geändert"; "p10-alice" |
| V6.4 approved publish | de | 14 | 14 | 0 | 0 | entry count 2; "Zuletzt bearbeitet von p10-alice, angefragt von T036 agent · 11.11.2026, 16:28"; "Veröffentlicht"; "p10-alice, angefragt von T036 agent"; "Veröffentlicht · p10-alice, angefragt von T036 agent" |
| V6.6 one card at a time: live | de | 5 | 5 | 0 | 0 | "links:closed summary:open activity:closed" |
| V6.6 one card at a time: scheduled | de | 5 | 5 | 0 | 0 | "links:closed summary:open activity:closed" |
| V6.6 one card at a time: deactivated | de | 5 | 5 | 0 | 0 | "links:closed summary:open activity:closed" |
| V6.6 one card at a time: draft | de | 3 | 3 | 0 | 0 | "summary:open activity:closed" |
| V6.6 after "Schedule" | de | 11 | 11 | 0 | 0 | "links:open summary:closed activity:closed"; "links:closed summary:closed activity:open"; entry count 3; "Geplant für den 20.12.2026"; "p10-alice" |
| V6.6 after the edit flow's "Save" | de | 12 | 12 | 0 | 0 | "links:open summary:closed activity:closed"; "links:closed summary:closed activity:open"; entry count 3; "Beschreibung geändert"; "p10-alice" |
| skeleton while loading | de | 4 | 4 | 0 | 0 | skeleton cards (published) 3; skeleton cards (draft) 3 |
| V6.7 seeded list | de | 1 | 1 | 0 | 0 |  |
| V6.7 the oldest by wheel | de | 5 | 5 | 0 | 0 | all entries loaded 66; "18.10.2026, 07:00 · Erstellt · " |
| V6.7 the oldest by keyboard | de | 6 | 6 | 0 | 0 | all entries loaded 66; "18.10.2026, 07:00 · Erstellt · " |
| V6.8 the table | - | 4 | 4 | 0 | 0 | "became_active created deactivated deleted description_changed documents_changed published reactivated renamed restored rules_changed scheduled start_date_changed variant_added variant_removed variant_renamed"; no rule content, message or value in any column 0 |
| teardown | - | 2 | 2 | 0 | 0 |  |

57 rows; 423 measures, 423 pass, 0 fail, 0 unsure.

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
- **T005, the toast's hold** (T005's UNCERTAIN 1–3; the coordinator, phase 2): the single
  `paused` boolean became a reducer that tracks the pointer and the focus apart
  (`Toast/utils.ts`, tested in `utils.test.ts`), since the boolean restarted the time when one
  left while the other stayed, against FR-082's "restarts when both have left"; CLAUDE.md asks for
  a reducer for several state variables. `utils.ts` is the pure helper the brief's sibling test
  needed. The editor's `showDraftSaveFailure` comment was reworded, not only cut. Kept.
- **T006, the `Actor`** (T006's UNCERTAIN 1–4; the coordinator, phase 2): the moved function is
  public as `activity.agent_name()`, imported by `approvals` as `_agent_name` so that its tests'
  monkeypatch stands; direct test calls of `publish_stored_draft()` pass an approval's actor
  (`agent='Test agent', approved=True`), the others `Actor(name=TEST_USERNAME)`; `actor_of()`
  keeps `agent_name()`'s empty name for an OAuth authorization without its client (not reachable
  today: the client's foreign key has no `ON DELETE`); a bearer's call reads its OAuth client once
  before any lock. Kept.
- **T007, the backfill** (T007's UNCERTAIN 1–3; the coordinator, phase 2): the backfilled entries
  take the positions of §2.2's order (`created` 0, `published` 1, `deactivated` 2), so that a
  connection created published lists "Published" above "Created" instead of by the random id;
  `connection_activity.form_connection_id` has its own index beside
  `ix_connection_activity_connection_time` (data-model §2.1, "indexed"; redundant but harmless);
  the two date `UPDATE`s also fill deleted published rows, as §9's statements are written, while
  the entries are only written for rows that are not deleted. Kept (revision `bfd1be13755d`).
- **T008, the views' state** (T008's UNCERTAIN 1–5; the coordinator, phase 2): T008 added
  `URLS_NOTES.scheduled` to `mcp/src/views.ts` with the contract's sentence (`urlsNoteOf()`
  indexes the notes by state, so it needed the key); T029 checks it, and the direct
  `URLS_NOTES[connection.status]` in `mcp/src/tools/approvals.ts` is carried to T029.
  `_step_of()` reads `draft.get('step')`, so a row whose stored draft is `{}` (the search tests')
  answers `step: null`; `_view()` refuses a draft with `not_published`, as `_published_rule_set()`
  already did; the new rows' `activated_at` and `deactivated_at` stay null until T011 writes
  them; the approval tests' date comparisons are carried to T011. The search's `scheduled` filter
  and `deactivated`'s `start_date IS NULL` are not T008's (its line doesn't name them; US1's
  tasks). Kept.
- **The backfill's `published` entry never before `created`** (the coordinator's review of T007,
  decided with the user on 2026-11-11, phase 2): a connection created published (spec 001's path)
  took its `published_at` from Python a few milliseconds before the database's `now()` set its
  `created_at` (53 of the development database's 66 published rows), so the backfill wrote
  "Published" older than "Created" and the newest-first list read them the wrong way round. The
  user chose to edit the uncommitted revision `bfd1be13755d` rather than add a corrective one: its
  `published` INSERT is written at `GREATEST(published_at, created_at)`, `activated_at` keeps
  `published_at`, `test_migration_status_dates.py` covers both cases, data-model §9 states it, and
  the revision was run down and up again on the development and the scratch database.
- **T009 and T010, the activity's core and endpoint** (their UNCERTAIN 1–7; the coordinator,
  phase 2): `changes_between()` answers `Changes`, a `list[Entry]` with `changed: bool`, true also
  when nothing is recorded but the content differs (a variant's description, the variants' order,
  a linked variant's changes that only follow Standard): the example's mark (T064) reads it. A
  linked variant's own rules are its marked items as (id, kind, its own enclosing group or none,
  content), with `changed` and `added` alike (propagation turns one into the other); a `removed`
  item counts by id and place while Standard keeps that item; "position" is the enclosing own
  group, not an index, which propagation moves. Accepted edge: Standard deleting a member of a
  variant's own group so that the group dissolves gives that variant a second entry. A variant
  added with rules of its own also gets `rules_changed`; one added as a plain copy of Standard
  only `variant_added`. `draft_view()` reads `last_activity` through `object_session(row)`
  (carried to T011, which edits its caller in `approvals.py`); `activity.py` imports from
  `form_connections` inside its functions (the modules import each other); each row of the newest
  instant takes at most one entry of an action; the fake backend's `last_activity` is stored per
  fixture and not recomputed from its `activity` map (the MCP's `get_activity` task checks it).
  Kept.
- **T011, recording in every path** (T011's UNCERTAIN 1–4 and notes; the coordinator, phase 2):
  `drafts.delete_draft()` records nothing while it still removes the row (the cascade would remove
  a `deleted` entry in the same commit); T040's shared `_mark_deleted()` records `deleted` for
  drafts too. A publish whose body has no `rules` (only a hand-made API call: the editor and
  `publish_stored_draft()` always send them) gives Standard a new id in `first_rule_set()`, so it
  records `variant_added` Standard and `variant_removed` for the stored variants: what is stored,
  kept. Deactivating and activating test `is_active`, not `state_of()` (T020 extends deactivating
  to scheduled connections). The name-only `PUT` now takes the row lock, as the line says, so a
  rename racing a delete answers `404`. `draft_view(db, row)` takes `db` at every caller (carried
  T010 note done). `published_shape()` in `test_form_connection_drafts.py` leaves out
  `last_activity` (its own id, time and person), and the test of a failed save's configuration
  cleanup finds the last commit by `current_revision == 2`, since `record()` flushes before the
  commit. Observed, unchanged: if an edit makes a revision current while the worker's re-sync waits
  for EUDIPLO, the re-sync's revision becomes current with the older documents (existing
  behaviour); the activity records it as `documents_changed` without a person. ARCHITECTURE.md
  gets the activity in the documentation task (plan, "The last task applies the documentation
  checklist"). Kept.
- **T013, a row whose state's date is missing** (T013's UNCERTAIN 1; the coordinator, phase 3):
  a live row without `published_at`, a scheduled one without `start_date` or a deactivated one
  without `deactivated_at` (the invariants and the backfill rule them out; the types allow null)
  falls back to "Edited <updated_at>", so that the row is never empty (FR-021). The test sets the
  time zone with `vi.stubEnv('TZ', …)`, since the frontend's tsconfig has no Node types. Kept.
- **T014, the status pill** (T014's UNCERTAIN 1–5 and its follow-up's 1–3; the coordinator, phase
  3): the scheduled tone is active's tint and label colour with a hollow dot drawn as an inset
  1.5 px shadow (Firefox computed a 1.5 px border as 1 px); the overview row's scheduled pill is 24
  high like the other three (spec 008's T019 decision), not the 28 the frame's instance draws; the
  details' and the edit flow's header pill read "Scheduled · <date>" (FR-006, audit U86 #23), the
  row "Scheduled" alone; the restore dialog's `state="draft"` was not opened in the browser (it
  needs a stored local draft; the same call as the draft details'). **Plan change**: the scheduled
  header pill scrolled the page sideways at 320 CSS px (scrollWidth 354, German 341), because
  `TopBar`'s `ConnectionPill` kept the badge's wrapper from shrinking; the coordinator added
  `frontend/src/components/TopBar/index.tsx` to T014's files (no task named it; wave 1's other
  batches had finished) and the same agent fixed it at the same level: below `md` the wrapper may
  shrink and the "Where you are" pill grow taller (`max-md:h-auto max-md:min-h-48 max-md:py-8`),
  the badge may wrap its label, and `scheduledOn()` puts a no-break space (U+00A0) before "·" so
  that the date moves to the second line whole. 1440 px is unchanged; one-word labels render as
  before. Kept; the no-break space is carried to T086 and T088.
- **T016, the agents' dates and step** (T016's UNCERTAIN 1–5 and its contract notes; the
  coordinator, phase 3): `get_connection` keeps spec 007's nested `draft: { version, step,
  updated_at }` beside the new top-level `step`; the draft's text line "Draft version N, at the S
  step, last saved X." became "Draft at the S step. Version N, last saved X." so that the
  contract's sentence stands once (only its own test quoted the old one); null dates and a
  published connection's `step` are left out, not sent as null (the contract's `?`), and
  `active_since` is left out while `activated_at` is null; a search item's facts stand on an
  indented second line under its link; the dates are the API's UTC timestamps verbatim (agents
  read English and ISO times). The text writes "Draft at the {step} step." with a full stop, and
  the dates' line as "Published …; active since …; deactivated since …." (data-model §1.4's words);
  `contracts/mcp-tools.md` "Reading" states neither, a wording note for the documentation task
  (T102). Kept.
- **T015, the date pill and the scheduled band** (T015's UNCERTAIN 1–7; the coordinator, phase
  3): T015 also gave the band its `scheduled` tone with the frame's English (U94 `7355:60687`,
  `7355:60688`; S15, which is T025's) so that a scheduled connection doesn't read "Connection
  deactivated"; its German, written by T015 from the glossary's "Ihre Anbindung ist …", "Ihr
  Dienst" and "geplant", is **accepted**: "Ihre Anbindung ist geplant" / "Die Links können
  bereits in Ihren Dienst eingefügt werden. Sie werden am geplanten Datum unten aktiv." (the
  German review, T086 and T097, reads it with the other new pairs; carried to T025, which owns
  the band, with the picture and the icon to check against `7246:52715`). "Activate again" shows
  only while `state` is `deactivated` (FR-016; the server refuses reactivating a scheduled
  connection). A missing date falls back as the row's does (FR-021): a live connection without
  `activated_at` reads "Active since" its `published_at`, a deactivated one without
  `deactivated_at` its `updated_at`, a scheduled one without `start_date` "Edited <date>,
  <time>". At 160 CSS px the calendar and the ⋯ share the first row and the line takes the row
  under them (beside the ⋯ it would have about 4 px); from 320 px up the line wraps beside the
  calendar with the ⋯ on the first row. `DatePill` is a sub-component inside `StatusBand.tsx`
  (T015's files held no new one). The scheduled band's icon is KERN's calendar glyph in white and
  its picture reuses `published-art@2x.png`. At 160 CSS px the ⋯ menu's labels break inside words
  (index.css's narrow rule, as before; the menu stays inside the window). Kept.
- **T017, the walk V5** (T017's UNCERTAIN 1–6; the coordinator, phase 3): between the
  connection-step save and the documents-step save the script adds one document and one rule
  through the API (`PUT …/draft`), since the rules step offers only "Publish without rules"
  without a rule and choosing them isn't what V5 tests; every save V5 measures is the UI's "Save
  and exit". Publishing uses "Now" only: "Active from" is US1's (T023, T024), and SC-003's
  scheduling and start cases are T030's. Before reactivating, the script waits for the minute to
  pass, so that "Active since" changes visibly on the pill. After reactivating, the API answers
  `deactivated_at` null (management-api: "set while deactivated") while the column keeps the old
  value (data-model §1.1); the walk checks both. The expected times are worked out in the
  browser's zone (Europe/Berlin; V5.5 adds America/New_York). V5.2's "save" is a description
  change through the edit flow's "Save" and "Save changes?", the rename the same flow's name
  field. Kept.
- **T019, publishing with a start date** (T019's UNCERTAIN 1–7; the coordinator, phase 4): the
  date is checked by `form_connections.check_start_date()` (None passes) before EUDIPLO, and again
  under both of `create_revision()`'s locks, as the `DraftGuard` is: under the first lock nothing
  is reserved or called yet; under the last lock a refusal deletes the configuration and removes
  the revision. `create_form_connection()` has no row to lock (its row is new): its second check
  runs in the transaction that inserts the row, after EUDIPLO answered. The content's checks come
  before the date's, so a body wrong in both answers the content's `Validation error`.
  `create_revision()` raises `ValueError` for a date without a guard (only a draft's publish takes
  one). The entries' positions follow §2.2's order for the whole action: `published` 0 and
  `scheduled` 1 for an unchanged body, `created` 0 / `published` 1 / `scheduled` 2 for
  `POST /api/form-connections`, and a publish that also changes the content shifts them (e.g.
  `renamed` 0). The mirror is `start_date?: string | null`; `_publish()` sets `activated_at = None`
  explicitly when scheduling. The answer's message stays "Form connection published" / "created".
  The re-checks are pinned: each removed in turn failed its test. Kept; ARCHITECTURE.md's "Form
  connections" gains the date's two checks in the documentation task (T102).
- **T023, "Active from"** (T023's UNCERTAIN 1–7; the coordinator, phase 4): the German placeholder
  is "TT.MM.JJJJ", matching the field's German name "Startdatum (TT.MM.JJJJ)" (copy.md §2's row);
  FR-020 governs how dates read, not the input hint (the frame draws only the English). The hint
  line sits under the radios and the field, 8 px apart, muted 14/24, linked by `aria-describedby`
  on the fieldset; below 640 px the choice moves under the label (as the summary's rows do); below
  320 CSS px the group drops its 16 px indent and the field narrows with 14 px text, so that the
  placeholder isn't cut. `startDateOf()` answers the server's code (`invalid_start_date`), and the
  component words the error from a boolean `error` prop in the current language. The radio and
  error classes copy the rules step's "Start with" radio and the rule editor's `FieldError` (a
  shared component doesn't import from `pages/`); the radio's hover uses KERN's tint, white in this
  overlay, as the existing radio does. Its API: `choice`, `text`, `error`, `errorRole`, `hint`,
  `nowLabel`, `disabled`, `fieldRef`, `onChoiceChange`, `onTextChange`. Kept; the placeholder is
  carried to the German review (T086, T097).
- **T029, the agents' scheduled status** (T029's UNCERTAIN 1–5; the coordinator, phase 4):
  `connectionLineOf(ref, startDate?)` writes "(scheduled from {date})" only where the caller holds
  the date (`search_connections`, `get_connection`, `check_approval`); the drafts, items, checks
  and `request_approval` lines keep "(scheduled)". The fake backend holds a scheduled fixture
  ("Boat licence", start 2026-12-01), which changed two existing search tests' counts.
  `check_approval` fills `{date}` through `urlsNoteOf()` (the carried T008 note, done). The
  guidance names the status, the day in Germany and what the URLs answer; `set_start_date`,
  `start_date` on `publish` / `reactivate`, `start_date_passed` and deactivating or deleting a
  scheduled connection are left to US8's MCP task, which also changes the fake's
  `requestApproval` (it refuses `deactivate` on any inactive row) and `stateAfter()` (a done
  publish or reactivate without a preview reads `live`). A scheduled connection's dates line says
  only "Published …."; the instructions are 393 words. Wording notes for T102: the `status`
  description "Only drafts, scheduled, live or deactivated connections", both tools' "the day a
  scheduled one becomes active", and the instructions' new paragraph. Kept.
- **T024, "Active from" in the publish dialog** (T024's UNCERTAIN 1–5 and its narrow fix; the
  coordinator, phase 4): "Publish without rules?" with "On a date" keeps its own intro ("Without
  rules, anyone who shares these documents can apply."), the date sentence becomes the group's
  hint line, and the button reads "Schedule" (no frame draws the case; FR-002 wants the sentence,
  and the without-rules intro stays). The no-answer sentence shows for a network failure and for a
  `5xx` without the API's envelope (no error ID); a `5xx` with `error_id` shows the slim alert of
  F2 with the server's message and the ID. Each date refusal moves the focus to the date field
  (described by the error, which also has `role="alert"`), since after the server's refusal the
  dialog would otherwise focus its ×. The error clears when the text or the choice changes and
  when a valid date is sent. The edit flow's "Save changes?" failures keep spec 008's look
  (FR-014 names publishing, "Activate again" and "Change start date"). The reducer moved from
  `index.tsx` to `utils.ts`. The German intro "Die Anbindung wird am gewählten Datum aktiv. Sie
  erhalten die Links schon jetzt, damit Ihr Dienst rechtzeitig bereit ist." (from the glossary's
  "Ihr Dienst"; copy for the German review, T086 and T097). Below 320 CSS px the dialog's three
  failure alerts were a few letters wide (kern.css gives `.kern-title` `flex: 1 0 0`, which beats
  index.css's narrow rule): `narrow:[&_.kern-title]:basis-full!` on those three, which also
  changes the edit flow's save failures at that width; other dialogs' `KernAlert`s are an open
  point (§4.3). Kept.
- **T025, the scheduled details and the menu per state** (T025's UNCERTAIN 1–5; the coordinator,
  phase 4): `connectionMenuOf(state)` gives live and scheduled "Change start date", "Deactivate",
  the divider and "Delete connection", deactivated "Delete connection" alone. **Plan change**: P14's
  "Change start date" draws a calendar-pencil glyph that neither KERN nor the repository had; the
  coordinator accepted Figma's export `6529:39066` as the new
  `frontend/src/assets/icons/calendar-pencil.svg` (not in T025's files; no other batch touched the
  folder). The copy buttons of a scheduled connection are enabled through `linksViewOf()`, a copy
  of the connection with `is_active` set from `state !== 'deactivated'`, because
  `ConnectionLinks.tsx` reads `is_active` and isn't T025's: carried to T027, which makes
  `ConnectionLinks` read `state` and drops `linksViewOf()` (a plan change: `ConnectionLinks.tsx`
  joins T027's files). The menu opens as the shared `ActionMenu` places it (spec 008's T021: the
  right edges aligned, 8 px below the ⋯), not P14's left-aligned 4 px, as T015's row already
  decided; the scheduled band's picture sits 12 px lower than drawn, as spec 008's T006 crop is
  shared by every tone (decorative); the band's icon is KERN's `calendar-today` in white, as the
  frame's instance. "Change start date" sets `{ dialog: 'startDate', dialogOpen: true }`; while it
  is set, `ConfirmDialog` stays closed. Kept.
- **T020, moving, starting and cancelling a schedule** (T020's UNCERTAIN 1–8; the coordinator,
  phase 4): every change goes through `_lock_for_start_date()` on `_lock_for_status_change()`,
  which refuses the state the action doesn't apply to and checks the date again under the lock.
  The first `check_start_date()` is each service's first line, so an invalid date answers `400`
  before a `404` or `409` (both checks are pinned by the midnight test); under the lock the order
  is `404`, `not_published`, the approval's snapshot, the state, the date. A scheduled connection
  given the date it already has answers `200` and writes nothing (only the approvals refuse it, at
  request time). The two new `409 status_changed` cases (activating a scheduled connection,
  changing a deactivated one's start) reuse "This connection was deactivated or reactivated in the
  meantime." (copy.md §8 adds none). `POST …/activate` keeps "Form connection activated" also when
  it schedules; `PUT …/start-date` answers "Start date saved". Activating a live connection with a
  date changes nothing, the date still checked. Deactivating calls `cancel_open_requests()` in
  every state, as before, which also catches a late request on a scheduled row. Live → scheduled
  cancels the open requests through the same path. `activateFormConnection(id)` still sends `{}`
  without a date. The approvals are untouched: an approved `reactivate` of a connection scheduled
  meanwhile answers `409 approval_cancelled` (`connection_changed`) instead of a `500`; the rest
  (`_check_preconditions()`, `_stale_reason()`, `expected: StatusSnapshot`, `set_start_date`'s
  snapshot) is T079's line, carried with T020's details. `tests/api/test_agent_principal.py`'s
  access table has no row for `PUT …/start-date` (T020 tested `manage` only): carried to T079,
  whose files gain that test file (a plan change). Kept.
- **T028, the edit flow of a scheduled connection** (T028's UNCERTAIN 1–4; the coordinator, phase
  4): **plan change**: the leave dialog is rendered by `FormConnectionEditor/index.tsx` and the
  discard dialog by `EditorFooter.tsx` from static copy, and only `index.tsx` holds the
  connection, so the coordinator added both files to T028's files during wave 3 (no other batch
  touched the folder): `index.tsx` computes `scheduledStartOf(formConnection)` and passes it to
  `ConnectionStep`, `PublishDialog` and `EditorFooter`, which words the discard text itself
  (rather than a `discardText` prop; one prop for the three). `ScheduledEditProps` lives in
  `FormConnectionEdit/types.ts`. "Save without rules?" for a scheduled connection keeps its own
  intro, only "Save changes?" gets W6's sentence (no document covers the case; as T024's
  publishing case). Saving sends only `name`, `description` and `documents`, and the start date
  stays (checked through the API and `psql`). The German, for the German review (T086, T097):
  "Geplant. Ihre Änderungen werden am <date> aktiv, sobald Sie sie speichern.", "… und behalten
  Sie die geplante Version.", "Die Anbindung kehrt zu der Version zurück, die am <date> aktiv
  wird. Bürgerinnen und Bürger sind davon nicht betroffen."; copy.md §2's German for "Save
  changes?" is used unchanged, though its "sie nicht nutzen" may read as the changes rather than
  the connection (for the review). Kept.
- **T026, "Change start date"** (T026's UNCERTAIN 1–5 and its copy note; the coordinator, phase
  4): the dialog is built on `ConfirmDialog` (480 px; a scrim click closes it) and uses C2's group
  as P1 draws it, not P12's compact layout (§1; the table's rows "decision: C2 — UNCERTAIN 1" cite
  it). Its failures follow T024's: the no-answer sentence for a network failure or a `5xx` without
  `error_id` (`isNoAnswer()`, a `noAnswer` flag beside the page's `error`), the slim alert with the
  server's message and the error ID for a `5xx` with one, and "Couldn’t save the start date" with
  the server's message for a `4xx` (`409 status_changed`, `404`), the page's connection not
  reloaded (FR-014). "Now" on an active connection and a scheduled one's own date close the dialog
  with no request and no toast (FR-009). The busy label is "Saving…" / "Wird gespeichert …" (the
  publish dialog's and the glossary's). The no-answer German follows the glossary's "…, daher hat
  sich nichts geändert." and copy.md §2 was changed to match; the intro's German "Wählen Sie, ab
  wann Bürgerinnen und Bürger diese Anbindung nutzen können." and "Sofort (aktiv seit <date>,
  <time>)" go to the German review (T086, T097). `run(action: RunningAction, startDate)` routes
  `'startDate'` to `setStartDate()`. Kept.
- **T021 and T022, the worker's activation and the search's `scheduled`** (their UNCERTAIN 1–6;
  the coordinator, phase 4): **plan change**: `tests/api/test_worker_requests.py` pins the whole
  `STEPS` tuple, so it gained the new first step (one line; no other backend batch ran). The
  state's SQL conditions are `STATE_CONDITIONS` (public), a dict directly under `state_of()`, each
  pointing to the other, used by the search and by the worker's query; the search's test checks
  that the answered `state` equals the filter for all four values (the SQL is not generated from
  the Python function). `activate_due_connections()` locks with `FOR UPDATE SKIP LOCKED` ordered by
  id, activates every due row of a cycle in one transaction and commits once; the activation
  moves `updated_at` (the column's `onupdate`, as every status change), so a connection that
  became active rises to the top of the overview. The step logs "Activated %d scheduled form
  connections" only when the count is above 0. The comment above `STEPS` numbers them: 1 the
  scheduled starts, 2–9 research R7's, 10–15 the agents' access and the approvals. Each lock and
  condition was pinned by breaking it on purpose. Kept; ARCHITECTURE.md "Background worker" gets
  the new step 1 and the renumbering in T102.
- **T027, the scheduled confirmations and "Activate again"** (T027's UNCERTAIN 1–5; the
  coordinator, phase 4): **plan change**: beside the carried notes' three files
  (`ConnectionLinks.tsx`, `FormConnectionEdit/constants.ts`, `StartDateDialog.tsx`), T027 made
  `ReactivateDialog.tsx` (its own field ref and refusal focus, the failure above the intro, which
  `ConfirmDialog`'s error slot can't place; as `StartDateDialog.tsx`) and `DialogFailureAlert.tsx`
  (T026's `StartDateFailureAlert` moved out, with `title` and `noAnswerText`); the only batch of its
  wave. `ConfirmDialog` now serves delete and deactivate only. `StartDateDialog`'s refusal-focus
  counter keeps in step while closed, so a refusal in the other dialog no longer moves the focus
  when "Change start date" opens. The reactivation's no-answer sentence was added to copy.md §2
  ("Couldn’t reactivate, so nothing has changed. …" / "Die Anbindung konnte nicht reaktiviert
  werden, daher hat sich nichts geändert. …"); its `4xx` title stays "Couldn’t reactivate" with a
  date too. The dialog's intro stays the drawn "Check the summary below. …" with "On a date";
  copy.md §2's sentence is the group's hint (FR-011, as T024 and T026). `deleteDialogCopyOf()`
  keeps its `status` and `is_active` checks with the scheduled case before them, so a scheduled row
  without `start_date` (FR-021's fallback) gets the deactivated body. The toast "Connection
  scheduled for <date>." reads the answered `start_date`. `ConnectionLinks` reads `state` and
  `linksViewOf()` is gone (T025's carried note, done). The German for the review (T086, T097):
  "Diese Anbindung ist ab <date> aktiv. Wenn Sie sie löschen, wird sie nicht aktiv und ihre Links
  funktionieren nicht.", "Diese geplante Anbindung bearbeiten?", "Ihre Änderungen werden erst
  wirksam, wenn Sie sie speichern. Gespeicherte Änderungen werden am <date> aktiv." Observed,
  unchanged: the German edit-entry buttons wrap to 64 px in the 480 px dialog (before this
  feature). Kept.
- **T030, the walk V1–V4** (T030's UNCERTAIN 1–2; the coordinator, phase 4): V3.3's "nobody
  signed in" is measured with cookie-less requests while the browser sat on `about:blank`: a
  made-up pull reference turning from `409` to `404` counts as "the links work", and afterwards
  the trigger answered `201` and both pull URLs `200 pending`; the details' "active" time is read
  by reloading the signed-in browser after that. The copied content gained an empty variant
  "Taxi", so that a variant's pull URL is compared too (`P3 seed live` has only Standard). The
  date was typed `05.12.2026` in English and ` 5.12.2026 ` in German (`D.M.YYYY` with spaces).
  Busy labels were caught by holding the call 1.5 s with `page.route()`. Kept.
- **T032/T033, the activity's sentences and the Activity card** (their UNCERTAIN 1–7; the
  coordinator, phase 5): (1) `activityClosedLineOf()` words "Deactivated by …" only when the state
  is `deactivated` and `last_activity`'s kind is `deactivated`; when the server falls back to the
  newest entry with a person (a deactivated connection without a deactivation entry), the line
  reads "Last edited by …"; without `last_activity` it answers null and the card shows no line.
  (2) An entry's three parts stack below `sm` (640 px), not only below 320 CSS px: at 320 px the
  card's content is about 238 px wide and the drawn 160 px date column leaves the event no room;
  from `sm` up the person column is capped at a third of the row and wraps, and at 1440 the row is
  as drawn (S15 "Narrow" names no width). (3) The list scrolls inside the card at most 400 px high
  (`max-h-400`, ten rows); no frame draws a height. (4) "Loading activity…" and "Loading earlier
  activity…" are a muted 14/24 line in one persistent `role="status"` paragraph, no spinner; the
  failure and "Try again" show inside the card under the entries already loaded. (5) The failure's
  no-answer body reuses the Summary's "Check your connection and try again." (copy.md §3 gained
  the row). (6) The list's keyboard ring uses `!` classes, as `PersonaChip` does: KERN's unlayered
  `[tabindex]` rules otherwise draw a ring on any focus and none on `:focus-visible`. (7) Open, the
  card's toggle shows `DetailAccordion`'s `expand_less`, where the frame draws `expand_more`: it
  keeps what spec 008 built for Links and Summary. The card is built on `DetailAccordion`, its open
  state controlled by the page (`open`, `onToggle`) and its pages dropped when `reloadKey`
  changes (carried to T034). Kept.
- **T035, `get_activity`** (its UNCERTAIN 1–5; the coordinator, phase 5): the last page leaves
  `next_cursor` out, as the contract's `next_cursor?` says (`search_connections` answers `null`);
  `agent` shows whenever the entry's actor has one, `approved: true` only with an agent (copy.md
  §3 words "asked by <agent>" only); the tool reads the connection first for its `ConnectionRef`,
  so a deleted or unknown connection answers `not_found` before the activity is asked; days stay
  ISO `YYYY-MM-DD` and `at` the backend's UTC instant, as the MCP's other answers; the text block's
  own lines ("Activity, newest first:", "No activity yet.", "Earlier entries exist: pass the cursor
  {c}.") are the agent's wording, modelled on `search_connections`. Kept.
- **T034, the three cards as one accordion** (T034's UNCERTAIN 1–4; the coordinator, phase 5):
  (1) the draft's details order Summary → the draft's Links card → Activity, as `7362:54691` draws
  it (S16's "after the Summary" holds); (2) the draft keeps its literal `'summary'` as the first
  open card, `initialAccordionOf()` serving only a published connection's arrivals (`null` →
  Summary, every arrival → Links, so "Schedule" and the edit flow's "Save" land on Links: the one
  changed test expectation, `'saved'`, FR-022, carried from T028); (3) the loading skeleton in
  `FormConnectionDetail/index.tsx` still draws two cards, so the page grows by one card once it
  loads: **plan change**, `index.tsx` joins T036's files for the third `SkeletonAccordion` (the
  story's walk owns its fixes); (4) the header name's ellipsis at 320 CSS px is spec 008's (cf.
  §4.3 "The connection's name in the header at narrow widths"), recorded as a match. `reloadKey` is
  `updated_at`: deactivate, "Activate again" now and on a date, and "Change start date" (another
  date, "Now", a live connection's date) each moved it and caused one `/activity` request with the
  card open; the server's no-change cases send nothing from the UI. Kept.
- **T036, the walk V6** (T036's UNCERTAIN 1–4 and 6; the coordinator, phase 5): most actions
  went through the API with each person's session or the agent's bearer and were read in the
  browser as `p10-alice`; publishing, scheduling, reactivating, the edit flow's "Save" and the
  approval were done in the UI. V6.3's propagation was sent as the editor sends it (Standard's
  rule and the linked variant's unmarked copy in one save), not typed in the rules editor. The
  agent's view was read through `GET …/activity` with the bearer; the MCP's `get_activity` was not
  run (T035's tests pin its words). The walk's times read in Europe/Berlin, T033's table in UTC,
  so V6.7's seeded rows read two hours later here than there (as T036 reports; their October
  instants fall in summer time). One run crashed before its teardown
  and left its token active; the agent revoked it by hand, and no `T036` token remains. The only
  product change was the third skeleton card (T034's plan change). Kept.

### 4.3 Open points

- **The activity's cursor in the access log** (T036's UNCERTAIN 5; for T084): uvicorn's access
  line for `GET /api/form-connections/{id}/activity?cursor=…` carries the cursor, which is
  `urlsafe_b64encode('<occurred_at ISO>|<position>|<id>')` (`activity._encode_cursor()`), so an
  activity entry's instant reaches the log, encoded (27 lines in T036's run; no name, person or
  kind). The design chose "the search's keyset cursor" (research, "Reading"; data-model §2.4), and
  the search's cursor already puts a connection's `updated_at` into the same access lines the same
  way (`form_connections._encode_cursor()`), so it stays within FR-073's "beyond what the
  middleware logs today"; tasks.md's rule "the activity, the names and the dates never reach a
  log line" reads stricter. The coordinator's suggestion: keep it as the search's (FR-073), and
  if the user wants no instant in any access line, make both cursors opaque (e.g. the last
  entry's id alone, its time and position read under the query) in one backend task, with the
  tests of the search and the activity paging. The user decides.

- **The data group "Licence" in German** (T002's UNCERTAIN 4; for T105, before T072): "Führerschein"
  (data-model §6, the glossary's §4 row) is also the name of the document the group sits in;
  T002 proposes "Fahrerlaubnis" or "Führerscheinklassen". Open until T105 asks the user.
- **Spec 009's glossary has two malformed rows** (found by T002; not changed, since T002 changes
  no existing row): the row "the rule editor's field error “Enter a whole number greater than
  0.”" has no third cell, and the row "connection URLs" (spec 009's T042) has a fourth cell that
  holds what reads as the first row's note ("the server's field errors … (added 2026-11-10,
  T038)"). Moving the cell back is a fix to spec 009's record, for the documentation task (T102)
  or the user.
- **The connection's name in the header at narrow widths** (T014's follow-up UNCERTAIN 2 and its
  note; for T084 before T088): at 320 CSS px the two-line "Scheduled · <date>" pill leaves the
  name of "P3 seed scheduled" about 7 px wide (only "P" shows), as the name was already cut for
  long statuses before this feature ("P3 seed deactivated" 4.3 px); at exactly 768 px (`md`) the
  header's name is 0 px wide for a scheduled connection (T014's classes apply only below `md`;
  not caused by this feature, not changed). Whether a name cut to one letter meets FR-072
  ("nothing clipped") is T084's to decide, and T088's sweep then expects it.
- **`KernAlert` titles below 320 CSS px** (T024's note; for the phase 12 sweeps): kern.css gives
  an alert's `.kern-title` `flex: 1 0 0`, which keeps index.css's narrow rule from putting it under
  the icon, so at 160 CSS px a title can be a few letters wide and very tall (T024 measured up to
  1696 px in the publish dialog and fixed its own three alerts). Other dialogs' alerts likely do
  the same; T024 suggests one rule in index.css's narrow block (`.kern-alert__header >
  .kern-title { flex-basis: 100% }`). For the sweep to measure and the task that owns its fixes
  to decide.

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
- 2026-11-11: phase 2, the foundations (T004–T011), each wave's gates green. Test counts after the
  phase: pytest 2234 passed (2161 at the baseline, +73: `start_dates` 7, the actor 5, the
  migration 3, the views' state 5, the activity's core and endpoint 41, the recording 12);
  `rules/` 2642 and `mcp/` 410 (+2) tests; `frontend/` 32 files, 1274 tests (+7, the toast's
  hold). Ruff, mypy (89 files) and the build clean. Migration
  `bfd1be13755d` (the status dates and the activity) applied to the development database
  `template_db`; its backfill was corrected before any commit (§4.2) and run down and up again.
  Waves ran as planned, with no change of level or batch; the coordinator's pytest rerun was
  skipped for wave 6 at the user's word (the agent's full run, green, came after its last edit),
  and Ruff, mypy and the root gates were rerun.
- 2026-11-11: the foundations' checkpoint (T012, the coordinator). The development database
  holds no published connection that isn't deleted (its 66 published rows are all deleted), so
  the browser check ran on a scratch copy (`template_db_010_t012`, a copy of `template_db` run
  down one revision, one live and one deactivated published row of 2026-11-09 brought back, run
  up again) with this checkout's backend on port 3011 (`WORKER_ENABLED=false`) and Vite on 5175,
  signed in as the development account `p10-alice`, in Chromium (`playwright-chrome`). Results:
  the pre-feature live connection "P11 Führerscheinantrag Esslingen" opens as before (one `h1`,
  "Your connection is active", its links); `GET …/activity` answers its backfilled "published"
  above "created", both without a person, and `last_activity` is "published"; the pre-feature
  draft opens as "This connection is a draft". Deactivating through the details' menu wrote
  `deactivated` by `p10-alice` with `deactivated_at`; "Activate again" wrote `reactivated` by
  `p10-alice`, moved `activated_at` and answers `deactivated_at` null; the draft's "Save and exit"
  after removing a document wrote `documents_changed` by `p10-alice`; a rename and a rename back
  of the live connection merged into one `renamed` row, an unchanged `PUT` wrote nothing, and
  no status date moved (FR-018, FR-026). The documents step's "Driving licence removed." toast
  with "Undo" closed after 6011 ms with the pointer elsewhere (FR-082; T005's table holds the
  hover and focus rows). The backend's log of the run (61 lines) holds no name, person, date or
  entry kind; the app configures no logging, so its own INFO lines don't reach that log: the
  phase's diff adds or changes no log call (`git diff` of `backend/app`, and `activity.py` and
  `start_dates.py` log nothing), and no `console.*` was added. Nothing is left for a person.
- 2026-11-11: phase 3, US2 (T013–T017), each wave's root gates green on the combined tree. The
  environment: a scratch copy of the development database, `template_db_010_p3`, with four
  published rows of 2026-11-09 brought back by SQL (`P3 seed live`, `P3 seed live 2`, `P3 seed
  deactivated`, and `P3 seed scheduled` with `start_date` 2026-12-01) beside its three drafts;
  this checkout's backend on port 3011 (`WORKER_ENABLED=false`) and Vite on 5175. From wave 2 on,
  the backend ran with the test suite's fake EUDIPLO (a launcher in the chat's scratchpad that
  sets `eudiplo._client` to `EudiploClient(transport=FakeEudiplo().transport)`), so that the walk
  could publish and save without the hosted EUDIPLO. Test counts after the phase: `rules/` 2642,
  `frontend/` 32 files, 1285 tests (+11: the row's date 4, the date pill 7), `mcp/` 15 files, 419
  tests (+9, the agents' dates and step); no backend file changed, so pytest stays at 2234 and
  was not rerun. Plan changes: T014's files gained `frontend/src/components/TopBar/index.tsx`
  (its 320 px overflow sat there; the same agent fixed it at the same level, §4.2); T015's one
  open row (the scheduled band's German) was closed by the coordinator's decision (§4.2) and
  carried to T025. No level or batch changed. Browsers: T014 found the `playwright-firefox` MCP
  needing Firefox build 1573, which it installed; its first attempt removed
  `~/.cache/ms-playwright/firefox-1569`; T017's scripted `playwright-core` 1.65 installed build
  1572 for itself. A later script pinned to 1569 installs its build again with its own CLI.
  T017 left five live connections named `T017 … renamed` in `template_db_010_p3`.
- 2026-11-11: US2's checkpoint (T018, the coordinator). The root gates green after wave 2
  (`npm run lint`, `npm test` with the counts above, `npm run build`), and no source file changed
  after that run (T017 fixed nothing). T017's walk V5 (§2.2): 480 measures, 480 pass, 0 fail, 0
  unsure, over 12 steps × English and German × Chromium and Firefox. The tables of T013 (37
  rows), T014 (59) and T015 (58) in §2.1 have no open row. The phase's diff adds no `console.*`,
  no inline style, no `any`, no `dark:` and no `focus:`. Nothing is left for a person.
- 2026-11-11: phase 4, US1 (T019–T030), each wave's gates green on the combined tree. The
  environment: a scratch copy of phase 3's database, `template_db_010_p4`; this checkout's backend
  on port 3011 with the test suite's fake EUDIPLO (the launcher in the chat's scratchpad), restarted
  after each backend wave so that the browser tasks ran the code they built on,
  `WORKER_ENABLED=false` for waves 1–4 and `true` for T030; Vite on 5175. No migration in this
  phase (T007's columns carry it). Test counts after the phase: pytest 2319 passed (2234 after
  phase 2, +85: publishing with a date 27, moving, starting and cancelling 43, the worker and the
  search 15), run by T021/T022 after their last edit and not rerun by the coordinator, since no
  backend file changed after it (Ruff, mypy over 90 files and the fixtures' `--check` rerun green);
  `rules/` 2642; `frontend/` 33 files, 1337 tests (+52: "Active from", the publish dialog, the
  scheduled details, "Change start date", the edit flow, the confirmations); `mcp/` 15 files, 427
  tests (+8). Waves ran as planned, with no change of level or batch. **Plan changes** (each in
  §4.2): T025's files gained `frontend/src/assets/icons/calendar-pencil.svg`; T028's gained
  `FormConnectionEditor/index.tsx` and `EditorFooter.tsx` (approved during wave 3); T021's gained
  `backend/tests/api/test_worker_requests.py` (it pins `STEPS`); T027's gained `ConnectionLinks.tsx`
  and `FormConnectionEdit/constants.ts` (carried from T025 and T028), `StartDateDialog.tsx` (T026's
  note) and the new `ReactivateDialog.tsx` and `DialogFailureAlert.tsx`; T079's files gained
  `backend/tests/api/test_agent_principal.py` (carried from T020). T027's labels and selectors went
  to T030 in a file of the chat's scratchpad named in its brief rather than as a fourth carried note
  on the walk's line. copy.md §2 changed twice (T026's "daher", T027's reactivation no-answer
  sentence); §1 gained the "Active from" layout of P12 and P16b. The `rules/` time budgets of
  `performance.test.ts` failed under load in T023, T024, T025 and T020's runs and passed alone, as
  §5 expects. The browser tasks left connections named `T024 …` to `T030 …` in
  `template_db_010_p4`, and screenshots in the repository's git-ignored `.playwright-mcp/`.
- 2026-11-11: US1's checkpoint (T031, the coordinator). The gates are green on both sides: the
  root gates after wave 4 (lint, `npm test` with the counts above, build), and no repository file
  changed after that run (T030 fixed nothing); the backend's Ruff, mypy and pytest as above, and
  `export_check_fixtures --check` current. T030's walk V1–V4 (§2.2): 88 rows over 22 steps ×
  English and German × Chromium and Firefox, 1084 measures, 1084 pass, 0 fail, 0 unsure; SC-001's
  start measured at 0.5–1.3 s for the links and 1.7–2.7 s for the details after the `UPDATE`, one
  worker cycle. The tables of T023 (41 rows), T024 (45), T025 (40), T026 (40), T027 (60) and T028
  (75) in §2.1 have no open row (T026's two rows citing its UNCERTAIN 1 are decided in §1). The
  backend's log of the walk (1379 lines between T030's markers) holds uvicorn's access lines only:
  methods, paths with ids, `<reference>` for the pull references, and statuses; no name, person,
  date or entry kind. The app configures no logging, so its own INFO lines don't reach that log:
  the phase's diff adds four log calls in `backend/app`, each with an id or a count only ("Form
  connection %s scheduled", "… activated", "…: start date saved; %s open requests cancelled",
  "Activated %d scheduled form connections"), the last pinned by T021's test; no `console.*`, no
  inline style, no `any`, no `dark:` and no `focus:` were added. **Left for a person** (tasks.md,
  phase 4 "Needs a person"), so T031 stays open: a screen reader (Orca or NVDA) once over the
  publish dialog's date error (the walk read it only as `role="alert"` with `aria-invalid` and
  `aria-describedby`); a publish on a date against the hosted EUDIPLO (every browser publish of
  T024–T030 ran against the fake); and, optionally, SC-001's minute timed once by hand.
- 2026-11-11: phase 5, US3 (T032–T036), each wave's root gates green on the combined tree. The
  environment: a scratch copy of phase 4's database, `template_db_010_p5`; this checkout's backend
  on port 3011 with the test suite's fake EUDIPLO (the launcher in the chat's scratchpad),
  `WORKER_ENABLED=false`, not restarted during the phase since no backend file changed; Vite on
  5175. Test counts after the phase: `rules/` 2642; `frontend/` 33 files, 1378 tests (+41: the
  activity's sentences and the card's reducer 38, the accordion's arrivals 3); `mcp/` 15 files, 454
  tests (+27, `get_activity`); pytest stays at 2319 and was not rerun (no backend file changed;
  `export_check_fixtures --check` current). Waves ran as planned, with no change of level or
  batch. **Plan change** (§4.2, T034): `frontend/src/pages/FormConnectionDetail/index.tsx` joined
  T036's files for the loading skeleton's third card. T033 checked the card through a temporary
  mount after the Summary of `ConnectionDetails.tsx` and removed it before its gates. copy.md §3
  gained the activity failure's no-answer body (the Summary's sentence, T033). The `rules/` time
  budgets of `performance.test.ts` failed under load in T035's run and the coordinator's wave 2
  run and passed alone, as above. The tasks left connections named `T033 …`, `T034 …` and `T036 …`
  in `template_db_010_p5` (66 seeded entries on `T033 open`), and screenshots in the repository's
  git-ignored `.playwright-mcp/`; T036 revoked every token it made.
- 2026-11-11: US3's checkpoint (T037, the coordinator). The gates are green: the root gates rerun
  by the coordinator after T036's last edit (lint, `npm test` with the counts above, build), and
  `export_check_fixtures --check` current; no backend file changed in the phase, so Ruff, mypy and
  pytest stand as after phase 4. T036's walk V6 (§2.2): 423 measures, 423 pass, 0 fail, 0 unsure,
  over V6.1–V6.8 × English and German in Chromium, plus 320 CSS px rows for the card closed and
  open. The tables of T033 (50 rows) and T034 (62) in §2.1 have no open row. The backend's log of
  the phase (4444 lines) holds uv's and uvicorn's startup lines and uvicorn's access lines only:
  methods, paths with ids, statuses, and 32 `?cursor=…` query strings, which encode an entry's or
  a row's instant (§4.3, for T084); no name, person or entry kind. T036's start and end markers
  were overwritten, because the backend's output was redirected with `>` rather than `>>` (a later
  phase starts it with `>>`). The phase's diff adds no `console.*`, no inline style, no `any`, no
  `dark:` and no `focus:`. **Left for a person** (tasks.md, phase 5 "Needs a person"), so T037
  stays open: a real MCP client (Claude Code or Claude Desktop) signed in through OAuth, whose
  name shows in the card's "<name> with <agent>" after one of its changes (the walk's agent was a
  personal access token, so the agent's name was the token's).

## 6. Closing report
