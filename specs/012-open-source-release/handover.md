# Handover: publishing Konnekt

For the mentor at Digital Product School. These are the steps the team cannot take itself, in
the order to take them. Each step says when it is due and what "done" looks like.

Two repositories appear below. **The existing repository** is the private one this work was done
in; it stays private. **The new repository** is `DigitalProductschool/konnekt`; it receives the
rewritten history and is the one made public. Where a command needs the existing repository's
address, it says `<existing-repository-url>`: you and the user know it.

The history is rewritten once, by the user, with the runbook
`specs/012-open-source-release/history-rewrite.md`: it removes four pictures from every commit
and pushes the result to the new repository. Steps 1 and 2 come before that; steps 6 to 8 after.

## 1. Create the new repository

**When**: now, before the merge; the user needs it for the history rewrite.

- Create `DigitalProductschool/konnekt` **empty** (no README, no licence, no `.gitignore`) and
  **private**.
- Give the user **write (push) access** to it. The user needs nothing more: read access to the
  existing repository, which they have, and push access to the new, empty one. No forced push and
  no write access to the existing repository's `main` are needed. You can also run
  `history-rewrite.md` yourself.
- Why the existing repository stays private: a rewrite does not reach what GitHub keeps there.
  The pull request that added the four pictures still shows them under "Files changed",
  `refs/pull/*` cannot be pushed over, and the old commits stay fetchable by their hash.
  GitHub's support removes only sensitive data such as credentials, not pictures.
- What stays reachable in the existing repository, for whoever has access to it: every pull
  request with its description, reviews, comments and images, the consent statements, the review
  bot's output, the Actions runs' logs and artefacts, the deployment records, and the old commits
  with the four pictures. None of it is copied to the new repository.

**Done when**: `DigitalProductschool/konnekt` exists, is private and empty, and the user has
confirmed that they can push to it. After the user has run `history-rewrite.md`, its `main`
holds the rewritten history.

## 2. Answer the one open question

**When**: before the first consent statement is posted.

Must the contributors' consent statements be visible in the public repository?

- **No** (the default): they are posted on this spec's pull request in the existing repository
  and stay private with it.
- **Yes**: the pull request with `LICENSE` is opened in the new repository instead, before anyone
  posts, so that the statements are public with it.

**Done when**: the user has your answer in writing, and the statements are posted where it says.

## 3. Delete the merged branches

**When**: after the merge, before step 5 (an archived repository is read-only).

In the existing repository, delete these 21 branches, all merged into `main`: the 18 that the
audit of 2026-11-20 found,

`bug-fix`, `ngnix-cve`, `favicon`, `pdf-summary`, `ui-fixes`, `010-revamp-backend-gaps`,
`de-lang`, `ci`, `new-design`, `mcp`, `formid-to-description`, `save-exit`, `rules-tests`,
`rules-check`, `rules`, `figma-audit`, `fix-node`, `phase6-7`

and the three merged since (2026-11-24): `german-copy-user-tests`, `login-welcome-motion`,
`new-visuals`. Then delete `opensource`, this work's branch, once its pull request is merged.
`tmp-german` is not merged and is not part of this list. On the branches page,
or in one command:

```bash
git push <existing-repository-url> --delete bug-fix ngnix-cve favicon pdf-summary ui-fixes \
  010-revamp-backend-gaps de-lang ci new-design mcp formid-to-description save-exit \
  rules-tests rules-check rules figma-audit fix-node phase6-7 german-copy-user-tests \
  login-welcome-motion new-visuals opensource
```

**Done when**: `git ls-remote --heads <existing-repository-url>` lists none of these 22 names.

## 4. Detach infrastructure, connectors and the review bot

**When**: after the merge, before step 5.

In the existing repository's settings, remove the deployment platform's GitHub App and every
other installed app or connector, the review bot, the webhooks and the deploy keys. Detaching
the deployment app stops deployments from this repository; what happens to the running instance
is step 9. Install none of them on the new repository.

**Done when**: in the existing repository, "GitHub Apps" lists no installation with access to
it, "Webhooks" and "Deploy keys" are empty, and the deployment platform no longer lists it as a
source; the new repository has no app installed.

## 5. Archive the existing repository

**When**: after steps 3 and 4, and after the user has run `history-rewrite.md`.

Archive it in its settings ("Danger Zone"); keep it private. It keeps its pull requests, its
logs and the consent statements.

**Done when**: the existing repository shows the banner "This repository has been archived" and
its visibility is still "Private".

## 6. Protection rules for `main` in the new repository

**When**: after the user's first push to the new repository, before it is public.

Add a rule for `main` that blocks force pushes and deletion and takes changes only through a pull
request. Under "Actions", "General", keep the workflow permissions read-only (the CI declares
`contents: read` and needs nothing more) and do not allow GitHub Actions to create or approve
pull requests.

**Done when**: the rule for `main` is active, a forced push to `main` is refused, and the
workflow permissions read "Read repository contents and packages permissions".

## 7. Close issues and pull requests

**When**: before the new repository is public.

The README's status banner says: not actively maintained, pull requests and issues closed,
contact `hello@dpschool.io`. In the new repository's settings, under "Features", turn off
Issues, and Wiki, Discussions and Projects with them; turn off pull requests, or limit them to
collaborators, where GitHub offers it. A pull request that is opened anyway is closed with a
pointer to `CONTRIBUTING.md`.

**Done when**: a visitor who is not a collaborator sees no Issues tab and cannot open an issue or
a pull request (or every opened one is closed with that pointer).

## 8. A tag on the published commit

**When**: after the user's push, before the new repository is public.

Tag the commit that `main` points to in the new repository; the name is yours (for example
`v1.0.0`). It must be the rewritten commit, not one from the existing repository. In a clone of
the new repository:

```bash
git tag -a v1.0.0 -m "Konnekt as published under the EUPL-1.2" origin/main
git push origin v1.0.0
```

**Done when**: `git ls-remote --tags https://github.com/DigitalProductschool/konnekt` shows the
tag, and it points to the same commit as `main`.

## 9. The hosted instance

**When**: at publication, at the latest.

Once the code is public, anyone can read the hosted instance's host names and set-up in the
history, and its weak points in the bug records. Decide one of the two:

- **Shut it down**, and delete its data.
- **Keep it**, with its own EUDIPLO tenant and trust list, a strong password on every account,
  and `SERVICEBW_ALLOWED_CIDRS` empty (or only serviceBW's own ranges). A redeploy from the new
  repository meets the rename: the application connects to the database `konnekt_db`, which the
  existing data volume does not hold; carry the data over with the README's backup and restore
  steps, or start empty.

**Done when**: either the instance no longer answers and its data is deleted, or the four
conditions above hold and the user has confirmed a sign-in on the redeployed instance.

## 10. Make the new repository public

**When**: last, after steps 1 to 9.

The CI scans only what is pushed, so run the secrets scan once more over the whole history, in a
fresh clone of the new repository:

```bash
gitleaks git --log-opts=--all
```

No credential was found by the audits, so there is nothing to rotate. Then change the new
repository's visibility to public.

**Done when**: the scan reports no leaks, and `https://github.com/DigitalProductschool/konnekt`
opens without signing in, showing the README's status banner.
