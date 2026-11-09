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
citizen, and `unrequested_rules`, the rules that check data the connection no longer requests.

## Based and empty variants

A new variant is either:

- **based on Standard**: it starts as a copy of Standard's rules and keeps following Standard
  until it changes something; or
- **empty**: it starts without rules and never follows Standard.

Variant names are unique within a connection.

`add_variant` adds one to a draft, after the others: its `name`, an optional `description` and
its `origin`, `based` or `empty`. The new variant gets an id at once, and its link stays the same
after publishing. A name another variant has (ignoring letter case and surrounding spaces) is
refused with the editor's message.

`update_variant` renames a variant (`name`, Standard too) or describes it anew (`description`;
`null` or `''` clears it). `delete_variant` deletes a variant with its rules and groups; Standard
can't be deleted (`not_allowed`).

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
AND/OR; from then on, Standard's switch no longer reaches it. `update_variant` with
`operator: 'and'` or `'or'` switches a variant's top level; in a based variant that marks it as
changed (`operator_mark`).

## Deleting and removing rules and groups

`delete_item` takes a variant and an `item`:

- In Standard, in an empty variant, or for a based variant's own (`added`) item, it deletes the
  rule, or the group with its members (`action: 'deleted'`). Deleting in Standard deletes the item
  in the based variants too, except where a variant changed it: the answer's `effects` name what
  each variant keeps (`kept`) and the groups left with fewer than two members there, which
  dissolve all the same (`dissolved`).
- With `keep_members: true`, a group is ungrouped instead: its members take its place
  (`action: 'ungrouped'`). A based variant can only ungroup its own groups.
- An item a based variant inherits from Standard can't be deleted there: it is removed instead
  (`action: 'removed'`), stays shown with the mark `removed` and isn't evaluated.

## Copying rules

`copy_rule` copies a `rule` as a new rule with the next number and a default name. Without
`to_variants`, the copy goes beside the rule in its variant; with `to_variants` (ids, links or
names), a copy goes at the end of each of those variants' top level, marked `added` in a based
variant. A copy to Standard also reaches the variants based on it, which get no copy of their
own. The answer lists each copy (`copies`) with its variant and link.

## Resetting

In a based variant, `reset_item` resets a changed item to follow Standard again, with Standard's
content, or restores a removed item (with the members removed inside it), as the editor's "Reset
to Standard" and "Restore" do. A switched top-level AND/OR is reset to Standard's with
`update_variant` and `reset_operator: true`.
