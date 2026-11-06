# Feature Specification: Port the redesigned UI (KERN Revamp) and remove the old design

**Feature Branch**: `new-design` (feature directory `specs/008-kern-revamp-redesign/`)

**Created**: 2026-11-06

**Status**: Draft

**Input**: User description: "Port the redesigned UI into the frontend and remove the old design.
The designer redrew every screen and every component in Figma "Middleware – V5" (file
s8mU9oJDq3411e8bxMjQO9, page node 6263:12360) on a reworked KERN, "KERN Revamp", whose components
live in the Figma Design Kit xqEw2Om11uKfESdRgTfuVe. There is no npm package for it: KERN 2.8's
packages stay and the Revamp's tokens and component anatomy are applied on top of them. The app's
flow does not change: the same routes, the same wizard steps, the same reducers, the same API. What
changes is the layout, the styling and the wording of every screen and component, all three from
the new Figma file; the design's copy, written by the designer and the PM, replaces the current copy
word for word. Behaviour stays as specs 001–007 define it (their contracts/ui-screens.md are the
behaviour baseline), except where the design drifts: it draws a few features the app does not have,
and it does not draw spec 007's screens (the consent page, the user page, the approval page). Each
drift item is found by the Figma audit and decided in clarify: adopt it as a requirement of this
spec, build the spec's behaviour without frames from the new components, or drop it. Out of scope:
backend, rules package, MCP server and api-types, except copy they provide that the design rewrites
(validation and error messages, rule statements, findings, the KERN kit's translations), which is
listed and decided, never ported silently; a renamed concept is decided the same way. Every state of
every screen keeps working: loading, error, empty, disabled, keyboard focus, 320 px at 200 % zoom,
light only, one h1 per page. Done means: every unit's visual verification table is clean, no
old-design token, asset, CSS override or doc rule remains, and lint, test and build pass. Keep the
spec short: the user stories are the flows, each checkable against its frames on its own: (1)
sign-in, forgot password, overview and first connection; (2) the create wizard's connection and
documents steps; (3) the rules step, the rule editor and the test step; (4) the publish step, the
details and editing; (5) the account, consent and approval pages. The plan of record for the passes
is brief.md in this feature's directory, moved there from specs/redesign-brief.md as the first step
after this spec is created."

## Context and governance

The designer redrew the whole management UI on "KERN Revamp", their own rework of the KERN design
system. This feature ports that redesign: every screen and every component gets the new layout,
styling and wording, and nothing of the old design remains. What the app does stays as it is. The
work runs in passes, one chat each; the plan of record is [brief.md](brief.md) in this directory.

### Sources, and which one decides

| Question | Decided by |
|---|---|
| Layout, styling and wording of every screen and component | Figma "Middleware – V5", file `s8mU9oJDq3411e8bxMjQO9`, page node `6263:12360` |
| Anatomy, variants and tokens of the components | Figma "KERN – Revamp – Design Kit", file `xqEw2Om11uKfESdRgTfuVe`, one page per component |
| Behaviour: routes, steps, states, what each control does | specs 001–007, the behaviour baseline below |
| A difference between the two | a drift item, decided in clarify (below) |

**Figma decides wording.** The designer and the PM rewrote the copy, and it is ported word for word.
A wording difference between a frame and the baseline's copy is therefore copy to port, not a
conflict, and needs no decision. Only copy that lives outside the frontend and a renamed concept are
decided (C items below).

### Behaviour baseline

The baseline is the `contracts/ui-screens.md` of each earlier spec, read with the Clarifications of
its `spec.md`. An item of the baseline is cited with the spec's number as prefix: `002-S3`,
`005-FR-016`, `007-S2`.

| Spec | Contract | Screens it fixes |
|---|---|---|
| 001 | `specs/001-servicebw-eudi-middleware/contracts/ui-screens.md` | sign in, forgot password, overview, first connection, create and edit, details, the sign-in guard, accessibility |
| 002 | `specs/002-connection-rules/contracts/ui-screens.md` | the wizard shell (S0), documents (S1), rules (S2), rule editor (S3), variants (S4), publish and save dialog (S5), details (S6), edit flow (S7) |
| 003 | `specs/003-rule-consistency-checks/contracts/ui-screens.md` | findings in the rules step, the editor, the variants, the publish dialog and the details |
| 004 | `specs/004-rule-test-personas/contracts/ui-screens.md` | the test step (S8) and its effect on the shell, the rules step and the publish dialog |
| 005 | `specs/005-connection-drafts/contracts/ui-screens.md` | save and exit, conflicts, drafts on the overview and in the details, local drafts, logging out, catalog changes |
| 006 | `specs/006-connection-description/contracts/ui-screens.md` | the description in step 1, the overview row and the details header |
| 007 | `specs/007-agent-mcp-server/contracts/ui-screens.md` | the consent page (S1), the user page (S2), the approval page (S3), "Copy link" (S4), opening a link (S5) |

Spec 002's `design-notes.md` §9 ("map by name, keep KERN 2.8's values") and the matching rule in
`docs/FIGMA-WORKFLOW.md` are superseded by this feature: the Revamp's values are the target.

### Drift items

The Figma audit (pass B of the brief) lists every difference between the design and the baseline
that is not plain layout, styling or wording. Each item gets one decision in `/speckit-clarify`,
recorded in this spec's Clarifications and in the feature's contracts. Nothing is ported or left out
silently.

| Kind | What it is | Possible decisions |
|---|---|---|
| **F item** | the design draws something the baseline lacks: a feature, a control, a state, a screen | **adopt**: it becomes a requirement of this spec; or **drop**: it is not built |
| **W item** | the baseline has something the design does not draw: spec 007's consent, user and approval pages, and states such as loading, server errors, conflicts and the local drafts' offer | **build**: the baseline's behaviour and wording, from the new components and patterns, no frame; or **drop**, only when the design removes it on purpose, which is a behaviour change to record |
| **C item** | copy the design rewrites that another package provides (the validation and error messages of the backend, the rule statements, the findings' texts, the KERN kit's translations), and a renamed concept (connection, variant, "Standard", rule, group, document, the product name) | **adopt**: the copy or the name changes in every place that provides or repeats it; or **drop**: the current copy stays |

## User Scenarios & Testing *(mandatory)*

Each story is one flow of the app. It is checkable on its own: open its screens in every state,
compare each against its frames, and run the baseline's behaviour through it. The stories are
ordered as they are built; the shared components and layouts come before the first.

### User Story 1 - Sign in, forgot password, overview and first connection (Priority: P1)

A team member opens the app, signs in, lands on the overview or on the first-connection screen,
and sees the connections, the drafts and the unsaved work of this device, all in the new design.

**Screens**: `/login`, `/forgot-password`, `/` (overview), `/get-started` (first connection), with
the signed-out frame around the first two and the signed-in frame (product name, user menu, sign
out) around the rest. **Baseline**: 001 sign in, forgot password, overview, first connection;
005-S3, 005-S4, 005-S7; 006 overview row; 007-S6.

**Why this priority**: it is the entry to everything, and it exercises the two layouts and the
shared components every later flow reuses.

**Independent Test**: sign in with wrong and with right credentials, visit forgot password, open the
overview empty, with published, deactivated and draft rows, and with local drafts on the device,
and open the first-connection screen with and without connections; compare each state against its
frame.

**Acceptance Scenarios**:

1. **Given** the sign-in frame, **When** a team member opens `/login`, **Then** the screen matches
   the frame in layout, styling and wording, and a failed sign-in shows the design's one message,
   which never says which of the two fields was wrong.
2. **Given** the forgot-password frame, **When** the team member opens it from the sign-in screen,
   **Then** it matches the frame, tells them to ask an administrator, and going back to sign in
   keeps the route that asked for the sign-in.
3. **Given** the overview frames, **When** the list holds published, deactivated and draft
   connections, **Then** each row shows the state its frame draws, the actions of the baseline
   (open, view, continue, create) are there, and the empty, loading and error states match their
   frames.
4. **Given** local drafts on this device, **When** the overview or the first-connection screen
   opens, **Then** the unsaved-work offer (005-S4) is shown in the new design, and resume and
   discard work as before.
5. **Given** no connection exists, **When** a team member signs in without a requested route,
   **Then** the first-connection screen shows its loading state and then step 1 as its frame draws
   it, and the product name leads to the overview's empty state.

---

### User Story 2 - The create wizard: connection and documents steps (Priority: P2)

A team member starts a connection, names and describes it, adds documents and chooses their
fields, saves and exits, and comes back to the draft, in the new wizard.

**Screens**: `/form-connections/new` and `/get-started`, steps 1 and 2, with the wizard shell
(progress, "Save and exit", the draft badge). **Baseline**: 001 create and edit; 002-S0, 002-S1;
004-S0, 004-S1; 005-S0, 005-S1, 005-S2, 005-S5, 005-S8; 006 step 1.

**Why this priority**: the shell carries every later step, and these two steps are the simplest
place to settle the form components, the validation pattern and the save-and-exit behaviour.

**Independent Test**: create a connection through steps 1 and 2, trigger every validation message,
save and exit, continue the draft, restore and discard unsaved changes, and compare each state
against its frame.

**Acceptance Scenarios**:

1. **Given** the wizard frames, **When** a team member opens a new connection, **Then** the shell
   shows the five steps in the baseline's order with the design's labels, "Save and exit" and the
   draft badge as the frames draw them, and the current step is marked.
2. **Given** step 1, **When** a required field is left empty or the description is used in place
   of the form, **Then** the fields, hints and validation messages match the frame, each message
   sits next to its field, and the focus moves to the first field with a problem.
3. **Given** step 2, **When** a document is added from the catalog, its fields chosen and a
   document removed, **Then** every state (no document, a document without a field, data the
   catalog no longer offers) matches its frame and refuses to go on as the baseline says.
4. **Given** a stored draft, **When** "Save and exit" is used and the draft is continued later,
   **Then** the saved status, the overview's draft row and the restore dialog for unsaved changes
   appear in the new design with the baseline's behaviour.
5. **Given** two team members on one draft, **When** the second saves, **Then** the conflict
   (005-S2) is shown with the new components, as a W item if the design draws no frame for it.

---

### User Story 3 - The rules step, the rule editor and the test step (Priority: P3)

A team member writes rules and groups per variant, sees the findings of the rule checks, and tests
the rules against fictitious applicants, in the new design.

**Screens**: step 3 (the rules frame, the list, the groups, the variants, the findings' banner and
notes, the ⋯ menus with "Copy link"), the rule editor, step 4 (the test step). **Baseline**:
002-S2, 002-S3, 002-S4; 003-S2, 003-S3, 003-S4; 004-S2, 004-S8; 007-S4, 007-S5.

**Why this priority**: the editor is half the frontend and the most intricate set of frames; it
depends on the components settled by the first two stories.

**Independent Test**: on a draft with documents, add, edit, group, move and delete rules on
"Standard" and on a variant, provoke each finding, open a link to a rule, run the test step, and
compare each state against its frame.

**Acceptance Scenarios**:

1. **Given** the rules frames, **When** a variant has no rule, some rules and groups, and rules
   with findings, **Then** the list, the groups, the outlines, the banner, the notes and the status
   region match their frames, and the menus offer what the baseline lists, "Copy link" included.
2. **Given** the rule editor frames, **When** a rule is written with each kind of condition and
   with the values picker, **Then** the editor matches its frames and the validation messages read
   as the baseline's server messages, unless a C item adopted the design's rewrite.
3. **Given** the variants' frames, **When** a variant is added, renamed and edited, **Then** the
   marks and the propagation from "Standard" behave as 002-S4 says, in the new design.
4. **Given** the test step's frames, **When** personas are chosen and edited, **Then** the outcomes
   per variant match their frames, with the loading state while the evaluator loads.
5. **Given** a link to a rule, a group or a variant, **When** it is opened, **Then** the editor
   opens at that item (007-S5), highlighted as the design draws it.

---

### User Story 4 - The publish step, the details and editing (Priority: P4)

A team member publishes a connection, copies its connection URLs, reads its details, deactivates,
reactivates or deletes it, and edits it into a new revision, in the new design.

**Screens**: step 5 (publish), the publish and save dialog, the details (published, deactivated,
draft), `/form-connections/:id/edit`. **Baseline**: 001 details; 002-S5, 002-S6, 002-S7; 003-S5,
003-S6, 003-S7; 004-S5, 004-S7; 005-S6; 006 details header; 007-S6.

**Why this priority**: it closes the create flow and carries the destructive actions, whose dialogs
and wording the design settles for the whole app.

**Independent Test**: publish a draft, copy each URL, open the details of a published, a deactivated
and a draft connection, run each confirmation dialog, edit a published connection and save, and
compare each state against its frame.

**Acceptance Scenarios**:

1. **Given** the publish frames, **When** the last step is reached, **Then** the summary, the
   findings and the publish dialog match their frames, and publishing leads to the details with the
   connection URLs.
2. **Given** the details frames, **When** a published connection is opened, **Then** the header
   (name, status, description line), the trigger URL, each variant's pull URL with the reference
   hint, the documents and the rules summary match their frames, and "copied" is announced.
3. **Given** the confirmation frames, **When** deactivate, reactivate or delete is chosen, **Then**
   each dialog reads as the design writes it, says what happens to the URLs and to requests in
   progress, and does what the baseline says.
4. **Given** a draft's details (005-S6), **When** it is opened, **Then** continue and delete are
   offered as the frame draws them, and no connection URL is shown.
5. **Given** the edit flow, **When** a published connection is edited and saved, **Then** the note
   on requests in progress, the new revision and a conflict appear in the new design.
6. **Given** a deleted or unknown connection, **When** its address is opened, **Then** the error
   state offers the way back to the overview.

---

### User Story 5 - The account, consent and approval pages (Priority: P5)

A team member connects an agent, chooses its access, manages agents and personal access tokens on
their account page, and approves or declines an agent's request, on pages the design does not draw,
built from the new components and patterns.

**Screens**: `/authorize`, `/account`, `/approvals/:id`, the user menu's entry, the not-found
screen. **Baseline**: 007-S1, 007-S2, 007-S3.

**Why this priority**: these pages have no frames (W items), so they come last, once every component
and pattern they reuse has been ported.

**Independent Test**: open the consent page from an agent, with and without a step-up and with an
invalid request; open the account page empty and with agents and tokens, and run each dialog; open
an approval request for each action and reach each outcome; check every state against the baseline
and the design's patterns.

**Acceptance Scenarios**:

1. **Given** the consent page, **When** an agent asks for access, **Then** the title, the three
   access levels, allow and deny, the step-up line and the invalid-request error are shown with
   the new radio group, buttons and alert, with 007-S1's wording.
2. **Given** the account page, **When** agents and tokens exist, **Then** the two sections, their
   menus and the dialogs (change access, revoke, create token, the token shown once) use the
   design's list, menu, dialog and copyable-field patterns, with 007-S2's wording.
3. **Given** an approval request, **When** it is opened for each action, **Then** the body, approve
   and decline, the working state and every outcome (done, declined, expired, replaced, cancelled,
   failed with its error id) follow 007-S3 in the new design.
4. **Given** a concept the design renames, **When** the C item is adopted, **Then** these pages use
   the new name too.

### Edge Cases

- **A frame shows a state the baseline lacks** (a new empty state, a new control): an F item, not
  silently built.
- **The baseline has a state the design does not draw** (loading, a server error with its error
  id, a conflict, a cancelled approval, the local drafts' offer): a W item, built from the new
  components, its pattern recorded so that every such state looks the same.
- **Interpolated copy** (names, counts, dates, plurals, "{reference}"): the design's sentence is
  applied as the template; the variables stay. Sample data in a frame (example names, forms,
  dates) is not copy.
- **Copy from outside the frontend** that the design rewrites, and a concept it renames, the
  product name included: a C item.
- **A component the design draws that the current design system has no equivalent for**: built as
  its own component after the kit's anatomy.
- **The design draws only one width**: below it, the layout reflows following the design's spacing
  and the baseline's rules; nothing is hidden. Where the design draws narrow frames too, they
  decide.
- **Long content** (long names and descriptions, many documents, rules or variants, long URLs): the
  design's wrapping or truncation pattern applies, and nothing becomes unreachable.
- **A Revamp colour pair that fails the AA contrast**: reported by the audit, decided in clarify,
  never silently changed or silently kept.
- **A screen reached by its address** (bookmark, history, a link from an agent): behaves as the
  baseline says, in the new design.

## Requirements *(mandatory)*

### Functional Requirements

Sources and governance:

- **FR-001**: Every screen and every component MUST take its layout, styling and wording from
  "Middleware – V5", and a component's anatomy, variants and tokens from the "KERN – Revamp –
  Design Kit".
- **FR-002**: The design's copy MUST replace the current copy word for word, with its
  capitalisation and punctuation; interpolated texts keep their variables, and sample data in a
  frame is not copy. Where the design draws no screen, the baseline's copy stays.
- **FR-003**: The app's behaviour MUST stay as the baseline defines it: the same routes, the same
  five wizard steps in the same order, the same states and transitions of each screen, the same
  requests to the backend and the same handling of their answers, the same sign-in guard, drafts
  and local drafts.
- **FR-004**: Every drift item MUST be found by the Figma audit, decided once in clarify (adopt,
  build or drop, as the table above allows for its kind), and recorded; no item is ported or left
  out silently.
- **FR-005**: A screen or state the design does not draw (a W item) MUST be built from the new
  components and the patterns the design establishes elsewhere, with the baseline's behaviour and
  wording.
- **FR-006**: Copy that another package provides (the backend, the rules package, the MCP
  guidance, the design system's translations) MUST change only through an adopted C item, in every
  place that provides or repeats it, so that the frontend's validation messages stay word for word
  with the server's and the agents' guidance names the same concepts as the UI.
- **FR-007**: Apart from adopted C items, the backend, the rules package, the MCP server and the
  API types MUST NOT change.

Parity:

- **FR-008**: Every state of every screen MUST keep working and be ported: loading, error (a
  server error with its error id included), empty, disabled, busy, success and status messages,
  dialogs, menus, tooltips and toasts.
- **FR-009**: Every action MUST work with the keyboard alone, in a logical order; the focus ring
  MUST show for keyboard focus only; dialogs keep the focus inside and return it; menus, popovers
  and tooltips keep the baseline's placement rules.
- **FR-010**: Every screen MUST work at 320 px width and 200 % zoom without horizontal scrolling
  and without losing content or function, and MUST match its frame at the frame's width.
- **FR-011**: The UI MUST have one, light, appearance; the device's dark mode MUST NOT change it.
- **FR-012**: Every route MUST have exactly one main heading and its own tab title.
- **FR-013**: The accessibility sections of the baseline MUST keep holding: visible labels,
  validation linked to its field, status messages announced, AA contrast with the Revamp's
  colours.

Construction and removal:

- **FR-014**: The current design system packages (KERN 2.8) MUST stay, and the Revamp's tokens and
  component anatomy MUST be applied on top of them; no other UI component library is added.
- **FR-015**: Nothing of the old design MUST remain: no token, asset, style override or
  documentation rule of it, and the superseded decisions (spec 002's "KERN 2.8 vs Revamp" rule)
  MUST be marked as history.
- **FR-016**: Every unit of the audit's inventory (a screen or a component) MUST have a visual
  verification table, one row per frame and state, and a unit is done only when every row matches
  or cites a decided item.
- **FR-017**: The documentation MUST be updated: the design system guide, the Figma workflow, the
  architecture's frontend section and the agent instructions' UI rules; spec 002's audit files stay
  as history with their references updated.
- **FR-018**: The redesign MUST land as one change; no screen ships in the old design next to one
  in the new.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100 % of the units in the audit's inventory have a clean visual verification table.
- **SC-002**: For every frame in scope, the text the screen shows equals the frame's text, sample
  data aside; the only differences cite decided items, and 0 items are undecided.
- **SC-003**: The removal checklist of the old design finds 0 remaining tokens, assets, style
  overrides or documentation rules.
- **SC-004**: The lint, test and build gates pass for the whole workspace; the backend's and the
  MCP server's tests pass unchanged unless an adopted C item changed their copy.
- **SC-005**: A screenshot of every route in every state, at the frame's width and at 320 px with
  200 % zoom, shows 0 screens with horizontal scrolling or hidden content.
- **SC-006**: A keyboard-only run through the five flows reaches every control with a visible
  focus ring, every route has exactly one main heading, and the accessibility review finds 0 AA
  failures.
- **SC-007**: The five flows complete as before: a connection from sign-in to live with rules on a
  variant, a draft saved, left and resumed, an agent's consent, and an approval, each walked
  through once in the new design.

## Assumptions

- The design is complete and stable for the duration of the port; a frame changed after the audit
  is a new drift item.
- The design's copy is in the UI's language, English, as the current copy is; the design system's
  translations stay in that language.
- The design draws desktop frames; where it draws no narrow frame, the reflow follows the design's
  spacing scale and the baseline's rules.
- Specs 001–007 are implemented as their contracts describe; the baseline is the code's current
  behaviour.
- The design system's current version stays the base; the Revamp is applied as values and
  structure on top of it, without a package of its own.
- The frontend's automated tests cover pure logic next to the modules; a test moves with the module
  it tests and changes only when an adopted drift item changes the behaviour it covers.
- The passes, their agents and their outputs follow [brief.md](brief.md); the Figma files are
  read through the project's agents only.
