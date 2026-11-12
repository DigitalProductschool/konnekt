---
name: publishing-and-live-connections
description: Publishing a draft, deleting a draft, and deactivating, reactivating or deleting a published connection or changing its start date, always through the team member's approval link; scheduled connections, the checks, the link's expiry, the outcomes and the connection URLs.
---

# Publishing and live connections

Six actions change what citizens and serviceBW see, or delete content for good, so an agent
never performs them itself. It asks for them, and the team member approves or declines on an
approval page in Konnekt:

| Action                               | What happens when approved                                                                                        |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `publish`                            | The draft becomes a live connection and gets its connection URLs                                                  |
| `publish` with a `start_date`        | The draft is published and scheduled: its URLs exist at once and answer "unavailable" until the start date        |
| `delete_draft`                       | The draft is deleted; its content is gone for good                                                                |
| `deactivate`                         | The connection's URLs answer "unavailable" until it is reactivated                                                |
| `deactivate`, scheduled              | The schedule is cancelled and the connection is deactivated: it doesn't become active on its date                 |
| `reactivate`                         | The URLs work again                                                                                               |
| `reactivate` with a `start_date`     | The connection is scheduled: its URLs answer "unavailable" until the start date                                   |
| `delete`                             | The published connection is deleted, and its URLs stop working for good                                           |
| `delete`, scheduled                  | The connection is deleted and doesn't become active on its date                                                   |
| `set_start_date`, scheduled, a date  | The start moves to the new date                                                                                   |
| `set_start_date`, scheduled, `'now'` | The connection becomes active at once                                                                             |
| `set_start_date`, live, a date       | The connection is scheduled: its URLs answer "unavailable" until the date, and requests in progress are cancelled |

Publishing and deleting a draft need "Read and edit drafts"; deactivating, reactivating and
deleting a published connection, and changing its start date, need "Read, edit drafts and manage
live connections".

## Before publishing

Publishing runs the editor's checks on the draft: a name, the documents and their fields, every
rule complete (field, condition and message), every variant named once. A draft that fails them
is refused at once with the editor's message, before any link is made. Run the rule checks and the
tests first: the team member sees the same findings on the approval page.

## Asking for approval: `request_approval`

`request_approval` takes the `connection` (its id or link), the `action` and, for `publish`,
`reactivate` and `set_start_date`, a `start_date` (below). It checks your access level for that
action first, then whether the action applies: publishing a published connection,
or deactivating a connection that is already deactivated, is refused with `not_allowed`, and a
draft that publishing would refuse is refused with `validation` and publishing's message. Nothing
is made then; fix what the message says and ask again.

Otherwise it answers `request` (its `id`, `action`, `connection`, `link`, `expires_at`,
`status: 'waiting'` and the `start_date` asked for, if any) and `what_happens`, which says what the team member will see and the time
by which they must decide. Nothing has happened yet:

- Hand the `link` to the team member, say what will happen when they approve (`what_happens`),
  and that the link expires after about ten minutes, at the time it names.
- A client that can show links to the user opens or offers the link itself; the link is in the
  answer either way, so always pass it on.
- Don't change the draft while the request waits: any change to it cancels the request, and the
  team member would approve what you no longer meant.
- Never say that something was published, scheduled, deleted, deactivated or reactivated before
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
reactivation or deletion made in Konnekt cancels it (`connection_changed`,
`connection_deleted`). Their content, the name, description, documents, variants and rules, stays
read-only for agents at every level: a change to it is refused with `published_read_only`.

## Start dates: `start_date` and `set_start_date`

A start date is a day in Germany, `YYYY-MM-DD`, after today there: the connection becomes active
at 00:00 German time on that day.

- `publish` and `reactivate` take an optional `start_date`. With a date, approving publishes or
  reactivates the connection as scheduled for it; without one, or with `'now'`, it acts at once.
  A scheduled connection can't be reactivated (`not_allowed`): change its start date instead.
- `set_start_date` needs "Read, edit drafts and manage live connections" and a `start_date`, in
  three cases:
  - a scheduled connection and a date: its start moves to that date (its own date is refused
    with `not_allowed`);
  - a scheduled connection and `'now'`: it becomes active at once;
  - a live connection and a date: it is scheduled for that date; its URLs answer "unavailable"
    until then, and requests in progress are cancelled. `'now'` on a live connection is refused
    with `not_allowed`.

  A draft or a deactivated connection is refused with `not_allowed`: publish a draft, reactivate a
  deactivated connection, each with a `start_date` if wanted.

- A `start_date` with `delete_draft`, `deactivate` or `delete`, a `start_date` that is no date, a
  `set_start_date` without one, and a date that isn't after today in Germany are refused with
  `validation` before any request is made; the message says why.

`what_happens` names the date. While the request waits, the connection's start date changing or
the connection becoming active in Konnekt cancels it (`connection_changed`); a start date that is
no longer after today when the team member approves cancels it too (`start_date_passed`): ask
again with a new date.

## A scheduled connection: deactivating and deleting

`deactivate` and `delete` also accept a scheduled connection. Deactivating cancels the schedule:
the connection doesn't become active on its date and stays deactivated until it is reactivated.
Deleting removes it, and it never becomes active. `what_happens` names the date that won't come.

## Learning the outcome: `check_approval`

When the team member says they decided, call `check_approval` with the request's `id` (or its
link). Don't call it in a loop while they decide. It answers the `request` with its `status`, its
`outcome`, the `start_date` asked for, if any, and its `connection`, and `urls` once a draft is
published or a connection reactivated. After a done request the connection's `status` is
`scheduled` with its `start_date`, or `live`:

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
deactivated, reactivated, became active, got another start date or was deleted meanwhile),
`start_date_passed` (the start date asked for is no longer after today in Germany: ask again with
a new date), `revoked`, `access_changed` or `access_ended` (your access was revoked, lowered or
ended).

## A scheduled connection

A published connection is `live`, `deactivated` or `scheduled`. A scheduled connection is
published but not active yet: it becomes active by itself on its `start_date`, a day in Germany
(`YYYY-MM-DD`), at 00:00 German time. Until then it has its URLs already, so the team member can
add them to the serviceBW form in time, but they answer "unavailable", as a deactivated
connection's do. From the start day on they work, with no change to the form and nobody signed
in. `search_connections` finds the scheduled connections with `status: 'scheduled'`, and its
items and `get_connection` carry the `start_date`; their text names it ("Connection 'Boat
licence' (scheduled from 2026-12-01): …"). A live, deactivated or draft connection has no
`start_date`.

## The connection URLs

A published connection has a trigger URL and one pull URL per variant, with the placeholder
`{reference}` that serviceBW fills in. The team member copies them into the serviceBW form. A
draft has no URLs yet; a scheduled connection has its URLs, which answer "unavailable" until it
becomes active on its `start_date`; a deactivated connection keeps its URLs, which answer
"unavailable" until it is reactivated; a deleted connection has none. `check_approval` answers the URLs only after a
done `publish` or `reactivate`: after deactivating or deleting, it answers `urls: null`.

`get_connection` answers them as `urls`: the `trigger_url`, and per variant its name, link and
`pull_url`. For a draft, `urls` is null. `urls_note` always says where the URLs stand: that they
exist once the draft is published, that the connection is live, that it is deactivated and its
URLs answer "unavailable" until it is reactivated, or that it is scheduled and its URLs answer
"unavailable" until it becomes active on its start date, 00:00 in Germany. Pass the note on with
the URLs.
