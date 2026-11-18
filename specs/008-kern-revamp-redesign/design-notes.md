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
| `--color-action-pressed` `#1643c1`, `--color-action-tint` `#eef3fe`, `--color-card-divider` `#d0d5dd` | the documents step's frame colours without a KERN token (rows below) | **new**, T090 (2026-11-09): the arbitrary values `bg-[#…]` became `bg-action-pressed`, `bg-action-tint`, `bg-card-divider`; same rendered values |

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
| `#1643c1` | "Add document" filled, pressed and hover (U20 7290:60519) | `@theme` token `--color-action-pressed` (`bg-action-pressed`, T090) in `DocumentsStep/SearchCard.tsx`: KERN 2.8's `action-state-indicator-shade-active` computes to a lighter blue in light mode |
| `#eef3fe` | "Add document" outlined, pressed and hover (U21 7290:61927) | `@theme` token `--color-action-tint` (`bg-action-tint`, T090; KERN's tint-hover at 12 % gives `#e4ecfd`) |
| `#d0d5dd` | the list card's divider (U21 7294:61509) | `@theme` token `--color-card-divider` (`bg-card-divider`, T090) in `DocumentsList.tsx` (not `decorative-border-level-1`, `#d0d8e6`) |
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
| `feedback-info` `#0284c7` on `#ffffff` (info text and icons; the "Draft" label on white) | 4.10:1 | `#0273ae` | 5.17:1 | 2026-11-09 (closing report) |
| `feedback-info` `#0284c7` on `feedback-info-background` `#e0f2fe` (info strips) | 3.57:1 | `#0273ae` | 4.50:1 | T019 (2026-11-08): the V5 "Draft" status pill draws its label in `#05669e` (5.38:1 on `#e0f2fe`, passes) and only its dot in `#0284c7`, so the pill takes the drawn value, not this fix; 2026-11-09 (closing report) |
| `feedback-danger` `#c4271c` label on its pressed tint, the danger outline button ("Discard connection", "Remove 1 document") while pressed: KERN's 16 % tint `#f6dcdb` | 4.43:1 | a 15 % tint `#f6dfdd` (`.kern-btn--danger`'s `tint-active-opacity`, coordinator after T035, 2026-11-08) | 4.52:1 (measured in Chromium) | 2026-11-09 (closing report) |
| White label on the primary button's pressed shade (every primary button, "Log in", "Create connection", "Publish" …): KERN's `action-state-indicator-shade-active`, 16 % white mixed into `#1d56f0` in oklch = `#4076f6` (the kit's P09 2:4584 layer: `#4171f2`) | 4.09:1 | 11 % white, `#356df4` (overlay: `--kern-color-action-state-indicator-shade-active: color-mix(in oklch, var(--kern-color-action-default), white 11%)`, T098); the CIEDE2000 nearest colour would be `#346fef` (ΔE2000 2.7); the danger button keeps its own darker shade | 4.52:1 | 2026-11-09 (closing report) |
| `action-default` `#1d56f0` label of an outline or tertiary button while pressed, the 16 % tint laid over a tinted surface: the selection bar's "Cancel" on `feedback-info-background` (`#c1d9fc`), the S5 offer's "Discard" / "Resume editing" on `feedback-default-background` (`#cdd8f6`), the test step's "Generate all" / "Try again" on `hued` (`#d0dcfa`), S16's "Delete draft" on the band's gradient (`#cfdaf9`, measured in pixels) | 4.01–4.20:1 | the 16 % tint laid on white, one solid fill wherever the button sits: `#dbe4fd` (overlay: the `:active` rule of `.kern-btn--secondary` / `--tertiary` draws `color-mix(in srgb, var(--kern-color-action-default) var(--pressed-tint-share, 16%), var(--kern-color-layout-background-default))`; the danger outline button's 15 % via `--pressed-tint-share`, its `#f6dfdd` unchanged); per-surface nearest colours `#d2e5ff` / `#dae3ff` / `#d9e4ff` (ΔE2000 2.0–3.9) | 4.54:1 (danger 4.52:1) | 2026-11-09 (closing report) |
| Text of disabled controls at KERN's 40 % (`action-state-opacity-disabled`): white on the primary button (`#a5bbf9`; "Set rules", "Save rule", "Test rules", "Copy link", "Allow" …), the blue label of a disabled outline or tertiary button (`#a5bbf9` on white; "Copy", "Keep connection", "Deny", "Decline"; "Saving…" on the footer's `#f8faff`), "Group rules" on the selection bar (`#ecf7fe` on `#92b4f8`), the danger button's "Deleting…" (`#dfa7a3`) | 1.82–2.06:1 (the task's 3:1) | opacity 68 % (overlay: `--kern-color-action-state-opacity-disabled: 0.68`), the smallest that gives every measured pair 3:1 (0.65 leaves the label on `hued` / `#f8faff` at 2.9:1) | 3.17:1 (primary, outline, tertiary), 3.21:1 ("Group rules"), 3.37:1 ("Deleting…") | 2026-11-09 (closing report) |
| A disabled button under the pointer or pressed took KERN's hover / pressed shade: kern.css's `.kern-btn--primary:not(:disabled):hover, .kern-btn--primary:not([aria-disabled=true]):hover` (and the same for the outline and tertiary buttons) matches each kind of disabled button through the other half of the list; the busy "Logging in…", "Allow", "Approve" (`#ffffff` on `#acc2fa`), "Group rules" while hovered (`#99bafa`) | 1.77–1.79:1 (the task's 3:1) | the resting fill on hover and while pressed for `:disabled` / `[aria-disabled=true]` KERN buttons (overlay rule; ExplainedButton's `hover:` / `active:` pin of T022 does the same for its buttons) | 3.17:1, 3.21:1 (with the 68 % above) | 2026-11-09 (closing report) |
| The faded inactive parts at the same 40 % (the task's 3:1 as for disabled text, see §6.10): a rule removed in a variant (U47: its name `#a5bbf9`, the data `#b7bbc3`, its condition and message `#9da0a6`), the faded connector (`CONNECTOR_FADED`, white on `#a5bbf9`), the inactive marks (`INACTIVE_OPACITY`) | 1.90–2.62:1 | the same token, 68 % (`opacity-(--kern-color-action-state-opacity-disabled)`); `RuleMenuItem` and `AccessLevelOption` faded a disabled entry with a hard-coded `opacity-40` and now use the token too (not reached as a state: computed, default text 2.62 → 6.52:1, danger 1.98 → 3.37:1, muted 1.92 → 3.43:1) | 3.17:1 (blue), 3.43:1 (muted), 6.52:1 (default text) | 2026-11-09 (closing report) |

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
| `BranchName` (+ `FindingsSegment`) | P29 tabs (kit: "In Bearbeitung", no tab drawn); V5 "Rules/Variant tab · fixes" `6529:39174` | c | the tab with its ⓘ and problem icon | default, selected, hover, focus, with icon | T006: kept c, KERN 2.8.2 ships no tabs CSS (the React kit’s Tabs needs its own styles, not imported); built by T026. **T026 (2026-11-08): kept c, no `index.css` rule.** Kit P29 `2:47775` draws no tab (its status block says "In Bearbeitung"), so the V5 component "Rules/Variant tab · fixes" (`6529:39174`, "KERN EXTENSION") is the source: the tab `pt-4`, column gap 8; the label row (name, 4, the 20 px icon, 4, the actions) 24 high; the name `body/default` 16/24 400 in `layout-text-muted` #4a5468, selected `label/default` 16/24 600 in `layout-text-default` #0b1220; the 2 px "Indicator" under the row across the tab, #0b1220 while selected; the row's 1 px `decorative-border` line and 24 px gap stay the tab row's (T064). The indicator is an own `span`, so no scoped override is needed. New optional props, old ones unchanged: `tab` (`id`, `panelId`, `selected`, `onSelect`, `onKeyDown`: `BranchName` then renders the tab button itself, one control holding the name only, its accessible name "<variant> has findings" while it has findings, W13), `actions` (the ⋯ slot after the icon, F28), `noFindingsInfo` (the grey ⓘ without a description reads "No findings.", FR-041b; Standard passes none, FR-035c); `findings.kind` gains `error`. The icon by severity (build note 26, U06 6760:48852): grey ⓘ `layout-text-muted` (description or "No findings."), blue ⓘ `feedback-info` (§1.5 AA value) for duplicates / always met only, orange ⚠ `feedback-warning` #9a4a00 for a contradiction (U46 6758:43060, U71 7058:61618), red error diamond `kern-icon--danger` in `feedback-danger` for a spec 002 problem (U50 7375:101551, FR-041a). States the V5 frames don't draw (the kit draws no tab): hover and pressed darken an unselected name to #0b1220, weight kept, 150 ms (`.motion`); keyboard focus KERN's 4 px `action-focus-default` ring, offset 2, none after a click. `FindingsSegment` on the dark bubble (U46 6758:43524): divider `layout-text-inverse` white at 24 %, the kind icon white, its parts 8 apart through the bubble's own gap. Call sites unchanged (they keep the `children` form until T064, T073, T079 switch to `tab`) **T070 (2026-11-09):** `BranchFindings` gains the optional `more` (a second segment): under a problem, the variant's findings, below their own divider, each with its own white icon (U06 note 8); `FindingsSegment` renders it (`SegmentDivider`, `SegmentLine`). The rules step's `BranchTab` takes `problem` and `findings` separately and passes `{ ...problem, more: findings }`; the test step and the details pass no `more`. **T079 (2026-11-09):** the details' tabs switch to the `tab` form, with `findings` from `tabFindingsOf()` and no `more`, no `actions`, no `noFindingsInfo`. **Bug v5-ui-fixes (2026-11-18):** `noFindingsInfo` and its copy `noFindings` ("No findings." / "Keine Befunde.") removed, with no caller left: a tab shows a problem’s red icon, the findings’ icon, the description’s grey ⓘ, or nothing; a variant without a description and without findings shows no icon, as Standard does (spec Clarification 2026-11-18 #2). The approval page’s own "No findings." is unaffected. |
| `Checkbox` | V5 "Data/Check item" `6027:17252`, build note 2 (P33 base-checkbox is KERN's 32 px box) | b | `kern-form-check__checkbox` + the scoped override in `index.css` headed with this row: the flex row (4 px above and below, 8 px gap), the 20 px box, radius 4, 1 px `layout-border`, the 14/24 label; checked: action-blue fill with `check-white-small.svg` (= the design's icon-done-small) as a background image; mixed: a white 10 × 2 dash (radius 1) as an SVG background; KERN's `::before` tick switched off (`content: none`); hover, keyboard focus (3 px ring), disabled | default, hover, focus, checked, mixed, disabled | T006: kept b, `KernCheckbox` stays, the 20 px box, tick and mixed dash are the override; built by T016. **T016 (2026-11-08): kept b.** The V5 component "Data/Check item" (not the kit's 32 px base-checkbox) is the design's checkbox on every Flow screen (U26, U36; its description: "Built on Revamp tokens because the KERN Revamp base-checkbox is 32 px"); the override replaces the old `:indeterminate::before` rule. The box sits 2 px below the row's top padding (centred on the label's first 24 px line) so that a wrapping label keeps the box on its first line. New optional `disabled` prop |
| `ConfirmDialog` | P12, P33 dialog-actions | a + b | `kern-dialog` with 1–3 buttons, × and the scrim rule; `.kern-btn--danger` (filled on `--primary`, outline on `--secondary`) | open, long labels, scrollable, working | T006: kept a + c, on `kern-dialog` already; built by T035. **T035 (2026-11-08): a + b.** KERN's `kern-dialog` markup (`__header`, `__body`, `__footer`) with the overlay; utilities on the element: 480 wide (`w-480`, every screen's dialog: U14 `6699:44480`, U17 `7173:52682`, U25 `7299:52174`, U90 `6417:31599`; `wide` gives the kit's 600), centred with 16 px gutters on a narrow screen (`m-auto! min-w-0! max-w-[calc(100%-32px)]!` beat kern.css's bottom sheet below 768 px), radius `border-radius-large` 12 on every corner, the 1 px `layout-border` drawn inside (`border-0! ring-1 ring-inset`) and the footer's top line inside its 24 px (`pt-23!`), so the dialog is the drawn 480 × 256; the scrim `action-state-indicator-shade` #0b1220 at KERN's overlay 72 % (kern.css's own `::backdrop` opacity; only the colour changes, was black). Buttons (P33 dialog-actions): a grid of equal columns from a footer width of 384 px (2 buttons) / 528 px (3), a full-width stack below (container query on the footer), in the order cancel, secondary, confirm; 3 buttons stack in the 480 dialog (the kit's long-label variant), sit in a row in the 600 one; labels wrap inside the buttons. Cancel is secondary, tertiary with three buttons. **Danger buttons (option b, `index.css`)**: `.kern-btn--danger` re-derives `action-default(-contextual)`, the two shades (filled hover/pressed) and the two tints (outline hover/pressed) from the overlay's `feedback-danger` #c4271c on the button; `kern-btn--primary kern-btn--danger` is the filled danger button ("Delete connection"), `kern-btn--secondary kern-btn--danger` the danger outline button ("Discard connection", "Remove 1 document") — no separate `kern-btn--danger-outline` class. Also in `index.css`: the pressed tint of every secondary and tertiary button (KERN's hover rule hid it, as T028 fixed for primary) and the dialog fade (§4) **T053, 2026-11-08**: third use of the form without cancel ("No data selected in 1 document": `secondaryDanger` "Remove 1 document" + "Choose data", scrim on; ×, Escape and the scrim answer as "Choose data"). |
| `ConnectionStatusBadge` → status pill | U07 #1 | c | dot + label, tint, radius 8 | active, draft, deactivated | T006: kept c, replacing today’s `KernBadge`: the pill has a dot, not KERN’s icon, and draft/deactivated are no feedback types; built by T019. **T019 (2026-11-08): kept c.** Own markup as V5 "Status/Connection" (`7341:101125`, U11 `6699:44264`, `6699:44277`, `6699:44290`, U93 `I7362:54693;6698:43405`): an inline pill 24 high (the instances' height; the component's 2 px vertical padding does not show at 24), padding 0 10, gap 6, radius 8 (`border-radius-default`), no border; an 8 px decorative dot (`aria-hidden`) and the label in `label/small` 14/24 600. Colours (raw hexes in Figma; the overlay token where the hex equals one): active `#eaf7e6` / dot and label `#1d7a2e` (`feedback-success(-background)`); draft `#e0f2fe` (`feedback-info-background`), dot `#0284c7`, label **`#05669e`** (the design's own blue, 5.38:1 on `#e0f2fe`, so no AA fix; UNCERTAIN against the task's "AA value of §1.5", see the report); deactivated `#eff1f4`, dot `#8c94a1`, label `#4a5468` (`layout-text-muted`). Labels "Active" (was "Live", the design's wording), "Draft", "Deactivated"; the text stays, so the status never rests on colour (005-ACC.1). "Scheduled" is F1 and not a type. The dot is a CSS circle (`rounded-kern-circle size-8`), not `icons/dot.svg`: an `<img>` can't take the per-status `currentColor`, and the circle is the same 8 × 8 geometry. Props unchanged (`isActive`, `draft`), no call site changed |
| `Connector` (+ menu) | FR-038 | c | the pill with the chevron and the two-option menu | default, open, read-only, faded | T006: kept c; built by T023. **T023 (2026-11-08): kept c**, KERN 2.8.2 has no pill or menu. V5 "Rules/Connector" (`6082:3467`, KERN EXTENSION; variants op AND/OR × mode edit/read only) on the row's 8 24 padding: label/small 14/24 600 in a circle-radius pill, padding 2 8 2 16, 2 px to the 20 px `icon-expand_more-small` (the repo's `expand-more-white-small.svg` / `expand-more-action-small.svg`, the same path and fill as Figma's export), 8 px to the 1 px `decorative-brand` line (#4f8cff); AND filled `action-default` with white text (28 high), OR white with a 1 px `action-default` border and blue text (30 high); read only (the details, U03 #26): no chevron, padding 2 16, a plain `span`. The menu is V5 "Rules/Connector menu" (U34 `6094:7052`): 300 × 189, 1 px `decorative-border`, radius 8, padding 8, parts 2 apart, `--shadow-menu`, two 64 px options (padding 8, gap 8, radius 4; label 14/24 600 over the description 14/24 muted; the chosen one `layout-background-hued`, its label `action-default`, the 20 px `icon-done-small`), the divider and the footer "Applies to every rule in <level>" (padding 8 8 4, 258 wide as drawn), which describes the menu (`aria-describedby`). Placed with T020's `MenuPlacement` and class sets as `ActionMenu` (preferred side `start`, the frame's 189 px height; `top-full`/`bottom-full`, `mt-8`/`mb-8`, the `max-h-*` step on the frame, the options scrolling inside while the divider and footer stay; `full` across the rules card, its up translate by the pill's 28/30 px + 16), `z-40`. States the V5 frames don't draw: the pill's hover / pressed as the kit's buttons (P09 button-primary-small `1914:12574`/`1914:12581`: a white `action-state-indicator-tint` layer at 8 % / 16 % on AND; button-secondary-small `1914:12697`: an `action-state-indicator-default` layer at 8 % / 16 % on OR, over its border), drawn as a `::before` under the label (`isolate`), 150 ms, `.motion`; keyboard focus KERN's 4 px `action-focus-default` ring, offset 2; the options as the ⋯ menus' entries (P33 `2:1985` 8 % / 16 % layers, over the chosen tint too; keyboard focus the `select-option` fill `2:2406`, texts and tick white). Faded (FR-051 (39), U47 `6185:8569`): 40 % (`action-state-opacity-disabled`) on the pill, the line and the mark one by one, **not on the row**, because opacity makes a stacking context that would fade the open menu and let the next (faded) row paint over it. Props unchanged (`operator`, `levelName`, `onSwitch`, `mark`, `faded`), no call site changed; the button's name stays "AND, switch Group 01 to AND or OR" (UNCERTAIN in the report) |
| `CopyableUrl` | U80, U81, U89 | a + c | the button on KERN's button; the one-line URL | default, hover, pressed, focus, "✓ Copied", disabled with explanation; the field variant | T006: kept a + c, on `kern-btn` already; built by T028. **T028 (2026-11-08): kept a + c.** The URL row of V5 "Links card" (U80 `6396:47718`): the URL box (c) `layout-background-hued` #f2f5fb, radius 8, 48 high, padding 8 16, `body/default/regular` 16/24 `layout-text-default`, one line cut with "…" (`truncate`, U07 note 33 `7370:55183`), 8 px to KERN's primary button (a) with `kern-icon--content-copy` and "Copy link"; the row's 32 px indent is the link card's (T078). The full URL stays the box's text (screen readers read it in full) and shows in a bubble with the tooltip's look (T022's `TOOLTIP_BOX`, 280 wide, breaking anywhere, `aria-hidden`) while the mouse is over a URL that is cut, 8 px below and flush with its left edge, placed with `placementFrom()`; Escape and leaving close it. The box has `contain: inline-size`, so a column that sizes to its content never grows with the URL. After copying, the button reads "✓ Copied" (`kern-icon--check`, the design's icon-done, U81 `6396:47841`) for 2 s (was 3 s), each copy restarting the 2 s, announced in the component's `role="status"` ("Link copied"); a failed copy selects the URL and says so. The button is T022's `ExplainedButton` (`align="end"`, `shrink-0` on `wrapperClassName`): new optional `deactivated` turns it off with the explanation "Activate the connection first" (W21; U89 `6417:31309` draws only the 40 %; UNCERTAIN text). Because `ExplainedButton` owns the button's `aria-describedby`, `describedBy` (the card's title and the variant's name) now joins the button's name through `aria-labelledby` after its label ("Copy link Request link"). New `variant="field"` (S20, W16): a labelled read-only `<input>` in the same box (label 16/24 600, 8 px above), focus selects the value, KERN's 4 px focus ring; `describedBy` describes the input there. New optional `texts` replaces the variant's labels and announcements (the field's default "Copy" / "Copied"). KERN's pressed shade never shows on a hovered button (its `:hover` rule outranks `:active`): fixed for every primary button by the `index.css` block below. Props: `url` and `describedBy` unchanged; `deactivated`, `texts` and the field variant (`variant`, `value`, `label`) new; no call site changed **T080 (2026-11-09):** `deactivated` wired on the details (four buttons off at 40 %, 'Activate the connection first' on hover and focus). |
| `CurrentUserProvider`, `RequireSignIn`, `RequireSignedOut` | — | — | no UI | — | no change |
| `ErrorNoticeText` | P07 | a | `kern-alert` danger with the error ID line | default | T006: kept a, it is text inside `KernAlert` at its call sites; **T017 (2026-11-08): kept a**: it stays inline content of `KernAlert`'s body paragraph (`kern-body`, 16/24) at its eight call sites, props unchanged; the design draws no error ID (F22, U79 #4), so the line "Error ID: <id>" keeps the body's style, on a line of its own, selected by one click; the ID breaks anywhere so that it fits at 320 px (FR-010); **coordinator (2026-11-08): + b** for every `kern-alert`: the scoped override in `index.css` ("Alert") moves KERN's outside outlines inside (`outline-offset` −2 px on the alert, −1 px on the body's dividing line, the body's lower corners rounded), so a title-only alert is the kit's 64 px, not 68 |
| `FeedbackLoader`, `PageLoader` | P22 | a + b | `kern-loader kern-loader--visible`, KERN’s 96 px (the size kit P22 draws); where a screen frame draws it smaller (the 56 px of S1, S6, S14), a scoped size override in `index.css` read from that frame | default | T006: changed a → a + b: kit P22 draws only the 96 px loader, so a smaller size is an override; `FeedbackLoader` moves from its own SVG spinner to `kern-loader`; built by T018. **T018 (2026-11-08): kept a + b.** Every V5 screen that draws a loader draws the component "Loader/Spinner 56" (U10 `6401:28662`, U78 `I6387:65280;6391:65811`; its description: "KERN EXTENSION · 56 px spinner in action blue on a light track. Rotates 1 s linear, infinite; reduced motion: no rotation, show the arc static"), so the override `.kern-loader--56` ("Loader, 56 px" in `index.css`) changes more than the size: a 52 px ring with 2 px margin (the drawn ring of radius 24, stroke 4, inside the 56 px box), border 4, track `decorative-border` `#e1e6f0`, arc `action-default` `#1d56f0`, KERN’s `::before` / `::after` turned into 4 px round caps, the arc turned 135° into the drawn top-right quarter, 1 s per turn. `FeedbackLoader` (new optional `size`, `56` default, `96` = KERN’s loader under the overlay as P22 draws it: `#4a5468` arc on `#eef1f6`) renders the decorative loader (`aria-hidden`) and the label (title/default 18/24 600) 16 px under it in one polite `role="status"`; the old 40 px vertical padding is gone (the frame’s block `6401:28661` has none). Under reduced motion the loader carries `.motion` (§4), which stops the turn and leaves the arc where the frame draws it. `PageLoader` is that block centred in the window on the white page (U10 `6401:28567`), with a new optional `label` (default "Loading…", `KERN_TRANSLATIONS.loading`; T042 passes "Loading your connections…"); it replaces the React kit's `KernLoader` (no visible text) |
| `FindingNote` | U44–U46 | c | the note under a rule or group | warning, info | T006: kept c; built by T025. **T025 (2026-11-08): kept c**, own markup as V5 "Rules/Problem note" at the levels conflicting / redundant (`6177:7837`; U44 `6171:7489`, `6750:41109`; U45 `6753:40823`, U44 `6171:7509`): the 20 px kind icon, 4 px, the text in `body/small` 14/24 regular `layout-text-default`, `0 0 8 24` (32 high). Conflict: `icon-warning-small` = `kern-icon--warning` in `feedback-warning` `#9a4a00` and the warning outline; redundant and always met: `icon-info-small` = `kern-icon--info` in **`feedback-info`** (was `layout-text-muted`: every V5 note draws the icon in `#0284c7`; the overlay's AA value `#0273ae`, §1.5) and the info outline. The text size is now `text-kern-static-small` (the overlay's 14) instead of KERN's primitive `--kern-font-size-14`. The kind stays as hidden text before the note ("Conflicting:", W19); the texts are the checks' (`findingMessages.ts`, W13). Props unchanged (`id`, `kind`, `text`), no call site changed |
| `FormConnectionLoadState` (+ `LoadFailed`) | P07, U06 #95 | a + c | the alert; the skeletons | loading, failed | T006: kept a + c; **T017 (2026-11-08): kept a + c**: loading is own markup (c), the kit's skeleton rows in a card as U74 draws them (`7062:51018`, `7062:51211`; the two greys `#e4e8ef` / `#eff1f5` are raw values in Figma, no variable), with a polite `role="status"` reading "Loading the connection…" instead of the old spinner; failed is the h1 and KERN's danger alert (a) keeping its body (F22, W2): the reason with a 5xx error ID when a caller passes `notice` (new optional prop), "Try again" (secondary small) and "Go to your connections" **T080 (2026-11-09):** the failure's notice comes from the state (`useFormConnection` keeps `notice` in `failed`; the `notice` prop is gone); new `variant` and `skeleton` props; `footer={null}` renders no footer. The details pass `variant="details"`, `DetailsSkeleton` and a footer only while loading. |
| `FormErrorMessage` | P14 error, build note 7 | a | `kern-error` with its danger `kern-icon` under the field | default | T006: class corrected: KERN 2.8.2 has no `kern-form-input__error`; its field error is `kern-error` (flex row, 8 px gap, the danger-tinted icon); built by T015. **T015 (2026-11-08): kept a.** KERN's markup as the React kit renders it: `p.kern-error` > `span.kern-icon.kern-icon--danger` (24 px, `feedback-danger` fill, KERN's 6/2 margins) + `span.kern-body` (16/24, 400, `layout-text-default`); the kit's "error-message" (P26 `1076:17479`, U19 `6699:45398`) draws exactly that, so the overlay alone matches: the old 14 px semibold red text with its own SVG is gone. Inside a `kern-form-input` KERN puts it 8 px under the field. Props unchanged (`message`, `id`, `role`) |
| `GroupFrame` (+ header, message) | U34, U35 | c | the group frame, the subtitle, the message card with the pencil | default, with message, removed, faded, selected | T006: kept c; built by T025. **T025 (2026-11-08): kept c**, own markup as V5 draws "Group wrap" › group (U34 `6094:6411`, `6094:6318`): the wrap's padding 8 16; the frame 8 px above its header, a 3 px `action-default` left border, `layout-background-hued` with square corners for a group, white with radius 8 for a sub-group; "Rules/Group header" (`6082:3513`) 24 in, 16 from the right, 8 above the 1 px `decorative-border` divider, the name `title/default` 18/24 (group) or `title/small` 16/24 (sub-group) in `action-default` over the subtitle `body/small` muted, the mark and ⋯ 8 apart. **Subtitles** "All rules must be met" / "At least one rule must be met" (FR-051 (32)) now in `GROUP_FRAME_COPY` (was the rules package's `GROUP_SUBTITLES`, "All of these must be met", which stays the test results' statement). **Message card** (U35 `6324:39410`): right under the header, `feedback-info-background`, 1 px `decorative-border`, radius 8 (was `rounded-kern-large`, 12 under the overlay), padding 8 16, gap 8; the label **"Message for citizens:"** (C2, was "Error message citizens read:") `label/small` `feedback-info`; the pencil and the hint's info icon both `feedback-info` (the hint's icon was muted). **Changed** (U58 `6522:32997`): the purple tint, the blue border kept; **added** (U38 `6163:5269`): tint and the purple `#8a22b5` border (`border-variant-new`, unchanged). **Removed / dissolved** (U47 `6185:41165`): frame, "Removed here" and ⋯ at full colour, name and subtitle at 40 % and the name struck; its message card, its note slot and its connectors (`Connector`'s `faded`) fade part by part. **Faded** (inside a removed group, U47 `6185:41171`): Figma fades the sub-group's whole box; the frame fades its parts instead: its fill, border and header divider as their colours at 40 % (`/40`), the header text at 40 % with the name struck, message and connectors faded, its mark at full colour (F36). **No opacity box around the members any more** (carried from T019, T023, T024): the members fade themselves (the call sites already pass `faded`); `RuleRow` needs a change for that (see Notes). **Selected** (F33): a new optional `selectBox` slot before the frame, as `RuleRow`'s; the selected group looks unchanged. New optional `faded` on `GroupFrameMember` (fades the connector before it, the call site's decision, FR-051 (39)). No `index.css` rule; no call site changed |
| `IconTile` | U19 `6699:45330`, U11 `6699:44495` | c | the icon tile | default | T006: kept c; built by T018. **T018 (2026-11-08): kept c; frames corrected**: U10 #17 and U74 draw no tile (the 56 px spinner and the persona ring are not tiles); the design’s tiles are "Icon tile" in the connection card header (U19 `6699:45330`, also U98 `6731:39830`, U18 `6793:47720`: 40 × 40, `action-default` fill, radius 8, a 24 px white glyph 8 px in) and in the welcome page's steps (U11 `6699:44495`, U18 `6793:47691`: 48 × 48 circle, `layout-background-default`, a 24 px ink glyph 12 px in). New tones `action` and `plain` draw them; the old tones `blue`, `grey`, `outline` stay for the pages not yet rebuilt (now radius 8, the design’s square tile, was `radius-large` 12), props unchanged, no call site changed |
| `InfoTooltip` (+ `ExplainedButton`) | U37 `6151:33820`, U46 `6758:43524`, U81 `6809:46590`, U07 #16 (`7370:55189`) | c | V5 "Rules/Tooltip" `6139:3739`: the dark bubble, **no arrow**, 280 px, 8 px from its trigger; blue ⓘ on blue, muted elsewhere, action blue after "Add variant" (`tone`); the disabled button with explanation as the named export `ExplainedButton` | closed, hover, focus, touch; the disabled button's hover, focus, touch | T006: kept c, KERN 2.8.2 has no tooltip; built by T022. **T022 (2026-11-08): kept c.** Own markup on Tailwind: the bubble is `layout-background-inverse` #0b1220 (no KERN 2.8 name, so `bg-kern-layout-text-default`, the same value; `index.css` was T015's in this wave), radius 8, padding 8 16, parts 8 apart, `body/small` 14/24 white, 280 wide, no border, no shadow and no arrow: the V5 component draws none on any of the three frames (U37, U46, U81), so the old light-blue bubble with `tooltip-arrow.svg` is gone (Figma decides styling; §1.3 already noted "the V5 tooltip draws no arrow"). It sits 8 px below its trigger (U81: ⓘ bottom 480, bubble 488), its edge 8 px past the ⓘ's edge (U81: 435 vs 443), flush with a button's edge; placed with `placementFrom()` (side and direction, an 88 px height for the up/down choice); the gap is padding, so the mouse crosses onto the bubble. The ⓘ's colour by `tone` (`muted` default, `info`, `action`; build note 35); `icon` still overrides glyph and colour (the findings icons). `ExplainedButton` (design-notes §3): `aria-disabled="true"` while `explanation` is set, focusable, ignoring click, Enter, Space and submit, the explanation in the same bubble as its `aria-describedby`; KERN's `[aria-disabled=true]` 40 % (U29 `6348:40236`, U30 `6350:41190`), and KERN's hover and pressed layers cancelled while disabled |
| `LocalDraftsOffer` (+ item) | U16 | c | the grey banner | one draft, several, discard dialog | T006: kept c; built by T029. **T029 (2026-11-08): kept c**, KERN 2.8.2 has no banner of this kind; the buttons are KERN's (a): `kern-btn--tertiary kern-btn--small` and `kern-btn--secondary kern-btn--small` with `kern-icon--edit` (the kit's button-tertiary-small / button-secondary-small: 40 high + 4 margins = the drawn 48, padding 0 8, label 14/24 600 with padding 4 8, 20 px icon), no `index.css` rule. Built as V5 "Banner · Unsaved work on this device" (U16 `7362:54550` one draft, `7362:54621` several): `feedback-default-background` #eef1f6 (the frame's fill; the annotation says "layout/background/hued", the fill decides), 1 px `decorative-border-level-1` #d0d8e6, radius 8, padding 16 16 16 20; heading `title/small` 16/24 600 `layout-text-default`, sub-line `body/small` 14/24 muted. **One draft** (FR-029d): heading "Unsaved changes in “<name>”", sub-line "Saved only on this device on <dd.mm.yyyy, hh:mm>, when the page closed. Nobody else can see them." (the frame's text: with the date, as no item line shows it), the buttons in the heading's row 16 apart; the h2 and a one-item `ul` stay, the item's name and line `sr-only`. **Several**: "Unsaved changes in <n> connections", "Saved only on this device when the page closed. Nobody else can see them.", 8 px under the text, one `li` per draft with a 1 px top divider in the raw `#d9dee8` (no variable), padding 8 0, the name 280 wide (`label/small` 14/24 600), the line "Edited · …" (stored draft) / "New, never saved · …" (never saved) `body/small` muted, then "Discard" and "Resume editing" 16 apart. Dates `dd.mm.yyyy, hh:mm` (cosmetic 3; also `RestoreDialog`'s date, which uses `formatChangedAt`). Buttons in the drawn order, "Discard" before "Resume editing"; "Resume editing" for a never-saved item too (FR-029e). The visible tertiary label is the frame's "Discard"; its accessible name "Discard changes in <name>" carries the layer's and note's "Discard changes" (UNCERTAIN, see report). The discard dialog is the existing `ConfirmDialog` with 005-S4's copy (T035 restyles it). Narrow widths: the parts wrap (the buttons together), no horizontal scroll at 320. Props unchanged (`exceptFlowKey`, `emptyFocusRef`); `LocalDraftItem` gains `only`; no call site changed |
| `MenuSearchField` | P26, P33 base-search; V5 "Rules/Search field" `6093:3725`, "Data/Search field" `6241:12480` | c | own markup with Tailwind and the overlay's tokens: `menu` as V5 "Rules/Search field" (white, 1 px `decorative-border`, radius 8, 40 high, 16 px padding); `panel` as V5 "Data/Search field" (KERN's `kern-form-input__input` with the 20 px `kern-icon--search` in `action-default` inside, text from 44 px) | default, hover, focus, with text | T006: changed a → c: KERN 2.8.2 ships no search CSS (no `kern-search`, no `type=search` rule); the component is own markup already; built by T015 (T027 uses it). **T015 (2026-11-08): kept c.** The screens draw two search fields, neither the kit's P26 search (field + blue button): the menus' "Rules/Search field" (U32 `6358:61888`, already the old markup's values) and the panels' "Data/Search field" (U21 `7290:61990`); the new `variant` prop (`menu` default, `panel`) picks one. States the V5 components don't draw come from P33 base-search (`1067:17092`): hover, the line darkening (`menu`: the frame to `form-input-border` `#22293a`, 150 ms, `.motion`; `panel`: KERN's 4 px bottom line), keyboard focus the kit's 4 px `action-focus-default` ring outside the field (`menu`: was inset by 4, now offset 0, inside the menu's 8 px padding; `panel`: KERN's), disabled 40 % (`panel` only, KERN). `controls` and `onKeyDown` became optional, `label` (accessible name, default the placeholder) is new; spell check off. No `index.css` rule. **Bug v5-ui-fixes (2026-11-18):** keyboard focus 2 px: `menu` `focus-visible:outline-2` (was `outline-4`), `panel` through the `index.css` override on `.kern-form-input__input:focus` (`TextField` row). |
| `NotFound` | P07 | c | the alert and the way back | default | T006: kept a + c; built by T037. **T037 (2026-11-08): c** (the alert part dropped, UNCERTAIN): the design's empty state (§3 "Empty state", U11 `6699:44481`'s anatomy): `PageTitle size="x-large"` "Page not found" as the one heading (heading/x-large 500 32/40, `6699:44486`), then the light blue card (`bg-kern-layout-background-hued`, `rounded-kern-large` 12, padding 48 and gap 48 from `md`, padding 24 below; `6699:44488`) holding the baseline's sentence (body/default 400 16/24 muted, max 578 wide as `6699:44490`), 32 px above the one primary action "Go to connections" with the forward arrow (`kern-btn--primary`, 48 high, `6699:44508`), and the wallet star 200 × 193 at the right (`6699:44509`, `alt=""`, U02 build note 12), hidden below 768 px in a wrapper (kern.css's unlayered `img { display: block }` beats `hidden` on the `img` itself). No alert: a 404 has no reason or error ID to carry, and a title-only alert would repeat the h1 (U02 #5's slim alert is for errors and warnings; the error state of a page keeps it). No eyebrow "Error 404" (no frame draws it). `constants.ts`: `title`, `text` (baseline), `action` "Go to connections"; `eyebrow` removed. Used by the Approval page (unknown request) and `FormConnectionLoadState` (unknown or deleted connection, inside `WizardLayout`, where the column's 32 px gap puts the card 32 under the h1 instead of AppLayout's 16) |
| `PageTitle` | P31 | a | `kern-heading-display` for the 40/48 page h1 (kit “heading/display”, 2x-large adaptive), `kern-heading-x-large` (32/40) and `kern-heading-large` (24/32) where a frame uses those styles | default | T006: class corrected …; **T017 (2026-11-08): kept a**, with a new optional `size` prop (`display` default, `x-large`, `large`) choosing the KERN class; `py-0!` removes KERN's baseline paddings, because the frames draw the text boxes without them (U11 `6699:44244`: 40 + 24 = the 64 px block; U74 `7062:50965`: 32 + 24), and the hint follows right under the heading (gap 0, was 8), `body/default` 16/24 muted (`body/small` 14/24 under `large`); the heading drops `focus:outline-none` (CLAUDE.md: never `focus:`) for `outline-none` (it is no control); built by T017 (T043 uses `size="x-large"`) |
| `RuleRow` (+ name, predicate, sentence, message, problem note, value chip) | U30, U55 | c | the row, the statement chips, the symbol chips | default, hover, open menu, selected, removed, problem, linked | T006: kept c; built by T024. **T024 (2026-11-08): kept c**, own markup on Tailwind as V5 "Rules/Rule row" (`6083:3453`) draws it: the row padding 8 16 8 24, gap 16; the content column gap 4 (name row, sentence, message); the name `label/small` 14/24 600 in `action-default`; the sentence (C3) "<glyph 16> Personal ID · <data> <≥> <words> <values>": document `body/small` muted with the separator "·" (was "–", `RULE_ROW_COPY.documentSeparator`), data `label/default` 16/24 600, words `body/default` 16/24 muted, 8 apart and 4 between wrapped lines; the symbol chip (`Rules/Symbol` `6082:3409`: white, 1 px `decorative-border`, fully round, min 24 wide, 0 8 padding, 14/24 600) and the value chips (`Rules/Value chip` `6082:3447`: white, 1 px `decorative-border`, radius 4, 2 8, 14/24 600), cosmetic 22; "Message for citizens:" (C2, was "Error message citizens read:") in `label/small` muted, 8 px before the message in `body/small`; the actions column (mark, ⋯) gap 8, centred, and kept 32 × 32 when empty (U82 `6650:37780`: the read-only row reserves it). Problem and finding: the row 8 px in from the card in an outline (white, 1 px `feedback-danger` for a problem, the finding's colour otherwise, radius 8) with the note under it (24 in, 8 above the bottom; the problem note `Rules/Problem note` level=blocking `6110:3657`: 20 px info icon, 8 gap, 14/24 600 danger); the outline's colours change in 150 ms (`.motion`). Removed (U47 `6185:8570`): name, statement and message fade to 40 %, statement and message struck through, the mark and ⋯ not faded; the message line stays (F36, FR-040; the design hides it). Selected: a new optional `selectBox` slot before the row (U36 `6344:53557`; the row itself is drawn unchanged, no tint). Linked: no link icon (002-S4.31 "on every linked rule or none", spec 002's choice "none", CLAR 2026-11-07 #24 (b); U40's two icons are not built). Read-only (details): `showIdentifier` shows "rule-7" 8 px after the name in `body/small` muted with the hidden word "Identifier" (F35; the design draws no identifier). V6: no `overflow-*`, `transform` or `filter` in the row. No `index.css` rule. Props unchanged except the new optional `selectBox`; no call site changed |
| `TextField` | P14, P33 base-input-field, base-textarea; V5 "Form/Textarea" `6681:40216` | b | `kern-form-input` text, password, textarea | default, hover, focus, error, disabled, readonly | T006: kept a, on `KernInput` already; built by T015. **T015 (2026-11-08): kept a**, no `index.css` rule: `kern-form-input` / `kern-form-input__input` with the overlay give the kit's states as drawn (48 px, `layer-surface` fill, 2 px `form-input-border` line, radius 4; hover a 4 px line; focus KERN's 4 px `action-focus-default` ring outside, in `feedback-danger` on an error; disabled 40 %; readonly no fill and a 1 px `layout-border` line; error `feedback-danger-background` and a 2 px danger line). Utilities on the KERN markup: the placeholder in `layout-text-muted` (kern.css sets none; U19 draws `#4a5468`), and for `multiline` the V5 "Form/Textarea" (`h-120!`, KERN's own 8/16 padding, `resize-y`, spell check on by default, FR-032). The label row is U19's (`6699:45394`): label 16/24 600 without KERN's baseline padding, 4 px to an addon, 8 px to the field; "(optional)" in the label's own style (was KERN's muted "- Optional"; U19 `6699:45401`, report cosmetic 6); the red "*" (`requiredMark`, `aria-hidden`) as U19 `6699:45396` draws it. The danger bar (`kern-form-input--error`) wraps the field and its message only, not the label (U19 `6699:45398`; the kit's P26 error wraps the label too: the screen frame decides). New optional props, no call site changed: `multiline`, `trailing` (the password toggle's slot inside the field's right end, `pr-56!` on the input, FR-051 (29)), `requiredMark`, `hint` (KERN's `kern-hint`, linked), `invalid` (error state without a message, F16) **T064 (2026-11-09):** the variant dialog (U37 6139:32693, U52 6197:12011) uses `TextField` (`requiredMark`; `multiline optional hint`) with screen-level utilities on a wrapper (`RulesStep/constants.ts` `VARIANT_FIELD_CLASSES`): the labels with the kit's label baseline 6/2 (32 px; U19 draws none), the helper as body/default 16/24 `layout-text-default` with its baseline and 8 px under it, the textarea 64 high (`TextField`'s 120 is step 1's "Form/Textarea"), and on a refused name the danger bar beside the label too (the kit's P26 error, as U52 draws it; the §2 row says "the screen frame decides"). `TextField` itself unchanged. The "Start with" radios are the design's "Data/Radio item" (6387:26931, a KERN extension matching "Data/Check item"): KERN's `kern-form-check__radio` with utilities on the element (`START_WITH_OPTION_CLASSES`: 20 px, 1 px `layout-border`, selected 1 px action blue with a 10 px action-blue dot; hover, focus as the Checkbox override), no `index.css` rule; `AccessLevelChoice` keeps the kit's 32 px radio. **Bug v5-ui-fixes (2026-11-18): changed a → b, the focus ring 2 px.** KERN 2.8.2 draws a fixed 4 px outline on `.kern-form-input__input:focus`; an override in `index.css` after the KERN import, `.kern-form-input__input:focus, .kern-form-input__select:focus { outline-width: var(--kern-metric-border-width-default); }` (2 px), covers text inputs, text areas, the error state (whose rule sets only the colour) and the selects; KERN’s colour, `outline-offset: 0` and padding swap stay. Decided with the reporter (§5.1 TextField’s note). |
| `Toast` (+ message) | U10 #20, U51, U17 #39, U61 #9 | c | the dark toast, bottom centre, optional action | neutral, success, with action, with error ID | T006: kept c, KERN has no toast; **T036, 2026-11-08: built c; kinds `neutral` / `success` (U61's drawn `danger` type built as neutral, UNCERTAIN); `noFooter` for pages without the footer bar** |
| `TopBar` | L2 | c | the two pills, the connection pill | signed out, signed in, in a connection, scrolled | T006: kept c; built by T031. **T031 (2026-11-08): kept c**, own markup as "Shell/Header · two pills" (`6688:41392`) and "Shell/Header · in a connection" (`6698:43392`) draw it: a `header` (sticky, `z-30`, `pt-16 px-16`, so the header area is 64 high with the pills 16 from the top and the sides), transparent, white (`layout-background-default`, 150 ms `.motion`) once `window.scrollY > 0` (U03 #39). Pills: 48 high, `rounded-kern-circle`, `--shadow-card` ("Elevation/Card"), the Konnekt pill `layout-background-hued` signed in / white signed out (new prop `signedOut`, U03 #33), padding 0 24 0 16, gap 8, the 24 px logo (`assets/illustrations/logo.svg`, new: Figma's export of the "logo" layer, `#1d56f0` squares) and "Konnekt" 16/24 600; the pills' gap 16 (two pills) or 8 (in a connection), the stretching spacer between them. **In a connection** (`title` set): "Pill · Where you are" `layout-background-hued`, padding 0 16, gap 8: "Your connections" (`label/small`, `action-default`, a link home, underlined on hover as U17 6a draws it), "/" (`body/small` muted, `aria-hidden`), the name (`label/small` ink, `truncate`, the h1 with `titleAsHeading`), the status pill 8 px after it (T019's `badge`); a `nav` "Breadcrumb". It grows out of the Konnekt pill on mount: `animate-pill-grow` (a `clip-path: inset()` reveal from its left edge, 240 ms ease-out; `width: auto` can't be transitioned in every browser) and its text `animate-pill-text` (opacity, the last 120 ms), both `.motion` (FR-050, U03 #40). `onLeave` (new, T048): a plain click on the product name or "Your connections" calls it instead of going home (modifier clicks still follow the link). `meta` (the description, W10) stays: muted 14/24, one line with "…", after the second pill (U80/U91's breadcrumb row is T078's to check). No DE/EN switch (F6). Below `md` (no frame) the second pill and the meta take rows of their own (header 120 high with the pill), the name truncating (W2, 320 px: no horizontal scroll). Props `title`, `titleAsHeading`, `badge`, `meta`, `logoTo`, `children` unchanged; `signedOut`, `onLeave` new; `AuthLayout` passes `signedOut` (one-line change) **T078 (2026-11-09): checked on the details** with the seeded "FS-20417" and a 90-character description: the meta renders after the connection pill on the pills' row, 14/24 muted rgb(74 84 104), one line cut with "…", vertically centred on the 48 px pills (y 28); U80 / U81 / U88 draw no description (U80 006-S3.1), so W10's placement stands. Closed. |
| `UserMenu` (+ `SignOutDialog`) | U13 `6699:44358`, U17 | c + a | the account pill and its menu; the log-out dialog on `ConfirmDialog` | closed, open, focus, the dialog | T006: kept c + a; built by T031. **T031 (2026-11-08): kept c + a.** The account pill (U11 `I6699:44242;6688:41398`, build note 14): 56 × 48, white with an `action-default` layer at 12 % (`::before`), pl 8 pr 4, T004's `person.svg` (24) and `expand-more-small.svg` (20) in `action-default` as masks (`.icon-person`, `.icon-expand-more-small` in `index.css`: the files fill with `currentColor`, which an `<img>` can't take); no initials, no name (FR-030; `initialsOf()` and its test removed); hover / pressed / open the kit's "states" layer on `::after` (8 % / 16 %, 150 ms `.motion`), keyboard focus KERN's 4 px ring offset 2; accessible name "Signed in as <username>". The menu "Shell/Account menu" (U13 `6699:44358`): **260** wide (not the ⋯ menus' 220: the frame draws 260), 1 px `decorative-border`, radius 8, padding 8, gap 4, `--shadow-menu`, `z-40`, placed with `placementFrom()` and own class sets (`ACCOUNT_MENU_PLACEMENTS`, `end` preferred: right edge on the pill's, 8 below); the name in `label/default` 16/24 600 with padding 8 (F17: no email), a divider, then the entries as U13's "Menu item · Log out" draws them: 40 high, padding 8, `body/small` 14/24 **regular**, ink, **no icons** (the old account-circle and logout icons are gone), radius 4; hover / pressed / keyboard focus as the ⋯ menus' entries (T021's `ACTION_MENU_STATES`, the select-option focus fill). "Your account" (a link, 007-S2) then a divider then "Log out" (UNCERTAIN: see the report). Behaviour as the baseline: Escape, Tab, a click outside close it; arrows, Home, End; the local-drafts warning (`SignOutDialog` on `ConfirmDialog`, unchanged; T035 restyles the dialog), focus back on the pill after "Cancel". New: after logging out the sign-in screen gets the router state `{ from, loggedOut: true }` (`LoggedOutLocationState`) for its toast (T040); new optional prop `onLogOut(logOut, trigger)` for the editor's "Save before you log out?" (T048) |
| `ValuesPicker` (+ option item) | U32 `6357:43090` (menu `6357:43382`), U48 `6191:42065` / `6191:42209`, `6191:42191` | c | the picker with search and "Done" | open, option hover/focus/selected/disabled | T006: kept c; built by T027. **T027 (2026-11-08): kept c**, KERN 2.8.2 has no menu or multi-select. The field is V5 "Rules/Multi-select field" (`6191:41863`, U48 `6191:42191`): 40 high, pl 16 pr 8, gap 8, radius 8, 1 px `decorative-border`, open 2 px `action-default` (1 px border + 1 px inset ring), the chosen values as "Rules/Value chip"s (codes only, 4 apart), unchanged. The menu as U32 "Menu" `6357:43382` draws it: 300 wide, 1 px `decorative-border`, radius 8, padding 8, parts 2 apart, `--shadow-menu`, 8 px below the field at its left edge; T015's `MenuSearchField` (`menu`) on top ("Search classes" / "Search options", from 10 options or for classes); the list (`min-h-0 overflow-y-auto`) under it; the baseline's footer ("Select at least one option." / "No options match “…”.", divider + 14/24 muted, padding 8 0 4 8) kept; then the **"Done"** row (U32 `6357:43428`, FR-039, CLAR Q27): KERN's secondary button right-aligned, which closes the menu, keeps the choice and gives the focus back to the field (Escape does the same). Class options are "Rules/Menu item · class" type=multi (`6358:43249`/`6358:43255`, W19): min 40 high, padding 8, gap 8, radius 4, the box in a 4 px-padded 28 px slot, the code `label/small` 14/24 600 min 32 wide, the description `body/small` 14/24 400 filling the rest (44 high, 64 when it wraps); other values are "Data/Check item" (`6027:17252`, U48): 28 px rows in a list padded 4. The box is KERN's `kern-form-check__checkbox` with T016's `Checkbox` override in `index.css` (no own box any more; `mt-0!` drops the override's 2 px top margin, the slot centres it): default, hover 2 px blue (also over the label), checked with the tick, checked hover the 3 px tint ring, keyboard focus the 3 px `#0b1220` ring on the box only. States the V5 frames don't draw: a class row's hover / pressed as the kit's "states" layers (P33 `2:1985`, 8 % / 16 % action blue, 150 ms, `.motion`), as the ⋯ menus' entries; a disabled option (new optional `ValueChoice.disabled`) at the kit's 40 % (KERN fades the box, the row its texts), not toggled, skipped by the arrow keys. **Placement** with T020's `placementFrom()` and class sets (`VALUES_MENU_PLACEMENTS`): the up/down choice uses the drawn 316 px height (or the menu's own, if shorter) so that it opens down where U32's menu fits ("Rules/Picker": "Menus always open downward"), else up; the frame takes the `max-h-*` step, the list scrolls inside while the search field, the footer and "Done" stay put; where neither side fits (320 px) it spans the rule editor's content (`inset-x-24`), and opening up its static wrapper becomes a flex column so that it starts at the field's top whatever the field's height (wrapped chips). The persona form field (`field`, test step) keeps the baseline: its menu spans the field below it, in the data card that scrolls it, at the 400 step (was a 280 px list). `z-40` (was `z-20`). No `overflow: hidden` on the frame (the search field's 4 px ring shows in the padding). No `index.css` rule. Props unchanged; `ValueChoice` gains optional `disabled`; no call site changed. **T061 (2026-11-08):** the rule editor's `ChoiceMenu` no longer uses `z-20`, `mt-4`, `max-md:left-24`: it uses `placementFrom()`, `z-40` and 8 px as the values menu does (T027's carried note closed). **T062 (2026-11-08):** chips kept in the field, not U32 `6357:43363`'s "B, BE" text (U48's "Rules/Multi-select field" `6191:42191` and 002-S3.39); "Search classes" kept on the licence classes (U32 `6358:61888`, 002-S3.37) where U48 draws "Search options"; footer and error "Choose at least one option." (U48 #16, #23, cosmetic 9) |
| `WizardLayout` | L3 | c | the sticky step header and footer, page scroll | create, edit, saving, loading, failed | T006: kept c; built by T033. **T033 (2026-11-08): kept c (+ b for the footer buttons).** The design's page L3 (U19 `6699:45321`): white page (`layout-background-default`; the old `neutral-025` is gone), `TopBar` + `UserMenu` (T031; `onLeave` and `onLogOut` passed through for T048), the step header, the content column and the footer, in a `min-h-dvh` column. **The page scrolls** (U01 #15, research R4): no inner scroll container, no `split:`, no `[@media(height<30rem)]`, no `cqh`. The **step header** ("Shell/Step header · compact", U03 #42–#43): a full-width white band (`z-15`) holding the 1120 column with `pt-32 pb-24` and the `head` (T032's step line, then `PageTitle size="large"`: heading/large 600 24/32, body/small 14/24 muted, no gap) 16 apart (the instances' 16, not U02 #1's 8; T032 carry); sticky at `top-64` under the pills where the window has room (`wizard-pinned:`, a new custom variant: ≥ 768 px wide and ≥ 640 px tall), else it scrolls away. The **footer** ("Shell/Footer" `6262:12701`, U01 #20): white, the 1 px `decorative-border` line as an inset shadow (so 16 + 40 + 16 = 72), the 1120 column, gap 8, wrapping into rows (005-ACC.4), sticky at the bottom in windows ≥ 480 px tall (`[@media(height>=30rem)]:sticky`), else at the page's end; option b: `.wizard-footer .kern-btn { min-height: 40px }` and the outlined button's label `padding-block: 7px` (its 1 px border is outside the label, Figma draws it inside the 40) in `index.css`. **How much the sticky parts cover** is measured (ResizeObserver + `resize`, `useLayoutEffect`) and published as `--wizard-sticky-top` / `--wizard-sticky-bottom` on `<html>`, removed on unmount: `index.css` uses them for `scroll-padding-top` / `-bottom` (focus and `scrollIntoView` stay clear of the header and footer, WCAG 2.4.11), `placementFrom()` for the menus' edges, `Toast` for "24 above the footer", the selection bar for its pin line, the documents list and the test panel for the visible height (the exceptions' slots, U01 #16–#19, F43). New props: `variant` (`steps` default, `details`: no step header, the 832 column, L4, for T078), `onLeave`, `onLogOut`; `footer={null}` renders no footer (the restore screen). `constants.ts` new (`STICKY_*_PROPERTY`, `STEP_HEADER_CLASSES`, `FOOTER_CLASSES`, `COLUMN_CLASSES`, `VISIBLE_HEIGHT_CLASSES`). The footer's actions (`EditorFooter`): Back and "Save and exit" (tertiary with the "save" glyph, cosmetic 17) or "Discard changes" (tertiary with the "undo" glyph, FR-045; an `onDiscard` slot, wired by T083) left, 8 apart; the step's action right with `ml-auto`; "Test rules" is T022's `ExplainedButton` ("Save the rule first" / "Finish grouping first", FR-034, W21) **T037 (2026-11-08)**: the page fade on `main` (step header, content, footer), keyed by the path (`key={pathname}`; the path is also in `useStickyEdges`' dependency key, so the observer follows a remounted step header and footer); a module-level `shownPath` (`usePageFade`) keeps a layout that takes over on the same path (loading → loaded, the restore screen → the editor) from fading in a second time. A change of step keeps the path: no fade, no scroll, the step's h1 takes the focus (unchanged, T033) **T078 (2026-11-09):** `variant="details"` verified: no step header, the 832 column centred (x 304 at 1440), 32 under the 64 px header area, the footer in the 1120 column. The details wrap their parts in their own `gap-16` column (U80: 16 between band and cards; the layout's column gap is 32). |
| `WizardProgress` (+ step) | U02 #1–#4 | c | the step line, `role="progressbar"` | 1–4, clickable (edit), not clickable | T006: kept c, the kit’s P25 progress is a bar, not the step line; built by T032. **T032 (2026-11-08): kept c**, no `index.css` rule. Two forms of V5 "Shell/Step line" (`6630:40056`, KERN EXTENSION). **Creating** (U19 `6699:45327`, U63 `7112:48729`): one 24 px row, gap 16: "Step n of 4" (`body/small/regular` 14/24 `layout-text-muted`, `aria-hidden`), the four segments (4 high, 4 apart, radius 2 as `rounded-[2px]` because the overlay's small radius is 4; `action-default` up to and including the current step, `decorative-border-default` after) and "Next: <step>" / "Last step" in the same style; not clickable (no hover, no pointer). The segments are the `role="progressbar"` with `aria-label` "Step n of 4", `aria-valuemin` 1, `aria-valuemax` 4, `aria-valuenow` n and `aria-valuetext` the step's name (FR-025b). **Editing a published connection** (U98 `6731:39827`, F25): the four segments with the steps' names under them (`label/small` 14/24 600, 4 px gap; 32 high), equal widths (277 at 1120), each never narrower than its name's longest word (`min-w-min`, so "Connection" and "Documents" stay whole at 320 px); the current step `action-default` line and name with `aria-current="step"`; every other step a `<button>` ("Shell/Step link" `7139:50059`: `layout-text-muted` line, `layout-text-default` name; hover and pressed both blue, 150 ms `.motion`); keyboard focus KERN's 4 px ring, offset 2; in `<nav aria-label="Steps">` with an `<ol>` (a progress bar can't hold buttons). No numbers (`--text-step` is unused from here, §7/T090), no "Step n of 4" / "Next" in the edit form (as drawn). Past the last step (`current` ≥ 4, the details) it renders nothing (FR-025e). Props: `steps`, `current`, `onSelect` (now: the edit flow only); `reached` removed. The Draft badge is not part of the step line in any frame read (U19 `6699:45321`: no badge on step 1 before the first save; the badge belongs to the header's breadcrumb pill, P08) |
| The pages' own components (research R11): `StatusBand`, `WelcomePage`, the documents list, detail and search card, the persona chips, data card and result rows, the publish dialog, the variant dialog and popover | the frames of their screens | c | — | the screen's states | T006: kept c; built by T042 (`WelcomePage`), T051 (documents list, detail, search card), T064 and T067 (variant dialog and popover), T071 and T072 (chips, data card, result rows), T076 (publish dialog), T078 (`StatusBand`) **T071 (2026-11-09): kept c** for the persona chips (`PersonaChip`, `ApplicantsRow`, "Generate all"), the data card (`PersonaPanel`, `PersonaHead`, `PersonaData`, `DocumentValues`, `ValueRow`: one flat list from `dataRowsOf()`, hidden per-document headings, "Date of birth") and the result rows (`ResultSection`, `ResultTable`, `ResultRow`, `MemberRows`: statement, status text, group statements in the frame's words); radius 8 on the area and the cards. **T072 (2026-11-09): new** `EditDataDialog` (on `ConfirmDialog wide`, the scrim on) in place of `PersonaEditor` (deleted); kept c: `DocumentFields` (two columns), `EditorField` ("Date of birth", "Class B since"), `FieldFrame`, `ValueField`, `ValuesField`, `ChoiceField`, `DateOfBirthField`, `RegenerateDialog`. **T073 (2026-11-09): kept c** for the test step's variant tabs (`VariantTab` on `BranchName`'s `tab` form, `VariantTabs` on `TAB_ROW_CLASSES`); `ResultSection` without the notice line (CLAR #50). **T067 (2026-11-09): kept c** for the "Copy to variant" popover (`CopyPopover`: the design's 300 px popover, T020's side and direction, `z-40`, the focus kept inside; FR-040, W17) and its check items (`CopyTargetItem` now the shared `Checkbox`, T016's override: the last own-drawn 20 px box is gone); the variant tab menu is `ActionMenu` with `menuEntriesOf({ kind: 'variant' })`. **T076 (2026-11-09): kept c** for the publish dialog (`PublishDialog` on `ConfirmDialog wide`, `PublishSummaryRow` and `PublishSummaryValue` as "Dialog content/Publish · summary" with radius 8, `PublishFindingLine` as `Rules/Finding item`: 14/24 regular, the icon centred); the kit's P27 `kern-summary` isn't used: the frames draw the extension's two-column table. **T078 (2026-11-09): new** `StatusBand` (c; props `tone`, `title`, `text`, `headingRef`, `actions`, `meta`; looks in `STATUS_BAND_TONES`) and `DetailAccordion` (c; P06 drawn as U91's card); `ConnectionStatus` deleted. **T077 (2026-11-09): kept c** for the publish dialog's status ("Dialog/Status", U78: a second native `<dialog>` inside `PublishDialog.tsx`, 400 × 232, padding 40 32, gap 16, radius 12, no outline, `FeedbackLoader` for "Publishing…", "Icon/Success tick 56" as a 3 px success ring with KERN's check for "Published"); the failure is KERN's danger alert (`KernAlert`) inside `ConfirmDialog`'s body. **T079 (2026-11-09):** `RulesSummary` is now the Summary accordion (`DetailAccordion`, props `branches`, `documents`, `open?`, `onToggle?`, `draft?`); `RulesSummaryContent` holds the variant tabs, the findings lines and the one `useRuleChecks()` instance (new optional `checkDocuments`); `SummaryBranch` is the tab panel (props `panelId`, `tabId`); `DocumentsSummary` is the Summary's documents part (no card); `SummaryField` renders `RuleRow`'s `ValueChip`. **T080 (2026-11-09):** `StatusBand` tone `deactivated` built from U89 7355:61530 (`layout-background-hued`, the white link-off 20 in a `layout-text-muted` circle, the grey picture); new prop `mainAction` (before the ⋯ chip, on the band; `actions` is the ⋯ only, in the chip); `STATUS_BAND_TONES` gained `iconSize`. `LinkCard` / `LinkCardUrl` take `deactivated` (to `CopyableUrl`). |

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
| **Unrequested-data banner** | U50 `6863:47363` (T060) | the findings banner's danger kind: `feedback-danger-background`, 1 px `feedback-danger` border, radius 8, padding 8 8 8 16, one 20 px error diamond + body/small line per rule, the action ("Add it in Documents") on the first line's right, wrapping under at narrow widths; flush at the top of the card's list (`UNREQUESTED_BANNER_CLASSES`, RulesStep `constants.ts`); `role="alert"` flush at the top of the card's list, or, with the findings banner right after it, at that banner's 8 px inset, the two 8 px apart (T070; `UNREQUESTED_BANNER_CLASSES`, `data-findings-banner` on `FindingsBanner`'s wrap). |
| **Field error** | U19 `6699:45379`, U49, build note 7 | directly under the field, the field's border and fill in the error state, linked with `aria-describedby`; the focus moves to the first field with a problem Documents step variant: **Field error** (the documents step's variant, T053): a document without data shows its message in its card header in place of the count ("Choose at least one data item, or remove this document.", body/small `feedback-danger`), linked to "All data items" with `aria-describedby`, which takes the focus; the list marks the item (danger tile, glyph, name, KERN's `kern-icon--danger`) and heads the list with "1 document needs data" in red, which describes the marked items. |
| **Toast** | U10 `7128:74220`, U51 `6197:11098`, U61 `6545:39421` | dark neutral toast, bottom centre, one at a time, announced through the live region; optional action ("Try again", "Undo", "Show"); with an error ID for a 5xx |
| **Dialog** | P12, P33 dialog-actions; U14 `6699:44480`, U17 `7173:52681`, U25 `7299:52174`, U90 `6417:31453` | the kit's widths, 1–3 buttons with long-label wrapping, ×; Escape, × and the scrim close a dialog that doesn't delete or publish (FR-052a); the focus stays inside and returns to the opener; a danger action is the danger outline button where the design draws one ("Discard connection") and the filled danger button where it draws that ("Delete connection") T077: T077: a dialog that can't be closed (the publish status) prevents `cancel` and opens again on a `close` the browser forces (Chrome closes a modal dialog on a second Escape without user activation); two dialogs that replace each other close the old one in a layout effect and open the new one in a passive effect, so the focus returns to the opener. T086: a page card that asks for a decision (the consent card) lays its two buttons out as the kit's dialog actions (`DECISION_ACTIONS_CLASSES` in `pages/Authorize/ constants.ts`, the same container query as `ConfirmDialog`'s two-button row). |
| **Menu** | U54 `6522:33105` (build note 10), U13 `6699:44358`, build note 3 | anchored to its trigger's wrapper with class sets (no inline styles, R10), 220 px, 40 px rows with icon, inner scroll with a max-height step (160–480 px) fitting the space to the header or footer minus 8 px, downward when it fits above the footer, otherwise upward; no clipping ancestor; Escape and a click outside close it; arrow keys; destructive entries last after a divider, "Copy link" before them |
| **Menu** (addition, T061) | U30 6350:41316, U31 6350:41548, 6635:36529 | the rule editor's single-select menus (`ChoiceMenu`) follow it: placed from the picker's wrapper with `placementFrom()` as the menu opens (`useLayoutEffect` in `ChoicePicker`: a choice opens the next picker's menu, whose picker may only appear or move in that render), the height it decides with is its estimated height capped at the drawn 294 (U31 parts menu), the frame takes the max-height step and its list scrolls; entries take T021's hover/pressed layers and keyboard fill T096: a menu opened by its caller (the rule editor’s values picker after a check is chosen) is placed by `placementFrom()` too, measured when it opens (FR-009d). |
| **The rules step's menus** (FR-036) | U54 `6522:33105` (build note 10), U55, U56, U57, U58, U59; CLAR #22, #48, #53, #54, #60, #61; 007-S4 | `menuEntriesOf(menuItemOf(branches, branchKey, id), { branchKind, linkable })` in `RulesStep/utils.ts` (pure, tested; T055). The menu shows only what it returns, in `MENU_ENTRY_ORDER`: Edit · Rename · Add message · Remove message · Duplicate · Copy to variant · Group with other rules · Ungroup · Reset to Standard · Restore · Copy link · then, after the divider, Remove from <variant> or Delete …. "Copy link" appears whenever the connection is stored (`linkable`), as the last entry before the destructive one, and also after "Restore". An item linked to Standard in a variant has no Rename, Duplicate or Ungroup, and offers "Remove from <variant>". "Copy to variant" appears only while some other variant could still receive the rule. "Group with other rules" carries its select-mode scope (`'top'` or the group's id). `selectableIn()` decides which items count as neighbours and gets a box. An item faded with a removed or dissolved group has no menu at all **T058 (2026-11-09):** built in `RuleMenu` / `GroupMenu`, each entry mapped to its label and `MENU_ENTRY_LOOKS` (`RulesStep/constants.ts`: icon, `danger`, `separated`); "Restore rule / group / sub-group", "Delete rule / group / sub-group" (a group shown as a sub-group says "sub-group"), "Remove from <variant>"; "Copy link" after "Restore" has no icon; "Add message" on a group with a message only moves the focus to its message field; no "Group with other rules" on groups (#64) **T067 (2026-11-09):** the variant tab's ⋯ (`BranchMenu`, every tab, F28) shows `menuEntriesOf({ kind: 'variant' }, …)`: "Rename" (opens "Edit variant"), "Copy link" (stored), and after the divider "Delete variant" on every variant but Standard. |
| **Tooltip** | U37 `6151:33820`, U46 `6758:43524`, U81 `6809:46590`, U07 #16 | the design's tooltip (no arrow: the V5 "Rules/Tooltip" draws none, §1.3), on hover, focus and touch (FR-052g); blue ⓘ on blue backgrounds, muted grey elsewhere; no `title` attribute; a cut text's tooltip (T044, the overview's description, U13 `7366:55276`): on hover of a cut text only, on the keyboard focus of the row's name, on a tap, `aria-hidden` since the text is whole in the page |
| **Disabled button with explanation** | U29 #18, U30 #46, U89 #13 (W21) | `aria-disabled="true"`, focusable, ignoring activation; the explanation in the tooltip ("Save the rule first", "Finish grouping first", "Add a document first", the copy buttons' reason). **Exception (#65, Implement Q4, T063):** the rule editor's "Save rule" keeps the baseline's press (002-S3.10): while incomplete a press never saves but flags the missing parts, shows the problem under the check row and moves the focus there (`onClickCapture` in `EditorActions.tsx`); its tooltip is the rule's current problem in the server's words. |
| **Skeleton** | U06 #95, U74 `7062:50960`, U10 #17 | the kit's skeleton rows in the list's shape; the 56 px spinner with "Loading your connections…" for a page; the persona chip keeps its name with a ring while regenerating (T074: a static 16 px ring, 2 px `#e4e8ef`, no arc, as U74 `7062:51495` draws it; the test step's skeleton cards fill the panel, their bars the same greys and radius 4); the overview's list (T044): the toolbar's 48 px kept empty, the list card with its headers and three skeleton rows 80 high in the rows' columns (name 160 strong + description 220 light, status 72 strong, date 96 light, bars 10 high, radius 4), under a polite status with "Loading your connections…" (`FormConnectionRowSkeleton`) T080: the details (T080): the band (`layout-background-hued`, 124, a 32 circle, 240 × 14 and 360 × 10 bars on the title's and sub-line's lines) and two closed accordion cards (102, 160 × 14 and 200 × 10 bars), in the 832 column under the status 'Loading the connection…'. |
| **Empty state** | U11 `6699:44481` (wallet-star 200 × 193), U20 `7290:60367` (128 × 123), U29 `6504:43841` | the page title (heading/x-large) as the one heading; the light blue card (`layout-background-hued`, radius 12, padding 48, gap 48) with one sentence (body/default muted, at most 578 wide), 32 px above the one primary action (48 high, with the forward arrow when it leads away) and the picture at the right (decorative, `alt=""`); below 768 px padding 24 and no picture. A card heading (title/large 600 24/32, 8 above the sentence) where the page has its own h1, as the welcome page (T042). First built: `NotFound` (T037); built as the welcome page by T042: the card heading (`h2`, `text-kern-adaptive-large font-semibold`) and the four-step illustration (`ol`, `IconTile tone="plain" size={48}`, ink glyphs, lines `bg-kern-action-default opacity-32` sharing the free space; a row from a 640 px text column, stacked below, undrawn) T087: a section of a page with its own h1 (the account page's 'Connected agents', 'Personal access tokens'): the light blue card with the one sentence only, padding 24, no picture, no action of its own, the sentence the card's width. |
| **Error state of a page** | W2, U02 `6637:36656` (build note 7), P07 | under the page's h1 (`PageTitle`, one per route), KERN's danger alert (`KernAlert variant="danger"`, `className="w-full"`) whose title is the one sentence of what failed; its body keeps the 5xx error ID (`ErrorNoticeText notice={…}` with the `notice` from `errorNoticeOf(error, '<fallback>')`), then one row (`flex flex-wrap items-center gap-x-24 gap-y-8`, `mt-10` after an error ID) with "Try again" (`kern-btn--secondary kern-btn--small`) where a retry makes sense and the way back, the link "Go to connections" (`kern-link`, `Link to={ROUTES.overview}`). A documented composition, not a new component; the reference implementation is `FormConnectionLoadState`'s `LoadFailed` (T017; "Go to connections" settled by T037); on the overview (T043) the alert sits right under the title block and before the local-drafts offer, with the footer bar kept and no toolbar T080: the error ID now shows on the connection pages (T080): `useFormConnection` keeps the notice. T086: on `/authorize` the h1 and the alert sit inside the consent card (the card heading is the page's h1); the failed load has no "Try again" (the baseline says to reload); the invalid-request alert carries the same "Go to connections" row. T087: `/account` — the h1 'Your account' stays; 'Try again' remounts the page (`AccountView` keyed by the attempt), the h1 takes the focus after it. |
| **Status pill** | U07 #1–#4 | dot + coloured label, tint fill, no border, radius 8; active green, draft blue (AA per §1.5), deactivated grey; used in rows, the header pill and the band |
| **Status band** | U07 #6–#8, U80, U89, U93 | 32 px icon column, h1 + sub-line 4 px apart, padding 32, picture bottom right (colour / grey), the ⋯ and "Activate again" at the right end; the draft band's gradient from `feedback-info-background` to `layout-background-hued` T078: "the ⋯ (and 'Activate again') in the pill's white chip without the date, top right of the band from 768 px; the picture in a clipped layer of its own so nothing clips the menu (V6); below 768 px no picture, padding 16." T080: deactivated (T080): `layout-background-hued`, the white link-off glyph 20 in a 32 `layout-text-muted` circle, the grey picture; 'Activate again' (`mainAction`) 16 before the ⋯ chip at the top right; below 768 px both in a row under the text, 20 apart from it. T081: draft (T081): the gradient `linear-gradient(113.27deg, feedback-info-background 21.638 %, layout-background-hued 75.912 %)` (an arbitrary class, the frame's stops, no oklab interpolation), the white edit glyph 20 in a 32 `feedback-info` circle, the grey picture; the date pill "Edited dd.mm.yyyy, hh:mm" as `meta` (white, radius 8, padding 8 16, KERN's calendar 20 ink, label/small muted), 20 under the text; no ⋯; "Delete draft" (tertiary) as `mainAction` at the right end. |
| **Info strip** | U07 #18, U19 `6699:45346` | blue ⓘ, info background, one sentence T086: the consent page's step-up line, "{client} is asking for more access than it has.", above the radios (`ConsentForm`); `items-start` with the 20 px ⓘ 2 px down so a wrapped line keeps the icon on the first line (320 px). |
| **Card** | P10 (`surface`, `interactive`), U11 (the list card), U21 (the search card) | KERN's card; the kit's `surface` variant as the light blue card where drawn; the overview's list card (T043): white, 1 px `decorative-border`, radius 12, no shadow (the V5 card `6699:44252` draws none, §1.3), its column headers on `layout-background-hued` 8 24, label/small muted, `aria-hidden` T088: the approval page's Links card (`ApprovalLinkCards`): the details' accordion card without the toggle: header `px-24 pt-24` with the h2 (16/24 600) and its lead (body/default) 4 apart, then the `LinkCard` list `divide-y` in `decorative-border`; without URLs the header keeps its 24 bottom padding. |
| **Accordion** | P06, U80, U82 | the heading with "View links" / "Hide links" and the count; one open at a time on the details; heights animate (§4) T078: "built as `DetailAccordion` (T078): header padding 24, title 16/24 600 and the counts 14/24 muted 4 apart, tertiary-small toggle without underline, chevron down closed / up open; open border 1 px `action-default`, closed `decorative-border-default`; body `grid-template-rows` 0fr → 1fr over `--duration-height` (200 ms) with `.motion`, clipped only while closed or moving, `inert` while closed." |
| **Tabs** | P29, U38, U82 | the variant tabs with the ⓘ and the problem icon; pinned under the step head on the rules step a tab with a spec 002 problem shows the red icon, its tooltip the description, the problem, then the findings (T070); the tab's accessible name stays "<variant> has findings". T079: the details' Summary (T079): the test step's row (`TAB_ROW_CLASSES`, the empty `tablist` owning the tabs, `tabAfterKey()`), every variant a tab, Standard alone too. |
| **Dates** | cosmetic 3, build note 8 | `dd.mm.yyyy` and `dd.mm.yyyy, hh:mm` wherever the frontend formats a date; the test day per C6; first built on the overview's rows (T044, `formatRowDate`, de-DE 2-digit); `formatEditedDate` ("5 Oct 2026") still serves Account, Approval and the details until their tasks switch T081: the draft details' date pill uses `formatRowDate` + the 24-hour time ("Edited 03.10.2026, 14:32", `editedLineOf()`); `formatEditedDate` no longer serves the details. T087: the account page's rows (`formatDateTime()` in `pages/Account/utils.ts`: `formatRowDate` + the 24-hour time, 'Connected 05.10.2026, 14:32'); `formatEditedDate` no longer serves the account page. |
| **Search in a list** | U11 `6699:44511`, `6699:44570`, `6692:42636`; FR-051 (27) (T043) | a pure filter in the page (`filterConnections`: name and description, `matchesSearch`'s `toLocaleLowerCase` folding and trim, the order kept; nothing sent); the count above the list as a polite status ("3 connections" → "1 of 3 connections"); KERN's input with the search icon (`kern-form-input__input pl-44! pr-48!`) and a visible `kern-label` 16 px before it (stacked over the field below 640 px; the frames draw no label); the × (`kern-btn--tertiary kern-btn--small`, "Clear search") once something is typed, emptying the field and keeping the focus in it; no results: the message with the typed text (label/default), the hint (body/small muted) and "Clear search" (a `kern-link` button) inside the list card under its headers, moving the focus to the field; T051's documents search card follows it; second build (T051): the documents step's search card uses `MenuSearchField variant="panel"` with no visible label and no × (the frames draw neither; Escape or closing the card empties it), a group with no rows is hidden, ↓ moves into the rows and Enter adds the first available match |
| **List inside a card** | U12 `6699:44915` (T044) | from 768 × 480 the overview's column is capped at the window (`max-h-[calc(100dvh-144px)]`), the card shrinks to fit and its rows scroll inside it under the column headers; below that the page scrolls as a whole; the rows' table layout from a 58rem card (`@container`), wrapped below, the headers hidden then |
| **Homepage memory** | FR-027, research R6, W11 (T039) | `homepageOf(list, remembered)` in `pages/FormConnectionList/utils.ts` (pure, tested): loaded and empty → welcome; loaded with anything → overview (a draft counts); loading → `remembered ? 'overview' : 'welcome'`; `hooks/useRememberedHomepage.ts` keeps one `localStorage` flag per account, `connection-portal:local-draft:v1:<username>:homepage:has-connections` (`storageKeyOf`, `keys.ts` unchanged; the `:` in the tail keeps the local drafts' store from listing it), `'true'` / `'false'`, written whenever the list's "has anything" is known and changes (load, last deletion), read once per account; blocked storage → `null`, nothing logged; the page shows `PageLoader` only while loading with `remembered === null`; a draft saved on the way to `/` (`draftSaved` in the router state) counts as `remembered === true`; the loading page is the first load's (a retry stays on the overview); a failed load shows the overview's error state whatever the memory says (T042) |
| **Page change** | FR-052c, U06 #94 (`7137:50569`) | a change of the route's path scrolls the window to the top at once (`App.tsx`, `behavior: 'instant'`: kern.css makes the root scroll smoothly) and the layout's main region fades in over 150 ms (§4); the header pills stay. A change of the query alone or of the editor's step is no page change |
| **Sticky parts of the wizard** | U01 #14–#19, U03 #42–#43, research R4 | the page scrolls; the header pills stay at the top (64 / 120 below md), the step header under them from 768 × 640 (`wizard-pinned:`), the footer at the bottom from 480 px tall; in smaller windows the step header and footer scroll with the page so that the step keeps room (WCAG 1.4.10, spec 005 FR-028). What they cover is `--wizard-sticky-top` / `--wizard-sticky-bottom`: what scrolls into view stops 16 px clear of them, a menu stays between them, the toast sits 24 above the footer, a pinned bar sticks at `top-(--wizard-sticky-top)`, a part that fills the window takes `100dvh` less both and the content's 40 px bottom padding |
| **Rules step pins** | U01 #17–#19, T033, T056 | Where the wizard pins its step header (`wizard-pinned:`, ≥ 768 × 640), the variant tab row pins right under it (`top-(--wizard-sticky-top)`, white, z-10) and the selection bar under the tabs (`--rules-pinned-top`, handed to the card as `--wizard-sticky-top`). Everything under the tabs keeps `scroll-mt-(--rules-tabs-height)` (+ the bar in select mode) so a focused element stays clear (WCAG 2.4.11). Below that size nothing of the step pins except the selection bar under the header pills. **T059 (2026-11-09):** the selection bar is the 27 Oct "Rules/Selection bar": info tint, 56 px (8 + 40 + 8); in select mode the scroll margin under the tabs is the bar plus 8 (64), 144 below 640 px; pinned, the bar has square corners and no line; at rest 11 px top corners when first in the card, square under a variant's link strip. |
| **Below 320 CSS px** (T096) | no frame; WCAG 1.4.10, FR-010, quickstart V11 | the `narrow:` variant (`@media (width < 20rem)`, under WCAG’s reflow width, such as a 320 px window at 200 %) and the overlay’s one unlayered narrow block in `index.css`: long words break, horizontal paddings and gaps of 16 px and more halve, `whitespace-nowrap` wraps and `shrink-0` stays within its row, KERN’s alert and dialog heads wrap with smaller sides; rows put their ⋯ and marks under the text; the toast region sticks at the page’s bottom instead of floating; the header sticks only from 320 CSS px wide and 480 px tall. Nothing changes from 320 CSS px up |

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
  (T074: `TestStep/LoadingRing` is static now, as U74 draws it. `FeedbackLoader` is on
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
| 6344:53557 | select mode, unchecked | box | size, border, fill, radius | 20, 1 `#6b7488`, white, 4 | `RulesStep/SelectBox.tsx` now uses `kern-form-check__checkbox` (this override): 20 × 20, 1px rgb(107, 116, 136), white, 4px; hover 2px rgb(29, 86, 240); checked rgb(29, 86, 240) with the tick; checked hover the 3px white ring; keyboard focus 3px rgb(11, 18, 32), offset 0 | match (T059) |
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
| U74 `7062:51206` | loading | persona chip skeleton | pill | white, 1 `#e1e6f0`, radius 999, 130/126/132 × 40 | the same (`SkeletonPill`, T074's table) | match (T074) |
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
| P33 2:2157 | focus (keyboard, Tab) | input | ring | 4 `action-focus-default` `#0b1220` around the field (outside) | outline 4px solid rgb(11, 18, 32), offset 0; line removed (KERN) | match; history: 2 px since bug v5-ui-fixes (2026-11-18) |
| P33 2:2157 | focus by pointer | input | ring | keyboard focus only (FR-009) | a text field matches `:focus-visible` on a click too (it takes typing), so the ring shows as for the keyboard; the browser's rule, kept | match |
| P33 2:2163 | disabled | input | opacity, cursor | 40 % | 0.4, not-allowed; line 2px rgb(34, 41, 58), fill rgb(242, 245, 251) | match |
| P33 2:2175 | readonly | input | fill, line | none, bottom 1 `layout-border` `#6b7488` | transparent, 1px solid rgb(107, 116, 136), cursor not-allowed | match |
| P33 2:2181 | readonly, focus | input | ring | 4 `#0b1220` | outline 4px solid rgb(11, 18, 32), line 0 | match; history: 2 px since bug v5-ui-fixes (2026-11-18) |
| P33 2:2315 | error | input | fill, line | `feedback-danger-background` `#fef1f0`, bottom 2 `#c4271c` | rgb(254, 241, 240), 2px solid rgb(196, 39, 28) | match |
| P33 2:2321 | error, hover | input | line | bottom 4 `#c4271c` | 4px solid rgb(196, 39, 28) | match |
| P33 2:2327 | error, focus | input | ring | 4 `#c4271c` | outline 4px solid rgb(196, 39, 28) | match; history: 2 px, still `#c4271c`, since bug v5-ui-fixes (2026-11-18) |
| U19 6699:45398 | error | input | ARIA | linked to its message | `aria-invalid="true"`, `aria-describedby="connection-name-error"`; the focus on the field after "Continue" (the step's behaviour) | match |
| U19 6699:45398 | error | danger bar | border, padding, extent | left 4 `#c4271c`, 16 to the field, beside field and message only (88 high) | 4px solid rgb(196, 39, 28), padding-left 16, 726 × 88 around input + message; label outside it | match |
| U19 6699:45398 | error | message | place | 8 under the field | y 488 = field bottom 480 + 8 | match (rows in the FormErrorMessage table) |
| — | invalid without a message | input | state | the sign-in's both fields marked invalid (F16) | `invalid` prop: the error fill and line, `aria-invalid`, no bar, no message | deferred to T040 (the sign-in page passes it) |
| U19 6699:45403 | multiline | textarea | size, padding | 120 high, 16 / 8 (text from the top) | 120 (`h-120!`), padding 8px 16px | match |
| U19 6699:45403 | multiline | textarea | fill, line, radius, font | `#f2f5fb`, bottom 2 `#22293a`, 4, 16/24 | the same | match |
| U19 6699:45403 | multiline | placeholder | colour | `#4a5468` | rgb(74, 84, 104) | match |
| P33 2:2534 | multiline | resize handle | shown | bottom right | the browser's handle, `resize: vertical` | match |
| P33 2:2538 | multiline, hover | textarea | line | bottom 4 | 4px solid rgb(34, 41, 58), padding stays 8 16, 120 high | match |
| P33 2:2542 | multiline, focus | textarea | ring | 4 `#0b1220` | outline 4px solid rgb(11, 18, 32), offset 0 | match; history: 2 px since bug v5-ui-fixes (2026-11-18) |
| — | multiline | textarea | spell check, limit | spell check on, ≤ 500 (FR-032) | `spellcheck` true by default; `maxLength` passes through; no counter (the design draws none, 006-S1.3 has none) | match (FR-032: a 500-character limit, no counter drawn; coordinator 2026-11-08) |
| U19 6699:45403 | multiline | step 1 description as a textarea | element | "Form/Textarea" | `<textarea>` 726 × 120 (`multiline`, T049); the variant dialog stays T064's | match (step 1) |
| U10 #7 | password, trailing slot | toggle | place | inside the field, right end | slot `absolute inset-y-0 right-4`, a 40 px small button centred (4 from top and right), input `padding-right 56` (replica; 48 since T040: the toggle is 32 px) | match (the toggle itself: T040) |
| — | hint | hint | place, link | KERN `kern-hint` under the label | `kern-hint` with `id`, in `aria-describedby`; no page passes `hint` yet | deferred to T064 (the variant dialog's helper) |
| — | with text | input | colour | `#0b1220` 16/24 | rgb(11, 18, 32) 16px/24px ("Neue Verbindung") | match |

**Bug v5-ui-fixes (2026-11-18), a 2 px focus ring on text fields:** text fields’ focus ring is
2 px instead of KERN 2.8.2’s 4 px, decided with the reporter. An override in
`frontend/src/index.css` after the KERN import, `.kern-form-input__input:focus,
.kern-form-input__select:focus { outline-width: var(--kern-metric-border-width-default); }`
(2 px), covers text inputs, text areas, the error state (whose rule sets only the colour) and
the selects; KERN’s colour, `outline-offset: 0` and padding swap stay. The app’s own text
fields went from `outline-4` to `outline-2`: the rule rename input (`ItemName`),
`RuleEditor/ValueInput`, `MenuSearchField`’s `menu` variant, `ValuesPicker`’s field-shaped
trigger, `RuleEditor/MessageField` and `GroupFrame/GroupMessage`. Checkboxes keep their 3 px
ring (their checked-hover state draws a 3 px tint ring, so a 2 px focus ring would be thinner
than the hover ring); buttons, links, tabs and radios keep 4 px. The 4 px focus rows of this
table and of `MenuSearchField` below are history, and so are the 4 px rings this file records
for the overview’s search (U15), the documents’ search card (U20) and the rule rename field
(U49).

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
| P33 1067:17105 | focus (keyboard) | field | ring | 4 `action-focus-default` `#0b1220` outside the field | outline 4px solid rgb(11, 18, 32), offset 0 (was inset −4), inside the menu's 8 px padding | match; history: 2 px (`outline-2`) since bug v5-ui-fixes (2026-11-18) |
| — | with text | field | text, filtering | 16/24 `#0b1220` | "Ci" rgb(11, 18, 32); the list shows "City or town" only | match (baseline) |
| — | default | field | transition | colour 150 ms (§4) | `motion transition-colors duration-(--duration-colour)` | match |
| U21 7290:61990 ("Data/Search field" 6241:12480) | panel | field | size, fill, line, radius | 48, `#f2f5fb`, bottom 2 `#22293a`, 4 | 48, rgb(242, 245, 251), 2px solid rgb(34, 41, 58), 4px (KERN's input) | match |
| U21 7290:61990 | panel | icon | glyph, size, colour, place | icon-search-small 20, `#1d56f0`, 16 from the left, centred | `kern-icon--search kern-icon--small` 20 × 20, rgb(29, 86, 240), at 16 / 14 | match |
| U21 7290:61990 | panel | text | start, font, placeholder | 16 + 20 + 8 = 44; 16/24; `#4a5468` | padding-left 44, 16px/24px, rgb(74, 84, 104) | match |
| 6241:12480 (description) | panel, keyboard focus | field | ring | "calm: bottom line turns 2px ink, no outline box" | KERN's 4 px `#0b1220` ring (P33 base-search focus) | FR-009 (focus ring visible on keyboard focus, over the description's "calm" focus; coordinator 2026-11-08); 2 px since bug v5-ui-fixes (2026-11-18) |
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
| U44 6171:7489 | problem (finding) | note | text | "Can’t be met together with Rule 05." | the checks' text ("Contradicts Rule 07.") from `findingMessages.ts` | W13 (T025's note; the texts are T010's, C4) → **user 2026-11-09: the design's wording, `noteOf()` changed ("Can’t be met together with …")** |
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
| — | no findings, variant without description | ⓘ, tooltip | shown, text (FR-041b) | grey ⓘ, "No findings." | grey ⓘ "About School transport", bubble "No findings." 40 high | match; history: no icon since bug v5-ui-fixes (2026-11-18), Clarification 2026-11-18 #2 |
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
| FR-035c, FR-041b | no findings | ⓘ | when | Standard only with a description; a variant always (description or "No findings.") on the rules step | `noFindingsInfo` from the call site | match; history: since bug v5-ui-fixes (2026-11-18) only with a description, on a variant as on Standard; `noFindingsInfo` removed (Clarification 2026-11-18 #2) |
| U01 #18 | scrolled | tab row | pinned | with the step header on the rules step | — | deferred to T056 |
| U38 6134:9153 | — | ⋯ | on which tabs | selected only | every tab of the rules step (F28, CLAR #21); the test step's tabs none (T073) | F28 |
| U43 6168:7011 | — | after the tabs | "+ Add variant" and its (i) | the (i) 4 after the label (`mr-[-12px]`), action blue | `ADD_VARIANT_CLASSES` (rules step only, F27); the button's box reaches 8 past the (i) (pr 24, pulled 28: bug add-variant-hover-tooltip, 2026-11-18) | match |

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
| U44 6171:7490 | warning | text | wording | "Can’t be met together with Rule 05." | "Contradicts Rule 06." (`findingMessages.ts`) | W13 (the texts are T010's, C4) → **user 2026-11-09: the design's wording, `noteOf()` changed ("Can’t be met together with …")** |
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
| U98 6731:39850 | edit | "Discard changes" | anatomy, place | tertiary, "undo" glyph, after Back | `onDiscard` slot: tertiary, `icons/undo.svg`, after Back; the editor doesn't pass it yet | closed (T083, T084, 2026-11-09: the edit flow passes `onDiscard`; "Discard your changes?" in `EditorFooter`) |
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
| F43 | test step, 1455 × 900 | the step | only the panel scrolls | — | the step 216–788 (572), the page doesn't scroll (900), the panel scrolls (425 / 415) | match (T073 builds the design's panel); history: since bug v5-ui-fixes (2026-11-18) each card’s rows scroll here, not the panel (T073’s note) |
| F43 | test step, 800 × 1024 | the step | same | — | sticky top 240 (the description in two lines), the panel scrolls (661 / 515) | match; unchanged by bug v5-ui-fixes (2026-11-18): below `lg` the stacked cards scroll together in the panel |
| — | 320 × 640 | footer | wraps, labels | the footer wraps, "Save and exit" keeps its label (005-ACC.4) | step 1: 2 rows (120); documents: Back / "Save and exit" / "Add rules" 3 rows (168); no horizontal scroll (body 305) | match (W2) |
| — | 320 × 640 | step header | sticky | not drawn | scrolls with the page (`wizard-pinned:` needs 768 × 640); sticky top 120 | match (§3 "Sticky parts of the wizard") |
| — | 1455 × 420 | step header, footer | sticky | not drawn | both scroll with the page, only the pills stay; the documents list sticks at 64 with `max-height` 316 | match (§3) |
| — | create | header pill | Draft badge (005-S0) | in the connection pill | "Draft" pill 8 after the name | match |
| U98 6731:39821 | edit | header pill | "Active" (F5) | "Active" | the editor passes no badge for a published connection; no published connection in the dev database | closed (T084, 2026-11-09: `ConnectionStatusBadge`, "Active" / "Deactivated") |
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
| U14, U90 (the details' dialogs), U88 (`6417:31206`), U89 (`7173:52874`) | S17 | done (T082, 2026-11-09) |
| U16 | S5 | done (T045, 2026-11-08; the list card's minimum height fixed by the coordinator) |
| U17, U19 | L3, S6, S7 | done (S6: T048; S7: T049, 2026-11-08; the load error's error ID: T080/T083) |
| U18 | S3, S7 | S3 done (T042: F15, nothing to build); S7 done (T049: F15, nothing to build) |
| U20, U21 | S8 | done (T051, 2026-11-08) |
| U22, U23, U24, U26; U01 #16 | S8 | done (T052, 2026-11-08) |
| U25, U27, U28 (F23), U98 (`7296:52315`) | S8 | done (T053, 2026-11-08; U98's edit footer: T084) |
| U29, U43 (`6168:7004`, `6168:7263` top level, `6168:7666` frame) | S9 | done (T056, 2026-11-08); the variant ⓘ's action tone: T064; groups in `6168:7263`: T057; 4.3's link strip and marks: T066 |
| U34 (`6094:6127`, `6094:6597`, `6113:28651`, `6113:29018`, `6113:29056`), U35 (`6324:39410`) | S9 | done (T057, 2026-11-08); the menus in 2.3 and the rule-deleted frames of U35: T058 |
| U35 (`6113:29132`, `6324:39032`, `6965:49996`, `6965:50045`), U54, U55, U56 | S9 | done (T058, 2026-11-09) |
| U36, U64 | S9 | done (T059, 2026-11-09); group checkboxes Figma must change (CLAR #64) |
| U50, U51 | S9 | done (T060, 2026-11-09); T075 (2026-11-09): "Test rules" disabled with the problem while the rules are in error (#66), "Publish without rules" secondary as U51 8.8 draws it, the flagged rule's note "<field> is no longer requested." (U50 #13, #14) |
| U30, U31 | S10 | done (T061, 2026-11-08); the editor wrap's padding and the save toast: T056 |
| U32, U33, U48 | S10 | done (T062, 2026-11-08); the empty field's error, the incomplete message: T063 (notes) |
| U49, U53, U09 | S10 | done (T063, 2026-11-08); the locked picker's look: coordinator (UNCERTAIN 2); the rename field's look and quotes: T058 / C5 (notes) |
| U37, U38, U52 | S11 | done (T064, 2026-11-09); the ⋯ on every tab (F28, CLAR #21) |
| U39, U47 | S11 | done (T065, 2026-11-09); the changed member's 40 % tint in a removed group (U47 6185:41178) left: `RuleRow` (note for phase 11) |
| U57, U58 (`6522:32682`–`6522:33080`), U40 | S11 | done (T066, 2026-11-09); the menu width for "Remove from <variant>" closed by the coordinator (`ActionMenu` 220–280, auto width) |
| U58 `6530:40675` (10.11, the details page) | S15/S17 | not S11: the frame draws the details page's status band and connection menu ("Change start date", "Deactivate", "Delete connection"). For the details tasks (T079, T082) |
| U41, U42, U59 | S11 | done (T067, 2026-11-09); the ⋯ on every tab (F28, CLAR #21), "Copy link" in the tab menu (F10, FR-036) |
| U60, U61, U62 | S11 | done (T068, 2026-11-09); the inline rename (U60 11.4, U62 11.10) not built (F28); the deleted toast neutral, not U61's red (T036) |
| U44, U45 | S12 | done (T069, 2026-11-09); the first rule's outline 8 px shorter than U44 5.1 draws (T024's list spacing, UNCERTAIN 2 of T069); the rule notes' "Contradicts Rule 02." where the design draws "Can’t be met together with Rule 02." (C4, T010's text, UNCERTAIN 1 of T069) → **user 2026-11-09: the design's wording, `noteOf()` changed ("Can’t be met together with …")** |
| U46 | S12 | done (T070, 2026-11-09) |
| U65 (`7057:58709`, `7057:59123`), U66 (`7057:59536`): page title, chips, data card, results, test-day line | S13 | done (T071, 2026-11-09); the edit-data dialog `7058:60514`: T072; the per-card scroll areas: F43, done (T073); the footer's "Publish" arrow: T075/T084 (note) |
| U66 (`7058:60514`), U67, U68: the edit-data dialog, a field error, saved with the toast, the regeneration question | S13 | done (T072, 2026-11-09) |
| U69, U70, U71, U72: variant tabs, a variant without rules, the ⚠ tab and its tooltip, many rules (the panel scrolls) | S13 | done (T073, 2026-11-09) |
| U74 (`7062:50960`, `7062:51249`, `7062:51536`): loading, one persona regenerating, generation failed | S13 | done (T074, 2026-11-09); the footer's "Publish" arrow: done (T084, 2026-11-09) |
| U99 (`7114:49683`): the edit flow's test step | S13 | done (T074, 2026-11-09): the step's content and its failure hint; the footer ("Discard changes"), the "Active" badge (F5) and the note (F49): T083/T084 (S18) |
| U63 (`7112:48724`), U73, U75, U77 | S14 | done (T076, 2026-11-09): the summary; "Active from" not built (F1); U63 `7112:48860` (the details after renaming Standard) belongs to S15 (T078/T079) |
| U76, U78, U79 | S14 | done (T077, 2026-11-09): publishing, published (0.5 s), failed (F46), conflict (U90 anatomy, W3/W7), "Publish without rules?", the save dialog "Save changes?"; U76's go-live date not built (F1) |
| U80, U81, U88, U86 (F2), U87 (F1): frame, status band, Links | S15 | done (T078, 2026-11-09); the deactivated band is an interim until T080 |
| U82–U85, U91, U92 (F2) (Summary) | S15 | done (T079, 2026-11-09): the Summary accordion, the variant tabs, read-only rows, the checks in the Worker; Activity not built (F2) |
| U89, U96, U97, U94 (F1), U95 (F1) (deactivated, loading, error, unknown) | S15 | done (T080, 2026-11-09); the scheduled frames built as active (F1); the load failure's error ID (W2) on the connection pages |
| U93 | S16 | done (T081, 2026-11-09); "Delete draft" at the band's right end (F56, no frame) |
| U15 (`6699:47905`), U87 (`6396:49030`): the edit entry | S17 | done (T083, 2026-11-09) |
| U98, U99 | S18 | done (T084, 2026-11-09; U98 step 1: T049, 2026-11-08) |
| U100 ("Discard your changes?") | S18 | done (T083, 2026-11-09) |
| (no frame) | S19 | done (T086, 2026-11-09): the patterns’ tables of §5.1 stand; the states under S19 below; checked in V9 (V9.1, T089, §6.6) |
| (no frame) | S20 | done (T087, 2026-11-09): the patterns’ tables of §5.1 stand; the states under S20 below; checked in V9 (V9.2, T089, §6.6) |
| (no frame) | S21 | done (T088, 2026-11-09): the patterns’ tables of §5.1 stand; the states under S21 below; checked in V9 (V9.3, T089, §6.6) |
| (no frame) | S22 | done (T089, 2026-11-09): the route-by-route table under S22 below; checked in V9 (§6.6) |

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
| U17 `6408:72919` | log-out dialog | buttons | which, style | "Log out anyway" (secondary, action blue), "Save and log out" (primary), ×; no Cancel | "Cancel" (tertiary), "Log out anyway" (secondary), "Save and log out" (primary), × | F20 (Cancel added); a match since bug v5-ui-fixes (2026-11-18): "Log out anyway" and "Save and log out" with the ×, no Cancel (Clarification 2026-11-18 #3; not yet measured in a browser) |
| U17 `6408:72919` | log-out dialog | dialog | box, layout | 480 × 232, two buttons side by side | 480 × 360: three buttons stacked 416 × 48 (Cancel 422, Log out anyway 486, Save and log out 550) | F20 + §5.1 ConfirmDialog (three buttons stack in 480); a match since bug v5-ui-fixes (2026-11-18): two buttons side by side, as drawn (not yet measured in a browser) |
| — | log-out dialog | Cancel | focus | not drawn (F20) | back on the account pill | match (F20); history: no Cancel since bug v5-ui-fixes (2026-11-18); the ×, Escape and the scrim return the focus to the account pill |
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
| draft (changed) | "Log out" | "Save before you log out?" / "Your latest changes will be lost if you log out now." / Cancel, Log out anyway, Save and log out; Cancel and Escape → focus on the account pill (history: since bug v5-ui-fixes, 2026-11-18, only "Log out anyway" and "Save and log out"; the ×, Escape and the scrim → focus on the account pill) |
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
| U98 `6731:39823` | edit flow, step 1 | header pill | title | the connection's name + "Active" | the name ("Passenger transport licence"); no badge yet | match; badge closed (T084, 2026-11-09) |
| U98 `6731:39850` | edit flow, step 1 | footer | actions | "Discard changes", "Choose documents →" (secondary), "Save" | "Choose documents" (primary) only | closed (T083, T084, 2026-11-09) |

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
| U21 I7290:61204;6246:18954 | a document added | trash | box, icon, place | "Rules/Delete button" 32 × 32, radius 4, icon-delete-small 20 `#4a5468`; always shown | 367, 342, 32 × 32, 4px; `kern-icon--delete` 20 rgb(74, 84, 104); always shown; named "Remove Personal ID" | match (U21 #11); history: no trash since bug v5-ui-fixes, 2026-11-18 (T052’s note) |
| "Documents/List item" (description) | hover, keyboard focus | trash | colours | the red icon on the light-red fill | rgb(196, 39, 28) on rgb(254, 241, 240) | match (T052 verifies U23's hover frame); history: no trash since bug v5-ui-fixes, 2026-11-18 (T052’s note) |
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

**History (bug v5-ui-fixes, 2026-11-18):** the list item’s trash is gone. "Remove document"
(red, after a divider) is in the row’s ⋯ menu, which every row has, a single document’s too,
named "Actions for <document>" (spec 010 `spec.md`, Clarification 2026-11-18). The rows below
and in T051’s and T053’s tables that record the trash (its place, look, hover and focus, the
focus back on it) are history.

| frame | state | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|
| U22 7290:62332 | two documents | list title, pager | text | "Added documents (2)"; "Document 2 of 2" with Next disabled | the same; Next `aria-disabled` | match (FR-031) |
| U22 7294:61686 | two documents | list | gap | 4 | items at 338 and 382 (40 + 4) | match |
| U22 7290:62349 | two documents | item, not shown | fill, glyph, name | none; ink glyph `#0b1220`; 400 14/24 `#0b1220` | transparent; `personal-id-ink.svg` (`#0B1220`); 400 14px/24px rgb(11, 18, 32) | match (T051's guess confirmed) |
| U22 7290:62349 | two documents | item, not shown | height | 32 (no trash drawn) | 40: the trash's 32px place is kept, invisible (`opacity-0`) | FR-009 (the keyboard reaches the trash; no 8px jump on hover, U23's hovered item is 40); UNCERTAIN 1; history: no trash since bug v5-ui-fixes (2026-11-18) |
| U22 7290:62348 | two documents | item, shown | fill, glyph, name, trash | `#f2f5fb`, radius 8, padding 4 8; action-blue glyph; 600; grey trash 32 | rgb(242, 245, 251), 8px, 4px 8px 4px 0 plus the button's 8px left; `driving-licence-action.svg` (`#1D56F0`); 600; trash 32 × 32 at 367, 386, icon rgb(74, 84, 104) | match; history: no trash since bug v5-ui-fixes (2026-11-18) |
| U23 7298:61782 | hover on an item | item | fill | none (no hover fill) | transparent (T051's hover `background-hued` removed) | match |
| U23 7298:61782 | hover on an item | trash | presence, colours | "Rules/Delete button" state=hover: `#fef1f0` fill, icon `#c4271c` | opacity 1; rgb(254, 241, 240), icon rgb(196, 39, 28), on hover anywhere on the item | match (T051's red hover confirmed); history: no trash since bug v5-ui-fixes (2026-11-18) |
| U23 7298:61783 | hover on another item | shown item's trash | colour | grey | rgb(74, 84, 104), no fill | match; history: no trash since bug v5-ui-fixes (2026-11-18) |
| "Documents/List item" (description) | keyboard in an item (Tab to the trash) | trash | look | "on hover/focus of any row it shows red with a light-red fill" | `group-has-focus-visible`: shown, red on light red; KERN's 4px focus ring on the focused button | match (the description's calm 2px ring: §3 focus ring, KERN's, as T051); history: no trash since bug v5-ui-fixes (2026-11-18) |
| U23 #13 (7298:61765) | hover | item | move cursor | "cursor shows it can be moved" | pointer (the item is a button); no drag | F23 |
| U23 7298:62322 | trash, no rule checks it | dialog | box, text | 480 × 256; "Remove Driving licence?"; "Citizens won’t be asked for this document any more."; × | 480 × 256 at 480, 312; the same texts (`REMOVAL_DIALOG_COPY`); "Close" × | match (F72, FR-031) |
| U23 7298:62322 | trash, no rule checks it | dialog buttons | label, look | "Keep document" secondary, "Remove document" filled `#c4271c`, 200 each, 16 apart | `kern-btn--secondary` 200; `kern-btn--primary kern-btn--danger` rgb(196, 39, 28) 200 | match |
| — | the question open | ×, Escape, scrim, "Keep document" | behaviour | not drawn | each closes it (`keepDocument`), the document stays, the focus back on the trash | FR-009; scrim on: decision below (FR-052a); history: since bug v5-ui-fixes (2026-11-18) the question opens from the ⋯’s "Remove document", not a trash |
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
| U25 7298:62832 | A14, the flagged item shown | flagged item | selected look, trash | the error look only (no hued fill, no trash) though shown | the error look, `aria-current="true"`, trash hidden (`opacity-0`, place kept) | match; history: no trash since bug v5-ui-fixes, 2026-11-18 (T052’s note) |
| "Documents/List item" (description, "error · hover") | hover / keyboard in the flagged item | trash | look | "Bin turns red on hover in every state" | the error icon fades out, the trash shows red on light red (opacity 1, rgb(196, 39, 28)) | match; history: no trash since bug v5-ui-fixes, 2026-11-18 (T052’s note) |
| U25 7298:62832 | A14 | flagged item | height, place | 32 at 64 in the list | 40 at 410 (rows keep the trash's 32 px place, T052 UNCERTAIN 1) | T052 decision; history: no trash since bug v5-ui-fixes, 2026-11-18 (T052’s note) |
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
| U98 #28 (7296:52389) | edit flow | footer | actions | "← Back", "Discard changes", "Set rules →" secondary, "Save" primary | "Back", "Set rules →" primary | closed (T084, 2026-11-09: "Discard changes", "Set rules →" secondary, "Save") |
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

### U30, U31 Rule editor part 1 (S10) — T061, 2026-11-08

Checked in Firefox (playwright-firefox) at 1440 × 947 (Firefox's overlay scrollbar takes no gutter:
`body` 1440 wide at a 1440 window), 1440 × 720 (U31 1.8b) and 320 × 640, signed in as `designer`, on
three own drafts (since deleted): "T061 no rules" (the first rule, U30 1.5), "T061 images" (Rule 01 =
AGE_RULE, Rule 02 on the Driving licence with Portrait and Signature requested: U31 1.8) and on the
seeded "Führerscheinantrag Stuttgart" (editor opened and discarded, nothing saved). Fonts:
`document.fonts.check('600 14px "Fira Sans"')`, `'400 16px …'`, `'400 14px …'` true. Rule-editor
state is local; nothing was sent. The rule row after "Save rule" is T024's table; the menu search
field T015's; the step shell T032/T033's.

| frame | state | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|
| U30 6348:40744 | every state | editor | box, border, radius, padding, gap | 1086 wide at 177 (card 160 + 1 + wrap 16); white, 1 `#1d56f0`, 8; 16 24; 16 | 177, 1086; oklch(1 0 0), 1px solid rgb(29, 86, 240), 8px; 16px 24px; 16px | match |
| U30 6350:41176 | new rule | editor | height | 276 | 276 | match |
| U30 6348:40744 | age complete | editor | height | 330 | 330 | match |
| U30 6350:41175 | Rule 02 after Rule 01 | editor wrap | padding | 16 16 24 (316 = 16 + 276 + 24) | 8 16 8 (292): the caller's `px-16 py-8` in `RulesStep/index.tsx`; the editor 8 higher than drawn (436 vs 444) | T056 (caller outside T061's files; note below) |
| U30 6348:40745 | every state | name row | text, font, colour, place | "Rule 01" / "Rule 02", label/small 600 14/24 `#1d56f0` at 25, 17 | "Rule 01" / "Rule 02" 600 14px/24px rgb(29, 86, 240) at 202, 315 (= 177 + 25, 298 + 17) | match (002-S3.1) |
| U30 6348:40745 | every state | name row | pencil | icon-edit-small 20 `#4a5468`, 4 after the name | none: the page passes no `onRename`; the editor has no rename in the baseline (002-S3.1 shows the name; a saved rule renames inline from its row or ⋯) | baseline (UNCERTAIN 2) |
| U30 6348:40746 | every state | check row | place, gap, wrap | 25, 57; gap 8; wraps | 202, 355; 8px; `flex-wrap` | match |
| U30 6350:41179 | new rule | document picker | box, padding, gap, border, radius, fill | h 40, pl 16 pr 8, gap 8, 1 `#e1e6f0`, 8, white | 40, 0 8px 0 16px, 8px, 1px solid rgb(225, 230, 240), 8px, white | match |
| U30 6350:41179 | new rule | document picker | width, glyph | 211 with a 16 px Personal ID glyph (the instance's default) before "Choose document" | 185.1, no glyph until a document is chosen | UNCERTAIN 3 (a glyph would name a document not chosen) |
| U30 6350:41179 | document menu open | document picker | open look | 2 `#1d56f0` border, label `#1d56f0`, chevron up | 1px border + 1px inset ring rgb(29, 86, 240) (2 px, content kept in place), label and `picker-expand-open.svg` blue, rotated | match |
| U30 6350:41180, 6350:41181 | new rule | "Choose data", "Choose check" | look, state | drawn like the enabled picker: white, ink label 16/24, 144 and 153 wide | disabled until the choice before (`disabled`), the kit's 40 % (`opacity-(--kern-color-action-state-opacity-disabled)`), white, ink label; 144.3 and 153.2 wide | W19, FR-039 (the disabled look: UNCERTAIN 1) |
| U30 6350:41180 | new rule | picker label | colour while nothing is chosen | ink `#0b1220` (16/24 400) | rgb(11, 18, 32) 400 16px/24px (was muted) | match |
| U31 6350:41420 | document chosen | document picker | label, glyph, width | "Driving licence" with the 16 px glyph, 184 | "Driving licence", `driving-licence-ink.svg` 16 × 16, 184.5 | match |
| U30 6348:40747 | data chosen | pickers | widths | Personal ID 161; Date of birth (Age) 187; "≥ is at least" 158 | 160.6; 186.5; 158 | match (text rendering) |
| U30 6348:40749 | check chosen | check picker | symbol chip | "Rules/Symbol" before the words: min 24, 0 8, 1 `#e1e6f0`, circle, 600 14/24 | 25.8 × 26, 0 8px, 1px rgb(225, 230, 240), 9999px, 600 14px/24px, `aria-hidden` | match (T024's 26 high chip) |
| U30 6348:40750, 6348:40752 | value entered | number field, suffix | box, text | 64 × 40, 0 16, 1 `#e1e6f0`, 8; "21" 16/24; "years old" 16/24 ink, 8 after | 64 × 40, 0px 16px, 1px rgb(225, 230, 240), 8px; "21"; "years old" 400 16px/24px at 803 (795 + 8) | match |
| U30 6348:40753 | age complete | hints | place, gap, row | 25, 113; 4 apart; icon-info-small 20 `#4a5468`, 8, body/small 14/24 `#4a5468` | 202, 411; 4px; `kern-icon--info` 20 rgb(74, 84, 104) at y + 2, gap 8px, 400 14px/24px rgb(74, 84, 104) | match |
| U30 6348:40755 | age complete | boundary hint | text | "Citizens who turn 21 on that day meet the rule." | "Citizens who turn 21 that day count." | F59 |
| U30 6348:40754 | age complete | counting note | text | "Counted from the day the citizen shares their data. Today (23.10.2026), that means born on or before 23.10.2005." | "Counted from the day the citizen shares. Today (8 Nov 2026) this means: …" (unchanged) | T062 (cosmetic 9, cosmetic 3; the date notes are T062's) |
| U30 6348:40756 | age complete | missing note | text | "If the date of birth is missing or can’t be read, the rule isn’t met. Konnekt reports it as “couldn’t be checked”." | "If the date of birth is missing or can’t be read, the rule isn’t met and is reported as couldn’t be checked." (unchanged) | T062 (C1, cosmetic 9) |
| U30 6350:41185 | new rule, nothing to note | hints row | height | 24 (the "Hints" frame keeps its row with every hint hidden; the message at 153 = 113 + 24 + 16) | an empty `aria-hidden` 24 px row; message at 451 = 298 + 153 | match (UNCERTAIN 4) |
| U31 6350:41728 | part missing | hint | text | "Licence classes has parts. Choose the part to check." | the same | match (FR-051 (34)) |
| U31 6350:42013 | class date, no check | hint | text | "Check the time since or until this date, or compare it with a fixed date." | the same | match |
| U30 6350:41266 | before a check | message placeholder | box | 1036 × 42 at 25, 153; 1 dashed `#e1e6f0`, radius 4, 8 16, gap 8 | 202, 451, 1036 × 42; 1px dashed rgb(225, 230, 240), 4px, 8px 16px, 8px | match |
| U30 6350:41266 | before a check | message placeholder | texts | "Message for citizens:" label/small 600 `#4a5468`; "Suggested once you choose a check. You can edit it." body/small `#4a5468` | the `label` 600 14px/24px rgb(74, 84, 104); the textarea's placeholder, 400 14px/24px, `::placeholder` rgb(74, 84, 104) | match (FR-039, C2; was "Error message citizens read:" / "… once you complete the check …") |
| U30 6348:40757 | message proposed | message field | box | hued `#f2f5fb`, radius 4, 8 8 8 16, gap 8, 40 high | rgb(242, 245, 251), 4px, 8px 8px 8px 16px, 8px, 40 | match |
| U30 6348:40757 | message proposed | message field | texts, pencil | "Message for citizens:" 600 14/24 `#1d56f0`; "You need to be at least 21 years old." 14/24 ink; icon-edit-small 20 `#1d56f0` at the end | label 600 14px/24px rgb(29, 86, 240); "You need to be at least 21 years old." (T009's proposal) 400 14px/24px ink; pencil 20 rgb(29, 86, 240) at 1210 (1238 − 8 − 20) | match (C3) |
| — | message edited | message field | behaviour | not drawn | a written message stays when the condition changes (years 2 → 3 kept "Only experienced drivers can apply."); emptied, it follows the condition again | match (F9 baseline) |
| U30 6348:40758 | every state | editor actions | layout | 1036 × 48 at 25, 265; right-aligned, 16 apart | 202, 563, 1036 × 48; `justify-end`, 16px | match |
| U30 6348:40758 | every state | "Discard rule" | look, text | button-tertiary-small: 40 high in 48, padding 0 8, label 4 8, "Discard rule" label/Action/small_underline 600 14/24 `#1d56f0` underlined | `kern-btn--tertiary kern-btn--small` 40 at y + 4, 0 8px, label 4px 8px, "Discard rule" 600 14px/24px rgb(29, 86, 240), underline | match (FR-051 (36); was "Cancel") |
| — | "Discard rule" | behaviour | — | not drawn | the baseline's cancel: closes the editor, asks "Save changes to Rule 01?" when there are changes (F10) | match (002-S2.26) |
| U30 6348:40758 | complete | "Save rule" | look | button-primary-small `#1d56f0`, label 600 14/24 white | `kern-btn--primary kern-btn--small` rgb(29, 86, 240), 600 14px/24px white, 90.9 × 40 | match |
| U30 6350:41190 | incomplete | "Save rule" | look | 40 % (`action-state-opacity-disabled`) | opacity 0.4 (`aria-disabled`) | match (the explanation and `ExplainedButton`: T063, W21) |
| — | "Save rule" pressed, incomplete | inline flags | look, ARIA, focus | not drawn (U30 #46) | the missing part's red border (`#c4271c`), `aria-invalid`, described by "Rule 02 in Standard: choose a check." (`role="alert"`) under the check row, focus moved to it; an empty message: the placeholder's dashed border red, `aria-invalid`, "Rule 02 in Standard has no error message.", focus in the field | FR-039, W19 |
| U30 6350:41316 | document menu | menu | box | 300 × 141 at the picker's left, 8 below (202, 549 under the picker's bottom 541) | 202, 403 under the picker's 395 (first rule) and 202, 541 under 533 (Rule 02); 300 × 141 | match |
| U30 6350:41316 | document menu | menu | frame | white, 1 `#e1e6f0`, 8, padding 8, gap 2, "Elevation/Menu" | the same; `--shadow-menu` `rgba(19, 21, 37, 0.16) 0 10px 28px` | match (the frame's 14 px drop-shadow blur is the export's; the style is "Elevation/Menu" r 28) |
| U30 6350:41316 | document menu | items | box, glyph, text | 282 × 40, padding 8, gap 8, radius 4; 16 px ink glyph; body/small 14/24 ink | 282 × 40, 8px, 8px, 4px; `personal-id-ink.svg` / `driving-licence-ink.svg` 16; 400 14px/24px | match |
| U30 6350:41316 | document menu | divider, footer | box, text | 1 `#e1e6f0`; footer pt 8 pb 4 pl 8, "Only documents you added are listed." body/small `#4a5468` | 1px rgb(225, 230, 240); 8px 0 4px 8px, "Only documents you added are listed." 400 14px/24px rgb(74, 84, 104) | match (002-S3.41's one wording, now the design's; was "… you request …") |
| U31 6350:41548 | data menu | menu | place, width | 340 at the data picker's left (394), 8 below | 394.5, 541 under the picker's 533; 340 | match |
| U31 6350:41549 | data menu | search field | placeholder, box | "Search Driving licence", 322 × 40 | the same (T015's `MenuSearchField variant="menu"`) | match |
| U31 6362:61765 | data menu | list | height, scroll | 220, scrolls (the images below the fold); search and footer stay | 222 in the `max-h-320` step that fits above the footer (533 + 8 … 875 − 8), scrolls; search and footer stay | R10 (the step, design-notes §3 Menu: 1.8b draws the same list 280) |
| U31 6350:41551 ff. | data menu | items | box, text | 322 × 40, padding 8, body/small 14/24 ink | 322 × 40, 8px, 400 14px/24px | match |
| U31 6350:41551 ff. | data menu | order | items | Licence classes, Issue date, Expiry date, Licence number, Issuing country | the requested fields in the catalog's order (Issue date, Expiry date, Issuing country, Licence number, Licence classes) | match (sample data; 002-S3.3) |
| U31 6350:41621 | data menu | divider before the images | box | 322 × 1 `#e1e6f0`, in the list | 322 × 1 rgb(225, 230, 240) | match |
| U31 6350:41622, 6350:41624 | data menu | image rows | box, text, tag | 322 × 42, padding 8; "Portrait" body/small `#4a5468`; "Data/Status tag" "Not for rules" 99 × 26, 1 `#e1e6f0`, 0 8, radius 4, 14/24 `#4a5468`, at 215 | 322 × 42, 8px; 400 14px/24px rgb(74, 84, 104); "Not for rules" 98.1 × 26, 1px rgb(225, 230, 240), 0 8px, 4px, rgb(74, 84, 104), at 215.8; `aria-disabled`, skipped by the arrow keys | match (cosmetic 9; was "Can’t be checked") |
| U31 6350:41628 | data menu | footer | box, texts | pt 8 pb 4 pl 8, gap 8, no divider; "Need other data?" body/small `#4a5468`; "Add it in Documents" label/small 600 `#1d56f0` | 8px 0 4px 8px, 8px, no divider; 400 14px/24px rgb(74, 84, 104); a button 600 14px/24px rgb(29, 86, 240) | match (its "Save changes to Rule 01?" first: the page's, T063) |
| U31 6635:36529 | 1440 × 720 | data menu | direction | opens up, 8 above the picker, never under the footer | `bottom-full mb-8`: 263 – 485 above the picker's 493; `max-h-240` fits under the pinned step header (`--wizard-sticky-top` 216) | match (R10: the frame draws it over the step header, which the wizard pins at this size) |
| U31 6984:49993 | part menu | menu | width, place, search | 300 at the part picker's left, 8 below; "Search classes" | 300 at 567.4, 541; "Search classes" | match (was 340) |
| U31 6984:49995 | part menu | list | height | 234, scrolls | 260 in `max-h-320`, scrolls | R10 (step) |
| U31 6984:50048 ff. | part menu | items | text | "Licence classes", "Licence class AM – Issue date", "… – Expiry date", … | the same | match (W19's codes and descriptions are the values menu's: T063) |
| U31 6350:42064 | class date | check picker | label | "Choose check" after the part | the same, at 829.4 (Figma 827: the part's text 1 px wider) | match |
| U31 6985:50041 | date check menu | menu | width | 300 | 300 (was 340) | match |
| U31 6985:50041 | date check menu | heading | box, text | pt 8 pb 2 pl 8, body/small `#4a5468`; "Time ago", "Time from now", "Fixed date" | 8px 0 2px 8px, 400 14px/24px rgb(74, 84, 104), `aria-hidden` naming its `role="group"`; the same headings | match (the words: T062, F34) |
| U31 6985:50041 | date check menu | items with symbol | box | padding 8, the symbol chip at the end, 42 high (26 chip) | 282 × 42, chip 25.8 × 26 at the end | match |
| U31 6985:50041 | date check menu | dividers | between sections | 1 `#e1e6f0` | 1px rgb(225, 230, 240) | match |
| U30 6348:40889 | Rule 01 saved | rule row | statement | "Personal ID · Date of birth (Age) ≥ is at least [21 years old]" | the same (C3); T024's row | match |
| U30 6369:62602 | Rule 01 saved | toast | text | "Rule 01 saved." | "Rule 01 in Standard saved." | T056 (cosmetic 8; the toast is the page's) |
| P33 2:1985 | hover | menu item | background | `action-state-indicator-default` at 8 %, pressed 16 % | #1d56f0 / 0.08 (`oklab(… / 0.08)`), 150 ms | match (T021's entries) |
| P33 2:2406 | keyboard focus | menu item | look | the focus colour fill, text inverse | rgb(11, 18, 32) fill, white text, the glyph `brightness(0) invert(1)`, no outline | match (T021's entries; the old 4 px inset ring is gone) |
| — | chosen | menu item | look | not drawn | hued `#f2f5fb` (`aria-selected`) | match (baseline) |
| — | open | menu | placement, z-index, clipping | design-notes §3 Menu | `placementFrom()` measured as it opens (also a menu opened by the choice before it, after its picker moved or appeared), class sets only, `z-40`, no clipping ancestor | match (T027 carry: `z-20`, `mt-4`, `max-md:left-24` gone) |
| — | 320 × 640 | menus | stay on screen | not drawn | check menu across the editor (`inset-x-24`, 58 – 262, 204 wide) down 8 under the picker, and up 8 above it (142 – 462 above 470) where it doesn't fit below; no horizontal scroll (scrollWidth 320) | FR-010 (R10) |
| — | keyboard | menus | listbox pattern | — | arrows, Home, End, Enter, Escape (focus back on the picker), Tab closes; a choice opens the next menu; a value field takes the focus after its check | match (002-ACC, baseline) |

UNCERTAIN (T061, accepted by the coordinator, none core): disabled pickers in the kit's disabled state (no frame draws them); no pencil on the name row (the baseline editor has no rename, 002-S3.1); no glyph on the empty document picker; the 24 px hints spacer also for kinds without hints; list heights by the R10 max-height step.

### U29, U43 Rules step frame and list (S9) — T056, 2026-11-08

Checked in Chromium (playwright-core 1.48.2, `/usr/bin/chromium`) at 1455 × 947 (body 1440), 1455 × 600 and
320 × 640, signed in as `designer`, on T056's own drafts: no rules, one rule, two rules, three rules as U43 4.1
(Rule 01 ≥ 21 years, Rule 02 expiry ≥ 6 months from now, Rule 03 classes B, BE), a rule without a message, 12
rules (scrolling, select mode). Font check `600 24px "Fira Sans"` true. The step header and the footer are
T032/T033's tables (L3); the rule rows T024's, the connectors T023's, the editor T061's; the rows here are the
step's frame and list. Figma y values are page values (frame + 64 for the header area).

| frame | state | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|
| U29 6702:39345, U43 6702:41083 | every state | step head | h1 text, font | "Set eligibility rules for citizens", heading/large 600 24/32 `#0b1220` at 160, 136 | "Set eligibility rules for citizens" (`RULES_COPY.title`), the one h1, 600 24px/32px rgb(11, 18, 32) at 160, 136 | match (C2) |
| U29 6702:39345 | every state | step head | hint | "A rule is a condition the citizen’s data has to meet. Konnekt checks each rule and tells your service whether it’s met." body/small 14/24 `#4a5468` at 160, 168 | the same text (`RULES_COPY.hint`), 400 14px/24px rgb(74, 84, 104) at 160, 168 | match (C1, C2) |
| — | every state | tab title | text | not drawn | "Set eligibility rules for citizens · Konnekt" | match (W2, C1) |
| U29 6504:43833 | no rules | tab row | presence | none (the card at 216) | "Standard", "+ Add variant", the ⓘ at 160, 216, 1120 × 49; the card at 281 | F26 (the tab row from the start; then U43's layout) |
| U43 6168:7009 | every state | tab row | box | 160, 216, 1120 × 49, bottom 1 `#e1e6f0`, 16 above the card | 160, 216, 1120 × 49 (`BranchTabs` in the pinned wrapper, white); card 16 below at 281 | match |
| U43 6168:7013 | Standard only | "What is a variant" ⓘ | colour | action blue (`icon-info-small` on `#1d56f0`) | muted grey (`InfoTooltip` default tone) | T064 (carried from T022: `tone="action"`; `BranchTabs.tsx` is T064's) |
| U43 6168:7014 | rules | rules card | box, border, radius, fill | 160, 281, 1120 × 470; 1 `#e1e6f0`; 12; white | 160, 281, 1120 × 470; 1px solid rgb(225, 230, 240); 12px; oklch(1 0 0) | match |
| U43 6168:7017 | rules | first rule row | height, padding | 110: pt 8, pb 16 (16 under its content before the first connector), pl 24, pr 16 | `li` 110 = `RuleRow` 102 (py 8, pl 24, pr 16) + the list's `pb-8`; name at 185, 290 | match (T024's carry: the extra 8 is the list's) |
| U43 6168:7020, 6168:7226 | rules | other rule rows | height | 102 | 102 (in a 146 `li` with the connector's 44) | match |
| U43 6168:7018, 6168:7021 | rules | connector frame | box, padding | 1118 × 44, padding 8 24 | 161, 392 and 538, 1118 × 44, 8px 24px | match |
| U43 6168:7042 | rules | "Add" frame | box, padding | 1 + 403 in the card, 1118 × 66, padding 8 24 16 | 161, 684, 1118 × 66, 8px 24px 16px | match |
| U43 6168:7043 | rules | "Add rule" | box, look | 24, 8 in the frame; dashed 1 `#1d56f0`, radius 8, padding 8 16, gap 4, add icon 20, label/small 600 14/24 `#1d56f0` | 185, 692, 111.7 × 42; 1px dashed rgb(29, 86, 240), 8px, 8px 16px; `kern-icon--add kern-icon--small`; 600 14px/24px | match |
| — | one rule | first rule row | spacing | not drawn (no connector follows) | `li` 102, no extra 8; card 170 (102 + 66 + 2) | match (the extra 8 sits before a first connector only) |
| U43 6168:7014 | rules | identifiers | presence | none | no "rule-n" in the card's text | match (F35) |
| U29 6504:43840 | no rules | empty wrap | padding | 24 all round, the card hugging it (1120 × 248) | 161, 282, 1118 × 246, 24px; card 1120 × 248 | match |
| U29 6504:43841 | no rules | empty state | box, border, radius, padding, gap | 1070 × 198 at 24, 24; dashed 1 `#1d56f0`; 8; py 40; gap 8 | 185, 306, 1070 × 198; 1px dashed rgb(29, 86, 240); 8px; 40px 0; 8px | match |
| U29 I6504:43841;6093:4290 | no rules | title | text, font, place | "No rules yet", title/default 600 18/24 `#0b1220` at 1 + 40 | "No rules yet" (an h2), 600 18px/24px rgb(11, 18, 32) at 347 (306 + 1 + 40) | match |
| U29 I6504:43841;6093:4291 | no rules | text | text, font | "Without rules, Konnekt still passes the verified data to your service. Your team decides who can apply." 400 14/24 `#4a5468`, 4 under the title | the same text (`RULES_COPY.emptyText`), 400 14px/24px rgb(74, 84, 104) at 375 | match (RULE wording; C1) |
| U29 I6504:43841;6093:4313 | no rules | "+ Add rule" | box, look | button-primary-small: a 48 slot 8 + 8 under the text, visible 40 high, `#1d56f0`, radius 8, icon-add-small 20 white, label/small white | 667.2, 419, 105.7 × 40 (slot 415), rgb(29, 86, 240), 8px, `kern-btn--primary kern-btn--small` | match |
| U29 6504:43841 | "+ Add rule" | focus | behaviour | 1.2 draws the documents menu open (U30 1.7) | the editor opens in the card; the focus on "Choose document" (the picker, closed) | baseline (002-S3.1; T061's note: kept) |
| U29 6348:40227, 6348:40531 | new rule, no other rules | editor wrap | padding, box | 16 16 24; card 278 (1.2) / 318 (1.4) | 16px 16px 24px; wrap 1118 × 316 with the 276 editor, card 318 | match (T061's open row closed; the editor's own height is T061's) |
| U30 6350:41175 | new rule after rules | editor wrap | padding | 16 16 24 (316 = 16 + 276 + 24) | 16px 16px 24px, wrap 316 after the connector's 44 (`li` 360) | match (was `px-16 py-8`: T061's open row closed) |
| — | rule edited in place | editor wrap | padding | not drawn | 16px 16px 24px (wrap 372) | match (one wrap for every position) |
| U29 6348:40236, 6348:40255, 6348:40542 | rule open | "Test rules" | state | disabled look (pale blue) | `ExplainedButton`, `aria-disabled="true"`, no `disabled`; a click stays on the step | match (F65, FR-034; T033) |
| — | rule open | "Test rules" | explanation | not drawn | "Save the rule first" on hover and on keyboard focus, `aria-describedby` the tooltip | W21 (T022's pattern) |
| — | select mode | "Test rules" | explanation | not drawn | "Finish grouping first" on hover and keyboard focus; usable again after "Cancel" | W21 (FR-034) |
| U30 6369:62602 (U30 #37) | Rule 01 saved | toast | text | "Rule 01 saved." | "Rule 01 saved." (was "Rule 01 in Standard saved.") | match (report cosmetic 8; T061's open row closed) |
| U01 6637:36644 #17 | scrolled, 1455 × 947 | step head | pin | step line, title and description pinned under the header | pinned at 64 – 216 (T033's `wizard-pinned:`) | match |
| U01 6637:36644 #18 | scrolled 700, 1455 × 947 | tab row | pin | the variant tabs pinned with the step header | `sticky` at 216 – 265 (right under the step header), white, z-10; rules scroll under it; `--rules-tabs-height` 49px | match |
| U01 6637:36644 #19 | select mode, scrolled 700 | selection bar | pin | right under the tabs | `top` 265px: 265 – 329 (`--wizard-sticky-top` in the card = 216 + 49) | match |
| — | scrolled, focus moves | focused element | clearance | not drawn | `scrollIntoView` start: a rule's ⋯ and a row land at 281 (16 under the tabs' 265); in select mode a box lands at 353 (24 under the bar's 329) | WCAG 2.4.11 (scroll-padding + `scroll-mt`) |
| — | tab row pinned | tab menu, variant tooltip | stacking | not drawn | the Standard ⋯ menu (266 – 366) and the ⓘ tooltip paint over the card; a rule's ⋯ menu (z-40) over the tabs | match (V6: no clipping, no transform) |
| — | 1455 × 600 (under 640 tall) | tab row, bar | pin | not drawn | step header and tabs scroll away (`--rules-tabs-height` 0px); the bar pins under the header pills at 64 | match (as T033's step header) |
| — | 320 × 640 | step | layout | not drawn | tab row wraps (87 high), not pinned; no horizontal scroll (scrollWidth 305 = 320 less the scrollbar) | FR-010 (R10) |
| U43 6168:7263 | a group | group wrap | layout | 16 sides, 8 above and below | not checked here | T057 |
| U43 6168:7666 | Ambulance | link strip, marks | layout | "Linked to Standard" strip 56, removed rows 74 | not checked here | T066 (strip, marks), T024 (rows) |

**`stickyPin.ts` (§2 decision, T056):** `frontend/src/utils/stickyPin.ts` and `stickyPin.test.ts`: **kept, unchanged** (T056). `usePinned` still uses `isPinned` for the selection bar's resting/pinned look; the tab row pins with CSS `position: sticky` only and needs no helper. The pinned tab row's height is measured into `--rules-tabs-height` (RulesStep `index.tsx`, `usePinnedTabsHeight`), 0 where the row isn't sticky.

UNCERTAIN (T056, accepted by the coordinator): the selection bar pins under the tabs through a scoped `--wizard-sticky-top` on the rules card (mechanism only, the drawn behaviour; T059 may switch `SelectionBar` to `--rules-pinned-top`); "Rule 01 saved." without the variant's name in every variant (contract S9, cosmetic 8); the first rule's extra 8 px only when something follows it; the editor wrap 16 16 24 also inside groups.

### U32, U33, U48 Rule editor part 2 (S10) — T062, 2026-11-08

Checked in Chromium (playwright-core, `/usr/bin/chromium`, 1455 × 947, body 1440) for the numbers
and in Firefox (playwright-firefox, 1440 × 947, body 1440: the overlay scrollbar takes no gutter)
for the font check, the text check's numbers and the screenshots (`phase7/T062/ff-*.png`), plus
320 × 640 (Chromium). Signed in as `designer`, on the own draft "T062 rule editor" (Personal ID:
names, Date of birth, City or town, Nationality, Expiry date; Driving licence: Licence classes,
Issue date, Expiry date; Rule 01 = AGE_RULE), deleted at the end. Fonts:
`document.fonts.check('600 14px "Fira Sans"')`, `'400 16px …'`, `'400 14px …'` true. Rule-editor
state is local; "Save rule" saved only into the page's state, nothing was sent. Today in Germany was
09.11.2026 during the run (the frames draw 23.10.2026: sample data). The values menu's frame, its
class rows and "Done" are T027's table (§5.1 ValuesPicker); the saved row T024's; the menus' frame
and items T061's.

| frame | state | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|
| U32 6350:42714 | ready to save (class B issue date ≥ 2 years ago) | editor | box | 1086 × 302 at 177 (16 + 1 + 160) | 177, 1086 × 302 | match |
| U32 6350:42716 | ready to save | check row | pickers, widths | Driving licence 184, Licence classes 164, "Licence class B – Issue date" 253, "≥ is at least" 158, number 64, gap 8 | 184.5, 164.9, 254.1, 158.1, 64 × 40, 8px | match (text rendering; F5 part picker) |
| U32 6350:42720, 6350:42722 | ready to save | value, suffix | box, text | "Rules/Number field" 64 × 40, 0 16, 1 `#e1e6f0`, 8, "2" 16/24; "years ago" 16/24 ink, 8 after, no unit picker | 64 × 40, 16px, 1px rgb(225, 230, 240), 8px, "2"; "years ago" 16px/24px rgb(11, 18, 32) 8 after; no unit picker | match (F34: whole years as fixed text; 002-S3.15) |
| U32 6350:42354 | years ago, frame 1.11 | hints | presence | no notes drawn although the condition is complete | the counting and missing notes show next to every date condition | FR-039 (002-S3.19, 002-S3.20; U32 #19 PARTIAL; 1.12 draws them for the same condition) |
| U32 6350:42723 | ready to save | hints | box, gap | 1036 × 52 at 25, 113; 4 apart | 202, 565 (452 + 113), 1036 × 52; 4px | match |
| U32 6350:42724 | ready to save | counting note | text, look | "Counted from the date class B was first issued. Today (23.10.2026), that means on or before 23.10.2024." body/small `#4a5468`, icon-info-small 20, 8 | "Counted from the date class B was first issued. Today (09.11.2026), that means on or before 09.11.2024." 400 14px/24px rgb(74, 84, 104), info icon 20 at y + 2, 8px | match (cosmetic 3, cosmetic 9; was "Counted from the day the citizen shares. Today (9 Nov 2026) this means: …") |
| U32 6350:42726 | ready to save | missing note | text | "If class B is missing or can’t be read, the rule isn’t met. Konnekt reports it as “couldn’t be checked”." | the same, one note (was "If the issue date of class B is missing … reported as couldn’t be checked." plus "If class B is missing, the rule isn’t met.") | match (C1, cosmetic 9) |
| U32 6350:42727 | ready to save | message | text | "You need to have held a class B driving licence for at least 2 years." | the same (T009's proposal) | match (C3) |
| U32 6350:42728 | ready to save | "Save rule" | state | enabled | enabled (`aria-disabled="false"`) | match |
| — | class B issue date, no years yet | notes | text | not drawn | "Counted from the date class B was first issued." and the missing note (no example until the value is complete) | baseline (002-S3.19) |
| — | class B expiry date ≥ 1 year from now | notes | text | not drawn | "Counted from the day the citizen shares their data. Today (09.11.2026), that means it expires on or after 09.11.2027." and the class's missing note | cosmetic 9 (the class wording drawn for the issue date only; the expiry wording U53's) |
| U32 6350:42833 | both saved | rule row | statement | "Driving licence · Licence class B – Issue date ≥ is at least [2 years ago]", no notes | the same, no notes (T024's row) | match |
| U32 6350:42833 | both saved | toast | text | "Rule 02 saved." | "Rule 02 saved." (T056's change) | match |
| U30 6348:40754 (T061 carry) | age ≥ 21 | counting note | text | "Counted from the day the citizen shares their data. Today (23.10.2026), that means born on or before 23.10.2005." | "Counted from the day the citizen shares their data. Today (09.11.2026), that means born on or before 09.11.2005." | match (cosmetic 3, cosmetic 9) |
| U30 6348:40756 (T061 carry) | age ≥ 21 | missing note | text | "If the date of birth is missing or can’t be read, the rule isn’t met. Konnekt reports it as “couldn’t be checked”." | the same | match (C1) |
| U30 6348:40753 | age ≥ 21 | notes | order, box | counting, boundary, missing; 4 apart | the same; 1036 × 80 (3 × 24 + 2 × 4) | match (F59's "Citizens who turn 21 that day count." between) |
| U09 6986:50244 #26 | age = 18 | born-between note | text | "= means born between two dates" (the table) | "… Today (09.11.2026), that means born between 10.11.2007 and 09.11.2008." | match |
| U53 6324:15672 | expiry date ≥ 6 months from now | counting note | text | "Counted from the day the citizen shares their data. Today (23.10.2026), that means it expires on or after 23.04.2027." | "… Today (09.11.2026), that means it expires on or after 09.05.2027." | match (read from U53.md as text; U53's frames are T063's) |
| U53 6324:15673 | expiry date, any check | missing note | text | "If the expiry date is missing or can’t be read, the rule isn’t met. Konnekt reports it as “couldn’t be checked”." | the same | match (C1) |
| — | fixed date (expiry date is before …) | notes | presence | not drawn | the missing note only, no counting note | baseline (002-S3.19: counted from the day of sharing only for time-ago / from-now) |
| U31 6350:42013, U53 6324:15429 | date, no check | hint | text | "Check the time since or until this date, or compare it with a fixed date." | the same, on the Date of birth too (was "Check an age, the time from now, or compare the date with a fixed date.") | F34 (CLAR 2026-11-07 #25) |
| U31 6985:50041 | Date of birth, check menu | sections | headings, checks | (U29/U30 draw "Age" / "Date of birth" with fixed dates and "at most") | "Time ago" (is at least, is less than, is exactly), "Time from now" (is at least, is less than); no "Fixed date"; 300 × 240 | F34 (CLAR #25: the Date of birth's fixed date deferred; cosmetic 9 "Fixed date" on other dates only; was "Age", "Time from now", "Date of birth") |
| U31 6985:50041 | other dates, check menu | sections | headings | "Time ago", "Time from now", "Fixed date" | the same, "is before", "is after", "is" under "Fixed date" | match (F34: no "on", "at most", "Time passed / Time left") |
| — | Date of birth, "from now" | check | behaviour | not drawn | kept (002-S3.14): "is at least 21 years from now", unit picker, "born on or after …" | F34 (kept) |
| U33 6357:42622 | text data, check menu open | menu | box, place | 240 × 184 at the check picker's left, 8 below; padding 8, gap 2 | 240 × 184 at 519.4 (picker 519.4), 557 (picker bottom 549 + 8); 8px, 2px | match (was 300: `MENU_WIDTHS.textCheck`) |
| U33 6357:42842 ff. | text data, check menu open | items | box, text | 222 × 40, padding 8, body/small 14/24 ink; "is equal to", "is not equal to", "contains", "doesn’t contain"; no symbols, no search | 222 × 40, 8px, 14px; the same four, no chips, no search | match (002-S3.29; no "starts with": F34, 002-S3.30) |
| U33 6357:42631 | text data, no check | hints, message | presence | no hint, no message area | the 24 px spacer and the message placeholder | T061 (UNCERTAIN 4 there; FR-039's placeholder; U33 #15 PARTIAL) |
| U33 6357:42892 | text check complete | check row | value field | "Rules/Number field" 140 × 40 at 457, 0 16, 1 `#e1e6f0`, 8; "Stuttgart" 16/24 | 140 × 40 at 455.8 (pickers' fractional widths), 16px, 1px rgb(225, 230, 240), 8px, 16px/24px; grows with the text (Firefox and Chromium support `field-sizing`; 349 wide with a 44-character text), never wider than the row | match (was `min-w-96`) |
| U33 6985:50760 | text check complete | "Match letter case" | box, label, place | "Data/Check item": box 20, 1 `#6b7488`, radius 4, white; label body/small 14/24 ink; gap 8; 8 after the field, 137 wide | box 20 × 20, 1px rgb(107, 116, 136), 4px, white, at 805.8 (field end 797.8 + 8); label 400 14px/24px ink at 833.8 (box + 28); `kern-form-check` 137.3 × 32, centred in the 40 row | match (T016's `Checkbox`; the frame's 40 is the row's height) |
| U33 6357:42901 | text check complete | hint | text | "Spaces at the start or end don’t matter." | the same | match (002-S3.30) |
| U33 6357:42903 | text check complete | message | text | "You need to live in Stuttgart." | the same; "is not equal to" "You must not live in Stuttgart.", "contains" "Your city or town must contain "Stuttgart"." | match (C3; the straight quotes are the rules package's: T009 note) |
| U33 6357:42890 | text check complete | editor | height | 274 | 274 | match |
| — | text, case on, check changed | behaviour | — | not drawn | the text and "Match letter case" stay when the check changes (is equal to → contains …) | baseline (`changeOperator`) |
| U32 6357:43363, U48 6191:42191 | values chosen | values field | look | U32: "B, BE" as text; U48: "Rules/Multi-select field" with "Rules/Value chip"s "B", "BE" | chips "B" (26.6 × 30), "BE" (34 × 30), 600 14/24, 4 apart | Decision 1 (U48's component, 002-S3.39) |
| U48 6191:42209 | values menu open | search | placeholder | "Search options" | "Search classes" on the licence classes (U32 6358:61888 draws "Search classes"), "Search options" on other value sets | Decision 2 (002-S3.37) |
| U48 6191:42209 | values menu open | footer | text | "Choose at least one option." under a divider | "Choose at least one option." under a divider, above "Done" | match (cosmetic 9; was "Select at least one option.") |
| U32 6357:43417 | values menu open | "Done" | presence, behaviour | secondary, right | T027's: closes, keeps the choice, focus back on the field | match (FR-039) |
| U32 6357:43117 | values chosen | hint | text | "Met if the licence has at least one of the chosen classes." | the same | match (002-S3.36) |
| U32 6972:50180, U48 6191:42087 | values chosen | message | text | "You need a class B or BE licence." | the same | match (C3) |
| U48 6191:42088 | values chosen | "Save rule" | state | enabled | enabled | match |
| U32 6357:43122 | values menu open | "Save rule" | state | looks disabled (under the menu) | enabled once the rule is complete | baseline (002-S3.10; U32 #40 PARTIAL ?) |
| U48 6191:42385 | values emptied, menu closed | values field | look | "Choose options" muted, 1 red border, chevron | "Choose options", 1px rgb(196, 39, 28), chevron | match |
| U48 6194:42246 | values emptied | field error | text | "Choose at least one option." with the danger icon under the check row | "Choose at least one option." (`FieldError`, `kern-error`) | match for the text (cosmetic 9); the error's layout is T063's (`FieldError.tsx`) |
| U48 6191:42281 | values emptied | message | text | "You need a licence in one of the required classes." | the placeholder "Suggested once you choose a check. You can edit it." (the proposal needs a complete condition) | T063 (U48 #24 PARTIAL ?; the rule logic table's messages, U09) |
| U48 6191:42259 | values emptied | licence hint | presence | not drawn | "Met if the licence has at least one of the chosen classes." | baseline (002-S3.36; U48 "Missing here") |
| — | 320 × 640 | text check menu, field | placement | not drawn | menu 240 × 184 at the picker's left (58, 180), field 140; no horizontal scroll (scrollWidth 305 = 320 − Chromium's scrollbar) | FR-010 (R10) |

#### Decisions (T062)

1. **Chips, not "B, BE" text** (T027's carried point, U32 #34 PARTIAL): the field keeps the chosen
   values as "Rules/Value chip"s, as the component "Rules/Multi-select field" (U48 6191:42191) and
   002-S3.39 ("Chips in the field … keep the codes only") draw it; U32 6357:43363 draws the codes as
   comma text in a plain picker. No change to `components/ValuesPicker/`.
2. **"Search classes" on the licence classes' values menu** (U48 6191:42209 draws "Search options"):
   kept, as U32 6358:61888 (the later frame with W19's code and description rows) and 002-S3.37
   say; "Search options" stays on the other value sets (002-S3.40). Cosmetic 9 lists U48 #14's
   "Search options" as wording to port; the two frames disagree, so the baseline's wording stays
   (UNCERTAIN 2).
3. **"Choose at least one option."** for the values menu's footer and the values field's error
   (U48 #16, #23, cosmetic 9: "None of these rows is flagged copy:server or copy:rules"; the text is
   the editor's own, `RULE_EDITOR_COPY.selectAtLeastOne`).
4. **Date notes** in the design's wording (cosmetic 3, cosmetic 9, C1): "Counted from the day the
   citizen shares their data." / on a licence class's issue date "Counted from the date class B was
   first issued.", then "Today (dd.mm.yyyy), that means <boundary>." with "born …" on the Date of
   birth, "it expires …" on an expiry date (keys `date_of_expiry`, `expiry_date`), nothing before
   the boundary on other dates; one missing note per condition, "If the <date> is missing …" or, on
   a class's dates, "If class B is missing …". The boundary is formatted in the editor
   (`boundaryWords`, `dottedDate` in `utils.ts`); `rules/src/dates.ts`' `boundaryPhrase` and
   `formatDate` ("23 Oct 2005") are untouched and no longer used by the editor.
5. **The Date of birth's check menu**: "Time ago" and "Time from now", no fixed-date section (F34,
   CLAR 2026-11-07 #25 "the editor offers none", cosmetic 9 "a 'Fixed date' section (other dates
   only)"). A saved Date-of-birth rule with a fixed-date check (an earlier one, or an agent's) still
   shows its check in the picker; only the menu no longer offers it (UNCERTAIN 1).
6. **Text check menu 240 wide** (U33 6357:42841): `MENU_WIDTHS.textCheck`; `MenuWidth` gains 240
   (`types.ts`) and the check picker picks it for text data (`index.tsx`). The other check menus stay
   300 (U31 6985:50041); the number and value-set check menus are not drawn in T062's frames (T063
   checks U53).

#### utils.test.ts (changed for F34)

- "gives every date, the Date of birth too, F34’s hint" (was "gives the Date of birth F3’s hint and
  every other date U30’s"): the Date of birth expects F34's hint.
- "offers the Date of birth "Time ago" and "Time from now", other dates also "Fixed date"" (was
  "keeps the check menu’s "Date of birth" section of fixed dates under "Age""): F34, CLAR
  2026-11-07 #25.
- The other tests are unchanged; "keeps "date of birth" in the missing-value note" passes with the
  new wording.

#### UNCERTAIN (T062)

1. **The Date of birth's fixed-date checks removed from the menu** (Decision 5). Touches the task's
   core behaviour: spec 002's own clarification (002 spec.md, Session 2026-10-26 (bug fixes): "The check menu's
   'Date of birth' section, the fixed-date checks under 'Age', keeps its name") gave the Date of birth
   fixed-date checks, and the app offered them until now; 008's CLAR 2026-11-07 #25 was asked as if
   the baseline had none ("with the fixed-date check deferred?") and answers "defer a fixed date for
   the Date of birth … the editor offers none". Built as CLAR #25 and F34 say; reverting is one `if`
   in `checkSections` and the test. The coordinator may want to confirm with the user.
2. **"Search classes" vs U48's "Search options"** (Decision 2). Not core.
3. **The counting note's verb by field** ("born", "it expires", none) and the class wording only
   on the issue date: the frames draw the Date of birth (U30), an expiry date (U53) and a class's
   issue date (U32); a class's expiry date and the other dates (issue date, portrait capture date)
   are not drawn and take the general sentence without a verb. Not core.
4. **U32 1.11 draws no notes for a complete condition** (6350:42450): built with the notes, as 1.12
   and FR-039 show them. Not core.

Coordinator: UNCERTAIN 2–4 accepted; UNCERTAIN 1 (the Date of birth's fixed-date checks) taken to the user as Implement Q3.

### U34, U35 (6324:39410) Groups (S9) — T057, 2026-11-08

Checked in Chromium (playwright-chrome MCP) at 1455 × 947 (body 1440), with a scroll for the connector
menu, and at 320 × 640. Signed in as `designer`. I used T057's own drafts:

- "T057 groups": Rule 01 ≥ 21 years, Rule 02 Stuttgart, and Group 01 (OR). Group 01 holds Rule 03
  (classes C, D) and Sub-group 02 (AND), which holds Rule 04 (B, BE) and Rule 05 (expiry ≥ 6 months from
  now). This is U34 2.1's shape. Rule 02 differs from the frame's sample so that no finding shifts the
  list.
- "T057 group message": the same, with U35 2.6's group message on Group 01.
- "T057 variant": the same, plus Ambulance based on Standard with its top level switched to OR.
- "T057 flat": four rules.

Figma y values are page values (frame + 64 for the header area); the card is at 281. Font check:
Fira Sans 600/400 render as in T056's table. The group frame's own parts (fill, border, header, subtitle
type, message card) are T025's §5.1 rows. These rows cover the frame as the step uses it.

| frame | state | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|
| U34 6094:6188 | a group, a sub-group | rules card | box | 160, 281, 1120 × 1058 | 160, 281, 1120 × 1058 | match |
| U34 6094:6469, 6094:6511, 6094:6521, 6094:6564 | a group | top level before the group | y, height | Rule 01 282 h110, AND 392 h44, Rule 02 436 h102, AND 538 h44 | `li` 282 h110, 392 h146 (44 + 102), connector 538 h44 | match |
| U34 6094:6574 | a group | group wrap (top level) | box, padding | 161, 582, 1118 × 690; 8 16 | 161, 582, 1118 × 690; 8px 16px | match (T056 carry: 16 at the sides, 8 above and below; no `FIRST_RULE_SPACING` on a group) |
| U34 6094:6411 | a group | Group 01 frame | box, pt, border, fill, corners | 177, 590, 1086 × 674; 8; 3 `#1d56f0`; `#f2f5fb`; square | 177, 590, 1086 × 674; 8px; 3px rgb(29, 86, 240); rgb(242, 245, 251); 0 | match |
| U34 6094:6412 | a group | header | box, padding, divider | 180, 598, 1083 × 57; 0 16 8 24; 1 `#e1e6f0` | 180, 598, 1083 × 57; 0 16px 8px 24px; 1px rgb(225, 230, 240) | match |
| U34 6082:3516, 6082:3522 | a group | name, subtitle | text, font | "Group 01" title/default 600 18/24 `#1d56f0`; "At least one rule must be met" 400 14/24 `#4a5468` | "Group 01" 600 18px/24px rgb(29, 86, 240); "At least one rule must be met" 400 14px/24px rgb(74, 84, 104) | match (FR-051 (32)) |
| U34 6094:6357, 6094:6400 | a group | Rule 03, OR connector | y, height | 655 h102; 757 h46 (OR pill 30) | 655 h102; 757 h46, pill 204, 765, 66.3 × 30 | match |
| U34 6094:6410, 6094:6318 | a sub-group | sub-group wrap, frame | box | wrap 180, 803, 1083 × 395; frame 196, 811, 1051 × 379, white, radius 8, 3 `#1d56f0` | wrap 180, 803, 1083 × 395 (8px 16px); frame 196, 811, 1051 × 379, white, 8px, 3px rgb(29, 86, 240) | match |
| U34 I6094:6320;6082:3516 | a sub-group | name, subtitle | text, font | title/small 600 16/24; "All rules must be met" | "Sub-group 02" 600 16px/24px rgb(29, 86, 240); "All rules must be met" | match (the name is sample data; F31: a sub-group keeps its own name) |
| U34 6094:6223, 6094:6266, 6094:6276 | a sub-group | Rule 04, AND, Rule 05 | y, height | 876 h102, 978 h44, 1022 h102 | 876 h102, 978 h44 (`li` 146), 1022 | match |
| U34 6094:6336, 6094:6429, 6094:6575 | a group | the three "Add" frames | box, padding | sub-group 1124 h66, group 1198 h66, top 1272 h66; 8 24 16; button white, dashed 1 `#1d56f0`, radius 8, 8 16, gap 4 | 199/180/161 at 1124/1198/1272, h66, 8px 24px 16px; buttons oklch(1 0 0), 1px dashed rgb(29, 86, 240), 8px, 8px 16px, gap 4px | match (002-FR-008: rules are added to groups; see UNCERTAIN 1 on F9) |
| U34 6094:6127 | a group | whole frame | look (screenshot) | 2.1 | the same order, spacing and colours (`shots/t057-groups-full.png`) | match |
| U34 6113:28651 | a group | group frame in 2.3 | structure | as 2.1 (first rule 102) | as 2.1 | match (the first rule's 110 is T056's; Rule 03's open menu: T058) |
| U34 6329:19219 | after switching Group 01 to OR | note | place, box | right under the header, x 3, 1083 × 40 (180, 655) | 180, 655, 1083 × 40, directly under the header (598 + 57); first member moves to 695 (Figma 105 → 695) | match |
| U34 6329:19219 | after switching | note | look | `feedback-info-background` `#e0f2fe`, radius 8, 8 16, gap 8, icon-info-small 20 `#0284c7`, body/small 400 14/24 `#0b1220` | rgb(224, 242, 254), 8px, 8px 16px, gap 8px, `kern-icon--info` 20 × 20 at 196 rgb(2, 115, 174), 14px/24px rgb(11, 18, 32) | match (§1.5: `feedback-info` AA value) |
| U34 I6329:19219;6082:3565 | after switching | note | text | "Group 01 now needs only one rule to be true." | "Group 01 now needs only one rule to be true." in a `role="status"` region | match (FR-051 (32)) |
| — | after switching to AND | note | text | not drawn | "Group 01 now needs all its rules to be true." | match (baseline `switchedToAnd`; T058 carries the "must be met" question for these two texts) |
| — | top level switched | note | place, text | not drawn ("Rules/Note" in a group only) | "Standard now needs only one rule to be true." above the list, wrapper 16 16 8, the note 1086 × 40 | match (no frame; the top level's note sits in the card clear of its edges) |
| U34 6094:7052 | connector menu open | menu | options, footer | "AND / All rules must be met", "OR / At least one rule must be met" (ticked), "Applies to every rule in Group 01" | the same; the footer is the menu's `aria-describedby`; the pill "OR, switch Group 01 to AND or OR", `aria-expanded` | match (FR-038; T023's §5.1) |
| U34 6094:7052 | connector menu open | menu | place | 204, 862, 300 × 189 (left edge on the pill; 35 below the pill as drawn) | 204, 843, 300 × 189: left edge on the pill, 8 below it; opens above the pill (608–797) where the footer leaves no room | match (T023 / §3 "Menu": 8 px; R10 placement) |
| U34 6094:6597 | connector menu open, keyboard | chosen option | look | `layout-background-hued`, tick | after a key press: the select-option focus fill (dark) on the chosen option | match (T023's keyboard-focus state; the drawn tint shows on pointer use) |
| U34 6094:6511 (W12) | Ambulance, top level switched | first connector | mark | not drawn | "OR" pill and "Changed here" (`#8a22b5` on white) at 1151, 457, after the line, on the first top-level connector only | W12 (T023's `mark`) |
| — | Ambulance, Group 01 switched | group header | mark | not drawn | "Changed here" before ⋯ (T025's §5.1 U58 rows) | W12 |
| U34 6113:29056 | delete dialog | "Delete Group 01?" | box, title, buttons | 480 × 256; title/large 24/32; "Cancel" secondary, the danger primary, × | 480 × 256 at 480, 345.5; "Delete Group 01?"; "Cancel" `kern-btn--secondary`, "Delete group" `kern-btn--primary kern-btn--danger`, "Close" × | match (T035's `ConfirmDialog`) |
| U34 6113:29056 | delete dialog | body | text | "Citizens won’t be checked for licence classes C or D any more." (rule) | "Group 01 and the rules and sub-group in it will be deleted. You can undo this right after." | F70 (the baseline's body, no effect sentence) |
| U34 6113:29018 (6113:29055) | delete dialog | scrim | colour, click | scrim over the page | rgb(11, 18, 32) at 0.72; a click on it closes the dialog and keeps the group | match (T052's decision: undoable until saved, so the scrim stays on) |
| — | Standard with Ambulance, delete Group 01 | body | text | not drawn | "This group and the rules in it will be removed from Standard and from the variants that follow them. Ambulance changed Rule 03 and keeps its own version. You can undo this right after." | W12 (names the variant) |
| — | Standard with Ambulance, delete Sub-group 02 | body | text | not drawn | "This sub-group and the rules in it will be removed from Standard and from the variants that follow them. Group 01 is left with one rule, so it’s ungrouped in Standard and its variants. You can undo this right after." | W12, F31 |
| — | after deleting the group | toast, focus | text | not drawn for groups | "Group 01 in Standard deleted." with "Undo"; focus on the neighbouring item | baseline (T058 owns the deleted toasts) |
| U35 6324:39410 | group message | card | box | under the header, 180, 655, 1083 × 90 | 180, 655, 1083 × 90 | match (T025's §5.1 rows for its parts) |
| U35 6324:39055, 6324:39062, 6324:39065 | group message | members' message line | text | none drawn | "Message for citizens: Not shown while this rule is in Group 01. Citizens see the group message instead." on Rule 03, and on Rule 04 and Rule 05 in Sub-group 02 | F32 (FR-037) |
| U35 6324:39032 | group message | member rows | height | 72 (no message line) | 102 (with F32's line) | F32 |
| U35 6965:49996 | group message, Rule 04 edited | editor | message | the rule’s own message stays editable | the editor shows "You need a class B or BE licence." (the data unchanged) | match (FR-037: "keeping the message in the data"; the editor's hint is T063's) |
| U35 6965:50849 | after Ungroup (group with message) | toast | text | "Ungrouped. Rules 03 to 05 use their own messages again." with "Undo" | "Ungrouped. Rule 03, Rule 04 and Rule 05 use their own messages again." with "Undo" | cosmetic 8 (the list as `joinNames` writes it; UNCERTAIN 2) |
| U35 6965:50045 | after Ungroup | list | members, names | Rule 01–03 at the top level, the former sub-group renamed "Group 01" | Rule 03 at the top level, "Sub-group 02" keeps its name and moves up; the members' own messages are back | F31 |
| — | after Ungroup | focus | — | not drawn | on Rule 03 (the group's first member) | baseline |
| — | after Ungroup (group without message) | toast | text | not drawn | "Group 02 in Standard ungrouped." with "Undo" | baseline (UNCERTAIN 2) |
| U36 6344:53623 | after grouping | toast | text | "Rule 02 and Rule 03 are now in Group 01." | "Rule 03 and Rule 04 are now in Group 02." with "Undo" | cosmetic 8 (was "… in Standard are now Group 01.") |
| — | new rule in a group | editor wrap | padding | not drawn | 16px 16px 24px, 1083 wide in Group 01's frame; the focus on "Choose document" | match (T056 UNCERTAIN 4 stands) |
| U34 6094:6511 | any | connector line | colour (Chromium) | `decorative-brand` `#4f8cff` | rgb(79, 140, 255) on every connector, group and top level | match (Firefox, T062's note: not checked here, the Firefox browser was reserved) |
| — | 320 × 640 | groups, message card | horizontal scroll | — | none (scrollWidth 305 of 320); Group 01 at 33, 239 wide; the sub-group at 52, 204 wide; the message card wraps | match (FR-010) |

#### Decision (T057)

The rule, group and variant delete dialogs in `RulesDialogs` keep `ConfirmDialog`'s default scrim: a click
on it answers "Cancel". This follows T052's reading of FR-052a: "a dialog that deletes" is one whose action
can't be taken back on the page. These deletes stay undoable (the toast's "Undo", and nothing is stored
until the flow is saved). Checked on "Delete Group 01?".

#### UNCERTAIN (T057)

1. **F9, the "+ Add rule" inside groups: kept (behaviour).** The report's F9 says "One '+ Add rule' per
   variant… Groups form only by selecting items", and deferred.md lists it as needing "an insert-into-group
   action in the rules package". But the baseline already has that action: spec 002 FR-008 says "…and to add
   rules to both", and the app has always added a new rule at the end of a group (`onAddRule(group.id)`).
   U34 #19 draws it too. Removing it would change the baseline's behaviour, so the group and sub-group
   "Add rule" stay. The coordinator should correct F9 and deferred.md's F9 row. Not core: grouping and
   dissolving are unaffected.
2. **Toast wording (copy).**
   - "Rules 03 to 05" is written as `joinNames`' list, for example "Rule 03, Rule 04 and Rule 05", because a
     range only reads for consecutive default names.
   - One freed rule gets "Ungrouped. Rule 03 uses its own message again." No frame draws this.
   - A group without its own message keeps the baseline's "Group 01 in Standard ungrouped." No frame draws
     this either.
   - The ungroup toast mentions own messages only for the rules that really get theirs back. That leaves
     out the rules of a sub-group with its own message, and every rule when the group around it has one.

   Not core: the toast's text only.
3. **F32's line keeps the row's label.** No frame draws a member's line: U35 2.6 draws none, and F32 decides
   that the line reads the text. The row shows it in the message's place, after the muted "Message for
   citizens:", in the message's style. Rules in a sub-group name the outer group when that group has its
   own message, because evaluation reports the outermost group's message. The sub-group's own message card
   still shows in that case. Not core (layout and copy). The F32 substitution itself is core and follows F32.

Coordinator: all three accepted; F9's `deferred.md` row corrected (the "+ Add rule" inside a group with members is the baseline; only adding into an empty group stays deferred).

### U49, U53, U09 Rule editor part 3 (S10) — T063, 2026-11-08

Checked in Firefox (playwright-firefox) at 1440 × 947 (`body` 1440: the overlay scrollbar takes no
gutter) and 320 × 640, signed in as `designer`, on the own draft "T063 rule editor" (deleted).
Fonts: `document.fonts.check('600 14px "Fira Sans"')`, `'400 16px …'`, `'400 14px …'` true. Editor
state is local; nothing was sent. Figma read: the five U53 and three U49 rules cards
(`get_design_context`), the four U53 menus (`get_metadata` 6324:15613, 6616:39880, 6616:39897,
6616:39908); U09 as text from `figma-audit/units/U09.md`. Today in Germany was 09.11.2026 (the
frames' 23.10.2026 is sample data). Screens: `phase7/T063/*.png`. Rows already in T061's / T062's
tables (editor frame, pickers, menus, notes, message field, "Discard rule") are not repeated.

| frame | state | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|
| U49 6196:10249 | empty field | field error | anatomy | "Rules/Field error" 6194:42227: icon-emergency_home-small 20, gap 4, body/small 14/24 `#c4271c` | `kern-icon--danger kern-icon--small` 20 × 20 rgb(196, 39, 28), gap 4px, 14px/24px 400 rgb(196, 39, 28) | match (the old asset `#C31C13` replaced) |
| U49 6196:10243 | empty field | check row + error | gap, place | error 8 under the row, message 16 under the error, no hints row | row 509–549, error 557 (8), message box 597 (16 under the error 557+24) | match (the empty 24 px hints row now hidden under an error) |
| U49 6196:10246 | empty field | data picker | border | 1 `#c4271c` | rgb(196, 39, 28), `aria-invalid="true"`, described by the error | match (FR-039) |
| U49 6196:10249 | empty field | error | text | "Choose the data to check." | "Rule 02 in Standard: choose the data to check." (`role="alert"`) | FR-006 (the server's words; U49 #8: no C item rewrites them) |
| U49 6196:10247 | empty field | check picker (locked) | look | hued `#f2f5fb` fill, `#e1e6f0` border, muted text | white, 40 % (`disabled:opacity`) | UNCERTAIN (T061 UNCERTAIN 1; `Picker.tsx` is not T063's file; U53 6324:17641 draws it enabled-looking) |
| U49 6196:10254, 6196:10405 | incomplete | message | content | a filled message on an incomplete condition | the placeholder "Message for citizens: Suggested once you choose a check. You can edit it." | W19, FR-039 (C3: the proposal needs a complete condition) |
| U49 6196:10255 | incomplete | "Save rule" | look | button-primary-small at 40 % | `ExplainedButton`, opacity 0.4, `aria-disabled="true"`, no `disabled` | match (W21) |
| — | incomplete, hover / focus | "Save rule" | explanation | not drawn (U49 #12, FR-052b) | the tooltip "Rule 02 in Standard: choose the data to check." (the rule's current problem), 280 wide, above, right-aligned (958–1238); opens on keyboard focus; closes when the focus leaves | W21 (Decision 1) |
| — | incomplete, click / Enter / Space | "Save rule" | activation | not drawn | doesn't save; flags the missing part, shows the problem under the check row and moves the focus there (`_r_v_-data`); after Enter / Space the tooltip is closed | 002-S3.10, U25 (Decision 1, UNCERTAIN core) |
| U49 6196:10398 | number 0 | years field | border, width | 1 `#c4271c`, 64 | rgb(196, 39, 28), 64px, `aria-invalid`, described by the error | match |
| U49 6196:10533 | number 0 | error | text | "Enter a number greater than 0." | "Enter a whole number greater than 0." (years and months alike) | F58, C5 |
| U49 6196:10399, 6196:10400 | age | unit | content | a "years" picker, then "old" | the fixed text "years old" | CLAR 2026-11-07 #25 (a unit picker on age checks is a Figma error) |
| U49 6196:10533 | number 0 | "Save rule" | explanation | — | "Rule 03 in Standard: enter a number of years of at least 1." / "… months of at least 1." | W21 (the server's words) |
| U49 6196:10653, 6196:10710 | duplicate name | rename field, error | where | a rename field in the editor's name row | the editor has no rename (T061 UNCERTAIN 2); the list's inline rename (`ItemName`, T058) shows "There’s already a rule called "Rule 02" in Standard.", `aria-invalid`, described | F58, C5 (text); look: T058 |
| U49 6196:10710 | duplicate name | error | quotes | “Rule 02” (typographic) | "Rule 02" (straight, `rules/src/constants.ts` `nameTaken`) | C5 (copy:server, out of T063's files; note for T058 / pass I) |
| U53 6324:15424 | expiry date, check menu open | check picker | look | 2 `#1d56f0`, label action blue, chevron up | rgb(29, 86, 240) | match (T061's open state) |
| U53 6324:15613 | expiry date | date check menu | width, sections | 300; "Time ago" ≥ < =, "Time from now" ≥ <, "Fixed date" < > = with dividers | 300 at the picker's left (538), 8 under it; the same sections, words and symbols | match (the height follows R10: T061 UNCERTAIN 5) |
| U53 6324:15429 | expiry date, no check | hint | text | "Check the time since or until this date, or compare it with a fixed date." | the same | match (F34) |
| U53 6324:15667–15670 | ≥ 6 months from now | check row | content | "≥ is at least", 6, "months", "from now" | the same | match |
| U53 6324:15672, 6324:15673 | ≥ 6 months from now | notes | text, place | counting note "… that means it expires on or after 23.04.2027." and the missing note, 16 under the row, 4 apart | "… Today (09.11.2026), that means it expires on or after 09.05.2027." and the missing note; 565 (16 under 549), 593 (4 under 589) | match |
| U53 6324:15675 | complete | message | text | "You need a driving licence that’s valid for at least 6 more months." | the same | match (C3) |
| U53 6324:15676 | complete | "Save rule" | state | enabled | enabled (no `aria-disabled`, opacity 1, no tooltip) | match |
| U53 6616:39880 | Height (cm) | number check menu | size, items | 300 × 192; is greater than >, is less than <, is equal to =, is not equal to ≠ | 300 × 192, the same | match |
| — | Height (cm) > 150 | message | text (U09 #32) | (COPY-BRIEF) | "Your height (cm) must be greater than 150." | match (C3, rules package) |
| U53 6616:39897 | Nationality | list check menu | size, items | 300 × 100; includes one of, includes none of, no symbols | 300 × 100, the same | match |
| U53 6324:17370 | Nationality | hint | text | "A citizen can have more than one nationality. The rule checks all of them." | the same | match (cosmetic 9; was F30's longer sentence) |
| U53 6324:17370 | Nationality, check menu open | hint | when | shown before a check is chosen | shown once a check is chosen | baseline (002-S3.35; `hintsOf` unchanged) |
| — | Nationality includes one of Germany | message | text | (COPY-BRIEF) | "You need the nationality of Germany." | match (C3) |
| — | Sex (Driving licence) includes none of | message | text | (COPY-BRIEF) | "Your sex must not be Not known." | match (C3, rules package; no hint, as U09 #18) |
| U53 6616:39908 | Place of birth | parts menu | size, items, search | 300 × 142; Country, Region, City or town; no search | 300 × 142, the same, no search | match |
| U53 6324:17646 | Place of birth, no part | hint | text | "Place of birth has parts. Choose the part to check." | the same | match (FR-051h) |
| U53 6324:17641 | Place of birth, no part | check picker | state | drawn enabled-looking | disabled until the part is chosen | baseline (002-S3.2, W19) |
| U09 #39 | Place of birth – Country / City or town | checks, messages | list / text checks | Country: list checks; City or town: text checks | includes one of / none of (300 × 100); is equal to … doesn’t contain (240 × 184, `textCheck`); "You need to be born in Germany.", "You need to be born in Stuttgart." with "Spaces at the start or end don’t matter." | match |
| U09 #12 | Driving licence Place of birth | kind | text, no parts | text checks, "Match letter case", "Your place of birth must contain "Stuttgart"." | match (the straight quotes: C3, T062's note) |
| U09 #33, U53 (FR-039c) | Licence classes, no part | part picker, hint | — | "Choose part" (search "Search classes"); "Licence classes has parts. Choose the part to check." | "Choose part", the parts menu 300 wide with search, Licence classes then every class's Issue / Expiry date; the hint | match (W19, F5) |
| U09 #35 (FR-039e) | Licence classes, includes one of | values menu | options | code and description, "B Cars up to 3.5 t" | "B · Cars up to 3.5 t" rows (T027's table) | match (W19) |
| U48 7.2 6191:42259 | values left empty | error, message | — | error under the row; the message "You need a licence in one of the required classes." | "Choose at least one option." under the row; the placeholder; the licence hint still shows | W19, FR-039 (the placeholder until complete); hint: baseline (T062's note) |
| — | Licence class B chosen | message | text | (COPY-BRIEF) | "You need a class B licence." | match (C3, rules package) |
| U09 #22, #28 | Date of birth / other dates | check menus | sections | DoB: Age ≥ < =, fixed date; dates: three sections | DoB: "Time ago", "Time from now"; dates: + "Fixed date" | CLAR 2026-11-07 #25 (unchanged: Implement Q3 with the user) |
| U09 #19 | values field | error text | "Select at least one option." | "Choose at least one option." | cosmetic 9 (T062) |
| — | "Need other data? Add it in Documents" with changes | behaviour | asks first (cosmetic 9) | "Save changes to Rule 02?" ("You changed this rule but haven’t saved it yet.", "Discard", "Save changes"); "Save changes" keeps the rule and opens the documents step | match (T047's `leaveEditor({ type: 'documents' })`, unchanged) |
| — | 320 × 640 | error, tooltip | reflow | stays on screen | the error wraps (58–262, 48 high); the tooltip 50–270; scrollWidth 320 | match (FR-010) |

#### Decisions (T063)

1. **"Save rule"'s field-error trigger (T022's open point)**: the spec documents don't settle it.
   W21 / design-notes §3 make the button `aria-disabled`, focusable and "ignoring activation";
   FR-039 and CLAR #27 keep the baseline's inline flags (002-S3.10), whose trigger in the baseline
   is the press (002 design-notes "Errors (3.3.1, 4.1.3)"; U25); U49 draws the error showing with
   "Save rule" disabled but doesn't say what made it show; CLAR #18 drops the refuse-and-focus
   model only for "Test rules". Built: the reading that loses no baseline behaviour. While the rule
   is incomplete "Save rule" is `ExplainedButton` with the rule's problem as its explanation
   (hover, keyboard focus, tap); a press (click, Enter, Space, tap) never saves, but it still does
   what the baseline did: flags the missing part, shows the problem under the check row (announced)
   and moves the focus there. Implementation: `onClickCapture` on the button (passed through
   `ExplainedButton`'s button props; its own click handler only calls `preventDefault()` and opens
   the tooltip, it doesn't stop propagation), and the focus moves after the press through the
   editor's `focusNext` effect, so the tooltip closes. **UNCERTAIN, core.** Alternatives:
   (a) strict W21: a press does nothing; the flags show only for a field left empty (e.g. a menu
   closed without a choice, a value field blurred: U49 8.1's look) and the tooltip says what is
   missing; loses the focus move and the flag on a part never touched (e.g. the message);
   (b) both: (a)'s "left empty" flags plus this press behaviour; adds behaviour the baseline didn't
   have. Reverting to (a) is removing `onClickCapture` in `EditorActions.tsx`.
2. **The explanation's text**: no frame or item gives "Save rule" a text (W21 lists only "Test
   rules"' and the copy buttons'); built with the rule's current problem in the server's words
   (`ruleProblem`, "Rule 02 in Standard: choose a check."), the same sentence the baseline showed on
   a press, so the reason is the same in the tooltip and under the row. Not core (wording).
3. **The nationality hint** in the design's words (cosmetic 9 lists U53 #29 as RULE wording to
   port); it no longer explains "includes none of". Not core.
4. **The empty hints row** (T061 UNCERTAIN 4) is left out while a field error shows, as U49 draws
   ("Check row + error" directly followed by the message, 16 apart); U53 9.5 keeps it without an
   error. Not core.

#### UNCERTAIN (T063)

1. Decision 1, "Save rule" pressed while incomplete still flags and moves the focus. **Core.**
   Alternatives above; the user was named for it in phase 3.
2. The locked picker's look: U49 6196:10247 draws a hued fill with muted text and border
   `#e1e6f0`, which contradicts T061's premise "no frame draws it" (built 40 % white); U53
   6324:17641 draws the locked check picker enabled-looking. Not built: `Picker.tsx` is not
   T063's file. Not core (look only); the change would be `disabled:bg-kern-layout-background-hued`
   + muted text instead of `disabled:opacity-…` in `Picker.tsx`.
3. Decision 2 (the explanation's text). Not core.
4. The nationality hint's timing stays the baseline's (after a check), U53 9.7 shows it with the
   check menu open. Not core.

Coordinator: UNCERTAIN 1 decided by the user as #65 (Implement Q4, A: the baseline's press kept, as built); 2 (the locked picker) fixed by the coordinator, see below; 3, 4 accepted.

| frame | state | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|
| U49 6196:10247 | locked (data, check) | picker | fill, text, border, opacity | `#f2f5fb`, muted, `#e1e6f0`, 100 % | rgb(242, 245, 251), rgb(74, 84, 104), rgb(225, 230, 240), 1 (`Picker.tsx`: `disabled:bg-kern-layout-background-hued`, `text-kern-layout-text-muted`; the kit's 40 % dropped; coordinator, 2026-11-09) | match |

### U54, U55, U56, U35 Menus (S9) — T058, 2026-11-09

How I checked:
- Scripted Chromium (playwright-core 1.48.2, `/usr/bin/chromium`), signed in as `designer`. Sizes: 1455 × 1000 (body 1440), 1455 × 700 (to scroll each ⋯ to the top and the bottom of the window) and 320 × 640.
- Fonts: `document.fonts.check('600 14px "Fira Sans"')` true.
- Own drafts, all deleted at the end:
  - "T058 menus": U55's tree. Rule 01 (age ≥ 21), Rule 02 (expiry ≥ 6 months), then Group 01 (OR), which holds Rule 03 (C, D) and Sub-group 01 (AND). Sub-group 01 holds Rule 04 (B, BE) and Rule 05 (age ≥ 21).
  - "T058 group message": the same tree, with U35 2.6's message on Group 01.
  - "T058 variant": the same tree in three tabs.
    - Standard.
    - Ambulance, based on Standard and unchanged.
    - School transport, based on Standard: Rule 02 changed (12 months), Rule 06 (D1) added. This is U56 10.5.
- Nothing was saved. Every change was local editor state.
- Figma: I read U55's group menu `6522:32424`, U56's sub-group menu `6522:32540` and its linked-rule menu `6522:32644` with `get_design_context`. I took screenshots of `6530:40150`, `6522:32382`, `6522:32038`, `6531:39026`, `6522:32594`, `6113:29132`, `6965:50045`, `6324:39032` and U54's note `6522:33105`. I also read the toast `6113:29469`, and, from T063's carried note, the rename field `6196:10653` and its error `6196:10710`.
  - Every frame I read matches its audit inventory. No frame has changed.
  - I didn't re-read `6522:32498` (U56 10.4): the menu inside it, `6522:32540`, is the node read. I didn't re-read `6965:49996` either: it is the editor, covered by T057's and T063's rows.
- The menu's own geometry (220 wide, 40 px rows, 8 padding, divider, shadow, focus fill, keyboard) is in the §5.1 ActionMenu rows (T021). These rows check what the step puts in it.

| frame | state | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|
| U55 6530:40192 (10.1) | Rule 01 menu, Standard, no variant | entries | order, labels | Edit rule · Duplicate · Group with other rules · — · Delete rule | Edit rule · Rename · Duplicate · Group with other rules · Copy link · — · Delete rule | F29 (Rename, Copy link; no Copy to variant without another variant, FR-036f) |
| U55 6530:40192 | Rule 01 menu | icons, colours | per entry | `icon-edit-small`, `icon-content_copy-small`, "Icon/Group · brackets", `icon-delete-small`; ink `#0b1220`, Delete `#c4271c` | `kern-icon--edit`, `kern-icon--content-copy`, group-brackets.svg (the same path), `kern-icon--delete`; rgb(11, 18, 32), Delete rgb(196, 39, 28); Rename "Icon/Rename", Copy link "Icon/Link" (not drawn here) | match |
| U55 6530:40192 | Rule 01 menu | place | from the ⋯ | below the ⋯, right edges aligned | right edge on the ⋯'s right edge, 8 below (1455 × 1000: ⋯ 348, menu 388) | match |
| U55 6522:32071 (10.2) | Rule 03 in Group 01 (beside Sub-group 01) | entries | — | Edit rule · Duplicate · Group with other rules · Remove from group · — · Delete rule | Edit rule · Rename · Duplicate · Copy link · — · Delete rule | F30 (a sub-group is no neighbour, #61), F7 ("Remove from group" out), F29 |
| — | Rule 02 at the top level | entries | — | (as 10.1) | Edit rule · Rename · Duplicate · Group with other rules · Copy link · — · Delete rule; "Group with other rules" starts select mode with "Select Rule 02" ticked and focused | match (FR-036i; select mode's look is T059's) |
| U55 6531:39068 (10.2b) | Rule 04 in Sub-group 01 | entries | — | Edit rule · Duplicate · Group with other rules · Remove from sub-group · — · Delete rule | Edit rule · Rename · Duplicate · Copy link · — · Delete rule | F30 (no grouping in a sub-group, 002-S2.10), F7, F29 |
| U55 6522:32424 (10.3) | Group 01 menu (holds Sub-group 01) | entries | — | Add message · Duplicate group · Group with other rules · Ungroup · — · Delete group | Rename · Add message · Ungroup · Copy link · — · Delete group | F69 (Rename), F29 (Copy link), F30/CLAR #64 (no grouping on a group), "Duplicate group" not built (no rules-package action; UNCERTAIN 3) |
| U55 6522:32424 | Group 01 menu | icons | Add message, Ungroup | "Icon/Error message · speech bubble" 6529:39060, "Icon/Ungroup · brackets apart" 6529:39057 | message-alert.svg, ungroup-brackets.svg: Figma's assets unchanged (the baseline drew Ungroup with the group brackets) | match |
| U55 6522:32424 | Group 01 menu | labels | wording | "Add message", "Delete group" | "Add message" (was "Add error message"), "Delete group" | match (cosmetic 8) |
| U35 6324:39032 + W22 | group with a message, its menu | entries | — | not drawn (menu closed) | Rename · Add message · Remove message · Ungroup · Copy link · — · Delete group; "Remove message" with `kern-icon--close` (not drawn) | W22 (FR-036h "next to") |
| — | group with a message, "Add message" | message field | value, focus | not drawn | the message is kept (100 characters), the field has the focus, caret at the end (100) | match (CLAR #54 reading, coordinator) |
| — | group without a message, "Add message" | message field | — | U35 6324:39410 | an empty field appears, focused (the baseline's `setGroupMessage(…, '')`) | match |
| — | "Remove message" | message card, focus | — | not drawn | the card goes; focus back on Group 01's ⋯ | match (baseline) |
| U56 6522:32540 (10.4) | Sub-group 01 menu | entries | — | Add message · Duplicate sub-group · Group with other rules · Ungroup · Remove from group · — · Delete sub-group | Rename · Add message · Ungroup · Copy link · — · Delete sub-group | F69, F29, F30 (no grouping), F7, "Duplicate sub-group" not built (UNCERTAIN 3) |
| U56 6522:32540 | Sub-group 01 menu | label | delete | "Delete sub-group" | "Delete sub-group" (was "Delete group") | match (build note U54 #13, cosmetic 8) |
| U56 6522:32540 | Sub-group 01 menu | width | — | 240 | 220 | research R10 (T021's §5.1 row: one menu width) |
| U56 6522:32644 (10.5) | School transport, Rule 01 (linked) | entries | — | Edit rule · Group with other rules · — · Remove from School transport | Edit rule · Group with other rules · Copy link · — · Remove from School transport | F29 (Copy link); no Copy to variant: Standard and Ambulance hold it (FR-036f) |
| U56 6522:32644 | Rule 01 (linked) | "Remove from …" | icon, colour, divider | "Icon/Remove from this variant · minus circle" 20, `#c4271c`, after the divider | remove-circle-danger.svg (Figma's, fill #C4271C) 20 × 20, rgb(196, 39, 28), after the divider | match (build note U54 #8) |
| U56 6522:32594 | School transport, Rule 02 (changed) | entries | — | not drawn (badge under the menu) | Edit rule · Copy to variant · Group with other rules · Reset to Standard · Copy link · — · Remove from School transport | match (FR-036e/f; U57's frames are T066's) |
| U56 6522:32594 | School transport, Rule 06 ("Added here") | entries | — | not drawn | Edit rule · Rename · Duplicate · Copy to variant · Group with other rules · Copy link · — · Delete rule | match (F68: an added rule keeps Rename and Duplicate) |
| — | School transport, Group 01 / Sub-group 01 (linked) | entries | — | not drawn | Add message · Copy link · — · Remove from School transport | match (FR-036e: no Rename, Ungroup) |
| — | School transport, a linked rule's or group's name | name | rename | "Rename: hidden for rules linked to Standard" (6529:39070) | plain text, no rename button (only Rule 06's "Rename Rule 06" is a button) | match (FR-036e; UNCERTAIN 2) |
| U54 6522:33107 #10 | removed rule / removed group | entries | — | "Restore only" | Restore rule · Copy link, and Restore group · Copy link, both without icons | F29 (007-S4.2: Copy link after Restore) |
| U54 6522:33107 #2 | every menu | order | — | change · copy · structure · Reset · divider · Remove / Delete | `MENU_ENTRY_ORDER` (Copy link last before the divider) | match (F29) |
| — | every ⋯ of the three drafts, ⋯ scrolled to 280 px | menu | direction, gap, clipping | down where it fits | down, 8 below, right edges aligned; no ancestor with `overflow`, `transform` or `filter` (walked from the menu to `html`); nothing painted over its corners | match (V6) |
| — | every ⋯, scrolled to the window's bottom (1455 × 700) | menu | direction, gap, clipping | up where it doesn't fit above the footer | up, 8 above (for example Group 01: ⋯ 550, menu 313–542); the 7-entry rule menus (271) take `max-h-240` and scroll inside; no clipping ancestor | match (V6, R10) |
| — | opening up near the pinned tab row (T056's note) | menu | over the tabs | — | the menu paints over the pinned tabs (z-40 over z-10); nothing covers it (`elementFromPoint` at its four corners is inside it) | match: not clipped, so `boundsOf` is unchanged |
| — | 320 × 640, every ⋯ | menu | stays on screen | — | 220 wide inside 320 (Sub-group 01: x 20); `scrollWidth` 305, no horizontal scroll; the list scrolls inside `max-h-160` | match (FR-010) |
| U49 6196:10653 | renaming (Rule 02, from the menu's "Rename") | field | box, line, radius, padding, type | 240 × 40, white, 1 `decorative-border` (default), radius 8, 0 16, body/default 400 16/24 `#0b1220` | 240 × 40, oklch(1 0 0), 1px rgb(225, 230, 240), 8px, 0 16px, 400 16px/24px Fira Sans, rgb(11, 18, 32); hover `form-input-border`; KERN's 4 px focus ring (a text field always matches `:focus-visible`) | match (the default line is "Rules/Search field"'s; was a dotted underline in the name's type) |
| — | renaming | hint | place, type | not drawn | "Enter saves · Esc cancels" 8 under the field, 14/24 `layout-text-muted` rgb(74, 84, 104) | match (baseline hint, the field error's place) |
| U49 6196:10653 | duplicate name | field | line | 1 `#c4271c` | 1px rgb(196, 39, 28), `aria-invalid="true"`, the focus stays in the field | match |
| U49 6196:10710 | duplicate name | field error | place, anatomy | "Rules/Field error" 8 under the field: `icon-emergency_home-small` 20, gap 4, body/small 14/24 `#c4271c` | 8 under, `kern-icon--danger` 20 × 20, gap 4px, 400 14px/24px rgb(196, 39, 28), in the field's `aria-describedby` region (`aria-live="assertive"`) | match (T063's `FieldError`) |
| U49 6196:10710 | duplicate name | field error | text | "There’s already a rule called “Rule 02”." | "There’s already a rule called "Rule 01" in Standard." (renaming Rule 02 to Rule 01) | C5 (`rules/src/constants.ts`: straight quotes and the branch; a copy fix is T011's files, left as is) |
| — | reserved / undo-able names (W12) | field error | text | not drawn | "Rule 07 is kept for the rule numbered 07." (the next number); after deleting Rule 02, "Rule 02 is kept for the rule numbered 02."; empty: "Enter a name."; a group: "There’s already a group called "Group 01" in Standard." | W12 (baseline texts, the design's field error) |
| — | after Escape | focus | — | — | back on "Rename Rule 02" (the name button) | match (baseline) |
| U14 6083:3453 (T024's deferred row) | name hover | underline, pencil | look, motion | dashed underline, pencil 20 | 1px dashed rgb(29, 86, 240), pencil visible, `motion` 0.15 s on the line's colour | match (design-notes §4; closes T024's "deferred to T058") |
| U34 6113:29056 | "Delete Rule 02?" | body | text | "Citizens won’t be checked for licence classes C or D any more." | "Citizens will no longer be checked for “Driving licence · Expiry date is at least 6 months from now”. You can undo this right after." | F70 (the current app's body, CLAR #56; UNCERTAIN 1) |
| — | "Delete Sub-group 01?" | dialog | confirm label, body | not drawn | "Delete sub-group"; "Sub-group 01 and the rules in it will be deleted. You can undo this right after." | match (the menu's label, build note U54 #13) |
| U34 6113:29018 | delete dialogs | scrim | — | scrim | `ConfirmDialog`'s scrim kept (a click answers "Cancel") | match (T052/T057 decision) |
| U35 6113:29469 (2.5) | Rule 02 deleted | toast | text, action | "Rule 03 deleted." with "Undo" | "Rule 02 deleted." with "Undo" (was "… in Standard deleted.") | match (cosmetic 8) |
| U35 6113:29469 | deleted | toast | type | `type=danger`: red `#c4271c`, white `icon-delete` | neutral (ink) toast | T036 (U61's danger type not built: phase 4 report) |
| — | Sub-group 01 deleted | toast | text | not drawn | "Sub-group 01 deleted." with "Undo" | match (worded as "Rule 03 deleted.", T057's carried note) |
| U35 6113:29132 | after "Undo" / Ctrl+Z | list, focus | — | — | every rule and group back in its place; the focus on the restored Rule 02 | match (`useUndoShortcut.ts` kept) |
| U35 6965:50849 (2.6c) | after Ungroup | toast | type | green `type=success`, the white filled check | `kind: 'success'`: rgb(29, 122, 46), the filled check | match (T057's carried note) |
| U36 6344:53623 | after grouping (Rule 01 and Rule 02) | toast | type, text | green; "Rule 02 and Rule 03 are now in Group 01." | `kind: 'success'`, "Rule 01 and Rule 02 are now in Group 03." with "Undo" | match |
| — | "Copy link" on Rule 04 and Sub-group 01 | toast, clipboard | — | not drawn | "Link copied."; `…/edit?step=rules&variant=<id>&item=rule-4` / `item=group-2` | match (007-S4) |

Open rows: none.

#### Decisions (T058)

1. **The toasts' kind.**
   - `undoable()` takes a `kind`. Grouping, ungrouping and the rule copy are `success` (the Figma toast's description: "saved, grouped, copied, restored, published"; U36 #27, U35 #41).
   - Deletions stay neutral.
   - "Link copied." stays neutral: it is a note, not a change of the rules.
   - "Rule 01 saved." (T056's) is untouched. It is still neutral although the description lists "saved". See the T056 note below.
2. **`switchedToOr` / `switchedToAnd` keep "… to be true".** The phase 2 note asked for "must be met" (C3). But FR-051 (32) and U34 6329:19219 word the note itself as "Group 01 now needs only one rule to be true.", and T057's table matched that row. "must be met" belongs to the subtitle and the connector menu, which already say it. I left both texts unchanged and only rewrote the comment. (UNCERTAIN 4)
3. **Sub-group labels follow how the group is shown** (`GroupListItem`'s depth), not `menuItemOf`'s kind. T055 UNCERTAIN 4: a sub-group that moved up after its group dissolved in a variant reads "group", as it is drawn.

#### UNCERTAIN (T058)

1. **F70, the delete-rule dialog's body (copy; not core).** I kept the current app's body, which quotes the rule's statement: "Citizens will no longer be checked for “<statement>”. You can undo this right after." CLAR #56 answers "keep the current app's body" and drops the frame's per-check-kind sentence. Its "Dropped: … any sentence built from the rule's check" could also be read as dropping this quote. If so, it is a one-line change in `RULES_COPY.deleteText`, plus one test in `utils.test.ts` ("keeps U14's body …").
2. **Rename on a name linked to Standard (behaviour, small; touches FR-036's core rule).** FR-036e takes "Rename" out of a linked item's menu. To be consistent, `ItemName` also renders a linked rule's or group's name as plain text, not as a rename button. The baseline let the name button rename it (and mark it "Changed here"). T066 may revisit this.
3. **"Duplicate group" / "Duplicate sub-group" (U55 #29, U56 #24) not built (not core).** `menuEntriesOf` gives groups no duplicate, the baseline had none, and the rules package has no group-duplicate action. 002-S2.19 is read by the audit as "the same actions" (COVERED ? 75 %). I followed T055's entries. The coordinator may take it to `deferred.md`.
4. **The switch notes' wording (copy; not core).** See Decision 2.

Coordinator: all four accepted (1: #56 keeps the current app's body, and quoting the statement is not a per-check effect sentence; 2: consistent with FR-036e; 3: already deferred as F8 in `deferred.md` group B; 4: FR-051 (32) words the note so). "Rule 01 saved." made `kind: 'success'` by the coordinator (`utils.ts`, the `saveRule` case), as the Figma toast's description lists "saved".

### U36, U64 Select mode (S9) — T059, 2026-11-09

Setup:
- Browser: Chromium (playwright-core 1.48.2, `/usr/bin/chromium`), signed in as `designer`.
- Sizes: 1455 × 943 (body 1440; frame 2.15 is 1440 × 943), 1455 × 947 for scrolling, 1455 × 900 (U64 12.2) and
  320 × 640.
- Drafts (all T059's own):
  - "T059 three rules": Rule 01 age ≥ 21, Rule 02 expiry ≥ 6 months, Rule 03 classes B, BE; as U36 2.15.
  - "T059 group": Rule 01, Rule 02, and Group 01 (OR) holding Rule 03 C, D and Rule 04 B, BE; as 2.19.
  - "T059 many": three rules; then Group 01 (OR) with three direct rules and Sub-group 01 of two; then six more
    top-level rules, so the page scrolls.
  - "T059 variant": Standard, and Ambulance based on it, with a group and a sub-group; as U64 12.2.
  - "T059 colours": two rules; used for the label colours.
- Font check `600 16px "Fira Sans"` true.

Out of scope here: the rule rows are T024's, the groups T057's, the menus (2.14 6344:53506, 2.18 6344:53624) T058's,
the toast T036's, and the pinned step header and tabs T033's and T056's. The rows below cover select mode itself.
Figma y values are page values.

| frame | state | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|
| U36 6344:53530 (2.15) | one selected | entry | behaviour | "Group with other rules" in Rule 02's ⋯ starts select mode with Rule 02 ticked | the same; the focus moves to "Select Rule 02" (ticked); by keyboard (Enter on ⋯, Enter on the entry) too | match (FR-036; T058's entry) |
| U36 6616:44187 | one selected | selection bar | box | 161, 282, 1118 × 56, first in the card | 161, 282, 1118 × 56 | match |
| U36 6616:44185 | every state | selection bar | fill, padding, gap | `feedback-info-background` `#e0f2fe`; 8 16; 8 | rgb(224, 242, 254); 8px 16px; 8px | match (was `layout-background-hued`, 64 high: the hidden "Old · Selection bar" 6344:53542) |
| U36 6616:44187 | at rest | selection bar | corners | inside the card's 12 px radius | top 11px (12 less the 1px border); the card doesn't clip | match |
| U36 6616:44156 | one selected | text | copy | "Choose at least one more rule to group with Rule 02." | the same (`RULES_COPY.selectOneMore`) | match (was "Select at least one more …") |
| U36 6616:44156 | every state | text | font, colour, box | label/default 600 16/24 `#0b1220`; 177, 298, 863 wide | 600 16px/24px rgb(11, 18, 32); 177, 298, 862.8 wide; `role="status"` | match |
| U36 6616:44157 | every state | "Cancel" | box | button-tertiary-small, 74 × 40 at 1048, 290 | 1047.8, 290, 74.2 × 40 (KERN's 4px slot margins dropped, `my-0!`) | match |
| U36 I6616:44157;1914:12729 | every state | "Cancel" | label | label/Action/small_underline 600 14/24 `#1d56f0`, underlined | 600 14px/24px rgb(29, 86, 240), underline | match |
| U36 6616:44176 | one selected | "Group rules" | box, look | button-primary 133 × 40 at 1130, 290; `#1d56f0`; radius 8; 40 % (disabled) | 1130, 290, 133 × 40; rgb(29, 86, 240); 8px; opacity 0.4, `aria-disabled="true"`, a press does nothing | match |
| U36 I6616:44176;2:4624 | every state | "Group rules" | label | label/default 600 16/24 white | 600 16px/24px white | match |
| U36 6344:53557 – 53559 | one selected | boxes | place | 176, 360 / 514 / 660 (Check item at y − 4, 28 high) | 176, 360 / 514 / 660, 20 × 20 | match |
| U36 6344:53557 | select mode | box | offset in the row | 22 below the row's top (row 338, box 360) | `SelectBox` in `RuleRow`'s `selectBox` slot: 22 below the row (`mt-20` + the override's 2px) | match (T024's carry) |
| U36 6344:53557 | select mode | box | look, states | "Data/Check item" | `kern-form-check__checkbox` with T016's override (hover 2px blue border; checked hover 3px tint ring; keyboard focus 3px `#0b1220` ring, never after a click) | match (T016's carry; §5.1 Checkbox) |
| U36 6344:53546 | select mode | rule list | shift | rows at 40 in the card (name at 225) | `pl-40`: row at 201, name at 225 | match |
| U36 6344:53530 (frame title) | select mode | boxes | which items | "only rules on the same level get a box" | top level: the top-level rules; no box in groups' rows or on removed rules | match (CLAR #61, #64) |
| U36 6344:53560 (2.16) | two selected | text, "Group rules" | copy, state | "2 rules selected"; "Group rules" enabled (full opacity) | "2 rules selected"; `aria-disabled="false"`, opacity 1 | match |
| U36 6344:53556, 6344:53586, 6344:53693 | select mode | "Test rules" | state | disabled, "Finish grouping first" as visible text before it | `ExplainedButton`, `aria-disabled="true"`, "Finish grouping first" on hover and keyboard focus (`aria-describedby`) | W21 (FR-034; T056's row) |
| U36 6344:53590 (2.17) | grouped | result | layout, toast | Group 01 in Rule 02's place holding Rule 02 and Rule 03; toast "Rule 02 and Rule 03 are now in Group 01." with "Undo" | the same; the bar and the boxes go; the focus moves to Group 01's header | match (toast: T036, T057) |
| U36 6616:44240 (2.19) | inside a group, two selected | text | copy | "2 rules selected. They become a sub-group of Group 01." | the same (`RULES_COPY.selectedSubGroup`) | match |
| U36 6344:53695, 6344:53696 (2.19) | inside a group | boxes | which, place | only on Rule 03 and Rule 04 (group members), at 176, row + 22 | "Select Rule 03", "Select Rule 04" only, at 176, row + 22; none on Rule 01, Rule 02 | match (CLAR #61) |
| — | inside a group with a sub-group ("T059 many", from Rule 05) | boxes | which | not drawn | Rule 04, Rule 05, Rule 06 (direct rules); none on Sub-group 01 or its rules | match (CLAR #61; 002-S2.10) |
| — | sub-grouped | result | behaviour | not drawn after 2.19 | Sub-group 02 in Group 01 holding Rule 03 and Rule 04; toast "Rule 03 and Rule 04 are now in Sub-group 02." with Undo; the focus on Sub-group 02's header | match (baseline 002-S2.10) |
| U36 #19, U40 #13, U64 #22 | select mode | group checkboxes | presence | U36 frame titles and the item list draw groups as selectable (U40 #13); U64 12.2 draws none on Group 01 | no box on any group | CLAR #64 (Implement Q2: Figma must change; `selectableIn` boxes rules only) |
| — | cancelled | "Cancel" | behaviour | "goes away when you press Cancel" (6524:38720) | the bar and the boxes go; the focus goes to the first chosen rule's row (or its level's "Add rule" if none is ticked) | match (baseline) |
| — | keyboard path | focus order | behaviour | not drawn (U36 Missing: 002-ACC.4) | the bar's "Cancel" and "Group rules" come first in the DOM, then for each rule: box → "Rename Rule NN" → "Actions for Rule NN" → the connector; Space ticks a box, and the status text updates ("2 rules selected") | match (002-ACC.4) |
| U64 6524:38720 | note | selection bar | lifecycle | starts at the card top, pins when the card top scrolls past, unpins when scrolled back, goes on Cancel / Group rules | scrolled 1500: `sticky`, `top` 265px (161, 265 – 321) under the tabs; back at 0: 161, 282 with the 11px corners | match |
| U64 6616:44309, 6616:44355 | scrolled | pinned bar | look | the same component, no line under it, square corners, card width (drawn 1120 at 160) | the same bar, square, no line (was a 1px inset line); 1118 inside the card's 1px border, which continues beside it | match (the outer 1px is the card's border either way) |
| U64 6524:38299 (12.1), 6524:38489 (12.2) | scrolled | pinned bar | position | 257: 8 below the tab row's line (249), over the sticky frame's white bottom | right under the tab row (265 = 216 + 49) | T056 (U01 #19 row; the drawn sticky frame ends at 265 and the bar overlaps it) |
| U64 6524:38299 | scrolled | boxes under the bar | stacking | a box partly under the bar is hidden by it | the bar (z-1) paints over the boxes and the rows' buttons | match |
| — | scrolled, focus moves | focused box | clearance | not drawn | a box under the pinned bar that gets the focus scrolls to 345 (24 under the bar's 321) | WCAG 2.4.11 (`SELECTION_SCROLL_MARGIN`: tabs + 64) |
| U64 6524:38547 – 38549, 6524:38326 – 38328 | variant / Standard, scrolled | boxes | offset in the row | 10 above the row's top (12.2: row 194, box 184) | 22 below the row's top | U36 6344:53557 (the select-mode frames are the source; U64 is the sticky-bar note's frame, and T024's carry names U36's offset) |
| U64 6616:44355 (12.2) | variant, two selected at the top level | text | copy | "2 rules selected. The group is added in Ambulance only. Standard stays the same." | the same (`RULES_COPY.selectedInVariant`) | match |
| U64 6524:38500 | variant | selection bar | start | directly under the link strip | 161, 338 (card 281 + strip 56 + 1), square corners | match |
| U64 6524:38547 – 38549 | variant | boxes | which | top-level rules only | Rule 01, Rule 02, Rule 06; none on Group 01 or its rules | match (CLAR #64) |
| U64 6524:38324 | select mode | "Add rule" | presence | still shown at the card's bottom | shown | match |
| — | 320 × 640, variant, two selected | selection bar | layout | not drawn (U64 Missing: FR-010a) | text over three lines (239 wide, 72 high), "Cancel" and "Group rules" wrapped under it; bar 136; pinned under the header pills; no horizontal scroll | FR-010 (R10) |

UNCERTAIN (T059):
1. "Choose two or more rules to group." is used for the undrawn no-rule case, taking the drawn verb. Copy only.
2. U64's variant text is used only for top-level grouping. Inside a group in a based variant, the bar keeps the
   sub-group text. Copy only.
3. The box sits 22 below the row as U36 draws it. U64 draws it 10 above. Layout only.

#### UNCERTAIN (T059)

1. **"Choose two or more rules to group."** No frame draws the state with no rule ticked. I used Figma's new verb
   (the old bar's "Select at least one more" became "Choose at least one more"). The tested text is renamed in
   `utils.test.ts`. Copy only; not the core behaviour.
2. **U64's variant text applies only to top-level grouping.** In a based variant, two or more rules ticked at the
   top level read "N rules selected. The group is added in Ambulance only. Standard stays the same." (U64
   6616:44355). Inside a group in a based variant, the bar keeps "N rules selected. They become a sub-group of Group
   01." because no frame draws that case. The text is composed in `SelectionBar.tsx` (`RULES_COPY.selectedInVariant`)
   so that `selectionText` in `utils.ts` stays as it is. Copy only; not the core behaviour.
3. **The box's place in the row.** U36 draws the box 22 px below the row's top; U64 12.1 and 12.2 draw it 10 px above.
   I followed U36, the select-mode frames, as T024's carry says. Layout only.
4. **The pinned bar's place.** The bar pins right under the tab row (T056's mechanism, kept: the scoped
   `--wizard-sticky-top` on the card). U64 draws it 8 px lower, overlapping its own sticky frame. Layout only; it
   touches the pinned state, but only by 8 px.

Coordinator: all four accepted (copy and layout; the pinned place keeps T056's mechanism).

### U50, U51 Unrequested data, saving failed, link notices (S9) — T060, 2026-11-09

Setup:
- Browser: Chromium (playwright-core 1.48.2, `/usr/bin/chromium`), signed in as `designer`. Sizes: 1455 × 995
  (body 1440; the U50 frames are 1440 × 995), 1455 × 600 and 320 × 640.
- Fonts: `document.fonts.check('400 14px "Fira Sans"')` true.
- Drafts (all T060's own, deleted at the end):
  - "T060 field": Personal ID without Date of birth; Rule 01 expiry ≥ 6 months, Rule 02 age ≥ 21 (the field no
    longer requested), Rule 03 classes B, BE. As U50 8.4.
  - "T060 document": Personal ID only; Rule 01, Rule 02 ages, Rule 03 classes B, BE (the whole document no longer
    requested). As U50 8.4b.
  - "T060 several": Personal ID without Date of birth, no Driving licence; three Standard rules on unrequested data and
    "Ambulance" (started empty) with Rule 04 on the Driving licence.
  - "T060 links": three rules, Standard and Ambulance based on it; for the links and the failed saves.
  - The removal case was also made live on "T060 links": documents step, "Remove Driving licence", "Set rules", with
    every non-GET request aborted, so nothing was saved.
- The failed saves were made with Playwright routing: the draft's `PUT …/draft` aborted (network) and answered `500`
  `{error, message, error_id: "a1b2c3d4e5f6"}`. The stale links were opened with a made-up variant id
  (`00000000-0000-4000-8000-000000000000`) and a made-up item (`rule-99`). The group link was opened read-only on the
  seeded "Führerscheinantrag Stuttgart" (nothing changed or saved).
- Figma: `get_design_context` on the banner `6863:47363` and the toast `6197:11098`; `get_metadata` on `6197:10682`;
  screenshots of the eight frames. Every frame matches its audit inventory (U50.md, U51.md); none has changed.
- Out of scope: the rule rows (T024), the flagged row's outline and note look (T024's "problem (blocking)" rows), the
  editor (T061–T063), the toast's anatomy (T036) and the failed save's behaviour (T048), the tab's look (T026, T064).
  Figma y values are page values.

| frame | state | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|
| U50 6863:47363 (8.4) | one rule, a field | banner | place, box | first in the card's list, flush: 161, 282, 1118 × 42 | 161, 282, 1118 × 42 (no 8 px wrap any more; was a KERN alert with a title in an 8 px wrap) | match |
| U50 6863:47363 | one rule | banner | fill, border, radius, padding | "Rules/Findings banner" danger: `#fef1f0`, 1 `#c4271c`, 8, 8 8 8 16 | rgb(254, 241, 240), 1px rgb(196, 39, 28), 8px, 8px 8px 8px 16px | match |
| U50 I6863:47363;6863:47328 | one rule | kind icon | glyph, size, colour, place | `icon-emergency_home-small` 20 `#c4271c`, at 178, 293 | `kern-icon--danger kern-icon--small`, 20 × 20, rgb(196, 39, 28), at 178, 293 | match |
| U50 I6863:47363;6863:47329 | one rule | text | font, colour, place | body/small 400 14/24 `#0b1220`, 8 after the icon (206, 291) | 400 14px/24px "Fira Sans", rgb(11, 18, 32), at 206, 291 | match |
| U50 6863:47363 | one rule | text | copy | "Rule 02 checks data that’s no longer requested. Add it again in Documents, or edit or delete the rule." | "Rule 02 in Standard checks data that’s no longer requested. Add it again in Documents, or edit or delete the rule." | F58, C5 (FR-023c keeps the variant) |
| U50 6863:47363 | one rule | title | presence | none (the component's note: "no title") | none (was "1 rule checks data that’s no longer requested") | match |
| U50 6863:47363 | one rule | "Add it in Documents" | presence, look, place | not drawn ("Add it again in Documents" plain text) | a button on the line's right: 600 14px/24px rgb(29, 86, 240), 128 × 24 at 1142, 291 (8 inside the border), underline on hover, KERN's 4px focus ring by keyboard only; the data menu's footer button look (U31 6350:41628) | F58 (FR-023f, Q5) |
| — | "Add it in Documents", no rule open | behaviour | — | not drawn | the documents step opens, the focus on its h1 "Choose documents and data" | match (002-S2.25; the editor's `onAddData`) |
| U50 6197:10963 (8.5) | "Add it in Documents" with a changed rule open | dialog | title, body, buttons | "Save changes to Rule 01?", "If you leave without saving, your changes are lost.", "Discard changes" (secondary), "Save changes" (primary), × | "Save changes to Rule 03?", the same body, "Discard changes", "Save changes", ×; "Discard changes" opens the documents step | match (FR-002 body, cosmetic 8 "Discard changes"; was "You changed this rule but haven’t saved it yet." / "Discard") |
| U50 6197:10965 | 8.5 | tab row | presence | absent while the editor is open | shown | F26 |
| U50 7173:52333 (8.4b) | one rule, the whole document | text | copy | "Rule 03 checks data from Driving licence, which is no longer requested. Add the document again in Documents, or edit or delete the rule." | "Rule 03 in Standard checks data from Driving licence, which is no longer requested. Add the document again in Documents, or edit or delete the rule." | C5 (Q5's wording; FR-023c keeps the variant) |
| — | several rules (three in Standard, one in Ambulance) | banner | layout | not drawn | one line per rule, each with its icon on the first text line (`mt-2`), 8 apart; the action on the first line's right; a long sentence wraps beside it (186 high) | match (the findings banner's line pattern) |
| — | several rules | banner | which | not drawn | every variant's rules, each naming its variant; a rule a based variant inherits unchanged is named once, for Standard | match (002-S2.22, FR-006) |
| — | 320 × 640 | banner | layout | not drawn | 271 wide; the text wraps over four lines, "Add it in Documents" wraps under it at the text's left (34, 565); no horizontal scroll (`scrollWidth` 305) | FR-010 (R10) |
| — | select mode | banner | order | not drawn | the selection bar first, then the banner | match (T059's carried note) |
| — | appearing | banner | announcement | not drawn | `role="alert"`, as the baseline's KERN alert | match (baseline) |
| U50 6197:10688 (also 7173:52326, 7375:101521) | Standard with a rule on unrequested data | tab icon | glyph, colour | red error diamond after "Standard" | `kern-icon--danger` rgb(196, 39, 28) in the ⓘ's place; "Ambulance" (started empty, Rule 04 on unrequested data) has one too, unselected | match (FR-041a, CLAR #29 (a); `BranchName`'s `error` kind) |
| — | a branch with a problem and findings | tab icon | kind | not drawn | the problem's red icon (error > warning > info) | match (T026's carried order, coordinator default) |
| U50 7375:101551 (8.4c) | hover on the tab icon | tooltip | text | (the description, divider,) the error icon and "Rule 02 checks data that’s no longer requested. Add it again in Documents, or edit or delete the rule." | white error icon and "Rule 02 in Standard checks data that’s no longer requested. Add it again in Documents, or edit or delete the rule." (no description on this Standard); 280 × 120 | C5 (as the banner); the bubble's look: T026's rows |
| U50 7375:101551 | tab icon | accessible name | — | not drawn | "Standard has findings" | T070 (the tab's accessible name; FR-041) |
| U50 6197:10706, 6197:10708 | flagged rule | outline, note | look | red 1 outline, error icon + note 600 14/24 `#c4271c` | as T024's "problem (blocking)" rows | match (T024) |
| U50 6197:10708, 7173:52619 | flagged rule | note | copy | "Nationality is no longer requested." / "Driving licence is no longer requested." | "Rule 02 in Standard checks data that’s no longer requested." (the server's sentence, `RULES_MESSAGES.notRequested`) | 002-S2.22 (Q5 adopts the banner's sentences only; `TreeItem.tsx` is not T060's: UNCERTAIN 2) |
| U50 6197:10714 (#21) | a rule on unrequested data | "Test rules" | state | disabled look | enabled; a press refuses (below) | **open: FR-034 "in error"** (`EditorFooter`, not T060's files; no explanation text is specified: UNCERTAIN 3) |
| — | "Test rules" pressed (click, Enter) | refused attempt | message, focus | not drawn (U50 Missing: 002-S2.24) | "Couldn’t publish" alert with "Rule 02 in Standard checks data that’s no longer requested." above the card; the focus on Rule 02's row (`aria-describedby` its note); keyboard: 4px ring `rgb(11, 18, 32)`; after a click no ring | W12 (002-S2.24) |
| U51 6197:11098 (8.6) | save failed, network | toast | text, action | "Couldn’t save. Check your internet connection and try again." with "Try again" (label/small, underlined, white) | the same; dark toast rgb(11, 18, 32), 496 × 56 at 472, 843, centred over the 1440 body | match (T036, T048) |
| — | save failed, 500 with error ID | toast | error ID | not drawn | "Error ID: a1b2c3d4e5f6" on its own line (80 high), "Try again" | F67 (FR-033a; T048's carry) |
| — | "Try again" | focus, result | — | not drawn | the toast goes, the focus on "Save and exit" ("Saving…" while it runs), the new failure's toast | match (T048) |
| U51 6197:11060 | 8.6 | list | groups | Group 01 holding only Sub-group 01; "+ Add rule" inside groups | not built | 002-S2.13 (a group with one member dissolves), FR-037c; T057 |
| U51 6197:11403 (8.7) | empty group | group | state | "This group is empty. Add a rule or a sub-group, or delete the group." | no empty groups | FR-037c, OUT-21 (U51 #24, #25 CONFLICT) |
| U51 6197:11646 (8.8) | no rules | empty state | anatomy | "No rules yet", text, "+ Add rule" | as T056's rows | match (T056) |
| U51 6197:11648 (8.8), 6197:11762 (8.9) | no rules, first rule edited | tab row | presence | absent | shown | F26 |
| U51 6198:12366 (8.8) | no rules | "Publish without rules" | look | secondary (outline) | `kern-btn--primary` | **open: the footer is `EditorFooter`'s (T033/T056), not T060's files: coordinator** |
| U51 6197:11760 (8.9) | values menu, "XL" | menu, footer | anatomy, copy | "No options match "XL"." | T027's and T062's rows | match (T027, T062) |
| U51 6197:11782 | rule open | "Test rules" | state | disabled | `aria-disabled="true"`, "Save the rule first" | match (F65, T056) |
| — | `?variant=<unknown>` | notice | text, look | not drawn (W15: the design's warning alert) | "This link points to a variant that no longer exists." KERN warning alert 1120 wide at 160, 216 (above the tabs): `#fff4e0` header, 2px outline rgb(154, 74, 0), 32 px icon, title 600 18/24, white body 8 24 16 with "Dismiss" (`kern-btn--secondary kern-btn--small`, 83 × 40); Standard shown | W15 (§3 "Alert, page level": a body keeps "Dismiss") |
| — | `?variant=<Ambulance>&item=rule-99` | notice | text | not drawn | "This link points to a rule or group that no longer exists."; Ambulance shown | W15 |
| — | stale link opened | focus | — | not drawn | the notice (`tabIndex=-1`), announced by its title; Tab goes to "Dismiss"; no extra ring (the alert's own border; as a heading focused by script) | W15 (007-S5) |
| — | "Dismiss" | notice, focus | — | not drawn | the notice goes, the focus on the open variant's tab; the address keeps the link while the variant is shown | match (007-S5) |
| — | 320 × 640, stale link | notice | layout | not drawn | 273 wide, 184 high; no horizontal scroll | FR-010 |
| — | `?variant=<Ambulance>&item=rule-3` | highlighted item | look | "highlighted as the design draws it" (no frame draws it) | the row focused and scrolled into view (`goToItem`): KERN's 4px focus ring `rgb(11, 18, 32)` inset (`-4px`) around the 1118 × 102 row; at 1455 × 600 the row at 410, clear of the pinned tabs | W15 (007-S5; UNCERTAIN 4) |
| — | a link to Group 01 | highlighted item | focus | not drawn | the group's header focused (1083 × 57), the same ring | match (007-S5, `findingTargetIdsOf`) |

Open rows: two, both outside T060's files: "Test rules" disabled while a rule is in error (FR-034, U50 #21) and U51
8.8's secondary "Publish without rules". See UNCERTAIN 3 and the coordinator note.

#### UNCERTAIN (T060)

1. **The banner's anatomy (layout; not core).** The task names "T017's alert with a body"; U50 `6863:47363` draws
   the "Rules/Findings banner" in its danger kind (no title, body/small, flush at the list's top), and the frame is
   unchanged since the audit. I followed the frame ("Figma decides layout"), with the "Add it in Documents" action
   FR-023f keeps, in the data menu's footer button look, and kept the alert's `role="alert"`.
2. **The flagged rule's note (copy; not core).** U50 draws "Nationality is no longer requested." / "Driving licence
   is no longer requested."; the row keeps the server's sentence "Rule 02 in Standard checks data that’s no longer
   requested." (002-S2.22). Q5 adopts the banner's two sentences only, and the note comes from `TreeItem.tsx`, not a
   T060 file. If the frame's note is wanted, it is a new frontend sentence in `TreeItem.tsx` (field label or
   document label).
3. **"Test rules" while a rule is in error (behaviour; touches FR-034, not T060's core).** FR-034 / Q18 disable
   "Test rules" while a rule is "open, incomplete or in error", and U50 #21 draws it disabled. Only "Save the rule
   first" and "Finish grouping first" are specified as explanations, and `EditorFooter` is not a T060 file. So
   "Test rules" stays enabled and refuses with the message, moving the focus to the rule (the W12 refused attempt
   this task names). Q18 drops that refusal. Choosing the explanation text and building it is for the coordinator.
4. **The highlighted item (look; small).** No frame draws a link's highlight. The item is focused and scrolled into
   view as 007-S5 says (`goToItem`), which shows KERN's focus ring, since a script focus without a pointer
   interaction matches `:focus-visible`. No extra highlight was added.
5. **The tab tooltip with several rules (copy; not core).** One rule: its banner sentence. Several in one variant:
   the sentences one after the other (the design's words; no count sentence was invented).
6. **"Save changes to Rule 01?" body and "Discard changes" (copy; not core).** Adopted from U50 8.5 (`6197:10989`,
   FR-002; "Discard changes" is cosmetic 8, U50 #30). This dialog is also the leave flow's rule question, so T048's
   row 2067 ("You changed this rule but haven’t saved it yet.", "Discard") now reads differently.

Coordinator: the two open rows go to T075 (the footer is `EditorFooter.tsx`, outside T060's files; FR-034's explanation text for "in error" is taken to the user as Implement Q5); UNCERTAIN 2 (the flagged rule's note text, `TreeItem.tsx`) to T075; the others accepted. U50 8.5's "Save changes to Rule 01?" body "If you leave without saving, your changes are lost." and "Discard changes" now also word the leave flow's rule question (T048's row "U17 Entering and leaving a flow" reads differently since).

Coordinator, 2026-11-09, after the user's Implement Q5 (#66, A): T075's carried row 1 is built: "Test rules" is `ExplainedButton` with the first spec 002 problem's message while the rules are in error (`EditorFooter.tsx` `rulesProblem`, computed with `firstProblem` in the editor's `index.tsx`; the open editor and grouping explain first).

| frame | state | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|
| U50 6197:10714 (#21) | a rule on unrequested data | "Test rules" | state, explanation | disabled look | `aria-disabled="true"`, 40 %, tooltip and description "Rule 02 in Standard checks data that’s no longer requested." on keyboard focus; a press stays on the step; a draft without problems: enabled | match (#66) |

### U37, U38, U52 Variant tabs and the variant dialog (S11) — T064, 2026-11-09

Checked in playwright-chrome (Chromium) at 1455 × 1000 (body 1440), and at 320 × 640, signed in as
`designer`, on T064's own drafts ("T064 no variant": Standard without a description, two rules;
"T064 two variants": Standard with a description, Ambulance with one, School transport without;
both deleted afterwards). Variants added in the UI are local state (nothing saved). Fonts:
`document.fonts.check` true for Fira Sans 600 16px, 400 16px, 600 14px. Dialog values are relative to
the dialog's top-left (the frames' dialog node 6139:32693 / 6197:12011, 600 wide). The tab itself is
T026's `BranchName` table (§5.1); the rows here are the row, the dialog and their states.

| frame | state | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|
| U43 6168:7009, U38 6134:9153 | every state | tab row | box, line | 160, 216, 1120 × 49; bottom 1 `#e1e6f0`; tabs 24 apart, bottom-aligned | 160, 216, 1120 × 49; 1px solid rgb(225, 230, 240); gap 24 (Ambulance at 286.4 = 160 + 102.4 + 24) | match |
| U37 6134:8603, U43 6168:7010 | no variant | "Standard" tab | (i) | drawn (Standard always with an (i)) | none without a description; shown with one ("About Standard", grey) | F27 (FR-035c) |
| U37 6134:8603, U38 6134:9160 | every state | ⋯ | which tabs | the selected tab only | every tab ("Actions for Standard", "Actions for Ambulance", …) | F28 (CLAR #21: "every tab has its ⋯") |
| U38 6134:9160 | selected | ⋯ | size | 20 (`icon-more_vert-small`) | 32 target (`BranchMenu`), `-my-4` keeps the 38 tab | F28 (the component's note "32px target"; T026's table) |
| U43 6168:7012 | every state | "+ Add variant" | box, look | button-tertiary-small: 48 slot, visible 40, px 8, icon-add-small 20, label/small 600 14/24 `#1d56f0` | `kern-btn--tertiary kern-btn--small`: 40 visible (margin 4 0 → 48 slot), icon 20, label 600 14px/24px rgb(29, 86, 240) | match |
| U43 6168:7011 | every state | "+ Add variant" | label line | label 12–36 in the 48 slot (2 px above the tab labels, 14–38) | label line 228–252, tab names 230–254 | match (was 2 px lower, spec 002's "Add variant · aligned" 6542:39560; the 008 frames draw the plain button) |
| U43 6168:7012, 6168:7013 | every state | "What is a variant" (i) | place | after the button pulled `mr-[-12px]`: 4 after the label | 400.9 (label text ends at 397, 4 before); since bug add-variant-hover-tooltip (2026-11-18) the button pads 24 on its right and is pulled 28, the (i) still 4 after the label | match |
| — | hover / pressed | "+ Add variant" | tint's extent | not drawn (the 008 frames draw the resting button) | the button's box, where KERN draws its 8 % / 16 % tint, runs 8 past the (i) (32 after the label, the 8 the "+" has before it); the (i) stays on top for the pointer, so the button isn't hovered (no tint) while the pointer is on the (i); the button's focus ring encloses the (i) too | decision (bug add-variant-hover-tooltip, 2026-11-18: the plain button's tint ended 12 px into the 20 px (i)) |
| U43 6168:7013, U37 6151:33809 | every state | (i) | colour, size | `icon-info-small` 20 on action blue `#1d56f0` | 20 × 20, rgb(29, 86, 240) (`tone="action"`) | match (carried from T022, T056) |
| U37 6134:8722, U38 6134:9163 | with variants | (i) after "Add variant" | shown | not drawn once a variant exists | shown in every state | F27 (FR-035a) |
| U37 6151:33820 | (i) hovered / focused | tooltip | text | "A separate set of rules for citizens with different requirements. Each variant gets its own result link." | the same (`RULES_COPY.variantsInfo`) | match (F27) |
| U37 6151:33820 | (i) hovered | tooltip | box, look | 280, `#0b1220`, radius 8, padding 8 16, body/small 14/24 white, three lines ("…citizens with / different requirements. Each variant / gets its own result link.") | 280 × 88, rgb(11, 18, 32), 8px, 8px 16px, 400 14px/24px white, the same breaks | match |
| U37 6134:8515 | (i) hovered | tooltip | place | 330, 257 (drawn loose, left of the (i)) | 8 below the (i), its left edge 8 past the (i)'s (392.9, 258) | build note 3 (T022's anchor, the Tooltip pattern) |
| — | (i) keyboard focus | tooltip | opens | not drawn | opens on keyboard focus and on hover (T022) | match (FR-035) |
| U37 6139:32939 | Ambulance's (i) hovered | tooltip | text, box | the description, 2 lines | "For patient transport vehicles. Drivers also need a class C1 licence.", 280 × 64, breaks after "Drivers" | match |
| — | a variant without description, no findings | (i) | shown, text | not drawn | grey (i) "About School transport", "No findings." | match (FR-041b; `noFindingsInfo` for every tab but Standard); history: no icon since bug v5-ui-fixes (2026-11-18), Clarification 2026-11-18 #2 |
| U38 6134:9153 | School transport selected | tabs | name font, colour | unselected 400 `#4a5468`, selected 600 `#0b1220` with the 2 px indicator | 400 rgb(74, 84, 104) ×2, 600 rgb(11, 18, 32); `aria-selected` true, `tabIndex` 0 only on it | match |
| — | keyboard | tab list | keys, focus | WAI-ARIA tabs | ArrowLeft opens and focuses Ambulance, End School transport; 4 px ring on keyboard focus; Tab then goes (i) → ⋯ → "Add variant" → the variant (i) (tooltip opens) | match |
| U37 6139:32650 | dialog open | dialog | box | 600 × 728, radius 12, 1 px border | 600 × 728 (`ConfirmDialog wide`) | match (carried from T035: `wide`) |
| U37 6139:32693 | new | header, title | text | "Add variant" title/large 24/32 | "Add variant" (`ConfirmDialog`'s header, T035) | match |
| U37 6139:32693 | new | intro | text, place, font | "A separate set of rules for citizens with different requirements. Each variant gets its own result link." at 32, 72; 16/24 `#4a5468`, two lines | the same text at 32, 72, 536 × 48, 400 16px/24px muted | match (U37 #20, design copy) |
| U37 6044:16198 | new | "Variant name" | label | label/default 600 16/24 with baseline 6/2 (32), "*" `#c4271c`, 8 to the field | "Variant name*", 600, padding 6px 0 2px (32), `requiredMark`; field at 184 (144 + 32 + 8) | match (carried from T015: `requiredMark`; the baseline padding through `VARIANT_FIELD_CLASSES`) |
| U37 6044:16198 | new | name field | box | 536 × 48 at 32, 184 | 536 × 48 at 32, 184; focused on opening | match |
| U37 6044:16276 | new | "Description (optional)" | label | "Description (optional)" 600 16/24, baseline 6/2 | "Description (optional)" (`TextField optional`), 600, padding 6px 0 2px | match (report cosmetic 6) |
| U37 6044:16276 | new | helper | text, font | "Shows when you hover the ⓘ next to the variant name." body/default 16/24 `#0b1220`, baseline 6/2 (32), 8 to the field | the same text (`kern-hint`, linked), 400 16px/24px rgb(11, 18, 32), padding 6px 0 2px, margin-bottom 8 | match (U37 #22; was "Shown when someone hovers the (i) …") |
| U37 6044:16276 | new | helper | ⓘ glyph | drawn | Fira Sans has no U+24D8 and no installed font on this Linux has it: a missing-glyph box in headless Chromium; desktop systems fall back (Segoe UI Symbol, Apple Symbols) | UNCERTAIN (T064: kept the design's character; see below) |
| U37 6044:16276 | new | textarea | box, look | 536 × 64 at 32, 328; padding 8 16; `layer-surface`, 2 px bottom line, radius 4, resize handle | 536 × 64 at 32, 328; 8px 16px; resize vertical; spell check on; maxLength 500 | match (FR-032; `TextField multiline`, its 120 overridden to the drawn 64) |
| U37 6044:16300 | new | "Start with" | heading | label/default 600 16/24 at 416, 12 to the options | `legend` 600 16px/24px at 416, the options 12 apart | match |
| U37 6044:16353 | new | "Linked to Standard (recommended)" | row | radio 20 at 0, 458, 8 to the label 600 16/24 at 28, 456; py 4 | radio 20 × 20 at 0, 458; label 600 at 28, 456 | match |
| U37 6044:16353 | new | selected radio | look | white, 1 px `#1d56f0`, dot 10 `#1d56f0` | white, 1px solid rgb(29, 86, 240), ::before 10 × 10 rgb(29, 86, 240) | match ("Data/Radio item" 6387:26931) |
| U37 6044:16353 | new | preselected | which | "Linked to Standard (recommended)" | checked on opening | match (FR-052h) |
| U37 6053:16254 | new | help | text, place, font | "Copies all Standard rules. Unchanged rules remain the same as Standard and update with it." body/small 14/24 `#4a5468`, pl 28, at 484 | the same text, 400 14px/24px muted, padding-left 28, at 484, two lines | match (was "Starts with all Standard rules. …") |
| U37 6044:16358 | new | "Start empty" | row, look | radio at 0, 550 white with 1 px `#6b7488`; label at 28, 548; help "Starts with no rules. Changes to Standard don’t affect it." at 576 | 0, 550, 1px solid rgb(107, 116, 136), white; label 548; help at 576 | match |
| U37 6139:32693 | new | footer | box, buttons | 24 above, 32 below, 1 px top line; "Cancel" secondary and "Add variant" primary, 260 × 48 each | footer at 624, 104 high; "Cancel" 260 × 48 at 32, "Add variant" 260 × 48 at 308 | match (T035) |
| "Data/Radio item" 6387:26931 (description) | hover, unselected | radio | ring, fill | 2 px blue, the tint (white) | 2px solid rgb(29, 86, 240), white | match |
| 6387:26931 | hover, selected | radio | ring | 3 px tint ring | box-shadow 0 0 0 3px white | match (as T016's Checkbox) |
| 6387:26931 | keyboard focus | radio | ring | 3 px `action-focus-default` | outline 3px solid rgb(11, 18, 32), offset 0; none after a click (border 1 kept) | match |
| U52 6197:12011 | name missing | dialog | box | 600 × 768 | 600 × 768 | match |
| U52 6197:12011 | name missing | message | text, place | "Enter a name for the variant." with `icon-emergency_home-default` 24 at 52, 246; field `#fef1f0` | the same text (`RULES_MESSAGES.variantNameMissing`), icon 24 at 52, 246; field rgb(254, 241, 240); `role="alert"`, the focus back in the field, `aria-invalid`, described by the message | match (W18) |
| U52 6197:12011 | name missing | danger bar | extent | 4 px `#c4271c` beside label, field and message (32, 144, 128 high), the label and field 16 in | 4px solid rgb(196, 39, 28) on the field's wrapper at 32, 144, 128 high; label and field at 52 | match (the bar moved from `TextField`'s inner wrapper to the field's wrapper, see §2 note) |
| — | name taken | message | text | not drawn (W18) | "There’s already a variant called "Standard"." under the field, as the missing name (U52's error state) | match (W18, C5) |
| — | edit (Ambulance's ⋯ › Rename) | dialog | content | not drawn here (U60 is T068's) | "Edit variant", 600 × 448, no intro, no "Start with", name and description filled, "Cancel" / "Save changes"; the taken name refused as above | match (F28, 002-S4.4) |
| — | added | focus | after "Add variant" | not drawn | the new tab, selected; the based variant shows the link strip | match (baseline) |
| — | 320 × 640 | tab row, dialog | reflow | not drawn | row wraps (273 × 163), no horizontal scroll (scrollWidth 305); dialog 273 wide, no inner horizontal scroll | match (FR-010) |
| U01 #18 | scrolled | tab row | pinned | with the step header | unchanged: T056's wrapper (`PINNED_TABS_CLASSES`), the row transparent, no `overflow` / `transform` | match (T056's table; not rechecked here) |

**Decisions (T064):**

- **The ⋯ on every tab, not the active one only** ("decide here", carried from T026): F28 and CLAR
  #21 (spec.md, Q21: "every tab shows its ⋯ (Rename for all, Delete for variants other than
  Standard, "Copy link" per Q22). Not built: … ⋯ on the active tab only") settle it; the frames
  (U37, U38, U59) and the component's note draw it on the active tab, a decided F item wins over
  them. `BranchTab` passes `actions` to every tab. Not UNCERTAIN.
- **The variant (i) in every state** (F27: "On the Rules step the variant ⓘ follows "+ Add
  variant" in every state"), with the design's text and `tone="action"`.
- **"+ Add variant" without spec 002's 2 px drop**: U38 6134:9153 and U43 6168:7009 draw the
  plain button-tertiary-small, bottom-aligned (its label 2 px above the tab labels); the old
  `-mb-2 pt-2` (002's "Add variant · aligned" 6542:39560) is gone.
- **Edit variant is 600 wide too** (`wide` on both): U37's dialog is 600; U60 (rename, T068) may
  draw another width.
- **Copy (word for word, interpolations kept):** the (i) and the dialog intro "A separate set of
  rules for citizens with different requirements. Each variant gets its own result link."; the
  helper "Shows when you hover the ⓘ next to the variant name."; "Linked to ${main}
  (recommended)"; "Copies all ${main} rules. Unchanged rules remain the same as ${main} and update
  with it."; "Starts with no rules. Changes to ${main} don’t affect it."; "(optional)" from
  `TextField` (the old "- Optional" entry `RULES_COPY.optional` removed).

**Open for the user (T064, not core):**

1. The helper's "ⓘ" (U+24D8) is the design's text, but Fira Sans has no such glyph and this
   machine has no fallback font for it: headless Chromium here shows a missing-glyph box. Windows
   and macOS fall back to a symbol font. A screen reader reads it as "circled latin small letter
   i". Kept as drawn (copy rule); alternative: KERN's info icon inline (`aria-hidden`) with
   "(i)" for screen readers. Not core (copy/glyph only).
2. The danger bar beside the label (U52) is applied by the variant dialog's wrapper, not by
   `TextField`, so step 1 and the other fields keep U19's bar beside field and message only. If the
   design means P26's bar everywhere, `TextField` should change (phase 11 or a §2 decision). Not
   core.

### U65, U66 (`7057:59536`) The test step, part 1 (S13) — T071, 2026-11-09

Setup:
- Browser: Chromium (playwright-core 1.48.2, `/usr/bin/chromium`), signed in as `designer`. Sizes: 1455 × 900
  (body 1440; the frames are 1440 × 900) and 320 × 640.
- Fonts: `document.fonts.check('400 14px "Fira Sans"')` true.
- Drafts (T071's own, step "test", deleted at the end; nothing saved, no non-GET request during the walks):
  - "T071 Passenger transport licence": Personal ID (Date of birth, Nationality), Driving licence (Expiry date,
    Licence classes); Rule 01 · Minimum age 21, Rule 02 · Class B for 2 years (class B issue date ≥ 2 years ago),
    Rule 03 · Licence not expired (expiry ≥ 1 month from now), Rule 04 · German or EU citizen. As U65.
  - "T071 groups": Rule 01, Group 01 (AND: Rule 06 age ≥ 25, Rule 05 classes B or BE, with a group message),
    Rule 03. For the group row's statement.
- The personas are random per open: Figma's sample names and values are not copy (FR-002). "Couldn’t be checked" was
  made by clearing a persona's date of birth in edit mode (local editor state, sends nothing).
- Figma: `get_metadata` on `7057:58709`; `get_design_context` on the variant area `7057:58753` (chips, data card
  `7057:58767`/`7057:58772`, result `7057:58809`/`7057:58811`/`7057:58825`) and on the met list `7057:59239`;
  screenshots of `7057:58709`, `7057:59123`, `7057:59536`. U06 #29–#44 read from `figma-audit/units/U06.md`. Every
  frame matches its audit inventory (U65.md, U66.md); none has changed (the "Generate all" node `7344:96178` is the
  audit's).
- Out of scope: the edit-data dialog (`7058:60514`, T072; the inline editor still stands), the variant tabs' look
  (T026, T064, T073), the per-card scroll areas `7114:49642`/`7114:49643` (F43, CLAR #31 (c): the panel scrolls,
  T073; built per card since bug v5-ui-fixes, 2026-11-18, T073’s note), the step header and footer (T032, T033), the publish dialog's content (T076). Figma y values are page
  values; the app's are 40 lower from the tabs on, because of the test-day line the frames don't draw.

| frame | state | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|
| U65 7057:58714 | results | page title | copy, type | "Test rules with sample citizen data", heading/large 600 24/32 `#0b1220` | the same text, 600 24px/32px "Fira Sans" rgb(11, 18, 32), 160, 136 | match (cosmetic 12, C2; was "Test rules") |
| U65 7057:58714 | results | intro | copy, type | "Choose a sample citizen to check that your rules work as intended. See which rules they meet and which message they’d see. The data is made up.", body/small 14/24 `#4a5468` | the same text, 400 14px/24px rgb(74, 84, 104), 160, 168 | match (cosmetic 12, C2; was "… see which rules they meet and which messages they’d see. The data is made up, and nothing is shared.") |
| — | results | tab title | text | not drawn | "Test rules with sample citizen data · Konnekt" | match (`pageTitleOf()`) |
| — | results | test-day line | copy, type, place | not drawn (U65 Missing: FR-024e) | "Tested as if shared today, 09.11.2026." 400 14px/24px rgb(74, 84, 104) (as the intro; was 16px), 160, 216, 16 above the tabs | match (C6, FR-024e; the intro's look) |
| U65 7057:58717 | results | variant tabs | ⓘ | "(i)" after Standard only (its description icon), no variant ⓘ | no "+ Add variant" ⓘ; Standard's (i) only with a description (`BranchName`) | match (F27; T026's rows) |
| U65 7057:58753 | results | variant area | fill, border, radius | `#f6f8fb` (unbound fill), 1 `#e1e6f0`, 8 | rgb(242, 245, 251) (`layout-background-hued` `#f2f5fb`), 1px rgb(225, 230, 240), 8px (was 12) | match (§1.1 token; UNCERTAIN 2) |
| U65 7057:58754 | results | citizens row | box, padding, gap | 1118 × 64, pt 16 px 16, gap 8 | 1118 × 64 at 161, 312; 16px 16px, gap 8px (was 60 high: `-my-2` on "Generate all" dropped) | match |
| U65 7057:58755 | Mia selected | chip | border, padding, height, type | 2 `#1d56f0`, white, pl 12 pr 14, 44 high, 18 below the row's top, label/default 600 16/24 | 2px rgb(29, 86, 240), white, 12px / 14px, 44 high at row + 18, 600 16px/24px | match (F44) |
| U65 7057:58758 | not selected | chip | border, height | 1 `#e1e6f0`, 42 high, 19 below the row's top | 1px rgb(225, 230, 240), 42 high at row + 19 | match |
| U65 7057:59056, 7057:59061 | results | chip icon | glyph, colour | `icon-emergency_home-small` red / `icon-check_circle-small` green, 20, 8 before the name | `kern-icon--danger` rgb(196, 39, 28) / `kern-icon--success` rgb(29, 122, 46), 20 × 20, gap 8 | match (F44: name and icon, no outcome text) |
| — | results | chip | accessible name | not drawn | "Jonas Papadopoulos: doesn’t meet the rules of Standard" (`chipNameOf()`) | match (004-ACC.1) |
| — | keyboard | chips | keys, focus | not drawn | Right / End / Right (wrap) move the selection and the focus (tab pattern); 4px solid rgb(11, 18, 32) ring, offset 2; after a click no ring | match (004-ACC.2; F44) |
| U65 7344:96178 | results | "Generate all" | copy, look, box | "Generate all", tertiary small, refresh icon, 130 × 48 at the row's right end (x 972 in the row) | "Generate all" 600 14px rgb(29, 86, 240), `kern-btn--tertiary kern-btn--small` with `kern-icon--autorenew`, 130 × 40 + 4 margins at 1133 (row + 972) | match (F45, cosmetic 12; was "Generate all again") |
| U65 7057:58767 | Mia | data card | box, padding, radius | 410 wide, p 16, gap 8, radius 8, white, 1 `#e1e6f0` | 410 at 177, 16px, gap 8, 8px (was 12), white, 1px | match |
| U65 7057:58768 | Mia | data card head | heading, buttons | "Mia’s data" title/small 600 16/24; "Edit data" (pencil), "Generate again" (refresh) tertiary small; 48 high | "Jonas’s data" 600 16px/24px at card + 29; "Edit data", "Generate again" as drawn | match (T033's rows; "Edit data" opens the inline editor until T072) |
| U65 7057:58772 | Mia | rows | layout | one flat list, no document headings or column, starts 73 below the card's top | one list of `dl` rows at card + 73; each document's rows under a hidden `h3` ("Personal ID", "Driving licence") | match (F63, FR-043, CLAR #46) |
| U65 7057:59071 | Mia | row | box, label, value | 376 × 41, 1 top border `#e1e6f0`, py 8, gap 16; label body/small `#4a5468` 120; value body/small 240 | 376 × 41, the same; dt 120 at 194, dd 240 at 330 | match |
| U65 7057:59072 | Mia | date of birth | label | "Date of birth" | "Date of birth" (was "Date of birth (Age)", `dataRowLabelOf()`) | match (cosmetic 12, U66 #14) |
| U65 7057:59075 | Mia | date of birth | value | "08.07.2007" | "25.05.2006" (no age) | match (C6) |
| U65 7057:59073 | failing | value | dot, weight | 6 red dot, 6 before the text, label/small 600 | 6 × 6 `feedback-danger`, gap 6, 600; hidden "Fails a rule:" | match (K1) |
| U65 7057:59079 | Mia | licence classes | value | "B since 20.08.2025" | "B since 26.01.2026" | match (C6, `dataRowsOf()` + `dataRowTextOf()`) |
| U65 7057:59186 | Anna | licence classes | value | "B, BE since 02.05.2010" (one row per issue date) | classes with the same issue date in one row; a class without a shown issue date in its own "Licence classes" row ("C1") | match (C6, CLAR #46; T012's `dataRowsOf()`) |
| U65 7057:59084 | Mia | expiry date | label, value | "Expiry date", "Valid until 19.08.2040" | "Expiry date", "Valid until 08.12.2026" | match (C6) |
| U65 7057:58772 | Mia | rows | order | Date of birth, Nationality, Licence classes, Expiry date | Date of birth, Nationality, Expiry date, Licence classes (per document, catalog order) | F63 (grouped per document in catalog order) |
| U66 7057:59906 | Yusuf, no licence | empty value | text | "Not shared", dot, bold | "Not shared" (with the dot and 600 when failing) | match (004-S8.4.7) |
| — | edited | value | marker | not drawn | "Not shared · edited" (regular), hidden ", edited" | match (K2) |
| U65 7057:58809 | Mia | result card | box, padding, radius | 660 wide at 426, p 16, gap 8, radius 8 | 660 at 603 (177 + 410 + 16), 16px, 8px (was 12) | match |
| U65 7057:58811 | Mia | result heading | copy, type, row | "Result: doesn’t meet 2 rules", title/small 600 16/24 in a 48 row | "Result: doesn’t meet 4 rules", 600 16px/24px in a 626 × 48 row | match (C6) |
| U65 7057:59225 | Anna | result heading | copy | "Result: meets the rules" | "Result: meets the rules" | match |
| U65 7057:58826 | Mia | table head | columns, type | spacer 20, "Rule" at 40 (300 wide), "Message Mia reads" at 352; body/small `#4a5468`, pb 6, 1 bottom border | "Rule" at 660 (card + 40), 340 wide cell; "Message Jonas reads" at 972 (card + 352); 14px rgb(74, 84, 104), 6px | match |
| U65 7057:59087 | not met | row | tint, padding, icon, name | `#fef3f2` (unbound fill), py 10 px 8, red diamond 20 at 8, 10; name label/default 600 16 | rgb(254, 241, 240) (`feedback-danger-background` `#fef1f0`), 10 / 8, `kern-icon--danger` 20 × 20 at row + 8, + 10; 600 16px | match (§1.1 token; UNCERTAIN 2) |
| U65 7057:59089 | not met | row | statement, status | none | the statement as `RuleSentence` ("Personal ID · Date of birth (Age) ≥ is at least 21 years old"), then "Not met" 400 14px/24px rgb(11, 18, 32) | F42, FR-043 (C3: "·" after the document) |
| U65 7057:59091 | not met | message | text, type | "You need to be at least 21 years old.", body/small `#0b1220` | the same, 14px rgb(11, 18, 32) | match |
| — | couldn’t be checked | row | icon, status | not drawn (U06 #40: designer expects none; F11) | `kern-icon--help` rgb(74, 84, 104), "Couldn’t be checked" 14px rgb(11, 18, 32), the danger tint, the message | F42, F11 (baseline 004-S8.6.4) |
| U65 7057:59105 | met | row | padding, icon, name, message | p 8, green check 20, name body/default 400 16, "–" `#4a5468` | 8px, `kern-icon--success` rgb(29, 122, 46) at row + 8, 400 16px, "–" muted | match |
| U65 7057:59105 | met | row | statement | none | the statement (`RuleSentence`); hidden "Met" | F42 (met rows keep the statement) |
| U65 7057:59239 | Anna (meets) | list | head, columns | "Rules Anna meets", one column, no message column | "Rules Piotr meets", one column (626) | match (F3) |
| U65 7057:59533 | Anna (meets) | success box | presence | "Message Anna reads" box "Your wallet data meets the requirements. …" | none | F41 (CLAR #31 (a)) |
| — | a reported group | group row | statement | not drawn | "Group 01 · All rules must be met · Not met", its message; members indented and tinted | FR-051 (32) (the group frame's subtitle, `resultStatementOf()`; decision below) |
| U65 7057:58897 | results | "Publish" | behaviour | footer "Publish" | opens the publish dialog ("Ready to publish?", the summary); Escape closes it to the step | match (T076 builds the dialog's content) |
| U65 7057:58897 | results | "Publish" | icon | right arrow after the label | no arrow | closed (T084, 2026-11-09: the right arrow after "Publish") |
| U65 7114:49642 | results | scroll areas | each card | its own scroll area | the panel scrolls (where pinned), the cards stretch | F43 (CLAR #31 (c); T073); history: since bug v5-ui-fixes (2026-11-18) each card its own scroll area where pinned and side by side (Clarification 2026-11-18 #1; T073’s note) |
| — | 320 × 640 | data card | rows | not drawn | the label above the value (below `sm`), no horizontal scroll (`scrollWidth` 305) | FR-010 (R10) |
| — | 320 × 640 | result table | columns | not drawn | the two columns share the width (T034's container query); long rows wrap | FR-010 (unchanged) |

Open rows: one, outside T071's files: the footer "Publish" without its right arrow (`EditorFooter.tsx`).

**Decisions (T071):**

1. **Group statements in the results follow the group frame** (carried from T025): a group's row reads "All rules
   must be met" / "At least one rule must be met", the words of its frame on the rules step (FR-051 (32),
   `GROUP_FRAME_COPY.subtitles`), so one group reads the same on both steps. `rules/src/` stays untouched: the test
   step maps the rules package's `GROUP_SUBTITLES` text to the frame's (`resultStatementOf()` in `TestStep/utils.ts`,
   with tests); an unknown text stays as it is. The MCP keeps the rules package's wording.
2. **"Generate all"** is the citizens row's button (cosmetic 12; U65 #13, U66 #12 draw it in every results state).
   Quickstart V6.3 and F45 still say "Generate all again" for the same button (the baseline's name).
3. **The page title and intro** moved to `TEST_STEP_COPY.title` / `.intro` (as `RULES_COPY.title`), read by the
   editor's `pageTitleOf()`; `EDITOR_COPY.testRulesHint` is gone; `EDITOR_COPY.testRules` stays the rules step's
   "Test rules" button. The editor's `utils.test.ts` expectation changed for cosmetic 12 / C2.
4. **The test-day line** keeps its place (the first line of the step's content, 16 above the tabs) and now reads in
   the intro's type (body/small 14/24 muted; was 16px), since the frames draw none.
5. **The data card's rows** come from `dataRowsOf()` + `dataRowTextOf()` (carried from T012); `valueTextOf()` lost
   its unused `_today` (its tests' call sites changed); `PersonaData` / `DocumentValues` no longer take `today`.
   Labels: `dataRowLabelOf()` gives "Date of birth" for the date of birth, any other row its field's label. Each
   document's rows are a `dl` under a hidden `h3` with the document's name (004-S8.4.2), with no gap, so the list
   reads as one. Below `sm` a row's label sits above its value (at 320 px the 120 px label left ~80 px for the value,
   which broke words like "Afghanis|tan").
6. **Radii**: the variant area and both cards take radius 8 (`rounded-kern-default`; were 12) as the frames draw.

**Open for the user (T071, not core):**

1. **"Generate all" vs "Generate all again" (copy; not core).** Built as the frames and cosmetic 12 have it; quickstart
   V6.3 and F45's wording still name "Generate all again". If the coordinator reads F45 as keeping "Generate all
   again", it is `TEST_STEP_COPY.generateAll`.
2. **Two fills the frames draw unbound (styling; not core).** The variant area `#f6f8fb` (token
   `layout-background-hued` `#f2f5fb` kept) and the reported rows' tint `#fef3f2` (token `feedback-danger-background`
   `#fef1f0` kept). Both differ by 2–4 per channel; adding raw values would need `@theme` tokens in `index.css`.
3. **Group statements (copy; not core).** Decision 1 (no spec item settles it; the task said "decide here").

### U66 (`7058:60514`), U67, U68 "Edit data" and "Generate again" (S13) — T072, 2026-11-09

Setup:
- Browser: Chromium (playwright-core 1.48.2, `/usr/bin/chromium`), signed in as `designer`. Sizes: 1455 × 900
  (body 1440; the frames are 1440 × 900) and 320 × 640.
- Fonts: `document.fonts.check('400 14px "Fira Sans"')` true.
- Draft: T072's own "T072 Passenger transport licence" (step test; Personal ID: Date of birth, Nationality; Driving
  licence: Expiry date, Licence classes; Rule 01 · Minimum age 21, Rule 02 · Class B for 2 years, Rule 03 · Licence
  not expired, Rule 04 · German or EU citizen), deleted at the end. Nothing saved: no non-GET request in any walk
  (the dialog's "Save and test" is local editor state).
- The personas are random per open: Figma's sample names and values are not copy (FR-002).
- Figma: `get_design_context` on the dialog `7058:60639` (U66) and the toast `7058:61203` (U67); screenshots of
  `7058:60670` (U67 frame 5, the error), `7058:60945` (U67 frame 6, saved with the toast), `7058:61209` (U68 frame 7,
  the question). `7058:60806` / `7058:60824` (intro, buttons) are inside the dialog read at U66 and match it; U68
  `7057:59952` (frame 8, Mia stays selected on Ambulance) is T071's / T073's chips behaviour and the regeneration
  question's node `7058:61334` is U04's (T046's table). Every frame matches its audit inventory (U66.md, U67.md,
  U68.md); none has changed.
- Scripts: `<scratchpad>/pw/t072-open.mjs`, `t072-flow.mjs`, `t072-err.mjs`; screenshots in
  `<scratchpad>/phase7/T072/`.

| frame | state | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|
| U66 7058:60639 | dialog | dialog | box, scrim | 600 wide, radius 12, 1px border, the shade scrim at 72 % | 600 × 848 at 420, 26 (`ConfirmDialog wide`), the same scrim; the scrim closes it (T035 `dismissOnScrim` on) | match |
| U66 7058:60644 | dialog | title | copy, type | "Edit Mia’s data", title/large 600 24/32 `#0b1220` | "Edit Emma’s data", 600 24px/32px rgb(11, 18, 32) (`EDIT_DATA_COPY.title(dataHeadingOf())`) | match |
| U66 7058:60649 | dialog | intro | copy, type | "Change the values to try a particular case. Results update when you save.", body/default 16/24 `#4a5468` | the same text, 400 16px/24px rgb(74, 84, 104), 536 wide; the dialog's `aria-describedby` | match (FR-042) |
| U66 7058:60648 | dialog | sections | gaps | intro → Name 24, Name → "Personal ID" 24, heading → fields 16, sections 24 | 24 (intro 98–122, label 146), 24 (input end 234, h3 258), 16 (h3 end 282, label 298), 24 | match |
| U66 7058:60652 | dialog | Name | field | "Name", input 536 × 48, fill `#f2f5fb`, 2px bottom `#22293a`, radius 4 | the same KERN `kern-form-input` (T044), 536 × 48; focus on open | match (004-ACC: the first field takes the focus) |
| U66 7058:60653, 7058:60658 | dialog | document headings | copy, type | "Personal ID", "Driving licence", title/small 600 16/24 | `h3` "Personal ID", "Driving licence", 600 16px/24px rgb(11, 18, 32) | match (U66 #29, #30; T071 note) |
| U66 7058:60655 | dialog | Date of birth row | layout | two fields of 260, 16 apart: "Date of birth" `08.07.2007`, "Age today" `19` | 260 + 16 + 260 (452 / 728); "Date of birth" (`TEST_STEP_COPY.dateOfBirth`; the rules say "Date of birth (Age)") | match |
| U66 7058:60657 | dialog | "Age today" | look | no fill, 1px bottom border (read-only look) | an input like the date (fill, 2px) | F10 (FR-007: either changes the other; T044's decision) |
| U66 7058:60660 | dialog | "Licence classes" row | layout | "Licence classes" and "Class B since" side by side | "Licence classes" starts a row (`sm:col-start-1`), its class dates beside and under it | match |
| U66 7058:60661 | dialog | Licence classes | control | a plain text input "B" | the values picker by code with descriptions, "Search classes" (`ValuesField`) | F40 (FR-042d) |
| U66 7058:60662 | dialog | class date | label | "Class B since" | "Class B since" (`editorLabelOf()`; the rules say "Licence class B – Issue date") | match (F40) |
| U66 #31 7058:60648 | dialog | Nationality, Expiry date | presence | no fields | "Nationality" (the picker by label, multiple) and "Expiry date" (dd.mm.yyyy) | F40 (FR-042d) |
| U66 7058:60668 | dialog | buttons | copy, box | "Cancel" secondary, "Save and test" primary, 260 × 48 each, 16 apart | the same, 260 × 48 at 452 / 728 | match |
| — | dialog | grid | order | not drawn | the document's fields two to a row in catalog order (Expiry date before Licence classes here); the date of birth takes its row | FR-005 (catalog order, F9) |
| U67 7058:60812 | a date that doesn’t exist | Date of birth | error | "31.02.2007", 4px red bar, pink fill, red bottom border, danger icon, "Enter a date that exists, e.g. 28.02.2007." wrapping in the column | bar 4px rgb(196, 39, 28) with 16 padding, fill rgb(254, 241, 240), 2px rgb(196, 39, 28) bottom (unfocused), icon 24px danger, 16px/24px rgb(11, 18, 32), wraps after "e.g."; `aria-invalid`, `aria-describedby` → the error | match (004-S8.5, 001-S7.5) |
| U67 7058:60670 | a date that doesn’t exist | "Save and test" | behaviour | frame name "Save and test stays until fixed"; data card still 08.07.2007 | stays enabled; a press saves nothing, keeps the dialog open and moves the focus to the first invalid field; the card unchanged | match (FR-042b) |
| — | dialog | age ↔ date | behaviour | not drawn | "01.01.2015" gives "Age today" 11; "Age today" 30 gives "01.01.1996" | match (FR-007) |
| — | an empty name | Name | error | not drawn | "Enter a name." under the field; blocks the save | match (W11) |
| U67 7058:61203 | saved | toast | look | success: `#1d7a2e`, white filled check 20, 8 before the text, 14/24 white, radius 8, p 16 | rgb(29, 122, 46), 56 high, centred 96 above the window's bottom (`Toast`, `kind: 'success'`) | match (T036 pattern) |
| U67 7058:61203 | saved, an outcome now met | toast | copy | "Results updated. Mia now meets Rule 01." | "Results updated. Piotr now meets Rule 01 · Minimum age 21." (the seeded rule is named so) | match (FR-042c) |
| — | saved, an outcome no longer met | toast | copy | not drawn | "Results updated. Piotr no longer meets Rule 01 · Minimum age 21." | FR-042c (decision 2) |
| U67 7058:61193, 7058:61027 | saved | data card, results | update | "08.07.2004 · edited", "Result: doesn’t meet 1 rule" | "01.01.1996 · edited", heading and rows updated in the same render; the focus back on "Edit data" | match |
| — | saved | announcement | live region | toast announced | the toast's `role="status"` region; no per-variant hidden announcement | FR-042 (drops 004-S8.10.3) |
| — | clearing fields | Expiry date | behaviour | not drawn (W14) | cleared and saved → "Not shared · edited" with the failing dot; "Rule 03" no longer met | match (004-S8.5, W14) |
| — | class dates coming back | Class B since | behaviour | not drawn (W14) | B removed in the picker → "Class B since" goes; B added again → it comes back with "07.12.2012" | match (W4, W14) |
| — | values menu | Licence classes | placement | not drawn | opens below the field (400 step), the dialog scrolls to show it; "Done" in view at the dialog's bottom; Escape closes the menu, not the dialog | match (carried from T027) |
| — | dialog | Cancel, ×, Escape, scrim | behaviour | × drawn | each drops the changes and returns the focus to "Edit data" | match |
| — | keyboard | Tab | order | not drawn | Name, Date of birth, Age today, Nationality, Expiry date, Licence classes, Class B since, Cancel, Save and test, ×; the page behind is inert | match (004-ACC) |
| U68 7058:61333 | an edited persona | "Generate again" | question | "Generate new data for Mia?", "Your changes to Mia’s data will be replaced. The other two citizens stay as they are.", "Cancel" / "Generate new data", 480 wide | the same texts, 480 × 256 at 480, 322 | match |
| — | an unedited persona | "Generate again" | question | not drawn | no question, generates at once | match (004-S8.3.5, F45) |
| — | an edited persona | "Generate all" | question | not drawn | "Generate new data for all citizens?", "Your changes to Mia’s data will be replaced."; the name is kept after generating | match (W9, W14; R10) |
| U66 7344:96200 | results | "Generate all" | presence | in every results state | present after generating, editing and saving | match (F45; cosmetic 12) |
| — | 320 × 640 | dialog | layout | not drawn | 273 wide (16 gutters), one field per row, no horizontal scroll (`scrollWidth` 273), the dialog scrolls | match (FR-010) |

Open rows: none.

**Decisions (T072):**

1. **The dialog edits a copy** (`editDataReducer` in `TestStep/utils.ts`, tested): every valid entry applies to the
   copy at once (so W4's class dates come and go inside the dialog), an invalid one shows its error and blocks
   "Save and test" (focus to the first `aria-invalid` field). "Save and test" hands the step the trimmed name and the
   values that differ (`changedValuesOf()`, by `sameValue()`); the step dispatches the reducer's `setValue` per value
   with empty `before` / `after` (so no per-variant hidden announcement, FR-042 dropping 004-S8.10.3), `rename()`
   when the name changed, then `stopEditing()`. `PersonaState.editing` is the dialog's open state, so a run that
   regenerates the persona closes it. `usePersonas.ts` unchanged.
2. **The toast's wording beyond the drawn case** (FR-042c; decide-here): "Results updated." then, for the shown
   variant's top-level rules and groups, "<first name> now meets <list>." and "<first name> no longer meets <list>."
   (`savedToastOf()`, lists as "Rule 01 and Rule 03"); only "Results updated." when no outcome moved. No toast when
   nothing changed (the dialog just closes). `kind: 'success'` (carried from T036).
3. **The toast is the step's own `<Toast>`** in `TestStep/index.tsx` (the editor's toast slot isn't reachable without
   editing `FormConnectionEditor/index.tsx`); it goes with the step. In theory the editor's failed-save toast could
   show at the same time on the test step (two regions).
4. **Two columns per document** (`DocumentFields`, `sm:grid-cols-2`): the frames draw rows of two ("Date of birth" |
   "Age today", "Licence classes" | "Class B since"); the date of birth spans the row, "Licence classes" starts one.
5. **"Age today" stays an input** (T044's decision, F10/FR-007), not the frame's read-only look.
6. **"Done" is gone** with the inline editor (`TEST_STEP_COPY.done` removed); "Edit data" focuses itself on press
   (Safari) so that the dialog returns the focus there.

**Open for the user (T072, not core):**

1. **Toast wording for undrawn cases (copy; not core)**: decision 2 ("no longer meets", several items, no outcome
   moved). No spec item words them.
2. ~~**Two toast regions on the test step**~~ closed by the coordinator (2026-11-09): `TestStep` takes `saveFailed` (the editor passes `saveFailureToast !== null`) and drops its saved toast when the failed save's toast shows, one toast at a time (R8). Was: decision 3; "one toast at a time" (R8) holds unless the
   editor's failed-save toast and this one overlap.

### U39, U47 Marks, the link strip and removing in variants (S11) — T065, 2026-11-09

How I checked:
- playwright-chrome MCP (Chromium) at 1455 × 1000 (body 1440) and at 320 × 640, signed in as `designer`. Fonts: `document.fonts.check` true for Fira Sans 600 / 400 14px.
- Own drafts, both deleted at the end (404 afterwards), and the browser's local draft of the first removed:
  - "T065 variants": U39/U47's tree. Standard = Rule 01 (age ≥ 21), Rule 02 (expiry ≥ 6 months), Group 01 (OR) [Rule 03 (C, D), Sub-group 01 (AND) [Rule 04 (B, BE), Rule 05 (age ≥ 21)]]. Ambulance, based: Group 01 switched to AND (changed), Rule 05 changed to 19, Rule 06 (C1) added. School transport, based, unchanged.
  - "T065 empty Standard": Standard without rules, Ambulance based on it.
- Every removal, restore and Standard deletion was local editor state; nothing was saved.
- Figma: `get_design_context` of the link strip `6344:60085`, the dialog `6185:8847` and Rule 05's row `6163:5453`; screenshots of `6185:8555`, `6185:8805`, `6185:41146`, `6185:41589`, `6163:5419`, `6163:5841`, `6324:39426`, `6344:53697`. Every frame matches its audit inventory; none changed since the audit.
- Sample data: Rule 05 at 19 sits beside Rule 01 at 21, so the checks put an info finding on it (spec 003); that doesn't change the rows below.

| frame | state | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|
| U47 6344:60085 | the link strip | strip | box, padding, gap, fill, corners | 161, 282, 1118 × 56; 16; 8; `feedback-info-background` `#e0f2fe`; top 12 | 161, 282, 1118 × 56; 16px; 8px; rgb(224, 242, 254); 12px | match |
| U47 6344:19386 | the link strip | link icon | place, size | 177, 300, 20 × 20 | 177, 300, 20 × 20 | match |
| U47 6344:19387 | the link strip | title | text, place, font, colour | "Linked to Standard" at 205, label/small 600 14/24, `feedback-info` | the same at 205, 600 14px/24px, rgb(2, 115, 174) | match (§1.5 AA value of `feedback-info`) |
| U47 6344:19388 | the link strip | text | text, place, font | "Rules you don’t change follow and update with Standard." at 335, body/small 400 14/24 | the same at 335, 400 14px/24px | match (was "Rules you don’t change here update with Standard.") |
| U47 6185:8555 (6344:60085) | 6.1: rules removed | text | removed count | "2 of 3 Standard rules are removed here." before the text, in the same line | "1 of 5 Standard rules is removed here. Rules you don’t change …" with Rule 02 removed (the draft's Standard has 5 rules) | match (FR-051 (38); the count and the singular are the data) |
| U47 6185:41146 (6344:60090) | 6.3: a group removed | text | removed summary | "Group 01 is removed here." | "Group 01 is removed here." | match |
| U47 6185:41589 (6344:60095) | 6.4: a sub-group removed | text | removed summary | "Sub-group 01 is removed here." | "Sub-group 01 is removed here." | match |
| — | a group and a rule removed | text | removed summary | not drawn | the count over every removed rule, also those in the group ("3 of 3 Standard rules are removed here." in `utils.test.ts`; not opened in the browser) | match (Decision 2) |
| U39 6163:5841 (3.7) | Rule 02 removed | strip | removed count | none drawn | "1 of 5 Standard rules is removed here." | FR-051 (38) (U47 is the frame that draws it) |
| — | nothing removed, after Restore | strip | text | U39 6163:5419: the text alone | the text alone | match |
| — | 320 × 640 | strip | wrap | — | 17, 271 × 272, wraps; `scrollWidth` 305, no horizontal scroll | match (FR-010) |
| U47 6185:8569, 6185:8572 | 6.1: a removed rule | connector before it | opacity | 40 % | pill and line at 0.4 (`Connector faded`) | match (FR-051 (39)) |
| U47 6185:8555 | 6.1 | connector after a removed rule, before an active item | opacity | — (U39 3.7: the connector after Rule 02 solid) | solid | match |
| U47 6185:41163, 6185:41170, 6185:41177 | 6.3: Group 01 removed | connectors before and inside it | opacity | 40 % | before Group 01 0.4; inside (OR, AND) 0.4; after it (before Rule 06) solid | match |
| U47 6185:41620 | 6.4: Sub-group 01 removed inside Group 01 | connector before it, inside the group | opacity | 40 % | 0.4 (`GroupListItem` passes `GroupFrameMember.faded` for a removed or dissolved member) | match (was solid: new in T065) |
| U47 6185:41610 (#35) | 6.4: Group 01 left with Rule 03 and the removed sub-group | Group 01 | state | stays an active group | dissolved in Ambulance (F13): Rule 03 moves before it, Group 01 shown removed, holding the removed sub-group | F13 (002-S4.18, the baseline; the audit's CONFLICT ? #35) |
| — | a changed group dissolved in its variant | frame | fill | not drawn | `layout-background-hued` (removed look); was the purple "changed" tint with "Removed here" | match (Decision 3) |
| U47 6185:8570 | removed rule | row | look | faded, struck, "Removed here", ⋯ | as T024's §5.1 rows (content 0.4, struck, mark 1, ⋯) | match |
| U47 6185:8570 (#15) | removed rule | message line | shown | hidden | shown, faded and struck | F36 (FR-040) |
| U47 6185:8802 | removed rule's ⋯ | entries | — | "Restore rule" with the undo icon | "Restore rule" · "Copy link", no icons | F29 (007-S4.2); the icon: T055/T058 (Restore has no icon) |
| U47 6185:41167 | 6.3: removed group | name | font size | 16 (a raw override on the struck name) | 18 (`title/default`, struck, 0.4) | Decision 1 (closes T025's deferred row) |
| U47 6185:41586 | 6.3: removed group's ⋯ | entries | — | "Restore group" | "Restore group" · "Copy link" | F29 |
| U47 6185:42029 | 6.4: removed sub-group's ⋯ | entries | — | "Restore sub-group" | "Restore sub-group" · "Copy link" (Sub-group 01's menu before: "Add message" · "Copy link" · "Remove from Ambulance") | match / F29 |
| U47 6185:41168, 6185:41182 (#31) | members of a removed group | ⋯, "+ Add rule" | shown | dimmed ⋯ on each member, the sub-group's dimmed "+ Add rule" | no ⋯, no "+ Add rule" in a removed group | baseline (T055: no menu on faded items; 002-S4.7: nothing in a removed group is edited) |
| U47 6185:41178 (#32) | changed rule in a removed group | mark | shown | no "Changed here" | "Changed here" at full colour (opacity 1) | F36 (FR-040) |
| U47 6185:41178 | changed rule in a removed group | row tint | opacity | `variant/changed-background` at 40 % | full `#f8f1fc` (rgb(248, 241, 252)) on the row inside the faded sub-group | open item, optional per the task: `RuleRow`'s tint (not T065's files; note for phase 11) |
| U39 6163:5440 (3.6) | Group 01's AND/OR changed | group frame | fill, border, mark | `#f8f1fc`, 3 `#1d56f0`, "Changed here" `#8a22b5` on white before ⋯ | rgb(248, 241, 252), 3px rgb(29, 86, 240), "Changed here" before ⋯ | match (T025's §5.1 U58 rows) |
| U39 6163:5440, 6163:5447 | Group 01's AND/OR changed | subtitle | text | "All rules must be met" | "All rules must be met" | match (FR-051 (32)) |
| U39 6163:5442 | Group 01's AND/OR changed | connector inside | look | the plain AND pill | the plain AND pill | match |
| U39 6163:5453 | changed rule | row | mark, tint | "Changed here", "Variant outline" tint 8 in from the sub-group | "Changed here"; tint `#f8f1fc` 207–1239 (8 in from the sub-group's 199–1247) | match |
| U39 6163:5462 | added rule | row | mark, tint | "Added here", tint | "Added here", tint | match (T019, T024) |
| U39 6324:39971 (3.8) | changed rule's ⋯ | entries | — | Edit rule · Copy to variant · Group with other rules · Reset to Standard · — · Remove from Ambulance | as T058's U56 rows (Copy link before the divider) | match / F29 (T058's table) |
| U39 6344:53750 (3.9) | linked rule's ⋯ | entries | — | Edit rule · Group with other rules · — · Remove from Ambulance | as T058's U56 10.5 row | match / F29 |
| U47 6185:8847 | "Delete Rule 01?" in Standard with two based variants | dialog | box | 480 × 304 | 480, 348, 480 × 304; body at 32, 72, 416 × 104 | match |
| U47 6185:8847 | "Delete Rule 01?" | body | text, font | "This deletes it from Standard and from the variants that follow it: Ambulance and School transport. If a variant changed this rule, it keeps its own version.", body/large 18/24 `#0b1220` | the same text, 18px/24px rgb(11, 18, 32) | match (CLAR #56; was "This rule will be removed from Standard and from the variants that follow it. … You can undo this right after.") |
| U47 6185:8847 | "Delete Rule 03?" (Group 01 left with one member) | body | text | the body as drawn | the drawn body + "Group 01 is left with one rule, so it’s ungrouped in Standard and its variants." (+ "Ambulance’s changes to Group 01 go with it." where Ambulance changed Group 01) | W12 (002-S4.17; FR-037 "the dissolving group's variant changes named"); UNCERTAIN 1 |
| U47 6185:8846 | delete dialog | scrim | click | scrim | a click on the scrim closes the dialog, nothing deleted | match (T052/T057 decision) |
| — | Standard deletes Rule 02, which Ambulance removed | Ambulance | list | not drawn (002-S4.28) | Rule 02 gone from Ambulance; the strip loses its count | W12 (baseline) |
| — | Standard deletes Rule 05, which Ambulance changed | Ambulance | mark | not drawn (002-S4.27) | Ambulance's Rule 05 stays, "Added here"; toast "Rule 05 deleted." with "Undo" | W12 (baseline) |
| — | Standard deletes Rule 05: Sub-group 01 left with one rule | Standard, Ambulance | groups | not drawn | the dialog says so ("Sub-group 01 is left with one rule, so it’s ungrouped in Standard and its variants."); ungrouped in both | W12 (`rules/src/branches.ts` unchanged) |
| U05 #3 (6711:39381) | Standard without rules, Ambulance based on it | Ambulance | link strip | "not linked" drawn | the strip "Linked to Standard / Rules you don’t change follow and update with Standard." above "No rules yet" | F37 |

Open rows: one, optional by the task (the changed member's 40 % tint in a removed group, `RuleRow`).

**Decisions (T065):**

1. **A removed group's struck name keeps `title/default` 18** (carried from T025, "decide here"). U47 6185:41167 draws a raw 16 px override on the struck "Group 01" only; the active Group 01 in 6.4 and every other group frame draw 18, and a sub-group's 16 is its own level's style. A removal doesn't change the size that tells the levels apart, so the component's style stays. `GroupHeader` unchanged. Not UNCERTAIN: the overridden instance reads as a slip in one frame.
2. **The strip's summary** (`linkStripSummaryOf` in `RulesStep/utils.ts`, with tests): no sentence while nothing of Standard's is removed (also while Standard has no rules, F37); "Group 01 is removed here." / "Group 01 and Sub-group 03 are removed here." while only groups are removed (the outermost removed ones); otherwise "N of M Standard rules are removed here.", M = the rules the variant inherits (changed ones and those it grouped in a group of its own included, added ones not), N = those removed on their own or with a group around them. A group dissolved there (F13) removes nothing: its remaining rule counts. Singular: "1 of 3 Standard rules is removed here.", "1 of 1 Standard rule is removed here.".
3. **A group dissolved in its variant shows the removed look** (`GroupListItem` passes `mark` 'removed' while `inactive`): a changed group that dissolves kept its purple "changed" fill under "Removed here"; its changes go with it (002-S4.17), and U47 draws a removed group with its own fill.
4. **Faded connectors inside groups**: `GroupListItem` now sets `GroupFrameMember.faded` for a removed or dissolved member (U47 6185:41620), as the top level did (FR-051 (39)). After a removed item the connector stays solid (U47 6.1, 6.3; U39 3.7).

**Open for the user (T065, not core):**

1. **The drawn delete body and "You can undo this right after." (copy; not core).** CLAR #56 gives a Standard rule with variants "U47's body as drawn", which has no undo sentence; I dropped it there only (groups and the other rule dialogs keep it). Where the deletion dissolves a group, the baseline's sentences follow the drawn body (FR-037: "and the dissolving group's variant changes named"). The drawn body's "If a variant changed this rule, it keeps its own version." replaces the baseline's naming of the variants that changed it ("Ambulance changed it and keeps its own version.", 002 F14); `RULES_COPY.keptByVariants` is gone. If the undo sentence should stay, it is one line in `deleteDialogText` (and three test strings).
2. **The strip's mixed case (copy; not core).** A removed group together with a rule removed on its own isn't drawn; the count sentence covers it (Decision 2).

### U57, U58, U40 A variant's menus and select mode (S11) — T066, 2026-11-09

How I checked:
- Browser: playwright-chrome (Chromium), signed in as `designer`, at 1455 × 1000 (body 1440) and 320 × 640. Fonts: label/small 600 14px/24px Fira Sans in every entry (computed).
- My own drafts, seeded with `<scratchpad>/phase7/T066/seed.py` (T065's shapes) and deleted at the end (`cleanup.py`). Their local drafts were removed from `localStorage` too. Nothing was saved: every change was local editor state.
  - "T066 U57": Standard (U57's tree), Ambulance as 10.8 (Rule 05 changed to 19, Rule 06 C1 added, Group 03 added with Rule 07 and Rule 08), School transport as 10.6 (Rule 02 changed to 12 months, Rule 06 D1 added).
  - "T066 U58": Standard, Ambulance as 10.9 (Group 01 changed to AND, Rule 05 changed to 19, Rule 06 added).
  - "T066 U40": Standard, Ambulance as 3.10 (Rule 05 changed, Rule 06 added).
  - The sub-group is called "Sub-group 02" (its id is `group-2`): "Sub-group 01" is reserved for the group numbered 01 (W12), which disabled "Test rules" in a first seed. Group numbers follow the counters (the drawn "Group 02" is "Group 03" here). Sample data.
- The findings banner and notes that the sample data gives (Rule 05 the same as Rule 01; Group 03 making Rule 05 redundant) are T069's / T070's; U57, U58 and U40 draw no findings.
- The menu's own geometry (40 px rows, 8 padding, divider, shadow, keyboard) is T021's §5.1 rows; entry icons were checked by T058. These rows check what a variant puts in the menus and select mode.

| frame | state | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|
| U57 6522:32732 (10.6) | School transport, Rule 02 changed | entries | order, labels | Edit rule · Copy to variant · Group with other rules · Reset to Standard · — · Remove from School transport | Edit rule · Copy to variant · Group with other rules · Reset to Standard · Copy link · — · Remove from School transport | F29 (Copy link last before the divider) |
| U57 6522:32732 | Rule 02 changed | "Reset to Standard" | icon, colour | "Icon/Reset · restore" 6342:19343, 20, `#0b1220` | `reset-restore.svg`, the same path and fill as Figma's asset; 20 × 20; rgb(11, 18, 32) | match |
| U57 6522:32732 | Rule 02 changed | "Copy to variant", "Remove from …" | icons, colour | "Icon/Copy to · tab arrow" 6343:19314; "Icon/Remove from this variant · minus circle" 6529:39063, `#c4271c`, after the divider | `copy-to-variant.svg`, `remove-circle-danger.svg` (byte-identical paths to Figma's assets); "Remove from School transport" rgb(196, 39, 28) after the divider | match |
| U57 6522:32732 | Rule 02 changed | "Copy to variant" | presence | shown (FR-036f: Ambulance could receive it) | shown: Ambulance holds Standard's version (6 months), not the changed one | match (FR-036f) |
| U57 6522:32732 | Rule 02 changed | menu | place | below the ⋯, right edges aligned | 8 below the ⋯, right edges aligned (⋯ 1223–1255, menu 1035–1255) | match |
| U57 6522:32732 (metadata) | Rule 02 changed | menu | width, label | 257 wide: the menu grows to fit "Remove from School transport" on one line (entries 239, label 195) | 220 wide (`ACTION_MENU_WIDTH`); the label wraps to two lines (entry 64 high) | **open** (UNCERTAIN 1; `components/ActionMenu`, outside T066's files) |
| U58 6522:33026 (metadata) | Ambulance, Group 01 changed | menu | width, label | 240 wide (entries 222, "Remove from Ambulance" 159 on one line) | 220; "Remove from Ambulance" wraps to two lines | **open** (the same row as above) |
| U57 6522:32824 (10.7) | School transport, Rule 05 (linked, unchanged) | entries | — | Edit rule · Duplicate · Copy to variant · Group with other rules · — · Delete rule (anchored at Rule 05; the frame title says "new addition") | Rule 05: Edit rule · Copy link · — · Remove from School transport (no Copy to variant: Standard and Ambulance hold it; no grouping in a sub-group) | F68 (a linked rule has no Duplicate and no Delete), FR-036f, F30 |
| U57 6522:32824 | School transport, Rule 06 ("Added here") | entries | — | (the drawn menu read as Rule 06's, F68) | Edit rule · Rename · Duplicate · Copy to variant · Group with other rules · Copy link · — · Delete rule | F68 (Rename and Copy link added, F29) |
| U57 6522:32682 | School transport, Rule 01 (linked, unchanged) | entries | — | not drawn | Edit rule · Group with other rules · Copy link · — · Remove from School transport | match (FR-036e/f) |
| — | School transport, Group 01 / Sub-group 02 (linked) | entries | — | not drawn | Add message · Copy link · — · Remove from School transport | match (FR-036e: no Rename, Ungroup) |
| U57 6522:32923 (10.8) | Ambulance, Group 03 ("Added here", Group 02 in Figma) | entries | — | Add message · Duplicate group · Group with other rules · Ungroup · — · Delete group | Rename · Add message · Ungroup · Copy link · — · Delete group | F69 (Rename), F29 (Copy link), CLAR #64 (no grouping on a group), F8 deferred ("Duplicate group"; T058 UNCERTAIN 3, accepted) |
| U57 6522:32862 (10.8) | Ambulance, Rule 07 in the added Group 03 | entries | — | not drawn | Edit rule · Rename · Duplicate · Copy to variant · Group with other rules · Copy link · — · Delete rule | match (not linked: the whole menu; Rule 08 is a neighbour in the group) |
| U57 6522:32897 (10.8) | Ambulance, Rule 05 changed in Sub-group 02 | entries | — | not drawn ("Changed here" inside an inherited sub-group) | Edit rule · Copy to variant · Reset to Standard · Copy link · — · Remove from Ambulance (no grouping in a sub-group) | match (FR-036e, F30) |
| U58 6522:33026 (10.9) | Ambulance, Group 01 changed (holds Sub-group 02) | entries | order, labels | Add message · Group with other rules · Reset to Standard · — · Remove from Ambulance | Add message · Reset to Standard · Copy link · — · Remove from Ambulance | F30 / CLAR #48 (no grouping on a group holding a sub-group; the drawn entry is a Figma error), F29 (Copy link) |
| U58 6522:33026 | Group 01 changed | icons, colours | per entry | "Icon/Error message · speech bubble", "Icon/Reset · restore", minus circle `#c4271c` | message-alert.svg, reset-restore.svg, remove-circle-danger.svg; ink rgb(11, 18, 32), "Remove from Ambulance" rgb(196, 39, 28) after the divider | match |
| U58 6522:33026 | Group 01 changed, 1455 × 1000 | menu | direction | down (the frame is 1675 tall) | up, 8 above the ⋯ (211 high, no room above the footer at this height) | match (R10: the direction is measured) |
| — | Group 01 changed → "Reset to Standard" | group | operator, mark | not drawn | "All rules must be met" → "At least one rule must be met" (Standard's OR); "Changed here" gone; Rule 05 inside keeps its "Changed here" (a member's own change) | match (002-S4.8; `edits.resetItem`) |
| — | after "Reset to Standard" (rule, by keyboard: Enter on ⋯, ↓ ×3, Enter) | Rule 02 | value, mark, focus, toast | not drawn | 12 → 6 months from now; "Changed here" gone; the focus back on "Actions for Rule 02" (closed); no toast | match (baseline: Undo/Reset has no toast) |
| — | after "Reset to Standard" | Rule 02's menu | entries | not drawn | Edit rule · Group with other rules · Copy link · — · Remove from School transport ("Copy to variant" gone: every variant holds Standard's version again) | match (FR-036f) |
| — | Ambulance, Rule 05 in Sub-group 02 → "Reset to Standard" | Rule 05 | value, mark | not drawn | 19 → 21 years old; mark gone | match |
| U58 6522:33103 (10.10) | removed rule | menu | entries | Restore rule (only) | Restore rule · Copy link | F29 (T058's row; 007-S4.2) |
| U58 6522:33090 (10.10) | two rules removed | link strip | text | "2 of 3 Standard rules are removed here. Rules you don’t change follow and update with Standard." | `linkStripSummaryOf` (T065's rows) | match (T065) |
| U40 6344:53751 (3.10) | Ambulance, "Group with other rules" on Rule 01 | entry, focus | behaviour | not drawn (FR-036i) | select mode starts with Rule 01 ticked; the focus on "Select Rule 01" | match (FR-036i) |
| U40 6616:44263 (3.10) | one ticked | bar | text | not drawn | "Choose at least one more rule to group with Rule 01." | match (T059) |
| U40 6616:44263 | two ticked (Rule 01, Rule 02) | bar | text | "2 rules selected. The group is added in Ambulance only. Standard stays the same." | the same | match |
| U40 6616:44263 | two ticked | bar | place, fill, corners | under the link strip, square, `#e0f2fe`, 56 high | 161, 338, 1118 × 56 (strip 281–337); rgb(224, 242, 254); radius 0 | match (T059's `belowStrip`) |
| U40 6344:53808 – 53810 | two ticked | boxes | which | top-level rules only: Rule 01 ✓, Rule 02 ✓, Rule 06; none on Group 01 or its members | "Select Rule 01" ✓, "Select Rule 02" ✓, "Select Rule 06"; none on groups or in them | match (CLAR #61, #64) |
| U40 6344:53808 | select mode | box | offset in the row | about level with the rule's name | 22 below the row's top (T059's U36 offset) | T059 UNCERTAIN 3 (accepted) |
| U40 6344:53805 | select mode | "Test rules" | state | disabled, "Finish grouping first" as text before it | `aria-disabled="true"`, "Finish grouping first" on hover and focus | W21 (T056's, T059's row) |
| U40 6344:53826 (3.11) | grouped | new group | place, mark | "Group 02" at the top where Rule 01 stood, "Added here", purple tint and border, Rule 01 AND Rule 02, its own "+ Add rule" | "Group 03" first, "Added here", holding Rule 01 and Rule 02 with "+ Add rule"; Standard unchanged (Rule 01, Rule 02, Group 01) | match (002-S4.20; the number is the counter's) |
| U40 6344:53871, 6344:53872 | grouped | Rule 01, Rule 02 in the new group | link icon | a link icon on each ("rules inside stay linked") | no link icon; no mark (they stay linked) | FR-038 (the link icon on every linked rule or none) |
| U40 6344:53822, 6344:53865 | grouped | top-level connectors | — | none between Group 02 and Group 01; one after Rule 06 before "+ Add rule" | one connector between every two items (Group 03 AND Group 01 AND Rule 06), none after the last | FR-038 ("exactly one connector sits between items") |
| U40 6344:53873 | grouped | toast | text, type, action | "Grouped in Ambulance only. Standard stays the same." green, "Undo" | the same, `success` (green, filled check), "Undo" | match (cosmetic 8; was "Rule 01 and Rule 02 in Ambulance are now Group 03. Standard stays the same.") |
| U40 6344:53811 | grouped | select mode, focus | — | bar and boxes gone | bar and boxes gone; the focus on Group 03's header; "Test rules" enabled | match |
| U40 6961:56291 (3.17) | Standard | tab, rules | — | "Standard" alone with ⋮ and its (i) tooltip; Rule 05 21 years | Standard's Rule 05 reads 21 while Ambulance's reads 19 | match (the tab and tooltip are T064's rows, the ⋮ T067's) |
| — | every menu of the U58 draft (changed group, tinted frames) | menu | clipping | — | no ancestor with `overflow`, `transform` or `filter`; `elementFromPoint` 10 px inside each corner hits the menu | match (V6) |
| — | 320 × 640, Ambulance | menus, bar | stay on screen | not drawn | Group 01's and Rule 05's menus 220 wide at x 36 / 28; the bar 271 × 136 with its buttons wrapped; `scrollWidth` 305, no horizontal scroll | match (FR-010) |

Open rows: one (two frames): "Remove from <variant>" wraps in the 220 px menu where Figma widens the menu to fit it (UNCERTAIN 1).

**Decisions (T066):**

1. **The grouped-in-variant toast takes the design's words** ("Grouped in Ambulance only. Standard stays the same.", U40 6344:53873). Report cosmetic 8 lists this exact toast among the rules-step wordings to adopt. `RULES_COPY.groupedInVariant` keeps its four parameters (rules and group now unused, prefixed `_` as `grouped`'s branch is), so `utils.ts` is unchanged. It is also the toast when a variant's rules become a sub-group inside a group (the existing test case: Rule 02 and Rule 03 in Ambulance's Group 01): "added in Ambulance only" holds there too. One test string changed in `utils.test.ts`.
2. **Linked names stay plain text** (T058 UNCERTAIN 2, "T066 may revisit"): kept. FR-036e takes Rename off linked items; U57's frames draw no rename and the Figma component description says "Rename: hidden for rules linked to Standard in a variant (follows or Changed here)". A renaming affordance on the name would contradict the menu.
3. **U58 10.11 (`6530:40675`) is not built here.** It draws the published connection's details page (status band, connection menu), not a variant menu. Read for the frame only; noted for the details tasks.

**Open points (T066):**

1. **The menu width for "Remove from <variant>" (layout; not core). Closed by the coordinator (2026-11-09):** `ActionMenu`'s placement classes are now `w-max min-w-220 max-w-280` and `placementFrom()` plans for 280 (`ACTION_MENU_MAX_WIDTH`); the usual menus measure 220 (Rule 01, Sub-group 02 checked), a longer label widens the menu as Figma's auto-width menus do. Was: Figma's rule and group menus are 220 wide (U57 6522:32824, U55), but widen to fit "Remove from <variant>" on one line: 240 in U58 6522:33026 and U56 6522:32644 ("Remove from Ambulance"), 257 in U57 6522:32732 ("Remove from School transport"). `ActionMenu` is a fixed `w-220` (research R10: "follows the design's 220 px now that the Revamp's 14 px label/small fits"), so these labels wrap to two lines (the entry 64 high). T058 recorded U56's 240 as R10. R10's premise doesn't hold for these labels. A fix is in `frontend/src/components/ActionMenu/constants.ts` (not T066's file): `min-w-220 w-max max-w-[…]` in the four placement classes instead of `w-220`, with `placementFrom()` measuring the menu's real width. I left it open for the coordinator, who may accept R10 (wrapping) or give the fix to phase 11 / T021's owner.

### U69, U70, U71, U72 The variants on the test step and many rules (S13) — T073, 2026-11-09

Setup:
- Browser: Chromium (playwright-core 1.48.2, `/usr/bin/chromium`), signed in as `designer`. Sizes: 1455 × 900
  (body 1440; the frames are 1440 × 900), 1455 × 640, 800 × 1024 and 320 × 640.
- Drafts (T073's own, step "test", deleted at the end, 404 afterwards; nothing saved, no non-GET request in any walk):
  - "T073 variants": Standard (with a description) = Rule 01 · Minimum age 21, Rule 02 · Class B for 2 years,
    Rule 03 · Licence not expired, Rule 04 · German or EU citizen; Ambulance (based) + Rule 05 · Class C1 (Ambulance);
    School transport (empty, no rules); Bus (based) + Group 01 (AND: Rule 06 age ≥ 25, Rule 07 class D, a group
    message). U69, U70, W14.
  - "T073 contradiction": Standard = Rule 01 (age ≥ 21), Rule 02 · Under 18 (age < 18), Rule 03, Rule 04; Ambulance
    (based, the same); School transport (empty, meetable rules). U71, the ⚠ on a selected and an unselected tab.
  - "T073 many rules": Standard with 12 rules over Date of birth, Nationality, Expiry date and Licence classes. U72.
- The personas are random per open: Figma's sample names and values are not copy (FR-002).
- Figma: `get_metadata` on `7058:61648` (U72); `get_design_context` on the tab row `7058:61380` (with the ⚠ tab
  `7058:61618`) and the tooltip `7058:61632`; screenshots of `7057:60393` (U69), `7057:61267` (U70), `7058:61372`
  (U71), `7058:61648` (U72). `7057:60828`, `7057:61659`, `7057:62051` are the same screens with another chip selected
  (U69.md, U70.md) and were not read again. Every frame matches its audit inventory (U69.md–U72.md); none has changed.
- Scripts: `<scratchpad>/pw/t073-measure.mjs`, `t073-keys.mjs`, `t073-wheel.mjs`, `t073-exp.mjs`; seed and cleanup in
  `<scratchpad>/phase7/T073/`; screenshots there (`u69-amb`, `u70-school`, `u71-hover`, `u71-focus`, `w14-bus`,
  `many-1455`, `many-1455x640`, `many-800x1024`, `many-320x640`).
- Figma y values are page values; the app's are 40 lower from the tabs on, because of the test-day line the frames
  don't draw (T071's note).

| frame | state | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|
| U71 7058:61380 | any | tab row | box, line | 1120 × 39, items bottom-aligned, 24 apart, 1 bottom border `#e1e6f0` | 160, 256, 1120 × 39; gap 24; 1px rgb(225, 230, 240) (`TAB_ROW_CLASSES` of the rules step) | match |
| U71 7058:61618 | selected | tab | label, indicator | label/default 600 16/24 `#0b1220`, pt 4, label row 24, 8, 2px black indicator; 38 high | 600 16px/24px rgb(11, 18, 32), 38 high, indicator 2px rgb(11, 18, 32) (`BranchName`'s `tab` form) | match (carried from T026) |
| U69 7057:60401 | not selected | tab | label, indicator | body/default 400 16/24 `#4a5468`, no indicator | 400 16px/24px rgb(74, 84, 104), indicator transparent | match |
| U69 7057:60402 | Standard with a description | tab icon | glyph, place | filled (i) 20, 4 after the name, on Standard only | `kern-icon--info` muted 20 × 20, 4 after "Standard"; "About Standard" | match (F27, FR-035) |
| U69, U70, U72 | variant tabs | ⋯, variant ⓘ, "Add variant" | presence | none on the test step (U72 7058:61660 hidden) | none (no `actions`, no `noFindingsInfo`) | match (F27, F28; carried from T026, T064) |
| U71 7058:61618 | no citizen can meet | ⚠ | glyph, colour, place | `icon-warning-small` `#9a4a00` 20, 4 after the name | `kern-icon--warning` rgb(154, 74, 0) 20 × 20, 4 after "Standard" (231, 262) | match |
| — | no citizen can meet a variant not shown | ⚠ | presence | not drawn | on the unselected "Ambulance" too; its tab's name "Ambulance has findings" | match (004-S8.2.2, W13) |
| U71 7058:61618 | no citizen can meet | ⚠ | source | the frame's annotation "⚠ on the tab" | spec 003's `none_can_meet` notice of the checks only; no other finding kind on the test tabs | match (F38, FR-041; Q29 (b), (d)) |
| U71 7058:61632 | hover, focus on the ⚠ | tooltip | look | inverse `#0b1220`, radius 8, py 8 px 16, warning icon 20 white, 8, body/small 14/24 white | `InfoTooltip` with `FindingsSegment` (T022, T026): the same look; opens on hover and on keyboard focus (Tab from the tab), 280 wide under the icon | match |
| U71 7058:61632 | hover, focus on the ⚠ | tooltip | text | "Rule 01 and Rule 02 contradict each other, so no citizen can meet these rules." | "No citizen can meet the rules of Standard." (`noticeText()`; "Right now, no citizen …" when it holds today only) | F38 (Q29 (b): the contradiction finding stays on the rules step) |
| U71 7058:61632 | no description | tooltip | divider | a 1px divider above the finding | none: the finding alone | match (T026's `FindingsSegment`: the divider separates the description; decision 3) |
| U71 7058:61454 | no citizen can meet | result card | above the heading | nothing | nothing (the warning box "No citizen can meet the rules of Standard." removed from `ResultSection`) | match (CLAR #50, FR-041e; drops 004-S8.6.1) |
| U71 7058:61454 | no citizen can meet | heading | copy | "Result: doesn’t meet 2 rules" | "Result: doesn’t meet 3 rules" | match (C6) |
| U69 7057:60495 | Ambulance · one rule not met | heading, rows | copy, order | "Result: doesn’t meet 1 rule"; Rule 05 · Class C1 (Ambulance) first, then Rules 01–04 | the variant's rows from the evaluator, reported first ("Result: doesn’t meet 5 rules" for the sample citizen; Rule 05's row with "Licence classes includes one of C1") | match (C6; 004-S8.6.4) |
| U69 7057:60442 | Ambulance | chips | outcome icons | the variant's outcome per citizen | the icons follow the shown variant; the selected citizen kept across tab changes (arrow keys, Home, End) | match (004-S8.2.5, FR-004) |
| U70 7057:61369 | a variant without rules | heading | copy | "Result: meets the rules" | "Result: meets the rules" | match |
| U70 7057:61658 | a variant without rules | note | copy, type | "School transport has no rules yet, so every citizen meets it. Add rules in the Rules step to test them.", body/small `#4a5468` | the same text (`noRulesNoteOf()`), 400 14px/24px rgb(74, 84, 104), 8 under the heading row | match |
| U70 7057:61655 | a variant without rules | success box | presence | "Message Mia reads" box | none | F41 (CLAR #31 (a)) |
| U70 7057:61312 | a variant without rules | chips | icons | all three green check circles | all three `kern-icon--success` | match |
| U70 7057:61330 | a variant without rules | data card | rows | the rows the other variants check | the rows the connection's rules check (Date of birth, Nationality, Expiry date, Licence classes) | match (004-S8.4.8) |
| U72 7058:61692 | 12 rules, 1455 × 900 | variant area | box | 160, 271 → 764 (64 above the footer) | 160, 311, 1120 × 453 → 764 (`STEP_PINNED_CLASSES`: 24 more than the content's 40 px padding) | match (40 lower from the test-day line) |
| U72 7058:61693 | 12 rules | citizens row | pinned | stays | stays at 311–376 while the panel scrolls | match (F43) |
| U72 7114:49671–7114:49674 | 12 rules | scrolling | which part | each card its own scroll area (305 high) with a scrollbar | the panel as a whole (`PANEL_CLASSES`: 1118 × 387, `scrollHeight` 1785), both cards as high as the taller (1753); the page doesn't scroll (`scrollHeight` 900; wheel over the tabs: `scrollY` 0) | F43 (CLAR #31 (c), FR-043); history: since bug v5-ui-fixes (2026-11-18) each card its own scroll area, the scrollbar the browser’s (note below) |
| U72 7058:61648 | 12 rules | header, step header, tabs, footer | pinned | stay | stay (pills 0–64, step header to 216, tabs 256, footer 828) | match (F43) |
| U70 7057:61326, U71 7058:61431 | few rows | cards | height | both fill the panel (395 in 427) | both 355 in a 387 panel (`PANEL_CONTENT_CLASSES` `grow`) | match (U65 7057:58766 `h-full`; 40 lower from the test-day line) |
| — | 12 rules, 1455 × 640 | panel | scrolls | not drawn | area 193 high, the panel 127 visible and scrolling, the page 640 (no page scroll) | match (`wizard-pinned` from 768 × 640) |
| — | 12 rules, 800 × 1024 | panel | layout | not drawn | the cards stacked (below `lg`), the panel 487 high scrolls; step header to 240 | match |
| — | 12 rules, 320 × 640 | page | scroll | not drawn | the page scrolls (the step header isn't pinned); no horizontal scroll (`scrollWidth` 305) | match (FR-010, R4) |
| U72 7058:61711 | 12 rules | data rows | labels | "Expiry date" (driving licence), "ID valid until" (Personal ID) with a plain date | the catalog's labels ("Expiry date" for both documents) with "Valid until <date>" | match (CLAR #46: "under the rule's label", "Valid until <date>"; decision 4) |
| — | a reported group (Bus) | group row | members | not drawn (W14) | "Group 01 · All rules must be met · Not met" with its message, Rules 06 and 07 indented under it | match (W14, 004-S8.6.5; T071's rows) |
| — | keyboard | variant tabs | keys, focus | not drawn | Right, End, Right (wraps), Home select and focus; Tab goes to the (i) / ⚠, then the selected chip; 4px ring on keyboard focus | match (004-ACC.2, R16) |

Open rows: none.

**Bug v5-ui-fixes (2026-11-18), per-card scrolling** (spec Clarification 2026-11-18 #1): V5
frame 15 "Many rules (12)" (`7599:57529`; the data card `7599:57588` with its scroll area
`7599:57593`, the result card `7599:57632` with its scroll area `7599:57635`) reverses F43
where the wizard pins its step header (`wizard-pinned:`, ≥ 768 × 640) and the cards sit side
by side (`lg`, ≥ 1024): each card is as high as the panel, its head (the 48 px row with
"Mia’s data", "Edit data" and "Generate again"; the result heading) stays put, and only its
rows scroll, each card on its own. The scroll area is `TestStep/CardScrollArea.tsx` (classes
`CARD_SCROLL_CLASSES` in `TestStep/constants.ts`): `role="region"` named by its card’s
heading (`aria-labelledby`); `tabIndex={0}`, because nothing in the rows is focusable (WCAG
2.1.1; Safari doesn’t focus scrollers on its own), so the step has two more tab stops; a
keyboard-only focus ring (4 px, offset 2, as the activity list’s); `relative`, so the rows’
`sr-only` texts stay inside it (decision 6); it reaches 16 px into the card’s right padding
with 16 px padding inside, so the browser’s own scrollbar sits in that padding. Figma’s 4 px
bar is recorded as a difference, not a mismatch: the app styles no scrollbars. Below `lg`, or
where the header isn’t pinned, nothing changed: the stacked cards scroll together in the
panel, or the page scrolls. `PANEL_CLASSES` keeps `wizard-pinned:overflow-y-auto` only as a
fallback (the 317 px skeleton cards in a short window, for example); with loaded cards side by
side the panel doesn’t scroll. The rows above that have the panel scroll at 1455 × 900 and
1455 × 640 are history; the 800 × 1024 and 320 × 640 rows stand. Out of scope and unchanged:
the rows, the heads’ contents, the placeholder, the failure state; frame 15’s "Tested as if
shared today" line belongs to bug test-results-v5.

**Decisions (T073):**

1. **`VariantTab` is `BranchName`'s `tab` form** (carried from T026), with `ELEMENT_IDS.testTab/testPanel`, without
   `actions` and without `noFindingsInfo`; `VariantTabs` uses the rules step's `TAB_ROW_CLASSES` (imported, unchanged).
   The finding is spec 003's `none_can_meet` notice as before (Q29 (d): "from the evaluator" = the baseline's checks,
   FR-003), worded by `noticeText()`; the frame's contradiction sentence stays the rules step's (Q29 (b)).
2. **CLAR #50**: `ResultSection` lost the warning line and its `check` prop (`ResultSectionProps` in `types.ts`;
   `TestStep` no longer passes it).
3. **The tooltip's divider without a description** (U71 7058:61632 draws one above the lone finding): kept as T026
   built it (`FindingsSegment` `divided` only under a description); the instance's divider has nothing to divide.
4. **"ID valid until" (U72, carried from T071)**: not built. CLAR #46 keeps "Valid until <date>" under the rule's
   label, and the rules' label of the Personal ID's expiry is the catalog's "Expiry date"; U72 #22 puts "valid until"
   in the label with a plain date, which contradicts FR-024b. With both expiry dates checked, the flat list shows
   "Expiry date" twice; the hidden document headings (`h3.sr-only`) tell them apart for screen readers, the order
   (Personal ID's rows first) for sighted users. If the coordinator wants a visible difference, it is
   `dataRowLabelOf()` in `TestStep/utils.ts` (not built: UNCERTAIN, not core).
5. **F43's panel** (T033's slot): `TestStep/constants.ts`: `STEP_PINNED_CLASSES` (`wizard-pinned:pb-24`, the area
   64 above the footer as U72 draws), `PANEL_CLASSES` (the scrolling column) and `PANEL_CONTENT_CLASSES` (`grow`, so
   the cards fill the panel when they are short). `VISIBLE_HEIGHT_CLASSES` stays in `WizardLayout/constants.ts`.
6. **Bug found and fixed**: with many rules the *page* scrolled too (`scrollHeight` 1363–2127 at 1455 × 900): the
   cards' `sr-only` texts (absolutely positioned) had the content wrapper (`relative`) as containing block, outside
   the scroll container, so their static positions far down the panel extended the page. `PANEL_CLASSES` now has
   `relative`. It pre-dated T073 (T034's hidden "Met", T071's hidden headings).
7. **`PersonaPlaceholder`**: radius 8 (`rounded-kern-default`) and "Generate all" in its comment (carried from T071).
   Its cards keep U11's 317 px height (frame 18/19, T074's U74) and don't stretch to the panel.

**Open for the user (T073, not core):**

1. **"ID valid until" vs "Expiry date" (copy; not core)**: decision 4.

### U41, U42, U59 Copy to variant and the tab's ⋯ (S11) — T067, 2026-11-09

Checked in playwright-chrome (Chromium) at 1455 × 1000 (body 1440), and at 320 × 640, signed in
as `designer`, on T067's own draft "T067 U41" (Standard as U41's tree; Ambulance linked, Rule 05
changed, Rule 06 "Added here" (C1); School transport linked, Rule 02 changed (12 months), Rule 06
"Added here" (D1); Night service started empty, one rule; deleted afterwards). Copies are local
editor state (nothing saved). Fonts: `document.fonts.check` true for Fira Sans 600 14px, 400
14px, 600 16px. Popover values relative to the popover's top-left (6344:53981, 300 × 226 as
drawn with two variants; ours lists a third, Night service, so it is 266 tall).

| frame | state | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|
| U41 6344:53928 | Ambulance, Rule 06's ⋯ › Copy to variant | popover | box | 300 wide, x 955 (right edge 1255) | 300 wide, x 955, right edge 1255 = the ⋯'s right edge (`end`) | match |
| U41 6344:53928 | popover open | popover | where | above Rule 06, which sits low on the drawn page | above the ⋯, 8 px (`bottom-full mb-8`) where it doesn't fit below above the sticky footer (928 − 726 < 266 + 8); below it, 8 px, where it does (Standard's Rule 01: top 388 = ⋯ bottom 380 + 8) | match (T020's placement, as the ⋯ menus; FR-009d) |
| U41 6344:53981 | open | popover | frame | 1 `decorative-border` #e1e6f0, radius 8, padding 16, gap 8, Elevation/Menu 0 10 28 #13152529, white | 1px solid rgb(225, 230, 240), 8px, 16px, 8px, `rgba(19, 21, 37, 0.16) 0px 10px 28px 0px`, white | match |
| U41 6344:53982 | open | title | text, type, place | "Copy Rule 06 to", label/small 600 14/24 `#0b1220`, x 17 y 17 | "Copy Rule 06 to", 600 14px/24px rgb(11, 18, 32), 17, 17 | match |
| U41 6344:53983 | open | "Standard" check item | row, box, gap | "Data/Check item": 32 high (4 + 24 + 4), box 20 radius 4 1 `layout-border` #6b7488, 8 to the 14/24 400 label; y 49 | KERN's `kern-form-check__checkbox` with T016's override (shared `Checkbox`): 266 × 32, box 20 at y 55, label x +28 (20 + 8), 400 14px/24px rgb(11, 18, 32); y 49 | match |
| U41 6344:53984 | open | help text | text, type, place | "Variants linked to Standard get it too.", body/small 14/24 `layout-text-muted` #4a5468, y 89 | same text (was "Variants based on Standard get it too."), 400 14px/24px rgb(74, 84, 104), y 89; it describes Standard's box and every included one (`aria-describedby`) | match (FR-040: the design's help text) |
| U41 6344:53985 | School transport chosen | check item | look, place | box filled `action-default` #1d56f0 with the white `icon-done-small`, y 121 | rgb(29, 86, 240) with `check-white-small.svg` (T016), y 121 | match |
| U41 6344:53981 | open | list | which variants | Standard, School transport (the open Ambulance not listed) | Standard, School transport, Night service, in tab order; the open variant not listed | match (002-S4.12; the third variant is the sample's) |
| — | Standard chosen | School transport (linked) | state | not drawn (U41 #24) | ticked, `disabled`, box and name at KERN's 40 %, described by the help text; Night service (started empty) stays choosable | W17 (FR-040, 002-S4.13) |
| U41 6344:53986 | open | actions | layout | right-aligned, 8 apart; y 161 | `justify-end gap-8`; Cancel at x 1069.9, Copy at 1152.1 (8 apart) | match |
| U41 6344:53987 | open | "Cancel" | look | button-tertiary-small 74 × 48 (40 visible), label 600 14/24 underlined `action-default` | `kern-btn--tertiary kern-btn--small` 74.2 × 40, 600 14px/24px underline rgb(29, 86, 240) | match |
| U41 6344:53988 | School transport chosen | "Copy" | look | button-secondary 84 × 48, 1 `action-default`, radius 8, label 600 16/24 `action-default` | `kern-btn--secondary` 85.9 × 48, 1px rgb(29, 86, 240), 8px, 600 16px/24px rgb(29, 86, 240) | match (±2 text width, as T027's "Done") |
| — | nothing chosen | "Copy" | state | not drawn | `aria-disabled="true"`, KERN's 40 %, focusable, does nothing | match (baseline) |
| — | open | focus | where | not drawn | moves to the first choosable variant ("Standard"); Tab and Shift+Tab go round its controls (Copy → Standard, Standard → Copy), skipping an included one; Escape and Cancel close it with the focus on Rule 06's ⋯ | FR-040 (Q28c: "keeps the focus inside and returns it"; the baseline closed it on Tab out) |
| — | open | click on a name | behaviour | not drawn | ticks the box, the popover stays open (bug copy-popover-label-click) | match (baseline) |
| U41 6344:54042 (3.14) | after "Copy" | toast | look, text | "Rules/Toast" type=success: `feedback-success` #1d7a2e, padding 16, gap 24, white check (filled), "Rule 06 copied to School transport." 14/24, "Show" 600 underlined | rgb(29, 122, 46), 16px, 24px, "Rule 06 copied to School transport." + "Show"; 343 × 56, bottom centre | match (T036's toast, T058's `kind: 'success'`) |
| U42 6344:54043 (3.15) | "Show" | School transport | the copy | the last top-level item, "Added here", no link icon, Rule 07 (C1) | the open tab is School transport (focus on its tab); the copy is the last top-level item "Rule 08" (the draft's next number), C1, "Added here", no link icon | match (002-S4.12, FR-040; the number is the sample's numbering base) |
| — | copy Rule 06 from Ambulance to Standard | Standard, Ambulance | the copy | not drawn (U41 "Missing here" 002-S4.14) | "Rule 06 copied to Standard."; Standard gets Rule 09 at its end; Ambulance (the source, linked) shows Rule 09 linked and unmarked before its own additions; School transport (linked) gets it too | match (002-S4.14, FR-040: "copies to Standard stay linked in the source branch") |
| — | Standard, Rule 01 › Copy to variant | list | which variants | not drawn | Ambulance, School transport (both hold Rule 01 unchanged) and Night service (doesn't): every other variant | 002-S4.12 (decision 1 below) |
| U59 6523:37385 (11.2) | School transport's ⋯ open | menu | entries | "Rules/Variant menu" 220 × 103: Rename (T icon), divider, "Delete variant" (red, `icon-delete-small`) | 220 × 145: Rename (`rename.svg`), Copy link (`link-ink.svg`), divider, "Delete variant" (`kern-icon--delete`, rgb(196, 39, 28)); entries 202 × 40, 600 14px; from `menuEntriesOf({ kind: 'variant' })` | F10, FR-036 (Copy link before the destructive entry; stored draft) |
| U59 6523:37385 | open | menu | frame | 1 #e1e6f0, radius 8, padding 8, entries 2 apart, Elevation/Menu | 1px solid rgb(225, 230, 240), 8px, 8px, 2 (`ActionMenu`) | match |
| U59 6523:37385 | open | menu | place | x 379–599 under the tab whose ⋮ ends at 574; top 272 (20 under the ⋮ icon, 7 under the row's line) | right edge on the ⋯'s right edge (x 437.9–657.9, `end`), top 266 = the 32 px ⋯'s bottom + 8 (1 under the row's line) | match (T021's Menu pattern: to the left of its ⋯ where it fits, 8 px; FR-009d) |
| U59 6523:37251 (11.1) | every state | ⋯ | on which tabs | the active tab only | every tab of the rules step | F28 (CLAR #21; T064's table) |
| U59 6523:37251 | Standard's ⋯ | menu | entries | "with Rename only" (frame title) | Rename, Copy link (no Delete); opens to the right at 1440 (`ActionMenu` plans for its 280 px maximum, 287 − 280 < 16) | F10, FR-036 (Copy link); placement: coordinator (`ActionMenu` 220–280) |
| U59 6523:37532 (11.3) | Rename | rename | how | inline in the tab, double-click, "Enter saves · Esc cancels" | "Rename" opens "Edit variant" (name and description filled), Escape returns the focus to the tab's ⋯; no double-click | F28 (OUT-19) |
| — | "Delete variant" | dialog | text | not drawn (U59 "Missing here" 002-S4.5) | "Delete School transport?", "The variant and its rules will be deleted.", Cancel / "Delete variant"; Cancel returns the focus to the ⋯ | match (baseline; U61 is T068's) |
| — | "Copy link" | toast | text | not drawn | "Link copied." with `…/edit?step=rules&variant=<id>` on the clipboard | match (spec 007, S4.4) |
| — | 320 × 640 | popover | place | not drawn | across the rules card (`full`, `inset-x-16`, 239 wide), below the ⋯; it fits on neither side, so it keeps its 290 px and the page scrolls: Shift+Tab to "Copy" brings it clear of the sticky footer (Copy's bottom 320 < 472); no horizontal scroll (scrollWidth 305) | match (FR-010; decision 2 below) |
| — | 320 × 640 | tab menu | place | not drawn | x 16, 273 wide (`full`), no horizontal scroll | match |

Screenshots: `<scratchpad>/phase7/T067/*.png` (app), `T067/figma/*.png` (Figma).

**Decisions (T067):**

1. **The popover lists every other variant** (W17's call, carried from T055/T058). Since CLAR #53
   the menu entry shows only while some variant could still receive the rule; the popover keeps
   002-S4.12's list (every other variant, in tab order), so a variant that already holds the rule
   (linked, unchanged) can still be chosen and gets a separate, unlinked copy, as the baseline
   does. W17 itself concerns only the linked variants while Standard is chosen (included, not
   choosable), which is built. `copyTargetsOf()` and its tests are unchanged. Not UNCERTAIN
   (002-S4.12 settles it); the coordinator may still prefer hiding such targets.
2. **No max-height step on the popover.** T020's placement decides the side (the caller, as
   before) and now the direction (measured in the popover before it paints, from its own
   height; `COPY_POPOVER_PLACEMENTS[side][direction]`, 8 px from the ⋯, `z-40` like the menus).
   A max-height step (tried first) left a 22 px list at 320 × 640, where the popover fits on
   neither side; the popover keeps its height there and the page scrolls to it.
3. **The focus stays inside** (FR-040, Q28c): Tab and Shift+Tab wrap round the popover's
   controls (baseline: Tab out closed it). The focus leaving another way (a screen reader's
   cursor, a script) still closes it (`onDismiss`).
4. **The included variants are described by the help text** (`aria-describedby`), so that a
   ticked, disabled box says why; Standard's box too.
5. **`BranchMenu` builds its entries from `menuEntriesOf({ kind: 'variant' }, { branchKind,
   linkable })`** (carried from T055), with `MENU_ENTRY_LOOKS` and the label "Delete variant"
   (U59 #11; was "Delete"); props unchanged (Standard = `deletable` false).

### U74, U99 (`7114:49683`) Loading, failure and the edit flow's test step (S13) — T074, 2026-11-09

Setup:
- Browser: Chromium (playwright-core 1.48.2, `/usr/bin/chromium`), signed in as `designer`. Sizes: 1455 × 900
  (body 1440; the frames are 1440 × 900) and 320 × 640.
- Draft (T074's own, step "test", deleted at the end, 404 afterwards): "T074 Passenger transport licence": Standard
  (a description) = Rule 01 · Minimum age 21, Rule 02 · Class B for 2 years, Rule 03 · Licence not expired, Rule 04 ·
  German or EU citizen; Ambulance (based) + Rule 05 · Class C1 (Ambulance); School transport (empty). As U74's tabs.
  No non-GET request in any walk.
- The loading states are made in the browser only (an init script wraps `Worker`; nothing in the source): its answers
  are held while `window.__hold` is set (frame 18 on first open, frame 19 after "Generate again"), and its constructor
  throws while `window.__failWorker` is set (generation failed: `createWorker()` returns null and the run fails). The
  watchdog (5.5 s) bounds a held run; the measurements are taken before it.
- The edit flow (U99 E6): no connection can be published here (EUDIPLO isn't configured), so `page.route` answers the
  draft's `GET /api/form-connections/<id>` as a published `FormConnection` (api-types shape: `status: 'published'`,
  `is_active`, `trigger_url`, `pull_url`, branches with `is_main` / `pull_url`, `rule_set_version`); the flow opens at
  step 1 and the step line's "Test" opens the test step. No mutation sent.
- Figma: `get_metadata` on `7062:50960`; `get_design_context` on the variant area `7062:51004` (frame 18: pills, status,
  "Generate all", both skeleton cards), the chip `7062:51295` (with the ring `7062:51495`, its SVG read: circle r 7,
  stroke 2 `#E4E8EF`, no arc) and the failure's panel `7062:51592`; screenshots of `7062:51536` (frame 20),
  `7062:51249` (frame 19) and `7114:49683` (U99 E6). Every frame matches its audit inventory (U74.md, U99.md); none
  has changed.
- Scripts: `<scratchpad>/pw/t074-states.mjs` (modes `loading`, `one`, `failed`), `<scratchpad>/pw/t074-edit.mjs`
  (`fail` for the edit flow's failure); seed and cleanup in `<scratchpad>/phase7/T074/`; screenshots there
  (`s-loading`, `s-one`, `s-failed`, `s-edit`, `s-edit-fail`, `n320-loading`, `n320-failed`).
- Figma y values are page values. Frames 18 and 20 have no test-day line, as the app (the variant area at 271 in both);
  in frame 19 the app shows it (Q32, 004-S8.1.2), so its y values are 40 lower from the tabs on (T071's note).

| frame | state | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|
| U74 7062:50960 | loading (first open) | test-day line | presence | none | none | match (004-S8.8.3) |
| U74 7062:51004 | loading | variant area | box | 160, 271, 1120 × 493 | 160, 271, 1120 × 493 | match |
| U74 7062:51005 | loading | citizens row | box | 1118 × 64, pt 16 px 16 | 161, 272, 1118 × 64 | match |
| U74 7062:51206–7062:51208 | loading | skeleton pills | box, look | 130 / 126 / 132 × 40 at row + 16, + 20, 8 apart; white, 1 `#e1e6f0`, radius 999 | 177 / 315 / 449, 292, 130 / 126 / 132 × 40; oklch(1 0 0), 1px rgb(225, 230, 240), round; `aria-hidden` | match |
| U74 7062:51210 | loading | status | copy, type, place | "Creating 3 sample citizens…", body/small 14/24 `#4a5468`, at row + 788, + 28 | the same text, 14px/24px rgb(74, 84, 104), 949, 300 (row + 788, + 28); `role="status"`, polite | match (004-S8.8.2, FR-020) |
| U74 7344:96354 | loading | "Generate all" | presence, box | tertiary small with the refresh icon at row + 972, 130 × 48 | 1133, 292, 130 × 40 + 4 margins | match (decision 1; was hidden in frame 18) |
| — | loading | "Generate all" pressed | behaviour | not drawn | nothing changes (the run already creates all three), the focus stays on the button, the status unchanged | decision 1 |
| U74 7062:51016 | loading | panel | box | 1118 × 427, p 16 | 161, 336, 1118 × 427, 16px | match |
| U74 7062:51018, 7062:51040 | loading | skeleton cards | box, look | 410 × 395 and 660 × 395 (fill the panel), white, 1 `#e1e6f0`, radius 8, p 16 | 177, 352, 410 × 395; 603, 352, 660 × 395; white, 1px, 8px, 16px; `aria-hidden` | match (decision 2; were 317 high) |
| U74 7062:51212, 7062:51227 | loading | heading bars | size, radius, fill | 110 × 14 and 200 × 14, radius 4, `#e4e8ef` | 110 × 14 at card + 17, 200 × 14; 4px; rgb(228, 232, 239) | match (carried from T017: were `#eef1f6` / radius 8) |
| U74 7062:51214–7062:51225 | loading | data rows | bars, pitch | label 90 × 10 `#eff1f5`, value 96 / 70 / 130 / 140 × 10 `#e4e8ef` 24 further, radius 4; rows 28 apart from y 56 | 90 × 10 rgb(239, 241, 245), values 96 / 70 / 130 / 140 at + 114, rgb(228, 232, 239), 4px; at 425, 453, 481, 509 (heading + 56, pitch 28) | match (carried from T017: light was `#f2f5fb`) |
| U74 7062:51229 | loading | result rows | icon, name, place | 16 circle `#e4e8ef`, name bar 180 × 10 at + 28, + 3; first row 50 below the heading bar | 16 × 16 round, name bar 180 × 10 at 648, 422 (heading + 53 = row + 3) | match |
| U74 7062:51233 | loading | result rows | message bar | 60 after the name bar, no statement bar | the message bar where the message column starts (340 in), a light statement bar under each name | F14 (T035's rows: the statement placeholder; the message column) |
| U74 7062:51249 | one persona | test-day line | presence | none | "Tested as if shared today, 09.11.2026." | Q32 (004-S8.1.2: the line shows during one persona's regeneration) |
| U74 7062:51295 | one persona | chip | box, look | 2 `#1d56f0`, pl 12 pr 14, 44 high, the name stays | 177, 330, 142 × 44, the selected chip's look, "Lena Nowak" (unchanged before and after) | match (Q32, 004-S8.7.4, W14: the name kept) |
| U74 7062:51495 | one persona | ring | size, look, motion | 16 × 16, circle r 7, stroke 2 `#e4e8ef`, no arc | 16 × 16 at chip + 14, + 14 (pl 12 + 2 border), 2px rgb(228, 232, 239) all round, radius 9999px, `animation-name: none`; `aria-hidden` | match (carried from T018: was a spinning arc in `action-default`; decision 3) |
| U74 7062:51298, 7062:51301 | one persona | other chips | icons, use | check circle / diamond, usable | "Yusuf Schneider: meets the rules of Standard" (check), "Sophie Hartmann: doesn’t meet …" (diamond); Right moves the selection to Yusuf during the run | match (004-S8.8.5) |
| U74 7062:51497 | one persona | status | copy | "Creating new data for Mia…" | "Creating new data for Lena…", 944, 340 | match (sample name) |
| U74 7344:96365 | one persona | "Generate all" | presence | at the row's right end | 1133, 332, 130 × 40 | match (F45) |
| U74 7062:51498, 7062:51513 | one persona | the selected persona's cards | look | skeletons without "Edit data" / "Generate again", fill the panel | the skeleton cards, 410 × 355 and 660 × 355 in the 387 panel (40 lower: the test-day line), `aria-busy` on the panel | match (004-S8.8.4) |
| — | one persona | focus | after "Generate again" (keyboard) | not drawn | the button gives way to the skeleton; the focus moves to the selected chip, and stays there when the run ends | match (004-ACC, quickstart V9; W14) |
| — | one persona done | names | kept | not drawn | the three names unchanged after the run | match (004-S8.7.4, R10; W14) |
| U74 7062:51536 | failed | test-day line, row, cards | presence | none: the message replaces the row and the panel | none; the tabs and the footer stay | match (004-S8.9.1, 004-S8.9.4) |
| U74 7062:51782 | failed | message | place | 16 + 40 below the area's top, centred | title at 606, 328 (area 271 + 57), centred on 720 | match (was centred vertically) |
| U74 7062:51783 | failed | title | copy, type | "Couldn’t create sample citizens", title/small 600 16/24 `#0b1220` | the same, 600 16px/24px rgb(11, 18, 32), `h2` | match |
| U74 7062:51784 | failed | hint | copy, type | "Your rules are saved. Try again, or publish without testing.", body/default 16/24 `#4a5468`, 8 below | "Try again, or publish without testing.", 400 16px/24px rgb(74, 84, 104), 8 below | match (OUT-33, F7, 004-S8.9.3: "Your rules are saved." not built) |
| U74 7062:51785 | failed | "Try again" | look, place | tertiary small, refresh icon, 48 high, 8 below | `kern-btn--tertiary kern-btn--small` with `kern-icon--autorenew`, 665, 396, 110 × 40 + 4 margins; described by the title and the hint | match |
| — | failed → "Try again" | focus, state | not drawn | frame 18 with the focus on the status ("Creating 3 sample citizens…"), then on the selected chip when the results show | match (004-S8.9.2, quickstart V9) |
| U99 7114:49683 | edit flow, results | content | title, intro, tabs, chips, card, results | as the create flow (E6) | "Test rules with sample citizen data", the intro, the three tabs, chips, data card and results as in the create flow; the step line's "Test" current; the focus on the h1 when the step opens | match (004-ACC.3) |
| U99 7114:49738 | edit flow | "Generate all" | presence | none (an empty spacer) | "Generate all" | F45 (cosmetic 12: in every results state) |
| U99 7114:49688 | edit flow | test-day line | presence | none | "Tested as if shared today, 09.11.2026." | 004-S8.1.1 (U99 Missing; FR-016) |
| — | edit flow, failed | hint | copy | not drawn (U99 Missing: 004-S7.2) | "Try again, or save without testing." | match (004-S7.2) |
| U99 7114:49808 | edit flow | footer | buttons | "← Back", "Discard changes"; "Save" primary | "Back", "Save" primary | closed (T083, T084, 2026-11-09: "Back", "Discard changes", "Save" primary) |
| U99 7114:49835 | edit flow | header badge | status | "Scheduled · 01.12.2026" | none | not built (CONFLICT: 002-S5.8; scheduled connections); "Active" (F5): T084 |
| — | 320 × 640 | loading | layout | not drawn | pills wrap one per line, the status and "Generate all" under them, the two skeleton cards stacked, 239 × 317 each; no horizontal scroll (`scrollWidth` 305) | match (FR-010) |
| — | 320 × 640 | failed | layout | not drawn | the hint wraps (239 wide, two lines), "Try again" centred; no horizontal scroll (`scrollWidth` 305) | match (FR-010) |
| — | reduced motion | ring, skeleton | motion | none drawn | none (no animation at all) | match (design-notes §4) |

Open rows: one, outside T074's files: the edit flow's footer without "Discard changes" (`EditorFooter.tsx`, T083/T084).

**Decisions (T074):**

1. **"Generate all" during frame 18** (U74 #13, 7344:96354; the baseline doesn't say): built as drawn, in the first
   open's loading state too (one line in `ApplicantsRow.tsx`: the button no longer waits for the personas). A press
   while all three are created changes nothing: the reducer's `requestRun` keeps a run that already covers all three
   slots (`rules/src/` untouched), and the focus stays on the button. "Try again" still gives way to frame 18, so the
   focus parks on the status there as before (T035).
2. **The skeleton cards fill the panel** (carried from T073; U74 7062:51018, 7062:51040: 395 in the 427 panel), as the
   loaded cards do; `PersonaPlaceholder`'s cards went from `h-317` to `min-h-317`, so that stacked (below `lg`) or in a
   short window they keep a card's shape (the old U11 height). Their bars take radius 4 (`rounded-kern-small`).
3. **The ring as drawn** (carried from T018; U74 7062:51495, SVG read: circle r 7, stroke 2 `#E4E8EF`, no arc): a
   static grey ring like the skeleton beside it, not `FeedbackLoader` and no motion (it was a spinning `action-default`
   arc under `motion-safe:animate-spin`, design-notes §4's exception "until T074"). The status in the row reads the
   loading out; the ring is `aria-hidden`.
4. **The skeleton's greys** (carried from T017): `TestStep/constants.ts` re-exports `SKELETON_BARS` from
   `components/FormConnectionLoadState/constants.ts` (`#e4e8ef` / `#eff1f5`, Figma binds no variable), one source for
   the three skeletons; `LOADING_RING_CLASSES` holds the ring's `border-[#e4e8ef]`.
5. **The failure's place**: at the top of the variant area (16 + 40 down), centred across it, as frame 20 draws it (it
   was centred vertically); the title and hint keep their 24px line height explicitly and wrap at 320 px.
6. **`PersonasAnnouncer`** (carried from T072): left mounted and silent, its comment updated; 004-ACC's announcements
   are now the loading status (runs) and the step's toast (a saved edit, FR-042, its `role="status"`), so it has
   nothing to say. T092 removes it with `PersonasAnnouncerProps` (its carried note stands).
7. **The edit flow's test step** (U99 E6) needs nothing of its own in `TestStep/`: the `editing` prop already gives
   "Try again, or save without testing." (004-S7.2); "Generate all" and the test-day line stay (F45, 004-S8.1.1) where
   E6 draws neither. Its footer, badge and note are S18's (T083/T084).

**Open for the user (T074, not core):**

1. **"Generate all" in frame 18 (behaviour; not core)**: decision 1. The frame draws it; no spec item says whether it
   shows during the first creation. If the coordinator prefers the baseline's hidden button, it is the one condition
   in `ApplicantsRow.tsx` (`personas !== null &&`).

### U60, U61, U62 Renaming and deleting variants (S11) — T068, 2026-11-09

How I checked:
- Browser: Chromium (playwright-core 1.48.2, `/usr/bin/chromium`, scripts `<scratchpad>/pw/t068-a.mjs`, `t068-b.mjs`), signed in as `designer`, at 1455 × 1000 (body 1440) and 320 × 640. Fonts: computed 600 24px/32px (titles), 400 18px/24px (bodies), 400 14px/24px (toast) in Fira Sans.
- Own draft "T068 U61" (`<scratchpad>/phase7/T068/seed.py`), deleted at the end (`cleanup.py`: 200, then 404): Standard with a description, Ambulance linked (Rule 05 changed to 19, Rule 06 C1 added; the frame's description), School transport linked (Rule 02 changed, Rule 06 D1 added). Every deletion, undo and rename was local editor state; no request other than GET was sent (checked in every run).
- The edit flow (U60 11.5b): no connection can be published here, so `page.route` answers the draft's GET as a published `FormConnection` (api-types shape, T074's way); nothing is sent.
- Figma: `get_design_context` of the dialogs `6523:37869` (11.5) and `6790:45039` (11.5b) and of the toast `6523:37991`; screenshots of `6523:37675`, `6523:37941`, `6545:39421`, `7112:48216`, `7112:48608`, `7112:48676` (`<scratchpad>/phase7/T068/figma/`). Every frame matches its audit inventory; none changed since the audit.
- Dialog values are relative to the dialog's top-left. The tab menu itself is T067's rows (U59), the "Edit variant" dialog's fields T064's (U37, U52).

| frame | state | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|
| U60 6523:37675 (11.4) | rename | where | how | inline field in the tab, red underline, the error beside the tab | ⋯ › "Rename" opens "Edit variant" (600 × 448, name and description filled, no intro, no "Start with") | F28 (CLAR #21, OUT-19) |
| U60 6523:37808 | name taken | error | text, place | "There’s already a variant called "Ambulance"." in the tab row | "There’s already a variant called "Ambulance"." under the name field in the dialog, `role="alert"`, `aria-invalid`, the focus back in the field | W18, F28 |
| U60 6523:37808 | name taken | error | quotes | typographic “Ambulance” in the frame's sample | straight "Ambulance" (`rules/src/constants.ts` `variantNameTaken`, word for word with the server) | C5 (copy:server, as U49's rule name: T063 / T058 rows) |
| U52 6197:12011 (the error state U60 refers to) | name taken (renaming Standard to "Ambulance") | danger bar, field | extent, place | 4 px `#c4271c` beside label, field and message; label and field 16 in | 4px solid rgb(196, 39, 28) on the wrapper at 32, 72, 536 × 128; field at 52, 112, 516 × 48; dialog 600 × 488 | match (T064's `VARIANT_FIELD_CLASSES.name`) |
| U60 (no dialog drawn for rename) | rename | dialog | width | — (U37's dialog is 600) | 600 (`wide`) | match (T064's note: U60 draws no 480 dialog, nothing to adjust) |
| U60 6523:37869 (11.5) | delete School transport (draft) | dialog | box, radius | 480 × 280, 12 | 480, 360, 480 × 280; 12px | match |
| U60 6523:37869 | delete | title | text, font | "Delete “School transport”?" title/large 600 24/32 `#0b1220` | the same (typographic quotes), 600 24px/32px | match (was "Delete School transport?") |
| U60 6523:37869 | delete | body | text, font | "Rules you changed or added in School transport are deleted. Standard and Ambulance remain unchanged." body/large 400 18/24 `#0b1220`, three lines | the same, 400 18px/24px rgb(11, 18, 32), the same three lines | match (CLAR #38 "as drawn"; was "The variant and its rules will be deleted.") |
| — | delete Ambulance (Standard and School transport stay) | body | others | not drawn | "… Standard and School transport remain unchanged." (the other variants in tab order, `joinNames`); one other: "Standard remains unchanged." | match (the drawn sentence's data) |
| U60 6523:37869 | delete | buttons | labels, look, place | "Keep variant" secondary, "Delete variant" danger, 200 × 48 each, 16 apart; × 48 at the top right | "Keep variant" `kern-btn--secondary` 32, 200, 200 × 48; "Delete variant" `kern-btn--danger` rgb(196, 39, 28) 248, 200, 200 × 48; "Close" 48 × 48 at 424, 8 | match (was "Cancel") |
| — | "Keep variant", Escape | focus | where | not drawn | back on the tab's ⋯ ("Actions for School transport"), nothing deleted | match (T067's row) |
| U60 6790:45039 (11.5b) | edit flow of a published connection | body | text, box | "The connection is active, so this only takes effect when you save. Once saved, School transport and its rules are deleted, and its result link stops working. Make sure your service no longer needs it. Standard and Ambulance remain unchanged."; 480 × 328 | the same text, 480 × 328, buttons at 248 | match (CLAR #38: "the delete-variant body names the broken result link as drawn"; was "… will be deleted when you save. Its result link then stops working for good.") |
| U60 6790:44985 | edit flow | header | badge | "Active" + "Draft changes" | not T068's (F5, T084) | — |
| U61 6523:37941 (11.6) | School transport (open) deleted | tabs | which opens | Ambulance, the tab to its left, selected | "Standard", "Ambulance" (selected); the focus on Ambulance's tab | match (FR-051 (33); was: Standard opened) |
| U61 6523:37991 | deleted | toast | text, action | "School transport deleted." + "Undo" | the same; announced ("School transport deleted.Undo" in the live region) | match (FR-051 (33)) |
| U61 6523:37991 | deleted | toast | type | `type=danger`: `#c4271c` fill with the white delete icon | neutral: rgb(11, 18, 32), no icon | T036 (coordinator: deleted toasts stay neutral with "Undo"; U61's red type not built) |
| U61 6523:37991 | deleted | toast | box | padding 16, gap 24, radius 8, message 400 14/24 white, "Undo" 600 14 underlined | 594, 848, 252 × 56 (bottom centre of 1440); 16px, 24px, 8px; 400 14px/24px white; "Undo" 600 14px underline white | match |
| — | "Undo" | variant | back | not drawn | School transport back in its place (the branches as before, `toEqual`), selected, the focus on its tab; the toast gone | match (FR-051 (33); 002-S4.5 kept: the deletion takes effect when saved) |
| — | toast gone (6 s), Ctrl+Z | variant | back | not drawn | the same as "Undo" (B4: Undo stands until the next change) | match |
| — | School transport deleted from Standard's view (its ⋯ while Standard is open) | tabs | which opens | not drawn | Ambulance, the tab to its left, with the focus | match (FR-051 (33); decision 1) |
| U61 6523:37946 | deleted | tab row | ⋯ | on the selected tab only | on every tab | F28 (CLAR #21) |
| U61 6545:39598 (11.7) | Standard's ⋯ | menu | entries | "Rename" only | Rename · Copy link | F10, FR-036 (T067's row) |
| U62 7112:48213 (11.10) | rename Standard | how | inline | the tab name becomes a field | ⋯ › "Rename" opens "Edit variant" with "Standard" | F28 |
| U62 7112:48226 (11.11) | Standard renamed "Taxi and rental cars" | tab | name, focus | "Taxi and rental cars" first, (i), ⋯ | "Taxi and rental cars" first with its (i) and ⋯; the focus on its tab after "Save changes" | match |
| U62 7112:48622 (11.12) | Ambulance after the rename | link strip | text | "Linked to Taxi and rental cars" "Rules you don’t change follow and update with Taxi and rental cars." | the same | match |
| — | Ambulance after the rename | Rule 05's ⋯ | entry | not drawn | "Reset to Taxi and rental cars" | match |
| — | after the rename | delete dialog body | others | not drawn | "… Taxi and rental cars and School transport remain unchanged." | match |
| U62 7112:48723 (11.13) | "Add variant" after the rename | "Start with" | texts | "Linked to Taxi and rental cars (recommended)", "Copies all Taxi and rental cars rules. Unchanged rules remain the same as Taxi and rental cars and update with it.", "Starts with no rules. Changes to Taxi and rental cars don’t affect it." | the same | match |
| U62 7112:48628, 7112:48673 (11.12) | Ambulance | Group 02 "Added here", link icons on two rules, connectors | — | sample data / OUT-22 / FR-038 (T066's U40 rows) | — |
| — | publish summary and findings after renaming | — | — | — | T076 | — |
| — | 320 × 640 | delete dialog, toast | reflow | not drawn | dialog 16, 92, 273 × 456, no inner horizontal scroll; toast 27, 392, 252 × 56; `scrollWidth` 305, no horizontal scroll | match (FR-010) |

Open rows: none.

Screenshots: `<scratchpad>/phase7/T068/*.png` (app), `T068/figma/*.png` (Figma).

**Decisions (T068):**

1. **The tab to the left opens after every variant deletion**, also when the variant was deleted through its ⋯ while another tab was open (possible since every tab has its ⋯, CLAR #21). FR-051 (33) says "the tab to the left opens" without a condition; the focus has to leave the deleted tab's ⋯, and the tabs open on focus (automatic activation), so the focus and the open tab go to the same place. Undo opens the restored variant and focuses its tab.
2. **The variant deletion is undoable as the rule and group deletions are** (`undoable()` in `RulesStep/utils.ts`): the toast "School transport deleted." with "Undo" (neutral), Undo puts every branch back; `RulesUndo.itemId` is `''` for a variant, and the editor's `undoRules` then focuses the variant's tab instead of an item (one line in `FormConnectionEditor/index.tsx`).
3. **The delete-variant dialog reads as U60 draws it** (CLAR #38, "Adopt as drawn", which names U60 #34): the title with typographic quotes, the body naming the variants that stay (tab order, `joinNames`; "remains" for one), "Keep variant" for "Cancel"; in the edit flow of a published connection 11.5b's body. The dialog keeps its scrim (T052/T057's reading).
4. **The rename dialog stays 600 wide**: U60 draws no rename dialog (only the inline field, F28), so U37's width stands (T064's note).

**Open for the user (T068, not core):**

1. **11.5b's body says "The connection is active"** (copy; not core). The editor knows only that it edits a published connection (`editing`), not whether it is active; a deactivated connection's edit flow shows the same body. Wording only; a fix would pass the published connection's `is_active` down to `RulesDialogs`.

### U44, U45 The findings banner, notes and outlines (S12) — T069, 2026-11-09

Own drafts, seeded and deleted (`<scratchpad>/phase7/T069/seed.py`, `cleanup.py`): "T069 U44 5.1"
(Rule 01 Nationality includes one of Germany, Rule 02 includes none of Germany, Austria, Rule 03
classes B, BE), "T069 U44 5.2" (U44 5.2 = U45 5.5: Group 01 OR with Rule 03 C, D, "Sub-group 02"
AND with Rule 04 one of B, BE and Rule 05 none of B, BE, Rule 06 C, D), "T069 U44 5.3" (Ambulance:
Rule 05 changed to the conflict, Rule 06 added, the same as Rule 01), "T069 U45 5.4" (Rule 06 the
same as Rule 03 only), "T069 U45 5.6" (Group 01: Age in years > 18 OR < 21), "T069 U45 5.7" (Rule
01 ≥ 21 covers Group 01: ≥ 18 OR Nationality). Chromium at 1455 × 1000 (1440 + gutter), the card
1120 wide as drawn. Screenshots: `<scratchpad>/phase7/T069/app-*.png`, `banner-*.png`; Figma's in
`T069/figma/`. Sample data, not compared: the connection name, "Sub-group 02" for the drawn
"Sub-group 01" (W12 reserves 01 for the group numbered 01), the country labels ("Germany" for
"German", the option set's), Standard's ⓘ in 5.3 (the seed's Standard has no description; FR-035c).
The `FindingNote` and `RuleRow` / `GroupFrame` outline geometry are T024's / T025's §5.1 rows;
these rows check the screen.

| frame | state | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|
| U44 6171:6749 (5.1) | conflict, single | banner | place, size | first in the card, 8 in (card 1120, banner 1102 × 42) | wrapper `p-8`; banner x 9, y 9, 1102 × 42 | match |
| U44 6750:40882 | conflict, single | banner | fill, border, radius, padding, gap | `feedback-warning-background` #fff4e0, 1 `feedback-warning` #9a4a00, 8, 8 8 8 16, 8 | rgb(255, 244, 224), 1px rgb(154, 74, 0), 8px, 8px 8px 8px 16px, 8px | match |
| U44 6750:40882 | conflict, single | kind icon | glyph, size, colour | `icon-warning-small` 20, #9a4a00 | `kern-icon--warning` 20 × 20, rgb(154, 74, 0), `aria-hidden` | match |
| U44 6750:40882 | conflict, single | text | wording | "Rule 01 and Rule 02 contradict each other, so no citizen can meet the rules of Standard." | the same (`bannerOf()`, T010) | match (C4) |
| U44 6750:40882 | conflict, single | text | font, colour | body/small 400 14/24 #0b1220, numerals "zero" "lnum" "tnum" | 400 14px/24px rgb(11, 18, 32), `tabular-nums slashed-zero` (inherited, the html rule) | match |
| U44 6750:40882 | conflict, single | names | look | plain text | links (buttons) to Rule 01 and Rule 02 | F39 |
| U44 6750:40882 | conflict, single | kind | hidden text | — | "Conflicting:" `sr-only` before the sentence | match (W13) |
| U44 6750:40933, 6750:41008 (5.2, 5.3) | collapsed | counts row | wording | "2 rules contradict each other, and 1 rule is a duplicate" | the same | match (C4) |
| U44 6750:40933 | collapsed | chevron | size, icon | `button-tertiary-small` 48 target, 40 box, radius 8, `icon-expand_more-small` 20 action blue | 48 × 48 button, 40 × 40 box, 8px, `expand-more-action-small.svg` 20 × 20; "Show findings" `sr-only`, `aria-expanded="false"`, `aria-controls` the list | match |
| U44 6750:41008 | collapsed | banner | height | 66 (48 + 2 × 8 + 2) | 66 | match |
| U44 6171:7535 (5.3) | Ambulance, collapsed | banner | place | under the link strip "Linked to Standard", 8 in | under `LinkStrip`, wrapper `p-8` | match |
| U44 6171:7569 (5.3) | Ambulance, Rule 05 changed with a conflict | row | tint, outline, mark | the variant tint (lavender) kept, 1 px warning outline, "Changed here" | tint kept, 1px rgb(154, 74, 0) outline, "Changed here" | match (T065's question: the tint stays) |
| U44 6171:7578 (5.3) | Ambulance, Rule 06 added and a duplicate | row | tint, outline, note | tint kept, 1 px info outline, "Same as Rule 01. You can delete one of them." | the same | match |
| U44 6171:7008, 6171:7022 | conflict | rule outline | colour, width, inset | 1 #9a4a00, radius 8, 8 in from the card | the same (T024's `RuleRow`) | match |
| U44 6171:7008 | conflict, first rule | rule outline | height | 144 (the list's first row, 16 under the content, inside the outline) | 136, the extra 8 under the outline (`FIRST_RULE_SPACING` on the `li`) | T024 (the extra 8 belongs to the list); UNCERTAIN 2 |
| U44 6171:7010, 6171:7024 | conflict | rule note | wording | "Can’t be met together with Rule 02." | "Contradicts Rule 02." (`noteOf()`) | C4 (T010's text; UNCERTAIN 1) → **user 2026-11-09: the design's wording, `noteOf()` changed ("Can’t be met together with …")** |
| U44 6171:7091, 6750:41000 | conflict in a sub-group | group | outline, note | warning outline replacing the left border; "Rule 04 and Rule 05 in this group contradict each other." under the header | the same | match |
| U44 6171:7094 | conflict in a sub-group | members | notes | each member keeps its outline and note | the same | match |
| U44 (5.1, 5.2) | any finding | "Test rules" | state | enabled ("doesn’t block") | enabled | match (003-S2.22) |
| U45 6753:40144 (5.5) | expanded | banner | padding, gap, height | 8 8 8 16, 8, 130 | 8px 8px 8px 16px, 8px, 130 | match |
| U45 6753:40144 | expanded | chevron | icon | `icon-expand_less-small` | `expand-less-action-small.svg`; "Hide findings", `aria-expanded="true"` | match |
| U45 6753:40144 | expanded | list | padding, gap | 0 0 4 24, 4 | 0px 0px 4px 24px, 4px | match |
| U45 6753:40144 | expanded | lines | icon, gap, height | the line's own kind icon 20 (warning / info), 8, 24 | `kern-icon--warning` / `--info` 20 × 20, 8px, 24 | match |
| U45 6753:40144 | expanded | line 1 | wording, names | "Sub-group 01: Rule 04 and Rule 05 contradict each other.", plain text | "Sub-group 02: Rule 04 and Rule 05 contradict each other.", each name a link | match (C4; the name is sample data); F39 for the links |
| U45 6753:40144 | expanded | line 2 | wording, names | "Rule 06 is the same as Rule 03.", the names links | the same | match |
| U45 6753:40144 | expanded | links | colour, underline | #1d56f0, underlined, thickness 8 %, the font's underline position | rgb(29, 86, 240), `decoration-[8%]`, `text-underline-position: from-font` (was `auto`, fixed here) | match |
| — | link hover | links | underline | not drawn | 3px underline (KERN's link hover, kit P21) | match (P21) |
| — | link keyboard focus | links | ring | not drawn | KERN's 4px `action-focus-default` ring, offset 2, keyboard only | match (§3, focus) |
| — | chevron hover / pressed | chevron | layer | not drawn (`button-tertiary-small`) | the kit's states: action colour at 8 % / 16 % on the 40 box, 150 ms | match (P33 2:1985, as `ActionMenu`) |
| — | chevron keyboard focus | chevron | ring | not drawn | 4px #0b1220 ring around the 40 box, offset 2 | match |
| U45 6753:40144 | link pressed | focus | target | — ("Go to rule" scrolls to the rule and focuses it) | click "Rule 06": the focus on Rule 06's row, scrolled into view below the pinned header; Enter on "Sub-group 02": the focus on its header, `:focus-visible` | match (F39, 003-ACC.3) |
| U45 6750:41077 (5.4) | redundant only, single | banner | fill, border | `feedback-info-background` #e0f2fe, 1 `feedback-info` #0284c7 | rgb(224, 242, 254), 1px rgb(2, 115, 174) | §1.5 AA fix |
| U45 6750:41077 | redundant only | kind icon | colour | #0284c7 | rgb(2, 115, 174) | §1.5 AA fix |
| U45 6750:41077 | redundant only | text | wording, links | "Rule 06 is the same as Rule 03." with links | the same, "Redundant:" hidden before it | match |
| U45 6178:7806, 6753:40507, 6753:40844 | info only | Standard tab | icon | blue ⓘ | blue ⓘ (`feedback-info`) | match (T026) |
| U45 6753:40137 | conflict | Standard tab | icon | warning ⚠ | ⚠ #9a4a00 | match (T026) |
| U45 6178:8214, 6178:8216 | redundant only | Rule 06 | outline, note | 1 px info outline, "Same as Rule 03. You can delete one of them." | the same | match |
| U45 6753:40514 (5.6) | always met | banner | wording, names | "Every citizen meets Group 01, so it doesn’t check anything.", plain text | the same, "Group 01" a link | match (C4); F39 |
| U45 6753:40525, 6753:40824 | always met | group | outline, note | info outline, "Every citizen meets this group." under the header; members plain | the same | match |
| U45 6753:40851 (5.7) | covered group | banner | wording, links | "Anyone who meets Rule 01 also meets Group 01." with links | the same | match |
| U45 6753:40862, 6753:41298 | covered group | group | note | "Anyone who meets Rule 01 also meets this group. You can delete the group."; members and Rule 01 plain | the same | match |
| — | the rule open in the editor | banner | its name | — | plain text, the others links ("Rule 06 is the same as Rule 03." with only "Rule 03" a link while Rule 06 is edited) | match (baseline, `plainItemId`) |
| — | select mode | banner | place | not drawn | under the selection bar, 8 in, as under the link strip (T066's question) | match (decision) |
| — | no findings (after switching 5.1's AND to OR) | banner, notes, outlines | presence | none | the banner, notes and outlines gone at once; Standard's tab without icon | match (003-S2.18) |
| — | after an update | status region | text | — | polite `role="status"`, `sr-only`, outside the steps: "Rule 01 no longer conflicts with Rule 02. Rule 02 no longer conflicts with Rule 01." | match (W13, 003-S2.21, CP.18; the texts are `findingMessages.ts`'s) |
| — | any | requests, console | — | — | nothing sent while switching, editing, select mode, expanding; no `console.*` in `useRuleChecks.ts`, `workers/checks.ts`, `checks/` | match (FR-047) |
```

**Decisions (T069):**

1. **The finding links take the drawn underline** (`decoration-[8%]`, `text-underline-position:
   from-font`, as `ToastMessage`'s action) and KERN's link hover (3px underline, kit P21; contract
   §P21 names "the banner's finding links"); the chevron takes the kit's tertiary states (8 % / 16 %
   with the colour transition). Both live in `RulesStep/constants.ts` (`FINDING_LINK_CLASSES`,
   `FINDINGS_TOGGLE_CLASSES`).
2. **Every name in the banner is a link** (F39), also where U44 6750:40882, U45 6753:40144 line 1
   and 6753:40514 draw plain text; the rule open in the editor stays plain (baseline).
3. **The banner under the selection bar in select mode**, as under the link strip: the same 8 px
   wrapper; no frame draws both.
4. **A changed or added rule with a finding keeps its variant tint** under the finding outline
   (U44 6171:7569, 6171:7578), as T024 built it: answers T065's carried question; nothing changed.

**Open points (T069, not core):**

1. The rule notes read "Contradicts Rule 02." (T010's `noteOf()`), where U44 6171:7010 / 7024 and U45
   6753:40171 / 40178 draw "Can’t be met together with Rule 02." FR-022 says the notes take the
   design's sentences; T010 replaced "can’t be met together" by "contradict" throughout (C4).
   `rules/src/` stays untouched in phase 7, so it stays; T025 recorded the same row as W13/C4.
   Not the task's core behaviour (copy only). For the coordinator / a clarify question.
   **Decided by the user (2026-11-09): the design's wording.** `noteOf()` now writes "Can’t be met
   together with Rule 02." (and "… at the moment.", "… with other rules."); the tests of
   `findingMessages`, `scenarios` and `mcp/src/findings.test.ts` follow.
2. The list's first rule with an outline is 8 px shorter than drawn (U44 5.1: 144 vs 136): T024
   put the first row's extra 8 on the list item (`FIRST_RULE_SPACING`), outside the outline, where
   U44 draws it inside. The connector below lands within 1 px of the frame. Moving it inside needs
   a `RuleRow` prop (not T069's files). Not core behaviour (8 px of geometry).

### U46 The findings, part 2: today only, an unselected tab, the tab tooltip, duplicates only (S12) — T070, 2026-11-09

Own drafts, seeded and deleted (`<scratchpad>/phase7/T070/seed.py`, `seed2.py`, `seed3.py`, `cleanup.py`): "T070 U46 5.8"
(Rule 01 Date of birth is after 01.01.2010, Rule 02 at least 21 years old, Rule 03 classes B, BE), "T070 U46 5.9" (= 5.11:
Standard with its description, Group 01 OR with Rule 06 the same as Rule 03; Ambulance based, Rule 05 changed to the
conflict), "T070 U46 5.10" (Standard with its description and no findings; Ambulance with the description, the conflict
in Sub-group 02 and Rule 06 added, the same as Rule 01), "T070 W13 kinds" and "T070 W13 kinds 2" (one variant started
empty per finding kind, so each is checked alone), "T070 problem" (Rule 01 > 30 and Rule 02 < 20 contradicting, Rule 03 on
Personal ID Sex, which isn't requested; Ambulance based on it). Chromium (playwright-core) at 1455 × 1000 (1440 + gutter),
and 320 × 640. Fonts as T069's. Figma read: `get_metadata` 6753:41307 (unchanged since the audit, its node ids are
U46.md's), `get_design_context` on the 5.8 banner 6753:41324 and 5.11's tooltip 6758:43967, screenshots of 6753:41595,
6758:43049, 6758:43539; none changed since the audit. Screenshots: `<scratchpad>/phase7/T070/app-*.png`, `tip-*.png`,
`after-problem.png`, `before-problem.png`, `w320-*.png`; dumps `<scratchpad>/phase7/T070/kinds.json.txt`. Sample data, not
compared: the connection's name, "Sub-group 02" for "Sub-group 01" (W12), the rule rows' value chips ("1 Jan 2010" for the
drawn "01.01.2010": the rule row, T024/T062). The banner's shell, the links and the chevron are T069's rows; the tab's and
the bubble's geometry T026's (§5.1, "BranchName"); these rows check U46's states.

| frame | state | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|
| U46 6753:41324 (5.8) | today-only conflict, single | banner | place, size, look | in its 8 wrap (6754:44401), 1102 × 42, warning kind | 169, 290 (card 160, 281), 1102 × 42, `feedback-warning-background`, 1px rgb(154, 74, 0) | match |
| U46 6753:41324 | today-only conflict | text | wording | "Rule 01 and Rule 02 contradict each other, so right now no citizen can meet the rules of Standard." | the same (`bannerOf()`), "Conflicting:" hidden before it | match (C4) |
| U46 6753:41324 | today-only conflict | names | look | plain text | links to Rule 01, Rule 02 | F39 (T069 decision 2) |
| U46 6753:41332, 6753:41339 | today-only conflict | rule notes | wording | "Can’t be met together with Rule 02 at the moment." | "Contradicts Rule 02 at the moment." (`noteOf()`) | C4 (T069's open point 1: T010's text, `rules/src/` untouched) → **user 2026-11-09: the design's wording, `noteOf()` changed ("Can’t be met together with …")** |
| U46 6753:41317 | today-only conflict | Standard tab | icon, name | ⚠ after "Standard", no (i) (no description) | `kern-icon--warning` rgb(154, 74, 0); tab and icon named "Standard has findings" | match (FR-035c, 003-S4.4) |
| U46 6753:41317 | today-only conflict | Standard tab | tooltip | not drawn | "1 conflict: Rule 01 and Rule 02 contradict each other, so right now no citizen can meet the rules of Standard." | match (003-CP.16, C4; no description, so no divider) |
| U46 6753:41605, 6753:41694 (5.9) | Standard open, Ambulance with a conflict | tabs | icons | Standard blue (i) + ⋮; Ambulance unselected with ⚠ | Standard `kern-icon--info` rgb(2, 115, 174) + ⋮; Ambulance unselected, `kern-icon--warning` rgb(154, 74, 0), named "Ambulance has findings", + ⋮ | match; the unselected ⋮ F28 |
| U46 6753:41612 | duplicates only, single | banner | kind, wording, links | info, "[Rule 06] is the same as [Rule 03].", underlined | info (1px rgb(2, 115, 174)), the same, both links, "Redundant:" hidden | match (§1.5 AA border) |
| U46 6753:41641, 6753:41644 | duplicates only | Rule 06 in Group 01 | outline, note | info outline, ⓘ "Same as Rule 03. You can delete one of them." | the same | match |
| U46 6758:43059 (5.10) | Ambulance open | Standard tab | icon | grey (i) (description, no findings) | `kern-icon--info` rgb(74, 84, 104), "About Standard", tooltip the description only | match (FR-041b) |
| U46 6758:43524 (5.10) | Ambulance's ⚠ hovered | tooltip | text | "For patient transport vehicles. Drivers also need a class C1 licence." / divider / ⚠ "2 rules contradict each other, and 1 rule is a duplicate" | the same, breaks after "Drivers" and "and" as drawn; bubble 280 × 129 (+ its 8 px offset) | match (C4; geometry T026's rows) |
| U46 6758:43524 | Ambulance's ⚠ by keyboard | tooltip | opens | "on hover and on focus" (FR-041) | Tab from the open tab reaches the unselected tab's ⚠ (`:focus-visible`, 4px ring), the bubble opens (`display: flex`) | match |
| U46 6758:43061 | 5.10 | (i) after "+ Add variant" | presence | not drawn in 5.10 (drawn in 5.8, 5.9, 5.11) | shown | F27 (FR-035a; T064's row) |
| U46 6758:43067 | 5.10 | banner | collapsed | counts row "2 rules contradict e…" + chevron, under the link strip | "2 rules contradict each other, and 1 rule is a duplicate" + "Show findings"; expanded: "Sub-group 02: Rule 04 and Rule 05 contradict each other." and "Rule 06 is the same as Rule 01." | match (T069's shell rows) |
| U46 6758:43967 (5.11) | Standard's (i) hovered, duplicates only | tooltip | text, icon | the description / divider / white ⓘ "1 duplicate: Rule 06 is the same as Rule 03." | the same; 280 × 129 | match (003-CP.16) |
| U46 6758:43967 | 5.11 | tooltip | line breaks | "… is the same as / Rule 03." | "… is the same / as Rule 03." (220 px text column; one word earlier) | match (font metrics; text and box as drawn) |
| — | a tab with a problem only (U50 7375:101551) | tab, icon | accessible name | not drawn | "Standard has findings" for the tab and the icon (003-S4.4's name); the bubble, the icon's description, says the problem | decision 1 (UNCERTAIN 1) |
| — | a problem and findings in the same variant | tab | icon | not drawn | the red error diamond (error > warning > info) | match (T026's carried order) |
| — | a problem and findings | tooltip | content | not drawn (U06 note 8: "the description first, then the finding") | the description (if any), the white error diamond with the problem's sentence(s), a 1px divider (white 24 %), the white ⚠ with "1 conflict: Rule 01 and Rule 02 contradict each other, so no citizen can meet the rules of Standard."; 280 × 225 | decision 2 (FR-041a, Q29 (a) "spec 002 problems and findings") |
| — | the based Ambulance of the same draft | tab | icon | not drawn | ⚠ (the inherited conflict); the problem stays on Standard's tab (the rule is named once, for Standard, T060) | match (002-S2.22, FR-006) |
| — | another spec 002 problem (an incomplete rule, a missing message, too few members) | tab | icon | not drawn | none: only data no longer requested puts the red icon on a tab; the others show as the refused attempt's alert, the row's flag and "Test rules"'s explanation (#66) | decision 3 (UNCERTAIN 2) |
| — | the unrequested banner with the findings banner (U50 with U44/U46) | both banners | place | not drawn together (U50: flush 161, 1118 wide; U44/U46: 8 in, 1102 wide) | the unrequested banner takes the findings banner's inset: 169, 290, 1102 × 42; the findings banner 8 below it, 169, 340, 1102 × 42; both on the outlined rows' edges; alone it stays flush (T060's row) | decision 4 |
| — | 320 × 640, both banners | banners | reflow | not drawn | 255 wide each, 8 apart; the unrequested text wraps over five lines with "Add it in Documents" under it, the conflict sentence over three; no horizontal scroll (`scrollWidth` 305) | match (FR-010, 003-ACC.6) |
| — | 320 × 640, today-only single banner | banner | reflow | not drawn | 255 × 114, the sentence over four lines (`wrap-anywhere`), the icon centred on the text as the drawn summary row (`items-center`) | match (003-ACC.6); see "Notes for later tasks", T075 |
| — | 320 × 640, collapsed and expanded | banner | reflow | not drawn | collapsed 255 × 90 (the counts row over three lines beside the 48 chevron); expanded 255 × 226, the lines 177 wide, 24 in | match |
| — | 320 × 640, the tab tooltip | bubble | reflow | not drawn | 273 wide (the 16 px gutters), above the tab (`placementFrom()`), no horizontal scroll | match (T022's pattern) |
| — | every finding kind (W13) | banner, notes, tooltips | wording | undrawn texts (FR-022b) | as below; every one from `findingMessages.ts`, none built in the frontend | match (C4, W13) |
| — | any | requests, console | — | — | nothing sent while switching tabs, expanding, hovering (no non-GET request); console: Vite's and React's notices only | match (FR-047) |

The undrawn texts seen once each (W13; one variant per kind, banner as shown / expanded lines; notes; tab tooltip):

| kind | banner (single, or collapsed → expanded) | notes | tab tooltip | icon |
|---|---|---|---|---|
| a group's own AND conflict, with another line | collapsed "2 rules contradict each other. So no citizen can meet the rules of Sub-group." → "Group 01: Sub-group 02 can’t be met.", "Sub-group 02: Rule 01 and Rule 02 contradict each other.", "No citizen can meet the rules of Sub-group." (no links, no hidden kind) | "Sub-group 02 in this group can’t be met.", "Rule 01 and Rule 02 in this group contradict each other.", "Contradicts Rule 02." | the counts row with the notice | ⚠ |
| the same, today only | "2 rules contradict each other. Right now, no citizen can meet the rules of Today." → "… can’t be met at the moment.", "… contradict each other at the moment.", "Right now, no citizen can meet the rules of Today." | "… can’t be met at the moment.", "… contradict each other at the moment.", "Contradicts Rule 02 at the moment." | the same | ⚠ |
| a group with a rule ("with" on a group), a rule that can’t be met | "2 rules and 1 group contradict each other, and 1 rule can’t be met. So no citizen …" → "Group 01 and Rule 03 contradict each other.", "No citizen can meet Rule 01.", "Rule 02 and Rule 03 contradict each other." | "Contradicts Group 01.", "No citizen can meet this rule." | the counts row | ⚠ |
| an OR group of two that can’t be met | "Group 01: neither Rule 01 nor Rule 02 can be met. So no citizen can meet the rules of Neither." | "Neither Rule 01 nor Rule 02 in this group can be met." | "1 conflict: …" | ⚠ |
| an OR group of three | "Group 01: none of Rule 01, Rule 02 and Rule 03 can be met. So no citizen …" | "None of Rule 01, Rule 02 and Rule 03 in this group can be met." | "1 conflict: …" | ⚠ |
| a rule no citizen can meet | "No citizen can meet Rule 01. So no citizen can meet the rules of Condition." | "No citizen can meet this rule." | "1 conflict: …" | ⚠ |
| two rules that can’t be met, in an OR group that can | collapsed "2 rules can’t be met" → "No citizen can meet Rule 01.", "No citizen can meet Rule 03." | "No citizen can meet this rule." ×2 | "2 rules can’t be met" | ⚠ |
| always met, and the variant's notice | "Every citizen meets Rule 01, so it doesn’t check anything. Every citizen meets the rules of All meet." | "Every citizen meets this rule." | "1 finding: …" | blue ⓘ |
| covered in an AND level | "Anyone who meets Rule 02 also meets Rule 01." | "Anyone who meets Rule 02 also meets this rule. You can delete the rule." | "1 finding: …" | blue ⓘ |
| covered in an OR level | "Anyone who meets Rule 02 also meets Rule 01." | "Anyone who meets this rule also meets Rule 01. You can delete the rule." | "1 finding: …" | blue ⓘ |
| one conflict ("contradicts another") and a duplicate | "1 rule contradicts another, and 1 rule is a duplicate" → "Rule 01 and Rule 02 contradict each other.", "Rule 04 is the same as Rule 01." | "Contradicts Rule 01.", "Same as Rule 01. You can delete one of them." | the counts row | ⚠ |
| duplicates, covered and always met together | "2 rules are duplicates, 1 rule already covered, and 1 group every citizen meets" | the three notes | the counts row | blue ⓘ |
| not produced in the stack | FR-010's "The rules of <variant> couldn’t be checked completely. Only findings that are certain are shown." (and " · couldn’t be checked completely" after the counts) needs a check that runs out of time; "Every citizen meets <item> or Group 03." (covered with no item, through an OR level) has no seedable case found here | — | — | — (`findingMessages.test.ts` covers them) |

Open rows: none.

**Decisions (T070):**

1. **The tab's accessible name with a problem stays "<variant> has findings"** (`tabLabelOf()`, 003-S4.4), for the tab and
   its icon: no spec item or frame names a problem's tab, and the finding texts come only from `findingMessages.ts`; the
   icon's description (the bubble) reads the problem's sentence, so a screen reader hears what it is. Changing it is a
   new sentence and a change to `BranchName/index.tsx` (UNCERTAIN 1).
2. **The tooltip adds the findings under the problem**: a variant with a problem and findings shows the red icon (error
   wins), and its bubble says the description, the problem, then, below a divider, the findings' segment with its own
   icon. Q29 (a) puts "spec 002 problems and findings" in the tab's tooltip, and U06 note 8 says "the description
   first, then the finding"; otherwise the red icon would hide a conflict that the tab no longer shows. Built as
   `BranchFindings.more` (`FindingsSegment` renders it), set by `BranchTab` from its new `problem` prop.
3. **Only data no longer requested puts the red icon on a tab** (as T060 built it, `tabProblemsOf()`): the step can't
   hold an incomplete rule or one without a message from the editor (the editor refuses to save it), and the other
   spec 002 problems (from a refused attempt, a loaded draft, an agent's edit) show as the refused attempt's alert, the
   row's flag and "Test rules"'s explanation (#66). FR-041a's "a tab with a problem" and U06 note 7's "error (e.g. a rule
   uses data that’s no longer requested, 8.4)" would also cover them; building it needs a per-branch problem in the
   step's `index.tsx` (UNCERTAIN 2).
4. **The unrequested banner beside the findings banner**: alone, flush as U50 draws it (T060); with the findings banner
   right after it, it takes that banner's 8 px inset (`[&:has(+[data-findings-banner])]:mx-8 mt-8`), so the two stack
   8 px apart on the outlined rows' edges (U44/U46's wrap); no frame draws both.

**UNCERTAIN (T070, none touches the core behaviour):**

1. The tab's and icon's accessible name with a spec 002 problem: "Standard has findings" (copy; a problem isn't a spec
   003 finding). An alternative ("Standard has a problem") is a new sentence and a `BranchName` change. Not core.
2. Whether other spec 002 problems put the red icon on the tab (decision 3). Behaviour at the edge of FR-041a: the
   frames draw only 8.4's case. Not the task's core (the findings' texts and the drawn states).

### U73, U75, U77, U63 The publish dialog's summary (S14) — T076, 2026-11-09

Setup:
- Browser: Chromium (playwright-core 1.48.2, `/usr/bin/chromium`), signed in as `designer`. Sizes: 1455 × 900 (body
  1440) and 320 × 640.
- Fonts: `document.fonts.check('400 16px "Fira Sans"')` true.
- Drafts (T076's own, step "test", deleted at the end): "T076 Standard only" (Standard: Rule 01 age ≥ 21, Rule 02
  class B; Personal ID 7 data items, Driving licence 2), "T076 Findings" (Standard: Rule 01, Rule 02, Rule 03 = Rule 01;
  Ambulance (empty origin): class B, not class B, age ≥ 21 twice; School transport: age, class B), "T076 Renamed" (the
  same with Standard named "Taxi and rental cars"), "T076 Publish me" (published through the dialog, then deleted).
  No non-GET request in the summary walks; the one POST `/publish` in the publish walk.
- Figma: `get_design_context` on `7058:62120` (U73, the dialog) and `6760:47979` (U77 P2b, findings per variant);
  screenshots of `7112:48859` (U63 11.14) and `6376:25536` (U75 P1). `6383:66097` (P1b, "On a date") and `7137:50083`
  (16b, the example's info line) not read: F1 and OUT-9, their inventories stand. Every frame read matches its audit
  inventory; none has changed.
- Out of scope: the dialog's frame, header, ×, footer line and button row (T035's `ConfirmDialog` table); the
  publishing, published, failed, conflict and no-rules states and the edit flow's "Save changes?" (T077); the details
  after renaming Standard (U63 `7112:48860`, S15).

| frame | state | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|
| U73 7058:62120 | summary | dialog | width | 600 (the kit's wide dialog) | 600 at 420 (centred), radius 12 | match (`wide`; was 480) |
| U73 7058:62120 | summary | title | copy | "Ready to publish?" | "Ready to publish?" 600 24px/32px rgb(11, 18, 32) | match |
| U73 6374:25448 | summary | intro | copy, type, place | "When you publish, the connection is ready to be added to your services.", body/default 16/24 `#4a5468`, 72 below the dialog's top | the same text, 400 16px/24px rgb(74, 84, 104), dialog + 72 | match (FR-002; was "Once you publish, the connection goes live and you can add it to your form.") |
| U73 6374:25449 | summary | summary table | box | full width (536), 1 `#e1e6f0`, radius 8, 16 below the intro | 536, 1px rgb(225, 230, 240), 8px (was 12), intro + 40 (24 + 16) | match |
| U73 6374:25450 | summary | row "Documents" | layout, divider | px 16 py 8, gap 16, 1 bottom `#e1e6f0` | 16px / 8px, gap 16, 1px rgb(225, 230, 240) | match |
| U73 6374:25451 | summary | row label | type, width | label/default 600 16/24 `#1d56f0`, 112 | 600 16px/24px rgb(29, 86, 240), 112 | match |
| U73 6374:25453 | summary | documents | copy, type | "Personal ID · 7 data items", "Driving licence · 2 data items", body/default 400 16/24 `#0b1220` | the same lines (counts of the draft), 400 16px/24px rgb(11, 18, 32) | match (FR-044b) |
| U75 6376:25536 | Standard only | rules | copy | "Standard · 2 rules" | "Standard · 2 rules"; dialog 600 × 347 | match (FR-044b) |
| U77 6760:47979 | with variants | rules | copy | one line per variant: "Standard · 5 rules", "Ambulance · 6 rules", "School transport · 5 rules" | "Standard · 3 rules", "Ambulance · 4 rules", "School transport · 2 rules" (tab order) | match (counts are the draft's) |
| U63 7112:48859 | Standard renamed | rules | copy | "Taxi and rental cars · 5 rules" first | "Taxi and rental cars · 3 rules" first | match (002-S4.4) |
| U73 6380:26663 | summary | "Active from" | presence | "Now" / "On a date" radios | none | F1 |
| U77 6760:47353 | with findings | findings list | place, gap | 16 below the go-live row, 4 between lines | 16 below the table (no go-live row), row gap 4 (was 8) | match (F1 for the missing row) |
| U77 6760:47354 | with findings | warning line | icon, layout | `icon-warning-small` 20, 8 before the text, the row centred | `kern-icon--warning kern-icon--small` 20 × 20 in rgb(154, 74, 0) (`feedback-warning`), gap 8, `items-center` | match |
| U77 6760:47354 | with findings | warning line | type | body/small 400 14/24 `#0b1220` | 400 14px/24px rgb(11, 18, 32) (was 600 16px in `feedback-warning`, U33's older line) | match |
| U77 6760:47354 | with findings | warning line | copy | "Ambulance: no citizen can meet these rules. 2 rules contradict each other, and 1 rule is a duplicate." | "Ambulance: no citizen can meet these rules. 2 rules contradict each other." (the draft's findings; `dialogLineOf()`) | match (C4, F47) |
| U77 6760:47372 | with findings | info line | icon, type, copy | `icon-info-small`, 14/24 `#0b1220`, "Standard: 1 rule is a duplicate." | `kern-icon--info` rgb(2, 115, 174), 400 14px/24px rgb(11, 18, 32), "Standard: 1 rule is a duplicate." | match |
| U77 6760:47979 | with findings | line order | order | Ambulance (warning) before Standard (info); tab order Standard, Ambulance | Ambulance's line first, then Standard's | match (FR-044c, F47; was tab order) |
| U63 7112:48859 | Standard renamed | info line | copy | "Taxi and rental cars: 1 rule is a duplicate.", after Ambulance | "Taxi and rental cars: 1 rule is a duplicate.", after Ambulance | match |
| U75 6376:25536 | Standard only | findings | presence | none | none (no list) | match (003-S5.4) |
| U73 2:2513 | summary | secondary | copy, look, box | "Back to test", secondary, flex-1 (260 × 48) | "Back to test" `kern-btn--secondary`, 260 × 48 | match (FR-044a; was "Check rules again") |
| U73 2:2514 | summary | primary | copy, look, box | "Publish connection", primary, 260 × 48, 16 after the secondary | "Publish connection" `kern-btn--primary`, 260 × 48 at + 276 | match (FR-002; was "Publish") |
| U77 6760:47979 | with findings | primary | state | enabled ("Publish still works") | enabled, publishes | match (003-S2.22) |
| — | "Back to test" | behaviour | closes to | not drawn (U73 #26: back to the test step) | the dialog closes, the test step stays (h1 "Test rules with sample citizen data"), focus on the footer's "Publish" | match (FR-044a; supersedes 004-S5.3) |
| — | Escape / × | behaviour | closes to | not drawn | the dialog closes to the test step, focus on "Publish" | match (T071's row) |
| — | scrim click | behaviour | closes | not drawn | stays open | match (FR-052a: a publishing dialog) |
| — | publish | behaviour | request, outcome | not drawn here (U78, U79: T077) | `POST …/publish`, then the details ("Your connection is active") | match (unchanged; "Published" for 0.5 s: T077) |
| U73 7137:50210 | the example | info line | presence | "This is still the example. …" | none | OUT-9 (the example feature is deferred) |
| U73 6863:47751 … | behind the scrim | persona cards, data columns | — | U75–U77's older cards and document column | the test step's chips and flat list | F44, F63 (not built) |
| — | 320 × 640 | dialog | layout | not drawn | 273 wide (16 gutters), the label above the lines (`max-sm`), a three-line warning with its icon centred on the lines, the buttons stacked, the dialog scrolls; page `scrollWidth` 305 | FR-010 (T035's rows) |

Open rows: none.

**Decisions (T076):**

1. **The dialog's own state** (`PublishDialogState` / `PublishDialogAction` in `types.ts`, `publishDialogReducer()` at
   the top of `index.tsx`, `INITIAL_PUBLISH_DIALOG_STATE` in `constants.ts`): `{ phase: 'closed' | 'summary', from }`,
   actions `open` (with the step that opened it) and `close`. It decides whether the dialog is open
   (`PublishDialog`'s `dialog` prop replaces `open`) and what its cancel button reads. The request's lifecycle
   (`publishing`, `publishError`, `rulesChanged`, `conflict`) stays in the editor's state for now (`utils.ts` and its
   tests are outside T076's files); `openDialog` / `closeDialog` are still dispatched with it, as they reset the
   error. The reducer lives in `index.tsx` because no reducer file is listed for T076 or T077 (Path Conventions);
   a component file can't export it (react-refresh). UNCERTAIN (structure only, not the summary's behaviour).
2. **"Back to test" only from the test step.** Opened from another step (the edit flow's leave question "Save" on the
   rules step, the rules step's "Publish without rules") the cancel button keeps "Check rules again" with its
   baseline behaviour; from the documents step "Add rules" (002-S5.6) stays. No frame draws those openings.
3. **Warnings first** (`warningsFirst()` in `PublishDialog.tsx`, a stable sort over `findingLinesOf()`): `utils.ts`
   is outside T076's files, and `findingLinesOf()` keeps tab order for "Check rules again"
   (`firstBranchWithFindings()`, FR-017) and its tests.
4. **The findings lines' look** follows `Rules/Finding item` (14/24 regular, default text colour, the icon centred on
   the text's lines); the warning colour and weight of U33's older line are gone. The approval page shares
   `PublishFindingLine` and changes with it (C4).
5. **The edit flow's copy** ("Ready to save?", its intro, "Save", "Saving…") is unchanged: T077 builds "Save
   changes?".

### U80, U81, U88, U86 (F2), U87 (F1) Details: frame, status band, Links (S15) — T078, 2026-11-09

| frame | state | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|
| 6809:46423 | active | frame | step line | none (#27) | none (`WizardLayout variant="details"`, no `head`) | match (FR-025e) |
| 6809:46423 | active | column | x, width | 304, 832 | 304, 832 | match (L4) |
| 6809:46423 | active | status band | y (page) | 96 (64 + 32) | 96 | match |
| 7355:61767 | active | band | background, radius | `feedback-success-background` #eaf7e6, 12 | rgb(234 247 230), 12 | match |
| 7355:61767 | active | band | padding | 32 215 32 32 | 32 215 32 32 | match |
| 7355:61767 | active | band | height | 192 (with the date pill) | 124 | F52 (no pill: 32 + 60 + 32) |
| 7355:61771 | active | status icon | size, fill, position | 32 circle `feedback-success` #1d7a2e, at 32 32 | 32, rgb(29 122 46), 336−304 = 32, 128−96 = 32 | match |
| 7355:61771 | active | status icon | glyph | "Check" 24 white (Figma export) | `assets/icons/done-white.svg` (the export, new), 24 | match |
| 7355:61775 | active | h1 | text, style | "Your connection is active", heading/large 600 24/32 #0b1220 | same, `kern-heading-large` 600 24px/32px rgb(11 18 32), the page's one h1 | match (FR-046) |
| 7355:61773 | active | h1 → sub-line | gap | 4 | 4 (128+32 → 164) | match |
| 7355:61776 | active | sub-line | text, style | "Citizens can now share their data with you. Add the links below to your service.", body/small 14/24 #4a5468, one line in 537 | same, 400 14px/24px rgb(74 84 104), one line | match |
| 7355:61772 | active | text column | width | 537 (stops 16 before the picture) | 537 (the actions are positioned, outside the column) | match |
| 7355:61783 | active | picture | size, place | 247 × 145 at right −30, its visible part 217 × 129 bottom right | `published-art@2x.png` 217 × 129 at right 0 bottom 0 (919, 115 → band right 1136) | match (T006's crop); the 124 high band cuts its top 5 px (F52) |
| 7355:61777 / 7355:61782 | active | ⋯ | place | in the date pill (white, radius 8, padding 8 8 8 16) under the sub-line | the pill's white chip without the date (radius 8, padding 8, 48 × 48) at the band's top right (top 24, right 32), the ⋯ 32 × 32 centred on the title's line | F66, #52 (UNCERTAIN: the exact spot) |
| 7355:61777 | active | date pill | content | "Active since 23.10.2026, 14:32" | not built | F52 |
| 6417:31045 | menu open | menu | size, frame | 220 wide, padding 8, radius 8, 1 px #e1e6f0, Elevation/Menu | 220 × 103, T021's `ActionMenu` | match |
| 6417:31045 | menu open | entries | texts, order | "Change start date", "Deactivate", divider, "Delete connection" (danger) | "Deactivate", divider, "Delete connection" rgb(196 39 28) | F1 (no "Change start date") |
| 6417:31045 | menu open | "Deactivate" icon | glyph, size | "Icon/Link off" 24 | `assets/icons/link-off.svg` (the export, new) at 20 | match (the menu's 20 px icon slot, T021) |
| 6417:31045 | menu open | menu | place | below the ⋯, its right edge at the ⋯'s | below, to the left (876–1096, ⋯ 1056–1088 + 8 chip padding); not clipped (the picture is clipped in its own layer, V6) | match |
| 6417:31045 | menu → Deactivate / Delete | dialogs | opener | P15 / U90 | the existing dialogs (T082 restyles); Escape returns the focus to the ⋯ | match (behaviour 001-S6.9, S6.11) |
| 6809:46444 | — | links card | name header | none (U07 #9) | the accordion's header only (FR-052f) | match |
| 7246:51436 | open | card | border, radius, bg | 1 px `action-default-contextual` #1d56f0, 12, white | 1 px rgb(29 86 240), 12, white | match |
| 6809:46486 | closed | card | border | 1 px `decorative-border-default` #e1e6f0 | 1 px #e1e6f0 | match |
| 6809:46423 | — | band → links → summary | gaps | 16 (192 → 208, 699 → 715) | 16 (220 → 236 in the details' own column) | match |
| 7246:51437 | open | header | padding, height | 24, 100 | 24, 100 | match |
| 7246:51439 | open | title | text, style | "Links for your service", title/small 600 16/24 | same, h2 600 16px/24px | match |
| 7246:51440 | open | counts | text, style | "1 request link · 3 result links", 14/24 muted, 4 below | same, 400 14px/24px rgb(74 84 104), 4 below | match (FR-052f) |
| 7246:51442 | open / closed | toggle | label, style | "Hide links" / "View links" (U91 S), tertiary-small 14/24 600 action, 40 high, padding 0 8, no underline | same, `kern-btn--tertiary kern-btn--small`, 115 × 40, padding 0 8, `no-underline!` | match (width 115 vs 116: text rendering) |
| 7246:51442 | open | toggle | chevron | `icon-expand_more-small` | `expand-less-action-small.svg` while open | decision: the open state shows "less", as the Summary's toggle (T079) and the findings banner do; the frame keeps the closed glyph |
| — | closed → open | body | height | — (§4: 150–200 ms) | `grid-template-rows` 0fr → 1fr, 200 ms ease-out, `.motion`; 0 → 489; clipped while closed or moving, visible once open (bubbles reach out); `inert` while closed (Tab skips the copy buttons) | match (§4) |
| 6809:46445 | open | Request link part | padding, gap | 24, 8 | 24, 8 | match |
| 6809:46447 | open | number | size, style | 24 circle #1d56f0, 14/24 600 white | 24, rgb(29 86 240), 600 14px/24px white | match |
| 6809:46450 | open | title + ⓘ | style, gap | 16/24 600, ⓘ 20 muted, 4 apart | 600 16px/24px, `InfoTooltip iconSize="small"` muted, gap 4 | match |
| 6809:46454 | open | URL row | indent, box, button | pl 32; box 603 × 48 #f2f5fb radius 8 padding 8 16; "Copy link" 139 × 48 | x 361 (329 + 32); 603 × 48 rgb(242 245 251) 8 / 8 16; 139 × 48 | match |
| 6809:46458 | open | divider | line | 1 px #e1e6f0 between the parts | `divide-y` 1 px #e1e6f0 | match |
| 6809:46459 | open | Result link part | padding, gap | 24, 12 | 24, 12 | match |
| 7342:57911 | open | variant groups | gaps | 24 between groups, label 4 above the URL | 24, 4 | match (U07 #9) |
| 6809:46469 | open | variant label | style | label/small 14/24 600 #0b1220, indented 32 | 600 14px/24px rgb(11 18 32), x 361 | match |
| 6809:46469 | open | variant ⓘ | presence | none drawn | `BranchName`'s ⓘ after "Ambulance" (has a description), none after "Standard" / "School transport" | F51 |
| 6809:46501 | ⓘ hover | Request link tooltip | text, place | "This link is used by your service to generate a QR code for citizens to share their data using the EUDI Wallet. There’s one link for all variants.", 280 × 112 at x 448, 8 below the ⓘ | same text, 280 wide, x 448, 4 lines (112), 8 below | match |
| 6809:46590 | ⓘ hover | Result link tooltip | text | "Your service gets the citizen’s shared data from this link. Each variant has its own." | same | match (CLAR #49) |
| 6396:47841 | copied | Request link button | label, icon, duration | "✓ Copied" (check icon), narrower | "Copied" with `kern-icon--check`, 123 wide, back to "Copy link" after 2 s; `role=status` "Link copied" | match (FR-048, T028) |
| 6809:46472 | open | URL | one line, "…", full copy | one line cut with "…" | `truncate`; the clipboard holds the full trigger URL; hover shows the full URL bubble (Chromium and Firefox) | match (U07 #10) |
| 6809:46423 | — | Summary card (Download PDF) | presence | "Download PDF" | none | F53 |
| 6809:46493 | — | Activity card | presence | "Activity", "Last edited by …", "View activity" | none | F2 (U86 not read) |
| 6396:48739, 6396:48909 | — | "Change start date" | presence | drawn | none | F1 (U87's first frames not read) |
| 6424:34839 | — | footer | actions | "Edit connection" (secondary, pencil) left, "Go to connections →" (primary) right | "Edit connection" `kern-btn--secondary` + `kern-icon--edit` at x 160, "Go to connections" + `kern-icon--arrow-forward` primary at the right (1077–1280), 40 high, the 1120 column | match (FR-046; no "Create new connection") |
| 6424:34839 | — | "Edit connection" | target | step 1 after the entry confirmation (S17) | the edit flow with `{ step: 'connection' }`; no confirmation yet | T083 |
| 6701:40160 | — | header pill | name, status | "Your connections / <name>" + "Active" | same; the name a `span` now (`titleAsHeading` off) | match |
| — (W10) | description | meta | place, style | not drawn (U80 #006-S3.1: none on the page) | after the connection pill on the same row, 14/24 muted rgb(74 84 104), one line with "…" (y 28, centred on the 48 px pills); the long T078 description cut | W10 (T031's open row: closed, see §2) |
| — | — | tab title | text | "<name> · Konnekt" | "P8 Führerscheinantrag Esslingen · Konnekt" | match |
| — | published arrival | focus | target | — | the band's h1 (`tabIndex=-1`, no ring) | match (baseline 001-S5: the confirmation takes the focus) |
| — | long name / URL | header, URLs | overflow | — | the long name fits or is cut by `TopBar`; URLs cut; no horizontal scroll | match |
| — | 320 px | page | reflow | — (W2) | scrollWidth 305 of 320; band padding 16, the picture hidden below 768 (decorative), the ⋯ chip beside the text; the toggle wraps under the counts; the URL box full width, the button under it; footer in two rows | match (W2; the band's narrow layout has no frame) |
| — | Firefox 158 | accordion, menu, bubble | behaviour | — | 0 → 489 with `hidden` overflow while moving, `visible` once open, `inert` closed; the menu 220 × 103 below the ⋯; the full-URL bubble 280 | match |

#### Decisions (T078)

- **The ⋯ at the band's right end** (#52 "at its right end where the pill was", F66): kept in the
  date pill's white chip (radius 8, padding 8) without the date, at the band's top right (top 24,
  right 32, centred on the title's line), over the picture. In the text column's flow it would
  narrow the drawn 537 px text and wrap the sub-line; the bare ⋯ over the picture had no backing.
  Below 768 px (no picture) the chip sits in the flow beside the text. **UNCERTAIN** (placement
  only; the menu's behaviour is the baseline's).
- **The default accordion**: Links open only right after publishing (U80); every other arrival
  (the rows' "View", a direct visit, after saving) opens the Summary (FR-046 "Summary open from
  'View'"; the overview passes no state of its own). `initialAccordionOf()` / `toggleAccordion()`
  in `utils.ts` (tested); the page keeps `openAccordion`. Until T079 the Summary isn't an accordion,
  so a plain visit shows the Links closed. **UNCERTAIN** whether "after saving" (U99) should open
  something else (T079 / T083 may revisit).
- **`DetailAccordion.tsx`** (new, the plan's "accordions"): the card, the header with title, counts
  and the toggle, the animated body; Links uses it now, the Summary in T079.
- **Interim deactivated band** (until T080): tone `deactivated` with U89's audit texts ("Connection
  deactivated", "Citizens can’t start a new request. Your settings are saved."), the grey picture,
  the link-off glyph without a circle, `feedback-default-background`, "Activate again"
  (`kern-btn--primary`) before the ⋯, whose menu then holds only "Delete connection"; the old
  status card's reactivate alert stays under the band. Unverified against U89: T080's.
- **New assets**: `assets/icons/done-white.svg` (the band's check, Figma "Check" of "Icon/Success
  tick · filled") and `assets/icons/link-off.svg` ("Icon/Link off", U88), both the MCP exports
  unchanged.
- **Approval page** (S21): `DETAIL_COPY.linksLead` stays for `ApprovalUrls`; `linksTitle` now
  reads "Links for your service" there too; `LinkCard` is now a borderless part (padding 24)
  of a divided list, which the approval page's `ApprovalLinkCards` (`ol gap-12`) still uses (T088).
- `reachedStepsOf` (+ its test) removed (unused since T032); `DRAFT_STEPS` stays for
  `DraftDetails` (T081).
- `formatEditedDate` (carried from T044): the published details show no date any more (F52); the
  only date on this page is the draft card's `savedLineOf()`, which T081 replaces with
  "Edited <date>" (switch it there).

### U78, U79, U76 (F1) The publish dialog's states and the save dialog (S14) — T077, 2026-11-09

Setup:
- Browser: Chromium (playwright-core 1.48.2, `/usr/bin/chromium`), signed in as `designer`. Sizes: 1455 × 900 (body
  1440) and 320 × 640. Scripts: `<scratchpad>/phase8/T077/{states,edit,leave,narrow}.mjs`.
- Fonts: `document.fonts.check('400 16px "Fira Sans"')` and `'600 18px "Fira Sans"'` true.
- Data (T077's own, deleted at the end): drafts "T077 Findings" (three variants with findings, step test; every publish
  routed, never published), "T077 No rules" (Standard empty, step documents; publish routed), "T077 Publish me"
  (published for real through the dialog, then edited and saved for real once, then deleted). The failures, the slow
  "Publishing…", the conflicts and two of the edit flow's saves were routed with `page.route` (`502` with an
  `error_id`, an aborted request, `400`, `409 draft_changed`, `409 rules_changed`, `200` after a delay).
- Figma: `get_design_context` on `6387:65280` (U78 P3, "Dialog/Status" publishing), `6387:65289` (U78 P4, published)
  and `6376:27178` (U79 P5, the failed dialog); screenshot of `6417:31453` (U90, the dialog anatomy for W3/W7). U76
  `6635:36242` not read (F1). Every frame read matches its audit inventory; none has changed.
- Out of scope: the summary (T076's table), the dialog frame, header, × and button row (T035's `ConfirmDialog`
  table), the details after publishing (S15, T078/T079), the edit flow's steps and footers (S18, T083/T084).

| frame | state | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|
| U78 6387:65280 | publishing | status dialog | box | "Dialog/Status" 400 × 232, white, radius 12, no stroke, centred on the scrim | 400 × 232 at 520, 334 (centred), radius 12px, border 0, no ring, the design's scrim | match |
| U78 6387:65280 | publishing | status dialog | layout | padding 40 32, gap 16, column centred | padding 40px 32px, gap 16px, `items-center justify-center`, `min-h-232` | match |
| U78 I6387:65280;6391:65811 | publishing | loader | component | "Loader/Spinner 56" | `FeedbackLoader` (`.kern-loader--56`), turning; static under reduced motion (`.motion`) | match (T018) |
| U78 I6387:65280;6387:26939 | publishing | title | copy, type, place | "Publishing…", title/default 600 18/24 `#0b1220`, 120 below the top (content centred) | "Publishing…" 600 18px/24px rgb(11, 18, 32), y 120 | match |
| U78 I6387:65280;6387:26940 | publishing | line | copy, type, place | "This takes a few seconds.", body/default 400 16/24 `#4a5468`, 16 under the title | the same, 400 16px/24px rgb(74, 84, 104), y 160 | match (FR-002) |
| U78 6376:26519 | publishing | buttons, × | presence | none ("no buttons, can’t close") | none; the dialog itself holds the focus (`tabIndex -1`, `aria-label` "Publishing…") | match (FR-051 (41)) |
| U78 6376:26519 | publishing | Escape, scrim | behaviour | can't close | three Escapes and a scrim click: still open (`cancel` prevented; a `close` the browser forces reopens it) | match (FR-051 (41)) |
| U78 6387:65289 | published | success tick | look | "Icon/Success tick 56": 56 circle, 3 `#1d7a2e` ring, `#eaf7e6` fill, check 28 `#1d7a2e` | 56 × 56, 3px rgb(29, 122, 46), rgb(234, 247, 230), `kern-icon--check` 28 × 28 in rgb(29, 122, 46) | match (glyph: KERN's check, see decision 6) |
| U78 6387:65289 | published | title, line | copy, type | "Published" 600 18/24; "Opening your connection page…" 400 16/24 muted | the same, in one polite `role="status"` | match |
| U78 6376:26662 | published | hand-off | timing | "green check for 0.5 s, then the Published page" | the details 514 ms after "Opening your connection page…" showed (real publish), 521 ms under `reducedMotion: 'reduce'` | match (FR-044d, CLAR #33, FR-050) |
| U78 6376:26662 | published | the details | arrival | the Published page with the links | h1 "Your connection is active", "Hide links" expanded (Links open), "View summary" closed | match (T078's `initialAccordionOf()`, state `{ published: true }` unchanged) |
| U79 6376:27178 | failed | title | copy | "Ready to publish?" | "Ready to publish?" | match |
| U79 6376:27178 | failed | alert | look | KERN danger alert, title only: 32 icon, title/default 600 18/24 | `KernAlert` danger, 536 wide, title 600 18px/24px in two lines | match |
| U79 I6376:27178;2:12877;6374:25511;1:4101 | failed | alert | copy | "Couldn’t publish, so nothing has changed. Check your internet connection and try again." | the same (network failure and `5xx`) | match (decision 2) |
| U79 6376:27178 | failed | alert | error ID | none | `502` with `error_id`: the alert's body "Error ID: err-t077-0001" (alert 144 high); a network failure: title only | F46 (FR-008) |
| U79 6376:27178 | failed | summary | presence | none (only the alert) | the alert, then the intro, the summary table and the findings lines as in `summary`; the dialog 600 wide (U79's 480 is its summary-less body) | F46 |
| U79 6376:27178 | failed | buttons | copy, look | "Back to test" secondary, "Try again" primary | "Back to test" `kern-btn--secondary`, "Try again" `kern-btn--primary` | match |
| — | failed | `400` | copy | not drawn | the alert "Couldn’t publish" with the server's message (002-S5.3) | match (§3 "Alert, page level") |
| — | failed | focus | where | not drawn | on the dialog's × as it reopens; the alert (`role="alert"`) is read | match (decision 3) |
| — | retry | behaviour | outcome | "Try again" publishes again | the status dialog again, then the next outcome (network, `400`, conflict walked in a row) | match |
| U90 6417:31453 | conflict `draft_changed` | dialog | anatomy | 480, title, text, the buttons | 480 wide: "This draft has changed", the server's message, the hint, "Cancel" (tertiary), "Reload", "Replace their changes" | W3 (decision 4) |
| U90 6417:31453 | conflict `rules_changed` | dialog | anatomy | 480, title, text, the buttons | 480 wide: "The rules changed since you opened them", the message, the hint, "Reload" and "Replace their changes"; Escape closes it into the flow | W7, W9 |
| — | conflict | "Cancel" | behaviour | not drawn | closes; "Publish" opens a fresh summary (no alert) | match (005-S2) |
| — | without rules | dialog | copy | not drawn | "Publish without rules?", "Without rules, anyone who shares these documents can apply.", "Rules · No rules", no findings, "Add rules" and "Publish connection"; opened by the rules step's "Publish without rules" | 002-S5.6 (decision 5) |
| — | without rules, failed | dialog | copy | not drawn | the alert over the same body; "Add rules" opens the rules step (h1 "Set eligibility rules for citizens") | match |
| — | save dialog | summary | copy | not drawn (U76 is F1) | "Save changes?", the save intro, the summary, "Back to test" (from the test step) and "Save" | FR-045c (decision 7) |
| — | save dialog | saving, saved | copy | not drawn | "Saving…" / "This takes a few seconds.", "Saved" / "Opening your connection page…" in the same 400 × 232 status dialog | FR-045 |
| — | save dialog | failed | copy | not drawn | "Couldn’t save, so nothing has changed. Check your internet connection and try again." with the error ID, the summary kept, "Try again" | F46 (decision 2) |
| U99 6730:39732 | saved | the details | toast | "Changes saved." | the details with the toast "Changes saved" | match (the period is the details' copy: note for T079/T081) |
| — | "Save your changes?" → Save | behaviour | outcome | not drawn | the save dialog from step 1, then "Saved", then the details; Escape in the save dialog keeps the member in the flow (h1 "Connection details") | match (FR-026, #47; T047) |
| — | "Save and log out" | behaviour | outcome | not drawn | the save dialog, "Save", then the sign-in screen (no "Saved" state) | match (decision 8) |
| U76 6635:36242 | go-live date | "Active from", date, "Schedule" | presence | drawn | none | F1 |
| — | 320 × 640 | status dialog | layout | not drawn | 273 × 232 (16 gutters), the content centred; page `scrollWidth` 305 | FR-010 |
| — | 320 × 640 | failed | layout | not drawn | 273 wide, the alert's title in five lines, the error ID breaking anywhere, the dialog scrolls (602 high) | FR-010 |

Open rows: none.

**Decisions (T077):**

1. **The phases are the dialog's own state** (`PublishDialogState` in `types.ts`: `phase` = `closed | summary |
   noRules | publishing | published | failed | conflict`, with `from`, `withoutRules`, `failure`, `conflict`,
   `connectionId`; `publishDialogReducer()` at the top of `FormConnectionEditor/index.tsx`; actions `open`, `publish`,
   `published`, `failed`, `conflict`, `close`). `PublishDialog` renders only from it. The failure and the conflict
   stay through the next attempt and the closing, so that the words don't change while the dialog fades out. The
   editor's `publishing`, `publishError`, `rulesChanged`, `conflict` and `dialogOpen` are still dispatched as before
   (`utils.ts` and its tests are outside T077's files): `publishing` still drives the footer and the leave model's
   `busy`; the others no longer reach the dialog. UNCERTAIN (structure only).
2. **The failure's words**: the design's sentence (U79 `I6376:27178;…;1:4101`) "Couldn’t publish, so nothing has
   changed. Check your internet connection and try again.", which the task line shortens to "Couldn't publish. Check
   your internet connection and try again."; the frame decides wording (FR-002, CLAR #33 "the design's 'Couldn't
   publish' sentence"). It is the slim alert's title; a `5xx` adds the error ID as the alert's body (the §3 "Alert,
   page level" pattern). Network failures and `5xx` (nginx's `502`/`503` without JSON included) get it, as
   `draftSaveErrorOf()` does for the save toast; any other refusal (a `400`) keeps "Couldn’t publish" with the server's
   message (002-S5.3). The edit flow: "Couldn’t save, so nothing has changed. …" (no frame). UNCERTAIN (wording only).
3. **Two native dialogs**: the summary, the failure and the conflict are one `ConfirmDialog` (it stays open from one
   to the other, as when "Save as new draft" fails); the status dialog is a second `<dialog>` in `PublishDialog.tsx`
   (`ConfirmDialog` always draws a header and footer). The status dialog closes in a layout effect and opens in a
   passive effect after `ConfirmDialog`'s, so one closes before the other opens and the focus returns to the footer's
   "Publish" each time. After a failure the reopened dialog focuses its first control, the ×, and the alert
   (`role="alert"`) is read; the baseline kept the focus on the pressed button.
4. **The conflict in U90's anatomy**: the publish dialog's conflicts now look like the "Save and exit" conflict dialog
   (`DraftConflictDialog`): the default 480 width, the conflict's title as the dialog's title, the server's message
   and the hint as the body, no summary; the buttons are the baseline's. `rules_changed` keeps "Reload" in the cancel
   slot and "Replace their changes" (W9).
5. **"Publish without rules?" from the rules step**: the documents step no longer offers "Publish without rules"
   (F17), so `noRules` would be unreachable in the create flow. The dialog asks it whenever the flow has no rule
   (`rulesNextActionOf(current) === 'publishWithoutRules'` when it opens): the rules step's "Publish without rules",
   and the edit flow's leave-question "Save" without rules. "Add rules" closes it into the rules step (from another
   step it opens the rules step). UNCERTAIN (no spec item names the rules step; behaviour of an existing question).
6. **The success tick's check** is KERN's `kern-icon--check` (rounded Material Symbols) tinted
   `feedback-success`, 28 px, not the frame's exported "Check" (Material Icons): a new asset file is outside T077's
   files. UNCERTAIN (glyph shape only).
7. **The save dialog's words**: "Save changes?" (FR-045c, #47) replaces "Ready to save?"; its intro stays the save
   intro of F27 ("Citizens keep using the current version until you save. …"), as no frame draws it (U76 is F1);
   "Saving…", "Saved" and "Opening your connection page…" mirror the publish words.
8. **"Save and log out" skips "Saved"**: once saved, the dialog closes and the log-out runs at once (its local-drafts
   warning may follow); a cancelled log-out opens the details with "Changes saved." as before (T048's
   `logOutNow(forget, onCancelled)` kept). "Opening your connection page…" would be wrong there.
9. **The 0.5 s timer** is an effect in the editor keyed on the `published` phase and the connection's id
   (`PUBLISHED_DELAY_MS = 500` in `constants.ts`), cleared if the page unmounts first (the browser's back button);
   no transition, so reduced motion doesn't touch it. The details' router state is unchanged (`{ published: true }`
   / `{ saved: true }`, `detailsRouteOf()`).

### U82, U83, U84, U85, U91, U92 (F2) Details: the Summary accordion and the rule checks (S15) — T079, 2026-11-09

| frame | state | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|
| 6396:48191 | open | card | border, radius, bg | 1 px `action-default` #1d56f0, 12, white | 1 px rgb(29 86 240), 12, white (`DetailAccordion`, T078) | match |
| 6396:48192 | open | header | padding, height | 24, 100 | 24, 100 (h2 y 379 = 354 + 1 + 24) | match |
| 6396:48194 | open | title | text, style | "Summary", title/small 600 16/24 #0b1220 | same, h2 600 16px/24px rgb(11 18 32) | match |
| 6396:48195 | open | counts | text, style | "2 documents · 9 data items · 3 variants · 4 rules", 14/24 muted, 4 below | "2 documents · 7 data items · 3 variants · 4 rules" (seeded 82e5e493: 4 + 3 fields; Rule 01 changed in Ambulance counts once, Rule 04 added in School transport counts), 400 14px/24px rgb(74 84 104), 4 below | match (FR-046 (i); `summaryCountsOf()`, tested with U82's 7 + 2) |
| 6396:48196 | open | "Download PDF" | presence | secondary button, download icon | none | F53 |
| 6396:48196 | open | "Edit rules" | presence | not drawn (U83 #35: "single edit entry") | none (the old card's "Edit rules" removed) | FR-046 (a) (decision below) |
| 6396:48197 | open / closed | toggle | label, size | "Hide summary" / "View summary" (7246:50864), tertiary-small 144 × 40 | same, 144 × 40 at x 967 | match |
| 6396:48197 | open | toggle | chevron | `icon-expand_more-small` | `expand-less-action-small.svg` while open | T078's decision (open shows "less") |
| 7246:50864 | closed | card | height, border | 102, 1 px #e1e6f0 | 102, 1 px #e1e6f0 | match |
| 6396:48198 | open | content | padding, gap | 0 24 24, 24 | 0 24 24, 24 (Documents y 455 = header bottom) | match |
| 6396:48199 | open | "Documents" | style, level | 600 16/24 `action-default` (U03 #28) | h3 600 16px/24px rgb(29 86 240) | match |
| 6396:48201 | open | document head | layout | glyph 20 at 0, name at 28, count at 109; gap 8 | glyph 20 at 0, h4 at 28, count at 109 (329 / 357 / 438) | match |
| 6396:48202 | open | glyph | asset, size | "Icon/Glyph" personal-id / driving-licence, tone ink, 20 | `personal-id-ink.svg` / `driving-licence-ink.svg` (the row's `glyphOf()`), 20 × 20 | match |
| 6396:48203 | open | name, count | style | label/small 600 14/24 muted; body/small 400 14/24 muted "7 data items" | 600 / 400 14px/24px rgb(74 84 104), "4 data items" | match |
| 6396:48205 | open | chips | layout, chip | wrap, gap 8, 8 under the head; "Rules/Value chip" white, 1 px #e1e6f0, radius 4, 2 8, 600 14/24, 30 high; "Family name" 98 wide | same (`ValueChip`), 30 high, "Family name" 98 wide, y 535 = 503 + 24 + 8 | match |
| 6396:48213 | open | documents | gap | 24 (48 → 134) | 24 (503 → 589) | match |
| 6396:48221 | open | divider | line | 1 px `action-default` at 30 %, 24 after the documents | 1 px rgb(29 86 240), opacity 0.3, y 675 (651 + 24); `aria-hidden` | match |
| 6396:48222 | open | "Rules" | style, place | 600 16/24 `action-default`, 24 under the line | h3 600 16px/24px rgb(29 86 240), y 700 | match |
| 6760:48704 | findings | lines | layout | column, gap 4, padding-bottom 8, 24 under "Rules" | `ul` gap 4, pb 8, y 748 (700 + 24 + 24) | match |
| 6760:48705 | findings | line | anatomy | 20 icon, 8, body/small 400 14/24 `layout-text-default` | `FindingsBannerLine` with one plain part: 20 icon, gap 8, 400 14px/24px rgb(11 18 32) | match |
| 6760:48705 | findings | warning icon | colour | `icon-warning-small` (feedback-warning) | `kern-icon--warning` rgb(154 74 0) | match |
| 6760:48723 | findings | info icon | colour | `icon-info-small` (feedback-info) | `kern-icon--info` rgb(2 115 174) | match (§1.5 AA value) |
| 6760:48704 | findings | text | wording | "Ambulance: no citizen can meet these rules. 2 rules contradict each other, and 1 rule is a duplicate." / "Standard: 1 rule is a duplicate." | the publish dialog's `dialogLineOf()`: d3e0b04d "Standard: no citizen can meet these rules. 2 rules contradict each other."; 82e5e493 "Standard: 1 rule already covered." × 3 variants; the U85 sentence word for word in `utils.test.ts` | match (C4, U06 #10 "the same lines") |
| 6760:48704 | findings | order | — | Ambulance's warning before Standard's info | warnings first, each kind in tab order (`summaryFindingsOf()`) | match (FR-044c) |
| 6760:48704 | findings | names | links | none drawn | plain text (one string part, no `FindingLink`) | match (CLAR #36) |
| — | before the checks | lines, icons | presence | — | nothing until a variant's first check (W13); no "Checking…" text | match (decision below) |
| 6760:48532 | findings | tab row | layout | 24 under the lines; gap 24, items-end, 1 px #e1e6f0 under, 39 high | y 860 (748 + 88 + 24), gap 24, 1 px rgb(225 230 240), 39 | match |
| 6760:48533 | findings | tabs | style | selected 600 16/24 #0b1220 + 2 px indicator; unselected 400 16/24 #4a5468 | the same (`BranchName` `tab`, T026) | match |
| 6760:48534 | findings | tab icon | kind | Standard info ⓘ, Ambulance ⚠, School transport none | by the checks (`tabFindingsOf()`): d3e0b04d Standard ⚠; 82e5e493 ⓘ on all three ("already covered"); 20 px, 4 after the name | match (FR-041) |
| — | findings | tab | accessible name | — | "Standard has findings" (W13) | match |
| — | focus on ⓘ | tab tooltip | text | not drawn | "1 finding: Anyone who meets Rule 03 also meets Rule 02." (the description first when there is one) | match (FR-041, T026) |
| 6650:37775 | no findings | Standard ⓘ | presence | grey ⓘ with a description | `BranchName`'s ⓘ only with a description (fbf6e645 Standard: none, none shown) | match (FR-035c) |
| 6650:37774 | — | tab row | ⋯, "+ Add variant" | none | none | match (U03 #25) |
| 6650:37779 | Standard | rule list | box | 24 under the tabs; white, 1 px #e1e6f0, radius 12 | y 923 (860 + 39 + 24), white, 1 px #e1e6f0, 12 | match |
| 6650:37780 | Standard | rule row | size, padding | 102 high, 8 16 8 24 | 102 (T024's row) | match |
| 6650:37780 | Standard | identifier | presence | none drawn | "rule-1" after "Rule 01", hidden word "Identifier" | F35 |
| 6650:37780 | Standard | actions column | width | 32, empty | 32, empty | match (T024) |
| 6650:37781 | Standard | connector | row, pill | 44 high, padding 8 24; pill without arrow | 44; a `span`, no chevron, no menu | match (T023, U03 #26) |
| 6648:68709 | Ambulance | changed rule | tint, inset, radius | `variant/changed-background` #f8f1fc, 8 in, 8 | rgb(248 241 252), 9 from the list's outer edge (1 + 8), 8 | match |
| 6648:68710 | Ambulance | mark | text, colour | "Changed here" 600 14 #8a22b5 | same, rgb(138 34 181) | match (U03 #27) |
| 6648:69175 | School transport | added rule | tint, mark | #f8f1fc, "Added here" | rgb(248 241 252), "Added here" rgb(138 34 181) | match |
| 6648:69104 | School transport | rows | content | Rule 01–03 unmarked, the added rule last | Rule 01–03 unmarked, Rule 04 "Added here" last | match |
| — | deactivated (fbf6e645) | groups | frame | not drawn | Group 01 with its message and Sub-group 02 through `GroupFrame` (T025), identifiers "group-1", "group-2" | match (F26) |
| 7203:50468 | from "View" | accordions | open | Links collapsed (102), Summary open, 16 apart | plain visit: Links `aria-expanded=false`, Summary true; 236 + 102 + 16 = 354 | match (FR-046 (b)) |
| 6396:47966 | after publishing | accordions | open | (U80) Links open | Links open, Summary closed (102, y 810) | match (T078) |
| — | toggle | one open | — | — | opening the Summary closes the Links; "Hide summary" leaves none open | match (FR-046) |
| — | closed | body | a11y | — | inert (the tabs leave the tab order) | match (T078) |
| — | keyboard | tabs | keys | — | ArrowRight / ArrowLeft wrap, Home, End select and focus; Tab goes to the selected tab's ⓘ; the panel `aria-labelledby` the tab | match (WAI-ARIA tabs, as the test step) |
| — | network | findings | stored, sent | never (FR-047) | only GETs (`auth/me`, the connection, `option-sets`, `document-types`); no `console.*` in the folder | match |
| 6760:48537 | Firefox | summary | layout, checks | — | the same y values (354, 860, 923), the three lines, "Changed here"; the checks' Worker runs | match |
| — | 320 px | summary | reflow | — (W2) | scrollWidth 305 of 320; chips and tabs wrap ("School transport" on a second row), the counts line wraps | match |
| 6396:48075 | — | Activity card | presence | "Activity", "Last edited by …" | none | F2 (U92 not read) |
| — | draft (76abafb6, 414d27ee) | summary | interim | — | the same accordion, open, `draft`: documents (or "No documents yet"), "0 documents · 0 data items · 1 variant · 0 rules", tabs, no checks, no findings | T081 |

#### Decisions (T079)

- **"Edit rules" dropped** from the Summary header: FR-046 (a) gives one "Edit connection"
  (supersedes 002-S6.6 and 007-S5.8's rules entry), U80–U85 draw none (U83 #35 "single edit
  entry"), and its place is "Download PDF"'s (F53). `EDIT_RULES_STATE` and `DETAIL_COPY.editRules`
  are removed. Not UNCERTAIN (FR-046 settles it).
- **The findings lines are the publish dialog's per-variant lines** (`dialogLineOf()` via the
  editor's `findingLinesOf()`), warnings first, as U85 6760:48704 draws them and U06 #10 says
  ("Published summary lists the same lines"), rendered as read-only `FindingsBannerLine` rows: a
  `BannerItem` with one plain string part and no kind text, so no name is a link (CLAR #36) and
  `FindingsBannerLine` needs no change. `summaryFindingsOf()` in `utils.ts` (tested).
- **One checks instance, the approval page's shape** (research R7): `RulesSummary` fetches the
  catalog (`useDocumentTypes()`) and gives `RulesSummaryContent` `checkDocuments`
  (`requestedRuleDocuments(catalog, requestedDocumentsOf(documents))`); `RulesSummaryContent`
  joins it with the value sets (`useOptionSets()`) into the context and calls
  `useRuleChecks(keyedBranches, context, selectedTabKey)` once: the module Worker
  `workers/checks.ts`, the open tab checked first. Without `checkDocuments` (a draft, the
  approval page's `PublishSummary`) the context is null and nothing is checked or loaded.
- **Nothing while checking**: no "Checking the rules…" text; lines and icons appear when a variant's
  first check ends (W13), and a failed check or catalog shows the rules unchecked. The page has no
  status region for findings (they don't change on this read-only page). UNCERTAIN (does not touch
  the core behaviour): V10 lists "the findings' status region" for the screens that have one.
- **The checks run whenever the page shows a published connection**, also while the Summary is
  closed (the body stays mounted, inert), so the tab icons and lines are ready when it opens.
- **The documents moved into the Summary** (U82: one card): `DocumentsSummary` is now the
  Summary's documents part (h3, no card, no hint "Citizens share this data from their EUDI
  Wallet.", which no frame draws); document names are h4. The headings: h1 band, h2 "Links for your
  service" / "Summary", h3 "Documents" / "Rules", h4 the documents.
- **Every variant is a tab**, Standard alone too (as the rules and test steps); the tab ids come
  from `useId()`, the panel is the open tab's `SummaryBranch` (`role=tabpanel`, not focusable, as
  on the rules and test steps).
- **The counts**: `summaryCountsOf()` = documents · all requested fields · `rulesCountsOf()`
  (unchanged, its tests untouched).
- **DraftDetails (T081's file), minimal change forced by the shared props**: the separate
  `DocumentsSummary` card would have doubled the documents, and `RulesSummary` lost
  `formConnectionId` and `catalog` (it fetches the catalog itself), so `DraftDetails` now renders
  `<RulesSummary branches documents draft />` and no longer calls `useDocumentTypes()`; `open` /
  `onToggle` are optional, and without them the accordion keeps its own state and starts open
  (FR-049 "the Summary open first").

### U89, U96, U97, U94 (F1), U95 (F1) Details: deactivated, loading, error, unknown (S15) — T080, 2026-11-09

| frame | state | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|
| 7355:61530 | deactivated | band | background, radius | `layout-background-hued` #f2f5fb, 12 | rgb(242 245 251), 12 | match |
| 7355:61530 | deactivated | band | padding, place | 32 215 32 32, y 96 (64 + 32) | 32 215 32 32, 304 / 96 / 832 | match |
| 7355:61530 | deactivated | band | height | 192 (with the date pill's status row) | 124 | F52 (no pill: 32 + 60 + 32) |
| 7355:61535 | deactivated | status icon | circle | 32, `layout-text-muted-contextual` #4a5468, at 32 32 | 32, rgb(74 84 104), 336−304 = 32, 128−96 = 32 | match |
| 7355:61536 | deactivated | status icon | glyph | "Icon/Link off" 20, white, centred (6 6) | `link-off-white.svg` (the export, new) 20 × 20 at 342, 134 | match |
| 7355:61540 | deactivated | h1 | text, style | "Connection deactivated", heading/large 600 24/32 #0b1220 | same, the page's one h1, 384 / 128, 32 high | match (FR-046) |
| 7355:61541 | deactivated | sub-line | text, style, gap | "Citizens can’t start a new request. Your settings are saved.", body/small 14/24 #4a5468, 4 under the h1 | same, rgb(74 84 104), y 164 (128 + 32 + 4), one line | match |
| 7355:61537 | deactivated | text column | width | 537 | 537 | match |
| 7355:61552 | deactivated | picture | file, crop | "Picture · deactivated" 247 × 145 at right −30, visible 217 × 129 bottom right | `published-art-grey@2x.png` 217 × 129 at right 0 bottom 0 (919, 91 → band right 1136; the 124 band cuts its top 5) | match (T006's crop; F52 for the height) |
| 7355:61549 | deactivated | "Activate again" | kind, size | button-primary, 151 × 48, label 16/24 600 | `kern-btn--primary` 151 × 48, rgb(29 86 240) | match |
| 7355:61548 / 7355:61543 | deactivated | ⋯ | place | 32 ⋮ inside the date pill (white, radius 8, 8 16 8 8) | the pill's white chip without the date (radius 8, padding 8, 48 × 48) with the 32 ⋯ | F52, F66 (T078's chip) |
| 7355:61542 | deactivated | button → ⋯ | order, gap | ⋮ (in the pill) then the button, 16 apart | "Activate again" then the chip, 16 apart (889–1040, 1056–1104), the DOM in the same order | F66 (#52: "Activate again" before the ⋯) |
| 7355:61542 | deactivated | actions | place | the status row 20 under the text, at the text's left | the band's top right (top 24, right 32), centred on the title's line, over the picture | F66, #52 ("at its right end where the pill was"); T078's UNCERTAIN placement carried |
| 6417:31045 (U88) | deactivated, menu open | ⋯ menu | entries | not drawn in U89 | "Delete connection" only (no "Deactivate") | match (FR-048, #52 "the entries the state allows") |
| 6701:40414 | deactivated | header pill | status | "Deactivated" grey dot + text | `ConnectionStatusBadge` "Deactivated" | match |
| 6417:31307 | deactivated, Links open | URL box | look | unchanged: #f2f5fb, 16/24 #0b1220 | unchanged (`CopyableUrl`, T028) | match |
| 6417:31309, 6417:31325, …31331, …31337 | deactivated, Links open | "Copy link" | state | button-primary at `action-state-opacity-disabled` 40 % | all four `aria-disabled="true"`, opacity 0.4, focusable; Enter copies nothing (the label stays "Copy link") | match (FR-046, W21) |
| — (FR-052b) | deactivated, hover / focus | "Copy link" | explanation | not drawn (U89 "Missing here" FR-052b) | the tooltip "Activate the connection first" (T022's `ExplainedButton`), also the button's description; the name stays "Copy link Request link" / "Copy link Result link Standard" … | W21 (the coordinator's undrawn text, T028) |
| 7246:55723 | deactivated, Links open | Links card | border | 1 px `action-default` (open) | 1 px rgb(29 86 240) (`DetailAccordion`) | match (T078) |
| 7246:57005 | deactivated, all closed | cards | — | Links, Summary (+ Download PDF), Activity closed | Links and Summary closed; no PDF, no Activity | F53, F2 |
| 7246:55146 | deactivated, Summary open | Summary | content | the same Summary as active | the same (`RulesSummary`, checks on; nothing depends on `is_active`, T079) | match |
| 7355:60885 / 7355:61546 | deactivated | "Deactivated since …" pill | presence | drawn | none | F52 |
| 6417:31447 | after deactivating | toast | text, Undo | "Connection deactivated." with "Undo" | "Connection deactivated" without Undo (the existing toast) | F (no Undo, FR-048 / OUT-38); the text's period: T082 |
| — | Activate again (keyboard) | focus | target | — | the band's h1 "Your connection is active" (`tabIndex=-1`, no ring); the band turns green, the copy buttons on, the toast "Connection reactivated" | decision (below) |
| — | Deactivate → confirm | focus | target | — | back on the ⋯ (the native dialog's return; the ⋯ stays); Shift+Tab reaches "Activate again" | match |
| — | reactivating fails (5xx) | alert | place | — (T082 builds the dialog, U89 7173:52874) | the old `KernAlert` "Couldn’t reactivate" with the server's message under the band; the focus stays on "Activate again" | T082 |
| U94 7246:52715, 7246:53289; U95 7246:53937, 7246:54565 | scheduled | page | — | the scheduled frames | built as active (no scheduling: F1) | F1 (not read) |
| — (U06 #95) | loading | page | frame | "skeletons in the final layout" | `WizardLayout variant="details"` (the 832 column at 304), header pills without the name, no h1, `role=status` "Loading the connection…" | match (T017's open "details' own skeleton" row closes) |
| — (§3 Skeleton) | loading | band skeleton | shape | — | `layout-background-hued` band 832 × 124, radius 12, padding 32 (16 below 640: 92 high), a 32 circle `#e4e8ef`, a 240 × 14 bar on the title's line (y +9), a 360 × 10 `#eff1f5` bar on the sub-line's (y +43); bars radius 4 | match (§3 values) |
| — (§3 Skeleton) | loading | accordion skeletons | shape | — | two white cards 832 × 102, 1 px #e1e6f0, radius 12, padding 24, at y 236 and 354 (the loaded page's), a 160 × 14 strong and a 200 × 10 light bar on the title's and counts' lines | match (§3 values; the loaded closed accordions' geometry) |
| — | loading | footer | actions | — | "Go to connections →" (primary) at the right, where the loaded page keeps it | decision (below) |
| W2 (T037's pattern) | failed, 5xx | page | anatomy | not drawn | h1 "Couldn’t load the connection" (display 40/48), the danger alert "Check your connection and try again." with the server's message and "Error ID: 3f2c9a7e-…", "Try again" and "Go to connections"; the 832 column; no footer | W2 (T037's open "Error state of a page" error ID row closes; T017's `FormConnectionLoadState` "error ID" row closes) |
| W2 | failed, no answer (offline) | alert | body | — | no notice: the alert's title, "Try again" and "Go to connections" only (no repeated sentence) | W2 |
| W2 | failed → Try again | behaviour | — | — | reloads; the details appear | match (baseline 001-S6.14) |
| W2 (T037) | deleted / unknown | page | anatomy | not drawn | "Page not found" (`NotFound`, T037: the empty-state card with "Go to connections") in the 832 column; no footer; tab title "Page not found · Konnekt" | W2 (US4-AS6) |
| — | 320 px (200 %) | deactivated band | reflow | — (W2) | scrollWidth 305 of 320; no picture, padding 16; "Activate again" and the ⋯ share a row under the text, 20 below it (from the band's padding below 640, under the text from 640 to 767); the h1 wraps | match (W2; no frame) |
| — | 768 / 800 px | deactivated band | overlap | — | the actions at the top right (button x 490 of a 721 band at 768), the text 426 wide: the sub-line stays on one line, nothing overlaps | match |
| — | 320 px | Links (deactivated) | reflow | — | the URL box full width, the disabled "Copy link" under it, its tooltip on hover / focus | match (T028) |
| — | 320 px | loading, failed, unknown | reflow | — | scrollWidth 305; the skeleton band 273 × 92, the alert and the card full width | match (FR-010) |
| — | active (82e5e493) | band | regression | — | the ⋯ chip unchanged (48 × 48 at 1056, 120; ⋯ 1064, 128), the check 24 px, copy buttons on | match (T078) |

#### Decisions (T080)

- **"Activate again" outside the chip**: U89 draws the button beside the white pill on the band,
  not in it, so `StatusBand` takes it as `mainAction` (new prop), 16 px before the chip that holds
  the ⋯ (`actions`). The order follows #52 / FR-048 / the task ("Activate again" before the ⋯),
  not the frame's ⋮-then-button. Placement at the top right is T078's (still UNCERTAIN there, not
  re-decided). Below 768 px the button and the chip take a row of their own under the text (20 px,
  U89's status row gap), under the icon too below 640 px so both fit at 320.
- **Focus after "Activate again"**: the band's h1 ("Your connection is active"): it says what
  changed, sits where the button was, and the ⋯ isn't reachable by ref. After "Deactivate" the
  native dialog returns the focus to the ⋯, which stays; nothing added.
- **The load failure's notice (W2)**: `useFormConnection` keeps it in the `failed` state
  (`notice: ErrorNotice | null`, `errorNoticeOf()` for an `ApiError`, null without an answer so the
  alert's title isn't repeated), and `FormConnectionLoadState` reads `state.notice` itself; its
  unused `notice` prop is gone. So the edit flow (`FormConnectionEdit/index.tsx`, unchanged) shows
  the error ID too, without a change in T083's file. (The carried note said "the pages pass it as
  `notice`"; reading it from the state needs no page change.)
- **`FormConnectionLoadState`**: new optional `variant` (the loaded screen's frame, passed to
  `WizardLayout`) and `skeleton` (the screen's own skeleton, wrapped `aria-hidden` under the
  status); `footer={null}` now means no footer (was the Home link through `??`).
- **Footer while the connection isn't there**: loading shows the loaded page's "Go to connections →"
  where it stays (FR-046: no "Create new connection", no "Home"); the error state and "Page not
  found" show no footer, because their alert / card already hold the way back and a second
  "Go to connections" primary would repeat it. `DETAIL_COPY.home` removed. UNCERTAIN (no frame
  draws these states; does not touch the core behaviour).
- **The details' skeleton** (`DetailsSkeleton` in `index.tsx`): the band without a status colour
  (`layout-background-hued`, which the deactivated band uses; the status is unknown while loading)
  and both accordions closed, matching the loaded page's geometry (124 / 102 / 102, 16 apart), so
  nothing moves when the page arrives as from "View" (the Summary then opens below).
- `formatEditedDate` (carried from T044): nothing to switch here; the published details show no
  date (F52) and the only date left is the draft card's `savedLineOf()` (T081).

### U93 (+ U07 #22–#29) The draft details (S16) — T081, 2026-11-09

| frame | state | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|
| 7362:54691 | complete | frame | step line | none | none (`WizardLayout variant="details"`, no `head`) | match (FR-025e; the old `WizardProgress` head gone) |
| 7362:54691 | complete | column | x, width | 304, 832 | 304, 832 (Chromium 1455); 312 in Firefox (its gutter) | match (L4) |
| 7362:54697 | complete | band | y, size | 96 (64 + 32), 832 × 208 | 304 / 96, 832 × 208 | match |
| 7362:54697 | complete | band | background | `linear-gradient(113.27°, feedback-info-background-contextual #e0f2fe 21.638 %, layout-background-hued #f2f5fb 75.912 %)` | `linear-gradient(113.27deg, rgb(224 242 254) 21.638%, rgb(242 245 251) 75.912%)` (Chromium and Firefox) | match (U07 #23) |
| 7362:54697 | complete | band | padding, radius | 32 215 32 32, 12 | 32 215 32 32, 12 | match |
| 7362:54701 | complete | status icon | circle | 32, `feedback-info` #0284c7, at 32 32 | 32, rgb(2 115 174) = #0273ae, 336−304 = 32, 128−96 = 32 | §1.5 (the overlay's AA value of `feedback-info`, T002) |
| 7362:54702 | complete | status icon | glyph | "icon-edit-small" 20, white, at 6 6 | `assets/icons/edit-white-small.svg` (the export, new) 20 × 20 at 342, 134 | match |
| 7362:54707 | complete | h1 | text, style | "This connection is a draft", heading/large 600 24/32 #0b1220 | same, the page's one h1, 600 24px/32px rgb(11 18 32), 384 / 128 | match (FR-049; supersedes 005-S6.1) |
| 7362:54708 | complete | sub-line | text, style, gap | "The links can’t be added to your services yet. They become active when this connection is published.", body/small 14/24 #4a5468, 4 under the h1, two lines | same, rgb(74 84 104), y 164, 537 × 48 (two lines, the same break after "this") | match |
| 7362:54704 | complete | text column | width | 497 | 537 (the band's shared column: 832 − 32 − 32 − 16 − 215) | match in effect (the same line breaks; StatusBand's one column for every tone) |
| 7362:54709 | complete | date pill | place, size | 20 under the sub-line (y 104 in the text), 215 × 40 | 384 / 232 (164 + 48 + 20), 215 × 40 | match |
| 7362:54709 | complete | date pill | look | white, radius 8, padding 8 16, gap 8 | rgb(255 255 255), 8, 8px 16px, 8 | match |
| 6395:66518 | complete | calendar | glyph, size, colour | "icon-calendar_today-small" 20, #0b1220 | `kern-icon--calendar-today kern-icon--small`, 20 × 20, `bg-kern-layout-text-default!` rgb(11 18 32) | match (KERN's own glyph, no new asset) |
| 7362:54712 | complete | date | text, style | "Edited 03.10.2026, 14:32", label/small 600 14/24 #4a5468 | "Edited 09.11.2026, 11:14" (`editedLineOf()`: `formatRowDate` + `SAVED_TIME_FORMAT`), 600 14px/24px rgb(74 84 104) | match (FR-049, §3 "Dates"; was "Saved 4 Nov 2026, 14:32. …" in the draft card) |
| 7362:54714 | complete | ⋯ | presence | none ("no ⋯ on the date pill", U07 #23) | none (no `actions`) | match |
| 7362:54716 | complete | picture | file, crop | "Picture · draft (grey)" 247 × 145 at right −20, top 67 (visible 227 × 141) | `published-art-grey@2x.png` 217 × 129 at right 0 bottom 0 (919, 175) | decision: T006's one grey crop (the same art; the band's picture layer is shared by every tone); 10 px less on the left, 12 less at the top. Decorative |
| — (F56) | complete | "Delete draft" | place, look | not drawn (U93 "Missing here" US4-AS4) | `kern-btn--tertiary` + `kern-icon--delete`, 159 × 48 at the band's top right (945, 120: top 24, right 32), as `mainAction`, where the published band keeps its ⋯ | F56 (UNCERTAIN: placement, no frame) |
| 7362:54693 | complete | header pill | name, badge | "Your connections / <name>" + "Draft" (dot, #e0f2fe, label #05669e) | same; `ConnectionStatusBadge draft` 66 × 24, rgb(224 242 254); the name a `span` (no `titleAsHeading`) | match (T019) |
| I7362:54693;6698:43404 | complete | badge | gap after the name | 8 (327 → 335) | 8 (519 → 527) | match (T019's carried row closes) |
| — (W10) | with a description | meta | place | not drawn (U93 "Missing here" 006-S3.1) | "FS-20417" after the pill, muted, as on the published details | W10 (T078's look) |
| — | complete | tab title | text | "<name> (Draft) · Konnekt" (the task) | "T081 Passenger transport licence (Draft) · Konnekt" | match |
| 7362:54808 | complete | Summary | order, open | first under the band, open | 304 / 320 (208 + 16), 832 × 732, open (border rgb(29 86 240)), "Hide summary" | match (U07 #24) |
| 7362:54809 | complete | Summary header | counts | "2 documents · 9 data items · 3 variants · 4 rules" (sample) | "2 documents · 7 data items · 3 variants · 3 rules" (this draft's) | match (T079's content) |
| 7362:54813 | complete | "Download PDF" | presence | drawn | none | F53 |
| 7362:54845 | complete | rule rows | checks | "read only without findings" | `draft`: no checks, no findings, no tab icons | match (FR-047, T079) |
| — | Summary toggled | accordion | state | — | `openAccordion` kept by the page (starts `'summary'`), `toggleAccordion()` closes / opens it | match (FR-046; T079's carried note) |
| 7362:54905 | complete | Links card | text, style | "Links for your service" title/small 600 16/24 #0b1220; "Created when the connection is published and active." body/small 14/24 #4a5468, 4 apart | same (`DraftCard`, an `h2` + `p`), 600 16px/24px, 400 14px/24px rgb(74 84 104) | match |
| 7362:54905 | complete | Links card | box, place | 832 × 102, white, 1 px #e1e6f0, radius 12, padding 24, 16 under the Summary (956 → 972) | 832 × 102 at y 1068 (320 + 732 + 16), white, 1px rgb(225 230 240), 12, 24 | match |
| 7362:54905 | complete | Links card | links, toggle | none (U07 #25) | none: no URL anywhere on the page | match (FR-006, FR-049) |
| 7362:54912 | complete | Activity card | presence | "Activity", "Last edited by …", "View activity" | none | F2 |
| 7362:54919 | complete | footer | actions | "Edit connection" secondary 186 × 40 at x 160 (pencil 24); "Go to connections →" primary at the right (1076) | "Edit connection" `kern-btn--secondary` + `kern-icon--edit` 188 × 40 at 160; "Go to connections" + `kern-icon--arrow-forward` 203 × 40 at 1077 | match (FR-049, U07 #27; 188 vs 186: text rendering; 40 high as T078's published footer) |
| 7362:54920 | complete | "Edit connection" | target | — | the draft's flow at the step it was saved in (`{ step: draft.step }`: a draft saved on the test step opens "Test rules with sample citizen data") | match (005-S6.8's "Continue", relabelled by Q39) |
| 7362:54922 | complete | footer | "Create new connection" | none (the layer name only) | none | match (FR-046) |
| 7362:54923, 7362:55151 | view only | page | — | S2 without "Edit connection" | not built | F12 (not read) |
| U07 7370:55192 #28 | — | "Download PDF" marked as a draft | — | build note | not built | F53 |
| — (W8) | incomplete | rule rows | placeholders | not drawn (U93 "Missing here" 005-S6.7) | a rule without a check reads "Personal ID · Date of birth (Age)", one with an incomplete check the same, without a message line when it has none: exactly as the rules step's closed rows show them (T024: "a rule kept incomplete reads as far as it goes") | W8 (UNCERTAIN: the redesigned rules step draws no separate placeholder in a closed row; the details mirror it) |
| — (W8) | incomplete | Summary | documents | — | unchanged from T079 ("No documents yet" / "No data chosen yet") | match (005-S6.6) |
| U90 (T082) | delete dialog | dialog | texts, buttons | T082 restyles | "Delete this draft?" / "<name> will be deleted for good. It was never live, so nothing changes for serviceBW." / "Cancel", "Delete draft" (danger); the scrim doesn't close it; Escape closes it and returns the focus to "Delete draft" | T082 (copy and look) |
| — | delete → success | page | target | — | the overview (`replace`); the draft's GET answers 404 afterwards | match (005-S6) |
| — (W8) | delete → 409 `draft_published` | dialog | alert | — | `KernAlert` danger (`role="alert"`) "Couldn’t delete" / "This draft has been published since you opened it.", the confirm button "Open the connection" → closes and loads the details again (one GET) | match (005-S6.12; intercepted 409) |
| — (W8) | delete → 404 | dialog | alert | — | the same alert with "This draft has already been deleted.", the confirm button "Go to overview" → the overview | match (005-S6.13; deleted for real from another client) |
| — | delete → 5xx | dialog | alert | — | "Couldn’t delete", the server's message and "Error ID: 3f2c9a7e-…", "Try again" deletes | match (FR-008) |
| — | keyboard | tab order | — | — | Konnekt, Your connections, the account pill, "Delete draft", "Hide summary", "Standard" (the tablist), "Edit connection", "Go to connections" | match |
| — (W2) | loading | page | — | — | T080's details skeleton and "Go to connections →"; tab title "Loading the connection… · Konnekt" (the status unknown while loading) | match (T080's shared skeleton) |
| — (W2) | failed (5xx) | page | — | — | "Couldn’t load the connection", the alert with the server's message and the error ID, "Try again", "Go to connections" | match (T080) |
| — | 768 (783 window) | band | overlap | — | "Delete draft" at the top right over the picture's free top, the text 426 wide, the pill under it; nothing overlaps | match |
| — | 320 px (W2) | page | reflow | — | scrollWidth 305; band padding 16, no picture, h1 on two lines, the pill wraps its date (193 × 64), "Delete draft" in a row of its own under the text (20 below); footer in two rows | match (W2; no frame) |
| — | Firefox 158 | band, cards | geometry | — | band 832 × 208 with the same gradient, pill 215 × 40, "Delete draft" 159 × 48, Summary 732, Links card 102 at 1068; one h1; no console error | match |
| U99 6730:39732 #19 | after saving an edit | toast | text | "Changes saved." | "Changes saved." (`DETAIL_COPY.saved`) | match (FR-051 (42); T077's carried note) |

#### Decisions (T081)

- **"Delete draft" in the band** (F56, built without a frame): `StatusBand`'s `mainAction` at the
  band's right end, where the published band keeps its ⋯ (#52, F66) and so its "Delete
  connection"; the footer holds #51's two navigating actions as drawn. Tertiary with KERN's delete
  glyph, as 005-S6 had it. Below 768 px it takes a row under the text, as "Activate again" does.
  **UNCERTAIN** (placement only; the dialog and its errors are the baseline's).
- **"Edit connection" on a draft** opens the flow at the step it was saved in (005-S6.8's
  "Continue": Q39 superseded only its label). No entry confirmation (F48 / T083 is for a live
  connection).
- **The Links card** is `DraftCard.tsx`, rebuilt in place under its name: the closed accordion's
  card with the heading and the sentence, no toggle (U93 #17). The old draft card ("Draft", "Saved
  … Continue to finish and publish it.", "Continue", "Delete draft") is gone (U07 #23: the band
  replaces it); the info alert "This draft isn’t live. …" is gone (Q39 supersedes 005-S6.4).
- **One accordion**: the page keeps `openAccordion` (starts `'summary'`) with `toggleAccordion()`,
  as `ConnectionDetails` does; the Links card isn't an accordion, so only the Summary toggles.
- **The date** `editedLineOf()` (was `savedLineOf()`; `utils.ts`, tested): `formatRowDate` +
  `SAVED_TIME_FORMAT`, "Edited 03.10.2026, 14:32" as the frame writes it (date and time).
- **The picture**: T006's grey crop, shared with the deactivated band, not the draft frame's
  slightly different crop (decorative; a second export would be a 200 KB asset for 10 px).
- **Copy removed** from `DETAIL_COPY`: `newConnection`, `continue`, `draftNotLive`, `draftCardText`,
  the old `draftTitle` ('Draft'); `DRAFT_STEPS` removed (the step line is gone). Added:
  `draftTabTitle`, `draftTitle`, `draftText`, `edited`, `draftLinksText`. `saved` gets its period.
- **Outside the task's files** (forced): `DetailFooter.tsx` (the draft branch: "Edit connection" at
  the stored step + "Go to connections →", no "Continue" / "Create new connection"; `draft` prop is
  `Pick<FormConnectionDraft, 'step'>` now), `utils.ts` + `utils.test.ts` (`savedLineOf` →
  `editedLineOf`, the test for the adopted date format, FR-049 / cosmetic 3), and the new asset
  `assets/icons/edit-white-small.svg` (the Figma export of the band's "icon-edit-small", unchanged).

### U14, U90, U88 (`6417:31206`), U89 (`7173:52874`, `6417:31343`) Confirmations (S17) — T082, 2026-11-09

| frame | state | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|
| U88 6417:31206 | deactivate, open | dialog | box | 480 × 304, centred, radius 12, 1 px outline | 480, 348, 480 × 304 (Chromium 1455 × 1000) | match |
| U88 6417:31206 | deactivate, open | title | text, style | "Deactivate this connection?", title/large 600 24/32 | same (`ConfirmDialog`'s h2, T035) | match |
| U88 6417:31206 | deactivate, open | body | text | "The connection will be deactivated and its links will stop working. Requests already started still finish. Remember to remove the wallet connection from your service." | "The connection will be deactivated and its links will stop working at once. Requests in progress are cancelled. Remember to remove the wallet connection from your service." 18/24 rgb(11 18 32), four lines as drawn | F13 |
| U88 6417:31206 | deactivate, open | buttons | labels, kinds, place | "Keep active" secondary, "Deactivate" primary blue (not danger), 200 × 48 at 512 / 728 | "Keep active" 200 × 48 at 512, 572, transparent; "Deactivate" 200 × 48 at 728, 572, rgb(29 86 240) | match |
| U88 #26 | deactivate, open | scrim click | closes | yes (FR-052a: only the deleting dialogs stay) | closes; the focus back on the ⋯ "Connection actions" | match |
| — | deactivate, open | Escape, ×, "Keep active" | closes, focus | — | closes; the focus on the ⋯ (the native return) | match (FR-009) |
| — | deactivate, working (routed slow) | buttons | state | not drawn | "Deactivating…", every button `aria-disabled`, the scrim and Escape don't close it | FR-008 |
| — | deactivate, failed (5xx, routed) | dialog | alert | not drawn | danger alert "Couldn’t deactivate" with the server's message and "Error ID: 3f2c9a7e-1111-2222" above the body; "Try again"; 480 × 464 | FR-008 |
| U89 6417:31447 | after deactivating | toast | text, kind, Undo | "Connection deactivated." success, with "Undo" | "Connection deactivated." success (green, `kind: 'success'`), 214 × 56 at 613, 848, no Undo | F54 (no Undo) |
| — | after deactivating | band, focus | state | — | the grey band "Connection deactivated" with "Activate again"; the focus on the ⋯ | match |
| U89 7173:52959 | reactivate, open | dialog | box | 600 wide (the kit's wide dialog), 600 × 419 with "Active from" | 420, 302.5, 600 × 395 (no "Active from": −48; two variants: +24) | match (F1 for "Active from") |
| U89 7173:52959 | reactivate, open | title | text | "Activate this connection again?" | same | match |
| U89 7173:52959 | reactivate, open | intro | text, style | "Check the summary below. Once it’s active, citizens can share their data again, so make sure your service is ready to receive it.", body/default 16/24 muted #4a5468 | same, 16px/24px rgb(74 84 104), two lines with the same break | match |
| U89 7173:52959 | reactivate, open | summary | table | "Dialog content/Publish · summary": border `decorative-border` #e1e6f0, radius 8, rows 8 16, the 112 px label in label/default action blue, 16 gap, the values body/default; Documents divided from Rules | the publish dialog's `PublishSummaryRow`s in the same `dl` (`SUMMARY_TABLE_CLASSES`); "Documents · Personal ID · 4 data items / Driving licence · 3 data items", "Rules · Standard · 2 rules / Ambulance · 3 rules" | match (FR-051 (40)) |
| U89 #31 | reactivate, open | rules lines | variants | only "Standard · 2 rules" (the card says 3 variants) | one line per variant in tab order, as the publish dialog (FR-044b) | match (U89 #31: sample data) |
| U89 7173:52959 | reactivate, open | "Active from" | radios | "Now" / "On a date" | none | F1 |
| U89 7173:52959 | reactivate, open | buttons | labels, kinds | "Cancel" secondary, "Activate" primary, 260 wide each | "Cancel" 260 × 48 at 452, "Activate" 260 × 48 at 728, rgb(29 86 240) | match |
| U89 #34 | reactivate, open | scrim click | closes | yes (FR-052a) | closes; the focus back on "Activate again" | match |
| — | reactivate, working (routed slow) | buttons | state | not drawn | "Activating…", every button busy | FR-008 (decision: the label) |
| — | reactivate, failed (5xx, routed) | dialog | alert | not drawn | "Couldn’t reactivate", the server's message, "Error ID: 3f2c9a7e-3333-4444" in the dialog (no alert under the band any more); "Try again"; 600 × 555 | FR-008 (T080's carried note) |
| — | after reactivating (keyboard) | focus | target | — | the band's h1 "Your connection is active" once the dialog has closed (the opener is gone) | match (T080's decision kept) |
| — | after reactivating | toast | text, kind | not drawn (U05 #20: "active again" among the success toasts) | "Connection reactivated." success, 211 × 56 at 615, 848 | match (FR-051 (42); the approval page's wording) |
| U90 6417:31599, U14 6699:44480 | delete, active | dialog | title, body | "Delete “<name>”?", "This connection is active. Citizens won’t be able to use it, and its links stop working." | "Delete “T082b Fischereischein”?", the same body; 480 × 256 (a one-line title; 288 with the frame's two-line title) | match |
| U14 6699:44419 | delete, deactivated | dialog | body | "Its documents and rules will be deleted too." | the same; 480 × 232 | match |
| U14 6699:44419 | delete, draft (the draft's details) | dialog | title, body, buttons | "Delete “Hunting licence”?", "Its documents and rules will be deleted too.", "Keep connection" / "Delete connection" | "Delete “T082 Entwurf A”?", "T082 Entwurf A will be deleted for good. It was never live, so nothing changes for serviceBW.", "Keep connection" / "Delete connection" filled red | F55 (body); match (title, buttons) |
| U90 6417:31599 | delete, open | buttons | kinds | "Keep connection" secondary, "Delete connection" danger filled | transparent / rgb(196 39 28), 200 × 48 at 512 / 728 | match (T035's `danger`) |
| U90 #6, U14 #17 | delete, open | scrim click | closes | no (FR-052a) | stays open (details, draft details and overview) | match |
| — | delete, open | Escape | focus | — | the ⋯ on the details; "Delete draft" on the draft's details; "Delete <name>" on the row | match (FR-009) |
| — | delete, failed (5xx, routed) | dialog | alert | not drawn | "Couldn’t delete", the server's message, "Error ID: …"; "Try again" stays red | FR-008 |
| — (W8) | draft delete, 409 / 404 (routed) | dialog | alert, confirm | not drawn | "This draft has been published since you opened it." with "Open the connection" (blue); "This draft has already been deleted." with "Go to overview" (blue) | match (T081's, kept) |
| U90 6699:48039 | after deleting on the details | page | view | the overview without the row | the overview (`replace`) without the row | match |
| U90 6699:48098 | after deleting on the details | toast | text, kind | "“Passenger transport licence” deleted." red with "Undo" | "“T082b Fischereischein” deleted." neutral, no Undo, as the row delete's (router state `deleted`); also after a draft's delete; gone after a reload | F4; the kind UNCERTAIN (T044's, carried) |
| — | after deleting on the details | focus | where | not drawn | the overview's h1 "Your connections" once the list is there (the opener is gone) | match (FR-009; as the row delete) |
| U14 6699:44359 (T044) | overview, no row chosen | row dialog | in the DOM | — | not rendered until a row asks (only the account menu's dialog is there); then kept with the row's texts while it closes | match (T045's carried note) |
| — | 320 × 640 | reactivate dialog | reflow | not drawn | 16, 19, 273 × 602, scrolls inside (675); the summary's labels above their values (`PublishSummaryRow` below 640); buttons stacked | match (FR-010) |
| U89 6417:31343 | deactivated | "Download PDF" | presence | in the Summary card | none | F53 (not a dialog) |

#### Decisions (T082)

- **One delete dialog everywhere** (FR-029c): the details, the draft's details and the overview's
  row take `DELETE_DIALOG_COPY` (`FormConnectionList/constants.ts`, T044's, confirmed against
  U14 / U90): `dialogCopyOf('delete', …)` calls the overview's `deleteDialogCopyOf`, so the body
  follows the state (active, deactivated, draft). The details' own `deleteTitle`, `deleteText`,
  `deleteDraftTitle`, `deleteDraftText` and `deleting` are gone; the band's opener keeps "Delete
  draft" (F56). The failure titles ("Couldn’t delete") and "Try again" are the same words.
- **The toast after a delete on the details**: the details navigate to the overview with the
  router state `{ deleted: <name> }` (a new optional field of `OverviewLocationState` in
  `api-types/src/routing.ts`), which shows the row delete's toast "“<name>” deleted." (neutral,
  no Undo, F4) and moves the focus to the h1, then clears the state like `draftSaved`. Not after
  "Go to overview" of a draft deleted meanwhile (nothing was deleted here).
- **The reactivate dialog** is `ConfirmDialog wide` with the publish dialog's summary rows
  (`PublishSummaryRow`, imported from the editor) and its intro look; one line per variant
  (FR-044b), "Active from" not built (F1). "Activating…" while it runs (undrawn; the
  deactivate's pattern).
- **Success toasts**: deactivating, reactivating and "Changes saved." are `kind: 'success'`
  (T036's carried note), the texts with the period ("Connection deactivated." U89 6417:31447;
  "Connection reactivated." as the approval page writes it).
- **The focus after reactivating**: the h1 takes it in an effect once `dialogOpen` is false (the
  dialog's own close effect runs first, as a child), since the native return targets the
  unmounted "Activate again".

### U15, U87 (`6396:49030`), U100 The edit entry and "Discard your changes?" (S17, S18) — T083, 2026-11-09

| frame | state | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|
| U15 6699:47905 | overview, entry open (row "Edit", active) | dialog | box | 480 × 280, centred, radius 12, 1 px outline, over the scrim | 480 × 312 at 480 (Chromium 1455 × 900): the long sample name "Edit “T083 Führerscheinantrag Esslingen”?" takes two title lines (+32); 280 with a one-line title | match |
| U15 6699:47905 | entry open | title | text, style | "Edit “Fishing licence”?", title/large 600 24/32 | "Edit “<name>”?" (`EDIT_ENTRY_COPY.title`), Fira Sans 600 24px/32px | match (F48) |
| U15 #24, U87 #24 | entry open | body | text, style | "Your changes only take effect when you save them. Started connections don’t get interrupted or modified even after saving.", body/large 18/24 | the same, 18px/24px 400, three lines with the same breaks | match (cosmetic 14) |
| U15 #25, U87 #25 | entry open | buttons | labels, kinds, place | "Cancel" secondary, "Edit connection" primary, 200 × 48 each at 512 / 728 | "Cancel" 200 × 48 transparent with the 1 px rgb(29 86 240) outline; "Edit connection" 200 × 48 rgb(29 86 240) | match |
| U15 #26, #32 | entry open | scrim click | closes | yes (FR-052a: the dialog neither deletes nor publishes) | closes; the focus back on the row's "Edit T083 Führerscheinantrag Esslingen" | match |
| — | entry open | Escape, ×, "Cancel" | closes, focus | — | closes, the overview stays; the focus back on the opener (the native return) | match (FR-009) |
| U15 #19 | overview | row "Edit", published | element | opens frame 5's dialog on the active row | a `button` (`ROW_EDIT_CLASSES`, unchanged look) for an active and a deactivated connection, opening the overview's one entry dialog | match (FR-045 (a); decision: deactivated too) |
| U15 #19 | overview | row "Edit", draft | element | "Edit" on the Draft row | still a `Link` to the edit route, no question: the draft opens at its stored step | match (T081: F48 is for a published connection) |
| U15 6699:47905 | entry, "Edit connection" | navigation | target | the edit flow | `/form-connections/<id>/edit` with `{ step: 'connection' }`: step 1 "Connection details" | match (FR-046) |
| U87 6396:49030 | details, entry open (footer "Edit connection") | dialog | box, title | 480 wide; "Edit this active connection?" | 480 × 312 (two-line sample name), "Edit “T083 Führerscheinantrag Esslingen”?" | F48 |
| U87 #15 | details | footer "Edit connection" | element | secondary, pencil, opens P13's dialog | a `button` with the same classes and content (`DetailFooter`'s `onEdit`); a draft's details keep the `Link` to its stored step | match |
| U87 #18 | details, entry open | scrim click | closes | yes | closes; the focus back on "Edit connection" | match (FR-052a) |
| U87 6396:49030 | details, "Edit connection" | navigation | target | the edit flow | the edit route at step 1 | match |
| U100 #15 (U98 6731:39850) | edit flow, any step | footer "Discard changes" | look, place | tertiary with the undo glyph, after "Back" (8 px) | as T033 built it; shown on step 1 (without Back) and the documents step; opens the dialog | match |
| U100 7173:52772 | discard open | dialog | box | 480 × 256, centred | 480 × 256 at 480 | match |
| U100 #20, #21 | discard open | title, body | text, style | "Discard your changes?"; "The connection goes back to the version that’s active now. Citizens aren’t affected." 18/24 | the same (`DISCARD_COPY`), 24px/32px 600 and 18px/24px 400, two body lines with the same break | match |
| U100 #23, #24 | discard open | buttons | labels, kinds, size | "Keep editing" secondary, "Discard changes" filled danger, 200 × 48 | "Keep editing" 200 × 48 outline; "Discard changes" 200 × 48 rgb(196 39 28) (`danger`, no `confirmVariant` needed) | match |
| — | discard open | buttons | height | 48 | 48 once the dialog renders in `document.body` (a portal): inside the footer `.wizard-footer .kern-btn` made them 40 | match |
| U100 #19 | discard open | scrim click | closes | yes (FR-052a) | closes, the flow stays | match |
| U100 #23 | discard, "Keep editing" | flow | state, focus | stays in the flow | the dialog closes, the changed name stays, the focus back on "Discard changes" | match |
| U100 #24 | discard, "Discard changes" | navigation | target | back to the active version | the details `/form-connections/<id>` (pushed, no router state: no toast), "Your connection is active", the stored name unchanged (API checked), no "Leave site?" | match (FR-045 (c)) |
| — | after discarding | focus, toast | — | not drawn | the page change's focus (T037); no toast; the Summary open as on any arrival without state | match |
| — | 320 × 640 | both dialogs | reflow | not drawn | 273 wide, buttons stacked 209 × 48; entry 480 high, discard 400 high, no horizontal scroll | match (FR-010) |

### U98, U99 (S18) Editing a published connection — T084, 2026-11-09

Setup:
- Browser: Chromium (playwright-core 1.48.2, `/usr/bin/chromium`), signed in as `designer`. Sizes: 1455 × 900 (body
  1440; the frames are 1440 wide) and 320 × 640. Fonts as T077 (`Fira Sans` 400/600 loaded).
- Data (T084's own, made with `<scratchpad>/phase8/T084/seed.py`, deleted at the end, 404 afterwards): "T084
  Führerscheinantrag Esslingen" (active; Standard, Ambulance, School transport), "T084 Bewohnerparken West"
  (deactivated), "T084 Taxischein mit Hinweisen" (findings). The first was saved for real twice through the save
  dialog (a rename from the documents step; the leave question's "Save" from step 1). The needs-data walk routed the
  GET (rules on Personal ID only) and aborted any PUT; the `rules_changed` conflict and the deactivated connection's
  delete-variant body were routed (`409 rules_changed`; the GET with `is_active: false`).
- Scripts: `<scratchpad>/phase8/T084/{walk1,walk2,walk3}.mjs` (walk1 takes a width and height); screenshots there.
- Figma: `get_design_context` on the footer `6731:39850` (E1), the header `6731:39823` and the dialog `7173:52836`
  (E5b); screenshots of the footers `7296:52389` (E1b), `6730:39145` (E2) and `7114:49808` (E6). Every frame read
  matches its audit inventory (U98.md, U99.md); none has changed. U99 `6730:39732` (the details with "Changes
  saved.") is T077/T081's row; `6890:46197` (E5a) is F5, not built.
- Out of scope: the steps' content (T049, T051–T053, T056–T070, T071–T074), the save dialog's states (T077), the
  details (T078–T080), "Discard your changes?" (T083).

| frame | state | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|
| U98 6731:39823 | edit flow, any step | header pill | status | "Status · Live": "Active", `#eaf7e6` tint, 8 dot, label/small 600 14/24 `#1d7a2e`, after the name | `ConnectionStatusBadge` "Active" after the name in the breadcrumb pill (T019's pill: the same tint, dot and label) | match (F5) |
| U98 6730:39124, U99 6890:46199 | edit flow, changed | header pill | "Draft changes" | after "Active" | none: "Active" only | F5 |
| — | edit flow of a deactivated connection | header pill | status | not drawn | "Deactivated" (the grey pill) | decision 1 |
| U98 6731:39846 | edit flow, step 1 | info strip | copy | "Active. Your changes take effect when you save them." | "Your changes take effect when you save them. Requests already in progress keep their previous configuration." | F49 (T049's row) |
| U98 6731:39850 (E1) | step 1 | footer | left | "Discard changes" tertiary, undo icon, at 160; no Back, no "Save and exit" | "Discard changes" `kern-btn--tertiary` with `icon-undo`, 160, 844, 191 × 40 | match (005-S0.7) |
| U98 6731:39850 | step 1 | footer | right | "Choose documents →" secondary (1 px `#1d56f0`), then "Save" primary, 8 apart, Save ending at 1280; 40 high | "Choose documents →" `kern-btn--secondary` 977, 844, 213 × 40, 1px rgb(29, 86, 240); "Save" `kern-btn--primary` 1198, 844, 82 × 40, rgb(29, 86, 240) (ends 1280; 8 apart) | match (cosmetic 17) |
| U98 7296:52389 (E1b) | documents | footer | buttons | "← Back", "Discard changes"; "Set rules →" secondary, "Save" primary | "Back" 160, "Discard changes" 275 (8 after); "Set rules →" secondary 1051, 139 × 40; "Save" 1198, 82 × 40 | match |
| U98 6730:39145 (E2), U100 #16, #17 | rules | footer | buttons | "← Back", "Discard changes"; "Test rules →" secondary, "Save" primary | the same, "Test rules →" `kern-btn--secondary` 1045, 144 × 40; "Save" 1198, 82 × 40 | match (#47 (b)) |
| U99 7114:49808 (E6) | test | footer | buttons | "← Back", "Discard changes"; "Save" primary, no arrow | the same; "Save" 1198, 82 × 40, no arrow | match |
| — (FR-034c, not drawn) | rules, a rule open | "Save", "Test rules" | state | drawn enabled only | both `aria-disabled`, faded (KERN's 40 %), "Save the rule first" as the description and the tooltip on focus and hover; a click opens nothing | match (F65, W21, #47 (b)) |
| — (FR-034c) | rules, grouping / in error | "Save" | explanation | not drawn | "Finish grouping first" / the first problem in the server's words, as "Test rules" (`rulesProblem`) | match (#66; T060's note) |
| — | rules, no rule in any variant | footer | right | not drawn | "Save" only (no "Test rules →", no "Save without rules"): it opens "Save without rules?" | decision 2 |
| — | any step, no document | "Save" | state | not drawn | `aria-disabled` with "Add a document first" (FR-031's explanation) | decision 3 |
| U98 6730:39438 (E3), #43 | Save on step 1 / the documents / the rules / the test step | save dialog | opens from | the current step (FR-045c) | "Save changes?" over that step (`from` = the step); its cancel "Check rules again" from step 1, the documents and the rules, "Back to test" from the test step | match (T077's dialog) |
| U98 #41 | "Check rules again" from step 1 or the documents | step | target | not drawn (E3 opens from the rules step) | the rules step, the first variant with findings open | decision 4 |
| — | Save with an empty name (from the rules step) | flow | outcome | not drawn | step 1 opens, "Enter a name for the connection.", the field `aria-invalid` and focused; no dialog | match (FR-026: a validation error keeps the member in the flow; decision 5) |
| — | Save with a document without data (from step 1) | flow | outcome | not drawn | the documents step with "No data selected in 1 document" (U25's dialog); "Choose data" stays there, the focus on "All data items"; "Remove 1 document" removes it and opens "Save changes?" (or the rules step with the problem, when rules check it) | decision 5 |
| U98 #9, U99 #38 | step line | steps | links | "step bar is clickable" | every step but the current one a button; forward and back without the current step's checks; "Test" through the "Test rules" gate | match (F25; decision 6) |
| U99 7173:52836 (E5b) | changed, "Your connections" or "Konnekt" | dialog | anatomy, copy | 480 × 256; "Save your changes?"; "If you leave now, your changes are lost. Save them, or discard them and keep the active version."; "Discard changes" danger outline, "Save" primary, × | the same (`LEAVE_COPY`; T048's dialog box: 480 × 256, 200 × 48 buttons) | match (F64) |
| U99 7173:52836 | leave question | Escape | outcome | × keeps the member (FR-026n) | stays in the flow | match |
| U99 #35 | leave question → "Save" | outcome | "Save changes?" then the details | "Save changes?" (from step 1), "Save", "Saved", then the details with "Changes saved." and the new name in the breadcrumb | match (FR-026m; real save) |
| U99 #35 | leave question → "Discard changes" | outcome | leaves without saving | the overview, nothing sent | match (FR-026n) |
| U99 6730:39732 #19 | Save from the documents step → "Save" | details | arrival | "Changes saved." | `/form-connections/<id>`, h1 "Your connection is active", toast "Changes saved.", the Summary open ("Hide summary"), the new name in the breadcrumb | match (T079's `initialAccordionOf('saved')`; real save) |
| — (W3, W7, W9) | Save → `409 rules_changed` | dialog | conflict | not drawn (U90's anatomy) | "The rules changed since you opened them", the server's message, the hint, "Reload" / "Replace their changes"; "Reload" opens the connection again at the rules step | match (T077's conflict) |
| — (W15) | `?step=rules&variant=<Ambulance>` | flow | opens | not drawn | the rules step with the Ambulance tab selected and focused | match (007-S5) |
| — (W9) | edit flow opens | checks | run | not drawn | the rule checks run on open (`useRuleChecks`, any step); the test step's failure says "Try again, or save without testing." | match (T074's rows) |
| — (T068's note) | deactivated connection, "Delete variant" | dialog | body | not drawn (U60 11.5b is the active one's) | "This only takes effect when you save. Once saved, Ambulance and its rules are deleted, …"; the active connection keeps 11.5b's "The connection is active, so this only takes effect …" | decision 7 |
| — | create flow, test step | "Publish" | icon | U65 7057:58897, U74's frames: "Publish →" | "Publish →" (`kern-icon--arrow-forward`), 1154, 844, 126 × 40 | match (T071's open row closed) |
| — | 320 × 640 | footer | reflow | not drawn | the left actions wrap one per row; the next step and "Save" stay together at the right ("Choose documents →" above "Save" where both don't fit in 288); no horizontal scroll (`scrollWidth` 305) | match (FR-010) |

Open rows: none.

**Decisions (T084):**

1. **The header badge** is `ConnectionStatusBadge` with the connection's `is_active` (T033's note): "Active", and
   "Deactivated" for a deactivated connection's edit flow (the pill says what is true; no frame draws that case).
2. **The rules step without any rule** in the edit flow shows "Save" only: "Save" already opens "Save without rules?"
   (T077's `withoutRules`), so the old "Save without rules" button would be a second button for the same dialog, and
   there is nothing to test ("Test rules" can't go on without a rule). `EDITOR_COPY.saveWithoutRules` is gone; the
   create flow keeps "Publish without rules".
3. **"Save" without any document** is unusable with "Add a document first" (the documents step's explanation, FR-031)
   on every step: the server refuses a connection without documents, and the button says why before the press.
4. **"Check rules again"** from step 1 or the documents step (the save dialog opened by Save there) opens the rules
   step, as it already did from the documents step, at the first variant with findings; "Back to test" from the test
   step is unchanged (T076/T077's notes).
5. **Save checks what the steps check, on the step that holds the problem** (FR-026, #47: "a validation error keeps
   the member in the flow"; T053's and T077's notes): step 1's name and description first (step 1 opens with its
   messages and the focus on the field, as "Choose documents →" does), then the documents without data (the
   documents step with U25's "No data selected in 1 document", as "Set rules →" does; its "Remove 1 document" goes on
   with the save, to "Save changes?", or to the rules step when the publishing pre-checks then find rules on the
   removed data), then the rules' pre-checks (as before). Before, a `400` showed as the dialog's "Couldn’t save".
   Only the edit flow runs them (`passesSaveChecks()`); the create flow can't reach "Publish" without its steps'
   checks.
6. **A forward jump through the step line runs no checks** (T032's open point): the step line moves between the
   parts of a connection that is complete (F25), and Save checks every step before it asks (decision 5); only the
   test step keeps the "Test rules" gate (FR-002). Jumping from step 1 with an empty name therefore shows its
   message only on Save.
7. **The delete-variant body of a deactivated connection** (T068's note): the editor passes `active` to
   `RulesDialogs`, and the deactivated case drops 11.5b's first clause ("The connection is active, so"): "This only
   takes effect when you save. Once saved, …". UNCERTAIN (wording only, no frame). The discard body ("the version
   that’s active now", T083) and the leave question ("keep the active version", FR-026's own words) keep the
   design's copy also for a deactivated connection.

### S19 Consent page — T086, 2026-11-09

Checked in Chromium (playwright-chrome) at 1455 × 900 (body 1440) and 320 × 640 (the 320 CSS px
of a 640 px window at 200 %), signed in as `p9-consent`, against the running backend (OAuth
clients registered by a scratchpad helper with a kept PKCE verifier, so that a code from the page
could be exchanged); the failures by Playwright routing with the backend's flat error bodies. No
frame (W16): the rows cite the §3 pattern or the baseline item.

| frame | state | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|
| — (§3 Card, P10) | every state | card | look, place | not drawn | white, 1 px `decorative-border` #e1e6f0, radius 12, no shadow; 600 wide, centred in the layout's 1120 column (420 / 96 at 1440, under the header pills), padding 40 (24 below 640 px), parts 24 apart; top-aligned, so nothing moves from loading to loaded | W16 (§3 "Card"; 007-R.1 "a centred card") |
| — (§3 Empty state's card heading) | request | h1 + sentence | style | not drawn | h1 "Allow access for T086 agent?" `PageTitle size="large"` 24/32 600 #0b1220 (the one h1); 8 under it "T086 agent wants to act on your behalf in Konnekt. Choose what it may do." body/default 16/24 #4a5468, `text-pretty` | W16, C1 (007-S1.1, S1.2) |
| — | every state | tab title | text | — | "Allow access · Konnekt" | match (FR-012, C1) |
| — (§3 Skeleton: the spinner for a page) | loading | loader | anatomy | not drawn | the h1 "Allow access", then `FeedbackLoader` 56 with "Loading the request…" (polite status); card 234 high | W16 (baseline's loader) |
| — (P14/P15, T016) | request, scope `read drafts manage` | radios | preselected | — | "Read, edit drafts and manage live connections" | match (007-S1.7) |
| — | request, scope `read drafts` | radios | preselected | — | "Read and edit drafts" | match (007-S1.7) |
| — | request, scope `read`, empty, absent | radios | preselected | — | "Read only" (all three) | match (007-S1.7) |
| — (T016) | request | `AccessLevelChoice` | look | kit radios | legend "Access level" 16/24 600; three 32 px radios 16 apart, the names and the C2 descriptions ("… test fictitious citizens. Nothing changes."), arrow keys choose | match (007-S1.3–S1.6, C2) |
| — (§3 Info strip) | step-up (current `read`, scope `read drafts`; also `manage` asked) | step-up line | look, text | not drawn | `feedback-info-background` #e0f2fe, radius 8, padding 8 16, the blue ⓘ 20 (#0273ae), body/small 14/24 #0b1220: "T086 agent is asking for more access than it has." above the radios | W16 (007-S1.8; was 16/24 semibold) |
| — | no step-up (no connection; current `drafts` and scope `read`) | step-up line | presence | — | none | match (007-S1.8) |
| — (P33 dialog-actions, `ConfirmDialog`) | request | "Deny", "Allow" | look, order | not drawn | `kern-btn--secondary` "Deny" then `kern-btn--primary` "Allow", 48 high, equal columns 251 / 251 (16 apart) while the card's inner width is ≥ 384 px; stacked full width (223) at 320, "Deny" first | W16 (007-S1.9; order: decision 2, UNCERTAIN) |
| — | request | footer line | text, style | not drawn | "Signed in as p9-consent. You can change or revoke this access later on your user page." body/small 14/24 muted, the `Link` to `/account` (`kern-link--small`, baseline paddings off so a wrapped line keeps 24 px) | match (007-S1.12) |
| — | allow (mouse, double click) | request | body | — | one `POST /api/oauth/authorize`, JSON: the seven query parameters as read + `decision: "allow"` + `access_level` = the chosen level; byte-identical to the baseline's body for the same request and level | match (007-S1.9; baseline wiring) |
| — | allow | redirect | target | — | `window.location.assign(redirect_to)`: the browser reached `http://127.0.0.1:33418/callback?code=…&state=<the request's state>` (routed loopback) | match |
| — | allow, level changed to "Read only" (scope asked `manage`) | authorization | level | — | the code exchanged → `scope read`; `GET /api/agent-access`: "T086 agent", `read` | match |
| — | step-up, allow "Read and edit drafts" | authorization | level | — | the same row raised to `drafts` (exchange `scope read drafts`) | match |
| — | keyboard: arrows to "manage", Enter in the radio | request, authorization | body, level | — | implicit submission sends `allow` + `manage` (one POST); exchanged → the row at `manage` | match |
| — | allow, leaving (redirect held with a 204) | page | state | — | status "You can go back to T086 agent." (polite, rendered empty before); both buttons `aria-disabled="true"`; a press on either, Enter, or a radio click sends nothing and keeps the level | match (007-S1.10) |
| — | sending (POST held 2 s) | buttons | state | — | both `aria-disabled="true"`; further presses and Enter send nothing (one POST) | match (baseline) |
| — | deny (double click) | request, redirect | body, target | — | one POST, the seven parameters + `decision: "deny"`, no `access_level` (byte-identical to the baseline); the browser reached `…/callback?error=access_denied&state=…`; the existing authorization unchanged | match (007-S1.9) |
| — (§3 Alert, page level; T017) | invalid: a parameter missing, all missing, `response_type=token` | alert | anatomy | not drawn | in place of the form, h1 "Allow access": danger alert "This sign-in request isn’t valid. Start again from your agent." with the reason ("The request is missing state.", the full list, "The request must ask for an authorization code (response_type=code).") and "Go to connections"; the alert takes the focus; no request sent | W16, F22 (007-S1.11) |
| — | invalid: unknown `client_id` (`404 invalid_client` on load) | alert | anatomy | — | the same alert with "The client is unknown." | match (007-S1.11) |
| — | invalid: `redirect_uri` not the client's, `code_challenge_method=plain`, scope "read admin", `resource` ≠ MCP_URL (`400 invalid_request` on Allow and on Deny) | alert | anatomy, redirect | — | the form replaced by the alert with the server's message ("The redirect URI isn't one of the client's.", "The code challenge method must be S256.", "The scope may only contain read, drafts and manage.", "The resource isn't Konnekt's MCP server."), focus on the alert, no redirect (8 POSTs, all 400, no callback) | match (007-S1.11) |
| — (§3 Error state of a page) | failed: loading the client, 5xx | alert | anatomy | not drawn | under the h1 "Allow access": danger alert "Couldn’t load this request", body "Something went wrong on our side. Contact an administrator and give them the error ID." + "Error ID: 3f2c9a7e-…", then "Go to connections" (`kern-link`, mt 10); no form, no footer line | W2, F22 (T037's carried note) |
| — | failed: loading the client, no answer | alert | body | — | "Check your connection and reload the page." + "Go to connections" | match (baseline's text) |
| — (§3 Alert, page level) | failed: sending, 5xx | alert | anatomy | not drawn | the form stays; danger alert "Couldn’t send your answer" between the radios and the buttons (where the baseline's message was), body the server's message + "Error ID: 9b8c7d6e-…" (`role="alert"`); the buttons usable again, the level kept, the focus on the pressed button | W16, F22 (was a field-error line) |
| — | failed: sending, no answer | alert | body | — | "Check your connection and try again." | match (baseline's words, now title + body) |
| — | failed: sending, then again | request | body | — | the retry sends the identical body and the browser follows the redirect | match |
| — | `401` on sending | session | — | — | signed out, the sign-in screen, and back on `/authorize` with the whole query after signing in | match (007-R.1) |
| — | signed out, opening the URL | guard | — | — | the sign-in screen, then the consent page with the query kept | match (007-R.1) |
| — | keyboard | focus | order, ring | — | radio group → "Deny" → "Allow" → "user page"; KERN's 4 px ring on keyboard focus only (a mouse press on a button or radio shows none) | match |
| — | 320 px (200 %) | every state | reflow | not drawn | scrollWidth 305 of 320, nothing outside the window; card 273 wide, padding 24; the h1, sentence, strip, labels and descriptions wrap; buttons stacked; the error IDs break (`ErrorNoticeText`) | match (FR-010) |
| — | every state | `h1` | count | — | one | match |
| — | every state | storage, console | — | — | nothing written to `localStorage` / `sessionStorage`; no `console.*` in the folder; the code, state and tokens appear only in the request and the redirect | match |

#### Decisions (T086)

1. **The card holds every state** (the h1, the sentence, then the loader / the alert / the form and
   the footer line), centred horizontally at 600 px and top-aligned under the header; the h1 in
   the card heading's style (title/large 24/32 600, §3 "Empty state": "a card heading … 8 above
   the sentence") because it heads a card, as the sign-in card's "Log in" and the dialogs' titles
   do. 007-R.1 says "centred card"; vertically it stays at the top so the card doesn't jump from
   loading to loaded. **UNCERTAIN** (layout only; no frame).
2. **"Deny" before "Allow", equal columns**: the kit's dialog actions (P33, as `ConfirmDialog`
   lays them out: the cancelling action first, the confirming one last, stacked full width where
   two don't fit). The baseline had "Allow" first. "Allow" is still the form's only submit button,
   so Enter in a radio still sends "Allow"; the handlers are unchanged. **UNCERTAIN** (order and
   tab order only; the wiring is the baseline's).
3. **The step-up line is the §3 "Info strip"** (blue ⓘ, info background, one sentence) instead of
   the baseline's semibold line.
4. **A failure to send is the design's danger alert** (§3 "Alert, page level", F22) with the
   title "Couldn’t send your answer" and the body from `errorNoticeOf(error, 'Check your
   connection and try again.')`: the server's message with the 5xx error ID, or the baseline's
   second sentence without an answer. The baseline showed one field-error line ("Couldn’t send
   your answer. Check your connection and try again."); the words are kept, split into title and
   body. Placed where the baseline's line was (between the radios and the buttons), so that it is
   next to the pressed button; announced (`role="alert"`), the focus stays on the button.
5. **Failed load (T037's carried note)**: h1, the danger alert "Couldn’t load this request" with
   `ErrorNoticeText`, and "Go to connections" — no "Try again" (the carried note names none; the
   baseline's text says to reload the page).
6. **"Go to connections" in the invalid-request alert too**: S22 asks every error state for the
   way back; the alert still replaces the form and nothing redirects (007-S1.11).
7. **`AccessLevelChoice`'s `disabled` (carried from T016) is not used**: disabled radios would drop
   the focus to the body when the decision was sent with Enter from a radio (implicit
   submission), and the page can stay in the "leaving" state when the redirect URI is an app's own
   scheme (allowed by `redirect_uri_allowed`, RFC 8252), or after a failure. The reducer already
   keeps the level once the browser is leaving (baseline), and the buttons are `aria-disabled`.
   **UNCERTAIN** (does not touch what is sent).

#### Request-body comparison (baseline vs T086)

Captured with `page.route` on `**/api/oauth/authorize` before the change and after it, for the same
request (`client_id` cp_client_ktxVS8…, scope "read drafts"):
deny `{"client_id":…,"redirect_uri":"http://127.0.0.1:33418/callback","code_challenge":…,"code_challenge_method":"S256","state":"oqUH9QupHjI","scope":"read drafts","resource":"http://localhost:3100/mcp","decision":"deny"}`
and allow with "manage" chosen (the same + `"decision":"allow","access_level":"manage"`): both
byte-identical before and after (`application/json`, one POST per double click). The page's
`useEffect`, `decide()`, `utils.ts` and the reducer are untouched (the `git diff` of `index.tsx`
changes only the imports, the doc comment, `LoadFailedAlert` and the JSX).

### S20 Account page — T087, 2026-11-09

| frame | state | element | property | Figma | actual | result |
|---|---|---|---|---|---|---|
| — (W16) | every state | h1, tab title | one h1, "<page> · Konnekt" | — | one h1 "Your account" (`PageTitle size="x-large"`, 500 32/40 as the overview's), hint "Signed in as p9-account."; tab "Your account · Konnekt" | match (007-S2.2, FR-012) |
| U13 6699:44358 (F17) | user menu | "Your account" | first entry, router link | — | `A` `role="menuitem"` "Your account" → `/account`, then "Log out" (T031's) | match (F17, 007-S2.1) |
| — (§3 Empty state) | empty | "Connected agents" | sentence, card | "No agent is connected yet. Add Konnekt’s MCP server to your agent to connect it." (C1) | the sentence with the README link on "Add Konnekt’s MCP server to your agent", in the light blue card: rgb(242 245 251), radius 12, padding 24, 16/24 rgb(74 84 104), 1120 wide | match (C1, 007-S2.5; decision 2) |
| — (§3 Empty state) | empty | "Personal access tokens" | sentence, action | — | "No personal access token yet." in the same card; "Create token" (secondary, + icon) beside the h2 | match (007-S2.7) |
| — (§3 Card, U11 6699:44252) | listed | list card | fill, border, radius, clip | white, 1 px `decorative-border`, 12, no shadow | oklch(1 0 0), 1px rgb(225 230 240), 12px, `overflow: visible` (V6) | match |
| U30 6348:40889 (row anatomy) | listed | row | padding, gap, line | the rule row's column of texts 4 apart and the 32 px ⋯ at the top right | 16 16 16 24 (16 at the left below 640), gap 16, 1px rgb(225 230 240) above every row but the first; 112 high with three lines | match (W16; decision 1) |
| — | listed | name, level, dates | type | label/default; body/small; body/small muted | 600 16/24 rgb(11 18 32); 400 14/24 default; 14/24 rgb(74 84 104), the dates 16 apart, wrapping | match (007-S2.3, S2.6) |
| — (cosmetic 3) | listed | dates | format, `datetime` | dd.mm.yyyy, hh:mm | "Connected 09.11.2026, 13:21", "Created …", "Expires 09.12.2026, 13:21", "Last used just now" / "3 minutes ago" / "30.09.2026, 13:22" (≥ 30 days), "Never used"; every date a `time` with the ISO timestamp | match (§3 "Dates", 007-S2.15) |
| — | listed, expired token (DB) | row | look | not drawn (007 draws no expired state) | "Expires 07.11.2026, 13:22" in the past, nothing else (the baseline's) | match (baseline) |
| U55 6530:40192 | ⋯ open (keyboard) | menu | entries, place | "Change access level"; divider; "Revoke" red | 220 wide, 8 below the ⋯, right edges flush (1263); "Change access level" focused (ink fill), divider, "Revoke" rgb(196 39 28); opens past the card's bottom over the page, not clipped | match (§3 "Menu": destructive last after a divider) |
| — | ⋯ open | Escape | focus | — | closes, focus on the ⋯ with the 4 px ring (keyboard) | match (002-ACC.4) |
| P12 (600) | change level, open | dialog | width, content | the kit's 600 (form dialog, as the variant and edit-data dialogs) | 600 × 536 centred; "Change access level for T087 agent"; `AccessLevelChoice` with the current level checked; "Cancel" / "Save" 260 each | match (007-S2.8; decision 3) |
| — | change level, working (routed slow) | dialog | state | not drawn (FR-008) | "Saving…", ×/Cancel/Save `aria-disabled`, the radios `disabled` at 0.4, Escape ignored | match (T016's carried `disabled`) |
| — | change level, failed (5xx routed) | dialog | alert | not drawn (F22) | danger alert "The access level couldn’t be changed" / "Something went wrong on our side. Try again later." / "Error ID: 3f2c9a7e-8701-0001" above the radios; the chosen level kept; "Try again" | match (FR-008, F22) |
| — | change level, saved | toast, focus | kind, text | Figma toast "saved" = success | green rgb(29 122 46) "Access level changed. It applies from the agent’s next call."; the row reads "Read and edit drafts"; focus back on the row's ⋯; request `PUT /api/agent-access/<id>` `{"access_level":"drafts"}` as the baseline | match (007-S2.9; decision 5) |
| U14 6699:44480 (480) | revoke, open | dialog | box, buttons | 480; secondary + filled danger | 480 × 256; "Revoke access for T087 token?" / "The agent’s next call will be refused, and its waiting approval requests are cancelled."; "Cancel" transparent, "Revoke" rgb(196 39 28) | match (007-S2.10, S2.11) |
| U14 #17 / FR-052a | revoke, scrim click | dialog | closes | no (it takes access away, as deleting) | stays open; Escape closes, focus on the ⋯ | match (decision 4) |
| — | revoke, failed (5xx routed) | dialog | alert | not drawn | "Access couldn’t be revoked" + message + "Error ID: 3f2c9a7e-8701-0002"; "Try again" stays red | match (F22) |
| — | revoked | row, toast, focus | — | Figma toast "removed" = neutral | the row gone; ink toast rgb(11 18 32) "Access revoked."; the h1 takes the focus (opener gone); `DELETE /api/agent-access/<id>` as the baseline | match |
| P12 (600) | create token, open | dialog | width, fields | 600 | 600 × 816 at 1440 × 900; intro 16/24 muted; Name focused; "Access level" with "Read only" checked; "Valid for" KERN select 7 / 30* / 90 days | match (007-S2.12) |
| §3 Field error | create token, no name | field | message, focus | under the field, announced, focus to the field | "Enter a name for the token." (`role="alert"`) under Name, `aria-invalid`, described by it, the focus in the field; nothing sent | match |
| — | create token, working (routed slow) | dialog | state | not drawn | "Creating token…", buttons `aria-disabled`, radios `disabled` | match |
| — | create token, failed (5xx routed) | dialog | alert | not drawn | "The token couldn’t be created" + message + "Error ID: 3f2c9a7e-8701-0003"; name, level and days kept; "Try again" | match (F22) |
| P12 (600) | token created | dialog | frame, fade | `ConfirmDialog`'s frame; §4 fade | 600 × 328 centred, radius 12, ring inside, the design's scrim, class `motion` (T035's fade) | match (T035's carried note) |
| — | token created | dialog | texts | — | "Token T087 page token created", "Copy it now. It won’t be shown again."; field "Your token"; one full-width "Done" (536) | match (007-S2.13, S2.14) |
| U80 6396:47719 (T028 `field`) | token created | field | look, focus | the URL box; no monospace | Fira Sans 16/24 on rgb(242 245 251), 48 high; opens with the focus in the field and the whole token selected (50 / 50), described by the warning | match (T028's carried note) |
| U81 6396:47841 (FR-048) | "✓ Copied" | button, status | label, 2 s, announced | "✓ Copied" 2 s, announced | check icon + "Copied" at 0.2 s and 1.7 s, "Copy" again at 2.3 s; status "Token copied", emptied after; clipboard = the 50-character token | match |
| — | copy fails (writeText rejected) | field, status | — | baseline (007-S2.13) | the token selected (0–50), "Copying didn’t work. The token is selected, so you can copy it yourself." | match |
| — | token created, scrim click | dialog | closes | — | stays open (closing loses the secret) | decision 4 |
| — | token created, closed (Escape / Done) | page | secret gone | 007-R / FR-004: shown once | dialog closed, focus on "Create token"; no `cp_pat_` in the DOM, the URL, local or session storage, or the console; the row "T087 page token" without it; no toast; `POST /api/agent-access/tokens` `{"name","access_level","expires_in_days"}` as the baseline | match |
| W2, §3 Error state of a page | load failed (5xx routed) | alert | parts | h1, danger alert with the error ID, "Try again", "Go to connections" | h1 "Your account" + hint, 16 below: "Your agent access couldn’t be loaded" / message / "Error ID: 3f2c9a7e-8701-0004", then "Try again" (secondary small) and "Go to connections" (`kern-link`, `/`), `role="alert"` | match (T037's carried note; decision 6) |
| — | load failed (aborted) | alert | body | — | "Check your connection and try again." (the fallback), no error ID | match |
| — | "Try again" | page | — | — | the loader, then the list; the h1 takes the focus | match |
| — (FR-010) | 320 × 640 | page | reflow | — | no sideways scroll (scrollWidth 320); rows 17–303, dates one per line; "Create token" under its h2; the ⋯ menu 32–288; the alert 288 wide with the error ID broken | match |
| — (FR-010) | 320 × 640 | dialogs | box | — | 288 wide at x 16; change level 602 high, scrolls inside (928); revoke 432, buttons stacked 224 wide; create token scrolls; token field 224 wide with "Copy" below it | match |
| — (FR-010) | 720 × 450 (1440 at 200 %) | page | reflow | — | no sideways scroll (720) | match |

#### Decisions (T087)

1. **Rows**: each section's list is the overview's list card (white, 1 px decorative border,
   radius 12) without `overflow-hidden` (V6), rows divided by a line, the rule row's anatomy (texts
   in a column 4 apart, the 32 px ⋯ at the top right, 16 between) with the overview's padding
   (16 24; 16 at the left below 640 px). `ROW_CLASSES`, `LIST_CARD_CLASSES` in
   `pages/Account/constants.ts`.
2. **Empty sections**: §3 "Empty state" inside a page with its own h1 — the light blue card with
   the one sentence, padding 24, no picture, no action of its own ("Create token" stays beside the
   tokens' h2). The pattern's 578 px measure is not applied: it broke the agents' sentence before
   "it." at 1440.
3. **Widths**: the form dialogs (change level, create token, token created) take the kit's 600
   (`wide`), as the design's form dialogs do (variant, edit data); "Revoke" is a confirmation and
   keeps the screens' 480.
4. **Scrim**: "Revoke" takes access away, so `dismissOnScrim={false}` (FR-052a, as the deleting
   dialogs). The token-created dialog doesn't close on the scrim either (its own `kern-dialog`,
   as before): closing it loses the secret for good, so it is treated as the restore dialog's
   exception — **UNCERTAIN** (FR-052 names only the restore dialog; not core behaviour: ×, Escape
   and "Done" close it as before).
5. **Toast kinds**: "Access level changed. …" is `success` (the Figma toast's "saved"), "Access
   revoked." neutral ("removed"). `utils.ts` may change only for the dates, so the reducer's toast
   keeps no kind: the page maps the text through `SUCCESS_TOASTS` (`constants.ts`).
6. **Load failure**: §3 "Error state of a page" with "Try again" (a retry makes sense for a list).
   The reducer has no retry action (and `utils.ts` changes only for the dates), so "Try again"
   mounts the page anew (`AccountView` keyed by the attempt in `index.tsx`), which starts from
   loading; the h1 takes the focus once the new attempt is done. The fallback text (no API
   message, e.g. offline) is now "Check your connection and try again." (was "… Reload the page
   to try again.", which "Try again" made wrong); the alert's title is unchanged.
7. **Dates**: `formatDateTime()` = the overview's `formatRowDate` + ", " + the 24-hour time
   (`TIME_FORMAT` in `pages/Account/constants.ts`, the same options as the details'
   `SAVED_TIME_FORMAT`), for "Connected", "Created", "Expires" and a "Last used" of 30 days or
   more. `utils.test.ts` changed only for that (cosmetic 3): the fixtures in local time
   (`localTime()`), the expected strings, a `formatDateTime` case; it passes in UTC,
   America/Los_Angeles, Europe/Berlin, Pacific/Kiritimati and Etc/GMT+12.
8. **Menu**: "Revoke" now sits after the menu's divider (`separated`), as §3 "Menu" puts
   destructive entries.
9. **Title size**: `PageTitle size="x-large"` (heading/x-large, the overview's and §3's page
   title), 32 px between the title block and the first section (`mt-16` on top of the layout's
   16).
10. **TokenCopyField** is `<CopyableUrl variant="field" …>` with `TOKEN_COPY_TEXTS` ("Token
    copied" and the failure sentence); `COPY_ANNOUNCEMENTS`, `COPIED_RESET_MS` (3000) and the
    page's `CopyStatus`, `copy`, `copied` and `close` texts are gone (the × reads
    `KERN_TRANSLATIONS.closeDialog`, hidden with `sr-only`).

### S21 Approval page (W16, no frames) — T088, 2026-11-09

Setup:
- Browser: Chromium (playwright-core 1.48.2, `/usr/bin/chromium`), signed in as `p9-approval`. Sizes: 1455 × 900
  (column 1120) and 320 × 900 (`scrollWidth` 305 = 320 less the scrollbar on every state: no sideways scroll; the
  same CSS width as a 640 px window at 200 %).
- Data (deleted at the end, `seed9.py cleanup T088` and the request rows): tokens "T088 token" and "T088b token"
  (manage), connections "T088 Verbindung" (three active, two deactivated), drafts "T088 Entwurf" (three); requests of
  every action made with the tokens. Approving ran for real against the fake EUDIPLO.
- Routed (`page.route`, the backend's flat `{error, message[, error_id]}`): another team member's request (`403
  not_yours`), the load failure (`500` with `error_id`), the failed approve (`502` "The wallet service could not create
  the request configuration, so nothing was saved. Try again in a moment." with `error_id`) and failed decline (`503`),
  a slow approve (3 s before the real call), the cancel reasons the stack can't make on demand (`draft_changed`,
  `draft_published`, `draft_deleted`, `connection_deleted`, `access_ended`: the real preview with `status` /
  `cancel_reason` patched), a draft with findings (the real preview plus a duplicate in Standard and a contradicting
  variant "Ambulance"), the catalog slow (4 s) and failing (`500`). Expired and "failed before" from the dev database
  (`expires_at` in the past, `failed_at` + `error_id` set; own rows only).
- Built from: §3 "Alert, page level", "Error state of a page", "Card", "Accordion" (`RulesSummary`), "Dates",
  "Dialog" (the danger button), T076's summary table and findings lines, T078's `LinkCard` list, T028's `CopyableUrl`.

| state | element | expected (spec 007 S3, FR, pattern) | actual | result |
|---|---|---|---|---|
| loading | page | `PageLoader` (007-S3.1) | unchanged | match |
| every loaded state | h1, tab title | the title by action (007-S3.4) as heading/x-large (the AppLayout pages' size, U11), tab "<title> · Konnekt" | "Publish ‘T088 Entwurf’?" … 32/40, tab "Publish ‘T088 Entwurf’? · Konnekt" | match (C1) |
| every loaded state | sub-line | "Requested by {name} · expires at {time}" (007-S3.6) | "Requested by T088 token · expires at 13:35", body/default muted | match |
| publish | body | description line, documents, rules per variant, "Rule checks" (007-S3.7) in the publish dialog's style (T076) | description (one line, "…"), the dialog's table (`PublishSummaryRow` ×2 in the 8 px-round `dl`, decorative border: "Personal ID · 4 data items", "Driving licence · 3 data items"; "Standard · 2 rules"), "Rule checks", then the Summary card (`RulesSummary` draft, open: documents with their data items, variants as tabs, rules read-only), the parts 24 apart | match (decision 1) |
| publish | headings | no skipped level (T079 note) | h1 → h2 "Rule checks" → h2 "Summary" → h3 "Documents" → h4 per document → h3 "Rules" | match |
| publish, checking | rule checks | "Checking the rules…" polite (007-S3.8) | `role="status"` "Checking the rules…" (catalog delayed 4 s), 14/24 muted | match |
| publish, no findings | rule checks | "No findings." | "No findings." body/default | match |
| publish, findings | lines | C4 sentences, warnings first, 4 apart, the dialog's line (T076 note) | "Ambulance: no citizen can meet these rules. 2 rules contradict each other." (warning icon) before "Standard: 1 rule is a duplicate." (info icon); 14/24 regular, default colour, gap 4 | match (FR-044c, C4) |
| publish, findings | Summary tabs | no second check (T079 note) | tabs "Standard", "Ambulance" without findings icons; one `useRuleChecks()` (ApprovalFindings) | match |
| publish, catalog failed | rule checks | "The rules couldn’t be checked." | shown, 14/24 muted; Approve stays | match (007-S3.9) |
| delete_draft | body | description, "Last saved {date}", "Its content will be gone for good." (007-S3.10) | "FS-20418", "Last saved 09.11.2026, 13:16", the sentence semibold | match (cosmetic 3, §3 "Dates") |
| deactivate | body | lead, URLs in `LinkCard`s, "Requests in progress are cancelled." (007-S3.11) | the Links card (white, 1 px decorative border, radius 12): h2 "Links for your service", the lead, "1 Request link", "2 Result link" divided by a line (T078), `CopyableUrl` "Copy link"; the sentence under the card | match |
| reactivate | body | "These connection URLs will work again:" (007-S3.12); a deactivated connection's copy buttons off (T028) | the lead; "Copy link" `aria-disabled` at 40 % with "Activate the connection first" | match (W21) |
| delete | body | lead, URLs, both sentences (007-S3.13) | "These connection URLs will stop working for good:", "Requests in progress are cancelled.", "Deleting can’t be undone." (semibold) | match |
| delete, delete_draft | Approve | filled danger (007-S3.14, T035 note) | `kern-btn--primary kern-btn--danger` red; Decline `kern-btn--secondary` | match |
| working | buttons, status | both disabled, "Publishing…" / "Working…" (007-S3.15); nothing sent twice | both `aria-disabled`, status "Publishing…"; click + forced click + Enter → one `POST …/approve` | match |
| done publish | outcome | "Published." + URLs + "Open the connection" (007-S3.17) | success slim alert (64, focused, no ring after a mouse press), the Links card with the lead "Add both links to your form. Each one goes in its own field.", "Copy link" on, "Open the connection" `kern-link` | match |
| done reactivate | outcome | "Connection reactivated." + URLs | as publish, copy buttons on (the connection is live) | match |
| done deactivate, delete, delete_draft | outcome | the action's word, no URLs | "Connection deactivated.", "Connection deleted.", "Draft deleted."; reloaded after the draft's row is gone: h1 "Delete the draft?" (007-S3.5) | match |
| declined | outcome | "You declined this request. Nothing has changed." (007-S3.18) | info slim alert, one `POST …/decline` | match |
| expired | outcome | "This request expired at {time}. …" (007-S3.19) | warning slim alert, "expired at 13:24" | match |
| expired while open | approve | `409 approval_expired` → the expired state from the answer (007-S3.26) | warning alert with the server's sentence ("expired at 14:24": the server writes German time, the headless browser runs in UTC) | match (baseline) |
| replaced | outcome | "The agent made a newer request for this action." (007-S3.20) | a second publish request for the same draft; warning alert | match |
| cancelled | outcome | each reason's sentence (007-S3.21–S3.24) | real: `access_changed` (token lowered to drafts), `revoked` (token revoked), `connection_changed` ("The connection was reactivated in the meantime.", activated through the API); routed: `draft_changed`, `draft_published`, `draft_deleted`, `connection_deleted`, `access_ended`: each sentence word for word | match |
| failed (approve) | alert, actions | the service's message + error ID, body kept, "Try again" (007-S3.25, FR-033) | danger alert at the top "Couldn’t approve" with the message and "Error ID: 9b1e7c2d-…" (F22), focused; the body kept; "Try again" in place of "Approve" | match (decision 2) |
| failed before (read again) | alert | the kept error ID | "Couldn’t approve" / "The last attempt didn’t work. Nothing has changed." / "Error ID: 7c4d2e1a-…", "Try again"; then approving for real → "Connection deactivated." | match |
| failed (decline) | alert | the service's message + error ID | "Couldn’t decline" with the message; "Approve" kept | match |
| not yours | page | info "This request was made for another team member. Only they can approve it." (007-S3.2) | h1 "Approval request", the slim info alert, tab "Approval request · Konnekt" | match |
| not found | page | the not-found screen (007-S3.3) | `NotFound`, tab "Page not found · Konnekt" | match |
| load failed | page | §3 "Error state of a page" with the error ID and "Go to connections" (T037 note) | h1 "Approval request", danger alert "Couldn’t load this request", "Something went wrong on our side." + "Error ID: 3f2c9a1e-…", then "Go to connections" (`kern-link`, `/`) 10 under it | match (F22, W2) |
| 320 px | every state above | reflow, nothing hidden (FR-010) | title wraps, the table's labels above their lines, the URL boxes and "Copy link" stacked, the alert's text and error ID wrap; `scrollWidth` 305 | match |
| focus | keyboard only | focus-visible only | a mouse press shows no ring (`:focus-visible` false on the focused alert); Tab shows it on the ⓘ, copy buttons, Approve, Decline | match |

Open rows: none.

**Decisions (T088):**

1. **The publish body: the dialog's table and the draft in full.** The task asks for "the stored draft's summary in
   the publish dialog's style" (T076: the `dl` of `PublishSummaryRow`s, the findings lines), and 007-S3.7 keeps the
   documents with their fields and the rules per variant, which the reviewer needs to read before approving. So the
   body is the dialog's table and its findings lines first, then the draft details' Summary card (`RulesSummary`
   with `draft`, T079's suggestion), open, which also fixes the heading order (the h3 "Documents" no longer follows
   the h1). Its counts repeat the table's. UNCERTAIN (layout only; nothing sent or checked changes).
2. **The failed approve is the alert, not the toast.** FR-033's toast is for a failed save; its alert clause ("keeps
   its error ID, list or action") covers this one. The approve is the publish dialog's and the details' action, whose
   failures are drawn as alerts with the error ID (U79, F46; the details' dialogs), and a request read again after a
   failed attempt has to show it on arrival, which a toast can't. Clarification Q17 (a) lists 007-S3.25 among the
   toast's surfaces; the task line leaves "a toast or an alert". UNCERTAIN (presentation of the failure; the requests,
   "Try again" and the error ID are the baseline's).
3. **The page title is heading/x-large**, as the other AppLayout pages (the overview, the welcome page, `NotFound`);
   the column stays AppLayout's 1120.
4. **No "Go to connections" on the other dead ends** (not yours, the outcomes): only the load failure gets it (T037's
   note); the header's Konnekt pill leads back from any of them.
5. **`warningsFirst()` moved** from `PublishDialog.tsx` to `FormConnectionEditor/utils.ts` (exported, with a test in
   `utils.test.ts`), as T076's note allows: the dialog and the approval page both sort with it.
6. **`lastSavedLineOf()` writes `formatRowDate`** ("Last saved 09.11.2026, 14:32"): T044's carried note ("switch it");
   `utils.ts` and its one test expectation changed for cosmetic 3 only. Approval no longer imports `formatEditedDate`.

### S22 Not found, the sign-in guard, errors, tab titles, reflow — T089, 2026-11-09

By the coordinator with playwright-core 1.48.2 and Chromium at 1455 × 900 and 320 × 640 (the CSS
width of a 640 px window at 200 %), signed in as `designer`, on the coordinator's own "T089 …" data
(deleted afterwards). Each row was checked at both widths: one `h1`, the tab title
"<page> · Konnekt", `scrollWidth` 1440 / 305 (no sideways scroll), no control outside the viewport.

| route | state | tab title | h1 | result |
|---|---|---|---|---|
| `/login`, `/forgot-password` | signed out | "Log in · Konnekt", "Forgot password · Konnekt" | "Connect to the EUDI Wallet" | match |
| `/` | connections | "Your connections · Konnekt" | "Your connections" | match |
| `/get-started` | with connections | redirected to `/` (baseline) | "Your connections" | match |
| `/form-connections/new`, `…/<draft>/edit` | step 1, test step | "Name your connection · Konnekt", "Test rules with sample citizen data · Konnekt" | the step's title | match |
| `/form-connections/<id>` | active, deactivated, draft | "<name> · Konnekt", "<name> (Draft) · Konnekt" | "Your connection is active", "Connection deactivated", "This connection is a draft" | match |
| `/form-connections/<id>/edit` | step 1 | "Connection details · Konnekt" | "Connection details" | match |
| `/form-connections/<unknown>`, `/approvals/<unknown>` | not found | "Page not found · Konnekt" | "Page not found" | match (`NotFound` titled by its callers, T037) |
| `/authorize?…` | request, invalid | "Allow access · Konnekt" | "Allow access for T089 agent?", "Allow access" | match |
| `/account` | listed | "Your account · Konnekt" | "Your account" | match |
| `/approvals/<id>` | publish, delete_draft, deactivate, reactivate, delete | "<the h1> · Konnekt" | "Publish ‘T089 Entwurf’?" … "Delete ‘T089 Verbindung’?" | match |
| `/no-such-page` | unknown route | redirected to `/` (baseline, S22) | "Your connections" | match |
| the wizard's footer | 320 px, step 1 and the edit flow | — | — | wraps: "Save and exit" (step 1) and "Discard changes" / "Save" (edit) keep their labels on their own rows above "Choose documents →" (005-ACC.4): match |
| guards | — | — | — | `RequireSignIn`, `RequireSignedOut` and `App.tsx`'s routes unchanged in this phase (git diff empty; W2) |
| errors | — | — | — | every `errorNoticeOf` call site reaches `ErrorNoticeText` (the page's alert, `ConfirmDialog`, `LoadFailed` or the toast): Account, Approval, Authorize, Login, the overview, the editor, the details, `useFormConnection` (F22) |
| light only | — | — | — | `data-kern-theme="light"` in `index.html`, `color-scheme: only light` in `index.css`, no `dark:` class (FR-011) |

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

### 6.4 US3 checkpoint (T075, 2026-11-09)

Quickstart V5 (steps 1–9) and V6 (steps 1–5), by the coordinator with playwright-core 1.48.2 and
Chromium (`/usr/bin/chromium`) at 1455 × 900 / 1000, one check in Firefox (playwright-firefox MCP),
against the dev server, on the coordinator's own drafts ("T075 rules", "T075 empty", "T075
unrequested", "T075 variants", "T075 contradiction", "T075 many rules"; deleted afterwards). No
mutation was sent in any walk (every rules-step and test-step change is local state); the seeded
drafts were not opened for saving. Each task's own walk (T055–T074, §5.2) covers the frames state by
state; this checkpoint walks the steps across them.

| step | result |
|---|---|
| V5.1 | an empty Standard: "Set eligibility rules for citizens", the intro naming Konnekt, the tab row "Standard" with its ⋯, "+ Add variant" and the ⓘ "About variants" (action tone), "No rules yet" with "Add rule"; the footer's "Publish without rules" now secondary (U51 8.8, fixed here): pass |
| V5.2 | "Add rule": the pickers unlock in order (Choose document → Personal ID → Date of birth (Age) → the check menu with "Time ago" / "Time from now" sections and their symbols → "is at least"); 0 → "Enter a whole number greater than 0."; 21 → the counting note "Today (09.11.2026), that means born on or before 09.11.2005.", "Citizens who turn 21 that day count.", the missing note, the proposed message "You need to be at least 21 years old."; the other kinds, the empty-field error and the duplicate name: T061–T063's tables: pass |
| V5.3, V5.4 | Standard's menus: Rule 01 "Edit rule, Rename, Duplicate, Copy to variant, Group with other rules, Copy link, Delete rule"; Group 01 "Rename, Add message, Ungroup, Copy link, Delete group" (no grouping, #64); Sub-group 02 "… Delete sub-group"; Rule 04 inside the sub-group without "Group with other rules" (#61); "Add message" on Group 01 → its three member rules read "Not shown while this rule is in Group 01. Citizens see the group message instead." (F32); select mode and the connector menu: T057, T059's tables: pass |
| V5.4 (editor) | editing Rule 04 inside Sub-group 02 of Group 01 with a message: its own message stays editable, the hint "Not shown while this rule is in Group 01. Citizens see the group message instead." under it (U35 `6965:50822`, built here: `editorMessageHintOf()`, the editor's `messageHint`): pass |
| V5.5 | every ⋯ menu 220 wide with 40 px entries, "Copy link" before the destructive entry; Standard's tab menu "Rename, Copy link"; "Test rules" disabled with its explanation while a rule is open or the rules are in error (#66): pass |
| V5.6 | Ambulance (based): "Linked to Standard", "Rules you don’t change follow and update with Standard.", "Changed here", "Added here"; Rule 01 (linked) "Edit rule, Copy to variant, Group with other rules, Copy link, Remove from Ambulance" (no Rename, Duplicate); Group 01 (changed) "Add message, Reset to Standard, Copy link, Remove from Ambulance"; Rule 06 (added) the full menu with "Delete rule"; "Remove from Ambulance" on Rule 02 → "1 of 5 Standard rules is removed here.", "Removed here", its menu "Restore rule, Copy link"; the tab menu "Rename, Copy link, Delete variant"; the dialogs, the popover and the deletion with Undo: T064, T067, T068's tables: pass |
| V5.7 | the findings: "Rule 05 is the same as Rule 01." with both names as links, the tab names "Standard has findings", "Ambulance has findings", the notes and outlines; the other kinds and the tooltips: T069, T070's tables (W13: every kind seen once): pass |
| V5.8 | a rule on Nationality no longer requested: the banner "Rule 02 in Standard checks data that’s no longer requested. Add it again in Documents, or edit or delete the rule." with "Add it in Documents", the tab's red icon, the rule's note now "Nationality is no longer requested." (U50 #13, #14; built here: `unrequestedNoteOf()`, the server's sentence kept for a target the catalog doesn't know), "Test rules" disabled: pass |
| V5.9 | "Copy link" on Ambulance's Group 01 → "Link copied.", the clipboard (read with Chromium's clipboard permission) holds `…/edit?step=rules&variant=<id>&item=group-1`; opening it selects Ambulance and focuses Group 01's header; without `item` the tab takes the focus; a stale item → "This link points to a rule or group that no longer exists." with "Dismiss", focused; a stale variant → "This link points to a variant that no longer exists." on Standard: pass |
| V6.1 | "T075 variants": "Creating 3 sample citizens…" first, then the chips, the data card's flat list, "Result: …", "Tested as if shared today, 09.11.2026.", "Generate all", "Edit data", "Generate again", no variant ⓘ; tab title "Test rules with sample citizen data · Konnekt"; the page doesn't scroll at 1455 × 900: pass |
| V6.2 | (T072's script) "Edit data" → the dialog; an impossible date → "Enter a date that exists, e.g. 28.02.2007." under the field, the save blocked with the focus on it; saved → "Results updated. Emre no longer meets Rule 01 · Minimum age 21." (green) and back; classes by code, "Class B since" coming and going; Escape → focus on "Edit data": pass |
| V6.3 | "Generate again" asks only for an edited citizen ("Generate new data for Mia?"), "Generate all" asks for all, names kept: pass |
| V6.4 | "T075 contradiction": the ⚠ on Standard and Ambulance, no line above the heading; a variant without rules: T073's table; generation failed (the Worker blocked in the browser by T074's init script) → "Couldn’t create sample citizens" and "Try again" → "Creating 3 sample citizens…" → the results, focus on the first chip: pass |
| V6.5 | "T075 many rules" (12): the page stays at 900, only the panel scrolls (F43); arrow keys between chips: T073's table: pass |
| Firefox | the connector line (T057's carried note): `rgb(79, 140, 255)` (`--kern-color-decorative-brand-default` `#4f8cff`) as in Chromium: pass |

Fixed by the coordinator during the phase: `TestStep` drops its saved-edit toast while the editor's
failed save shows (`saveFailed`, R8, T072's open point); `ActionMenu` sizes `w-max min-w-220
max-w-280` and plans for 280 (T066's open point: "Remove from <variant>" fits as Figma's auto-width
menus draw it); "Publish without rules" secondary (U51 8.8); the flagged rule's note in the design's
words (U50); the editor's group-message hint (U35); the "Generate all" wording in quickstart V6.3
and the stale V5.3 / V5.6 wording (#64, cosmetic 8). `rules/src/` is unchanged since T014 (`git
diff --stat -- rules/src` empty); no `console.*` added under `checks/`, `personas/`, `workers/`, the
hooks.

Decided by the user after the walk (2026-11-09), changed in the rules package: the rule notes
read the design's "Can’t be met together with Rule 02." (U44 / U45 / U46, FR-022; was "Contradicts
Rule 02.", `noteOf()`); number statements carry the symbol chip ("> is greater than", "< is less
than", "=", "≠" as the number check menu U53 `6616:39880` draws them; U45 `6753:40528`,
`6753:40544`): `NUMBER_OPERATOR_SYMBOLS` in `rules/src/constants.ts`, and `symbolOf(operator,
kind)` gives a chip only to number and relative date conditions, so a text "is equal to" keeps
none. Fixed dates ("is before" / "is after" / "is") still have no chip in the statement. Open for
a person: V5.7's and
V6.5's announcements and focus moves, and the "Save rule" press (#65), read by a screen reader
(NVDA or VoiceOver); the variant dialog's "ⓘ" glyph on a desktop system (T064).

### 6.5 US4 checkpoint (T085, 2026-11-09)

Quickstart V7 (steps 1–4) and V8 (steps 1–4), by the coordinator with playwright-core 1.48.2 and
Chromium (`/usr/bin/chromium`) at 1455 × 900 / 1000 and 320 × 640, against the dev server whose
backend ran with the tests' in-memory `FakeEudiplo` (a scratchpad launcher, nothing in the repo), so
publishing, deactivating, reactivating, deleting and saving a revision ran for real against the dev
database. Data: the coordinator's own "T085 …" drafts and connections, deleted afterwards, as were
the phase's shared "P8 …" connections (their configurations lived only in the fake). Each task's own
walk (T076–T084, §5.2) covers the frames state by state; this checkpoint walks the steps across them.

| step | result |
|---|---|
| V7.1 | "T085 Führerscheinantrag Esslingen" (Standard, Ambulance, School transport) from the test step: "Ready to publish?" with the counts, the findings warnings first ("School transport: no citizen can meet these rules. 2 rules contradict each other." before the two "1 rule already covered." lines), "Back to test" closes to the step; "Publish connection" → "Publishing… This takes a few seconds.", Escape and the scrim don't close it; a routed `502` with `error_id` → "Couldn’t publish, so nothing has changed. Check your internet connection and try again." with "Error ID: …", the summary kept and "Try again" (the focus on the ×); the real publish → "Published", the details 585 ms after the answer with "Hide links" open (the 0.5 s timer plus the page change); "T085 Ohne Regeln" → "Publish without rules?" with "No rules" and "Add rules": pass |
| V7.2 | from the overview's "View": tab title "<name> · Konnekt", one h1 "Your connection is active" with its sub-line, the header pill "Your connections / <name> · Active" and the description meta; Summary open ("2 documents · 7 data items · 3 variants · 4 rules"), the documents, the findings lines, the variant tabs "Standard has findings" …, read-only rows with "rule-1" …; "View links" opens Links and closes the Summary (one at a time); "1 request link · 3 result links", both ⓘ texts as CLAR #49 / U80, URLs one line with "…"; "Copy link" → "Copied" and "Link copied" in the live region, the clipboard holds the URL, back to "Copy link" after 2 s; no Activity, PDF, date pill or "Create new connection": pass |
| V7.2 (U63 11.15) | a connection whose Standard is renamed "Taxi and rental cars": the result link's label, the Summary's tab and counts use the new name: pass |
| V7.3 | "T085 Fischereischein": the ⋯ "Deactivate, Delete connection"; "Deactivate this connection?" with F13's body, "Keep active" / "Deactivate"; the toast "Connection deactivated.", the focus back on the ⋯; the band "Connection deactivated" with "Activate again" before the ⋯; the copy buttons `aria-disabled` with "Activate the connection first"; "Activate this connection again?" with the documents and rules summary → "Connection reactivated.", the focus on the h1; "Delete “T085 Fischereischein”?" with U90's body, "Keep connection" / "Delete connection", the scrim doesn't close it; deleted → the overview with "“T085 Fischereischein” deleted.", no Undo (F4): pass |
| V7.4 | the deleted connection's address → "Page not found" with "Go to connections" (W2): pass |
| V8.1 | "View" on "T085 Unvollständig" (an incomplete rule): tab title "<name> (Draft) · Konnekt", the Draft badge in the breadcrumb, h1 "This connection is a draft", the sub-line, "Edited 09.11.2026, 12:16", "Delete draft" in the band, the Summary open, the incomplete Rule 01 as far as it goes (W8, T081), the Links card "Created when the connection is published and active.", the footer "Edit connection" / "Go to connections"; "Delete draft" → the dialog with F55's body; routed `409 draft_published` → "This draft has been published since you opened it." with "Open the connection"; `404` → "This draft has already been deleted." with "Go to overview": pass |
| V8.2 | the row's "Edit" → "Edit “<name>”?" (F48 body, "Cancel" / "Edit connection") → step 1 "Connection details" with "Active" in the pill and F49's note; the step line's Documents, Rules, Test are buttons; footers "Discard changes · Choose documents → · Save" and on the rules step "Back · Discard changes · Test rules · Save"; with a rule open "Save" is `aria-disabled` with "Save the rule first" and a press opens nothing; "Discard changes" → "Discard your changes?" ("Keep editing" / "Discard changes") → the details unchanged, no toast: pass |
| V8.3 | a changed description, then "Konnekt" → "Save your changes?" (F64's body, "Discard changes" / "Save"); × keeps the flow; "Discard changes" leaves to the overview, nothing stored; a routed `409 rules_changed` on the save → "The rules changed since you opened them" with "Reload" / "Replace their changes"; "Save" → "Save changes?" → the details with "Changes saved." and the description stored (two real `PUT`s, one routed): pass |
| V8.4 | opening the edit flow runs the checks (the rules step's tabs carry their findings at once); the personas Worker blocked by an init script → "Couldn’t create sample citizens", "Try again, or save without testing.", "Save" still in the footer (W9): pass |
| 320 px | the active, deactivated, draft and renamed details, the edit flow's step 1 and rules step, an unknown id: no sideways scroll (scrollWidth ≤ 320), one h1 each: pass |

Fixed by the coordinator: the stale doc comments in `FormConnectionDetail/index.tsx` (S16) and
`RulesSummary.tsx` (T081's note). Accepted from the tasks (no spec item settles them, none touches
core behaviour): the ⋯ and "Activate again" in the band's top-right chip (T078, T080), "Delete draft"
in the draft band (T081, F56 undrawn), Links open only after publishing (T078), no status while the
details' checks run (T079), the deactivated connection's edit entry and discard body (T083), the
delete-variant body for a deactivated connection (T084), the delete toast neutral (T044, T082).
`rules/src/`, `mcp/` and `backend/` are unchanged; `api-types/src/routing.ts` gained the router
state `OverviewLocationState.deleted` (T082, beside `draftSaved`). No `console.*` under
`pages/FormConnectionDetail/`, `hooks/`, `workers/`, `rules/src/checks/`, `rules/src/personas/`.

Open for a person: the walk ran against the fake EUDIPLO; publishing, deactivating, reactivating and
saving a revision against the hosted EUDIPLO need its credentials in `backend/.env` (tasks.md, phase
8 "Needs a person"); the 0.5 s "Published" wait timed by hand in a real browser (measured here by
script: 585 ms from the answer to the details).

### 6.6 US5 checkpoint (T089, 2026-11-09)

Quickstart V9 (steps 1–3), by the coordinator with playwright-core 1.48.2 and Chromium at 1455 × 900
(320 × 640 for the step-up), against the dev server whose backend ran with the tests' in-memory
`FakeEudiplo` (as in §6.5). No MCP client: the agent side came from a scratchpad helper that
registers an OAuth client (RFC 7591), consents through `POST /api/oauth/authorize`, exchanges the
code with a PKCE verifier, creates personal access tokens, and posts approval requests with a
token's bearer; the consent page was opened from a hand-built `/authorize` URL (the task's
fallback). Data: the coordinator's own "T089 …" connections, drafts, tokens and agents, deleted
afterwards. Each task's own walk (T086–T088, §5.2 S19–S21) covers the states one by one; this
checkpoint walks the steps across them. S22's route-by-route table is in §5.2.

| step | result |
|---|---|
| V9.1 | "T089 agent wants to act on your behalf in Konnekt. Choose what it may do." (C1); the scope "read drafts manage" preselects "Read, edit drafts and manage live connections"; a routed `500` with `error_id` on Allow → the danger alert with the error ID, the chosen level kept; "Allow" with "Read and edit drafts" → the client's redirect URI with `code` and `state`, the body `"decision":"allow","access_level":"drafts"`; "Deny" → `error=access_denied`, no `access_level` sent; a `redirect_uri` not the client's → "This sign-in request isn’t valid. Start again from your agent." on the page with the server's message, no redirect; a client authorized (code exchanged) at "read" asking "read drafts" → "T089s agent is asking for more access than it has." with "Read and edit drafts" preselected, at 320 px without sideways scroll: pass |
| V9.2 | the connected agent and the token listed with their levels and "dd.mm.yyyy, hh:mm" dates; "Create token" → the token dialog with the `cp_pat_…` secret in the read-only field; "Copy" → "Copied" with the check icon for 2 s, "Token copied" in the live region, the clipboard holds the token; after "Done" the secret is nowhere in the page; the row's ⋯ → "Change access level", "Revoke"; "Change access level" → "Read only" → "Access level changed. It applies from the agent’s next call."; "Revoke" → the row gone; "Your account" the user menu's first entry. The empty state ("No agent is connected yet. Add Konnekt's MCP server to your agent to connect it.") was checked by T087 on an empty account: pass |
| V9.3 | deactivate approved → "Connection deactivated."; delete_draft declined → "You declined this request. Nothing has changed."; publish with a routed `502` (1.2 s late) → "Publishing…" while it works, then the danger alert with "Error ID: err-T089-approve" and "Try again" in place of "Approve"; "Try again" (real) → "Published." with the Links card; reactivate approved → "Connection reactivated." with the links; the delete request made before the deactivation → "The connection was deactivated in the meantime." (cancelled, `connection_changed`). Expired, replaced, the other cancel reasons, another team member's request and the load failure: T088's table (§5.2 S21): pass |

Accepted from the tasks (no spec item settles them, none touches core behaviour; the requests each
page sends are byte-identical to the baseline's, T086–T088): the consent card's h1 in the card
heading's style, the card top-aligned, "Deny" before "Allow" in equal columns (T086); the token
dialog and "Revoke" ignore a scrim click (T087); the approval page's publish body shows the publish
dialog's summary and findings, then the draft details' Summary card, so the counts appear twice
(T088); a failed approve is the 007-S3.25 danger alert with the error ID and "Try again", not
Q17 (a)'s toast: the task line leaves "a toast or an alert per FR-033" open, FR-033's toast text is a
save's, and a request read again after a failed approve (status waiting with `error_id`, FR-027) must
show the failure on arrival, which a toast can't (T088). Fixed by the coordinator: the stale comment
on `ROUTES.firstConnection` (`src/constants.ts`; a sign-in lands on `/` since T042). `rules/src/`,
`mcp/`, `backend/` and `api-types/` are unchanged; `warningsFirst()` moved from `PublishDialog.tsx`
to `FormConnectionEditor/utils.ts` with a test (T088, T076's note).

Open for a person: V9 with a real MCP client (Claude Code with `mcp/plugin/` against the MCP server
on 3100) opening the consent page and making the agents and approval requests through its tools;
approving a publish request against the hosted EUDIPLO (credentials as in phase 8).

### 6.7 Keyboard walkthrough (T095, 2026-11-09)

Quickstart V10, by a task agent with playwright-core 1.48.2 and Chromium 156 (`/usr/bin/chromium`)
at 1455 × 900 (a 1440 px page), against the dev server whose backend runs the in-memory fake
EUDIPLO. Every step was driven by the keyboard only (`Tab`, `Shift+Tab`, arrows, `Home`/`End`,
`Enter`, `Space`, `Escape`); the mouse was used only for the focus-ring-after-click checks. The
script read for every focus stop the role, the accessible name, `:focus-visible` and the computed
outline / box-shadow (the ring); the h1s from the accessibility tree (`page.accessibility.snapshot`);
and every live-region change through a `MutationObserver` installed before the app loads (text
changed inside an `aria-live` / `role="status"` region, a `role="alert"` inserted, or a status
region inserted with its text, which may stay silent). Data: the agent's own "T095 …" connections
(seed8.py), a "T095 keyboard draft" made in the walk, a seed9.py draft, and on `p9-consent`,
`p9-account`, `p9-approval` the seed9.py client, agents, tokens, connection, draft and two approval
requests; all deleted afterwards (`seed9.py cleanup T095` on the four accounts; the T095 rows and
agent-access lists checked empty). The seeded `designer` data was only read. No page error in any
walk. Scripts and screenshots: the scratchpad's `phase11/T095/`.

| flow | step | result |
|---|---|---|
| US1 | `/login`: tab title "Log in · Konnekt", one h1; order Username → Password → "Show password" → "Forgot password?" → "Log in" | pass |
| US1 | wrong password by Enter: the `role="alert"` "Username or password is wrong. Check both and try again." inserted (announced), focus stays in Password | pass |
| US1 | "Show password" by Space: the field turns `text`; a mouse click on it leaves no ring | pass |
| US1 | "Forgot password?" by Enter: "Forgot password · Konnekt", one h1, "Back to log in" the only control; Enter returns to `/login` | pass |
| US1 | sign in by Enter → `/` ("Your connections · Konnekt", one h1) | pass |
| US1 | overview order: Konnekt → account pill → Search → per row name link, "View <name>", "Edit <name>", "Delete <name>" → … → the footer's "Create connection" (DOM order = visual order) | pass |
| US1 | account menu: Enter opens it with the focus on "Your account"; ↓ ↑ Home End move (wrapping); Escape closes it with the focus back on the pill; Tab leaves and closes it; opened by a click, the item has the focus without a ring | pass |
| US1 | search: typing announces "7 of 9 connections", "3 of 9 connections" (`role="status"`); "Clear search" is the next stop | pass |
| US1 | row delete dialog: Enter → focus on ×; Tab goes × → "Keep connection" → "Delete connection" → (the browser's own UI) → ×, never to the page (inert); Escape returns the focus to the row's "Delete <name>"; opened by a click, × has no ring | pass |
| US1 | a cut description (routed long text): keyboard focus on the row's name opens the full-text bubble; Escape closes it, the focus stays | pass |
| US1 | welcome page (routed empty list): "Welcome · Konnekt", one h1 "Welcome to Konnekt"; Konnekt → pill → "Create connection" | pass |
| US1 | local drafts offer (two never-saved connections): per item "Discard changes in <name>" → "Resume editing <name>", before Search; the dialog Cancel / Discard; after Discard the polite status "Unsaved work discarded." and the focus on the next "Resume editing"; after the last one (by mouse) the focus on the h1, no ring | pass |
| US1 | log out by the menu (↓, Enter) → `/login` with "You’re logged out." in the polite status | pass |
| US2 | "Create connection" by Enter → step 1 ("Name your connection · Konnekt", one h1); order Konnekt → "Your connections" → pill → ⓘ "About the connection name" → name → ⓘ "About the description" → description → "Save and exit" → "Choose documents" | pass |
| US2 | both ⓘ open their tooltip on focus; Escape closes it, the focus stays | pass |
| US2 | "Choose documents" without a name: focus on the name field, `aria-invalid="true"`, described by "Enter a name for the connection." | pass |
| US2 | Konnekt with a name typed → "Leave this connection?": × → "Discard connection" → "Save progress"; Escape keeps the flow, focus back on Konnekt | pass |
| US2 | "Log out" with unsaved work → × → "Cancel" → "Log out anyway" → "Save and log out"; Escape → focus on the pill, no menu left open | pass |
| US2 | "Save and exit" (save held 1.2 s): the button reads "Saving…", `aria-disabled`, keeps the focus; "Saving draft…" then the toast "Draft saved. You can pick it up any time." announced in the polite status | pass |
| US2 | documents step: the h1 takes the focus (no ring, `tabindex=-1`); order "Add document" → Back → "Save and exit" → "Set rules" (`aria-disabled`, described by "Add a document first", its tooltip open on focus; Enter does nothing) | pass |
| US2 | "Add document": Enter opens the card with the focus in "Find a document"; ↓ ↑ move through the rows (↑ from the first row back to the field); Escape closes it, focus on "Add document"; "zzz" announces "No documents match “zzz”."; Enter on a row adds it, focus back on "Add document" | pass |
| US2 | order with a document: "Personal ID" → "Remove Personal ID" → "All data items" → the items; Space ticks a box; a mouse click on a box leaves no ring | pass |
| US2 | "Remove Personal ID": "Keep document" / "Remove document", Escape returns to the trash; Remove → the toast "Personal ID removed. Undo" announced, focus on "Add document"; "Undo" reachable by Tab (after the footer) restores it and focuses "Personal ID" | pass |
| US3 | rules step: the h1 takes the focus; order tab "Standard" → "Actions for Standard" → "Add variant" → ⓘ "About variants" (tooltip on focus) → "Add rule" → Back → "Save and exit" → "Publish without rules" | pass |
| US3 | the tab's ⋯ menu: Enter, ↓, Escape back on the ⋯ | pass |
| US3 | rule editor: "Add rule" → focus on "Documents: Choose document"; Enter opens the list (focus on "Personal ID"), Enter picks it and opens the data menu with the focus in its search; ↓ into the options, ↑ back to the search; Enter picks "Given name" and opens the check menu ("is equal to"), Enter → the value field | pass |
| US3 | "Save rule" `aria-disabled` described by "Rule 01 in Standard: choose the data to check." (tooltip on focus); Enter on it moves the focus to the missing part | pass |
| US3 | "Save rule" → "Rule 01 saved." announced (toast), focus on the rule | pass |
| US3 | the rule's ⋯: ↓ wraps, Escape back on the ⋯; "Duplicate" → the findings' status "Rule 02 is the same as Rule 01." announced (polite, `FindingsAnnouncer`); the tab reads "Standard has findings", its icon button "Standard has findings" opens "1 duplicate: Rule 02 is the same as Rule 01." on focus, Escape closes it | pass |
| US3 | connector "AND, switch Standard to AND or OR": Enter opens the `menuitemradio`s, ↓, Escape back on the connector | pass |
| US3 | "Add variant" dialog: focus in "Variant name"; Tab name → description → radio → Cancel → "Add variant" → ×; Escape back on "Add variant"; adding moves the focus to the new tab | pass |
| US3 | variant tabs: one stop (roving); ← → Home End move the focus, Enter selects | pass |
| US3 | "Group with other rules": focus on "Select Rule 01"; the bar ("Group rules" `aria-disabled`, Cancel) sits before the rules; ticking Rule 02 announces "2 rules selected"; "Group rules" → "Rule 01 and Rule 02 are now in Group 01. Undo" announced, focus on the group | pass |
| US3 | rename: Enter edits, Escape cancels back on "Rename Rule 01"; an empty name → "Enter a name." (assertive) under the field, which it describes | pass |
| US3 | "Copy link" → "Link copied." announced | pass |
| US3 | "Copy to variant" (Ambulance, Rule 01): focus on the first variant's box; Tab goes round its controls; Escape closes it, focus on the ⋯ | pass |
| US3 | "Delete rule" dialog: Cancel / "Delete rule"; Escape back on the ⋯ | pass |
| US3 | "Test rules" → the h1 takes the focus; "Creating 3 sample citizens…" announced; order tab → chip → "Generate all" → "Edit data" → "Generate again" → Back → "Save and exit" → Publish; chips ← → Home End; the variant ⓘ ("About Ambulance") opens on focus | pass |
| US3 | "Edit data": focus in the first field; Tab goes round; Escape back on "Edit data"; "Save and test" → "Results updated. Anna now meets Rule 01." announced, focus on "Edit data" | pass |
| US3 | "Generate again" for an edited citizen: × → Cancel → "Generate new data", Escape back; generating announces "Creating new data for Anna…", focus on the chip; "Generate all" announces "Creating 3 sample citizens…" | pass |
| US4 | the publish dialog: × → "Back to test" → "Publish connection"; Escape and "Back to test" return the focus to "Publish" | pass |
| US4 | "Publish connection": the status dialog takes the focus, named "Publishing…"; "Published. Opening your connection page…" was a `role="status"` inserted with its text (may stay silent) | **fixed** (S14, `PublishDialog.tsx`, T077): one status holds both states, so the text is announced as a change (checked: "Published Opening your connection page…", also "Saved …" in the edit flow) |
| US4 | the details after publishing: one h1 "Your connection is active", which has the focus; order ⋯ → "Hide links" → ⓘ request → "Copy link" → ⓘ result → "Copy link" → "View summary" → the tab → "Edit connection" → "Go to connections"; the ⓘ open on focus; "Copy link" → "Link copied" announced; the accordions toggle `aria-expanded` | pass |
| US4 | ⋯ → Escape back on the ⋯; "Deactivate this connection?" Keep active / Deactivate, Escape back on the ⋯; Deactivate → "Connection deactivated." announced, focus back on the ⋯ | pass |
| US4 | deactivated: "Activate again" before the ⋯; the copy buttons `aria-disabled`, described by "Activate the connection first" (tooltip on focus); "Activate" → "Connection reactivated." announced, focus on the new h1 | pass |
| US4 | "Delete connection" dialog from the ⋯: Escape back on the ⋯ | pass |
| US4 | draft details: "T095 Entwurf (Draft) · Konnekt", one h1; "Delete draft" → Summary → tab → "Edit connection" → "Go to connections"; the delete dialog returns the focus to "Delete draft" | pass |
| US4 | the row's "Edit" on a published connection: "Edit “<name>”?" Cancel / "Edit connection", Escape back on the row's Edit; "Edit connection" → "Connection details" | pass |
| US4 | the edit flow: the step line's Documents, Rules, Test are buttons after the pill; footer "Discard changes" → "Choose documents" → "Save"; with a rule open "Save" is described by "Save the rule first" (tooltip on focus) | pass |
| US4 | Konnekt with changes → "Save your changes?" × → "Discard changes" → "Save", Escape back on Konnekt; "Discard changes" dialog Keep editing / Discard changes, Escape back | pass |
| US4 | "Save" → "Save changes?" ("Check rules again" / "Save"), Escape back; Save → "Saving…" → "Saved. Opening your connection page…" (the fix above) → the details with "Changes saved." announced | pass |
| US5 | consent (`p9-consent`): "Allow access · Konnekt", one h1 "Allow access for T095 agent?"; order Konnekt → pill → the radio group (one stop, ↑ ↓ change the level) → Deny → Allow → "user page" (T086's order); a click on a radio leaves no ring; Enter on Allow → the client's redirect with `code` | pass |
| US5 | account (`p9-account`): order Konnekt → pill → "Actions for T095 agent" → "Create token" → "Actions for T095 token"; the ⋯ menu Escape; "Change access level" (×, radios, Cancel, Save) and "Revoke" dialogs return the focus to the ⋯ | pass |
| US5 | "Create token": focus in Name; no name → the alert "Enter a name for the token." (announced), focus on Name; created → focus in the read-only "Your token" (FR-042, ring shown at once); "Copy" → "Copied" and "Token copied" announced; "Done" → focus on "Create token" | pass |
| US5 | approval (`p9-approval`), deactivate: one h1 "Deactivate ‘T095 Verbindung’?"; order … → Approve → Decline; Approve → "Working…" (status) then the alert "Connection deactivated." with the focus | pass |
| US5 | approval, publish: Summary → tab → Approve → Decline; Decline → "Working…" then "You declined this request. Nothing has changed." with the focus | pass |
| all | one h1 per route (accessibility tree): `/login`, `/forgot-password`, `/`, `/get-started` (→ `/`), `/form-connections/new`, active, deactivated and draft details, a draft's and a published connection's `/edit`, `/authorize` (no parameters), `/account`, an unknown approval and an unknown connection ("Page not found"), an unknown route (→ `/`): exactly one each, every tab title "<page> · Konnekt" | pass |
| all | focus ring after a mouse click (none): "Show password", the account pill (menu item focused), row Delete (× focused), the offer's Discard, a data box, a persona chip, the details' ⋯ and accordions, Deactivate / Activate by mouse (focus back on the ⋯ / on the h1), a consent radio, the step line, the variant tabs, the rule ⋯ and its items, "Add rule", "Discard rule", "Save rule", the connector and its options, the findings icon, a findings banner link, the variant dialog's Cancel, "Generate again", "Save and test"; text fields focused after a click ("Find a document", "Variant name", the rename field, Edit data's first field, the token's Name) show their field focus, as a text field does | pass |
| all | dialogs: every one a native modal `<dialog>`: the page behind is inert; Tab after the last control goes to the browser's own UI (or, in the edit flow's "Save your changes?", straight back to ×) and comes back to the first, never to the page; Escape (or the dialog's own close) returns the focus to the opener, except where the opener is gone (the h1 takes it) | pass |

Fixed during the run: the publish dialog's status (S14 "Dialog/Status", built by T077):
`PublishDialog.tsx` `PublishStatusDialog` now carries `role="status"` on the dialog's one content
column, which stays while "Publishing…" ("Saving…") turns into "Published" ("Saved"), instead of a
second status inserted with its text; `FeedbackLoader`'s own status sits inside it and never
changes. Behaviour, wording and look unchanged. Open for a person: the screen reader's reading of
every announcement above (NVDA or VoiceOver).

### 6.8 Screenshot matrix (T096, 2026-11-09)

Quickstart V11, by a task agent with playwright-core 1.48.2 and Chromium 156 (`/usr/bin/chromium`),
against the dev server whose backend runs the in-memory fake EUDIPLO; a Firefox 158 spot check
with the playwright-firefox tools. Two widths per state:

- **1440**: a 1455 × 900 window (a 1440 px page beside the 15 px scrollbar).
- **320 @ 200 %**: a 320 px window at 200 % zoom, run as the **equivalent CSS-pixel viewport,
  160 × 320 CSS px at device scale 2** (the screenshots are 320 px wide). `document.body.style.zoom
  = '2'` on a 320 px window misbehaved and was not used: the media and container queries still saw
  320 px while the content had 160, sticky and fixed parts landed mid-page in the screenshots, the
  h1 clipped where the 160 px layout breaks it, and `getBoundingClientRect` mixed zoomed and
  unzoomed coordinates. The browser's own zoom shrinks the CSS viewport the same way (Chrome at
  200 % on a 320 px window: `innerWidth` 160), so the CSS viewport is the faithful equivalent. At
  the start of the run every route already passed at **320 CSS px** (the WCAG 1.4.10 reflow width,
  = 1280 px at 400 % or 640 px at 200 %, the width the §5 tables call "320 px (200 %)"); at 160 CSS
  px eleven of fifteen routes scrolled sideways or cut content. The fixes below make 160 CSS px
  pass.

Per screenshot the script read: `horizontal_scroll` = `documentElement.scrollWidth` beyond its
`clientWidth` (headless Chromium keeps a 15 px scrollbar, so the 160 px window has 145 px of page);
`hidden_content` = any visible text or control past the window's left or right edge, any element
whose text is cut by `overflow: hidden` without the design's "…" (`truncate`, which the header's
name, the row descriptions and the URLs use by design), any box that scrolls sideways inside the
page, any open dialog, menu, tooltip, toast or alert outside the window (fixed) or the document
(absolute), or cut vertically without scrolling; and "Save and exit" (or "Saving…") with its label
visible and uncut. A dialog or menu taller than the window scrolls inside (noted in the row); that
keeps its content reachable. Full-page screenshots, except where a modal dialog is open (window
screenshot); Playwright's full-page capture draws a sticky footer where the first window ended, an
artefact of the capture, not of the page. States the stack can't make are routed answers of the
backend's shape (flat `{error, message[, error_id]}`), marked "routed"; "(T096 …)" data are the
agent's own copies. Screenshots: the scratchpad's `phase11/T096/shots/` (`<file>-w.png` at 1440,
`-n.png` at 320 @ 200 %), not committed. Scripts: `phase11/T096/s1.mjs` … `s7.mjs`, `extra.mjs`, `extra2.mjs` (`runall.sh` runs s1–s7).

**Fixed during the run** (each a UI task of its screen; all of them only change windows under
320 CSS px, the new `narrow:` variant `@media (width < 20rem)`, except where the row says
otherwise):

| screen (S#, task that built it) | file | what failed at 320 @ 200 % | fix |
|---|---|---|---|
| every screen (overlay, T006) | `frontend/src/index.css` | words wider than their line pushed the page sideways (the details' summary, the alerts, the step header); 24 px card paddings and nested group indents left a few px for text (the rules step one letter per line, 34 000 px tall); KERN's alert put its title in 15 px beside the 32 px icon; KERN's dialogs kept 32 px sides (content 49 px wide, the dialogs scrolled sideways); `whitespace-nowrap` / `shrink-0` parts wider than their row (badges, buttons, the "Choose documents" step name, the offer's two buttons) | the `narrow` custom variant and one unlayered `@media (width < 20rem)` block: `overflow-wrap: anywhere`; the horizontal paddings and gaps of 16 px and more halved (`p-`, `px-`, `pl-`, `pr-`, `gap-`, `gap-x-` 16–48, `pl-64`, `pl-96`); `.whitespace-nowrap` wraps and `.shrink-0` is at most its row's width; KERN buttons 8 px sides (label 4); KERN's alert header wraps (icon above the title), 8 / 12 px sides; KERN's dialogs 12 px sides with the title on its own line under the × (`wrap-reverse`) |
| L2 header (T031, T033) | `components/TopBar/index.tsx` | the connection pill ("Your connections / name · status") is one 48 px line: the status pill ran 77–130 px past the window; T033's note: the sticky header took 152 of 256 px at 400 % (320 × 256) | the pill wraps (height auto, radius 12) and "Your connections" may wrap; the header sticks only in windows ≥ 320 CSS px wide **and** ≥ 480 px tall (the wizard footer's rule), otherwise it scrolls away (WCAG 1.4.10); changes the 1440 frame: no |
| L3 wizard shell (T033) | `components/WizardLayout/index.tsx` | with the header no longer sticky in short windows, `--wizard-sticky-top` still counted its height | counts the header only while it sticks (`isSticky(header)`) |
| L3 step line (T032) | `components/WizardProgress/index.tsx` | "Next: Documents" ran 65 px past the window; the edit flow's four step buttons 90 px | the bar takes its own row between the two texts; the edit flow's steps stack |
| S4 overview rows (T044) | `pages/FormConnectionList/constants.ts` | the row's actions (`shrink-0`) were wider than the list card: "Edit" and the bin scrolled sideways inside the list (247 > 111) | status, date and actions `max-w-full` (their buttons wrap); no change at 1440 (they fit) |
| S4/S15 status pill (T019) | `components/ConnectionStatusBadge/index.tsx` | "Deactivated" (111 px) in a 79 px row | `max-w-full`; under 320 CSS px its label wraps and the pill grows |
| S5 offer (T045) | `components/LocalDraftsOffer/LocalDraftItem.tsx` | "Discard" and "Resume editing" side by side: 153 px past the window | `flex-wrap` (no change where they fit) |
| L3/S6/S8/S9 toasts (T036) | `components/Toast/index.tsx`, `constants.ts`, `ToastMessage.tsx` | the failed-save toast (text, error ID, "Try again") was 440 px tall in a 320 px window, half of it above the window; a toast with an action (stays until used) covered the page's last controls, "Set rules" under "Personal ID removed. Undo" (the footer doesn't stick in such a window) | under 320 CSS px the toast region is `sticky` at the bottom (it keeps a place of its own at the end of the page, so at the end it covers nothing), the action wraps under the text and a long toast scrolls in half the window |
| S7 step 1 (T049) | `pages/FormConnectionEditor/ConnectionStep.tsx` | the card head's icon tile beside the title left 24 px for "Which service are you connecting?" | the tile above the title |
| S9 rules, S15 summary (T024, T025) | `components/RuleRow/index.tsx`, `components/GroupFrame/GroupHeader.tsx` | the ⋯ (and the branch mark) beside the text left 29 px for a rule in a sub-group; "Changed here" / "Removed here" ran 11–19 px past the left edge | the mark and the actions take a line under the text, right-aligned, and wrap |
| S10 rule editor (T061) | `RulesStep/RuleEditor/ChoiceMenu.tsx`, `constants.ts`, `Picker.tsx`, `ConditionFields.tsx`, `EditorActions.tsx` | a menu with a note ("Only documents you added are listed.") squeezed its list to 0 px (the options unreachable) and the note out of the box; the "Text to compare with" field's `min-w-140` ran 25 px past the window; a menu across the editor kept 24 px insets (43 px wide); "Driving licence" one letter per line in its picker; "Save rule" one letter per line beside "Discard rule" | the whole menu scrolls (the list doesn't shrink); `narrow:min-w-0`; menus across the editor span it; a picker's label takes its own line under the icons; the editor's actions wrap |
| S10 values picker (T027) | `components/ValuesPicker/index.tsx`, `constants.ts` | **at every width**: when the editor opens the picker itself (after the check is chosen) it used the unmeasured default (beside the field, 300 px): at 160 CSS px it ran 185 px past the window; at 320 @ 200 % its list squeezed as the ChoiceMenu's | measured with `placementFrom()` whenever it opens (a layout effect, before it shows), as a click opens it (CLAUDE.md "Popups"); under 320 CSS px the whole menu scrolls and spans the editor |
| S13 test step (T071, T072) | `TestStep/ResultTable.tsx`, `ResultRow.tsx`, `PersonaChip.tsx`, `GenerateAllButton.tsx`, `DateOfBirthField.tsx` | the result table's two columns left 10 px for the rule (one letter per line); the persona chips (`nowrap`) were cut by the panel; the "Edit data" dialog's two 140 px fields scrolled the dialog sideways (152 > 113) | the message cell stacks under its rule (the table stays a table: Chromium's tree keeps 2 column headers and 4 cells); chips and "Generate all" `max-w-full`, the chip's name wraps; the two fields stack |
| S15/S16 details (T078, T079) | `pages/FormConnectionDetail/StatusBand.tsx`, `DetailAccordion.tsx` | the band's h1 one letter per line beside the icon and the ⋯; the ⋯ menu, placed across (`full`), took the 48 px actions box as its frame (16 px wide); "Hide summary" (`shrink-0`) and the summary's body (an `auto` grid track sized to its content: 234 px) ran past the window | the text and the actions take rows of their own, the actions box is `static` so the menu spans the band; the accordion's toggle `max-w-full` and its grid track `minmax(0, 1fr)` (no change at 1440) |

Data: on `designer` the agent's own "T096 …" connections (`seed8.py T096`), stored drafts
(`seed9.py draft`, two to publish, one without rules, four with one kind of finding each, one with
an empty variant), the drafts the flows saved ("T096 toast …"); on `p9-consent`, `p9-account`,
`p9-approval` the `seed9.py` clients, agents, a token, connections, drafts and approval requests
(fresh ones just before S21, they expire after 10 minutes). All deleted afterwards (`seed9.py
cleanup T096` on the four accounts; no "T096" connection or agent access left; the six seeded
connections of `designer` only read, never saved). The OAuth clients registered by `seed9.py`
stay (no delete). Gates after the fixes: `npm run lint && npm test && npm run build` pass (rules
2351, frontend 969, mcp 408 tests, as after T095).

**The matrix** (the final run; every row after the fixes):

**Result**: 450 rows (223 states at 1440 and at 320 @ 200 %, plus L1 at about 1280 and 1000 px), 0
fail after the fixes above; 64 rows have a dialog or menu that scrolls inside at 320 @ 200 % (its
content stays reachable). L4 is covered by S15 and S16; L2, which has no States line, by its menu
(on the overview and in a flow), the scrolled header and the long name (S15). The states the stack
can't make are routed and say so: expired, cancelled and another member's approval requests, the
empty account page, the long names, the 5xx / 404 / 409 answers, slow answers for the loading and
working states, a blocked `localStorage`, and the workers' module blocked for "generation failed".
Before the final run the same scripts found the failures of the fix table (at 320 @ 200 % only,
except the values picker's placement); the rows are the final run's (16:42–17:04) and two
supplementary scripts' (`extra.mjs`, `extra2.mjs`, 17:05–17:15).

**Not reached as screenshots** (no row; each is behaviour that another check covers, or the
browser's own UI): S9 "undo-able names" and "Standard's delete-group dialog naming variants" (the
delete-group dialog and a refused name are rows; the seeded data has no group in a draft with
variants); S11 "an inherited group dissolving" (W12, covered by `branches.test.ts`); S13 "class
dates coming back, group members, the name kept, arrow keys, focus" (W14: behaviour, T075 and
T095); S17 "focus returned to the opener" and S19 "allow and deny with the redirect" (T095's
keyboard walk; the redirect leaves the app); L3 "the Leave site? warning" (the browser's own
dialog: needs a person, T054).

| route | state | width | horizontal_scroll | hidden_content | result |
|---|---|---|---|---|---|
| `/login` | L1 about 1280 px | 1280 | no | none (the login art slides 94 px past the left edge by design (U02 #12, T034)) | pass |
| `/forgot-password` | L1 about 1280 px | 1280 | no | none (the login art slides 94 px past the left edge by design (U02 #12, T034)) | pass |
| `/login` | L1 about 1000 px | 1000 | no | none | pass |
| `/forgot-password` | L1 about 1000 px | 1000 | no | none | pass |
| `/login` | S1 default (L1) | 1440 | no | none | pass |
| `/login` | S1 filled | 1440 | no | none | pass |
| `/login` | S1 password shown (toggle pressed) | 1440 | no | none | pass |
| `/login` | S1 failed sign-in (alert, both fields invalid) | 1440 | no | none | pass |
| `/login` | S1 server error with error ID | 1440 | no | none | pass |
| `/login` | S1 request running ("Log in" busy) | 1440 | no | none | pass |
| `/` | S1 after sign-in: loading frame "Loading your connections…" | 1440 | no | none | pass |
| `/login` | S1 after signing out: "You’re logged out." toast | 1440 | no | none | pass |
| `/forgot-password` | S2 default (L1) | 1440 | no | none | pass |
| `/login` | S1 default (L1) | 320 @ 200 % | no | none | pass |
| `/login` | S1 filled | 320 @ 200 % | no | none | pass |
| `/login` | S1 password shown (toggle pressed) | 320 @ 200 % | no | none | pass |
| `/login` | S1 failed sign-in (alert, both fields invalid) | 320 @ 200 % | no | none | pass |
| `/login` | S1 server error with error ID | 320 @ 200 % | no | none | pass |
| `/login` | S1 request running ("Log in" busy) | 320 @ 200 % | no | none | pass |
| `/` | S1 after sign-in: loading frame "Loading your connections…" | 320 @ 200 % | no | none | pass |
| `/login` | S1 after signing out: "You’re logged out." toast | 320 @ 200 % | no | none | pass |
| `/forgot-password` | S2 default (L1) | 320 @ 200 % | no | none | pass |
| `/` | S4 published, deactivated and draft rows | 1440 | no | none | pass |
| `/` | L2 account menu open | 1440 | no | none | pass |
| `/` | L2 content scrolled under the header (header white) | 1440 | no | none | pass |
| `/` | S4 search without results | 1440 | no | none | pass |
| `/` | S4 search with results ("3 of 6") | 1440 | no | none | pass |
| `/` | S4 / S17 delete dialog (draft row) | 1440 | no | none | pass |
| `/` | S4 / S17 delete dialog (published row) | 1440 | no | none | pass |
| `/` | S17 edit entry dialog "Edit “<name>”?" from a row | 1440 | no | none | pass |
| `/` | S4 long name and description (routed) | 1440 | no | none | pass |
| `/` | S4 loading (skeleton rows) | 1440 | no | none | pass |
| `/` | S4 / S22 error state with error ID and "Try again" | 1440 | no | none | pass |
| `/` | S3 welcome page (routed empty list) | 1440 | no | none | pass |
| `/` | S5 offer, one draft (on S4) | 1440 | no | none | pass |
| `/` | S5 offer, several drafts (on S4) | 1440 | no | none | pass |
| `/` | S3 welcome page with the offer above it (S5) | 1440 | no | none | pass |
| `/form-connections/new` | S5 offer above step 1 | 1440 | no | none | pass |
| `/` | S5 offer after another tab discarded one (heading form) | 1440 | no | none | pass |
| `/` | S5 discard dialog | 1440 | no | none | pass |
| `/` | S5 after discarding (status, focus on the h1) | 1440 | no | none | pass |
| `/` | S4 after-save toast "Draft saved. …" | 1440 | no | none | pass |
| `/form-connections/new` | S5 blocked storage: step 1 without local drafts (silent) | 1440 | no | none | pass |
| `/` | S5 blocked storage: overview without the offer | 1440 | no | none | pass |
| `/` | S4 published, deactivated and draft rows | 320 @ 200 % | no | none | pass |
| `/` | L2 account menu open | 320 @ 200 % | no | none (dialog or menu scrolls inside) | pass |
| `/` | L2 content scrolled under the header (header white) | 320 @ 200 % | no | none | pass |
| `/` | S4 search without results | 320 @ 200 % | no | none | pass |
| `/` | S4 search with results ("3 of 6") | 320 @ 200 % | no | none | pass |
| `/` | S4 / S17 delete dialog (draft row) | 320 @ 200 % | no | none (dialog or menu scrolls inside) | pass |
| `/` | S4 / S17 delete dialog (published row) | 320 @ 200 % | no | none (dialog or menu scrolls inside) | pass |
| `/` | S17 edit entry dialog "Edit “<name>”?" from a row | 320 @ 200 % | no | none (dialog or menu scrolls inside) | pass |
| `/` | S4 long name and description (routed) | 320 @ 200 % | no | none | pass |
| `/` | S4 loading (skeleton rows) | 320 @ 200 % | no | none | pass |
| `/` | S4 / S22 error state with error ID and "Try again" | 320 @ 200 % | no | none | pass |
| `/` | S3 welcome page (routed empty list) | 320 @ 200 % | no | none | pass |
| `/` | S5 offer, one draft (on S4) | 320 @ 200 % | no | none | pass |
| `/` | S5 offer, several drafts (on S4) | 320 @ 200 % | no | none | pass |
| `/` | S3 welcome page with the offer above it (S5) | 320 @ 200 % | no | none | pass |
| `/form-connections/new` | S5 offer above step 1 | 320 @ 200 % | no | none | pass |
| `/` | S5 offer after another tab discarded one (heading form) | 320 @ 200 % | no | none | pass |
| `/` | S5 discard dialog | 320 @ 200 % | no | none (dialog or menu scrolls inside) | pass |
| `/` | S5 after discarding (status, focus on the h1) | 320 @ 200 % | no | none | pass |
| `/` | S4 after-save toast "Draft saved. …" | 320 @ 200 % | no | none | pass |
| `/form-connections/new` | S5 blocked storage: step 1 without local drafts (silent) | 320 @ 200 % | no | none | pass |
| `/` | S5 blocked storage: overview without the offer | 320 @ 200 % | no | none | pass |
| `/form-connections/new` | S7 empty (L3 creating, step 1) | 1440 | no | none | pass |
| `/form-connections/new` | S7 the name ⓘ’s bubble (T049) | 1440 | no | none | pass |
| `/form-connections/new` | S7 missing name "Enter a name for the connection." (C7) | 1440 | no | none | pass |
| `/form-connections/new` | S7 too-long name and description (W10) | 1440 | no | none | pass |
| `/form-connections/new` | S7 the API’s 400 message (W10) | 1440 | no | none | pass |
| `/form-connections/new` | S6 leave dialog "Leave this connection?" | 1440 | no | none | pass |
| `/form-connections/new` | L2 account menu open in a flow | 1440 | no | none | pass |
| `/form-connections/new` | S6 log-out dialog "Save before you log out?" | 1440 | no | none | pass |
| `/form-connections/new` | S6 / L3 failed save: toast with "Try again" and the error ID | 1440 | no | none | pass |
| `/form-connections/new` | S6 / L3 saving: "Saving…" aria-disabled, "Saving draft…" | 1440 | no | none | pass |
| `/form-connections/new` | S8 no document (empty panel) | 1440 | no | none | pass |
| `/form-connections/new` | S8 "Set rules" aria-disabled with "Add a document first" | 1440 | no | none | pass |
| `/form-connections/new` | S8 the search card without a match | 1440 | no | none | pass |
| `/form-connections/new` | S8 the search card open ("Available") | 1440 | no | none | pass |
| `/form-connections/new` | S8 a document added | 1440 | no | none | pass |
| `/form-connections/new` | S8 two documents | 1440 | no | none | pass |
| `/form-connections/new` | S8 hover on a document (the trash) | 1440 | no | none | pass |
| `/form-connections/new` | S8 removal confirmation "Remove Personal ID?" | 1440 | no | none | pass |
| `/form-connections/new` | S8 undo toast "Personal ID removed." | 1440 | no | none | pass |
| `/form-connections/new` | S8 no data dialog "No data selected in 1 document" | 1440 | no | none | pass |
| `/form-connections/new` | S8 "1 document needs data" with the line | 1440 | no | none | pass |
| `/form-connections/be5e271b-c42e-43bd-9a5c-0a9a98f43a60/edit` | L3 creating a stored draft (Draft badge), documents step | 1440 | no | none | pass |
| `/form-connections/be5e271b-c42e-43bd-9a5c-0a9a98f43a60/edit` | S8 removal of a document that rules use (dialog naming the rules) | 1440 | no | none | pass |
| `/form-connections/be5e271b-c42e-43bd-9a5c-0a9a98f43a60/edit` | L3 stored draft on step 1 (Draft badge) | 1440 | no | none | pass |
| `/form-connections/be5e271b-c42e-43bd-9a5c-0a9a98f43a60/edit` | S8 data the catalog no longer offers (W6 warning with "Remove it") | 1440 | no | none | pass |
| `/form-connections/be5e271b-c42e-43bd-9a5c-0a9a98f43a60/edit` | S6 conflict on save: draft_changed | 1440 | no | none | pass |
| `/form-connections/be5e271b-c42e-43bd-9a5c-0a9a98f43a60/edit` | S6 conflict on save: draft_published | 1440 | no | none | pass |
| `/form-connections/be5e271b-c42e-43bd-9a5c-0a9a98f43a60/edit` | S6 conflict on save: draft_deleted | 1440 | no | none | pass |
| `/form-connections/be5e271b-c42e-43bd-9a5c-0a9a98f43a60/edit` | S6 restore dialog "Restore your unsaved changes?" | 1440 | no | none | pass |
| `/form-connections/be5e271b-c42e-43bd-9a5c-0a9a98f43a60/edit` | S6 / L3 loading a flow (W10 skeleton) | 1440 | no | none | pass |
| `/form-connections/be5e271b-c42e-43bd-9a5c-0a9a98f43a60/edit` | S6 / L3 load error with the error ID (W10) | 1440 | no | none | pass |
| `/get-started` | S6 first-connection flow, step 1 | 1440 | no | none | pass |
| `/get-started` | S6 first-connection flow: validation | 1440 | no | none | pass |
| `/get-started` | S6 first-connection flow reopened from a bookmark (W11) | 1440 | no | none | pass |
| `/get-started → /` | S6 bookmark while connections exist: the overview (W11) | 1440 | no | none | pass |
| `/form-connections/new` | S7 empty (L3 creating, step 1) | 320 @ 200 % | no | none | pass |
| `/form-connections/new` | S7 the name ⓘ’s bubble (T049) | 320 @ 200 % | no | none | pass |
| `/form-connections/new` | S7 missing name "Enter a name for the connection." (C7) | 320 @ 200 % | no | none | pass |
| `/form-connections/new` | S7 too-long name and description (W10) | 320 @ 200 % | no | none | pass |
| `/form-connections/new` | S7 the API’s 400 message (W10) | 320 @ 200 % | no | none | pass |
| `/form-connections/new` | S6 leave dialog "Leave this connection?" | 320 @ 200 % | no | none (dialog or menu scrolls inside) | pass |
| `/form-connections/new` | L2 account menu open in a flow | 320 @ 200 % | no | none (dialog or menu scrolls inside) | pass |
| `/form-connections/new` | S6 log-out dialog "Save before you log out?" | 320 @ 200 % | no | none (dialog or menu scrolls inside) | pass |
| `/form-connections/new` | S6 / L3 failed save: toast with "Try again" and the error ID | 320 @ 200 % | no | none | pass |
| `/form-connections/new` | S6 / L3 saving: "Saving…" aria-disabled, "Saving draft…" | 320 @ 200 % | no | none | pass |
| `/form-connections/new` | S8 no document (empty panel) | 320 @ 200 % | no | none | pass |
| `/form-connections/new` | S8 "Set rules" aria-disabled with "Add a document first" | 320 @ 200 % | no | none | pass |
| `/form-connections/new` | S8 the search card without a match | 320 @ 200 % | no | none | pass |
| `/form-connections/new` | S8 the search card open ("Available") | 320 @ 200 % | no | none | pass |
| `/form-connections/new` | S8 a document added | 320 @ 200 % | no | none | pass |
| `/form-connections/new` | S8 two documents | 320 @ 200 % | no | none | pass |
| `/form-connections/new` | S8 hover on a document (the trash) | 320 @ 200 % | no | none | pass |
| `/form-connections/new` | S8 removal confirmation "Remove Personal ID?" | 320 @ 200 % | no | none (dialog or menu scrolls inside) | pass |
| `/form-connections/new` | S8 undo toast "Personal ID removed." | 320 @ 200 % | no | none | pass |
| `/form-connections/new` | S8 no data dialog "No data selected in 1 document" | 320 @ 200 % | no | none (dialog or menu scrolls inside) | pass |
| `/form-connections/new` | S8 "1 document needs data" with the line | 320 @ 200 % | no | none | pass |
| `/form-connections/be5e271b-c42e-43bd-9a5c-0a9a98f43a60/edit` | L3 creating a stored draft (Draft badge), documents step | 320 @ 200 % | no | none | pass |
| `/form-connections/be5e271b-c42e-43bd-9a5c-0a9a98f43a60/edit` | S8 removal of a document that rules use (dialog naming the rules) | 320 @ 200 % | no | none (dialog or menu scrolls inside) | pass |
| `/form-connections/be5e271b-c42e-43bd-9a5c-0a9a98f43a60/edit` | L3 stored draft on step 1 (Draft badge) | 320 @ 200 % | no | none | pass |
| `/form-connections/be5e271b-c42e-43bd-9a5c-0a9a98f43a60/edit` | S8 data the catalog no longer offers (W6 warning with "Remove it") | 320 @ 200 % | no | none | pass |
| `/form-connections/be5e271b-c42e-43bd-9a5c-0a9a98f43a60/edit` | S6 conflict on save: draft_changed | 320 @ 200 % | no | none (dialog or menu scrolls inside) | pass |
| `/form-connections/be5e271b-c42e-43bd-9a5c-0a9a98f43a60/edit` | S6 conflict on save: draft_published | 320 @ 200 % | no | none (dialog or menu scrolls inside) | pass |
| `/form-connections/be5e271b-c42e-43bd-9a5c-0a9a98f43a60/edit` | S6 conflict on save: draft_deleted | 320 @ 200 % | no | none (dialog or menu scrolls inside) | pass |
| `/form-connections/be5e271b-c42e-43bd-9a5c-0a9a98f43a60/edit` | S6 restore dialog "Restore your unsaved changes?" | 320 @ 200 % | no | none (dialog or menu scrolls inside) | pass |
| `/form-connections/be5e271b-c42e-43bd-9a5c-0a9a98f43a60/edit` | S6 / L3 loading a flow (W10 skeleton) | 320 @ 200 % | no | none | pass |
| `/form-connections/be5e271b-c42e-43bd-9a5c-0a9a98f43a60/edit` | S6 / L3 load error with the error ID (W10) | 320 @ 200 % | no | none | pass |
| `/get-started` | S6 first-connection flow, step 1 | 320 @ 200 % | no | none | pass |
| `/get-started` | S6 first-connection flow: validation | 320 @ 200 % | no | none | pass |
| `/get-started` | S6 first-connection flow reopened from a bookmark (W11) | 320 @ 200 % | no | none | pass |
| `/get-started → /` | S6 bookmark while connections exist: the overview (W11) | 320 @ 200 % | no | none | pass |
| `/form-connections/new` | S9 no rules | 1440 | no | none | pass |
| `/form-connections/new` | S10 new rule (empty editor) | 1440 | no | none | pass |
| `/form-connections/new` | S10 "Save rule" aria-disabled with its explanation (W21) | 1440 | no | none | pass |
| `/form-connections/76abafb6-2963-45dc-a0bc-14019c54f62e/edit` | S9 rules, groups, a sub-group and a group message | 1440 | no | none | pass |
| `/form-connections/76abafb6-2963-45dc-a0bc-14019c54f62e/edit` | S9 the pinned head and tabs while scrolling | 1440 | no | none | pass |
| `/form-connections/76abafb6-2963-45dc-a0bc-14019c54f62e/edit` | S9 a group’s menu (⋯) | 1440 | no | none | pass |
| `/form-connections/76abafb6-2963-45dc-a0bc-14019c54f62e/edit` | S9 delete-group dialog | 1440 | no | none | pass |
| `/form-connections/76abafb6-2963-45dc-a0bc-14019c54f62e/edit` | S9 a rule’s menu (⋯) | 1440 | no | none | pass |
| `/form-connections/76abafb6-2963-45dc-a0bc-14019c54f62e/edit` | S9 the AND/OR menu | 1440 | no | none | pass |
| `/form-connections/76abafb6-2963-45dc-a0bc-14019c54f62e/edit` | S9 the switched top-level AND/OR and its note (W12) | 1440 | no | none | pass |
| `/form-connections/76abafb6-2963-45dc-a0bc-14019c54f62e/edit` | S9 a refused name (taken) with the focus kept | 1440 | no | none | pass |
| `/form-connections/76abafb6-2963-45dc-a0bc-14019c54f62e/edit` | S10 editing a rule inside a sub-group | 1440 | no | none | pass |
| `/form-connections/be5e271b-c42e-43bd-9a5c-0a9a98f43a60/edit` | S9 rules (stored draft, two top-level rules) | 1440 | no | none | pass |
| `/form-connections/be5e271b-c42e-43bd-9a5c-0a9a98f43a60/edit` | S9 select mode at the top level (one rule ticked) | 1440 | no | none | pass |
| `/form-connections/be5e271b-c42e-43bd-9a5c-0a9a98f43a60/edit` | S9 select mode with two rules ticked ("Group rules") | 1440 | no | none | pass |
| `/form-connections/be5e271b-c42e-43bd-9a5c-0a9a98f43a60/edit` | S9 grouped (toast) | 1440 | no | none | pass |
| `/form-connections/be5e271b-c42e-43bd-9a5c-0a9a98f43a60/edit` | S9 select mode inside a group | 1440 | no | none | pass |
| `/form-connections/be5e271b-c42e-43bd-9a5c-0a9a98f43a60/edit` | S9 delete-rule dialog | 1440 | no | none | pass |
| `/form-connections/be5e271b-c42e-43bd-9a5c-0a9a98f43a60/edit` | S9 a rule deleted with "Undo" (toast) | 1440 | no | none | pass |
| `/form-connections/be5e271b-c42e-43bd-9a5c-0a9a98f43a60/edit` | S9 a rule whose data is no longer requested | 1440 | no | none | pass |
| `/form-connections/be5e271b-c42e-43bd-9a5c-0a9a98f43a60/edit` | S9 saving failed (toast with the error ID) | 1440 | no | none | pass |
| `/form-connections/be5e271b-c42e-43bd-9a5c-0a9a98f43a60/edit?step=rules&variant=…` | S9 deep-link notice: the variant no longer exists (W15) | 1440 | no | none | pass |
| `/form-connections/be5e271b-c42e-43bd-9a5c-0a9a98f43a60/edit?step=rules&variant=main&item=…` | S9 deep-link notice: the rule or group no longer exists (W15) | 1440 | no | none | pass |
| `/form-connections/be5e271b-c42e-43bd-9a5c-0a9a98f43a60/edit` | S10 the data menu open | 1440 | no | none | pass |
| `/form-connections/be5e271b-c42e-43bd-9a5c-0a9a98f43a60/edit` | S10 condition: text (with "Match letter case") | 1440 | no | none | pass |
| `/form-connections/be5e271b-c42e-43bd-9a5c-0a9a98f43a60/edit` | S10 errors (a value missing) | 1440 | no | none | pass |
| `/form-connections/be5e271b-c42e-43bd-9a5c-0a9a98f43a60/edit` | S10 the message edited | 1440 | no | none | pass |
| `/form-connections/be5e271b-c42e-43bd-9a5c-0a9a98f43a60/edit` | S10 the checks menu open | 1440 | no | none (dialog or menu scrolls inside) | pass |
| `/form-connections/be5e271b-c42e-43bd-9a5c-0a9a98f43a60/edit` | S10 condition: age | 1440 | no | none | pass |
| `/form-connections/be5e271b-c42e-43bd-9a5c-0a9a98f43a60/edit` | S10 condition: date (expiry) | 1440 | no | none | pass |
| `/form-connections/be5e271b-c42e-43bd-9a5c-0a9a98f43a60/edit` | S10 the part menu open (with its search field) | 1440 | no | none (dialog or menu scrolls inside) | pass |
| `/form-connections/be5e271b-c42e-43bd-9a5c-0a9a98f43a60/edit` | S10 the values picker open (the editor opens it after the check) | 1440 | no | none | pass |
| `/form-connections/be5e271b-c42e-43bd-9a5c-0a9a98f43a60/edit` | S10 condition: licence classes with its part | 1440 | no | none | pass |
| `/form-connections/new` | S9 no rules | 320 @ 200 % | no | none | pass |
| `/form-connections/new` | S10 new rule (empty editor) | 320 @ 200 % | no | none | pass |
| `/form-connections/new` | S10 "Save rule" aria-disabled with its explanation (W21) | 320 @ 200 % | no | none | pass |
| `/form-connections/76abafb6-2963-45dc-a0bc-14019c54f62e/edit` | S9 rules, groups, a sub-group and a group message | 320 @ 200 % | no | none | pass |
| `/form-connections/76abafb6-2963-45dc-a0bc-14019c54f62e/edit` | S9 the pinned head and tabs while scrolling | 320 @ 200 % | no | none | pass |
| `/form-connections/76abafb6-2963-45dc-a0bc-14019c54f62e/edit` | S9 a group’s menu (⋯) | 320 @ 200 % | no | none | pass |
| `/form-connections/76abafb6-2963-45dc-a0bc-14019c54f62e/edit` | S9 delete-group dialog | 320 @ 200 % | no | none (dialog or menu scrolls inside) | pass |
| `/form-connections/76abafb6-2963-45dc-a0bc-14019c54f62e/edit` | S9 a rule’s menu (⋯) | 320 @ 200 % | no | none | pass |
| `/form-connections/76abafb6-2963-45dc-a0bc-14019c54f62e/edit` | S9 the AND/OR menu | 320 @ 200 % | no | none (dialog or menu scrolls inside) | pass |
| `/form-connections/76abafb6-2963-45dc-a0bc-14019c54f62e/edit` | S9 the switched top-level AND/OR and its note (W12) | 320 @ 200 % | no | none | pass |
| `/form-connections/76abafb6-2963-45dc-a0bc-14019c54f62e/edit` | S9 a refused name (taken) with the focus kept | 320 @ 200 % | no | none | pass |
| `/form-connections/76abafb6-2963-45dc-a0bc-14019c54f62e/edit` | S10 editing a rule inside a sub-group | 320 @ 200 % | no | none | pass |
| `/form-connections/be5e271b-c42e-43bd-9a5c-0a9a98f43a60/edit` | S9 rules (stored draft, two top-level rules) | 320 @ 200 % | no | none | pass |
| `/form-connections/be5e271b-c42e-43bd-9a5c-0a9a98f43a60/edit` | S9 select mode at the top level (one rule ticked) | 320 @ 200 % | no | none | pass |
| `/form-connections/be5e271b-c42e-43bd-9a5c-0a9a98f43a60/edit` | S9 select mode with two rules ticked ("Group rules") | 320 @ 200 % | no | none | pass |
| `/form-connections/be5e271b-c42e-43bd-9a5c-0a9a98f43a60/edit` | S9 grouped (toast) | 320 @ 200 % | no | none | pass |
| `/form-connections/be5e271b-c42e-43bd-9a5c-0a9a98f43a60/edit` | S9 select mode inside a group | 320 @ 200 % | no | none | pass |
| `/form-connections/be5e271b-c42e-43bd-9a5c-0a9a98f43a60/edit` | S9 delete-rule dialog | 320 @ 200 % | no | none (dialog or menu scrolls inside) | pass |
| `/form-connections/be5e271b-c42e-43bd-9a5c-0a9a98f43a60/edit` | S9 a rule deleted with "Undo" (toast) | 320 @ 200 % | no | none | pass |
| `/form-connections/be5e271b-c42e-43bd-9a5c-0a9a98f43a60/edit` | S9 a rule whose data is no longer requested | 320 @ 200 % | no | none | pass |
| `/form-connections/be5e271b-c42e-43bd-9a5c-0a9a98f43a60/edit` | S9 saving failed (toast with the error ID) | 320 @ 200 % | no | none | pass |
| `/form-connections/be5e271b-c42e-43bd-9a5c-0a9a98f43a60/edit?step=rules&variant=…` | S9 deep-link notice: the variant no longer exists (W15) | 320 @ 200 % | no | none | pass |
| `/form-connections/be5e271b-c42e-43bd-9a5c-0a9a98f43a60/edit?step=rules&variant=main&item=…` | S9 deep-link notice: the rule or group no longer exists (W15) | 320 @ 200 % | no | none | pass |
| `/form-connections/be5e271b-c42e-43bd-9a5c-0a9a98f43a60/edit` | S10 the data menu open | 320 @ 200 % | no | none | pass |
| `/form-connections/be5e271b-c42e-43bd-9a5c-0a9a98f43a60/edit` | S10 condition: text (with "Match letter case") | 320 @ 200 % | no | none | pass |
| `/form-connections/be5e271b-c42e-43bd-9a5c-0a9a98f43a60/edit` | S10 errors (a value missing) | 320 @ 200 % | no | none | pass |
| `/form-connections/be5e271b-c42e-43bd-9a5c-0a9a98f43a60/edit` | S10 the message edited | 320 @ 200 % | no | none | pass |
| `/form-connections/be5e271b-c42e-43bd-9a5c-0a9a98f43a60/edit` | S10 the checks menu open | 320 @ 200 % | no | none | pass |
| `/form-connections/be5e271b-c42e-43bd-9a5c-0a9a98f43a60/edit` | S10 condition: age | 320 @ 200 % | no | none | pass |
| `/form-connections/be5e271b-c42e-43bd-9a5c-0a9a98f43a60/edit` | S10 condition: date (expiry) | 320 @ 200 % | no | none | pass |
| `/form-connections/be5e271b-c42e-43bd-9a5c-0a9a98f43a60/edit` | S10 the part menu open (with its search field) | 320 @ 200 % | no | none | pass |
| `/form-connections/be5e271b-c42e-43bd-9a5c-0a9a98f43a60/edit` | S10 the values picker open (the editor opens it after the check) | 320 @ 200 % | no | none | pass |
| `/form-connections/be5e271b-c42e-43bd-9a5c-0a9a98f43a60/edit` | S10 condition: licence classes with its part | 320 @ 200 % | no | none | pass |
| `/form-connections/aae1b881-eac2-41ff-96f5-5a83a38d633d/edit` | S11 two variants (tabs), Standard selected, a redundant finding (S12) | 1440 | no | none | pass |
| `/form-connections/aae1b881-eac2-41ff-96f5-5a83a38d633d/edit` | S11 a variant with a changed rule ("Changed here") and the link strip | 1440 | no | none | pass |
| `/form-connections/aae1b881-eac2-41ff-96f5-5a83a38d633d/edit` | S11 a variant with an added rule ("Added here") | 1440 | no | none | pass |
| `/form-connections/aae1b881-eac2-41ff-96f5-5a83a38d633d/edit` | S11 a variant’s menu (⋯) | 1440 | no | none | pass |
| `/form-connections/aae1b881-eac2-41ff-96f5-5a83a38d633d/edit` | S11 the dialog: new variant | 1440 | no | none | pass |
| `/form-connections/aae1b881-eac2-41ff-96f5-5a83a38d633d/edit` | S11 the dialog: name missing | 1440 | no | none | pass |
| `/form-connections/aae1b881-eac2-41ff-96f5-5a83a38d633d/edit` | S11 the dialog: name taken | 1440 | no | none | pass |
| `/form-connections/aae1b881-eac2-41ff-96f5-5a83a38d633d/edit` | S11 the dialog: edit a variant | 1440 | no | none | pass |
| `/form-connections/aae1b881-eac2-41ff-96f5-5a83a38d633d/edit` | S11 renaming Standard | 1440 | no | none | pass |
| `/form-connections/aae1b881-eac2-41ff-96f5-5a83a38d633d/edit` | S11 the "Copy to variant" popover | 1440 | no | none | pass |
| `/form-connections/aae1b881-eac2-41ff-96f5-5a83a38d633d/edit` | S11 deleting a rule of Standard that variants inherit (dialog) | 1440 | no | none | pass |
| `/form-connections/aae1b881-eac2-41ff-96f5-5a83a38d633d/edit` | S11 propagation: Standard removed a rule, the variant follows (W12) | 1440 | no | none | pass |
| `/form-connections/aae1b881-eac2-41ff-96f5-5a83a38d633d/edit` | S11 an inherited rule removed in a variant (removed item) | 1440 | no | none | pass |
| `/form-connections/aae1b881-eac2-41ff-96f5-5a83a38d633d/edit` | S11 delete-variant dialog | 1440 | no | none | pass |
| `/form-connections/aae1b881-eac2-41ff-96f5-5a83a38d633d/edit` | S11 a deleted variant with "Undo" (toast) | 1440 | no | none | pass |
| `/form-connections/be5e271b-c42e-43bd-9a5c-0a9a98f43a60/edit` | S11 / S12 no variant, no findings | 1440 | no | none | pass |
| `/form-connections/bcdf1fe3-f8d2-484a-a572-00b4d78938c3/edit` | S12 redundant only | 1440 | no | none | pass |
| `/form-connections/8fe260f6-475a-411d-a401-dd7311a39649/edit` | S12 today-only conflict | 1440 | no | none | pass |
| `/form-connections/156d163f-2e5a-4478-ad44-2c1af39e7de6/edit` | S12 duplicates only | 1440 | no | none | pass |
| `/form-connections/3a84a4a7-40eb-46f8-b203-130dfa5cbe4e/edit` | S12 an unselected tab with the findings icon | 1440 | no | none | pass |
| `/form-connections/3a84a4a7-40eb-46f8-b203-130dfa5cbe4e/edit` | S12 the tab icon’s tooltip | 1440 | no | none | pass |
| `/form-connections/3a84a4a7-40eb-46f8-b203-130dfa5cbe4e/edit` | S12 conflict (banner, notes, outlines) in a variant | 1440 | no | none | pass |
| `/form-connections/fe31b4c7-c3c1-4a66-86de-7dc6f87166db/edit` | S12 conflict and duplicates (published connection, edit flow) | 1440 | no | none | pass |
| `/form-connections/be5e271b-c42e-43bd-9a5c-0a9a98f43a60/edit` | S13 loading (first open, skeletons) | 1440 | no | none | pass |
| `/form-connections/be5e271b-c42e-43bd-9a5c-0a9a98f43a60/edit` | S13 a persona (default selection) | 1440 | no | none | pass |
| `/form-connections/be5e271b-c42e-43bd-9a5c-0a9a98f43a60/edit` | S13 met | 1440 | no | none | pass |
| `/form-connections/be5e271b-c42e-43bd-9a5c-0a9a98f43a60/edit` | S13 not met | 1440 | no | none | pass |
| `/form-connections/be5e271b-c42e-43bd-9a5c-0a9a98f43a60/edit` | S13 the edit dialog | 1440 | no | none | pass |
| `/form-connections/be5e271b-c42e-43bd-9a5c-0a9a98f43a60/edit` | S13 the edit dialog with an error | 1440 | no | none | pass |
| `/form-connections/be5e271b-c42e-43bd-9a5c-0a9a98f43a60/edit` | S13 couldn’t be checked (fields cleared) | 1440 | no | none | pass |
| `/form-connections/be5e271b-c42e-43bd-9a5c-0a9a98f43a60/edit` | S13 the regeneration question (changed data) | 1440 | no | none | pass |
| `/form-connections/be5e271b-c42e-43bd-9a5c-0a9a98f43a60/edit` | S13 one persona regenerating (ring, test-day line) | 1440 | no | none | pass |
| `/form-connections/be5e271b-c42e-43bd-9a5c-0a9a98f43a60/edit` | S13 the "Generate all" dialog | 1440 | no | none | pass |
| `/form-connections/b17d4704-2dfe-4812-bbf0-abb21efa1389/edit` | S13 a variant without rules | 1440 | no | none | pass |
| `/form-connections/76abafb6-2963-45dc-a0bc-14019c54f62e/edit` | S13 many rules (groups, sub-group) | 1440 | no | none | pass |
| `/form-connections/be5e271b-c42e-43bd-9a5c-0a9a98f43a60/edit` | S13 generation failed (the workers’ module blocked) | 1440 | no | none | pass |
| `/form-connections/aae1b881-eac2-41ff-96f5-5a83a38d633d/edit` | S11 two variants (tabs), Standard selected, a redundant finding (S12) | 320 @ 200 % | no | none | pass |
| `/form-connections/aae1b881-eac2-41ff-96f5-5a83a38d633d/edit` | S11 a variant with a changed rule ("Changed here") and the link strip | 320 @ 200 % | no | none | pass |
| `/form-connections/aae1b881-eac2-41ff-96f5-5a83a38d633d/edit` | S11 a variant with an added rule ("Added here") | 320 @ 200 % | no | none | pass |
| `/form-connections/aae1b881-eac2-41ff-96f5-5a83a38d633d/edit` | S11 a variant’s menu (⋯) | 320 @ 200 % | no | none | pass |
| `/form-connections/aae1b881-eac2-41ff-96f5-5a83a38d633d/edit` | S11 the dialog: new variant | 320 @ 200 % | no | none (dialog or menu scrolls inside) | pass |
| `/form-connections/aae1b881-eac2-41ff-96f5-5a83a38d633d/edit` | S11 the dialog: name missing | 320 @ 200 % | no | none (dialog or menu scrolls inside) | pass |
| `/form-connections/aae1b881-eac2-41ff-96f5-5a83a38d633d/edit` | S11 the dialog: name taken | 320 @ 200 % | no | none (dialog or menu scrolls inside) | pass |
| `/form-connections/aae1b881-eac2-41ff-96f5-5a83a38d633d/edit` | S11 the dialog: edit a variant | 320 @ 200 % | no | none (dialog or menu scrolls inside) | pass |
| `/form-connections/aae1b881-eac2-41ff-96f5-5a83a38d633d/edit` | S11 renaming Standard | 320 @ 200 % | no | none (dialog or menu scrolls inside) | pass |
| `/form-connections/aae1b881-eac2-41ff-96f5-5a83a38d633d/edit` | S11 the "Copy to variant" popover | 320 @ 200 % | no | none | pass |
| `/form-connections/aae1b881-eac2-41ff-96f5-5a83a38d633d/edit` | S11 deleting a rule of Standard that variants inherit (dialog) | 320 @ 200 % | no | none (dialog or menu scrolls inside) | pass |
| `/form-connections/aae1b881-eac2-41ff-96f5-5a83a38d633d/edit` | S11 propagation: Standard removed a rule, the variant follows (W12) | 320 @ 200 % | no | none | pass |
| `/form-connections/aae1b881-eac2-41ff-96f5-5a83a38d633d/edit` | S11 an inherited rule removed in a variant (removed item) | 320 @ 200 % | no | none | pass |
| `/form-connections/aae1b881-eac2-41ff-96f5-5a83a38d633d/edit` | S11 delete-variant dialog | 320 @ 200 % | no | none (dialog or menu scrolls inside) | pass |
| `/form-connections/aae1b881-eac2-41ff-96f5-5a83a38d633d/edit` | S11 a deleted variant with "Undo" (toast) | 320 @ 200 % | no | none | pass |
| `/form-connections/be5e271b-c42e-43bd-9a5c-0a9a98f43a60/edit` | S11 / S12 no variant, no findings | 320 @ 200 % | no | none | pass |
| `/form-connections/bcdf1fe3-f8d2-484a-a572-00b4d78938c3/edit` | S12 redundant only | 320 @ 200 % | no | none | pass |
| `/form-connections/8fe260f6-475a-411d-a401-dd7311a39649/edit` | S12 today-only conflict | 320 @ 200 % | no | none | pass |
| `/form-connections/156d163f-2e5a-4478-ad44-2c1af39e7de6/edit` | S12 duplicates only | 320 @ 200 % | no | none | pass |
| `/form-connections/3a84a4a7-40eb-46f8-b203-130dfa5cbe4e/edit` | S12 an unselected tab with the findings icon | 320 @ 200 % | no | none | pass |
| `/form-connections/3a84a4a7-40eb-46f8-b203-130dfa5cbe4e/edit` | S12 the tab icon’s tooltip | 320 @ 200 % | no | none | pass |
| `/form-connections/3a84a4a7-40eb-46f8-b203-130dfa5cbe4e/edit` | S12 conflict (banner, notes, outlines) in a variant | 320 @ 200 % | no | none | pass |
| `/form-connections/fe31b4c7-c3c1-4a66-86de-7dc6f87166db/edit` | S12 conflict and duplicates (published connection, edit flow) | 320 @ 200 % | no | none | pass |
| `/form-connections/be5e271b-c42e-43bd-9a5c-0a9a98f43a60/edit` | S13 loading (first open, skeletons) | 320 @ 200 % | no | none | pass |
| `/form-connections/be5e271b-c42e-43bd-9a5c-0a9a98f43a60/edit` | S13 a persona (default selection) | 320 @ 200 % | no | none | pass |
| `/form-connections/be5e271b-c42e-43bd-9a5c-0a9a98f43a60/edit` | S13 met | 320 @ 200 % | no | none | pass |
| `/form-connections/be5e271b-c42e-43bd-9a5c-0a9a98f43a60/edit` | S13 not met | 320 @ 200 % | no | none | pass |
| `/form-connections/be5e271b-c42e-43bd-9a5c-0a9a98f43a60/edit` | S13 the edit dialog | 320 @ 200 % | no | none (dialog or menu scrolls inside) | pass |
| `/form-connections/be5e271b-c42e-43bd-9a5c-0a9a98f43a60/edit` | S13 the edit dialog with an error | 320 @ 200 % | no | none (dialog or menu scrolls inside) | pass |
| `/form-connections/be5e271b-c42e-43bd-9a5c-0a9a98f43a60/edit` | S13 couldn’t be checked (fields cleared) | 320 @ 200 % | no | none | pass |
| `/form-connections/be5e271b-c42e-43bd-9a5c-0a9a98f43a60/edit` | S13 the regeneration question (changed data) | 320 @ 200 % | no | none (dialog or menu scrolls inside) | pass |
| `/form-connections/be5e271b-c42e-43bd-9a5c-0a9a98f43a60/edit` | S13 one persona regenerating (ring, test-day line) | 320 @ 200 % | no | none | pass |
| `/form-connections/be5e271b-c42e-43bd-9a5c-0a9a98f43a60/edit` | S13 the "Generate all" dialog | 320 @ 200 % | no | none | pass |
| `/form-connections/b17d4704-2dfe-4812-bbf0-abb21efa1389/edit` | S13 a variant without rules | 320 @ 200 % | no | none | pass |
| `/form-connections/76abafb6-2963-45dc-a0bc-14019c54f62e/edit` | S13 many rules (groups, sub-group) | 320 @ 200 % | no | none | pass |
| `/form-connections/be5e271b-c42e-43bd-9a5c-0a9a98f43a60/edit` | S13 generation failed (the workers’ module blocked) | 320 @ 200 % | no | none | pass |
| `/form-connections/1ec678a8-8731-4097-b8ae-1d2998a07a18/edit` | S14 summary (Standard only) | 1440 | no | none | pass |
| `/form-connections/1ec678a8-8731-4097-b8ae-1d2998a07a18/edit` | S14 failed (alert with the error ID over the summary) | 1440 | no | none | pass |
| `/form-connections/1ec678a8-8731-4097-b8ae-1d2998a07a18/edit` | S14 conflict (draft changed meanwhile) | 1440 | no | none | pass |
| `/form-connections/1ec678a8-8731-4097-b8ae-1d2998a07a18/edit` | S14 publishing ("Publishing…") | 1440 | no | none | pass |
| `/form-connections/1ec678a8-8731-4097-b8ae-1d2998a07a18/edit` | S14 published ("Published. Opening your connection page…") | 1440 | no | none | pass |
| `/form-connections/1ec678a8-8731-4097-b8ae-1d2998a07a18` | S15 active, Links open from the publish dialog | 1440 | no | none | pass |
| `/form-connections/3a84a4a7-40eb-46f8-b203-130dfa5cbe4e/edit` | S14 summary with variants and warnings | 1440 | no | none | pass |
| `/form-connections/6e40c70e-90c0-4470-a435-01cb3416272b/edit` | S14 without rules ("Publish without rules?") | 1440 | no | none | pass |
| `/form-connections/ab29ac43-40ca-4f19-9487-a8d19b6125eb` | S15 active, Summary open from "View" (L4) | 1440 | no | none | pass |
| `/form-connections/ab29ac43-40ca-4f19-9487-a8d19b6125eb` | S15 a variant tab in the summary (Ambulance) | 1440 | no | none | pass |
| `/form-connections/ab29ac43-40ca-4f19-9487-a8d19b6125eb` | S15 a variant tab in the summary (School transport) | 1440 | no | none | pass |
| `/form-connections/ab29ac43-40ca-4f19-9487-a8d19b6125eb` | S15 "✓ Copied" (request link) | 1440 | no | none | pass |
| `/form-connections/ab29ac43-40ca-4f19-9487-a8d19b6125eb` | S15 the "Request link" ⓘ | 1440 | no | none | pass |
| `/form-connections/ab29ac43-40ca-4f19-9487-a8d19b6125eb` | S15 the menu (⋯) | 1440 | no | none | pass |
| `/form-connections/32655494-b73b-4bd1-af5b-62852441616e` | S15 findings on the summary | 1440 | no | none | pass |
| `/form-connections/38045b88-8d88-43ea-b253-77da0638250c` | S15 deactivated (L4) | 1440 | no | none | pass |
| `/form-connections/ab29ac43-40ca-4f19-9487-a8d19b6125eb` | S15 long name, description and URLs (routed) | 1440 | no | none | pass |
| `/form-connections/ab29ac43-40ca-4f19-9487-a8d19b6125eb` | S15 loading (skeletons) | 1440 | no | none | pass |
| `/form-connections/ab29ac43-40ca-4f19-9487-a8d19b6125eb` | S15 / S22 error state with the error ID and the way back | 1440 | no | none | pass |
| `/form-connections/<unknown>` | S15 / S22 deleted or unknown connection (not found, way back) | 1440 | no | none | pass |
| `/form-connections/ab29ac43-40ca-4f19-9487-a8d19b6125eb` | S17 delete dialog (published) | 1440 | no | none | pass |
| `/form-connections/ab29ac43-40ca-4f19-9487-a8d19b6125eb` | S17 working (delete running) | 1440 | no | none | pass |
| `/form-connections/ab29ac43-40ca-4f19-9487-a8d19b6125eb` | S17 a failure with the error ID (delete, 5xx) | 1440 | no | none | pass |
| `/form-connections/ab29ac43-40ca-4f19-9487-a8d19b6125eb` | S17 delete of a connection deleted meanwhile (404, T082) | 1440 | no | none | pass |
| `/form-connections/ab29ac43-40ca-4f19-9487-a8d19b6125eb` | S17 edit entry dialog "Edit “<name>”?" from the details | 1440 | no | none | pass |
| `/form-connections/ab29ac43-40ca-4f19-9487-a8d19b6125eb` | S17 deactivate dialog | 1440 | no | none | pass |
| `/form-connections/ab29ac43-40ca-4f19-9487-a8d19b6125eb` | S17 deactivate failed with the error ID | 1440 | no | none | pass |
| `/form-connections/ab29ac43-40ca-4f19-9487-a8d19b6125eb` | S15 deactivated after "Deactivate" (toast; the Links accordion, T095) | 1440 | no | none | pass |
| `/form-connections/ab29ac43-40ca-4f19-9487-a8d19b6125eb` | S17 reactivate dialog | 1440 | no | none | pass |
| `/form-connections/ab29ac43-40ca-4f19-9487-a8d19b6125eb` | S15 active again (toast) | 1440 | no | none | pass |
| `/form-connections/d31faf2d-27c6-453e-9727-56fb3d51b11a` | S16 a complete draft | 1440 | no | none | pass |
| `/form-connections/414d27ee-76b7-4ffb-a208-2169561c0713` | S16 an incomplete draft (placeholders) | 1440 | no | none | pass |
| `/form-connections/d31faf2d-27c6-453e-9727-56fb3d51b11a` | S16 / S17 delete dialog (draft) | 1440 | no | none | pass |
| `/form-connections/d31faf2d-27c6-453e-9727-56fb3d51b11a` | S16 delete error 409 | 1440 | no | none | pass |
| `/form-connections/d31faf2d-27c6-453e-9727-56fb3d51b11a` | S16 delete error 404 | 1440 | no | none | pass |
| `/form-connections/d31faf2d-27c6-453e-9727-56fb3d51b11a` | S16 delete error 5xx | 1440 | no | none | pass |
| `/form-connections/d31faf2d-27c6-453e-9727-56fb3d51b11a` | S16 loading | 1440 | no | none | pass |
| `/form-connections/d31faf2d-27c6-453e-9727-56fb3d51b11a` | S16 error state | 1440 | no | none | pass |
| `/form-connections/ab29ac43-40ca-4f19-9487-a8d19b6125eb/edit` | S18 step 1 in the edit flow (the note, "Active", disabled Save) | 1440 | no | none | pass |
| `/form-connections/ab29ac43-40ca-4f19-9487-a8d19b6125eb/edit` | S18 the disabled Save with its explanation | 1440 | no | none | pass |
| `/form-connections/ab29ac43-40ca-4f19-9487-a8d19b6125eb/edit` | S18 documents step in the edit flow | 1440 | no | none | pass |
| `/form-connections/ab29ac43-40ca-4f19-9487-a8d19b6125eb/edit` | S18 rules step in the edit flow | 1440 | no | none | pass |
| `/form-connections/ab29ac43-40ca-4f19-9487-a8d19b6125eb/edit` | S18 test step in the edit flow | 1440 | no | none | pass |
| `/form-connections/ab29ac43-40ca-4f19-9487-a8d19b6125eb/edit` | S18 the leave dialog "Save your changes?" | 1440 | no | none | pass |
| `/form-connections/ab29ac43-40ca-4f19-9487-a8d19b6125eb/edit` | S18 the discard dialog "Discard your changes?" | 1440 | no | none | pass |
| `/form-connections/ab29ac43-40ca-4f19-9487-a8d19b6125eb/edit` | S18 the save dialog "Save changes?" | 1440 | no | none | pass |
| `/form-connections/ab29ac43-40ca-4f19-9487-a8d19b6125eb/edit` | S18 the save dialog’s conflict (409 rules_changed) | 1440 | no | none | pass |
| `/form-connections/ab29ac43-40ca-4f19-9487-a8d19b6125eb` | S18 back on the details with the toast | 1440 | no | none | pass |
| `/form-connections/0a92ca6d-6b48-4955-9b7c-03c7fbf4df4a/edit` | S14 summary (Standard only) | 320 @ 200 % | no | none (dialog or menu scrolls inside) | pass |
| `/form-connections/0a92ca6d-6b48-4955-9b7c-03c7fbf4df4a/edit` | S14 failed (alert with the error ID over the summary) | 320 @ 200 % | no | none (dialog or menu scrolls inside) | pass |
| `/form-connections/0a92ca6d-6b48-4955-9b7c-03c7fbf4df4a/edit` | S14 conflict (draft changed meanwhile) | 320 @ 200 % | no | none (dialog or menu scrolls inside) | pass |
| `/form-connections/0a92ca6d-6b48-4955-9b7c-03c7fbf4df4a/edit` | S14 publishing ("Publishing…") | 320 @ 200 % | no | none (dialog or menu scrolls inside) | pass |
| `/form-connections/0a92ca6d-6b48-4955-9b7c-03c7fbf4df4a/edit` | S14 published ("Published. Opening your connection page…") | 320 @ 200 % | no | none (dialog or menu scrolls inside) | pass |
| `/form-connections/0a92ca6d-6b48-4955-9b7c-03c7fbf4df4a` | S15 active, Links open from the publish dialog | 320 @ 200 % | no | none | pass |
| `/form-connections/3a84a4a7-40eb-46f8-b203-130dfa5cbe4e/edit` | S14 summary with variants and warnings | 320 @ 200 % | no | none (dialog or menu scrolls inside) | pass |
| `/form-connections/6e40c70e-90c0-4470-a435-01cb3416272b/edit` | S14 without rules ("Publish without rules?") | 320 @ 200 % | no | none (dialog or menu scrolls inside) | pass |
| `/form-connections/ab29ac43-40ca-4f19-9487-a8d19b6125eb` | S15 active, Summary open from "View" (L4) | 320 @ 200 % | no | none | pass |
| `/form-connections/ab29ac43-40ca-4f19-9487-a8d19b6125eb` | S15 a variant tab in the summary (Ambulance) | 320 @ 200 % | no | none | pass |
| `/form-connections/ab29ac43-40ca-4f19-9487-a8d19b6125eb` | S15 a variant tab in the summary (School transport) | 320 @ 200 % | no | none | pass |
| `/form-connections/ab29ac43-40ca-4f19-9487-a8d19b6125eb` | S15 "✓ Copied" (request link) | 320 @ 200 % | no | none | pass |
| `/form-connections/ab29ac43-40ca-4f19-9487-a8d19b6125eb` | S15 the "Request link" ⓘ | 320 @ 200 % | no | none | pass |
| `/form-connections/ab29ac43-40ca-4f19-9487-a8d19b6125eb` | S15 the menu (⋯) | 320 @ 200 % | no | none | pass |
| `/form-connections/32655494-b73b-4bd1-af5b-62852441616e` | S15 findings on the summary | 320 @ 200 % | no | none | pass |
| `/form-connections/38045b88-8d88-43ea-b253-77da0638250c` | S15 deactivated (L4) | 320 @ 200 % | no | none | pass |
| `/form-connections/ab29ac43-40ca-4f19-9487-a8d19b6125eb` | S15 long name, description and URLs (routed) | 320 @ 200 % | no | none | pass |
| `/form-connections/ab29ac43-40ca-4f19-9487-a8d19b6125eb` | S15 loading (skeletons) | 320 @ 200 % | no | none | pass |
| `/form-connections/ab29ac43-40ca-4f19-9487-a8d19b6125eb` | S15 / S22 error state with the error ID and the way back | 320 @ 200 % | no | none | pass |
| `/form-connections/<unknown>` | S15 / S22 deleted or unknown connection (not found, way back) | 320 @ 200 % | no | none | pass |
| `/form-connections/ab29ac43-40ca-4f19-9487-a8d19b6125eb` | S17 delete dialog (published) | 320 @ 200 % | no | none (dialog or menu scrolls inside) | pass |
| `/form-connections/ab29ac43-40ca-4f19-9487-a8d19b6125eb` | S17 working (delete running) | 320 @ 200 % | no | none (dialog or menu scrolls inside) | pass |
| `/form-connections/ab29ac43-40ca-4f19-9487-a8d19b6125eb` | S17 a failure with the error ID (delete, 5xx) | 320 @ 200 % | no | none (dialog or menu scrolls inside) | pass |
| `/form-connections/ab29ac43-40ca-4f19-9487-a8d19b6125eb` | S17 delete of a connection deleted meanwhile (404, T082) | 320 @ 200 % | no | none (dialog or menu scrolls inside) | pass |
| `/form-connections/ab29ac43-40ca-4f19-9487-a8d19b6125eb` | S17 edit entry dialog "Edit “<name>”?" from the details | 320 @ 200 % | no | none (dialog or menu scrolls inside) | pass |
| `/form-connections/ab29ac43-40ca-4f19-9487-a8d19b6125eb` | S17 deactivate dialog | 320 @ 200 % | no | none (dialog or menu scrolls inside) | pass |
| `/form-connections/ab29ac43-40ca-4f19-9487-a8d19b6125eb` | S17 deactivate failed with the error ID | 320 @ 200 % | no | none (dialog or menu scrolls inside) | pass |
| `/form-connections/ab29ac43-40ca-4f19-9487-a8d19b6125eb` | S15 deactivated after "Deactivate" (toast; the Links accordion, T095) | 320 @ 200 % | no | none | pass |
| `/form-connections/ab29ac43-40ca-4f19-9487-a8d19b6125eb` | S17 reactivate dialog | 320 @ 200 % | no | none (dialog or menu scrolls inside) | pass |
| `/form-connections/ab29ac43-40ca-4f19-9487-a8d19b6125eb` | S15 active again (toast) | 320 @ 200 % | no | none | pass |
| `/form-connections/d31faf2d-27c6-453e-9727-56fb3d51b11a` | S16 a complete draft | 320 @ 200 % | no | none | pass |
| `/form-connections/414d27ee-76b7-4ffb-a208-2169561c0713` | S16 an incomplete draft (placeholders) | 320 @ 200 % | no | none | pass |
| `/form-connections/d31faf2d-27c6-453e-9727-56fb3d51b11a` | S16 / S17 delete dialog (draft) | 320 @ 200 % | no | none (dialog or menu scrolls inside) | pass |
| `/form-connections/d31faf2d-27c6-453e-9727-56fb3d51b11a` | S16 delete error 409 | 320 @ 200 % | no | none (dialog or menu scrolls inside) | pass |
| `/form-connections/d31faf2d-27c6-453e-9727-56fb3d51b11a` | S16 delete error 404 | 320 @ 200 % | no | none (dialog or menu scrolls inside) | pass |
| `/form-connections/d31faf2d-27c6-453e-9727-56fb3d51b11a` | S16 delete error 5xx | 320 @ 200 % | no | none (dialog or menu scrolls inside) | pass |
| `/form-connections/d31faf2d-27c6-453e-9727-56fb3d51b11a` | S16 loading | 320 @ 200 % | no | none | pass |
| `/form-connections/d31faf2d-27c6-453e-9727-56fb3d51b11a` | S16 error state | 320 @ 200 % | no | none | pass |
| `/form-connections/ab29ac43-40ca-4f19-9487-a8d19b6125eb/edit` | S18 step 1 in the edit flow (the note, "Active", disabled Save) | 320 @ 200 % | no | none | pass |
| `/form-connections/ab29ac43-40ca-4f19-9487-a8d19b6125eb/edit` | S18 the disabled Save with its explanation | 320 @ 200 % | no | none | pass |
| `/form-connections/ab29ac43-40ca-4f19-9487-a8d19b6125eb/edit` | S18 documents step in the edit flow | 320 @ 200 % | no | none | pass |
| `/form-connections/ab29ac43-40ca-4f19-9487-a8d19b6125eb/edit` | S18 rules step in the edit flow | 320 @ 200 % | no | none | pass |
| `/form-connections/ab29ac43-40ca-4f19-9487-a8d19b6125eb/edit` | S18 test step in the edit flow | 320 @ 200 % | no | none | pass |
| `/form-connections/ab29ac43-40ca-4f19-9487-a8d19b6125eb/edit` | S18 the leave dialog "Save your changes?" | 320 @ 200 % | no | none (dialog or menu scrolls inside) | pass |
| `/form-connections/ab29ac43-40ca-4f19-9487-a8d19b6125eb/edit` | S18 the discard dialog "Discard your changes?" | 320 @ 200 % | no | none (dialog or menu scrolls inside) | pass |
| `/form-connections/ab29ac43-40ca-4f19-9487-a8d19b6125eb/edit` | S18 the save dialog "Save changes?" | 320 @ 200 % | no | none (dialog or menu scrolls inside) | pass |
| `/form-connections/ab29ac43-40ca-4f19-9487-a8d19b6125eb/edit` | S18 the save dialog’s conflict (409 rules_changed) | 320 @ 200 % | no | none (dialog or menu scrolls inside) | pass |
| `/form-connections/ab29ac43-40ca-4f19-9487-a8d19b6125eb` | S18 back on the details with the toast | 320 @ 200 % | no | none | pass |
| `/authorize` | S19 the request with the levels preselected from the scope | 1440 | no | none | pass |
| `/authorize` | S19 the step-up line (more access than before) | 1440 | no | none | pass |
| `/authorize` | S19 the failed authorization with its error ID | 1440 | no | none | pass |
| `/authorize` | S19 allow running (working) | 1440 | no | none | pass |
| `/authorize` | S19 the invalid request shown on the page | 1440 | no | none | pass |
| `/account` | S20 agents and tokens listed | 1440 | no | none | pass |
| `/account` | S20 an agent’s menu (⋯) | 1440 | no | none | pass |
| `/account` | S20 "Change access level" dialog | 1440 | no | none | pass |
| `/account` | S20 "Change access level" failure | 1440 | no | none | pass |
| `/account` | S20 "Revoke" dialog | 1440 | no | none | pass |
| `/account` | S20 "Revoke" failure | 1440 | no | none | pass |
| `/account` | S20 "Create token" dialog | 1440 | no | none | pass |
| `/account` | S20 "Create token" failure | 1440 | no | none (dialog or menu scrolls inside) | pass |
| `/account` | S20 the token shown once in its dialog (copyable field) | 1440 | no | none | pass |
| `/account` | S20 the token copied | 1440 | no | none | pass |
| `/account` | S20 empty (the Konnekt sentence; routed) | 1440 | no | none | pass |
| `/account` | S20 the menu entry "Your account" (user menu open) | 1440 | no | none | pass |
| `/approvals/:id` | S21 publish (the stored draft’s summary and findings) | 1440 | no | none | pass |
| `/approvals/:id` | S21 reactivate (the connection and its URLs) | 1440 | no | none | pass |
| `/approvals/:id` | S21 delete | 1440 | no | none | pass |
| `/approvals/:id` | S21 delete a draft | 1440 | no | none | pass |
| `/approvals/:id` | S21 deactivate | 1440 | no | none | pass |
| `/approvals/:id` | S21 working ("Working…") | 1440 | no | none | pass |
| `/approvals/:id` | S21 failed with "Try again" and the error ID | 1440 | no | none | pass |
| `/approvals/:id` | S21 done (approved) | 1440 | no | none | pass |
| `/approvals/:id` | S21 declined | 1440 | no | none | pass |
| `/approvals/:id` | S21 replaced (a newer request) | 1440 | no | none | pass |
| `/approvals/:id` | S21 expired (routed) | 1440 | no | none | pass |
| `/approvals/:id` | S21 cancelled with its reason (routed) | 1440 | no | none | pass |
| `/approvals/:id` | S21 another team member’s request (routed) | 1440 | no | none | pass |
| `/account → /login` | S22 the sign-in guard (signed out, requested route kept) | 1440 | no | none | pass |
| `/no-such-page → /` | S22 an unknown route redirects to the overview | 1440 | no | none | pass |
| `/approvals/<unknown>` | S22 not found (NotFound, the way back) | 1440 | no | none | pass |
| `/authorize` | S19 the request with the levels preselected from the scope | 320 @ 200 % | no | none | pass |
| `/authorize` | S19 the step-up line (more access than before) | 320 @ 200 % | no | none | pass |
| `/authorize` | S19 the failed authorization with its error ID | 320 @ 200 % | no | none | pass |
| `/authorize` | S19 allow running (working) | 320 @ 200 % | no | none | pass |
| `/authorize` | S19 the invalid request shown on the page | 320 @ 200 % | no | none | pass |
| `/account` | S20 agents and tokens listed | 320 @ 200 % | no | none | pass |
| `/account` | S20 an agent’s menu (⋯) | 320 @ 200 % | no | none | pass |
| `/account` | S20 "Change access level" dialog | 320 @ 200 % | no | none (dialog or menu scrolls inside) | pass |
| `/account` | S20 "Change access level" failure | 320 @ 200 % | no | none (dialog or menu scrolls inside) | pass |
| `/account` | S20 "Revoke" dialog | 320 @ 200 % | no | none (dialog or menu scrolls inside) | pass |
| `/account` | S20 "Revoke" failure | 320 @ 200 % | no | none (dialog or menu scrolls inside) | pass |
| `/account` | S20 "Create token" dialog | 320 @ 200 % | no | none (dialog or menu scrolls inside) | pass |
| `/account` | S20 "Create token" failure | 320 @ 200 % | no | none (dialog or menu scrolls inside) | pass |
| `/account` | S20 the token shown once in its dialog (copyable field) | 320 @ 200 % | no | none (dialog or menu scrolls inside) | pass |
| `/account` | S20 the token copied | 320 @ 200 % | no | none (dialog or menu scrolls inside) | pass |
| `/account` | S20 empty (the Konnekt sentence; routed) | 320 @ 200 % | no | none | pass |
| `/account` | S20 the menu entry "Your account" (user menu open) | 320 @ 200 % | no | none (dialog or menu scrolls inside) | pass |
| `/approvals/:id` | S21 publish (the stored draft’s summary and findings) | 320 @ 200 % | no | none | pass |
| `/approvals/:id` | S21 reactivate (the connection and its URLs) | 320 @ 200 % | no | none | pass |
| `/approvals/:id` | S21 delete | 320 @ 200 % | no | none | pass |
| `/approvals/:id` | S21 delete a draft | 320 @ 200 % | no | none | pass |
| `/approvals/:id` | S21 deactivate | 320 @ 200 % | no | none | pass |
| `/approvals/:id` | S21 working ("Working…") | 320 @ 200 % | no | none | pass |
| `/approvals/:id` | S21 failed with "Try again" and the error ID | 320 @ 200 % | no | none | pass |
| `/approvals/:id` | S21 done (approved) | 320 @ 200 % | no | none | pass |
| `/approvals/:id` | S21 declined | 320 @ 200 % | no | none | pass |
| `/approvals/:id` | S21 replaced (a newer request) | 320 @ 200 % | no | none | pass |
| `/approvals/:id` | S21 expired (routed) | 320 @ 200 % | no | none | pass |
| `/approvals/:id` | S21 cancelled with its reason (routed) | 320 @ 200 % | no | none | pass |
| `/approvals/:id` | S21 another team member’s request (routed) | 320 @ 200 % | no | none | pass |
| `/account → /login` | S22 the sign-in guard (signed out, requested route kept) | 320 @ 200 % | no | none | pass |
| `/no-such-page → /` | S22 an unknown route redirects to the overview | 320 @ 200 % | no | none | pass |
| `/approvals/<unknown>` | S22 not found (NotFound, the way back) | 320 @ 200 % | no | none | pass |
| `/form-connections/:id` | L2 content scrolled under the header (header white) | 1440 | no | none | pass |
| `/form-connections/:id` | L2 content scrolled (the header scrolls away: it sticks only from 320 CSS px wide and 480 px tall) | 320 @ 200 % | no | none | pass |
| `/form-connections/new` | S10 condition: place of birth | 1440 | no | none | pass |
| `/form-connections/aae1b881-eac2-41ff-96f5-5a83a38d633d/edit` | S11 the dialog: a reserved name ("Standard") | 1440 | no | none | pass |
| `/form-connections/new` | S10 condition: place of birth | 320 @ 200 % | no | none | pass |
| `/form-connections/aae1b881-eac2-41ff-96f5-5a83a38d633d/edit` | S11 the dialog: a reserved name ("Standard") | 320 @ 200 % | no | none (dialog or menu scrolls inside) | pass |
| `/form-connections/new` | S10 condition: place of birth, its values menu open | 1440 | no | none | pass |
| `/form-connections/new` | S10 condition: a list (nationality), its values menu open | 1440 | no | none | pass |
| `/form-connections/new` | S10 condition: a list (nationality) | 1440 | no | none | pass |
| `/form-connections/new` | S10 condition: a number (height) | 1440 | no | none | pass |
| `/form-connections/new` | S10 condition: place of birth, its values menu open | 320 @ 200 % | no | none | pass |
| `/form-connections/new` | S10 condition: a list (nationality), its values menu open | 320 @ 200 % | no | none | pass |
| `/form-connections/new` | S10 condition: a list (nationality) | 320 @ 200 % | no | none | pass |
| `/form-connections/new` | S10 condition: a number (height) | 320 @ 200 % | no | none | pass |

**Firefox spot check** (Firefox 158, playwright-firefox tools, signed in as `designer`):

| check | result |
|---|---|
| T045 / T095: the initial focus on × after a mouse click on the row's bin ("Delete “Neue Verbindung”?"), the details' ⋯ → "Deactivate" and ⋯ → "Delete connection" | × focused, `:focus-visible` false, no outline: no ring (as Chromium 156 in T095) |
| a menu opened by a click (the details' ⋯) | the first item focused, `:focus-visible` false: no ring |
| T061: `MenuSearchField` focused when the rule editor's data menu ("Search Driving licence") and the part menu ("Search classes") open after a click | `:focus-visible` true, the 4 px ring: as T061 found; Chromium 156 does the same (the part menu in `s10-part-menu-w.png`) |
| 160 × 320 CSS px: `/`, a published connection's details, `/form-connections/new`, the seeded draft's rules step, a deactivated connection, `/account`, `/forgot-password`, `/login` | `scrollWidth` = `clientWidth` = 160 on each (Firefox's overlay scrollbar); the header `static` |

**Decisions on the carried notes**:

- **T033** (`TopBar` sticky at every size): checked at 320 × 256 CSS px (1280 × 1024 at 400 %): the
  sticky header took 64 px on the overview and 152 px (59 %) inside a connection. Decided and fixed:
  the header sticks only in windows at least 320 CSS px wide and 480 px tall, the rule the wizard's
  footer already follows (`[@media(height>=30rem)]`); in shorter or narrower windows it scrolls away
  with the page (WCAG 1.4.10). Measured after the fix: 320 × 256 `static`; 320 × 640 sticky (152 px
  in a connection, 24 %); 640 × 450 (1280 × 900 at 200 %) `static`; 1440 × 900 sticky. No frame draws
  a short window; the designer may want to see it (listed below).
- **T045** (a) the local-drafts offer's h2 before the welcome page's h1: kept. Contract S3 puts the
  offer above the page (005-S4, 001-S4.5), the heading order follows the visual order (WCAG 1.3.2),
  and no AA criterion asks for the h1 first; the page keeps exactly one h1. (b) the dialog's initial
  focus after a mouse click: no ring in Chromium 156 (T095) nor in Firefox 158 (above), for the row
  delete, the details' Deactivate and Delete (all `ConfirmDialog`): no change for any
  `ConfirmDialog`. A dialog that opens without a click (the restore question after a reload) shows
  the ring on ×, as the browsers treat focus without a pointer as keyboard focus: correct.
- **T048** the failed-save toast and "Saving draft…" with a screen reader: needs a person (below).
  Retiring `UserMenu`'s "Log out and discard unsaved work?" with `logOut(onCancelled?)`: **Q8 (e) does
  not settle it completely**, so it is left for T100 (or T099's convergence) with a note. Q8 (e) drops
  the dialog, its list of names, "Saved drafts stay as they are." and its danger "Log out"
  (superseding 005-S7.2–S7.5), but keeps 005-S7.1 and 005-S7.6 and says nothing about spec 005's
  FR-019 ("discard them when the team member signs out"): without the dialog, "Log out" with
  local drafts on the device must either discard them silently or keep them for the next sign-in,
  and that choice (silent loss of crash-recovery work, or local drafts kept past a sign-out on a
  shared device) is behaviour no item decides. Not changed.
- **T049** (the name ⓘ's bubble 8 px before the icon; "it." on a fifth line): the pattern's,
  unchanged; the bubble stays inside the window at both widths (`S7 the name ⓘ’s bubble` rows).
- **T051** (the search card's rows highlighted on hover and focus, no `aria-activedescendant`
  combobox): unchanged (baseline behaviour, `MenuSearchField` without combobox props); its states pass
  at both widths (S8 rows).
- **T061** (Firefox shows `MenuSearchField`'s 4 px ring when a click opens the menu): confirmed in
  Firefox 158 and seen in Chromium 156 too. Kept: a text field matches `:focus-visible` on any focus
  in both engines (the HTML heuristic for elements that take keyboard input), and the ring marks
  where typing goes; hiding it would take `outline: none` on the field's `:focus`, which hides it
  from keyboard users as well. FR-009's "keyboard focus only" is met for the controls a click
  presses.
- **T082** (deleting a published connection that was deleted meanwhile: the server's message with
  "Try again"; the draft's 404 offers "Go to overview"): baseline, unchanged; both captured
  (`s17-delete-404`, `s16-delete-404`); listed for the designer.
- **T084** (the edit flow's footer at 320 px: three rows on step 1, four on the others): the same
  at 320 @ 200 % (160 CSS px): step 1 "Discard changes" / "Choose documents" / "Save", the rules step
  "Back" / "Discard changes" / "Test rules" / "Save", one per row, each with its label (a long one
  wraps inside its button); in the create flow "Save and exit" keeps its label in every row of the
  matrix (the script checked it). No narrow frame exists to compare with: unchanged.
- **T095** (a) the Firefox check: done (above). (b) "deactivating closes an open Links accordion":
  not reproduced. With "View links" open, ⋯ → "Deactivate" → "Deactivate connection" leaves the
  accordion open ("Hide links", `aria-expanded="true"`), directly and after a failed attempt and
  "Try again" (`s15-after-deactivate-w.png`), and "Activate again" keeps it open too; no change.

### 6.9 Copy outside the frontend, removal, light only and motion (T097, 2026-11-09)

Quickstart V12 and V13, by a task agent: the gates from the repository root and `backend/`, the
greps of §7 from the root, and playwright-core 1.48.2 with Chromium (`/usr/bin/chromium`) at
1455 × 900 against the dev server whose backend runs the in-memory fake EUDIPLO, account
`designer`, `colorScheme` and `reducedMotion` set on the browser context (the same media features
`browser_emulate_media` sets). Durations were read from `getComputedStyle()` and
`Element.getAnimations()`; the "frames" columns are `requestAnimationFrame` samples in headless
Chromium (about 16 ms apart, so a span is ± one frame). Data: one "T097 Entwurf" draft
(`seed9.py draft T097`), published through the UI, then deleted (`seed9.py cleanup T097`).
No source file changed.

#### V12.1 Tests with the new texts

| Gate | Result |
|---|---|
| `backend/`: `ruff check .`, `ruff format --check .` | all checks passed; 86 files already formatted |
| `backend/`: `mypy app/ scripts/ tests/` | no issues in 77 source files |
| `backend/`: `pytest` (`template_db_test`) | 1998 passed (9 min 52 s) |
| root: `npm run lint` | passed |
| root: `npm test` | rules 43 files / 2351 tests (one run: `performance.test.ts`'s 1.5 s budget missed at 5.1 s while pytest ran beside it, the known flake; `npm test -w rules` again: 2351 passed), frontend 29 / 969 passed, mcp 15 / 408 passed (`guidance.test.ts` included) |
| root: `npm run build` | passed (Vite's chunk-size warning stays) |

`rules/src/validation.ts` against the server: the sentences that `rules/src/validation.test.ts`
and `backend/tests/unit/test_rules_validation.py` (+ `test_draft_validation.py`) assert, extracted
from both files' string literals (28 sentences are byte-identical in both files), reduced to their
templates (item, variant, name and number as placeholders), and each template found word for word
in the two sources (`RULES_MESSAGES` and `CONDITION_PROBLEM_MESSAGES` in `rules/src/constants.ts`,
the `_validation_error(...)` calls in `backend/app/services/rules.py`):

| # | Template (word for word on both sides) | Asserted by the rules test | Asserted by the backend test | Server source |
|---|---|---|---|---|
| 1 | A connection can have at most 20 variants. | same string | same string | `rules.py:279` |
| 2 | The rules need exactly one main branch. | same string | same string | `rules.py:287` |
| 3 | Enter a name for every variant. | same string | same string | `rules.py:340` |
| 4 | A variant’s name can have at most 100 characters. | same string | same string | `rules.py:343` |
| 5 | Two variants are called {name}. Give each variant its own name. | "…called AMBULANCE…" | same string | `rules.py:350` |
| 6 | The description of {variant} can have at most 500 characters. | "…of Standard…" | same string | `rules.py:398` |
| 7 | {variant} can have at most 200 rules and groups. | "Taxi can…" | "Standard can…" | `rules.py:404` |
| 8 | The rules contain an invalid identifier. Reload the connection and try again. | same string | same string | `rules.py:74` |
| 9 | Enter a name for every {rule / group / sub-group} in {variant}. | all three nouns | all three nouns | `rules.py:588` |
| 10 | A {noun} in {variant} has a name longer than 100 characters. | "A rule in Standard…" | "A rule…", "A group…" | `rules.py:591` |
| 11 | There’s already a {noun} called "{name}" in {variant}. | rule, group, sub-group | rule, group | `rules.py:599` |
| 12 | {Name} is kept for the {noun} numbered {nn}. | Rule, Group, Sub-group (with and without leading zeros) | Rule, Group, Sub-group | `rules.py:621` |
| 13 | {item} in {variant}: choose the data to check. | same string | same string | `rules.py:631` |
| 14 | {item} in {variant} checks data that’s no longer requested. | same string | same string | `rules.py:634` |
| 15 | {item} in {variant} checks a part that {field} doesn’t have. | template (`{field}`) | template (`{label}`) | `rules.py:637` |
| 16 | {item} in {variant} has no error message. | Standard, Ambulance, Taxi | Standard, Ambulance, Taxi | `rules.py:518` |
| 17 | The error message of {item} in {variant} can have at most 500 characters. | Rule, Group, Sub-group | Rule, Group, `rule-7` (a draft's unnamed rule) | `rules.py:497`, `:521` |
| 18 | {sub-group} in {variant} can only hold rules. | same string | same string | `rules.py:542` |
| 19 | {group} in {variant} needs at least two rules. | Group, Sub-group | Group, Sub-group | `rules.py:547` |
| 20 | {item} in {variant}: {condition problem} | "choose a check.", "choose values from the list.", the rest through `{problem}` | "choose a check.", "enter a number.", "enter a text to compare with.", "enter a date.", "enter a number of years of at least 1.", the rest through `{message}` | `rules.py:513`–`738`; all ten `CONDITION_PROBLEM_MESSAGES` found word for word |

Asserted on one side only, by design: the rules side's dialog and inline-rename texts ("Enter a
name for the variant.", "There’s already a variant called "{name}".", "Enter a name.", "A name can
have at most 100 characters.": the client's own checks, no server message); the server side's
structural refusals the editor never sends ("The variant {variant} is out of step with Standard.
Reload the connection and try again.", "Unknown variant.", "Unknown document type …", the
connection's name and description limits). No template differs: pass.

#### V12.2 The removal checklist (§7) again

| Line | Command | Output | Against T094 |
|---|---|---|---|
| 1 | `index.css`: nothing of the old design | empty | same |
| 2 | KERN 2.8 hexes, the 248 px menu | empty | same |
| 3 | five steps, the old product name | empty | same |
| 4 | assets nobody imports | empty | same |
| 5 | old texts outside the frontend | 186 lines, identifiers only, 0 "Connection Portal" (by file: `rules/src/` 133, `mcp/src/` 43, `mcp/plugin/` 8, `docs/ARCHITECTURE.md` 2) | same count; the only string literals are calls and imports (`applicant(…)`, `applicantOf`, `applicantFieldsOf`) |
| 6 | superseded doc rules | empty | same |

T095's and T096's fixes (`PublishDialog.tsx`, the `narrow:` variant and block in `index.css`,
`TopBar`, `ValuesPicker`) brought nothing back: pass.

#### V12.3 The agents' guidance

| Check | Result |
|---|---|
| `grep -rn "Connection Portal\|[Aa]pplicant" mcp/plugin` | 8 lines, every one an identifier in backticks: the tool `test_applicants` (`instructions.md:20`, `skills/checks-and-tests/SKILL.md:9, 58, 60`, `skills/links/SKILL.md:52`, `skills/variants-and-standard/SKILL.md:17`) and its fields `applicants` (`checks-and-tests:61`) and `applicant_fields` (`checks-and-tests:64`, `variants-and-standard:17`); no prose says "applicant", no "Connection Portal" (the identifiers stay, FR-019, FR-020, research R2; T094's line 5) |
| Konnekt | `instructions.md:1` "# Konnekt", `:3` "You work in Konnekt, the City of Stuttgart's DO.IT team's portal…"; `README.md:1` "# The Konnekt plugin"; `skills/links/SKILL.md:3` "Konnekt's links to connections, variants, rules, groups and approval requests…"; `skills/connection-workflow/SKILL.md:3` "…to a live connection in Konnekt…" |
| citizens | 30 lines in 7 files, e.g. `skills/checks-and-tests/SKILL.md:9` "citizens you invent with `test_applicants`", `:58` "## Testing with fictitious citizens: `test_applicants`"; `skills/conditions/SKILL.md:88` "The message is shown to the citizen when the rule (or group) isn't met. Write it to the citizen…"; `skills/connection-workflow/SKILL.md:21` "each with the message the citizen reads when it isn't met" |

Pass (the identifiers as T094 recorded them).

#### V13.1 Dark mode

`colorScheme: 'dark'` on the context (`matchMedia('(prefers-color-scheme: dark)')` true):

| Check | Dark device | Light device |
|---|---|---|
| `<html data-kern-theme>` | `light` | `light` |
| `<html>` computed `color-scheme` | `light only` | `light only` |
| `body` background | `oklch(1 0 0)` (white) | `oklch(1 0 0)` |
| `body` text colour, `h1` colour | `rgb(11, 18, 32)` | `rgb(11, 18, 32)` |
| Overview screenshot (1455 × 900) | byte-identical to the light one (same MD5) | — |
| Details of "P11 Führerscheinantrag Esslingen" | light (screenshot `details-dark.png`) | — |

Pass.

#### V13.2 `prefers-reduced-motion: reduce`

`reducedMotion: 'reduce'` on the context (`matchMedia` true):

| Check | Result |
|---|---|
| Elements with a transition or an animation (every element and its `::before`/`::after`, overview and details at rest) | 0 (with motion on: the header, the user button's `::after`, the dialogs, `main`, the pill and its text, the row and tab buttons, the accordions' cards and bodies, all carrying `motion`; no element without `motion` transitions or animates, KERN's own included) |
| The connection pill on opening a connection (overview → details by a click) | `animation-name: none`, `getAnimations()` empty, `clip-path: none` in the first frame after mount, its text at opacity 1 in the first frame: appears at once |
| `main` (page change) | `animation-name: none`, no animation, opacity 1 in the first frame |
| Accordion "View links" (details) | `transition: none 0s`; the body's height 0 → 489 px in one frame (with motion on: 9 frames over about 130 ms of a 200 ms ease-out, `grid-template-rows 0.2s`) |
| Colour on hover ("Connection actions" ⋯) | `transition: none 0s`; the background changes in one frame (with motion on: 10 frames over about 150 ms) |
| Dialogs (`.kern-dialog.motion` and `::backdrop`) | `transition: none 0s` |
| "Published" waits 0.5 s | the "T097 Entwurf" draft published through the UI (test step → "Publish" → "Publish connection"): `POST /api/form-connections/<id>/publish` 200, then the details opened 544 ms after the answer reached the page (the 500 ms timer plus the render and a frame); the details' page fade `none` |

Pass.

#### V13.3 Motion on

`reducedMotion: 'no-preference'`, overview → details of "P11 Führerscheinantrag Esslingen" by a
click (the pill mounts):

| What | Computed | Animation object | Measured (frames) | Expected (§4) |
|---|---|---|---|---|
| The pill (`nav.motion.animate-pill-grow`) | `animation-name: pill-grow`, `animation-duration: 0.24s`, delay 0 s | `pill-grow`, 240 ms | `clip-path` from `inset(0px 100% 0px 0px round 9999px)` to `none`, 15 changing frames | 240 ms ease-out clip reveal: pass |
| The pill's text (`.motion.animate-pill-text`) | `pill-text`, `0.12s`, delay `0.12s` | `pill-text`, 120 ms after 120 ms | opacity 0 → 1, 8 changing frames | the last 120 ms: pass |
| Colours (the ⋯, the tabs, the cards, the header) | `transition-property: color, background-color, border-color, …`, `transition-duration: 0.15s`, `cubic-bezier(0.4, 0, 0.2, 1)` | — | the ⋯'s hover background over 148 ms (10 frames) | 150 ms: pass |
| Page fade (`main.motion.animate-page-in`) | `animation-name: page-in`, `0.15s` | `page-in`, 150 ms | opacity 0 → 1, settled by 144 ms | 150 ms ease-out: pass |
| Accordion bodies | `grid-template-rows 0.2s cubic-bezier(0, 0, 0.2, 1)` | — | 0 → 489 px | 150–200 ms: pass |
| Dialogs and their scrim | `opacity, display, overlay` `0.15s` each | — | — | fade: pass |

The timings by eye are for a person (below).

### 6.10 AA contrast review (T098, 2026-11-09)

SC-006, FR-013, W1, Clarification 2026-11-06 #2. By a task agent with playwright-core 1.48.2 and
Chromium 156 against the dev server (fake EUDIPLO). **Method**: a script measured every text pair
on the rendered pages; a screenshot was opened only where the script could not decide.

- **States**: T096's route × state scripts (§6.8) rerun with the screenshot replaced by a
  collector: **258 route × states** on 34 routes: 227 at 1440 (a 1455 × 900 window, including L1
  at about 1280 and 1000 px) and 31 at 320 @ 200 % (160 CSS px, for the markup that changes there:
  L1 / S1 / S2 and the overview, the TopBar's wrapped pill and the sticky toast; T096 changed no
  colour under 320 CSS px). The same states as §6.8 (same reach, routed answers for the states the
  stack can't make); T098's own copies of the data (`seed8.py T098`, `seed9.py` with prefix T098,
  `phase11/T098/seed98.py`), deleted afterwards.
- **Collector** (`phase11/T098/collect.js`, in the page): every rendered text node
  (`checkVisibility` with opacity and `visibility`, a box of 2 px or more), every input's value or
  `::placeholder`, `::before` / `::after` with text content and list markers. The text colour
  (`-webkit-text-fill-color`) and the background are composited through the whole ancestor chain:
  every `background-color` with its alpha, and every ancestor's `opacity` as a group (the group's
  content faded over the layers outside it), over the canvas's white; every colour converted through
  a canvas (computed values were `oklch()`, `color(srgb …)`, `color-mix()` results), the WCAG 2.x
  ratio from the composited sRGB values, unrounded. Threshold 4.5:1; 3:1 for large text (≥ 24 px,
  or ≥ 18.66 px at 700); 3:1 for a disabled control's text (`:disabled`, `aria-disabled="true"`,
  inside a disabled fieldset) and for the faded inactive parts (any text whose ancestors fade it
  below opacity 1 outside a disabled control: the removed rule, the faded connector and marks): that
  3:1 is **this task's** threshold, not WCAG 1.4.3's, which exempts inactive components.
  Visibility: per text box `elementsFromPoint` at its centre, scrolling the page in steps for the
  text below the window (each text measured where it is in view and not covered); text covered by
  an open popup, clipped by an ancestor's overflow, or `sr-only` is not measured there; text behind
  a modal dialog (inert) is not measured in that state (it is measured in the states without the
  dialog). **Unsure** instead of a guess: a `background-image` (other than a one-colour gradient,
  composited as a layer), `filter`, `backdrop-filter`, `mix-blend-mode`, a mask or a `text-shadow`
  on the chain under the first opaque layer, or a non-ancestor box with a background painted under
  the text (a layer beneath).
- **States forced**: through CDP (`CSS.forcePseudoState`) on every link, button, summary, label,
  form control, tab, menu item, option, `[tabindex]` and `.group` at once: hover; hover + active
  (pressed); focus + focus-visible; each pass re-collects the text inside those elements after
  the colour transitions end, then clears the state. The scripts' own hovers, the open menus,
  pressed toggles and selected tabs are in the default pass.
- **Counts** (the final run): 14,345 rendered text items in the default states (8,870 more behind
  a modal dialog and 9,027 not rendered were left out); 8,158 measured in the default state, 8,068
  more in the forced passes (14,551 rows after removing repeats); not measured where they stood:
  2,350 `sr-only`, 3,760 clipped (mostly `sr-only` spans the browser lays out wider than their 1 px
  box, and rows scrolled out of view inside the overview's list and the editor's menus, whose
  visible siblings carry the same classes), 62 covered by an open popup. **63 distinct pairs**
  (foreground, background, threshold), every one listed below. CSV:
  `<scratchpad>/phase11/T098/pairs.csv` (one row per text, state and pass: route, state, width,
  pass, text, fg, bg, ratio, threshold, size, weight, opacity, raw colour, background source,
  selector path, flags); the first run's in `phase11/T098/run1/`.
- **Results**: the first run (227 states at 1440, before the fixes): 68 pairs, **13 failing**
  (the five §1.5 rows of T098: the pressed primary shade, 196 rows; the pressed tint on tinted
  surfaces, 30 rows; the disabled controls at 40 %, 242 rows; the disabled buttons' hover shade;
  the faded inactive parts) and one unsure group (the S16 band). After the fixes: **0 failing, 0
  undecided**. Screenshots opened: **one** (a crop of S16's "Edited …" chip,
  `phase11/T098/shots/s16-edited.png`); everything else was settled by the script or by pixel
  measurement.

**Unsure, and how each was settled**: only the S16 draft band (`section` with the
`linear-gradient(113.27deg, feedback-info-background 21.6 %, hued 75.9 %)`): 10 rows (its heading,
the muted line, "Delete draft" in each state). Settled by pixels (`phase11/T098/gradient.mjs`,
`gradient0.mjs`, `gradient1.mjs`): per text, the text made transparent, its box captured, the
pixels read with `getImageData`, the ratio against the darkest and the lightest background pixel.
Heading 16.31–17.09:1, muted line 6.63–6.96:1, "Delete draft" 5.24:1 (resting), 4.66:1 (hover),
**4.13:1 pressed (fail, fixed: §1.5 row 2)**; after the fix every one of its 3,838 pixels is
`#dbe4fd`, 4.54:1. The "Edited …" chip's darkest pixel (`#0b1220`) was its calendar icon: the crop
shows the chip on its own white fill, so the collector's 7.61:1 stands. The first version of fix 2
laid the tint as a one-colour `linear-gradient` over white; Chromium dithers gradient layers by one
level (pixels `#dae3fc`, 4.496:1), so the fix is a solid `color-mix` (all pixels `#dbe4fd`).

**Fixed pairs, for the designer** (overlay in `frontend/src/index.css`, §1.5):

| # | pair | before | after | change |
|---|---|---|---|---|
| 1 | white label on the pressed primary button | `#4076f6`, 4.09:1 | `#356df4`, 4.52:1 | the pressed shade mixes 11 % white, not 16 % |
| 2 | blue label of a pressed outline / tertiary button on a tinted surface (info bar, offer card, hued panel, S16 band) | `#c1d9fc`–`#d0dcfa`, 4.01–4.20:1 | `#dbe4fd`, 4.54:1 | the pressed tint is drawn on white (as on a white surface), not over the surface |
| 3 | text of disabled buttons | at 40 %: 1.82–2.06:1 | at 68 %: 3.17–3.37:1 | `action-state-opacity-disabled` 0.68 |
| 4 | disabled button under the pointer / pressed | KERN's hover shade at 40 %: 1.77–1.79:1 | the resting fill: 3.17–3.21:1 | disabled KERN buttons don't take the hover or pressed shade |
| 5 | faded inactive parts (removed rule, faded connector, inactive marks; disabled menu entries and access levels) | at 40 %: 1.90–2.62:1 | at 68 %: 3.17–6.52:1 | the same token; `RuleMenuItem` and `AccessLevelOption` use it instead of `opacity-40` |

Files: `frontend/src/index.css` (the overlay's `:root`: `--kern-color-action-state-opacity-disabled`,
`--kern-color-action-state-indicator-shade-active`; the outline / tertiary `:active` rule; the new
disabled-buttons rule; `--pressed-tint-share` on `.kern-btn--danger`), `components/ActionMenu/RuleMenuItem.tsx`
(T021) and `components/AccessLevelChoice/AccessLevelOption.tsx` (T016): `opacity-40` → the token.
Each is a UI task of its screens: every screen with KERN buttons (T006 overlay, T035), S9 / S11
(T021, T024, T025), S19 / S20 (T016).

**Every distinct pair** (the final run; ratio = the lowest of the group; "where" = two examples:
state, text, element; the passes in brackets when not only the default):

| fg | bg | ratio | threshold | where (state: "text" element; states forced) | result |
|---|---|---|---|---|---|
| `#ffffff` | `#658cf5` | 3.17 | 3 (disabled, task) | S1 "Logging in…" `kern-label`; S8 "Set rules" `kern-label` (default, focus-visible, hover, pressed), 212 rows | pass |
| `#658cf5` | `#ffffff` | 3.17 | 3 (disabled, task) | S6 "Saving…" `kern-label`; S11 "Copy" `kern-label` (default, focus-visible, hover, pressed), 18 rows | pass |
| `#ffffff` | `#658cf5` | 3.17 | 3 (inactive, faded; task) | S11 "AND" `button#_r_17_` (default, focus-visible, hover, pressed), 4 rows | pass |
| `#658cf5` | `#ffffff` | 3.17 | 3 (inactive, faded; task) | S11 "Rule 02" `span`, 1 rows | pass |
| `#f5fbff` | `#5b88f4` | 3.21 | 3 (disabled, task) | S9 "Group rules" `kern-label` (default, focus-visible, hover, pressed), 8 rows | pass |
| `#ffffff` | `#d76c65` | 3.37 | 3 (disabled, task) | S17 "Deleting…" `kern-label` (default, hover, pressed), 3 rows | pass |
| `#848b98` | `#ffffff` | 3.43 | 3 (inactive, faded; task) | S11 "Driving licence" `span`; S11 "·" `span`, 4 rows | pass |
| `#0273ae` | `#e0f2fe` | 4.50 | 4.5 | S9 "Message for citizens:" `div`; S11 "Linked to Standard" `p` (default, focus-visible, hover, pressed), 41 rows | pass |
| `#1d56f0` | `#d0e6fd` | 4.51 | 4.5 | S9 "Cancel" `kern-label` (hover), 3 rows | pass |
| `#ffffff` | `#356df4` | 4.52 | 4.5 | L1 "Log in" `kern-label`; S4 "Create connection" `kern-label` (pressed), 222 rows | pass |
| `#c4271c` | `#dbe4fd` | 4.52 | 4.5 | S9 "Delete group" `span`; S9 "Delete rule" `span` (pressed), 5 rows | pass |
| `#1d56f0` | `#dbe4fd` | 4.54 | 4.5 | S4 "View" `kern-label`; S4 "Edit" `kern-label` (pressed), 162 rows | pass |
| `#1d56f0` | `#dde5f6` | 4.56 | 4.5 | S5 "Discard" `kern-label`; S5 "Resume editing" `kern-label` (hover), 24 rows | pass |
| `#1d56f0` | `#e1e9fa` | 4.73 | 4.5 | S13 "Generate all" `kern-label`; S13 "Try again" `kern-label` (default, focus-visible, hover), 13 rows | pass |
| `#ffffff` | `#2f67f3` | 4.82 | 4.5 | S7 "Choose documents" `kern-label`; S11 "Add variant" `kern-label` (default, focus-visible, hover), 249 rows | pass |
| `#1d7a2e` | `#eaf7e6` | 4.89 | 4.5 | S4 "Active" `span`, 51 rows | pass |
| `#1d56f0` | `#e0f2fe` | 5.03 | 4.5 | S9 "Cancel" `kern-label`; S11 "Rule 03" `button` (default, focus-visible, hover, pressed), 66 rows | pass |
| `#c4271c` | `#faeeed` | 5.07 | 4.5 | S6 "Discard connection" `kern-label`; S8 "Remove 1 document" `kern-label` (hover), 3 rows | pass |
| `#1d56f0` | `#eef1f6` | 5.09 | 4.5 | S5 "Discard" `kern-label`; S5 "Resume editing" `kern-label` (default, focus-visible), 48 rows | pass |
| `#c4271c` | `#edf2fe` | 5.13 | 4.5 | S9 "Delete group" `span`; S9 "Delete rule" `span` (hover), 5 rows | pass |
| `#1d56f0` | `#edf2fe` | 5.14 | 4.5 | S7 "Save and exit" `kern-label`; L3 "Back" `kern-label` (default, focus-visible, hover), 500 rows | pass |
| `#1d56f0` | `#eef3fe` | 5.19 | 4.5 | S8 "Add document" `button` (hover, pressed), 16 rows | pass |
| `#1d56f0` | `#f8f1fc` | 5.21 | 4.5 | S11 "Rule 01" `span`; S11 "Rule 04" `span` (default, focus-visible, hover, pressed), 17 rows | pass |
| `#c4271c` | `#fef1f0` | 5.21 | 4.5 | S8 "Driving licence" `span` (default, focus-visible, hover, pressed), 4 rows | pass |
| `#1d56f0` | `#fef1f0` | 5.23 | 4.5 | S9 "Add it in Documents" `div` (default, focus-visible, hover, pressed), 4 rows | pass |
| `#1d56f0` | `#f3f4f7` | 5.24 | 4.5 | S9 "Add rule" `button` (hover, pressed), 126 rows | pass |
| `#c4271c` | `#f2f5fb` | 5.26 | 4.5 | S9 "There’s already a rule calle" `span`, 1 rows | pass |
| `#1d56f0` | `#f2f5fb` | 5.28 | 4.5 | S5 "Your connections" `a`; S9 "Group 01" `button` (default, focus-visible, hover, pressed), 561 rows | pass |
| `#1d56f0` | `#fff4e0` | 5.29 | 4.5 | S12 "Rule 01" `button`; S12 "Rule 02" `button` (default, focus-visible, hover, pressed), 24 rows | pass |
| `#05669e` | `#e0f2fe` | 5.38 | 4.5 | S4 "Draft" `span`, 73 rows | pass |
| `#ffffff` | `#1d7a2e` | 5.42 | 4.5 | S4 "Draft saved. You can pick it" `p`; S9 "Rule 01 and Rule 02 are now " `p` (default, focus-visible, hover, pressed), 16 rows | pass |
| `#ffffff` | `#c4271c` | 5.75 | 4.5 | S4 "Delete connection" `kern-label`; S5 "Discard" `kern-label` (default, focus-visible), 37 rows | pass |
| `#c4271c` | `#ffffff` | 5.75 | 4.5 | S5 "*" `kern-form-input`; S6 "Discard connection" `kern-label` (default, focus-visible, hover, pressed), 118 rows | pass |
| `#1d56f0` | `#ffffff` | 5.77 | 4.5 | L1 "Forgot password?" `kern-link--no-visited-state`; L1 "Back to log in" `kern-label` (default, focus-visible, hover, pressed), 2339 rows | pass |
| `#ffffff` | `#1d56f0` | 5.77 | 4.5 | L1 "Log in" `kern-label`; S4 "Create connection" `kern-label` (default, focus-visible, hover, pressed), 707 rows | pass |
| `#595e67` | `#ffffff` | 6.52 | 3 (inactive, faded; task) | S11 "Licence classes" `span`; S11 "B" `span`, 3 rows | pass |
| `#4a5468` | `#e0f2fe` | 6.63 | 4.5 | S9 "Shown instead of the rules’ " `p`, 8 rows | pass |
| `#4a5468` | `#eef1f6` | 6.72 | 4.5 | S5 "Saved only on this device on" `p`; S5 "New, never saved · 09.11.202" `p`, 31 rows | pass |
| `#4a5468` | `#eff1f4` | 6.73 | 4.5 | S4 "Deactivated" `span`, 26 rows | pass |
| `#ffffff` | `#af2218` | 6.85 | 4.5 | S17 "Try again" `kern-label`; S4 "Delete connection" `kern-label` (default, focus-visible, hover), 21 rows | pass |
| `#4a5468` | `#eaf7e6` | 6.87 | 4.5 | S15 "Citizens can now share their" `p`, 13 rows | pass |
| `#4a5468` | `#f8f1fc` | 6.88 | 4.5 | S11 "Personal ID" `span`; S11 "·" `span`, 38 rows | pass |
| `#4a5468` | `#fef1f0` | 6.91 | 4.5 | S7 "e.g. Residents’ parking perm" `kern-form-input`; S13 "Personal ID" `span` (default, focus-visible, hover, pressed), 33 rows | pass |
| `#4a5468` | `#f2f5fb` | 6.97 | 4.5 | L1 "Receive verified citizen dat" `p`; S4 "Name" `span` (default, focus-visible, hover, pressed), 438 rows | pass |
| `#4a5468` | `#f2f5fb` | 6.97 | 3 (disabled, task) | S10 "Choose data" `span`; S10 "Choose check" `span` (default, focus-visible, hover, pressed), 24 rows | pass |
| `#8a22b5` | `#ffffff` | 7.05 | 4.5 | S11 "Changed here" `span`; S11 "Added here" `span`, 8 rows | pass |
| `#4a5468` | `#ffffff` | 7.61 | 4.5 | L1 "Your login is encrypted" `p`; L1 "Ask your admin to reset it. " `p` (default, focus-visible, hover, pressed), 1345 rows | pass |
| `#ffffff` | `#1643c1` | 8.06 | 4.5 | S8 "Add document" `button` (default, focus-visible, hover, pressed), 12 rows | pass |
| `#ffffff` | `#9b1d14` | 8.14 | 4.5 | S4 "Delete connection" `kern-label`; S5 "Discard" `kern-label` (pressed), 19 rows | pass |
| `#0b1220` | `#dbe4fd` | 14.74 | 4.5 | L2 "Your account" `a`; L2 "Log out" `button` (pressed), 49 rows | pass |
| `#0b1220` | `#e0f2fe` | 16.32 | 4.5 | S5 "Starts as a draft. It only b" `p`; S9 "You need to be at least 21, " `div` (default, focus-visible, hover, pressed), 83 rows | pass |
| `#0b1220` | `#eef1f6` | 16.54 | 4.5 | S5 "Unsaved changes in “T098 loc" `h2#_r_7_`; S5 "Unsaved changes in 2 connect" `h2#_r_5_`, 40 rows | pass |
| `#0b1220` | `#edf2fe` | 16.70 | 4.5 | L2 "Your account" `a`; L2 "Log out" `button` (hover), 49 rows | pass |
| `#0b1220` | `#eaf7e6` | 16.89 | 3 (large) | S15 "Your connection is active" `kern-heading-large`, 13 rows | pass |
| `#0b1220` | `#eaf7e6` | 16.89 | 4.5 | S21 "Connection deactivated." `kern-title`, 1 rows | pass |
| `#0b1220` | `#f8f1fc` | 16.92 | 4.5 | S11 "Date of birth (Age)" `span`; S11 "You must be at least 19 year" `p`, 16 rows | pass |
| `#0b1220` | `#fef1f0` | 16.99 | 4.5 | S1 "Username or password is wron" `kern-title`; S1 "Check both and try again." `kern-title` (default, focus-visible, hover, pressed), 99 rows | pass |
| `#0b1220` | `#f2f5fb` | 17.14 | 3 (large) | L1 "Connect to the EUDI Wallet" `h1`; S3 "Create your first connection" `h2`, 27 rows | pass |
| `#0b1220` | `#f2f5fb` | 17.14 | 4.5 | S1 "designer" `kern-form-input`; S1 "wrong-password" `kern-form-input` (default, focus-visible, hover, pressed), 1094 rows | pass |
| `#0b1220` | `#fff4e0` | 17.18 | 4.5 | S8 "The wallet no longer offers " `kern-title`; S9 "This link points to a varian" `kern-title`, 12 rows | pass |
| `#0b1220` | `#ffffff` | 18.72 | 4.5 | L1 "Konnekt" `span`; L1 "Username" `kern-form-input` (default, focus-visible, hover, pressed), 5012 rows | pass |
| `#0b1220` | `#ffffff` | 18.72 | 3 (large) | L1 "Log in" `h2#login-title`; L1 "Forgot your password?" `h2`, 243 rows | pass |
| `#ffffff` | `#0b1220` | 18.72 | 4.5 | S1 "You’re logged out." `p`; S7 "This name helps you and your" `span` (default, focus-visible, hover, pressed), 99 rows | pass |
| `#0b1220` | S16 band gradient `#e0f2fd`–`#f1f5fc` (pixels) | 16.31 | 3 (large) | S16 "This connection is a draft" (the band’s heading, 24/600) | pass (unsure, measured) |
| `#4a5468` | S16 band gradient `#e0f2fd`–`#f1f5fc` (pixels) | 6.63 | 4.5 | S16 "The links can’t be added to your service" | pass (unsure, measured) |
| `#1d56f0` | S16 band gradient `#f1f4fb`–`#f2f5fb` (pixels, under the button) | 5.24 | 4.5 | S16 "Delete draft" `kern-btn--tertiary` | pass (unsure, measured) |
| `#1d56f0` | 8 % tint on the band `#e0e7fa`–`#e1e8fa` (pixels) | 4.66 | 4.5 | S16 "Delete draft" (hover) | pass (unsure, measured) |
| `#1d56f0` | pressed fill `#dbe4fd` (pixels, 3838 of 3838) | 4.54 | 4.5 | S16 "Delete draft" (pressed) | pass after fix 2 (was 4.13 on the 16 % tint over the band) |

### 6.11 Convergence: dates in rule texts (T103, 2026-11-09)

`rules/src/dates.ts` `formatDate` now writes the §3 "Dates" pattern, `dd.mm.yyyy` with leading zeros
(SC-002, FR-021, C3, audit cosmetic 3; carried from T062). The rule statements (`statements.ts`), the
proposed messages (`messages.ts`) and the boundary text (`boundaryPhrase`) all go through it, so they
change together. `MONTH_ABBREVIATIONS` (`rules/src/constants.ts`) was used nowhere else and is removed.
The doc comments in `dates.ts` show the new form. The rule editor's own hint ("Today (…), that means …")
already used `dottedDate()` in `RuleEditor/utils.ts` and doesn't change.

| Text | Before | After |
|---|---|---|
| Statement (a fixed date) | Personal ID · Issue date is before 1 Jan 2020 | Personal ID · Issue date is before 01.01.2020 |
| Proposed message | The expiry date of your class B must be before 30 Jun 2030. | The expiry date of your class B must be before 30.06.2030. |
| Boundary text | born between 24 Oct 2004 and 23 Oct 2005 | born between 24.10.2004 and 23.10.2005 |

Tests updated: `rules/src/dates.test.ts` (10 dates, including the `formatDate` cases `01.01.2020` and
`09.09.2027`), `rules/src/statements.test.ts` (3) and `rules/src/messages.test.ts` (7). Checked and
left alone:
- `evaluation`, `checks/*` and `personas/*` tests: they assert no formatted date. Their old-style dates
  are only in test titles and comments (prose about the day, e.g. "met from 2 Jan 2031 on").
- The frontend's and the MCP's tests: no assertion uses such a date.
- `mcp/plugin/skills/`: no example statement has a date.
- `checks/fixtures/evaluator-vectors.json` (generated, not touched): it has no formatted date. Its only
  dates in words are two case `description`s written by the exporter ("29 February 2000").

The comment in `frontend/src/pages/FormConnectionEdit/types.ts` now reads "04.11.2026, 14:32".

§6.4 (T075), rows U30, U32 and U53: dates are now dd.mm.yyyy (T103).

### 6.12 Convergence: the "Start with" radio's focus (T104, 2026-11-09)

`START_WITH_OPTION_CLASSES.radio` (`frontend/src/pages/FormConnectionEditor/RulesStep/constants.ts`, T064) carried `focus:outline-none!`, against CLAUDE.md's "focus-visible: … never focus:". We tested whether `index.css`'s `.kern-form-check__radio:focus:not(:focus-visible)` (specificity 0,3,0, later than kern.css's unlayered `:focus` / `:checked:focus` rules) already takes KERN's 4 px ring off after a click. It does, so the class was **dropped** instead of being replaced by `[&:focus:not(:focus-visible)]:outline-none!`. The border stays the drawn one because of the `border!` / `checked:border-kern-action-default!` / `hover:not-checked:border-2!` utilities, which are important and layered and so beat both kern.css's `border: 0` on focus and index.css's 2 px KERN border. The doc comment above the constant now names the index.css rule. Afterwards `grep -rnE "[\" ]focus:[a-z]" frontend/src` came back empty.

Where we checked: S9, the rules step of the draft "Führerscheinantrag Stuttgart" (76abafb6…), "+ Add variant" dialog, "Start with" (U37/U38), signed in as `designer`, read-only (the dialog was closed with Escape and nothing was saved). The computed values come from `getComputedStyle` on the focused radio.

| browser | input | outline | border | result |
|---|---|---|---|---|
| Chromium (before: with `focus:outline-none!`) | click "Start empty" | none | solid 1px rgb(29, 86, 240) (selected) | baseline: no ring |
| Chromium (before) | Tab into the group | solid 3px rgb(11, 18, 32), offset 0 | solid 1px rgb(29, 86, 240) | baseline: ring |
| Chromium (class dropped) | at rest, unselected | none | solid 1px rgb(107, 116, 136) | pass |
| Chromium (class dropped) | click "Start empty" / "Linked to Standard" | none | solid 1px rgb(29, 86, 240) | pass: no ring, drawn border |
| Chromium (class dropped) | click, pointer still over it (selected) | none | solid 1px rgb(29, 86, 240) | pass |
| Chromium (class dropped) | other radio focused by click, hover the unselected one | none | solid 2px rgb(29, 86, 240) | pass (hover-unselected look) |
| Chromium (class dropped) | Tab into the group | solid 3px rgb(11, 18, 32), offset 0 | solid 1px rgb(29, 86, 240) | pass: 3 px ring, border kept |
| Chromium (class dropped) | ArrowDown to "Start empty" | solid 3px rgb(11, 18, 32), offset 0 | solid 1px rgb(29, 86, 240) | pass |
| Firefox (MCP, class dropped) | click "Start empty" / "Linked to Standard" (pointer away and over it) | none | solid 1px rgb(29, 86, 240) | pass |
| Firefox (MCP, class dropped) | Tab into the group | solid 3px rgb(11, 18, 32), offset 0 | solid 1px rgb(29, 86, 240) | pass |
| Firefox (MCP, class dropped) | ArrowDown to "Start empty" | solid 3px rgb(11, 18, 32), offset 0 | solid 1px rgb(29, 86, 240) | pass |

Screenshots: `<scratchpad>/phase11/T104/{before,drop}-chromium-{click,tab}.png`; script `<scratchpad>/phase11/T104/focus.mjs`.

§5 row for §6.7: "Start with" radio, click / keyboard: click shows no ring and the drawn 1px border; Tab and the arrow keys show the 3 px focus ring (Chromium, Firefox), pass.

### 6.13 Closing report (T101, 2026-11-09)

The port's evidence against SC-001–SC-007 (quickstart "Done when"), with the items left for a
person, the designer's list and what was not built. Sources: §5, §6.1–6.12, §7, §8.1 and
tasks.md. The §7 greps were run again for this report (2026-11-09). No other check was run again,
and no source file changed.

#### Success criteria

| SC | Evidence | Result |
|---|---|---|
| SC-001 every unit and component has a clean table | **Units**: the audit has 91 screen units, U10–U100 (`figma-audit/units.md`; U01–U09 are annotations and need no table, U101 is research and out of scope). The §5.2 status table names all 91 units: 47 rows, every unit "done". §5.2 holds 52 tables, and every unit has at least one. **Components**: §2 has 33 rows. 31 of them have UI, and each has its §5.1 table: 32 tables, because `InfoTooltip` and `ExplainedButton` have one each. §5.1 also has 13 pattern tables. The "no change" row (`CurrentUserProvider` …) has no UI. The pages' own components are checked in their screens' tables (§5.2). | met. Two notes. (1) One optional row is still open: U47 `6185:41178`, a changed or added member's tint inside a removed group. The design draws it at 40 %; the app shows it at full strength (`RuleRow`, T065). The task called the row optional, and it is on the designer's list. (2) The status row "U58 `6530:40675`" (frame 10.11) draws the details page, not S11. It was handed to the details tasks. Its band and connection menu are verified on the frames of T078's table (`6417:31045`), but no table names `6530:40675` itself. |
| SC-002 the texts equal the frames', differences cite decided items, 0 undecided | Every text row of §5 says `match` or cites an item (C#, F#, W#, CLAR #n, cosmetic n, a baseline id). T103 changed the dates in statements, proposed messages and boundary texts to dd.mm.yyyy (§6.11). The duplicate-name quotes are settled by Q5 / FR-023: the variant stays named (T099). The user decided the rule notes' wording, "Can’t be met together with …", on 2026-11-09 (§6.4). V12.1 found the 20 validation templates word for word in both the rules package and the server (§6.9). | met. 53 rows of §5 carry their task's "UNCERTAIN" tag next to the item they cite. The checkpoints accepted those tags (§6.4–§6.6), so none is undecided. One look question goes to the designer: the delete toast is neutral, where U90 draws it red. |
| SC-003 the removal checklist finds nothing | §7 "Result" (T094): 5 lines are empty, and line 5 lists only identifiers (186 lines, 0 "Connection Portal"). §6.9 V12.2 (T097): the same after T095's and T096's fixes. Run again by T101 after T098–T104: lines 1–4 and 6 empty, line 5 186 identifier lines with 0 "Connection Portal", and the `focus:` grep of T104 empty. | met |
| SC-004 the gates pass; backend and MCP tests unchanged unless a C item changed their copy | §6.9 V12.1 (T097) and T100's gates after T102–T104: lint and build pass; rules 43 files / 2351 tests, frontend 29 / 969, mcp 15 / 408, pytest 1998, ruff and mypy clean (77 source files). The baseline (§8.1, T001) was rules 43 / 2337, frontend 23 / 598, mcp 15 / 408, pytest 1998. Rules +14 (8 of them in phase 2's C items, §8.2), frontend +6 files / +371 tests. The MCP and backend counts are unchanged; their texts changed only by C1, C2, C5 and C7 (§8.2). | met. `rules/src/personas/performance.test.ts` is a known flake: once it missed its 1.5 s budget while pytest ran beside it, and it passed when run again (T097). |
| SC-005 screenshot matrix: 0 screens with sideways scrolling or hidden content | §6.8 (T096): 450 rows, 223 states, each at 1440 px and at 320 px with 200 % zoom (taken as a 160 × 320 CSS px viewport at scale 2), plus L1 at about 1280 and 1000 px. 0 fail after the fixes (the `narrow:` variant and the overlay's narrow block, the header sticky only from 320 CSS px × 480 px, the `ValuesPicker` placement). | met by the chat. The browser's own zoom needs a person (below). |
| SC-006 keyboard run, one h1 per route, 0 AA failures | §6.7 (T095): 57 rows, 56 pass and 1 fixed (the publish status dialog's one polite status). §6.12 (T104): the "Start with" radio shows its ring on keyboard focus only. One h1 per route: §6.7, and S22's route-by-route table (T089). §6.10 (T098): 63 distinct pairs, plus 5 measured on S16's gradient. The first run found 13 failing pairs; 5 changes fixed them, and the final run has 0 failing and 0 undecided. §1.5 holds every fix. | met by the chat. A screen reader needs a person (below). |
| SC-007 the five flows complete as before | V1–V9 were each walked once, at the checkpoints: T046 (V1, V2; §6.2), T054 (V3, V4; §6.3), T075 (V5, V6; §6.4), T085 (V7, V8; §6.5), T089 (V9; §6.6). The flows covered: sign-in to a live connection with rules on a variant (V5–V7), a draft saved, left and resumed (V3), an agent's consent (V9.1), an approval (V9.3). Each checkpoint is unchecked in tasks.md only for its "Needs a person" step. V7–V9 ran against the in-memory fake EUDIPLO. | met by the chat. The hosted EUDIPLO and a real MCP client need a person (below). |

#### The user's decisions during implement

| # | Decision | Where |
|---|---|---|
| #62 (Implement Q1) | A draft row's " · <step> step" is deferred (F71, `deferred.md` group A). | spec.md fifth round |
| #63 (Implement Q3) | The Date of birth's fixed-date checks are restored under "Fixed date" (F34). | sixth round |
| #64 (Implement Q2) | Grouping a group and group checkboxes in select mode are deferred (Q2-I, group B). Figma must change. | sixth round |
| #65 (Implement Q4) | "Save rule" keeps the baseline's press: it flags the missing parts, shows the problem and moves the focus there. | sixth round |
| #66 (Implement Q5) | "Test rules" is explained by the first problem, in the server's words. | sixth round |
| #67 (Implement Q6) | Outside a flow, "Log out" with local drafts on the device keeps the old "Log out and discard unsaved work?" dialog. | seventh round |
| 2026-11-09 (after T075) | The rule notes use the design's "Can’t be met together with …". Number statements carry the symbol chip. | §6.4 |
| 2026-11-09 (T099 → T102) | Constitution 1.2.0 → 1.2.1: a value measured at run time MAY be set as a CSS custom property on an element; it carries no visual style itself. | constitution, CLAUDE.md "Styling" |

#### Needs a person (before merging)

| What | From |
|---|---|
| A screen reader (NVDA with Chrome or Firefox, VoiceOver with Safari) through the five flows: "You’re logged out." and "Unsaved work discarded." (V1.6, V2.1). The failed-save toast with its error ID, and "Saving draft…". V5.7's and V6.5's announcements and focus moves, and the "Save rule" press (#65). "Publishing…" ("Saving…") as the status dialog's name when it takes the focus, "Published. Opening your connection page…" ("Saved. …") read within its 0.5 s, and the failed state's alert with the focus on its ×. "You can go back to {client}." after "Allow". The token dialog's order (title → warning → label → token → warning). The rest of the announcements listed in §6.7. The narrow result table and the narrow toast under 320 CSS px. | T046, T048/T054, T075, T077/T095, T086, T087, T095, T096 |
| The variant dialog's "ⓘ" glyph on a desktop system | T064/T075 |
| Tab past a dialog's last control in a real browser (to the toolbar, then back to ×) | T095 |
| "Leave site?" in Chrome, Firefox and Safari: shown with unsaved work, absent without it and after "Save progress", "Discard connection", "Save and log out" and "Log out anyway". Then the restore dialog after the forced reload. | T054 (V3.6) |
| Publish, deactivate, reactivate and save a revision against the hosted EUDIPLO (credentials in `backend/.env`); approve a publish request there; the 0.5 s "Published" wait by hand | T085, T089 |
| V9 with a real MCP client (Claude Code with `mcp/plugin/` against the MCP server on 3100) | T089 |
| The browser's own zoom: Chrome and Firefox at 200 % on a 320 px window, and 400 % on 1280 × 1024 | T096 |
| V13.3's timings by eye in Chrome and Firefox (pill 240 ms, colours 150 ms, page fade 150 ms, accordion 200 ms); V13.1 and V13.2 on a real device with the system settings | T097 |
| Tell the designer the list below, including whether the 68 % disabled look still reads as disabled | T098, T101 |
| Commit `new-design` from the other machine and open the PR with `pr.md` (git is read-only here) | T101 |

#### For the designer (told 2026-11-09 by this report; a person passes it on)

| # | Item | Where |
|---|---|---|
| 1 | `feedback-info` `#0284c7` → `#0273ae` for info text on white (4.10 → 5.17:1) | §1.5 row 1 (T002) |
| 2 | The same `#0273ae` on the info strips' `#e0f2fe` (3.57 → 4.50:1). The "Draft" pill keeps its drawn `#05669e`. | §1.5 row 2 (T002, T019) |
| 3 | The danger outline button's pressed tint is 15 % (`#f6dfdd`, 4.52:1), where KERN uses 16 % | §1.5 row 3 (T035) |
| 4 | The primary button's pressed shade mixes 11 % white (`#356df4`, 4.52:1), where KERN mixes 16 % (`#4076f6`) | §1.5 row 4 (T098) |
| 5 | An outline or tertiary button's pressed tint is one solid fill mixed over white (`#dbe4fd`, 4.54:1), not laid over the tinted surface | §1.5 row 5 (T098) |
| 6 | Disabled controls at 68 % opacity instead of KERN's 40 % (3.17–3.37:1) | §1.5 row 6 (T098) |
| 7 | Disabled buttons keep their resting fill on hover and while pressed | §1.5 row 7 (T098) |
| 8 | The faded inactive parts (removed rule, faded connector, inactive marks, disabled menu entries and access levels) at the same 68 % | §1.5 row 8 (T098) |
| 9 | Narrow layouts under 320 CSS px, which have no frames: the stacked status band, rows with the ⋯ under the text, the wrapped header pill, the status pill's label wrapping, the toast in the page's flow (sticky) instead of floating | §6.8 (T096) |
| 10 | The header is sticky only in windows at least 320 CSS px wide and 480 px tall; below that it scrolls away with the page (WCAG 1.4.10) | §6.8 (T096) |
| 11 | Copy with no frame on the sign-in page: "Logging in…", and the 5xx / network alert "Logging in failed." / "Try again in a moment." | T040 (W2, FR-008) |
| 12 | Toast copy with no frame on the test step: "Results updated." alone, and "Results updated. <name> no longer meets <rule>." | T072 (FR-042c) |
| 13 | The delete toast is neutral (`ToastKind` has no danger) and has no "Undo" (F4), where U90 draws a red toast with "Undo" | T044, T082 |
| 14 | Toasts with an action ("Undo") have no ×. They stay until used or dismissed with Escape, so a mouse user can close one only by using it (U10, U51 draw none). | T099 |
| 15 | "Konnekt" is set in Fira Sans 600, where the design uses Geist SemiBold. Geist would be a new dependency. | T031, T099 |
| 16 | Deleting a published connection that was deleted meanwhile shows the server's message with "Try again"; the draft's 404 offers "Go to overview" | T082, T096 |
| 17 | The entry dialog reads "Edit “<name>”?" for a deactivated connection too. FR-045 says "a published connection", and the frames draw only the active row. | T083 |
| 18 | A changed or added rule inside a removed group keeps its tint at full strength, where U47 `6185:41178` draws it at 40 % (optional, not built) | T065 |
| 19 | Figma must change (#64): no "Group with other rules" on a top-level group (U57 #22), no group checkboxes in select mode (U36, U40 #13, U64 #22) | spec.md sixth round |
| 20 | The details band: the ⋯ and "Activate again" sit in the band's top-right chip. "Delete draft" sits at the right end of the draft band (F56, no frame). | T078, T080, T081 |
| 21 | Consent page (no frames): the h1 in the card heading's style, the card top-aligned, "Deny" before "Allow" in equal columns | T086 |
| 22 | Approval page (no frames): a publish request shows the publish summary and then the draft's Summary card, so the counts appear twice. A failed approve is a danger alert with the error ID and "Try again", not a toast. | T088 |
| 23 | The decided "Figma must change" list of the audit, for the frames to be redrawn | `figma-audit/report.md` "Figma must change (decided)" |

#### Not built (deferred.md)

23 items, each drawn in the design and each needing a change outside the frontend (Clarification
2026-11-06 #1):

- **Group A, stored data the backend lacks** (13):
  - F1 go-live scheduling
  - F2 the Activity card
  - F4 undo after deleting a connection
  - F5 a live connection's pending changes kept as a draft
  - F13 deactivation that lets started requests finish
  - Q9 (b) "Start from an example"
  - Q13 the email line in the user menu
  - Q14 (e) drag reordering of documents
  - Q31 (a) the met citizen's success message
  - Q37 (b) "Download PDF"
  - Q37 (c) status dates
  - F71 a draft row's step (#62)
  - Q11 bulk delete on the overview
- **Group B, rules-package capabilities** (6):
  - Q2-I grouping a group (#64)
  - F7 "Remove from group"
  - F8 "Duplicate group"
  - F9 adding into an empty group
  - F10 "Unlink from Standard"
  - F11 personas that make every rule testable
- **Group C, product-wide** (4):
  - F3 "Coming soon" documents
  - F6 the DE/EN switch
  - F12 view-only users and roles
  - Q14 (f) field groups

#### Known and left as they are

- The expired sentence after a `409` comes from the server in German time. The approval page's own
  "expired at" uses the browser's time zone. This is the baseline, and the two agree for users in
  Germany (T088).
- Accessibility tree (T095):
  - The connector's name reads "AND , switch Standard to AND or OR"; a screen reader pauses at the
    comma only.
  - The rules step's tab and its findings icon are two stops, both named "Standard has findings"
    (by design).
  - The selection bar's status is inserted together with its text.
  - "Copy" in the "Copy to variant" popover (nothing ticked) and "Group rules" (fewer than two
    ticked) are `aria-disabled` with no explanation (baseline).
- The 3:1 threshold for disabled and faded text is this feature's own threshold; WCAG exempts
  inactive components (T098).
- V12.3 is not literally empty: 8 lines in `mcp/plugin/` name the tool `test_applicants` and its
  fields. These identifiers are kept by FR-019, FR-020 and R2, and the prose says "citizens" (T097).
- The old-form dates in test titles and comments of `checks/*` and `personas/*` are prose about
  days, not assertions (T103).
- Known duplication, not refactored (T100):
  - `FormConnectionList/FormConnectionRow.tsx` copies `InfoTooltip`'s private `useTooltip`.
  - `RuleEditor/utils.ts` `dottedDate()` and `boundaryWords()` duplicate `formatDate()` and
    `boundaryPhrase()` of `rules/src/dates.ts`.

  Both need a browser check before a refactor. A check that compares rule texts with the design
  should expect "01.01.2020".
- Closed in phase 11:
  - The coordinator fixed the stale `noRules` comments (`PublishDialog.tsx`, `types.ts`).
  - §7's "Also" paragraph is done (T100).
  - The README's list of specs names 001, 002, 007 and 008 (T100).

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

### Result (T094, 2026-11-09)

Run from the repository root after T090–T093 (each command of the block above, plus T092's
unused-component loop):

| Line | Command | Output |
|---|---|---|
| 1 | `index.css`: nothing of the old design | empty |
| 2 | KERN 2.8 hexes, the 248 px menu | empty (the last hit, `#131525` in the unused `icons/logout.svg`, went with T091) |
| 3 | five steps, the old product name | empty |
| 4 | assets nobody imports | empty (T091 deleted 17 icons and 2 illustrations, and `utils/documentGlyphs.ts`) |
| 5 | old texts outside the frontend | 186 lines, identifiers only (FR-019, FR-020, §8.2): `applicantOf` and its siblings, the oracle's `applicantsOn()`, variables and parameters named `applicant`, the type `Applicant`, `ApplicantField`, `applicantFieldsOf`, the MCP tool `test_applicants` and the fields `applicants`, `applicant`, `applicant_fields`, named in backticks in the guidance (`mcp/plugin/`, 8 lines) and `docs/ARCHITECTURE.md` (2 lines); no "Connection Portal"; no string a person reads says "applicant" (T093's classification, the coordinator's check of the string literals) |
| 6 | superseded doc rules | empty (T093 rewrote `docs/FIGMA-WORKFLOW.md`'s history note) |
| — | components and pages no module imports | empty (T092 deleted `TestStep/PersonasAnnouncer.tsx`) |

The "Also" paragraph: `docs/FIGMA-WORKFLOW.md`'s list and spec 002's §9 note and `figma-audit/units.md`
note are done (T093); `docs/ARCHITECTURE.md`, `docs/KERN-DESIGN-SYSTEM.md` and `CLAUDE.md` are
T100's (phase 11).

Kept on purpose: all seven `KERN_TRANSLATIONS` entries (the kit's prop type requires every key;
`loading` and `closeDialog` are read directly); the arbitrary colours left in classes (`#e4e8ef`,
`#0284c7`, `#05669e`, `#eff1f4`, `#8c94a1`, `#d9dee8`, `#eff1f5`) are Revamp values recorded here,
none of KERN 2.8; the editor's `EditorState.dialogOpen`, `publishError`, `rulesChanged` (its
reducer tests read them). New `@theme` tokens of T090: `--color-action-pressed` (#1643c1),
`--color-action-tint` (#eef3fe), `--color-card-divider` (#d0d5dd) (§1.3).

Gates: `npm run lint`, `npm run build` pass (Vite's chunk-size warning stays); `npm test`: rules
43 files / 2351 tests, frontend 29 / 969, mcp 15 / 408, all passed. `backend/` (unchanged in this phase): `ruff check` all checks passed, `ruff format --check` 86 files already formatted, `mypy` no issues in 77 source files, `pytest` (`template_db_test`) 1998 passed (9 min 44 s).

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
- **2026-11-18, bug v5-ui-fixes** (`.specify/bugs/v5-ui-fixes/assessment.md`): superseded the
  test step’s panel-wide scrolling where the cards sit side by side (F43; spec Clarification
  2026-11-18 #1; T073’s note), the "No findings." ⓘ on a variant tab (#2; §2 `BranchName`),
  the log-out dialog’s "Cancel" (F20, #3; T048’s and T047’s rows), KERN’s 4 px focus ring on
  text fields (now 2 px; §5.1 TextField’s note) and the documents list’s trash ("Remove
  document" is in the row’s ⋯; spec 010’s Clarification 2026-11-18; T052’s note). The rows
  that record them are marked history in place.

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

### 8.3 Decisions superseded while building (T100, 2026-11-09)

What the port replaced after pass C, with where the current decision lives. The older entries
above (the 248 px menus, "map by name", the inner scroll) stay as they are.

| Superseded | By | Where it is recorded now |
|---|---|---|
| `brief.md` as the plan of record | `plan.md` and `tasks.md` from pass C on; `brief.md` is history (its status line, T100) | `brief.md` head |
| The five labelled wizard steps (Connection, Documents, Rules, Test, Publish) and the details' all-done progress | "Step n of 4" (Connection, Documents, Rules, Test) and the publish dialog (Q7) | `CONNECTION_STEPS`; ARCHITECTURE "frontend" |
| A sign-in without a requested route goes to `/get-started` (spec 001 FR-022) | it lands on `/`, the welcome page or the overview (FR-027, T042); `/get-started` is opened by the welcome page's "Create connection" | `RequireSignedOut/utils.ts` `redirectTarget()`; ARCHITECTURE "frontend", routing |
| The wizard's inner scroll, `split:` and the whole frame scrolling under 480 px tall | the page scrolls; the step header pins from 768 × 640 (`wizard-pinned:`), the footer sticks from 480 px tall (T033) | ARCHITECTURE "frontend", "Layouts" |
| `TopBar` sticky at every size (T031, T033) | sticky only from 320 CSS px wide and 480 px tall; `--wizard-sticky-top` counts it only then (T096, WCAG 1.4.10) | `TopBar`; ARCHITECTURE "Layouts" |
| The toast fixed above the footer at every width | sticky at the window's bottom under 320 CSS px (`narrow:`, T096) | `Toast/constants.ts`; ARCHITECTURE "Layouts" |
| No layout below 320 CSS px | the `narrow:` variant and the narrow block of `index.css` (T096) | KERN-DESIGN-SYSTEM §3.1; CLAUDE.md "Narrow windows" |
| Constitution 1.2.0, "inline styles are forbidden" without exception; T033's "the one place a measured value is set as a custom property" | constitution 1.2.1 (T102): a measured value may be set as a custom property; two call sites, `WizardLayout` on `<html>` (`--wizard-sticky-top` / `-bottom`) and the rules step's tab row (`--rules-tabs-height`) | constitution; CLAUDE.md "Styling"; ARCHITECTURE "Layouts" |
| KERN's disabled opacity 0.4; §1.1's "Opacities … no entry" | 0.68 in the overlay (T098) | §1.5 (T098 rows); KERN-DESIGN-SYSTEM §3.1 |
| KERN's pressed shade (16 % white) and pressed tints laid over the surface | 11 % white for the primary button; tints mixed over white as one fill; the disabled buttons' fill pinned on hover and while pressed (T098) | §1.5; `index.css`; KERN-DESIGN-SYSTEM §3.1 |
| Q8 (e)'s "Dropped: Log out and discard unsaved work?" outside a flow; T048's and T096's "retire both" notes | #67 (Implement Q6): the old dialog stays outside a flow, and after the editor's question for the account's other records | spec.md #67; ARCHITECTURE "Local drafts (spec 005)" |
| Dates in statements, proposed messages and boundary texts as "1 Jan 2020" | dd.mm.yyyy, "01.01.2020" (cosmetic 3, T103) | §6.11 |
| `focus:` on the "Start with" radio | KERN's radio with `index.css`'s click-focus rule (T104) | §6.12 |
| CLAUDE.md "Only `hooks/useLocalDraftStore.ts` touches `localStorage`" | "Only `useLocalDraftStore` and `useRememberedHomepage` touch `localStorage`" (T039, T100) | CLAUDE.md; ARCHITECTURE "Local drafts (spec 005)" |
| CLAUDE.md "Popups pick their side with `placementFrom()`; never `left-0` / `right-0` alone" | menus, tooltips and popovers placed by `placementFrom()`'s class sets (side, direction, max-height step), never with inline coordinates (research R10) | CLAUDE.md; ARCHITECTURE "Popups" |
| `--shadow-chip`, `utils/documentGlyphs.ts`, 17 icons and 2 illustrations of the old design | deleted (T090, T091) | §7 Result |
| Spec 002's `figma-audit/` node ids | stale since the redraw of 2026-11 (T093) | its `units.md` head |

### 8.4 Where the record lives (T100, 2026-11-09)

The documentation checklist (CLAUDE.md "Documentation checklist", FR-017) after the port:

| Document | What it now says |
|---|---|
| `docs/ARCHITECTURE.md` "frontend" | the three route groups (L1–L4; `/` renders `AppLayout` itself, its loading page none), the page scroll and what stays put (header from 320 CSS px × 480 px, step header from 768 × 640, footer from 480 px tall, the toast under 320 CSS px), the two measured custom properties, `placementFrom()`'s class sets, `ConfirmDialog` and the scrim rule, the overlay and the two variants, the four steps and the publish dialog, the documents step's view reducer, the header pills and the leave model, the homepage and `useRememberedHomepage`, the details' checks in the browser, where the design's decisions are recorded |
| `docs/ARCHITECTURE.md` "Local drafts (spec 005)" | the homepage flag `connection-portal:local-draft:v1:<username>:homepage:has-connections` (the `:` in its tail keeps the store from listing it), the two `localStorage` users, #67's dialog as the one exception to Q8 (e), the offers on the welcome page, the overview and `/get-started` |
| `docs/KERN-DESIGN-SYSTEM.md` §3.1 | what the overlay sets (with 0.68 and the 11 % pressed shade), the table of scoped overrides (with kern.css's hover selector list and the disabled-hover pin), `wizard-pinned:`, `narrow:` and its block |
| `docs/FIGMA-WORKFLOW.md` | spec 008's notes first, 001's and 002's as history (T093) |
| `CLAUDE.md` "Frontend rules" | "KERN Revamp" (overlay names, `@theme` for the rest), "Narrow windows" (`narrow:`), "Popups" (class sets), "Dialogs" (scrim), beside T102's "Styling"; spec 005's `localStorage` rule widened |
| `README.md` | Konnekt as the management UI's name (intro, the approval page, the tree, the accounts); spec 008 named among the specs; no new dependency |
| `brief.md` | status: history from pass C on; `plan.md` and `tasks.md` are the record |

Gates after T100: `npm run lint`, `npm test` (rules 43 files / 2351 tests, frontend 29 / 969,
mcp 15 / 408), `npm run build`: all pass. Backend untouched.
