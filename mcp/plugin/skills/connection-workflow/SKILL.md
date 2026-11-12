---
name: connection-workflow
description: How to take a serviceBW form from a description to a live connection in Konnekt, one change at a time, and what to tell the team member on the way.
---

# From a description of a form to a live connection

A connection links one serviceBW form to the EUDI Wallet. It says which documents the wallet asks
the citizen to share (the Personal ID, the driving licence, …), which of their fields, and which
rules the shared data must meet before serviceBW accepts it. Agents build connections as drafts:
a draft is stored at once, may be incomplete between calls, and is never live.

## From a description to a plan

The team member describes the form in their words: who may apply, what must be proven, which cases
differ. Before the first change, turn the description into a plan:

- **Documents and fields**: what each requirement needs to see, such as the date of birth for an
  age or the licence classes for a driving permit. Request nothing the rules don't need, unless
  the form itself needs it.
- **Rules**: one rule per requirement, each with the message the citizen reads when it isn't met.
  Requirements of which one is enough become a group with OR.
- **Variants**: cases with other requirements for the same form, such as another age limit for
  another kind of permit.

Ask the team member about what the description leaves open (an exact age, which licence classes,
which countries) rather than guessing. Read the guide's topics before working on their subject:
`conditions` before writing rules, `variants-and-standard` before adding variants.

## The order of work

1. **Find or create.** Look for an existing connection first, by a part of its name or
   description, so that you don't build a second one for the same form. If there is none, create
   a draft with the form's name. Every new draft starts with the main variant "Standard" and no
   documents.
2. **Name and description.** The name is what the team sees in the overview; the description says
   which form and which case the connection serves. Both can change later.
3. **Documents and fields.** Choose the document types and only the fields the form needs: the
   citizen is asked for each one.
4. **Rules.** Add the rules the form needs, in Standard first. Group rules when only some of them
   must be met, and add variants when the same form has other rules for some cases.
5. **Check and test.** Run the rule checks and test the rules with fictitious citizens; resolve
   what they find before publishing.
6. **Publish with approval.** Publishing needs the team member's approval through a link:
   `request_approval` with `action: 'publish'` answers it, and `check_approval` tells the outcome
   once the team member says they decided (see the skill `publishing-and-live-connections`).
7. **The connection URLs.** Once published, the connection has a trigger URL and one pull URL per
   variant, which the team member copies into serviceBW: `check_approval` answers them after the
   approved publish, and `get_connection` at any time.

## Reading what is there

- `search_connections` finds connections by a part of their name or description (letter case
  doesn't matter) and by status: `draft`, `scheduled`, `live` or `deactivated`. It answers at
  most 25 at a time, the most recently changed first; pass its `next_cursor` to read the next
  page. Each connection comes with its id and link, a published one with `published_at` (when it
  was first published), while deactivated `deactivated_at` and while scheduled `start_date` (the
  day in Germany it becomes active), and a draft with its `step`.
- `get_connection` reads one connection: its documents and fields, its variants with how many
  rules and groups each has (read the rules themselves with `get_variant`), its connection URLs
  once published, and for a draft its version, its `step` and `dropped`: requested data the
  wallet no longer offers, which must be removed before publishing. A published connection also
  carries its dates, as the details page in Konnekt shows them: `published_at`, when it was first
  published, which nothing changes afterwards; `active_since`, when it last became active, which
  reactivating moves (left out while it has never been active); and `deactivated_since`, only
  while it is deactivated. Saving, renaming or reordering moves none of them. The dates are
  timestamps in UTC; the text says "Draft at the rules step." for a draft.
- `get_activity` reads a connection's activity, as the Activity card on its page in Konnekt
  shows it: what happened and when, newest first, 50 entries at a time; pass its `next_cursor` to
  read earlier ones. Each entry has `at` (a timestamp in UTC), `event` (the card's sentence, such
  as "Rules changed in Ambulance", "Scheduled for 2026-12-01" or "Start date changed to now"),
  `kind`, and the `variant` or `start_date` it concerns. Who did it: `by` is the team member;
  with `agent`, that agent made the change for them; with `agent` and `approved`, the team member
  approved what that agent asked for. An entry without `by` was made by the middleware itself
  (a scheduled connection becoming active) or before Konnekt recorded the activity. Many changes
  of one person to the same thing in a row show as one entry with the time of the last. The
  activity never holds the rules' content: read that with `get_variant`.

## The example

A team member can start from an example in Konnekt: a complete draft, "Passenger transport
licence (example)" in English, with two documents, two rules in Standard and a variant
("Ambulance" in English), which shows them how a connection works. It keeps the language it was
created in. Only a person creates it, in Konnekt: no tool creates the
example, so never try to build one for them. The example is an ordinary draft otherwise, and the
draft tools change it as any other.

- `search_connections` marks it with `example: true`, and its text adds "This draft is the
  example." after the step.
- `get_connection` answers `example: 'unchanged'` while nothing was changed since it was created,
  and `example: 'changed'` once a save changed its content (a variant's description included);
  moving the step alone changes nothing, and the mark never goes back. Its text says "This draft
  is the example." either way.
- A draft that isn't the example, and every published connection, carry no `example`: publishing
  the example ends the mark.

Before you ask to publish the example while it is `unchanged`, ask the team member to check that
its name, documents and rules fit their service, as Konnekt's publish dialog does.

## Creating a draft and changing its name

- `create_draft` takes the `name` and an optional `description` and creates a draft with the
  main variant "Standard", no documents and no rules, at the connection step. It answers the
  connection and its Standard variant with their links. An agent can create only a limited number
  of drafts per hour: past it, the call is refused with the time from which it can create drafts
  again (`rate_limited`), so don't create a draft to try something out.
- `update_connection` changes a draft's `name` or `description` (at most 500 characters);
  `description: null` or `''` clears it. The name can't be empty.

Every tool that changes a draft works on drafts only: a published connection's content is changed
in Konnekt, and the tool answers `published_read_only` for it, whatever your access
level.

## One change per call

Every change is one call and is stored at once: adding a document, renaming a variant, adding one
rule, changing one condition. There is no "save" step and nothing to undo in bulk. If another team
member saves the same draft meanwhile, the change is applied again to their version; if the
draft keeps changing, the tool answers `conflict`: try again a little later. A change the editor
would refuse is refused with the editor's message (`validation`), naming the rule or variant
concerned, and nothing is stored.

## The draft's step

A draft remembers how far its content reaches, as the editor's wizard does: the connection step
(name and description), the documents step, the rules step and the test step. The team member who
opens the draft in Konnekt continues there. Every change stores the furthest step the
content reaches: the rules step once any variant has a rule, the documents step once a document is
requested, the connection step otherwise. Each answer's text says the draft's version and step.

## What to tell the team member

- What you changed, with the links of the connection, variants and rules you touched, so that they
  can open them in Konnekt.
- What is still missing before the draft can be published: documents without fields, incomplete
  rules, missing messages, findings of the rule checks.
- For approval: the link that `request_approval` answers, what will happen when they approve (its
  `what_happens`), and that the link expires after about ten minutes. Then wait until they say
  they decided, and call `check_approval` once: `done` (with the connection URLs after publishing),
  `declined`, `expired`, `replaced`, `cancelled` with its `reason`, or `failed` with an `error_id`
  to pass on. Never claim that something was published, deactivated or deleted before the outcome
  says `done`.
- Deleting a draft works the same way (`action: 'delete_draft'`): its content is gone for good
  once the team member approves, so ask only when they want it.

## The guide

`get_guide` reads this guidance for clients that don't load the server's skills. Without a
`topic`, it lists the topics with what each covers; with one (`connection-workflow`, `conditions`,
…), it answers that topic's full text, the same as the skill. An unknown topic is refused with
`validation` and the list of topics.
