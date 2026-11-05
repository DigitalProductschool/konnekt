# Bug Verification: A draft's details highlight the wrong step in the progress bar

- **Slug**: draft-view-stepper
- **Tested**: 2026-11-05
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: verified

## Summary

The bug no longer reproduces in a browser. "View" on a draft saved in any of the four steps now
shows Publish as the current step, with `aria-current="step"`. Only the steps up to the stored step
are ticked, and only those are links. The full frontend suite, lint and build pass, and the editor's
own progress bar is unchanged.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Reproduction (post-fix), draft saved in documents | In Chrome via Playwright: sign in, new connection, Continue to Documents, "Save and exit", then "View" on the overview | pass | Connection ✓, Documents ✓ (links); Rules, Test to do (no link); **Publish current** with `aria-current="step"`. Before the fix, Rules was current |
| Reproduction (post-fix), drafts saved in connection, rules, test | Drafts created through `POST /api/form-connections/drafts` (the call "Save and exit" makes) with `step` set, then "View" on the overview | pass | All four rows match `fix.md`'s table exactly (see excerpts) |
| Done steps lead to the flow | On the rules draft's details, click "Documents, done" | pass | Opens `/form-connections/:id/edit` at "Add documents" |
| Unreached steps aren't links | On the documents draft's details, list the focusable elements in `nav[aria-label="Steps"]` and click the Rules step | pass | Only "Connection, done" and "Documents, done" can take focus; clicking Rules does nothing |
| Editor regression (no `reached`) | "Continue" on the rules draft, then "Connection, done" in the editor's progress bar | pass | Rules current with Connection and Documents done; after going back, Connection current and the rest to do, as before the fix |
| Published details regression (`ConnectionDetails`) | Browser check | not-run | Publishing needs EUDIPLO, an external service, and the dev database's published connections belong to accounts whose passwords weren't available. Covered by the unit case `current = reached = 5`. `ConnectionDetails.tsx` passes no `reached`, so `stepStateOf(i, 5, 5)` gives what the old `stateOf(i, 5)` gave |
| New / updated tests | `npx vitest run src/components/WizardProgress src/pages/FormConnectionDetail` | pass | 2 files, 22 tests |
| Regression suite | `npm test` | pass | 61 files, 2730 tests. The timing tests that failed under load during `/speckit-bug-fix` passed here (load average ≈ 3) |
| Formatting | `npx prettier --check` on the changed files | pass | |
| Lint / type-check | `npm run lint`; `npm run build` (`tsc -b && vite build`) | pass | Only the existing chunk-size warning |
| Browser console | Playwright console log for the session | pass | No React errors or warnings. The only errors are the expected `401` on `/api/auth/me` before sign-in and three `400`s from a malformed payload in my first API attempt |
| Backend (Ruff, mypy, pytest) | `git status --short` | skipped | No backend file changed: the diff is five frontend files, two new ones and the spec contract. `.git` points to a worktree path on another machine, so git ran with `GIT_DIR=/home/debian/batch27-faro/worktrees/save-exit` and `GIT_WORK_TREE` set to the checkout |

The browser check ran against a throwaway database (`draft_stepper_check`, migrated to head, with
a temporary account), with the backend's worker off. Afterwards the database was dropped and both
servers were stopped. The dev database (`template_db`) wasn't touched.

## Output Excerpts

Progress bar on each draft's details, as read from the DOM (`done` = tick, `[link]` = button,
`[aria-current]` = `aria-current="step"`):

```text
connection: Connection:done[link] | Documents:todo | Rules:todo | Test:todo | Publish:current[aria-current]
documents:  Connection:done[link] | Documents:done[link] | Rules:todo | Test:todo | Publish:current[aria-current]
rules:      Connection:done[link] | Documents:done[link] | Rules:done[link] | Test:todo | Publish:current[aria-current]
test:       Connection:done[link] | Documents:done[link] | Rules:done[link] | Test:done[link] | Publish:current[aria-current]
```

Editor, unchanged behaviour:

```text
Continue (rules):       Connection:done[link] | Documents:done[link] | Rules:current[aria-current] | Test:todo | Publish:todo
Back to Connection:     Connection:current[aria-current] | Documents:todo | Rules:todo | Test:todo | Publish:todo
```

```text
npm test   →  Test Files  61 passed (61)   Tests  2730 passed (2730)
targeted   →  Test Files  2 passed (2)     Tests  22 passed (22)
build      →  ✓ built in 1.44s
```

## Residual Risks

- A published connection's details weren't checked in a browser (no EUDIPLO here). The risk is low:
  the component passes no `reached`, the default is `current`, and a unit case covers it.
- Three of the four drafts were created through the API, not by clicking through the wizard. The
  stored row is the same, and the details page only reads `draft.step`. The documents draft went
  through the full UI flow.
- Grey to-do bars between blue ones are an interim look, as agreed. Figma has no design for a
  draft's progress yet.
- Unrelated to this fix: Chrome computes a done step's accessible name as "Documents , done", with
  a space before the comma, from the `kern-sr-only` suffix in the unchanged `WizardStep.tsx`.
  Screen readers usually ignore it.

## Recommendation

Close the bug: verified end-to-end in a browser for every step a draft can be saved in, with the
full frontend suite, lint and build passing. When Figma has a design for a draft's progress, revisit
the look of the unreached steps, as `fix.md`'s follow-ups say.
