# Requirements index — spec.md mtime 2026-11-06 23:50:35 UTC

| ID | Requirement (≤ 20 words) | Prio | UI | Surface | State | Flags | Spec § |
|---|---|---|---|---|---|---|---|
| FR-001a | Every screen and component takes its layout, styling and wording from "Middleware – V5" | - | Y | all screens | ? | | Requirements |
| FR-001b | A component's anatomy, variants and tokens come from the "KERN – Revamp – Design Kit" | - | Y | all components | ? | | Requirements |
| FR-002a | The design's copy replaces the current copy word for word, with its capitalisation and punctuation | - | Y | all screens | ? | copy | Requirements |
| FR-002b | Interpolated texts keep their variables; sample data in a frame is not copy | - | Y | all screens | ? | copy | Requirements |
| FR-002c | Where the design draws no screen, the baseline's copy stays | - | Y | undrawn screens | ? | copy | Requirements |
| FR-003 | Behaviour stays as the baseline: same routes, five steps, states, requests, sign-in guard, drafts and local drafts | - | Y | all screens | ? | baseline | Requirements |
| FR-004 | Every drift item is found by the audit, decided once in clarify, and recorded; nothing silent | - | N | ? | ? | | Requirements |
| FR-005 | An undrawn screen or state (W item) is built from the new components and patterns, baseline behaviour and wording | - | Y | undrawn screens | ? | W item | Requirements |
| FR-006 | Copy from another package changes only through an adopted C item, everywhere it is provided or repeated | - | Y | ? | ? | copy:server, copy:rules, copy:findings, copy:kit | Requirements |
| FR-007 | Apart from adopted C items, backend, rules package, MCP server and API types don't change | - | N | ? | ? | | Requirements |
| FR-008 | Every state keeps working: loading, error with error id, empty, disabled, busy, success, dialogs, menus, tooltips, toasts | - | Y | all screens | ? | | Requirements |
| FR-009a | Every action works with the keyboard alone, in a logical order | - | Y | all screens | ? | | Requirements |
| FR-009b | The focus ring shows for keyboard focus only | - | Y | all screens | ? | | Requirements |
| FR-009c | Dialogs keep the focus inside and return it | - | Y | dialogs | ? | | Requirements |
| FR-009d | Menus, popovers and tooltips keep the baseline's placement rules | - | Y | menus, popovers, tooltips | ? | | Requirements |
| FR-010a | Every screen works at 320 px and 200 % zoom without horizontal scrolling or lost content | - | Y | all screens | ? | | Requirements |
| FR-010b | Every screen matches its frame at the frame's width | - | Y | all screens | ? | | Requirements |
| FR-011 | One light appearance; the device's dark mode doesn't change it | - | Y | all screens | ? | | Requirements |
| FR-012a | Every route has exactly one main heading | - | Y | all screens | ? | | Requirements |
| FR-012b | Every route has its own tab title | - | Y | all screens | ? | | Requirements |
| FR-013a | Baseline accessibility holds: visible labels, linked validation, announced status, AA contrast with Revamp colours | - | Y | all screens | ? | | Requirements |
| FR-013b | A design colour pair failing AA gets the nearest passing value, recorded with the pair; designer told | - | Y | all screens | ? | | Requirements; Clarifications |
| FR-014a | KERN 2.8 packages stay; the Revamp's tokens and component anatomy are applied on top | - | N | ? | ? | | Requirements |
| FR-014b | No other UI component library is added | - | N | ? | ? | | Requirements |
| FR-015a | No token, asset, style override or documentation rule of the old design remains | - | N | ? | ? | | Requirements |
| FR-015b | Superseded decisions (spec 002's "KERN 2.8 vs Revamp" rule) are marked as history | - | N | ? | ? | | Requirements |
| FR-016a | Every audit unit has a visual verification table, one row per frame and state; done when clean | - | N | ? | ? | | Requirements |
| FR-016b | A component's table covers default plus the kit's hover, pressed, focus, disabled states, once | - | N | components | ? | | Requirements; Clarifications |
| FR-016c | A screen's table covers layout and own states (loading, empty, error, success), components in default | - | N | screens | ? | | Requirements; Clarifications |
| FR-017a | Docs updated: design system guide, Figma workflow, architecture's frontend section, agent UI rules | - | N | ? | ? | | Requirements |
| FR-017b | Spec 002's audit files stay as history with their references updated | - | N | ? | ? | | Requirements |
| FR-018 | The redesign lands as one change; no screen ships in the old design next to a new one | - | N | ? | ? | | Requirements |
| US1-AS1 | /login matches its frame; a failed sign-in shows one message never saying which field was wrong | P1 | Y | Sign in | error | copy:server | US1 |
| US1-AS2 | Forgot password matches its frame, says ask an administrator; back to sign in keeps requested route | P1 | Y | Forgot password | default | | US1 |
| US1-AS3 | Overview rows show published, deactivated, draft states; open, view, continue, create; empty, loading, error match | P1 | Y | Overview | default | | US1 |
| US1-AS4 | With local drafts, overview and first connection show the unsaved-work offer; resume and discard work | P1 | Y | Overview; First connection | default | | US1 |
| US1-AS5 | Without connections, sign-in shows first connection's loading then step 1; product name leads to empty overview | P1 | Y | First connection | loading | | US1 |
| US2-AS1 | Wizard shell shows five steps with design labels, "Save and exit", draft badge; current step marked | P2 | Y | Wizard shell | default | | US2 |
| US2-AS2 | Step 1 fields, hints and validation messages match; message next to field; focus to first problem | P2 | Y | Step 1 Connection | error | | US2 |
| US2-AS3 | Documents step states (no document, no field, data the catalog dropped) match and refuse to go on | P2 | Y | Documents step | error | | US2 |
| US2-AS4 | "Save and exit": saved status, overview's draft row and restore dialog in the new design | P2 | Y | Wizard shell; Overview; Restore dialog | success | | US2 |
| US2-AS5 | A second team member's save shows the conflict (005-S2) with new components, W item if undrawn | P2 | Y | Conflict dialog | error | W item | US2 |
| US3-AS1 | Rules list, groups, outlines, banner, notes, status region match; menus offer baseline items with "Copy link" | P3 | Y | Rules step | default | | US3 |
| US3-AS2 | Rule editor matches its frames per condition kind and values picker; messages are the server's unless C item | P3 | Y | Rule editor | error | copy:server | US3 |
| US3-AS3 | Adding, renaming, editing variants: marks and propagation from "Standard" as 002-S4, new design | P3 | Y | Variant tabs | default | | US3 |
| US3-AS4 | Test step outcomes per variant match frames, with loading state while the evaluator loads | P3 | Y | Test step | loading | | US3 |
| US3-AS5 | A link to a rule, group or variant opens the editor at that item, highlighted as designed | P3 | Y | Rules step | default | | US3 |
| US4-AS1 | Publish summary, findings and publish dialog match; publishing leads to details with connection URLs | P4 | Y | Publish dialog | success | | US4 |
| US4-AS2 | Published details: header, trigger URL, pull URLs with reference hint, documents, rules summary match; "copied" announced | P4 | Y | Details | success | | US4 |
| US4-AS3 | Deactivate, reactivate, delete dialogs read as designed, say what happens to URLs and requests | P4 | Y | Confirmation dialogs | default | | US4 |
| US4-AS4 | Draft details offer continue and delete as drawn, and no connection URL | P4 | Y | Draft details | default | | US4 |
| US4-AS5 | Editing a published connection: note on requests in progress, new revision and conflict in new design | P4 | Y | Edit flow | default | | US4 |
| US4-AS6 | A deleted or unknown connection's address shows an error state with the way back to overview | P4 | Y | Details | error | | US4 |
| US5-AS1 | Consent page: title, three access levels, allow, deny, step-up line, invalid-request error; 007-S1 wording | P5 | Y | Consent page | default | W item | US5 |
| US5-AS2 | Account page: two sections, menus and dialogs use design list, menu, dialog, copyable-field patterns | P5 | Y | Account page | default | W item | US5 |
| US5-AS3 | Approval page: body, approve, decline, working state and every outcome follow 007-S3 in new design | P5 | Y | Approval page | default | W item | US5 |
| US5-AS4 | When a renaming C item is adopted, these pages use the new name too | P5 | Y | Consent, Account, Approval pages | default | C item | US5 |
| EC-1 | A frame showing a state or control the baseline lacks is an F item, not silently built | - | Y | ? | ? | F item | Edge Cases |
| EC-2 | A baseline state the design doesn't draw is a W item, built from new components, pattern recorded | - | Y | ? | ? | W item | Edge Cases |
| EC-3 | Interpolated copy: the design's sentence is the template, variables stay; sample data isn't copy | - | Y | ? | ? | copy | Edge Cases |
| EC-4 | Outside copy the design rewrites, or a renamed concept including the product name, is a C item | - | Y | ? | ? | C item | Edge Cases |
| EC-5 | A design component without a current equivalent is built as its own after the kit's anatomy | - | Y | ? | ? | | Edge Cases |
| EC-6 | Below the drawn width the layout reflows by design spacing and baseline rules; nothing hidden; narrow frames decide | - | Y | all screens | ? | | Edge Cases |
| EC-7 | Long names, descriptions, lists and URLs follow the design's wrapping or truncation; nothing unreachable | - | Y | all screens | ? | | Edge Cases |
| EC-8 | A Revamp colour pair failing AA uses nearest passing value, recorded with the pair; designer told | - | Y | all screens | ? | | Edge Cases |
| EC-9 | A screen reached by its address (bookmark, history, agent link) behaves as the baseline says | - | Y | all screens | ? | | Edge Cases |

## Behaviour baseline

Contracts: 001: `specs/001-servicebw-eudi-middleware/contracts/ui-screens.md` (no section ids: the preamble with the routes and the sign-in guard is S0, the `##` sections S1 Sign in, S2 Forgot password, S3 Overview, S4 First connection, S5 Create and edit, S6 Details, S7 Accessibility, as spec.md's table states); 002: `specs/002-connection-rules/contracts/ui-screens.md`; 003: `specs/003-rule-consistency-checks/contracts/ui-screens.md`; 004: `specs/004-rule-test-personas/contracts/ui-screens.md`; 005: `specs/005-connection-drafts/contracts/ui-screens.md`; 006: `specs/006-connection-description/contracts/ui-screens.md` (no section ids: preamble S0, `##` sections S1 Step 1, S2 Overview row, S3 Details page, S4 Accessibility, S5 Copy removed); 007: `specs/007-agent-mcp-server/contracts/ui-screens.md`.
Unnumbered sections of the other contracts: `R` Routes, `ACC` Accessibility, `CP` Copy (Copy conventions). Items of "Deviations from Figma", "Items from the audit" and "W-items" are numbered within the screen section they belong to; `Spec §` names the item (F#, W#, A#, K#, O#, FYI). Copy tables that repeat texts already in a row are not indexed twice.

| ID | Requirement (≤ 20 words) | Prio | UI | Surface | State | Flags | Spec § |
|---|---|---|---|---|---|---|---|
| 001-S0.1 | Every route except /login and /forgot-password needs a session | P1 | Y | Sign-in guard | default | baseline | 001 §S0 (preamble) |
| 001-S0.2 | When GET /api/auth/me answers 401, the app goes to /login and returns to the requested route after sign-in | P1 | Y | Sign-in guard | default | baseline | 001 §S0 |
| 001-S0.3 | Without a requested route, sign-in opens /get-started; / doesn't count as a requested route | P1 | Y | Sign-in guard | default | baseline | 001 §S0; 001-FR-022 |
| 001-S0.4 | A signed-in user who opens /login or /forgot-password goes on to the app the same way | P1 | Y | Sign-in guard | default | baseline | 001 §S0 |
| 001-S0.5 | Every signed-in screen shows the user's name and a sign-out action that leads to sign in | P1 | Y | Signed-in frame | default | baseline | 001 §S0 |
| 001-S0.6 | Every signed-in screen shows the product name, which leads to the overview | P1 | Y | Signed-in frame | default | baseline | 001 §S0 |
| 001-S1.1 | Fields: username and password, with a submit action | P1 | Y | Sign in | default | baseline | 001 §S1 Sign in; 001-FR-007 |
| 001-S1.2 | Failed sign-in: one generic message "Invalid username or password", never saying which was wrong | P1 | Y | Sign in | error | baseline, copy:server | 001 §S1 |
| 001-S1.3 | Forgot password: a link to /forgot-password | P1 | Y | Sign in | default | baseline | 001 §S1 |
| 001-S2.1 | The UI can't reset passwords; the screen tells the team member to ask an administrator | P1 | Y | Forgot password | default | baseline | 001 §S2 Forgot password |
| 001-S2.2 | It leads back to sign in, keeping the route that asked for the sign-in | P1 | Y | Forgot password | default | baseline | 001 §S2 |
| 001-S3.1 | One row per form connection that isn't deleted, showing its name and whether active or deactivated | P1 | Y | Overview | default | baseline | 001 §S3 Overview; 001-FR-006 |
| 001-S3.2 | Selecting a row opens its details | P1 | Y | Overview | default | baseline | 001 §S3 |
| 001-S3.3 | "Create form connection" opens /form-connections/new | P1 | Y | Overview | default | baseline, copy | 001 §S3 |
| 001-S3.4 | Reached through the product name even when no connection exists, and after sign-in when one does | P1 | Y | Overview | default | baseline | 001 §S3 |
| 001-S3.5 | Loading state | P1 | Y | Overview | loading | baseline | 001 §S3 |
| 001-S3.6 | Empty list with a prompt to create the first form connection | P1 | Y | Overview | empty | baseline | 001 §S3 |
| 001-S3.7 | Error state | P1 | Y | Overview | error | baseline | 001 §S3 |
| 001-S4.1 | Opens after a sign-in without requested route; checks once with GET /api/form-connections whether any exists | P1 | Y | First connection | default | baseline | 001 §S4 First connection; 001-FR-022 |
| 001-S4.2 | None: shows the create steps, "Create your first connection" as step 1's heading and page title | P1 | Y | First connection | default | baseline, copy | 001 §S4 |
| 001-S4.3 | Validation and what happens after saving are as on /form-connections/new | P1 | Y | First connection | default | baseline | 001 §S4 |
| 001-S4.4 | Some, or the check fails: it replaces itself with the overview, showing its list or error state | P1 | Y | First connection | error | baseline | 001 §S4 |
| 001-S4.5 | The same happens when the address is opened later, e.g. from a bookmark or history | P1 | Y | First connection | default | baseline | 001 §S4 |
| 001-S4.6 | While it checks: "Loading your connections…" without the overview's title and actions | P1 | Y | First connection | loading | baseline, copy | 001 §S4 |
| 001-S4.7 | The product name leads to the overview, which shows its empty state while no connection exists | P1 | Y | First connection | empty | baseline | 001 §S4 |
| 001-S4.8 | Nothing stored per account: the screen opens at each sign-in until a connection exists | P1 | Y | First connection | default | baseline | 001 §S4 |
| 001-S5.1 | Name, required | P2 | Y | Step 1 Connection | default | baseline | 001 §S5 Create and edit |
| 001-S5.2 | The team member adds document types from the catalog; each type can be added once | P2 | Y | Documents step | default | baseline | 001 §S5 |
| 001-S5.3 | Each added document lists the fields of its type to select from | P2 | Y | Documents step | default | baseline | 001 §S5 |
| 001-S5.4 | A document can be removed again | P2 | Y | Documents step | default | baseline | 001 §S5 |
| 001-S5.5 | Saving refused while no document, a document without selected field, or a required text is empty | P2 | Y | Wizard | error | baseline | 001 §S5 |
| 001-S5.6 | The refusal message names the problem | P2 | Y | Wizard | error | baseline | 001 §S5 |
| 001-S5.7 | The screen checks these rules before calling the API, and also shows the API's 400 message | P2 | Y | Wizard | error | baseline, copy:server | 001 §S5 |
| 001-S5.8 | After saving, the details screen opens | P2 | Y | Wizard | success | baseline | 001 §S5 |
| 001-S5.9 | When editing, a note explains that requests already in progress keep their previous configuration | P2 | Y | Edit flow | default | baseline | 001 §S5; 001-FR-005 |
| 001-S5.10 | Loading the catalog and, when editing, the form connection | P2 | Y | Wizard | loading | baseline | 001 §S5 |
| 001-S5.11 | An error if the catalog or the connection can't be loaded | P2 | Y | Wizard | error | baseline | 001 §S5 |
| 001-S5.12 | The screen uses useReducer; documents and fields are rendered by sub-components | P2 | N | Wizard | ? | baseline | 001 §S5 |
| 001-S6.1 | Header names the connection as main heading and shows its status, in the wizard's last screen frame | P4 | Y | Details | default | baseline | 001 §S6 Details |
| 001-S6.2 | The wizard's steps are all done | P4 | Y | Details | default | baseline | 001 §S6 |
| 001-S6.3 | An action bar leads to the overview and to a new form connection | P4 | Y | Details | default | baseline | 001 §S6 |
| 001-S6.4 | Trigger URL and pull URL, each with a one-action copy button using navigator.clipboard | P4 | Y | Details | default | baseline | 001 §S6; 001-FR-004 |
| 001-S6.5 | The pull URL shows {reference} literally, with a hint that serviceBW substitutes the request reference | P4 | Y | Details | default | baseline | 001 §S6 |
| 001-S6.6 | The URLs never change; reopening the screen shows the same ones | P4 | Y | Details | default | baseline | 001 §S6 |
| 001-S6.7 | Configuration summary: the requested documents with their selected fields | P4 | Y | Details | default | baseline | 001 §S6 |
| 001-S6.8 | An "Edit" action opens the edit screen | P4 | Y | Details | default | baseline, copy | 001 §S6 |
| 001-S6.9 | Deactivate asks for confirmation, saying URLs stop working at once and requests in progress are cancelled | P4 | Y | Details; Deactivate dialog | default | baseline | 001 §S6 |
| 001-S6.10 | Reactivate, for a deactivated form connection | P4 | Y | Details | default | baseline | 001 §S6 |
| 001-S6.11 | Delete asks for confirmation, stating that the URLs will stop working permanently | P4 | Y | Details; Delete dialog | default | baseline | 001 §S6 |
| 001-S6.12 | After deleting, the app returns to the overview | P4 | Y | Details | success | baseline | 001 §S6 |
| 001-S6.13 | Loading state | P4 | Y | Details | loading | baseline | 001 §S6 |
| 001-S6.14 | Error if it can't be loaded, e.g. deleted, with a way back to the overview | P4 | Y | Details | error | baseline | 001 §S6 |
| 001-S7.1 | Every screen meets WCAG 2.1 level AA | - | Y | all screens | ? | baseline | 001 §S7 Accessibility |
| 001-S7.2 | Every action works with the keyboard alone, in a logical order, with a visible focus | - | Y | all screens | ? | baseline | 001 §S7 |
| 001-S7.3 | Dialogs keep the focus inside while open and return it to the button that opened them | - | Y | dialogs | ? | baseline | 001 §S7 |
| 001-S7.4 | Every field has a visible label | - | Y | forms | ? | baseline | 001 §S7 |
| 001-S7.5 | Validation messages appear next to their field and are linked to it for screen readers | - | Y | forms | error | baseline | 001 §S7 |
| 001-S7.6 | After a refused save, the focus moves to the first field with a problem | - | Y | forms | error | baseline | 001 §S7 |
| 001-S7.7 | Results without a page change ("copied", "saved", an API error) are announced to screen readers | - | Y | all screens | success | baseline | 001 §S7 |
| 001-S7.8 | Each route has its own page title and one main heading | - | Y | all screens | ? | baseline | 001 §S7 |
| 001-S7.9 | The page language is set to the language of the UI | - | N | all screens | ? | baseline | 001 §S7 |
| 001-S7.10 | Text and controls meet the AA contrast ratios | - | Y | all screens | ? | baseline | 001 §S7 |
| 001-S7.11 | The screens still work at 200% zoom and at a width of 320 px | - | Y | all screens | ? | baseline | 001 §S7 |
| 002-S0.1 | Header names the connection, progress shows the steps, action bar has Back and one primary action | P2 | Y | Wizard shell | default | baseline | 002 §S0 Wizard shell |
| 002-S0.2 | Header and action bar stay in place while the step scrolls | P2 | Y | Wizard shell | default | baseline | 002 §S0; Deviations S0 F19 |
| 002-S0.3 | Select mode's bar pins under the head | P2 | Y | Rules step | default | baseline | 002 Deviations S0, F19 (sticky bars) |
| 002-S1.1 | Removing a document, or deselecting a field, that rules check opens a dialog naming those rules with their branches | P2 | Y | Documents step; Removal dialog | default | baseline | 002 §S1 Documents step; 002-FR-029 |
| 002-S1.2 | This includes the select-all checkbox | P2 | Y | Documents step | default | baseline | 002 §S1 |
| 002-S1.3 | After confirming, the rules stay and publishing or saving is refused while they remain | P2 | Y | Documents step | error | baseline | 002 §S1; 002-FR-006 |
| 002-S1.4 | Footer: "Add rules →" goes on to the Rules step | P2 | Y | Documents step | default | baseline, copy | 002 §S1 |
| 002-S1.5 | "Publish without rules" ("Save without rules" when editing) offered only while no branch has any rule | P2 | Y | Documents step | default | baseline, copy | 002 §S1; Deviations S1 F17 |
| 002-S1.6 | Removal dialogs "Remove Personal ID?", "Stop requesting Date of birth?" name the rules with their branches | P2 | Y | Removal dialog | default | baseline, copy | 002 Deviations S1, F18 |
| 002-S1.7 | In the edit flow the removal dialog's copy reads "… before you save." | P2 | Y | Removal dialog | default | baseline, copy | 002 Deviations S1, F18; S7 |
| 002-S1.8 | Not built: search with suggestions, "Upcoming" catalogue, added-documents counter and pager; spec 001's step stays | P2 | Y | Documents step | default | baseline, not built | 002 Deviations S1, F19 |
| 002-S1.9 | Not built: inline Remove on hover, undo toast, nothing-chosen validation, animations, 10-document catalogue | P2 | Y | Documents step | default | baseline, not built | 002 Deviations S1, F19 |
| 002-S1.10 | The driving licence's "Age over 18" is not in the catalog: age is checked through the Date of birth | P2 | Y | Documents step | default | baseline, not built | 002 Deviations S1, F20 |
| 002-S1.11 | "Age in years" and "Year of birth" stay as number fields | P2 | Y | Documents step; Rule editor | default | baseline | 002 Deviations S1, F20 |
| 002-S2.1 | Tabs: one tab per branch, main branch first, and "+ Add variant" | P3 | Y | Rules step | default | baseline, copy | 002 §S2; 002-FR-019 |
| 002-S2.2 | The tab row shows from the start of the step, also before the first rule and while it is edited | P3 | Y | Rules step | empty | baseline | 002 §S2; Deviations S2 F16 |
| 002-S2.3 | Empty state: "No rules yet" with "+ Add rule", in every branch without rules | P3 | Y | Rules step | empty | baseline, copy | 002 §S2; Deviations S4 W5 |
| 002-S2.4 | Each rule shows its name and its statement in FR-005's words, e.g. "Personal ID – Date of birth (Age) is at least 21 years old" | P3 | Y | Rules step | default | baseline, copy:rules | 002 §S2; 002-FR-005 |
| 002-S2.5 | Each rule shows its error message | P3 | Y | Rules step | default | baseline | 002 §S2 |
| 002-S2.6 | Decoration symbols (≥, <, =) are hidden from assistive technologies | P3 | Y | Rules step | default | baseline | 002 §S2; §Accessibility |
| 002-S2.7 | Identifiers aren't shown in the rules step | P3 | Y | Rules step | default | baseline | 002 §S2; 002-FR-010 |
| 002-S2.8 | A connector between every two items of a level; switching one switches the whole level | P3 | Y | Rules step | default | baseline | 002 §S2; 002-FR-007 |
| 002-S2.9 | Select two or more items to group them | P3 | Y | Rules step | default | baseline | 002 §S2; 002-FR-008 |
| 002-S2.10 | A group's members can form a sub-group; a sub-group offers no further grouping | P3 | Y | Rules step | default | baseline | 002 §S2 |
| 002-S2.11 | Group and sub-group ⋯ menu: "Add error message" / "Remove error message"; message card under the header | P3 | Y | Rules step | default | baseline, copy | 002 §S2; Deviations S2 W6 |
| 002-S2.12 | Group and sub-group menus offer "Ungroup" and "Delete group" | P3 | Y | Rules step | default | baseline, copy | 002 §S2; Deviations S2 W8 |
| 002-S2.13 | A group left with fewer than two members dissolves; its member moves up; empty groups never exist | P3 | Y | Rules step | default | baseline | 002 §S2; Deviations S2 F13 |
| 002-S2.14 | A sub-group that reaches the top level becomes a group, keeping identifier, name, AND/OR and message | P3 | Y | Rules step | default | baseline | 002 §S2 |
| 002-S2.15 | Rules and groups keep adding order; a new group takes its first member's place; no reordering | P3 | Y | Rules step | default | baseline | 002 §S2 |
| 002-S2.16 | Rule actions: edit, rename, duplicate, copy to other variants, delete with confirmation and undo | P3 | Y | Rules step | default | baseline | 002 §S2 |
| 002-S2.17 | Renaming happens inline | P3 | Y | Rules step | default | baseline | 002 §S2 |
| 002-S2.18 | A duplicate name is refused inline, naming the branch: "Another rule in Ambulance is already called Rule 01." | P3 | Y | Rules step | error | baseline, copy:server | 002 §S2; Deviations S2 F12 |
| 002-S2.19 | The same for groups and sub-groups, and a main-branch rename clashing in a based branch names that branch | P3 | Y | Rules step | error | baseline, copy:server | 002 Deviations S2, F12 |
| 002-S2.20 | "Rule NN", "Group NN", "Sub-group NN" are kept for that number: "Rule 08 is kept for the rule numbered 08." | P3 | Y | Rules step | error | baseline, copy:server | 002 §S2 |
| 002-S2.21 | In a based branch, names that an undo or a restore could bring back count as taken | P3 | Y | Rules step | error | baseline | 002 §S2 |
| 002-S2.22 | Rule checking unrequested data: banner and inline flag, "Rule 02 in Standard checks data that's no longer requested. …" | P3 | Y | Rules step | error | baseline, copy:server, copy | 002 §S2; Deviations S2 F11 |
| 002-S2.23 | Publish and Save stay enabled; an attempt with problems is refused naming problem, rule and branch | P3 | Y | Rules step; Test step | error | baseline, copy:server | 002 §S2; Deviations S2 F11 |
| 002-S2.24 | After a refused attempt, the focus moves to the rule or field the message names | P3 | Y | Rules step | error | baseline | 002 §S2; §Accessibility |
| 002-S2.25 | Unsaved rule editor: leaving the editor and "Add it in Documents" first ask "Save changes to Rule 01?" | P3 | Y | Rules step; Save changes dialog | default | baseline, copy | 002 §S2; Deviations S2 F10 |
| 002-S2.26 | "Save changes" saves the rule even if incomplete; "Discard" drops the changes; then the action goes on | P3 | Y | Save changes dialog | default | baseline, copy | 002 Deviations S2, F10 |
| 002-S2.27 | Saved statements: "–" between document, field and part; "is" before the condition | P3 | Y | Rules step; Publish dialog; Details | default | baseline, copy:rules | 002 Deviations S2, F1 (also S4–S6) |
| 002-S2.28 | "old" appears only on the Date of birth; every other date says "years ago" | P3 | Y | Rules step; Rule editor | default | baseline, copy:rules | 002 Deviations S2, S3, F1 |
| 002-S2.29 | "Driving licence – Expiry date is at least 6 months from now", and "is less than"; no "left" | P3 | Y | Rules step | default | baseline, copy:rules | 002 Deviations S2, F2 |
| 002-S2.30 | Enum statements read "includes one of" / "includes none of" | P3 | Y | Rules step; Details | default | baseline, copy:rules | 002 Deviations S2, F8 |
| 002-S2.31 | Toast "Rule 03 in Standard deleted." with Undo | P3 | Y | Rules step | success | baseline, copy | 002 Deviations S2, F29 |
| 002-S2.32 | Toast "Rule 02 and Rule 03 in Standard are now Group 01." with Undo | P3 | Y | Rules step | success | baseline, copy | 002 Deviations S2, F29 |
| 002-S2.33 | Dialog titles such as "Delete Rule 03?" and selection bars keep the design's copy | P3 | Y | Rules step | default | baseline, copy | 002 Deviations S2, F29 |
| 002-S2.34 | "Ungroup": members take the group's place; toast "Group 01 in Standard ungrouped." with Undo | P3 | Y | Rules step | success | baseline, copy | 002 Deviations S2, W8 |
| 002-S2.35 | "Delete group": confirmation "Delete Group 01?", saying its rules go with it; then a toast with Undo | P3 | Y | Rules step; Delete group dialog | default | baseline, copy | 002 Deviations S2, W8 |
| 002-S2.36 | Standard's delete-group confirmation names the branches whose changed group it dissolves | P3 | Y | Delete group dialog | default | baseline | 002 Deviations S2, W8 |
| 002-S3.1 | Opened by "+ Add rule" or by editing a rule; shows the rule's name, default "Rule NN" | P3 | Y | Rule editor | default | baseline, copy | 002 §S3 Rule editor |
| 002-S3.2 | Choosing the data: document → data → part → check → value, each unlocked in order | P3 | Y | Rule editor | disabled | baseline | 002 §S3; 002-FR-002 |
| 002-S3.3 | Only the documents and fields the connection requests are offered | P3 | Y | Rule editor | default | baseline | 002 §S3 |
| 002-S3.4 | Images are listed as "Can't be checked" | P3 | Y | Rule editor | disabled | baseline, copy | 002 §S3 |
| 002-S3.5 | Long menus have a search field | P3 | Y | Rule editor | default | baseline | 002 §S3 |
| 002-S3.6 | Checks: the conditions of the field's kind, in FR-003's words | P3 | Y | Rule editor | default | baseline, copy:rules | 002 §S3; 002-FR-003 |
| 002-S3.7 | Text conditions have their own letter-case checkbox ("Match letter case"), unchecked by default | P3 | Y | Rule editor | default | baseline, copy | 002 §S3; Deviations S3 F7 |
| 002-S3.8 | Date conditions show the counting note and the missing-value note | P3 | Y | Rule editor | default | baseline | 002 §S3 |
| 002-S3.9 | Error message proposed once the condition is complete, matching it; editable | P3 | Y | Rule editor | default | baseline, copy:rules | 002 §S3; Deviations S3 F9 |
| 002-S3.10 | "Save rule" stays disabled until the rule is complete, with inline flags | P3 | Y | Rule editor | disabled | baseline, copy | 002 §S3 |
| 002-S3.11 | The footer's Publish or Save still checks everything | P3 | Y | Rule editor | error | baseline | 002 §S3 |
| 002-S3.12 | Date of birth: is at least / is less than / is exactly N years old | P3 | Y | Rule editor | default | baseline, copy:rules | 002 Deviations S3, F3 |
| 002-S3.13 | Other dates: is before / is after / is <date>; is at least / less than / exactly N years ago | P3 | Y | Rule editor | default | baseline, copy:rules | 002 Deviations S3, F3 |
| 002-S3.14 | Every date: is at least / is less than N years or months from now | P3 | Y | Rule editor | default | baseline, copy:rules | 002 Deviations S3, F3 |
| 002-S3.15 | Unit picker (years, months) only on from-now conditions; age and years-ago take whole years as fixed text | P3 | Y | Rule editor | default | baseline | 002 Deviations S3, F3 |
| 002-S3.16 | N is a whole number ≥ 1; no "at most" | P3 | Y | Rule editor | error | baseline | 002 Deviations S3, F3 |
| 002-S3.17 | Menu sections read "Time ago" and "Time from now" | P3 | Y | Rule editor | default | baseline, copy | 002 Deviations S3, F3 |
| 002-S3.18 | Date hint: "Check an age, the time from now, or compare the date with a fixed date." | P3 | Y | Rule editor | default | baseline, copy | 002 Deviations S3, F3 |
| 002-S3.19 | Next to every date condition, errors included: "Counted from the day the applicant shares. Today (…) this means: …" | P3 | Y | Rule editor | default | baseline, copy | 002 Deviations S3, F4 |
| 002-S3.20 | Missing note: "If the date of birth is missing or can't be read, the rule isn't met …" | P3 | Y | Rule editor | default | baseline, copy | 002 Deviations S3, F4 |
| 002-S3.21 | Saved rules don't show these notes | P3 | Y | Rules step | default | baseline | 002 Deviations S3, F4 |
| 002-S3.22 | After "Licence classes", a part picker "Choose part" follows, with the search field "Search classes" | P3 | Y | Rule editor | default | baseline, copy | 002 Deviations S3, F5 |
| 002-S3.23 | The part picker's empty result: "No options match "{typed text}"." | P3 | Y | Rule editor | empty | baseline, copy | 002 Deviations S3, F5 |
| 002-S3.24 | It lists "Licence classes" and, per class, "Licence class B – Issue date" and "– Expiry date" | P3 | Y | Rule editor | default | baseline, copy:rules | 002 Deviations S3, F5 |
| 002-S3.25 | Held classes are an enum with several values; class dates take the date conditions | P3 | Y | Rule editor | default | baseline | 002 Deviations S3, F5 |
| 002-S3.26 | A class without its own expiry date doesn't fall back to the licence's | P3 | N | Rule editor | ? | baseline | 002 Deviations S3, F5 |
| 002-S3.27 | Numbers: is greater than / is less than / is equal to / is not equal to, strict, one value | P3 | Y | Rule editor | default | baseline, copy:rules | 002 Deviations S3, F6 |
| 002-S3.28 | The number value field keeps accepting any number; a range takes two rules | P3 | Y | Rule editor | default | baseline | 002 Deviations S3, F6 |
| 002-S3.29 | Text: is equal to / is not equal to / contains / doesn't contain, each with one value | P3 | Y | Rule editor | default | baseline, copy:rules | 002 Deviations S3, F7 |
| 002-S3.30 | Text hint: "Spaces at the start or end don't matter."; no "starts with" | P3 | Y | Rule editor | default | baseline, copy | 002 Deviations S3, F7 |
| 002-S3.31 | The saved statement shows the letter-case setting | P3 | Y | Rules step | default | baseline, copy:rules | 002 Deviations S3, F7 |
| 002-S3.32 | Enums: "includes one of" / "includes none of", for any number of values | P3 | Y | Rule editor | default | baseline, copy:rules | 002 Deviations S3, F8 |
| 002-S3.33 | Until complete, the message placeholder reads "Error message applicants read: Suggested once you complete the check. You can edit it." | P3 | Y | Rule editor | empty | baseline, copy | 002 Deviations S3, F9 |
| 002-S3.34 | Toast "Rule 01 in Standard saved." | P3 | Y | Rule editor | success | baseline, copy | 002 Deviations S3, F29 |
| 002-S3.35 | Nationality hint: "Nationality can have more than one value. "Includes one of" is met if any …" | P3 | Y | Rule editor | default | baseline, copy | 002 Deviations S3, F30 |
| 002-S3.36 | Licence hint "Met if the licence has at least one of the chosen classes." | P3 | Y | Rule editor | default | baseline, copy | 002 Deviations S3, F30 |
| 002-S3.37 | Licence class menu: "Search classes"; each option shows code and description, e.g. "B Cars up to 3.5 t" | P3 | Y | Rule editor; Values picker | default | baseline, copy | 002 Deviations S3, F32 |
| 002-S3.38 | Checkboxes for several values; footer "Select at least one option."; empty result "No options match "XL"." | P3 | Y | Values picker | empty | baseline, copy | 002 Deviations S3, F32 |
| 002-S3.39 | Chips in the field and saved statements keep the codes only ("B", "BE") | P3 | Y | Values picker; Rules step | default | baseline | 002 Deviations S3, F32 |
| 002-S3.40 | Option menus of other enums, such as Nationality, keep "Search options" | P3 | Y | Values picker | default | baseline, copy | 002 Deviations S3, F32 |
| 002-S3.41 | One footer wording in the document menu, recorded in the design notes | P3 | Y | Rule editor | default | baseline, copy | 002 Also from the audit, FYI #20 |
| 002-S4.1 | Add variant: name, optional description, and "Start with": based on Standard, or empty | P3 | Y | Variant dialog | default | baseline, copy | 002 §S4 Branches; 002-FR-019, 002-FR-020 |
| 002-S4.2 | The description shows in a tooltip from an (i) right after the branch's name, on hover and keyboard focus | P3 | Y | Variant tabs | default | baseline | 002 §S4; §Accessibility |
| 002-S4.3 | No (i) without a description | P3 | Y | Variant tabs | default | baseline | 002 §S4 |
| 002-S4.4 | Tab menu: "Rename" for every branch opens the same dialog titled "Edit variant", without "Start with" | P3 | Y | Variant tabs; Variant dialog | default | baseline, copy | 002 §S4; Deviations S4 W3 |
| 002-S4.5 | "Delete" for every other branch, after a confirmation | P3 | Y | Variant tabs | default | baseline, copy | 002 §S4; Deviations S4 W3 |
| 002-S4.6 | Marks in a based branch: "Changed here", "New addition" and "Removed", each with colour and text | P3 | Y | Rules step | default | baseline, copy | 002 §S4; 002-FR-023 |
| 002-S4.7 | Removed items stay visible and can only be restored | P3 | Y | Rules step | default | baseline | 002 §S4 |
| 002-S4.8 | Undo returns an item to following the main branch; so does an edit making it equal again | P3 | Y | Rules step | default | baseline | 002 §S4 |
| 002-S4.9 | A switched top-level AND/OR is marked too | P3 | Y | Rules step | default | baseline | 002 §S4 |
| 002-S4.10 | An inherited group's menu offers "Remove" and "Restore", not "Ungroup" or "Delete group" | P3 | Y | Rules step | default | baseline, copy | 002 §S4; Deviations S2 W8 |
| 002-S4.11 | Changes to the main branch show at once in every based branch | P3 | Y | Rules step | default | baseline | 002 §S4 |
| 002-S4.12 | Copy to variant: copies a rule to chosen branches as a new rule at the end of their top level | P3 | Y | Copy to variant dialog | default | baseline | 002 §S4 |
| 002-S4.13 | Choosing Standard covers the branches based on it: shown as included, not choosable on their own | P3 | Y | Copy to variant dialog | disabled | baseline | 002 §S4 |
| 002-S4.14 | A copy from a based branch to Standard also appears, linked, in that branch | P3 | Y | Rules step | default | baseline | 002 §S4 |
| 002-S4.15 | Deleting a Standard rule: "This rule will be removed from Standard and from the variants that follow it. …" | P3 | Y | Delete rule dialog | default | baseline, copy | 002 Deviations S4, F14 |
| 002-S4.16 | The body names variants that changed the rule; they keep their version, which counts as added | P3 | Y | Delete rule dialog | default | baseline | 002 Deviations S4, F14 |
| 002-S4.17 | If a group dissolves, the body names changed variants: "Ambulance's changes to Group 01 go with it." | P3 | Y | Delete rule dialog | default | baseline, copy | 002 Deviations S4, F14 |
| 002-S4.18 | In a based branch, an inherited group under two active members dissolves there only, shown removed | P3 | Y | Rules step | default | baseline | 002 Deviations S4, F13 |
| 002-S4.19 | A switched operator marks the group "Changed here"; a changed rule keeps its mark inside a removed group | P3 | Y | Rules step | default | baseline | 002 Deviations S4, F15 |
| 002-S4.20 | Toast "Rule 01 and Rule 02 in Ambulance are now Group 02. Standard stays the same." with Undo | P3 | Y | Rules step | success | baseline, copy | 002 Deviations S4, F29 |
| 002-S4.21 | Toast "Rule 06 copied to School transport." | P3 | Y | Rules step | success | baseline, copy | 002 Deviations S4, F29 |
| 002-S4.22 | Variant dialog fields "Variant name", "Description - Optional", helper "Shown when someone hovers the (i) next to the variant name." | P3 | Y | Variant dialog | default | baseline, copy | 002 Deviations S4, W3 |
| 002-S4.23 | A missing name is reported in the dialog: "Enter a name for the variant." | P3 | Y | Variant dialog | error | baseline, copy:server | 002 Deviations S4, W3 |
| 002-S4.24 | A duplicate name: "Another variant is already called Ambulance." | P3 | Y | Variant dialog | error | baseline, copy:server | 002 Deviations S4, W3 |
| 002-S4.25 | Once the main branch has a description, "Standard" gets the (i) like the other tabs | P3 | Y | Variant tabs | default | baseline | 002 Deviations S4, W3 |
| 002-S4.26 | Main changes a rule the branch changed: the branch keeps its version, still "Changed here" | P3 | Y | Rules step | default | baseline | 002 Deviations S4, W4 |
| 002-S4.27 | Main removes a rule the branch changed: the branch's version shows "New addition" | P3 | Y | Rules step | default | baseline | 002 Deviations S4, W4 |
| 002-S4.28 | Main removes a rule the branch removed: it disappears from the branch | P3 | Y | Rules step | default | baseline | 002 Deviations S4, W4 |
| 002-S4.29 | Main adds or changes a followed rule: shows unmarked in based branches, not in empty-started ones | P3 | Y | Rules step | default | baseline | 002 Deviations S4, W4 |
| 002-S4.30 | A switched top-level AND/OR is marked with the badge on the first top-level connector | P3 | Y | Rules step | default | baseline | 002 Deviations S4, W4 |
| 002-S4.31 | Show the link icon on every linked rule or on none, consistently | P3 | Y | Rules step | default | baseline | 002 Also from the audit, FYI #10 |
| 002-S5.1 | The dialog summarises the documents and, for each branch, its rules | P4 | Y | Publish dialog | default | baseline | 002 §S5 Publish and save dialog; 002-FR-028 |
| 002-S5.2 | "Publishing…", then the details | P4 | Y | Publish dialog | loading | baseline, copy | 002 §S5 |
| 002-S5.3 | On failure, "Couldn't publish" with "Try again", and nothing has changed | P4 | Y | Publish dialog | error | baseline, copy | 002 §S5; Deviations S5 W7 |
| 002-S5.4 | On 409 rules_changed the dialog says another member saved, with the API's message naming affected branches | P4 | Y | Publish dialog | error | baseline, copy:server | 002 §S5; Deviations S5 W9 |
| 002-S5.5 | It offers "Reload" (fetch again, drop unsaved changes) and "Replace their changes" (save with replace) | P4 | Y | Publish dialog | error | baseline, copy | 002 §S5; Deviations S5 W9 |
| 002-S5.6 | From the documents step while no branch has rules: "Publish without rules?" | P4 | Y | Publish dialog | default | baseline, copy | 002 §S5 |
| 002-S5.7 | No go-live date: publishing goes live at once | P4 | Y | Publish dialog | default | baseline | 002 §S5 |
| 002-S5.8 | Not built: "Now / On a date", "Schedule", the "Scheduled" status and screen, the "Goes live …" chip | P4 | Y | Publish dialog | default | baseline, not built | 002 Deviations S5, F22 |
| 002-S5.9 | No warnings line for problems: problems refuse publishing | P4 | Y | Publish dialog | default | baseline, not built | 002 Deviations S5, F21 |
| 002-S5.10 | Saving in the edit flow asks for confirmation in this dialog, not on entry | P4 | Y | Publish dialog | default | baseline | 002 Deviations S5, W7 |
| 002-S6.1 | Trigger URL once, one pull URL per branch labelled with its name and (i), each with "Copy link" | P4 | Y | Details | default | baseline, copy | 002 §S6 Details; 002-FR-026 |
| 002-S6.2 | A connection with only the main branch shows its URLs as spec 001, no branch name or (i) | P4 | Y | Details | default | baseline | 002 §S6; Deviations S6 W2 |
| 002-S6.3 | Rules in a collapsible card, collapsed by default ("View summary" / "Hide summary") | P4 | Y | Details | default | baseline, copy | 002 §S6; Also from the audit FYI #17 |
| 002-S6.4 | One read-only section per branch, rules step layout: names, statements, groups with AND/OR and own messages | P4 | Y | Details | default | baseline | 002 §S6; Deviations S6 F26 |
| 002-S6.5 | The sections show the marks with the removed items | P4 | Y | Details | default | baseline | 002 §S6 |
| 002-S6.6 | Changing the rules leads to the Rules step of the edit wizard | P4 | Y | Details | default | baseline | 002 §S6; 002-FR-030 |
| 002-S6.7 | No "Goes live" chip, no change-date action; the connection actions ⋮ lose their go-live item | P4 | Y | Details | default | baseline, not built | 002 Deviations S6, F22 |
| 002-S6.8 | Main branch keeps its pull URL; other branches' URLs use an identifier fixed at adding, never the name | P4 | Y | Details | default | baseline | 002 Deviations S6, F24 |
| 002-S6.9 | Not built: "Live since", counters, "Download PDF", Activity / "Last edited by", a "✓ Copied" button | P4 | Y | Details | default | baseline, not built | 002 Deviations S6, F25 |
| 002-S6.10 | The closed rules card shows counts of variants and rules: "3 variants · 6 rules" | P4 | Y | Details | default | baseline, copy | 002 Deviations S6, F25 |
| 002-S6.11 | The branch (i) after its name in each rules section heading, pull URL label, and post-publish URLs | P4 | Y | Details | default | baseline | 002 Deviations S6, F31 |
| 002-S6.12 | A read-only identifier (rule-7, group-3) next to each rule, group and sub-group name | P4 | Y | Details | default | baseline | 002 Deviations S6, W1 |
| 002-S6.13 | A truncated URL still copies in full | P4 | Y | Details | default | baseline | 002 Also from the audit, FYI #13 |
| 002-S7.1 | The create wizard's steps, with "Save" as the primary action | P4 | Y | Edit flow | default | baseline, copy | 002 §S7 Edit flow |
| 002-S7.2 | Opened from the details at the Rules step or at the start | P4 | Y | Edit flow | default | baseline | 002 §S7 |
| 002-S7.3 | No confirmation on entry ("Edit this live connection?" not built); the save dialog asks before saving | P4 | Y | Edit flow | default | baseline, not built | 002 §S7; Deviations S6, S7 F27 |
| 002-S7.4 | Requests already in progress keep their rules | P4 | N | Edit flow | ? | baseline | 002 §S7 |
| 002-ACC.1 | Branch marks are never colour alone: each has its text, such as "Changed here" | - | Y | Rules step | default | baseline | 002 §Accessibility |
| 002-ACC.2 | AND/OR connectors are buttons whose accessible name says the level they switch | - | Y | Rules step | default | baseline | 002 §Accessibility |
| 002-ACC.3 | The (i) tooltips open on keyboard focus and are announced | - | Y | Variant tabs | default | baseline | 002 §Accessibility |
| 002-ACC.4 | Menus, the tab menu and the select mode work with the keyboard | - | Y | Rules step | default | baseline | 002 §Accessibility |
| 003-S2.1 | A rule with a finding is outlined and has a note under it | P3 | Y | Rules step | default | baseline | 003 §S2; 003-FR-012, A3 |
| 003-S2.2 | Note layout: a 20 px kind icon, then text in body/small regular and the default text colour | P3 | Y | Rules step | default | baseline | 003 §S2; A3 |
| 003-S2.3 | A conflict has the warning triangle; a duplicate, covered or always-met rule the info icon | P3 | Y | Rules step | default | baseline | 003 §S2 |
| 003-S2.4 | The note says what is wrong in plain words, without a visible kind label | P3 | Y | Rules step | default | baseline, copy:findings | 003 §S2; A3 |
| 003-S2.5 | The icon carries a visually hidden kind text ("Conflicting:", "Redundant:", "Always met:") | P3 | Y | Rules step | default | baseline, copy:findings | 003 §S2 |
| 003-S2.6 | The note names items by their current names; the row is described by its note | P3 | Y | Rules step | default | baseline | 003 §S2; 003-FR-011 |
| 003-S2.7 | Outlines: 1 px, radius 8, all round, warning colour for conflicts, info colour otherwise | P3 | Y | Rules step | default | baseline | 003 §S2; A4 |
| 003-S2.8 | A group's outline replaces its left border | P3 | Y | Rules step | default | baseline | 003 §S2; A4 |
| 003-S2.9 | A group or sub-group with a finding is outlined, its note under its header | P3 | Y | Rules step | default | baseline | 003 §S2; A5 |
| 003-S2.10 | Rules inside a duplicate, covered or always-met group stay plain; inside a conflicting group they keep notes | P3 | Y | Rules step | default | baseline | 003 §S2; A5 |
| 003-S2.11 | Spec 002's problems keep their red outline and note; such a rule carries no finding and isn't counted | P3 | Y | Rules step | error | baseline | 003 §S2; W11 |
| 003-S2.12 | One findings banner at the top of the open variant's rules card, below the link strip in a based variant | P3 | Y | Rules step | default | baseline | 003 §S2; 003-FR-013, A1 |
| 003-S2.13 | Banner kind: warning with a conflict or when no applicant can meet the variant, info otherwise | P3 | Y | Rules step | default | baseline | 003 §S2 |
| 003-S2.14 | Banner single (one line, no chevron) or collapsed (counts row and chevron, default with two or more lines) | P3 | Y | Rules step | default | baseline | 003 §S2 |
| 003-S2.15 | Expanded: counts row, one finding item per line, then the notice and the incomplete sentence | P3 | Y | Rules step | default | baseline | 003 §S2; A2 |
| 003-S2.16 | Names in each line are links: scroll the item into view, move the focus to its row or header | P3 | Y | Rules step | default | baseline | 003 §S2 |
| 003-S2.17 | The notice and the incomplete sentence have no link | P3 | Y | Rules step | default | baseline | 003 §S2 |
| 003-S2.18 | No banner before the first check, for a variant without checked rules, or without findings | P3 | Y | Rules step | empty | baseline | 003 §S2; W13 |
| 003-S2.19 | After every rules change, documents step included, notes, banner and tab icons update in place | P3 | Y | Rules step | default | baseline | 003 §S2; 003-FR-011, W1 |
| 003-S2.20 | The previous notes stay until the new ones arrive | P3 | Y | Rules step | loading | baseline | 003 §S2 |
| 003-S2.21 | A hidden polite role="status" region announces each changed finding without moving the focus | P3 | Y | Rules step | default | baseline | 003 §S2; 003-FR-015 |
| 003-S2.22 | Publish and Save stay enabled whatever the findings; only spec 002's problems refuse them | P3 | Y | Rules step; Publish dialog | default | baseline | 003 §S2; A8 |
| 003-S2.23 | The banner replaces the summary alert and "Go to next finding" | P3 | Y | Rules step | default | baseline | 003 Items from the audit, S2 A1 |
| 003-S2.24 | Findings for today only: "… at the moment.", "Right now, no applicant can meet the rules of <variant>." | P3 | Y | Rules step | default | baseline, copy:findings | 003 Items from the audit, S2 A7 |
| 003-S3.1 | The rule editor shows nothing about findings; a new rule is checked once it is added | P3 | Y | Rule editor | default | baseline | 003 §S3; W15 |
| 003-S4.1 | Each variant is checked on its own, with the rules it inherits, changes and adds | P3 | Y | Rules step | default | baseline | 003 §S4; 003-FR-001 |
| 003-S4.2 | Tab icon after the name, merged with the description (i): warning triangle or info icon | P3 | Y | Variant tabs | default | baseline, amends 002-S4.2 | 003 §S4; A6 |
| 003-S4.3 | No icon without findings and without a description | P3 | Y | Variant tabs | default | baseline | 003 §S4 |
| 003-S4.4 | Its accessible name is "<variant> has findings" when the variant has findings | P3 | Y | Variant tabs | default | baseline, copy:findings | 003 §S4; §Copy Tab |
| 003-S4.5 | Tooltip on hover and keyboard focus: the description, then below a divider the findings segment with kind icon | P3 | Y | Variant tabs | default | baseline | 003 §S4; W20 |
| 003-S4.6 | A rule removed in a based variant shows the removed state and no note; checked again once restored | P3 | Y | Rules step | default | baseline | 003 §S4; W9 |
| 003-S4.7 | A conflict among inherited rules shows in both variants | P3 | Y | Rules step | default | baseline | 003 §S4; W9 |
| 003-S5.1 | One line per variant with findings, in tab order: "<variant>: <counts row>" | P4 | Y | Publish dialog | default | baseline, copy:findings | 003 §S5; W10 |
| 003-S5.2 | A variant no applicant can meet adds "No applicant can meet the rules of Ambulance." | P4 | Y | Publish dialog | default | baseline, copy:findings | 003 §S5 |
| 003-S5.3 | Lines with a conflict use the warning style, the others the info style | P4 | Y | Publish dialog | default | baseline | 003 §S5 |
| 003-S5.4 | Without findings the dialog is as in spec 002; Publish and Save go ahead without a further question | P4 | Y | Publish dialog | default | baseline | 003 §S5 |
| 003-S6.1 | Details show no findings, no banner and no findings icons | P4 | Y | Details | default | baseline | 003 §S6; 003-FR-020 |
| 003-S7.1 | The edit flow's rules step looks as in create and checks the published rules when it opens | P4 | Y | Edit flow | default | baseline | 003 §S7; W14 |
| 003-ACC.1 | The kind never rests on colour alone: icons differ in shape, hidden kind text, note says what's wrong | - | Y | Rules step | default | baseline | 003 §Accessibility |
| 003-ACC.2 | The banner's chevron is a button, "Show findings" / "Hide findings", with aria-expanded | - | Y | Rules step | default | baseline, copy | 003 §Accessibility; §Copy Buttons |
| 003-ACC.3 | Each name link moves the focus to a focusable row or group header, which its note describes | - | Y | Rules step | default | baseline | 003 §Accessibility |
| 003-ACC.4 | Icons and outlines reach 3:1 and texts 4.5:1 | - | Y | Rules step | default | baseline | 003 §Accessibility |
| 003-ACC.5 | The status region is polite, never takes the focus, and announces one change's sentences together | - | Y | Rules step | default | baseline | 003 §Accessibility |
| 003-ACC.6 | The banner, notes and tooltip reflow at 320 px and 200 % zoom | - | Y | Rules step | default | baseline | 003 §Accessibility |
| 003-CP.1 | Note: "Can't be met together with <items>." (today: "… at the moment.") | P3 | Y | Rules step | default | baseline, copy:findings | 003 §Copy Notes |
| 003-CP.2 | Note: "<items> in this group can't be met together." | P3 | Y | Rules step | default | baseline, copy:findings | 003 §Copy Notes |
| 003-CP.3 | Note: "No applicant can meet this rule." | P3 | Y | Rules step | default | baseline, copy:findings | 003 §Copy Notes |
| 003-CP.4 | Note: "Same as <item>. You can delete one of them." | P3 | Y | Rules step | default | baseline, copy:findings | 003 §Copy Notes |
| 003-CP.5 | Note: "Anyone who meets <items> also meets this rule. You can delete the rule." (group variant too) | P3 | Y | Rules step | default | baseline, copy:findings | 003 §Copy Notes |
| 003-CP.6 | Note: "Anyone who meets this rule also meets <items>. You can delete the rule." | P3 | Y | Rules step | default | baseline, copy:findings | 003 §Copy Notes |
| 003-CP.7 | Note: "Every applicant meets this rule." / "… this group." | P3 | Y | Rules step | default | baseline, copy:findings | 003 §Copy Notes |
| 003-CP.8 | Banner lines: "<items> can't be met together.", "<group>: <items> can't be met together." | P3 | Y | Rules step | default | baseline, copy:findings | 003 §Copy Banner lines |
| 003-CP.9 | Banner lines: "<item> is the same as <y>.", "Anyone who meets <items> also meets <item>." | P3 | Y | Rules step | default | baseline, copy:findings | 003 §Copy Banner lines |
| 003-CP.10 | Banner lines: "Every applicant meets <item>, so it doesn't check anything.", "No applicant can meet <rule>." | P3 | Y | Rules step | default | baseline, copy:findings | 003 §Copy Banner lines |
| 003-CP.11 | Counts row: "2 rules can't be met together · 1 duplicate rule" | P3 | Y | Rules step; Publish dialog | default | baseline, copy:findings | 003 §Copy Counts row |
| 003-CP.12 | Counts: "1 rule can't be met", "1 rule already covered", "1 group every applicant meets" | P3 | Y | Rules step; Publish dialog | default | baseline, copy:findings | 003 §Copy Counts row |
| 003-CP.13 | Notices: "So no applicant can meet the rules of <variant>." after a line; "No applicant can meet …" alone | P3 | Y | Rules step | default | baseline, copy:findings | 003 §Copy Notices |
| 003-CP.14 | Notices: "Right now, no applicant can meet the rules of <variant>.", "Every applicant meets the rules of <variant>." | P3 | Y | Rules step | default | baseline, copy:findings | 003 §Copy Notices |
| 003-CP.15 | Incomplete: "The rules of <variant> couldn't be checked completely. Only findings that are certain are shown." | P3 | Y | Rules step | default | baseline, copy:findings | 003 §Copy Incomplete |
| 003-CP.16 | Tab tooltip segment: "1 duplicate: <line>" or the counts row | P3 | Y | Variant tabs | default | baseline, copy:findings | 003 §Copy Tab |
| 003-CP.17 | Announcements: "Rule 02 conflicts with Rule 01.", "Rule 06 is the same as Rule 03.", … | P3 | Y | Rules step | default | baseline, copy:findings | 003 §Copy Announcements |
| 003-CP.18 | Announcements: "Rule 02 no longer conflicts with Rule 01.", "Rule 06 is no longer redundant.", … | P3 | Y | Rules step | default | baseline, copy:findings | 003 §Copy Announcements |
| 004-S0.1 | Progress has five entries: Connection, Documents, Rules, Test, Publish; the test step current while shown | P2 | Y | Wizard shell | default | baseline, copy | 004 §S0; 004-FR-001 |
| 004-S0.2 | Finished steps lead back | P2 | Y | Wizard shell | default | baseline | 004 §S0 |
| 004-S0.3 | Not built: Figma's compact "Step 4 of 4" header; the progress with five entries stays | P2 | Y | Wizard shell | default | baseline, not built | 004 §S0; Items from the audit O2 |
| 004-S0.4 | Not built: the redesign's "Live" and "Unpublished changes" badges | P2 | Y | Wizard shell | default | baseline, not built | 004 Out of scope O1 |
| 004-S1.1 | "Publish without rules" ("Save without rules") while no branch has a rule skips the rules and test steps | P2 | Y | Documents step | default | baseline, copy | 004 §S1; W2 |
| 004-S2.1 | One button to go on: "Test rules" (primary, forward arrow) while any branch has a rule or an editor is open | P3 | Y | Rules step | default | baseline, copy, supersedes 002 §S2 Footer and F10 label | 004 §S2; W2 |
| 004-S2.2 | Otherwise "Publish without rules" ("Save without rules"), opening the publish dialog and skipping the test step | P3 | Y | Rules step | empty | baseline, copy | 004 §S2; W2 |
| 004-S2.3 | No "Publish" or "Save" on the rules step any more | P3 | Y | Rules step | default | baseline | 004 §S2 |
| 004-S2.4 | With unsaved editor changes, "Test rules" first asks "Save changes to Rule 01?" | P3 | Y | Rules step; Save changes dialog | default | baseline, copy, supersedes 002 §S2 (Publish/Save ask first) | 004 §S2; W8 |
| 004-S2.5 | If the answer leaves no rule, the member stays in the rules step, button "Publish without rules" | P3 | Y | Rules step | default | baseline | 004 §S2 |
| 004-S2.6 | "Test rules" refused with publishing's message, where publishing shows it, naming rule and variant; focus moves | P3 | Y | Rules step | error | baseline, copy:server | 004 §S2; W3 |
| 004-S2.7 | Refused while a rule is incomplete, has no message, checks unrequested data, or a variant name is invalid | P3 | Y | Rules step | error | baseline | 004 §S2 |
| 004-S5.1 | Opened from the test step by "Publish" ("Save"), unchanged: "Ready to publish?" or "Ready to save?" | P4 | Y | Publish dialog | default | baseline, copy | 004 §S5 |
| 004-S5.2 | "Check rules again" closes the dialog, opens the rules step at the first variant with findings, else the open one | P4 | Y | Publish dialog | default | baseline, copy, supersedes 003 §S5 "Check rules again" | 004 §S5 |
| 004-S5.3 | Figma's "Back to test" isn't built | P4 | Y | Publish dialog | default | baseline, not built | 004 §S5; F4 |
| 004-S5.4 | The personas' results add nothing to the dialog and refuse, delay or disable nothing | P4 | Y | Publish dialog | default | baseline | 004 §S5 |
| 004-S5.5 | A failed publish or save closes nothing: the test step and its personas stay | P4 | Y | Publish dialog; Test step | error | baseline | 004 §S5 |
| 004-S7.1 | The test step's primary button reads "Save", not "Publish changes" with an arrow | P4 | Y | Edit flow; Test step | default | baseline, copy | 004 §S7; F13 |
| 004-S7.2 | The failure hint reads "Try again, or save without testing." | P4 | Y | Edit flow; Test step | error | baseline, copy:rules | 004 §S7 |
| 004-S7.3 | Not built: U10's clickable step bar | P4 | Y | Edit flow | default | baseline, not built | 004 Out of scope O5 |
| 004-S8.1 | The step sits in the wizard frame under the page title "Test rules" and its intro hint | P3 | Y | Test step | default | baseline, copy | 004 §S8 |
| 004-S8.2 | Intro: "Choose a sample applicant to see which rules they meet … The data is made up, and nothing is shared." | P3 | Y | Test step | default | baseline, copy | 004 §S8; §Copy |
| 004-S8.3 | Action bar: Back (to the rules step) and "Publish" ("Save" when editing); neither waits for generation | P3 | Y | Test step | default | baseline, copy | 004 §S8 |
| 004-S8.4 | The step exists only in the signed-in editor | P3 | N | Test step | ? | baseline | 004 Items from the audit, W13 |
| 004-S8.5 | A later flow opens with frame 18's loading and three new personas | P3 | Y | Test step | loading | baseline | 004 Items from the audit, W7 |
| 004-S8.1.1 | "Tested as if shared today, 1 Nov 2026.", today's date in Germany, first line under the intro | P3 | Y | Test step | default | baseline, copy:rules | 004 §S8.1; W1 |
| 004-S8.1.2 | Shown whenever results are, also during one persona's regeneration; hidden in first generation and failure | P3 | Y | Test step | loading | baseline | 004 §S8.1 |
| 004-S8.2.1 | One tab per variant, rules step order; the rules step's open variant selected on opening | P3 | Y | Test step | default | baseline | 004 §S8.2 |
| 004-S8.2.2 | A variant no applicant can meet carries a warning icon after its name | P3 | Y | Test step | default | baseline | 004 §S8.2; F6 |
| 004-S8.2.3 | Its tooltip shows "No applicant can meet the rules of Standard.", on keyboard focus and hover | P3 | Y | Test step | default | baseline, copy:findings | 004 §S8.2; F6 |
| 004-S8.2.4 | The tab uses BranchName, with the description's (i) and this one finding segment | P3 | Y | Test step | default | baseline | 004 §S8.2 |
| 004-S8.2.5 | Changing the tab keeps the selected persona | P3 | Y | Test step | default | baseline | 004 §S8.2 |
| 004-S8.2.6 | Not built: the Standard tab's info icon and "What is a variant" tooltip | P3 | Y | Test step; Variant tabs | default | baseline, not built | 004 Out of scope O4 |
| 004-S8.3.1 | Three chips with name and outcome icon: check circle when met, warning diamond when not | P3 | Y | Test step | default | baseline | 004 §S8.3 |
| 004-S8.3.2 | Chips show no outcome text; accessible name "Mia Schulz: meets the rules of Standard" / "doesn't meet …" | P3 | Y | Test step | default | baseline, copy:rules | 004 §S8.3 |
| 004-S8.3.3 | One chip is selected, the first by default | P3 | Y | Test step | default | baseline | 004 §S8.3 |
| 004-S8.3.4 | "Generate all again": tertiary button with refresh icon at the row's right end | P3 | Y | Test step | default | baseline, copy | 004 §S8.3; W9 |
| 004-S8.3.5 | With persona changes it asks first (S8.7), without changes it doesn't; while running, S8.8's loading | P3 | Y | Test step | loading | baseline | 004 §S8.3 |
| 004-S8.4.1 | Head: "Mia's data", with "Edit data" (tertiary, pencil) and "Generate again" (tertiary, refresh) | P3 | Y | Test step | default | baseline, copy | 004 §S8.4 |
| 004-S8.4.2 | Values grouped under "Personal ID" and "Driving licence", in catalog order | P3 | Y | Test step | default | baseline, copy | 004 §S8.4; F9 |
| 004-S8.4.3 | Each row: the field's label as the rules name it, without the document ("Date of birth (Age)"), and value | P3 | Y | Test step | default | baseline | 004 §S8.4; F9 |
| 004-S8.4.4 | A date as dd.mm.yyyy; a date of birth with its age, "08.07.2007 (age 19)" | P3 | Y | Test step | default | baseline, copy:rules | 004 §S8.4; F10 |
| 004-S8.4.5 | Enums by their labels | P3 | Y | Test step | default | baseline | 004 §S8.4 |
| 004-S8.4.6 | "Licence classes" as codes in one row, "B, BE"; each checked class date in its own row while held | P3 | Y | Test step | default | baseline | 004 §S8.4; F11 |
| 004-S8.4.7 | An empty value shows as "Not shared" | P3 | Y | Test step | empty | baseline, copy | 004 §S8.4 |
| 004-S8.4.8 | Only data that evaluated rules check appears; rows follow the rules after returning from the rules step | P3 | Y | Test step | default | baseline | 004 §S8.4; W6 |
| 004-S8.4.9 | A failing value has Figma's red dot and bold text, with hidden text for screen readers | P3 | Y | Test step | default | baseline, copy:rules | 004 §S8.4; K1 |
| 004-S8.4.10 | "· edited" after a value that differs from its generated value, with hidden text | P3 | Y | Test step | default | baseline, copy | 004 §S8.4; K2 |
| 004-S8.4.11 | Only the panel scrolls; header, progress, tabs, applicants row and action bar stay put | P3 | Y | Test step | default | baseline | 004 §S8.4; K3 |
| 004-S8.5.1 | "Edit data" turns values into fields under the same headings and becomes "Done", which turns them back | P3 | Y | Test step | default | baseline, copy | 004 §S8.5; F1 |
| 004-S8.5.2 | No dialog, Cancel, Close, "Save and test", or intro "Results update when you save." | P3 | Y | Test step | default | baseline, not built | 004 §S8.5; F1 |
| 004-S8.5.3 | Fields: "Name", and one per shown value of its kind: text, whole number, date as dd.mm.yyyy | P3 | Y | Test step | default | baseline, copy | 004 §S8.5 |
| 004-S8.5.4 | One value of a set as a select of labels | P3 | Y | Test step | default | baseline | 004 §S8.5 |
| 004-S8.5.5 | Several values picked from a list: licence classes by code, nationalities by label | P3 | Y | Test step | default | baseline | 004 §S8.5; F12 |
| 004-S8.5.6 | The class date rows for held classes; "Age today" next to each date of birth | P3 | Y | Test step | default | baseline, copy | 004 §S8.5; F10 |
| 004-S8.5.7 | Given and family name as fields of their own under "Personal ID" when rules check them | P3 | Y | Test step | default | baseline | 004 §S8.5; W12 |
| 004-S8.5.8 | Every field can be cleared, which makes the value empty | P3 | Y | Test step | empty | baseline | 004 §S8.5 |
| 004-S8.5.9 | Every valid change applies at once, and the results next to it update | P3 | Y | Test step | default | baseline | 004 §S8.5; 004-FR-017 |
| 004-S8.5.10 | An invalid field shows its error under it and keeps its last valid value; other changes apply | P3 | Y | Test step | error | baseline | 004 §S8.5; 004-FR-008 |
| 004-S8.5.11 | Errors: "Enter a date that exists, e.g. 28.02.2007.", "Enter a whole number, e.g. 25.", "Enter a name." | P3 | Y | Test step | error | baseline, copy | 004 §S8.5; W11 |
| 004-S8.5.12 | Removing class B hides its date rows; its rule reports "Not met" or "Couldn't be checked" | P3 | Y | Test step | default | baseline | 004 §S8.5; W4 |
| 004-S8.5.13 | Adding class B again brings its earlier dates back | P3 | Y | Test step | default | baseline | 004 §S8.5; W4 |
| 004-S8.5.14 | Switching persona or variant ends edit mode | P3 | Y | Test step | default | baseline | 004 §S8.5 |
| 004-S8.6.1 | For a variant no applicant can meet, "No applicant can meet the rules of Standard." sits above the heading | P3 | Y | Test step | default | baseline, copy:findings | 004 §S8.6; F6 |
| 004-S8.6.2 | Heading "Result: meets the rules", or "Result: doesn't meet 2 rules" / "… 1 rule and 1 group" | P3 | Y | Test step | default | baseline, copy:rules | 004 §S8.6; W10 |
| 004-S8.6.3 | An unmet variant has two columns, "Rule" and "Message Mia reads" | P3 | Y | Test step | default | baseline, copy:rules | 004 §S8.6 |
| 004-S8.6.4 | Reported rules and groups first: name, statement, "Not met" or "Couldn't be checked" with own icon, message | P3 | Y | Test step | default | baseline, copy | 004 §S8.6; F8 |
| 004-S8.6.5 | Below a reported group, indented, its members not met or not checked, with name, statement, status | P3 | Y | Test step | default | baseline | 004 §S8.6; W10 |
| 004-S8.6.6 | Then every other top-level item; a met one has a check icon, name, statement and "–" as message | P3 | Y | Test step | default | baseline, copy | 004 §S8.6; F14 |
| 004-S8.6.7 | A met variant: "Result: meets the rules", list "Rules Mia meets", no message column, no success message | P3 | Y | Test step | success | baseline, copy:rules | 004 §S8.6; F3, F14 |
| 004-S8.6.8 | A variant without rules: "School transport has no rules yet, so every applicant meets it. Add rules …" | P3 | Y | Test step | empty | baseline, copy:rules | 004 §S8.6 |
| 004-S8.7.1 | One persona with changes: "Generate new data for Mia?", "Your changes to Mia's data will be replaced. …" | P3 | Y | Generate dialog | default | baseline, copy:rules | 004 §S8.7; U04 |
| 004-S8.7.2 | The questions' buttons are "Cancel" and "Generate new data" | P3 | Y | Generate dialog | default | baseline, copy | 004 §S8.7 |
| 004-S8.7.3 | All, with changes: "Generate new data for all applicants?", "Your changes to Mia's and Anna's data will be replaced." | P3 | Y | Generate dialog | default | baseline, copy:rules | 004 §S8.7; W9 |
| 004-S8.7.4 | Generating anew replaces the values and keeps the persona's name | P3 | Y | Test step | default | baseline | 004 §S8.7 |
| 004-S8.8.1 | First open, "Generate all again", "Try again": tabs and action bar real; three skeleton pills replace chips | P3 | Y | Test step | loading | baseline | 004 §S8.8; U11 |
| 004-S8.8.2 | Status "Creating 3 sample applicants…" (role="status") at the applicants row's right end | P3 | Y | Test step | loading | baseline, copy:rules | 004 §S8.8 |
| 004-S8.8.3 | Skeleton cards keep the layout, result rows have a statement placeholder; no editing, no test-day line | P3 | Y | Test step | loading | baseline | 004 §S8.8; F14 |
| 004-S8.8.4 | One persona: only its pill, data card and result card are skeletons, without "Edit data" or "Generate again" | P3 | Y | Test step | loading | baseline | 004 §S8.8 |
| 004-S8.8.5 | Status "Creating new data for Mia…"; the other personas stay usable; the test-day line shows | P3 | Y | Test step | loading | baseline, copy:rules | 004 §S8.8 |
| 004-S8.8.6 | Filling new data after returning from the rules step: as frame 19, per persona being filled | P3 | Y | Test step | loading | baseline, copy:rules | 004 §S8.8 |
| 004-S8.9.1 | Failure replaces the applicants row and panel: "Couldn't create sample applicants", "Try again, or publish without testing." | P3 | Y | Test step | error | baseline, copy, copy:rules | 004 §S8.9; U12 |
| 004-S8.9.2 | "Try again" generates all three anew with S8.8's loading state | P3 | Y | Test step | error | baseline, copy | 004 §S8.9 |
| 004-S8.9.3 | Figma's "Your rules are saved." isn't built | P3 | Y | Test step | error | baseline, not built | 004 §S8.9; F7 |
| 004-S8.9.4 | The tabs, Back and "Publish" / "Save" stay usable | P3 | Y | Test step | error | baseline | 004 §S8.9 |
| 004-S8.10.1 | A hidden polite role="status" region announces each outcome change of the edited persona, per variant | P3 | Y | Test step | default | baseline | 004 §S8.10 |
| 004-S8.10.2 | "Mia Schulz now meets the rules of Standard." / "Mia Schulz no longer meets the rules of Standard." | P3 | Y | Test step | default | baseline, copy:rules | 004 §S8.10 |
| 004-S8.10.3 | There is no visible toast | P3 | Y | Test step | default | baseline, not built | 004 §S8.10; F2 |
| 004-ACC.1 | Outcome never by colour alone: chip icons differ in shape; statuses are text; hidden text on values | - | Y | Test step | default | baseline | 004 §Accessibility |
| 004-ACC.2 | The variant tabs and the persona chips work by arrow keys | - | Y | Test step | default | baseline | 004 §Accessibility |
| 004-ACC.3 | Opening the step moves the focus to its heading, as every step does | - | Y | Test step | default | baseline | 004 §Accessibility |
| 004-ACC.4 | "Edit data" moves the focus to the first field, and "Done" back to "Edit data" | - | Y | Test step | default | baseline | 004 §Accessibility |
| 004-ACC.5 | Each error is tied to its field (aria-describedby, aria-invalid) | - | Y | Test step | error | baseline | 004 §Accessibility |
| 004-ACC.6 | The loading status and the announcements are polite and never move the focus | - | Y | Test step | loading | baseline | 004 §Accessibility |
| 005-R.1 | /form-connections/new writes its flow key as ?local=<flowKey> and opens from that key's local draft | P2 | Y | Wizard | default | baseline | 005 §Routes; R10 |
| 005-R.2 | /get-started also reads and writes ?local= | P2 | Y | First connection | default | baseline | 005 §Routes |
| 005-S0.1 | "Save and exit" in every step's footer: secondary, before the primary action, Back on the left | P2 | Y | Wizard shell | default | baseline, copy, supersedes 002 Deviations S0 F28 and 004 O3 | 005 §S0; 005-FR-001 |
| 005-S0.2 | On step 1, without Back, it stands before "Continue" | P2 | Y | Wizard shell | default | baseline, copy | 005 §S0 |
| 005-S0.3 | On documents and rules steps it sits beside "… without rules" and "Add rules" / "Test rules", in Figma's order | P2 | Y | Wizard shell | default | baseline | 005 §S0 |
| 005-S0.4 | Never disabled: while a save runs it is aria-disabled and reads "Saving…" | P2 | Y | Wizard shell | loading | baseline, copy | 005 §S0; W9 |
| 005-S0.5 | "Draft" badge in the header for a stored draft's flow only: KERN's small info badge with its icon | P2 | Y | Wizard shell | default | baseline, copy, supersedes 002 Deviations S0 F28 | 005 §S0; 005-FR-007 |
| 005-S0.6 | A new connection that was never saved has no badge | P2 | Y | Wizard shell | default | baseline | 005 §S0 |
| 005-S0.7 | The edit flow of a published connection has no "Save and exit" and no badge | P2 | Y | Edit flow | default | baseline | 005 §S0; 005-FR-026 |
| 005-S0.8 | A stored draft publishes with spec 004's "Publish" / "Publish without rules" and dialog; conflicts appear there | P2 | Y | Publish dialog | default | baseline | 005 §S0 |
| 005-S0.9 | A stored draft opens at its saved step, or the rules step if saved in the test step without rules | P2 | Y | Wizard | default | baseline | 005 §S0; 005-FR-008 |
| 005-S0.10 | If the catalog no longer offers some data, the flow moves to the documents step once loaded | P2 | Y | Wizard | default | baseline | 005 §S0; S8 |
| 005-S0.11 | On opening, the personas are generated anew and the rule checks run again | P2 | Y | Test step; Rules step | loading | baseline | 005 §S0 |
| 005-S1.1 | An open rule editor with changes asks "Save changes to Rule 01?" first; closing the dialog cancels the save | P2 | Y | Save changes dialog | default | baseline, copy | 005 §S1 |
| 005-S1.2 | Name missing or too long: flow goes to step 1, message under "Form name", field focused, nothing stored | P2 | Y | Step 1 Connection | error | baseline, copy | 005 §S1 |
| 005-S1.3 | Name messages: "Enter a name." / "The name can have at most 200 characters." | P2 | Y | Step 1 Connection | error | baseline, copy:server | 005 §S1 |
| 005-S1.4 | Saving: the button turns aria-disabled and says "Saving…", a polite status says "Saving draft…" | P2 | Y | Wizard shell | loading | baseline, copy | 005 §S1 |
| 005-S1.5 | Success: the local draft is removed; the overview opens with the polite status "Draft <name> saved." | P2 | Y | Overview | success | baseline, copy | 005 §S1; W1 |
| 005-S1.6 | Failure: the member stays in the flow with the work, and the local draft keeps it | P2 | Y | Wizard | error | baseline | 005 §S1; 005-FR-013 |
| 005-S1.7 | 400: KERN danger alert under the page title, "Couldn't save your draft", server's message; focus moves to it | P2 | Y | Wizard | error | baseline, copy, copy:server | 005 §S1; W3 |
| 005-S1.8 | Network or 5xx: the alert with "Couldn't save. Check your internet connection and try again.", error ID, "Try again" | P2 | Y | Wizard | error | baseline, copy, supersedes 002 Deviations S2 F23 | 005 §S1; W3 |
| 005-S1.9 | 401: spec 001's sign-out, then the sign-in; afterwards the flow's URL brings the work back | P2 | Y | Wizard | error | baseline | 005 §S1 |
| 005-S1.10 | The alert goes when the member saves again or changes step | P2 | Y | Wizard | error | baseline | 005 §S1 |
| 005-S2.1 | A conflict after "Save and exit" opens a ConfirmDialog-based conflict dialog | P2 | Y | Conflict dialog | error | baseline | 005 §S2; W4 |
| 005-S2.2 | After publishing, the publish dialog shows the same message and buttons in place of "Publish" | P2 | Y | Publish dialog | error | baseline | 005 §S2; W4 |
| 005-S2.3 | draft_changed: "This draft has changed", server's message, "Reload shows the draft as it was last saved …" | P2 | Y | Conflict dialog | error | baseline, copy, copy:server | 005 §S2 |
| 005-S2.4 | draft_changed buttons "Reload", "Replace their changes", "Cancel"; in the publish dialog "Replace" publishes | P2 | Y | Conflict dialog | error | baseline, copy | 005 §S2 |
| 005-S2.5 | draft_published: "This draft has been published", server's message, "Your changes weren't saved. Open the connection to see it." | P2 | Y | Conflict dialog | error | baseline, copy, copy:server | 005 §S2 |
| 005-S2.6 | draft_published buttons: "Open the connection" (primary), "Cancel" | P2 | Y | Conflict dialog | error | baseline, copy | 005 §S2 |
| 005-S2.7 | draft_deleted (404): "This draft has been deleted", "… since you opened it. Save your work as a new draft …" | P2 | Y | Conflict dialog | error | baseline, copy | 005 §S2 |
| 005-S2.8 | draft_deleted buttons: "Save as new draft" (primary), "Cancel" | P2 | Y | Conflict dialog | error | baseline, copy | 005 §S2 |
| 005-S2.9 | "Reload" fetches the draft, opens its stored step with focus on the page title, removes the local draft | P2 | Y | Conflict dialog | default | baseline | 005 §S2 |
| 005-S2.10 | "Replace their changes" sends again with replace: true; another conflict shows that conflict | P2 | Y | Conflict dialog | default | baseline | 005 §S2 |
| 005-S2.11 | "Open the connection" removes the local draft and opens the published connection's details | P2 | Y | Conflict dialog | default | baseline | 005 §S2 |
| 005-S2.12 | "Save as new draft" creates a new draft, removes the old local draft, continues as a successful save | P2 | Y | Conflict dialog | success | baseline | 005 §S2 |
| 005-S2.13 | "Cancel" closes the dialog; the member stays in the flow with the work | P2 | Y | Conflict dialog | default | baseline | 005 §S2 |
| 005-S3.1 | Drafts are listed with the published connections, ordered by their last save | P1 | Y | Overview | default | baseline | 005 §S3 |
| 005-S3.2 | The status column shows KERN's small info badge "Draft" with its icon | P1 | Y | Overview | default | baseline, copy | 005 §S3 |
| 005-S3.3 | The date reads "Saved 4 Nov 2026" for a draft, "Edited …" for a published connection | P1 | Y | Overview | default | baseline, copy | 005 §S3 |
| 005-S3.4 | Draft row actions: "Continue" (edit route, stored step) and "View" (details); no "Edit" for a draft | P1 | Y | Overview | default | baseline, copy | 005 §S3 |
| 005-S3.5 | Each row action names the connection for screen readers, as "Edit" and "View" do | P1 | Y | Overview | default | baseline | 005 §S3; §Accessibility |
| 005-S3.6 | Hint "Pick up your draft or connect another form." while a stored or local draft exists | P1 | Y | Overview | default | baseline, copy | 005 §S3 |
| 005-S3.7 | Otherwise the hint "Open a connection to copy its links, or connect another form." | P1 | Y | Overview | default | baseline, copy | 005 §S3 |
| 005-S3.8 | "Draft saved" status: a polite live region under the page title, gone at the next navigation | P1 | Y | Overview | success | baseline | 005 §S3; W1 |
| 005-S3.9 | The list counts drafts: a team whose only connection is a draft lands on the overview | P1 | Y | Overview; First connection | default | baseline, amends 001-S4.4 | 005 §S3; 005-FR-011 |
| 005-S4.1 | Section above the overview's list and above step 1's card on /get-started, while local drafts exist | P1 | Y | Local drafts offer | default | baseline | 005 §S4; W5 |
| 005-S4.2 | Heading (h2) "Unsaved work on this device", text "These changes weren't saved. Resume to go on, or discard them." | P1 | Y | Local drafts offer | default | baseline, copy | 005 §S4 |
| 005-S4.3 | One item per local draft, newest first, as a list | P1 | Y | Local drafts offer | default | baseline | 005 §S4 |
| 005-S4.4 | Each item shows the name, or "Untitled connection" without one | P1 | Y | Local drafts offer | default | baseline, copy | 005 §S4 |
| 005-S4.5 | Line "New connection · Last change 4 Nov 2026, 14:32" or "Draft · Last change …" | P1 | Y | Local drafts offer | default | baseline, copy | 005 §S4 |
| 005-S4.6 | "Resume": a link to /form-connections/new?local=<flowKey>, opening the flow at its step with its content | P1 | Y | Local drafts offer | default | baseline, copy | 005 §S4 |
| 005-S4.7 | "Discard" asks first; both actions name the connection for screen readers | P1 | Y | Local drafts offer | default | baseline, copy | 005 §S4 |
| 005-S4.8 | Discard dialog: "Discard unsaved work?" / "The unsaved changes to <name> will be deleted from this device. …" | P1 | Y | Discard dialog | default | baseline, copy | 005 §S4 |
| 005-S4.9 | For a stored draft it adds "The saved draft stays as it is."; buttons "Discard" (danger), "Cancel" | P1 | Y | Discard dialog | default | baseline, copy | 005 §S4 |
| 005-S4.10 | Afterwards the item goes, status "Unsaved work discarded.", focus to the next "Resume" or the heading | P1 | Y | Local drafts offer | success | baseline, copy | 005 §S4 |
| 005-S4.11 | On /get-started, the flow's own local draft isn't listed | P1 | Y | First connection | default | baseline | 005 §S4 |
| 005-S4.12 | The section reflects writes and discards made in other tabs | P1 | Y | Local drafts offer | default | baseline | 005 §S4 |
| 005-S4.13 | Without storage the section doesn't show | P1 | Y | Local drafts offer | empty | baseline | 005 §S4; 005-FR-021 |
| 005-S5.1 | A draft whose local draft differs opens a dialog before the flow, in the wizard frame with the badge | P2 | Y | Restore dialog | default | baseline | 005 §S5; W6 |
| 005-S5.2 | "Restore your unsaved changes?" / "This device has changes to <name> from 4 Nov 2026, 14:32 that weren't saved." | P2 | Y | Restore dialog | default | baseline, copy | 005 §S5 |
| 005-S5.3 | "Restore changes" (primary) opens the flow with the local content and step, at its loaded version | P2 | Y | Restore dialog | default | baseline, copy | 005 §S5 |
| 005-S5.4 | "Discard them" (secondary) removes the local draft and opens the stored draft | P2 | Y | Restore dialog | default | baseline, copy | 005 §S5 |
| 005-S5.5 | Escape closes the dialog and opens the draft's details, keeping the local draft for next time | P2 | Y | Restore dialog | default | baseline | 005 §S5 |
| 005-S6.1 | Header: the name as the page's h1 and the "Draft" badge | P4 | Y | Draft details | default | baseline, copy | 005 §S6; W7 |
| 005-S6.2 | Progress: Publish current; steps up to the stored step reached and lead to the flow at that step | P4 | Y | Draft details | default | baseline | 005 §S6 |
| 005-S6.3 | The steps between are to do and aren't links (interim look until Figma has a design) | P4 | Y | Draft details | default | baseline | 005 §S6 |
| 005-S6.4 | Info alert "This draft isn't live. Its connection links appear once you publish it."; no connection URLs | P4 | Y | Draft details | default | baseline, copy | 005 §S6; 005-FR-006 |
| 005-S6.5 | Documents and rules cards show what the draft holds, incomplete parts included | P4 | Y | Draft details | default | baseline | 005 §S6 |
| 005-S6.6 | A document without fields reads "No data chosen yet"; no documents reads "No documents yet" | P4 | Y | Draft details | empty | baseline, copy | 005 §S6 |
| 005-S6.7 | A rule missing data, check or message shows the rules step's placeholders; no variant shows a result link | P4 | Y | Draft details | empty | baseline | 005 §S6 |
| 005-S6.8 | Draft card in place of the status card: "Draft", "Saved 4 Nov 2026, 14:32. Continue to finish and publish it." | P4 | Y | Draft details | default | baseline, copy | 005 §S6 |
| 005-S6.9 | Draft card: "Continue" (primary) to the stored step, "Delete draft" (tertiary, delete icon); no deactivate or reactivate | P4 | Y | Draft details | default | baseline, copy | 005 §S6 |
| 005-S6.10 | Delete dialog: "Delete this draft?" / "<name> will be deleted for good. It was never live, …" | P4 | Y | Delete draft dialog | default | baseline, copy | 005 §S6 |
| 005-S6.11 | Buttons "Delete draft" (danger) and "Cancel"; on success the overview opens | P4 | Y | Delete draft dialog | success | baseline, copy | 005 §S6 |
| 005-S6.12 | 409 draft_published shows "This draft has been published since you opened it." with "Open the connection" | P4 | Y | Delete draft dialog | error | baseline, copy | 005 §S6 |
| 005-S6.13 | A 404 says it was already deleted, and leads to the overview | P4 | Y | Delete draft dialog | error | baseline | 005 §S6 |
| 005-S6.14 | Footer: "Continue" in place of "Edit documents", and "Create new connection" | P4 | Y | Draft details | default | baseline, copy | 005 §S6 |
| 005-S7.1 | "Log out" in the user menu first flushes pending writes | P1 | Y | User menu | default | baseline | 005 §S7 |
| 005-S7.2 | With local drafts, a ConfirmDialog asks "Log out and discard unsaved work?" | P1 | Y | Log out dialog | default | baseline, copy | 005 §S7; W8 |
| 005-S7.3 | "Logging out deletes the unsaved changes on this device to: <name>, …", at most 5, then "and 3 more" | P1 | Y | Log out dialog | default | baseline, copy | 005 §S7 |
| 005-S7.4 | Then "Saved drafts stay as they are."; buttons "Log out" (danger) and "Cancel" | P1 | Y | Log out dialog | default | baseline, copy | 005 §S7 |
| 005-S7.5 | "Cancel" returns the focus to the user menu's button | P1 | Y | Log out dialog | default | baseline | 005 §S7 |
| 005-S7.6 | Without local drafts, "Log out" signs out at once; an expired session never shows the dialog | P1 | Y | User menu | default | baseline | 005 §S7 |
| 005-S8.1 | Data the catalog no longer offers: a KERN warning alert at the top of the documents step lists it | P2 | Y | Documents step | error | baseline | 005 §S8; W10 |
| 005-S8.2 | Title "The wallet no longer offers some data of this draft" | P2 | Y | Documents step | error | baseline, copy | 005 §S8 |
| 005-S8.3 | The list: "Personal ID – Eye colour", or a whole document such as "Residence permit" | P2 | Y | Documents step | error | baseline | 005 §S8 |
| 005-S8.4 | "Remove it" removes all at once; rules that check it are named first via the removal dialog | P2 | Y | Documents step | error | baseline, copy | 005 §S8 |
| 005-S8.5 | A draft opening on another step moves to the documents step; the note takes the focus, once per opening | P2 | Y | Documents step | error | baseline | 005 §S8 |
| 005-S8.6 | "Save and exit" and publishing are refused while it remains, with the server's message | P2 | Y | Wizard; Publish dialog | error | baseline, copy:server | 005 §S8 |
| 005-S8.7 | The step's cards show only what the catalog offers | P2 | Y | Documents step | default | baseline | 005 §S8 |
| 005-ACC.1 | Every draft mark is text with an icon (KERN badge), never colour alone | - | Y | Overview; Wizard shell; Draft details | default | baseline | 005 §Accessibility |
| 005-ACC.2 | Dialogs: native modal, focus inside, Escape closes, focus returns to the opening control | - | Y | dialogs | default | baseline | 005 §Accessibility |
| 005-ACC.3 | Status messages are polite live regions; alerts that refuse something take the focus | - | Y | all screens | ? | baseline | 005 §Accessibility |
| 005-ACC.4 | At 320 px and 200 % the footer's three actions wrap, and "Save and exit" keeps its label | - | Y | Wizard shell | default | baseline | 005 §Accessibility |
| 005-CP.1 | Dates use the overview's format ("4 Nov 2026"), with 24-hour browser-time "14:32" where the copy says so | - | Y | all screens | ? | baseline, copy | 005 §Copy |
| 006-S0.1 | Every place that showed the form ID shows the description; no screen says "Form ID" any more | - | Y | Step 1; Overview; Details | default | baseline, copy, supersedes 001 §S3, §S5, §S6 serviceBW form | 006 §S0 (preamble); 006-FR-001 |
| 006-S1.1 | Same card, place and width (md:w-320) as before; a single-line input | P2 | Y | Step 1 Connection | default | baseline | 006 §S1 Step 1 |
| 006-S1.2 | Label "Description" with the "- Optional" marker | P2 | Y | Step 1 Connection | default | baseline, copy | 006 §S1 |
| 006-S1.3 | The input isn't required, has spell check on and at most 500 characters | P2 | Y | Step 1 Connection | default | baseline | 006 §S1 |
| 006-S1.4 | Info tooltip label "About the description" | P2 | Y | Step 1 Connection | default | baseline, copy | 006 §S1 |
| 006-S1.5 | Tooltip text "A note for your team, such as the form's ID in your form management system. Applicants never see it." | P2 | Y | Step 1 Connection | default | baseline, copy | 006 §S1 |
| 006-S1.6 | Placeholder "e.g. serviceBW form PK-30051" | P2 | Y | Step 1 Connection | default | baseline, copy | 006 §S1 |
| 006-S1.7 | An empty description is no error: "Continue" goes on | P2 | Y | Step 1 Connection | empty | baseline | 006 §S1 |
| 006-S1.8 | Too long: "The description can have at most 500 characters.", shown and focused as the name's error | P2 | Y | Step 1 Connection | error | baseline, copy:server | 006 §S1 |
| 006-S2.1 | The overview row shows the description, one line, cut with "…" | P1 | Y | Overview | default | baseline, supersedes 005 §S3 W2 "No form ID yet" | 006 §S2 Overview row |
| 006-S2.2 | An empty description, draft or published, shows no line | P1 | Y | Overview | empty | baseline | 006 §S2 |
| 006-S2.3 | The row keeps its layout; the name column is centred vertically, so a row without a line is shorter | P1 | Y | Overview | default | baseline | 006 §S2 |
| 006-S3.1 | The top bar's meta, before the user menu, shows the description without prefix, or nothing when empty | P4 | Y | Details; Draft details | default | baseline, supersedes 005 §S6 meta | 006 §S3 Details page |
| 006-S3.2 | Below lg the meta sits on the second row, cut with "…" instead of wrapping | P4 | Y | Details; Draft details | default | baseline | 006 §S3 |
| 006-S3.3 | On lg it takes the remaining space, right-aligned, so a long description never shortens the name | P4 | Y | Details; Draft details | default | baseline | 006 §S3 |
| 006-S4.1 | The truncated element holds the whole text for screen readers, with no title attribute | - | Y | Overview; Details | default | baseline | 006 §S4 Accessibility |
| 006-S4.2 | The full description is visible in step 1 of the editor | - | Y | Step 1 Connection | default | baseline | 006 §S4 |
| 006-S4.3 | The optional marker is part of the label: the input's accessible name is "Description - Optional" | - | Y | Step 1 Connection | default | baseline | 006 §S4 |
| 006-S5.1 | Copy removed: the form ID's labels, placeholder, info, "No form ID yet" and its required message | - | Y | Step 1; Overview; Details | default | baseline, copy | 006 §S5 Copy removed |
| 007-R.1 | /authorize: a centred card inside the signed-in layout; the sign-in guard keeps the query string | P5 | Y | Consent page | default | baseline | 007 §Routes |
| 007-R.2 | /account and /approvals/:id use the signed-in layout behind the sign-in guard | P5 | Y | Account page; Approval page | default | baseline | 007 §Routes |
| 007-R.3 | Every page: tab title, one h1, failures shown with the error notice and error ID | P5 | Y | Consent, Account, Approval pages | error | baseline | 007 §Routes |
| 007-S1.1 | Title (h1) "Allow access for {client_name}?" | P5 | Y | Consent page | default | baseline, copy | 007 §S1; 007-FR-002 |
| 007-S1.2 | Below: "{client_name} wants to act on your behalf in the Connection Portal. Choose what it may do." | P5 | Y | Consent page | default | baseline, copy | 007 §S1 |
| 007-S1.3 | A KERN radio group (AccessLevelChoice, shared with S2 and S3) with three levels, each label and description | P5 | Y | Consent page; Account page | default | baseline | 007 §S1 |
| 007-S1.4 | "Read only": "Find and read connections, variants and rules, run the rule checks … Nothing changes." | P5 | Y | Consent page; Account page | default | baseline, copy | 007 §S1 |
| 007-S1.5 | "Read and edit drafts": "Also create and change drafts, and ask you to publish or delete a draft. …" | P5 | Y | Consent page; Account page | default | baseline, copy | 007 §S1 |
| 007-S1.6 | "Read, edit drafts and manage live connections": "Also ask you to deactivate, reactivate or delete … approval here." | P5 | Y | Consent page; Account page | default | baseline, copy | 007 §S1 |
| 007-S1.7 | The level the request's scope asks for is preselected; "Read only" otherwise | P5 | Y | Consent page | default | baseline | 007 §S1 |
| 007-S1.8 | A step-up request shows "{client_name} is asking for more access than it has." | P5 | Y | Consent page | default | baseline, copy | 007 §S1 |
| 007-S1.9 | "Allow" (primary) and "Deny" (secondary) both navigate to the client's redirect URL | P5 | Y | Consent page | default | baseline, copy | 007 §S1 |
| 007-S1.10 | After "Allow", "You can go back to {client_name}." shows while the browser leaves | P5 | Y | Consent page | success | baseline, copy | 007 §S1 |
| 007-S1.11 | Bad request: KERN alert in place of the form, no redirect: "This sign-in request isn't valid. Start again from your agent." | P5 | Y | Consent page | error | baseline, copy | 007 §S1 |
| 007-S1.12 | Footer: "Signed in as {username}. You can change or revoke this access later on your user page." linking /account | P5 | Y | Consent page | default | baseline, copy | 007 §S1 |
| 007-S2.1 | The user menu gets "Your account" above "Log out", a router link styled kern-link | P5 | Y | User menu | default | baseline, copy | 007 §S2 |
| 007-S2.2 | Title (h1) "Your account"; subtitle "Signed in as {username}." | P5 | Y | Account page | default | baseline, copy | 007 §S2 |
| 007-S2.3 | "Connected agents": client name, level, "Connected {date}", "Last used {relative}" or "Never used" | P5 | Y | Account page | default | baseline, copy | 007 §S2 |
| 007-S2.4 | Each row has a ⋯ menu with "Change access level" and "Revoke" | P5 | Y | Account page | default | baseline, copy | 007 §S2 |
| 007-S2.5 | Empty: "No agent is connected yet. Add the Connection Portal's MCP server to your agent to connect it." with README link | P5 | Y | Account page | empty | baseline, copy | 007 §S2 |
| 007-S2.6 | "Personal access tokens": name, level, "Created {date}", "Expires {date}", "Last used …", the same menu | P5 | Y | Account page | default | baseline, copy | 007 §S2 |
| 007-S2.7 | A button "Create token" | P5 | Y | Account page | default | baseline, copy | 007 §S2 |
| 007-S2.8 | Change access level: dialog with AccessLevelChoice, current level selected; "Save" sends PUT | P5 | Y | Access level dialog | default | baseline, copy | 007 §S2 |
| 007-S2.9 | Success toast "Access level changed. It applies from the agent's next call." | P5 | Y | Account page | success | baseline, copy | 007 §S2 |
| 007-S2.10 | Revoke dialog: "Revoke access for {name}?" / "The agent's next call will be refused, and its waiting approval requests are cancelled." | P5 | Y | Revoke dialog | default | baseline, copy | 007 §S2 |
| 007-S2.11 | Revoke buttons "Revoke" (danger) and "Cancel" | P5 | Y | Revoke dialog | default | baseline, copy | 007 §S2 |
| 007-S2.12 | Create token dialog: name (required, 100 characters), AccessLevelChoice, expiry select of 7, 30, 90 days | P5 | Y | Create token dialog | default | baseline | 007 §S2 |
| 007-S2.13 | On success a second dialog shows the token once in a copyable read-only field with "Copy" | P5 | Y | Token dialog | success | baseline, copy | 007 §S2 |
| 007-S2.14 | Text "Copy it now. It won't be shown again."; the token is never in a toast | P5 | Y | Token dialog | success | baseline, copy | 007 §S2 |
| 007-S2.15 | Lists are ul/li; menus follow RuleMenu; dialogs manage focus; dates have datetime attributes | P5 | Y | Account page | default | baseline | 007 §S2 Accessibility |
| 007-S3.1 | Loading: the page loader | P5 | Y | Approval page | loading | baseline | 007 §S3 |
| 007-S3.2 | 403 not_yours: "This request was made for another team member. Only they can approve it." | P5 | Y | Approval page | error | baseline, copy | 007 §S3 |
| 007-S3.3 | 404, an unknown or swept request, shows the not-found screen | P5 | Y | Approval page; Not-found screen | error | baseline | 007 §S3 |
| 007-S3.4 | Title by action: "Publish '{name}'?", "Delete the draft '{name}'?", "Deactivate …", "Reactivate …", "Delete '{name}'?" | P5 | Y | Approval page | default | baseline, copy | 007 §S3 |
| 007-S3.5 | Once a deleted draft's row is gone: "Publish the draft?" and "Delete the draft?" | P5 | Y | Approval page | default | baseline, copy | 007 §S3 |
| 007-S3.6 | Subtitle "Requested by {requested_by} · expires at {time}"; the requester's name is kept after access ends | P5 | Y | Approval page | default | baseline, copy | 007 §S3 |
| 007-S3.7 | publish: description line, documents summary, rules summary per variant, and a "Rule checks" section | P5 | Y | Approval page | default | baseline, copy | 007 §S3 |
| 007-S3.8 | Rule checks: "Checking the rules…" (polite status), then per variant the dialog's findings line or "No findings." | P5 | Y | Approval page | loading | baseline, copy, copy:findings | 007 §S3 |
| 007-S3.9 | The findings never block approving | P5 | Y | Approval page | default | baseline | 007 §S3 |
| 007-S3.10 | delete_draft: description line, "Last saved {date}", "Its content will be gone for good." | P5 | Y | Approval page | default | baseline, copy | 007 §S3 |
| 007-S3.11 | deactivate: "These connection URLs will answer 'unavailable' until …reactivated:", URLs, "Requests in progress are cancelled." | P5 | Y | Approval page | default | baseline, copy | 007 §S3 |
| 007-S3.12 | reactivate: description line, "These connection URLs will work again:" with the URLs | P5 | Y | Approval page | default | baseline, copy | 007 §S3 |
| 007-S3.13 | delete: "These connection URLs will stop working for good:", URLs, "Requests in progress are cancelled.", "Deleting can't be undone." | P5 | Y | Approval page | default | baseline, copy | 007 §S3 |
| 007-S3.14 | "Approve" (primary; danger for delete and delete_draft) and "Decline" (secondary) | P5 | Y | Approval page | default | baseline, copy | 007 §S3 |
| 007-S3.15 | While a call runs both are disabled, a status says "Publishing…" / "Working…" | P5 | Y | Approval page | loading | baseline, copy | 007 §S3 |
| 007-S3.16 | Outcome states replace the body's actions and keep the title | P5 | Y | Approval page | success | baseline | 007 §S3 |
| 007-S3.17 | done: success alert "Published." (or the action's word); after publish or reactivate, URLs and "Open the connection" | P5 | Y | Approval page | success | baseline, copy | 007 §S3 |
| 007-S3.18 | declined: "You declined this request. Nothing has changed." | P5 | Y | Approval page | success | baseline, copy | 007 §S3 |
| 007-S3.19 | expired: "This request expired at {time}. Nothing has changed. The agent can ask again." | P5 | Y | Approval page | error | baseline, copy | 007 §S3 |
| 007-S3.20 | replaced: "The agent made a newer request for this action." | P5 | Y | Approval page | error | baseline, copy | 007 §S3 |
| 007-S3.21 | cancelled draft_changed: "The draft has changed since the agent asked. Nothing has changed; the agent has to ask again." | P5 | Y | Approval page | error | baseline, copy | 007 §S3 |
| 007-S3.22 | cancelled draft_published / draft_deleted: "The draft has been published / deleted since the agent asked." | P5 | Y | Approval page | error | baseline, copy | 007 §S3 |
| 007-S3.23 | cancelled: "The connection was {deactivated / reactivated} in the meantime." / "… has been deleted in the meantime." | P5 | Y | Approval page | error | baseline, copy | 007 §S3 |
| 007-S3.24 | cancelled: "The agent's access has changed / was revoked / has ended, so this request was cancelled." | P5 | Y | Approval page | error | baseline, copy | 007 §S3 |
| 007-S3.25 | failed: error alert with the service's message and error ID, body kept, "Try again" in place of "Approve" | P5 | Y | Approval page | error | baseline, copy, copy:server | 007 §S3 |
| 007-S3.26 | A page left open past the expiry: "Approve" answers 409 approval_expired, and the page shows the expired state | P5 | Y | Approval page | error | baseline | 007 §S3 |
| 007-S4.1 | Rule, group and variant tab menus get "Copy link" as last entry before the destructive ones | P3 | Y | Rules step | default | baseline, copy | 007 §S4; 007-FR-028 |
| 007-S4.2 | A rule or group removed in a based variant gets "Copy link" after "Restore" | P3 | Y | Rules step | default | baseline | 007 §S4 |
| 007-S4.3 | The link is built from window.location.origin, connection, variant and item | P3 | N | Rules step | ? | baseline | 007 §S4 |
| 007-S4.4 | Toast "Link copied."; failure "The link couldn't be copied. Copy it from the address bar after opening the item." | P3 | Y | Rules step | success | baseline, copy | 007 §S4 |
| 007-S4.5 | Both are announced through the toast's live region | P3 | Y | Rules step | success | baseline | 007 §S4 |
| 007-S4.6 | A new, unsaved connection's menus don't offer "Copy link"; a stored draft's and a published one's do | P3 | Y | Rules step | default | baseline | 007 §S4 |
| 007-S5.1 | step=rules opens the rules step (draft: create flow; published: edit flow) and the variant's tab by id | P3 | Y | Rules step | default | baseline | 007 §S5; 007-FR-030 |
| 007-S5.2 | The item is brought into view and focused after the step has rendered | P3 | Y | Rules step | default | baseline | 007 §S5 |
| 007-S5.3 | Missing variant: KERN warning notice "This link points to a variant that no longer exists."; first variant shown | P3 | Y | Rules step | error | baseline, copy | 007 §S5 |
| 007-S5.4 | Missing item: "This link points to a rule or group that no longer exists."; the variant is shown | P3 | Y | Rules step | error | baseline, copy | 007 §S5 |
| 007-S5.5 | The notice has a "Dismiss" button and is announced | P3 | Y | Rules step | error | baseline, copy | 007 §S5 |
| 007-S5.6 | A connection that isn't there: the existing not-found screen | P3 | Y | Not-found screen | error | baseline | 007 §S5 |
| 007-S5.7 | Link parameters stay while its variant is shown; another step or variant removes them, replacing the history entry | P3 | Y | Rules step | default | baseline | 007 §S5 |
| 007-S5.8 | The ?step= parameter also serves the details page's buttons | P3 | Y | Details | default | baseline | 007 §S5 |
| 007-S6.1 | Overview and details unchanged: no indication that an agent changed a draft | P1 | Y | Overview; Details | default | baseline | 007 §S6 |
| 007-S6.2 | The details page's "Edit" buttons keep working | P1 | Y | Details | default | baseline | 007 §S6 |
| 007-CP.1 | Sentence case, typographic apostrophes, dates with the project's formatting helpers | - | Y | all screens | ? | baseline, copy | 007 §Copy conventions |
| 007-CP.2 | "variant", "Standard", "connection", "draft" for a stored draft; access levels always by their full names | - | Y | all screens | ? | baseline, copy | 007 §Copy conventions |

## Exclusions
| OUT-ID | Excluded behaviour | Spec § |
|---|---|---|
| OUT-1 | Changes to the backend, rules package, MCP server and API types, except copy through adopted C items | Input; FR-007 |
| OUT-2 | A design feature needing a change outside the frontend: deferred to a later feature, not built | Clarifications 2026-11-06; FR-007 |
| OUT-3 | Changes to the app's flow: routes, wizard steps, reducers, API | Input; FR-003 |
| OUT-4 | Any other UI component library, or a Revamp npm package | FR-014; Assumptions |
| OUT-5 | Dark mode or any appearance besides light | FR-011 |
| OUT-6 | Motion: the design defines none; transitions stay as the design system provides them | Assumptions |
| OUT-7 | Kit components no screen uses are not built | Assumptions |
| OUT-8 | Sample data in frames (example names, forms, dates) is not ported as copy | FR-002; Edge Cases |

## Glossary
connection = form connection, Connection, Formularverbindung, connection card, live connection
variant = branch, Variant, variant tab, tab, "+ Add variant"
Standard = main branch, main variant, default variant, Standard tab
rule = Rule NN, rule row, condition, check, rule card
group = Group NN, sub-group, Sub-group NN, rule group, AND/OR group, GroupFrame
connector = AND/OR, operator, logic toggle
document = document type, credential, ID document, Personal ID, Driving licence, catalog item
data = field, attribute, claim, part, value
check = condition, comparison, predicate, operator
statement = rule text, condition text, summary line
error message = message applicants read, rule message, applicant message
draft = Draft badge, stored draft, unpublished, saved draft
local draft = unsaved work on this device, unsaved changes, recovered work
finding = problem note, conflict, duplicate, redundant, covered, always met, warning, findings banner, Problem note
problem = blocking, error outline, issue
persona = sample applicant, test applicant, fictitious applicant, applicant chip, test persona
test step = Test, Test rules, test panel
publish = go live, Live, Publish changes, published
deactivate = pause, disable, Deactivated
details = connection page, detail view, Published, summary
overview = connections list, dashboard, home, Connections
first connection = get started, Create your first connection, onboarding
wizard = editor, create flow, edit flow, stepper, progress, step bar
trigger URL = request link, start link, connection link
pull URL = result link, result URL, connection link, {reference}
description = form ID (former), serviceBW form, note, meta line
product name = Connection Portal, Middleware, serviceBW ↔ EUDI Wallet Middleware, app title
team member = user, editor, signed-in user, DO.IT
agent = MCP client, LLM agent, AI agent, connected agent
personal access token = token, PAT, access token
access level = scope, permission, Read only, Read and edit drafts
approval request = approval, approve request, pending request
consent page = authorize, Allow access
user page = account, Your account, profile, user menu
error ID = error id, reference code, support ID
KERN Revamp = Revamp, Design Kit, KERN 2.8 (current), kit
