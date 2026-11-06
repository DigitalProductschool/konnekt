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

## One change per call

Every change is one call and is stored at once: adding a document, renaming a variant, adding one
rule, changing one condition. There is no "save" step and nothing to undo in bulk. If another team
member saves the same draft meanwhile, the change is applied again to their version; if the
draft keeps changing, try again a little later.

## The draft's step

A draft remembers how far its content reaches, as the editor's wizard does: the connection step
(name and description), the documents step, the rules step and the test step. The team member who
opens the draft in the Connection Portal continues there.

## What to tell the team member

- What you changed, with the links of the connection, variants and rules you touched, so that they
  can open them in the Connection Portal.
- What is still missing before the draft can be published: documents without fields, incomplete
  rules, missing messages, findings of the rule checks.
- For approval: the link, what will happen when they approve, and that the link expires after a few
  minutes. Never claim that something was published, deactivated or deleted before the outcome
  says so.
