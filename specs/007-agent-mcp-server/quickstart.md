# Quickstart: validating agent access through the MCP server

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Contracts**: [contracts/](contracts/)

This guide says how to prove the feature works, end to end. It names no implementation; the
shapes are in the contracts and [data-model.md](data-model.md).

## 1. Prerequisites

- The stack of README.md's Quick Start: PostgreSQL (Docker, port 5435), the backend on 3000,
  the frontend on 5173, and now the MCP server on 3100 (`npm install` at the root once, then
  `npm run dev -w mcp`, or the `mcp` service of `docker compose up`).
- An account: `uv run python -m app.cli create-user <username>`.
- EUDIPLO settings in `backend/.env` for publishing (the fake suffices for the automated tests).
- At least two MCP clients on the machine for SC-010: Claude Code and one of Cursor or Codex.
- `backend/.env`: `PORTAL_URL=http://localhost:5173`, `MCP_URL=http://localhost:3100/mcp` (the
  development defaults; set them only to deviate).

## 2. Automated checks

```bash
# backend/
uv run ruff check --fix . && uv run ruff format .
uv run mypy app/ scripts/ tests/
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5435/template_db_test uv run pytest
# → the OAuth flows, bearer principals per level, the user page's endpoints, search and paging,
#   approval requests (creation checks, replace, staleness, approve, decline, failure, another
#   account), the draft limit, branch ids in drafts and publishing, the migration's backfill

# repository root (the npm workspace; `npm install` once)
npm run lint && npm test && npm run build
# → runs every package's gates:
#   rules/: edits.ts with the reducer's cases replayed (SC-003), resolutionOf(), every module's test
#   frontend/: the reducer, the link builder of the rules step; the SPA builds with the three new pages
#   mcp/: links.ts, resolve.ts, applicants.ts, the findings mapping, guidance.test.ts (SC-009), the
#     server against the fake backend (tools, 401, step-up 403, the read-apply-save loop with a 409,
#     the elicitation); `build` type-checks and bundles dist/main.js and dist/checksWorker.js
#   api-types/: lint and type-check
cd mcp && node dist/main.js   # starts on 3100; GET /health answers ok
```

The guidance gate: rename a tool in the registry without touching the skills and run `npm test` in
`mcp/`:
`guidance.test.ts` fails naming the tool (SC-009, User Story 6 scenario 5).

## 3. Scenarios

Each scenario names the user story and the requirements it proves. "Portal" is the management
interface at `http://localhost:5173`.

### V1. Connect Claude Code with "Read only" (US1; FR-001, FR-002, FR-006, SC-001)

1. `claude mcp add --transport http connection-portal http://localhost:3100/mcp`, then call any
   tool. Claude Code opens the browser at the Portal's `/authorize` with the client's name.
2. Sign in if asked; the consent page shows the three levels with their descriptions, "Read
   only" preselected. Allow. The browser says to go back; the client is connected without
   anything copied. Under 2 minutes.
3. In the Portal, open the user menu → "Your account": the client is listed with "Read only",
   "Connected" now, "Never used" until the first call.
4. Deny instead (a second client, or revoke and reconnect): the client gets no access
   (scenario 2).

### V2. Reading (US1; FR-007 to FR-011, SC-006)

1. Seed 1,000 connections (a small script with the API, or the test fixtures). Ask the agent to
   find a connection by part of its name, then only among drafts: one page of at most 25 short
   entries with links, and a next page on request.
2. Ask for one connection: the overview (documents and fields, variants with origin and counts,
   links); then one variant's rules (statements and structure, marks); then one rule.
3. Ask for the connection URLs of a published connection (trigger URL and each variant's pull
   URL, labelled), of a deactivated one (the "unavailable" note), and of a draft (the "once
   published" note).
4. Ask for the catalog, one document type's fields and conditions, and search the countries for
   "ger".

### V3. Access levels on the user page (US1; FR-003, FR-006, SC-005)

1. With "Read only", ask the agent to rename a draft: refused, naming "Read and edit drafts" and
   the two ways to get it.
2. On the user page, change the client to "Read and edit drafts". Ask again: the rename works
   without reconnecting.
3. Lower it back to "Read only": the next change is refused. Revoke it: the next call is refused
   (`401`), and the client has to connect again.
4. Ask the agent to request more access (`request_access`): the consent page opens with the
   requested level preselected and the step-up line; allow; the change now works.
5. Delete the account with `app.cli delete-user`: every call of its agents answers `401`
   (scenario 11).

### V4. A personal access token (US1; FR-004, FR-005)

1. On the user page, "Create token" with a name, "Read and edit drafts" and 30 days: the token
   shows once with "Copy". Close the dialog: it can't be shown again.
2. Configure a client with the token as bearer (no browser sign-in). It reads and edits drafts.
3. Change its level and revoke it as in V3. Sign out of the browser: the token keeps working.

### V5. Build a draft one change at a time (US2; FR-012 to FR-017, SC-002, SC-003)

With an agent that may edit drafts, give the independent test of User Story 2:
1. Create a draft with a name and description; the result links the draft; the overview lists it
   as a draft.
2. Add two documents and choose fields; add a variant based on Standard and one that starts
   empty; add three rules to Standard and group two; change one of Standard's rules in the based
   variant; delete another of Standard's rules.
3. Open the draft in the Portal ("Continue"): it opens at the rules step, with exactly what the
   same actions in the editor produce: the new rule in the based variant unmarked, the changed
   one `changed`, the deleted one gone from the based variant.
4. Ask for a description of 600 characters: refused with the 500-character limit. Clear the
   description: the draft has none, and "Continue" and publishing still work.
5. Open the draft in the editor and keep it open; let the agent change it; save in the editor:
   the conflict dialog ("Reload" / "Replace their changes") appears without saying who saved.
6. Ask the agent to rename a rule to a name a based variant already uses: refused with the
   editor's message naming the item and the variant; the draft is unchanged.
7. Create drafts in a loop until the 21st in an hour: refused with the time it can continue.
   Changes to existing drafts still work.

### V6. Publish with approval (US3; FR-021 to FR-027, SC-004)

1. Ask the agent to publish a complete draft. Nothing is published; the result has the approval
   link and the expiry, and Claude Code shows the URL elicitation (a client without it shows the
   link in the result).
2. Open the link in the Portal: the page shows the name, the description, the documents, each
   variant's rules and the rule checks' findings; "Approve" and "Decline".
3. Approve: the page says "Published." and shows the connection URLs. Ask the agent to check the
   request: `done`, with the URLs.
4. Repeat with: Decline (the agent sees `declined`, the draft is unchanged); a link opened after
   10 minutes (expired); the draft changed in the Portal after the request (the page says the
   draft changed, nothing is published); another team member opening the link (can't approve);
   a draft that publishing would refuse (the agent is refused at once, with publishing's
   message, and no link is made).
5. Stop EUDIPLO (or set a wrong `EUDIPLO_URL`) and approve: the page shows the failure with the
   error ID and "Try again"; the draft stays a draft; restore EUDIPLO and try again: published.
6. Ask the agent to delete a draft: the approval page names the draft and says its content will
   be gone for good; approve; the draft is deleted.

### V7. Links (US4; FR-028 to FR-031, SC-008)

1. In the rules step of a stored draft, open the ⋯ menu of a rule in a based variant, of a
   group and of a variant tab: "Copy link"; the toast confirms. Paste each in a new tab: the
   editor opens at the rules step with that variant shown and the item in view. Sign out, open
   the link: sign-in, then the item.
2. Give the rule's link to the agent and ask it to change the rule's message: the right rule in
   the right variant changes.
3. Rename the rule and the variant, then publish the draft: the links copied before still open
   the same items, in the edit flow.
4. Delete the rule, open its link: the notice says it no longer exists, and the variant is shown.
   Give the link to the agent: "no longer exists". Give a link from another address: refused as
   not belonging to this Portal.
5. Every result the agent gives carries the links of what it read or changed.

### V8. Checks and tests (US5; FR-032 to FR-035, SC-007)

1. Build a draft with two conflicting rules, a duplicate rule and a variant no applicant can
   meet. Ask for the findings: they match the rules step's for the same rules, each with the
   variant, the item and its link, the kind, the rules involved, why, and a resolution.
2. Add a rule without a condition and one on data that isn't requested: the answer lists them as
   not covered, with the reason, and says whether each variant was checked completely.
3. Test the variant with three fictitious applicants (values by the keys `get_variant` lists):
   the outcomes per rule and group and the messages match the test step's for the same values.
   Omit the day: today in Germany; name another day: judged on it.
4. Give "yes" as a date of birth: refused naming the field and the kind it expects.
5. Check the backend's and the MCP server's logs: no applicant, value, finding or result in them.

### V9. Guidance (US6; FR-036 to FR-038, SC-009)

1. Connect Claude Code (reads skills) and a client without the extension: both receive the
   instructions; Claude Code lists the eight skills and reads one; the other client reads the
   same text with `get_guide`.
2. Install the plugin from the marketplace with `CONNECTION_PORTAL_MCP_URL` set: the server and
   the skills are added in one step.
3. The gate of §2.

### V10. Manage a live connection with approval (US7; FR-018, FR-021 to FR-027)

1. With "Read and edit drafts", ask to deactivate a live connection: refused, naming "Read, edit
   drafts and manage live connections"; `request_access` opens the consent page; allow.
2. Ask again: nothing changes yet; open the link: the page names the connection, lists the URLs
   that will answer "unavailable" and says requests in progress are cancelled. Approve: the
   connection's URLs answer `409 unavailable`; the agent reads `done`.
3. Reactivate the same way (the page lists the URLs that work again; afterwards the agent reads
   the URLs). Delete the same way (the page says the URLs stop working for good and that it
   can't be undone).
4. Decline once; deactivate a connection in the Portal while a request waits: approving does
   nothing, the page says what changed. Ask to deactivate an already deactivated connection:
   refused at once with its status, no link made.
5. At every level, ask the agent to change a rule of the live connection: refused, "changed in
   the Connection Portal".

### V11. Two clients end to end (SC-010)

With Claude Code and a second client, give each only a plain description of a form's
requirements (two documents, three rules, one variant). Each builds the draft and asks to
publish; one approval each; both connections are live without any change in the Portal.

### V12. Accessibility (FR-042, SC-011)

On the consent page, the user page (with its dialogs), the approval page (every state) and the
"Copy link" entries: keyboard only; a screen reader; 200 % zoom and 320 px wide; an automated
check (axe) without findings. The token-shown dialog's text reaches assistive technology.

### V13. Unchanged behaviour (FR-041)

The editor's create and edit flows, "Save and exit", the overview, the details, and
`/api/connect/` behave as before: run spec 005's and 006's quickstart scenarios once.

## 4. What to look at while implementing

- `backend/tests/api/test_oauth.py`, `test_agent_access.py`, `test_approval_requests.py`,
  `test_form_connection_search.py`; the level table test in `test_agent_principal.py`.
- `rules/src/edits.test.ts` (parity), `mcp/src/*.test.ts`,
  `mcp/test/server.test.ts` (against `fakeBackend.ts`).
- The migration's backfill on a database with drafts from spec 005.
