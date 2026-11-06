---
name: variants-and-standard
description: Standard and the other variants of a connection, based and empty variants, the marks follows, changed, removed and added, how Standard's changes reach based variants, the top-level AND/OR and resetting.
---

# Variants and Standard

A connection can apply different rules to the same form: each set of rules is a **variant**, and
serviceBW calls the variant that fits the case through its own pull URL. Every connection has the
main variant, called **Standard** until it is renamed. It can't be deleted.

## Reading a variant

`get_variant` reads one variant, never more in one call: its `origin` (`main`, `based` or
`empty`), its top-level `operator` and `operator_mark`, and its rules and groups as a tree, each
with its readable statement, its mark and its link. It also lists the variant's
`applicant_fields`, the data its rules check, which is what `test_applicants` takes for each
applicant, and `unrequested_rules`, the rules that check data the connection no longer requests.

## Based and empty variants

A new variant is either:

- **based on Standard**: it starts as a copy of Standard's rules and keeps following Standard
  until it changes something; or
- **empty**: it starts without rules and never follows Standard.

Variant names are unique within a connection.

## Marks in a based variant

Each rule and group of a based variant carries a mark that says how it relates to Standard:

| Mark           | Meaning                                                                                                                  |
| -------------- | ------------------------------------------------------------------------------------------------------------------------ |
| none (follows) | The item is Standard's, unchanged; it changes when Standard's changes                                                    |
| `changed`      | The variant changed the item (its name, data, condition, message or AND/OR); Standard's later changes no longer reach it |
| `removed`      | Standard's item doesn't apply in this variant; it is still shown, but not evaluated                                      |
| `added`        | The item exists only in this variant                                                                                     |

## How Standard's changes reach based variants

A change to Standard applies at once to every based variant, where the item follows Standard: a
new rule in Standard appears in each based variant, a changed condition changes there too, and a
deleted rule disappears. Items a variant changed or removed keep the variant's version. Deleting
a group in Standard can leave a based variant with a group of fewer than two active members; that
group then counts as dissolved there. Empty variants never receive Standard's changes.

## The top-level AND/OR

The rules and groups at a variant's top level combine with AND (all must be met) or OR (one is
enough); a group has its own AND/OR for its members. A based variant can switch its top level's
AND/OR; from then on, Standard's switch no longer reaches it.

## Resetting

In a based variant, a changed item can be reset to follow Standard again, a removed item can be
restored (with its removed members), and a switched top-level AND/OR can be reset to Standard's.
