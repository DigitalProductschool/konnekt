# Contract: the language switch and the header

**Requirements**: FR-001, FR-002, FR-003, FR-010, FR-011, FR-015, FR-016. **Decisions**: research
R2, R7, R9. **Design**: Figma "Middleware – V5" (`s8mU9oJDq3411e8bxMjQO9`), the node "Pill ·
Language (globe + DE | EN)" `7341:101654` in "Shell/Header · two pills" (`6688:41392`), identical
as `7341:101661` in "Shell/Header · in a connection" (`6698:43392`) and as an instance in the
signed-out header of U10 (`6701:39367`). Spec 008's header is the baseline for everything else
(design-notes §2 of spec 008, `TopBar`, W2).

## Anatomy (from the node, 2026-11-09)

```text
Right · language + account   (7354:60279)  152 × 48, flex, gap 4, after the stretching spacer
├── Pill · Language           (7341:101654)  92 × 48, bg layout-background-hued #f2f5fb,
│   │                                        radius circle, shadow Elevation/Card, padding 0 4, gap 4
│   ├── (Globe, hidden in every frame: not built)
│   ├── DE                    (7341:101656)  40 × 40, radius circle, transparent; "DE" label/small
│   └── EN (current)          (7341:101658)  40 × 40, radius circle, bg white,
│                                            shadow 0 1px 2px rgba(18,20,38,.12); "EN" label/small
└── Pill · Account            (6688:41398)   56 × 48, spec 008's account pill (hidden signed out)
```

`label/small`: Fira Sans 600, 14 px / 24 px, letter-spacing 0, the "DE" / "EN" text box 17 × 24
centred in the segment (padding 8 top and bottom, 11.5 at the sides). Tabular figures are set on
the text in the design (`"tnum"`); the labels are letters, so no CSS is needed for it.

## Tokens and classes

| Part | Figma | Build |
|---|---|---|
| Pill | `#f2f5fb`, radius 9999, shadow Elevation/Card | `bg-kern-layout-background-hued rounded-kern-circle shadow-card h-48 px-4 gap-4 flex items-center` (the same `PILL_CLASSES` base as the other pills) |
| Segment | 40 × 40, radius 9999 | `size-40 rounded-kern-circle flex items-center justify-center` |
| Current segment | white, `0 1px 2px rgba(18,20,38,.12)` | `bg-white shadow-segment` (new `@theme` token `--shadow-segment: 0 1px 2px rgb(18 20 38 / 0.12)`) |
| Current label | `#1f2433` | `text-kern-layout-text-default` (`#0b1220`; deviation D2, Complexity Tracking) |
| Other label | `#6b7380` (4.38:1 on `#f2f5fb`) | `text-kern-layout-text-muted` (`#4a5468`; AA fix D1, design-notes §1.1) |
| Label type | label/small | `text-kern-small-static font-semibold leading-kern-medium-static` (the classes spec 008 uses for `label/small`) |
| Hover (not drawn) | — | the inactive segment `hover:bg-kern-action-default/8` (spec 008's hover shade for transparent controls); `.motion` colour transition 150 ms; decision D3 |
| Focus | as the other header controls | `FOCUS_RING_CLASSES` (keyboard focus only, `focus-visible:`) |
| Signed out | the same pill (U10's instance: unchanged, account pill hidden) | no `signedOut` variant on the switch |

## Placement in `TopBar`

| Width | Row | Order |
|---|---|---|
| ≥ `md` | one row | Konnekt pill · connection pill (if `title`) · meta · spacer · **right group: switch, 4 px, account pill** |
| < `md` (W2) | row 1 | Konnekt pill · spacer · **right group** |
| | row 2 | connection pill (`basis-full`) |
| | row 3 | meta (`basis-full`) |

The right group is one `div` (`flex items-center gap-4 shrink-0`, order 3 below `md` / order 5
at `md`) holding the switch and `children` (the account pill, absent signed out). The gaps between
the pills stay spec 008's (16, or 8 in a connection); the 4 px gap is inside the right group only.
Every layout that renders `TopBar` (`AppLayout`, `AuthLayout`, `WizardLayout`, the
`HomepageLoader`) shows the switch without a change of its own (FR-001).

## Semantics and behaviour

```html
<div role="group" aria-label="Language | Sprache">
  <button type="button" lang="de" aria-label="Deutsch" aria-current="true">DE</button>
  <button type="button" lang="en" aria-label="English">EN</button>
</div>
```

- The group's label is in the current language ("Language" / "Sprache"); each button's
  accessible name is the language's own name, pronounced in that language through `lang`
  (FR-011, SC-005). The visible "DE" / "EN" is a prefix of the name (WCAG 2.5.3).
- `aria-current="true"` marks the current language; the current button is not disabled (it stays
  a Tab stop so the group reads as two choices); activating it does nothing.
- Activating the other button calls `setLanguage(code)` and nothing else: no navigation, no
  request, no form submission, no save (FR-003). React re-renders with the other copy tables;
  the wizard's step, open dialogs, menus, the rule editor's values, selections and the scroll
  position are untouched because no component unmounts for the switch (the layouts and pages keep
  their keys; **nothing re-keys on the language**).
- Keyboard: Tab reaches both buttons in the header's order (after the connection pill's link,
  before the account pill); Enter and Space activate; the focus ring shows for keyboard focus
  only.
- `document.documentElement.lang` follows the language before paint (`useLayoutEffect` in
  `LanguageProvider`), `document.title` follows through `useDocumentTitle` (FR-010).
- Motion: none for the switch itself beyond the 150 ms colour transition; the header's existing
  animations are unaffected.

## States to verify (per-node loop, design-notes §2)

| State | Where | Expected |
|---|---|---|
| Signed out | `/login` | Konnekt pill white, switch hued, no account pill; the switch 16 px from the right edge |
| Signed in | `/` | switch, 4 px, account pill |
| In a connection | `/form-connections/:id` | the right group after the spacer; the connection pill and meta unchanged |
| Scrolled | any, `scrollY > 0` | the header white, the switch unchanged |
| Below `md` | 320 px, 200 % | row 1 holds Konnekt, spacer, switch (and account); no horizontal scroll |
| German current | after a switch | "DE" segment white, "EN" muted; `aria-current` moved; `<html lang="de">`; the tab title German |

## Where the switch is not

The integration answers to serviceBW, what EUDIPLO and the wallet show, the MCP server's tools
and skills, the account CLI and the documentation: unchanged (FR-017; spec, Out of Scope).
