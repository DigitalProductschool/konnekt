# Contract: serviceBW's connection URLs and drafts

**Consumer**: serviceBW forms. **Requirements**: FR-006, FR-010, FR-026; SC-002, SC-007.
**Decisions**: research R7, R8.

Spec 001's contract
([../../001-servicebw-eudi-middleware/contracts/integration-api.md](../../001-servicebw-eudi-middleware/contracts/integration-api.md))
and spec 002's
([../../002-connection-rules/contracts/integration-api.md](../../002-connection-rules/contracts/integration-api.md))
are unchanged for every published connection, including those published before this feature
(SC-007). This feature adds two cases. No serviceBW form needs a change.

## A draft's URLs

A draft's URLs are never shown (FR-006), so no serviceBW form should know them. If anyone calls
them all the same, they answer like a deactivated connection's:

| URL | Answer |
|---|---|
| `POST /api/connect/{id}/requests` (trigger) | `409 {"error": "unavailable", "message": "This form connection is deactivated or deleted"}` |
| `GET /api/connect/{id}/requests/{reference}` (main pull URL) | the same `409` |
| `GET /api/connect/{id}/branches/{branch_id}/requests/{reference}` | the same `409`, at step 2 of spec 002's "Order of the checks", before the branch is looked at |

- **The same detail.** The detail is the existing `UNAVAILABLE_DETAIL`, word for word, so a
  caller can't tell a draft from a deactivated connection.
- **No request starts.** No request row is written and no EUDIPLO call is made (SC-002).

## A deleted draft's URLs

The row is removed (research R7), so every URL answers as for an unknown form connection:
- `404 {"error": "Not found", "message": "Form connection not found"}` for the trigger URL;
- `404` "Request not found" for the pull URLs.

No request starts (FR-010).

## A published draft's URLs

Once published, a draft is a published connection: its trigger URL and the pull URLs of the
variants it had at publishing work exactly as spec 001 and spec 002 describe (FR-009). The URL
paths contain only the connection's id, which the draft already had. They are shown from then on
and never change (spec 001, FR-005).
