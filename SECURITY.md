# Security

Konnekt is not actively maintained, and **no security updates are planned**. Whoever runs it
is responsible for keeping it and its dependencies safe.

## Reporting a vulnerability

If you find a vulnerability anyway, write to `hello@dpschool.io`. Please do not open a public
issue. There is no promise of an answer or a fix.

## Known limitations

These follow from the design or were found in a security review before publication and not
fixed. Read them before deciding to run Konnekt.

1. **serviceBW's connection URLs have no authentication of their own.** Triggering a request
   under `/api/connect/` needs a network position (nginx's allow-list,
   `SERVICEBW_ALLOWED_CIDRS`) and the connection's UUID; pulling the result also needs the
   request's 256-bit reference. The backend on port 3000 checks nothing itself, so whatever
   reaches it directly bypasses the allow-list: another container on the same network, or a
   published port. Whoever can trigger a request can show a citizen a genuine request under
   the operator's verifier identity and pull what the citizen shares.
2. **The allow-list is only as good as two settings.** `TRUSTED_PROXY_CIDRS` must hold the
   reverse proxy's addresses and nothing else: a range that includes a client lets that client
   name any address in `X-Forwarded-For`. `SERVICEBW_ALLOWED_CIDRS` must never hold the proxy's
   or Docker's range. A proxy that passes a client's own `X-Forwarded-For` on unchanged defeats
   the allow-list too.
3. **Triggering is not rate-limited.** Every call creates an EUDIPLO session and a database row
   that is kept seven days.
4. **There is one permission level for people.** Every team member, and every agent from
   "Read only" on, reads every connection with its URLs; every agent from "Read and edit
   drafts" on changes every draft. Accounts are created only with the command-line tool. There
   is no second factor and no account lockout.
5. **Agents read what others wrote.** Connection names, descriptions and rule messages reach an
   agent as tool results, and can try to steer another team member's agent. The approval step
   stands between such an attempt and a published change.
6. **An agent connection made through OAuth has no final expiry** as long as it is used at least
   every `AGENT_CONNECTION_IDLE_DAYS` days.
7. **Request references are stored in plain form** (`document_requests.reference`). Only the
   bundled nginx and uvicorn redact them in their logs; the reverse proxy in front logs whatever
   it is configured to log.
8. **The EUDIPLO client reads every session of its tenant.** Installations that share a tenant
   share that exposure.
9. **The application connects to PostgreSQL as the superuser `postgres`.**
10. **No security updates are planned** (see above).
11. **Smaller findings of the review, not fixed**, each with the fix it would need:
    - `/docs` and `/openapi.json` are public in production, and the API documentation page
      loads its script from `cdn.jsdelivr.net` without an integrity check, on the application's
      origin. Fix: switch the documentation off outside development (`docs_url`, `redoc_url`
      and `openapi_url` set to `None`) and remove both nginx locations.
    - The fetch of an OAuth client's metadata document can reach internal `https://` addresses,
      which allows probing ports on the internal network. Fix: refuse loopback, private,
      link-local and unique-local addresses after resolving the name, and connect to the
      address that was checked.
    - OAuth redirect URIs are checked against a list of refused schemes. Fix: allow only
      `https`, loopback `http` and private-use schemes that contain a dot (RFC 8252, 7.1).
    - The command-line tool's `set-password` leaves the account's agent tokens valid. Fix: also
      delete the account's agent authorizations.
    - The backend allows credentialed cross-origin requests from `http://localhost:5173` in
      production too. Fix: no CORS middleware outside development.
    - The backend container runs as root, and the base images are referenced by tags that move.
      Fix: a non-root `USER` in the image, and base images pinned by digest.
    - The session cookie can probably be overwritten from a sibling subdomain. Fix: the
      `__Host-` prefix with `Path=/`.
    - uvicorn logs an unhandled exception with its message, which may contain data. Fix: a
      filter on the `uvicorn.error` logger that drops the exception details.
    - A new approval request replaces every waiting request for the same connection and action,
      whoever made it. Fix: replace only the requests of the same agent connection.
    - An agent can open any number of MCP sessions, each kept for 30 idle minutes. Fix: a limit
      on open sessions per agent.
    - The answers of the pull URL carry no `Cache-Control: no-store`. Fix: send that header with
      them.
    - Beyond the `frame-ancestors` policy, nginx sends no `Content-Security-Policy`, no
      `Strict-Transport-Security` and no `Referrer-Policy`, and it still sends the obsolete
      `X-XSS-Protection`. Fix: add the three headers (HSTS can also come from the reverse
      proxy) and drop the obsolete one.
