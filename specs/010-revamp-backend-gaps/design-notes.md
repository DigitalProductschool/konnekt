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
- **The documents list's rows have no trash** (bug v5-ui-fixes (B4), 2026-11-18; spec
  Clarification 2026-11-18): R3 `7298:64157` draws the trash on the shown row; the build puts the
  removal into the row's ⋯ ("Remove document", after the divider), which every row has, a single
  document's too. Applies to T058, T059.
- **The dragged copy's opacity is 0.85 in every position** (T059a; the user, 2026-11-11): R1
  `7298:63317` draws 0.85, R2 `7298:63736` 0.75; the build keeps R1's 0.85 while the copy moves.
  Applies to T059, T061.
- **Tokens of the drag** (T059; frame values without a KERN name, U27 `7301:63418` the copy and
  `7301:63416` the drop line): `--shadow-drag-copy: 0 4px 6px 0 rgb(19 21 37 / 0.16)`,
  `--radius-drag-copy: 6px`, `--radius-drop-line: 1px` in `@theme` (`frontend/src/index.css`).
  The copy is placed by `--drag-left`, `--drag-top`, `--drag-width`, `--drag-x` and `--drag-y`,
  set with `style.setProperty` on the list's scroll area (§4.1 call 1).
- **The connection pill grows to two rows between `md` and about 900 px** (T098; T084 (4); the
  coordinator, phase 12): no frame draws 768–1023 px; U03 #39 draws a one-row "Where you are" pill
  in a 64 px header area. So that the header's name keeps at least min(its own width, 96 px) at
  every width, the status pill wraps under the name inside the "Where you are" pill wherever both
  don't fit: below `md`, and between 768 and about 900 px on the details page (where the
  description takes the room) and in the edit flow for a long scheduled name; the pill is then
  72 px high and the header 88 px. 1440 px is unchanged. In the edit flow at those widths the
  pinned step header (`wizard-pinned:top-64`) sits 24 px under an 88 px header, leaving 8 px above
  the step title; nothing is hidden (T098's UNCERTAIN 2), kept.
- **The start date field's unfocused line is `layout-border`** (T106; T087's sweep; SC-009): P1b
  `6380:26675` (U75, "Rules/Number field" `6194:42241`; the same field in S15 and S17) draws the
  1 px line in `decorative-border` `#e1e6f0`, 1.25:1 on white; WCAG 1.4.11 asks 3:1 for a field's
  boundary, so the build draws `--kern-color-layout-border` `#6b7488` (`border-kern-layout-border`;
  4.69:1 on white, 4.29:1 on `#f2f5fb`), the nearest KERN token of the overlay that passes and the
  one the radios beside it already use. Fill, width, radius, size, the error line and the focus
  ring are unchanged. For the designer's list.

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
| E6 `7114:49683` | after saving, EN | 1440 | the stored row | start_date · is_active · activated_at | unchanged: 2027-01-15 · false · null | API: `scheduled`, 2027-01-15, false, null; psql `konnekt_db_010_p4`: 2027-01-15 | f | (null) | match |
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

#### T034: Links, Summary and Activity as one accordion on every details page (S15 "The three cards", S16; FR-022, US3-AS1, US3-AS2; frames V-Active A `7246:51510` (column `7246:51515`, Links `7246:51546`, Summary `7246:52082`, Activity `7246:52089`), the draft's details `7362:54691` (Links `7362:54905`, Activity `7362:54912`); F31, F40; Chromium via the `playwright-chrome` MCP, 1455 px window = 1440 CSS px body; fonts: `document.fonts.check('600 16px "Fira Sans"')`, `('400 14px "Fira Sans"')`, `('600 14px "Fira Sans"')` true; connections made through the API in `konnekt_db_010_p5`: `T034 live`, `T034 status`, `T034 date`, `T034 saved`, `T034 scheduled` (`POST /api/form-connections` from `T033 approved`'s content), drafts `T034 draft`, `T034 publish`, `T034 publish 2`, `T034 schedule at publish` (`POST /api/form-connections/drafts`; the last three published through the UI); the arrivals reached through the real flows (the editor's "Publish without rules" → "Publish connection" / "On a date" → "Schedule", the details' "Edit connection" → the edit flow's "Save" → "Save", the overview's search and row link); the `/activity` requests and the actions' answers counted with `page.on('request' / 'response')`; the narrow rows by `.playwright-mcp/T034/narrow.js` (viewport 320 and 160, overflow by `scrollWidth` and element boxes, not `scrollLeft`); screenshots in `.playwright-mcp/T034/`, not committed)

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

#### T043: "Undo" after a deletion (S4 "After a deletion", "Undo", S3; P18 `6699:48039`, the toast `6699:48098`, "Rules/Toast" type=danger `6718:40958`; W11; design-notes §4.2 T038) — 2026-11-11

Items: FR-033, FR-034, FR-036, FR-037, US4-AS1–AS4. Browser: the `playwright-chrome` MCP at 1455 × 900 (body 1440) for the frame rows; a scripted `playwright-core` Chromium (`<scratchpad>/T043/check.mjs`, `results-*.csv`) for the timing, keyboard, replaced/left, German and narrow rows (320 × 640 and 160 × 320 CSS px). Backend on 3011 (`konnekt_db_010_p6`, T039–T042, `WORKER_ENABLED=false`, restore time 300 s). Data: `T043 live` `7a705397-b94a-4a29-a25b-70fbe175a021`, `T043 scheduled` `b67e5c48-467e-40e6-bce9-b84c260e2417` (2026-12-20), `T043 deactivated` `7a8fddc9-897a-46d4-affb-dc99faa8f226`, `T043 draft` `87984e3f-ced8-4966-80aa-389d17d632fe` (p10-alice), `T043 last live` `aa2f2b71-d75b-4919-832d-20d1ca622963` (made by the account `t043-empty`); all restored at the end. Connections are the team's (every account lists all 140), so "the last connection" was reached with `page.route()` narrowing the list's GET to `T043 last live`; the delete and the restore went to the server. `409 not_restorable` by restoring through the API first (a replayed restore); no answer and a 5xx by `page.route()`. Fonts: `document.fonts.check` true for `400 14px` and `600 14px "Fira Sans"`. Figma calls: 3 (`get_design_context` on `6699:48098` and `6718:40958`, `get_screenshot` on `6699:48039`).

| frame | state | width | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|---|
| P18 `6699:48098` | deleted (overview) | 1440 | toast | fill | `feedback/danger` `#c4271c` | `rgb(196, 39, 28)` | match |
| P18 `6699:48098` | deleted | 1440 | toast | radius, padding, gap | 8, 16, 24 | 8px, 16px, 24px | match |
| P18 `6699:48098` | deleted | 1440 | toast | shadow | "Elevation/Menu" `#13152529` (0, 10) r 28 | `rgba(19, 21, 37, 0.16) 0 10px 28px 0` | match |
| P18 `6699:48039` | deleted | 1440 | toast | position | x 540, y 748, 360 × 56 (frame 900, footer) | y 748, 56 tall, centred; "“T043 live” deleted." 242 wide; the frame's text measured in the page gives 361.3 | match (±1.3, text width, font rendering) |
| `6718:40958` / `6718:40964` | deleted | 1440 | "Icon · delete" | asset, size, place | white "delete" 20 × 20, 8 before the text, centred | `assets/icons/delete-white.svg` (the MCP asset, unchanged), 20 × 20 at x 16, y 18, 8 before the text | match |
| P18 `6699:48098` | deleted | 1440 | message | type | `body/small/regular` 14/24, 400, Fira Sans, white | 400 14px/24px "Fira Sans", `oklch(1 0 0)` | match |
| P18 `6699:48098` | deleted | 1440 | message | text | “Passenger transport licence” deleted. | “T043 live” deleted. | match (FR-033, the name) |
| P18 `6699:48098` | deleted | 1440 | "Undo" | type, gap | `label/small` 14/24, 600, white, underline 8 %, from-font; 24 after the message | 600 14px/24px, white, `underline 8% from-font`, 24 | match |
| P18 `6699:48039` | deleted | 1440 | list | row gone, count | "3 connections", the row not listed | 138 connections, the row gone (from 139) | match |
| P18 `6699:48039` | deleted | 1440 | focus | after the dialog | — | the h1 "Your connections" (spec 008) | match |
| P18 `6699:48039` | deleted | 1440 | list header, row checkboxes, "Edited" dates | select-all, a checkbox per row, "Edited 12.09.2026" | not here: selection is T048; dates by `rowMetaOf` (F23) | not built, T048 / F23 |
| — | restored | 1440 | toast | kind, text | not drawn: `success` (§4.2 T038), "“<name>” restored." (FR-034) | `rgb(29, 122, 46)`, the filled check, "“T043 live” restored.", no action | match |
| — | restored | 1440 | list | row back without a reload | FR-034 | one `POST …/restore`, no list GET; 139 rows equal to the API's list in order (the row back in 4th place by its `updated_at`) | match |
| — | restored | 1440 | focus | after "Undo" | — | the h1, no focus ring after a click (`:focus-visible` false) | match |
| — | not restorable (replayed) | 1440 | toast | kind, text, action | `neutral`, "“<name>” can no longer be restored." (FR-036) | `rgb(11, 18, 32)`, "“T043 scheduled” can no longer be restored.", no icon, no action; the restore answered 409 | match |
| — | not restorable | 1440 | list | changes nothing | FR-036 | 138 rows before and after | match |
| — | failed, no answer | 1440 | toast | kind, text, action | `neutral`, "Couldn’t restore. Try again." with "Undo" (copy.md §4) | `rgb(11, 18, 32)`, that text, "Undo"; 138 rows | match |
| — | failed, 5xx | 1440 | toast | error ID | spec 008: "Error ID: <id>" under the message | "Error ID: abc123def" on its own line, the toast 80 tall | match |
| — | failed → "Undo" again | 1440 | toast, list | restored | FR-034 | "“T043 deactivated” restored.", 139 rows | match |
| — | from the draft's details | 1440 | toast | arrival | FR-033: the same toast | red "“T043 draft” deleted." with "Undo"; router state cleared; focus on the h1; "Undo" → "restored", 139 rows | match |
| — | from the live connection's details (⋯ → Delete) | 1440 | toast | arrival | FR-033 | red "“T043 live” deleted." with "Undo"; "Undo" → "restored"; the connection `live` with its `trigger_url` and `pull_url` | match |
| 1b U11 `6699:44481` | welcome with the toast (last connection) | 1440 | page, toast | FR-037 | the welcome page with the toast | h1 "Welcome to Konnekt", tab "Welcome · Konnekt", the red toast 24 above the window's edge (y 820, `noFooter`) | match |
| 1b → S4 | welcome → "Undo" | 1440 | page | FR-037, US4-AS3 | the overview with the connection | h1 "Your connections", 1 row, green "restored" toast above the footer (y 748) | match |
| — | A left alone | 1440 | toast | closes after 6 s (+ 100 ms live-region delay) | 6.0–6.6 s | 6.30 s, shown at 5.4 s: true | match |
| — | A left alone | 1440 | GET /form-connections/{id} | the deletion stands | 404 | 404 | match |
| — | A left alone | 1440 | list | row stays gone | 0 | 0 | match |
| — | B held by the pointer | 1440 | toast | stays while the pointer is on it | shown after 8 s | “T043 live” deleted. | match |
| — | B held by the pointer | 1440 | toast | closes 6 s after the pointer left | 5.9–6.5 s | 6.30 s | match |
| — | B held by the pointer | 1440 | GET | the deletion stands | 404 | 404 | match |
| — | C keyboard | 1440 | "Undo" | Tab from the footer reaches it, focus-visible | Undo,true | Undo,true | match |
| — | C keyboard | 1440 | toast | stays while the focus is in it | shown after 7 s | “T043 live” deleted. | match |
| — | C keyboard | 1440 | toast | Escape closes it | null | null | match |
| — | C keyboard | 1440 | focus | back where it came from | Create connection | Create connection | match |
| — | C keyboard | 1440 | GET | the deletion stands after Escape | 404 | 404 | match |
| — | C keyboard | 1440 | focus after "Undo" (Enter) | the page heading | H1 Your connections | H1 Your connections | match |
| — | C keyboard | 1440 | h1 | focus ring after a keyboard "Undo" | focus-visible (keyboard modality) | true | match (keyboard modality: the heading takes the ring as after a keyboard delete, spec 008) |
| — | C keyboard | 1440 | GET | restored | 200 | 200 | match |
| — | E replaced | 1440 | toast | the newer deletion replaces it | “T043 scheduled” deleted. | “T043 scheduled” deleted. | match |
| — | E replaced | 1440 | toast | Undo restores the newer one only | “T043 scheduled” restored. | “T043 scheduled” restored. | match |
| — | E replaced | 1440 | GET scheduled | restored | 200 | 200 | match |
| — | E replaced | 1440 | GET deactivated | the replaced deletion stands | 404 | 404 | match |
| — | F left the page | 1440 | toast | gone after leaving and coming back | null | null | match |
| — | F left the page | 1440 | URL | back on the overview | http://localhost:5175/ | http://localhost:5175/ | match |
| — | F left the page | 1440 | list | the draft stays deleted | 0 | 0 | match |
| — | F left the page | 1440 | GET draft | the deletion stands | 404 | 404 | match |
| — | G German | 1440 | toast deleted | text, action, fill | „T043 live“ gelöscht.,Rückgängig,rgb(196, 39, 28) | „T043 live“ gelöscht.,Rückgängig,rgb(196, 39, 28) | match |
| — | G German | 1440 | toast restored | text, fill | „T043 live“ wiederhergestellt.,rgb(29, 122, 46) | „T043 live“ wiederhergestellt.,rgb(29, 122, 46) | match |
| — | G German | 1440 | toast not restorable | text, action, fill | „T043 live“ kann nicht mehr wiederhergestellt werden.,,rgb(11, 18, 32) | „T043 live“ kann nicht mehr wiederhergestellt werden.,,rgb(11, 18, 32) | match |
| — | G German | 1440 | toast failed | text, action, fill | Wiederherstellen nicht möglich. Versuchen Sie es erneut.,Rückgängig,rgb(11, 18, 32) | Wiederherstellen nicht möglich. Versuchen Sie es erneut.,Rückgängig,rgb(11, 18, 32) | match |
| — | deleted | 320 | html | no horizontal scroll | scrollWidth <= 320 | 305 | match |
| — | deleted | 320 | body * | nothing off-screen | 0 | 0 | match |
| — | deleted | 320 | toast | nothing clipped | 0 | 0 | match |
| — | deleted | 320 | h1 | count | 1 | 1 | match |
| — | deleted | 320 | toast vs footer bar | no overlap at the end of the page | toast above or below the bar | bar 568..640, toast 488..544, at end: true | match |
| — | deleted | 320 | toast | inside the viewport (scrolled to the end) | 0 <= x, right <= 320, bottom <= 640 | 31,488,274,544 | match |
| — | deleted | 320 | "Undo" | focus ring after the keyboard (Tab) | focus-visible, solid 2px white, offset 2px | Undo: true solid 2px oklch(1 0 0) 2px | match |
| — | deleted | 320 | "Undo" | no focus ring after a pointer press | focused, not focus-visible | Undo: false | match |
| — | restored | 320 | html | no horizontal scroll | scrollWidth <= 320 | 305 | match |
| — | restored | 320 | body * | nothing off-screen | 0 | 0 | match |
| — | restored | 320 | toast | nothing clipped | 0 | 0 | match |
| — | restored | 320 | h1 | count | 1 | 1 | match |
| — | restored | 320 | toast vs footer bar | no overlap at the end of the page | toast above or below the bar | bar 568..640, toast 488..544, at end: true | match |
| — | restored | 320 | toast | inside the viewport (scrolled to the end) | 0 <= x, right <= 320, bottom <= 640 | 58,488,247,544 | match |
| — | not restorable | 320 | html | no horizontal scroll | scrollWidth <= 320 | 305 | match |
| — | not restorable | 320 | body * | nothing off-screen | 0 | 0 | match |
| — | not restorable | 320 | toast | nothing clipped | 0 | 0 | match |
| — | not restorable | 320 | h1 | count | 1 | 1 | match |
| — | not restorable | 320 | toast vs footer bar | no overlap at the end of the page | toast above or below the bar | bar 568..640, toast 488..544, at end: true | match |
| — | not restorable | 320 | toast | inside the viewport (scrolled to the end) | 0 <= x, right <= 320, bottom <= 640 | 17,488,288,544 | match |
| — | failed (5xx, error ID) | 320 | html | no horizontal scroll | scrollWidth <= 320 | 305 | match |
| — | failed (5xx, error ID) | 320 | body * | nothing off-screen | 0 | 0 | match |
| — | failed (5xx, error ID) | 320 | toast | nothing clipped | 0 | 0 | match |
| — | failed (5xx, error ID) | 320 | h1 | count | 1 | 1 | match |
| — | failed (5xx, error ID) | 320 | toast vs footer bar | no overlap at the end of the page | toast above or below the bar | bar 568..640, toast 416..544, at end: true | match |
| — | failed (5xx, error ID) | 320 | toast | inside the viewport (scrolled to the end) | 0 <= x, right <= 320, bottom <= 640 | 16,416,289,544 | match |
| — | failed (5xx, error ID) | 320 | "Undo" | focus ring after the keyboard (Tab) | focus-visible, solid 2px white, offset 2px | Undo: true solid 2px oklch(1 0 0) 2px | match |
| — | failed (5xx, error ID) | 320 | "Undo" | no focus ring after a pointer press | focused, not focus-visible | Undo: false | match |
| — | welcome with the toast | 320 | h1 | text | Welcome to Konnekt | Welcome to Konnekt | match |
| — | welcome with the toast | 320 | html | no horizontal scroll | scrollWidth <= 320 | 305 | match |
| — | welcome with the toast | 320 | body * | nothing off-screen | 0 | 0 | match |
| — | welcome with the toast | 320 | toast | nothing clipped | 0 | 0 | match |
| — | welcome with the toast | 320 | h1 | count | 1 | 1 | match |
| — | welcome with the toast | 320 | toast | inside the viewport (scrolled to the end) | 0 <= x, right <= 320, bottom <= 640 | 18,560,287,616 | match |
| — | welcome with the toast | 320 | "Undo" | focus ring after the keyboard (Tab) | focus-visible, solid 2px white, offset 2px | Undo: true solid 2px oklch(1 0 0) 2px | match |
| — | welcome with the toast | 320 | "Undo" | no focus ring after a pointer press | focused, not focus-visible | Undo: false | match |
| — | welcome → overview after Undo | 320 | h1 | text | Your connections | Your connections | match |
| — | deleted | 160 | html | no horizontal scroll | scrollWidth <= 160 | 160 | match |
| — | deleted | 160 | body * | nothing off-screen | 0 | 0 | match |
| — | deleted | 160 | toast | nothing clipped | 0 | 0 | match |
| — | deleted | 160 | h1 | count | 1 | 1 | match |
| — | deleted | 160 | toast vs footer bar | no overlap at the end of the page | toast above or below the bar | bar 24..144, toast 160..272, at end: true | match |
| — | deleted | 160 | toast | inside the viewport (scrolled to the end) | 0 <= x, right <= 160, bottom <= 320 | 16,160,129,272 | match |
| — | deleted | 160 | "Undo" | focus ring after the keyboard (Tab) | focus-visible, solid 2px white, offset 2px | Undo: true solid 2px oklch(1 0 0) 2px | match |
| — | deleted | 160 | "Undo" | no focus ring after a pointer press | focused, not focus-visible | Undo: false | match |
| — | restored | 160 | html | no horizontal scroll | scrollWidth <= 160 | 160 | match |
| — | restored | 160 | body * | nothing off-screen | 0 | 0 | match |
| — | restored | 160 | toast | nothing clipped | 0 | 0 | match |
| — | restored | 160 | h1 | count | 1 | 1 | match |
| — | restored | 160 | toast vs footer bar | no overlap at the end of the page | toast above or below the bar | bar 56..176, toast 192..272, at end: true | match |
| — | restored | 160 | toast | inside the viewport (scrolled to the end) | 0 <= x, right <= 160, bottom <= 320 | 16,192,129,272 | match |
| — | not restorable | 160 | html | no horizontal scroll | scrollWidth <= 160 | 160 | match |
| — | not restorable | 160 | body * | nothing off-screen | 0 | 0 | match |
| — | not restorable | 160 | toast | nothing clipped | 0 | 0 | match |
| — | not restorable | 160 | h1 | count | 1 | 1 | match |
| — | not restorable | 160 | toast vs footer bar | no overlap at the end of the page | toast above or below the bar | bar 32..152, toast 168..272, at end: true | match |
| — | not restorable | 160 | toast | inside the viewport (scrolled to the end) | 0 <= x, right <= 160, bottom <= 320 | 16,168,129,272 | match |
| — | failed (5xx, error ID) | 160 | html | no horizontal scroll | scrollWidth <= 160 | 160 | match |
| — | failed (5xx, error ID) | 160 | body * | nothing off-screen | 0 | 0 | match |
| — | failed (5xx, error ID) | 160 | toast | nothing clipped | 0 | 0 | match |
| — | failed (5xx, error ID) | 160 | h1 | count | 1 | 1 | match |
| — | failed (5xx, error ID) | 160 | toast vs footer bar | no overlap at the end of the page | toast above or below the bar | bar -24..96, toast 112..272, at end: true | match |
| — | failed (5xx, error ID) | 160 | toast | inside the viewport (scrolled to the end) | 0 <= x, right <= 160, bottom <= 320 | 16,112,129,272 | match |
| — | failed (5xx, error ID) | 160 | "Undo" | focus ring after the keyboard (Tab) | focus-visible, solid 2px white, offset 2px | Undo: true solid 2px oklch(1 0 0) 2px | match |
| — | failed (5xx, error ID) | 160 | "Undo" | no focus ring after a pointer press | focused, not focus-visible | Undo: false | match |
| — | welcome with the toast | 160 | h1 | text | Welcome to Konnekt | Welcome to Konnekt | match |
| — | welcome with the toast | 160 | html | no horizontal scroll | scrollWidth <= 160 | 160 | match |
| — | welcome with the toast | 160 | body * | nothing off-screen | 0 | 0 | match |
| — | welcome with the toast | 160 | toast | nothing clipped | 0 | 0 | match |
| — | welcome with the toast | 160 | h1 | count | 1 | 1 | match |
| — | welcome with the toast | 160 | toast | inside the viewport (scrolled to the end) | 0 <= x, right <= 160, bottom <= 320 | 16,136,129,272 | match |
| — | welcome with the toast | 160 | "Undo" | focus ring after the keyboard (Tab) | focus-visible, solid 2px white, offset 2px | Undo: true solid 2px oklch(1 0 0) 2px | match |
| — | welcome with the toast | 160 | "Undo" | no focus ring after a pointer press | focused, not focus-visible |
    KonnektDEENSigned in as p10-aliceLog out and discard unsaved work?CloseLogging out deletes the unsaved changes on this device to: . Saved drafts stay as they are.CancelLog outWelcome to KonnektCreate your first connectionLink your services to the EUDI Wallet. Set your own rules and get verified citizen data.Choose documentsSet rulesTestPublishCreate connectionDelete “T043 last live”?CloseThis connection is active. Citizens won’t be able to use it, and its links stop working.Keep connectionDelete connection“T043 last live” deleted.Undo



: false | match |
| — | welcome → overview after Undo | 160 | h1 | text | Your connections | Your connections | match |

#### T048: the checkboxes and the selection bar (S4 "Selection", "Selection bar"; frames: the bar `6699:45199` (`6699:45206`), the select-all `6699:45214`, the row checkbox `6699:45219`; FR-038–FR-040, FR-081, US5-AS1, US5-AS5, US5-AS6; F26, W12, W16, W17) — 2026-11-11

Browser: the `playwright-chrome` MCP, viewport 1455 × 900 (body 1440) for the frame rows, 320 × 640 and 160 × 320 CSS px for the narrow rows; fonts `document.fonts.check('600 16px "Fira Sans"')` and `('600 14px "Fira Sans"')` true. Backend on 3011 (`konnekt_db_010_p7`, phase 6's code), Vite on 5175, account `p10-alice`. Data: `T048 live` `a3da73b8-d762-4b26-92bf-526a35827d89`, `T048 scheduled` `019071c3-c7f3-40dd-920d-61ab99c84f1e` (2026-12-20), `T048 deactivated` `841c5265-4426-430a-91dc-6caad90893e9`, `T048 draft` `7c5338c1-1850-4fa5-9aaf-7a8fdbeb1cdc` (made with phase 6's `make.mjs`; `T048 draft` and `T048 deactivated` deleted once through the UI and restored with "Undo"; all four exist at the end); a local draft "T048 device only" made in the editor for W17 and discarded at the end. The list filtered by "T048" where a row says "under a search". Figma calls: 5 (`get_design_context` on `6699:45206`, `6699:45214`, `6699:45219`; `get_screenshot` on `6699:45199`; `get_metadata` on `6699:45199`). Screenshots in `<scratchpad>/T048/`.

| frame | state | width | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|---|
| `6699:45206` | some (2 of 4) | 1440 | bar | box | x 160, y 176 (body 64 + 112), 1120 × 56 | 160, 176, 1120 × 56 | match |
| `6699:45206` | some | 1440 | bar | background | feedback-info-background #e0f2fe | rgb(224, 242, 254) | match |
| `6699:45206` | some | 1440 | bar | padding, gap, radius | 8 16, 8, none | 8px 16px, 8px, 0 | match |
| `6699:45206` | some | 1440 | count | text | "2 selected" | "2 selected" | match |
| `6699:45206` | some | 1440 | count | font | Fira Sans 600 16/24, ink #0b1220 | "Fira Sans" 600 16px/24px, rgb(11, 18, 32) | match |
| `6699:45206` | some | 1440 | count | role | not drawn (W12: announced) | `p[role=status]`, in the page while nothing is selected (empty) | match (W12) |
| `6699:45206` | some | 1440 | "Cancel" | box | tertiary small, 40 tall, px 8; label px 8 py 4 | 40 tall, padding 0 8px; label 4px 8px; x 1086.3 | match |
| `6699:45206` | some | 1440 | "Cancel" | font | 600 14/24, action #1d56f0, underline | 600 14px/24px, rgb(29, 86, 240), underline | match |
| `6699:45206` | some | 1440 | "Delete" | box | right edge 1264 (bar 1280 − 16), 40 tall, px 16 + label p 8, radius 8 | 1168.5–1264, 40 tall, padding 0 16px, label 8px, radius 8px | match |
| `6699:45206` | some | 1440 | "Delete" | colours, font | feedback-danger #c4271c, white 600 16/24 | rgb(196, 39, 28), white, 600 16px/24px | match |
| `6699:45206` | some | 1440 | "Cancel" → "Delete" | gap | 8 | 1160.5 → 1168.5: 8 | match |
| `6699:45199` | some | 1440 | toolbar | display | hidden while selecting (`6699:45207`) | `display: none` (kept in the page: the count still names the list, the search text stays) | match |
| `6699:45199` | some | 1440 | list card | y | 64 + 184 = 248 (16 under the bar) | header at 249 (card 248 + 1 border) | match |
| `6699:45199` | some | 1440 | column headers | box, background | 1118 × 45 at 161, 249; padding 8 24 | 161, 249, 1118 × 45; 8px 24px; rgb(242, 245, 251) | match |
| `6699:45199` | some | 1440 | header labels | x | Name 229, Status 533, Date 687 | 229, 533, 687 | match |
| `6699:45214` | some | 1440 | select-all | box | 20 × 20 at 185, 261 (header 249 + 8 + 4), radius 4 | 185, 261, 20 × 20, radius 4px | match |
| `6699:45214` | some | 1440 | select-all | mixed | action #1d56f0 fill, white 10 × 2 dash | `indeterminate` true, rgb(29, 86, 240), the dash image (index.css) | match |
| `6699:45214` | none | 1440 | select-all | unchecked | (frame 5: unchecked) | checked false, indeterminate false, white with 1px border | match |
| `6699:45214` | all | 1440 | select-all | checked | not drawn | checked true, indeterminate false, the tick | match (FR-040) |
| `6699:45214` | any | 1440 | select-all | name | layer "Select all" | aria-label "Select all connections" | match (copy.md §4) |
| `6699:45219` | some | 1440 | row checkbox | box | 20 × 20 at 24, 26 + 4 in the 80 row (185, 324) | 185, 324, 20 × 20 | match |
| `6699:45219` | some | 1440 | row checkbox | checked | action #1d56f0 fill, white tick (icon-done-small) | rgb(29, 86, 240), `check-white-small.svg` | match |
| `6699:45219` | some | 1440 | row checkbox | unchecked (`6699:45245`) | white, 1px border | white, 1px rgb(107, 116, 136) | match |
| `6699:45219` | any | 1440 | row checkbox | name | layer "Select <name>" (F26) | aria-label "Select “T048 live”" | match (F26, copy.md §4) |
| `6699:45219` | any | 1440 | row checkbox | target | 20 × 28 (box + 4 above and below) | label 24 × 28 at 183, 320 (2px each side, W16), name still at 229 | match (W16) |
| `6699:45199` | some | 1440 | rows | height, name x | 80, 81; name 229; status 533; date 687 | 80, 81; 229 | match |
| `6699:45199` | some | 1440 | rows' actions | presence | View, Edit, Delete stay | View, Edit, Delete on every row | match (FR-039) |
| `6699:45199` | some | 1440 | "Create connection" | presence | stays (U15 #22, FIGMA-ONLY) | stays, enabled | match |
| `6699:45199` | some | 1440 | screenshot | comparison | `6699:45199` | `some-1440.png`: same layout; the draft row's "Edited … · Rules step" wraps in its 160 column (F23, T013, unchanged) | match |
| — | none | 1440 | toolbar, bar | display | the toolbar | toolbar `flex` with "189 connections"; no bar, the empty status region `sr-only` | match |
| — | one | 1440 | bar | count | "<n> selected" | "1 selected"; select-all mixed | match |
| — | all, no search | 1440 | bar, rows | count | every listed row | "189 selected" of 189 rows; select-all checked | match (FR-040) |
| — | all under a search ("T048") | 1440 | bar, rows | only the listed rows | 4 of 189 | "4 selected", the four T048 rows checked, select-all checked; a second click clears all and the toolbar returns | match (EC-11) |
| — | Cancel | 1440 | toolbar | back with its search text | "4 of 189 connections", "T048" in the field | toolbar `flex`, "4 of 189 connections", field "T048", focus in the field | match (FR-040) |
| — | one → "Delete" | 1440 | dialog | the row's own | FR-041: its own delete dialog | "Delete “T048 live”?" (ConfirmDialog); "Keep connection" gives the focus back to the bar's "Delete" | match |
| — | one → "Delete" → "Delete connection" | 1440 | page | after the deletion | the row gone, the selection cleared, the toolbar back | 3 rows, no bar, toolbar with "T048", focus on the h1, toast "“T048 deactivated” deleted." with "Undo" (restored) | match (FR-044) |
| — | two → "Delete" | 1440 | page | T049's dialog | not built here | nothing opens (`openBulkDelete`, T049's seam) | not built, T049 |
| — | some, a selected row deleted by its own bin | 1440 | bar | prune | the row leaves the selection (EC-12) | "2 selected" → "1 selected"; after "Undo" the row is back unchecked, "1 selected" | match (W12) |
| — | some, local draft (W17) | 1440 | banner, bar | order | banner between the title and the bar | h1 bottom 136, banner 176–258, bar 274–330 (16 apart) | match (W17) |
| — | some, local draft (W17) | 1440 | device-only connection | row, checkbox, count | none | no checkbox named "T048 device only", 4 rows, "2 selected" | match (FR-081) |
| — | some, German | 1440 | bar | texts | "2 ausgewählt", "Abbrechen", "Löschen" (copy.md §1, G§2) | "2 ausgewählt", "Abbrechen", "Löschen"; checkboxes "„T048 live“ auswählen", "Alle Anbindungen auswählen" | match |
| — | none (select-all), some (row checkbox, select-all, "Cancel", "Delete") | 1440 | focus ring | after a click | none | `:focus-visible` false, outline none (each) | match |
| — | the same | 1440 | focus ring | after the keyboard (Shift+Tab, Tab) | the ring | checkboxes 3px solid rgb(11, 18, 32); buttons 4px solid rgb(11, 18, 32) | match |
| — | none | 320 | page | scroll, clipped, h1 | none, none, 1 | 305 ≤ 320; nothing off-screen or outside the card; 1 | match |
| — | none, under a search | 320 | page | scroll, clipped, h1 | none, none, 1 | 305 ≤ 320; none; 1 | match |
| — | one | 320 | page, bar | scroll, clipped, h1, wrap | none, none, 1; buttons under the count | 305 ≤ 320; none; 1; bar 273 × 88, both buttons under "1 selected" | match (W16) |
| — | some | 320 | page, bar | the same | the same | 305 ≤ 320; none; 1; buttons under "2 selected" | match (W16) |
| — | all under a search | 320 | page, bar | the same | the same | 305 ≤ 320; none; 1; buttons under "4 selected" | match |
| — | all, no search | 320 | page, bar | the same | the same | 305 ≤ 320; none; 1; buttons under "189 selected" | match |
| — | Cancel | 320 | page, toolbar | the same; the search text | the same; "T048" | 305 ≤ 320; none; 1; "T048", focus in the field | match |
| — | every state | 320 | row checkbox | target | ≥ 24 px (W16) | 24 × 28 on every row | match (W16) |
| — | every state | 320 | row | layout | rows wrap (card < 63rem) | the checkbox at the top, its box on the name's first line, the parts beside it; the bin wraps to a line of its own | match (W16) |
| — | none (select-all), some (row checkbox, select-all, "Cancel", "Delete") | 320 | focus ring | click / keyboard | none / the ring | none after the click; 3px (checkboxes) and 4px (buttons) after the keyboard | match |
| — | none | 160 | page | scroll, clipped, h1 | none, none, 1 | 160 ≤ 160; none; 1 | match |
| — | none, under a search | 160 | page | the same | the same | 160 ≤ 160; none; 1 | match |
| — | one | 160 | page, bar | scroll, clipped, h1, wrap | none, none, 1; buttons under the count | 160 ≤ 160; none; 1; bar 129 × 136, the buttons under "1 selected" | match (W16) |
| — | some | 160 | page, bar | the same | the same | 160 ≤ 160; none; 1; buttons under "2 selected" | match (W16) |
| — | all under a search | 160 | page, bar | the same | the same | 160 ≤ 160; none; 1; buttons under "4 selected" | match |
| — | all, no search | 160 | page, bar | the same | the same | 160 ≤ 160; none; 1; buttons under "189 selected" | match |
| — | Cancel | 160 | page, toolbar | the same; the search text | the same; "T048" | 160 ≤ 160; none; 1; "T048", focus in the field | match |
| — | every state | 160 | row checkbox | target | ≥ 24 px (W16) | 24 × 28 on every row | match (W16) |
| — | every state | 160 | row | layout | `narrow:` | the checkbox on a line of its own above the parts, which keep the row's width (`some-160.png`) | match (W16) |
| — | none (select-all), some (row checkbox, select-all, "Cancel", "Delete") | 160 | focus ring | click / keyboard | none / the ring | none after the click; 3px and 4px after the keyboard | match |

#### T050: the local-drafts banner against 1m and 1n (S5; FR-081, US5-AS6; F43, R15 V12)

Browser: the `playwright-firefox` MCP, viewport 1440 × 900 (Firefox's overlay scrollbars: `body` 1440 wide, no widening needed); narrow rows at viewports 320 and 160 CSS px (160 = the 320 px window at 200 %, `narrow:`). Account `p10-bob`. Data made: the stored draft `T050 Passenger transport licence draft` (`88d5130e-1763-4105-be4f-e2cb22b57148`, through the API, kept), its local draft (a rule renamed to "T050 age rule" in the edit flow, then the page closed) and a never-saved local draft `T050 Taxi licence` (typed into `/form-connections/new`, then the page closed); both local drafts discarded through the banner at the end. Figma read: `get_design_context` (with its screenshot) on `7362:54550` and `7362:54621`; neither frame changed since the audit (U16's inventory, word for word). Screenshots: `.playwright-mcp/T050/` (git-ignored). No code changed.

| frame | state | width | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|---|
| 1m 7362:54550 | one, EN | 1440 | banner | fill, border, radius | `feedback-default-background` #eef1f6, 1 `decorative-border-level-1` #d0d8e6, 8 | rgb(238, 241, 246), 1px rgb(208, 216, 230), 8px | match |
| 1m 7362:54550 | one, EN | 1440 | banner | padding, gap, align | 16 16 16 20, 16, centre | 16px 16px 16px 20px, column-gap 16px, align-items center | match |
| 1m 7362:54550 | one, EN | 1440 | banner | place, size | 1120 × 82, above the toolbar 16 | x 160 y 176, 1120 × 82; toolbar row 274 (count text at 286) | match |
| 1m 7362:54551 | one, EN | 1440 | text column | position, size | 21 17, 48 high, fills the row | 21 17, 817.07 × 48 | match |
| 1m 7362:54552 | one, EN | 1440 | heading | text | "Unsaved changes in “Passenger transport licence”" | "Unsaved changes in “T050 Passenger transport licence draft”" (h2) | match |
| 1m 7362:54552 | one, EN | 1440 | heading | font, colour, numerals | `title/small` 600 16/24 #0b1220, "zero" "tnum" | 600 16px/24px rgb(11, 18, 32), tabular-nums slashed-zero | match |
| 1m 7362:54553 | one, EN | 1440 | sub-line | text | "Saved only on this device on 06.11.2026, 14:20, when the page closed. Nobody else can see them." | "Saved only on this device on 11.11.2026, 18:58, when the page closed. Nobody else can see them." (the record's time) | match |
| 1m 7362:54553 | one, EN | 1440 | sub-line | font, colour, numerals | `body/small/regular` 400 14/24 #4a5468, "zero" "tnum" | 400 14px/24px rgb(74, 84, 104), tabular-nums slashed-zero | match |
| 1m 7362:54556 | one, EN | 1440 | Discard | visible text, accessible name | "Discard" (layer "Discard changes") | "Discard"; name "Discard changes in T050 Passenger transport licence draft" | F43 |
| 1m 7362:54556 | one, EN | 1440 | Discard | look, size | `button-tertiary-small`: no fill, 600 14/24 #1d56f0 underlined, padding 0 8 + label 4 8, 40 + 4/4 = 48 | transparent, 600 14px/24px rgb(29, 86, 240) underline, 8px + 4px 8px, 79.9 × 40, margins 4/4 | match |
| 1m 7362:54557 | one, EN | 1440 | Resume editing | look, size, place | `button-secondary-small`: 1 #1d56f0, radius 8, 20 px `icon-edit-small`, 600 14/24; 16 after Discard, right edge at the padding | 1px rgb(29, 86, 240), 8px, `kern-icon--edit` 20 × 20 rgb(29, 86, 240), 600 14px/24px; x 1109.97 = 1014.07 + 79.9 + 16, 153.03 wide, right edge 1263 = 1280 − 17 | match |
| 1m 7362:54550 | one, EN | 1440 | item | name and line | (not drawn: the heading names it) | the item's name and "Edited · 11.11.2026, 18:58" `sr-only` (FR-029d) | match |
| 1m 7362:54550 | one, EN | 1440 | screenshot | comparison | Figma render | `.playwright-mcp/T050/1m-en-1440.png`: same parts, order, alignment | match |
| 1m 7362:54552–54557 | one, DE | 1440 | heading, sub-line, buttons | text | (English frame; glossary G "unsaved changes", "Resume editing" → "Fortsetzen", "Discard" → "Verwerfen") | "Nicht gespeicherte Änderungen in „T050 Passenger transport licence draft“"; "Am 11.11.2026, 18:58 beim Schließen der Seite nur auf diesem Gerät gespeichert. Niemand sonst kann sie sehen."; "Verwerfen" (name "Verwerfen der Änderungen in T050 Passenger transport licence draft"), "Fortsetzen"; banner 1120 × 82, one line each | match |
| 1m | one, DE | 1440 | screenshot | comparison | Figma render | `.playwright-mcp/T050/1m-de-1440.png` | match |
| 1n 7362:54621 | several, EN | 1440 | banner | size, padding, place | 1120 × 220, 16 16 16 20, above the toolbar 16 | x 160 y 176, 1120 × 220, 16px 16px 16px 20px; toolbar row 412 | match |
| 1n 7362:54622 | several, EN | 1440 | text block | size, padding | 56 high, padding-bottom 8 | 1082 × 56, 8px | match |
| 1n 7362:54623 | several, EN | 1440 | heading | text, font | "Unsaved changes in 2 connections", 600 16/24 #0b1220 | the same, 600 16px/24px rgb(11, 18, 32) | match |
| 1n 7362:54624 | several, EN | 1440 | sub-line | text, font | "Saved only on this device when the page closed. Nobody else can see them.", 400 14/24 #4a5468 | the same, 400 14px/24px rgb(74, 84, 104) | match |
| 1n 7362:54625, 54630 | several, EN | 1440 | item | divider, padding, gap, height | top 1 #d9dee8, 8 0, 16, 65 | 1px rgb(217, 222, 232), 8px 0, column-gap 16px, 65 (y 249 and 314) | match |
| 1n 7362:54626, 54631 | several, EN | 1440 | item name | font, width | `label/small` 600 14/24 #0b1220, 280 | 600 14px/24px rgb(11, 18, 32), 280 | match |
| 1n 7362:54627 | several, EN | 1440 | item line (stored draft) | text | "Edited · 06.11.2026, 14:20" | "Edited · 11.11.2026, 18:58" | match |
| 1n 7362:54632 | several, EN | 1440 | item line (never saved) | text | "New, never saved · 05.11.2026, 09:12" | "New, never saved · 11.11.2026, 18:58" | match |
| 1n 7362:54627, 54632 | several, EN | 1440 | item line | font, place | 400 14/24 #4a5468, 16 after the name, fills to the buttons | 400 14px/24px rgb(74, 84, 104), x 317 (= 21 + 280 + 16), 521.07 wide, tabular-nums slashed-zero | match |
| 1n 7362:54628, 54633 | several, EN | 1440 | Discard | visible text, accessible name | "Discard" (layers "Discard changes" / "Discard") | "Discard"; names "Discard changes in T050 Taxi licence", "Discard changes in T050 Passenger transport licence draft" | F43 |
| 1n 7362:54628, 54633 | several, EN | 1440 | Discard | look, size | as 1m | transparent, 600 14px/24px rgb(29, 86, 240) underline, 79.9 × 40 + 4/4 | match |
| 1n 7362:54629, 54634 | several, EN | 1440 | Resume editing | look, place | as 1m, 16 after Discard, right edge at the padding | as 1m; x 1109.97, 153.03 wide, right edge 1263 | match |
| 1n 7362:54621 | several, EN | 1440 | items | order | newest first (14:20 above 09:12) | newest first (`T050 Taxi licence` written last, above) | match |
| 1n 7362:54621 | several, EN | 1440 | toolbar count | device-only connection | not counted ("3 connections" with Taxi licence on the device only) | `T050 Taxi licence` not in the list nor the count | match (W17) |
| 1n | several, EN | 1440 | screenshot | comparison | Figma render | `.playwright-mcp/T050/1n-en-1440.png`: same parts, order, alignment | match |
| 1n 7362:54623–54634 | several, DE | 1440 | heading, sub-line, lines, buttons | text | (English frame; glossary rows "Edited · …" → "Bearbeitet · …", "New, never saved · …" → "Neu, nie gespeichert · …") | "Nicht gespeicherte Änderungen in 2 Anbindungen"; "Beim Schließen der Seite nur auf diesem Gerät gespeichert. Niemand sonst kann sie sehen."; "Neu, nie gespeichert · 11.11.2026, 18:58", "Bearbeitet · 11.11.2026, 18:58"; "Verwerfen" (names "Verwerfen der Änderungen in <name>"), "Fortsetzen"; 1120 × 220, items 65 | match |
| 1n | several, DE | 1440 | screenshot | comparison | Figma render | `.playwright-mcp/T050/1n-de-1440.png` | match |
| — | one, EN | 1440 | after "Discard" → "Discard" (of the other item) | focus, status | 005-S4 | focus on the next item's "Resume editing"; status "Unsaved work discarded."; after the last item the section goes and the focus is on the h1 | match |
| narrow | several, EN | 320 | page, banner | h-scroll, h1, clipped, off-screen | none, 1, none, none | `scrollWidth` 320 = `clientWidth` 320; 1 h1; banner 288 wide, padding 20/16; nothing clipped or off-screen; the buttons wrap together under each line (`1n-en-320.png`) | match |
| narrow | several, EN | 320 | Discard | focus ring keyboard / pointer | ring after Tab, none after a press | Tab: `:focus-visible`, 4px solid rgb(11, 18, 32); mouse press: not `:focus-visible`, outline none | match |
| narrow | several, EN | 160 | page, banner | h-scroll, h1, clipped, off-screen | none, 1, none, none | 160 = 160; 1 h1; banner 144 wide, padding 10/8 (narrow block); nothing clipped or off-screen; "Resume editing" wraps to two lines, 124 × 58 (`1n-en-160.png`) | match |
| narrow | several, EN | 160 | Discard | focus ring keyboard / pointer | ring after Tab, none after a press | Tab: ring 4px; press: none | match |
| narrow | several, DE | 320 | page, banner | h-scroll, h1, clipped, off-screen, focus | none, 1, none, none, keyboard only | 320 = 320; 1 h1; nothing clipped or off-screen; "Verwerfen" 97 and "Fortsetzen" 122 in one row; ring after Tab, none after a press | match |
| narrow | several, DE | 160 | page, banner | h-scroll, h1, clipped, off-screen, focus | none, 1, none, none, keyboard only | 160 = 160; 1 h1; nothing clipped or off-screen; the buttons stacked (89, 114 wide); ring after Tab, none after a press | match |
| narrow | one, EN | 320 | page, banner | h-scroll, h1, clipped, off-screen | none, 1, none, none | 320 = 320; 1 h1; banner 288 × 242; the buttons wrap together under the text (`1m-en-320.png`) | match |
| narrow | one, EN | 320 | Discard | focus ring keyboard / pointer | ring after Tab, none after a press | Tab: ring 4px; press: none | match |
| narrow | one, EN | 160 | page, banner | h-scroll, h1, clipped, off-screen | none, 1, none, none | 160 = 160; 1 h1; banner 144 × 444, padding 10/8; nothing clipped or off-screen; "Resume editing" 124 × 58 (two lines) | match |
| narrow | one, EN | 160 | Discard | focus ring keyboard / pointer | ring after Tab, none after a press | Tab: ring 4px; press: none | match |
| narrow | one, DE | 320 | page, banner | h-scroll, h1, clipped, off-screen, focus | none, 1, none, none, keyboard only | 320 = 320; 1 h1; banner 288 × 266; nothing clipped or off-screen; ring after Tab, none after a press | match |
| narrow | one, DE | 160 | page, banner | h-scroll, h1, clipped, off-screen, focus | none, 1, none, none, keyboard only | 160 = 160; 1 h1; banner 144 × 474; nothing clipped or off-screen; ring after Tab, none after a press | match |
| — | — | — | fonts | `document.fonts.check` | Fira Sans 600 16, 400 14, 600 14 | true, true, true | match |

#### T049: the bulk delete dialog and its outcome (S4 "Delete", "After a deletion"; frames: the dialog `6699:45259` (`6699:45320`); FR-041–FR-044, US5-AS2–AS4; F35, W8, W12) — 2026-11-11

Browser: the `playwright-chrome` MCP, 1455 × 900 window (body 1440) for the frame rows; the narrow rows at 320 × 640 and 160 × 320 CSS px viewports (the MCP can't zoom, as T050), snippets in `.playwright-mcp/T049/` of the checkout (`open.js`, `measure.js`, `narrow.js`, `narrow2.js`, `fail.js`, `conflict.js`, `success.js`; screenshots there, not committed). Backend on 3011 (`konnekt_db_010_p7`, `WORKER_ENABLED=false`, restore time 300 s). Account `p10-alice`. Data made through the API (`<scratchpad>/T049/make30.mjs`, ids in `<scratchpad>/T049/made.json`): `T049 live`, `T049 scheduled` (20.12.2026), `T049 deactivated`, `T049 draft`, and `T049 long 01 …` to `T049 long 26 …` (8 live, 3 scheduled, 15 drafts); the overview filtered by "T049". Every deletion was undone; `T049 long 03 live`, deactivated through the API for the 409, was activated again; all 30 rows exist. `409 selection_changed` reached for real (a selected row deactivated, or both selected rows bulk-deleted, through `page.request` while the dialog was open); the 500 with an error ID, no answer and the busy state with `page.route()`; `409 not_restorable` by restoring through the API first. Fonts: `document.fonts.check` true for `400 16px`, `600 16px`, `600 24px "Fira Sans"`. Figma calls: 2 (`get_design_context` on `6699:45320`, `get_screenshot` on `6699:45259`); the frame matches the audit (U15 #23–#28). The toast `6699:48098` not read again: the plural sentence changes only the text, the toast's rows are T043's.

| frame | state | width | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|---|
| `6699:45320` | two rows (active + draft) | 1440 | dialog | box | 480 wide, radius 12, 1px outline inside | 480 × 363 at x 480, radius 12 (ConfirmDialog's frame) | match |
| `6699:45320` | two rows | 1440 | dialog | height | 388 (the warning wraps to two lines with "Fishing licence") | 363 (the warning on one line with "T049 live": 388 − 24 = 364; the footer's 23 + 1 is ConfirmDialog's, spec 008) | match |
| `6699:45320` | two rows | 1440 | header | box | min-h 64, pl 32, pr 8, pt 8; × 48 | 480 × 64; × 48 × 48 at x 904 | match |
| `6699:45320` | two rows | 1440 | title | text, type | "Delete 2 connections?", 24/32 600 #0b1220 | "Delete 2 connections?", 24px/32px 600 rgb(11, 18, 32) | match |
| `6699:45320` | two rows | 1440 | text | text, type | "Their documents and rules will be deleted too.", body/default 16/24 400, text/muted #4a5468 | same text, 16px/24px 400 rgb(74, 84, 104), 416 wide at x 512 | match |
| `6699:45320` | two rows | 1440 | text → summary | gap | 16 | 16 | match |
| `6699:45320` | two rows | 1440 | summary card | border, radius, width | 1px #e1e6f0, radius 8, 416 (full width) | 1px rgb(225, 230, 240), 8px, 416 × 83 | match |
| `6699:45320` | two rows | 1440 | line | padding, gap, divider | 8 16, gap 16, 1px #e1e6f0 under the first | 8px 16px, 16, 1px rgb(225, 230, 240) under the first only; 41 and 40 high | match |
| `6699:45320` | two rows | 1440 | line name | type | label/default 16/24 600 #0b1220 | 16px/24px 600 rgb(11, 18, 32) | match |
| `6699:45320` | two rows | 1440 | line status pill | fill, size | Active #eaf7e6, Draft #e0f2fe, 24 high, right-aligned; fixed widths 75 / 69 in this instance | rgb(234, 247, 230), rgb(224, 242, 254), 24 high, right edge at the line's padding; 72.8 / 66.3 (C1's pill hugs its label, T019's 72.8) | match (C1) |
| `6699:45320` | two rows | 1440 | line order | order | the selected rows | the list's order ("T049 draft" above "T049 live", the overview's order) | match (FR-041) |
| `6699:45320` | two rows | 1440 | summary → warnings | gap | 16 | 16 | match |
| `6699:45320` | two rows | 1440 | warning | icon | "Icon · warning" 20 × 20, #9a4a00, top-aligned | the frame's asset (`assets/icons/warning-amber.svg`), 20 × 20 at the line's top | match |
| `6699:45320` | two rows | 1440 | warning | gap, type, text | 8; label/default 16/24 600, feedback/warning #9a4a00; "<name> is active. Citizens won’t be able to use it." | 8; 16px/24px 600 rgb(154, 74, 0); "T049 live is active. Citizens won’t be able to use it." | match |
| `6699:45320` | two rows | 1440 | footer | box | border-t 1 #e1e6f0, 24 32 32, buttons 48 high, gap 16, equal widths | 480 × 104; buttons 200 × 48 at x 512 and 728 | match (ConfirmDialog, spec 008) |
| `6699:45320` | two rows | 1440 | buttons | text, colours | "Keep connections" secondary (#1d56f0 outline), "Delete connections" danger #c4271c | same texts; outline rgb(29, 86, 240); fill rgb(196, 39, 28) | match |
| `6699:45259` | two rows | 1440 | page | screenshot | scrim over the page, the bar "2 selected" behind | scrim over the page, "2 selected", "Cancel", "Delete" behind; no other difference than the data | match |
| — | two rows | 1440 | dialog | scrim click | doesn't close (FR-042; U15 #28) | still open after a click at (20, 880) | match |
| — | two rows | 1440 | dialog | Escape, ×, "Keep connections" | close, focus back to the bar (FR-042) | each closes; focus on the bar's "Delete" (`:focus-visible` after Escape) | match |
| — | four statuses | 1440 | lines, warnings | text, order | one line each; warnings for active and scheduled in the list's order (FR-041; copy.md §4) | lines draft, deactivated, scheduled, live; "T049 scheduled is scheduled for 20.12.2026. It won’t become active.", "T049 live is active. Citizens won’t be able to use it."; none for draft or deactivated | match |
| — | four statuses, German | 1440 | dialog | texts | copy.md §4, glossary | "4 Anbindungen löschen?", "Die Dokumente und Regeln der Anbindungen werden ebenfalls gelöscht.", pills "Entwurf", "Deaktiviert", "Geplant", "Aktiv", "T049 scheduled ist für den 20.12.2026 geplant. Sie wird nicht aktiv.", "T049 live ist aktiv. Bürgerinnen und Bürger können sie dann nicht mehr nutzen.", "Anbindungen behalten", "Anbindungen löschen" (the buttons' labels wrap to two lines, 567 high) | match |
| — | 30 rows | 1440 | region | scroll | the list scrolls inside, the buttons in view (W12, EC-13) | dialog 862 = the window's limit (900 − 38); region capped at 622 (`--bulk-delete-max`), 1887 tall inside; title, text and buttons (y 801–849) in view; 30 lines, 12 warnings | match |
| — | 30 rows | 1440 | region | keyboard | scrolls with the keyboard | Tab from × focuses the region (`role=group`, named "Delete 30 connections?"); End scrolls it to the end (1265 = its scroll range) | match |
| — | 30 rows | 1440 | region | focus ring | after the keyboard only | after Tab: 4px solid rgb(11, 18, 32), offset 2; after a click: outline none | match |
| — | busy | 1440 | buttons | state | nothing closes it (FR-042) | "Deleting…", both `aria-disabled="true"`; Escape and a scrim click leave it open | match |
| — | busy, German | 1440 | confirm | label | "Wird gelöscht …" | "Wird gelöscht …" | match |
| — | a 500 with an error ID | 1440 | alert | text | spec 008's failure with the error ID (W8) | "Couldn’t delete" / "Something went wrong." / "Error ID: T049-err-1" above the text; confirm "Try again"; the dialog described by the alert and the text; buttons in view | match |
| — | a 500, German | 1440 | alert | text | glossary | "Die Anbindungen konnten nicht gelöscht werden" / … / "Fehler-ID: T049-err-1"; "Erneut versuchen" | match |
| — | no answer | 1440 | alert | text | P5's sentence only without an answer (W8) | "Couldn’t delete" / "Nothing changed. Check your connection and try again." | match |
| — | no answer, German | 1440 | alert | text | glossary | "… / Es wurde nichts geändert. Prüfen Sie Ihre Internetverbindung und versuchen Sie es erneut." | match |
| — | `409 selection_changed` (a selected row deactivated meanwhile) | 1440 | alert | text | "Nothing was deleted: “<name>” was deleted or changed in the meantime." (FR-043, copy.md §4) | "Couldn’t delete" / "Nothing was deleted: “T049 long 03 live” was deleted or changed in the meantime."; the dialog stays open with its rows; confirm "Try again" | match (UNCERTAIN 2, 4) |
| — | `409`, German | 1440 | alert | text | copy.md §4 | "Nichts wurde gelöscht: „T049 long 03 live“ wurde inzwischen gelöscht oder geändert." | match |
| — | `409` | 1440 | list behind | reload | the list shows the current state (FR-043) | `POST /deletions 409` then `GET /form-connections 200`; the row behind reads "Deactivated", "Deactivated 11.11.2026"; no skeleton; the bar stays "2 selected" | match |
| — | `409` | 1440 | focus | after "Keep connections" | back to the bar | the bar's "Delete" | match |
| — | `409`, both rows deleted meanwhile | 1440 | focus | after Escape | — (the bar is gone) | the sentence names the first changed row in the list's order; the selection pruned to none, the toolbar back; Escape puts the focus in the search field (`:focus-visible`) with its text | match (UNCERTAIN 5) |
| `6699:48098` (T043) | deleted | 1440 | toast | kind, text, action | `danger` (§4.2 T038), "<n> connections deleted." (FR-044), "Undo" | rgb(196, 39, 28), the white delete icon, "4 connections deleted.", "Undo"; 263 × 56 centred at y 748 | match |
| — | deleted | 1440 | page | after the deletion | rows gone, selection cleared, toolbar back (FR-044) | the four rows gone ("26 of 215 connections"), the bar's status empty, the toolbar shown with "T049", the dialog closed, the focus on the h1; 201 after 0.39 s | match |
| — | restored | 1440 | toast, list | kind, text | `success`, "<n> connections restored." | rgb(29, 122, 46), the check, "4 connections restored.", no action; all four rows back | match |
| — | not restorable (replayed) | 1440 | toast | kind, text | `neutral`, "The connections can no longer be restored." | rgb(11, 18, 32), no icon, no action, that text | match |
| — | restore without an answer | 1440 | toast | kind, text, action | `neutral`, "Couldn’t restore. Try again.", "Undo" again | rgb(11, 18, 32), that text, "Undo"; "Undo" again → "4 connections restored.", rows back | match |
| — | deleted, German | 1440 | toast | text | "<n> Anbindungen gelöscht." | "4 Anbindungen gelöscht.", "Rückgängig", rgb(196, 39, 28) | match |
| — | restored, German | 1440 | toast | text | "<n> Anbindungen wiederhergestellt." | "4 Anbindungen wiederhergestellt.", rgb(29, 122, 46) | match |
| — | not restorable, German | 1440 | toast | text | "Die Anbindungen können nicht mehr wiederhergestellt werden." | that text, rgb(11, 18, 32) | match |
| — | restore failed, German | 1440 | toast | text | "Wiederherstellen nicht möglich. Versuchen Sie es erneut." | that text, "Rückgängig" | match |
| narrow | two rows (live + scheduled) | 320 | page, dialog | scroll, h1, clipped | none / 1 / none | scrollWidth = clientWidth; 1 h1; nothing outside the 273 px dialog; the pill under the name (name < 120 px beside it) | match |
| narrow | two rows | 320 | dialog | buttons in view | yes | region capped at 242; buttons stacked at y 477–589 of 640 | match |
| narrow | two rows | 320 | buttons | focus ring | after the keyboard, none after a click | "Keep connections" 4px solid after Shift+Tab/Tab; "Delete connections" none after a press | match |
| narrow | 30 rows | 320 | dialog | scroll, h1, clipped, buttons | none / 1 / none / in view | no horizontal scroll; 1 h1; nothing clipped; region 242 of 3111 scrolls; buttons at y 477–589 | match |
| narrow | 30 rows | 320 | region | focus ring | after the keyboard | tabIndex 0, the same ring as at 1440 | match |
| narrow | two rows | 160 | page, dialog | scroll, h1, clipped | none / 1 / none | no horizontal scroll; 1 h1; nothing clipped; the pill under the name | match |
| narrow | two rows, 30 rows | 160 | dialog | buttons in view | — | the window leaves less than 120 px for the region: the region keeps its height and the dialog scrolls as a whole (282 of 1317 / 7241); the buttons are reached by scrolling the dialog (Tab brings them into view) | match (UNCERTAIN 3) |
| narrow | two rows, 30 rows | 160 | buttons | focus ring | after the keyboard, none after a click | 4px solid after Tab; none after a press | match |
| narrow | busy | 320 | dialog | scroll, h1, buttons | none / 1 / in view | none / 1 / "Deleting…" at y 541–589 | match |
| narrow | a 500 with an error ID | 320 | dialog | scroll, h1, clipped | none / 1 / none | none / 1 / none; the alert wraps; with it the region would get 58 px, so the dialog scrolls as a whole (875 in 602) and the buttons are below the fold until scrolled | match (UNCERTAIN 3) |
| narrow | `409` | 320 | dialog | scroll, h1, clipped | none / 1 / none | none / 1 / none; the sentence wraps inside the alert; the dialog scrolls as a whole (819 in 602) | match (UNCERTAIN 3) |
| narrow | busy, a 500, `409` | 160 | dialog | scroll, h1, clipped | none / 1 / none | none / 1 / none for each; the dialog scrolls as a whole; the focused button scrolled into view | match (UNCERTAIN 3) |
| narrow | deleted, restored | 320 | toast | scroll, inside the window | T043's narrow rules | "4 connections deleted." x 21–284, y 488–544; "4 connections restored." x 48–258; no horizontal scroll; 1 h1 | match |
| narrow | deleted, restored | 160 | toast | scroll, inside the window | T043's narrow rules | x 16–129, y 152–312 and 184–312 (wrapped); no horizontal scroll; 1 h1 | match |

#### T058, moving a document without dragging (S8 "Without dragging"; W13, no frame: spec 008's `ActionMenu` as the rules step's and the account page's rows use it, on the row of A9 `7298:61782` as built; FR-047–FR-049, US6-AS3, US6-AS5)

Browser: the `playwright-chrome` MCP (Chromium), Vite 5176 against the backend on 3012 (`konnekt_db_010_p8`), as `p10-alice`. Data made: "T058 live" (`d2dbe99a-c17e-4b43-83c6-ec020067e189`, active, Personal ID + Driving licence, now stored as Driving licence, Personal ID), "T058 draft" (`a0bbdf53-91a8-4a36-992b-9d492de19660`, stored as Driving licence, Personal ID after the walk's save), "T058 one document draft" (`5168264e-4aff-413c-90be-482e28b85f37`, Driving licence only); the create flow "T058 create flow" was never saved and its local draft was discarded. The catalog holds two document types, so no row is a middle row: "Move up" and "Move down" together are pinned by `moveTargetsOf`'s tests. Screenshots in `<SP>/T058/` (01–11 at 1440, `n320-*`, `n160-*`, `one-*`).

| frame | state | width | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|---|
| none (W13; ActionMenu pattern) | draft, two documents | 1440 | each row | ⋯ button | — (W13: ⋯ on each row) | 32×32 `kern-icon--more-vert` 20 px, ink `#0b1220`, after the trash, both boxes touching; the row stays 40 px; since bug v5-ui-fixes (B4), 2026-11-18: no trash, the ⋯ alone at the row's end on every row, a single document's too (a document that needs data: KERN's error icon just before it), the row still 40 px (not re-measured) | W13 |
| none (W13) | draft, two documents | 1440 | ⋯ | accessible name | "Move <document>" (copy.md §5) | "Move Personal ID", "Move Driving licence" | match |
| none (W13) | draft, two documents | 1440 | row's name | room for the name | A9 row, 230 px | 110 px: "Driving licence", "Personal ID", "Personalausweis" (also semibold), "Führerschein" not cut | match |
| none (W13) | menu open, first row (keyboard: Tab, Enter) | 1440 | menu | entries | first row has no "Move up" (FR-047) | "Move down" only; the focus on it (focus-visible fill) | match |
| none (W13) | menu open, last row (keyboard: ArrowDown) | 1440 | menu | entries | last row has no "Move down" | "Move up" only; the focus on it | match |
| none (W13) | menu open | 1440 | menu | placement | ActionMenu: 220 px, 8 below the ⋯, its right edge on the ⋯'s | 220×58, under the ⋯, right-aligned, inside the list card (`end`, `down`) | match |
| none (W13) | after "Move down" by keyboard (Enter) | 1440 | list | order | moved | Driving licence, Personal ID | match |
| none (W13) | after "Move down" by keyboard | 1440 | focus | where | the moved row's ⋯ (S8) | "Move Personal ID", `:focus-visible`, 4 px ring | match |
| none (W13) | after "Move down" by keyboard | 1440 | polite region `#documents-move-status` | text | "“<document>” moved to position <n> of <m>." | "“Personal ID” moved to position 2 of 2." | match |
| none (W13) | after a move | 1440 | open document, pager | FR-048 | stays open, counts in list order | Personal ID stays open; "Document 2 of 2" | match |
| none (W13) | after "Move up" by keyboard (Space) | 1440 | region, focus | text, focus | as above | "“Personal ID” moved to position 1 of 2."; "Move Personal ID" focused | match |
| none (W13) | after "Move up" by mouse | 1440 | focus | ring | none after a click (CLAUDE.md) | "Move Driving licence" focused, `:focus-visible` false, outline none | match |
| none (W13) | after "Move up" by mouse | 1440 | list, pager | FR-048 (US6-AS1's result) | Driving licence, Personal ID; Personal ID open; "Document 2 of 2" | as expected | match |
| none (W13) | menu open, Escape | 1440 | menu, focus | closes | ActionMenu: closes, focus back on ⋯ | closed, "Move Personal ID" focused, order unchanged | match |
| none (W13) | draft, "Save and exit" after the moves | 1440 | stored order | FR-049 | saved with the draft | `GET` answers mdl, pid | match |
| none (W13) | the region before any move | 1440 | `#documents-move-status` | in the page | present before its text changes | `role=status`, `aria-live=polite`, `aria-atomic=true`, `sr-only`, empty | match |
| none (W13) | edit flow of "T058 live" (`/form-connections/<id>/edit`, step "Documents") | 1440 | rows | ⋯ | the same as the create flow (FR-049) | both rows carry the ⋯; Move up by keyboard: order mdl, pid, focus on "Move Driving licence" (focus-visible), "“Driving licence” moved to position 1 of 2.", Personal ID still open, "Document 2 of 2" | match |
| none (W13) | edit flow, Save → dialog → Save | 1440 | stored order, dialog | FR-049, FR-050 | saved with "Save" | the dialog lists "Driving licence · 3 data items", "Personal ID · 4 data items"; `GET` answers mdl, pid | match |
| none (W13) | create flow (`/form-connections/new`), one document added | 1440 | row | ⋯ | none with one document (FR-047) | no `aria-haspopup` button; the region present and empty | match |
| none (W13) | create flow, two documents, Move down by keyboard, then Move down / Move up by mouse | 1440 | order, focus, region | as above | as above | pid, mdl; focus on the moved ⋯; "“Driving licence” moved to position 2 of 2." / "“Personal ID” moved to position 1 of 2." | match |
| none (W13) | create flow, German | 1440 | ⋯ names, entry, region | copy.md §5 German | "<document> verschieben", "Nach oben"/"Nach unten", "„<document>“ auf Position <n> von <m> verschoben." | "Führerschein verschieben", "Personalausweis verschieben", "Nach unten", "„Personalausweis“ auf Position 2 von 2 verschoben." | match |
| none (W13) | one-document draft | 1440 | row | ⋯ | none | no ⋯; Tab from the item reaches "Remove Driving licence" | match |
| none (W13) | two documents, list | 320 | page | h-scroll, h1 | none, 1 | `scrollWidth` 305 ≤ `clientWidth` 320; one `h1` | match |
| none (W13) | two documents, list | 320 | rows | inside the card, name | nothing clipped | rows 33–272 in the card 16–289; ⋯ 232–264; names 119 px, not cut | match |
| none (W13) | menu open, first row (keyboard) | 320 | menu | placement | on screen | `full`, 32–273, opens up above the row (the sticky footer below), "Move down" 223 px | match |
| none (W13) | menu open, last row (keyboard / mouse) | 320 | menu | placement, focus | on screen; ring only after keyboard | 32–273; "Move up"; `:focus-visible` true by keyboard, false by mouse | match |
| none (W13) | after Move down (keyboard) / Move up (mouse) | 320 | focus, region | ring after keyboard only | as at 1440 | moved ⋯ focused, 4 px ring by keyboard, none by mouse; the region's text as above; no h-scroll | match |
| none (W13) | one-document draft | 320 | row | no ⋯, h-scroll | none | no ⋯; no h-scroll; one `h1`; name 151 px | match |
| none (W13) | two documents, list | 160 | rows | layout (`narrow:`) | nothing hidden (W16) | the trash and the ⋯ wrap under the name at the row's end; rows 17–128 in the card 8–137; ⋯ 88–120; name 63 px ("Personal…", `truncate` by design; 23 px before this task); since bug v5-ui-fixes (B4), 2026-11-18: no trash, the ⋯ alone wraps under the name at the row's end (not re-measured) | W16 |
| none (W13) | two documents, list | 160 | page | h-scroll, h1 | none, 1 | `scrollWidth` 160 = `clientWidth` 160; one `h1` | match |
| none (W13) | menu open, first and last row | 160 | menu | placement | on screen | `full`, 24–121 (inside 160); "Move down" / "Move up" wraps to two lines, 79 px | match |
| none (W13) | after Move down (keyboard) / Move up (mouse) | 160 | focus, region | as at 320 | as at 320 | moved ⋯ focused, ring by keyboard only; texts as above; no h-scroll | match |
| none (W13) | one-document draft | 160 | row | no ⋯, layout | nothing hidden | no ⋯; the trash wraps under the name; no h-scroll; one `h1`; since bug v5-ui-fixes (B4), 2026-11-18: no trash; the ⋯, holding only "Remove document", wraps under the name where the trash was (not re-measured) | W16 |

**Since bug v5-ui-fixes (B4), 2026-11-18** (spec Clarification 2026-11-18, FR-047): the row has no
trash, and every row has the ⋯, a single document's too, named "Actions for <document>" /
"Aktionen für <document>". Its entries come from `documentMenuOf()` (`DocumentsStep/utils.ts`):
"Move up" (not on the first row), "Move down" (not on the last), then, after the divider, the red
"Remove document" / "Dokument entfernen" with `kern-icon--delete` and
`danger: true, separated: true`, as the rules step's "Delete rule"; a single document's ⋯ holds
only "Remove document".
`moveTargetsOf()` no longer returns `hasMoveMenu`, and the copy `moveDocumentLabel` and
`removeDocumentLabel` are gone. "Remove document" opens the removal question (F72) unchanged.
`ActionMenu` gives the focus back to the ⋯ before it runs the entry, so "Keep document", Escape, ×
and the scrim leave it on the ⋯; after a confirmed removal it goes to the shown document's list
item, or to "Add document" when none is left, as before. A document that needs data keeps KERN's
error icon, now just before the ⋯, decorative, without the hover swap. The ⋯'s wrapper keeps
`data-no-drag`. The rows above that name the ⋯ "Move <document>" / "<document> verschieben",
find no ⋯ with one document, reach "Remove Driving licence" by Tab, or list a menu without
"Remove document" (its entries and its 220×58 box) record T058's build. Not yet verified in a
browser.

#### T059, dragging a document to its place (S8 "Dragging"; frames R1 `7298:63317` (list `7298:63333`, line `7301:63416`, copy `7301:63418`), R2 `7298:63736` (list `7298:63752`, line `7301:63557`, copy `7301:63559`), R3 `7298:64157` (list `7298:64173`); F22, F25, R6, R15 V2; T059a, the copy's width and opacity (design-notes §4.2, §1); FR-046, FR-048, FR-049, US6-AS1, US6-AS2)

Browsers: the `playwright-chrome` MCP (Chromium) for the per-node comparison at 1440 (a 1455 px window, body 1440; fonts `document.fonts.check('400 14px "Fira Sans"')` and `('600 14px "Fira Sans"')` true) and the narrow rows (viewport 320 and 160 CSS px; snippet `.playwright-mcp/T059/narrow.js`); a scripted `playwright-core` 1.65 (`<SP>/T059/run.mjs` with `drag.mjs`) in Chromium (`/usr/bin/chromium`) and Firefox (build 1572) for the mouse paths (1440 × 900), reduced motion and touch (1024 × 600, `hasTouch`): 85 Chromium rows pass; 82 Firefox rows pass and 3 are "not drivable", rerun after T059a (CSV `<SP>/T059/drag.csv`, summary `<SP>/T059/summary.txt`). Touch in Chromium through CDP `Input.dispatchTouchEvent` (a real touch stream: the browser scrolls and sends `pointercancel`); in Firefox through Juggler's `Page.dispatchTouchEvent` (`windowUtils.synthesizeTouchEvent`, which bypasses APZ: no browser scroll and no browser `pointercancel` can be made, so C6 sends a synthetic `pointercancel` in both browsers). Vite 5176 against the backend on 3012 (`konnekt_db_010_p8`), as `p10-alice`. Data made: "T059 documents draft" (`99f8ab29-04e1-426c-965c-599c93646896`, opens on the documents step), "T059 draft" (`9f2bba5e-b114-4b7d-923a-e93fb7f59999`), "T059 live" (`e88fb493-beca-47e2-ae89-b31824581acf`, active; its edit flow dragged in the script, never saved); all stored as Personal ID, Driving licence (never saved after a drag). The MCP profile's local draft of "T059 documents draft" was discarded through the overview's offer; the scripted contexts were fresh and closed. Screenshots in `<SP>/T059/` (`figma-R1..R3.png`, `R1..R3-1440.png`, after T059a `R1-1440-T059a.png` and `R2-1440-T059a.png`, `n320-R2-right.png`, `n160-R2-right.png`, `n320-*`, `n160-*`, `chromium-A2-R2.png`, `firefox-A2-R2.png`). The catalog has two document types, so the drags run on two rows (design-notes §4.3 "No list has three documents").

| frame | state | width | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|---|
| R1 `7298:63317` | drag starts (Driving licence open, pressed and moved 16, 10) | 1440 | dragged row | in the list | taken out of the list; only the line and the copy (U27 #9; report ui-detail 11) | `li#document-row-mdl` `display: none` while dragging | match |
| R1 | drag starts | 1440 | drop line `7301:63416` | place | under "Personal ID", the dragged row's own place, 4 px below it | `li` at list y 44 (row 0–40, gap 4); line on its own place kept (T057's UNCERTAIN 2: R1 draws one) | match |
| R1 | drag starts | 1440 | drop line | box | 8 high (3 + 2 + 3), full width 230 | `li` 230 × 8, `padding` 3 / 3, bar 230 × 2 | match |
| R1 | drag starts | 1440 | drop line | colour, radius | `--kern-color-action-default` #1d56f0, 1 px | `bg-kern-action-default` rgb(29, 86, 240), `rounded-drop-line` 1px (token `--radius-drop-line`) | match |
| R1 | drag starts | 1440 | Personal ID row | height | 32 (no trash drawn) | 40 (the trash's place kept, spec 008 `DocumentListItem`; T058's rows) | as built, T058 |
| R1, R2 | dragging | 1440 | rows | ⋯ | not drawn | ⋯ on each row (T058) | W13 |
| R1 | drag starts | 1440 | copy `7301:63418` | content | "Doc icon" (car, ink 24) + "Driving licence", 14/24 regular, #0b1220, ellipsis | `driving-licence-ink-24.svg` 24 × 24, "Driving licence", Fira Sans 14 px / 24 px, 400, rgb(11, 18, 32), `text-overflow: ellipsis` | match |
| R1 | drag starts | 1440 | copy | padding, gap, alignment | 4 / 8, gap 8, items-start | 4 8 4 8, gap 8, `align-items: flex-start` | match |
| R1 | drag starts | 1440 | copy | fill, radius, shadow | white, 6 px, drop-shadow 0 4 6 rgba(19,21,37,.16) | oklch(1 0 0) (`bg-kern-layout-background-default`), 6px (`--radius-drag-copy`), `0 4px 6px rgba(19,21,37,.16)` (`--shadow-drag-copy`) | match |
| R1 | drag starts | 1440 | copy | opacity | 0.85 | 0.85 throughout the drag | match |
| R1 | drag starts | 1440 | copy | height | 32 | 32 | match |
| R1 | drag starts | 1440 | copy | width, right edge | 206; right edge 8 px inside the list (list x 222) | 206 (`--drag-width` = 230 − 16 − 8, `dragCopyWidthOf()`); right edge at list x 222 | match (T059a) |
| R1 | drag starts | 1440 | copy | place | list x 16, y 46 (2 below the line) | list x 16, y 54 (2 below the line, whose place is 8 lower with 40 px rows): row box + pointer offset (`--drag-left/top` + `--drag-x/y` 16 / 10); screenshot `R1-1440-T059a.png` | match |
| R1 | drag starts | 1440 | copy | drawn by | "Copy · follows the pointer (drawn by the browser)" | drawn by the page (`position: fixed`, `pointer-events: none`, z-40), no HTML drag and drop | R6 |
| R1 | drag starts | 1440 | open document, pager | stays | Driving licence open, "Document 2 of 2" | `aria-current` on Driving licence, "Document 2 of 2" | match |
| R2 `7298:63736` | over the first place (pressed at row y + 10, moved 48, −38) | 1440 | drop line `7301:63557` | place | above "Personal ID" (list y 0) | line `li` at list y 0, 230 × 8 | match |
| R2 | over the first place | 1440 | Personal ID row | shifted | y 12 (`7298:63753`) | y 12 | match |
| R2 | over the first place | 1440 | copy `7301:63559` | place | list x 48, y 6 | list x 48, y 6 (`--drag-x` 48px, `--drag-y` −38px) | match |
| R2 | over the first place | 1440 | copy | width, right edge, opacity | 172, right edge 8–10 px inside the list; 0.75 | 174 (230 − 48 − 8, the rule T059a sets; the frame draws 2 px less), right edge at list x 222; 0.85 | width match (T059a); opacity T059a (design-notes §1) |
| R2 | over the first place | 1440 | screenshot | comparison | `figma-R2.png` | `R2-1440-T059a.png`: line, Personal ID 12 lower, the copy over it, its right edge inside the card as drawn | match |
| R3 `7298:64157` | dropped | 1440 | list | order | Driving licence, Personal ID | Driving licence, Personal ID | match |
| R3 | dropped | 1440 | Driving licence row | look | selected: hued fill, semibold, trash | rgb(242, 245, 251), 600, trash shown | match |
| R3 | dropped | 1440 | line, copy | present | none | none; the five custom properties removed from the area | match |
| R3 | dropped | 1440 | pager | text | "Document 1 of 2" | "Document 1 of 2" | match |
| none (S8) | dropped | 1440 | focus, polite region | after a drop | the moved row's ⋯, "“<document>” moved to position <n> of <m>." (S8; T058) | "Move Driving licence" focused; `#documents-move-status` "“Driving licence” moved to position 1 of 2." (MCP; the ring showed there because an Escape was the last keyboard input; the script's fresh mouse drop: `:focus-visible` false in Chromium and Firefox) | match |
| none (S8) | drop outside the list (pointer at x 800) | 1440 | order, region | unchanged | FR-046 | pid, mdl unchanged, no line, no copy, region unchanged (Chromium, Firefox) | match |
| none (S8) | Escape while dragging | 1440 | drag, order, focus | ends at once | FR-046 | rows back, no line or copy at once; order unchanged after the release; focus back on the pressed row's button (Chromium, Firefox) | match |
| none (S8) | release on its own place | 1440 | order | unchanged | R1's line, no move | line on its own place, order and region unchanged | match |
| none (S8) | below the last row, inside the area | 1440 | line, move | below the last row | gap n | line after the last row; Personal ID to position 2 of 2 | match |
| none (S8) | drag the row that isn't open | 1440 | open document | FR-048 | stays open | Driving licence stays open; the click after the drag swallowed | match |
| none (S8) | press on the ⋯ or the trash, then move 30+ px | 1440 | drag | none | T058's note | no line, no copy | match |
| none (S8) | a plain click | 1440 | row | opens the document | unchanged behaviour | opens it, no move | match |
| none (S8) | edit flow of "T059 live" (FR-049) | 1440 | drag | as the create flow | the same drag | line and copy while dragging; mdl, pid after the drop; region and focus as above (Chromium, Firefox) | match |
| none (R15 V2) | rows | 1024 | `touch-action` | pan-y | R6 | `pan-y` (Chromium, Firefox) | match |
| none (R15 V2) | touch held 250 ms | 1024 | drag | not yet | 400 ms hold | no line, no copy | match |
| none (R15 V2) | touch held 550 ms, then moved up | 1024 | drag | press and hold, then move (US6-AS2) | drags as with the mouse | R1 state at 550 ms, R2 after the moves, Driving licence first after the release, announced, focus on its ⋯; every touchmove `defaultPrevented` (Chromium 6/6, Firefox 8/8), page `scrollY` 0, no `pointercancel` (Chromium, Firefox) | match |
| none (R15 V2) | short swipe (8 × 15 px up, no hold) | 1024 | page, drag | a short touch scrolls (FR-046) | scrolls, no drag | never dragging, order unchanged, no touchmove prevented (Chromium 7, Firefox 8); Chromium: the page scrolled 138 px and sent `pointercancel:touch`; Firefox: no scroll, since Juggler's synthesized touch bypasses APZ | match (Chromium); Firefox's scroll not drivable, tasks.md Delegation "Needs a person" |
| none (R15 V2) | touch moved 30 px, then held 700 ms | 1024 | drag | `pointercancel` on a scroll ends the wait (R6) | no drag | no drag after 700 ms, order unchanged; Chromium: `pointercancel:touch` seen; Firefox: the early move alone ended the wait (no browser cancel drivable; C6 covers the listener) | match (Chromium); Firefox's browser cancel not drivable, tasks.md Delegation "Needs a person" |
| none (R15 V2) | touch, synthetic `pointercancel` after 100 ms, held 700 ms | 1024 | drag | `pointercancel` ends the wait (R6) | no drag | no drag, order unchanged (Chromium, Firefox) | match |
| none (S8) | a second finger while a touch drags | 1024 | drag, order | a second pointer ends the drag (S8) | ends, order unchanged | no line, no copy after the second `touchStart`; order unchanged (Chromium, Firefox) | match |
| none (S8) | a tap; a held touch released without moving | 1024 | row | tap opens; held release neither moves nor opens | unchanged behaviour | as expected (Chromium, Firefox) | match |
| none (F22) | reduced motion (`reducedMotion: 'reduce'`), dragging | 1440 | rows, their parts, line, copy | computed `transition-duration` | 0 (nothing transitions) | largest 0 s; copy `0s` (Chromium, Firefox) | F22 |
| none (F22) | reduced motion, right after the drop | 1440 | the same | computed `transition-duration` | 0; the drop just updates the list | largest 0 s; order mdl, pid | F22 |
| none (F22) | no preference (reference) | 1440 | the same | computed `transition-duration` | — | largest 0.15 s (the trash's colour, spec 008's `.motion`); line and copy 0 s | match |
| R1 | drag starts | 320 | page | h-scroll, h1 | none, 1 | `scrollWidth` 305 ≤ `clientWidth` 320, one `h1` | match |
| R1 | drag starts | 320 | line, copy, rows | inside the card | nothing clipped or off-screen; copy 8 px inside the row (T059a) | card 16–289; line 33–272; copy 41–264 (223 × 32 = 239 − 8 − 8, name 175 px), row right 272; rows inside | match |
| R2 | over the first place | 320 | line, copy | as at 1440 | line above the first row; copy 8 px inside the row | line at the top, row 12 lower, copy 41–264; no h-scroll; one `h1` | match |
| R2, pointer at the list's right edge | dragging | 320 | copy | floor (T059a) | still shows, never negative | 40 px (`ROW_DRAG_COPY.minWidth`: the 24 px glyph in its 8 px paddings), 240–280 inside the card 16–289; at the viewport's edge (x 319) 289–329, the glyph mostly in view, no h-scroll (fixed) | match (T059a) |
| R2, pointer at the list's right edge | dragging | 160 | copy | floor (T059a) | still shows, never negative | 40 px, 96–136 inside the card 8–137; at x 159: 129–169, no h-scroll | match (T059a) |
| R3 | dropped | 320 | order, focus | moved, ⋯ focused | — | moved; focus on the moved row's ⋯, `:focus-visible` false after the mouse drop; no h-scroll | match |
| R1 | drag starts | 160 | page | h-scroll, h1 | none, 1 | `scrollWidth` 160 = `clientWidth` 160, one `h1` | match |
| R1 | drag starts | 160 | rows, line, copy | inside, two-line rows | nothing clipped; copy 8 px inside the row (T059a) | rows 111 × 80 (T058's two lines) in the card 8–137; line 17–128; copy 25–120 (95 × 32 = 111 − 8 − 8, name 47 px, cut with "…"), row right 128 | match |
| R2 | over the first place | 160 | line, copy | as at 1440 | line above the first row; copy 8 px inside the row | line at the top, row 12 lower; copy 25–120; no h-scroll | match |
| R3 | dropped | 160 | order, focus | moved, ⋯ focused | — | moved; focus on the moved row's ⋯, `:focus-visible` false; no h-scroll; one `h1` | match |
| none | keyboard focus | 320, 160 | the row's controls | focus ring after keyboard focus, none after a click | — | the drag adds no focusable control; the keyboard path (⋯ → "Move up/down") is T058's rows at 320 and 160 | T058 |

**Since bug v5-ui-fixes (B4), 2026-11-18**: the rows have no trash (the note after T058's table;
§1). The rows above that name it record T059's build: R1's row height (still 40, now the ⋯'s 32
plus 8), R3's look (R3 draws the trash on the shown row, no longer built), the press on the trash
(now only the ⋯, whose wrapper keeps `data-no-drag`, starts no drag) and the 0.15 s colour
transition read on the trash. Not re-measured.

#### T066: the example banner against 1h `6798:122695`, 1i `7344:96396`, 1i-c `7344:96451` (C4; FR-058; F29 n/a here, W15)

Browser: the `playwright-chrome` MCP, a 1455 × 900 window (body 1440 wide), narrow rows at viewports 320 and 160 CSS px (160 = the 320 px window at 200 %, `narrow:`). Backend A (3012, `konnekt_db_010_p9`) with Vite A (5176), account `p10-alice`. Data made: the draft `T066 example banner check` (`9af29ff9-fe12-446f-9842-7977ab877e7f`, through the API, P3 seed live's documents and Standard rules, step `connection`; kept). The banner was shown on step 1 of that draft's edit flow behind a temporary `?t066=<key>` flag in `ConnectionStep.tsx`, 16px above the connection card, removed before the gates (T068 places it for real). Figma read: `get_design_context` and `get_screenshot` on the three nodes (6 calls); none changed since the audit (U18 #12, #19, #29; the texts now read exact where the audit had "~"). Screenshots: `.playwright-mcp/T066/` (git-ignored; `{en,de}-{connection,standard,variant}-{1440,320,160}.png`) and the Figma renders in `<scratchpad>/T066/figma-{1h,1i,1ic}.png`. No local draft left behind.

| frame | state | width | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|---|
| 1h 6798:122695 | connection, EN | 1440 | banner | size | 1120 × 42 | 1120 × 42 (x 160) | match |
| 1h 6798:122695 | connection, EN | 1440 | banner | fill | `feedback-info-background` #e0f2fe | rgb(224, 242, 254) | match |
| 1h 6798:122695 | connection, EN | 1440 | banner | border | 1 solid `feedback-info` #0284c7 | 1px solid rgb(2, 115, 174) #0273ae | match (spec 008 §1.5: the overlay's AA value of `feedback-info`, as the findings banner's info look) |
| 1h 6798:122695 | connection, EN | 1440 | banner | radius | 8 | 8px | match |
| 1h 6798:122695 | connection, EN | 1440 | banner | padding | 8 8 8 16 | 8px 8px 8px 16px | match |
| 1h 6798:122695 | connection, EN | 1440 | banner | gap, align | 8, centre | column-gap 8px, align-items center | match |
| 1h 6798:122695 | connection, EN | 1440 | kind icon | glyph, size, colour | `icon-info-small` 20 × 20, `feedback-info` | `kern-icon--info kern-icon--small` 20 × 20 at (177, 227), rgb(2, 115, 174) | match (spec 008 §1.5) |
| 1h 6798:122695 | connection, EN | 1440 | kind icon | accessibility | decorative | `aria-hidden="true"` | match |
| 1h 6798:122695 | connection, EN | 1440 | sentence | font | body/small/regular: Fira Sans 400 14/24, `layout-text-default` #0b1220, letter-spacing 0 | "Fira Sans" 400 14px/24px rgb(11, 18, 32), normal; `document.fonts.check('400 14px "Fira Sans"')` true | match |
| 1h 6798:122695 | connection, EN | 1440 | sentence | numerals | "zero" 1, "lnum" 1, "tnum" 1 | `tabular-nums slashed-zero` (index.css's global rule) | match (spec 008's convention) |
| 1h 6798:122695 | connection, EN | 1440 | sentence | box | x 205 (16 + 1 + 20 + 8), fills the row, 24 high | x 205, 1066 × 24 | match |
| 1h 6798:122695 | connection, EN | 1440 | sentence | text | "This is an example. Change anything to see how it works." | same | match |
| 1h 6798:122695 | connection, EN | 1440 | banner | actions | none (no action, no close) | no focusable element inside | match |
| 1h 6798:122695 | connection, EN | 1440 | banner | role | the findings banner's info variant: none, not a live region | no `role`, no `aria-live` | match |
| 1h 6798:122695 | connection, EN | 1440 | banner | screenshot | Figma render 1120 × 42 | same layout, icon, text and ordering; only the border's colour differs by §1.5 | match |
| 1h 6798:122695 | connection, DE | 1440 | sentence | text, box | (English frame; glossary "Beispiel") | "Dies ist ein Beispiel. Ändern Sie, was Sie möchten, um zu sehen, wie es funktioniert."; one line, 1120 × 42 | match |
| 1i 7344:96396 | Standard, EN | 1440 | banner | size, fill, border, radius, padding, gap | as 1h | 1120 × 42; same computed values as 1h | match (border: spec 008 §1.5) |
| 1i 7344:96396 | Standard, EN | 1440 | kind icon, sentence | box, font | as 1h | icon (177, 227) 20 × 20; text x 205, 1066 × 24, 400 14px/24px rgb(11, 18, 32), tabular-nums slashed-zero | match |
| 1i 7344:96396 | Standard, EN | 1440 | sentence | text | "Try changing the age to 18 or adding a rule. Then use Test rules to check the result." | same | match |
| 1i 7344:96396 | Standard, EN | 1440 | banner | screenshot | Figma render 1120 × 42 | same | match |
| 1i 7344:96396 | Standard, DE | 1440 | sentence | text, box | (English frame; glossary "Regel", "Alter", "Test rules" → „Regeln testen“) | "Versuchen Sie, das Alter auf 18 zu ändern oder eine Regel hinzuzufügen. Prüfen Sie das Ergebnis dann mit „Regeln testen“."; one line, 1120 × 42 | match |
| 1i-c 7344:96451 | variant, EN | 1440 | banner | size, fill, border, radius, padding, gap | as 1h | 1120 × 42; same computed values as 1h | match (border: spec 008 §1.5) |
| 1i-c 7344:96451 | variant, EN | 1440 | sentence | text, numerals | "Ambulance is more lenient than Standard. Rules 01 and 02 are changed here.", slashed zeros | same, tabular-nums slashed-zero (the 0s slashed as drawn) | match |
| 1i-c 7344:96451 | variant, EN | 1440 | banner | screenshot | Figma render 1120 × 42 | same | match |
| 1i-c 7344:96451 | variant, DE | 1440 | sentence | text, box | copy.md §6 "Krankentransport ist weniger streng als Standard. Rule 01 und Rule 02 sind hier geändert." | same; one line, 1120 × 42 | match |
| — | the three tabs' "1" (1i, 1i-c) | 1440 | variant tabs | count | a "1" beside a tab | not part of the banner; T068's | not built, F29 |
| narrow | connection, EN | 320 | page, banner | h-scroll, h1, clipped, off-screen | none, 1, none, none | `scrollWidth` 305 ≤ `clientWidth` 320; 1 h1; banner 273 × 66, padding 8 8 8 16; the sentence 2 lines beside the icon (text x 61, icon x 33); nothing clipped; off-screen only the page's two `sr-only` regions | match |
| narrow | connection, EN | 160 | page, banner | h-scroll, h1, clipped, off-screen | none, 1, none, none | 160 = 160; 1 h1; banner 129 × 162, padding 8 (pl-16 halved by the narrow block); 6 lines beside the icon; nothing clipped | match |
| narrow | Standard, EN | 320 | page, banner | h-scroll, h1, clipped, off-screen | none, 1, none, none | 305 ≤ 320; 1 h1; banner 273 × 90; 3 lines beside the icon; nothing clipped | match |
| narrow | Standard, EN | 160 | page, banner | h-scroll, h1, clipped, off-screen | none, 1, none, none | 160 = 160; 1 h1; banner 129 × 210; 8 lines beside the icon; nothing clipped | match |
| narrow | variant, EN | 320 | page, banner | h-scroll, h1, clipped, off-screen | none, 1, none, none | 305 ≤ 320; 1 h1; banner 273 × 90; 3 lines beside the icon; nothing clipped | match |
| narrow | variant, EN | 160 | page, banner | h-scroll, h1, clipped, off-screen | none, 1, none, none | 160 = 160; 1 h1; banner 129 × 210; 8 lines beside the icon; nothing clipped | match |
| narrow | connection, DE | 320 / 160 | page, banner | h-scroll, h1, clipped | none, 1, none | 305 ≤ 320 / 160 = 160; 1 h1; 3 / 9 lines beside the icon; nothing clipped | match |
| narrow | Standard, DE | 320 / 160 | page, banner | h-scroll, h1, clipped | none, 1, none | 305 ≤ 320 / 160 = 160; 1 h1; 5 / 11 lines beside the icon; nothing clipped | match |
| narrow | variant, DE | 320 / 160 | page, banner | h-scroll, h1, clipped | none, 1, none | 305 ≤ 320 / 160 = 160; 1 h1; 3 / 9 lines beside the icon (at 160 "Krankentransport", wider than the 83px line, breaks inside the word, as the narrow block intends); nothing clipped | match |
| narrow | all three, EN and DE | 320 / 160 | banner | focus ring after keyboard / after click | no focusable element | no focusable element (0 of a, button, input, select, textarea, [tabindex]) | match |

#### T067: the welcome page's "Start from an example" and the example dialog, against 1b `6699:44481` (`6699:44508`, `6793:47828`) and 1g `6793:47676` (`6793:47705`, `6793:47706`, dialog `6793:47710`) (S3; FR-053–FR-055; F24, F28)

Browser: the `playwright-chrome` MCP, a 1455 × 900 window (body 1440 wide), narrow rows at viewports 320 × 640 and 160 × 320 CSS px (160 = the 320 px window at 200 %, `narrow:`). Backend B (3013, `konnekt_db_010_p9_empty`, no connections) with Vite B (5177), account `p10-alice`. Busy and failed states made with `page.route()` on `**/api/form-connections/example` (held; answered `500` with `{error, message, error_id}` in the backend's shape), the backend untouched. Data made: two real examples, `494ffe70-e746-4e08-b395-77cfebef6495` (English; a held request that `unrouteAll` let through) and `2f026d6e-bc94-4a7c-83fe-6e67e1fa0c5a` (German, the success path), both deleted with the overview row's own delete ("Delete connection") at about 23:46 and 23:48; the database then held 0 rows not deleted. No local draft left (localStorage holds only the homepage and language keys). Figma read: `get_design_context` on `6793:47710`, `6793:47828`, `6793:47706`; `get_screenshot` on `6793:47676` and `6699:44481` (5 calls); none changed since the audit (U11 #20, #21; U18 #3–#9). Screenshots: `.playwright-mcp/T067/` (git-ignored): `welcome-{1440,320,160}.png`, `welcome-buttons-{320,160}.png`, `dialog-{1440,320,160}.png`, `dialog-de-1440.png`, `busy-{1440,320,160}.png`, `failed-{1440,320,160}.png`.

| frame | state | width | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|---|
| 1b 6699:44481 | welcome, EN | 1440 | "Start from an example" | text | "Start with an example" | "Start from an example" | F24 |
| 1g 6793:47706 | welcome, EN | 1440 | "Start from an example" | text | "Start from an example" | same | match |
| 1g 6793:47706 | welcome, EN | 1440 | "Start from an example" | kind, role | button-secondary, no icon (the arrow slot 0 × 0) | `button.kern-btn.kern-btn--secondary`, one `kern-label`, no icon | match |
| 1g 6793:47706 | welcome, EN | 1440 | "Start from an example" | height, padding, radius | 48; 0 16; 8 | 48; 0px 16px; 8px | match |
| 1g 6793:47706 | welcome, EN | 1440 | "Start from an example" | border, fill | 1 solid `action-default` #1d56f0; none | 1px rgb(29, 86, 240); transparent | match |
| 1g 6793:47706 | welcome, EN | 1440 | label | font, colour, padding | label/default Fira Sans 600 16/24, #1d56f0, 8 | 600 16px/24px "Fira Sans", rgb(29, 86, 240), 8px; `document.fonts.check('600 16px "Fira Sans"')` true | match |
| 1b 6699:44481 / 1g 6793:47705 | welcome, EN | 1440 | the two buttons | placement | "Create connection →" (primary) at x 208, y 400; the secondary 16 to its right, same row | primary 208, 400, 204.7 × 48; secondary x 428.7 (= 412.7 + 16), y 400, 213 × 48 | match (the 0.7 is the primary's text width, spec 008's) |
| 1b 6699:44481 | welcome, EN | 1440 | card | size | 1120 × 344 at 160, 152 | 1120 × 344 at 160, 152 | match |
| 1b 6699:44481 | welcome, EN | 1440 | page | screenshot | Figma render | same layout, steps, picture, buttons; only the label F24 | match |
| 1g 6793:47705 | welcome, EN | 1440 | "Create connection →" | unchanged | primary with the arrow, `/get-started` | unchanged (spec 008's link) | match |
| 1g 6793:47710 | dialog idle, EN | 1440 | dialog | size, place | 480 wide, centred; 1440 × 900: 480, 310, 480 × 280 | 480, 310, 480 × 280; radius 12 | match |
| 1g 6793:47710 | dialog idle, EN | 1440 | header | padding, min-height | 8 8 0 32, 64 | 8px 8px 0px 32px, 64 | match |
| 1g 6793:47710 | dialog idle, EN | 1440 | title | text, font, box | "Start from an example?", title/large 600 24/32 #0b1220, padding 7 0 9, x 512 | same; 600 24px/32px rgb(11, 18, 32), 7px 0 9px, x 512, y 326 | match |
| 1g 6793:47710 | dialog idle, EN | 1440 | × | size, glyph | 48 × 48 tertiary, icon-close 24 | 48 × 48 at 904, 318, `kern-icon--close`, named "Close" | match |
| 1g 6793:47710 | dialog idle, EN | 1440 | body | padding | 8 32 24 | 8px 32px 24px | match |
| 1g 6793:47710 | dialog idle, EN | 1440 | text | text | "This creates a draft called “Passenger transport licence (example)” with 2 documents and 2 rules. It only becomes active when you publish." | same, typographic quotes | match |
| 1g 6793:47710 | dialog idle, EN | 1440 | text | font, box | body/large 400 18/24 #0b1220, padding 1 0 7, 416 wide, 3 lines | 400 18px/24px rgb(11, 18, 32), 1px 0 7px, 416 × 80 (3 lines) | match |
| 1g 6793:47710 | dialog idle, EN | 1440 | footer | border, padding | top 1 `decorative-border` #e1e6f0; 24 32 32 | 1px rgb(225, 230, 240); 23px 32px 32px (the line inside the 24, ConfirmDialog's) | match |
| 1g 6793:47710 | dialog idle, EN | 1440 | "Go back" | kind, box, label | secondary, flex 1, 48 high, label #1d56f0 | `kern-btn--secondary` 512, 510, 200 × 48, label rgb(29, 86, 240) | match |
| 1g 6793:47710 | dialog idle, EN | 1440 | "Create the example" | kind, box, label | primary #1d56f0, flex 1, 16 after "Go back", label white | `kern-btn--primary` 728, 510, 200 × 48, rgb(29, 86, 240), label white | match |
| 1g 6793:47676 | dialog idle, EN | 1440 | page | screenshot | Figma render (dialog over the scrim) | same dialog, place and scrim; the welcome text behind it wraps as 1b (the frames differ there) | match |
| — | dialog idle, DE | 1440 | dialog | texts | (English frame; glossary "Mit einem Beispiel beginnen", "Beispiel erstellen", "Entwurf", "aktiv", "veröffentlichen") | "Mit einem Beispiel beginnen?", "Dadurch wird ein Entwurf namens „Personenbeförderungsschein (Beispiel)“ mit 2 Dokumenten und 2 Regeln erstellt. Er wird erst aktiv, wenn Sie ihn veröffentlichen.", "Zurück", "Beispiel erstellen", × "Schließen"; 480 × 304, buttons 200 × 48 side by side | match |
| — | welcome, DE | 1440 | "Mit einem Beispiel beginnen" | box | (English frame) | 443.5, 400, 256.8 × 48, one row with "Anbindung erstellen" | match |
| — | dialog, closing | 1440 | "Go back", ×, Escape, scrim click | effect | close without creating anything (FR-054; CLAUDE.md "Dialogs": no delete, no publish) | each closed the dialog; 0 requests to `/form-connections/example` across the four | match |
| — | dialog, closing | 1440 | focus after close | target | back to "Start from an example" | `document.activeElement` "Start from an example" after each of the four | match |
| — | dialog busy, EN | 1440 | buttons | label, state | "Creating…" (copy.md §6), busy | "Close:aria-disabled=true", "Go back:true", "Creating…:true" | match |
| — | dialog busy, EN | 1440 | closing | effect | nothing closes it while it runs | Escape, "Go back", × (forced clicks) and a scrim click: still open | match |
| — | dialog failed, EN | 1440 | alert | title, body, ID | "Couldn’t create the example" with the error ID (spec 008's dialog failures) | KERN danger alert (role alert) above the text: "Couldn’t create the example" (600 18px), the server's message, "Error ID: 3f9c2a7e-…" on its own line; dialog `aria-describedby` = error, text | match |
| — | dialog failed, EN | 1440 | buttons, focus | labels | "Go back", "Try again" | "Go back", "Try again", enabled; the dialog stays open, URL `/` | match |
| — | dialog failed, EN | 1440 | dialog | screenshot | (no frame; ConfirmDialog's failure as the delete dialogs') | alert, text, buttons in view, 480 × 488 | match |
| — | success, DE | 1440 | "Beispiel erstellen" | effect | creates the draft, opens its edit route at step 1 (FR-055) | `/form-connections/2f026d6e-…/edit`, "Schritt 1 von 4", h1 "Benennen Sie Ihre Anbindung", name "Personenbeförderungsschein (Beispiel)" and the description filled; 944 ms click to step 1 (incl. an 800 ms settle) | match |
| — | overview with the example | 1440 | footer, row | actions | "Create connection" only (FR-053; U11 #16) | one link "Create connection", no "Start from an example"; row "Edited 11.11.2026 · Connection step", Draft | match |
| — | welcome, focus | 1440 | "Start from an example" | ring | after Tab: the ring; after a click: none | Tab from "Create connection": `:focus-visible`, outline solid 4px; click open then "Go back" click: focus on it, no `:focus-visible`, outline none | match |
| — | dialog, focus | 1440 | the dialog's controls | order, ring | × → "Go back" → "Create the example", each with the ring | Enter on the button: × focused; Tab "Go back", Tab "Create the example", each `:focus-visible` 4px; a fresh mouse open: × focused without the ring | match |
| narrow | welcome, EN | 320 | page | h-scroll, h1, clipped, off-screen | none, 1, none, none | `scrollWidth` 305 ≤ `clientWidth` 320; 1 h1; nothing clipped or off-screen; the buttons wrap: "Create connection" 205 × 48 at y 696, "Start from an example" 213 × 48 at y 760 (16 under it) | match |
| narrow | welcome, EN | 160 | page | h-scroll, h1, clipped, off-screen | none, 1, none, none | 160 = 160; 1 h1; nothing clipped or off-screen; 105 wide each, the labels on 3 lines ("Start from / an / example") | match |
| narrow | welcome, EN | 320 / 160 | "Start from an example" | focus ring | after the keyboard: yes; after a click: none | Tab: `:focus-visible`, solid 4px rgb(11, 18, 32); after a click (closing by "Go back" click): no `:focus-visible`, none | match |
| narrow | dialog idle, EN | 320 | dialog | h-scroll, h1, clipped, off-screen | none, 1, none, none | 305 ≤ 320; 1 h1 (the page's); dialog 273 × 472, no inner scroll; buttons stacked 209 × 48; nothing clipped or off-screen | match |
| narrow | dialog idle, EN | 160 | dialog | h-scroll, h1, clipped, off-screen | none, 1, none, none | 160 = 160; 1 h1; dialog 113 × 282 scrolls as a whole (864 / 282, ConfirmDialog's); buttons stacked 89 wide; nothing clipped or off-screen | match |
| narrow | dialog idle, EN | 320 / 160 | × | focus after opening | × focused; ring after the keyboard | × focused, `:focus-visible` after Tab + click open (the keyboard's last), none after a fresh click (1440 row) | match |
| narrow | dialog busy, EN | 320 | dialog | h-scroll, h1, clipped, off-screen | none, 1, none, none | 305 ≤ 320; 1 h1; 273 × 472; "Go back" and "Creating…" 209 × 48 stacked; nothing clipped | match |
| narrow | dialog busy, EN | 160 | dialog | h-scroll, h1, clipped, off-screen | none, 1, none, none | 160 = 160; 1 h1; 113 × 282 scrolling as a whole; nothing clipped or off-screen | match |
| narrow | dialog failed, EN | 320 | dialog | h-scroll, h1, clipped, off-screen | none, 1, none, none | 305 ≤ 320; 1 h1; 273 × 602 (824 scrolls as a whole); alert 209 × 336, the ID wraps anywhere; nothing clipped | match |
| narrow | dialog failed, EN | 160 | dialog | h-scroll, h1, clipped, off-screen | none, 1, none, none | 160 = 160; 1 h1; 113 × 282 scrolling; alert 89 wide, words broken by the narrow block; nothing clipped or off-screen | match |

#### T068: the example's banners in the steps and its line in the publish dialog, against step 1 `6793:47711`, the rules step `7344:96387`, `7344:96414`, `7344:96442`, the publish dialog `7137:50083` (`7137:50210`) (S7–S13 "the example's banners", S14 "The example's line"; FR-056, FR-058–FR-060; F29, F30, W15)

Browser: the `playwright-firefox` MCP, viewport 1440 × 900 (body 1440 wide; Firefox reserves no scrollbar gutter here), narrow rows at viewports 320 × 640 and 160 × 400 CSS px (160 = the 320 px window at 200 %, `narrow:`). Backend A (3012, `konnekt_db_010_p9`) with Vite A (5176), account `p10-alice`. Data made with `POST /api/form-connections/example` (all kept, all named as the example): **A** `1cf89703-565b-47e4-bde4-f002429d9a39` (English, `example: 'unchanged'`, untouched: the walk's unchanged example), **D** `cf375719-dfad-4fc8-8cdd-30b28c5fe1af` (created with `Accept-Language: de`, `unchanged`), **B** `b20da9cc-fc87-47c3-bdfe-fb87f46121e3` (English, then saved through `PUT /{id}/draft` with a third variant "School transport" (a copy of Ambulance's rules): `example: 'changed'`). Published edit flow checked on `P3 seed live` (`842ede60-…`, not changed). Figma read: `get_metadata` on `6793:47711`, `7344:96387`, `7344:96442`; `get_design_context` on `7137:50210`; `get_screenshot` on `6793:47711`, `7344:96387`, `7344:96414`, `7137:50083` (8 calls). The rules frames no longer draw the "1" beside a tab (the audit read one, F29 said Figma removes it): the change is F29's own, so the frames were built (UNCERTAIN 1 in T068's report). Scripted measures: `.playwright-mcp/T068/walk.js`, `walk2.js` (git-ignored); screenshots `.playwright-mcp/T068/en-{connection,documents,rules-standard,rules-variant,test,publish}-1440.png`. No local draft left behind (checked: no `local-draft` key but the homepage flag), the editor left by navigating with its content back at the stored draft's.

| frame | state | width | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|---|
| 1h 6793:47711 | step 1, A, EN | 1440 | banner | place | x 160, y 216 (step head 64+32 … 192, then 24), 1120 × 42 | x 160, y 216, 1120 × 42 | match |
| 1h 6793:47711 | step 1, A, EN | 1440 | banner → connection card | gap | 24 (banner 120–162, card at 186 in the body) | 24 (banner ends 258, card at 282) | match |
| 1h 6793:47711 | step 1, A, EN | 1440 | banner | look (fill, border, radius, padding, gap, align) | T066's C4 rows | rgb(224, 242, 254); 1px solid rgb(2, 115, 174); 8px; 8 8 8 16; 8; center | match (border: spec 008 §1.5, as T066) |
| 1h 6793:47711 | step 1, A, EN | 1440 | sentence | font, text | Fira Sans 400 14/24 #0b1220, "This is an example. Change anything to see how it works." | "Fira Sans" 400 14px/24px rgb(11, 18, 32), tabular-nums slashed-zero; same text; `document.fonts.check` true | match |
| 1h 6793:47711 | step 1, A, EN | 1440 | page | screenshot | Figma render 1440 × 900 | same order and places; the description's ⓘ and the draft note's fill are the baseline's (spec 008), not this task's | match |
| — (W15) | documents, A, EN | 1440 | banner | place | not drawn: as on step 1 (W15) | x 160, y 216, 1120 × 42, first in the step; the documents' row 24 below (y 282) | W15 |
| — (W15) | documents, A, EN | 1440 | banner | text, look | C4, copy.md §6 | "This is an example. Change anything to see how it works."; look as on step 1 | match |
| 1i 7344:96387 | rules Standard, A, EN | 1440 | banner | place | y 216 (body 152), 1120 × 42, above the tabs | x 160, y 216, 1120 × 42; after it the pinned tab row | match |
| 1i 7344:96387 | rules Standard, A, EN | 1440 | banner → tab row → card | gaps | 16 (tab row at 274, 49 high), 16 (card at 339) | tab row y 274, 49 high; card y 339 | match |
| 1i 7344:96387 | rules Standard, A, EN | 1440 | sentence | text | "Try changing the age to 18 or adding a rule. Then use Test rules to check the result." | same, one line | match |
| 1i 7344:96387 | rules Standard, A, EN | 1440 | page | screenshot | Figma render 1440 × 791 | banner, tabs and card in the same places; the tabs' ⓘ / ⋮ and the card's height (+8) are the rules step's baseline, not this task's | match |
| 1i-b 7344:96414 | rules Standard, tooltip | 1440 | banner | place | as 1i | as 1i (the tooltip is spec 002's ⓘ) | match |
| 1i, 1i-c | rules Standard / Ambulance, A, EN | 1440 | variant tabs | finding icon, count | a "1" (audit) | no icon, no digit on either tab (`[role=tab]`: 0 icons) | not built, F29 |
| 1i-c 7344:96442 | rules Ambulance, A, EN | 1440 | banner | place, gaps | y 216, 16 to the tabs, 16 to the card | y 216, tab row 274, card 339 | match |
| 1i-c 7344:96442 | rules Ambulance, A, EN | 1440 | sentence | text | "Ambulance is more lenient than Standard. Rules 01 and 02 are changed here." | same, one line | match |
| — (§4.1 call 6) | rules "School transport", B, EN | 1440 / 320 / 160 | banner | presence | none on another variant | 0 banners | match |
| — (copy.md §6) | rules Krankentransport, D, DE | 1440 | sentence | text | "Krankentransport ist weniger streng als Standard. Rule 01 und Rule 02 sind hier geändert." | same | match |
| — (copy.md §6, §4.2 T066) | rules Krankentransport, D, read in EN | 1440 | sentence | text | the stored name | "Krankentransport is more lenient than Standard. Rules 01 and 02 are changed here." | match |
| — (copy.md §6) | rules Standard, D, DE | 1440 | sentence | text | "Versuchen Sie, das Alter auf 18 zu ändern … mit „Regeln testen“." | same | match |
| — (W15) | test, A, EN | 1440 | banner | place | not drawn: above the variant tabs (W15) | x 160, y 216, first in the step; the test-day line 16 below (y 274), then the tabs | W15 |
| — (W15) | test, A, EN | 1440 | variant tabs | finding icon, count | none (FR-056) | Standard, Ambulance: 0 icons, no digit | match |
| 16b 7137:50210 | publish dialog, A, EN | 1440 | example line | place | "Rule findings" 16 under "Active from", dialog 600 wide | line y 516, "Active from" ends 500; dialog 420, 600 wide | match |
| 16b 7137:50210 | publish dialog, A, EN | 1440 | example line | icon, font, text | `icon-info-small` 20, `feedback-info`; body/small 14/24 #0b1220; gap 8, centred; "This is still the example. Check that the name, documents and rules fit your service." | KERN info icon 20 × 20 rgb(2, 115, 174) centred beside two lines; 14px/24px 400 rgb(11, 18, 32); same text, 2 lines in 536 | match (icon colour: spec 008 §1.5) |
| 16b 7137:50210 | publish dialog, A, EN | 1440 | summary, rules | lines | "Standard · 2 rules" (the frame) | "Standard · 2 rules", "Ambulance · 2 rules" | F30 |
| 16b 7137:50083 | publish dialog, A, EN | 1440 | page behind | screenshot | tabs with School transport, no banner | Standard, Ambulance; the banner above the tabs | F30, W15 |
| 16b 7137:50083 | publish dialog, A, EN | 1440 | dialog | screenshot | Figma render | same order and look; 24 px taller for the Ambulance line | match (F30) |
| — (FR-060) | publish dialog, B (`changed`), EN | 1440 | example line | presence | none | none; summary "Standard · 2 rules", "Ambulance · 2 rules", "School transport · 2 rules" | match |
| — (FR-060) | publish dialog, A with the name changed, not saved | 1440 | example line | presence | none while the page holds a change | none; after typing the name back: the line again | match |
| — (copy.md §6) | publish dialog, D, DE | 1440 | example line | text | (German written for T068) | "Dies ist noch das Beispiel. Prüfen Sie, ob Name, Dokumente und Regeln zu Ihrem Dienst passen."; "Standard · 2 Regeln", "Krankentransport · 2 Regeln" | match |
| — (FR-059) | edit flow of P3 seed live (published) | 1440 | banner | presence | none | 0 banners | match |
| — (FR-058) | step 1, B (`changed`) | 1440 | banner | presence | shown whatever was changed | shown, y 216 | match |
| narrow | step 1, A, EN | 320 | page, banner | h-scroll, h1, clipped, off-screen | none, 1, none, none | 320 = 320; 1 h1; banner 288 × 66, 2 lines beside the icon; card 24 below; nothing clipped or off-screen | match |
| narrow | step 1, A, EN | 160 | page, banner | h-scroll, h1, clipped, off-screen | none, 1, none, none | 160 = 160; 1 h1; banner 144 × 138, padding 8 (narrow block), 5 lines; nothing clipped or off-screen | match |
| narrow | documents, A, EN | 320 / 160 | page, banner | h-scroll, h1, clipped, off-screen | none, 1, none, none | 320 = 320 / 160 = 160; 1 h1; 2 / 5 lines; the list 24 below; nothing clipped or off-screen | match |
| narrow | rules Standard, A, EN | 320 / 160 | page, banner | h-scroll, h1, clipped, off-screen | none, 1, none, none | 320 = 320 / 160 = 160; 1 h1; 3 / 7 lines; the tab row 16 below; nothing clipped or off-screen | match |
| narrow | rules Ambulance, A, EN | 320 / 160 | page, banner | h-scroll, h1, clipped, off-screen | none, 1, none, none | 320 = 320 / 160 = 160; 1 h1; 3 / 6 lines; nothing clipped or off-screen | match |
| narrow | rules School transport, B, EN | 320 / 160 | page | h-scroll, h1, banner | none, 1, none | 320 = 320 / 160 = 160; 1 h1; 0 banners; nothing off-screen | match |
| narrow | test, A, EN | 320 / 160 | page, banner | h-scroll, h1, clipped, off-screen | none, 1, none, none | 320 = 320 / 160 = 160; 1 h1; 2 / 5 lines; the test-day line 16 below; nothing clipped or off-screen | match |
| narrow | publish dialog, A, EN | 320 | dialog, line | h-scroll, clipped | none | page 320 = 320, dialog 288 = 288; the line 224 wide, 3 lines, 16 under "Active from"; not clipped | match |
| narrow | publish dialog, A, EN | 160 | dialog, line | h-scroll, clipped | none | page 160 = 160, dialog 128 = 128 (it scrolls inside, as before); the line 104 wide, 9 lines; not clipped | match |
| narrow | all six steps and the dialog, D, DE | 320 / 160 | page, banner, line | h-scroll, h1 | none, 1 | every state 320 = 320 / 160 = 160, 1 h1; the dialog 288 = 288 / 128 = 128 | match |
| narrow | every banner and the line, EN and DE | 1440 / 320 / 160 | banner, line | focus ring after keyboard / after click | no focusable element | 0 focusable elements in the banner and in the line; no role, no live region (C4, T066) | match |

#### T074 — the grouped data item panel (S8 "Data groups"; FR-077, FR-079, US9-AS1–AS4; F41, W18, R15 V8). Chromium (`playwright-chrome` MCP), 1455 px window (body 1440), 320 and 160 CSS px. Data: `T074 draft` (`ebaea848-da54-42ba-8040-03c5d98dd6dd`) and `T074 live` (`39394df3-6dd6-4747-b7bd-e8a96cfac843`), both made by p10-alice from `P3 seed live`'s documents and rules (Personal ID: family_name, given_name, birthdate, address_locality; Driving licence: expiry_date, document_number, driving_privileges; Rule 01 on pid birthdate, Rule 02 on mdl driving_privileges). Frames: A5 `7290:61214` (U21), A6 `7290:61956` (U21), A8 `7290:62357` (U22), E1b `7296:52340` (U98). Screenshots: `.playwright-mcp/T074/`.

| frame | state | width | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|---|
| 7290:61214 | draft, Personal ID shown, groups mixed | 1440 | font check | `document.fonts.check` 600 16px / 400 14px "Fira Sans" | Fira Sans SemiBold 16, Regular 14 | true / true | match |
| 7290:61214 | draft, Personal ID | 1440 | panel body (`#document-detail [role=group]`) | padding | 16 24 | 16 24 16 24 | match |
| 7296:52340 | draft, Personal ID | 1440 | columns (`[role=group] > ul`) | count / gap | 3 columns of 245, gap 24 | `column-count` 3, `column-gap` 24px, columns 244.7 wide | match (±0.3 px: CSS columns share 782 px equally; F41) |
| 7290:61214 | draft, Personal ID | 1440 | group heading (`#document-pid-group-name` + label) | row height / box / gap | 32 (py 4 + 24), box 20, gap 8 | 32, 20 × 20, 8px | match |
| 7290:61214 | draft, Personal ID | 1440 | group heading label | font | label/default 16/24 600, `#0b1220` | 16px / 24px / 600 / rgb(11,18,32) | match |
| 7290:61214 | draft, Personal ID | 1440 | group's items (`li > ul`) | indent | pl 24 | padding-left 24px, first box at x+24 | match |
| 7290:61214 | draft, Personal ID | 1440 | data item row | height / label font | 32, body/small 14/24 400 | 32, 14px/24px/400 | match |
| 7296:52340 | draft, Personal ID | 1440 | space between groups in a column | gap | 16 | Name ends y+160, Birth starts y+176 (16); Document → Other details 16 | match |
| 7296:52340 | draft, Personal ID | 1440 | last group in the panel | margin-bottom | — | 0 (`last:mb-0`) | match |
| 7290:61214 | draft, Personal ID | 1440 | group order and placement | groups per column | Name+Birth / Address / Document+Other details | Name+Birth / Address / Document+Other details (x 473, 742, 1010) | match |
| 7290:61214 | draft, Personal ID | 1440 | Birth | data items | 3 (Date of birth, Place of birth, Sex) | 4 (Date of birth, Place of birth, Nationality, Sex) | Clarification 2026-11-11; design-notes §4.1 call 2 (§1) |
| 7290:61214 | draft, Personal ID | 1440 | Other details | data items | 5 (Nationality first) | 4 (Personal administrative number, Photo, Email address, Mobile phone number) | Clarification 2026-11-11; design-notes §4.1 call 2 (§1) |
| 7290:61214 | draft, Personal ID | 1440 | item with a two-line label ("Street (may include the house number)", "Personal administrative number") | box position | box centred on both lines | box on the first line (56 high row) | spec 008 T016 (box on the label's first line) |
| 7290:61956 | draft, Personal ID, Address 1 of 7 | 1440 | mixed group box (`#document-pid-group-name`, `indeterminate`) | fill / border / dash | `#1d56f0`, 10 × 2 white dash, radius 4 | rgb(29,86,240), border rgb(29,86,240) 1px, dash SVG 10 × 2 rx 1, radius 4px | match |
| 7290:61956 | draft, Personal ID | 1440 | clear group box (`#document-pid-group-document`) | fill / border | white, 1 px `#6b7488` | white, rgb(107,116,136) 1px | match |
| 7290:61956 | draft, Personal ID | 1440 | group state | `checked` / `indeterminate` | Address mixed with City or town, State or region | Name, Birth, Address `indeterminate`, Document and Other details clear | match (US9-AS3) |
| 7290:62357 | draft, Driving licence shown | 1440 | groups | order and counts | Name, Birth 5, Address, Licence, Other details (Nationality …), Document, Appearance | Name 4, Birth 6, Address 5, Document 6, Licence 3, Appearance 6, Other details 1 | F41 (CLAR 2026-11-10 #35; US9-AS1) |
| 7290:62357 | draft, Driving licence | 1440 | flow down the columns | groups per column | frame's placement | Name+Birth / Address+Document / Licence+Appearance+Other details, each group whole (`break-inside: avoid`, heights 208, 224, 192, 224, 128, 224, 64) | F41; R15 V8 |
| 7290:62357 | draft, Driving licence | 1440 | items inside a group | order | Birth: Date of birth, Place of birth, Sex, Year of birth, Age in years | catalog order: Date of birth, Sex, Place of birth, Age in years, Year of birth, Nationality | F41 (membership and order from the catalog; FR-050) |
| 7290:62357 | draft, Driving licence | 1440 | count line and "All data items" | text / state | "… data items chosen", mixed | "3 of 31 data items chosen", `#document-mdl-all` mixed | match |
| — | draft, tick a clear group (Name) | 1440 | `#document-mdl-group-name` click | items / count / "All data items" | not drawn (US9-AS2) | 4 items ticked, box ticked, "7 of 31 data items chosen", "All data items" mixed | W18 (US9-AS2) |
| — | draft, tick a mixed group (Licence) | 1440 | `#document-mdl-group-licence` click | items / count | not drawn | all 3 ticked, "9 of 31 …" | W18 (FR-079) |
| — | draft, clear a ticked group a rule checks (Licence) | 1440 | question (`dialog[open]`) | text | not drawn (W18) | "Stop requesting “Licence” data from Driving licence?" / "1 rule checks this data: Rule 02 in Standard. Edit or delete it before you publish." / "Cancel" / "Stop requesting"; nothing changed until answered | W18; copy.md §5 (US9-AS4) |
| — | the question, "Cancel" | 1440 | group / focus | — | — | group stays ticked, "9 of 31", focus back on `#document-mdl-group-licence` | W18 |
| — | the question, "Stop requesting" | 1440 | group / count / focus | — | — | Licence cleared, "6 of 31", focus on `#document-mdl-group-licence` | W18 |
| — | draft, clear a ticked group no rule checks (Name) | 1440 | `#document-mdl-group-name` | question | — | no question, cleared at once, "2 of 31" | W18 (as "All data items") |
| — | draft, "All data items" ticked | 1440 | group boxes | state | — | all 7 ticked, "31 of 31 data items chosen" | match (FR-079: the boxes follow) |
| — | draft, German | 1440 | group labels | text | not drawn (FR-078e) | Name, Geburt, Adresse, Dokument, Fahrerlaubnis, Aussehen, Weitere Angaben; Personalausweis: Name, Geburt, Adresse, Dokument, Weitere Angaben | design-notes §4.2 T105; copy.md §5 via the catalog |
| — | draft, German, the question | 1440 | dialog text | text | not drawn | "Felder der Gruppe „Fahrerlaubnis“ aus Führerschein nicht mehr anfordern?" / "1 Regel prüft diese Daten: Rule 02 in Standard. Bearbeiten oder löschen Sie die Regel vor dem Veröffentlichen." / "Abbrechen" / "Nicht mehr anfordern" | copy.md §5 |
| — | a document with 10 data items or fewer | — | flat list | — | not drawn (FR-077d) | no such document in today's catalog: `groupedFieldsOf()` answers null and `DocumentDetail` keeps the flat `FieldRow` list (unit tests `utils.test.ts` "answers null for a document with 10 data items") | W18 (FR-077d) |
| 7296:52340 | edit flow of `T074 live`, Personal ID in the frame's state (Name 2, Birth 2, Address 2) | 1440 | groups' boxes (x, y, w, h from the body) | position | Name 24,16,245,160; Birth 24,192; Address 293,16; Document 562,16; Other details 562,256 | Name 24,16,245,160; Birth 24,192,245,160; Address 293,16,245,280; Document 561,16,245,224; Other details 561,256,245,184 | match (±1 px: equal CSS columns) |
| 7296:52340 | edit flow | 1440 | screenshot comparison | groups, mixed boxes, ticks | Name, Birth, Address mixed; Document, Other details clear | same (`edit-pid-frame-state-1440.png`) but Nationality under Birth | match; Clarification 2026-11-11 for Birth / Other details |
| 7296:52340 | edit flow | 1440 | count / "All data items" | text / state | "6 of 25 data items chosen", mixed | "6 of 25 data items chosen", `#document-pid-all` mixed | match |
| — | edit flow, clear a ticked group a rule checks (Birth) | 1440 | question | text | not drawn | "Stop requesting “Birth” data from Personal ID?" / "1 rule checks this data: Rule 01 in Standard. Edit or delete it before you save." / "Cancel" / "Stop requesting"; after "Stop requesting" "4 of 25", Birth clear | W18 (FR-079; 002-S1.7 "before you save") |
| — | draft, Personal ID | 320 | page | horizontal scroll / clipped / off-screen / h1 | — | scrollWidth 305 ≤ clientWidth 320; nothing off-screen or clipped in the panel; 1 h1; one column (groups at x 41) | match |
| — | draft, Personal ID | 320 | `#document-pid-group-document` | focus ring after click / after Tab | none / 3 px | `outline: none` / `solid 3px` | match |
| — | draft, Driving licence | 320 | page | horizontal scroll / clipped / off-screen / h1 | — | 305 ≤ 320; none; 1 h1; one column | match |
| — | draft, the question (Licence) | 320 | page and dialog | horizontal scroll / off-screen / h1 | — | 305 ≤ 320; none; 1 h1 | match |
| — | draft, Personal ID | 160 | page | horizontal scroll / clipped / off-screen / h1 | — | 160 ≤ 160; none; 1 h1; one column (groups at x 21) | match |
| — | draft, Personal ID | 160 | `#document-pid-group-document` | focus ring after click / after Tab | none / 3 px | `outline: none` / `solid 3px` | match |
| — | draft, Driving licence | 160 | page | horizontal scroll / clipped / off-screen / h1 | — | 160 ≤ 160; none; 1 h1 | match |
| — | draft, the question (Licence) | 160 | dialog | horizontal scroll / off-screen / h1 | — | 160 ≤ 160; none horizontally; 1 h1; the title wraps by word-break (narrow block) and the dialog scrolls (`dialog.kern-dialog` is the scroller) to "Stop requesting" (y 731–819 in an 800 high window) | match (ConfirmDialog as for "All data items") |
| — | edit flow, Personal ID | 320 | page | horizontal scroll / off-screen / h1 | — | 305 ≤ 320; none; 1 h1 | match |
| — | edit flow, `#document-pid-group-birth` | 320 | focus ring after click / after Tab | none / 3 px | `none` / `solid 3px` | match |
| — | edit flow, the question (Birth) | 320 | page and dialog | horizontal scroll / off-screen / h1 | — | 305 ≤ 320; none; 1 h1 | match |
| — | edit flow, Personal ID | 160 | page | horizontal scroll / off-screen / h1 | — | 160 ≤ 160; none; 1 h1 | match |
| — | edit flow, `#document-pid-group-birth` | 160 | focus ring after click / after Tab | none / 3 px | `none` / `solid 3px` | match |
| — | edit flow, the question (Birth) | 160 | page and dialog | horizontal scroll / off-screen / h1 | — | 160 ≤ 160; none; 1 h1 | match |

#### T080: the approval page's new cases (S21; W14, no frame)

Items: FR-050, FR-060, FR-065–FR-067, US8-AS3; copy.md §7 (German title „<name>“ as amended), §2, FR-010. Browser: `playwright-chrome` MCP (Chromium), 1440 px viewport (set with `setViewportSize`), 320 and 160 CSS px (English). Data in `konnekt_db_010_p11` (backend 3015, Vite 5179, `p10-alice`): connections named `T080 …`, the example draft `d443d829-7b9a-45a2-9ebf-63dab1943ccd`, tokens `T080 manage` and `T080 agent`; ids in `<SP>/T080-notes.md`. Every text below was read in both languages at 1440 px (EN / DE).

| frame | state | width | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|---|
| S21 (no frame) | W1 publish, at once | 1440 | h1 | text EN / DE | Publish ‘<name>’? / „<name>“ veröffentlichen? | Publish ‘<name>’? / „<name>“ veröffentlichen? (name as made) | match |
| S21 (no frame) | W1 publish, at once | 1440 | start line | text EN / DE | The connection goes live at once. / Die Anbindung wird sofort aktiv. | The connection goes live at once. / Die Anbindung wird sofort aktiv. | match |
| S21 (no frame) | W2 publish on a date | 1440 | h1 | text EN / DE | Publish ‘<name>’? / „<name>“ veröffentlichen? | Publish ‘<name>’? / „<name>“ veröffentlichen? (name as made) | match |
| S21 (no frame) | W2 publish on a date | 1440 | start line | text EN / DE | Active from 01.12.2026 / Aktiv ab 01.12.2026 | Active from 01.12.2026 / Aktiv ab 01.12.2026 | match |
| S21 (no frame) | W3 publish, unchanged example | 1440 | body | info line under the start line EN / DE | This is still the example. Check that the name, documents and rules fit your service. / Dies ist noch das Beispiel. Prüfen Sie, ob Name, Dokumente und Regeln zu Ihrem Dienst passen. | This is still the example. Check that the name, documents and rules fit your service. / Dies ist noch das Beispiel. Prüfen Sie, ob Name, Dokumente und Regeln zu Ihrem Dienst passen. | match |
| S21 (no frame) | W4 reactivate on a date | 1440 | body | line under the Links card EN / DE | Active from 01.12.2026 / Aktiv ab 01.12.2026 | Active from 01.12.2026 / Aktiv ab 01.12.2026 | match |
| S21 (no frame) | W4b reactivate at once | 1440 | body | line under the Links card EN / DE | The connection goes live at once. / Die Anbindung wird sofort aktiv. | The connection goes live at once. / Die Anbindung wird sofort aktiv. | match |
| S21 (no frame) | W5 set_start_date, scheduled → 15.12.2026 | 1440 | h1 + body | Change the start date of ‘<name>’? / Startdatum von „<name>“ ändern?; Active from 15.12.2026 / Aktiv ab 15.12.2026 | Change the start date of ‘<name>’? / Startdatum von „<name>“ ändern?; Active from 15.12.2026 / Aktiv ab 15.12.2026 | Change the start date of ‘<name>’? / Startdatum von „<name>“ ändern?; Active from 15.12.2026 / Aktiv ab 15.12.2026 | match |
| S21 (no frame) | W6 set_start_date, scheduled → now | 1440 | body | line under the Links card EN / DE | The connection goes live at once. / Die Anbindung wird sofort aktiv. | The connection goes live at once. / Die Anbindung wird sofort aktiv. | match |
| S21 (no frame) | W7 set_start_date, live → 01.12.2026 | 1440 | body | lines under the Links card EN / DE | Active from 01.12.2026 + Until then its links stop working, and requests in progress are cancelled. / Aktiv ab 01.12.2026 + Bis dahin funktionieren die Links nicht, und laufende Anfragen werden abgebrochen. | Active from 01.12.2026 + Until then its links stop working, and requests in progress are cancelled. / Aktiv ab 01.12.2026 + Bis dahin funktionieren die Links nicht, und laufende Anfragen werden abgebrochen. | match |
| S21 (no frame) | W8 deactivate a scheduled connection | 1440 | body | line under the Links card (copy.md §2) EN / DE | This connection will be active from 01.12.2026. If you deactivate it, it won’t become active and its links won’t work. You can activate it again later. / Diese Anbindung ist ab 01.12.2026 aktiv. Wenn Sie sie deaktivieren, wird sie nicht aktiv und ihre Links funktionieren nicht. Sie können sie später wieder aktivieren. | This connection will be active from 01.12.2026. If you deactivate it, it won’t become active and its links won’t work. You can activate it again later. / Diese Anbindung ist ab 01.12.2026 aktiv. Wenn Sie sie deaktivieren, wird sie nicht aktiv und ihre Links funktionieren nicht. Sie können sie später wieder aktivieren. | match |
| S21 (no frame) | W9 delete a scheduled connection | 1440 | body | lines under the Links card (FR-010, FR-067) EN / DE | This connection will be active from 01.12.2026. If you delete it, it won’t become active and its links won’t work. + **Deleting can’t be undone.** / Diese Anbindung ist ab 01.12.2026 aktiv. Wenn Sie sie löschen, wird sie nicht aktiv und ihre Links funktionieren nicht. + **Das Löschen kann nicht rückgängig gemacht werden.** | This connection will be active from 01.12.2026. If you delete it, it won’t become active and its links won’t work. + **Deleting can’t be undone.** / Diese Anbindung ist ab 01.12.2026 aktiv. Wenn Sie sie löschen, wird sie nicht aktiv und ihre Links funktionieren nicht. + **Das Löschen kann nicht rückgängig gemacht werden.** | match |
| S21 (no frame) | D1 done publish on a date (approved with the page’s button) | 1440 | success alert | title EN / DE | Published and scheduled for 01.12.2026. / Veröffentlicht und für den 01.12.2026 geplant. | Published and scheduled for 01.12.2026. / Veröffentlicht und für den 01.12.2026 geplant. | match |
| S21 (no frame) | D2 done reactivate on a date | 1440 | success alert | title EN / DE | Connection scheduled for 01.12.2026. / Anbindung für den 01.12.2026 geplant. | Connection scheduled for 01.12.2026. / Anbindung für den 01.12.2026 geplant. | match |
| S21 (no frame) | D3 done set_start_date | 1440 | success alert | title EN / DE | Start date saved. / Startdatum gespeichert. | Start date saved. / Startdatum gespeichert. | match |
| S21 (no frame) | D4 done delete of a scheduled connection | 1440 | success alert | title; Undo EN / DE | Connection deleted. / Anbindung gelöscht.; no Undo | Connection deleted. / Anbindung gelöscht.; no Undo | match |
| S21 (no frame) | C1 cancelled, date moved | 1440 | warning alert | title EN / DE | The connection’s start date changed in the meantime. / Das Startdatum der Anbindung wurde inzwischen geändert. | The connection’s start date changed in the meantime. / Das Startdatum der Anbindung wurde inzwischen geändert. | match |
| S21 (no frame) | C2 cancelled, became active | 1440 | warning alert | title EN / DE | The connection became active in the meantime. / Die Anbindung ist inzwischen aktiv geworden. | The connection became active in the meantime. / Die Anbindung ist inzwischen aktiv geworden. | match |
| S21 (no frame) | C3 cancelled, start_date_passed | 1440 | warning alert | title EN / DE | The start date is no longer after today. The agent can ask again with a new date. / Das Startdatum liegt nicht mehr nach dem heutigen Tag. Der Agent kann mit einem neuen Datum erneut fragen. | The start date is no longer after today. The agent can ask again with a new date. / Das Startdatum liegt nicht mehr nach dem heutigen Tag. Der Agent kann mit einem neuen Datum erneut fragen. | match |
| S21 (no frame) | W2 publish on a date | 1440 | summary table | documents order | stored order (FR-050) | T080 stored order (mdl, pid): "Driving licence · 3 data items", "Personal ID · 4 data items" in EN and DE, the Summary card the same | match |
| S21 (no frame) | W5–W9 (scheduled / live connection) | 1440 | Copy link buttons | enabled | scheduled and live: copy (FR-007) | 2 of 2 enabled | match |
| S21 (no frame) | W4, W4b (deactivated connection) | 1440 | Copy link buttons | enabled | off while deactivated (W21) | 2 of 2 aria-disabled | match |
| S21 (no frame) | D1, D2 done on a date | 1440 | Links card, "Open the connection" | shown, copy enabled | scheduled links copy as on the details (FR-007; T079 carried note) | "Add both links to your form. …", 2 of 2 copy enabled, "Open the connection" | decided: copy on, UNCERTAIN 2 of T080 |
| S21 (no frame) | W9, D4 delete | 1440 | Undo | absent | no "Undo" after approving a deletion (FR-067) | no Undo / Rückgängig in main | match |
| S21 (no frame) | D1 done publish | 1440 | focus | alert takes focus | the outcome alert takes the focus | .kern-alert--success focused | match |
| S21 (no frame) | W1 publish, at once | 320 | html | scrollWidth ≤ clientWidth | no horizontal scroll | 305 ≤ 320 | match |
| S21 (no frame) | W1 publish, at once | 320 | main | off-screen / clipped | none (DescriptionLine truncates by design, R6; the ⓘ buttons’ hidden labels clip) | 0 off-screen; only the intended truncation and hidden ⓘ labels | match |
| S21 (no frame) | W1 publish, at once | 320 | h1 | count | 1 | 1 | match |
| S21 (no frame) | W1 publish, at once | 160 | html | scrollWidth ≤ clientWidth | no horizontal scroll | 160 ≤ 160 | match |
| S21 (no frame) | W1 publish, at once | 160 | main | off-screen / clipped | none (DescriptionLine truncates by design, R6; the ⓘ buttons’ hidden labels clip) | 0 off-screen; only the intended truncation and hidden ⓘ labels | match |
| S21 (no frame) | W1 publish, at once | 160 | h1 | count | 1 | 1 | match |
| S21 (no frame) | W1 publish, at once | 320 | first control in main | ring after keyboard / after click | ring after Tab, none after a mouse click | ring after Tab (:focus-visible); none after a mouse click (checked with page.mouse on a fresh load: ⓘ, Copy link, View summary) | match |
| S21 (no frame) | W1 publish, at once | 160 | first control in main | ring after keyboard / after click | ring after Tab, none after a mouse click | ring after Tab (:focus-visible); none after a mouse click (checked with page.mouse on a fresh load: ⓘ, Copy link, View summary) | match |
| S21 (no frame) | W2 publish on a date | 320 | html | scrollWidth ≤ clientWidth | no horizontal scroll | 305 ≤ 320 | match |
| S21 (no frame) | W2 publish on a date | 320 | main | off-screen / clipped | none (DescriptionLine truncates by design, R6; the ⓘ buttons’ hidden labels clip) | 0 off-screen; only the intended truncation and hidden ⓘ labels | match |
| S21 (no frame) | W2 publish on a date | 320 | h1 | count | 1 | 1 | match |
| S21 (no frame) | W2 publish on a date | 160 | html | scrollWidth ≤ clientWidth | no horizontal scroll | 160 ≤ 160 | match |
| S21 (no frame) | W2 publish on a date | 160 | main | off-screen / clipped | none (DescriptionLine truncates by design, R6; the ⓘ buttons’ hidden labels clip) | 0 off-screen; only the intended truncation and hidden ⓘ labels | match |
| S21 (no frame) | W2 publish on a date | 160 | h1 | count | 1 | 1 | match |
| S21 (no frame) | W2 publish on a date | 320 | first control in main | ring after keyboard / after click | ring after Tab, none after a mouse click | ring after Tab (:focus-visible); none after a mouse click (checked with page.mouse on a fresh load: ⓘ, Copy link, View summary) | match |
| S21 (no frame) | W2 publish on a date | 160 | first control in main | ring after keyboard / after click | ring after Tab, none after a mouse click | ring after Tab (:focus-visible); none after a mouse click (checked with page.mouse on a fresh load: ⓘ, Copy link, View summary) | match |
| S21 (no frame) | W3 publish, unchanged example | 320 | html | scrollWidth ≤ clientWidth | no horizontal scroll | 305 ≤ 320 | match |
| S21 (no frame) | W3 publish, unchanged example | 320 | main | off-screen / clipped | none (DescriptionLine truncates by design, R6; the ⓘ buttons’ hidden labels clip) | 0 off-screen; only the intended truncation and hidden ⓘ labels | match |
| S21 (no frame) | W3 publish, unchanged example | 320 | h1 | count | 1 | 1 | match |
| S21 (no frame) | W3 publish, unchanged example | 160 | html | scrollWidth ≤ clientWidth | no horizontal scroll | 160 ≤ 160 | match |
| S21 (no frame) | W3 publish, unchanged example | 160 | main | off-screen / clipped | none (DescriptionLine truncates by design, R6; the ⓘ buttons’ hidden labels clip) | 0 off-screen; only the intended truncation and hidden ⓘ labels | match |
| S21 (no frame) | W3 publish, unchanged example | 160 | h1 | count | 1 | 1 | match |
| S21 (no frame) | W3 publish, unchanged example | 320 | first control in main | ring after keyboard / after click | ring after Tab, none after a mouse click | ring after Tab (:focus-visible); none after a mouse click (checked with page.mouse on a fresh load: ⓘ, Copy link, View summary) | match |
| S21 (no frame) | W3 publish, unchanged example | 160 | first control in main | ring after keyboard / after click | ring after Tab, none after a mouse click | ring after Tab (:focus-visible); none after a mouse click (checked with page.mouse on a fresh load: ⓘ, Copy link, View summary) | match |
| S21 (no frame) | W4 reactivate on a date | 320 | html | scrollWidth ≤ clientWidth | no horizontal scroll | 305 ≤ 320 | match |
| S21 (no frame) | W4 reactivate on a date | 320 | main | off-screen / clipped | none (DescriptionLine truncates by design, R6; the ⓘ buttons’ hidden labels clip) | 0 off-screen; only the intended truncation and hidden ⓘ labels | match |
| S21 (no frame) | W4 reactivate on a date | 320 | h1 | count | 1 | 1 | match |
| S21 (no frame) | W4 reactivate on a date | 160 | html | scrollWidth ≤ clientWidth | no horizontal scroll | 160 ≤ 160 | match |
| S21 (no frame) | W4 reactivate on a date | 160 | main | off-screen / clipped | none (DescriptionLine truncates by design, R6; the ⓘ buttons’ hidden labels clip) | 0 off-screen; only the intended truncation and hidden ⓘ labels | match |
| S21 (no frame) | W4 reactivate on a date | 160 | h1 | count | 1 | 1 | match |
| S21 (no frame) | W4 reactivate on a date | 320 | first control in main | ring after keyboard / after click | ring after Tab, none after a mouse click | ring after Tab (:focus-visible); none after a mouse click (checked with page.mouse on a fresh load: ⓘ, Copy link, View summary) | match |
| S21 (no frame) | W4 reactivate on a date | 160 | first control in main | ring after keyboard / after click | ring after Tab, none after a mouse click | ring after Tab (:focus-visible); none after a mouse click (checked with page.mouse on a fresh load: ⓘ, Copy link, View summary) | match |
| S21 (no frame) | W4b reactivate at once | 320 | html | scrollWidth ≤ clientWidth | no horizontal scroll | 305 ≤ 320 | match |
| S21 (no frame) | W4b reactivate at once | 320 | main | off-screen / clipped | none (DescriptionLine truncates by design, R6; the ⓘ buttons’ hidden labels clip) | 0 off-screen; only the intended truncation and hidden ⓘ labels | match |
| S21 (no frame) | W4b reactivate at once | 320 | h1 | count | 1 | 1 | match |
| S21 (no frame) | W4b reactivate at once | 160 | html | scrollWidth ≤ clientWidth | no horizontal scroll | 160 ≤ 160 | match |
| S21 (no frame) | W4b reactivate at once | 160 | main | off-screen / clipped | none (DescriptionLine truncates by design, R6; the ⓘ buttons’ hidden labels clip) | 0 off-screen; only the intended truncation and hidden ⓘ labels | match |
| S21 (no frame) | W4b reactivate at once | 160 | h1 | count | 1 | 1 | match |
| S21 (no frame) | W4b reactivate at once | 320 | first control in main | ring after keyboard / after click | ring after Tab, none after a mouse click | ring after Tab (:focus-visible); none after a mouse click (checked with page.mouse on a fresh load: ⓘ, Copy link, View summary) | match |
| S21 (no frame) | W4b reactivate at once | 160 | first control in main | ring after keyboard / after click | ring after Tab, none after a mouse click | ring after Tab (:focus-visible); none after a mouse click (checked with page.mouse on a fresh load: ⓘ, Copy link, View summary) | match |
| S21 (no frame) | W5 set_start_date, scheduled → 15.12.2026 | 320 | html | scrollWidth ≤ clientWidth | no horizontal scroll | 305 ≤ 320 | match |
| S21 (no frame) | W5 set_start_date, scheduled → 15.12.2026 | 320 | main | off-screen / clipped | none (DescriptionLine truncates by design, R6; the ⓘ buttons’ hidden labels clip) | 0 off-screen; only the intended truncation and hidden ⓘ labels | match |
| S21 (no frame) | W5 set_start_date, scheduled → 15.12.2026 | 320 | h1 | count | 1 | 1 | match |
| S21 (no frame) | W5 set_start_date, scheduled → 15.12.2026 | 160 | html | scrollWidth ≤ clientWidth | no horizontal scroll | 160 ≤ 160 | match |
| S21 (no frame) | W5 set_start_date, scheduled → 15.12.2026 | 160 | main | off-screen / clipped | none (DescriptionLine truncates by design, R6; the ⓘ buttons’ hidden labels clip) | 0 off-screen; only the intended truncation and hidden ⓘ labels | match |
| S21 (no frame) | W5 set_start_date, scheduled → 15.12.2026 | 160 | h1 | count | 1 | 1 | match |
| S21 (no frame) | W5 set_start_date, scheduled → 15.12.2026 | 320 | first control in main | ring after keyboard / after click | ring after Tab, none after a mouse click | ring after Tab (:focus-visible); none after a mouse click (checked with page.mouse on a fresh load: ⓘ, Copy link, View summary) | match |
| S21 (no frame) | W5 set_start_date, scheduled → 15.12.2026 | 160 | first control in main | ring after keyboard / after click | ring after Tab, none after a mouse click | ring after Tab (:focus-visible); none after a mouse click (checked with page.mouse on a fresh load: ⓘ, Copy link, View summary) | match |
| S21 (no frame) | W6 set_start_date, scheduled → now | 320 | html | scrollWidth ≤ clientWidth | no horizontal scroll | 305 ≤ 320 | match |
| S21 (no frame) | W6 set_start_date, scheduled → now | 320 | main | off-screen / clipped | none (DescriptionLine truncates by design, R6; the ⓘ buttons’ hidden labels clip) | 0 off-screen; only the intended truncation and hidden ⓘ labels | match |
| S21 (no frame) | W6 set_start_date, scheduled → now | 320 | h1 | count | 1 | 1 | match |
| S21 (no frame) | W6 set_start_date, scheduled → now | 160 | html | scrollWidth ≤ clientWidth | no horizontal scroll | 160 ≤ 160 | match |
| S21 (no frame) | W6 set_start_date, scheduled → now | 160 | main | off-screen / clipped | none (DescriptionLine truncates by design, R6; the ⓘ buttons’ hidden labels clip) | 0 off-screen; only the intended truncation and hidden ⓘ labels | match |
| S21 (no frame) | W6 set_start_date, scheduled → now | 160 | h1 | count | 1 | 1 | match |
| S21 (no frame) | W6 set_start_date, scheduled → now | 320 | first control in main | ring after keyboard / after click | ring after Tab, none after a mouse click | ring after Tab (:focus-visible); none after a mouse click (checked with page.mouse on a fresh load: ⓘ, Copy link, View summary) | match |
| S21 (no frame) | W6 set_start_date, scheduled → now | 160 | first control in main | ring after keyboard / after click | ring after Tab, none after a mouse click | ring after Tab (:focus-visible); none after a mouse click (checked with page.mouse on a fresh load: ⓘ, Copy link, View summary) | match |
| S21 (no frame) | W7 set_start_date, live → 01.12.2026 | 320 | html | scrollWidth ≤ clientWidth | no horizontal scroll | 305 ≤ 320 | match |
| S21 (no frame) | W7 set_start_date, live → 01.12.2026 | 320 | main | off-screen / clipped | none (DescriptionLine truncates by design, R6; the ⓘ buttons’ hidden labels clip) | 0 off-screen; only the intended truncation and hidden ⓘ labels | match |
| S21 (no frame) | W7 set_start_date, live → 01.12.2026 | 320 | h1 | count | 1 | 1 | match |
| S21 (no frame) | W7 set_start_date, live → 01.12.2026 | 160 | html | scrollWidth ≤ clientWidth | no horizontal scroll | 160 ≤ 160 | match |
| S21 (no frame) | W7 set_start_date, live → 01.12.2026 | 160 | main | off-screen / clipped | none (DescriptionLine truncates by design, R6; the ⓘ buttons’ hidden labels clip) | 0 off-screen; only the intended truncation and hidden ⓘ labels | match |
| S21 (no frame) | W7 set_start_date, live → 01.12.2026 | 160 | h1 | count | 1 | 1 | match |
| S21 (no frame) | W7 set_start_date, live → 01.12.2026 | 320 | first control in main | ring after keyboard / after click | ring after Tab, none after a mouse click | ring after Tab (:focus-visible); none after a mouse click (checked with page.mouse on a fresh load: ⓘ, Copy link, View summary) | match |
| S21 (no frame) | W7 set_start_date, live → 01.12.2026 | 160 | first control in main | ring after keyboard / after click | ring after Tab, none after a mouse click | ring after Tab (:focus-visible); none after a mouse click (checked with page.mouse on a fresh load: ⓘ, Copy link, View summary) | match |
| S21 (no frame) | W8 deactivate a scheduled connection | 320 | html | scrollWidth ≤ clientWidth | no horizontal scroll | 305 ≤ 320 | match |
| S21 (no frame) | W8 deactivate a scheduled connection | 320 | main | off-screen / clipped | none (DescriptionLine truncates by design, R6; the ⓘ buttons’ hidden labels clip) | 0 off-screen; only the intended truncation and hidden ⓘ labels | match |
| S21 (no frame) | W8 deactivate a scheduled connection | 320 | h1 | count | 1 | 1 | match |
| S21 (no frame) | W8 deactivate a scheduled connection | 160 | html | scrollWidth ≤ clientWidth | no horizontal scroll | 160 ≤ 160 | match |
| S21 (no frame) | W8 deactivate a scheduled connection | 160 | main | off-screen / clipped | none (DescriptionLine truncates by design, R6; the ⓘ buttons’ hidden labels clip) | 0 off-screen; only the intended truncation and hidden ⓘ labels | match |
| S21 (no frame) | W8 deactivate a scheduled connection | 160 | h1 | count | 1 | 1 | match |
| S21 (no frame) | W8 deactivate a scheduled connection | 320 | first control in main | ring after keyboard / after click | ring after Tab, none after a mouse click | ring after Tab (:focus-visible); none after a mouse click (checked with page.mouse on a fresh load: ⓘ, Copy link, View summary) | match |
| S21 (no frame) | W8 deactivate a scheduled connection | 160 | first control in main | ring after keyboard / after click | ring after Tab, none after a mouse click | ring after Tab (:focus-visible); none after a mouse click (checked with page.mouse on a fresh load: ⓘ, Copy link, View summary) | match |
| S21 (no frame) | W9 delete a scheduled connection | 320 | html | scrollWidth ≤ clientWidth | no horizontal scroll | 305 ≤ 320 | match |
| S21 (no frame) | W9 delete a scheduled connection | 320 | main | off-screen / clipped | none (DescriptionLine truncates by design, R6; the ⓘ buttons’ hidden labels clip) | 0 off-screen; only the intended truncation and hidden ⓘ labels | match |
| S21 (no frame) | W9 delete a scheduled connection | 320 | h1 | count | 1 | 1 | match |
| S21 (no frame) | W9 delete a scheduled connection | 160 | html | scrollWidth ≤ clientWidth | no horizontal scroll | 160 ≤ 160 | match |
| S21 (no frame) | W9 delete a scheduled connection | 160 | main | off-screen / clipped | none (DescriptionLine truncates by design, R6; the ⓘ buttons’ hidden labels clip) | 0 off-screen; only the intended truncation and hidden ⓘ labels | match |
| S21 (no frame) | W9 delete a scheduled connection | 160 | h1 | count | 1 | 1 | match |
| S21 (no frame) | W9 delete a scheduled connection | 320 | first control in main | ring after keyboard / after click | ring after Tab, none after a mouse click | ring after Tab (:focus-visible); none after a mouse click (checked with page.mouse on a fresh load: ⓘ, Copy link, View summary) | match |
| S21 (no frame) | W9 delete a scheduled connection | 160 | first control in main | ring after keyboard / after click | ring after Tab, none after a mouse click | ring after Tab (:focus-visible); none after a mouse click (checked with page.mouse on a fresh load: ⓘ, Copy link, View summary) | match |
| S21 (no frame) | D1 done publish on a date (approved with the page’s button) | 320 | html | scrollWidth ≤ clientWidth | no horizontal scroll | 305 ≤ 320 | match |
| S21 (no frame) | D1 done publish on a date (approved with the page’s button) | 320 | main | off-screen / clipped | none (DescriptionLine truncates by design, R6; the ⓘ buttons’ hidden labels clip) | 0 off-screen; only the intended truncation and hidden ⓘ labels | match |
| S21 (no frame) | D1 done publish on a date (approved with the page’s button) | 320 | h1 | count | 1 | 1 | match |
| S21 (no frame) | D1 done publish on a date (approved with the page’s button) | 160 | html | scrollWidth ≤ clientWidth | no horizontal scroll | 160 ≤ 160 | match |
| S21 (no frame) | D1 done publish on a date (approved with the page’s button) | 160 | main | off-screen / clipped | none (DescriptionLine truncates by design, R6; the ⓘ buttons’ hidden labels clip) | 0 off-screen; only the intended truncation and hidden ⓘ labels | match |
| S21 (no frame) | D1 done publish on a date (approved with the page’s button) | 160 | h1 | count | 1 | 1 | match |
| S21 (no frame) | D1 done publish on a date (approved with the page’s button) | 320 | first control in main | ring after keyboard / after click | ring after Tab, none after a mouse click | ring after Tab (:focus-visible); none after a mouse click (checked with page.mouse on a fresh load: ⓘ, Copy link, View summary) | match |
| S21 (no frame) | D1 done publish on a date (approved with the page’s button) | 160 | first control in main | ring after keyboard / after click | ring after Tab, none after a mouse click | ring after Tab (:focus-visible); none after a mouse click (checked with page.mouse on a fresh load: ⓘ, Copy link, View summary) | match |
| S21 (no frame) | D2 done reactivate on a date | 320 | html | scrollWidth ≤ clientWidth | no horizontal scroll | 305 ≤ 320 | match |
| S21 (no frame) | D2 done reactivate on a date | 320 | main | off-screen / clipped | none (DescriptionLine truncates by design, R6; the ⓘ buttons’ hidden labels clip) | 0 off-screen; only the intended truncation and hidden ⓘ labels | match |
| S21 (no frame) | D2 done reactivate on a date | 320 | h1 | count | 1 | 1 | match |
| S21 (no frame) | D2 done reactivate on a date | 160 | html | scrollWidth ≤ clientWidth | no horizontal scroll | 160 ≤ 160 | match |
| S21 (no frame) | D2 done reactivate on a date | 160 | main | off-screen / clipped | none (DescriptionLine truncates by design, R6; the ⓘ buttons’ hidden labels clip) | 0 off-screen; only the intended truncation and hidden ⓘ labels | match |
| S21 (no frame) | D2 done reactivate on a date | 160 | h1 | count | 1 | 1 | match |
| S21 (no frame) | D2 done reactivate on a date | 320 | first control in main | ring after keyboard / after click | ring after Tab, none after a mouse click | ring after Tab (:focus-visible); none after a mouse click (checked with page.mouse on a fresh load: ⓘ, Copy link, View summary) | match |
| S21 (no frame) | D2 done reactivate on a date | 160 | first control in main | ring after keyboard / after click | ring after Tab, none after a mouse click | ring after Tab (:focus-visible); none after a mouse click (checked with page.mouse on a fresh load: ⓘ, Copy link, View summary) | match |
| S21 (no frame) | D3 done set_start_date | 320 | html | scrollWidth ≤ clientWidth | no horizontal scroll | 305 ≤ 320 | match |
| S21 (no frame) | D3 done set_start_date | 320 | main | off-screen / clipped | none (DescriptionLine truncates by design, R6; the ⓘ buttons’ hidden labels clip) | 0 off-screen; only the intended truncation and hidden ⓘ labels | match |
| S21 (no frame) | D3 done set_start_date | 320 | h1 | count | 1 | 1 | match |
| S21 (no frame) | D3 done set_start_date | 160 | html | scrollWidth ≤ clientWidth | no horizontal scroll | 160 ≤ 160 | match |
| S21 (no frame) | D3 done set_start_date | 160 | main | off-screen / clipped | none (DescriptionLine truncates by design, R6; the ⓘ buttons’ hidden labels clip) | 0 off-screen; only the intended truncation and hidden ⓘ labels | match |
| S21 (no frame) | D3 done set_start_date | 160 | h1 | count | 1 | 1 | match |
| S21 (no frame) | D3 done set_start_date | 320 | controls in main | focus ring | — | no control in the body (the alert takes programmatic focus); header controls are spec 008’s | match (n/a) |
| S21 (no frame) | D3 done set_start_date | 160 | controls in main | focus ring | — | no control in the body (the alert takes programmatic focus); header controls are spec 008’s | match (n/a) |
| S21 (no frame) | D4 done delete of a scheduled connection | 320 | html | scrollWidth ≤ clientWidth | no horizontal scroll | 305 ≤ 320 | match |
| S21 (no frame) | D4 done delete of a scheduled connection | 320 | main | off-screen / clipped | none (DescriptionLine truncates by design, R6; the ⓘ buttons’ hidden labels clip) | 0 off-screen; only the intended truncation and hidden ⓘ labels | match |
| S21 (no frame) | D4 done delete of a scheduled connection | 320 | h1 | count | 1 | 1 | match |
| S21 (no frame) | D4 done delete of a scheduled connection | 160 | html | scrollWidth ≤ clientWidth | no horizontal scroll | 160 ≤ 160 | match |
| S21 (no frame) | D4 done delete of a scheduled connection | 160 | main | off-screen / clipped | none (DescriptionLine truncates by design, R6; the ⓘ buttons’ hidden labels clip) | 0 off-screen; only the intended truncation and hidden ⓘ labels | match |
| S21 (no frame) | D4 done delete of a scheduled connection | 160 | h1 | count | 1 | 1 | match |
| S21 (no frame) | D4 done delete of a scheduled connection | 320 | controls in main | focus ring | — | no control in the body (the alert takes programmatic focus); header controls are spec 008’s | match (n/a) |
| S21 (no frame) | D4 done delete of a scheduled connection | 160 | controls in main | focus ring | — | no control in the body (the alert takes programmatic focus); header controls are spec 008’s | match (n/a) |
| S21 (no frame) | C1 cancelled, date moved | 320 | html | scrollWidth ≤ clientWidth | no horizontal scroll | 305 ≤ 320 | match |
| S21 (no frame) | C1 cancelled, date moved | 320 | main | off-screen / clipped | none (DescriptionLine truncates by design, R6; the ⓘ buttons’ hidden labels clip) | 0 off-screen; only the intended truncation and hidden ⓘ labels | match |
| S21 (no frame) | C1 cancelled, date moved | 320 | h1 | count | 1 | 1 | match |
| S21 (no frame) | C1 cancelled, date moved | 160 | html | scrollWidth ≤ clientWidth | no horizontal scroll | 160 ≤ 160 | match |
| S21 (no frame) | C1 cancelled, date moved | 160 | main | off-screen / clipped | none (DescriptionLine truncates by design, R6; the ⓘ buttons’ hidden labels clip) | 0 off-screen; only the intended truncation and hidden ⓘ labels | match |
| S21 (no frame) | C1 cancelled, date moved | 160 | h1 | count | 1 | 1 | match |
| S21 (no frame) | C1 cancelled, date moved | 320 | controls in main | focus ring | — | no control in the body (the alert takes programmatic focus); header controls are spec 008’s | match (n/a) |
| S21 (no frame) | C1 cancelled, date moved | 160 | controls in main | focus ring | — | no control in the body (the alert takes programmatic focus); header controls are spec 008’s | match (n/a) |
| S21 (no frame) | C2 cancelled, became active | 320 | html | scrollWidth ≤ clientWidth | no horizontal scroll | 305 ≤ 320 | match |
| S21 (no frame) | C2 cancelled, became active | 320 | main | off-screen / clipped | none (DescriptionLine truncates by design, R6; the ⓘ buttons’ hidden labels clip) | 0 off-screen; only the intended truncation and hidden ⓘ labels | match |
| S21 (no frame) | C2 cancelled, became active | 320 | h1 | count | 1 | 1 | match |
| S21 (no frame) | C2 cancelled, became active | 160 | html | scrollWidth ≤ clientWidth | no horizontal scroll | 160 ≤ 160 | match |
| S21 (no frame) | C2 cancelled, became active | 160 | main | off-screen / clipped | none (DescriptionLine truncates by design, R6; the ⓘ buttons’ hidden labels clip) | 0 off-screen; only the intended truncation and hidden ⓘ labels | match |
| S21 (no frame) | C2 cancelled, became active | 160 | h1 | count | 1 | 1 | match |
| S21 (no frame) | C2 cancelled, became active | 320 | controls in main | focus ring | — | no control in the body (the alert takes programmatic focus); header controls are spec 008’s | match (n/a) |
| S21 (no frame) | C2 cancelled, became active | 160 | controls in main | focus ring | — | no control in the body (the alert takes programmatic focus); header controls are spec 008’s | match (n/a) |
| S21 (no frame) | C3 cancelled, start_date_passed | 320 | html | scrollWidth ≤ clientWidth | no horizontal scroll | 305 ≤ 320 | match |
| S21 (no frame) | C3 cancelled, start_date_passed | 320 | main | off-screen / clipped | none (DescriptionLine truncates by design, R6; the ⓘ buttons’ hidden labels clip) | 0 off-screen; only the intended truncation and hidden ⓘ labels | match |
| S21 (no frame) | C3 cancelled, start_date_passed | 320 | h1 | count | 1 | 1 | match |
| S21 (no frame) | C3 cancelled, start_date_passed | 160 | html | scrollWidth ≤ clientWidth | no horizontal scroll | 160 ≤ 160 | match |
| S21 (no frame) | C3 cancelled, start_date_passed | 160 | main | off-screen / clipped | none (DescriptionLine truncates by design, R6; the ⓘ buttons’ hidden labels clip) | 0 off-screen; only the intended truncation and hidden ⓘ labels | match |
| S21 (no frame) | C3 cancelled, start_date_passed | 160 | h1 | count | 1 | 1 | match |
| S21 (no frame) | C3 cancelled, start_date_passed | 320 | controls in main | focus ring | — | no control in the body (the alert takes programmatic focus); header controls are spec 008’s | match (n/a) |
| S21 (no frame) | C3 cancelled, start_date_passed | 160 | controls in main | focus ring | — | no control in the body (the alert takes programmatic focus); header controls are spec 008’s | match (n/a) |

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

#### T030: walk V1–V4, scheduling (US1; FR-001–FR-014, SC-001, SC-002, US1-AS1–AS11; scripted `playwright-core` 1.65: Chromium 156 (`/usr/bin/chromium`) and Firefox 159 (build 1572), 1440 × 900, browser zone Europe/Berlin; English and German through the stored language choice; backend on 3011 with the worker on (2 s cycle) and the fake EUDIPLO, database `konnekt_db_010_p4`; every text compared with the one the script composed from the API’s dates and copy.md §2 / the glossary; busy states read with the call held back 1.5 s by `page.route()`; the server’s `invalid_start_date` (V2.3) by a `page.route()` that rewrites the body’s date to today; serviceBW’s calls made without a cookie and compared byte for byte (status, content type, body) with a deactivated connection’s; V3.3 by `UPDATE form_connections SET start_date = CURRENT_DATE` with `psql`, the browser on `about:blank` while the links were polled; connections `T030 <browser> <lang> <stamp> {v1,v3,v4 now,deactivated}` made through the API (drafts from `P3 seed live`’s content plus an empty variant “Taxi”) and published, moved, started, deactivated, reactivated, saved and deleted in the UI; V2.2 and V3.1–V3.2 are pytest (`backend/tests/api/test_scheduling.py`: `test_a_day_that_ends_while_eudiplo_answers_is_refused_and_undone`, `test_a_day_that_ends_before_the_lock_is_refused_before_eudiplo`, `test_a_day_that_ends_before_the_lock_is_refused_under_it`, `test_the_worker_makes_a_scheduled_connection_live_on_its_day[on the start day|three days later]`), cited, not rerun; CSV `<scratchpad>/T030/walk.csv`, summary `<scratchpad>/T030/summary.md`)

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

#### T036: walk V6, the activity (US3; FR-022–FR-032, SC-004, US3-AS1–AS6; scripted `playwright-core` 1.65: Chromium 156 (`/usr/bin/chromium`), 1440 × 900, browser zone Europe/Berlin, narrow rows at 320 × 800; English and German through the stored language choice; backend on 3011 with the fake EUDIPLO, `WORKER_ENABLED=false`, database `konnekt_db_010_p5`; accounts `p10-alice` (the browser) and `p10-bob` (API), the agent a personal access token `T036 agent` (level `drafts`) created for `p10-alice` through `POST /api/agent-access/tokens` and revoked at the end (its next call 401); every row compared with the text the script composed from `GET /api/form-connections/{id}/activity` and copy.md §3 (time in Europe/Berlin), the newest entries' kind and person checked against what the action should write, their time inside the action, the closed line against data-model §2.5, the agent's view the same API with the bearer (the MCP not run); drafts made and changed through the API (alice, bob, the agent), published, reactivated, scheduled, saved and approved in the UI (the editor's "Publish" → "Publish connection", "On a date" → "Schedule", the details' "Activate again" → "Activate", "Edit connection" → the edit flow's "Save" → "Save", the approval page's "Approve"); V6.3's propagation sent as the editor sends it (Standard's rule and the linked variant's unmarked copy changed together); V6.7 on `T033 open` (66 seeded entries); V6.8 with `psql`; the loading skeleton read with the connection's GET held back 1.5 s by `page.route()`; connections `T036 <lang> <stamp> {v61 (renamed), v62, v63, v64, v66 scheduled, v66 deactivated, v66 schedule, v66 save}`; CSV `<scratchpad>/T036/walk.csv`, summary `<scratchpad>/T036/summary.md`)

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

#### T044: walk V7, Undo after a deletion (US4; FR-033–FR-037, SC-005, US4-AS1–AS4; scripted `playwright-core` 1.65: Chromium (`/usr/bin/chromium`), 1440 × 900, browser zone Europe/Berlin; English and German through the stored language choice; backend on 3011 with the fake EUDIPLO, `WORKER_ENABLED=true` (2 s cycle) and `DELETION_UNDO_SECONDS=20` from the launcher's environment (no `backend/.env`), database `konnekt_db_010_p6`; account `p10-alice` (browser and API); the agent a personal access token `T044 agent` (level `manage`) created for `p10-alice` through `POST /api/agent-access/tokens` and revoked at the end (its next call 401), twice (the run and the V7.5 rerun); connections made through the API, 12 per language, each with two documents, Standard and a variant "Ambulance" with rules: `T044 <lang> <stamp> {ov,dt} {draft,live,scheduled,deactivated}` (deleted from the overview, `ov`, and from the details, `dt`: ⋯ → "Delete connection", a draft's "Delete draft"), `… last` (V7.3, the list narrowed to it by `page.route()` on `GET /api/form-connections`, the delete and the restore to the server), `… late` (V7.4, the pointer on the toast until `restorable_until` + 1.5 s), `… replay` (V7.4, the restore replayed with `page.request` in the same session), `… alone` (V7.5); V7.2 compares `GET /form-connections/{id}` before and after "Undo" (all but `last_activity`, which moves to `restored`; a deactivated one's too), the list entry, the activity (two new entries on top, the rest equal), the row's text and index, no reload and no list fetch, the details' Activity card; V7.6 on the live connections (a trigger before the deletion, approval requests `deactivate` and `delete`), the drafts (`delete_draft`) and the details' scheduled one (`delete`), read through `GET /approval-requests/{id}`, the approve attempt and the approval page; V7.7 the trigger, pull and the variant's pull URLs on 3011; V7.8 with `psql` 6 s (three worker cycles) after the last restore time; V7.5 rerun after a script error in the first run's timing origin (it counted from before the row's Delete click, 7.6 s); CSV `<scratchpad>/T044/walk.csv`, summary `<scratchpad>/T044/summary.md`)

| step | language | measures | pass | fail | unsure | notes |
|---|---|---|---|---|---|---|
| setup | - | 2 | 2 | 0 | 0 |  |
| V7.6 overview draft | en | 6 | 6 | 0 | 0 | the approval request (delete_draft) reads cancelled at the deletion: "cancelled draft_deleted"; the approval request (delete_draft) stays cancelled after "Undo": "cancelled cancelled draft_deleted" |
| V7.1 overview draft | en | 12 | 12 | 0 | 0 | restore time DELETION_UNDO_SECONDS=20: "19.4 s"; "“T044 en p7md ov draft” deleted." |
| V7.7 overview draft | en | 3 | 3 | 0 | 0 | trigger URL while restorable: "404 Not found" |
| V7.2 overview draft | en | 17 | 17 | 0 | 0 | the restore answers: "200"; "“T044 en p7md ov draft” restored."; announced politely: "“T044 en p7md ov draft” restored."; the Activity card: "Restored, Deleted" |
| V7.6 overview live | en | 13 | 13 | 0 | 0 | the approval request (deactivate) reads cancelled at the deletion: "cancelled connection_deleted"; the approval request (delete) reads cancelled at the deletion: "cancelled connection_deleted"; the approval request (deactivate) stays cancelled after "Undo": "cancelled cancelled connection_deleted"; the approval request (delete) stays cancelled after "Undo": "cancelled cancelled connection_deleted" |
| V7.1 overview live | en | 12 | 12 | 0 | 0 | restore time DELETION_UNDO_SECONDS=20: "19.4 s"; "“T044 en p7md ov live” deleted." |
| V7.7 overview live | en | 3 | 3 | 0 | 0 | trigger URL while restorable: "409 unavailable" |
| V7.2 overview live | en | 19 | 19 | 0 | 0 | the restore answers: "200"; "“T044 en p7md ov live” restored."; announced politely: "“T044 en p7md ov live” restored."; the links work again: "201"; the Activity card: "Restored, Deleted" |
| V7.1 overview scheduled | en | 12 | 12 | 0 | 0 | restore time DELETION_UNDO_SECONDS=20: "19.2 s"; "“T044 en p7md ov scheduled” deleted." |
| V7.7 overview scheduled | en | 3 | 3 | 0 | 0 | trigger URL while restorable: "409 unavailable" |
| V7.2 overview scheduled | en | 17 | 17 | 0 | 0 | the restore answers: "200"; "“T044 en p7md ov scheduled” restored."; announced politely: "“T044 en p7md ov scheduled” restored."; the Activity card: "Restored, Deleted" |
| V7.1 overview deactivated | en | 12 | 12 | 0 | 0 | restore time DELETION_UNDO_SECONDS=20: "19.4 s"; "“T044 en p7md ov deactivated” deleted." |
| V7.7 overview deactivated | en | 3 | 3 | 0 | 0 | trigger URL while restorable: "409 unavailable" |
| V7.2 overview deactivated | en | 16 | 16 | 0 | 0 | the restore answers: "200"; "“T044 en p7md ov deactivated” restored."; announced politely: "“T044 en p7md ov deactivated” restored."; the Activity card: "Restored, Deleted" |
| V7.1 details draft | en | 12 | 12 | 0 | 0 | restore time DELETION_UNDO_SECONDS=20: "19.1 s"; "“T044 en p7md dt draft” deleted." |
| V7.7 details draft | en | 3 | 3 | 0 | 0 | trigger URL while restorable: "404 Not found" |
| V7.2 details draft | en | 17 | 17 | 0 | 0 | the restore answers: "200"; "“T044 en p7md dt draft” restored."; announced politely: "“T044 en p7md dt draft” restored."; the Activity card: "Restored, Deleted" |
| V7.6 details live | en | 3 | 3 | 0 | 0 |  |
| V7.1 details live | en | 12 | 12 | 0 | 0 | restore time DELETION_UNDO_SECONDS=20: "19.1 s"; "“T044 en p7md dt live” deleted." |
| V7.7 details live | en | 3 | 3 | 0 | 0 | trigger URL while restorable: "409 unavailable" |
| V7.2 details live | en | 19 | 19 | 0 | 0 | the restore answers: "200"; "“T044 en p7md dt live” restored."; announced politely: "“T044 en p7md dt live” restored."; the links work again: "201"; the Activity card: "Restored, Deleted" |
| V7.6 details scheduled | en | 6 | 6 | 0 | 0 | the approval request (delete) reads cancelled at the deletion: "cancelled connection_deleted"; the approval request (delete) stays cancelled after "Undo": "cancelled cancelled connection_deleted" |
| V7.1 details scheduled | en | 12 | 12 | 0 | 0 | restore time DELETION_UNDO_SECONDS=20: "19.0 s"; "“T044 en p7md dt scheduled” deleted." |
| V7.7 details scheduled | en | 3 | 3 | 0 | 0 | trigger URL while restorable: "409 unavailable" |
| V7.2 details scheduled | en | 17 | 17 | 0 | 0 | the restore answers: "200"; "“T044 en p7md dt scheduled” restored."; announced politely: "“T044 en p7md dt scheduled” restored."; the Activity card: "Restored, Deleted" |
| V7.1 details deactivated | en | 12 | 12 | 0 | 0 | restore time DELETION_UNDO_SECONDS=20: "19.1 s"; "“T044 en p7md dt deactivated” deleted." |
| V7.7 details deactivated | en | 3 | 3 | 0 | 0 | trigger URL while restorable: "409 unavailable" |
| V7.2 details deactivated | en | 16 | 16 | 0 | 0 | the restore answers: "200"; "“T044 en p7md dt deactivated” restored."; announced politely: "“T044 en p7md dt deactivated” restored."; the Activity card: "Restored, Deleted" |
| V7.3 the last connection | en | 10 | 10 | 0 | 0 | the welcome page: "Welcome to Konnekt" |
| V7.4 "Undo" after the restore time | en | 7 | 7 | 0 | 0 | the toast stays while the pointer is on it: "“T044 en p7md late” deleted. (21.5 s after the deletion)"; the restore answers: "409 not_restorable"; the toast says so: "“T044 en p7md late” can no longer be restored." |
| V7.4 a second "Undo" (replayed) | en | 5 | 5 | 0 | 0 | the replayed request: "409 not_restorable" |
| V7.5 the toast left alone (rerun) | en | 5 | 5 | 0 | 0 | closes after 6 s (+ 100 ms live-region delay): "6.33 s, shown at 5.4 s: true" |
| V7.6 overview draft | de | 6 | 6 | 0 | 0 | the approval request (delete_draft) reads cancelled at the deletion: "cancelled draft_deleted"; the approval request (delete_draft) stays cancelled after "Undo": "cancelled cancelled draft_deleted" |
| V7.1 overview draft | de | 12 | 12 | 0 | 0 | restore time DELETION_UNDO_SECONDS=20: "19.5 s"; "„T044 de 7tc7 ov draft“ gelöscht." |
| V7.7 overview draft | de | 3 | 3 | 0 | 0 | trigger URL while restorable: "404 Not found" |
| V7.2 overview draft | de | 17 | 17 | 0 | 0 | the restore answers: "200"; "„T044 de 7tc7 ov draft“ wiederhergestellt."; announced politely: "„T044 de 7tc7 ov draft“ wiederhergestellt."; the Activity card: "Wiederhergestellt, Gelöscht" |
| V7.6 overview live | de | 13 | 13 | 0 | 0 | the approval request (deactivate) reads cancelled at the deletion: "cancelled connection_deleted"; the approval request (delete) reads cancelled at the deletion: "cancelled connection_deleted"; the approval request (deactivate) stays cancelled after "Undo": "cancelled cancelled connection_deleted"; the approval request (delete) stays cancelled after "Undo": "cancelled cancelled connection_deleted" |
| V7.1 overview live | de | 12 | 12 | 0 | 0 | restore time DELETION_UNDO_SECONDS=20: "19.2 s"; "„T044 de 7tc7 ov live“ gelöscht." |
| V7.7 overview live | de | 3 | 3 | 0 | 0 | trigger URL while restorable: "409 unavailable" |
| V7.2 overview live | de | 19 | 19 | 0 | 0 | the restore answers: "200"; "„T044 de 7tc7 ov live“ wiederhergestellt."; announced politely: "„T044 de 7tc7 ov live“ wiederhergestellt."; the links work again: "201"; the Activity card: "Wiederhergestellt, Gelöscht" |
| V7.1 overview scheduled | de | 12 | 12 | 0 | 0 | restore time DELETION_UNDO_SECONDS=20: "19.5 s"; "„T044 de 7tc7 ov scheduled“ gelöscht." |
| V7.7 overview scheduled | de | 3 | 3 | 0 | 0 | trigger URL while restorable: "409 unavailable" |
| V7.2 overview scheduled | de | 17 | 17 | 0 | 0 | the restore answers: "200"; "„T044 de 7tc7 ov scheduled“ wiederhergestellt."; announced politely: "„T044 de 7tc7 ov scheduled“ wiederhergestellt."; the Activity card: "Wiederhergestellt, Gelöscht" |
| V7.1 overview deactivated | de | 12 | 12 | 0 | 0 | restore time DELETION_UNDO_SECONDS=20: "19.2 s"; "„T044 de 7tc7 ov deactivated“ gelöscht." |
| V7.7 overview deactivated | de | 3 | 3 | 0 | 0 | trigger URL while restorable: "409 unavailable" |
| V7.2 overview deactivated | de | 16 | 16 | 0 | 0 | the restore answers: "200"; "„T044 de 7tc7 ov deactivated“ wiederhergestellt."; announced politely: "„T044 de 7tc7 ov deactivated“ wiederhergestellt."; the Activity card: "Wiederhergestellt, Gelöscht" |
| V7.1 details draft | de | 12 | 12 | 0 | 0 | restore time DELETION_UNDO_SECONDS=20: "19.0 s"; "„T044 de 7tc7 dt draft“ gelöscht." |
| V7.7 details draft | de | 3 | 3 | 0 | 0 | trigger URL while restorable: "404 Not found" |
| V7.2 details draft | de | 17 | 17 | 0 | 0 | the restore answers: "200"; "„T044 de 7tc7 dt draft“ wiederhergestellt."; announced politely: "„T044 de 7tc7 dt draft“ wiederhergestellt."; the Activity card: "Wiederhergestellt, Gelöscht" |
| V7.6 details live | de | 3 | 3 | 0 | 0 |  |
| V7.1 details live | de | 12 | 12 | 0 | 0 | restore time DELETION_UNDO_SECONDS=20: "19.0 s"; "„T044 de 7tc7 dt live“ gelöscht." |
| V7.7 details live | de | 3 | 3 | 0 | 0 | trigger URL while restorable: "409 unavailable" |
| V7.2 details live | de | 19 | 19 | 0 | 0 | the restore answers: "200"; "„T044 de 7tc7 dt live“ wiederhergestellt."; announced politely: "„T044 de 7tc7 dt live“ wiederhergestellt."; the links work again: "201"; the Activity card: "Wiederhergestellt, Gelöscht" |
| V7.6 details scheduled | de | 6 | 6 | 0 | 0 | the approval request (delete) reads cancelled at the deletion: "cancelled connection_deleted"; the approval request (delete) stays cancelled after "Undo": "cancelled cancelled connection_deleted" |
| V7.1 details scheduled | de | 12 | 12 | 0 | 0 | restore time DELETION_UNDO_SECONDS=20: "19.1 s"; "„T044 de 7tc7 dt scheduled“ gelöscht." |
| V7.7 details scheduled | de | 3 | 3 | 0 | 0 | trigger URL while restorable: "409 unavailable" |
| V7.2 details scheduled | de | 17 | 17 | 0 | 0 | the restore answers: "200"; "„T044 de 7tc7 dt scheduled“ wiederhergestellt."; announced politely: "„T044 de 7tc7 dt scheduled“ wiederhergestellt."; the Activity card: "Wiederhergestellt, Gelöscht" |
| V7.1 details deactivated | de | 12 | 12 | 0 | 0 | restore time DELETION_UNDO_SECONDS=20: "19.1 s"; "„T044 de 7tc7 dt deactivated“ gelöscht." |
| V7.7 details deactivated | de | 3 | 3 | 0 | 0 | trigger URL while restorable: "409 unavailable" |
| V7.2 details deactivated | de | 16 | 16 | 0 | 0 | the restore answers: "200"; "„T044 de 7tc7 dt deactivated“ wiederhergestellt."; announced politely: "„T044 de 7tc7 dt deactivated“ wiederhergestellt."; the Activity card: "Wiederhergestellt, Gelöscht" |
| V7.3 the last connection | de | 10 | 10 | 0 | 0 | the welcome page: "Willkommen bei Konnekt" |
| V7.4 "Undo" after the restore time | de | 7 | 7 | 0 | 0 | the toast stays while the pointer is on it: "„T044 de 7tc7 late“ gelöscht. (21.5 s after the deletion)"; the restore answers: "409 not_restorable"; the toast says so: "„T044 de 7tc7 late“ kann nicht mehr wiederhergestellt werden." |
| V7.4 a second "Undo" (replayed) | de | 5 | 5 | 0 | 0 | the replayed request: "409 not_restorable" |
| V7.5 the toast left alone (rerun) | de | 5 | 5 | 0 | 0 | closes after 6 s (+ 100 ms live-region delay): "6.38 s, shown at 5.4 s: true" |
| V7.8 after the restore time | en | 33 | 33 | 0 | 0 | live: "0/1" |
| V7.8 after the restore time | de | 33 | 33 | 0 | 0 | live: "0/1" |
| V7.8 after the restore time | - | 4 | 4 | 0 | 0 | restored connections: "0" |
| V7.8 after the restore time (rerun: V7.5's drafts) | en | 5 | 5 | 0 | 0 |  |
| V7.8 after the restore time (rerun: V7.5's drafts) | de | 5 | 5 | 0 | 0 |  |
| V7.8 after the restore time (rerun: V7.5's drafts) | - | 1 | 1 | 0 | 0 |  |
| teardown | - | 2 | 2 | 0 | 0 |  |
| setup (rerun) | - | 1 | 1 | 0 | 0 |  |
| teardown (rerun) | - | 2 | 2 | 0 | 0 |  |

74 rows; 714 measures, 714 pass, 0 fail, 0 unsure.

The first run (700 measures, `T044/walk-run1.csv`) had 2 failing measures, both V7.5's closing time (7.60 s en, 7.54 s de): the script counted from before the row's Delete click and the dialog; counted from the toast's appearance, the rerun (`T044/walk-v75-rerun.csv`, new `… alone` drafts, its own token made and revoked) read 6.33 s and 6.38 s, and its V7.5 and V7.8 rows replace the first run's V7.5 rows here. No product file changed; two screenshots (V7.5 of the first run, en and de) were taken by the script and not needed. Two trial runs before the walk (V7.1/V7.2/V7.6/V7.7 in English) left 24 more `T044 en …` connections, all restored.

#### T051: walk V8, bulk delete (US5; FR-038–FR-044, FR-081, SC-006, US5-AS1–AS6; scripted `playwright-core` 1.65: Chromium (`/usr/bin/chromium`), 1440 × 900 viewport (the 1455 px window's 1440 CSS px), browser zone Europe/Berlin; English and German through the stored language choice, one fresh browser context per language; backend on 3011 with the fake EUDIPLO, `WORKER_ENABLED=false`, the default restore time (300 s), database `konnekt_db_010_p7`; Vite on 5175; account `p10-alice` (browser and API); connections made through the API, 18 per language, named `T051 <lang> <stamp> …` (drafts from `P3 seed live`'s documents and Standard rules, published ones through `POST /form-connections`, `scheduled` with `start_date` 2026-12-20, `deactivated` deactivated through the API): `v1 {live, scheduled, draft}` (V8.1–V8.4), `v5 {live, scheduled, draft}` (V8.5), `v6 01 … 10` (4 live, 3 drafts, 2 scheduled, 1 deactivated; V8.6), `v7 {draft, live}` (V8.7); every step filters the overview by its own `<prefix> v<n>` search (V8.2 also by the whole `<prefix>`, 18 rows), and the walk deleted only its own rows. Measured per step: the texts against the ones composed from copy.md §4/§8, the glossary German of design-notes §4.2 T049 and the API's states and dates; the bar's `role="status"` count and the toasts' live region; the select-all's `checked`/`indeterminate`; the toolbar's `display` and the bar's box against the toolbar's; the focus after Cancel, Keep, Escape, a deletion and "Undo"; the request body (`id`, `state` per row), the answer, `deletion_id`/`deleted_at` with `psql`, `GET /form-connections` and `GET /form-connections/{id}` after each action (V8.4: the restored rows equal to before but for `last_activity`, which reads `restored`); one h1 and no horizontal scroll per step. Special states: V8.3's scrim click at (8, 8) on the backdrop; V8.5 the selected `v5 live` deactivated with the page's own session (`context.request.post(…/deactivate)`) while the bulk dialog was open, then "Delete connections" (the real `409 selection_changed`; the quiet reload awaited; the confirm button's "Try again" is design-notes §4.3's open point for T084 and recorded as built, not as a failure); V8.4's toast held by the pointer while measuring (FR-082); V8.6 ten checkboxes ticked one by one, the times taken in Node from the first checkbox click and from the "Delete connections" click to the toast's sentence (polled per animation frame); V8.7 a device-only connection (`/form-connections/new`, a name typed, 2 s, then `page.goto('/')` with the `beforeunload` dialog accepted) and an edited local draft of `v7 draft` (`/form-connections/<id>/edit`, the description changed, 2 s, then away by navigating), the records read back from `localStorage` for the banner's dates. Backend log lines between `=== T051 start 2026-11-11T20:09:55Z ===` and `=== T051 end 2026-11-11T20:10:59Z ===` in `<scratchpad>/backend-3011.log`. CSV `<scratchpad>/T051/walk.csv`, summary `<scratchpad>/T051/summary.md`)

| step | language | measures | pass | fail | unsure | notes |
|---|---|---|---|---|---|---|
| setup | en | 1 | 1 | 0 | 0 |  |
| V8.1 two of three rows | en | 20 | 20 | 0 | 0 | announced count: "2 selected" |
| V8.2 select-all under a search | en | 16 | 16 | 0 | 0 |  |
| V8.3 the dialogs | en | 23 | 23 | 0 | 0 |  |
| V8.4 delete and Undo | en | 32 | 32 | 0 | 0 | click to toast: "0.29" s; toast text: "3 connections deleted."; restored toast text: "3 connections restored." |
| V8.5 changed in the meantime | en | 18 | 18 | 0 | 0 | the dialog names the changed row: "Couldn’t delete /  / Nothing was deleted: “T051 en za1z v5 live” was deleted or changed in…" |
| V8.6 ten connections | en | 20 | 20 | 0 | 0 | SC-006: "Delete connections" click to toast: "0.32" s; SC-006: first checkbox click to toast: "1.45" s; toast text: "10 connections deleted." |
| V8.7 the local-drafts banner | en | 19 | 19 | 0 | 0 | select-all counts only rows: "2 selected"; banner above the selection bar: "396 / 412" |
| setup | de | 1 | 1 | 0 | 0 |  |
| V8.1 two of three rows | de | 20 | 20 | 0 | 0 | announced count: "2 ausgewählt" |
| V8.2 select-all under a search | de | 16 | 16 | 0 | 0 |  |
| V8.3 the dialogs | de | 23 | 23 | 0 | 0 |  |
| V8.4 delete and Undo | de | 32 | 32 | 0 | 0 | click to toast: "0.27" s; toast text: "3 Anbindungen gelöscht."; restored toast text: "3 Anbindungen wiederhergestellt." |
| V8.5 changed in the meantime | de | 18 | 18 | 0 | 0 | the dialog names the changed row: "Die Anbindungen konnten nicht gelöscht werden /  / Nichts wurde gelöscht: „T051 de zxwc v5…" |
| V8.6 ten connections | de | 20 | 20 | 0 | 0 | SC-006: "Delete connections" click to toast: "0.35" s; SC-006: first checkbox click to toast: "1.45" s; toast text: "10 Anbindungen gelöscht." |
| V8.7 the local-drafts banner | de | 19 | 19 | 0 | 0 | select-all counts only rows: "2 ausgewählt"; banner above the selection bar: "420 / 436" |

16 rows; 298 measures, 298 pass, 0 fail, 0 unsure.

SC-006's times (V8.6, ten connections, one confirmation): "Delete connections" click to the toast 0.32 s (en) and 0.35 s (de); the first checkbox click to the toast 1.45 s (en, de); the click to the server's `201` 0.19 s and 0.20 s. The 30 seconds by hand and a screen reader on the count are left for a person (phase 7 "Needs a person"). No product file changed; no screenshot was needed (no failing or unsure row). Three trial runs before the walk (one stopped by a script error after making its rows, `T051 en wq9a`; `T051 en wynu` with a script error at V8.7's storage read, its 130 earlier measures passing; `T051 de ybjk`, 148 of 148 passing) made 54 more `T051 …` rows, outside the log markers.

#### T061: walk V9, the documents' order (US6; FR-045–FR-052, SC-007, US6-AS1–AS5; scripted `playwright-core` 1.65: Chromium 156 (`/usr/bin/chromium`) and Firefox 159 (build 1572), 1440 × 900 viewport (V9.3's touch 1024 × 600 with `hasTouch`, as T059), browser zone Europe/Berlin; English and German through the stored language choice, one fresh browser context per browser × language × sub-walk (the main flow V9.1/V9.2/V9.5/V9.6/V9.7, the keyboard V9.4, the touch V9.3, reduced motion V9.8), so that the focus after each move was read in a fresh context and no local draft outlived its context; backend on 3012 with the fake EUDIPLO, `WORKER_ENABLED=false`, database `konnekt_db_010_p8` (Alembic head `e7ebbd07dc57`); Vite on 5176; account `p10-alice` (browser and API); the agent a personal access token `T061 <browser> agent` (level `drafts`) created per browser through `POST /api/agent-access/tokens`, used for one `publish` approval request per language, and revoked at the end (its next call 401); connections made through the API as drafts from `P3 seed live`'s documents (all their fields) and its Standard rules (Personal ID's date of birth, Driving licence's classes), five per browser × language, named `T061 <lang> <browser initial + stamp> {main, keyboard, one document, touch, reduced}`: `main` with no document (V9.1 adds Driving licence, then Personal ID, in the UI; it was saved with "Save and exit", reopened, published through the editor's "Publish" → "Publish connection" and saved in the edit flow), `keyboard` (Driving licence, Personal ID), `one document` (Driving licence), `touch` and `reduced` (Personal ID, Driving licence); none deleted. Measured per step: the list's order (`li[data-drag-row]`), the open document (`aria-current`) and the pager against the composed "Document n of m", the drop line (8 px box, 2 px bar, rgb(29, 86, 240)) and the faded copy (text, opacity 0.85, width `max(40, min(row, row − 8 − dx))`, T059a) while dragging, the polite region `#documents-move-status` against copy.md §5 in both languages, the focus (`document.activeElement`, `:focus-visible`: none after a mouse drop, the ring after the keyboard), the ⋯'s accessible name, the menu's entries per row, the removal toast and "Undo"'s place, the stored order (API, `document_order` with `psql`), the test step's data groups (`h3.sr-only`), the approval page's summary lines and Summary card, the publish and save dialogs' document lines, the details' Summary; V9.7 `current_revision`, `current_rule_set`, the current revision's `config_hash` and `eudiplo_config_id` and the revision count with `psql`, the status dates (`state`, `published_at`, `activated_at`, `deactivated_at`, `start_date`) and `updated_at` from `GET /form-connections/{id}`, the activity (`GET …/activity`), a trigger before and one after the save (`POST /api/connect/{id}/requests`, without a cookie) with their `document_requests.revision_id`, a pull of each, and the revision's documents (catalog order); V9.3 touch through CDP `Input.dispatchTouchEvent` in Chromium and Juggler's `Page.dispatchTouchEvent` in Firefox (each `touchmove`'s `defaultPrevented` read in a window bubble-phase listener); V9.8 the largest computed `transition-duration` over the rows, their parts, the line and the copy while dragging and right after the drop; one h1 and no horizontal scroll (`scrollWidth`, element boxes) per step. V9.4's middle row: the catalog has two document types, so no list has a middle row; its "Move up" and "Move down" are covered by `moveTargetsOf`'s tests (`DocumentsStep/utils.test.ts`, T058; design-notes §4.3). V9.7's "a pull delivers the documents in the same order as before": the fake EUDIPLO runs inside the 3012 process and can't be made to share from outside, so the walk's pulls answer pending without documents; the delivery's order is pinned by T054's pytest `backend/tests/api/test_connect.py::test_the_teams_document_order_doesnt_change_the_delivery`, and the walk shows the request started after the save on the same revision as the one before it, with `current_revision` and `config_hash` unchanged. "No EUDIPLO call" is shown by the unchanged `eudiplo_config_id` and revision count; T054's `test_document_order.py::test_a_save_that_only_reorders_creates_no_revision_and_calls_no_eudiplo` counts the fake's calls. Backend log lines between `=== T061 chromium start 2026-11-11T22:29:30.525Z ===` and `=== T061 firefox end 2026-11-11T22:33:35.180Z ===` in `<scratchpad>/backend-3012.log`. CSV `<scratchpad>/T061/walk.csv`, summary `<scratchpad>/T061/summary.md`)

| step | browser | language | measures | pass | fail | unsure | needs a person | notes |
|---|---|---|---|---|---|---|---|---|
| V9.1 added order | chromium | en | 5 | 5 | 0 | 0 | 0 |  |
| V9.2 mouse drag | chromium | en | 17 | 17 | 0 | 0 | 0 | “Personal ID” moved to position 1 of 2. |
| V9.5 remove and Undo | chromium | en | 8 | 8 | 0 | 0 | 0 |  |
| V9.6 the order everywhere | chromium | en | 16 | 16 | 0 | 0 | 0 | ["Driving licence","Personal ID"] |
| V9.7 reorder a published connection | chromium | en | 14 | 14 | 0 | 0 | 0 | [4,"documents_changed"] |
| V9.4 keyboard | chromium | en | 13 | 13 | 0 | 0 | 0 | “Personal ID” moved to position 1 of 2. |
| V9.3 touch | chromium | en | 13 | 13 | 0 | 0 | 0 |  |
| V9.8 reduced motion | chromium | en | 7 | 7 | 0 | 0 | 0 |  |
| V9.1 added order | chromium | de | 5 | 5 | 0 | 0 | 0 |  |
| V9.2 mouse drag | chromium | de | 17 | 17 | 0 | 0 | 0 | „Personalausweis“ auf Position 1 von 2 verschoben. |
| V9.5 remove and Undo | chromium | de | 8 | 8 | 0 | 0 | 0 |  |
| V9.6 the order everywhere | chromium | de | 16 | 16 | 0 | 0 | 0 | ["Führerschein","Personalausweis"] |
| V9.7 reorder a published connection | chromium | de | 14 | 14 | 0 | 0 | 0 | [4,"documents_changed"] |
| V9.4 keyboard | chromium | de | 13 | 13 | 0 | 0 | 0 | „Personalausweis“ auf Position 1 von 2 verschoben. |
| V9.3 touch | chromium | de | 13 | 13 | 0 | 0 | 0 |  |
| V9.8 reduced motion | chromium | de | 7 | 7 | 0 | 0 | 0 |  |
| teardown | chromium | - | 2 | 2 | 0 | 0 | 0 |  |
| V9.1 added order | firefox | en | 5 | 5 | 0 | 0 | 0 |  |
| V9.2 mouse drag | firefox | en | 17 | 17 | 0 | 0 | 0 | “Personal ID” moved to position 1 of 2. |
| V9.5 remove and Undo | firefox | en | 8 | 8 | 0 | 0 | 0 |  |
| V9.6 the order everywhere | firefox | en | 16 | 16 | 0 | 0 | 0 | ["Driving licence","Personal ID"] |
| V9.7 reorder a published connection | firefox | en | 14 | 14 | 0 | 0 | 0 | [4,"documents_changed"] |
| V9.4 keyboard | firefox | en | 13 | 13 | 0 | 0 | 0 | “Personal ID” moved to position 1 of 2. |
| V9.3 touch | firefox | en | 13 | 11 | 0 | 0 | 2 |  |
| V9.8 reduced motion | firefox | en | 7 | 7 | 0 | 0 | 0 |  |
| V9.1 added order | firefox | de | 5 | 5 | 0 | 0 | 0 |  |
| V9.2 mouse drag | firefox | de | 17 | 17 | 0 | 0 | 0 | „Personalausweis“ auf Position 1 von 2 verschoben. |
| V9.5 remove and Undo | firefox | de | 8 | 8 | 0 | 0 | 0 |  |
| V9.6 the order everywhere | firefox | de | 16 | 16 | 0 | 0 | 0 | ["Führerschein","Personalausweis"] |
| V9.7 reorder a published connection | firefox | de | 14 | 14 | 0 | 0 | 0 | [4,"documents_changed"] |
| V9.4 keyboard | firefox | de | 13 | 13 | 0 | 0 | 0 | „Personalausweis“ auf Position 1 von 2 verschoben. |
| V9.3 touch | firefox | de | 13 | 11 | 0 | 0 | 2 |  |
| V9.8 reduced motion | firefox | de | 7 | 7 | 0 | 0 | 0 |  |
| teardown | firefox | - | 2 | 2 | 0 | 0 | 0 |  |

34 rows; 376 measures: 372 pass, 0 fail, 0 unsure, 4 needs a person.

The first run (Chromium, English, 22:29) failed one measure: V9.6, the test step's data listed Personal ID before Driving licence for a draft stored as Driving licence, Personal ID (FR-050). The editor handed the rules logic the requested documents in catalog order (`requestedRuleDocuments()`), and `personaFieldsOf()` lists the data in `context.documents`' order. Fixed in `frontend/src/pages/FormConnectionEditor/{utils.ts,index.tsx}` (T056's files): `ruleDocumentsInListOrder(documentTypes, documents)` puts them in the list's order, and the editor's rule context and its pre-check after "Remove n documents" use it. Its test is in `utils.test.ts`. The run also had a script error on the ⋯'s name: it read `aria-label`, but the button's name comes from its `sr-only` text, so the script now reads the accessible name. The rows above are the reruns after the fix (Chromium 22:31, Firefox 22:32): every step in both browsers and both languages. "Needs a person" (4 rows): in Firefox, Juggler's touch neither scrolls the page nor makes the browser send `pointercancel`, so "a short swipe scrolls" and the browser's cancel are left for a real touch screen, as in T059's table. Chromium covers both with CDP's real touch stream.

The rows that remain are the reruns' 20 connections (`T061 {en,de} {c4nu5, csrj8, f56xk, fs3jb} …`) and the first run's five (`T061 en cnobm …`, its `main` published). Three exploration drafts (`T061 explore` ×2, `T061 explore 2`), made while the script was being written, were deleted with `DELETE /form-connections/{id}/draft`. The exploration's token `T061 explore agent` and the two walk tokens were revoked: `agent_authorizations` holds no `T061` row.

#### T070: walk V10, the example (US7; FR-053–FR-061, SC-008, US7-AS1–AS6; scripted `playwright-core` 1.65: Chromium (`/usr/bin/chromium`), 1440 × 900 viewport, browser zone Europe/Berlin; English and German through the stored language choice, one fresh browser context per language; pair B: backend on 3013 with the fake EUDIPLO, `WORKER_ENABLED=false`, the default restore time (300 s), database `konnekt_db_010_p9_empty` (an installation without connections; Alembic head `1b6d7a28c6b2`), Vite on 5177; account `p10-alice` (browser and API). Per language: V10.1 the welcome page's two buttons (classes, same row, 16 px apart), the dialog (title by `aria-labelledby`, text, ×/cancel/confirm), "Create the example" to step 1 (`POST /api/form-connections/example` 201 with the language's `Accept-Language`, the edit route, "Step 1 of 4", the name and description inputs, the banner as the form's first child, the stored draft from `GET /form-connections/{id}`: `example` "unchanged", `step` "connection", `version` 1, documents pid 7 / mdl 2, the variant's name and description, the four messages, marks and years) and SC-008's time from the click on "Start from an example" until step 1's h1, banner and name are in the page (Node `Date.now()`); V10.2 the banner's sentence on every step (one banner, no control in it; above "Added documents", above the variant tabs, above the test day's line and the tabs), the rules step's tabs (names, selection, no icon and no digit in the tab or beside it outside the ⓘ button), no `[data-findings-banner]`, the rule rows' statements (rules/src/example.test.ts) and "Message for citizens:" lines (copy.md §6) in the visible tab panel; V10.4 the overview with the example left at step 1 (the list summary, the row's "Edited <updated_at in Europe/Berlin> · Connection step", the "Draft" pill, exactly one "Create connection" control and no "Start from an example" anywhere, no local draft); V10.5 (German only, on the German example before publishing) the language switched to English with the header's "EN": the overview and the row's meta in English with the German name, step 1's inputs German, the banners English with the variant's "Krankentransport is more lenient than Standard. …" (§4.2 T066), the tab "Krankentransport", English statements with German messages, `GET` with `Accept-Language: en` answering the German content; then back to German; V10.3 the unchanged example published from the test step's "Publish" (the line as the only `li` of its `ul` after "Active from", the summary "Personal ID · 7 data items", "Driving licence · 2 data items", "Standard · 2 rules", "Ambulance · 2 rules" and their German, "Publish connection", the `/publish` call 2xx, the details page "Your connection is active", `GET` live with `published_at` inside the action), a second example made with `fetch` from the signed-in page (`credentials: 'include'`, body `{}`, the language's `Accept-Language`), Rule 01's age set to 18 in the UI ("Actions for Rule 01" → "Edit rule" → 18 → "Save rule"), the publish dialog without the line while the page held the change, "Back to test", "Save and exit" (`PUT …/draft` 200, `example` "changed", the variant's copy kept at 19), reopened at its stored step and the publish dialog again without the line and without any "example" text; V10.6 the list summary's `example` null for the published one and "changed" for the second, no `example` key on the published `GET /form-connections/{id}`, `form_connections.example` null (`psql`), and no banner on any step of the published connection's edit flow (connection, documents, rules with Standard and the variant, test). Every step also measured exactly one h1 (its text against the copy tables) and no horizontal scroll (`scrollWidth`, element boxes past either edge). Leaving: edited editors by navigating (no `beforeunload` prompt seen), no `konnekt:local-draft:v1:p10-alice:` key left. Connections made: per language the welcome page's example (published) and the second example (draft, changed): en `456dfc44-a3c5-4af6-b1cc-e2a4d93419c7`, `80824cd6-1ee1-4460-8343-d88398ea00ce`; de `609a50de-9f3b-4892-a437-a3d8809982a6`, `e053be97-a317-4757-a6ad-8fba653c29f2`; all four deleted at the end of their run with the overview row's "Delete <name>" → "Delete connection" ("<name> löschen" → "Anbindung löschen"), the welcome page back and no connection without `deleted_at` (`psql`), so the German run started from the welcome page. Backend log lines between `=== T070 en start 2026-11-12T00:13:27.297Z ===` and `=== T070 de end 2026-11-12T00:15:49.086Z ===` in `<scratchpad>/backend-3013.log`. CSV `<scratchpad>/T070/walk.csv`, summary `<scratchpad>/T070/summary.md`)

| step | language | measures | pass | fail | unsure | notes |
|---|---|---|---|---|---|---|
| V10.1 welcome page | en | 6 | 6 | 0 | 0 |  |
| V10.1 the dialog | en | 6 | 6 | 0 | 0 |  |
| V10.1 to step 1 | en | 18 | 18 | 0 | 0 | SC-008: 548 ms; click→dialog; create→step 1: 126; 263 ms |
| V10.2 documents step | en | 9 | 9 | 0 | 0 |  |
| V10.2 rules step, Standard | en | 13 | 13 | 0 | 0 |  |
| V10.2 rules step, the variant | en | 11 | 11 | 0 | 0 |  |
| V10.2 test step | en | 9 | 9 | 0 | 0 |  |
| V10.4 overview | en | 8 | 8 | 0 | 0 |  |
| V10.3 publish dialog, unchanged | en | 6 | 6 | 0 | 0 |  |
| V10.3 publishing works | en | 5 | 5 | 0 | 0 |  |
| V10.3 second example, age changed | en | 8 | 8 | 0 | 0 |  |
| V10.3 second example, dialog reopened | en | 6 | 6 | 0 | 0 |  |
| V10.6 published: API | en | 4 | 4 | 0 | 0 |  |
| V10.6 published edit flow, connection | en | 4 | 4 | 0 | 0 |  |
| V10.6 published edit flow, documents | en | 4 | 4 | 0 | 0 |  |
| V10.6 published edit flow, rules | en | 5 | 5 | 0 | 0 |  |
| V10.6 published edit flow, test | en | 6 | 6 | 0 | 0 |  |
| teardown | en | 4 | 4 | 0 | 0 |  |
| V10.1 welcome page | de | 6 | 6 | 0 | 0 |  |
| V10.1 the dialog | de | 6 | 6 | 0 | 0 |  |
| V10.1 to step 1 | de | 18 | 18 | 0 | 0 | SC-008: 481 ms; click→dialog; create→step 1: 95; 228 ms |
| V10.2 documents step | de | 9 | 9 | 0 | 0 |  |
| V10.2 rules step, Standard | de | 13 | 13 | 0 | 0 |  |
| V10.2 rules step, the variant | de | 11 | 11 | 0 | 0 |  |
| V10.2 test step | de | 9 | 9 | 0 | 0 |  |
| V10.4 overview | de | 8 | 8 | 0 | 0 |  |
| V10.5 switched to English | de | 25 | 25 | 0 | 0 |  |
| V10.3 publish dialog, unchanged | de | 6 | 6 | 0 | 0 |  |
| V10.3 publishing works | de | 5 | 5 | 0 | 0 |  |
| V10.3 second example, age changed | de | 8 | 8 | 0 | 0 |  |
| V10.3 second example, dialog reopened | de | 6 | 6 | 0 | 0 |  |
| V10.6 published: API | de | 4 | 4 | 0 | 0 |  |
| V10.6 published edit flow, connection | de | 4 | 4 | 0 | 0 |  |
| V10.6 published edit flow, documents | de | 4 | 4 | 0 | 0 |  |
| V10.6 published edit flow, rules | de | 5 | 5 | 0 | 0 |  |
| V10.6 published edit flow, test | de | 6 | 6 | 0 | 0 |  |
| teardown | de | 4 | 4 | 0 | 0 |  |

37 rows; 289 measures: 289 pass, 0 fail, 0 unsure.

SC-008 (from the click on "Start from an example" to step 1 with its h1, banner and name, two activations): 548 ms in English, 481 ms in German (click → dialog 126 / 95 ms; "Create the example" → step 1 263 / 228 ms), the script's clicks without a person's reading time; the 10 seconds by hand remain the phase's "Needs a person".

Before the counted run, two English runs (markers `=== T070 en start 2026-11-12T00:10:11.128Z ===` to `… end 2026-11-12T00:11:17.601Z ===` and `… 00:11:31.793Z` to `… 00:12:38.707Z`) failed only on the script's own selectors: the test step's persona chips are `role="tab"` too, the rules step's tablist is an empty element that owns its tabs by `aria-owns` (so its box isn't the tab row's), and the publish dialog's summary values are `dd > span`, not `dd p` (T068's labels note). Fixed in the script, no app change; their rows were discarded. The connections of those runs and of the exploration (`8690c532…` published, `995f829f…`, `45259251…`, `1f490c79…`, `2b7c9003…`, `2b7535ac…`, `81393e96…`) were deleted with the app's own delete as well; `konnekt_db_010_p9_empty` holds no connection without `deleted_at`.

#### T076: walk V11, data groups (US9; FR-077–FR-079, SC-012, US9-AS1–AS4; scripted `playwright-core` 1.65: Chromium 156 (`/usr/bin/chromium`), 1440 × 900 viewport, browser zone Europe/Berlin; English and German through the stored language choice, one fresh browser context per language and per flow (the draft's V11.1–V11.3 and V11.5, the edit flow's V11.4, each of SC-012's two drafts); backend on 3014 with the fake EUDIPLO, `WORKER_ENABLED=false`, database `konnekt_db_010_p10` (Alembic head `1b6d7a28c6b2`; T072's catalog groups in the running code); Vite on 5178; account `p10-alice` (browser and API). Connections made through the API by p10-alice, none deleted: per language a draft `T076 <lang> rules` (step "documents") and a published `T076 <lang> live`, both with `P3 seed live`'s documents (Personal ID: family_name, given_name, birthdate, address_locality; Driving licence: expiry_date, document_number, driving_privileges) and its Standard rules (Rule 01 on `pid.birthdate`, Rule 02 on `mdl.driving_privileges`), and two drafts `T076 <lang> by group` and `T076 <lang> one by one` (Personal ID and Driving licence without data, Standard empty): en `5b896c10-373c-4926-93f1-568ccfac4692`, `50f95cc3-74a3-4521-801f-365ee3603c44`, `33566776-fddd-4df3-a6e8-3436c0d42e01`, `28972093-ecf2-4878-b49f-5085ab9b1cd1`; de `86e2cb59-75d4-4bf7-b840-3e5fe8a3fd97`, `b292a293-1749-4eb9-8f88-749ea53fb19c`, `bb4baa27-429e-40df-89f9-efe6500ca0aa`, `97f8345c-8297-4ea8-b0f6-dd0534e47468`. Measured, from the DOM of `#document-detail`: V11.1 for both documents the shown document's title, `column-count` of the group list and the count of distinct group lefts (3), the group boxes' keys (`#document-<doc>-group-<key>`) and `label[for]` names in order, each group's count of data items, the order read down the columns (groups sorted by left, then top) against the catalog's, no group split (`getClientRects()` one box, one item left per group), the items' list named after the group (`ul[aria-label]`), "All data items" above the first group, the whole panel (groups, labels, data items in catalog order) against `GET /api/document-types` with the language's `Accept-Language`, every data item in one group, the Personal ID's Birth (`birthdate`, `place_of_birth`, `nationalities`, `sex`; Clarification 2026-11-11), the stored data shown ticked; V11.2 on the Driving licence: a clear group (Name) ticked, an item of Appearance ticked (mixed), the stored mixed groups (Document, Licence), the mixed Appearance and Licence ticked (all chosen, no question even for Licence, which Rule 02 checks, the earlier choice kept), every group ticked ("All data items" ticked, "31 of 31"), Appearance cleared (no question, "25 of 31"), and Space on its box (all ticked, focus and `:focus-visible` on the box); after every action each group box's ticked/mixed/clear state against its data items, "All data items"' state and the count line against copy.md §5's "<n> of <m> data items chosen" / "<n> von <m> Feldern ausgewählt"; V11.3 Licence (Driving licence, Rule 02) and Birth (Personal ID, Rule 01) ticked, then cleared: `dialog[open]` first with nothing cleared, its title (copy.md §5), its text "1 rule checks this data: Rule 0n in Standard. Edit or delete it before you publish." / "1 Regel prüft diese Daten: Rule 0n in Standard. Bearbeiten oder löschen Sie die Regel vor dem Veröffentlichen.", no other rule named, "Cancel"/"Stop requesting" ("Abbrechen"/"Nicht mehr anfordern"); "Cancel" keeps the group with the focus back on its box; "Stop requesting" clears only that group, the focus on its box; V11.4 the same in the edit flow of `T076 <lang> live` (connection step → "Choose documents"/"Dokumente auswählen"): both panels' columns, groups, counts and order, Name and the mixed Licence ticked without a question, clearing Licence asks "… before you save." ("… vor dem Speichern."), "Cancel" and "Stop requesting", the Personal ID's Birth naming Rule 01; V11.5 the group names in the run's language (V11.1's rows) and, on the page, the header's language switch to the other language and back (`[data-language-switch] button[lang]`): both documents' group names, "All data items" and the count line re-rendered without a reload, the choice kept; SC-012 per language: in `by group` the Personal ID's Birth ticked, one Address item then Address (mixed first), Document ticked and cleared, Other details ticked; the Driving licence's Name, Licence, Appearance ticked, Appearance cleared and ticked again, Other details ticked, each a single activation; in `one by one` the same by ticking (and clearing) each data item in the panel's order; both saved with "Save and exit"; compared: the two drafts' `GET /form-connections/{id}` documents (JSON, fields with labels) equal, the two `PUT …/draft` bodies' data items equal (sorted), the stored data equal to the planned groups' data items in catalog order, each version moved by one save, no question opened, no local draft left. Every step also measured exactly one h1 and no horizontal scroll (`scrollWidth`, element boxes past either edge). Leaving: edited editors left by navigating (`beforeunload` accepted), then the `konnekt:local-draft:v1:*` keys found (2 after the draft, 1 after the edit flow) removed and none left; the stored draft and the published connection (documents, `current_revision`, `updated_at`) unchanged afterwards. Backend log lines between `=== T076 en start 2026-11-12T09:27:28.307Z ===` and `=== T076 de end 2026-11-12T09:29:02.734Z ===` in `<scratchpad>/backend-3014.log`, none other than 2xx. CSV `<scratchpad>/T076/walk.csv`, summary `<scratchpad>/T076/summary.md`)

| step | measure | measures | pass | fail | unsure |
|---|---|---|---|---|---|
| V11.1 Driving licence panel | the document shown | 2 | 2 | 0 | 0 |
| V11.1 Driving licence panel | three columns | 2 | 2 | 0 | 0 |
| V11.1 Driving licence panel | the groups in order (keys) | 2 | 2 | 0 | 0 |
| V11.1 Driving licence panel | the groups in order (names) | 2 | 2 | 0 | 0 |
| V11.1 Driving licence panel | the groups' counts | 2 | 2 | 0 | 0 |
| V11.1 Driving licence panel | the groups flow down the columns in order | 2 | 2 | 0 | 0 |
| V11.1 Driving licence panel | no group split across columns | 2 | 2 | 0 | 0 |
| V11.1 Driving licence panel | each heading has a checkbox; its items named after it | 2 | 2 | 0 | 0 |
| V11.1 Driving licence panel | the groups under "All data items" | 2 | 2 | 0 | 0 |
| V11.1 Driving licence panel | the panel equals GET /api/document-types (groups, labels, data items in catalog order) | 2 | 2 | 0 | 0 |
| V11.1 Driving licence panel | every data item in exactly one group | 2 | 2 | 0 | 0 |
| V11.1 Driving licence panel | as stored: every group's box follows its data items (ticked/mixed/clear) | 2 | 2 | 0 | 0 |
| V11.1 Driving licence panel | as stored: "All data items" follows | 2 | 2 | 0 | 0 |
| V11.1 Driving licence panel | as stored: the count line follows | 2 | 2 | 0 | 0 |
| V11.1 Driving licence panel | the stored data shows chosen | 2 | 2 | 0 | 0 |
| V11.1 Driving licence panel | exactly one h1 | 2 | 2 | 0 | 0 |
| V11.1 Driving licence panel | no horizontal scroll | 2 | 2 | 0 | 0 |
| V11.1 Personal ID panel | the document shown | 2 | 2 | 0 | 0 |
| V11.1 Personal ID panel | three columns | 2 | 2 | 0 | 0 |
| V11.1 Personal ID panel | the groups in order (keys) | 2 | 2 | 0 | 0 |
| V11.1 Personal ID panel | the groups in order (names) | 2 | 2 | 0 | 0 |
| V11.1 Personal ID panel | the groups' counts | 2 | 2 | 0 | 0 |
| V11.1 Personal ID panel | the groups flow down the columns in order | 2 | 2 | 0 | 0 |
| V11.1 Personal ID panel | no group split across columns | 2 | 2 | 0 | 0 |
| V11.1 Personal ID panel | each heading has a checkbox; its items named after it | 2 | 2 | 0 | 0 |
| V11.1 Personal ID panel | the groups under "All data items" | 2 | 2 | 0 | 0 |
| V11.1 Personal ID panel | the panel equals GET /api/document-types (groups, labels, data items in catalog order) | 2 | 2 | 0 | 0 |
| V11.1 Personal ID panel | every data item in exactly one group | 2 | 2 | 0 | 0 |
| V11.1 Personal ID panel | the nationality under Birth (Clarification 2026-11-11) | 2 | 2 | 0 | 0 |
| V11.1 Personal ID panel | as stored: every group's box follows its data items (ticked/mixed/clear) | 2 | 2 | 0 | 0 |
| V11.1 Personal ID panel | as stored: "All data items" follows | 2 | 2 | 0 | 0 |
| V11.1 Personal ID panel | as stored: the count line follows | 2 | 2 | 0 | 0 |
| V11.1 Personal ID panel | the stored data shows chosen | 2 | 2 | 0 | 0 |
| V11.1 Personal ID panel | exactly one h1 | 2 | 2 | 0 | 0 |
| V11.1 Personal ID panel | no horizontal scroll | 2 | 2 | 0 | 0 |
| V11.2 tick a group | Name starts clear | 2 | 2 | 0 | 0 |
| V11.2 tick a group | ticking a clear group: no question | 2 | 2 | 0 | 0 |
| V11.2 tick a group | ticking a clear group chooses all of its data items | 2 | 2 | 0 | 0 |
| V11.2 tick a group | the other groups unchanged | 2 | 2 | 0 | 0 |
| V11.2 tick a group | the group box ticked, not mixed | 2 | 2 | 0 | 0 |
| V11.2 tick a group | after Name: every group's box follows its data items (ticked/mixed/clear) | 2 | 2 | 0 | 0 |
| V11.2 tick a group | after Name: "All data items" follows | 2 | 2 | 0 | 0 |
| V11.2 tick a group | after Name: the count line follows | 2 | 2 | 0 | 0 |
| V11.2 tick a group | the count line: 3 + 4 of 31 | 2 | 2 | 0 | 0 |
| V11.2 tick a group | exactly one h1 | 2 | 2 | 0 | 0 |
| V11.2 tick a group | no horizontal scroll | 2 | 2 | 0 | 0 |
| V11.2 some chosen: mixed | one data item of Appearance ticked: the group mixed | 2 | 2 | 0 | 0 |
| V11.2 some chosen: mixed | the stored mixed groups show mixed (Document, Licence) | 2 | 2 | 0 | 0 |
| V11.2 some chosen: mixed | after one item: every group's box follows its data items (ticked/mixed/clear) | 2 | 2 | 0 | 0 |
| V11.2 some chosen: mixed | after one item: "All data items" follows | 2 | 2 | 0 | 0 |
| V11.2 some chosen: mixed | after one item: the count line follows | 2 | 2 | 0 | 0 |
| V11.2 some chosen: mixed | exactly one h1 | 2 | 2 | 0 | 0 |
| V11.2 some chosen: mixed | no horizontal scroll | 2 | 2 | 0 | 0 |
| V11.2 tick a mixed group | appearance: ticking a mixed group asks nothing (even one a rule checks) | 2 | 2 | 0 | 0 |
| V11.2 tick a mixed group | appearance: all of its data items chosen, the box ticked | 2 | 2 | 0 | 0 |
| V11.2 tick a mixed group | appearance: the data items chosen before stay | 2 | 2 | 0 | 0 |
| V11.2 tick a mixed group | licence: ticking a mixed group asks nothing (even one a rule checks) | 2 | 2 | 0 | 0 |
| V11.2 tick a mixed group | licence: all of its data items chosen, the box ticked | 2 | 2 | 0 | 0 |
| V11.2 tick a mixed group | licence: the data items chosen before stay | 2 | 2 | 0 | 0 |
| V11.2 tick a mixed group | after the mixed groups: every group's box follows its data items (ticked/mixed/clear) | 2 | 2 | 0 | 0 |
| V11.2 tick a mixed group | after the mixed groups: "All data items" follows | 2 | 2 | 0 | 0 |
| V11.2 tick a mixed group | after the mixed groups: the count line follows | 2 | 2 | 0 | 0 |
| V11.2 tick a mixed group | exactly one h1 | 2 | 2 | 0 | 0 |
| V11.2 tick a mixed group | no horizontal scroll | 2 | 2 | 0 | 0 |
| V11.2 every group ticked | no question | 2 | 2 | 0 | 0 |
| V11.2 every group ticked | all groups ticked | 2 | 2 | 0 | 0 |
| V11.2 every group ticked | "All data items" ticked, the count line 31 of 31 | 2 | 2 | 0 | 0 |
| V11.2 every group ticked | exactly one h1 | 2 | 2 | 0 | 0 |
| V11.2 every group ticked | no horizontal scroll | 2 | 2 | 0 | 0 |
| V11.2 clear a group no rule checks | clearing a group no rule checks: no question | 2 | 2 | 0 | 0 |
| V11.2 clear a group no rule checks | all of its data items cleared, the box clear | 2 | 2 | 0 | 0 |
| V11.2 clear a group no rule checks | after clearing Appearance: every group's box follows its data items (ticked/mixed/clear) | 2 | 2 | 0 | 0 |
| V11.2 clear a group no rule checks | after clearing Appearance: "All data items" follows | 2 | 2 | 0 | 0 |
| V11.2 clear a group no rule checks | after clearing Appearance: the count line follows | 2 | 2 | 0 | 0 |
| V11.2 clear a group no rule checks | the count line: 31 − 6 | 2 | 2 | 0 | 0 |
| V11.2 clear a group no rule checks | Space on a clear group's box ticks all; the focus stays, ring shown | 2 | 2 | 0 | 0 |
| V11.2 clear a group no rule checks | exactly one h1 | 2 | 2 | 0 | 0 |
| V11.2 clear a group no rule checks | no horizontal scroll | 2 | 2 | 0 | 0 |
| V11.3 clear Licence (Rule 02) | the group ticked first (a mixed one ticked without a question) | 2 | 2 | 0 | 0 |
| V11.3 clear Licence (Rule 02) | the question comes first | 2 | 2 | 0 | 0 |
| V11.3 clear Licence (Rule 02) | nothing cleared while it asks | 2 | 2 | 0 | 0 |
| V11.3 clear Licence (Rule 02) | its title (copy.md §5) | 2 | 2 | 0 | 0 |
| V11.3 clear Licence (Rule 02) | it names the rule that checks the group's data | 2 | 2 | 0 | 0 |
| V11.3 clear Licence (Rule 02) | it names no other rule | 2 | 2 | 0 | 0 |
| V11.3 clear Licence (Rule 02) | its buttons | 2 | 2 | 0 | 0 |
| V11.3 clear Licence (Rule 02) | exactly one h1 | 4 | 4 | 0 | 0 |
| V11.3 clear Licence (Rule 02) | no horizontal scroll | 4 | 4 | 0 | 0 |
| V11.3 clear Licence (Rule 02) | Cancel: the group stays ticked, the focus back on its box | 2 | 2 | 0 | 0 |
| V11.3 clear Licence (Rule 02) | Stop requesting: the group cleared, the other groups kept | 2 | 2 | 0 | 0 |
| V11.3 clear Licence (Rule 02) | Stop requesting: the box clear, no dialog, the focus on its box | 2 | 2 | 0 | 0 |
| V11.3 clear Licence (Rule 02) | after Stop requesting: every group's box follows its data items (ticked/mixed/clear) | 2 | 2 | 0 | 0 |
| V11.3 clear Licence (Rule 02) | after Stop requesting: "All data items" follows | 2 | 2 | 0 | 0 |
| V11.3 clear Licence (Rule 02) | after Stop requesting: the count line follows | 2 | 2 | 0 | 0 |
| V11.3 clear Birth (Rule 01) | the group ticked first (a mixed one ticked without a question) | 2 | 2 | 0 | 0 |
| V11.3 clear Birth (Rule 01) | the question comes first | 2 | 2 | 0 | 0 |
| V11.3 clear Birth (Rule 01) | nothing cleared while it asks | 2 | 2 | 0 | 0 |
| V11.3 clear Birth (Rule 01) | its title (copy.md §5) | 2 | 2 | 0 | 0 |
| V11.3 clear Birth (Rule 01) | it names the rule that checks the group's data | 2 | 2 | 0 | 0 |
| V11.3 clear Birth (Rule 01) | it names no other rule | 2 | 2 | 0 | 0 |
| V11.3 clear Birth (Rule 01) | its buttons | 2 | 2 | 0 | 0 |
| V11.3 clear Birth (Rule 01) | exactly one h1 | 4 | 4 | 0 | 0 |
| V11.3 clear Birth (Rule 01) | no horizontal scroll | 4 | 4 | 0 | 0 |
| V11.3 clear Birth (Rule 01) | Cancel: the group stays ticked, the focus back on its box | 2 | 2 | 0 | 0 |
| V11.3 clear Birth (Rule 01) | Stop requesting: the group cleared, the other groups kept | 2 | 2 | 0 | 0 |
| V11.3 clear Birth (Rule 01) | Stop requesting: the box clear, no dialog, the focus on its box | 2 | 2 | 0 | 0 |
| V11.3 clear Birth (Rule 01) | after Stop requesting: every group's box follows its data items (ticked/mixed/clear) | 2 | 2 | 0 | 0 |
| V11.3 clear Birth (Rule 01) | after Stop requesting: "All data items" follows | 2 | 2 | 0 | 0 |
| V11.3 clear Birth (Rule 01) | after Stop requesting: the count line follows | 2 | 2 | 0 | 0 |
| V11.5 group names follow the language | switched to the other language: the Driving licence's groups | 2 | 2 | 0 | 0 |
| V11.5 group names follow the language | switched to the other language: the choice kept | 2 | 2 | 0 | 0 |
| V11.5 group names follow the language | switched to the other language: the Personal ID's groups | 2 | 2 | 0 | 0 |
| V11.5 group names follow the language | switched to the other language: "All data items" and the count line | 2 | 2 | 0 | 0 |
| V11.5 group names follow the language | exactly one h1 | 4 | 4 | 0 | 0 |
| V11.5 group names follow the language | no horizontal scroll | 4 | 4 | 0 | 0 |
| V11.5 group names follow the language | back to the run's language: the groups | 2 | 2 | 0 | 0 |
| V11.3 leaving the draft | left by navigating: local drafts removed, none left | 2 | 2 | 0 | 0 |
| V11.3 leaving the draft | nothing saved: the stored draft unchanged | 2 | 2 | 0 | 0 |
| V11.4 edit flow | the connection is published | 2 | 2 | 0 | 0 |
| V11.4 edit flow | pid: three columns, the groups and counts in order | 2 | 2 | 0 | 0 |
| V11.4 edit flow | pid: flow down the columns, none split | 2 | 2 | 0 | 0 |
| V11.4 edit flow | pid as published: every group's box follows its data items (ticked/mixed/clear) | 2 | 2 | 0 | 0 |
| V11.4 edit flow | pid as published: "All data items" follows | 2 | 2 | 0 | 0 |
| V11.4 edit flow | pid as published: the count line follows | 2 | 2 | 0 | 0 |
| V11.4 edit flow | mdl: three columns, the groups and counts in order | 2 | 2 | 0 | 0 |
| V11.4 edit flow | mdl: flow down the columns, none split | 2 | 2 | 0 | 0 |
| V11.4 edit flow | mdl as published: every group's box follows its data items (ticked/mixed/clear) | 2 | 2 | 0 | 0 |
| V11.4 edit flow | mdl as published: "All data items" follows | 2 | 2 | 0 | 0 |
| V11.4 edit flow | mdl as published: the count line follows | 2 | 2 | 0 | 0 |
| V11.4 edit flow | exactly one h1 | 6 | 6 | 0 | 0 |
| V11.4 edit flow | no horizontal scroll | 6 | 6 | 0 | 0 |
| V11.4 edit flow | name: ticking chooses all, no question | 2 | 2 | 0 | 0 |
| V11.4 edit flow | licence: ticking chooses all, no question | 2 | 2 | 0 | 0 |
| V11.4 edit flow | after ticking: every group's box follows its data items (ticked/mixed/clear) | 2 | 2 | 0 | 0 |
| V11.4 edit flow | after ticking: "All data items" follows | 2 | 2 | 0 | 0 |
| V11.4 edit flow | after ticking: the count line follows | 2 | 2 | 0 | 0 |
| V11.4 edit flow | clearing Licence: the question first | 2 | 2 | 0 | 0 |
| V11.4 edit flow | its title and text, "before you save" | 2 | 2 | 0 | 0 |
| V11.4 edit flow | its buttons | 2 | 2 | 0 | 0 |
| V11.4 edit flow | Cancel keeps the group, the focus on its box | 2 | 2 | 0 | 0 |
| V11.4 edit flow | Stop requesting clears the group | 2 | 2 | 0 | 0 |
| V11.4 edit flow | after Stop requesting: every group's box follows its data items (ticked/mixed/clear) | 2 | 2 | 0 | 0 |
| V11.4 edit flow | after Stop requesting: "All data items" follows | 2 | 2 | 0 | 0 |
| V11.4 edit flow | after Stop requesting: the count line follows | 2 | 2 | 0 | 0 |
| V11.4 edit flow | Personal ID's Birth: the question names Rule 01 | 2 | 2 | 0 | 0 |
| V11.4 edit flow | left by navigating: local drafts removed, none left | 2 | 2 | 0 | 0 |
| V11.4 edit flow | nothing saved: the published connection unchanged | 2 | 2 | 0 | 0 |
| SC-012 by group | the draft starts with no data chosen | 2 | 2 | 0 | 0 |
| SC-012 one by one | the draft starts with no data chosen | 2 | 2 | 0 | 0 |
| SC-012 by group | pid tick birth: one activation, the same as each data item | 2 | 2 | 0 | 0 |
| SC-012 by group | pid address: one item, then the group: mixed first | 2 | 2 | 0 | 0 |
| SC-012 by group | pid item+group address: one activation, the same as each data item | 2 | 2 | 0 | 0 |
| SC-012 by group | pid tick document: one activation, the same as each data item | 2 | 2 | 0 | 0 |
| SC-012 by group | pid clear document: one activation, the same as each data item | 2 | 2 | 0 | 0 |
| SC-012 by group | pid tick other: one activation, the same as each data item | 2 | 2 | 0 | 0 |
| SC-012 by group | pid at the end: every group's box follows its data items (ticked/mixed/clear) | 2 | 2 | 0 | 0 |
| SC-012 by group | pid at the end: "All data items" follows | 2 | 2 | 0 | 0 |
| SC-012 by group | pid at the end: the count line follows | 2 | 2 | 0 | 0 |
| SC-012 by group | mdl tick name: one activation, the same as each data item | 2 | 2 | 0 | 0 |
| SC-012 by group | mdl tick licence: one activation, the same as each data item | 2 | 2 | 0 | 0 |
| SC-012 by group | mdl tick appearance: one activation, the same as each data item | 4 | 4 | 0 | 0 |
| SC-012 by group | mdl clear appearance: one activation, the same as each data item | 2 | 2 | 0 | 0 |
| SC-012 by group | mdl tick other: one activation, the same as each data item | 2 | 2 | 0 | 0 |
| SC-012 by group | mdl at the end: every group's box follows its data items (ticked/mixed/clear) | 2 | 2 | 0 | 0 |
| SC-012 by group | mdl at the end: "All data items" follows | 2 | 2 | 0 | 0 |
| SC-012 by group | mdl at the end: the count line follows | 2 | 2 | 0 | 0 |
| SC-012 by group | no question (no rule) | 2 | 2 | 0 | 0 |
| SC-012 by group | exactly one h1 | 2 | 2 | 0 | 0 |
| SC-012 by group | no horizontal scroll | 2 | 2 | 0 | 0 |
| SC-012 by group | "Save and exit" saved the draft | 2 | 2 | 0 | 0 |
| SC-012 by group | no local draft left after saving | 2 | 2 | 0 | 0 |
| SC-012 one by one | pid tick birth: each data item (4 clicks), the box follows | 2 | 2 | 0 | 0 |
| SC-012 one by one | pid item+group address: each data item (7 clicks), the box follows | 2 | 2 | 0 | 0 |
| SC-012 one by one | pid tick document: each data item (6 clicks), the box follows | 2 | 2 | 0 | 0 |
| SC-012 one by one | pid clear document: each data item (6 clicks), the box follows | 2 | 2 | 0 | 0 |
| SC-012 one by one | pid tick other: each data item (4 clicks), the box follows | 2 | 2 | 0 | 0 |
| SC-012 one by one | pid at the end: every group's box follows its data items (ticked/mixed/clear) | 2 | 2 | 0 | 0 |
| SC-012 one by one | pid at the end: "All data items" follows | 2 | 2 | 0 | 0 |
| SC-012 one by one | pid at the end: the count line follows | 2 | 2 | 0 | 0 |
| SC-012 one by one | mdl tick name: each data item (4 clicks), the box follows | 2 | 2 | 0 | 0 |
| SC-012 one by one | mdl tick licence: each data item (3 clicks), the box follows | 2 | 2 | 0 | 0 |
| SC-012 one by one | mdl tick appearance: each data item (6 clicks), the box follows | 4 | 4 | 0 | 0 |
| SC-012 one by one | mdl clear appearance: each data item (6 clicks), the box follows | 2 | 2 | 0 | 0 |
| SC-012 one by one | mdl tick other: each data item (1 clicks), the box follows | 2 | 2 | 0 | 0 |
| SC-012 one by one | mdl at the end: every group's box follows its data items (ticked/mixed/clear) | 2 | 2 | 0 | 0 |
| SC-012 one by one | mdl at the end: "All data items" follows | 2 | 2 | 0 | 0 |
| SC-012 one by one | mdl at the end: the count line follows | 2 | 2 | 0 | 0 |
| SC-012 one by one | no question (no rule) | 2 | 2 | 0 | 0 |
| SC-012 one by one | exactly one h1 | 2 | 2 | 0 | 0 |
| SC-012 one by one | no horizontal scroll | 2 | 2 | 0 | 0 |
| SC-012 one by one | "Save and exit" saved the draft | 2 | 2 | 0 | 0 |
| SC-012 one by one | no local draft left after saving | 2 | 2 | 0 | 0 |
| SC-012 compare | the two saved drafts' documents JSON equal (GET, fields with labels) | 2 | 2 | 0 | 0 |
| SC-012 compare | the two PUT bodies choose the same data items (sorted) | 2 | 2 | 0 | 0 |
| SC-012 compare | the saved data: exactly the planned groups' data items, in catalog order | 2 | 2 | 0 | 0 |
| SC-012 compare | stored versions moved by one save each | 2 | 2 | 0 | 0 |

195 rows; 414 measures: 414 pass, 0 fail, 0 unsure.

No app change: every row passed on the counted run, so no file of T073 or T074 was touched and the root gates were not run. Before the counted run, an English run of V11 (markers `=== T076 en start 2026-11-12T09:25:51.029Z ===` to `… end 2026-11-12T09:26:14.653Z ===`) failed one row on the script's own expectation (a published connection's `state` is `live`, not `active`), and a run at `09:26:23.320Z` stopped on the script's catalog call without a cookie after saving the English SC-012 drafts; the counted run first put both English drafts back to no data with one API save each (so their versions read 4, the German ones 2). Earlier exploration runs (`09:24:32`, `09:24:56`) stopped on the script's selectors. Their rows were discarded. The dialog names the seeded rules by their stored names ("Rule 01", "Rule 02") in German too: the names are the connection's data, copied from `P3 seed live`, not copy.

#### T082: walk quickstart V12 (agents see and use the new data), script-first

Items: FR-062–FR-069, SC-010, US8-AS1–AS5; V12.1–V12.9 (plus V12.7b: `start_date_passed`, and T080's done requests read again). Browser: scripted `playwright-core` 1.65 Chromium (`/usr/bin/chromium`, headless, 1455 px window), English and German (localStorage `konnekt:language:v1`). MCP: `@modelcontextprotocol/client` 2.4 over Streamable HTTP against `http://localhost:3101/mcp`, without elicitation, a personal access token per level. Data in `konnekt_db_010_p11` (backend 3015, Vite 5179, `p10-alice`): tokens `T082 read`, `T082 drafts`, `T082 manage` (made with `POST /api/agent-access/tokens` from a cookie session of `p10-alice`, revoked at the end); connections `T082 live`, `T082 scheduled`, `T082 deactivated`, `T082 draft`, `T082 publish on a date draft`, `T082 moved scheduled`, `T082 passed draft`; 6 approval requests (state.json). Evidence: `<SP>/T082/walk.csv` (285 rows, 241 measures after a re-measured measure keeps its last row), `<SP>/T082/summary.md`, screenshots `<SP>/T082/shots/` (44 taken, none opened: no failing or unsure row). The "walk.csv rows" column gives the line span of the step's counted rows (superseded rows listed in summary.md).

| step | language | what was walked | measures pass / fail / unsure | walk.csv rows | result |
|---|---|---|---|---|---|
| V12.1 | n/a (API, MCP, server) | search_connections status "scheduled" and get_connection on `T082 scheduled` (read token): status, start date, "(scheduled from …)", urls_note, URLs, against the API | 1 / 0 / 0 | 2 | pass |
| V12.1 | English | search_connections status "scheduled" and get_connection on `T082 scheduled` (read token): status, start date, "(scheduled from …)", urls_note, URLs, against the API | 9 / 0 / 0 | 3–11 | pass |
| V12.2 | English | get_connection (read) on `T080 stored order`, `T082 draft` and the example `d443d829…`: step, stored order (structured and text), example mark | 17 / 0 / 0 | 12–28 | pass |
| V12.3 | English | move_document on `T082 draft`: read refused with the level message and nothing changed; drafts moved mdl to 1 (answer, API, get_connection, version); Activity card newest row "Documents changed" · "p10-alice with T082 drafts" | 9 / 0 / 0 | 29–37 | pass |
| V12.3 | German | move_document on `T082 draft`: read refused with the level message and nothing changed; drafts moved mdl to 1 (answer, API, get_connection, version); Activity card newest row "Documents changed" · "p10-alice with T082 drafts" | 1 / 0 / 0 | 38 | pass |
| V12.4 | English | get_activity (read) on `T082 draft`, `T082 scheduled`, `T082 publish on a date draft` (approved): kinds = API, card rows = entries (count, instants; EN events and persons incl. ", asked by") | 18 / 0 / 0 | 55–200 | pass |
| V12.4 | German | get_activity (read) on `T082 draft`, `T082 scheduled`, `T082 publish on a date draft` (approved): kinds = API, card rows = entries (count, instants; EN events and persons incl. ", asked by") | 6 / 0 / 0 | 61–202 | pass |
| V12.6 | English | start_date today (publish drafts, reactivate, set_start_date) and an earlier day: validation "Enter a date after today: today in Germany is 2026-11-12."; no approval_requests row; backend saw 1 GET /api/agent/me, 0 POST /api/approval-requests | 16 / 0 / 0 | 71–86 | pass |
| V12.5 setScheduled | English | set_start_date 2026-12-10 (manage) on `T082 scheduled`; drafts refused (insufficient_access, manage); title "Change the start date of …"; "Start date saved."; check_approval | 18 / 0 / 0 | 87–205 | pass |
| V12.5 setScheduled | German | set_start_date 2026-12-10 (manage) on `T082 scheduled`; drafts refused (insufficient_access, manage); title "Change the start date of …"; "Start date saved."; check_approval | 8 / 0 / 0 | 149–161 | pass |
| V12.5 setScheduled | n/a (API, MCP, server) | set_start_date 2026-12-10 (manage) on `T082 scheduled`; drafts refused (insufficient_access, manage); title "Change the start date of …"; "Start date saved."; check_approval | 2 / 0 / 0 | 155–166 | pass |
| V12.5 publish | English | request_approval publish 2026-12-03 (drafts): what_happens, link; page "Active from 03.12.2026" after the summary table; approved; "Published and scheduled for 03.12.2026."; links copyable; check_approval done + scheduled + date; entry approved | 17 / 0 / 0 | 88–203 | pass |
| V12.5 publish | German | request_approval publish 2026-12-03 (drafts): what_happens, link; page "Active from 03.12.2026" after the summary table; approved; "Published and scheduled for 03.12.2026."; links copyable; check_approval done + scheduled + date; entry approved | 8 / 0 / 0 | 97–109 | pass |
| V12.5 publish | n/a (API, MCP, server) | request_approval publish 2026-12-03 (drafts): what_happens, link; page "Active from 03.12.2026" after the summary table; approved; "Published and scheduled for 03.12.2026."; links copyable; check_approval done + scheduled + date; entry approved | 2 / 0 / 0 | 103–114 | pass |
| V12.5 reactivate | English | reactivate 2026-12-04 (manage) on `T082 deactivated`: page "Active from 04.12.2026"; "Connection scheduled for 04.12.2026."; check_approval | 16 / 0 / 0 | 115–204 | pass |
| V12.5 reactivate | German | reactivate 2026-12-04 (manage) on `T082 deactivated`: page "Active from 04.12.2026"; "Connection scheduled for 04.12.2026."; check_approval | 7 / 0 / 0 | 123–134 | pass |
| V12.5 reactivate | n/a (API, MCP, server) | reactivate 2026-12-04 (manage) on `T082 deactivated`: page "Active from 04.12.2026"; "Connection scheduled for 04.12.2026."; check_approval | 2 / 0 / 0 | 128–139 | pass |
| V12.5 setLive | English | set_start_date 2026-12-08 (manage) on `T082 live`: "Active from 08.12.2026" + "Until then its links stop working, and requests in progress are cancelled."; "Start date saved."; scheduled; check_approval | 17 / 0 / 0 | 167–206 | pass |
| V12.5 setLive | German | set_start_date 2026-12-08 (manage) on `T082 live`: "Active from 08.12.2026" + "Until then its links stop working, and requests in progress are cancelled."; "Start date saved."; scheduled; check_approval | 8 / 0 / 0 | 176–189 | pass |
| V12.5 setLive | n/a (API, MCP, server) | set_start_date 2026-12-08 (manage) on `T082 live`: "Active from 08.12.2026" + "Until then its links stop working, and requests in progress are cancelled."; "Start date saved."; scheduled; check_approval | 3 / 0 / 0 | 182–194 | pass |
| V12.7 | English | deactivate asked for `T082 moved scheduled`, then "Change start date" → 22.12.2026 in the browser: Approve on the open page shows the server's warning; reloaded EN/DE the page's sentence; no Approve; nothing changed; check_approval connection_changed | 8 / 0 / 0 | 207–243 | pass |
| V12.7 | German | deactivate asked for `T082 moved scheduled`, then "Change start date" → 22.12.2026 in the browser: Approve on the open page shows the server's warning; reloaded EN/DE the page's sentence; no Approve; nothing changed; check_approval connection_changed | 3 / 0 / 0 | 209–217 | pass |
| V12.7 | n/a (API, MCP, server) | deactivate asked for `T082 moved scheduled`, then "Change start date" → 22.12.2026 in the browser: Approve on the open page shows the server's warning; reloaded EN/DE the page's sentence; no Approve; nothing changed; check_approval connection_changed | 2 / 0 / 0 | 211–213 | pass |
| V12.7b | English | start_date_passed: a publish request on `T082 passed draft`, its row set to today: page EN/DE sentence; check_approval reason and text; still a draft | 3 / 0 / 0 | 220–244 | pass |
| V12.7b | German | start_date_passed: a publish request on `T082 passed draft`, its row set to today: page EN/DE sentence; check_approval reason and text; still a draft | 1 / 0 / 0 | 221 | pass |
| V12.7b | n/a (API, MCP, server) | start_date_passed: a publish request on `T082 passed draft`, its row set to today: page EN/DE sentence; check_approval reason and text; still a draft | 1 / 0 / 0 | 224 | pass |
| V12.8 | English | tools/list per token (26 tools): no name or description restores, deletes several or creates the example; request_approval's six actions; 3 endpoints × 3 bearers 403 browser_only | 9 / 0 / 0 | 245–253 | pass |
| V12.8 | n/a (API, MCP, server) | tools/list per token (26 tools): no name or description restores, deletes several or creates the example; request_approval's six actions; 3 endpoints × 3 bearers 403 browser_only | 9 / 0 / 0 | 254–262 | pass |
| V12.9 | n/a (API, MCP, server) | npm test -w mcp (510 passed), guidance.test.ts 24/24 incl. the six actions, instructions.md six actions in backticks, 419 words | 5 / 0 / 0 | 267–271 | pass |
| V12.5 (T080 done) | English | T080's done requests D1–D4 read again: dated outcomes, a scheduled connection's deletion without Undo | 5 / 0 / 0 | 272–279 | pass |
| V12.5 (T080 done) | German | T080's done requests D1–D4 read again: dated outcomes, a scheduled connection's deletion without Undo | 5 / 0 / 0 | 273–281 | pass |
| logs | n/a (API, MCP, server) | MCP log slice: method, tool, status, duration only; no secret in either slice | 2 / 0 / 0 | 282–283 | pass |
| cleanup | n/a (API, MCP, server) | the three T082 tokens revoked; their bearers answer 401 | 3 / 0 / 0 | 284–286 | pass |

### 2.3 The measured sweeps

#### T086, this feature's text pairs (script-first, report only)

Items FR-071, R11, SC-009. No browsers, widths or screenshots: a text check over `main` (git archive) and the working tree (`010-revamp-backend-gaps`, phases 1–11 committed), languages en and de. Data made: none. Pairs: 156 (new 135, new key with a pair main has elsewhere in the file 13, changed English 0, example.py 8); copy.md §2–§8 texts 87. Scripts and CSV: `<SP>/pairs/` (`collect_ts.cjs`, `collect_py.py`, `check.py`, `summarize.py`, `T086.csv`, `T086-summary.md`).

1. Counts per check

| check | pass | flag | unsure |
|---|---|---|---|
| german | 155 | 0 | 1 |
| glossary | 151 | 5 | 0 |
| quotes | 155 | 0 | 1 |
| variables | 156 | 0 | 0 |
| formal_address | 155 | 0 | 1 |
| dates | 156 | 0 | 0 |
| copy_md | 81 | 4 | 2 |
| copy_md_german | 83 | 0 | 3 |

2. Flagged rows (real): `file | key | check | english | german | why`

| file | key | check | english | german | why |
|---|---|---|---|---|---|
| contracts/copy.md | §2 "Change start date" on an active connection, "On a date": the hint (FR-009) | copy_md | Until that date, citizens can't start a new request. Requests in progress are cancelled. | Bis zu diesem Datum können Bürgerinnen und Bürger keine neue Anfrage starten. Laufende Anfragen werden abgebrochen. | copy.md §2 writes a straight apostrophe (can't, don't, won't) where the code, like the frame and copy.md §4 since T049, writes ’; the code is right by the project's typography, copy.md §2 is the side to change (T097/T099); found only with ’ where copy.md writes a straight ': Until that date, citizens can’t start a new request. Requests in progress are cancelled. |
| contracts/copy.md | §2 "Activate this connection again?", "On a date": the hint (FR-011) | copy_md | The connection becomes active again on the date you choose. Until then, its links don't work. | Die Anbindung wird am gewählten Datum wieder aktiv. Bis dahin funktionieren ihre Links nicht. | copy.md §2 writes a straight apostrophe (can't, don't, won't) where the code, like the frame and copy.md §4 since T049, writes ’; the code is right by the project's typography, copy.md §2 is the side to change (T097/T099); found only with ’ where copy.md writes a straight ': The connection becomes active again on the date you choose. Until then, its links don’t work. |
| contracts/copy.md | §2 The deactivate dialog for a scheduled connection: the sentence (FR-012) | copy_md | This connection will be active from <date>. If you deactivate it, it won't become active and its links won't work. You can activate it again later. | Diese Anbindung ist ab <date> aktiv. Wenn Sie sie deaktivieren, wird sie nicht aktiv und ihre Links funktionieren nicht. Sie können sie später wieder aktivieren. | copy.md §2 writes a straight apostrophe (can't, don't, won't) where the code, like the frame and copy.md §4 since T049, writes ’; the code is right by the project's typography, copy.md §2 is the side to change (T097/T099); found only with ’ where copy.md writes a straight ': This connection will be active from ${date}. If you deactivate it, it won’t become active and its links won’t work. You can activate it agai |
| contracts/copy.md | §2 "Save changes?" for a scheduled connection: the sentence (FR-013) | copy_md | Your changes become active with the connection on <date>. Citizens can't use it before then. | Ihre Änderungen werden mit der Anbindung am <date> aktiv. Vorher können Bürgerinnen und Bürger sie nicht nutzen. | copy.md §2 writes a straight apostrophe (can't, don't, won't) where the code, like the frame and copy.md §4 since T049, writes ’; the code is right by the project's typography, copy.md §2 is the side to change (T097/T099); found only with ’ where copy.md writes a straight ': Your changes become active with the connection on ${date}. Citizens can’t use it before then. |

False positives removed after reading:

| file | key | check | english | german | why it is not a defect |
|---|---|---|---|---|---|
| frontend/src/components/ExampleBanner/constants.ts | EXAMPLE_BANNER_COPY.standard | glossary | Try changing the age to 18 or adding a rule. Then use Test rules to check the result. | Versuchen Sie, das Alter auf 18 zu ändern oder eine Regel hinzuzufügen. Prüfen Sie das Ergebnis dann mit „Regeln testen“. | "adding" is there: "hinzuzufügen" (the zu-infinitive splits the stem "hinzufüg") |
| frontend/src/pages/FormConnectionDetail/constants.ts | CONNECTION_DETAIL_COPY.scheduledText | glossary | The links are ready to be added to your service. They become active on the scheduled date below. | Die Links können bereits in Ihren Dienst eingefügt werden. Sie werden am geplanten Datum unten aktiv. | "added to your service" → "in Ihren Dienst eingefügt": the glossary's own verb for the service ("Add the links below to your service." → "Fügen Sie die Links unten in Ihren Dienst ein."); accepted by T015 (design-notes §4.2) |
| frontend/src/pages/FormConnectionDetail/constants.ts | CONNECTION_DETAIL_COPY.deactivateScheduledText | glossary | This connection will be active from ${date}. If you deactivate it, it won’t become active and its links won’t work. You can activate it again later. | Diese Anbindung ist ab ${date} aktiv. Wenn Sie sie deaktivieren, wird sie nicht aktiv und ihre Links funktionieren nicht. Sie können sie später wieder aktivieren. | "will be active from <date>" is a sentence, not the label "Active from"; copy.md §2 gives "ist ab <date> aktiv" word for word |
| frontend/src/pages/FormConnectionList/constants.ts | DELETE_CONNECTION_COPY.scheduled | glossary | This connection will be active from ${date}. If you delete it, it won’t become active and its links won’t work. | Diese Anbindung ist ab ${date} aktiv. Wenn Sie sie löschen, wird sie nicht aktiv und ihre Links funktionieren nicht. | as the deactivate sentence: "ist ab <date> aktiv" (T027's German, design-notes §4.2) |
| rules/src/constants.ts | EDIT_MESSAGES.documentNotRequested | glossary | The connection doesn’t request “${document}”. | Die Anbindung fordert „${document}“ nicht an. | "request" is there as the separable verb "fordert … an" (anfordern, the glossary's "requested → angefordert") |

3. Unsure rows with the verdict

| file | key | check | english | german | verdict |
|---|---|---|---|---|---|
| frontend/src/pages/Approval/constants.ts | STATUS_LEADS.set_start_date | german | ${null} | ${null} | pass: `null` in both languages (no lead line for set_start_date), not a text |
| frontend/src/pages/FormConnectionDetail/constants.ts | CONNECTION_DETAIL_COPY.activateDateHint | formal_address | The connection becomes active again on the date you choose. Until then, its links don’t work. | Die Anbindung wird am gewählten Datum wieder aktiv. Bis dahin funktionieren ihre Links nicht. | pass: "on the date you choose" → "am gewählten Datum", impersonal, copy.md §2's German word for word |
| backend/app/services/approvals.py | <module>::START_DATE_CHANGED_TEXT | quotes | The connection's start date changed in the meantime. | Das Startdatum der Anbindung wurde inzwischen geändert. | pass as decided: the server's messages keep the straight apostrophe ("The connection's start date …"), the page's own table writes ’ (T080, design-notes §4.2); carried to the review |
| contracts/copy.md | §3 The closed line without a person (FR-032) | copy_md | Last edited · <date>, <time> | Zuletzt bearbeitet · <date>, <time> | pass: `Last edited · ${dateTime}`, where `dateTimeOf()` writes "DD.MM.YYYY, HH:MM" (`formatRowDate`, ", ", `SAVED_TIME_FORMATS`), so the line reads as copy.md |
| contracts/copy.md | §3 The closed line without a person (FR-032) | copy_md_german | Last edited · <date>, <time> | Zuletzt bearbeitet · <date>, <time> | pass: `Zuletzt bearbeitet · ${dateTime}`, as above |
| contracts/copy.md | §3 The closed line, deactivated, without a person | copy_md | Deactivated · <date>, <time> | Deaktiviert · <date>, <time> | pass: `Deactivated · ${dateTime}`, as above |
| contracts/copy.md | §3 The closed line, deactivated, without a person | copy_md_german | Deactivated · <date>, <time> | Deaktiviert · <date>, <time> | pass: `Deaktiviert · ${dateTime}`, as above |
| contracts/copy.md | §6 Rule 02's message, Standard / the variant | copy_md_german | … for at least 1 year. | … seit mindestens 1 Jahr … | pass: copy.md elides both ends ("… seit mindestens 1 Jahr …"); example.py has "Sie müssen seit mindestens 1 Jahr einen Führerschein der Klasse B besitzen." |

4. Cited rows: none (a text check; the sweeps T087–T096 cite the per-task tables).

Open rows: 4 (the real flags, which T097 decides; nothing is fixed here).

#### T087, US1's dialogs and edit flow (T085's harness, report only)

Items FR-072, SC-009, W16 (screens S14, S15, S17, S18, C2; copy.md §2). Measured 2026-11-12 on the main installation (backend 3016 against `konnekt_db_010_p12` with the fake EUDIPLO and the worker off, Vite 5180), account `p10-alice`, by `<SP>/sweep/T087/sweep.mjs` on `<SP>/sweep/measure.mjs`: Chromium 156 (`/usr/bin/chromium`) and Firefox (Playwright build 1572), English and German (the stored language choice), 1440 × 900, 320 × 720 and 160 × 450 CSS px viewports, time zone Europe/Berlin. **The full matrix ran** (English in Chromium included, beside the cited rows): 27 states × 12 cells = 324 cells, 15,587 rows, 1,660 s (Chromium 7.9 s, Firefox 9.9 s per cell on average). Measures: the harness's ten (horizontal_scroll, clipped, h1_count, focus_visible, contrast, durations, label_width, live_region, lang, forbidden_text; FORBIDDEN plus "PDF herunterladen" and "Entwurfsänderungen") and `alert_title` (T084 (5): each visible `.kern-alert .kern-title` against its alert's content width at 160 CSS px, under 50 % a defect). Output: `<SP>/sweep/T087/out/` (`T087.csv`, `T087-summary.md`, `shots/`).

Data made through the API from `P3 seed live`'s content (kept for reruns, found by name): `T087 sweep base scheduled` (`d21c60ce-c8be-4f1c-8629-555a5d56462c`, start 2026-12-12), `T087 sweep base live` (`cb7c44ee-23ff-4922-bbc7-4e02e64510d9`), `T087 sweep base deactivated` (`0d0877a7-50cf-4302-a4df-b78339544973`), the drafts `T087 sweep base draft` (`6e3eaadc-4f35-465f-afa7-4834fa0ccca1`, step test, with rules) and `T087 sweep base norules` (`9d51f573-272e-4cc3-bcfc-dd5f4d945bbb`, step rules, no rule). Per cell, for the states that act: 42 rows `T087 sweep <cell uid> {publishing,published,deactivated}` (a draft whose publish was held, a draft published against the fake, a deactivated connection whose reactivation was held), all deleted through the API at the end. Failures with `failNext` (500 with the error ID `T087-xxxxxxxx-fake`, `abort` for no answer); "Publishing…" and "Scheduling…" with a `page.route()` that never answers (the request never reaches the backend); "Published" with the editor's 0.5 s timer stretched in the page; the start date typed 10.12.2026 (28 days out). The states: publish-now, publish-date, publish-date-error (empty field, "Schedule"), publish-publishing, publish-published, publish-failed (500 + error ID), publish-no-answer, publish-no-rules ("On a date" with its hint); start-scheduled-date, start-scheduled-now, start-active-now, start-active-date (hint), start-error (empty field), start-failed (500 + error ID); activate-now, activate-date, activate-error, activate-scheduling; deactivate-details, delete-details, delete-row (the overview's bin); edit-entry (details, "Edit this scheduled connection?"), edit-entry-row (the row's "Edit “<name>”?"); edit-step1 (header pill and step 1's note), edit-leave, edit-discard, edit-save (each after a change to the description).

1. Counts per state × measure (pass/fail/unsure; every state 12 cells; horizontal_scroll, h1_count and lang 12/0/0 everywhere, left out)

| state | clipped | label_width | contrast | live_region | forbidden_text | durations | focus_visible | alert_title |
|---|---|---|---|---|---|---|---|---|
| publish-now | 12/0/0 | 84/0/0 | 204/0/0 | 37/0/0 | 118/2/0 | 36/0/0 | 96/0/0 | 4/0/0 |
| publish-date | 12/0/0 | 84/0/0 | 227/0/0 | 36/0/0 | 118/2/0 | 36/0/0 | 120/0/0 | 4/0/0 |
| publish-date-error | 12/0/0 | 84/0/0 | 240/0/0 | 60/0/0 | 116/4/0 | 36/0/0 | 120/0/0 | 4/0/0 |
| publish-publishing | 12/0/0 | 12/0/0 | 24/0/0 | 48/0/0 | 118/2/0 | 48/0/0 | – | 4/0/0 |
| publish-published | 12/0/0 | 12/0/0 | 24/0/0 | 36/0/0 | 117/3/0 | 36/0/0 | – | 4/0/0 |
| publish-failed | 12/0/0 | 84/0/0 | 240/0/0 | 60/0/0 | 118/2/0 | 36/0/0 | 96/0/0 | 4/0/0 |
| publish-no-answer | 12/0/0 | 84/0/0 | 216/0/0 | 60/0/0 | 116/4/0 | 36/0/0 | 96/0/0 | 4/0/0 |
| publish-no-rules | 12/0/0 | 84/0/0 | 240/0/0 | 36/0/0 | 120/0/0 | 36/0/0 | 120/0/0 | 4/0/0 |
| start-scheduled-date | 12/0/0 | 84/0/0 | 156/**12**/0 | 12/0/0 | 120/0/0 | 36/0/0 | 120/0/0 | 4/0/0 |
| start-scheduled-now | 12/0/0 | 84/0/0 | 144/0/0 | 12/0/0 | 120/0/0 | 36/0/0 | 96/0/0 | 4/0/0 |
| start-active-now | 12/0/0 | 84/0/0 | 144/0/0 | 12/0/0 | 120/0/0 | 36/0/0 | 96/0/0 | 4/0/0 |
| start-active-date | 12/0/0 | 84/0/0 | 180/0/0 | 12/0/0 | 120/0/0 | 36/0/0 | 120/0/0 | 4/0/0 |
| start-error | 12/0/0 | 84/0/0 | 180/0/0 | 48/0/0 | 120/0/0 | 36/0/0 | 120/0/0 | 4/0/0 |
| start-failed | 12/0/0 | 84/0/0 | 192/**12**/0 | 48/0/0 | 120/0/0 | 36/0/0 | 120/0/0 | 4/0/0 |
| activate-now | 12/0/0 | 84/0/0 | 203/0/0 | 12/0/0 | 120/0/0 | 36/0/0 | 96/0/0 | 4/0/0 |
| activate-date | 12/0/0 | 84/0/0 | 240/0/0 | 12/0/0 | 120/0/0 | 36/0/0 | 120/0/0 | 4/0/0 |
| activate-error | 12/0/0 | 84/0/0 | 252/0/0 | 48/0/0 | 120/0/0 | 36/0/0 | 120/0/0 | 4/0/0 |
| activate-scheduling | 12/0/0 | 84/0/0 | 132/0/0 | 12/0/0 | 120/0/0 | 36/0/0 | 72/0/0 | 4/0/0 |
| deactivate-details | 12/0/0 | 60/0/0 | 84/0/0 | 12/0/0 | 120/0/0 | 36/0/0 | 72/0/0 | 4/0/0 |
| delete-details | 12/0/0 | 60/0/0 | 84/0/0 | 12/0/0 | 120/0/0 | 36/0/0 | 72/0/0 | 4/0/0 |
| delete-row | 12/0/0 | 60/0/0 | 84/0/0 | 24/0/0 | 120/0/0 | 36/0/0 | 72/0/0 | 4/0/0 |
| edit-entry | 12/0/0 | 60/0/0 | 84/0/0 | 12/0/0 | 120/0/0 | 36/0/0 | 72/0/0 | 4/0/0 |
| edit-entry-row | 12/0/0 | 60/0/0 | 84/0/0 | 24/0/0 | 120/0/0 | 36/0/0 | 72/0/0 | 4/0/0 |
| edit-step1 | 8/0/**4** | 192/0/0 | 408/0/0 | 36/0/0 | 120/0/0 | 132/0/0 | 288/0/0 | 4/0/0 |
| edit-leave | 12/0/0 | 60/0/0 | 84/0/0 | 36/0/0 | 120/0/0 | 36/0/0 | 72/0/0 | 4/0/0 |
| edit-discard | 12/0/0 | 60/0/0 | 84/0/0 | 36/0/0 | 120/0/0 | 36/0/0 | 72/0/0 | 4/0/0 |
| edit-save | 12/0/0 | 60/0/0 | 144/0/0 | 36/0/0 | 120/0/0 | 36/0/0 | 72/0/0 | 4/0/0 |

Totals: 15,540 pass, 43 fail (24 contrast, 19 forbidden_text), 4 unsure (clipped). The live regions' expectations all passed: the date error "Enter a date after today." / "Geben Sie ein Datum nach dem heutigen Tag ein." (`role="alert"`), the error ID line ("Error ID:" / "Fehler-ID:" with `T087-…-fake`), the no-answer sentence "Couldn’t publish, so nothing has changed. …" / "Die Anbindung konnte nicht veröffentlicht werden, daher hat sich nichts geändert. …", the status dialog's "Publishing… This takes a few seconds." / "Wird veröffentlicht … Das dauert einige Sekunden." and "Published Opening your connection page…" / "Veröffentlicht Die Seite Ihrer Anbindung wird geöffnet …". Alert titles at 160 CSS px: publish-failed, publish-no-answer and start-failed, 73 of 89 px (82 %, Chromium) and 88 of 104 px (85 %, Firefox) in both languages (T024's local `narrow:[&_.kern-title]:basis-full!` and `DialogFailureAlert`'s classes); no other state shows a `.kern-alert` (96 "(none visible)" rows).

2. Defects: `state | language | width | browser | measure | element | value | limit | suspected file`

| state | language | width | browser | measure | element | value | limit | suspected file |
|---|---|---|---|---|---|---|---|---|
| start-scheduled-date | en, de | 1440, 320, 160 | Chromium, Firefox | contrast | dialog > input "Start date (DD.MM.YYYY)" / "Startdatum (TT.MM.JJJJ)" (boundary), unfocused | border 1.25 (#e1e6f0 on #ffffff), no fill | 3 | `frontend/src/components/ActiveFromChoice/constants.ts` (`DATE_FIELD_CLASSES.valid`: `border-(--kern-color-decorative-border-default)`, as T023 built P1b's 1 px #e1e6f0; KERN's own fields measure border-bottom #22293a 14.52 and fill #f2f5fb) |
| start-failed | en, de | 1440, 320, 160 | Chromium, Firefox | contrast | the same field after the failure (unfocused) | border 1.25 (#e1e6f0 on #ffffff) | 3 | the same; the field is the same in the publish dialog and "Activate again" (there it was focused while measured, so its outline passed) |
| edit-step1 | en, de | 320 | Chromium | clipped (unsure → defect) | nav > span "T087 sweep base scheduled" (the header's name) | 0 px of 178 shown (text 165–343 in 165–165; de 169–347 in 169–169) | ≥ min(own width, 96 px) (T084 (4)) | `frontend/src/components/TopBar/index.tsx` (T084 (4), T098's decided fix; T088 measures it) |
| edit-step1 | en, de | 320 | Firefox | clipped (unsure → defect) | the same | 7–8 px of 178 shown (165–172; de 169–177) | ≥ min(own width, 96 px) | the same |

3. Unsure and failing rows looked at, with the verdict

| state | measure | element | cells | verdict |
|---|---|---|---|---|
| publish-now, publish-date, publish-date-error, publish-publishing, publish-published, publish-failed, publish-no-answer | forbidden_text "Message … reads" (19 rows) | th "Message Emre reads" (Giulia, Felix, Jonas, …) | English only, cells varying with the generated personas | pass: the test step behind the modal dialog, `TestStep/ResultTable.tsx`'s column head for a persona who doesn't meet a variant (spec 004, F3/F14); FR-076 excludes the box only for a persona who meets every rule (spec.md Clarification 2026-11-10 #8), and the table shows "Rules <name> meets" then. The harness's pattern can't tell them apart (a limit for every sweep over the test step) |
| edit-step1 | clipped (4 rows) | the header's name | en/de 320 ch/ff | defect (section 2): the cut is an ellipsis, but to 0–8 px, under T084 (4)'s minimum |
| (screenshot `start-failed-de-160-firefox.png`) | label_width | "Abbrechen" breaks as "Abbreche / n" at 160 | de 160 | pass: index.css's narrow block wraps words below 320 CSS px by design (CLAUDE.md "Narrow windows"); the label fits its box |

4. Cited rows: English in Chromium at 1440, 320 and 160 from §2.1 `#### T023` ("Active from"), `#### T024` (the publish dialog), `#### T025` (the scheduled details and the menu), `#### T026` ("Change start date"), `#### T027` (the scheduled confirmations and "Activate again"), `#### T028` (the scheduled edit flow; Firefox at 1440 there) and §2.2 `#### T030` (the walk V1–V4, both browsers and languages at 1440). The sweep ran those cells too; they found the same two defects (the date field's border, the header's name at 320), which the cited tables didn't measure (contrast of an unfocused border) or left to T084 (the name).

Open rows: 4 defects (2 groups: the date field's border, the header's name at 320), for T098.

#### T088: sweep of US2's rows and pill (C1, S4 "The row's date", S15, S16; FR-072, SC-009, W16; T085's harness, scripted `playwright-core` 1.65: Chromium `/usr/bin/chromium` and Firefox build 1572, CSS px viewports, zone Europe/Berlin, language through the stored choice; main installation, backend 3016 on `konnekt_db_010_p12` with the fake EUDIPLO, Vite 5180; signed in as `p10-alice`)

**Items**: the overview's row in the four states (`row-live`, `row-scheduled`, `row-deactivated`,
`row-draft`: the overview filtered by the row's full name, so that one row shows; scope: the row);
the details' status band with its date pill and the header's "Where you are" pill in the four
states (`band-*`; scope: the header's nav and the band); the ⋯ menu open on the date pill for a
scheduled, an active and a deactivated connection (`menu-*`; scope: the menu); and, carried from
T014, the edit flow's header in the four states (`header-edit-*`; `/form-connections/<id>/edit`,
the draft's editor; scope: the header's nav). 15 states over en, de × 1440, 320, 160 × Chromium,
Firefox (180 cells, English Chromium included: it adds contrast, label widths and focus). Carried
from T084 (4): the header name's visible width (`name-details-*`, `name-edit-*`) at 320, 400, 600,
767, 768, 900 and 1024 CSS px, en and de, in Chromium, and in Firefox at 320 and 768 (144 cells,
measures `horizontal_scroll`, `clipped` and the rows below).

**Measures**: the harness's ten, plus the sweep's own rows: `name_width` (the name's box, its
`getBoundingClientRect()` width clipped by its `truncate`, against min(its own `scrollWidth`, 96);
T084 (4)), `pill_in_nav` (the status pill inside the "Where you are" pill and the viewport; its
label's lines), `pill_label` (the header pill's text; the scheduled label with U+00A0 before "·"
and a date), `row_date` and `band_line` (the texts of S4 and C1 by pattern), `menu_in_viewport`
and `menu_entries` (S15's entries), `alert_title_width` (T084 (5), at 160 CSS px).

**Data** (made through the API by `<SP>/sweep/T088/rows.mjs`, found again on a rerun; kept for
T098): "T088 sweep Anwohnerparkausweis live" `ef470389-8579-4477-b734-53e0f1bdbe3b`, "… scheduled"
`62ec4dfd-2764-48bf-b653-1ce95e6896c9` (starts 12.12.2026), "… deactivated"
`e6467ac4-70e4-4ae7-b6a7-38fb71d57ab8`, "… draft" `701824a9-15cd-41ae-b5e4-9da296773d5d` (step
rules). The names are of a realistic length (249–302 px of text at 14 px), as T084 (4) asks.

**Run**: 2026-11-12, 324 cells, 6968 rows (main 180 cells / 6248 rows in 1077 s; names 144 cells /
720 rows in 419 s), with T087, T089 and T090 running at the same time. Script:
`<SP>/sweep/T088/sweep.mjs`; output `<SP>/sweep/T088/out/` and `<SP>/sweep/T088/out-names/`.

**1. Counts per state × measure** (pass/fail/unsure; main matrix, 12 cells per state; "–" not
measured)

| state | h_scroll | h1 | lang | clipped | label_w | contrast | live | forbidden | durations | focus | own rows |
|---|---|---|---|---|---|---|---|---|---|---|---|
| row-live | 12/0/0 | 12/0/0 | 12/0/0 | 0/0/12 | 72/0/0 | 132/0/0 | 24/0/0 | 96/0/0 | 24/0/0 | 120/0/0 | row_date 12/0/0, alert 4/0/0 |
| row-scheduled | 12/0/0 | 12/0/0 | 12/0/0 | 0/0/12 | 72/0/0 | 132/0/0 | 24/0/0 | 96/0/0 | 24/0/0 | 120/0/0 | row_date 12/0/0, alert 4/0/0 |
| row-deactivated | 12/0/0 | 12/0/0 | 12/0/0 | 0/0/12 | 72/0/0 | 132/0/0 | 24/0/0 | 96/0/0 | 24/0/0 | 120/0/0 | row_date 12/0/0, alert 4/0/0 |
| row-draft | 12/0/0 | 12/0/0 | 12/0/0 | 12/0/0 | 72/0/0 | 120/0/0 | 24/0/0 | 96/0/0 | 24/0/0 | 120/0/0 | row_date 12/0/0, alert 4/0/0 |
| band-live | 12/0/0 | 12/0/0 | 12/0/0 | 8/0/4 | 12/0/0 | 96/0/0 | 12/0/0 | 96/0/0 | 48/0/0 | 48/0/0 | band_line 12/0/0, name_width 8/**4**/0, pill_in_nav 12/0/0, pill_label 12/0/0, alert 4/0/0 |
| band-scheduled | 12/0/0 | 12/0/0 | 12/0/0 | 8/0/4 | 12/0/0 | 96/0/0 | 12/0/0 | 96/0/0 | 48/0/0 | 48/0/0 | band_line 12/0/0, name_width 8/**4**/0, pill_in_nav 12/0/0, pill_label 12/0/0, alert 4/0/0 |
| band-deactivated | 12/0/0 | 12/0/0 | 12/0/0 | 8/0/4 | 36/0/0 | 120/0/0 | 12/0/0 | 96/0/0 | 48/0/0 | 72/0/0 | band_line 12/0/0, name_width 8/**4**/0, pill_in_nav 12/0/0, pill_label 12/0/0, alert 4/0/0 |
| band-draft | 12/0/0 | 12/0/0 | 12/0/0 | 8/0/4 | 24/0/0 | 60/0/48 | 12/0/0 | 96/0/0 | 36/0/0 | 48/0/0 | band_line 12/0/0, name_width 8/**4**/0, pill_in_nav 12/0/0, pill_label 12/0/0, alert 4/0/0 |
| menu-scheduled | 12/0/0 | 12/0/0 | 12/0/0 | 12/0/0 | 36/0/0 | 46/0/0 | 12/0/0 | 96/0/0 | 48/0/0 | 72/0/0 | menu_in_viewport 12/0/0, menu_entries 12/0/0, alert 4/0/0 |
| menu-live | 12/0/0 | 12/0/0 | 12/0/0 | 12/0/0 | 36/0/0 | 46/0/0 | 12/0/0 | 96/0/0 | 48/0/0 | 72/0/0 | menu_in_viewport 12/0/0, menu_entries 12/0/0, alert 4/0/0 |
| menu-deactivated | 12/0/0 | 12/0/0 | 12/0/0 | 12/0/0 | 12/0/0 | 24/0/0 | 12/0/0 | 96/0/0 | 24/0/0 | 24/0/0 | menu_in_viewport 12/0/0, menu_entries 12/0/0, alert 4/0/0 |
| header-edit-live | 12/0/0 | 12/0/0 | 12/0/0 | 8/0/4 | 12/0/0 | 48/0/0 | 36/0/0 | 96/0/0 | 36/0/0 | 24/0/0 | name_width 8/**4**/0, pill_in_nav 12/0/0, pill_label 12/0/0, alert 4/0/0 |
| header-edit-scheduled | 12/0/0 | 12/0/0 | 12/0/0 | 8/0/4 | 12/0/0 | 48/0/0 | 36/0/0 | 96/0/0 | 36/0/0 | 24/0/0 | name_width 8/**4**/0, pill_in_nav 12/0/0, pill_label 12/0/0, alert 4/0/0 |
| header-edit-deactivated | 12/0/0 | 12/0/0 | 12/0/0 | 8/0/4 | 12/0/0 | 48/0/0 | 36/0/0 | 96/0/0 | 36/0/0 | 24/0/0 | name_width 8/**4**/0, pill_in_nav 12/0/0, pill_label 12/0/0, alert 4/0/0 |
| header-edit-draft | 12/0/0 | 12/0/0 | 12/0/0 | 8/0/4 | 12/0/0 | 48/0/0 | 36/0/0 | 96/0/0 | 36/0/0 | 24/0/0 | name_width 8/**4**/0, pill_in_nav 12/0/0, pill_label 12/0/0, alert 4/0/0 |
| name-details-live | 18/0/0 | – | – | 6/0/12 | – | – | – | – | – | – | name_width 10/**8**/0, pill_in_nav 18/0/0, pill_label 18/0/0 |
| name-edit-live | 18/0/0 | – | – | 8/0/10 | – | – | – | – | – | – | name_width 14/**4**/0, pill_in_nav 18/0/0, pill_label 18/0/0 |
| name-details-scheduled | 18/0/0 | – | – | 2/0/16 | – | – | – | – | – | – | name_width 7/**11**/0, pill_in_nav 15/**3**/0, pill_label 18/0/0 |
| name-edit-scheduled | 18/0/0 | – | – | 4/0/14 | – | – | – | – | – | – | name_width 8/**10**/0, pill_in_nav 18/0/0, pill_label 18/0/0 |
| name-details-deactivated | 18/0/0 | – | – | 2/0/16 | – | – | – | – | – | – | name_width 8/**10**/0, pill_in_nav 18/0/0, pill_label 18/0/0 |
| name-edit-deactivated | 18/0/0 | – | – | 4/0/14 | – | – | – | – | – | – | name_width 12/**6**/0, pill_in_nav 18/0/0, pill_label 18/0/0 |
| name-details-draft | 18/0/0 | – | – | 8/0/10 | – | – | – | – | – | – | name_width 13/**5**/0, pill_in_nav 18/0/0, pill_label 18/0/0 |
| name-edit-draft | 18/0/0 | – | – | 8/0/10 | – | – | – | – | – | – | name_width 13/**5**/0, pill_in_nav 18/0/0, pill_label 18/0/0 |

(A name-* state has 18 cells: 14 in Chromium, 4 in Firefox.) The live regions held: the overview's count ("1 of <n> connections" / "1 von
<n> Anbindungen"; n grew while other sweeps made rows), empty status regions elsewhere, and the
edit flow's not-rendered "Saving…"/"Publishing…" regions. No FR-076 text in any cell; `<html lang>`
right in every cell; no `error` or `page_error` row.

**The header name's visible width** (CSS px; **bold** = below min(own, 96), a defect; own width at
14 px: live 249, scheduled 292, deactivated 302, draft 257; the details page and the edit flow
differ from 768 px up, where the details' header also shows the description beside the nav)

Chromium:

| page | state | lang | 160 | 320 | 400 | 600 | 767 | 768 | 900 | 1024 | 1440 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| details | live | en | 113 | **27** | 107 | 248.7 | 248.7 | **69.9** | 201.9 | 248.7 | 248.7 |
| details | live | de | 113 | **30.2** | 110.2 | 248.7 | 248.7 | **73.1** | 205.1 | 248.7 | 248.7 |
| details | scheduled | en | 113 | **0** | **72.1** | 234.6 | 291.7 | **0** | **94.1** | 218.1 | 291.7 |
| details | scheduled | de | 113 | **0** | **72.9** | 241 | 291.7 | **0** | 107.3 | 231.3 | 291.7 |
| details | deactivated | en | 113 | **0** | **69.3** | 269.3 | 301.7 | **32.2** | 164.2 | 288.2 | 301.7 |
| details | deactivated | de | 113 | **0** | **71.1** | 271.1 | 301.7 | **34** | 166 | 290 | 301.7 |
| details | draft | en | 113 | **33.6** | 113.6 | 257 | 257 | 171.5 | 257 | 257 | 257 |
| details | draft | de | 113 | **12.7** | **92.7** | 257 | 257 | 150.5 | 257 | 257 | 257 |
| edit | live | en | 113 | **27** | 107 | 248.7 | 248.7 | 164.9 | 248.7 | 248.7 | 248.7 |
| edit | live | de | 113 | **30.2** | 110.2 | 248.7 | 248.7 | 168.1 | 248.7 | 248.7 | 248.7 |
| edit | scheduled | en | 113 | **0** | **72.1** | 234.6 | 291.7 | **57.1** | 189.1 | 291.7 | 291.7 |
| edit | scheduled | de | 113 | **0** | **72.9** | 241 | 291.7 | **70.3** | 202.3 | 291.7 | 291.7 |
| edit | deactivated | en | 113 | **0** | **69.3** | 269.3 | 301.7 | 127.2 | 259.2 | 301.7 | 301.7 |
| edit | deactivated | de | 113 | **0** | **71.1** | 271.1 | 301.7 | 129 | 261 | 301.7 | 301.7 |
| edit | draft | en | 113 | **33.6** | 113.6 | 257 | 257 | 171.5 | 257 | 257 | 257 |
| edit | draft | de | 113 | **12.7** | **92.7** | 257 | 257 | 150.5 | 257 | 257 | 257 |

Firefox (the check; 160 and 1440 from the main matrix):

| page | state | en 160 | en 320 | en 768 | en 1440 | de 160 | de 320 | de 768 | de 1440 |
|---|---|---|---|---|---|---|---|---|---|
| details | live | 128 | **42** | **84.9** | 248.7 | 128 | **45.2** | **88.1** | 248.7 |
| details | scheduled | 128 | **7.1** | **0** | 291.7 | 128 | **8** | **0** | 291.6 |
| details | deactivated | 128 | **4.3** | **47.2** | 301.7 | 128 | **6.1** | **49** | 301.7 |
| details | draft | 128 | **48.6** | 186.5 | 257 | 128 | **27.7** | 165.6 | 257 |
| edit | live | 128 | **42** | 179.9 | 248.7 | 128 | **45.2** | 183.1 | 248.7 |
| edit | scheduled | 128 | **7.1** | **72.1** | 291.7 | 128 | **8** | **85.4** | 291.6 |
| edit | deactivated | 128 | **4.3** | 142.2 | 301.7 | 128 | **6.1** | 144 | 301.7 |
| edit | draft | 128 | **48.6** | 186.5 | 257 | 128 | **27.7** | 165.6 | 257 |

At 160 the name wraps (`narrow:`) and shows whole; at 600 and 767 it fits beside the pill.

**The scheduled header pill** (carried from T014, Chromium; EN/DE): one line at 1440, 1024, 900,
768 and 767 (180.6 / 163.9 wide); two lines ("Scheduled ·" / "<date>", the no-break space holding
"·" to the first line) at 600 (145.3 / 135.4), 400 and 320 (107.8 / 103.4), and 160 (113 × 48);
the "Where you are" pill grows to 64 px from 320 to 600 and stays inside the window (no
horizontal scroll at any width); `pill_label` passed in all 228 cells.

**2. Defects** (17 rows, all open; one row per page, state and browser, the cells in the value)

| state | language | width | browser | measure | element | value | limit | suspected file |
|---|---|---|---|---|---|---|---|---|
| details live (band-live, name-details-live) | en, de | 320, 768 | chromium | name_width | header nav > span.truncate (the name) | 320: en 27, de 30.2; 768: en 69.9, de 73.1 | ≥ min(own, 96) = 96 | `frontend/src/components/TopBar/index.tsx` |
| details live | en, de | 320, 768 | firefox | name_width | the name | 320: en 42, de 45.2; 768: en 84.9, de 88.1 | ≥ 96 | `components/TopBar/index.tsx` |
| details scheduled (band-scheduled, name-details-scheduled) | en, de | 320, 400, 768, 900 | chromium | name_width | the name | 320: 0 / 0; 400: 72.1 / 72.9; 768: 0 / 0; 900: en 94.1 | ≥ 96 | `components/TopBar/index.tsx` |
| details scheduled | en, de | 320, 768 | firefox | name_width | the name | 320: 7.1 / 8; 768: 0 / 0 | ≥ 96 | `components/TopBar/index.tsx` |
| details deactivated | en, de | 320, 400, 768 | chromium | name_width | the name | 320: 0 / 0; 400: 69.3 / 71.1; 768: 32.2 / 34 | ≥ 96 | `components/TopBar/index.tsx` |
| details deactivated | en, de | 320, 768 | firefox | name_width | the name | 320: 4.3 / 6.1; 768: 47.2 / 49 | ≥ 96 | `components/TopBar/index.tsx` |
| details draft | en, de | 320, 400 (de) | chromium | name_width | the name | 320: 33.6 / 12.7; 400: de 92.7 | ≥ 96 | `components/TopBar/index.tsx` |
| details draft | en, de | 320 | firefox | name_width | the name | 48.6 / 27.7 | ≥ 96 | `components/TopBar/index.tsx` |
| edit live (header-edit-live, name-edit-live) | en, de | 320 | chromium | name_width | the name | 27 / 30.2 | ≥ 96 | `components/TopBar/index.tsx` |
| edit live | en, de | 320 | firefox | name_width | the name | 42 / 45.2 | ≥ 96 | `components/TopBar/index.tsx` |
| edit scheduled | en, de | 320, 400, 768 | chromium | name_width | the name | 320: 0 / 0; 400: 72.1 / 72.9; 768: 57.1 / 70.3 | ≥ 96 | `components/TopBar/index.tsx` |
| edit scheduled | en, de | 320, 768 | firefox | name_width | the name | 320: 7.1 / 8; 768: 72.1 / 85.4 | ≥ 96 | `components/TopBar/index.tsx` |
| edit deactivated | en, de | 320, 400 | chromium | name_width | the name | 320: 0 / 0; 400: 69.3 / 71.1 | ≥ 96 | `components/TopBar/index.tsx` |
| edit deactivated | en, de | 320 | firefox | name_width | the name | 4.3 / 6.1 | ≥ 96 | `components/TopBar/index.tsx` |
| edit draft | en, de | 320, 400 (de) | chromium | name_width | the name | 320: 33.6 / 12.7; 400: de 92.7 | ≥ 96 | `components/TopBar/index.tsx` |
| edit draft | en, de | 320 | firefox | name_width | the name | 48.6 / 27.7 | ≥ 96 | `components/TopBar/index.tsx` |
| details scheduled (name-details-scheduled) | en, de (ch); en (ff) | 768 | chromium, firefox | pill_in_nav | header nav > status pill "Scheduled · 12.12.2026" | the status pill runs out of the "Where you are" pill: right edge 494.9 (en) / 481.7 (de) against the nav's 473.0 (Chromium), 494.9 against 488.0 (Firefox en); the name is 0 wide and the pill overlaps the header's description ("scheduled co…") | inside the nav | `components/TopBar/index.tsx` |

59 distinct cells of `name_width` fail (Chromium 35, Firefox 24), all in `TopBar`'s
`ConnectionPill`, which T084 (4) gives to T098 (the status pill wraps under the name inside the
"Where you are" pill where both can't fit on one row). No contrast, focus, label-width,
horizontal-scroll, clipped, durations, live-region, lang or FR-076 defect; the menu is inside the
viewport in all 36 menu cells, at 160 CSS px included (24–121 wide); no alert shows in any of
these states, so no `alert_title_width` row fails.

**3. Unsure rows and verdicts**

| state | measure | element | cells | verdict |
|---|---|---|---|---|
| row-live, row-scheduled, row-deactivated | clipped | the row's description `p.truncate` ("live connection of T088 sweep …") | all 12 cells each | pass: spec 008's intended ellipsis (the full text in the row's tooltip); the draft's row has no description |
| band-*, header-edit-*, name-* | clipped | the header's name `span.truncate` | 320 (and 400–1024 where cut) | not a pass by itself: the ellipsis is spec 008's, but below 96 px it is the `name_width` defect above; above 96 px pass (T084 (4): "a cut with … beyond that stays") |
| band-draft | contrast | h1 "This connection is a draft", the sub-line, "Delete draft" (text and icon), en and de | all 12 cells | pass: the draft band's fill is a gradient (`feedback-info-background` #e0f2fe → `layout-background-hued` #f2f5fb, `pages/FormConnectionDetail/constants.ts`); against both ends #0b1220 is 16.3–17.1, #4a5468 6.6–7.0, #1d56f0 5.0–5.3 (all ≥ 4.5) |

**4. Cited rows** (English in Chromium, not judged anew; the sweep reran them and they agree
except the name widths): design-notes §2.1 `#### T013` (the row's date by state, 1440, and the
narrow rows at 320 and 160), `#### T015` (the date pill, the band, the ⋯ menu at 1440, 320, 160,
Chromium), `#### T014` (the status pill: measured in Firefox, so this sweep's English Chromium
cells of `band-*`, `header-edit-*` and `name-*` are the Chromium rows T014 lacked); §2.2
`#### T017` (walk V5, both browsers and languages at 1440). T014's "header name … 7.1 (EN), 8 (DE)"
at 320 was Firefox; Chromium cuts the same names to 0.

#### T089, sweep of US3's Activity card (S15 "The Activity card", "The three cards", S16; FR-072, SC-009, W16; report only)

T085's harness (`<SP>/sweep/measure.mjs`, `playwright-core` 1.65): Chromium 156 (`/usr/bin/chromium`) and Firefox (build 1572), headless, side by side. Every state ran over the full matrix: en and de × 1440, 320 and 160 CSS px viewports (heights 900, 720, 450) × Chromium and Firefox. That is 144 cells and 5,617 CSV rows in 980 s of wall time (Chromium 9.7 s per cell, Firefox 13.4 s). The English Chromium cells were run too: they add contrast, label widths and focus, which T033, T034 and T036 didn't measure. The installation was the main one (backend 3016 on `konnekt_db_010_p12`, fake EUDIPLO, worker off; Vite 5180), signed in as `p10-alice`, with the browser zone Europe/Berlin.

Measures: the harness's ten (horizontal_scroll, clipped, h1_count, focus_visible, contrast, durations, label_width, live_region, lang, forbidden_text). The element measures were scoped to the Activity card, or to the three cards in the accordion states. The sweep added its own rows:
- `text`: the closed line against copy.md §3 / data-model §2.5, the toggle's label and `aria-expanded`, the failure's title, the list's name and the last entry.
- `rows`: the entry count, no entry wider than the list, and the entry's `flex-direction` (`column` below 640 px, as §4.2 T032/T033 (2) decides; `row` at 1440).
- `scroll`: the 62-entry list scrolled to its end by `End`, still focused, at most 400 px high.
- `accordion`: one card open; "View summary" closes Activity.
- `alert_title_width`: T084 (5), at 160 CSS px.

Data, made through the API by `<SP>/sweep/T089/seed.mjs` (idempotent: it finds the rows by the search before making any):

| Connection | id | What it shows |
|---|---|---|
| `T089 sweep live` | `ca54607a-3aa3-4ec5-bef1-dea0945d1c4e` | live, by p10-alice |
| `T089 sweep scheduled` | `6521dae7-510c-4a39-be03-00bf91240561` | scheduled 30 days ahead |
| `T089 sweep deactivated` | `1480a4c1-7313-43ba-9987-0ebc983eeac8` | deactivated by p10-alice |
| `T089 sweep draft` | `efd619a2-a9fa-4450-9920-096de4c94cd5` | a draft, saved once through a revoked token "T089 agent": "p10-alice with T089 agent" |
| `T089 sweep none live` | `56327e79-758d-4b78-91d2-b3572e3ddbc6` | live; its two entries' person cleared with `psql` (as T033's "none"): the time alone |
| `T089 sweep mixed` | `e4691164-c201-4bf1-9e6f-2a5047391a44` | 10 entries by p10-alice and p10-bob in turn: Created, Published, Name changed, Description changed, Scheduled for, Start date changed to <date>, … to now, Deactivated, Activated again, Description changed |
| `T089 sweep long` | `8e893e71-8537-4570-9668-a06bc33e1971` | Created, Published, then 60 renames by p10-bob and p10-alice in turn (no entry merges, data-model §2.4): 62 entries, two pages |

How each state was reached:
- **closed-person, closed-time, closed-deactivated**: the details as loaded (Summary open, Activity closed). The live, none and deactivated connections respectively.
- **open**: `mixed` with "View activity", body settled and loaded.
- **open-loading**: `live` with the activity GET held by `page.route()`.
- **open-failed**: `live` with `failNext(apiPattern('/form-connections/*/activity'), 500, 'always')`.
- **open-loading-more**: `long` with the `?cursor=` GET held; the list focused, then `End`.
- **open-long-end**: `long`; Tab from the toggle to the list, `End`, all 62 loaded, `End` again.
- **accordion-live, accordion-scheduled, accordion-deactivated, accordion-draft**: Activity opened on each.

1. Counts per state × measure (pass/fail/unsure; every cell of the matrix; – = not measured)

| state | h_scroll | h1 | lang | clipped | label_width | contrast | live_region | forbidden | durations | text | focus_visible | alert_title | rows | scroll | accordion |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| closed-person | 12/0/0 | 12/0/0 | 12/0/0 | 12/0/0 | 24/0/0 | 36/0/0 | 12/0/0 | 96/0/0 | 36/0/0 | 24/0/0 | 24/0/0 | 4/0/0 | – | – | – |
| closed-time | 12/0/0 | 12/0/0 | 12/0/0 | 12/0/0 | 24/0/0 | 36/0/0 | 12/0/0 | 96/0/0 | 36/0/0 | 24/0/0 | 24/0/0 | 4/0/0 | – | – | – |
| closed-deactivated | 12/0/0 | 12/0/0 | 12/0/0 | 12/0/0 | 24/0/0 | 36/0/0 | 12/0/0 | 96/0/0 | 36/0/0 | 24/0/0 | 24/0/0 | 4/0/0 | – | – | – |
| open | 12/0/0 | 12/0/0 | 12/0/0 | 12/0/0 | 24/0/0 | 181/0/0 | 12/0/0 | 96/0/0 | 36/0/0 | 24/0/0 | 48/0/0 | 4/0/0 | 36/0/0 | – | – |
| open-loading | 12/0/0 | 12/0/0 | 12/0/0 | 12/0/0 | 24/0/0 | 49/0/0 | 36/0/0 | 96/0/0 | 36/0/0 | 12/0/0 | 24/0/0 | 4/0/0 | – | – | – |
| open-failed | 12/0/0 | 12/0/0 | 12/0/0 | 12/0/0 | 48/0/0 | 109/0/0 | 48/0/0 | 96/0/0 | 36/0/0 | 12/0/0 | 48/0/0 | 4/0/0 | – | – | – |
| open-loading-more | 12/0/0 | 12/0/0 | 12/0/0 | 12/0/0 | 24/0/0 | 96/0/0 | 36/0/0 | 96/0/0 | 36/0/0 | 12/0/0 | 48/0/0 | 4/0/0 | 36/0/0 | – | – |
| open-long-end | 12/0/0 | 12/0/0 | 12/0/0 | 12/0/0 | 24/0/0 | 108/0/0 | 12/0/0 | 96/0/0 | 36/0/0 | 24/0/0 | 48/0/0 | 4/0/0 | 36/0/0 | 12/0/0 | – |
| accordion-live | 12/0/0 | 12/0/0 | 12/0/0 | 12/0/0 | 72/0/0 | 157/0/0 | 12/0/0 | 96/0/0 | 84/0/0 | 12/0/0 | 96/0/0 | 4/0/0 | 36/0/0 | – | 24/0/0 |
| accordion-scheduled | 12/0/0 | 12/0/0 | 12/0/0 | 12/0/0 | 72/0/0 | 169/0/0 | 12/0/0 | 96/0/0 | 84/0/0 | 12/0/0 | 96/0/0 | 4/0/0 | 36/0/0 | – | 24/0/0 |
| accordion-deactivated | 12/0/0 | 12/0/0 | 12/0/0 | 12/0/0 | 72/0/0 | 168/0/0 | 12/0/0 | 96/0/0 | 84/0/0 | 12/0/0 | 96/0/0 | 4/0/0 | 36/0/0 | – | 24/0/0 |
| accordion-draft | 12/0/0 | 12/0/0 | 12/0/0 | 12/0/0 | 48/0/0 | 176/0/0 | 12/0/0 | 96/0/0 | 60/0/0 | 12/0/0 | 72/0/0 | 4/0/0 | 36/0/0 | – | 24/0/0 |

Totals: 5,617 rows, 0 fail, 0 unsure.

Live regions (both browsers, three widths):
- **open-loading**: the card's `role="status"` reads "Loading activity…" / "Aktivität wird geladen …".
- **open-loading-more**: it reads "Loading earlier activity…" / "Frühere Aktivität wird geladen …".
- **open-failed**: the `role="alert"` reads "Couldn’t load the activity" / "Die Aktivität konnte nicht geladen werden", then the 5xx sentence and "Error ID: T089-…-fake" / "Fehler-ID: T089-…-fake".
- **Every other state**: the status is empty.

`<html lang>` matched in all 144 cells. None of FR-076's texts appeared.

Alert-title widths at 160 CSS px (T084 (5)): the only alert in these states is the failure's ("Couldn’t load the activity" / "Die Aktivität konnte nicht geladen werden"). Chromium: 87.0 of the alert's 103.0 px content width. Firefox: 102.0 of 118.0. All four cells pass, since the title wraps under the icon at the card's width.

2. Defects: none.

3. Unsure rows: none from the harness. Looked at by screenshot (3 opened):
- `open-failed-de-160-chromium`: title, body, the error ID and "Erneut versuchen" all inside the card. **Verdict: pass.** The body words break mid-word ("schiefgela|ufen"), which is the narrow block's `wrap-anywhere` (spec 008 baseline, CLAUDE.md "Narrow windows").
- `open-de-320-firefox` and `open-long-end-de-1440-firefox`: Firefox's full-page screenshot paints the sticky top bar at the scroll position, mid-page and over the cards. **Verdict: pass** (a screenshot artifact; the DOM measures saw no overlap or clipping).
- `open-long-end-de-1440-firefox`: with the list at its end, its last entry ("Erstellt") sits partly behind the sticky footer at 1440 × 900, because `End` scrolls the list, not the page. The focused list stays mostly visible (WCAG 2.4.11 is met), and one more arrow or page key scrolls the page. **Verdict: pass, noted for T098** (no change asked).

4. Cited rows (English, Chromium, three widths; layout and behaviour, not rerun as judgements):
- design-notes §2.1 `#### T032 and T033` (line 577): the frames' rows at 1440 (lines 581–620) and the narrow rows at 320 and 160 for closed, loading, loaded, loading more, end and failed (lines 622–631: no horizontal scroll, nothing clipped or off-screen, entries stacked, list focus ring after Tab and none after a click, the no-answer fallback).
- §2.1 `#### T034` (line 633): the accordion at 1440 (lines 646–664) and the narrow rows 676–695 (after publishing, after "Save", Activity opened, from the overview, deactivated, scheduled, draft; 320 and 160).
- §2.2 `#### T036` (line 1641): walk V6 in en and de at 1440, the narrow 320 rows "card closed" and "card open", and V6.7, the oldest entry by wheel and by keyboard on 66 entries.

This sweep's English Chromium cells agree with them.

Rerun: `node <SP>/sweep/T089/sweep.mjs [state-id …]` (no ids: all twelve). It finds or makes its rows through `seed.mjs`. Output in `<SP>/sweep/T089/out/` (`T089.csv`, `T089-summary.md`, `shots/`).

#### T090: sweep of US8's approval page (S21, `/approvals/<id>`; W14, no frame)

Items: FR-072, SC-009, W14; copy.md §7 (and §2's deactivate sentence, FR-010's delete sentence, FR-060's example line). Harness: T085's `measure.mjs` (`playwright-core` 1.65), script `<SP>/sweep/T090/sweep.mjs`, output `<SP>/sweep/T090/out/` (`T090.csv`, `T090-summary.md`, `shots/`, `rows.json`). Browsers: Chromium 156 (`/usr/bin/chromium`) and Playwright's Firefox (`firefox-1572`), headless, side by side. Widths: 1440, 320 and 160 CSS px viewports (heights 900, 720, 450). Languages: English and German (the stored choice of `LanguageProvider`). The full matrix: 16 states × 12 cells = **192 cells, 10,095 rows**, 1,243 s (Chromium 9.5 s, Firefox 12.7 s per cell). Measures: the harness's ten (scope `main` for the element measures) plus two of the sweep's own: `text` (the `h1` and the state's sentences of copy.md §7 word for word in both languages; for an outcome the alert's title; no alert on a waiting page) and `alert_title_width` (at 160 CSS px, each visible `.kern-alert .kern-title`'s width against its alert's content width, under half a defect: T084 (5)). Controls (`focus_visible`, click and keyboard): waiting pages `main button` (ⓘ, "Copy link", "Approve", "Decline"); done pages `main button` and `main a` ("Copy link", "Open the connection"); cancelled pages have no control in `main`.

Data on the main installation (backend 3016, Vite 5180, `konnekt_db_010_p12`, `p10-alice`): the token `T090 manage` (level manage, made in setup, revoked in teardown; its bearer answered 401 afterwards); per state and per browser one connection named `T090 sweep <state> <ch|fi>1 <kind>` with its request made by the bearer through `POST /api/approval-requests` (each request younger than 10 minutes when its cells ran); the unchanged example as two own example drafts (`POST /api/form-connections/example`, one per browser, deleted in teardown); C1 and C2 cancelled by `PUT /api/form-connections/{id}/start-date` after the request (another day; `null`), C3 by `update approval_requests set start_date = current_date` on its own request; the done outcomes are T080's done requests D1 `ccdfcda5-…`, D2 `9b51e6ea-…`, D3 `9671d2bf-…`. The ids are in `out/rows.json`.

States (T080's numbering): W1 publish at once; W2 publish on 01.12.2026; W3 publish of the unchanged example; W4 reactivate on 01.12.2026; W4b reactivate at once; W5 `set_start_date` scheduled → 15.12.2026; W6 `set_start_date` scheduled → now; W7 `set_start_date` live → 01.12.2026; W8 deactivate a scheduled connection; W9 delete a scheduled connection; D1 done publish on a date; D2 done reactivate on a date; D3 done `set_start_date`; C1 cancelled, date moved; C2 cancelled, became active; C3 cancelled, `start_date_passed`.

**1. Counts per state × measure** (pass/fail/unsure; 12 cells each)

| state | h_scroll | h1 | lang | clipped | label_width | contrast | live_region | forbidden | durations | text | focus_visible | alert_title_width |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| W1 publish now | 12/0/0 | 12/0/0 | 12/0/0 | 12/0/0 | 84/0/0 | 576/0/0 | 17/0/0 | 96/0/0 | 60/0/0 | 36/0/0 | 96/0/0 | |
| W2 publish date | 12/0/0 | 12/0/0 | 12/0/0 | 12/0/0 | 84/0/0 | 576/0/0 | 17/0/0 | 96/0/0 | 60/0/0 | 36/0/0 | 96/0/0 | |
| W3 example | 12/0/0 | 12/0/0 | 12/0/0 | 4/0/8 | 108/0/0 | 654/0/0 | 17/0/0 | 96/0/0 | 72/0/0 | 48/0/0 | 144/0/0 | |
| W4 reactivate date | 12/0/0 | 12/0/0 | 12/0/0 | 4/0/24 | 96/0/0 | 204/0/0 | 12/0/0 | 96/0/0 | 24/0/0 | 36/0/0 | 124/0/0 | |
| W4b reactivate now | 12/0/0 | 12/0/0 | 12/0/0 | 4/0/24 | 96/0/0 | 204/0/0 | 12/0/0 | 96/0/0 | 24/0/0 | 36/0/0 | 124/0/0 | |
| W5 start, scheduled → date | 12/0/0 | 12/0/0 | 12/0/0 | 4/0/24 | 96/0/0 | 228/0/0 | 12/0/0 | 96/0/0 | 24/0/0 | 36/0/0 | 124/0/0 | |
| W6 start, scheduled → now | 12/0/0 | 12/0/0 | 12/0/0 | 4/0/24 | 96/0/0 | 228/0/0 | 12/0/0 | 96/0/0 | 24/0/0 | 36/0/0 | 124/0/0 | |
| W7 start, live → date | 12/0/0 | 12/0/0 | 12/0/0 | 4/0/22 | 96/0/0 | 240/0/0 | 12/0/0 | 96/0/0 | 24/0/0 | 48/0/0 | 124/0/0 | |
| W8 deactivate scheduled | 12/0/0 | 12/0/0 | 12/0/0 | 4/0/24 | 96/0/0 | 240/0/0 | 12/0/0 | 96/0/0 | 24/0/0 | 36/0/0 | 120/0/0 | |
| W9 delete scheduled | 12/0/0 | 12/0/0 | 12/0/0 | 4/0/24 | 96/0/0 | 252/0/0 | 12/0/0 | 96/0/0 | 24/0/0 | 48/0/0 | 122/0/0 | |
| D1 done publish date | 12/0/0 | 12/0/0 | 12/0/0 | 4/0/16 | 48/0/0 | 192/0/0 | 24/0/0 | 96/0/0 | 24/0/0 | 12/0/0 | 97/0/0 | 4/0/0 |
| D2 done reactivate date | 12/0/0 | 12/0/0 | 12/0/0 | 4/0/16 | 48/0/0 | 192/0/0 | 24/0/0 | 96/0/0 | 24/0/0 | 12/0/0 | 97/0/0 | 4/0/0 |
| D3 done start date | 12/0/0 | 12/0/0 | 12/0/0 | 12/0/0 | 12/0/0 | 36/0/0 | 12/0/0 | 96/0/0 | 24/0/0 | 12/0/0 | 0/0/24 | 4/0/0 |
| C1 cancelled, date moved | 12/0/0 | 12/0/0 | 12/0/0 | 12/0/0 | 12/0/0 | 36/0/0 | 12/0/0 | 96/0/0 | 24/0/0 | 12/0/0 | (none) | 4/0/0 |
| C2 cancelled, became active | 12/0/0 | 12/0/0 | 12/0/0 | 12/0/0 | 12/0/0 | 36/0/0 | 12/0/0 | 96/0/0 | 24/0/0 | 12/0/0 | (none) | 4/0/0 |
| C3 cancelled, date passed | 12/0/0 | 12/0/0 | 12/0/0 | 12/0/0 | 12/0/0 | 36/0/0 | 12/0/0 | 96/0/0 | 24/0/0 | 12/0/0 | (none) | 4/0/0 |
| **total** | 192/0/0 | 192/0/0 | 192/0/0 | 112/0/206 | 1092/0/0 | 3930/0/0 | 231/0/0 | 1536/0/0 | 504/0/0 | 468/0/0 | 1392/0/24 | 24/0/0 |

Alert titles at 160 CSS px (T084 (5)): all 24 pass, the page's title-only alerts (success D1–D3, warning C1–C3) at 113 of 129 px (88 %) in Chromium and 128 of 144 px (89 %) in Firefox, in both languages.

Live regions (as a screen reader gets them): the outcome alerts are `role=alert` with the copy.md §7 sentence word for word (D1–D3, C1–C3, EN and DE); the publish pages' rule-check status reads "Checking the rules…" / "Die Regeln werden geprüft …" while the checks run, else empty; the actions' status under "Approve" is empty on a waiting page.

**2. Defects**: none. No failing row in 192 cells.

**3. The unsure rows and their verdicts** (230 rows in 27 groups; screenshots read: W9 de 160 Firefox, D1 de 160 Chromium, W7 de 320 Firefox)

| state | measure | element | cells | verdict |
|---|---|---|---|---|
| W3, W4, W4b, W5–W9 | clipped | `p` the connection's description ("Licence to drive taxis…", "… connection of T090 sweep …") | 320 and 160, both languages and browsers (W7: 160 only in Firefox) | pass: `DescriptionLine` cuts with "…" on purpose (spec 006 R6; T080's rows "DescriptionLine truncates by design") |
| W4, W4b, W5–W9, D1, D2 | clipped | `div` "http://localhost:3000/api/connect/…" (the Links card's URL fields, two per page) | 320 and 160, both languages and browsers | pass: the URL field of the details' `LinkCard` (T028's `CopyableUrl`) cuts with "…" on purpose; "Copy link" copies the whole URL |
| D3 | focus_visible | `main button`, `main a`: no visible element matches | all 12 | pass: a done `set_start_date` shows only "Start date saved." (`doneShowsUrls('set_start_date')` is false, T080), so `main` holds no control |

Observations, not defects (no row failed; for T097/T098 to know): at 160 CSS px the narrow block of `index.css` breaks German words without a hyphen ("Anfragel|ink", "Link kopier|en", "veröffen|tlichen", "Veröffentlic|ht"), as spec 008's narrow rule intends for every page (baseline); the subtitle of a done request still says "… · läuft um 12:23 Uhr ab" / "expires at 12:23" with the past expiry time (spec 007's `subtitleOf()`, baseline, outside FR-074's nine items).

**4. Cited rows** (English in Chromium, layout): §2.1 `#### T080` (W1–W9, W4b, D1–D4, C1–C3: the texts in EN and DE at 1440; horizontal scroll, off-screen/clipped, `h1` count and the first control's ring at 320 and 160) and §2.2 `#### T082` (V12.5 publish, reactivate, setScheduled, setLive; V12.7; V12.7b; T080's done requests read again, EN and DE at 1440). This sweep also ran the English Chromium cells (48 of the 192) and found them the same.

#### T091, sweep of US5's selection (S4 "Selection", "Selection bar", "Delete", "After a deletion", S5, C3; FR-038–FR-044, FR-072, FR-081, SC-009, W16, W17; report only)

T085's harness (`<SP>/sweep/measure.mjs`, `playwright-core` 1.65): Chromium 156 (`/usr/bin/chromium`) and Firefox (build 1572), headless, side by side. Every state ran over the full matrix: en and de × 1440, 320 and 160 CSS px viewports (heights 900, 720, 450) × Chromium and Firefox: 144 cells, 10,616 CSV rows, 905 s of wall time (Chromium 10.3 s per cell, Firefox 12.3 s). The English Chromium cells were run too (they add contrast, label widths and focus, which T048–T051 didn't measure). The main installation (backend 3016 on `konnekt_db_010_p12`, fake EUDIPLO, worker off, restore time 300 s; Vite 5180), signed in as `p10-alice`, zone Europe/Berlin. Script `<SP>/sweep/T091/sweep.mjs`; output `<SP>/sweep/T091/out/` (`T091.csv`, `T091-summary.md`, `shots/`).

Measures: the harness's ten, scoped to the page (the overview states) or to the open dialog (the dialog states), plus the sweep's own rows:
- `select_all` (the select-all's `checked`/`indeterminate`: mixed for one and some, checked for all), `bar_count` ("<n> selected" / "<n> ausgewählt"), `toolbar_hidden` (the search toolbar hidden while selecting, FR-039);
- `bar_layout` (the bar's box; buttons beside the count at 1440, either at 320/160 per W16);
- `dialog_lines`, `dialog_warnings` (one line per selected row; one warning per active and scheduled row);
- `buttons_in_view` (W12; at 160 the dialog scrolls as a whole, T049 (3));
- `no_retry`, `focus_after_409` (T084 (3): after `409 selection_changed` no confirm button, the focus on "Keep connections");
- `retry_label` (another failure keeps "Try again"), `busy_disabled` (both buttons `aria-disabled` while deleting);
- `after_delete` (focus on the h1, toolbar back), `toast_in_view`;
- `banner_above_bar` (W17: the local-drafts banner 16 px above the bar), `device_only_row` (FR-081: no checkbox for the device-only connection);
- `alert_title` (T084 (5), at 160 CSS px: each visible `.kern-alert .kern-title` against its alert's content width).

Data (through the API, found again by name on a rerun; left standing for T098's rerun):

| Rows | What |
|---|---|
| `T091 sweep base live` `b63931c0-a097-480a-a597-481843e90eb1`, `… base scheduled` `4a7eb4b7-0e47-4811-a93d-ac5628a2b12b`, `… base deactivated` `a003bd49-4293-47c1-bdd3-ff68365f62c8`, `… base draft` `f28469f1-934c-4ff0-b4b2-33218ef1da15` | the four statuses; the overview filtered by "T091 sweep base" |
| `T091 sweep thirty 01 live` … `T091 sweep thirty 30 draft` (01–02 live, 03–04 scheduled, 05 deactivated, 06–30 drafts) | the 30-row dialog; filtered by "T091 sweep thirty" |
| `T091 sweep <uid> live`, `… <uid> draft` (per cell, 24 rows) | the `409`: the live row deactivated through the page's own session while the dialog was open (T051's V8.5); deleted by the sweep's teardown |
| `T091 sweep <uid> a draft`, `… <uid> b draft` (per cell, 24 rows) | the bulk toast: deleted through the dialog (restorable until the 300 s passed) |

How each state was reached: the overview filtered by the prefix (`[role=search] input[type=text]`), then **select-one** the live row ticked; **select-some** the draft and the deactivated row; **select-all** the select-all; **selection-bar** as some, the bar alone in scope; **dialog-two** some, then the bar's "Delete"; **dialog-warnings** all four, "Delete" (4 lines, 2 warnings); **dialog-thirty** the 30 rows, "Delete", the region (and, at 160, the dialog) scrolled to its end; **dialog-changed** the real `409 selection_changed` and the quiet reload awaited; **dialog-failed** `POST /form-connections/deletions` answered 500 by `failNext` (error ID `T091-xxxxxxxx-fake`); **dialog-busy** that POST held by a waiting `page.route()`; **bulk-toast** two fresh drafts deleted, the toast's 6 s timer stretched so it stays while measured; **banner-bar** a device-only connection made in the create flow (name typed, 1.6 s, away with `beforeunload` accepted; T051's V8.7), then the overview with two rows ticked.

1. Counts per state × measure (pass/fail/unsure; 12 cells each)

| state | h_scroll | h1 | lang | clipped | label_width | contrast | live_region | forbidden | durations | focus_visible | alert_title | own rows |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| select-one | 12/0/0 | 12/0/0 | 12/0/0 | 4/0/24 | 288/0/0 | 644/0/0 | 48/0/0 | 120/0/0 | 72/0/0 | 120/0/0 | 4/0/0 | select_all, bar_count, toolbar_hidden 36/0/0 |
| select-some | 12/0/0 | 12/0/0 | 12/0/0 | 4/0/24 | 288/0/0 | 644/0/0 | 48/0/0 | 120/0/0 | 72/0/0 | 120/0/0 | 4/0/0 | 36/0/0 |
| select-all | 12/0/0 | 12/0/0 | 12/0/0 | 4/0/24 | 288/0/0 | 644/0/0 | 48/0/0 | 120/0/0 | 72/0/0 | 120/0/0 | 4/0/0 | 36/0/0 |
| selection-bar | 12/0/0 | 12/0/0 | 12/0/0 | 12/0/0 | 48/0/0 | 48/0/0 | 48/0/0 | 120/0/0 | 24/0/0 | 48/0/0 | 4/0/0 | bar_layout 12/0/0 |
| dialog-two | 12/0/0 | 12/0/0 | 12/0/0 | 12/0/0 | 60/0/0 | 132/0/0 | 36/0/0 | 120/0/0 | 36/0/0 | 72/0/0 | 4/0/0 | lines, warnings 24/0/0 |
| dialog-warnings | 12/0/0 | 12/0/0 | 12/0/0 | 12/0/0 | 60/0/0 | 204/0/0 | 36/0/0 | 120/0/0 | 36/0/0 | 80/0/0 | 4/0/0 | 24/0/0 |
| dialog-thirty | 12/0/0 | 12/0/0 | 12/0/0 | 12/0/0 | 60/0/0 | 540/0/0 | 36/0/0 | 120/0/0 | 36/0/0 | 88/0/0 | 4/0/0 | lines, warnings, buttons_in_view 36/0/0 |
| dialog-changed | 12/0/0 | 12/0/0 | 12/0/0 | 12/0/0 | 60/0/0 | 168/0/0 | 60/0/0 | 120/0/0 | 36/0/0 | 72/0/0 | 2/**2**/0 | lines, warnings 24/0/0; no_retry 0/**12**/0; focus_after_409 0/**12**/0 |
| dialog-failed | 12/0/0 | 12/0/0 | 12/0/0 | 12/0/0 | 60/0/0 | 180/0/0 | 60/0/0 | 120/0/0 | 36/0/0 | 72/0/0 | 2/**2**/0 | lines, warnings, retry_label 36/0/0 |
| dialog-busy | 12/0/0 | 12/0/0 | 12/0/0 | 12/0/0 | 60/0/0 | 72/0/0 | 36/0/0 | 120/0/0 | 36/0/0 | 72/0/0 | 4/0/0 | lines, warnings, busy_disabled 36/0/0 |
| bulk-toast | 12/0/0 | 12/0/0 | 12/0/0 | 12/0/0 | 120/0/0 | 260/0/0 | 48/0/0 | 120/0/0 | 72/0/0 | 24/0/0 | 4/0/0 | after_delete, toast_in_view 24/0/0 |
| banner-bar | 12/0/0 | 12/0/0 | 12/0/0 | 4/0/24 | 336/0/0 | 716/0/0 | 48/0/0 | 120/0/0 | 72/0/0 | 96/0/0 | 4/0/0 | banner_above_bar, device_only_row 24/0/0 |

Totals: 10,616 rows; 28 fail (4 groups below), 96 unsure (one group, verdict below).

Live regions (both browsers, three widths): the bar's `p[role=status]` reads "1 / 2 / 4 / 30 selected" ("… ausgewählt") and stays in the page empty and `sr-only` while nothing is selected; the dialog's `role="alert"` reads "Couldn’t delete Nothing was deleted: “T091 sweep <uid> live” was deleted or changed in the meantime." / "Die Anbindungen konnten nicht gelöscht werden Nichts wurde gelöscht: „…“ wurde inzwischen gelöscht oder geändert." after the `409`, and "Couldn’t delete Something went wrong on our side. … Error ID: T091-…-fake" / "… Fehler-ID: …" after the 500; the toast region "2 connections deleted. Undo" / "2 Anbindungen gelöscht. Rückgängig". The busy state's "Deleting…" / "Wird gelöscht …" is the button's label, not a live region (as T049 built it). The FR-076 texts (the harness's list plus "PDF herunterladen", "Entwurfsänderungen") are absent in every cell.

Alert titles at 160 CSS px (T084 (5)): only the bulk dialog's failure alert (`ConfirmDialog`'s `KernAlert`) shows one: Chromium 41.0 of 89.0 px (46 %), Firefox 56.0 of 104.0 px (54 %), the same for the `409` and the 500 and in both languages (Chromium's dialog loses 15 px to its classic scrollbar). No other state shows an alert.

2. Defects

| state | language | width | browser | measure | element | value | limit | suspected file |
|---|---|---|---|---|---|---|---|---|
| dialog-changed | en, de | 1440, 320, 160 | chromium, firefox | no_retry | dialog footer `.kern-btn--primary` | "Try again" / "Erneut versuchen" (12 cells) | hidden (T084 (3), S4 amended) | `frontend/src/pages/FormConnectionList/BulkDeleteDialog.tsx`, `frontend/src/components/ConfirmDialog/index.tsx` (a prop to hide the confirm button); known, T098 builds it |
| dialog-changed | en, de | 1440, 320, 160 | chromium, firefox | focus_after_409 | `document.activeElement` | button "Try again" / "Erneut versuchen" (12 cells) | "Keep connections" / "Anbindungen behalten" (T084 (3)) | the same; known |
| dialog-changed | en, de | 160 | chromium | alert_title | `.kern-alert .kern-title` "Couldn’t delete" / "Die Anbindungen konnten nicht gelöscht werden" | 41.0 of 89.0 px (46 %) | ≥ 50 % | `frontend/src/index.css` (T084 (5)'s narrow rule); the alert is `ConfirmDialog`'s |
| dialog-failed | en, de | 160 | chromium | alert_title | the same | 41.0 of 89.0 px (46 %) | ≥ 50 % | the same |

Beside the sweep's measures, for T097 (the German review), not T098: the bulk dialog's German after `409` reads "… wurde inzwischen gelöscht oder geändert." (`frontend/src/pages/FormConnectionList/constants.ts`, `BULK_DELETE_COPY.de.changed`), and the server's `selection_changed` German "Nichts wurde gelöscht: Eine Anbindung wurde inzwischen gelöscht oder geändert." (`backend/app/services/deletions.py`), where `contracts/copy.md` §4 and §8 say "in der Zwischenzeit". A third place of T086's "in the meantime written two ways".

3. Unsure rows and verdicts

| state | measure | element | cells | verdict |
|---|---|---|---|---|
| select-one, select-some, select-all, banner-bar | clipped | the rows' descriptions ("live / scheduled / deactivated connection of T091 sweep base"), `text-overflow: ellipsis` | en, de × 320, 160 × chromium, firefox (96 rows) | pass: the description cut to one line with "…" is spec 008's (`FormConnectionRow`, FR-029b), intended |

4. Cited rows (English in Chromium, layout): §2.1 `#### T048` (the checkboxes, the select-all's three states, the bar at 1440/320/160, the banner with the bar, focus rings), `#### T050` (the local-drafts banner 1m and 1n at the three widths, in Firefox), `#### T049` (the bulk dialog: two rows, four statuses, 30 rows scrolled, busy, a 500 with its error ID, the `409`, the toasts; narrow rows at 320/160), and §2.2 `#### T051` (walk V8: V8.1–V8.7 at 1440, English and German). The sweep reran those cells too; its only finding in them is the known `409` retry (cited by T051 as built, decided by T084 (3)).

Rerun (T098): `node <SP>/sweep/T091/sweep.mjs --states dialog-changed,dialog-failed --out rerun` (all cells), or with `--cells en-160-chromium,de-160-chromium` for the alert titles; the script finds the shared rows by name and makes the `409`'s rows per cell.

#### T092: sweep of US6's documents list (S8, the documents' order; W13, F22)

Items: FR-072, SC-009, W13, F22; S8 "The list's order", "Dragging", "Without dragging"; copy.md §5 (the ⋯'s name, "Move up"/"Move down", the announcement). Harness: T085's `measure.mjs` (`playwright-core` 1.65), script `<SP>/sweep/T092/sweep.mjs` with `lib.mjs`, output `<SP>/sweep/T092/out/` (`T092.csv`, `T092-summary.md`, `shots/`). Browsers: Chromium 156 (`/usr/bin/chromium`) and Playwright's Firefox (`firefox-1572`), headless, side by side. Widths: 1440, 320 and 160 CSS px viewports (heights 900, 720, 450). Languages: English and German (the stored choice of `LanguageProvider`). The full matrix: 8 states × 12 cells = **96 cells, 21,425 rows**, 456 s (Chromium 8.7 s, Firefox 9.3 s per cell); one cell (`moved` de 320 Firefox) stopped on a timeout and was rerun alone (`<SP>/sweep/T092/rerun-moved1/`: passes; a second rerun timed out again, see the unsure rows). Measures: the harness's ten (scope `body`) plus the sweep's own: `list` (the order, and the ⋯ buttons: one per row with two documents or more, none with one), `menu` (the open menu's entries; its box inside the viewport), `drag` (while the drag is held: the dragged row hidden, the drop line's box, colour and place inside the list's area, the faded copy inside the card, 8 px inside the rows' right edge (T059a), opacity 0.85, its name; after the drop: the focus on the moved row's ⋯ without a ring), `drop_durations` (the computed transitions and animations of the list's area and everything in it in the release's frame and the two frames after it, once without and once with reduced motion), `add_button` ("Add document"'s label lines inside its box, the coordinator's question from T093), `alert_title` (T084 (5), at 160 CSS px).

Three rows (T084 (6)): `page.route()` answers `GET /api/document-types` with the catalog plus a copy of `pid` under the key `t092doc`, named "T092 document" / "T092-Dokument" by the request's `Accept-Language`, in a new connection's documents step (`/form-connections/new`, name "T092 sweep create flow", "Choose documents", then Personal ID, Driving licence, T092 document through "Add document"). Never saved: the autosave wrote only the local draft of the cell's context, which was thrown away with it. The edit flow: `T092 sweep base live` (`9fa233d1-899c-4b1d-9b5c-8266ad612d82`, published, made through the API from `P3 seed live`'s documents, stored Personal ID, Driving licence; its edit flow opened and left, never saved; kept for reruns). Main installation (backend 3016, Vite 5180, `konnekt_db_010_p12`, `p10-alice`).

States: `three` (pid, mdl, t092doc; T092 document open); `menu-first`, `menu-middle`, `menu-last` (the ⋯ of Personal ID, Driving licence, T092 document opened by keyboard: focus, Enter; the ⋯ scrolled to the viewport's middle first); `single` (Driving licence only); `dragging` (Personal ID pressed and moved over the gap between Driving licence and T092 document, the button held through every measure, so the harness's `durations` with and without reduced motion read the drag itself); `moved` (Personal ID dropped there without reduced motion, then, with reduced motion, Driving licence dropped below the last row: pid, t092doc, mdl, "“Driving licence” moved to position 3 of 3."); `edit-flow` (the documents step of `T092 sweep base live`).

**1. Counts per state × measure** (pass/fail/unsure; 12 cells each, `moved` 11 in the full run plus the rerun cell)

| state | h_scroll | h1 | lang | clipped | label_width | contrast | live_region | forbidden | durations | focus_visible | list | menu | drag | drop_durations | add_button | alert_title |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| three | 12/0/0 | 12/0/0 | 12/0/0 | 4/0/15 | 600/0/0 | 1148/0/0 | 36/0/0 | 120/0/0 | 528/0/0 | 216/0/0 | 24/0/0 | | | | 8/**4**/0 | 4/0/0 |
| menu-first | 12/0/0 | 12/0/0 | 12/0/0 | 4/0/15 | 618/0/0 | 1177/0/0 | 36/0/0 | 120/0/0 | 546/0/0 | 24/0/0 | | 48/0/0 | | | 8/**4**/0 | 4/0/0 |
| menu-middle | 12/0/0 | 12/0/0 | 12/0/0 | 4/0/15 | 630/0/0 | 1195/0/0 | 36/0/0 | 120/0/0 | 558/0/0 | 48/0/0 | | 48/0/0 | | | 8/**4**/0 | 4/0/0 |
| menu-last | 12/0/0 | 12/0/0 | 12/0/0 | 4/0/15 | 612/0/0 | 1180/0/0 | 36/0/0 | 120/0/0 | 540/0/0 | 24/0/0 | | 48/0/0 | | | 8/**4**/0 | 4/0/0 |
| single | 12/0/0 | 12/0/0 | 12/0/0 | 4/0/8 | 636/0/0 | 1260/0/0 | 36/0/0 | 120/0/0 | 588/0/0 | 48/0/0 | 24/0/0 | | | | 8/**4**/0 | 4/0/0 |
| dragging | 12/0/0 | 12/0/0 | 12/0/0 | 4/0/16 | 576/0/0 | 1125/0/0 | 36/0/0 | 120/0/0 | 516/0/0 | (none: a click would end the drag) | | | 84/0/0 | | 8/**4**/0 | 4/0/0 |
| moved | 11/0/0 | 11/0/0 | 11/0/0 | 4/0/14 | 550/0/0 | 1063/0/0 | 55/0/0 | 110/0/0 | 484/0/0 | 198/0/0 | 22/0/0 | | 11/0/0 | 77/0/0 | 7/**4**/0 | 4/0/0 |
| moved, de 320 ff (rerun) | 1/0/0 | 1/0/0 | 1/0/0 | 0/0/1 | 50/0/0 | 97/0/0 | 5/0/0 | 10/0/0 | 44/0/0 | 18/0/0 | 2/0/0 | | 1/0/0 | 7/0/0 | 1/0/0 | |
| edit-flow | 12/0/0 | 12/0/0 | 12/0/0 | 4/0/11 | 636/0/0 | 1184/0/0 | 36/0/0 | 120/0/0 | 552/0/0 | 144/0/0 | 24/0/0 | | | | 8/**4**/0 | 4/0/0 |

`durations` while the drag is held: without reduced motion only the standing 0.15 s colour and opacity transitions of the trash, the ⋯ and the panel's checkboxes (≤ 0.5 s); with reduced motion "(reduce) (page): no transition or animation" in all 12 cells (F22). `drop_durations` in the release's frames: without reduced motion the same standing 0.15 s transitions of the rows' trash and ⋯ buttons (nothing on the rows, the line or the copy); with reduced motion "no transition or animation in the list area" in all 12 cells (F22: the drop just updates the list). Neither the drop line nor the copy carries a transition at any moment measured. The live region `#documents-move-status` read "“Driving licence” moved to position 3 of 3." / "„Führerschein“ auf Position 3 von 3 verschoben." in every `moved` cell (copy.md §5, word for word); the focus after the mouse drop was on "Move Driving licence" / "Führerschein verschieben" with `:focus-visible` false in every cell. The menus' entries: first row "Move down" / "Nach unten", middle row both, last row "Move up" / "Nach oben" (FR-047), each menu's box inside the viewport. The drag at every width: the line 8 px high with its 2 px rgb(29, 86, 240) bar across the rows' width at child 2 inside the list's area; the copy inside the card, its right edge 8 px inside the rows' (1440: 206 px; 320: 215 Chromium, 230 Firefox; 160: 87 Chromium, 102 Firefox), opacity 0.85, 32 px high. Alert titles at 160 CSS px: no `.kern-alert` is visible in any of the 8 states (32 cells "(none visible)").

**2. Defects**

| state | language | width | browser | measure | element | value | limit | suspected file |
|---|---|---|---|---|---|---|---|---|
| all 8 states | en, de | 160 | Chromium, Firefox | add_button | `button#add-document` ("Add document" / "Dokument hinzufügen", the dashed look once a document is added) | the label wraps to 2 lines (en, de Firefox) or 3 lines (de Chromium: "Dokument" / "hinzufüge" / "n") in the fixed 36 px box: text y 383–448 in the box 398–434 (de Chromium), 205–246 in 207–243 (Firefox); the words sit over the dashed border above and below it (T093's observation confirmed). The same with no document added (the filled look, measured outside the states: 2 lines, 42–50 px of text in 36 px). The harness's `clipped` and `label_width` don't see it (no clipping ancestor; only the width is compared) | the label inside its box | `frontend/src/pages/FormConnectionEditor/DocumentsStep/SearchCard.tsx` (`BUTTON`'s fixed `h-36` with `whitespace-nowrap`, which `index.css`'s narrow block turns into `white-space: normal` / `overflow-wrap: anywhere` below 320 CSS px; e.g. `min-h-36` / `narrow:h-auto`) |
| menu-first, menu-middle, menu-last | de | 160 | Chromium | (screenshot, entry heights) | `[role=menu] [role=menuitem]` "Nach unten" | 3 lines, 88 px high, the word broken inside: "Nach" / "unte" / "n" (the menu 97 px wide in Chromium, whose page is 145 px wide beside its scrollbar; Firefox's 112 px menu keeps it on 2 lines, 64 px; English "Move down" 2 lines in both) | words whole (FR-072 "usable") | baseline: `frontend/src/components/ActionMenu/index.tsx` (the entry's text column at 160 CSS px) with `index.css`'s narrow block (`overflow-wrap: anywhere`) |
| edit-flow | en, de | 320 | Chromium, Firefox | clipped (unsure → defect by T084 (4)) | `nav > span "T092 sweep base live"` (TopBar's "Where you are" name) | 27 px (en ch), 30 px (de ch), 42 px (en ff), 45 px (de ff) of 135 px, cut with "…" | ≥ min(own width, 96 px) (design-notes §4.2 T084 (4)) | `frontend/src/components/TopBar/index.tsx` (T084 (4), T098; T088 measures it) |

**3. Unsure rows and verdicts**

- `clipped`, the rows' names at 160 CSS px ("Personal ID", "Driving licence", "T092 document", "Personalausweis", "Führerschein", "T092-Dokument"; all states, both languages and browsers): ellipsis, `truncate` by design (T058's W16 rows) → pass.
- `clipped`, `nav > span "T092 sweep create flow"` at 320 (create-flow states, 4 cells each): ellipsis, 108–123 px shown ≥ 96 px (T084 (4)) → pass.
- `clipped`, `nav > span "T092 sweep base live"` at 320 (edit-flow) → defect (table 2).
- `error`, `moved` de 320 Firefox (full run, and 1 of 2 reruns): the first drag's drop line didn't appear within 5 s (the order stayed pid, mdl, t092doc; screenshot `rerun-moved2/shots/moved-de-320-firefox-error.png`), while `dragging` passed in all 12 cells and the rerun `rerun-moved1` passed every row of the cell → pass as a scripted-press timing limit (UNCERTAIN: not shown to be the app's); T098 may rerun it.
- First run (`<SP>/sweep/T092/out-run1/`, before `openMoveMenu` scrolled the ⋯ into view): `menu-middle` de 160 Chromium's menu at y 361–533 of 450, three times in a row: the bare `focus()` left the ⋯ at y ≈ 567, below the fold, and the menu opened up from it; with the ⋯ on screen (the final run, and `dbg-menu.mjs` at ⋯ y 320, 360, 400) the menu lies inside the viewport → pass (a script artefact; a keyboard user's Tab scrolls the ⋯ into view).

**4. Cited rows** (English in Chromium at 1440, 320, 160, not judged anew; the sweep's English Chromium cells add contrast, label widths, focus and durations): design-notes §2.1 `#### T058` (the ⋯ and its menu at the three widths, the announcement, the one-document row, the edit flow), `#### T059` (the drag's line and copy at 1440 (R1–R3), the narrow drags, reduced motion while dragging, touch), §2.2 `#### T061` (walk V9: the order, the focus, the region, both flows, V9.8 reduced motion); T058's and T061's "no middle row" (V9.4) is now measured here with three rows (T084 (6)).

#### T093, US9's grouped data item panel (T085's harness, report only)

Items FR-072, SC-009, W18 (screen S8 "Data groups"; copy.md §5; the catalog's `FIELD_GROUPS` through `GET /api/document-types`). Measured 2026-11-12 on the main installation (backend 3016 against `konnekt_db_010_p12` with the fake EUDIPLO and the worker off, Vite 5180), account `p10-alice`, by `<SP>/sweep/T093/sweep.mjs` on `<SP>/sweep/measure.mjs`. The browsers were Chromium 156 (`/usr/bin/chromium`) and Firefox (Playwright's build for `playwright-core` 1.65), in English and German (the stored language choice). The viewports were 1440 × 900, 320 × 720 and 160 × 450 CSS px, in the Europe/Berlin time zone. **The full matrix ran** (English in Chromium included, beside the cited rows): 6 states × 12 cells = 72 cells, 11,356 rows, 586 s (Chromium 12.2 s, Firefox 16.1 s per cell on average). The state `group-question` was then rerun alone with one more check, `dialog_title`: 12 cells, 472 rows, 79 s, in `<SP>/sweep/T093/out-question/`. Its row below is from that rerun, and its other measures equal the first run's.

Measures: the harness's ten (horizontal_scroll, clipped, h1_count, focus_visible, contrast, durations, label_width, live_region, lang, forbidden_text; FORBIDDEN plus "PDF herunterladen" and "Entwurfsänderungen") and four checks of our own:
- `group_split`: per group, its `li` is one box (`getClientRects()`), its heading's left edge equals its last data item's left edge minus the list's indent (24 px, 12 px at 160 CSS px) within 1 px, and no data item lies above its heading.
- `columns`: the distinct left edges of the group headings, 3 at 1440 and 1 at 320 and 160.
- `dialog_title`: the question's `h2` against copy.md §5.
- `alert_title`: T084 (5). At 160 CSS px, each visible `.kern-alert .kern-title` against its alert's content width; a title under 50 % is a defect.

The element measures were scoped to `#document-detail` (the panel) and, in the question, to the modal dialog. Output: `<SP>/sweep/T093/out/` and `<SP>/sweep/T093/out-question/` (`T093.csv`, `T093-summary.md`, `shots/`).

Data made through the API from the content of `P3 seed live` (its documents: Personal ID family_name, given_name, birthdate, address_locality; Driving licence expiry_date, document_number, driving_privileges; its Standard rules, Rule 01 on `pid.birthdate` and Rule 02 on `mdl.driving_privileges`). Both rows are kept for reruns and found by name:
- `T093 sweep draft` (`e0e9ce17-8f81-40f6-ac72-e5c72aa3a89b`): a stored draft at the documents step.
- `T093 sweep live` (`b6a39565-b30f-4c30-a839-a70a629d727e`): a published connection.

Nothing was saved: every click changed only the editor's state in the cell's own browser context, which was thrown away afterwards. The states:
- `mdl-panel`: the draft with the Driving licence shown as stored (Document and Licence mixed, the other five groups clear).
- `pid-panel`: the Personal ID shown as stored (Name, Birth and Address mixed).
- `mixed-group`: the Driving licence with the first data item of the clear Appearance group ticked, so that the group is mixed.
- `ticked-group`: the Driving licence with the mixed Licence ticked; all 3 of its data items are chosen and no question opens.
- `group-question`: the ticked Licence cleared, which opens the question naming Rule 02.
- `edit-panel`: the edit flow of the live connection ("Choose documents" / "Dokumente auswählen") with the Personal ID's grouped panel.

Focus was measured on:
- the panel states: "All data items", every group's box (7 or 5), two data items and the pager's two buttons;
- `mixed-group` and `ticked-group`: the group's box and 3 of its data items;
- the question: every focusable element (close, "Cancel", "Stop requesting").

1. Counts per state × measure (pass/fail/unsure; every state 12 cells; horizontal_scroll, h1_count, lang and clipped 12/0/0 everywhere, left out)

| state | label_width | contrast | live_region | forbidden_text | durations | focus_visible | group_split | columns | dialog_title | alert_title |
|---|---|---|---|---|---|---|---|---|---|---|
| mdl-panel | 492/0/0 | 972/0/0 | 36/0/0 | 120/0/0 | 480/0/0 | 120/0/0 | 84/0/0 | 12/0/0 | – | 4/0/0 |
| pid-panel | 396/0/0 | 788/0/0 | 36/0/0 | 120/0/0 | 384/0/0 | 120/0/0 | 60/0/0 | 12/0/0 | – | 4/0/0 |
| mixed-group | 492/0/0 | 972/0/0 | 36/0/0 | 120/0/0 | 480/0/0 | 48/0/0 | 84/0/0 | 12/0/0 | – | 4/0/0 |
| ticked-group | 492/0/0 | 972/0/0 | 36/0/0 | 120/0/0 | 480/0/0 | 48/0/0 | 84/0/0 | 12/0/0 | – | 4/0/0 |
| group-question | 60/0/0 | 84/0/0 | 36/0/0 | 120/0/0 | 36/0/0 | 72/0/0 | – | – | 6/**6**/0 | 4/0/0 |
| edit-panel | 396/0/0 | 788/0/0 | 36/0/0 | 120/0/0 | 384/0/0 | 120/0/0 | 60/0/0 | 12/0/0 | – | 4/0/0 |

The panel's flow:
- **1440:** 3 columns in every panel cell. The Driving licence has Name and Birth, then Address and Document, then Licence, Appearance and Other details. The Personal ID has Name and Birth, then Address, then Document and Other details.
- **320 and 160:** one column.
- **Groups:** none split, in either language or browser.
- **Headings:** no group heading clipped. The clipped measure saw every text of the panel, 42 on the Driving licence and 34 on the Personal ID, including the German "Weitere Angaben", "Fahrerlaubnis" and "Aussehen" at 160.

Live regions: only the editor's empty `[status]` regions and the publish dialog's unrendered ones. None of these states announces anything.

Alert titles at 160 CSS px: no `.kern-alert` is visible in any of the 24 cells at 160.

2. Defects

| state | language | width | browser | measure | element | value | limit | suspected file |
|---|---|---|---|---|---|---|---|---|
| group-question | de | 1440, 320, 160 | chromium, firefox | dialog_title | `dialog:modal h2` | „Felder der Gruppe „Fahrerlaubnis“ aus Führerschein nicht mehr anfordern?“ | „Daten der Gruppe „Fahrerlaubnis“ aus „Führerschein“ nicht mehr anfordern?“ (copy.md §5 as T097 amended it) | `frontend/src/pages/FormConnectionEditor/DocumentsStep/constants.ts` (`groupTitle`, German, line 173) and its test `DocumentsStep/utils.test.ts` line 770 |

No other defect.

3. Unsure rows: none. Observations after reading the screenshots (no measure failed):
- At 160 CSS px, the narrow block (`index.css`, `overflow-wrap: anywhere`) breaks words of the panel's header and pager across lines: "Führerschei|n", and "Dok|ume|nt 2 von 2" in Firefox. Verdict: pass. The narrow block intends this, nothing is hidden, and the header and pager are spec 008's (baseline).
- In the question at 160 × 450, the title fills the dialog, which scrolls to its buttons. Verdict: pass, as T074 found (the dialog is the scroller).

4. Cited rows (English in Chromium at the three widths): §2.1 "T074 — the grouped data item panel" and §2.2 "T076: walk V11, data groups":
- the 3 columns and the groups' order and placement at 1440;
- one column, no scroll, nothing clipped or off-screen and the focus rings at 320 and 160 for the draft's and the edit flow's Personal ID, the Driving licence and the question;
- V11.1 to V11.5, both languages at 1440.

This sweep also ran those cells, with no defect.

#### T094: the toasts' time (quickstart V13, FR-082)

**Toasts measured** (4): the overview's deletion toast "“<name>” deleted." / "Undo" (a draft deleted from its row); the documents step's "<document> removed." / "Undo" ("Remove Personal ID?" answered "Remove document"); the rules step's "Rule 01 deleted." / "Undo" (a rule deleted through its menu); and the failed save's "Couldn’t save. Check your internet connection and try again." / "Try again" (the rules step's "Save and exit" sends `PUT /api/form-connections/<id>/draft` when clicked; every such request was aborted with the harness's `failNext(…, 'abort', {method: 'PUT', times: 'always'})`). **Conditions** (3): left alone (the pointer at (3, 3), the focus elsewhere); the pointer on the toast; the keyboard focus on its action (Shift, then `focus()`; `:focus-visible` true in every run). **Where:** Chromium 156 (`/usr/bin/chromium`) and Firefox (Playwright 1.65's firefox-1572), viewport 1440 × 900 CSS px, English; German once per toast (left alone) to check the same timer. The main installation (backend 3016, Vite 5180), user `p10-alice`. Each measurement ran twice in its cell.

**How it was timed:** inside the page. A `MutationObserver` on the document stamped the toast's appearance and removal (`.shadow-toast`, `ToastMessage`'s root) with `performance.now()`. Capturing `pointerover`/`pointerout`/`focusin`/`focusout` listeners stamped the moment the pointer or the focus entered or left the toast. The stamps were read back afterwards: Node only waited. The limits: left alone, removal 6000 ± 300 ms after the toast appeared; held, still present 9000 ms after it appeared; after the hold, removal 6000 ± 300 ms after the pointer or the focus left.

**Data:** drafts made through the API for each cell, named `T094 sweep <uid> del1|del2|docs|rules|retry` (with the documents of `P3 seed live`: Personal ID and Driving licence; the rules drafts with its Rule 01 and Rule 02). The deletion runs deleted their own drafts, and the sweep's teardown deleted the rest. None is left in the list (52 `T094 sweep` rows in all, every one deleted). Script: `<SP>/sweep/T094/sweep.mjs`; output: `<SP>/sweep/T094/out/` (CSV, summary, 2 screenshots); rerun: `<SP>/sweep/T094/out-rerun/`. Run time 651 s for 32 cells, with T091–T093 running at the same time.

**1. Measured times** (ms; run 1 / run 2)

| toast | condition | Chromium | Firefox | limit | result |
|---|---|---|---|---|---|
| deletion | alone (appear → gone) | 6087 / 6069 | 6124 / 6066 | 6000 ± 300 | pass |
| deletion | alone, German | 6065 / 6013 | 6053 / 6067 | 6000 ± 300 | pass |
| deletion | pointer: present at 9 s | 9045 / 9083 present | 9036 / 9056 present | present after 9000 | pass |
| deletion | pointer: leave → gone | 6120 / 6096 | **6307** / 6099 (rerun: 6056 / 6096) | 6000 ± 300 | pass after the rerun (see 3) |
| deletion | focus: present at 9 s | 9059 / 9008 present | 9060 / 9045 present | present after 9000 | pass |
| deletion | focus: leave → gone | 6026 / 6037 | 6188 / 6052 | 6000 ± 300 | pass |
| documents "Undo" | alone | 6229 / 6180 | 6127 / 6076 | 6000 ± 300 | pass |
| documents "Undo" | alone, German | 6105 / 6054 | 6162 / 6058 | 6000 ± 300 | pass |
| documents "Undo" | pointer: present at 9 s | 9032 / 9037 present | 9070 / 9019 present | present after 9000 | pass |
| documents "Undo" | pointer: leave → gone | 6210 / 6140 | **6316** / 6241 (rerun: 6118 / 6036) | 6000 ± 300 | pass after the rerun (see 3) |
| documents "Undo" | focus: present at 9 s | 9038 / 9066 present | 9067 / 9040 present | present after 9000 | pass |
| documents "Undo" | focus: leave → gone | 6162 / 6133 | 6214 / 6061 | 6000 ± 300 | pass |
| rules "Undo" | alone | 6078 / 6042 | 6130 / 6099 | 6000 ± 300 | pass |
| rules "Undo" | alone, German | 6093 / 6099 | 6116 / 6023 | 6000 ± 300 | pass |
| rules "Undo" | pointer: present at 9 s | 9032 / 9021 present | 9056 / 9060 present | present after 9000 | pass |
| rules "Undo" | pointer: leave → gone | 6114 / 6159 | 6240 / 6137 | 6000 ± 300 | pass |
| rules "Undo" | focus: present at 9 s | 9087 / 9017 present | 9071 / 9066 present | present after 9000 | pass |
| rules "Undo" | focus: leave → gone | 6092 / 6117 | 6133 / 6089 | 6000 ± 300 | pass |
| save "Try again" | alone | 6171 / 6094 | 6067 / 6105 | 6000 ± 300 | pass |
| save "Try again" | alone, German | 6052 / 6056 | 6163 / 6130 | 6000 ± 300 | pass |
| save "Try again" | pointer: present at 9 s | 9037 / 9020 present | 9058 / 9015 present | present after 9000 | pass |
| save "Try again" | pointer: leave → gone | 6103 / 6078 | 6115 / 6040 | 6000 ± 300 | pass |
| save "Try again" | focus: present at 9 s | 9019 / 9011 present | 9096 / 9068 present | present after 9000 | pass |
| save "Try again" | focus: leave → gone | 6076 / 6066 | 6153 / 6084 | 6000 ± 300 | pass |
| rules "Undo" | Ctrl+Z after the toast was gone (all 8 rules cells × 2 runs, both browsers, English and German) | Rule menus 2 → 1 → 2 every time, no toast | the same | the rule comes back | pass (16 / 16) |

The pointer or the focus reached the toast 62–587 ms after it appeared, always before its 6 s ran out. No left-alone run saw the pointer or the focus enter the toast.

Counts: 32 cells; 208 CSV rows; 64 time measurements (62 pass; 2 over the limit by 7 and 16 ms, both passing on a rerun of their two cells, with 4 more measurements); 48 "held" rows pass; 16 Ctrl+Z rows pass; 0 `error` rows; 0 `page_error` rows.

**2. Defects:** none.

**3. Unsure rows and the verdicts**

| state | language | width | browser | measure | value | limit | verdict |
|---|---|---|---|---|---|---|---|
| deletion-pointer, run 1 | en | 1440 | Firefox | leave → gone | 6307 ms | 6000 ± 300 | pass: the rerun gave 6056 and 6096 ms. An in-page diagnostic (a wrapped `setTimeout`) splits each into leave → 6000 ms timer set (28 and 56 ms) and timer → gone (6028 and 6040 ms). The extra time is the page's main thread under four parallel sweeps, not the timer. |
| documents-pointer, run 1 | en | 1440 | Firefox | leave → gone | 6316 ms | 6000 ± 300 | pass: the rerun gave 6118 ms (42 + 6076) and 6036 ms (5 + 6031) |

Over the loaded run, the held conditions ended 26–316 ms after the 6 s and the left-alone ones 13–229 ms after it. The diagnostic shows that the toast's 6000 ms timer starts within 5–56 ms of the leave, as `ToastMessage`'s effect should.

**4. Cited rows:** design-notes §2.1 `#### T005` (the documents step's "Undo" in Chromium: 6036 ms left alone; held 10 s by the pointer and by the focus; 6035 and 6029 ms after leaving; Escape; the focus held while the pointer leaves); phase 3's note in §2.2 ("Driving licence removed." closed after 6011 ms). This sweep reruns those English Chromium cells rather than citing them, and adds the three other toasts, Firefox, German and Ctrl+Z.

Screenshots: `<SP>/sweep/T094/out/shots/deletion-pointer-held-en-1440-chromium.png`, `<SP>/sweep/T094/out/shots/rules-pointer-held-en-1440-chromium.png` (each toast held by the pointer, 9 s in).

#### T095: sweep of US4's deletion states (S4 "After a deletion", "Undo", S3; C3; copy.md §4, §8; FR-072, SC-009, W11) — 2026-11-12

Items: FR-072, SC-009, W11 (and FR-033, FR-034, FR-036, FR-037, FR-076 as rows). Harness: T085's `measure.mjs` (`playwright-core` 1.65), script `<scratchpad>/sweep/T095/sweep.mjs`, output `<scratchpad>/sweep/T095/out/` (`T095.csv`, `T095-summary.md`, `shots/`). Browsers: Chromium 156 (`/usr/bin/chromium`) and Playwright's Firefox, **one after the other** (`parallelBrowsers: false`, so that each cell controls the whole list). Widths 1440 × 900, 320 × 720 and 160 × 450 CSS px viewports; English and German (the stored language choice); the full matrix, 72 cells (6 states × 2 languages × 3 widths × 2 browsers), English in Chromium included; 5325 rows; 580 s wall time (7.6 s per cell in Chromium, 8.4 s in Firefox; `late-undo` 25–26 s). Installation: **the empty one**, backend on 3017 against `konnekt_db_010_p12_empty` (fake EUDIPLO, `WORKER_ENABLED=false`, **`DELETION_UNDO_SECONDS=20`**), Vite on 5181, account `p10-alice`. Data: every cell first deleted every connection on the installation through the API (the previous cell's rows), then made its own empty drafts `T095 sweep <uid> keep` and `T095 sweep <uid> target` (`welcome-deleted`: `target` only) through `POST /api/form-connections/drafts`; the target was deleted through the UI (the overview row's "Delete <name>" → "Delete connection"; `arrival-details`: the draft's details "Delete draft" → "Delete connection"); the teardown deleted the last cell's row. The toast's 6 s timer was held by patching the page's `window.setTimeout` before the deletion click (a 6000 ms delay became 600000 ms, as T091's sweep did), so every toast stayed while it was measured. `late-undo` held the toast past the deletion's `restorable_until` (+1.5 s, 21.1–21.3 s) and then pressed "Undo"; `restore-failed` planted a 500 on `POST /form-connections/deletions/{id}/restore` (`failNext`, error ID `T095-xxxxxxxx-fake`). Own rows besides the harness's ten measures: `toast_text`, `toast_kind` (fill: danger `rgb(196, 39, 28)`, success `rgb(29, 122, 46)`, neutral `rgb(11, 18, 32)`), `toast_action`, `toast_in_view` (as reached, and scrolled to the page's end: inside the viewport and not over the footer bar), `toast_keyboard` (Tab from the focused h1 until "Undo" has the focus, `:focus-visible` true), `row_back`, `late_restore` (the restore's status), `alert_title` (T084 (5), at 160 CSS px).

States: `deleted` (the overview with "“<name>” deleted." and "Undo"), `restored` (after "Undo": "“<name>” restored.", the row back), `late-undo` (after the restore time: "“<name>” can no longer be restored.", `409`), `restore-failed` ("Couldn’t restore. Try again." with its error ID and "Undo"), `welcome-deleted` (FR-037: the welcome page with the toast after the last connection was deleted), `arrival-details` (FR-033: a draft deleted on its details page, arriving on the overview with the toast).

1. Counts per state × measure (pass/fail/unsure; 12 cells per state)

| state | h_scroll | h1 | lang | clipped | label_width | contrast | live_region | forbidden | durations | focus_visible | toast_text / kind / action | toast_in_view | toast_keyboard | alert_title (160) | row_back | late_restore |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| deleted | 12/0/0 | 12/0/0 | 12/0/0 | 12/0/0 | 156/0/0 | 344/0/0 | 48/0/0 | 120/0/0 | 72/0/0 | 24/0/0 | 36/0/0 | 24/0/0 | 12/0/0 | 4/0/0 | | |
| restored | 12/0/0 | 12/0/0 | 12/0/0 | 12/0/0 | 178/0/0 | 400/0/0 | 48/0/0 | 120/0/0 | 72/0/0 | 48/0/0 | 36/0/0 | 24/0/0 | | 4/0/0 | 12/0/0 | |
| late-undo | 12/0/0 | 12/0/0 | 12/0/0 | 12/0/0 | 144/0/0 | 332/0/0 | 48/0/0 | 120/0/0 | 72/0/0 | 48/0/0 | 36/0/0 | 24/0/0 | | 4/0/0 | 12/0/0 | 12/0/0 |
| restore-failed | 12/0/0 | 12/0/0 | 12/0/0 | 12/0/0 | 156/0/0 | 367/0/0 | 60/0/0 | 120/0/0 | 72/0/0 | 24/0/0 | 36/0/0 | 24/0/0 | 12/0/0 | 4/0/0 | | |
| welcome-deleted | 12/0/0 | 12/0/0 | 12/0/0 | 12/0/0 | 96/0/0 | 228/0/0 | 24/0/0 | 120/0/0 | 72/0/0 | 72/0/0 | 36/0/0 | 24/0/0 | 12/0/0 | 4/0/0 | | |
| arrival-details | 12/0/0 | 12/0/0 | 12/0/0 | 12/0/0 | 156/0/0 | 344/0/0 | 48/0/0 | 120/0/0 | 72/0/0 | 24/0/0 | 36/0/0 | 24/0/0 | 12/0/0 | 4/0/0 | | |

Notes on the rows: the toast measured inside the viewport in all 144 rows (at 160 CSS px it sticks to the window's bottom, `x 16–129` beside Chromium's 15 px scrollbar and `x 16–144` in Firefox, its bottom at 442 of 450; at the page's end 0 px over the footer bar); "Undo" was reached by Tab from the h1 in all 48 cells that offer it (3–9 presses, `:focus-visible` true) and drew its 2 px white outline on keyboard focus and none after a click; `late_restore` answered `409` in all 12 cells after 21.1–21.3 s; the live regions read the toasts' texts word for word in both languages (copy.md §4), the failed restore with "Error ID: …" / "Fehler-ID: …" and "Undo" / "Rückgängig"; no toast is a `.kern-alert`, so `alert_title` at 160 CSS px found none visible in any state (24 rows "(none visible)"). Forbidden texts (FR-076, plus "PDF herunterladen" and "Entwurfsänderungen"): none found.

2. Defects: **none**.

3. Unsure rows: **none**. Looked at besides (2 screenshots): `restore-failed-de-160-firefox` (the toast's four lines and "Rückgängig" inside the window; the h1 "Ihre Anbindungen" breaks inside "Anbindungen" at 160 CSS px, the narrow block's existing word-wrapping rule of spec 008, not cut and not this feature's: `pass`, noted for T097/T098 only) and `welcome-deleted-de-320-chromium` (the red toast 24 px above the window's edge over the steps illustration, as FR-037 and T043's 1b row draw it: `pass`).

4. Cited, not judged anew: English in Chromium at 1440, 320 and 160 CSS px for the layout rows is in §2.1 `#### T043` (the toast's fill, radius, padding, shadow, icon, type, position; restored, not restorable, failed with and without an answer, the error ID; the arrival from a draft's and a live connection's details; the welcome page with the toast; the 6 s timer, the pointer and keyboard holds, Escape; German at 1440; 320 and 160 rows without overlap) and §2.2 `#### T044` (walk V7: Undo after a deletion from the overview and the details, the last connection, the late Undo at `restorable_until` + 1.5 s, the replayed restore, `DELETION_UNDO_SECONDS=20`). This sweep also ran those cells: no defect in them either.

#### T096: sweep of US7's example (S3, C4, S7–S13, S14; copy.md §6; FR-072, SC-009, W15) — 2026-11-12

Items: FR-072, SC-009, W15 (and FR-053–FR-058, FR-076 as rows). Harness: T085's `measure.mjs` (`playwright-core` 1.65), script `<scratchpad>/sweep/T096/sweep.mjs`, output `<scratchpad>/sweep/T096/out/` (`T096.csv`, `T096-summary.md`, `shots/`) and, for the two rules states rerun with two measures added after the first run, `<scratchpad>/sweep/T096/out-rulecol/`. Browsers: Chromium 156 (`/usr/bin/chromium`) and Playwright's Firefox, **one after the other** (`parallelBrowsers: false`). Widths 1440 × 900, 320 × 720 and 160 × 450 CSS px viewports; English and German (the stored language choice); the full matrix, 120 cells (10 states × 2 languages × 3 widths × 2 browsers), English in Chromium included; 10583 rows; 697 s wall time (5.3 s per cell in Chromium, 6.1 s in Firefox); the rerun of `rules-standard` and `rules-variant` 24 cells, 180 s. Installation: **the empty one**, backend on 3017 against `konnekt_db_010_p12_empty` (fake EUDIPLO, `WORKER_ENABLED=false`, `DELETION_UNDO_SECONDS=20`), Vite on 5181, account `p10-alice`; run after T095. Data: every cell first deleted every connection on the installation through the API (the previous cell's example), so the four welcome states started from an empty list; the six editor states then made a fresh example with `POST /api/form-connections/example` (the cell's own browser session, `Accept-Language` the cell's language, body `{}`: "Passenger transport licence (example)" / "Personenbeförderungsschein (Beispiel)", `example: 'unchanged'`) and walked to the step with the footer's buttons ("Choose documents", "Set rules", "Test rules", "Publish" and their German); the teardown deleted the last cell's example. `dialog-busy` held the `POST …/example` forever (`page.route`, never sent); `dialog-failed` planted a 500 (`failNext`, error ID `T096-xxxxxxxx-fake`). Own rows besides the harness's ten measures: `welcome_buttons`, `welcome_layout`, `dialog_text`, `busy_disabled`, `retry_label`, `banner_count`, `banner_text`, `banner_quiet` (no control, no role, no live region), `banner_in_view`, `tabs`, `tabs_plain` (no icon, no digit on the variant tabs), `example_line` (shown, alone in its list, after "Active from"), `summary_values` (`dd > span`), `alert_title` (T084 (5), at 160 CSS px), and in the rerun `rule_text_width` (spec 008's `RuleRow` text column, the narrowest row) and `link_strip_text` (the variant's `LinkStrip` sentence).

States: `welcome` (the welcome page with its two buttons), `dialog-idle`, `dialog-busy` ("Creating…"), `dialog-failed` (the alert with its error ID, "Try again"), `step1` (the banner on step 1), `documents`, `rules-standard`, `rules-variant` (the example's variant "Ambulance" / "Krankentransport"), `test`, `publish-dialog` (the dialog with the example's line).

1. Counts per state × measure (pass/fail/unsure; 12 cells per state; own rows: `banner_*` = count, text, quiet, in view; the rules states' `rule_text_width` and `link_strip_text` from the rerun)

| state | h_scroll | h1 | lang | clipped | label_width | contrast | live_region | forbidden | durations | focus_visible | alert_title (160) | own rows |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| welcome | 12/0/0 | 12/0/0 | 12/0/0 | 12/0/0 | 84/0/0 | 204/0/0 | 12/0/0 | 120/0/0 | 72/0/0 | 48/0/0 | 4/0/0 | buttons 12/0/0, layout 12/0/0 |
| dialog-idle | 12/0/0 | 12/0/0 | 12/0/0 | 12/0/0 | 60/0/0 | 84/0/0 | 12/0/0 | 120/0/0 | 36/0/0 | 72/0/0 | 4/0/0 | text 12/0/0 |
| dialog-busy | 12/0/0 | 12/0/0 | 12/0/0 | 12/0/0 | 60/0/0 | 24/0/0 | 12/0/0 | 120/0/0 | 36/0/0 | 72/0/0 | 4/0/0 | busy_disabled 12/0/0 |
| dialog-failed | 12/0/0 | 12/0/0 | 12/0/0 | 12/0/0 | 60/0/0 | 132/0/0 | 48/0/0 | 120/0/0 | 36/0/0 | 72/0/0 | 2/**2**/0 | retry_label 12/0/0 |
| step1 | 12/0/0 | 12/0/0 | 12/0/0 | 8/0/**4** | 132/0/0 | 372/0/0 | 36/0/0 | 120/0/0 | 84/0/0 | 72/0/0 | 4/0/0 | banner 48/0/0 |
| documents | 12/0/0 | 12/0/0 | 12/0/0 | 4/0/**11** | 576/0/0 | 1150/0/0 | 36/0/0 | 120/0/0 | 504/0/0 | 72/0/0 | 4/0/0 | banner 48/0/0 |
| rules-standard | 12/0/0 | 12/0/0 | 12/0/0 | 8/0/**4** | 276/0/0 | 594/0/0 | 36/0/0 | 120/0/0 | 192/0/0 | 120/0/0 | 4/0/0 | banner 48/0/0, tabs 24/0/0, rule_text_width 12/0/0 |
| rules-variant | 12/0/0 | 12/0/0 | 12/0/0 | 8/0/**4** | 252/0/0 | 633/0/0 | 36/0/0 | 120/0/0 | 192/0/0 | 120/0/0 | 4/0/0 | banner 48/0/0, tabs 24/0/0, rule_text_width 8/**4**/0, link_strip_text 8/**4**/0 |
| test | 12/0/0 | 12/0/0 | 12/0/0 | 8/0/**4** | 252/0/0 | 723/0/0 | 36/0/0 | 117/**3**/0 | 108/0/0 | 168/0/0 | 4/0/0 | banner 48/0/0 |
| publish-dialog | 12/0/0 | 12/0/0 | 12/0/0 | 12/0/0 | 84/0/0 | 228/0/0 | 36/0/0 | 118/**2**/0 | 36/0/0 | 96/0/0 | 4/0/0 | example_line 12/0/0, summary_values 12/0/0 |

Notes on the rows: every banner had the copy.md §6 sentence word for word in both languages, one per page, no control, no role and no live region, inside the viewport at every width (`x 8–152 of 160` at 160 CSS px); the rules step's tabs read "Standard | Ambulance" / "Standard | Krankentransport" with the right selection and no icon or digit; the publish dialog showed the line alone under "Active from" and the summary `Personal ID · 7 data items | Driving licence · 2 data items | Standard · 2 rules | Ambulance · 2 rules` / `Personalausweis · 7 Felder | Führerschein · 2 Felder | Standard · 2 Regeln | Krankentransport · 2 Regeln`; the busy dialog's three buttons were all `aria-disabled` ("Creating…" / "Wird erstellt …"); after the planted 500 the alert (`role=alert`) read "Couldn’t create the example" / "Das Beispiel konnte nicht erstellt werden", the server's internal-error sentence and "Error ID: …" / "Fehler-ID: …", the primary button "Try again" / "Erneut versuchen"; the welcome page's two buttons sat in one row 16 px apart at 1440 and wrapped under each other at 320 and 160. The alert titles at 160 CSS px: `dialog-failed` 41.0 of 89.0 px (46 %) in Chromium (both languages), 56.0 of 104.0 px (54 %) in Firefox; no other state shows a `.kern-alert`.

2. Defects (state | language | width | browser | measure | element | value | limit | suspected file)

| state | language | width | browser | measure | element | value | limit | suspected file |
|---|---|---|---|---|---|---|---|---|
| dialog-failed | en | 160 | chromium | alert_title | `.kern-alert .kern-title` "Couldn’t create the example" | 41.0 of 89.0 px (46 %) | ≥ 50 % of the alert | `frontend/src/index.css` narrow block (T084 (5)'s rule; `ConfirmDialog`'s `KernAlert`, as T091's) |
| dialog-failed | de | 160 | chromium | alert_title | `.kern-alert .kern-title` "Das Beispiel konnte nicht erstellt werden" | 41.0 of 89.0 px (46 %) | ≥ 50 % of the alert | same |
| step1, documents, rules-standard, rules-variant, test (20 rows: 5 states × 4 cells) | en | 320 | chromium | clipped (header name) | `nav > span` "Passenger transport licence (example)" | 34 px shown (165–199) of 245 | ≥ min(own width, 96 px) (T084 (4)) | `frontend/src/components/TopBar/index.tsx` (T084 (4); T087 (b), T088, T092 (b)) |
| same 5 states | en | 320 | firefox | clipped (header name) | same | 49 px shown (165–214) | ≥ 96 px | same |
| same 5 states | de | 320 | chromium | clipped (header name) | `nav > span` "Personenbeförderungsschein (Beispiel)" | 13 px shown (169–182) of 251, "P." | ≥ 96 px | same |
| same 5 states | de | 320 | firefox | clipped (header name) | same | 28 px shown (169–197) | ≥ 96 px | same |
| rules-variant | en | 320 | chromium | rule_text_width | `RuleRow` text column, "Rule 01" (the "Changed here" mark and ⋯ beside it) | 55 of 255 px: "Message for citizens:" breaks a word a line | ≥ 120 px (UNCERTAIN limit) | **baseline**: `frontend/src/components/RuleRow/index.tsx` (spec 008; the row's mark and actions stay beside the text at ≥ 320 CSS px) |
| rules-variant | de | 320 | chromium | rule_text_width | same | 55 of 255 px ("Nachric/ht für/Bürgeri/nnen") | ≥ 120 px | **baseline**: same |
| rules-variant | en | 320 | firefox | rule_text_width | same | 70 of 270 px | ≥ 120 px | **baseline**: same |
| rules-variant | de | 320 | firefox | rule_text_width | same | 70 of 270 px | ≥ 120 px | **baseline**: same |
| rules-variant | en | 320 | chromium | link_strip_text | `LinkStrip` sentence beside "Linked to Standard" | 81 of 271 px | ≥ 120 px (UNCERTAIN limit) | **baseline**: `frontend/src/pages/FormConnectionEditor/RulesStep/LinkStrip.tsx` (spec 008/009; `min-w-0 flex-1` keeps the sentence beside the label instead of wrapping under it) |
| rules-variant | de | 320 | chromium | link_strip_text | same ("Unverän/derte/Regeln/überneh/men …") | 54 of 271 px | ≥ 120 px | **baseline**: same |
| rules-variant | en | 320 | firefox | link_strip_text | same | 96 of 286 px | ≥ 120 px | **baseline**: same |
| rules-variant | de | 320 | firefox | link_strip_text | same | 69 of 286 px | ≥ 120 px | **baseline**: same |

The last eight rows show in any based variant with changed rules at 320 CSS px, not only the example's; at 160 CSS px both elements take their row's whole width (the narrow rules) and pass. Counted as rows: 2 + 20 + 4 + 4 = **30 defect rows** (4 defects: the alert title, the header name, the rule row, the link strip; 8 rows baseline).

3. Unsure and failing rows looked at, with the verdicts

- `clipped`, `nav > span` (the header's name) at 320 CSS px, 20 cells (step1 … test): ellipsis, 13–49 px shown, under T084 (4)'s minimum → **defect** (section 2). At 1440 and 160 CSS px the name isn't cut.
- `clipped`, the document rows' names at 160 CSS px (documents: "Personal ID", "Driving licence", "Personalausweis", "Führerschein"; 7 cells): ellipsis, `truncate` by design (T058's W16 rows; T092's verdict) → pass.
- `forbidden_text` "Message … reads" on `test` (en 1440 ch "Message Hannah reads", en 160 ch "Message Jonas reads", en 320 ff "Message Elena reads") and on `publish-dialog` (the test step behind the dialog: en 1440 ch "Message Stefan reads", en 320 ff "Message Piotr reads"): the column head of `TestStep/ResultTable.tsx` for a persona who doesn't meet a variant (spec 004 F3/F14); FR-076 excludes only the box for a persona who meets every rule (Clarification #8; carried from T087) → **pass**. It shows only where the random persona fails a rule, hence 5 of 24 cells.
- `alert_title` in `dialog-failed`, 160 CSS px Chromium → defect (section 2); Firefox 54 % → pass.
- Screenshots opened (4): `dialog-failed-de-160-chromium` (the alert title a column of syllables beside its icon; the page behind breaks "Willkom/men" and "Anbindun/g", the narrow block's word wrapping of spec 008: noted, not this sweep's defect), `rules-variant-de-320-chromium` and `rules-variant-en-320-chromium` (the variant's rule rows and link strip in a 55 px column: the baseline rows of section 2; the header's "P."), `rules-standard-en-320-firefox` (Standard's rows read well at 320: pass).

4. Cited, not judged anew: English in Chromium at 1440, 320 and 160 CSS px for the layout rows is in §2.1 `#### T066` (the banner against 1h, 1i, 1i-c), `#### T067` (the welcome page's "Start from an example" and the dialog against 1b and 1g), `#### T068` (the banners in the steps and the publish dialog's line) and §2.2 `#### T070` (walk V10 at 1440: the welcome page, the dialog, step 1 to the test step, the publish dialog, the overview, German read in English). This sweep also ran those cells; its English Chromium rows found the alert title (160), the header name (320) and the variant's rule row and link strip (320) above, none of which those tables measured.

#### T098: the sweeps' narrow-layout fixes, rerun (T084 (4), (5); T087, T088, T091, T092, T096; FR-072, SC-009) — 2026-11-12

**Fixes** (three; the dialogs' no-retry and the date field's contrast are T106's): (1) the header's
name in `TopBar`'s "Where you are" pill (`frontend/src/components/TopBar/index.tsx`): the pill's
parts wrap at every width (`flex-wrap`, no longer `narrow:` only), the name has a 96 px basis
capped at its own width (`grow basis-96 max-w-max min-w-0 truncate`), so it keeps min(own, 96) on
its row, the status pill wraps under it where both don't fit, and the name itself goes under
"Your connections /" where even 96 px don't fit; the pill is `min-h-48 py-8` instead of `h-48`
(48 high on one row, taller on two). (2) `frontend/src/index.css`'s narrow block:
`.kern-alert__header > .kern-title { flex-basis: 100% }` (beats kern.css's `.kern-dialog
.kern-title { flex: 1 0 0 }` by order); T024's local `narrow:[&_.kern-title]:basis-full!` removed
from `PublishDialog.tsx` and `FormConnectionDetail/constants.ts` (`w-full` kept). (3) the document
row's ⋯ wrapper (`DocumentsStep/constants.ts` `ROW_ACTIONS_CLASSES`, used in
`DocumentListItem.tsx`): `narrow:[&_[role=menu]]:px-4 narrow:[&_[role=menuitem]]:px-4`, the menu's
and its entries' side paddings 4 px instead of 8 below 320 CSS px; `ActionMenu` unchanged.

**Reruns** (T085's harness, `playwright-core` 1.65, Chromium 156 `/usr/bin/chromium`, Firefox build
1572; main installation 3016/5180 on `konnekt_db_010_p12` as `p10-alice`, T096 on the empty one
3017/5181; the sweeps' own rows, found by name; no new rows except T090's two "T090 sweep C1 …"
requests' connections, its token revoked):

| rerun | command | cells | rows | fail | unsure | output |
|---|---|---|---|---|---|---|
| T088 names | `node <SP>/sweep/T088/sweep.mjs names --out=<SP>/sweep/T088/out-rerun-names` | 144 | 720 | 0 | 102 (ellipsis ≥ 96 px: pass) | `<SP>/sweep/T088/out-rerun-names/` |
| T088 main | `… main --only=band-*,header-edit-* (8 states) --out=<SP>/sweep/T088/out-rerun-main` | 96 | 3092 | 0 | clipped 320 (pass), band-draft gradient contrast (pass, T088's verdict) | `<SP>/sweep/T088/out-rerun-main/` |
| T087 edit-step1 | `node sweep.mjs --states edit-step1 --out rerun` (in `<SP>/sweep/T087/`) | 12 | 1228 | 0 | 4 (the name at 320: 108 px Chromium, 123 px Firefox: pass) | `<SP>/sweep/T087/rerun/` |
| T087 alerts (T024's local fixes gone) | `--states publish-failed,publish-no-answer,start-failed --cells en/de-160-chromium/firefox --out rerun-alert` | 12 | 680 | 6 (known, not T098's) | 0 | `<SP>/sweep/T087/rerun-alert/` |
| T092 | `--states three,single,edit-flow,menu-middle,menu-first,menu-last --cells de-160-chromium,de-160-firefox,en-160-chromium,en-160-firefox,en-320-chromium,de-320-firefox --out <SP>/sweep/T092/rerun-fix` | 36 | – | 24 (baseline `add_button`) | names at 160 (pass), header name at 320 ≥ 108 px (pass) | `<SP>/sweep/T092/rerun-fix/` |
| T091 | `--states dialog-failed --cells en-160-chromium,de-160-chromium,en-160-firefox --out rerun-alert` | 3 | – | 0 | 0 | `<SP>/sweep/T091/rerun-alert/` |
| T096 (empty installation) | `--states dialog-failed,step1,documents,rules-standard,rules-variant,test --cells en-160-chromium,de-160-chromium,en-320-chromium,en-320-firefox,de-320-chromium,de-320-firefox --out <SP>/sweep/T096/rerun` | 36 | 4252 | 10 (8 baseline, 2 known pass) | header name at 320 (pass), document names at 160 (pass) | `<SP>/sweep/T096/rerun/` |
| T089 alert | `T089_OUT=<SP>/sweep/T089/rerun-alert node sweep.mjs open-failed` | 12 | – | 0 | 0 | `<SP>/sweep/T089/rerun-alert/` |
| T090 alerts | `node <SP>/sweep/T090/sweep-rerun-T098.mjs --states=D1,C1 --cells=en:160:chromium,…` (a copy writing to `rerun-alert-T098/`, since T090's script has a fixed `out/`) | 8 | – | 0 | 0 | `<SP>/sweep/T090/rerun-alert-T098/` |

**The header name's visible width, before → after** (CSS px, Chromium; Firefox in the second
table; limit min(own, 96) = 96; own 249 live, 292 scheduled, 302 deactivated, 257 draft; **bold**
failed before; at 1440 every value is unchanged)

| page | state | lang | 160 | 320 | 400 | 768 | 900 | 1440 |
|---|---|---|---|---|---|---|---|---|
| details | live | en | 113 → 97.7 | **27** → 107.9 | 107 → 107 | **69.9** → 150.8 | 201.9 → 201.9 | 248.7 → 248.7 |
| details | live | de | 113 → 97.7 | **30.2** → 104.4 | 110.2 → 110.2 | **73.1** → 147.3 | 205.1 → 205.1 | 248.7 → 248.7 |
| details | scheduled | en | 113 → 97.7 | **0** → 107.9 | **72.1** → 187.9 | **0** → 150.8 | **94.1** → 282.8 | 291.7 → 291.7 |
| details | scheduled | de | 113 → 97.7 | **0** → 104.4 | **72.9** → 184.4 | **0** → 147.3 | 107.3 → 107.3 | 291.7 → 291.7 |
| details | deactivated | en | 113 → 97.7 | **0** → 107.9 | **69.3** → 187.9 | **32.2** → 150.8 | 164.2 → 164.2 | 301.7 → 301.7 |
| details | deactivated | de | 113 → 97.7 | **0** → 104.4 | **71.1** → 184.4 | **34** → 147.3 | 166 → 166 | 301.7 → 301.7 |
| details | draft | en | 113 → 97.7 | **33.6** → 107.9 | 113.6 → 113.6 | 171.5 → 171.5 | 257 → 257 | 257 → 257 |
| details | draft | de | 113 → 97.7 | **12.7** → 104.4 | **92.7** → 184.4 | 150.5 → 150.5 | 257 → 257 | 257 → 257 |
| edit | live | en | 113 → 97.7 | **27** → 107.9 | 107 → 107 | 164.9 → 164.9 | 248.7 → 248.7 | 248.7 → 248.7 |
| edit | live | de | 113 → 97.7 | **30.2** → 104.4 | 110.2 → 110.2 | 168.1 → 168.1 | 248.7 → 248.7 | 248.7 → 248.7 |
| edit | scheduled | en | 113 → 97.7 | **0** → 107.9 | **72.1** → 187.9 | **57.1** → 245.8 | 189.1 → 189.1 | 291.7 → 291.7 |
| edit | scheduled | de | 113 → 97.7 | **0** → 104.4 | **72.9** → 184.4 | **70.3** → 242.3 | 202.3 → 202.3 | 291.7 → 291.7 |
| edit | deactivated | en | 113 → 97.7 | **0** → 107.9 | **69.3** → 187.9 | 127.2 → 127.2 | 259.2 → 259.2 | 301.7 → 301.7 |
| edit | deactivated | de | 113 → 97.7 | **0** → 104.4 | **71.1** → 184.4 | 129 → 129 | 261 → 261 | 301.7 → 301.7 |
| edit | draft | en | 113 → 97.7 | **33.6** → 107.9 | 113.6 → 113.6 | 171.5 → 171.5 | 257 → 257 | 257 → 257 |
| edit | draft | de | 113 → 97.7 | **12.7** → 104.4 | **92.7** → 184.4 | 150.5 → 150.5 | 257 → 257 | 257 → 257 |

(600, 767 and 1024 px: unchanged or wider, all ≥ 96; at 600 a scheduled name is 199.2 / 212.4
beside its one-line pill instead of 234.6 / 241 beside the pill's two lines. At 160 the name
wraps whole on its lines, now beside "/" in Chromium, 97.7 px wide; the whole name shows.)

Firefox (320 and 768 from the names run, 160 and 1440 from the main run):

| page | state | en 160 | en 320 | en 768 | en 1440 | de 160 | de 320 | de 768 | de 1440 |
|---|---|---|---|---|---|---|---|---|---|
| details | live | 128 → 128 | **42** → 122.9 | **84.9** → 165.7 | 248.7 | 128 → 112.7 | **45.2** → 119.4 | **88.1** → 162.3 | 248.7 |
| details | scheduled | 128 → 128 | **7.1** → 122.9 | **0** → 165.7 | 291.7 | 128 → 112.7 | **8** → 119.4 | **0** → 162.3 | 291.6 |
| details | deactivated | 128 → 128 | **4.3** → 122.9 | **47.2** → 165.7 | 301.7 | 128 → 112.7 | **6.1** → 119.4 | **49** → 162.3 | 301.7 |
| details | draft | 128 → 128 | **48.6** → 122.9 | 186.5 → 186.5 | 257 | 128 → 112.7 | **27.7** → 119.4 | 165.6 → 165.6 | 257 |
| edit | live | 128 → 128 | **42** → 122.9 | 179.9 → 179.9 | 248.7 | 128 → 112.7 | **45.2** → 119.4 | 183.1 → 183.1 | 248.7 |
| edit | scheduled | 128 → 128 | **7.1** → 122.9 | **72.1** → 260.7 | 291.7 | 128 → 112.7 | **8** → 119.4 | **85.4** → 257.3 | 291.6 |
| edit | deactivated | 128 → 128 | **4.3** → 122.9 | 142.2 → 142.2 | 301.7 | 128 → 112.7 | **6.1** → 119.4 | 144 → 144 | 301.7 |
| edit | draft | 128 → 128 | **48.6** → 122.9 | 186.5 → 186.5 | 257 | 128 → 112.7 | **27.7** → 119.4 | 165.6 → 165.6 | 257 |

The "Where you are" pill's height (nav box, from `pill_in_nav`): 1440 unchanged (48); 320 48 → 72
(64 → 72 for a scheduled connection: the status pill on its own row, its label on one line); 160
152–224 (before 184–232: "/" now shares the name's row); 768 on the details page 48 → 72 where the
status pill wraps (and in the edit flow for a scheduled connection up to about 880 px), so the
header is 88 px there instead of 64. `pill_in_nav` passes in every cell, 768 included (before:
the scheduled pill 7–22 px past the nav over the description).

**Alert titles at 160 CSS px, before → after** (title width of the alert's content width)

| state | Chromium | Firefox | how |
|---|---|---|---|
| T091 dialog-failed (bulk dialog, `ConfirmDialog`'s `KernAlert`), en, de | 41.0 → 73.0 of 89.0 (46 % → 82 %) | 56.0 → 88.0 of 104.0 (54 % → 85 %) | the new rule |
| T096 dialog-failed (example dialog), en, de | 41.0 → 73.0 of 89.0 (46 % → 82 %) | (not rerun; 54 % before) | the new rule |
| T087 publish-failed, publish-no-answer, start-failed, en, de | 73.0 → 73.0 of 89.0 | 88.0 → 88.0 of 104.0 | T024's local classes before, the rule after (they were removed) |
| T089 open-failed (Activity card), en, de | 87.0 → 87.0 of 103.0 | 102.0 → 102.0 of 118.0 | unchanged (not in a dialog) |
| T090 D1, C1 (approval page), en, de | 113 → 113 of 129 | 128 → 128 of 144 | unchanged |

(73 of 89: the header's own 8 px side paddings of the narrow block; the title spans the header.)

**Rows now passing** (each before → after):

| from | state | language | width | browser | measure | element | before | after |
|---|---|---|---|---|---|---|---|---|
| T088 (17 rows, 59 cells) | band-*, header-edit-*, name-* (4 states, details and edit) | en, de | 320, 400, 768, 900 | Chromium, Firefox | name_width | the header's name | 0–94.1 px | 104.4–282.8 px (≥ 96) |
| T088 | name-details-scheduled | en, de (ch), en (ff) | 768 | Chromium, Firefox | pill_in_nav | the status pill "Scheduled · 12.12.2026" | 7–22 px past the nav | inside the nav (second row) |
| T087 | edit-step1 | en, de | 320 | Chromium, Firefox | clipped (name) | "T087 sweep base scheduled" | 0 / 7–8 px | 108 / 123 px, "…" (pass, T084 (4)) |
| T092 | edit-flow | en, de | 320 | Chromium, Firefox | clipped (name) | "T092 sweep base live" | 27–45 px | 108 / 119 px (pass) |
| T092 | menu-first, menu-middle, menu-last | de | 160 | Chromium | entry lines (screenshot, heights) | "Nach unten" | "Nach / unte / n", 88 px | "Nach / unten", 64 px (menu 249–331 and 249–397: two-line entries; screenshot `menu-middle-de-160-chromium.png`) |
| T091 | dialog-failed (and dialog-changed, same alert) | en, de | 160 | Chromium | alert_title | "Couldn’t delete" | 46 % | 82 % |
| T096 | dialog-failed | en, de | 160 | Chromium | alert_title | "Couldn’t create the example" | 46 % | 82 % |
| T096 | step1, documents, rules-standard, rules-variant, test (20 rows) | en, de | 320 | Chromium, Firefox | clipped (name) | "Passenger transport licence (example)" / "Personenbeförderungsschein (Beispiel)" | 13–49 px | 108 / 104 (ch), 123 / 119 (ff), "…" (pass) |

**Open rows** (not T098's, unchanged by these fixes):

| from | state | language | width | browser | measure | element | value | limit | owner |
|---|---|---|---|---|---|---|---|---|---|
| T092 | all 6 states rerun | en, de | 160 | Chromium, Firefox | add_button | "Add document" / "Dokument hinzufügen" | 2–3 lines in the 36 px box | inside its box | baseline, not fixed (FR-074; `DocumentsStep/SearchCard.tsx`) |
| T096 | rules-variant | en, de | 320 | Chromium, Firefox | rule_text_width | `RuleRow` text | 55 / 70 px | ≥ 120 | baseline, not fixed (`components/RuleRow/`) |
| T096 | rules-variant | en, de | 320 | Chromium, Firefox | link_strip_text | `LinkStrip` sentence | 54–96 px | ≥ 120 | baseline, not fixed (`RulesStep/LinkStrip.tsx`) |
| T087 | start-failed | en, de | 160 | Chromium, Firefox | contrast | the date field's border | 1.25 | 3 | T106 |
| T091 | dialog-changed | en, de | all | both | no_retry, focus_after_409 | the bulk dialog after `409` | "Try again" | hidden, focus on "Keep connections" | T106 (not rerun here) |

Pass verdicts kept: `forbidden_text` "Message … reads" (T087 publish-no-answer en 160, T096 test en
160 / 320; the test step's column head, T087's verdict); the names cut with "…" at ≥ 96 px
(T084 (4)); the document names at 160 (`truncate`, T058).

**Cited rows**: English in Chromium as in T087's, T088's, T091's, T092's and T096's tables (design-notes
§2.1 `#### T014`, `#### T015`, `#### T024`, `#### T028`, `#### T049`, `#### T058`, `#### T068`;
§2.2 `#### T017`, `#### T030`, `#### T061`, `#### T070`); at 1440 the header's per-node values of
`#### T014` and `#### T015` are unchanged (the name's 248.7–301.7 px, the pill 48 high).

#### T106: the sweeps' dialog and field defects, fixed and rerun (T084 (3); T087, T091; FR-043, FR-072, SC-009) — 2026-11-12

**Fixes** (two): (1) **the bulk dialog after `409 selection_changed`** offers no retry
(design-notes §4.2 T084 (3), `contracts/ui-screens.md` S4 amended): `ConfirmDialog` gained the
prop `hideConfirm` (default `false`, so every other caller, the single delete dialog among them,
is unchanged); hidden, the footer has one button fewer (`dialogButtonCountOf()`, the one-button
layout of P33 dialog-actions: "Keep connections" across the footer) and the cancel button takes
the focus (an effect on `open` and `hideConfirm`). `BulkDeleteDialog` reads its notice from
`bulkDeleteNoticeOf(state, language)`: after `selection_changed` (`stale`, now kept in
`BulkDeleteState`) the sentence "Nothing was deleted: “<name>” was deleted or changed in the
meantime." (the server's sentence where the changed id isn't among the dialog's rows) under
"Couldn’t delete", `retry: false` → `hideConfirm`; another failure (a 5xx with its error ID,
no answer, any other 4xx) `retry: true`, so spec 008's "Try again" stays. Escape, × and the scrim
behave as before (the scrim never closes it; nothing closes it while busy). (2) **the start date
field's boundary** (`components/ActiveFromChoice/constants.ts`, `DATE_FIELD_CLASSES.valid`): 1 px
`decorative-border-default` #e1e6f0 (1.25:1 on white) → 1 px `layout-border` #6b7488 (4.69:1 on
white, 4.29:1 on #f2f5fb), the overlay's nearest KERN token that passes AA's 3:1, the one the
radios beside it and the checkboxes use; white fill, radius 8, 128 × 40, the error's
`feedback-danger` line and the 4 px focus ring unchanged (the field has no hover look).

**Reruns** (T085's harness, `playwright-core` from `<SP>/sweep/`, Chromium 156
`/usr/bin/chromium`, Firefox build 1572; main installation 3016/5180 on `konnekt_db_010_p12` as
`p10-alice`; English and German × 1440, 320, 160 CSS px × Chromium, Firefox; data: T087's and
T091's own rows, found by name, and the `409`'s per-cell rows `T091 sweep <uid> live/draft` made
and removed by T091's script; no rows of T106's own):

| rerun | command (in the sweep's folder) | cells | rows | fail | unsure | output |
|---|---|---|---|---|---|---|
| T091 | `node sweep.mjs --states dialog-changed,dialog-failed --out rerun-T106` | 24 | 1164 | 0 | 0 | `<SP>/sweep/T091/rerun-T106/` (145 s) |
| T087 | `node sweep.mjs --states start-scheduled-date,start-failed,publish-date,activate-date,delete-details,delete-row --out rerun-T106` | 72 | 3479 | 3 (known, pass) | 0 | `<SP>/sweep/T087/rerun-T106/` (241 s) |

1. Counts per state × measure (pass/fail/unsure; horizontal_scroll, h1_count, lang, clipped
   12/0/0 in every state, left out)

| state | label_width | contrast | live_region | forbidden_text | durations | focus_visible | alert_title | own checks |
|---|---|---|---|---|---|---|---|---|
| T091 dialog-changed | 36/0/0 | 144/0/0 | 60/0/0 | 120/0/0 | 36/0/0 | 52/0/0 | 4/0/0 | no_retry 12/0/0 (was 0/**12**/0); focus_after_409 12/0/0 (was 0/**12**/0); dialog_lines, dialog_warnings 24/0/0 |
| T091 dialog-failed | 60/0/0 | 180/0/0 | 60/0/0 | 120/0/0 | 36/0/0 | 72/0/0 | 4/0/0 | retry_label 12/0/0; dialog_lines, dialog_warnings 24/0/0 |
| T087 start-scheduled-date | 84/0/0 | 168/0/0 (was 156/**12**/0) | 12/0/0 | 120/0/0 | 36/0/0 | 120/0/0 | 4/0/0 | |
| T087 start-failed | 84/0/0 | 204/0/0 (was 192/**12**/0) | 48/0/0 | 120/0/0 | 36/0/0 | 120/0/0 | 4/0/0 | |
| T087 publish-date | 84/0/0 | 227/0/0 | 36/0/0 | 117/3/0 | 36/0/0 | 120/0/0 | 4/0/0 | |
| T087 activate-date | 84/0/0 | 240/0/0 | 12/0/0 | 120/0/0 | 36/0/0 | 120/0/0 | 4/0/0 | |
| T087 delete-details | 60/0/0 | 84/0/0 | 12/0/0 | 120/0/0 | 36/0/0 | 72/0/0 | 4/0/0 | |
| T087 delete-row | 60/0/0 | 84/0/0 | 24/0/0 | 120/0/0 | 36/0/0 | 72/0/0 | 4/0/0 | |

Rows rerun, before → after:

| state | language | width | browser | measure | element | before | after | result |
|---|---|---|---|---|---|---|---|---|
| T091 dialog-changed | en, de | 1440, 320, 160 | Chromium, Firefox | no_retry | dialog footer `.kern-btn--primary` | "Try again" / "Erneut versuchen" (12 cells) | (none) | pass |
| T091 dialog-changed | en, de | 1440, 320, 160 | Chromium, Firefox | focus_after_409 | `document.activeElement` | button "Try again" / "Erneut versuchen" | button "Keep connections" / "Anbindungen behalten" | pass |
| T091 dialog-changed | en, de | all | Chromium, Firefox | live_region | `dialog:modal [role=alert]` | "Couldn’t delete" + "Nothing was deleted: “T091 sweep … live” was deleted or changed in the meantime." | the same (German "Nichts wurde gelöscht: „…“ …") | pass |
| T091 dialog-failed | en, de | 1440, 320, 160 | Chromium, Firefox | retry_label | dialog footer `.kern-btn--primary` | "Try again" / "Erneut versuchen" | the same (spec 008 kept) | pass |
| T091 dialog-changed, dialog-failed | en, de | 160 | Chromium / Firefox | alert_title | `.kern-alert .kern-title` | 41.0 of 89.0 px (46 %) before T098 | 73.0 of 89.0 (82 %) / 88.0 of 104.0 (85 %) | pass (T098's rule) |
| T087 start-scheduled-date | en, de | 1440, 320, 160 | Chromium, Firefox | contrast | dialog > input "Start date (DD.MM.YYYY)" / "Startdatum (TT.MM.JJJJ)" (boundary), unfocused | border 1.25 (#e1e6f0 on #ffffff) | border 4.69 (#6b7488 on #ffffff) | pass |
| T087 start-failed | en, de | 1440, 320, 160 | Chromium, Firefox | contrast | the same field after the failure, unfocused | border 1.25 | border 4.69 | pass |
| T087 publish-date, activate-date | en, de | all | Chromium, Firefox | contrast | the same field, focused while measured | outline 18.72 | outline 18.72 (unchanged) | pass |
| T087 delete-details, delete-row | en, de | all | Chromium, Firefox | all | the single delete dialog ("Keep connection" / "Delete connection") | 0 fail | 0 fail, both buttons shown (`delete-row-en-1440-chromium.png`) | pass (unchanged) |

2. Defects: none left. The three failing rows are known (below).

3. Failing and unsure rows looked at, with the verdict

| state | measure | element | cells | verdict |
|---|---|---|---|---|
| T087 publish-date | forbidden_text "Message … reads" | th "Message Emma reads" / "Sophie" / "Mia" | en 1440 ch, en 160 ch, en 160 ff | pass: T087's verdict (the test step's column head behind the modal publish dialog, `TestStep/ResultTable.tsx`, a generated persona's name) |

Screenshots opened: `T091/rerun-T106/shots/dialog-changed-en-1440-chromium.png` (the alert with
the sentence, "Keep connections" alone across the footer), `dialog-changed-de-160-firefox.png`
("Anbindungen behalten" alone, scrolled into view), `T087/rerun-T106/shots/start-scheduled-date-en-1440-chromium.png`
(the field's grey-blue line beside the radios' identical line), `delete-row-en-1440-chromium.png`
(the single delete dialog unchanged).

4. Cited rows: English in Chromium from §2.1 `#### T023` (P1b, the field's box: its row "1 px
#e1e6f0" now reads 1 px #6b7488, see design-notes §1 below), `#### T049` (the bulk dialog; its
UNCERTAIN 2 decided by T084 (3)), §2.2 `#### T051` (V8.5's `409`, now without "Try again"), and
§2.3 `#### T087`, `#### T091` (the rows above).

**Row for design-notes §1** (deviations from Figma, for the designer's list):
| frame | element | Figma | build | why |
|---|---|---|---|---|
| P1b 6380:26675 (U75; "Rules/Number field" 6194:42241), also S15, S17 | the start date field's 1 px line, unfocused | `decorative-border` #e1e6f0 (1.25:1 on white) | `layout-border` #6b7488 (4.69:1 on white) | WCAG 1.4.11 (AA 3:1 for a field's boundary; SC-009, T087's sweep); the nearest KERN token in the overlay that passes, the one the radios beside it and the checkboxes draw |

Open rows: none.

#### T099, the German corrections of T097 applied (design-notes §3)

Items FR-071. Language de (en unchanged). Browsers for the reruns: Chromium 156 and Firefox (playwright-core), widths 1440 / 320 / 160 CSS px. Data made: the sweeps' own rows (T093 sweep's `T093 sweep draft` / `T093 sweep live`, reused; T091 sweep's per-cell `T091 sweep <uid> …` rows, torn down by the script, every teardown 200).

Applied rows (the "german after" column of §3, copied exactly):

| §3 row | file : key | test files changed |
|---|---|---|
| 1 scheduled text | `frontend/src/pages/FormConnectionDetail/constants.ts` `CONNECTION_DETAIL_COPY.scheduledText` | none pinned it |
| 2 save scheduled intro | `frontend/src/pages/FormConnectionEditor/constants.ts` `PUBLISH_DIALOG_COPY.saveScheduledIntro` | none pinned it |
| 3 group title | `frontend/src/pages/FormConnectionEditor/DocumentsStep/constants.ts` `REMOVAL_DIALOG_COPY.groupTitle` | `frontend/src/pages/FormConnectionEditor/DocumentsStep/utils.test.ts` (line 770) |
| 4 became active | `frontend/src/pages/Approval/constants.ts` `APPROVAL_COPY.connectionBecameActive`; `backend/app/services/approvals.py` `BECAME_ACTIVE_TEXT` | `frontend/src/pages/Approval/utils.test.ts`; `backend/tests/api/test_approval_requests.py` |
| 5 start date changed | `frontend/src/pages/Approval/constants.ts` `APPROVAL_COPY.connectionStartDateChanged`; `backend/app/services/approvals.py` `START_DATE_CHANGED_TEXT` | `frontend/src/pages/Approval/utils.test.ts`; `backend/tests/api/test_approval_requests.py` |
| 6 bulk dialog changed | `frontend/src/pages/FormConnectionList/constants.ts` `BULK_DELETE_COPY.changed` | none pinned it in the repository (T091's sweep script did: run as a copy, below) |
| 7 selection_changed | `backend/app/services/deletions.py` `SELECTION_CHANGED_MESSAGE` (split over two literals for Ruff's 88 columns) | `backend/tests/api/test_deletions.py` (`SELECTION_CHANGED_DE`) |

After the change, `grep -rn` of `inzwischen`, `Felder der Gruppe`, `am geplanten Datum unten`, `sie nicht nutzen` over `frontend/src`, `rules/src`, `backend/app`, `backend/tests`, `mcp/src`, `mcp/plugin`, `api-types/src`: no hit. No other text used "inzwischen"; `mcp/` had no German hit.

1. Counts per state × measure

| run | rows | pass | fail | unsure |
|---|---|---|---|---|
| T086's text check (copy in `<SP>/pairs-T099/`, collectors rerun on the working tree) | 156 pairs × 8 checks | as T086 except copy_md 85 pass (was 81 + 4 flags, fixed by copy.md §2's ’) | glossary 5 flags (the same 5 keys, all T086's false positives) | 8 (the same rows) |
| T093 `group-question`, de × 1440/320/160 × Chromium/Firefox (`out-rerun-T099`) | 192 | 192 | 0 | 0 |
| T091 `dialog-changed`, de × 1440/320/160 Chromium, 320/160 Firefox (`rerun-T099`, run with `sweep-T099.mjs`) | 232 | 232 | 0 | 0 |

T093: `dialog_title` 6/6 pass with copy.md §5's new title "Daten der Gruppe „Fahrerlaubnis“ aus „Führerschein“ nicht mehr anfordern?"; `label_width` 30/30, `clipped` 6/6, `horizontal_scroll` 6/6 pass (the title is an `h2` that wraps; no label_width row measures it). T091: `live_region` 25/25 with "… wurde in der Zwischenzeit gelöscht oder geändert.", `label_width` 15/15, `clipped` 5/5, `dialog_lines` 5/5 pass.

2. Defects: none.

3. Unsure rows / notes read:
- T086 check, `CONNECTION_DETAIL_COPY.scheduledText` glossary flag: before "missing G§2 add" (false positive), now also "missing copy§1 scheduled → geplant". Verdict pass: §3's corrected sentence deliberately says "an dem unten angegebenen Datum" (the date shown below), no new flagged row.
- The first T091 run with the unchanged `sweep.mjs` timed out in all 5 cells (its reach waits for the old German "inzwischen" sentence, line 41 and 339); not a defect of the page. `sweep-T099.mjs` is that script with the two strings changed to "in der Zwischenzeit".
- Not rerun: the server's German (`BECAME_ACTIVE_TEXT`, `START_DATE_CHANGED_TEXT`, `selection_changed`) needs the 3016 backend restarted; T090's approval page script skipped for that reason.

4. Cited rows: English unchanged (no English text changed); T091's and T093's tables in §2.1 cover English in Chromium.

#### T100: nothing else changed (quickstart V15; FR-073–FR-076, SC-011) — 2026-11-12

Report only; no repository file changed. Checked on the tree of phases 1–11 (commit `60a3c56`)
plus phase 12's uncommitted work (T098, T106, T099). Main installation: backend 3016 on
`konnekt_db_010_p12` (fake EUDIPLO, `WORKER_ENABLED=false`), MCP server 3102. No browser, no
screenshot. Scripts and outputs in `<SP>/T100/` (`run.mjs`, `search.py`, `cleanup.mjs`,
`taskfiles.py`, `hunks.py`, `v152.txt`, `search-out.txt`, `backend-slice.log`, `mcp-slice.log`,
`root-gate.log`, `backend-gate.log`, `test-diffs.patch`).

Data made (all deleted at the end; the token revoked): `p10-alice`: `T100 run 20261112T1… Anwohnerparkausweis`
(`fb8b231d-f4ad-4470-9f9a-6151138ebf92`), `T100 run … Agent Anwohnerparkausweis`
(`da3e4b4a-b489-4c60-8d19-b458f744a866`), token `T100 manage`; `p10-bob`: `T100 run …
Personenbeförderungsschein A` / `B` (`92f49c1e-…`, `941a4a04-…`, bulk deleted), the example draft.
Exact names and ids: `<SP>/T100/state.json`.

| check | rows | result |
|---|---|---|
| V15.1 gates and test counts | 7 | pass |
| V15.1 existing test files traced | 26 | 10 file × phase changes named by no task line or plan change (mechanical; see below) |
| V15.2 `/api/connect/` | 3 | pass (one note: two assertions folded into a loop, expectation unchanged) |
| V15.3 logs of a scripted run | 6 | pass: 0 hits |
| V15.4 forbidden texts | 9 | pass (the "Message … reads" rows are the test step's column head, judged pass) |

## V15.1 Gates and counts (SC-011)

| gate | result | counts (baseline T001 → now) |
|---|---|---|
| `npm run lint` | pass | |
| `npm test` rules | pass | 2642 → 2664 (46 files) |
| `npm test` frontend | pass | 1267 → 1573 (36 files) |
| `npm test` mcp | pass | 408 → 510 (15 files) |
| `npm run build` | pass (the known > 500 kB chunk warning) | |
| Ruff check + format, mypy | pass (109 files unchanged; mypy 95 source files) | |
| `export_check_fixtures --check` | pass | |
| pytest (full, `konnekt_db_test`) | pass, 0 failed, 0 skipped (855 s) | 2161 → 2557 |

## V15.1 Existing test files changed since `main` (26; `TestStep/PersonaData.tsx` and `TestStep/index.tsx` match "test" but are components)

Kind: **add** = cases or fixture fields added only; **exp** = an expectation changed (named with its requirement); **sig** = a call gained an argument a service now takes (`actor=`).

| file | phases | task(s) | requirement | kind of change |
|---|---|---|---|---|
| backend/tests/api/test_agent_principal.py | 11 | T079 (plan change, §5 phase 4 note) | FR-065–FR-068 | add (new endpoints in ENDPOINTS; docstring) |
| backend/tests/api/test_approval_requests.py | 2, 6, 11, 12 | T011 (p2), T040–T042 (p6, plan changes), T079 (p11), T099 (p12) | FR-018/FR-025–FR-029 (dates move on deactivate/reactivate, carried from T008), FR-034–FR-036 (restore by the endpoint, STEPS), FR-065–FR-067, FR-071 | add; exp: `is_active` comparisons → dates (FR-018, T011); `_restore_by_hand()` → endpoint (T041); `STEPS[-1]` (T042); German cancel texts "inzwischen" → "in der Zwischenzeit" (FR-071, T099) |
| backend/tests/api/test_connect.py | 4, 6, 8 | T019, T040, T054 | FR-075, FR-033 | add; two asserts of the deleted draft's pull folded into a loop with the branch URL (same 404 `REQUEST_NOT_FOUND`, T040) |
| backend/tests/api/test_form_connection_drafts.py | 2, 6, 9 | T011, T040, T041 (plan change), T063 | FR-033/R5 (deleted rows stay marked), R4 | exp: deleting a draft answers the deletion and keeps the row marked deleted (FR-033, R5); `published_shape()` leaves out the new dates and `last_activity` (T011); sig |
| backend/tests/api/test_form_connection_maintenance.py | 2, 6 | T011, T040 (plan change) | FR-033 | exp: delete answers `{id, restorable_until}` (FR-033); the failed-commit hook finds revision 2 (T011 note); sig |
| backend/tests/api/test_form_connection_rules.py | 2 | **none** (T011's signature change) | R4 | sig (3 lines) |
| backend/tests/api/test_form_connection_search.py | 2, 4, 9 | **p2 none** (T008's summary keys), T022 (p4), T063 (p9, plan change) | FR-062 | exp: the status filter takes `scheduled`; `deactivated` no longer matches a scheduled row (FR-062, T022); add: summary keys |
| backend/tests/api/test_form_connections.py | 2, 8, 9, 10 | T008, T054 (plan change), T063 (plan change), T072 (plan change) | FR-045, FR-077/FR-078 | exp: documents stored in the chosen order, not catalog order (FR-045, T054); `_field()` gains `group` (FR-078, T072) |
| backend/tests/api/test_language.py | 10 | T072 | FR-077, FR-078 | add |
| backend/tests/api/test_oauth.py | 6 | T042 (plan change) | FR-036, R5 | exp: `STEPS` slice shifted by the new last step |
| backend/tests/api/test_worker_requests.py | 4, 6 | T021 (p4, plan change); **p6 none** | FR-005; FR-036 | add (`STEPS` gains the activation step, then `finish_deletions`) |
| backend/tests/unit/test_catalog.py | 10 | T072 | FR-077, FR-078 | add; the label comparison excludes `group` |
| backend/tests/unit/test_check_fixtures.py | 9 | T065 | FR-056 | add (docstring) |
| frontend/src/pages/Approval/utils.test.ts | 2, 9, 11, 12 | **p2 none** (T008/T010 fields), T063 batch (p9, plan change), T080 (p11), T099 (p12) | FR-065–FR-067, FR-071 | add; exp: `connection_changed` texts split by what changed (FR-065/FR-066, T080); German "in der Zwischenzeit" (FR-071, T099) |
| frontend/src/pages/FormConnectionDetail/utils.test.ts | 2, 3, 4, 5, 6 | **p2 none**, T015, T025–T027, T032–T034, T043 | FR-022 | add; exp: `initialAccordionOf('saved')` → links (FR-022, Clarification #34, T034) |
| frontend/src/pages/FormConnectionEdit/utils.test.ts | 2, 4, 9 | **p2 none**, T028 (p4), T063 batch (p9, plan change) | FR-009, FR-013 | add |
| frontend/src/pages/FormConnectionEditor/DocumentsStep/reducer.test.ts | 8 | T056, T058 | FR-045, FR-048, FR-049 | exp: undoing a removal puts the document back at its place in the stored order, not the catalog's (FR-045/FR-049) |
| frontend/src/pages/FormConnectionEditor/DocumentsStep/utils.test.ts | 8, 10, 12 | T056–T058, T073, T099 | FR-045, FR-047, FR-071, FR-077 | exp: `indexAfterAdding` by catalog order removed (FR-045); German "Daten der Gruppe … aus „Führerschein“" (FR-071, T099); add |
| frontend/src/pages/FormConnectionEditor/leaveFlow.test.ts | 4 | T028 | FR-013 | add (imports) |
| frontend/src/pages/FormConnectionEditor/utils.test.ts | 2, 4, 8, 9, 10 | **p2 none**, T024, T056, T068, T074 | FR-001–FR-004, FR-045 | add |
| frontend/src/pages/FormConnectionList/utils.test.ts | 2, 3, 4, 6, 7, 9, 12 | **p2 none**, T013, T027, T043, T047, T049, T067, T063 batch (p9), T106 (p12) | FR-017, FR-019–FR-021, FR-043 | exp: `rowMetaOf` "Edited <date>" → the state's date (FR-017/FR-019, T013); bulk dialog state gains `stale` (FR-043, T106); add |
| mcp/src/draftEdit.test.ts | 2, 9 | **p2 none**, T063 batch (p9, plan change) | — | add (fixture fields) |
| mcp/src/guidance.test.ts | 11 | T081 | FR-065, FR-066 | exp: `APPROVAL_ACTIONS` gains the date actions |
| mcp/src/views.test.ts | 2, 3, 4, 5, 9 | T008, T016, T029, T035, T069 | FR-062 | exp: a deactivated connection is read from `state` (FR-062, T008) |
| mcp/test/fakeBackend.ts | 2, 4, 8, 9, 10, 11 | T008, T010, T029, T060, T063, T069, T072, T078, T081 | FR-062 ff. | add (fixtures; 37 lines replaced by the state's fields) |
| mcp/test/server.test.ts | 3, 4, 5, 8, 9, 10, 11 | T016, T029, T035, T060, T069, T075, T081 | FR-062, FR-065 | exp: the search's second page holds 4 items (T029's scheduled fixture); the `connection_changed` sentence split (FR-065, T081) |
| rules/src/edits.test.ts | 8 | T055 | FR-045 ff. | add |

Changes no task line or plan change names (all mechanical, no expectation of earlier behaviour changed):
phase 2's fixture fields (`state`, the dates, `last_activity`, `step`) in
`frontend/src/pages/{Approval,FormConnectionDetail,FormConnectionEdit,FormConnectionEditor,FormConnectionList}/utils.test.ts`
and `mcp/src/draftEdit.test.ts` (required by T008's and T010's type mirrors);
`backend/tests/api/test_form_connection_rules.py` (`actor=`, T011's signature) and
`test_form_connection_search.py`'s summary keys (T008); phase 6's `finish_deletions` line in
`test_worker_requests.py` (T042).

## V15.2 `/api/connect/` (FR-075)

| row | result |
|---|---|
| `test_connect_branches.py` vs `main` | no change |
| `test_connect.py` vs `main` | +158 / −4: two import lines extended (`FormConnection`, `start_dates` added to existing `from … import` lines), and in `test_a_deleted_drafts_urls_are_not_found` (phase 6) two asserts folded into `for response in (pull_response, branch_response)` with the same `404` / `REQUEST_NOT_FOUND` |
| the pinning test | `test_connect.py::test_a_scheduled_connections_urls_answer_as_a_deactivated_ones` (status 409 and `content` and content-type equal, `UNAVAILABLE`, nothing started) |
| live, `P3 seed scheduled` vs `P3 seed deactivated` | `POST …/requests` and `GET …/requests/made-up-reference`: both 409, `content-type: application/json`, `content-length: 82`, `{"error":"unavailable","message":"This form connection is deactivated or deleted"}`; byte for byte identical but for the id (`<SP>/T100/v152.txt`) |

## V15.3 Logs of a scripted run (FR-073)

Run between `=== T100 start … ===` and `=== T100 end … ===` in `<SP>/backend-3016.log` (25 lines)
and `<SP>/mcp-3102.log` (3 lines): sign-in of both accounts; alice: draft with a rule message
"T100 rule text Sonnenblume", publish scheduled 2026-12-14, start date moved to 2026-12-21,
deactivate, delete, restore by the deletion id; bob: two live connections, bulk delete, the
example; alice: token level manage; MCP `move_document` on a draft, `request_approval` publish on
2026-12-28, approved by alice through the API. Afterwards the agent's draft is scheduled for
2026-12-28 with `documents_changed` in its activity, and the first one's activity lists
`restored, deleted, deactivated, start_date_changed, scheduled, published, …`.

| search | hits |
|---|---|
| the four names, the stamp, the example's name, "Anwohnerparkausweis", "Personenbeförderungsschein" | 0 |
| `p10-alice`, `p10-bob` (also "alice", "bob") | 0 |
| 2026-12-14 / 14.12.2026, 2026-12-21 / 21.12.2026, 2026-12-28 / 28.12.2026 | 0 |
| "Documents changed", "Dokumente geändert", "Start date changed", "Published", "Veröffentlicht", "Deactivated", "Restored" | 0 |
| "T100 rule text Sonnenblume", "Sonnenblume", the token's name | 0 |
| query strings in the backend slice | 0 (no search or activity read was made) |
| MCP lines with keys other than `method`, `tool`, `status`, `durationMs` | 0 of 3 |

Token revoked (`DELETE /api/agent-access/<id>` 200, no longer listed); rows deleted (200 each).

## V15.4 FR-076's texts

Sweeps' `forbidden_text` rows: T087 3221 pass / 19 fail, T088 1440/0, T089 1152/0, T090 1536/0,
T091 1440/0, T092 950/0, T093 720/0, T095 720/0, T096 1195/5 (T094 measures toast times only, no
`forbidden_text`). Reruns: T087 `rerun` 120/0, `rerun-alert` 118/2, `rerun-T106` 717/3; T088
`out-rerun-main` 768/0; T089 `rerun-alert` 96/0; T090 `rerun-alert-T098` 64/0; T091 `rerun-alert`
30/0, `rerun-thirty` 40/0, `rerun-T099` 50/0, `rerun-T106` 240/0; T092 `rerun-fix` 360/0,
`rerun-moved1` 10/0; T093 `out-rerun-T099` 60/0; T096 `rerun` 358/2. Every one of the 31 fails is
"Message … reads" found as a `th` "Message <first name> reads": the test step's column head
(`TestStep/ResultTable.tsx`, `rules/src/personas/messages.ts` `messageColumn`) for a persona who
does not meet a variant; FR-076 excludes the box only for a persona who meets every rule
(Clarification 2026-11-10 #8). Judged pass by T087 (tables/T087.md, publish states), T096
(tables/T096.md, test and publish-dialog), kept by T098 and T106. No other FR-076 text was found
by any sweep.

`grep` of the built `frontend/dist` (after the root gate's build) and `frontend/src`:

| text | dist | src | why allowed |
|---|---|---|---|
| Draft changes | — | comment in `FormConnectionEditor/index.tsx:1613` ("never 'Draft changes'") | a comment |
| Keep draft and exit | — | — | |
| Changes not published | — | — | |
| Download PDF | — | comments in `FormConnectionDetail/RulesSummary.tsx:18`, `ConnectionDetails.tsx:81` ("isn't built") | comments |
| Draft kept. | — | — | |
| coming soon | — | comment in `DocumentsStep/SearchCard.tsx:43` ("no 'Coming soon'") | a comment |
| Group with other rules | 1 (the rule menu's entry) | `RulesStep/constants.ts:282` `groupWithOthers`, used only by `RuleMenu.tsx:30` | FR-076 forbids it on a group's ⋯ menu; `GroupMenu.tsx` doesn't offer it (its comment: not built, CLAR #64); the rule's own menu keeps it (spec 008) |
| Message … reads | 1 (`Message ${e} reads`) | `rules/src/personas/messages.ts:102` `messageColumn`; German "Nachricht für ${e}" | the test step's column head for a persona who doesn't meet a variant (spec 004), Clarification #8 |

Open rows: none.

## 3. The German review

T097 (phase 12, 2026-11-12). **Who reviewed**: the coordinator, by the user's choice ("Claude's
pass now, person later"); a German-speaking team member's read of the nine items' German screens
is still open (tasks.md, phase 12 "Needs a person"), so T097 stays unchecked until then. **What was
read**: all 156 new pairs of T086 (`<SP>/pairs/T086.csv`: 135 new keys, 13 renamed, 8 from
`example.py`; 0 with changed English), its 4 flags, 5 false positives, 8 unsure rows and its 13
"Carried to the review" items, with spec 009's glossary and `contracts/copy.md` at hand. **Kept
after reading** (no correction): the scheduled pill's no-break space (T014); "TT.MM.JJJJ" (T023);
the leave dialog's "Wenn Sie jetzt gehen, gehen Ihre Änderungen verloren." (spec 009's own
sentence for the active version, word for word); "erneut fragen" for an agent (spec 009's
"Der Agent kann erneut fragen."); "auf Position" in the move texts; "Rule 01 und Rule 02" in the
example's banner (the example's rules are named `Rule 01`, `Rule 02` in both languages,
`example.py`); "von Standard" (the main variant's name); the server's straight apostrophe in
`START_DATE_CHANGED_TEXT` (§4.2 T080). **Records changed by T097**: `contracts/copy.md` §2's four
English sentences now write ’ in "can’t", "don’t", "won’t" as the code and the frames do (T086's
four flags; the code was right), and the German rows below; spec 009's glossary's stray cell moved
back from the row "connection URLs" to the row "the rule editor's field error “Enter a whole number
greater than 0.”" (§4.3, T002's finding). The glossary's terms are unchanged: the corrections make
this feature's German follow its "in the meantime" → "in der Zwischenzeit" (row 101), which
copy.md §4, §7 and §8 had written as "inzwischen". T099 applies the rows.

| where | english | german before | german after | glossary changed? |
|---|---|---|---|---|
| `frontend/src/pages/FormConnectionDetail/constants.ts` `CONNECTION_DETAIL_COPY.scheduledText` | "The links are ready to be added to your service. They become active on the scheduled date below." | "Die Links können bereits in Ihren Dienst eingefügt werden. Sie werden am geplanten Datum unten aktiv." | "Die Links können bereits in Ihren Dienst eingefügt werden. Sie werden an dem unten angegebenen Datum aktiv." | no |
| `frontend/src/pages/FormConnectionEditor/constants.ts` `PUBLISH_DIALOG_COPY.saveScheduledIntro`; copy.md §2 | "Your changes become active with the connection on <date>. Citizens can’t use it before then." | "Ihre Änderungen werden mit der Anbindung am <date> aktiv. Vorher können Bürgerinnen und Bürger sie nicht nutzen." | "Ihre Änderungen werden mit der Anbindung am <date> aktiv. Vorher können Bürgerinnen und Bürger die Anbindung nicht nutzen." ("sie" read as the changes) | no |
| `frontend/src/pages/FormConnectionEditor/DocumentsStep/constants.ts` `REMOVAL_DIALOG_COPY.groupTitle`; copy.md §5 | "Stop requesting “<group>” data from <document>?" | "Felder der Gruppe „<group>“ aus <document> nicht mehr anfordern?" | "Daten der Gruppe „<group>“ aus „<document>“ nicht mehr anfordern?" ("data" is "Daten", and the document quoted as spec 009's "Alle Daten aus „<document>“ nicht mehr anfordern?"; §4.3's point) | no |
| `frontend/src/pages/Approval/constants.ts` `APPROVAL_COPY.connectionBecameActive`; `backend/app/services/approvals.py` `BECAME_ACTIVE_TEXT`; copy.md §7 | "The connection became active in the meantime." | "Die Anbindung ist inzwischen aktiv geworden." | "Die Anbindung ist in der Zwischenzeit aktiv geworden." | no (follows row 101) |
| `frontend/src/pages/Approval/constants.ts` `APPROVAL_COPY.connectionStartDateChanged`; `backend/app/services/approvals.py` `START_DATE_CHANGED_TEXT`; copy.md §7 | "The connection’s start date changed in the meantime." | "Das Startdatum der Anbindung wurde inzwischen geändert." | "Das Startdatum der Anbindung wurde in der Zwischenzeit geändert." | no (follows row 101) |
| `frontend/src/pages/FormConnectionList/constants.ts` `BULK_DELETE_COPY.changed`; copy.md §4 | "Nothing was deleted: “<name>” was deleted or changed in the meantime." | "Nichts wurde gelöscht: „<name>“ wurde inzwischen gelöscht oder geändert." | "Nichts wurde gelöscht: „<name>“ wurde in der Zwischenzeit gelöscht oder geändert." | no (follows row 101) |
| `backend/app/services/deletions.py` `SELECTION_CHANGED_MESSAGE`; copy.md §8 | "Nothing was deleted: a connection was deleted or changed in the meantime." | "Nichts wurde gelöscht: Eine Anbindung wurde inzwischen gelöscht oder geändert." | "Nichts wurde gelöscht: Eine Anbindung wurde in der Zwischenzeit gelöscht oder geändert." | no (follows row 101) |

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
- **T038, the deletion toast's kind** (the user, 2026-11-11, phase 6): the inventory and spec 008
  disagreed. Frame P18's toast (`6699:48098`, `figma-audit/units/U90.md` row 25) and Figma's build
  note 24 (U05 `6720:39042`, row 22: "Danger (red, delete icon): anything deleted or removed")
  draw a red toast with the white delete icon, and FR-033 and FR-070 say "as drawn". Spec 008
  built every deleted or removed toast neutral (its T036 and T082 UNCERTAIN; its designer list
  #13), so `ToastKind` has `neutral` and `success` only. **Decided: a third kind `danger`** for
  this feature's deletion toasts, as Figma's "Rules/Toast" type=danger (`6718:40958`) draws it:
  fill `feedback/danger` `#c4271c` (white text 5.75:1), the white "delete" icon 20 px 8 before the
  text where the success kind has its check, otherwise the neutral toast's anatomy (radius 8,
  padding 16, gap 24, the action, the error ID line, 6 s, the narrow rules). It serves "“<name>”
  deleted." (T043), "<n> connections deleted." (T049, US5) and, when US6 touches the documents
  step, "<document> removed." (U24 `7298:62627`, T056). The other toasts of the restore follow
  build note 24's classes: "“<name>” restored." and "<n> connections restored." are `success` (a
  finished action, like "active again"); "… can no longer be restored." and "Couldn’t restore.
  Try again." are `neutral` (like "couldn’t save (with Retry)"). **Remaining difference**: spec
  008's variant and rule deletion toasts in the rules step (U61 `6523:37991`, U35 `6113:29469`)
  stay neutral, outside the nine items (FR-070); for the designer list. **Plan change**: T043's
  files gain `frontend/src/components/Toast/{ToastMessage.tsx,utils.test.ts}` (the icon and its
  test) and a white delete icon (a new `frontend/src/assets/icons/delete-white.svg`, or KERN's
  icon if one fits), beside the `types.ts` and `constants.ts` its line already names.
- **T039, the migration `9e7546ab2057`** (T039's UNCERTAIN 1; the coordinator, phase 6): the
  downgrade deletes a deleted draft's (`published_at IS NULL AND deleted_at IS NOT NULL`)
  `form_connection_revisions`, then its row (its activity cascades); a draft has no rule sets,
  branches or document requests, so nothing else. The FK is PostgreSQL's default name
  `form_connections_deleted_by_id_fkey`, as the other FKs. Kept.
- **T040, marking a deletion** (T040's UNCERTAIN 1–10; the coordinator, phase 6): (1) the
  stored cancellation sets `decided_at` to the deletion's time, as `cancel_for()` does, so
  `delete_old_approval_requests` removes such a request a day after the deletion (at most 10
  minutes before it did); (2) only requests that read as waiting just before the deletion are
  stored `cancelled` (status `waiting`, not expired, `authorization_id` set, an action of the
  connection's kind; the status actions derived from `ACTION_LEVELS`), so every other request
  reads as before; (3) an approval-run deletion has `deleted_by_id` NULL too (FR-067; the approver
  is in the `deleted` entry); (4) the router makes the UUID and passes the account, the services'
  arguments default to None; (5) `_mark_deleted()` returns the open-request count so that the
  existing log line stays, and no log line is new; (6) `approvals.cancel_for_deletion()` is
  imported inside `_mark_deleted()` (the import cycle, as `activity.py`); (7) the approval page
  reads a deleted draft as gone (no name, no draft) and a deleted published connection with its
  name, as before; (8) `cancel_open_requests()` runs for a draft too (it has none); (9)
  `test_deleting_a_draft_removes_it_for_good` is now
  `test_deleting_a_draft_marks_it_deleted_and_removes_it_from_every_read`; (10) the two
  approval-cancelling UPDATEs could deadlock on shared rows as the existing replaced/`cancel_for`
  pair can (PostgreSQL aborts one). Each reader that hides a marked draft is pinned by a test that
  fails when the reader is broken (T040 broke 16 readers and conditions one at a time). **Plan
  changes**: T040's files gained `backend/app/models.py` (comments only, carried from T039) and
  `backend/tests/api/test_form_connection_maintenance.py` (`test_deleting_stops_the_urls_for_good`
  pinned `data: None`); T041's gain `backend/app/services/form_connections.py` and
  `backend/tests/api/test_form_connection_drafts.py` for the guard against a draft deleted and
  restored while its publish is in flight (T040's hazard, carried to T041). Kept.
- **T041 and T042, the restore and the worker's finish** (their UNCERTAIN 1–9; the coordinator,
  phase 6): (1) the restore's success message is `'Deletion restored'` (English, as the other
  success messages; the contract names none); (2) `RestoredConnections.items` come in the
  overview's order (`updated_at` desc, then id); (3) the reservation guard (`_check_reservation()`
  under `create_revision()`'s last lock) answers `404` and deletes the configuration, except when a
  later publish has reserved the same number since (configuration ids are `fc-<id>-r<n>`, so that
  configuration is the later publish's): see §4.3 for the window it leaves; (4) the clock seams
  are `deletions._now()` and `worker._now()`, and `delete_unused_config()` takes the step's cutoff
  rather than a fresh clock (the step's clock is at or before the lock, the restore reads its
  clock after its locks); (5) `FINISH_BATCH_SIZE = 100`, batches until one comes back short, the
  log line only when a count is non-zero; (6) a deletion an approval ran becomes final after the
  same restore time, not at once; (7) the restore logs the deletion id and the row count, refusals
  nothing; (8) `deletions.py` uses `form_connections._summary()` across modules, as `drafts.py`
  uses `_lock_form_connection()`; (9) see the plan changes. Each condition is pinned by a test that
  fails when it is broken (16 mutations, T041's report). **Plan changes**: T041's files gained
  `backend/tests/api/test_approval_requests.py` (`_restore_by_hand()` replaced by the real
  endpoint, as T040's note asked); T042's gained `test_approval_requests.py` and
  `backend/tests/api/test_oauth.py`, whose `STEPS` pins count from the end (`STEPS[-2:]`,
  `STEPS[-7:-2]`). Kept.
- **T043, "Undo" on the overview** (T043's UNCERTAIN 1–10; the coordinator, phase 6): (1) the
  restore's answer replaces the toast and its button, so a focus that fell to `body` goes to the
  page's h1, as after a deletion; (2) only `409 not_restorable` is final, every other failure (no
  answer, a 5xx with its error ID, another 4xx) offers "Undo" again with "Couldn’t restore. Try
  again."; (3) a restore that answers while the list is loading or failed loads the list again;
  (4) an older restore answering after a newer deletion replaced its toast puts its rows back and
  shows no toast; (5) a restore sent before its toast closed still shows its answer (FR-034); (6)
  under 320 CSS px every overview toast, sticky at the page's end, covered the footer bar's lower
  32 px (spec 008's slot `-mb-48`, before this feature): `OVERVIEW_FOOTER_CLASSES.slot` gains
  `narrow:mb-0`, measured without overlap at 160 and 320 CSS px; (7) `OverviewDeletion.names` is an
  array and the toast names the first: T049 adds the plural sentences; (8) the toast's text is built
  at render time, so it follows a language switch while it shows (not announced again); (9) every
  account sees the team's connections, so "the last connection" was reached by narrowing the
  list's `GET` with `page.route()`, the delete and the restore going to the server; (10) the
  kind-to-icon map is `TOAST_KIND_ICON` in Toast's `constants.ts`, tested in `utils.test.ts`;
  `OverviewDeletion` is a named interface in `routing.ts`. The danger toast's icon is Figma's "Icon
  · delete" from `6699:48098`, unchanged (`frontend/src/assets/icons/delete-white.svg`). Kept.
- **T044, the walk V7** (T044's UNCERTAIN 1–5; the coordinator, phase 6): the walk's connections
  were made through the API, every deletion and "Undo" through the UI; V7.3 ran as `p10-alice`
  with T043's `page.route()` (the account makes no difference, every account sees the team's
  connections); "Couldn’t restore. Try again." and a 5xx's error ID are not part of V7 (T043's
  table holds them); the connection URLs were called on 3011 by id (the stored URLs point at the
  public base, and the JSON comparison shows them unchanged); V7.5 passes for 5.9–6.6 s counted
  from the toast's appearance. Kept.

- **T046, the bulk deletion** (T046's UNCERTAIN 1–9; the coordinator, phase 7): (1) an empty
  list, more than 500 items and an id listed twice fail in `DeletionCreate` and get the app's
  generic `400 { error: 'Validation error', message: 'Invalid request payload' }`
  (`RequestValidationError`, `errors.py`), as a malformed date does; no new copy; (2) the service
  makes the deletion's UUID (the bulk deletion is browser-only, so no approval path needs
  `id: null`); (3) `restorable_until` is the earliest row's (`_mark_deleted()` reads the clock per
  row), which is when the all-or-none restore stops; (4) `changed_ids` lists every changed item in
  the request's order, ids no longer in the database included, so the dialog names
  `changed_ids[0]` from its own rows; (5) the success message is `'Form connections deleted'`;
  (6) `SelectionChanged extends ApiErrorResponse` in `api-types/src/form-connections.ts` types the
  409 body (no Pydantic schema, the backend raises an `HTTPException` detail); (7) one log line
  with the deletion id and two counts, a refusal logs nothing; (8) the route sits before
  `/{form_connection_id}`, though no single-segment `POST` route could collide (R15 V4 tested by
  `GET`/`PUT`/`DELETE /deletions` answering `404`); (9) the bearer's `403 browser_only` is tested
  in `test_deletions.py`; `test_agent_principal.py`'s endpoint matrix (which lacks phase 6's
  restore too) is not extended, not carried. The rows are locked in one `SELECT … ORDER BY id FOR
  UPDATE` with `populate_existing`, the states read under the lock; 17 mutations (lock order,
  each check, all-or-none, the limits, the guards) each failed a test, three of them in race tests
  with real sessions (two overlapping bulk deletions, a bulk deletion against a restore, a
  deactivation holding the lock). The frontend has no 500 cap: a selection of more than 500 rows
  gets the generic 400 (carried to T049). Kept.
- **T047 and T048, the selection and its bar** (T048's UNCERTAIN 1–9; the coordinator, phase 7):
  (1) the list's column header now stays at every width so that the select-all stays: below the
  rows' wrap point it keeps the select-all and "Name", "Status" and "Date" hide (the labels are
  `aria-hidden`, the checkbox not); (2) the row's wrap breakpoint moves from 58rem to 63rem (the
  checkbox adds 44 px; rows need 1005 px), and the card's `min-h` from 123 to 127; (3) a wrapped
  row keeps its checkbox top-left with the parts beside it, at 320 the delete button drops to its
  own line, and below 320 CSS px (`narrow:`) the checkbox takes its own line above the parts (at
  160 words otherwise broke mid-word and "Edit" overflowed); (4) the checkbox's target is a
  24 × 28 px `<label>` around the 20 px box with −2 px side margins, so the name stays at x 229 as
  drawn; (5) the bar's `role="status"` paragraph stays in the page, empty and `sr-only`, while
  nothing is selected, so the first "1 selected" is announced (a screen reader once is for a
  person, phase 7 "Needs a person"); (6) "Cancel" moves the focus to the search field; after a
  deletion through the bar the existing rule moves it to the h1; (7) `prune` runs only while the
  list is loaded, over the rows the search shows, so a reloading list keeps the selection until it
  is back; the search can't change while rows are selected (the bar hides it); (8) `toggleAll`
  makes the selection exactly the listed rows, and with nothing listed the select-all is
  disabled; (9) the selection is a `ReadonlySet` of ids, and an action that changes nothing
  returns the same state. The toolbar stays mounted while hidden (`SearchToolbar`'s `hidden`), so
  the search text survives and the count still names the list. Kept.
- **T050, the local-drafts banner** (T050's UNCERTAIN 1–2; the coordinator, phase 7): the banner
  matches 1m and 1n in both languages at 1440, 320 and 160 CSS px with no change; the 160 rows
  were read with a 160 CSS px viewport (the MCP can't zoom), and the focus ring "after a click"
  with a press released off the button, as earlier tasks did. At 160 CSS px the English "Resume
  editing" wraps to two lines without clipping (match). Kept.
- **T049, the bulk delete dialog** (T049's UNCERTAIN 1 and 3–7, its German and its copy note;
  the coordinator, phase 7): (1) the warning lines carry the frame's own "Icon · warning"
  (`frontend/src/assets/icons/warning-amber.svg`, unchanged), not KERN's rounded
  `kern-icon--warning`; (3) the lines and warnings scroll inside the dialog (a region named after
  the title, focusable only while it scrolls) where the window leaves them at least 120 px
  (`BULK_DELETE_MIN_REGION`, the measured cap set as the CSS property `--bulk-delete-max`, as
  `WizardLayout` does); where it would get less, the region keeps its height and the whole dialog
  scrolls, as the overview does at 200 % zoom: at 1440 and 320 CSS px the buttons stay in view with
  2 or 30 rows, at 160 CSS px and at 320 with a failure alert they are reached by scrolling the
  dialog, the focused button scrolled into view (W12's "buttons stay in view" read for the heights
  that allow it); (4) after `409 selection_changed` the list reloads quietly (no skeleton, a failed
  reload ignored but a 401), so the selection bar stays mounted and the dialog returns the focus to
  its "Delete"; a `listVersion` counter drops a stale reload's answer; (5) when that reload empties
  the selection, closing the dialog puts the focus in the search field, or on the h1 when the page
  fell back to the welcome page; (6) a line wraps the pill under the name when the name would get
  less than 120 px beside it, and always below 320 CSS px; (7) a selection of more than 500 rows
  shows the server's generic 400 as another failure (T046's note), covered by
  `bulkDeleteFailureOf`'s test, not tried in the browser. The single-name toasts of phase 6 stay
  for one connection; `deletionToastOf` uses the plural sentences for more than one name. The
  German T049 wrote where copy.md gives none: "<n> Anbindungen löschen?", "Die Dokumente und Regeln
  der Anbindungen werden ebenfalls gelöscht.", "Anbindungen behalten" / "Anbindungen löschen", the
  active warning "<name> ist aktiv. Bürgerinnen und Bürger können sie dann nicht mehr nutzen." (the
  single delete dialog's German) and the plural failure title "Die Anbindungen konnten nicht
  gelöscht werden" (for T097's review). copy.md §4's "won't" in the scheduled warning and the
  active line became "won’t", as the frame draws it. **Plan change**: T049's files gained
  `frontend/src/assets/icons/warning-amber.svg`. UNCERTAIN 2 is open (§4.3). Kept.
- **T051, the walk V8** (T051's UNCERTAIN 1–4; the coordinator, phase 7): V8.5's "another tab"
  is the page's own session deactivating the row through the API while the dialog is open, as
  T049 did; V8.6 ticks the ten checkboxes one by one (the slowest way) and measures in Node until
  the toast's sentence appears; V8.7's two local drafts were made through the UI (a name typed in
  the create flow, a description changed in the edit flow, then a navigation with `beforeunload`
  accepted) and the banner's dates checked against the records' `changedAt`; the walk left V8.6's
  deletions standing and V8.5's row deactivated. The warning lines were compared with "won’t", as
  copy.md §4 now reads. V8.5's "Try again" was recorded as built (§4.3, for T084). Kept.
- **T053 and T054, the stored order** (their UNCERTAIN 1–4; the coordinator, phase 8): the
  migration `e7ebbd07dc57` adds `form_connections.document_order` (`JSONB`, not null, server
  default `'[]'::jsonb`, no backfill); applied to `konnekt_db` and `konnekt_db_010_p8`, its
  downgrade run once on the copy. (1) Under the row lock, `update_form_connection()` writes the
  order only when the stored documents still equal the sent ones (compared without their order),
  so a stale order never overwrites a newer save's; (2) `create_revision(…, document_order=)`
  writes the order only when its revision becomes current; (3) `ordered_documents()` puts a
  document whose type the catalog no longer has last, in input order, unless the stored order
  names it, and skips a key listed twice or one the documents don't hold; (4) the order is written
  only when it differs, so an unchanged save leaves `updated_at` as before, and a reorder-only save
  moves it, as a rename does. Stored order (FR-050): `_view()`, `draft_view()` and through them
  the approvals' preview, the activity's content (`_current_content()`, `stored_draft_content()`:
  a move records `documents_changed`) and `publish_stored_draft()`'s body. Catalog order (FR-051):
  `clean_documents()` (the draft's content, every revision), `dcql.build_config()` and the
  `config_hash`, `resync_config()`, `document_requests` and the delivery. A published connection's
  reorder-only `PUT` answers `200` with the new order, creates no revision, calls no EUDIPLO and
  writes one `documents_changed` entry. **Plan change**: T054's files gained
  `backend/tests/api/test_form_connections.py` (`test_documents_are_stored_in_catalog_order`
  became `test_documents_are_answered_in_the_order_sent`) and `backend/tests/api/test_activity.py`
  (`test_a_put_without_a_change_records_nothing` reverses each document's fields instead of the
  documents, since a reversed list is now a change): both pinned the catalog order FR-045 changes.
  For phase 9: whatever creates the example stores `document_order` too (`document_order_of()`).
  Kept.
- **T055, the moves in `edits.ts`** (T055's UNCERTAIN 1–7; the coordinator, phase 8):
  `appendDocument()` and `restoreDocument()` return a plain array (they never refuse); only
  `moveDocument()` returns a result (`DocumentsResult<D>`, the other refusals' shape); all three
  are generic over `{ document_type }`, so the editor's documents and the MCP's content both fit;
  `appendDocument()` of a document already listed replaces it in place (the editor keeps its own
  "already added" guard); `restoreDocument()` of a listed document returns an unchanged copy, its
  index truncated and clamped (NaN to the end); the refusals name the document by its type key,
  since only agents see them; the checks run: not in the list, outside the list (a non-integer
  too), the same place. The new messages have no server twin, and `validation.test.ts` asks a twin
  only for the server's `unknownVariant`. German (for T097's review): "Die Anbindung fordert
  „<document>“ nicht an.", "Wählen Sie eine Position von 1 bis <n>.", "„<document>“ ist bereits auf
  Position <n>.". Kept.
- **T057, the drag's machine** (T057's UNCERTAIN 1–6; the coordinator, phase 8): `rowDragReducer`
  in `DocumentsStep/utils.ts` is a reducer of its own beside the step's view reducer (data-model
  §10 names the view reducer for "a drag in progress"; the documentation task words it, T102); its
  constants `ROW_DRAG_THRESHOLD_PX` (4) and `ROW_DRAG_HOLD_MS` (400) sit in `utils.ts` (T059 may
  move them to `constants.ts`); `dropLineOf()` still answers a line above the dragged row's own
  place while the target is its place (T059 hides it if R1–R3 draw none there); "inside the list"
  is the list box the hook measures at `down`, edges included; a touch move at or after the 400 ms
  while still pressed arms the drag (a late timer); the target passes a neighbour once the pointer
  crosses its middle. Kept.
- **T056, the editor's order** (T056's UNCERTAIN 1–5; the coordinator, phase 8):
  `EditorState.removed` became `{ document, index }` (so `INITIAL_EDITOR_STATE` keeps `null`);
  "Undo" puts the document back at its array index in the editor and at its list index in the
  view (`pendingRemoval.index`), which differ only when a document the catalog dropped sits before
  it and something moved in between (left); the editor's `moveDocument` takes an array index, and
  `handleMoveDocument` translates the list's row index (`documentIndexOfListIndex()`: a dropped
  document keeps its place) and keeps the open document open (`selectedIndexAfterMove()`); a move
  keeps the removal's toast and "Undo"; a refused move returns the same state. No consumer sorted
  documents (the grep's `sort(` hits order connections, an option set's values or findings), so
  none changed. The changed expectations (FR-045): `indexAfterAdding`'s cases expect the end,
  `reducer.test.ts`'s undo expects the old index, and the documents' toast object pins `kind:
  'danger'` (T038). **Plan change** (the coordinator's carried note before wave 2): T056's files
  gained `DocumentsStep/{utils.ts,utils.test.ts,reducer.ts,reducer.test.ts,types.ts}`, since the
  open document's index after an add and after "Undo" was computed there in catalog order, and
  `DocumentsStepProps` gained the required `onMove(documentType, toIndex)` that T058 and T059 wire.
  Kept.
- **T060, `move_document`** (T060's UNCERTAIN 1–4; the coordinator, phase 8): `position` is a plain
  number in the tool's schema, so 0, 3 and 1.5 reach `moveDocument()` and answer the editor's
  "Choose a position from 1 to <n>." (`validation`) rather than the SDK's generic message; the fake
  backend has no route that saves without `documents`, so nothing was added for that case;
  `documents-and-catalog/SKILL.md` gained "The documents' order" and says fields are chosen one by
  one, without the data items' `group`, which doesn't exist yet (T075 adds it there); the draft
  tools' text block numbers the documents (`1. <label> (<key>): …`), `get_connection`'s text
  unchanged. Refusals: `published_read_only`, `not_found` (“<key>” not requested), `validation`
  (outside the list, a non-integer, the place it has), `insufficient_access` for a `read` token
  (`MOVE_REFUSAL_CODES` in `drafts.ts`). **Plan change**: `mcp/src/draftEdit.ts`'s `ApplyRefusal.code`
  gained `not_found` (the line allows the file "only if the loop needs it"). Kept.
- **T058, "Move up" and "Move down"** (T058's UNCERTAIN 1–6; the coordinator, phase 8): the ⋯
  shows on every row (not on hover like the trash), after the trash at the row's end, the two
  32 px boxes touching so that "Personalausweis" in semibold keeps its 110 px at 1440; the entries
  carry KERN's `kern-icon--arrow-up` / `--arrow-down`, as the rules step's entries carry icons; the
  announcement is local state in `DocumentsStep/index.tsx` (the view reducer unchanged), in a
  `role="status"` region that is always in the loaded step; below 320 CSS px the trash and the ⋯
  wrap under the name (the name was 0 px wide at 160 px without it, 63 px now); the focus finds
  the moved row's ⋯ by `#document-row-<key> [aria-haspopup="menu"]`, since `ActionMenu` takes no
  id; the catalog has two document types, so no row in the browser offers both entries (§4.3, for
  T084). Kept. Amended 2026-11-18 (bug v5-ui-fixes (B4); spec Clarification 2026-11-18): the
  trash is gone; the ⋯ stands alone at the row's end on every row, a single document's too, and
  ends with the red "Remove document" after the divider; below 320 CSS px the ⋯ alone wraps
  under the name; the focus still finds the moved row's ⋯ by `[aria-haspopup="menu"]`.
- **T059a, the dragged copy's width and opacity** (T059's UNCERTAIN 1 and 2; the user,
  2026-11-11, phase 8): R1 and R2 draw the copy cut 8–10 px inside the list's right edge (206 px,
  then 172 px as the pointer moves right), at opacity 0.85 and 0.75. The user's answer: the copy's
  right edge stays 8 px inside the list, so it narrows as the pointer moves right and never
  crosses the card's border; its opacity is 0.85 throughout (R1's; R2's 0.75 is a decided
  deviation, §1). T059 changes the width and reruns its rows.
- **T059, the drag** (T059's UNCERTAIN 3–8; the coordinator, phase 8; 1 and 2 are T059a's):
  "inside the list" is the list's scroll area (the div under the divider, 6 px beyond the rows;
  from `lg` it fills the card to its bottom, below `lg` it ends 6 px under the last row); besides
  `--drag-x` / `--drag-y` (§4.1 call 1) the copy reads `--drag-left`, `--drag-top` and
  `--drag-width` (the row's measured box), since it is `position: fixed` so that the list's
  `overflow-y-auto` neither clips nor scrolls it; the drop targets are the rows measured at the
  press, the dragged row's own box included (T057's machine unchanged; R1 draws the line on the
  dragged row's own place, so it stays); a drag that moves nothing (Escape, a drop outside, its own
  place) gives the focus back to the pressed row's select button if hiding the row lost it;
  Escape during a press or drag is swallowed; while pressed the rows are `select-none` and
  `selectstart`, `dragstart` and `contextmenu` are prevented. After T059a the copy's width is
  `max(40, min(row, row − 8 − dx))` (`dragCopyWidthOf()`, its floor the 24 px glyph in its 8 px
  paddings); R2's rule gives 174 px where the frame draws 172 (recorded as a match under T059a).
  Firefox's touch is driven through Juggler's `Page.dispatchTouchEvent`, which neither scrolls nor
  makes the browser send `pointercancel`: those two rows are covered in Chromium and left for the
  phase's "Needs a person" (a real touch screen). **Plan change**: T059's files gained
  `frontend/src/hooks/useRowDrag.test.ts` (the hook's pure width helper, beside it, as the brief
  allowed). Kept.
- **T061, the walk V9** (T061's UNCERTAIN 1–4 and its fix; the coordinator, phase 8): the walk's
  trial run found the test step's data in catalog order for a draft stored as Driving licence,
  Personal ID (V9.6): the editor handed the rules logic `requestedRuleDocuments()` in catalog
  order and `personaFieldsOf()` lists the data in `context.documents`' order. T061's fix
  (`ruleDocumentsInListOrder()` in `FormConnectionEditor/utils.ts`, with its test) gives the
  editor's whole rule context the list's order, so the rules step's document picker and the order
  in which the checks see the documents follow it too (FR-050, "wherever a connection's documents
  are listed"); the data items stay in catalog order, and the sample personas' generated values
  may differ (sampling runs in field order; nothing stored). The coordinator then corrected two
  comments that still said "catalog order" (`TestStep/PersonaData.tsx`,
  `rules/src/personas/fields.ts`'s `personaFieldsOf`). V9.7's pull: the fake EUDIPLO runs inside
  the 3012 process and can't be made to share, so both pulls answer pending; the walk compared the
  triggered requests' `revision_id`, `current_revision`, `current_rule_set`, `config_hash`,
  `eudiplo_config_id` and the revisions' count (unchanged) and cites
  `test_connect.py::test_the_teams_document_order_doesnt_change_the_delivery` and
  `test_document_order.py::test_a_save_that_only_reorders_creates_no_revision_and_calls_no_eudiplo`
  for the delivery and the EUDIPLO calls; V9.4's middle row is cited to `moveTargetsOf`'s tests
  (§4.3); the ⋯ button's name was measured as its accessible name (the `sr-only` text). Firefox's
  real touch scroll and browser `pointercancel` (V9.3) are the phase's "Needs a person" rows, as
  in T059's table. Kept.
- **T063 and T064, the example's mark and content** (their UNCERTAIN 1–6; the coordinator, phase
  9): the migration `1b6d7a28c6b2` adds `form_connections.example` (`String(16)`, nullable) with
  `ck_form_connections_example` (autogenerate emitted the CHECK itself); applied to `konnekt_db`,
  `konnekt_db_010_p9` and `konnekt_db_010_p9_empty`. `example_of(row)` in
  `services/form_connections.py` fills the summary and the draft view; `_publish()`, reached only
  through `create_revision()` with its `DraftGuard`, sets it to null; a published `FormConnection`
  has no `example` key. `create_draft()` and `create_example()` share `_insert_draft()`, so there
  is one creation path, which stores `document_order` (the T054 note). (1) `app/example.py`
  imports `app.schemas` besides `app.language` and `app.catalog`, since `example_content()`
  answers `DraftCreate`; `app.schemas` imports only `app.catalog`, so the leaf still never reaches
  `app.config` and the fixture script can import it. (2) The driving licence's two data items are
  stored in catalog order (`expiry_date`, `driving_privileges`), as every document's data items are
  (FR-050); data-model §5 lists the same two. (3) The rules are numbered from
  `NumberingBase(rule=1, group=1)`, as the editor's first save is, and the counters come out at 3
  and 1 (`NEXT_RULE_NUMBER`, `NEXT_GROUP_NUMBER`). (4) The endpoint's message is "Draft saved", as
  `POST /drafts` answers. (5) The MCP's fake backend keeps a stored mark on save and never moves it.
  (6) `create_example()` reads the language with `current_language()` (the request's
  `Accept-Language`), keeping the line's signature. The variant's German Rule 02 message, which
  copy.md §6 abbreviates, reads "Sie müssen seit mindestens 1 Jahr einen Führerschein der Klasse B
  besitzen.". **Plan change**: the batch's files gained the `example: null` fixtures of
  `frontend/src/pages/{Approval,FormConnectionEdit,FormConnectionEditor,FormConnectionList}/utils.test.ts`
  and `mcp/src/{draftEdit,views}.test.ts` (the field is required in the mirror), and the summary
  keys pinned by `backend/tests/api/test_form_connection_search.py::test_a_page_of_the_summaries`
  and `test_form_connections.py::test_the_list_hides_deleted_form_connections_and_shows_the_newest_first`.
  Kept.
- **T066, the example banner** (T066's UNCERTAIN 1–5; the coordinator, phase 9): (1) the German of
  the step 1 and Standard sentences, which copy.md §6 didn't give, was written from the glossary
  and added to copy.md §6 (for T097's review); (2) **decided**: the variant's sentence names the
  variant by its stored name, so that an example created in German and read in English names
  "Krankentransport" as its tab does; the sentence is copy.md's word for word whenever the
  languages match (copy.md §6 amended; carried to T068, whose files gain
  `components/ExampleBanner/constants.ts` and a test of the sentences); (3) no role and no live
  region, as the findings banner's info variant (`RulesStep/FindingsBanner.tsx`), the icon hidden
  from screen readers; (4) the icon stays centred beside a wrapped sentence, as the findings
  banner's rows; (5) "Krankentransport" breaks inside the word at 160 CSS px, the narrow block's
  existing rule. The border measures #0273ae for the frame's #0284c7, spec 008 §1.5's AA value.
  Kept.
- **T067, the welcome page's example dialog** (T067's UNCERTAIN 1–3; the coordinator, phase 9):
  `ExampleDialog.tsx` wraps `ConfirmDialog` (the scrim closes it, CLAUDE.md "Dialogs") and shows a
  failure in `ConfirmDialog`'s danger alert with `ErrorNoticeText`, as the delete dialogs do, so
  that the title "Couldn’t create the example" stays for a `5xx` (`DialogFailureAlert` drops it).
  (1) With no answer the alert's body is the overview's "Check your connection and try again." (in
  copy.md §6 now); (2) after a failure the confirm button reads "Try again", as every
  `ConfirmDialog` failure; (3) a `401` signs out through `useSignOutOnUnauthorized()` and leaves the
  dialog busy until the sign-in replaces it, as the row's delete. The dialog's body names the
  example in the language it will be created in (copy.md §6); the glossary gained "Start from an
  example?" and "Go back". Kept.
- **T068, the example's banners and line** (T068's UNCERTAIN 1–6; the coordinator, phase 9): (1)
  the rules frames `7344:96387` and `7344:96414` changed since the audit: they no longer draw the
  "1" beside a variant tab (U18 #21), which is the change F29 asks Figma to make; since nothing
  built differs from the audit's decision, the frames were built and the change is accepted (the
  rule "a frame that changed is not built" guards against unexpected changes; this one is F29's);
  (2) on the test step (not drawn, W15) the banner opens the step, above the test day's line and the
  tabs, as on the rules step; (3) a draft's local draft resumed through
  `/form-connections/new?local=draft-<id>` doesn't load the stored draft, so it shows no banner and
  no line; "Restore changes" on the draft's edit route shows them; (4) "the page holds no change"
  is the local drafts' `sameContent()` against the loaded content (a trailing space in the name
  counts as a change; undoing a change by hand brings the line back); (5) the main branch always
  gets Standard's sentence; a variant gets the variant's sentence when its trimmed name is exactly
  "Ambulance" or "Krankentransport" (§4.1 call 6), after the link notice when one shows; (6) the
  line is the last item of the dialog's "Rule findings", normally alone (FR-056); the summary's
  "Standard · 2 rules" and "Ambulance · 2 rules" come from the existing `ruleLines()`. The
  variant's sentence takes the stored name (§4.2 T066). **Plan change**: T068's files gained
  `frontend/src/pages/FormConnectionEditor/index.tsx` (the wizard passes `example`, `isExample`
  and the line's flag to the steps and the dialog) and `frontend/src/pages/FormConnectionEdit/index.tsx`
  (it holds the loaded draft and passes `draft.example` to both renders), and
  `components/ExampleBanner/constants.test.ts` (the carried note); the steps' props were widened
  with `ExampleStepProps` in the files named, as `ScheduledEditProps` is. Kept.
- **T069, the agents' example mark** (T069's UNCERTAIN 1–4; the coordinator, phase 9): (1) the
  sentence "This draft is the example." also ends a search item's step line, since mcp-tools.md's
  "the text block's lines gain the same facts" covers both tools; on `get_connection` it is its own
  line after "Draft at the {step} step. …"; (2) one sentence for `unchanged` and `changed`, the
  structured field tells them apart; `example` is left out, not false or null, for anything else;
  (3) `connection-workflow` tells the agent to ask the team member to check the name, documents and
  rules before asking to publish an unchanged example (guidance only, as the publish dialog's line);
  (4) the FR-068 test checks that no tool's name matches `example|restore|bulk`. The stale
  `scheduled` status in `connection-workflow`'s search sentence was carried to T081. Kept.
- **T065, the example's fixture** (T065's UNCERTAIN 1–5; the coordinator, phase 9):
  `rules/src/fixtures/example-connection.json` is the fourth file of `export_check_fixtures.py`'s
  `generated_files()`, keyed `en` / `de`, each with `draft` (the stored example's content fields as
  `GET /api/form-connections/{id}` answers them, without the per-row `id`, `version`, `status`,
  `state`, timestamps and `last_activity`), `document_types` (`pid`, `mdl`) and `option_sets`
  (`licence_classes`, so that validation's class check runs; not named on the line but needed for
  the proof). (2) The branches carry fixed canonical UUIDs (`00000000-0000-4000-8000-000000000001`
  and `…0002`) in both languages. (4) The labels come from the API's own `label_of()` under
  `request_language`; `_field_view()` copies `services/form_connections.document_field_view()`,
  whose module imports `app.config`, and a pytest case pins their parity, another that the script
  never imports `app.config`. (5) The checks run on the script's fixed day 2026-10-28; the
  conditions are relative. `rules/src/example.test.ts` finds no problem and no finding in either
  language and pins the four statements per language. Kept.
- **T070, the walk V10** (T070's UNCERTAIN 1–4; the coordinator, phase 9): (1) V10.5's switch to
  English ran on the German run's first example while it was still unchanged and unpublished
  (after V10.4, before V10.3), so that the banners still showed; the run switched back to German
  for V10.3 and V10.6; (2) V10.4's row was read while the first example was at step 1, and the
  overview shows "Create connection" once and "Start from an example" nowhere; (3) "no finding icon
  and no count" was read on the variant tabs of the rules and test steps (the ⓘ button aside), not
  on the test step's persona chips; (4) V10.3's second example changed the age in the UI ("Edit
  rule" → 18 → "Save rule") and was saved with "Save and exit"; the line was already gone while the
  change was unsaved. The walk's selector notes (the dialog's summary values are `dd > span`; the
  rules step's `[role=tablist]` owns its tabs through `aria-owns`) are for the phase 12 sweep of
  these screens (T096). Kept.
- **T105, the data group "Licence" in German** (T002's UNCERTAIN 4; the user, phase 10, 2026-11-12):
  **"Fahrerlaubnis"**. "Führerschein" (data-model §6 until now) is the German name of the document
  the group sits in, so the driving licence's panel would have shown a group "Führerschein" inside
  "Führerschein" and the clear-group question "Felder der Gruppe „Führerschein“ aus Führerschein
  nicht mehr anfordern?"; "Führerscheinklassen" is the label of the field `driving_privileges`
  inside the group, and the group also holds `un_distinguishing_sign` and
  `administrative_number`. "Fahrerlaubnis" is the legal term for the permission the licence
  documents and covers the three fields. Amended: data-model §6, T072's line, spec 009's glossary
  §4 row (the one row of T002's that T105 may change); the key `licence` and the English "Licence"
  stay.
- **T072, the catalog's data groups** (T072's UNCERTAIN 1–4; the coordinator, phase 10): (1) only
  `GET /api/document-types` fills a field's `group` (`routers/document_types.py`,
  `_document_type_view()`); every other `DocumentField` answer (a connection's or a draft's
  documents, the approval previews) carries `"group": null`, since `document_field_view()` in
  `services/form_connections.py` is not T072's and FR-077 groups the panel by the catalog. The
  panel (T073, T074) and `get_catalog` (T075) read the groups from the catalog, never from a
  connection's documents. `test_catalog.py::test_a_field_view_changes_only_its_labels` leaves
  `group` out of its comparison. Kept; filling `group` in `document_field_view()` too would make
  every view carry it and drop the router's and the fixture script's special case, a choice for
  T084 if the null reads as wrong. (2) The TS mirrors are optional (`DocumentField.group?: string |
  null`, `DocumentType.field_groups?: FieldGroup[]`), matching the backend's defaults, so the
  hand-written `DocumentField` literals in `rules/`, `frontend/` and `mcp/` tests stay valid;
  readers use `field_groups ?? []` and `group ?? null`. Kept. (3) **Plan change**: T072 also edited
  `backend/tests/api/test_form_connections.py` (`_field()` expects `'group': None`, the catalog
  test each field's group) and `backend/scripts/export_check_fixtures.py` (the example's
  `document_types` carry `field_groups` and `group` as the endpoint does, else
  `test_check_fixtures` fails), and regenerated `rules/src/fixtures/example-connection.json` with
  the script. (4) `mcp/test/fakeBackend.ts`'s small test catalog groups its 11-field PID (Name 1,
  Other 1: test data, no FR-078 claim) and leaves its 10-field MDL ungrouped (`field_groups: []`),
  a ready-made ungrouped case. Kept. Handoff: `<SP>/T072-notes.md` of phase 10's chat.
- **T075, `get_catalog`'s groups** (T075's UNCERTAIN 1–5; the coordinator, phase 10): (1) a
  document's detail always carries `groups`, `[]` for an ungrouped one (the contract types it
  `groups: string[]`); (2) a field without a group leaves the `group` key out, as `option_set` is
  handled (the contract's `group?: string`); (3) the text block adds `group <Name>` in each field
  line's brackets and one closing line "Its data groups, in Konnekt's order: …" when there are
  groups, the fields kept in catalog order; (4) the test "no tool takes a group" checks
  `get_catalog`, `set_document` and `move_document` only, since the rule tools' input `group`
  (`items.ts`) means a rule group; (5) `documents-and-catalog/SKILL.md` names the groups and the
  "more than ten data items" threshold (`MAX_FIELDS_WITHOUT_GROUPS = 10`), and says "in Konnekt's
  order" for the panel's order. The labels are English (no language from `mcp/src/`). Kept.
- **T073 and T074, the grouped data item panel** (T074's UNCERTAIN 1–8; the coordinator, phase
  10): (1) **Plan change**: clearing a group reaches the existing question through three files
  outside T074's line: `FormConnectionEditor/types.ts` (the removal gains the kind `'group'`),
  `FormConnectionEditor/index.tsx` (the editor's ask-before-removing step reads a group through
  `dataRemovalOf()`, and the documents step gets `onClearGroup`) and `DocumentsStep/index.tsx`
  (passes `onClearGroup` through); `DocumentsStep/reducer.ts` and `reducer.test.ts`, named in the
  line, stay unchanged, since the question reuses the editor's removal state. (2) A group goes to
  the rules package as the list of its chosen data items, through the existing "dropped data"
  removal (`dataRemovalOf()`), so `rules/src/` and `mcp/` don't change and each rule is named
  once. (3) `groupedFieldsOf()` answers null, and the flat list shows, when `field_groups` is
  empty or a data item has no known group, so that no item is hidden; a group with no field is
  left out. (4) Ticking a clear or a mixed group chooses all of its data items at once, without a
  question, keeping dropped data; only clearing a fully ticked group can ask (FR-079, "ticking
  chooses all, clearing clears all"). (5) Clearing takes the group's chosen data items away and
  keeps the document's other fields, dropped data included, which still goes only through the
  note's "Remove it". (6) Each group is a list item holding its heading checkbox and its data
  items as a list named after the group; no `h3`, since the checkbox is named by its heading. (7)
  The heading label's 16 px semibold uses an `!important` arbitrary variant on a wrapper in
  `FieldGroup.tsx`, because the shared checkbox override in `index.css` sits outside Tailwind's
  layers. (8) The flat list of a document with 10 data items or fewer can't be shown in the browser
  (today's catalog has none); `groupedFieldsOf`'s tests cover it and the table's row cites W18.
  Kept. Four nodes read (`7290:61214`, `7290:61956`, `7290:62357`, `7296:52340`), none changed
  since the audit. Notes for T076: `<SP>/T074-notes.md` of phase 10's chat; rows `T074 draft`
  (`ebaea848-da54-42ba-8040-03c5d98dd6dd`) and `T074 live` (`39394df3-6dd6-4747-b7bd-e8a96cfac843`)
  in `konnekt_db_010_p10`.
- **T078 and T079, the approvals' start date and snapshot** (their UNCERTAIN 1–10; the
  coordinator, phase 11): (1) a done `publish` now answers `ApprovalPreview.connection` (with
  `urls`) while the connection isn't deleted, where it answered `connection: null` before; the
  contract puts the connection's own start date there and `check_approval` needs it (one existing
  assertion changed for it); T080 decides what the page's copy buttons do for a done publish on a
  date (`deactivated={!connection.is_active}` turns them off). (2) A `start_date` with
  `delete_draft`, `deactivate` or `delete`, and a value that is no date, fail the body's validation
  (`400 Validation error`, the generic message, before the level's `403`), as T046's bodies do; no
  new copy. (3) `set_start_date` to now on a live connection reuses "This connection is already
  live." / "Diese Anbindung ist bereits aktiv." (copy.md §8 has no own row for it). (4)
  `connection_changed` is worded from the connection's state now and the action
  (`approvals._connection_change()`): scheduled → "The connection's start date changed in the
  meantime."; deactivated → "… was deactivated …"; live → "… was reactivated …" for `reactivate`,
  "The connection became active in the meantime." for every other action; so a `delete` asked
  while deactivated and then reactivated now reads "became active" (spec 007's "was reactivated"
  before; no test covered it), and a request made while live or deactivated whose connection then
  got a date reads "start date changed". The request stores no snapshot field in its answer, so
  the page derives the same words from `preview.connection.state`. (5) The reasons' order: deleted,
  then `connection_changed`, then `start_date_passed`; "today" is `today_in_germany()` at each
  read. (6) The checks at the request: `403 browser_only`, `403` level, `400 invalid_start_date`
  (before the connection is read, as T020 decided for the services), `404`, then the
  preconditions; the date again under the row lock. (7) The server's `409 approval_done` sentence
  for a dated `publish` or `reactivate` uses copy.md §7's dated texts ("Published and scheduled for
  DD.MM.YYYY." / "Connection scheduled for DD.MM.YYYY."); the `200` messages stay "Published",
  "Connection reactivated", and "Start date saved" for `set_start_date`. (8) A scheduled connection
  whose day came but which the worker hasn't made live yet still matches its snapshot: an approved
  `set_start_date`, `deactivate` or `delete` applies. (9) The revision `1f5e81861348` keeps its
  autogenerated docstring (nothing by hand, as data-model §9 says). (10) T079 put placeholder
  `set_start_date` texts into `mcp/src/tools/approvals.ts` so that `Record<ApprovalAction, …>`
  compiles; T081 replaces them with mcp-tools.md's. Kept. **Plan change**: T079's files gained
  `backend/tests/api/{test_deletions.py,test_scheduling.py}` (the `expected=` rename, one call each),
  `frontend/src/pages/Approval/{types.ts,constants.ts,utils.test.ts}` and
  `mcp/src/tools/approvals.ts` (type-level entries for the new action). **copy.md §7 amended by the
  coordinator**: the German title "Startdatum von ‚<name>‘ ändern?" becomes "Startdatum von
  „<name>“ ändern?", since every other German title of the page quotes the name with „…“ where the
  English has ‘…’ (T079's note); T080 builds it.
- **T081, the agents' start date** (T081's UNCERTAIN 1–9; the coordinator, phase 11): (1)
  `what_happens` is a wait sentence followed by mcp-tools.md's case text word for word; a dated
  `publish` keeps spec 007's publish wait sentence (the draft and the findings), and the other new
  cases (every `set_start_date`, a dated `reactivate`, deactivating or deleting a scheduled
  connection) use a neutral one, "Nothing changes yet. The team member opens the link, sees what
  approving does, and approves or declines before {time}.", since spec 007's deactivate and
  reactivate wait sentences would contradict them ("will work again", "requests in progress").
  (2) Dates are `YYYY-MM-DD` in every MCP text, as T016 and T029 decided. (3) The tool checks the
  date's form first (another action with a `start_date`, `set_start_date` without one, no date),
  then the level, then "after today in Germany", mirroring the backend (body validation before
  the `403`); the last check runs after the elicitation's re-entered branch, so a call re-entered
  at midnight still reads back the request it made; `'now'` is sent as `start_date: null`. (4)
  The tool's own `validation` messages: "set_start_date needs a start_date: a date as YYYY-MM-DD,
  or 'now'.", "<action> takes no start_date: only publish, reactivate and set_start_date do.",
  "Give the start_date as a date the calendar has, YYYY-MM-DD, or 'now'.", "Enter a date after
  today: today in Germany is <today>.". (5) `request_approval`'s `request` also carries
  `start_date` when one was asked (the contract states it for `check_approval` only). (6)
  `check_approval` puts `start_date` on `request.connection` while the connection is scheduled,
  as the search's items carry it beside `status`. (7) The `connection_changed` text becomes "The
  connection's status or start date changed since you asked, so nothing happened." (spec 007's
  named only deactivating or reactivating; the reason now also covers a moved date and a
  connection that became active; one existing assertion changed). (8) The done texts: a dated
  publish "…: the draft is published and scheduled for {D}."; a dated reactivate or
  `set_start_date` with a date "…: the connection is scheduled for {D}."; `set_start_date` now
  "…: the connection is live."; the URLs come only after a done `publish` or `reactivate`, as
  before. (9) No new date helper: `todayInGermany()` and `isValidIsoDate()` of
  `@konnekt/rules/dates`, which `checks.ts` already uses. Kept. `mcp/plugin/instructions.md`
  (419 words) already had the status `scheduled` and the sentence on a day in Germany (T029). A
  date refused by the tool still makes one backend call (`GET /api/agent/me`, the bearer's level),
  and no `POST /api/approval-requests`.
- **T080, the approval page's new cases** (T080's UNCERTAIN 1–6 and its copy note; the
  coordinator, phase 11): (1) `set_start_date` is a status action: its body is the Links card
  without a lead (no copy names what happens to its URLs; `ApprovalLinkCards`' lead became
  optional, a file outside T080's line), then "Active from <date>" (for an active connection also
  "Until then its links stop working, and requests in progress are cancelled.") or "The connection
  goes live at once.", under the card where the other status actions put their sentences. (2) A
  scheduled connection's links are copyable, as on the details page (FR-007): after a done publish
  or reactivation on a date the Links card, its lead and "Open the connection" stay with copy on,
  and the waiting status actions follow the same rule; copy is off only while the connection is
  deactivated (`connection.state`, no longer `is_active`). (3) Deactivating and deleting a
  scheduled connection put the dialogs' scheduled sentence in place of "Requests in progress are
  cancelled." (it has none in progress), reused from `CONNECTION_DETAIL_COPY.deactivateScheduledText`
  and `DELETE_CONNECTION_COPY.scheduled`; delete keeps "Deleting can’t be undone." in semibold;
  the cards' leads are unchanged. (4) For `publish` the start line is a paragraph 16 px under the
  summary table, where the publish dialog has "Active from", and the example's line an info line
  16 px under it (`PUBLISH_DIALOG_COPY.exampleLine` through the editor's `PublishFindingLine`); for
  `reactivate` the start line stands under the Links card, which keeps its lead "These connection
  URLs will work again:". (5) The done texts and "Active from" use the request's `start_date`; the
  deactivate and delete sentences the connection's own; the `connection_changed` sentence follows
  the connection's state and the action, as the server words it (§4.2 T078/T079 (4)). (6) A done
  `set_start_date` shows "Start date saved." alone, without the Links card or "Open the
  connection" (`DONE_WITH_URLS` unchanged). Kept. The copy note: copy.md §7's "The connection's
  start date changed in the meantime." and the server's message keep the straight apostrophe, as
  every server message does since spec 007 ("The agent's access has changed, …"); the page's own
  table writes ’, so the page shows ’ when it words a cancelled request itself and the server's
  straight ' when an approve answers `409 approval_cancelled`, as it already did for spec 007's
  reasons. Unchanged; for T086's text pairs to list if it flags it.
- **T082, the walk V12** (T082's UNCERTAIN 1–4; the coordinator, phase 11): (1) V12.4 compares
  `get_activity`'s entries with the Activity card's after converting the days, since the MCP
  server writes `YYYY-MM-DD` and the card `DD.MM.YYYY` (T016, T035); the texts aren't meant to
  match word for word. (2) The request's `link` points at `http://localhost:5173/approvals/<id>`
  because the phase's backend on 3015 ran without `PORTAL_URL` (the development default of
  `config.py`); the walk opened the same path on its Vite (5179). An environment setting of the
  coordinator's launcher, not a fault of the code; a later launcher sets `PORTAL_URL` to its Vite.
  (3) V12.8's "no tool restores" pattern allows "restores" in `delete_item` and `reset_item`'s
  descriptions, which restore a based variant's removed rule (spec 002), not a deleted connection.
  (4) The walk added V12.7b (`start_date_passed`, reached by setting its own request's
  `start_date` to today in the database), a reread of T080's done requests, and log and cleanup
  rows to V12's nine steps; they count in its 241 measures. Kept.
- **T084, the open points of phases 2–11** (the coordinator, phase 12, 2026-11-12; §4.3 as it
  stood after phase 11): (1) **A publish's configuration after a delete, a restore and a second
  publish** (T041's UNCERTAIN 3): the user's answer: leave it and document it. The two windows
  ((a) a second publish reserving the same revision between the first one's rollback and its
  `delete_config`, (b) the configuration holding whichever body came last) stay; T102 writes them
  into ARCHITECTURE's "Form connections" beside `_check_reservation()`. No code change. (2) **The
  activity's cursor in the access log** (T036's UNCERTAIN 5): the user's answer: keep it as the
  search's. The encoded keyset cursor (`<occurred_at>|<position>|<id>`, base64) in uvicorn's
  access line is within FR-073 ("beyond what the middleware logs today"), as spec 007's search
  cursor is; T100's V15.3 counts such a query string as the middleware's, not as a finding. (3)
  **The bulk dialog after `409 selection_changed`** (T049's UNCERTAIN 2): the user's answer: no
  retry. After `selection_changed` the dialog keeps its sentence "Nothing was deleted: “<name>”
  was deleted or changed in the meantime." under "Couldn’t delete", hides the confirm button and
  puts the focus on "Keep connections"; the person reopens the dialog from the bar and sees the
  current statuses. Another failure keeps spec 008's "Try again". `contracts/ui-screens.md` S4
  amended; the fix is T098's (`BulkDeleteDialog.tsx`, and `ConfirmDialog` if it needs a prop to
  hide its confirm button); T091's sweep expects it. (4) **The connection's name in the header at
  narrow widths** (T014's follow-up UNCERTAIN 2): the header's name (a `span` in `TopBar`'s
  "Where you are" pill; the page's `h1` is the status band's title, so the name is the only place
  on the details page and in the edit flow that says which connection is open; T088's UNCERTAIN 2
  corrected this point's first wording) cut to one letter ("P…" at 320 CSS px) or to nothing (0 px
  at exactly 768 px for a scheduled connection) isn't "usable at 320 px" (FR-072), so it is a
  defect, for every status:
  the header's name shows at least min(its own width, 96 px) at every width from 160 to 1440 CSS
  px, in both languages; where it can't beside the status pill, the status pill wraps under the
  name inside the "Where you are" pill. A cut with "…" beyond that stays (spec 008's `truncate`).
  The fix is T098's (`components/TopBar/index.tsx`); T088's sweep measures the name's width in
  the four states at 320, 400, 600, 767, 768, 900 and 1024 CSS px besides its matrix. (5)
  **`KernAlert` titles below 320 CSS px** (T024's note): decided as a fix: T098 adds one rule to
  index.css's narrow block that gives an alert's `.kern-title` the alert's full width under its
  icon (T024's suggestion, `.kern-alert__header > .kern-title { flex-basis: 100% }`, or what
  kern.css's markup needs), so every dialog's alert reads at 160 CSS px; T024's three local fixes
  may then go if the rule covers them. Every sweep (T087–T096) reports each visible `.kern-alert
  .kern-title`'s width against its alert's content width at 160 CSS px, a title under half of it
  as a defect. (6) **No list has three documents** (T058's UNCERTAIN 6): T092 reaches three rows
  through a `page.route()` answer to `GET /api/document-types` that adds a third type (a copy of
  `pid` under the key `t092doc`, named "T092 document" / "T092-Dokument"), in a new connection's
  documents step: the editor's autosave writes only the local draft and nothing is sent to the
  server before "Save draft and exit" or publishing, so nothing with the third type is stored; the
  sweep removes its local drafts afterwards. The ⋯ menu on the middle row and a three-row drag are
  measured there; the edit flow's list stays two stored rows. (7) **Spec 009's glossary's two
  malformed rows** (T002's finding): T097 moves the stray cell back (its files name the glossary).
  (8) **The group question's German title** stays for T097 (the German review), as §4.3 said.
  (9) **T072's `"group": null` in a connection's documents** (§4.2 T072 (1)): kept; it doesn't
  read as wrong, since the panel and `get_catalog` read the groups from the catalog.
- **T087–T096, the sweeps' findings outside this feature, and T098's split** (the coordinator,
  phase 12, after wave 4): the sweeps marked `baseline` what lies in a part that specs 001–009 built
  and this feature didn't change. FR-074 keeps those as they are, so T098 doesn't fix them; they
  are listed for the user as candidates for a follow-up: (a) "Add document"'s label wraps out of its
  fixed 36 px box below 320 CSS px, over the dashed border (`DocumentsStep/SearchCard.tsx`'s `h-36`
  with `whitespace-nowrap` turned into `normal` by index.css's narrow block; T092, T093); (b) a based
  variant's rule text is 55–70 px wide beside "Changed here" and the ⋯ at 320 CSS px, breaking
  nearly every word (`components/RuleRow/`; T096, shown by the example's variant but true of any
  based variant with changed rules); (c) the variant's link strip sentence stays 54–96 px wide
  beside "Linked to Standard" at 320 CSS px (`RulesStep/LinkStrip.tsx`'s `min-w-0 flex-1`; T096);
  (d) below 320 CSS px the narrow block's `overflow-wrap: anywhere` breaks German words without a
  hyphen in spec 008's chrome and headings ("Anbindun/gen", "Willkom/men", "Link kopier/en";
  T090, T093, T096; spec 008's narrow rule, by design); (e) a done approval request's sub-line still
  reads its passed expiry time ("läuft um 12:23 Uhr ab"; spec 007's `subtitleOf()`; T090); (f) the
  overview's icon-only delete button keeps `kern-sr-only` inside a `kern-btn` on purpose (KERN's
  40 px square, spec 008's comment in `FormConnectionRow.tsx`), so its `scrollWidth` 44 against
  `clientWidth` 40 is no defect (T085). This feature's own controls are fixed: the "Nach unten"
  entry (T092) is T098's. **Plan change**: T098's defects and T084's three decided fixes span six
  folders, so the coordinator split it by folder into consecutive tasks of the same level (tasks.md
  rule "Before delegating, check the task's `size:`" and T098's own line): T098 keeps the narrow
  layout (`index.css`, `TopBar`, the documents' ⋯ menu), the new T106 (wave 5b) the bulk dialog's
  no-retry and the date field's boundary (`ConfirmDialog`, `BulkDeleteDialog`, `ActiveFromChoice`);
  T099 depends on both. T093's one defect, the group question's German title, is T099's (§3). Wave 4
  ran on a second installation (`konnekt_db_010_p12_empty`, backend 3017 with
  `DELETION_UNDO_SECONDS=20`, Vite 5181), so the development database wasn't emptied (phase 12's
  "Needs a person": that step is no longer needed).
- **T106, the bulk dialog's no-retry and the date field** (T106's UNCERTAIN 1–4; the coordinator,
  phase 12): `ConfirmDialog` takes `hideConfirm?: boolean` (default `false`, so its other 31 uses
  render as before); `BulkDeleteDialog` sets it after any `409 selection_changed` (also when the
  changed id isn't among the dialog's rows and the server's sentence shows), through the pure
  `bulkDeleteNoticeOf()` and the reducer's `stale`; the confirm button unmounts, the focus moves to
  "Keep connections", and the footer takes P33's one-button layout (the button across the footer);
  another failure keeps "Try again" and the focus where it was; on close the focus returns as
  §4.2 T049 says. The date field keeps P1b's white fill and outline with a passing line (§1), not
  KERN's own field look (a `#22293a` bottom border on a `#f2f5fb` fill), the smaller departure.
  **Plan change**: T106 also edited `pages/FormConnectionList/constants.ts` (`stale: false` in
  `INITIAL_BULK_DELETE_STATE`, required by the state's new field). **Baseline, not fixed (FR-074;
  added to the list of the entry above for the user)**: (g) spec 002's rule editor fields draw the
  same 1 px `decorative-border` line, 1.25:1 (`RuleEditor/ValueInput.tsx`, `RulesStep/ItemName.tsx`,
  `RuleEditor/MessageField.tsx` dashed, `components/MenuSearchField`); the sweeps measured only
  this feature's fields. Kept.
- **T100, the test files no task line names** (T100's V15.1 finding and UNCERTAIN 1–3; the
  coordinator, phase 12): of the 26 existing test files that changed against `main`, 10 changes
  are named by no task line's `files:` or plan change: the phase 2 fixture fields (`state`, the
  status dates, `last_activity`, `step`) in `frontend/src/pages/{Approval,FormConnectionDetail,
  FormConnectionEdit,FormConnectionEditor,FormConnectionList}/utils.test.ts` and
  `mcp/src/draftEdit.test.ts` (T008's and T010's mirrors), `actor=` in three lines of
  `backend/tests/api/test_form_connection_rules.py` (T011's signature), the summary keys in
  `test_form_connection_search.py` (T008), and the `worker.finish_deletions` line in
  `test_worker_requests.py` (T042's step). Each adds what a changed shape or signature needs and
  changes no earlier expectation, so tasks.md's rule "a task that changes `schemas.py` changes
  whatever reads the shape in the same task" accounts for them; recorded here as the plan changes
  they were, not reopened. `test_connect.py`'s two folded asserts (T040: the pull URL's two
  asserts became a loop that also checks the branch URL, the same `404` and code) count as
  additions. `mcp/test/fakeBackend.ts` was counted as a test file. Kept.
- **T101, the convergence** (`/speckit-converge`, the coordinator, phase 12, 2026-11-12): four
  read-only checks of the code against spec.md (82 FRs, 12 SCs, 54 acceptance scenarios, the
  edge cases), plan.md and the constitution found 9 gaps, appended as Phase 13 (T107–T114, its
  own Delegation): MEDIUM, `search_connections` doesn't say that a scheduled item's URLs answer
  "unavailable" (FR-062, US8-AS1; T107); the overview row's edit entry for a scheduled connection
  keeps the active body (FR-013, Clarification #24; T108); a stored example draft's local draft
  resumed through `?local=draft-<id>` shows no example banners (FR-058; it contradicts T068 (3);
  T109); LOW, "Change start date" plans from a details page loaded before the start day (FR-009,
  US1-AS11; T111); a bulk deletion's rows get increasing `deleted_at`, so a draft finished first
  lets "Undo" restore part of it, and a deletion an approval ran waits the restore time though it
  can't be taken back (FR-044, SC-005, FR-030 against T041 (6); T110); a single document can be
  dragged (the edge case "Only one document", FR-046; T112); the router of `GET
  /api/document-types` builds the grouped view (CLAUDE.md "Routers stay thin"; T113); the data
  groups are missing from ARCHITECTURE (constitution IV; T114). The constitution's documentation
  MUST (`DELETION_UNDO_SECONDS` in `README.md` and ARCHITECTURE) was already T102's. **Not built,
  by the user's decision** (2026-11-12, after the wave C1 agents stopped on the account's usage
  limit before changing any file): "skip the check on the UI with playwright, just write the final
  docs and the commit message". T114 went into T102's batch (documentation); T107–T113 stay open in
  tasks.md for a follow-up, T101 with them, and ARCHITECTURE describes today's behaviour.
- **T102 and T114, the documentation** (T102's UNCERTAIN 1–8; the coordinator, phase 12): the
  worker's steps are numbered 1–16 (T042's `finish_deletions` is step 16; the carried note said
  1–15 before it), "Steps 12 to 14" kept for the three agent-access steps; the spec 010 backend
  rules went into a new CLAUDE.md section "Scheduling, activity and deletions (spec 010)" (four
  lines; the `restore_cutoff()` rule folded into the deletion line); README lists the 26 MCP tools
  and the actions only a person takes; ARCHITECTURE describes today's behaviour where T107–T113
  were not built. **Plan change**: spec 008's toast rule ("an action toast stays") is stated in its
  `research.md` (R8) and `data-model.md` ("Toasts"), not in its `spec.md`, so T102 added one
  "superseded by spec 010's FR-082" sentence to each (two files outside its line); spec 008's #52
  is marked superseded in its Clarification, the Q37 (c) item and FR-048. **For a follow-up**:
  `docker-compose.prod.yml` doesn't pass `DELETION_UNDO_SECONDS`, so a deployment always uses 300
  (a code change, outside T102).

### 4.3 Open points

None. T084 (phase 12) decided the points that phases 2–11 left (§4.2 "T084"); T097 settled the
last two (§3): the group question's German title now quotes the document ("Daten der Gruppe
„<group>“ aus „<document>“ nicht mehr anfordern?"), and spec 009's glossary's stray cell is back
in its row.

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
  (`konnekt_db_test`) 2161 passed, 0 skipped, 0 failed; `export_check_fixtures --check`
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
  `konnekt_db`; its backfill was corrected before any commit (§4.2) and run down and up again.
  Waves ran as planned, with no change of level or batch; the coordinator's pytest rerun was
  skipped for wave 6 at the user's word (the agent's full run, green, came after its last edit),
  and Ruff, mypy and the root gates were rerun.
- 2026-11-11: the foundations' checkpoint (T012, the coordinator). The development database
  holds no published connection that isn't deleted (its 66 published rows are all deleted), so
  the browser check ran on a scratch copy (`konnekt_db_010_t012`, a copy of `konnekt_db` run
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
  environment: a scratch copy of the development database, `konnekt_db_010_p3`, with four
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
  T017 left five live connections named `T017 … renamed` in `konnekt_db_010_p3`.
- 2026-11-11: US2's checkpoint (T018, the coordinator). The root gates green after wave 2
  (`npm run lint`, `npm test` with the counts above, `npm run build`), and no source file changed
  after that run (T017 fixed nothing). T017's walk V5 (§2.2): 480 measures, 480 pass, 0 fail, 0
  unsure, over 12 steps × English and German × Chromium and Firefox. The tables of T013 (37
  rows), T014 (59) and T015 (58) in §2.1 have no open row. The phase's diff adds no `console.*`,
  no inline style, no `any`, no `dark:` and no `focus:`. Nothing is left for a person.
- 2026-11-11: phase 4, US1 (T019–T030), each wave's gates green on the combined tree. The
  environment: a scratch copy of phase 3's database, `konnekt_db_010_p4`; this checkout's backend
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
  `konnekt_db_010_p4`, and screenshots in the repository's git-ignored `.playwright-mcp/`.
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
  environment: a scratch copy of phase 4's database, `konnekt_db_010_p5`; this checkout's backend
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
  in `konnekt_db_010_p5` (66 seeded entries on `T033 open`), and screenshots in the repository's
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
- 2026-11-11: phase 6, US4 (T038–T044), each wave's gates green on the combined tree. The
  environment: a scratch copy of phase 5's database, `konnekt_db_010_p6`; phase 5's backend was
  stopped for waves 1–3 (backend only) and this checkout's backend started on port 3011 with the
  fake EUDIPLO after wave 3 (`WORKER_ENABLED=false`, the default restore time) and again for T044
  (`WORKER_ENABLED=true`, `DELETION_UNDO_SECONDS=20`; there is no `backend/.env`, the launcher's
  environment stands for it); Vite on 5175. Migration `9e7546ab2057` (the restorable deletion,
  T039) applied to `konnekt_db` and `konnekt_db_010_p6`, its downgrade run once on the copy.
  T038's answer came from the user (§4.2: a third toast kind `danger` for this feature's deletion
  toasts). Test counts after the phase: pytest 2380 passed (2319 after phase 4, +61: marking and
  hiding a deletion 28, the restore, the reservation guard and the worker's finish 33), run by
  T041/T042 after their last backend edit (started 17:10, the last edit 17:09:57) and not rerun by
  the coordinator (the user's standing rule); Ruff, mypy over 92 files and the fixtures' `--check`
  rerun green after each wave; `rules/` 2642; `frontend/` 33 files, 1408 tests (+30: the toast's
  kinds, the deletion reducer, the restored list, the arrival from the details); `mcp/` 15 files,
  454 tests. Waves ran as planned, with no change of level or batch. **Plan changes** (each in
  §4.2): T040's files gained `backend/app/models.py` (comments, carried from T039) and
  `backend/tests/api/test_form_connection_maintenance.py`; T041's gained
  `backend/app/services/form_connections.py` and `backend/tests/api/test_form_connection_drafts.py`
  (the guard against a draft deleted and restored during its publish, T040's hazard) and
  `backend/tests/api/test_approval_requests.py`; T042's gained `test_approval_requests.py` and
  `backend/tests/api/test_oauth.py` (`STEPS` pins); T043's gained
  `frontend/src/components/Toast/{ToastMessage.tsx,utils.test.ts}` and
  `frontend/src/assets/icons/delete-white.svg` (T038's decision). One open point for the user (§4.3,
  T041's UNCERTAIN 3). T040 and T041 each broke 16 conditions one at a time to check that a test
  fails for each. The tasks left connections named `T043 …` and `T044 …` in
  `konnekt_db_010_p6` (44 `T044 …` rows not deleted, 3 deleted for good), the account
  `t043-empty` (development only), and screenshots in the repository's git-ignored
  `.playwright-mcp/T043/`; T044 revoked every token it made (no `T044%` authorization left).
- 2026-11-11: US4's checkpoint (T045, the coordinator). The gates are green on both sides: the
  root gates rerun by the coordinator after wave 4 (lint, `npm test` with the counts above,
  build), and no repository file changed after that run (T044 fixed nothing); the backend's Ruff,
  mypy and the fixtures' `--check` rerun at the checkpoint, pytest as above. T044's walk V7
  (§2.2): 714 measures, 714 pass, 0 fail, 0 unsure, over V7.1–V7.8 × English and German in
  Chromium (its first run's two V7.5 failures were the script's timing, counted from before the
  delete dialog; rerun from the toast's appearance: 6.33 s and 6.38 s). T043's table (§2.1, 123
  rows) has no open row. `backend/.env` doesn't exist: the backend was restarted after T044 with
  the default restore time (no `DELETION_UNDO_SECONDS`, so 300 s) and `WORKER_ENABLED=false`.
  The backend's log of the phase (1968 lines before that restart) holds uv's and uvicorn's startup
  lines and uvicorn's access lines only (methods, paths with ids, statuses; no query string); no
  name, person, date or entry kind. The app configures no logging, so its own INFO lines don't
  reach that log: the phase's diff adds two log calls in `backend/app`, each with an id or counts
  only ("Deletion %s restored: %d form connections", "Finished deletions: %d activity entries and
  %d drafts deleted"); the frontend's diff adds no `console.*`, no inline style, no `any`, no
  `dark:` and no `focus:`. The documentation checklist's `README.md` and `docs/ARCHITECTURE.md`
  entries for `DELETION_UNDO_SECONDS` and the restorable deletion are carried to T102
  (`backend/.env.example` has it). **Left for a person** (tasks.md, phase 6 "Needs a person"), so
  T045 stays open: a screen reader (Orca or NVDA) once for "“<name>” restored." (the walk read it
  in the live region only: `role="status"`, `aria-live="polite"`, `aria-atomic="true"`).

- 2026-11-11: phase 7, US5 (T046–T051), each wave's gates green on the combined tree. The
  environment: a scratch copy of phase 6's database, `konnekt_db_010_p7`; this checkout's backend
  on port 3011 with the fake EUDIPLO (the launcher copied into this chat's scratchpad),
  `WORKER_ENABLED=false` and the default restore time, restarted after wave 1 so that waves 2 and 3
  ran T046's endpoint; Vite on 5175. No migration in this phase. Test counts after the phase:
  pytest 2402 passed (2380 after phase 6, +22: the bulk deletion's 12 test functions, among them
  three races with real sessions), run by T046 after its last backend edit (started 19:15:04, the
  last edit 19:14:50) and not rerun by the coordinator (the user's standing rule; no backend file
  changed after it); Ruff, mypy over 92 files and the fixtures' `--check` rerun green after wave 1
  and at the checkpoint; `rules/` 2642; `frontend/` 33 files, 1443 tests (+35: the selection's
  reducer and select-all state 15, the bulk dialog's reducer, items, warnings, failures and plural
  toasts 20); `mcp/` 15 files, 454 tests. Waves ran as planned, with no change of level or batch.
  **Plan change** (§4.2 T049): T049's files gained `frontend/src/assets/icons/warning-amber.svg`
  (the frame's warning icon). copy.md §4 changed twice ("won’t" with a typographic apostrophe in
  the scheduled warning and the active line, T049's note). One open point for T084 (§4.3: the bulk
  dialog's "Try again" after `409 selection_changed`). T046 broke 17 conditions one at a time to
  check that a test fails for each. The tasks left connections named `T048 …` (4), `T049 …` (30),
  `T050 Passenger transport licence draft` and `T051 …` (90, 40 of them deleted for good past the
  restore time) in `konnekt_db_010_p7`, and screenshots in `<scratchpad>/T048/` and the
  repository's git-ignored `.playwright-mcp/T049/` and `.playwright-mcp/T050/`; no local draft is
  left in the MCP browsers' profiles. The documentation checklist's `docs/ARCHITECTURE.md` entries
  for the bulk endpoint (`POST /api/form-connections/deletions`, all or none, `409
  selection_changed`) and the overview's selection are for T102 ("the restorable deletion", "the
  selection").
- 2026-11-11: US5's checkpoint (T052, the coordinator). The gates are green on both sides: the
  root gates rerun by the coordinator after wave 2 (lint, `npm test` with the counts above, build),
  and no repository code changed after that run (T051 fixed nothing; only `tasks.md`,
  `design-notes.md` and `contracts/copy.md` changed since); the backend's Ruff, mypy and the
  fixtures' `--check` rerun at the checkpoint, pytest as above. T051's walk V8 (§2.2): 298
  measures, 298 pass, 0 fail, 0 unsure, over V8.1–V8.7 × English and German in Chromium; SC-006:
  ten connections ticked one by one and deleted with one confirmation, 1.45 s from the first
  checkbox to the toast, 0.32–0.35 s from "Delete connections" to the toast. The tables of T048 (62
  rows), T049 (56) and T050 (46) in §2.1 have no open row. The backend's log of the phase (866
  lines, T051's walk between its markers: 193 lines) holds uv's and uvicorn's startup lines and
  uvicorn's access lines only (methods, paths with ids, statuses; no query string); no name,
  person, date, state or entry kind. The app configures no logging, so its own INFO lines don't
  reach that log: the phase's diff adds one log call in `backend/app` with an id and counts only
  ("Deletion %s: %d form connections deleted; %d open requests cancelled"); the frontend's diff
  adds no `console.*`, no inline style (the dialog's measured cap is a CSS custom property set
  with `style.setProperty`, as `WizardLayout` does; the new SVG keeps the Figma export's `style`
  attribute, as phase 6's `delete-white.svg`), no `any`, no `dark:` and no `focus:`. **Left for a
  person** (tasks.md, phase 7 "Needs a person"), so T052 stays open: SC-006's 30 seconds timed once
  by hand (the walk measured the click to the toast), and a screen reader (Orca or NVDA) once for
  the announced count "<n> selected" (the walk read it in the `role="status"` region, which stays
  in the page empty while nothing is selected, §4.2 T048 (5)).
- 2026-11-11: phase 8, US6 (T053–T061), each wave's gates green on the combined tree. The
  environment: a scratch copy of phase 7's database, `konnekt_db_010_p8` (`pg_dump` and
  `pg_restore` inside the PostgreSQL container, since the host's `pg_dump` 17 refuses the server's
  18); phase 7's backend on 3011 and its Vite on 5175 kept running (another chat's processes,
  left alone), so this phase's backend ran on port 3012 with the fake EUDIPLO (the launcher copied
  into this chat's scratchpad), `WORKER_ENABLED=false` and the default restore time, restarted
  after wave 1 so that waves 2–5 ran T054's order; Vite on 5176. Migration `e7ebbd07dc57` (the
  documents' order, T053) applied to `konnekt_db` and `konnekt_db_010_p8`, its downgrade run
  once on the copy. Test counts after the phase: pytest 2425 passed (2402 after phase 7, +23: the
  stored order 22, the delivery's order 1), run by T054 after its last backend edit (started
  20:43:10, the last edit 20:42:00) and not rerun by the coordinator (the user's standing rule; no
  backend file changed after it); Ruff, mypy over 93 files and the fixtures' `--check` rerun green
  after wave 1 and at the checkpoint; `rules/` 2656 (+14: the moves); `frontend/` 34 files, 1508
  tests (+65: the editor's order and moves, the view's indexes, the drag's machine 30, the move
  menu's helpers, the copy's width, the rule context's order); `mcp/` 15 files, 464 tests (+10:
  `move_document` and `set_document`'s order). Waves ran as planned, with no change of level or
  batch. **Plan changes** (§4.2): T054's files gained `backend/tests/api/test_form_connections.py`
  and `backend/tests/api/test_activity.py` (they pinned the catalog order FR-045 changes); T056's
  gained `DocumentsStep/{utils.ts,utils.test.ts,reducer.ts,reducer.test.ts,types.ts}` (the
  coordinator's carried note before wave 2: the open document's index after an add and after
  "Undo" was computed there in catalog order); T060 used `mcp/src/draftEdit.ts` (allowed "only
  if the loop needs it"); T059's files gained `frontend/src/hooks/useRowDrag.test.ts`; the decide
  task T059a [lead] was added before T061 for T059's UNCERTAIN 1 and 2 (the dragged copy's width
  and opacity, which R1 and R2 draw differently), answered by the user, and T059 was resumed to
  apply it; T061 fixed the test step's data order in T056's files; the coordinator corrected two
  comments outside the tasks' files that still said "catalog order" (T061's note). One open point
  for T084 (§4.3: "No list has three documents", the catalog's two document types). The tasks
  left connections named `T058 …` (3), `T059 …` (3) and `T061 …` (25; three exploration drafts
  deleted) in `konnekt_db_010_p8`; every personal access token they made is revoked (their next
  call 401) and their approval requests read `cancelled`; screenshots in `<scratchpad>/T058/`,
  `<scratchpad>/T059/` and the repository's git-ignored `.playwright-mcp/T058/` and
  `.playwright-mcp/T059/`; no local draft is left in any browser profile. The documentation
  checklist's entries are for T102: `docs/ARCHITECTURE.md` on the stored order (the
  `document_order` column, a reorder-only save that creates no revision and calls no EUDIPLO, the
  revisions, the DCQL query and the delivery in catalog order), on `move_document`, and on the
  drag (`useRowDrag`, `rowDragReducer`); CLAUDE.md's "a measured height" widened to "a measured
  value (a height, a drag's offset)" (§4.1 call 1); data-model §10's "a drag in progress" in the
  view reducer, which is a reducer of its own (§4.2 T057).
- 2026-11-11: US6's checkpoint (T062, the coordinator). The gates are green on both sides: the
  root gates rerun by the coordinator at the checkpoint, after the two comment corrections (lint;
  `npm test` with the counts above, `rules/`' load-sensitive budget in `performance.test.ts`
  failing once at 1897 ms against 1500 while the machine was loaded and passing on `npm test -w
  rules` alone; build); the backend's Ruff, mypy and the fixtures' `--check` rerun at the
  checkpoint, pytest as above. T061's walk V9 (§2.2): 376 measures, 372 pass, 0 fail, 0 unsure, 4
  "Needs a person" (Firefox's real touch scroll and the browser's `pointercancel`, which Juggler's
  synthesized touch can't produce; Chromium's CDP touch covers both), over V9.1–V9.8 × English and
  German × Chromium and Firefox; its trial run's one failure (V9.6, the test step's data) was fixed
  (§4.2 T061). The tables of T058 (33 rows) and T059 (55 rows) in §2.1 have no open row. The
  backend's log of the phase (1789 lines; T061's walk between its markers) holds uv's lines (uv
  recreating `backend/.venv`, linked to another machine's interpreter, as in phase 7's log),
  uvicorn's startup lines and its access lines only (methods, paths with ids, statuses; no query
  string); no name, person, date, document or order. The phase's diff adds no log call in
  `backend/app`, no `console.*`, no inline style (the drag's offsets and the copy's box are CSS
  custom properties set with `style.setProperty`, §4.1 call 1), no `any`, no `dark:` and no
  `focus:`. **Left for a person** (tasks.md, phase 8 "Needs a person"), so T062 stays open: a real
  touch screen once for the press-and-hold and the scroll (the walk drove CDP's touch in Chromium
  and Juggler's in Firefox), and a screen reader (Orca or NVDA) once for the move's announcement
  "“<document>” moved to position <n> of <m>." (the walk read it in the `role="status"` region).
- 2026-11-12: phase 9, US7 (T063–T070), each wave's gates green on the combined tree. The
  environment: two scratch copies of phase 8's database (`CREATE DATABASE … TEMPLATE
  konnekt_db_010_p8`): `konnekt_db_010_p9` with the team's connections, and
  `konnekt_db_010_p9_empty`, the installation without connections the welcome page needs (every
  connection, its dependent rows and every approval request truncated; the accounts and tokens
  kept; emptied again by the coordinator before T070), so the development database was not
  emptied (the phase's "Needs a person" asked for that or a second database). Backend A on 3012
  (`konnekt_db_010_p9`) with Vite on 5176 and backend B on 3013 (`konnekt_db_010_p9_empty`) with
  Vite on 5177, both with the fake EUDIPLO (the launcher copied into this chat's scratchpad),
  `WORKER_ENABLED=false` and the default restore time, restarted after wave 1 so that waves 2 and 3
  ran T063–T064's endpoint. Migration `1b6d7a28c6b2` (the example mark, T063) applied to
  `konnekt_db` and both copies. Test counts after the phase: pytest 2449 passed (2425 after phase
  8, +24: the example's mark on every existing row 1, the example 18, the fixture 5), run by T065
  after its last backend edit (started 23:43:49, the last edit 23:43:37) and not rerun by the
  coordinator (the user's standing rule; no backend file changed after it); Ruff, mypy over 95
  files and the fixtures' `--check` rerun green after waves 1 and 2 and at the checkpoint;
  `rules/` 46 files, 2664 tests (+8: the example has no problem and no finding, its statements);
  `frontend/` 35 files, 1536 tests (+28: the welcome page's dialog 10, the editor's example
  helpers and the banner's sentences); `mcp/` 15 files, 473 tests (+9: the example mark). The
  generated files gained `rules/src/fixtures/example-connection.json` (T065); the other three were
  left byte for byte. Waves ran as planned, with no change of level or batch. **Plan changes**
  (§4.2): the batch T063/T064's files gained the `example: null` fixtures of four frontend and two
  MCP test files and two backend tests that pin the summary's keys; T068's gained
  `FormConnectionEditor/index.tsx`, `FormConnectionEdit/index.tsx` and
  `components/ExampleBanner/{constants.ts,constants.test.ts}` (the coordinator's decision on
  T066's UNCERTAIN 2: the variant's banner names the variant by its stored name); T081's gained
  `mcp/plugin/skills/connection-workflow/SKILL.md` (T069's note: the stale search statuses). T068
  built two rules frames that had changed since the audit, since the change is the one F29 asks
  Figma to make (§4.2 T068 (1)). copy.md §6 gained the banners' German (T066), the dialog's body
  and no-answer body (T067) and the publish dialog's line (T068); spec 009's glossary gained the
  example dialog's title and "Go back" (T067). `mcp/src/checks.test.ts` ("keeps the results the
  worker posted …", a 200 ms timer) failed once under the load of four agents in T067's and
  T069's runs and passed alone, like `rules/`' budgets. The tasks left in `konnekt_db_010_p9` the
  drafts `T066 example banner check` and three examples of T068 (`1cf89703-…`, `cf375719-…`,
  `b20da9cc-…`, named as the example); every row T067 and T070 made in `konnekt_db_010_p9_empty`
  is deleted (hidden, restorable until the worker would finish them; the worker is off), and
  screenshots in the repository's git-ignored `.playwright-mcp/T066/`, `.playwright-mcp/T067/`,
  `.playwright-mcp/T068/` and `<scratchpad>/T066/`; no local draft is left in any browser profile.
  The documentation checklist's entries are for T102: CLAUDE.md's generated files ("Rule checks"
  and "Never") gain `rules/src/fixtures/example-connection.json`, rerun after a change to
  `backend/app/example.py` or to the labels the example uses; ARCHITECTURE's "Form connections"
  (the example mark, `create_example()`, its endpoint, `_publish()` clearing the mark), the
  developer scripts' fourth file, and the frontend section (the welcome page's dialog, the
  banners, the publish dialog's line); the `contracts/mcp-tools.md` wording notes of §4.2 T069.
- 2026-11-12: US7's checkpoint (T071, the coordinator). The gates are green on both sides: the
  root gates rerun by the coordinator after wave 2 (lint, `npm test` with the counts above, build),
  and no repository code changed after that run (T070 fixed nothing; only `mcp/dist/`, git-ignored
  build output, is newer); the backend's Ruff, mypy and the fixtures' `--check` rerun after wave 2
  and the fixtures' `--check` again at the checkpoint, pytest as above. T070's walk V10 (§2.2): 289
  measures, 289 pass, 0 fail, 0 unsure, over V10.1–V10.6 × English and German in Chromium; SC-008
  by script, from the click on "Start from an example" to step 1 with its banner: 548 ms (English),
  481 ms (German). The tables of T066 (35 rows), T067 (43) and T068 (42) in §2.1 have no open row.
  The backend's log of the walk (`backend-3013.log`, 202 lines between T070's markers) holds
  uvicorn's access lines only: methods, paths with ids (`/api/form-connections/example` the only
  word), statuses; no name, person, date, variant or rule. The app configures no logging, so its
  own INFO lines don't reach that log: the phase's diff adds two log calls in `backend/app`, each
  with an id only ("Draft %s saved", "Example draft %s saved"); the frontend's diff adds no
  `console.*`, no inline style, no `any`, no `dark:` and no `focus:`. **Left for a person**
  (tasks.md, phase 9 "Needs a person"), so T071 stays open: SC-008's 10 seconds timed once by
  hand, from the welcome page to the example's step 1 (the script measured the same span).
- 2026-11-12: phase 10, US9 (T105, T072–T076), each wave's gates green on the combined tree. T105
  asked the user: the data group `licence` is "Fahrerlaubnis" in German (§4.2 T105; data-model §6,
  T072's line and spec 009's glossary row amended before T072 ran). The environment: a scratch
  copy of phase 9's database, `konnekt_db_010_p10` (`pg_dump` of `konnekt_db_010_p9` into a new
  database, Alembic head `1b6d7a28c6b2`; no migration in this phase), backend on 3014 with the fake
  EUDIPLO (the launcher copied into this chat's scratchpad), `WORKER_ENABLED=false`, started after
  wave 1 so that waves 2 and 3 ran T072's catalog, and Vite on 5178. Test counts after the phase:
  pytest 2457 passed (2449 after phase 9, +8: the catalog's groups and their German labels), run
  by T072 after its last backend edit and not rerun by the coordinator (the user's standing rule;
  no backend file changed after it); Ruff, mypy over 95 files and the fixtures' `--check` rerun
  green after wave 1 and at the checkpoint; `rules/` 46 files, 2664 tests (unchanged);
  `frontend/` 35 files, 1552 tests (+16: the grouping helpers and the group's removal);
  `mcp/` 15 files, 477 tests (+4: `get_catalog`'s groups). The generated
  `rules/src/fixtures/example-connection.json` was regenerated by the script (its `document_types`
  carry `field_groups` and `group`); the other three generated files left byte for byte. Waves ran
  as planned, with no change of level or batch. **Plan changes** (§4.2): T072's files gained
  `backend/tests/api/test_form_connections.py` and `backend/scripts/export_check_fixtures.py`;
  T074's gained `FormConnectionEditor/{types.ts,index.tsx}` and `DocumentsStep/index.tsx`, and
  left `DocumentsStep/{reducer.ts,reducer.test.ts}` unchanged. One open point added to §4.3 (the
  group question's German title, for T097). The tasks left in `konnekt_db_010_p10` the rows
  `T074 draft`, `T074 live` and T076's eight (`T076 {en,de} {rules,live,by group,one by one}`,
  ids in §2.2 T076's run); screenshots in the git-ignored `.playwright-mcp/T074/`; no local draft
  is left in any browser profile. The documentation checklist's entries are for T102:
  ARCHITECTURE's catalog (`FIELD_GROUPS`, `CatalogDocumentType.field_groups()`, more than 10 data
  items, only `GET /api/document-types` fills a field's `group`), the frontend's documents step
  (the grouped panel, `groupedFieldsOf()`, the group's removal through the "All data items"
  question) and the MCP server's `get_catalog` (`group`, `groups`, English); no new environment
  variable or dependency.
- 2026-11-12: US9's checkpoint (T077, the coordinator). The gates are green on both sides: the
  backend's Ruff, mypy and the fixtures' `--check` and the root gates (lint, `npm test` with the
  counts above, build) rerun at the checkpoint, after T076, which changed no repository file;
  pytest as above. T076's walk V11 (§2.2): 414 measures, 414 pass, 0 fail, 0 unsure, over
  V11.1–V11.5 and SC-012 × English and German in Chromium; SC-012's two drafts (by group, one by
  one) saved equal. T074's table in §2.1 (48 rows) has no open row. The backend's log of the walk
  (`backend-3014.log`, 146 lines between T076's markers) holds uvicorn's access lines only:
  methods, paths with ids, statuses (all 2xx, four of them CORS preflights); no name, person,
  date, group or rule. The phase's diff adds no log call in `backend/app`; the frontend's, rules',
  MCP's and api-types' diffs (with the new `FieldGroup.tsx`) add no `console.*`, no inline style,
  no `any`, no `dark:` and no `focus:`. Phase 10's "Needs a person" lists nothing, so T077 is
  ticked.
- 2026-11-12: phase 11, US8 (T078–T082), each wave's gates green on the combined tree. The
  environment: a scratch copy of phase 10's database, `konnekt_db_010_p11` (`pg_dump` through
  the PostgreSQL container, since the host's `pg_dump` 17 refuses server 18); phase 10's backend on
  3014 and Vite on 5178 kept running (another chat's processes, left alone), so this phase's
  backend ran on 3015 with the fake EUDIPLO (the launcher copied into this chat's scratchpad),
  `WORKER_ENABLED=false`, without `PORTAL_URL` (§4.2 T082 (2)), started after wave 1; Vite on
  5179; the MCP server on 3101 (`BACKEND_URL` 3015) for wave 3. Migration `1f5e81861348` (the
  approvals' start dates, T078; autogenerated, nothing by hand) applied to `konnekt_db` and
  `konnekt_db_010_p11`, its downgrade run once on the copy. Test counts after the phase: pytest
  2557 passed (2457 after phase 10, +100: the approvals' start date, preconditions, snapshot,
  staleness and races, and the access table's rows), run by T079 after its last backend edit and
  not rerun by the coordinator (the user's standing rule; no backend file changed after it); Ruff,
  mypy over 95 files and the fixtures' `--check` rerun green after wave 1 and at the checkpoint;
  `rules/` 46 files, 2664 tests (unchanged); `frontend/` 35 files, 1565 tests (+13: the approval
  page's sentence helpers); `mcp/` 15 files, 510 tests (+33: the start date's cases). T079's
  mutation check broke 19 points of the new logic one at a time and a test failed for each
  (`<SP>/T079/mutations.txt` of this chat). Waves ran as planned, with no change of level or batch.
  **Plan changes** (§4.2): T079's files gained `backend/tests/api/{test_deletions.py,
  test_scheduling.py}`, `frontend/src/pages/Approval/{types.ts,constants.ts,utils.test.ts}` and
  `mcp/src/tools/approvals.ts` (type-level entries for the new action, replaced by T080 and T081);
  T080's gained `frontend/src/pages/Approval/ApprovalLinkCards.tsx` (an optional lead). copy.md §7's
  German title amended to „<name>“ by the coordinator (§4.2 T078/T079). The tasks left in
  `konnekt_db_010_p11` the rows `T080 …` with the unchanged example draft
  `d443d829-7b9a-45a2-9ebf-63dab1943ccd` and T080's requests, and T082's seven connections
  (`T082 live` `686534ef…`, scheduled for 08.12.2026 by the walk; `T082 scheduled` `1c7b4465…`;
  `T082 deactivated` `87261bfe…`, now scheduled; `T082 draft` `49039240…`; `T082 publish on a date
  draft` `d1ce006f…`, now scheduled; `T082 moved scheduled` `a64cc65c…`; `T082 passed draft`
  `7cb33f50…`) and six requests (`f1ac0ae2…`, `a8a659fd…`, `e78c88ee…`, `8517ec50…`, `1ae617c1…`
  cancelled, `e521b00b…` with its `start_date` set to today in the database; full ids in
  `<SP>/T082/state.json` of this chat); every personal access token of the phase is revoked (T082's
  three by T082, T080's two by the coordinator, each bearer answering `401` afterwards);
  screenshots in the git-ignored `.playwright-mcp/T080/` and `<SP>/T082/shots/`; no local draft is
  left in any browser profile. The documentation checklist's entries are for T102: ARCHITECTURE's
  "Agent access" (a request's `start_date`, the action `set_start_date` at level `manage`, the
  status snapshot `StatusSnapshot` checked under the row lock through `expected=`, the computed
  `start_date_passed`, `connection_changed` worded from the connection's state and the action, a
  done publish answering `preview.connection`), the MCP server's `request_approval` and
  `check_approval` (`start_date`, `'now'`, the wait sentences and texts of §4.2 T081 (1), (4) and
  (7), for `contracts/mcp-tools.md` too), and the frontend's approval page (`set_start_date` as a
  status action, a scheduled connection's links copyable); no new environment variable or
  dependency.
- 2026-11-12: US8's checkpoint (T083, the coordinator). The gates are green on both sides: the
  root gates (lint, `npm test` with the counts above, build) rerun by the coordinator after wave 2,
  and no repository file changed after that run (T082 fixed nothing); the backend's Ruff, mypy and
  the fixtures' `--check` rerun at the checkpoint; pytest as above. T082's walk V12 (§2.2): 241
  measures, 241 pass, 0 fail, 0 unsure, over V12.1–V12.9 (and V12.7b) in English and German, with
  personal access tokens at the three levels against the MCP server and a scripted Chromium. T080's
  table in §2.1 (161 rows) has no open row. **The MCP server's log of the walk**
  (`mcp-3101.log`, 88 lines between T082's markers) holds JSON lines with `method`, `tool`,
  `status` and `durationMs` only. The backend's log of the walk (`backend-3015.log`, 571 lines
  between the markers) holds uvicorn's access lines only: methods, paths with ids, statuses; the
  one text in it is the walk's own search, `search?q=T082+draft`, in two lines: the search's query
  string of spec 007, which uvicorn logged before this feature too (as §4.3's cursor note), not a
  log line this phase added. The phase's diff adds no log call in `backend/app`, and its frontend,
  MCP and api-types diffs add no `console.*`, no inline style, no `any`, no `dark:` and no
  `focus:`. **Left for a person** (tasks.md, phase 11 "Needs a person"), so T083 stays open: a
  real MCP client (Claude Code or Claude Desktop) with an agent connection at each access level,
  signed in through OAuth, once through V12.3 and V12.5 (the walk used personal access tokens made
  through the API and a client without URL elicitation, so the elicitation prompt "Approve
  changing the start date of '…' in Konnekt." wasn't seen in a real client).

- 2026-11-12: phase 12, verify and close (T084–T106, T114). The environment: a scratch copy of
  phase 11's database, `konnekt_db_010_p12` (dumped through the PostgreSQL container), with its
  backend on 3016 (the fake EUDIPLO, `WORKER_ENABLED=false`, `PORTAL_URL` set to its Vite) and Vite
  on 5180; a second, empty installation for wave 4, `konnekt_db_010_p12_empty` (Alembic head
  `1f5e81861348`, the accounts only), backend on 3017 with `DELETION_UNDO_SECONDS=20` and Vite on
  5181, so the development database wasn't emptied; the MCP server on 3102 for T100. Earlier
  chats' servers (3011–3015, 5173–5179, 3101) were left alone; this phase's were stopped at the
  end. Waves 1–7 ran as planned, but for the plan changes below: T084 (the coordinator, with the
  user's four answers, §4.2 "T084"), T085's harness, T086's text pairs; the sweeps T087–T096
  (16,000–21,000 rows each, both browsers, both languages, three widths, English Chromium
  included); T097 (the coordinator's pass, the user's choice; a German-speaking person's read
  stays open, so T097 stays unticked); T098 and T106 (the fixes), T099 (the German corrections),
  T100 (V15). T101's convergence appended Phase 13 (T107–T114); its wave C1 stopped on the
  account's usage limit before any file changed, and the user then chose to skip the remaining
  checks and write the documentation and the commit message, so T107–T113 and T101 stay open
  (§4.2 "T101"); T114 ran in T102's batch; T103 wrote §6 and `pr.md`. **Plan changes** (§4.2):
  T098 split by folder into T098 and the new T106 (wave 5b); T099 depends on T106 and ran on
  T097's recorded pass while T097 stays open for a person; T106 also edited
  `FormConnectionList/constants.ts`; T102 also edited spec 008's `research.md` and
  `data-model.md`; T114 joined T102's batch; T107–T113 not run. **The checkpoint (T104, the
  coordinator)**: the gates are green on the final tree: Ruff, `ruff format --check` (109 files),
  mypy over 95 files and the fixtures' `--check` rerun by the coordinator after T102 and T103,
  which changed Markdown only; the root gates (lint; `npm test`: `rules/` 46 files, 2664 tests,
  `frontend/` 36 files, 1573 tests, `mcp/` 15 files, 510 tests; build) rerun likewise; pytest
  2557 passed, run by T100 after the last backend edit (T099's) and not rerun by the coordinator
  (the user's standing rule; no backend file changed after it). Against T001's baseline: rules
  2642 → 2664, frontend 1267 → 1573, mcp 408 → 510, pytest 2161 → 2557. Design-notes §2 holds no
  open row (the sweeps' defects fixed and rerun by T098, T106 and T099; the baseline findings
  outside the feature listed in §6.3 (c)); §4.3 holds no undecided point. **T104 stays open**:
  the tasks T031, T037, T045, T052, T062, T071, T083, T097, T101 and T107–T113 are not ticked,
  and 16 person steps remain (§6.3 (a), (b)).

## 6. Closing report

T103 (phase 12, 2026-11-12). It cites §2–§5, `tasks.md` and `figma-audit/report.md`; nothing here
is re-decided. The pull request's text is [pr.md](pr.md).

### 6.1 The success criteria

"pass" means the criterion's measured part holds in every row cited; a person step or a
convergence gap that touches the criterion is named in the last column and listed in §6.3.

| SC | what it asks | proved by (task, table, row or walk step) | result |
|---|---|---|---|
| SC-001 | Scheduled with one choice and one date; active within a minute of the day's start in Germany, nobody signed in | T030 walk (§2.2 `#### T030`) V1.1–V1.3 (the publish dialog's "On a date", the details), V3.3 (the worker's start: links working 0.5–1.3 s and details active 1.7–2.7 s after the `UPDATE`, one worker cycle, 4 cells); T021's pytest (the activation step); T023/T024 tables (§2.1) | pass; a publish on a date against the hosted EUDIPLO and the minute timed by hand are person steps (T031) |
| SC-002 | Before the start date the links answer as a deactivated connection's, from it as an active one's | T030 V1.4 (409 `unavailable`, 4 cells), V3.3 (links work from the start); T019's pytest `test_connect.py::test_a_scheduled_connections_urls_answer_as_a_deactivated_ones`; T100 V15.2 (§2.3 `#### T100`: `P3 seed scheduled` and `P3 seed deactivated` byte for byte equal but for the id) | pass |
| SC-003 | Status and its date, and a draft's step, readable on the overview and the details; dates match what happened | T017 walk V5.1–V5.5 (480 of 480 measures; publish, deactivate, reactivate, rename, save, a pre-feature row, another time zone); T013 (37 rows), T014 (59), T015 (58) tables; T088 sweep (both languages, both browsers, three widths) | pass |
| SC-004 | Every FR-025 action by a person, an agent or an approval shows with time, event and person; nothing FR-029 excludes is stored | T036 walk V6.1–V6.8 (423 of 423; V6.1 eight actions by two people and an agent, V6.4 an approved publish, V6.8 the stored table holds kinds only, no rule content, message or value); T082 V12.3–V12.4 (an agent's `move_document` in the card, `get_activity` against the card); T100 V15.3 (no name, date or activity text in the logs) | pass; "<name> with <agent>" for a real MCP client signed in through OAuth is a person step (T037) |
| SC-005 | "Undo" within the restore time brings back all of FR-034 for each status and a bulk deletion; afterwards nothing restores | T044 walk V7.1–V7.8 (714 of 714; each status, the last connection, a late and a replayed "Undo", V7.8 after the restore time); T051 V8.4 (bulk "Undo"); T041/T042's pytest; T095 sweep | pass for every walked case; **gap open**: T110 (a bulk deletion's rows get increasing `deleted_at`, so a draft finished first can leave a partial restore; §4.2 T101) |
| SC-006 | Ten deleted with one confirmation in under 30 s; never only some of the selection | T051 V8.6 (first checkbox to toast 1.45 s, confirmation to toast 0.32–0.35 s, en and de), V8.5 (`409 selection_changed`: nothing deleted); T046's pytest (three races with real sessions); T091 sweep, T106 (no retry after `409`) | pass; the 30 s by hand is a person step (T052) |
| SC-007 | Reorder by mouse, touch and keyboard; the same order after save, reload and publish everywhere; serviceBW's answers unchanged | T061 walk V9.2 (mouse), V9.3 (touch), V9.4 (keyboard), V9.6–V9.7 (the order everywhere, a published connection) (376 measures: 372 pass, 4 "Needs a person"); T058 (33 rows), T059 (55) tables; T092 sweep; T100 V15.2 (`/api/connect/` unchanged) | pass by script; a real touch screen is a person step (T062); **gap open**: T112 (a single document can be dragged) |
| SC-008 | Welcome page to a complete example draft in two activations and under 10 s; publishable unchanged | T070 walk V10.1 (548 ms en, 481 ms de, two activations), V10.3 (published unchanged); T066–T068 tables; T096 sweep | pass by script; the 10 s by hand is a person step (T071) |
| SC-009 | Every frame of the nine items passes spec 008's visual verification; every new screen and state passes the keyboard walkthrough, 320 px at 200 % zoom and AA contrast, in both languages | the per-node tables of §2.1 (T005–T080); the sweeps T087–T093, T095, T096 (§2.3: German at 320 and 160 CSS px, Firefox at the three widths, contrast, focus-visible, label widths, live regions, `<html lang>`), T094 (V13, the toasts' 6 s); the fixes T098 and T106, rerun, "Open rows: none" for this feature (T098's open rows are baseline or T106's, T106's none); T086 and the German review (§3), applied by T099 | pass by script; open person steps: the screen reader pass of V14, 200 % with a browser's own zoom in a 320 px window, a German-speaking person's read (T097) |
| SC-010 | An agent reads the scheduled status, the dates, the step, the order, the example mark and the activity, moves a document, and its work shows in the card; the guidance describes each | T082 walk V12.1–V12.9 (241 of 241, three access levels, 26 tools; V12.9 `guidance.test.ts` 24/24); the MCP tasks' tests (T016, T029, T035, T060, T069, T075, T081; `mcp` 510 tests) | pass; **gap open**: T107 (`search_connections` doesn't say that a scheduled item's URLs answer "unavailable"); a real MCP client through OAuth is a person step (T083) |
| SC-011 | Every existing check still passes; behaviour the feature doesn't name is unchanged | T100 V15.1 (all gates; rules 2642 → 2664, frontend 1267 → 1573, mcp 408 → 510, pytest 2161 → 2557; the 26 changed existing test files traced, §4.2 T100), V15.2 (`/api/connect/`), V15.3 (logs), V15.4 (FR-076's texts) | pass; the convergence's T113 (the router builds the grouped view) is a structure finding, not a behaviour change |
| SC-012 | A group chosen or cleared with one activation equals ticking each item; an agent reads each item's group | T076 walk "SC-012 by group" and "SC-012 one by one" rows (the two drafts saved equal), V11.2 (tick, clear, mixed); T074 table (48 rows); T075's tests (`get_catalog`'s `group`, `groups`); T093 sweep | pass |

Every criterion is proved by script for what it measures. Three carry a convergence gap that was not
built (SC-005 T110, SC-007 T112, SC-010 T107); seven carry a person step (SC-001, SC-004,
SC-006, SC-007, SC-008, SC-009, SC-010).

### 6.2 For the designer

Every item below is built as the spec says, with Figma's layout and styling kept where the spec
allows it. The details are in §1, §4.2 and the audit's "Figma must change (decided)" table; the
audit's W1–W18 (built without frames) need frames too.

**The build's deviations** (§1, and one from §4.2):

- A5 `7290:61214`: the Personal ID's nationality stands under "Birth" (Birth 4, Other details 4).
- P12 `6396:48860`, P16b `7173:52959`: "Change start date" and "Activate again" use C2's "Active
  from" group as P1 draws it (legend, 16 px indent, field under the radios); the dialog is 432 px
  high against 392. A compact C2 variant is the designer's call.
- R2 `7298:63736`: the dragged copy keeps R1's opacity 0.85 (R2 draws 0.75).
- U27 `7301:63418`, `7301:63416`: the drag's values without a KERN name became tokens
  (`--shadow-drag-copy`, `--radius-drag-copy`, `--radius-drop-line`).
- U03 #39: between `md` and about 900 px the status pill wraps under the name inside the "Where you
  are" pill (72 px pill, 88 px header); no frame draws 768–1023 px.
- P1b `6380:26675` (the field in S15 and S17 too): the start date field's unfocused line is
  `layout-border` `#6b7488` (4.69:1), not `decorative-border` `#e1e6f0` (1.25:1, under WCAG
  1.4.11's 3:1).
- §4.2 T038: this feature's deletion toasts are the new `danger` kind as "Rules/Toast"
  type=danger `6718:40958` draws it; spec 008's variant and rule deletion toasts in the rules step
  (U61 `6523:37991`, U35 `6113:29469`) stay neutral.

**The audit's "Figma must change" items F1–F43**, grouped (frames as the audit cites them):

- *Wording and layer names*: F3 (U02 note 8, P1b, P1c): "Active from", not "Becomes active". F10
  (P12): the hint says requests in progress are cancelled. F23 (P18): an active row reads
  "Published <date>". F24 (1b): "Start from an example". F25 (U21–U28, U98): the added list's
  layer "in the order staff set". F26 (U12, U16, U17): each checkbox and delete layer named after
  its own row. F27 (U93): the draft band's and Links card's sentences. F42 (1j): the new example's
  row reads "Edited <date> · Connection step". F43 (note 34, U16): the banner's button is
  "Discard" ("Verwerfen").
- *Not built (FR-076)*: F4 (no row reads "Changes not published"), F5 (E2, E5a, E5b, E7: the edit
  header shows only the status pill), F6 (no "Keep draft and exit", no "Draft kept" toast; footer
  "Back · Discard changes · <next> · Save"), F7 (E5a: leaving opens E5b "Save your changes?"), F12
  (no "Download PDF" in any Summary card), F13 (P16: "Connection deactivated." has no "Undo"), F14
  ("Unlink from Standard"), F15 and F16 (U21, U22: no "coming soon" documents or hint), F17 (no
  findings in the details' Summary), F18 (U65: no "Message <name> reads" box for a persona who
  meets the rules), F19 (U58: no "Group with other rules" on a group's menu), F20 (U13: no e-mail
  line in the user menu), F31 (U93: no view-only draft details; S2 stays out of scope).
- *Spec 008's behaviour and bodies kept*: F8 and F9 (E3: spec 008's "Save changes?" body, no
  "Active from"), F11 (P15: spec 008's deactivate body), F32 a–n (menus, shell, overview, create and
  documents steps, removal, rules, test, publish dialog, edit flow, leaving, details, dialogs, toast
  types, scope: as specs 001–009 built them), F33 (no "x of y"), F34 (A10, A11: the remove dialog
  before every removal), F35 (note 17: the active delete sentence of frames 4 and P17), F36 (note
  23: only the nine items' frames are ported), F37 (note 26: the findings banner as built), F38
  (note 37 #2: the description tooltip's hover, focus and tap rule), F39 (6a: "Leave this
  connection?" in the create flow; 6a not built).
- *Frames to redraw*: F1 (note 1: `<html lang>` follows the language), F2 (note 7: the failure
  alert may wrap for its error ID), F21 (notes 30, A12: toasts close after 6 s, paused under the
  pointer or the focus), F22 (note 31: reduced motion drops the drag's transitions), F28 (note 16,
  1b: the welcome page's two buttons), F29 (1i, 1i-c: no "1" beside a variant tab; T068 built the
  two rules frames that had changed since the audit, §4.2 T068 (1)), F30 (16b: the unchanged
  example's background from 1i, and "Ambulance · 2 rules" in the summary), F40 (P9, P10: Links,
  Summary and Activity as one accordion, Links closed), F41 (A7–A12, R1–R3: the data groups' order
  and membership from the catalog).

### 6.3 What stays open

**(a) Tasks not ticked in `tasks.md`** (17 besides this one):

| task | why it is open |
|---|---|
| T031 (US1 checkpoint) | person steps: a screen reader over the publish dialog's date error; a publish on a date against the hosted EUDIPLO (every browser publish ran against the fake); optionally SC-001's minute by hand (§5) |
| T037 (US3 checkpoint) | person step: a real MCP client through OAuth, whose name shows as "<name> with <agent>" (§5) |
| T045 (US4 checkpoint) | person step: a screen reader for "“<name>” restored." (§5) |
| T052 (US5 checkpoint) | person steps: SC-006's 30 s by hand; a screen reader for "<n> selected" (§5) |
| T062 (US6 checkpoint) | person steps: a real touch screen for press-and-hold and scroll (T061's 4 "Needs a person" rows); a screen reader for the move's announcement (§5) |
| T071 (US7 checkpoint) | person step: SC-008's 10 s by hand (§5) |
| T083 (US8 checkpoint) | person step: a real MCP client (Claude Code or Claude Desktop) at each access level through OAuth, once through V12.3 and V12.5, with the elicitation prompt (§5) |
| T097 (German review) | the coordinator's pass is done and applied (§3, T099); a German-speaking person's read of the nine items' German screens is open |
| T101 (convergence) | its appended tasks T107–T113 were not built, by the user's decision (§4.2 "T101") |
| T107–T113 | not built (§4.2 "T101"): T107 `search_connections`' scheduled note (FR-062, SC-010); T108 the overview row's scheduled edit entry body (FR-013); T109 the example's banners after "Resume editing" (FR-058, FR-060; amends §4.2 T068 (3)); T110 one `deleted_at` per deletion and an approval's deletion finished at once (FR-030, FR-044, SC-005; amends §4.2 T041 (6)); T111 "Change start date" from a stale page (FR-009); T112 no drag of a single document (FR-046); T113 the grouped view out of the router (CLAUDE.md) |
| T104 (close checkpoint) | its own condition "every task above is ticked" can't hold while the rows above stay open; it hands the user this list |

**(b) Person steps still open** (tasks.md "Needs a person", §5): phase 4: the hosted EUDIPLO
publish on a date, a screen reader over the date error, SC-001's minute by hand (optional); phase
5: a real MCP client's name in the card; phase 6: a screen reader for the restore; phase 7: SC-006's
30 s by hand, a screen reader for the count; phase 8: a real touch screen, a screen reader for the
move; phase 9: SC-008's 10 s by hand; phase 11: a real MCP client at each level through OAuth;
phase 12: quickstart V14's screen reader pass (Orca or NVDA) over the publish dialog, the selection
bar and the Activity card, 200 % zoom with a browser's own zoom in a 320 px window, T097's
German-speaking reviewer, telling the designer §6.2, and the user's commit and pull request. Done
or no longer needed: phases 1, 2 and 10 (§5), phase 6's backend restart (T044 ran its own), the
emptied database of phases 9 and 12 (second installations, §5 and §4.2 "T087–T096"). Open: 16
steps.

**(c) Baseline findings outside the feature, for a follow-up** (FR-074 kept them; §4.2
"T087–T096" (a)–(f) and "T106" (g)): (a) "Add document"'s label wraps out of its 36 px box below
320 CSS px (`DocumentsStep/SearchCard.tsx`); (b) a based variant's rule text is 55–70 px wide at
320 CSS px (`components/RuleRow/`); (c) the link strip sentence is 54–96 px wide at 320 CSS px
(`RulesStep/LinkStrip.tsx`); (d) below 320 CSS px German words break without a hyphen in spec
008's chrome (its narrow rule, by design); (e) a done approval request's sub-line still reads its
passed expiry time (spec 007's `subtitleOf()`); (f) the overview's icon-only delete button's
`kern-sr-only` (no defect, recorded); (g) spec 002's rule editor fields draw the 1.25:1
`decorative-border` line (`RuleEditor/ValueInput.tsx`, `RulesStep/ItemName.tsx`,
`RuleEditor/MessageField.tsx`, `components/MenuSearchField`).

**(d) Deployment**: `docker-compose.prod.yml` doesn't pass `DELETION_UNDO_SECONDS`, so a deployment
always uses 300 s (§4.2 "T102 and T114"; a code change, outside T102).

**Open points** (§4.3): none.
