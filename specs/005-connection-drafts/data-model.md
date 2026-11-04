# Data Model: Connection Drafts and Crash Recovery

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Decisions**: [research.md](research.md)

This extends [spec 001's data model](../001-servicebw-eudi-middleware/data-model.md) and
[spec 002's](../002-connection-rules/data-model.md). Their tables, snapshot and validation rules
still apply. This document covers only what changes:
- one table gains columns and a constraint;
- one JSONB shape is new;
- a browser record is new.

No other table changes.

---

## 1. `form_connections`: drafts and published connections

### New and changed columns

| Column | Type | Before | Now | Meaning |
|---|---|---|---|---|
| `published_at` | `timestamptz`, nullable, indexed | — | new | When the connection was published. **Null exactly while it is a draft** (R1). The migration sets it to `created_at` on every existing row |
| `current_revision` | `integer` | not null | **nullable** | Null exactly while a draft: a draft has no revision (FR-005) |
| `current_rule_set` | `integer` | not null | **nullable** | Null exactly while a draft: a draft has no rule set |
| `draft` | `jsonb`, nullable | — | new | A draft's content (section 2). Null once published |
| `draft_version` | `integer`, nullable | — | new | A draft's version: 1 when created, +1 on every save (FR-022, R6). Null once published |

These columns keep their meaning, now for drafts too:
- `name`: required for drafts too, 1–200 characters.
- `servicebw_form`: may be `''` in a draft.
- `next_rule_number` and `next_group_number`: the draft's numbering, carried into publishing
  (R4).
- `is_active`: stays `true` on a draft and means nothing until it is published. Deactivating
  isn't offered for a draft (FR-007).
- `deleted_at`: published connections only. A draft is deleted by removing its row (R7).
- `created_at` and `updated_at`: `updated_at` changes with every save, which the overview shows as
  the last save (FR-007).

### The two states (CHECK constraint `ck_form_connections_draft_or_published`)

```sql
(published_at IS NULL     AND current_revision IS NULL     AND current_rule_set IS NULL
                          AND draft IS NOT NULL            AND draft_version IS NOT NULL)
OR
(published_at IS NOT NULL AND current_revision IS NOT NULL AND current_rule_set IS NOT NULL
                          AND draft IS NULL                AND draft_version IS NULL)
```

The model declares it in `__table_args__`. The migration adds it by hand (R15).

### State transitions

```text
                 POST …/drafts                   PUT …/{id}/draft  (version +1)
  (nothing) ─────────────────────▶  DRAFT  ◀────────────────────────────┐
      │                              │  │ └────────────────────────────┘
      │                              │  │
      │                              │  └── DELETE …/{id}/draft ──▶ (row removed; URLs 404)
      │                              │
      │                              └── POST …/{id}/publish ──▶ PUBLISHED
      │                                   (revision, rule set 1, branch rows, config)
      │
      └── POST /api/form-connections (unchanged) ──────────────────▶ PUBLISHED

  PUBLISHED: unchanged from specs 001 and 002 (edit, deactivate/activate, soft delete).
             Never becomes a draft again (FR-023, FR-026).
```

| From | Action | To | Refused when |
|---|---|---|---|
| nothing | create draft | draft, version 1 | structure (FR-003) → `400` |
| draft | save draft | draft, version + 1 | version outdated without `replace` → `409 draft_changed`; structure → `400` |
| draft | publish | published | outdated → `409 draft_changed`; completeness, as for creating → `400`; EUDIPLO → `502`/`503` |
| draft | delete | removed | — |
| published | save draft, publish, delete draft | — | always: `409 draft_published` |
| draft | update, deactivate, activate, delete (published endpoints) | — | always: `409 not_published` |
| removed draft | anything | — | always: `404` |

### Reading the state in code

- A row is a draft when `published_at is None`.
- `services/drafts.py` holds the draft paths.
- Every published-only path narrows `current_revision` and `current_rule_set` from
  `int | None` to `int` behind a guard that refuses drafts (R8).

---

## 2. The draft content (`form_connections.draft`)

One JSON document, read and written whole, validated with a Pydantic `TypeAdapter` (`DRAFT_CONTENT`
in `schemas.py`) on the way in and out, like `RULE_SET_SNAPSHOT`:

```text
DraftContent {
  documents: RequestedDocument[]   # catalog order; may be empty; a document may have no fields
  branches:  BranchInput[]         # main branch first; every branch's id is null (no branch rows)
  step:      'connection' | 'documents' | 'rules' | 'test'   # the step it was saved in (FR-002)
}
```

- `RequestedDocument` and `BranchInput` are spec 001's and spec 002's shapes, with their trees of
  `RuleItem` and `GroupItem`, marks, conditions and messages. Incomplete rules keep `target: null`,
  `condition: null` or `message: ''` (FR-004).
- The name and the serviceBW form are in their columns, not in the JSON.
- Never stored: personas, findings, the open variant tab, an open rule editor's position, or
  any value of a citizen (FR-002, spec Assumptions).

---

## 3. Validation (FR-003, FR-004, FR-009; R3)

A draft save checks the structure only. Publishing applies the full checks of creating a
connection. Both run the same validators (`complete=False` or `True`). The table in
[research R3](research.md#r3-one-implementation-of-the-checks-structure-always-completeness-only-for-publishing)
lists every check and where it applies.

The messages are publishing's (spec 001, data-model.md "Validation"; spec 002, data-model.md
"Validation"), such as:
- "Enter a name."
- "The name can have at most 200 characters."
- "The form ID can have at most 500 characters."
- "Unknown document type 'x'."
- "Unknown field 'x' for 'Personal ID'."
- "'Personal ID' is added more than once."
- "A connection can have at most 20 variants."
- "The rules need exactly one main branch."
- "The rules contain an invalid identifier. Reload the connection and try again."
- "The variant Taxi is out of step with Standard. Reload the connection and try again."

In a draft, a variant or item may have no name. Where a message would name it, it uses
`Variant <n>` (its position, Standard being 1) or the item's identifier (`rule-7`).

Two further structural rules apply to drafts:
- **No branch ids.** Every branch of a draft has `id: null`, since a draft has no branch rows. The
  create path already refuses any other id ("Unknown variant.").
- **`numbering_base`.** It is the counters the editor started from. An identifier below it counts
  as loaded, and one at or above it is new and is shifted past numbers taken meanwhile (R4). As
  for published connections, the base itself isn't checked against the counters: a base above
  them only leaves a gap in the numbering.

---

## 4. Identifiers and counters (R4)

| Situation | Counters used | Known identifiers |
|---|---|---|
| Create a connection (unchanged) | (1, 1) | none |
| Create a draft | (1, 1) | none |
| Save a draft | the row's, under the lock | identifiers below `numbering_base` |
| Publish a draft | the row's, under the lock | identifiers below `numbering_base` |
| Save the rules of a published connection (unchanged) | the row's | spec 002, R5 |

After each save the row's counters are `max(counter, highest identifier + 1)`, and never lower.
`first_rule_set()` takes the row's counters, which are (1, 1) for a connection created without a
draft, so that path doesn't change.

---

## 5. Management API shapes

The schemas are in [contracts/management-api.md](contracts/management-api.md). `schemas.py` is the
source of truth, and `frontend/src/types/form-connections.ts` mirrors it in the same change
(constitution I). In summary:
- `FormConnectionSummary` and `FormConnection` gain `status`.
- `FormConnectionDraft`, `DraftRules`, `DraftCreate`, `DraftUpdate` and `DraftPublish` are new.
- `FormConnectionOrDraft` is the union that `GET /api/form-connections/{id}` answers.

---

## 6. Local draft (browser only; R9–R11)

A record in `window.localStorage`. It never leaves the device by itself (FR-020).

**Key**: `connection-portal:local-draft:v1:<username>:<flowKey>`
- `<username>` is the signed-in account's (`UserView.username`; R11).
- `<flowKey>` is `new-<uuid>` for a connection that was never saved, or `draft-<form connection id>`
  for a stored draft. There is at most one per stored draft and one per new connection (FR-015).

**Value** (JSON):

```text
LocalDraftRecord {
  format: 1
  flowKey: string                  # repeated, so a record is self-describing
  draftId: string | null           # the stored draft it belongs to; null for a new connection
  draftVersion: number | null      # the draft version the flow loaded (FR-015, FR-022)
  changedAt: string                # ISO 8601, the last change (FR-016)
  step: 'connection' | 'documents' | 'rules' | 'test'
  content: LocalDraftContent
}

LocalDraftContent {
  name: string                     # may be empty: shown as "Untitled connection"
  servicebwForm: string
  documents: RequestedDocument[]
  branches: BranchInput[]          # as the rules step holds them, the open rule kept (R9)
  numberingBase: NumberingBase     # what the flow numbers from (sent as numbering_base)
  counters: NumberingBase          # the next numbers the flow gives
}
```

**Rules**:
- **Content.** It equals what "Save and exit" would send at that moment, apart from the version
  (FR-015). Never: personas, findings, the open tab, the rule editor's position, or citizen data.
- **Baseline.** What is already safe elsewhere, so that a record holds only unsaved work:
  - the empty flow (`emptyContent()`) for a new connection, fresh or resumed;
  - the stored draft as loaded, for a stored draft opened on its edit route, also after "Restore
    changes";
  - none for a stored draft's record resumed through `?local=`, since that flow doesn't read the
    stored draft (R10).

  Never the record's own content: that copy exists only on the device.
- **When it is written.** After the first change in the flow, while `content` differs from the
  baseline, or on every change without one. It is written at once, then at most once a second,
  and flushed on `pagehide`, on `visibilitychange` to hidden, and on leaving the flow. Opening a
  flow writes nothing.
- **When it is removed.**
  - When a change brings the content back to the baseline. Without a baseline, only the cases
    below remove it.
  - After a successful save or publish (FR-018).
  - On "Discard" after confirming (FR-018).
  - On "Reload" and "Open the connection" (R6).
  - After 30 days without a change, when listed (FR-018).
  - At sign-out, after the warning (FR-019).
- **Validation on read.** A record that fails validation (format, types, its key's flow key) is
  ignored and removed. Storage errors (blocked, quota) make the feature silently unavailable
  (FR-021).

Contract: [contracts/local-drafts.md](contracts/local-drafts.md).

---

## 7. Editor state (frontend)

What the create flow's state gains (`pages/FormConnectionEditor/types.ts`). The rules state of
spec 002 is unchanged.

```text
EditorOrigin =
  | { kind: 'new'; flowKey: string }                                  # /form-connections/new, /get-started
  | { kind: 'draft'; draftId: string; draftVersion: number; flowKey: string }
  | { kind: 'published'; formConnection: FormConnection }             # edit flow, unchanged (FR-026)

EditorState gains:
  savingDraft: boolean                  # "Save and exit" in progress
  draftError: DraftSaveError | null     # a refused or failed draft save, shown above the step (FR-013)
  conflict: DraftConflict | null        # the dialog after a refused save or publish (R6)
  # `rulesChanged` (spec 002) stays for the published edit flow

DraftSaveError = { notice: ErrorNotice; retryable: boolean }   # retryable: "Try again" shows (S1.5)
DraftConflict  = { kind: 'draft_changed' | 'draft_published' | 'draft_deleted';
                   during: 'save' | 'publish';                 # what "Replace their changes" resends
                   message: string }                           # the server's, or the deleted text
```

The flow's baseline (`baseline: LocalDraftContent | null`, section 6) is kept beside the reducers,
so that the local draft holds only unsaved work.
