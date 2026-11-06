---
name: publishing-and-live-connections
description: Publishing a draft, deleting a draft, and deactivating, reactivating or deleting a published connection, always through the team member's approval link; the checks, the link's expiry, the outcomes and the connection URLs.
---

# Publishing and live connections

Five actions change what citizens and serviceBW see, or delete content for good, so an agent
never performs them itself. It asks for them, and the team member approves or declines on an
approval page in the Connection Portal:

| Action         | What happens when approved                                              |
| -------------- | ----------------------------------------------------------------------- |
| `publish`      | The draft becomes a live connection and gets its connection URLs        |
| `delete_draft` | The draft is deleted; its content is gone for good                      |
| `deactivate`   | The connection's URLs answer "unavailable" until it is reactivated      |
| `reactivate`   | The URLs work again                                                     |
| `delete`       | The published connection is deleted, and its URLs stop working for good |

Publishing and deleting a draft need "Read and edit drafts"; deactivating, reactivating and
deleting a published connection need "Read, edit drafts and manage live connections".

## Before publishing

Publishing runs the editor's checks on the draft: a name, the documents and their fields, every
rule complete (field, condition and message), every variant named once. A draft that fails them
is refused at once with the editor's message, before any link is made. Run the rule checks and the
tests first: the team member sees the same findings on the approval page.

## The approval link

Asking answers a link to the approval page. Nothing has happened yet: hand the link to the team
member, say what will happen when they approve, and that the link expires after about ten minutes.
A newer request for the same connection and action replaces a waiting one. When the team member
says they decided, check the outcome:

| Outcome     | Meaning                                                                                                 |
| ----------- | ------------------------------------------------------------------------------------------------------- |
| `waiting`   | Not decided yet                                                                                         |
| `done`      | Approved and carried out                                                                                |
| `declined`  | The team member declined; nothing happened                                                              |
| `expired`   | Nobody decided in time; nothing happened. Ask again if still wanted                                     |
| `replaced`  | A newer request for the same action replaced it                                                         |
| `cancelled` | The draft or connection changed meanwhile, or your access was lowered or revoked; the reason says which |
| `failed`    | The approval was tried but couldn't be carried out; the error ID helps the team                         |

## The connection URLs

A published connection has a trigger URL and one pull URL per variant, with the placeholder
`{reference}` that serviceBW fills in. The team member copies them into the serviceBW form. A
draft has no URLs yet; a deactivated connection keeps its URLs, which answer "unavailable" until
it is reactivated.
