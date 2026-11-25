# Integrating your application

How an application requests documents from a person's EUDI Wallet through Konnekt. It takes two
HTTP calls and no SDK: your application never speaks the wallet's protocols.

1. Your team creates a form connection in Konnekt and publishes it. It names the documents and
   fields to ask for, and optionally the rules they must meet.
2. Your application calls the connection's **request link**. Konnekt answers with a link and a QR
   code that open the wallet, and with a reference.
3. Your application shows the link or the QR code. The person opens the wallet and shares.
4. Your application calls the **result link** with the reference until the request has ended. The
   answer then holds the shared fields and the evaluation of the rules.

Konnekt was first built for serviceBW forms and the DO.IT team of the City of Stuttgart. The
other documents, the settings and the code still use those names: "serviceBW" there is the
application that calls these links, and "DO.IT" the team that runs Konnekt. They also call the
request link the trigger URL and the result link the pull URL.

## What you need

- **A published form connection.** Its page in Konnekt lists the links under "Links for your
  service": one request link, and one result link for each variant. A draft has no links, and a
  scheduled connection's links work from its start date.
- **Access from your server.** The links take no credentials: the network restricts them instead.
  In production, nginx forwards `/api/connect/` only from the address ranges in
  `SERVICEBW_ALLOWED_CIDRS` and answers `403` to everyone else
  ([DEPLOYMENT.md](DEPLOYMENT.md)). So the calls come from your application's server, never from
  the person's browser.

The links start with the installation's `CONNECTION_BASE_URL`. The examples use
`https://konnekt.example.org`. The times this document names (10 minutes, 60 seconds, 30 minutes,
7 days) are the defaults, which an installation can change
([ARCHITECTURE.md](ARCHITECTURE.md#environment-variables)).

## 1. Start a request

```bash
curl -X POST https://konnekt.example.org/api/connect/<form-connection-id>/requests
```

The request needs no body, and one that is sent is ignored. Every call starts a new, independent
request. The answer is `201 Created`:

```json
{
  "data": {
    "reference": "q3Vh1x0d6vTt0m2T5kQx0b9cWl7l8sZp4o2YwKxR1aE",
    "status": "pending",
    "wallet_link": "openid4vp://?client_id=x509_hash%3A…&request_uri=…",
    "qr_code_link": "openid4vp://?client_id=x509_hash%3A…&request_uri=…%2Fno-redirect",
    "qr_code": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA…",
    "expires_at": "2026-10-07T10:10:00Z"
  },
  "message": "Document request started"
}
```

| Field | Meaning |
|---|---|
| `reference` | The key to this request's result. Keep it on your server and out of your logs |
| `wallet_link` | Opens the wallet when the person taps it on the phone that holds the wallet |
| `qr_code` | A PNG data URI, ready for `<img src="…">`, for a wallet on another device |
| `qr_code_link` | The link that the QR code encodes, if you draw the code yourself |
| `expires_at` | When the request expires if the person hasn't finished: 10 minutes after the call |

## 2. Show the link or the QR code

Show `wallet_link` as a link or a button for people who fill in your form on their phone, and
`qr_code` for those on another device. The wallet shows the person which documents and fields
are asked for, all in one step, and the person shares or declines.

## 3. Get the result

```bash
curl https://konnekt.example.org/api/connect/<form-connection-id>/requests/<reference>
```

While the person hasn't finished, the answer is `200 OK` without documents:

```json
{
  "data": {
    "reference": "q3Vh1x0d6vTt0m2T5kQx0b9cWl7l8sZp4o2YwKxR1aE",
    "status": "pending",
    "expires_at": "2026-10-07T10:10:00Z",
    "documents": null,
    "evaluation": null
  },
  "message": null
}
```

Once the person has shared, it holds the documents and the evaluation. This form connection asks
for four fields of the personal ID and three of the driving licence, and has two rules:

```json
{
  "data": {
    "reference": "q3Vh1x0d6vTt0m2T5kQx0b9cWl7l8sZp4o2YwKxR1aE",
    "status": "completed",
    "expires_at": "2026-10-07T10:10:00Z",
    "documents": [
      {
        "document_type": "pid",
        "label": "Personal ID",
        "fields": [
          { "key": "family_name", "label": "Family name", "value": "Mustermann" },
          { "key": "given_name", "label": "Given name", "value": "Erika" },
          { "key": "birthdate", "label": "Date of birth", "value": "1984-01-26" },
          { "key": "address_locality", "label": "City or town", "value": "Stuttgart" }
        ]
      },
      {
        "document_type": "mdl",
        "label": "Driving licence",
        "fields": [
          { "key": "expiry_date", "label": "Expiry date", "value": "2034-03-01" },
          { "key": "document_number", "label": "Licence number", "value": "B072RRE2I55" },
          {
            "key": "driving_privileges",
            "label": "Licence classes",
            "value": [{ "vehicle_category_code": "B", "issue_date": "2019-03-01" }]
          }
        ]
      }
    ],
    "evaluation": {
      "branch": { "id": "a83e5d0c-3f4b-4f6e-9b84-0e7f3c1d9a21", "name": "Standard" },
      "met": false,
      "results": [
        { "id": "rule-1", "type": "rule", "name": "At least 21 years old", "group": null, "outcome": "met" },
        { "id": "rule-2", "type": "rule", "name": "Class B for 10 years", "group": null, "outcome": "not_met" }
      ],
      "messages": [
        { "id": "rule-2", "message": "You must have held class B for at least 10 years." }
      ]
    }
  },
  "message": null
}
```

### The statuses

| `status` | Meaning | Final |
|---|---|---|
| `pending` | Waiting for the person | no |
| `completed` | The person shared, and the documents passed verification | yes |
| `declined` | The wallet reported that the person declined or couldn't provide the documents, or answered with another error and shared nothing | yes |
| `verification_failed` | A document was not accepted: an invalid signature, an untrusted issuer, expired, revoked, or not presented by its holder | yes |
| `expired` | The person didn't finish before `expires_at` | yes |
| `unavailable` | The request was cancelled because its form connection was deactivated or deleted while it was open | yes |

Every status but `completed` comes with `"documents": null` and `"evaluation": null`.

### The documents

- `documents` holds the fields the form connection names, and nothing else the wallet holds.
- Identify a document by `document_type` and a field by `key`: neither ever changes. The `label`
  values are for display, and always English.
- Values keep their JSON type. Dates are ISO 8601 strings, and binary values such as a portrait
  are base64 strings.
- **They are handed out once.** The first answer that holds them is the delivery. For 60 seconds
  after it, the result link answers with them again, so that you can call again if an answer got
  lost. After that it answers `completed` with `"documents": null`. Konnekt itself stores none of
  the shared data: it reads the documents from EUDIPLO when you call, and they are deleted there
  30 minutes after the person shared at the latest.
- Konnekt can't know who fills in your form. Check that the documents belong to the person your
  application expects.

### The evaluation

`evaluation` tells you whether the shared documents meet the form connection's rules. It comes
and goes with `documents`, and never holds a field's value.

| Field | Meaning |
|---|---|
| `branch` | The variant whose result link you called: its `id`, which never changes, and its name |
| `met` | Whether the variant's rules are met overall. Without rules it is `true`, with empty `results` and `messages` |
| `results` | Every rule and group of the variant, the top level first and each group's members after it |
| `results[].id` | `rule-{n}` or `group-{n}`. It never changes, also when the rule is renamed, and is never used again |
| `results[].type` | `rule` or `group` |
| `results[].name` | The team's name for it, which can change: for display only |
| `results[].group` | The `id` of the group that holds it, or `null` at the top level |
| `results[].outcome` | `met`, `not_met` or, for a rule, `not_checked`: the value was missing or couldn't be read. `not_checked` counts as not met |
| `messages` | The messages to show the person, written by the team in Konnekt, each with the `id` of its rule or group. Empty when `met` is `true` |

The documents are delivered whether or not the rules are met, and the status is `completed` in
both cases. Your application decides what follows, for example to show the messages and not
accept the application.

A request is evaluated with the rules its form connection had when the request was started, even
if the team changes them before the person shares.

### How to call

- Call the result link every 2 seconds while the status is `pending`, and stop when it is final.
- Don't give up before `expires_at`: Konnekt reports `expired` itself.
- Not every wallet reports a decline. When the wallet sends nothing, or the person just closes
  it, the request stays `pending` until it expires. So don't tell the person that sharing was
  declined only because time ran out.

## Variants

A form connection can have variants: other rules for the same form, such as stricter ones for one
group of applicants. Each variant has a result link of its own, and the request link is one for
all:

```bash
curl https://konnekt.example.org/api/connect/<form-connection-id>/branches/<variant-id>/requests/<reference>
```

Your application knows which variant applies, for example from what the person entered earlier,
and calls that variant's result link. Every variant answers with the same status and documents:
only `evaluation` differs. The documents are still handed out once, through whichever result
link is called first, and the 60 seconds count for all of them.

The link without `branches/` is the result link of the main variant, called "Standard" until the
team renames it. An application that knows nothing about variants uses that one.

## Errors

An error's body is `{"error": …, "message": …}`, in English. A `5xx` answer also carries an
`error_id` and says nothing about the cause: give the `error_id` to the team that runs Konnekt,
who find the cause in the log under it.

| Status | `error` | When | What to do |
|---|---|---|---|
| `403` | (nginx's own answer, not JSON) | Your server's address is not on the allow-list | Ask the team that runs Konnekt to add it |
| `404` | `Not found` | Unknown form connection or reference; a reference of another form connection; a variant that doesn't exist; a request that ended more than 7 days ago | Stop calling |
| `409` | `unavailable` | The form connection is deactivated, deleted, scheduled for a later date or still a draft; or the variant was deleted | Stop calling. No request is started |
| `409` | `branch_added_later` | The variant was added after this request was started | Start a new request |
| `500` | `Internal server error` | Something failed in Konnekt, such as the evaluation. Nothing was handed out | Call again |
| `502` | `Upstream error` | EUDIPLO couldn't start the request or hand out the documents. Nothing was handed out | Call again |
| `503` | `Not configured` | The installation's EUDIPLO settings are incomplete | Tell the team that runs Konnekt |

```json
{
  "error": "unavailable",
  "message": "This form connection is deactivated or deleted"
}
```

## Trying it on your machine

Start Konnekt as the [README](../README.md#quick-start) describes. In development the API
listens on `http://localhost:3000` without an allow-list, so `curl` reaches the links directly.
Publishing a form connection and starting a request need an EUDIPLO instance
([EUDIPLO.md](EUDIPLO.md#what-the-tenant-needs)), and sharing needs a wallet that holds the
documents ([TEST-CREDENTIALS.md](TEST-CREDENTIALS.md)).

## More details

- The contracts these links were built to, with the order of the checks and how each kind of
  condition is evaluated:
  [the request and result links](../specs/001-servicebw-eudi-middleware/contracts/integration-api.md),
  [the evaluation and the variants](../specs/002-connection-rules/contracts/integration-api.md)
  and [drafts](../specs/005-connection-drafts/contracts/integration-api.md). Where they differ
  from this document, this document describes what Konnekt does today.
- How the backend serves them:
  [ARCHITECTURE.md](ARCHITECTURE.md#servicebws-connection-urls).
- The documents and fields a form connection can ask for, and what the wallets hold:
  [COMPATIBILITY.md](COMPATIBILITY.md).
