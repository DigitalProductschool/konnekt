# Contract: the version in the API and in the MCP server

**Requirements**: FR-028 to FR-033, US3. **Decisions**: research R6, R12. **Shapes**:
[data-model.md](../data-model.md) §1.

## 1. The field

`version_fingerprint: str`, always present, on:

| Schema (`backend/app/schemas.py`) | Mirror (`api-types/src/form-connections.ts`) | Built by |
|---|---|---|
| `FormConnection` | `FormConnection` | `_view()` (`app/services/form_connections.py`) |
| `FormConnectionDraft` | `FormConnectionDraft` | `draft_view()` (`app/services/drafts.py`) |

Both builders call one function, `version_fingerprint(...)` in `app/services/versions.py`, with
the content they already hold (the stored draft's `DraftContent`, or the current revision's
documents and rule set's branches). Nothing else computes it: the frontend and the MCP server
read the field.

So every endpoint that answers one of these schemas carries it, with no new endpoint and no new
query:

| Endpoint | Answers |
|---|---|
| `GET /api/form-connections/{id}` | `FormConnection` or `FormConnectionDraft` |
| `POST /api/form-connections`, `PUT /{id}`, `POST /{id}/deactivate`, `POST /{id}/activate`, `POST /{id}/publish`, `PUT /{id}/start-date` (spec 010) | `FormConnection` |
| `POST /api/form-connections/drafts`, `PUT /{id}/draft`, `POST /api/form-connections/example` (spec 010) | `FormConnectionDraft` |
| `GET /api/approval-requests/{id}`, `POST …/approve`, `POST …/decline` | `ApprovalPreview` (through its `draft` and `connection`) |

`FormConnectionSummary` (the overview's list and search) does not get it.

**Example** (a published connection, abridged):

```json
{
  "data": {
    "status": "published",
    "id": "3f9a1c2e-7b4d-4c1a-9e2f-5d8b6a0c4e71",
    "name": "Taxi and private hire driver licence",
    "version_fingerprint": "62D0-715F-01D1",
    "rule_set_version": 4,
    "…": "…"
  },
  "message": null
}
```

A draft's `version` (its save number, spec 005) is unchanged and is not the version the PDF
shows; the UI never calls it "version" (spec, Key Entities).

## 2. The computation

As [data-model.md](../data-model.md) §1: SHA-256 over the canonical JSON of the content, the
first 12 hex digits upper case in groups of four. Conditions in their publishable form
(`publishable_condition()` in `app/services/rules.py`, which `_clean_condition()` also returns
after its checks). Documents in the order the answer lists them (the team's order, spec 010:
`ordered_documents()` with the row's `document_order`), never the revision's catalog order: the
order is content (spec, Clarifications 2026-11-12).

The function is pure (no session, no catalog, no settings) and logs nothing. A failure to compute
can't happen for content that passed the schemas; if it raises, the endpoint's usual `500` with
an `error_id` applies (`CLAUDE.md`, "A 5xx never says what went wrong").

## 3. Tests (pytest; research R6)

`backend/tests/unit/test_versions.py`:
- the format, and a fixed vector: the prototype's sample connection (`prototype/data.mjs`, as a
  Python fixture) gives a fixed string, so a change of the canonical form is noticed;
- one test per kind of element of FR-029 that changes it: the name, the description, a document,
  a data item, a variant's name, description, origin, AND/OR, its mark, a rule's name, target,
  condition value, message, mark, the order of two items, the order of two documents, a group's
  operator and message, the nesting;
- what doesn't change it: `is_active`, `state`, `start_date`, `example`, URLs, counters, `step`,
  the save number, times, labels;
- the publishable form: extra keys, a missing `match_case`, `years: 5.0` and `amount: 2.0` give
  the same fingerprint as the cleaned condition.

`backend/tests/api/test_form_connection_drafts.py` (and the approval tests):
- `DRAFT_KEYS` and the approval preview's key sets gain `version_fingerprint`;
- a complete draft published unchanged with `publish_stored_draft()` (as
  `test_publish_stored_draft_publishes_as_the_editor_does` builds it, plus a condition saved with
  extra keys and `years: 5.0`) keeps its fingerprint;
- saving a draft unchanged keeps it, while its save number grows;
- deactivating and activating keeps it, and so do publishing with a start date and changing or
  clearing the start date (spec 010); an edit of a rule's message changes it; a save that only
  reorders the documents changes it; a draft whose documents aren't in catalog order keeps it
  when published;
- `Accept-Language: de` gives the same fingerprint as English (once spec 009 is in).

## 4. The MCP server (research R12)

`get_connection` (`mcp/src/tools/read.ts`) adds one line to what it returns, for a published
connection and a draft: `version_fingerprint`, the `Version` the details page and the PDF show.
No other tool changes; no tool makes a PDF (spec, Out of Scope).

- `mcp/src/views.ts` (or wherever `get_connection`'s view is composed) copies the field; its
  fixtures in `mcp/src/views.test.ts` and `mcp/src/draftEdit.test.ts` gain it.
- The guidance changes in the same change (`CLAUDE.md`, spec 007):
  `mcp/plugin/skills/connection-workflow/SKILL.md` says what the version is (a fingerprint of
  the content, equal content equal version, not a counter), that the team member compares it
  with a printout, and that it differs from `draft.version`, the draft's save number;
  `mcp/plugin/skills/publishing-and-live-connections/SKILL.md` says that a draft published
  unchanged keeps its version, so the agent can tell the team member that what goes live is
  what was reviewed.
- `npm test` in `mcp/` (`guidance.test.ts`) is unaffected: it checks tool names, not fields.
