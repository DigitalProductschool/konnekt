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

Added in phase 6 (T049, T051): frame colours without a KERN token and the glyphs of the documents step:

| value or file | where | note |
|---|---|---|
| `#1643c1` | "Add document" filled, pressed and hover (U20 7290:60519) | arbitrary `bg-[#1643c1]` in `DocumentsStep/SearchCard.tsx`: KERN 2.8's `action-state-indicator-shade-active` computes to a lighter blue in light mode; a `@theme` token would be cleaner (T090 or whoever next touches `index.css`) |
| `#eef3fe` | "Add document" outlined, pressed and hover (U21 7290:61927) | arbitrary `bg-[#eef3fe]` (KERN's tint-hover at 12 % gives `#e4ecfd`) |
| `#d0d5dd` | the list card's divider (U21 7294:61509) | arbitrary `bg-[#d0d5dd]` in `DocumentsList.tsx` (not `decorative-border-level-1`, `#d0d8e6`) |
| `icons/personal-id-action.svg`, `personal-id-muted.svg` | "Icon/Glyph" personal-id, tones blue (`#1D56F0`) and grey (`#4A5468`), 24 × 24, from U21 7290:61204 / 7290:62279 (`get_design_context` assets) | the documents step's shown list item and the search card's added rows |
| `icons/driving-licence-ink-24.svg`, `driving-licence-action.svg`, `driving-licence-muted.svg` | "Icon/Glyph" driving-licence 24 × 24 from U20 7290:60719 (ink), recoloured to `#1D56F0` / `#4A5468` | the old `driving-licence-ink.svg` is 16 px (the rule editor) |
| `icons/document-action.svg`, `document-muted.svg` | `document-ink.svg` recoloured | the generic document (a type without its own glyph) |
| `icons/add-link-action.svg` | "Icon/Glyph" add-link 24 × 24, action blue, from U19 `6699:45331` (T049) | the step-1 card header's tile (`IconTile tone="action"`) |
| `icons/driving-licence-danger.svg`, `personal-id-danger.svg`, `document-danger.svg` | "Icon/Glyph" tone danger (`#C4271C`), the flagged list item (U25 7298:62832) | the `-action` glyphs recoloured; the driving licence one equals the frame's "Doc icon" asset |

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
| `feedback-danger` `#c4271c` label on its pressed tint, the danger outline button ("Discard connection", "Remove 1 document") while pressed: KERN's 16 % tint `#f6dcdb` | 4.43:1 | a 15 % tint `#f6dfdd` (`.kern-btn--danger`'s `tint-active-opacity`, coordinator after T035, 2026-11-08) | 4.52:1 (measured in Chromium) | |

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
| `AppLayout` | — | c | the header pills (L2) | default, scrolled (white background) | T006: kept c (a page shell); built by T031. **T031 (2026-11-08): kept c.** The signed-in screens outside the wizard on white (`layout-background-default`; the old `neutral-025` is gone: U11 `6699:44240` draws a white page under light blue pills), `TopBar` + `UserMenu` above, the page in the design's 1120 px column centred (`max-w-1120`, was 1040; U11 "Page title" at x 160 of 1440), 32 px under the 64 px header area (`pt-32`, was 40: the title at y 96), the page's parts 16 px apart (`gap-16`, was 24: title 96–160, toolbar 112, list 176), `pb-48` unchanged (no frame decides it); the page scrolls, `scroll-padding-top: 80px` in `index.css` (the 64 px header area + 16). Props unchanged. The page fade is T037's **T037 (2026-11-08)**: the page fade: `main` is keyed by the route's path (`key={pathname}`) and carries `motion animate-page-in`, so it fades in over 150 ms on every path change while the pills stay; a query change (`?local=…`, the overview's state reset) keeps it |
| `AuthLayout` (+ `AuthIntro`, the art) | L1 | c | the login art and tagline row | 1440, ~1280, <1024, 320 | T006: kept c (layout and art, no KERN counterpart); built by T034. **T034 (2026-11-08): kept c**, own markup: the page `layout-background-hued` with Figma's gradient "Rectangle 1" (`6685:103961`, 249.8°, transparent 29.524 %, `rgb(164 209 225 / .15)` 61.246 %, `rgb(73 195 128 / .3)` 92.968 %) as a `bg-[linear-gradient(…)]` class; `<TopBar signedOut />` (T031); `main` starts under the 64 px header area (`-mt-64`, `min-h-dvh`) so the content centres in the whole window as the frames do; the widths of build note 14 are **container queries** on the page's width (`@container` on the root, so the scrollbar gutter never counts): **≥ 1234** the art (`login-art@2x.png`, 331 × 617, `alt=""`, already cropped: placed at x 0) and the tagline (60 apart, `items-center`) pinned left, the card slot 440 wide 153 from the right edge; between 1374 and 1234 the hero slides left by `clamp(-140px, 100% - 1221px, 0px)` (the tagline keeps 48 from the card; the full 140 reached at 1234); the hero's `-my-80` lets the art reach into the 80 px padding so a short window doesn't scroll for it; **990–1233** the art hidden (its wrapper: KERN's `img` rule beats Tailwind's `hidden` on the `img`), tagline 80 from the left, card 80 from the right, at least 48 apart (80 + 342 + 48 + 440 + 80 = 990); **< 990** (no frame, W2) the tagline above the card in one column, `max-w-440`, 16 px from the edges, 40 apart, the card full width at 320. The tagline stays the screens' `h1` (heading/display 40/48 500, `wrap-break-word` for 160 CSS px) with the sub-line `p` (body/large 18/24 muted), 16 apart, 342 wide from 990. Prop `cardAlign` removed (both frames centre the card); `CheckChip`, `CredentialCard`, `WalletScene` and `--shadow-chip` deleted |
| `BranchMark` | the rules frames | c | the marks' chips | changed, new, removed | T006: kept c, the marks have no KERN counterpart (the `kern-badge` types are feedback colours); built by T019. **T019 (2026-11-08): kept c.** Built as the V5 component "Rules/Variant status" (`6118:3681`) draws its three marked types on the screens (U57 `6522:32682`, U58 `6522:32977`, U47 `6185:8555`): a tag with radius 4 (`border-radius-small`), padding 2/8, `label/small` 14/24 600, 28 high; changed and new a white tag (`layout-background-default`) with the purple `#8a22b5` of §1.3 (`--color-variant-changed`, `--color-variant-new`), removed `feedback-default-background` `#eef1f6` with `feedback-default` `#4a5468`. The texts are the screens' (report cosmetic 8, "Figma decides wording"): "Changed here", **"Added here"** (was "New addition"), **"Removed here"** (was "Removed"); the component's description still says "New addition" / "Removed", the screens say otherwise (UNCERTAIN, see the report). The tag is never faded by `BranchMark` itself: U47 `6185:8570` fades only the row's content, the tag keeps its colour; it renders whatever mark it gets, so a changed rule inside a removed group keeps "Changed here" (F36, FR-040). Props unchanged (`mark`), no call site changed; `BRANCH_MARK_TINTS` and `INACTIVE_OPACITY` unchanged |
| `BranchName` (+ `FindingsSegment`) | P29 tabs (kit: "In Bearbeitung", no tab drawn); V5 "Rules/Variant tab · fixes" `6529:39174` | c | the tab with its ⓘ and problem icon | default, selected, hover, focus, with icon | T006: kept c, KERN 2.8.2 ships no tabs CSS (the React kit’s Tabs needs its own styles, not imported); built by T026. **T026 (2026-11-08): kept c, no `index.css` rule.** Kit P29 `2:47775` draws no tab (its status block says "In Bearbeitung"), so the V5 component "Rules/Variant tab · fixes" (`6529:39174`, "KERN EXTENSION") is the source: the tab `pt-4`, column gap 8; the label row (name, 4, the 20 px icon, 4, the actions) 24 high; the name `body/default` 16/24 400 in `layout-text-muted` #4a5468, selected `label/default` 16/24 600 in `layout-text-default` #0b1220; the 2 px "Indicator" under the row across the tab, #0b1220 while selected; the row's 1 px `decorative-border` line and 24 px gap stay the tab row's (T064). The indicator is an own `span`, so no scoped override is needed. New optional props, old ones unchanged: `tab` (`id`, `panelId`, `selected`, `onSelect`, `onKeyDown`: `BranchName` then renders the tab button itself, one control holding the name only, its accessible name "<variant> has findings" while it has findings, W13), `actions` (the ⋯ slot after the icon, F28), `noFindingsInfo` (the grey ⓘ without a description reads "No findings.", FR-041b; Standard passes none, FR-035c); `findings.kind` gains `error`. The icon by severity (build note 26, U06 6760:48852): grey ⓘ `layout-text-muted` (description or "No findings."), blue ⓘ `feedback-info` (§1.5 AA value) for duplicates / always met only, orange ⚠ `feedback-warning` #9a4a00 for a contradiction (U46 6758:43060, U71 7058:61618), red error diamond `kern-icon--danger` in `feedback-danger` for a spec 002 problem (U50 7375:101551, FR-041a). States the V5 frames don't draw (the kit draws no tab): hover and pressed darken an unselected name to #0b1220, weight kept, 150 ms (`.motion`); keyboard focus KERN's 4 px `action-focus-default` ring, offset 2, none after a click. `FindingsSegment` on the dark bubble (U46 6758:43524): divider `layout-text-inverse` white at 24 %, the kind icon white, its parts 8 apart through the bubble's own gap. Call sites unchanged (they keep the `children` form until T064, T073, T079 switch to `tab`) |
| `Checkbox` | V5 "Data/Check item" `6027:17252`, build note 2 (P33 base-checkbox is KERN's 32 px box) | b | `kern-form-check__checkbox` + the scoped override in `index.css` headed with this row: the flex row (4 px above and below, 8 px gap), the 20 px box, radius 4, 1 px `layout-border`, the 14/24 label; checked: action-blue fill with `check-white-small.svg` (= the design's icon-done-small) as a background image; mixed: a white 10 × 2 dash (radius 1) as an SVG background; KERN's `::before` tick switched off (`content: none`); hover, keyboard focus (3 px ring), disabled | default, hover, focus, checked, mixed, disabled | T006: kept b, `KernCheckbox` stays, the 20 px box, tick and mixed dash are the override; built by T016. **T016 (2026-11-08): kept b.** The V5 component "Data/Check item" (not the kit's 32 px base-checkbox) is the design's checkbox on every Flow screen (U26, U36; its description: "Built on Revamp tokens because the KERN Revamp base-checkbox is 32 px"); the override replaces the old `:indeterminate::before` rule. The box sits 2 px below the row's top padding (centred on the label's first 24 px line) so that a wrapping label keeps the box on its first line. New optional `disabled` prop |
| `ConfirmDialog` | P12, P33 dialog-actions | a + b | `kern-dialog` with 1–3 buttons, × and the scrim rule; `.kern-btn--danger` (filled on `--primary`, outline on `--secondary`) | open, long labels, scrollable, working | T006: kept a + c, on `kern-dialog` already; built by T035. **T035 (2026-11-08): a + b.** KERN's `kern-dialog` markup (`__header`, `__body`, `__footer`) with the overlay; utilities on the element: 480 wide (`w-480`, every screen's dialog: U14 `6699:44480`, U17 `7173:52682`, U25 `7299:52174`, U90 `6417:31599`; `wide` gives the kit's 600), centred with 16 px gutters on a narrow screen (`m-auto! min-w-0! max-w-[calc(100%-32px)]!` beat kern.css's bottom sheet below 768 px), radius `border-radius-large` 12 on every corner, the 1 px `layout-border` drawn inside (`border-0! ring-1 ring-inset`) and the footer's top line inside its 24 px (`pt-23!`), so the dialog is the drawn 480 × 256; the scrim `action-state-indicator-shade` #0b1220 at KERN's overlay 72 % (kern.css's own `::backdrop` opacity; only the colour changes, was black). Buttons (P33 dialog-actions): a grid of equal columns from a footer width of 384 px (2 buttons) / 528 px (3), a full-width stack below (container query on the footer), in the order cancel, secondary, confirm; 3 buttons stack in the 480 dialog (the kit's long-label variant), sit in a row in the 600 one; labels wrap inside the buttons. Cancel is secondary, tertiary with three buttons. **Danger buttons (option b, `index.css`)**: `.kern-btn--danger` re-derives `action-default(-contextual)`, the two shades (filled hover/pressed) and the two tints (outline hover/pressed) from the overlay's `feedback-danger` #c4271c on the button; `kern-btn--primary kern-btn--danger` is the filled danger button ("Delete connection"), `kern-btn--secondary kern-btn--danger` the danger outline button ("Discard connection", "Remove 1 document") — no separate `kern-btn--danger-outline` class. Also in `index.css`: the pressed tint of every secondary and tertiary button (KERN's hover rule hid it, as T028 fixed for primary) and the dialog fade (§4) **T053, 2026-11-08**: third use of the form without cancel ("No data selected in 1 document": `secondaryDanger` "Remove 1 document" + "Choose data", scrim on; ×, Escape and the scrim answer as "Choose data"). |
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
| `NotFound` | P07 | c | the alert and the way back | default | T006: kept a + c; built by T037. **T037 (2026-11-08): c** (the alert part dropped, UNCERTAIN): the design's empty state (§3 "Empty state", U11 `6699:44481`'s anatomy): `PageTitle size="x-large"` "Page not found" as the one heading (heading/x-large 500 32/40, `6699:44486`), then the light blue card (`bg-kern-layout-background-hued`, `rounded-kern-large` 12, padding 48 and gap 48 from `md`, padding 24 below; `6699:44488`) holding the baseline's sentence (body/default 400 16/24 muted, max 578 wide as `6699:44490`), 32 px above the one primary action "Go to connections" with the forward arrow (`kern-btn--primary`, 48 high, `6699:44508`), and the wallet star 200 × 193 at the right (`6699:44509`, `alt=""`, U02 build note 12), hidden below 768 px in a wrapper (kern.css's unlayered `img { display: block }` beats `hidden` on the `img` itself). No alert: a 404 has no reason or error ID to carry, and a title-only alert would repeat the h1 (U02 #5's slim alert is for errors and warnings; the error state of a page keeps it). No eyebrow "Error 404" (no frame draws it). `constants.ts`: `title`, `text` (baseline), `action` "Go to connections"; `eyebrow` removed. Used by the Approval page (unknown request) and `FormConnectionLoadState` (unknown or deleted connection, inside `WizardLayout`, where the column's 32 px gap puts the card 32 under the h1 instead of AppLayout's 16) |
| `PageTitle` | P31 | a | `kern-heading-display` for the 40/48 page h1 (kit “heading/display”, 2x-large adaptive), `kern-heading-x-large` (32/40) and `kern-heading-large` (24/32) where a frame uses those styles | default | T006: class corrected …; **T017 (2026-11-08): kept a**, with a new optional `size` prop (`display` default, `x-large`, `large`) choosing the KERN class; `py-0!` removes KERN's baseline paddings, because the frames draw the text boxes without them (U11 `6699:44244`: 40 + 24 = the 64 px block; U74 `7062:50965`: 32 + 24), and the hint follows right under the heading (gap 0, was 8), `body/default` 16/24 muted (`body/small` 14/24 under `large`); the heading drops `focus:outline-none` (CLAUDE.md: never `focus:`) for `outline-none` (it is no control); built by T017 (T043 uses `size="x-large"`) |
| `RuleRow` (+ name, predicate, sentence, message, problem note, value chip) | U30, U55 | c | the row, the statement chips, the symbol chips | default, hover, open menu, selected, removed, problem, linked | T006: kept c; built by T024. **T024 (2026-11-08): kept c**, own markup on Tailwind as V5 "Rules/Rule row" (`6083:3453`) draws it: the row padding 8 16 8 24, gap 16; the content column gap 4 (name row, sentence, message); the name `label/small` 14/24 600 in `action-default`; the sentence (C3) "<glyph 16> Personal ID · <data> <≥> <words> <values>": document `body/small` muted with the separator "·" (was "–", `RULE_ROW_COPY.documentSeparator`), data `label/default` 16/24 600, words `body/default` 16/24 muted, 8 apart and 4 between wrapped lines; the symbol chip (`Rules/Symbol` `6082:3409`: white, 1 px `decorative-border`, fully round, min 24 wide, 0 8 padding, 14/24 600) and the value chips (`Rules/Value chip` `6082:3447`: white, 1 px `decorative-border`, radius 4, 2 8, 14/24 600), cosmetic 22; "Message for citizens:" (C2, was "Error message citizens read:") in `label/small` muted, 8 px before the message in `body/small`; the actions column (mark, ⋯) gap 8, centred, and kept 32 × 32 when empty (U82 `6650:37780`: the read-only row reserves it). Problem and finding: the row 8 px in from the card in an outline (white, 1 px `feedback-danger` for a problem, the finding's colour otherwise, radius 8) with the note under it (24 in, 8 above the bottom; the problem note `Rules/Problem note` level=blocking `6110:3657`: 20 px info icon, 8 gap, 14/24 600 danger); the outline's colours change in 150 ms (`.motion`). Removed (U47 `6185:8570`): name, statement and message fade to 40 %, statement and message struck through, the mark and ⋯ not faded; the message line stays (F36, FR-040; the design hides it). Selected: a new optional `selectBox` slot before the row (U36 `6344:53557`; the row itself is drawn unchanged, no tint). Linked: no link icon (002-S4.31 "on every linked rule or none", spec 002's choice "none", CLAR 2026-11-07 #24 (b); U40's two icons are not built). Read-only (details): `showIdentifier` shows "rule-7" 8 px after the name in `body/small` muted with the hidden word "Identifier" (F35; the design draws no identifier). V6: no `overflow-*`, `transform` or `filter` in the row. No `index.css` rule. Props unchanged except the new optional `selectBox`; no call site changed |
| `TextField` | P14, P33 base-input-field, base-textarea; V5 "Form/Textarea" `6681:40216` | a | `kern-form-input` text, password, textarea | default, hover, focus, error, disabled, readonly | T006: kept a, on `KernInput` already; built by T015. **T015 (2026-11-08): kept a**, no `index.css` rule: `kern-form-input` / `kern-form-input__input` with the overlay give the kit's states as drawn (48 px, `layer-surface` fill, 2 px `form-input-border` line, radius 4; hover a 4 px line; focus KERN's 4 px `action-focus-default` ring outside, in `feedback-danger` on an error; disabled 40 %; readonly no fill and a 1 px `layout-border` line; error `feedback-danger-background` and a 2 px danger line). Utilities on the KERN markup: the placeholder in `layout-text-muted` (kern.css sets none; U19 draws `#4a5468`), and for `multiline` the V5 "Form/Textarea" (`h-120!`, KERN's own 8/16 padding, `resize-y`, spell check on by default, FR-032). The label row is U19's (`6699:45394`): label 16/24 600 without KERN's baseline padding, 4 px to an addon, 8 px to the field; "(optional)" in the label's own style (was KERN's muted "- Optional"; U19 `6699:45401`, report cosmetic 6); the red "*" (`requiredMark`, `aria-hidden`) as U19 `6699:45396` draws it. The danger bar (`kern-form-input--error`) wraps the field and its message only, not the label (U19 `6699:45398`; the kit's P26 error wraps the label too: the screen frame decides). New optional props, no call site changed: `multiline`, `trailing` (the password toggle's slot inside the field's right end, `pr-56!` on the input, FR-051 (29)), `requiredMark`, `hint` (KERN's `kern-hint`, linked), `invalid` (error state without a message, F16) |
| `Toast` (+ message) | U10 #20, U51, U17 #39, U61 #9 | c | the dark toast, bottom centre, optional action | neutral, success, with action, with error ID | T006: kept c, KERN has no toast; **T036, 2026-11-08: built c; kinds `neutral` / `success` (U61's drawn `danger` type built as neutral, UNCERTAIN); `noFooter` for pages without the footer bar** |
| `TopBar` | L2 | c | the two pills, the connection pill | signed out, signed in, in a connection, scrolled | T006: kept c; built by T031. **T031 (2026-11-08): kept c**, own markup as "Shell/Header · two pills" (`6688:41392`) and "Shell/Header · in a connection" (`6698:43392`) draw it: a `header` (sticky, `z-30`, `pt-16 px-16`, so the header area is 64 high with the pills 16 from the top and the sides), transparent, white (`layout-background-default`, 150 ms `.motion`) once `window.scrollY > 0` (U03 #39). Pills: 48 high, `rounded-kern-circle`, `--shadow-card` ("Elevation/Card"), the Konnekt pill `layout-background-hued` signed in / white signed out (new prop `signedOut`, U03 #33), padding 0 24 0 16, gap 8, the 24 px logo (`assets/illustrations/logo.svg`, new: Figma's export of the "logo" layer, `#1d56f0` squares) and "Konnekt" 16/24 600; the pills' gap 16 (two pills) or 8 (in a connection), the stretching spacer between them. **In a connection** (`title` set): "Pill · Where you are" `layout-background-hued`, padding 0 16, gap 8: "Your connections" (`label/small`, `action-default`, a link home, underlined on hover as U17 6a draws it), "/" (`body/small` muted, `aria-hidden`), the name (`label/small` ink, `truncate`, the h1 with `titleAsHeading`), the status pill 8 px after it (T019's `badge`); a `nav` "Breadcrumb". It grows out of the Konnekt pill on mount: `animate-pill-grow` (a `clip-path: inset()` reveal from its left edge, 240 ms ease-out; `width: auto` can't be transitioned in every browser) and its text `animate-pill-text` (opacity, the last 120 ms), both `.motion` (FR-050, U03 #40). `onLeave` (new, T048): a plain click on the product name or "Your connections" calls it instead of going home (modifier clicks still follow the link). `meta` (the description, W10) stays: muted 14/24, one line with "…", after the second pill (U80/U91's breadcrumb row is T078's to check). No DE/EN switch (F6). Below `md` (no frame) the second pill and the meta take rows of their own (header 120 high with the pill), the name truncating (W2, 320 px: no horizontal scroll). Props `title`, `titleAsHeading`, `badge`, `meta`, `logoTo`, `children` unchanged; `signedOut`, `onLeave` new; `AuthLayout` passes `signedOut` (one-line change) |
| `UserMenu` (+ `SignOutDialog`) | U13 `6699:44358`, U17 | c + a | the account pill and its menu; the log-out dialog on `ConfirmDialog` | closed, open, focus, the dialog | T006: kept c + a; built by T031. **T031 (2026-11-08): kept c + a.** The account pill (U11 `I6699:44242;6688:41398`, build note 14): 56 × 48, white with an `action-default` layer at 12 % (`::before`), pl 8 pr 4, T004's `person.svg` (24) and `expand-more-small.svg` (20) in `action-default` as masks (`.icon-person`, `.icon-expand-more-small` in `index.css`: the files fill with `currentColor`, which an `<img>` can't take); no initials, no name (FR-030; `initialsOf()` and its test removed); hover / pressed / open the kit's "states" layer on `::after` (8 % / 16 %, 150 ms `.motion`), keyboard focus KERN's 4 px ring offset 2; accessible name "Signed in as <username>". The menu "Shell/Account menu" (U13 `6699:44358`): **260** wide (not the ⋯ menus' 220: the frame draws 260), 1 px `decorative-border`, radius 8, padding 8, gap 4, `--shadow-menu`, `z-40`, placed with `placementFrom()` and own class sets (`ACCOUNT_MENU_PLACEMENTS`, `end` preferred: right edge on the pill's, 8 below); the name in `label/default` 16/24 600 with padding 8 (F17: no email), a divider, then the entries as U13's "Menu item · Log out" draws them: 40 high, padding 8, `body/small` 14/24 **regular**, ink, **no icons** (the old account-circle and logout icons are gone), radius 4; hover / pressed / keyboard focus as the ⋯ menus' entries (T021's `ACTION_MENU_STATES`, the select-option focus fill). "Your account" (a link, 007-S2) then a divider then "Log out" (UNCERTAIN: see the report). Behaviour as the baseline: Escape, Tab, a click outside close it; arrows, Home, End; the local-drafts warning (`SignOutDialog` on `ConfirmDialog`, unchanged; T035 restyles the dialog), focus back on the pill after "Cancel". New: after logging out the sign-in screen gets the router state `{ from, loggedOut: true }` (`LoggedOutLocationState`) for its toast (T040); new optional prop `onLogOut(logOut, trigger)` for the editor's "Save before you log out?" (T048) |
| `ValuesPicker` (+ option item) | U32 `6357:43090` (menu `6357:43382`), U48 `6191:42065` / `6191:42209`, `6191:42191` | c | the picker with search and "Done" | open, option hover/focus/selected/disabled | T006: kept c; built by T027. **T027 (2026-11-08): kept c**, KERN 2.8.2 has no menu or multi-select. The field is V5 "Rules/Multi-select field" (`6191:41863`, U48 `6191:42191`): 40 high, pl 16 pr 8, gap 8, radius 8, 1 px `decorative-border`, open 2 px `action-default` (1 px border + 1 px inset ring), the chosen values as "Rules/Value chip"s (codes only, 4 apart), unchanged. The menu as U32 "Menu" `6357:43382` draws it: 300 wide, 1 px `decorative-border`, radius 8, padding 8, parts 2 apart, `--shadow-menu`, 8 px below the field at its left edge; T015's `MenuSearchField` (`menu`) on top ("Search classes" / "Search options", from 10 options or for classes); the list (`min-h-0 overflow-y-auto`) under it; the baseline's footer ("Select at least one option." / "No options match “…”.", divider + 14/24 muted, padding 8 0 4 8) kept; then the **"Done"** row (U32 `6357:43428`, FR-039, CLAR Q27): KERN's secondary button right-aligned, which closes the menu, keeps the choice and gives the focus back to the field (Escape does the same). Class options are "Rules/Menu item · class" type=multi (`6358:43249`/`6358:43255`, W19): min 40 high, padding 8, gap 8, radius 4, the box in a 4 px-padded 28 px slot, the code `label/small` 14/24 600 min 32 wide, the description `body/small` 14/24 400 filling the rest (44 high, 64 when it wraps); other values are "Data/Check item" (`6027:17252`, U48): 28 px rows in a list padded 4. The box is KERN's `kern-form-check__checkbox` with T016's `Checkbox` override in `index.css` (no own box any more; `mt-0!` drops the override's 2 px top margin, the slot centres it): default, hover 2 px blue (also over the label), checked with the tick, checked hover the 3 px tint ring, keyboard focus the 3 px `#0b1220` ring on the box only. States the V5 frames don't draw: a class row's hover / pressed as the kit's "states" layers (P33 `2:1985`, 8 % / 16 % action blue, 150 ms, `.motion`), as the ⋯ menus' entries; a disabled option (new optional `ValueChoice.disabled`) at the kit's 40 % (KERN fades the box, the row its texts), not toggled, skipped by the arrow keys. **Placement** with T020's `placementFrom()` and class sets (`VALUES_MENU_PLACEMENTS`): the up/down choice uses the drawn 316 px height (or the menu's own, if shorter) so that it opens down where U32's menu fits ("Rules/Picker": "Menus always open downward"), else up; the frame takes the `max-h-*` step, the list scrolls inside while the search field, the footer and "Done" stay put; where neither side fits (320 px) it spans the rule editor's content (`inset-x-24`), and opening up its static wrapper becomes a flex column so that it starts at the field's top whatever the field's height (wrapped chips). The persona form field (`field`, test step) keeps the baseline: its menu spans the field below it, in the data card that scrolls it, at the 400 step (was a 280 px list). `z-40` (was `z-20`). No `overflow: hidden` on the frame (the search field's 4 px ring shows in the padding). No `index.css` rule. Props unchanged; `ValueChoice` gains optional `disabled`; no call site changed |
| `WizardLayout` | L3 | c | the sticky step header and footer, page scroll | create, edit, saving, loading, failed | T006: kept c; built by T033. **T033 (2026-11-08): kept c (+ b for the footer buttons).** The design's page L3 (U19 `6699:45321`): white page (`layout-background-default`; the old `neutral-025` is gone), `TopBar` + `UserMenu` (T031; `onLeave` and `onLogOut` passed through for T048), the step header, the content column and the footer, in a `min-h-dvh` column. **The page scrolls** (U01 #15, research R4): no inner scroll container, no `split:`, no `[@media(height<30rem)]`, no `cqh`. The **step header** ("Shell/Step header · compact", U03 #42–#43): a full-width white band (`z-15`) holding the 1120 column with `pt-32 pb-24` and the `head` (T032's step line, then `PageTitle size="large"`: heading/large 600 24/32, body/small 14/24 muted, no gap) 16 apart (the instances' 16, not U02 #1's 8; T032 carry); sticky at `top-64` under the pills where the window has room (`wizard-pinned:`, a new custom variant: ≥ 768 px wide and ≥ 640 px tall), else it scrolls away. The **footer** ("Shell/Footer" `6262:12701`, U01 #20): white, the 1 px `decorative-border` line as an inset shadow (so 16 + 40 + 16 = 72), the 1120 column, gap 8, wrapping into rows (005-ACC.4), sticky at the bottom in windows ≥ 480 px tall (`[@media(height>=30rem)]:sticky`), else at the page's end; option b: `.wizard-footer .kern-btn { min-height: 40px }` and the outlined button's label `padding-block: 7px` (its 1 px border is outside the label, Figma draws it inside the 40) in `index.css`. **How much the sticky parts cover** is measured (ResizeObserver + `resize`, `useLayoutEffect`) and published as `--wizard-sticky-top` / `--wizard-sticky-bottom` on `<html>`, removed on unmount: `index.css` uses them for `scroll-padding-top` / `-bottom` (focus and `scrollIntoView` stay clear of the header and footer, WCAG 2.4.11), `placementFrom()` for the menus' edges, `Toast` for "24 above the footer", the selection bar for its pin line, the documents list and the test panel for the visible height (the exceptions' slots, U01 #16–#19, F43). New props: `variant` (`steps` default, `details`: no step header, the 832 column, L4, for T078), `onLeave`, `onLogOut`; `footer={null}` renders no footer (the restore screen). `constants.ts` new (`STICKY_*_PROPERTY`, `STEP_HEADER_CLASSES`, `FOOTER_CLASSES`, `COLUMN_CLASSES`, `VISIBLE_HEIGHT_CLASSES`). The footer's actions (`EditorFooter`): Back and "Save and exit" (tertiary with the "save" glyph, cosmetic 17) or "Discard changes" (tertiary with the "undo" glyph, FR-045; an `onDiscard` slot, wired by T083) left, 8 apart; the step's action right with `ml-auto`; "Test rules" is T022's `ExplainedButton` ("Save the rule first" / "Finish grouping first", FR-034, W21) **T037 (2026-11-08)**: the page fade on `main` (step header, content, footer), keyed by the path (`key={pathname}`; the path is also in `useStickyEdges`' dependency key, so the observer follows a remounted step header and footer); a module-level `shownPath` (`usePageFade`) keeps a layout that takes over on the same path (loading → loaded, the restore screen → the editor) from fading in a second time. A change of step keeps the path: no fade, no scroll, the step's h1 takes the focus (unchanged, T033) |
| `WizardProgress` (+ step) | U02 #1–#4 | c | the step line, `role="progressbar"` | 1–4, clickable (edit), not clickable | T006: kept c, the kit’s P25 progress is a bar, not the step line; built by T032. **T032 (2026-11-08): kept c**, no `index.css` rule. Two forms of V5 "Shell/Step line" (`6630:40056`, KERN EXTENSION). **Creating** (U19 `6699:45327`, U63 `7112:48729`): one 24 px row, gap 16: "Step n of 4" (`body/small/regular` 14/24 `layout-text-muted`, `aria-hidden`), the four segments (4 high, 4 apart, radius 2 as `rounded-[2px]` because the overlay's small radius is 4; `action-default` up to and including the current step, `decorative-border-default` after) and "Next: <step>" / "Last step" in the same style; not clickable (no hover, no pointer). The segments are the `role="progressbar"` with `aria-label` "Step n of 4", `aria-valuemin` 1, `aria-valuemax` 4, `aria-valuenow` n and `aria-valuetext` the step's name (FR-025b). **Editing a published connection** (U98 `6731:39827`, F25): the four segments with the steps' names under them (`label/small` 14/24 600, 4 px gap; 32 high), equal widths (277 at 1120), each never narrower than its name's longest word (`min-w-min`, so "Connection" and "Documents" stay whole at 320 px); the current step `action-default` line and name with `aria-current="step"`; every other step a `<button>` ("Shell/Step link" `7139:50059`: `layout-text-muted` line, `layout-text-default` name; hover and pressed both blue, 150 ms `.motion`); keyboard focus KERN's 4 px ring, offset 2; in `<nav aria-label="Steps">` with an `<ol>` (a progress bar can't hold buttons). No numbers (`--text-step` is unused from here, §7/T090), no "Step n of 4" / "Next" in the edit form (as drawn). Past the last step (`current` ≥ 4, the details) it renders nothing (FR-025e). Props: `steps`, `current`, `onSelect` (now: the edit flow only); `reached` removed. The Draft badge is not part of the step line in any frame read (U19 `6699:45321`: no badge on step 1 before the first save; the badge belongs to the header's breadcrumb pill, P08) |
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
| **Field error** | U19 `6699:45379`, U49, build note 7 | directly under the field, the field's border and fill in the error state, linked with `aria-describedby`; the focus moves to the first field with a problem Documents step variant: **Field error** (the documents step's variant, T053): a document without data shows its message in its card header in place of the count ("Choose at least one data item, or remove this document.", body/small `feedback-danger`), linked to "All data items" with `aria-describedby`, which takes the focus; the list marks the item (danger tile, glyph, name, KERN's `kern-icon--danger`) and heads the list with "1 document needs data" in red, which describes the marked items. |
| **Toast** | U10 `7128:74220`, U51 `6197:11098`, U61 `6545:39421` | dark neutral toast, bottom centre, one at a time, announced through the live region; optional action ("Try again", "Undo", "Show"); with an error ID for a 5xx |
| **Dialog** | P12, P33 dialog-actions; U14 `6699:44480`, U17 `7173:52681`, U25 `7299:52174`, U90 `6417:31453` | the kit's widths, 1–3 buttons with long-label wrapping, ×; Escape, × and the scrim close a dialog that doesn't delete or publish (FR-052a); the focus stays inside and returns to the opener; a danger action is the danger outline button where the design draws one ("Discard connection") and the filled danger button where it draws that ("Delete connection") |
| **Menu** | U54 `6522:33105` (build note 10), U13 `6699:44358`, build note 3 | anchored to its trigger's wrapper with class sets (no inline styles, R10), 220 px, 40 px rows with icon, inner scroll with a max-height step (160–480 px) fitting the space to the header or footer minus 8 px, downward when it fits above the footer, otherwise upward; no clipping ancestor; Escape and a click outside close it; arrow keys; destructive entries last after a divider, "Copy link" before them |
| **Tooltip** | U37 `6151:33820`, U46 `6758:43524`, U81 `6809:46590`, U07 #16 | the design's tooltip (no arrow: the V5 "Rules/Tooltip" draws none, §1.3), on hover, focus and touch (FR-052g); blue ⓘ on blue backgrounds, muted grey elsewhere; no `title` attribute; a cut text's tooltip (T044, the overview's description, U13 `7366:55276`): on hover of a cut text only, on the keyboard focus of the row's name, on a tap, `aria-hidden` since the text is whole in the page |
| **Disabled button with explanation** | U29 #18, U30 #46, U89 #13 (W21) | `aria-disabled="true"`, focusable, ignoring activation; the explanation in the tooltip ("Save the rule first", "Finish grouping first", "Add a document first", the copy buttons' reason) |
| **Skeleton** | U06 #95, U74 `7062:50960`, U10 #17 | the kit's skeleton rows in the list's shape; the 56 px spinner with "Loading your connections…" for a page; the persona chip keeps its name with a ring while regenerating; the overview's list (T044): the toolbar's 48 px kept empty, the list card with its headers and three skeleton rows 80 high in the rows' columns (name 160 strong + description 220 light, status 72 strong, date 96 light, bars 10 high, radius 4), under a polite status with "Loading your connections…" (`FormConnectionRowSkeleton`) |
| **Empty state** | U11 `6699:44481` (wallet-star 200 × 193), U20 `7290:60367` (128 × 123), U29 `6504:43841` | the page title (heading/x-large) as the one heading; the light blue card (`layout-background-hued`, radius 12, padding 48, gap 48) with one sentence (body/default muted, at most 578 wide), 32 px above the one primary action (48 high, with the forward arrow when it leads away) and the picture at the right (decorative, `alt=""`); below 768 px padding 24 and no picture. A card heading (title/large 600 24/32, 8 above the sentence) where the page has its own h1, as the welcome page (T042). First built: `NotFound` (T037); built as the welcome page by T042: the card heading (`h2`, `text-kern-adaptive-large font-semibold`) and the four-step illustration (`ol`, `IconTile tone="plain" size={48}`, ink glyphs, lines `bg-kern-action-default opacity-32` sharing the free space; a row from a 640 px text column, stacked below, undrawn) |
| **Error state of a page** | W2, U02 `6637:36656` (build note 7), P07 | under the page's h1 (`PageTitle`, one per route), KERN's danger alert (`KernAlert variant="danger"`, `className="w-full"`) whose title is the one sentence of what failed; its body keeps the 5xx error ID (`ErrorNoticeText notice={…}` with the `notice` from `errorNoticeOf(error, '<fallback>')`), then one row (`flex flex-wrap items-center gap-x-24 gap-y-8`, `mt-10` after an error ID) with "Try again" (`kern-btn--secondary kern-btn--small`) where a retry makes sense and the way back, the link "Go to connections" (`kern-link`, `Link to={ROUTES.overview}`). A documented composition, not a new component; the reference implementation is `FormConnectionLoadState`'s `LoadFailed` (T017; "Go to connections" settled by T037); on the overview (T043) the alert sits right under the title block and before the local-drafts offer, with the footer bar kept and no toolbar |
| **Status pill** | U07 #1–#4 | dot + coloured label, tint fill, no border, radius 8; active green, draft blue (AA per §1.5), deactivated grey; used in rows, the header pill and the band |
| **Status band** | U07 #6–#8, U80, U89, U93 | 32 px icon column, h1 + sub-line 4 px apart, padding 32, picture bottom right (colour / grey), the ⋯ and "Activate again" at the right end; the draft band's gradient from `feedback-info-background` to `layout-background-hued` |
| **Info strip** | U07 #18, U19 `6699:45346` | blue ⓘ, info background, one sentence |
| **Card** | P10 (`surface`, `interactive`), U11 (the list card), U21 (the search card) | KERN's card; the kit's `surface` variant as the light blue card where drawn; the overview's list card (T043): white, 1 px `decorative-border`, radius 12, no shadow (the V5 card `6699:44252` draws none, §1.3), its column headers on `layout-background-hued` 8 24, label/small muted, `aria-hidden` |
| **Accordion** | P06, U80, U82 | the heading with "View links" / "Hide links" and the count; one open at a time on the details; heights animate (§4) |
| **Tabs** | P29, U38, U82 | the variant tabs with the ⓘ and the problem icon; pinned under the step head on the rules step |
| **Dates** | cosmetic 3, build note 8 | `dd.mm.yyyy` and `dd.mm.yyyy, hh:mm` wherever the frontend formats a date; the test day per C6; first built on the overview's rows (T044, `formatRowDate`, de-DE 2-digit); `formatEditedDate` ("5 Oct 2026") still serves Account, Approval and the details until their tasks switch |
| **Search in a list** | U11 `6699:44511`, `6699:44570`, `6692:42636`; FR-051 (27) (T043) | a pure filter in the page (`filterConnections`: name and description, `matchesSearch`'s `toLocaleLowerCase` folding and trim, the order kept; nothing sent); the count above the list as a polite status ("3 connections" → "1 of 3 connections"); KERN's input with the search icon (`kern-form-input__input pl-44! pr-48!`) and a visible `kern-label` 16 px before it (stacked over the field below 640 px; the frames draw no label); the × (`kern-btn--tertiary kern-btn--small`, "Clear search") once something is typed, emptying the field and keeping the focus in it; no results: the message with the typed text (label/default), the hint (body/small muted) and "Clear search" (a `kern-link` button) inside the list card under its headers, moving the focus to the field; T051's documents search card follows it; second build (T051): the documents step's search card uses `MenuSearchField variant="panel"` with no visible label and no × (the frames draw neither; Escape or closing the card empties it), a group with no rows is hidden, ↓ moves into the rows and Enter adds the first available match |
| **List inside a card** | U12 `6699:44915` (T044) | from 768 × 480 the overview's column is capped at the window (`max-h-[calc(100dvh-144px)]`), the card shrinks to fit and its rows scroll inside it under the column headers; below that the page scrolls as a whole; the rows' table layout from a 58rem card (`@container`), wrapped below, the headers hidden then |
| **Homepage memory** | FR-027, research R6, W11 (T039) | `homepageOf(list, remembered)` in `pages/FormConnectionList/utils.ts` (pure, tested): loaded and empty → welcome; loaded with anything → overview (a draft counts); loading → `remembered ? 'overview' : 'welcome'`; `hooks/useRememberedHomepage.ts` keeps one `localStorage` flag per account, `connection-portal:local-draft:v1:<username>:homepage:has-connections` (`storageKeyOf`, `keys.ts` unchanged; the `:` in the tail keeps the local drafts' store from listing it), `'true'` / `'false'`, written whenever the list's "has anything" is known and changes (load, last deletion), read once per account; blocked storage → `null`, nothing logged; the page shows `PageLoader` only while loading with `remembered === null`; a draft saved on the way to `/` (`draftSaved` in the router state) counts as `remembered === true`; the loading page is the first load's (a retry stays on the overview); a failed load shows the overview's error state whatever the memory says (T042) |
| **Page change** | FR-052c, U06 #94 (`7137:50569`) | a change of the route's path scrolls the window to the top at once (`App.tsx`, `behavior: 'instant'`: kern.css makes the root scroll smoothly) and the layout's main region fades in over 150 ms (§4); the header pills stay. A change of the query alone or of the editor's step is no page change |
| **Sticky parts of the wizard** | U01 #14–#19, U03 #42–#43, research R4 | the page scrolls; the header pills stay at the top (64 / 120 below md), the step header under them from 768 × 640 (`wizard-pinned:`), the footer at the bottom from 480 px tall; in smaller windows the step header and footer scroll with the page so that the step keeps room (WCAG 1.4.10, spec 005 FR-028). What they cover is `--wizard-sticky-top` / `--wizard-sticky-bottom`: what scrolls into view stops 16 px clear of them, a menu stays between them, the toast sits 24 above the footer, a pinned bar sticks at `top-(--wizard-sticky-top)`, a part that fills the window takes `100dvh` less both and the content's 40 px bottom padding |

## 4. Motion (FR-050, research R5)

| What | Duration | How |
|---|---|---|
| The connection pill growing out of the Konnekt pill | 240 ms ease-out, text fading in during the last 120 ms | a `clip-path` reveal on the pill (`animate-pill-grow`, T031: see the note below), opacity on its text (`animate-pill-text`) |
| Colour changes (hover, focus, selection) | 150 ms | `transition-colors duration-(--duration-colour)` |
| Page fade-in | 150 ms ease-out | `motion animate-page-in` on `AppLayout`'s and `WizardLayout`'s `main`, keyed by the path (T037: see the note below) |
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

**The pill growth (T031)**: a `clip-path: inset(0 100% 0 0 round 9999px)` → `inset(0 0 0 0 …)`
keyframe (`--animate-pill-grow`, 240 ms ease-out) on the second pill, and an opacity keyframe on its
content (`--animate-pill-text`, 120 ms after a 120 ms delay, `backwards`), both in `@theme` with
their `@keyframes`; not a `width` transition, because the pill's width is its content's (`auto`) and
only Chromium can transition to `auto` (`interpolate-size`). The resting style is the end state, so
`.motion` under reduced motion shows the pill at once. It runs whenever the pill mounts: on opening a
connection, and again when the route changes from one connection page to another (the details and
the edit flow render their own layout); the steps of one flow keep it mounted. The clip also clips
the pill's shadow for those 240 ms.

**The dialog fade (T035)**: `.kern-dialog.motion` and its `::backdrop` transition `opacity`,
`display` and `overlay` (the last two `allow-discrete`) over `--duration-colour`, from 0 in
`@starting-style` to the resting 1 / 0.72 (kern.css's backdrop opacity), and back to 0 on
`:not([open])`, so the closing dialog stays in the top layer until it has faded (Chromium; a
browser without `overlay` transitions just removes it). These selectors (0,2,0) outrank the shared
`.motion` rule, so the block repeats `transition: none` under `prefers-reduced-motion: reduce`
for itself; the shared rule is unchanged. Any other `kern-dialog` that adds the `motion` class
(`RestoreDialog`, `TokenCreatedDialog` when T048/T087 rebuild them) gets the same fade.

**The page change (T037, V5 decided: a CSS animation, not the View Transitions API)**: `--animate-page-in` (`page-in`, opacity 0 → 1, `--duration-page` 150 ms ease-out) in `@theme` with its `@keyframes`; `main` carries `motion animate-page-in` and `key={pathname}`, so the animation starts again on every change of the path (React remounts `main`; the pages under it are new on a new path anyway) and not on a change of the query (the editor's `?local=` flow key, the edit link's parameters) or of the editor's step (component state, the same path: the window keeps its offset and the step's h1 takes the focus, T033). `WizardLayout` remembers the path it shows (`usePageFade`), so a layout that takes over on the same path (the loaded page after its skeleton, the editor after the restore screen) appears without a second fade. `App.tsx` scrolls the window to the top in a layout effect when the path changes, before the new page paints, with `behavior: 'instant'` (kern.css sets `scroll-behavior: smooth` on `html`; "nothing slides", U06 #94); the scroll is behaviour and stays under reduced motion, the fade goes (`.motion`; F62: turned off, not "fades only" as U06 #94 says). The opacity animation makes `main` a stacking context for 150 ms: the pills (z-30) are outside it, the menus (z-40) inside, so no order changes. **V5**: every browser the team uses has same-document View Transitions now (Chrome; Firefox 158 in the Playwright server: `document.startViewTransition` is a function, checked 2026-11-08), so support no longer decides it; the CSS animation stays because (1) the app uses React Router's declarative `BrowserRouter`, and its `viewTransition` option needs a data router, (2) a view transition snapshots the whole document, the pills included, and holds rendering while it captures, (3) reduced motion would need a second rule on `::view-transition-*` outside the one `.motion` rule. Checked with Playwright: overview → details, overview → `/account` and back (Chrome and Firefox): `main` opacity 0 → 1 over 150 ms (`page-in:150`), `scrollY` 146 → 0 in the first frame; under `reducedMotion: 'reduce'` no animation, the scroll the same.

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
| U19 6699:45396 | default | "Connection name*" on step 1 | marker shown | yes | "Connection name" with `requiredMark` (T049) | match |
| U19 6699:45401 | default | optional marker | text, style | "Description (optional)", one text in label/default | "Description (optional)", 16/24 600 `#0b1220`; accessible name "Description (optional)" | match (report cosmetic 6) |
| U19 6699:45397 | default | ⓘ after the label | size | 20 (icon-info-small) | 20 × 20, `iconSize="small"` on both step-1 ⓘ (T049) | match |
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
| U19 6699:45403 | multiline | step 1 description as a textarea | element | "Form/Textarea" | `<textarea>` 726 × 120 (`multiline`, T049); the variant dialog stays T064's | match (step 1) |
| U10 #7 | password, trailing slot | toggle | place | inside the field, right end | slot `absolute inset-y-0 right-4`, a 40 px small button centred (4 from top and right), input `padding-right 56` (replica; 48 since T040: the toggle is 32 px) | match (the toggle itself: T040) |
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
| U19 `6699:45330` | default | tile (`action`, 40) | fill | `action-default` at **12 %** as rendered (`#e3eafd`; the code export drops the fill's opacity, T049) | `bg-kern-action-default/12` (coordinator, 2026-11-08, phase 6; was the solid `#1d56f0`) | match |
| U19 `6699:45330` | default | tile (`action`, 40) | radius, border | 8 (`border-radius-default`), none | 8px, 0 | match |
| U19 `6699:45331` | default | glyph | size, place | 24 × 24, 8 in, action blue | 24 × 24 at 8, 8; `icons/add-link-action.svg` (T049) on step 1 | match |
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

### TopBar — T031, 2026-11-08

Checked in Chromium (playwright-chrome) at 1455 × 900 (body 1440), 1455 × 400 (scrolled) and
320 × 640, on `/login`, `/` and the seeded draft `e67b4d7b…` (edit flow, rules step; details).
Fonts: `document.fonts.check('600 16px "Fira Sans"')` and `'400 14px "Fira Sans"'` true.

| frame | state | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|
| U11 6699:44240 | signed in | header area | box | 0,0 1440 × 64 ("Header area" 6699:44241) | 0,0 1440 × 64 | match |
| U11 6699:44242 | signed in | Konnekt pill | position, height | x 16, y 16, 48 high | 16, 16, 133 × 48 | match |
| U11 6699:44242 | signed in | Konnekt pill | background | `layout-background-hued` #f2f5fb | rgb(242, 245, 251) | match |
| U11 6699:44242 | signed in | Konnekt pill | shadow | Elevation/Card `0 1 2 #1315250d`, `0 6 20 #1315250d` | `rgba(19,21,37,0.05) 0 1px 2px 0, rgba(19,21,37,0.05) 0 6px 20px 0` | match |
| U11 6699:44242 | signed in | Konnekt pill | radius, padding, gap | 9999; 0 24 0 16; 8 | 9999px; 0 24px 0 16px; 8px | match |
| U11 6699:44242 | signed in | logo | size, asset | 24 × 24, layer "logo" (six #1d56f0 squares) | 24 × 24 at 32,28; `illustrations/logo.svg` (Figma's export) | match |
| U11 6699:44242 | signed in | "Konnekt" | font, colour | Geist SemiBold 16/24, #0b1220 | Fira Sans 600 16px/24px, rgb(11, 18, 32) | UNCERTAIN (Geist: no such font in the app; see the report) |
| U11 6699:44242 | signed in | Konnekt pill | target | goes to Your connections (U03 #30) | `<a href="/">` | match |
| U11 6699:44242 | signed in | DE/EN pill | — | drawn | not built | F6 |
| U11 6699:44242 | signed in | spacer | between the pills | stretches | `flex-1` | match |
| U10 6701:39367 | signed out | Konnekt pill | background, link | white (`layout-background-default`), no account pill (U03 #33) | oklch(1 0 0) = white; a `div` (no link, as the baseline), no account pill | match |
| U17 7173:52658 | in a connection | pills | gap | 8 | Konnekt 16–149, second pill from 157 | match |
| U17 I7173:52658;6698:43401 | in a connection | second pill | height, background, padding, gap, shadow, radius | 48; #f2f5fb; 0 16; 8; Elevation/Card; 9999 | 157,16 426 × 48; rgb(242,245,251); 0 16px; 8px; the card shadow; 9999px | match |
| U17 I7173:52658;6698:43402 | in a connection | "Your connections" | font, colour | label/small 14/24 600, `action-default` #1d56f0 | 14px 600 24px, rgb(29, 86, 240) | match |
| U17 I7173:52658;6698:43403 | in a connection | "/" | font, colour | body/small 14/24 400, `layout-text-muted` #4a5468 | 14px 400 24px, rgb(74, 84, 104) | match |
| U17 I7173:52658;6698:43404 | in a connection | name | font, colour | label/small 14/24 600, #0b1220 | 14px 600 24px, rgb(11, 18, 32) | match |
| U17 I7173:52658;6698:43405 | in a connection | status pill | place | 8 after the name (T019 carry) | name ends 492, pill at 500 | match |
| U17 6890:46052 | hover | "Your connections" | underline | underlined on hover (U17 #24) | `hover:underline` | match |
| U03 #38 | 320 × 640 | name | truncates with "…" | — | `text-overflow: ellipsis`, cut (scrollWidth > clientWidth); second pill on its own row 16,72 273 × 48, header 120 high; no horizontal scroll | match (W2: the row below `md` has no frame) |
| U03 #40 | in a connection | second pill | growth | 240 ms ease-out, text fades in during the last 120 ms | `pill-grow 0.24s ease-out`: clip at 0 ms `inset(0 100% …)`, 70 ms 49 %, 122 ms 26 %, 207 ms 2 %, 279 ms none; text `pill-text 0.12s 0.12s backwards`: opacity 0 until 120 ms, 0.18 at 122, 0.56 at 155, 0.94 at 207, 1 | match (a clip, not a width transition: design-notes §4 note below) |
| U03 #40 | reduced motion | second pill | growth | just appears | `animation-name: none`, clip none, text opacity 1 | match |
| U03 #39 | scrolled | header area | background | white when content scrolls under it | top: transparent; scrollY 100: oklch(1 0 0) white, `top` stays 0; back at 0: transparent; transition 0.15s (`.motion`) | match |
| U03 #39 | reduced motion | header area | transition | off | `transition-property: none` | match |
| — | in a flow | product name, "Your connections" | `onLeave` (FR-026) | — | prop in `TopBar/types.ts`; without it both go home (no caller passes it yet; T033/T048 wire it) | match |
| — | focus (keyboard) | Konnekt pill, "Your connections" | ring | KERN's 4 px `action-focus-default`, offset 2 | `focus-visible:outline-4 outline-offset-2` #0b1220 | match |
| — | details | name as h1 | one h1 (`titleAsHeading`) | — | `h1` "Führerscheinantrag Stuttgart", the only one | match |
| — | details with a description | meta | one line, muted, "…" | — (W10, U80/U91: T078) | not exercised: no seeded connection has a description | open for T078 |

### UserMenu (+ SignOutDialog) — T031, 2026-11-08

Same session; signed in as `designer`.

| frame | state | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|
| U11 I6699:44242;6688:41398 | closed | account pill | box | 56 × 48 at the right edge, 16 from the top (1368–1424) | 1368,16 56 × 48 | match |
| U11 I6699:44242;6688:41398 | closed | account pill | background | white + `action-default` layer at 12 % | white; `::before` #1d56f0 / 0.12 | match |
| U11 I6699:44242;6688:41398 | closed | account pill | padding, radius | 0 4 0 8; 9999 | 0 4px 0 8px; 9999px | match |
| U11 I6699:44242;7351:52637 | closed | person icon | size, colour, asset | 24, `action-default`, Material "person" outlined | 24 × 24 at 1376,28; rgb(29, 86, 240); `icons/person.svg` (T004) as a mask | match |
| U11 I6699:44242;7351:52639 | closed | chevron | size, colour, asset | 20, `action-default`, icon-expand_more-small | 20 × 20 at 1400,30; rgb(29, 86, 240); `icons/expand-more-small.svg` (T004) as a mask | match |
| U11 6699:44242 | closed | account pill | content | no initials, no name (build note 14, FR-030) | the two glyphs; "Signed in as designer" `sr-only` | match |
| P33 2:1985 | hover | account pill | layer | `action-state-indicator-default` 8 % (not drawn for the pill: the kit's states) | `::after` #1d56f0 / 0.08, 0.15s | match |
| P33 2:1985 | open / pressed | account pill | layer | 16 % | `::after` #1d56f0 / 0.16 (`aria-expanded`) | match |
| — | focus (keyboard) | account pill | ring | KERN's 4 px `action-focus-default`, offset 2 | `rgb(11, 18, 32) solid 4px`, offset 2px, after Escape | match |
| U13 6699:44358 | open | menu | box | 1164,72 260 × 131 (with "Log out" only) | 1164,72 260 × 156 (two entries + divider) | match (the extra entry, F17) |
| U13 6699:44358 | open | menu | border, radius, padding, gap | 1 #e1e6f0; 8; 8; 4 | 1px rgb(225,230,240); 8px; 8px; 4px | match |
| U13 6699:44358 | open | menu | shadow, background | `0 10 28 rgba(19,21,37,0.16)`; white | `rgba(19,21,37,0.16) 0 10px 28px 0`; oklch(1 0 0) | match |
| U13 I6699:44358;6401:69441 | open | name | font, colour, padding | label/default 16/24 600, #0b1220; block padding 8 | Fira Sans 600 16px/24px, rgb(11,18,32); 8px (1173,81 242 × 40) | match |
| U13 I6699:44358;6401:69442 | open | email | — | "lena.weber@example.org" | not built | F17 |
| U13 I6699:44358;6401:69443 | open | divider | height, colour | 1, #e1e6f0 | 1px, rgb(225, 230, 240) at y 125 | match |
| U13 I6699:44358;6401:69444 | open | entry | height, padding, radius | 40; 8; 4 | 242 × 40; 8px; 4px | match |
| U13 I6699:44358;6401:69444;6083:3533 | open | entry label | font, colour | body/small Regular 14/24, #0b1220 | Fira Sans 400 14px/24px, rgb(11, 18, 32) | match |
| — | open | entries | "Your account", "Log out" (F17, FR-030) | "Log out" only | "Your account", divider, "Log out" | F17 (the divider: UNCERTAIN, see the report) |
| P33 2:2406 | focus (keyboard) | entry | fill, text | `action-focus-default` #0b1220, white text | rgb(11, 18, 32), rgb(255, 255, 255) (after the 150 ms transition) | match |
| P33 2:1985 | hover / pressed | entry | layer | 8 % / 16 % | `ACTION_MENU_STATES` (T021) | match |
| — | open | menu | keyboard | arrows, Home, End, Escape, Tab | ArrowDown → "Log out"; Escape closes, focus on the pill (`:focus-visible`) | match |
| — | open | menu | z-index | above the sticky header (§3 Menu) | 40 | match |
| — | log out, no local drafts | sign-in screen | route and state | `/login`, "You're logged out." (FR-051 (30)) | `/login`, `history.state.usr` `{ from: {…/e67b4d7b…}, loggedOut: true }` | match (the toast itself: T040 / T036) |
| U17 6408:72919 | log out, local drafts | the sign-out dialog | 005-S7 | — (the baseline's dialog, F20's "Cancel") | "Log out and discard unsaved work?" with the draft's name, "Cancel", "Log out"; "Cancel" → focus on the pill; "Log out" → the local draft removed, `/login` with `loggedOut` | match (look: T035) |
| — | in a flow | "Log out" | `onLogOut` (T048) | — | prop in `UserMenu/types.ts`; not passed yet | match |

### AppLayout — T031, 2026-11-08

| frame | state | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|
| U11 6699:44240 | default | page | background | white | oklch(1 0 0) | match |
| U11 6699:44244 | default | column | x, width, top | 160, 1120, 96 (64 + 32) | 160, 1120, 96 | match |
| U11 6699:44247 | default | page parts | gap | 16 (title 96–160, toolbar 112, list 176) | 16px | match |
| U03 #29 | scrolled | header | stays at the top | fixed | `sticky top-0`, top 0 at scrollY 100 | match |
| — | default | `html` | `scroll-padding-top` | the header area (64) + 16 | 80px | match |

### WizardProgress (+ WizardStep) — T032, 2026-11-08

Checked in playwright-firefox. Firefox on this machine draws overlay scrollbars, so a 1440 px
viewport gives `body` 1440 (no gutter; Chromium's 1455 isn't needed): the column starts at 160
as in the frames. Fonts: `document.fonts.check('400 14px "Fira Sans"')` true. The create form was
checked live on the seeded draft `e67b4d7b…` (steps 3, 4 and 2 through "Test rules" and "Back";
nothing saved) and on a new connection (step 1). No published connection exists in the dev
database, so the edit form was mounted with the dev server's modules (React's own
`createRoot`, the real `WizardProgress` with `onSelect`) in the live wizard's head, the original
line hidden, at `current` 0 (E1) and 1 (E1b).

| frame | state | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|
| U19 6699:45327 | step 1 | line | size, gap | 1120 × 24, 16 | 1120 × 24, 16px | match |
| U19 6699:45327 | step 1 | "Step 1 of 4" | x, width | 0, 69 | 0, 68.3 | match (text metrics) |
| U19 6699:45327 | step 1 | "Step 1 of 4" | font, colour | `body/small/regular` 14/24, `layout-text-muted` #4a5468 | "Fira Sans" 400 14px/24px, rgb(74, 84, 104) | match |
| U19 6699:45327 | step 1 | segments | x, width, y | 85, 911, 10 (centred in the 24 px row) | 84.3, 912.2, 10 | match |
| U19 6699:45327 | step 1 | segment | size, gap, radius | 224.75 × 4, 4, 2 | 225 × 4, 4px, 2px | match |
| U19 6699:45327 | step 1 | segment colours | 1 blue, 3 to do | `action-default` #1d56f0; `decorative-border` #e1e6f0 | rgb(29, 86, 240); rgb(225, 230, 240) × 3 | match |
| U19 6699:45327 | step 1 | "Next: Documents" | x, width, font, colour | 1012, 108, 14/24 400 #4a5468 | 1012.4, 107.6, 400 14px/24px, rgb(74, 84, 104) | match |
| U17 6701:39488 | step 3 | line | text, segments | "Step 3 of 4", 3 blue, "Next: Test" | "Step 3 of 4", 3 × rgb(29, 86, 240) + 1 × rgb(225, 230, 240), "Next: Test" | match |
| U63 7112:48729 | step 4 | line | text, segments | "Step 4 of 4", 4 blue, "Last step" | "Step 4 of 4", 4 × rgb(29, 86, 240), "Last step" | match |
| — | step 2 | line | text, segments | "Step 2 of 4", 2 blue, "Next: Rules" | the same | match |
| U19 6699:45327 | creating | line | clickable | no hover, no pointer, no links | no button in the line, cursor auto | match (F25) |
| U19 6699:45327 | any step | progress bar | role, name, values (FR-025b) | `progressbar`, "Step n of 4", min 1, max 4, now n | `progressbar` "Step 2 of 4", 1, 4, 2, `aria-valuetext` "Documents"; the visible "Step 2 of 4" `aria-hidden` | match (the step's name: task text) |
| U98 6731:39827 | edit, E1 | step line | anatomy | four labelled segments, no "Step n of 4", no "Next" | the same, in `nav "Steps"` > `ol` | match |
| U98 6731:39827 | edit, E1 | step | width, gap, height | 277 (1120 − 3 × 4) / 4, 4, 32 (4 + 4 + 24) | 277, 4px, 32 | match |
| U98 6731:39827 | edit, E1 | current "Connection" | line, name | `action-default` 4 high radius 2; `label/small` 14/24 600 #1d56f0 | rgb(29, 86, 240), 4, 2px; 600 14px/24px rgb(29, 86, 240); `aria-current="step"`, not a button | match |
| U98 6731:39827 | edit, E1 | "Documents", "Rules", "Test" | line, name | `layout-text-muted` #4a5468; 14/24 600 `layout-text-default` #0b1220 | rgb(74, 84, 104); 600 14px/24px rgb(11, 18, 32); `<button>`, cursor pointer | match (F25) |
| U98 7139:50059 | hover | step link | line, name | both `action-default`, 150 ms | rgb(29, 86, 240) both, `transition-colors` 0.15s, `.motion` | match |
| — | pressed | step link | line, name | not drawn | rgb(29, 86, 240) both (as hover) | match (§3: "Shell/Step link" draws default and hover only) |
| — | keyboard focus | step link | ring | KERN focus: 4 px `action-focus-default`, offset 2 | 4px solid rgb(11, 18, 32), offset 2px, radius 4 | match |
| — | focus after a click | step link | ring | none (CLAUDE.md: keyboard only) | none | match |
| — | click, Enter | step link | `onSelect` | leads to the step | `onSelect(1)` on click and on Enter | match |
| U98 6731:39821 (E1b) | edit, current 1 | segments | current in blue, others links | Documents blue, Connection, Rules, Test links | the same | match |
| — | 320 px, creating | line | fit | not drawn | 288 wide: "Step 2 of 4" 68, segments 117, "Next: Rules" 71; no horizontal scroll | match (WCAG 1.4.10) |
| — | 320 px, editing | steps | fit | not drawn | 72, 72, 66, 66 wide, 32 high, names whole; no horizontal scroll | match (WCAG 1.4.10) |
| U63 7112:47827 | details | step line | shown | none (FR-025e) | `WizardProgress` renders nothing past the last step | match |

### Toast (+ ToastMessage) — T036, 2026-11-08

Figma "Rules/Toast" (component set `6369:25433`: type=neutral `6113:3743`, type=success
`6369:25428`, type=danger `6718:40958`). Positions measured on 1440-wide frames (U10 900 tall,
no footer; U51 1319 tall and U17 900 tall, with the footer).

| frame | state | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|
| U10 `7128:74220` | neutral, no action, no footer | toast | box | x 647, y 820, 146 × 56 (frame 900) | x 647, y 820, 146 × 56 (`noFooter`, bottom 24) | match |
| U10 `7128:74220` | neutral | toast | fill | `layout/text/default-contextual` `#0b1220` | `rgb(11 18 32)` | match |
| U10 `7128:74220` | neutral | toast | radius, padding, gap | 8 (`border-radius-default`), 16, 24 | 8, 16, 24 | match |
| U51 `6197:11098` | every kind | toast | shadow | "Elevation/Menu" `#13152529` (0, 10) r 28 | `rgb(19 21 37 / 0.16) 0 10px 28px 0` (`shadow-toast`) | match |
| U10 `7128:74220` | neutral | message | type | `body/small/regular` 14/24, 400, Fira Sans, white (`action/on-default`) | 400 14px/24px "Fira Sans", white | match |
| U51 `6197:11098` | with action, footer | toast | box | x 473, y 1167, 495 × 56; 96 above the frame's bottom (72 footer + 24, build note U05 #25) | x 472, 496 × 56, bottom gap 96 | match (±1 text width, font rendering) |
| U51 `6197:11098` | with action | message | width | 381 | 382 | match (±1) |
| U51 `6197:11098` | with action | "Try again" | type | `label/small` 14/24, 600, white, underline 8 %, position from-font | 600 14px/24px, white, `underline 8% from-font` | match |
| U51 `6197:11098` | with action | message → action | gap | 24 | 24 | match |
| U51 `6197:11098` | with action | toast | stays | build note "6 s" (component description) | stays until used or dismissed (research R8, data-model §2): still shown after 7 s | R8 |
| U51 `6197:11098` | with error ID | error ID line | content | not drawn | "Error ID: <id>" on its own line under the message, `ErrorNoticeText`'s wording and `select-all`; the toast grows to 80 | FR-033, F22 |
| U17 `6699:48002` | success | toast | box | x 564, y 748, 313 × 56 (frame 900, footer) | x 563, y 748, 313 × 56 | match (centring rounds 563.5) |
| U17 `6699:48002` | success | toast | fill | `feedback/success` `#1d7a2e` | `rgb(29 122 46)` | match |
| U17 `6699:48002` | success | check | icon | 20 × 20, white filled check (asset), 8 before the text, centred (y 2) | the asset, 20 × 20, 8 gap, y +2 | match |
| U17 `6699:48002` | success | message | width | 253 | 253 | match |
| U61 `6523:37991` | deleted, with Undo | toast | kind | type=danger: `feedback/danger` `#c4271c`, white "delete" icon | neutral ink, no icon (`kind` is `neutral` / `success`: T036, data-model §2; the component description lists "deleted, removed" under neutral) | UNCERTAIN (T036 report) |
| U61 `6523:37991` | deleted, with Undo | "Undo" | type, gap | 600 14/24 white underline, 24 after the message | the same (harness, "School transport deleted." + "Undo": 252 × 56) | match |
| — | no action | toast | timing | 6 s (component description; U06 #59's annotation says 5 s) | 6 s, paused while the pointer is on it; dismissed at 6.35 s in the harness | match |
| — | replaced by a newer one | region | one at a time | one at a time (R8) | the region empties and shows the newer toast 100 ms later (`LIVE_REGION_DELAY_MS`), the same text again included | match |
| — | every toast | region | announcement (001-S7.7) | announced | `role="status"`, `aria-live="polite"`, `aria-atomic="true"`, always in the page; empty at t+0, filled at t+150 ms | match |
| — | with action | focus | FR-033 | not moved into the toast | not moved | match |
| — | with action, keyboard | "Try again" / "Undo" | focus ring | KERN's focus on dark: not drawn | 2 px white outline, offset 2, `focus-visible` only | match |
| — | dismissed | toast | Escape | not drawn | Escape with the focus in the toast dismisses it (`onDismiss`) and returns the focus to the element it came from | UNCERTAIN (T036 report) |
| — | 320 px | toast | wrapping | not drawn | 16 px gutters, 273 wide, the message wraps, the action stays at the right; with the error ID the ID breaks anywhere | match (FR-010) |
| — | reduced motion | toast | motion | none drawn | none (no transition, so no `.motion`) | match |

### Pattern: Toast — T036, 2026-11-08

The pattern's first table; it stands for every later toast (T040 "You're logged out.", T044
"Draft saved. …", T048/T060 the failed save, T052 the document undo, T058 the rule toasts, T068
the variant undo, T072 "Results updated. …", T082 the action toasts, the details' "Changes saved.").

| frame | state | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|
| U10 `7128:74220`, U51 `6197:11098` | neutral | toast | anatomy | ink `#0b1220`, radius 8, padding 16, gap 24, 14/24 white, "Elevation/Menu" | the same (`TOAST_KIND_FILL.neutral`, `shadow-toast`) | match |
| U17 `6699:48002` | success | toast | anatomy | green `#1d7a2e`, the white filled check 20 px, 8 before the text | the same (`kind: 'success'`) | match |
| U51, U61 | with action | action | anatomy | underlined `label/small`, 24 after the message | a `<button>`, the same look | match |
| U05 #25, U51, U17 | with footer | toast | position | centred, 24 above the 72 px footer | `bottom-96` (default) | match |
| U10 | no footer | toast | position | centred, 24 above the window's edge | `bottom-24` (`noFooter`) | match |
| — | every toast | announcement | live region | announced (001-S7.7, FR-051 (42)) | the status region stays; each toast appears `LIVE_REGION_DELAY_MS` after the region empties | match |
| — | with action | lifetime | R8 | until used or dismissed | until the page dismisses it (after the action, a newer toast, a change of step) or Escape on it | R8 |
| — | 5xx | error ID | FR-033 | not drawn | "Error ID: <id>" under the message (`errorId`) | FR-033 |
| U51 `6197:11098` | failed save (T048) | toast | action, focus | "Try again" | neutral, "Try again" and the error ID; replaces the step's toast; "Try again" moves the focus to the control that shows the retry ("Save and exit"), since the toast goes with its button | FR-033 |

### WizardLayout (L3) — T033, 2026-11-08

Checked in Chromium (playwright-chrome) at 1455 × 900 (body 1440), 1455 × 640, 1455 × 420,
800 × 1024 and 320 × 640, on the seeded drafts `e67b4d7b…` (rules step: groups, 4 rules) and
`12292ff4…` (all four steps, select mode, the test step, its draft details), `/form-connections/new`,
and the loading / failed-load states (the connection's GET held, then answered 500). Tab order in
Firefox (playwright-firefox) at 1440 × 900 too. Fonts: `document.fonts.check` true for
`600 24px`, `400 14px`, `600 16px "Fira Sans"`. Nothing was saved: the one "Save and exit" ran
against a held request that was then aborted.

| frame | state | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|
| U19 6699:45321 | create, step 1 | page | background | white | `oklch(1 0 0)` | match |
| U19 6699:45325 | create, step 1 | step line | x, y, width | 160, 96 (64 + 32), 1120 | 160, 96, 1120 × 24 | match |
| U19 6699:45327 | create | step header | step line → title | 16 (instance; U02 #1 says 8) | line 96–120, h1 at 136 | match (T032 carry: the instances' 16) |
| U19 I6699:45327;6689:41447 | create | title | font, colour, box | heading/large 600 24/32, #0b1220, no baseline padding | Fira Sans 600 24px/32px, rgb(11, 18, 32), padding 0, 136–168 | match |
| U19 I6699:45327;6689:41448 | create | description | font, colour, gap | body/small 400 14/24, #4a5468, no gap | 400 14px/24px, rgb(74, 84, 104), 168–192 | match |
| U19 6689:41438 | create | step header | fill | white ("so content scrolls under it") | a full-width white band 64–216 (`pt-32` + 96 + `pb-24`) | match |
| U19 6699:45328 | create, step 1 | content | top | 24 below the step header (card at 216) | 216 | match |
| U03 #43 | scrolled 400 | step header | sticky | stays under the header pills | top 64 at scrollY 400, the rules scroll under it | match |
| U03 #39 | scrolled | header area | background | white | `oklch(1 0 0)` (T031) | match |
| U01 #15 | rules | page | scrolls | only the page scrolls | `documentElement.scrollHeight` 1387, no element scrolls | match |
| U19 6699:45349 | create | footer | box | 0, 828, 1440 × 72 | 0, 828, 1440 × 72 | match |
| U19 6699:45349 | create | footer | fill, line | white, 1 #e1e6f0 on top (inside) | white, `inset 0 1px 0 rgb(225, 230, 240)` | match |
| U19 6699:45349 | create | footer | padding, column, gap | 16 above and below, 160–1280, 8 | 16 / 16, `max-w-1120`, 8 | match |
| U19 6699:45349 | step 1 | "Save and exit" | place, size | 160, tertiary 40 high | 160, 844, 169 × 40 | match |
| U17 6408:72735 | rules | Back, "Save and exit" | place, gap | Back at 160, 8 between | Back 160 107 × 40, "Save and exit" 275 169 × 40 | match |
| U17 I6408:72735;6768:44581 | rules | "Save and exit" | icon | Material "save", 24, action | `icons/save.svg` as a mask on `kern-icon`, 24 × 24, rgb(29, 86, 240), 16 from the left | match |
| U17 I6408:72735;6768:44581 | rules | "Save and exit" | label | label/default 600 16/24, action, no underline | 600 16px/24px, rgb(29, 86, 240), `none`, padding 8 | match |
| U17 I6408:72735;6768:44584 | rules | "Test rules →" | place, size | right edge 1280, 40 high | 1138, 142 × 40 | match |
| U01 #20 | every step | footer buttons | height | 40 (min-height 40, not KERN's 48) | 40 (`.wizard-footer .kern-btn`) | match |
| U98 I6731:39850;6789:45789 | outlined | secondary button | height | 40 with its 1 px border | 40 (label `padding-block` 7) | match |
| U98 6731:39850 | edit | "Discard changes" | anatomy, place | tertiary, "undo" glyph, after Back | `onDiscard` slot: tertiary, `icons/undo.svg`, after Back; the editor doesn't pass it yet | open for T083 (the dialog) / T084 |
| U01 #21–#22 | a rule open | "Test rules" | disabled, reason | disabled, "Save the rule first" | `aria-disabled="true"`, focusable, click ignored, "Save the rule first" above it on hover (1000–1280) | match (FR-034, W21) |
| U01 #21–#22 | grouping | "Test rules" | disabled, reason | disabled, "Finish grouping first" | `aria-disabled="true"`, "Finish grouping first" on focus; usable again after "Cancel" | match |
| U17 6401:71705 | saving | "Save and exit" | state | a "Saving your draft…" modal (F21) | `aria-disabled="true"`, "Saving…", opacity 0.4, the focus kept; status "Saving draft…" | F21 (W20) |
| — | failed save | the step | message | the toast with "Try again" (F67) | the baseline's `SaveDraftAlert` above the step ("Couldn't save your draft …", "Try again") | T048 (the toast) |
| U51 6197:11098 | toast | toast | position | 24 above the 72 px footer | "Link copied." 96 above the window's bottom (`bottom-[calc(var(--wizard-sticky-bottom,72px)+24px)]`); 192 at 320 × 640 (footer 168), 24 at 1455 × 420 (footer not sticky) | match (T036 carry) |
| — | keyboard | footer buttons | focus ring | KERN's 4 px `action-focus-default`, offset 2 | 4px solid rgb(11, 18, 32), offset 2px, `:focus-visible` only | match |
| — | hover | tertiary | layer | KERN tertiary hover | `action-state-indicator` 8 % | match |
| — | Tab / Shift+Tab | focused element | stays clear of the sticky parts (WCAG 2.4.11) | — | rules step of `e67b4d7b…`: every focused element within 232–812 (`scroll-padding` 232 / 88) in Chromium; none under 216 or over 828 in Firefox | match |
| U01 #10–#11 | ⋯ near the footer / under the header | menu | direction, edges | down where it fits above the footer, else up; header or footer − 8 | Sub-group 02's ⋯ at 763: up, 526–755; Rule 02's ⋯ at 240: down, 280–509 | match |
| U01 #16 | documents, 1455 × 900 | the documents list | sticky, height | panels fill the window at ≥ 800 (T052) | the list sticks at 216 under the step header, `max-height` 572 (900 − 216 − 72 − 40) | match (T052 builds the fill) |
| U01 #17 | rules | step head | pinned | yes | sticky at 64 | match |
| U01 #18 | rules | variant tabs | pinned with the head | yes | scroll with the page | T056 |
| U01 #19 | select mode, 1455 × 640 | selection bar | pins under the head | yes | rests at 282, pins at 216 (the step header's bottom) after 133 px, its pinned look then | match (under the tabs: T056) |
| — | select mode, 1455 × 420 / 320 × 640 | selection bar | pins | — | at 64 / 120, under the pills (the step header isn't pinned there); before T033 it pinned at 0, under the pills | match |
| F43 | test step, 1455 × 900 | the step | only the panel scrolls | — | the step 216–788 (572), the page doesn't scroll (900), the panel scrolls (425 / 415) | match (T073 builds the design's panel) |
| F43 | test step, 800 × 1024 | the step | same | — | sticky top 240 (the description in two lines), the panel scrolls (661 / 515) | match |
| — | 320 × 640 | footer | wraps, labels | the footer wraps, "Save and exit" keeps its label (005-ACC.4) | step 1: 2 rows (120); documents: Back / "Save and exit" / "Add rules" 3 rows (168); no horizontal scroll (body 305) | match (W2) |
| — | 320 × 640 | step header | sticky | not drawn | scrolls with the page (`wizard-pinned:` needs 768 × 640); sticky top 120 | match (§3 "Sticky parts of the wizard") |
| — | 1455 × 420 | step header, footer | sticky | not drawn | both scroll with the page, only the pills stay; the documents list sticks at 64 with `max-height` 316 | match (§3) |
| — | create | header pill | Draft badge (005-S0) | in the connection pill | "Draft" pill 8 after the name | match |
| U98 6731:39821 | edit | header pill | "Active" (F5) | "Active" | the editor passes no badge for a published connection; no published connection in the dev database | open for T084 |
| — | loading (W10) | page | anatomy | skeletons in the final layout | no step header, the skeleton card 32 under the pills, "Loading the connection…" status, footer "Home" | match |
| — | failed load (W10) | page | anatomy | the alert with the error ID | "Couldn't load the connection", the danger alert with "Try again" / "Go to your connections", footer "Home" | match (the error ID: T017 carry, T037) |
| L4 | details | frame | no step line, 832 column | — | `variant="details"` built; the details pages still pass `head` without the variant: an empty 56 px white band under the pills, the 1120 column | open for T078 / T081 |
| — | leave, log out | product name, "Your connections", "Log out" | FR-026 callbacks | — | `onLeave`, `onLogOut` passed through to `TopBar` / `UserMenu`; not passed by the editor yet | T047 / T048 |

### AuthLayout (L1) — T034, 2026-11-08

Checked with playwright-core (Chromium `/usr/bin/chromium`, fresh signed-out context per case) on
`/login` and `/forgot-password`: 1455 × 900 (body 1440), 1295 × 800 (body 1280), 1249 / 1248 (the
1234 boundary), 1039 (body 1024), 1015 (body 1000), 1005 / 1004 (the 990 boundary), 768 × 1024,
**320 × 640 CSS px** at deviceScaleFactor 2 (WCAG reflow width), **640 × 400 CSS px** (1280 × 800 at
200 % zoom), 160 × 320 CSS px (a 320 px window at 200 %, beyond the requirement), 1455 × 650 (short
window). Fonts: `document.fonts.check('500 40px "Fira Sans"')` and `'400 18px "Fira Sans"'` true.
The cards inside are the baseline's (T040, T041 rebuild them): their heights differ from Figma's
(470 vs 496, 300 vs 240) and are not rows of this table.

| frame | state | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|
| U10 6685:103961 | 1440 | page | background | `layout-background-hued` #f2f5fb + gradient 249.8°, transparent 29.524 %, rgba(164,209,225,.15) 61.246 %, rgba(73,195,128,.3) 92.968 % | rgb(242, 245, 251) + `linear-gradient(249.8deg, rgba(255,255,255,0) 29.524%, rgba(164,209,225,0.15) 61.246%, rgba(73,195,128,0.3) 92.968%)`; pixels vs Figma's screenshot: (1430,80) 242,245,251 = ; (10,890) 191,230,214 vs 191,230,213; (500,890) 217,236,236 vs 221,237,239; (800,700) 234,241,248 vs 237,243,249 | match (the stops are Figma's CSS; ≤ 4/255 per channel from how the angle maps to the box) |
| U10 6701:39366 | 1440 | header area | box, pills | 0,0 1440 × 64; Konnekt pill white, no account pill (U03 #33) | 0,0 1440 × 64; pill 16,16 133 × 48 `oklch(1 0 0)`; the pill and the spacer only | match |
| U10 6701:39367 | 1440 | DE/EN pill | — | drawn | not built | F6 |
| U10 7174:55658 | 1440 | login art | box, asset | x −29 layer 360 wide = visible 0..331, y 142, 617 high; `login-art@2x.png` 662 × 1234 shown at 331 × 617 (build note 9) | 0, 141.5, 331 × 617; natural 662 × 1234; `alt=""` | match (Figma's hero centre 450.5 in a 900 frame, the app's 450) |
| U10 7363:55408 | 1440 | art → tagline | gap, alignment | 60, `items-center` | tagline at 391 (331 + 60), centres equal | match |
| U10 7094:65060 | 1440 | headline | box, text | 391, 382.5, 342 × 96; "Connect to the / EUDI Wallet" | 391, 382, 342 × 96, two lines, "Connect to the EUDI Wallet" | match |
| U10 7094:65060 | 1440 | headline | font, colour | heading/display Fira Sans Medium 40/48, #0b1220 | "Fira Sans" 500 40px/48px, rgb(11, 18, 32) | match |
| U10 7094:65061 | 1440 | sub-line | box, text | 391, 494.5; "Receive verified citizen data with ease" (the layer name differs, U10 #3) | 391, 494, 342 × 24; same text | match |
| U10 7094:65061 | 1440 | sub-line | font, colour | body/large Regular 18/24, #4a5468 | 400 18px/24px, rgb(74, 84, 104) | match |
| U10 7094:65059 | 1440 | headline → sub-line | gap | 16 | 494 − 478 = 16 | match |
| U10 6401:27999 | 1440 | card slot | x, width, right margin | 847, 440, 153 | 847, 440, 1440 − 1287 = 153 | match |
| U10 6401:27999 | 1440 | card | vertical | centred (202..698 → 450) | 215..685 → 450 (card 470 high: T040) | match |
| U10 6401:28462 | 1440, forgot password | card | x, vertical | 847; 330..570 → 450 | 847; 300..600 → 450 (card 300 high: T041) | match |
| U10 6401:28457 | 1440, forgot password | hero, header | same as sign-in | same | art 0,141.5; h1 391,382; same header | match |
| U02 #14 | 1280 (1295 window) | art, tagline | slides left so the tagline keeps ≥ 48 from the card (up to 140 more) | — | art −94; tagline 297..639; card 687..1127 (153 from the right): gap 48 | match |
| U02 #14 | 1234 (1249 window) | art | slid by the full 140 | — | art −140; tagline 251..593; card 641: gap 48 | match |
| U02 #14 | 1233 (1248 window) | art | hidden; tagline 80 from the left, card 80 from the right | — | art wrapper `display: none`; tagline 80; card 713..1153 (80 from the right) | match |
| U02 #14 | under 1024: 1000 (1015 window) | tagline, card | 80 from the edges, centred vertically, ≥ 48 apart | — | tagline 80..422, 332..452 (centre 400 of 800); card 480..920 (80 from the right), centre 400; gap 58 | match |
| U02 #14 | 1024 (1039 window) | tagline, card | as above | — | tagline 80; card 504..944; gap 82 | match |
| W2 | 990 / 989 | layout | side by side down to 990, then one column | — (no frame) | 990: card 470..910, gap 48; 989: tagline above the card, both 440 wide, centred, 274.5 | match (W2) |
| W2 | 768 × 1024 | layout | one column, nothing hidden | — | tagline 156.5,221 440 wide; card 156.5,397; no horizontal scroll | match (W2) |
| W2 | 320 CSS px (320 × 640, DPR 2) | layout | card full width, nothing hidden, no horizontal scroll | — | header 64; h1 16,104 273 wide (2 lines); sub-line 2 lines; card 16,304 273 wide (16 from both edges); scrollWidth 305 = body 305; scrolls vertically (814) | match (W2) |
| W2 | 320 CSS px, forgot password | layout | as above | — | card 16,304 273 × 300; no horizontal scroll | match (W2) |
| W2 | 200 % zoom (640 × 400 CSS px) | layout | nothing hidden, no horizontal scroll | — | one column 440 wide; scrollWidth 625 = body; page scrolls (790) | match (W2) |
| W2 | 160 CSS px (320 window at 200 %) | layout | no horizontal scroll | — | h1 113 wide, 6 lines (`wrap-break-word`); card 113 wide; no element past the right edge | match (W2; the card's insides are T040's) |
| — | short window 1455 × 650 | art | doesn't make the page scroll | — | art 0,16.5 (reaches under the header pills, which stay on top), card 847,90; scrollHeight 650 = clientHeight | match (W2: no frame) |
| U02 #12 | all | art | decorative | `alt=""` | `alt=""`, hidden wrapper below 1234 | match |
| — | all | headings | one `h1` (FR-012) | the card's "Log in" is the only heading drawn inside the card (U10 #4) | the tagline is the `h1` (ARCHITECTURE "Titles"), the cards' `h2` | match (see the report: the h1's place is UNCERTAIN) |

### ConfirmDialog — T035, 2026-11-08

Frames 480 wide over 1440-wide screens, checked at 1455 × 900 (viewport 1440). Kit P12 frames 600.

| frame | state | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|
| U14 `6699:44480` | open | dialog | box | 480 × 256, centred (x 480 on 1440) | 480 × 256, x 480 | match |
| U14 `6699:44480` | open | dialog | fill, stroke, radius | `layout/background/default` white, 1 px inside `layout/border` #6b7488, radius `border-radius-large` 12 | white, `ring-1 ring-inset` rgb(107 116 136), 12 px | match |
| U17 `7173:52681`, U90 `6417:31598` | open | scrim | fill | `action/state-indicator/shade` #0b1220 at `opacity-overlay` 72 % (rendered rgb 79 84 94 over white) | `::backdrop` rgb(11 18 32), opacity 0.72 | match |
| U14 `6699:44480` | open | header | padding, min height | 8 8 0 32, 64 | 8 8 0 32, 64 | match |
| U14 `6699:44480` | open | title | type, colour, position | `title/large` 24/32 600 Fira Sans, `layout/text/default`; container pt 8, title padding 7/9, pr 16 → text x 512, y +16 | 600 24px/32px, rgb(11 18 32), padding 7 0 9; x 512, top +16, 360 wide | match |
| U14 `6699:44480` | open | × | size, icon | `button-tertiary` 48 × 48, `icon-close-default` 24, `action-default` | `kern-btn--tertiary` 48 × 48 at right 8 / top 8, `kern-icon--close` | match |
| U14 `6699:44480` | open | × | accessible name | — (not drawn) | "Close" (`KERN_TRANSLATIONS.closeDialog`) | match |
| U14 `6699:44480` | open | body text | type, padding | `body/large` 18/24 400, padding 1/7; body padding 8 32 24 | 400 18px/24px, padding 1 0 7; at x 512, 8 below the header, 416 wide | match |
| U14 `6699:44480` | open | footer | padding, line | border-top 1 `decorative-border` #e1e6f0 inside, padding 24 32 32 → 104 tall | `pt-23!` + 1 px rgb(225 230 240), 32 32 → 104 | match |
| U14 `6699:44480` | open, 2 buttons | buttons | layout | `dialog-actions` gap 16, each `flex-1` → 200 × 48 at x 512 and 728 | 200 × 48 at 512 and 728 (grid of equal columns) | match |
| U14 `6699:44480` | open | "Keep connection" | style | `button-secondary`: 1 px `action-default` #1d56f0, radius 8, label 16/24 600 | 1 px solid rgb(29 86 240), 8 px, 600 16px/24px | match |
| U14 `6699:44480` | open | "Delete connection" | style | filled `feedback/danger` #c4271c, label white 16/24 600 | rgb(196 39 28), white, 600 16px/24px (`kern-btn--primary kern-btn--danger`) | match |
| — | hover / pressed | filled danger | fill | kit states (P33): KERN's shade 88 % / 76 % of the colour | `color-mix(oklch, #c4271c, black 12 % / 24 %)`: oklch(0.490 …) / oklch(0.448 …) | match |
| U17 `7173:52682` | open | "Discard connection" | style | danger outline: 1 px `feedback/danger` #c4271c, label `feedback/danger`, white | 1 px solid rgb(196 39 28), label rgb(196 39 28), transparent on white (`kern-btn--secondary kern-btn--danger`) | match |
| U17 `7173:52682` | open | "Save progress" | style | `button-primary` `action-default` #1d56f0 | rgb(29 86 240) | match |
| — | hover / pressed | danger outline | fill | kit states: tint 8 % / 16 % of the colour | danger at 8 % / 15 % (pressed was hidden by KERN's hover rule: fixed for every secondary and tertiary button) | match; pressed 15 %: §1.5 AA fix |
| U17 `7173:52682` | open | buttons | which | no "Cancel": "Discard connection", "Save progress", × | `cancelLabel` omitted: secondary (danger outline) + confirm + × | match |
| U25 `7299:52174` | open | "Remove 1 document" | style, padding | danger outline, `px-12` | danger outline, KERN's px 16 | match (4 px of side padding inside a 200 px button with a centred label: not visible) |
| P12 `2:12920` / `2:12932` | 3 buttons | buttons | layout | short labels: a row of three `flex-1` in 600; long labels: stacked full-width, tertiary, secondary, primary | 600 (`wide`): a row of 168 each (labels wrap: "Log out anyway" two lines, 64 tall); 480: stacked 416 × 48 in that order; cancel `kern-btn--tertiary` underlined | match (the row/stack switch is by width, not label length: below) |
| P12 `2:13088` | 3 buttons, mobile | buttons | layout | stacked full-width, tertiary on top, primary at the bottom | 320: stacked 209 wide, same order | match |
| P12 `2:12880` | long labels, 2 buttons | buttons | wrapping | labels wrap inside the button | "Keep this connection as it is for now" / "Delete this connection and all its links for good": 200 wide, 90 tall, wrapped and centred | match |
| P12 `2:12892` | scrollable | dialog | overflow | the whole dialog scrolls (`overflow-y-auto`, the scrollbar at its right edge from the top), footer at the end | 480 × 862 in a 900-high window (the UA's max-height), `overflow-y: auto`, 1456 scroll height, footer at the end | match |
| U14 `6872:45929` | long title | title | wrapping | "Delete “Passenger transport licence”?" on two lines | wraps to two lines (80 tall), × stays at the top | match |
| — | working | buttons | state | not drawn (FR-008) | every button and the × `aria-disabled="true"`, confirm reads `busyLabel` ("Deleting…"); Escape, scrim, ×, cancel, confirm all ignored | match (FR-008) |
| — | failed | alert | content | not drawn (FR-008) | KERN danger alert above the text with the message and "Error ID: …", confirm reads `retryLabel` ("Try again"), focus on it | match (FR-008, F22) |
| U90 `6417:31453` | delete | scrim click | closes | doesn't (FR-052a, U90 #6, U14 #17) | `dismissOnScrim={false}`: stays open (harness; real "Delete draft" dialog on the draft details) | match |
| U17 `7173:52681` | leave | scrim click | closes | closes (FR-052a) | default `dismissOnScrim`: closes through `onClose`, focus back on the opener | match |
| — | open | Escape | closes | closes (005-ACC.2) | `onClose`, focus back on the opener (harness and the real "Delete draft") | match |
| — | open | × | closes | closes | `onClose`, focus back on the opener | match |
| — | open, keyboard | focus | inside, returns | FR-009 | native modal: the page is inert, Tab cycles ×, buttons (and the browser's own UI); KERN's 4 px #0b1220 ring offset 2 on keyboard focus only; on close the focus returns to the opener | match |
| — | open by pointer | × | focus ring | none drawn | the × gets the focus without the ring (`:focus-visible` false) | match |
| — | opening, closing | dialog, scrim | fade | §4 "Dialogs: fade" | opacity 0 → 1 / 0.72 in 150 ms (`--duration-colour`) ease-out, and back on closing (t + 30 ms ≈ 0.34 / 0.24; closing t + 40 ms 0.66, still shown) | match |
| — | reduced motion | dialog, scrim | fade | off (FR-050) | appears at 1 / 0.72 at once, gone at once | match |
| — | 320 px | dialog | box | not drawn (FR-010) | 273 wide with 16 px gutters (x 16), centred, all corners rounded, buttons stacked full-width | match (FR-010) |

### Pattern: Dialog — T035, 2026-11-08

The pattern's first table; it stands for every later dialog on `ConfirmDialog` (T044/T082 delete,
T045 local drafts' discard, T048 leave / log out / restore / conflicts, T053 "No data selected",
T064 variant, T072 edit data and regeneration, T076 publish, T083 discard changes, T087 account).

| Rule | Source | How `ConfirmDialog` does it |
|---|---|---|
| Width | U14, U17, U25, U90 (480); P12 (600) | 480 by default; `wide` for a frame that draws 600; 16 px from the window's edges below that |
| Anatomy | P12, U14 `6699:44480` | title (`title/large`), ×, body (`body/large`, the caller's content 16 below), footer with a top line, 1–3 buttons |
| Buttons | P33 dialog-actions | cancel (secondary; tertiary with three) · secondary · confirm (primary), equal columns while they fit, stacked full-width where they don't; long labels wrap inside |
| Danger | U14 `6699:44480`, U17 `7173:52682`, U25 `7299:52174` | the filled danger button where the design draws it (`danger`: the confirm), the danger outline where it draws that (`secondaryDanger`: the secondary) |
| Closing | FR-052a, FR-049 | ×, Escape and (with `dismissOnScrim`, the default) the scrim call `onClose` (default `onCancel`); `dismissOnScrim={false}` for a dialog that deletes or publishes |
| Focus | FR-009 | native modal: focus on the × when it opens, kept inside, back on the opener when it closes (a page whose opener is gone moves the focus itself, as `UserMenu`, `LocalDraftsOffer`, `Account` do) |
| Working | FR-008 | `busy`: every button busy (`aria-disabled`), the confirm label `busyLabel`, nothing closes it |
| Failure | FR-008, F22 | `error` (+ `errorTitle`): the danger alert with the error ID above the text, the confirm label `retryLabel` |
| Scrolling | P12 scrollable | the whole dialog scrolls inside the window's height |
| Motion | §4 | the dialog and the scrim fade (150 ms), off under reduced motion |

### NotFound — T037, 2026-11-08
Checked on `/approvals/00000000-0000-4000-8000-000000000000` (AppLayout) and `/form-connections/00000000-0000-4000-8000-000000000000` (inside `WizardLayout` through `FormConnectionLoadState`), Chromium, 1455 wide (1440 + the gutter), and at 320, 767, 783.

| frame | state | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|
| U11 `6699:44486` | default | h1 | text, font, colour | "Welcome to Konnekt" (the page title's style), 500 32/40, `#0b1220` | "Page not found", 500 32px/40px, `rgb(11 18 32)` | match (the text is the baseline's, 001-S0.4: the design draws no not-found page) |
| U11 `6699:44485` | default | h1 | position | x 160, y 96 | 160, 96 | match |
| U11 `6699:44488` | default | card | position | 16 under the title (y 152) | y 152 (AppLayout); y 168 inside the wizard (its column gap 32) | match (AppLayout); the wizard's gap is L3's (T033) |
| U11 `6699:44488` | default | card | fill, radius, padding, gap | `#f2f5fb`, 12, 48, 48 | `rgb(242 245 251)`, 12px, 48px, 48px | match |
| U11 `6699:44488` | default | card | width | 1120 | 1120 | match |
| U11 `6699:44492` | default | sentence | font, colour | 400 16/24, `#4a5468` | 400 16px/24px, `rgb(74 84 104)` | match |
| U11 `6699:44492` | default | sentence | text | (the hero's) | "The link may be broken, or the page may have been moved or deleted." | baseline copy (001-S0.4) |
| U11 `6699:44490` | default | sentence | x | 208 (160 + 48) | 208 | match |
| U11 `6699:44489` | default | sentence → action | gap | 32 | 32 (268.5 → 300.5) | match |
| U11 `6699:44491` | default | card heading | presence | "Create your first connection" (title/large) | none: the h1 is the empty state's one heading | §3 "Empty state" (one heading) |
| U11 `6699:44493` | default | steps illustration | presence | four steps | none | not part of the empty-state anatomy (welcome page only, T042) |
| U11 `6699:44508` | default | action | text, kind | "Create connection", primary with forward arrow | "Go to connections", `kern-btn--primary`, `kern-icon--arrow-forward` | the task's wording (T037, FR-049) |
| U11 `6699:44508` | default | action | height, padding, radius, fill | 48, 0 16, 8, `#1d56f0` | 48, 0 16px, 8px, `rgb(29 86 240)` | match |
| U11 `I6699:44508;2:4544` | default | action label | font, padding, colour | 600 16/24, 8, white | 600 16px/24px, 8px, white | match |
| U11 `I6699:44508;2:4545` | default | arrow | size, gap to label | 24, 0 | 24 × 24, 0 | match |
| U11 `6793:47828` | default | secondary action | presence | "Start with an example" | none | §3 (one primary action); OUT-9 |
| U11 `6699:44509` | default | picture | size, position | 200 × 193, right of the text, centred | 200 × 193 at x 1032, y 200 (centred in the 289 card) | match |
| U02 #12 | default | picture | alt | `alt=""` | `alt=""` | match |
| — | default | h1 count, tab title | — | one h1; "<page> · Konnekt" | 1; "Page not found · Konnekt" | match (FR-012) |
| — | 767 / 320 | picture | display | not drawn | hidden below 768 (card 24 padding; 720 / 273 wide) | FR-010 |
| — | 320 | layout | horizontal scroll | — | none (scrollWidth 305 = clientWidth less the gutter) | FR-010 |
| — | default | action | keyboard | — | Tab reaches it, 4px KERN focus ring, Enter opens `/` | match |
| — | default | unknown route | behaviour | — | `/no-such-page` redirects to `/` ("Your connections") | match (baseline; S22) |

### Pattern: Page change — T037, 2026-11-08
Checked with a per-frame probe (`requestAnimationFrame`) around the navigation, Chromium and Firefox 158, 1455 × 420 (the overview scrolls).

| frame | state | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|
| U06 #94 `7137:50569` | route change (overview → `/account`, push) | main | fade | "fade the content in 150 ms" | `page-in` 150 ms, opacity 0 → 0.18 → … → 1 over 150 ms, then no animation | match |
| U06 #94 | route change | window | scroll | "scroll to the top; nothing slides" | `scrollY` 146 → 0 in the first frame of the new page | match |
| U06 #94 | route change (back, popstate) | main, window | fade, scroll | — | the same | match |
| U06 #94 | overview → details (link) | main | fade, scroll | — | skeleton's `main` fades, `scrollY` 0; the loaded page replaces it without a second fade | match (keyed by the route) |
| U06 #93 | route change | header pills | movement | "header … never move" | outside `main`: no fade, no movement | match |
| — | step change in the edit flow (Rules → Add documents, Back) | main | fade | — | the same `main`, no animation; the path unchanged | match (T033) |
| — | step change | focus | — | — | the step's h1 (`H1` active) | match (T033) |
| — | query change (`?local=…` written by the fresh flow) | main, window | — | — | no remount, no scroll | match |
| — | reduced motion | main | animation | U06 #94 "fades only" | none; the scroll to the top stays | F62 |
| — | Firefox 158 | main | fade | — | `page-in` runs, opacity 0 → 1 over ≈ 170 ms of frames | match |

### Pattern: Error state of a page — T037, 2026-11-08
The composition of §3, verified on its reference implementation `LoadFailed` (details of `e67b4d7b-…` with its request aborted through Playwright routing, 1455); the alert's own values stand in T017's "Alert, page level" and `FormConnectionLoadState` tables; the error ID line in T017's `ErrorNoticeText` table (`/account` with a 500).

| frame | state | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|
| U02 `6637:36656` (note 7) | failed | alert | kind | slim KERN alert for page-level errors | `kern-alert kern-alert--danger`, `role="alert"` | match |
| W2 | failed | h1 | text | not drawn | "Couldn’t load the connection", one h1 | W2 |
| W2 | failed | h1 → alert | distance | not drawn | 32 (the wizard's column gap; 16 in AppLayout) | W2 |
| U02 `6637:36656` | failed | alert | parts | "title only" | title "Check your connection and try again.", body with "Try again" and the way back | F22 |
| W2 | failed | way back | text, kind, target | not drawn | "Go to connections", `kern-link`, `/` | W2 (T037 settles the wording) |
| W2 | failed, 5xx | error ID | line | not drawn | `ErrorNoticeText` when `notice` is passed; `useFormConnection` keeps no notice yet | W2: open for T080 / T083 (see notes) |

### Pattern: Empty state — T037, 2026-11-08
The `NotFound` table above stands for the pattern (U11 `6699:44481`'s card, picture 200 × 193). The Documents panel's 128 × 123 variant (U20 `7290:60367`) and U29 are checked by their tasks.

| frame | state | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|
| U11 `6699:44488` | default | card | fill, radius, padding, gap, picture | `#f2f5fb`, 12, 48, 48, 200 × 193 | as the `NotFound` table | match |
| U20 `7290:60367` | default | picture | size | 128 × 123 | not in this task | deferred to T051 |

### 5.2 Screens (pass G), in unit order

| Unit | Screen | Status |
|---|---|---|
| U10 | S1, S2 | done (T040, T041, 2026-11-08; the loading frame: T042, 2026-11-08) |
| U11 (`6699:44481`, `6699:44486`) | S3 | done (T042, 2026-11-08) |
| U11 (`6699:44240`, `6699:44511`, `6699:44570`): title, hint, toolbar, search, list card, footer bar | S4 | done (T043, 2026-11-08) |
| U11 (`6699:44240`) rows, U12, U13, U17 (`6699:47943`) | S4 | done (T044, 2026-11-08); F71's step deferred (CLAR #62) |
| U15 (`6699:47845`): toolbar and frame | S4 | done (T043, 2026-11-08); the edit dialog `6699:47905`: S7 |
| U14, U90 (`6699:44359`, `6699:48039`): the row delete | S4 | done (T044, 2026-11-08) |
| U14, U90 (the details' dialogs) | S17 | pending (T082) |
| U16 | S5 | done (T045, 2026-11-08; the list card's minimum height fixed by the coordinator) |
| U17, U19 | L3, S6, S7 | done (S6: T048; S7: T049, 2026-11-08; the load error's error ID: T080/T083) |
| U18 | S3, S7 | S3 done (T042: F15, nothing to build); S7 done (T049: F15, nothing to build) |
| U20, U21 | S8 | done (T051, 2026-11-08) |
| U22, U23, U24, U26; U01 #16 | S8 | done (T052, 2026-11-08) |
| U25, U27, U28 (F23), U98 (`7296:52315`) | S8 | done (T053, 2026-11-08; U98's edit footer: T084) |
| U29, U34, U35, U36, U43, U50, U51, U54–U58, U64 | S9 | pending |
| U30–U33, U48, U49, U53 (U09) | S10 | pending |
| U37–U42, U47, U52, U59–U62 | S11 | pending |
| U44, U45, U46 | S12 | pending |
| U65–U74 | S13 | pending |
| U63, U73, U75–U79 | S14 | pending |
| U80–U92, U94–U97 | S15 | pending |
| U93 | S16 | pending |
| U87, U88, U89 (dialogs) | S17 | pending |
| U98, U99, U100 | S18 | pending; U98 step 1 done (T049, 2026-11-08) |
| (no frames) | S19, S20, S21, S22 | the patterns' tables of §5.1 stand; the states are checked in quickstart V9 |

U01–U09 are annotations and need no table.

### U10 Sign-in and forgot password (S1, S2) — T040, T041, 2026-11-08

Checked in Chromium (playwright-chrome) at 1455 × 900 (body 1440) and 320 × 640, signed out
(cookies cleared), against U10 `6401:27999` (the card, `get_design_context`), `6401:28435` (the
alert), `6401:28462` (the forgot-password card), `6701:39407` (the loading frame's header) and the
section's metadata (`6401:27993`: card boxes in every frame; no frame changed since the audit).
Fonts: `document.fonts.check('600 24px "Fira Sans"')` and `'400 14px "Fira Sans"'` true. The 5xx
and the running request: `POST /api/auth/login` held or answered `500 {error, message, error_id}`
by Playwright routing (nothing sent to the backend); the wrong password and "Log out" against the
real backend (account `designer`). Layout L1 (header, hero, gradient, card slot): the `AuthLayout`
table (T034) stands.

| frame | state | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|
| U10 6401:27999 | default | card | box | 847, 202, 440 × 496 (centred in 900) | 847, 202, 440 × 496 | match |
| U10 6401:27999 | default | card | fill, radius, shadow, border | white; 12; Elevation/Card `0 1 2 #1315250d`, `0 6 20 #1315250d`; none | oklch(1 0 0); 12px; `rgba(19,21,37,0.05) 0 1px 2px`, `rgba(19,21,37,0.05) 0 6px 20px` (`shadow-card`); 0 (was a 1 px `neutral-100` border) | match |
| U10 6401:27999 | default | card | padding, gap | 40; 24 | 40px; 24px | match |
| U10 6401:28001 | default | "Log in" | font, colour, box | heading/large 600 24/32, `#0b1220`; 40, 40 in the card, 32 high | 600 24px/32px, rgb(11, 18, 32); 887, 242 (40, 40), 32 high | match |
| U10 6401:28001 | default | "Log in" | element | the card's only heading (U10 #4) | `h2`; the page's `h1` is the tagline (T034, ARCHITECTURE "Titles") | match (FR-012: one h1, "Connect to the EUDI Wallet") |
| U10 I6401:28003;…;2:2110 | default | labels | font, padding, box | label/default 600 16/24 `#0b1220`; baseline padding 6 / 2 (32 high) | 600 16px/24px rgb(11, 18, 32); padding 6px / 2px, 32 high (`[&_label]:pt-6 [&_label]:pb-2` on the form) | match |
| U10 6401:28003 | default | Username | block, input | block at 96 in the card, 88 high; input 48 at 136, 360 wide | label at 298 (96), input 887, 338 (136) 360 × 48 | match |
| U10 I…;2:2147 | default | inputs | fill, line, radius, padding, font | `#f2f5fb`, bottom 2 `#22293a`, 4, 0 16, 16/24 | rgb(242, 245, 251), 2px solid rgb(34, 41, 58), 4px, 0 16px, 16px (T015's `TextField`) | match |
| U10 6401:28003, 6616:40784 | default | labels | required marker, placeholder | none; none | no `requiredMark` (`required` on the inputs), no placeholder | match |
| U10 6616:40784 | default | Password | block, input | block at 208, 128 high (88 + the 40 link row); input at 248 | label at 410 (208), input 450 (248) | match |
| U10 I6616:40784;6616:40458 | default | show/hide toggle | size, place | 32 px icon button inside the field (component description), the eye 24, its right edge 8 from the field's | button 1211, 458, 32 × 32 (`TextField` `trailing`, slot `right-4`); eye 1215, 462, 24 × 24, right edge 1239 = field 1247 − 8 | match |
| U10 I6616:40784;6616:40453 | default (hidden) | toggle icon | glyph, colour | icon-visibility_off (struck-through eye) while hidden, `action-default` `#1d56f0` | `kern-icon--visibility-off` (the same Material glyph), rgb(29, 86, 240); `kern-icon--visibility` while shown | match |
| — | default | toggle | name, state (FR-051 (29)) | not drawn | `button` "Show password" (`sr-only`), `aria-pressed` false → true, the input `password` → `text` | match |
| — | keyboard | toggle | reach, ring | not drawn | Tab order username → password → toggle → "Forgot password?" → "Log in"; Space toggles; ring 4px solid rgb(11, 18, 32) on keyboard focus, none after a click | match (FR-009) |
| — | hover, pressed | toggle | tint | not drawn | none (only the icon; as before) | match |
| — | password, trailing slot | input | text clear of the toggle | text box ends 48 from the field's edge (8 before the 32 px toggle's icon box) | `padding-right` 48 (`TRAILING_PADDING_CLASS` `pr-48!`, set by the coordinator after T040: the toggle is `trailing`'s only user) | match |
| U10 I6616:40784;6616:40381 | default | "Forgot password?" | place | 8 under the password field, left, row 40 high | 887, 506 (field bottom 498 + 8), 32 high + 8 = 40 | match |
| U10 I6616:40784;6616:40381 | default | "Forgot password?" | anatomy | kit P21 link-default: arrow_forward 24 before the text, gap 4, padding 6 / 2, body/default 400 16/24 `#1d56f0`, no underline | `kern-link` + `kern-icon--arrow-forward` 24 × 24, gap 4px, padding 6px 0 2px, 400 16px/24px rgb(29, 86, 240), `text-decoration: none` (underlined on hover, KERN) | match |
| — | visited | "Forgot password?" | colour | not drawn (always blue) | blue (`kern-link--no-visited-state`) | match |
| — | default | "Forgot password?" | target, state | /forgot-password, keeping the requested route (001-S2) | `/forgot-password` with `{ from }` (the `loggedOut` flag left out) | match |
| U10 6401:28005 | default | "Log in" button | box | 360 at 40, 360 in the card, 48 high | 887, 562 (360), 360 × 48 | match |
| U10 6401:28005 | default | "Log in" button | fill, radius, label | `#1d56f0`, 8; label/default 600 16/24 white | `kern-btn--primary kern-btn--block`: blue, 8px; 600 16px/24px white | match |
| — | running | "Log in" button | busy (W2, FR-008) | not drawn | `aria-disabled="true"`, label "Logging in…", KERN's 40 % and `not-allowed`, keeps the focus; a second click or Enter sends nothing (1 request) | W2 |
| U10 6401:28006 | default | encrypted note | box, layout | 432 in the card, 24 high; glyph 16 at 95 / 4, 8 before the text; centred | 887, 634 (432), 360 × 24; glyph 982, 638 (95 / 4) 16 × 16; gap 8 | match |
| U10 6401:28007 | default | lock glyph | asset, colour | "Icon/Glyph" lock 16 × 16, `#4a5468` | `assets/icons/lock.svg` = the frame's export (16 × 16, `#4A5468`; was the old 24 px `#51577a` file) | match |
| U10 6401:28008 | default | "Your login is encrypted" | text, font, colour | body/small 400 14/24, `#4a5468` | "Your login is encrypted" (was "Your sign-in is encrypted"), 14px/24px, rgb(74, 84, 104) | match (cosmetic 25) |
| U10 6401:28088 | filled | fields | values | "lena.weber", the password masked | typed values; the password as dots while hidden | match (FR-002b: sample data) |
| U10 6401:28187 | failed sign-in | card | box | 847, 146, 440 × 609 | 847, 145.5, 440 × 609 (900 − 609 = 291, halved) | match |
| U10 6401:28435 | failed sign-in | alert | place, box | 96 in the card (above the fields), 360 × 89 | 887, 241.5 (96), 360 × 89 | match |
| U10 6401:28435 | failed sign-in | alert | frame, fill, radius | 2 `#c4271c` inside, header `#fef1f0`, 8 | outline 2px rgb(196, 39, 28) offset −2px (the `index.css` alert rule), rgb(254, 241, 240), 8px | match |
| U10 I6401:28435;1:4099 | failed sign-in | alert icon | size, colour, place | icon-danger 32, `#c4271c`, centred in the header (padding 16) | `kern-icon--danger` 32 × 32 (the overlay's alert icon size), rgb(196, 39, 28), 903, 270 (16 in, centred) | match |
| U10 I6401:28435;1:4101 | failed sign-in | alert text | content, fonts | one title paragraph: "Username or password is wrong. " title/default 600 18/24 + "Check both and try again." Regular 16/24 | `kern-title` 600 18px/24px, padding 5 8 3, then a span 400 16px/24px; "Username or password is wrong. Check both and try again." (T011's text, C5), 296 × 57 | match |
| U10 6401:28191 | failed sign-in | Username field | error fill | the error fill (U10 #13) | rgb(254, 241, 240), bottom 2px rgb(196, 39, 28), `aria-invalid="true"` | match |
| U10 6616:40900 | failed sign-in | Password field | error fill | normal fill (U10 #13: only Username) | the error fill too, `aria-invalid="true"` | F16 (CLAR Q10: both fields) |
| — | failed sign-in | fields ↔ alert | link, announcement | not drawn | both inputs `aria-describedby="login-error"` (the alert); `role="alert"`, re-mounted on every failure so the same text is announced again; no message under the fields | match (F16, 001-S1.2) |
| — | failed sign-in | values | kept | kept (U10 #12) | kept | match |
| — | server error (5xx) | alert | content (FR-008) | not drawn | `KernAlert` danger, title "Logging in failed.", body the server's message and "Error ID: 3f2c9a7e-…" (`ErrorNoticeText`); fields not marked; "Log in" again | W2, F22 |
| — | network failure | alert | content | not drawn | title "Logging in failed.", body "Try again in a moment." | W2 |
| U10 6401:28567 | after sign-in | loading block | loader, label, position | 56 px spinner, "Loading your connections…" 600 18/24, block 224 × 96 centred in 1440 × 900 | `PageLoader label={LIST_COPY.loading}` reached from the sign-in (`/login` → `/`, the list held by Playwright, no memory stored): block 608, 402, 224 × 96 at 1455 × 900 (the frame's 608, 402); 320 × 640: 40, 272, 224 × 96, no scroll (scrollWidth 305) | match (T042) |
| U10 6701:39407 | after sign-in | header | pills (U10 #18) | white Konnekt pill (signed-out style), DE/EN, no account pill | `TopBar signedOut`: the pill 16, 16, 133 × 48, `oklch(1 0 0)`, not a link; no account pill (no `header button`); the page white; the page's one h1 `sr-only` "Your connections" | match (T042; DE/EN: F6) |
| U10 7128:74204 | logged out | card | content | the default card, empty fields | the default card, empty fields | match |
| U10 7128:74220 | logged out | toast | box | 647, 820, 146 × 56 (24 above the edge, no footer) | 647.1, 820, 145.9 × 56 (`noFooter`) | match |
| U10 7128:74220 | logged out | toast | fill, radius, padding, shadow, text | `#0b1220`, 8, 16, Elevation/Menu; "You're logged out." 14/24 white | rgb(11, 18, 32), 8px, 16px, `rgba(19,21,37,0.16) 0 10px 28px`; "You’re logged out." white | match |
| — | logged out | toast | timing, announcement | 6 s (component description) | in the polite status region 142 ms after `/login` shows; gone after 6 s; not again after a reload or "Back to log in" (the flag dropped from the history entry, `from` kept) | match (FR-051 (30)) |
| — | logged out | toast | trigger | after "Log out" only | shown for `loggedOut` in the router state (UserMenu); an expired session (`useSignOutOnUnauthorized`) sets none | match |
| — | default | tab title, headings | FR-012 | — | "Log in · Konnekt"; one `h1` (the tagline) | match |
| — | 320 × 640 | card | width, scroll (W2) | — | 16, 273 wide; failed sign-in 683 high, the alert's text wraps (163 high); no element past the card's edge; no horizontal scroll | match (W2) |
| U10 6401:28462 | forgot password | card | box | 847, 330, 440 × 240 | 847, 330, 440 × 240 (was 300, with a lock tile and a primary button) | match |
| U10 6401:28462 | forgot password | card | fill, radius, shadow, padding, gap | white, 12, Elevation/Card, 40, 24 | the same as the sign-in card | match |
| U10 6401:28464 | forgot password | heading | text, font, box | "Forgot your password?" heading/large 600 24/32 `#0b1220`, at 40 / 40 | `h2` the same text, 600 24px/32px rgb(11, 18, 32), 887, 370 | match |
| U10 6401:28465 | forgot password | text | text, font, box | "Ask your admin to reset it. Then come back and log in." body/default 400 16/24 `#4a5468`, 8 under the heading, 360 × 48 | the same text (was "Ask your admin to reset it."), 400 16px/24px rgb(74, 84, 104), 887, 410, 360 × 48 | match |
| U10 6401:28551 | forgot password | "Back to log in" | box | 40 / 152 in the card, 138 × 48 (40 visible) | `kern-btn--tertiary kern-btn--small`: 887, 486 (40 / 156), 138 × 40 + KERN's 4 / 4 margins = 48 | match |
| U10 I6401:28551;1914:12733 | forgot password | "Back to log in" | icon | icon-arrow_back 20, `#1d56f0`, padding 0 8 | `kern-icon--arrow-back` 20 × 20 at 895 (8 in), rgb(29, 86, 240) | match |
| U10 I6401:28551;1914:12735 | forgot password | "Back to log in" | label | label/small 600 14/24 `#1d56f0`, padding 4 8 | 600 14px/24px rgb(29, 86, 240), padding 4px 8px | match |
| — | forgot password | "Back to log in" | target, state (001-S2) | not drawn | `/login` with `{ from }`: `/form-connections/new?x=1#h` survived the round trip | match |
| — | forgot password | tab title, headings | FR-012 | — | "Forgot password · Konnekt"; one `h1` (the tagline) | match |
| — | forgot password, 320 × 640 | card | width, scroll | — | 16, 273 × 296 (the text wraps to three lines); no horizontal scroll | match (W2) |

Notes (T040): `TextField` gets its first callers of `invalid` (both sign-in fields, F16) and `trailing` (the 32 px show/hide button); U10's kit input draws the label with baseline padding 6 / 2 (U19's step 1 draws none), added on the sign-in form with `[&_label]:pt-6 [&_label]:pb-2` rather than a prop. The failed sign-in's alert is KERN's alert markup (`kern-alert kern-alert--danger`) because the design sets its second sentence in regular 16/24 inside the title line and `KernAlert`'s `title` takes a string; the 5xx alert is `KernAlert`. `assets/icons/lock.svg` is now Figma's 16 px glyph (`#4a5468`). Undrawn copy for the designer (T101): "Logging in…" and the 5xx / network alert "Logging in failed." / "Try again in a moment.". No new AA pair (§1.5).

### U11 Welcome page (S3) — T042, 2026-11-08

Checked in Chromium (playwright-chrome) at 1455 × 900 (body 1440) and at 1100, 1031, 1000, 800, 767,
320, signed in as `designer`, against U11 `6699:44481` (`get_design_context` and the metadata of
`6699:44484`; the frame unchanged since the audit: the same parts as U11 #22–#28). The empty list
by Playwright routing (`GET /api/form-connections` answered `{data: [], message}`), the 5xx the
same way (`500 {error, message, error_id}`); the seeded drafts were not touched. The card's values
of the `NotFound` table (T037, §3 "Empty state") apply; the rows below are the welcome page's own.

| frame | state | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|
| U11 6699:44486 | welcome | h1 | text, font, colour, box | "Welcome to Konnekt", heading/x-large 500 32/40 `#0b1220`, at 160, 96 | the same text (`PageTitle size="x-large"`), 500 32px/40px rgb(11, 18, 32), 160, 96 | match (C1) |
| U11 6699:44487 | welcome | hint | presence | hidden layer | none | match |
| U11 6699:44488 | welcome | card | box, fill, radius, padding, gap | 160, 152, 1120 × 344; `#f2f5fb`, 12, 48, 48 | 160, 152, 1120 × 344; rgb(242, 245, 251), 12px, 48px, 48px | match |
| U11 6699:44489 | welcome | text column | box | 208, 200, 776 wide; parts 32 apart | 208, 200, 776 wide; heading block → steps 32, steps → action 32 | match |
| U11 6699:44491 | welcome | card heading | text, font, box | "Create your first connection", title/large 600 24/32 `#0b1220`, at 208, 200 | `h2` the same text, 600 24px/32px rgb(11, 18, 32), 208, 200, no KERN padding | match (§3 "Empty state": the card heading where the page has its own h1) |
| U11 6699:44492 | welcome | sentence | text, font, box | "Link your services to the EUDI Wallet. Set your own rules and get verified citizen data.", body/default 400 16/24 `#4a5468`, 8 under the heading, 578 × 48 (two lines) | the same text, 400 16px/24px rgb(74, 84, 104), 208, 240, 578 × 48 | match |
| U11 6699:44493 | welcome | steps | box, layout | row at 208, 320, 776 × 48; steps 16 from the lines | `ol` 208, 320, 776 × 48, gap 16 | match (cosmetic 25) |
| U11 6699:44495 | welcome | step tiles | size, fill, shape | 48 round, white (`layout-background-default`) | `IconTile tone="plain" size={48}`: 48 × 48, oklch(1 0 0), radius 9999px; tiles at x 208, 490.9, 699.5, 873.6 (Figma 208, 490.7, 699.3, 874) | match |
| U11 6699:44496 ff. | welcome | glyphs | asset, size, place | "Icon/Glyph" document, fact_check, science, public, tone ink `#0B1220`, 24 at 12 / 12 | the frame's exports (`*-ink.svg`), 24 × 24 at 12 / 12 in each tile | match |
| U11 6699:44497 ff. | welcome | step labels | text, font | "Choose documents", "Set rules", "Test", "Publish"; label/default 600 16/24 `#0b1220`, 8 after the tile | the same, 600 16px/24px rgb(11, 18, 32), 8 after the tile | match |
| U11 6699:44498 ff. | welcome | lines | size, colour | three equal lines 55.7 × 2, `#1d56f0` at 32 %, centred (y 23) | three lines 56.2 × 2 (the labels render 1.6 px narrower in all), rgb(29, 86, 240) at opacity 0.32, y 343 (320 + 23) | match |
| — | welcome | steps | semantics | not drawn | `ol` "How a connection comes together", four `li`; tiles and lines `aria-hidden` | match (FR-012) |
| U11 6699:44508 | welcome | action | text, kind, box | "Create connection", primary with the forward arrow, 208, 400, 204 × 48 | `Link` `kern-btn--primary` + `kern-icon--arrow-forward`: 208, 400, 204.7 × 48, rgb(29, 86, 240), radius 8, padding 0 16; arrow 24 × 24 | match |
| — | welcome | action | target, keyboard | opens step 1 (U11 #25) | `/get-started`; Tab reaches it, ring 4px solid rgb(11, 18, 32), Enter opens the flow | match (FR-027) |
| U11 6793:47828 | welcome | "Start with an example" | presence | secondary button next to the action | none | F15 (OUT-9) |
| U11 6699:44509 | welcome | picture | asset, size, place, alt | wallet star 200 × 193 at 1032, 227.5 (centred in the card) | `wallet-star@2x.png` 200 × 193 at 1032, 227.5, `alt=""` | match |
| — | welcome | tab title, headings | FR-012 | — | "Welcome · Konnekt"; one h1 | match |
| — | welcome, 1100 / 1031 | steps | layout | not drawn | the row while the text column is 640 wide or more (`@container`, `@min-[640px]`): lines 33.8 at 1100, 10.8 at 1031 | match (W2) |
| — | welcome, 1000 / 800 | steps | layout | not drawn | stacked, 8 apart, no lines (column 609 / 409 wide); picture still shown | W2 |
| — | welcome, 767 / 320 | card, picture | padding, display | not drawn | padding 24, picture hidden (its wrapper, kern.css's `img { display: block }`); 767: steps in a row again (column 672); 320: stacked, card 273 wide, no horizontal scroll (scrollWidth 305) | FR-010 |
| U06 #85 (7137:50569) | first visit, no memory | `/` | page | the first-time homepage 1b | sign-in → `/` → `PageLoader` (U10 frame) → welcome page | match (FR-027) |
| U06 #85 | loading, memory `false` | `/` | page | — | welcome page at once while the list is held (no loader, no flash) | match (R6) |
| U06 #85 | loading, memory `true` | `/` | page | — | the overview's loading state (`AppLayout`, h1 "Your connections", the loader; T044's skeleton later) | match (R6) |
| U06 #85 | after the last deletion | `/` | page | "Deleting the last one shows 1b again" | memory `true`, list answered empty → overview loading, then the welcome page; the flag becomes `false` | match |
| U06 #85 | a draft exists | `/` | page | "a draft … counts" | the real list (three seeded drafts) → overview; flag `true` | match (W11) |
| U06 #86 | — | memory | storage | "Keep this in localStorage so a reload keeps it" | `connection-portal:local-draft:v1:designer:homepage:has-connections` = `'true'` / `'false'`, written on every load (T039) | match |
| — | failed (5xx), memory `false` or none | `/` | page (W2) | not drawn | the overview's error state, whatever the memory says: h1 "Your connections", danger alert "Couldn’t load your connections" with the server's message and "Error ID: 3f2c9a7e-…" (`ErrorNoticeText`), "Try again" (`kern-btn--secondary kern-btn--small`, `mt-10`); the flag not written | W2 |
| — | "Try again", no memory | `/` | page | — | the overview's loading state (not the U10 loading page again), then the result | W2 |
| — | `/get-started` loading | page | frame, loader | "with its loading state" | `WizardLayout` (header pills with the account pill, no step header, no footer) and the 56 px loader with "Loading your connections…" centred in the column (block 608, 430); `sr-only` h1 "Create your first connection"; tab "Loading your connections… · Konnekt" | match (T033, T018) |
| — | `/get-started` loaded | page | step | step 1 | "Step 1 of 4", h1 "Create your first connection", `?local=new-…` written (W11), tab "Create your first connection · Konnekt"; no fade between the loader and step 1 | match |
| — | sign-in without a requested route | redirect | target | `/` (FR-027) | `redirectTarget()` → `/` (was `/get-started`); `from` kept otherwise (also after "Log out") | match |

### U18 Welcome page in the example section (S3) — T042, 2026-11-08

| frame | state | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|
| U18 6793:47676 | welcome | "Start from an example", the example dialog and banners | presence | drawn | none: S3 is the U11 1b page above | F15 (CLAR 2026-11-07 #9, OUT-9) |
| U18 6793:47687, 6793:47688, 6793:47689 | welcome | heading, text, steps | content | as U11 1b | as the U11 table | match (no frame read: U18's audit rows #5, #6 match U11's) |

### U11 Overview (S4) — T043, 2026-11-08

Checked in Chromium (playwright-chrome) at 1455 × 900 (body 1440), 800 × 400 and 320 × 640, signed
in as `designer`, against U11 `6699:44240` (`get_metadata` + `get_design_context`), `6699:44511`
(metadata; the toolbar `6699:44518` by `get_design_context`), `6699:44570` (metadata; the list
`6699:44582` by `get_design_context`); none changed since the audit (the same parts as U11 #4–#9,
#20, #29–#33). The list by Playwright routing: the frame's three rows (Fishing licence published
with its description, Hunting licence draft without, Residents’ parking permit deactivated),
twelve rows for the long page, a `500 {error, message, error_id}` for the error state, a held
answer for loading; the seeded drafts for the real list ("anw" → "Anwohnerparkausweis"). The rows'
own values are T044's table (the rows still render as before, inside the card).

| frame | state | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|
| U11 6699:44244 | with rows | title block | box | 160, 96, 1120 × 64 (heading 40 + hint 24) | h1 160, 96, 1120 × 40; hint 160, 136, × 24 | match |
| U11 6699:44245 | every state | h1 | text, font, colour | "Your connections", heading/x-large 500 32/40 `#0b1220` | `PageTitle size="x-large"`: the same text, 500 32px/40px rgb(11, 18, 32); one h1 | match (C1, FR-012) |
| U11 6699:44246 | every state | hint | text, font, colour | "Each connection links one of your services to the EUDI Wallet. Open a draft to continue, or view an active connection to get its links.", body/default 400 16/24 `#4a5468` | the same text in loading, error, with rows, searching and no results (`LIST_COPY.hint`), 400 16px/24px rgb(74, 84, 104) | match (FR-029a: `hintOf` and its two sentences removed) |
| — | every state | tab title | text | "Your connections · Konnekt" | "Your connections · Konnekt" | match |
| U11 6699:44247 | with rows | toolbar | box, layout | 160, 176 (64 + 112), 1120 × 48; count left, field right | 160, 176, 1120 × 48; `justify-between` | match |
| U11 6699:44248 | with rows | count | text, font, place | "3 connections", label/default 600 16/24 `#0b1220`, 102 wide at y 12 | "3 connections", 600 16px/24px rgb(11, 18, 32), 101.6 × 24 at 160, 188 | match (FR-051 (28)) |
| U11 6699:44519 | searching "fish" | count | text, width | "1 of 3 connections", 134 | "1 of 3 connections", 133.3 | match (FR-051 (27)) |
| U11 6699:44578 | no results "taxi" | count | text | "0 of 3 connections" | "0 of 3 connections" | match |
| — | searching | count | announcement | not drawn | `role="status"` from the first render, so each new count is announced politely | FR-051 (27) (a field's result announced) |
| U11 6699:44250 | with rows | search field | box, fill, line, radius | 920 (160 + 760), 176, 360 × 48; `#f2f5fb`; bottom 2 `#22293a`; 4 | 920, 176, 360 × 48; rgb(242, 245, 251); 2px solid rgb(34, 41, 58); 4px (KERN's input, the `MenuSearchField` panel classes) | match |
| U11 6699:44250 | with rows | icon, placeholder | glyph, place, colour; text | icon-search-small 20 `#1d56f0` at 16, text at 44; "Search connections" 16/24 `#4a5468` | `kern-icon--search kern-icon--small` 20 × 20 at 936, 190, rgb(29, 86, 240); padding-left 44; the same placeholder, muted | match |
| — | every state with rows | search field | visible label | none drawn (placeholder only, U11 #7 PARTIAL) | `label` "Search" (KERN's `kern-label`, 600 16/24, baseline paddings off) 16 left of the field, 854, 188, 50 × 24; the field's accessible name "Search" | FR-051 (27) (visible label, 001-S7.4) |
| U11 6699:44521 (6692:42636) | searching "fish" | field | text, × | "fish" 16/24 `#0b1220`; × "button-tertiary-small · Clear search" in a 48 slot at the end, 40 seen, icon-close-small 20 | "fish" rgb(11, 18, 32); `kern-btn--tertiary kern-btn--small` 40 × 40 at 1236, 180 (slot 1232–1280), icon 20 × 20 at 1246, 190, rgb(29, 86, 240); text stops 48 before the end (`pr-48`) | match |
| 6692:42636 (description) | searching | × | behaviour | "Clicking it empties the field, shows all rows again and keeps focus in the field" | empties, "3 connections", three rows, the focus in the field, the × gone; accessible name "Clear search" | match |
| — | every state | keyboard focus | ring | not drawn | field: KERN's 4 px `#0b1220` ring (as `MenuSearchField` panel, T015); ×, "Clear search", "Create connection": 4px solid rgb(11, 18, 32) | match (FR-009) |
| U11 6699:44252 | with rows | list card | box, fill, border, radius, shadow | 160, 240 (64 + 176), 1120; white; 1 `#e1e6f0`; 12; no shadow | 160, 240, 1120; oklch(1 0 0); 1px solid rgb(225, 230, 240); 12px; none | match (the task's "`--shadow-card`": the frame's card has a border and no shadow, as T003 recorded in §1.3) |
| U11 6699:44583 | no results (no checkbox) | column headers | box, fill, line, padding | 1118 × 41, `#f2f5fb`, bottom 1 `#e1e6f0`, 8 24, gap 24 | 161, 241, 1118 × 41; rgb(242, 245, 251); 1px solid rgb(225, 230, 240); 8px 24px; 24px | match |
| U11 6699:44585–87 | with rows | column headers | text, font, place | "Name" 280 at 24, "Status" 130 at 328, "Date" 160 at 482; label/small 600 14/24 `#4a5468` | 185 / 489 / 643 (161 + 24 / 328 / 482), 280 / 130 / 160 wide; 600 14px/24px rgb(74, 84, 104) | match |
| U11 6699:44254 | with rows | select-all checkbox | presence | drawn | none; the headers start at 24 as `6699:44583` draws them without it | F14 (OUT-10) |
| U15 6699:45206 | — | selection bar | presence | drawn (frames 8, 9) | none | F14 (OUT-10) |
| — | with rows | column headers | semantics | not drawn | `aria-hidden`: the rows say what each value is (a list, not a table); hidden below 640 px, where the rows wrap | FR-012 |
| U11 6699:44628 | no results | block | box, padding, gap | at 42 in the card, 1118 × 152, 32 24, 8 | 161, 282, 1118 × 152; the card 195 high (Figma 195); 32px 24px; 8px | match |
| U11 6699:44629 | no results | message | text, font | "No connections match “taxi”.", label/default 600 16/24 `#0b1220`, at 24, 32 | the same with the typed text (trimmed), 600 16px/24px rgb(11, 18, 32), 185, 314 | match |
| U11 6699:44630 | no results | hint | text, font | "Check the spelling or try another name.", body/small 400 14/24 `#4a5468`, at 64 | the same, 400 14px/24px rgb(74, 84, 104), 185, 346 | match |
| U11 6699:44631 | no results | "Clear search" | text, font, colour | label/default 600 16/24 `#1d56f0`, no underline, at 96 | `button.kern-link`, 600 16px/24px rgb(29, 86, 240), no underline (underlined on hover), 185, 378, 24 high | match |
| U11 #33 | no results | "Clear search" | behaviour | empties the search | empties it, all rows back, the focus moves to the field (the link goes with the result); Enter works from the keyboard | match |
| U11 6699:44298 | every overview state | footer bar | box, fill, line | "Shell/Footer" 0, 828, 1440 × 72, white, top 1 `#e1e6f0`, padding 16 160 | 0, 828, 1440 × 72 (fixed to the window's bottom from 480 px tall), oklch(1 0 0), inset 0 1px 0 rgb(225, 230, 240), padding 16, action in the 1120 column | match (cosmetic 1) |
| U11 I6699:44298;6428:31837 | every overview state | "Create connection" | text, kind, box | primary, 40 high, padding 0 16, label + forward arrow 24, right edge 1280 | `Link` `kern-btn--primary` + `kern-icon--arrow-forward`: 1075, 844, 204.7 × 40 (`wizard-footer`'s 40 px buttons), radius 8, label white; right edge 1280; to `/form-connections/new` | match (cosmetic 1) |
| U04 note 16 (6703:39317) | welcome page | footer bar | presence | "Empty state (1b): … no footer" | the welcome branch renders no footer | match |
| U11 6699:44243 | long list (12 rows) | page end | space above the footer | 48 under the content (Body's bottom padding), then the 72 bar | the card ends 48 above the bar at the bottom of the scroll (slot `mt-32 -mb-48 h-72` in place of the page's padding) | match (U12's inner scroll: T044) |
| — | 800 × 400 | footer bar | position | not drawn | in the flow after the list (`static` below 480 px tall, as the wizard's), no horizontal scroll | W2 (R4's rule for short windows) |
| — | 320 × 640 | toolbar | layout | not drawn | count (16, 248), then "Search" over the field (16, 280 / 16, 312, 273 × 48, the placeholder whole); × at 245, 316; the card's headers hidden; the bar at the bottom, the action 205 × 40 at the right; scrollWidth 305 | FR-010 |
| — | loading (memory `true` or after "Try again") | page | parts | not drawn | h1, hint, `FeedbackLoader` "Loading your connections…", the footer bar; no toolbar, count or card | match (001-S3.5; T044 replaces the loader with skeleton rows) |
| — | failed (5xx) | page | parts, order | not drawn | h1, hint, then the danger alert at 160, 176 ("Couldn’t load your connections", the server's message, "Error ID: 3f2c9a7e-…", "Try again"), the footer bar; no toolbar | W2 (§3 "Error state of a page": right under the title block) |
| — | every state | request | network | — | typing sends nothing: the search filters the loaded list (`filterConnections`) | match (R8) |

### U15 Search (S4) — T043, 2026-11-08

U15 `6699:47845` read as a screenshot (frame 5, the edit dialog over the overview); its page under
the scrim is the U11 frame: the same title block, hint, toolbar (count "3 connections",
"Search connections" 360 wide) and card; none changed since the audit (U15 #4–#7, #9). The
dialog `6699:47905` is S7's (FR-045a); the bulk parts (#8, #21, #27–#31) are F14.

| frame | state | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|
| U15 6699:45204, 6699:45205 | with rows | title, hint | text, place | as U11 6699:44244 | as the U11 table | match |
| U15 6699:47853 | with rows | count | text, place | "3 connections", toolbar left | "3 connections", 160, 188 | match (FR-051 (28)) |
| U15 6699:47855 | with rows | search field | place, placeholder | 360 wide at the right, "Search connections", search icon | as the U11 table | match |
| U15 #7 | searching, no results, cleared | search | ×, "n of m", no-results message, "Clear search", visible label | not drawn here | as the U11 table (frames 1c, 1d) | match (FR-051 (27)) |
| U15 6699:45214, 6699:45219 ff., 6699:45206 | — | checkboxes, selection bar | presence | drawn (frames 8, 9) | none | F14 (OUT-10) |
| U15 6699:45258 | with rows | footer "Create connection" | label, place | primary with the arrow in the footer bar, right | as the U11 table | match (cosmetic 1) |

Notes (T043): `MenuSearchField`'s `panel` variant has no clear button and takes no visible label, so `SearchToolbar.tsx` repeats its input classes; a `clearable` option with a visible label on `MenuSearchField` would let T051's search card share it. `index.css`'s `.wizard-footer .kern-btn { min-height: 40px }` also serves the overview's footer bar. The task cited U04 `6711:39373` for the toolbar; that node is U04 note 19, the toolbar note #16 is `6703:39317` (a citation slip; its text was used from `U04.md`).

### U12, U13 Overview rows (S4) — T044, 2026-11-08

| frame | state | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|
| U13 6739:40593 | with rows | row | box, padding, gap | 1118 × 80 (first), 81 with the line; 16 24; 24, centred | 161, 282, 1118 × 80; 81 for the next rows; 16px 24px; 24px | match |
| U13 6739:40536 | with rows | line between rows | width, colour | top 1 `#e1e6f0`, none on the first | 1px rgb(225, 230, 240) on every row but the first (`not-first:border-t`) | match |
| U13 6739:40549 | draft, no description | row | height, name | 81, the name centred | 81, name at y +29 (472 in a row at 443) | match (FR-029b) |
| U13 6739:40595 | with description | name block | place, width | x 24 (no checkbox), 280, name 24 + description 24 | 185 (161 + 24), 280; name 185, 298 × 24; description 185, 322, 280 × 24 | match |
| U13 6739:40596 | any | name | text, font, colour | link, label/small 600 14/24 `#0b1220` | `Link` to the details, 600 14px/24px rgb(11, 18, 32); underline on hover only | match (U13 #21; "no hover colour", 7366:55276 annotation) |
| U13 7173:52304 | long description | description | font, colour, cut | body/small 400 14/24 `#4a5468`, one line, "…" | 400 14px/24px rgb(74, 84, 104), `truncate` (scrollWidth > clientWidth) | match (FR-032) |
| U13 6739:40598 | any | status column | place, pill | x 328 (in the row), 130 wide; Status/Connection 24 high | pills at 489 (161 + 328): Active 72.8 × 24, Draft 66.3 × 24, Deactivated 110.5 × 24 | match (T019's pill unchanged) |
| U13 6739:40615 | scheduled | pill | type | "Scheduled", "Active from 01.12.2026" | built as an active row: "Active", "Edited <date>" | F1 |
| U13 6739:40543, 6739:40570 | active, deactivated | date | text | "Published 12.09.2026", "Deactivated 20.10.2026" | "Edited 12.09.2026", "Edited 20.10.2026" | F52 |
| U13 6739:40556 | any | date | place, font, colour, format | x 482, 160 wide; body/small 14/24 `#4a5468`; dd.mm.yyyy | 643 (161 + 482), 160; 400 14px/24px rgb(74, 84, 104); "Edited 03.10.2026" (`formatRowDate`, de-DE 2-digit) | match (cosmetic 3) |
| U17 6699:48031 | draft with its step | date | text, wrap | "Edited 28.10.2026 · Rules step", wraps in the 160 column | `rowMetaOf` writes "Edited 28.10.2026 · Rules step" when the summary carries the step (tested); the list's `FormConnectionSummary` has no `step`, so the seeded drafts read "Edited 08.11.2026" | F71 deferred (CLAR #62, deferred.md group A) |
| — | any | numerals | features | `"zero" 1, "lnum" 1, "tnum" 1` | `font-variant-numeric: tabular-nums slashed-zero` (KERN's) | match |
| U13 6739:40603 | any | "View" | kind, box, icon, label | button-tertiary-small, 82 × 40 visible in a 48 slot at x 871 of the row; icon-visibility-small 20 `#1d56f0`; 600 14/24 `#1d56f0`, no underline | `kern-btn--tertiary kern-btn--small` with `kern-icon--visibility`: 1031.9, 302, 82 × 40 (Figma 1032); icon 20 × 20 rgb(29, 86, 240); 600 14px/24px rgb(29, 86, 240), no underline | match |
| U13 6739:40604 | any | "Edit" | kind, box, border | button-secondary-small, 77 × 40 at 90; 1 `#1d56f0` inside, radius 8; icon-edit-small | `kern-btn--secondary kern-btn--small px-7!` (KERN draws the border outside its 8 px): 1122, 302, 77 × 40; 1px rgb(29, 86, 240), 8px; `kern-icon--edit` | match |
| U13 6739:40605 | any | Delete | kind, box, icon | button-tertiary-small icon only, 40 in a 48 slot at 175; icon-delete-small `#C4271C` | `kern-btn--tertiary kern-btn--small` + `kern-sr-only`: 1211, 302, 40 × 40; `kern-icon--delete` rgb(196, 39, 28) (`bg-kern-feedback-danger!`) | match |
| U13 6739:40605 (layer name) | any | Delete | accessible name | "Delete <name>" | "Delete Passenger transport licence" (per row) | match (FR-028) |
| — | any | View, Edit | accessible name | not drawn | "View <name>", "Edit <name>" (`sr-only` in the label) | match (FR-028, 001-S3.2) |
| U13 6739:40560 | draft | actions | which | View, Edit, Delete as every row; no "Continue" | View (details), Edit (the editor at the stored step: the seeded "Führerscheinantrag Stuttgart" opened at "Rules"), Delete | match (cosmetic 2) |
| U13 6739:40532 | any | checkboxes | presence | select-all and per row | none | F14 |
| U13 7366:55276 | cut description, hover | tooltip | box, place | 280 × 64 at the description's left, 6 below it; `#0b1220`, radius 8, 8 16, body/small white | 185, 354, 280 × 64 (8 below, §3 "Tooltip"); rgb(11, 18, 32), 8px, 8px 16px, 400 14px/24px white | match (FR-051 (35); 8 vs 6: the tooltip pattern's 8, U81) |
| U13 #20 | not cut, hover | tooltip | presence | only on a cut description | none on "Annual permit for fishing in public waters." | match |
| — | name keyboard focus | tooltip | shows | not drawn ("A keyboard trigger isn't drawn") | shows while the name has keyboard focus (cut only); Escape closes it; the name's ring 4px solid rgb(11, 18, 32) offset 2 | FR-051 (35) (on focus), FR-009 |
| — | touch | tooltip | shows | not drawn | a tap on the cut description toggles it, a tap elsewhere closes it | FR-052g |
| — | any | tooltip | semantics | — | `aria-hidden` (the description is whole in the page for screen readers); no `title` | FR-051 (35) |
| U12 6699:44931 | 20 rows | card | box | 160, 240, 1120 × 564 (frame 900); rows area clipped, the next row cut at the bottom | 160, 240, 1120 × 564; rows `overflow-y: auto`, 521 high (Figma 517 with its 45 px checkbox header; ours 41, F14); "Fishing licence" cut at the card's bottom | match |
| U12 6699:44915 | scrolled | header row, title, toolbar, footer | stay | in place | after scrolling the rows by 300: header 241, h1 96, page `scrollY` 0, document 900 high | match |
| U12 6699:44915 | 20 rows | card → footer bar | gap | 24 (card ends 804, bar at 828) | card ends 804, bar at 828 (slot `mt-8`; was `mt-32` = 48, T043) | match (T043's "48 under the content" corrected: U12's Body runs 24 under the bar) |
| U12 6699:45195 | scrolled | scrollbar | look | 4 px thumb inside the card | the browser's own scrollbar of the rows | match (native control) |
| — | 320 × 640, 3 rows | rows | layout | not drawn | the name on its own line (41, 393, 223 × 48), status and date on the next (41 / 138, 449), the actions on the third (View 41, Edit 131, Delete 220, 485); headers hidden (`@max-[58rem]`); rows 168 high; scrollWidth 305 | W2, FR-010 |
| — | 320 × 640 | page | scroll | not drawn | the inner scroll applies from 768 × 480 only: below, the page scrolls (document 988), the card ends 24 above the fixed bar at the end | W2 (no box of one row scrolling) |
| — | 320 × 640 | tooltip | place | not drawn | across the row (33, 417, 239 wide), scrollWidth 305 | FR-010 |
| — | loading (memory `true` / "Try again") | list | skeleton | U06 #95 "skeletons in the final layout" | `div role=status` "Loading your connections…" (sr-only); the toolbar's 48 kept empty; the card at 160, 240 with its headers and 3 skeleton rows 80 high: name bar 160 × 10 `#e4e8ef` at 24 / 24 in the row, description 220 × 10 `#eff1f5`, status 72 × 10 strong at 328, date 96 × 10 light at 482, radius 4 | match (001-S3.5, §3 "Skeleton") |
| — | failed (5xx) | page | alert | not drawn | as T043's table (160, 176, "Couldn’t load your connections", the server's message, "Error ID: 3f2c9a7e-…", "Try again"); "Try again" shows the skeleton rows, then the alert again | W2 (UNCERTAIN 4: no separate "way back") |

### U17 After Save and exit (S4) — T044, 2026-11-08

| frame | state | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|
| U17 6699:48002 | arriving from Save and exit | toast | text, kind | "Draft saved. You can pick it up any time.", type=success with the filled check | the same, `kind: 'success'`, rgb(29, 122, 46), the check | match |
| U17 6699:48002 | arriving from Save and exit | toast | box | 564, 748, 313 × 56 (frame 900, 24 above the footer) | 563, 748, 313 × 56 | match (T036's centring ±0.5) |
| — | arriving from Save and exit | status paragraph | presence | none drawn | the old polite `p` "Draft <name> saved." is gone; the toast's live region announces | match (W1 by the toast) |
| — | reload after it | toast | shown again | — | no (the router state is cleared once read) | match |
| U17 6699:48024 | after Save and exit | draft row | meta | "Edited 28.10.2026 · Rules step" | see the U12/U13 table | F71 deferred (CLAR #62, deferred.md group A) |

### U14, U90 Row delete (S4) — T044, 2026-11-08

| frame | state | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|
| U14 6699:44419 | draft | dialog | title | "Delete “Hunting licence”?" | "Delete “Hunting licence”?" (`DELETE_DIALOG_COPY.title`) | match |
| U14 6699:44419 | draft | dialog | body | "Its documents and rules will be deleted too." | "Hunting licence will be deleted for good. It was never live, so nothing changes for serviceBW." | F55 |
| U14 6699:44419 | deactivated | dialog | body | "Its documents and rules will be deleted too." (frame "3 · Delete a draft or deactivated connection?") | the same | match |
| U14 6699:44480, U90 6417:31599 | active | dialog | body | "This connection is active. Citizens won’t be able to use it, and its links stop working." | the same | match |
| U14 6872:45929 | scheduled | dialog | body | "This connection will be active from 01.12.2026. …" | not built | F1 |
| U14 6699:44419 | open | dialog | box, buttons | 480 × 256 centred; "Keep connection" secondary 200 × 48 at 512, "Delete connection" filled danger at 728 | 480, 322, 480 × 256; 512, 498, 200 × 48 transparent; 728, 498, 200 × 48 rgb(196, 39, 28) | match (T035's table) |
| U14 #17 | open | scrim click | closes | no (FR-052a) | stays open (`dismissOnScrim={false}`) | match |
| — | open | Escape, ×, "Keep connection" | closes, focus | closes, back on the opener | closes; focus on "Delete <name>" of that row | match (FR-009) |
| — | open | focus | where | — | on the × when it opens (T035) | match |
| — | working | buttons | state | not drawn | "Deleting…", every button busy, nothing closes it (T035) | FR-008 |
| — | failed (5xx, routed) | dialog | alert | not drawn | "Couldn’t delete", the server's message, "Error ID: 3f2c9a7e-…"; confirm reads "Try again"; the row stays | FR-008 |
| — | failed (404 / 409, routed) | dialog | alert, close | not drawn | the server's message; closing loads the list again (one `GET`) | FR-008 (UNCERTAIN 3) |
| U90 6699:48039 | after delete | list | row, count | the row gone, "3 connections" | the row gone, "3 connections" (routed `DELETE` of a published row: 200) | match |
| U90 6699:48098 | after delete | toast | text | "“Passenger transport licence” deleted." + "Undo" | "“Fishing licence” deleted.", no Undo | F4 |
| U90 6699:48098 | after delete | toast | kind | type=danger, red with the bin | neutral ink rgb(11, 18, 32), 623, 748, 193 × 56 (24 above the bar) | UNCERTAIN (T036: `kind` is neutral / success; the component description lists "deleted" under neutral) |
| — | after delete | focus | where | not drawn | the page's h1 "Your connections" (the opener is gone) | FR-009 |
| — | after the last delete (real seeded drafts) | page | view | the welcome page (FR-027) | "Welcome to Konnekt" in the same `AppLayout`, tab title "Welcome · Konnekt", no footer, the focus on its h1, the toast 24 above the window's edge (578, 820); a reload shows the welcome page at once (memory `false`) | match (FR-027, T042) |
| — | 320 × 640 | dialog | box | not drawn | 16, 88, 273 wide, buttons stacked (T035) | match (FR-010) |

Notes (T044): checked with routed `GET /api/form-connections` answers for the frames' rows, twenty rows (U12), a held answer and a 5xx, routed `DELETE`s for published rows (no EUDIPLO here), and the real delete of the three seeded drafts down to the welcome page (re-seeded; new ids `a15ead2e…`, `b234a1c0…`, `99131ac1…`). The row reuses `InfoTooltip`'s exports (`tooltipReducer`, `isOpen`, `CLOSED`, `TOOLTIP_BOX`, `bubblePlacementClass`, `TOOLTIP_WIDTH`, `TOOLTIP_HEIGHT`) for the description's tooltip because `useTooltip` isn't exported; exporting it (or a `TextTooltip`) would remove the copy in `FormConnectionRow.tsx`. The footer slot's gap is 24 (U12: the card ends 24 above the bar), not T043's 48. No new AA pair (the bin `#c4271c` on white is an icon, 5.4:1).

### U16 Local drafts offer (S5) — T045, 2026-11-08

Checked in Chromium (playwright-chrome) at 1455 × 900 (`scrollbar-gutter: stable`, body 1440),
1455 × 768 / 700 / 600 / 520 for the capped column, and 335 × 800 (body 320), with the `designer`
account and the three seeded drafts. Frames read: U16 `7362:54543` (`get_design_context`),
`7362:54614` (screenshot), U14 `6699:44480` (`get_design_context`); none changed since the audit
(the inventory of `figma-audit/units/U16.md` and T029's §5.1 table stand). Local drafts were
written into `localStorage` in the store's format 2 (a stored draft's record
`draft-b234a1c0…` named "Passenger transport licence", 06.11.2026 13:20 UTC; never-saved records
`new-2222…` "Taxi licence", an 84-character name, "Written in another tab"), all removed
afterwards; the server's drafts are untouched. The welcome page and `/get-started` were reached by
answering `GET /api/form-connections` with `[]` (`page.route`, GET only). The browser's zone is
UTC, so the times read one hour earlier than the frame's. Fonts: `document.fonts.check` true for
400 14px and 600 16px "Fira Sans". The banner's own anatomy (fill, border, padding, type, buttons,
hover, focus ring) is T029's §5.1 table and was re-seen unchanged.

| frame | state | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|
| U16 7362:54550 | one, overview | banner | place | under the title block 16, above the toolbar 16 (title 96–160, banner 176–258, toolbar 274) | title 96–160, banner 176 × 1120 × 82, toolbar row 274 | match |
| U16 7362:54621 | several, overview | banner | place, size | 176–396 (220 high), toolbar 412 | 176, 1120 × 220, toolbar row 412 | match |
| U16 7362:54550 | one, overview | banner | width | 1120 (the page column) | 1120 at x 160 | match (closes T029's "deferred to T043") |
| U16 7362:54550 | one | banner | place | between the page title and the toolbar | between `PageTitle` and `SearchToolbar` | match (closes T029's "deferred to T045") |
| — (U12, T044) | several, overview, short window | banner | height | keeps its height, the list card shrinks and its rows scroll | `flex-shrink: 0` (wrapper `contents [&>section]:shrink-0`); 220 at 900, 768, 700, 600 and 520 | match |
| — (U12, T044) | several, overview, 1455 × 600 / 520 | list card | height | at least one row | T045 found 28 / 2 (the card `min-h-0` with `overflow-hidden` shrank below its header + a row); the coordinator set `LIST_CARD_CLASSES` `min-h-123` (header 41 + row 80 + border 2): with a 300 px block in the offer's place the card stays 123 high at 1455 × 600 and 520 and the page scrolls (document 775 high) | match (fixed by the coordinator) |
| — (S3, 005-S4) | several, welcome | banner | place | no frame: above the page (contracts S3 "shows above the page") | 96 (32 under the header area), 1120 × 220; h1 "Welcome to Konnekt" at 348, 32 under the banner (`[&>section]:mb-16` + the column's 16) | UNCERTAIN 1 (spacing and order chosen) |
| — (S3) | after the last discard, welcome | page | spacing | the welcome page as U11 `6699:44481` draws it | h1 back at 96, no gap left by the empty offer (the status paragraph is `sr-only`, absolutely placed; the dialog closed) | match |
| — (S3) | after the last discard, overview | page | spacing | toolbar 16 under the title | toolbar row 176 (160 + 16) | match |
| — (005-S4, 001-S4.5) | `/get-started` | banner | place | above step 1's card | under the step header (216 = 192 + 24), card 32 under it (WizardLayout's `gap-32`), 1120 wide | match |
| — (005-S4.11) | `/get-started` | offer | own record | the flow's own local draft isn't listed | after typing "Own flow T045" the flow wrote `new-e872…`; the offer still listed the other two | match |
| U14 6699:44480 | discard dialog | dialog | box | 480 wide, radius 12, 1 `layout-border` #6b7488 | 480 at 480, 310; 12px; `ring-1 ring-inset` rgb(107, 116, 136); 280 high (three body lines with the stored-draft sentence, Figma's two-line sample 256) | match |
| U14 6699:44480 | discard dialog | title | font, place | `title/large` 600 24/32 #0b1220, 32 from the left, 16 from the top | "Discard unsaved work?" 600 24px/32px, 32 / 16 | match (005-S4.8's copy) |
| U14 6699:44480 | discard dialog | body | font, copy | `body/large` 400 18/24 #0b1220 | 18px/24px rgb(11, 18, 32); "The unsaved changes to Passenger transport licence will be deleted from this device. This can’t be undone. The saved draft stays as it is." (never-saved: without the last sentence) | match (005-S4.9) |
| U14 6699:44480 | discard dialog | buttons | look | secondary "Keep connection" and filled danger #c4271c, 200 × 48 each, gap 16, footer divider | "Cancel" 200 × 48, 1px rgb(29, 86, 240); "Discard" 200 × 48 rgb(196, 39, 28) | match (005-S4.9's labels) |
| — (T035, FR-052a) | discard dialog | scrim click | closes | yes (`dismissOnScrim` default on) | a press on the scrim closed it, focus back on "Discard changes in Passenger transport licence"; a press inside kept it open | match |
| — (005-S4.7) | discard dialog | Escape | closes | closes, focus back | closed, focus back on the item's "Discard" | match |
| — (005-S4.10) | after discard, first of two | focus, status | focus moves, status announced | next item's "Resume editing", "Unsaved work discarded." | focus on "Resume editing Taxi licence" (`?local=new-2222…`), now in the one-draft layout; status text "Unsaved work discarded." after `LIVE_REGION_DELAY_MS` | match |
| — (005-S4.10) | after discard, last of two | focus | the heading | the h2 | focus on h2 "Unsaved changes in “Passenger transport licence”" (welcome page) | match |
| — (005-S4.10, FR-028) | after discard, the last item | focus | the page's h1 (`emptyFocusRef`) | the overview's h1 / the welcome page's h1 | focus on h1 "Your connections" (overview) and h1 "Welcome to Konnekt" (welcome page); the section gone, the status kept | match |
| — (005-S4.12) | other tabs, overview | offer | follows writes | a record written in another tab appears | tab 2 (`/account`) wrote `new-2222…`: tab 1's banner turned from "Unsaved changes in “Passenger transport licence”" into "Unsaved changes in 2 connections" | match |
| — (005-S4.12) | other tabs, overview | offer | follows discards | a discard in another tab removes the item | tab 2 discarded "Taxi licence" through its own offer: tab 1 showed the one-draft banner | match |
| — (005-S4.12) | other tabs, `/get-started` | offer | follows writes | as on the overview | "Written in another tab" appeared first (newest first): "Unsaved changes in 3 connections" | match |
| — (W5, FR-021) | blocked storage | offer | hidden, nothing logged | no section, no console output | a tab whose `window.localStorage` getter throws `SecurityError` (init script), with records in the real storage: no offer on `/` (and `/get-started` → overview, connections exist); no console message, no page error | match |
| — (W11, 005-S4.6, FR-029e) | Resume editing, overview | link | target | `/form-connections/new?local=<flowKey>` | "Resume editing Passenger transport licence" → `/form-connections/new?local=draft-b234a1c0…`, name field "Passenger transport licence" | match |
| — (W11) | Resume editing, `/get-started` | link | target | as above, also for a never-saved item | "Resume editing Taxi licence" → `/form-connections/new?local=new-5555…`, name "Taxi licence"; no leave dialog, the first-connection flow's own record kept (it is offered again) | match (baseline: the leave dialog covers the product name, breadcrumb, log-out, closing the tab) |
| — (FR-010) | 320 px, welcome and overview | banner | layout | — | 288 wide; several: name, line, buttons on rows of their own, the 84-character name wrapping; `scrollWidth` 320 on both pages; overview gaps 16 / 16, welcome gap to the h1 32 | match |
| — (FR-029d) | one | structure | h2 and a one-item list | — | region named by the h2, list of 1 with `sr-only` "Taxi licence" and "New, never saved · 05.11.2026, 08:12"; sub-line "Saved only on this device on 05.11.2026, 08:12, when the page closed. Nobody else can see them." | match |

Notes (T045): the offer sits above the welcome page's h1 (contracts S3, "above the page"; 32 px to the h1, nothing left when hidden), so its h2 comes before the page's h1 in the reading order (for the AA review, T096); between the title and the toolbar on the overview (`shrink-0` in the capped column); above step 1's card on `/get-started` (rendered by `FormConnectionEditor`). The spacing comes from the page through `contents` wrappers (`[&>section]:mb-16`, `[&>section]:shrink-0`) because `LocalDraftsOffer` takes no `className`. Live-region texts checked (quickstart V2's screen-reader step):

- `p[role="status"][aria-live="polite"][aria-atomic="true"]` (sr-only), rendered by
  `LocalDraftsOffer` before its section: empty until a discard, then empty again and
  "Unsaved work discarded." after `LIVE_REGION_DELAY_MS`, at every discard (seen after the first
  of two, the last of two, and the last item on the overview and on the welcome page). It stays
  in the page after the last item's discard (the section goes), so the status is still read.
- Focus after a discard, the screen reader's next announcement: the next item's link "Resume
  editing <name>", else the h2 "Unsaved changes in “<name>”" / "Unsaved changes in <n>
  connections", else the page's h1 ("Your connections", "Welcome to Konnekt"; on `/get-started`
  the wizard's title, `titleRef`).
- Buttons' accessible names: "Discard changes in <name>" and "Resume editing <name>".
- The dialog: `role="dialog"` modal, named by its title "Discard unsaved work?", described by the
  body text; the initial focus on "Close".

### U17 Entering and leaving a flow (S6) — T048, 2026-11-08

Checked in Chromium (playwright-chrome) at 1455 × 900 (body 1440) and 320 × 640, signed in as
designer, on new flows, on a draft created for the check (deleted afterwards) and, for the rule
question only, on the seeded "Führerscheinantrag Stuttgart" with its saves routed to abort (its
version stayed 3). A failed save, the 5xx with its error ID, the 400, the conflicts and a slow or
failed load by Playwright routing. The leave model's behaviour is T047's table above.

| frame | state | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|
| U17 `7173:52682` | leave dialog | dialog | box | 480 × 256, centred | 480 × 256 at x 480, y 322 (900 high) | match |
| U17 `7173:52682` | leave dialog | title, text | copy | "Leave this connection?" / "If you leave now, you lose all progress. Save it to continue later, or discard the connection." | the same (`LEAVE_COPY`) | match |
| U17 `7173:52682` | leave dialog | "Discard connection" | style, box | button-secondary, 1 px `feedback/danger` #c4271c, label #c4271c, flex-1 (200 × 48 at 512) | `kern-btn--secondary kern-btn--danger`, border rgb(196 39 28), 200 × 48 at x 512 | match |
| U17 `7173:52682` | leave dialog | "Save progress" | style, box | button-primary #1d56f0, 200 × 48 at 728 | rgb(29 86 240), 200 × 48 at x 728 | match |
| U17 `7173:52682` | leave dialog | × | presence | button-tertiary 48, icon-close | the ×, "Close"; the focus starts on it | match |
| U17 `7173:52681` | leave dialog | Escape, ×, scrim | closing | × (FR-052a: scrim closes) | stays in the flow, focus back on "Your connections" / "Konnekt" (T047) | match |
| U17 `6408:72919` | log-out dialog | title, text | copy | "Save before you log out?" / "Your latest changes will be lost if you log out now." | the same | match |
| U17 `6408:72919` | log-out dialog | buttons | which, style | "Log out anyway" (secondary, action blue), "Save and log out" (primary), ×; no Cancel | "Cancel" (tertiary), "Log out anyway" (secondary), "Save and log out" (primary), × | F20 (Cancel added) |
| U17 `6408:72919` | log-out dialog | dialog | box, layout | 480 × 232, two buttons side by side | 480 × 360: three buttons stacked 416 × 48 (Cancel 422, Log out anyway 486, Save and log out 550) | F20 + §5.1 ConfirmDialog (three buttons stack in 480) |
| — | log-out dialog | Cancel | focus | not drawn (F20) | back on the account pill | match (F20) |
| — | rule question | "Save changes to Rule 01?" | anatomy | not drawn (005-S1.1) | `ConfirmDialog` 480 × 232, "You changed this rule but haven’t saved it yet.", "Discard" (secondary) and "Save changes" (primary), ×; asked after "Save progress"; Escape cancels the save, nothing sent | match (Pattern: Dialog) |
| U19 `6699:45346` | create flow, step 1 | info strip | fill, border | `feedback/info-background` #e0f2fe, border-top 1 `decorative-border` #e1e6f0 | rgb(224 242 254), 1px solid rgb(225 230 240) | match |
| U19 `6699:45346` | create flow, step 1 | info strip | padding, gap, height | 8 24, gap 8 (40 + border) | 8px 24px, gap 8, 41 high | match |
| U19 `6699:45346` | create flow, step 1 | ⓘ | size, colour | icon-info-small 20 × 20, blue (build note 35, `feedback/info`) | `kern-icon--info kern-icon--small` 20 × 20, rgb(2 115 174) (`bg-kern-feedback-info!`), 24 from the left | match (§1.5's AA info blue) |
| U19 `6699:45346` | create flow, step 1 | text | type, copy | `body/small/regular` 14/24 400, `layout/text/default` #0b1220, "Starts as a draft. It only becomes active when you publish." | 400 14px/24px Fira Sans, rgb(11 18 32), the same text | match |
| U19 `6699:45346` | create flow, step 1 | info strip | place | the card's bottom row | the card's bottom row, the card's 7 px bottom corners | match |
| U98 `6731:39846` | edit flow of a published connection | info strip | presence, copy | the draft note in the create flow only (FR-026g); U98 draws its own note in the strip | the edit flow's strip reads F49's note (T049) | match (F49) |
| — | 320 | info strip | reflow | not drawn | 271 wide, the text wraps (89 high), no horizontal scroll (305 = client less gutter) | match (FR-010) |
| U17 `6401:71705` | saving | footer | "Save and exit" | the save icon and "Save and exit" (tertiary) behind a "Saving your draft..." modal | no modal (F21): `aria-disabled="true"`, "Saving…", the save icon, keeps the focus | F21 |
| — | saving | status | polite region | not drawn (FR-033) | `role="status"` `aria-live="polite"` reads "Saving draft…" | match (FR-033) |
| U51 `6197:11098` | failed save, 5xx | toast | copy, action | "Couldn't save. Check your internet connection and try again." + "Try again", no error ID | the same, "Error ID: abc123def456" on its own line (FR-033) | match; error ID FR-033 |
| U51 `6197:11098` | failed save | toast | box, fill | 495 × 56, 96 above the bottom (footer 72 + 24), ink #0b1220 | 496 × 80 (the ID line), x 472, 96 above the bottom, rgb(11 18 32) | match (T036's table) |
| — | failed save | focus | FR-033 | not moved | stays on "Save and exit" (or on "Konnekt" after a leave dialog's "Save progress") | match |
| — | failed save | the old alert | presence | none (F67) | `SaveDraftAlert` deleted, no `.kern-alert` in the step | match |
| — | failed save, network | toast | copy | as U51 | the same text, "Try again", no ID | match |
| — | failed save | lifetime | R8 | until used or dismissed | stays; Escape on it dismisses it; a change of step and a new save take it away; replaces the step's toast (one at a time) | match (R8) |
| — | "Try again" | focus | not drawn | — | the toast goes with its button; the focus moves to "Save and exit", which reads "Saving…"; success → overview with "Draft saved. You can pick it up any time." | W20 |
| — | failed save, 400 | toast | copy | not drawn | the server's message, no "Try again", gone after 6 s | UNCERTAIN (T048 report) |
| U90 `6417:31599`, U17 `7173:52682` | conflict `draft_changed` | dialog | anatomy | dialog 480, title, ×, body, footer with a line (U90's dialog) | 480 × 456: "This draft has changed", the server's message, then the hint 16 below; "Cancel" (tertiary), "Reload" (secondary), "Replace their changes" (primary) stacked 416 | match (W3, three buttons stack) |
| U90 `6417:31599` | conflict `draft_published` | dialog | anatomy | two buttons side by side, secondary left, primary right | 480 × 304: "Cancel" (secondary) 200, "Open the connection" (primary) 200 | match (W3) |
| U90 `6417:31599` | conflict `draft_deleted` | dialog | anatomy | as above | 480 × 256: "This draft has been deleted", the deleted text once, "Cancel" / "Save as new draft" | match (W3) |
| — | each conflict | Escape | closing | — | closes, focus back on "Save and exit", work kept | match (005-S2) |
| U17 `7173:52681` | restore dialog | dialog | anatomy | U17's dialog: 480, ×, the scrim #0b1220 at 72 % | `ConfirmDialog` 480 × 256 at x 480; scrim rgb(11 18 32) 0.72; fades (`motion`) | match (W4) |
| — | restore dialog | buttons | which | 005-S5 | "Discard them" (secondary, x 512) and "Restore changes" (primary, x 728), 200 × 48 each | match |
| — | restore dialog | Escape, ×, scrim | closing | FR-049, F57 | each opens the draft's details (`/form-connections/:id`) and keeps the local draft: the next opening asks again | match (F57) |
| — | restore dialog | focus | not drawn | — | on the × when it opens (Pattern: Dialog); before: on "Restore changes" | Pattern: Dialog |
| — | restore dialog | h1 | FR-012 | — | the header's connection name (`titleAsHeading`); the dialog's title is the h2; tab "Restore your unsaved changes? · Konnekt" | match |
| — | "Restore changes" | result | 005-S5 | — | the flow with the local draft's content ("T048 check draft 2"), focus on the page title | match |
| — | loading a flow (W10) | page | skeleton | U06 #95 | `FormConnectionLoadState`'s skeleton card in the wizard frame, "Loading the connection…" | match (T017/T033) |
| — | load failed, 5xx (W10) | page | alert | the design's alert with the error ID | h1 "Couldn’t load the connection", the danger alert "Check your connection and try again." with "Try again" and "Go to connections"; **no error ID** | deferred to T080/T083 (T037's W2 row: `useFormConnection` keeps no notice; not T048's files) |
| — | /get-started (W11) | step 1 | validation | 001-S4.3 | "Continue" without a name: "Enter a name for the connection.", aria-invalid, the field focused | match |
| — | /get-started?local=<key> (W11) | bookmark | reopening | 001-S4.5, 005-R.2 | no connection yet: the wizard resumes the key's work ("T048 bookmark"); connections exist: the overview, which offers the work | match |
| — | log-out warning cancelled (T047 edge 6) | editor | after "Save and log out" | not drawn | UserMenu's "Log out and discard unsaved work?" (other local drafts) → Cancel → the overview with "Draft saved. …" (no stuck "Saving…") | fixed (see notes) |
| — | log-out warning cancelled | editor | after "Log out anyway" | not drawn | → Cancel → the overview; the flow's local draft gone, the other one kept | fixed (see notes) |

### U17 Leaving a flow (S6, behaviour) — T047, 2026-11-08

verify: `npm test` — `leaveFlow.test.ts`, 145 tests: every state × action of `leaveFlowStep()`
(idle, leaveAsked new/draft, saveAsked, logoutAsked per origin, saving per origin × after), the
reducer, whole answers, and `hasUnsavedWork()` (agrees with the local draft's write/remove in a new
or draft flow; ignores the rule counters for a published connection). Workspace gates green:
rules 2345, frontend 879, mcp 408 tests.

Behaviour checked in the running app (Playwright, Chromium; the dialogs' look is T048's):

| flow | trigger | result |
|---|---|---|
| new, empty | probe `beforeunload` | not cancelled (no listener) |
| new, name typed | probe `beforeunload` | cancelled (listener on); name cleared again → off |
| new | "Konnekt" / "Your connections" | "Leave this connection?" with "Discard connection", "Save progress", ×; Escape and × keep the flow, focus back on the link |
| new | "Save progress" | draft stored, overview with "Draft saved. You can pick it up any time.", local draft gone |
| new, description only | "Save progress" | stays, step 1, name focused, aria-invalid, "Enter a name for the connection." |
| new | "Discard connection" | overview, nothing stored, local draft removed, no local-drafts offer |
| draft (no changes) | "Konnekt" | "Leave this connection?" |
| draft (changed) | "Log out" | "Save before you log out?" / "Your latest changes will be lost if you log out now." / Cancel, Log out anyway, Save and log out; Cancel and Escape → focus on the account pill |
| draft (changed) | "Save and log out" | draft saved (name changed), sign-in screen with "You’re logged out.", no local draft |
| new (named) | "Log out anyway" | signed out, nothing stored, local draft removed |
| draft, rule editor changed | "Save progress" | "Save changes to Rule 01?" first; × → stays, nothing sent, asks again; "Discard connection" skips the rule question |
| published (GET intercepted) | "Your connections" without changes | leaves at once |
| published, renamed | "Konnekt" | "Save your changes?" / "If you leave now, your changes are lost. Save them, or discard them and keep the active version." / Discard changes, Save |
| published | "Save" | "Ready to save?" (the current save dialog); Escape → stays, asks again |
| published | "Discard changes" | overview, no request sent |
| /get-started (list GET intercepted) | "Konnekt" → "Discard connection" | asks, leaves, local draft removed |

A person must check (Playwright dismisses `beforeunload` prompts): reloading and closing the tab
with unsaved work shows the browser's "Leave site?" in Chrome, Firefox and Safari; without unsaved
work (a fresh flow, a draft as loaded, a published connection as loaded) and after "Save progress",
"Discard connection", "Save and log out" or "Log out anyway", no prompt appears.

Decisions the coordinator accepted (T047's UNCERTAIN list; reversible in `leaveFlowStep()`):


1. **Create and draft flows always ask** "Leave this connection?", also without unsaved work
   (FR-026 and #8 are unconditional); the **edit flow asks "Save your changes?" only with unsaved
   changes** and otherwise leaves at once (V8 step 3 "with changes"; "Save" would open a save dialog
   for nothing). Core behaviour: only the no-changes case differs. One line to change in
   `leaveFlowStep()` (`askLeave`) plus its tests.
2. **The rule question comes after the leave answer, not before the leave dialog**: only the
   answers that store ("Save progress", "Save", "Save and log out") go through "Save changes to
   Rule 01?" (005-S1.1's order, Q8 (c) "a rule is saved or discarded before the draft is stored");
   "Discard connection" and "Log out anyway" never ask. Asking before the leave dialog would need a
   new `LeaveEditorAction` in `RulesStep/types.ts` (not T047's file). Core behaviour: the order of
   the two questions.
3. **"Save and log out" in the edit flow of a published connection** (data-model says "stores the
   draft"; that flow has no draft): it opens the save dialog, and once saved logs out instead of
   opening the details. Not core for create/draft.
4. **"Unsaved work"** (`hasUnsavedWork()`): in a new or draft flow exactly while its local draft
   holds a record (content ≠ baseline, or always for a record resumed through `?local=`); in the
   edit flow, the content ≠ as loaded, rule counters ignored. Decides the log-out question, the
   edit flow's leave question and `beforeunload`.
5. **Asking while busy**: the product name and "Log out" do nothing while a save or publish runs
   (the save leaves anyway); a running "Save and exit" can't be doubled from a dialog.
6. **Edge (not core)**: after "Save and log out" (or "Log out anyway") UserMenu's local-drafts
   warning still follows when the account has *other* local drafts on the device (T031). If the team
   member cancels that warning, they stay in the editor: after a save the footer stays "Saving…"
   (nothing can be stored twice, but the header's leave is ignored while busy); after "Log out
   anyway" the flow's autosave stays off (forgotten). Q8 (e) drops "Log out and discard unsaved
   work?"; whoever retires that warning (or adds a cancel callback to `onLogOut`) removes the edge.

### U19 Step 1 Connection (S7) — T049, 2026-11-08

Checked in Chromium (playwright-chrome) at 1455 × 900 (body 1440) and 320 × 640, signed in as
designer, on `/form-connections/new`, on a draft created for the check ("T049 check", its edit
route; deleted afterwards) and, for the edit flow, on that draft's GET routed to a published
connection (`status: 'published'`, `is_active: true`, U98's sample name and description). The too
long state with `maxlength` removed from both fields (the attributes stop typing past the limit);
the API's 400 by routing the draft's PUT. Fonts: `document.fonts.check` true for Fira Sans 400 and
600 at 16 px. Figma frames at 1440 × 900; positions compared at the same scale.

| frame | state | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|
| U19 `6699:45327` | empty | step head | step line | "Step 1 of 4", 4 segments, the first blue, "Next: Documents" | the same (`WizardProgress`), `role="progressbar"` "Step 1 of 4", valuenow 1, 912 wide at y 106 | match (T032) |
| U19 `6699:45327` | empty | step head | title, description | "Name your connection" heading/large 24/32 600; "Link a service to the EUDI Wallet so citizens can share verified data." 14/24 muted | h1 "Name your connection" 24px/32px 600 at y 136; the hint as drawn; tab "Name your connection · Konnekt" | match |
| U18 `6793:47711` | first connection | step head | title | the same title on the first connection's step 1 | `/get-started` uses the create flow's title (`pageTitleOf('connection', 'first')`; "Create your first connection" removed) | match |
| U19 `6699:45328` | empty | card | border, radius, fill, box | 1 `action/default` #1d56f0, radius large 12, white, 1120 at y 216.6 | 1px rgb(29 86 240), 12px, white, 160,216 1120 × 444 | match |
| U19 `6699:45329` | empty | card header | padding, gap, line | 24 around, 16 gap, bottom 1 `decorative-border` #e1e6f0 (97 with the line) | 24px, 16px, 1px rgb(225 230 240), 97 high | match |
| U19 `6699:45330` | empty | icon tile | size, fill, radius | 40, the action blue at 12 % (#e3eafd sampled), radius 8 | 40 × 40, `bg-kern-action-default/12`, 8px | match (UNCERTAIN: not `IconTile tone="action"`, see notes) |
| U19 `6699:45331` | empty | glyph | asset, size, colour | "Icon/Glyph" add-link 24, #1d56f0 | `add-link-action.svg` (the export), 24 × 24 centred at 193,253 | match |
| U19 `6699:45333` | empty | card title | copy, type | "Which service are you connecting?" title/small 16/24 600 #0b1220 | h2, the same, 16px/24px 600 rgb(11 18 32) | match |
| U19 `6699:45334` | empty | card hint | copy, type | "You can change these details later." 14/24 #4a5468 | the same, 14px/24px 400 rgb(74 84 104) | match |
| U19 `6699:45335` | empty | fields | layout | one column, 24 around and between, each 726 wide | `flex-col gap-24 p-24`, name and description 726 wide (`max-w-726`) | match |
| U19 `6699:45338` | empty | name label | copy, marker | "Connection name" + red "*" | "Connection name*", `requiredMark` (rgb(196 39 28), `aria-hidden`), `required` on the input | match |
| U19 `6699:45339` | empty | name ⓘ | size, gap | icon-info-small 20, 4 after the label | 20 × 20 (`iconSize="small"`) at 4 after the "*" | match |
| U19 `6699:45340` | empty | name input | box, placeholder | 726 × 48 at y 370; "e.g. Residents’ parking permit" | 185,370 726 × 48; the same placeholder; `maxlength` 200, `autocomplete` off | match |
| U19 `6809:46408` | hover ⓘ | bubble | copy | "This name helps you and your colleagues find this connection later." / "Recommended: Use the name of a particular service. Citizens never see it." (two lines) | the same, a `<br>` between the sentences; hover and keyboard focus open it; accessible name "About the connection name" | match (F60) |
| U19 `6809:46408` | hover ⓘ | bubble | wrap, place | 280 wide, 4 lines (112 high), x 270 y 368 | 280 wide, 5 lines ("it." wraps: Chromium's Fira Sans runs ~1 % wider in 248 px), x 315 y 368 (T022's anchor: 8 px before the ⓘ) | Pattern: Tooltip (T022; see notes) |
| U19 `6699:45343` | empty | description label | copy | "Description (optional)", no ⓘ | "Description (optional)" with the ⓘ "About the description" (20 px) | F60 (the ⓘ kept) |
| — | ⓘ on description | bubble | copy | not drawn (F60) | "A note for your team, such as the form’s ID in your form management system. Citizens never see it." on hover and focus | match (F60, FR-032) |
| U19 `6699:45345` | empty | description | element, box | Form/Textarea 726 × 120, padding 8 16; placeholder "e.g. For people who live in the area and park on the street" | `<textarea>` 726 × 120 at y 474, 8px 16px; the same placeholder | match |
| — | empty | description | limit, spell check | ≤ 500, spell check on (FR-032), no counter drawn | `maxlength` 500, `spellcheck` true, no counter | match (FR-032) |
| U19 `6699:45346` | empty | info strip | copy, place | "Starts as a draft. It only becomes active when you publish." at y 618, the card's foot | the same at 161,618 1118 × 41; bottom corners 11 px inside the 12 px card | match (T048's rows stand) |
| U19 `6699:45349` | empty | footer | primary | "Choose documents" + arrow, 211 × 40 at 1069,845 | "Choose documents" + `kern-icon--arrow-forward`, 1069,844 211 × 40, submits the step's form | match |
| U19 `6699:45350` | filled | header pill | title | "Your connections / New connection" on a new connection's step 1, filled | "New connection" (the name only after step 1) | match |
| U19 `6699:45379` | missing name | field error | message, bar, fill | "Enter a name for the connection." under the input, danger bar 4 beside field and message, #fef1f0 fill | the same text (C7), bar 726 × 88 4px rgb(196 39 28), fill rgb(254 241 240), `aria-invalid`, `aria-describedby="connection-name-error"` | match |
| — | missing name | focus | 001-S7.6 | not drawn | on the name field after "Choose documents" | match |
| U19 `6699:45379` | missing name | description | error | none for an empty description | none; description label at y 482 (Figma 481) | match |
| — | too long (W10) | both fields | messages, focus | not drawn (baseline 005-S1.3, 006-S1.8) | "The name can have at most 200 characters." and "The description can have at most 500 characters.", each under its field in U19's error style; the focus on the name, then (name fixed) on the description | match (W10) |
| — | API 400 (W10) | step 1 | message | not drawn | Save and exit refused with a 400: the server's message in T048's toast, no "Try again", the focus stays on "Save and exit"; step 1's own checks refuse the name and description before any request, so no 400 reaches a field | UNCERTAIN (see notes; T048's toast) |
| — | filled → step 2 | footer | "Choose documents" | the documents step | h1 "Add documents" (T051's step), header pill "T049 narrow" | match |
| U19 `6716:40925` | stored draft, step 1 | header pill | title | "Your connections / Passenger transport licence" + Draft | "Neue Verbindung" + Draft on the seeded draft's step 1 (the call sites pass `stored`: coordinator, 2026-11-08; the restore dialog's title too) | match |
| U19 `6716:40925` | stored draft, step 1 | card, strip, footer | as the create flow | the same step, the draft's note, "Save and exit", "Choose documents" | the same; the draft's name and description filled | match |
| — | 320 × 640 | card | reflow | not drawn | 273 wide, the fields 223, the strip wraps (89 high), no horizontal scroll (305 = client) | match (FR-010) |

### U18 (S7) — T049, 2026-11-08

| frame | state | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|
| U18 `6793:47711` | example draft, step 1 | example banner "This is an example. Change anything to see how it works." | presence | drawn | not built (F15: no "Start from an example", no example draft) | F15 (not read) |
| U18 `6793:47711` | example draft, step 1 | step head, card, fields, strip | anatomy | as U19 | as U19 (the first connection's step 1 is the create flow's) | match (U19's rows) |
| U18 `6793:47713` | example draft, step 1 | header pill | title | the draft's name + Draft on step 1 | as U19 `6716:40925`'s row (`stored`) | see U19 |

### U98 step 1 (S18) — T049, 2026-11-08

Rows for step 1 only; the edit flow's header badge, footer and step links are T084 / T083 / T032.

| frame | state | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|
| U98 `6731:39827` | edit flow, step 1 | step head | title, description | "Name your connection" / "Link a service …" | "Connection details" / "Rename this connection or update its description."; tab "Connection details · Konnekt" | decided copy (report cosmetic 6, build note U05 #27) |
| U98 `6731:39828` | edit flow, step 1 | card | box | 1120 at y 225, the same card | 160,224 1120, the same classes | match |
| U98 `6731:39834` | edit flow, step 1 | card hint | copy | "The name shows in ‘Your connections’ and on the Published page." | the same (`EDITOR_COPY.editFormCardHint`) | match |
| U98 `6731:39836`, `6731:39841` | edit flow, step 1 | fields | values, anatomy | prefilled name and description, the name ⓘ, no description ⓘ | prefilled; both ⓘ (F60) | match (F60) |
| U98 `6731:39846` | edit flow, step 1 | info strip | copy | "Active. Your changes take effect when you save them." | "Your changes take effect when you save them. Requests already in progress keep their previous configuration." in the same strip, 161,626 1118 × 41 | F49 |
| — | edit flow, step 1 | info strip | draft note | create flow only (FR-026g) | never the draft's text in the edit flow | match |
| U98 `6731:39823` | edit flow, step 1 | header pill | title | the connection's name + "Active" | the name ("Passenger transport licence"); no badge yet | match for the title; badge → T084 (F5) |
| U98 `6731:39850` | edit flow, step 1 | footer | actions | "Discard changes", "Choose documents →" (secondary), "Save" | "Choose documents" (primary) only | T083 / T084 (not this task's files) |

### U20–U25 Documents step view state (S8, behaviour) — T050, 2026-11-08

verify: `npm test`: `DocumentsStep/reducer.test.ts` (44) and `utils.test.ts` (32). The view state
of FR-031 / research R8; the editor's reducer keeps `documents` (catalog order, F23) and `fields`.
Deviations from data-model "The documents step", accepted by the coordinator:

- `pendingRemoval` is `{ documentId }` without a `timer`: T036 made an action toast stay until
  used or dismissed, so the removal ends with the toast ("Undo" → `undoRemoval`, any other
  dismissal, a newer change or a change of step → `expireRemoval`).
- `needsData` is `{ documentIds, asking }` (the flags and the dialog "No data selected in n
  document(s)"); two actions beyond the task's list answer that dialog: `chooseData` (also ×,
  Escape and the scrim) and `removeNeedsDataDone`.
- `removeInline` and `confirmRemovalDone` are the same transition; T052 uses one path.
- `needsDataOf` counts only data the catalog still offers (as the count line); the baseline's
  `validateDocuments` stays unchanged and tested.
- A count of 0 reads "No data items chosen yet" (U21 A5, U22 A7); quickstart V4.2's "0 of 25 data
  items chosen" follows the frames. "n documents need data" is the coordinator-accepted plural the
  frames don't draw.

### U20, U21 Documents step (S8) — T051, 2026-11-08

Checked in Firefox (playwright-firefox) at 1440 × 880 and 320 × 640, signed in as `designer`, on a new
connection's documents step (no document, the search card's states, Personal ID added, both added)
and on the seeded "Führerscheinantrag Stuttgart" (documents that rules check). The step head and the
shell are T032/T033's tables; the rows here are the step's own.

| frame | state | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|
| U20 7290:60373 | every state | step head | h1, hint | "Choose documents and data"; "Add the documents citizens need to share for this connection. You can set rules in the next step using information you select here." | the same (`EDITOR_COPY.documentsTitle` / `documentsHint`); tab title "Choose documents and data · Konnekt" | match (FR-002) |
| U20 7290:60376 | every state | columns | box, gap | 160, 216 (64 + 152), 1120 × 560; 264 + 24 + 832 | list card 160, 216, 264 × 560; right panel 448, 216, 832 × 560 | match |
| U20 7290:60377 | every state | list card | fill, border, radius, padding | white, 1 `#e1e6f0`, 12, 16 | oklch(1 0 0), 1px solid rgb(225, 230, 240), 12px, 16px | match |
| U20 7290:60381 | no document | title | text, font, place | "Added documents (0)", label/default 600 16/24 `#0b1220` at 17, 17 | "Added documents (0)" (`addedDocuments(0)`), an h2, 600 16px/24px rgb(11, 18, 32), 177, 233 | match (FR-031) |
| U20 7290:60383 | no document | "Add document" | box, fill, label, icon | 177, 269 (17 + 36), 149 × 36; `#1d56f0`; padding 8 16, gap 4; label/small 600 14/24 white; icon-add-small 20 white | 177, 269, 148.6 × 36; rgb(29, 86, 240); 8px 16px, 4px; 600 14px/24px white; `kern-icon--add kern-icon--small` 20 × 20 white | match |
| U20 7290:60519 | card open, no document | "Add document" | fill (pressed) | `#1643c1` | `bg-[#1643c1]` (also on hover) | match (no KERN 2.8 token: §1.3 row below) |
| U21 7290:61200 | a document added | "Add document" | look | white, 1 dashed `#1d56f0`, label `#1d56f0`, 151 × 36 | white, 1px dashed rgb(29, 86, 240), the label and icon action blue, 151 × 36 | match (U04 #37) |
| U21 7290:61927 | card open, documents added | "Add document" | look (pressed) | `#eef3fe`, 1 solid `#1d56f0` | `bg-[#eef3fe]`, 1px solid (also on hover) | match (§1.3 row below) |
| — | every state | "Add document" | semantics | not drawn | a button with `aria-expanded`, `aria-controls` the card while open; keyboard focus: KERN's 4 px ring, offset 2 | FR-009 |
| U20 7290:60384 | no document | empty panel | box, border, radius | 448, 216, 832 × 560, 1 dashed `#e1e6f0`, 12, centred column gap 8, no fill | the same; `EmptyPanel` | match |
| U20 7290:60385 | no document | picture | file, size, place | `wallet-star.png` 127.6 × 123 at 352, 186.5 | `illustrations/wallet-star@2x.png` 128 × 123 (`h-123!`: KERN's `img { height: auto }`) at 800, 402 (448 + 352, 216 + 186.5) | match (U02 #19, build note "128 × 123"; T037's open "Empty state" row closes here) |
| U20 7290:60386–87 | no document | texts | text, font | "No documents yet" 600 16/24 `#0b1220` at 317.5; "Documents you add show up here, with the data you can choose." 400 14/24 `#4a5468` at 349.5 | the same texts, 600 16px/24px rgb(11, 18, 32) at 533.8; 400 14px/24px rgb(74, 84, 104) at 565.8, 412.5 wide | match |
| U20 7290:60388 | no document | "Set rules →" | state, hint | disabled primary; "Add a document first" before it | `ExplainedButton` `aria-disabled`, opacity 0.4, ignores clicks; the tooltip "Add a document first" on hover and keyboard focus, right-aligned to the button | match (FR-031, T022's pattern) |
| U21 7290:61261 | a document added | "Set rules →" | label, state | "Set rules →" primary, usable | "Set rules" + arrow, usable; with a document without data it refuses with the baseline's message (next row) | match (FR-031; the needs-data flags are T053's) |
| — | a document without data, "Set rules →" | refusal | behaviour | not drawn here (U25, T053) | the baseline's refusal: the first document without data is shown, "Select at least one field for 'Driving licence'." under its header, focus on its "All data items" | 001-S5.5 kept until T053 (W-less interim, see notes) |
| U20 #13, U21 #19 | every state | footer | "Publish without rules" | not drawn on the documents step | still offered while no branch has a rule | T053 (FR-031: removed with the needs-data work) |
| U20 7290:60525 | card open | card | box, fill, border, radius, padding, gap, shadow | 177, 313 (8 under the button), 360; white, 1 `#e1e6f0`, 8, 12, 8; 0 10 28 rgba(19, 21, 37, 0.16) | 177, 313, 360 × 198; the same values; `shadow-menu` | match |
| U20 7295:61181 | card open | hint "12 more documents are coming soon. Search to see them." | presence | drawn | none (card 198 high, Figma 263 less the hint's 57 + 8) | F3 |
| U20 7290:60526 | card open | search field | box, look, placeholder | 334 × 48 at 13, 13; `#f2f5fb`, bottom 2 `#22293a`, radius 4; search icon 20 action blue; "Find a document" 16/24 `#4a5468` | 190, 326, 334 × 48; `MenuSearchField variant="panel"`; rgb(242, 245, 251), 2px bottom, 4px; icon at 16; padding-left 44; "Find a document" | match |
| U20 7290:60526 | card open | search field | focus | "focused look": bottom line 2 ink | focus moves into the field as the card opens; KERN's 4 px ring | FR-009 (as §5.1 MenuSearchField, coordinator 2026-11-08) |
| U20 7290:60713 | card open | group label | box, text, font | 334 × 36, padding 8 0 4 8; "Available (2)" 600 14/24 `#4a5468` | 190, 382, 334 × 36, 8px 0 4px 8px; "Available (2)" (`availableGroup`), 600 14px/24px rgb(74, 84, 104); the group is `role="group"` named by it | match (FR-052e) |
| U20 7290:60715, 7290:60719 | card open | rows | box, padding, gap, glyph, text | 334 × 40, padding 4 8, gap 8, radius 8; ink glyph 24; 400 14/24 `#0b1220` | 190, 418 and 458, 334 × 40, 4px 8px, 8px, 8px; `personal-id-ink.svg`, `driving-licence-ink-24.svg`; 400 14px/24px | match |
| U20 7290:60715 (#21) | card open | first row | highlight | "Personal ID" highlighted `#f2f5fb` while the field has the focus | a row is highlighted (`layout/background-hued`) on hover and keyboard focus; ↓ from the field focuses the first row, ↑ / ↓ move, ↑ from the first returns to the field; Enter in the field adds the first available document | match ("Documents/Search result": "Highlighted = mouse hover or keyboard focus (arrow keys)"; see UNCERTAIN 3) |
| U20 #19 (7290:60724) | typed "ce" | results | rows | "Driving licence", then "Birth certificate", "Health insurance card", "Residence permit" tagged "Coming soon" | "Available (1)" / "Driving licence" | F3 (only the catalog's documents) |
| U20 7290:60990 | typed "taxi" | card | height | 130 | 130 | match |
| U20 7290:61187 | typed "taxi" | no results | text, font, place | "No documents match “taxi”." 400 14/24 at 8, 12 in a 48 row, `text-black` | "No documents match “taxi”." (`noMatches(query.trim())`), 400 14px/24px rgb(11, 18, 32), 198, 382, 48 high, padding 12 0 12 8; in a `role="status"`, so the empty result is announced | match (the frame's `#000` is a detached colour: `layout/text-default`) |
| U21 7290:61989 | card open, Personal ID added | groups | order, text | "Available (1)" / "Driving licence", "Added (1)" / "Personal ID" | the same (`searchGroupsOf`), catalog order in each | match (FR-052e) |
| U21 7290:62279 | card open, Personal ID added | added row | glyph, text, tag | grey glyph `#4a5468`; name 400 14/24 `#4a5468`; tag "Added" `#e1e6f0` fill, padding 0 8, radius 4, 400 14/24 `#4a5468` | `personal-id-muted.svg`; the same name; the tag with `decorative-border-default` fill, 0 8px, 4px; not a button, not focusable | match (U21 #24) |
| U21 #21 | a pick | card | behaviour | the card closes, the new document is selected and shown, the button turns outline | the same; the search clears; the focus returns to "Add document" | match (FR-031c) |
| — | card open | card | closing | not drawn | Escape: closes, the focus on "Add document"; Tab out or a click outside: closes; reopening starts with an empty search | FR-009 (§3 Menu) |
| U21 7290:61198 | a document added | divider | box, colour | padding 16 0, line 1 `#d0d5dd` | 177, 305, 230 × 33; line 177, 321, 1px rgb(208, 213, 221) | match (`bg-[#d0d5dd]`: §1.3 row below) |
| U21 7290:61204 | a document added | list item (shown) | box, padding, gap, fill, radius | 177, 338, 230 × 40; padding 4 8; gap 8; `#f2f5fb`; 8 | 177, 338, 230 × 40; 4px 8px; 8px; rgb(242, 245, 251); 8px | match |
| U21 7290:61204 | a document added | list item (shown) | glyph, name | action-blue glyph 24; name 600 14/24 `#0b1220`, ellipsis | `personal-id-action.svg` (`#1D56F0`) at 185, 346; 600 14px/24px, `truncate` | match |
| U21 I7290:61204;6246:18954 | a document added | trash | box, icon, place | "Rules/Delete button" 32 × 32, radius 4, icon-delete-small 20 `#4a5468`; always shown | 367, 342, 32 × 32, 4px; `kern-icon--delete` 20 rgb(74, 84, 104); always shown; named "Remove Personal ID" | match (U21 #11) |
| "Documents/List item" (description) | hover, keyboard focus | trash | colours | the red icon on the light-red fill | rgb(196, 39, 28) on rgb(254, 241, 240) | match (T052 verifies U23's hover frame) |
| — | a document added | list item | semantics | not drawn | a button that shows the document, `aria-current="true"` on the shown one, `aria-controls` the detail | FR-012 |
| U21 7290:61205 | a document added | detail card | box, border, radius | 448, 216, 832 × 560, 1 `#e1e6f0`, 12, white | the same | match |
| U21 7290:61206 | a document added | header | box, padding, gap, line | 830 × 81 at 1, 1; padding 16 24; gap 16; bottom 1 `#e1e6f0` | 449, 217, 830 × 81; 16px 24px; 16px; 1px solid rgb(225, 230, 240) | match |
| U21 7290:61207–10 | a document added | glyph, name, count | place, font, text | ink glyph 24 at 24, 28; "Personal ID" title/small 600 16/24 at 64, 16; "No data items chosen yet" 400 14/24 `#4a5468` | glyph 473, 245; h2 513, 233, 600 16px/24px; "No data items chosen yet" 400 14px/24px rgb(74, 84, 104) at 513, 257 | match (FR-051 (37)) |
| U21 #12 (7290:61937) | data chosen | count | text | "6 of 25 data items chosen" | "1 of 25 data items chosen", "25 of 25 data items chosen" as items are ticked | match (`dataCountText`) |
| U21 7290:61211 | a document added | select-all | text, place, states | "All data items", 116 × 32 at 690, 24; unchecked (A5), mixed (A6) | "All data items" at 1139.6, 241, 115.4 × 32; unchecked; mixed with some chosen; checked with all | match (002-S1.2; the label's width is text rendering) |
| U21 7290:61212 | a document added | field area | box, padding | 830 × 428 at 1, 82; columns at 24, 16 | 449, 298, 830 × 428, padding 16px 24px; list at 473, 314 | match |
| U21 7290:61213, 7290:61227, 7290:61238 | a document added | columns | count, width, gap | three columns 245 wide, 24 apart | CSS columns, 3 from 1024 px (244.7 wide: 782 less 2 × 24, the frame's 3 × 245 + 48 is 1 px wider than its card), gap 24; 2 from 640 px, 1 below | match |
| U21 7290:61214 ff. | a document added | group rows | presence | "Name", "Birth", "Address", "Document", "Other details" with tri-state boxes, items indented 24 | none: the items in the catalog's order, not indented | F24 |
| U21 7290:61217 | a document added | item | row | "Data/Check item" 32 high, box 20, label 14/24 | `Checkbox` 32 high (T016's table); a long label wraps under its text ("Street (may include the house number)", 56 as the frame's 7290:61232) | match |
| U21 7290:61256 | a document added | field area | scroll | scrolls inside the card (scrollbar drawn) | `overflow-y: auto` from 1024 px; the items of another document start at the top | match (U21 #16) |
| U21 7290:61257 | a document added | pager | box, line, layout | 830 × 49 at 1, 510; top 1 `#d0d8e6`; padding 0 16; gap 4, centred | 449, 726, 830 × 49; 1px solid rgb(208, 216, 230); 0 16px; 4px | match |
| U21 7290:61258, 7290:61260 | one document | arrows | box, icon, state | button-tertiary-small 40 in a 48 slot; chevron 20 action blue; both at 40 % ("disabled") | `kern-btn--tertiary kern-btn--small` with `kern-sr-only` names "Previous document" / "Next document": 40 × 40 at 764 and 924 (slots 760, 920); chevrons rgb(29, 86, 240); `aria-disabled`, opacity 0.4 | match |
| U21 7290:61259 | one document | pager text | text, font, place | "Document 1 of 1" 600 14/24 at 363, 13 | "Document 1 of 1" (`pagerOf`), 600 14px/24px at 812, 739 | match (FR-031) |
| — | two documents | pager | behaviour | U22 (T052) | "Document 2 of 2" after adding Driving licence (shown, selected); "Previous document" shows Personal ID "1 of 2"; the focus stays on the arrow (now `aria-disabled` at the end) | match (FR-031b) |
| U21 #10 | two documents | list | order | "oldest first" | catalog order (Personal ID, Driving licence) whatever the order of adding | F23 |
| — | the trash, no rule checks it | removal | behaviour | U23 (T052: asks first, F72) | the baseline's removal kept until T052: removed at once, toast "Driving licence removed" + "Undo"; the next document shows (the previous one at the end); Undo puts it back, shows it at its catalog place and focuses its list item | interim (T052) |
| — | the trash, rules check it | removal | behaviour | U24 (T052) | 002-S1.1's dialog "Remove Personal ID?" naming Rule 01–03 in Standard; "Cancel" keeps it | match (002-S1.1; T052 rebuilds the dialog) |
| — | deselecting data that rules check | removal | behaviour | U26 (T052) | "Stop requesting City or town?" naming Rule 01 in Standard; "Cancel" keeps it ticked | match (baseline `RemoveDataDialog` flow kept) |
| — | 320 × 640 | step | layout | not drawn | list card then detail, full width (288); no horizontal scroll (scrollWidth 320); fields in one column; the card spans the step and opens above "Add document" where the space under it, above the sticky footer, is too short (199 – 397, 8 above the button) | FR-010 (R10) |
| — | loading, catalog error | step | parts | not drawn | `FeedbackLoader` "Loading the wallet documents…"; the danger alert with "Try again" | match (001-S5.10, 001-S5.11; unchanged) |
| — | dropped data | step | W6 note | not drawn here | `CatalogDroppedNote` above the panels, unchanged | T053 (W6) |

### U22, U23, U24, U26 Documents step: removal (S8) — T052, 2026-11-08

Checked in Chromium (playwright-chrome) at 1455 × 880 and the heights below, signed in as
`designer`, on a new connection with Personal ID and Driving licence (no rule) and on the seeded
"Führerscheinantrag Stuttgart" (rules check both documents; saves aborted). The dialogs are T035's
`ConfirmDialog` (§5.1); the rows here are the step's own.

| frame | state | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|
| U22 7290:62332 | two documents | list title, pager | text | "Added documents (2)"; "Document 2 of 2" with Next disabled | the same; Next `aria-disabled` | match (FR-031) |
| U22 7294:61686 | two documents | list | gap | 4 | items at 338 and 382 (40 + 4) | match |
| U22 7290:62349 | two documents | item, not shown | fill, glyph, name | none; ink glyph `#0b1220`; 400 14/24 `#0b1220` | transparent; `personal-id-ink.svg` (`#0B1220`); 400 14px/24px rgb(11, 18, 32) | match (T051's guess confirmed) |
| U22 7290:62349 | two documents | item, not shown | height | 32 (no trash drawn) | 40: the trash's 32px place is kept, invisible (`opacity-0`) | FR-009 (the keyboard reaches the trash; no 8px jump on hover, U23's hovered item is 40); UNCERTAIN 1 |
| U22 7290:62348 | two documents | item, shown | fill, glyph, name, trash | `#f2f5fb`, radius 8, padding 4 8; action-blue glyph; 600; grey trash 32 | rgb(242, 245, 251), 8px, 4px 8px 4px 0 plus the button's 8px left; `driving-licence-action.svg` (`#1D56F0`); 600; trash 32 × 32 at 367, 386, icon rgb(74, 84, 104) | match |
| U23 7298:61782 | hover on an item | item | fill | none (no hover fill) | transparent (T051's hover `background-hued` removed) | match |
| U23 7298:61782 | hover on an item | trash | presence, colours | "Rules/Delete button" state=hover: `#fef1f0` fill, icon `#c4271c` | opacity 1; rgb(254, 241, 240), icon rgb(196, 39, 28), on hover anywhere on the item | match (T051's red hover confirmed) |
| U23 7298:61783 | hover on another item | shown item's trash | colour | grey | rgb(74, 84, 104), no fill | match |
| "Documents/List item" (description) | keyboard in an item (Tab to the trash) | trash | look | "on hover/focus of any row it shows red with a light-red fill" | `group-has-focus-visible`: shown, red on light red; KERN's 4px focus ring on the focused button | match (the description's calm 2px ring: §3 focus ring, KERN's, as T051) |
| U23 #13 (7298:61765) | hover | item | move cursor | "cursor shows it can be moved" | pointer (the item is a button); no drag | F23 |
| U23 7298:62322 | trash, no rule checks it | dialog | box, text | 480 × 256; "Remove Driving licence?"; "Citizens won’t be asked for this document any more."; × | 480 × 256 at 480, 312; the same texts (`REMOVAL_DIALOG_COPY`); "Close" × | match (F72, FR-031) |
| U23 7298:62322 | trash, no rule checks it | dialog buttons | label, look | "Keep document" secondary, "Remove document" filled `#c4271c`, 200 each, 16 apart | `kern-btn--secondary` 200; `kern-btn--primary kern-btn--danger` rgb(196, 39, 28) 200 | match |
| — | the question open | ×, Escape, scrim, "Keep document" | behaviour | not drawn | each closes it (`keepDocument`), the document stays, the focus back on the trash | FR-009; scrim on: decision below (FR-052a) |
| U24 7298:62500 | trash, rules check it | dialog | text | "Citizens won’t be asked for this document any more. 2 rules check its data: Rule 02 and Rule 03 in Standard. Edit or delete them before you publish." | Personal ID: "… 3 rules check its data: Rule 01, Rule 02 and Rule 03 in Standard. Edit or delete them before you publish."; Driving licence: "… 1 rule checks its data: Rule 04 in Standard. Edit or delete it before you publish." | match (002-S1.1; the rules are sample data; singular and lists of 3 not drawn: UNCERTAIN 3) |
| U24 7298:62500 | edit flow | dialog | ending | "before you publish" (create) | "before you save." (`removalDialogCopyOf` test) | 002-S1.7 |
| U24 7298:62552 (A12) | "Remove document" | list, pager, detail | state | "Added documents (1)", Personal ID shown, "Document 1 of 1" | the same; the rules stay (002-S1.3) | match |
| — | "Remove document" | focus | target | not drawn | the newly shown document's list item (`document-item-pid`); "Add document" once none is left | FR-009 |
| U24 7298:62627 | after the removal | toast | text | "Driving licence removed." + "Undo" | "Driving licence removed." + "Undo" (`EDITOR_COPY.removed`; the period and the editor's `utils.test.ts` line added by the coordinator, FR-002) | match |
| U24 7298:62627 | after the removal | toast | kind | type=danger: `#c4271c`, white bin | neutral ink, no icon | T036 (UNCERTAIN there, as U61, U90) |
| U24 7298:62627 ("toast with Undo (5 s)") | after the removal | toast | duration | 5 s | stays (still there after 7 s) until used or dismissed | T036 (WCAG 2.2.1) |
| — | "Undo" | document, fields, selection, focus | behaviour | not drawn | Driving licence back with its 2 of 31 data items, shown at its catalog place ("Document 2 of 2"), focus on its list item | match (FR-031) |
| — | Escape on the toast; Back to step 1 and on again | toast | behaviour | not drawn | the toast goes, the document stays removed (`expireRemoval`) | match (T036, T050) |
| U26 6324:40396 | unticking "Date of birth" that rules check | dialog | text, buttons | "Stop requesting Date of birth?"; "Citizens won’t share their date of birth any more. 2 rules check it: Rule 01 in Standard and Rule 05 in Ambulance. Edit or delete them before you publish."; "Cancel" / "Stop requesting" (filled danger) | "Stop requesting Date of birth?"; "Citizens won’t share their date of birth any more. 2 rules check it: Rule 02 and Rule 03 in Standard. Edit or delete them before you publish."; "Cancel" / "Stop requesting"; 480 × 280 | match (002-S1.1, 002-S1.6; the rules are sample data) |
| U26 #15 (6324:40357) | the question open | box, count behind it | state | still ticked, "6 of 25" (not updated yet) | still ticked, "4 of 25 data items chosen"; "Cancel" keeps it ticked | match (002-S1.1) |
| — | unticking "All data items" that rules check | dialog | text | not drawn | "Stop requesting all data from Personal ID?"; "3 rules check this data: Rule 01, Rule 02 and Rule 03 in Standard. Edit or delete them before you publish." | 002-S1.2 (baseline title; UNCERTAIN 3) |
| U01 6637:36649 (#16) | 1455 × 880 | list card, detail | height, page scroll | "at 800 px and taller the page doesn’t scroll, the two panels fill the space and only their lists scroll" (U22 A8 draws 560 at 880) | both 552 at y 216 (880 − 216 − 72 − 40); page `scrollHeight` 880 = the window; the fields scroll inside (`overflow-y: auto`) | match (552, not 560: T033's 40px bottom padding; 560 would scroll the page by the 8 px the note names as v6's fault) |
| U01 #16 | 1455 × 1000 / 800 | panels | height | fill | 672 / 472, no page scroll | match |
| U01 #16 | 1455 × 799 / 700 | panels | height | — (under 800) | 560 (U21's), the page scrolls (888) | match |
| U01 #16 | the empty panel, ≥ 800 tall | empty panel | height | as the panels | `PANEL_HEIGHT_CLASSES` too | match |
| U22 7290:62942 (A8) | card open, every document added | search card | content | "Everything in the wallet is added. Search to see what’s coming soon." + "Added (2)" | "Added (2)" only (T051's table) | F3 |
| U22 7290:62942 (A8) | 9 of 31 chosen | fields | groups | Name, Birth, … with tri-state boxes | none | F24 |
| — | 320 × 640 | step, dialog | layout | not drawn | list then detail, 273 wide, no horizontal scroll; the dialog 273 × 472 at 16, 84 | FR-010 |

**`RemoveDataDialog` (a page component, no §2 row)**: T052, 2026-11-08: rebuilt on `ConfirmDialog` (480, filled danger confirm, scrim on); one paragraph names the rules grouped by variant ("Rule 02 and Rule 03 in Standard", `ruleListText()`), which also describes the dialog; asked before every document removal (F72), with "Keep document" / "Remove document", and before data that rules check, with "Cancel" / "Stop requesting"; `RemovedDataRuleItem` deleted

### Decision (T035's carried note, for §2 or the T057 note)

The removal question ("Remove Driving licence?", with or without rules) and the data item's "Stop
requesting …?" keep `ConfirmDialog`'s default scrim (on): the scrim answers as "Keep document" /
"Cancel", so nothing goes; a removed document comes back through its toast's "Undo", and a
deselection changes only the unsaved flow. FR-052a's "a dialog that deletes" is read as one whose
action can't be taken back on the page (the connection's or draft's delete). T057 can follow the
same reading for the rule, group and variant deletes, which stay undoable until the flow is saved.

### U25, U27, U28 (F23), U98 Documents step: needs data, dropped data, edit flow (S8) — T053, 2026-11-08

Checked in Firefox (playwright-firefox) at 1440 × 880 (overlay scrollbar: body 1440) and 320 × 640,
signed in as `designer`, on a new connection "T053 test" with Personal ID and Driving licence, the
same stored as a draft with its GET routed (W6, the edit flow). The dialog is T035's `ConfirmDialog`
(§5.1); the list item and the detail are T051/T052's tables; the rows here are T053's.

| frame | state | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|
| U25 7299:52174 | "Set rules →", Driving licence without data | dialog | box, title | 480 × 256; "No data selected in 1 document" title/large 600 24/32 | 480 × 256 at 480, 312; the same title (`noDataTitle(1)`) | match (F67, #55) |
| U25 7299:52174 | the same | dialog | body | "Driving licence has no data chosen yet. Choose data for it or remove it." body/large 18/24 | the same (`noDataText(['Driving licence'])`) | match (#55) |
| U25 7299:52174 | the same | buttons | order, look | "Remove 1 document" danger outline (`#c4271c`), "Choose data" primary; no cancel; × | `secondaryDanger` "Remove 1 document", primary "Choose data", "Close" ×; scrim on | match (T035's three-button form, U25 #19–#21) |
| — | two documents without data | dialog | text | not drawn (#55: "the documents named, plural as drawn") | "No data selected in 2 documents"; "Personal ID and Driving licence have no data chosen yet. Choose data for them or remove them."; "Remove 2 documents" (wraps to two lines in its 200 px column) | decision 3 below |
| U25 7298:62636 (A13) | dialog open | step behind it | marks | none: "No data items chosen yet", list unmarked (U25 #11) | none: the flags show once the dialog closes | match |
| U25 #20 (7298:62814, A14) | "Choose data" (also ×, Escape, scrim) | step | state | dialog closed, on the documents step, the flagged document shown | the same; the shown document stays when flagged, else the first flagged one shows; focus on its "All data items" | match (U25 #20, #25; focus: FR-009, not drawn) |
| U25 7298:63253 | A14 | "1 document needs data" | place, font, colour | top of the added list (17, 122 in the card), label/default 600 16/24 `#c4271c`, 4 above the items | 177, 338 (card 160, 216), 230 × 24, 600 16px/24px rgb(196, 39, 28); first item at 366 (338 + 24 + 4) | match |
| U25 7298:62832 | A14 | flagged item | fill, glyph, name | `feedback-danger-background` `#fef1f0`, radius 8, padding 4 8; danger glyph; label/small 600 14/24 `#c4271c` | rgb(254, 241, 240), 8px; `driving-licence-danger.svg` (`#C4271C`, the frame's asset); 600 14px/24px rgb(196, 39, 28) | match |
| U25 7298:62832 | A14 | flagged item | error icon | "icon-emergency_home-small" 24 `#c4271c` at the right padding (8) | `kern-icon kern-icon--danger` 24 × 24 at 375, 418 (right edge 399 = 407 − 8), `feedback-danger` | match ("not colour alone", U25 #23) |
| U25 7298:62832 | A14, the flagged item shown | flagged item | selected look, trash | the error look only (no hued fill, no trash) though shown | the error look, `aria-current="true"`, trash hidden (`opacity-0`, place kept) | match |
| "Documents/List item" (description, "error · hover") | hover / keyboard in the flagged item | trash | look | "Bin turns red on hover in every state" | the error icon fades out, the trash shows red on light red (opacity 1, rgb(196, 39, 28)) | match |
| U25 7298:62832 | A14 | flagged item | height, place | 32 at 64 in the list | 40 at 410 (rows keep the trash's 32 px place, T052 UNCERTAIN 1) | T052 decision |
| — | A14 | flagged item | semantics | not drawn | `aria-describedby` "1 document needs data" | FR-012 |
| U25 7298:62838 | A14 | header red line | text, font, place | "Choose at least one data item, or remove this document." body/small 400 14/24 `#c4271c`, in place of the count, at 64, 40 | the same (`needsDataLine`), 400 14px/24px rgb(196, 39, 28), 513, 257 (448 + 1 + 64, 216 + 1 + 40) | match (U25 #24) |
| U25 #24 | A14 | red line | semantics | "must be linked for screen readers" | `id="document-mdl-error"`, `aria-describedby` of "All data items" | match (001-S7.5) |
| — | A14, a data item ticked | marks | behaviour | not drawn | the red goes from that document (list item, line, heading); unticking brings it back until the next "Set rules →" | match (T050's `documentsNeedingData`) |
| U25 #19 | "Remove 1 document", Personal ID with data | removal | behaviour | "removes every document without data at once" | Driving licence goes (no toast: `removeDropped`); the rules step opens; Back shows "Added documents (1)", no marks | match; going on: decision 1 |
| — | "Remove 2 documents", none left | removal | behaviour | not drawn | both go, the step stays, "Added documents (0)", the empty panel, focus on "Add document" | decision 1 |
| U25 #16, U28 #25 (7298:64281) | no rule anywhere | footer | "Publish without rules" | absent | absent (create and edit flow); the rules step keeps it | match (FR-031) |
| U25 #25 | a document added | "Set rules →" | state | usable (no `aria-disabled`) | usable; disabled with "Add a document first" only without documents (T051's row) | match |
| U27 7298:63317, 7298:63736; U28 7298:64157 | drag | list | reordering | drag handle, drop line, drag image | none: catalog order, no move cursor | F23 (not read) |
| — (W6, not drawn) | dropped field and document type | note | kind, place | not drawn; 005-S8 | `kern-alert--warning` at 160, 216, 1120 wide above the panels: fill rgb(255, 244, 224), 2px outline rgb(154, 74, 0) inside, header icon 32 (`kern-icon--warning`), title "The wallet no longer offers some data of this draft" 600 18/24 | match (§3 "Alert, page level" with a body, F22, T017's values) |
| — (W6) | the same | note | body | list and "Remove it" | white body under a 1px warning line; bullets "Personal ID – eye_colour_retired", "birth_certificate"; "Remove it" `kern-btn--secondary kern-btn--small` | match (005-S8.3, 005-S8.4; F22) |
| — (W6) | "Remove it" (no rule checks it) | note | behaviour | — | the note goes, the focus on the step's h1; the page no longer scrolls (880) | match (005-S8) |
| U01 #16 | W6 note shown, 1440 × 880 | panels | height, page scroll | panels fill the window under the step head | panels keep the fill height (552) under the note (457): the page scrolls by the note + 24 (scrollHeight 1121) | decision 4 |
| U98 7296:52323 | edit flow, documents | step head | h1, hint | "Choose documents and data"; "Add the documents citizens need to share for this connection. You can set rules in the next step using information you select here." | the same (was "Edit documents"); tab "Choose documents and data · Konnekt" | match (`pageTitleOf`, one line in the editor's `utils.ts`) |
| U98 7296:52326 | edit flow, documents | columns | place | 160, 224 (64 + 160), 1120 × 560 at 888 tall | list 160, 224, 264 × 544; detail 448, 224, 832 × 544 at 880 tall (U01 #16 fill) | match |
| U98 7298:63261–62 | edit flow | list, detail, pager | content | "Added documents (2)", Personal ID shown with trash, "6 of 25 data items chosen", "Document 1 of 2" | the same parts ("1 of 25 data items chosen" with the routed data) | match (T051/T052's tables) |
| U98 7296:52342 ff. | edit flow | field groups | presence | tri-state groups | none | F24 |
| U98 #28 (7296:52389) | edit flow | footer | actions | "← Back", "Discard changes", "Set rules →" secondary, "Save" primary | "Back", "Set rules →" primary | T084 (the edit flow's footer) |
| — | edit flow, a document without data | needs data | behaviour | not drawn | the same dialog and marks as in the create flow | match (FR-031) |
| — | 320 × 640 | list, detail | layout | not drawn | "1 document needs data" and the error item 254 wide, the red line wraps under the name (144 high), no horizontal scroll (scrollWidth 320) | FR-010 |
| — | 320 × 640 | dialog | layout | not drawn | 288 × 408 at 16, 116; title on three lines; the buttons stacked, "Remove 1 document" above "Choose data" | FR-010 (T035's stack) |

### Decisions (open points of T050 / T052, settled here)

1. **"Remove n documents" goes on to the rules step** when documents with data are left: the dialog
   answers "Set rules →", #14 (c) adopted "Remove them and continue" and #55 changed only its label
   (U25 #19: "removes every document without data at once"). With none left the team member stays
   on the documents step, the focus on "Add document". No undo toast: `removeDropped` removes several
   documents at once (a toast would be dropped by the change of step anyway; the dialog was the
   question, and a document without data takes no data with it).
2. **No 002-S1.1 dialog before "Remove n documents"**: a flagged document has no data chosen, so
   any rule that still checks its data was confirmed through 002-S1.1 when that data was deselected
   (or came from a stored draft or an agent). The rules stay, the rules step's checks name them, and
   publishing refuses while they remain (002-S1.3).
3. **The plural body** (not drawn): "<A and B> have no data chosen yet. Choose data for them or
   remove them." (`listText`: "A, B and C"); title "No data selected in <n> documents", button
   "Remove <n> documents" (#55).
4. **Panel height with the W6 note**: accepted. "1 document needs data" sits inside the list card
   (U25 7298:62830), so it pushes nothing; the W6 note above the panels pushes them down by its
   height plus the 24 px gap, so at ≥ 800 px tall the page scrolls by that much while the note
   shows. The note asks to be read and acted on first and goes with "Remove it"; subtracting a
   content-dependent height would need measuring (no inline styles).
5. The flags show only once the dialog has closed (A13 draws the step unmarked behind it); the
   dialog's words are kept as they were opened, so they don't change while it fades out.

## 6. Pass I: the screenshot matrix and the accessibility review

Filled by pass I (quickstart V10–V13): one row per route × state × width (1440 px; 320 px at
200 % zoom) with `horizontal scroll` and `hidden content` (SC-005), the keyboard walkthrough of
the five flows with the focus-ring check and one `h1` per route (SC-006), the AA review of every
text pair (SC-006), the five flows completed (SC-007), and the closing report.

### 6.1 First pass after the shells (T038, 2026-11-08)

The phase 4 checkpoint, by the coordinator with playwright-core 1.48.2 and Chromium
(`/usr/bin/chromium`), against the dev server; every non-GET request outside `/api/auth/` was
aborted and logged (none was sent: nothing saved, published or deleted).

**The pages in the new shells** (1455 × 900 and 320 × 640): `/login`, `/forgot-password`
(L1), sign in through the form → `/` (L2), the overview, the draft details of `12292ff4…` and
`e67b4d7b…`, their edit flow opened at the saved step (4 and 3), Back to step 1 and forward
with "Continue", "Add rules", "Test rules" (L3: the step line 1–4, the footer), a new
connection (`/form-connections/new?local=…`), `/get-started` (redirects to `/`, connections
exist: baseline), `/account`, `/authorize` without parameters ("Allow access"), an unknown
approval and an unknown connection ("Page not found", T037), an unknown route (redirects to
`/`). Every route has exactly one h1, none scrolls sideways at either width, no page error;
the console shows only the 401s of the signed-out checks and the 404s of the unknown ids. The
details still show their old content and the empty band of the step header's slot (T078, T081).

**V13 (first pass)**:

| check | how | result |
|---|---|---|
| V13.1 light only | `colorScheme: 'dark'` | `data-kern-theme="light"`, `color-scheme: light only`, body white, text `#0b1220`: pass |
| V13.2 reduced motion | `reducedMotion: 'reduce'`, overview → a connection | the connection pill `animation: none` (appears at once), its text unanimated, `main` without animations (no page fade): pass; the 0.5 s "Published" delay not exercised (publishing needs the hosted EUDIPLO: phase 8) |
| V13.3 motion on | `reducedMotion: 'no-preference'` | the pill `pill-grow 0.24s` with `pill-text` on its content, `main` `page-in` 150 ms on the route change; colour transitions 150 ms (T031, T033 tables): pass |

Open rows of the phase's §5.1 tables, each carried to its task: `TopBar` description line
(T078), Geist for "Konnekt" (the user), L3's "Discard changes" (T083), "Active" pill (T084),
pinned tabs (T056), the details variant (T078, T081), the failed-save toast (T048), the error
ID of a failed load (T080, T083), the documents step's empty picture (T051).

### 6.2 US1 checkpoint (T046, 2026-11-08)

Quickstart V1 (steps 1–7) and V2 (steps 1–2), by the coordinator with playwright-core 1.48.2 and
Chromium (`/usr/bin/chromium`) at 1455 × 900 (and 320 × 640 for V1.7), against the dev server.
Real mutations: only V1.5's three draft deletes (re-seeded with the session's `seed.py`; the
drafts' ids are new again: `76abafb6…`, `2f46849a…`, `414d27ee…`). Published and deactivated rows,
the slow list and the 5xx are routed `GET` answers (no EUDIPLO here). No page error in any step.

| step | result |
|---|---|
| V1.1 | tab "Log in · Konnekt", one h1 (the tagline); a wrong password → the alert "Username or password is wrong. Check both and try again." above the fields, both inputs `aria-invalid="true"` (F16); Tab from the password reaches "Show password" (`aria-pressed` false), Space → true and the input turns `text`: pass |
| V1.2 | `/account` signed out → `/login` → "Forgot password?" (tab "Forgot password · Konnekt", the design's text) → "Back to log in" → sign in → back on `/account` (the requested route survived): pass |
| V1.3 | a device without the memory, the list held 1.5 s: the loading page (white Konnekt pill, no account pill, "Loading your connections…"), then "Welcome to Konnekt" with "Create connection" as its only action (F15); reload with the list held → the welcome page at once (memory `false`, no flash); "Create connection" → `/get-started?local=…`, "Create your first connection", "Step 1 of 4": pass |
| V1.4 | two routed published rows (active with a long description, deactivated) and the three drafts: rows 80 high (+ the 1 px divider), one-line description with "…", the pills Active / Deactivated / Draft, "Edited dd.mm.yyyy", "View" / "Edit" / bin with per-row names ("Delete Fishing licence"), no checkboxes; search "park" → "2 of 5 connections", 2 rows; "zzz" → "No connections match “zzz”. …" with "Clear search", which empties the field and focuses it; the × clears; a draft's "Edit" → `/form-connections/<id>/edit` (the editor opens the stored step); the draft's " · <step> step" is deferred (CLAR #62); nothing mutated: pass |
| V1.5 | delete the three drafts from the rows: the dialog "Delete “Neue Verbindung”?" with the draft body, "Keep connection" / "Delete connection"; after the last one the welcome page, the memory `false`: pass |
| V1.6 | the account pill → "Log out" → `/login`, the live region holds "You’re logged out.": pass (the screen reader's reading: needs a person) |
| V1.7 | backend stopped: the session check fails and `/` goes to `/login` (baseline guard); a routed 5xx `{error, message, error_id}`: "Your connections", "Couldn’t load your connections", the message, "Error ID: …", "Try again" (the overview is the way back, T044), no horizontal scroll at 320: pass |
| V2.1 | two never-saved connections left by closing their tabs: "Unsaved changes in 2 connections" with both items; discarding one in a second tab ("Unsaved work discarded." there) turns this tab's offer into "Unsaved changes in “Taxi licence T046”" (heading form); discard here: the dialog "Discard unsaved work?", "Cancel" / "Discard"; after it the status "Unsaved work discarded.", the focus on the h1, the offer gone; nothing sent to the backend: pass (the screen reader's reading: needs a person) |
| V2.2 | "New, never saved · 08.11.2026, 17:04" with "Resume editing Taxi licence T046" → `/form-connections/new?local=new-…`: pass |

Fixed by the coordinator during the phase: `TextField`'s trailing padding 56 → 48 (U10, the
toggle is its only user) and the overview's list card `min-h-123` (T045's open row). No frame
changed since the audit (every task's report). Open for a person: V1.6's and V2.1's
announcements with NVDA or VoiceOver.

### 6.3 US2 checkpoint (T054, 2026-11-08)

Quickstart V3 (steps 1–8) and V4 (steps 1–6), by the coordinator with playwright-core 1.48.2 and
Chromium (`/usr/bin/chromium`) at 1455 × 900 (799, 1000 tall and 320 × 640 for V4.6), against the
dev server. Real mutations: only drafts the walk created ("T054 …", deleted afterwards); the three
seeded drafts are unchanged (every mutation on "Führerscheinantrag Stuttgart" aborted by routing).
The failed save and W6 are routed answers. No page error in any step.

| step | result |
|---|---|
| V3.1 | `/form-connections/new`: tab "Name your connection · Konnekt", one h1, "Step 1 of 4" with "Next: Documents", one `progressbar` (`aria-valuenow` 1, "Connection"), header "Your connections / New connection", footer "Save and exit" / "Choose documents": pass |
| V3.2 | "Choose documents" without a name → "Enter a name for the connection." under the field, the field focused and `aria-invalid` (C7): pass |
| V3.3 | the description is a `<textarea>` (spell check on, `maxlength` 500, the design's placeholder); 501 characters (limit lifted) → "The description can have at most 500 characters.", focus on it (W10); both ⓘ ("About the connection name", "About the description") open on hover and on focus, one at a time: pass |
| V3.4 | "Konnekt" → "Leave this connection?" with the design's body, "Discard connection", "Save progress", ×; Escape and × keep the flow; "Save progress" → `/` with "Draft saved. You can pick it up any time.", no local draft left; "Discard connection" → `/`, nothing stored, the local draft forgotten, no offer: pass |
| V3.5 | unsaved changes, "Log out" → "Save before you log out?" / "Your latest changes will be lost if you log out now." / "Cancel", "Log out anyway", "Save and log out"; "Cancel" → focus on the account pill (F20): pass |
| V3.6 | a stored draft: no `beforeunload` cancel before typing, cancelled after typing (the reload raised Chromium's `beforeunload` dialog, accepted by the script); after the forced reload "Restore your unsaved changes?" with the draft's name and date, "Discard them" / "Restore changes", ×; Escape, × and the scrim each open the draft's details and keep the local draft: pass (the browser's own "Leave site?" prompt: needs a person) |
| V3.7 | the save routed to a 1.2 s 503 `{error, message, error_id}`: "Saving…" `aria-disabled`, the status "Saving draft…", then the toast "Couldn’t save. Check your internet connection and try again." with "Error ID: err-t054" and "Try again"; focus stays on "Save and exit"; no modal (F21); "Try again" (route lifted) saves and lands on the overview: pass |
| V3.8 | two browser contexts on one draft (the same account: the conflict is the draft's version): the first "Save and exit" stores, the second → "This draft has changed" with "Cancel", "Reload", "Replace their changes"; "Replace their changes" stores the second version: pass |
| V4.1 | no document: the empty panel with its picture; "Set rules" `aria-disabled` with "Add a document first" on hover and on keyboard focus (Tab): pass |
| V4.2 | the search card "Available (2)" with "No documents yet …"; "zzz" → "No documents match “zzz”."; Personal ID added → "Document 1 of 1", "Added documents (1)", "No data items chosen yet" (the frames' wording at 0, T050), the fields in catalog order without group rows; two chosen → "2 of 25 data items chosen"; the card then "Available (1)" / "Added (1)"; Driving licence → "Document 2 of 2": pass |
| V4.3 | hover shows the trash (no move cursor, F23); the trash → "Remove Personal ID?" / "Citizens won’t be asked for this document any more." / "Keep document" / "Remove document"; Keep keeps it; Remove → "Personal ID removed." + "Undo"; Undo restores it with its two chosen items and focuses it; the rules branch (002-S1.1's dialog naming the rules, F72): T052's table on the seeded draft: pass |
| V4.4 | Driving licence without data, "Set rules" → "No data selected in 1 document" / "Driving licence has no data chosen yet. Choose data for it or remove it." / "Remove 1 document" / "Choose data"; "Choose data" → "1 document needs data" and "Choose at least one data item, or remove this document.", focus on its "All data items" (described by the line); "Remove 1 document" → the rules step (documents with data remain, T053): pass |
| V4.5 | the seeded draft's GET routed with a field the catalog doesn't offer (`shoe_size`) → the warning "The wallet no longer offers some data of this draft" listing "Personal ID – shoe_size" with "Remove it" (no rule checks it: removed without a question); no mutation sent: pass |
| V4.6 | the documents step at 1455 × 900 and 1000: the page doesn't scroll (panels fill the window); at 799 it scrolls (888, the fixed panels); no drag handle (F23), no "Coming soon" (F3), the footer "Back", "Save and exit", "Set rules" (no "Publish without rules"); 320 × 640: no horizontal scroll: pass |

Fixed by the coordinator during the phase: the stored draft's header and restore title
(`headerTitleOf(…, stored)` at both call sites), `IconTile`'s `action` tone (12 % tint, T049) with
step 1 on it, and the undo toast's period (`EDITOR_COPY.removed`, FR-002). No frame changed since
the audit (every task's report). Open for a person: V3.6's "Leave site?" prompt in a real browser
(Chrome, Firefox, Safari: shown with unsaved work, absent without it and after "Save progress",
"Discard connection", "Save and log out", "Log out anyway"), then the restore dialog after the
forced reload; the screen reader's reading of the failed-save toast and "Saving draft…" (T048).

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
