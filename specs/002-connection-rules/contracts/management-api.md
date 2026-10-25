# Contract: management API, with rules and branches

**Consumer**: the middleware's own React frontend. **Requirements**: FR-001 to FR-008, FR-010,
FR-018 to FR-022, FR-025, FR-026, FR-028 to FR-031. **Decisions**: research R5, R6, R9.

This extends spec 001's contract
([../../001-servicebw-eudi-middleware/contracts/management-api.md](../../001-servicebw-eudi-middleware/contracts/management-api.md)).
Its common rules stay: everything under `/api`, the `{data, message?}` and `{error, message,
error_id?}` envelopes, the session cookie (`401` without it, FR-031), JSON-only state changes
(`415`), and the common errors. The Pydantic schemas in `backend/app/schemas.py` are the source of
truth; `frontend/src/types/` mirrors them in the same change (Constitution I).

## Schemas

New and changed shapes. The snapshot's keys and rules are in
[data-model.md](../data-model.md#the-snapshot).

```text
# Catalog (GET /api/document-types): DocumentField gains
DocumentField    { key: str, label: str,
                   kind: 'text' | 'number' | 'date' | 'enum' | 'image' | 'parts',
                   option_set: str | null,          # enum fields: the key of their value set
                   date_of_birth: bool,             # date fields worded as an age (FR-003)
                   parts: FieldPart[] | null }      # 'parts' fields only
FieldPart        { key: str, label: str, kind: 'text' | 'enum' | 'date',
                   option_set: str | null,
                   per_licence_class: bool }        # true: one part per class, e.g. "Licence class B – Issue date"

# Value sets (GET /api/option-sets)
OptionSet        { key: str, options: Option[] }
Option           { value: str | int, label: str, description: str | null }

# Rules (input and output)
RuleTarget       { document_type: str, field: str, part: str | null, licence_class: str | null }
Condition        { operator: str, value?: float | str | null, match_case?: bool,
                   values?: (str | int)[] | null, date?: str | null,
                   years?: int | null, amount?: int | null, unit?: 'years' | 'months' | null }
RuleItem         { type: 'rule', id: str, name: str, mark: Mark | null,
                   target: RuleTarget | null, condition: Condition | null, message: str }
GroupItem        { type: 'group', id: str, name: str, mark: Mark | null,
                   operator: 'and' | 'or', message: str | null, items: (RuleItem | GroupItem)[] }
Mark             = 'changed' | 'removed' | 'added'
BranchInput      { id: str | null,                  # null: a branch added in this save
                   name: str, description: str | null,
                   origin: 'main' | 'based' | 'empty',
                   operator: 'and' | 'or', operator_mark: 'changed' | null,
                   items: (RuleItem | GroupItem)[] }
RulesInput       { branches: BranchInput[],          # main branch first
                   numbering_base: { rule: int, group: int },    # the counters the editor started from
                   base_version: int | null,         # the rule set version the editor loaded; null on create
                   replace: bool = false }           # true: save over newer rules (FR-028)

# Output
Branch           = BranchInput with { id: str, is_main: bool, pull_url: str }

# Form connections: changed
FormConnection   { id, name, servicebw_form, is_active, documents, trigger_url,
                   pull_url,                        # the main branch's, as in spec 001
                   branches: Branch[],              # new: main branch first, in tab order
                   rule_set_version: int,           # new: the current rule set (research R9)
                   next_rule_number: int,           # new (research R5)
                   next_group_number: int,          # new
                   created_at, updated_at }
FormConnectionCreate { name, servicebw_form, documents,
                       rules?: RulesInput }          # absent: a main branch "Standard" without rules
FormConnectionUpdate { name?, servicebw_form?, documents?,
                       rules?: RulesInput }          # absent: unchanged
```

The editor sends `rules` in an update only when the team member changed them, so that a save of
the name or the documents alone never meets `409 rules_changed`.

The request schemas accept incomplete rules (an empty `message`, a `null` `condition`): the service
layer checks them, so that its message can name the problem, the rule and its branch, as spec 001
does for documents.

## Endpoints

| Method and path | Body | Success | Effects |
|---|---|---|---|
| `GET /api/document-types` | none | `200 {"data": DocumentType[]}` | As in spec 001, with each field's `kind`, `option_set`, `date_of_birth` and `parts` |
| `GET /api/option-sets` | none | `200 {"data": OptionSet[]}` | **New**. The value sets of enum fields and parts: `countries`, `sex`, `licence_classes`, `eye_colours`, `hair_colours` (research R6). Licence classes carry their description, such as "Cars up to 3.5 t" |
| `GET /api/form-connections/{id}` | none | `200 {"data": FormConnection}` | Also returns the current rule set's branches, each with its `pull_url`, and the identifier counters |
| `POST /api/form-connections` | `FormConnectionCreate` | `201 {"data": FormConnection, "message": "Form connection created"}` | Creates revision 1, its EUDIPLO configuration, the branches and rule set 1, together or not at all (FR-028) |
| `PUT /api/form-connections/{id}` | `FormConnectionUpdate` | `200 {"data": FormConnection, "message": "Form connection updated"}` | Changed rules become the next rule set; changed documents the next revision. Both become current in one transaction; requests already in progress keep theirs (FR-028). Branches left out are deleted (FR-020, FR-027). New branches get their `id`. No URL changes (FR-025) |

The other endpoints of spec 001 (list, deactivate, activate, delete) are unchanged. Deactivating,
reactivating and deleting apply to the trigger URL and every branch's pull URL (FR-027).

## Errors added by this feature

| Status | `error` | When |
|---|---|---|
| `400` | `Validation error` | A rule of [data-model.md, "Validation"](../data-model.md#validation-fr-006-fr-020-research-r4-r9) is broken. The message names the problem, the rule or group by its name, and its branch, such as "Rule 02 in Standard has no error message." Nothing is saved |
| `409` | `rules_changed` | `rules.base_version` isn't the current rule set and `rules.replace` is false: another team member saved the rules after this editor loaded them (FR-028). The message names every branch that replacing would delete, such as "Another team member saved the rules of this connection after you opened it. Replacing their changes deletes the variant School transport." Nothing is saved; the editor offers "Reload" or "Replace their changes" (ui-screens.md, W9) |
| `502`, `503` | as in spec 001 | Changed documents need a new EUDIPLO configuration, which failed. Nothing is saved, rules included (FR-028) |

## Saving, step by step (research R9)

1. Check the name, the serviceBW form and the documents (spec 001), then the rules against those
   documents (FR-006). Refuse with `400` before anything is written. If `rules` is present without
   `replace` and `base_version` isn't the current rule set, refuse with `409 rules_changed`.
2. If the documents changed: reserve the next revision and create its EUDIPLO configuration (spec
   001, "Creating a revision").
3. Lock the form connection's row and repeat step 1's version check, since another save may have
   committed meanwhile. Allocate the identifiers of new rules and groups (research R5),
   insert the branch rows of new branches, mark omitted branches deleted, insert the next rule set
   if the rules changed, and make the revision and the rule set current. Commit once.
4. On any failure, nothing is current that wasn't before, and the EUDIPLO configuration of step 2
   is deleted again (spec 001).
