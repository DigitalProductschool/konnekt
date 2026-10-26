# Contract: management UI screens, with rules and branches

**Users**: signed-in DO.IT team members (FR-031). **Requirements**: FR-001 to FR-008, FR-010,
FR-019 to FR-024, FR-026, FR-028 to FR-030, SC-001, SC-002, SC-007 to SC-009; US1 to US4.
**Decisions**: research R10, R13; the spec's Clarifications; the Figma audit
([../figma-audit/report.md](../figma-audit/report.md)).

This extends spec 001's screen contract
([../../001-servicebw-eudi-middleware/contracts/ui-screens.md](../../001-servicebw-eudi-middleware/contracts/ui-screens.md)),
which still applies: routes, sign-in, the overview, the wizard frame, the details' status actions,
and the accessibility rules. Every screen gets its data only through
[management-api.md](management-api.md).

**What decides what**: **spec.md, including its Clarifications, decides behaviour and wording.**
**Figma decides layout and styling only.** The Figma file (`s8mU9oJDq3411e8bxMjQO9`, root
`6263:12360`, flow "Connection Portal, log in to publish") is out of sync with the spec and won't be
updated soon. Where the two differ, the section [Deviations from Figma](#deviations-from-figma)
says what to build, item by item. The UI says "connection" for form connection and "variant" for
branch (spec Assumptions, "Design"); the main branch is called "Standard" until renamed.

## Routes

No new route. The create and edit wizard gains a step.

| Route | Screen | What changes |
|---|---|---|
| `/form-connections/new`, `/get-started` | Create wizard | Steps Connection → Documents → **Rules** → Publish (FR-001) |
| `/form-connections/:id/edit` | Edit wizard | The same steps; the details can open it at the Rules step (FR-030) |
| `/form-connections/:id` | Details | One pull URL per branch (FR-026) and the rules of every branch (FR-030) |

The progress bar (`WizardProgress`, `CONNECTION_STEPS`) gains the Rules step with Figma's label
(U11 `6348:40209`).

---

## Screens and behaviour

The screen ids S0–S7 are used in [Deviations from Figma](#deviations-from-figma) and in the tasks.

### S0. Wizard shell (every step, create and edit)

- Spec 001's `WizardLayout`: the header names the connection, the progress shows the steps, the
  action bar has **Back** and one primary action. Header and action bar stay in place while the
  step scrolls (CLAUDE.md).
- Nothing is stored before Publish or Save: no drafts (spec 001).

### S1. Documents step

- As in spec 001, plus:
- **Removing a document, or deselecting a field, that rules check** in any branch opens a dialog
  that names those rules with their branches, before the change is made (FR-029, US4-AS3). This
  includes the select-all checkbox. After confirming, the rules stay and publishing or saving is
  refused while they remain (FR-006).
- **Footer**: "Add rules →" goes on to the Rules step. "Publish without rules" ("Save without
  rules" when editing) is offered only while no branch has any rule (FR-001).

### S2. Rules step: frame, rule list and groups

- **Tabs**: one tab per branch, main branch first, and "+ Add variant", from the start of the step,
  also before the first rule and while it is being edited (FR-019).
- **Empty state**: "No rules yet" with "+ Add rule", in every branch without rules (FR-001, EC-17).
- **Rule list**: each rule shows its name and its statement in FR-005's words, such as "Personal ID
  – Date of birth (Age) is at least 21 years old" (the rules' name for the field since
  2026-10-26, rules-ui-fixes B7), and its error message. Decoration symbols (≥, <, =)
  are hidden from assistive technologies (FR-005). Identifiers aren't shown here (FR-010).
- **AND and OR**: a connector between every two items of a level; switching one switches the whole
  level (FR-007).
- **Groups and sub-groups**: select two or more items to group them; a group's members can form a
  sub-group; a sub-group offers no further grouping (FR-008, US2-AS6). A group's or sub-group's
  menu adds or removes its own error message, shown under its header (FR-004), and offers
  "Ungroup" and "Delete group" (W8, US2-AS8). Deleting a member below two dissolves the group
  (FR-008, US2-AS7). A sub-group that reaches the top level becomes a group, with its identifier,
  name, AND/OR and message (FR-008).
- **Order**: rules and groups keep the order in which they were added; a new group takes its first
  member's place. There is no reordering (FR-007).
- **Rule actions**: edit, rename, duplicate, copy to other variants, delete with confirmation and
  undo (Clarifications 2026-10-24; FR-022 for identifiers).
- **Names**: renaming happens inline; a name used twice in a branch is refused there, naming the
  branch (FR-005). "Rule NN", "Group NN" and "Sub-group NN" are kept for the item with that
  number: "Rule 08 is kept for the rule numbered 08." In a based branch, the names that an undo or
  a restore could bring back count as taken (FR-005).
- **Problems**: a rule that checks data no longer requested shows a banner and an inline flag that
  name the rule and its branch (FR-006).
- **Footer**: Back to Documents; the primary action is "Publish" ("Save" when editing), or
  "Publish without rules" only while no branch has any rule and no rule editor is open (FR-006).
  Publish and Save stay enabled; an attempt with problems is refused with a message that names the
  problem, the rule and its branch, and the focus moves to it (FR-006).
- **Unsaved rule editor**: Publish, Save, leaving the editor and "Add it in Documents" first ask
  "Save changes to Rule 01?" (FR-006).

### S3. Rule editor

- Opened by "+ Add rule" or by editing a rule. It shows the rule's name (default "Rule NN",
  FR-005).
- **Choosing the data**: document → data → part (for fields made of parts) → check → value, each
  unlocked in order. Only the documents and fields the connection requests are offered; images are
  listed as "Can't be checked" (FR-002). Long menus have a search field (FR-002e–g, FR-003p).
- **Checks**: the conditions of the field's kind, in FR-003's words (data-model.md,
  "Conditions"). Text conditions have their own letter-case checkbox, unchecked by default
  (FR-013). Date conditions show the counting note and the missing-value note (FR-003, FR-014).
- **Error message**: proposed once the condition is complete, matching it; editable (FR-004).
- **Save rule** stays disabled until the rule is complete, with inline flags (Clarifications,
  2026-10-24); the footer's Publish or Save still checks everything (FR-006).

### S4. Branches (variants)

- **Add variant**: name, optional description, and "Start with": based on Standard, or empty
  (FR-019, FR-020). The description shows in a tooltip from an (i) right after the branch's name,
  on hover and on keyboard focus; no (i) without a description (FR-020).
- **Tab menu**: "Rename" for every branch, main included, opens the same dialog titled "Edit
  variant", without "Start with"; "Delete" for every other branch, after a confirmation (FR-020).
- **Marks** in a based branch: "Changed here", "New addition" and "Removed", each with colour and
  text (FR-023, SC-007); removed items stay visible and can only be restored (FR-024); undo returns
  an item to following the main branch (FR-024), and so does an edit that makes a changed item
  equal to the main branch's again (FR-024). A switched top-level AND/OR is marked too (FR-021).
  An inherited group's menu offers "Remove" and "Restore", not "Ungroup" or "Delete group" (W8).
- **Following the main branch**: changes to the main branch show at once in every based branch, as
  data-model.md "Propagation from the main branch" says (FR-021, FR-022).
- **Copy to variant**: copies a rule to chosen branches as a new rule at the end of their top level
  (FR-022). Choosing Standard covers the branches based on it: they show as included and can't be
  chosen on their own. A copy from a based branch to Standard also appears, linked, in that branch
  (FR-021, FR-022).

### S5. Publish and save dialog

- Spec 001's dialog, extended: it summarises the documents and, for each branch, its rules (FR-028;
  Clarification 2026-10-24). "Publishing…", then the details; on failure, "Couldn't publish" with
  "Try again", and nothing has changed (FR-028).
- When another team member saved the rules after the editor opened them (`409 rules_changed`), the
  dialog says so, names any branch that replacing would delete or bring back with a new pull URL,
  and offers "Reload" or "Replace their changes" (FR-028, W9).
- From the documents step while no branch has rules: "Publish without rules?" (FR-001).
- No go-live date: publishing goes live at once (spec Assumptions, "Out of scope").

### S6. Details, also right after publishing

- **URLs**: the trigger URL once, and one pull URL per branch, labelled with the branch's name and
  its (i), each with "Copy link" (FR-026, US3-AS7). A connection with only the main branch shows
  its URLs exactly as spec 001 does (FR-026).
- **Rules**: in a collapsible card, collapsed by default: one read-only section per branch, in the
  layout of the rules step, with names, identifiers, statements, groups with AND/OR and their own
  messages, and the marks with removed items (FR-030, FR-010).
- **Changing them** leads to the Rules step of the edit wizard (S7) (FR-030).

### S7. Edit flow

- The create wizard's steps, with "Save" as the primary action, opened from the details at the
  Rules step or at the start (FR-030, US4). No confirmation on entry; the save dialog (S5) asks
  before saving. Requests already in progress keep their rules (FR-028).

### Accessibility (SC-009)

Spec 001's rules apply (keyboard, focus, labels, announced status messages, contrast, 200% zoom,
320 px). In addition:
- Branch marks are never colour alone: each has its text, such as "Changed here" (FR-023).
- ≥, < and = chips are `aria-hidden`; the statement's words carry the condition (FR-005).
- AND/OR connectors are buttons whose accessible name says the level they switch.
- The (i) tooltips open on keyboard focus and are announced (FR-020).
- Menus, the tab menu and the select mode work with the keyboard; KERN dialogs keep the focus
  inside and return it to the control that opened them.
- After a refused Publish or Save, the focus moves to the rule or field the message names.

---

## Deviations from Figma

Figma is out of sync with spec.md and won't be updated soon. The audit's decided items say what to
build instead, until the design is updated:

- **F# items** ("Figma must change (decided)"): the frame exists, but its behaviour or wording is
  wrong. Build the spec's behaviour and wording, with the frame's layout and styling.
- **W# items** ("Build without frames (decided)"): the spec needs something no frame draws. Build it
  from the frame or KERN pattern named below. W1–W7 come from the audit; W8 and W9 from the
  requirements checklist ([../checklists/rules-logic.md](../checklists/rules-logic.md)), decided
  in the spec's Clarifications, "Session 2026-10-24 (requirements checklist)" (CLAR checklist).

Node-ids are in file `s8mU9oJDq3411e8bxMjQO9`; units (U06–U38) are listed in
[../figma-audit/units.md](../figma-audit/units.md). An item that spans several screens is listed
under each, with that screen's node-ids. The decision column cites the spec's Clarifications
(CLAR, by date and number in the report) or a standing rule of the audit (RULE).

**Rule for tasks**: every UI task in `tasks.md` cites the F# and W# items it covers, for example
"Build the date conditions of the rule editor (S3; F3, F4)". A UI task without a citation, or an
item that no task cites, is a gap. During implementation, a difference from Figma that an item
prescribes is listed with its item number in the visual-verification table, not fixed (CLAUDE.md,
"Figma implementation workflow").

### S0. Wizard shell

Units: every wizard unit U07–U36, header and footer.

| # | Figma (node-ids) | Figma shows | Build instead | Decided by |
|---|---|---|---|---|
| F28 | Draft badge: U07 `6235:16742`, U08 `6235:17199`, U09 `6235:18397`, U10 `6324:40002`, U11 `6348:40210`, U12 `6350:41090`, U13 `6357:42623`, U14 `6094:6128`, U15 `6344:53318`, U16 `6344:53507`, U17 `6134:8516`, U18 `6163:4851`, U19 `6344:53698`, U20 `6344:53875`, U21 `6168:7005`, U23 `6185:8556`, U24 `6191:42066`, U25 `6196:10233`, U26 `6196:10568`, U27 `6197:10683`, U28 `6197:10964`, U29 `6197:11647`, U30 `6324:15411`, U31 `6324:16744`, U32 `6324:17628`, U33 `6376:25343`, U34 `6383:66098`, U35 `6376:26327`, U36 `6376:27342`.<br>"Save and exit": U07 `6235:16862`, U08 `6235:17424`, U09 `6235:18684`, U10 `6324:40069`, U11 `6348:40218`, U12 `6350:41105`, U13 `6357:42646`, U14 `6094:6195`, U15 `6344:53339`, U16 `6344:53528`, U17 `6134:8551`, U18 `6163:4896`, U19 `6344:53747`, U20 `6344:53924`, U21 `6168:7044`, U23 `6185:8576`, U24 `6191:42089`, U25 `6196:10256`, U26 `6196:10591`, `6197:12009`, U27 `6197:10714`, U28 `6197:10987`, `6197:11097`, U29 `6198:12366`, U30 `6324:15434`, U31 `6324:16767`, U32 `6324:17651`, U33 `6376:25361`, U34 `6383:66116`, U35 `6376:26345`, U36 `6376:27409` | A "Draft" status badge in the wizard header; "Save and exit" in every footer, also while rules check removed data | No draft badge: the header is spec 001's. The footer has Back and the primary action only (F10 for the Rules step, F17 for the Documents step). No "Save and exit" | CLAR 2026-10-24 #26 (and #16) |
| F19 (sticky bars) | U06 `6235:19052`; U17 `6148:4674` | Sticky header and footer frames, with their annotations | Spec 001's wizard shell (`WizardLayout`), whose header and action bar already stay in place while the step scrolls. Nothing else is built for them | CLAR 2026-10-24 #26 |

### S1. Documents step

Units: U06–U10, and the documents step behind U36.

| # | Figma (node-ids) | Figma shows | Build instead | Decided by |
|---|---|---|---|---|
| F17 | U09 `6235:18684`, `6235:19019`; U10 `6324:40069`, `6324:40394` | "Publish without rules" on the documents step while branches have rules | Offer it only while no branch has any rule. Otherwise the footer offers only "Add rules →" | CLAR 2026-10-24 #17 (FR-001c, OUT-34) |
| F18 | U06 `6235:19061`; U07 `6242:18487`, `6235:16997`; U08 `6242:18495`, `6242:18503`, `6235:17314`, `6235:17317`; U09 `6235:18711`, `6235:18758`; U10 `6324:40071`, `6324:40396`, `6324:40019` | A count-only removal dialog ("2 rules use its data and will need to be changed."); removal at once with no names; copy that mentions only publishing | Use U10's dialogs ("Remove Personal ID?", "Stop requesting Date of birth?"), which name the rules with their branches, for every removal or deselection of data that rules check, including through the select-all checkbox. After confirming, publishing and saving are refused while those rules remain (F11). In the edit flow the copy reads "… before you save." | CLAR 2026-10-24 #16 (FR-029, US4-AS3) |
| F19 | U06 `6235:19050`–`6235:19061`; U07 `6235:16794`, `6257:15055`, `6257:15064`, `6257:15112`, `6235:16855`, `6235:16857`, `6242:18632`, `6242:18633`, `6242:50494`, `6242:51053`, `6235:16980`, `6235:16987`, `6235:17135`; U08 `6257:15151`, `6257:15160`, `6235:17304`, `6242:18503`, `6242:18522`, `6235:17311`, `6235:17422`, `6235:18227`, `6235:18310`, `6242:18586`, `6242:51200`; U09 `6235:18449`, `6257:15277`, `6235:18502`, `6235:18523`, `6235:18671`, `6235:19045`, `6257:15312`; U10 `6324:40008`, `6324:40010`, `6324:40065`; U36 `6376:27347`, `6376:27405` | A redesigned documents step: search with suggestions and an "Upcoming" catalogue; an added-documents list with a counter and a pager; dashed empty panels and animations (with reduced motion); inline Remove on hover and an undo toast; nothing-chosen validation; a 10-document catalogue (Student ID …) | Spec 001's documents step as built. Spec 002 adds only F17 and F18's dialog | CLAR 2026-10-24 #26 (OUT-24; #36 supersedes it only for the rule editor's aids) |
| F20 | U08 `6235:18042` (list `6235:17929`) | The driving licence's "Age over 18" can be requested | Not in the catalog: age is checked through the Date of birth. "Age in years" and "Year of birth" stay as number fields | CLAR 2026-10-24 #27 (OUT-30) |

No W# item on this screen.

### S2. Rules step: frame, rule list and groups

Units: U14, U15, U16, U21, U27, U28, U29; the saved rows of U11 and U12; the tab row and footers of
the rule-editor units.

| # | Figma (node-ids) | Figma shows | Build instead | Decided by |
|---|---|---|---|---|
| F1 | Saved rows: U11 `6348:40889`; U12 `6350:41102`; U14 `6094:6469`, `6094:6276`, `6094:6357`, `6094:6223`; U15 `6344:53330`, `6344:53336`; U16 `6344:53519`, `6344:53525`; U21 `6168:7017`, `6168:7226`; U27 `6197:11416`; U28 `6197:11073`, `6197:11087`, `6197:11090` | "Personal ID · Date of birth ≥ at least 21 years old" ("·", no "is") | "Personal ID – Date of birth is at least 21 years old" in every saved statement: "–" between the document, the field and the part; "is" before the condition. Further examples: "Driving licence – Licence classes includes one of B, BE", "Driving licence – Licence class B – Issue date is at least 2 years ago". The ≥, < and = chips stay as decoration that assistive technologies don't announce. "old" appears only on the Date of birth | CLAR 2026-10-24 #28 (and #1) |
| F2 | Saved rows: U14 `6094:6521`; U15 `6344:53333`; U16 `6344:53522`; U21 `6168:7020`; U27 `6197:11419`; U28 `6197:11076` | "≥ at least 6 months left" | "Driving licence – Expiry date is at least 6 months from now", and "is less than 6 months from now". No "left"; "≥" is decoration | CLAR 2026-10-24 #33 |
| F8 | Saved row: U27 `6197:10699` | "includes" / "doesn't include" | "includes one of" / "includes none of", for every enum field and any number of values | CLAR 2026-10-24 #6 |
| F10 | Footers: U11 `6348:40236`, `6348:40255`, `6348:40542`, `6348:40759`; U13 `6357:42646`, `6357:42905`; U24 `6191:42089`, `6191:42283`; U25 `6196:10256`, `6196:10407`, `6197:11782`; U26 `6196:10591`; U28 `6197:10987`; U30 `6324:15434`; U31 `6324:16767`, `6324:16932`, `6324:17208`, `6324:17375`; U32 `6324:17651` | "Publish without rules" while a rule editor is open, publishing straight away | The primary label reads "Publish without rules" only while no branch has any rule and no rule editor is open; otherwise "Publish" ("Save" in the edit flow). With unsaved editor changes, Publish and Save first open U28's "Save changes to Rule 01?" (`6197:10988`, "Discard" / "Save changes"): "Save changes" saves the rule even if it is incomplete, and FR-006 still checks it; "Discard" drops the changes; either way, publishing or saving then goes on | CLAR 2026-10-24 #31 (and #17, #19) |
| F11 | U27 `6197:10714` (Publish disabled), `6197:10696` (banner) | Publish is disabled while a rule checks data that is no longer requested; the banner names the rule but not its branch | Publish and Save stay enabled. An attempt is refused while any branch has an incomplete condition, a missing message or an unrequested field, with a message that names the problem, the rule and its branch, e.g. "Rule 02 in Standard checks data that's no longer requested." The banner and the inline flags stay and name the branch: "Rule 02 in Standard checks data that's no longer requested. Add the data again in Documents, or edit or delete the rule." | CLAR 2026-10-24 #15 |
| F12 | U15 `6344:53413`, `6344:53414` | "Another rule is already called Rule 01." | "Another rule in Ambulance is already called Rule 01.": it always names the branch, also the one being edited, and shows inline where the name is entered. The same for groups and sub-groups, and for a main-branch rename that clashes with a name in a based branch, which names that branch | CLAR 2026-10-24 #30 (and #18) |
| F13 | U14 `6113:29148`, `6113:29150`; U27 `6197:11425`, `6197:11431`, `6197:11434`; U28 `6197:11080` | Groups kept with one member or none; an empty group inviting "Add a rule or a sub-group"; Publish enabled with it | A group or sub-group left with fewer than two members dissolves: the remaining member moves to the containing level, and the group's AND/OR and message are dropped. Empty groups never exist. Built without new frames | CLAR 2026-10-24 #7 |
| F16 | U11 `6348:40209`, `6348:40219`, `6348:40238`, `6348:40523`, `6348:40735`, `6348:40215` (tab `6348:40882` only in 1.6); U13 `6357:42628`, `6357:42887`; U24 `6191:42071`, `6191:42265`; U25 `6196:10238`, `6196:10389`, `6197:11766`; U29 `6197:11646`, `6197:11652`; U32 `6324:17633` | The tab row ("Standard", "+ Add variant") appears only after the first rule is saved | Show the tab row from the start of the Rules step: in the empty state, and while the first rule is edited | CLAR 2026-10-24 #11 |
| F23 | U28 `6197:11098` | "Couldn't save. Check your internet connection and try again." with Retry on the Rules step | Nothing is stored before publishing or saving (no drafts). A failure shows in the publish/save dialog with "Try again", and nothing has changed (S5, U35 `6376:27178`) | CLAR 2026-10-24 #23, #26 |
| F29 | U14 `6113:29469`; U16 `6344:53623` | "Rule 03 deleted.", "Rule 02 and Rule 03 are now Group 01." | Toasts name the rules and groups with their branch: "Rule 03 in Standard deleted." (Undo as designed); "Rule 02 and Rule 03 in Standard are now Group 01." (Undo as designed). Prompts about the rule on screen (dialog titles such as "Delete Rule 03?", selection bars) keep the design's copy | RULE wording (CLAR 2026-10-24 #19, #20 settle that the toasts exist) |

| # | Expected surface | Build from (frame or KERN pattern) | What to build | Decided by |
|---|---|---|---|---|
| W6 | Group and sub-group headers | The group's ⋯ menu U14 `6094:6413` and the sub-group's ⋯ menu U14 `6094:6320` (KERN menu); the message card under the header U14 `6324:39410`, with its hint `6324:39419` | "Add error message" / "Remove error message" in each group's and sub-group's ⋯ menu. The message card sits under the header, as in U14 `6324:39410` | CLAR 2026-10-24 #12 (FR-004d) |
| W8 | Group and sub-group ⋯ menus | The same menus as W6 (U14 `6094:6413`, `6094:6320`); the rule's delete confirmation U14 `6113:29056` and its undo toast U14 `6113:29469` | "Ungroup": the members take the group's place in the containing level; a sub-group that reaches the top level becomes a group, keeping its identifier, name, AND/OR and message; toast "Group 01 in Standard ungrouped." with Undo. "Delete group": a confirmation like the rule's ("Delete Group 01?", saying that its rules are deleted with it; final copy in the design notes), then a toast with Undo, like F29's. In a based branch, an inherited group's menu has "Remove" / "Restore" instead (marked as in W4); "Ungroup" and "Delete group" are for the groups of Standard, of branches that started empty, and groups added in a branch. Standard's delete confirmation names the branches whose changed group it dissolves (F14) | CLAR checklist (FR-008, FR-022, US2-AS8) |

### S3. Rule editor

Units: U11, U12, U13, U24, U25, U30, U31, U32, and the editor inside U26 and U28.

| # | Figma (node-ids) | Figma shows | Build instead | Decided by |
|---|---|---|---|---|
| F1 | Hidden "old" on other dates: U30 `6324:15427`; U32 `6324:17644` | The shared editor carries "old" on dates other than the Date of birth | "old" only on the Date of birth; every other date says "years ago" | CLAR 2026-10-24 #28 (and #1) |
| F2 | U30 `6324:15667`–`6324:15670` | "≥ at least 6 months left" in the editor | Picker "is at least", a number, unit "months", suffix "from now"; also "is less than". No "left"; "≥" is decoration | CLAR 2026-10-24 #33 |
| F3 | U11 `6348:40681` (menu), `6348:40539` (hint), `6348:40749`, `6348:40751`; U12 `6350:42447`–`6350:42449`, `6350:42585`; U25 `6196:10397`–`6196:10400`; U26 `6196:10579`–`6196:10584`; U28 `6197:10974`; U30 `6324:15613` (menu), `6324:15426` | Age "at least / at most"; Time passed and Time left "at least / at most"; "before / after"; a years/months unit on years-ago conditions; no "is exactly", "is (a date)" or "is less than … from now" | Picker labels in FR-003's words. Date of birth: is at least / is less than / is exactly N years old. Every other date: is before / is after / is &lt;date&gt;; is at least / is less than / is exactly N years ago. Every date, the Date of birth included: is at least / is less than N years or months from now. The unit picker (years, months) appears only on from-now conditions; age and years-ago conditions take whole years, shown as fixed text. N is a whole number ≥ 1. No "at most". The menu sections read "Time ago" and "Time from now" instead of "Time passed" and "Time left". U11's hint becomes "Check an age, the time from now, or compare the date with a fixed date." U30's hint `6324:15429` already fits | CLAR 2026-10-24 #2 (and #1, #33, #34) |
| F4 | U11 `6348:40754`, `6348:40756`; U12 `6350:42724`, `6350:42726`; U25 `6196:10250`, `6196:10401` (hidden); U26 `6196:10585` (hidden); U28 `6197:10983`, `6197:10984`; U30 `6324:15673`; U32 `6324:17647`, `6324:17648` (hidden slots) | A worked example without the counting sentence, or "Counted from the date class B was first issued."; "If the date of birth is missing, the rule isn't met."; hints hidden in error states | Next to every date condition, error states included: "Counted from the day the applicant shares. Today (23 Oct 2026) this means: born on or before 23 Oct 2005." and "If the date of birth is missing or can't be read, the rule isn't met and is reported as couldn't be checked.", where "the date of birth" is the checked field or part ("the expiry date", "the issue date of class B"). Saved rules don't show these notes. U30 `6324:15672` already has the first one right. A class B rule may keep "If class B is missing, the rule isn't met." | CLAR 2026-10-24 #29 |
| F5 | U12 `6350:41548`, `6350:41890`, `6350:41892`, `6350:41904`, `6350:42064`, `6350:42145`, `6350:42352`, `6350:42725`, `6350:42727`, `6350:42948`; U24 `6191:42078`, `6191:42272`; U25 `6197:11773`; U30 `6324:16305`, `6324:16410`, `6324:16308`, `6324:16310`, `6324:16313` | The composite checks "has held class … for at least" and "has class … valid today / on the day of sharing"; "BE, C and D licences always include class B."; a fallback to the licence's expiry date; no part picker, so U24 and U25 go from "Licence classes" straight to "includes one of" | After "Licence classes" in the data menu, a part picker ("Choose part") follows, also in U24's and U25's frames, built like the data menu and like Place of birth's part picker (U32 `6324:17746`). It has the search field "Search classes", with the empty result "No options match "{typed text}".". It lists "Licence classes" (the held classes) and, for every class, "Licence class B – Issue date" and "Licence class B – Expiry date". The held classes are an enum (includes one of / includes none of, several values, F32's value menu); the dates take F3's conditions, e.g. "Driving licence – Licence class B – Issue date is at least 2 years ago". Only a licence that lists class B meets a class B rule; a class without its own expiry date doesn't fall back to the licence's. Proposed messages follow the new conditions | CLAR 2026-10-24 #3 (and #39) |
| F6 | U31 `6324:17134`, `6324:17198`, `6324:17199`, `6324:17201`, `6324:17304`, `6324:17203`, `6324:17206` | "at least", "at most", "between 150 and 210" (both bounds inclusive) | is greater than / is less than / is equal to / is not equal to, strict, one value each. A range takes two rules. The messages follow the condition. The value field keeps accepting any number | CLAR 2026-10-24 #4 |
| F7 | U13 `6357:42841`, `6357:42895`, `6357:43063`, `6357:42900`, `6357:42901`, `6357:42903`; U31 `6324:16757`, `6324:16762`, `6324:16763`, `6324:16765` | "is", "is not", "starts with"; several values ("Stuttgart", "Esslingen") with "Met if the city or town is any of these."; the fixed hint "Capital letters and spaces at the start or end don't matter." | is equal to / is not equal to / contains / doesn't contain, each with one value. Each text condition has its own letter-case choice next to the value: a KERN checkbox, labelled as in the design notes (e.g. "Match letter case"), unchecked by default, which means letter case is ignored; the saved statement shows the setting. Hint: "Spaces at the start or end don't matter." No "starts with" and no hint about it. "Lives in Stuttgart or Esslingen" takes two rules in an OR group | CLAR 2026-10-24 #5 |
| F8 | U12 `6350:41850` (`6350:41853`, `6350:41877`); U31 `6324:17577` | "includes" / "doesn't include" | "includes one of" / "includes none of", for every enum field and any number of values | CLAR 2026-10-24 #6 |
| F9 | U25 `6196:10254` (8.1), `6196:10405` (8.2); placeholder U11 `6348:40234`, U12 `6350:41266` | A message proposed while no data or check is chosen, or one that doesn't match the value (0); the placeholder "Suggested once you choose a check." | The message is proposed only once the condition is complete, and it matches the condition as entered. Until then the placeholder reads "Error message applicants read: Suggested once you complete the check. You can edit it." | CLAR 2026-10-24 #19 |
| F29 | U11 `6369:62602`; U12 `6369:62608` | "Rule 01 saved.", "Rule 02 saved." | "Rule 01 in Standard saved.", "Rule 02 in Standard saved." | RULE wording |
| F30 | U31 `6324:17370` | "Nationality can have more than one value. The rule checks all of them." | "Nationality can have more than one value. "Includes one of" is met if any of them is one of the chosen values, "includes none of" if none of them is." U12 `6357:43117` ("Met if the licence has at least one of the chosen classes.") already fits | RULE wording |
| F32 | U24 `6191:42209` (menu of the Licence classes value field `6191:42191`); U25 `6197:11783` (same component, typed search) | Placeholder "Search options"; the options as bare codes (A, A1, B, BE, C, C1, D) | Build it like U12's class menu (`6357:43382`, "Rules/Menu item · class" rows): placeholder "Search classes"; each option shows its code with its description, e.g. "B Cars up to 3.5 t", as in U12 `6350:42145`, with checkboxes for several values. The footer "Select at least one option." and the empty result "No options match "XL"." stay. The chips in the field (U24 `6191:42191`) and the saved statements keep the codes only ("B", "BE"). Option menus of other enums, such as Nationality, keep "Search options" | CLAR 2026-10-24 #36, confirmed by #39 |

F10's footer and dialog (S2) apply to every footer of this screen. No W# item on this screen.

### S4. Branches (variants)

Units: U17, U18, U19, U20, U23, U26.

| # | Figma (node-ids) | Figma shows | Build instead | Decided by |
|---|---|---|---|---|
| F1 | Saved rows: U17 `6134:8524`, `6134:8534`, `6134:8544`; U18 `6163:4862`, `6163:4872`; U19 `6344:53713`, `6344:53723`; U20 `6344:53890`, `6344:53900`; U23 `6185:8567`; U26 `6197:11982` | "Personal ID · Date of birth ≥ at least 21 years old" | As F1 in S2: "Personal ID – Date of birth is at least 21 years old" | CLAR 2026-10-24 #28 |
| F2 | Saved rows: U17 `6134:8527`, `6134:9078`; U18 `6163:4865`; U19 `6344:53716`; U20 `6344:53893`; U23 `6185:8570`, `6185:8821`; U26 `6197:11985` | "≥ at least 6 months left" | As F2 in S2: "… is at least 6 months from now" | CLAR 2026-10-24 #33 |
| F12 | U26 `6196:10653`, `6196:10710` | "Another rule is already called Rule 01." | "Another rule in Ambulance is already called Rule 01.", inline where the name is entered; also for groups and sub-groups, and for a main-branch rename that clashes in a based branch, naming that branch | CLAR 2026-10-24 #30 (and #18) |
| F13 | U23 `6185:41610`, `6185:41611`, `6185:41613`, `6185:41627` | Groups kept with one member or none in a variant | In a based branch, an inherited group left with fewer than two active members dissolves there only and is shown removed (like U23 `6185:41167`); it comes back when the removal is undone or the main branch adds a member. Empty groups never exist. Built without new frames | CLAR 2026-10-24 #7 |
| F14 | U23 `6185:8847`, `6185:8846` | "This rule will be removed from Standard and from every variant that uses it (Ambulance, School transport)." | The body must not say the rule leaves every variant: variants that follow the rule lose it; variants that changed it keep their version, which then counts as added (name them); variants that removed it drop it. Proposed copy: "This rule will be removed from Standard and from the variants that follow it. Ambulance changed it and keeps its own version. You can undo this right after." The design notes hold the final wording. If the rule is one of a group's two members, the group dissolves (F13), also in variants that changed the group, and the body names them: "Ambulance's changes to Group 01 go with it." (FR-022's one exception) | CLAR 2026-10-24 #9; CLAR checklist (FR-022) |
| F15 | U23 `6185:41180`, `6185:41623` (changed rule inside the removed group); U23 `6185:41610` and `6185:41167` (Ambulance AND vs Standard OR `6185:8827`) | A changed rule marked only by an outline; a switched operator without a mark | A switched operator marks the group "Changed here" (as U18 `6163:5440`). A changed rule keeps its "Changed here" text mark, also inside a removed group | CLAR 2026-10-24 #10 |
| F29 | U19 `6344:53873` | "Grouped in Ambulance only. Standard stays the same." | "Rule 01 and Rule 02 in Ambulance are now Group 02. Standard stays the same." (Undo as designed). The copy toast "Rule 06 copied to School transport." (U20 `6344:54042`) already names its branch | RULE wording |

| # | Expected surface | Build from (frame or KERN pattern) | What to build | Decided by |
|---|---|---|---|---|
| W3 | Branch tabs (U17 `6134:8603`, `6134:8719`); the Edit variant dialog | **KERN menu** on each tab, like the rule ⋯ menu U14 `6113:28988`; **KERN confirmation dialog** like U14 `6113:29056`; the **Add variant dialog** U17 `6139:32693`; the name error of U26 `6197:12011` and U15 `6344:53414` | "Rename" for every branch, main included; "Delete" for every other branch, after the confirmation dialog. "Rename" opens the Add variant dialog titled "Edit variant", with "Variant name" and "Description - Optional", the helper "Shown when someone hovers the (i) next to the variant name.", and without "Start with". A missing name is reported in the dialog as in U26 `6197:12011` ("Enter a name for the variant."), and a duplicate name the same way; proposed copy after U15 `6344:53414`: "Another variant is already called Ambulance." (final wording in the design notes). FR-006 still refuses either at publish/save. Once the main branch has a description, "Standard" gets the (i) like the other tabs | CLAR 2026-10-24 #8, #38 (FR-020a–d, FR-020j, FR-006b, US3-AS9) |
| W4 | Rules step, based branches | The existing marks: "Changed here" (U17 `6134:9009`), "New addition" (U17 `6134:9064`), "Removed" (U18 `6163:5856`), and the link strip (U18 `6344:60020`); the marked group header U18 `6163:5438` | When the main branch changes things: main changes a rule the branch changed → the branch keeps its version, still "Changed here"; main removes a rule the branch changed → the branch's version shows "New addition"; main removes a rule the branch removed → it disappears from the branch; main adds a rule or changes a followed one → it shows unmarked in based branches, not in empty-started ones. The top-level AND/OR follows main until switched; then it is marked like the group in U18 `6163:5438`, with the badge on the first top-level connector, since the top level has no header | CLAR 2026-10-24 #9 (and #10) (FR-021c, FR-021d, FR-022b, EC-11 to EC-14, US3-AS3) |
| W5 | Rules step, a branch without rules | The main branch's empty state U29 `6197:11654` ("No rules yet", "+ Add rule") | The same empty state under the branch's tab | CLAR 2026-10-24 #11 (EC-17) |

F16 (S2) also applies here: the tab row is there from the start.

### S5. Publish and save dialog

Units: U33, U34 (confirmation and go-live frames), U35, U36.

| # | Figma (node-ids) | Figma shows | Build instead | Decided by |
|---|---|---|---|---|
| F1 | Summary rows: U33 `6376:25778`, `6376:25788`; U34 `6383:66110`; "years ago" on the Date of birth: U35 `6376:26339` | "Personal ID · Date of birth ≥ at least 21 years old"; one row reads "at least 21 years ago" | "Personal ID – Date of birth is at least 21 years old"; U35's row reads "is at least 21 years old" | CLAR 2026-10-24 #28 (and #1) |
| F5 | U35 `6376:26342` | A composite licence class check in the summary | The part's statement, e.g. "Driving licence – Licence class B – Issue date is at least 2 years ago" | CLAR 2026-10-24 #3 |
| F21 | U33 `6376:26181` (warnings line) | "1 warning on Ambulance", with Publish still enabled | No warnings line. Problems refuse publishing (F11) | CLAR 2026-10-24 #15 (OUT-32, FR-006a, FR-006c) |
| F22 | U33 `6376:26181` (Goes live); U34 `6383:66119`, `6396:48549`, `6396:48601`, `6396:48602`, `6421:31811`, `6421:31805`, `6396:48606`, `6396:48739`, `6396:48860`; U36 `6376:27630` (Goes live) | "Now / On a date", "Schedule", the "Scheduled" status and screen, the "Goes live …" chip, "Change go-live date" | No go-live choice: "Publish" goes live at once. No Schedule, no Scheduled status, no chip and no change-date action | CLAR 2026-10-24 #24 (OUT-18) |

| # | Expected surface | Build from (frame or KERN pattern) | What to build | Decided by |
|---|---|---|---|---|
| W7 (save dialog) | Publish/save dialog of the edit flow | Spec 001's save dialog (`PublishDialog`), extended with U33's per-branch summary rows (`6376:26181`); the failure as in U35 `6376:27178` | Saving asks for confirmation in this dialog, not on entry to the edit flow. A failure shows "Try again", and nothing has changed | CLAR 2026-10-24 #14, #23 (FR-030c, US4-AS1, US4-AS2) |
| W9 | Publish/save dialog of the edit flow, when the rules changed since the editor opened | The failure state of U35 `6376:27178` inside spec 001's save dialog; KERN dialog buttons as in U14 `6113:29056` | On `409 rules_changed`: a heading saying that another team member saved the rules of this connection after it was opened, the API's message (which names any variant that replacing deletes, or brings back with a new pull URL), and two actions: "Reload" (fetch the connection again, dropping the unsaved changes) and "Replace their changes" (save again with `replace: true`). Final copy in the design notes | CLAR checklist (FR-028) |

F10 (S2): with unsaved rule-editor changes, "Save changes to Rule 01?" opens before this dialog.
F23 (S2): a failed save shows here, not on the Rules step.

### S6. Details, also right after publishing

Units: U37, U38, and the after-publishing frames of U34.

| # | Figma (node-ids) | Figma shows | Build instead | Decided by |
|---|---|---|---|---|
| F1 | U37 `6396:48228` | "Personal ID · Date of birth ≥ at least 21 years old" | "Personal ID – Date of birth is at least 21 years old" | CLAR 2026-10-24 #28 |
| F5 | U37 `6396:48235` | The saved "Licence classes has held class B for at least 2 years" | "Driving licence – Licence class B – Issue date is at least 2 years ago" | CLAR 2026-10-24 #3 |
| F8 | U37 `6396:48274` | "includes" / "doesn't include" | "includes one of" / "includes none of" | CLAR 2026-10-24 #6 |
| F22 | U37 `6396:47706`; U38 `6396:48967` | The "Goes live …" chip and "Change go-live date" | No chip and no change-date action; the connection actions ⋮ (U37 `6421:31777`, U38 `6421:31819`, spec 001) lose their go-live item | CLAR 2026-10-24 #24 (OUT-18) |
| F24 | After publishing: U34 `6396:48632`–`6396:48649` (`6396:48636`); details: U37 `6396:47732`–`6396:47749`; U38 `6396:48993`, `6396:48997`, `6396:48999`, `6396:49005` | ".../result/standard", ".../result/ambulance", ".../result/school-tran…" | The main branch keeps the connection's existing pull URL. Every other branch's pull URL uses an identifier fixed when the branch is added, never its name (contracts/integration-api.md). The labels and "Copy link" stay as designed, plus F31's (i) | CLAR 2026-10-24 #13 (FR-018a, FR-025f, FR-025g) |
| F25 | U37 `6396:47705`, `6396:47753`, `6396:47754`, `6396:47755`, `6396:47760`, `6396:47761`, `6396:47763`, `6396:48526`, `6396:48527`–`6396:48547`, `6396:47841`; U34 `6421:31818`, `6396:48654`, `6396:48655`, `6396:48661`, `6396:48663`; U38 `6396:48964`, `6396:49011` (counts), `6396:49016`, `6396:49018` | "Live since", counters, "Download PDF", Activity / "Last edited by", a "✓ Copied" button | None of these, except the rules card's counts of variants and rules while it is closed ("3 variants · 6 rules", Figma 10.11 `6530:40737`; spec Clarification 2026-10-26, bug `rules-ui-fixes` B8). The copy feedback follows spec 001 | CLAR 2026-10-24 #25 (OUT-19, OUT-20, OUT-22); CLAR 2026-10-26 |
| F26 | U37 `6396:48222`–`6396:48277` (`6396:48228`, `6396:48235`, `6396:48274`); U38 `6396:49011` | A flat numbered list per variant ("01", "02"), with no groups, AND/OR or marks, and statements without the document | One read-only section per branch, in the Rules step's layout, with names ("Rule 01"), statements as in F1, groups and sub-groups with their AND/OR and own messages, branch marks ("Changed here", "New addition", "Removed") and removed items, identifiers (W1) and the branch (i) (F31) | CLAR 2026-10-24 #14 (FR-030a, FR-023a–c, FR-005a, FR-005c) |
| F27 | U38 `6396:48909`, `6396:49030`, `6424:34959`; U34 `6424:34919`; U37 `6424:34839` | "Edit this live connection?" on entering edit; a generic "Edit connection" | No confirmation on entry. The details lead to the Rules step of spec 001's edit flow (S7), which asks for confirmation when saving (W7). The dialog's message may move to the save confirmation (design notes) | CLAR 2026-10-24 #14 (FR-030b, FR-030c, US4-AS1) |
| F31 | Rules section headings: U37 `6396:48223`, `6396:48239`, `6396:48255`. Pull URL labels: U37 `6396:47732`–`6396:47749`; U38 `6396:48993`, `6396:48999`, `6396:49005`. After publishing: U34 `6396:48632`–`6396:48649` | The branch names "Standard", "Ambulance", "School transport" without an (i), so a branch's description shows nowhere outside the Rules step | The Rules step's (i) (U17 `6134:8719`, tooltip U17 `6139:32939`) right after the branch's name in the heading of each branch's rules section, in the label of its pull URL, and where the URLs are shown after publishing. It shows the description in a tooltip, on hover and on keyboard focus. A branch without a description, main included, shows no (i); where the URLs show without branch names (W2), no (i) either | CLAR 2026-10-24 #37 (FR-020e–h) |

| # | Expected surface | Build from (frame or KERN pattern) | What to build | Decided by |
|---|---|---|---|---|
| W1 | Details, every branch's rules section | The rule row's name label U14 `6094:6469` and the group header U14 `6094:6413` | A read-only identifier (`rule-7`, `group-3`) next to each rule, group and sub-group name. Not in the Rules step, which U14 already follows | CLAR 2026-10-24 #32 (FR-010h) |
| W2 | After publishing; details, a connection with only the main branch | Spec 001's URL display (`ConnectionLinks`, `LinkCard`): the trigger URL plus one pull URL without a branch label. Nearest Figma: U37 Request link row `6396:47720`, `6396:47721`, Result link section `6396:47729`–`6396:47731` | The URLs exactly as spec 001 shows them, with no branch name and no (i) | CLAR 2026-10-24 #13 (FR-026c) |

### S7. Edit flow

Units: none of its own; it reuses the create flow's frames (U14 `6094:6127` for the Rules step).

| # | Figma (node-ids) | Figma shows | Build instead | Decided by |
|---|---|---|---|---|
| F27 | U38 `6396:48909`, `6396:49030` | "Edit this live connection?" on entering edit | No confirmation on entry; confirmation when saving (W7) | CLAR 2026-10-24 #14 |

| # | Expected surface | Build from (frame or KERN pattern) | What to build | Decided by |
|---|---|---|---|---|
| W7 | Rules step in the edit flow | The create flow's Rules step U14 `6094:6127` inside spec 001's edit flow; spec 001's save dialog extended with U33's per-branch summary rows (`6376:26181`); the failure as in U35 `6376:27178` | The same Rules step with "Save" as the primary action (F10); opened from the details at the Rules step; saving confirmed in the dialog (S5) | CLAR 2026-10-24 #14, #23 (FR-030c, US4-AS1, US4-AS2) |

In the edit flow, F18's dialog copy reads "… before you save." and F10's label "Save".

### Coverage index

Every decided item, with the screens it applies to. Each must be cited by at least one task.

| Item | Screens | Item | Screens |
|---|---|---|---|
| F1 | S2, S3, S4, S5, S6 | F21 | S5 |
| F2 | S2, S3, S4 | F22 | S5, S6 |
| F3 | S3 | F23 | S2, S5 |
| F4 | S3 | F24 | S6 |
| F5 | S3, S5, S6 | F25 | S6 |
| F6 | S3 | F26 | S6 |
| F7 | S3 | F27 | S6, S7 |
| F8 | S2, S3, S6 | F28 | S0 |
| F9 | S3 | F29 | S2, S3, S4 |
| F10 | S2 (all footers, S3 included), S5, S7 | F30 | S3 |
| F11 | S2 | F31 | S6 |
| F12 | S2, S4 | F32 | S3 |
| F13 | S2, S4 | W1 | S6 |
| F14 | S4 | W2 | S6 |
| F15 | S4 | W3 | S4 |
| F16 | S2, S4 | W4 | S4 |
| F17 | S1 | W5 | S4 |
| F18 | S1, S7 | W6 | S2 |
| F19 | S0, S1 | W7 | S5, S7 |
| F20 | S1 | W8 | S2, S4 |
| | | W9 | S5, S7 |

### Also from the audit, not deviations

These are built as designed, but the report adds a direction for them. They are not cited as
deviations; a task that builds the part follows the note.

| Report item | Direction |
|---|---|
| FYI #10 (U19 `6344:53871`) | Show the link icon on every linked rule or on none, consistently |
| FYI #13 (U37 `6396:47748`) | A truncated URL still copies in full |
| FYI #17 (U37 `6396:47756`, `6396:48197`; U38 `6396:49017`) | The details keep the rules in a collapsible card ("View summary" / "Hide summary"), collapsed by default; F25, F26, F31 and W1 set what it contains |
| FYI #20 (U11 `6348:40237`; U12 `6350:41316`) | Use one footer wording in the document menu and record which in the design notes |
| "Settled as designed" table | Built as Figma shows, including the rule editor's aids, the toasts, the delete confirmation with undo, the publish dialog's states, and "Save rule" disabled until complete |
