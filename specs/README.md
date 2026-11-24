# How Konnekt was built

This folder and `.specify/bugs/` record how the project was built, written with
[Spec Kit](https://github.com/github/spec-kit) while the work was done:

- `specs/<number>-<feature>/`: one folder per feature, in the order they were built. Each holds
  the specification (`spec.md`), the plan (`plan.md`), the research and decisions behind it
  (`research.md`), the task list as it was worked through (`tasks.md`) and, where the feature
  needed them, the data model, the contracts, the design notes and the checks that were run.
- `.specify/bugs/<bug>/`: one folder per bug, with its assessment (`assessment.md`), the fix
  (`fix.md`) and its verification (`test.md`).

## Names updated after the fact

On 24.11.2026 the project took its final name, Konnekt. On that date the names in these records
(the packages, the databases, the repository, the product's earlier name and the browser's
storage keys) were updated to the current ones throughout. A record may therefore use a name that
the project did not have yet when the record was written. Everything else in the records is as it
was written.

Before publication the history was rewritten once to remove four pictures
(`012-open-source-release/history-rewrite.md`), which gave the commits from `48fb277` on new
hashes: the commit hashes these records cite are those of the history before the rewrite, so
those of earlier commits still resolve in this repository and the later ones do not (on the
rehearsal, 32 of the 61 cited hashes that resolved before it).
