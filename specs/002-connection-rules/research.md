# Research: Rules for Form Connections, with Groups and Branches

**Phase 0 output of `/speckit-plan`** | **Date**: 2026-10-24 | **Spec**: [spec.md](spec.md)

This file records each technical decision behind the plan, with the reason for it and the
alternatives that were weighed. It builds on spec 001's research
([../001-servicebw-eudi-middleware/research.md](../001-servicebw-eudi-middleware/research.md)),
whose decisions R1–R21 still apply; "001-R9" below means spec 001's R9.

**Sources**: the spec and its Clarifications (sessions 2026-10-22 to 2026-10-24), the Figma audit
([figma-audit/report.md](figma-audit/report.md)), the code on this branch, the PID rulebook v1.7
and ISO/IEC 18013-5. Points to confirm while coding are marked **Verify at implementation**.

**Who decides what**: spec.md, with its Clarifications, decides behaviour and wording. Figma (file
`s8mU9oJDq3411e8bxMjQO9`) decides layout and styling only; it is out of sync with the spec and
won't be updated soon. Where they differ, the decided items F1–F32 and W1–W9 say what to
build, and [contracts/ui-screens.md](contracts/ui-screens.md) lists them per screen (R13).

## Technical Context: open points and how they were resolved

| Open point | Resolved in |
|---|---|
| Where rules are stored, and how a request keeps "the rules as they were when it was triggered" | R1, R2 |
| How branches get a pull URL that survives renames, and how deleted and later branches answer | R3 |
| How a branch based on the main branch follows it, and where that logic runs | R4 |
| How identifiers and default names are made, and kept unique under concurrent saves | R5 |
| Which kind of value each catalog field has, its parts and its enum values | R6 |
| How each condition is evaluated (calendar, time zone, letter case, missing values) | R7 |
| What serviceBW receives, and when | R8 |
| How documents, branches and rules are saved together or not at all | R9 |
| How the rules step is built in the frontend | R10 |
| What happens to existing form connections and requests | R11 |
| How it is tested | R12 |
| How the Figma deviations reach the tasks | R13 |
| What still needs a check at implementation | R14 |

No open point blocks the plan.

---

## R1. Rules live in their own immutable versions, beside the revisions

**Decision**: A form connection's branches and rules are stored as **rule sets**: immutable,
numbered versions in a new table `form_connection_rule_sets`, one row per save that changes them.
`form_connections.current_rule_set` names the version new requests use, just as
`current_revision` names the documents. The trigger records both on the request
(`document_requests.rule_set_id` next to `revision_id`), so a request is evaluated with the rules
it started with (FR-025, FR-028), however often they change before it completes.

**Rationale**:
- Spec 001 already solved "requests keep the configuration they started with" with immutable
  revisions (001-R2, data-model "Creating a revision"). The same pattern gives FR-028 for rules.
- A revision exists to carry an EUDIPLO presentation configuration. Rules don't change what the
  wallet is asked for (FR-016, branches share the documents), so a rules-only save must not create
  an EUDIPLO configuration or depend on EUDIPLO being reachable.
- Both version pointers sit on the `form_connections` row, which a save updates in one
  transaction, so the trigger reads a consistent pair.

**Alternatives considered**:
- *Rules inside `form_connection_revisions`*: every rules change would create an identical
  EUDIPLO configuration (same `config_hash`) and fail whenever EUDIPLO is down. Rejected.
- *Mutable rule rows with an audit trail*: reconstructing "the rules at trigger time" from a log
  is error-prone, and requests would need a timestamp join. Rejected.

## R2. A rule set is one JSONB snapshot of every branch

**Decision**: `form_connection_rule_sets.branches` holds the whole configuration as JSONB: every
branch that isn't deleted, in tab order, with its name, description, origin, top-level AND/OR,
and its tree of rules and groups, including the branch marks (data-model.md). Pydantic models in
`schemas.py` define its shape and validate it on the way in and out.

**Rationale**:
- Rules are always read and written as a whole: the editor loads and saves all branches at once
  (no drafts, spec 001), and a pull evaluates one branch's tree. Nothing queries single rules.
- The tree is at most two levels deep (FR-008), and a form connection has tens of rules at most;
  a snapshot of a few kilobytes per save is cheap, and old versions stay readable for the requests
  that use them.
- An immutable snapshot can't be half-updated, which keeps FR-028 simple.

**Alternatives considered**:
- *Normalised tables* (`rules`, `groups`, `branch_changes`, with parent ids and positions):
  versioning them means copying every row on each save, and the merge of R4 would become joins.
  More code, no query that needs it. Rejected.

## R3. Branch identity, pull URLs and their answers

**Decision**:
- A new table `form_connection_branches` holds each branch's **identity**: a UUID4 `id`, fixed when
  the branch is first saved, `is_main`, and `deleted_at`. Names, descriptions and rules live in
  the rule sets (R2), so renaming never touches the identity (FR-025).
- **Pull URLs**:
  - main branch: unchanged, `…/api/connect/{form_connection_id}/requests/{reference}` (FR-018,
    SC-005);
  - every other branch: `…/api/connect/{form_connection_id}/branches/{branch_id}/requests/{reference}`.
  The trigger URL stays the same and serves every branch (FR-025).
- **Order of the checks** on a branch's pull URL, extending 001-R12:
  1. unknown form connection: `404`;
  2. deactivated or deleted form connection: `409 unavailable` (FR-027);
  3. branch unknown, of another form connection, or the main branch, whose pull URL is spec 001's:
     `404`;
  4. branch deleted: `409 unavailable`, for every request (FR-027, US3-AS9);
  5. unknown reference, or one of another form connection: `404`;
  6. branch not in the request's rule set, because it was added after the trigger: `409` with
     `error: "branch_added_later"`, without status or documents (FR-025, Clarification
     2026-10-22);
  7. otherwise status and documents as spec 001 defines them, plus the evaluation (R8).
- Delivery state (first delivery, 60-second repeat window, deletion) stays **per request**, shared
  by all branches' pull URLs: each answers "with the same status and documents" (FR-025), and
  documents are handed out once (EC "The applicant changes branch after sharing").
- The UI shows each pull URL with the branch's name; with only the main branch, it shows the URLs
  exactly as spec 001 does (FR-026, W2).

**Rationale**: a path segment is the simplest stable identifier serviceBW can store per variant.
UUIDs match the form connection ids already in the URLs and reveal nothing. Keeping deleted
branches as rows lets their URLs answer "unavailable" for good, as spec 001 does for deleted form
connections. The existing access-log redaction (`app/main.py` `_REFERENCE_IN_PATH`, and the map in
`frontend/nginx.conf`) matches `/connect/…/requests/<reference>` with any segments in between, so
the new route is redacted too; a test pins this. nginx's `location /api/connect/` allow-list
already covers it.

**Alternatives considered**:
- *A query parameter* (`?branch=…`): easy to drop by accident in serviceBW's configuration, and
  the main branch would need one too. Rejected.
- *The branch name as a slug* (the Figma placeholder `…/result/ambulance`): changes on rename,
  which FR-025 forbids (F24). Rejected.
- *A short counter per form connection* instead of a UUID: guessable; and the URLs are
  network-restricted, but nothing is gained. Rejected.

## R4. Based branches are stored materialised, with marks; the editor propagates, the server checks

**Decision**:
- Each branch is stored as its **full tree**. In a branch based on the main branch, every item
  carries a `mark`:
  - none: follows the main branch; its content is a copy of the main branch's item with the same
    identifier;
  - `changed`: same identifier as the main branch's item, its own content;
  - `removed`: still shown (FR-023), mirrors the main branch's content, not evaluated;
  - `added`: the branch's own item, including groups formed in the branch from inherited rules
    (FR-022), copies (FR-022) and a changed item whose main-branch original was deleted (EC-12).
  The top level's AND/OR has `operator_mark: "changed"` once switched in the branch (FR-021).
- **Propagation** (FR-021, FR-022, EC-11 to EC-16) happens in the editor: whenever the main branch
  changes in the rules step, a pure function `propagateMain(oldMain, newMain, branch)` updates
  every based branch. The rules it applies are listed in data-model.md ("Propagation from the main
  branch").
- **Dissolution in a branch** is derived, not stored: an inherited group whose active members
  (those not removed, and not moved into a group of the branch's own) drop below two counts as
  dissolved there (FR-008). Its one remaining member takes its place, it is shown as removed, and
  it comes back as soon as two members are active again. The evaluator and the UI derive it the
  same way from the stored tree. A group the branch changed, which the main branch's deletion
  leaves with fewer than two members, dissolves for good, and the branch's change goes: FR-022's
  one exception. The main branch's delete confirmation names those branches (F14).
- **Following again**: an edit in the branch that leaves a `changed` item equal to the main
  branch's item clears the mark, as an undo does; a change in the main branch that makes them equal
  doesn't (FR-024). The editor compares the two after each edit of the item in the branch.
- **Group operations** (FR-008): "Ungroup" and "Delete group" for the groups of the main branch,
  of branches that started empty, and groups `added` in a branch; an inherited group in a based
  branch can only be removed and restored, so ungrouping never needs a new kind of mark. The main
  branch's ungroup reaches based branches as the group's deletion plus moves of its members, its
  delete as deletions (data-model.md, propagation rule 8).
- **The server checks** every saved snapshot against invariants that a correct propagation always
  satisfies (data-model.md, "Validation"), for example: every main-branch item appears exactly
  once in each based branch; an unmarked or removed item equals the main branch's item, comparing
  only what counts as a change, never members or place (data-model.md, "Validation"); marks
  appear only in based branches. A violation is refused with `400`, so a propagation bug can't
  reach serviceBW.

**Rationale**:
- The rules step must show a based branch's effective rules instantly as the main branch is
  edited, so the merge must run in the browser. Running it again on the server would mean a
  second implementation of the most intricate logic, in another language, that must never differ.
  Checking invariants is short, testable with pytest, and catches the same bugs.
- A materialised tree is exactly what the evaluator, the details (FR-030) and the publish summary
  need; none of them has to merge anything.
- Deriving dissolution avoids storing a state that must be undone in two ways (undo, or the main
  branch adding a member, FR-008).

**Alternatives considered**:
- *An overlay* (the based branch stores only its differences, merged on read): every reader
  needs the merge, including the server's evaluator, so the merge exists twice anyway, and
  positions of added items between inherited ones need anchors that break when the main branch
  moves things. Rejected.
- *Merging on the server through an API call on every edit*: a round trip per keystroke-level
  change, and no offline-safe editor state. Rejected.

## R5. Identifiers and default names

**Decision**:
- Identifiers are strings `rule-{n}` and `group-{n}`. Rules count with one counter, groups and
  sub-groups with another, both per form connection. A sub-group can become a top-level group
  when its parent dissolves (FR-008), so groups and sub-groups share the counter and the
  identifier says nothing about the level.
- Default names are "Rule", "Group" or "Sub-group" and the number with at least two digits:
  "Rule 07", "Group 03", "Sub-group 04" (FR-005). The identifier never changes; the name can.
- A rule or group keeps its identifier in every branch based on the main branch, changed or not,
  also once it counts as added because the main branch deleted the original; an item added in a
  branch, a duplicate and a copy get a new one (FR-010, FR-022).
- **Reserved names** (FR-005): "Rule NN" belongs to `rule-{NN}`, "Group NN" and "Sub-group NN" to
  `group-{NN}`; no other item may take them. In a based branch, the main branch's names of changed
  items count as taken too, besides the names of removed items. So no clash can arise without a
  name being entered: not from an item the main branch adds, a duplicate, a copy or an undo, and
  not from the shift below, which renames default names to their new numbers.
- **Allocation**: the API returns the form connection's counters (`next_rule_number`,
  `next_group_number`; 1 and 1 for a new one). The editor numbers new items from them, so a new
  rule shows "Rule 03" at once, and sends the counters it started from as `numbering_base`. On
  save, under the form connection's row lock, the server checks that every identifier in neither
  the current rule set nor the rule set the editor loaded (`base_version`) is at or above the
  base. An identifier in the loaded rule set only belongs to a rule or group that another save
  deleted; it comes back under that identifier when the team member replaces that save (R9), which
  is the same item returning, not a reuse. The server then shifts new identifiers by the
  difference if another save advanced the counters meanwhile (renaming default names that still
  match), and stores the counters as the highest number used plus one. Numbers are never lowered,
  so no identifier is reused within the form connection, even after deletions (FR-010).
- The details show each identifier next to its item's name (FR-010, W1); the rules step doesn't.

**Rationale**: two-digit numbers match the design's "Rule 01". Allocating on the client keeps the
editor responsive and the default names stable while editing; the server's shift keeps the
"never reused" guarantee when a team member replaces the rules that another saved meanwhile (R9).

**Alternatives considered**:
- *One counter for rules and groups*: gives "Rule 01, Rule 02, Group 03", which reads oddly next
  to the design. Rejected.
- *UUIDs as identifiers*: unique without coordination, but unreadable when DO.IT agrees their use
  with serviceBW, and the default names need a number anyway. Rejected.
- *Refusing every save whose counters are stale*: a stale rules save is already refused with
  `409 rules_changed` unless the team member replaces the other's rules (R9, FR-028); when they
  do, the shift keeps their new identifiers unique instead of refusing again. Rejected.

## R6. Kinds of value, parts and enum values come from the catalog

**Decision**: `app/catalog.py` gives every field a **kind** (FR-003) and, where needed, its parts
and the set of values of an enum. `GET /api/document-types` returns them, and a new
`GET /api/option-sets` returns the value sets, so that the frontend never hard-codes the catalog.

| Kind | Fields (PID `pid`; driving licence `mdl`) |
|---|---|
| Text | Names, address parts, postal codes, document and administrative numbers, issuing authority and jurisdiction, email, phone number, `mdl` place of birth, resident address and city and state, UN distinguishing sign |
| Number | `mdl` height, weight, age in years, year of birth (F20, Clarification "Age in years") |
| Date | Date of birth (both documents, with the age wording, FR-003), issue and expiry dates, `mdl` portrait capture date (its calendar date) |
| Enum | Nationality (`pid` a list, `mdl` one value), the issuing country and the countries of residence (countries); sex (codes); `mdl` eye colour and hair colour |
| Parts | `pid` Place of birth: country (enum, countries), region (text), city or town (text). `mdl` Licence classes: the classes held (enum, licence classes), and for every class its issue date and expiry date (dates) |
| Image | Photo, portrait, signature: offered as "Can't be checked" (FR-002, Assumptions "Images") |

Value sets (`app/option_sets.py`), each a list of `{value, label, description?}`:
- `countries`: ISO 3166-1 alpha-2 codes with English short names, stored as a static list (no new
  dependency);
- `sex`: the codes of ISO/IEC 5218 and the PID rulebook (**Verify at implementation**: the PID
  rulebook v1.7 code list);
- `licence_classes`: the categories of ISO/IEC 18013-5 and Directive 2006/126/EC (AM, A1, A2, A,
  B1, B, BE, C1, C1E, C, CE, D1, D1E, D, DE) plus Germany's national L and T, each with the
  description the design's class menu shows, such as "B Cars up to 3.5 t" (FR-003o, F32). The
  final descriptions go to design-notes.md (**Verify at implementation** against Figma U12
  `6350:42145`);
- `eye_colours` and `hair_colours`: the values of ISO/IEC 18013-5.

**Rationale**: the catalog already owns field keys and labels (001-R4); kinds, parts and values
belong with them, and the same definitions drive the editor's menus, the server's validation and
the evaluator. A separate value-set endpoint avoids repeating 249 countries under seven fields.

**Alternatives considered**: *`pycountry`* for the country list: a runtime dependency for a static
table. *Inline options on every field*: about seven copies of the country list in one response.
Both rejected.

## R7. How conditions are evaluated

**Decision**: a pure module `app/services/evaluation.py` evaluates one branch's tree on the
delivered documents. Every rule ends as `met`, `not_met` or `not_checked` (FR-014).

- **The day of sharing** is the calendar date in `Europe/Berlin` of the request's `completed_at`
  (EUDIPLO's `consumedAt`, spec 001), through the standard library's `zoneinfo` (FR-012, EC
  "Sharing around midnight"). The backend image `python:3.13-slim` ships the time zone database
  (checked on 2026-10-24); a missing zone fails at start-up, not at a pull.
- **Years ago**: the N-th anniversary of a date is the same day N years later, or 1 March where
  29 February doesn't exist. "At least N years ago" (and "at least N years old") holds from the
  anniversary on; "less than" until the day before; "exactly" from the N-th anniversary to the day
  before the (N+1)-th (FR-012, EC-2, EC-3).
- **From now**: N years or months after the day of sharing, the same day of the month, or the 1st
  of the following month where that day doesn't exist (EC-26). "At least" holds on or after that
  day; "less than" before it, past dates included.
- **Before, after, on**: comparisons of calendar dates; "before" and "after" are strict, so the
  given date itself meets neither (FR-003).
- **Text**: both sides trimmed (FR-013) and normalised to Unicode NFC, so a composed "ö" equals
  "o" with a combining diaeresis. Spaces inside a value count as written. Ignoring letter case
  compares `str.casefold()`, which also matches "STRASSE" with "straße" and "KÖLN" with "Köln"
  (EC-7). "Contains" and "doesn't contain" are substring tests.
- **Numbers**: strict comparisons with one value (F6). A JSON boolean is not a number.
- **Enums**: "includes one of" holds when at least one of the document's values is in the set,
  "includes none of" when none is (FR-003); a single value counts as a list of one. String values
  compare ignoring letter case, codes as integers. A value outside the field's set matches none of
  the rule's values.
- **Couldn't be checked** (FR-014): the value is missing, `null`, an empty list, a text that is
  empty after trimming, or can't be read for the condition, such as a date of birth with only a
  year. A rule on a licence class's date for a class the licence doesn't hold is `not_met` (EC-6).
  A class is held when the licence lists it, whatever its own expiry date (FR-003). A held class
  without its own expiry date is `not_checked`; it never falls back to the licence's expiry date
  (Clarification 2026-10-24).
- **Levels**: AND holds when every item holds, OR when at least one does (FR-009). A group's result
  is computed over its active members; `not_checked` counts as not met. A dissolved group (R4)
  isn't reported and passes its single remaining member through. A branch without active rules is
  met (FR-009).
- **Messages** (FR-011): none when the top level is met; otherwise, walking the top level in
  order, the message of each item that isn't met, and for a group without its own message, the
  messages of its members that aren't met, recursively.

**Rationale**: the edge cases of SC-003 (birthday on the day of sharing, 29 February, end of
month, letter case) are all date or string arithmetic that unit tests can pin exactly. `casefold`
is Python's documented tool for caseless matching. Evaluating in a pure function keeps it apart
from EUDIPLO and the database.

**Alternatives considered**: *`dateutil.relativedelta`* for months: it clamps 31 January + 1 month
to 28 February, where the spec says 1 March; and it would be a new dependency. *`str.lower()`*:
doesn't match "ß" with "ss". Both rejected.

## R8. What serviceBW receives

**Decision**:
- The pull answer gains one field, `evaluation`, next to `documents` (contracts/integration-api.md).
  It is `null` whenever `documents` is `null`, and present whenever they are, so it is delivered,
  repeated and gone together with them (FR-017). Everything else stays as in spec 001 (FR-010).
- `evaluation` carries `branch` (`id`, `name`), `met`, `results` (every evaluated rule and group in
  tree order, with `id`, `type`, `name`, `group` and `outcome`), and `messages` (`id` and
  `message`, FR-011). It contains no field value (FR-017).
- The evaluation is **computed at each delivery** from the documents just read from EUDIPLO and
  the request's rule set: in `document_requests._deliver`, after extraction and before the
  delivery is counted, so an unexpected evaluation error consumes nothing: the pull answers `500`
  with an `error_id` through spec 001's catch-all handler, the repeat window doesn't start, and
  serviceBW can pull again (FR-017). It is never stored and never logged; only its absence of
  errors is.
- A request triggered before this feature, without a rule set, is evaluated as the main branch
  without rules: `met: true`, no results, no messages (US1-AS7, SC-005).

**Rationale**: an additive field keeps every serviceBW form that ignores it working (FR-010,
SC-005). Recomputing on repeat pulls is deterministic, because the day of sharing is fixed, and
avoids storing anything derived from citizens' data. The cost is microseconds (SC-004).

**Alternatives considered**: *storing the evaluation on the request*: personal data at rest that
FR-017 forbids to outlive the documents, for no gain. *A separate evaluation endpoint*: another URL
per branch for serviceBW to configure. Both rejected.

**Confirmed**: serviceBW ignores fields of the pull answer it doesn't know (spec Assumptions,
"serviceBW's role"), so the additive field is safe.

**To agree with serviceBW** (extends 001-R20, DO.IT's task): that serviceBW reads
`evaluation.met` and shows `evaluation.messages`, and how it identifies results (`results[].id`).
An identifier names a rule, not what it checks: DO.IT agrees a change of what a rule checks with
serviceBW, or replaces the rule (spec Assumptions).

## R9. Saving documents, branches and rules together or not at all (FR-028)

**Decision**:
- `POST /api/form-connections` and `PUT /api/form-connections/{id}` accept the rules with the rest
  (`rules`, contracts/management-api.md). Absent in a `PUT`, they stay unchanged; absent in a
  `POST`, the form connection gets a main branch "Standard" without rules.
- **Validation first**: the server checks the documents, then the rules against those documents
  (FR-006), before anything is written or EUDIPLO is called. A refusal is a `400` whose message
  names the problem, the rule and its branch (data-model.md, "Validation").
- **Rules only changed**: one transaction under the form connection's row lock inserts the next
  rule set, inserts new branch rows, marks omitted branches deleted, advances the counters (R5)
  and sets `current_rule_set`.
- **Documents changed too**: spec 001's `create_revision` reserves the revision and creates the
  EUDIPLO configuration as before. Its final locked transaction, which makes the revision current,
  now also does everything of the rules-only case. A failure anywhere leaves the previous revision
  and rule set current, and the editor offers "Try again" (FR-028, F23).
- **Create**: the EUDIPLO configuration first, then one transaction with the form connection,
  revision 1, the branch rows and rule set 1, as today.
- An unchanged rule set (same snapshot after normalisation) creates no new version, as unchanged
  documents create no revision.
- **Saving over newer rules** (FR-028): `GET /api/form-connections/{id}` returns
  `rule_set_version`. The editor sends `rules` only when the team member changed them, with
  `base_version`, the version it loaded. If `current_rule_set` differs from `base_version` and
  `replace` isn't set, the save is refused with `409 rules_changed`, before the rules are checked
  and before EUDIPLO is called, and again under the row lock, and nothing is saved. Checking the
  version first means that a stale editor meets this answer, not a refusal that its staleness
  causes, such as "Unknown variant." for a branch another save deleted. Its message names every
  branch that replacing would delete (the current rule set's branches that the save leaves out)
  and every branch that replacing brings back (branches of the save that another save deleted).
  The save dialog then offers "Reload" (fetch the form connection again, dropping the unsaved
  changes) or "Replace their changes" (the same save with `replace: true`).
- **Replacing** saves the editor's version whole (FR-028): rules and groups that the other save
  deleted come back under their identifiers (R5); a branch that it deleted comes back as a new
  branch with a new id, so a new pull URL, since the deleted one's answers `409 unavailable` for
  good (FR-027); R5's shift keeps new identifiers unique. The rule set is the unit: the server
  can't merge two saves per branch, since only the editor propagates (R4). Name and documents keep
  spec 001's "the later save wins".

**Rationale**: it reuses spec 001's proven ordering (no transaction held while EUDIPLO answers;
reserve, call, lock and commit) and adds the rules to the one commit that makes a change visible.
The version check stops a stale editor from silently deleting a branch whose pull URL serviceBW
may already use, which would answer "unavailable" for good (FR-027).

**Alternatives considered**: *a separate `PUT …/rules` endpoint*: the editor saves documents and
rules with one action, and two calls can't be atomic. Rejected. *Refusing a stale save without an
override*: the team member would lose their changes every time. Rejected (Clarification,
requirements checklist). *Merging per branch on the server*: needs the propagation of R4 on the
server. Rejected.

## R10. The rules step in the frontend

**Decision**:
- The wizard gets a third step, **Rules**, between Documents and Publish, in create and in edit
  (FR-001). `EditorStep` gains `'rules'`; the details lead to it through the existing
  `EditLocationState` (FR-030, W7).
- **State**: the editor's `useReducer` keeps the connection and documents; the rules get their own
  reducer (`rulesReducer`) for the branches, the open tab, select mode, dialogs and toasts, and
  the rule editor a third one for the rule being edited (Constitution: `useReducer` for related
  state). Nothing reaches the API before Publish or Save (spec 001).
- **Pure modules** in `frontend/src/utils/rules/`, used by the rules step, the publish dialog and
  the details: tree operations with dissolution (`tree.ts`), propagation and marks
  (`branches.ts`), statements in FR-005's words (`statements.ts`), proposed messages
  (`messages.ts`), condition definitions and completeness (`conditions.ts`), the editor's date
  example (`dates.ts`) and the pre-checks of FR-006 (`validation.ts`).
- **Shared presentation**: the read-only rule row, group frame, connector chip, branch mark and
  branch name with its (i) live in `src/components/`, so the details show the rules "in the layout
  of the rules step" (FR-030, F26) from the same components.
- **Leaving the rule editor** with unsaved changes, including through Publish, Save and "Add it in
  Documents", opens the design's "Save changes to Rule 01?" (FR-006, F10).
- **Group menu**: "Ungroup" and "Delete group", or "Remove" and "Restore" for an inherited group
  in a based branch (FR-008, W8). **Saving over newer rules**: the save dialog's `409
  rules_changed` state with "Reload" and "Replace their changes" (FR-028, W9).
- **Order**: items keep the order of adding; a new group takes its first member's place. There is
  no reordering (FR-007).
- **Catalog data**: `useDocumentTypes` gains kinds and parts; a new `useOptionSets` loads the value
  sets once.
- KERN components and patterns as in spec 001 (`docs/KERN-DESIGN-SYSTEM.md`): menus, dialogs,
  checkboxes, badges, toasts. The design's ≥, < and = chips are `aria-hidden` (FR-005).

**Rationale**: the existing editor is already a reducer with a step machine; a third step and
separate reducers keep each component small (CLAUDE.md). Pure modules make the trickiest logic
reviewable, reusable between editing and display, and testable with Vitest in Node (R12).

**Alternatives considered**: *a separate route for the rules step*: the wizard's state would have
to survive navigation, and spec 001's editor keeps everything in one page. Rejected.

## R11. Existing form connections and requests

**Decision**: one migration (autogenerated, then completed by hand and reviewed, Constitution V):
- creates `form_connection_branches` and `form_connection_rule_sets`;
- adds `form_connections.current_rule_set`, `next_rule_number` and `next_group_number`, and
  `document_requests.rule_set_id` (nullable);
- gives every existing form connection a main branch row and rule set 1, with a main branch named
  "Standard", AND, and no rules, then makes `current_rule_set` non-null.

Requests in progress during the upgrade keep `rule_set_id` empty and are evaluated as met (R8).
Their URLs don't change (FR-018, SC-005). `app.cli clear-connections` also deletes the branches and
rule sets.

**Rationale**: every form connection then has the same shape, and the only special case, requests
started before the upgrade, ends within 7 days with their records (spec 001, FR-021).

## R12. Tests

**Decision**:
- **Backend unit tests** (`tests/unit/`): the evaluator, condition by condition, with every edge
  case of SC-003 and the Edge Cases (birthday on the day of sharing, 29 February, "exactly N years"
  on the day before the next anniversary, months at a month's end, midnight in Germany, strict
  before and after, letter case, "ß", composed and decomposed letters, spaces, missing, empty and
  unreadable values, values outside an enum's set, licence classes held, not held and expired);
  messages (FR-011); dissolution; the snapshot validation (R4 invariants, FR-006 messages, reserved
  and taken names); identifier allocation (R5); the catalog's kinds.
- **Backend API tests** (`tests/api/`): create and edit with rules, refusals, atomicity when
  EUDIPLO fails (FR-028), `409 rules_changed` and `replace` (FR-028), branch pull URLs with every
  answer of R3, deleted and later branches, rules changed while a request is open, legacy
  requests, the repeat window across branches, an evaluation error that consumes nothing (R8),
  and that no evaluation or reference reaches a log.
- **Frontend unit tests** (Vitest, constitution v1.1.0): a `*.test.ts` beside each pure module of
  `src/utils/rules/` (R10), in the `node` environment, run by `npm test` as a gate:
  - `branches.test.ts`: each propagation rule of data-model.md, "Propagation from the main
    branch": content follows the main branch (1); a deleted item disappears, or stays as `added`
    when the branch changed it (2, EC-12, EC-13); an added item appears at the matching place, and
    not in a branch that started empty (3, EC-14, US3-AS6); moves, except into a group of the
    branch's own (4); dissolved groups (5); the top-level AND/OR while `operator_mark` is `null`
    (6); a rename that would clash in a based branch, which follows the item or changed it, is
    refused, naming that branch (7). Every
    transition of "Marks in a based branch": edit, undo, an edit back to the main branch's content
    (clears the mark) and a main-branch change to equal content (doesn't), remove, restore,
    removing a changed item, restoring a group with the members removed inside it (FR-024),
    switching an inherited group's AND/OR (EC-15); the main branch's ungroup and delete group
    (rule 8), and a changed group that the main branch's deletion dissolves, with the branches the
    confirmation names (rule 5). Every result is also checked against the invariants that the server
    enforces (data-model.md, "Validation": each main-branch item once per based branch, unmarked
    and removed items equal to the main branch's), so a propagation bug fails here before the
    server refuses a save.
  - `tree.test.ts`: dissolution in the main branch, in a branch that started empty and in a
    branch's own group, and the derived dissolution of an inherited group, including its return
    when two members are active again (FR-008, EC-16); ungroup and delete group, a sub-group that
    reaches the top level keeping its identifier, name, AND/OR and message, and a new group in its
    first member's place (FR-007, FR-008); numbering of new items from the counters, default names
    with two digits, new identifiers for duplicates and copies (R5, FR-010, FR-022).
  - `statements.test.ts`, `messages.test.ts`, `conditions.test.ts`, `dates.test.ts`,
    `validation.test.ts`: the statements in FR-005's words ("years old" only on the Date of birth,
    FR-003), the proposed messages, when a condition is complete, the editor's date example, and
    the pre-checks of FR-006 with the server's messages, reserved and taken names included
    (data-model.md, "Validation").
  - Not covered: rendering, focus and keyboard use, which would need jsdom. They stay with the
    quickstart's scenarios (V1, V3, V4, V7).
- **Manual**: the quickstart's scenarios with a real wallet. `scripts/issue_test_credentials`
  gains `--birth-date` and `--licence-class CODE:ISSUE_DATE`, so test documents on both sides of a
  condition can be issued on purpose (SC-003).

**Rationale**: the evaluator decides what citizens are told; it gets exhaustive unit tests.
Propagation decides which rules each branch shows and saves, and runs only in the browser (R4):
without tests of its own, a bug would surface only as a refused save or in a manual scenario.
Tests beside each module pin every rule of data-model.md, and the server's invariant checks stay
as the last line. Keeping the tests to pure functions in Node (constitution III) keeps `npm test`
fast and the new dependency to one package.

**Alternatives considered**: *jsdom with a DOM testing library*, to test the rules step's
components: outside the constitution's stack (v1.1.0), and the logic worth pinning is already in
pure modules. Rejected. *Running propagation on the server too and comparing*: the second
implementation that R4 rejects. Rejected.

## R13. Figma deviations reach every UI task

**Decision**:
- [contracts/ui-screens.md](contracts/ui-screens.md) has a section "Deviations from Figma": per
  screen, the decided items F1–F32 and W1–W7 of the audit, and W8 and W9 of the requirements
  checklist, with their node-ids, what to build
  instead, and for each W# the frame or KERN pattern it reuses. A coverage index lists every item
  with its screens.
- `/speckit-tasks` writes each UI task with the F# and W# items it covers; a UI task without a
  citation, or an item without a task, is a gap for `/speckit-analyze`.
- The copy the decisions leave to "the design notes" (F7, F14, W3, W8, W9, and the cosmetic FYI
  #20) goes
  to `specs/002-connection-rules/design-notes.md`, written by the first UI task, as spec 001's
  design notes were.
- The implementation follows CLAUDE.md's Figma workflow: an item's spec behaviour and wording with
  Figma's layout and styling; the visual check lists the difference with its item number instead
  of fixing it.

**Rationale**: the user decided that spec.md decides behaviour and wording and Figma only layout
and styling, and that Figma won't be updated soon; without the citations, an implementer reading a
frame would build the frame.

## R14. Points to verify at implementation

| Point | How |
|---|---|
| The PID rulebook v1.7's `sex` codes | Read the rulebook; the `sex` option set follows it (R6) |
| The licence class list and descriptions | Compare with Figma U12 `6350:42145` and U24 `6191:42191`; record in design-notes.md (R6, F32) |
| `driving_privileges` arrives in full | The hosted EUDIPLO runs `9.0.0-mdocfix.1` (docs/EUDIPLO.md). An instance without the fix delivers `[{}, …]`, and every licence class rule then reports `not_checked`. Check once with a test licence (quickstart V2) |
| How the PID's `place_of_birth` and `nationalities` arrive | Check with `issue_test_credentials --show-claims`: an object with `country`, `region`, `locality`, and a list of alpha-2 codes |
| How serviceBW uses the evaluation | DO.IT confirms with serviceBW (R8) |
| A Vitest release that supports Vite 8 | Check Vitest's peer dependency on `vite` before installing, and that `npm run build` (`tsc -b`) type-checks the `*.test.ts` files and the `test` block of `vite.config.ts` (R12) |
