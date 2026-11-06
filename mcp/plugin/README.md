# The Connection Portal plugin

Guidance for agents that work in the Connection Portal, from one source (spec 007, research R16):

- `instructions.md`: the short instructions the MCP server gives every agent when it connects;
- `skills/<topic>/SKILL.md`: the guidance by topic, served by the MCP server through the Skills
  extension and the `get_guide` tool, and installed into Claude Code by this plugin;
- `.mcp.json`: adds the Connection Portal's MCP server to Claude Code;
- `.claude-plugin/plugin.json`: the plugin's manifest. The repository's
  `.claude-plugin/marketplace.json` lists it.

The topics: `connection-workflow`, `variants-and-standard`, `conditions`, `documents-and-catalog`,
`access-levels`, `publishing-and-live-connections`, `links` and `checks-and-tests`.

The MCP server embeds these files when it is built, so a change here reaches agents that connect
to the server with the next deployment. Every change to the MCP tools updates the skills in the
same change: `npm test` in `mcp/` fails when a tool isn't described in any `SKILL.md`.

## Installing with Claude Code

The plugin adds the MCP server `connection-portal` and the eight skills in one step.

1. Set `CONNECTION_PORTAL_MCP_URL` to the deployment's MCP endpoint, `https://<domain>/mcp`, in
   the environment Claude Code starts from (for example in your shell profile). A preview
   deployment has its own domain: point the variable at it to work with that preview.

   ```bash
   export CONNECTION_PORTAL_MCP_URL=https://<domain>/mcp
   ```

   Without it, `claude mcp list` shows the server with "Missing environment variables:
   CONNECTION_PORTAL_MCP_URL" and Claude Code doesn't connect to it.

2. Add the marketplace (the repository, as `owner/repo`, a git URL or a local checkout) and
   install the plugin from it. The marketplace is called `connection-portal`, after
   `.claude-plugin/marketplace.json`:

   ```bash
   claude plugin marketplace add <repository>
   claude plugin install connection-portal@connection-portal
   ```

3. Start Claude Code. The first call to the server opens the browser on the Connection Portal's
   consent page, where you sign in and choose the agent's access level.

To get newer skills, refresh the marketplace and update the plugin
(`claude plugin marketplace update connection-portal`, then
`claude plugin update connection-portal@connection-portal`). Claude Code keeps an installed plugin
at the `version` of `plugin.json`, so raise that version when the skills change. Agents that
connect to the server read the deployed skills either way.

## Other MCP clients

Add the HTTP (Streamable HTTP) server `https://<domain>/mcp`; the client signs in through the
browser on the first call, as Claude Code does. The guidance reaches the agent in three ways:

- the server's instructions, which every client receives when it connects;
- the skills, for clients that support the protocol's Skills extension (`skills/list`,
  `skills/get`, files under `skill://<topic>/SKILL.md`);
- the `get_guide` tool, for clients without it: without a topic it lists the topics, with one it
  answers the same text as the skill.

Clients that read skills from files can also use the folders in `skills/` directly: copy them
where the client looks for skills.

## Clients without browser sign-in

A client that can't open a browser to sign in uses a personal access token instead. Create one on
your user page in the Connection Portal, with its access level and expiry, and give it to the
client as its bearer token (`Authorization: Bearer <token>`). The token is shown once; keep it
out of files that are committed or shared.
