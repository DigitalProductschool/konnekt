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
| | | | | | | |

### 2.2 The German walk (quickstart V1–V9)

Template: `screen (S#) | state | width | english text left | layout | result | fix`. Filled by
phases 5 and 6; one row per screen of spec 008's contract and width.

| screen | state | width | english text left | layout | result | fix |
|---|---|---|---|---|---|---|
| | | | | | | |

### 2.3 Contrast (V1)

| pair | where | ratio | result |
|---|---|---|---|
| | | | |

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
