# Bug Fix: The draft conflict names "another team member" when an agent saved

- **Slug**: draft-conflict-wording
- **Fixed**: 2026-11-06
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

The `409 draft_changed` message and the conflict dialog's hint no longer say who saved the draft:
"This draft has been modified since you opened it." and "Reload shows the draft as it was last
saved and drops your changes. …", as spec 007's FR-015 requires, and spec 005's artifacts state
that wording in place.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `backend/app/services/form_connections.py` | modified | `DRAFT_CHANGED_DETAIL.message`; the code `draft_changed` stays |
| `backend/tests/api/test_form_connection_drafts.py` | modified test | `test_saving_an_outdated_version_answers_draft_changed` asserts the new message |
| `frontend/src/pages/FormConnectionEditor/constants.ts` | modified | `DRAFT_COPY.draftChangedHint`: "as it was last saved" instead of "as they saved it"; the button "Replace their changes" is unchanged |
| `frontend/src/pages/FormConnectionEditor/DraftConflictDialog.tsx` | modified | the doc comment: a team member or an agent saved, the texts name neither |
| `specs/005-connection-drafts/spec.md` | modified | User Story 3, scenario 1, and FR-022 say "the draft has been modified since they opened it" |
| `specs/005-connection-drafts/research.md` | modified | R6's table: the new message |
| `specs/005-connection-drafts/contracts/management-api.md` | modified | the `409 draft_changed` row |
| `specs/005-connection-drafts/contracts/ui-screens.md` | modified | the S2 conflict table and the copy table: the new hint |
| `specs/005-connection-drafts/quickstart.md` | modified | V10, step 3: the new message |
| `specs/005-connection-drafts/tasks.md` | modified | T045's `DRAFT_CHANGED_DETAIL` |

## Diff Highlights

```python
DRAFT_CHANGED_DETAIL = {
    "error": "draft_changed",
    "message": "This draft has been modified since you opened it.",
}
```

```ts
draftChangedHint:
  'Reload shows the draft as it was last saved and drops your changes. Replace their changes saves your version of the whole draft.',
```

## Tests Added or Updated

- `backend/tests/api/test_form_connection_drafts.py::test_saving_an_outdated_version_answers_draft_changed`
  — the `409 draft_changed` answer's message names nobody. The other conflict tests compare with
  `DRAFT_CHANGED_DETAIL` and follow.
- No frontend test is added: the dialog shows the server's message as is, and the hint is copy.

## Local Verification

- `uv run ruff check . && uv run ruff format --check .` in `backend/` → passed.
- `DATABASE_URL=…/konnekt_db_test uv run pytest tests/api/test_form_connection_drafts.py` → 127 passed.
- `npx prettier --check` and `npx eslint` on the two frontend files → passed.
- `npx vitest run --root frontend src/pages/FormConnectionEditor` → 4 files, 255 tests passed.
- The full gates (`npm run lint && npm test && npm run build`, mypy and the whole pytest suite)
  run in `/speckit-bug-test`.

## Deviations from Assessment

- The assessment names "quickstart.md (V8, step 3)"; the passage is V10 ("Two team members on
  one draft"), step 3. The change is the one the assessment describes.

## Follow-ups

- `mcp/src/draftEdit.test.ts` stubs a `draft_changed` answer with its own text; the MCP server
  never shows it, so it stays.
- Spec 002's `rules_changed` message keeps naming a team member: only browser sessions can save
  a published connection's rules.
