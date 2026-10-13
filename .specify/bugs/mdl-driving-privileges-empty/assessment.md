# Bug Assessment: mDL `driving_privileges` arrives as `[{}, {}, {}]`

- **Slug**: mdl-driving-privileges-empty
- **Created**: 2026-10-12
- **Source**: pasted text (no URL)
- **Verdict**: valid. The cause is in EUDIPLO 9.0.0, not in the middleware: EUDIPLO loses the content
  before the middleware reads it. Reproduced with the CBOR library that EUDIPLO uses; not yet
  checked against a live capture.
- **Severity**: medium. Every mDL share loses the content of `driving_privileges`, whichever wallet
  or issuer it comes from, so "Class B since" can never be filled from the wallet. Nothing else is
  lost or corrupted, there is no security impact, and the citizen can still type the date by hand.
  The middleware can't fix this alone: the fix belongs in EUDIPLO.

## Report (verbatim or summarized)

Condensed from the pasted text. Some lines in the paste were cut off ("`driving_p`", "`JsonVa`",
"configuration add"); the meaning is clear from the context.

> The passenger licence form fills "Class B since" from the `issue_date` of the `driving_privileges`
> entry whose `vehicle_category_code` is `B` (consumer contract: `contracts/middleware-api.md` §3,
> §4 item 3). In ISO/IEC 18013-5, `driving_privileges` is an array of DrivingPrivilege maps:
> `vehicle_category_code` (mandatory), plus the optional `issue_date`, `expiry_date` and `codes`.
>
> **Observed (2026-10-12)**: shares from an EUDI Wallet app (`<app and version>`) through form
> connections `c027f4b7…` (15:50 UTC) and `c2241060…` (16:02 UTC). In both, `driving_privileges`
> was `[{}, {}, {}]`. The other mDL fields arrived fine: `document_number` and `issuing_authority`
> as strings, `issue_date` and `expiry_date` as ISO dates.
>
> **To find out**: (1) decode the raw presentation, and check whether the credential has an
> `issue_date` per class and one for category B; (2) follow the value through EUDIPLO's claim output
> and the middleware's conversion into `DeliveredField.value`; (3) fix the conversion and add a test
> with a real-shaped entry; (4) if there is no per-class `issue_date`, report that instead.
>
> **Done when** a pull delivers `[{"vehicle_category_code": "B", "issue_date": "2003-05-12"}, …]`
> and the form fills "Class B since" from the wallet (sk-proto-1 quickstart 12.2).

The consumer contract
(`batch27-faro-middleware-client/sk-proto-1/specs/001-eudi-passenger-license-form/contracts/middleware-api.md:241-245`)
says the content is "probably lost when the middleware converts the mDL's data to JSON". This
assessment shows that is not where it is lost.

## Symptom

Every pull of an mDL share delivers `driving_privileges` as a list of empty objects, one per
licence class. The list length is right, but each entry has lost all its keys. Each entry should
carry `vehicle_category_code` and, where the credential holds them, `issue_date`, `expiry_date`
and `codes`, with dates as ISO strings. The top-level mDL elements are not affected.

## Reproduction

**Live (as reported)**:

1. Issue a test mDL to a wallet with `uv run python -m scripts.issue_test_credentials`, or use any
   other mDL.
2. Create a form connection that requests `mdl` → `driving_privileges` and trigger a request
   (`POST /api/connect/...`).
3. Share the mDL from the wallet, then pull: `driving_privileges` is `[{}, {}, …]`.

**Library-level (done during this assessment, no wallet needed)**: with `@owf/cose@0.4.0` (the
version that EUDIPLO v9.0.0's `pnpm-lock.yaml` pins), `cborEncode` the claims the way EUDIPLO's
mdoc issuer does, `cborDecode` them the way its verifier does, flatten them the way
`getPrettyClaims` does, and `JSON.stringify` the result the way the session column does:

```js
const { cborEncode, cborDecode, DateOnly } = await import('<…>/@owf/cose/dist/index.mjs');
const issued = {
  issue_date: '2015-04-01',
  driving_privileges: [
    { vehicle_category_code: 'AM', issue_date: '2003-05-12' },
    { vehicle_category_code: 'B', issue_date: '2003-05-12' },
    { vehicle_category_code: 'L', issue_date: '2003-05-12' },
  ],
  iso_shape: [{ vehicle_category_code: 'B', issue_date: new DateOnly('2003-05-12') }],
};
const claims = Object.fromEntries(
  Object.entries(issued).map(([k, v]) => [k, cborDecode(cborEncode(v))]));
// each decoded entry is a JS Map with keys [vehicle_category_code, issue_date]
JSON.stringify(claims);
// {"issue_date":"2015-04-01","driving_privileges":[{},{},{}],"iso_shape":[{}]}
```

This gives exactly the observed `[{}, {}, {}]`. The ISO-conformant shape, with `full-date`
(tag 1004), is emptied in the same way.

**Middleware pass-through (checked)**: `json_value()` with a real-shaped entry returns it unchanged,
including nested `codes`. Given `[{}, {}, {}]`, it returns `[{}, {}, {}]`.

[NEEDS CLARIFICATION: wallet app and version. This doesn't change the cause, because the loss
happens in the verifier whatever the wallet.]

## Suspected Code Paths

Paths are given for EUDIPLO at tag `v9.0.0` (commit `8f6abca`), which is the version of the hosted
instance (research R19, checked on 2026-10-09).

- `@owf/cose@0.4.0` `dist/index.mjs:59-65`: the CBOR decoder's defaults, `mapsAsObjects: false`.
  Every CBOR map decodes to a JS `Map`, not to a plain object.
- `@owf/mdoc@0.8.0` `dist/index.mjs:2740-2744`: `IssuerSigned.getPrettyClaims(ns)` returns
  `Object.fromEntries(items.map(i => [i.elementIdentifier, i.elementValue]))`. Only the top level
  becomes a plain object; each `elementValue` is passed on as decoded. A string or a `DateOnly` is
  fine, but every DrivingPrivilege inside the `driving_privileges` array stays a `Map`.
- EUDIPLO `apps/backend/src/verifier/presentations/credential/mdocverifier/mdocverifier.service.ts:147-150`:
  merges `getPrettyClaims(ns)` into `claims` without converting nested values.
- EUDIPLO `apps/backend/src/verifier/oid4vp/application/complete-presentation-response.ts:54`:
  stores these claims as the session's `credentials`.
- EUDIPLO `apps/backend/src/session/entities/session.entity.ts:233-234` and
  `apps/backend/src/platform/data-encryption/data-encryption.service.ts:125-127`: the column is
  written with `encryptJson` → `JSON.stringify`, which writes a `Map` as `{}`. The content is lost
  here, for good. `GET /api/session/{id}` and the webhooks only return what was stored.
- `backend/app/services/eudiplo.py:109` (`PresentedCredential.values: list[dict[str, Any]]`) and
  `backend/app/services/documents.py:87` (`json_value`) in the middleware: both pass nested
  objects through unchanged. **Not the cause.** They are listed to show that nothing in the
  middleware filters or drops nested keys.
- `backend/tests/helpers.py:55-66` and `backend/tests/unit/test_documents.py:30`: the fixtures show
  `driving_privileges` with full entries, a shape EUDIPLO 9 never returns. This is why the tests
  didn't catch the problem. Research R9 (`specs/001-servicebw-eudi-middleware/research.md:512`) and
  R19 item 4 (`research.md:969`) left "mdoc binary and date values" as **Not settled, checked in
  T081**, and T081 hasn't run yet.

Upstream status (checked 2026-10-12):

- EUDIPLO `v9.1.0` (2026-10-10) and `main`: `mdocverifier.service.ts` is byte-identical to `v9.0.0`.
- `main` uses `@owf/mdoc@0.8.1` / `@owf/cose@0.4.1`, and both still have the same `getPrettyClaims`
  and `mapsAsObjects: false`.
- No matching EUDIPLO issue is open. Issue #545 ("mDOC claims not correctly saved in session") and
  PR #551 are about namespaces, not nested values.

**So no released EUDIPLO version fixes this.**

## Root Cause Hypothesis

EUDIPLO's mdoc verifier decodes the DeviceResponse with `@owf/cose`, which turns every CBOR map into
a JS `Map`. `getPrettyClaims` turns only the top level of a namespace into a plain object, so a data
element whose value is an array of maps, like `driving_privileges`, stays an array of `Map`s.
EUDIPLO then stores the session's `credentials` with `JSON.stringify`, which writes each `Map` as
`{}`. The keys and values are gone before the middleware reads the session. The other mDL elements
survive because they are strings, `DateOnly` (whose `toJSON` gives `YYYY-MM-DD`) or `Uint8Array`
(written as `{"0": …}`, which the middleware already turns into base64).

**Confidence: high.** The chain is confirmed by EUDIPLO's v9.0.0 source and by running the pinned
library, and it gives exactly the observed output. The live capture asked for in "To find out" §1
was not made: EUDIPLO keeps no raw `vp_token` on the session (its columns hold only the stringified
`credentials` and an `outcome`), and this assessment had no wallet or EUDIPLO credentials.

**Does the credential have an `issue_date` per class, and one for B?**

- **Test mDLs from `scripts/issue_test_credentials`: yes.** `mdl_values()`
  (`backend/scripts/issue_test_credentials/credentials.py:143-149`) issues
  `{vehicle_category_code, issue_date}` for every class. Every test person holds at least AM, B
  and L (`person.py:289`), all with the date the B test was passed, and the decoded maps hold both
  keys (see the reproduction). The three observed entries fit that minimum set exactly, which
  suggests the shared mDL was one of these test credentials.
  [NEEDS CLARIFICATION: confirm that the shared mDL was issued by the script.]
- **Date encoding.** The script issues dates as text strings (`"YYYY-MM-DD"`), not as ISO `full-date`
  (tag 1004) (`credentials.py:7-8`). Both give `"YYYY-MM-DD"` after a fix: a string stays as is, and
  a `DateOnly` serialises to the date.

**Step 4 of the report** ("no per-class issue date") therefore doesn't apply.

## Proposed Remediation

**Preferred: fix EUDIPLO, and lock in the middleware's side with a test, a warning and the docs.**

1. **EUDIPLO (outside this repository)**: open an issue with a PR on `github.com/EUDIPLO/eudiplo`,
   and deploy the fixed version, or a patched build, on the hosted instance. In
   `MdocverifierService.verify`, normalise each claim value before merging it:

   ```ts
   const toPlain = (value: unknown): unknown =>
       value instanceof Map
           ? Object.fromEntries([...value].map(([k, v]) => [String(k), toPlain(v)]))
           : Array.isArray(value) ? value.map(toPlain) : value;
   // getPrettyClaims(ns) → Object.fromEntries(Object.entries(nsClaims).map(([k, v]) => [k, toPlain(v)]))
   ```

   This was checked with `@owf/cose@0.4.0`. It produces
   `[{"vehicle_category_code":"B","issue_date":"2003-05-12"},{"vehicle_category_code":"BE","issue_date":"2010-07-01","expiry_date":"2030-07-01","codes":[{"code":"96","sign":"<=","value":"4250"}]}]`,
   and leaves top-level dates (`"2015-04-01"`) and binary values (`{"0":255,…}`) as they are today.
   It must recurse into values, not just the outer object: a first attempt that only normalised
   the outer object left the entries empty. The OID4VP, DC API and ISO 18013-7 paths all go
   through this verifier, so the session store, `GET /api/session/{id}` and the webhooks are all
   fixed at once.

2. **Middleware (this repository, `/speckit-bug-fix`)**. No conversion change is needed, because
   `json_value()` already gives the expected output once EUDIPLO sends the content. Instead:
   - Add regression tests (see below) that pass a real-shaped `driving_privileges` through
     `extract_documents`. They lock in that nothing in the middleware drops nested keys or turns
     dates into anything other than ISO strings.
   - Detect the loss. In `extract_documents`, when an mdoc field's value is a non-empty list in
     which every entry is an empty object, log a warning by field key and request id, never the
     value: for example, "the shared mdl's driving_privileges entries arrived without content". It
     follows the existing missing-value warning (`documents.py:67`). Operators then see when an
     EUDIPLO without the fix is in use.
   - Record the finding in the docs:
     - `specs/001-servicebw-eudi-middleware/research.md` R19 item 4, row "mdoc binary and date
       values" (now partly settled): top-level `full-date` → `"YYYY-MM-DD"`, `bstr` →
       `{"0": …}` (handled), nested maps → `{}` (lost in EUDIPLO ≤ 9.1.0).
     - `docs/EUDIPLO.md`: a pitfall row for the same.
     - `contracts/eudiplo-usage.md:95-99`: a note next to "mdoc claims of all namespaces are
       merged".
   - Mark `tests/helpers.py`'s `SHARED_CREDENTIALS` as showing a fixed EUDIPLO, or add a second
     fixture with EUDIPLO 9.0.0's actual `[{}, …]` output for the warning test.

3. **Consumer (outside this repository)**: correct the cause in `sk-proto-1`'s `middleware-api.md`
   §4 item 3. "Class B since" stays a manual field until the hosted EUDIPLO has the fix.

**Alternatives**:

- **Patch `@owf/mdoc`'s `getPrettyClaims`** to return plain JSON-able values, upstream at OWF or
  locally through EUDIPLO's `patches/` directory (pnpm patch). This fixes every caller of the
  library, but needs a library release or a patch that has to be maintained, and EUDIPLO would
  still have to update its dependency. Worth suggesting in the upstream issue; the EUDIPLO-side
  normaliser is faster.
- **The middleware decodes the DeviceResponse itself.** Rejected: EUDIPLO neither stores nor
  exposes the raw `vp_token` (the session columns hold only `credentials` and `outcome`).
  Re-implementing mdoc verification in the middleware would duplicate EUDIPLO's job.
- **Change the test issuer's encoding**, for example a flat string per class. Rejected: it isn't
  ISO/IEC 18013-5, wallets may reject it, and real mDLs would still lose their content.
- **Deliver `null` instead of `[{}, …]`** while the content is lost. This is more honest ("no
  value"), but it changes what the consumer sees, and the consumer contract already describes
  `[{}, {}, {}]`. Optional; ask before doing it.

**Files likely to change** (this repository):

- `backend/app/services/documents.py` (the warning only)
- `backend/tests/unit/test_documents.py`
- `backend/tests/helpers.py` (comment or second fixture)
- `specs/001-servicebw-eudi-middleware/research.md`, `docs/EUDIPLO.md`,
  `specs/001-servicebw-eudi-middleware/contracts/eudiplo-usage.md`

**Tests to add or update**:

- `test_documents.py`: an mDL with a real-shaped `driving_privileges` is delivered unchanged. Use
  `[{"vehicle_category_code": "AM", "issue_date": "2003-05-12"}, {"vehicle_category_code": "B", "issue_date": "2003-05-12", "expiry_date": "2033-05-11", "codes": [{"code": "96", "sign": "<=", "value": "4250"}]}, {"vehicle_category_code": "L", "issue_date": "2003-05-12"}]`.
  Assert the exact value, so every entry keeps `vehicle_category_code` and its dates stay ISO
  strings.
- `test_documents.py`: `driving_privileges` as `[{}, {}, {}]`, which is EUDIPLO 9.0.0's actual
  output, logs one warning that names the field key and the request id and contains no value.
  The delivered value is whatever is decided above (unchanged by default).
- After the EUDIPLO fix is deployed, a live check: research T081 / quickstart V-runs, and sk-proto-1
  quickstart 12.2 showing "Class B since" filled from the wallet.

## Risks & Considerations

- **The real fix depends on EUDIPLO.** Until the hosted instance runs a fixed EUDIPLO, the report's
  "Done when" can't be met, whatever the middleware does. How long upstream takes is unknown.
- **Shares completed before the fix stay empty**: EUDIPLO has already stored `{}`. The citizen has
  to share again.
- **The EUDIPLO normaliser must leave non-map values alone**: `Uint8Array`, which the middleware
  base64-encodes from its `{"0": …}` / Buffer JSON forms, and `DateOnly` / `Date`, whose `toJSON`
  gives ISO strings. Map keys can be integers in some namespaces, hence `String(k)`.
- **DCQL `values` checks** run on the merged claims. mdoc claim paths have two segments, so
  normalising nested values doesn't change what they compare.
- **Dates after the fix**: a `tdate` (tag 0) in a privilege would arrive as
  `"2003-05-12T00:00:00.000Z"`, not `"YYYY-MM-DD"`. The consumer contract accepts a date-time and
  uses its date part. The middleware could normalise it, but no evidence calls for that.
- **Personal data**: the new warning must name only the field key and the request id (CLAUDE.md
  logging rules). Any live capture made for step 1 of the report holds personal data and must be
  redacted and not committed.
- **Test fixtures** still describe an ideal EUDIPLO. Until T081 runs against the hosted instance,
  other mdoc value shapes are unverified too.

## Open Questions

- [NEEDS CLARIFICATION: Which wallet app and version made the shares? The report leaves
  `<app and version>` blank. It doesn't change the cause, but it belongs in the record.]
- [NEEDS CLARIFICATION: Was the shared mDL issued by `scripts/issue_test_credentials`? The three
  entries match its minimum AM/B/L set; if so, the per-class `issue_date` is known to exist.]
- [NEEDS CLARIFICATION: Who operates `eudiplo.faro.dpschool.app`, and can they deploy a patched
  EUDIPLO build before an upstream release? Or should the team only open the upstream issue/PR
  and wait?]
- [NEEDS CLARIFICATION: While EUDIPLO loses the content, should the middleware keep delivering
  `[{}, …]`, which the consumer contract already describes, or deliver `null`?]

## Research sources (not from the report)

The report contains no URL, so the URL trust policy didn't apply. For transparency, these public
sources were read during the assessment:

- EUDIPLO source at tag `v9.0.0`, from a local clone made earlier.
- `raw.githubusercontent.com/EUDIPLO/eudiplo/{v9.1.0,main}/…/mdocverifier.service.ts`, and the
  `pnpm-lock.yaml` of `main`.
- `api.github.com/repos/EUDIPLO/eudiplo/releases` and the issue search API.
- `registry.npmjs.org` tarballs of `@owf/mdoc` 0.8.0 and 0.8.1 and `@owf/cose` 0.4.0 and 0.4.1,
  unpacked and installed in the session scratchpad with `--ignore-scripts`. Nothing went into the
  repository.
