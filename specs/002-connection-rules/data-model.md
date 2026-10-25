# Data Model: Rules for Form Connections, with Groups and Branches

**Phase 1 output of `/speckit-plan`** | **Date**: 2026-10-24 | **Spec**: [spec.md](spec.md) |
**Research**: [research.md](research.md)

This extends spec 001's data model
([../001-servicebw-eudi-middleware/data-model.md](../001-servicebw-eudi-middleware/data-model.md)),
which still applies. The new tables follow Constitution V: `Mapped` / `mapped_column`, UUID4 keys
as `String(36)`, `created_at` and `updated_at` with `server_default=func.now()`, `snake_case`, and
an index on every column used to look rows up.

**No table holds a citizen's documents or an evaluation.** The evaluation is computed at each
delivery from the documents read from EUDIPLO, and is gone with them (FR-017, research R8).

## Spec entities and where they live

| Spec entity | Stored as |
|---|---|
| Rule, Group, Sub-group | Items in a branch's tree, inside a rule set's `branches` snapshot |
| Branch | Identity in `form_connection_branches`; name, description, AND/OR and items in the current rule set |
| Branch Change | The `mark` of an item, and `operator_mark` of a branch, in a based branch's tree |
| Rule Evaluation | Not stored. Computed at each delivery and returned in the pull answer |
| Form Connection (spec 001) | `form_connections`, now also with `current_rule_set` and the identifier counters |
| Document Request (spec 001) | `document_requests`, now also with `rule_set_id` |
| Connection URL (spec 001) | Not stored. One trigger URL; the main branch's pull URL as before; one pull URL per other branch, built from its `id` |

## Relationships

```text
form_connections 1 ──< form_connection_revisions 1 ──< document_requests
form_connections 1 ──< form_connection_rule_sets 1 ──< document_requests (rule_set_id, nullable)
form_connections 1 ──< form_connection_branches
```

A rule set's snapshot names its branches by their `form_connection_branches.id`.

---

## `form_connections`: new columns

| Column | Type | Rules |
|---|---|---|
| `current_rule_set` | `Integer`, not null | The rule set version that new requests use. Set together with `current_revision` when both change (FR-028). The management API returns it as `rule_set_version`, and a save of rules names the version it started from, so that a save over newer rules is noticed (FR-028, research R9) |
| `next_rule_number` | `Integer`, default 1 | The next free rule number. Never lowered (FR-010, research R5) |
| `next_group_number` | `Integer`, default 1 | The next free group number, shared by groups and sub-groups |

## `form_connection_branches`: Branch identity (FR-018 to FR-020, FR-025, FR-027)

| Column | Type | Rules |
|---|---|---|
| `id` | `String(36)` PK | UUID4, set when the branch is first saved. Part of the branch's pull URL, so it never changes (FR-025). Never reused |
| `form_connection_id` | FK → `form_connections.id`, indexed | |
| `is_main` | `Boolean` | Exactly one main branch per form connection: partial unique index on `form_connection_id` `WHERE is_main` |
| `deleted_at` | `DateTime(timezone=True)`, nullable | Set when a save leaves the branch out. Its pull URL then answers `409 unavailable` for good (FR-027). The main branch can't be deleted |
| `created_at`, `updated_at` | `DateTime(timezone=True)` | |

**Pull URLs**, derived, not stored:
- main branch: `{CONNECTION_BASE_URL}/api/connect/{form_connection_id}/requests/{reference}`, as in
  spec 001 (FR-018);
- other branches: `{CONNECTION_BASE_URL}/api/connect/{form_connection_id}/branches/{id}/requests/{reference}`.

## `form_connection_rule_sets`: the branches and their rules, one version per save

| Column | Type | Rules |
|---|---|---|
| `id` | `String(36)` PK | UUID4 |
| `form_connection_id` | FK → `form_connections.id`, indexed | |
| `version` | `Integer` | Starts at 1. Unique together with `form_connection_id` |
| `branches` | `JSONB` | The [snapshot](#the-snapshot): every branch that isn't deleted, main branch first. Never changed after insert |
| `created_at`, `updated_at` | `DateTime(timezone=True)` | |

**When a version is created**: with the form connection, as version 1; and by every save whose
normalised snapshot differs from the current one (research R9). Never by renaming the form
connection or by changing its documents alone. Old versions stay, because requests point to them;
they are small, and `clear-connections` removes them with their form connection.

## `document_requests`: new column

| Column | Type | Rules |
|---|---|---|
| `rule_set_id` | FK → `form_connection_rule_sets.id`, nullable, indexed | The rule set current when the request was triggered (FR-025, FR-028). Empty only for requests triggered before this feature, which are evaluated as met (research R8, R11) |

The trigger reads `current_revision` and `current_rule_set` from the same `form_connections` row,
so a request gets a pair that was saved together.

---

## The snapshot

`form_connection_rule_sets.branches` is a list of branches. The management API uses the same shape
(contracts/management-api.md), plus each branch's `is_main` and `pull_url`.

```json
[
  {
    "id": "6f1c…", "name": "Standard", "description": null,
    "origin": "main", "operator": "and", "operator_mark": null,
    "items": [
      { "type": "rule", "id": "rule-1", "name": "Rule 01", "mark": null,
        "target": { "document_type": "pid", "field": "birthdate", "part": null, "licence_class": null },
        "condition": { "operator": "at_least_years_ago", "years": 21 },
        "message": "You must be at least 21 years old." },
      { "type": "group", "id": "group-1", "name": "Group 01", "mark": null,
        "operator": "or", "message": null,
        "items": [
          { "type": "rule", "id": "rule-2", "name": "Rule 02", "mark": null,
            "target": { "document_type": "pid", "field": "address_locality", "part": null, "licence_class": null },
            "condition": { "operator": "equal_to", "value": "Stuttgart", "match_case": false },
            "message": "You must live in Stuttgart." },
          { "type": "rule", "id": "rule-3", "name": "Rule 03", "mark": null,
            "target": { "document_type": "mdl", "field": "driving_privileges", "part": "issue_date", "licence_class": "B" },
            "condition": { "operator": "at_least_years_ago", "years": 2 },
            "message": "You must have held class B for at least 2 years." }
        ] }
    ]
  },
  {
    "id": "a83e…", "name": "Ambulance", "description": "Applicants for an ambulance licence",
    "origin": "based", "operator": "and", "operator_mark": null,
    "items": [
      { "type": "rule", "id": "rule-1", "name": "Rule 01", "mark": "changed",
        "target": { "document_type": "pid", "field": "birthdate", "part": null, "licence_class": null },
        "condition": { "operator": "at_least_years_ago", "years": 19 },
        "message": "You must be at least 19 years old." },
      { "type": "group", "id": "group-1", "…": "a copy of the main branch's group-1, unmarked" }
    ]
  }
]
```

### Branch

| Key | Type | Rules |
|---|---|---|
| `id` | UUID string, or `null` in a request for a branch not saved yet | Its `form_connection_branches.id` |
| `name` | string | 1–100 characters after trimming. Unique within the form connection, ignoring letter case (FR-020). New form connections and migrated ones call the main branch "Standard" |
| `description` | string or `null` | Up to 500 characters. Not delivered to serviceBW (FR-020) |
| `origin` | `main`, `based` or `empty` | `main` for the main branch only. Fixed when the branch is added (FR-019) |
| `operator` | `and` or `or` | The top level's combination, AND by default (FR-007) |
| `operator_mark` | `changed` or `null` | Only in a based branch: the top level's AND/OR was switched there and no longer follows the main branch (FR-021) |
| `items` | list of rules and groups | The top level, in display order, which is the order of adding: a new rule at the end of its level, a new group in its first member's place. Team members can't reorder (FR-007) |

### Rule

| Key | Type | Rules |
|---|---|---|
| `type` | `rule` | |
| `id` | `rule-{n}` | [Identifiers](#identifiers-and-names) |
| `name` | string | 1–100 characters after trimming, unique within the branch (FR-005) |
| `mark` | `changed`, `removed`, `added` or `null` | [Marks](#marks-in-a-based-branch) |
| `target` | object | `document_type` and `field`: a requested field that isn't an image (FR-002). `part`: for a field made of parts, the part (`country`, `region`, `locality` for the ID's place of birth; `classes`, `issue_date`, `expiry_date` for the licence classes), otherwise `null`. `licence_class`: the class code for `issue_date` and `expiry_date`, otherwise `null` (FR-003) |
| `condition` | object | `operator` and its values, by the target's kind ([Conditions](#conditions)) |
| `message` | string | The error message for the citizen: 1–500 characters after trimming (FR-004) |

### Group and sub-group

| Key | Type | Rules |
|---|---|---|
| `type` | `group` | A group at the top level, a sub-group inside a group (the level decides, not the key) |
| `id` | `group-{n}` | |
| `name` | string | As for a rule. Default "Group NN" or "Sub-group NN" |
| `mark` | as for a rule | |
| `operator` | `and` or `or` | AND by default (FR-007) |
| `message` | string or `null` | Its own error message, 1–500 characters, or none (FR-004, FR-011) |
| `items` | list | A group holds rules and sub-groups; a sub-group holds rules only (FR-008). At least two active members, except an inherited group dissolved in a based branch ([Dissolution](#dissolution)) |

### Conditions

The target's kind decides the operators (FR-003). Every number of years or months is a whole number
of at least 1 (FR-003m).

| Kind | `operator` | Other keys | Shown as (FR-003, FR-005) |
|---|---|---|---|
| Number | `greater_than`, `less_than`, `equal_to`, `not_equal_to` | `value`: a number | is greater than / is less than / is equal to / is not equal to 180 |
| Text | `equal_to`, `not_equal_to`, `contains`, `not_contains` | `value`: text that isn't empty after trimming (FR-006); `match_case`: boolean, `false` by default (FR-013) | is equal to / is not equal to / contains / doesn't contain "Stuttgart", with whether letter case counts |
| Enum | `includes_one_of`, `includes_none_of` | `values`: one or more values of the field's set, no duplicates | includes one of / includes none of B, BE |
| Date | `before`, `after`, `on` | `date`: `YYYY-MM-DD` | is before / is after / is 1 Jan 2020 |
| Date | `at_least_years_ago`, `less_than_years_ago`, `exactly_years_ago` | `years` | is at least / is less than / is exactly 2 years ago; on a Date of birth: … 21 years old |
| Date | `at_least_from_now`, `less_than_from_now` | `amount`; `unit`: `years` or `months` | is at least / is less than 6 months from now |

The evaluation of each operator is in research R7.

### Identifiers and names

- A rule's identifier is `rule-{n}`, a group's or sub-group's `group-{n}`, with `n` from the form
  connection's counters (research R5). It is set when the item is created and never changes or is
  reused within the form connection (FR-010).
- An item keeps the main branch's identifier in every based branch, marked or not, also once it
  counts as `added` because the main branch deleted the original (FR-010). An item added in a
  branch, a duplicate and a copy to another branch get a new identifier (FR-022).
- The default name is "Rule", "Group" or "Sub-group" and `n` with at least two digits ("Rule 07").
  A sub-group that becomes a group keeps its name ("Sub-group 04") until renamed.
- Names are compared after trimming and ignoring letter case (FR-005, FR-020).
- **Reserved names** (FR-005): a name of the form "Rule NN" is accepted only on the rule
  `rule-{NN}`, and "Group NN" or "Sub-group NN" only on the group `group-{NN}`, with or without
  leading zeros. So default names never clash: not when the main branch adds an item, nor for a
  duplicate or a copy, nor after the server shifts new identifiers (research R5).
- **Taken names in a branch**: every item's name, removed items included, and in a based branch
  also the main branch's name of every `changed` item, so that neither a restore nor an undo can
  create a clash (FR-005, FR-024).

### Marks in a based branch

| `mark` | Meaning | Content | Evaluated |
|---|---|---|---|
| `null` | Follows the main branch (FR-021) | Equal to the main branch's item with the same identifier | Yes |
| `changed` | Changed in the branch (FR-022) | The branch's own | Yes |
| `removed` | Removed in the branch, still shown (FR-023) | Equal to the main branch's item | No |
| `added` | The branch's own item (FR-022) | The branch's own | Yes |

In the main branch and in branches that started empty, `mark` is always `null` (Assumptions:
"A branch that started empty carries no marks").

```text
           edit                         undo, or an edit back to the main branch's content
 follows ─────────▶ changed ─────────────────────▶ follows
    │  remove                                      ▲
    └──────────────▶ removed ───── restore ────────┘
 changed ── remove ──▶ removed   (the branch's change is dropped)

 main branch deletes the item:   follows ─▶ gone    removed ─▶ gone    changed ─▶ added
 main branch adds an item:       appears in every based branch, unmarked, at the matching place
 main branch's content becomes equal to a changed item:   stays changed
 added ── delete ──▶ gone
```

- **What counts as a change** (FR-022): any edit of a rule's target, condition, `match_case`,
  message or name; for a group, its AND/OR, name or message. An edit in the branch that leaves a
  `changed` item equal to the main branch's in all of these clears the mark, as an undo does
  (FR-024). A change in the main branch that makes them equal doesn't, so that a later change in
  the main branch can't overwrite the branch's version.
- Removing an inherited group marks the group `removed`; its members keep their own marks (F15).
  Restoring the group also restores the members removed inside it (FR-024).
- A removed item can only be restored, not changed or deleted (FR-024).
- Switching an inherited group's AND/OR, or changing its name or message, marks it `changed`
  (EC-15); its members keep following the main branch unless changed themselves.
- Adding a rule into an inherited group marks only the new rule (`added`).
- **Group operations** (FR-008): "Ungroup" puts a group's members in its place; "Delete group"
  deletes it with its members. Both apply to the groups of the main branch, of branches that
  started empty, and `added` groups. In a based branch, an inherited group can only be removed and
  restored.

### Propagation from the main branch

When the main branch changes in the rules step, every based branch is updated so that (FR-021,
FR-022, Edge Cases):

1. Each unmarked or removed item takes the main branch's new content.
2. An item the main branch deleted disappears, unless the branch changed it: then it stays,
   marked `added`, where it was, with its identifier (EC-12, EC-13, FR-010).
3. An item the main branch added appears unmarked at the matching place: after the nearest
   preceding sibling that both branches have, in the same parent; at the start of that parent if
   there is none (EC-14). It doesn't appear in branches that started empty.
4. An item the main branch moved moves the same way, except a rule inside a group of the
   branch's own, which stays there (FR-022).
5. A group the main branch dissolved is dissolved in the branch too, unless the branch changed it
   (rule 2 applies to the group). A changed group kept that way that has fewer than two members
   left dissolves all the same (FR-022's one exception, [Dissolution](#dissolution)); the main
   branch's confirmation of the deletion names those branches (F14).
6. The top level's AND/OR follows the main branch while `operator_mark` is `null` (FR-021).
7. A name the main branch gives an item must stay unique in every based branch that follows it;
   otherwise the rename is refused where it is entered, naming that branch (FR-005).
8. The main branch's "Ungroup" reaches based branches as the group's deletion plus its members'
   moves (rules 2 and 4): where the branch follows the group, it goes and the members take its
   place; where the branch changed it, it stays as `added` with its members, since a group of the
   branch's own keeps them (rule 4). "Delete group" reaches them as deletions (rule 2).

### Dissolution

- **Main branch and branches that started empty**: deleting a group's member below two dissolves
  the group at once: the remaining member takes its place, and the group's AND/OR and message are
  dropped (FR-008). A saved group always has two or more members.
- **A based branch**: an inherited group whose **active** members (not `removed`, and not moved
  into a group of the branch's own) number fewer than two counts as dissolved in that branch. It is
  derived, not stored: the group is shown as removed (FR-023), its one active member, if any, takes
  its place and keeps following the main branch, and the group counts again once two members are
  active, through an undo or a member the main branch adds (FR-008, EC-16). A group of the branch's
  own (`added`) that drops below two is dissolved at once, like a main-branch group. This includes
  a changed group that the main branch deleted (propagation rule 5): the branch's change to it
  goes (FR-022).
- **A sub-group that reaches the top level**, through its group's dissolution or ungrouping,
  becomes a group and keeps its identifier, name, AND/OR and message (FR-008).
- The evaluation skips a dissolved group and evaluates its remaining member in its place. A
  dissolved group's result isn't reported.

---

## Validation (FR-006, FR-020, research R4, R9)

The service layer checks a save's rules after its documents, and refuses with `400`
`{"error": "Validation error", "message": …}`. The message names the problem, the rule or group by
its name, and the branch (FR-005, FR-006). The rules step makes the same checks before calling the
API and shows the API's message otherwise.

| Rule | Example message |
|---|---|
| Exactly one main branch, listed first, with the form connection's main branch id (or none yet) | "The rules need exactly one main branch." |
| Every branch has a name | "Enter a name for every variant." |
| Branch names are unique | "Two variants are called Ambulance. Give each variant its own name." |
| A saved branch id belongs to this form connection and isn't deleted | "Unknown variant." |
| A rule checks a requested field, which isn't an image | "Rule 02 in Standard checks data that's no longer requested." (F11) |
| A rule's part and licence class fit its field | "Rule 04 in Ambulance checks a part that Licence classes doesn't have." |
| A rule's condition is complete and fits the field's kind; a text value isn't empty after trimming | "Rule 03 in Standard: enter a number of years of at least 1." / "Rule 05 in Ambulance: choose at least one value." / "Rule 06 in Standard: enter a text to compare with." |
| Every rule has an error message | "Rule 02 in Standard has no error message." |
| Names are unique within each branch, counting the [taken names](#identifiers-and-names) | "Another rule in Ambulance is already called Rule 01." (F12) |
| Reserved names stay on their item | "Rule 08 is kept for the rule numbered 08." |
| Groups hold at least two members; sub-groups hold rules only | "Group 02 in Standard needs at least two rules." |
| Marks appear only in based branches; every main-branch item appears once in each based branch; unmarked and removed items equal the main branch's | "The variant Ambulance is out of step with Standard. Reload the connection and try again." |
| Identifiers are well-formed, unique within each branch, and new ones are at or above `numbering_base` | "The rules contain an invalid identifier. Reload the connection and try again." |
| Size limits: at most 20 branches, 200 items per branch | "A connection can have at most 20 variants." |

Removed items aren't evaluated, but they are checked like the others, so a restore can't bring
back an invalid rule. They mirror the main branch's item, so fixing or deleting it there clears
them (FR-006). A problem in an item that based branches inherit unchanged (unmarked or removed) is
reported once, for the main branch (FR-006). A `changed` item may equal the main branch's item,
after a change in the main branch (FR-024); the invariant "equal to the main branch's" applies to
unmarked and removed items only.

---

## Indexes

Besides the primary keys, unique constraints and foreign keys above:

| Table | Index | Used by |
|---|---|---|
| `form_connection_rule_sets` | Unique `(form_connection_id, version)` | Reading the current rule set; the next version number |
| `form_connection_branches` | `(form_connection_id)`; partial unique `(form_connection_id) WHERE is_main` | Loading a form connection's branches; one main branch each |
| `document_requests` | `(rule_set_id)` | The foreign key; `clear-connections` |

## Migration

One new migration after `9a22d4b976f8` (research R11), autogenerated and completed by hand:
1. Create `form_connection_branches` and `form_connection_rule_sets`.
2. Add `form_connections.next_rule_number` and `next_group_number` (server default 1), and
   `current_rule_set` as nullable.
3. For every form connection: insert a main branch row, and rule set 1 whose snapshot has only that
   branch, named "Standard", `origin: "main"`, AND, no items. Set `current_rule_set = 1`.
4. Make `current_rule_set` not null.
5. Add `document_requests.rule_set_id`, nullable, with its index.

The downgrade drops them in reverse. The committed migrations stay unchanged (Constitution V).
