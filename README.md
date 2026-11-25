# Konnekt

The middleware between serviceBW forms and the EUDI Wallet.

> **Status: not actively maintained.** Pull requests and issues are closed. To contribute or to
> take the project over, write to [hello@dpschool.io](mailto:hello@dpschool.io) first.

Copyright 2026 Team Faro, Batch#27, Digital Product School. Licensed under the EUPL-1.2.
The licence's text is in [LICENSE](LICENSE); [NOTICE.md](NOTICE.md) names what comes from others
and under which terms. Security: [SECURITY.md](SECURITY.md). Contributions:
[CONTRIBUTING.md](CONTRIBUTING.md).

Konnekt lets the DO.IT team of the City of Stuttgart connect serviceBW forms to the EUDI Wallet.
For each form, DO.IT creates a form connection that names the documents and fields the form
needs. serviceBW then uses the form connection's URLs to request those documents from the
citizen's wallet, through an EUDIPLO instance, and receives only the configured fields. The team
sets up its form connections in Konnekt's management UI.

A form connection can also have rules that the shared documents must meet, such as "Date of
birth is at least 21 years old", combined with AND or OR in groups. Its variants (branches) each
have their own rules, based on the standard ones or not, and their own pull URL; the trigger URL
stays one for all. A pull answers with the documents and, next to them, the evaluation of the
called variant's rules: whether they are met, each rule's outcome and the error messages for the
citizen.

Team members can also work with an LLM agent on their own machine, such as Claude Code, Cursor or
Codex, through the middleware's MCP server: the agent finds and reads connections, builds drafts,
checks their rules and tests them with fictitious citizens, and asks the team member's approval,
on a page of Konnekt, to publish a draft or to deactivate, reactivate or delete a live
connection. See [docs/MCP-SERVER.md](docs/MCP-SERVER.md).

## Quick start

With Docker and Compose v2 (`docker compose`), and about 3 GB of free disk space:

```bash
# Settings for the backend, such as the EUDIPLO credentials (optional for a first start)
cp backend/.env.example backend/.env

# Start all services (PostgreSQL, backend, frontend, MCP server)
docker compose up

# In another terminal, once the backend has logged "Application startup complete":
# create your sign-in account
docker compose exec backend uv run python -m app.cli create-user <username>
```

Konnekt is then at http://localhost:5173 (use `localhost`, not `127.0.0.1`), the API at
http://localhost:3000 (its docs at `/docs`) and the MCP server at http://localhost:3100/mcp.
The other ways to run it, and every command, are in [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).

## Documentation

| Document | What it holds |
|---|---|
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) | Running Konnekt on your machine, with or without Docker; the commands of the backend, the npm workspace and Docker; the generated fixtures |
| [docs/CODE-QUALITY.md](docs/CODE-QUALITY.md) | The linters, formatters and type checks, the git hooks, continuous integration, the secret scan (gitleaks), format on save in VS Code and JetBrains |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | How it works: the data flow, the [repository's structure](docs/ARCHITECTURE.md#repository-structure), every feature, the patterns, the [environment variables](docs/ARCHITECTURE.md#environment-variables), the Docker setups |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Running the stack in production: the settings, the reverse proxy, the first account, backups, updates |
| [docs/ACCOUNTS.md](docs/ACCOUNTS.md) | The command-line tool: creating and managing the sign-in accounts, clearing the connections |
| [docs/MCP-SERVER.md](docs/MCP-SERVER.md) | Working with an LLM agent: the access levels, approvals, the tools, installing the plugin, connecting other MCP clients |
| [docs/EUDIPLO.md](docs/EUDIPLO.md) | EUDIPLO's management API as Konnekt uses it, and [what the tenant needs](docs/EUDIPLO.md#what-the-tenant-needs) |
| [docs/TEST-CREDENTIALS.md](docs/TEST-CREDENTIALS.md) | Issuing a test PID and driving licence to a test wallet |
| [docs/COMPATIBILITY.md](docs/COMPATIBILITY.md) | What Konnekt was tested with (EUDIPLO 9), why the catalog offers every field, the state of the German EUDI Wallet, the driving licence's nested fields |
| [docs/KERN-DESIGN-SYSTEM.md](docs/KERN-DESIGN-SYSTEM.md) | The KERN design system in the frontend: its packages, tokens, components and gotchas |
| [docs/FIGMA-WORKFLOW.md](docs/FIGMA-WORKFLOW.md) | Implementing a Figma design, step by step |
| [docs/DEPENDENCIES.md](docs/DEPENDENCIES.md) | Every dependency added to the template, and why |
| [specs/](specs/README.md) | How Konnekt was built: every feature's specification, plan and task list |
| [CLAUDE.md](CLAUDE.md) | The rules for AI coding agents, and the code's conventions |

## Tech stack

- **Frontend**: React 19, Vite 8, TypeScript, Tailwind CSS 4, React Router 7, KERN design system
- **Backend**: FastAPI (Python 3.13+), SQLAlchemy 2, Alembic, psycopg 3
- **MCP server**: Node, TypeScript, the official MCP TypeScript SDK 2, zod 4, Vite (build)
- **Database**: PostgreSQL 18
- **External service**: EUDIPLO 9, which talks to the citizens' wallets ([docs/EUDIPLO.md](docs/EUDIPLO.md)); the version Konnekt was tested with ([docs/COMPATIBILITY.md](docs/COMPATIBILITY.md))
- **Tooling**: ESLint 9, Prettier, Vitest, Ruff, mypy, pytest, pre-commit, gitleaks, uv (Python), Docker

## Repository

- `frontend/`: the React SPA, Konnekt's management UI
- `backend/`: the FastAPI API, with its background worker, migrations and tests
- `mcp/`: the MCP server for agents, with its guidance in `mcp/plugin/`
- `api-types/`, `rules/`: the TypeScript mirrors of the backend's schemas and the pure rules
  logic, which `frontend/` and `mcp/` share
- `docs/`: the documents above
- `specs/`: the specifications, plans and task lists

`api-types/`, `rules/`, `frontend/` and `mcp/` are the packages of one npm workspace at the
root. The full tree is in
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#repository-structure).

## How it was built

Konnekt was built in phases, with [GitHub Spec Kit](https://github.com/github/spec-kit). Each
phase's specification, plan and task list are in [specs/](specs/README.md):
[001-servicebw-eudi-middleware/](specs/001-servicebw-eudi-middleware/) for the form connections,
[002-connection-rules/](specs/002-connection-rules/) for their rules and variants,
[007-agent-mcp-server/](specs/007-agent-mcp-server/) for the agents' MCP server,
[008-kern-revamp-redesign/](specs/008-kern-revamp-redesign/) for Konnekt's current design on the
KERN Revamp, [009-language-toggle/](specs/009-language-toggle/) for English and German, and
[010-revamp-backend-gaps/](specs/010-revamp-backend-gaps/) for what that design draws on stored
data: scheduling a connection, its status dates and activity, deleting with "Undo" and several
at once, the documents' order, the example connection and the catalog's data groups. The code
base started from the Digital Product School React + FastAPI + PostgreSQL template.
