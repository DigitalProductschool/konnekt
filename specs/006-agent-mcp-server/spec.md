# Feature Specification: Agent Access through an MCP Server

**Feature Branch**: `006-agent-mcp-server`

**Created**: 2026-11-04

**Status**: Draft

**Input**: User description: "MCP server for AI agents: create, change and inspect form connections
through agents, with sign-in, approval and skills

## Context
DO.IT team members want to use LLM agents that run on their own machine (Claude Code, Cursor, Codex
and other MCP clients) to create, change and inspect form connections through an MCP server, at the
granularity of the UI: create a connection, set its name and serviceBW form, add a document, choose
its fields, add a variant, add, edit, group and delete rules, and so on. The agent must be able to
take a connection from nothing to live, and to retrieve its connection URLs. This builds on spec 005
(connection drafts, treated as implemented): agents work on drafts, which may be incomplete between
calls.

Decisions taken in a discussion on 2026-11-04 (binding for this spec):

1. **What agents may change (option A)**: agents create and edit drafts only. Published connections
   are read-only for agents, except deactivating, reactivating and deleting them, which need
   approval (point 3). "Pending changes" on published connections stay out of scope, as in spec 005.
   An agent given the link of a rule in a published connection can read it but not change it.

2. **One implementation of the rules logic**: the MCP server is a TypeScript service that reuses the
   pure rules logic of `frontend/src/utils/rules/` (the propagation from Standard to the variants
   based on it, `propagateMain`; the validation with the server's own messages; the rule checks of
   spec 003; the evaluator of spec 004) and calls the backend's management API on behalf of the
   person. Each write tool reads the draft, applies the same pure function the UI applies, and
   saves the whole draft with its version (spec 005's draft save). The server's existing checks
   stay the safety net. There must not be a second implementation of propagation. (Where the
   service lives and the constitution amendment it needs, a third deployable with Node outside
   `frontend/` or a second build target inside it, are for the plan.)

3. **Approval for outward-facing and destructive actions, enforced by the server**: publishing a
   draft, deactivating, reactivating and deleting a published connection, and deleting a draft.
   Such a tool doesn't act: it creates a pending action and returns a link to an approval page in
   the Connection Portal (sent as an MCP URL-mode elicitation when the client supports it, in the
   tool's result otherwise). The action runs only when the same signed-in team member who
   authorized the agent approves it there. The page shows exactly what will happen: for
   publishing, the summary and the findings, as the wizard's Publish step does; for deactivating
   or deleting, which connection URLs stop working. The link expires after a few minutes; a
   declined or expired action does nothing. Every other write, anything that only changes a draft,
   needs no approval. Out of scope: an agent that controls the person's browser and approves on its
   own.

4. **Sign-in for agents**: standard MCP authorization (OAuth 2.1, authorization code with PKCE). The
   backend is the authorization server and the MCP server the protected resource (protected
   resource metadata, resource indicators; Client ID Metadata Documents preferred, dynamic client
   registration as fallback). The MCP client opens the browser, the team member signs in to the
   Connection Portal (or uses their session) and sees a consent page that names the client and
   offers a choice of access: read only, or read and write. Access tokens are short-lived, with
   rotating refresh tokens. A read-only agent can ask for write access later (the protocol's
   insufficient_scope step-up), which needs a new consent. For clients without OAuth, a team member
   can create a personal access token on their user page, with the same choice of access. Accounts
   are still managed with the CLI, and there are no roles.

5. **User page**: a new page, reached from the user menu at the top right, lists the team member's
   active agent authorizations (client name, access level, when connected, when last used) and
   personal access tokens, and lets them revoke each one. An activity log or audit trail is out of
   scope for now.

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
   do today: name and serviceBW form; documents and their fields; variants (add based on Standard
   or empty, rename, describe, delete, the top-level AND/OR and resetting it); rules and groups
   (add, edit target, condition, message and name, duplicate, delete, group, ungroup, sub-groups, a
   group's AND/OR and message, copy to a variant, reset to Standard, remove from a variant,
   restore); publishing; deactivating, reactivating and deleting; deleting a draft; and the
   connection URLs.

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
   catalog, publishing and approval, links). Every change to the MCP tools must update the skills
   in the same change, and CLAUDE.md gets that rule.

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
  citizens' data, account management, an activity log, pending changes on published connections.
- The connection set-up (names, form IDs, rules, messages) reaches the LLM provider the team member
  uses; it holds no citizens' data (assumption to confirm with DO.IT)."

**Corrected while specifying (2026-11-04)**: published connections are read-only for agents without
exception. Agents can't deactivate, reactivate or delete them, so points 1, 3 and 7 above no longer
include those three actions (Clarifications).

## Clarifications

### Session 2026-11-04

Decisions from the discussion before this spec was written, and one correction made while it was
written:

- Q: What may agents change? → A: Drafts only (spec 005). Published connections are read-only for
  agents: no change to their content, and no deactivating, reactivating or deleting (corrected while
  specifying; the input above still lists those three actions with approval). Changes to a
  published connection that are stored but not yet live stay out of scope, as in spec 005.
- Q: Which agent actions need the team member's approval? → A: Publishing a draft and deleting a
  draft. The approval is given in the management interface, by the team member the agent acts for,
  on a page that shows what will happen. An agent that controls the team member's browser and
  approves by itself is out of scope.
- Q: How do agents sign in? → A: With the protocol's standard authorization in the browser: the
  team member signs in to the management interface and consents, choosing "Read only" or "Read and
  edit drafts". A personal access token from the user page is the fallback for clients that can't
  do this.
- Q: Is there an activity log? → A: Not in this feature. The user page lists the team member's
  connected agents and tokens and lets them revoke each one.
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
- Q: May a connection's set-up (names, serviceBW forms, rules, messages) reach the LLM provider that
  a team member's agent uses? → A: Yes. DO.IT has approved the MCP server, which sends no data about
  citizens.
- Q: Should a third access level let agents change live connections? → A: No. The two access levels
  stay, and published connections stay read-only for agents.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Connect an agent and let it read the connections (Priority: P1)

A team member wants an LLM agent on their own machine to help with form connections. They add the
middleware's MCP server to their agent. The first time the agent connects, the browser opens the
management interface. The team member signs in if needed, sees which program asks for access,
chooses whether it may only read or may also edit drafts, and allows it. From then on the agent acts
on their behalf: it can find connections by name or serviceBW form, read a connection, its variants
and its rules, and read the catalog of documents, without loading everything at once. On their user
page, reached from the user menu, the team member sees every agent connected to their account and
can revoke each one.

**Why this priority**: Nothing else works without a connected agent, and reading alone is already
useful: an agent can explain a connection's rules, compare connections or answer questions about
them.

**Independent Test**: Connect an MCP client with "Read only". Check that the agent finds a connection
among many by part of its name, reads its documents and one variant's rules, and is refused when it
tries to change a draft. Check that the user page lists the client with read-only access, revoke it,
and check that the agent's next call is refused.

**Acceptance Scenarios**:

1. **Given** a team member whose MCP client knows the middleware's MCP address, **When** the client
   connects for the first time, **Then** the browser opens the management interface, which shows,
   after a sign-in if needed, a consent page with the client's name and the choice between "Read
   only" and "Read and edit drafts"; after "Allow", the client is connected without the team member
   copying anything.
2. **Given** that consent page, **When** the team member denies access, **Then** the client gets no
   access.
3. **Given** an agent with "Read only", **When** it tries to change a draft, **Then** the change is
   refused with a message that its access is read only, and the client can ask for more access,
   which shows the consent page again.
4. **Given** 1,000 stored connections, **When** the agent searches for part of a name or of a
   serviceBW form, optionally only among drafts or only among published connections, **Then** it
   receives one page of short entries (name, serviceBW form, status, last change, link) and can ask
   for the next page.
5. **Given** a connection, **When** the agent reads it, **Then** it first receives an overview (name,
   serviceBW form, status, documents with their fields, variants with their origin and number of
   rules, links), and receives the rules of one variant, or one rule, only when it asks for them.
6. **Given** a published connection, **When** the agent asks for its connection URLs, **Then** it
   receives the trigger URL and the pull URL of each variant, labelled with the variant's name. For
   a draft, it is told that the URLs exist once the draft is published.
7. **Given** connected agents, **When** the team member opens their user page from the user menu,
   **Then** they see each of their agent connections (client name, access, when connected, when last
   used) and each of their personal access tokens, and nobody else's.
8. **Given** a connected agent, **When** the team member revokes it on the user page and confirms,
   **Then** the agent's next call is refused, and it has to be connected again.
9. **Given** a client that can't use the browser sign-in, **When** the team member creates a
   personal access token on the user page with a name, an access level and an expiry, **Then** the
   token is shown once, the client can use it instead of the browser sign-in, and the token is
   listed and can be revoked like an agent connection.
10. **Given** a team member whose account is deleted with the account tool, **When** any of their
    agents calls, **Then** the call is refused (spec 001, FR-007).

---

### User Story 2 - Build a draft with an agent, one change at a time (Priority: P2)

The team member describes a form's requirements to the agent: the documents it needs, the
conditions for applicants, the variants. The agent creates a draft and builds it up one change at a
time, as a team member does in the create flow: name and serviceBW form, documents and fields,
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
a published connection and check that it is refused.

**Acceptance Scenarios**:

1. **Given** an agent that may edit drafts, **When** it creates a connection with a name, **Then** a
   draft is stored (spec 005), the overview lists it as a draft, and the result gives the draft's
   link in the management interface.
2. **Given** a draft, **When** the agent makes any change the create flow offers (FR-012), one per
   call, **Then** each change is stored at once, and a draft that is incomplete in between (no
   documents, a rule without a condition or on data that isn't requested, a variant without rules)
   is accepted, as "Save and exit" accepts it (spec 005, FR-004).
3. **Given** a draft with a variant based on Standard that changed one of Standard's rules, **When**
   the agent adds, changes or deletes rules of Standard, **Then** the variant follows as it does in
   the editor (spec 002, FR-021 to FR-024): new rules appear in it, unchanged rules follow, and the
   rule it changed keeps the variant's version.
4. **Given** a change that the editor would refuse, such as a rename that clashes in a variant, or a
   change that breaks the structure, such as a document type the catalog doesn't know, **When** the
   agent makes it, **Then** it is refused with a message that names the problem, the item and its
   variant, and the draft stays as it was.
5. **Given** a draft that an agent built, **When** a team member continues it in the management
   interface, **Then** the create flow opens at the furthest step that the draft's content reaches,
   with everything the agent stored.
6. **Given** a team member who has a draft open in the editor while an agent changes it, **When** the
   team member saves, **Then** spec 005's conflict applies ("Reload" or "Replace their changes"), and
   its message doesn't say whether an agent or a person saved in between. **When** the agent next
   changes the draft, **Then** its change applies to the draft as stored then.
7. **Given** a published connection, **When** the agent tries to change it in any way, including
   deactivating, reactivating or deleting it, **Then** the call is refused with a message that
   published connections are changed in the management interface, and nothing changes.
8. **Given** an agent connection that has created as many drafts in the past hour as the limit
   allows, **When** it creates another, **Then** it is refused with a message that says when it can
   create drafts again. Changes to existing drafts aren't limited by this.

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
   shows what will go live, as the publish step shows it: the name, the serviceBW form, the documents
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
5. **Given** a value that doesn't fit its field's kind, **When** the agent tests, **Then** that
   applicant is refused with a message that names the field and the kind of value it expects.
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
   drafts, variants and Standard are, the order of work from a draft to a live connection, that
   published connections are read-only for it, and that publishing and deleting a draft need the
   team member's approval.
2. **Given** a client that supports the protocol's skills, **When** the agent lists them, **Then** it
   finds the skills by topic and can read each. **Given** a client that doesn't, **When** the agent
   calls the guide tool with a topic, **Then** it receives the same text.
3. **Given** Claude Code, **When** the team member installs the package, **Then** the MCP server and
   the skills are added in one step.
4. **Given** the guidance, **Then** it covers at least: the workflow from a description to a live
   connection; variants, Standard, and how Standard's changes reach based variants; conditions per
   kind of data, including dates on Germany's calendar day; documents and the catalog; publishing and
   approval; links; and checks and tests, with the rule never to use real people's data.
5. **Given** a change to a tool, **When** the guidance doesn't describe the changed tool, **Then** the
   quality gates fail.

---

### Edge Cases

- **An ambiguous name**: A draft may hold two variants or rules with the same name (spec 005,
  FR-004). An agent that names one by name only, when two match, is refused with the candidates and
  their links (FR-019).
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
- **An approval link opened while signed out**: The team member signs in and returns to the page. If
  they sign in as someone else, they can't approve (FR-025).
- **Signing out of the browser**: Ends the browser session only. Agent connections and tokens stay
  until they are revoked or expire, or the account is deleted (FR-005).
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
  secrets by hand. The consent page MUST name the client as it identifies itself and MUST offer the
  access levels "Read only" and "Read and edit drafts". Denying MUST give no access.
- **FR-003**: "Read only" MUST allow every tool that reads, checks or tests, and MUST refuse every
  change. "Read and edit drafts" MUST also allow the changes to drafts (FR-012) and requests for
  approval (FR-021). A read-only agent that tries a change MUST be refused with a message that says
  so, and its client MUST be able to ask for the higher access level, which needs the team member's
  consent again.
- **FR-004**: A team member MUST be able to create a personal access token on their user page, with a
  name, an access level as in FR-002, and an expiry of at most 90 days. The token MUST be shown once,
  when it is created, and MUST NOT be retrievable afterwards.
- **FR-005**: An agent connection MUST last until it is revoked, until it has gone unused for 30 days,
  or until the account is deleted; a personal access token until it is revoked, until it expires, or
  until the account is deleted. Deleting an account MUST end its agent connections and tokens at once
  (spec 001, FR-007). Signing out of the browser MUST NOT end them.
- **FR-006**: The user menu MUST lead to a user page that lists the signed-in team member's active
  agent connections (client name, access level, when connected, when last used) and personal access
  tokens (name, access level, when created, when it expires, when last used), and only theirs. The
  team member MUST be able to revoke each one after confirming, and the agent's next call MUST then
  be refused.

#### Reading (User Story 1)

- **FR-007**: Agents MUST be able to find connections by part of their name or serviceBW form,
  filtered by status (draft, published and active, deactivated), in pages of at most 25 short
  entries (name, serviceBW form, status, last change, link), and to ask for the next page. A tool
  MUST NOT list more than one page of connections at once.
- **FR-008**: Agents MUST be able to read a connection in layers: an overview (name, serviceBW form,
  status, documents and their fields, each variant with its name, description, origin and number of
  rules, and the links); the rules of one variant, as readable statements and in a structured form
  with identifiers and marks; and one rule or group. Every connection that a team member can see,
  draft or published (spec 005, FR-027), MUST be readable.
- **FR-009**: Agents MUST be able to read the catalog in layers: the document types; for one type,
  its fields, their kinds, parts and whether they can hold several values, and the conditions each
  kind offers; and the values of a value set, searched by text and in pages.
- **FR-010**: For a published connection, agents MUST be able to read its connection URLs: the
  trigger URL and the pull URL of each variant, labelled with the variant's name (spec 002, FR-025
  and FR-026). For a draft, the answer MUST say that it has none until it is published.
- **FR-011**: Every tool's answer MUST contain the links of the connections, variants, rules and
  groups it read or changed (FR-028).

#### Changing drafts (User Story 2)

- **FR-012**: Agents with "Read and edit drafts" MUST be able to make, on drafts, one change per call,
  every change that the create flow offers:
  - create a draft with a name; change its name and its serviceBW form;
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
  Standard's changes reach the based variants, the marks (spec 002, FR-021 to FR-024), and the
  identifiers of new rules and groups (spec 002, FR-010). The editor and the agents' tools MUST use
  one implementation of that logic.
- **FR-015**: Each change MUST apply to the draft as stored when it is made, and MUST NOT silently undo
  a change that another agent or a team member saved in between. A change counts as a save of the
  draft for spec 005's conflict handling (spec 005, FR-022), and the management interface MUST NOT
  say whether an agent or a team member made it.
- **FR-016**: A change that the editor would refuse, or that breaks the structure (spec 005, FR-003),
  MUST be refused with a message that names the problem, the item and its variant, in the editor's or
  the server's words, and says what the agent can do instead. The draft MUST stay as it was.
- **FR-017**: A draft that an agent created or changed MUST open, when a team member continues it, at
  the furthest step its content reaches: the rules step once it has a rule, the documents step once
  it has a document, and the connection step otherwise.
- **FR-018**: Published connections MUST be read-only for agents at every access level: no change to
  their content, and no deactivating, reactivating or deleting. Such a call MUST be refused with a
  message that published connections are changed in the management interface.
- **FR-019**: Tools MUST let agents name connections, variants, rules and groups by identifier or by
  link. Where a tool also accepts a name, a name that matches more than one item MUST be refused with
  the candidates and their links.
- **FR-020**: An agent connection, or a personal access token, MUST NOT create more drafts per hour
  than a limit set in the middleware's settings, 20 unless set otherwise. A refusal MUST say when it
  can create drafts again. Changes to existing drafts MUST NOT count towards the limit.

#### Approval (User Story 3)

- **FR-021**: Publishing a draft and deleting a draft MUST need the approval of the team member the
  agent acts for, given in the management interface. The tool MUST NOT act itself: it MUST create an
  approval request and answer with the link to its approval page and the time it expires. Where the
  client supports it, the client MUST be asked to show the link to the team member.
- **FR-022**: Before an approval request to publish is created, the draft MUST pass publishing's
  checks, with publishing's messages (spec 005, FR-009). A draft that fails them MUST be refused
  without an approval request.
- **FR-023**: The approval page MUST show what will happen. For publishing: the name, the serviceBW
  form, the documents and their fields, each variant with its rules, and the findings of the rule
  checks, as the publish step shows them. For deleting: the draft's name, its last change, and that
  its content will be gone for good. It MUST offer to approve or to decline.
- **FR-024**: An approval MUST apply to the draft's content as it was when the request was made. If
  the draft has changed, been published or been deleted since, approving MUST do nothing, and the
  page MUST say why. A new request for the same draft and action MUST replace an older one.
- **FR-025**: Only the team member the agent acts for MUST be able to approve. Another team member
  MUST see that they can't. A signed-out team member MUST sign in first and then return to the page.
- **FR-026**: An approval request MUST expire 10 minutes after it was made. An expired, declined,
  replaced or already used request MUST do nothing, and an approved request MUST act once.
- **FR-027**: Publishing or deleting on approval MUST go through the same publishing and deleting as
  the management interface (spec 005, FR-009 and FR-010). If publishing fails, the draft MUST stay a
  draft, and the team member MUST be able to try again from the page while the request is valid. The
  agent MUST be able to learn the outcome (waiting, done, declined, expired, replaced, failed) and,
  once the draft is published, read its connection URLs.

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
  to FR-014). A value that doesn't fit its field's kind MUST be refused with the field and the kind
  it expects.
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
- **FR-041**: Everything that specs 001 to 005 deliver MUST keep working as it does: the editor, the
  published connections, and their URLs for serviceBW.
- **FR-042**: The new parts of the management interface (the consent page, the user page, the
  approval page, "Copy link" and opening a link) MUST meet WCAG 2.1 level AA, as the rest of the
  management interface does (spec 001, Clarifications).

### Key Entities *(include if feature involves data)*

- **Agent**: An MCP client, such as an LLM tool on the team member's machine, that acts on behalf of
  one team member.
- **Agent connection**: A team member's consent for one agent: the client's name as the client gives
  it, the access level, when it was connected and when it was last used. It lasts until it is
  revoked or unused for 30 days, or the account is deleted.
- **Personal access token**: A secret that a team member creates for an agent that can't use the
  browser sign-in: a name, an access level, an expiry, and when it was last used. Shown once.
- **Access level**: "Read only" or "Read and edit drafts". Neither allows changing published
  connections.
- **Approval request**: An agent's request to publish or delete one draft: the draft, the draft
  version it was made for, the action, the team member, its expiry, and its outcome (waiting, done,
  declined, expired, replaced, failed).
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
- **SC-004**: In the acceptance tests, agents change 0 published connections, and 0 drafts are
  published or deleted without the approval of the team member the agent acts for.
- **SC-005**: Revoking an agent connection or a token, or deleting the account, refuses the agent's
  next call in 100% of the tests.
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

- **Builds on specs 001 to 005**: Every requirement of
  [spec 001](../001-servicebw-eudi-middleware/spec.md),
  [spec 002](../002-connection-rules/spec.md),
  [spec 003](../003-rule-consistency-checks/spec.md),
  [spec 004](../004-rule-test-personas/spec.md) and
  [spec 005](../005-connection-drafts/spec.md) still applies, except where this spec supersedes it:
  spec 003, FR-020 and spec 004, FR-021 for agents (FR-035), and the drafts of spec 005, whose
  variants now get identifiers (FR-029). Spec 005 is treated as implemented. The spec says
  "variant" where spec 002 says "branch", as the UI does, and the main variant is "Standard" until
  renamed.
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
- **No roles**: Every team member can see, continue and delete every draft (spec 005, FR-027). Their
  agents can do what the access level allows within that.
- **Defaults**: Approval requests expire after 10 minutes, agent connections end after 30 days
  without use, personal access tokens expire after at most 90 days, and an agent connection creates
  at most 20 drafts per hour unless the setting says otherwise. They are reasonable starting values;
  the plan may make more of them settings.
- **No activity log**: Who changed what isn't recorded by this feature (Clarifications).
- **Browser-controlling agents**: Out of scope. Approval protects against agents that act only
  through the MCP server.
- **Data protection**: A connection's set-up (names, serviceBW forms, rules, messages) reaches the LLM
  provider that the team member's agent uses. It holds no data about citizens. DO.IT has approved
  this (Clarifications).
- **Language**: The tools, their messages and the guidance are in English, as the management
  interface is.
- **Out of scope**: Changes to published connections by agents, including deactivating, reactivating
  and deleting; changes to a published connection that are stored but not yet live; an activity log;
  account management; document requests and citizens' data.
