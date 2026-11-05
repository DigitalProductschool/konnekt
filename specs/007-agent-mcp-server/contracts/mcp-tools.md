# Contract: the MCP server and its tools

**Consumers**: MCP clients on team members' machines (Claude Code, Cursor, Codex, others).
**Requirements**: FR-001, FR-003, FR-007 to FR-022, FR-027, FR-030 to FR-037, FR-039, FR-040.
**Decisions**: research R2, R5, R8, R11, R12, R14 to R16. **Shapes**: [../data-model.md](../data-model.md).

## Server

| | |
|---|---|
| Endpoint | `POST {MCP_URL}` (`https://<domain>/mcp`), Streamable HTTP, stateless; `GET` answers `405` |
| Protocol | 2025-11-25 (2026-07-28 where the SDK negotiates it) |
| Server info | `name: 'connection-portal'`, the deployment's version |
| Capabilities | `tools`, `resources`, `extensions: { 'io.modelcontextprotocol/skills': {} }` |
| Instructions | `mcp/plugin/instructions.md`, at most about 400 words (FR-036) |
| Authorization | Bearer token (an access token or a personal access token). Without a valid one: `401` with `WWW-Authenticate: Bearer resource_metadata="{MCP origin}/.well-known/oauth-protected-resource/mcp"` (RFC 9728's path form for the resource `{origin}/mcp`) and no body |
| Protected resource metadata | `GET {MCP origin}/.well-known/oauth-protected-resource` and `…/oauth-protected-resource/mcp`: `{ resource: MCP_URL, authorization_servers: [OAUTH_ISSUER], scopes_supported: ['read','drafts','manage'], bearer_methods_supported: ['header'], resource_name: 'Connection Portal' }` |
| Health | `GET {MCP origin}/health` → `{ status: 'ok' }`, for the container's health check |

Every tool call first resolves the bearer with `GET /api/agent/me` (research R5). A tool whose
level is above the caller's answers the error `insufficient_access` (below) before any work.

## Results and errors

Every tool answers `structuredContent` (the JSON named under each tool) and one `text` block
that summarises it for clients without structured content. Every answer that touches a
connection, variant, rule or group carries its link (FR-011):

```text
ConnectionRef { id, name, status: 'draft' | 'live' | 'deactivated', link }
VariantRef    { id, name, link }
ItemRef       { id, type: 'rule' | 'group', name, link }
```

A refusal is a tool result with `isError: true`, its text the message, and `structuredContent`:

```text
ToolError { code, message, needs_access_level?: 'drafts' | 'manage', candidates?: (VariantRef | ItemRef)[], error_id?: string }
```

| `code` | When | Message pattern |
|---|---|---|
| `insufficient_access` | The level doesn't allow the tool (FR-003) | "Your access is read only. Changing drafts needs the access level 'Read and edit drafts'. Ask for it with request_access, or the team member raises it on their user page." |
| `published_read_only` | A change to a published connection's content (FR-018) | "The content of a published connection is changed in the Connection Portal. Agents can only change drafts." |
| `not_found` | No such connection, variant, rule or group, or a draft deleted since (FR-031) | "This variant no longer exists." / "This draft has been deleted." |
| `ambiguous_name` | A name that matches several (FR-019); `candidates` lists them | "Two variants are called 'Ambulance'. Name one by its link: …" |
| `foreign_link` | A link to another address (FR-030) | "This link doesn't belong to this Connection Portal." |
| `validation` | The editor or the server refused the change (FR-016); the message is theirs, naming the item and the variant | "Rule 02 in Ambulance has no error message." / "The description can have at most 500 characters." |
| `conflict` | The draft changed three times while the tool tried (FR-015) | "The draft keeps changing while this change is applied. Try again." |
| `not_allowed` | An action that doesn't apply (FR-022, edge cases) | "This connection is already deactivated." / "This connection is a draft: it has nothing live yet." |
| `rate_limited` | The draft limit (FR-020) | "This agent can create drafts again at 15:40." |
| `backend_error` | The backend answered `5xx` or didn't answer; `error_id` when there is one | "The Connection Portal could not complete this. Error ID: …" |

`request_access` is the one tool that answers at the HTTP level (below).

## Tools

24 tools. The level column is the lowest level that may call the tool.

### Reading

| Tool | Level | Input | Output |
|---|---|---|---|
| `search_connections` | read | `query?: string` (part of a name or description, case-insensitive), `status?: 'draft' \| 'live' \| 'deactivated'`, `cursor?: string` | `{ items: { ...ConnectionRef, description?: string, updated_at }[], next_cursor: string \| null }`, at most 25 (FR-007). The description is left out when empty |
| `get_connection` | read | `connection` | `{ ...ConnectionRef, description?, documents: { document_type, label, fields: { key, label, kind }[] }[], variants: { ...VariantRef, description?, origin: 'main' \| 'based' \| 'empty', rules: number, groups: number }[], urls: ConnectionUrls \| null, urls_note: string, dropped: { document_type, field: string \| null, label }[], draft?: { version, step, updated_at } }`. `dropped` lists data the draft requests that the catalog no longer offers, as the editor's documents step notes it (spec 005), for the agent to remove with `set_document` before publishing; `urls` is null for a draft; `urls_note` says "The connection URLs exist once the draft is published." or, for a deactivated connection, that they answer "unavailable" until it is reactivated (FR-010) |
| `get_variant` | read | `connection`, `variant` | `{ connection: ConnectionRef, variant: { ...VariantRef, description?, origin, operator: 'and' \| 'or', operator_mark }, items: ItemView[], applicant_fields: ApplicantField[], unrequested_rules: ItemRef[] }` (FR-008). `ItemView` is the structured item with `statement` (the readable sentence, `statementOf()`), `mark`, `link`, and for a group its `operator`, `message` and `items`; one variant per answer, never more |
| `get_item` | read | `connection`, `variant`, `item` | `{ connection, variant: VariantRef, item: ItemView, in_group: ItemRef \| null }` |
| `get_catalog` | read | `document_type?` | Without: `{ document_types: { key, label, fields: number }[] }`. With: `{ key, label, fields: { key, label, kind, option_set?, multiple_values, parts?: { key, label, kind, option_set?, per_licence_class, multiple_values }[], conditions: { operator, words, input }[] }[] }` (FR-009; the operators per kind from `OPERATORS`) |
| `search_values` | read | `option_set`, `query?`, `cursor?` | `{ items: { value, label, description? }[], next_cursor }`, 25 per page, matched on label and value (FR-009) |

`ConnectionUrls`: `{ trigger_url, variants: { ...VariantRef, pull_url }[] }`, `pull_url` with the
literal `{reference}`.

`ApplicantField` (data-model §9): `{ key, label, kind, option_set?, multiple, licence_class? }`.

### Changing drafts (each: one change, stored at once; FR-012 to FR-017)

| Tool | Level | Input | Effect and output |
|---|---|---|---|
| `create_draft` | drafts | `name`, `description?` | A draft with a main variant "Standard" and no documents, at the connection step. `{ connection: ConnectionRef, variants: [VariantRef] }`. Counts towards the hourly limit (FR-020) |
| `update_connection` | drafts | `connection`, `name?`, `description?: string \| null` (`null` or `''` clears) | `{ connection }` |
| `set_document` | drafts | `connection`, `document_type`, `fields: string[] \| null` (`null` removes the document), `also_remove_rules?: boolean` | Adds the document or replaces its fields; removing a document or a field that rules check is refused with `validation` naming the rules unless `also_remove_rules`, which then removes those rules in every variant as the editor's confirmation does. `{ connection, documents, removed_rules: ItemRef[] }` |
| `add_variant` | drafts | `connection`, `name`, `description?`, `origin: 'based' \| 'empty'` | `newBranch()`. `{ connection, variant: VariantRef }`; a name taken is refused with the editor's message |
| `update_variant` | drafts | `connection`, `variant`, `name?`, `description?: string \| null`, `operator?: 'and' \| 'or'`, `reset_operator?: true` | Rename, describe, switch the top-level AND/OR (`operator_mark` in a based variant), or reset it to Standard's. `{ connection, variant }` |
| `delete_variant` | drafts | `connection`, `variant` | Not the main variant. `{ connection, deleted: VariantRef }` |
| `add_rule` | drafts | `connection`, `variant`, `group?`, `name?`, `target?: { document_type, field }`, `condition?: Condition`, `message?` | A new rule at the end of the top level or of `group`, numbered from the counters, `added` in a based variant, propagated from Standard; an incomplete rule is accepted (FR-013). `{ connection, variant, item: ItemView, propagated_to: VariantRef[] }` |
| `update_item` | drafts | `connection`, `variant`, `item`, `name?`, `target?`, `condition?`, `message?: string \| null`, `operator?` | A rule's name, data, condition and message; a group's name, AND/OR and message (`changeItem()`, then propagation from Standard). A rename that clashes in a based variant is refused as the editor refuses it. `{ connection, variant, item, propagated_to }` |
| `delete_item` | drafts | `connection`, `variant`, `item`, `keep_members?: boolean` | In Standard, an empty variant or for the variant's own item: deletes it (`keep_members` ungroups instead of deleting a group with its members); an inherited item in a based variant is removed (`removed` mark) instead, and the answer says which happened. Standard's deletion reports what based variants keep (`deletionEffects()`). `{ connection, variant, action: 'deleted' \| 'ungrouped' \| 'removed', item: ItemRef, effects: { variant: VariantRef, kept: ItemRef[], dissolved: ItemRef[] }[] }` |
| `reset_item` | drafts | `connection`, `variant`, `item` | In a based variant: a removed item is restored (with its removed members), a changed one follows Standard again. `{ connection, variant, item: ItemView }` |
| `copy_rule` | drafts | `connection`, `variant`, `rule`, `to_variants?: string[]` | Without `to_variants`, a duplicate beside the rule; with, a copy at the end of each target's top level (`copyRule()`: a copy to Standard covers the based variants). `{ connection, copies: { variant: VariantRef, item: ItemRef }[] }` |
| `group_items` | drafts | `connection`, `variant`, `items: string[]` (two or more, of one level), `name?`, `operator?`, `message?` | A group in the first member's place, or a sub-group inside a group (`groupItems()`, `canGroup()`). `{ connection, variant, item: ItemView }` |

`Condition` is the API's condition shape (spec 002): `{ operator, value?, match_case?, values?,
date?, years?, amount?, unit? }`. `target.field` takes `field`, `field.part` or
`field.part#class` (data-model §8).

### Approval (FR-021 to FR-027)

| Tool | Level | Input | Output |
|---|---|---|---|
| `request_approval` | drafts (`publish`, `delete_draft`), manage (`deactivate`, `reactivate`, `delete`) | `connection`, `action` | Nothing changes. The tool checks the action's level before any call (a "Read only" caller asking to deactivate gets the message naming 'Read, edit drafts and manage live connections', FR-003), then the preconditions (`not_allowed` or `validation` with publishing's messages). `{ request: { id, action, connection: ConnectionRef, link, expires_at, status: 'waiting' }, what_happens: string }`. When the client declared URL-mode elicitation, the server also sends `elicitation/create` `{ mode: 'url', elicitationId: request.id, url: link, message: "Approve publishing 'Parking permit' in the Connection Portal." }` |
| `check_approval` | drafts | `request_id` | `{ request: { id, action, connection, link, expires_at, status, outcome: 'waiting' \| 'done' \| 'declined' \| 'expired' \| 'replaced' \| 'cancelled' \| 'failed', reason?: string, error_id? }, urls: ConnectionUrls \| null }`; `urls` once the connection is published or reactivated |

### Checks and tests (FR-032 to FR-035)

| Tool | Level | Input | Output |
|---|---|---|---|
| `check_rules` | read | `connection`, `variant?` | `{ connection, day: 'YYYY-MM-DD', variants: { variant: VariantRef, checked_completely: boolean, rules_checked: number, notice: { kind: 'none_can_meet' \| 'all_meet', text, at_the_moment: boolean, resolution: string } \| null, findings: Finding[], not_covered: { item: ItemRef, reason: 'no_data' \| 'data_not_requested' \| 'condition_incomplete' \| 'unreadable', text }[] }[] }` (FR-033) |
| `test_applicants` | read | `connection`, `variant`, `applicants: { name?, values: Record<string, unknown> }[]` (1 to 10), `day?: 'YYYY-MM-DD'` | `{ connection, variant, day, results: { applicant, met, items: { item: ItemRef, outcome: 'met' \| 'not_met' \| 'not_checked', reason?: string, in_group: string \| null }[], messages: { item: ItemRef, message }[] }[] }`, exactly `evaluateBranch()`'s outcome. A value that doesn't fit is refused for the whole call with `validation`: "Applicant 'Anna': 'pid.birthdate' expects a date as YYYY-MM-DD." |

`Finding`: `{ item: ItemRef, kind: 'conflicting' \| 'redundant' \| 'always_met', involves: ItemRef[], why: string, at_the_moment: boolean, resolution: string }`, with `why` from `noteOf()` and `resolution` from `resolutionOf()`. A notice's `text` comes from `noticeText()` and its `resolution` from `resolutionOf()` too, since FR-032 asks for one for every kind.

### Guidance and access (FR-003, FR-037)

| Tool | Level | Input | Output |
|---|---|---|---|
| `get_guide` | read | `topic?` | Without: `{ topics: { name, description }[] }`. With: `{ topic, text }`, the `SKILL.md` text; an unknown topic answers the list with `validation` |
| `request_access` | read | `level: 'drafts' \| 'manage'` | If the caller already has the level: `{ access_level, message: "You already have 'Read and edit drafts'." }`. Otherwise the HTTP response is `403` with `WWW-Authenticate: Bearer error="insufficient_scope", scope="read drafts", error_description="Changing drafts needs the access level 'Read and edit drafts'. Reconnect with that level, or ask the team member to raise it on their user page."` (research R5) |

## Skills (SEP-2640; FR-037)

- `skills/list` → the eight skills: `{ name, description, uri: 'skill://<name>/SKILL.md', files: [{ uri, name, mimeType: 'text/markdown' }] }`.
- `skills/get` `{ uri }` → one entry.
- `resources/list` lists the same files; `resources/read` answers the text. No other resource.

## What the server never offers (FR-039)

No tool, resource or prompt touches document requests, citizens' data, serviceBW's connection
URLs (`/api/connect/`), accounts, or a published connection's content.

## The read-apply-save loop (research R8)

Every draft-changing tool: read the connection → refuse a published one → resolve names →
apply the `edits.ts` function → `PUT …/draft` with the read version → on `409 draft_changed`,
read and apply again (three attempts) → answer. The tool's `step` is the furthest step the
content reaches. No tool holds state between calls.
