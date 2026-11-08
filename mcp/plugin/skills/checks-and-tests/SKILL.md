---
name: checks-and-tests
description: The rule checks' findings and their kinds, what resolves them, what the checks can't cover, testing a variant's rules with fictitious citizens and their fields, and never using real people's data.
---

# Rule checks and tests

Before asking to publish, check the rules for mistakes with `check_rules` and test them with
citizens you invent with `test_applicants`. Both work on drafts and published connections, at
every access level. Neither stores anything: findings, citizens and results are never saved or
logged.

## Findings: `check_rules`

`check_rules` takes the `connection` and, optionally, one `variant` (without it, every variant).
It runs the same checks as the editor's Rules step, on today's calendar day in Germany, which the
answer gives as `day`. Per variant, it answers:

- `checked_completely`: whether the checks finished in time and decided every question. When it
  is false, the findings listed are certain, but others may be missing: say so, and don't present
  the variant as free of mistakes.
- `rules_checked`: how many rules the checks read.
- `notice`: a statement about the whole variant, or null. `none_can_meet`: no citizen can meet
  its rules; `all_meet`: every citizen meets them, so they check nothing.
- `findings`: one per rule or group at most, each with the `item`, its `kind`, the other items it
  `involves`, `why` it holds and a `resolution`.
- `not_covered`: the rules the checks leave out, with why.

| Kind          | Meaning                                                               |
| ------------- | --------------------------------------------------------------------- |
| `conflicting` | The rule contradicts the others it is combined with: nobody passes    |
| `redundant`   | Another rule already demands as much: the rule never decides anything |
| `always_met`  | Every possible value meets the rule or group: it checks nothing       |

Each finding and notice comes with a `resolution` worded for you, such as "Change or delete one
of Rule 02 and Rule 03; they contradict each other" or "You can delete Rule 06; Rule 03 already
covers it". The finding's `why` is the sentence the Rules step shows under the rule or group,
such as "Rule 04 and Rule 05 in this group contradict each other."; quote it to the team member
as it is. Propose the change to the team member, or make it with the draft tools, then run
`check_rules` again. A finding or notice with `at_the_moment: true` holds for citizens who share
today but not on every later day, for example a date condition that can't be met yet: point that
out rather than calling the rule wrong.

## What the checks don't cover

`not_covered` lists each rule the checks left out, with a `reason` and the Rules step's `text`:

| Reason                 | What to do                                                      |
| ---------------------- | --------------------------------------------------------------- |
| `no_data`              | Choose the data the rule checks (`update_item` with a `target`) |
| `data_not_requested`   | Request the data with `set_document`, or delete the rule        |
| `condition_incomplete` | Complete the condition (`update_item` with a `condition`)       |
| `unreadable`           | Fix what the text names, such as a part the field doesn't have  |

Resolve these too: they would stop publishing. An answer without findings is only "no mistakes"
when `checked_completely` is true and `not_covered` is empty.

## Testing with fictitious citizens: `test_applicants`

`test_applicants` takes the `connection`, one `variant`, 1 to 10 fictitious citizens in the
`applicants` field and, optionally, a `day` of sharing as `YYYY-MM-DD` (without it, today in
Germany). Pick a day to see how the rules judge on another date, such as the day a citizen turns 18.

`get_variant` lists the variant's citizen fields in `applicant_fields`: each field's `key`, `label`,
`kind`, its value set (`option_set`) for a value list, whether it takes a list (`multiple`) and, for
a licence class's date, the `licence_class`. Give each citizen a `name` and `values` for these
fields, by their keys (`pid.birthdate`, `pid.place_of_birth.country`,
`mdl.driving_privileges.issue_date#B`). A field's kind says what it takes: a number, a non-empty
text, a code from its value set (a list of codes for a field with several values, such as the
licence classes), a date as `YYYY-MM-DD`. A value that doesn't fit, or a key the variant's rules
don't check, refuses the whole test before anything is evaluated, naming the citizen, the field and
what it expects. A key left out, `null` or an empty list is missing data.

Per citizen, the answer gives whether they meet the variant (`met`), every rule's and group's
`outcome` in the evaluation's order with the group it sits in (`in_group`), and the `messages` the
citizen would read, exactly as the evaluation decides:

- `met` and `not_met`: the value meets the condition or doesn't. A rule on a licence class's date
  is `not_met` when the citizen doesn't hold that class.
- `not_checked`: the rule's value is missing, and its `reason` says which key. A missing value
  never counts as met: a rule not checked fails an AND, and under an OR another item must be met.
  When the variant isn't met, its message is reported as a rule's not met is.

A variant whose rules are incomplete (no data chosen, an incomplete condition, data no longer
requested, a group with fewer than two rules) can't be tested: the test is refused with the first
problem. Fix it first, as `check_rules`' `not_covered` shows.

Cover each rule's edges: just meeting and just missing the condition, a missing value, and each
branch of an OR.

## Never real data

Never use real people's data, not even the team member's own: no real names, dates of birth,
document numbers or addresses. Invent citizens such as "Citizen A, born 2000-01-01".
