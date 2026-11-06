---
name: connection-workflow
description: How to take a serviceBW form from a description to a live connection in the Connection Portal, one change at a time, and what to tell the team member on the way.
---

# From a description of a form to a live connection

A connection links one serviceBW form to the EUDI Wallet. It says which documents the wallet asks
the citizen to share (the Personal ID, the driving licence, …), which of their fields, and which
rules the shared data must meet before serviceBW accepts it. Agents build connections as drafts:
a draft is stored at once, may be incomplete between calls, and is never live.

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
5. **Check and test.** Run the rule checks and test the rules with fictitious applicants; resolve
   what they find before publishing.
6. **Publish with approval.** Publishing needs the team member's approval through a link (see the
   skill `publishing-and-live-connections`).
7. **The connection URLs.** Once published, the connection has a trigger URL and one pull URL per
   variant, which the team member copies into serviceBW.

## Reading what is there

- `search_connections` finds connections by a part of their name or description (letter case
  doesn't matter) and by status: `draft`, `live` or `deactivated`. It answers at most 25 at a
  time, the most recently changed first; pass its `next_cursor` to read the next page. Each
  connection comes with its id and link.
- `get_connection` reads one connection: its documents and fields, its variants with how many
  rules and groups each has (read the rules themselves with `get_variant`), its connection URLs
  once published, and for a draft its version, its step and `dropped`: requested data the wallet
  no longer offers, which must be removed before publishing.

## Creating a draft and changing its name

- `create_draft` takes the `name` and an optional `description` and creates a draft with the
  main variant "Standard", no documents and no rules, at the connection step. It answers the
  connection and its Standard variant with their links. An agent can create only a limited number
  of drafts per hour: past it, the call is refused with the time from which it can create drafts
  again (`rate_limited`), so don't create a draft to try something out.
- `update_connection` changes a draft's `name` or `description` (at most 500 characters);
  `description: null` or `''` clears it. The name can't be empty.

Every tool that changes a draft works on drafts only: a published connection's content is changed
in the Connection Portal, and the tool answers `published_read_only` for it, whatever your access
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
opens the draft in the Connection Portal continues there. Every change stores the furthest step the
content reaches: the rules step once any variant has a rule, the documents step once a document is
requested, the connection step otherwise. Each answer's text says the draft's version and step.

## What to tell the team member

- What you changed, with the links of the connection, variants and rules you touched, so that they
  can open them in the Connection Portal.
- What is still missing before the draft can be published: documents without fields, incomplete
  rules, missing messages, findings of the rule checks.
- For approval: the link, what will happen when they approve, and that the link expires after a few
  minutes. Never claim that something was published, deactivated or deleted before the outcome
  says so.
