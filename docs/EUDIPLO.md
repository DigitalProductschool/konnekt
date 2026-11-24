# EUDIPLO integration context (for Claude Code)

> Verified against EUDIPLO `main` @ `1a0c2fa` (2026-10-07), release **v9.0.0**, `@eudiplo/sdk-core` 9.0.0.
> Source of truth, in order: (1) the OpenAPI document of the running instance, (2) https://docs.eudiplo.dev,
> (3) this file. If they disagree, trust (1) and flag the difference.

## 1. What EUDIPLO is

EUDIPLO is a self-hosted, multi-tenant service (NestJS backend + Angular admin UI) that acts as **credential
issuer** and **verifier** for the EU Digital Identity (EUDI) Wallet ecosystem. Our middleware talks to it only
through its HTTP/JSON **management API** (`/api/*`). EUDIPLO speaks the wallet protocols itself and reports
results back by webhook, Server-Sent Events (SSE) or polling.

```
End user ─► OUR MIDDLEWARE ──(/api/*, Bearer token)──► EUDIPLO ◄──(OID4VCI / OID4VP / DC API)── Wallet
                 ▲   ▲                                   │
                 │   └──── webhooks / SSE / polling ─────┘
                 └──────── attribute-provider calls (EUDIPLO asks us for claims during issuance)
```

| Area | Supported | Not supported |
|---|---|---|
| Issuance | OID4VCI 1.0: pre-authorized code (+tx_code), authorization code (built-in, chained, external and OID4VP-based authorization servers), PAR, PKCE S256, DPoP, batch, deferred, notifications, encrypted requests/responses, signed metadata, wallet and key attestation | |
| Presentation | OID4VP 1.0: DCQL (`credential_sets`, `claim_sets`, `values`, `multiple`, `trusted_authorities`), `direct_post.jwt` only, transaction data, `verifier_info` registration certificate, Digital Credentials API, ISO 18013-7 Annex C | plain `direct_post`; client_id prefixes other than `x509_hash` / `x509_san_dns` |
| Formats | SD-JWT VC (`dc+sd-jwt`), mdoc (`mso_mdoc`) | mdoc proximity (BLE/NFC), W3C VCDM (`jwt_vc_json`, `ldp_vc`) |
| Trust / status | Token Status List, ETSI TS 119 602 LoTE trust lists, OpenID Federation (partial) | |

## 2. Responsibility split: do NOT re-implement EUDIPLO features

| EUDIPLO already does | Our middleware owns |
|---|---|
| All wallet protocols, crypto, signing, holder binding | End-user authentication and business rules (who gets what, when) |
| Offer / request creation incl. URIs for QR and deep links | Rendering QR codes and deep links in our UI |
| Presentation verification: signatures, trust chain, status, DCQL matching, claim `values` checks | Deciding what a verified result means for our business |
| Session state machine, single-use and expiry enforcement | Mapping our business IDs to sessions (via `reference`) |
| Status lists, revocation and suspension | Calling revoke when our business process requires it |
| Trust lists, key chains, KMS (`db`, `vault`, `aws-kms`, `pkcs11`, `http`) | Supplying claim values (inline in the offer, or as attribute-provider endpoint) |
| Webhook delivery (single attempt), SSE stream, session logs | Webhook receiver: auth check, idempotency, fast response |
| Session retention (deleted or anonymized after TTL, default 24 h) | Persisting results we need longer than the TTL |
| Multi-tenancy, API clients, roles, config-as-code, registrar (German sandbox only) | Reconciling missed webhooks by polling |
| | Same-device `response_code` check; keeping management credentials server-side |

## 3. Core concepts

| Concept | Meaning |
|---|---|
| Tenant | One issuer and/or verifier. All configs, keys, sessions and clients are tenant-scoped; the tenant comes from the access token. Protocol URLs contain it: `/issuers/{tenant}/…` |
| API client | OAuth client (client credentials) with roles and optional allow-lists `allowedIssuanceConfigs` / `allowedPresentationConfigs` |
| Credential configuration | One credential type: format, `vct` / docType, `fields` (claims, with types and `defaultValue`), display, key binding, lifetime, `statusManagement`, `keyChainId`, `attributeProviderId` |
| Issuance configuration | Tenant-wide issuer settings: display, authorization servers, batch size, DPoP, default `offerLifetimeSeconds` |
| Presentation configuration | One verification use case: `dcql_query`, `lifeTime`, `statusCheckMode`, `registration_cert`, `webhookEndpointId`, `redirectUri`, `accessKeyChainId`, … |
| Key chain | Key plus certificate(s); usage `attestation` (signs credentials), `access` (authenticates EUDIPLO to wallets, signs OID4VP requests and issuer metadata), `statusList`, `trustList` |
| Session | One issuance or presentation flow; ID returned when the offer or request is created |
| Webhook endpoint | Reusable tenant-scoped target `{id, name, url, auth}` |
| Attribute provider | Our HTTP endpoint that EUDIPLO calls during issuance to get claim values |

## 4. Authentication and roles

```bash
curl -X POST "$EUDIPLO_URL/api/oauth2/token" \
  -d grant_type=client_credentials -d client_id="$CLIENT_ID" --data-urlencode client_secret="$CLIENT_SECRET"
# → { "access_token": "...", "expires_in": 86400 }   Use as: Authorization: Bearer <token>
```

- Credentials are accepted in the form body, a JSON body or HTTP Basic. Tokens last 24 h (`JWT_EXPIRES_IN`); cache them and renew before expiry.
- If `OIDC` is set (e.g. Keycloak), `/api/oauth2/token` is disabled and tokens come from that provider.
- The root client (`AUTH_CLIENT_ID` / `AUTH_CLIENT_SECRET`) has only `tenants:manage` and no tenant, so it cannot call tenant-scoped endpoints.
- A client secret is shown once at creation; rotate it with `POST /api/client/{id}/rotate-secret`.

| Role | Grants |
|---|---|
| `issuance:offer` | Create offers, read/stream own-side sessions, revoke, complete/fail deferred |
| `issuance:manage` | Manage credential and issuance configs, attribute providers, status lists, key chains, webhook endpoints |
| `presentation:request` | Create presentation requests, read/stream own-side sessions, read presentation configs |
| `presentation:manage` | Manage presentation configs, trust lists, key chains, webhook endpoints |
| `clients:manage` / `users:manage` | API clients / human users of the tenant |
| `tenant:admin` | Full tenant config: config bundles, key export, KMS provider config |
| `tenants:manage` | Tenant CRUD (root) |
| `registrar:manage` | Registrar config, access-certificate enrollment, schema metadata |

**Our middleware's client:** `presentation:request` + `presentation:manage`, with no `allowedPresentationConfigs` allow-list. The middleware creates a presentation configuration for every form connection revision, and an allow-list would reject each new one. It needs no issuance role, because issuing documents is out of scope (plan research R2). Since 9.0, clients see only sessions of their side (issuance vs presentation), so a client that reads both needs a role from each.

**The test-credential script's client:** `issuance:manage` + `issuance:offer`, used only by the developer script `backend/scripts/issue_test_credentials`, which issues test PIDs and mDLs to a test wallet (README, "Test credentials for a test wallet"). The middleware never gets these credentials.

## 5. Management API map (all paths are prefixed with `/api`)

| Area | Endpoints | Roles |
|---|---|---|
| Token | `POST /oauth2/token` | public |
| Sessions | `GET /session` (filters, §9), `GET /session/{id}`, `DELETE /session/{id}`, `GET /session/{id}/events` (SSE), `GET /session/{id}/logs` | `issuance:offer` / `presentation:request` |
| Revocation | `POST /session/revoke` | `issuance:offer` / `issuance:manage` |
| Issuance runtime | `POST /issuer/offer`; `POST /issuer/deferred/{transactionId}/complete` and `/fail` | `issuance:offer` |
| Presentation runtime | `POST /verifier/offer` | `presentation:request` / `presentation:manage` |
| Credential configs | `GET`, `POST /issuer/credentials`; `GET`, `PATCH`, `DELETE /issuer/credentials/{id}` | `issuance:manage` |
| Issuance config | `GET`, `POST /issuer/config`; `POST /issuer/config/registration-cert/reissue` | `issuance:manage` |
| Presentation configs | `GET`, `POST /verifier/config`; `GET`, `PATCH`, `DELETE /verifier/config/{id}`; `POST /verifier/config/{id}/registration-cert/reissue`; helpers `/verifier/config/issuer-metadata/resolve`, `/verifier/config/schema-metadata/*` | `presentation:manage` (`GET` also `presentation:request`) |
| Webhook endpoints | CRUD `/issuer/webhook-endpoints` (used for presentations too) | `issuance:manage` / `presentation:manage` |
| Attribute providers | CRUD `/issuer/attribute-providers` | `issuance:manage` |
| Key chains | CRUD `/key-chain`, `POST /key-chain/import`, `POST /key-chain/{id}/rotate`, `GET /key-chain/providers`, `/providers/health`; `GET /key-chain/{id}/export` and `/providers/config` need `tenant:admin` | `issuance:manage` / `presentation:manage` |
| Status lists | CRUD `/status-lists`; `GET`, `PUT`, `DELETE /status-list-config` | `issuance:manage` |
| Trust lists | CRUD `/trust-list`, `/trust-list/{id}/export`, `/trust-list/{id}/versions` | `issuance:manage` / `presentation:manage` |
| Session settings | `GET`, `PUT`, `DELETE /session-config` (TTL, cleanup mode) | `issuance:manage` / `presentation:manage` |
| Caches | `GET /cache/stats`, `DELETE /cache`, `/cache/status-list`, `/cache/trust-list` | manage roles |
| Clients / users / tenants | CRUD `/client` (+ `/{id}/rotate-secret`), `/user`, `/tenant` | `clients:manage` / `users:manage` / `tenants:manage` |
| Registrar | `/registrar/config` CRUD, `POST /registrar/access-certificate`, `/schema-metadata/*` | `registrar:manage` |
| Config bundles | `/config-bundles/export`, `/import`, `/import/archive`, `/plan`, `/plan/archive`, `/operations`, `/resources` | `tenant:admin` / `tenants:manage` |
| Audit | `GET /admin/audit-logs` | `clients:manage` |

**Wallet-facing paths** (no `/api` prefix; must stay publicly reachable): `/.well-known/…`, `/issuers/{tenant}/vci/…`,
`/issuers/{tenant}/authorize/…`, `/issuers/{tenant}/chained-as/…`, `/issuers/{tenant}/authorization-servers/{id}/…`,
`/issuers/{tenant}/credentials-metadata/…`, `/issuers/{tenant}/status-management/…`, `/issuers/{tenant}/trust-list/…`,
`/presentations/{id}/oid4vp/…`, `/presentations/{session}/iso-18013-7`, `/storage/{key}`, `/health`.

**OpenAPI (exact schemas):**
- Management API: Swagger UI at `$EUDIPLO_URL/api/docs`, JSON at `$EUDIPLO_URL/api/docs-json`. Always enabled; `.info.version` is the deployed version.
- Protocol API: `/docs` and `/docs-json`.
- Fetch the JSON before writing client code.

**SDK:** `npm i @eudiplo/sdk-core` (keep its major version equal to the backend's).
- `EudiploClient` methods:
  - `createIssuanceOffer()`
  - `createPresentationRequest()`
  - `getSession()`, `waitForSession()`
  - `subscribeToSession()`, `waitForSessionWithSse()`
  - DC API helpers: `createDcApiPresentationRequest()`, `submitDcApiPresentation()`, `verifyWithDcApi()`, `isDcApiAvailable()`
- It handles token fetching and renewal, but only with the built-in OAuth server.
- Every other endpoint is available as a generated function in `@eudiplo/sdk-core/api`, named `<controller>Controller<Method>` (e.g. `sessionControllerGetSession`).

## 6. Issuance

`POST /api/issuer/offer`:

| Field | Notes |
|---|---|
| `response_type` | Required; use `"uri"` |
| `flow` | `pre_authorized_code` (we already know the user) or `authorization_code` |
| `credentialConfigurationIds` | string[] |
| `credentialClaims` | Per config id: `{type:"inline", claims}` / `{type:"attributeProvider", attributeProviderId}` / `{type:"webhook", webhook:{url,auth}}` |
| `tx_code`, `tx_code_description` | PIN for the pre-auth flow; send it to the user on a second channel |
| `authorization_server` | id of the authorization server entry (auth-code flow) |
| `webhookEndpointId` | Target for this session's wallet notifications |
| `offerLifetimeSeconds` | Offer expiry (else the issuance config default; else no expiry) |
| `reference` | ≤255 chars, our opaque ID; stored in plaintext, so never put PII in it |

- **Response:** `201 {session, uri}`; render `uri` as QR or deep link.
- **Errors:** `409` for an unknown config or invalid inline claims; `400` for an unknown or disabled authorization server; `403` if the config isn't in the client's allow-list.
- **Single use:** the offer URI can be fetched once (`ISSUER_MULTI_CONSUMPTION=true` relaxes this), and the code can be redeemed once.

**Claim source priority (sources are not merged):**
1. Offer `credentialClaims`.
2. The configuration's `attributeProviderId`.
3. `fields[].defaultValue`.

Claims are validated against `fields`; missing, mistyped or unknown claims are rejected.

**Attribute-provider contract (EUDIPLO calls us):**
- **Request:** `POST <our url>` with
  `{session, credential_configuration_id, identity:{iss,sub,token_claims}, credentials?:[{id, values:[…]}]}`.
  `credentials` is present after an OID4VP-based authorization.
- **Answer:** `200 {"<configId>": {…claims}}`, or `200 {"deferred": true, "interval": 5}`.
- **Failure:** any non-2xx response fails the wallet's request with `invalid_credential_request`.
- **No retry, no timeout:** the wallet waits on our response, so answer fast.

**Deferred issuance:**
- `POST /api/issuer/deferred/{transactionId}/complete` with `{claims}`, or `/fail` with `{error?}`.
- **Limitation:** the `transaction_id` is never sent to our backend; only the wallet receives it.

**Issuance session states:**
- Sequence: `active` → `fetched` (first credential issued) → `completed`, `failed` or `expired`.
- `completed` only happens when the wallet sends `credential_accepted` to the notification endpoint; without that the session stays `fetched`.
- Notification webhook payload: `{notification:{id, event, credentialConfigurationId}, session}`.

**Revocation:**
- `POST /api/session/revoke` with `{sessionId, credentialConfigurationId?, status: 0|1|2}` (valid / revoked / suspended), answers `204`.
- Revocation is final; changing a revoked credential answers `409`.
- Suspension needs status lists with ≥2 bits, configured before issuance.
- Verifiers see the change after `STATUS_TTL` (default 3600 s).

## 7. Presentation

`POST /api/verifier/offer`:

| Field | Notes |
|---|---|
| `response_type` | `uri` (QR / same-device), `dc-api`, `iso-18013-7` |
| `requestId` | Presentation configuration id |
| `webhook` | Inline `{url, auth, includeRawTokensFor?}`; overrides the config's endpoint |
| `redirectUri` | Same-device return URL; `{sessionId}` is substituted |
| `expected_origin` | Required for server-created DC API requests |
| `transaction_data`, `skewSeconds` | Override the configuration |
| `clientIdScheme` | `x509_hash` (default) or `x509_san_dns` (certificate needs a DNS SAN) |
| `reference` | Our opaque ID |

- **Response:** `{uri, crossDeviceUri, session}`. Show `crossDeviceUri` as a QR code; open `uri` on the same device.
- **Errors:** `400` schema error (or `x509_san_dns` without a DNS SAN); `403` not allowed; `404` no usable access key chain; `409` unknown `requestId`.
- **Lifetime:** default `lifeTime` is 300 s, and each request is single-use, so create one per verification.

**Receiving results:**
- **Webhook (preferred):** body `{status:"completed"|"failed", outcome, credentials?, session, transaction_data?}`.
  - `credentials` is present only on success, as `[{id:<DCQL id>, values:[{…disclosed claims}]}]` with `cnf` and `status` removed.
  - `rawToken` is included only for an inline webhook with `includeRawTokensFor`.
  - The webhook may answer `{"redirectUri": "…"}` to override the wallet's redirect.
  - Expired requests send no webhook.
- **SSE:** `GET /api/session/{id}/events` with the `Authorization` header only, so it can't be opened from a browser `EventSource`.
  - Events look like `{id, status, updatedAt}`; the first event is the current status, and the stream ends after a terminal one.
- **Polling:** `GET /api/session/{id}` every 1–2 s until `completed`, `failed` or `expired`.
- **Wallet error responses:** a wallet that refuses posts `error` (e.g. `access_denied`), an optional `error_description` and `state` to the `response_uri` (`POST /presentations/{nonce}/oid4vp`), as form parameters or inside the encrypted `direct_post.jwt` response.
  - EUDIPLO stores it as `failed`, with `failureCode` = the error and `errorReason` "Wallet error: <error>[: <description>]", and answers `200 {}` without a redirect (source, `v9.0.0`).
  - Unknown parameters answer `400` (strict schema). Not every wallet sends one: see §10.
- **Same-device redirect:** the wallet returns the user to `redirectUri?…&response_code=…`. Our backend must `GET /api/session/{id}` and accept only if `status === "completed"` and `responseCode === response_code`.
- **DC API:** create the request with `response_type: "dc-api"` and `expected_origin`, read `requestObject` from `GET /api/session/{id}`, and let the page post the wallet response to the request object's `response_uri`.

**Outcome:** branch on `outcome.error` (also exposed as `failureCode`), and show `outcome.message` (also exposed as `errorReason`).

| Code | Meaning |
|---|---|
| `signature_invalid` | Issuer or device signature doesn't verify |
| `no_trust_chain_to_root` / `trust_chain_not_trusted` | Issuer not anchored in or listed on the trust list |
| `trust_list_unavailable` | Trust list unreachable or expired (fails closed) |
| `certificate_expired`, `x5c_missing`, `verification_error` | Certificate or other verification errors |
| `claim_value_mismatch` | Disclosed value ≠ DCQL `values` (type-strict: `true` ≠ `"true"`) |
| `access_denied`, `invalid_request`, `vp_formats_not_supported`, `wallet_unavailable` | Wallet error responses, e.g. the user declined |
| (no code) | `errorReason`, e.g. "Missing required claims …" |

**Presentation config fields:**
- `id`, `description`, `lifeTime`, `skewSeconds`.
- `statusCheckMode`: `strict` (default), `best_effort` or `disabled`.
- `dcql_query`, `transaction_data`.
- `registration_cert`: `{jwt}`, `{id}` or `{body}`.
- `webhookEndpointId`, `redirectUri`, `accessKeyChainId`, `attached`, `readerAuth`.

The schema is strict, so unknown keys are rejected.

## 8. Webhooks (EUDIPLO → us)

- **Endpoint resource:** `{id, name, url, auth}` where `auth` is `{type:"none"}` or `{type:"apiKey", config:{headerName, value}}`.
- **Not signed:** use HTTPS, check the header, and use a constant-time compare.
- **Delivery:**
  - One synchronous attempt, with no retry; the wallet waits on our answer.
  - So respond `2xx` quickly and process asynchronously; make processing idempotent per `session`.
  - A failed delivery doesn't change the session, so reconcile via `GET /api/session?updatedFrom=…&status=completed&status=failed`.
- **Outbound URL policy:** HTTPS to public addresses only, unless `OUTBOUND_URL_ALLOW_HTTP` or `OUTBOUND_URL_ALLOW_PRIVATE_NETWORK` is set; `OUTBOUND_URL_ALLOWED_HOSTS` adds a host allow-list. A blocked URL counts as a failed delivery.
- **Reference implementation:** `apps/webhook` in the repo (`webhook-api.yaml`).

## 9. Sessions

- **Statuses only move forward;** `completed`, `failed` and `expired` are final.
- **Expiry:** enforced at request time; the status flips to `expired` when the maintenance job runs (`SESSION_TIDY_UP_INTERVAL`, default 1 h).
- **Retention:** sessions older than `SESSION_TTL` (default 24 h from creation) are deleted (`SESSION_CLEANUP_MODE=full`) or anonymized. A tenant can override this via `/api/session-config`. **Persist what we need.**
- **`GET /api/session` filters:** `createdFrom`, `createdTo`, `updatedFrom`, `updatedTo`, `status` (repeatable), `type` (`issuance`/`presentation`), `credentialConfigurationId`, `requestId`, `failureCode`, `id` (prefix), `sortBy`, `sortOrder`.
  - `q` searches by session ID, `walletNonce`, `reference`, or a pasted offer or request link.
  - **Paged** (checked against the hosted 9.0.0 OpenAPI, 2026-10-09): `page` (from 1) and `pageSize` (default 25, at most 100); the answer is `{items, total, page, pageSize, totalPages}`, not a plain array. Items have the full session schema, so they may include `credentials`.
  - The time filters are inclusive and need UTC with seconds, e.g. `2026-10-09T10:00:00.000Z`.
- **Session logs:** `GET /api/session/{id}/logs` requires `LOG_SESSION_STORE=errors|all|verbose`.

## 10. Known pitfalls (verified)

| Pitfall | Handling |
|---|---|
| No `attestation` key chain → `credential_request_denied: No key chain found with usage type 'attestation'` | Create one per tenant before issuing |
| Empty `vct` defaults to `${PUBLIC_URL}/issuers/{tenant}/credentials-metadata/vct/{configId}`, which changes with the domain [confidence 90%] | Set an explicit, stable `vct` (URL on a domain we own) |
| Signed issuer metadata is returned only if the `Accept` header is exactly `application/jwt` (raw string compare in source). The EU reference wallet sends `application/jwt; application/json`, gets unsigned JSON, and may block issuance ("provider could not be verified") | Proxy rewrite of `Accept` on `/.well-known/openid-credential-issuer/*`, or an upstream fix |
| Overasking check: with `registration_cert` set, each DCQL credential (format + claim paths **in order** + meta) must exactly match an entry of the certificate's `credentials` | Keep DCQL and certificate in sync; `SKIP_OVERASKING_CHECK=true` is dev only |
| Presentation config key is `registration_cert` (snake_case) | |
| DCQL claims without `claim_sets` are all required; there is no per-claim optional flag | Use `claim_sets`, or optional credential sets |
| PID rulebook v1.1 removed `age_over_18` and the other age attributes | Don't request them from a PID |
| Issuance only reaches `completed` after a wallet notification | Treat `fetched` as "issued" if needed |
| No webhook retry; expired sessions send no webhook | Polling reconciliation and our own timeouts |
| Paradym (1.20.2, and `main` at 1.21.0) and the EU reference app (Android) send no error response on a decline; the session stays `fetched` until it expires (source, and a live Paradym run on 2026-10-13) | A decline reads as `pending` until our own expiry. Don't treat `fetched` as declined: the citizen may still approve |
| Deferred `transaction_id` isn't exposed to the backend | Avoid deferred issuance, or design around it |
| Config-as-code (file-managed) resources reject API edits with `409` | Detach the resource first, or change the files |
| mdoc nested maps are lost in the session's `credentials` (≤ 9.1.0): the verifier leaves them JS `Map`s and `JSON.stringify` writes `{}`, so `driving_privileges` arrives as `[{}, …]` | Fix upstream (normalise `Map`s recursively in `MdocverifierService.verify`); the middleware logs a warning by field key. The hosted instance runs a patched 9.0.0 build, which delivers them in full (2026-10-19) |
| Token valid for 24 h; secret shown once | Cache and renew the token; store the secret in a secret manager |
| Management token must never reach the browser | Proxy SSE and results through our backend |
| Unknown credential config in an offer answers `409`, not `404` | |

## 11. An installation's deployment (fill in)

| Item | Value |
|---|---|
| `EUDIPLO_URL` / `PUBLIC_URL` | `https://<backend-domain>`, served at the root of its own host |
| Admin UI | `https://<console-domain>`; `API_BASE_URL` = public backend URL (used by the browser) |
| Hosting | Behind a reverse proxy that provides HTTPS; `PUBLIC_URL` must equal the external URL (EUDIPLO ignores `X-Forwarded-*`) |
| Images (since 9.0) | `ghcr.io/eudiplo/eudiplo`, `ghcr.io/eudiplo/eudiplo-client`; pin the same tag for both. Old `openwallet-foundation` image names may be stale [confidence 70%] |
| Tenant | `<tenant>` |
| Test wallets | Paradym (lenient); EU Reference Implementation (requires wallet attestation) |
| Access cert / WRPRC | From the EU RI RP-registration sandbox (`registry.serviceproviders.eudiw.dev`); leaf only, issuer `PID Issuer CA 02` |
| Middleware client | `<client-id>` with `presentation:request` + `presentation:manage`, and no allow-list |
| Test credentials | Issued by the tenant itself with `backend/scripts/issue_test_credentials` (configurations `test-pid`, `test-mdl`), through a client with `issuance:manage` + `issuance:offer` |

## 12. Documentation index

**Doc URLs:**
- Rendered: `https://docs.eudiplo.dev/<path>`.
- Raw markdown: `https://raw.githubusercontent.com/EUDIPLO/eudiplo/main/apps/docs/docs/<path>.md`.
- Generated tables (`SchemaReference`, `RoleReference`, `ConfigTable`) are missing in raw markdown, so use the rendered page or the OpenAPI JSON for those.

| Path | Content |
|---|---|
| `reference/api` | Auth, OpenAPI locations, SDK |
| `reference/roles` | Role → endpoint table |
| `reference/webhooks`, `reference/session-outcome`, `reference/attribute-provider-api` | Payload contracts |
| `reference/presentation-configuration`, `reference/credential-configuration` | Config fields |
| `reference/environment-variables`, `reference/protocols`, `reference/wallet-compatibility` | Env vars, support matrix, tested wallets |
| `cookbooks/integrate-backend` | End-to-end backend integration recipe |
| `issuance/*` | Offers, claims, attribute providers, deferred issuance, notifications, revocation, authorization servers |
| `presentation/*` | Requests, receiving results, DCQL, transaction data, configuring verification |
| `concepts/sessions`, `concepts/security-model` | States, single use, session binding, retention |
| `operate/tenants-and-access`, `operate/configuration-as-code`, `operate/production-checklist`, `operate/waf`, `operate/tls` | Operating the instance |
| `trust/*` | Keys and certificates, registrar, registration certificates, trust lists, wallet registrars |
| `upgrade/8.x-to-9.0` | Breaking changes for integrators |
| `troubleshooting` | Common failures |

**Other sources:**
- Repo: https://github.com/EUDIPLO/eudiplo (moved from `openwallet-foundation/eudiplo`).
- npm: `@eudiplo/sdk-core`, `@eudiplo/cli`.
- Specs: OID4VCI 1.0, OID4VP 1.0 (openid.net/specs); SD-JWT VC draft and Token Status List draft (datatracker.ietf.org); SD-JWT is RFC 9901.
- German EUDI developer guide: https://bmi.usercontent.opencode.de/eudi-wallet/developer-guide/llms.txt.

## 13. Working rules for Claude Code

| Rule | Why |
|---|---|
| Check §2 and §5 before building any feature | Avoid duplicating EUDIPLO functionality |
| Generate types from `$EUDIPLO_URL/api/docs-json`, or use `@eudiplo/sdk-core` matching the backend version | Exact schemas; the API is strict |
| Never log claims, raw tokens or secrets | Claims and tokens are personal data; secrets are credentials |
| Store only the session ID and `reference` until results are needed | Data minimisation |
| Implement result handling as webhook + polling fallback, and treat expiry ourselves | No retries, no webhook on expiry |
| Test with Paradym first, then the EU reference wallet | Separates protocol bugs from trust issues |
| When behavior differs from this file, check `upgrade/*` and the instance's `.info.version` | The docs track `main` |
