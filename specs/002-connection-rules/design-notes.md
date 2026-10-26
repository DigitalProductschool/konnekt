# Design notes: rules, groups and variants

**Tasks**: T002 (copy), T003 (tokens), T076 (accessibility, §10), T077 (coverage, §11) | **Date**: 2026-10-25, §7, §8, §10 and §11 2026-10-26 | **Contract**: [contracts/ui-screens.md](contracts/ui-screens.md)

**Sources**:
- **Figma "Connection Portal"** (`s8mU9oJDq3411e8bxMjQO9`), page "🔗 Flow · Connection Portal, log in
  to publish" (`6263:12360`). The units U06–U38 are listed in
  [figma-audit/units.md](figma-audit/units.md). Read for these notes with `get_design_context`:
  U11 `6348:40209` (the Rules step, empty) and `6348:40237` (document menu), U12 `6350:41316`
  (document menu) and `6350:42145` (class menu), U14 `6113:29056` (delete confirmation) and
  `6113:29469` (undo toast), U17 `6139:32693` (Add variant), U23 `6185:8847` (deleting a Standard
  rule), U26 `6197:12011` (Add variant, name missing), U33 `6376:26181` (publish summary), U35
  `6376:27178` (publishing failed), U38 `6396:49030` (edit a live connection); with
  `get_screenshot`: U13 `6357:42881` (text condition). Variables: `get_variable_defs` on the
  page's 15 sections (section 9).
- [spec.md](spec.md) with its Clarifications, and the "Deviations from Figma" (F#, W#) of
  [contracts/ui-screens.md](contracts/ui-screens.md).
- Spec 001's design notes
  ([../001-servicebw-eudi-middleware/design-notes.md](../001-servicebw-eudi-middleware/design-notes.md))
  and its built copy (`frontend/src/pages/FormConnectionEditor/constants.ts`), which still apply.

Node ids can change when the file is edited.

**What decides what**: spec.md decides behaviour and wording, Figma layout and styling only. These
notes hold the copy that the decisions leave to the design notes. Copy marked **Proposed** isn't
in any frame; the rest quotes the frame named next to it. Where a quoted frame and a deviation
item differ, the item wins, and the text below already follows it.

## 1. Language and naming

As in spec 001: English, "connection" for a form connection, typographic apostrophes (’). In
addition:
- **"Variant"** is the UI's word for a branch; the main branch is called **"Standard"** until it is
  renamed (spec Assumptions, "Design"). The API and the code keep "branch".
- **Links**: the UI calls the trigger URL the "Request link" and a pull URL the "Result link", as
  spec 001 does. The API's messages, which the UI shows as they come, use the same words (spec
  Assumptions, "Design"; decided 2026-10-25).
- Messages name rules and groups with their variant: "Rule 03 in Standard deleted." (FR-005, F29).
  Prompts about the item on screen keep the design's copy ("Delete Rule 03?").

## 2. Rules step (S2; U11 `6348:40209`)

| Element | Copy | Source |
|---|---|---|
| Progress step | **"Rules"**, the third of four: Connection, Documents, Rules, Publish. `CONNECTION_STEPS` becomes `['Connection', 'Documents', 'Rules', 'Publish']` | U11 `6348:40212` |
| Page title | "Rules" | U11 `6348:40213` |
| Page hint | "Each rule checks the data applicants share. If a rule isn’t met, the applicant sees its error message." | U11 `6348:40213` |
| Empty state (every variant without rules, W5) | "No rules yet" / "Without rules, anyone who shares the requested documents can apply." / button "Add rule" | U11 `6348:40217` |

### Removing data that rules check (S1, F18; U10 `6324:40071`, `6324:40396`)

Asked on the documents step before a document is removed or a field deselected, also by
unticking "All data", while rules of any variant check that data (FR-029). Built (T072,
2026-10-25). The user chose to list the rules rather than writing them into one sentence as U10
does (node discovery's UNCERTAIN item): the list goes between U10's two sentences, one rule per
line, as KERN's large bullet list.

| Element | Document (U10 `6324:40071`) | Field (U10 `6324:40396`) | "All data" (proposed) |
|---|---|---|---|
| Title | "Remove Personal ID?" | "Stop requesting Date of birth?" | "Stop requesting all data from Personal ID?" |
| First sentence | "3 rules check data from this document:" | "2 rules check it:" | "3 rules check this data:" |
| List | "Rule 01 in Standard", "Rule 05 in Ambulance", … | the same | the same |
| Last sentence | "After removing it, edit or delete these rules before you publish." | "After this, edit or delete these rules before you publish." | as for a field |
| Buttons | "Cancel" / "Remove document" (danger) | "Cancel" / "Stop requesting" (danger) | as for a field |

- In the edit flow the last sentence ends "… before you save." (F18).
- One rule (proposed): "1 rule checks …" and "edit or delete this rule".
- Every variant's rules are named, also those a based variant inherits and its removed ones:
  each stops being met in its variant. Rules on data the connection already doesn't request
  aren't named again; the Rules step flags them (F11).
- "Cancel", Escape and the close button keep the data, and the focus returns to the control that
  asked. Confirming removes it as without rules (a removed document keeps its toast with
  "Undo"), and the rules stay: publishing and saving are refused while they remain (F11).

### Document menu footer (FYI #20)

Figma has two wordings for the footer of the rule editor's document menu: "Lists the documents you
added" (U11 `6348:40237`) and "Only documents you request are listed." (U12 `6350:41316`).
**Decision (proposed)**: "Only documents you request are listed." everywhere. It says why a
document is missing, and it is a full sentence like the other menu footers ("Select at least one
option.").

## 3. Rule editor (S3)

### Text conditions: letter case (F7; U13 `6357:42881`, value slot `6357:43063`)

- **Checkbox label (proposed)**: "Match letter case". A KERN checkbox right after the value field
  in the condition row, one per text condition, unchecked by default: letter case is ignored
  (FR-013).
- **Hint**: "Spaces at the start or end don’t matter." It replaces U13's "Met if the city or town
  is any of these." and "Capital letters and spaces at the start or end don’t matter."; nothing is
  said about "starts with", which isn't offered (F7).
- **Saved statement (proposed)**: the statement ends with the setting, in both states, so that
  every text rule says whether letter case counts (FR-005):
  - unchecked: `Personal ID – City or town is equal to "Stuttgart", ignoring letter case`
  - checked: `Personal ID – City or town is equal to "Stuttgart", matching letter case`

  The value stays in quotes (data-model.md, "Conditions"). Every place that shows a saved
  text rule, the details (S6) included, uses this statement.

### Licence classes (F32, F5; U12 `6350:42145`, U24 `6191:42191`)

The class menu shows each code with its description, as U12 does; the field's chips and the saved
statements show the codes only ("B", "BE"). U12's 17 rows show 16 classes, all but B1; U24 and U25
list bare codes, which F32 replaces with these rows.

| Code | Description | Code | Description |
|---|---|---|---|
| AM | Mopeds up to 45 km/h | C | Trucks over 3.5 t |
| A1 | Light motorcycles up to 125 cm³ | CE | C with a heavy trailer |
| A2 | Motorcycles up to 35 kW | D1 | Minibuses up to 16 passengers |
| A | All motorcycles | D1E | D1 with a heavy trailer |
| B1 | Quadricycles up to 15 kW (**proposed**) | D | Buses |
| B | Cars up to 3.5 t | DE | D with a heavy trailer |
| BE | Car with a heavy trailer | L | Tractors up to 40 km/h |
| C1 | Trucks 3.5–7.5 t | T | Tractors up to 60 km/h |
| C1E | C1 with a heavy trailer | | |

- Order as in the menu, with B1 before B as in Directive 2006/126/EC: AM, A1, A2, A, B1, B, BE,
  C1, C1E, C, CE, D1, D1E, D, DE, L, T. The 17th row of U12 is B, the menu item's default ("B Cars
  up to 3.5 t").
- **B1 (proposed, added by T006)**: no frame shows it. The directive's B1 is the motor quadricycle
  (at most 15 kW, 400 kg unladen); Germany doesn't issue it, but licences of other member states
  can carry it.
- The descriptions are copied as Figma writes them, en dash in "3.5–7.5 t" and "cm³" included.
  They become the labels' descriptions in `app/option_sets.py` (`licence_classes`, research R6).
- Search field "Search classes"; empty result "No options match "XL"." (F32, Clarifications).
- U12's footer "BE, C and D licences always include class B." goes (F5): a class B rule is met
  only by a licence that lists class B. The multi-select menu keeps "Select at least one option."

### Copy built without a frame (T037–T039)

- Inline errors where U25 shows none for the kind (proposed): "Enter a number.", "Enter a text to
  compare with.", "Enter a date."; years and months keep U25's "Enter a number greater than 0."
- Licence classes, "includes none of" (proposed): "Met if the licence has none of the chosen
  classes.", beside U12's "Met if the licence has at least one of the chosen classes."
- Date pickers: the sections read "Age", "Time from now", "Date of birth" on a Date of birth, and
  "Time ago", "Time from now", "Fixed date" on every other date (F3). The counting note shows for
  the "time ago" and "from now" checks; a fixed date gets the missing-value note only (F4).
- The proposed message follows the condition until the team member writes their own; emptying
  the field lets the next change of the condition propose one again (F9).

## 4. Variants (S4)

### Add variant and Edit variant (W3; U17 `6139:32693`, U26 `6197:12011`)

**Add variant** as designed:
- Title "Add variant". Intro "A variant is a separate set of rules for some of your applicants.
  Your form decides which variant applies to each applicant."
- "Variant name"; "Description - Optional" with the helper "Shown when someone hovers the (i)
  next to the variant name."
- "Start with": "Based on Standard (recommended)", help "Starts with all Standard rules. Rules you
  don’t change here update with Standard."; "Start empty", help "Starts with no rules. Changes to
  Standard don’t affect it." "Standard" is the main variant's current name.
- Buttons "Cancel" / "Add variant".

**Edit variant** (no frame; the tab menu's "Rename"), built from the same dialog:
- Title "Edit variant". No intro and no "Start with" (proposed: the intro explains adding).
- The same two fields and helper, filled in.
- Buttons "Cancel" / **"Save changes"** (proposed).

**Name errors**, inline under "Variant name", as in U26:
- Missing: "Enter a name for the variant." (U26 `6197:12011`)
- **Duplicate (final)**: "Another variant is already called Ambulance." (after U15 `6344:53414`),
  with the other variant's name as written there. Names are compared ignoring letter case and
  spaces at the start and end (FR-020).

**Tab menu** (KERN menu, like the rule ⋯ menu U14 `6113:28988`): "Rename" on every tab, Standard
included; "Delete" on every other tab.

### Deleting a variant (W3; built like U14 `6113:29056`, proposed)

- Title "Delete Ambulance?"
- Body in the create flow: "The variant and its rules will be deleted."
- Body in the edit flow: "The variant and its rules will be deleted when you save. Its result
  link then stops working for good." (FR-020, FR-027)
- Buttons "Cancel" / "Delete variant", the second in danger red like "Delete rule".

### Deleting a rule of Standard that variants use (F14; U23 `6185:8847`)

U23's body says the rule leaves every variant, which isn't true for a variant that changed it
(FR-022). The body is built from these sentences, in this order (**final**):

1. Always: "This rule will be removed from Standard and from the variants that follow it."
   Without any variant based on Standard, U14's dialog applies instead (section 4, "Deleting a
   rule").
2. For the variants that changed the rule, named in tab order:
   - one: "Ambulance changed it and keeps its own version."
   - several: "Ambulance and School transport changed it and keep their own versions."
3. When the rule is one of a group's two members, the group dissolves everywhere (F13), and the
   variants that changed the group lose their change (FR-022's one exception):
   - "Group 01 is left with one rule, so it’s ungrouped in Standard and its variants."
   - then for those variants: "Ambulance’s changes to Group 01 go with it." / "Ambulance’s and
     School transport’s changes to Group 01 go with it."
4. Always: "You can undo this right after."

Title "Delete Rule 03?"; buttons "Cancel" / "Delete rule" (danger), as U23.

Example: "This rule will be removed from Standard and from the variants that follow it. Ambulance
changed it and keeps its own version. You can undo this right after."

### Decisions while building variants (T061–T067, 2026-10-25)

Decided by the user where the frames leave a gap (node discovery's UNCERTAIN items):
- **Tab menu** (W3): the ⋯ ("Rules/More button", 32px) sits right after the open tab's name and
  its (i), beside the tab's underline; other tabs show none until opened. The (i) and the ⋯ sit
  beside the tab button, not in it, so that the tab stays one control.
- **Copy to variant** (U20 `6344:53981`): Figma's popover under the rule's ⋯, not a modal
  dialog. The focus moves into it; Escape, Cancel and a click elsewhere close it and give the
  focus back to the ⋯.
- **The variant (i)** reuses spec 001's `InfoTooltip` as it is (light bubble, muted (i)), not
  Figma's dark "Rules/Tooltip" with a blue (i). The difference is listed, not fixed.
- **Link icons** (FYI #10): on no linked rule; the "Linked to Standard" strip says what follows
  Standard.

Taken from the components' Figma notes ("Rules/Rule menu", "Rules/Removed rule menu"):
- In a based variant, delete becomes **"Remove from this variant"** for a rule or group that
  follows Standard or changed it; "Delete rule" and "Delete group" stay for the variant's own.
- A removed rule's menu offers only **"Restore rule"**, a removed or dissolved group's only
  **"Restore group"**, both without an icon (U23 `6185:8802`, `6185:41586`).
- **"Reset to Standard"** (icon "Reset · restore") only for a changed rule or group; **"Copy to
  variant"** (icon "Copy to · tab arrow") only while the connection has other variants.

Built without frames:
- **A group dissolved in a variant** (F13): its remaining member takes its place, and the group
  follows it, shown removed with the members that don't count, faded. Nothing in a removed or
  dissolved group can be changed until it is restored, so its members have no menu.
- **A removed rule** fades its name and strikes its statement and its error message through
  (U18 `6163:5856` draws no message).
- **Several result links** (U37 `6396:47723`): spec 001's link card, with each variant's name and
  (i) above its URL row and the number beside the title. With Standard only, spec 001's card as
  it was (W2). U37's line "Your form reads the shared data from here. Each variant has its own;
  use the one your form shows." isn't built: the card's (i) explains the link.
- **Add variant**: the name field keeps spec 001's `TextField`, 8px shorter than Figma's label
  row with Revamp's baseline padding.

### Deleting a rule (U14 `6113:29056`, `6113:29469`)

As designed: title "Delete Rule 03?", a body that says what applicants will no longer be checked
for, ending "You can undo this right after.", buttons "Cancel" / "Delete rule" (danger). Toast
"Rule 03 in Standard deleted." with "Undo" (F29).

- **Body (built, T036)**: the rule's statement in quotes, "Applicants will no longer be checked
  for “Driving licence – Licence classes includes one of B, BE”. You can undo this right after."
  A rule kept incomplete ("Save changes", F10) has no statement: "You can undo this right
  after." alone.
- **Duplicate** (U14's menu): no toast, since no frame draws one; the focus moves to the copy,
  "Rule 06", at the end of the list.

## 5. Groups (S2, S4)

### Ungroup and Delete group (W8; built from U14 `6094:6413`, `6094:6320`, `6113:29056`, `6113:29469`)

- **Menu items** in a group's and a sub-group's ⋯ menu: "Ungroup", "Delete group", and W6's "Add
  error message" / "Remove error message". In a variant based on Standard, an inherited group's
  menu offers "Remove" / "Restore" instead of "Ungroup" and "Delete group" (W4).
- **Confirmation** (proposed), like the rule's:
  - Title: "Delete Group 01?" (the item's name, so "Delete Sub-group 01?" for a sub-group).
  - Body: "Group 01 and the rules in it will be deleted. You can undo this right after." With a
    sub-group inside: "Group 01 and the rules and sub-group in it will be deleted. You can undo this
    right after."
  - In Standard, with variants based on it, the body follows F14's sentences, with "this group" for
    "this rule": "This group and the rules in it will be removed from Standard and from the variants
    that follow them." Then the variants that changed one of its rules: "Ambulance changed Rule 02
    and keeps its own version." Then "You can undo this right after."
  - Buttons "Cancel" / "Delete group" (danger).
- **Toasts** (final), with "Undo":
  - "Group 01 in Standard ungrouped."
  - "Group 01 in Standard deleted."
  - The same with "Sub-group 01" for a sub-group.

## 6. Publish and save dialog (S5)

Spec 001's dialog, extended (W7). The copy spec 001 already built stays, such as "Publishing…",
"Saving…", "Couldn’t save" and "Nothing was saved. Check your connection and try again."

### Summary (U33 `6376:26181`)

- Title "Ready to publish?"; in the edit flow, "Ready to save?" (proposed).
- Intro: "Once you publish, the connection goes live and you can add it to your form." In the edit
  flow: see F27 below.
- A two-column summary table with the labels "Documents" and "Rules":
  - Documents, one line each: "Personal ID · 7 data items" ("1 data item" for one).
  - Rules, one line per variant in tab order: "Standard · 5 rules", "Ambulance · 1 rule".
    A variant without rules (proposed): "School transport · No rules".
  - A variant's count is the rules that apply in it: removed rules don't count, groups aren't
    counted, the rules in them are.
  - The lines are evenly spaced; U33's extra gap before "School transport" is a slip.
- No "Goes live" row (F22) and no warnings line (F21).
- Buttons: "Check rules again" / "Publish" ("Save" in the edit flow).
- Failure, as U35 `6376:27178`: alert "Couldn’t publish", body "Nothing went live. Check your
  connection and try again." (spec 001's), buttons "Check rules again" / "Try again".

### Editing a live connection (F27; U38 `6396:49030`)

U38's "Edit this live connection?" ("Applicants can keep using the live connection while you edit.
Your changes only go live when you publish again.") isn't shown on entry. **Decision
(proposed)**: its message moves to the save dialog's intro, in the edit flow's words:
"Applicants keep using the current version until you save. Requests already in progress keep the
data and rules they started with." It replaces spec 001's `editNote` there.

### When another team member saved the rules (W9)

Shown in the save dialog when the API answers `409 rules_changed`, as a KERN alert in the place of
U35's failure alert (proposed):
- Alert title: "The rules changed since you opened them"
- Alert body: the API's message as it comes, such as "Another team member saved the rules of this
  connection after you opened it. Replacing their changes deletes the variant School transport and
  brings back the variant Taxi with a new result link." (contracts/management-api.md), then:
  "Reload to see their changes; your unsaved changes are lost. Or replace their changes with
  yours."
- Buttons: "Reload" (secondary) / "Replace their changes" (primary).

### Publishing without rules (FR-001)

From the Documents step while no variant has rules: spec 001's dialog with the title "Publish
without rules?" (U36, P6), and from the Rules step the footer button "Publish without rules", as
designed (F10, F17).

- U36 `6376:27630`: intro "Without rules, anyone who shares these documents can apply.", the
  Rules row "No rules", and the secondary button **"Add rules"**, which closes the dialog and
  opens the Rules step. In the edit flow the title reads "Save without rules?" (proposed).
- From the Rules step, the footer's "Publish without rules" opens "Ready to publish?", whose Rules
  row reads "Standard · No rules".

### A refused Publish or Save (F11; built, T041)

No frame. The step shows a KERN danger alert above the rules card, titled with spec 001's
"Couldn’t publish" ("Couldn’t save" when editing), whose text is the refusal's message, such as
"Rule 02 in Standard has no error message."; the focus moves to the rule it names, which carries
the same message as its flag (U27 `6197:10704`).

## 7. Details (S6)

No copy is left open for the details by these notes: F24–F26, F31, W1 and W2 in
contracts/ui-screens.md say what to build, and the rules card keeps "View summary" / "Hide
summary" (FYI #17). Text rules read as in section 3.

Built (T043), where U37 leaves the wording open:
- The card's title is "Rules" (U37: "Summary"). T043 also built the hint "1 variant · 5 rules"
  under it; T077 removed it (2026-10-26), since it is one of the counters F25 drops (U37
  `6396:47754`; spec Clarification 2026-10-24: no counters).
- A variant without rules (proposed): "No rules. Anyone who shares the requested documents can
  apply."

Built (T071, 2026-10-25), decided by the user where U37 draws nothing (node discovery's UNCERTAIN
item): **"Edit rules"** sits in the rules card's header, in the place of Figma's "Download PDF"
(U37 `6396:47755`, dropped by F25), and is styled like it: a KERN secondary button with the edit
icon, left of "View summary", so it shows while the card is closed. It opens the edit wizard at
the Rules step (FR-030), with no question on entry (F27); saving asks in the save dialog (W7,
§6). Below 640 px the actions wrap under the title, and "Edit rules" shows only its icon, as the
details' footer does. The footer keeps "Edit documents"; U37's footer "Edit connection" (F27)
isn't built.

## 8. Open points

The API's `409 rules_changed` message says "result link", as the UI does (decided 2026-10-25:
spec Assumptions "Design", contracts/management-api.md, T068). What the accessibility review and
the coverage check leave open is in §10 ("Left to decide") and §11 ("Unresolved").

## 9. Tokens (T003)

`get_variable_defs` on the root `6263:12360` is refused (the root is a page), so it ran on each of
the page's 15 sections; together they cover every frame.

### What the file's variables are

The file binds KERN's variable names, but with the values of an unreleased KERN ("KERN Revamp" in
its component descriptions). `@kern-ux/native` 2.8.2, the app's and the latest release, has other
values for most of them:

| Group | Same in KERN 2.8 | Different |
|---|---|---|
| Spacing `metric-space-*` (0–160) | all | – |
| `metric-dimension-*`, `metric-border-width-*`, `metric-baseline-*`, `component-alert-icon-size` | all | – |
| Font weights (`body` 400, `title` / `label` / `heading` 600, `heading-balanced` 500, `label-subtle` 400) | all | – |
| Opacities `action-state-opacity-disabled` 40 %, `-overlay` 72 % | all | – |
| Radii | `none` 0 | `small` 4 (KERN 2), `default` 8 (KERN 4), `large` 12 (KERN 8), `circle` 9999 (KERN 50 %) |
| Font sizes | `x-large-adaptive` 32 | `small-static` 14 (KERN 16), `medium-static` 16 (18), `large-static` 18 (21), `medium-adaptive` 18 (21), `large-adaptive` 24 (26), `2x-large-adaptive` 40 (48) |
| Line heights | `medium-static`, `medium-adaptive` 24; `large-adaptive` 32; `x-large-adaptive` 40 | `large-static` 24 (32), `2x-large-adaptive` 48 (56) |
| Colours | `layout-background-default`, `action-on-default` (#ffffff) | every other colour, below |

### Decision (2026-10-25): map by name, keep KERN 2.8's values

Asked and decided with the team: the UI tasks use the KERN 2.8 token that has the Figma variable's
name, with KERN 2.8's value, so that the rules screens match spec 001's. A visual check compares
the token, not the value: a value that differs only because Figma has the Revamp value is listed as
"KERN 2.8 vs Revamp (design-notes §9)", not fixed. Nothing in `index.css` overrides KERN.

The Figma frames' adaptive type (18/24/32/40) is therefore drawn with KERN 2.8's small-screen
values that `index.css` already pins (21/26/32/48), and their static type with KERN 2.8's (16/18/21).

### Colours

Light theme. `-contextual` and plain variables map to the same token (`-contextual` is KERN's
layer-aware alias, which is the plain one on the page's layer). The KERN Tailwind theme has
classes for most of them (`text-kern-layout-text-default`, `bg-kern-feedback-danger-background`);
`layout-background-default-surface`, `decorative-border-default`, `decorative-border-level-1`,
`decorative-brand-default`, `feedback-default` and `feedback-default-background` have none, and
take the variable, as spec 001 does: `border-(--kern-color-decorative-border-default)`.

| Figma variable | Figma | Token (Tailwind class) | KERN 2.8 |
|---|---|---|---|
| `layout-text-default(-contextual)`, `action-state-indicator-shade` | #0b1220 | `--kern-color-layout-text-default` (`text-kern-layout-text-default`) | #131525 |
| `layout-text-muted(-contextual)` | #4a5468 | `--kern-color-layout-text-muted` | #51577a |
| `layout-text-inverse(-contextual)` | #ffffff | `--kern-color-layout-text-inverse` | #f3f4f7 |
| `layout-background-default(-contextual)` | #ffffff | `--kern-color-layout-background-default` | #ffffff |
| `layout-background-hued`, `layout-layer-surface-contextual` | #f2f5fb | `--kern-color-layout-background-hued`, `--kern-color-layout-background-default-surface` | #f3f4f7 |
| `layout-border(-contextual)` | #6b7488 | `--kern-color-layout-border` | #6e7597 |
| `decorative-border-default`, `decorative-border-contextual` | #e1e6f0 | `--kern-color-decorative-border-default` | #c0c3d5 |
| `decorative-border-level-1` | #d0d8e6 | `--kern-color-decorative-border-level-1` | #a9aec6 |
| `decorative-brand-contextual` | #4f8cff | `--kern-color-decorative-brand-default` | #454b6b |
| `action-default(-contextual)`, `action-state-indicator-default` | #1d56f0 | `--kern-color-action-default` | #2044aa |
| `action-on-default(-contextual)` | #ffffff | `--kern-color-action-on-default` | #ffffff |
| `form-input-border-contextual` | #22293a | `--kern-color-form-input-border` | #1d2034 |
| `feedback-info(-contextual)` | #0284c7 | `--kern-color-feedback-info` | #006b8c |
| `feedback-info-background-contextual` | #e0f2fe | `--kern-color-feedback-info-background` | #c0f3ff |
| `feedback-success(-contextual)` | #1d7a2e | `--kern-color-feedback-success` | #007155 |
| `feedback-success-background(-contextual)` | #eaf7e6 | `--kern-color-feedback-success-background` | #cdf2e4 |
| `feedback-danger(-contextual)` | #c4271c | `--kern-color-feedback-danger` | #c31c13 |
| `feedback-danger-background-contextual` | #fef1f0 | `--kern-color-feedback-danger-background` | #fee4e0 |
| `feedback-warning-contextual` | #9a4a00 | `--kern-color-feedback-warning` | #925400 |
| `feedback-warning-background-contextual` | #fff4e0 | `--kern-color-feedback-warning-background` | #ffe7b6 |
| `feedback-default-contextual` | #4a5468 | `--kern-color-feedback-default` | #454b6b |
| `feedback-default-background-contextual` | #eef1f6 | `--kern-color-feedback-default-background` | #dfe1ea |
| `layout-background-inverse` | #0b1220 | none; only the navy wizard header uses it, and the header stays spec 001's (F28) | – |
| `variant-changed-contextual` | #9a4a00 | project token `--color-variant-changed` (`text-variant-changed`) = `--kern-color-feedback-warning` | #925400 |
| `variant-changed-background-contextual` | #fff4e0 | project token `--color-variant-changed-background` = `--kern-color-feedback-warning-background` | #ffe7b6 |
| `variant-new-contextual` | #8a22b5 | project token `--color-variant-new` = `--kern-color-violet-650` | #8a22b5 |
| `variant-new-background-contextual` | #f8f1fc | project token `--color-variant-new-background` = `--kern-color-violet-025` | #f8f1fc |

### The variant marks and group frames

**Decision (2026-10-25)**: the four `variant-*` variables, which KERN has no semantic token for,
are project tokens in the `@theme` block of `frontend/src/index.css`, defined by KERN tokens.
"Changed here" takes KERN's warning colours, as Figma itself gives it the values of its
`feedback-warning`; "New addition" takes KERN's palette violet, which Figma's values equal.

| Mark (Figma) | Row | Tag (white chip, `label/small`) | Contrast (WCAG 2.1) |
|---|---|---|---|
| "Changed here" (U17 `6134:9009`) | `bg-variant-changed-background` | `text-variant-changed` on `layout-background-default` | tag 6.0:1; row text 14.9:1, rule name 7.0:1, muted 5.8:1 |
| "New addition" (U17 `6134:9064`) | `bg-variant-new-background` | `text-variant-new` on `layout-background-default` | tag 7.1:1; muted 6.3:1 |
| "Removed" (U18 `6163:5856`) | no tint; content at `action-state-opacity-disabled` (40 %), struck through | `feedback-default` on `feedback-default-background` | tag 6.5:1 |

The faded content of a removed row is exempt as inactive content, and the tag carries the state in
text (FR-023, SC-009). Group frames (U14 `6094:6413`) use only KERN tokens: the group's name in
`action-default`, its count and hints in `layout-text-muted`, the title in `title/default`.

### Effects and text styles

- "Elevation/Menu" (#13152529, 0 10 28) is `--shadow-menu`; "Elevation/Card" is `--shadow-card`
  (spec 001). The toast "Rules/Toast" has a menu-like drop shadow (0 10 14, 16 %) without an
  effect style; it uses spec 001's toast (`--shadow-toast`).
- Text styles map to KERN's type classes by name: `heading/display`, `heading/x-large`,
  `heading/large`, `title/large`, `title/default`, `title/small`, `label/default`,
  `label/default_subtle`, `label/small`, `label/Action/small_underline` (a small KERN link),
  `body/large/regular`, `body/default/regular`, `body/small/regular`.
- `metric-grid-col-overflow-6` (1536) is only the dialogs' `max-width`, which KERN's dialog sets
  itself.

No other value lacks a token, so nothing else was added.

## 10. Accessibility review (T076, 2026-10-26)

Spec 001's walkthrough (its quickstart V9) applied to the Rules step, the rule editor, the variant
dialogs and menus, the publish dialog and the details' rules card (quickstart V7, SC-009): with
the keyboard only, in Chromium at 1280, 640 (200 % zoom) and 320 px, reading the accessibility
tree, plus a static review of the components. axe couldn't be run (loading it into the page was
not allowed in this session), and no screen reader was used: run NVDA or VoiceOver over V7 before
the release.

**Passed as built**: marks carry text ("Changed here", "New addition", "Removed"); ≥, < and = are
`aria-hidden` everywhere, and the statement's words carry the condition; connectors are menu
buttons named after their level ("AND, switch Sub-group 02 to AND or OR") with
`menuitemradio` items; the ⋯ menus, the tabs (arrow keys, Home, End) and select mode work with the
keyboard, and select mode announces "2 rules selected"; the (i) tooltips open on keyboard focus,
describe their button and close on Escape; dialogs are modal, labelled, and give the focus back;
saving a rule announces "Rule 05 in Standard saved." and focuses its row; a refused Save focuses
the rule it names, with the alert.

**Fixed** (behaviour or layout that differs from Figma only where Figma can't hold it):
- **Reflow at 320 px and 200 %** (WCAG 1.4.10):
  - the group's and the rule's message fields collapsed to 0 px beside their label: they now wrap
    under it (`GroupMessage`, `MessageField`);
  - below 768 px the rule editor's pickers wrap a long choice and their menus hang from the
    editor's content edge (`Picker`, `ChoicePicker`, `ChoiceMenu`, `ValuesPicker`);
  - every other popup opens to the side where it fits, measured as it opens
    (`utils/popupPlacement.ts`): the ⋯ menus, the connector menu, "Copy to variant" and the (i)
    tooltips. This also fixes the first variant tab's ⋯ menu, which opened off the left edge at
    1280 px. Where neither side fits, the popup spans the rules card or the page, under its
    control, and a tooltip then has no arrow;
  - a long variant name wraps in its tab;
  - the publish summary puts the lines under their label below 640 px.
- **Keyboard** (2.1.1): Tab reaches "Add it in Documents" in the data menu, which closes once the
  focus leaves it; "Copy to variant" closes when the focus leaves it too.
- **Errors** (3.3.1, 4.1.3): "Save rule" on an incomplete rule now says what is missing under the
  check row, in the server's words ("Rule 05 in Standard: choose the data to check.", "… has no
  error message."), announced, and moves the focus to that picker, value or message, which the
  text describes. A rule on data no longer requested says so there, not only in red. A refused
  variant name and a refused rename are announced.
- **Focus** (2.4.3): a refused Publish keeps the focus on the rule it names, also when it closed an
  empty rule editor; select mode's Cancel with no rule ticked goes to the level's "Add rule"; the
  focused rule or group is described by its problem note.
- **Structure** (1.3.1, 4.1.2): the variants' tab list owns only the tabs (`aria-owns`), not their
  (i) and ⋯; the menus' section headings name their groups without being content of the list box,
  and "No options match" is announced outside it; the values picker is a disclosure, since its
  menu holds checkboxes; the publish summary is one `<dt>` and one `<dd>` per row.
- **Timing** (2.2.1): a toast with an action, Undo or Show, stays in the Rules step until the next
  change drops its action, then goes after its 6 seconds, so that keyboard users can reach the
  action. Spec 001's documents toast is unchanged.
- **Hints**: the Rules step shows three hints the audit keeps ("Settled as designed"), which T039
  and T037 hadn't built: U30's "Check the time since or until this date, or compare it with a
  fixed date." for dates other than the Date of birth (F3), U11's "Applicants who turn 21 that day
  count.", and U32's "Place of birth has parts. Choose the part to check.".

**Left to decide** (design choices that the review questions; not changed):
- Removed rows fade to 40 % (§9): text then measures 2.56:1, muted text 1.89:1. §9 counts it as
  inactive content, which WCAG 1.4.3 exempts for inactive *controls* only. Keeping the fade with
  the "Removed" tag is defensible, but a reviewer may count it as a failure. Default text reaches
  4.5:1 from 60 % (4.74:1), muted text from 85 % (4.84:1).
- Value fields, pickers and search fields have the decorative border (1.75:1 on white). Value
  fields have no visible label, so the border is what shows them (1.4.11 asks for 3:1); KERN's
  input border (`layout-border`, 4.51:1) would pass.
- The chosen option in a choice menu is marked by a 1.1:1 background only; a tick, as the
  connector menu has, would pass 1.4.11 and 1.4.1.
- "Remove from this variant", "Restore", "Reset to Standard" and "Remove error message" change the
  page without a toast, so a screen reader hears nothing; F29 sets no toast for them.
- Every "Add rule" has the same name; the group around each one names its level.

## 11. Coverage of the Figma deviations (T077, 2026-10-26)

Every item of the coverage index of contracts/ui-screens.md, F1–F32 and W1–W9, is cited by a done
task and built as the item prescribes, after these corrections:
- **F3**: dates other than the Date of birth showed the Date of birth's hint; they now show U30's
  (§10, "Hints").
- **F25**: the details' rules card showed "1 variant · 5 rules", a counter F25 drops; removed
  (§7).
- **"Settled as designed"**: three of its five editor hints were missing; built (§10, "Hints").

The publish dialog (S5) lists one line per variant ("Standard · 5 rules"), as U33 `6376:26181`
and §6 have it. The S5 nodes that ui-screens.md cites for F1 and F5 (U33 `6376:25778`,
`6376:25788`; U34 `6383:66110`; U35 `6376:26339`) are the Rules step's rule rows behind the
dialog's scrim, which `RuleRow` builds; T042's "its rules as statements" and T052's groups "in the
publish dialog" describe those rows, not the dialog.

**Unresolved**:
- **The visual-verification tables** that every UI task lists its prescribed differences in
  (CLAUDE.md, "Figma implementation workflow") were reported during implementation and not kept
  in the repository, so this check can't confirm them from the files. Future UI tasks should
  append their table to this file.
- **Figma itself** still shows every deviation; the items stay in force until the design is
  updated (ui-screens.md, "Deviations from Figma").
