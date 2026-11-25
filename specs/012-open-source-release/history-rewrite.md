# The history rewrite: runbook

This runbook removes four pictures, the star artwork, from every commit of `main` and pushes the
result into the new repository `DigitalProductschool/konnekt`, the one that is made public. Only
the user runs it (or the mentor, if they prefer), once, after everything is merged into `main`
and before anything is public. It needs no knowledge of this feature's other documents: every
command is written out, in the order to run it.

Two repositories appear below. **The existing repository** is the private one the work was done
in; it stays private and receives nothing rewritten. **The new repository** is
`DigitalProductschool/konnekt`. Where a command needs the existing repository's address, it says
`<existing-repository-url>`: the mentor and the user know it.

Run every command in `bash`, in one terminal. If the terminal closes between steps, go back into
the working clone and restore the noted values with `. ../rewrite-noted.txt` (step 3 writes it).

## What is removed

The four files' contents, by object ID. Each path had exactly one version in the whole history,
added by `48fb277` (2026-11-08) and deleted from the tree by `320728d`; the new visuals that
replaced them are `.webp` files under other names.

| Object ID | File |
|---|---|
| `27f50dd49ece474eb385266a7f60dcaf507d4d9d` | `frontend/src/assets/illustrations/login-art@2x.png` |
| `04ddbc085f557cb8139edd25b16946090bcf230d` | `frontend/src/assets/illustrations/wallet-star@2x.png` |
| `c04e0e40a340dc714f86585586ac4e033c83b921` | `frontend/src/assets/illustrations/published-art@2x.png` |
| `d932b5ab1c2a697195d8316766595d1f9a237bcc` | `frontend/src/assets/illustrations/published-art-grey@2x.png` |

The objects are named by ID, not by path. Never use `--invert-paths --path …` instead: it would
also remove any later file that kept one of the old names.

Every other picture of the history was looked at on 2026-11-24 (all branches, 97 picture
objects): the nine screenshots under `.specify/bugs/` (one of them entirely white), the two
test images of `backend/scripts/issue_test_credentials/` (a placeholder portrait and a drawn
signature line), the 68 icons under `frontend/src/assets/icons/`, the six SVGs under
`frontend/src/assets/illustrations/` (logos, favicons, the success tick, a grid of 703 dots) and
the eight `.webp` visuals (chain links and a folder). None of them reproduces the star
artwork, so the list holds these four objects only.

## What it changes, said plainly

- **New hashes and a new signature from `48fb277` on.** The commits from the one that added the
  pictures onwards get a new hash and are signed with the key of whoever runs this runbook. On
  2026-11-24 that was 105 of the 301 commits of `main`; after the release's pull request is
  merged there are a few more. The 196 commits before `48fb277` never held the pictures: they
  keep their hash and their signature. On 2026-11-24, 300 of the 301 commits were signed; after
  the rewrite every commit of `main` is.
- **Nothing else changes.** Authors, committers, dates, messages, parents (and so the merges)
  stay as they were, and the last commit's tree is unchanged: the files of `main` are
  byte-identical.
- **GitHub's merge commits show as "Unverified".** 16 of the rewritten commits are merge
  commits that GitHub made (on 2026-11-24; one more if the release's pull request is merged with
  a merge commit). They keep GitHub as their committer, so GitHub shows the runner's signature
  on them as "Unverified". The user accepted this on 2026-11-24.
- **Cited hashes.** The specs, the bug records and the commit messages cite the hashes of the
  history before the rewrite. Those of commits before `48fb277` still resolve in the new
  repository; the later ones do not. On the rehearsal, 61 distinct cited hashes resolved to a
  commit before the rewrite, 32 of them commits before `48fb277`; after it, exactly those 32
  resolved. `--preserve-commit-hashes` keeps the commit messages as they were written: without
  it, the tool would replace the hashes cited in five lines of two messages by those of its own
  result, which the signing step then changes again, so they would cite commits that exist
  nowhere.
- **Only before publication.** Run after the new repository is public, the rewrite no longer
  removes anything from GitHub or from anyone's copy, and it breaks every clone.

## Why the existing repository stays private

Nothing rewritten is pushed to the existing repository (decided 2026-11-24), because a rewrite
does not reach what GitHub keeps there. Pull request #158, which merged `48fb277`, still shows
the four pictures under "Files changed"; its `refs/pull/*` cannot be pushed over; and the old
commits stay fetchable by their old hashes. GitHub's support removes sensitive data such as
credentials, not pictures. So the existing repository stays private and is archived (handover,
step 5), and only the new repository is published.

## 1. Before you start

All of these must be true:

- Everything is merged into `main` of the existing repository: the release's pull request, the
  new visuals (they are in since 2026-11-24) and the record of the artwork's replacement.
- The consent statements on the release's pull request are counted (research R8).
- Nobody holds unpushed work: every branch that matters is merged or pushed. Work based on the
  old history cannot simply be pushed to the new repository later (step 11).
- The mentor has created the new repository `DigitalProductschool/konnekt` **empty** (no README,
  licence or `.gitignore`) and **private**, and you have push access to it (handover, step 1).
- Your signing key is at hand, and `git config user.signingkey` prints it. It must be set: the
  signing step commits under each commit's original committer (GitHub's merge commits
  included), so git cannot choose the key from your own email address. With a passphrase, keep
  `gpg-agent` or `ssh-agent` running, or you are asked once per commit (about 106 times).
- The tools: git 2.36 or newer; [uv](https://docs.astral.sh/uv/), whose `uvx` runs
  git-filter-repo 2.47.0 without installing it; gitleaks 8.30.1, the version that
  `.github/workflows/ci.yml` pins (job "Secrets: gitleaks"). On Linux x64, as the CI does:

```bash
curl -fsSL -o gitleaks_8.30.1_linux_x64.tar.gz \
  https://github.com/gitleaks/gitleaks/releases/download/v8.30.1/gitleaks_8.30.1_linux_x64.tar.gz
echo "551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb  gitleaks_8.30.1_linux_x64.tar.gz" \
  | sha256sum --check --strict
tar -xzf gitleaks_8.30.1_linux_x64.tar.gz gitleaks
```

On another system, take that release's archive for it and compare it against its line in the
release's `gitleaks_8.30.1_checksums.txt`. Put `gitleaks` on your `PATH`. On macOS, use
`shasum -a 256` wherever this runbook says `sha256sum`.

## 2. A fresh clone that holds only `main`

In a new, empty folder:

```bash
mkdir konnekt-rewrite-work && cd konnekt-rewrite-work
git clone --no-tags --single-branch --branch main <existing-repository-url> konnekt-rewrite
cd konnekt-rewrite
```

Check that this is the history the runbook was written for:

```bash
git merge-base --is-ancestor 48fb277 main && echo "48fb277 is in main"
git log --format= --raw --no-abbrev main -- 'frontend/src/assets/illustrations/*.png'
git rev-list --objects main | grep -ciE '\.(png|jpe?g|gif|webp|svg|ico|avif)$'
```

The first prints `48fb277 is in main`. The second prints eight lines, each naming one of the four
IDs above (four with `A`, four with `D`) and no other ID. The third printed 97 on 2026-11-24;
if it prints more, a picture was added since: look at the new ones before going on, and stop if
one shows the star artwork.

## 3. Note the values

```bash
printf '%s\n' \
  27f50dd49ece474eb385266a7f60dcaf507d4d9d \
  04ddbc085f557cb8139edd25b16946090bcf230d \
  c04e0e40a340dc714f86585586ac4e033c83b921 \
  d932b5ab1c2a697195d8316766595d1f9a237bcc > ../star-artwork-ids.txt
git cat-file --batch-check < ../star-artwork-ids.txt

BASE=$(git rev-parse '48fb277^')
TREE=$(git rev-parse 'main^{tree}')
COUNT=$(git rev-list --count main)
REWRITTEN=$(git rev-list --count "$BASE..main")
MERGES=$(git rev-list --merges --count main)
printf 'BASE=%s\nTREE=%s\nCOUNT=%s\nREWRITTEN=%s\nMERGES=%s\n' \
  "$BASE" "$TREE" "$COUNT" "$REWRITTEN" "$MERGES" | tee ../rewrite-noted.txt
git log --format=%cn "$BASE..main" | grep -cx GitHub
```

`git cat-file` prints each ID with `blob`. `BASE` is `f8fb1d75e159eab24bf09ca0da3600239bb16eda`,
the parent of `48fb277`, taken now because `48fb277` itself gets a new hash. The last line counts
GitHub's merge commits among those to be rewritten (16 on 2026-11-24). Keep
`../rewrite-noted.txt` until the end.

## 4. Remove the pictures

```bash
uvx git-filter-repo@2.47.0 --strip-blobs-with-ids ../star-artwork-ids.txt \
  --refs "$BASE..main" --preserve-commit-hashes
```

`--refs "$BASE..main"` limits the rewrite to the commits from `48fb277` on. It ends with
"Completely finished". It needs no `--force` in a clone made as in step 2; if it refuses because
the clone is not fresh, start again at step 2 rather than forcing it. With `--refs` the tool
does not tidy up: this clone keeps its `origin` remote and the four objects (step 10 deletes it).

## 5. Sign the rewritten commits

```bash
FILTER_BRANCH_SQUELCH_WARNING=1 git filter-branch \
  --commit-filter 'git commit-tree -S "$@"' -- "$BASE..main"
```

It re-creates each commit from `48fb277` on with a signature from your key and keeps its
author, committer, dates, message and parents. It ends with `Ref 'refs/heads/main' was
rewritten`. `FILTER_BRANCH_SQUELCH_WARNING=1` only silences git's advice to use git-filter-repo
instead, and the pause that comes with it; git-filter-repo cannot sign. The step adds
`refs/original/`, which holds the unsigned result of step 4 and is never pushed.

## 6. Check before the push

```bash
git rev-list --objects main | grep -F -f ../star-artwork-ids.txt
test "$(git rev-parse 'main^{tree}')" = "$TREE" && echo "tree unchanged"
test "$(git rev-list --count main)" = "$COUNT" && echo "commit count unchanged"
test "$(git rev-list --count "$BASE..main")" = "$REWRITTEN" && echo "rewritten count unchanged"
test "$(git rev-list --merges --count main)" = "$MERGES" && echo "merges unchanged"
git merge-base --is-ancestor "$BASE" main && echo "the commits before the artwork are kept"
git rev-list main | while read -r c; do
  git cat-file commit "$c" | grep -q '^gpgsig' || echo "unsigned: $c"
done
git log --format='%G?' "$BASE..main" | sort | uniq -c
diff <(git log --format='%an %ae %ad %cn %ce %cd%n%B' --date=raw origin/main) \
     <(git log --format='%an %ae %ad %cn %ce %cd%n%B' --date=raw main) \
  && echo "authors, committers, dates and messages unchanged"
git status --short
sha256sum LICENSE
gitleaks git --log-opts=main --redact --verbose --no-banner
```

What each must print:

1. The `grep` prints nothing: no commit of `main` reaches the four objects.
2. The five `echo`s print: the tree, the number of commits, the number of rewritten commits and
   of merges are those noted in step 3, and `BASE` is in `main`, so the commits before the
   artwork are there as they were.
3. The signature loop prints nothing: every commit of `main` carries a signature (it reads the
   commit's `gpgsig` header, so it works whatever key type the older signatures use).
4. The `%G?` line shows only `G` (or `U` for a GPG key your keyring does not trust fully) for the
   `REWRITTEN` commits: your key signed them. For an SSH key, git verifies only with
   `gpg.ssh.allowedSignersFile` set; without it, git prints an error per commit and the line
   shows `N`, and the loop above is the check that counts.
5. `diff` prints nothing, then the `echo`.
6. `git status --short` prints nothing, and `sha256sum LICENSE` prints
   `6fc9e709ccbfe0d77fbffa2427a983282be2eb88e47b1cdb49f21a83b4d1e665`.
7. gitleaks ends with `no leaks found` and exits with 0. It counts the commits without the
   merges, whose changes `git log` does not show.

If any check fails, stop: delete the folder (step 10) and push nothing.

## 7. Push `main` into the new repository

```bash
git remote add new https://github.com/DigitalProductschool/konnekt.git
git push --no-follow-tags new main
```

Push only `main`, by name: never `--all` or `--mirror`, which would also push `origin`'s old
branch and `refs/original/`, both of which still hold the pictures.

## 8. Check after the push

In a fresh clone of the new repository, next to the working clone:

```bash
cd ..
git clone https://github.com/DigitalProductschool/konnekt.git konnekt-check
cd konnekt-check
while read -r id; do
  git cat-file -e "$id" 2>/dev/null && echo "still there: $id"
done < ../star-artwork-ids.txt
git rev-list --all --objects | grep -F -f ../star-artwork-ids.txt
git fsck --full
test "$(git rev-parse origin/main)" = "$(git -C ../konnekt-rewrite rev-parse main)" && echo "same main"
```

The loop and the `grep` print nothing (`git cat-file -e` fails for every ID), `git fsck` reports
no error, and the last line prints `same main`.

Then look at the new repository on GitHub:

- It has one branch, `main`, no tags yet, and as many commits as `COUNT`.
- `https://github.com/DigitalProductschool/konnekt/commit/48fb277` is not found, and
  `https://github.com/DigitalProductschool/konnekt/commit/f8fb1d7` opens: the old commits from
  the artwork on are not there, those before it are.
- `frontend/src/assets/illustrations/` holds no `.png`.
- In the commit list, your rewritten commits show "Verified" if your signing key is in your
  GitHub account; GitHub's merge commits show "Unverified" (above).

## 9. The tag

Tag the commit that `main` points to in the new repository, once: here, or by the mentor as
handover step 8 says (the name is the mentor's to choose, for example `v1.0.0`); agree with the
mentor who does it. In `konnekt-check`:

```bash
git tag -a v1.0.0 -m "Konnekt as published under the EUPL-1.2" origin/main
git push origin v1.0.0
```

## 10. Delete the working clone

The working clone still holds the four pictures (through `origin` and `refs/original/`). Delete
the whole folder, the check clone with it:

```bash
cd ../..
rm -rf konnekt-rewrite-work
```

## 11. Every holder of an old clone

Every clone of the existing repository, on any machine, still holds the pictures. Its holder
deletes it and clones the new repository anew. Do not push from an old clone into the new
repository: a branch based on the old history brings the four files back with it. Whether a
clone still holds them, run inside it:

```bash
printf '%s\n' 27f50dd49ece474eb385266a7f60dcaf507d4d9d 04ddbc085f557cb8139edd25b16946090bcf230d c04e0e40a340dc714f86585586ac4e033c83b921 d932b5ab1c2a697195d8316766595d1f9a237bcc | git cat-file --batch-check
```

A clone that is clean prints `missing` after each of the four IDs; one that prints `blob` holds
the pictures and is deleted.

## Rehearsed

On 2026-11-24, on scratch copies on a team member's machine; nothing in the existing
repository, the local repository or on GitHub was changed. Tools: git 2.47.3, git-filter-repo
2.47.0 through `uvx` (`--version` prints `a40bce548d2c`), gitleaks 8.30.1 (downloaded and
checked against the CI's SHA-256), an ed25519 SSH key made for the rehearsal and deleted after
it.

**Set-up**, which stands for the merged `main`: a `--no-local` clone of the local repository's
`main` (`2d3f0f3`, 301 commits), with the release branch's files as the checkout held them
(committed and uncommitted, 1,188 files, contents and modes identical) added as one unsigned
commit by a neutral author. A second, fresh `--no-local --no-tags --single-branch` clone of that
stood for step 2's clone; in its own configuration `gpg.format ssh`, `user.signingkey` and
`gpg.ssh.allowedSignersFile` named the throwaway key. Steps 3 to 6 ran as written, with
`../rewrite-noted.txt` read back between them; step 7 pushed into an empty bare repository in
scratch (its `HEAD` set to `main`, as GitHub does after the first push), and step 8's commands
ran in a clone of it. Not rehearsed: the look at GitHub, the tag, gitleaks's download on another
system, and a signing key with a passphrase.

**Step 2**: `48fb277 is in main`; the eight lines of the four IDs and no other; 97 pictures.

**Step 3**:

```text
27f50dd49ece474eb385266a7f60dcaf507d4d9d blob 485605
04ddbc085f557cb8139edd25b16946090bcf230d blob 159094
c04e0e40a340dc714f86585586ac4e033c83b921 blob 115426
d932b5ab1c2a697195d8316766595d1f9a237bcc blob 37117
BASE=f8fb1d75e159eab24bf09ca0da3600239bb16eda
TREE=5b19115fdae51d49f4653a473c508c593ec43df5
COUNT=302
REWRITTEN=106
MERGES=44
16
```

302 commits: the 301 of `main` and the rehearsal's own. Signed before: 300 of 302 (the one
unsigned commit of `main`, `09d8b97`, and the rehearsal's commit, both among the 106).

**Step 4**: ran without `--force`; "Parsed 106 commits", "Completely finished after 0.61
seconds". **Step 5**: "Ref 'refs/heads/main' was rewritten"; the working tree clean.

**Step 6**:

```text
tree unchanged
commit count unchanged
rewritten count unchanged
merges unchanged
the commits before the artwork are kept
    106 G
authors, committers, dates and messages unchanged
6fc9e709ccbfe0d77fbffa2427a983282be2eb88e47b1cdb49f21a83b4d1e665  LICENSE
INF 258 commits scanned.
INF no leaks found
```

The objects `grep`, the signature loop, `diff` and `git status --short` printed nothing. Signed
after: 302 of 302 (196 with their old signatures, 106 with the rehearsal key). None of the 106
old hashes is in the new `main`; the 196 before `BASE` are. GitHub is the committer of 16 of the
106. The working clone still held the four objects, as step 10 says.

**Step 7**: `* [new branch] main -> main`; the bare repository held `refs/heads/main` only.

**Step 8**: the loop and the `grep` printed nothing, `git fsck --full` reported no error,
`same main`; the clone counted 302 commits, `sha256sum LICENSE` gave the hash above, and the
bare repository had none of the four IDs. Step 11's command printed `missing` four times there,
and `blob` four times in the set-up clone.

**Cited hashes**: the distinct hexadecimal strings of 7 to 40 characters with at least one digit
and one letter `a`–`f`, taken from `specs/` and `.specify/bugs/` of the last commit and from the
messages of `main`: 404 strings. 61 resolved to a commit (`git rev-parse --verify -q
"<string>^{commit}"`) before the rewrite, 32 of them commits before `48fb277`; after it, in the
clone of the new repository, 32 resolved, exactly those, and no string resolved that had not
before.

**Afterwards**: the set-up clone, the working clone, the check clone, the bare repository and the
key were deleted.
