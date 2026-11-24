# Publish Konnekt as open source under the EUPL-1.2 (spec 012)

## Summary

The repository becomes ready to be published as `DigitalProductschool/konnekt` under the
EUPL-1.2. Spec, plan, research and evidence: `specs/012-open-source-release/`.

- **Licence**: `LICENSE` (the Commission's English EUPL-1.2 text, byte for byte) and
  `LICENSE.de`, alone in the first commit.
- **One name**: the product, the packages (`@konnekt/*`), the databases, the agents' plugin and
  the MCP server are called Konnekt everywhere.
- **Terms**: licence fields in every `package.json` and in `backend/pyproject.toml`, `NOTICE.md`,
  `REUSE.toml` with `LICENSES/`, the served third-party notices and a REUSE job in the CI.
- **Public face**: the README's status banner and copyright notice, `SECURITY.md`,
  `CONTRIBUTING.md`, a deployment without DPS's infrastructure, and the specs and bug records
  scrubbed of the team's hosts, ids and paths.
- **Security**: the four weaknesses publication would expose are fixed with tests (security
  headers on every answer, a sign-in throttle, limits on client registration, a clearer consent
  page), plus one-line configuration fixes.

## Consent statements

Every contributor posts the statement below before this pull request is merged. Nothing is merged
until all of them are here, and everything is merged by **27.11.2026**, the last day the
statements cover.

**Who posts it**

- Samuele Musiani, the author of the commits.
- Vrinda Pasrija, the designer: designs, UI copy, the logo, the icons' compositions and the
  visuals, through Figma.
- Amber Rafique, the product manager: the UI copy with the designer.
- Digital Product School, for the template the repository started from: posted by the mentor.

**How to post it**

1. Open the tab "Files changed" of this pull request and find the file `LICENSE`.
2. Add a comment on the file `LICENSE` (the comment button in the file's header, or on its first
   line).
3. Paste the statement and fill in your full name, your GitHub handle, the place and the date.

**The statement**

The statement is the mentor's text, word for word, with these filled in: the repository
`DigitalProductschool/konnekt`, contributions "up to and including 27.11.2026", and the notice
"Copyright 2026 Team Faro, Batch#27, Digital Product School". It is posted only as the comments
on `LICENSE`; this file does not repeat it.

**The licence the statements refer to**

`LICENSE` is the first commit of this pull request and never changes afterwards: no later commit
touches it. Its SHA-256 is
`6fc9e709ccbfe0d77fbffa2427a983282be2eb88e47b1cdb49f21a83b4d1e665`. Anyone can check it with
`sha256sum LICENSE`.

## After the merge

The mentor's steps are in `specs/012-open-source-release/handover.md`: the new repository, the
branches, detaching the existing repository and archiving it, the protection rules, the tag and
the hosted instance. The history is rewritten once, before anything is public, by
`specs/012-open-source-release/history-rewrite.md`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
