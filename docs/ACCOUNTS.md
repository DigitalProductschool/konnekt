# Accounts

DO.IT team members sign in to Konnekt with personal accounts. Konnekt has no account
management: the operators manage accounts with the command-line tool, run from `backend/`
(prefix it with `docker compose exec backend` when the backend runs in Docker):

```bash
uv run python -m app.cli create-user <username>   # asks for the password twice
uv run python -m app.cli set-password <username>  # also ends the account's sign-ins
uv run python -m app.cli delete-user <username>   # also deletes its sign-ins
```

Usernames are stored in lowercase and have 3 to 100 characters from `a–z 0–9 . _ -`.
Passwords need at least 12 characters. A sign-in lasts `LOGIN_SESSION_HOURS` (8 hours).
The sign-in screen's "Forgot password?" page asks team members to contact an administrator,
who sets a new password with `set-password`.

In production the commands run in the backend container, with `--no-sync`:
[DEPLOYMENT.md](DEPLOYMENT.md#5-the-first-account). How accounts and sign-ins are stored is in
[ARCHITECTURE.md](ARCHITECTURE.md#sign-in-doit-team-members).

To start over without losing the accounts, `clear-connections` deletes every form connection
with its revisions, branches, rule sets, document requests and agents' approval requests. It
shows the row counts and asks before deleting (`--yes` skips the question):

```bash
docker compose exec backend uv run python -m app.cli clear-connections
```

It first deletes the EUDIPLO session of every request that still has one, so that no shared
document stays in EUDIPLO after its request is gone (FR-020). If EUDIPLO isn't configured or a
deletion fails, it deletes no row and says how many sessions are left; run it again once EUDIPLO
answers. The EUDIPLO configurations hold no personal data and stay in EUDIPLO.
