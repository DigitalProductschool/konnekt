# Quickstart and validation guide: Rules for Form Connections, with Groups and Branches

**Phase 1 output of `/speckit-plan`** | **Date**: 2026-10-24 | **Spec**: [spec.md](spec.md)

This guide proves the feature end to end. Setup, the stack and spec 001's scenarios are in
[spec 001's quickstart](../001-servicebw-eudi-middleware/quickstart.md), which still applies. The
shapes referred to below are in [contracts/](contracts/) and [data-model.md](data-model.md).

## 1. Prerequisites

- Spec 001's prerequisites: the local stack (`docker compose up postgres -d`, backend and frontend
  dev servers), a sign-in account, the hosted EUDIPLO settings, and a test wallet (Paradym).
- The hosted EUDIPLO delivers `driving_privileges` in full (`9.0.0-mdocfix.1` or later,
  docs/EUDIPLO.md). Without it, every licence class rule reports `not_checked` (research R14).
- The migration of this feature applied: `cd backend && uv run alembic upgrade head`.

## 2. Automated checks

```bash
cd backend
uv run ruff check . && uv run ruff format --check .
uv run mypy app/ scripts/ tests/
# DATABASE_URL must name a database ending in _test, which the tests empty
uv run pytest

cd ../frontend
npm run lint
npm test
npm run build
```

**Expected**: all pass. The evaluator's unit tests cover every case of SC-003 and the Edge Cases
(research R12); the API tests cover saving, refusals, atomicity and every answer of the branch pull
URLs; the frontend's tests cover propagation, marks, dissolution, numbering and the pre-checks
(research R12). `npm test` runs once and exits; `npx vitest` watches while you work.

In the commands below, `$API` is `http://localhost:3000/api` (the backend without nginx), `$FC` a
form connection's id, `$BRANCH` a branch's id from its pull URL on the details screen, and `$REF` a
request reference.

## 3. Validation scenarios

### V1: Rules step, one branch (US1 scenarios 1–3 and 6, FR-001 to FR-006, SC-001)

1. Create a connection with the **Personal ID** (*Date of birth*, *City or town*) and the
   **Driving licence** (*Licence classes*, *Expiry date*). On the documents step, the footer offers
   "Add rules →" and "Publish without rules".
2. Go to the Rules step. **Expected**: the tab "Standard" and "+ Add variant" are there before any
   rule (F16); the empty state says "No rules yet".
3. Add "Personal ID – Date of birth is at least 21 years old". **Expected**: only the requested
   fields are offered, images as "Can't be checked"; the date conditions read as in FR-003, with
   "years old" only on the Date of birth (F1, F3); the counting and missing-value notes show (F4);
   the message is proposed only once the condition is complete (F9).
4. Add "Driving licence – Licence classes includes one of B" through the part picker, and
   "Driving licence – Licence class B – Issue date is at least 2 years ago" (F5, F32).
5. Clear one rule's message, open another rule's editor with an unsaved change, and press Publish.
   **Expected**: "Save changes to Rule 01?" appears first (F10); after "Save changes", publishing
   is refused with a message that names the problem, the rule and "Standard" (F11), and the focus
   moves to it.
6. Fix it and publish. **Expected**: the dialog summarises the rules (S5, no warnings line, no
   go-live choice: F21, F22); the details show the trigger URL and one pull URL without a branch
   label (W2), and the rules in a collapsed card with identifiers (F26, W1).
7. Time steps 3–6 from the first rule to the details (SC-001: under 5 minutes).

### V2: Evaluation through the pull URL (US1 scenarios 4, 5 and 7, FR-010 to FR-017, SC-003)

1. Issue test documents on both sides of the rules of V1:
   ```bash
   cd backend
   uv run python -m scripts.issue_test_credentials --birth-date 2001-01-01 --licence-class B:2020-03-01
   uv run python -m scripts.issue_test_credentials --birth-date 2006-06-30 --licence-class B:2025-09-01
   ```
   (The two options are added by this feature, research R12.)
2. For each person: trigger, share from the wallet, and pull:
   ```bash
   curl -s -X POST "$API/connect/$FC/requests" | jq '.data.reference'
   curl -s "$API/connect/$FC/requests/$REF" | jq '.data.status, .data.evaluation'
   ```
   **Expected**: the documents as in spec 001, and `evaluation` as in
   [contracts/integration-api.md](contracts/integration-api.md): for the first person `met: true`
   and no messages; for the second `met: false` with the messages of the age rule and the 2-year
   rule, not of the class rule (US1-AS5).
3. Pull again within 60 seconds, then after. **Expected**: the same evaluation, then `documents`
   and `evaluation` both `null` (FR-017).
4. Pull a request of a connection created before the migration. **Expected**: `evaluation` with
   `met: true`, no results, no messages (US1-AS7, SC-005).
5. Check the backend log and nginx's access log. **Expected**: no reference, no field value, no
   evaluation outcome or message (FR-017).

### V3: OR, groups and sub-groups (US2, FR-007 to FR-011, SC-008)

1. In a new connection, build "City or town is equal to Stuttgart AND (Date of birth is at least
   21 years old OR (Date of birth is at least 19 years old AND Licence class B – Issue date is at
   least 3 years ago))" with a group and a sub-group.
   **Expected**: a sub-group offers no further grouping (US2-AS6); switching a connector switches
   the whole level (FR-007).
2. Give the group its own message through its ⋯ menu (W6).
3. Delete one rule of the sub-group. **Expected**: the sub-group dissolves and the other rule takes
   its place (F13, US2-AS7). Undo it.
4. Publish and run requests for a 20-year-old from Stuttgart with class B since 3 years, and one
   with class B since 1 year. **Expected**: met; then not met with the group's own message instead
   of its members' (US2-AS2 to AS4).
5. Rename a rule to the name of another rule. **Expected**: "Another rule in Standard is already
   called Rule 01." inline (F12). Rename a rule to "Rule 09". **Expected**: "Rule 09 is kept for
   the rule numbered 09." (FR-005).
6. Ungroup the sub-group, then delete the group after confirming, and undo both (W8).
   **Expected**: ungrouping puts the sub-group's rules in its place in the group; deleting the
   group removes it with its rules (US2-AS8). Ungroup the group instead: its sub-group reaches the
   top level as a group with the same identifier, name, AND/OR and message (FR-008). A new group
   takes its first member's place, and nothing can be reordered (FR-007).

### V4: Branches in the rules step (US3 scenarios 1–6, FR-019 to FR-024, SC-002, SC-007)

1. Set up the "Passenger transport licence" with the main branch's four rules. Add "Ambulance",
   based on Standard, with a description. **Expected**: the same rules, unmarked; an (i) after the
   name shows the description on hover and keyboard focus (US3-AS1).
2. Change Ambulance's age rule to 19. **Expected**: "Changed here"; Standard still says 21
   (US3-AS2).
3. In Standard, change class B from 2 to 3 years. **Expected**: Ambulance shows 3 years, its age
   rule stays 19 (US3-AS3).
4. In Ambulance, remove an inherited rule and add a new one. **Expected**: "Removed" (still shown)
   and "New addition"; Standard unchanged (US3-AS4). Undo the removal (US3-AS5).
5. Switch Ambulance's top-level AND to OR. **Expected**: marked "Changed here" on the first
   connector (W4).
6. In Standard, delete the rule Ambulance changed. **Expected**: the dialog doesn't say it leaves
   every variant and names Ambulance as keeping its version (F14); in Ambulance it is now "New
   addition" (W4, EC-12).
7. Remove one rule of an inherited group of two in Ambulance. **Expected**: the group shows as
   removed, the other rule takes its place and still follows Standard (F13, EC-16); in Standard,
   add a rule to that group: it comes back.
8. Add "School transport", started empty. **Expected**: the empty state (W5); its rules carry no
   marks and Standard's changes don't reach it (US3-AS6).
9. Rename "Ambulance" and edit its description through the tab menu, then delete "School
   transport" after confirming (W3). Try a duplicate variant name, also differing only in letter
   case. **Expected**: reported in the dialog (FR-020).
10. In Ambulance, edit the age rule from 19 back to 21. **Expected**: "Changed here" goes and the
    rule follows Standard again; in Standard, change it to 22: Ambulance shows 22 (FR-024). Then
    change Ambulance's age rule to 19 and Standard's to 19: Ambulance's stays "Changed here".
11. In Standard, group two rules into a group; in Ambulance, switch that group to OR. In Standard,
    delete one of its two rules. **Expected**: the confirmation names Ambulance; the group
    dissolves in both branches (FR-022, F14, W8). Undo, then ungroup the group in Standard
    instead. **Expected**: in Ambulance it stays as "New addition", with both rules (FR-022).
    In Ambulance, the inherited group's menu has "Remove" and "Restore", not "Ungroup" (W8).
12. Copy a rule of Ambulance to Standard. **Expected**: the copy dialog shows Ambulance as
    included once Standard is chosen; the copy appears in Standard and, linked, in Ambulance
    beside the original (FR-022).
13. Ask five DO.IT participants to say, for every rule of Ambulance, whether it follows Standard or
    was changed, removed or added (SC-007: at least 4 of 5 correct).

### V5: Branch pull URLs (US3 scenarios 7–9, FR-025 to FR-027, SC-002)

1. Publish V4's connection. **Expected**: the details show one trigger URL and a pull URL per
   branch, labelled with its name and (i), each copyable (US3-AS7, F24, F31). Ambulance's URL
   contains `/branches/$BRANCH/`, not its name.
2. Share the documents of a 20-year-old from Stuttgart with class B since 3 years, and pull
   through both:
   ```bash
   curl -s "$API/connect/$FC/branches/$BRANCH/requests/$REF" | jq '.data.evaluation'
   curl -s "$API/connect/$FC/requests/$REF" | jq '.data.evaluation'
   ```
   **Expected**: Ambulance met; Standard not met with the age rule's message; the same status and
   documents (US3-AS8).
3. Rename Ambulance and save. **Expected**: its pull URL is unchanged (FR-025).
4. Trigger a request, then add a branch "Night" and save, then pull that request through Night's
   URL. **Expected**: `409` `branch_added_later` (FR-025).
5. Trigger a request, delete Ambulance and save, then pull through Ambulance's and Standard's URLs.
   **Expected**: Ambulance `409 unavailable`; Standard keeps answering for the request (US3-AS9,
   FR-027).
6. Deactivate the connection. **Expected**: every branch's URL answers `409 unavailable`; reactivate
   and they work again (FR-027).
7. Time setting up V4's connection and copying its three URLs (SC-002: under 10 minutes).

### V6: Changing the rules of a live connection (US4, FR-028 to FR-030)

1. On V1's published connection, trigger a request A. From the details, open the rules in the
   editor. **Expected**: no "Edit this live connection?" on entry; the Rules step of the edit flow
   with "Save" (F27, W7).
2. Change the age rule to 25 and save. **Expected**: the save dialog asks for confirmation; the
   URLs don't change (US4-AS1).
3. Trigger request B. Share and pull both. **Expected**: A is evaluated with 21, B with 25 (FR-028).
4. On a live connection without rules, add rules and save. **Expected**: same URLs; new requests
   are evaluated with them (US4-AS2).
5. In the documents step, deselect *Date of birth*. **Expected**: the dialog names the rules that
   check it with their branches, with "… before you save." (F18); after confirming, Save is refused
   while they remain (F11, US4-AS3).
6. Make the save fail (stop EUDIPLO's network access, or the fake EUDIPLO in the API tests) after
   changing documents and rules. **Expected**: "Try again" in the dialog, and nothing changed:
   neither documents nor rules (FR-028, F23).
7. Open the same connection's editor in two browser sessions. In the first, add a variant "Night"
   and save. In the second, change a rule and save. **Expected**: the dialog says another team
   member saved the rules and names "Night" as deleted by replacing (W9). "Reload" shows the first
   session's rules. Repeat, and choose "Replace their changes": the second session's rules are
   saved, and Night's pull URL answers `409 unavailable` (FR-027, FR-028). Saving only the
   connection's name in a stale session meets no such dialog.

### V7: Accessibility (SC-009)

Spec 001's walkthrough (V9 there), applied to the Rules step, the rule editor, the variant dialogs
and menus, the publish dialog and the details' rules card. In particular: marks readable without
colour; ≥ / < / = not announced; connectors, tab menus and select mode usable with the keyboard;
tooltips on focus; focus on the named problem after a refused Publish.

### V8: Usability and timing (SC-001, SC-002, SC-007, SC-008) and delay (SC-004)

- SC-001 and SC-002: timed in V1 and V5.
- SC-007: V4 step 13.
- SC-008: five participants build V3's rules from a written description, without help; at least 4
  of 5 correct on the first attempt.
- SC-004: repeat spec 001's V7 load run on a connection with V3's rules. **Expected**: in 95% of
  requests, a pull 5 seconds after approval returns the documents with their evaluation, as
  without rules.

## 4. Troubleshooting

| Symptom | Likely cause |
|---|---|
| Every licence class rule is `not_checked` | EUDIPLO without the mdoc fix delivers `driving_privileges` as `[{}, …]` (docs/EUDIPLO.md) |
| A date rule flips around midnight | The day of sharing is Germany's calendar date of `completed_at`; check the request's `completed_at` |
| Save refused with "… is out of step with Standard. Reload the connection and try again." | The editor's propagation produced an inconsistent based branch (research R4). Reload, report the steps, and add them as a case to `frontend/src/utils/rules/branches.test.ts` |
| `409 branch_added_later` | The request was triggered before the branch was saved; start a new request |
| Save dialog says another team member saved the rules | Someone saved the connection's rules after this editor opened them (`409 rules_changed`, FR-028): reload, or replace their changes |
