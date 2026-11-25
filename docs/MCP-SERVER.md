# Agents and the MCP server

The MCP server (`mcp/`) lets team members work with an LLM agent on their own machine. It is
public at `https://<domain>/mcp` (Streamable HTTP), next to the management UI, and
`http://localhost:3100/mcp` in development. An agent signs in through the browser, with OAuth:
the first call opens Konnekt's consent page, where the team member signs in and
chooses one of three access levels:

| Access level | Allows |
|---|---|
| Read only | Finding and reading connections and their activity, the catalog, checking rules, testing fictitious citizens |
| Read and edit drafts | Also creating and changing drafts, and asking for approval to publish (at once or on a start date) or delete a draft |
| Read, edit drafts and manage live connections | Also asking for approval to deactivate, reactivate, change the start date of or delete a published connection |

No level lets an agent change a published connection's content, and an agent never publishes,
deletes, deactivates, reactivates or changes a start date by itself: it hands the team member a link to an approval
page, valid for `APPROVAL_REQUEST_MINUTES`, where they approve or decline. The user page
("Your account" in the user menu) lists the connected agents and personal access tokens, and
changes an access level or revokes access, from the agent's next call. Every answer carries
links into Konnekt, and the rules step's menus copy a variant's, a rule's or a
group's link ("Copy link"), which agents accept wherever they take an identifier.

The server has 26 tools: `search_connections`, `get_connection`, `get_activity`,
`get_variant`, `get_item`, `get_catalog`, `search_values`, `check_rules`, `test_applicants` and
`get_guide` read; `create_draft`, `update_connection`, `set_document`, `move_document`,
`add_variant`, `update_variant`, `delete_variant`, `add_rule`, `update_item`, `delete_item`,
`reset_item`, `copy_rule` and `group_items` change drafts; `request_approval` and
`check_approval` ask for and read an approval, and `request_access` asks for a higher access
level. Restoring a deleted connection, deleting several connections at once and creating the
example are done by a team member in Konnekt: no tool offers them.

The guidance agents get, the server's instructions and eight skills, lives in `mcp/plugin/`
and is embedded in the server when it is built. Every change to the MCP tools updates the
skills in the same change; `npm test -w mcp` fails otherwise. Details:
[ARCHITECTURE.md](ARCHITECTURE.md#agent-access-and-the-mcp-server-spec-007), "Agent access and the MCP server (spec 007)",
and [mcp/plugin/README.md](../mcp/plugin/README.md).

## Installing the plugin

**Claude Code**: the plugin in `mcp/plugin/` adds the MCP server `konnekt` and the
skills in one step.

1. Set `KONNEKT_MCP_URL` to the deployment's MCP endpoint, `https://<domain>/mcp`, in
   the environment Claude Code starts from (for example in your shell profile). The plugin's
   `.mcp.json` reads the address from it: without it, Claude Code doesn't connect to the server.

   ```bash
   export KONNEKT_MCP_URL=https://<domain>/mcp
   ```

2. Add the repository as a marketplace and install the plugin from it. The marketplace and the
   plugin are both called `konnekt`, after `.claude-plugin/marketplace.json`:

   ```bash
   claude plugin marketplace add DigitalProductschool/konnekt
   claude plugin install konnekt@konnekt
   ```

   To try a fork or a local checkout, add its `owner/repo`, git URL or path instead.

3. Start Claude Code. The first call to the server opens the browser on the consent page.

**Other MCP clients**: add the HTTP (Streamable HTTP) server `https://<domain>/mcp`; the client
signs in through the browser on the first call. The skills reach the agent through the
protocol's Skills extension or, for clients without it, the `get_guide` tool. Clients that read
skills from files can use the folders in `mcp/plugin/skills/`: copy them where the client looks
for skills.

**Clients without browser sign-in**: create a personal access token on the user page, with its
access level and expiry (at most `AGENT_TOKEN_MAX_DAYS`), and give it to the client as its
bearer token (`Authorization: Bearer <token>`). The token is shown once; keep it out of files
that are committed or shared.
