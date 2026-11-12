---
name: access-levels
description: The three access levels an agent can have in Konnekt, what each allows, how to ask for more, the team member's user page and personal access tokens.
---

# Access levels

The team member chooses your access level when they connect you, on Konnekt's
consent page. Each level includes the one before it:

| Level                                           | Allows                                                                                  |
| ----------------------------------------------- | --------------------------------------------------------------------------------------- |
| "Read only"                                     | Reading connections, variants, rules, the catalog, the rule checks and the tests        |
| "Read and edit drafts"                          | Also creating and changing drafts, and asking for approval to publish or delete a draft |
| "Read, edit drafts and manage live connections" | Also asking for approval to deactivate, reactivate or delete a published connection     |

At every level, a published connection's content (its name, description, documents, variants and
rules) is read-only for agents: the team member changes it in Konnekt. Publishing,
deleting, deactivating and reactivating never happen without the team member's approval.

Some actions are a person's at every level, and no tool offers them: starting from the example,
restoring a deleted connection and deleting several connections at once. The team member does
them in Konnekt; tell them so when they ask you for one.

## When a level isn't enough

Asking for approval to deactivate, reactivate or delete a published connection needs the third
level, "Read, edit drafts and manage live connections", even when you can edit drafts:
`request_approval` refuses it at "Read only" and at "Read and edit drafts" with
`insufficient_access`, and makes no request.

A call that needs a higher level is refused with the error `insufficient_access`, whose message
names the level it needs (`needs_access_level`). You can ask for it with `request_access`, passing
`level`: `drafts` for "Read and edit drafts" or `manage` for "Read, edit drafts and manage live
connections". Your client then opens the consent page again, with the requested level selected,
and the team member decides; once they agreed, call the refused tool again. If you already have
the level, `request_access` says so and changes nothing. A client that can't ask again this way
reports the refusal: then tell the team member which level you need, and they raise it on their
user page.

## The user page

The team member's user page in Konnekt lists the agents they connected and their
personal access tokens. There they can raise or lower each one's access level, which applies from
your next call without connecting again, or revoke it, after which your calls are refused until
you are connected again. Lowering or revoking cancels the approval requests the new level doesn't
allow.

## Personal access tokens

Clients that can't open a browser to sign in use a personal access token instead: the team member
creates it on their user page, with the same choice of access level and an expiry, and gives it to
the client as its bearer token. The token is shown once, when it is created; never repeat it,
write it down or log it.
