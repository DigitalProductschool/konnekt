# Design notes: the KERN Revamp port

**Created**: 2026-11-07 in pass C (`/speckit-plan`); filled by the tasks of passes D–I.
**Spec**: [spec.md](spec.md) · **Plan**: [plan.md](plan.md) · **Research**: [research.md](research.md)
· **Screens**: [contracts/ui-screens.md](contracts/ui-screens.md)

This file is the record of the port that outlives the chats: the token overlay (§1), the decision
per component (§2), the patterns for the states the design does not draw (§3), the motion (§4),
the **verification tables** that are the evidence of "matches its frame" (§5, FR-016, SC-001),
the results of pass I (§6), the removal checklist (§7) and what became history (§8). A task
appends to the section it affects and never deletes another task's rows.

Conventions, as in spec 002's notes §1: apostrophes are typographic (’), node ids are quoted as
`U## node-id`, and a value is written as Figma gives it (px without unit, hex colours lower-case).

## 1. Token overlay

**Where**: one `:root { … }` block in `frontend/src/index.css`, right after the four `@import`s
and before `@theme`, headed `/* KERN Revamp overlay (spec 008, design-notes §1) */`. It sets the
KERN variables below under KERN's own names (research R1). The `:root` pins of 2026-10 (the
adaptive type at its small-screen values, the baseline paddings, the alert icon size) are absorbed
into it. **Source**: the kit's `get_variable_defs` dump
([figma-audit/kit/variables.md](figma-audit/kit/variables.md), 26 pages, 92 variables, no value
conflicting between pages) diffed against `@kern-ux/native` 2.8.2's `kern.css` light theme on
2026-11-07; the KERN 2.8 values of variables the dump omits come from spec 002's design-notes §9.

### 1.1 Colours (light theme)

| Variable | Revamp | KERN 2.8 | Note |
|---|---|---|---|
| `--kern-color-layout-text-default` | `#0b1220` | `#131525` | also `action-state-indicator-shade` in Figma |
| `--kern-color-layout-text-muted` | `#4a5468` | `#51577a` | |
| `--kern-color-layout-text-inverse` | `#ffffff` | `#f3f4f7` | spec 002 §9 |
| `--kern-color-layout-background-default` | `#ffffff` | `#ffffff` | unchanged, no entry |
| `--kern-color-layout-background-hued` | `#f2f5fb` | `#f3f4f7` | spec 002 §9; the page's light blue |
| `--kern-color-layout-background-default-surface` | `#f2f5fb` | `#f3f4f7` (neutral-025) | the kit's `layout-layer-surface-contextual` has the same value; V2 |
| `--kern-color-layout-border` | `#6b7488` | `#6e7597` | |
| `--kern-color-decorative-border-default` | `#e1e6f0` | `#c0c3d5` | the kit's `decorative-border-contextual` |
| `--kern-color-decorative-border-level-1` | `#d0d8e6` | `#a9aec6` | spec 002 §9 |
| `--kern-color-decorative-brand-default` | `#4f8cff` | `#454b6b` | spec 002 §9 |
| `--kern-color-action-default` | `#1d56f0` | `#2044aa` | also `action-state-indicator-default` |
| `--kern-color-action-on-default` | `#ffffff` | `#ffffff` | unchanged, no entry |
| `--kern-color-action-focus-default` | `#0b1220` | KERN's neutral-700 | the focus ring colour; new in the kit |
| `--kern-color-form-input-border` | `#22293a` | `#1d2034` | |
| `--kern-color-feedback-info` | `#0284c7` | `#006b8c` | **AA**: 4.1:1 on white, 3.6:1 on its background: fails for normal text (V7, §1.5); the overlay sets **`#0273ae`** (T002) |
| `--kern-color-feedback-info-background` | `#e0f2fe` | `#c0f3ff` | |
| `--kern-color-feedback-success` | `#1d7a2e` | `#007155` | 5.4:1 on white |
| `--kern-color-feedback-success-background` | `#eaf7e6` | `#cdf2e4` | |
| `--kern-color-feedback-danger` | `#c4271c` | `#c31c13` | 5.7:1 on white |
| `--kern-color-feedback-danger-background` | `#fef1f0` | `#fee4e0` | |
| `--kern-color-feedback-warning` | `#9a4a00` | `#925400` | |
| `--kern-color-feedback-warning-background` | `#fff4e0` | `#ffe7b6` | |
| `--kern-color-feedback-default` | `#4a5468` | `#454b6b` | |
| `--kern-color-feedback-default-background` | `#eef1f6` | `#dfe1ea` | |
| `--kern-color-violet-025`, `--kern-color-violet-600` | `#f8f1fc`, `#9533be` | the same | unchanged; the variant marks keep `violet-650` / `violet-025` |

Opacities (`action-state-opacity-disabled` 40 %, `-overlay` 72 %, `-hover` an 8 % layer) have the
same meaning as KERN 2.8's `0.4`, `0.72` and `88 %` shade: no entry.

**V2 (T002, 2026-11-08)**: every `-contextual` alias in `kern.css` 2.8.2 is a `var()` of a plain
name, set on `body` and `[data-kern-theme]` (level 0) and on `.kern-level-1` / `.kern-level-2`; the
level-0 aliases derive from the plain names above or from ones the Revamp leaves unchanged
(`action-on-default`, `action-visited`, `action-state-indicator-*`), so the overlay sets no alias.
The `.kern-level-1/-2` aliases derive from `*-level-1/-2` names the kit does not define; the app
uses no `kern-level-*` class. KERN's level-0 `action-state-indicator-default-contextual` is
misspelt (`--kern-color-color-…`), but neither `kern.css` nor the app reads that alias. Measured on
`/login`: `layout-text-default-contextual` `#0b1220`, `layout-layer-surface-contextual` `#f2f5fb`,
`decorative-border-contextual` `#e1e6f0`, `feedback-info-contextual` `#0273ae`,
`action-default-contextual` `#1d56f0`, `form-input-border-contextual` `#22293a`,
`action-focus-default-contextual` `#0b1220`.

### 1.2 Radii, type, metrics

| Variable | Revamp | KERN 2.8 |
|---|---|---|
| `--kern-metric-border-radius-small` | 4 | 2 |
| `--kern-metric-border-radius-default` | 8 | 4 |
| `--kern-metric-border-radius-large` | 12 | 8 |
| `--kern-metric-border-radius-circle` | 9999px | 50 % |
| `--kern-typography-font-size-small-static` | 14 | 16 |
| `--kern-typography-font-size-medium-static` | 16 | 18 |
| `--kern-typography-font-size-large-static` | 18 | 21 |
| `--kern-typography-font-size-medium-adaptive` | 18 | 21 (24 from 768 px) |
| `--kern-typography-font-size-large-adaptive` | 24 | 26 (32 from 768 px) |
| `--kern-typography-font-size-x-large-adaptive` | 32 | 32 (40 from 768 px) |
| `--kern-typography-font-size-2x-large-adaptive` | 40 | 48 (56 from 768 px) |
| `--kern-typography-line-height-large-static` | 24 | 32 |
| `--kern-typography-line-height-medium-adaptive` | 24 | 24 (switches from 768 px) |
| `--kern-typography-line-height-large-adaptive` | 32 | 32 (switches) |
| `--kern-typography-line-height-x-large-adaptive` | 40 | 40 (switches) |
| `--kern-typography-line-height-2x-large-adaptive` | 48 | 56 (switches) |
| `--kern-metric-baseline-heading-{display,x-large,large,medium,small}-padding-{top,bottom}`, `-title-{large,default}-`, `-body-default-`, `-label-default-` | 12/12, 9/7, 7/9, 5/3, 6/2; 7/9, 5/3; 6/2; 6/2 | the same small-screen values (switch at 768 px) |
| `--kern-component-alert-icon-size` | 32 | 32 (switches) |

The adaptive variables and the baseline paddings stay in the overlay although some values equal
KERN's small-screen ones, because `kern.css` switches them at 768 px and the design draws one size
on every width (V1). Spacing (`space-*` 0–32), dimensions, border widths, font weights (body 400,
title / label / heading 600, heading-balanced 500, label-subtle 400) and Fira Sans are unchanged.

### 1.3 Project tokens (`@theme`)

| Token | Value | Status |
|---|---|---|
| `--default-font-family` | KERN's | stays |
| `--shadow-card`, `--shadow-menu`, `--shadow-toast` | Figma "Elevation/Card", "Elevation/Menu", the toast's shadow | stay unless the V5 frames' effects changed; the foundations task re-reads them on U11 (the list card), U54 (a menu) and U51 (the toast). **T003, 2026-11-08**: card and menu unchanged; the toast now uses "Elevation/Menu" (values below) |
| `--shadow-chip` | the sign-in illustration's chips | **removed** (the new sign-in art is an image, §7) |
| `--text-step` | the step circle's number | **removed** (the step line has no numbers, §7) |
| `--color-variant-changed(-background)`, `--color-variant-new(-background)` | warning / violet | cosmetic 22 says both marks use the same purple in the design: the shared-components task reads U57 `6522:32682` and U58 `6522:32977` and sets the two tokens accordingly, recording the hexes here. **T003, 2026-11-08**: both purple, `#8a22b5` on `#f8f1fc` (values below) |
| `--duration-pill` 240ms, `--duration-colour` 150ms, `--duration-height` 200ms, `--duration-page` 150ms | FR-050 | **new** (§4); set by T003 |

**Values set by T003 (2026-11-08)**, read with `get_design_context` on "Middleware – V5"; a Figma
drop shadow `(x, y), radius r, spread s, #rrggbbaa` is the CSS `box-shadow: x y r s` with the
colour's alpha:

| Token | Value | Figma source |
|---|---|---|
| `--shadow-card` | `0 1px 2px 0 rgb(19 21 37 / 0.05), 0 6px 20px 0 rgb(19 21 37 / 0.05)` | effect style "Elevation/Card": DROP_SHADOW `#1315250d` (0, 1) r 2 s 0 + DROP_SHADOW `#1315250d` (0, 6) r 20 s 0, on U11 `6699:44240` (the header pills `I6699:44242;6688:41393`, `I6699:44242;7341:101654`; the V5 list card `6699:44252` has a border and no shadow); unchanged |
| `--shadow-menu` | `0 10px 28px 0 rgb(19 21 37 / 0.16)` | effect style "Elevation/Menu": DROP_SHADOW `#13152529` (0, 10) r 28 s 0, as the style list of U51 `6197:11098` gives it; U54 `6522:33105` is the note "All ⋯ menus" and draws no menu (no effect); unchanged |
| `--shadow-toast` | `0 10px 28px 0 rgb(19 21 37 / 0.16)` | U51 `6197:11098` "Rules/Toast": "Elevation/Menu", as above; was `0 8px 12px 0 rgb(18 20 38 / 0.2)` |
| `--color-variant-changed` | `#8a22b5` | U57 `6522:32682`, "Changed here" text `I6522:32701;6118:3685;6118:3678` (variable "variant/changed-text (purple, same as new addition)"); U58 `6522:32977`, the group mark `I6522:32999;6162:4871;6118:3678` and the rule mark `I6522:33012;6118:3685;6118:3678` |
| `--color-variant-changed-background` | `#f8f1fc` | U57 the rule's outline `6522:32700`; U58 the group `6522:32997` and the rule's outline `6522:33011` (variable "variant/changed-background (purple, same as new addition)") |
| `--color-variant-new` | `#8a22b5` | U57 "Added here" text `I6522:32727;6118:3685;6118:3680`; U58 `I6522:33021;6118:3685;6118:3680` (variable `--kern-color-variant-new`, not a KERN 2.8 name) |
| `--color-variant-new-background` | `#f8f1fc` | U57 the outline `6522:32726`; U58 `6522:33020` (variable `--kern-color-variant-new-background`) |

The mark's text sits on a white label (`--kern-color-layout-background-default`, radius 4,
padding 2/8) inside the tinted outline: `#8a22b5` on `#ffffff` is 7.05:1 and on `#f8f1fc`
6.38:1, both AA, so §1.5 gets no row. The changed group on U58 `6522:32997` keeps a 3 px left
border in the action blue (`#1d56f0`), not purple.

**Images and glyphs exported by T004 (2026-11-08)** from "Middleware – V5" (research R1 "Icons
and images", build notes 9 and 14, constitution IV: no icon font). The PNGs are the layers'
own 2× exports, optimised losslessly with oxipng (pyoxipng 9.1.1; level 6, Zopfli, `optimize_alpha`; run once
through `uv run --no-project --with pyoxipng`, no project dependency); every visible pixel and
the alpha channel are unchanged. The SVGs are Figma's exports with the tinted fill replaced by
`currentColor`. Nothing imports them yet (phases 3–9 wire them); the old icons and
`illustrations/dot-grid.svg`, `illustrations/success-tick.svg` stay until T091.

| File (`frontend/src/assets/…`) | Pixels | Bytes | Source node | Notes |
|---|---|---|---|---|
| `illustrations/login-art@2x.png` | 662 × 1234 | 485,605 | U10 `6401:27994`, layer `7174:55658` "Picture · EUDI Wallet · half star" | shown at 331 × 617; **V3 fails**: 596,192 bytes as exported, 485,605 after lossless optimisation (lossless WebP would be 405,814); under 300 KB only with a lossy step (a 256-colour PNG is about 75 KB): open, for the user (ship 486 KB, or allow a lossy step) |
| `illustrations/published-art@2x.png` | 434 × 258 | 115,426 | U80 `6396:47648`, layer `7355:61161` "Picture · active" | V3 passes; build note 9 says 454 × 288 shown at 227 × 144, the V5 layer exports 434 × 258 (217 × 129); T006 (coordinator): the V5 layer governs (Figma decides), build note 9’s text is stale, the screens show it at 217 × 129 |
| `illustrations/published-art-grey@2x.png` | 434 × 258 | 37,117 | U89 `6417:31278`, layer `7355:61552` "Picture · deactivated" | V3 passes; same size note as the colour file; build note 9 names the layer "Picture · deactivated (grey)" |
| `illustrations/wallet-star@2x.png` | 400 × 386 | 159,094 | U11 `6699:44481`, layer `6699:44509` "Picture · EUDI Wallet · star" (its 2× export setting) | V3 passes; build note 9 says 400 × 385 (Figma rounds the 200 × 192.5 layer up); shown at 200 × 193 (overview) and 128 × 123 (U20 `7290:60367`, the documents' empty panel) |
| `icons/person.svg` | 24 × 24 | 1,438 | U11 `6699:44242`, `I6699:44242;7351:52637` "Icon · person (Material Symbols, outlined)" | `currentColor` (design: `color/action/default`); the account pill (build note 14) |
| `icons/expand-more-small.svg` | 20 × 20 | 877 | U11 `6699:44242`, `I6699:44242;7351:52639` "icon-expand_more-small" | `currentColor` (design: `color/action/default`); a KERN Revamp icon that KERN 2.8.2 lacks; same path as the old `expand-more-action-small.svg`, which hard-codes `#1D56F0` |
| `icons/dot.svg` | 8 × 8 | 228 | U11 `6699:44264` "Status/Connection" (Active), `I6699:44264;7341:101114` "Dot" | `currentColor`: the design tints it per status (Active `#1d7a2e`; Draft and Deactivated in their badge colours) |

Glyphs not exported because KERN 2.8.2 has them (`kern-icon--<name>` in
`@kern-ux/native/dist/kern.css`):

| Design glyph | Where | KERN 2.8.2 class |
|---|---|---|
| trash `icon-delete-small` | U23 `7298:61765`, `I7298:61783;6246:18954;6092:3483` | `kern-icon--delete` |
| `icon-more_vert-small` (the rows draw ⋮, not ⋯) | U55 `6530:40150`, `6109:3638` in "Rules/More button" | `kern-icon--more-vert` |
| finding kind `icon-warning-small` (conflict) | U44 `6750:40882`, `6750:40607` "Kind icon" | `kern-icon--warning` |
| finding kind `icon-info-small` (duplicates only; "Rules/Findings banner" and "Rules/Tooltip" descriptions) | U44 `6750:40882` component | `kern-icon--info` |
| outcome `icon-emergency_home-small` (doesn't meet) | U65 `7057:58709`, `7057:59056` | `kern-icon--danger` (the same Material diamond with "!") |
| outcome `icon-check_circle-small` (meets) | U65 `7057:58709`, `7057:59061` | `kern-icon--success` (the same Material check circle) |

Not exported: the **tooltip arrow**. The V5 tooltip (U80 `6809:46501`, "Rules/Tooltip"
`6139:3739`) draws no arrow; the old `icons/tooltip-arrow.svg` stays until T091.

### 1.4 Text styles

The kit's text styles map to KERN's type classes by name, as spec 002 found: `heading/display`
(40/48, 500), `heading/x-large` (32/40, 500), `heading/large` (24/32, 600), `heading/medium`
(18/24, 600), `heading/small` (16/24, 600), `title/default` (18/24, 600), `title/small` (16/24,
600), `label/default` (16/24, 600), `label/default_subtle` (16/24, 400), `label/small` (14/–,
600), `body/large/*` (18/24), `body/default/*` (16/24, 400 or 600), `body/small/*` (14/–),
`preline/default` (16/24, 400). The weights 500 and 600 must load (V8).

### 1.5 AA contrast fixes (Clarification 2026-11-06 #2, W1)

Recorded by the foundations task for every Revamp pair used as text, and by any later task that
meets one. Known candidates: `feedback-info` `#0284c7` on `#ffffff` and on `#e0f2fe` (the blue
"Draft" label of the status pill, build note 32; info-coloured text in strips) — icons at 3:1
pass, text at 4.5:1 does not.

| Pair (foreground on background, where) | Ratio | Fixed to | Ratio after | Designer told |
|---|---|---|---|---|
| `feedback-info` `#0284c7` on `#ffffff` (info text and icons; the "Draft" label on white) | 4.10:1 | `#0273ae` | 5.17:1 | |
| `feedback-info` `#0284c7` on `feedback-info-background` `#e0f2fe` (info strips) | 3.57:1 | `#0273ae` | 4.50:1 | T019 (2026-11-08): the V5 "Draft" status pill draws its label in `#05669e` (5.38:1 on `#e0f2fe`, passes) and only its dot in `#0284c7`, so the pill takes the drawn value, not this fix |

T002, 2026-11-08 (WCAG 2.x relative luminance, unrounded): "nearest" is the passing colour with
the smallest CIEDE2000 distance from the design's value (ΔE2000 6.6), searched over every sRGB
colour within ±50 per channel; one value for both pairs, because they share the variable, so the
stricter background (`#e0f2fe`) decides. The other Revamp text pairs of §1.1 pass and need no fix:
`feedback-success` `#1d7a2e` 5.42:1 on white, 4.89:1 on `#eaf7e6`; `feedback-danger` `#c4271c`
5.75:1 on white, 5.22:1 on `#fef1f0`; `feedback-warning` `#9a4a00` 6.26:1 on white, 5.75:1 on
`#fff4e0`; `feedback-default` `#4a5468` 7.61:1 on white, 6.72:1 on `#eef1f6`; `layout-text-muted`
`#4a5468` 6.97:1 on `hued` `#f2f5fb` (7.61:1 on white); `action-default` `#1d56f0` 5.77:1 on white
(5.28:1 on `hued`; white on it, the primary button, 5.77:1); `layout-text-default` `#0b1220`
17.14:1 on `hued`; white on `feedback-danger` (the danger button) 5.75:1.

## 2. Component decisions

Options (research R1): **a** KERN class with the overlay · **b** KERN class plus a scoped
override in `index.css` · **c** own markup with Tailwind. A row is a proposal until a task
confirms it; a task that changes a row writes the task id and the reason in the last column.
Every component is verified once in its default state and the interaction states P33 draws for
it (§5).

| Component | Kit page | Option | KERN class / override | States to verify | Decided |
|---|---|---|---|---|---|
| `AccessLevelChoice` | P14 radios, P15 fieldset, P33 base-radio | a | `kern-form-check__radio` in the kit's fieldset; two utilities on the KERN markup (`pt-6!` on the label, `checked:before:bg-kern-layout-text-default!` on the radio), no `index.css` rule | default, hover, focus, selected, disabled | T006: kept a, it is on `kern-form-check__radio` already; built by T016. **T016 (2026-11-08): kept a.** The kit's base-radio (P33 `2:2663`) is KERN 2.8's 32 px radio under the overlay; two values differ from kern.css and are set on the element: the label's top padding (kit baseline 6, kern.css's `.kern-form-check .kern-label` 4) and the selected dot (kit `#0b1220`, kern.css `form-input-border` `#22293a`). The legend gets the kit's label/default baseline 6/2 and 8 px under it (P14 `224:68918`, P15 `727:33875`). New optional `disabled` prop (KERN's 40 % on radio and label, the same on the description) |
| `ActionMenu` (+ `RuleMenuItem`) | build note 3 | c | class-set placement (side, direction, max-height step), 220 px, inner scroll (R10) | default, hover, focus, disabled item, open up/down | T006: kept c, KERN 2.8.2 has no menu component; T021: kept c, built as drawn on U55 `6530:40192` / U57 `6522:32824` / U88 `6417:31045`: 220 px, 1 px `decorative-border` frame, radius 8, padding 8, 2 px gap, 40 px rows (padding 8, gap 8, 20 px icon, `label/small` 14/24 600), divider 1 px, `--shadow-menu`, 8 px below or above its ⋯; the entry states, which no V5 frame draws, from the kit P33: hover and pressed are the "states" layers (`action-state-indicator-default` at 8 % / 16 %, `2:1985`), keyboard focus the select-option focus (`2:2406`: `action-focus-default` fill, inverse text and icons), disabled the kit's 40 % (`aria-disabled`, focusable, choosing does nothing); `z-40` above the sticky header (`z-30`); **V6**: no row, card or group frame of the rules step clips or transforms; the only clipping ancestors are the wizard's scrolling areas (layout), whose edges `placementFrom()` reads as the header's bottom and the footer's top, so the menu opens and sizes within them; the account page's list has no clipping ancestor |
| `AppLayout` | — | c | the header pills (L2) | default, scrolled (white background) | T006: kept c (a page shell); built by T031 |
| `AuthLayout` (+ `AuthIntro`, the art) | L1 | c | the login art and tagline row | 1440, ~1280, <1024, 320 | T006: kept c (layout and art, no KERN counterpart); built by T034 |
| `BranchMark` | the rules frames | c | the marks' chips | changed, new, removed | T006: kept c, the marks have no KERN counterpart (the `kern-badge` types are feedback colours); built by T019. **T019 (2026-11-08): kept c.** Built as the V5 component "Rules/Variant status" (`6118:3681`) draws its three marked types on the screens (U57 `6522:32682`, U58 `6522:32977`, U47 `6185:8555`): a tag with radius 4 (`border-radius-small`), padding 2/8, `label/small` 14/24 600, 28 high; changed and new a white tag (`layout-background-default`) with the purple `#8a22b5` of §1.3 (`--color-variant-changed`, `--color-variant-new`), removed `feedback-default-background` `#eef1f6` with `feedback-default` `#4a5468`. The texts are the screens' (report cosmetic 8, "Figma decides wording"): "Changed here", **"Added here"** (was "New addition"), **"Removed here"** (was "Removed"); the component's description still says "New addition" / "Removed", the screens say otherwise (UNCERTAIN, see the report). The tag is never faded by `BranchMark` itself: U47 `6185:8570` fades only the row's content, the tag keeps its colour; it renders whatever mark it gets, so a changed rule inside a removed group keeps "Changed here" (F36, FR-040). Props unchanged (`mark`), no call site changed; `BRANCH_MARK_TINTS` and `INACTIVE_OPACITY` unchanged |
| `BranchName` (+ `FindingsSegment`) | P29 tabs (kit: "In Bearbeitung", no tab drawn); V5 "Rules/Variant tab · fixes" `6529:39174` | c | the tab with its ⓘ and problem icon | default, selected, hover, focus, with icon | T006: kept c, KERN 2.8.2 ships no tabs CSS (the React kit’s Tabs needs its own styles, not imported); built by T026. **T026 (2026-11-08): kept c, no `index.css` rule.** Kit P29 `2:47775` draws no tab (its status block says "In Bearbeitung"), so the V5 component "Rules/Variant tab · fixes" (`6529:39174`, "KERN EXTENSION") is the source: the tab `pt-4`, column gap 8; the label row (name, 4, the 20 px icon, 4, the actions) 24 high; the name `body/default` 16/24 400 in `layout-text-muted` #4a5468, selected `label/default` 16/24 600 in `layout-text-default` #0b1220; the 2 px "Indicator" under the row across the tab, #0b1220 while selected; the row's 1 px `decorative-border` line and 24 px gap stay the tab row's (T064). The indicator is an own `span`, so no scoped override is needed. New optional props, old ones unchanged: `tab` (`id`, `panelId`, `selected`, `onSelect`, `onKeyDown`: `BranchName` then renders the tab button itself, one control holding the name only, its accessible name "<variant> has findings" while it has findings, W13), `actions` (the ⋯ slot after the icon, F28), `noFindingsInfo` (the grey ⓘ without a description reads "No findings.", FR-041b; Standard passes none, FR-035c); `findings.kind` gains `error`. The icon by severity (build note 26, U06 6760:48852): grey ⓘ `layout-text-muted` (description or "No findings."), blue ⓘ `feedback-info` (§1.5 AA value) for duplicates / always met only, orange ⚠ `feedback-warning` #9a4a00 for a contradiction (U46 6758:43060, U71 7058:61618), red error diamond `kern-icon--danger` in `feedback-danger` for a spec 002 problem (U50 7375:101551, FR-041a). States the V5 frames don't draw (the kit draws no tab): hover and pressed darken an unselected name to #0b1220, weight kept, 150 ms (`.motion`); keyboard focus KERN's 4 px `action-focus-default` ring, offset 2, none after a click. `FindingsSegment` on the dark bubble (U46 6758:43524): divider `layout-text-inverse` white at 24 %, the kind icon white, its parts 8 apart through the bubble's own gap. Call sites unchanged (they keep the `children` form until T064, T073, T079 switch to `tab`) |
| `Checkbox` | V5 "Data/Check item" `6027:17252`, build note 2 (P33 base-checkbox is KERN's 32 px box) | b | `kern-form-check__checkbox` + the scoped override in `index.css` headed with this row: the flex row (4 px above and below, 8 px gap), the 20 px box, radius 4, 1 px `layout-border`, the 14/24 label; checked: action-blue fill with `check-white-small.svg` (= the design's icon-done-small) as a background image; mixed: a white 10 × 2 dash (radius 1) as an SVG background; KERN's `::before` tick switched off (`content: none`); hover, keyboard focus (3 px ring), disabled | default, hover, focus, checked, mixed, disabled | T006: kept b, `KernCheckbox` stays, the 20 px box, tick and mixed dash are the override; built by T016. **T016 (2026-11-08): kept b.** The V5 component "Data/Check item" (not the kit's 32 px base-checkbox) is the design's checkbox on every Flow screen (U26, U36; its description: "Built on Revamp tokens because the KERN Revamp base-checkbox is 32 px"); the override replaces the old `:indeterminate::before` rule. The box sits 2 px below the row's top padding (centred on the label's first 24 px line) so that a wrapping label keeps the box on its first line. New optional `disabled` prop |
| `ConfirmDialog` | P12, P33 dialog-actions | a + c | `kern-dialog` with 1–3 buttons, × and the scrim rule | open, long labels, scrollable, working | T006: kept a + c, on `kern-dialog` already; built by T035 |
| `ConnectionStatusBadge` → status pill | U07 #1 | c | dot + label, tint, radius 8 | active, draft, deactivated | T006: kept c, replacing today’s `KernBadge`: the pill has a dot, not KERN’s icon, and draft/deactivated are no feedback types; built by T019. **T019 (2026-11-08): kept c.** Own markup as V5 "Status/Connection" (`7341:101125`, U11 `6699:44264`, `6699:44277`, `6699:44290`, U93 `I7362:54693;6698:43405`): an inline pill 24 high (the instances' height; the component's 2 px vertical padding does not show at 24), padding 0 10, gap 6, radius 8 (`border-radius-default`), no border; an 8 px decorative dot (`aria-hidden`) and the label in `label/small` 14/24 600. Colours (raw hexes in Figma; the overlay token where the hex equals one): active `#eaf7e6` / dot and label `#1d7a2e` (`feedback-success(-background)`); draft `#e0f2fe` (`feedback-info-background`), dot `#0284c7`, label **`#05669e`** (the design's own blue, 5.38:1 on `#e0f2fe`, so no AA fix; UNCERTAIN against the task's "AA value of §1.5", see the report); deactivated `#eff1f4`, dot `#8c94a1`, label `#4a5468` (`layout-text-muted`). Labels "Active" (was "Live", the design's wording), "Draft", "Deactivated"; the text stays, so the status never rests on colour (005-ACC.1). "Scheduled" is F1 and not a type. The dot is a CSS circle (`rounded-kern-circle size-8`), not `icons/dot.svg`: an `<img>` can't take the per-status `currentColor`, and the circle is the same 8 × 8 geometry. Props unchanged (`isActive`, `draft`), no call site changed |
| `Connector` (+ menu) | FR-038 | c | the pill with the chevron and the two-option menu | default, open, read-only, faded | T006: kept c; built by T023. **T023 (2026-11-08): kept c**, KERN 2.8.2 has no pill or menu. V5 "Rules/Connector" (`6082:3467`, KERN EXTENSION; variants op AND/OR × mode edit/read only) on the row's 8 24 padding: label/small 14/24 600 in a circle-radius pill, padding 2 8 2 16, 2 px to the 20 px `icon-expand_more-small` (the repo's `expand-more-white-small.svg` / `expand-more-action-small.svg`, the same path and fill as Figma's export), 8 px to the 1 px `decorative-brand` line (#4f8cff); AND filled `action-default` with white text (28 high), OR white with a 1 px `action-default` border and blue text (30 high); read only (the details, U03 #26): no chevron, padding 2 16, a plain `span`. The menu is V5 "Rules/Connector menu" (U34 `6094:7052`): 300 × 189, 1 px `decorative-border`, radius 8, padding 8, parts 2 apart, `--shadow-menu`, two 64 px options (padding 8, gap 8, radius 4; label 14/24 600 over the description 14/24 muted; the chosen one `layout-background-hued`, its label `action-default`, the 20 px `icon-done-small`), the divider and the footer "Applies to every rule in <level>" (padding 8 8 4, 258 wide as drawn), which describes the menu (`aria-describedby`). Placed with T020's `MenuPlacement` and class sets as `ActionMenu` (preferred side `start`, the frame's 189 px height; `top-full`/`bottom-full`, `mt-8`/`mb-8`, the `max-h-*` step on the frame, the options scrolling inside while the divider and footer stay; `full` across the rules card, its up translate by the pill's 28/30 px + 16), `z-40`. States the V5 frames don't draw: the pill's hover / pressed as the kit's buttons (P09 button-primary-small `1914:12574`/`1914:12581`: a white `action-state-indicator-tint` layer at 8 % / 16 % on AND; button-secondary-small `1914:12697`: an `action-state-indicator-default` layer at 8 % / 16 % on OR, over its border), drawn as a `::before` under the label (`isolate`), 150 ms, `.motion`; keyboard focus KERN's 4 px `action-focus-default` ring, offset 2; the options as the ⋯ menus' entries (P33 `2:1985` 8 % / 16 % layers, over the chosen tint too; keyboard focus the `select-option` fill `2:2406`, texts and tick white). Faded (FR-051 (39), U47 `6185:8569`): 40 % (`action-state-opacity-disabled`) on the pill, the line and the mark one by one, **not on the row**, because opacity makes a stacking context that would fade the open menu and let the next (faded) row paint over it. Props unchanged (`operator`, `levelName`, `onSwitch`, `mark`, `faded`), no call site changed; the button's name stays "AND, switch Group 01 to AND or OR" (UNCERTAIN in the report) |
| `CopyableUrl` | U80, U81, U89 | a + c | the button on KERN's button; the one-line URL | default, hover, pressed, focus, "✓ Copied", disabled with explanation; the field variant | T006: kept a + c, on `kern-btn` already; built by T028. **T028 (2026-11-08): kept a + c.** The URL row of V5 "Links card" (U80 `6396:47718`): the URL box (c) `layout-background-hued` #f2f5fb, radius 8, 48 high, padding 8 16, `body/default/regular` 16/24 `layout-text-default`, one line cut with "…" (`truncate`, U07 note 33 `7370:55183`), 8 px to KERN's primary button (a) with `kern-icon--content-copy` and "Copy link"; the row's 32 px indent is the link card's (T078). The full URL stays the box's text (screen readers read it in full) and shows in a bubble with the tooltip's look (T022's `TOOLTIP_BOX`, 280 wide, breaking anywhere, `aria-hidden`) while the mouse is over a URL that is cut, 8 px below and flush with its left edge, placed with `placementFrom()`; Escape and leaving close it. The box has `contain: inline-size`, so a column that sizes to its content never grows with the URL. After copying, the button reads "✓ Copied" (`kern-icon--check`, the design's icon-done, U81 `6396:47841`) for 2 s (was 3 s), each copy restarting the 2 s, announced in the component's `role="status"` ("Link copied"); a failed copy selects the URL and says so. The button is T022's `ExplainedButton` (`align="end"`, `shrink-0` on `wrapperClassName`): new optional `deactivated` turns it off with the explanation "Activate the connection first" (W21; U89 `6417:31309` draws only the 40 %; UNCERTAIN text). Because `ExplainedButton` owns the button's `aria-describedby`, `describedBy` (the card's title and the variant's name) now joins the button's name through `aria-labelledby` after its label ("Copy link Request link"). New `variant="field"` (S20, W16): a labelled read-only `<input>` in the same box (label 16/24 600, 8 px above), focus selects the value, KERN's 4 px focus ring; `describedBy` describes the input there. New optional `texts` replaces the variant's labels and announcements (the field's default "Copy" / "Copied"). KERN's pressed shade never shows on a hovered button (its `:hover` rule outranks `:active`): fixed for every primary button by the `index.css` block below. Props: `url` and `describedBy` unchanged; `deactivated`, `texts` and the field variant (`variant`, `value`, `label`) new; no call site changed |
| `CurrentUserProvider`, `RequireSignIn`, `RequireSignedOut` | — | — | no UI | — | no change |
| `ErrorNoticeText` | P07 | a | `kern-alert` danger with the error ID line | default | T006: kept a, it is text inside `KernAlert` at its call sites; **T017 (2026-11-08): kept a**: it stays inline content of `KernAlert`'s body paragraph (`kern-body`, 16/24) at its eight call sites, props unchanged; the design draws no error ID (F22, U79 #4), so the line "Error ID: <id>" keeps the body's style, on a line of its own, selected by one click; the ID breaks anywhere so that it fits at 320 px (FR-010); **coordinator (2026-11-08): + b** for every `kern-alert`: the scoped override in `index.css` ("Alert") moves KERN's outside outlines inside (`outline-offset` −2 px on the alert, −1 px on the body's dividing line, the body's lower corners rounded), so a title-only alert is the kit's 64 px, not 68 |
| `FeedbackLoader`, `PageLoader` | P22 | a + b | `kern-loader kern-loader--visible`, KERN’s 96 px (the size kit P22 draws); where a screen frame draws it smaller (the 56 px of S1, S6, S14), a scoped size override in `index.css` read from that frame | default | T006: changed a → a + b: kit P22 draws only the 96 px loader, so a smaller size is an override; `FeedbackLoader` moves from its own SVG spinner to `kern-loader`; built by T018. **T018 (2026-11-08): kept a + b.** Every V5 screen that draws a loader draws the component "Loader/Spinner 56" (U10 `6401:28662`, U78 `I6387:65280;6391:65811`; its description: "KERN EXTENSION · 56 px spinner in action blue on a light track. Rotates 1 s linear, infinite; reduced motion: no rotation, show the arc static"), so the override `.kern-loader--56` ("Loader, 56 px" in `index.css`) changes more than the size: a 52 px ring with 2 px margin (the drawn ring of radius 24, stroke 4, inside the 56 px box), border 4, track `decorative-border` `#e1e6f0`, arc `action-default` `#1d56f0`, KERN’s `::before` / `::after` turned into 4 px round caps, the arc turned 135° into the drawn top-right quarter, 1 s per turn. `FeedbackLoader` (new optional `size`, `56` default, `96` = KERN’s loader under the overlay as P22 draws it: `#4a5468` arc on `#eef1f6`) renders the decorative loader (`aria-hidden`) and the label (title/default 18/24 600) 16 px under it in one polite `role="status"`; the old 40 px vertical padding is gone (the frame’s block `6401:28661` has none). Under reduced motion the loader carries `.motion` (§4), which stops the turn and leaves the arc where the frame draws it. `PageLoader` is that block centred in the window on the white page (U10 `6401:28567`), with a new optional `label` (default "Loading…", `KERN_TRANSLATIONS.loading`; T042 passes "Loading your connections…"); it replaces the React kit's `KernLoader` (no visible text) |
| `FindingNote` | U44–U46 | c | the note under a rule or group | warning, info | T006: kept c; built by T025. **T025 (2026-11-08): kept c**, own markup as V5 "Rules/Problem note" at the levels conflicting / redundant (`6177:7837`; U44 `6171:7489`, `6750:41109`; U45 `6753:40823`, U44 `6171:7509`): the 20 px kind icon, 4 px, the text in `body/small` 14/24 regular `layout-text-default`, `0 0 8 24` (32 high). Conflict: `icon-warning-small` = `kern-icon--warning` in `feedback-warning` `#9a4a00` and the warning outline; redundant and always met: `icon-info-small` = `kern-icon--info` in **`feedback-info`** (was `layout-text-muted`: every V5 note draws the icon in `#0284c7`; the overlay's AA value `#0273ae`, §1.5) and the info outline. The text size is now `text-kern-static-small` (the overlay's 14) instead of KERN's primitive `--kern-font-size-14`. The kind stays as hidden text before the note ("Conflicting:", W19); the texts are the checks' (`findingMessages.ts`, W13). Props unchanged (`id`, `kind`, `text`), no call site changed |
| `FormConnectionLoadState` (+ `LoadFailed`) | P07, U06 #95 | a + c | the alert; the skeletons | loading, failed | T006: kept a + c; **T017 (2026-11-08): kept a + c**: loading is own markup (c), the kit's skeleton rows in a card as U74 draws them (`7062:51018`, `7062:51211`; the two greys `#e4e8ef` / `#eff1f5` are raw values in Figma, no variable), with a polite `role="status"` reading "Loading the connection…" instead of the old spinner; failed is the h1 and KERN's danger alert (a) keeping its body (F22, W2): the reason with a 5xx error ID when a caller passes `notice` (new optional prop), "Try again" (secondary small) and "Go to your connections" |
| `FormErrorMessage` | P14 error, build note 7 | a | `kern-error` with its danger `kern-icon` under the field | default | T006: class corrected: KERN 2.8.2 has no `kern-form-input__error`; its field error is `kern-error` (flex row, 8 px gap, the danger-tinted icon); built by T015. **T015 (2026-11-08): kept a.** KERN's markup as the React kit renders it: `p.kern-error` > `span.kern-icon.kern-icon--danger` (24 px, `feedback-danger` fill, KERN's 6/2 margins) + `span.kern-body` (16/24, 400, `layout-text-default`); the kit's "error-message" (P26 `1076:17479`, U19 `6699:45398`) draws exactly that, so the overlay alone matches: the old 14 px semibold red text with its own SVG is gone. Inside a `kern-form-input` KERN puts it 8 px under the field. Props unchanged (`message`, `id`, `role`) |
| `GroupFrame` (+ header, message) | U34, U35 | c | the group frame, the subtitle, the message card with the pencil | default, with message, removed, faded, selected | T006: kept c; built by T025. **T025 (2026-11-08): kept c**, own markup as V5 draws "Group wrap" › group (U34 `6094:6411`, `6094:6318`): the wrap's padding 8 16; the frame 8 px above its header, a 3 px `action-default` left border, `layout-background-hued` with square corners for a group, white with radius 8 for a sub-group; "Rules/Group header" (`6082:3513`) 24 in, 16 from the right, 8 above the 1 px `decorative-border` divider, the name `title/default` 18/24 (group) or `title/small` 16/24 (sub-group) in `action-default` over the subtitle `body/small` muted, the mark and ⋯ 8 apart. **Subtitles** "All rules must be met" / "At least one rule must be met" (FR-051 (32)) now in `GROUP_FRAME_COPY` (was the rules package's `GROUP_SUBTITLES`, "All of these must be met", which stays the test results' statement). **Message card** (U35 `6324:39410`): right under the header, `feedback-info-background`, 1 px `decorative-border`, radius 8 (was `rounded-kern-large`, 12 under the overlay), padding 8 16, gap 8; the label **"Message for citizens:"** (C2, was "Error message citizens read:") `label/small` `feedback-info`; the pencil and the hint's info icon both `feedback-info` (the hint's icon was muted). **Changed** (U58 `6522:32997`): the purple tint, the blue border kept; **added** (U38 `6163:5269`): tint and the purple `#8a22b5` border (`border-variant-new`, unchanged). **Removed / dissolved** (U47 `6185:41165`): frame, "Removed here" and ⋯ at full colour, name and subtitle at 40 % and the name struck; its message card, its note slot and its connectors (`Connector`'s `faded`) fade part by part. **Faded** (inside a removed group, U47 `6185:41171`): Figma fades the sub-group's whole box; the frame fades its parts instead: its fill, border and header divider as their colours at 40 % (`/40`), the header text at 40 % with the name struck, message and connectors faded, its mark at full colour (F36). **No opacity box around the members any more** (carried from T019, T023, T024): the members fade themselves (the call sites already pass `faded`); `RuleRow` needs a change for that (see Notes). **Selected** (F33): a new optional `selectBox` slot before the frame, as `RuleRow`'s; the selected group looks unchanged. New optional `faded` on `GroupFrameMember` (fades the connector before it, the call site's decision, FR-051 (39)). No `index.css` rule; no call site changed |
| `IconTile` | U19 `6699:45330`, U11 `6699:44495` | c | the icon tile | default | T006: kept c; built by T018. **T018 (2026-11-08): kept c; frames corrected**: U10 #17 and U74 draw no tile (the 56 px spinner and the persona ring are not tiles); the design’s tiles are "Icon tile" in the connection card header (U19 `6699:45330`, also U98 `6731:39830`, U18 `6793:47720`: 40 × 40, `action-default` fill, radius 8, a 24 px white glyph 8 px in) and in the welcome page's steps (U11 `6699:44495`, U18 `6793:47691`: 48 × 48 circle, `layout-background-default`, a 24 px ink glyph 12 px in). New tones `action` and `plain` draw them; the old tones `blue`, `grey`, `outline` stay for the pages not yet rebuilt (now radius 8, the design’s square tile, was `radius-large` 12), props unchanged, no call site changed |
| `InfoTooltip` (+ `ExplainedButton`) | U37 `6151:33820`, U46 `6758:43524`, U81 `6809:46590`, U07 #16 (`7370:55189`) | c | V5 "Rules/Tooltip" `6139:3739`: the dark bubble, **no arrow**, 280 px, 8 px from its trigger; blue ⓘ on blue, muted elsewhere, action blue after "Add variant" (`tone`); the disabled button with explanation as the named export `ExplainedButton` | closed, hover, focus, touch; the disabled button's hover, focus, touch | T006: kept c, KERN 2.8.2 has no tooltip; built by T022. **T022 (2026-11-08): kept c.** Own markup on Tailwind: the bubble is `layout-background-inverse` #0b1220 (no KERN 2.8 name, so `bg-kern-layout-text-default`, the same value; `index.css` was T015's in this wave), radius 8, padding 8 16, parts 8 apart, `body/small` 14/24 white, 280 wide, no border, no shadow and no arrow: the V5 component draws none on any of the three frames (U37, U46, U81), so the old light-blue bubble with `tooltip-arrow.svg` is gone (Figma decides styling; §1.3 already noted "the V5 tooltip draws no arrow"). It sits 8 px below its trigger (U81: ⓘ bottom 480, bubble 488), its edge 8 px past the ⓘ's edge (U81: 435 vs 443), flush with a button's edge; placed with `placementFrom()` (side and direction, an 88 px height for the up/down choice); the gap is padding, so the mouse crosses onto the bubble. The ⓘ's colour by `tone` (`muted` default, `info`, `action`; build note 35); `icon` still overrides glyph and colour (the findings icons). `ExplainedButton` (design-notes §3): `aria-disabled="true"` while `explanation` is set, focusable, ignoring click, Enter, Space and submit, the explanation in the same bubble as its `aria-describedby`; KERN's `[aria-disabled=true]` 40 % (U29 `6348:40236`, U30 `6350:41190`), and KERN's hover and pressed layers cancelled while disabled |
| `LocalDraftsOffer` (+ item) | U16 | c | the grey banner | one draft, several, discard dialog | T006: kept c; built by T029. **T029 (2026-11-08): kept c**, KERN 2.8.2 has no banner of this kind; the buttons are KERN's (a): `kern-btn--tertiary kern-btn--small` and `kern-btn--secondary kern-btn--small` with `kern-icon--edit` (the kit's button-tertiary-small / button-secondary-small: 40 high + 4 margins = the drawn 48, padding 0 8, label 14/24 600 with padding 4 8, 20 px icon), no `index.css` rule. Built as V5 "Banner · Unsaved work on this device" (U16 `7362:54550` one draft, `7362:54621` several): `feedback-default-background` #eef1f6 (the frame's fill; the annotation says "layout/background/hued", the fill decides), 1 px `decorative-border-level-1` #d0d8e6, radius 8, padding 16 16 16 20; heading `title/small` 16/24 600 `layout-text-default`, sub-line `body/small` 14/24 muted. **One draft** (FR-029d): heading "Unsaved changes in “<name>”", sub-line "Saved only on this device on <dd.mm.yyyy, hh:mm>, when the page closed. Nobody else can see them." (the frame's text: with the date, as no item line shows it), the buttons in the heading's row 16 apart; the h2 and a one-item `ul` stay, the item's name and line `sr-only`. **Several**: "Unsaved changes in <n> connections", "Saved only on this device when the page closed. Nobody else can see them.", 8 px under the text, one `li` per draft with a 1 px top divider in the raw `#d9dee8` (no variable), padding 8 0, the name 280 wide (`label/small` 14/24 600), the line "Edited · …" (stored draft) / "New, never saved · …" (never saved) `body/small` muted, then "Discard" and "Resume editing" 16 apart. Dates `dd.mm.yyyy, hh:mm` (cosmetic 3; also `RestoreDialog`'s date, which uses `formatChangedAt`). Buttons in the drawn order, "Discard" before "Resume editing"; "Resume editing" for a never-saved item too (FR-029e). The visible tertiary label is the frame's "Discard"; its accessible name "Discard changes in <name>" carries the layer's and note's "Discard changes" (UNCERTAIN, see report). The discard dialog is the existing `ConfirmDialog` with 005-S4's copy (T035 restyles it). Narrow widths: the parts wrap (the buttons together), no horizontal scroll at 320. Props unchanged (`exceptFlowKey`, `emptyFocusRef`); `LocalDraftItem` gains `only`; no call site changed |
| `MenuSearchField` | P26, P33 base-search; V5 "Rules/Search field" `6093:3725`, "Data/Search field" `6241:12480` | c | own markup with Tailwind and the overlay's tokens: `menu` as V5 "Rules/Search field" (white, 1 px `decorative-border`, radius 8, 40 high, 16 px padding); `panel` as V5 "Data/Search field" (KERN's `kern-form-input__input` with the 20 px `kern-icon--search` in `action-default` inside, text from 44 px) | default, hover, focus, with text | T006: changed a → c: KERN 2.8.2 ships no search CSS (no `kern-search`, no `type=search` rule); the component is own markup already; built by T015 (T027 uses it). **T015 (2026-11-08): kept c.** The screens draw two search fields, neither the kit's P26 search (field + blue button): the menus' "Rules/Search field" (U32 `6358:61888`, already the old markup's values) and the panels' "Data/Search field" (U21 `7290:61990`); the new `variant` prop (`menu` default, `panel`) picks one. States the V5 components don't draw come from P33 base-search (`1067:17092`): hover, the line darkening (`menu`: the frame to `form-input-border` `#22293a`, 150 ms, `.motion`; `panel`: KERN's 4 px bottom line), keyboard focus the kit's 4 px `action-focus-default` ring outside the field (`menu`: was inset by 4, now offset 0, inside the menu's 8 px padding; `panel`: KERN's), disabled 40 % (`panel` only, KERN). `controls` and `onKeyDown` became optional, `label` (accessible name, default the placeholder) is new; spell check off. No `index.css` rule |
| `NotFound` | P07 | a + c | the alert and the way back | default | T006: kept a + c; built by T037 |
| `PageTitle` | P31 | a | `kern-heading-display` for the 40/48 page h1 (kit “heading/display”, 2x-large adaptive), `kern-heading-x-large` (32/40) and `kern-heading-large` (24/32) where a frame uses those styles | default | T006: class corrected …; **T017 (2026-11-08): kept a**, with a new optional `size` prop (`display` default, `x-large`, `large`) choosing the KERN class; `py-0!` removes KERN's baseline paddings, because the frames draw the text boxes without them (U11 `6699:44244`: 40 + 24 = the 64 px block; U74 `7062:50965`: 32 + 24), and the hint follows right under the heading (gap 0, was 8), `body/default` 16/24 muted (`body/small` 14/24 under `large`); the heading drops `focus:outline-none` (CLAUDE.md: never `focus:`) for `outline-none` (it is no control); built by T017 (T043 uses `size="x-large"`) |
| `RuleRow` (+ name, predicate, sentence, message, problem note, value chip) | U30, U55 | c | the row, the statement chips, the symbol chips | default, hover, open menu, selected, removed, problem, linked | T006: kept c; built by T024. **T024 (2026-11-08): kept c**, own markup on Tailwind as V5 "Rules/Rule row" (`6083:3453`) draws it: the row padding 8 16 8 24, gap 16; the content column gap 4 (name row, sentence, message); the name `label/small` 14/24 600 in `action-default`; the sentence (C3) "<glyph 16> Personal ID · <data> <≥> <words> <values>": document `body/small` muted with the separator "·" (was "–", `RULE_ROW_COPY.documentSeparator`), data `label/default` 16/24 600, words `body/default` 16/24 muted, 8 apart and 4 between wrapped lines; the symbol chip (`Rules/Symbol` `6082:3409`: white, 1 px `decorative-border`, fully round, min 24 wide, 0 8 padding, 14/24 600) and the value chips (`Rules/Value chip` `6082:3447`: white, 1 px `decorative-border`, radius 4, 2 8, 14/24 600), cosmetic 22; "Message for citizens:" (C2, was "Error message citizens read:") in `label/small` muted, 8 px before the message in `body/small`; the actions column (mark, ⋯) gap 8, centred, and kept 32 × 32 when empty (U82 `6650:37780`: the read-only row reserves it). Problem and finding: the row 8 px in from the card in an outline (white, 1 px `feedback-danger` for a problem, the finding's colour otherwise, radius 8) with the note under it (24 in, 8 above the bottom; the problem note `Rules/Problem note` level=blocking `6110:3657`: 20 px info icon, 8 gap, 14/24 600 danger); the outline's colours change in 150 ms (`.motion`). Removed (U47 `6185:8570`): name, statement and message fade to 40 %, statement and message struck through, the mark and ⋯ not faded; the message line stays (F36, FR-040; the design hides it). Selected: a new optional `selectBox` slot before the row (U36 `6344:53557`; the row itself is drawn unchanged, no tint). Linked: no link icon (002-S4.31 "on every linked rule or none", spec 002's choice "none", CLAR 2026-11-07 #24 (b); U40's two icons are not built). Read-only (details): `showIdentifier` shows "rule-7" 8 px after the name in `body/small` muted with the hidden word "Identifier" (F35; the design draws no identifier). V6: no `overflow-*`, `transform` or `filter` in the row. No `index.css` rule. Props unchanged except the new optional `selectBox`; no call site changed |
| `TextField` | P14, P33 base-input-field, base-textarea; V5 "Form/Textarea" `6681:40216` | a | `kern-form-input` text, password, textarea | default, hover, focus, error, disabled, readonly | T006: kept a, on `KernInput` already; built by T015. **T015 (2026-11-08): kept a**, no `index.css` rule: `kern-form-input` / `kern-form-input__input` with the overlay give the kit's states as drawn (48 px, `layer-surface` fill, 2 px `form-input-border` line, radius 4; hover a 4 px line; focus KERN's 4 px `action-focus-default` ring outside, in `feedback-danger` on an error; disabled 40 %; readonly no fill and a 1 px `layout-border` line; error `feedback-danger-background` and a 2 px danger line). Utilities on the KERN markup: the placeholder in `layout-text-muted` (kern.css sets none; U19 draws `#4a5468`), and for `multiline` the V5 "Form/Textarea" (`h-120!`, KERN's own 8/16 padding, `resize-y`, spell check on by default, FR-032). The label row is U19's (`6699:45394`): label 16/24 600 without KERN's baseline padding, 4 px to an addon, 8 px to the field; "(optional)" in the label's own style (was KERN's muted "- Optional"; U19 `6699:45401`, report cosmetic 6); the red "*" (`requiredMark`, `aria-hidden`) as U19 `6699:45396` draws it. The danger bar (`kern-form-input--error`) wraps the field and its message only, not the label (U19 `6699:45398`; the kit's P26 error wraps the label too: the screen frame decides). New optional props, no call site changed: `multiline`, `trailing` (the password toggle's slot inside the field's right end, `pr-56!` on the input, FR-051 (29)), `requiredMark`, `hint` (KERN's `kern-hint`, linked), `invalid` (error state without a message, F16) |
| `Toast` (+ message) | U10 #20, U51 | c | the dark toast, bottom centre, optional action | neutral, with action, with error ID | T006: kept c, KERN has no toast; built by T036 |
| `TopBar` | L2 | c | the two pills, the connection pill | signed out, signed in, in a connection, scrolled | T006: kept c; built by T031 |
| `UserMenu` (+ `SignOutDialog`) | U13 `6699:44358`, U17 | c + a | the account pill and its menu; the log-out dialog on `ConfirmDialog` | closed, open, focus, the dialog | T006: kept c + a; built by T031 |
| `ValuesPicker` (+ option item) | U32 `6357:43090` (menu `6357:43382`), U48 `6191:42065` / `6191:42209`, `6191:42191` | c | the picker with search and "Done" | open, option hover/focus/selected/disabled | T006: kept c; built by T027. **T027 (2026-11-08): kept c**, KERN 2.8.2 has no menu or multi-select. The field is V5 "Rules/Multi-select field" (`6191:41863`, U48 `6191:42191`): 40 high, pl 16 pr 8, gap 8, radius 8, 1 px `decorative-border`, open 2 px `action-default` (1 px border + 1 px inset ring), the chosen values as "Rules/Value chip"s (codes only, 4 apart), unchanged. The menu as U32 "Menu" `6357:43382` draws it: 300 wide, 1 px `decorative-border`, radius 8, padding 8, parts 2 apart, `--shadow-menu`, 8 px below the field at its left edge; T015's `MenuSearchField` (`menu`) on top ("Search classes" / "Search options", from 10 options or for classes); the list (`min-h-0 overflow-y-auto`) under it; the baseline's footer ("Select at least one option." / "No options match “…”.", divider + 14/24 muted, padding 8 0 4 8) kept; then the **"Done"** row (U32 `6357:43428`, FR-039, CLAR Q27): KERN's secondary button right-aligned, which closes the menu, keeps the choice and gives the focus back to the field (Escape does the same). Class options are "Rules/Menu item · class" type=multi (`6358:43249`/`6358:43255`, W19): min 40 high, padding 8, gap 8, radius 4, the box in a 4 px-padded 28 px slot, the code `label/small` 14/24 600 min 32 wide, the description `body/small` 14/24 400 filling the rest (44 high, 64 when it wraps); other values are "Data/Check item" (`6027:17252`, U48): 28 px rows in a list padded 4. The box is KERN's `kern-form-check__checkbox` with T016's `Checkbox` override in `index.css` (no own box any more; `mt-0!` drops the override's 2 px top margin, the slot centres it): default, hover 2 px blue (also over the label), checked with the tick, checked hover the 3 px tint ring, keyboard focus the 3 px `#0b1220` ring on the box only. States the V5 frames don't draw: a class row's hover / pressed as the kit's "states" layers (P33 `2:1985`, 8 % / 16 % action blue, 150 ms, `.motion`), as the ⋯ menus' entries; a disabled option (new optional `ValueChoice.disabled`) at the kit's 40 % (KERN fades the box, the row its texts), not toggled, skipped by the arrow keys. **Placement** with T020's `placementFrom()` and class sets (`VALUES_MENU_PLACEMENTS`): the up/down choice uses the drawn 316 px height (or the menu's own, if shorter) so that it opens down where U32's menu fits ("Rules/Picker": "Menus always open downward"), else up; the frame takes the `max-h-*` step, the list scrolls inside while the search field, the footer and "Done" stay put; where neither side fits (320 px) it spans the rule editor's content (`inset-x-24`), and opening up its static wrapper becomes a flex column so that it starts at the field's top whatever the field's height (wrapped chips). The persona form field (`field`, test step) keeps the baseline: its menu spans the field below it, in the data card that scrolls it, at the 400 step (was a 280 px list). `z-40` (was `z-20`). No `overflow: hidden` on the frame (the search field's 4 px ring shows in the padding). No `index.css` rule. Props unchanged; `ValueChoice` gains optional `disabled`; no call site changed |
| `WizardLayout` | L3 | c | the sticky step header and footer, page scroll | create, edit, saving, loading, failed | T006: kept c; built by T033 |
| `WizardProgress` (+ step) | U02 #1–#4 | c | the step line, `role="progressbar"` | 1–4, clickable (edit), not clickable | T006: kept c, the kit’s P25 progress is a bar, not the step line; built by T032 |
| The pages' own components (research R11): `StatusBand`, `WelcomePage`, the documents list, detail and search card, the persona chips, data card and result rows, the publish dialog, the variant dialog and popover | the frames of their screens | c | — | the screen's states | T006: kept c; built by T042 (`WelcomePage`), T051 (documents list, detail, search card), T064 and T067 (variant dialog and popover), T071 and T072 (chips, data card, result rows), T076 (publish dialog), T078 (`StatusBand`) |

Kit components not drawn on any Flow screen are not built (spec Assumptions): P16 Footer, P17
Grid, P18 Header, P19 Kopfzeile, P28 Table, and the "Not used on Flow" section (U03 #20).
T006 (2026-11-08) confirmed the list against the Flow frames' components: none of the six is
used by a screen of `contracts/ui-screens.md`; the three “no change” rows have no UI and stay as
they are. Two proposals named classes KERN 2.8.2 does not ship (`kern-search`,
`kern-form-input__error`), one named the 32 px heading for the 40 px page h1, and one assumed a
56 px loader variant the kit does not draw; those four rows were corrected and their tasks
(T015, T017, T018) amended.

## 3. Patterns for the states the design does not draw

The W items build the baseline's behaviour from these patterns; a task that builds one cites the
pattern and its source frame, and the pattern's first verification table (§5) stands for every
later use.

| Pattern | Source | Anatomy and rules |
|---|---|---|
| **Alert, page level** | U02 #5–#7 (build note 7), P07 | the slim KERN alert, title only in one 64 px line, when the alert carries a title alone; with a body (an error ID, a list, "Try again", "Remove it", "Dismiss") the design's alert keeps those parts (F22). Kinds: danger, warning, info, success. The error ID line reads as `ErrorNoticeText` has it |
| **Field error** | U19 `6699:45379`, U49, build note 7 | directly under the field, the field's border and fill in the error state, linked with `aria-describedby`; the focus moves to the first field with a problem |
| **Toast** | U10 `7128:74220`, U51 `6197:11098`, U61 `6545:39421` | dark neutral toast, bottom centre, one at a time, announced through the live region; optional action ("Try again", "Undo", "Show"); with an error ID for a 5xx |
| **Dialog** | P12, P33 dialog-actions; U14 `6699:44480`, U17 `7173:52681`, U25 `7299:52174`, U90 `6417:31453` | the kit's widths, 1–3 buttons with long-label wrapping, ×; Escape, × and the scrim close a dialog that doesn't delete or publish (FR-052a); the focus stays inside and returns to the opener; a danger action is the danger outline button where the design draws one ("Discard connection") and the filled danger button where it draws that ("Delete connection") |
| **Menu** | U54 `6522:33105` (build note 10), U13 `6699:44358`, build note 3 | anchored to its trigger's wrapper with class sets (no inline styles, R10), 220 px, 40 px rows with icon, inner scroll with a max-height step (160–480 px) fitting the space to the header or footer minus 8 px, downward when it fits above the footer, otherwise upward; no clipping ancestor; Escape and a click outside close it; arrow keys; destructive entries last after a divider, "Copy link" before them |
| **Tooltip** | U37 `6151:33820`, U46 `6758:43524`, U81 `6809:46590`, U07 #16 | the design's tooltip (no arrow: the V5 "Rules/Tooltip" draws none, §1.3), on hover, focus and touch (FR-052g); blue ⓘ on blue backgrounds, muted grey elsewhere; no `title` attribute |
| **Disabled button with explanation** | U29 #18, U30 #46, U89 #13 (W21) | `aria-disabled="true"`, focusable, ignoring activation; the explanation in the tooltip ("Save the rule first", "Finish grouping first", "Add a document first", the copy buttons' reason) |
| **Skeleton** | U06 #95, U74 `7062:50960`, U10 #17 | the kit's skeleton rows in the list's shape; the 56 px spinner with "Loading your connections…" for a page; the persona chip keeps its name with a ring while regenerating |
| **Empty state** | U11 `6699:44481` (wallet-star 200 × 193), U20 `7290:60367` (128 × 123), U29 `6504:43841` | the picture, one heading, one sentence, one primary action |
| **Error state of a page** | W2 | the danger alert with the error ID and a link back to the overview ("Go to connections"), under the page's h1 |
| **Status pill** | U07 #1–#4 | dot + coloured label, tint fill, no border, radius 8; active green, draft blue (AA per §1.5), deactivated grey; used in rows, the header pill and the band |
| **Status band** | U07 #6–#8, U80, U89, U93 | 32 px icon column, h1 + sub-line 4 px apart, padding 32, picture bottom right (colour / grey), the ⋯ and "Activate again" at the right end; the draft band's gradient from `feedback-info-background` to `layout-background-hued` |
| **Info strip** | U07 #18, U19 `6699:45346` | blue ⓘ, info background, one sentence |
| **Card** | P10 (`surface`, `interactive`), U11 (the list card), U21 (the search card) | KERN's card; the kit's `surface` variant as the light blue card where drawn |
| **Accordion** | P06, U80, U82 | the heading with "View links" / "Hide links" and the count; one open at a time on the details; heights animate (§4) |
| **Tabs** | P29, U38, U82 | the variant tabs with the ⓘ and the problem icon; pinned under the step head on the rules step |
| **Dates** | cosmetic 3, build note 8 | `dd.mm.yyyy` and `dd.mm.yyyy, hh:mm` wherever the frontend formats a date; the test day per C6 |
| **Page change** | FR-052c | scroll to the top; the page fades in (§4) |

## 4. Motion (FR-050, research R5)

| What | Duration | How |
|---|---|---|
| The connection pill growing out of the Konnekt pill | 240 ms ease-out, text fading in during the last 120 ms | width transition on the pill, opacity on its text |
| Colour changes (hover, focus, selection) | 150 ms | `transition-colors duration-(--duration-colour)` |
| Page fade-in | 150 ms | an animation on the layout's main region keyed by the route |
| Heights (accordions, menus, the documents list, the rules list) | 150–200 ms | `grid-template-rows` 0fr → 1fr |
| Dialogs | fade | opacity on the dialog and the scrim |
| The "Published" state before the details | 0.5 s | behaviour (Clarification #33): kept under reduced motion |
| `prefers-reduced-motion: reduce` | — | one rule: `transition: none; animation: none` on the transitioning elements; the pill just appears (U03 #40) |

**The `.motion` contract (T003, 2026-11-08)**: every element that carries a transition or an
animation of the table above also carries the class `motion`, next to its utilities (for
example `motion transition-colors duration-(--duration-colour)`, or
`motion transition-[width] duration-(--duration-pill) ease-out`). `frontend/src/index.css` holds
the one rule that switches them off:

```css
@media (prefers-reduced-motion: reduce) {
  .motion,
  .motion::before,
  .motion::after {
    transition: none;
    animation: none;
  }
}
```

- The class reaches only its own element and that element's `::before` and `::after`, not its
  children: a child that transitions too (the pill's text fading in) carries `motion` itself.
- The rule is unlayered, so it beats Tailwind's `transition-*`, `duration-*` and `animate-*`
  utilities (layer `utilities`) without `!important`; don't move it into an `@layer`.
- Don't use `motion-reduce:` or `motion-safe:` for the design's motion: one rule, one class.
  (`TestStep/LoadingRing` keeps `motion-safe:animate-spin` until T074. `FeedbackLoader` is on
  `kern-loader` with the `motion` class since T018: the V5 component "Loader/Spinner 56" shows
  its arc static under reduced motion.)
- Under reduced motion the end state shows at once: write a transition so that the element's
  resting style is the final one (an animation's keyframes run from the start state to the
  resting style), so turning it off never leaves it half-shown.
- The 0.5 s "Published" delay is a timer in the page, not a transition, and stays.
- The `--duration-*` tokens are emitted only where a utility uses them
  (`duration-(--duration-colour)`), as Tailwind 4 does with every theme variable.

## 5. Verification tables

One table per unit (FR-016); a component's table once, in its default state and the states P33
draws; a screen's table for its layout and its own states with the components in their default
state (Clarification 2026-11-06 #3). Columns: `frame | state | element | property | Figma |
actual | result`; `result` is `match` or the item it cites (F#, W#, C#, CLAR #n, an AA fix of
§1.5). A unit is done when no row is open. The loop that fills a row is
`docs/FIGMA-WORKFLOW.md` §4, run against the dev server at the frame's width plus the scrollbar
gutter (1455 px for a 1440 frame in Chromium on Linux).

Template:

```markdown
### U## <unit name> — <task id>, <date>
| frame | state | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|
| 6699:44240 | default | .toolbar | padding | 16 24 | 16 24 | match |
| 6699:44240 | default | row 2 | text | "Published 28.10.2026" | "Edited 28.10.2026" | F52 |
```

### 5.1 Components (pass E and F)

_(one table per row of §2, appended by the task that rebuilds the component)_

### Checkbox — T016, 2026-11-08

Checked on the documents step of the seeded draft `e67b4d7b…` ("All data" mixed, fields checked and unchecked; `FieldChecklist` / `FieldCheckbox`), Chromium 1455 px. Pressed is not drawn by P33 or by "Data/Check item" (FR-016: pressed only where the kit draws it); while pressed the box keeps its hover style. Disabled forced in the browser (`input.disabled = true`, no page passes it yet).

| frame | state | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|
| 6027:17241 | default | row | layout | flex, gap 8, padding 4 0 | flex, gap 8px, padding 4px 0 (right 0) | match |
| 6027:17241 | default | row | height (one-line label) | 32 | 32 | match |
| 6027:17241 | default | box | size | 20 × 20 | 20 × 20 | match |
| 6027:17241 | default | box | position in row | centred on the 24 px label line (top 6) | top 6 (padding 4 + margin 2) | match |
| 6027:17241 | default | box | radius | 4 (`border-radius-small`) | 4px | match |
| 6027:17241 | default | box | border | 1 `layout-border` `#6b7488` | 1px solid rgb(107, 116, 136) | match |
| 6027:17241 | default | box | fill | `layout-background-default` white | white (oklch(1 0 0)) | match |
| 6027:17241 | default | box ↔ label | gap | 8 | 8 | match |
| 6027:17241 | default | label | font | Fira Sans 14 / 24, 400 (body/small/regular) | 14px / 24px, 400 | match |
| 6027:17241 | default | label | colour | `layout-text-default` `#0b1220` | rgb(11, 18, 32) | match |
| 6027:17241 | default | label | padding | none (row centres it) | 0 | match |
| 6027:17244 | checked | box | fill | `action-default` `#1d56f0`, no visible border | rgb(29, 86, 240), 1px border in the same colour | match |
| 6027:17244 | checked | tick | asset | icon-done-small 20 × 20, white | `check-white-small.svg` (byte-identical to the export), 20 × 20, centred | match |
| 6027:17244 | checked | box | KERN `::before` tick | not used (build note 2) | `content: none` | match |
| 6234:12429 | mixed | box | fill | `action-default` `#1d56f0` | rgb(29, 86, 240) | match |
| 6234:12429 | mixed | dash | size, radius, colour | 10 × 2, radius 1, `action-on-default` white | 10 × 2 rect, rx 1, white, centred | match |
| 6616:51385 | hover, unchecked | box | border | 2 `action-default` `#1d56f0` | 2px solid rgb(29, 86, 240) | match |
| 6616:51385 | hover, unchecked | box | fill | `action-state-indicator-tint` (white) | white | match |
| 6616:51394 | hover, checked | box | ring | 0 0 0 3 `action-state-indicator-tint` (white) | box-shadow 0 0 0 3px white | match |
| 6616:51406 | hover, mixed | box | ring | 0 0 0 3 tint (white) | box-shadow 0 0 0 3px white | match |
| 6616:51388 | focus, unchecked | box | ring | 0 0 0 3 `action-focus-default` `#0b1220`, border 1 `#6b7488` kept | outline 3px solid rgb(11, 18, 32), offset 0; border 1px rgb(107, 116, 136) | match |
| 6616:51398 | focus, checked | box | ring | 0 0 0 3 `#0b1220` | outline 3px solid rgb(11, 18, 32), offset 0 | match |
| 6616:51388 | focus by pointer | box | ring | "shown only on keyboard focus, never on click" | none; border 1px restored (kern.css drops it on `:focus`) | match |
| 6616:51391, 6616:51402, 6616:51414 | disabled | row | opacity | 40 % | box 0.4, label 0.4 (KERN), no hover change, cursor default | match |
| 6324:40344 | mixed ("All data items") | row | box, dash, label | 20 px blue box, white dash, 14 px label | the same ("All data") | match |
| 6324:40347 | checked / unchecked fields | rows | box, tick, label | as `6027:17244` / `6027:17241` | the same | match |
| 6324:40347 | mixed | group row "Name" | presence | a group checkbox, label 16 / 24, 600, items indented 24 | no group rows | F24 (OUT-13, FR-031j: no group rows) |
| 6344:53557 | select mode, unchecked | box | size, border, fill, radius | 20, 1 `#6b7488`, white, 4 | the select-mode boxes are `RulesStep/SelectBox.tsx` (own markup, T059's file); `Checkbox` draws the same box (rows above) | deferred to T059 |
| — | default | box | transition | colour 150 ms (§4) | `motion transition-colors duration-(--duration-colour)` | match |

### AccessLevelChoice — T016, 2026-11-08

Checked in the account page's "Create token" dialog (`/account`, `CreateTokenDialog`), Chromium 1455 px; the consent page (`/authorize`) needs an OAuth request and renders the same component without `levels`. Disabled forced in the browser (`disabled` on the radios and `opacity-40` on the descriptions, what the new `disabled` prop renders). The per-level description is not drawn by the kit (W16; spec 007's text).

| frame | state | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|
| 224:68918 | default | legend | font | label/default 16 / 24, 600, `#0b1220` | 16px / 24px, 600, rgb(11, 18, 32) | match |
| 224:68918 | default | legend | baseline padding | 6 / 2 | 6px / 2px | match |
| 224:68918 | default | legend → first radio | space | container padding-bottom 8 | 8 | match |
| 224:68918 | default | options | gap | 16 | 16 | match |
| 2:2664 | default | radio | size, border, fill | 32, 2 inside `form-input-border` `#22293a`, `layer-surface` `#f2f5fb` | 32 × 32, 2px solid rgb(34, 41, 58), rgb(242, 245, 251) | match |
| 2:2664 | default | radio | radius | circle | 100 % | match |
| 2:2664 | default | radio ↔ label | gap | 16 | 16 (KERN label padding-left) | match |
| 2:2664 | default | label | font | label/default_subtle 16 / 24, 400, `#0b1220` | 16px / 24px, 400, rgb(11, 18, 32) | match |
| 2:2664 | default | label | baseline padding | 6 / 2 | 6px / 2px (`pt-6!`; kern.css 4) | match |
| 3477:9588 | selected | dot | size, colour | 12, `#0b1220` | 12 × 12, rgb(11, 18, 32) (kern.css `#22293a`, fixed with `checked:before:bg-kern-layout-text-default!`) | match |
| 2:2669 | hover | radio | border | 4 inside `#22293a` | 4px solid rgb(34, 41, 58) | match |
| 3477:9684 | hover, selected | radio, dot | border, dot | 4 inside `#22293a`, dot 12 `#0b1220` | 4px solid rgb(34, 41, 58), dot rgb(11, 18, 32) | match |
| 3477:9689 | focus, selected | radio | ring | 4 outside `#0b1220` (`action-focus-default`), fill to the edge | outline 4px solid rgb(11, 18, 32), offset 0, border 0 | match |
| 2:2674 | focus by pointer | radio | ring | — (keyboard only, §2 focus rule) | none; border 2px restored (existing rule) | match |
| 2:2679, 3477:9694 | disabled | row | opacity | 40 % | radio 0.4, label 0.4, description 0.4 | match |
| — | default | description | font, colour, indent | not drawn | 14 / 24, `layout-text-muted` rgb(74, 84, 104), 48 px indent (under the label), 8 px under the radio row | W16 |

### ErrorNoticeText — T017, 2026-11-08
Checked on `/account` with `GET /api/agent-access` answered `500` `{error, message, error_id}` (Firefox, 1440 wide, no scrollbar gutter).

| frame | state | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|
| P07 `1:4104` | default | message (in `.kern-body`) | font | Fira Sans 400 16/24 | Fira Sans 400 16/24 | match |
| P07 `1:4104` | default | message | colour | `#0b1220` | `rgb(11 18 32)` | match |
| P07 `1:4103` | default | body text box | padding | 6 / 2 (baseline) | 6 0 2 | match |
| — | default | error ID line | layout | not drawn | own line (block), 16/24, "Error ID: <id>", `user-select: all` on the ID | F22 (kept, baseline 001-S7.7) |
| — | 320 px | error ID | wrapping | not drawn | `overflow-wrap: anywhere`; no horizontal scroll at 320 (scrollWidth 320) | F22, FR-010 |

### FormConnectionLoadState — T017, 2026-11-08
Checked on `/form-connections/e67b4d7b-…` (details) with the connection's request held (loading) or aborted (failed) through Playwright routing (Firefox, 1440 wide).

| frame | state | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|
| U74 `7062:51018` | loading | card | background, border | `#ffffff`, 1 `#e1e6f0` | white, 1px solid `rgb(225 230 240)` | match |
| U74 `7062:51018` | loading | card | radius, padding | 8, 16 | 8px, 16px | match |
| U74 `7062:51212` | loading | heading bar | size, radius, fill | 110 × 14, 4, `#e4e8ef` | 110 × 14, 4px, `rgb(228 232 239)` | match |
| U74 `7062:51211` | loading | heading bar → first row | distance | 42 (row at y 56) | 42 (121 → 177) | match |
| U74 `7062:51214` | loading | row | label bar | 90 × 10, 4, `#eff1f5` | 90 × 10, 4px, `rgb(239 241 245)` | match |
| U74 `7062:51214` | loading | row | gap label → value | 24 | 24 | match |
| U74 `7062:51216`, `…51219`, `…51222`, `…51225` | loading | value bars | widths, fill | 96, 70, 130, 140; `#e4e8ef` | 96, 70, 130, 140; `rgb(228 232 239)` | match |
| U74 `7062:51211` | loading | rows | pitch | 28 (y 56, 84, 112, 140) | 28 (177, 205, 233, 261) | match |
| U06 #95 | loading | screen reader | status | not drawn | `role="status"` "Loading the connection…"; bars `aria-hidden`; no h1 while loading (as before) | W10 |
| — | loading | layout | page | "skeletons in the final layout" | one card of skeleton rows in the 1120 column, header and footer real | W10 (the details' and editor's own skeletons: deferred to T080 / T074) |
| P07 `1:4097` | failed | alert | radius, border | 8, 2 `#c4271c` | 8px, `outline` 2px `rgb(196 39 28)`, offset −2px (inside the box) | match (§2 option b override, coordinator 2026-11-08) |
| P07 `1:4098` | failed | header | fill, padding | `#fef1f0`, 16 | `rgb(254 241 240)`, 16px | match |
| P07 `1:4099` | failed | icon | size, colour | 32, `#c4271c` | 32 × 32, `rgb(196 39 28)` | match |
| P07 `1:4101` | failed | title | font, padding | Fira Sans 600 18/24, 5 8 3 | 600 18px/24px, 5px 8px 3px | match |
| P07 `1:4102` | failed | body | fill, top line, padding, gap | `#ffffff`, 1 `#c4271c`, 8 24 16 24, 8 | white, 1px `rgb(196 39 28)`, 8px 24px 16px, 8px | match |
| P07 `1:4105` | failed | content slot | "Try again", "Go to your connections" | a component slot | `kern-btn--secondary kern-btn--small` (40 high) + `kern-link`, 24 apart, wrapping | F22 |
| — | failed | h1 | text, style | not drawn | "Couldn’t load the connection", `PageTitle` display 40/48 | W2 |
| — | failed | error ID | line | not drawn | shown when the caller passes `notice`; `useFormConnection` keeps no notice yet | W2: deferred to T080 (details) and T037 (the error state pattern) |
| — | failed, 320 px | layout | horizontal scroll | — | none (scrollWidth 320); alert 288 wide | FR-010 |
| — | failed | "Try again" | behaviour | — | reloads; the draft's details appeared | match (baseline) |

### PageTitle — T017, 2026-11-08
Checked on `/` (display, the default; x-large and large forced by swapping the class in the DOM) and on the failed load state.

| frame | state | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|
| U11 `6699:44245` | x-large | h1 | font | Fira Sans 500 32/40 | 500 32px/40px | match |
| U11 `6699:44245` | x-large | h1 | colour | `#0b1220` | `rgb(11 18 32)` | match |
| U11 `6699:44245` | x-large | h1 | height (no baseline padding) | 40 | 40 (padding 0) | match |
| U11 `6699:44246` | x-large | hint | font, colour | 400 16/24, `#4a5468` | 400 16px/24px, `rgb(74 84 104)` | match |
| U11 `6699:44244` | x-large | block | gap, height | 0, 64 | 0, 64 | match |
| U74 `I7062:50965;6689:41447` | large | h1 | font, height | 600 24/32, 32 | 600 24px/32px, 32 | match |
| U74 `I7062:50965;6689:41448` | large | hint | font, colour | 400 14/24, `#4a5468` | 400 14px/24px, `rgb(74 84 104)`, 24 high | match (the step header itself is T032/T033) |
| P31 heading-display | display | h1 | font, height | 500 40/48 | 500 40px/48px, 48 (padding 0) | match |
| — | all | h1 | fonts loaded | Fira Sans 400, 500, 600 | `document.fonts.check` true for all three | match |
| — | focused from script | h1 | outline | not drawn | none (`outline-none`; `tabIndex=-1`, no control) | match (no `focus:` utility, CLAUDE.md) |

### Pattern: Alert, page level — T017, 2026-11-08
The kit's alert P07 (`1:4069`, the four types), built on `KernAlert` with the overlay; checked by switching the rendered alert's kind classes on `/account` (500 with error ID).

| frame | state | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|
| U02 `6637:36656` (note 7), P07 `66:40216` | title only | alert | height | 64 (one line) | 64 (header 16 + 32 + 16, body removed) | match |
| U02 `6637:36656` | with a body | alert | parts | "title only" | title, body with the error ID / "Try again" / the way back kept | F22 |
| P07 `1:4097` | danger | fill, border, icon | `#fef1f0`, `#c4271c`, `#c4271c` | `rgb(254 241 240)`, `rgb(196 39 28)`, `rgb(196 39 28)` | match |
| P07 `1:4088` | warning | fill, border, icon | `#fff4e0`, `#9a4a00`, `#9a4a00` | `rgb(255 244 224)`, `rgb(154 74 0)`, `rgb(154 74 0)` | match |
| P07 `1:4070` | info | fill, border, icon | `#e0f2fe`, `#0284c7`, `#0284c7` | `rgb(224 242 254)`, `rgb(2 115 174)`, `rgb(2 115 174)` | §1.5 AA fix (`#0273ae`, T002) |
| P07 `1:4079` | success | fill, border, icon | `#eaf7e6`, `#1d7a2e`, `#1d7a2e` | `rgb(234 247 230)`, `rgb(29 122 46)`, `rgb(29 122 46)` | match |
| P07 | every kind | body | top line | 1, the kind's colour | 1px outline, offset −1px, the kind's colour; the body's lower corners rounded 8 | match |
| P07 `1:4097` | every kind | border | geometry | 2, stroke inside the 64 px box | 2px `outline` with `outline-offset: -2px` (the `index.css` alert override): the visible frame is 64 tall (Chromium, 2026-11-08) | match |
| — | every kind | role | announcement | not drawn | `role="alert"` (KernAlert) | match (baseline) |

### Pattern: Skeleton — T017, 2026-11-08
The kit's skeleton rows as U74 draws them (`7062:51211`), in `FormConnectionLoadState`; the rows of the table above stand for the pattern: bars 10 high (headings 14), radius 4, strong `#e4e8ef` for headings and values, light `#eff1f5` for labels, rows 28 apart, 42 from the heading bar, in a white card with a 1 px `#e1e6f0` border, radius 8, padding 16; `aria-hidden` bars under a polite status; no animation (Figma draws none; nothing for `.motion`).

| frame | state | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|
| U74 `7062:51211` | loading | the rows | geometry and fills | as above | as above (see the `FormConnectionLoadState` table) | match |
| U74 `7062:51206` | loading | persona chip skeleton | pill | white, 1 `#e1e6f0`, radius 999, 130/126/132 × 40 | not in this component | deferred to T074 (the test step's `SkeletonPill.tsx`) |
| U06 #95 | loading | the overview's rows | skeleton rows | "skeletons in the final layout" | not in this component | deferred to T044 |

### ActionMenu (+ RuleMenuItem) — T021, 2026-11-08

Checked in the scripted Chromium at 1455 × 1000 (1440 frame), 1455 × 560 and 320 × 640 on the
seeded draft `e67b4d7b…` (rules step: Standard tab, Rule 01, Group 01, Rule 02, Sub-group 02
menus). Fonts: `document.fonts.check('600 14px "Fira Sans"')` true. The entries a menu lists are
its call sites' (US3, FR-036, F29, F30); this table checks the component.

| frame | state | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|
| U55 6530:40192 | open down | menu | width | 220 | 220 | match |
| U55 6530:40192 | open down | menu | position from the ⋯ | right edge on the ⋯'s right edge (1263 = 1231 + 32), top 8 below the ⋯ (330 − 322) | right 1263 = ⋯ right 1263; top 394 = ⋯ bottom 386 + 8 | match |
| U55 6530:40192 | open down | menu | border | 1 `decorative-border-contextual` #e1e6f0 | 1px rgb(225, 230, 240) | match |
| U55 6530:40192 | open down | menu | radius | 8 (`border-radius-default`) | 8px | match |
| U55 6530:40192 | open down | menu | padding | 8 (`space-small`) | 8px | match |
| U55 6530:40192 | open down | menu | background | `layout-background-default-contextual` white | white (oklch(1 0 0)) | match |
| U55 6530:40192 | open down | entries | gap | 2 (`space-2x-small`) | 2px | match |
| U55 6530:40192 | open down | entry | height, padding, gap | 40; 8; 8 | 40; 8px; 8px | match |
| U55 6530:40192 | open down | entry icon | size, offset | 20 × 20, centred on the 24 px line | 20 × 20 at x + 8, y + 10 | match |
| U55 6530:40192 | open down | entry label | font | Fira Sans SemiBold 14/24 (`label/small`) | "Fira Sans" 600 14px/24px | match |
| U55 6530:40192 | open down | entry label, icon | colour | #0b1220 (text and `icon-edit-small` fill) | rgb(11, 18, 32) text and icon | match |
| U55 6530:40192 | open down | "Delete rule" | colour | `feedback-danger` #c4271c (text and `icon-delete-small` fill) | rgb(196, 39, 28) text and icon | match |
| U55 6530:40192 | open down | divider | height, colour, place | 1, #e1e6f0, before the destructive entry | 1px, rgb(225, 230, 240), before "Delete rule" | match |
| U55 6530:40192 | open down | menu | height for 4 entries + divider | 187 | 5 entries + divider: 229 (= U57's 229 for 5) | match |
| U57 6522:32824 | open down | menu | box-shadow (T003 carry) | "Elevation/Menu" DROP_SHADOW #13152529 (0, 10) r 28 s 0 | `rgba(19, 21, 37, 0.16) 0px 10px 28px 0px` (`--shadow-menu`) | match |
| U88 6417:31045 | open down | menu | box-shadow | `0 10px 28px 0 rgba(19,21,37,0.16)` | the same | match |
| U57 6522:32824 | open down | menu | size for 5 entries + divider | 220 × 229 | 220 × 229 | match |
| U56 6522:32540 | open | sub-group menu | width | 240 | 220 | research R10, T021: one menu width, 220 (`ACTION_MENU_WIDTH`); "Duplicate sub-group", the frame's longest label, fits in 220 |
| U56 6522:32540 | open, near the footer | sub-group menu | direction | down, 8 below the ⋯ (the frame has room above the footer) | Sub-group 02 at 1455 × 1000, ⋯ 827–859, bar at 920: up, menu 590–819, 8 above the ⋯ | match (build note 3, R10: up where it doesn't fit above the footer) |
| U55 6530:40192 | open up, inner scroll | menu | max-height step, list scroll | 160–480 step fitting the space less 8 (R10) | 1455 × 560: Rule 01 up, `max-h-240`, 117–346; Group 01 neither side fits (192 / 192): down, `max-h-160`, list 142 of 211 scrolls, End scrolls "Delete group" into view, menu ends at 456 above the bar at 480 | match |
| U55 6530:40192 | open, 320 px | menu | stays on screen (FR-010) | — | 320 × 640: Rule 01 `end` 52–272 of 305, up; Standard tab ⋯ `full` 16–289 down (8 below) and up (`-translate-y-[calc(100%+48px)]`, 8 above); no horizontal scroll | match |
| U55 6530:40192 | ⋯ default | trigger | size, radius, icon | 32 × 32, radius 4, `icon-more_vert-small` 20, #0b1220 | 32 × 32, 4px, `kern-icon--more-vert kern-icon--small` 20 × 20, rgb(11, 18, 32) | match |
| P33 2:1985 | ⋯ hover / pressed | trigger | background | `action-state-indicator-default` #1d56f0 at 8 % / 16 % | #1d56f0 / 0.08, / 0.16 | match |
| P33 2:1985 | hover | entry | background | #1d56f0 at 8 %, radius 4 (`select-option` hover, 2:2406) | #1d56f0 / 0.08, 4px | match |
| P33 2:1985 | pressed | entry | background | #1d56f0 at 16 % ("states" active) | #1d56f0 / 0.16 | match |
| P33 2:2406 | focus (keyboard) | entry | background, text, icon | `action-focus-default` #0b1220 fill, `layout-text-inverse` white text | rgb(11, 18, 32) fill; white text; KERN icons white, image icons `brightness(0) invert(1)`; "Delete rule" white on the fill | match |
| P33 2:2406 | focus after a click | entry | background | — (focus ring on keyboard focus only) | none (`:focus-visible` false) | match |
| P33 2:2406 | disabled item | entry | opacity | `action-state-opacity-disabled` 40 % on the content | 0.4 on icon and label (forced through the DOM: no page has a disabled entry yet), `aria-disabled="true"`, no hover layer | match |
| — | hover / focus | entry, trigger | transition | 150 ms colour (design-notes §4) | `0.15s` colour properties, class `motion` | match |
| — | open | menu | z-index | above the sticky header and footer (R10) | 40 (the header's wrapper is 30) | match |
| — | open | menu | keyboard (002-ACC.4) | arrow keys, Home, End, Escape, Tab | ArrowDown → next, End → "Delete rule", Escape closes and focuses the ⋯, Tab closes; Enter on the ⋯ opens with the first entry focused | match |
| — | open | menu | click outside | closes | closes | match |

### Pattern: Menu — T021, 2026-11-08

The pattern's first table; it stands for every later menu (the ⋯ menus, the connector's
two-option menu T023, the values picker T027, the account pill's menu T031).

| frame | state | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|
| U55 6530:40192 | open down | anchor | from the trigger's wrapper, class sets, no inline styles | — | `relative` wrapper; `top-full right-0 mt-8 w-220`; no `style` attribute | match |
| U55 6530:40192 | open down | gap to the trigger | px | 8 | 8 | match |
| U56 6522:32540 | open near the footer | direction | down where it fits above the footer, otherwise up | — | up (`bottom-full mb-8`) when the height + 8 doesn't fit below; towards the larger space where it fits on neither side | match |
| — | short window | inner scroll | max-height step 160/240/320/400/480 fitting the space less 8; the list scrolls inside, the frame stays | — | `max-h-160` … `max-h-480` on the frame, `overflow-y-auto` on the list | match |
| — | open | clipping ancestors (V6) | none between the menu and the page | — | rules step: none but the wizard's scrolling areas (the layout's, read as the edges); account page: none | match |
| — | open | z-index | above the sticky header and footer | — | `z-40` | match |
| U55 6530:40192 | open | entries | 40 px rows with icon, label/small | 40, 20 px icon, 14/24 600 | 40, 20, 14/24 600 | match |
| U55 6530:40192 | open | destructive entries | last, after a divider, red | — | the call sites' order and `separated` / `danger` (FR-036, US3) | match |
| — | open | Escape, click outside, arrow keys | close, close, move | — | as drawn in the §5.1 table | match |
| U57 6522:32824 | open | shadow | "Elevation/Menu" | `0 10px 28px 0 rgb(19 21 37 / 0.16)` | `--shadow-menu` | match |

### TextField — T015, 2026-11-08

Checked in Chromium (playwright-chrome) at 1455 × 900 (1440 frame, body 1440) on step 1 of a new connection (`/form-connections/new`, empty name refused with "Continue") and of the seeded draft `9a58451d…`, in the variant dialog ("Add variant" on `e67b4d7b…`, empty name + Enter) and in the account page's "Create token" dialog. Fonts: `document.fonts.check` true for Fira Sans 400 and 600 at 16 px. Disabled and readonly forced on `#connection-description` (`disabled` / `readonly` attributes; no page passes them yet). `multiline`, `trailing` and `requiredMark` are reached by no page yet: checked on a DOM replica built from the component's own class constants (`TEXTAREA_CLASS`, `TRAILING_PADDING_CLASS`, the label markup) inside the step's card, then removed.

| frame | state | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|
| P33 2:2145 | default | input | size | 48 high, fills the column | 48; 726 in the step's name column (U19 `6699:45394` 726) | match |
| P33 2:2145 | default | input | fill, line, radius | `layer-surface` `#f2f5fb`, bottom 2 `form-input-border` `#22293a`, 4 | rgb(242, 245, 251), 2px solid rgb(34, 41, 58), 4px | match |
| P33 2:2145 | default | input | padding, font, colour | 0 16; 16/24 400; `#0b1220` | 0px 16px; 16px/24px 400; rgb(11, 18, 32) | match |
| U19 6699:45340 | default | placeholder | colour, size | `layout-text-muted` `#4a5468`, 16 | rgb(74, 84, 104), 16px (`placeholder:text-kern-layout-text-muted`; kern.css sets none) | match |
| U19 6699:45395 | default | label | font, colour | label/default 16/24 600, `#0b1220`, no baseline padding (24 high) | 16px/24px 600, rgb(11, 18, 32), padding 0, 24 high | match |
| U19 6699:45395 | default | label ↔ ⓘ | gap | 4 | 4 (`gap-4`; was 6) | match |
| U19 6699:45394 | default | label row → field | gap | 8 | 8 | match |
| U19 6699:45396 | default | required "*" | text, colour, weight | "*" right after the label, `feedback-danger` `#c4271c`, 600 | "*", rgb(196, 39, 28), 600, `aria-hidden` (replica; `requiredMark`) | match |
| U19 6699:45396 | default | "Connection name*" on step 1 | marker shown | yes | step 1 doesn't pass `requiredMark` yet; its label still reads "Form name" | deferred to T049 |
| U19 6699:45401 | default | optional marker | text, style | "Description (optional)", one text in label/default | "Description (optional)", 16/24 600 `#0b1220`; accessible name "Description (optional)" | match (report cosmetic 6) |
| U19 6699:45397 | default | ⓘ after the label | size | 20 (icon-info-small) | `InfoTooltip`'s default icon | deferred to T022 / T049 |
| P33 2:2151 | hover | input | line | bottom 4 `#22293a` | 4px solid rgb(34, 41, 58), padding-top 2, still 48 high | match |
| P33 2:2157 | focus (keyboard, Tab) | input | ring | 4 `action-focus-default` `#0b1220` around the field (outside) | outline 4px solid rgb(11, 18, 32), offset 0; line removed (KERN) | match |
| P33 2:2157 | focus by pointer | input | ring | keyboard focus only (FR-009) | a text field matches `:focus-visible` on a click too (it takes typing), so the ring shows as for the keyboard; the browser's rule, kept | match |
| P33 2:2163 | disabled | input | opacity, cursor | 40 % | 0.4, not-allowed; line 2px rgb(34, 41, 58), fill rgb(242, 245, 251) | match |
| P33 2:2175 | readonly | input | fill, line | none, bottom 1 `layout-border` `#6b7488` | transparent, 1px solid rgb(107, 116, 136), cursor not-allowed | match |
| P33 2:2181 | readonly, focus | input | ring | 4 `#0b1220` | outline 4px solid rgb(11, 18, 32), line 0 | match |
| P33 2:2315 | error | input | fill, line | `feedback-danger-background` `#fef1f0`, bottom 2 `#c4271c` | rgb(254, 241, 240), 2px solid rgb(196, 39, 28) | match |
| P33 2:2321 | error, hover | input | line | bottom 4 `#c4271c` | 4px solid rgb(196, 39, 28) | match |
| P33 2:2327 | error, focus | input | ring | 4 `#c4271c` | outline 4px solid rgb(196, 39, 28) | match |
| U19 6699:45398 | error | input | ARIA | linked to its message | `aria-invalid="true"`, `aria-describedby="connection-name-error"`; the focus on the field after "Continue" (the step's behaviour) | match |
| U19 6699:45398 | error | danger bar | border, padding, extent | left 4 `#c4271c`, 16 to the field, beside field and message only (88 high) | 4px solid rgb(196, 39, 28), padding-left 16, 726 × 88 around input + message; label outside it | match |
| U19 6699:45398 | error | message | place | 8 under the field | y 488 = field bottom 480 + 8 | match (rows in the FormErrorMessage table) |
| — | invalid without a message | input | state | the sign-in's both fields marked invalid (F16) | `invalid` prop: the error fill and line, `aria-invalid`, no bar, no message | deferred to T040 (the sign-in page passes it) |
| U19 6699:45403 | multiline | textarea | size, padding | 120 high, 16 / 8 (text from the top) | 120 (`h-120!`), padding 8px 16px | match |
| U19 6699:45403 | multiline | textarea | fill, line, radius, font | `#f2f5fb`, bottom 2 `#22293a`, 4, 16/24 | the same | match |
| U19 6699:45403 | multiline | placeholder | colour | `#4a5468` | rgb(74, 84, 104) | match |
| P33 2:2534 | multiline | resize handle | shown | bottom right | the browser's handle, `resize: vertical` | match |
| P33 2:2538 | multiline, hover | textarea | line | bottom 4 | 4px solid rgb(34, 41, 58), padding stays 8 16, 120 high | match |
| P33 2:2542 | multiline, focus | textarea | ring | 4 `#0b1220` | outline 4px solid rgb(11, 18, 32), offset 0 | match |
| — | multiline | textarea | spell check, limit | spell check on, ≤ 500 (FR-032) | `spellcheck` true by default; `maxLength` passes through; no counter (the design draws none, 006-S1.3 has none) | match (FR-032: a 500-character limit, no counter drawn; coordinator 2026-11-08) |
| U19 6699:45403 | multiline | step 1 description as a textarea | element | "Form/Textarea" | step 1 still renders an input (it doesn't pass `multiline`) | deferred to T049 (and T064 for the variant dialog) |
| U10 #7 | password, trailing slot | toggle | place | inside the field, right end | slot `absolute inset-y-0 right-4`, a 40 px small button centred (4 from top and right), input `padding-right 56` (replica) | match (the toggle itself: T040) |
| — | hint | hint | place, link | KERN `kern-hint` under the label | `kern-hint` with `id`, in `aria-describedby`; no page passes `hint` yet | deferred to T064 (the variant dialog's helper) |
| — | with text | input | colour | `#0b1220` 16/24 | rgb(11, 18, 32) 16px/24px ("Neue Verbindung") | match |

### FormErrorMessage — T015, 2026-11-08

Checked under the name field of step 1 (refused "Continue"), in the variant dialog (`role="alert"`) and on the sign-in page (wrong password, outside a field). Chromium 1455 px.

| frame | state | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|
| U19 6699:45398 (`I…;2:2121`) | default | row | layout | flex, gap 8, top 8 (inside the field) | `p.kern-error`: flex, gap 8px, margin-top 8 inside `kern-form-input` | match |
| U19 `I…;2:2123` | default | icon | glyph, size, colour, margin | icon-emergency_home 24, `#c4271c`, 6 / 2 | `kern-icon--danger` (the same Material diamond, §1.1 glyph table) 24 × 24, rgb(196, 39, 28), margin 6px 0 2px | match |
| U19 `I…;2:2125` | default | text | font, colour, padding | body/default 16/24 400, `layout-text-default` `#0b1220`, 6 / 2 | `kern-body` 16px/24px 400, rgb(11, 18, 32), padding-top 6 | match |
| U19 `I…;2:2121` | default | row | height (one line) | 32 | 32 | match |
| U19 6699:45398 | default | text | copy | "Enter a name for the connection." | "Enter a name for the connection." (the step's text, C7) | match |
| — | announced | row | role | not drawn | `role` passes through: `alert` in the variant and token dialogs and the sign-in; none under step 1's fields (focus moves there) | match (baseline) |
| — | outside a field (sign-in, documents step, consent) | row | layout | not drawn | the same row without KERN's 8 px top margin; wraps (56 high for two lines on the sign-in card) | match (the sign-in's alert: T040; the documents step: T051) |

### MenuSearchField — T015, 2026-11-08

`menu` checked in the rule editor of the seeded draft `e67b4d7b…` (a new rule, Personal ID, "Data" picker: "Search Personal ID"; the rule then cancelled), Chromium 1455 px. `panel` (no page uses it yet) checked on a DOM replica from the component's classes, then removed.

| frame | state | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|
| U32 6358:61888 ("Rules/Search field" 6093:3725) | default | field | size | 40 high, menu width less 2 × 9 | 40; 322 in the 340 menu (9 from its edges) | match (the menu's width: T061 / T027) |
| U32 6358:61888 | default | field | fill, border, radius | white, 1 `decorative-border` `#e1e6f0`, 8 | oklch(1 0 0), 1px solid rgb(225, 230, 240), 8px | match |
| U32 6358:61888 | default | field | padding, font | 0 16, 16/24 400 | 0px 16px, 16px/24px 400 | match |
| U32 6358:61888 | default | placeholder | colour | `layout-text-muted` `#4a5468` | rgb(74, 84, 104) | match |
| P33 1067:17099 | hover | field | line | the field's line darkens (base-search: bottom 2 → 4) | border 1px rgb(34, 41, 58) (`form-input-border`), 150 ms | FR-016 (V5 draws no hover: the kit's P33 base-search hover, its line darkening, applied to the menu field's 1 px frame) |
| P33 1067:17105 | focus (keyboard) | field | ring | 4 `action-focus-default` `#0b1220` outside the field | outline 4px solid rgb(11, 18, 32), offset 0 (was inset −4), inside the menu's 8 px padding | match |
| — | with text | field | text, filtering | 16/24 `#0b1220` | "Ci" rgb(11, 18, 32); the list shows "City or town" only | match (baseline) |
| — | default | field | transition | colour 150 ms (§4) | `motion transition-colors duration-(--duration-colour)` | match |
| U21 7290:61990 ("Data/Search field" 6241:12480) | panel | field | size, fill, line, radius | 48, `#f2f5fb`, bottom 2 `#22293a`, 4 | 48, rgb(242, 245, 251), 2px solid rgb(34, 41, 58), 4px (KERN's input) | match |
| U21 7290:61990 | panel | icon | glyph, size, colour, place | icon-search-small 20, `#1d56f0`, 16 from the left, centred | `kern-icon--search kern-icon--small` 20 × 20, rgb(29, 86, 240), at 16 / 14 | match |
| U21 7290:61990 | panel | text | start, font, placeholder | 16 + 20 + 8 = 44; 16/24; `#4a5468` | padding-left 44, 16px/24px, rgb(74, 84, 104) | match |
| 6241:12480 (description) | panel, keyboard focus | field | ring | "calm: bottom line turns 2px ink, no outline box" | KERN's 4 px `#0b1220` ring (P33 base-search focus) | FR-009 (focus ring visible on keyboard focus, over the description's "calm" focus; coordinator 2026-11-08) |
| U21 7290:61990 | panel in the documents step | use | the search card | "Find a document" | no page uses `panel` yet | deferred to T051 |

### Pattern: Field error — T015, 2026-11-08

The pattern's first table (U19 `6699:45379`, build note 7); it stands for every later field error (T040, T049, T064, T087). The rows of the TextField and FormErrorMessage tables above are its evidence.

| frame | state | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|
| U19 6699:45398 | error | field | fill, line | `#fef1f0`, bottom 2 `#c4271c` | the same (`kern-form-input__input--error`) | match |
| U19 6699:45398 | error | bar | where | left 4 `#c4271c` + 16, beside the field and the message, not the label | `kern-form-input--error` on the field's inner wrapper | match |
| U19 6699:45398 | error | message | place, anatomy | 8 under the field; danger icon 24 + body/default text, 8 apart | `FormErrorMessage` (`kern-error`) | match |
| — | error | link | ARIA | linked with `aria-describedby` | `aria-invalid="true"` + `aria-describedby="<id>-error"` (with the hint's id when there is one) | match |
| — | error after a refused step | focus | first field with a problem | not drawn | the caller's (step 1 focuses the name; the variant dialog keeps the focus in the name and announces with `role="alert"`) | match (baseline) |

### FeedbackLoader, PageLoader — T018, 2026-11-08

Checked in Firefox at 1440 × 900 (no scrollbar gutter: `innerWidth − clientWidth` = 0) and 320 × 640, the override block of "index.css block for the coordinator" below injected as a `<style>`. `FeedbackLoader`: the overview `/` with `GET /api/form-connections` held by Playwright routing ("Loading your connections…", inside the current `AppLayout`). `PageLoader`: `/account` with `GET /api/auth/me` held (the sign-in guard). The 56 px loader compared at 5× with the frame's exported SVG drawn beside it in the page, the 96 px one at 3× with the kit's two layers.

| frame | state | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|
| U10 `6401:28662` | default | loader (56) | box | 56 × 56 | 52 × 52 border box + 2 margin = 56 slot | match |
| U10 `6401:28662` | default | loader (56) | ring | stroke 4 on radius 24 (outer 52, 2 inside the box) | border 4px, 52 box, radius 50 % | match |
| U10 `6401:28662` | default | loader (56) | track colour | `#e1e6f0` (`decorative-border`) | `rgb(225, 230, 240)` (`decorative-border-contextual`) | match |
| U10 `6401:28662` | default | loader (56) | arc | a quarter, `#1d56f0`, round caps | border-left `rgb(29, 86, 240)` + 4 × 4 round caps `rgb(29, 86, 240)` at the ends (left 3, top 3 / bottom 3); shape the same as the SVG at 5× | match |
| U10 `6401:28662` | reduced motion | loader (56) | arc position | top-right quarter (12 to 3 o'clock), static (component description) | `rotate: 135deg`, `animation-name: none` (`.motion`): the arc on 12 to 3 o'clock | match |
| U10 `6401:28662` | default | loader (56) | motion | 1 s linear, infinite (component description) | `rotation 1s linear infinite` (KERN's keyframes) | match |
| U10 `6401:28661` | default | block | layout | column, gap 16, centred, padding 0 | flex column, gap 16px, `items-center`, padding 0 | match |
| U10 `6401:28665` | default | label | font | Fira Sans 600 18 / 24 (title/default) | "Fira Sans" 600 18px/24px; `document.fonts.check` true | match |
| U10 `6401:28665` | default | label | colour | `#0b1220` | `rgb(11, 18, 32)` | match |
| U10 `6401:28665` | default | label | text, size | "Loading your connections…", 224 × 24 | the same, 224.3 × 24 | match |
| U10 `6401:28661` | default | block | size | 224 × 96 | 224 × 96 | match |
| U10 `6401:28567` | default | page (`PageLoader`) | background | `layout-background-default` white | `oklch(1 0 0)` (was `neutral-025`) | match |
| U10 `6401:28567` | default | page (`PageLoader`) | block position | centred in the 1440 × 900 frame ("Has to be centre aligned"): block top 402, loader centre (720, 430) | block top 402, height 96, loader centre (720.0, 430.0) | match |
| U10 `6401:28567` | default | header | Konnekt pill, DE/EN, no account pill (#18) | not in `PageLoader` (a full-window block) | deferred to T040 (the loading frame in the sign-in flow, with T031's header) |
| — | default | label | text without a caller's label | not drawn | `PageLoader` "Loading…" (the sign-in guard, also on `/login`) | W2 |
| U78 `I6387:65280;6391:65811` | publishing | loader (56) | component | "Loader/Spinner 56", the same SVG as U10 | the same `.kern-loader--56` | match (the dialog itself: deferred to T077) |
| — | default | status | announcement | not drawn | one polite `role="status"` holding the label; the loader `aria-hidden` (KERN's German "Wird geladen…" no longer rendered) | match (baseline 001-S0.3) |
| — | 320 px | page, list | horizontal scroll | — | none (scrollWidth 320 on both); `PageLoader` keeps 16 px side gutters for a wrapping label | FR-010 |
| — | forced colours | loader (56) | colours | — | KERN's: track `layout-background-default`, arc and caps `layout-background-inverted`, `forced-color-adjust: none` | match |
| P22 `70:18341` | default | loader (96) | size, colours | 96, arc `#4a5468` on track `#eef1f6` (`feedback-default` on `-background`) | 96 × 96, `rgb(74, 84, 104)` on `rgb(238, 241, 246)` (the overlay) | match |
| P22 `70:18341` | default | loader (96) | ring width | 9.6 (the kit's vector: 10 % of 96) | 10 (kern.css `--kern-10`) | match (KERN's own loader under the overlay, option a; the kit's ring is KERN's 10 drawn as a vector, 0.4 px sub-pixel) |
| P22 `70:18341` | default | loader (96) | caps | round, radius 4 | KERN's two bars (now 4 × 10, radius 0 4 4 0 under the overlay's `border-radius-small` 4), rotated ±45°: rounded ends | match |
| — | reduced motion | loader (96) | motion | not drawn | `.motion`: stops the turn | match (§4) |

### IconTile — T018, 2026-11-08

Checked on the connection step of the seeded draft `9a58451d…` (the page's 48 px `blue` tile), the two design tiles forced on it by swapping the classes their tones render (no page passes `action` or `plain` yet), Firefox 1440 × 900.

| frame | state | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|
| U19 `6699:45330` | default | tile (`action`, 40) | size | 40 × 40 | 40 × 40 | match |
| U19 `6699:45330` | default | tile (`action`, 40) | fill | `action-default` `#1d56f0` | `rgb(29, 86, 240)` | match |
| U19 `6699:45330` | default | tile (`action`, 40) | radius, border | 8 (`border-radius-default`), none | 8px, 0 | match |
| U19 `6699:45331` | default | glyph | size, place | 24 × 24, 8 in, white | 24 × 24 at 8, 8 (the caller's glyph) | match (the white add-link glyph: deferred to T050) |
| U11 `6699:44495` | default | tile (`plain`, 48) | size, shape | 48 × 48, circle | 48 × 48, 9999px | match |
| U11 `6699:44495` | default | tile (`plain`, 48) | fill | `layout-background-default` white | `oklch(1 0 0)` | match |
| U11 `6699:44496` | default | glyph | size, place | 24 × 24, 12 in, ink | 24 × 24 at 12, 12 | match (the steps illustration: F15, T042) |
| — | default | tiles of the old tones | radius | the design's square tile: 8 | 8px (was 12) | match; their fills (`darkblue-050`, `neutral-050`, outline) are no design tile: deferred to T050, T051, T080 (the pages that pass them) |
| — | default | tile | role | decorative | `aria-hidden="true"`, `alt=""` | match |

### InfoTooltip — T022, 2026-11-08

Checked in the scripted Chromium at 1455 × 1000 (1440 frame) and 320 × 640, on the seeded draft
`e67b4d7b…` (rules step: the ⓘ after "Add variant", small 20 px) and `9a58451d…` (step 1: the two
24 px field ⓘs, "start" and "end"); touch in a `hasTouch` context with `tap()`. Fonts:
`document.fonts.check('400 14px "Fira Sans"')` true. The texts the call sites pass are their
tasks' (the variant ⓘ's "A variant is a separate set of rules…" is spec 002's until T056/T064 take
FR-035's text); for the 280 × 88 check the Figma text was put into the bubble through the DOM.

| frame | state | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|
| U37 6151:33820 | hover | bubble | width | 280 | 280 | match |
| U37 6151:33820 | hover | bubble | height, three lines | 88 | 88 (Figma text set through the DOM; wraps after "with" and "variant" as drawn) | match |
| U37 6151:33820 | hover | bubble | background | `layout-background-inverse` #0b1220 | rgb(11, 18, 32) | match |
| U37 6151:33820 | hover | bubble | radius | 8 (`border-radius-default`) | 8px | match |
| U37 6151:33820 | hover | bubble | padding | 8 16 (`space-small`, `space-default`) | 8px 16px | match |
| U37 6151:33820 | hover | bubble | border, shadow | none | 0, none | match |
| U37 6151:33820 | hover | text | font | Fira Sans Regular 14/24 (`body/small/regular`) | "Fira Sans" 400 14px/24px | match |
| U37 6151:33820 | hover | text | colour | `layout-text-inverse-contextual` white | rgb(255, 255, 255) | match |
| U46 6758:43524 | hover | bubble | parts' gap | 8 (description, findings segment) | `flex-col gap-8` (8px) on the bubble; the segment itself is T026's (`FindingsSegment`) | match |
| U46 6758:43524 | hover | bubble | height with a segment | 129 (8 + 48 + 8 + 1 + 8 + 48 + 8) | not reachable: no seeded variant has findings | deferred to T026 |
| U37 6151:33820 | hover | bubble | arrow | none (the component draws none) | none | match (the task's "with the design's arrow" read against V5: §1.3, T022 §2 row) |
| U81 6809:46590 | hover | bubble | gap below the ⓘ | 8 (ⓘ 460–480, bubble at 488) | 8 (ⓘ bottom 316, bubble box top 324 on the rules step; 424 → 432 on step 1) | match |
| U81 6809:46590 | hover | bubble | left edge from the ⓘ's | −8 (435 vs 443) | −8 (405 vs 413 rules step; 262 vs 270 step 1) | match |
| U37 6151:33820 | hover | bubble | position from the ⓘ | 334, 260 for an ⓘ at 413, 230 (79 px left, 10 below) | 405, 324 for an ⓘ at 413, 296 (8 left, 8 below) | build note 3 (U07 #11 "Menus and tooltips anchor to their trigger"; R10): drawn loose in U37/U46, U81's offsets for every bubble |
| — | hover, "end" | bubble | right edge from the ⓘ's | — | +8 (ⓘ right 1123, bubble right 1131; step 1 "About the description") | match |
| — | hover, near the footer | bubble | direction | down where it fits (R10) | 320 × 640: ⓘ at 439, footer at ≈ 520: up, `bottom-full pb-8`, bubble ends 8 above the ⓘ | match |
| — | hover, 320 px | bubble | stays on screen (FR-010) | — | `end` at 17–297 of 305; no horizontal scroll (scrollWidth 305 ≤ 320) | match |
| U07 7370:55189 | closed | ⓘ | colour, default | `color/layout/text/muted` #4a5468 | rgb(74, 84, 104) | match |
| U07 7370:55189 | closed | ⓘ | colour, `tone="info"` | `color/feedback/info` (§1.5 AA value #0273ae) | rgb(2, 115, 174) (class forced through the DOM: no call site passes the tone yet) | match |
| U07 7370:55189 | closed | ⓘ | colour, `tone="action"` | `color/action/default-contextual` #1d56f0 | rgb(29, 86, 240) (forced through the DOM) | match |
| U81 6809:46555 | closed | ⓘ | size | 20 (`icon-info-small`) | 20 × 20 (`iconSize="small"`) | match |
| — | hover | bubble | stays open on the bubble (WCAG 1.4.13) | — | mouse moved onto it: open | match |
| — | hover | bubble | z-index | above the sticky header and footer | 40 | match |
| — | focus (keyboard) | ⓘ | opens, ring | opens on focus (FR-051) | opens on Tab; outline 4px solid #0b1220, offset 2 | match |
| — | focus after a click | ⓘ | opens | — | the mouse decides: open while hovered, closed on leaving | match |
| — | open | ⓘ | Escape, Enter | Escape closes | Escape closes; Enter opens again; Tab away closes | match |
| — | touch | ⓘ | tap (FR-052g) | opens on touch | tap opens, tap again closes, a tap elsewhere closes | match |
| — | any | page | `title` attribute | none | 0 elements with `title` | match |
| — | closed | bubble | in the page as the description | — | `role="tooltip"`, `display: none`, the ⓘ's `aria-describedby` | match |

### ExplainedButton (InfoTooltip) — T022, 2026-11-08

No page shows a disabled button with an explanation yet (the call sites adopt it in T033, T051,
T056, T063, T028). Checked by mounting `ExplainedButton` (the dev server's module, React's own
`createRoot`) in place of the rules step's footer "Test rules" on `e67b4d7b…`, the original hidden,
with its classes (`kern-btn kern-btn--primary`, `ml-auto` on `wrapperClassName`), its label and
icon, `explanation="Save the rule first"`, `align="end"`, at 1455 × 1000, 320 × 640 and on touch.

| frame | state | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|
| U30 6348:40759 | disabled | "Test rules" | opacity | `action-state-opacity-disabled` 40 % on the button | 0.4 (KERN's `[aria-disabled=true]`) | match |
| U30 6348:40759 | disabled | "Test rules" | fill | `action-default-contextual` #1d56f0 | rgb(29, 86, 240) | match |
| U30 6350:41190 | disabled | "Save rule" | opacity, fill | 40 %, #1d56f0 | the same KERN rules on `kern-btn--primary kern-btn--small` | match |
| U30 6348:40759 | disabled | button | place in the row | right end of the footer | 1138, 937, 142 × 48: the original's box (the wrapper is the row's item) | match |
| — | disabled | button | attributes | `aria-disabled="true"`, focusable (W21) | `aria-disabled="true"`, no `disabled`, `tabIndex` 0, `aria-describedby` the bubble | match |
| — | disabled, hover | button | fill | unchanged (P33 draws no hover on disabled) | rgb(29, 86, 240), KERN's hover shade cancelled | match |
| — | disabled, hover | button | cursor | — | not-allowed (KERN) | match |
| — | disabled, hover | bubble | opens, text | "Save the rule first" (FR-034, W21) | open, "Save the rule first", 280 × 40 + 8 gap, above the button (footer at the window's bottom) and flush with its right edge (1000–1280) | match |
| — | disabled, click | button | activation | ignored | `onClick` not called | match |
| — | disabled, keyboard focus | button | opens, ring | opens on focus (FR-052b) | open; KERN's outline 4px solid #0b1220, offset 2, faded with the button (an inactive control, WCAG 1.4.11's exception) | match |
| — | disabled, Enter, Space | button | activation | ignored | `onClick` not called; Escape closes the bubble | match |
| — | disabled, touch | button | tap (FR-052g) | opens on touch | tap opens, tap again closes, `onClick` not called | match |
| — | disabled, 320 px | bubble | across the page, up | stays on screen (FR-010) | `inset-x-16 pb-8 -translate-y-full`: 16–289, ends 8 above the button | match |
| — | enabled (explanation null) | button | attributes, tooltip | an ordinary button | no `aria-disabled`, no `aria-describedby`, no bubble on hover; Enter calls `onClick`; opacity 1 | match |
| — | explanation removed while focused | button | focus | stays | still focused (same element), and disabled again keeps it | match |

### Pattern: Tooltip — T022, 2026-11-08

The pattern's first table; it stands for every later ⓘ and tooltip (T026 tabs, T044 the row
description, T049 step 1, T056/T064 the variant ⓘ, T078 the links, T028 the copy buttons).

| frame | state | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|
| 6139:3739 (U37 6151:33820) | open | bubble | anatomy | dark #0b1220, radius 8, padding 8 16, 280 wide, 14/24 white, parts 8 apart, no arrow | `TOOLTIP_BOX`, `w-280` | match |
| U81 6809:46590 | open | bubble | anchor | 8 below the trigger, 8 past the ⓘ's edge | `top-full -left-8 pt-8` / `-right-8`; a button: `left-0` / `right-0` | match |
| — | open | bubble | placement | `placementFrom()` side and direction (R10), class sets only | side `start` / `end` / `full`, direction `down` / `up`; no `style` attribute | match |
| — | open | bubble | hover bridge | the mouse can reach the bubble (WCAG 1.4.13) | the 8 px gap is the bubble's padding inside the trigger's wrapper | match |
| — | hover, focus, touch | trigger | opens on (FR-051, FR-052g) | hover, focus, touch | hover (mouse, pen), keyboard focus, tap; Escape and a tap elsewhere close it | match |
| — | any | trigger | `title` | none | none; the bubble is the trigger's `aria-describedby` | match |
| U07 7370:55189 | closed | ⓘ | colour by background | muted grey; info blue on blue; action blue after "Add variant" | `tone`: `muted` (default), `info`, `action` | match |
| — | open | bubble | z-index | above the sticky header and footer | `z-40` | match |

### Pattern: Disabled button with explanation — T022, 2026-11-08

The pattern's first table; it stands for "Test rules", the edit flow's "Save", "Save rule", "Set
rules →" and the copy buttons while deactivated.

| frame | state | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|
| U29 6348:40236, U30 6348:40759 | disabled | button | look | the button at `action-state-opacity-disabled` 40 % | KERN's `[aria-disabled=true]` 0.4 | match |
| U30 6350:41190 | disabled | "Save rule" | look | 40 % on the small primary | the same | match |
| — | disabled | button | semantics (W21) | `aria-disabled="true"`, focusable, ignoring activation | `ExplainedButton` with `explanation`: no `disabled` attribute, click / Enter / Space / submit ignored | match |
| — | disabled, hover / focus / tap | explanation | where | the same tooltip (R10) | the bubble of the Tooltip pattern, as the button's `aria-describedby` | match |
| — | disabled, hover / press | button | fill | unchanged | KERN's hover and pressed layers cancelled (`DISABLED_STILL`) | match |
| — | enabled | button | — | an ordinary button | no tooltip, no `aria-*`; the element stays, so the focus does too | match |

### ConnectionStatusBadge — T019, 2026-11-08

Checked with the playwright-chrome MCP at 1455 × 1000 (body 1440) and 320 × 640. Draft: the overview `/` with the three seeded drafts, and the seeded draft `e67b4d7b…` in the editor and on its details (header badge). Active and deactivated: no connection can be published here (no EUDIPLO), so the overview's `GET /api/form-connections` answer was routed through Playwright (`page.route`) with the first two rows changed to `status: 'published'`, `is_active: true` and `false`; the rows then render the real component. Fonts: `document.fonts.check('600 14px "Fira Sans"')` true.

| frame | state | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|
| U11 `6699:44264` | active | pill | size | 73 × 24 | 72.8 × 24 | match (label text ±1) |
| U11 `6699:44264` | active | pill | fill | `#eaf7e6` | rgb(234, 247, 230) | match |
| U11 `6699:44264` | active | pill | radius, border | 8, none | 8px, 0 | match |
| U11 `6699:44264` | active | pill | padding, gap | 0 10 (text box 24 at y 0), 6 | 0px 10px, 6px | match |
| U11 `I6699:44264;7341:101114` | active | dot | place, size | x 10, y 8, 8 × 8 | 10, 8, 8 × 8, radius 9999px | match |
| U11 `I6699:44264;7341:101114` | active | dot | colour | `#1d7a2e` (exported SVG fill) | rgb(29, 122, 46) | match |
| U11 `I6699:44264;7341:101115` | active | label | text, place | "Active", x 24, 39 × 24 | "Active", 24, 38.8 × 24 | match (was "Live": the design's wording) |
| U11 `I6699:44264;7341:101115` | active | label | font | Fira Sans SemiBold 14/24 (`label/small`) | "Fira Sans" 600 14px/24px | match |
| U11 `I6699:44264;7341:101115` | active | label | colour | `#1d7a2e` | rgb(29, 122, 46) | match |
| U11 `6699:44277` | draft | pill | size | 67 × 24 | 66.3 × 24 | match (label text ±1) |
| U11 `6699:44277` | draft | pill | fill | `#e0f2fe` | rgb(224, 242, 254) | match |
| U11 `I6699:44277;7341:101120` | draft | dot | colour | `#0284c7` | rgb(2, 132, 199) | match (decorative; 3.57:1 on the tint) |
| U11 `I6699:44277;7341:101121` | draft | label | text, place | "Draft", x 24 | "Draft", 24, 32.3 × 24 | match |
| U11 `I6699:44277;7341:101121` | draft | label | colour | `#05669e` | rgb(5, 102, 158) | match (5.38:1 on `#e0f2fe`: passes AA, W1 needs no fix) |
| U11 `6699:44290` | deactivated | pill | size | 110 × 24 | 110.5 × 24 | match |
| U11 `6699:44290` | deactivated | pill | fill | `#eff1f4` | rgb(239, 241, 244) | match |
| U11 `I6699:44290;7341:101123` | deactivated | dot | colour | `#8c94a1` | rgb(140, 148, 161) | match |
| U11 `I6699:44290;7341:101124` | deactivated | label | text, colour | "Deactivated", `#4a5468` | "Deactivated", rgb(74, 84, 104) | match (6.73:1) |
| U93 `I7362:54693;6698:43405` | draft (header) | pill | size, fill, label | 67 × 24, `#e0f2fe`, "Draft" `#05669e` | 66.3 × 24, rgb(224, 242, 254), rgb(5, 102, 158) (editor and details of `e67b4d7b…`) | match |
| U93 `I7362:54693;6698:43405` | draft (header) | pill | place in the breadcrumb | after the name, in the "Where you are" pill (x 335 in it) | after the name in the current header (x 344.7 on the page) | deferred to T031 (the header pill), T081 (the draft details' breadcrumb) |
| U07 `7370:55180` #2 | scheduled | pill | type | "scheduled" with a date | not a type | F1 |
| — | any | dot | semantics | — | `aria-hidden="true"`; the label is the text (005-ACC.1) | match |
| — | 320 px | pill | overflow | — | pills 33–144 of 305; scrollWidth 305 ≤ 320 | match (FR-010) |

### BranchMark — T019, 2026-11-08

Checked with the playwright-chrome MCP at 1455 × 1000 on a draft created for this check through the API (the content of `e67b4d7b…` plus a variant "Ambulance" based on Standard: Rule 01 changed, Rule 02 removed, Sub-group 02 removed with its Rule 03 changed, Rule 05 added), rules step, tab "Ambulance"; the draft was deleted afterwards.

| frame | state | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|
| U58 `I6522:33012;6118:3685` | changed | tag | fill | `layout-background-default` white | oklch(1 0 0) | match |
| U58 `I6522:33012;6118:3685` | changed | tag | radius, padding | 4 (`border-radius-small`), 2 8 | 4px, 2px 8px | match |
| U58 `I6522:33012;6118:3685` | changed | tag | height | 28 (2 + 24 + 2) | 28 | match |
| U58 `I6522:33012;6118:3685;6118:3678` | changed | label | text | "Changed here" | "Changed here" | match |
| U58 `I6522:33012;6118:3685;6118:3678` | changed | label | font | Fira Sans SemiBold 14/24 (`label/small`) | "Fira Sans" 600 14px/24px | match |
| U58 `I6522:33012;6118:3685;6118:3678` | changed | label | colour | `variant/changed-text` `#8a22b5` | rgb(138, 34, 181) | match (7.05:1 on white, §1.3) |
| U58 `I6522:33021;6118:3685` | new | tag | fill, radius, padding | white, 4, 2 8 | oklch(1 0 0), 4px, 2px 8px | match |
| U58 `I6522:33021;6118:3685;6118:3680` | new | label | text | "Added here" | "Added here" (was "New addition") | match (report cosmetic 8, the design's wording) |
| U58 `I6522:33021;6118:3685;6118:3680` | new | label | colour | `--kern-color-variant-new` `#8a22b5` | rgb(138, 34, 181) | match |
| U47 `I6185:8570;6118:3685` | removed | tag | fill | `feedback-default-background` `#eef1f6` | rgb(238, 241, 246) | match |
| U47 `I6185:8570;6118:3685` | removed | tag | radius, padding | 4, 2 8 | 4px, 2px 8px | match |
| U47 `I6185:8570;6118:3685;6162:4870` | removed | label | text | "Removed here" | "Removed here" (was "Removed") | match (report cosmetic 8) |
| U47 `I6185:8570;6118:3685;6162:4870` | removed | label | font, colour | 14/24 600, `feedback-default` `#4a5468` | 600 14px/24px, rgb(74, 84, 104) | match (6.72:1) |
| U47 `6185:8570` | removed | tag | opacity | 1 (only the row's content at 40 %) | 1 on Group 01's tag; 0.4 on Rule 02's and Sub-group 02's tags, faded by the call site's wrapper (`opacity-(--kern-color-action-state-opacity-disabled)` around a removed group's members) | deferred to T024 / T065 (the rows and removed items); `BranchMark` sets no opacity |
| U47 `6185:41178` | changed, inside a removed sub-group | tag | shown | no "Changed here" | "Changed here" shown on Rule 03 inside the removed Sub-group 02 | F36 (FR-040) |
| `6118:3681` description | new, removed | label | text | "New addition", "Removed" (the component's description) | the screens' "Added here", "Removed here" | report cosmetic 8 (the screens decide; contract S11 amended, coordinator 2026-11-08) |
| — | any | tag | place | left of the ⋮ (component description) | in the row's actions, before the ⋮ (call sites unchanged) | match |

### Pattern: Status pill — T019, 2026-11-08

The pattern's first table; it stands for every later status pill (T044 the overview's rows, T031 the header's connection pill, T078/T081 the band and the breadcrumb).

| frame | state | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|
| U07 `7370:55180` #1, `7341:101125` | any | pill | anatomy | tint fill, no border, radius 8, 8 px dot, coloured label, padding 0 10, gap 6, 24 high where placed | `ConnectionStatusBadge`: `rounded-kern-default inline-flex h-24 items-center gap-6 px-10`, dot `size-8 rounded-kern-circle` | match |
| U07 `7370:55180` #3 | any | label | text | always a label, never colour alone; "Draft is blue, never grey" | "Active" green, "Draft" blue, "Deactivated" grey, `STATUS_PILL_COPY` | match (005-ACC.1) |
| `7341:101125` | active, draft, deactivated | colours | pill / dot / label | `#eaf7e6` / `#1d7a2e` / `#1d7a2e`; `#e0f2fe` / `#0284c7` / `#05669e`; `#eff1f4` / `#8c94a1` / `#4a5468` | `STATUS_PILL_TONES` (tokens where the hex equals one) | match |
| — | any | label | AA | 4.5:1 | 4.89:1, 5.38:1, 6.73:1 | match (W1) |
| U07 `7370:55180` #2 | scheduled | — | — | "Scheduled · <date>" | not built | F1 |
| U07 `7370:55180` #4 | test results | — | — | "Meets the rules" / "Doesn't meet the rules" stay KERN badges | not a status pill | match |

### RuleRow — T024, 2026-11-08

Checked in Firefox at 1440 × 1000 (scrollbar gutter `innerWidth − clientWidth` = 0, so the page is the frame's 1440) on the seeded draft `e67b4d7b…` (default, hover, open menu, focus) and on a draft created for this check, "T024 rule row check" (`1e67d8c6…`, created and deleted through the API from the page: Standard with four rules, one on data no longer requested, then a conflicting pair; the based variant "Ambulance" with a removed and a changed rule). The read-only row with the identifier and the selected row are on no reachable page: they were mounted on the rules step of that draft with the dev server's modules (`/src/components/RuleRow/index.tsx`, React's `createRoot` from `/node_modules/.vite/deps/`) in a card-like host, the selected row with `RulesStep/SelectBox.tsx` in the new `selectBox` slot inside a `pl-40` list. Fonts: `document.fonts.check` true for Fira Sans 400/600 at 14 and 16.

| frame | state | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|
| U30 6348:40889 | default | row | padding, gap, align | 8 16 8 24, 16, top | 8px 16px 8px 24px, 16px, flex-start | match |
| U30 6348:40889 | default | row | height (name, sentence, message) | 102 | 102 | match |
| U30 6348:40889 | default | content | gap, height | 4, 86 | 4px, 86 | match |
| U30 6348:40889 | default | name | font, colour | Fira Sans 600 14/24 (`label/small`), `action-default` #1d56f0 | 600 14px/24px, rgb(29, 86, 240) | match |
| U30 6348:40889 | default | sentence | gaps, height, top | 4 × 8 (row × column), 30, 28 below the row's content top | 4px / 8px, 30, +28 | match |
| U30 6348:40889 | default | document glyph | size, offset | 16 × 16 at x 0, y 7 | 16 × 16 at +0, +7 | match |
| U30 6348:40889 | default | "Personal ID ·" | text, font, colour, x | "Personal ID ·", 400 14/24, #4a5468, 24 | "Personal ID ·", 400 14px/24px, rgb(74, 84, 104), +24 (79.4 wide, Figma 79) | match (C3) |
| U30 6348:40889 | default | data | font, colour, x | 600 16/24 (`label/default`), #0b1220, 111 | 600 16px/24px, rgb(11, 18, 32), +111.4 | match |
| U30 6348:40889 | default | symbol chip | size, padding, border, radius, fill, font | 26 high, min 24 wide, 0 8, 1 #e1e6f0, circle, white, 600 14/24 | 25.8 × 26, 0px 8px, 1px rgb(225, 230, 240), fully round, white, 600 14px/24px | match (cosmetic 22) |
| U30 6348:40889 | default | words "is at least" | font, colour | 400 16/24 (`body/default`), #4a5468 | 400 16px/24px, rgb(74, 84, 104) | match |
| U30 6348:40889 | default | value chip | height, padding, border, radius, fill, font | 30, 2 8, 1 #e1e6f0, 4, white, 600 14/24 | 30, 2px 8px, 1px rgb(225, 230, 240), 4px, white, 600 14px/24px | match (cosmetic 22) |
| U43 6168:7226, U44 6171:7094 | default | several values | chips, gap | one chip per code ("B", "BE"), 8 apart | one chip each, 8px | match |
| U30 6348:40889 | default | message line | top, height | 62, 24 | +62, 24 | match |
| U30 6348:40889 | default | "Message for citizens:" | text, font, colour | "Message for citizens:", 600 14/24, #4a5468 | the same, 600 14px/24px, rgb(74, 84, 104) | match (C2) |
| U30 6348:40889 | default | message | font, colour, gap after the label | 400 14/24, #0b1220, 8 | 400 14px/24px, rgb(11, 18, 32), 8 (`mr-8`; wraps under the label on a narrow row) | match |
| U30 6348:40889 | default | actions | size, gap, align | 32 × 32 (⋯ only), 8, centre | 32 × 32, 8px, center | match |
| U43 6168:7263 | default | list | first row's height before the first connector | 110 (8 more below the content than the 102 master; U36 6344:53547, U44 6171:7077 the same) | 102; the connector follows at once | deferred to T056 (the list's spacing in `RulesStep/RuleListItem.tsx` / `TreeItem.tsx`; the row is the master's 102) |
| U82 6650:37780 | read-only | actions | empty column | 32 × 32 kept | 32 × 32 (`min-h-32 min-w-32`), 16 from the right edge | match |
| U82 6650:37780 | read-only | identifier | text, place, font | not drawn (U82 #20) | "rule-1" 8 px after the name, 400 14px/24px rgb(74, 84, 104), "Identifier" hidden before it (mounted) | F35 |
| U82 6650:37780 | read-only | ⋯, marks | presence | none (Standard tab) | none (no `actions`, no `mark`) | match |
| U55 6530:40150 | open menu | row | look | unchanged; the menu over the next rows | unchanged; menu 1043–1263 × 321–634 over the rows below (row ends at 375) | match |
| U55 6530:40150 | open menu | row | clipping (V6) | none | no `overflow-*`, `transform` or `filter` on the row or its parts (only the hidden `sr-only` texts and the glyph `img`'s own clip) | match |
| U55 6530:40150 | open menu | ⋯ | `aria-expanded`, entries | — | true; the entries are `RuleMenu`'s (T058) | match (T021's table) |
| 6083:3453 (name row) | hover | name | dashed underline, pencil | "Rename underline" and `icon-edit-small` 20 (hidden layers of the master) | 1px dashed rgb(29, 86, 240), pencil 20 × 20 visible, 8 after the name; no colour transition | deferred to T058 (`RulesStep/ItemName.tsx`, the name slot) |
| — | hover, focus | outline frame | transition | 150 ms colours (§4) | `motion transition-colors duration-(--duration-colour)`: 0.15s on colour, background, border | match |
| — | focus (a refused Publish, a findings link) | row | ring | not drawn | outline 4px solid rgb(11, 18, 32), offset −4px, on `:focus-visible` only (none after a mouse action) | match (002-ACC, §2 focus rule) |
| U36 6344:53530 | selected | row | look | no tint; content shifted 40 (the list's `pl-40`) | no tint; the name at +65 from the card's edge (Figma 225 − 160 = 65) | match |
| U36 6344:53557 | selected | checkbox | x | 16 from the card's edge | 16 (mounted in the `selectBox` slot) | match |
| U36 6344:53557 | selected | checkbox | y | box about 21 below the row's top (item at 356, 4 padding, row at 338) | 10 below (`SelectBox`'s `mt-10`, level with the name) | deferred to T059 (`RulesStep/SelectBox.tsx`, which T059 rebuilds on `Checkbox` and moves into the slot) |
| U47 6185:8570 | removed | content | opacity | `action-state-opacity-disabled` 40 % on name, sentence (and message) | 0.4 on the content column | match |
| U47 6185:8570 | removed | sentence | strike | every text and chip text struck | `line-through` on the sentence (propagates to every part and chip) | match |
| U47 6185:8570 | removed | message line | presence | hidden | shown, faded and struck | F36 (FR-040) |
| U47 6185:8570 | removed | mark, ⋯ | opacity, gap | full colour, 8 apart | opacity 1; mark 1115–1223, ⋯ at 1231 | match |
| U47 6185:8570 | removed | mark | text | "Removed here" | "Removed here" (`BranchMark`, T019) | match |
| U44 6171:7487 | problem (finding, conflict) | outline | inset, border, radius, fill | 8 from the card, 1 `feedback-warning` #9a4a00, 8, white | 8px padding, 1px rgb(154, 74, 0), 8px, white | match |
| U44 6171:7489 | problem (finding) | note | padding, height, gap, icon, font | 0 0 8 24, 32, 4, `icon-warning-small` 20, 400 14/24 #0b1220 | 0px 0px 8px 24px, 32, 4px, 20 rgb(154, 74, 0), 400 14px/24px rgb(11, 18, 32) | match (`FindingNote`, T025) |
| U44 6171:7489 | problem (finding) | note | text | "Can’t be met together with Rule 05." | the checks' text ("Contradicts Rule 07.") from `findingMessages.ts` | W13 (T025's note; the texts are T010's, C4) |
| 6110:3657 | problem (spec 002, blocking) | outline | border | 1 `feedback-danger` #c4271c, radius 8, white | 1px rgb(196, 39, 28), 8px, white | match |
| 6110:3657 | problem (blocking) | note | icon, gap, font, colour, padding | `icon-info-small` 20 danger, 8, 600 14/24, #c4271c, 0 0 8 24 | `kern-icon--info` 20 rgb(196, 39, 28), 8px, 600 14px/24px, rgb(196, 39, 28), 0 0 8px 24px; 32 high | match |
| — | problem | row | description | — | `aria-describedby` = the note's id | match (baseline F11) |
| U58 / U47 (changed) | changed | row | tint, inset | `variant/changed-background` #f8f1fc, 8 from the card | `bg-variant-changed-background`, 8px | match (the mark is T019's; the "Variant outline" of the screens is T065's) |
| U40 6344:53871 | linked | link icon | presence | on two linked rules inside Group 02 only | on no linked rule (Ambulance Rule 01 drawn as default) | CLAR 2026-11-07 #24 (b), 002-S4.31 |
| — | 320 px | rows | horizontal scroll (FR-010) | — | none (scrollWidth 320); every row 17–303, content wraps | match |

### Connector (+ ConnectorMenu, ConnectorOption) — T023, 2026-11-08

Checked in the scripted Chromium (playwright-core, `/usr/bin/chromium`) at 1455 × 1000 and
1455 × 1400 (1440 frame), 1455 × 560 and 320 × 640, on the seeded draft `e67b4d7b…` (rules step,
Standard: the top-level AND, Group 01's OR, Sub-group 02's AND); menus opened and closed with
Escape, a click outside, Tab, and a press released outside the option, so the draft's operators
are unchanged. Fonts: `document.fonts.check('600 14px "Fira Sans"')` and `'400 14px …'` true. The
read-only, faded and marked variants and choosing an option reach no page yet (T079 the details,
T065 the variants): they were checked by mounting `Connector` from the dev server's module
(`/src/components/Connector/index.tsx`, React's own `createRoot` from the dev server's deps) in a
`li` prepended to the rules card's list, with `onSwitch` collecting the chosen operators; no draft
was created or changed.

| frame | state | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|
| U34 6094:6511 | default | connector row | height, padding | 44; 8 24 | 44; 8px 24px | match |
| U34 6094:6400 | default | connector row (OR) | height | 46 | 46 | match |
| U34 6094:6511 | default | AND pill | x on the page | 185 (160 + 1 + 24) | 185 | match |
| U34 6094:6400 | default | OR pill in Group 01 | x on the page | 204 (U34 2.2: 177 + 3 + 24) | 204 | match |
| U34 6094:6511 | default | AND pill | height, padding, gap | 28; 2 8 2 16; 2 | 28; 2px 8px 2px 16px; 2px | match |
| U34 6094:6511 | default | AND pill | fill, text | `action-default` #1d56f0, `action-on-default` white | rgb(29, 86, 240), white | match |
| U34 6094:6511 | default | pill | radius | `border-radius-circle` 9999 | `rounded-full` (3.4e7 px) | match |
| U34 6094:6511 | default | pill label | font | Fira Sans SemiBold 14/24 (`label/small`) | "Fira Sans" 600 14px/24px | match |
| U34 6094:6400 | default | OR pill | fill, border, text, height | white, 1 #1d56f0, #1d56f0, 30 | white, 1px rgb(29, 86, 240), rgb(29, 86, 240), 30 | match |
| U34 6094:6511 | default | chevron | glyph, size, colour | `icon-expand_more-small` 20, white (AND) / #1d56f0 (OR) | the repo's SVGs, byte-identical paths and fills to Figma's export, 20 × 20 | match |
| U34 6094:6511 | default | line | gap, height, colour | 8 after the pill, 1, `decorative-brand` #4f8cff | 8, 1px, rgb(79, 140, 255) | match |
| U34 6094:6511 | default | connectors | one between items (FR-038, 002-S2.8) | between every two items | the call sites render one before every item but the first (RulesStep, GroupFrame, SummaryBranch) | match |
| U34 6094:7052 | open | menu | size | 300 × 189 | 300 × 189 | match |
| U34 6094:7052 | open | menu | border, radius, padding, gap, fill | 1 #e1e6f0, 8, 8, 2, white | 1px rgb(225, 230, 240), 8px, 8px, 2px, white | match |
| U34 6094:7052 | open | menu | shadow | "Elevation/Menu" #13152529 (0, 10) r 28 | `rgba(19, 21, 37, 0.16) 0px 10px 28px 0px` (`--shadow-menu`) | match |
| U34 6094:7052 | open | menu | left edge | on the pill's (both at 204) | 204 = pill 204 (side `start`) | match |
| U34 6094:7052 | open | menu | gap to the pill | 35 (pill bottom 827, menu 862) | 8 (`mt-8` / `mb-8`) | build note 3 (U07 #11 "Menus and tooltips anchor to their trigger"; R10), the Menu pattern's 8: the frame places the instance loose, as U37's tooltip |
| U34 6094:7052 | open | option | size, padding, gap, radius | 282 × 64, 8, 8, 4 | 282 × 64, 8px, 8px, 4px | match |
| U34 6094:7052 | open | option label | font, colour | 14/24 600, #0b1220 (AND) / #1d56f0 (chosen OR) | 600 14px/24px, rgb(11, 18, 32) / rgb(29, 86, 240) | match |
| U34 6094:7052 | open | option description | font, colour, text | 14/24 400, #4a5468, "All rules must be met" / "At least one rule must be met" | 400 14px/24px, rgb(74, 84, 104), the same texts (T009) | match |
| U34 6094:7052 | open | chosen option | fill, tick | `layout-background-hued` #f2f5fb, `icon-done-small` 20 #1d56f0, 8 from the right | rgb(242, 245, 251), `done-action-small.svg` (identical path and fill) 20 × 20, 8 | match |
| U34 6094:7052 | open | divider | place, height, colour | y 141, 1, #e1e6f0 | y 141, 1px, rgb(225, 230, 240) | match |
| U34 6094:7052 | open | footer | place, size, padding | y 144, 258 × 36, 8 8 4 | y 144, 258 × 36, 8px 8px 4px | match |
| U34 6094:7052 | open | footer | text, font, colour | "Applies to every rule in Group 01", 14/24 400, #4a5468 (FR-038) | the same, 400 14px/24px, rgb(74, 84, 104) | match |
| U34 6094:6873 | open | pill while open | look | unchanged (no state, chevron not turned) | unchanged; `aria-expanded="true"` | match |
| — | open | menu | semantics (FR-038, 002-ACC.2) | a menu button whose name says the level | `aria-haspopup="menu"`, name "OR, switch Group 01 to AND or OR", menu `aria-labelledby` the pill, `aria-describedby` the footer, options `menuitemradio` with `aria-checked` | match |
| — | open | menu | z-index, inline styles | above the sticky header and footer; class sets only | 40; no `style` attribute | match |
| — | open down / up | menu | direction (R10) | down where it fits above the footer, else up | 1455 × 1400: down (`top-full mt-8`, 803 = 795 + 8); 1455 × 1000: up (`bottom-full mb-8`, ends 757, pill at 765) | match |
| — | short window | menu | max-height step, inner scroll | 160–480 step fitting the space less 8 | 1455 × 560: Group 01 fits on neither side (193 / 193): down, `max-h-160`, options 101 of 130 scroll, the chosen one in view, divider and footer stay; Standard and Sub-group 02 up, `max-h-320` | match |
| — | 320 px | menu | stays on screen (FR-010) | — | 320 × 640: `full`, `inset-x-16` of the rules card (33–272), `max-h-160`, down; no horizontal scroll (scrollWidth 305 ≤ 320) | match |
| P09 1914:12574 | hover | AND pill | layer | `action-state-indicator-tint` (white) at 8 % | `::before` white / 0.08 under the label | match |
| P09 1914:12581 | pressed | AND pill | layer | white at 16 % | white / 0.16 | match |
| P09 1914:12697 | hover | OR pill | layer | `action-state-indicator-default` #1d56f0 at 8 %, over the border (inset −1) | #1d56f0 / 0.08, `before:-inset-1` | match |
| P09 1914:12697 | pressed | OR pill | layer | #1d56f0 at 16 % | #1d56f0 / 0.16 | match |
| P09 1914:12574 | focus (keyboard) | pill | ring | 4 `action-focus-default` #0b1220 outside | outline 4px solid rgb(11, 18, 32), offset 2; none after a click | match |
| — | hover, pressed | pill, options | transition | 150 ms colour (§4) | 0.15s on `::before`, class `motion`; `none` under reduced motion | match |
| P33 2:1985 | hover / pressed | option | layer | #1d56f0 at 8 % / 16 %, radius 4, also over the chosen tint | `::before` #1d56f0 / 0.08, / 0.16 | match |
| P33 2:2406 | focus (keyboard) | option | fill, texts, tick | `action-focus-default` #0b1220, inverse text | rgb(11, 18, 32); both texts white; tick `brightness(0) invert(1)`; no outline | match |
| — | open | keyboard (002-ACC.4) | arrow keys, Home, End, Escape, Tab, Enter | — | ArrowDown/ArrowUp on the pill opens with the chosen option focused; arrows wrap, Home/End; Escape closes and focuses the pill; Tab closes and moves on; Enter on the pill opens, Enter on an option chooses | match |
| — | open | click outside | closes | — | closes | match |
| — | choosing (harness) | option | `onSwitch`, focus | the level switches; focus back on the pill | AND → "At least one rule must be met": `onSwitch('or')`, menu closed, focus on the pill; choosing the current operator calls nothing | match |
| U82 6650:37782 / `6652:38085` | read only | pill | chevron, padding, element | no arrow, equal padding 2 16 (U03 #26) | no `img`, 2px 16px, a `span` (not focusable); AND 28 high, OR 30 with its border | match |
| U47 6185:8569 | faded | pill, line | opacity | the connector at 40 % (pill #1d56f0 renders #a5bbf9 on white) | 0.4 (`action-state-opacity-disabled`) on the pill, the line and the mark, the row at 1 (= #a5bbf9) | match |
| — | faded, open | menu | opacity, stacking | — (not drawn) | menu's effective opacity 1, on top of a following faded row (`elementFromPoint` inside the menu) | match |
| U38 6163:4850 | faded | connectors | drawn | the task cites this frame for faded connectors | U38 3.5 draws none faded (every pill solid, also inside the added Group 02 and the changed Sub-group 01); the faded value is read from U47 6185:8569 | match (U47 is the frame that draws FR-051 (39)) |
| U39 6163:5442, 6324:39449 | group logic changed | connector inside the changed group | look | the plain AND / OR pill, line #4f8cff on the group's tint; the "Changed here" is the group header's | the default pill | match |
| — | switched top level (W12) | first top-level connector | mark | not drawn (U38 #85, U39 #87: 002-S4.30) | `BranchMark` after the line ("Changed here"), faded with the connector when faded | W12 |
| — | any | link icon (FR-038d, 002-S4.31) | on every linked rule or none | the strip has one, no rule row has one | the connector draws none; the rule rows' icon is T024 / T065 | match |
| — | any | page | `title` attribute | none | 0 elements with `title` | match |

### BranchName (+ FindingsSegment) — T026, 2026-11-08

Checked in playwright-chrome at 1455 × 1000 (1440 frame; `body` 1440 wide) on an own draft
(copy of `e67b4d7b…`'s content: Standard with a description, Ambulance based on Standard with a
contradiction and a duplicate, School transport without a description; deleted afterwards). Fonts:
`document.fonts.check` true for Fira Sans 400 16px, 600 16px, 400 14px. The `tab` form isn't used
by a page yet (T064, T073, T079 switch to it): it was mounted with the dev server's modules
(React's own `createRoot`, the real `BranchMenu` as `actions`) in place of the rules step's tab
container, the original hidden, in the tab row of the page; the `children` form was checked on the
live rules and test steps.

| frame | state | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|
| P29 2:47775 | — | kit Tabs | anatomy | none drawn ("In Bearbeitung") | V5 "Rules/Variant tab · fixes" 6529:39174 used | match (§2 row, T026) |
| U38 6134:9153 | default | tab | padding top, column gap | 4, 8 | 4px, 8px | match |
| U38 6134:9153 | default | tab | size, unselected "Standard" with ⓘ | 90 × 38 | 90.4 × 38 | match |
| U38 6134:9153 | default | label row | height, gap | 24, 4 | 24, 4px | match |
| U38 6134:9153 | default | name | font, colour | Fira Sans Regular 16/24 (`body/default/regular`), `layout-text-muted` #4a5468 | "Fira Sans" 400 16px/24px, rgb(74, 84, 104) | match |
| U38 6134:9153 | selected | name | font, colour | Fira Sans SemiBold 16/24 (`label/default`), `layout-text-default` #0b1220 | 600 16px/24px, rgb(11, 18, 32) | match |
| U38 6134:9153 | selected | indicator | size, colour | 2 high, across the tab (⋯ included), #0b1220 | 2, the tab's full width, rgb(11, 18, 32) | match |
| U38 6134:9153 | default | indicator | colour | none | transparent, 2 high (the row keeps its height) | match |
| U38 6134:9153 | default | ⓘ | size, colour | 20 (`icon-info-small`), #4a5468 | 20 × 20, rgb(74, 84, 104) | match |
| U46 6758:43058 | selected | "Ambulance" tab | left edge | 274 (160 + 114: Standard 90 + gap 24) | 274.4 | match |
| U46 6758:43058 | selected | "Ambulance" tab | width | 129 (⋮ as a 20 px icon) | 140.8 (the ⋮ is `BranchMenu`'s 32 px target) | F28 (the component's note "32px target"; the ⋯ is T067's `BranchMenu`) |
| U46 6758:43058 | — | tab row | height, line | 49, 1 px `decorative-border` #e1e6f0 | 49, 1px solid rgb(225, 230, 240) | match (the row is T064's `BranchTabs`) |
| U46 6758:43060 | with findings (conflict) | icon | glyph, colour | `icon-warning-small` #9a4a00 | `kern-icon--warning`, rgb(154, 74, 0) | match |
| U71 7058:61618 | test step, with the finding | icon | glyph, colour | `icon-warning-small` #9a4a00; tab 38 high | the same on the live test step ("Ambulance has findings"); 38 | match |
| U46 6758:43549 (5.11) | duplicates only | icon | glyph, colour | blue ⓘ (build note 26) | `kern-icon--info`, rgb(2, 115, 174) (forced through the props) | match (§1.5 AA value) |
| U50 7375:101551 | with a problem | icon | glyph, colour | red error icon (`icon-emergency_home-small`, FR-041a) | `kern-icon--danger`, rgb(196, 39, 28) (forced through the props: no producer yet) | match (`error` kind; deferred to T060/T070 for the data) |
| — | no findings, variant without description | ⓘ, tooltip | shown, text (FR-041b) | grey ⓘ, "No findings." | grey ⓘ "About School transport", bubble "No findings." 40 high | match |
| — | Standard without description, no findings | ⓘ | shown (FR-035c) | none | none | match |
| U46 6758:43524 | hover ⚠ | bubble | size | 280 × 129 (8 + 48 + 8 + 1 + 8 + 48 + 8) | 280 × 129 | match |
| U46 6758:43524 | hover ⚠ | bubble | background, radius, padding, parts' gap | #0b1220, 8, 8 16, 8 | rgb(11, 18, 32), 8px, 8px 16px, 8px | match |
| U46 6758:43524 | hover ⚠ | description | text, colour, height | body/small 14/24 white, two lines | rgb(255, 255, 255), 48; breaks after "Drivers" as drawn | match |
| U46 6758:43524 | hover ⚠ | divider | height, colour, opacity | 1, `layout-text-inverse` white, 24 % | 1 × 248, rgb(255, 255, 255), 0.24 | match |
| U46 6758:43524 | hover ⚠ | kind icon | size, colour | 20, white | 20 × 20, rgb(255, 255, 255) | match |
| U46 6758:43524 | hover ⚠ | finding | gap, text | 8; "2 rules contradict each other, and 1 rule is a duplicate", two lines | 8px; the same text (passed), 48, breaks after "and" as drawn | match |
| U50 7375:101551 | hover error icon | kind icon, text | white `icon-emergency_home-small`, four lines | white `kern-icon--danger`; the Figma text wraps in four lines as drawn | match |
| U46 6758:43524 | hover ⚠ | bubble | position | 339, 260 (drawn loose) | 8 below the icon, 8 left of its edge (351 for the icon at 359) | build note 3 (T022's anchor, as in the Tooltip pattern) |
| — | live rules step (`children` form) | tooltip | segment colours | white divider and icon | rgb(255, 255, 255) both; gap 8 | match |
| — | hover, unselected | name | colour, weight | not drawn (kit has no tab) | rgb(11, 18, 32), 400, 150 ms `transition-colors`, `.motion` | match (§2 row, T026) |
| — | pressed, unselected | name | colour | not drawn | rgb(11, 18, 32) | match (§2 row, T026) |
| — | keyboard focus | tab | ring | KERN focus: 4 px `action-focus-default`, offset 2 | 4px solid rgb(11, 18, 32), offset 2px | match |
| — | focus after a click | tab | ring | none (CLAUDE.md: keyboard only) | none; the tab selected | match |
| — | tab order | tab, icon | roving tab index, icon beside the tab | selected tab 0, others −1; Tab goes from the tab to "Ambulance has findings", which opens its bubble | match |
| — | with findings | tab | accessible name (W13, 003-S4.4) | "<variant> has findings" | tab `aria-label` "Ambulance has findings" (visible name first, WCAG 2.5.3); the icon's name the same | match |
| — | selected | ⋯ | place | after the icon, 4 apart, in the label row (U59 6523:37259) | `actions` slot, 4px gap, `-my-4` keeps the 24 px row | match |
| U01 6637:36649 (#18) | scrolled | tab row | pinned under the step head | pinned with the step header | not part of the component | deferred to T056 |
| — | any | page | `title` attribute | none | none | match |

### Pattern: Tabs — T026, 2026-11-08

The pattern's first table; it stands for the rules step's tabs (T064), the test step's (T071,
T073) and the details' (T079).

| frame | state | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|
| 6529:39174 (U38 6134:9153) | default / selected | tab | anatomy | pt 4; label row (name, 4, 20 px icon, 4, ⋯) 24 high; 8; 2 px indicator across the tab | `BranchName` with `tab` | match |
| U38 6134:9153 | selected | tab | look | `label/default` 600 #0b1220, black indicator | the same | match |
| U38 6134:9153 | default | tab | look | `body/default` 400 #4a5468, no indicator | the same | match |
| U38 6134:9153 | — | tab row | look | 1 px `decorative-border` under the row, tabs 24 apart, bottom-aligned | T064's `BranchTabs` (today's classes give 49 high, 24 gap, the line) | match |
| — | hover, pressed | tab | look | not drawn | the name darkens to #0b1220, 150 ms | match (§2 row) |
| — | keyboard | tab list | keys | WAI-ARIA tabs | roving `tabIndex`, arrow keys / Home / End (the row's `onKeyDown`), Enter/click selects | match |
| — | focus | tab | ring | keyboard only | 4 px `action-focus-default`, offset 2 | match |
| 6529:39174 note | — | ⓘ, ⋯ | inside the tab? | "no control inside a tab": separate buttons right after it | the icon and the `actions` are siblings of the tab button | match |
| build note 26 (U06 6760:48852) | findings | icon | by severity | grey ⓘ; blue ⓘ (duplicates / always met); orange ⚠ (contradiction); red error (problem) | `FINDINGS_ICONS`: `info` muted / `feedback-info`, `warning` `feedback-warning`, `error` `feedback-danger` | match |
| U46 6758:43524 | hover / focus / tap on the icon | tooltip | content | description, divider, the finding | `InfoTooltip` (T022) with `FindingsSegment` | match |
| FR-035c, FR-041b | no findings | ⓘ | when | Standard only with a description; a variant always (description or "No findings.") on the rules step | `noFindingsInfo` from the call site | match |
| U01 #18 | scrolled | tab row | pinned | with the step header on the rules step | — | deferred to T056 |

### GroupFrame (+ GroupHeader, GroupMessage) — T025, 2026-11-08

Checked in Firefox (playwright-firefox MCP) at 1440 × 1000 and 1440 × 1700, scrollbar gutter `innerWidth − clientWidth` = 0, so the page is the frame's 1440; fonts: `document.fonts.check` true for Fira Sans 400/600 at 14, 16, 18. Default, with message, sub-group: the seeded draft `e67b4d7b…` (rules step, Standard). Removed, faded, changed, the finding notes and the open menu: a draft created for this check through the API from the page, "T025 group frame check" (`68bcdb57…`: Standard = Rule 01, Group 01 (OR, message) [Rule 02, Sub-group 02 (AND) [Rule 03, Rule 04]], Group 03 (AND) [Rule 05 and Rule 06 contradicting], Rule 07 = Rule 01; the based variant "Ambulance" with Group 01 removed, Rule 03 changed inside it, Group 03 changed to OR), deleted afterwards (404). The info group note and the select box reach no page with these data: `GroupFrame` was mounted from the dev server's module (`/src/components/GroupFrame/index.tsx`, React's `createRoot` from `/node_modules/.vite/deps/`) in a `li` prepended to the rules card's list, and removed again.

| frame | state | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|
| U34 6094:6410 | default | group wrap | padding | 8 16 | 8px 16px | match |
| U34 6094:6411 | default | group frame | x, width (card at 160) | 177, 1086 | 177, 1086 | match |
| U34 6094:6411 | default | group frame | padding-top, left border, fill, corners | 8, 3 `action-default` #1d56f0, `layout-background-hued` #f2f5fb, square | 8px, 3px rgb(29, 86, 240), rgb(242, 245, 251), 0 | match |
| U34 6094:6412 | default | header | height, padding, gap, align, divider | 57, 0 16 8 24, 8, centre, 1 #e1e6f0 | 57, 0px 16px 8px 24px, 8px, center, 1px rgb(225, 230, 240) | match |
| U34 6082:3516 | default | group name | font, colour, x | `title/default` 600 18/24, #1d56f0, 204 | 600 18px/24px, rgb(29, 86, 240), 204 | match |
| U34 6082:3522 | default | subtitle | text, font, colour | "At least one rule must be met", 400 14/24, #4a5468 | the same, 400 14px/24px, rgb(74, 84, 104) | match (FR-051 (32); was "At least one of these must be met") |
| U34 6094:6318 | default | sub-group frame | x, width, fill, radius, border | 196, 1051, white, 8, 3 #1d56f0 | 196, 1051, white, 8px, 3px rgb(29, 86, 240) | match |
| U34 I6094:6320;6082:3516 | default | sub-group name, subtitle | font; text | `title/small` 600 16/24; "All rules must be met" | 600 16px/24px; "All rules must be met" | match |
| U34 6094:6411 | default | the frame and its members | look (screenshot) | header, rule, OR connector, sub-group, "Add rule" | the same order and spacing | match |
| U34 6094:6411 | default | ⋯ slot, "Add rule" | — | "Rules/More button", "Rules/Add actions" | the call site's `GroupMenu` (T021's `ActionMenu`) and `AddRuleButton` | match (slots; T057 builds them) |
| U34 6329:19219 | after switching | note | place | right under the header, full inner width | the `note` slot right under the header (and the message) | match (the note itself is `SwitchNote`, T057) |
| U35 6324:39410 | with message | card | place, size | under the header at x 3, 1083 × 90 | 180 (frame 177 + 3), 1083 × 90, at the header's bottom | match |
| U35 6324:39410 | with message | card | padding, gap, border, radius, fill | 8 16, 8, 1 #e1e6f0, 8, `feedback-info-background` #e0f2fe | 8px 16px, 8px, 1px rgb(225, 230, 240), 8px, rgb(224, 242, 254) | match (radius was 12, `rounded-kern-large` under the overlay) |
| U35 6324:39411 | with message | message row | padding, gap, radius, size | 8 8 8 16, 8, 4, 1049 × 40 at x 17 | 8px 8px 8px 16px, 8px, 4px, 1049 × 40 at x 17 | match |
| U35 I6324:39411;6092:3499 | with message | label | text, font, colour | "Message for citizens:", 600 14/24, `feedback-info` #0284c7 | the same, 600 14px/24px, rgb(2, 115, 174) | C2; §1.5 AA fix (`#0273ae`) |
| U35 I6324:39411;6092:3500 | with message | message | font, colour | 400 14/24, #0b1220 | 400 14px/24px, rgb(11, 18, 32) | match |
| U35 I6324:39411;6092:3501 | with message | pencil | size, colour, x | 20, `feedback-info` (#0284c7 in the export), 8 from the row's end | 20 × 20, rgb(2, 115, 174), 1218 (= 1238 − 20) | match (§1.5: the variable's AA value) |
| U35 6324:39419 | with message | hint | text, font, colour | "Shown instead of the rules’ own messages when this group isn’t met.", 400 14/24, #4a5468 | the same, 400 14px/24px, rgb(74, 84, 104) | match |
| U35 I6324:39419;6083:3544 | with message | hint icon | size, colour, gap | 20, `feedback-info` (#0284c7), 8 | 20 × 20, rgb(2, 115, 174), 8px | match (was `layout-text-muted`; §1.5 value) |
| U35 6324:39055 | with message | members' message lines | text | none on the closed rows; "Not shown while this rule is in Group 01. …" (F32) | the members' own messages (the call site's rows) | deferred to T057 (`GroupListItem`, F32, FR-037) |
| U58 6522:32997 | changed | frame | fill, left border | `variant/changed-background` #f8f1fc, 3 #1d56f0 | rgb(248, 241, 252), 3px rgb(29, 86, 240) | match (the blue border, T003's note) |
| U58 I6522:32999;6162:4871 | changed | mark | text, colour, opacity, place | "Changed here" #8a22b5 on white, before ⋯ | "Changed here" rgb(138, 34, 181) on white, opacity 1, before ⋯ | match |
| U58 6522:33001 | changed | connector inside | look | the default pill | the default pill (OR, no fading) | match |
| U38 6163:5269 | added | frame | left border, fill | 3 `#8a22b5` (sampled from the screenshot), #f8f1fc | `border-variant-new` #8a22b5, `bg-variant-new-background` #f8f1fc | match |
| U47 6185:41165 | removed | frame | border, fill, opacity | full colour (3 #1d56f0, #f2f5fb) | 3px rgb(29, 86, 240), rgb(242, 245, 251), opacity 1 on the frame and every ancestor | match |
| U47 I6185:41167;6082:3514 | removed | name, subtitle | opacity, strike | 40 %, name struck | 0.4 on the text column, `line-through` on the name | match |
| U47 I6185:41167;6082:3516 | removed | name | size | 16 (a raw override on the struck name) | 18 (`title/default`, the component's style) | deferred to T065 (U47 draws a raw 16 px override on the struck name; carried to T065 to decide) |
| U47 I6185:41167;6162:4871 | removed | mark, ⋯ | text, colours, opacity | "Removed here" #4a5468 on #eef1f6, full colour; ⋯ active | the same, opacity 1; ⋯ "Actions for Group 01" | match |
| U47 6185:41169 | removed | connector inside | opacity | 40 % | 0.4 on the pill and the line (`Connector` `faded`), the row at 1 | match |
| U47 6185:41168 | removed | member rule | opacity | the row's content at 40 %, struck, no message line | content at 40 % and struck (`RuleRow` fades and strikes its content column when `faded`, coordinator 2026-11-08); the message line stays | match (message line: F36) |
| U47 6185:41171 | faded (sub-group in a removed group) | frame | fill, border, divider | the box at 40 %: white, #1d56f0, #e1e6f0 at 40 % | `oklab(1 0 0 / 0.4)`, `… / 0.4` blue, divider `… / 0.4`; frame opacity 1 | match (the parts at 40 %, not a box: F36, V6) |
| U47 6185:41174 | faded | name, subtitle | strike, opacity | struck, 40 % (with the box) | `line-through`, 0.4 on the text column | match |
| U47 6185:41178 | faded, changed rule inside | mark | shown, opacity | none drawn | "Changed here" on Rule 03 at opacity 1 | F36 (FR-040) |
| U47 6185:41176 | faded | connector inside | opacity | 40 % | 0.4 on pill and line | match |
| U35 6324:39410 + U47 6185:41165 | removed, with message | card | opacity | not drawn (the removed frames have no message) | 0.4 on the card (no menu inside) | match (part fading, §3 V6) |
| U47 6185:41586 | removed, menu open | ⋯ menu | opacity, stacking | full colour, over the members | "Restore group", "Copy link"; no ancestor with opacity < 1; `elementFromPoint` inside the menu hits the menu at its top and bottom (over the faded members) | match (V6) |
| U44 6171:7561 | finding, conflict | frame | border, radius, fill | 1 all round `feedback-warning` #9a4a00, sub-group 8 / group square, fill unchanged | 1px rgb(154, 74, 0) all round, 0 (a top-level group), rgb(242, 245, 251) | match |
| U44 6750:41109 | finding, conflict | note row | place, padding, height | right under the divider, 0 16 8 24, 32 | at the header's bottom, wrapper `pr-16` + note `0 0 8 24`, 32 | match |
| U44 6750:41069 | finding, conflict | note | text | "Rule 04 and Rule 05 in this group contradict each other." | "Rule 05 and Rule 06 in this group contradict each other." (`findingMessages.ts`) | match (W13; names are the data) |
| U45 6753:40525 | finding, always met (mounted) | frame | border | 1 `feedback-info` #0284c7, square, hued | 1px rgb(2, 115, 174), 0, rgb(242, 245, 251) | match (§1.5 value) |
| U45 6753:40823 | finding, always met (mounted) | note row | place, padding, height, icon x | 8 below the divider, 8 16 8 24, 40, 25 from the frame | 0 after the header (66 = 1 + 8 + 57), `pt-8 pr-16` + `0 0 8 24`, 40, 25 | match |
| — | finding | description | `aria-describedby` | — | the frame and the header both point to the note's id | match (W19) |
| U36 6344:53557 / F33 | selected (mounted) | select box | place | 16 from the card's edge, before the group | the `selectBox` slot renders first in the wrap; a `SelectBox`-like box at x 176 (card 160 + 1 + 15) | match (the box and its row height are T059's) |
| U36 6344:53530 / F33 | selected | frame | look | unchanged | unchanged (fill, border as default) | match |
| — | 320 px | group, card | horizontal scroll (FR-010) | — | none (scrollWidth 320); group 33–287, card 36–287, the message wraps | match |
| — | any | page | inline styles, `title` | none | no `style` attribute, no `title` in the components | match |

### FindingNote — T025, 2026-11-08

Same session and drafts as `GroupFrame` above; the rule notes on the rules step of "T025 group frame check" (Standard: Rule 05 / Rule 06 conflict; Ambulance: Rule 07 duplicate of Rule 01), the group notes as above.

| frame | state | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|
| U44 6171:7489 | warning (rule) | note | padding, height, gap | 0 0 8 24, 32, 4 | 0px 0px 8px 24px, 32, 4px | match |
| U44 6171:7490 | warning | icon | glyph, size, colour | `icon-warning-small` 20, #9a4a00 (`feedback-warning`) | `kern-icon--warning` 20 × 20, rgb(154, 74, 0) | match |
| U44 6171:7490 | warning | text | font, colour | 400 14/24 (`body/small`), #0b1220 | 400 14px/24px, rgb(11, 18, 32) | match |
| U44 6171:7490 | warning | text | wording | "Can’t be met together with Rule 05." | "Contradicts Rule 06." (`findingMessages.ts`) | W13 (the texts are T010's, C4) |
| U44 6171:7509 | info (rule) | icon | glyph, size, colour | `icon-info-small` 20, #0284c7 (`feedback-info`) | `kern-icon--info` 20 × 20, rgb(2, 115, 174) | §1.5 AA fix (the variable's value; was `layout-text-muted`) |
| U44 6171:7510 | info | text | wording, font, colour | "Same as Rule 03. You can delete one of them.", 400 14/24, #0b1220 | "Same as Rule 01. You can delete one of them.", 400 14px/24px, rgb(11, 18, 32) | match |
| U44 6750:41109 | warning (group) | note | icon x, padding | 24 in, 0 16 8 24 | +24 (202 − 178), wrapper `pr-16`, note `0 0 8 24` | match |
| U45 6753:40823 | info (group) | note | padding, height | 8 16 8 24, 40 | `pt-8 pr-16` + `0 0 8 24`, 40 | match |
| — | any | kind | hidden text | — (W19) | "Conflicting:", "Redundant:", "Always met:" as `sr-only` before the text; the icon `aria-hidden` | match |
| — | 320 px | note | wrapping | — | `wrap-anywhere`, no horizontal scroll | match |

### CopyableUrl — T028, 2026-11-08

Checked in the scripted Chromium (playwright-core, `/usr/bin/chromium`) at 1455 × 1000 (body 1440)
and 320 × 640, clipboard permissions granted. No EUDIPLO, so no connection is published: the
details' `GET /api/form-connections/<id>` was answered through `page.route()` with a published,
active `FormConnection` body (the seeded draft `e67b4d7b…` turned into `status: 'published'` with
`trigger_url`, `pull_url` and two branches with `pull_url`s, "Standard" and "Ambulance"), so the
page's own `ConnectionLinks` → `LinkCard` → `LinkCardUrl` render `CopyableUrl`. The deactivated
state (no call site passes `deactivated` before T080) was mounted with the dev server's module and
React's own `createRoot` in place of the "Request link" row, with the card title's id as
`describedBy`. The field variant was mounted the same way in place of `TokenCopyField` inside the
account page's real "Token … created" dialog after "Create token" (the token deleted afterwards).
Fonts: `document.fonts.check('400 16px "Fira Sans"')` and `'600 16px …'` true.

| frame | state | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|
| U80 6396:47718 | default | row | URL to button | gap 8 | 8 | match |
| U80 6396:47718 | default | row | indent | `pl-32` on the URL row (under the number) | none in the component; the link card's column places it | deferred to T078 |
| U80 6396:47718 | default | row | alignment | items centred | box and button centres 0 px apart | match |
| U80 6396:47719 | default | URL box | height | 48 | 48 | match |
| U80 6396:47719 | default | URL box | padding | 8 16 | 8px 16px | match |
| U80 6396:47719 | default | URL box | background | `layout-background-hued` #f2f5fb | rgb(242, 245, 251) | match |
| U80 6396:47719 | default | URL box | radius | 8 (`border-radius-default`) | 8px | match |
| U80 6396:47720 | default | URL text | font | Fira Sans Regular 16/24 (`body/default/regular`) | "Fira Sans" 400 16px/24px | match |
| U80 6396:47720 | default | URL text | colour | `layout-text-default` #0b1220 | rgb(11, 18, 32) | match |
| U07 7370:55183 (#10) | default | URL text | one line, cut | "one line, cut with … (text-overflow: ellipsis)" | `white-space: nowrap`, `text-overflow: ellipsis`, `overflow: hidden`; the 68-character request URL cut in a 565 px box | match |
| U07 7370:55183 (#10) | default | URL text | copies in full | "Copy link copies the full URL" | clipboard = the full URL | match |
| — | default | URL text | accessible text | full URL (task) | the box's text is the full URL, nothing hidden from screen readers | match |
| U80 6396:47721 | default | button | size | 139 × 48 | 138.98 × 48 | match |
| U80 6396:47721 | default | button | padding, radius, fill | 0 16, 8, `action-default` #1d56f0 | 0px 16px, 8px, rgb(29, 86, 240) | match |
| U80 6396:47721 | default | label | font, colour, padding | Fira Sans SemiBold 16/24 (`label/default`), white, 8 | 600 16px/24px, white, 8px | match |
| U80 6396:47721 | default | icon | glyph, size, place | icon-content_copy-default 24, white, 16 from the left | `kern-icon--content-copy` 24 × 24, white, at 16 | match |
| U80 6396:47721 | default | button | name | "Copy link" | "Copy link Request link" / "Copy link Result link Standard" / "… Ambulance" (`aria-labelledby`: label, card title, variant name) | match |
| P09 2:4562 | hover | button | fill | white `action-state-indicator-tint` layer at 8 % on #1d56f0 = rgb(47, 100, 241) | KERN's `shade-hover` oklch(0.5627 0.2187 264.04) = rgb(47, 103, 243); cursor pointer | match (§1.1 opacities: KERN's shade carries the kit's 8 %; mixed in oklch, ≤ 3 per channel) |
| P09 2:4584 | pressed | button | fill | 16 % layer = rgb(65, 113, 242) | KERN: rgb(47, 103, 243) (its `:hover` rule outranks `:active`); with the `index.css` block below (injected): oklch(0.6007 0.1996 264.04) = rgb(64, 118, 246) | match with the `index.css` block for the coordinator (below) |
| P09 2:4567 | focus (keyboard) | button | ring | `focus-default` 4 `action-focus-default` #0b1220 around the button | outline 4px solid rgb(11, 18, 32), offset 2; none after a click | match |
| U81 6396:47841 | "✓ Copied" | button | icon, label | icon-done-default 24 + "Copied", the same primary fill | `kern-icon--check` 24 (the same Material glyph) + "Copied", rgb(29, 86, 240) | match |
| U81 6396:47841 | "✓ Copied" | button | width | 123 (URL box grows: button at 659, not 643) | 122.81; the URL box grows 565 → 581 | match |
| — | "✓ Copied" | button | duration (FR-048) | 2 s | "Copied" at 1.5 s, "Copy link" at 2.2 s; copying again at 1.5 s keeps "Copied" until 2 s after the second copy | match |
| — | "✓ Copied" | status | announced (FR-048) | the copy is announced | `role="status"`: "Link copied", emptied after 2 s; Enter copies too | match |
| — | copy fails | URL | baseline (002-S6) | the URL selected, the failure said | selection = the URL; "Copying didn’t work. The link is selected, so you can copy it yourself." | match |
| — | hover, cut URL | bubble | full URL (task) | the full URL in the hover tooltip | open on mouse hover over a cut URL: the full URL, 280 wide, `#0b1220`, 14/24 white, padding 8 16, radius 8, breaking anywhere, 8 below the box and flush with its left edge, `z-40`, `aria-hidden` (the text is the box's); Escape and leaving close it; no `title` anywhere | match |
| — | hover, URL that fits | bubble | — | — | none ("https://x.org/r") | match |
| U89 6417:31309 | disabled | button | look | the button at `action-state-opacity-disabled` 40 %, #1d56f0 | opacity 0.4, rgb(29, 86, 240); unchanged on hover; cursor not-allowed | match |
| U89 6417:31307 | disabled | URL box | look | not faded, #f2f5fb | opacity 1, rgb(242, 245, 251) | match |
| U89 6417:31309 | disabled | button | semantics (W21) | `aria-disabled="true"`, focusable, ignoring activation | `aria-disabled="true"`, no `disabled`, `tabIndex` 0; click, Enter and Space leave the clipboard unchanged and the label "Copy link" | match |
| U89 #13 | disabled, hover / keyboard focus | explanation | text, place | not drawn (FR-052b) | "Activate the connection first" in the tooltip, 280 × 40, 8 below, right edge flush with the button's (1104), opens on hover and on keyboard focus (ring 4px offset 2), Escape closes | W21 |
| — | deactivated → active | button | focus | stays | the same element keeps the focus; no `aria-disabled`, no tooltip | match |
| — | 320 px | row | stays on screen (FR-010) | — | the URL above the button, 8 apart; the bubble and the explanation across the page (16–289); no horizontal scroll (305 ≤ 320) | match |
| — | 320 px | URL box | width | — | 139: the link card's column sizes to its content (`items-start`) and the box no longer widens it (`contain: inline-size`) | deferred to T078 |
| — (S20, no frame) | field | label | font, gap | label/default 16/24 600 (`TextField`'s label row) | 600 16px/24px rgb(11, 18, 32), 8 above the field, `for` the input | W16 |
| — (S20, no frame) | field | input | look | the URL box (U80 6396:47719) | 48 high, 8px 16px, rgb(242, 245, 251), radius 8, no border, 400 16px/24px, cut with "…" | W16 |
| — (S20, no frame) | field, focus | input | ring, selection | — | outline 4px solid rgb(11, 18, 32), offset 2; the whole token selected (50 / 50); described by the dialog's warning | W16 |
| — (S20, no frame) | field, "✓ Copied" | button | label, announcement, 2 s (FR-048) | "✓ Copied" for 2 s, announced | "Copy" 107.89 → "Copied" 122.81; "Token copied"; clipboard = token; back after 2 s | match |
| — (S20, no frame) | field, 320 px | row | stays on screen | — | input 241 wide, "Copy" below it; no horizontal scroll | match |

### LocalDraftsOffer (+ LocalDraftItem) — T029, 2026-11-08

Checked in Firefox (playwright-firefox) on the overview `/` with the `designer` account, window
1440 wide, gutter 0 (`innerWidth − clientWidth`, overlay scrollbars; the page is 1440), and at
320 × 800. Local drafts seeded in the page's `localStorage` in the store's format 2 (one stored
draft's record `draft-1111…`, "Passenger transport licence", 06.11.2026 13:20 UTC; one never-saved
`new-2222…`, "Taxi licence" and, at 320, a 84-character name), removed afterwards. The browser's
zone is UTC, so the times read 13:20 / 08:12. Fonts: `document.fonts.check('400 14px "Fira Sans"')`
and `'600 16px …'` true. The overview page itself is not rebuilt yet (T043), so its column is
1040 wide, not the frame's 1120: widths are compared inside the banner.

| frame | state | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|
| U16 7362:54550 | one | banner | fill | `feedback-default-background` #eef1f6 | rgb(238, 241, 246) | match |
| U16 7362:54550 | one | banner | border, radius | 1 `decorative-border-level-1` #d0d8e6, 8 | 1px rgb(208, 216, 230), 8px | match |
| U16 7362:54550 | one | banner | padding | 16 16 16 20 | 16px 16px 16px 20px | match |
| U16 7362:54550 | one | banner | height | 82 | 82 | match |
| U16 7362:54550 | one | banner | width | 1120 (the page column) | 1040 (the old overview's column) | deferred to T043 |
| U16 7362:54550 | one | banner | place | between the page title and the toolbar, 16 apart | under the old overview's "New connection" button | deferred to T045 |
| U16 7362:54551 | one | text column | position, size | 21 17, 48 high, fills the row | 21 17, 737 × 48 | match |
| U16 7362:54552 | one | heading | text | "Unsaved changes in “Passenger transport licence”" | "Unsaved changes in “Passenger transport licence”" (h2) | match |
| U16 7362:54552 | one | heading | font, colour | `title/small` Fira Sans 600 16/24, #0b1220 | 600 16px/24px, rgb(11, 18, 32) | match |
| U16 7362:54553 | one | sub-line | text | "Saved only on this device on 06.11.2026, 14:20, when the page closed. Nobody else can see them." | "Saved only on this device on 06.11.2026, 13:20, when the page closed. Nobody else can see them." (the record's time) | match |
| U16 7362:54553 | one | sub-line | font, colour | `body/small/regular` 400 14/24, `layout-text-muted` #4a5468 | 400 14px/24px, rgb(74, 84, 104); tabular, slashed zero | match |
| U16 7362:54556 | one | Discard | gap to text, size | 16 after the text, 80 × 48 (40 + the 4 px margins) | 16, 79.9 × 40 + 4/4 margins | match |
| U16 7362:54557 | one | Resume editing | gap, size | 16 after Discard, 151 × 48, right edge at the padding | 16, 153.03 × 40 + 4/4, right edge at 1040 − 17 | match (the label's text is 99.04 wide in the browser's Fira Sans, Firefox and Chromium alike, Figma 97; padding, icon and border equal) |
| — (FR-029d) | one | structure | h2 and a one-item list | — | region "Unsaved changes in “…”", h2, list of 1: `sr-only` "Passenger transport licence", "Edited · 06.11.2026, 13:20", the two buttons | match |
| U16 7362:54621 | several | banner | height, padding | 220, 16 16 16 20 | 220, 16px 16px 16px 20px | match |
| U16 7362:54622 | several | text block | size, padding | 56 high, padding-bottom 8 | 56, 8px | match |
| U16 7362:54623 | several | heading | text, font | "Unsaved changes in 2 connections", 600 16/24 #0b1220 | the same, 600 16px/24px rgb(11, 18, 32) | match |
| U16 7362:54624 | several | sub-line | text, font | "Saved only on this device when the page closed. Nobody else can see them.", 400 14/24 #4a5468 | the same, 400 14px/24px rgb(74, 84, 104) | match |
| U16 7362:54625 | several | item | divider, padding, height | top 1 #d9dee8, 8 0, 65 | 1px rgb(217, 222, 232), 8px 0, 65 (at 73 and 138) | match |
| U16 7362:54626 | several | item name | font, width | `label/small` 600 14/24 #0b1220, 280 | 600 14px/24px rgb(11, 18, 32), 280 | match |
| U16 7362:54627 | several | item line | text | "Edited · 06.11.2026, 14:20" (stored draft) | "Edited · 06.11.2026, 13:20" | match |
| U16 7362:54632 | several | item line | text | "New, never saved · 05.11.2026, 09:12" | "New, never saved · 05.11.2026, 08:12" | match |
| U16 7362:54627 | several | item line | font, place | 400 14/24 #4a5468, 16 after the name, fills to the buttons | 400 14px/24px rgb(74, 84, 104), x 317 (= 21 + 280 + 16), 441 wide (523 − the 80 px narrower column − 2) | match |
| U16 7362:54628 | several | Discard | look | `button-tertiary-small`: no fill, label 600 14/24 `action-default` underlined, padding 0 8 + label 4 8, radius 8 | transparent, 600 14px/24px rgb(29, 86, 240) underline, 8px + 4px 8px, 8px; 79.9 × 40 | match |
| U16 7362:54629 | several | Resume editing | look | `button-secondary-small`: 1 `action-default` border, radius 8, 20 px `icon-edit-small` in `action-default`, label 600 14/24 | 1px rgb(29, 86, 240), 8px, `kern-icon--edit` 20 × 20 rgb(29, 86, 240), 600 14px/24px rgb(29, 86, 240) | match |
| U16 7362:54634 | several | never-saved item | button | "Resume editing" (FR-029e; the frame name's "Continue" is a slip) | "Resume editing" | match |
| U16 7362:54628 | one, several | Discard | text | "Discard" (layer "button-tertiary-small · Discard changes"; U07 note "Discard changes (tertiary)") | visible "Discard", accessible name "Discard changes in Passenger transport licence" | cosmetic 4 (the frame's text "Discard", U16 #9/#17; coordinator 2026-11-08) |
| — (005-S4.6, 005-S4.7) | one, several | Resume editing | name, target | names the connection; `/form-connections/new?local=<flowKey>` | "Resume editing Passenger transport licence"; `/form-connections/new?local=draft-1111…`; clicking the never-saved item opened the create flow with its name | match |
| P09 (kit) | hover | Discard | look | the kit's 8 % tint layer, the underline thickened | `action-state-indicator-tint-hover` (oklch … / 0.08), underline 3px, pointer | match |
| P09 (kit) | hover | Resume editing | look | the kit's 8 % tint layer | oklch(… / 0.08), pointer | match |
| P09 (kit) | focus (keyboard) | both buttons | ring | 4 `action-focus-default` #0b1220, offset 2 | 4px solid rgb(11, 18, 32), offset 2px; Tab order heading → Discard → Resume editing | match |
| — (005-S4.8, S4.9) | discard dialog | dialog | copy | "Discard unsaved work?", "The unsaved changes to <name> will be deleted from this device. This can’t be undone." (+ "The saved draft stays as it is." for a stored draft), "Discard" (danger), "Cancel" | the same, both variants seen; Escape closes and the focus returns to "Discard" | W5 (the dialog's look: T035) |
| — (005-S4.10) | after discard | status, focus | announced, focus | "Unsaved work discarded."; the next item's Resume, else the heading | status text as said; discarding the last of two → focus on the h2 "Unsaved changes in “Passenger transport licence”" (one-draft layout); discarding the first of two → focus on the remaining item's "Resume editing" in the one-draft layout | W5 |
| — (FR-010) | 320 px | banner | layout | — | 288 wide; several: name, line, buttons on rows of their own, the 84-character name wrapping; one: text above, the two buttons below; `scrollWidth` 320 | match |

### ValuesPicker (+ ValueOptionItem) — T027, 2026-11-08

Checked in playwright-chrome at 1455 px (1440 page) on an own draft copied from `e67b4d7b…` with a rule "Driving licence · Licence classes includes one of B, BE" (17 classes, search) and one "Personal ID · Sex includes one of" (8 values, no search), deleted afterwards; the field variant on the test step's "Edit data" (licence classes). Fonts: `document.fonts.check` true for 600 14px, 400 14px, 600 16px "Fira Sans". U53 `6324:16908` holds no values picker (frame 9.5, the number check menu): only its "menus open below their picker, at its left edge" is used.

| frame | state | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|
| U32 6357:43382 | open down | menu | width | 300 | 300 | match |
| U32 6357:43382 | open down | menu | position | left on the field's (912 = 912), top 8 below it (549 − 541) | left 914 = field 914; top 581 = field bottom 573 + 8 | match |
| U32 6357:43382 | open down | menu | border, radius, padding, gap | 1 `#e1e6f0`, 8, 8, 2 | 1px rgb(225, 230, 240), 8px, 8px, 2px | match |
| U32 6357:43382 | open down | menu | background, shadow | white, "Elevation/Menu" `0 10 28 0 #13152529` | oklch(1 0 0), `rgba(19, 21, 37, 0.16) 0px 10px 28px 0px` | match |
| U32 6357:43382 | open down | menu | height, inner scroll | 316, list 206 scrolling | 1455 × 985: `max-h-320`, 320, list 169 scrolling (footer row kept, below) | research R10 (the 160–480 step that fits; the drawn 316 is no step) |
| U32 6357:43382 | open down | menu | clipping | "overflow-clip" on the frame | `overflow: visible` on the frame, `overflow-y-auto` on the list only | match (carried from T015/T021: the search field's 4 px ring must show) |
| U32 6358:61888 | open | search field | size, place | 282 × 40 at 9 / 9 | 282 × 40 at 9 / 9 | match |
| U32 6358:61888 | open | search field | placeholder | "Search classes" | "Search classes" (the call site's copy) | match |
| U32 6362:61767 | open | class option | size, padding, gap, radius | 282 × 44, 8, 8, 4 | 282 × 44, 8px, 8px, 4px | match |
| U32 6362:61767 | open | class option, long text | height | 64 ("A1 Light motorcycles up to 125 cm³") | 64 | match |
| U32 6362:61767 | open | options | gap | 2 | 2px | match |
| U32 6362:61767 | open | box | size, place | 20, in a 28 slot (4 above), 8 from the row's left | 20 × 20 at x + 8, y + 12 of the 44 row | match |
| U32 6362:61767 | open | code | font, colour, min width | 14/24 600, `#0b1220`, 32 | 14px/24px 600, rgb(11, 18, 32), 32px | match |
| U32 6362:61767 | open | description | font, colour, start | 14/24 400, `#0b1220`, 8 after the code (x 76) | 14px/24px 400, rgb(11, 18, 32), x 76 | match |
| U32 6362:61767 | open | options | text | "AM Mopeds up to 45 km/h", "A1 Light motorcycles up to 125 cm³" … | the same codes and descriptions (the option set's) | match (W19) |
| 6358:43255 | selected | box | fill, tick | `#1d56f0`, icon-done-small white, no row tint | rgb(29, 86, 240), `check-white-small.svg`, row transparent | match |
| P33 2:1985 | class option hover | row | background | `#1d56f0` at 8 %, radius 4 | #1d56f0 / 0.08 (oklab), 4px | match |
| P33 2:1985 | class option pressed | row | background | `#1d56f0` at 16 % | #1d56f0 / 0.16 | match |
| 6027:17252 | option hover | box | border | 2 `action-default` (hover over the label too) | 2px rgb(29, 86, 240) | match |
| 6027:17252 | checked hover | box | ring | 0 0 0 3 tint (white) | box-shadow 0 0 0 3px white | match |
| 6027:17252 | focus (keyboard) | box | ring | 3 `#0b1220` around the box only | outline 3px solid rgb(11, 18, 32), offset 0; row unchanged | match |
| 6027:17252 | focus after a click | box | ring | none ("never on click") | none (`:focus-visible` false) | match |
| 6027:17252 | disabled option | box, texts | opacity | 40 % | box 0.4 (kern.css), code and description 0.4, no hover border; forced through the DOM (no option set has a disabled value yet) | match |
| — | hover | class option | transition | 150 ms colour (§4) | `0.15s` colour properties, `motion` | match |
| U32 6357:43428 | open | "Done" row | layout | 282 wide, the button at the right end | `flex justify-end`, button right edge = list's | match |
| U32 6357:43417 | open | "Done" | size, border, radius | 86 × 48, 1 `#1d56f0`, 8 | 87.9 × 48, 1px rgb(29, 86, 240), 8px (`kern-btn--secondary`) | match (±2 text width) |
| U32 6357:43417 | open | "Done" label | font, colour, padding | 16/24 600 `#1d56f0`, 16 + 8 | 16px/24px 600 rgb(29, 86, 240), 16px + 8px | match |
| U32 6357:43417 | keyboard focus | "Done" | ring | KERN's 4 px `action-focus-default` | 4px solid rgb(11, 18, 32) | match |
| — | "Done" | menu | closes, keeps the choice, focus | closes and keeps the choice (FR-039, CLAR Q27) | closes, chips "B", "BE" kept, focus on the field, `aria-expanded="false"` | match |
| U32 6357:43382 | open | footer | text | none drawn (values chosen) | "Select at least one option." under a divider (002-S3.38) | 002-S3.38 (the baseline footer, which U48 draws, kept above "Done") |
| U48 6191:42209 | open, 8 values | value option | row, gap, list padding | 28, 8, 4 | 28, 8px, 4px | match |
| U48 6191:42209 | open | value label | font, colour | 14/24 400 `#0b1220` | 14px/24px 400 rgb(11, 18, 32) | match |
| U48 6191:42209 | open, ≤ 10 values | search | none | none drawn for the class list's 7 shown | none (search from 10 options, baseline) | match |
| U48 6191:42209 | open | footer | divider, text, padding | 1 `#e1e6f0`; "Choose at least one option." 14/24 muted; 8 0 4 8 | 1px; "Select at least one option." 14/24 rgb(74, 84, 104); 8 0 4 8 | match for the layout; the text is deferred to T062 (the call site's `RULE_EDITOR_COPY.selectAtLeastOne`; U48 draws "Choose at least one option.") |
| U48 6191:42191 | open | field | border, height, padding, gap | 2 `#1d56f0`, 40, 16 / 8, 8 | 1px + 1px inset ring rgb(29, 86, 240), 40, 16px / 8px, 8px | match |
| U48 6191:42191 | open | chips | padding, border, radius, font, gap | 2 8, 1 `#e1e6f0`, 4, 14/24 600, 4 | 2px 8px, 1px rgb(225, 230, 240), 4px, 14px/24px 600, 4px | match |
| U32 6357:43363 | open | field | content | "B, BE" as text (a "Rules/Picker" instance) | chips "B" "BE" ("Rules/Multi-select field", U48) | deferred to T062 (U32 #34 PARTIAL: text vs the chips of U48's "Rules/Multi-select field" and 002-S3.39; T062 decides) |
| — | with search text | list | filtering | — | "Truck" → C1, C (code or description); "XL" → list hidden, "No options match “XL”." | match (baseline 002-S3.37) |
| — | open up, inner scroll | menu | direction, step | up where 316 doesn't fit below (R10) | 1455 × 945, field at 721: up, `max-h-400`, bottom 8 above the field, list 249 of 800 scrolls, search and "Done" fixed | match |
| — | open, 320 px | menu | across the editor | stays on screen (FR-010) | 320 × 640: `full`, 58–247 = the editor's content; down 8 below, up 8 above the 46 px field (wrapper `flex flex-col`); no horizontal scroll | match |
| — | open | menu | z-index | above the sticky header and footer | 40 | match |
| — | open | keyboard | arrows, Escape, Tab | ArrowDown/Up between options and the search field, Escape closes to the field, Tab past "Done" closes | the same | match (baseline) |
| 7058:60661 | field (test step) | menu | place | spans the field, below | `top-full left-0 mt-8 w-full`, `max-h-400`; the card scrolls to the rest (baseline) | match (the screen is T071/T072's) |

### 5.2 Screens (pass G), in unit order

| Unit | Screen | Status |
|---|---|---|
| U10 | S1, S2 | pending |
| U11, U12, U13, U15, U17 (`6699:47943`) | S3, S4 | pending |
| U14, U90 | S17, S4 | pending |
| U16 | S5 | pending |
| U17, U19 | L3, S6, S7 | pending |
| U18 | S3, S7 | pending |
| U20–U28 | S8 | pending |
| U29, U34, U35, U36, U43, U50, U51, U54–U58, U64 | S9 | pending |
| U30–U33, U48, U49, U53 (U09) | S10 | pending |
| U37–U42, U47, U52, U59–U62 | S11 | pending |
| U44, U45, U46 | S12 | pending |
| U65–U74 | S13 | pending |
| U63, U73, U75–U79 | S14 | pending |
| U80–U92, U94–U97 | S15 | pending |
| U93 | S16 | pending |
| U87, U88, U89 (dialogs) | S17 | pending |
| U98, U99, U100 | S18 | pending |
| (no frames) | S19, S20, S21, S22 | the patterns' tables of §5.1 stand; the states are checked in quickstart V9 |

U01–U09 are annotations and need no table.

## 6. Pass I: the screenshot matrix and the accessibility review

Filled by pass I (quickstart V10–V13): one row per route × state × width (1440 px; 320 px at
200 % zoom) with `horizontal scroll` and `hidden content` (SC-005), the keyboard walkthrough of
the five flows with the focus-ring check and one `h1` per route (SC-006), the AA review of every
text pair (SC-006), the five flows completed (SC-007), and the closing report.

## 7. Removal checklist (pass H, FR-015, SC-003)

Run after pass G; every line must come back empty or list only identifiers and history
(research R13).

```bash
# index.css: nothing of the old design
grep -n "split\|height<30rem\|indeterminate::before\|--shadow-chip\|--text-step\|font-size-medium-adaptive: var(--kern-font-size-21)" frontend/src/index.css
# KERN 2.8 hexes and the 248 px menu reproduced anywhere
grep -rn "#131525\|#2044aa\|#51577a\|#c0c3d5\|#f3f4f7\|#6e7597\|ACTION_MENU_WIDTH = 248" frontend/src
# five steps, the old product name
grep -rn "'Publish'\]\|Connection Portal" frontend/src frontend/index.html
# assets nobody imports
for f in frontend/src/assets/icons/* frontend/src/assets/illustrations/*; do grep -rq "$(basename "$f")" frontend/src --include='*.ts' --include='*.tsx' --include='*.css' || echo "unused: $f"; done
# old texts outside the frontend (identifiers excepted, research R2)
grep -rn "Connection Portal\|[Aa]pplicant" rules/src mcp/src mcp/plugin backend/app docs README.md CLAUDE.md | grep -v "applicants\.ts\|Applicant\b\|applicantsOf\|/applicants"
# superseded doc rules
grep -rn "KERN 2.8 vs Revamp\|map by name" docs CLAUDE.md
```

Also: `docs/FIGMA-WORKFLOW.md`'s list of where decisions are recorded puts this feature first and
marks 001's and 002's notes as history; `docs/ARCHITECTURE.md`'s frontend section describes the
new layouts, the page scroll, the four steps and the header; `docs/KERN-DESIGN-SYSTEM.md` gets a
section on the overlay; `CLAUDE.md`'s UI rules are updated; spec 002's `design-notes.md` §9 gets
a "superseded by spec 008" note and its `figma-audit/` stays as history with its node ids marked
stale.

## 8. History

- **2026-10-25, spec 002 §9 "map by name, keep KERN 2.8's values"** and `docs/FIGMA-WORKFLOW.md`'s
  "KERN 2.8 vs Revamp" rule: superseded by this feature (brief §2.2); the Revamp value is the
  target and a difference from it is a mismatch.
- **2026-10-27, the 248 px menus** (spec 002 §9): superseded; the design's 220 px holds the
  Revamp's 14 px `label/small` (research R10).
- **2026-10-12, the wizard's inner scroll and the `split:` variant**: superseded by the design's
  page scroll with sticky header and footer (research R4).
- **Spec 001's and spec 002's `design-notes.md`**: the copy and tokens they record are history;
  the decisions on behaviour they cite stay in force through the baseline.

### 8.1 The port's starting point (T001, 2026-11-08)

The untouched checkout, before any task of this feature changed a file. Node v20.19.2, npm 9.2.0;
`npm ci` at the root (the lock file is complete) and `uv sync` in `backend/`; `package-lock.json`
and `backend/uv.lock` unchanged (compared byte for byte). The root's `prepare` script
(`uv run pre-commit install || exit 0`) printed "git failed" because git is read-only here, and
exited 0 by design.

| Gate | Result |
|---|---|
| `npm run lint` (api-types, rules, frontend, mcp) | pass, no findings |
| `npm test`: `rules/` | 43 files, 2337 tests passed |
| `npm test`: `frontend/` | 23 files, 598 tests passed |
| `npm test`: `mcp/` | 15 files, 408 tests passed |
| `npm test`: `api-types/` | no test script |
| `npm run build` (typecheck of api-types, rules, mcp; frontend `tsc -b && vite build`; mcp build) | pass; Vite's warning that `index-*.js` (709.77 kB, 209.20 kB gzip) exceeds 500 kB |
| `uv run ruff check .` / `uv run ruff format --check .` | pass / 86 files already formatted |
| `uv run mypy app/ scripts/ tests/` | no issues in 77 source files |
| `uv run pytest` (`template_db_test` on 5435) | 1998 passed, 0 skipped (9 min 34 s) |

Node total: 3343 tests in 81 files. The closing report (T101, SC-004) compares against these
counts: a test removed or changed names an adopted item.

### 8.2 The copy items (T014, 2026-11-08)

The seven C items of research R2 after phase 2 (data-model §1 "Copy item"). Code identifiers keep
their names (FR-019, FR-020): the `@connection-portal/*` scope, the plugin and marketplace name
`connection-portal`, the local-draft key `connection-portal:local-draft:v1:`, `applicant.ts`,
`applicants.ts`, `applicantOf` and its siblings, the MCP tool `test_applicants` and the fields
`applicants` and `applicant_fields`. The frontend components that show these texts get the design's
remaining wording in their own screen tasks (for example "Message for citizens:", FR-039, T061).

| id | text (the design's) | sources | tests | done |
|---|---|---|---|---|
| C1 | "Konnekt" for "Connection Portal" ("This action is done in Konnekt.", "The resource isn't Konnekt's MCP server.", "This link doesn't belong to Konnekt.") | `backend/app/services/{auth,oauth}.py`, `backend/app/routers/{form_connections,approval_requests}.py`; `mcp/src/{auth,backend,links}.ts`, `mcp/src/tools/{registry,access,approvals,checks,drafts,guide,items,read}.ts`, `mcp/plugin/{instructions.md,README.md,.claude-plugin/plugin.json}`, five skills; `frontend/src/pages/{Authorize,Account}/constants.ts`; `README.md`, `docs/ARCHITECTURE.md`, `.claude-plugin/marketplace.json` | `backend/tests/api/test_{agent_principal,approval_requests}.py`; `mcp/src/{auth,backend,links,draftEdit}.test.ts`, `mcp/src/tools/registry.test.ts`, `mcp/test/server.test.ts` | T005, T007 |
| C2 | "citizen(s)" for "applicant(s)" in every text ("sample citizens", "Creating 3 sample citizens…") | `rules/src/checks/*` (findingMessages, theories, solver, oracle texts and comments), `rules/src/evaluation.ts`, `rules/src/personas/*`; `mcp/src/{applicants,findings,views}.ts`, `mcp/src/tools/{checks,read}.ts`, `mcp/plugin/instructions.md`, four skills; 35 files under `frontend/src` (constants and comments); `backend/app/models.py`, `backend/app/services/auth.py` (read level text); `docs/ARCHITECTURE.md`, `README.md`, `CLAUDE.md` | the rules package's tests of those modules; `mcp/src/{applicants,findings,views}.test.ts`, `mcp/test/server.test.ts`; `frontend` `utils.test.ts` files; `backend/tests/api/test_agent_principal.py` | T008 |
| C3 | statements `<document> · <field>[ – <part>] <condition>`; "must be met"; the proposed messages ("You need to be at least 21 years old.", "You need a class B or BE licence.", "You need to live in Stuttgart.") | `rules/src/{statements,messages,types}.ts`, `rules/src/personas/{constants,results}.ts`; `frontend/src/components/Connector/constants.ts`, `frontend/src/components/RuleRow/index.tsx` (fallback); `mcp/src/views.ts`, skill `conditions` | `rules/src/{statements,messages}.test.ts`, `rules/src/personas/{results,scenarios}.test.ts`; `mcp/src/views.test.ts`, `mcp/test/server.test.ts`; `RulesStep/utils.test.ts` | T009 |
| C4 | findings: "Rule 01 and Rule 02 contradict each other, so no citizen can meet the rules of Standard."; "… so right now …"; "2 rules contradict each other, and 1 rule is a duplicate" | `rules/src/checks/{findingMessages,types}.ts`; skill `checks-and-tests` | `rules/src/checks/{findingMessages,scenarios}.test.ts` (U44 `6750:40882`, U45 `6753:40144`, U46 `6753:41324`, `6758:43524`, U63/U77 pinned); `mcp/src/findings.test.ts`; `FormConnectionEditor/utils.test.ts` | T010 |
| C5 | "Username or password is wrong. Check both and try again."; "There’s already a {noun} called "{name}" in {branch}." (rules, groups, sub-groups); "There’s already a variant called "{name}"." (the editor's check); "Add it again in Documents, or edit or delete the rule."; "Enter a whole number greater than 0." | `backend/app/routers/auth.py`, `backend/app/services/rules.py`; `rules/src/constants.ts` (`nameTaken`, `variantNameTaken`); `frontend/src/pages/Login/constants.ts`, `RulesStep/constants.ts`, `RuleEditor/constants.ts` | `backend/tests/api/test_auth.py`, `backend/tests/unit/test_rules_validation.py`, `backend/tests/api/test_form_connection_rules.py`; `rules/src/{validation,edits}.test.ts`; `mcp/test/server.test.ts`, `mcp/src/draftEdit.test.ts` (V12.1: the duplicate-group and not-requested strings are identical on both sides) | T011 |
| C6 | "08.07.2007" (no age); "Result: doesn’t meet 2 rules" / "Result: meets the rules"; "B, BE since 02.05.2010"; "Valid until <date>"; "Tested as if shared today, 01.11.2026." | `rules/src/personas/{messages,results,values}.ts`; `frontend/src/pages/FormConnectionEditor/TestStep/utils.ts` | `rules/src/personas/{messages,results,values,scenarios}.test.ts` (V4 in `results.test.ts`); `TestStep/utils.test.ts` | T012 |
| C7 | "Enter a name for the connection." (connections and drafts; "Enter a name." stays for the persona and the rule name) | `backend/app/services/form_connections.py`; `frontend/src/pages/FormConnectionEditor/constants.ts`; `mcp/test/fakeBackend.ts` | `backend/tests/api/test_form_connections.py`, `test_form_connection_drafts.py`; `FormConnectionEditor/utils.test.ts` | T013 |

Counts after phase 2: rules 2345 tests (was 2337: T012 +7, T009/T010 +1), frontend 603 (was 598: T012
+5), mcp 408, pytest 1998; no test removed. Left for the screen tasks: the data card's rows and
labels (`DocumentValues.tsx`, `PersonaData.tsx`, "Date of birth" without "(Age)"; T071), the
`switchedToOr` / `switchedToAnd` toasts' "… to be true" (`RulesStep/constants.ts`; T057/T058),
the stale comments `TestStep/TestDayLine.tsx:6` and `ValueRow.tsx:15` (T071).
