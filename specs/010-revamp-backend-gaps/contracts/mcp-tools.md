# Contract: what the MCP server gains for agents

**Consumers**: MCP clients on team members' machines. **Requirements**: FR-062 to FR-069, FR-080,
SC-010, User Story 8, User Story 9 scenario 5. **Decisions**: research R9, R10. **Shapes**:
[management-api.md](management-api.md), [../data-model.md](../data-model.md).

This extends [spec 007's contract](../../007-agent-mcp-server/contracts/mcp-tools.md) and its
[guidance contract](../../007-agent-mcp-server/contracts/guidance.md). Their rules stay: every tool
answers `structuredContent` and one `text` block, a refusal is a `ToolError`, every answer about a
connection carries its link, every draft-changing tool runs the read-apply-save loop of
`mcp/src/draftEdit.ts`, and the server logs only through `mcp/src/log.ts`. What agents receive
stays English: the MCP server sends no `Accept-Language` (spec 009, FR-017).

## Results

```text
ConnectionRef { id, name, status: 'draft' | 'scheduled' | 'live' | 'deactivated', link }
```

`status` is the API's `state` (`connectionStateOf()` in `mcp/src/views.ts` reads it instead of
deriving it).

## Tools

26 tools: spec 007's 24, `get_activity` and `move_document`.

### Reading

| Tool | Level | Input | Output |
|---|---|---|---|
| `search_connections` (changed) | read | `status?` now `'draft' \| 'scheduled' \| 'live' \| 'deactivated'` | Each item also carries `start_date?` (scheduled), `published_at?`, `deactivated_at?`, `step?` (a draft) and `example?: true` |
| `get_connection` (changed) | read | unchanged | Also `start_date?`, `published_at?`, `active_since?`, `deactivated_since?`, `step?` (a draft), `example?: 'unchanged' \| 'changed'`; `documents` in the stored order; the URLs' note for a scheduled connection (below) |
| `get_activity` (new) | read | `connection`, `cursor?` | `{ connection: ConnectionRef, entries: ActivityEntryView[], next_cursor? }`, newest first, 50 per page: the Activity card's entries (FR-063) |
| `get_catalog` (changed) | read | unchanged | Each data item also carries `group?: string`, the group's English name; a document's detail also `groups: string[]`, in the panel's order (FR-080) |

```text
ActivityEntryView { at, event: string, kind, variant?: string, start_date?: string,
                    by?: string, agent?: string, approved?: true }
```

`event` is the English sentence the card shows ("Rules changed in Ambulance", "Scheduled for
2026-12-01"); `by` is the team member, `agent` the agent that made the change or, with `approved`,
that asked for it. An entry of the middleware has no `by`.

The URLs' note (`URLS_NOTES` in `views.ts`) gains:

```text
scheduled: 'This connection is scheduled: its URLs answer "unavailable" until it becomes active
            on {date}, 00:00 in Germany.'
```

The text block's lines gain the same facts: "Connection '{name}' (scheduled from {date}): {link}",
"Draft at the {step} step", "This draft is the example.".

### Changing drafts

| Tool | Level | Input | Effect and output |
|---|---|---|---|
| `move_document` (new) | drafts | `connection`, `document_type`, `position` (1 is first) | Moves the document to that place with `moveDocument()` of `rules/src/edits.ts`, the editor's own action, and saves the draft. Answers the documents in their new order. Refusals: a published connection (`published_read_only`), a document the draft doesn't request (`not_found`), a position outside 1 to the number of documents or the place it already has (`validation`), with the editor's messages |
| `set_document` (changed) | drafts | unchanged | A document that is added goes to the end; one whose data items change keeps its place; removing one leaves the others' order (FR-064). It no longer sorts into catalog order |

Agents choose data items one by one, as today: no tool takes a group (FR-080).

### Approval

| Tool | Level | Input | Effect and output |
|---|---|---|---|
| `request_approval` (changed) | drafts for `publish` and `delete_draft`, manage for the others | `action` gains `set_start_date`; `start_date?`: `YYYY-MM-DD`, or `'now'` | `publish`, `reactivate`: with a date the connection is scheduled for it; without one, or with `'now'`, it acts at once. `set_start_date`: `start_date` is required; a date moves or sets the start, `'now'` makes a scheduled connection live. Another action with a `start_date`, and a date that isn't after today in Germany, are refused (`validation`), and no request is made. `what_happens` says what approving does, with the date |
| `check_approval` (changed) | drafts | unchanged | `request` also carries `start_date?`; after a done request the connection's `status` is `scheduled` with its `start_date`, or `live`; `reason` gains `start_date_passed` |

`what_happens` (`WHAT_HAPPENS` in `mcp/src/tools/approvals.ts`), new texts:

| Case | Text |
|---|---|
| `publish` with a date | "The draft is published and scheduled: its links exist at once and answer "unavailable" until it becomes active on {date}, 00:00 in Germany." |
| `reactivate` with a date | "The connection is scheduled: its links answer "unavailable" until it becomes active on {date}, 00:00 in Germany." |
| `set_start_date`, scheduled, a date | "The connection's start moves to {date}, 00:00 in Germany." |
| `set_start_date`, scheduled, now | "The connection becomes active at once." |
| `set_start_date`, live, a date | "The connection is scheduled for {date}: its links answer "unavailable" until then, and requests in progress are cancelled." |
| `deactivate`, scheduled | "The schedule is cancelled and the connection is deactivated: it doesn't become active on {date}." |
| `delete`, scheduled | "The connection is deleted: it doesn't become active on {date}, and its links stop working for good. This can't be undone." |

## What the server never offers (FR-068)

No tool restores a deleted connection, deletes several connections with one request or creates the
example, and none chooses a whole data group. The backend refuses those endpoints for a bearer
(`403 browser_only`).

## Guidance (FR-069; spec 007 FR-038)

Every change above lands with its guidance in the same change, and `mcp/src/guidance.test.ts`
stays the gate: every registered tool appears in a skill, and the instructions name every approval
action in backticks.

| File | Gains |
|---|---|
| `mcp/plugin/instructions.md` | The status `scheduled` beside draft, live and deactivated; the action `set_start_date` in the approval list; one sentence that a start is a day in Germany. Still at most 500 words |
| `skills/publishing-and-live-connections/SKILL.md` | The scheduled status and what its URLs answer; `start_date` on `publish` and `reactivate`; `set_start_date` with its three cases; deactivating and deleting a scheduled connection; the outcome `start_date_passed`; the action table's new rows |
| `skills/connection-workflow/SKILL.md` | `get_activity` and what an entry says; the dates of `get_connection`; a draft's `step`; the example mark and that agents can't create the example |
| `skills/documents-and-catalog/SKILL.md` | `move_document`; that the documents keep the team's order and a new one goes to the end; the data items' `group` and that items are still chosen one by one |
| `skills/access-levels/SKILL.md` | `set_start_date` under "Read, edit drafts and manage live connections"; that restoring, bulk deleting and the example are a person's actions in Konnekt |
| `skills/links/SKILL.md` | `get_activity` and `move_document` among the tools that take a connection reference |

`guidance.test.ts`'s list of approval actions gains `set_start_date`; the list of skill names is
unchanged. `mcp/test/fakeBackend.ts` gains the activity route, the new fields, the `scheduled`
search status, the approval's `start_date` and the catalog's groups, and `mcp/test/server.test.ts`
a case per row of the tables above.
