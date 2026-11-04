# Quickstart: validating connection drafts and crash recovery

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

How to prove that the feature works: the automated checks, then manual scenarios V1–V14 against a
running stack. The scenarios cite the acceptance scenarios (US#-AS#), edge cases (EC) and success
criteria (SC) they cover. The API shapes are in [contracts/management-api.md](contracts/management-api.md),
the screens in [contracts/ui-screens.md](contracts/ui-screens.md), and the local drafts in
[contracts/local-drafts.md](contracts/local-drafts.md).

## Prerequisites

- The stack as in `README.md`: PostgreSQL on 5435, the backend and the frontend, with
  `docker compose up` or the local commands. The migration must be applied:
  `cd backend && uv run alembic upgrade head`.
- Two team member accounts, such as `anna` and `ben`
  (`uv run python -m app.cli create-user anna`), and two browsers (or one normal and one private
  window; V9 needs one with storage blocked).
- EUDIPLO reachable for publishing. Every scenario except V3's publish and V12 works without it.
- An HTTP client for the connection URLs: `curl` from inside serviceBW's allowed network, or
  directly against the backend in development.

## Automated checks

```bash
# backend/
uv run ruff check . && uv run ruff format --check .
uv run mypy app/ scripts/ tests/
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5435/template_db_test uv run pytest
#   tests/api/test_form_connection_drafts.py   drafts, conflicts, publish parity (SC-003), boundaries
#   tests/api/test_connect.py                  draft URLs 409, deleted draft 404, no EUDIPLO call (SC-002)
#   tests/unit/test_draft_validation.py        structural checks (FR-003, FR-004)
#   tests/api/test_worker_requests.py          re-sync skips drafts

# frontend/
npm run lint && npm test && npm run build
#   src/utils/localDrafts/*.test.ts            format, keys, store, expiry, closed account, quota
#   src/pages/FormConnectionEditor/utils.test.ts   draftPayload, conflictOf, initial states, openingStepOf
```

Expected: every command passes. `uv run alembic check` reports no difference between the models
and the migrated database.

## Manual scenarios

### V1. Save and exit an incomplete new connection (US1-AS1, AS2; FR-001, FR-004)

1. As `anna`, open the overview, then "New connection". Enter the name "Parking permit draft" and
   no form ID. "Continue".
2. Add "Personal ID" and choose no field. Choose "Save and exit".
3. Expected: the overview opens, says "Draft Parking permit draft saved.", and lists it with the
   "Draft" badge, "Saved <today>", "No form ID yet", "Continue" and "View". The hint reads "Pick
   up your draft or connect another form."
4. "Continue" opens the documents step with Personal ID and no field chosen. Choose
   "Family name" and "Date of birth", then "Add rules →". Add a variant "Taxi" without rules. In
   Standard, add a rule on "Date of birth" without choosing a check ("Save changes" keeps it
   incomplete), and a complete rule on "Family name". Go back to the documents step and deselect
   "Family name": the removal dialog names its rule, and confirming leaves a rule on data that
   isn't requested (EC "Deselecting data that rules check, in a draft").
5. On the rules step, open a new rule, choose data, and without saving it choose "Save and exit".
   Expected: "Save changes to Rule 02?" first (FR-012). "Save changes" saves the draft, the
   incomplete rules included.

### V2. Continue on another device as another team member (US1-AS4; FR-008, SC-001)

1. In the second browser, as `ben`, open the overview and "Continue" the draft of V1.
2. Expected: the "Draft" badge, the rules step (the step it was saved in), the name, Personal ID
   with Family name, the variants Standard and Taxi, and the incomplete rules as saved.
3. Repeat from every step (connection, documents, rules, test): the flow opens at that step with
   everything entered (SC-001). The test step generates new personas.
4. Data the catalog dropped (S8): in the database, rename one of the draft's fields in
   `form_connections.draft` to a key the catalog doesn't know, such as `eye_colour_old`. "Continue"
   the draft, saved in the rules step. Expected: the flow moves to the documents step, the note
   lists "Personal ID – eye_colour_old" and takes the focus, and "Save and exit" is refused with
   the server's message until "Remove it".

### V3. A draft's URLs, then publishing it (US1-AS5, AS6, AS7; FR-006, FR-009; SC-002, SC-003)

1. Note the draft's id from the URL. Call
   `curl -i -X POST $BASE/api/connect/<id>/requests` and
   `curl -i $BASE/api/connect/<id>/requests/abc`.
   Expected: `409` with `"error": "unavailable"` and the deactivated message. In the database,
   `select count(*) from document_requests where form_connection_id = '<id>'` is 0. EUDIPLO's
   log shows no offer.
2. Details of the draft: the "Draft" badge, "This draft isn't live…", no connection links, the
   incomplete rules, "Continue" and "Delete draft", and no "Deactivate".
3. "Continue", go to the rules step and "Test rules →". Expected: refused at the incomplete rule
   with publishing's message, the same as for a new connection (US1-AS7).
4. Complete the rules and publish. Expected: the details say the connection is live, with a
   trigger URL and one pull URL for Standard and one for Taxi. The trigger URL now answers `201`
   with a wallet link (US1-AS6).
5. Parity (SC-003): create the same content as a new connection in one sitting, and compare the
   refusals in step 3 and the result in step 4. The messages and the URLs' shape are the same.
   The rule numbers may be higher for the draft, after deleted rules.

### V4. Malformed draft content is refused (US1-AS3; FR-003)

With the browser's devtools or `curl` and the session cookie, send
`PUT /api/form-connections/<draft id>/draft` with the current version and:
- `documents: [{"document_type": "unknown", "fields": []}]` → `400` "Unknown document type
  'unknown'.";
- 21 variants → `400` "A connection can have at most 20 variants.";
- a variant with an `id` → `400` "Unknown variant.";
- a rule `id` of `rule-x` → `400` "The rules contain an invalid identifier. Reload the connection
  and try again.";
- a name of 201 characters → `400` "The name can have at most 200 characters."

After each one, `GET` the draft: its content and version are unchanged.

### V5. Delete a draft (US1-AS9; FR-010)

1. Create a draft, open its details, "Delete draft", "Cancel", then "Delete draft" and confirm.
2. Expected: the overview without it. Its details URL shows "not found". Its trigger URL answers
   `404`. No other connection's `updated_at` changed.
3. Delete the team's only connection, a draft. Log out and in: the first-connection screen opens
   (EC "First connection").

### V6. Crash recovery of a new connection (US2-AS1, AS2, AS3; FR-014, FR-017; SC-004)

1. As `anna`, start a new connection: name, Personal ID with two fields, a rule. Don't save.
   Note the time, wait 3 seconds, then kill the browser process (`pkill -9 firefox` or close it
   from the task manager), not the tab.
2. Open the browser again at the app's root URL.
   Expected: the overview, or the first-connection screen if no connection exists (US2-AS5),
   shows "Unsaved work on this device" with the name, "New connection" and a "Last change" time
   within a few seconds of the noted time.
3. "Resume". Expected: the rules step with the name, the documents, the fields and the rule.
4. "Save and exit". Expected: the overview lists the draft and no longer offers the local draft.
5. Repeat with a reload (F5) and with a closed and reopened tab instead of the crash. Expected: the
   reload stays in the flow with the work (R10), and the reopened tab or the overview offers it.
6. Resume a local draft again, tick one more field and untick it (or type a character in the name
   and delete it), then kill the browser. Expected: the local draft is still offered, with the
   work. An undone change never removes a resumed local draft (FR-014).

### V7. Discard, other accounts, expiry (US2-AS4, AS7; FR-018, FR-019)

1. Leave a new connection unsaved, through the logo. Expected: the overview offers it (EC "Leaving
   the flow without saving").
2. "Discard", then "Cancel": still offered. "Discard" and confirm: gone. The database is
   unchanged.
3. Leave another unsaved one as `anna`. Log out: the warning names it. "Cancel", then log out and
   confirm. Sign in as `anna` again: nothing is offered (FR-019).
4. Leave one unsaved as `anna`, and let the session expire (shorten `LOGIN_SESSION_HOURS` in
   development, or delete the `login_sessions` row). Save: the sign-in screen. Sign in as `anna`:
   the flow returns with the work (EC "Sign-in session expires"). Sign in as `ben` on that browser
   instead: nothing of `anna`'s is offered (US2-AS7).
5. Expiry: in devtools, change a record's `changedAt` to 31 days ago and reload the overview. The
   record is gone (EC "Old local drafts").

### V8. Unsaved changes on a stored draft (US2-AS6; FR-016)

1. "Continue" a stored draft, change the name of a rule, and leave through the logo.
2. "Continue" the draft again. Expected: "Restore your unsaved changes?" with the time.
   "Restore changes" shows the changed rule name. Leave again, "Continue", Escape: the draft's
   details, and "Continue" asks again. Then "Discard them": the stored version, and no offer
   afterwards.
3. "Continue" a stored draft, change nothing, and leave. Expected: no local draft is offered (EC
   "Opening a stored draft and leaving without changing anything").

### V9. A browser that can't keep local drafts (FR-021)

In a browser with site data blocked (Firefox: block cookies and site data for the app's origin)
or a private window that refuses storage, create a connection, "Save and exit", continue it, and
publish. Expected: everything works, with no offer, no error and no console message.

### V10. Two team members on one draft (US3-AS1, AS2, AS3; FR-022; SC-006)

1. `anna` and `ben` open the same draft in two browsers.
2. `anna` changes the name and chooses "Save and exit".
3. `ben` changes a rule and chooses "Save and exit". Expected: "This draft has changed", with
   "Another team member saved this draft after you opened it." and "Reload" / "Replace their
   changes". No variant is named.
4. "Reload": `anna`'s name, and `ben`'s rule change is gone.
5. Repeat steps 1–3, and choose "Replace their changes": `ben`'s version is stored whole,
   including the old name. `anna` saves her outdated tab again: she meets the same dialog.
6. Repeat with publishing in step 3: the publish dialog shows the conflict, and "Replace their
   changes" publishes.

### V11. Published or deleted since it was opened (US3-AS4, AS5; FR-023, FR-024)

1. `anna` and `ben` open the same draft. `anna` publishes it. `ben` chooses "Save and exit".
   Expected: "This draft has been published", "Open the connection". The connection is still
   live and unchanged, and isn't a draft.
2. `anna` and `ben` open the same draft. `anna` deletes it. `ben` publishes. Expected: "This draft
   has been deleted", "Save as new draft". It creates a new draft with `ben`'s work, listed on the
   overview.
3. A local draft of a stored draft that `anna` saved since: `ben` resumes it from the overview
   and saves. Expected: V10's dialog (EC "A local draft of a stored draft…").

### V12. Two publishes of one draft at once (R5)

With a slowed EUDIPLO (or two `curl` calls of `POST …/publish` with the same body started
together): one answers `200`, the other `409 draft_published`. The published connection's
trigger URL starts a request whose wallet asks for the published documents. EUDIPLO still has
the winner's configuration (`fc-<id>-r1` or `-r2`), and the loser's is deleted.

### V13. Published connections are unchanged (FR-025, FR-026; SC-007)

1. A connection published before the migration: its trigger and pull URLs answer as before, and
   requests started before the migration still deliver.
2. Its edit flow has no "Save and exit" and no badge. "Save" puts changes live at once, and a
   rules conflict still shows spec 002's `rules_changed` dialog. Crash the browser mid-edit:
   nothing is offered afterwards (FR-014).
3. `PUT /api/form-connections/<draft id>` and `POST …/<draft id>/deactivate` answer
   `409 not_published`. `PUT /api/form-connections/<published id>/draft` answers
   `409 draft_published`.

### V14. Accessibility (FR-028; SC-008)

With the keyboard only and a screen reader (NVDA + Firefox or VoiceOver + Safari), at 320 px and
200 % zoom:
- "Save and exit", the badge, the offer, the restore question, the conflict dialogs, the draft
  details, the delete confirmation and the sign-out warning are reachable and named;
- dialogs trap and return the focus;
- the statuses ("Saving draft…", "Draft … saved.", "Unsaved work discarded.") are announced;
- "Draft" is read as text;
- nothing scrolls horizontally.

Run axe DevTools on the overview with drafts and an offer, a draft's details, and the create flow
with a stored draft. Expected: no WCAG 2.1 AA findings.

## Known limits (research R11, R16)

- **Logging out in one tab while editing in another.** If `anna` logs out in one tab while she
  keeps editing in another, the other tab writes its local draft again until its next save signs
  it out. That draft is offered at her next sign-in.
- **Request size.** nginx's default `client_max_body_size` (1 MB) also limits a draft save at the
  most extreme sizes of spec 002, as it already limits publishing.
