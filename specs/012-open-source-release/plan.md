# Implementation Plan: Publish the repository as open source under the EUPL-1.2

**Branch**: `opensource` (the worktree's branch; feature directory
`specs/012-open-source-release/`, which `setup-plan.sh` resolved from `.specify/feature.json`) |
**Date**: 2026-11-20 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/012-open-source-release/spec.md`, and the five
audits of 2026-11-20 (KERN, copied material, dependency licences, secrets and confidentiality,
security review), recorded with the decisions taken on them in [research.md](research.md).

**Note**: git works in this checkout only with the two environment variables that tasks.md's
"Notes" name; no task commits, the user does, on another machine. This plan has no
`data-model.md`, no `contracts/` and no `quickstart.md`: the spec changes no data and no
interface, and its verification is phase E below.

## Summary

The repository is made ready to be published under the EUPL-1.2 by 27.11.2026, the last day the
contributors' consent statements cover. Five things happen, in this order, because each later one
carries the result of the earlier ones:

1. **The licence text first** (done): `LICENSE` is in the root, byte-identical to the
   Commission's text (R1). It is the first commit, alone, so that the pull request can be opened
   and the consent statements collected while the rest is built.
2. **The rename to Konnekt** (R7): one scripted change over the whole tree, by one agent with
   nothing else in flight, because it touches about 330 files. Stored and sent identifiers stay,
   except the browser's storage keys and the plugin's variable (user, 2026-11-24: no old name
   anywhere; this spec's own files are cleaned last, T041).
3. **Four parallel work packages on files that don't overlap**: licence metadata and `REUSE.toml`
   with the notices (R1 to R4, R9); the public-facing files (R10); the scrub of specs and bug
   records (R5); the security fixes (R6).
4. **The files for agents and the handover** (`CLAUDE.md`, the constitution, the MCP guidance,
   `handover.md`, the pull request's text), once everything they describe exists.
5. **Verification** on a fresh clone, with the searches and checks of FR-038 to FR-041.

## Technical Context

**Language/Version**: unchanged: Python 3.13 (`backend/`), TypeScript with React 19 and Vite 8
(`frontend/`), Node 22+ (`mcp/`), PostgreSQL 18.

**Primary Dependencies**: none added to any package. Two tools run without being declared, as
gitleaks does today: `reuse` (the REUSE check, R9) in the CI and by hand, and the two licence
listers of `NOTICE.md` (R4), which run through `npx` and `uv run --with` and change no tracked
file.

**Storage**: one new table if the sign-in throttle is stored (R6); otherwise none. No existing
table, column or migration changes. The databases' default names change (`konnekt_db`,
`konnekt_db_test`); everything is redeployed, so the README has no step for an existing
installation (FR-016, withdrawn 2026-11-24).

**Testing**: the existing gates (Ruff, mypy, pytest, ESLint, Prettier, Vitest, the build), plus
tests for the four security fixes, plus the REUSE check as a new CI job.

**Target Platform**: unchanged. The production compose file loses what only Coolify provides
(R10).

**Project Type**: web application in an npm workspace with a Python backend; this spec is a
release.

**Performance Goals**: none.

**Constraints**: `LICENSE` never changes after its commit (FR-002). No stored or sent identifier
changes (FR-012), apart from the browser's storage keys and the plugin's variable (amended
2026-11-24). Generated files change only through their generators, and migrations are never
edited. Everything is merged by 27.11.2026 (FR-010). No secret value, full connection id, session
id or Figma key is written into any file of this feature. The history is rewritten once, by the
user, only to remove the star artwork, after everything is merged and before anything is public
(FR-044); no phase rewrites this checkout.

**Scale/Scope**: about 330 files in the rename, about 40 in the scrub, about 25 new or rewritten
files otherwise.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Verdict | How this plan meets it |
|---|---|---|
| **I. Contract parity** | Pass | No request or response shape changes. If the sign-in throttle or the registration limit answers a new status (`429`), it uses the `{error, message}` envelope with `Text(en, de)`, and `api-types/src/` gets nothing new because no body changes. The OAuth endpoints keep their RFC bodies. |
| **II. Sync persistence** | Pass | The security fixes use the synchronous `Session` and plain `def` handlers. |
| **III. Quality gates** | Pass | Every phase ends with the gates. The rename is accepted only with the same tests passing as before. The REUSE check becomes a CI job and is documented with the others. The hooks are not bypassed: `LICENSE.de` was normalised so that the whitespace hook leaves it alone (R1). |
| **IV. Declared dependencies and config** | Pass | No dependency is added. A new setting (a throttle's limits, the two variables that replace Coolify's) is a field on `Settings` or a documented compose variable, and goes into the `.env.example` files, the README and ARCHITECTURE. The lockfiles are regenerated by npm and uv, never edited. |
| **V. Reviewed schema evolution** | Pass | No existing migration is touched, also not by the rename (allowlisted, R7). A new table comes with a new, read migration. |
| **Structure constraints** | Pass | No package is added or moved; the packages keep their import directions under their new names, and the ESLint boundaries are renamed with them. |
| **Workflow** | Pass with one note | The constitution itself says "this template"; FR-029 brings it in line with the renamed repository, as a patch amendment in phase D. |

No violation; Complexity Tracking stays empty.

## Project Structure

### Documentation (this feature)

```text
specs/012-open-source-release/
├── spec.md
├── plan.md              # this file
├── research.md          # R1–R11: the audit records and decisions
├── tasks.md             # /speckit-tasks
├── handover.md          # phase D: the mentor's list (FR-043)
├── pr.md                # phase D: the pull request's text with the consent statement (FR-009)
└── checklists/requirements.md
```

### Source Code (repository root)

```text
LICENSE                  # done (R1)
LICENSE.de               # done, whitespace-normalised (R1)
LICENSES/                # new: every licence text REUSE.toml names (R9)
REUSE.toml               # new (R9)
NOTICE.md                # new (R2–R4)
SECURITY.md              # new (R6)
CONTRIBUTING.md          # new
README.md                # banner, copyright, names, deployment, no Coolify, no Spec Kit install
CLAUDE.md                # names, the new check, the new files
package.json, package-lock.json, tsconfig.base.json, eslint.config.mjs
.claude-plugin/marketplace.json
.github/workflows/ci.yml # the REUSE job; database names
.pre-commit-config.yaml  # only if a hook must skip a third-party file
docker-compose.yml, docker-compose.prod.yml
api-types/, rules/       # package names; imports
backend/
├── LICENSE              # copy of the root's (R1)
├── pyproject.toml, uv.lock
├── .env.example
├── Dockerfile, Dockerfile.dev
├── app/                 # config.py (database name, settings), routers/auth.py, routers/oauth.py,
│                        # services/ (the throttle, the registration limits), models.py
├── alembic/versions/    # one new migration if the throttle is stored; none edited
└── tests/
frontend/
├── package.json, Dockerfile*, nginx.conf, nginx/, vite.config.ts
└── src/                 # imports; index.css (attribution comments); pages/Account/constants.ts
│                        # (the link); pages/Authorize/ (the consent page); assets/ (provenance)
mcp/
├── package.json, Dockerfile*, vite.config.ts
├── src/                 # imports; server.ts (the server's name); guidance.test.ts
└── plugin/              # plugin.json, .mcp.json, README.md, skills/
docs/                    # ARCHITECTURE.md, EUDIPLO.md, KERN-DESIGN-SYSTEM.md, FIGMA-WORKFLOW.md
specs/, .specify/        # names, the scrub, the note of FR-014
```

**Structure Decision**: no directory is added except `LICENSES/`. The work is split by file
ownership, below, so that sessions can run side by side without touching the same file.

## Phases and file ownership

Each phase ends with the gates of `CLAUDE.md`, "Before you finish". A phase starts only when the
one before it has passed them. Inside phase C the packages run in parallel; each owns its files
and touches no other package's.

| Phase | Package | Owns | Requirements | Tasks |
|---|---|---|---|---|
| **A** | The licence texts | `LICENSE`, `LICENSE.de` (done) | FR-001, FR-002 | T001–T003 |
| **B** | The rename | Every file that holds an old name, once, by script; the lockfiles by npm and uv; `specs/README.md` | FR-011 to FR-015 | T004–T006 |
| **C1** | Licence metadata and notices | `backend/LICENSE`, `LICENSES/`, `REUSE.toml`, `NOTICE.md`, the five `package.json` files, `backend/pyproject.toml`, the lockfiles, `.github/workflows/ci.yml`, `frontend/public/`, `frontend/scripts/`, `frontend/src/index.css` and `docs/KERN-DESIGN-SYSTEM.md` (attribution only), `frontend/src/assets/` | FR-003 to FR-006, FR-017 to FR-023 | T007–T014 |
| **C2** | Public-facing files | `README.md`, `SECURITY.md`, `CONTRIBUTING.md`, `docs/ARCHITECTURE.md`, `docs/EUDIPLO.md`, `docker-compose.prod.yml` | FR-005, FR-016, FR-024 to FR-028, the scrub of these files (FR-033) | T015–T020 |
| **C3** | The scrub | `specs/001`–`011`, `.specify/bugs/`, the two test files research R5 names | FR-032 to FR-036 | T021–T023 |
| **C4** | Security fixes | `frontend/nginx.conf`, `frontend/nginx/`, `backend/app/` (auth, OAuth, settings, models, schemas), `backend/alembic/versions/` (new file only), `backend/tests/`, `backend/.env.example`, `frontend/src/pages/Authorize/`, the Dockerfiles, `docker-compose.yml` | FR-037, FR-007 | T024–T028 |
| **D** | Agents' files and handover | `CLAUDE.md`, `.specify/memory/constitution.md`, `mcp/plugin/` texts, `handover.md`, `pr.md`, and the documentation of what phase C added | FR-009, FR-029, FR-043 | T029–T034 |
| **E** | Verification | `verification.md`, the allowlists in `research.md` | FR-038 to FR-042, SC-001 to SC-010 | T035–T039 |
| **F** | The history rewrite, prepared | `history-rewrite.md`, one sentence in `specs/README.md`; the rewrite itself is the user's, last, outside this checkout | FR-044 | T040 |

Notes on the split:

- **B runs alone.** It is one script, kept outside the repository and described in research R7:
  ordered replacements with the allowlist excluded, then `npm install` and `uv lock` for the
  lockfiles, then the generators for the generated fixtures if any holds a name. Nothing else is
  open while it runs, and it is the only package that touches every folder.
- **C1 and C2 both concern the README's copyright notice.** C2 owns the README and writes the
  notice; C1 writes `NOTICE.md`, which the README links.
- **C2 and C3 share the scrub's patterns** (R5) and split it by file ownership.
- **C4 is the only package that changes behaviour.** Each fix comes with its test, and the
  README's and ARCHITECTURE's sentences about it are handed to phase D, which owns no code.
- **The consent pull request is open from phase A on.** `pr.md` is drafted in phase D, but the
  statement's text is in the spec's Context and can be posted as soon as the user opens the
  pull request.

## What waits for people

None of these stops phases B to E; each has a fallback in research's "Open points":

- The mentor: creating the new repository and giving push access to it. Decided on 2026-11-24:
  the name `DigitalProductschool/konnekt` is final, and it is a new repository that receives the
  rewritten history (research R11, "The history rewrite"); the existing one stays private. Open:
  whether the consent statements must be visible in the public repository. The star artwork is
  decided: replaced (T014) and removed from the history (FR-044).
- The user: the rewrite itself, last. The new visuals are in `main` since 2026-11-24 (the bug
  records `new-visuals` and `login-welcome-motion`); T014 checks and records the result.
- The team: the consent statements of the three contributors and DPS, by 27.11.2026.

The implementation runs in a session of its own, started by the user. `tasks.md` and
`research.md` carry everything it needs; nothing of the planning session's conversation is
assumed.

## Complexity Tracking

No violations.
