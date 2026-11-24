# Feature Specification: Publish the repository as open source under the EUPL-1.2

**Feature Branch**: `opensource` (the worktree's branch; feature directory
`specs/012-open-source-release/`; no branch was created for this feature)

**Created**: 2026-11-20

**Status**: Draft

**Input**: User description: "We are planning to make this repo open source. My mentor for the
project suggested the following steps […]" (the mentor's eleven steps, quoted in Context, plus
"add everything that would make sense before making this open source"; the decisions the user took
on 2026-11-20 are under Clarifications)

## Context

This is a release and compliance spec, not a product feature. What a team member, a citizen or
an agent meets in Konnekt changes in four places only: one link on the Account page, the
plugin's and the MCP server's name, the illustrations with the sign-in page's new look
(FR-018; built outside this spec as the bug record `new-visuals`), and the four security
fixes that the review found necessary before the code is public (FR-037). The spec's artefacts are `spec.md`
(this file), `research.md` (the audit records, which are also the evidence of what was checked)
and `tasks.md` (the ordered work). It has no data model, no contracts and no Figma work.

The repository is private today, at `DigitalProductschool/batch27-faro`. The mentor at Digital
Product School (DPS) makes it public after the team has done the following, quoted in short:

1. Confirm the licence-compliant use of KERN (EUPL-1.2): no pasted and edited KERN component
   source, no rules copied out of `kern.css`, no patches to the packages.
2. Decide on the product and package naming and make it consistent across the monorepo; rename
   the repository, with "batch27-faro" remaining only in the copyright line as the team's name.
3. List all copied material (snippets, fonts, icons, images, datasets) with source and licence,
   and remove or replace anything without clear terms.
4. Add `LICENSE` in the root with the official English EUPL-1.2 text from the European
   Commission; a German version may sit beside it as `LICENSE.de`.
5. Set `"license": "EUPL-1.2"` in `frontend/package.json`; `"private": true` stays.
6. Set `license = "EUPL-1.2"` and `license-files = ["LICENSE"]` in `[project]` of
   `backend/pyproject.toml`.
7. Add the copyright notice to the README: "Copyright 2026 Team Faro, Batch#27, Digital Product
   School. Licensed under the EUPL-1.2."
8. Optionally add `SPDX-License-Identifier: EUPL-1.2` to source files.
9. Open a pull request on which the other team members post their consent statements, as
   comments on the `LICENSE` file.
10. Add `NOTICE.md` listing what ships under other terms: KERN, the Fira Sans font, psycopg
    (LGPL-3.0), a sentence that all other dependencies are under permissive licences, and the two
    commands that regenerate the full lists.
11. Public-facing files: a status banner on top of the README (not actively maintained, pull
    requests and issues closed, `hello@dpschool.io` as the contact for contributions or a
    takeover), the README without DPS-infrastructure parts such as Coolify and the Spec Kit
    instructions (the specs themselves may stay), `SECURITY.md` (no security updates, where to
    report anyway) and `CONTRIBUTING.md` (contact first, contributions accepted under EUPL-1.2).

Afterwards the mentor detaches the repository from DPS's infrastructure, connectors and review
bot, checks the protection rules and makes it public.

A survey of the repository on 2026-11-20 found what the list does not name, and each point is a
requirement below: three names in use (`connection-portal`, Konnekt, "serviceBW ↔ EUDI Wallet
Middleware") and leftovers of the DPS template; a link to the old repository in the UI; bundled
material beyond the list (Fira Mono, Material Symbols icons, a third KERN package, Spec Kit's
files, a table derived from Unicode data); illustrations, two test images and code lists without
a recorded source; internal host names, local paths and Figma file keys in `specs/` and
`.specify/bugs/`; and a `license-files` pattern that resolves inside `backend/`, where no
`LICENSE` exists.

## Clarifications

### Session 2026-11-20

- Q: Which name? → A: **Konnekt**, everywhere. The repository becomes
  `DigitalProductschool/konnekt` (final: the mentor, 2026-11-24), the packages
  `@konnekt/api-types`, `@konnekt/rules`, `@konnekt/mcp` and `@konnekt/frontend`, the root package
  `konnekt`, the backend project `konnekt-backend`, the agents' plugin and its marketplace
  `konnekt`, the databases `konnekt_db` and `konnekt_db_test`. The browser's storage key prefix
  `connection-portal:local-draft:v1:` stays, so that stored local drafts survive (FR-012).
  *Superseded on 2026-11-24: the storage keys are renamed too (session "no old name left").*
- Q: Is the git history published? → A: Yes, as it is. The author addresses in it become public,
  which the user accepts. A finding that only a rewrite could remove is escalated, not rewritten
  (FR-031).
- Q: Do `specs/` and `.specify/bugs/` stay? → A: Yes, scrubbed of internal host names, the tenant
  name, local and scratchpad paths and Figma file keys; the screenshots under `.specify/bugs/` are
  deleted unless someone has looked at each (FR-033, FR-034).
- Q: Per-file SPDX headers (step 8)? → A: No headers. One `REUSE.toml` in the root declares the
  licence and the copyright for every file, with the other terms for the third-party files
  (FR-006). Headers would touch about a thousand files, among them generated files and migrations
  that must not be edited.

### Session 2026-11-20, after the audits

These answers follow the five audits ([research.md](research.md)) and take precedence over the
session above where they differ.

- Q: Is `LICENSE.de` kept byte for byte? → A: No. Its whitespace is normalised so that the commit
  hooks leave it alone; its words are unchanged (research R1). `LICENSE` stays byte-identical.
- Q: Are the Figma files' keys scrubbed? → A: No. The files are access-controlled, so the keys in
  the repository are accepted (FR-033).
- Q: Is the pasted connection ID a problem? → A: No. That connection is deleted on the hosted
  instance; the ID is still replaced in the tree with the rest of the scrub.
- Q: The author addresses in the history, the pull requests' texts and the workflow logs? → A:
  Accepted for the history's author addresses. The pull requests and logs are no longer
  published: see the session of 2026-11-21.
- Q: Who contributed without committing? → A: The designer, Vrinda Pasrija, and the product
  manager, Amber Rafique (FR-008). The DPS mentor confirmed that the template may be published
  under the EUPL-1.2.
- Q: Where do the pictures without a recorded source come from? → A: `portrait.jpg` and
  `signature.jpg` were generated with an AI image tool by the team. The star artwork (four PNGs)
  comes from a third party's website that states no terms for reuse; what happens to it is in
  the session of 2026-11-21 (FR-018). Plus Jakarta Sans is only in the history and is
  named in `NOTICE.md` under its open font licence.
- Q: Where do the design's values come from? → A: The designer: "We used Kern Design from Figma
  Community and themed/modified it in our own copy." The wording about the KERN Revamp is not
  confidential and stays; the Figma Community file is a source to attribute (FR-020).
- Q: Are `FS-20417` and `wallet.stuttgart.de` real? → A: No, both are invented and stay.
- Q: Who is the plugin's owner? → A: Team Faro, not the city's team; the history is not changed
  for it (FR-015).
- Q: Which findings of the security review are fixed? → A: The four that block publication, with
  tests; one-line configuration fixes among the low ones; the rest is named in `SECURITY.md`
  (FR-037). Coolify's pull-request previews are handled by the team outside the repository.
- Q: "Batch#27" or "batch#27"? → A: "Batch#27", in the README's notice and in the consent
  statement alike.
- Q: Does the consent statement need a sentence about code written with an AI assistant? → A:
  No; "my own work" holds as it is.
- Q: The screenshots under `.specify/bugs/`? → A: The audit looked at each: eight show only the
  project's UI with invented data and stay; the blank one is deleted (FR-034).
- Q: The MCP server's own name? → A: `konnekt`, with the plugin (FR-015).
- Not asked of this spec: whether the repository is archived, and the branch `tmp-german`.

### Session 2026-11-24, no old name left

These answers take precedence over every session in this section where they differ, also over
the 2026-11-21 sessions below.

- Q: Do the browser's storage keys keep the old prefix? → A: No. No old name stays anywhere in
  the tree. Everything is redeployed, so the keys become `konnekt:local-draft:v1:` and
  `konnekt:language:v1` without a migration: drafts and language choices stored under the old
  keys are simply no longer read (FR-012). The plugin's variable `CONNECTION_PORTAL_MCP_URL`
  becomes `KONNEKT_MCP_URL`, and "Connection Portal" in the earlier specs and bug records becomes
  "Konnekt" (FR-013, FR-014).
- Q: This spec's own files, which describe the rename? → A: They keep the old names while the
  work runs, since the tasks read them, and are cleaned last: the old names, the old
  repository's name and the checkout's paths replaced by neutral words (T041). After that the
  search finds nothing anywhere.
- Q: Are the old names also replaced in the git history? → A: No. The rewrite removes only the
  star artwork (FR-044); the commits before the rename keep the names they had.
- Q: The README's paragraph for an installation from before the rename? → A: Dropped
  (FR-016): everything is redeployed. A team member who installed the plugin before follows the
  README's plugin steps again.

### Session 2026-11-21, the star artwork

These answers take precedence over both sessions above where they differ.

- Q: Does the star artwork stay? → A: No. The four PNGs are replaced by the designer's new
  visuals (FR-018). These change more than the pictures: eight pictures take the four's place,
  the sign-in page is rebuilt and the not-found page is redrawn. They are therefore built
  outside this spec, as the bug record `.specify/bugs/new-visuals/`; this spec checks the
  result and records who made the pictures. The user states that they are entirely the
  designer's own work; she is on the consent list (FR-008). `NOTICE.md` and `REUSE.toml` get no exception for the old artwork.
- Q: Does the old artwork stay in the history? → A: No. The four files are removed from every
  commit before publication, by one rewrite that the user runs last (FR-044). Nothing else is
  removed: the author addresses, the pasted connection ID and the Plus Jakarta Sans file stay.
- Q: What else does the rewrite change? → A: Every commit gets a new hash and loses its
  signature, since 292 of the 293 commits are signed and a rewritten commit cannot keep its
  signature. The last commit's tree is the same before and after.
- Q: Is the existing repository still the one that is made public? → A: No (the mentor,
  2026-11-24). On GitHub a rewrite does not reach the pull request that added the files, nor
  the commits that stay fetchable by hash, and GitHub's support removes only sensitive data
  such as credentials. The rewritten history is therefore pushed into a new repository,
  `DigitalProductschool/konnekt`, and that one is published; the existing one stays private
  with its pull requests and its logs, and nothing rewritten is pushed to it (research R11).
- Q: Is the repository's name final? → A: Yes, `DigitalProductschool/konnekt` (the mentor,
  2026-11-24). The consent statement carries it and can be posted.
- Q: Where are the consent statements posted? → A: On this spec's pull request in the existing
  repository, which stays private. Whether they must also be visible in the public repository
  is the one question left with the mentor; it stops no work.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Anyone can tell under which terms they may use the repository (Priority: P1)

A developer at another city finds the repository. Within the README's first screen they read
that it is licensed under the EUPL-1.2 and who holds the copyright. The licence's text is in the
root. For every file, including the fonts, icons and pictures that came from elsewhere, they can
find out whose it is and under which terms, and nothing in the repository is there without such
terms. Everyone who contributed has agreed to the publication in writing.

**Why this priority**: Without it the repository cannot be published at all. It is the mentor's
steps 1, 3 to 10, and the reason for the others.

**Independent Test**: Take any file of the repository and answer "whose is it, under which
licence, and where does it say so" from `LICENSE`, `NOTICE.md` and `REUSE.toml` alone; run the
automated check that no file is without that answer; count the consent statements on the pull
request against the list of contributors.

**Acceptance Scenarios**:

1. **Given** the published repository, **When** a visitor opens its root, **Then** `LICENSE`
   holds the Commission's English EUPL-1.2 text unchanged, `LICENSE.de` the German one, and the
   README states the copyright notice in the mentor's words.
2. **Given** any file of the repository, **When** the licence check runs, **Then** it names a
   licence and a copyright holder for that file, and the texts of all licences it names are in
   the repository.
3. **Given** a font, an icon, a picture, a code list or a copied file, **When** the visitor looks
   it up in `NOTICE.md`, **Then** they find its source and its licence, or the file is no longer
   in the repository.
4. **Given** the pull request of this spec, **When** it is merged, **Then** every person on the
   contributors' list (FR-008) has posted the consent statement on the `LICENSE` file, and
   `LICENSE` is byte for byte the file they commented on.
5. **Given** the three KERN packages, **When** the visitor reads `research.md`, **Then** each of
   the mentor's three claims (no pasted component source, no copied rules, no patches) has a
   verdict with its evidence, and every exception is either attributed or rewritten.

---

### User Story 2 - Nothing that must stay private becomes public (Priority: P1)

On the day the repository is made public, a stranger can read every file on every branch and
every commit behind them. They find no credential that works anywhere, no person's data that the
person did not agree to publish, no address of DPS's or the city's systems, and no weakness that
was safe only as long as the code was private.

**Why this priority**: Publication cannot be undone: what was public once must be taken as
copied. It is as much a condition as the licence.

**Independent Test**: Run the secret scan over the full history of all branches; run the search
for the scrub patterns of `research.md` over the tree; read the security review's list of
findings that block publication and check each is closed.

**Acceptance Scenarios**:

1. **Given** the full history of every branch that will exist at publication, **When** the secret
   scan and the manual review are done, **Then** every finding is recorded as a placeholder, a
   documented development default or a rotated credential, and none is open.
2. **Given** the working tree, **When** it is searched for the internal host names, the tenant
   name and local and scratchpad paths, **Then** only the allowlisted lines remain (FR-035).
3. **Given** the security review, **When** its findings are sorted, **Then** every finding marked
   as blocking is fixed or, with the mentor's agreement, described in `SECURITY.md` as a known
   limitation.
4. **Given** the branches of the repository, **When** the handover checklist is written, **Then**
   it lists every branch other than `main` with the advice to delete it or the reason to keep it.

---

### User Story 3 - The product has one name (Priority: P2)

A visitor reads "Konnekt" in the repository's name, in the README's title, in the packages'
names, in the UI and in the agents' plugin. The names of the template the code started from and
the working names `connection-portal` and "Connection Portal" appear nowhere in the tree, not
even in the browser's storage keys (Clarifications, 2026-11-24).

**Why this priority**: The mentor's step 2. It comes before the public-facing files and the
consent statement in time, because both carry the name.

**Independent Test**: Search the tree for the old names; the result is the allowlist of FR-013
and nothing else. Run every check of "Before you finish" in `CLAUDE.md`.

**Acceptance Scenarios**:

1. **Given** the renamed repository, **When** the tree is searched for `connection-portal`,
   `community-template`, `template_db`, `batch27` and "Connection Portal" in any case, **Then**
   only this spec's own files match, and after T041 nothing does.
2. **Given** a browser that holds a local draft or a language choice from before the rename,
   **When** the team member opens Konnekt after it, **Then** Konnekt opens as on a first visit,
   without an error: the old entries are no longer read.
3. **Given** the Account page, **When** the team member follows "Installing the plugin", **Then**
   the link leads to the new repository's README.
4. **Given** the rename, **When** the checks run, **Then** the same tests pass as before, and no
   migration or generated file was edited by hand, and no stored identifier changed apart from
   the browser's two storage keys (FR-012).

---

### User Story 4 - A visitor knows the project's status and can run it without DPS (Priority: P2)

The first thing a visitor reads in the README is that the project is not actively maintained,
that pull requests and issues are closed, and whom to write to about a contribution or a
takeover. `SECURITY.md` and `CONTRIBUTING.md` say the same for their subjects. The README then
takes the visitor from a fresh clone to a running system on their own machine and describes a
deployment that needs nothing from DPS.

**Why this priority**: The mentor's step 11. A repository that looks maintained and is not, or
that can only be run on infrastructure the visitor cannot have, misleads.

**Independent Test**: Clone the repository into an empty directory on a machine that has only
the README's prerequisites, follow the README, and reach the sign-in page and a first account
without any other source of information.

**Acceptance Scenarios**:

1. **Given** the README, **When** a visitor opens it, **Then** the status banner is above
   everything but the title, with `hello@dpschool.io` as the contact.
2. **Given** the README and `docs/`, **When** they are searched for Coolify and for instructions
   to install Spec Kit, **Then** none remains, and the deployment section describes the
   production compose file for any Docker host with a reverse proxy.
3. **Given** a fresh clone, **When** the visitor follows "Quick Start", **Then** the system
   starts, and the fake EUDIPLO of the tests or the documented settings are enough to try it.
4. **Given** `SECURITY.md`, **When** someone finds a vulnerability, **Then** they learn that no
   security updates are planned and where to report it anyway.
5. **Given** `CONTRIBUTING.md`, **When** someone wants to contribute, **Then** they learn to
   write first, and that contributions are accepted under the EUPL-1.2 only.

---

### User Story 5 - The mentor can publish with a checklist (Priority: P3)

The mentor receives one list of what is left for them: what to detach, which branches to delete,
what else of the repository's GitHub content becomes public, what to tag, and the open questions
with the team's recommendation.

**Why this priority**: The team cannot do these steps, but only the team knows what they are.

**Independent Test**: The mentor reads `handover.md` and can act on every line without asking
what it means.

**Acceptance Scenarios**:

1. **Given** the merged pull request, **When** the mentor opens `handover.md`, **Then** it lists
   the steps of FR-043 in the order to do them, each with what "done" looks like.

---

### Edge Cases

- **A secret is found in the history.** The history stays (Clarifications), so the secret is
  rotated and recorded as rotated. If it cannot be rotated (a person's data, a third party's
  confidential text), work stops on that point and the user and the mentor decide; the spec does
  not rewrite history on its own.
- **Nobody knows where a picture or a list came from**, or its maker does not answer before
  27.11.2026. It is replaced by one the team makes or by material with clear terms, or removed;
  the UI must still be complete and meet the design's layout without it.
- **A rule turns out to be copied from `kern.css`**, or a file from a KERN package. Both are
  EUPL-1.2, so it may stay with its source, version and licence named at the block and in
  `NOTICE.md`; or it is rewritten as an override.
- **A dependency is not under a permissive licence** and is not on the mentor's list. It is named
  in `NOTICE.md`, and the closing sentence says only what the scan shows.
- **`LICENSE` would have to change after the first consent statement** (a wrong byte, a line
  ending). It must not: the file is checked against the Commission's text before the pull request
  is opened, and its checksum is recorded.
- **A contributor cannot be reached or declines.** Their contributions are listed from the
  history, and the mentor decides with the team whether they are rewritten or removed.
- **Files that cannot carry a header**: generated fixtures, JSON, fonts, pictures, migrations.
  `REUSE.toml` covers them without touching them.
- **An installation that exists** has a database named `template_db` and an installed plugin
  named `connection-portal`. The README says in one place what its operator does after the
  rename; nothing is renamed silently under a running installation.
- **Work after 27.11.2026.** The consent statements cover contributions up to and including that
  day. Anything merged later needs a new statement from its author.
- **Old links to `batch27-faro`.** GitHub forwards them after a rename, but the repository's own
  files point to the new name.

## Requirements *(mandatory)*

### Functional Requirements

#### Licence and copyright

- **FR-001**: The root MUST hold `LICENSE`, the European Commission's official English text of
  the EUPL-1.2, unchanged, and `LICENSE.de`, its official German text. `research.md` records
  where each was downloaded and its SHA-256.
- **FR-002**: `LICENSE` MUST be added in the first commit of the pull request and MUST NOT change
  afterwards.
- **FR-003**: Every `package.json` of the workspace (the root, `api-types/`, `rules/`,
  `frontend/`, `mcp/`) MUST state `"license": "EUPL-1.2"` and keep `"private": true`.
- **FR-004**: `backend/pyproject.toml` MUST state `license = "EUPL-1.2"` and `license-files` in
  `[project]`. The pattern resolves inside `backend/`: a copy of the licence text MUST be there,
  identical to the root's, and the backend MUST still install and build, locally and in its
  images.
- **FR-005**: The README MUST carry the notice "Copyright 2026 Team Faro, Batch#27, Digital
  Product School. Licensed under the EUPL-1.2." with a link to `LICENSE`.
- **FR-006**: One `REUSE.toml` in the root MUST declare the licence and the copyright holder of
  every file: the project's terms by default, and the third-party terms for each file or folder
  that `NOTICE.md` lists. The texts of all licences it names MUST be in `LICENSES/`. No source
  file gets a header for this. The REUSE check MUST pass, and MUST run in the CI and be
  documented with the other checks.
- **FR-007**: Images built from the repository SHOULD contain the licence and the notice file.

#### Consent

- **FR-008**: `research.md` MUST list every contributor: the authors and co-authors of all
  commits on all branches, and the people who contributed designs, pictures, texts or other
  material without committing, by asking the team. The author of the template's initial commit
  counts, through DPS.
- **FR-009**: The pull request's description MUST hold the consent statement in the mentor's
  words, with the repository's new name, the date 27.11.2026 and the copyright notice filled in,
  and the instruction to post it as a comment on the `LICENSE` file with the GitHub handle,
  place and date.
- **FR-010**: The pull request MUST NOT be merged before every listed contributor has posted the
  statement, and all work of this spec MUST be merged by 27.11.2026.

#### Name

- **FR-011**: The names MUST be those of the Clarifications. The README's title is "Konnekt",
  with the line that it is the middleware between serviceBW forms and the EUDI Wallet. The
  template's leftovers (`community-template-frontend`, the backend project's name `backend` and
  its description, `template_db`) MUST be gone.
- **FR-012**: The rename MUST NOT change an identifier that is stored or sent: the browser's
  storage keys, cookie names, database tables and columns, migrations, identifiers registered
  with EUDIPLO, the API's paths, the environment variables' names, the MCP tools' names.
  `research.md` lists the occurrences of the old names by kind before anything is renamed, and
  any exception to this rule is decided there. Generated files change only through their
  generator. *Exception (Clarifications, 2026-11-24)*: the browser's two storage keys and the
  plugin's variable `CONNECTION_PORTAL_MCP_URL` take the new name, without a migration.
- **FR-013**: After the rename, a search for the old names (`connection-portal`,
  `community-template`, `template_db`, `batch27-faro`, `batch27`, and "Connection Portal" in any
  case) MUST return nothing outside this spec's own files; once T041 has cleaned those, it MUST
  return nothing at all (Clarifications, 2026-11-24).
- **FR-014**: The earlier specs and bug records are renamed with the rest, so that the paths they
  name exist; a note at the top of `specs/` says that the records were updated to the current
  names after the fact, without naming the old ones (Clarifications, 2026-11-24).
- **FR-015**: The Account page's link to the plugin's installation MUST point to the new
  repository, and every instruction that names the repository or the plugin (the README, the
  MCP guidance, the marketplace file) MUST use the new names; the MCP server's own name becomes
  `konnekt`, and the marketplace's owner Team Faro. The MCP guidance's tests MUST pass.
- **FR-016**: *Withdrawn on 2026-11-24* (Clarifications): everything is redeployed, so the
  README has no paragraph for an installation from before the rename. A team member who
  installed the plugin before follows the README's plugin steps again.

#### Third-party material

- **FR-017**: `research.md` MUST hold the inventory of everything in the repository that the
  team did not make: fonts, icons, pictures, code lists and other data, copied or generated
  files, pasted text and code, with path, source, licence, evidence and verdict. It also covers
  files that are only in the history.
- **FR-018**: Material without clear terms at 27.11.2026 MUST be replaced or removed from the
  tree. This names the star artwork (four PNGs from a third party's website): it is
  replaced by the designer's new visuals, built as the bug record `new-visuals`; the UI stays
  complete, and
  `research.md` records who made the new files, with what and from what. The code lists' and
  name pools' sources are recorded or the lists are replaced by ones with a documented source.
- **FR-019**: `research.md` MUST give a verdict with evidence for each of the three KERN claims.
  Every exception MUST be attributed at its place and in `NOTICE.md`, or rewritten.
- **FR-020**: `NOTICE.md` MUST list what ships under other terms than the project's, each with
  its name, version where it has one, licence in its exact name, and source: the three KERN
  packages with their repositories; the fonts the repository bundles and those that arrive with
  KERN; the icons taken from Material Symbols and from KERN; psycopg and what its binary package
  bundles; Spec Kit's files; the data derived from Unicode; every dependency the scan finds under
  a licence that is not permissive; and KERN's design file on Figma Community, from which the
  designer derived the design's values, with the terms that file states.
- **FR-021**: `NOTICE.md` MUST end with a sentence about the remaining dependencies that is true
  according to the scan, and the two commands that regenerate the full lists, one for the npm
  workspace and one for the backend. Both commands MUST work on a fresh clone and change no
  tracked file.
- **FR-022**: `NOTICE.md` MUST say that serviceBW, EUDI Wallet, KERN and the City of Stuttgart's
  names belong to their owners and that the project is not endorsed by them.
- **FR-023**: If the frontend's built files drop the notices that the bundled packages' licences
  require, the build MUST keep them or write them into a file that is served with the app.

#### Public-facing files

- **FR-024**: The README MUST open, directly under its title, with the status banner: not
  actively maintained, pull requests and issues closed, `hello@dpschool.io` for contributions or
  a takeover.
- **FR-025**: The README and `docs/` MUST NOT describe DPS's infrastructure: no Coolify, no
  preview deployments on DPS's domain, no instructions to install Spec Kit. The deployment
  section describes the production compose file for any Docker host behind a reverse proxy that
  provides HTTPS, with every setting it needs. The compose file itself MUST work without
  variables that only Coolify provides.
- **FR-026**: The README MUST still say that the specs in `specs/` record how the project was
  built, in one sentence, with a link to Spec Kit.
- **FR-027**: `SECURITY.md` MUST say that no security updates are planned, where to report a
  vulnerability anyway, and the known limitations the security review leaves (FR-037).
- **FR-028**: `CONTRIBUTING.md` MUST repeat the rule to write first and say that contributions
  are accepted under the EUPL-1.2 only.
- **FR-029**: The files for agents (`CLAUDE.md`, `.specify/memory/constitution.md`, the MCP
  guidance) MUST agree with the renamed and rewritten repository: names, commands, the new check
  and the new files.

#### What must stay private

- **FR-030**: The secret scan MUST run over the full history of all branches and over the tree,
  and a manual review MUST read what the scan cannot judge: pasted logs and commands in `specs/`
  and `.specify/bugs/`, the settings' defaults, the examples of the environment files.
  `research.md` records each finding without its value.
- **FR-031**: A credential found anywhere MUST be rotated before publication, whether or not it
  is still in the tree. A finding that only a rewrite of the history could remove is brought to
  the user and the mentor; the spec rewrites history only for FR-044.
- **FR-032**: The tree MUST NOT name real people other than the contributors in the places they
  agreed to, and MUST NOT hold a real person's picture or data in test material.
- **FR-033**: The tree MUST be scrubbed of the team's hosts and their tenant, addresses of real
  systems, the names of the team's other projects, and local and scratchpad paths, by scripted
  replacements with placeholders that keep the text readable. This covers `specs/`,
  `.specify/bugs/`, the README, `docs/`, the environment files' examples and the tests' fixtures.
  `research.md` holds the patterns and replacements. The Figma files' keys stay
  (Clarifications).
- **FR-034**: The screenshots under `.specify/bugs/` MUST be deleted, unless each was looked at
  and shows only the project's own UI with invented data.
- **FR-035**: After the scrub, a search for the patterns of FR-033 MUST return only an
  allowlist in `research.md`, each line with its reason.
- **FR-036**: Text that reproduces others' non-public material (serviceBW's documentation, the
  city's internal information, standards' text) MUST be flagged in `research.md` and removed or
  reduced to what is public, by the user's decision.
- **FR-037**: A security review MUST read the code as a stranger would. Findings that put an
  installation at risk once the code is public MUST be fixed before publication; the others are
  recorded, and those that stay are named in `SECURITY.md`.

#### Verification and handover

- **FR-038**: Every check of "Before you finish" in `CLAUDE.md` MUST pass after the changes,
  with no test removed or weakened.
- **FR-039**: A fresh clone into an empty directory MUST start by the README's "Quick Start"
  alone, with nothing from DPS's infrastructure, and the production compose file MUST build.
- **FR-040**: The links of the README, `NOTICE.md`, `SECURITY.md`, `CONTRIBUTING.md` and
  `docs/` MUST resolve, the internal ones in the tree and the external ones on the web.
- **FR-041**: The CI MUST be fit for a public repository: read-only permissions, no secrets, no
  workflow that runs a fork's code with the repository's rights.
- **FR-042**: `research.md` MUST record, per audit, what was checked, how, when, and what was
  not checked.
- **FR-043**: `handover.md` in the feature directory MUST list for the mentor, in order: the
  new repository `DigitalProductschool/konnekt`, created empty and private, with push access for
  the user (FR-044); the one open question, whether the consent statements must be visible in
  it; deleting the listed merged branches; detaching infrastructure, connectors and the review
  bot; archiving the existing repository, which stays private; the new repository's protection
  rules; closing issues; a tag on the published commit; and what happens to the hosted
  instance, whose weak points the bug records describe.
- **FR-044**: Before publication the star artwork MUST be removed from the history: the four
  files' contents, and any other file of the history that reproduces the artwork, are in no
  commit of any branch or tag that is published. The rewrite is one scripted step, written down
  in `history-rewrite.md` and rehearsed on a copy beforehand. The user runs it once, after
  everything else is merged, and checks it: none of the removed objects exists, the last
  commit's tree is unchanged, the number of commits is unchanged, `LICENSE` has its checksum.
  The rewritten history is pushed into the new repository only. What a rewrite cannot reach
  (the existing repository's pull requests, commits fetchable by hash, other people's clones)
  is named in `handover.md`: the existing repository stays private for that reason.

### Key Entities

- **Contributor**: a person whose work is in the repository, by commit or otherwise; has a
  GitHub handle and a consent statement.
- **Third-party item**: a file or part of one that the team did not make; has a path, a source,
  a licence, evidence and a verdict (clear, to attribute, unknown, to replace).
- **Finding**: something an audit found; has a place, a kind, a severity and a remedy, and for a
  secret never its value.
- **Allowlist line**: an occurrence of an old name or a scrub pattern that stays; has its place
  and its reason.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For 100 % of the repository's files, the licence check names a licence and a
  copyright holder.
- **SC-002**: The inventory of third-party material has no item with an unknown source at
  publication and none without a licence, and the star artwork is in no published commit
  (FR-018, FR-044).
- **SC-003**: Every contributor on the list has posted the consent statement before the merge;
  the count of statements equals the count of contributors.
- **SC-004**: The search for the old names returns nothing at all (FR-013, after T041); the
  searches for the scrub patterns return only allowlisted lines, and that allowlist has fewer
  than 20 lines.
- **SC-005**: The secret scan over the full history reports no open finding, and no credential
  that ever appeared in the repository still works.
- **SC-006**: No finding of the security review marked as blocking is open at publication.
- **SC-007**: A person with only the README gets from a fresh clone to the sign-in page in under
  30 minutes, downloads included, without asking anyone.
- **SC-008**: A first-time visitor finds the project's status, its licence and the contact
  address within the first screen of the README.
- **SC-009**: The same number of tests passes after the changes as before, and the product
  behaves as before for a team member, a citizen and an agent, apart from the changes the
  Context names.
- **SC-010**: The mentor needs no further question to the team to carry out the handover list.

## Assumptions

- The mentor's steps are the requirements' source; where the survey shows a step cannot work as
  written (the `license-files` pattern) or is incomplete (the notice list, the single
  `package.json`), the spec says what achieves the step's purpose.
- The user decided for `REUSE.toml` (Clarifications); the mentor had offered the headers as
  optional. The root's `LICENSE` and the copy in `LICENSES/` are the same text.
- The team's name is written "Batch#27" everywhere, also in the consent statement, whose text
  from the mentor has "batch#27" (Clarifications).
- The mentor decided on 2026-11-24: the repository's name `DigitalProductschool/konnekt` is
  final, and it is a new repository that receives the rewritten history (FR-044). One question
  is left with the mentor and stops no work: whether the consent statements must be visible in
  the public repository (Clarifications, 2026-11-21).
- The README and the documentation keep describing the City of Stuttgart's DO.IT team as the
  product's users; only the plugin's owner changes to Team Faro.
- Creating the new repository, its settings on GitHub and its publication are the mentor's.
  The existing repository's pull requests, issues and workflow logs stay private with it; the
  audits did not read them.
- The implementation runs in a session of its own, started by the user: `tasks.md` and
  `research.md` must be enough for it without this session's conversation.
- The history is rewritten once, only to remove the star artwork (FR-044). The user accepts that
  the commits' author addresses become public.
- Out of scope: new features, changes of behaviour, translating the documentation, publishing
  packages or images, and maintaining the project after publication.
- Git works in this checkout only with `GIT_DIR=/home/debian/batch27-faro/worktrees/opensource`
  and `GIT_WORK_TREE=/home/debian/batch27-faro/opensource`; no task commits, the user does, on
  another machine.
- The browser's storage keys take the new name (Clarifications, 2026-11-24): local drafts and
  language choices stored before the rename are no longer read, which the user accepts because
  everything is redeployed.
