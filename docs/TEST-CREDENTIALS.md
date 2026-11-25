# Test credentials for a test wallet

Testing the middleware needs a wallet that holds a PID and a mobile driving licence from an
issuer the trust list trusts. The developer script `scripts/issue_test_credentials` (in
`backend/`) issues both from the tenant itself, with the data of a made-up person. What the
tenant needs for the middleware itself is in [EUDIPLO.md](EUDIPLO.md#what-the-tenant-needs).
The script:

1. It checks that the tenant has a key chain that signs credentials (usage `attestation`) and,
   with `EUDIPLO_TRUST_LIST_ID` set, that this trust list trusts it.
2. It creates or updates the credential configurations `test-pid` (SD-JWT VC, `vct`
   `urn:eudi:pid:1`) and `test-mdl` (mdoc, `org.iso.18013.5.1.mDL`). They hold every field of
   the catalog, so the wallet can answer any request the middleware builds.
3. It makes up a German person with [Faker](https://faker.readthedocs.io) and creates a
   pre-authorized-code offer with their data, which works once within 15 minutes. The person
   lives in Stuttgart, at a real street with its real postcode, so that Stuttgart's forms accept
   the address; with `--any-town` they live in one of a few German towns instead, on a street
   Faker makes up.
4. It shows the offer as a QR code and a link, and waits until the wallet has fetched it.

**Once per tenant**, in the EUDIPLO console or API:

- an API client with the roles `issuance:manage` and `issuance:offer`, separate from the
  middleware's client, which has no issuance role. Its id and secret go into
  `EUDIPLO_ISSUER_CLIENT_ID` and `EUDIPLO_ISSUER_CLIENT_SECRET` in `backend/.env`, next to
  `EUDIPLO_URL`;
- a key chain with the usage `attestation`, which signs the credentials;
- an entity for that key chain in the trust list `EUDIPLO_TRUST_LIST_ID`: an `internal` entity
  whose `issuerKeyChainId` is the key chain (its `revocationKeyChainId` can be the same one),
  or an `external` entity with the key chain's **root** certificate. A trust list with only the
  leaf certificate rejects the documents (`trust_chain_not_trusted`). The script warns when the
  entity is missing.

**Then**, from `backend/`:

```bash
uv run python -m scripts.issue_test_credentials                 # PID and driving licence
uv run python -m scripts.issue_test_credentials --document pid  # only the PID
uv run python -m scripts.issue_test_credentials --seed 4711     # the same person again, same day
uv run python -m scripts.issue_test_credentials --show-claims   # also print every claim
uv run python -m scripts.issue_test_credentials --any-town      # someone living outside Stuttgart
```

Scan the QR code with the wallet, or open the link on the phone. On a terminal with a light
background, save the code with `--qr-png FILE` and scan the image instead. `--no-wait` ends
without waiting for the wallet.

To test a form connection's rules (spec 002), issue documents on either side of a rule's
condition on purpose. `--birth-date YYYY-MM-DD` sets the person's date of birth in both
documents, together with the driving licence's `age_in_years` and `age_birth_year`.
`--licence-class CODE:ISSUE_DATE`, which can be repeated, gives the driving licence exactly
these classes, each held since its issue date, instead of made-up ones; the codes are the
middleware's licence classes (`AM`, `A1` … `T`). The rest of the person stays as the seed
makes it up. A date that isn't written `YYYY-MM-DD`, a date in the future, an unknown class and
a class given twice are refused. For example, against the rules "Date of birth is at least 21
years old" and "Licence class B – Issue date is at least 2 years ago" (quickstart.md V2 of
spec 002):

```bash
uv run python -m scripts.issue_test_credentials --birth-date 2001-01-01 --licence-class B:2020-03-01
uv run python -m scripts.issue_test_credentials --birth-date 2006-06-30 --licence-class B:2025-09-01
```

Good to know:

- The documents have no status list. With one, EUDIPLO 9.0 fails every strict check of an
  mDL ("Atleast one certificate is required to check the status of the mdoc"), so revocation
  can't be tested with them.
- The driving licence has no `issuing_jurisdiction`. ISO/IEC 18013-5 requires it to match the
  `stateOrProvinceName` of the issuer certificate, which EUDIPLO's certificates don't have, and
  wallets reject an mDL where the two differ. A form connection that asks for this field gets
  no answer from these test documents.
- EUDIPLO 9 issues an mdoc's claims with their JSON types: dates are text, not the CBOR dates of
  ISO/IEC 18013-5, and the portrait and signature are base64 text, not bytes.
- EUDIPLO before 10.1.0 loses the content of nested mdoc maps in presentation results: the
  middleware receives `driving_privileges` as `[{}, {}, …]`, one empty object per category.
  This affects real driving licences as well. EUDIPLO 9 with the team's patch delivers
  `driving_privileges` in full: check the EUDIPLO you use before relying on this field
  ([COMPATIBILITY.md](COMPATIBILITY.md#nested-fields-of-the-driving-licence)).
- The script prints the made-up person's data. The middleware itself never logs claims.
- With the tenant's own issuer on the trust list, every environment that uses this trust list
  accepts these test documents. Issue them only in a tenant for testing, or take the entity off
  the trust list before real citizens use the service.
