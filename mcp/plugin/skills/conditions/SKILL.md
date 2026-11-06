---
name: conditions
description: Rules, groups and their conditions per kind of data (number, text, value lists, dates), dates on Germany's calendar day, years ago and from now, the date of birth as an age, and how to word the citizen's message.
---

# Rules, groups and conditions

A **rule** checks one field (or one part of a field) of a requested document with one condition,
and carries the message the citizen reads when the rule isn't met. A **group** combines rules (and
sub-groups, one level deeper) with AND or OR, and may carry a message of its own. Rules are
numbered `rule-1`, `rule-2`, … and groups `group-1`, …; a number never changes and is never reused.

A rule may be incomplete while you build it (no field, no condition or no message yet), but a
connection can only be published when every rule is complete.

## Reading a rule or group

`get_item` reads one rule or group of a variant, named by `rule-n` / `group-n`, its link or its
name: a rule with its data (`target`: the document type and the field, as `field`, `field.part`
or `field.part#B`), its `condition`, its `message` and its readable `statement`; a group with its
`operator`, its message and its members; its mark in a based variant, and `in_group`, the group
it sits in. The statement is empty while the rule is incomplete.

## Adding and changing rules

Each call makes one change, stored at once in the draft; published connections can't be changed.

- `add_rule` adds a rule to a `variant`, at the end of its top level, or of a group or sub-group
  with `group`. It takes an optional `name` (Rule 01, Rule 02, … by default), the data as
  `target: { document_type, field }` (`field` is a catalog key, `field.part` such as
  `place_of_birth.country`, or `field.part#class` such as `driving_privileges.issue_date#B`), a
  `condition` (below) and the citizen's `message`. Any of them may come in a later call: an
  incomplete rule is stored. A rule added to Standard appears in every variant based on it
  (`propagated_to`); one added to a based variant is marked `added` there.
- `update_item` changes a rule's `name`, `target`, `condition` or `message`, or a group's `name`,
  `operator` (`and` or `or`) or `message` (`null` removes the group's own message). Give only what
  changes. In a based variant the item becomes `changed`; a change in Standard reaches the based
  variants where the item still follows Standard. A name another rule or group of the variant has
  is refused, in Standard also when a based variant has it.

## Groups

`group_items` puts two or more `items` of one level of a variant into a new group in the first
one's place: a group at the top level, or a sub-group inside a group. A sub-group holds only
rules, so groups go no deeper. It takes an optional `name` (Group 01, … by default), `operator`
(`and` by default: all must be met; `or`: one must be met) and `message`. A group's AND/OR and
message change later with `update_item`; ungrouping is `delete_item` with `keep_members`
(variants-and-standard).

## Operators per kind of data

| Kind              | Operators                                                        | Takes                                                               |
| ----------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------- |
| Number            | `greater_than`, `less_than`, `equal_to`, `not_equal_to`          | `value` (a number)                                                  |
| Text              | `equal_to`, `not_equal_to`, `contains`, `not_contains`           | `value` (a text), `match_case` (letter case is ignored unless true) |
| Value list (enum) | `includes_one_of`, `includes_none_of`                            | `values` from the field's value set                                 |
| Date              | `before`, `after`, `on`                                          | `date` as `YYYY-MM-DD`                                              |
| Date              | `at_least_years_ago`, `less_than_years_ago`, `exactly_years_ago` | `years`                                                             |
| Date              | `at_least_from_now`, `less_than_from_now`                        | `amount` and `unit` (`years` or `months`)                           |

Images can't be checked. A field that can hold several values (the nationalities, the licence
classes held) meets `includes_one_of` when any of its values is listed, and `includes_none_of`
when none is. Text compares with the spaces around it removed, and ignores letter case unless
`match_case` is set.

## Dates count by Germany's calendar day

A date condition is judged on the calendar day in Germany (Europe/Berlin) on which the citizen
shares the data, not the time of day. "At least 18 years ago" is met from the 18th anniversary on;
an anniversary of 29 February falls on 1 March in other years. "At least 6 months from now" checks
that a document is still valid for that long, for example an expiry date.

## The date of birth as an age

On a date of birth, the years-ago operators read as an age: `at_least_years_ago` with 18 is "is at
least 18 years old", `less_than_years_ago` with 27 is "is less than 27 years old", and
`exactly_years_ago` with 18 is "is exactly 18 years old".

## Wording the message

The message is shown to the citizen when the rule (or group) isn't met. Write it to the citizen,
in plain words, saying what is required, not what went wrong in the data: "You must be at least
18 years old." rather than "birthdate check failed". A group's message replaces its members'
messages when the group isn't met.
