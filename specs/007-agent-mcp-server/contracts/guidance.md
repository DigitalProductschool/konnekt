# Contract: guidance for agents

**Requirements**: FR-036 to FR-038, SC-009. **Decisions**: research R16.

## One source

```text
mcp/plugin/
├── .claude-plugin/plugin.json      # name: connection-portal, description, version, author
├── .mcp.json                       # { "mcpServers": { "connection-portal": { "type": "http", "url": "${CONNECTION_PORTAL_MCP_URL}" } } }
├── README.md                       # how to install (Claude Code), how to copy the skills elsewhere
├── instructions.md                 # the server instructions (FR-036)
└── skills/
    ├── connection-workflow/SKILL.md
    ├── variants-and-standard/SKILL.md
    ├── conditions/SKILL.md
    ├── documents-and-catalog/SKILL.md
    ├── access-levels/SKILL.md
    ├── publishing-and-live-connections/SKILL.md
    ├── links/SKILL.md
    └── checks-and-tests/SKILL.md
.claude-plugin/marketplace.json     # at the repository root: lists mcp/plugin
```

Each `SKILL.md` has YAML frontmatter (`name`, `description`) and Markdown. The server embeds
the files at build time and serves them as the `initialize` instructions, as the Skills
extension, and through `get_guide` ([mcp-tools.md](mcp-tools.md)).

## The instructions (`instructions.md`; FR-036, User Story 6 scenario 1)

At most about 400 words, covering, in this order:
1. What a connection is (a serviceBW form's documents and rules), what a draft is (stored,
   incomplete allowed, not live), what variants and Standard are (every connection has
   Standard; a variant based on it follows Standard's rules until it changes one).
2. The order of work: find or create a draft → set name and description → choose documents and
   fields → add rules (and groups, variants) → `check_rules` and `test_applicants` → ask for
   approval to publish → read the connection URLs.
3. The three access levels, by name, and that a published connection's content is read-only at
   every level.
4. That publishing or deleting a draft, and deactivating, reactivating or deleting a published
   connection, need the team member's approval through a link, and that the tool never acts
   itself.
5. That every answer carries links to open in the Connection Portal, and that tools accept
   those links wherever they take an identifier.
6. That the agent must never use real people's data in tests, and that `get_guide` has the
   details by topic.

## The skills (FR-037, scenario 4)

| Skill | Covers | Tools it must describe |
|---|---|---|
| `connection-workflow` | From a description of a form to a live connection; one change per call; the draft's step; what to tell the team member | `search_connections`, `get_connection`, `create_draft`, `update_connection`, `request_approval`, `check_approval` |
| `variants-and-standard` | Standard, based and empty variants, marks (follows, changed, removed, added), how Standard's changes reach based variants, the top-level AND/OR, resetting | `add_variant`, `update_variant`, `delete_variant`, `reset_item`, `copy_rule`, `get_variant` |
| `conditions` | Operators per kind (number, text, enum, date), dates on Germany's calendar day, years-ago and from-now, the Date of birth as an age, message wording | `add_rule`, `update_item`, `get_item` |
| `documents-and-catalog` | Document types, fields, parts, value sets, what removing a document does to rules | `get_catalog`, `search_values`, `set_document` |
| `access-levels` | The three levels, what each allows, how to ask for more, the user page, personal access tokens | `request_access` |
| `publishing-and-live-connections` | Publishing's checks, the approval link and its expiry, outcomes, deactivating, reactivating and deleting, the connection URLs | `request_approval`, `check_approval`, `get_connection` |
| `links` | The link formats, what a link names, copying links, ambiguous names | every tool that takes `connection`, `variant` or `item` (by reference to the convention) |
| `checks-and-tests` | Findings and their kinds, what resolves them, incomplete checks, fictitious applicants and their fields, never real data | `check_rules`, `test_applicants`, `get_variant` |

Groups (`group_items`, `delete_item` with `keep_members`) are described in `conditions` or
`variants-and-standard`; `get_guide` in `connection-workflow`.

## The gate (FR-038, SC-009)

`mcp/src/guidance.test.ts`:
- every tool name of the server's registry appears, as a backticked word, in at least one
  `SKILL.md`;
- every `SKILL.md` has frontmatter with `name` equal to its folder and a non-empty
  `description`;
- `instructions.md` names the three access levels and the five approval actions, and is at
  most 500 words (the target is 400; the gate leaves room for wording);
- `.mcp.json` names the server `connection-portal`, and `marketplace.json` lists the plugin.

It runs with `npm test` in `mcp/`, one of the MCP server's gates.

CLAUDE.md gets the rule: "Every change to the MCP tools updates the skills in
`mcp/plugin/skills/` in the same change; `npm test` in `mcp/` fails when a tool isn't described."

## Installing (README)

- Claude Code: `claude plugin marketplace add <repository>` then
  `claude plugin install connection-portal@<marketplace>`, with `CONNECTION_PORTAL_MCP_URL` set
  to the deployment's `https://<domain>/mcp`; the first call opens the browser for the consent.
- Other MCP clients: add the HTTP server `https://<domain>/mcp`; the skills are served through
  the extension or `get_guide`, and the files in `plugin/skills/` can be copied where the client
  reads skills.
- Clients without browser sign-in: a personal access token from the user page, as the bearer.
