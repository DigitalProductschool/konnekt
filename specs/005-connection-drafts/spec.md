# Feature Specification: Connection Drafts ("Save and exit") and Crash Recovery

**Feature Branch**: `005-connection-drafts`

**Created**: 2026-11-04

**Status**: Draft

**Input**: User description: "Connection drafts ("save and exit") and crash recovery

## Context
Today every save of a connection is a published save. Creating a connection
creates revision 1 with its EUDIPLO presentation configuration, and it goes live
at once. Each change to its documents creates a new immutable revision. The
server checks the name, the documents and the rules against each other on every
save, so a connection that is only partly set up can't be stored. Team members
can't stop halfway and come back later.

Additionaly, if the browser of a user crash, the connection progress is lost if not saved.

## User story 1: Save and exit a new connection
A team member can leave the editor for a new connection at any step with "Save
and exit" and continue later, on any device, from the same state.

- A connection that was never published is a draft. It has no EUDIPLO
  configuration and no revision. Its trigger and pull URLs answer like an
  unavailable connection (409 unavailable), and the list and details show it as
  a draft.
- Saving a draft checks only the structure (well-formed documents, branches and
  rules, identifiers from the counters). It allows incomplete states: no
  documents, rules whose fields aren't requested yet, empty variants. It calls
  no EUDIPLO.
- Publishing runs the full validation and creates revision 1 and rule set 1
  through the existing save path. There must not be a second implementation of
  the save logic.
- A draft that was never published can be deleted. Deleting it frees nothing
  that serviceBW could know, because it never had live URLs.

## User story 2: Crash recovery
- The user start creating a connection but never saves
- The browser crashes
- The user resume the website and see that there is a 'local draft' that can be resumed
- He can resume the connection draft and working on it again/save it

## User story 3: Two team members on one draft
If two team members edit the same connection's draft, the later save must not
silently overwrite the earlier one. Reuse the rules_changed approach (a version
and "Reload" / "Replace their changes")."

## Clarifications

### Session 2026-11-04

- Q: Does crash recovery (local drafts) also cover the edit flow of a published connection, whose
  changes go live when saved? → A: No. Local drafts cover only the create flow of a new
  connection and of a stored draft. Unsaved changes to a published connection are lost in a
  crash, as today (FR-014).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Save and exit a new connection, and continue later (Priority: P1)

Setting up a form connection often takes more than one sitting: the documents a form needs, or
the exact rules, may still have to be agreed with the department that owns the form. Today
nothing is stored until the team member publishes, and publishing puts the connection live at
once, so they have to finish in one go or start over.

With this feature, every step of the create flow offers "Save and exit". It stores what the team
member has entered so far as a **draft** and takes them back to the overview. A draft isn't live:
it requests nothing from any wallet, and serviceBW can't use it. Any team member can later open
the draft, on any device, and continue from the step where it was left. Publishing the draft
makes it live exactly as publishing a new connection does today. A draft that is no longer
needed can be deleted.

**Why this priority**: This is the core of the request. Without it, a connection that is only
partly set up can't be stored at all, and the other two stories have nothing to recover or
protect.

**Independent Test**: Start a new connection, enter a name, add a document without choosing its
fields, add a variant without rules and a rule on a field that isn't requested, and choose "Save
and exit". Check that the overview lists the draft as a draft and that its trigger URL starts no
request. Open the draft in another browser as another team member, check that the same step opens
with the same content, complete it and publish it. Check that the connection is now live and
serviceBW can start requests through its URLs.

**Acceptance Scenarios**:

1. **Given** a team member in any step of the create flow who has entered a name, **When** they
   choose "Save and exit", **Then** what they have entered is stored as a draft, they return to
   the overview, and the overview lists the draft, marked as a draft.
2. **Given** a draft without documents, with a document whose fields aren't chosen, with a rule on
   data that isn't requested, with a rule whose condition or message is missing, or with a variant
   without rules, **When** the team member saves it as a draft, **Then** it is saved without
   complaint.
3. **Given** draft content that isn't well-formed, such as a document type the catalog doesn't
   know, **When** it is saved as a draft, **Then** the save is refused with a message that names
   the problem, and the stored draft stays as it was.
4. **Given** a draft saved in the rules step, **When** any team member continues it on another
   device, **Then** the create flow opens at the rules step with the name, the serviceBW form, the
   documents and their fields, the variants and their rules as they were saved.
5. **Given** a draft, **When** serviceBW, or anyone else, calls its trigger URL or any of its pull
   URLs, **Then** no request is started and the answer is "unavailable".
6. **Given** a complete draft, **When** a team member publishes it, **Then** it goes live as a new
   connection would: it gets its connection URLs, the details show it as live, and serviceBW can
   start requests through it.
7. **Given** a draft that publishing would refuse, for example because it has no documents or a
   rule checks data that isn't requested, **When** the team member publishes it, **Then**
   publishing is refused with the same message as for a new connection, and the stored draft stays
   a draft, unchanged.
8. **Given** a draft, **When** a team member opens its details, **Then** they see it marked as a
   draft with what it holds so far, without connection URLs, and can continue it or delete it, but
   not deactivate it.
9. **Given** a draft, **When** a team member deletes it and confirms, **Then** it disappears from
   the overview, can no longer be opened, and no other form connection or request changes.

---

### User Story 2 - Recover unsaved work after a crash (Priority: P2)

A team member is creating a connection and hasn't saved it yet when the browser crashes, the
device restarts, the tab is closed by mistake or the sign-in session runs out. Today everything
entered since the last save is lost, and for a new connection that is everything.

With this feature, the flow keeps a copy of the unsaved work on the device while the team member
works: a **local draft**. When they come back to the app on the same browser, signed in to the
same account, the app tells them that a local draft exists and offers to resume or discard it.
Resuming opens the flow where they were, with everything they had entered, and they can go on,
save it as a draft or publish it.

**Why this priority**: It protects work that hasn't reached the server, which "Save and exit"
alone doesn't. It is less important than User Story 1 because it covers accidents, while drafts
cover every planned break.

**Independent Test**: Start a new connection, enter a name, documents and a rule, and don't save.
Stop the browser abruptly, open it again and sign in. Check that the app offers the local draft,
resume it, check that the flow shows the same step and content, choose "Save and exit", and check
that the overview lists the draft and no longer offers the local draft.

**Acceptance Scenarios**:

1. **Given** a team member who has entered a name, documents and a rule in the create flow
   without saving, **When** the browser stops unexpectedly and they open the app again on the same
   browser, signed in as the same team member, **Then** the app tells them that a local draft
   exists, with its name and the time of its last change, and offers to resume or discard it.
2. **Given** that local draft, **When** they resume it, **Then** the create flow opens at the step
   where they were, with everything they had entered up to a few seconds before the stop.
3. **Given** a resumed local draft, **When** they choose "Save and exit" or publish, **Then** the
   work is saved as from the flow itself, and the local draft is no longer offered.
4. **Given** a local draft, **When** they discard it and confirm, **Then** it is gone from the
   device, and nothing stored on the server changes.
5. **Given** that no form connection exists yet, so that signing in opens the first-connection
   screen, **When** the team member comes back after a crash, **Then** the first-connection screen
   offers the local draft too.
6. **Given** a stored draft with changes on top of it that weren't saved before a crash, **When**
   the team member opens the draft again, **Then** the app offers to restore those changes or to
   discard them.
7. **Given** a local draft made by one team member, **When** another team member signs in on the
   same browser, **Then** the local draft isn't offered to them.

---

### User Story 3 - Two team members working on one draft (Priority: P3)

Drafts belong to the team, like form connections. When two team members open the same draft and
both save it, the later save must not silently replace the earlier one. As for the rules of a
published connection (spec 002, FR-028), the system tells the team member who saves later that
the draft changed since they opened it, and lets them choose: reload the draft as the other saved
it, dropping their own unsaved changes, or replace the other's changes with their own version.

**Why this priority**: In a small team, two people rarely work on the same draft at the same
time. When they do, losing a colleague's work without notice is worse than a dialog, so the case
is covered, but after the two stories that make drafts and recovery possible.

**Independent Test**: Open the same draft in two browsers as two team members. Change the name in
the first and save. Change a rule in the second and save. Check that the second save is refused
with the choice to reload or replace; that "Reload" shows the first team member's name and drops
the second's rule change; and, repeating the setup, that "Replace their changes" stores the second
team member's version whole.

**Acceptance Scenarios**:

1. **Given** two team members who opened the same draft, **When** the first saves it and the
   second then saves it or publishes it, **Then** the second's save is refused before anything is
   stored, with a message that another team member saved the draft after they opened it, and the
   choice "Reload" or "Replace their changes".
2. **Given** that refusal, **When** the second team member chooses "Reload", **Then** the flow
   shows the draft as the first team member saved it, and the second's unsaved changes are
   dropped.
3. **Given** that refusal, **When** the second team member chooses "Replace their changes",
   **Then** their version of the whole draft is stored, or published if they were publishing, and
   the first team member's next save of their now outdated version meets the same refusal.
4. **Given** a draft that another team member has published since it was opened, **When** the team
   member saves it as a draft or publishes it, **Then** the save is refused with a message that the
   connection has been published, and the system offers to open the published connection. The
   connection doesn't become a draft again.
5. **Given** a draft that another team member has deleted since it was opened, **When** the team
   member saves it or publishes it, **Then** the save is refused with a message that the draft has
   been deleted, and the system offers to save their work as a new draft.

---

### Edge Cases

- **"Save and exit" without a name**: Refused where the name is entered, with a message asking for
  it. Nothing is stored, and the local draft keeps the work (FR-003).
- **"Save and exit" while a rule editor has unsaved changes**: The flow first asks to keep or
  discard them, as publishing does (spec 002, FR-006). Keeping them keeps the rule as it is, even
  incomplete (FR-012).
- **"Save and exit" from the test step**: The personas aren't saved (spec 004). Continuing the
  draft and opening the test step again generates new ones. The findings of the rule checks
  (spec 003) aren't saved either; they are computed again when the draft is opened (FR-002).
- **Deselecting data that rules check, in a draft**: The system still names those rules and their
  variants before the change (spec 002, FR-029), but the draft can be saved with them. Publishing
  refuses them until they are changed or the data is requested again (FR-004, FR-009).
- **Connection URLs of a draft**: Never shown, neither in the flow nor on the details, because
  serviceBW must not receive URLs that don't work. They appear once the draft is published, and
  never change afterwards (FR-006, spec 001, FR-005).
- **Variants deleted while the connection is a draft**: Leave nothing behind. No variant of a
  draft ever had a live pull URL, so publishing creates pull URLs only for the variants that the
  draft has then (FR-009).
- **Saving a draft fails** (no network, server error): The stored draft stays as it was, the team
  member stays in the flow with their work, the local draft keeps it, and they can try again
  (FR-013).
- **Publishing a draft fails** (a check refuses it, or the wallet-communication service doesn't
  answer): Nothing changes, the connection stays a draft, and the team member can try again, as
  for a new connection (spec 002, FR-028).
- **Sign-in session expires while editing**: Saving leads to the sign-in screen. After signing in
  again on the same browser, the local draft is offered (FR-016).
- **Leaving the flow without saving** (the logo, the browser's back button, closing the tab): The
  local draft is kept and offered on the overview (FR-018).
- **Opening a stored draft and leaving without changing anything**: No local draft is kept, since
  nothing is unsaved (FR-014).
- **The same connection open in two tabs of one browser**: The device keeps one local draft per
  connection, holding the latest change made in either tab (FR-015).
- **A local draft of a stored draft that another team member has saved since**: Restoring the
  local draft and saving it meets the refusal of User Story 3, with "Reload" or "Replace their
  changes" (FR-022).
- **Old local drafts**: A local draft without a change for 30 days is discarded without asking
  (FR-018).
- **Signing out with local drafts on the device**: Signing out first warns that the account's
  local drafts on this device will be discarded, and discards them if the team member goes on
  (FR-019).
- **A browser that can't keep local drafts** (storage blocked or full, private window): The flow
  works as before, without crash recovery (FR-021).
- **The catalog drops a document type or field that a draft requests**: The draft still opens, the
  missing data is pointed out, and it has to be removed before the draft can be saved or published
  (FR-003). Changes to the catalog or to the trusted issuers reach a draft when it is published,
  since nothing is set up with the wallet-communication service before (spec 001, FR-005).
- **First connection**: A draft counts as a form connection for the first-connection screen
  (spec 001, FR-022). When the team's only connection is a draft, signing in opens the overview,
  which lists it. Deleting the team's only connection, a draft, brings the first-connection screen
  back at the next sign-in.
- **Deactivating a draft**: Not offered. A draft has nothing live to pause (FR-007).
- **Connections published before this feature**: Stay published, unchanged. A published
  connection never becomes a draft (FR-026).
- **Editing a published connection**: Unchanged by drafts: the edit flow has no "Save and exit", and
  saving puts the changes live at once, as today (FR-026). Its unsaved changes aren't kept as a
  local draft, so a crash loses them, as today (FR-014).
- **A stored draft published from the flow**: Once published, it is a published connection, and
  its edit flow keeps no local drafts from then on (FR-014, FR-018).

## Requirements *(mandatory)*

### Functional Requirements

#### Drafts (User Story 1)

- **FR-001**: The create flow of a form connection (spec 001, FR-001), including the
  first-connection screen (spec 001, FR-022), MUST offer "Save and exit" in every step. It MUST
  store what the team member has entered so far as a draft and return them to the overview. A
  form connection that has never been published MUST be a draft.
- **FR-002**: Saving a draft MUST store everything the flow holds: the name, the serviceBW form,
  the documents and their fields, the variants with their names, descriptions and origin, their
  rules, groups and sub-groups with their AND and OR, conditions, messages and marks, and the step
  in which it was saved. It MUST NOT store the personas of the test step (spec 004) or the
  findings of the rule checks (spec 003).
- **FR-003**: Saving a draft MUST require a name, and MUST refuse content that isn't well-formed,
  with a message that names the problem:
  - a document type or field that the catalog doesn't offer, or a document listed twice;
  - variants and rules that break the structure of spec 002: more than one main variant, nesting
    deeper than sub-groups, a group with fewer than two members, a variant based on the main
    variant that is out of step with it, or more than the limits of 20 variants and 200 rules,
    groups and sub-groups per variant;
  - identifiers of rules and groups that aren't of the form the connection's numbering gives
    (spec 002, FR-010). New identifiers are renumbered from that numbering, which only goes up, so
    that a published connection never reuses an identifier;
  - values beyond the limits that publishing applies, such as the length of the name.
- **FR-004**: Saving a draft MUST accept incomplete content that publishing refuses, at least:
  no serviceBW form; no documents; a document without a chosen field; rules on data that isn't
  requested; rules with an incomplete condition or without a message; variants without rules;
  and names of variants, rules or groups that publishing would refuse as missing or duplicate.
- **FR-005**: Saving a draft MUST NOT set up anything with the wallet-communication service, and
  MUST NOT create a version of documents or rules that a request could use.
- **FR-006**: Every URL of a draft, its trigger URL and the pull URLs of all its variants, MUST
  start no request and MUST answer every call with "unavailable", as for a deactivated form
  connection (spec 001, FR-006). The system MUST NOT show a draft's connection URLs anywhere.
- **FR-007**: The overview MUST list drafts together with the other form connections, marked as a
  draft in text, not by colour alone, with the date of their last save, and lead to continuing
  them. The create flow of a stored draft MUST show that it is a draft. A draft's details MUST
  show it as a draft with what it holds so far, incomplete parts included, MUST offer continuing
  and deleting it, and MUST NOT offer deactivating or reactivating it.
- **FR-008**: Any signed-in team member MUST be able to continue any draft, on any device.
  Continuing MUST open the create flow at the step in which the draft was saved, with its content
  as saved. From there the team member MUST be able to save and exit again, or publish.
- **FR-009**: Publishing a draft MUST apply the same checks, with the same messages, and produce
  the same result as publishing a new connection with the same content (spec 001, FR-003 and
  FR-004; spec 002, FR-006 and FR-028): the first version of its documents and of its rules, its
  set-up with the wallet-communication service, and its connection URLs, one pull URL for each of
  the variants it has then. After publishing, the connection MUST be live and MUST NOT be a draft
  any more. A refused or failed publish MUST leave the stored draft as it was, and leave the team
  member in the flow with their work.
- **FR-010**: Team members MUST be able to delete a draft after confirming. Deleting MUST remove
  the draft and its content for good, and MUST NOT change any other form connection or any
  request. The URLs of a deleted draft MUST keep starting no request.
- **FR-011**: A draft MUST count as a form connection when signing in decides between the
  first-connection screen and the overview (spec 001, FR-022).
- **FR-012**: "Save and exit" while a rule editor has unsaved changes MUST first ask to keep or
  discard them, as publishing does (spec 002, FR-006). Keeping them MUST keep the rule as it is,
  complete or not.
- **FR-013**: When saving a draft fails, the stored draft MUST stay as it was, the team member MUST
  stay in the flow with their work, and they MUST be able to try again.

#### Crash recovery (User Story 2)

- **FR-014**: While a team member works in the create flow of a new connection or of a stored
  draft, and the flow holds changes that aren't saved, the system MUST keep a copy of them on the
  device, a local draft, updated as they work, so that a crash, a reload, a closed tab or an
  expired session loses at most the changes of the last 5 seconds. The edit flow of a published
  connection MUST NOT keep local drafts: its unsaved changes are lost in a crash, as today.
- **FR-015**: A local draft MUST hold what saving a draft stores (FR-002), the step the team member
  was in, the stored draft it belongs to, if any, and the draft version that was loaded (FR-022).
  It MUST NOT hold personas, findings or anything about citizens. A device MUST keep at most one
  local draft per stored draft, and one per new connection that was never saved.
- **FR-016**: After signing in on the same browser, the team member who made a local draft MUST be
  told that it exists, on the overview and on the first-connection screen, with its name (or a
  placeholder when it has none), the time of its last change and whether it belongs to a new
  connection or to a stored draft, and MUST be offered to resume or discard it. Opening a stored
  draft for which the device holds a local draft MUST offer to restore its unsaved changes or to
  discard them.
- **FR-017**: Resuming a local draft MUST open the flow at the step where the team member was,
  with the local draft's content. From there, the flow MUST work as usual: "Save and exit" and
  publishing store the work as FR-001 to FR-013 say.
- **FR-018**: A local draft MUST be removed once its work is saved or published, once the team
  member discards it after confirming, and when it hasn't changed for 30 days. It MUST be kept when
  the team member leaves the flow without saving.
- **FR-019**: A local draft MUST be offered only to the team member account that made it. Signing
  out MUST first warn when the account has local drafts on the device, and discard them when the
  team member signs out; a session that expires MUST NOT discard them.
- **FR-020**: A local draft MUST stay on the device. Only saving or publishing, which the team
  member chooses, sends its content to the server.
- **FR-021**: When the browser can't keep local drafts, the flow MUST work as it does without
  them, without crash recovery.

#### Two team members on one draft (User Story 3)

- **FR-022**: Every stored draft MUST carry a version, which every save of the draft changes.
  Saving or publishing a draft MUST compare the version the team member loaded with the stored
  one. If another save has changed the draft since, the system MUST refuse before storing
  anything, say that another team member saved the draft after they opened it, and offer:
  - "Reload": the flow shows the draft as stored, and the team member's unsaved changes are
    dropped;
  - "Replace their changes": the team member's version of the whole draft is stored, or published
    with publishing's checks if they were publishing.

  The whole draft counts as one for this: its name, serviceBW form, documents, variants and rules.
  Unlike for a published connection (spec 002, FR-028), the message names no variants, since no
  variant of a draft has a live pull URL.
- **FR-023**: When the draft has been published since the team member opened it, saving it as a
  draft or publishing it MUST be refused with a message that it has been published, and the system
  MUST offer to open the published connection. It MUST NOT become a draft again, and the refused
  work MUST NOT change the published connection.
- **FR-024**: When the draft has been deleted since the team member opened it, saving or
  publishing it MUST be refused with a message that it has been deleted, and the system MUST offer
  to save the team member's work as a new draft.
- **FR-025**: For published connections, the handling of two team members' saves MUST stay as it
  is: the rules conflict of spec 002, FR-028, and the later save winning for the name and the
  documents (spec 001, Edge Cases).

#### Unchanged behaviour and access

- **FR-026**: Published connections, including those published before this feature, MUST keep
  working unchanged for serviceBW. Their edit flow MUST NOT offer "Save and exit", and saving it
  MUST put the changes live at once, as today. A published connection MUST NOT become a draft.
- **FR-027**: Drafts and local drafts MUST be visible and changeable only for signed-in DO.IT team
  members (spec 001, FR-007). Every team member MUST be able to see, continue and delete every
  stored draft.
- **FR-028**: The new parts of the management interface (the draft marks, "Save and exit", the
  offer of local drafts and the dialogs of this feature) MUST meet WCAG 2.1 level AA, as the rest
  of the management interface (spec 001, Clarifications).

### Key Entities *(include if feature involves data)*

- **Draft**: A form connection that has never been published. It holds the name, the serviceBW
  form, the documents and fields, the variants and their rules, any of which may be incomplete,
  and the step in which it was last saved. It has an identity, which it keeps when published, but
  no version of documents or rules that requests could use, no set-up with the
  wallet-communication service and no working URL. It is shared by the team, and stays until it is
  published or deleted.
- **Draft version**: A number that changes with every save of a draft. A save that names an
  outdated version is refused (FR-022).
- **Local draft**: A copy, kept on one device for one team member account, of the work in a create
  flow that hasn't been saved: the content of FR-002, the step, the stored draft it belongs to, if
  any, the draft version it was loaded at and the time of its last change. It never leaves the
  device by itself and never holds personas, findings or data about citizens.
- **Form connection** (spec 001) and **variant** (branch, spec 002): Unchanged once published. A
  draft becomes a published form connection by publishing, and its variants become branches with
  pull URLs then.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A team member can stop at any step of the create flow and continue on another device
  with 100% of what they entered (name, serviceBW form, documents, fields, variants, rules and
  messages) at the same step, in acceptance tests that cover every step.
- **SC-002**: No draft starts a document request or sets anything up with the
  wallet-communication service: 0 of the calls to the URLs of drafts in the acceptance tests start
  a request.
- **SC-003**: Publishing a draft and publishing the same content in one sitting give the same
  result, the same refusals with the same messages, the same working URLs and the same answers to
  serviceBW, in 100% of compared cases.
- **SC-004**: After the browser stops unexpectedly, a team member who signs in again on the same
  browser is offered their unsaved work on the first screen they see, and loses at most the changes
  of the last 5 seconds.
- **SC-005**: A team member gets from the overview back into a stored draft or a local draft, at
  the step where they left it, in one action.
- **SC-006**: In acceptance tests of two team members saving the same draft, no save silently
  replaces another's: 100% of conflicting saves show the choice between "Reload" and "Replace their
  changes".
- **SC-007**: Form connections published before this feature keep answering serviceBW exactly as
  before: no serviceBW form needs a change, and every trigger and pull URL in use keeps working.
- **SC-008**: The new screens, marks and dialogs pass a WCAG 2.1 AA check without findings.

## Assumptions

- **Builds on specs 001 to 004**: Every requirement of
  [spec 001](../001-servicebw-eudi-middleware/spec.md),
  [spec 002](../002-connection-rules/spec.md),
  [spec 003](../003-rule-consistency-checks/spec.md) and
  [spec 004](../004-rule-test-personas/spec.md) still applies, except where this spec supersedes
  it. References such as "spec 002, FR-028" point to them. The spec says "variant" where spec 002
  says "branch", as the UI does, and the main branch is "Standard" until renamed.
- **Supersedes "no drafts"**: Spec 001's decision that the API has no drafts and the wizard no
  "Save and exit" (design notes, sections 6 and 8), and spec 002's answers that "there are no
  drafts, so 'Save and exit' doesn't exist" (Clarifications, Session 2026-10-24) no longer apply to
  the create flow. The UI design already has a "Draft" badge, "Save and exit" in every footer and
  the overview hint "Pick up your draft or connect another form.", which were left out for that
  reason (spec 002, contracts/ui-screens.md, F28; spec 004, contracts/ui-screens.md, O3). The plan
  decides how far they are used.
- **Only connections that were never published**: Changes to a published connection that are
  stored but not yet live ("unpublished changes") are out of scope, and so is crash recovery in
  its edit flow (Clarifications). Once published, a connection is edited and saved as today.
- **One implementation of saving**: Publishing a draft goes through the same save that publishing
  a new connection uses today, with its checks, its numbering of versions and its set-up with the
  wallet-communication service; there is no second implementation of that logic. Saving a draft
  applies the structural part of the same checks only.
- **Conflicts reuse spec 002's approach**: A version per draft, a refusal of outdated saves, and the
  choice "Reload" or "Replace their changes", as for the rules of a published connection.
- **A draft needs a name**: The overview identifies form connections by name, so a draft without
  one would be hard to find. A local draft may lack a name, and is then shown with a placeholder
  such as "Untitled connection".
- **Drafts are kept until published or deleted**: Stored drafts don't expire. Old drafts are
  deleted by the team, like form connections that are no longer needed.
- **Local drafts stay on one browser**: They are for accidents, not for moving between devices,
  which stored drafts cover. A form connection's set-up holds no data about citizens, so a local
  draft holds none either. Team members use personal accounts (spec 001, FR-007); a local draft is
  offered only to its account, kept for 30 days without change, and discarded when its account
  signs out, after a warning.
- **The wizard's step is part of the draft**: "The same state" means the content and the step. The
  open variant tab, an open rule editor's position and similar view state aren't restored.
