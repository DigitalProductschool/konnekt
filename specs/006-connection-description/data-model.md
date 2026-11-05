# Data Model: Optional Connection Description

**Feature**: [spec.md](spec.md) | **Research**: [research.md](research.md)

Only the serviceBW form changes: it becomes the description. Everything else in spec 005's data
model stays as it is.

## 1. `form_connections.description` (PostgreSQL)

| | Before | After |
|---|---|---|
| Column | `servicebw_form` | `description` (renamed, R1) |
| Type | `String(500)`, NOT NULL | unchanged |
| Empty | `''`, drafts only | `''`, drafts and published connections |
| Index, unique | none | none (several connections may share a description, spec edge cases) |

**Migration** `<rev>_connection_description.py`, `down_revision = 'd2b97ba4a2c7'`:
- **upgrade**: `op.alter_column('form_connections', 'servicebw_form',
  new_column_name='description')`;
- **downgrade**: the reverse.

There is no backfill: every value stays as it was (FR-007). Autogenerate's drop and add must be
replaced by hand (R1).

The stored draft's JSONB `draft` is **unchanged**: it never held the form ID.

## 2. Validation (FR-002, FR-003; R2)

`clean_description(value)` runs on every path: create, update, draft save and publish.

| Input | Stored | Answer |
|---|---|---|
| absent (create bodies), `None`, `''`, spaces only | `''` | accepted |
| text, after trimming at most 500 characters | trimmed text | accepted |
| text, after trimming more than 500 characters | n/a | 400 `Validation error`, `The description can have at most 500 characters.` |

- Characters are code points, as for the name.
- An absent field in `PUT /api/form-connections/{id}` leaves the description unchanged.
- Changing the description creates no revision and no rule set, calls nothing on EUDIPLO, and
  changes no URL (FR-010; R4).

## 3. Local draft record (browser, R5)

`LocalDraftRecord.format`: `1` → **`2`**. In `LocalDraftContent`, `servicebwForm: string` becomes
**`description: string`**, as typed (untrimmed). The key
`connection-portal:local-draft:v1:<username>:<flowKey>` is unchanged.

A record of format 1 is invalid. The store removes it the first time it lists or reads it, and
never offers it (FR-009).

## 4. Editor state (frontend)

| Before | After |
|---|---|
| `EditorState.servicebwForm` | `description` |
| `EditorErrors.servicebwForm` | `description` (too long only) |
| action `changeServicebwForm` | `changeDescription` |
| `ELEMENT_IDS.servicebwForm = 'connection-form-id'` | `ELEMENT_IDS.description = 'connection-description'` |
| `SERVICEBW_FORM_MAX_LENGTH` | `DESCRIPTION_MAX_LENGTH` (500) |
| `VALIDATION_MESSAGES.servicebwFormRequired`, `servicebwFormTooLong` | `descriptionTooLong` only |
| `ConnectionStepProps.servicebwForm`, `onChangeServicebwForm` | `description`, `onChangeDescription` |
