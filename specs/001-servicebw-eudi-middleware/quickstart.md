# Quickstart and validation guide: serviceBW ↔ EUDI Wallet Form Connections

**Phase 1 output of `/speckit-plan`** | **Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

This guide proves the feature works end to end once it is implemented. The shapes of the API
calls are in [contracts/](contracts/), and what is stored is in [data-model.md](data-model.md).
Here, `curl` plays the part of serviceBW.

## 1. Prerequisites

| What | Details |
|---|---|
| Tools | Docker with Compose v2.24 or later (for `env_file` with `required: false`), `uv`, Node 22, `curl`, `jq`, `base64` |
| EUDIPLO access | The team's hosted EUDIPLO, tenant `dps`, and from it: its base URL; an API client with **`presentation:request` + `presentation:manage`** and no presentation allow-list; the id of a **trust list** that contains the test issuers; and an active access key chain. See [contracts/eudiplo-usage.md](contracts/eudiplo-usage.md#prerequisites-in-the-tenant-set-up-by-the-operators-not-by-the-middleware) |
| Test wallet | A phone with **Paradym** holding a test PID (SD-JWT VC, `vct` `urn:eudi:pid:1` or `urn:eudi:pid:de:1`) and a test mobile driving licence (mdoc, `org.iso.18013.5.1.mDL`). Both must come from issuers on that trust list. Try the EU reference wallet only after Paradym works (`docs/EUDIPLO.md` §13) |
| Extra test credentials (V3) | If the test issuer allows it: one credential that has **expired**, one that has been **revoked**, and one from an issuer **not** on the trust list |
| Network | Outbound HTTPS from the middleware to EUDIPLO. The phone reaches EUDIPLO directly; it never contacts the middleware |

## 2. Setup

1. Copy `backend/.env.example` to `backend/.env` and fill in the values. The variables are
   described in [research.md R18](research.md#r18-configuration).

   ```dotenv
   EUDIPLO_URL=https://<eudiplo-backend-domain>
   EUDIPLO_CLIENT_ID=<client-id>
   EUDIPLO_CLIENT_SECRET=<client-secret>
   EUDIPLO_TRUST_LIST_ID=<trust-list-id>
   CONNECTION_BASE_URL=http://localhost:3000
   ALLOW_PLAIN_HTTP=true   # local testing only: the test webhook receiver below speaks plain HTTP
   ```

2. Start the stack and create a DO.IT account:

   ```bash
   docker compose up --build -d
   docker compose exec backend uv run python -m app.cli create-user alice   # prompts twice; at least 12 characters
   ```

3. Open <http://localhost:5173>. Use `localhost`, not `127.0.0.1`: the CORS origin and the cookie
   both depend on the host name. Without a session the app redirects to the sign-in screen; sign in
   as `alice`.

Locally the backend's port 3000 is reachable directly, so `/api/connect/` is **not** restricted on
a developer machine. The nginx allow-list (R13) applies only to the production image; see
[Deployment checks](#6-deployment-checks).

## 3. Automated checks

```bash
# Backend: lint, types, tests. Tests need a database whose name ends in "_test".
docker compose exec postgres createdb -U postgres template_db_test
cd backend
uv run ruff check . && uv run ruff format --check .
uv run mypy app/
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5435/template_db_test uv run pytest

# Frontend: the constitution's gates
cd ../frontend
npm run lint && npm run build
```

**Expected**: everything passes. The pytest suite fakes EUDIPLO, so it needs neither EUDIPLO
credentials nor a wallet. It covers among others:
- the allow-list extraction of fields;
- the first delivery and the 60-second repeat window for pulls;
- the R5 status mapping, including the last check before expiry;
- the order of the URL checks;
- the CSRF check (`415`);
- webhook leases and retries;
- the cancel sweep, the re-sync, and deleting request records after the retention period.

## 4. Validation scenarios

In the commands below, `$FC` is a form connection's id, taken from its details screen or its
trigger URL, and `$REF` is a request reference.

### V1: Set up a form connection (US1, FR-001 to FR-005, SC-001, SC-002)

1. Create a form connection called "Führerscheinantrag Test", with any serviceBW form text.
   - Add **ID (PID)** with *Family name*, *Given names*, *Date of birth* and *City or town*.
   - Add **Mobile driving licence** with *Licence number*, *Driving privileges* and *Date of
     expiry*.
2. Remove every field from one document and try to save.
   - **Expected**: saving is refused, with a message that names the document.
3. Select the fields again and save.
   - **Expected**: the details screen shows a trigger URL ending in `/api/connect/$FC/requests` and
     a pull URL ending in `/requests/{reference}`. Each copies with one click, and the mode is
     **pull**.
4. Reload the page, or reopen the form connection from the overview.
   - **Expected**: the same URLs.
5. Time the whole setup (target: under 10 minutes, SC-001).
   - Nothing in this scenario needs a code change or a deployment, which is what SC-002 asks for.

### V2: Pull mode, the happy path (US2, FR-008 to FR-013, FR-018, SC-004, SC-005)

```bash
curl -s -X POST "http://localhost:3000/api/connect/$FC/requests" | tee trigger.json | jq '.data | del(.qr_code)'
REF=$(jq -r .data.reference trigger.json)
jq -r .data.qr_code trigger.json | sed 's|^data:image/png;base64,||' | base64 -d > qr.png   # open qr.png
curl -s "http://localhost:3000/api/connect/$FC/requests/$REF" | jq   # expected: "pending", documents null
```

1. Scan `qr.png` with Paradym.
   - **Expected**: the wallet asks for exactly the 7 configured fields from the two documents, in
     one interaction (FR-009).
2. Approve, then pull within 5 seconds (SC-004).
   - **Expected**: `"status": "completed"`, and `documents` holds two entries, one per document,
     each with its `document_type` and `label`. Together they carry exactly the 7 configured
     fields, each with `key`, `label` and `value`. There is no `iss`, `vct` or any other field
     (SC-005).
3. Pull again within 60 seconds.
   - **Expected**: the same documents again (FR-018).
4. Wait until more than 60 seconds have passed since the first pull that returned the documents,
   then pull again.
   - **Expected**: `"status": "completed"` and `"documents": null` (FR-018).
5. Same-device variant: open `.data.wallet_link` in the phone's browser.
   - **Expected**: Paradym opens with the same request.

### V3: Pull mode, the failure paths (US2 scenarios 5–7, FR-010, edge cases, SC-005)

| Step | Expected pull result |
|---|---|
| Trigger, scan, and **decline** in the wallet | `declined` within about 2 seconds, `documents` null. If it stays `pending` until `expired` instead, Paradym doesn't report declines; record that (research R5) |
| Trigger and wait **10 minutes** without scanning, then pull | `expired` |
| Present a credential from an issuer **not** on the trust list | `verification_failed`, `documents` null |
| Present an **expired** test credential | `verification_failed`. If it is accepted, EUDIPLO doesn't check validity periods, so stop and raise it (research R3) |
| Present a **revoked** (or suspended) test credential | `verification_failed` |
| Pull with a made-up reference, or with `$REF` under another form connection's id | `404` |

Altered credentials and credentials presented by someone other than their holder can't be produced
with a real wallet. They rely on EUDIPLO's signature and holder-binding checks (research R3), and
the status mapping is covered by the pytest suite.

### V4: Webhook mode (US3, FR-014 to FR-016)

1. Start a receiver that logs request bodies, on the compose network:

   ```bash
   docker network ls | grep _default    # find the compose network, e.g. sk-proto-1_default
   docker run --rm --name webhook-echo --network <compose-network> mendhak/http-https-echo:latest
   ```

2. On the details screen, set the webhook address to `http://webhook-echo:8080/fc-test` and save.
   - **Expected**: the mode shows **webhook**.
3. Trigger, scan and approve.
   - **Expected**: the receiver logs **one** `POST` with `"status": "completed"` and exactly the
     configured fields ([contracts/webhook-updates.md](contracts/webhook-updates.md)).
   - A pull for this `$REF` returns `completed` with `documents: null` (FR-015).
4. Trigger and decline.
   - **Expected**: the receiver logs `"status": "declined"`, `documents: null`.
5. Stop the receiver, then trigger and approve.
   - **Expected**: the backend logs retries for that request (by internal id, with no personal
     data).
   - Meanwhile, start and complete another request on a second form connection in pull mode.
     **Expected**: it still completes within 5 seconds; a failing webhook doesn't slow down other
     requests.
6. Start the receiver again within 29 minutes.
   - **Expected**: the `completed` update arrives at the next retry.
   - If the receiver stays down longer, the update is abandoned and the documents are deleted.

### V5: Maintaining form connections (US4, FR-005, FR-006)

1. Trigger a request and leave it pending. Then edit the form connection to add *Nationalities* to
   the PID, and save.
   - **Expected**: the URLs are unchanged.
2. Complete the pending request.
   - **Expected**: it delivers the **old** field set.
3. A new trigger asks the wallet for the new field as well.
4. Trigger a request and leave it pending, then **deactivate** the form connection.
   - **Expected**: from the next call on, the trigger and the pull answer
     `409 {"error": "unavailable", …}`.
   - Within a few seconds the pending request becomes `unavailable`, and in webhook mode an
     `unavailable` update is sent.
   - Scanning that request's QR code now fails in the wallet, because the worker deleted the
     EUDIPLO session.
5. **Reactivate**.
   - **Expected**: triggering works again with the same URLs.
   - A pull for the request from step 4 answers `200` with `status: "unavailable"`.
6. **Delete**, confirming the prompt.
   - **Expected**: the form connection disappears from the overview, and both URLs answer `409`
     permanently.

### V6: Data minimization (FR-020, FR-021, SC-006)

1. After a successful delivery, wait until the documents should be gone: a little over 60 seconds
   after a pull (V2), or a few seconds after a webhook delivery (V4). Then get a token with the
   middleware's EUDIPLO client and call `GET $EUDIPLO_URL/api/session/<eudiplo_session_id>`.
   - **Expected**: `404`.
   - The EUDIPLO session id is in `document_requests.eudiplo_session_id`.
2. Complete a pull-mode request and **don't pull it**. After 29 minutes, check the same way.
   - **Expected**: the EUDIPLO session is gone, and a pull returns `completed` with
     `documents: null`.
3. Inspect the middleware's database, for example
   `docker compose exec postgres psql -U postgres template_db -c '\dt'`, and the
   `document_requests` and `webhook_deliveries` tables.
   - **Expected**: no claim values anywhere.
4. Search the backend and nginx logs for the test person's family name and for `$REF`.
   - **Expected**: no matches (research R13).
5. Record retention (FR-021): in a test environment, set `REQUEST_RECORD_RETENTION_SECONDS=120`
   and restart the backend. Complete a request, then wait two minutes after it ended.
   - **Expected**: its row is gone from `document_requests`, together with its
     `webhook_deliveries`, and a pull with its reference answers `404`.

### V7: Load (SC-007, SC-004, optional)

1. Start 100 triggers in parallel, keeping every response:

   ```bash
   mkdir -p load && seq 100 | xargs -P 100 -I{} sh -c \
     'curl -s -o load/{}.json -w "%{http_code}\n" -X POST "http://localhost:3000/api/connect/$0/requests"' "$FC" \
     | sort | uniq -c
   ```

   - **Expected**: 100 × `201`.
2. Render the QR code of a few of them, as in V2, from `load/<n>.json`. Approve them with the wallet
   while the rest stay pending, and pull each one.
   - **Expected**: `completed` within 5 seconds of approval (SC-004), and no database pool errors
     in the backend log (research R15).

### V8: Usability measurements (SC-001, SC-003, SC-008)

These are measured in moderated test sessions, not by scripts.
- **DO.IT participants** (at least 5): each sets up a form connection from a written brief, as in
  V1, without help.
  - **Expected**: at least 4 of 5 succeed on their first attempt (SC-008), each in under
    10 minutes (SC-001).
- **Citizen participants**: each holds the requested documents in a wallet and goes through a
  serviceBW test form that uses the trigger and pull URLs. Measure the time from seeing the link or
  QR code to approving.
  - **Expected**: a median under 2 minutes, and at least 90% succeed on the first attempt (SC-003).
  - Note every failure caused by a selected field missing from the participant's credential
    (research R19). On the same device there is no automatic return to the form (research R11),
    so note how participants find their way back as well.

### V9: Accessibility review (SC-009)

Before release, a reviewer checks every screen of the management UI against WCAG 2.1 AA
(research R16, [contracts/ui-screens.md](contracts/ui-screens.md#accessibility-sc-009)):

1. Run an automated scan on each route, with axe DevTools or Lighthouse in the browser.
   - **Expected**: no violations at level A or AA.
2. Go through V1 and V5 using only the keyboard.
   - **Expected**: every action is reachable and the focus is always visible. Dialogs keep the
     focus while open and return it when closed.
3. Go through V1 with a screen reader (NVDA or VoiceOver).
   - **Expected**: labels, validation messages, and status messages such as "copied" are
     announced.
4. Zoom to 200%, then narrow the window to 320 px.
   - **Expected**: nothing is cut off, and no screen needs horizontal scrolling.

**Overall expected**: no unresolved WCAG 2.1 AA failures (SC-009).

## 5. Troubleshooting

| Symptom | Likely cause |
|---|---|
| Saving a form connection answers `503 Not configured` | An EUDIPLO setting is empty. The message names which one; `EUDIPLO_TRUST_LIST_ID` is the usual one |
| Saving a form connection answers `502` | Wrong EUDIPLO URL or credentials, or a missing `presentation:manage` role |
| A trigger answers `502`, and the backend logs EUDIPLO `404` | No active access key chain in the tenant |
| A trigger answers `502`, and the backend logs EUDIPLO `403` | The API client has a `allowedPresentationConfigs` allow-list. Remove it |
| Management actions answer `415` | The request wasn't sent as JSON. The frontend client always sends JSON, so check any manual `curl` calls |
| Sign-in works but the next call answers `401` in development | The UI was opened via `127.0.0.1` or a LAN address instead of `localhost` |
| Wallet results always `verification_failed`, and the logs show `no_trust_chain_to_root` or `trust_chain_not_trusted` | The test issuer isn't on the trust list, or it lacks the PID or EAA issuance service type |
| `verification_failed` only when status checking is on | The issuer's status list isn't signed by the revocation certificate in the trust list. For Paradym it must also be signed with the same certificate as the credential |
| The wallet says it can't fulfil the request | The test credential lacks one of the selected fields: every field is required, and German PIDs have no `date_of_expiry`. Select only fields the credential holds |

## 6. Deployment checks

Run these once per environment that uses the production image (Coolify, including previews):

1. **Allow-list** (FR-017, research R13):
   - Set `SERVICEBW_ALLOWED_CIDRS` (serviceBW's address ranges) and `TRUSTED_PROXY_CIDRS` (Coolify's
     Traefik network) on the frontend container.
   - From an address outside the allow-list, call the trigger URL.
     **Expected**: `403` from nginx, and no request is created.
   - From serviceBW's network: `201`.
   - With `SERVICEBW_ALLOWED_CIDRS` empty, the expected answer is `403` for everyone.
2. **Settings**: set `APP_ENV=production`, `CONNECTION_BASE_URL` (the `https://` address serviceBW
   uses) and every variable from [research.md R18](research.md#r18-configuration) in the Coolify
   environment.
   - **Expected**: the backend refuses to start if `CONNECTION_BASE_URL` is missing or uses plain
     HTTP without `ALLOW_PLAIN_HTTP=true`.
   - `API_KEY` is no longer used.
3. **HTTPS**: the UI is served over HTTPS. Signing in and the copy buttons depend on it
   (research R14).
4. **Logs**: after a pull, the nginx access log shows `/requests/<reference>` instead of the real
   reference.
5. **Tenant**: until production gets its own EUDIPLO tenant (research R19), every environment shares
   tenant `dps`. Don't use real citizens' wallets before that is resolved.
