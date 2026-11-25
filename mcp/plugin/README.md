# The Konnekt plugin

Guidance for agents that work in Konnekt, from one source (spec 007, research R16):

- `instructions.md`: the short instructions the MCP server gives every agent when it connects;
- `skills/<topic>/SKILL.md`: the guidance by topic, served by the MCP server through the Skills
  extension and the `get_guide` tool, and installed into Claude Code by this plugin;
- `.mcp.json`: adds Konnekt's MCP server to Claude Code;
- `.claude-plugin/plugin.json`: the plugin's manifest. The repository's
  `.claude-plugin/marketplace.json` lists it.

The topics: `connection-workflow`, `variants-and-standard`, `conditions`, `documents-and-catalog`,
`access-levels`, `publishing-and-live-connections`, `links` and `checks-and-tests`.

The MCP server embeds these files when it is built, so a change here reaches agents that connect
to the server with the next deployment. Every change to the MCP tools updates the skills in the
same change: `npm test` in `mcp/` fails when a tool isn't described in any `SKILL.md`. The
repository's `README.md` ("Agents and the MCP server") gives the overview: the access levels,
approvals and the user page.

## Installing with Claude Code

The plugin adds the MCP server `konnekt` and the eight skills in one step.

1. Set `KONNEKT_MCP_URL` to the deployment's MCP endpoint, `https://<domain>/mcp`, in
   the environment Claude Code starts from (for example in your shell profile). A preview
   deployment has its own domain: point the variable at it to work with that preview.

   ```bash
   export KONNEKT_MCP_URL=https://<domain>/mcp
   ```

   Without it, `claude mcp list` shows the server with "Missing environment variables:
   KONNEKT_MCP_URL" and Claude Code doesn't connect to it.

2. Add the marketplace, the repository
   [`DigitalProductschool/konnekt`](https://github.com/DigitalProductschool/konnekt), and
   install the plugin from it. The marketplace and the plugin are both called `konnekt`, after
   `.claude-plugin/marketplace.json`, which lists the plugin in `mcp/plugin/`:

   ```bash
   claude plugin marketplace add DigitalProductschool/konnekt
   claude plugin install konnekt@konnekt
   ```

   To try a fork or a local checkout, add its `owner/repo`, git URL or path instead.

3. Start Claude Code. The first call to the server opens the browser on Konnekt's
   consent page, where you sign in and choose the agent's access level.

To get newer skills, refresh the marketplace and update the plugin
(`claude plugin marketplace update konnekt`, then
`claude plugin update konnekt@konnekt`). Claude Code keeps an installed plugin
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
your user page in Konnekt, with its access level and expiry, and give it to the
client as its bearer token (`Authorization: Bearer <token>`). The token is shown once; keep it
out of files that are committed or shared.
