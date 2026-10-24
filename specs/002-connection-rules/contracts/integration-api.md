# Contract: serviceBW integration API, with rules and branches

**Consumers**: serviceBW. **Requirements**: FR-009 to FR-018, FR-025 to FR-027; US1 scenarios 4, 5
and 7, US2, US3 scenarios 7 to 9. **Decisions**: research R3, R7, R8.

This extends spec 001's contract
([../../001-servicebw-eudi-middleware/contracts/integration-api.md](../../001-servicebw-eudi-middleware/contracts/integration-api.md)).
Everything it defines stays: the common rules (no credentials, the allow-list, the envelopes, the
`error_id` of `5xx` answers), the trigger URL, the statuses, delivery once with the 60-second
repeat window, and polling. **The only changes are one new field in the pull answer and a pull URL
for each branch other than the main branch.** A serviceBW form that ignores both keeps working
(FR-010, SC-005).

## URLs

| URL | Method | What changes |
|---|---|---|
| `{CONNECTION_BASE_URL}/api/connect/{form_connection_id}/requests` | `POST` | Nothing. One trigger URL per form connection starts requests for all of its branches (FR-025) |
| `{CONNECTION_BASE_URL}/api/connect/{form_connection_id}/requests/{reference}` | `GET` | The **main branch's** pull URL, unchanged (FR-018). Its answer gains `evaluation` |
| `{CONNECTION_BASE_URL}/api/connect/{form_connection_id}/branches/{branch_id}/requests/{reference}` | `GET` | **New**: the pull URL of every other branch. `branch_id` is fixed when the branch is added and never changes, also when it is renamed (FR-025) |

The management UI shows each pull URL labelled with its branch's name (FR-026). `{reference}` is
the request reference from the trigger answer, as in spec 001.

## Which branch serviceBW pulls

serviceBW's form knows which branch applies from what the applicant entered earlier, and pulls
through that branch's pull URL (spec Assumptions, "serviceBW's role"). For one request, every
branch that existed when the request was triggered answers with the **same status and documents**;
only `evaluation` differs (FR-025). Documents are handed out once: the first pull that returns
them, through any branch, starts the 60-second repeat window for all (spec Edge Case "The applicant
changes branch after sharing").

## Pull answer

### `200 OK`: completed, with documents

```json
{
  "data": {
    "reference": "q3Vh1x0d6vTt0m2T5kQx0b9cWl7l8sZp4o2YwKxR1aE",
    "status": "completed",
    "expires_at": "2026-10-07T10:10:00Z",
    "documents": [ "… exactly as in spec 001 …" ],
    "evaluation": {
      "branch": { "id": "a83e5d0c-3f4b-4f6e-9b84-0e7f3c1d9a21", "name": "Ambulance" },
      "met": false,
      "results": [
        { "id": "rule-4", "type": "rule", "name": "Lives in Stuttgart", "group": null, "outcome": "met" },
        { "id": "group-1", "type": "group", "name": "Group 01", "group": null, "outcome": "not_met" },
        { "id": "rule-1", "type": "rule", "name": "Rule 01", "group": "group-1", "outcome": "not_met" },
        { "id": "group-2", "type": "group", "name": "Sub-group 02", "group": "group-1", "outcome": "not_met" },
        { "id": "rule-5", "type": "rule", "name": "Rule 05", "group": "group-2", "outcome": "met" },
        { "id": "rule-3", "type": "rule", "name": "Rule 03", "group": "group-2", "outcome": "not_checked" }
      ],
      "messages": [
        { "id": "rule-1", "message": "You must be at least 21 years old." },
        { "id": "rule-3", "message": "You must have held class B for at least 3 years." }
      ]
    }
  }
}
```

### `200 OK`: any answer without documents

`pending`, `declined`, `verification_failed`, `expired`, `unavailable`, and `completed` after the
repeat window: `"documents": null` and `"evaluation": null`. The evaluation is delivered, repeated
and gone together with the documents (FR-017).

### `evaluation`

| Field | Meaning |
|---|---|
| `branch` | The branch whose pull URL was called: its `id` (the main branch's too) and its `name` as it was when the request was triggered. The name is a label for people; identify branches by `id` |
| `met` | Whether the branch's rules are met overall (FR-009). A branch without rules is always met |
| `results` | Every rule and group of the branch, in the order of its rules step, top level first with each group's members after it. Rules and groups that the branch removed aren't listed, nor groups dissolved in the branch (data-model.md, "Dissolution") |
| `results[].id` | The identifier: `rule-{n}` or `group-{n}`. Set when the rule or group was created; never changes, also when it is renamed or changed, and never reused within the form connection. A rule or group that a branch inherited from the main branch has the same identifier there (FR-010). Use it to tell results apart; DO.IT agrees their use with serviceBW from the details screen |
| `results[].type` | `rule` or `group` (a sub-group is a `group` inside a group) |
| `results[].name` | The team's name for it, which can change. For display and debugging only |
| `results[].group` | The identifier of the group or sub-group that contains it, or `null` at the top level |
| `results[].outcome` | `met`, `not_met`, or for a rule `not_checked`: the value was missing or couldn't be read for the condition, such as a date of birth with only a year (FR-014). `not_checked` counts as not met |
| `messages` | The error messages to show the citizen, empty when `met` is `true` (FR-011). For each top-level item that isn't met: a rule's message; a group's own message if it has one, otherwise, in the same way, the messages of its members that aren't met. Each comes with the `id` of the rule or group it belongs to |

**How conditions are evaluated** (research R7):
- Dates count by the **calendar date in Germany** at the moment the citizen shared, whatever the
  time zones of the wallet or serviceBW (FR-012). "At least 21 years old" is met from the 21st
  birthday on; a 29 February birthday reaches the next age on 1 March in other years.
- Text comparisons ignore spaces at the start and end, and ignore letter case unless the rule
  respects it (FR-013).
- A rule on a licence class's issue or expiry date is `not_met`, not `not_checked`, when the licence
  doesn't hold that class (FR-014).

**What it never contains**: the values of the fields it checked (FR-017). It isn't logged, and
the middleware doesn't store it.

**Requests from before this feature**, and form connections without rules: `"met": true`,
`"results": []`, `"messages": []`, with the main branch (US1-AS7, SC-005).

**Delivery**: the documents are delivered whether or not the rules are met, and the status is
`completed` in both cases (FR-015). serviceBW decides how to proceed, for example by showing the
messages and not accepting the application.

## Order of the checks

For the main branch's pull URL, as in spec 001: unknown form connection `404`; deactivated or
deleted `409 unavailable`; unknown reference `404`.

For another branch's pull URL (research R3):

| # | Check | Answer |
|---|---|---|
| 1 | Unknown form connection | `404` `{"error": "Not found", "message": "Request not found"}` |
| 2 | Form connection deactivated or deleted | `409` `{"error": "unavailable", "message": "This form connection is deactivated or deleted"}` (FR-027) |
| 3 | Unknown branch, or a branch of another form connection | `404` `{"error": "Not found", "message": "Request not found"}` |
| 4 | Branch deleted | `409` `{"error": "unavailable", "message": "This variant was deleted"}`, for every request, including those in progress (FR-027, US3-AS9) |
| 5 | Unknown reference, or one of another form connection, or a record deleted after 7 days | `404` `{"error": "Not found", "message": "Request not found"}` |
| 6 | The branch was added after the request was triggered | `409` `{"error": "branch_added_later", "message": "This variant didn't exist when the request was triggered"}`, without status or documents (FR-025) |
| 7 | Otherwise | `200`, as above |

Stop polling on every `404` and `409`. The `502` and `503` answers of spec 001 are unchanged and
apply to every branch's pull URL.

## Rules changed while a request is in progress

A request is evaluated with the rules that each branch had when the request was triggered, even if
they change before it completes (FR-028). The trigger URL and the pull URLs never change when rules
or branches change (FR-028), and a renamed branch keeps its pull URL (FR-025).
