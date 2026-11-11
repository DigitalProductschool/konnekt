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

### 4.3 Open points

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

## 6. Closing report
