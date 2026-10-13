# Bug Verification: mDL `driving_privileges` arrives as `[{}, {}, {}]`

- **Slug**: mdl-driving-privileges-empty
- **Tested**: 2026-10-13
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: partial

## Summary

The middleware part of the fix holds. Full `driving_privileges` entries pass through unchanged,
and the `[{}, {}, {}]` shape is delivered as it arrives and logs one warning that names only the
key. Nothing else broke. The user-visible symptom is not fixed: it comes from EUDIPLO (≤ 9.1.0),
which this repository does not contain. Until a fixed EUDIPLO is deployed, every mDL share will
still deliver `[{}, {}, {}]`. The live reproduction was not run.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Reproduction (post-fix, live) | Issue a test mDL, share it from a wallet, pull | skipped | Needs a wallet and the hosted EUDIPLO, and nothing in this repo changes that path. Expected to still show `[{}, {}, {}]` until EUDIPLO is fixed |
| Reproduction (library-level, `@owf/cose` round-trip) | Assessment's `cborEncode`/`cborDecode`/`JSON.stringify` snippet | not-run | It shows the bug in EUDIPLO's dependency, which this fix doesn't touch, so a rerun would only confirm the bug is still there |
| Middleware pass-through (automated equivalent) | `uv run pytest tests/unit/test_documents.py -q` | pass | 37 passed. Includes the full AM/B/L entries (with `expiry_date` and nested `codes`), the warning on `[{}, {}, {}]` that names only the key, and 4 shapes that must not warn |
| Regression suite | `DATABASE_URL=…/template_db_test uv run pytest -q` | pass | 514 passed in 96 s (local Postgres on :5435) |
| Lint | `uv run ruff check .` / `uv run ruff format --check .` | pass | All checks passed; 52 files already formatted |
| Type-check | `uv run mypy app/ scripts/ tests/` | pass | No issues in 49 source files |
| Diff review | Read `app/services/documents.py` (`_emptied`, warning at L74–) and the new tests | pass | Matches `fix.md`. `git diff` was unavailable: the worktree's `.git` points to a path on another machine |

## Output Excerpts

```
tests/unit/test_documents.py   37 passed in 2.23s
full suite                     514 passed in 96.01s (0:01:36)
ruff check                     All checks passed!
ruff format --check            52 files already formatted
mypy                           Success: no issues found in 49 source files
```

## Residual Risks

- **The symptom remains in production.** The content is lost in EUDIPLO's
  `MdocverifierService.verify` / `getPrettyClaims`, because a JS `Map` serialises to `{}`. The
  upstream fix (a recursive `Map` normaliser) is not written, filed or deployed yet. "Class B
  since" stays manual until it is.
- The warning makes the problem visible in the logs but doesn't change the value delivered:
  consumers still receive `[{}, {}, {}]`. Delivering `null` instead is still an open decision.
- None of these checks used a real wallet presentation. The tests use entries shaped like the
  assessment's, not a captured credential.
- Still open from the assessment: the wallet app and version, whether the mDL came from
  `issue_test_credentials`, and who operates the hosted EUDIPLO.

## Recommendation

Hold. Don't close the bug. The middleware changes are verified and safe to merge, but the bug's
"Done when" (a pull delivers `[{"vehicle_category_code": "B", "issue_date": "2003-05-12"}, …]`)
can't be met until EUDIPLO is fixed. Next: file the upstream issue and PR
(`eudiplo-fix-prompt.md`), deploy a fixed or patched EUDIPLO, then rerun the live reproduction
(T081 / quickstart V-runs and sk-proto-1 quickstart 12.2). Rerun `/speckit-bug-test` after that
to move this to `verified`.
