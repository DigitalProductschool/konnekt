# Quickstart: validating the connection description

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

How to check the change: first the automated checks, then manual scenarios V1–V6 against a running
stack. The shapes are in [contracts/](contracts/), and the data in [data-model.md](data-model.md).

## Prerequisites

- The stack as described in `README.md`, with a team member account and EUDIPLO reachable for
  publishing.
- For V5, the database **before** the migration: on a checkout without this change, create a
  published connection with the form ID `PK-30051`, a stored draft with `FS-20417`, and a local
  draft (start a new connection, type a name, then close the tab).

## Automated checks

```bash
# backend/
uv run ruff check . && uv run ruff format --check .
uv run mypy app/ scripts/ tests/
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5435/konnekt_db_test uv run pytest
#   tests/api/test_form_connections.py        create and update without a description, 501 characters
#                                             refused, spaces stored as '', a description-only
#                                             change creates no revision (FR-002, FR-003, FR-010)
#   tests/api/test_form_connection_drafts.py  draft save and publish without a description
#   The suite migrates its database with `alembic upgrade head`, so the rename runs too

# frontend/
npm run lint && npm test && npm run build
#   pages/FormConnectionEditor/utils.test.ts  validateConnection: empty ok, too long refused
#   pages/FormConnectionList/utils.test.ts    descriptionOf: text, or null when empty
#   utils/localDrafts/*.test.ts               format 2; a format-1 record refused and removed
```

Then search for leftovers. Only `specs/`, the committed migrations and this feature's migration
may still mention the old name:

```bash
grep -rn -i "servicebw_\?form\|formid\|form id" backend/app backend/tests frontend/src docs
```

## Manual scenarios

| # | Steps | Expected | Covers |
|---|---|---|---|
| V1 | New connection: type a name, leave the description empty, choose "Continue", add a document, publish | No error at any step; the connection is published, and its URLs answer as any connection's | US1-AS1, AS2; SC-001 |
| V2 | Open a published connection with a description, clear it, save; call its trigger URL | Saved; same URLs; a request started before still completes | US1-AS3; SC-005; FR-010 |
| V3 | Paste 501 characters through the API (`PUT` with `description`), and type `"   "` in step 1 and save | 400 with `The description can have at most 500 characters.`; the spaces are stored as `''` and shown as nothing | US1-AS4; EC "Only spaces" |
| V4 | Three connections with a short, an empty and a 500-character description; the overview and each details page at 320, 768, 1024 and 1440px | Short: as written, no prefix. Empty: nothing in its place. Long: one line ending in "…"; a screen reader reads the whole text; the name in the details header is not shortened by it | US2; SC-003, SC-004; FR-006 |
| V5 | From the prerequisites: apply the migration, start the new version, sign in | `PK-30051` and `FS-20417` appear as descriptions in the overview, the details and step 1. The old local draft is not offered, and its `localStorage` entry is gone after the overview loads | US3; SC-002; FR-007, FR-009 |
| V6 | Look through every screen of the create, edit and details flows | No "Form ID" anywhere; step 1 says "Description - Optional", and its help text says it's a note for the team that applicants never see | FR-001, FR-004; SC-003 |
