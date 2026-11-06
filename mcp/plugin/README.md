# The Connection Portal plugin

Guidance for agents that work in the Connection Portal, from one source (spec 007, research R16):

- `instructions.md`: the short instructions the MCP server gives every agent when it connects;
- `skills/<topic>/SKILL.md`: the guidance by topic, served by the MCP server through the Skills
  extension and the `get_guide` tool, and installed into Claude Code by this plugin;
- `.mcp.json`: adds the Connection Portal's MCP server to Claude Code;
- `.claude-plugin/plugin.json`: the plugin's manifest. The repository's
  `.claude-plugin/marketplace.json` lists it.

The MCP server embeds these files when it is built, so a change here reaches agents with the next
deployment.

## Installing with Claude Code

Set `CONNECTION_PORTAL_MCP_URL` to the deployment's MCP endpoint, `https://<domain>/mcp`, then:

```bash
claude plugin marketplace add <repository>
claude plugin install connection-portal@connection-portal
```

The first call opens the browser for the Connection Portal's consent page.

## Other MCP clients

Add the HTTP server `https://<domain>/mcp`. The skills are served through the Skills extension,
or through the `get_guide` tool for clients without it; the files in `skills/` can also be copied
to where the client reads skills.

Clients that can't sign in through a browser use a personal access token from the user page as
their bearer token.
