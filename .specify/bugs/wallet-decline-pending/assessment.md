# Bug Assessment: Declining in the EUDI Wallet leaves the request pending instead of declined

- **Slug**: wallet-decline-pending
- **Created**: 2026-10-12
- **Source**: pasted text (no URL to fetch). The report names two deployment hosts,
  `md.faro.dpschool.app` and `eudiplo.faro.dpschool.app`. Neither is a bug-report page, and
  neither was fetched or called.
- **Verdict**: invalid as a middleware defect: this is expected, documented behaviour. It was
  reproduced live on 2026-10-13 with Paradym 1.20.2 (build 94). After a decline on the consent
  screen, EUDIPLO's session stayed `fetched` with no failure code, so it recorded no error response
  (Reproduction, "Live run"). The middleware and EUDIPLO 9.0.0 turn a decline the wallet reports
  into `declined` within one worker cycle. Paradym 1.20.2 sends none for a QR-code request: its
  source at that version was read. The report's second "Done when" branch therefore applies: document the
  limitation with the evidence, and add the end-to-end test it asks for. No production code changes.
- **Severity**: low. No personal data is exposed and no wrong data is delivered. The request still
  ends, as `expired` at `expires_at` (10 minutes). The impact is a less specific message for a
  citizen who declined. It hits every decline made with Paradym or the EU reference wallet
  (Android). The serviceBW form stops polling after 3 minutes, before `expires_at`, so it never
  reads `expired` either and has to show its own timeout.

## Report (verbatim or summarized)

> The serviceBW ↔ EUDI Wallet Middleware (md.faro.dpschool.app, connect API 0.1.0) starts a request
> with `POST /api/connect/{form_connection_id}/requests` and reports it with
> `GET /api/connect/{form_connection_id}/requests/{reference}`. `PullResponse.status` includes
> `declined`. The passenger licence form (sk-proto-1) polls the pull URL every 2 s and shows
> "No data was received, because the sharing was declined in your wallet" as soon as it reads
> `declined` (consumer contract: `contracts/middleware-api.md` §2 and §4 item 4).
>
> Observed (2026-10-12, about 15:51–15:54 UTC): form connection
> `c027f4b7-460b-477b-a13b-022c2f6c8751`, pull mode, no webhook. The QR code held `qr_code_link`,
> whose `request_uri` is
> `https://eudiplo.faro.dpschool.app/presentations/<id>/oid4vp/request/no-redirect`. Declined in
> the wallet app: `<wallet app and version>` (named afterwards by the reporter: **Paradym 1.20.2,
> build 94**). For the next 3 minutes, every pull answered `200` with
> `status: "pending"` and `documents: null` (155 bytes), until the form's own limit ended the
> request. `declined` never came. A share on the same setup worked: `completed` within one poll.
>
> Done when: after a decline in the wallet, the pull answers `status: "declined"` within about 2 s,
> and a middleware test covers it. Or, if the wallet sends nothing, the limitation is documented
> with the evidence.

The report's five "To find out" items are answered below. Item 1 could not be run here (see
Reproduction). Items 2 to 5 are answered from the source code.

`contracts/middleware-api.md` is the consumer's copy in sk-proto-1. In this repo the contract is
`specs/001-servicebw-eudi-middleware/contracts/integration-api.md`. It already states the
limitation (`:161-162`): "A decline is reported only if the wallet sends one. If the citizen simply
closes the wallet, the request stays `pending` until `expired`." It also says (`:160`): "Don't stop
waiting before `expires_at`: the middleware reports `expired` itself."

## Symptom

After the citizen declines in the wallet, the pull URL keeps answering `pending` with
`documents: null`. The request only ends when it expires: as `expired`, at `expires_at`, 10 minutes
after the trigger. serviceBW expected `declined` within about 2 seconds, which the middleware only
reports when the wallet actually sends an error response to EUDIPLO.

## Reproduction

### Live run (2026-10-13): reproduced with Paradym 1.20.2

**Setup.** A local backend, this branch with the worker on, ran against the hosted EUDIPLO
(`https://eudiplo.faro.dpschool.app/`, tenant `dps`) with the middleware's client. The reporter
scanned the QR codes with Paradym 1.20.2 (build 94). A watcher polled the local pull URL and EUDIPLO's
`GET /api/session/{id}` every 2 s, printing only statuses, failure codes and timestamps. Times are
UTC.

| Run | Request | Wallet action | EUDIPLO session | Pull |
|---|---|---|---|---|
| A | PID (`family_name`, `given_name`), trust list `trust-list-id` | Scanned. No matching card, so the reporter left the request | `active` → `fetched` at 12:19:54, then unchanged, no `failureCode` | `pending` until 12:27:30. At 12:27:31 `expired`, and the session was deleted (404) |
| A2 | mDL, same trust list | Scanned. No matching card | `fetched` at 12:25:07, then unchanged, no `failureCode` | `pending` until 12:33:00. At 12:33:01 `expired`, and the session was deleted (404) |
| A3 | mDL, trust list `trust-list-test` | Scanned at 12:29:55. The reporter **declined the sharing** on the consent screen | `fetched` (12:29:55), then unchanged: no `failed`, no `failureCode`, `updatedAt` stuck at 12:29:55 | `pending` for 9 minutes after the decline, until 12:38:55. At 12:38:56 `expired`, and the session was deleted (404). `declined` never came |

- **Run A3 is the reported case**: Decline on the consent screen, with a card that matches. EUDIPLO
  received the wallet's request fetch, and after the decline the session never moved. Its
  `updatedAt` stayed at the fetch time, and EUDIPLO records any processed wallet error response as
  `failed` with `failureCode` (`fail-presentation-response.ts:53-66`). So no error response was
  processed. This matches Paradym 1.20.2's source, which sends nothing.
- **EUDIPLO's session log** (`GET /api/session/{id}/logs`) for A3 is empty. The hosted instance
  doesn't seem to keep session logs (`LOG_SESSION_STORE`). Only the reverse proxy's access log can
  show whether a `POST /presentations/b9df48a2-760d-487c-a50a-6c296c3c0266/oid4vp` arrived and was
  refused (`400`). The source says Paradym sends none.
- **Runs A and A2 had a test setup error.** The local `backend/.env` had
  `EUDIPLO_TRUST_LIST_ID=trust-list-id`, and the tenant's only trust list is `trust-list-test`.
  EUDIPLO turns the trust list into the issuers' key identifiers for the wallet
  (`verifier/presentations/trusted-authorities.service.ts:56-96`, `:160-196`). With an unknown list,
  no card can match. Paradym shows the requested doctype in capitals (`ORG.ISO.18013.5.1.MDL`), which
  looked like a case mismatch, but the stored query has `org.iso.18013.5.1.mDL`. A3 was created on
  `trust-list-test` and matched. Leaving a "no matching card" screen also sends nothing (A, A2): it
  runs the same `declineCredentialRequest`.
- **Not run**: the wallet-free decline (step 2 below). The session's permission check blocked
  posting a simulated wallet error to the shared production EUDIPLO. It needs the reporter's
  explicit go-ahead, or the reporter runs it.

### Earlier checks (2026-10-12)

Not reproduced live on 2026-10-12: that needs a phone with a test wallet, and a host that may call
the pull URL (it is network-restricted, FR-017). It also needs EUDIPLO credentials, and there was no
`backend/.env` then. What was done instead:

1. **Middleware tests run**: `uv run pytest tests/unit/test_status_mapping.py
   tests/api/test_worker_requests.py tests/api/test_connect.py -k 'declin or failure or sync or
   wallet or expires or last_check'`, against the local `konnekt_db_test` (Postgres on
   `localhost:5435`). Result: **43 passed**. They cover `failed` + `access_denied` → `declined`, both
   through the sync and through the last check after expiry.
2. **EUDIPLO source read**: tag `v9.0.0` (`8f6abca`, 2026-10-05), the version the hosted instance
   reports (research R19, item 4).
3. **Wallet sources read**: Paradym at **1.20.2**, the version used. That is commit `0bfd4e1`
   (2026-05-13), the last one whose `apps/easypid/package.json` says `1.20.2`: `a3727ee` set
   it on 2026-05-06, and `7998d7f` raised it to `1.20.3`. The repo has no release tags, so
   build 94 can't be matched to a commit exactly. Also read: Paradym `main` @ `226083d`
   (2026-10-02, `1.21.0`), the
   EU reference wallet app for Android (`eu-digital-identity-wallet/eudi-app-android-wallet-ui`
   `main` @ `7f40440`, 2026-10-09, which uses wallet-core `0.31.0`), and its library
   (`eudi-lib-android-wallet-core` `main` @ `0d7c5b1`, 2026-10-02, `0.31.1-SNAPSHOT`).

**Steps to settle it on the deployment**, in order of cost:

1. **Read the observed request's record** (kept 7 days after it ended, FR-021, so until about
   2026-10-19). This needs no wallet and settles the question by itself:

   ```sql
   select status, failure_code, status_changed_at, ended_at
   from document_requests
   where form_connection_id = 'c027f4b7-460b-477b-a13b-022c2f6c8751'
     and created_at between '2026-10-12 15:45+00' and '2026-10-12 16:00+00';
   ```

   - **`expired`, `failure_code` null** (expected): at the last check, 10 minutes after the
     trigger, EUDIPLO's session was still `active` or `fetched`. So EUDIPLO never recorded a wallet
     error (`check_session` applies a `failed` session as `declined` even after expiry,
     `document_requests.py:200-215`). The wallet sent nothing, or EUDIPLO refused what it sent;
     step 3 tells these apart.
   - **`declined`, `access_denied`**: EUDIPLO did record it, but the sync missed it before expiry.
     That would be a middleware bug in `worker.sync_sessions`; reopen the assessment.
2. **Check middleware and EUDIPLO without a wallet.** This sends what a declining wallet would
   send:

   ```bash
   MW=https://md.faro.dpschool.app/api/connect/$FC        # from an allowed host
   T=$(curl -s -X POST "$MW/requests")
   REF=$(jq -r .data.reference <<<"$T")
   NONCE=$(jq -r .data.qr_code_link <<<"$T" | grep -o 'presentations%2F[^%]*' | cut -d F -f2)
   curl -s -X POST "https://eudiplo.faro.dpschool.app/presentations/$NONCE/oid4vp" \
     --data-urlencode error=access_denied \
     --data-urlencode 'error_description=User declined' \
     --data-urlencode "state=$NONCE"                       # expect 200 {}
   while sleep 2; do curl -s "$MW/requests/$REF" | jq -c '.data | {status, documents}'; done
   ```

   **Expected**: `declined` within one or two polls. This is the same call as EUDIPLO's own e2e
   test (`apps/backend/test/presentation/presentation-direct-post-security.e2e-spec.ts:425-434`).
   It runs on the shared tenant `dps` and leaves a `failed` session that the worker deletes at once.
3. **With the wallet**: trigger, scan the QR code, decline, and run the same `while` loop. At the
   same moment, look in EUDIPLO's log for `wallet_error_response`, and in the reverse proxy's
   (Traefik, Coolify) access log for a `POST /presentations/<nonce>/oid4vp`. No POST means the
   wallet sent nothing. A POST answered `400` means EUDIPLO refused it, for example because of a
   parameter its strict schema doesn't allow.
4. **Wallet**: Paradym 1.20.2 (build 94), named by the reporter. The reporter has it at hand
   for steps 2 and 3.

## Suspected Code Paths

### The middleware handles a reported decline (no defect found)

- `backend/app/services/document_requests.py:65-82`: `WALLET_ERROR_CODES` includes `access_denied`.
- `backend/app/services/document_requests.py:102-118`: `status_for_session('failed', code)` →
  `declined` for a wallet error code, `verification_failed` otherwise. `active` and `fetched` →
  `pending`.
- `backend/app/services/worker.py:77-101`: `sync_sessions` lists the presentation sessions updated
  since the cursor (less 5 s) every 2 s, and `_apply_outcomes` (`:129-165`) applies `failed` +
  code under the row lock. It reads a `failed` session without a code on its own.
- `backend/app/services/document_requests.py:455-490`: `pull` only reads the stored status. Before
  `expires_at` it never asks EUDIPLO (`test_before_the_expiry_a_pull_doesnt_ask_eudiplo`), so
  `declined` reaches the pull only through the worker's sync.
- `backend/app/services/document_requests.py:175-221`: the last check, after `expires_at`. It
  applies a `failed` session as `declined`; only a session still waiting becomes `expired`.
- Tests that pass: `tests/unit/test_status_mapping.py`;
  `tests/api/test_worker_requests.py:67-94` (sync → `declined`) and `:226-241` (list without
  outcome); `tests/api/test_connect.py:662-686` (decline before the expiry → pull answers `declined`
  after the last check).

**Coverage gap**: no test follows a decline from serviceBW's side *before* the expiry: decline →
one sync → the pull answers `declined`. `test_worker_requests.py` checks the database record, and
`test_connect.py` checks the pull only after `_expire()`. No test starts with the cursor already
past the session's earlier `updatedAt`, as it is in real use. There the sync has run many times
while the session was `fetched`, and the decline comes later.

### EUDIPLO 9.0.0 records a wallet error response (no defect found)

Paths are relative to the EUDIPLO repo at `v9.0.0`.

- `apps/backend/src/verifier/oid4vp/oid4vp.controller.ts:94-101`: `POST
  /presentations/:sessionId/oid4vp` is the `response_uri`. The path segment is the wallet nonce.
- `apps/backend/src/verifier/oid4vp/dto/authorization-response.dto.ts:16-25`: the body may be
  `{error, error_description?, error_uri?, state?}` instead of `response`. The schema is
  `.strict()`, so an unknown parameter answers `400`.
- `apps/backend/src/verifier/oid4vp/oid4vp.service.ts:684-756`: `getResponse` handles a wallet
  error sent as form parameters (`:722-724`) and one inside the encrypted `direct_post.jwt`
  response (`:754-756`). It refuses a session that is consumed, final or expired (`:701-712`).
- `apps/backend/src/verifier/oid4vp/oid4vp.service.ts:607-675`: `handleWalletError` writes an
  audit-log entry with `action: "wallet_error_response"` (`:622-629`), then records the failure.
  Without a redirect it answers `200 {}` (`:662-664`).
- `apps/backend/src/verifier/oid4vp/application/fail-presentation-response.ts:53-66`: sets
  `status: failed`, `failureCode: <error>` and `errorReason: "Wallet error: <error>[: <description>]"`.
- `apps/backend/src/session/adapters/typeorm-session.repository.ts:76-97` with
  `session/entities/session.entity.ts:52-53`: a TypeORM `update()` on an entity with an
  `@UpdateDateColumn`. TypeORM sets that column itself, so `updatedAt` moves forward and the
  middleware's `updatedFrom` list picks the session up. (TypeORM behaviour, not run.)
- `apps/docs/docs/reference/session-outcome.md:90-92` documents the same.

### The wallets don't send one (root cause)

- **Paradym 1.20.2** (`0bfd4e1`), the wallet used:
  `apps/easypid/src/features/share/FunkeOpenIdPresentationNotificationScreen.tsx:203-…`.
  `onProofDecline` calls `paradym.openid4vc.declineCredentialRequest` and navigates back. That
  function (`packages/sdk/src/openid4vc/func/declineCredentialRequest.ts:11-19`) only stores an
  activity entry (`'stopped'` or `'failed'`) in the wallet. It sends nothing to the
  `response_uri`.
  - The SDK's only error response is for the Digital Credentials API
    (`packages/sdk/src/dcApi/sendErrorResponse.ts`), the browser flow. A QR-code request
    never uses it.
  - `main` (`226083d`, `1.21.0`) is unchanged: `apps/wallet/.../OpenIdPresentationNotificationScreen.tsx:216-226`.
- **EU reference wallet, Android app**:
  `core-logic/src/main/java/eu/europa/ec/corelogic/controller/WalletCorePresentationController.kt:583-588`.
  `stopPresentation()` cancels the coroutine scope and stops a proximity presentation. The request
  screen calls it on clean-up (`presentation-feature/.../PresentationRequestViewModel.kt:215`). The
  app calls `rejectRemotePresentation()` nowhere.
- **EU wallet-core library**: it can send a decline.
  `wallet-core/.../presentation/PresentationManager.kt:94-107` documents
  `rejectRemotePresentation()`, which "Sends a 'Negative Consensus' (access_denied) response to the
  Verifier". `OpenId4VpManager.kt:297-320` dispatches `Consensus.NegativeConsensus`. The app doesn't
  use it. Whether `0.31.0`, the version the app pins, already has it was not checked.

### `qr_code_link` (`/no-redirect`) vs `wallet_link` (item 5)

- `oid4vp.controller.ts:57-69`, `oid4vp.service.ts:233-241` and
  `application/retrieve-presentation-request.ts:32-40`: `/no-redirect` only sets the session's
  `redirectUri` to null. The request object is the same: `response_mode` `direct_post.jwt`, same
  `response_uri`, and `state` = the wallet nonce (`oid4vp.service.ts:363-365`, `:397`).
- The middleware's configurations set no `redirectUri` (research R11; `services/dcql.py` has none).
  Both links therefore produce the same request and the same error handling: `200 {}`, no redirect.
- Neither wallet's decline path depends on the link. The variant doesn't matter here.

## Root Cause Hypothesis

**Confidence: high, pending one check (Reproduction step 1).** The wallet never tells the verifier
about a decline. Both test wallets named in `docs/EUDIPLO.md` §11 end a declined OpenID4VP
presentation locally: Paradym logs it in its activity list, and the EU reference app (Android)
stops the flow. Neither POSTs `error=access_denied` to EUDIPLO's `response_uri`. EUDIPLO's session
therefore stays `fetched`. The middleware's sync sees no outcome, and the pull answers `pending`
until the worker's last check makes the request `expired` at `expires_at`, 10 minutes after the
trigger. If a wallet did send the error, EUDIPLO 9.0.0 would record `failed`/`access_denied` and
move `updatedAt`. The middleware would then answer `declined` at the next 2-second cycle. Its tests
pass for both the sync and the last check. The form's 3-minute limit hides even `expired`, because
it stops polling before `expires_at`, against `integration-api.md:160`.

Ruled out:
- A middleware mapping or sync defect: the code above, the 43 passing tests, and a `completed` on
  the same setup within one poll, which uses the same sync.
- Clock skew between the middleware's database and EUDIPLO: `sync_sessions` uses the oldest pending
  `created_at`, from the middleware's clock, as a lower bound (`worker.py:96`). The skew would have
  to exceed the time from trigger to decline, and it would have hidden the `completed` too.
  Unlikely.
- The QR variant: see item 5 above.

## Proposed Remediation

**Preferred: no production code change. Lock the behaviour in with one test, and document the
limitation with the evidence** (the report's second "Done when" branch).

1. **Confirm** with Reproduction step 1, and step 2 if access allows. Record the results.
2. **Add the end-to-end test** the report asks for. It follows a decline from serviceBW's side,
   before the expiry, the way it happens in real use:
   - trigger; the session becomes `fetched`; `worker.sync_sessions()` runs and the cursor moves;
   - the pull answers `pending`;
   - the wallet sends `access_denied`: the fake sets `failed`, the code, `errorReason` "Wallet
     error: access_denied: …" as EUDIPLO does, and a later `updatedAt`;
   - one more `worker.sync_sessions()`;
   - the pull answers `declined` with `documents: null`, and no `get_session` call was made.

   Parametrize over a wallet code (`access_denied` → `declined`) and a verification code
   (`signature_invalid` → `verification_failed`). Optionally, make `fail_in_wallet`
   (`tests/helpers.py:187-194`) set EUDIPLO's `errorReason` text for wallet codes, so the fake
   matches `fail-presentation-response.ts`.
3. **Document the evidence**:
   - `specs/001-servicebw-eudi-middleware/research.md` R5, bullet "A decline only reaches the
     middleware if the wallet reports it": add what was checked. EUDIPLO 9.0.0 records form and
     encrypted error responses. Paradym (1.20.2 @ `0bfd4e1`, and `main` @ `226083d`) and the EU
     reference app for Android (`7f40440`) send none.
   - The same file, R19 item 4: answer T081's open point "whether Paradym reports a decline (V3)".
     Paradym 1.20.2 doesn't. This comes from the source; confirm it live (Reproduction step 3).
   - `specs/001-servicebw-eudi-middleware/quickstart.md` V3, decline row: with Paradym and the EU
     reference wallet, expect `pending` until `expired`. Add Reproduction step 2 as the wallet-free
     check of the `declined` path.
   - `specs/001-servicebw-eudi-middleware/contracts/integration-api.md` "How serviceBW should poll"
     (`:156-164`): name the wallets that don't report declines. Repeat that serviceBW must keep
     polling until `expires_at` (10 minutes), or it never sees `expired`.
   - `docs/EUDIPLO.md`: in §7 "Receiving results", say that wallet error responses become
     `failed` + `failureCode`, as form parameters or inside `direct_post.jwt`. In §10, add a
     pitfall row: "Paradym and the EU reference app (Android) send no error response on decline;
     the session stays `fetched` until it expires".
4. **Outside this repo** (for DO.IT and sk-proto-1):
   - The form should keep polling until `expires_at`, as the contract asks. If it keeps its 3-minute
     limit, the message there should not claim a decline.
   - Optionally, report the missing decline response upstream to Paradym and the EU reference app.
     The EU wallet-core already has `rejectRemotePresentation()`.

**Alternatives**:
- **Treat a session that was `fetched` but unanswered for N seconds as `declined`**: rejected. A
  citizen who is still choosing documents or entering a PIN would get a false `declined`, which
  ends the request and loses an approval that comes later. That breaks R5 ("Unknown codes … never
  look like a citizen's choice") and the spec's "never abandons a citizen who approves in time".
- **Shorten `REQUEST_LIFETIME_SECONDS`** (`config.py:34`, 600 s), so that `expired` comes sooner:
  FR-012 fixes 10 minutes, and less time hurts slow citizens. Rejected.
- **Report `fetched` as a new status, e.g. `opened`**, so that the form knows the wallet loaded the
  request: it still can't tell a decline from a slow approval, and it changes the API contract.
  Not for this bug.

**Files likely to change**:
- `backend/tests/api/test_connect.py` (or `backend/tests/api/test_worker_requests.py`)
- `backend/tests/helpers.py` (optional: EUDIPLO's `errorReason` for wallet codes)
- `specs/001-servicebw-eudi-middleware/research.md`
- `specs/001-servicebw-eudi-middleware/quickstart.md`
- `specs/001-servicebw-eudi-middleware/contracts/integration-api.md`
- `docs/EUDIPLO.md`

**Tests to add or update**:
- `test_a_decline_reaches_the_pull_within_one_sync` (name indicative), as in step 2, parametrized
  `access_denied` → `declined` and `signature_invalid` → `verification_failed`, with the cursor
  already past the session's earlier `updatedAt`.
- Keep `test_before_the_expiry_a_pull_doesnt_ask_eudiplo`: it documents that only the worker
  brings `declined` before the expiry.

## Risks & Considerations

- **Wallet behaviour changes**: record each wallet's commit, version and the date checked, so the
  note can be revisited. An app-store build may differ from `main`. The EU reference app for iOS
  was not checked.
- **The shared tenant**: Reproduction step 2 creates a real session in tenant `dps` and posts a
  wallet error to it. It is harmless (the worker deletes the session), but it should run with the
  operators' knowledge.
- **No API, schema or migration change**: the preferred fix is a test plus documents.
- **Fidelity of the fake**: the new test assumes, as the fake does, that EUDIPLO moves `updatedAt`
  when it records a failure. This is from the source (TypeORM `@UpdateDateColumn` on `update()`)
  and was not run. Step 2 confirms it live.
- **Observability**: the middleware can't tell "the wallet never opened the request" from "the
  wallet opened it and the citizen left". If that's ever needed, EUDIPLO's `fetched` state is the
  signal (alternative 3).

## Open Questions

- Resolved: the wallet was Paradym 1.20.2 (build 94).
- [NEEDS CLARIFICATION: What status and `failure_code` does the deployed middleware hold for the
  request triggered at about 15:51 UTC on form connection `c027f4b7-…`? It needs access to the
  production database, until about 2026-10-19. `expired`/null confirms the hypothesis;
  `declined`/`access_denied` would point to a sync defect.]
- [NEEDS CLARIFICATION: Does the proxy's access log show a `POST /presentations/<nonce>/oid4vp`
  after the scans, and with what status? On 2026-10-12 at about 15:51–15:54. On 2026-10-13: wallet
  IDs `57553243-1177-451d-a297-9ee1894ce8ed` (scan 12:19:54), `7e5a7ea0-71ed-4ce4-8927-ca86ecb589ed`
  (12:25:07) and `b9df48a2-760d-487c-a50a-6c296c3c0266` (12:29:55, the consent-screen decline). Each
  scan should show a `GET …/oid4vp/request/no-redirect`. EUDIPLO's session log is empty for these.]
- [Separate issue, not this bug: a non-existent `EUDIPLO_TRUST_LIST_ID` is accepted without an
  error. EUDIPLO stores the configuration, and every request built from it can't be answered by any
  wallet. Seen with the local `.env` on 2026-10-13. Worth its own report: check the trust list on
  startup, or when a form connection is saved. Also confirm that production's value is
  `trust-list-test`.]
- [NEEDS CLARIFICATION: Is there a wallet available that sends `access_denied` on decline, to check
  the `declined` path end to end? The report's item 4 suggests trying one. None of the checked
  wallets do.]
- [NEEDS CLARIFICATION: Will sk-proto-1 keep polling until `expires_at`, as `integration-api.md:160`
  asks, or keep its 3-minute limit? The owner is DO.IT / sk-proto-1, not this repo.]

## Sources read (external)

All on `github.com`, which is on the safe list, read as data:

- `https://github.com/EUDIPLO/eudiplo`, tag `v9.0.0`
- `https://github.com/animo/paradym-wallet`, `0bfd4e1` (1.20.2) and `main`
- `https://github.com/eu-digital-identity-wallet/eudi-app-android-wallet-ui`, `main`
- `https://github.com/eu-digital-identity-wallet/eudi-lib-android-wallet-core`, `main`
- `https://github.com/openwallet-foundation/credo-ts`, `main` (searched, nothing relevant used)

Two web searches about wallet decline behaviour found nothing conclusive, so nothing from them is
relied on.
