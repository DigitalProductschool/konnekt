---
name: links
description: The Connection Portal's links to connections, variants, rules, groups and approval requests, what each names, how to use them in place of identifiers, and how to resolve ambiguous names.
---

# Links

Every connection, variant, rule and group has a link that opens it in the Connection Portal's
editor. Answers carry the links of what they read or changed (`link` in every connection, variant
and item they name); give them to the team member so that they can open the place you mean.

## The formats

```text
connection:  {portal}/form-connections/{connection id}
variant:     {portal}/form-connections/{connection id}/edit?step=rules&variant={variant id}
rule, group: {portal}/form-connections/{connection id}/edit?step=rules&variant={variant id}&item=rule-7
approval:    {portal}/approvals/{request id}
```

`{portal}` is this Connection Portal's address. Connection and variant ids are UUIDs; an item is
`rule-n` or `group-n`.

## What a link names

- A connection's link names the connection: it is the address of its page in the Connection
  Portal.
- A variant's link names the connection and the variant.
- A rule's or group's link names the connection, the variant and the item. The same `rule-7` can
  sit in several variants (a based variant inherits Standard's rules with their ids), so the link
  says which variant's rule you mean.
- An approval link names an approval request, not a connection: only `check_approval` takes it.

A link holds identifiers only, no name and no content. Renaming the variant or the rule, or
publishing the draft, doesn't change it: a link copied before still names the same item, and
after publishing it opens the published connection's editor. Opened in the browser, a link shows
the connection's rules step with the variant shown and the item in view.

## Copying links

The team member copies a link with "Copy link" in the ⋯ menu of a rule, a group or sub-group, or
a variant's tab in the rules step; a connection's link is the address of its page. They can paste
it to you in place of a name. When you tell them about a rule or a variant, give its link from
your answer, rather than describing where it is.

## Links in place of identifiers

Every tool that takes a `connection`, a `variant` or an `item` accepts a link there, and so do the
other parameters that name them: `group` of `add_rule`, `rule` and `to_variants` of `copy_rule`,
and `items` of `group_items`. That is `get_connection`, `get_variant`, `get_item`,
`update_connection`, `set_document`, `add_variant`, `update_variant`, `delete_variant`,
`add_rule`, `update_item`, `delete_item`, `reset_item`, `copy_rule`, `group_items` and
`request_approval`. Each of these parameters accepts:

- `connection`: the connection's id, or any link that names it (a connection's, a variant's or an
  item's link). Connections have no name lookup here: `search_connections` finds one by its name.
- `variant`: its id, a link that names it (a variant's or an item's link), or its name ("Standard"
  for the main variant unless it was renamed).
- `item` (and `group`, `rule`, `items`): `rule-n` or `group-n`, an item's link, or its name in
  the variant.

Names match ignoring letter case and surrounding spaces. Given a rule's link, pass the same link
as `connection`, `variant` and `item`: it names all three. A link that names another connection
than `connection`, or another variant than `variant`, is refused; so is a link of the wrong kind,
such as a connection's link as `variant`.

## Links to something deleted

A link to a variant, rule or group deleted since is refused with `not_found`: "This variant no
longer exists." or "This rule or group no longer exists." Tell the team member that it no longer
exists; never take another item with the same name or number in its place. A rule that a based
variant removed still exists there (marked removed): its link resolves, and `reset_item` restores
it.

## Foreign links

A link must belong to this Connection Portal. A link to another address, such as a preview
deployment's or another installation's, is refused with `foreign_link`: "This link doesn't belong
to this Connection Portal." Ask the team member for the link from this Portal, or name the item by
its id or name.

## Ambiguous names

If a name matches more than one variant, rule or group, the call is refused with
`ambiguous_name` and the candidates, each with its link ("Two variants are called 'Ambulance'.
Name one by its link: …"). Ask the team member which one they mean, or, when the context makes it
clear, call again with that candidate's link. Never pick one at random.
