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

## Asking for approval: `request_approval`

`request_approval` takes the `connection` (its id or link) and the `action`. It checks your access
level for that action first, then whether the action applies: publishing a published connection,
or deactivating a connection that is already deactivated, is refused with `not_allowed`, and a
draft that publishing would refuse is refused with `validation` and publishing's message. Nothing
is made then; fix what the message says and ask again.

Otherwise it answers `request` (its `id`, `action`, `connection`, `link`, `expires_at` and
`status: 'waiting'`) and `what_happens`, which says what the team member will see and the time
by which they must decide. Nothing has happened yet:

- Hand the `link` to the team member, say what will happen when they approve (`what_happens`),
  and that the link expires after about ten minutes, at the time it names.
- A client that can show links to the user opens or offers the link itself; the link is in the
  answer either way, so always pass it on.
- Don't change the draft while the request waits: any change to it cancels the request, and the
  team member would approve what you no longer meant.
- Never say that something was published, deleted, deactivated or reactivated before
  `check_approval` says `done`.

A newer request for the same connection and action replaces a waiting one, so ask once and keep
the `id`.

## Deactivating, reactivating and deleting a published connection

These three act on a published connection, never on a draft, and need "Read, edit drafts and
manage live connections". At a lower level, `request_approval` refuses them with
`insufficient_access` before anything is made; ask for the level with `request_access`, or the
team member raises it on their user page. A draft is refused with `not_allowed` ("This connection
is a draft: it has nothing live yet."), as are deactivating a deactivated connection and
reactivating a live one.

The approval page shows the team member the connection's URLs, the trigger URL and each
variant's pull URL, and what approving does to them:

- `deactivate`: the URLs answer "unavailable" until the connection is reactivated, and requests
  in progress are cancelled. The connection, its content and its URLs stay.
- `reactivate`: the same URLs work again; serviceBW's form needs no change.
- `delete`: the URLs stop working for good, requests in progress are cancelled, and deleting
  can't be undone. Make sure the team member means it before you ask.

`what_happens` says this too: pass it on with the link. While the request waits, a deactivation,
reactivation or deletion made in the Connection Portal cancels it (`connection_changed`,
`connection_deleted`). Their content, the name, description, documents, variants and rules, stays
read-only for agents at every level: a change to it is refused with `published_read_only`.

## Learning the outcome: `check_approval`

When the team member says they decided, call `check_approval` with the request's `id` (or its
link). Don't call it in a loop while they decide. It answers the `request` with its `status` and
its `outcome`, and `urls` once a draft is published or a connection reactivated:

| Outcome     | Meaning                                                                                                                   |
| ----------- | ------------------------------------------------------------------------------------------------------------------------- |
| `waiting`   | Not decided yet                                                                                                           |
| `done`      | Approved and carried out; after publishing or reactivating, `urls` holds the connection URLs                              |
| `declined`  | The team member declined; nothing happened                                                                                |
| `expired`   | Nobody decided in time; nothing happened. Ask again if still wanted                                                       |
| `replaced`  | A newer request for the same action replaced it                                                                           |
| `cancelled` | Nothing happened: `reason` says why (below)                                                                               |
| `failed`    | The team member approved, but it couldn't be carried out; pass the `error_id` on. They can try again while the link works |

The `reason` of a cancelled request: `draft_changed` (the draft changed after you asked: ask
again for the draft as it is now), `draft_published` or `draft_deleted` (someone published or
deleted it meanwhile), `connection_changed` or `connection_deleted` (the connection was
deactivated, reactivated or deleted meanwhile), `revoked`, `access_changed` or `access_ended`
(your access was revoked, lowered or ended).

## The connection URLs

A published connection has a trigger URL and one pull URL per variant, with the placeholder
`{reference}` that serviceBW fills in. The team member copies them into the serviceBW form. A
draft has no URLs yet; a deactivated connection keeps its URLs, which answer "unavailable" until
it is reactivated; a deleted connection has none. `check_approval` answers the URLs only after a
done `publish` or `reactivate`: after deactivating or deleting, it answers `urls: null`.

`get_connection` answers them as `urls`: the `trigger_url`, and per variant its name, link and
`pull_url`. For a draft, `urls` is null. `urls_note` always says where the URLs stand: that they
exist once the draft is published, that the connection is live, or that it is deactivated and its
URLs answer "unavailable" until it is reactivated. Pass the note on with the URLs.
