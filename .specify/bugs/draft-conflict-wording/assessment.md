# Bug Assessment: The draft conflict names "another team member" when an agent saved

- **Slug**: draft-conflict-wording
- **Created**: 2026-11-06
- **Source**: pasted text (no URL): a follow-up from spec 007's checkpoint T058 (quickstart V5,
  step 5)
- **Verdict**: valid
- **Severity**: low. Wording only: nothing is lost or stored wrongly, and the dialog's actions
  ("Reload", "Replace their changes") are right. But it contradicts spec 007, FR-015 and User
  Story 2, scenario 6, in every deployment where agents edit drafts, and it misleads: the "other
  team member" is often the team member's own agent.

## Report (verbatim or summarized)

> The editor's draft conflict dialog names "another team member" when an agent saved the draft
> through the MCP server. Spec 007 US2 scenario 6 and FR-015: the management interface must not
> say whether an agent or a team member saved in between. Repro: open a draft in the editor; an
> agent (even one of the same account) changes it through the MCP server; save in the editor; the
> dialog shows the server's message "Another team member saved this draft after you opened it."
> Source: DRAFT_CHANGED_DETAIL in backend/app/services/form_connections.py;
> DraftConflictDialog.tsx shows conflict.message as is, and DRAFT_COPY.draftChangedHint says "as
> they saved it". Decided wording: "This draft has been modified since you opened it."; hint
> reworded, button "Replace their changes" kept.

The wording was decided with the team member on 2026-11-06, before this assessment.

## Symptom

When a team member saves a draft that an agent changed after they opened it, the conflict dialog
"This draft has changed" shows "Another team member saved this draft after you opened it." and
the hint "Reload shows the draft as they saved it …". Spec 007 (FR-015; User Story 2, scenario
6; the decision "The UI doesn't say that an agent changed a draft") requires spec 005's conflict
handling to apply without saying whether an agent or a person saved in between. Spec 007's
quickstart V5, step 5, states the expected behaviour as "the conflict dialog … appears without
saying who saved", and checkpoint T058 is checked although the message names a person.

## Reproduction

1. Sign in to the management interface and open a stored draft in the editor ("Continue").
2. With an agent connected at "Read and edit drafts" (the same account is enough), make any
   change to that draft through the MCP server, such as `update_connection` with a new name.
3. In the editor, change anything and choose "Save and exit" (or "Publish").
4. Observed: the dialog "This draft has changed" with "Another team member saved this draft after
   you opened it. Reload shows the draft as they saved it and drops your changes. Replace their
   changes saves your version of the whole draft."
5. Expected: the same dialog and actions, with a text that names nobody.

The backend test `test_saving_an_outdated_version_answers_draft_changed` in
`backend/tests/api/test_form_connection_drafts.py` pins the current message (line 1529), so the
behaviour is reproducible without the stack.

## Suspected Code Paths

- `backend/app/services/form_connections.py:74` — `DRAFT_CHANGED_DETAIL`, the `409 draft_changed`
  answer's message, "Another team member saved this draft after you opened it."; raised by
  `_draft_changed()` in `backend/app/services/drafts.py` (saves and publishes with an outdated
  `version`) and by `DraftGuard.check()` under `create_revision()`'s locks.
- `frontend/src/pages/FormConnectionEditor/DraftConflictDialog.tsx:30` — shows `conflict.message`
  as the dialog's text, then `DRAFT_COPY.draftChangedHint`.
- `frontend/src/pages/FormConnectionEditor/PublishDialog.tsx:149` — the publish dialog joins the
  same message and hint.
- `frontend/src/pages/FormConnectionEditor/constants.ts:88` — `draftChangedHint`: "Reload shows the
  draft as they saved it and drops your changes. Replace their changes saves your version of the
  whole draft.", whose "they" refers to the message's "another team member".
- `mcp/src/draftEdit.ts` — every agent change is `PUT …/draft` with the version read and
  `replace: false`: an agent's save bumps the draft's version exactly as a person's does, so the
  editor meets `draft_changed` after it. The MCP server itself never shows this message: on
  `409 draft_changed` it reads and applies again.

Not affected: `backend/app/services/rules.py:1024`, the `409 rules_changed` of a published
connection ("Another team member saved the rules of this connection after you opened it."). Its
`PUT /api/form-connections/{id}` depends on `require_browser_session`
(`backend/app/routers/form_connections.py:199`), so no agent can cause it, and the approval
actions (deactivate, reactivate, delete) don't touch the rules.

## Root Cause Hypothesis

Spec 005 wrote the conflict message for two team members (FR-022: "say that another team member
saved the draft after they opened it"), and spec 007 reused spec 005's conflict handling without
changing that wording, while adding FR-015's requirement that the interface doesn't say whether
an agent or a team member saved. The requirement reached the quickstart and the checkpoint, but
no task changed the message or the hint. Confidence: high.

## Proposed Remediation

**Preferred**: Make the message and the hint neutral, in the pattern of the two sibling
conflicts ("This draft has been published since you opened it.", "This draft has been deleted
since you opened it."), as decided with the team member:

- `DRAFT_CHANGED_DETAIL.message` becomes "This draft has been modified since you opened it."
  The error code `draft_changed` and the dialog's actions stay.
- `DRAFT_COPY.draftChangedHint` becomes "Reload shows the draft as it was last saved and drops
  your changes. Replace their changes saves your version of the whole draft." The button "Replace
  their changes" keeps its label: it reads as "whoever saved", and it is also spec 002's label for
  the rules conflict (W9), which only team members can cause.
- Spec 005's artifacts state the final wording in place, with no "amended" notes: `spec.md`
  (User Story 3, scenario 1; FR-022), `research.md` (R6's table), `contracts/management-api.md`
  (the `409 draft_changed` row), `contracts/ui-screens.md` (the S2 conflict table and the copy
  table), `quickstart.md` (V8, step 3) and `tasks.md` (T045). Spec 007 needs no change: FR-015,
  User Story 2 scenario 6, the decision list and quickstart V5 already state the expected
  behaviour.

**Alternatives**:
- Keep the server's message and let the editor replace it for `draft_changed`: a second place
  that states the message, and the API would still name a person (agents and the approval page
  read the API's messages).
- Also rename the button to "Replace the saved version": clearer, but it touches spec 005's
  ui-screens contract, both dialogs and their tests for a label that already reads neutrally.
  Declined by the team member.

**Files likely to change**:
- `backend/app/services/form_connections.py`
- `backend/tests/api/test_form_connection_drafts.py`
- `frontend/src/pages/FormConnectionEditor/constants.ts`
- `frontend/src/pages/FormConnectionEditor/DraftConflictDialog.tsx` (the doc comment only)
- `specs/005-connection-drafts/spec.md`, `research.md`, `contracts/management-api.md`,
  `contracts/ui-screens.md`, `quickstart.md`, `tasks.md`

**Tests to add or update**:
- `test_saving_an_outdated_version_answers_draft_changed` asserts the new message. The other
  `409 draft_changed` tests compare with `DRAFT_CHANGED_DETAIL` and follow.
- No frontend test asserts the hint; `DraftConflictDialog` shows the server's message as is.

## Risks & Considerations

- The frontend recognises the conflict by its `error` code, never by the message, so the change
  can ship in the backend and the frontend separately.
- The MCP server's unit test `mcp/src/draftEdit.test.ts` stubs a `draft_changed` answer with its
  own text ("Another team member saved this draft."); the loop never shows it, so it can stay.
- `mcp/plugin/skills/` describe the agent's `conflict` error, not this message: no guidance change.
- Spec 002's `rules_changed` message keeps naming a team member on purpose (see above).

## Open Questions

- None. The wording was decided on 2026-11-06.
