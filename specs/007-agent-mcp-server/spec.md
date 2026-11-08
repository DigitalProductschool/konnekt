# Feature Specification: Agent Access through an MCP Server

**Feature Branch**: `007-agent-mcp-server`

**Created**: 2026-11-04

**Status**: Draft

**Input**: User description: "MCP server for AI agents: create, change and inspect form connections
through agents, with sign-in, approval and skills

## Context
DO.IT team members want to use LLM agents that run on their own machine (Claude Code, Cursor, Codex
and other MCP clients) to create, change and inspect form connections through an MCP server, at the
granularity of the UI: create a connection, set its name and description, add a document, choose
its fields, add a variant, add, edit, group and delete rules, and so on. The agent must be able to
take a connection from nothing to live, and to retrieve its connection URLs. This builds on spec 005
(connection drafts) and spec 006 (an optional description in place of the serviceBW form), both
treated as implemented: agents work on drafts, which may be incomplete between calls.

Decisions from the discussions on 2026-11-04 and 2026-11-05 (binding for this spec):

1. **What agents may change**: agents create and edit drafts. The content of a published connection
   (its name, description, documents, variants and rules) is read-only for agents at every access
   level. Agents with the access level "Read, edit drafts and manage live connections" (point 4)
   can also deactivate, reactivate and delete published connections, each with approval (point 3).
   "Pending changes" on published connections stay out of scope, as in spec 005. An agent given the
   link of a rule in a published connection can read it but not change it.

2. **One implementation of the rules logic**: the MCP server is a TypeScript service that reuses the
   pure rules logic of `frontend/src/utils/rules/` (the propagation from Standard to the variants
   based on it, `propagateMain`; the validation with the server's own messages; the rule checks of
   spec 003; the evaluator of spec 004) and calls the backend's management API on behalf of the
   person. Each tool that changes a draft reads it, applies the same pure function the UI applies,
   and saves the whole draft with its version (spec 005's draft save). The server's existing checks
   stay the safety net. There must not be a second implementation of propagation. (Where the
   service lives and the constitution amendment it needs, a third deployable with Node outside
   `frontend/` or a second build target inside it, are for the plan.)

3. **Approval for outward-facing and destructive actions, enforced by the server**: publishing a
   draft, deleting a draft, and deactivating, reactivating and deleting a published connection.
   Such a tool doesn't act: it creates a pending action and returns a link to an approval page in
   the Connection Portal (sent as an MCP URL-mode elicitation when the client supports it, in the
   tool's result otherwise). The action runs only when the same signed-in team member who
   authorized the agent approves it there. The page shows exactly what will happen: for
   publishing, the summary and the findings, as the wizard's Publish step does; for deactivating
   or deleting a published connection, which connection URLs stop working; for reactivating, which
   work again; for deleting a draft, that its content is gone for good. The link expires after a
   few minutes; a declined or expired action does nothing. Every other write, anything that only
   changes a draft, needs no approval. Out of scope: an agent that controls the person's browser
   and approves on its own.

4. **Sign-in for agents**: standard MCP authorization (OAuth 2.1, authorization code with PKCE). The
   backend is the authorization server and the MCP server the protected resource (protected
   resource metadata, resource indicators; Client ID Metadata Documents preferred, dynamic client
   registration as fallback). The MCP client opens the browser, the team member signs in to the
   Connection Portal (or uses their session) and sees a consent page that names the client and
   offers three access levels, each including the one before: "Read only"; "Read and edit drafts";
   and "Read, edit drafts and manage live connections", which also lets the agent deactivate,
   reactivate and delete published connections (point 1). Access tokens are short-lived, with
   rotating refresh tokens. An agent can ask for a higher access level later (the protocol's
   insufficient_scope step-up), which needs a new consent, and the team member can change it on
   their user page (point 5). For clients without OAuth, a team member can create a personal access
   token on their user page, with the same choice of access. Accounts are still managed with the
   CLI, and there are no roles.

5. **User page**: a new page, reached from the user menu at the top right, lists the team member's
   active agent authorizations (client name, access level, when connected, when last used) and
   personal access tokens, and lets them change the access level of each one, higher or lower, or
   revoke it. A new access level applies from the agent's next call, without connecting it again.
   An activity log or audit trail is out of scope for now.

6. **Links to connections, variants and rules**: a draft's variants get a stable identifier when
   they are created, which they keep when the draft is published (today a draft's variants have no
   identifier). A URL opens the editor at a given rule, group or variant (for example
   `/form-connections/{id}/edit?step=rules&variant={variant}&item=rule-7`), for people and agents
   alike. "Copy link" is added to the ⋯ menus of rules, groups and variants. Every tool accepts a
   Connection Portal URL wherever it takes an identifier, and every result gives the Portal links
   of what it touched, so the team member can open it.

7. **Small, granular reads and a clear tool set**: there may be many connections, so agents find
   them by search, with a status filter and paging (the list endpoint has neither today), and read
   in layers: a connection with its documents and its variants with counts; a variant's rules; one
   rule. The catalog's fields, kinds and operators come per document type on request, and long
   value sets (countries) are searched, never listed whole. Tools whose parameters overlap are
   merged (for example one tool updates a rule's name, condition and message; one updates a
   variant), aiming at about 20 tools. The tools cover everything the create flow and the details
   do today: name and description; documents and their fields; variants (add based on Standard
   or empty, rename, describe, delete, the top-level AND/OR and resetting it); rules and groups
   (add, edit target, condition, message and name, duplicate, delete, group, ungroup, sub-groups, a
   group's AND/OR and message, copy to a variant, reset to Standard, remove from a variant,
   restore); publishing; deactivating, reactivating and deleting a published connection; deleting
   a draft; and the connection URLs.

8. **Rule checks and tests for agents**: a tool returns the findings of spec 003 for one variant or
   all of them, as explicit as possible for an LLM (which rule or group, what kind of finding, why,
   and what would resolve it). A tool evaluates fictitious applicants that the agent supplies
   against a variant's rules, with spec 004's evaluator, and returns the outcome per rule and
   group. This supersedes, for agents, spec 003's rule that findings appear only in the Rules step
   and the publish dialog, and spec 004's FR-021. The personas of the UI are still never sent
   anywhere; the agent supplies its own applicants and must not use real people's data.

9. **Guidance for the LLM**: three layers from one source in the repository: short MCP server
   instructions; the same skills served through the MCP Skills extension (SEP-2640), plus a
   get_guide(topic) tool for clients without that extension; and the SKILL.md files packaged as a
   Claude Code plugin (MCP configuration plus skills) that other agents can also use. The skills
   are written as part of this feature (topics: the workflow from draft to live, variants and
   propagation, conditions per kind of data including Germany's calendar day, documents and the
   catalog, access levels, publishing, managing live connections and approval, links). Every change
   to the MCP tools must update the skills in the same change, and CLAUDE.md gets that rule.

10. **Other decisions**:
- The UI doesn't say that an agent changed a draft: another team member could too, and spec 005's
  conflict handling ("Reload" or "Replace their changes") covers both.
- "Final links" means the connection URLs: the trigger URL and the pull URL of each variant,
  available only once the connection is published.
- The LLM runs locally: the MCP server is reached from the team member's machine at the
  deployment's address.
- A limit on how many drafts one agent can create per hour, configurable in the backend's settings
  (environment variable) with a sane default.
- Out of scope: serviceBW's connection URLs themselves (`/api/connect/`), document requests,
  citizens' data, account management, an activity log, changes to a published connection's
  content, pending changes on published connections.
- The connection set-up (names, descriptions, rules, messages) reaches the LLM provider the team
  member uses; it holds no citizens' data, and DO.IT has approved this."

## Clarifications

### Sessions 2026-11-04 and 2026-11-05

Decisions from the discussions on 2026-11-04 and 2026-11-05:

- Q: What may agents change? → A: Drafts (spec 005), with "Read and edit drafts" or higher. The
  content of a published connection (its name, description, documents, variants and rules) is
  read-only for agents at every access level. Changes to a published connection that are stored
  but not yet live stay out of scope, as in spec 005.
- Q: Can agents deactivate, reactivate or delete a live connection? → A: Yes, with the access level
  "Read, edit drafts and manage live connections", and each action needs the team member's
  approval. The other two access levels can't.
- Q: Which agent actions need the team member's approval? → A: Publishing a draft, deleting a
  draft, and deactivating, reactivating and deleting a published connection. The approval is given
  in the management interface, by the team member the agent acts for, on a page that shows what
  will happen. An agent that controls the team member's browser and approves by itself is out of
  scope.
- Q: How do agents sign in? → A: With the protocol's standard authorization in the browser: the
  team member signs in to the management interface and consents, choosing one of three access
  levels: "Read only", "Read and edit drafts", or "Read, edit drafts and manage live connections".
  A personal access token from the user page, with the same choice, is the fallback for clients
  that can't do this.
- Q: Can a team member change an agent's access after connecting it? → A: Yes. On the user page,
  they can raise or lower the access level of each agent connection and personal access token, or
  revoke it. The new level applies from the agent's next call, without connecting it again.
  Revoking, or lowering the level, cancels the agent's waiting approval requests that it could no
  longer make.
- Q: Is there an activity log? → A: Not in this feature. The user page lists the team member's
  connected agents and tokens and lets them change or revoke each one.
- Q: May agents receive the findings of the rule checks and test applicants against the rules? →
  A: Yes, as explicitly as possible. This supersedes spec 003, FR-020 and spec 004, FR-021 for
  agents only. The agent supplies its own fictitious applicants; the personas of the test step are
  never sent.
- Q: How does the agent learn to use the tools? → A: Short instructions from the MCP server; skill
  documents served by the MCP server and through a guide tool; and the same skills packaged for
  Claude Code and as files for other agents. They are written with this feature, from one source,
  and every change to the tools updates them.
- Q: Does the management interface say that an agent changed a draft? → A: No. A colleague could
  have changed it too, and spec 005's conflict handling covers both.
- Q: What are the "final links" the agent retrieves? → A: The connection URLs: the trigger URL and
  each variant's pull URL, once the connection is published.
- Q: Where do agents run? → A: On the team member's own machine, reaching the MCP server at the
  deployment's address.
- Q: How are runaway agents contained? → A: A limit on the drafts one agent connection creates per
  hour, set in the middleware's settings, with a default.
- Q: May a connection's set-up (names, descriptions, rules, messages) reach the LLM provider that
  a team member's agent uses? → A: Yes. DO.IT has approved the MCP server, which sends no data about
  citizens.

### Session 2026-11-06

- Q: What happens when an agent gives a rule a check that its data doesn't offer, such as a text
  check on a value list? → A: The change is refused with the data's checks, as the editor offers
  only those; a rule without a condition is still stored as incomplete. Changing a rule's data to
  data of another kind without a new check drops the check, as the editor does, and the answer
  says so.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Connect an agent and let it read the connections (Priority: P1)

A team member wants an LLM agent on their own machine to help with form connections. They add the
middleware's MCP server to their agent. The first time the agent connects, the browser opens the
management interface. The team member signs in if needed, sees which program asks for access,
chooses how much it may do (only read; also edit drafts; or also manage live connections), and
allows it. From then on the agent acts on their behalf: it can find connections by name or
description, read a connection, its variants and its rules, and read the catalog of documents,
without loading everything at once. On their user page, reached from the user menu, the team
member sees every agent connected to their account, and can change the access level of each one or
revoke it.

**Why this priority**: Nothing else works without a connected agent, and reading alone is already
useful: an agent can explain a connection's rules, compare connections or answer questions about
them.

**Independent Test**: Connect an MCP client with "Read only". Check that the agent finds a connection
among many by part of its name, reads its documents and one variant's rules, and is refused when it
tries to change a draft. Check that the user page lists the client with read-only access. Raise it
to "Read and edit drafts" and check that the agent can now change a draft without connecting again;
lower it to "Read only" and check that the next change is refused. Revoke it, and check that the
agent's next call is refused.

**Acceptance Scenarios**:

1. **Given** a team member whose MCP client knows the middleware's MCP address, **When** the client
   connects for the first time, **Then** the browser opens the management interface, which shows,
   after a sign-in if needed, a consent page with the client's name and the choice of "Read only",
   "Read and edit drafts" or "Read, edit drafts and manage live connections", each with what it
   allows; after "Allow", the client is connected without the team member copying anything.
2. **Given** that consent page, **When** the team member denies access, **Then** the client gets no
   access.
3. **Given** an agent with "Read only", **When** it tries to change a draft, **Then** the change is
   refused with a message that its access is read only and that changing drafts needs "Read and
   edit drafts", and the client can ask for more access, which shows the consent page again.
4. **Given** 1,000 stored connections, **When** the agent searches for part of a name or of a
   description, optionally only among drafts or only among published connections, **Then** it
   receives one page of short entries (name, description, status, last change, link) and can ask
   for the next page.
5. **Given** a connection, **When** the agent reads it, **Then** it first receives an overview (name,
   description, status, documents with their fields, variants with their origin and number of
   rules, links), and receives the rules of one variant, or one rule, only when it asks for them.
6. **Given** a published connection, **When** the agent asks for its connection URLs, **Then** it
   receives the trigger URL and the pull URL of each variant, labelled with the variant's name. For
   a draft, it is told that the URLs exist once the draft is published.
7. **Given** connected agents, **When** the team member opens their user page from the user menu,
   **Then** they see each of their agent connections (client name, access, when connected, when last
   used) and each of their personal access tokens, and nobody else's.
8. **Given** a connected agent, **When** the team member revokes it on the user page and confirms,
   **Then** the agent's next call is refused, and it has to be connected again.
9. **Given** a connected agent, **When** the team member changes its access level on the user page,
   choosing among the three levels shown as on the consent page, **Then** the new level applies from
   the agent's next call, without connecting it again: a lower level refuses what it no longer
   allows (FR-003), and a higher level allows more without the consent page.
10. **Given** a client that can't use the browser sign-in, **When** the team member creates a
    personal access token on the user page with a name, an access level and an expiry, **Then** the
    token is shown once, the client can use it instead of the browser sign-in, and the token is
    listed, its access level can be changed, and it can be revoked, like an agent connection.
11. **Given** a team member whose account is deleted with the account tool, **When** any of their
    agents calls, **Then** the call is refused (spec 001, FR-007).

---

### User Story 2 - Build a draft with an agent, one change at a time (Priority: P2)

The team member describes a form's requirements to the agent: the documents it needs, the
conditions for applicants, the variants. The agent creates a draft and builds it up one change at a
time, as a team member does in the create flow: name and description, documents and fields,
variants, rules and groups. Each change is stored at once, as "Save and exit" stores a draft, so the
draft may be incomplete between calls. Changes to Standard reach the variants based on it exactly as
they do in the editor. The team member can open the draft in the management interface at any time
and see what the agent did.

**Why this priority**: Preparing a connection from a description is the main reason for agents. It
needs User Story 1, and is independent of publishing, since a team member can publish the draft in
the management interface.

**Independent Test**: With an agent that may edit drafts, create a draft with a name, add two
documents and choose their fields, add a variant based on Standard and one that starts empty, add
rules to Standard and group two of them, change one of Standard's rules in the based variant, and
delete another of Standard's rules. Open the draft in the management interface and check that it
shows exactly what the same actions in the editor would have produced, marks included. Try to change
a rule of a published connection and check that it is refused, also with "Read, edit drafts and
manage live connections".

**Acceptance Scenarios**:

1. **Given** an agent that may edit drafts, **When** it creates a connection with a name, and
   optionally a description, **Then** a draft is stored (spec 005), the overview lists it as a
   draft, and the result gives the draft's link in the management interface.
2. **Given** a draft, **When** the agent makes any change the create flow offers (FR-012), one per
   call, **Then** each change is stored at once, and a draft that is incomplete in between (no
   documents, a rule without a condition or on data that isn't requested, a variant without rules)
   is accepted, as "Save and exit" accepts it (spec 005, FR-004).
3. **Given** a draft with a variant based on Standard that changed one of Standard's rules, **When**
   the agent adds, changes or deletes rules of Standard, **Then** the variant follows as it does in
   the editor (spec 002, FR-021 to FR-024): new rules appear in it, unchanged rules follow, and the
   rule it changed keeps the variant's version.
4. **Given** a change that the editor would refuse or doesn't offer, such as a rename that clashes
   in a variant or a condition with a check that the rule's data doesn't offer, or a change that
   breaks the structure, such as a document type the catalog doesn't know, **When** the agent makes
   it, **Then** it is refused with a message that names the problem, the item and its variant, and
   says what the agent can do instead (for a check, the data's checks), and the draft stays as it
   was.
5. **Given** a draft that an agent built, **When** a team member continues it in the management
   interface, **Then** the create flow opens at the furthest step that the draft's content reaches,
   with everything the agent stored.
6. **Given** a team member who has a draft open in the editor while an agent changes it, **When** the
   team member saves, **Then** spec 005's conflict applies ("Reload" or "Replace their changes"), and
   its message doesn't say whether an agent or a person saved in between. **When** the agent next
   changes the draft, **Then** its change applies to the draft as stored then.
7. **Given** a published connection, **When** an agent at any access level tries to change its
   content (its name, description, documents, variants or rules), **Then** the call is refused
   with a message that a published connection's content is changed in the management interface,
   and nothing changes.
8. **Given** an agent connection that has created as many drafts in the past hour as the limit
   allows, **When** it creates another, **Then** it is refused with a message that says when it can
   create drafts again. Changes to existing drafts aren't limited by this.
9. **Given** a draft, **When** the agent sets a description longer than 500 characters, **Then** it
   is refused with a message that names the limit, as the editor refuses it (spec 006, FR-003).
   **When** the agent clears the description, **Then** the draft has none, and that blocks neither
   continuing the draft in the management interface nor publishing it (spec 006, FR-002).
10. **Given** a rule with a condition, **When** the agent changes its data to data of another kind,
    or of another value set, without giving a new condition, **Then** the condition is dropped, as
    the editor drops it, and the answer says so and names the new data's checks; data of the same
    kind and value set keeps the condition. **When** the agent gives the new condition in the same
    call, **Then** it is checked against the new data.

---

### User Story 3 - Publish or delete a draft with the team member's approval (Priority: P3)

When the draft is complete, the agent asks to publish it. Publishing puts the connection live for
serviceBW, so the agent can't do it alone: it receives a link to an approval page in the management
interface and passes it on, and the client shows it where it can. On that page the team member sees
what will go live, with the findings of the rule checks, and approves or declines. Once the draft is
published, the agent can read the connection URLs and hand them over. Deleting a draft works the
same way, because the deleted work can't be recovered.

**Why this priority**: It completes the path from nothing to live through the agent. Without it, the
team member publishes the draft from the management interface, which still works.

**Independent Test**: Ask an agent that may edit drafts to publish a complete draft. Check that
nothing is live yet, open the link it gives, check that the page shows the draft's content and
findings, approve, and check that the connection is live and that the agent reads its trigger and
pull URLs. Repeat with a decline, an expired link, a draft changed after the request, another team
member opening the link, and a deletion of a draft.

**Acceptance Scenarios**:

1. **Given** a complete draft, **When** the agent asks to publish it, **Then** nothing is published,
   and the agent receives the link to an approval page and the time it expires; a client that
   supports it asks the team member to open the link.
2. **Given** a draft that publishing would refuse, **When** the agent asks to publish it, **Then** the
   request is refused at once with the messages that publishing gives (spec 005, FR-009), and no
   approval link is made.
3. **Given** an approval link, **When** the team member the agent acts for opens it, **Then** the page
   shows what will go live, as the publish step shows it: the name, the description, the documents
   and their fields, each variant with its rules, and the findings of the rule checks; and it offers
   to approve or decline.
4. **Given** that page, **When** the team member approves, **Then** the draft is published exactly as
   from the editor (spec 005, FR-009), the page says so and shows the connection URLs, and the agent
   learns the outcome and can read the URLs.
5. **Given** a draft that changed after the approval was requested, **When** the team member opens or
   approves the request, **Then** the page says that the draft changed, nothing is published, and the
   agent has to ask again.
6. **Given** an approval link, **When** another team member opens it, **Then** they can't approve it.
   **When** it is opened after it expired, or after it was approved or declined, **Then** it does
   nothing and says why.
7. **Given** that the team member declines, **When** the agent asks for the outcome, **Then** it
   learns that the request was declined, and the draft is unchanged.
8. **Given** a draft, **When** the agent asks to delete it and the team member approves on the page,
   which names the draft and says that its content will be gone for good, **Then** the draft is
   deleted as spec 005, FR-010 says.
9. **Given** that publishing fails on approval because the wallet-communication service doesn't
   answer, **When** the page shows the failure, **Then** the draft stays a draft, and the team member
   can try again from the page while the request is valid.

---

### User Story 4 - Point an agent at a connection, a variant or a rule with a link (Priority: P4)

A team member wants the agent to work on one rule, so they copy its link from the rule's ⋯ menu and
paste it into the conversation. The agent finds exactly that rule in that variant, without
searching. The same links work for people: opening one in the browser opens the editor at that rule.
And every result the agent gives contains links, so that the team member can open what it read or
changed.

**Why this priority**: It makes the agent precise and saves a search, but every tool also works with
identifiers and search.

**Independent Test**: Copy the links of a rule in a based variant of a draft, of a group and of a
variant. Open each in a browser and check that the editor shows that item. Give the rule's link to
the agent and ask it to change the rule's message; check that the right rule changed. Publish the
draft and check that the links copied before still open the same items.

**Acceptance Scenarios**:

1. **Given** the rules step, **When** the team member opens the ⋯ menu of a rule, a group or a
   sub-group, or of a variant's tab, and chooses "Copy link", **Then** a link to that item in that
   variant is copied, and the interface says so.
2. **Given** such a link, **When** a signed-in team member opens it, **Then** the connection's editor
   opens at the rules step with that variant shown and the item in view (the create flow for a
   draft, the edit flow for a published connection). A signed-out team member signs in first and
   then gets there.
3. **Given** such a link, or the address of a connection's page, **When** the team member gives it to
   the agent, **Then** the agent reads that item, or changes it if it belongs to a draft.
4. **Given** a draft whose links were copied, **When** it is published, or the item or its variant is
   renamed, **Then** the links still lead to the same items.
5. **Given** a link to a connection, variant, rule or group that has since been deleted, **When** it
   is opened or given to the agent, **Then** the interface or the agent says that it no longer
   exists, and nothing else opens in its place.
6. **Given** any tool result, **Then** it contains the links of the connections, variants, rules and
   groups it read or changed.

---

### User Story 5 - Let the agent check and test its rules (Priority: P5)

Agents get rules wrong: a condition that contradicts another, a variant that no applicant can meet.
The rules step points such things out to people (spec 003), and the test step shows how sample
applicants fare (spec 004). Agents get the same help. They can ask for the findings of the rule
checks, explained explicitly, and they can test a variant's rules against fictitious applicants they
make up, to see who would be accepted and which messages a citizen would see.

**Why this priority**: It raises the quality of what agents build, but drafts can be built and
published without it, and the approval page shows the findings to the team member in any case.

**Independent Test**: Build a draft with two conflicting rules, a duplicate rule and a variant that no
applicant can meet. Ask the agent for the findings and check that they match those of the rules step
for the same rules, each with the rules involved, the reason and a way to resolve it. Test the
variant with three fictitious applicants and check the outcomes against the test step's.

**Acceptance Scenarios**:

1. **Given** a connection, draft or published, **When** the agent asks for the findings of one
   variant or of all, **Then** it receives every finding the rules step would show for the same rules
   (spec 003, FR-002 to FR-010), each with its variant, the rule or group and its link, its kind, why
   it holds, naming the other rules involved, and what would resolve it.
2. **Given** rules that the checks don't cover (an incomplete condition, data that isn't requested),
   or a variant that couldn't be checked completely in time, **When** the agent asks for the
   findings, **Then** the answer says so, per rule and per variant, so that "no findings" isn't
   mistaken for "everything checked".
3. **Given** a variant and one or more fictitious applicants that the agent describes, with values
   for the data the rules check, **When** the agent tests them, **Then** it receives for each
   applicant whether they meet the variant, the outcome of each rule and group (met, not met, or not
   checked with the reason) and the messages the citizen would see, exactly as the evaluation would
   deliver them to serviceBW on that day (spec 002, FR-010 to FR-014).
4. **Given** a test without a day, **When** the agent runs it, **Then** the day of sharing is today in
   Germany. The agent can name another day.
5. **Given** a value that doesn't fit its field's kind, **When** the agent tests, **Then** the test
   is refused before anything is evaluated, with a message that names the applicant, the field
   and the kind of value it expects.
6. **Given** any check or test, **Then** neither the applicants, nor the results, nor the findings are
   stored or logged.

---

### User Story 6 - Guidance that teaches the agent the product (Priority: P6)

An agent knows nothing about form connections, variants that follow Standard, marks, or how dates
count in Germany. The MCP server tells it the essentials when it connects, and offers longer guidance
by topic: as skill documents for clients that read them, and through a guide tool for those that
don't. For Claude Code, the team member installs one package that brings the MCP server's
configuration and the skills; for other agents, the same skill files can be copied. The guidance is
written with this feature and kept in step with the tools.

**Why this priority**: It makes every other story work better, but it adds to them: the tools and
their descriptions alone are usable.

**Independent Test**: Connect two different MCP clients, one that reads skills from the MCP server and
one that doesn't. Check that both receive the instructions and can read every topic. Install the
Claude Code package and check that it adds the MCP server and the skills. Change a tool without
changing the guidance and check that the quality gates fail.

**Acceptance Scenarios**:

1. **Given** an agent that connects, **Then** it receives short instructions: what connections,
   drafts, variants and Standard are, the order of work from a draft to a live connection, the three
   access levels, that a published connection's content is read-only for it, and that publishing
   or deleting a draft, and deactivating, reactivating or deleting a published connection, need the
   team member's approval.
2. **Given** a client that supports the protocol's skills, **When** the agent lists them, **Then** it
   finds the skills by topic and can read each. **Given** a client that doesn't, **When** the agent
   calls the guide tool with a topic, **Then** it receives the same text.
3. **Given** Claude Code, **When** the team member installs the package, **Then** the MCP server and
   the skills are added in one step.
4. **Given** the guidance, **Then** it covers at least: the workflow from a description to a live
   connection; variants, Standard, and how Standard's changes reach based variants; conditions per
   kind of data, including dates on Germany's calendar day; documents and the catalog; the access
   levels; publishing, deactivating, reactivating and deleting, and approval; links; and checks and
   tests, with the rule never to use real people's data.
5. **Given** a change to a tool, **When** the guidance doesn't describe the changed tool, **Then** the
   quality gates fail.

---

### User Story 7 - Deactivate, reactivate or delete a live connection with approval (Priority: P7)

A serviceBW form is paused or retired, and the team member asks the agent to deactivate its
connection, to reactivate it later, or to delete it. These actions change what serviceBW's forms can
do, so they need more than editing drafts: the team member gives the agent "Read, edit drafts and
manage live connections" when connecting it, or later, when the agent asks for it or on the user
page. Even then the agent can't act alone: as for publishing, it receives a link to an approval page
that shows which connection URLs stop or start working, and the team member approves or declines.
The agent never
changes a published connection's content: its name, description, documents, variants and rules
are changed in the management interface.

**Why this priority**: It lets the agent look after a connection after it went live, but the team
member can deactivate, reactivate and delete in the management interface, which still works, and
every other story is useful without it.

**Independent Test**: Connect an agent with "Read and edit drafts" and ask it to deactivate a live
connection: check that it is refused and that its client can ask for the higher access level, which
shows the consent page. Allow "Read, edit drafts and manage live connections", ask again, check that
nothing has changed yet, open the link the agent gives, check the page, approve, and check that the
connection's URLs answer "unavailable". Repeat with reactivating and deleting, with a decline, and
with a connection deactivated in the management interface while the request waits. Ask the agent to
change a rule of the live connection and check that it is refused.

**Acceptance Scenarios**:

1. **Given** an agent with "Read only" or "Read and edit drafts", **When** it asks to deactivate,
   reactivate or delete a published connection, **Then** it is refused with a message that its
   access doesn't include managing live connections, and no approval link is made. The client can
   ask for "Read, edit drafts and manage live connections", which shows the consent page again, or
   the team member can raise the agent's access level on the user page.
2. **Given** an agent with "Read, edit drafts and manage live connections" and a live connection,
   **When** the agent asks to deactivate it, **Then** nothing changes yet, and the agent receives
   the link to an approval page and the time it expires, as for publishing (User Story 3).
3. **Given** that approval link, **When** the team member the agent acts for opens it, **Then** the
   page names the connection and shows its description, lists the connection URLs that will answer
   "unavailable" until the connection is reactivated, says that requests in progress are cancelled,
   and offers to approve or decline.
4. **Given** that page, **When** the team member approves, **Then** the connection is deactivated
   exactly as from the management interface (spec 001, FR-006), the page says so, and the agent
   learns the outcome.
5. **Given** a deactivated connection, **When** the agent asks to reactivate it and the team member
   approves on the page, which lists the connection URLs that will work again, **Then** the
   connection works again with the same URLs, and the agent can read them.
6. **Given** a published connection, live or deactivated, **When** the agent asks to delete it,
   **Then** the approval page names the connection, lists the connection URLs that will stop working
   for good, and says that requests in progress are cancelled and that deleting can't be undone.
   **When** the team member approves, **Then** the connection is deleted exactly as from the
   management interface (spec 001, FR-006).
7. **Given** a connection, **When** the agent asks to deactivate it while it is already
   deactivated, or to reactivate it while it is live, **Then** it is refused at once with a message
   that gives the connection's status, and no approval link is made.
8. **Given** an approval request for a published connection, **When** the connection is
   deactivated, reactivated or deleted in the management interface before the team member approves,
   **Then** approving does nothing, and the page says what changed.
9. **Given** an agent with "Read, edit drafts and manage live connections", **When** it tries to
   change a published connection's content, **Then** it is refused as at every other access level
   (User Story 2, scenario 7).

---

### Edge Cases

- **An ambiguous name**: A draft may hold two variants or rules with the same name (spec 005,
  FR-004). An agent that names one by name only, when two match, is refused with the candidates and
  their links (FR-019).
- **A connection without a description**: Allowed at every step, publishing included (spec 006,
  FR-002). Answers leave the description out, a search by description doesn't find it, and the
  approval page shows nothing in its place (FR-023).
- **A connection's description and a variant's description**: Two different things. The first
  replaces the serviceBW form (spec 006); the second belongs to a variant (spec 002). Tools name
  which one they read or change.
- **A link from another deployment**: A link whose address isn't this management interface's, such
  as a preview deployment's, is refused as not belonging to it (FR-030).
- **The same rule in several variants**: A rule of Standard and its copy in a based variant share an
  identifier (spec 002, FR-010), so an identifier alone doesn't say which variant is meant. Links and
  tools always name the variant (FR-028).
- **Two agents, or an agent and a team member, change one draft at once**: Each change applies to the
  draft as stored when it is made, and no change silently undoes another one saved in between
  (FR-015). A team member who saves an outdated version in the editor meets spec 005's conflict.
- **The draft is published or deleted in the management interface while the agent works on it**: The
  agent's next change is refused as for a published connection (FR-018) or with "deleted" (spec 005,
  FR-024).
- **A draft that changes while an approval is waiting**: The approval no longer applies (FR-024). A
  new request for the same draft and action replaces the older one.
- **The draft is published in the management interface while an approval is waiting**: Approving does
  nothing, and the page says that the draft has been published.
- **A published connection deactivated, reactivated or deleted in the management interface while an
  approval is waiting**: Approving does nothing, and the page says what changed (FR-024). A change
  to the connection's content in the management interface doesn't affect the request, which applies
  to the connection's status.
- **Deactivating or reactivating a draft**: Refused, since a draft has nothing live (spec 005,
  FR-007). Deleting a draft needs "Read and edit drafts" and approval (FR-021).
- **Deleting a deactivated connection**: Allowed with "Read, edit drafts and manage live
  connections" and approval. The approval page says that its URLs, which already answer
  "unavailable", will do so for good.
- **An approval link opened while signed out**: The team member signs in and returns to the page. If
  they sign in as someone else, they can't approve (FR-025).
- **Signing out of the browser**: Ends the browser session only. Agent connections and tokens stay
  until they are revoked or expire, or the account is deleted (FR-005).
- **Access changed on the user page while the agent works**: The agent's next call has the new
  level, without connecting again. A call already running finishes with the level it started with.
- **Access lowered or revoked while an approval is waiting**: A request that the new level doesn't
  allow, or any request of a revoked agent connection or token, is cancelled. Approving it does
  nothing, and the page says that the agent's access has changed (FR-006). An agent connection or
  token that ends while its request is waiting (FR-005) cancels it likewise, and the page says
  that the agent's access has ended.
- **A read-only agent that asks for findings or tests applicants**: Allowed, since nothing changes.
- **Findings and tests on a published connection**: Allowed: the agent reads them as it reads the
  rules.
- **A very large connection**: Up to 20 variants with 200 rules, groups and sub-groups each (spec 005,
  FR-003). The agent reads one variant at a time, so no answer holds all of a connection's rules
  (FR-008).
- **A catalog that dropped a document type or field that a draft requests**: The agent sees it
  pointed out, as the editor does (spec 005, Edge Cases), and has to remove it before publishing.
- **A lost personal access token**: Can't be shown again. The team member revokes it and creates a new
  one.
- **An agent that controls the team member's browser**: Out of scope (Clarifications). Approval
  protects against agents that act only through the MCP server.
- **A changed limit on new drafts**: The new limit applies from the agent's next new draft.

## Requirements *(mandatory)*

### Functional Requirements

#### Connecting agents (User Story 1)

- **FR-001**: The middleware MUST offer an MCP server through which an agent acts on behalf of one
  team member. Every call MUST need a valid authorization from that team member, and MUST be refused
  without one.
- **FR-002**: A team member MUST be able to connect an MCP client by signing in to the management
  interface in the browser, with the protocol's standard authorization, without copying codes or
  secrets by hand. The consent page MUST name the client as it identifies itself and MUST offer
  three access levels, each with a short description of what it allows: "Read only", "Read and edit
  drafts", and "Read, edit drafts and manage live connections" (FR-003). Denying MUST give no
  access.
- **FR-003**: Each access level MUST allow everything the one before it allows, and more:
  - "Read only" MUST allow every tool that reads, checks or tests, and MUST refuse every change.
  - "Read and edit drafts" MUST also allow the changes to drafts (FR-012) and requests to publish
    or delete a draft (FR-021).
  - "Read, edit drafts and manage live connections" MUST also allow requests to deactivate,
    reactivate or delete a published connection (FR-021).

  Every access level MUST refuse changes to a published connection's content (FR-018). An agent
  that tries something its access level doesn't allow MUST be refused with a message that names the
  access level it needs, and its client MUST be able to ask for that level, which needs the team
  member's consent again. The team member can also change the level on their user page (FR-006).
- **FR-004**: A team member MUST be able to create a personal access token on their user page, with a
  name, an access level as in FR-002, and an expiry of at most 90 days. The token MUST be shown once,
  when it is created, and MUST NOT be retrievable afterwards.
- **FR-005**: An agent connection MUST last until it is revoked, until it has gone unused for 30 days,
  or until the account is deleted; a personal access token until it is revoked, until it expires, or
  until the account is deleted. Deleting an account MUST end its agent connections and tokens at once
  (spec 001, FR-007). Signing out of the browser MUST NOT end them.
- **FR-006**: The user menu MUST lead to a user page that lists the signed-in team member's active
  agent connections (client name, access level, when connected, when last used) and personal access
  tokens (name, access level, when created, when it expires, when last used), and only theirs. For
  each one, the team member MUST be able to:
  - change its access level, higher or lower, choosing among the three levels, each shown with what
    it allows, as on the consent page. The new level MUST apply from the agent's next call, without
    connecting the agent again, and a token MUST keep its secret and its expiry;
  - revoke it after confirming. The agent's next call MUST then be refused.

  Revoking an agent connection or a token MUST cancel its waiting approval requests, and lowering
  its access level MUST cancel those that the new level doesn't allow (FR-026).

#### Reading (User Story 1)

- **FR-007**: Agents MUST be able to find connections by part of their name or description,
  filtered by status (draft; live, that is published and active; deactivated), in pages of at most
  25 short entries (name, description, status, last change, link), and to ask for the next page.
  A tool MUST NOT list more than one page of connections at once.
- **FR-008**: Agents MUST be able to read a connection in layers: an overview (name, description,
  status, documents and their fields, each variant with its name, description, origin and number of
  rules, and the links); the rules of one variant, as readable statements and in a structured form
  with identifiers and marks; and one rule or group. Every connection that a team member can see,
  draft or published (spec 005, FR-027), MUST be readable. Wherever an answer gives a connection's
  description, it MUST give it in full, never cut, and MUST leave it out when it is empty.
- **FR-009**: Agents MUST be able to read the catalog in layers: the document types; for one type,
  its fields, their kinds, parts and whether they can hold several values, and the conditions each
  kind offers; and the values of a value set, searched by text and in pages.
- **FR-010**: For a published connection, agents MUST be able to read its connection URLs: the
  trigger URL and the pull URL of each variant, labelled with the variant's name (spec 002, FR-025
  and FR-026). For a deactivated connection, the answer MUST say that the URLs answer "unavailable"
  until it is reactivated. For a draft, the answer MUST say that it has none until it is published.
- **FR-011**: Every tool's answer MUST contain the links of the connections, variants, rules and
  groups it read or changed (FR-028).

#### Changing drafts (User Story 2)

- **FR-012**: Agents with "Read and edit drafts" or "Read, edit drafts and manage live connections"
  MUST be able to make, on drafts, one change per call, every change that the create flow offers:
  - create a draft with a name and, optionally, a description; change its name; set, change and
    clear its description;
  - add and remove documents, and choose their fields;
  - add a variant, based on Standard or empty; rename it and change its description; delete it;
    switch its top-level AND/OR, and reset a based variant's AND/OR to Standard's;
  - add a rule; change a rule's name, document and field, condition and message; duplicate and
    delete it;
  - group rules, also into sub-groups; ungroup; change a group's name, AND/OR and message; delete a
    group;
  - copy a rule to other variants; in a based variant, reset an item to Standard, remove it from the
    variant, and restore it.

  Changes whose details overlap MUST be offered by one tool (for example, one tool changes any of a
  rule's name, condition and message), so that agents choose between few tools.
- **FR-013**: Each change MUST be stored at once as the draft's content, as "Save and exit" stores it
  (spec 005, FR-002 to FR-005): incomplete content is accepted, the structure is checked, and nothing
  is set up with the wallet-communication service.
- **FR-014**: Each change MUST store the same content as the same action in the editor, including how
  Standard's changes reach the based variants, the marks (spec 002, FR-021 to FR-024), the
  identifiers of new rules and groups (spec 002, FR-010), and which condition survives a change of
  a rule's data: the editor keeps it only when the new data has the same kind and value set and
  offers its check, and drops it otherwise. The editor and the agents' tools MUST use one
  implementation of that logic. A tool that drops a condition MUST say so in its answer.
- **FR-015**: Each change MUST apply to the draft as stored when it is made, and MUST NOT silently undo
  a change that another agent or a team member saved in between. A change counts as a save of the
  draft for spec 005's conflict handling (spec 005, FR-022), and the management interface MUST NOT
  say whether an agent or a team member made it.
- **FR-016**: A change that the editor would refuse, or that breaks the structure (spec 005, FR-003),
  MUST be refused with a message that names the problem, the item and its variant, in the editor's or
  the server's words, and says what the agent can do instead. The draft MUST stay as it was. A
  description longer than 500 characters, for example, MUST be refused with a message that names
  the limit (spec 006, FR-003). A condition whose check the rule's data doesn't offer MUST be
  refused with the data's checks, as the catalog lists them, although a draft stores a rule
  without a condition (spec 005, FR-004): the editor offers only the data's checks. Without data,
  a check that no kind of data offers MUST be refused likewise, with the checks per kind.
- **FR-017**: A draft that an agent created or changed MUST open, when a team member continues it, at
  the furthest step its content reaches: the rules step once it has a rule, the documents step once
  it has a document, and the connection step otherwise.
- **FR-018**: The content of a published connection (its name, description, documents, variants
  and rules) MUST be read-only for agents at every access level. Such a change MUST be refused with
  a message that a published connection's content is changed in the management interface.
  Deactivating, reactivating and deleting a published connection don't change its content: agents
  with "Read, edit drafts and manage live connections" MUST be able to ask for them, with approval
  (FR-021), and agents with another access level MUST be refused as FR-003 says.
- **FR-019**: Tools MUST let agents name connections, variants, rules and groups by identifier or by
  link. Where a tool also accepts a name, a name that matches more than one item MUST be refused with
  the candidates and their links.
- **FR-020**: An agent connection, or a personal access token, MUST NOT create more drafts per hour
  than a limit set in the middleware's settings, 20 unless set otherwise. A refusal MUST say when it
  can create drafts again. Changes to existing drafts MUST NOT count towards the limit.

#### Approval (User Stories 3 and 7)

- **FR-021**: Publishing a draft, deleting a draft, and deactivating, reactivating and deleting a
  published connection MUST need the approval of the team member the agent acts for, given in the
  management interface. The tool MUST NOT act itself: it MUST create an approval request and answer
  with the link to its approval page and the time it expires. Where the client supports it, the
  client MUST be asked to show the link to the team member.
- **FR-022**: Before an approval request is created, the action MUST be possible: a draft to publish
  MUST pass publishing's checks, with publishing's messages (spec 005, FR-009), for which the
  description is optional (spec 006, FR-002); a connection to deactivate MUST be live, and one to
  reactivate MUST be deactivated; a draft can't be deactivated or reactivated (spec 005, FR-007).
  Otherwise the request MUST be refused without an approval request, with a message that says why.
- **FR-023**: The approval page MUST show what will happen, and MUST offer to approve or to decline:
  - publishing: the name, the description, the documents and their fields, each variant with its
    rules, and the findings of the rule checks, as the publish step shows them;
  - deleting a draft: the draft's name, its last change, and that its content will be gone for
    good;
  - deactivating: the connection's name and description, the connection URLs that will answer
    "unavailable" until it is reactivated, and that requests in progress are cancelled;
  - reactivating: the connection's name and description, and the connection URLs that will work
    again;
  - deleting a published connection: the connection's name and description, the connection URLs
    that will stop working for good, that requests in progress are cancelled, and that deleting
    can't be undone.

  The description MUST appear as on the connection's details page (spec 006, FR-005 and FR-006): as
  written, on one line cut with "…" where it doesn't fit, and not at all when it is empty.
- **FR-024**: An approval MUST apply to the connection as it was when the request was made: for a
  draft, its content; for a published connection, its status (live or deactivated). If the draft has
  changed, been published or been deleted since, or the published connection has been deactivated,
  reactivated or deleted since, approving MUST do nothing, and the page MUST say why. A new request
  for the same connection and action MUST replace an older one.
- **FR-025**: Only the team member the agent acts for MUST be able to approve. Another team member
  MUST see that they can't. A signed-out team member MUST sign in first and then return to the page.
- **FR-026**: An approval request MUST expire 10 minutes after it was made. An expired, declined,
  replaced, cancelled (FR-006) or already used request MUST do nothing, and its page MUST say why.
  An approved request MUST act once.
- **FR-027**: An approved action MUST go through the same publishing, deactivating, reactivating and
  deleting as the management interface (spec 001, FR-006; spec 005, FR-009 and FR-010). If it fails,
  the connection MUST stay as it was (a draft stays a draft), the page MUST say so, and the team
  member MUST be able to try again from the page while the request is valid. The agent MUST be able
  to learn the outcome (waiting, done, declined, expired, replaced, cancelled, failed) and, once the
  connection is published or reactivated, read its connection URLs.

#### Links (User Story 4)

- **FR-028**: The rules step MUST offer "Copy link" in the ⋯ menus of rules, groups and sub-groups,
  and of variants. A copied link MUST name the connection, the variant and, for a rule or group, the
  item. The address of a connection's page MUST serve as the connection's link.
- **FR-029**: A link MUST contain identifiers only, no names and no content, and MUST lead to the same
  item after renaming and after publishing. For this, a draft's variants MUST have an identifier from
  the moment they are added, which they keep as the variants of the published connection. Drafts
  stored before this feature MUST get identifiers for their variants.
- **FR-030**: Opening a link in the browser MUST open the connection's editor at the rules step (the
  create flow for a draft, the edit flow for a published connection), with the variant shown and the
  rule or group in view. Tools MUST accept these links, and a connection's link, wherever they take
  an identifier, and MUST refuse links to another address.
- **FR-031**: A link to a connection, variant, rule or group that no longer exists MUST say so, in the
  management interface and to the agent, and MUST NOT open another item in its place.

#### Checks and tests (User Story 5)

- **FR-032**: Agents MUST be able to ask for the findings of the rule checks for one variant or for
  all variants of a connection, draft or published. The findings MUST be those that the rules step
  shows for the same rules (spec 003, FR-002 to FR-010), from the same checks. Each MUST give: the
  variant; the rule or group, with its name, identifier and link; its kind (conflicting, redundant,
  always met, a variant that no applicant can meet, a variant that every applicant meets); why it
  holds, naming the other rules involved; and what would resolve it.
- **FR-033**: The answer with the findings MUST say which rules the checks didn't cover and why (an
  incomplete condition, data that isn't requested), and whether each variant was checked completely,
  so that an answer without findings can't be mistaken for one that checked everything.
- **FR-034**: Agents MUST be able to test one variant's rules against one or more fictitious
  applicants they describe, with values for the data the rules check, on a day of sharing that is
  today in Germany unless they name another day. For each applicant, the answer MUST give whether
  they meet the variant, each rule's and group's outcome (met, not met, or not checked with the
  reason), and the messages the citizen would see, exactly as the evaluation would (spec 002, FR-010
  to FR-014). A value that doesn't fit its field's kind MUST refuse the test before anything is
  evaluated, with a message that names the applicant, the field and the kind it expects.
- **FR-035**: Findings, applicants, their values and the test results MUST NOT be stored or logged,
  MUST NOT reach serviceBW, and MUST NOT change any evaluation. The personas of the test step (spec
  004) MUST NOT be sent to agents. This supersedes spec 003, FR-020 and spec 004, FR-021 for agents
  only.

#### Guidance (User Story 6)

- **FR-036**: The MCP server MUST give every agent short instructions when it connects, covering what
  User Story 6, scenario 1 lists.
- **FR-037**: The guidance by topic (User Story 6, scenario 4) MUST be available as skill documents
  through the protocol's skills extension, through a guide tool for clients without that extension,
  and as a package for Claude Code that adds the MCP server and the skills, whose skill files other
  agents can also use. All of these MUST come from one source in the repository.
- **FR-038**: The guidance MUST describe every tool. Every change to the tools MUST update the guidance
  in the same change; the quality gates MUST fail when a tool isn't described in it, and the project's
  instructions for contributors MUST state the rule.

#### Scope and unchanged behaviour

- **FR-039**: The MCP server MUST NOT offer anything about document requests, citizens' data, calls to
  serviceBW's connection URLs, or accounts.
- **FR-040**: Tokens MUST NOT be shown after they are created, and MUST NOT be logged. What agents
  send as content (rules, messages, applicants) MUST NOT be logged.
- **FR-041**: Everything that specs 001 to 006 deliver MUST keep working as it does: the editor, the
  published connections, and their URLs for serviceBW.
- **FR-042**: The new parts of the management interface (the consent page, the user page, the
  approval page, "Copy link" and opening a link) MUST meet WCAG 2.1 level AA, as the rest of the
  management interface does (spec 001, Clarifications).

### Key Entities *(include if feature involves data)*

- **Agent**: An MCP client, such as an LLM tool on the team member's machine, that acts on behalf of
  one team member.
- **Agent connection**: A team member's consent for one agent: the client's name as the client gives
  it, the access level, which the team member can change, when it was connected and when it was last
  used. It lasts until it is revoked or unused for 30 days, or the account is deleted.
- **Personal access token**: A secret that a team member creates for an agent that can't use the
  browser sign-in: a name, an access level, which the team member can change, an expiry, and when it
  was last used. Shown once.
- **Access level**: "Read only", "Read and edit drafts", or "Read, edit drafts and manage live
  connections", each allowing everything the one before it allows. Only the third allows asking to
  deactivate, reactivate or delete a published connection, live or deactivated. None allows changing
  a published connection's content.
- **Approval request**: An agent's request to publish or delete a draft, or to deactivate,
  reactivate or delete a published connection: the connection, the action, the agent that asked,
  what it was made for (the draft's version, or the published connection's status), the team
  member, its expiry, and its outcome (waiting, done, declined, expired, replaced, cancelled,
  failed).
- **Link**: An address in the management interface that names a connection and, optionally, a variant
  and a rule or group, by identifiers only.
- **Variant identifier** (spec 002): Now also given to a draft's variants when they are added, and
  kept when the draft is published.
- **Fictitious applicant**: Values that an agent supplies to test rules. Never stored.
- **Guidance**: The instructions and the skill documents by topic, from one source.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: With a client that supports the browser sign-in, a team member connects a new agent in
  under 2 minutes, without copying any code or secret.
- **SC-002**: Every change that the create flow offers is available to agents: 100% of the actions in
  FR-012, checked against the editor's actions.
- **SC-003**: For every action in the editor's tests of propagation and marks, the agents' tools store
  the same content as the editor: 100% of the compared cases.
- **SC-004**: In the acceptance tests, agents change the content of 0 published connections; 0
  drafts are published or deleted, and 0 published connections are deactivated, reactivated or
  deleted, without the approval of the team member the agent acts for; and 0 agents without "Read,
  edit drafts and manage live connections" get an approval request for a published connection.
- **SC-005**: Revoking an agent connection or a token, or deleting the account, refuses the agent's
  next call in 100% of the tests, and changing its access level on the user page applies the new
  level from the agent's next call in 100% of the tests.
- **SC-006**: With 1,000 stored connections, an agent finds a connection by part of its name in one
  call, and no answer lists more than 25 connections or the rules of more than one variant.
- **SC-007**: The findings that agents receive equal those of the rules step in 100% of spec 003's
  test cases, and the test results equal the evaluation's for 100% of the evaluator's test vectors.
- **SC-008**: 100% of copied links open the item they were copied from, also after renaming and after
  the draft is published.
- **SC-009**: The guidance describes 100% of the tools, which is checked automatically.
- **SC-010**: With at least two different MCP clients, an agent given only a plain description of a
  form's requirements builds the draft and gets it published with one approval, without the team
  member changing it in the management interface.
- **SC-011**: The consent page, the user page, the approval page and "Copy link" pass a WCAG 2.1 AA
  check without findings.

## Assumptions

- **Builds on specs 001 to 006**: Every requirement of
  [spec 001](../001-servicebw-eudi-middleware/spec.md),
  [spec 002](../002-connection-rules/spec.md),
  [spec 003](../003-rule-consistency-checks/spec.md),
  [spec 004](../004-rule-test-personas/spec.md),
  [spec 005](../005-connection-drafts/spec.md) and
  [spec 006](../006-connection-description/spec.md) still applies, except where this spec
  supersedes it: spec 003, FR-020 and spec 004, FR-021 for agents (FR-035), and the drafts of spec
  005, whose variants now get identifiers (FR-029). Specs 005 and 006 are treated as implemented.
  The spec says "variant" where spec 002 says "branch", as the UI does, and the main variant is
  "Standard" until renamed.
- **Description, not serviceBW form** (spec 006): A connection has an optional description of at
  most 500 characters in place of the serviceBW form ("Form ID"). Agents search by it, read it and
  set it as they do the name; it never affects requests, URLs or the wallet-communication service.
- **Agents run locally**: MCP clients run on the team member's machine and reach the MCP server at
  the deployment's address. Clients hosted by an LLM provider aren't a target.
- **Standard authorization**: The protocol's authorization (OAuth 2.1, authorization code with
  PKCE), with the middleware as the authorization server and the MCP server as the protected
  resource; clients register preferably through Client ID Metadata Documents, with dynamic
  registration as the fallback; a higher access level is asked for through the protocol's step-up
  (Clarifications). The plan specifies the details.
- **One implementation of the rules logic** (Clarifications): the tools reuse the editor's rules
  logic, which is written in TypeScript, so that propagation, validation, the checks and the
  evaluator each have one implementation; the server's checks stay the safety net, as for the
  editor. Where the MCP server lives, and the amendment of the constitution it may need, are for
  the plan.
- **No roles**: Every team member can see, continue and delete every draft (spec 005, FR-027), and
  deactivate, reactivate and delete every published connection (spec 001, FR-006). Their agents can
  do what the access level allows within that.
- **Defaults**: Approval requests expire after 10 minutes, agent connections end after 30 days
  without use, personal access tokens expire after at most 90 days, and an agent connection creates
  at most 20 drafts per hour unless the setting says otherwise. They are reasonable starting values;
  the plan may make more of them settings.
- **No activity log**: Who changed what isn't recorded by this feature (Clarifications).
- **Browser-controlling agents**: Out of scope. Approval protects against agents that act only
  through the MCP server.
- **Data protection**: A connection's set-up (names, descriptions, rules, messages) reaches the LLM
  provider that the team member's agent uses. It holds no data about citizens. DO.IT has approved
  this (Clarifications).
- **Language**: The tools, their messages and the guidance are in English, as the management
  interface is.
- **Out of scope**: Changes to a published connection's content by agents (its name, description,
  documents, variants and rules), at every access level; changes to a published connection that are
  stored but not yet live; an activity log; account management; document requests and citizens'
  data.
