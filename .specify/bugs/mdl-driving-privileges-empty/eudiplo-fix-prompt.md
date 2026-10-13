# Fix: EUDIPLO loses nested mdoc claim values (`driving_privileges` arrives as `[{}, {}, {}]`)

You're working in the EUDIPLO repository (github.com/EUDIPLO/eudiplo). I run my own instance
(`eudiplo.faro.dpschool.app`, v9.0.0 at the last check; confirm with `.info.version` at
`/api/docs-json`) and can deploy a patched build. I need a small patch I can deploy now and offer
upstream later.

## The bug

A wallet presents an mdoc (`mso_mdoc`) containing a data element whose value holds a CBOR map. The
session's `credentials` then has every one of those maps replaced by `{}`. The main case is
`org.iso.18013.5.1` / `driving_privileges`, an array of DrivingPrivilege maps
`{vehicle_category_code, issue_date?, expiry_date?, codes?: [{code, sign?, value?}]}`.
`GET /api/session/{id}` and the webhooks return, for example:

```json
"driving_privileges": [{}, {}, {}]
```

Expected:

```json
"driving_privileges": [
  {"vehicle_category_code": "AM", "issue_date": "2003-05-12"},
  {"vehicle_category_code": "B", "issue_date": "2003-05-12"},
  {"vehicle_category_code": "L", "issue_date": "2003-05-12"}
]
```

Top-level strings, dates and binary values come through fine. This was seen on 2026-10-12 on the
hosted v9.0.0, with an mDL issued by a tenant of this same instance. A consumer (a middleware that
reads `GET /api/session/{id}`) needs the per-class `issue_date` to fill "Class B since".

## Root cause

This was checked against tag `v9.0.0` (commit `8f6abca`). The code is identical in `v9.1.0` and
`main`, and `@owf/mdoc` 0.8.1 / `@owf/cose` 0.4.1 behave the same way.

1. `@owf/cose` decodes CBOR with `mapsAsObjects: false` (`encoderDefaults` in its
   `dist/index.mjs`), so every CBOR map becomes a JS `Map`.
2. In `@owf/mdoc`, `IssuerSigned.getPrettyClaims(ns)` returns
   `Object.fromEntries(items.map(i => [i.elementIdentifier, i.elementValue]))`. Only the top level
   becomes a plain object. Each `elementValue` is passed on as decoded, so each DrivingPrivilege
   stays a `Map`.
3. `apps/backend/src/verifier/presentations/credential/mdocverifier/mdocverifier.service.ts` (about
   lines 136–152, in `verify`) merges `getPrettyClaims(ns)` into `claims` and `claimsByNamespace`
   without changing it.
4. `apps/backend/src/verifier/oid4vp/application/complete-presentation-response.ts` stores those
   claims in `session.credentials`. That is a `text` column with `EncryptedJsonTransformer`
   (`session.entity.ts`), whose `DataEncryptionService.encryptJson` calls `JSON.stringify`, and
   `JSON.stringify` writes a `Map` as `{}`. The data is lost when the session is written, and
   nothing later can recover it.

Repro without a wallet: run it from `apps/backend` after `pnpm install`. `@owf/mdoc` re-exports the
CBOR helpers.

```js
import { cborEncode, cborDecode, DateOnly } from "@owf/mdoc";
const issued = {
  issue_date: "2015-04-01",
  driving_privileges: [
    { vehicle_category_code: "AM", issue_date: "2003-05-12" },
    { vehicle_category_code: "B", issue_date: new DateOnly("2003-05-12") },
  ],
};
const claims = Object.fromEntries(
  Object.entries(issued).map(([k, v]) => [k, cborDecode(cborEncode(v))]),
);
console.log(claims.driving_privileges.map((e) => e.constructor.name)); // [ 'Map', 'Map' ]
console.log(JSON.stringify(claims)); // ..."driving_privileges":[{},{}]
```

## The fix

In `MdocverifierService.verify`, turn every claim value into plain JSON-able data before merging it:

```ts
/** Turns the Maps of decoded CBOR into plain objects, recursively, so claims survive JSON. */
function toJsonClaim(value: unknown): unknown {
    if (value instanceof Map) {
        return Object.fromEntries(
            [...value].map(([key, item]) => [String(key), toJsonClaim(item)]),
        );
    }
    if (Array.isArray(value)) {
        return value.map(toJsonClaim);
    }
    return value;
}

// in verify(), in the loop over the namespaces:
const nsClaims = issuerSigned.getPrettyClaims(ns);
if (nsClaims) {
    const plainClaims = Object.fromEntries(
        Object.entries(nsClaims).map(([key, value]) => [key, toJsonClaim(value)]),
    );
    claimsByNamespace[ns] = plainClaims;
    Object.assign(claims, plainClaims);
}
```

Constraints:

- **Recurse into each claim value.** Calling the normaliser on the outer claims object does nothing,
  because that object is a plain object, not a `Map`. I verified this: that variant still produces
  `[{}, {}]`.
- **Leave anything that isn't a `Map` or an array alone**:
  - `Uint8Array` (portrait, signature): JSON gives `{"0": …, "1": …}`, and consumers rely on that
    form.
  - `DateOnly` (tag 1004): its `toJSON` gives `"YYYY-MM-DD"`.
  - `Date` (tag 0): its `toJSON` gives an ISO date-time.
  - cbor-x `Tag` objects and primitives.
  - Don't change how binary or date values serialise.
- **Map keys may be integers** in some namespaces, hence `String(key)`.
- **Keep the change minimal.** Leave the issuer side, the DCQL claim checks and the device-request
  building alone:
  - `buildDeviceRequest` only uses the keys of `claimsByNamespace`.
  - `evaluateMdocClaimSelection` compares top-level element values, because mdoc claim paths have
    two segments. Confirm that it still behaves the same.
- **Never log claim values**: they are personal data.
- **Check for other paths** that turn decoded mdoc data into claims: grep `getPrettyClaims`,
  `elementValue` and `issuerNamespaces` in `apps/backend/src`. In v9.0.0 this verifier is the only
  place. OID4VP, the DC API and ISO 18013-7 (`iso18013.service.ts`) all go through it; confirm this
  for the version you patch.

## Tests

- In `mdocverifier.service.spec.ts` (vitest), test the normaliser:
  - a `Map` nested in an array becomes a plain object, nested `codes` included;
  - `Uint8Array`, `DateOnly` and `Date` come back as the same instances;
  - `JSON.parse(JSON.stringify(...))` keeps `vehicle_category_code`, `issue_date`, `expiry_date`
    and `codes`.
- If the existing helpers make it practical, also test `verify()` itself: issue an mDL with
  `driving_privileges` through `@owf/mdoc`'s `Issuer` (see how the mdoc issuer service or the
  existing specs build one), present it, and assert
  `JSON.parse(JSON.stringify(result.claims)).driving_privileges` equals the issued entries.
- Run the backend's unit tests (`vitest run` in `apps/backend`) and the linter (biome). Report the
  results.

## Deploy and verify

- Base the patch on the tag I run (v9.0.0 unless `.info.version` says otherwise); it should apply
  to v9.1.0 unchanged. Make it a commit on its own branch, and tell me how to build and tag the
  image from the root `Dockerfile`.
- After the deploy, share a **fresh** mDL: sessions completed before the patch keep `{}`. Then check
  that the entries in `GET /api/session/{id}` → `credentials[].values[0].driving_privileges` have
  `vehicle_category_code` and `issue_date`.
- Draft an upstream issue and PR text for EUDIPLO/eudiplo. Mention that `@owf/mdoc`'s
  `getPrettyClaims` could also return plain values at the library level.

**Deliverables:**

- the diff;
- the test and lint results;
- the build and deploy steps;
- the upstream issue text.
