# Compatibility and known limits

What Konnekt was tested with, why its catalog is wider than any one country's wallet, and what
does not work yet. The wallets, EUDIPLO and the German ecosystem all change quickly: every
statement here is as of November 2026.

## Tested with

- **EUDIPLO 9.** Konnekt was built and tested against EUDIPLO 9, release 9.0.0; the team's hosted
  instance ran a 9.0.0 build with one patch
  ([Nested fields of the driving licence](#nested-fields-of-the-driving-licence)). It was not
  tested against EUDIPLO 10 or later: Konnekt very likely works with them, but we can't
  guarantee full compatibility. [EUDIPLO.md](EUDIPLO.md) describes the API as verified for
  9.0.0, and its last section says what to check when an instance behaves differently.
- **The Paradym wallet, with test documents.** Konnekt works with Paradym: the live runs used
  it, holding a PID and a driving licence issued by the EUDIPLO tenant itself
  ([TEST-CREDENTIALS.md](TEST-CREDENTIALS.md)).
- **Not tested**: the German EUDI Wallet with a real PID
  ([The German EUDI Wallet](#the-german-eudi-wallet)), and production issuers.

## The catalog offers every field, not only one country's

The catalog (`backend/app/catalog.py`) holds its two documents in full: the PID with 25 data
items, from the EU's PID rulebook, and the mobile driving licence with 31, from ISO/IEC 18013-5.
It accepts the PID under the European type `urn:eudi:pid:1` and under Germany's
`urn:eudi:pid:de:1`.

Not every wallet holds all of these. The German PID, for example, has no date of expiry (spec
001, research R19). The catalog offers them all the same, on purpose: Konnekt was built for the
City of Stuttgart, but it is not limited to Germany. The catalog follows the European
definitions of the documents rather than one member state's wallet, so that an administration
anywhere in Europe can use Konnekt with its country's wallet as it is, and so that a field a
wallet starts to hold later needs no new release.

What follows from this:

- **Choose the fields your citizens' wallets hold.** A wallet answers a request in full or not at
  all. A connection that asks for a field the citizen's document lacks gets nothing: the citizen
  can't share any of the documents.
- **Konnekt does not mark such fields.** The documents step shows every field alike. A note
  under the data the German wallet lacks was considered and left out (2026-11-22), so the team
  that sets up a connection has to know what its citizens' wallets hold.
- **Two kinds of field are left out** (spec 001, research R4): the driving licence's elements
  whose names vary by issuer (`age_over_NN`, `biometric_template_xx`), and the PID's technical
  attributes (`trust_anchor`, `attestation_legal_category`).

## The German EUDI Wallet

Konnekt has not been run end to end against the German EUDI Wallet (d-you) with a real PID, and
it does not yet work in full with the German ecosystem. The reason is the first point below; the
second is what the EUDIPLO tenant needs once the first is solved.

### Certificates from the EUDI Hub can't be requested on demand yet

In the German ecosystem a verifier gets its certificates from the EUDI Hub, the ecosystem's
registrar: the access certificate that signs its requests, and a registration certificate for
each presentation configuration, which states what the verifier may ask for. The German wallet
refuses a request that carries no registration certificate.

EUDIPLO can request both from the EUDI Hub, but only by hand, one at a time. The EUDI Hub's API
accepts only tokens issued to its own portal and "offers no accounts for other software"
(EUDIPLO's documentation, "EUDI Hub", read on 2026-11-25). A person therefore copies a token
from the portal, valid for a few minutes, into EUDIPLO for every certificate. A registration
certificate belongs to one configuration's query, is not renewed automatically, and has to be
requested again when the query changes.

Konnekt can't work that way. It creates a presentation configuration for every revision of
every form connection by itself, when a team member publishes; it sets no registration
certificate on them (spec 001, research R19) and has no way to ask for one. Against the German
ecosystem, every published revision would need a certificate that someone requests by hand in
EUDIPLO, and until it has one the German wallet refuses its requests. The access certificate is
not the obstacle: the tenant needs only one.

What we expect: EUDIPLO 9's registrar integration already worked with the German sandbox, so
once the EUDI Hub opens its API to other software, EUDIPLO will most likely request these
certificates on demand. Konnekt may then have to ask for a certificate with each configuration
it creates, and EUDIPLO's overasking check will require every query to match its certificate
exactly ([EUDIPLO.md](EUDIPLO.md), §10). Until then, Konnekt works in full with wallets that
accept a request without a registration certificate, such as Paradym.

### Trusting the German PID provider

EUDIPLO checks the issuer of every shared document against the tenant's trust list
(`EUDIPLO_TRUST_LIST_ID`), and the document's status list against the revocation certificate of
the same entity. For the German sandbox, research on 2026-11-09 (the sandbox's lists and
EUDIPLO's source of that day) found:

- **The sandbox publishes what is needed.** Its trust lists are at
  <https://trustlists-sandbox.eudihub.de/>, in the format EUDIPLO reads (ETSI TS 119 602 "LoTE",
  signed as a JWT). The PID list, `pid-provider.jwt`, names an issuance and a revocation
  certificate for Bundesdruckerei, the PID provider.
- **Status lists have a CA of their own.** Since the PID provider's release 1.33.0 (19 August
  2026), PIDs are signed under `Deutschland PID-Signer Test CA 1-26-1 2026` and their status
  lists under `Deutschland PID-Status-List-Signer Test CA 1-26-2 2026`, both from D-Trust. An
  entity with the issuer's certificate in both places fails the status check of a current PID.
- **The tenant's list needs exactly that pair.** A trust list managed in EUDIPLO, the kind
  Konnekt's requests name, requires a revocation certificate for every entity. Add an external
  entity with the two certificates from the sandbox's list, and update it by hand when Germany
  rotates them.
- **Reading the sandbox's list directly is not possible with Konnekt as it is.** EUDIPLO can
  take the list by its URL, which follows rotations by itself, but Konnekt's requests name a
  managed list by its id (`backend/app/services/dcql.py`): that would need a change to the
  request builder.

None of this was tested with a real PID, which takes a German identity card. Two points stay
open: EUDIPLO requires the certificate path of a PID and of its status list to end exactly at a
listed certificate, and the listed ones are intermediates; and only the sandbox was looked at,
not a production trust list.

## Nested fields of the driving licence

EUDIPLO before 10.1.0 loses the content of nested values in a driving licence (mdoc):
`driving_privileges`, the licence classes with their dates, arrives as `[{}, {}, …]`, one empty
object per class. EUDIPLO's verifier keeps the nested CBOR maps as JavaScript `Map`s, which are
stored as `{}`. This affects every driving licence, whichever wallet or issuer it comes from.
The licence's other fields are not affected, and neither are the PID's nested fields, such as
the address.

- **EUDIPLO 9: apply the team's patch.**
  [`patches/eudiplo-9.0.0-mdoc-nested-maps.patch`](patches/eudiplo-9.0.0-mdoc-nested-maps.patch)
  turns the nested maps into plain objects before the claims are stored (`toJsonClaim`, used in
  `MdocverifierService.verify`), and comes with its tests. It is the one change the team's
  hosted instance ran on top of 9.0.0, which has delivered the classes in full since 2026-10-19.
  It applies to EUDIPLO's tags `v9.0.0` and `v9.1.0`, and not to 10.x. In a checkout of EUDIPLO
  at one of the two tags:

  ```bash
  git am <konnekt>/docs/patches/eudiplo-9.0.0-mdoc-nested-maps.patch
  ```

  Then build and deploy EUDIPLO as usual. The patch was never sent to EUDIPLO, and there is no
  9.x release with a fix. The analysis behind it is in
  [`.specify/bugs/mdl-driving-privileges-empty/`](../.specify/bugs/mdl-driving-privileges-empty/).
- **EUDIPLO 10.1.0 and later have a fix of their own** (commit `532a70b`, 22 November 2026).
  10.0.0 doesn't have it, and neither does any 9.x release. We checked it on 2026-11-25 by
  reading EUDIPLO's code, without running it: it converts nested maps at any depth, the
  converted value is what the session stores and the webhook sends, and the claims are keyed as
  in 9.0.0. For a driving licence that follows ISO/IEC 18013-5 it should deliver the same JSON
  as the team's patch. The two differ only for values such a licence doesn't hold: the patch
  rejects a map key that is neither text nor an integer, for example, where EUDIPLO converts
  it. Konnekt was not run against EUDIPLO 10, so this very likely works, but we can't
  guarantee it.
- **Without a fix**, Konnekt delivers the value as it arrives and logs one warning that names
  the request, the document and the field, never a value
  (`backend/app/services/documents.py`). A rule on a licence class then has nothing to read, and
  its outcome is `not_checked`.
- **Before you rely on licence classes**, check the EUDIPLO you run: request
  `driving_privileges` once with a test licence ([TEST-CREDENTIALS.md](TEST-CREDENTIALS.md)) and
  look at what the pull delivers.
