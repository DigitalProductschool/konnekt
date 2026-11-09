# Implementation Plan: Port the redesigned UI (KERN Revamp) and remove the old design

**Branch**: `new-design` (feature directory `specs/008-kern-revamp-redesign/`) | **Date**:
2026-11-07 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/008-kern-revamp-redesign/spec.md`, with its
Clarifications of 2026-11-06 (#1–#3) and 2026-11-07 (#1–#61), the Figma audit
([figma-audit/report.md](figma-audit/report.md), closed on 2026-11-07 with 0 open items: F1–F72,
W1–W22, C1–C7) and the kit's inventory and tokens ([figma-audit/kit/](figma-audit/kit/)).

**Note**: git in this checkout is read-only (an rsync mirror, [brief.md](brief.md) §2.7), so
`setup-plan.sh` resolved the feature from `.specify/feature.json` and reports the branch as
`008-kern-revamp-redesign`; the branch the user commits on the other machine is `new-design`.
This plan absorbs the brief's pass plan (§3): from here on `plan.md` and `tasks.md` are the
record, and the brief is history.

## Summary

Every screen and every component of the management UI gets the layout, styling and wording of
Figma "Middleware – V5", drawn on the designer's KERN Revamp, and nothing of the old design
remains. The app's behaviour stays as specs 001–007 define it, except for the drift items decided
in clarify (FR-019 to FR-052). The backend, the rules package and the MCP server change only for
the seven adopted copy items.

**Technical approach** (research R1–R15):
- **One overlay block** in `index.css` sets every KERN variable whose Revamp value differs from
  KERN 2.8.2's, under KERN's own names, so that `kern.css`, the React kit and the Tailwind theme
  pick the new values up; the packages stay (R1). Each component is then built one of three ways,
  recorded in [design-notes.md §2](design-notes.md#2-component-decisions): KERN's class with the
  overlay, KERN's class plus a scoped override, or own markup after the kit's anatomy.
- **The copy outside the frontend** (C1–C7) changes first, in the backend, the rules package, the
  MCP server and its guidance, with their tests, so that the frontend's word-for-word mirrors are
  settled before the screens are built (R2).
- **The shells** are rebuilt in place: the two-pill header, the compact "Step n of 4" header, the
  sticky 72 px footer, page scroll, the 832 px details column with the status band, the sign-in
  frame (R4); motion is CSS with a reduced-motion rule (R5).
- **Evidence**: every unit of the audit and every component gets a verification table in the
  design notes, filled by the per-node loop of `docs/FIGMA-WORKFLOW.md` with the Playwright MCP
  tools; pass I adds the screenshot matrix and the keyboard run (R3).
- **The flows** are rebuilt story by story (R12), the welcome page with its device memory (R6),
  the documents step as a master-detail with its own reducer (R8), the leave model as a state
  machine (R9), menus and tooltips placed with class sets (R10), the published details running the
  rule checks in the browser (R7).
- **Removal** is a grep checklist run as its own pass (R13).

## Technical Context

**Language/Version**: TypeScript 6.0 with React 19.2 (frontend, the rules package, the MCP
server); Python 3.13 (backend, texts only).

**Primary Dependencies**: unchanged (FR-014, constitution IV): `@kern-ux/native` 2.8.2,
`@kern-ux-annex/kern-react-kit` 2.40.0, `@digitalservicebund/kern-ux-tailwind-theme` 4.0.0,
Tailwind CSS 4, React Router 7, Vite 8, Vitest 4. No icon font, no animation library, no
Playwright dependency (the MCP tools run the browser checks). The Revamp has no package; its
values live in the overlay block.

**Storage**: no database or API change (FR-007). The browser keeps one new `localStorage` flag
per account, the homepage memory (research R6), beside the local drafts.

**Testing**:
- **Vitest** (the gate) in `node`: the pure helpers next to their modules; existing tests change
  only where an adopted item changed the behaviour or text they assert; new helpers (the homepage
  decision, the menu entries of FR-036, the documents step's view helpers, the menu placement, the
  overview search) get a `*.test.ts`. No DOM tests.
- **pytest** (a practice, run anyway) and the MCP's tests: updated for C1, C2, C5, C7.
- **Visual verification**: the per-node loop and its tables (design-notes §5), the screenshot
  matrix and the keyboard walkthrough (quickstart V10–V11), the removal checklist (V12).

**Target Platform**: unchanged: DO.IT's evergreen desktop browsers, light only; every screen
usable at 320 px and 200 % zoom (FR-010). The browsers are the current releases of the
Chromium-based ones (Chrome, Edge) and Firefox, which the two Playwright servers of the checks
cover; Safari is not checked (an assumption of the analysis of 2026-11-07, for the user to
confirm). A web API that one of them lacks (CSS anchor positioning, the View Transitions API) is
not used (R5, R10).

**Project Type**: web application (React SPA behind nginx, FastAPI backend, PostgreSQL, the MCP
server in its own container); this feature is almost entirely in `frontend/`.

**Performance Goals**: no regression: the rule checks and the personas keep running in their
Workers; the details' checks (FR-047) reuse the rules step's Worker; transitions are CSS; the
page fade-in is 150 ms; no new request to the backend (the overview search filters the loaded
list).

**Constraints**:
- **Figma decides layout, styling and wording; the baseline decides behaviour**; every
  difference cites a decided item, and a frame changed since the audit is a new drift item for
  clarify, never built on the spot (FR-004).
- **One change** (FR-018): no screen ships in the old design next to one in the new; the work
  lands from `new-design` at once.
- **Parity** (FR-008 to FR-013): every state, keyboard use, focus rings, one `h1`, tab titles,
  AA contrast (a failing Revamp pair is fixed to the nearest passing value and recorded).
- **Nothing stored, sent or logged** about findings, personas or local drafts (specs 003–005).
- **Figma's rate limit**: at most three task agents read Figma at a time; about two calls per
  node.
- **Git read-only** in this checkout; the gates need `npm install` and `uv sync` first (R14).

**Scale/Scope**: the whole frontend, about 32 k lines (`pages/` 23 k, of which the editor 16 k;
`components/` 4.6 k in 35 folders; one `index.css`); 91 screen units with about 230 frames and
the kit's 26 pages to verify; seven copy items across four packages; 101 tasks in eleven
phases over about twelve chats (tasks.md; brief §3 estimated ten).

**Open points**: none. All are resolved in [research.md](research.md); the points to check while
coding are R15's V1–V10; the two judgment calls of research R2 are recorded under Complexity
Tracking.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design below.*

Checked against constitution v1.2.0 (`.specify/memory/constitution.md`).

| Principle or rule | How the plan complies | Result |
|---|---|---|
| **I. Contract parity** | No request or response shape changes; `api-types/` is untouched. The C items change message texts only (the `403 browser_only` and `invalid_target` messages, the validation messages), inside the existing `{error, message}` envelopes, and the backend's tests and the MCP's fake backend assert the new strings | PASS |
| **II. Sync persistence (NON-NEGOTIABLE)** | No database access changes; the backend changes are string literals in services and routers | PASS |
| **III. Quality gates** | Pure helpers with `*.test.ts` beside them in `node`; no jsdom, no `vitest.config.ts`, no `pytest.ini`; `npm run lint`, `npm test` and `npm run build` from the root after every task, Ruff, mypy and pytest for the backend texts; the MCP's `guidance.test.ts` keeps passing because no tool changes | PASS |
| **IV. Dependencies and config** | No dependency, setting or environment variable; the Revamp is CSS values; the browser checks use the Playwright MCP tools, not a package; the three images are static assets | PASS |
| **V. Schema evolution** | No migration | PASS |
| **Technology and structure** | Stack unchanged; `frontend/src/` keeps its folders (`api/`, `components/`, `pages/`, `hooks/`, `utils/`, `workers/`); components rebuilt in place under their names with sibling `types.ts` / `constants.ts` / `utils.ts`; related state in reducers (the documents step, the leave flow, the publish dialog, the details); every list a sub-component; Tailwind classes only, the overlay and the few scoped overrides in `index.css`, tokens in `@theme`; menus, popovers and tooltips are placed with class sets from `placementFrom()`, never with inline coordinates (R10, revised by the analysis of 2026-11-07); no `any`, no `require()` | PASS |
| **Logging** | Nothing new is logged: no `console.*` in the pages, the hooks, `rules/src/`, `mcp/src/` outside `log.ts` | PASS |
| **Security (CLAUDE.md "Auth")** | No endpoint changes; the sign-in guard stays as today (W2) | PASS |
| **Workflow and documentation** | Frontend order: types (none) → API (none) → pure helpers → hooks → components → pages. The documentation checklist is the last phase: `docs/ARCHITECTURE.md` (the frontend section: layouts, scrolling, the four steps, the header, the welcome page, the homepage memory, the details' checks), `docs/KERN-DESIGN-SYSTEM.md` (the overlay), `docs/FIGMA-WORKFLOW.md` (where decisions are recorded), `CLAUDE.md` (the UI rules: the overlay, `useRememberedHomepage`, the class-set placement of menus, the dialogs' scrim rule), `README.md` (Konnekt), spec 002's notes marked as history | PASS |

**Gate result (before research)**: PASS, with no violations to justify.

## Project Structure

### Documentation (this feature)

```text
specs/008-kern-revamp-redesign/
├── spec.md              # Feature spec with Clarifications (2026-11-06, 2026-11-07 #1–#61)
├── brief.md             # The pass plan of record until this plan; history from here on
├── deferred.md          # The drawn features left out, in three groups, for later specs
├── plan.md              # This file
├── research.md          # Phase 0: decisions R1–R15
├── data-model.md        # Phase 1: the feature's records and the frontend's added state
├── quickstart.md        # Phase 1: gates, the per-node loop, scenarios V1–V13
├── design-notes.md      # Phase 1 skeleton, filled by passes D–I: the token overlay, the
│                        #   component decisions, the W-item patterns, motion, the verification
│                        #   tables, pass I's results, the removal checklist, history
├── contracts/
│   └── ui-screens.md    # L1–L4, S1–S22 with units, frames, states, items; the kit's components;
│                        #   the coverage index of F1–F72, W1–W22, C1–C7
├── figma-audit/         # Pass B's inventory: units.md, units/U01–U100.md, report.md,
│                        #   requirements.md, kit/{units.md, variables.md, tree/}
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 output (/speckit-tasks, not created here)
```

### Source Code (repository root)

```text
frontend/
├── index.html                     # the tab title "Konnekt" (C1); data-kern-theme="light" stays
├── src/
│   ├── index.css                  # the KERN Revamp overlay block (design-notes §1); @theme: the
│   │                              #   durations, the variant marks, the shadows; the scoped overrides
│   │                              #   (checkbox, footer buttons, danger button); the reduced-motion
│   │                              #   rule; the :root pins, the split variant and the old rules removed
│   ├── constants.ts               # APP_NAME 'Konnekt', CONNECTION_STEPS with four steps
│   ├── assets/icons/              # the design's SVG glyphs (exported); unused ones removed
│   ├── assets/illustrations/      # login-art@2x.png, published-art@2x.png (+ grey), wallet-star@2x.png
│   ├── hooks/
│   │   └── useRememberedHomepage.ts   # new: the homepage memory (research R6)
│   ├── utils/
│   │   └── popupPlacement.ts      # + the vertical direction and the max-height step of menus, as class sets (R10)
│   ├── components/                # the 35 folders rebuilt in place (design-notes §2), among them:
│   │   ├── TopBar/, UserMenu/, AppLayout/      # the two-pill header, the account pill and its menu (L2)
│   │   ├── WizardLayout/, WizardProgress/      # the compact step header, the sticky footer, page scroll (L3)
│   │   ├── AuthLayout/                         # the sign-in frame with the login art (L1)
│   │   ├── ConfirmDialog/, Toast/              # the kit's dialog set and the scrim rule; toasts with actions
│   │   ├── ActionMenu/, InfoTooltip/, Connector/   # class-set placement, 220 px; hover, focus, touch; the pill menu
│   │   ├── ConnectionStatusBadge/              # the Status/Connection pill
│   │   ├── RuleRow/, GroupFrame/, BranchMark/, BranchName/, FindingNote/, ValuesPicker/, Checkbox/
│   │   ├── CopyableUrl/, LocalDraftsOffer/, TextField/, FormErrorMessage/, ErrorNoticeText/
│   │   └── AccessLevelChoice/, FeedbackLoader/, PageLoader/, IconTile/, NotFound/, PageTitle/, …
│   └── pages/
│       ├── Login/, ForgotPassword/             # S1, S2
│       ├── FormConnectionList/                 # S3 (WelcomePage.tsx, new), S4 (search, rows, row delete), S5
│       ├── FirstConnection/                    # the first-connection flow in the new shell
│       ├── FormConnectionEditor/               # the wizard: ConnectionStep (S7); DocumentsStep/ (S8, new
│       │   │                                   #   folder with its reducer, list, detail, search card);
│       │   │                                   #   LeaveDialogs (S6); PublishDialog (S14); EditorFooter
│       │   ├── RulesStep/                      # S9, S11, S12: the list, groups, menus (menuEntriesOf),
│       │   │   │                               #   select mode, tabs, VariantDialog, CopyPopover, LinkStrip,
│       │   │   │                               #   FindingsBanner, LinkNotice
│       │   │   └── RuleEditor/                 # S10
│       │   └── TestStep/                       # S13: chips, data card, result rows, EditDataDialog (new)
│       ├── FormConnectionEdit/                 # S18: the entry confirmation, RestoreDialog, LinkNotice
│       ├── FormConnectionDetail/               # S15, S16: StatusBand (new), accordions, tabs, the checks
│       └── Authorize/, Account/, Approval/     # S19–S21 (W16)

rules/src/
├── statements.ts, messages.ts     # C3: " · ", "must be met", the proposed messages
├── constants.ts                   # C5, C7: the server's messages word for word
├── checks/findingMessages.ts      # C2, C4: the findings' texts
└── personas/{messages,results,values,fields,constants}.ts   # C2, C6: the test step's texts and formats

backend/app/
├── routers/auth.py                # C5: the sign-in message
├── services/rules.py              # C5: duplicate names, the number check
├── services/form_connections.py   # C7: "Enter a name for the connection."
├── services/auth.py, services/oauth.py, routers/*.py   # C1: "Konnekt" in messages and docstrings
└── tests/                         # the assertions updated

mcp/
├── src/{auth,backend,links,findings,applicants,views}.ts, src/tools/*.ts   # C1, C2, C4: texts
├── test/fakeBackend.ts, test/server.test.ts, src/*.test.ts                  # the assertions updated
└── plugin/{instructions.md,README.md,skills/*/SKILL.md}                     # C1, C2, C4, C7: the guidance

docs/ARCHITECTURE.md, docs/KERN-DESIGN-SYSTEM.md, docs/FIGMA-WORKFLOW.md, CLAUDE.md, README.md
specs/002-connection-rules/design-notes.md     # the "superseded by spec 008" note on §9
```

**Structure Decision**: the web-application layout of specs 001–007 stays, and the frontend's
folders stay. Components are rebuilt **in place under their names** (brief §3, pass E), so that
the pages' imports and the tests' paths survive; a new folder appears only where the design adds
a part that no component covers (`DocumentsStep/`, `StatusBand`, `WelcomePage`,
`EditDataDialog`, `useRememberedHomepage`). The rules package, the backend and the MCP server
change string literals and the guidance only, each with its tests, in the files named above.

## Rules for `/speckit-tasks`

- **Phases**, in this order (research R12; one chat per phase, the editor's phase two or three):
  1. **Foundations** (brief pass D): the overlay block with the AA log (design-notes §1.1–§1.5,
     V1, V2, V7, V8), the `@theme` changes (the durations, the variant marks' hexes read from
     U57/U58, the shadows re-read), the reduced-motion rule, the three image exports and the
     SVG glyphs (an Opus agent reads Figma), `APP_NAME` and `CONNECTION_STEPS`, the component
     decision table confirmed (§2), the KERN doc addendum. Few Figma calls.
  2. **Copy outside the frontend**: one task per C item (C1–C7, research R2), each changing every
     source, its tests, the MCP guidance and the docs it names, and passing the backend's and
     the workspace's gates; `rules/src/constants.ts` stays word for word with the server.
  3. **Shared components** (pass E): the 35 folders of `components/`, grouped into tasks of one
     to three related folders, each through the per-node loop with its table in design-notes
     §5.1, in the kit's states; at most three tasks in parallel.
  4. **Layouts** (pass F): `TopBar` + `UserMenu` + `AppLayout` (L2), `WizardLayout` +
     `WizardProgress` + the footer (L3), `AuthLayout` (L1), `ConfirmDialog` + `Toast` + the
     scrim rule, `NotFound`, the page fade and scroll-to-top (FR-052c).
  5. **US1** (pass G1): S1, S2, S3 with `useRememberedHomepage` and the homepage helper, S4 with
     the search and row delete, S5.
  6. **US2** (pass G2): S6 (the leave model's reducer, `beforeunload`, V9), S7, S8 (the documents
     step's folder and reducer).
  7. **US3** (pass G3, two or three chats): S9 (`menuEntriesOf` and its test first, then the
     list, groups, select mode, menus, toasts), S10, S11, S12, S13 (the formats of C6 already in
     place; `EditDataDialog`).
  8. **US4** (pass G4): S14, S15 with the checks (R7), S16, S17, S18.
  9. **US5** (pass G5): S19, S20, S21, S22, from the patterns of design-notes §3.
  10. **Removal** (pass H): the checklist of design-notes §7, `npm run build`.
  11. **Verify and close** (pass I): quickstart V10–V13, design-notes §6, `/speckit-converge`,
      the documentation checklist, the PR text; no Figma.
- **Every UI task cites** its screen (L#, S#) and the units and frames it builds from
  [contracts/ui-screens.md](contracts/ui-screens.md), the items it meets (F#, W#, C#,
  Clarification numbers), the files it edits, and ends with the verification table appended to
  design-notes §5; the [coverage index](contracts/ui-screens.md#coverage-index) is checked: every
  F#, W# and C# is cited by at least one task, and every unit U10–U100 and every component of
  design-notes §2 is named by one.
- **Task shape**: `[ID] [P?] [US?] <what> — <screen>, <units/frames>, <items>; files: …`. A task
  reads at most about ten nodes (about twenty Figma calls); a screen with more frames is split by
  state. `[P]` only for tasks on different folders; Figma caps the parallel agents at three.
- **Agents**: `speckit-task-high` for every task with Figma checks; `speckit-task-xhigh` for the
  leave model (S6, research R9, V9), the documents step's reducer (S8, R8), the menus helper of
  FR-036 (S9) and `WizardLayout`'s scroll model (R4), where a mistake is a behaviour change the
  gates can't catch; `speckit-task-medium` for the C items' text changes, the removal checklist
  and the docs.
- **Behaviour stays the baseline's**: a task that touches a reducer, a hook or a pure helper
  keeps its tests passing; a test changes only for an adopted item, and the task names the item.
  Nothing new is logged; no `console.*` in `checks/`, `personas/`, `workers/`, the hooks or the
  local drafts; findings are never stored or sent (FR-047).
- **The C items come before the components** (phase 2 before 3), and the word-for-word mirror is
  asserted on both sides (quickstart V12).
- **A frame that changed since the audit** is reported as a new drift item, not built: the task
  stops on that node, lists it as UNCERTAIN, and the coordinator takes it to clarify (FR-004).
- **AA contrast**: a task that meets a failing Revamp pair fixes it to the nearest passing value
  and adds the row to design-notes §1.5 (Clarification 2026-11-06 #2); the designer is told in
  the closing report.
- **Gates**: every task in a Node package passes `npm run lint`, `npm test` and `npm run build`
  from the root; every backend task passes Ruff, mypy and pytest; nothing commits (git is
  read-only here; the user commits on the other machine).
- **The last task applies the documentation checklist**: `docs/ARCHITECTURE.md` (the frontend
  section: the layouts and the page scroll, the four steps and the publish dialog, the header
  pills, the welcome page and `useRememberedHomepage`, the details' checks, where the design's
  decisions are recorded), `docs/KERN-DESIGN-SYSTEM.md` (a section on the Revamp overlay and the
  three build options), `docs/FIGMA-WORKFLOW.md` (this feature's notes first; 001 and 002 as
  history), `CLAUDE.md` (one-line rules: "the Revamp's values live in the overlay block of
  `index.css` under KERN's names; a value without a KERN name is a `@theme` token"; "only
  `useLocalDraftStore` and `useRememberedHomepage` touch `localStorage`"; "menus, tooltips and
  popovers are placed by `placementFrom()`'s class sets, never with inline coordinates"; "a scrim click
  closes a dialog unless it deletes or publishes"), `README.md` (Konnekt), spec 002's
  `design-notes.md` §9 ("superseded by spec 008"), and `brief.md`'s status line ("history from
  pass C on").

## Constitution Check: after Phase 1 design

- **Contracts** ([contracts/ui-screens.md](contracts/ui-screens.md)): a UI contract only; no API
  shape changes, so Principle I is untouched; the C items keep the `{error, message}` envelopes
  and the MCP tools' names and fields (research R2).
- **Data model** ([data-model.md](data-model.md)): no schema; the frontend's added state lives
  in reducers with actions; the one new `localStorage` flag is confined to one hook (structure,
  III).
- **Tests**: the new pure helpers come with `*.test.ts` in `node`; the existing tests change only
  for adopted items; no DOM test, no `vitest.config.ts` (III).
- **Dependencies**: none added; the browser checks and the screenshot matrix use the Playwright
  MCP tools from the chat; the images are assets (IV).
- **Structure**: components rebuilt in place, small, with sibling files and sub-components for
  lists; Tailwind only, with the overlay and scoped overrides in `index.css` and tokens in
  `@theme`; the overlay is a new pattern recorded in `CLAUDE.md` by the documentation task
  (structure, workflow).
- **Logging and data**: findings, personas and local drafts stay unlogged and unsent (specs
  003–005; FR-047).

**Gate result (after design)**: PASS under constitution 1.2.0, with no violations.

## Complexity Tracking

No constitution violations, so nothing needs justifying here. Two judgment calls of research R2
are the record, applied by the analysis of 2026-11-07 (the user reverses them by amending the
spec): code identifiers (`applicant.ts`, the `applicants` field of the MCP tools' answers, the
`@connection-portal/*` npm scope) keep their names while every text changes (FR-019 and FR-020
say so); and the duplicate-group message follows the design's rule-message template (C5, T011).
