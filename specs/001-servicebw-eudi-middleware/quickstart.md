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
| Test wallet | A phone with **Paradym** holding a test PID (SD-JWT VC, `vct` `urn:eudi:pid:1` or `urn:eudi:pid:de:1`) and a test mobile driving licence (mdoc, `org.iso.18013.5.1.mDL`). Both must come from issuers on that trust list: `backend/scripts/issue_test_credentials` issues both from the tenant itself, with a made-up person's data (README, "Test credentials for a test wallet"). Try the EU reference wallet only after Paradym works (`docs/EUDIPLO.md` §13) |
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
   ```

2. Start the stack and create a DO.IT account:

   ```bash
   docker compose up --build -d
   docker compose exec backend uv run python -m app.cli create-user alice   # prompts twice; at least 12 characters
   ```

3. Open <http://localhost:5173>. Use `localhost`, not `127.0.0.1`: the CORS origin and the cookie
   both depend on the host name. Without a session the app redirects to the sign-in screen; sign in
   as `alice`. While there is no form connection yet, sign-in opens the first-connection screen
   (V1).

Locally the backend's port 3000 is reachable directly, so `/api/connect/` is **not** restricted on
a developer machine. The nginx allow-list (R13) applies only to the production image; see
[Deployment checks](#6-deployment-checks).

## 3. Automated checks

```bash
# Backend: lint, types, tests. Tests need a database whose name ends in "_test".
docker compose exec postgres createdb -U postgres konnekt_db_test
cd backend
uv run ruff check . && uv run ruff format --check .
uv run mypy app/ scripts/ tests/
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5435/konnekt_db_test uv run pytest

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
- the cancel sweep, the re-sync, and deleting request records after the retention period.

## 4. Validation scenarios

In the commands below, `$FC` is a form connection's id, taken from its details screen or its
trigger URL, and `$REF` is a request reference.

### V1: Set up a form connection (US1, FR-001 to FR-005, FR-022, SC-001, SC-002)

Start with no form connection. On a local stack whose database already has some, hide them as a
deletion would (US4 adds deleting to the UI):

```bash
docker compose exec postgres psql -U postgres -d konnekt_db \
  -c "UPDATE form_connections SET deleted_at = now() WHERE deleted_at IS NULL;"
```

1. Signed out, open the app's own address, <http://localhost:5173/>, and sign in.
   - **Expected**: `/get-started` opens with the heading "Create your first connection" and the
     create screen's steps. The app's address doesn't count as a requested screen.
2. Select the product name in the top bar.
   - **Expected**: the overview says that there are no connections yet and offers "New
     connection". Sign out and in again: `/get-started` opens again.
3. On `/get-started`, create a form connection called "Führerscheinantrag Test", with any
   serviceBW form text.
   - Add **Personal ID** with *Family name*, *Given name*, *Date of birth* and *City or town*.
   - Add **Driving licence** with *Licence number*, *Licence classes* and *Expiry date*.
4. Remove every field from one document and try to save.
   - **Expected**: saving is refused, with a message that names the document.
5. Select the fields again and save.
   - **Expected**: the details screen shows a trigger URL ending in `/api/connect/$FC/requests` and
     a pull URL ending in `/requests/{reference}`. Each copies with one click.
6. Reload the page, or reopen the form connection from the overview.
   - **Expected**: the same URLs.
7. Sign out and in again, then open `/get-started` by its address.
   - **Expected**: both times the overview opens and lists the form connection.
8. Sign out, open the form connection's details address, and sign in there.
   - **Expected**: the details screen opens, not `/get-started` (the requested route wins).
9. Time the whole setup (target: under 10 minutes, SC-001).
   - Nothing in this scenario needs a code change or a deployment, which is what SC-002 asks for.
   - SC-002's working day runs from DO.IT agreeing on the documents to the first test request
     through the serviceBW form that returns them, so it is timed once serviceBW is connected.

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
2. Approve, wait 5 seconds, then pull (SC-004).
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
| Trigger, scan, and **decline** in the wallet | With Paradym or the EU reference wallet (Android): `pending` until `expired`, 10 minutes after the trigger. They send no error response on a decline (research R5). A wallet that sends one gets `declined` within about 2 seconds, `documents` null; the wallet-free check below covers that path |
| Trigger and wait **10 minutes** without scanning, then pull | `expired` |
| Present a credential from an issuer **not** on the trust list | `verification_failed`, `documents` null |
| Present an **expired** test credential | `verification_failed`. If it is accepted, EUDIPLO doesn't check validity periods, so stop and raise it (research R3) |
| Present a **revoked** (or suspended) test credential | `verification_failed` |
| Pull with a made-up reference, or with `$REF` under another form connection's id | `404` |

Altered credentials and credentials presented by someone other than their holder can't be produced
with a real wallet. As SC-005 and the spec assumption "Checks a test wallet can't trigger" state,
they rely on EUDIPLO's signature and holder-binding checks (research R3). The pytest suite covers
how the middleware reports them (`verification_failed`).

**Wallet-free check of `declined`**: this sends EUDIPLO what a declining wallet would send, as
EUDIPLO's own e2e test does (`presentation-direct-post-security.e2e-spec.ts`). It creates a real
session in the tenant and leaves it `failed`, which the worker deletes at once, so run it with the
operators' knowledge.

```bash
T=$(curl -s -X POST "http://localhost:3000/api/connect/$FC/requests")
REF=$(jq -r .data.reference <<<"$T")
NONCE=$(jq -r .data.qr_code_link <<<"$T" | sed -E 's#.*presentations(/|%2F)([^/%]+).*#\2#')
curl -s -X POST "$EUDIPLO_URL/presentations/$NONCE/oid4vp" \
  --data-urlencode error=access_denied \
  --data-urlencode 'error_description=User declined' \
  --data-urlencode "state=$NONCE"                       # expected: 200 {}
while sleep 2; do
  curl -s "http://localhost:3000/api/connect/$FC/requests/$REF" | jq -c '.data | {status, documents}'
done
```

- **Expected**: `"status": "declined"` and `"documents": null` within one or two pulls.

### V4: Webhook mode (removed)

Removed on 2026-10-19: webhook mode is out of scope (see the spec's Clarifications, Session
2026-10-19).

### V5: Maintaining form connections (US4, FR-005, FR-006)

1. Trigger a request and leave it pending. Then edit the form connection to add *Nationality* to
   the PID, and save.
   - **Expected**: the URLs are unchanged.
2. Complete the pending request.
   - **Expected**: it delivers the **old** field set.
3. A new trigger asks the wallet for the new field as well.
4. Trigger a request and leave it pending, then **deactivate** the form connection.
   - **Expected**: from the next call on, the trigger and the pull answer
     `409 {"error": "unavailable", …}`.
   - The pending request becomes `unavailable` at once, in the same step as the deactivation.
   - Scanning that request's QR code now fails in the wallet, because the worker deleted the
     EUDIPLO session.
5. **Reactivate**, right away or later.
   - **Expected**: triggering works again with the same URLs.
   - A pull for the request from step 4 answers `200` with `status: "unavailable"`.
6. **Delete**, confirming the prompt.
   - **Expected**: the form connection disappears from the overview, and both URLs answer `409`
     permanently.

### V6: Data minimization (FR-020, FR-021, SC-006)

1. After a successful delivery, wait until the documents should be gone: a little over 60 seconds
   after a pull (V2). Then get a token with the middleware's EUDIPLO client and call `GET $EUDIPLO_URL/api/session/<eudiplo_session_id>`.
   - **Expected**: `404`.
   - The EUDIPLO session id is in `document_requests.eudiplo_session_id`.
2. Complete a request and **don't pull it**. After 29 minutes, check the same way.
   - **Expected**: the EUDIPLO session is gone, and a pull returns `completed` with
     `documents: null`.
3. Inspect the middleware's database, for example
   `docker compose exec postgres psql -U postgres konnekt_db -c '\dt'`, and the
   `document_requests` table.
   - **Expected**: no claim values anywhere.
4. Search the backend and nginx logs for the test person's family name and for `$REF`.
   - **Expected**: no matches (research R13).
5. Record retention (FR-021): in a test environment, set `REQUEST_RECORD_RETENTION_SECONDS=120`
   and restart the backend. Complete a request, then wait two minutes after it ended.
   - **Expected**: its row is gone from `document_requests`, and a pull with its reference answers
     `404`.

### V7: Load (SC-007, SC-004)

1. Start 100 triggers in parallel, keeping every response:

   ```bash
   mkdir -p load && seq 100 | xargs -P 100 -I{} sh -c \
     'curl -s -o load/{}.json -w "%{http_code}\n" -X POST "http://localhost:3000/api/connect/$0/requests"' "$FC" \
     | sort | uniq -c
   ```

   - **Expected**: 100 × `201`.
2. Render the QR code of a few of them, as in V2, from `load/<n>.json`. Approve them with the wallet
   while the rest stay pending, and pull each one.
   - **Expected**: a pull 5 seconds after each approval answers `completed` (SC-004), and no database pool errors
     in the backend log (research R15).

### V8: Usability measurements (SC-001, SC-003, SC-008)

These are measured in moderated test sessions, not by scripts.
- **DO.IT participants** (at least 5): each sets up a form connection from a written brief, as in
  V1, without help.
  - **Expected**: at least 4 of 5 succeed on their first attempt (SC-008), each in under
    10 minutes (SC-001).
- **Citizen participants** (at least 10): each uses a test wallet with sample documents, because
  real wallets aren't allowed on the shared tenant yet, and goes through a serviceBW test form that
  uses the trigger and pull URLs. Half start from the QR code and half from the same-device link.
  Measure the time from seeing the link or QR code to approving.
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
| Saving a form connection answers `503 Not configured` | An EUDIPLO setting is empty. The backend's log names which one, in the line that starts with the answer's `error_id` (the UI's "Error ID"); `EUDIPLO_TRUST_LIST_ID` is the usual one |
| Saving a form connection answers `502` | Wrong EUDIPLO URL or credentials, or a missing `presentation:manage` role |
| A trigger answers `502`, and the backend's line for its `error_id` names `EudiploNotFound` (EUDIPLO answered `404`) | No active access key chain in the tenant |
| A trigger answers `502`, and the backend logs EUDIPLO `403` | The API client has a `allowedPresentationConfigs` allow-list. Remove it |
| Management actions answer `415` | The request wasn't sent as JSON. The frontend client always sends JSON, so check any manual `curl` calls |
| Sign-in works but the next call answers `401` in development | The UI was opened via `127.0.0.1` or a LAN address instead of `localhost` |
| Wallet results always `verification_failed`, and the logs show `no_trust_chain_to_root` or `trust_chain_not_trusted` | The test issuer isn't on the trust list, or it lacks the PID or EAA issuance service type |
| `verification_failed` only when status checking is on | The issuer's status list isn't signed by the revocation certificate in the trust list. For Paradym it must also be signed with the same certificate as the credential |
| The wallet says it can't fulfil the request | The test credential lacks one of the selected fields: every field is required, and German PIDs have no `date_of_expiry`. Select only fields the credential holds |
| The wallet says it has no matching card, for every field selection | `EUDIPLO_TRUST_LIST_ID` names a trust list that doesn't exist. EUDIPLO saves such a configuration without an error, and the wallet then finds no credential from a trusted issuer. Compare it with the ids of `GET /api/trust-list`, and restart the backend after fixing it: the worker's re-sync gives every form connection a new revision with the right list |

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
