# Contract: how the middleware uses EUDIPLO

**Provider**: EUDIPLO v9.x, the team's hosted instance on Coolify, tenant `<tenant>`.
**Decisions**: research R2, R3, R5 to R9, R15, R19.

This file lists the only EUDIPLO endpoints the middleware calls, and what it relies on in each
one.
- **Client models**: hand-written Pydantic models cover only the fields listed here (research R15).
- **Checking them**: before writing the client, check every shape against the instance's OpenAPI
  (`$EUDIPLO_URL/api/docs-json`; `.info.version` must be 9.x), because EUDIPLO's API is strict. Any
  difference from this file is to be flagged (`docs/EUDIPLO.md`, "Source of truth").

## Prerequisites in the tenant (set up by the operators, not by the middleware)

| Item | Requirement |
|---|---|
| API client | `EUDIPLO_CLIENT_ID` / `EUDIPLO_CLIENT_SECRET` with roles `presentation:request` and `presentation:manage`, and an empty `allowedPresentationConfigs`. `presentation:manage` also allows managing trust lists, key chains and webhook endpoints, which is an accepted risk (research R2) |
| Access key chain | An active access certificate, which EUDIPLO uses to sign every request. Without it, `POST /api/verifier/offer` answers `404` |
| Trust list | A managed trust list (`EUDIPLO_TRUST_LIST_ID`) whose entities carry the PID and EAA issuance services and revocation certificates of the test issuers. Production issuers come later; changing the setting re-syncs every configuration (research R2) |
| Session logs | `LOG_SESSION_STORE` on the instance must not keep claims (research R19) |
| Tenant | Shared by development, previews and production for now. This is accepted by the user, and production should be separated before real citizens use the service (research R2, R19) |

## Calls

All paths are relative to `EUDIPLO_URL`. Every call except the first carries
`Authorization: Bearer <token>`. Timeouts are 5 s to connect and 10 s to read. No database
connection is held while a call is waiting (research R15).

| # | Call | Used for | Request (relevant fields) | Response fields used | Error handling |
|---|---|---|---|---|---|
| 1 | `POST /api/oauth2/token` | Getting a token | form: `grant_type=client_credentials`, `client_id`, `client_secret` | `access_token`, `expires_in` | Cache the token in memory and renew it 5 min before it expires. On a `401` from any other call, fetch a new token once and retry |
| 2 | `POST /api/verifier/config` | Saving a new revision, re-sync (research R2), re-creation after a `409` on call 4 | `{id, description, lifeTime, statusCheckMode: "strict", dcql_query}` | none | Any non-2xx while saving → `502` to the UI, and nothing is saved. **Verify at implementation** how an existing `id` is answered |
| 3 | `DELETE /api/verifier/config/{id}` | Worker cleanup of unused revisions; undoing a configuration whose revision couldn't be saved | none | none | `404` counts as success. Other failures are retried in the next cycle, or logged when undoing |
| 4 | `POST /api/verifier/offer` | Trigger URL | `{response_type: "uri", requestId: <eudiplo_config_id>, reference: <document_requests.id>}` | `uri` → `wallet_link`, `crossDeviceUri` → `qr_code_link` and `qr_code`, `session` → `eudiplo_session_id` | `409` (configuration missing) → re-create it with call 2 and retry once. Any other non-2xx → `502` to serviceBW |
| 5 | `GET /api/session?type=presentation&updatedFrom=<cursor>` | Worker sync (research R6) | query parameters; the cursor is the latest `updatedAt` seen minus 5 s | per session: `id`, `status`, `failureCode`, `consumedAt`, `updatedAt` | Retried in the next cycle. **Verify at implementation**: paging, and whether `failureCode` and `consumedAt` are present (otherwise call 6 per changed session) |
| 6 | `GET /api/session/{id}` | Reading documents at delivery, including repeated pulls within the 60-second window (FR-018); the last check before expiry; the sync fallback | none | `status`, `failureCode`, `errorReason`, `consumedAt`, `credentials` | `404` → the documents are gone, so `eudiplo_session_deleted_at` is set. Other failures: `502` when inside a pull, otherwise retried in the next cycle. `credentials` is used only when delivering, and discarded otherwise |
| 7 | `DELETE /api/session/{id}` | Deleting personal data (research R8), and cancelling open requests (FR-006) | none | none | `404` counts as success. Other failures are retried, and `eudiplo_session_deleted_at` stays empty until it succeeds |

## Presentation configuration (call 2)

```json
{
  "id": "fc-7b1f0a9e-3c2d-4e5f-8a6b-9c0d1e2f3a4b-r2",
  "description": "Driving licence application (Führerscheinantrag)",
  "lifeTime": 600,
  "statusCheckMode": "strict",
  "dcql_query": {
    "credentials": [
      {
        "id": "pid",
        "format": "dc+sd-jwt",
        "meta": { "vct_values": ["urn:eudi:pid:1", "urn:eudi:pid:de:1"] },
        "trusted_authorities": [
          { "type": "etsi_tl", "values": [{ "trustListId": "<EUDIPLO_TRUST_LIST_ID>" }] }
        ],
        "claims": [
          { "path": ["family_name"] },
          { "path": ["given_name"] },
          { "path": ["birthdate"] },
          { "path": ["address", "locality"] }
        ]
      },
      {
        "id": "mdl",
        "format": "mso_mdoc",
        "meta": { "doctype_value": "org.iso.18013.5.1.mDL" },
        "trusted_authorities": [
          { "type": "etsi_tl", "values": [{ "trustListId": "<EUDIPLO_TRUST_LIST_ID>" }] }
        ],
        "claims": [
          { "path": ["org.iso.18013.5.1", "expiry_date"] },
          { "path": ["org.iso.18013.5.1", "document_number"] },
          { "path": ["org.iso.18013.5.1", "driving_privileges"] }
        ]
      }
    ]
  }
}
```

- **What is required**: there are no `credential_sets` and no `claim_sets`, so every document and
  every field is required. This matches the spec's all-or-nothing assumption.
- **Issuer trust**: every credential query references the same trust list. Without
  `trusted_authorities`, EUDIPLO would skip the issuer check (FR-010), and Paradym needs the
  references to be identical across queries.
- **Change detection**: `lifeTime` is the revision's `lifetime_seconds`, which is
  `REQUEST_LIFETIME_SECONDS` when the revision is created. The SHA-256 of this body, without `id`
  and `description`, is stored as the revision's `config_hash`. The re-sync (research R2) builds
  the body with the current settings instead of the stored `lifetime_seconds`, so a changed
  `REQUEST_LIFETIME_SECONDS` or trust list gives a different hash and a new revision.
- **Not set**: `registration_cert`, `webhookEndpointId`, `redirectUri`, `transaction_data` and
  `intent_to_retain` (see research R6, R11 and R19).

## Session results (calls 5 and 6)

- **Status**: the session's `status` and `failureCode` map to request statuses as listed in
  [research.md R5](../research.md#r5-request-statuses-fr-011-and-how-eudiplo-maps-to-them).
- **`credentials`** (call 6 only) has the form `[{"id": "<document type key>", "values": [{ …claims… }]}]`,
  with `cnf` and `status` removed:
  - SD-JWT VC claims keep their nesting (`address.locality`), and technical claims such as `iss`,
    `vct` and `iat` may be present;
  - mdoc claims of all namespaces are merged into one flat object. Up to EUDIPLO 9.1.0, a nested
    map inside a claim arrives as `{}`, so `driving_privileges` is `[{}, …]`: the content is lost
    in EUDIPLO, and the middleware passes it on and logs a warning by field key.
- **What the middleware keeps**: it copies only the configured fields, under their catalog keys,
  and drops everything else (research R9). Nothing from `credentials` is persisted or logged.
