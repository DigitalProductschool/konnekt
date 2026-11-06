---
name: checks-and-tests
description: The rule checks' findings and their kinds, what resolves them, what the checks can't cover, testing a variant's rules with fictitious applicants and their fields, and never using real people's data.
---

# Rule checks and tests

Before asking to publish, check a variant's rules for mistakes and test them with applicants you
invent. Neither stores anything: findings, applicants and results are never saved or logged.

## Findings

The rule checks look at a variant's rules together, as the editor's Rules step does, on today's
calendar day in Germany. Each finding names the rule or group, its kind, why, and what would
resolve it:

| Kind          | Meaning                                                                           |
| ------------- | --------------------------------------------------------------------------------- |
| `conflicting` | The rule can't be met together with the others it is combined with: nobody passes |
| `redundant`   | Another rule already demands as much: the rule never decides anything             |
| `always_met`  | Every possible value meets the rule: it checks nothing                            |

A variant can also get a notice that nobody can meet its rules at all, or that everybody meets
them. A finding "at the moment" depends on today's date and may go away later, for example a date
condition that can't be met yet.

## What the checks don't cover

Some rules can't be checked; the answer lists them with the reason: the rule has no data yet, its
data isn't requested by the connection, its condition is incomplete, or it can't be read. Resolve
these too: they would stop publishing.

## Testing with fictitious applicants

Test a variant's rules with applicants you make up. `get_variant` lists the variant's
`applicant_fields`: each field's `key`, `label`, `kind`, its value set (`option_set`) for a value
list, whether it takes a list (`multiple`) and, for a licence class's date, the `licence_class`.
Give each applicant a name and values for these fields, by their keys (`pid.birthdate`, `pid.place_of_birth.country`,
`mdl.driving_privileges.issue_date#B`). A field's kind says what it takes: a number, a text, a code
from its value set, a list for fields with several values, a date as `YYYY-MM-DD`. Each result
says per rule and group whether it was met, not met or not checked (a missing value counts as not
met), and which messages the citizen would read. Pick a day to see how the rules judge on another
date.

Cover each rule's edges: just meeting and just missing the condition, a missing value, and each
branch of an OR.

## Never real data

Never use real people's data, not even the team member's own: no real names, dates of birth,
document numbers or addresses. Invent applicants such as "Applicant A, born 2000-01-01".
