# Contract: serviceBW integration API (trigger URL and pull URL)

**Consumers**: serviceBW. **Requirements**: FR-004, FR-005, FR-008 to FR-013, FR-017, FR-018,
FR-021.
**Decisions**: research R5, R9, R11, R12, R13, R20.

## Common rules

- **Base address**: `{CONNECTION_BASE_URL}/api/connect`. Both connection URLs of a form connection
  contain its `form_connection_id` and stay the same when the form connection is edited (FR-005).
- **Access** (FR-017): calls carry **no credentials**. The production nginx forwards
  `/api/connect/` only for clients whose address is in `SERVICEBW_ALLOWED_CIDRS`, and nginx
  answers `403` to everyone else, without involving the middleware (research R13).
- **Not logged**: the request reference is never written to any log, nginx access logs included.
- **Response format**:
  - Success bodies are `{"data": …, "message"?: …}`, and error bodies are
    `{"error": …, "message": …}` (Constitution I).
  - A `5xx` error body also carries `error_id`, a UUID under which the middleware logged what went
    wrong. Its message is generic. Quote the `error_id` when reporting the problem to DO.IT.
  - Field names are snake_case.
  - Timestamps are ISO 8601 in UTC with a `Z` suffix.
- **Order of the checks** for both URLs:
  1. Unknown form connection: `404`.
  2. Deactivated or deleted form connection: `409 unavailable`.
  3. Unknown reference, or a reference that belongs to another form connection: `404`.
- **Request statuses** (FR-011):

  | `status` | Meaning | Final? |
  |---|---|---|
  | `pending` | Waiting for the citizen | no |
  | `completed` | The citizen shared, and the documents passed verification | yes |
  | `declined` | The wallet reported that the citizen declined or couldn't provide the documents, or it answered with another error and shared nothing | yes |
  | `verification_failed` | A document was not accepted: invalid signature, untrusted issuer, expired, revoked or suspended, or not presented by its holder | yes |
  | `expired` | The citizen did not finish before `expires_at` (10 minutes, FR-012) | yes |
  | `unavailable` | The request was cancelled because its form connection was deactivated or deleted while the request was open | yes |

---

## Trigger URL: start a document request (FR-008)

`POST {CONNECTION_BASE_URL}/api/connect/{form_connection_id}/requests`

The request has no body; an empty body or `{}` is accepted. Every call starts a new, independent
request.

### `201 Created`

```json
{
  "data": {
    "reference": "q3Vh1x0d6vTt0m2T5kQx0b9cWl7l8sZp4o2YwKxR1aE",
    "status": "pending",
    "wallet_link": "openid4vp://?client_id=x509_hash%3A…&request_uri=…",
    "qr_code_link": "openid4vp://?client_id=x509_hash%3A…&request_uri=…%2Fno-redirect",
    "qr_code": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA…",
    "expires_at": "2026-10-07T10:10:00Z"
  },
  "message": "Document request started"
}
```

| Field | Meaning |
|---|---|
| `reference` | The unguessable request reference (FR-018), used with the pull URL. Treat it as secret, and don't log it |
| `wallet_link` | Opens the citizen's EUDI Wallet with this request when tapped on the phone that holds the wallet (same-device flow) |
| `qr_code_link` | The link for a wallet on another device; the QR code encodes this link |
| `qr_code` | `qr_code_link` as a PNG data URI, ready for `<img src="…">` |
| `expires_at` | When the request expires if the citizen hasn't finished (trigger time + 10 minutes) |

The wallet asks the citizen for exactly the documents and fields configured in the form
connection's current revision, all in one interaction (FR-009).

### Errors

| Status | Body | When |
|---|---|---|
| `404` | `{"error": "Not found", "message": "Form connection not found"}` | Unknown `form_connection_id` |
| `409` | `{"error": "unavailable", "message": "This form connection is deactivated or deleted"}` | Deactivated or deleted form connection. No request is started (FR-006) |
| `502` | `{"error": "Upstream error", "message": "The wallet service could not start the request. Try again.", "error_id": "…"}` | EUDIPLO couldn't create the request. Nothing is stored |
| `503` | `{"error": "Not configured", "message": "Something went wrong on our side, so nothing was saved. Contact an administrator and give them the error ID.", "error_id": "…"}` | The middleware's EUDIPLO settings are incomplete. This is an operator error; nothing is stored. Only the middleware's log names the missing setting |

---

## Pull URL: status and documents (FR-013, pull mode)

`GET {CONNECTION_BASE_URL}/api/connect/{form_connection_id}/requests/{reference}`

### `200 OK`: pending, or any status without documents

```json
{
  "data": {
    "reference": "q3Vh1x0d6vTt0m2T5kQx0b9cWl7l8sZp4o2YwKxR1aE",
    "status": "pending",
    "expires_at": "2026-10-07T10:10:00Z",
    "documents": null
  }
}
```

### `200 OK`: completed, first pull of a pull-mode request

```json
{
  "data": {
    "reference": "q3Vh1x0d6vTt0m2T5kQx0b9cWl7l8sZp4o2YwKxR1aE",
    "status": "completed",
    "expires_at": "2026-10-07T10:10:00Z",
    "documents": [
      {
        "document_type": "pid",
        "label": "Personal ID",
        "fields": [
          { "key": "family_name", "label": "Family name", "value": "Mustermann" },
          { "key": "given_name", "label": "Given name", "value": "Erika" },
          { "key": "birthdate", "label": "Date of birth", "value": "1984-01-26" },
          { "key": "address_locality", "label": "City or town", "value": "Stuttgart" }
        ]
      },
      {
        "document_type": "mdl",
        "label": "Driving licence",
        "fields": [
          { "key": "expiry_date", "label": "Expiry date", "value": "2034-03-01" },
          { "key": "document_number", "label": "Licence number", "value": "B072RRE2I55" },
          {
            "key": "driving_privileges",
            "label": "Licence classes",
            "value": [{ "vehicle_category_code": "B", "issue_date": "2019-03-01" }]
          }
        ]
      }
    ]
  }
}
```

**Rules**:
- **Contents**: `documents` contains exactly the configured fields of each requested document, in
  configuration order, and nothing else (FR-013, SC-005).
  - Each document is identified by `document_type`, and each field by its `key`. The `label` values
    are for display.
  - Values keep their JSON type. Binary values, such as `picture` or `portrait`, are base64
    strings, and dates are ISO 8601 strings.
- **Delivered once, with a repeat window** (FR-018): the first pull that returns `documents`
  counts as the delivery. Pulls within **60 seconds** of it return the same documents, so serviceBW
  can simply pull again if an answer got lost. After that, pulls return `"status": "completed"`
  with `"documents": null`. So does a pull after the documents were deleted, which happens
  30 minutes after the citizen shared at the latest (FR-020).
- **Webhook mode**: for requests in webhook mode, `documents` is always `null`. Their documents go
  only to the webhook address (FR-015).
- **Expiry**: a `pending` request pulled after `expires_at` is checked with EUDIPLO one last time.
  The answer is `completed`, `declined` or `verification_failed` if the citizen finished in time,
  and `expired` otherwise.

**How serviceBW should poll** (spec assumption "serviceBW waits for a final status"; research R20):
- Pull every 2 seconds while the status is `pending`, and stop as soon as it is final.
- `declined` and `verification_failed` arrive within about 2 seconds of the wallet's answer, so the
  form can show the error right away.
- Don't stop waiting before `expires_at`: the middleware reports `expired` itself.
- A decline is reported only if the wallet sends one. If the citizen simply closes the wallet, the
  request stays `pending` until `expired`.
- When the documents arrive, serviceBW checks that they belong to the applicant. The middleware
  can't do this check (spec assumption "Documents match the applicant").

### Errors

| Status | Body | When |
|---|---|---|
| `404` | `{"error": "Not found", "message": "Request not found"}` | Unknown form connection or reference; a reference that belongs to another form connection (FR-019); or a request whose record was deleted 7 days after it ended (FR-021). Stop polling |
| `409` | `{"error": "unavailable", "message": "This form connection is deactivated or deleted"}` | The form connection is deactivated or deleted, whatever status the request reached (FR-006). Stop polling |
| `502` | `{"error": "Upstream error", "message": "The documents could not be fetched. Try again.", "error_id": "…"}` | EUDIPLO couldn't be reached while reading the documents. Nothing was consumed, so the next pull can still receive them |
