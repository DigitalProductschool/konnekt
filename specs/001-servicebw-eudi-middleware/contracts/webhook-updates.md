# Contract: webhook updates to serviceBW (webhook mode)

**Consumer**: serviceBW's webhook address, which DO.IT enters in the middleware UI (FR-014).
**Requirements**: FR-014, FR-015, FR-016, FR-018, FR-019, FR-020. **Decisions**: research R8, R10.

## When an update is sent

A form connection uses webhook mode while it has a webhook address. Each request copies the
address in force when it was triggered (FR-005). For such a request, the middleware sends one
update for each status change after the initial `pending`:

- `completed`, which carries the documents;
- `declined`;
- `verification_failed`;
- `expired`;
- `unavailable`.

The trigger response already reports `pending`, so no update is sent for it. The statuses are
those of [integration-api.md](integration-api.md#common-rules).

## Request

`POST {webhook_url}`

| Header | Value |
|---|---|
| `Content-Type` | `application/json` |

There is no signature and no authentication header. Sender proof is out of scope in this
iteration, because the restricted network is relied on instead (FR-016 and the spec's "Restricted
network" assumption). The webhook address must use `https://`, unless the operators set
`ALLOW_PLAIN_HTTP=true` for a closed internal network (FR-019).

### Body: `completed`

```json
{
  "form_connection_id": "7b1f0a9e-3c2d-4e5f-8a6b-9c0d1e2f3a4b",
  "reference": "q3Vh1x0d6vTt0m2T5kQx0b9cWl7l8sZp4o2YwKxR1aE",
  "status": "completed",
  "occurred_at": "2026-10-07T10:03:12Z",
  "documents": [
    {
      "document_type": "pid",
      "label": "ID (PID)",
      "fields": [
        { "key": "family_name", "label": "Family name", "value": "Mustermann" },
        { "key": "given_name", "label": "Given names", "value": "Erika" }
      ]
    }
  ]
}
```

`documents` has exactly the shape of the pull response in
[integration-api.md](integration-api.md#200-ok-completed-first-pull-of-a-pull-mode-request): only
the configured fields, with each document identified by `document_type` and each field by `key`.

### Body: any other status

```json
{
  "form_connection_id": "7b1f0a9e-3c2d-4e5f-8a6b-9c0d1e2f3a4b",
  "reference": "q3Vh1x0d6vTt0m2T5kQx0b9cWl7l8sZp4o2YwKxR1aE",
  "status": "declined",
  "occurred_at": "2026-10-07T10:02:40Z",
  "documents": null
}
```

## Expected answer

- **Success**: any `2xx` within **10 seconds** counts as delivered. The body of the answer is
  ignored.
- **Failure**: anything else (another status, a timeout, a connection error) counts as failed. The
  middleware retries after 5 s, 10 s, 20 s and 40 s, then every 60 s (FR-016).
  - The `completed` update is retried until its documents are deleted: 30 minutes after the
    citizen shared, less a 60-second safety margin (FR-020). After that it is abandoned and never
    sent again.
  - Other updates are retried until 30 minutes after the status change.

## Delivery guarantees

- **Order**: the updates of one request arrive oldest first. A newer update is held back until the
  older one is delivered or abandoned.
- **Documents can't be obtained again** (FR-018): after the first `2xx` for a `completed` update,
  the middleware deletes the documents.
- **Rare repeats (user decision, recorded in the spec's FR-018)**: serviceBW may accept an update
  and the answer may still never reach the middleware, for example because it took longer than
  10 seconds. The middleware then retries, and serviceBW receives the same update again.
  - If the form connection was deactivated in the meantime, the retry is replaced by an
    `unavailable` update instead.
  - serviceBW uses `reference` together with `status` to spot repeats, and keeps the documents it
    already has.
- **Never through the pull URL**: in webhook mode, the pull URL returns the status but never the
  documents (FR-015).
