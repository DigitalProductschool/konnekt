# Deployment

The whole stack (frontend, backend, PostgreSQL and MCP server) runs on any Docker host from
`docker-compose.prod.yml`, behind a reverse proxy of your own that provides HTTPS. Only the
frontend's nginx is reached from outside: it serves the SPA and forwards `/api` (plus `/docs`
and `/openapi.json`) to the backend over the internal network, so there is no CORS
configuration and no API URL baked into the frontend build. For agents, it also forwards `/mcp`
and `/.well-known/oauth-protected-resource` to the MCP server and
`/.well-known/oauth-authorization-server` to the backend, so the MCP endpoint is
`https://<domain>/mcp`. The backend, the MCP server and PostgreSQL publish no port.

Run one stack per domain, each with its own database and accounts. There are no preview
deployments.

The topology and what follows from it are in
[ARCHITECTURE.md](ARCHITECTURE.md#production-deployment); what the EUDIPLO tenant needs is in
[EUDIPLO.md](EUDIPLO.md#what-the-tenant-needs).

## 1. Settings

Put the settings into a file named `.env` beside `docker-compose.prod.yml`, in the repository
root: Docker Compose reads it when it starts the stack, and `.gitignore` keeps it out of git.

```bash
SERVICE_PASSWORD_POSTGRES=<a long random password, letters and digits only>
CONNECTION_BASE_URL=https://konnekt.example.org
EUDIPLO_URL=https://eudiplo.example.org
EUDIPLO_CLIENT_ID=<client-id>
EUDIPLO_CLIENT_SECRET=<client-secret>
EUDIPLO_TRUST_LIST_ID=<trust-list-id>
SERVICEBW_ALLOWED_CIDRS=<serviceBW's address ranges>
TRUSTED_PROXY_CIDRS=<the proxy's address, see step 3>
```

| Variable | Needed | Purpose |
|---|---|---|
| `SERVICE_PASSWORD_POSTGRES` | always | The database password. Without it the compose file stops with `SERVICE_PASSWORD_POSTGRES must be set to the database password`. It goes into the backend's database URL, so use letters and digits only (`openssl rand -hex 32`). PostgreSQL takes it when it creates the database on the first start; changing it later doesn't change the stored password |
| `CONNECTION_BASE_URL` | always | The public `https://` address, the domain's origin without a path. The backend refuses to start without it. The compose file also sets `PORTAL_URL`, `MCP_URL` and `OAUTH_ISSUER` of the backend and the MCP server from it, so it must be the domain the proxy serves |
| `EUDIPLO_URL`, `EUDIPLO_CLIENT_ID`, `EUDIPLO_CLIENT_SECRET`, `EUDIPLO_TRUST_LIST_ID` | to save and use connections | Your EUDIPLO instance, its API client and its trust list ([EUDIPLO.md](EUDIPLO.md#what-the-tenant-needs)). While one is empty, the calls to EUDIPLO, and saving a connection, answer `503`. Left out of `.env`, each makes Compose warn that it "is not set" on every command; write it empty (`EUDIPLO_URL=`) to start without EUDIPLO |
| `SERVICEBW_ALLOWED_CIDRS` | for serviceBW | The address ranges serviceBW calls the connection URLs from. Empty: `/api/connect/` answers `403` to everyone |
| `TRUSTED_PROXY_CIDRS` | for serviceBW | The address the proxy's connections arrive from, as nginx sees them (step 3). Empty: nginx sees every request come from the proxy, which the allow-list rejects |
| `SERVICE_FQDN_FRONTEND` | no | Passed to the frontend container when set; nothing in the container reads it. It only matters to a hosting platform that reads it; otherwise leave it unset |

The others have defaults and can be set in the same file: `REQUEST_LIFETIME_SECONDS`,
`DOCUMENT_RETENTION_SECONDS`, `PULL_REPEAT_WINDOW_SECONDS`, `REQUEST_RECORD_RETENTION_SECONDS`,
`ALLOW_PLAIN_HTTP`, `WORKER_ENABLED`, `LOGIN_SESSION_HOURS`, `AGENT_ACCESS_TOKEN_MINUTES`,
`AGENT_CONNECTION_IDLE_DAYS`, `AGENT_TOKEN_MAX_DAYS`, `APPROVAL_REQUEST_MINUTES` and
`AGENT_DRAFTS_PER_HOUR` ([Environment Variables](ARCHITECTURE.md#environment-variables)). A backend setting
that the compose file doesn't pass, such as `DELETION_UNDO_SECONDS` or the sign-in throttle's
`SIGN_IN_*`, keeps its default.

The compose file sets `APP_ENV` to `production`, as the backend image already does. Any value
other than `development` changes three things: `CONNECTION_BASE_URL` is required and must use
`https://` (unless `ALLOW_PLAIN_HTTP=true`), the sign-in cookie is `Secure`, and `PORTAL_URL`,
`MCP_URL` and `OAUTH_ISSUER` default to addresses under `CONNECTION_BASE_URL`. Error responses
are the same in every environment.

## 2. The reverse proxy

The proxy must:

- serve the domain over HTTPS: outside development the sign-in cookie is `Secure`, and the
  browser only allows copying to the clipboard on secure pages;
- forward every request for the domain, every path, to the frontend's nginx on port 80;
- add the address it received the connection from to `X-Forwarded-For`. A proxy that passes a
  client's own `X-Forwarded-For` on unchanged lets the client choose the address that
  `SERVICEBW_ALLOWED_CIDRS` checks.

The compose file publishes no port, so the proxy reaches nginx in one of two ways.

**(a) The proxy runs in a container** attached to the stack's network. Docker Compose names it
`<project>_default`, where the project is the name of the directory that holds
`docker-compose.prod.yml` (for a clone in `konnekt/`, `konnekt_default`) unless `-p` or
`COMPOSE_PROJECT_NAME` names another. Start the stack (step 4) so that the network exists, then
attach the proxy's container to it, as an external network in the proxy's own compose file or
with `docker network connect konnekt_default <proxy container>`. The proxy forwards to
`http://frontend:80`.

**(b) The proxy runs on the host itself.** Write a small override file of your own, for example
`docker-compose.host.yml` beside the compose file, and don't commit it. It publishes nginx on
the loopback interface only:

```yaml
services:
  frontend:
    ports:
      - '127.0.0.1:8080:80'
```

Name both files in every `up`:

```bash
docker compose -f docker-compose.prod.yml -f docker-compose.host.yml up -d --build
```

The proxy forwards to `http://127.0.0.1:8080`.

## 3. `TRUSTED_PROXY_CIDRS`

It holds the address the proxy's connections arrive from, as nginx sees them, and nothing else:
a range that includes a client lets that client name any address in `X-Forwarded-For`. Never
put the proxy's or Docker's addresses into `SERVICEBW_ALLOWED_CIDRS`.

- In (a), the proxy container's address on the stack's network, read after it is attached:

  ```bash
  docker inspect <proxy container> --format '{{(index .NetworkSettings.Networks "konnekt_default").IPAddress}}'
  ```

- In (b), the network's gateway: Docker's port forwarding connects to nginx from there. Read it
  after the first start:

  ```bash
  docker network inspect konnekt_default --format '{{range .IPAM.Config}}{{.Gateway}}{{end}}'
  ```

  Every connection to `127.0.0.1:8080` from the host arrives from this address, so only the
  proxy should use that port.

Docker picks the network's range when it creates the network, so these addresses differ from
host to host and can change when the network or the proxy's container is created again
(`docker compose down` removes the network). When the address changes, nginx no longer trusts
the proxy and serviceBW gets `403`. Read it again after such a change, or fix the range in an
override file of your own, so that the gateway stays put (in (a), the proxy's own compose file
can then give it a fixed `ipv4_address`):

```yaml
networks:
  default:
    ipam:
      config:
        - subnet: <a private range no other network on the host uses>
```

After changing the value in `.env`, apply it with `up -d` (with the override file in (b)); it
starts nginx again with the new value.

nginx also limits requests per client address, as `TRUSTED_PROXY_CIDRS` resolves it: the sign-in
(`/api/auth/login`) to 30 a minute with a queued burst of 5, client registration
(`/api/oauth/register`) to 10 a minute with a burst of 20, and the rest of `/api/oauth/` to 60 a
minute with a burst of 60. Beyond that it answers `429` itself. Behind a proxy, set
`TRUSTED_PROXY_CIDRS` even without serviceBW: without it every request seems to come from the
proxy, so all clients share one limit: 30 sign-ins a minute for everyone together.
Details: [ARCHITECTURE.md](ARCHITECTURE.md#sign-in-doit-team-members), "Sign-in (DO.IT team
members)".

## 4. Start

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

The backend runs `alembic upgrade head` on every start, so the database schema is migrated
automatically. `docker compose -f docker-compose.prod.yml ps` shows when every service is
healthy, and `docker compose -f docker-compose.prod.yml logs frontend` shows whether the
allow-list is open and from how many ranges `X-Forwarded-For` is trusted.

## 5. The first account

Create it in the backend container; the command asks for the password twice:

```bash
docker compose -f docker-compose.prod.yml exec backend uv run --no-sync python -m app.cli create-user <username>
```

`--no-sync` runs the command in the environment the image installed, without installing
anything first. `set-password` and `delete-user` run the same way ([ACCOUNTS.md](ACCOUNTS.md)).

## 6. Backups

The database lives in the volume `postgres-data` (on the host `<project>_postgres-data`).
`docker compose -f docker-compose.prod.yml down -v` and `docker volume rm` delete it, and with
it every account and connection. Back it up yourself, for example with a daily dump:

```bash
docker compose -f docker-compose.prod.yml exec -T postgres pg_dump -U postgres -Fc konnekt_db > konnekt_db-$(date +%F).dump
```

To restore a dump, stop the backend first, restore, and start it again:

```bash
docker compose -f docker-compose.prod.yml stop backend
docker compose -f docker-compose.prod.yml exec -T postgres pg_restore -U postgres -d konnekt_db --clean --if-exists < konnekt_db-<date>.dump
docker compose -f docker-compose.prod.yml up -d
```

A dump holds the accounts' password hashes and the stored requests: keep it as safe as the
database. The presentation configurations live in EUDIPLO, and its backups are the business of
whoever runs it.

## Updating

Pull the new version and run step 4 again (with the override file in (b)). The backend migrates
the database when it starts. The frontend, backend and MCP server are built and started
together, and can't be rolled back independently. A new version may migrate the database, so
take a dump before an update.
