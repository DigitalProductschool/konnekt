# Research: Port the redesigned UI (KERN Revamp) and remove the old design

**Phase 0 output of `/speckit-plan`** | **Date**: 2026-11-07 | **Spec**: [spec.md](spec.md)

This file records each technical decision behind the plan, with the reason for it and the
alternatives that were weighed. Points to confirm while coding are marked **Verify at
implementation** and collected in R15.

**Sources**: the spec with its 64 Clarifications (2026-11-06 #1–#3, 2026-11-07 #1–#61), the Figma
audit ([figma-audit/report.md](figma-audit/report.md), 2026-11-07 21:48: 0 open items, F1–F72,
W1–W22, C1–C7), the kit's inventory ([figma-audit/kit/units.md](figma-audit/kit/units.md)) and
token dump ([figma-audit/kit/variables.md](figma-audit/kit/variables.md)), the build notes
(units U01–U09), [brief.md](brief.md), [deferred.md](deferred.md), the code on the `new-design`
branch, `@kern-ux/native` 2.8.2's `kern.css`, and specs 001–007's design notes.

**Who decides what**: Figma "Middleware – V5" decides layout, styling and wording; specs 001–007
decide behaviour; every difference is a decided item (the spec's Clarifications and the report's
F#, W#, C#). Nothing here re-decides an item; this file says how the decided items are built.

## Technical Context: open points and how they were resolved

| Open point | Resolved in |
|---|---|
| How the Revamp's tokens are applied on KERN 2.8 without a package, and how each component is rebuilt | R1 |
| Where the copy the design rewrites lives outside the frontend, and what each C item changes | R2 |
| How "matches its frame" is proven, where the evidence lives, and what the automated tests cover | R3 |
| How the design's shells (header pills, step header, sticky footer, page scroll) replace the current layouts | R4 |
| How the design's motion is implemented and switched off for reduced motion | R5 |
| How the welcome page and its device memory work with the routes that stay | R6 |
| How the published details run the rule checks | R7 |
| How the documents step, the toasts with actions and the dialogs are structured | R8, R9 |
| How menus, tooltips and disabled buttons' explanations are placed without inline styles | R10 |
| Which parts become own components after the kit's anatomy | R11 |
| In what order the work runs across the passes, and what each chat produces | R12 |
| What the removal of the old design covers, and how it is checked | R13 |
| What this checkout can run | R14 |
| What still needs a check at implementation | R15 |

No open point blocks the plan.

---

## R1. KERN strategy: one overlay block, three ways to build a component

**Decision**: `@kern-ux/native` 2.8.2, `@kern-ux-annex/kern-react-kit` 2.40.0 and
`@digitalservicebund/kern-ux-tailwind-theme` 4.0.0 stay (FR-014); nothing is added. The
Revamp's values are applied in **one overlay block** in `frontend/src/index.css`, a `:root { … }`
rule placed right after the four `@import`s and before `@theme`, headed "KERN Revamp overlay
(spec 008)". It sets every KERN variable whose Revamp value differs from KERN 2.8's, under KERN's
own name, so that `kern.css`, the React kit (which binds KERN's names) and the Tailwind theme pick
the new values up without a change to their markup. The block's content is the token map in
[design-notes.md §1](design-notes.md#1-token-overlay): the kit's 92 variables were diffed
against `kern.css`'s light theme on 2026-11-07, and spec 002's design-notes §9 supplies the
KERN 2.8 values of the variables the kit dump omits (`small-static`, `text-inverse`,
`background-hued`, `decorative-brand-default`, `decorative-border-level-1`).

What differs, in short (the full table is in the design notes):

| Group | Revamp vs KERN 2.8 |
|---|---|
| Semantic colours | every colour except `layout-background-default` and `action-on-default` (both `#ffffff`): text `#0b1220` / muted `#4a5468`, action `#1d56f0`, focus `#0b1220`, borders `#6b7488` / `#e1e6f0` / `#d0d8e6`, surfaces `#f2f5fb`, input border `#22293a`, the four feedback pairs and the default pair |
| Radii | `small` 4 (2), `default` 8 (4), `large` 12 (8), `circle` 9999px (50 %) |
| Font sizes | `small-static` 14 (16), `medium-static` 16 (18), `large-static` 18 (21), `medium-adaptive` 18 (21), `large-adaptive` 24 (26), `2x-large-adaptive` 40 (48); `x-large-adaptive` 32 unchanged |
| Line heights | `large-static` 24 (32), `2x-large-adaptive` 48 (56); the others unchanged |
| Spacing, dimensions, border widths, baseline paddings, font weights, the alert icon size, Fira Sans | unchanged |
| Opacities | the same values in another notation (40 for 0.4, 72 for 0.72, hover 8 for KERN's 88 % shade): no entry |

The adaptive type is the one place the overlay also replaces existing CSS: the `:root` pins of
2026-10 (KERN's small-screen values on every width) become the Revamp's values, which the design
draws on every width too. `kern.css` switches the adaptive variables at 768 px in `@media` blocks
of equal specificity, which the overlay beats by cascade order, as the pins do today (**V1**).
`-contextual` variables are KERN's layer-aware aliases of the plain names; the overlay sets the
plain names only, and a task confirms that `kern.css` derives every `-contextual` alias from
them (**V2**).

**Three ways to build a component**, decided per component in the design notes' table (§2) and
recorded with the reason when a task changes a proposal:

- **(a) KERN class with the overlay**: the kit's anatomy equals KERN 2.8's markup, so the class
  with the new values matches the frame. Proposed for alert, badge, buttons (the three kinds and
  five sizes), inputs, textarea, select, fieldset, links, loader, dialog, accordion, description
  list, divider, table, progress.
- **(b) KERN class plus a scoped CSS override** in `index.css`, when one or two properties differ
  and the markup is still KERN's: the 40 px footer buttons (`min-height`, build note 5), the
  20 px check box with the design's tick and mixed dash (build note 2, which forbids KERN's
  `::before` tick), the danger button (kept, re-derived from the overlay's danger colour), the
  tab's underline if KERN's tabs need it.
- **(c) Own markup with Tailwind**, when KERN has no component or the anatomy differs: the
  header pills, the step line, the status pill, the status band, the toast, the menus, the
  tooltip, the popover, the search card, the cards with the kit's `surface` variant where KERN's
  card lacks it, the skeletons, the persona chips, the connector pill, the rule rows and groups.

**Rationale**: the kit binds KERN's variable names, so one overlay carries most of the restyling
with no markup change; the per-component choice keeps the KERN markup (and its accessibility)
wherever it fits and limits own markup to what the design adds.

**Alternatives considered**: forking KERN's SCSS or vendoring a built Revamp stylesheet (no
package exists; a fork would have to be maintained against every KERN release); replacing KERN
with own CSS (forbidden by FR-014 and the constitution's stack); waiting for a Revamp release
(no date); setting Revamp values as new `@theme` tokens beside KERN's (the kit would keep the
old values, and every KERN class would need an override).

**Icons and images**: Fira Sans stays, served from `@kern-ux/native` as today; the design uses
no other typeface (the kit's text styles bind `font-family-default`). KERN's icons stay the
`kern-icon` classes; the design's Material Symbols glyphs (the account pill's person icon, build
note 14) and the other SVG glyphs the frames use are exported from Figma as SVG into
`frontend/src/assets/icons/`, as `docs/FIGMA-WORKFLOW.md` prescribes; no icon font is added
(constitution IV). The three image files the design names (build note 9: `login-art@2x.png`
662 × 1234, `published-art@2x.png` 454 × 288 in colour and grey, `wallet-star@2x.png` 400 × 385)
are exported by an Opus agent in pass D into `frontend/src/assets/illustrations/`, used at the
sizes the note gives, decorative (`alt=""`), and checked for weight (**V3**). These previous
illustrations are replaced by the new visuals (bug `new-visuals`, 2026-11-21,
`.specify/bugs/new-visuals/`; Figma "⛓️ New visuals" `7741:61917`): eight lossless WebP pictures
and `logo-white.svg` (design-notes §1.3).

## R2. Copy outside the frontend: what each C item changes

Every C item is adopted (Clarifications #1–#6, #58). The change set below was found by searching
the branch on 2026-11-07; the task that ports an item re-runs the search, because a text can
repeat in a test or a docstring. **Rule**: user-facing and agent-facing texts, guidance and docs
change; code identifiers (file names, type names, tool names and the JSON field names of the MCP
tools' answers, the npm scope `@connection-portal/*`) stay, because a renamed identifier changes
an interface for no visible gain and would ripple through every import. Where an identifier
still says "applicant" or "connection portal", the guidance names the concept with the new word
("the `applicants` field lists the sample citizens"). The removal checklist (R13) therefore
greps texts, not identifiers.

| C item | Text | Where it lives (2026-11-07) | What changes |
|---|---|---|---|
| **C1** "Konnekt" | product name | frontend: `src/constants.ts` (`APP_NAME`), `index.html` `<title>`, `pages/Authorize/constants.ts` (consent text), `pages/Account/constants.ts` (empty-state link); backend: `services/auth.py` (`403 browser_only` message "This action is done in the Connection Portal.", a docstring), `services/oauth.py` (`invalid_target` "The resource isn't this Connection Portal's MCP server.", three places), docstrings in `routers/form_connections.py` and `routers/approval_requests.py`; MCP: `mcp/plugin/instructions.md`, `mcp/plugin/README.md`, `plugin.json`, five skills (`access-levels`, `connection-workflow`, `links`, `documents-and-catalog`, `publishing-and-live-connections`), `mcp/src/auth.ts`, `backend.ts`, `links.ts`, `tools/*.ts` descriptions; tests: `mcp/test/server.test.ts`, `mcp/src/*.test.ts`, `backend/tests/api/test_agent_principal.py`, `test_approval_requests.py`; docs: `README.md`, `docs/ARCHITECTURE.md`, `.claude-plugin/marketplace.json` | every text and doc says "Konnekt"; tab titles per FR-012; the OAuth `invalid_target` message and the `403` message are API texts and change too (FR-019) |
| **C2** "citizen" | the noun for people who share wallet data | frontend: 34 files, mostly `constants.ts` of the editor, the rules and test steps, `RuleRow`, `GroupFrame`, `BranchName`, `AccessLevelChoice`, the details and overview constants; rules: `src/checks/findingMessages.ts` (every finding text), `src/personas/` (`messages.ts`, `results.ts`, `constants.ts`, `substitute.ts`, `goals.ts`), their tests (`findingMessages.test.ts` alone has 67 mentions); MCP: `plugin/instructions.md`, skills `checks-and-tests`, `variants-and-standard`, `links`, `connection-workflow`, `src/applicants.ts`, `findings.ts`, `views.ts`, `tools/checks.ts`, `tools/read.ts` and their tests; docs: `docs/ARCHITECTURE.md`, `README.md`, `CLAUDE.md` | every text says "citizen(s)" ("Message for citizens:", "sample citizen", "Creating 3 sample citizens…"); the wording per Clarification #2 |
| **C3** statements | `<document> · <field>[ – <part>] <condition>`, "must be met", the COPY-BRIEF's proposed messages | `rules/src/statements.ts` (" – " between document and data becomes " · "; " – " stays before a part), `rules/src/messages.ts` (the proposed messages, from U09's rule logic table), `frontend/src/components/Connector/constants.ts` and `rules/src/personas/constants.ts` ("must be true" → "must be met"); tests `statements.test.ts`, `messages.test.ts`, `mcp/src/views.test.ts`, `mcp/test/server.test.ts` | the rules package writes the design's form everywhere a statement shows (rules step, editor, publish summary, details, test step, approval page, MCP answers) |
| **C4** findings | "contradict each other", counts joined by ", and ", one sentence per finding | `rules/src/checks/findingMessages.ts` (the only module that writes finding texts) and its test; `mcp/src/findings.ts` (`resolutionOf()` texts for agents), the `checks-and-tests` skill; the test-step tooltip and the approval page repeat the package's texts | the texts per Clarification #4; the undrawn texts keep their sentences with the two substitutions |
| **C5** server messages | sign-in, duplicate names, unrequested data, the number check | backend: `routers/auth.py` ("Invalid username or password"), `services/rules.py` (`'Another {noun} in {branch} is already called {name}.'`, the variant's duplicate message), `services/form_connections.py`; the editor's own number check in `frontend/src/pages/FormConnectionEditor/RulesStep/RuleEditor/constants.ts` (`enterCount`, "Enter a number greater than 0." → the design's sentence; the server's "enter a number of years of at least 1." messages and their mirror stay); the frontend mirror `rules/src/constants.ts` (word for word, `validation.ts`), `frontend/src/pages/Login/constants.ts`, `RulesStep/constants.ts` (the banner's second sentence "Add the data again in Documents" → "Add it again in Documents", "Add the document again in Documents"); tests: `backend/tests/unit/test_rules_validation.py`, `tests/api/test_form_connection_rules.py`, `test_auth.py`, `test_form_connection_drafts.py`; `mcp/test/fakeBackend.ts` mirrors the messages | "Username or password is wrong. Check both and try again."; "There's already a rule called "Rule 01" in Ambulance." (the group message follows the same template, "There's already a group called "Group 01" in Standard.", a judgment call the task records); "There's already a variant called "Ambulance"."; "Enter a whole number greater than 0."; the unrequested-data fact sentence is already the design's and stays ("Rule 02 in Standard checks data that's no longer requested.") |
| **C6** test formats | the data card and headings of the test step | `rules/src/personas/messages.ts` (" (age 19)"), `results.ts` ("Result: doesn't meet …", "1 rule and 1 group"), `values.ts` / `fields.ts` (licence classes rows), `frontend/src/pages/FormConnectionEditor/TestStep/utils.ts` (the date and class formatting the step adds, F10's comment) and the tests of each | the Test 1 frames' formats per Clarification #46: "08.07.2007", "B, BE since 02.05.2010" (one row per issue date), "Valid until <date>", "Result: doesn't meet 2 rules", "Tested as if shared today, 01.11.2026."; how unmet rules inside groups are counted is read from U65 and U66 (**V4**) |
| **C7** "Enter a name for the connection." | the missing connection name | backend: `services/form_connections.py` (the 400 message, shared by connections and drafts); frontend: `pages/FormConnectionEditor/constants.ts` (`nameRequired`); MCP: `mcp/test/fakeBackend.ts`, the `connection-workflow` skill where it passes the message on; backend tests `test_form_connections.py`, `test_form_connection_drafts.py`; docs where quoted | the one text; "Enter a name." stays for the persona name (`TestStep/constants.ts`) and `rules/src/constants.ts`'s rule-name check, and "Enter a name for the variant." is already the design's |

**Rationale**: FR-006 wants the frontend's messages word for word with the server's and the
agents' guidance naming the UI's concepts; one task per C item, run before the components (R12),
keeps every repetition in one change with its tests.

**Alternatives considered**: translating in the frontend only (would break the word-for-word
rule and leave agents with the old concepts); renaming identifiers too (an interface change
without a requirement).

## R3. Verification: the per-node loop, the tables, and what tests cover

**Decision**: "matches its frame" is proven per node by the loop of `docs/FIGMA-WORKFLOW.md`
§3–§4, run by the Opus task agents with the Playwright MCP tools (resize to the frame's width
plus the scrollbar gutter, font check, numeric check with `getBoundingClientRect` and
`getComputedStyle`, screenshot comparison) and recorded as a **verification table** in
[design-notes.md §5](design-notes.md#5-verification-tables): one table per unit of the audit,
one row per frame and state (FR-016), columns *frame · state · element · property · Figma ·
actual · result · item*. A row's result is "match" or the decided item it cites (F#, W#, C#, a
Clarification); a unit is done when no row is open (SC-001). Components are verified once, in
their default state and the interaction states the kit's P33 draws (hover, pressed, focus,
disabled; Clarification 2026-11-06 #3); screens then verify their layout and their own states
with the components in their default state. Spec 002 lost its tables because they were reported
in chat and not kept (its design-notes §11); here the task's report is not enough: the table in
the file is the deliverable.

The frame width is 1440 px for every screen frame (`units.md`); the narrow check (320 px at
200 % zoom, FR-010) and the screenshot matrix of every route × state (SC-005) run in pass I with
the same Playwright MCP tools from the chat, against the running stack; no Playwright dependency
is added to the workspace (constitution IV). The matrix and the keyboard walkthrough (SC-006) are
listed in [quickstart.md](quickstart.md) and their results go into design-notes §6.

**Automated tests** (constitution III) cover pure logic only and stay next to their modules. A
test changes only where an adopted item changes the behaviour it covers: the step line's utils
(four steps), the overview's utils (the welcome page's condition, the search), the test step's
formats (C6), `findingMessages.test.ts` (C4), `statements.test.ts` and `messages.test.ts` (C3),
`rules/src/constants.ts`'s messages (C5, C7), the local drafts (unchanged), the MCP tests (C1,
C2, C7), the backend tests (C5, C7). New pure helpers (the homepage decision, the documents
step's reducer helpers, the menu's vertical placement, the leave-flow state) get a `*.test.ts`.
No DOM test and no `vitest.config.ts` (constitution III).

**Alternatives considered**: visual-regression tooling (would add a dependency and a baseline for
a design that is still being ported); Playwright scripts in the repository (a dependency for a
one-time matrix).

## R4. Shells and layouts: the header pills, the step header, the footer, page scroll

**Decision**: the three layouts are rebuilt in place under their names, after the build notes
(U01, U03, U07) and the frames:

- **`TopBar` → "Shell/Header"** (U03 #29–#40): two fixed 48 px pills, 16 px from the top and
  sides; left the Konnekt pill, right the icon-only account pill (person icon, chevron; FR-030)
  with its menu (name, "Your account", "Log out"; F17). Inside a connection a second pill carries
  the breadcrumb "Your connections / <name> · <status pill>", the name truncated with "…"; the
  product name and "Your connections" run the leave logic of FR-026 in a flow and go home
  elsewhere. The header area gets a white background when content scrolls under it (U03 #39).
  Signed out, the Konnekt pill is white on the light blue page and the account pill is hidden
  (U03 #33). The DE/EN switch is F6 and is not built.
- **`WizardLayout` → the design's page**: the compact step header (`WizardProgress` → "Step n
  of 4", four 4 px segments, `role="progressbar"`, FR-025; the title in `heading/large` and the
  description in `body/small`, U03 #42) sticky with a white background (U03 #43); the footer
  72 px with 40 px buttons (U01 #20), sticky; **the page scrolls** (U01 #15), not an inner
  region, so the current `split:` variant, the `[@media(height<30rem)]` rule and the inner
  scroll container go (R13). Exceptions the design draws: the documents step at ≥ 800 px tall
  fills the viewport and scrolls its two lists (U01 #16); the rules step pins the step head, the
  variant tabs and the selection bar under the header (U01 #17–#19); the test step scrolls its
  panel (F43). Dialogs and toasts render in the top layer as today.
- **The details** keep `WizardLayout`'s frame with no step line (FR-025e) and an 832 px centred
  column (U07 #5), the status band (U07 #6, F66: the ⋯ menu and "Activate again" at its right
  end, no date pill), the Links and Summary accordions (FR-046) and, for a draft, the footer with
  "Edit connection" and "Go to connections →" (FR-049).
- **`AuthLayout` → the sign-in frame** (U02 #13–#14): the login art and the tagline in one row
  pinned left, the card 153 px from the right edge; at about 1280 px the image slides out, under
  1024 px it is hidden and the tagline and card keep 80 px from the edges; below that the
  baseline's reflow (W2).
- **`AppLayout`** keeps the signed-in screens (overview, welcome page, consent, account, approval)
  under the header pills with the design's column widths; `scroll-padding-top` follows the new
  header height.

**Rationale**: the frames and the build notes draw these shells once for every screen, so the
layouts are the first UI work after the tokens (pass F), and every page task then builds inside
them.

**Alternatives considered**: keeping the inner-scroll wizard (the design's sticky model and the
pinned rules head are drawn for page scroll, and the 400 % zoom rule of WCAG 1.4.10 is met by the
page scrolling); a separate layout for the details (the design's details are the wizard's last
screen, as before).

## R5. Motion (FR-050)

**Decision**: CSS only. The durations become `@theme` tokens in `index.css`
(`--duration-pill: 240ms`, `--duration-colour: 150ms`, `--duration-height: 200ms`,
`--duration-page: 150ms`), used through `transition-*` and `duration-*` utilities; the pill
growth animates the connection pill's width with its text fading in during the last 120 ms (U03
#40); colour changes transition over 150 ms; a page fades in over 150 ms with an animation class
on the layout's main region keyed by the route; heights (accordions, menus, the documents list)
animate with `grid-template-rows` from `0fr` to `1fr` in 150–200 ms; dialogs fade; the 0.5 s
"Published" delay is behaviour (Clarification #33) and stays under reduced motion. One rule,
`@media (prefers-reduced-motion: reduce)`, sets `transition: none` and `animation: none` on the
transitioning elements (F62: turned off, not "fades only"). No animation library (constitution
IV).

**Alternatives considered**: a JavaScript animation library (a dependency for six transitions);
the View Transitions API for the page fade (browser support uneven in the evergreen set the
team uses; **V5** if a task prefers it).

## R6. The welcome page and the homepage (FR-027)

**Decision**: the routes stay (FR-003). `/` renders the **welcome page** ("Welcome to Konnekt",
U11 `6699:44481`, `6699:44486`; U18's frames without the example entry, F15) while the list of
connections, drafts included, is empty, and the overview otherwise; a sign-in without a requested
route goes to `/` (today it goes to `/get-started`, which stays the first-connection flow that
"Create connection" opens, with its own local draft, W11). The decision is a pure helper
(`pages/FormConnectionList/utils.ts`, tested): `welcome` when the loaded list is empty, `overview`
when it holds anything; while loading, the **remembered state** of the device decides what to
render, so a reload shows no flash: one `localStorage` flag per account (`<prefix>:<account>:
homepage:has-connections`, written whenever the list loads; the `:` in the last part keeps the
local drafts' store from taking the flag for a draft, T039), read and written by one new hook,
`hooks/useRememberedHomepage.ts`. The CLAUDE.md rule "only `useLocalDraftStore` touches
`localStorage`" is widened to "only `useLocalDraftStore` and `useRememberedHomepage` touch
`localStorage`" in the documentation task. Deleting the last connection shows the welcome page
again; the flag follows the list.

**Alternatives considered**: a new route for the welcome page (FR-003 keeps the routes; the design
draws it as the homepage); storing the flag through the local drafts' store (mixes two concerns;
the pure `keys.ts` is reused for the key's shape only); no memory (a flash of the wrong page on
every reload, which Clarification #9 rules out).

## R7. Rule checks on the published details (FR-047)

**Decision**: `FormConnectionDetail` runs `useRuleChecks()` on the published revision's rule
set, as the approval page already does for a draft's, in the same module Worker
(`workers/checks.ts`); the Summary accordion shows the findings lines with
`FindingsBannerLine` in a read-only variant (names not links, Clarification #36), and the variant
tabs show the problem icons through `BranchName`'s `FindingsSegment` (FR-041). Findings are never
stored, sent or logged: no `console.*` in the page, nothing new in the API (FR-007).

## R8. The documents step, the toasts with actions, the search

**Decision**: the documents step becomes a master-detail with a reducer of its own
(`DocumentsStep/` folder under the editor: `types.ts`, `constants.ts`, `utils.ts` + test,
`reducer`): the list of added documents in catalog order with the "Document n of m" pager and the
"Added documents (n)" counter, one document's fields on the right with the per-document count
("6 of 25 data items chosen"), the search card with "Available (n)" / "Added (n)" and its
no-results text, inline removal with an **undo toast**, the "Keep document" / "Remove document"
confirmation when no rule checks the document and 002-S1.1's dialog when one does (F72), the
nothing-chosen validation ("1 document needs data", the "Choose data" / "Remove 1 document"
dialog, F67) and "Set rules →" disabled with "Add a document first" (FR-031). Documents keep
catalog order (F23) and fields show no group rows (F24). The editor's reducer keeps owning the
documents and fields; the step's reducer holds only view state (selected document, search query,
pending removal). The current `DocumentCard`, `DocumentPicker`, `FieldChecklist` and
`UpcomingDocuments` files are replaced or removed (F3 drops "Coming soon").

**Toasts** gain an optional action ("Try again", "Undo", "Show"; FR-051 (33), FR-033) in
`components/Toast`: one toast is visible at a time, the newest replaces the previous, every
toast is announced through the live region (001-S7.7), and an action toast stays until used or
dismissed. The failed-save toast carries the error ID of a 5xx (FR-033). (Superseded by spec 010's
FR-082, `specs/010-revamp-backend-gaps/spec.md`: every toast, with or without an action, closes by
itself after 6 seconds, the time running only while neither the pointer nor the focus is on it.)

**The overview search** (FR-051 (27)) filters the loaded list in the page with a pure helper
(name and description, case-folded), with a visible label, ×, "n of m connections", a no-results
message and "Clear search"; no request to the backend.

## R9. Dialogs

**Decision**: `ConfirmDialog` stays the one dialog component, extended for the kit's dialog set
(P12: desktop/mobile, 1–3 buttons, long labels, scrollable) and the design's rules: a close ×,
Escape, and a click on the scrim close a dialog that does not delete or publish (FR-052a, a
`dismissOnScrim` prop, off for the delete, publish and restore dialogs; the restore dialog's ×
and scrim behave like Escape per FR-049); the focus stays inside and returns to the opener
(FR-009). The new dialogs are variants with their copy in the pages' `constants.ts`: "Leave this
connection?", "Save your changes?", "Save before you log out?", "Discard your changes?", "Edit
"<name>"?", the nothing-chosen dialog, the edit-data dialog of the test step (a form dialog with
"Cancel" / "Save and test"), the regeneration question, the conflict (W3), restore (W4) and
discard (W5) dialogs. The publish dialog keeps its own component (states in
[data-model.md](data-model.md)).

## R10. Menus, popovers, tooltips and disabled buttons' explanations

**Decision**: every menu stays positioned from its trigger's wrapper with Tailwind class sets,
as `popupPlacement.ts` does today, because the constitution forbids inline styles and
per-instance coordinates have no class (revised 2026-11-07 by the analysis, finding C1: the
earlier decision, `position: fixed` in the top layer, needed inline `top`, `left` and
`max-height`). The side comes from `placementFrom()` as today (FR-009d, build note 3); the helper
gains two more class choices, measured when the menu opens: the vertical direction, `'down'` when
the menu's height fits between the trigger's bottom and the footer's top (or the viewport's
bottom) and `'up'` otherwise (`top-full` / `bottom-full` class pairs), and the max-height step,
the largest of a fixed set (160, 240, 320, 400, 480 px, one `max-h-[…]` class each) that fits in
the space to the header's bottom or the footer's top minus 8 px, with the list scrolling inside
while the search field and the bottom row stay put. Nothing between a menu and the page clips or
makes a containing block (`overflow-visible` on the frames, cards and rows that hold a menu, no
`transform` or `filter` on them; rounded corners clip only their own background), and a `z-index`
above the sticky header and footer keeps the menu on top, so the top layer isn't needed. Escape
and a click outside close it, arrow keys move between items (`menuNavigation.ts` stays).
`ActionMenu`'s width follows the design's 220 px now that the Revamp's 14 px `label/small` fits
(spec 002's 248 px is history). The copy-to-variant popover (FR-040) and the tooltips use the
same placement, and a tooltip opens on hover, on focus and on touch (FR-052g), with the design's
arrow. **Disabled buttons that explain why** (FR-034, FR-052b) are rendered
`aria-disabled="true"`, focusable, ignoring activation, so that hover and focus reach them; the
explanation is the same tooltip. The Popover API is not used: a top-layer element leaves its
wrapper's coordinate space, so it needs coordinates (inline) or CSS anchor positioning, which the
browser set (plan, Target Platform) doesn't guarantee. **V6**: no ancestor of a menu clips or
transforms, checked on every screen that holds one.

## R11. Own components after the kit's anatomy

**Decision** (option c of R1), rebuilt in place under their names or added:

| Component | Source | Note |
|---|---|---|
| `ConnectionStatusBadge` → the Status/Connection pill | U07 #1–#4 | dot + coloured label, tint fill, radius 8; types active, draft, deactivated ("scheduled" is F1); the text stays (005-ACC.1) |
| `WizardProgress` → the step line | U02 #1–#4, FR-025 | four segments, `role="progressbar"`, clickable while editing only (F25) |
| `TopBar` → the header pills | U03 #29–#40 | R4 |
| `StatusBand` (new, in `pages/FormConnectionDetail/`) | U07 #6–#8, F66 | h1 status sentence, sub-line, picture (colour or grey), ⋯ menu and "Activate again" at the right end |
| `Toast` | U10 #20, U51, U61 | neutral dark toast, bottom centre, optional action |
| `ActionMenu`, `Connector` (pill with the two-option menu), `InfoTooltip`, `CopyPopover` | build note 3, FR-038, FR-040 | R10 |
| `RuleRow`, `GroupFrame`, `BranchMark`, `BranchName`, `FindingNote`, `ValuesPicker`, `Checkbox` | the rules frames, P33's states | the statement chips and symbol chips are styling (cosmetic 22) |
| `LocalDraftsOffer` | U16, U07 #13–#15 | the grey banner, heading-only for one draft (FR-029) |
| `CopyableUrl` | U80, U81, U07 #10 | one line cut with "…", "✓ Copied" for 2 s (FR-048), disabled while deactivated with its explanation |
| `IconTile`, `FeedbackLoader`, `PageLoader`, skeletons | U10 #17, U74, U06 #95 | the design's 56 px spinner and skeletons |
| the welcome page (`pages/FormConnectionList/WelcomePage.tsx`) | U11 1b, U18 | R6 |
| the documents step's list, detail and search card | U20–U28 | R8 |
| the persona chips, data card and result rows | U65–U74 | FR-043, F63, C6 |
| `AccessLevelChoice`, the consent, account and approval pages | W16 | the kit's radios, cards, list rows and dialogs, 007's wording |

Every component keeps its folder and its sibling `types.ts` / `constants.ts` / `utils.ts`, and a
list stays a sub-component (constitution).

## R12. Order of work and what each chat produces

**Decision**: `tasks.md` follows the passes of [brief.md](brief.md) §3, which `plan.md`'s "Rules
for `/speckit-tasks`" fixes as phases:

1. **Foundations (pass D)**: the overlay block and the `@theme` changes (R1, R5), the assets, the
   AA contrast check of the Revamp pairs (W1, the first log entries in design-notes §1), the
   component decision table confirmed, the KERN doc addendum.
2. **Copy outside the frontend (C1–C7, R2)**, before any component, each with its tests and the
   MCP guidance, so that the frontend's word-for-word mirrors and the agents' guidance are
   settled when the screens are built.
3. **Shared components (pass E)**, the 35 folders of `components/`, each through the per-node
   loop with its table, three agents in parallel at most (Figma's rate limit).
4. **Layouts (pass F)**: `TopBar`, `UserMenu`, `AppLayout`, `WizardLayout`, `WizardProgress`,
   `AuthLayout`, the dialogs, the toasts, `NotFound`.
5. **Flows (pass G)**, one phase per user story: G1 sign-in, forgot password, welcome page,
   overview, local drafts (US1); G2 step 1 and the documents step with the leave model (US2); G3
   the rules step, the editor, the variants, the findings and the test step (US3, two or three
   chats); G4 the publish dialog, the details, the draft details, the confirmations and the edit
   flow (US4); G5 consent, account, approval (US5).
6. **Removal (pass H, R13)** and 7. **Verify and close (pass I, R3)**: the screenshot matrix, the
   keyboard run, `/speckit-converge`, the docs checklist, the PR text.

A chat starts by reading the brief, CLAUDE.md and `tasks.md`; the checkboxes of `tasks.md` and the
tables of `design-notes.md` are the only state between chats. The redesign lands as one change
(FR-018), so no phase is merged on its own.

## R13. Removal of the old design (FR-015, SC-003)

**Decision**: pass H runs a checklist with grep commands ([design-notes.md §7](design-notes.md#7-removal-checklist-pass-h-fr-015-sc-003)):

- `index.css`: the `:root` adaptive pins (absorbed into the overlay), the `split` custom variant,
  the indeterminate-checkbox rule (replaced by the design's mixed state), `@theme` tokens no
  longer referenced (`--shadow-chip`, `--text-step`, and the shadows if the kit's elevations
  replace them), `.kern-btn--danger` re-derived or removed;
- `constants.ts`: `CONNECTION_STEPS` with five steps, `APP_NAME` "Connection Portal";
- `assets/`: every SVG or image no file imports (`grep -rL` over `src/`);
- CSS overrides and Tailwind classes that reproduced KERN 2.8 values (a grep for the old hexes
  `#131525`, `#2044aa`, `#51577a`, `#c0c3d5`, `#f3f4f7` and for `248` as the menu width);
- the docs: `docs/FIGMA-WORKFLOW.md`'s list of where decisions are recorded (008 first, 001/002 as
  history), `docs/ARCHITECTURE.md`'s frontend section (layouts, scrolling, the five steps, the
  header), `docs/KERN-DESIGN-SYSTEM.md` (the overlay), `CLAUDE.md`'s UI rules; spec 002's
  `design-notes.md` §9 gets a "superseded by spec 008" note, its audit files stay as history;
- texts: `grep -rn "Connection Portal\|[Aa]pplicant"` over `frontend/src`, `rules/src`,
  `mcp/src`, `mcp/plugin`, `backend/app`, `docs`, `README.md`, `CLAUDE.md` finds only
  identifiers (R2) and history (`specs/00[1-7]`).

## R14. What this checkout can run

**Decision**: the checkout is an rsync mirror with read-only git (brief §2.7) and had no
`node_modules` on 2026-11-07; the Node gates need `npm install` at the root first, and the
backend gates `uv sync` in `backend/`. The quickstart lists both. KERN 2.8.2's `kern.css`, used
for the token diff, was read from a sibling checkout's install. The user commits on the other
machine; no task commits.

## R15. Verify at implementation

| # | What to check | Where |
|---|---|---|
| V1 | The overlay at `:root` beats `kern.css`'s `@media (min-width: 768px)` blocks for the adaptive type by cascade order, on every width | the foundations task |
| V2 | `kern.css` derives every `-contextual` alias from the plain variable the overlay sets; otherwise the overlay sets both | the foundations task |
| V3 | The three image exports weigh under about 300 KB each at 2×; otherwise re-export or optimise losslessly. For the new visuals that replace them (bug `new-visuals`, 2026-11-21): lossless, at most 1.5 MB each | the assets task |
| V4 | How "Result: doesn't meet 2 rules" counts rules inside unmet groups, read from U65 `7057:58811` and U66 #19/#25 | the C6 task |
| V5 | The page fade: a CSS animation on the main region, or the View Transitions API if every evergreen browser the team uses supports it | the layouts task |
| V6 | No ancestor of a menu clips (`overflow`) or creates a containing block (`transform`, `filter`) between the menu and the page, and a `z-index` keeps it above the sticky header and footer (R10: class-set placement, no inline styles) | the `ActionMenu` task and every screen task that holds a menu |
| V7 | AA contrast of the Revamp pairs where they are text: `feedback-info` `#0284c7` on `#ffffff` (about 4.1:1) and on `#e0f2fe` (about 3.6:1) fail for normal text, so an info-coloured text (the blue "Draft" label, build note 32) needs the nearest passing value, recorded per Clarification 2026-11-06 #2; icons need 3:1 | the foundations task |
| V8 | Fira Sans 500 (Medium, used by `heading/display` and `heading/x-large`) is in `@kern-ux/native`'s font files; `document.fonts.check('500 32px "Fira Sans"')` | the foundations task |
| V9 | `beforeunload` for "Leave site?"; no router blocker: React Router's `useBlocker` needs a data router and the app mounts `<BrowserRouter>` (`frontend/src/main.tsx`), which stays, so the browser's back button is a forced leave with the local draft as its safety net (005-S4, FR-026) | the leave-model task |
| V10 | The Test step's tab tooltip and the details' findings use the same `useRuleChecks()` instance shape as the approval page | the details task |
