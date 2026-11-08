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
| `feedback-info` `#0284c7` on `feedback-info-background` `#e0f2fe` (the "Draft" status pill, info strips) | 3.57:1 | `#0273ae` | 4.50:1 | |

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
| `AccessLevelChoice` | P14 radios, P33 base-radio | a | `kern-form-check__radio`, the fieldset | default, hover, focus, selected, disabled | T006: kept a, it is on `kern-form-check__radio` already; built by T016 |
| `ActionMenu` (+ `RuleMenuItem`) | build note 3 | c | class-set placement (side, direction, max-height step), 220 px, inner scroll (R10) | default, hover, focus, disabled item, open up/down | T006: kept c, KERN 2.8.2 has no menu component; built by T021 |
| `AppLayout` | — | c | the header pills (L2) | default, scrolled (white background) | T006: kept c (a page shell); built by T031 |
| `AuthLayout` (+ `AuthIntro`, the art) | L1 | c | the login art and tagline row | 1440, ~1280, <1024, 320 | T006: kept c (layout and art, no KERN counterpart); built by T034 |
| `BranchMark` | the rules frames | c | the marks' chips | changed, new, removed | T006: kept c, the marks have no KERN counterpart (the `kern-badge` types are feedback colours); built by T019 |
| `BranchName` (+ `FindingsSegment`) | P29 tabs | c | the tab with its ⓘ and problem icon | default, selected, hover, focus, with icon | T006: kept c, KERN 2.8.2 ships no tabs CSS (the React kit’s Tabs needs its own styles, not imported); built by T026 |
| `Checkbox` | P33 base-checkbox, build note 2 | b | `kern-form-check__checkbox` + the 20 px box, the design's tick and the mixed dash | default, hover, focus, checked, mixed, disabled | T006: kept b, `KernCheckbox` stays, the 20 px box, tick and mixed dash are the override; built by T016 |
| `ConfirmDialog` | P12, P33 dialog-actions | a + c | `kern-dialog` with 1–3 buttons, × and the scrim rule | open, long labels, scrollable, working | T006: kept a + c, on `kern-dialog` already; built by T035 |
| `ConnectionStatusBadge` → status pill | U07 #1 | c | dot + label, tint, radius 8 | active, draft, deactivated | T006: kept c, replacing today’s `KernBadge`: the pill has a dot, not KERN’s icon, and draft/deactivated are no feedback types; built by T019 |
| `Connector` (+ menu) | FR-038 | c | the pill with the chevron and the two-option menu | default, open, read-only, faded | T006: kept c; built by T023 |
| `CopyableUrl` | U80, U81 | a + c | the button on KERN's button; the one-line URL | default, hover, focus, "✓ Copied", disabled with explanation | T006: kept a + c, on `kern-btn` already; built by T028 |
| `CurrentUserProvider`, `RequireSignIn`, `RequireSignedOut` | — | — | no UI | — | no change |
| `ErrorNoticeText` | P07 | a | `kern-alert` danger with the error ID line | default | T006: kept a, it is text inside `KernAlert` at its call sites; built by T017 |
| `FeedbackLoader`, `PageLoader` | P22 | a + b | `kern-loader kern-loader--visible`, KERN’s 96 px (the size kit P22 draws); where a screen frame draws it smaller (the 56 px of S1, S6, S14), a scoped size override in `index.css` read from that frame | default | T006: changed a → a + b: kit P22 draws only the 96 px loader, so a smaller size is an override; `FeedbackLoader` moves from its own SVG spinner to `kern-loader`; built by T018 |
| `FindingNote` | U44–U46 | c | the note under a rule or group | warning, info | T006: kept c; built by T025 |
| `FormConnectionLoadState` (+ `LoadFailed`) | P07, U06 #95 | a + c | the alert; the skeletons | loading, failed | T006: kept a + c; built by T017 |
| `FormErrorMessage` | P14 error, build note 7 | a | `kern-error` with its danger `kern-icon` under the field | default | T006: class corrected: KERN 2.8.2 has no `kern-form-input__error`; its field error is `kern-error` (flex row, 8 px gap, the danger-tinted icon); built by T015 |
| `GroupFrame` (+ header, message) | U34, U35 | c | the group frame, the subtitle, the message card with the pencil | default, with message, removed, faded | T006: kept c; built by T025 |
| `IconTile` | U10 #17, U74 | c | the icon tile | default | T006: kept c; built by T018 |
| `InfoTooltip` | U37 `6151:33820`, U07 #16 | c | the tooltip with its arrow; blue ⓘ on blue, muted elsewhere | closed, hover, focus, touch | T006: kept c, KERN 2.8.2 has no tooltip; built by T022 |
| `LocalDraftsOffer` (+ item) | U16 | c | the grey banner | one draft, several, discard dialog | T006: kept c; built by T029 |
| `MenuSearchField` | P26, P33 base-search | c | own markup with Tailwind and the overlay’s tokens, the values of P26 / P33 `1067:17092` | default, hover, focus, with text | T006: changed a → c: KERN 2.8.2 ships no search CSS (no `kern-search`, no `type=search` rule); the component is own markup already; built by T015 (T027 uses it) |
| `NotFound` | P07 | a + c | the alert and the way back | default | T006: kept a + c; built by T037 |
| `PageTitle` | P31 | a | `kern-heading-display` for the 40/48 page h1 (kit “heading/display”, 2x-large adaptive), `kern-heading-x-large` (32/40) and `kern-heading-large` (24/32) where a frame uses those styles | default | T006: class corrected: the page h1 the frames draw (40/48, weight 500, V1) is the kit’s “heading/display” = KERN’s `kern-heading-display`; `kern-heading-x-large` is 32 px; built by T017 (T043 uses it) |
| `RuleRow` (+ name, predicate, sentence, message, problem note, value chip) | U30, U55 | c | the row, the statement chips, the symbol chips | default, hover, open menu, selected, removed, problem, linked | T006: kept c; built by T024 |
| `TextField` | P14, P33 base-input-field | a | `kern-form-input` text, password, textarea | default, hover, focus, error, disabled, readonly | T006: kept a, on `KernInput` already; built by T015 |
| `Toast` (+ message) | U10 #20, U51 | c | the dark toast, bottom centre, optional action | neutral, with action, with error ID | T006: kept c, KERN has no toast; built by T036 |
| `TopBar` | L2 | c | the two pills, the connection pill | signed out, signed in, in a connection, scrolled | T006: kept c; built by T031 |
| `UserMenu` (+ `SignOutDialog`) | U13 `6699:44358`, U17 | c + a | the account pill and its menu; the log-out dialog on `ConfirmDialog` | closed, open, focus, the dialog | T006: kept c + a; built by T031 |
| `ValuesPicker` (+ option item) | U32 `6357:43090`, U48 | c | the picker with search and "Done" | open, option hover/focus/selected/disabled | T006: kept c; built by T027 |
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
| **Tooltip** | U37 `6151:33820`, U46 `6758:43524`, U81 `6809:46590`, U07 #16 | the design's tooltip with its arrow, on hover, focus and touch (FR-052g); blue ⓘ on blue backgrounds, muted grey elsewhere; no `title` attribute |
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
  (The two existing spinners, `FeedbackLoader` and `TestStep/LoadingRing`, keep
  `motion-safe:animate-spin`: they are not the design's motion.)
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
