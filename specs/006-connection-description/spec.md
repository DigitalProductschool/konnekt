# Feature Specification: Optional Connection Description in Place of the Form ID

**Feature Branch**: `006-connection-description`

**Created**: 2026-11-05

**Status**: Draft

**Input**: User description: "Replace a form connection's "Form ID" (servicebw_form) with an
optional free-text "Description" everywhere: database, API, types, editor step 1, list, detail
pages, server drafts and local drafts. An empty description no longer blocks step 1's Continue or
publishing (completes spec 005's deferred edge case). Existing values carry over as descriptions.
Supersedes spec 001's "serviceBW form" requirement and spec 005 FR-004's note on the form ID. For
display: then description is empty we show nothing, when is too long we cut it with '...' . We
drop every existing local draft, don't be backwards compatible. Also exiting form IDs carry over
as descriptions. Keep the specs shorts as this is a minor change and not a full new feature"

**Supersedes**: spec 001, FR-001's "the serviceBW form it belongs to", User Story 4's scenario 1
("its serviceBW form") and the Form Connection entity's "linked serviceBW form"; spec 005's edge
case "Step 1 still needs a form ID to continue" and FR-004's "no serviceBW form" (there is nothing
left to accept, since the description is optional everywhere). Where those specs disagree with this
one, this one applies.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create and publish a connection without a description (Priority: P1)

A team member creates a connection, gives it a name, leaves the description empty, and goes on to
the documents, the rules and publishing without being stopped. A description is a note for the
team, such as which serviceBW form the connection belongs to; nothing depends on it.

**Why this priority**: The form ID blocks step 1 and publishing today although no part of the
system uses it. Removing that block is the point of the change.

**Independent Test**: Create a connection with only a name, publish it, and check that its URLs
work.

**Acceptance Scenarios**:

1. **Given** step 1 with a name and an empty description, **When** the team member chooses
   "Continue", **Then** step 2 opens with no error.
2. **Given** a draft without a description whose documents and rules are complete, **When** the
   team member publishes it, **Then** it is published.
3. **Given** a published connection with a description, **When** a team member clears it and
   saves, **Then** the change is saved, and the URLs and requests in progress are unaffected.
4. **Given** a description longer than 500 characters, **When** the team member continues, saves
   a draft or publishes, **Then** it is refused with a message that names the limit.

---

### User Story 2 - See the description in the overview and the details (Priority: P1)

The overview and the details page show a connection's description where they showed "Form ID …".

**Why this priority**: Without it, the team can't see the descriptions it enters.

**Independent Test**: Give three connections a short, an empty and a 500-character description,
and look at the overview and each details page on a phone and on a desktop.

**Acceptance Scenarios**:

1. **Given** a connection with a description, **When** the overview or its details page opens,
   **Then** the description appears as written, without a "Form ID" prefix.
2. **Given** a connection or draft without a description, **When** the overview or its details
   page opens, **Then** nothing appears in its place: no placeholder such as "No form ID yet".
3. **Given** a description that doesn't fit on one line, **When** it is shown, **Then** it stays
   on one line and is cut with "…" at its end; the full text is in step 1 of the editor.

---

### User Story 3 - Existing form IDs become descriptions (Priority: P2)

After the update, every connection and stored draft shows its former form ID as its description.
Local drafts saved before the update are discarded.

**Why this priority**: The team keeps what it entered, but nothing new becomes possible.

**Independent Test**: Before the update, note the form IDs of a published connection and a stored
draft, and save a local draft; after it, compare and open the overview.

**Acceptance Scenarios**:

1. **Given** a published connection or stored draft with the form ID "PK-30051", **When** the
   update is applied, **Then** its description is "PK-30051" in the overview, the details and the
   editor.
2. **Given** a local draft saved before the update, **When** the team member opens the overview
   or the create flow after it, **Then** that local draft is not offered and is removed.

### Edge Cases

- **Only spaces**: A description of only spaces is saved as empty and shown as nothing.
- **The same description twice**: Several connections may have the same description, as several
  could name the same serviceBW form before.
- **Changing only the description**: Like the name, it creates no new version of the documents or
  rules, sets nothing up with the wallet-communication service, and changes no URL.
- **An editor open during the update**: Its local draft is discarded; its stored draft, if any,
  keeps everything, its description included. A tab still running the old version may lose the
  description it saves, so the team reloads the app after the update, as after any release.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A form connection, published or draft, MUST have a description in place of the
  serviceBW form ("Form ID"). Screens MUST NOT say "Form ID" any more.
- **FR-002**: The description MUST be optional: an empty description MUST NOT block step 1's
  "Continue", saving a draft, publishing, or saving a published connection.
- **FR-003**: The description MUST be free text of at most 500 characters, after leading and
  trailing spaces are removed. A longer one MUST be refused with a message that names the limit.
- **FR-004**: Step 1 of the create and edit flows MUST offer the field as "Description", marked as
  optional. Its help text MUST say that it is a note for the team that applicants never see, and
  MUST NOT say that it decides where the data goes.
- **FR-005**: The overview's row and the details page of a connection or draft MUST show the
  description as written, without a prefix, and MUST show nothing in its place when it is empty.
- **FR-006**: Where a description doesn't fit on one line in the overview or the details page, it
  MUST be cut with "…" at the end of that line. Assistive technology MUST still read the whole
  description.
- **FR-007**: Every connection and stored draft MUST keep its former form ID, unchanged, as its
  description.
- **FR-008**: The value MUST be called "description" everywhere it is stored or exchanged, and no
  part of the system may keep the "serviceBW form" or "Form ID" name for it.
- **FR-009**: Local drafts saved before the change MUST NOT be offered for recovery and MUST be
  removed, without converting them. Stored drafts MUST NOT be affected.
- **FR-010**: The description MUST NOT affect requests: it MUST NOT create a new version of
  documents or rules, change a URL, reach the wallet-communication service, or appear in what
  serviceBW receives.

### Key Entities *(include if feature involves data)*

- **Form Connection**: Holds a name, an optional description (0-500 characters of free text, in
  place of the serviceBW form), the requested documents and fields, the rules, a status and its
  URLs. Its draft holds the same description.
- **Local Draft**: The browser's crash-recovery copy of the create or edit flow (spec 005). It
  holds the description in place of the serviceBW form; copies saved before this change are
  discarded.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A team member can create and publish a connection without a description, with no
  more steps or errors than with one.
- **SC-002**: After the update, 100% of connections and stored drafts show their former form ID,
  unchanged, as their description.
- **SC-003**: No screen of the app shows the words "Form ID".
- **SC-004**: At every supported screen width, a 500-character description takes exactly one line
  in the overview and in the details page.
- **SC-005**: Every URL in use before the update keeps working, and no request in progress is
  affected.

## Assumptions

- The limit stays at the form ID's 500 characters, and the field stays a single-line text field.
- "Too long" means "doesn't fit on one line in the space available", not a fixed number of
  characters, so the cut moves with the screen width.
- Applicants never see the description, as they never saw the form ID.
- Discarding local drafts is acceptable: they are crash-recovery copies that expire after 30 days
  anyway, and stored drafts keep everything.
- Specs 001 and 005 stay as written; this spec takes precedence where they disagree.
