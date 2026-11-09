# feat(008): the whole frontend in the KERN Revamp design (Konnekt)

## Summary

Spec 008 ports the management UI to the KERN Revamp design (Figma "Middleware – V5"). The redesign
lands as one change (FR-018): no screen is left in the old design.

- **Frontend**:
  - Every route is rebuilt on the Revamp token overlay in `index.css` (design-notes §1), the
    component decisions of §2 and the patterns of §3.
  - Layouts: L1 sign-in, L2 signed-in shell, L3 the wizard, with "Step n of 4", a page scroll, and
    a sticky header and footer, and L4 the details.
  - The create and edit flows, the rules step with variants and findings, the test step, the publish
    dialog, the details, and the account, consent and approval pages (S1–S22).
  - Motion (§4) honours `prefers-reduced-motion`. The UI stays light only.
- **Copy outside the frontend** (C1–C7, design-notes §8.2):
  - C1: "Konnekt" replaces "Connection Portal".
  - C2: "citizen(s)" replaces "applicant(s)" in every text.
  - C3: the statements and proposed messages, with dates as dd.mm.yyyy (T103).
  - C4: the finding texts.
  - C5: the sign-in and duplicate-name messages.
  - C6: the persona texts.
  - C7: "Enter a name for the connection."

  These texts reach the backend, the rules package (`@connection-portal/rules`) and the MCP server
  and its guidance (`mcp/plugin/`). Code identifiers keep their names (FR-019, FR-020): the
  `@connection-portal/*` scope, `test_applicants` and the local-draft key.
- **Removed**: the old design's tokens, overrides, 17 icons, 2 illustrations and unused components
  (design-notes §7).
- **Documentation**: `docs/ARCHITECTURE.md`, `docs/KERN-DESIGN-SYSTEM.md`, `docs/FIGMA-WORKFLOW.md`,
  `CLAUDE.md` and `README.md` (design-notes §8.4). No new dependency and no new environment
  variable.
- **Constitution 1.2.0 → 1.2.1** (PATCH, amended 2026-11-09, the user's decision):
  - Change: the frontend paragraph of "Technology and Structure Constraints" now says that a value
    measured at run time MAY be set as a CSS custom property on an element for classes to read. It
    carries no visual style itself.
  - Rationale: the wizard's step header and the rules step's tab row stick under a header whose
    height varies with the window and wrapped text.
  - The two call sites: `WizardLayout` sets `--wizard-sticky-top` and `--wizard-sticky-bottom` on
    `<html>`, and `RulesStep` sets the tab row's height.
  - Scope: no principle is removed or redefined; code that complied still complies. CLAUDE.md
    "Styling" carries the matching sentence, and the sync impact report is at the top of
    `.specify/memory/constitution.md`.

Decisions taken during implementation (spec.md Clarifications #62–#67):

| # | Decision |
|---|---|
| #62 | A draft row's step is deferred |
| #63 | The Date of birth keeps its fixed-date checks |
| #64 | Grouping a group is deferred |
| #65 | "Save rule" keeps the baseline's press |
| #66 | "Test rules" is explained by the first problem |
| #67 | The old log-out dialog stays outside a flow |

Also decided by the user on 2026-11-09: the design's wording for conflict notes, and symbol chips on
number rules.

## Verification

| Criterion | Evidence (design-notes) | Result |
|---|---|---|
| SC-001 a clean table for every unit and component | §5.2: all 91 units U10–U100 are "done" (52 screen tables). §5.1: 32 component tables for §2's 31 components with UI, plus 13 pattern tables. | met. One optional row is open: U47's 40 % tint in a removed group. |
| SC-002 texts equal the frames'; differences cite decided items | §5's text rows; dates as dd.mm.yyyy (§6.11); the 20 validation templates match the server word for word (§6.9) | met, 0 undecided |
| SC-003 removal checklist empty | §7 (T094), §6.9 V12.2 (T097), run again 2026-11-09 (T101): empty, or identifiers only | met |
| SC-004 gates | lint and build pass; rules 2351 (baseline 2337), frontend 969 (598), mcp 408 (408), pytest 1998 (1998); ruff and mypy clean | met |
| SC-005 0 screens with sideways scroll or hidden content | §6.8: 450 rows, 223 states at 1440 px and at 320 px / 200 %; 0 fail after the fixes | met by the chat |
| SC-006 keyboard, one h1, 0 AA failures | §6.7: 57 rows, 56 pass, 1 fixed. §6.12: the radio's focus. §6.10: 63 distinct pairs; the 13 failing pairs of the first run were fixed, 0 failing now. | met by the chat |
| SC-007 the five flows as before | V1–V9: §6.2–§6.6 (T046, T054, T075, T085, T089). V7–V9 ran against the in-memory fake EUDIPLO. | met by the chat |

The full report is in design-notes §6.13.

## Needs a person before merging

- [ ] A screen reader (NVDA or VoiceOver) through the five flows: the toasts, "Saving draft…", the
  findings' status, "Publishing…" / "Published. Opening your connection page…", "You can go back
  to {client}.", the token dialog's order, and the narrow result table (§6.7, §6.13).
- [ ] "Leave site?" in Chrome, Firefox and Safari, then the restore dialog after the reload (V3.6).
- [ ] Publish, deactivate, reactivate, save a revision and approve a publish request against the
  hosted EUDIPLO; time the 0.5 s "Published" wait by hand.
- [ ] V9 with a real MCP client (Claude Code with `mcp/plugin/` against the MCP server on 3100).
- [ ] The browser's own zoom: 200 % on a 320 px window, and 400 % on 1280 × 1024 (Chrome, Firefox).
- [ ] The motion timings by eye (pill 240 ms, colours 150 ms, page fade 150 ms, accordion 200 ms).
  Dark mode and reduced motion on a real device.
- [ ] The variant dialog's "ⓘ" glyph on a desktop system. Tab past a dialog's last control in a
  real browser.
- [ ] Tell the designer the list below.

## For the designer

| # | Item |
|---|---|
| 1–2 | `feedback-info` `#0284c7` → `#0273ae` for text, on white and on the info strips (AA). The "Draft" pill keeps its drawn `#05669e`. |
| 3 | The danger outline button's pressed tint is 15 %, not 16 % (AA) |
| 4 | The primary button's pressed shade mixes 11 % white, not 16 % (AA) |
| 5 | The pressed tint of outline and tertiary buttons is one fill mixed over white, not laid over a tinted surface (AA) |
| 6–8 | Disabled controls and faded inactive parts at 68 % opacity, not 40 %. Disabled buttons keep their resting fill on hover and while pressed. |
| 9 | Narrow layouts under 320 CSS px, which have no frames: stacked band, the ⋯ under the row text, wrapped pills, the toast in the page's flow |
| 10 | The header is sticky only from 320 CSS px wide and 480 px tall |
| 11 | Sign-in copy with no frame: "Logging in…", and "Logging in failed." / "Try again in a moment." |
| 12 | Test-step toasts with no frame: "Results updated." and "… no longer meets …" |
| 13 | The delete toast is neutral and has no "Undo" (U90 draws it red with "Undo") |
| 14 | Toasts with an action have no × |
| 15 | "Konnekt" is set in Fira Sans 600, not Geist SemiBold |
| 16 | A published connection deleted meanwhile: "Try again". A draft: "Go to overview". |
| 17 | "Edit “<name>”?" also for a deactivated connection |
| 18 | A changed member's tint in a removed group is at full strength, where U47 draws 40 % |
| 19 | Figma must change (#64): no grouping of groups, no group checkboxes |
| 20 | The details band's top-right chip (⋯, "Activate again"), and "Delete draft" in the draft band |
| 21–22 | The consent and approval pages have no frames: the card layout, "Deny" before "Allow", the approval page's counts shown twice, a failed approve as an alert |
| 23 | The audit's decided "Figma must change" list (`figma-audit/report.md`) |

## Not built (deferred.md)

Each item is drawn in the design but needs a change outside the frontend (Clarification 2026-11-06
#1).

- **Group A, stored data** (13):
  - F1 go-live scheduling
  - F2 the Activity card
  - F4 undo after delete
  - F5 pending changes of a live connection
  - F13 started requests finishing after deactivation
  - Q9 (b) "Start from an example"
  - Q13 the email in the user menu
  - Q14 (e) document reordering
  - Q31 (a) the success message
  - Q37 (b) "Download PDF"
  - Q37 (c) status dates
  - F71 a draft row's step
  - Q11 bulk delete
- **Group B, rules package** (6):
  - Q2-I grouping a group
  - F7 "Remove from group"
  - F8 "Duplicate group"
  - F9 adding into an empty group
  - F10 "Unlink from Standard"
  - F11 personas for every rule
- **Group C, product-wide** (4):
  - F3 "Coming soon" documents
  - F6 DE/EN
  - F12 roles
  - Q14 (f) field groups

## Base branch

`new-design` builds on spec 007 (`mcp`). In this checkout's last fetch, `origin/main` did not
contain spec 007 yet. If that is still so, open this PR against `mcp`, or after 007's PR is merged,
so that it shows only spec 008's commits.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
