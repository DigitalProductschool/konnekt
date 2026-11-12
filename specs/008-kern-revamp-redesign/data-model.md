# Data model: Port the redesigned UI (KERN Revamp)

**Phase 1 output of `/speckit-plan`** | **Date**: 2026-11-07 | **Spec**: [spec.md](spec.md) |
**Research**: [research.md](research.md)

No table, column, schema or API shape changes (FR-007): the backend, `api-types/`, the rules
package's data and the MCP tools keep their contracts, and only texts change (C1–C7, research
R2). This file therefore models two things: the **records this feature keeps in its own
documents** (the overlay, the component decisions, the screen contracts, the verification tables,
the copy items), and the **state the frontend adds** to its pages and components for the adopted
drift items.

## 1. Records kept in the feature's documents

### Token overlay entry

One row of [design-notes.md §1](design-notes.md#1-token-overlay) and one declaration of the
overlay block in `frontend/src/index.css`.

| Field | Type | Rule |
|---|---|---|
| `variable` | KERN variable name (`--kern-…`) | exists in `@kern-ux/native` 2.8.2's `kern.css`; a value with no KERN name becomes a project token in `@theme` instead (FIGMA-WORKFLOW §2) |
| `revamp` | the kit's value | from `figma-audit/kit/variables.md`, or spec 002's design-notes §9 where the dump omits the variable |
| `kern28` | KERN 2.8.2's light value | the diff of 2026-11-07 |
| `source` | kit page (P02–P33) | where the value was read |
| `note` | text | an AA fix (below) or a notation difference that needs no entry |

**AA fix** (Clarification 2026-11-06 #2, W1): `pair` (foreground, background, where it is used),
`ratio`, `fixed_to` (the nearest passing value), `ratio_after`, `told` (date the designer was
told). Kept in design-notes §1; the overlay carries the fixed value with a comment naming the
pair.

### Component decision

One row of [design-notes.md §2](design-notes.md#2-component-decisions) per component folder of
`frontend/src/components/` and per own component of a page.

| Field | Values |
|---|---|
| `component` | the folder or file |
| `kit_page` | P06–P33 of `figma-audit/kit/units.md`, or "none" |
| `option` | `a` KERN class with the overlay · `b` KERN class plus a scoped override · `c` own markup (research R1) |
| `kern_class` | the class or kit component kept, if any |
| `override` | the selector in `index.css`, for option `b` |
| `states` | the interaction states to verify once: default, hover, pressed, focus, disabled, as the kit's P33 set draws them |
| `decided` | "proposal" until a task confirms or changes it, then the task id and the reason |

### Screen contract

[contracts/ui-screens.md](contracts/ui-screens.md): `id` (L1–L4 for the shells, S1–S22 for the
screens), `route`, `units` (U# of `figma-audit/units.md`), `frames` (node ids), `states` (the
list a task must reach and verify), `items` (the F#, W#, C#, FR and Clarification numbers that
apply), `baseline` (the 001–007 sections that fix its behaviour).

### Verification table row

[design-notes.md §5](design-notes.md#5-verification-tables), one table per unit (FR-016).

| Column | Rule |
|---|---|
| `frame` | the node id of the frame |
| `state` | default, hover, pressed, focus, disabled for a component; loading, empty, error, success, open menu, dialog… for a screen |
| `element` | what was measured |
| `property` | width, height, padding, gap, border, radius, font, line height, colour, background, text |
| `figma` | the value from `get_design_context` |
| `actual` | the value from `getComputedStyle` / `getBoundingClientRect`, or the rendered text |
| `result` | `match`, or the item it cites (F#, W#, C#, CLAR #n, an AA fix) |

A unit is **done** when every row reads `match` or cites an item; a component's table exists
once; a screen's table covers its layout and its own states with the components in their default
state (Clarification 2026-11-06 #3). The screenshot matrix of pass I (§6) adds one row per route
× state × width (1440 px; 320 px at 200 % zoom) with `horizontal_scroll` and `hidden_content`
both `no` (SC-005).

### Copy item

One row per C item in research R2: `id`, `text` (the design's), `sources` (files that provide or
repeat it), `tests` (files asserting it), `done` (the task). The removal check of R13 greps the
old texts afterwards.

### Deferred item

[deferred.md](deferred.md) is unchanged by the plan: `id`, `frames`, `wording`, `needs`,
`supersedes`, in three groups. A task that meets a drawn element listed there builds the baseline's
behaviour and cites the item; nothing is added to the list during implementation (an undecided
element is a new drift item for clarify, FR-004).

## 2. State the frontend adds

All of it is page or component state; nothing is sent to the backend, stored on the server or
written to `localStorage` except the homepage memory below. Related state lives in a reducer with
actions (constitution).

### Homepage memory (FR-027, research R6)

| Field | Type | Where |
|---|---|---|
| `hasConnections` | boolean, per account | `localStorage` key `<prefix>:<account>:homepage:has-connections` (the `:` in the last part keeps the local drafts' store from listing it, T039), read and written only by `hooks/useRememberedHomepage.ts` |

**Decision** (`pages/FormConnectionList/utils.ts`, pure): `homepageOf(list, remembered)` →
`'welcome'` when the loaded list (connections and drafts) is empty, `'overview'` when it holds
anything, and `remembered ? 'overview' : 'welcome'` while loading. The flag is written whenever
the list loads and after the last connection is deleted.

### The wizard shell

| State | Values | Source |
|---|---|---|
| `step` | 1–4 (Connection, Documents, Rules, Test) | `CONNECTION_STEPS` becomes four entries; Publish is a dialog (FR-025) |
| `stepLineClickable` | `false` while creating, `true` while editing | F25 |
| `origin` | `new` · `draft` · `published` | spec 005, unchanged |
| `header` | `{ breadcrumb: 'Your connections', name, status }` | the second pill (R4); the status pill reads Draft or Active |
| `saving` | `idle` · `saving` | "Save and exit" aria-disabled and "Saving…", the polite status "Saving draft…" (FR-033) |

### Leaving a flow (FR-026, Clarifications #8 and #47)

A reducer in the editor (`LeaveFlowState`, actions `askLeave`, `cancel`, `saveProgress`,
`discard`, `askLogout`, `saveAndLogout`, `logoutAnyway`, `saved`, `failed`):

| Flow | Trigger | State | Outcome |
|---|---|---|---|
| create or draft | product name, "Your connections" | `leaveAsked` → "Leave this connection?" | **Save progress**: `saving` → Save and exit → leaves (a validation error returns to the flow with the field marked; FR-023g's message for a missing name); **Discard connection**: leaves without storing and forgets the flow's local draft; × / Escape: `idle` |
| edit of a published connection | the same | `saveAsked` → "Save your changes?" | **Save**: opens "Save changes?" (the save dialog) and leaves to the details once saved; **Discard changes**: leaves without saving; × / Escape: `idle` |
| any flow with unsaved changes | "Log out" | `logoutAsked` → "Save before you log out?" | **Save and log out**: stores the draft, then logs out; **Log out anyway**: logs out; **Cancel** / ×: `idle`, focus back on the user menu |
| any flow with unsaved changes | closing or reloading the tab | — | the browser's "Leave site?" (`beforeunload`); the local draft stays the safety net (V9) |
| any flow with unsaved changes | the browser's back button | — | a forced leave: no dialog (no router blocker, V9); the local draft stays the safety net (005-S4) |
| an open rule editor | any of the above | — | "Save changes to Rule 01?" first; no editor state is stored |

### The documents step (FR-031, research R8)

Owned by the editor's reducer as today: `documents` (catalog order) and their `fields`. The step's
own reducer holds the view:

| Field | Type | Rule |
|---|---|---|
| `selectedIndex` | number | the document shown on the right; the pager "Document n of m" |
| `query` | string | the search card's text; "Available (n)" and "Added (n)" groups; the no-results text |
| `pendingRemoval` | `{ documentId, timer } \| null` | after an inline removal; the undo toast restores it; expires with the toast |
| `needsData` | set of document ids | documents with no field chosen, flagged inline ("1 document needs data") and in the "No data selected in n document(s)" dialog on "Set rules →" |
| `confirmRemoval` | `{ documentId, rules: [...] } \| null` | "Keep document" / "Remove document" when no rule checks it; 002-S1.1's dialog naming the rules when one does |

"Set rules →" is disabled with "Add a document first" while `documents` is empty (FR-031); the
catalog-dropped warning of W6 stays an alert listing the data with "Remove it".

### Toasts (research R8)

`Toast`: `{ id, kind: 'neutral' | 'success', text, action?: { label, onAction }, errorId? }`;
one visible at a time, the newest replaces the previous, announced through the live region; an
action toast stays until used or dismissed (superseded by spec 010's FR-082: every toast closes
by itself after 6 seconds, held while the pointer or the focus is on it). Texts: "Draft saved. You can pick it up any time.",
"Couldn't save. Check your internet connection and try again." + "Try again" (+ error ID),
"Results updated. <name> now meets <rule>.", "You're logged out.", "Changes saved.", the delete,
deactivate, reactivate and publish toasts (FR-051 (42)), the document and variant undo toasts.

### Menus, tooltips and the connector (research R10)

`MenuPlacement`: `{ side: 'start' | 'end' | 'full', direction: 'down' | 'up', maxHeight: 160 | 240
| 320 | 400 | 480 }` from the trigger's rectangle and the header's and footer's bottom and top
edges, each value one Tailwind class set (research R10: no inline styles). `Connector`:
`{ operator: 'and' | 'or', open }` with the two options "All rules must be met" / "At least one
rule must be met" and the level in its accessible name (FR-038). A disabled button with an
explanation: `aria-disabled`, `explanation` (text), the tooltip's `open` on hover, focus and
touch.

### The rules step's menus (FR-036)

`menuEntriesOf(item, context)` (pure, in `RulesStep/utils.ts`, tested) decides the entries from:
`kind` (rule, group, sub-group, variant), `level` (top, in a group, in a sub-group), `linked`
(linked to Standard in a variant), `removed`, `hasMessage` (groups), `neighbours` (another rule
on the same level at the top; another rule directly in the group inside one; groups are no
neighbours and get no grouping entry until the rules package can group a group, #64), the
branch's `kind` (Standard or a variant) and whether some variant could still receive the item
("Copy to variant"). "Copy link" is the last entry before the destructive ones and follows
"Restore" on removed items; "Group with other rules" starts select mode `{ selected: [id],
scope: 'top' | groupId }`, inside a group limited to that group's rules (Clarifications #48, #60,
#61, #64).

### The test step (FR-042, FR-043, C6)

`EditDataDialog`: `{ values (a copy of the persona's data), errors, saving }`; "Save and test"
applies the values, re-evaluates and shows the toast; a validation error blocks the whole save.
The data card is a flat list grouped per document (the document's name as the row group's
accessible heading, no visible column), rows "<label>: <value>" with the C6 formats; the result
heading "Result: doesn't meet <n> rule(s)" / "Result: meets the rules"; the panel scrolls (F43).
The variant tab shows the "no citizen can meet" finding from the evaluator only (FR-041).

### The publish dialog (FR-044)

| State | Shows | Transition |
|---|---|---|
| `summary` | the counts ("7 data items", "Standard · 2 rules"), the findings lines warnings first, "Back to test", "Publish connection" | publish → `publishing`; Back to test → closes to the test step |
| `publishing` | "Publishing… This takes a few seconds.", the loader, no buttons; the dialog can't be closed (FR-051 (41)) | success → `published`; failure → `failed` |
| `published` | the "Published" state and "Opening your connection page…" | after 0.5 s → the details (also under reduced motion, R5) |
| `failed` | "Couldn't publish. Check your internet connection and try again." with the error ID; the summary kept | retry → `publishing`; close → the test step |
| `conflict` | the `rules_changed` / draft conflict (W7, W3) with "Reload" or "Replace their changes" | as spec 005 |
| `noRules` | "Publish without rules?" (002-S5.6) | confirm → `publishing` |

The edit flow's save dialog ("Save changes?") has the same states with "Saved" leading to the
details and the "Changes saved." toast.

### The details (FR-046 to FR-049)

| Field | Values | Rule |
|---|---|---|
| `openAccordion` | `'links' \| 'summary' \| null` | one open at a time; `summary` when arriving from "View" |
| `variantTab` | branch id | Standard first; each tab with its branch ⓘ and problem icon |
| `findings` | from `useRuleChecks()` on the published rule set | never stored, sent or logged (FR-047) |
| `copiedUntil` | map url → timestamp | "✓ Copied" for 2 s, announced (FR-048); disabled while deactivated with the explanation |
| `menu` | the ⋯ at the status band's right end | "Deactivate" (active) or "Activate again" before the ⋯ (deactivated), "Delete" |
| draft | the status band "This connection is a draft" as the h1, "Edited <date>", the footer "Edit connection" / "Go to connections →", a visible "Delete draft", no links | FR-049 |

### The overview (FR-028, FR-029, FR-051 (27), (28))

`query` (the search), `filtered` (pure: name and description, case-folded, "n of m
connections"), `rowDelete` (`{ id, status }` → the one delete dialog "Delete connection" / "Keep
connection", the draft keeping its body), rows of equal height with the Status/Connection pill
and "Edited <date>" (a draft adds " · <step> step", FR-052d).

## 3. Validation rules the UI keeps or adopts

| Field | Rule | Message | Source |
|---|---|---|---|
| connection name | required, ≤ 200 characters | "Enter a name for the connection." (C7); the length message unchanged | FR-023, 005-S1.2 |
| description | optional, ≤ 500 characters, multi-line, spell check on | the too-long error as the baseline (W10) | FR-032 |
| variant name | required, unique | "Enter a name for the variant."; "There's already a variant called "<name>"." in the dialog next to the field (W18) | FR-023, C5 |
| rule name | unique in its branch | "There's already a rule called "<name>" in <branch>." | C5 |
| number conditions | whole numbers ≥ 1 | "Enter a whole number greater than 0." | FR-023 |
| documents | at least one; each with data | "Add a document first"; "1 document needs data"; the "No data selected in n document(s)" dialog | FR-031 |
| sign-in | — | "Username or password is wrong. Check both and try again." under both fields, both marked invalid | FR-023, Clarification #10 |
| edit data (test step) | per field as 004-S8.5; a date that doesn't exist | the error under the field blocks "Save and test" | FR-042 |

The frontend's messages are word for word with the server's (`rules/src/validation.ts`,
`rules/src/constants.ts`; FR-006).
