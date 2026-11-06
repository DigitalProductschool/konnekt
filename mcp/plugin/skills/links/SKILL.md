---
name: links
description: The Connection Portal's links to connections, variants, rules, groups and approval requests, what each names, how to use them in place of identifiers, and how to resolve ambiguous names.
---

# Links

Every connection, variant, rule and group has a link that opens it in the Connection Portal's
editor. Answers carry the links of what they read or changed; give them to the team member so that
they can open the place you mean. The team member can copy the same links with "Copy link" in the
editor's ⋯ menus and paste them to you.

## The formats

```text
connection:  {portal}/form-connections/{connection id}
variant:     {portal}/form-connections/{connection id}/edit?step=rules&variant={variant id}
rule, group: {portal}/form-connections/{connection id}/edit?step=rules&variant={variant id}&item=rule-7
approval:    {portal}/approvals/{request id}
```

A link holds no name and no content: renaming a variant or publishing a draft doesn't change it.
An approval link names an approval request, not a connection.

## Links in place of identifiers

Wherever a call takes a connection, a variant, a rule or a group, it accepts:

- its link;
- its identifier: a UUID for a connection or variant, `rule-7` or `group-2` for an item;
- for a variant, rule or group, its name ("Standard" for the main variant unless it was renamed);
  names match ignoring letter case and surrounding spaces.

A link must belong to this Connection Portal: a link to another address, such as a preview
deployment's, is refused. A link that names another connection than the one you passed is refused
too. A link to something deleted since says that it no longer exists.

## Ambiguous names

If a name matches more than one variant, rule or group, the call is refused with the candidates
and their links. Ask the team member which one they mean, or use the candidate's link.
