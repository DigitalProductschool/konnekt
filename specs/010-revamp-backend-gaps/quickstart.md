# Quickstart: validating the stored-data features

**Phase 1 output of `/speckit-plan`** | **Date**: 2026-11-11 | **Spec**: [spec.md](spec.md) |
**Plan**: [plan.md](plan.md)

What proves the feature works: the gates, the per-node loop for the ported frames, and the
scenarios V1 to V15, which walk the nine user stories and the edge cases. The shapes are in
[contracts/management-api.md](contracts/management-api.md) and [data-model.md](data-model.md), the
screens in [contracts/ui-screens.md](contracts/ui-screens.md), the wording in
[contracts/copy.md](contracts/copy.md). Implementation details are in `tasks.md`, not here.

## Prerequisites

- The stack of `README.md`: PostgreSQL on port 5435 (the compose file), the backend with the
  worker (`WORKER_ENABLED=true`, the default), the frontend dev server, the MCP server; for the
  browser scenarios a EUDIPLO the backend can reach, or the fake of the test suite for the pytest
  cases. Two accounts (`uv run python -m app.cli create-user <username>`), so that the activity
  shows two people.
- `npm install` at the root once (this checkout had no `node_modules` on 2026-11-11; Node 20.19 is
  installed, CI runs Node 26) and `uv sync` in `backend/`.
- `uv run alembic upgrade head` after each migration of the feature.
- For V7 by hand: `DELETION_UNDO_SECONDS=20` in `backend/.env`, so that the restore time can be
  waited out.
- An MCP client with an agent connection at each access level for V12 (the README's "Agent
  access"), or the personal access tokens of the user page.
- The browser checks use the Playwright MCP tools (Chromium and Firefox); Figma is read per frame.
  A 1440 px frame needs a 1455 px window in Chromium on Linux (`docs/FIGMA-WORKFLOW.md` §4).
- Git: `GIT_DIR=/home/debian/batch27-faro/worktrees/010-revamp-backend-gaps`
  `GIT_WORK_TREE=/home/debian/batch27-faro/010-revamp-backend-gaps`.

## Gates (every task; constitution III)

```bash
# the root: api-types/, rules/, frontend/, mcp/
npm run lint && npm test && npm run build

# backend/
uv run ruff check --fix . && uv run ruff format . && uv run mypy app/ scripts/ tests/
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5435/konnekt_db_test uv run pytest
uv run python -m scripts.export_check_fixtures --check   # the generated fixtures are current
```

Expected: all green. `tsc` fails when a response's new field is missing from `api-types/src/`
where the frontend or the MCP server reads it; `copy.test.ts` fails on a copy table without its
German; `npm test -w mcp` fails when a tool is registered without its skill
(`guidance.test.ts`); the fixture check fails when the example or the server's messages changed
without the generated files.

## The per-node loop (the ported frames)

For each frame a task builds ([contracts/ui-screens.md](contracts/ui-screens.md) names them per
screen): `get_design_context` and `get_screenshot` on the node (file `s8mU9oJDq3411e8bxMjQO9`),
the page in the same state at 1440 px, the font check, the numeric check
(`getBoundingClientRect`, `getComputedStyle`), the screenshot comparison, then the state at
320 px / 200 %. The task appends its table to `design-notes.md`; `result` is `match` or the
decided item it cites (an F# or W# of `figma-audit/report.md`, a Clarification).

Expected: no open row.

## Scenarios

Run in Chromium and Firefox unless a scenario says otherwise. "The links answer unavailable"
means: `POST {trigger_url}` and a `GET` of each pull URL answer `409` with
`{ "error": "unavailable", "message": "This form connection is deactivated or deleted" }`.

### V1. Schedule at publishing (US1; FR-001 to FR-007, FR-014; SC-002)

1. Build a publishable draft; open the publish dialog. Expected: "Active from", "Now" selected,
   the "Now" sentence, "Publish connection".
2. Choose "On a date". Expected: the other sentence, the date field under the radios, "Schedule".
3. Enter a day after today; "Schedule". Expected: "Publishing…", "Published", then the details:
   "Your connection is scheduled", the pill "Active from <date>, 00:00", the header pill
   "Scheduled · <date>", every link shown and copyable, Links open.
4. The links answer unavailable. Compare the answer with a deactivated connection's: identical.
5. The overview row: "Scheduled", "Active from <date>".

### V2. The date's checks (FR-003; the edge case "midnight")

1. In the publish dialog, "On a date" with: nothing, today, yesterday, `31.02.2027`, `abc`. Each
   time "Schedule" stays enabled, the field turns red with "Enter a date after today.", the error
   is announced, and nothing is published (the draft's version is unchanged).
2. pytest: with the day moved forward between the request and the lock
   (`start_dates.today_in_germany` patched), publishing, activating, the start-date endpoint and
   an approval answer `400 invalid_start_date` and change nothing.
3. The dialogs show the server's `invalid_start_date` as the same field error: the dialog
   reducer's unit test covers it, and step 2 covers the server's side.

### V3. The start arrives (FR-005; SC-001; the edge case "not running")

1. pytest: a scheduled connection, the day patched to its start date, one call of
   `activate_scheduled_connections`. Expected: `is_active`, no `start_date`, `activated_at` at
   00:00 in Germany of that day, one `became_active` entry without a person, the links work.
2. pytest: the day patched to three days after the start (the middleware was down). Expected: the
   same, with `activated_at` at the scheduled start.
3. By hand: `UPDATE form_connections SET start_date = CURRENT_DATE WHERE id = '<id>'` on a
   scheduled connection. Within a worker cycle the details read "Your connection is active",
   "Active since <today>, 00:00", the row "Active", and the links work, with nobody signed in.

### V4. Moving, cancelling and reusing a schedule (FR-008 to FR-013; US1 scenarios 7 to 11)

1. Scheduled → ⋯ on the pill → "Change start date": a new date replaces the old one on the pill,
   the header and the row; the toast "Start date saved.".
2. The same dialog with "Now": active at once, "Active since <now>".
3. Active → "Change start date": "Now (active since …)" selected; "Save date" changes nothing. "On
   a date": the hint names the cancellation; after saving, the connection is scheduled, the links
   answer unavailable, and a request that was pending reads `unavailable`.
4. Scheduled → "Deactivate": the scheduled sentence; then "Connection deactivated", "Deactivated
   since <now>", and "Activate again" next to the pill.
5. Deactivated → "Activate again": "Now" with "Activate" as today; "On a date" with "Schedule"
   schedules it.
6. Scheduled → "Edit connection": the scheduled entry text, the header pill "Scheduled · <date>",
   step 1's note; save a change. Expected: the date is unchanged, the saved content is what the
   details show; "Save changes?" has no "Active from".
7. Scheduled → "Delete connection": the body names the date.

### V5. Dates and the draft's step (US2; FR-015 to FR-021; SC-003)

1. Publish, deactivate, reactivate; save drafts in each of the four steps. After each: the row
   ("Published <date>", "Deactivated <date>", "Edited <date> · <step> step") and the pill ("Active
   since …", "Deactivated since …") match what happened.
2. Save, rename and reorder an active connection: no date moves.
3. Reactivate: "Active since" moves, the row still reads "Published <the publication's date>".
4. A database from before the feature, migrated: no row or pill is empty; a deactivated one reads
   its last change.
5. A start date reads the same with the browser's time zone set to another zone (Playwright's
   `timezoneId`).

### V6. Activity (US3; FR-022 to FR-032; SC-004)

1. With two accounts and an agent: create a draft, change its documents, add the variant
   "Ambulance", change its rules, rename the connection, publish, deactivate, reactivate. After
   each, the Activity card shows the entry with its time, its event and the person, newest first.
2. The agent changes a rule twenty times in one variant. Expected: one entry, "<team member> with
   <agent>", with the last time. Another person's change in between starts a new entry.
3. Change a rule in Standard that propagates to a linked variant. Expected: one entry, "Rules
   changed in Standard".
4. Approve an agent's publish request. Expected: "Published · <approver>, asked by <agent>".
5. Deactivated: the closed line reads "Deactivated by <name> · …".
6. One card open at a time on every details page; after publishing the page lands with Links
   open, and opening Activity closes it.
7. A connection with more than 50 entries (seed them): the list scrolls to the oldest entry, by
   mouse and by keyboard.
8. Review the table: `SELECT DISTINCT kind FROM connection_activity` holds only the kinds of
   data-model §2.2, and no column holds a rule's content, a message or a value.

### V7. Undo (US4; FR-033 to FR-037; SC-005)

1. Delete a draft, an active, a scheduled and a deactivated connection, from the overview and from
   the details. Each time the toast reads "“<name>” deleted." with "Undo".
2. "Undo": the row is back without a reload, "“<name>” restored." is announced, and name,
   description, documents and their order, variants, rules, status, dates, the draft's step and
   "Edited" date, the activity (plus "Deleted" and "Restored") and the links are as before; an
   active connection's links work again.
3. Delete the last connection: the welcome page with the toast; "Undo" brings the overview back.
4. Keep the pointer on the toast past `DELETION_UNDO_SECONDS`, then "Undo": "“<name>” can no
   longer be restored.", nothing changes. A second "Undo" after a restore (replay the request):
   `409 not_restorable`.
5. Leave the toast alone: it closes after 6 seconds; the deletion stands.
6. A pending request at deletion reads `unavailable` and stays so after "Undo"; a waiting approval
   request reads cancelled and stays so.
7. While a deleted draft can still be restored, its connection URLs answer `404`; a deleted
   published connection's answer `409 unavailable`.
8. After the restore time: the connection's `connection_activity` rows are gone; a deleted draft's
   row is gone; a restored connection's EUDIPLO configuration was never deleted.

### V8. Bulk delete (US5; FR-038 to FR-044; SC-006)

1. Tick two of three rows: "2 selected · Cancel · Delete" replaces the toolbar, the select-all box
   is mixed, the count is announced. "Cancel" brings the toolbar back with its search text.
2. With a search active, select-all selects only the listed rows.
3. "Delete" with one row: that row's own dialog. With an active, a scheduled and a draft row: the
   bulk dialog with one line each and the two warning lines.
4. "Delete connections": all rows gone, selection cleared, "<n> connections deleted." with "Undo",
   which brings all back.
5. In another tab, deactivate one of the selected connections, then confirm: nothing is deleted,
   the dialog names it, the list behind shows the new state.
6. Ten connections in one confirmation, under 30 seconds.
7. With the local-drafts banner showing: it stays above the selection bar; a device-only
   connection has no checkbox.

### V9. Document order (US6; FR-045 to FR-052; SC-007)

1. Add "Driving licence", then "Personal ID": the list shows them in that order, not the
   catalog's.
2. Drag with the mouse: the drop line, the faded copy, the new order; the open document stays
   open; the pager counts in the list's order. Drop outside the list, and press Escape while
   dragging: the order is unchanged.
3. Touch (Playwright's touch): press and hold, then move: a drag. A short swipe scrolls the list.
4. Keyboard only: the row's ⋯ → "Move up"; the focus stays on the moved row; "“<document>” moved
   to position 1 of 2." is announced. The first row has no "Move up", the last no "Move down".
   Every ⋯ ends with "Remove document" after a divider, and a single document's ⋯ holds only
   that (changed 2026-11-18, bug v5-ui-fixes (B4): a single document had no ⋯).
5. Remove a document and "Undo": it returns to its place.
6. Save as a draft, reopen, publish: the documents step, the test step's data, the publish
   dialog, the details' Summary and the approval page list the same order.
7. Reorder a published connection in the edit flow and save. Expected: no new revision
   (`current_revision` unchanged), no EUDIPLO call, and a pull delivers the documents in the same
   order as before.
8. With reduced motion: no transition while dragging or dropping.

### V10. The example (US7; FR-053 to FR-061; SC-008)

1. On an installation without connections: "Start from an example" beside "Create connection";
   the dialog; "Create the example" opens step 1 with the name, the description and the banner,
   in under 10 seconds from the welcome page.
2. The banners on each step; Standard's and the variant's on the rules step; no finding icon on
   the tabs.
3. Publish it unchanged: the dialog adds "This is still the example. …"; publishing works. In a
   second example, change the age, save, reopen the dialog: the line is gone.
4. The overview: a draft "Passenger transport licence (example)", "Edited <date> · Connection
   step", and only "Create connection" in the footer.
5. In German: the example's name, description, variant and messages are German and stay German
   after switching back to English.
6. After publishing: no banner anywhere, `example` is null.

### V11. Data groups (US9; FR-077 to FR-080; SC-012)

1. The driving licence's panel: three columns, the groups Name (4), Birth (6), Address (5),
   Document (6), Licence (3), Appearance (6), Other details (1), in that order. The Personal
   ID's: Name (4), Birth (4, with Nationality), Address (7), Document (6), Other details (4)
   (spec Clarification 2026-11-11).
2. Tick a group: all of its data items are chosen; some chosen: the group's box is mixed; "All
   data items" and the count line follow.
3. Clear a group whose data a rule checks: the question that names the rules comes first.
4. The same in the edit flow of a published connection.
5. In German: the group names are German.

### V12. Agents (US8; FR-062 to FR-069; SC-010)

1. `search_connections` with `status: "scheduled"`, and `get_connection` on a scheduled
   connection: the status, the start date, the note about the URLs.
2. `get_connection` on a draft: its step, the documents in the stored order, the example mark.
3. `move_document` with "Read and edit drafts": the stored draft has the new order, and the
   Activity card shows "Documents changed · <team member> with <agent>". With "Read only": refused
   with the level's message.
4. `get_activity` with "Read only": the card's entries.
5. `request_approval` to publish on a date: the approval page shows "Active from <date>" before
   approving; after approving the connection is scheduled, and `check_approval` answers the date.
   The same for `reactivate` with a date and for `set_start_date` on a scheduled and on an active
   connection (the page names the cancellation).
6. A request for a date that is today: refused, no approval request exists.
7. A request made for a scheduled connection whose date was then moved in the browser: the page
   says why it does nothing.
8. No tool restores, deletes several or creates the example; the endpoints answer
   `403 browser_only` for a bearer.
9. `npm test -w mcp`: every tool is in a skill; the instructions name the six actions.

### V13. Toasts (FR-082)

Each toast with an action (the deletion, the document removal's "Undo", the rules step's "Undo",
"Try again" after a failed save) closes after 6 seconds, and not while the pointer or the keyboard
focus is on it. After the rules step's toast is gone, Ctrl/Cmd+Z still undoes.

### V14. Quality bar, both languages (FR-071, FR-072; SC-009)

For every new screen and state of [contracts/ui-screens.md](contracts/ui-screens.md), in English
and German: the keyboard walk with a visible focus ring; 320 px at 200 % without horizontal
scroll; AA contrast of every new text and control; the announcements (the selection's count, the
move, the restore, the date's error); one screen reader pass (Orca or NVDA) over the publish
dialog, the selection bar and the Activity card. `<html lang>` follows the language.

### V15. Nothing else changed (FR-073 to FR-076; SC-011)

1. The gates above, with the suites that existed before the feature unchanged where the behaviour
   is unchanged.
2. `/api/connect/`: the answers for a live, a deactivated, a deleted connection and a draft are
   byte for byte what they were (the existing tests), and a scheduled connection's equal a
   deactivated one's.
3. The logs of a run of V1 to V12: ids and counts only, no name, date of a citizen, rule content
   or activity text.
4. What stays unbuilt (FR-076): no "Draft changes", no "Keep draft and exit", no "Download PDF",
   no "Undo" after deactivating, no upcoming documents, no "Message … reads" box, no "Group with
   other rules", no email line, no findings in the published Summary.
