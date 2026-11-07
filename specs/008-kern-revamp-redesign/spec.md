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
`005-FR-016`, `007-S2`; the audit's index refines a section into its items, `002-S3.4`.

| Spec | Contract | Screens it fixes |
|---|---|---|
| 001 | `specs/001-servicebw-eudi-middleware/contracts/ui-screens.md` | sign in (S1), forgot password (S2), overview (S3), first connection (S4), create and edit (S5), details (S6), accessibility (S7), the sign-in guard; the contract carries no section ids, so its sections are numbered in document order |
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
| **F item** | the design draws something the baseline lacks: a feature, a control, a state, a screen | **adopt**: it becomes a requirement of this spec; **defer**: it would need a change outside the frontend, so the frontend leaves it out and it is recorded as a later feature; or **drop**: it is not built |
| **W item** | the baseline has something the design does not draw: spec 007's consent, user and approval pages, and states such as loading, server errors, conflicts and the local drafts' offer | **build**: the baseline's behaviour and wording, from the new components and patterns, no frame; or **drop**, only when the design removes it on purpose, which is a behaviour change to record |
| **C item** | copy the design rewrites that another package provides (the validation and error messages of the backend, the rule statements, the findings' texts, the KERN kit's translations), and a renamed concept (connection, variant, "Standard", rule, group, document, the product name) | **adopt**: the copy or the name changes in every place that provides or repeats it; or **drop**: the current copy stays |

## Clarifications

### Session 2026-11-06

- Q: When the design draws a feature that would need a change outside the frontend (a backend
  endpoint, a rule capability, an MCP tool), may clarify adopt it with that change, or must it wait
  for a later spec? → A: Defer: the frontend leaves the feature out, and it is recorded as a later
  feature; the backend, the rules package and the MCP server never change for a feature the design
  adds.
- Q: When a colour pair in the design fails the WCAG AA contrast ratio, should the port adjust it,
  keep it, or ask per pair? → A: Adjust: the port uses the nearest value that passes AA, records
  the change in the design notes with the pair it fixes, and the designer is told; no clarify
  question per pair.
- Q: Which states must a component's visual verification table cover before it counts as done? →
  A: Once per component: its default plus the interaction states the kit draws (hover, pressed,
  focus, disabled); a screen's table then covers its layout and its own states (loading, empty,
  error, success) with the components in their default state.

### Session 2026-11-07

Pass C: the 45 clarify questions of `figma-audit/report.md` ("Clarify questions"), asked in the
report's order. Each entry records the decision, the surfaces it reaches (units and node ids as the
report lists them) and the exact wording to port. Adopted items are FR-019 to FR-052; every
deferred item is collected with its frames and wording in [deferred.md](deferred.md), ready for a
later `/speckit-specify`.

- Q: Should the product be renamed "Konnekt" everywhere, as the design names it, or stay
  "Connection Portal"? (Q1, C) → A: Adopt "Konnekt" in every place; "Connection Portal" remains
  nowhere.
  - Surfaces: the header product name in every frame U10–U100 (U11 6699:44242, U12 6699:45198,
    U17 6699:47945, U80 6701:40160, U99 6730:39734; sign-in U03 6703:39311); the h1 (U11
    6699:44486, U18 6793:47682); the rules intro in every rules frame (U29 6702:39345, U41
    6702:40918, U98 6730:39128, U99 6890:46203); the rules empty state (U29 6504:43841, U51
    6197:11654); the missing-value notes (U30 6348:40756, U32 6350:42726, U53 6324:15673); the
    edit-flow notes (U05 6730:40340); the tab titles (FR-012b); the undrawn consent text (007-S1.2)
    and account empty state (007-S2.5); outside the frontend: the MCP guidance
    (`mcp/plugin/skills`), any backend or MCP text naming the product, README and docs, renamed in
    the same change.
  - Wording: "Welcome to Konnekt"; "… Konnekt checks each rule and tells your service whether it's
    met."; "Without rules, Konnekt …"; "… Konnekt reports it as "couldn't be checked"."; 007-S1.2
    reads "{client_name} wants to act on your behalf in Konnekt. Choose what it may do."; 007-S2.5
    reads "No agent is connected yet. Add Konnekt's MCP server to your agent to connect it."
  - Supersedes: no Clarification.

- Q: Should the people who share wallet data be called "citizens", as the design writes everywhere,
  instead of "applicants"? (Q2, C) → A: Adopt "citizen" in every place; "applicant" remains
  nowhere.
  - Surfaces: step 1 and documents (U18 6793:47711, U20 7290:60373, U26 6701:39917; removal
    dialog U26 6324:40396); the rules step title and intro in every rules frame, "Message for
    citizens:" on every rule row (rules, details, draft details, e.g. U94 7246:52838) and in the
    editor placeholder (U30, U31, U32), the counting notes (U30, U32, U50, U53), the nationality
    hint (U53 #29), the group-message hints (U35 #27, #35); the findings (U44 6750:40882, U45
    6753:40514, U46 6753:41324, U71 7058:61632, U63 7112:48859, U77 6760:47979); the test step
    title and intro (U63–U79, U99, e.g. U66 7057:59541), U68 7058:61334, U74 #12, #23, U70 #23;
    the delete dialogs and warnings (U14 6699:44480, U15 6699:45320, U90 6417:31599) and the
    status sub-line (U87 #5); the undrawn approval page "Rule checks" (007-S3.8). Sources: the
    frontend, `rules/src/checks/findingMessages.ts`, the rules package's test texts, the MCP
    guidance that repeats findings.
  - Wording: "Set eligibility rules for citizens"; "Message for citizens:"; "No citizen can meet
    the rules of <variant>."; "Every citizen meets this rule."; "The other two citizens stay as
    they are."; "Creating 3 sample citizens…"; "Couldn't create sample citizens"; "<variant> has
    no rules yet, so every citizen meets it. …"; "the citizen shares their data".
  - Supersedes: no Clarification.

- Q: Should the rules package write rule statements the design's way, with "·" between document
  and field, "must be met", and the COPY-BRIEF's proposed messages? (Q3, C: copy:rules, 002-S2.27,
  002-S3.9) → A: Adopt: the rules package writes `<document> · <field>[ – <part>] <condition>`,
  "must be met", and the COPY-BRIEF messages, everywhere.
  - Surfaces: rule rows in every rules frame (U30 #31, U41 #11, U55 #11); the editor's proposals
    (U09 #3); the publish summary; the details and draft-details summaries (U82 #20, U83 #25, #26,
    U84 #27, #29, U85 #22, U91 #22, U93 #14, U94 #17, #19, U96 #23); the test-step statements; the
    approval summary (007-S3.7); MCP outputs that quote statements. "must be met" from U03 #18.
  - Wording: "Personal ID · Date of birth (Age) is at least 21 years old"; parts keep "–":
    "Driving licence · Licence class B – Issue date …"; "must be met" for "must be true". The
    statement chips and the document icon are styling.
  - Supersedes: no Clarification.

- Q: Should the findings of the rule checks use the design's sentences ("contradict each other",
  counts joined by ", and") instead of the current texts of the rules package? (Q4, C:
  copy:findings) → A: Adopt: the drawn texts become the findings texts, the noun per Q2.
  - Surfaces: the rules banner (U44 6750:40882, U45 6753:40144, U46 6753:41324, 6758:43067); the
    notes (U44 #33, U45 #32, #35, U46 #32); the tab tooltips (U46 6758:43524, U71 7058:61632); the
    publish-dialog lines (U63 7112:48859, U77 6760:47979); the test-step tab tooltip (004-S8.2.3);
    the approval "Rule checks" (007-S3.8); the MCP guidance. Source:
    `rules/src/checks/findingMessages.ts`.
  - Wording: "Rule 01 and Rule 02 contradict each other, so no citizen can meet the rules of
    Standard." (one sentence; "so right now …" for today-only findings); "Rule 04 and Rule 05 in
    this group contradict each other."; "Sub-group 01: Rule 04 and Rule 05 contradict each
    other."; the counts row "2 rules contradict each other, and 1 rule is a duplicate"; the publish
    lines "Ambulance: no citizen can meet these rules. 2 rules contradict each other, and 1 rule is
    a duplicate." and "Standard: 1 rule is a duplicate."; the tooltip "Rule 01 and Rule 02
    contradict each other, so no citizen can meet these rules."; the undrawn texts (003-CP.3,
    CP.5–CP.7, CP.9, CP.10, CP.12–CP.18) keep their sentences with "can't be met together" →
    "contradict each other" and counts joined by ", and ".
  - Supersedes: no Clarification.

- Q: Should the backend's validation and sign-in messages take the design's wording, and if so,
  should they keep naming the variant where the baseline does? (Q5, C: copy:server) → A: Adopt
  the design's wording, keeping the variant where the baseline names one (002-S2.18, 002-S2.19).
  - Surfaces: sign-in (U10 6401:28435); duplicate rule name (U49 6196:10710); duplicate variant
    name (U60 6523:37808); unrequested data (U50 6863:47363, 7173:52333, tooltip 7375:101551).
    Sources: the backend's auth and rules services, `rules/src/validation.ts` (word for word with
    the server), the MCP server (agents read these).
  - Wording: "Username or password is wrong. Check both and try again."; "There's already a rule
    called "Rule 01" in Ambulance."; "There's already a variant called "Ambulance"."; "Rule 02 in
    Standard checks data that's no longer requested. Add it again in Documents, or edit or delete
    the rule."; "Rule 03 in Standard checks data from Driving licence, which is no longer
    requested. Add the document again in Documents, or edit or delete the rule."
  - Either way: the number check stays whole numbers ≥ 1 (002-S3.16), so U49's "Enter a number
    greater than 0." reads "Enter a whole number greater than 0."; the "Add it in Documents" action
    stays (002-S2.25), although the design draws it as plain text.
  - Supersedes: no Clarification.

- Q: Should the test step's data cards and headings use the design's formats ("08.07.2007 · 19",
  "Valid until …", "B since … · 1 year", "Result: doesn't meet the rules") instead of the rules
  package's current ones? (Q6, C) → A: Adopt the design's formats in the rules package.
  - Surfaces: the data cards and headings in U63, U65–U79, U99; the edit form's "Age today"; the
    test-day line (build note 8).
  - Wording: "08.07.2007 · 19" (date of birth with the age; no age where the frame shows none);
    "Valid until <date>" (expiry); "B since <date> · <n> year(s)" (one row per class); "Result:
    doesn't meet the rules" (no count); "Tested as if shared today, 01.11.2026." (dd.mm.yyyy).
    Dropped: "08.07.2007 (age 19)", a bare expiry date, the codes row "B, BE" plus one row per
    class date, "Result: doesn't meet 2 rules", "1 Nov 2026".
  - Supersedes: no Clarification. Amended by #46 (second round, Remap Q1): the Test 1 frames'
    formats replace these, except "Valid until <date>" and the test-day line.

- Q: Should the wizard use the design's compact "Step n of 4" header with four unlabelled
  segments and a publish dialog, instead of the baseline's five labelled progress entries? (Q7, F,
  Conflict 5) → A: Adopt the compact header; Publish is a dialog, not a step.
  - Surfaces: the header of every wizard frame (U17 6701:39488, U18 7344:96393, U19–U79 #6, U62
    7112:47827, U67 7058:60675, U98 #8, U99 #24, #38, U100 #6); build notes U02 #1–#4, U03 #42,
    U05 #29, U06 #23, #67; details U63 #27, U80 #27, U83 #37, U86 #32; draft details 005-S6.2,
    005-S6.3.
  - Wording and behaviour: "Step n of 4" with four segments and "Next: <step>" / "Last step", a
    `role="progressbar"` with `aria-valuenow` (U02 #3); not clickable when creating, clickable
    when editing; the details and draft details have no step line. Dropped: five labelled entries
    (Connection, Documents, Rules, Test, Publish) whose finished steps lead back, and the details'
    all-done progress.
  - Supersedes: 004-S0.1 (labelled entries), 004-S0.2, 004-S0.3, 004-S7.3, 001-S6.2, 005-S6.2,
    005-S6.3 and US2-AS1's five steps; FR-003's "five wizard steps" reads four steps and the
    publish dialog. No Clarification.

- Q: When a team member leaves the wizard through the product name, the breadcrumb or log-out,
  should the app store a draft and ask, as the design draws, or navigate and keep the work as a
  local draft, as spec 005 does? (Q8, F, Conflicts 1 and 2) → A: Adopt the design's model:
  (a) adopt, (b) adopt, (c) drop, (d) adopt, (e) adopt. The local draft of the device is a safety
  net for a crash only; by default a team member saves and exits a complete draft, and a rule must
  be saved (complete) before a draft is stored.
  - (a) Product name or "Your connections" in a flow (U03 #35 6703:39311; U05 #41, #43 6730:40338;
    U06 #51, #70, #90; U17 #2, #5, #21, #22, #24, 7173:52656, 6890:46052; U99 #33): runs Save and
    exit, which stores or updates the stored draft; a validation error keeps the member in the
    flow. Supersedes 001-S0.6's plain link and 005-S4.1 for this case.
  - (b) Leave dialog (U17 7173:52681, 7173:52682) and the browser's "Leave site?" warning
    (beforeunload, U05 #43): as drawn. Title "Leave this connection?"; body "If you leave now, you
    lose all progress. Save it to continue later, or discard the connection."; buttons "Discard
    connection" (danger outline) and "Save progress" (primary), close ×. "Save progress" runs
    Save and exit; "Discard connection" leaves without storing and discards this flow's local
    draft, so the body is true. The design's two frames for the same click (frame 2's dialog, frame
    6a's silent save) are read as: the click opens the dialog. The local draft stays the safety
    net after a crash or a forced leave, and the overview's offer (005-S4) stays for it.
  - (c) An open rule editor on leaving: drop. "Save changes to Rule 01?" asks first (005-S1.1); a
    rule is saved or discarded before the draft is stored, and no editor state is stored (build
    note 31, U06 #90 7137:50569, is not built).
  - (d) The info strip in step 1 (U07 #18 7370:55189; U18 #20 6793:47736; U19 #13 6699:45346):
    adopt, with the info icon and the text "Starts as a draft. It only becomes active when you
    publish."
  - (e) Log-out dialog (U05 #42; U17 #19, #20, 6408:72737, 6408:72919): adopt. Title "Save before
    you log out?"; body "Your latest changes will be lost if you log out now."; "Save and log out"
    (primary, stores the draft and then logs out), "Log out anyway" (secondary), plus a "Cancel"
    (and the ×) that returns the focus to the user menu. Supersedes 005-S7.2–S7.5. Dropped: "Log
    out and discard unsaved work?", the list of names, "Saved drafts stay as they are.", "Log out"
    (danger).
  - Supersedes: 001-S0.6, 005-S4.1 (for in-app leaving), 005-S7.2–S7.5. No Clarification. (a)
    and (b) are amended by #47 (second round, Remap Q2) for the edit flow of a published
    connection, which asks "Save your changes?" instead.

- Q: Should the "Welcome to Konnekt" page become the first page after a sign-in without
  connections, with a "Start from an example" that creates an example draft? (Q9, F, Conflict 3,
  Figma-only 2) → A: (a) adopt the welcome page as the first page after a sign-in without
  connections, with its state in localStorage; (b) defer "Start from an example".
  - (a) Surfaces: U11 6699:44481, 6699:44486; U18 6793:47682; build note 31 (U06 #85, #86,
    7137:50569). Behaviour: while no connection exists (a draft counts), the homepage `/` shows
    the welcome page "Welcome to Konnekt", and sign-in without a requested route opens it; as soon
    as one connection exists the homepage is the overview "Your connections"; deleting the last
    one shows the welcome page again; a localStorage flag keeps the state on a reload; "Create
    connection" opens step 1. The routes stay (FR-003). Supersedes 001-S4.1, 001-S4.2 and 001-S4.8.
  - (b) Surfaces: U06 #25 (6791:46863), #91; U11 #26, #28; U18 #8, #10–#12, #16, #23, #32; U73
    #25. Deferred: the dialog that creates the stored draft "Passenger transport licence
    (example)" (2 documents, 2 rules, a variant), the example banners per step and the
    publish-dialog line "This is still the example. Check that the name, documents and rules fit
    your service." need a draft marked as an example, a stored attribute (Clarification
    2026-11-06 #1); the welcome page is built without the example entry, and the feature is
    recorded for a later spec.
  - Supersedes: 001-S4.1, 001-S4.2, 001-S4.8. Clarification 2026-11-06 #1 applied to (b).

- Q: After a failed sign-in, which fields should be marked as invalid: both, neither, or only
  Username as the frame draws? (Q10, F, Conflict 4) → A: Design error: both fields are marked as
  invalid, with the one message; the frame's Username-only marking (U10 #13, 6401:28435) is not
  built.
  - Surfaces: the sign-in error state (U10 6401:28435).
  - Wording: "Username or password is wrong. Check both and try again." (Q5), under both fields,
    which both get the design's error fill. US1-AS1 and 001-S1.2 hold.
  - Supersedes: no Clarification.

- Q: Should each overview row offer Delete, and should rows be selectable for one bulk delete, as
  the overview frames draw? (Q11, F, Figma-only 1) → A: Adopt row delete; defer bulk delete.
  - Surfaces: U04 #4, #14, #19; U06 #66; U11 #9, #19; U12 #8, #10, #20; U13 #9, #18; U14 #8, #15;
    U15 #8, #20, #21, #27 (6699:45206), #29; U16 #23, #30; U17 #29; U18 #39, #45; U90 #27, #33.
  - Row delete: each row's Delete asks the details' confirmation (001-S6.11, or 005-S6.10 for a
    draft), with per-row accessible names (005-S3.5).
  - Bulk delete, deferred: the row and select-all checkboxes, the selection bar "N selected ·
    Cancel · Delete" and the bulk dialog listing the connections with status badges are not
    built; they need an endpoint, so Clarification 2026-11-06 #1 applies and the feature is
    recorded for a later spec.
  - Supersedes: no Clarification.

- Q: On the overview and in the local-drafts offer, should the design's simplifications (one
  hint, equal row heights, one delete dialog, a heading-only single draft) replace the baseline's
  variants? (Q12, F/W, Partials 2 and 3) → A: Adopt all five.
  - (a) Hint (U11 #5, U12 #5, U13 #5, U14 #4, U15 #5, U16 #5, U17 #26, U18 #36, U90 #24): the
    design's one sentence for both states; supersedes 005-S3.6 and 005-S3.7 ("Pick up your draft
    or connect another form." / "Open a connection to copy its links, or connect another form.").
  - (b) Row height without a description (U12 #12, U13 #11): equal heights; supersedes 006-S2.3.
  - (c) Delete dialog (U14 #18, #19, #23, U90 #24): one dialog for a draft and a deactivated
    connection, "Delete connection" / "Keep connection", the draft keeping its body "<name> will
    be deleted for good. It was never live, …"; the baseline's "Delete this draft?" with "Delete
    draft" / "Cancel" is dropped.
  - (d) A single local draft (U16 #7, #11, #18; U07 #13, #14): the heading-only layout, keeping
    the h2 and a one-item list for screen readers.
  - (e) A never-saved item: its button reads "Resume editing", as drawn; the frame name "Discard /
    Continue" is a slip.
  - Supersedes: 005-S3.6, 005-S3.7, 006-S2.3, 005-S6.10's labels. No Clarification.

- Q: Should the signed-in header show an icon-only user pill whose menu shows the name, "Your
  account" and "Log out", instead of the baseline's visible name? (Q13, F/W, Partial 1) → A:
  Adopt the icon-only pill; the email line is deferred.
  - Surfaces: every signed-in frame (#3/#5; U11 #3, U13 #3, #22, #23 (6699:44358), U44 #5, U94
    #5); U10 #18.
  - Behaviour and wording: the pill shows a person icon and a chevron, no name; its menu shows the
    name (bold), then "Your account" (W build, 007-S2.1) above "Log out". The email line
    ("lena.weber@example.org" is sample data) is not shown: the team member API carries a
    username only, so it is deferred (Clarification 2026-11-06 #1).
  - Supersedes: 001-S0.5's visible name. No Clarification.

- Q: Should the documents step be rebuilt as the design draws it (master-detail list, pager,
  search card, inline remove with undo, nothing-chosen validation, drag reordering, field
  groups), or keep spec 001's one-card-per-document step in the new styling? (Q14, F, Conflicts
  6–10, Figma-only 3) → A: (a) adopt, (b) adopt, (c) adopt, (d) drop, (e) defer, (f) defer.
  - (a) Master-detail list showing one document at a time, the "Document n of m" pager, the
    "Added documents (n)" counter and the search card with suggestions "Available (n)" (U04
    #36–#38 6711:39373; U06 #71; U20 #8, #15–#17, #20; U21 #8, #10, #17, #21–#23; U22 #9, #11,
    #20, #23, #25; U23 #8, #10, #18; U24 #8, #10, #17; U25 #8, #15; U26 #8, #9, #19 6324:40326;
    U27 #8, #14, #20; U28 #9, #13, #21; U98 #20, #22, #27): adopt; supersedes 002-S1.8's "spec
    001's step stays".
  - (b) Inline trash on the list item, the undo toast after removing a document, and the
    confirmation for a document no rule checks, "Keep document" / "Remove document" (U22 #12;
    U23 #11, #12, #20 7298:61765; U24 #11, #27 7298:62374; U25 #10; U26 #11; U28 #14; U98 #22):
    adopt; supersedes 002-S1.9. Removal still opens 002-S1.1's dialog when rules check the
    document.
  - (c) Nothing-chosen validation (U04 #30, #32, #33; U05 #9; U20 #14 7290:60367; U22 #14; U25
    #17, #20, #22–#24 7298:62636): adopt the inline red line, "1 document needs data", the dialog
    "Choose data" / "Remove them and continue", and "Set rules →" disabled with the hint "Add a
    document first"; supersedes 002-S1.9, 001-S5.5, 001-S5.6 and 001-S7.6's refusal on attempt.
    Amended by #55 (second round, Remap Q10): the button reads "Remove 1 document" / "Remove <n>
    documents", as U25 draws it.
  - (d) "Publish without rules" on the documents step (U04 #34; U28 #25): drop; supersedes
    002-S1.5 and 004-S1.1, a behaviour change recorded: publishing without rules goes through the
    publish dialog's "Publish without rules?" (002-S5.6, Q41).
  - (e) Drag reordering of documents (U04 #42, #43; U08 #2, #3 7370:55193; U23 #13; U27 #11–#13,
    #24 7298:63317; U28 #12 7298:64157): defer; the API returns and stores documents in catalog
    order, so a stored order needs the backend (Clarification 2026-11-06 #1). The list keeps
    catalog order and no drag handle is drawn.
  - (f) Field groups (Name, Birth, Address, Document, Other details) with tri-state group
    checkboxes (U28 #17; U98 #25; U04 #44, #46; U21 #14; U22 #16; U24 #14; U25 #13; U26 #14; U27
    #17): defer; the grouping must come from the catalog (Clarification 2026-11-06 #1). Fields are
    listed in catalog order without group rows.
  - Supersedes: 002-S1.8, 002-S1.9, 001-S5.5, 001-S5.6, 001-S7.6 (refusal on attempt), 002-S1.5,
    004-S1.1. Clarification 2026-11-06 #1 applied to (e) and (f).

- Q: Should the description in step 1 and the variant dialog be a multi-line textarea, and where
  should the ⓘ with its explanation sit? (Q15, F, Conflict 11) → A: Adopt the textarea; the ⓘ
  stays on the description with the baseline's text.
  - Surfaces: U04 #24 (6703:39321); U18 #18, #19; U19 #11; U98 #13, #14; variant dialog U52 #26.
  - Field: multi-line textarea, not required, ≤ 500 characters, spell check on; the overview row
    and the details' meta stay one line, cut with "…". Supersedes 006-S1.1.
  - ⓘ: on the description, "About the description" / "A note for your team, such as the form's ID
    in your form management system. Citizens never see it." (006-S1.4, 006-S1.5, noun per Q2);
    the design's ⓘ next to "Connection name" is built as drawn, with the frame's text, as #45
    (35) decides later in this session (U19 #11, U98 #13).
  - Supersedes: 006-S1.1. No Clarification.

- Q: When "Save and exit" is used while the connection has no name, should it just leave (the
  local draft keeping the work), or send the flow to step 1 with "Enter a name."? (Q16, F,
  Conflict 12) → A: Drop the design's behaviour; the baseline stays.
  - Surfaces: build note U04 #27. Also the product name, the breadcrumb's "Save progress" and
    "Save and log out" (Q8), which run Save and exit.
  - Behaviour and wording: the flow goes to step 1 with "Enter a name." under "Connection name",
    the field is focused and nothing is stored (005-S1.2); a draft is stored only with a name.
  - Supersedes: no Clarification; 005-S1.2 holds. The message's wording is amended by #58
    (second round, Remap Q13): "Enter a name for the connection.".

- Q: How should saving and a failed save be shown: the design's neutral toast with "Retry",
  title-only alerts and a blocking "Saving your draft…" modal, or the baseline's danger alert with
  the error ID and an aria-disabled "Saving…" button? (Q17, F/W, Conflict 13) → A: (a) adopt the
  toast, (b) title-only alerts only where the alert carries a title alone, (c) drop the modal.
  - (a) A failed save (U05 #22; U17 #3, #23; U51 #22; U79 #4; undrawn 005-S8.1–S8.4, 007-S1.11,
    007-S3.25, 007-S5.3–S5.5): the design's neutral toast with "Retry"; it shows the error ID of a
    5xx and the focus stays manageable (it is not moved into the toast; the toast is announced).
    Supersedes 005-S1.7 and 005-S1.8's danger alert and focus move. Dropped: "Couldn't save your
    draft" with the server's message. Amended by #55 (second round, Remap Q10): the toast reads
    "Couldn't save. Check your internet connection and try again." with "Try again", as U51
    draws it, not "Retry".
  - (b) Title-only alerts (build note 7, U02 #5, #6): adopted only for alerts that carry a title
    alone; an alert with a body (an error ID, a list, "Try again", "Remove it" or "Dismiss") keeps
    those parts in the design's alert style.
  - (c) Saving (U17 #23, 6401:71898, 6401:71899): the modal "Saving your draft…" is not built;
    "Save and exit" is aria-disabled and reads "Saving…", with the polite status "Saving draft…"
    (005-S0.4, 005-S1.4).
  - Supersedes: 005-S1.7, 005-S1.8. No Clarification.

- Q: Should "Test rules" be disabled while a rule is open, incomplete or in error, or while
  grouping, with hints that explain why, instead of staying enabled and asking "Save changes to
  Rule 01?"? (Q18, F, Conflict 14) → A: Adopt the disabled button with its hints.
  - Surfaces: U01 #21, #22; U06 #58; U29 #18; U30 #24, #47; U31 #33; U32 #42; U33 #25; U35 #38;
    U36 #20; U40 #26; U48 #21; U49 #14; U50 #21; U51 #36; U53 #34; U64 #33.
  - Behaviour and wording: "Test rules" is disabled while a rule is open, incomplete or in error,
    or while grouping; it shows "Save the rule first" / "Finish grouping first", and its hover
    explanations also open on focus. Dropped: the enabled button that asks "Save changes to Rule
    01?" and refuses with a message, moving the focus.
  - Supersedes: 004-S2.1, 004-S2.4, 004-S2.6, 004-S2.7, 002-S2.23, 002-S3.11. No Clarification.
    Extended by #47 (second round, Remap Q2) to the edit flow's "Save" on the rules step.

- Q: Should the variant tab row ("Standard", "+ Add variant") show from the start of the rules
  step and while a rule is edited, as the baseline says, or only after the first rule is saved,
  as the design draws? (Q19, W, Conflict 15) → A: Build the baseline: the tab row shows from the
  start.
  - Surfaces: U30, U33, U49–U51, U53 (frames without the row before the first rule or while a
    rule is edited).
  - Behaviour and wording: "Standard" and "+ Add variant" show from the start of the step and
    while a rule is edited (002-S2.2), in the design's tab styling, with the empty state "No rules
    yet" in each variant.
  - Supersedes: no Clarification; 002-S2.1–S2.3 hold.

- Q: Should an ⓘ after "+ Add variant" explain what a variant is on the Rules and Test steps,
  and should the Standard tab show its info icon only when it has a description? (Q20, F,
  Conflict 16) → A: Adopt the ⓘ; Standard's (i) only with a description.
  - Surfaces: U02 #21; U07 #20; U18 #25 (7344:96402); U30 #26, #29; U31 #11; U32 #10; U34 #10;
    U35 #10; U36 #9; U37 #10; U40 #35 (6961:56304); U43 #10; U44 #11; U45 #10; U46 #10, #28; U50
    #10; U51 #10; U52 #10; U55 #10; U56 #10 (6522:32507); U59 #9; U62 #28 (7112:48689); U64 #15;
    U65 #10; U67 #10; U68 #10; U72 #10; U75 #19; U78 #15; U79 #19; U98 #31; U99 #27; U100 #9.
  - Behaviour and wording: an ⓘ after "+ Add variant" on the Rules and Test steps, opening on
    hover and on focus; its text isn't drawn, so it reads "Variants are other versions of these
    rules." unless the design supplies one. Standard's (i) shows only with a description
    (002-S4.25); the frames' icon on a Standard without description is not built.
  - Supersedes: 004-S8.2.6. No Clarification. Amended by #57 (second round, Remap Q12): the ⓘ
    is on the Rules step only, with the design's text (F27).

- Q: Should a variant be renamed inline in its tab (double-click or ⋯ › Rename), with the ⋯
  shown on the active tab only, instead of "Rename" opening the "Edit variant" dialog? (Q21, F,
  Conflict 17, Partial 10's tab ⋯) → A: Drop the inline rename; the baseline's dialog stays and
  every tab has its ⋯.
  - Surfaces: U59 #10, #13–#15 (6523:37251, 6523:37532, 6523:37662, 6523:37665); U60 #9
    (6523:37675, 6523:37683); U62 #6 (7112:47821, 7112:48213).
  - Behaviour and wording: "Rename" opens the "Edit variant" dialog (name and description, no
    "Start with", 002-S4.4, 002-S4.22) in the design's dialog and field styling (U52's labels
    "Variant name", "Description (optional)", the helper "Shows when you hover the ⓘ next to the
    variant name."); the duplicate error "There's already a variant called "Ambulance"." (Q5)
    shows in the dialog next to the field; every tab shows its ⋯ (Rename for all, Delete for
    variants other than Standard, "Copy link" per Q22). Not built: the inline field, "Enter saves
    · Esc cancels", double-click on the tab name, ⋯ on the active tab only.
  - Supersedes: no Clarification; 002-S4.4, 002-S4.5 and 002-S4.22 hold.

- Q: Which entries do the rule, group and variant ⋯ menus carry: the baseline's "Copy link",
  "Rename" and "Copy to variant" that the design omits, and the design's "Group with other rules"
  that the baseline lacks? (Q22, F/W, Conflict 18) → A: Build the three W entries; adopt "Group
  with other rules" in a rule's menu; the same entry in a sub-group's menu is a Figma error.
  - Surfaces: U09 #44; U34 #25; U36 #15, #28; U41 #22; U47 #17, #30, #34; U54 #2, #10
    (6522:33105); U55 #27, #30, #33, #34; U56 #25, #29, #30, #40; U57 #18, #19, #22; U58 #23,
    #28; U59 #11; U61 #25.
  - W build: "Copy link" as the last entry before the destructive ones in every rule, group and
    variant menu (007-S4.1), also after "Restore" on removed items (007-S4.2); "Rename" and "Copy
    to variant" on rule menus (002-S2.16, 002-S2.19); in the design's menu styling and with its
    other labels ("Add message", "Delete sub-group", "Restore rule/group/sub-group", "Remove from
    <variant>", "Reset to Standard", "Delete variant", "Discard changes").
  - F adopt: "Group with other rules" in a rule's menu starts select mode with that rule selected.
  - Figma error: "Group with other rules" in a sub-group's menu is not built (002-S2.10: a
    sub-group offers no further grouping).
  - Supersedes: no Clarification; 007-S4.1, 007-S4.2, 002-S2.10, 002-S2.16, 002-S2.19 hold.
    "Group with other rules" is extended by #48 (second round, Remap Q3): also on a top-level
    group without a sub-group, and only with a neighbour on the same level; and by #60 (third
    round, Remap 2 Q1): also on a rule inside a top-level group, with another rule of that group
    on its level. "Rename" and "Copy
    to variant" are narrowed by #53 (Remap Q8): not on items linked to Standard in a variant,
    and "Copy to variant" only while a variant could receive the item. The W list is extended by
    #54 (Remap Q9): "Rename" and "Remove message" on group and sub-group menus.

- Q: Should groups behave as the design draws them: single-member and empty groups kept, a
  sub-group renamed "Group NN" when it moves up, and members' messages hidden while the group has
  its own? (Q23, F, Conflicts 19 and 20) → A: (a) Figma error, (b) the sub-group keeps its name,
  (c) adopt the hidden member messages as display only.
  - (a) Single-member and empty groups (U35 #21, U51 #21, #24, U47 #35): not built; the baseline
    dissolves a group left with one member or none (002-S2.13, 002-S4.18).
  - (b) A sub-group moving up (U35 #40): keeps its name (002-S2.14); the frame's rename to "Group
    01" is not built.
  - (c) A group's message hides its members' messages (U35 #28; hints #27, #35): while a group has
    a message of its own, each member rule's message row reads "Not shown while this rule is in
    Group 01. Citizens see the group message instead."; the rule keeps its message in the data,
    and the evaluation reports the group's message instead of the members' (as
    `evaluation.py` does). Supersedes 002-S2.5.
  - Supersedes: 002-S2.5 (display). No Clarification; 002-S2.13, 002-S2.14, 002-S4.18 hold.

- Q: Should the AND/OR connector be the design's pill with a two-option menu, and should groups
  stay selectable in select mode? (Q24, F, Conflict 21, Partials 4 and 5) → A: (a) adopt the
  pill menu, (b) Figma errors, (c) build group selection.
  - (a) Connector (U34 #14, #23; chevron pills in U30 #39, U38 #15, U39 #18, U40 #19, U41 #16,
    U42 #22, U44 #27, U45 #15, U50 #17, U51 #13, U52 #12, U55 #16, U59 #19, U60 #16, U62 #12,
    U100 #11; read-only U83 #31): the pill opens a two-option menu, "All rules must be met" /
    "At least one rule must be met", with the description "Applies to every rule in Group 01";
    it is a menu button whose accessible name says the level. Supersedes 002-ACC.2's toggle.
  - (b) Missing connector between groups, trailing connector, link icon on some linked rules
    only (U40 #29, #30 (6961:56291); U62 #19, #21): not built; one connector between items
    (002-S2.8) and the link icon on every linked rule or none (002-S4.31).
  - (c) Select mode (U40 #13; U64 #22): groups have checkboxes and can be selected (002-S2.9).
  - Supersedes: 002-ACC.2 (control type). No Clarification; 002-S2.8, 002-S2.9, 002-S4.31 hold.

- Q: For the Date of birth and the other date checks, should the editor follow the baseline's
  conditions ("Time ago" / "Time from now", whole years as fixed text) and treat the design's
  extra variants as errors, with the fixed-date check deferred? (Q25, F, Conflict 22) → A: Keep
  the "from now" checks; defer a fixed date for the Date of birth; the other variants are Figma
  errors; port the hint.
  - Surfaces: U09 #24, #27 (6986:50041); U29 #27; U31 #40, #43; U03 #2; U46 #13; U49 #18; U50
    #24; U53 #16, #36.
  - Kept: the Date of birth's "Time ago" / "Time from now" checks (002-S3.12–S3.18, 002-S3.30).
  - Deferred: a fixed-date comparison for the Date of birth (evaluator and rules package,
    Clarification 2026-11-06 #1); the editor offers none.
  - Figma errors, not built: "Time passed / Time left", "at most", "on", a unit picker on age
    checks (whole years stay fixed text), "starts with".
  - Hint wording: "Check the time since or until this date, or compare it with a fixed date."
  - Supersedes: no Clarification; 002-S3.12–S3.18 and 002-S3.30 hold.

- Q: Should a saved rule's identifier ("rule-3") show only on the details next to each name, as
  the baseline says, or in the rules step as well? (Q26, F, Conflict 23) → A: Details only.
  - Surfaces: U03 #10 ("Saved rules show their ID" means the details); U83 #24.
  - Behaviour: identifiers next to each rule's and group's name on the details (002-S2.7,
    002-S6.12), in the design's styling; the rules step shows none.
  - Supersedes: no Clarification; 002-S2.7 and 002-S6.12 hold.

- Q: Should the rule editor keep the baseline's states the frames do not draw (ordered pickers,
  inline flags, notes, the part picker, the message placeholder, class descriptions), and should
  the values picker get the design's "Done" button? (Q27, W/F, Partial 9) → A: Build all six;
  adopt "Done".
  - Surfaces: U30 #42, #46; U31 #20; U32 #19, #39, #40; U33 #15; U35 #32; U48 #15, #24; U49 #9;
    U51 #31; U53 #30, #31, #35.
  - W build, with the baseline's behaviour (002-S3.2, S3.8, S3.10, S3.19, S3.22, S3.33, S3.37,
    S3.38): pickers unlock in order (disabled until the previous one is chosen); inline flags next
    to incomplete parts; counting and missing notes next to every date condition; the part picker
    "Choose part" after "Licence classes" in every frame; the message placeholder "Message for
    citizens: Suggested once you choose a check. You can edit it."; class options show the code
    and the description ("B Cars up to 3.5 t").
  - F adopt: the values picker's "Done" button closes the picker and keeps the choice.
  - Supersedes: no Clarification.

- Q: In a variant, should removed items keep their message line and "Changed here" text, should
  a variant based on Standard stay linked when Standard has no rules, and should "Copy to
  variant" be the design's popover or the baseline's dialog? (Q28, F, Partials 6 and 10) → A:
  (a) show the texts, (b) stays linked, (c) adopt the popover with the focus kept inside.
  - (a) Removed items (U43 #27; U47 #15, #32; U58 #26): the message line and the "Changed here"
    text show inside removed groups (002-ACC.1, 002-S4.19); the frames' hiding is not built.
  - (b) Linking (U05 #3; U59 #10): a variant based on Standard stays linked when Standard has no
    rules (002-S4.29); the frames' "not linked" is not built (a rules-package change,
    Clarification 2026-11-06 #1; not recorded as a later feature, since nothing is drawn beyond
    the mark).
  - (c) Copy to variant (U41 #24, #27; U42 #18): the design's popover with its help text; it keeps
    the focus inside and returns it on close (or is built as a dialog); based variants show as
    included and not choosable (002-S4.13); copies to Standard stay linked in the source branch
    (002-S4.14); the frames' unlinked copy is not built.
  - Supersedes: 002-S4.13's dialog as the control. No Clarification; 002-ACC.1, 002-S4.14,
    002-S4.19, 002-S4.29 hold.

- Q: Should the variant tabs carry the design's red problem icon and grey "no findings" ⓘ,
  which finding kinds should the Test tabs show, and do the names in the banner stay links?
  (Q29, F, Partials 7 and 8; U03 #21) → A: (a) adopt the icons, (b) the Test tabs show only "no
  citizen can meet", (c) the banner's names stay links, (d) the test tab's ⚠ comes from the
  evaluator.
  - (a) Problem icons (U06 #7, #9; U07 #19; U50 #8, #22; tooltip U46 6758:43524): a red error
    icon on the tab with the problem text in its tooltip (spec 002 problems and findings), and a
    grey ⓘ when there are no findings; the tooltip opens on hover and on focus. Supersedes
    003-S4.2 and 003-S4.3.
  - (b) Test tabs: only the "no citizen can meet" finding (004-S8.2.2); the frames' other kinds
    on test tabs are not built.
  - (c) Banner (U44 #17; U45 #28, #30; U46 #11; 6753:40144): the names in banner lines are links
    that scroll to and focus the item (003-S2.16, W build); each expanded line's kind icon is
    styling.
  - (d) The test tab's ⚠ comes from the evaluator (FR-003); U03 #21's "no logic" is not built.
  - Supersedes: 003-S4.2, 003-S4.3. No Clarification; 003-S2.16, 004-S8.2.2 hold.

- Q: Should "Edit data" on the test step open the design's dialog ("Cancel" / "Save and test",
  results updating on save, a toast) instead of the baseline's inline fields where every valid
  change applies at once? (Q30, F, Conflict 24, Partial 14) → A: Adopt the dialog.
  - Surfaces: U06 #36, #43, #79; U66 #26, #27, #30–#32 (7058:60514); U67 #26, #27, #32–#36, #39
    (7058:60806, 7058:60824).
  - Behaviour and wording: "Edit data" opens a dialog with the intro "Change the values to try a
    particular case. Results update when you save.", "Cancel" and "Save and test"; a validation
    error blocks the whole save; after saving, the results update and the toast "Results updated.
    Mia now meets Rule 01." is shown and announced. Licence classes are picked from a list by code,
    Nationality and Expiry date get fields (004-S8.5.5, 004-S8.5.3), the class date is labelled
    "Class B since". Dropped: inline fields, "Edit data" ↔ "Done", immediate application of each
    valid change, per-variant hidden announcements.
  - Supersedes: 004-S8.5.1, 004-S8.5.2, 004-S8.5.9, 004-S8.5.10, 004-S8.10.3, 004-ACC.4. No
    Clarification.

- Q: On the test step, should a met variant show the design's "Message Mia reads" box, should
  result rows keep their statement and status text, and should the data card use the design's
  document column and per-card scrolling? (Q31, F, Conflict 25, Partials 12 and 13) → A: (a)
  defer the met-variant message, (b) keep the statement and status text, (c) adopt the document
  column with panel scrolling.
  - (a) Met-variant box (U06 #32; U65 #28; U70 #22): deferred; a success message per connection
    is a stored feature (Clarification 2026-11-06 #1), and the fixed sentence "Your wallet data
    meets the requirements. Other documents are checked separately." is not shown (004-S8.6.7
    holds: no message column and no success message).
  - (b) Rows (U65 #23, #24; U66 #21, #22; U67 #22, #23; U68 #23, #24, #33; U69 #26, #27; U71
    #23, #24; U72 #28, #29; U73 #15; U63 #13–#15; U75 #24–#26; U76 #19–#21; U77 #25, #26; U78
    #22–#24; U79 #30–#32; U99 #46, #47): each row keeps its statement and "Not met" / "Couldn't
    be checked" as text (004-S8.6.4, 004-ACC.1), with the design's icon and tint; the older
    frames' "19, needs 21" and the "Mia sees" box are Figma errors.
  - (c) Data card (U65 #15, #18, #20; U66 #14, #24; U67 #14, #16; U68 #14, #18, #20; U69 #15,
    #18, #23; U70 #14, #17; U71 #17, #19, #20; U72 #15, #18, #22–#24; U63 #10, #12; U73 #12; U75
    #22; U76 #14, #16; U77 #22; U78 #19; U79 #24, #26; U99 #43; U01 #15): the document is a
    column, its name the row group's accessible heading (004-S8.4.2 in the new layout); the panel
    scrolls, not each card (004-S8.4.11, build note 4).
  - Supersedes: 004-S8.4.2's visible headings (layout). No Clarification; 004-S8.6.4, 004-S8.6.7,
    004-ACC.1, 004-S8.4.11 hold. (c) is amended by #46 (second round, Remap Q1): no visible
    document column; the panel scrolling stays.

- Q: Should the persona chips of the Test frames stay (rather than the older Publish frames'
  avatar cards), should "Your rules are saved." be shown, and how does regeneration look? (Q32,
  F, Conflicts 26 and 27, Partial 15) → A: The chips stay; "Your rules are saved." is dropped;
  a regenerating chip keeps its name with a ring; the other regeneration states are the
  baseline's.
  - Cards (U63 #8; U76 #11; U77 #21; U79 #21; U75 #20; U78 #16): the Publish frames' cards with
    avatar, age · nationality and "Meets the rules" / "Doesn't meet the rules" are an older
    design and are not built; the persona chips of U65–U72 (7057:59541) are the reference
    (004-S8.3.1, 004-S8.3.2).
  - "Your rules are saved." (U74 #24, 7062:51784): not built (004-S8.9.3).
  - Regeneration (U74 #16, #21; U63 #9; U75 #21; U76 #13; U78 #18; U79 #23; U06 #37, #80; U05
    #15): the regenerating chip keeps its name with a ring (styling; supersedes 004-S8.8.4's
    skeleton pill); the test-day line shows during one persona's regeneration (004-S8.1.2);
    "Generate again" and "Generate all again" show in every results state (004-S8.7.1);
    generating asks first only when there are changes (004-S8.3.5); the Test tab's tooltip opens
    on hover and on focus (004-S8.2.3).
  - Supersedes: 004-S8.8.4 (styling). No Clarification; 004-S8.1.2, 004-S8.3.1, 004-S8.3.2,
    004-S8.3.5, 004-S8.7.1, 004-S8.9.3 hold.

- Q: Should the publish dialog have "Back to test", summarise as counts only, put warnings
  first, and show a "Published" interim state before the details? (Q33, F, Conflict 28, Partial
  11) → A: Adopt all four; a failure keeps the error ID and the summary.
  - Surfaces: U63 #24; U73 #21, #23, #26; U75 #5, #6, #8 (6376:25536); U76 #32 (6635:36265); U77
    #5, #6, #11, #12; U78 #2–#6; U79 #3–#6 (6376:27178).
  - Behaviour and wording: "Back to test" returns to the test step (supersedes 004-S5.3); the
    summary shows counts only, "7 data items", "Standard · 2 rules" (supersedes 002-S5.1); the
    findings lines come warnings first (supersedes 003-S5.1's tab order); after publishing, the
    dialog shows the "Published" state and "Opening your connection page…" for 0.5 s, then the
    details open; a failure shows the design's "Couldn't publish" sentence with the error ID and
    keeps the summary (FR-008); the dialog can't be closed while publishing (row 41, Q45).
  - Supersedes: 004-S5.3, 002-S5.1, 003-S5.1. No Clarification.

- Q: When a published connection is edited, should the design's entry confirmation, Save on
  every step with an "Active" badge, and "Discard changes" be built? (Q34, F, Conflicts 29 and
  30, Figma-only 4, Partial 17) → A: Adopt all three; the note keeps the requests clause.
  - (a) Entry confirmation (U05 #26; U06 #65; U15 #23, #25 (6699:47905); U87 #23, #25
    (6396:49030)): "Edit "<name>"?" with "Cancel" / "Edit connection", opened from the details'
    and the row's Edit. Supersedes 002-S7.3.
  - (b) Saving (U05 #33; U98 #4, #18, #43; U99 #35; U100 #17): Save on every step; the save
    dialog ("Save changes?", 002-S5) opens from the current step; the header shows "Active".
    Supersedes 004-S2.3, 004-S5.1, 002-S7.1 and 004-S0.4 ("Save without rules" on the documents
    and rules steps is dropped).
  - (c) "Discard changes" (U98 #17; U100 #15, #20 (7173:52772), #21, #23, #24): in every
    edit-flow footer; the dialog "Discard your changes?" with "Keep editing" / "Discard changes"
    and the body "…goes back to the version that's active now. Citizens aren't affected." leaves
    the flow without saving. "Send to your developer" (U06 #27) is not built ("Later").
  - (d) Note (U05 #27; U15 #24; U87 #24; U98 #15): "Your changes take effect when you save them.
    Requests already in progress keep their previous configuration." (001-S5.9 kept in the
    design's wording).
  - Supersedes: 002-S7.3, 004-S2.3, 004-S5.1, 002-S7.1, 004-S0.4. No Clarification.

- Q: On the details page, which of the design's layout changes are adopted: one "Edit
  connection", accordions, the status as heading, no "Create new connection", the reference hint
  in the ⓘ, disabled copy buttons while deactivated, variant tabs and the counts line? (Q35, F,
  Conflicts 31 and 32, Partial 18) → A: (a) adopt, (b) adopt, (c) adopt the status as the h1,
  (d) drop, (e) ⓘ only, (f) disabled, (g) build, (h) adopt, (i) adopt.
  - Surfaces: U58 #30, #37, #39, #42; U63 #26, #27, #31, #34, #38; details U80–U99 (#2, #6,
    #12–#22; U80 7355:61158, U81 7355:61822); U89 #13, #19 (7355:60885); U96 #16; U82 #18; U83
    #21; U84 #25; U91 #10, #19, #21; U92 #11; U94 #9, #16; U96 #11, #22; U97 #11; U06 #60, #83,
    #87.
  - (a) One "Edit connection" opens step 1 (after Q34's confirmation); supersedes 002-S6.6 and
    007-S5.8's rules entry (deep links to a rule still open the rules step, 007-S5).
  - (b) Links and Summary are accordions; arriving from "View" opens Summary, and one is open at
    a time; supersedes 002-S6.3's collapsed rules card and the always-shown URLs. Activity is F2
    (not built).
  - (c) The status sentence ("Your connection is active", the design's status sentences) is the
    page's one h1; the connection's name is the breadcrumb's current item and the tab title
    (FR-012); supersedes 001-S6.1's name as h1.
  - (d) No "Create new connection" on the details; supersedes 001-S6.3.
  - (e) The reference hint "serviceBW replaces {reference} with the request reference." lives in
    the ⓘ on "Result link" (opens on hover and on focus); supersedes 001-S6.5's visible text.
    Superseded by #49 (second round, Remap Q4): the ⓘ shows the design's text only and the hint
    is dropped.
  - (f) Copy buttons are disabled while the connection is deactivated.
  - (g) A branch ⓘ after each variant name (002-S6.11, W build).
  - (h) Variants are tabs; supersedes 002-S6.4's sections.
  - (i) The summary counts "2 documents · 9 data items · 3 variants · 4 rules".
  - Supersedes: 002-S6.6, 007-S5.8 (entry), 002-S6.3, 001-S6.1, 001-S6.3, 001-S6.5, 002-S6.4. No
    Clarification.

- Q: Should the published details show findings lines and tab icons on the rules summary, as
  one details frame draws, or no findings, as the baseline says? (Q36, F, Conflict 33) → A:
  Adopt: the published summary shows the findings lines and the tab icons.
  - Surfaces: U06 #10; U85 #1, #20, #21 (6760:48437).
  - Behaviour and wording: the details run the rule checks in the browser on the published rules
    (the same Worker and hook as the rules step; findings are never stored, sent or logged) and
    show the findings lines (texts per Q4) in the Summary accordion and the problem icons on the
    variant tabs (per Q29); the names in the lines are not links on the details.
  - Supersedes: 003-S6.1. No Clarification.

- Q: On the details, should "✓ Copied" replace the copy button for 2 s, should "Download PDF"
  exist, should status dates ("Active since …", "Published <date>") show, and should
  deactivating offer Undo? (Q37, F, Conflicts 34–37) → A: (a) adopt "✓ Copied", (b) defer the
  PDF, (c) defer the status dates, (d) drop Undo.
  - (a) "✓ Copied" (U06 #81; U81 #25 (6396:47841)): the copy button reads "✓ Copied" for 2 s and
    the copy is still announced (001-S7.7); supersedes 002-S6.9's item.
  - (b) "Download PDF" (U07 #28; U58 #40; U63 #36; U80 #18; U81 #21; U82 #15; U83 #17; U84 #21;
    U85 #17; U86 #20 (6396:48385); U87 #13; U88 #19; U89 #22 (6417:31343); U90 #19; U91 #17; U92
    #13; U93 #10; U94 #14; U95 #15; U96 #20; U97 #13; U99 #15): deferred; not built (Clarification
    2026-11-06 #1, a feature of its own).
  - (c) Status dates (details U58 #31, U63 #28, U80 #7 (7355:61158), U81 #8 (7355:61822), U82 #7,
    U83 #7, U84 #8, U85 #8, U86 #8, U87 #7, U88 #8, U90 #15, U91 #7, U92 #8, U99 #7; deactivated
    U89 #8, U96 #7 (7355:60885), U97 #7; overview U11 #15, U13 #13, #15, U14 #10, #12, U15 #15,
    #17, U17 #35, U18 #43, U90 #31): deferred; the API carries created and updated times only, so
    the overview rows read "Edited <date>" and the details show no date pill (Clarification
    2026-11-06 #1). The ⋯ menu and "Activate again" drawn inside the pill move to the band's
    right end (#52, second round, Remap Q7).
  - (d) Undo after deactivating (U05 #24; U89 #26): not built; a deactivation is reversed only
    through Reactivate (001-S6.9), as requests already cancelled stay cancelled.
  - Supersedes: 002-S6.9's "Copied" item. Clarification 2026-11-06 #1 applied to (b) and (c).

- Q: Should the delete, deactivate and reactivate confirmations add the baseline's facts (links
  stop for good, requests in progress are cancelled, links work again) to the design's sentences,
  or read exactly as drawn? (Q38, F, Partial 16) → A: Adopt as drawn.
  - Surfaces: U04 #17, #18; U14 #18, #20 (6699:44480), #23; U15 #28, #30 (6699:45320); U89 #7,
    #30; U90 #2 (6417:31599); U06 #17; U60 #34.
  - Wording: the delete, deactivate and reactivate dialogs read as the design writes them (noun
    per Q2); the delete-variant body names the broken result link as drawn; the deactivation
    body is F13's. The baseline's "permanently", its requests clause and the reactivate body's
    "the URLs work again" are not added.
  - Supersedes: 001-S6.11's "permanently", US4-AS3's requests clause. No Clarification.

- Q: Should a draft's details use the design's status band with "Edit connection" / "Go to
  connections" and a visible "Delete draft", and how do the × and the scrim of the restore
  dialog behave? (Q39, F/W, Partials 19 and 20) → A: Adopt the status band with a visible
  "Delete draft"; the restore dialog's × and scrim behave like Escape.
  - Draft details (U93 #3, #6, #7, #9, #17, #20, #21; U07 #23–#25, #27; U02 #16): the status band
    "This connection is a draft" with "Edited <date>" and "Edit connection" / "Go to
    connections"; a visible "Delete draft" (W build, 005-S6.9); the Summary open; no connection
    URL. Supersedes 005-S6.8 and 005-S6.14's labels ("Continue") and 005-S6.4's info alert
    ("This draft isn't live. Its connection links appear once you publish it.").
  - Restore dialog (U06 #57): Escape, the × and a click on the scrim all open the draft's
    details and keep the local draft (005-S5.5); the design's "no change" for × and scrim is
    not built for this dialog.
  - Supersedes: 005-S6.4, 005-S6.8, 005-S6.14 (labels). No Clarification; 005-S5.5, 005-S6.9
    hold. Amended by #51 (second round, Remap Q6): the band title is the page's h1 and the two
    actions sit in the footer.

- Q: Should the port implement the design's motion rules (pill growth 240 ms, colour changes
  150 ms, page fade-in 150 ms, height animations 150–200 ms, dialog fade, the 0.5 s publish
  delay, a reduced-motion rule), or leave transitions as the design system provides them? (Q40,
  F, Conflict 38) → A: Adopt the design's motion.
  - Surfaces: U03 #40; U05 #30; U06 #94, #97, #98, #101; U78 #6.
  - Values: a pill grows in 240 ms; colour changes take 150 ms; pages fade in over 150 ms;
    heights animate in 150–200 ms; dialogs fade; a 0.5 s delay follows publishing (Q33); with
    `prefers-reduced-motion`, transitions are turned off.
  - Supersedes: OUT-6 and the assumption "The design defines no motion". No Clarification.

- Q: Should every baseline state the design does not draw in the wizard, the drafts, the publish
  dialog and the details be built from the new components with the baseline's behaviour and
  wording? (Q41, W, Spec-only 3–9, 17, 19–21) → A: Build all of them; none is dropped.
  - Built from the new components (the dialog, alert and form patterns of U14, U23, U51), with
    the baseline's behaviour and wording: 005-S2.1–S2.13 (the conflict dialog: draft_changed,
    draft_published, draft_deleted), from U90's dialog; 005-S5.1–S5.4 (the restore dialog), from
    U17's dialog; 005-S4.8–S4.13 (the local-drafts offer's discard dialog, status and focus after
    discarding, other tabs, no storage); 005-S8.1–S8.6 (data the catalog no longer offers), as a
    warning alert listing the data, with "Remove it"; 002-S5.4–S5.6 (rules_changed conflict,
    "Publish without rules?"), in the publish dialog; 005-S6.7, S6.12, S6.13 (draft details: rule
    placeholders, delete errors; 005-S6.3's step line is not built, #7 and FR-025); 003-S7.1 and 004-S7.2 (checks when the edit
    flow opens; "Try again, or save without testing."); 006-S1.6, 006-S1.8, 006-S3.2, 006-S3.3,
    001-S5.7, 001-S5.10, 001-S5.11 (description placeholder and too-long error, description meta
    below and at lg, loading and load errors, the API's 400 message); 005-R.1, 005-R.2, 005-S0.6,
    005-S0.10, 005-S0.11, 005-S1.6, 005-S1.9, 005-S1.10 (the flow key in the URL, no badge before
    the first save, moving to documents for dropped data, checks rerun, a failure keeps the work,
    401, alert lifetime); 001-S4.3, 001-S4.5, 005-S4.11 (the first-connection flow's validation,
    reopening from a bookmark, its own local draft not listed, ?local=).
  - Supersedes: no Clarification.

- Q: Should the baseline's undrawn states of the rules step, the findings and the test step,
  including the deep-link notices and the toast announcement, all be built from the design's
  banner, toast and outline patterns? (Q42, W, Spec-only 10–16) → A: Build all of them; none is
  dropped.
  - Built in the design's banner, toast and outline patterns, with the baseline's behaviour and
    wording (texts per Q2 and Q4): 002-S2.20, S2.21, S2.24, S2.36 (reserved "Rule NN" names,
    names an undo could bring back, focus after a refused attempt, Standard's delete-group dialog
    naming variants); 002-S3.31 (the saved statement shows the letter-case setting); 002-S4.9,
    S4.27, S4.28, S4.30 (switched top-level AND/OR and its badge on the first connector,
    propagation when Standard removes a rule); the findings set 003-S2.5, S2.17, S2.19–S2.21,
    S4.4, ACC.5, ACC.6, CP.3, CP.6, CP.15, CP.17, CP.18 (hidden kind text, notice without links,
    update in place, status region, tab accessible name, reflow, undrawn texts); 004-S2.5 ("Save
    changes?" leaves no rule); the test-step set 004-S8.5, S8.5.8, S8.5.13, S8.6.5, S8.7.3,
    S8.7.4, S8.10.1, ACC.2, ACC.3 (a later flow's loading, clearing fields, class dates
    returning, group members, the "all" dialog, name kept, status region, arrow keys, focus); the
    deep-link notices "This link points to a variant that no longer exists." / "This link points
    to a rule or group that no longer exists." with "Dismiss" (007-S5.1, S5.2, S5.4–S5.8,
    US3-AS5), and the toast announcement (007-S4.5).
  - Supersedes: no Clarification.

- Q: Should the consent, account and approval pages be built from the new components with spec
  007's wording, since the design draws none of them? (Q43, W, Spec-only 22–24) → A: Build them.
  - Surfaces: US5-AS1, 007-R.1, 007-S1.1–S1.10, 007-S1.12 (consent); US5-AS2, 007-R.2,
    007-S2.2–S2.15 (account); US5-AS3, 007-R.3, 007-S3.1–S3.26 (approval; 007-S3.25's failed save
    follows Q17).
  - Built from the new components: the design's card, the radio group (AccessLevelChoice), list
    rows with a ⋯ menu (as the rule menu), dialogs, the copyable read-only field (with "✓
    Copied", Q37) and alerts; the wording is 007's, with the product name per Q1 and the noun per
    Q2.
  - Supersedes: no Clarification.

- Q: Should the sign-in guard, the overview and details error states, the tab titles, the footer
  wrap and the reflow down to 320 px at 200 % zoom be built as the baseline says, with the
  design's alert and the error ID? (Q44, W, Spec-only 1, 2, 18, 25; Partial 21) → A: Build them.
  - Built: 001-S0.2 and 001-S0.4 (the sign-in guard) as today; 001-S3.7 and 001-S6.14 / US4-AS6
    (the overview's error state; a deleted or unknown connection) as the design's alert with the
    error ID and the way back to the overview; FR-012b tab titles for every route (product name
    per Q1); 005-ACC.4 (the footer wraps and "Save and exit" keeps its label); the reflow below
    1024 px down to 320 px and 200 % zoom (EC-6, FR-010a; U02 #14) following the design's spacing
    scale, nothing hidden; FR-002c, FR-005, EC-2 and 001-S7.10 apply to every W item.
  - Supersedes: no Clarification.

- Q: Should the sixteen small controls and messages the design adds (search, counts, password
  toggle, toasts, hints, tooltips, "Discard rule", and so on) all be built as designed, or
  should some be left out? (Q45, F, cosmetic rows 27–42) → A: Adopt all sixteen as designed.
  - Each opens on hover and on focus where it is a tooltip, has a visible label where it is a
    field, and is announced where it is a toast: (27) the overview search or filter with ×, "n of
    m connections", a no-results message and "Clear search" (visible label, 001-S7.4; U04 #3;
    U11 #7, #29–#33; U12 #7; U13 #7; U14 #6; U15 #7 (6699:47855); U16 #21; U17 #28; U18 #38; U90
    #26); (28) the connection count in the overview toolbar (U17 #27 (6699:47951) and the other
    overview frames); (29) the show/hide password toggle (U10 #7); (30) "You're logged out."
    after signing out (U05 #21; U06 #54; U10 #20); (31) the breadcrumb link "Your connections"
    (leaving a flow through it per Q8); (32) the group subtitle "At least one rule must be met" /
    "All rules must be met", and the note "Group 01 now needs only one rule to be true."; (33)
    toast actions: "Show" in the copy toast, and after deleting a variant a toast with Undo while
    the tab to the left opens (U41 #29; U61 #8, #9); (34) the hints "Licence classes has parts.
    Choose the part to check.", "Place of birth has parts. Choose the part to check.", "Citizens
    who turn 21 that day count.", and the born-between hint (U09 #26, #38, #40; U31 #37; U53
    #32); (35) explanatory ⓘ tooltips on the trigger-URL label and the name field, and a hover
    tooltip with the full description on a cut overview row, with no title attribute (006-S4.1;
    U04 #12; U13 #20; U80 #10; U81 #12; U82 #11; U84 #12; U85 #12; U86 #34; U98 #13); (36)
    "Discard rule" in the rule editor; (37) per-document "6 of 25 data items chosen" / "No data
    items chosen yet"; (38) the removed count in the link strip, "2 of 3 Standard rules are
    removed here."; (39) connectors faded next to removed items or a single active item; (40) the
    documents and rules summary in the reactivate dialog (U89 #31); (41) the publish dialog can't
    be closed while publishing (U78 #3); (42) toasts after deleting, deactivating, reactivating,
    publishing and saving ("Changes saved."), announced through the toast's live region
    (001-S7.7; U04 #20; U05 #20, #35; U99 #19).
  - Supersedes: no Clarification.

Second round, the same day, after `/figma-audit remap`: the 14 clarify questions of the remapped
`figma-audit/report.md` ("Clarify questions", Q1–Q14), asked in the report's order and numbered
#46–#59 here so that they stay apart from #1–#45; each entry names its report number as "Remap
Q<n>". The record is the same: the decision, the surfaces, the exact wording, what it supersedes.

- Q: Should the test step's data card and result heading follow the newer Test 1 frames (flat
  list, no age or years, classes merged by date, a count in the heading), or keep the formats
  decided from the older Publish frames (document column, "08.07.2007 · 19", one row per class,
  no count)? (#46, Remap Q1, C/F, Conflict 1) → A: Follow the Test 1 frames.
  - Surfaces: data cards U65 7057:58772, 7057:59071, 7057:59079, 7057:59186; U66 #14, #15, #24;
    U67 #14, #15, 7058:60746; U68 #14, #15, #18; U69 7057:60456, 7057:60891, 7057:60779; U70
    7057:61649 (#15, #17, #18); U71 7058:61436, 7058:61444, #19; U72 #15, #16, 7058:61720, #22;
    U73 7058:62058, 7137:50147; U99 7114:49747. Result headings U65 7057:58811; U66 #19, #25; U67
    7058:60752; U68 #21, #32; U69 7057:60495, 7057:60930; U71 7058:61454; U72 7058:61750; U73
    7058:62077, 7137:50166; U99 7114:49766; build note U06 #31. Figma must change: the older
    Publish frames U63 #10, #12, 7112:48790; U75 #22, #24; U76 #15–#17, 6863:47775; U77 #22–#24;
    U78 #21, #22; U79 #25–#27, 6863:48492. Source: the rules package's persona formatting and its
    tests (C6). Unchanged: the Edit data dialog's "Age today" (004-S8.5.6) and "Class B since"
    (FR-042; U66 #30, U67 #33), "Valid until <date>" and the test-day line (#6), the panel
    scrolling (F43, #31 (c)).
  - Wording: a flat list under the rules' labels with no visible document column (the document's
    name stays the row group's accessible heading); "08.07.2007" (no age); "B since 20.08.2025"
    (no years); classes with the same issue date in one row, "B, BE since 02.05.2010"; the expiry
    row keeps "Valid until <date>" under the rule's label as drawn ("Expiry date", "ID valid
    until"); "Result: doesn't meet 2 rules" / "Result: doesn't meet 1 rule" (with the count).
    Dropped: "08.07.2007 · 19", "B since 20.08.2025 · 1 year", one row per class, the document
    column, "Result: doesn't meet the rules".
  - Supersedes: Clarification #6 (every format except "Valid until <date>" and the test-day line)
    and #31 (c)'s document column; 004-S8.4.2's accessible heading holds.

- Q: When a team member is editing a published connection, what happens when they leave through
  the product name or the breadcrumb "Your connections" (a), and is "Save" on the rules step
  disabled while a rule is open, incomplete or in error, or while grouping (b)? (#47, Remap Q2,
  F, Conflict 2, Partial 10) → A: (a) adopt E5b, with "Save" going through "Save changes?";
  (b) disabled.
  - (a) Leaving (E5b U99 7173:52810 (frame), 7173:52836 (dialog); E5a U99 6890:46197 is F5, not
    built; build notes U05 6730:40338, U06 #51; the product name and "Your connections" in
    U98–U100): the dialog "Save your changes?" with the body "If you leave now, your changes are
    lost. Save them, or discard them and keep the active version.", "Discard changes" (danger
    outline), "Save" (primary) and the close ×. "Save" opens the save dialog "Save changes?"
    (FR-045) and leaves to the details once saved; a validation error keeps the member in the
    flow. "Discard changes" leaves without saving, as FR-045's discard does. × and Escape keep
    the member in the flow. Amends #8 (a) and (b), which from now on apply to the create and
    draft flows only; #34 (b) holds (no direct save). Dropped: "Leave this connection?" in the
    edit flow, "Keep draft and exit" (F5).
  - (b) "Save" on the rules step (U98 6731:39850, 7296:52389, 6730:39145; U99 #32c; U100 #17;
    build note 5 U01 6637:36652): disabled while a rule is open, incomplete or in error, or while
    grouping, with "Save the rule first" / "Finish grouping first" opening on hover and on focus,
    exactly as "Test rules" (#18). Dropped: an enabled "Save" that asks "Save changes to Rule 01?"
    first.
  - Supersedes: #8 (a), (b) for the edit flow; #18 is extended to the edit flow's "Save";
    005-S0.7 holds (no Save and exit in the edit flow).

- Q: Where does the menu entry "Group with other rules" appear beyond a top-level rule's menu:
  also on a top-level group that holds no sub-group, or on rules only? (#48, Remap Q3, F,
  Conflict 3) → A: Two levels only.
  - Surfaces: built on top-level rules (U36 #15; U39 #27c; U41 #22; U64 #2), on rules inside a
    top-level group (U34 #26; U36 #28; U55 #24; decided by #60) and on a top-level group without
    a sub-group (U58 #20); select mode U36, U40, U64; build note 10 U54 6522:33107 (#5). Figma
    errors, not built: the entry on a rule inside Sub-group 01 (U55 6531:39068) and on a group
    that holds a sub-group (U55 6522:32424); #22's sub-group menu.
  - Behaviour and wording: "Group with other rules" appears on a top-level rule (FR-036) and on
    a top-level group that holds no sub-group, only when another rule or group is on the same
    level; it starts select mode with that item selected (FR-038). It never appears in a
    sub-group's menu, on a rule inside a sub-group, or on a group that holds a sub-group
    (002-S2.10).
  - Supersedes: #22 is extended (groups) and its "a rule's menu" is narrowed to top-level rules
    with a neighbour; 002-S2.10 holds. Extended by #60 (third round, Remap 2 Q1): also on a rule
    inside a top-level group, whether or not the group holds a sub-group, with another rule of
    that group on its level.

- Q: Should the ⓘ on "Result link" in the details show the design's drawn sentence, the decided
  reference hint, or both? (#49, Remap Q4, F, Partial 1) → A: The design's text only; the
  {reference} hint appears nowhere.
  - Surfaces: the drawn ⓘ U81 6809:46555, 6809:46590; the same ⓘ without drawn text U80
    6396:47723, U85 6760:48480, U87 #10, U88 #15, U90 #17. Unchanged: the "Request link" ⓘ U80
    6809:46501 (FR-051). Not affected: the draft details, which show no links.
  - Wording: "Your service gets the citizen's shared data from this link. Each variant has its
    own." (opens on hover and on focus). Dropped: "serviceBW replaces {reference} with the
    request reference." (001-S6.5's hint, a behaviour change recorded against 001-S6.5; the
    placeholder stays in the URL itself).
  - Supersedes: #35 (e); 001-S6.5's hint is dropped.

- Q: On the test step, when no citizen can meet a variant's rules, is the line "No citizen can
  meet the rules of Standard." still built above the result heading, or dropped because the
  design shows the finding on the tab only? (#50, Remap Q5, W, Spec-only 1) → A: Drop; a
  behaviour change recorded against 004-S8.6.1.
  - Surfaces: the result card U71 7058:61454 (no line); build note 29 U06 7058:63148 ("no
    banner"). Unchanged: the tab's ⚠ and its tooltip U71 7058:61618, 7058:61632 (FR-041, C4),
    which carry the finding on hover and on focus.
  - Wording: none above the heading. Dropped: "No citizen can meet the rules of Standard."
    (004-S8.6.1).
  - Supersedes: 004-S8.6.1 (the design removes the line on purpose). No Clarification.

- Q: On a draft's details, is "This connection is a draft" the page's main heading with the
  name in the breadcrumb, as on the published details (a), and do "Edit connection" and "Go to
  connections →" sit in the footer as drawn or in the status band (b)? (#51, Remap Q6, F,
  Partial 2) → A: (a) as on the published details; (b) footer as drawn.
  - (a) Heading (U93 7362:54697 band title and sub-line, 7362:54693 Draft badge after the
    breadcrumb's name; build notes U07 #23–#27, U02 #16; the tab title): "This connection is a
    draft" is the page's one h1, with "Edited <date>" below it; the connection's name is the
    breadcrumb's current item, followed by the Draft badge, and the tab title (FR-012). Extends
    #35 (c) to drafts; supersedes 005-S6.1's name as h1.
  - (b) Actions (U93 7362:54920 "Edit connection", secondary, footer left; 7362:54922 and
    7362:55154 "Go to connections →", primary, footer right): in the footer as drawn; FR-049's
    "the status band offers" reads "the page offers". "Delete draft" stays visible, built without
    a frame (F56, #39). Amends #39's placement words.
  - Supersedes: 005-S6.1 (heading); #39's placement; #35 (c) extended.

- Q: On the details, where do the connection's ⋯ menu (Deactivate, Delete) and, while
  deactivated, "Activate again" sit, now that #37 (c) drops the status-date pill they are drawn
  inside? (#52, Remap Q7, F, Partial 3) → A: In the status band, at its right end where the
  pill was.
  - Surfaces: build note U07 7370:55183; active U87 #8, U88 6417:30900, 6417:31060, U90
    7355:61614; deactivated U89 7355:61548, 7355:61549, U97 7355:61025, 7355:61094, 7355:61026,
    7355:61095, U96 S/L; scheduled U94 7355:60689, U95 #10 (F1, not built).
  - Behaviour and wording: the ⋯ menu sits at the band's right end with the entries the state
    allows ("Deactivate" while active, "Delete"; "Change start date" is F1, not built); while
    deactivated, "Activate again" stands before the ⋯. Dropped: the pill as their anchor.
  - Supersedes: no Clarification; follows #37 (c).

- Q: In a variant, does a rule or group linked to Standard lose Rename, Duplicate, Ungroup and
  "Remove from group", and does "Copy to variant" show only while some variant could still
  receive the item, as build note 10 says, or does every rule menu stay complete as #22 built
  it? (#53, Remap Q8, F/W, Partial 4) → A: Adopt build note 10.
  - Surfaces: build note 10 U54 6522:33107 (#3, #4); changed rule U39 #27e, U57 #18 (6522:32682,
    6522:32774, 6522:32862); inherited rule U39 #28b, U56 #40, U57 #19; inherited group U58 #21,
    #22; the copy-to-variant popover U41 #24 (W17).
  - Behaviour: in a variant, a rule or group linked to Standard has no "Rename", "Duplicate" or
    "Ungroup" ("Remove from group" is F7, deferred). "Copy to variant" shows only while some
    variant could still receive the item: always on a "New addition" or "Changed here" item, and
    on a Standard rule only while a variant isn't linked to it or has removed it. "Copy link"
    stays in every menu (F29). The entries' wording is the design's.
  - Supersedes: #22's "Rename and Copy to variant on rule menus" is narrowed to unlinked items;
    a behaviour change recorded against 002-S2.16, 002-S2.19 and 002-S4.10 for linked items in a
    variant (no rename or duplicate of a linked rule there).

- Q: Do a group's and a sub-group's ⋯ menu get the baseline's "Rename" and, while the group has
  a message, "Remove message", which the frames don't draw, or are both dropped? (#54, Remap Q9,
  W, Partial 5) → A: Build both.
  - Surfaces: group menus U54 6522:33107 (#2); U55 #28, #33, #34 (6530:40150, 6522:32038,
    6531:39026, 6522:32382); U56 #23, #28, #30; U57 #22; U58 #19. Unchanged: the message card
    with its pencil U35 6324:39410, 6324:39411. Not on a group linked to Standard in a variant
    (#53).
  - Behaviour and wording: "Rename" renames the group inline on its name, with 002-S2.19's
    duplicate check; while the group has a message, "Remove message" sits next to "Add message"
    (002-S2.11, 002-S2.17), "Add message" alone otherwise; both in the design's menu styling
    (W build, no frame).
  - Supersedes: no Clarification; #22's W list is extended; 002-S2.11, 002-S2.17, 002-S2.19 hold.

- Q: Does the failed-save toast's button read "Try again" as the frame draws it or "Retry" as
  decided from the build note (a), and does the nothing-chosen dialog's button read "Remove 1
  document" / "Remove 3 documents" with the count as drawn, or "Remove them and continue" as
  decided from the build note (b)? (#55, Remap Q10, F, Partial 6) → A: (a) "Try again"; (b)
  the count form. The frames' copy wins over the build notes.
  - (a) The failed-save toast (U51 6197:11098; build note U05 6720:39042; the toast on every
    wizard step U17 #3, #23, U79 #4; the undrawn cases of #17 (a)): the toast reads as U51 draws
    it, "Couldn't save. Check your internet connection and try again.", with the action "Try
    again"; a server error's error ID stays in the toast and the focus isn't moved (#17 (a)).
    Dropped: "Retry".
  - (b) The nothing-chosen dialog (U25 7299:52174; build note 19 U04 6711:39375): title "No data
    selected in 1 document" / "No data selected in <n> documents"; body "Driving licence has no
    data chosen yet. Choose data for it or remove it." (the documents named, plural as drawn);
    buttons "Choose data" and "Remove 1 document" / "Remove <n> documents". Dropped: "Remove
    them and continue".
  - Supersedes: #17 (a)'s "Retry" and its dropped sentence; #14 (c)'s "Remove them and continue".

- Q: Does the delete-rule dialog's body describe the rule's effect, as the frame draws it
  ("Citizens won't be checked for licence classes C or D any more."), which needs a sentence per
  check kind from the rules package, or does it keep the current app's body? (#56, Remap Q11,
  F, Partial 7) → A: Drop; no effect sentence, now or later.
  - Surfaces: U34 6113:29056 (a rule only in Standard; the effect sentence is not built); U47
    6185:8847 (a Standard rule with variants; its body is copy to port); title 002-S2.33.
  - Wording: title "Delete Rule 03?"; a Standard rule with variants gets U47's body as drawn;
    the other dialogs keep the current app's body, plus 002-S4.17's "Ambulance's changes to Group
    01 go with it." where a group dissolves. Dropped: "Citizens won't be checked for licence
    classes C or D any more." and any sentence built from the rule's check.
  - Supersedes: no Clarification; 002-S4.15, 002-S4.17 hold. Not recorded in deferred.md.

- Q: Does the Test step also show the variant ⓘ ("what a variant is"), placed at the end of its
  tab row since it has no "+ Add variant" to follow, or does the ⓘ stay on the Rules step only?
  (#57, Remap Q12, F, Partial 8) → A: Not on the Test step.
  - Surfaces: the Rules step ⓘ U18 7344:96402, U37 6151:33809, 6151:33820 (its text). The Test
    frames' (i) after "Standard" (U65 7057:58718, U67 #10, U68 #10, U72 #10, U75 #19, U79 #19) is
    Standard's description icon (F27), shown only with a description (002-S4.25), not this ⓘ.
  - Behaviour and wording: the ⓘ follows "+ Add variant" on the Rules step only, opens on hover
    and on focus, and reads the design's text "A separate set of rules for citizens with
    different requirements. Each variant gets its own result link." (U37 6151:33820, F27);
    the Test step shows no variant ⓘ. Dropped: "Variants are other versions of these rules."
    (the placeholder of #20) and the Test-step placement.
  - Supersedes: #20's "on the Rules and Test steps" and its placeholder text.

- Q: Does the missing-name message become "Enter a name for the connection.", as step 1 draws
  it, in every place that provides or repeats it, or does "Enter a name." stay everywhere? (#58,
  Remap Q13, C, Partial 9) → A: Adopt.
  - Surfaces: step 1 U19 6699:45379, 6699:45398 (after Continue); the same message after "Save
    and exit", "Save progress" or "Save and log out" with no name (#8, #16; U04 #27; F18) and in
    the edit flow's step 1 (U98). Sources changed in the same change: the backend's validation
    of the connection and draft name (the 400 message), the frontend's step-1 check, the MCP
    server and its guidance where they pass the message on to agents that create drafts, docs.
    Not affected: "Enter a name for the variant." (already the design's), the persona name's
    "Enter a name." in Edit data (004-S8.5.11), "The name can have at most 200 characters." (not
    drawn).
  - Wording: "Enter a name for the connection." Dropped: "Enter a name." for the connection.
  - Supersedes: #16's quoted wording; 005-S1.2 and 005-S1.3's text (`copy:server`).

- Q: Are the eight small additions the design makes built as designed, or are some left out?
  (#59, Remap Q14, F, cosmetic rows 29–35 and Figma-only behavioural 1) → A: Adopt all eight.
  - Each tooltip opens on hover and on focus, each count is plain text that screen readers read,
    and items 1–7 change no stored data: (1) a click on the scrim closes a dialog that doesn't
    delete or publish (U06 7127:49610; the restore dialog keeps #39's rule, F57); (2) a disabled
    button explains why on hover and on focus, beyond "Test rules" and "Set rules →": "Save
    rule", the copy buttons while deactivated (FR-046), and the others the frames draw (U06
    7127:49610); (3) a page change scrolls to the top (U06 7137:50569); (4) a draft row's meta
    reads "Edited <date> · <step> step", e.g. "Edited 28.10.2026 · Rules step" (U06 #89; U17
    6699:48031); (5) the documents search card shows an "Added (n)" group (U21
    7290:62277–7290:62279; U22 7290:63546); (6) the Links accordion's heading counts "1 request
    link · 3 result links" (U91 7203:50843; U92 7246:51546, 7246:52172; U94 7246:52751,
    7246:53863; U95 7246:53973, 7246:54601; U96 7246:55182, 7246:56300; U97 7246:56410,
    7246:57041); (7) tooltips also open on touch (U08 7370:55193); (8) the variant dialog's
    "Start with" preselects "Linked to Standard (recommended)", so a variant created without a
    choice is based on Standard (U37 6139:32693; U52 6197:12011; U62 #25).
  - Supersedes: no Clarification; 002-S4's variant dialog gets the default of (8).

Third round, the same day, after the second `/figma-audit remap`: the one clarify question of
the remapped `figma-audit/report.md` ("Clarify questions", Q1), numbered #60 here and tagged
"Remap 2 Q1". The record is the same.

- Q: Does a rule inside a top-level group carry "Group with other rules", so that the group's
  members can form a sub-group from the menu, and also when that group already holds a
  sub-group? (#60, Remap 2 Q1, F, Conflict 1) → A: On rules in any top-level group.
  - Surfaces: built as drawn on a rule inside a top-level group: U36 #28 (6344:53657, frame
    2.18, Group 01 without a sub-group), U55 #24 (6522:32071, frame 10.2, Rule 03 in Group 01)
    and U34 #26 (6113:28988, frame 2.3, Group 01 already holding Sub-group 01); build note 10
    U54 #5 (6522:33107); select mode inside a group U36 #30 (6616:44240, frame 2.19).
    Unchanged: the entry on top-level rules (U36 #15, U39 #27c, U41 #22, U56 #38, U64 #2) and
    on top-level groups without a sub-group (U57 #22); the Figma errors of #48 (U55
    6531:39068, 6522:32424); "Remove from group" stays deferred (F7).
  - Behaviour and wording: "Group with other rules" also appears on a rule inside a top-level
    group, whether or not the group already holds a sub-group, only when another rule of that
    group is on its level (build note 10: "only when another rule or group is on the same
    level"). It starts select mode with that rule selected and limited to that group's rules
    (no checkboxes on the top-level rows or on the group's sub-groups), the bar reading "Choose
    at least one more rule to group with Rule 03." (U36 #18's wording) and, at two, "2 rules
    selected. They become a sub-group of Group 01." (U36 #30); "Group rules" forms "Sub-group
    01" (002-S2.10), so a group can hold several sub-groups. The entry still never appears in a
    sub-group's menu, on a rule inside a sub-group or on a group that holds a sub-group
    (FR-036d).
  - Supersedes: #48 is extended (its surface list now names the rules inside a group); #22's "a
    rule's menu" is extended the same way; FR-036 gains the case; 002-S2.10 and FR-036d hold.

## User Scenarios & Testing *(mandatory)*

Each story is one flow of the app. It is checkable on its own: open its screens in every state,
compare each against its frames, and run the baseline's behaviour through it. The stories are
ordered as they are built; the shared components and layouts come before the first.

### User Story 1 - Sign in, forgot password, overview and first connection (Priority: P1)

A team member opens the app, signs in, lands on the overview or on the first-connection screen,
and sees the connections, the drafts and the unsaved work of this device, all in the new design.

**Screens**: `/login`, `/forgot-password`, `/` (overview, or the welcome page while no connection
exists, Q9), `/get-started` (first connection), with
the signed-out frame around the first two and the signed-in frame (product name, icon-only user
pill with the name, "Your account" and "Log out" in its menu, Q13) around the rest. **Baseline**: 001-S1 to 001-S4; 005-S3, 005-S4, 005-S7; 006 overview row;
007-S6.

**Why this priority**: it is the entry to everything, and it exercises the two layouts and the
shared components every later flow reuses.

**Independent Test**: sign in with wrong and with right credentials, visit forgot password, open the
overview empty, with published, deactivated and draft rows, and with local drafts on the device,
and open the first-connection screen with and without connections; compare each state against its
frame.

**Acceptance Scenarios**:

1. **Given** the sign-in frame, **When** a team member opens `/login`, **Then** the screen matches
   the frame in layout, styling and wording, and a failed sign-in shows the design's one message
   with both fields marked as invalid (Q10), never saying which of the two was wrong.
2. **Given** the forgot-password frame, **When** the team member opens it from the sign-in screen,
   **Then** it matches the frame, tells them to ask an administrator, and going back to sign in
   keeps the route that asked for the sign-in.
3. **Given** the overview frames, **When** the list holds published, deactivated and draft
   connections, **Then** each row shows the state its frame draws, the actions of the baseline
   (open, view, continue, create) and the row's Delete with the details' confirmation (Q11) are
   there, no selection checkboxes are shown (bulk delete is deferred), and the empty, loading and
   error states match their frames.
4. **Given** local drafts on this device (the safety net after a crash or a forced leave, Q8),
   **When** the overview or the first-connection screen opens, **Then** the unsaved-work offer
   (005-S4) is shown in the new design, and resume and discard work as before.
5. **Given** no connection exists, **When** a team member signs in without a requested route,
   **Then** the homepage shows the welcome page "Welcome to Konnekt" as its frame draws it, without
   the deferred "Start from an example" (Q9); "Create connection" opens step 1 with its loading
   state; once a connection or a draft exists the homepage is the overview, and after the last one
   is deleted the welcome page shows again.

---

### User Story 2 - The create wizard: connection and documents steps (Priority: P2)

A team member starts a connection, names and describes it, adds documents and chooses their
fields, saves and exits, and comes back to the draft, in the new wizard.

**Screens**: `/form-connections/new` and `/get-started`, steps 1 and 2, with the wizard shell
(progress, "Save and exit", the draft badge). **Baseline**: 001-S5; 002-S0, 002-S1; 004-S0, 004-S1;
005-S0, 005-S1, 005-S2, 005-S5, 005-S8; 006 step 1.

**Why this priority**: the shell carries every later step, and these two steps are the simplest
place to settle the form components, the validation pattern and the save-and-exit behaviour.

**Independent Test**: create a connection through steps 1 and 2, trigger every validation message,
save and exit, continue the draft, restore and discard unsaved changes, and compare each state
against its frame.

**Acceptance Scenarios**:

1. **Given** the wizard frames, **When** a team member opens a new connection, **Then** the shell
   shows the compact "Step n of 4" header (four segments, "Next: <step>" / "Last step", a
   progress bar for assistive technology; not clickable while creating, clickable while editing;
   Q7), "Save and exit" and the draft badge as the frames draw them, and the current step is
   marked.
2. **Given** step 1, **When** a required field is left empty or the description is used in place
   of the form, **Then** the fields, hints and validation messages match the frame, each message
   sits next to its field, and the focus moves to the first field with a problem.
3. **Given** step 2, **When** a document is added from the catalog through the search card, its
   fields chosen in the master-detail list and a document removed inline (with undo, or the
   confirmation for an unchecked document), **Then** every state (no document, a document without
   data, data the catalog no longer offers) matches its frame; "Set rules →" stays disabled with
   "Add a document first" until a document is added, and a document without data shows "1 document
   needs data" and the "Choose data" / "Remove 1 document" dialog (Q14, #55). Documents stay in
   catalog order and fields show no group rows (drag reordering and field groups are deferred).
4. **Given** a stored draft, **When** "Save and exit" is used, or the product name or the
   breadcrumb is clicked and "Save progress" chosen (Q8), and the draft is continued later,
   **Then** the saved status, the overview's draft row and the restore dialog for unsaved changes
   appear in the new design with the baseline's behaviour.
5. **Given** two team members on one draft, **When** the second saves, **Then** the conflict
   (005-S2) is shown with the new components, as a W item if the design draws no frame for it.

---

### User Story 3 - The rules step, the rule editor and the test step (Priority: P3)

A team member writes rules and groups per variant, sees the findings of the rule checks, and tests
the rules against fictitious citizens (formerly "applicants", Q2), in the new design.

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

**Screens**: the publish dialog, opened from the test step (Q7), the save dialog, the details (published, deactivated,
draft), `/form-connections/:id/edit`. **Baseline**: 001-S5, 001-S6; 002-S5, 002-S6, 002-S7; 003-S5,
003-S6, 003-S7; 004-S5, 004-S7; 005-S6; 006 details header; 007-S6.

**Why this priority**: it closes the create flow and carries the destructive actions, whose dialogs
and wording the design settles for the whole app.

**Independent Test**: publish a draft, copy each URL, open the details of a published, a deactivated
and a draft connection, run each confirmation dialog, edit a published connection and save, and
compare each state against its frame.

**Acceptance Scenarios**:

1. **Given** the publish frames, **When** the publish dialog is opened from the test step,
   **Then** its counts summary, its findings lines and "Back to test" match their frames, and
   publishing shows the "Published" state and then leads to the details with the connection URLs
   (Q33).
2. **Given** the details frames, **When** a published connection is opened, **Then** the header
   (the status sentence as the main heading, the name in the breadcrumb, the description line,
   Q35), the Links accordion with the trigger URL and each variant's pull URL with the design's
   ⓘ text (#49), and the Summary accordion with the documents, the counts and the rules per
   variant tab match their frames, and "copied" is announced.
3. **Given** the confirmation frames, **When** deactivate, reactivate or delete is chosen, **Then**
   each dialog reads as the design writes it (Q38) and does what the baseline says.
4. **Given** a draft's details (005-S6), **When** it is opened, **Then** "This connection is a
   draft" is the main heading with the name in the breadcrumb, the footer offers "Edit
   connection" and "Go to connections →" (#51), "Delete draft" is visible (Q39), and no
   connection URL is shown.
5. **Given** the edit flow, **When** a published connection is edited and saved, **Then** the
   entry confirmation, the "Active" badge, Save on every step, "Discard changes", the note on
   requests in progress (Q34), the "Save your changes?" dialog on leaving through the breadcrumb
   (#47), the new revision and a conflict appear in the new design.
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
- **A Revamp colour pair that fails the AA contrast**: the port uses the nearest value that passes,
  records the change with the pair it fixes, and the designer is told; never silently changed or
  silently kept.
- **A screen reached by its address** (bookmark, history, a link from an agent): behaves as the
  baseline says, in the new design.
- **Leaving a flow with unsaved work** (product name, breadcrumb, log-out, closing the tab): the
  design's save-or-discard model applies (Q8, FR-026): "Leave this connection?" in a create or
  draft flow, "Save your changes?" in the edit flow of a published connection (#47); the local
  draft is offered only after a crash or a forced leave.

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
  wizard steps in the same order (four steps, Connection, Documents, Rules and Test, and the
  publish dialog, Q7), the same states and transitions of each screen, the same requests to the
  backend and the same handling of their answers, the same sign-in guard, drafts and local drafts,
  except where a decided drift item (Clarifications, FR-019 and following) changes a state or a
  transition.
- **FR-004**: Every drift item MUST be found by the Figma audit, decided once in clarify (adopt,
  build, defer or drop, as the table above allows for its kind), and recorded; no item is ported or
  left out silently.
- **FR-005**: A screen or state the design does not draw (a W item) MUST be built from the new
  components and the patterns the design establishes elsewhere, with the baseline's behaviour and
  wording.
- **FR-006**: Copy that another package provides (the backend, the rules package, the MCP
  guidance, the design system's translations) MUST change only through an adopted C item, in every
  place that provides or repeats it, so that the frontend's validation messages stay word for word
  with the server's and the agents' guidance names the same concepts as the UI.
- **FR-007**: Apart from adopted C items, the backend, the rules package, the MCP server and the
  API types MUST NOT change; a feature the design adds that would need them is deferred, never
  adopted.

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
  colours. A colour pair of the design that fails AA is set to the nearest passing value, the
  change is recorded with the pair it fixes, and the designer is told.

Construction and removal:

- **FR-014**: The current design system packages (KERN 2.8) MUST stay, and the Revamp's tokens and
  component anatomy MUST be applied on top of them; no other UI component library is added.
- **FR-015**: Nothing of the old design MUST remain: no token, asset, style override or
  documentation rule of it, and the superseded decisions (spec 002's "KERN 2.8 vs Revamp" rule)
  MUST be marked as history.
- **FR-016**: Every unit of the audit's inventory (a screen or a component) MUST have a visual
  verification table, one row per frame and state, and a unit is done only when every row matches
  or cites a decided item. A component's table covers its default and the interaction states the
  kit draws (hover, pressed, focus, disabled), once; a screen's table covers its layout and its own
  states (loading, empty, error, success) with the components in their default state.
- **FR-017**: The documentation MUST be updated: the design system guide, the Figma workflow, the
  architecture's frontend section and the agent instructions' UI rules; spec 002's audit files stay
  as history with their references updated.
- **FR-018**: The redesign MUST land as one change; no screen ships in the old design next to one
  in the new.

Decided drift items (Clarifications, session 2026-11-07):

- **FR-019**: The product is named "Konnekt" in every screen and tab title, in the consent and
  account texts, in the MCP guidance, in the backend's and the MCP server's texts, and in the
  README and docs; "Connection Portal" remains nowhere (Q1).
- **FR-020**: The people who share wallet data are "citizens" in every screen, in the findings
  texts of the rules package, in its test-step texts and in the MCP guidance; "applicant" remains
  nowhere (Q2).
- **FR-021**: Rule statements read `<document> · <field>[ – <part>] <condition>` with "must be
  met", and the editor proposes the COPY-BRIEF's messages, in every place that shows a statement:
  the rules step, the editor, the publish summary, the details, the test step, the approval page
  and the MCP outputs (Q3).
- **FR-022**: The findings texts are the design's sentences ("contradict each other", counts
  joined by ", and ", one sentence per finding), in the rules banner and notes, the tab tooltips,
  the publish dialog, the test step, the approval page and the MCP guidance; the undrawn findings
  keep their sentences with the same two substitutions (Q4).
- **FR-023**: The sign-in, duplicate-name and unrequested-data messages read as the design writes
  them, naming the variant where the baseline does, in the backend, in the rules package's
  validation (word for word) and in the MCP server; the number check keeps "Enter a whole number
  greater than 0." and the "Add it in Documents" action stays (Q5); the missing connection name
  reads "Enter a name for the connection." in the backend, the frontend's step-1 check, the MCP
  server and its guidance (#58).
- **FR-024**: The test step's data cards and headings read as the Test 1 frames format them, from
  the rules package: a flat list under the rules' labels, "<date>" for the date of birth (no
  age), "<class> since <date>" (no years) with the classes of one issue date in one row ("B, BE
  since <date>"), "Valid until <date>" under the expiry rule's label, "Result: doesn't meet <n>
  rule(s)" with the count, and the test-day line in dd.mm.yyyy (Q6, amended by the second
  round's Q1, #46).
- **FR-025**: The wizard's header is the compact "Step n of 4" with four segments and "Next:
  <step>" / "Last step", exposed as a progress bar; it is not clickable while creating and is
  clickable while editing; Publish is a dialog opened from the test step; the details and draft
  details show no step line (Q7).
- **FR-026**: In a create or draft flow, the product name and the breadcrumb open the leave
  dialog "Leave this connection?" whose "Save progress" runs Save and exit (a validation error
  keeps the member in the flow) and whose "Discard connection" leaves without storing and
  discards the flow's local draft; in the edit flow of a published connection they open "Save
  your changes?" ("If you leave now, your changes are lost. Save them, or discard them and keep
  the active version.") whose "Save" opens "Save changes?" and leaves once saved and whose
  "Discard changes" leaves without saving, × and Escape keeping the member in the flow (#47);
  closing or reloading the tab with unsaved changes shows the browser's "Leave site?" warning;
  an open rule editor is asked "Save changes to Rule 01?" first and no editor state is stored;
  step 1 shows "Starts as a draft. It only becomes active when you publish."; logging out with
  unsaved changes asks "Save before you log out?" with "Save and log out", "Log out anyway" and
  "Cancel". The local draft of the device remains the safety net after a crash or a forced leave
  (Q8).
- **FR-027**: While no connection or draft exists, the homepage is the welcome page "Welcome to
  Konnekt", shown after a sign-in without a requested route and again after the last connection
  is deleted, and remembered on the device across a reload; "Start from an example" is deferred
  to a later spec and not shown (Q9).
- **FR-028**: Each overview row offers Delete, which asks the same confirmation as the details
  (001-S6.11, or 005-S6.10 for a draft) with a per-row accessible name; selecting rows for a bulk
  delete is deferred to a later spec and its checkboxes and selection bar are not built (Q11).
- **FR-029**: The overview shows the design's one hint in every state and rows of equal height
  with or without a description; one delete dialog ("Delete connection" / "Keep connection")
  serves drafts and deactivated connections, the draft keeping its own body; a single local draft
  is offered heading-only with a one-item list for screen readers, and a never-saved item's button
  reads "Resume editing" (Q12).
- **FR-030**: The signed-in header shows an icon-only user pill whose menu holds the team
  member's name, "Your account" and "Log out"; no email line is shown (Q13).
- **FR-031**: The documents step is the design's master-detail list with the "Document n of m"
  pager, the "Added documents (n)" counter and the search card with suggestions; a document is
  removed inline with an undo toast, after a confirmation when no rule checks it and through
  002-S1.1's dialog when one does; a document without chosen data shows "1 document needs data"
  and the "Choose data" / "Remove 1 document" dialog (the count as drawn, #55), and "Set rules
  →" is disabled with
  "Add a document first" until a document is added; the step offers no "Publish without rules";
  documents keep catalog order and fields show no groups (drag reordering and field groups are
  deferred) (Q14).
- **FR-032**: The description in step 1 and in the variant dialog is a multi-line textarea (not
  required, at most 500 characters, spell check on), shown as one cut line on the overview and in
  the details' meta; its ⓘ keeps "About the description" and the baseline's explanation (Q15).
- **FR-033**: A failed save shows the design's neutral toast "Couldn't save. Check your internet
  connection and try again." with "Try again" (#55), carrying the error ID of a server error,
  without moving the focus; an alert is title-only only when it carries a
  title alone, and keeps its error ID, list or action otherwise; while saving, "Save and exit" is
  aria-disabled, reads "Saving…" and a polite status says "Saving draft…"; no blocking saving
  modal is shown (Q17).
- **FR-034**: On the rules step, "Test rules" and, in the edit flow, "Save" are disabled while a
  rule is open, incomplete or in error, or while grouping, with "Save the rule first" / "Finish
  grouping first" and an explanation that opens on hover and on focus (Q18, #47).
- **FR-035**: The Rules step shows an ⓘ after "+ Add variant" that opens on hover and on focus
  and reads "A separate set of rules for citizens with different requirements. Each variant gets
  its own result link."; the Test step shows no variant ⓘ (#57); the Standard tab's (i) shows
  only with a description (Q20).
- **FR-036**: Every rule, group and variant menu carries "Copy link" before its destructive
  entries (also after "Restore"); rule menus carry "Rename" and "Copy to variant", except that
  in a variant an item linked to Standard has no Rename, Duplicate or Ungroup and "Copy to
  variant" shows only while some variant could still receive the item (#53); group and
  sub-group menus carry "Rename" (inline, with the duplicate check) and, while the group has a
  message, "Remove message" next to "Add message" (#54); and the menu of a top-level rule, of a
  top-level group without a sub-group, or of a rule inside a top-level group (whether or not
  the group already holds a sub-group) offers "Group with other rules" when another rule or
  group is on the same level, which starts select mode with that item selected, inside a group
  limited to that group's rules; a sub-group's menu, a rule inside a sub-group and a group
  holding a sub-group offer no grouping (Q22, #48, #60).
- **FR-037**: While a group has a message of its own, its member rules show "Not shown while this
  rule is in Group 01. Citizens see the group message instead." in place of their message, keeping
  the message in the data; groups with one member or none are dissolved and a sub-group that
  moves up keeps its name, as the baseline says (Q23); the delete-rule dialog keeps the
  baseline's body (U47's drawn body for a Standard rule with variants, and the dissolving
  group's variant changes named) and builds no effect sentence from the rule's check (#56).
- **FR-038**: The AND/OR connector is a pill that opens a two-option menu ("All rules must be
  met" / "At least one rule must be met"), exposed as a menu button whose accessible name says
  the level; exactly one connector sits between items, the link icon is on every linked rule or
  none, and groups are selectable in select mode (Q24).
- **FR-039**: The rule editor keeps the baseline's states in the design's styling: pickers that
  unlock in order, inline flags on incomplete parts, the counting and missing notes on date
  conditions, the part picker after "Licence classes", the placeholder "Message for citizens:
  Suggested once you choose a check. You can edit it.", class options with code and description;
  the values picker has a "Done" button (Q27).
- **FR-040**: "Copy to variant" is the design's popover, which keeps the focus inside and returns
  it, shows based variants as included and not choosable, and keeps copies to Standard linked in
  the source branch; removed items in a variant keep their message line and "Changed here" text
  (Q28).
- **FR-041**: A variant tab shows a red problem icon whose tooltip (on hover and on focus) holds
  the problem text, or a grey ⓘ when there are no findings; the Test step's tabs show only the
  "no citizen can meet" finding, from the evaluator, and no line is shown above the result
  heading for it (004-S8.6.1 dropped, #50); the names in the findings banner are links to the
  item (Q29).
- **FR-042**: On the test step, "Edit data" opens a dialog ("Change the values to try a
  particular case. Results update when you save.", "Cancel", "Save and test"); an error blocks
  the save, and a saved change updates the results and announces "Results updated. <name> now
  meets <rule>." as a toast; licence classes are picked by code, and Nationality and Expiry date
  have fields (Q30).
- **FR-043**: Test results keep each rule's statement and its "Not met" / "Couldn't be checked"
  text next to the design's icon and tint; the data card is a flat list with no visible document
  column, the document's name staying the row group's accessible heading (#46), and the panel
  scrolls as a whole; a met variant shows no success message (Q31).
- **FR-044**: The publish dialog offers "Back to test", summarises the connection as counts,
  lists the findings warnings first, shows a "Published" state with "Opening your connection
  page…" for 0.5 s before the details, and on failure keeps the summary and shows the error ID
  (Q33).
- **FR-045**: Editing a published connection asks "Edit "<name>"?" first, shows "Active" in the
  header, offers Save on every step (the save dialog opening from the current step) and "Discard
  changes" with its confirmation, and keeps the note "Your changes take effect when you save
  them. Requests already in progress keep their previous configuration." (Q34); leaving it
  through the product name or the breadcrumb asks "Save your changes?" (FR-026, #47).
- **FR-046**: The details page has the status sentence as its one main heading, the name in the
  breadcrumb and the tab title, one "Edit connection" opening step 1, Links and Summary as
  accordions (Summary open from "View", one open at a time), the ⓘ on "Result link" reading
  "Your service gets the citizen's shared data from this link. Each variant has its own." (the
  {reference} hint of 001-S6.5 is dropped, #49), copy buttons disabled while deactivated, a
  branch ⓘ after each variant name, variants as tabs and the counts line; it offers no "Create
  new connection" (Q35).
- **FR-047**: The published details run the rule checks in the browser and show the findings
  lines in the Summary and the problem icons on the variant tabs, with the findings never
  stored, sent or logged (Q36).
- **FR-048**: A copy button reads "✓ Copied" for 2 s after copying and the copy is announced;
  the details offer no PDF, show no "Active since" or "Deactivated since" pill (rows read
  "Edited <date>"), and deactivating offers no Undo (Q37); the connection's ⋯ menu and, while
  deactivated, "Activate again" before it sit at the status band's right end, where the pill was
  drawn (#52).
- **FR-049**: A draft's details have "This connection is a draft" as the page's one main heading,
  in the status band with "Edited <date>", the name with the Draft badge in the breadcrumb and
  the tab title, "Edit connection" and "Go to connections →" in the footer and a visible "Delete
  draft" (Q39, #51); in the restore dialog, Escape, the × and the scrim all open the draft's
  details and keep the local draft (Q39).
- **FR-050**: Motion follows the design's build notes: 240 ms for a growing pill, 150 ms for
  colour changes and page fade-in, 150–200 ms for heights, a dialog fade and the 0.5 s publish
  delay, all turned off when the person's system asks for reduced motion (Q40).
- **FR-051**: The design's ui-detail items are built as designed (the overview search and count,
  the password toggle, "You're logged out.", the breadcrumb, group subtitles and notes, toast
  actions, editor hints, the ⓘ tooltips, "Discard rule", the per-document data count, the
  removed count, faded connectors, the reactivate summary, the non-closable publishing dialog
  and the action toasts); a tooltip opens on hover and on focus, a field has a visible label, and
  a toast is announced (Q45).
- **FR-052**: The design's eight small additions are built as designed: a scrim click closes a
  dialog that doesn't delete or publish (the restore dialog excepted), every disabled button
  explains why on hover and on focus, a page change scrolls to the top, a draft row's meta reads
  "Edited <date> · <step> step", the documents search card shows an "Added (n)" group, the Links
  accordion counts "1 request link · 3 result links", tooltips also open on touch, and the
  variant dialog preselects "Linked to Standard (recommended)" (#59).

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
- The kit is a reference: a kit component is built as the screens use it, and one no screen uses
  is not built.
- A typeface the design uses is adopted and served by the app itself, as the current one is; a
  typeface whose licence forbids that is a drift item.
- "Matches its frame" means within the tolerances of the Figma workflow (`docs/FIGMA-WORKFLOW.md`):
  exact spacing, borders, radii, colours and typography, one pixel for text box heights.
- The design defines motion in its build notes (durations, fades, a reduced-motion rule), and
  the port implements it (Q40, FR-050).
