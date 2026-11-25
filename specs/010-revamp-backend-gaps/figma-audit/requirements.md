# Requirements index — spec.md mtime 1794352039 (2026-11-10 23:07:19 UTC)

Flags: `copy` = text quoted from the frames or the spec (word for word); `undrawn` = the spec names this place as not drawn,
copy/layout written in this feature; `supersedes <id>` = baseline item the spec's Context table (or the requirement) says this
item replaces (spec.md has no "Behaviour baseline" heading, so those contracts are not indexed here);
`clarif <date> #n` = settled by a Clarification. `CLAR-<n>` = a requirement stated only in Clarification #n.

| ID | Requirement (≤ 20 words) | Prio | UI | Surface | State | Flags | Spec § |
|---|---|---|---|---|---|---|---|
| FR-001a | Publish dialog shows "Active from" with "Now" (selected on open) and "On a date", as drawn | P1 | Y | Publish dialog | default | copy; supersedes 008 F1 | FR-001 (Go-live scheduling) |
| FR-001b | With "Now": "When you publish, the connection is ready to be added to your services." | P1 | Y | Publish dialog | default | copy | FR-001 |
| FR-001c | With "Now" the button reads "Publish connection" | P1 | Y | Publish dialog | default | copy | FR-001 |
| FR-001d | Publishing with "Now" goes live at once, as today | P1 | N | Publish dialog | success | | FR-001 |
| FR-002a | With "On a date": "The connection becomes active on the date you choose. You get the links now, so…" | P1 | Y | Publish dialog | default | copy | FR-002 |
| FR-002b | With "On a date" a date field (DD.MM.YYYY) shows under the radios | P1 | Y | Publish dialog | default | copy | FR-002 |
| FR-002c | With "On a date" the button reads "Schedule" | P1 | Y | Publish dialog | default | copy | FR-002 |
| FR-003a | A start date must be a calendar day after today in Germany | P1 | N | Publish dialog | ? | | FR-003 |
| FR-003b | Empty, today, past or non-date: field error state, "Enter a date after today." under it; nothing published | P1 | Y | Publish dialog | error | copy | FR-003 |
| FR-003c | "Schedule" stays enabled and shows the error when chosen | P1 | Y | Publish dialog | error | | FR-003 |
| FR-003d | Same refusal when the day changes between opening the dialog and confirming | P1 | Y | Publish dialog | error | | FR-003 |
| FR-003e | The same day-change refusal in "Change start date" and "Activate again", each with P1c's error state | P1 | Y | Change start date dialog; Activate again dialog | error | undrawn; clarif 2026-11-10 #11 | FR-003 |
| FR-004a | Scheduling publishes the connection (no draft) except it is not active yet; its links exist at once | P1 | N | ? | ? | supersedes 002-S5.7, 002-S5.8, 002-S6.7 | FR-004 |
| FR-004b | A scheduled connection's links are shown on its details and can be copied | P1 | Y | Details | default | | FR-004 |
| FR-004c | Until the start, its links answer serviceBW exactly as a deactivated connection's | P1 | N | serviceBW links | ? | | FR-004 |
| FR-005a | The start is 00:00 of the chosen day in Germany | P1 | N | ? | ? | | FR-005 |
| FR-005b | Connection becomes active by itself within one minute of the start, nobody signed in | P1 | N | worker | ? | | FR-005 |
| FR-005c | If the middleware was not running at the start, it becomes active once it runs again | P1 | N | worker | ? | | FR-005 |
| FR-006a | "Scheduled" is a status of its own wherever a connection's status shows | P1 | Y | ? | default | | FR-006 |
| FR-006b | Overview row: status "Scheduled", date "Active from <date>" | P1 | Y | Overview | default | copy | FR-006 |
| FR-006c | Header pill reads "Scheduled · <date>" | P1 | Y | Header | default | copy | FR-006 |
| FR-006d | Details band: "Your connection is scheduled", "The links are ready to be added to your service. They become active…" | P1 | Y | Details | default | copy | FR-006 |
| FR-006e | Details date pill reads "Active from <date>, 00:00" | P1 | Y | Details | default | copy | FR-006 |
| FR-006f | Edit flow's header and the delete dialogs show the scheduled status (FR-010, FR-041) | P1 | Y | Edit flow; Delete dialog | default | | FR-006 |
| FR-007 | Scheduled details otherwise as active: Links card, enabled copy buttons, Summary, Activity, "Edit connection", "Go to connections" | P1 | Y | Details | default | copy | FR-007 |
| FR-008a | Scheduled connection's ⋯ menu: "Change start date", "Deactivate", divider, "Delete connection" | P1 | Y | Details ⋯ menu | default | copy | FR-008 |
| FR-008b | "Change start date" dialog: title, "Choose when citizens can use this connection.", "Now", "On a date", "Cancel", "Save date" | P1 | Y | Change start date dialog | default | copy | FR-008 |
| FR-008c | A new date (checked as FR-003) replaces the start everywhere it shows | P1 | Y | Change start date dialog | success | | FR-008 |
| FR-008d | "Now" in "Change start date" makes the scheduled connection active at once | P1 | Y | Change start date dialog | success | | FR-008 |
| FR-008e | A success toast reads "Start date saved.", placed as the other toasts are | P1 | Y | Toast | success | copy; undrawn; clarif 2026-11-10 #11 | FR-008 |
| FR-008f | After "Now", the details show the active band with "Active since <date>, <time>" | P1 | Y | Details | success | copy; undrawn; clarif 2026-11-10 #11 | FR-008 |
| FR-009a | Active connection's ⋯ menu also holds "Change start date", before "Deactivate" | P1 | Y | Details ⋯ menu | default | copy; clarif 2026-11-10 #1 | FR-009 |
| FR-009b | Its dialog opens with "Now (active since <date>, <time>)" selected; saving "Now" changes nothing | P1 | Y | Change start date dialog | default | copy | FR-009 |
| FR-009c | Saving "On a date" schedules an active connection: links answer as deactivated until start, requests in progress cancelled | P1 | N | Change start date dialog | success | clarif 2026-11-10 #1 | FR-009 |
| FR-009d | Hint keeps "Until that date, citizens can't start a new request."; second sentence names the cancellation | P1 | Y | Change start date dialog | default | copy; undrawn | FR-009 |
| FR-009e | "Save changes?" on an active connection has no "Active from" choice and takes effect at once | P1 | Y | Save changes dialog | default | clarif 2026-11-10 #1 | FR-009 |
| FR-009f | "Save changes?" body stays spec 008's, without "from the time you choose" | P1 | Y | Save changes dialog | default | copy | FR-009 |
| FR-010 | Delete dialog of a scheduled connection: "This connection will be active from <date>. If you delete it, it won't…" | P1 | Y | Delete dialog | default | copy | FR-010 |
| FR-011a | "Activate this connection again?" shows "Active from" with "Now" (selected) and "On a date" under its summary | P1 | Y | Activate again dialog | default | copy | FR-011 |
| FR-011b | "Now" with "Activate" works as today | P1 | Y | Activate again dialog | success | copy | FR-011 |
| FR-011c | "On a date" schedules the deactivated connection for that day (FR-003 to FR-006) | P1 | Y | Activate again dialog | success | | FR-011 |
| FR-011d | Button for the "On a date" case reads "Schedule" | P1 | Y | Activate again dialog | default | undrawn | FR-011 |
| FR-011e | With "On a date": date field under the radios as in the publish dialog; hint written in this feature | P1 | Y | Activate again dialog | default | undrawn; clarif 2026-11-10 #11 | FR-011 |
| FR-012a | Deactivating a scheduled connection cancels its schedule; "Deactivated since" that time; can be activated again | P1 | Y | Details | success | | FR-012 |
| FR-012b | Deactivate dialog's sentence for a connection that was never active | P1 | Y | Deactivate dialog | default | undrawn | FR-012 |
| FR-013a | Editing a scheduled connection uses active's entry confirmation and edit flow, header pill "Scheduled · <date>" | P1 | Y | Edit flow | default | copy | FR-013 |
| FR-013b | What is saved becomes active on the date; saving does not change the date | P1 | N | Edit flow | success | | FR-013 |
| FR-013c | Save dialog's sentence for a scheduled connection | P1 | Y | Save changes dialog | default | undrawn | FR-013 |
| FR-013d | Scheduled entry confirmation title "Edit this scheduled connection?"; the row's "Edit “<name>”?" stays | P1 | Y | Edit entry confirmation | default | copy; undrawn; clarif 2026-11-10 #24 | FR-013 |
| FR-013e | Scheduled entry body "Your changes only take effect when you save them. Saved changes become active on <date>." | P1 | Y | Edit entry confirmation | default | copy; undrawn; clarif 2026-11-10 #24 | FR-013 |
| FR-013f | First step's note "Scheduled. Your changes become active on <date> once you save them." | P1 | Y | Edit flow (connection step) | default | copy; undrawn; clarif 2026-11-10 #24 | FR-013 |
| FR-013g | Leave dialog: "If you leave now, your changes are lost. Save them, or discard them and keep the scheduled version." | P1 | Y | Save your changes dialog | default | copy; undrawn; clarif 2026-11-10 #24 | FR-013 |
| FR-013h | Discard dialog: "The connection goes back to the version that becomes active on <date>. Citizens aren't affected." | P1 | Y | Discard changes dialog | default | copy; undrawn; clarif 2026-11-10 #24 | FR-013 |
| FR-014a | After "Schedule", publish dialog states follow spec 008: publishing, done, failed with error ID | P1 | Y | Publish dialog | loading | | FR-014 |
| FR-014b | A failure leaves the draft a draft; failed reactivation or date change leaves the connection unchanged | P1 | Y | Publish dialog; Activate again dialog; Change start date dialog | error | | FR-014 |
| FR-014c | A server failure shows spec 008's failure alert with its error ID, slim but wrapping where needed | P1 | Y | Publish dialog; Activate again dialog; Change start date dialog | error | clarif 2026-11-10 #23 | FR-014 |
| FR-014d | "Couldn’t publish, so nothing has changed. Check your internet connection and try again." only when no answer came | P1 | Y | Publish dialog | error | copy; clarif 2026-11-10 #23 | FR-014 |
| FR-014e | "Try again" repeats the same choice: "Now", or "On a date" with the entered date | P1 | Y | Publish dialog; Activate again dialog; Change start date dialog | error | copy; clarif 2026-11-10 #23 | FR-014 |
| FR-015a | Published connection's details show a date pill under the status sentence, with date and time | P2 | Y | Details | default | supersedes 005-S3.3 | FR-015 (Status dates) |
| FR-015b | Pill while active: "Active since <date>, <time>" | P2 | Y | Details | default | copy | FR-015 |
| FR-015c | Pill while scheduled: "Active from <date>, 00:00" | P2 | Y | Details | default | copy | FR-015 |
| FR-015d | Pill while deactivated: "Deactivated since <date>, <time>" | P2 | Y | Details | default | copy | FR-015 |
| FR-015e | A draft's details keep "Edited <date>, <time>" | P2 | Y | Details | default | copy | FR-015 |
| FR-016a | The connection's ⋯ menu sits on the date pill; a draft's pill has no ⋯ | P2 | Y | Details | default | supersedes 008 #52 | FR-016 |
| FR-016b | While deactivated, "Activate again" stands next to the pill | P2 | Y | Details | default | copy; supersedes 008 #52 | FR-016 |
| FR-017a | Overview row date of an active connection: "Published <date>" | P2 | Y | Overview | default | copy; supersedes 008 FR-048 | FR-017 |
| FR-017b | Overview row date of a scheduled connection: "Active from <date>" | P2 | Y | Overview | default | copy | FR-017 |
| FR-017c | Overview row date of a deactivated connection: "Deactivated <date>" | P2 | Y | Overview | default | copy | FR-017 |
| FR-017d | Overview row date of a draft: "Edited <date> · <step> step" | P2 | Y | Overview | default | copy | FR-017 |
| FR-018a | "Published" is the day the connection was published, with "Now" or with a date | P2 | N | ? | ? | | FR-018 |
| FR-018b | "Active since" is when it last became active: publish "Now", start date, or "Activate again" | P2 | N | ? | ? | | FR-018 |
| FR-018c | "Deactivated" is the time it was last deactivated | P2 | N | ? | ? | | FR-018 |
| FR-018d | Saving changes, renaming and reordering change none of the dates | P2 | N | ? | ? | | FR-018 |
| FR-019a | Draft row names the step last saved: "Connection step", "Documents step", "Rules step", "Test step" | P2 | Y | Overview | default | copy; supersedes 008 #62 | FR-019 |
| FR-019b | The step is recorded whoever saved, team member or agent | P2 | N | ? | ? | | FR-019 |
| FR-019c | A published connection's row names no step | P2 | Y | Overview | default | | FR-019 |
| FR-019d | A draft without a recorded step reads "Edited <date>" alone | P2 | Y | Overview | default | copy; clarif 2026-11-10 #12 | FR-019 |
| FR-020a | Dates read DD.MM.YYYY, with time "DD.MM.YYYY, HH:MM", in both languages | P2 | Y | ? | default | | FR-020 |
| FR-020b | A start date and its "00:00" read the same for every team member, as Germany's day | P2 | Y | ? | default | | FR-020 |
| FR-021a | Pre-existing connection: publication as stored, "Active since" = publication, "Deactivated" = last change time | P2 | N | ? | ? | | FR-021 |
| FR-021b | A pre-existing connection's row and pill are never empty | P2 | Y | Overview; Details | default | | FR-021 |
| FR-022a | Details of every connection (draft, scheduled, active, deactivated) show the "Activity" card after the Summary | P3 | Y | Activity card | default | copy; supersedes 002-S6.9, 008 F2 | FR-022 (Activity) |
| FR-022b | Closed card: title, "Last edited by <name> · <date>, <time>" and "View activity" | P3 | Y | Activity card | default | copy | FR-022 |
| FR-022c | Open card: the entries and "Hide activity" | P3 | Y | Activity card | default | copy | FR-022 |
| FR-022d | Only one of Links, Summary and Activity cards open at a time (spec 008 FR-046) | P3 | Y | Details | default | | FR-022 |
| FR-022e | The details reached after publishing or saving land with Links open (P7, E4) | P3 | Y | Details | success | clarif 2026-11-10 #34 | FR-022 |
| FR-022f | There, opening Summary or Activity closes Links, whose control reads "View links"; P9 and P10 not followed | P3 | Y | Details | default | copy; clarif 2026-11-10 #34 | FR-022 |
| FR-023a | An entry shows its date and time, what happened, and who did it | P3 | Y | Activity card | default | | FR-023 |
| FR-023b | Entries are listed newest first | P3 | Y | Activity card | default | | FR-023 |
| FR-024a | Closed card's line names person and time of the newest entry that has a person | P3 | Y | Activity card | default | | FR-024 |
| FR-024b | While deactivated the line reads "Deactivated by <name> · <date>, <time>" | P3 | Y | Activity card | default | copy | FR-024 |
| FR-025a | Activity records creation: "Created" | P3 | Y | Activity card | default | copy | FR-025 |
| FR-025b | Activity records a change of name or description | P3 | Y | Activity card | default | undrawn | FR-025 |
| FR-025c | Activity records "Documents changed": document added, removed, moved, or its data chosen differently | P3 | Y | Activity card | default | copy | FR-025 |
| FR-025d | Activity records a variant added ("Variant added: <name>"), removed or renamed, with its name | P3 | Y | Activity card | default | copy; undrawn (removed, renamed) | FR-025 |
| FR-025e | Activity records "Rules changed in <variant>" | P3 | Y | Activity card | default | copy | FR-025 |
| FR-025f | Activity records "Published" | P3 | Y | Activity card | default | copy | FR-025 |
| FR-025g | Activity records scheduling or a start date change, with the date | P3 | Y | Activity card | default | undrawn | FR-025 |
| FR-025h | Activity records becoming active on the start date | P3 | Y | Activity card | default | undrawn | FR-025 |
| FR-025i | Activity records "Deactivated" | P3 | Y | Activity card | default | copy | FR-025 |
| FR-025j | Activity records activation again | P3 | Y | Activity card | default | undrawn | FR-025 |
| FR-025k | Activity records deletion and restore | P3 | Y | Activity card | default | undrawn | FR-025 |
| FR-025l | Drawn event wording used word for word; others written in the same style | P3 | Y | Activity card | default | copy | FR-025 |
| FR-025m | Undrawn entries (also FR-027's and FR-032's) show in the drawn row: date and time · event · person | P3 | Y | Activity card | default | undrawn; clarif 2026-11-10 #13 | FR-025 |
| FR-026a | One save changing several things gives one entry per kind of change | P3 | N | Activity card | ? | | FR-026 |
| FR-026b | Same kind, same person, same variant, nothing between: one entry with the latest time | P3 | N | Activity card | ? | | FR-026 |
| FR-027a | An entry's person is the team member who acted, by the name the user menu shows | P3 | Y | Activity card | default | | FR-027 |
| FR-027b | An agent's change names the team member it acts for and the agent | P3 | Y | Activity card | default | | FR-027 |
| FR-027c | An approved agent action names the approving team member and the asking agent | P3 | Y | Activity card | default | | FR-027 |
| FR-027d | An entry for what the middleware did by itself (FR-005) has no person | P3 | Y | Activity card | default | | FR-027 |
| FR-028 | An entry keeps its person's name as it was, also after the account is gone | P3 | N | Activity card | ? | | FR-028 |
| FR-029a | The activity holds only what FR-025 lists | P3 | N | ? | ? | | FR-029 |
| FR-029b | No rule content, citizen message, value, finding, persona or result, citizen or request data | P3 | N | ? | ? | | FR-029 |
| FR-029c | No views, copies, tests, declined or expired approval requests | P3 | N | ? | ? | | FR-029 |
| FR-030a | Activity kept as long as the connection exists and comes back with a restored connection | P3 | N | ? | ? | | FR-030 |
| FR-030b | Activity is gone for good once a deletion can no longer be taken back | P3 | N | ? | ? | | FR-030 |
| FR-031a | Every team member can read every connection's activity | P3 | Y | Activity card | default | | FR-031 |
| FR-031b | No one can change or remove an entry | P3 | N | ? | ? | | FR-031 |
| FR-032a | Pre-existing connection's activity starts with "Created" and, if published, "Published", with times, no person | P3 | Y | Activity card | default | copy | FR-032 |
| FR-032b | Closed card's line then shows the time alone until someone acts | P3 | Y | Activity card | default | | FR-032 |
| FR-033 | After deleting from overview or details, any status: toast ""<name>" deleted." with "Undo" | P4 | Y | Toast | success | copy; supersedes 001-S6.11, 001-S6.12, 008 F4 | FR-033 (Undo) |
| FR-034a | "Undo" restores name, description, documents in their order, variants and rules | P4 | N | ? | ? | | FR-034 |
| FR-034b | "Undo" restores status: a draft with its step; others with their dates and start date | P4 | N | ? | ? | | FR-034 |
| FR-034c | "Undo" restores the activity and, for a published connection, the same links, working as status says | P4 | N | ? | ? | | FR-034 |
| FR-034d | The restored connection appears in the list without a reload | P4 | Y | Overview | success | | FR-034 |
| FR-034e | The restore is announced politely: "“<name>” restored." | P4 | Y | Overview | success | copy; undrawn; clarif 2026-11-10 #14 | FR-034 |
| FR-035a | Deletion takes effect at once: gone from overview, search, details, agents' reads; its links stop | P4 | Y | Overview | success | | FR-035 |
| FR-035b | Requests in progress are cancelled on deletion | P4 | N | ? | ? | | FR-035 |
| FR-035c | "Undo" brings back no cancelled requests and no waiting approval requests | P4 | N | ? | ? | | FR-035 |
| FR-036a | A deletion is restorable for a limited time, 5 minutes unless settings say otherwise | P4 | N | ? | ? | | FR-036 |
| FR-036b | Restore only through the toast's "Undo" of the team member who deleted | P4 | Y | Toast | default | | FR-036 |
| FR-036c | The toast offers "Undo" while it shows and closes by itself after 6 seconds (FR-082) | P4 | Y | Toast | default | clarif 2026-11-10 #22 | FR-036 |
| FR-036d | "Undo" after the time, or a second "Undo", changes nothing; toast says "“<name>” can no longer be restored." | P4 | Y | Toast | error | copy; undrawn; clarif 2026-11-10 #14 | FR-036 |
| FR-036e | After the time, the deletion is final as a deletion is today | P4 | N | ? | ? | | FR-036 |
| FR-036f | The restore time is the server's limit; it matters only while a toast is held open | P4 | N | ? | ? | clarif 2026-11-10 #22 | FR-036 |
| FR-037a | Deleting the last connection shows the welcome page with the toast | P4 | Y | Welcome page | empty | | FR-037 |
| FR-037b | "Undo" there brings back the overview with the connection (spec 008 FR-027) | P4 | Y | Welcome page; Overview | success | | FR-037 |
| FR-038a | Every overview row has a checkbox, the list's header a select-all checkbox, as drawn | P5 | Y | Overview | default | supersedes 008 FR-028 | FR-038 (Bulk delete) |
| FR-038b | Checkboxes' accessible names name the connection or "all" | P5 | Y | Overview | default | | FR-038 |
| FR-038c | Rows of every status can be selected | P5 | Y | Overview | default | | FR-038 |
| FR-039a | With a selection, toolbar (count, search) replaced by "<n> selected", "Cancel", "Delete" | P5 | Y | Selection bar | default | copy | FR-039 |
| FR-039b | The selection count is announced when it changes | P5 | Y | Selection bar | default | | FR-039 |
| FR-039c | The rows' own actions stay while rows are selected | P5 | Y | Overview | default | | FR-039 |
| FR-040a | Select-all selects every listed row, clears when all are selected, shows mixed state for some | P5 | Y | Overview | default | | FR-040 |
| FR-040b | "Cancel" clears the selection and brings the toolbar back as it was | P5 | Y | Selection bar | default | copy | FR-040 |
| FR-040c | The selection does not outlive the page | P5 | N | Overview | ? | | FR-040 |
| FR-041a | "Delete" with two or more: dialog "Delete <n> connections?", "Their documents and rules will be deleted too." | P5 | Y | Bulk delete dialog | default | copy | FR-041 |
| FR-041b | One line per selected connection with its name and status | P5 | Y | Bulk delete dialog | default | | FR-041 |
| FR-041c | Warning for an active connection: "<name> is active. Citizens won't be able to use it." | P5 | Y | Bulk delete dialog | default | copy | FR-041 |
| FR-041d | Warning lines for several active connections and for a scheduled one | P5 | Y | Bulk delete dialog | default | undrawn | FR-041 |
| FR-041e | Buttons "Keep connections" and "Delete connections" | P5 | Y | Bulk delete dialog | default | copy | FR-041 |
| FR-041f | With exactly one row selected, "Delete" opens that connection's own delete dialog | P5 | Y | Delete dialog | default | | FR-041 |
| FR-042a | "Keep connections", × and Escape close without change and return focus to the bar | P5 | Y | Bulk delete dialog | default | | FR-042 |
| FR-042b | A scrim click does not close it; nothing closes it while the deletion runs | P5 | Y | Bulk delete dialog | loading | | FR-042 |
| FR-043a | "Delete connections" deletes all selected connections or none | P5 | N | Bulk delete dialog | ? | | FR-043 |
| FR-043b | One vanished or changed: nothing deleted, list current; dialog: "Nothing was deleted: “<name>” was deleted or changed in the meantime." | P5 | Y | Bulk delete dialog | error | copy; undrawn; clarif 2026-11-10 #15 | FR-043 |
| FR-043c | A failure shows as spec 008's failures do, with the error ID where there is one | P5 | Y | Bulk delete dialog | error | | FR-043 |
| FR-044a | After bulk deletion: rows gone, selection cleared, toolbar back | P5 | Y | Overview | success | | FR-044 |
| FR-044b | Toast "<n> connections deleted." with "Undo" restoring all or none | P5 | Y | Toast | success | copy; undrawn; clarif 2026-11-10 #15 | FR-044 |
| FR-044c | Each connection's deletion and restore shows in its activity | P5 | Y | Activity card | default | | FR-044 |
| FR-045a | A connection's documents are kept in the order the team member gives them | P6 | N | ? | ? | supersedes 002-S1, 008 FR-031j | FR-045 (Document order) |
| FR-045b | An added document goes to the end; removing one keeps the others' order | P6 | Y | Documents step | default | | FR-045 |
| FR-045c | A removed document brought back by the documents step's "Undo" returns to its place | P6 | Y | Documents step | default | | FR-045 |
| FR-046a | A document can be moved by dragging its row; on touch by press and hold | P6 | Y | Documents step | default | | FR-046 |
| FR-046b | While dragging, a line marks where it lands and a faded copy follows the pointer | P6 | Y | Documents step | default | | FR-046 |
| FR-046c | After the drop the list shows the new order | P6 | Y | Documents step | default | | FR-046 |
| FR-046d | A short touch still scrolls | P6 | Y | Documents step | default | | FR-046 |
| FR-046e | A drop outside the list or Escape leaves the order unchanged | P6 | Y | Documents step | default | | FR-046 |
| FR-047a | Every document also movable by "Move up" and "Move down", by keyboard and single pointer | P6 | Y | Documents step | default | copy; undrawn (build note 37, spec 008 menu pattern) | FR-047 |
| FR-047b | The first document has no "Move up", the last no "Move down" | P6 | Y | Documents step | default | undrawn | FR-047 |
| FR-047c | After a move the focus stays with the moved document | P6 | Y | Documents step | default | | FR-047 |
| FR-047d | The move is announced: "“<document>” moved to position <n> of <m>." | P6 | Y | Documents step | default | copy; undrawn; clarif 2026-11-10 #16 | FR-047 |
| FR-047e | A ⋯ menu button on each document row holds "Move up" and "Move down"; one document, no menu | P6 | Y | Documents step | default | copy; undrawn; clarif 2026-11-10 #16 | FR-047 |
| FR-048a | Reordering does not change which document is open | P6 | Y | Documents step | default | | FR-048 |
| FR-048b | The pager ("Document n of m") counts in the list's order | P6 | Y | Documents step | default | copy | FR-048 |
| FR-049a | Reordering works in the create flow, in a draft and in a published connection's edit flow | P6 | Y | Wizard; Edit flow | default | | FR-049 |
| FR-049b | The order is saved with the draft, with publishing, and with "Save" in the edit flow | P6 | N | ? | ? | | FR-049 |
| FR-049c | A draft kept on the device (spec 005) keeps the order too | P6 | N | ? | ? | | FR-049 |
| FR-049d | The edit flow's documents step gets the create flow's dragging and ⋯ menu, though undrawn | P6 | Y | Edit flow (documents step) | default | undrawn; clarif 2026-11-10 #16 | FR-049 |
| FR-050a | Stored order used in the documents step, its pager and the test step's data | P6 | Y | Documents step; Test step | default | | FR-050 |
| FR-050b | Stored order used in the publish, save and reactivate dialogs' summaries and the details' Summary | P6 | Y | Publish dialog; Save changes dialog; Activate again dialog; Details | default | | FR-050 |
| FR-050c | Stored order used on the approval page | P6 | Y | Approval page | default | | FR-050 |
| FR-050d | Stored order used in agents' reads | P6 | N | MCP | ? | | FR-050 |
| FR-050e | Data items inside a document stay in the catalog's order | P6 | Y | Documents step | default | | FR-050 |
| FR-050f | Where a document has data groups, its data items keep catalog order inside each group (FR-077) | P6 | Y | Documents step | default | clarif 2026-11-10 #6 | FR-050 |
| FR-051 | The order changes nothing serviceBW receives, the wallet is asked for, requests in progress or links | P6 | N | serviceBW links | ? | | FR-051 |
| FR-052 | A pre-existing connection keeps the document order it shows today | P6 | N | ? | ? | | FR-052 |
| FR-053a | While no connection exists, the welcome page offers "Start from an example" beside "Create connection" | P7 | Y | Welcome page | empty | copy; supersedes 008 FR-027 | FR-053 (Example) |
| FR-053b | The overview does not offer "Start from an example" | P7 | Y | Overview | default | | FR-053 |
| FR-053c | "Start from an example" (secondary) beside "Create connection →" (primary), as 1g draws; note 16's "one button" not followed | P7 | Y | Welcome page | empty | copy; clarif 2026-11-10 #27 | FR-053 |
| FR-053d | The overview's footer keeps "Create connection" only | P7 | Y | Overview | default | copy; clarif 2026-11-10 #27 | FR-053 |
| FR-054a | Dialog "Start from an example?": "This creates a draft called "Passenger transport licence (example)" with 2 documents…" | P7 | Y | Example dialog | default | copy | FR-054 |
| FR-054b | Example dialog's buttons "Go back" and "Create the example" | P7 | Y | Example dialog | default | copy | FR-054 |
| FR-054c | "Go back", × and Escape close the example dialog without creating anything | P7 | Y | Example dialog | default | | FR-054 |
| FR-055a | "Create the example" stores a draft and opens it in the wizard at its first step | P7 | Y | Wizard | success | | FR-055 |
| FR-055b | Name "Passenger transport licence (example)"; description "Licence to drive taxis, rental cars and ambulances. Checks age and driving experience." | P7 | Y | Wizard (connection step) | default | copy | FR-055 |
| FR-055c | Documents Personal ID (7 data items) and Driving licence (2 data items) | P7 | Y | Wizard (documents step) | default | copy | FR-055 |
| FR-055d | Standard Rule 01 "Date of birth (Age) is at least 21 years old", "You need to be at least 21 years old." | P7 | Y | Wizard (rules step) | default | copy | FR-055 |
| FR-055e | AND Rule 02 "Licence class B – Issue date is at least 2 years ago" with its 2-year message | P7 | Y | Wizard (rules step) | default | copy | FR-055 |
| FR-055f | Variant "Ambulance", linked to Standard, "For ambulance services. Some rules differ from Standard." | P7 | Y | Wizard (rules step) | default | copy | FR-055 |
| FR-055g | Ambulance: Rule 01 changed to 19 years, Rule 02 to 1 year, messages to match | P7 | Y | Wizard (rules step) | default | copy | FR-055 |
| FR-055h | Creating the example records its first step: row reads "Edited <date> · Connection step"; 1j's stepless row not followed | P7 | Y | Overview | default | copy; clarif 2026-11-10 #36 | FR-055 |
| FR-055i | Agents read the example's recorded step (FR-062) | P7 | N | MCP | ? | clarif 2026-11-10 #36 | FR-055 |
| FR-056 | The example is always complete and publishable; publishing's checks pass, rule checks find nothing | P7 | N | ? | ? | | FR-056 |
| FR-056b | Example's variant tabs carry no finding icon or count; they show the ⓘ with the variant's description, as 1i-b | P7 | Y | Wizard (rules step) | default | clarif 2026-11-10 #28 | FR-056 |
| FR-056c | The "1" that 1i and 1i-c draw beside a tab is not built | P7 | Y | Wizard (rules step) | default | clarif 2026-11-10 #28 | FR-056 |
| FR-057 | Example is a normal draft: listed, editable by members and agents, testable, publishable, deletable, counted for homepage | P7 | Y | Overview | default | | FR-057 |
| FR-058a | Connection step banner: "This is an example. Change anything to see how it works." | P7 | Y | Wizard (connection step) | default | copy | FR-058 |
| FR-058b | Rules step, Standard: "Try changing the age to 18 or adding a rule. Then use Test rules…" | P7 | Y | Wizard (rules step) | default | copy | FR-058 |
| FR-058c | Rules step, Ambulance: "Ambulance is more lenient than Standard. Rules 01 and 02 are changed here." | P7 | Y | Wizard (rules step) | default | copy | FR-058 |
| FR-058d | Documents and test steps show the connection step's banner sentence | P7 | Y | Wizard (documents, test steps) | default | undrawn | FR-058 |
| FR-058e | A banner is information only: no action, cannot be dismissed | P7 | Y | Wizard | default | | FR-058 |
| FR-058f | On the test step the example banner sits above the variant tabs, as on the rules step | P7 | Y | Wizard (test step) | default | undrawn; clarif 2026-11-10 #18 | FR-058 |
| FR-059 | A draft stops being the example when published; until then it stays the example; no banner after | P7 | Y | Wizard; Details | default | | FR-059 |
| FR-060a | Unchanged example: publish dialog adds "This is still the example. Check that the name, documents and rules fit your service." | P7 | Y | Publish dialog | default | copy | FR-060 |
| FR-060b | Unchanged means name, description, documents, data items, variants, rules are the example's; after a saved change no line | P7 | Y | Publish dialog | default | | FR-060 |
| FR-060c | The approval page of a request to publish the unchanged example shows the same line | P7 | Y | Approval page | default | copy | FR-060 |
| FR-060d | The unchanged example's publish summary lists "Standard · 2 rules" and "Ambulance · 2 rules" | P7 | Y | Publish dialog | default | copy; clarif 2026-11-10 #29 | FR-060 |
| FR-060e | 16b's "School transport" tab and Rules 03 and 04 behind the dialog are a slip, not built | P7 | Y | Wizard (test step) | default | clarif 2026-11-10 #29 | FR-060 |
| FR-061 | Example's texts are created in the team member's current language and are content from then on | P7 | Y | Wizard | default | | FR-061 |
| FR-062a | Agents' reads and search carry "scheduled", its start date and what its links answer until then | P8 | N | MCP | ? | | FR-062 (Agents) |
| FR-062b | Agents' reads carry the FR-018 dates, a draft's step, the stored document order, the example mark | P8 | N | MCP | ? | | FR-062 |
| FR-062c | Agents' search accepts "scheduled" as a status beside draft, live and deactivated | P8 | N | MCP | ? | | FR-062 |
| FR-063 | Agents of every access level can read a connection's activity, same entries as the card | P8 | N | MCP | ? | | FR-063 |
| FR-064a | Agents with "Read and edit drafts" or more can move a document in a draft, one per call | P8 | N | MCP | ? | | FR-064 |
| FR-064b | A document an agent adds goes to the end | P8 | N | MCP | ? | | FR-064 |
| FR-065a | An agent's request to publish or reactivate may name a start date; without one it acts at once | P8 | N | MCP | ? | clarif 2026-11-10 #2 | FR-065 |
| FR-065b | "…manage live connections" agents may ask to change a scheduled or active connection's start date, or to now | P8 | N | MCP | ? | clarif 2026-11-10 #2 | FR-065 |
| FR-065c | Approval page shows "Active from <date>", or that the connection goes live at once | P8 | Y | Approval page | default | copy | FR-065 |
| FR-065d | For an active connection given a later date: approval page says links stop and requests are cancelled | P8 | Y | Approval page | default | undrawn | FR-065 |
| FR-065e | A date not after today at request time is refused with the reason; no approval request made | P8 | N | MCP | error | | FR-065 |
| FR-065f | A date no longer after today at approval is refused with the reason | P8 | Y | Approval page | error | | FR-065 |
| FR-065g | The agent can learn the outcome, with the date the connection is scheduled for | P8 | N | MCP | ? | | FR-065 |
| FR-065h | Everything new on the approval page is built on spec 007's existing page, with this spec's wording | P8 | Y | Approval page | default | undrawn; clarif 2026-11-10 #17 | FR-065 |
| FR-066a | Deactivate and delete requests accepted for scheduled connections; approval pages say what happens (as FR-010, FR-012) | P8 | Y | Approval page | default | | FR-066 |
| FR-066b | A request for a scheduled connection does nothing once it became active or its date changed; page says why | P8 | Y | Approval page | error | | FR-066 |
| FR-067a | An approved request acts exactly as the browser action, including its activity entry | P8 | N | ? | ? | | FR-067 |
| FR-067b | Approving a deletion offers no "Undo"; the page keeps saying deleting can't be undone | P8 | Y | Approval page | default | | FR-067 |
| FR-068 | Agents get no way to restore a deleted connection, bulk delete, or create the example | P8 | N | MCP | ? | | FR-068 |
| FR-069a | Agents' guidance describes every new or changed tool and the scheduled status in the same change | P8 | N | MCP guidance | ? | | FR-069 |
| FR-069b | What agents receive stays English | P8 | N | MCP | ? | | FR-069 |
| FR-070a | Every frame of the eight items ported as drawn (layout, styling, wording), verified as spec 008 | - | Y | ? | ? | copy | FR-070 (Across the feature) |
| FR-070b | What these frames show of a still-deferred item (FR-074) is not built | - | Y | ? | ? | | FR-070 |
| FR-070c | The data groups' frames (the ninth item) are ported as drawn too, verified as spec 008 | - | Y | Documents step; Edit flow | ? | copy; clarif 2026-11-10 #6 | FR-070 |
| FR-070d | Build note 23's "v9 builds every change since v8" does not widen this: only the nine items are ported | - | Y | ? | ? | clarif 2026-11-10 #31 | FR-070 |
| FR-071a | Every new text exists in English and German, German written with spec 009's glossary | - | Y | ? | ? | | FR-071 |
| FR-071b | The glossary gains scheduled, start date, activity, example, selected | - | N | ? | ? | | FR-071 |
| FR-071c | The frames' English copy is used word for word | - | Y | ? | ? | copy | FR-071 |
| FR-071d | The page's language mark follows the chosen language (en or de), not build note 1's fixed "en" | - | Y | ? | ? | clarif 2026-11-10 #26 | FR-071 |
| FR-072a | New screens, states, controls: keyboard-operable, visible focus, status changes announced, no colour-only information | - | Y | ? | ? | | FR-072 |
| FR-072b | AA contrast, light only, usable at 320 px and 200 % zoom without horizontal scroll | - | Y | ? | ? | | FR-072 |
| FR-073a | Nothing stored holds anything about a citizen, request, finding or test persona | - | N | ? | ? | | FR-073 |
| FR-073b | Nothing logged beyond what the middleware logs today (identifiers and counts) | - | N | ? | ? | | FR-073 |
| FR-074 | Everything else stays as specs 001–009 leave it; deferred items F5, F13, Q13, Q31 (a), Q37 (b), F54 unbuilt | - | N | ? | ? | | FR-074 |
| FR-074b | What build notes and frames restate or change of specs 001–009 outside the nine items (a–n) is no requirement | - | Y | ? | ? | clarif 2026-11-10 #31 | FR-074 |
| FR-074c | Where a frame of the nine items shows such a part, its layout is ported and the product's behaviour stays | - | Y | ? | ? | clarif 2026-11-10 #31 | FR-074 |
| FR-074d | Where a build note disagrees with the product, the product stays (e.g. "x of y", remove dialog, note 17) | - | Y | ? | ? | clarif 2026-11-10 #31 | FR-074 |
| FR-074e | The overview's description tooltip (1k) stays as spec 008 built it: hover, keyboard focus on the name, tap | - | Y | Overview | default | clarif 2026-11-10 #32 | FR-074 |
| FR-074f | "Leave this connection?" stays as spec 008 FR-026 built it; "Discard connection" deletes nothing stored; 6a's silent save unbuilt | - | Y | Leave this connection dialog (create flow) | default | copy; clarif 2026-11-10 #33 | FR-074 |
| FR-075 | serviceBW sees one change only: scheduled links answer as deactivated until the start date | - | N | serviceBW links | ? | | FR-075 |
| FR-076a | Edit flow header of an active or scheduled connection: only the status pill ("Active", "Scheduled · <date>"), never "Draft changes" | - | Y | Edit flow (header) | default | copy; clarif 2026-11-10 #3 | FR-076 (In place of out-of-scope items) |
| FR-076b | Edit flow footer reads "Back · Discard changes · <next step> · Save", without "Keep draft and exit" | - | Y | Edit flow (footer) | default | copy; clarif 2026-11-10 #3 | FR-076 |
| FR-076c | Konnekt and "Your connections" open "Save your changes?" with "Discard changes" and "Save" | - | Y | Save your changes dialog | default | copy; clarif 2026-11-10 #3 | FR-076 |
| FR-076d | Its body: "If you leave now, your changes are lost. Save them, or discard them and keep the active version." | - | Y | Save your changes dialog | default | copy; clarif 2026-11-10 #3 | FR-076 |
| FR-076e | No toast reads "Draft kept. Your changes take effect when you save them." | - | Y | Toast | default | copy; clarif 2026-11-10 #3 | FR-076 |
| FR-076f | No overview row reads "Changes not published" | - | Y | Overview | default | copy; clarif 2026-11-10 #3 | FR-076 |
| FR-076g | Details' Summary card has no "Download PDF"; header shows "Summary", count line, "View summary" / "Hide summary" | - | Y | Details (Summary card) | default | copy; clarif 2026-11-10 #4 | FR-076 |
| FR-076h | Deactivation toast reads "Connection deactivated." (success type), without "Undo" | - | Y | Toast | success | copy; clarif 2026-11-10 #5 | FR-076 |
| FR-076i | Only deleting a connection, removing a document and the rules step's existing undos offer "Undo" | - | Y | Toast | default | clarif 2026-11-10 #5 | FR-076 |
| FR-076j | Add document card lists only the wallet's documents ("Available", "Added"), no hint line about coming-soon documents | - | Y | Documents step (Add document card) | default | copy; clarif 2026-11-10 #6 | FR-076 |
| FR-076k | With every wallet document added, the card reads "Everything in the wallet is added." | - | Y | Documents step (Add document card) | empty | copy; clarif 2026-11-10 #6 | FR-076 |
| FR-076l | The Add document card's search finds wallet documents only | - | Y | Documents step (Add document card) | default | clarif 2026-11-10 #6 | FR-076 |
| FR-076m | Applicant meeting every rule: result "Result: meets the rules" with the list "Rules <name> meets" | - | Y | Test step | success | copy; clarif 2026-11-10 #8 | FR-076 |
| FR-076n | No "Message <name> reads" box for an applicant who meets every rule | - | Y | Test step | success | copy; clarif 2026-11-10 #8 | FR-076 |
| FR-076o | Group ⋯ menu: no "Group with other rules"; in a variant "Add message", "Reset to Standard", divider, "Remove from <variant>" | - | Y | Rules step (group menu) | default | copy; clarif 2026-11-10 #9 | FR-076 |
| FR-076p | User menu shows the name, a divider and "Log out", without an email | - | Y | User menu | default | copy; clarif 2026-11-10 #10 | FR-076 |
| FR-076q | The details' Summary shows no rule findings (spec 003 FR-020) | - | Y | Details (Summary card) | default | clarif 2026-11-10 #21 | FR-076 |
| FR-076r | A variant tab's ⓘ in the Summary shows only the variant's description | - | Y | Details (Summary card) | default | clarif 2026-11-10 #21 | FR-076 |
| FR-076s | Hidden "badge-small (Live, replaced)" layers stay hidden | - | Y | Overview | default | clarif 2026-11-10 #3 | FR-076; Clarifications #3 |
| FR-076t | A draft's details show "Edit connection" for every team member, as V-Draft · S; view-only S2 not built | - | Y | Details | default | copy; clarif 2026-11-10 #30 | FR-076 |
| FR-077a | A document with more than 10 data items shows them under group headings in the data item panel | P9 | Y | Documents step (data item panel) | default | supersedes 002-S1, 008 FR-031; clarif 2026-11-10 #6 | FR-077 (Data groups) |
| FR-077b | Grouped panel: three columns under "All data items": "Name", "Birth", "Address", "Document", own groups, "Other details" | P9 | Y | Documents step (data item panel) | default | copy | FR-077 |
| FR-077c | The grouping shows in the create flow, in a draft and in the edit flow | P9 | Y | Wizard; Edit flow | default | | FR-077 |
| FR-077d | A document with 10 data items or fewer keeps today's list without groups | P9 | Y | Documents step (data item panel) | default | | FR-077 |
| FR-077e | Elsewhere data items stay ungrouped: details' Summary, the dialogs' summaries, the approval page | P9 | Y | Details; Publish dialog; Save changes dialog; Activate again dialog; Approval page | default | | FR-077 |
| FR-077f | Groups stand in that order, flowing down the three columns; frames' placement (Licence, Other details before Document) not followed | P9 | Y | Documents step (data item panel) | default | clarif 2026-11-10 #35 | FR-077 |
| FR-078a | The data groups come from the catalog, with its mirror for the frontend | P9 | N | ? | ? | | FR-078 |
| FR-078b | Every data item of a grouped document belongs to exactly one group | P9 | N | ? | ? | | FR-078 |
| FR-078c | A group keeps its name across documents and holds at least 2 data items; the rest go to "Other details" | P9 | N | ? | ? | | FR-078 |
| FR-078d | Driving licence groups: Name 4, Birth 6, Address 5, Licence 3, Document 6, Appearance 6, Other details 1 | P9 | Y | Documents step (data item panel) | default | copy | FR-078 |
| FR-078e | Group names are catalog labels, in English and German | P9 | Y | Documents step (data item panel) | default | | FR-078 |
| FR-078f | Frames drawing 5 data items under Birth, or more than one under Other details, are not followed | P9 | Y | Documents step (data item panel) | default | clarif 2026-11-10 #35 | FR-078 |
| FR-079a | Every group heading has a checkbox that selects all of its group's data items | P9 | Y | Documents step (data item panel) | default | | FR-079 |
| FR-079b | The group checkbox shows its mixed state while some of its data items are chosen | P9 | Y | Documents step (data item panel) | default | | FR-079 |
| FR-079c | It does for its group what "All data items" does, including the question naming the rules (002-S1.1) | P9 | Y | Documents step (data item panel) | default | | FR-079 |
| FR-079d | That question's wording for a group is written in this feature | P9 | Y | Documents step (rules question dialog) | default | undrawn | FR-079 |
| FR-080a | Agents' read of the catalog carries each data item's group, in English | P9 | N | MCP | ? | | FR-080 |
| FR-080b | The agents' guidance describes the groups in the same change | P9 | N | MCP guidance | ? | | FR-080 |
| FR-080c | Agents keep choosing data items one by one; no way to choose a whole group | P9 | N | MCP | ? | | FR-080 |
| FR-081a | With work kept on this device, the overview shows the drawn banner (1m, 1n) above the toolbar | P5 | Y | Overview (local drafts banner) | default | clarif 2026-11-10 #20 | FR-081 (Local drafts banner) |
| FR-081b | One connection: title "Unsaved changes in “<name>”", buttons "Discard" and "Resume editing" | P5 | Y | Overview (local drafts banner) | default | copy | FR-081 |
| FR-081c | One connection's text: "Saved only on this device on <date>, <time>, when the page closed. Nobody else can see them." | P5 | Y | Overview (local drafts banner) | default | copy | FR-081 |
| FR-081d | Several: "Unsaved changes in <n> connections", "Saved only on this device when the page closed. Nobody else can see them." | P5 | Y | Overview (local drafts banner) | default | copy | FR-081 |
| FR-081e | Several: one line per connection, "Edited · <date>, <time>" or "New, never saved · <date>, <time>" | P5 | Y | Overview (local drafts banner) | default | copy | FR-081 |
| FR-081f | The banner stays above the selection bar while rows are selected | P5 | Y | Overview; Selection bar | default | | FR-081 |
| FR-081g | A connection that exists only on this device is neither counted nor selectable | P5 | Y | Overview; Selection bar | default | | FR-081 |
| FR-081h | The existing local drafts banner is checked against 1m and 1n; what differs is changed | P5 | Y | Overview (local drafts banner) | default | | FR-081 |
| FR-081i | The tertiary button reads "Discard", as 1m and 1n draw, not build note 34's "Discard changes" | P5 | Y | Overview (local drafts banner) | default | copy; clarif 2026-11-10 #37 | FR-081 |
| FR-082a | Every toast, with or without an action, closes by itself after 6 seconds | - | Y | Toast | default | supersedes 008's toast-with-action rule; clarif 2026-11-10 #22 | FR-082 (Toasts) |
| FR-082b | The time runs only while neither the pointer nor the keyboard focus is on the toast | - | Y | Toast | default | clarif 2026-11-10 #22 | FR-082 |
| FR-082c | Holds for deletion, bulk, start date toasts and existing ones: document removal "Undo", "Try again", rules undos | - | Y | Toast | default | exception to FR-074; clarif 2026-11-10 #22 | FR-082 |
| CLAR-7 | "Generate all" (spec 004's regenerate) is built as drawn, asking first like "Generate again" | - | Y | Test step | default | copy; clarif 2026-11-10 #7 | Clarifications #7; FR-074 |
| CLAR-37 | The banner's "Discard" keeps its accessible name "Discard changes in <name>"; the edit flow's "Discard changes" stays | P5 | Y | Overview (local drafts banner) | default | copy; clarif 2026-11-10 #37 | Clarifications #37; FR-081 |
| US1-AS1 | Publish dialog opens: "Active from", "Now" selected, "On a date", ready sentence, "Publish connection"; "Now" goes live | P1 | Y | Publish dialog | default | copy | US1 AS1 |
| US1-AS2 | "On a date": sentence "The connection becomes active on the date you choose…", field "DD.MM.YYYY", button "Schedule" | P1 | Y | Publish dialog | default | copy | US1 AS2 |
| US1-AS3 | No, today's, past or invalid date + "Schedule": field error, "Enter a date after today.", nothing published | P1 | Y | Publish dialog | error | copy | US1 AS3 |
| US1-AS4 | Scheduled 01.12.2026: "Your connection is scheduled", sub-line, "Active from 01.12.2026, 00:00", "Scheduled · 01.12.2026"; links copyable, answer as deactivated | P1 | Y | Details; Header | success | copy | US1 AS4 |
| US1-AS5 | Overview row of a scheduled connection: "Scheduled", "Active from 01.12.2026", View, Edit, Delete | P1 | Y | Overview | default | copy | US1 AS5 |
| US1-AS6 | At start in Germany, within a minute: links work, "Your connection is active", "Active since 01.12.2026, 00:00", overview "Active" | P1 | Y | Details; Overview | success | copy | US1 AS6 |
| US1-AS7 | ⋯ on pill, "Change start date": "Choose when citizens can use this connection.", Now/On a date, "Cancel", "Save date" | P1 | Y | Change start date dialog | default | copy | US1 AS7 |
| US1-AS8 | "Activate again": "Activate this connection again?" with summary and "Active from"; Now as today; date schedules | P1 | Y | Activate again dialog | default | copy | US1 AS8 |
| US1-AS9 | Editing a scheduled connection: active's edit flow, pill "Scheduled · 01.12.2026"; saved content goes live on date | P1 | Y | Edit flow | default | copy | US1 AS9 |
| US1-AS10 | Delete scheduled: "This connection will be active from 01.12.2026. If you delete it, it won't become active…" | P1 | Y | Delete dialog | default | copy | US1 AS10 |
| US1-AS11 | Active, later start date saved: scheduled, links as deactivated, requests cancelled; "Save changes?" offers no date | P1 | Y | Change start date dialog; Save changes dialog | success | clarif 2026-11-10 #1 | US1 AS11 |
| US2-AS1 | Active connection published 12.09.2026: overview row reads "Published 12.09.2026" | P2 | Y | Overview | default | copy | US2 AS1 |
| US2-AS2 | Connection deactivated 20.10.2026: overview row reads "Deactivated 20.10.2026" | P2 | Y | Overview | default | copy | US2 AS2 |
| US2-AS3 | Draft last saved in rules step: "Edited 28.10.2026 · Rules step"; other steps named likewise | P2 | Y | Overview | default | copy | US2 AS3 |
| US2-AS4 | Active details: pill "Active since 23.10.2026, 14:32" under status sentence with ⋯; saving doesn't change it | P2 | Y | Details | default | copy | US2 AS4 |
| US2-AS5 | Deactivated details: pill "Deactivated since 24.10.2026, 10:05" with ⋯, "Activate again" next to it | P2 | Y | Details | default | copy | US2 AS5 |
| US2-AS6 | Deactivated then reactivated: "Active since" shows reactivation time; row still "Published <publication date>" | P2 | Y | Details; Overview | default | | US2 AS6 |
| US3-AS1 | Any status: "Activity" card under Summary, "Last edited by <name> · 23.10.2026, 14:32", "View activity" | P3 | Y | Activity card | default | copy | US3 AS1 |
| US3-AS2 | "View activity": entries newest first with time, event, person; "Hide activity"; the other open card closes | P3 | Y | Activity card | default | copy | US3 AS2 |
| US3-AS3 | Deactivated: line "Deactivated by <name> · 24.10.2026, 10:05", newest entry "Deactivated" | P3 | Y | Activity card | default | copy | US3 AS3 |
| US3-AS4 | Agent changed a draft's rules for a team member: entry names the team member and the agent | P3 | Y | Activity card | default | | US3 AS4 |
| US3-AS5 | Approved agent publish: "Published" names the approving team member and the asking agent | P3 | Y | Activity card | default | copy | US3 AS5 |
| US3-AS6 | Scheduled date arrived: an entry says it became active, without a person | P3 | Y | Activity card | default | undrawn | US3 AS6 |
| US4-AS1 | Deleted from overview or details: toast ""<name>" deleted." with "Undo" | P4 | Y | Toast | success | copy | US4 AS1 |
| US4-AS2 | "Undo": connection back with name, description, documents, variants, rules, status, dates, activity, same links | P4 | Y | Overview | success | | US4 AS2 |
| US4-AS3 | Last connection deleted, welcome page: "Undo" brings back the overview with the connection | P4 | Y | Welcome page; Overview | success | | US4 AS3 |
| US4-AS4 | Toast held open past the restore time, then "Undo": told it can't be restored; an untouched toast closes after 6 s | P4 | Y | Toast | error | clarif 2026-11-10 #22 | US4 AS4 |
| US5-AS1 | Two of three rows ticked: toolbar replaced by "2 selected", "Cancel", "Delete"; select-all mixed | P5 | Y | Selection bar; Overview | default | copy | US5 AS1 |
| US5-AS2 | Active + draft, "Delete": "Delete 2 connections?", lines with status, active warning, "Keep connections", "Delete connections" | P5 | Y | Bulk delete dialog | default | copy | US5 AS2 |
| US5-AS3 | "Delete connections": both deleted together, selection cleared, toolbar back, toast with "Undo" restoring both | P5 | Y | Overview; Toast | success | | US5 AS3 |
| US5-AS4 | A selected connection deleted or changed meanwhile: nothing deleted, dialog names it, list current | P5 | Y | Bulk delete dialog | error | | US5 AS4 |
| US5-AS5 | "Cancel": selection cleared, toolbar back as it was | P5 | Y | Selection bar | default | copy | US5 AS5 |
| US5-AS6 | Local drafts banner and rows selected: banner stays above the selection bar; device-only connections neither counted nor selectable | P5 | Y | Overview; Selection bar | default | copy | US5 AS6 |
| US6-AS1 | Drag above: landing line, faded copy; new order, open document stays open, pager "Document 1 of 2" | P6 | Y | Documents step | default | copy | US6 AS1 |
| US6-AS2 | Touch: press and hold drags as with the mouse; a short touch still scrolls | P6 | Y | Documents step | default | | US6 AS2 |
| US6-AS3 | Keyboard "Move up" on second document: becomes first, focus stays, move announced with new position | P6 | Y | Documents step | default | undrawn | US6 AS3 |
| US6-AS4 | Reordered draft saved, reopened, published: same order in documents step, test data, publish summary, details' Summary | P6 | Y | Documents step; Test step; Publish dialog; Details | default | | US6 AS4 |
| US6-AS5 | Published connection reordered in edit flow: new order in the UI; nothing changes for citizens or serviceBW | P6 | Y | Edit flow | success | | US6 AS5 |
| US7-AS1 | No connection: welcome page shows "Start from an example" beside "Create connection" | P7 | Y | Welcome page | empty | copy | US7 AS1 |
| US7-AS2 | Dialog "Start from an example?" with its body, "Go back" and "Create the example" | P7 | Y | Example dialog | default | copy | US7 AS2 |
| US7-AS3 | "Create the example": wizard step 1 with name, description, banner "This is an example. Change anything…" | P7 | Y | Wizard (connection step) | success | copy | US7 AS3 |
| US7-AS4 | Rules step: Standard Rule 01 (21) AND Rule 02 (2 years) with banner; Ambulance (19, 1 year) with banner | P7 | Y | Wizard (rules step) | default | copy | US7 AS4 |
| US7-AS5 | Unchanged example: publish dialog adds "This is still the example…"; publishing works; line gone after a change | P7 | Y | Publish dialog | default | copy | US7 AS5 |
| US7-AS6 | Overview lists the example as a normal draft; overview offers only "Create connection" | P7 | Y | Overview | default | copy | US7 AS6 |
| US8-AS1 | Agent reads or searches a scheduled connection: "scheduled", start date, links "unavailable" until then; search filter | P8 | N | MCP | ? | | US8 AS1 |
| US8-AS2 | Agent with "Read and edit drafts" moves second document first: stored order as after the editor's move | P8 | N | MCP | ? | | US8 AS2 |
| US8-AS3 | Agent asks to publish on 01.12.2026: approval page shows "Active from 01.12.2026"; approving schedules it | P8 | Y | Approval page | default | copy; clarif 2026-11-10 #2 | US8 AS3 |
| US8-AS4 | "Read only" agent asks for activity: same entries as the Activity card | P8 | N | MCP | ? | | US8 AS4 |
| US8-AS5 | No agent way to restore a deleted connection, delete several, or create the example | P8 | N | MCP | ? | | US8 AS5 |
| US9-AS1 | Driving licence: three columns; Name 4, Birth 6, Address 5, Document 6, Licence 3, Appearance 6, Other details 1, in that order; checkboxes | P9 | Y | Documents step (data item panel) | default | copy; clarif 2026-11-10 #35 | US9 AS1 |
| US9-AS2 | Ticking an empty group's checkbox chooses all its data items, as if each had been ticked | P9 | Y | Documents step (data item panel) | default | | US9 AS2 |
| US9-AS3 | A group with some of its data items chosen shows its checkbox's mixed state | P9 | Y | Documents step (data item panel) | default | | US9 AS3 |
| US9-AS4 | Clearing a group with data a rule checks first shows the question naming those rules | P9 | Y | Documents step (rules question dialog) | default | | US9 AS4 |
| US9-AS5 | An agent reading the catalog gets each grouped data item's group; it still chooses data items one by one | P9 | N | MCP | ? | | US9 AS5 |
| EC-1 | Dialog opened 30.11. with 01.12., confirmed after midnight: "Enter a date after today."; nothing changed | P1 | Y | Publish dialog; Change start date dialog | error | copy | Edge Cases |
| EC-2 | Service down at the start date: becomes active once it runs; "Active since" is the scheduled start | P1 | N | worker | ? | | Edge Cases |
| EC-3 | Scheduled connection deactivated: schedule cancelled; can be activated again, now or on a date | P1 | Y | Details | default | | Edge Cases |
| EC-4 | Scheduled connection deleted and restored after its date: becomes active at once | P4 | N | ? | ? | | Edge Cases |
| EC-5 | Requests in progress cancelled on deletion stay cancelled after "Undo"; waiting approval requests too | P4 | N | ? | ? | | Edge Cases |
| EC-6 | "Undo" twice, or after a colleague's later action: second changes nothing and says so | P4 | Y | Toast | error | | Edge Cases |
| EC-7 | Undo toast closes after its 6 seconds, is replaced by a later toast, or page left: deletion stands, no other restore place | P4 | Y | Toast | default | clarif 2026-11-10 #22 | Edge Cases |
| EC-8a | Pre-existing connections: rows and pills show the known dates (FR-021) | P2 | Y | Overview; Details | default | | Edge Cases |
| EC-8b | Pre-existing connections: documents keep their current order | P6 | N | ? | ? | | Edge Cases |
| EC-8c | Pre-existing connections: activity starts with what is known, without a person (FR-032) | P3 | Y | Activity card | default | | Edge Cases |
| EC-9 | A removed account: activity keeps the name as it was when the entry was made | P3 | N | Activity card | ? | | Edge Cases |
| EC-10 | Hundreds of activity entries: list stays usable and reaches the oldest one | P3 | Y | Activity card | default | undrawn | Edge Cases |
| EC-11 | Select-all selects listed rows only (search results); hidden rows are not selected | P5 | Y | Overview | default | | Edge Cases |
| EC-12 | A selected row disappears on refresh: it leaves the selection, the count follows | P5 | Y | Selection bar | default | | Edge Cases |
| EC-13 | Long selection: bulk dialog lists every connection, scrolls inside, buttons stay in view | P5 | Y | Bulk delete dialog | default | | Edge Cases |
| EC-14 | Only one document: nothing can be reordered, no reorder control shows | P6 | Y | Documents step | default | | Edge Cases |
| EC-15 | Drag dropped outside the list or ended with Escape: order unchanged | P6 | Y | Documents step | default | | Edge Cases |
| EC-16 | A removed document restored with the documents step's "Undo" returns to its place | P6 | Y | Documents step | default | | Edge Cases |
| EC-17 | Reduced motion: dragging and reordering follow spec 008's rule (transitions off) | P6 | Y | Documents step | default | | Edge Cases |
| EC-18 | Example created twice at the same moment: two example drafts, each a normal draft | P7 | N | ? | ? | | Edge Cases |
| EC-19 | Example created in the team member's current language and stays so; its banners follow the language | P7 | Y | Wizard | default | | Edge Cases |
| EC-20 | The example always fits the catalog it is created from; no shipping with a broken example | P7 | N | ? | ? | | Edge Cases |
| EC-21 | Every new control and state: 320 px at 200 % zoom, no horizontal scroll, visible focus | - | Y | ? | ? | | Edge Cases |
| ENT-StartDate.day | A calendar day in Germany, beginning at 00:00 | P1 | N | ? | ? | | Key Entities |
| ENT-StartDate.cardinality | A connection has at most one start date | P1 | N | ? | ? | | Key Entities |
| ENT-StartDate.setBy | Set when publishing or reactivating "On a date", or through "Change start date" | P1 | N | ? | ? | | Key Entities |
| ENT-StartDate.endsWhen | Ends when the day comes, "Now" is chosen, or on deactivation or deletion | P1 | N | ? | ? | | Key Entities |
| ENT-ConnectionStatus.value | draft, scheduled, active or deactivated; "scheduled" = published, with links, not yet usable | P1 | Y | ? | default | | Key Entities |
| ENT-StatusDates.published | When the connection was published; shown on the overview | P2 | Y | Overview | default | | Key Entities |
| ENT-StatusDates.activeSince | When it last became active; shown in the details' date pill | P2 | Y | Details | default | | Key Entities |
| ENT-StatusDates.deactivated | When it was last deactivated; shown on the overview and in the date pill | P2 | Y | Overview; Details | default | | Key Entities |
| ENT-ActivityEntry.when | When the thing happened | P3 | Y | Activity card | default | | Key Entities |
| ENT-ActivityEntry.what | One FR-025 kind, with a variant's name or a date where the kind has one | P3 | Y | Activity card | default | | Key Entities |
| ENT-ActivityEntry.who | A team member, a team member with an agent, or nobody | P3 | Y | Activity card | default | | Key Entities |
| ENT-ActivityEntry.connection | Belongs to one connection and goes with it | P3 | N | ? | ? | | Key Entities |
| ENT-DeletedConnection.restoreWindow | Deleted less than the restore time ago; gone everywhere except "Undo", which returns it unchanged | P4 | N | ? | ? | | Key Entities |
| ENT-DeletedConnection.afterwards | After the restore time, deleted as connections are today | P4 | N | ? | ? | | Key Entities |
| ENT-DocumentOrder.position | Each document's position; part of a draft's and a published connection's content | P6 | Y | Documents step | default | | Key Entities |
| ENT-ExampleMark.isExample | Draft created by "Start from an example" and not yet published | P7 | Y | Wizard | default | | Key Entities |
| ENT-ExampleMark.changed | Whether anything in the example changed since it was created | P7 | Y | Publish dialog | default | | Key Entities |
| ENT-DataGroup.name | A named set of a document's data items in the catalog ("Name", "Birth", …, "Other details") | P9 | Y | Documents step (data item panel) | default | | Key Entities |
| ENT-DataGroup.membership | Every data item of a document with more than 10 data items belongs to exactly one | P9 | N | ? | ? | | Key Entities |
| ENT-DataGroup.effect | Arranges the documents step's checkboxes; changes nothing a connection stores | P9 | N | ? | ? | | Key Entities |
| ENT-Selection.rows | The overview rows a team member ticked; page only, never stored | P5 | Y | Overview | default | | Key Entities |

## Exclusions

| OUT-ID | Excluded behaviour | Spec § |
|---|---|---|
| OUT-1 | A live connection's pending changes kept as a draft ("Keep draft and exit", "Draft changes", "Changes not published", F5) | Out of Scope; FR-074 |
| OUT-2 | A deactivation that lets started requests finish (F13) | Out of Scope; FR-009; FR-074 |
| OUT-3 | The email line in the user menu (Q13) | Out of Scope; FR-074 |
| OUT-4 | A success message for met citizens (Q31 (a)) | Out of Scope; FR-074 |
| OUT-5 | "Download PDF" (Q37 (b)) | Out of Scope; FR-074 |
| OUT-6 | Group B/C rules-package actions: remove from group, duplicate group, add into group, unlink from Standard, grouping a group, persona generation making every rule testable (F11); "Generate all"/"Generate again" stay | Out of Scope; Clarifications #7 |
| OUT-7 | Group B/C: upcoming documents (F3), roles and view-only users, with V-Draft · S2's view-only draft details (data groups are in scope) | Out of Scope; Clarifications #6, #30; FR-076 |
| OUT-8 | "Undo" after deactivating (F54) | Out of Scope; FR-074 |
| OUT-9 | "Undo" after deleting a variant, a rule or a group beyond what exists | Out of Scope |
| OUT-10 | "Undo" on the approval page | Out of Scope; FR-067 |
| OUT-11 | A bin or list of deleted connections; restoring after the restore time | Out of Scope |
| OUT-12 | Saved changes of an active connection taking effect on a date ("Active from" in "Save changes?"); a second version | Out of Scope; FR-009 |
| OUT-13 | A start time of day, time zone choice, recurring schedules, an end date, a schedule for deactivating | Out of Scope |
| OUT-14 | Notifications (email, in-app) when a scheduled connection becomes active | Out of Scope |
| OUT-15 | Filtering, searching or exporting the activity; activity across connections; recording views or copies | Out of Scope |
| OUT-16 | Reordering data items inside a document, the variants or the overview's rows | Out of Scope |
| OUT-17 | More than one example, choosing among examples, the example entry on the overview | Out of Scope; FR-053 |
| OUT-18 | Bulk actions other than delete (deactivate, activate, export) | Out of Scope |
| OUT-19 | Anything the citizen sees and the shape of what serviceBW receives | Out of Scope; FR-075 |
| OUT-20 | Agents restoring a deleted connection, deleting several with one request, or creating the example | FR-068; US8 AS5 |
| OUT-21 | Rule findings in the published Summary (P9d, build note 26) | Clarifications #21; FR-076 |

## Glossary

connection = form connection, Verbindung, connection card, row
variant = branch, Variante, tab (e.g. "Ambulance"), "Rules/Variant tab · fixes", ⓘ (variant description, not a count)
Standard = main branch, default variant, Standard tab
draft = Entwurf, unpublished connection, "Edited <date>", "Edited <date> · Connection step"
active = live, published, aktiv (agents' status "live")
scheduled = Scheduled, geplant, pending activation, "Active from"
deactivated = inactive, Deactivated, deaktiviert, "Activate again"
start date = Active from, go-live date, schedule date, Startdatum, date field (DD.MM.YYYY)
status dates = date pill, status pill, chip, badge, "Published <date>", "Active since", "Deactivated since"
header pill = status pill, status badge, "Scheduled · <date>", "badge-small" (hidden "Live, replaced" layers)
⋯ menu = overflow menu, kebab, more menu, actions menu, connection menu
Change start date = reschedule, edit date, Startdatum ändern, "Save date", "Start date saved."
publish dialog = publish modal, P1, "Publish connection", "Schedule", 16b ("Standard · 2 rules", "Ambulance · 2 rules")
Activate again = reactivate, reactivation dialog, "Activate this connection again?"
activity = Activity card, activity log, history, audit log, changelog, timeline, Aktivität
activity entry = event, log item, row, "Last edited by"
accordion = Links / Summary / Activity cards, one open at a time, "View links", "View summary", "View activity"
Undo = restore, Rückgängig, toast action
toast = snackbar, notification, alert, P18, auto-dismiss (6 s; note 30's "5 s")
deleted connection = restorable deletion, trash (none), bin (none)
selection = selected rows, checked rows, "<n> selected", ausgewählt
selection bar = bulk bar, bulk action bar, toolbar (replaced)
select-all = header checkbox, master checkbox, mixed/indeterminate state
bulk delete dialog = "Delete <n> connections?", multi-delete modal
local drafts banner = unsaved work on this device, "Unsaved changes in …", 1m, 1n, note 34, "Resume editing", "Discard" (Verwerfen; note 34's "Discard changes")
document = credential, ID document, Nachweis, Dokument (Personal ID, Driving licence)
Add document card = document picker, "Available", "Added", upcoming / coming-soon documents (excluded)
document order = reorder, drag handle, sort, drag and drop, "Move up", "Move down", R1/R2/R3
data item = field, attribute, claim
data group = field group, group heading, group checkbox, "All data items", Name, Birth, Address, Document, Licence, Appearance, "Other details", Datengruppe
pager = "Document n of m", document pagination
example = sample, demo, template, "Start from an example", "Start with an example" (slip), "Passenger transport licence (example)", Beispiel, 1g, 1i, 1j
example banner = info banner, hint, notice, callout, "Rules/Findings banner"
welcome page = empty state, homepage, start page, first-run screen, 1b, 1g, "Create connection →" (primary)
overview = connections list, dashboard, connection list, table, "Your connections"
description tooltip = 1k, cut description, hover text
details = connection details, detail page, status band, Links card, Summary card ("View summary", "Hide summary"), V-Draft · S, V-Draft · S2 (view-only, excluded)
wizard = create flow, stepper, steps (Connection, Documents, Rules, Test step)
leave connection dialog = "Leave this connection?", frame 2, 6a (silent save, not built), "Discard connection", "Save progress"
edit flow = edit mode, "Edit connection", "Save changes?", E1–E7, "Draft changes" / "Keep draft and exit" (excluded)
entry confirmation = "Edit this scheduled connection?", "Edit “<name>”?", edit entry dialog
leave dialog = "Save your changes?", E5b, E5a (replaced)
discard dialog = "Discard changes?", E7
build notes = notes 1–37, annotation, hand-off notes, sub-items a–n
rule = condition, Regel, Rule 01/Rule 02
group = rule group, AND/OR group, "Group with other rules" (excluded)
finding = rule check result, warning, finding icon, count
persona = test persona, test person, test data, applicant, "Generate all", "Generate again"
approval page = approval request, Freigabe, approve/decline page
agent = MCP client, LLM agent, assistant
team member = user, account, username, name in user menu
roles = view-only user, permissions, "needs roles" (excluded)
links = connection URLs, serviceBW links, copy link
middleware = product, management UI, Konnekt
