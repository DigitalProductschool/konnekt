# Feature Specification: The stored-data features of the KERN Revamp design (deferred group A)

**Feature Branch**: `010-revamp-backend-gaps` (feature directory `specs/010-revamp-backend-gaps/`;
no git branch was created, the worktree's repository is not reachable from this machine)

**Created**: 2026-11-10

**Status**: Draft

**Input**: User description: "Add to the management UI the stored-data features the KERN Revamp
design draws and feature 008 deferred: go-live scheduling, the activity log, undo after deleting,
the example draft, a stored document order with drag reordering, the publish and deactivation
dates, a draft row's step on the overview, and bulk delete on the overview. The frames are listed
in specs/008-kern-revamp-redesign/deferred.md, group A, with their node ids; the frontend ports
them as drawn, and each item adds its backend field or endpoint, its api-types mirror and its MCP
tool where agents need it. All the things not mentioned (pdf, email, ...) are out of scope"

## Context

Spec 008 ported the redesigned management UI ("KERN Revamp", Figma "Middleware – V5", file
`s8mU9oJDq3411e8bxMjQO9`) and changed nothing outside the frontend: whatever the design draws
that needs data the middleware does not keep was left out and recorded in
`specs/008-kern-revamp-redesign/deferred.md` (spec 008, Clarification 2026-11-06 #1). This
feature builds eight items of that file's group A, each with the data it needs. Spec 008's
screens and behaviour and spec 009's two languages are the baseline and are taken as complete.

| # | Item (id in `deferred.md`) | What the middleware lacks today | Baseline it supersedes |
|---|---|---|---|
| 1 | Go-live scheduling (F1) | a start date for a published connection, and something that makes it active on that date | 002-S5.7, 002-S5.8, 002-S6.7 (publishing goes live at once); spec 008's F1 decision |
| 2 | Status dates (Q37 (c)) | when a connection became active and when it was deactivated | 005-S3.3, spec 008 FR-048 ("Edited <date>" on every row, no date pill), spec 008 #52 (the ⋯ menu's place) |
| 3 | A draft row's step (F71) | the draft's step in the overview's list | spec 008 #62 (the step is left out) |
| 4 | The activity log (F2) | a record of who did what to a connection | 002-S6.9, spec 008's F2 decision (no Activity card) |
| 5 | Undo after deleting (F4) | a deletion that can be taken back | 001-S6.11, 001-S6.12 (deletion is permanent); spec 008's F4 decision |
| 6 | Bulk delete on the overview (Q11) | deleting several connections in one step | spec 008 FR-028 (row delete only) |
| 7 | A stored document order with drag reordering (Q14 (e)) | the order of a connection's documents | 002-S1, spec 008 FR-031j (catalog order, no reordering) |
| 8 | The example draft (Q9 (b)) | a draft that knows it is the example | spec 008 FR-027 (the welcome page without the entry) |

**The design decides the screens.** The frames are listed per item in `deferred.md`, group A,
and are ported as drawn, wording included, under spec 008's rules (its sources table, "Figma
decides wording", its verification tables). The frames this spec quotes, with the nodes found
when they were read for it on 2026-11-10 (some node ids in `deferred.md` point at a neighbouring
frame; these are the ones that hold the text):

| Item | Frames (node ids) |
|---|---|
| Scheduling | publish dialog P1 `6376:25342`, P1b `6383:66097` (dialog `6383:66119`), P1c `6635:36242` (error); scheduled details `7246:52715`, `7246:53289`, `7246:53937`, `7246:54565`, P11 `6396:48548`; ⋯ menu P14 `6417:30900` (`6417:31045`); "Change start date" P12 `6396:48739` (dialog `6396:48860`); reactivate P16b `7173:52874` (dialog `7173:52959`); editing a scheduled connection E6 `7114:49683`; overview row `6739:40517`; deleting a scheduled connection `6872:45855` (dialog `6872:45929`) |
| Status dates | details pills `7355:61158`, `7355:61822` (active), `7355:60692` (scheduled), `7355:60885`, `7355:61546` (deactivated), `7362:54712` (draft); overview rows in `6699:44240` |
| Draft step | `6699:48031` in `6699:47943` |
| Activity | open: P10 `6396:48278` (rows `6396:48527`), scheduled `7246:53937` (rows `7246:54525`), deactivated `7246:56374` (rows `7246:56965`); closed `6809:46582`; draft `7362:54691` |
| Undo | P18 `6699:48039` (toast `6699:48098`) |
| Bulk delete | selection bar `6699:45199` (`6699:45206`); dialog `6699:45259` (`6699:45320`) |
| Document order | R1 `7298:63317`, R2 `7298:63736`, R3 `7298:64157`; build notes 19 and 37 (`7370:55193`) |
| Example | section `7321:52067`: entry 1b `6699:44481`, dialog 1g `6793:47676` (`6793:47710`), step 1 `6793:47711`, rules `7344:96387`, `7344:96414`, `7344:96442`, the list `6793:47768`; publish dialog `7137:50083` (`7137:50210`) |

**What the design leaves undrawn** (a result page, a toast, a state, a text for a second case) is
built from spec 008's patterns for undrawn states, with copy written in this feature in the
drawn style and recorded in its contracts. Each such place is named where it occurs below.

## Clarifications

### Session 2026-11-10

- Q: The design also draws a start date for a connection that is already active, in "Change start
  date" ("also after 'Now'") and in "Save changes?" ("Citizens get the new version from the time
  you choose."). How far does scheduling go for an active connection? → A: "Change start date"
  only. An active connection can be given a later start date: it is scheduled from then on, its
  links stop until the date as after a deactivation, and requests in progress are cancelled,
  since F13 stays out of scope. "Save changes?" keeps taking effect at once: saved changes that
  wait for a date would need a second version beside the live one, which is what the excluded
  item F5 needed, and the design draws no screen for it (FR-009).
- Q: An approved request of an agent publishes or reactivates at once today. May agents ask for a
  start date? → A: Yes, with approval. A request to publish or to reactivate may name a start
  date, and agents with "Read, edit drafts and manage live connections" may ask to change a
  connection's start date; the approval page shows the date, and approving schedules it (FR-065).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Schedule when a connection goes live (Priority: P1)

A team member of DO.IT has finished a connection, but the serviceBW form that will use it starts
on a fixed day. Today publishing goes live at once, so they either publish early or come back on
the day. With this feature the publish dialog asks "Active from": "Now" or "On a date". With a
date, the connection is published and its links exist at once, so that the form can be prepared,
but citizens can use it only from that day on. Until then the connection is "Scheduled": the
overview, the header and the details say so and show the date, and the team member can move the
date, start it now, edit what will go live, or delete it. On the day, the connection becomes
active by itself. Activating a deactivated connection again offers the same choice.

**Why this priority**: it is the largest item and the only one that changes what citizens can do
and when. The other items show or tidy what is already there.

**Independent Test**: can be fully tested by publishing a draft with a date, checking the
scheduled state on the overview, the details and the links' answers, changing the date, letting
the date arrive, and repeating with "Activate again" on a deactivated connection.

**Acceptance Scenarios**:

1. **Given** the publish dialog, **When** it opens, **Then** it shows "Active from" with "Now"
   selected and "On a date", the sentence "When you publish, the connection is ready to be added
   to your services." and the button "Publish connection", and publishing with "Now" goes live at
   once, as today.
2. **Given** the publish dialog, **When** the team member chooses "On a date", **Then** the
   sentence reads "The connection becomes active on the date you choose. You get the links now,
   so your service can be ready in time.", a date field "DD.MM.YYYY" shows under the radios and
   the button reads "Schedule".
3. **Given** "On a date" with no date, with today's date, a past date or something that is no
   date, **When** the team member chooses "Schedule", **Then** the field turns to its error state,
   "Enter a date after today." shows under it and nothing is published.
4. **Given** "On a date" with 01.12.2026, **When** the team member chooses "Schedule", **Then**
   the details open with "Your connection is scheduled", the sub-line "The links are ready to be
   added to your service. They become active on the scheduled date below.", the date pill "Active
   from 01.12.2026, 00:00" and the header pill "Scheduled · 01.12.2026"; the links are shown and
   can be copied; and serviceBW gets the same answer from them as from a deactivated connection.
5. **Given** a scheduled connection, **When** the overview lists it, **Then** its row shows the
   status "Scheduled" and "Active from 01.12.2026", with View, Edit and Delete as on other rows.
6. **Given** a scheduled connection, **When** 01.12.2026 begins in Germany, **Then** within a
   minute, with nobody signed in, the connection is active: its links work, the details read
   "Your connection is active" with "Active since 01.12.2026, 00:00", and the overview shows
   "Active".
7. **Given** a scheduled connection's details, **When** the team member opens the ⋯ on the date
   pill and chooses "Change start date", **Then** a dialog asks "Choose when citizens can use
   this connection." with "Now" and "On a date", "Cancel" and "Save date"; a new date replaces
   the old one everywhere, and "Now" makes the connection active at once.
8. **Given** a deactivated connection, **When** the team member chooses "Activate again",
   **Then** "Activate this connection again?" shows the summary and "Active from"; "Now" with
   "Activate" works as today, and "On a date" schedules the connection for that day.
9. **Given** a scheduled connection, **When** the team member edits it and saves, **Then** the
   edit flow is the one of an active connection with the header pill "Scheduled · 01.12.2026",
   and what was saved is what becomes active on the date; the date stays.
10. **Given** a scheduled connection, **When** the team member chooses Delete, **Then** the
    dialog reads "This connection will be active from 01.12.2026. If you delete it, it won't
    become active and its links won't work."
11. **Given** an active connection, **When** the team member chooses "Change start date" and saves
    a later date, **Then** the connection is scheduled for that day, its links answer as a
    deactivated connection's until then, and requests in progress are cancelled, as the dialog
    said; "Save changes?" on an active connection offers no date and takes effect at once.

---

### User Story 2 - See when a connection was published, became active or was deactivated (Priority: P2)

A team member looks at the overview or at a connection's details and wants to know since when it
has been in its state. Today every row reads "Edited <date>", which says nothing about a
connection that has been live for months. With this feature each row carries the date of its
state ("Published 12.09.2026", "Deactivated 20.10.2026"), a draft's row says which step it was
left in ("Edited 28.10.2026 · Rules step"), and the details carry a date pill under the status
("Active since 23.10.2026, 14:32", "Deactivated since 24.10.2026, 10:05") that also holds the
connection's ⋯ menu, as the design draws it.

**Why this priority**: small, visible on the two most used screens, and the date pill is where
User Story 1's "Active from" and menu live.

**Independent Test**: can be fully tested by publishing, deactivating and reactivating a
connection and saving a draft in each step, and reading the overview rows and the details' date
pill after each.

**Acceptance Scenarios**:

1. **Given** an active connection published on 12.09.2026, **When** the overview lists it,
   **Then** its row reads "Published 12.09.2026".
2. **Given** a connection deactivated on 20.10.2026, **When** the overview lists it, **Then** its
   row reads "Deactivated 20.10.2026".
3. **Given** a draft last saved in the rules step on 28.10.2026, **When** the overview lists it,
   **Then** its row reads "Edited 28.10.2026 · Rules step"; a draft left in another step names
   that step.
4. **Given** an active connection, **When** its details open, **Then** a date pill under the
   status sentence reads "Active since 23.10.2026, 14:32" and carries the ⋯ menu; saving changes
   to the connection does not change the pill.
5. **Given** a deactivated connection, **When** its details open, **Then** the pill reads
   "Deactivated since 24.10.2026, 10:05" with its ⋯, and "Activate again" stands next to it.
6. **Given** a connection that was deactivated and activated again, **When** its details open,
   **Then** "Active since" shows the time it was activated again, and its row still reads
   "Published" with the date it was published.

---

### User Story 3 - See who did what to a connection (Priority: P3)

Several team members, and their agents, work on the same connections. When something is
different from what a team member remembers, they want to know who changed it and when. The
details get the "Activity" card the design draws: closed, it shows "Last edited by <name> ·
<date, time>" and "View activity"; open, it lists what happened to the connection, newest first,
each entry with its time, what happened and who did it.

**Why this priority**: it answers a question that otherwise needs asking around, and it makes
agents' work traceable; nothing else depends on it.

**Independent Test**: can be fully tested by creating a draft, changing its documents, adding a
variant, changing rules, publishing, deactivating and reactivating with two team members and an
agent, and reading the card after each step.

**Acceptance Scenarios**:

1. **Given** a connection's details, in any status, **When** they open, **Then** an "Activity"
   card shows under the Summary with "Last edited by <name> · 23.10.2026, 14:32" and "View
   activity".
2. **Given** the Activity card, **When** the team member chooses "View activity", **Then** the
   entries show newest first, each with its date and time, its event and the person, for
   example "Published", "Rules changed in Ambulance", "Variant added: Ambulance", "Documents
   changed", "Created"; the control reads "Hide activity", and the other open card closes.
3. **Given** a deactivated connection, **When** its details open, **Then** the card's line reads
   "Deactivated by <name> · 24.10.2026, 10:05" and the list's newest entry is "Deactivated".
4. **Given** an agent changed a draft's rules for a team member, **When** the card is opened,
   **Then** the entry names the team member and the agent.
5. **Given** a team member approved an agent's request to publish, **When** the card is opened,
   **Then** "Published" names the team member who approved and the agent that asked.
6. **Given** a scheduled connection whose date arrived, **When** the card is opened, **Then** an
   entry says that it became active, without a person.

---

### User Story 4 - Take back a deletion (Priority: P4)

A team member deletes a connection and sees at once that it was the wrong one. Today it is gone
for good. With this feature the toast that confirms the deletion offers "Undo", and Undo brings
the connection back as it was.

**Why this priority**: deleting is the one action that cannot be repaired today, and User Story 5
makes it faster to delete several at once.

**Independent Test**: can be fully tested by deleting a draft, an active, a scheduled and a
deactivated connection from the overview and from the details, choosing "Undo" in the toast, and
comparing the connection before and after.

**Acceptance Scenarios**:

1. **Given** a connection was deleted from the overview or the details, **When** the overview
   shows, **Then** the toast reads ""<name>" deleted." with "Undo".
2. **Given** that toast, **When** the team member chooses "Undo", **Then** the connection is in
   the list again with its name, description, documents, variants, rules, status, dates and
   activity, and a published connection has the same links as before.
3. **Given** the last connection was deleted and the welcome page shows, **When** the team member
   chooses "Undo", **Then** the overview shows again with the connection.
4. **Given** the time in which a deletion can be taken back has passed, **When** the team member
   chooses "Undo", **Then** they are told that the connection can no longer be restored, and
   nothing changes.

---

### User Story 5 - Delete several connections at once (Priority: P5)

After a round of trials the overview holds a handful of drafts and old connections. Today each
needs its own Delete and its own confirmation. With this feature every row has a checkbox and the
header a select-all; selecting rows swaps the toolbar for a selection bar "N selected · Cancel ·
Delete", and one dialog lists what will be deleted, with each connection's status and a warning
for those that are active.

**Why this priority**: a convenience for tidying up; row delete already exists.

**Independent Test**: can be fully tested by selecting connections of different statuses,
deleting them through the bar and the dialog, undoing, and by making one of them change in
another tab before confirming.

**Acceptance Scenarios**:

1. **Given** the overview, **When** the team member ticks two of three rows, **Then** the
   toolbar is replaced by "2 selected", "Cancel" and "Delete", and the select-all checkbox shows
   its mixed state.
2. **Given** two rows are selected, one active and one a draft, **When** the team member chooses
   "Delete", **Then** the dialog "Delete 2 connections?" shows "Their documents and rules will be
   deleted too.", one line per connection with its name and status, "<name> is active. Citizens
   won't be able to use it." for the active one, and "Keep connections" and "Delete connections".
3. **Given** that dialog, **When** the team member chooses "Delete connections", **Then** both
   are deleted together, the selection is cleared, the toolbar is back and a toast says so, with
   "Undo" that brings both back.
4. **Given** one of the selected connections was deleted or changed its status in the meantime,
   **When** the team member confirms, **Then** nothing is deleted, the dialog says which
   connection changed, and the list shows the current state.
5. **Given** rows are selected, **When** the team member chooses "Cancel", **Then** the selection
   is cleared and the toolbar is back as it was.

---

### User Story 6 - Put the documents in the order that makes sense (Priority: P6)

A connection requests two or more documents. Today the documents step lists them in the
catalog's order, whatever the team member added first. With this feature the list keeps the
order the team member sets: a new document goes to the end, and a document can be moved by
dragging it (press and hold on touch) or, without dragging, with "Move up" and "Move down". The
order is saved with the connection and used wherever its documents are listed.

**Why this priority**: it changes how a connection reads, not what it does.

**Independent Test**: can be fully tested by adding documents in an order that differs from the
catalog's, reordering them with the mouse, by touch and with the keyboard alone, saving, and
finding the same order in the pager, the test step, the publish dialog and the details.

**Acceptance Scenarios**:

1. **Given** "Personal ID" then "Driving licence" in the list, **When** the team member drags
   "Driving licence" above "Personal ID", **Then** while dragging a line marks where it will
   land and a faded copy follows the pointer, and after the drop the list reads "Driving
   licence", "Personal ID", the open document stays open and the pager reads "Document 1 of 2".
2. **Given** a touch screen, **When** the team member presses and holds a document and moves it,
   **Then** it is dragged as with the mouse, and a short touch still scrolls the list.
3. **Given** the keyboard alone, **When** the team member chooses "Move up" on the second
   document, **Then** it becomes the first, the focus stays with it, and the move is announced
   with the document's new position.
4. **Given** a reordered draft, **When** it is saved, reopened and published, **Then** the
   documents step, the test step's data, the publish dialog's summary and the details' Summary
   list the documents in that order.
5. **Given** a published connection, **When** its documents are reordered in the edit flow and
   saved, **Then** the new order shows in the management UI and nothing changes for citizens or
   for serviceBW.

---

### User Story 7 - Start from an example (Priority: P7)

A team member opens the product for the first time. The welcome page offers "Create connection"
and, with this feature, "Start from an example": a dialog explains that it creates a draft
"Passenger transport licence (example)" with 2 documents and 2 rules, and "Create the example"
opens that draft in the wizard. Banners in the steps say that it is an example and what to try.
The example is a normal draft: it can be changed, tested, published and deleted. If it is
published without any change, the publish dialog reminds the team member to check that it fits
their service.

**Why this priority**: it helps once per team; everything it creates could also be typed.

**Independent Test**: can be fully tested on an installation without connections: creating the
example, walking its steps, publishing it unchanged and changed, and finding it on the overview.

**Acceptance Scenarios**:

1. **Given** no connection exists, **When** the welcome page shows, **Then** "Start from an
   example" stands beside "Create connection".
2. **Given** the welcome page, **When** the team member chooses "Start from an example", **Then**
   the dialog "Start from an example?" reads "This creates a draft called "Passenger transport
   licence (example)" with 2 documents and 2 rules. It only becomes active when you publish.",
   with "Go back" and "Create the example".
3. **Given** that dialog, **When** the team member chooses "Create the example", **Then** the
   draft exists, the wizard opens its first step with the name and the description filled in and
   the banner "This is an example. Change anything to see how it works.".
4. **Given** the example's rules step, **When** it shows Standard, **Then** it holds Rule 01
   (at least 21 years old) AND Rule 02 (class B for at least 2 years) with the banner "Try
   changing the age to 18 or adding a rule. Then use Test rules to check the result."; the
   variant "Ambulance" follows Standard with both rules changed (19 years, 1 year) and the banner
   "Ambulance is more lenient than Standard. Rules 01 and 02 are changed here.".
5. **Given** the unchanged example, **When** the publish dialog opens, **Then** it adds "This is
   still the example. Check that the name, documents and rules fit your service." and publishing
   still works; after any change to the example the line is gone.
6. **Given** the example exists, **When** the overview lists it, **Then** it is a draft like any
   other, named "Passenger transport licence (example)", and the overview offers only "Create
   connection".

---

### User Story 8 - Agents see and use the new data (Priority: P8)

A team member's agent (spec 007) reads and prepares connections through the MCP server. What
this feature adds for people must not be invisible or contradictory for agents: an agent sees
that a connection is scheduled and from when, since when it has been active or deactivated,
which step a draft was left in, the documents in the team's order, that a draft is the example,
and the connection's activity; it can move a document in a draft; and it can ask, with approval,
for a start date. What an agent does shows up in the activity.

**Why this priority**: it keeps spec 007's promise that agents read everything a team member sees
and change drafts as the editor does; no person's story depends on it.

**Independent Test**: can be fully tested with an MCP client at each access level: reading a
scheduled connection, an example draft and a connection's activity, moving a document in a
draft, and asking for a scheduled publication and approving it in the browser.

**Acceptance Scenarios**:

1. **Given** a scheduled connection, **When** an agent searches for or reads it, **Then** the
   answer says "scheduled", gives the start date and says that its links answer "unavailable"
   until then; a search can be limited to scheduled connections.
2. **Given** a draft with two documents, **When** an agent with "Read and edit drafts" moves the
   second document to the first place, **Then** the stored draft has that order, exactly as after
   the same move in the editor.
3. **Given** a publishable draft, **When** an agent asks to publish it on 01.12.2026 and the team
   member approves, **Then** the approval page showed "Active from 01.12.2026" before approving,
   and the connection is scheduled for that day.
4. **Given** any connection, **When** an agent with "Read only" asks for its activity, **Then**
   it gets the same entries as the Activity card.
5. **Given** an agent, **When** it looks for a way to restore a deleted connection, to delete
   several at once or to create the example, **Then** there is none: these stay actions of a
   person in the browser.

---

### Edge Cases

- **Midnight between opening and confirming**: a dialog opened on 30.11. with the date 01.12.
  and confirmed after midnight is refused with "Enter a date after today."; nothing is published
  or changed.
- **The service was not running when the start date came**: the connection becomes active as
  soon as the service runs again; its "Active since" is the scheduled start.
- **A scheduled connection is deactivated**: the schedule is cancelled; the connection is
  deactivated and can be activated again, now or on a date.
- **A scheduled connection is deleted and restored after its date has come**: it becomes active
  at once.
- **Requests in progress when a connection is deleted**: they are cancelled at once, as today,
  and stay cancelled after "Undo"; citizens start again. Approval requests that were waiting for
  the connection stay cancelled too.
- **Undo is chosen twice, or after a colleague's later action**: the second Undo changes nothing
  and says so.
- **The toast with "Undo" is replaced by a later toast or the page is left**: the deletion
  stands; there is no other place to restore from.
- **Connections that existed before this feature**: their rows and pills show the dates that are
  known (FR-021), their documents keep the order they have today, and their activity starts
  with what is known, without a person (FR-032).
- **A team member's account is removed**: the activity keeps the name as it was when the entry
  was made.
- **A long activity**: the list stays usable with hundreds of entries and reaches the oldest one;
  no frame draws this.
- **A selection and the search**: select-all selects the rows that are listed, that is, those the
  search shows; rows hidden by the search are not selected.
- **A selected row disappears** (a colleague deleted it and the list refreshed): it leaves the
  selection, and the count follows.
- **A long selection**: the bulk dialog lists every selected connection and scrolls inside
  itself; its buttons stay in view.
- **Only one document**: nothing can be reordered and no reorder control shows.
- **A drag is dropped outside the list or ended with Escape**: the order is unchanged.
- **A removed document is brought back with the documents step's "Undo"** (spec 008): it returns
  to the place it had.
- **Reduced motion**: dragging and reordering follow spec 008's rule (transitions off).
- **The example is created twice** (two team members on a fresh installation at the same
  moment): two example drafts exist; each is a normal draft.
- **The example and the language** (spec 009): the example is created in the language the team
  member uses at that moment and stays as created; its banners follow the language.
- **The catalog changes**: the example always fits the catalog it is created from; a catalog
  without one of its documents must not ship with a broken example.
- **Narrow windows, zoom, keyboard**: every new control and state keeps spec 008's bar (320 px
  at 200 % zoom, no horizontal scroll, visible keyboard focus).

## Requirements *(mandatory)*

### Functional Requirements

#### Go-live scheduling (User Story 1)

- **FR-001**: The publish dialog MUST show "Active from" with the choices "Now" (selected when
  the dialog opens) and "On a date", as drawn. With "Now" it MUST read "When you publish, the
  connection is ready to be added to your services.", its button MUST read "Publish connection",
  and publishing MUST go live at once, as today.
- **FR-002**: With "On a date" the dialog MUST read "The connection becomes active on the date
  you choose. You get the links now, so your service can be ready in time.", MUST show a date
  field (DD.MM.YYYY) under the radios, and its button MUST read "Schedule".
- **FR-003**: A start date MUST be a calendar day after today in Germany. For an empty field,
  today, a past day or something that is no date, the field MUST turn to its error state with
  "Enter a date after today." under it, and nothing MUST be published or changed; "Schedule"
  stays enabled and shows the error. The same refusal MUST hold when the day changes between
  opening the dialog and confirming.
- **FR-004**: Scheduling MUST publish the connection in every respect except that it is not
  active yet: it is a published connection, no draft; its links exist from that moment, are shown
  on its details and can be copied; and until the start its links MUST answer serviceBW exactly
  as a deactivated connection's do, so that no request can be started and serviceBW cannot tell
  the two apart.
- **FR-005**: The start MUST be the beginning of the chosen day in Germany (00:00). The
  connection MUST become active by itself at that time, within one minute, with nobody signed
  in, and MUST from then on be an active connection in every respect. If the middleware was not
  running at that time, it MUST become active as soon as the middleware runs again.
- **FR-006**: "Scheduled" MUST be a status of its own wherever a connection's status shows: the
  overview row (status "Scheduled", date "Active from <date>"), the header pill ("Scheduled ·
  <date>"), the details' status band ("Your connection is scheduled", "The links are ready to be
  added to your service. They become active on the scheduled date below.", the date pill "Active
  from <date>, 00:00"), the edit flow's header, and the delete dialogs (FR-010, FR-041).
- **FR-007**: A scheduled connection's details MUST otherwise be those of an active connection:
  the Links card with every link and its copy button enabled, the Summary, the Activity card and
  the footer's "Edit connection" and "Go to connections".
- **FR-008**: The connection's ⋯ menu of a scheduled connection MUST hold "Change start date",
  "Deactivate" and, after a divider, "Delete connection". "Change start date" MUST open the
  dialog as drawn: the title "Change start date", "Choose when citizens can use this
  connection.", the choices "Now" and "On a date" with the date field, "Cancel" and "Save date".
  A new date (checked as FR-003) MUST replace the start everywhere it shows; "Now" MUST make the
  connection active at once. A toast MUST confirm the change (copy written in this feature).
- **FR-009**: An active connection's ⋯ menu MUST also hold "Change start date", before
  "Deactivate", as drawn ("also after 'Now'"). Its dialog MUST open with "Now (active since
  <date>, <time>)" selected, and saving with "Now" MUST change nothing. Saving with "On a date"
  (checked as FR-003) MUST make the connection scheduled for that day: from that moment its links
  answer as a deactivated connection's do until the start, and requests in progress are treated
  as a deactivation treats them today, that is, cancelled. The dialog's hint MUST say so: of the
  drawn "Until that date, citizens can't start a new request. Requests already started still
  finish.", the first sentence stays and the second names the cancellation, because letting
  started requests finish is the excluded item F13. "Save changes?" on an active connection MUST
  have no "Active from" choice and MUST take effect at once, as today; its body stays spec 008's,
  without "from the time you choose" (Clarification 2026-11-10 #1).
- **FR-010**: Deleting a scheduled connection MUST ask with the body "This connection will be
  active from <date>. If you delete it, it won't become active and its links won't work.", in
  the delete dialog spec 008 built.
- **FR-011**: "Activate this connection again?" MUST show "Active from" with "Now" (selected) and
  "On a date" under its summary. "Now" with "Activate" MUST work as today. "On a date" MUST
  schedule the deactivated connection for that day (FR-003 to FR-006); the button's label for
  that case is not drawn and reads "Schedule", as in the publish dialog.
- **FR-012**: Deactivating a scheduled connection MUST cancel its schedule: it is deactivated,
  with "Deactivated since" the time of that action, and can be activated again, now or on a date.
  The deactivate dialog's sentence for a connection that was never active is not drawn and is
  written in this feature.
- **FR-013**: Editing a scheduled connection MUST go through the entry confirmation and the edit
  flow of an active connection (spec 008, FR-045), with the header pill "Scheduled · <date>".
  What is saved MUST be what becomes active on the date, and saving MUST NOT change the date. The
  save dialog's sentence for this case is not drawn and is written in this feature.
- **FR-014**: After "Schedule", the publish dialog's states and the way to the details MUST follow
  spec 008's publish dialog (publishing, done, failed with the error ID); a failure MUST leave
  the draft a draft, and a failed reactivation or change of the date MUST leave the connection
  as it was.

#### Status dates and the draft's step (User Story 2)

- **FR-015**: A published connection's details MUST show a date pill under the status sentence,
  as drawn, with date and time: "Active since <date>, <time>" while active, "Active from <date>,
  00:00" while scheduled, "Deactivated since <date>, <time>" while deactivated. A draft's details
  keep "Edited <date>, <time>".
- **FR-016**: The connection's ⋯ menu MUST sit on the date pill, as drawn, and while the
  connection is deactivated "Activate again" MUST stand next to the pill; a draft's pill has no
  ⋯. This supersedes spec 008's Clarification #52, which moved both to the band's right end
  because the pill was not built.
- **FR-017**: An overview row's date MUST read by status: "Published <date>" for an active
  connection, "Active from <date>" for a scheduled one, "Deactivated <date>" for a deactivated
  one, and "Edited <date> · <step> step" for a draft.
- **FR-018**: The dates MUST mean: "Published", the day the connection was published (with "Now"
  or with a date); "Active since", the time it last became active, through publishing with
  "Now", through its start date or through "Activate again"; "Deactivated", the time it was last
  deactivated. Saving changes, renaming and reordering MUST NOT change any of them.
- **FR-019**: A draft's row MUST name the step the draft was last saved in, for each of the four
  steps ("Connection step", "Documents step", "Rules step", "Test step"), whoever saved it, a
  team member or an agent. A published connection's row names no step.
- **FR-020**: Dates MUST read DD.MM.YYYY, and dates with a time "DD.MM.YYYY, HH:MM", in both
  languages (spec 009, FR-012). A start date and its "00:00" MUST read the same for every team
  member, as the day in Germany.
- **FR-021**: A connection that existed before this feature MUST show the dates that are known:
  its publication as stored, "Active since" as its publication, and, if it is deactivated,
  "Deactivated" as the time of its last change. Its row and pill MUST never be empty.

#### Activity (User Story 3)

- **FR-022**: The details of every connection, draft, scheduled, active or deactivated, MUST show
  the "Activity" card as drawn, after the Summary: closed, the title, the line "Last edited by
  <name> · <date>, <time>" and "View activity"; open, the entries and "Hide activity". It MUST
  open and close with the Links and Summary cards as spec 008's FR-046 says for those two (one
  open at a time).
- **FR-023**: An entry MUST show its date and time, what happened, and who did it. Entries MUST
  be listed newest first.
- **FR-024**: The line of the closed card MUST name the person and the time of the newest entry
  that has a person. While the connection is deactivated it MUST read "Deactivated by <name> ·
  <date>, <time>" instead.
- **FR-025**: The activity MUST record, for every connection, at the moment it happens: that it
  was created; that its name or description changed; that its documents changed (a document
  added, removed or moved, or its data chosen differently); that a variant was added, removed or
  renamed, with the variant's name; that the rules of a variant changed, with the variant's name;
  that it was published; that it was scheduled or its start date changed, with the date; that it
  became active on its start date; that it was deactivated; that it was activated again; that
  it was deleted and that it was restored. The drawn wording is used word for word ("Created",
  "Documents changed", "Variant added: <name>", "Rules changed in <variant>", "Published",
  "Deactivated"); the others are written in this feature in the same style.
- **FR-026**: One save that changes several things MUST give one entry per kind of change. The
  same kind of change by the same person on the same variant, with no other entry in between,
  MUST show as one entry with the latest time, so that an agent's twenty rule edits or a team
  member's repeated saves do not fill the list.
- **FR-027**: The person of an entry MUST be the team member who acted, shown by the name the
  user menu shows. For a change an agent made, the entry MUST name the team member the agent
  acts for and the agent. For an action a team member approved for an agent, it MUST name the
  team member who approved and the agent that asked. An entry for something the middleware did by
  itself (FR-005) has no person.
- **FR-028**: An entry MUST keep its person's name as it was when it was made, also after the
  account is gone.
- **FR-029**: The activity MUST hold only what FR-025 lists. It MUST NOT hold the content of a
  rule, a message for citizens, a value, a finding, a test persona or its result, anything about
  a citizen or a request, or anything a team member did without changing the connection (views,
  copies, tests, declined or expired approval requests).
- **FR-030**: The activity MUST be kept as long as the connection exists, MUST come back with a
  restored connection, and MUST be gone for good once a deletion can no longer be taken back.
- **FR-031**: Every team member MUST be able to read every connection's activity, as every team
  member can read every connection; no one can change or remove an entry.
- **FR-032**: The activity of a connection that existed before this feature MUST start with what
  is known, "Created" and, if published, "Published", with their times and without a person; the
  closed card's line then shows the time alone until someone acts.

#### Undo after deleting (User Story 4)

- **FR-033**: After a connection is deleted, from the overview or from the details, the toast
  MUST read ""<name>" deleted." with the action "Undo", as drawn, for a connection of every
  status.
- **FR-034**: "Undo" MUST bring the connection back as it was before the deletion: its name,
  description, documents and their order, variants and rules, its status (a draft with its step,
  an active, scheduled or deactivated connection with its dates and start date), its activity
  and, for a published connection, the same links, which work again as its status says. The
  restored connection MUST appear in the list without a reload, and the restore MUST be
  announced.
- **FR-035**: A deletion MUST take effect at once, as today: the connection is gone from the
  overview, the search, the details and agents' reads, its links stop, and requests in progress
  are cancelled. "Undo" MUST NOT bring back requests that were cancelled or approval requests
  that were waiting.
- **FR-036**: A deletion MUST be restorable for a limited time, 5 minutes unless the middleware's
  settings say otherwise, and only through the toast's "Undo" of the team member who deleted.
  The toast keeps "Undo" for as long as it shows (spec 008: a toast with an action stays until
  it is used, dismissed or replaced). An "Undo" after the time MUST change nothing and MUST say
  that the connection can no longer be restored. After the time, the deletion MUST be final
  exactly as a deletion is today.
- **FR-037**: When the last connection is deleted, the welcome page MUST show with the toast, and
  "Undo" MUST bring back the overview with the connection (spec 008, FR-027).

#### Bulk delete (User Story 5)

- **FR-038**: Every overview row MUST have a checkbox and the list's header a select-all
  checkbox, as drawn, each with an accessible name that names the connection or "all". Rows of
  every status can be selected.
- **FR-039**: While at least one row is selected, the toolbar (the count and the search) MUST be
  replaced by the selection bar "<n> selected", "Cancel" and "Delete", as drawn, and the count
  MUST be announced when it changes. The rows' own actions stay.
- **FR-040**: The select-all checkbox MUST select every listed row, MUST clear the selection when
  all are selected, and MUST show its mixed state while some are. "Cancel" MUST clear the
  selection and bring the toolbar back as it was. The selection MUST NOT outlive the page.
- **FR-041**: "Delete" with two or more rows selected MUST open one dialog, as drawn: "Delete <n>
  connections?", "Their documents and rules will be deleted too.", one line per selected
  connection with its name and status, a warning line for each connection that citizens can use
  or will be able to use ("<name> is active. Citizens won't be able to use it."; the lines for
  several active connections and for a scheduled one are written in this feature after the
  single dialogs' sentences), and "Keep connections" and "Delete connections". With exactly one
  row selected, "Delete" MUST open that connection's own delete dialog.
- **FR-042**: The dialog MUST follow the rule of dialogs that delete: "Keep connections", × and
  Escape close it without a change and return the focus to the bar; a click on the scrim does
  not close it; nothing closes it while the deletion runs.
- **FR-043**: "Delete connections" MUST delete all selected connections or none. If one of them
  no longer exists or no longer has the status the dialog showed, nothing MUST be deleted, the
  dialog MUST say which connection changed, and the list MUST show the current state. A failure
  MUST show as spec 008's failures do, with the error ID where there is one.
- **FR-044**: After a bulk deletion the rows MUST be gone, the selection cleared, the toolbar back,
  and a toast MUST say how many connections were deleted, with "Undo" that brings all of them
  back or none (FR-034 to FR-036). The toast's sentence is not drawn and is written in this
  feature. Each connection's deletion and restore MUST show in its activity.

#### Document order (User Story 6)

- **FR-045**: A connection's documents MUST be kept in the order the team member gives them. A
  document that is added MUST go to the end; removing one MUST leave the others' order; a removed
  document that the documents step's "Undo" brings back MUST return to its place.
- **FR-046**: In the documents step a document MUST be movable by dragging its row with a
  pointer and, on touch, by pressing and holding it, as drawn: a line marks where it will land, a
  faded copy follows the pointer, and after the drop the list shows the new order. A short touch
  MUST still scroll. A drop outside the list and Escape MUST leave the order unchanged.
- **FR-047**: Every document MUST also be movable without dragging, by "Move up" and "Move
  down", operable with the keyboard and with a single pointer; the first document has no "Move
  up" and the last no "Move down". After a move the focus MUST stay with the moved document and
  the move MUST be announced with the document's name and new position. The design names this
  need without drawing it (build note 37), so the controls' place and texts are decided in this
  feature from spec 008's menu pattern.
- **FR-048**: Reordering MUST NOT change which document is open, and the pager ("Document n of
  m") MUST count in the list's order.
- **FR-049**: Reordering MUST work in the create flow, in a draft and in the edit flow of a
  published connection, and MUST be saved as every other change of that flow is: with the draft,
  with publishing, and with "Save" in the edit flow. A draft kept on the device (spec 005) MUST
  keep the order too.
- **FR-050**: Wherever a connection's documents are listed, they MUST be in the stored order: the
  documents step and its pager, the test step's data, the summaries of the publish, save and
  reactivate dialogs, the details' Summary, the approval page and agents' reads. The data items
  inside a document stay in the catalog's order.
- **FR-051**: The order MUST NOT change what serviceBW receives or what the wallet is asked for:
  reordering alone changes nothing for citizens, for requests in progress or for the links.
- **FR-052**: A connection that existed before this feature MUST keep the order its documents
  show today.

#### The example (User Story 7)

- **FR-053**: While no connection exists, the welcome page MUST offer "Start from an example"
  beside "Create connection", as drawn. The overview, shown once a connection exists, MUST NOT
  offer it.
- **FR-054**: "Start from an example" MUST open the dialog as drawn: "Start from an example?",
  "This creates a draft called "Passenger transport licence (example)" with 2 documents and 2
  rules. It only becomes active when you publish.", "Go back" and "Create the example". "Go
  back", × and Escape MUST close it without creating anything.
- **FR-055**: "Create the example" MUST store a draft and open it in the wizard at its first
  step. The draft MUST hold what the frames draw: the name "Passenger transport licence
  (example)"; the description "Licence to drive taxis, rental cars and ambulances. Checks age and
  driving experience."; the documents Personal ID (7 data items) and Driving licence (2 data
  items); in Standard, Rule 01 "Date of birth (Age) is at least 21 years old" with "You need to
  be at least 21 years old." AND Rule 02 "Licence class B – Issue date is at least 2 years ago"
  with "You need to have held a class B driving licence for at least 2 years."; and the variant
  "Ambulance", linked to Standard, described "For ambulance services. Some rules differ from
  Standard.", with Rule 01 changed to 19 years and Rule 02 to 1 year and their messages to match.
- **FR-056**: The example MUST always be a complete, publishable draft: publishing's checks pass
  on it unchanged, and the rule checks find nothing in it.
- **FR-057**: The example MUST be a normal draft in every other respect: listed on the overview
  as a draft, editable by team members and agents, testable, publishable, deletable, and counted
  as a connection for the homepage (spec 008, FR-027).
- **FR-058**: While the draft is the example, the wizard MUST show the example banners as drawn:
  on the connection step "This is an example. Change anything to see how it works."; on the
  rules step, for Standard, "Try changing the age to 18 or adding a rule. Then use Test rules to
  check the result." and, for Ambulance, "Ambulance is more lenient than Standard. Rules 01 and
  02 are changed here.". The design asks for a banner on each step and draws none for the
  documents and test steps; they show the connection step's sentence. A banner is information
  only: it has no action and cannot be dismissed.
- **FR-059**: A draft MUST stop being the example when it is published; a published connection
  shows no example banner. Until then it stays the example, whatever is changed in it.
- **FR-060**: When the example is published while nothing in it was changed since it was created
  (its name, description, documents, data items, variants and rules are the example's), the
  publish dialog MUST add the line "This is still the example. Check that the name, documents and
  rules fit your service."; publishing MUST still work. After any saved change the line MUST NOT
  show. The approval page of a request to publish it MUST show the same line.
- **FR-061**: The example's own texts (its name, description, the variant's name and description,
  the rules' messages) MUST be created in the language the team member uses at that moment and
  are content from then on (spec 009, FR-007).

#### Agents (User Story 8)

- **FR-062**: Agents' reads of a connection and their search MUST carry what this feature adds
  for team members: the status "scheduled" with its start date and what its links answer until
  then; the dates of FR-018; a draft's step; the documents in the stored order; and that a draft
  is the example. The search MUST accept "scheduled" as a status beside draft, live and
  deactivated (spec 007, FR-007).
- **FR-063**: Agents of every access level MUST be able to read a connection's activity, with the
  same entries as the Activity card.
- **FR-064**: Agents with "Read and edit drafts" or more MUST be able to move a document in a
  draft, one change per call, with the same stored result as the same move in the editor (spec
  007, FR-012 to FR-016). A document an agent adds goes to the end.
- **FR-065**: Agents MUST be able to ask for a start date, with the team member's approval as
  spec 007's FR-021 says. A request to publish a draft or to reactivate a connection MAY name a
  start date; without one it acts at once, as today. Agents with "Read, edit drafts and manage
  live connections" MUST be able to ask to change the start date of a scheduled or an active
  connection, to another date or to now (FR-008, FR-009). The approval page MUST show the start
  as part of what will happen: "Active from <date>", or that the connection goes live at once,
  and, for an active connection that gets a later date, that its links stop until then and
  requests in progress are cancelled. A date that is not after today, when the request is made
  or when it is approved, MUST be refused with the reason; at the request, no approval request
  is made (spec 007, FR-022). The agent MUST be able to learn the outcome, with the date the
  connection is scheduled for (Clarification 2026-11-10 #2).
- **FR-066**: Requests to deactivate or delete MUST be accepted for a scheduled connection too,
  and their approval pages MUST say what happens in that case, as the dialogs of FR-010 and
  FR-012 do. For spec 007's FR-024, a connection's status includes "scheduled" and its start
  date: a request made for a scheduled connection does nothing once the connection has become
  active or its date has changed, and the page says why.
- **FR-067**: An approved request MUST act exactly as the same action in the browser (spec 007,
  FR-027), including its entry in the activity (FR-027). Approving a deletion offers no "Undo":
  the approval page keeps saying that deleting can't be undone.
- **FR-068**: Agents MUST NOT get a way to restore a deleted connection, to delete several
  connections with one request, or to create the example.
- **FR-069**: The guidance for agents MUST describe every new or changed tool and the scheduled
  status in the same change (spec 007, FR-038), and what agents receive stays English (spec 009,
  FR-017).

#### Across the feature

- **FR-070**: Every frame of group A that belongs to the eight items MUST be ported as drawn,
  layout, styling and wording, and verified as spec 008 verifies its screens. What a frame of
  these items shows of an item that stays deferred (FR-074) MUST NOT be built.
- **FR-071**: Every text this feature adds MUST exist in English and German (spec 009, FR-004),
  the German written in this feature with spec 009's glossary, which gains this feature's terms
  (scheduled, start date, activity, example, selected). The English copy of the frames is used
  word for word.
- **FR-072**: Every new screen, state and control MUST keep spec 008's quality bar: operable with
  the keyboard alone, keyboard focus visible, status changes announced, no information by colour
  alone, AA contrast, light only, usable at 320 px and at 200 % zoom without horizontal scroll.
- **FR-073**: Nothing this feature stores MUST hold anything about a citizen, a request, a
  finding or a test persona, and nothing of it MUST be written to the logs beyond what the
  middleware logs today (identifiers and counts).
- **FR-074**: Everything else MUST stay as specs 001 to 009 leave it. In particular the items of
  group A that this feature does not build stay as spec 008 built around them: no pending
  changes kept as a draft beside a live connection (F5), requests in progress are cancelled by a
  deactivation (F13), no email line in the user menu (Q13), no success message for met citizens
  (Q31 (a)), no "Download PDF" (Q37 (b)), and no "Undo" after deactivating (spec 008, F54).
- **FR-075**: What serviceBW receives MUST change in one respect only: a scheduled connection's
  links answer as a deactivated connection's do until its start date.

### Key Entities

- **Start date**: the day from which a scheduled connection is active, a calendar day in
  Germany, beginning at 00:00. A connection has at most one; it is set when publishing or
  reactivating "On a date" or through "Change start date", and it ends when the day comes, when
  "Now" is chosen, or when the connection is deactivated or deleted.
- **Connection status**: draft, scheduled, active or deactivated. "Scheduled" is new: published,
  with links, not yet usable by citizens.
- **Status dates**: when a connection was published, when it last became active, and when it was
  last deactivated; shown on the overview and in the details' date pill.
- **Activity entry**: one thing that happened to one connection: when, what (one of the kinds of
  FR-025, with a variant's name or a date where the kind has one), and who (a team member, a
  team member with an agent, or nobody for what the middleware did by itself). Belongs to the
  connection and goes with it.
- **Deleted connection**: a connection that was deleted less than the restore time ago. It is
  gone for everyone and everything except "Undo", which returns it unchanged; afterwards it is
  deleted as connections are today.
- **Document order**: the position of each document among a connection's documents; part of a
  draft's and of a published connection's content.
- **Example mark**: the fact that a draft was created by "Start from an example" and not yet
  published, and whether anything in it has been changed since.
- **Selection**: the overview rows a team member has ticked; it lives in the page only and is
  never stored.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A team member schedules a connection in the publish dialog with one choice and one
  date, and the connection becomes active within one minute of the start of that day in Germany,
  in 100 % of the cases tested, with nobody signed in.
- **SC-002**: Before its start date a scheduled connection's links answer serviceBW exactly as a
  deactivated connection's, and from the start date on exactly as an active one's, in 100 % of
  the cases tested.
- **SC-003**: On the overview and the details, a team member can tell a connection's status and
  since when it holds, and which step a draft was left in, without opening anything else; the
  dates shown match what happened in 100 % of the cases tested (publish, schedule, start, save,
  deactivate, reactivate).
- **SC-004**: For every action of FR-025, done by a team member, by an agent or through an
  approval, the Activity card shows an entry with the right time, event and person within five
  seconds of reopening the details, and a review of the stored activity finds nothing that
  FR-029 excludes.
- **SC-005**: "Undo", used within the restore time, brings back 100 % of what FR-034 lists, for
  a connection of each status and for a bulk deletion; after the restore time, a deleted
  connection cannot be brought back by any means the product offers.
- **SC-006**: Ten connections are deleted with one confirmation in under 30 seconds, and a bulk
  deletion never deletes only some of the selected connections.
- **SC-007**: A team member reorders documents with a mouse, by touch and with the keyboard
  alone, and the order is the same after saving, reloading and publishing in every place that
  lists the documents (FR-050), while the answers serviceBW receives are unchanged.
- **SC-008**: On an installation without connections, a team member gets from the welcome page to
  a complete example draft in the wizard with two activations and in under 10 seconds, and can
  publish it unchanged.
- **SC-009**: Every frame of the eight items passes spec 008's visual verification, and every new
  screen and state passes spec 008's checks (keyboard walkthrough, 320 px at 200 % zoom, AA
  contrast) in both languages.
- **SC-010**: An agent reads the scheduled status, the dates, the step, the document order, the
  example mark and the activity of a connection, moves a document in a draft, and its work shows
  in the Activity card; the tools' guidance describes each of these.
- **SC-011**: Every existing automated check of the product still passes, and the behaviours this
  feature does not name are unchanged.

## Assumptions

- **Specs 008 and 009 are complete.** The redesigned screens, the toasts with actions, the
  accordions of the details, the delete dialogs and the two languages are in place; this feature
  adds to them.
- **The frontend side is decided by the frames**, as `deferred.md` says: the later feature ports
  them and does not re-decide them. A Figma audit of the group's frames against this spec is
  expected before planning (`deferred.md`, "How to use it"), and it settles the undrawn places
  this spec names: the toast after scheduling or changing a date, the button of "Activate again"
  on a date, the save dialog's sentence for a scheduled connection, the ⋯ menu of a scheduled
  connection, the activity's undrawn events and its long lists, the bulk toast and its warnings
  for several connections, "Move up" and "Move down" and their announcements, the banners of the
  documents and test steps, and the German of everything.
- **Each item brings its data along**: what the server stores and answers, its mirror for the
  frontend and the MCP server, and the agents' tool and guidance where FR-062 to FR-069 name one,
  in one change per item (constitution, Principle I; spec 007, FR-038).
- **The start is a day, not a time.** The design's field takes a date only and its pill reads
  "00:00"; the day is Germany's, as the test step's "today in Germany" already is. Today is not
  a valid start date: "Now" is for today.
- **A scheduled connection is published.** It has its links from the moment of scheduling
  ("You get the links now"), it is edited as an active connection is, and for serviceBW it is
  indistinguishable from a deactivated one until its start.
- **"Deactivate" is how a schedule is cancelled** without deleting the connection; the design
  shows the ⋯ on a scheduled connection's pill but not its open menu.
- **"Published <date>" and "Active since <date>" are two facts.** The row shows when the
  connection was published; the pill shows since when citizens can use it, which moves with a
  start date or a reactivation. The frames use different connections for the two, so they do not
  settle it.
- **Names in the activity are the names the user menu shows.** The design draws full names;
  accounts carry a username only, and the email line (Q13) is out of scope.
- **Deleting takes effect at once and "Undo" reverses it**, as `deferred.md` describes it (a
  deletion that can be restored), rather than holding the deletion back until the toast is gone.
  Requests in progress are therefore cancelled as today and not brought back; the delete dialog
  already says that citizens won't be able to use the connection.
- **The restore time is 5 minutes** by default. The design's toast shows for 5 or 6 seconds, but
  spec 008's toasts with an action stay until used or dismissed, so that nobody has to hurry;
  the time limits how long a deleted connection is kept.
- **Only the team member who deleted can undo**, from their toast; there is no bin and no list
  of deleted connections.
- **The document order belongs to the management UI.** It does not reorder what serviceBW
  receives or what the wallet shows, so reordering a live connection needs nothing from the
  wallet-communication service and is safe at any time.
- **The example stays the example until it is published**; the banners do not disappear with the
  first change, because the rules banner invites a change and then a test. Only the publish
  dialog's line depends on whether anything was changed.
- **The example has Standard and Ambulance.** The dialog's "2 documents and 2 rules" counts
  Standard's rules; one publish frame's third tab ("School transport") is sample data. The entry
  reads "Start from an example", as the dialog's title and `deferred.md` do; one frame's "Start
  with an example" is a slip.
- **Every draft row shows its step.** The frames that show a draft row without one are sample
  data; every stored draft has a step (spec 005).
- **Agents get what they need to stay consistent with people** (spec 007's "every read", "every
  change the create flow offers", and approval for what changes a live connection): reads of all
  new data, moving a document, and a start date with approval (Clarification 2026-11-10 #2).
  Restoring, bulk deletion and the example are for people in the browser.
- **Every team member has the same rights** (spec 008, OUT-2): anyone can schedule, delete in
  bulk, restore their own deletion and read every connection's activity.

## Out of Scope

- The other items of `deferred.md`, group A: a live connection's pending changes kept as a draft
  ("Keep draft and exit", "Draft changes", "Changes not published", F5); a deactivation that lets
  started requests finish (F13); the email line in the user menu (Q13); a success message for met
  citizens (Q31 (a)); "Download PDF" (Q37 (b)).
- Groups B and C of `deferred.md`: the rules-package actions (remove from group, duplicate
  group, add into a group, unlink from Standard, grouping a group, persona generation), upcoming
  documents, roles and view-only users, field groups.
- "Undo" after deactivating, after deleting a variant, a rule or a group beyond what exists, and
  "Undo" on the approval page.
- A bin or a list of deleted connections, and restoring after the restore time.
- Saved changes of an active connection that take effect on a date ("Active from" in "Save
  changes?"), and with them a second version of a connection beside the live one.
- A start time of day, a time zone choice, recurring or repeated schedules, an end date, and a
  schedule for deactivating.
- Notifications when a scheduled connection becomes active (email, in-app).
- Filtering, searching or exporting the activity; activity across connections; recording who
  viewed or copied something.
- Reordering the data items inside a document, the variants or the overview's rows.
- More than one example, choosing among examples, and the example entry on the overview.
- Bulk actions other than delete (deactivate, activate, export).
- Anything the citizen sees and the shape of what serviceBW receives.
