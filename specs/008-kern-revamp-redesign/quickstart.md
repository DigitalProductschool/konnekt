# Quickstart: validating the KERN Revamp port

**Phase 1 output of `/speckit-plan`** | **Date**: 2026-11-07 | **Spec**: [spec.md](spec.md) |
**Plan**: [plan.md](plan.md)

What proves the feature works: the gates, the per-node verification loop whose tables are the
evidence (FR-016), and the scenarios V1–V13 that walk the five flows and the cross-cutting rules.
Implementation details are in `tasks.md` and the design notes, not here.

## Prerequisites

- The stack of `README.md`: PostgreSQL (the compose file or a local server), the backend, the
  frontend dev server, the fake EUDIPLO for tests; the test accounts of the README.
- **This checkout had no `node_modules` on 2026-11-07** (research R14): run `npm install` at
  the root once, and `uv sync` in `backend/`.
- Figma is read only by the Opus task agents (brief §2.8); the Playwright MCP tools run the
  browser checks from the chat. The frame width is 1440 px; Chromium on Linux needs a 1455 px
  window for a 1440 px page (`docs/FIGMA-WORKFLOW.md` §4).
- Git in this checkout is read-only; nothing here commits.

## Gates (every task; constitution III)

```bash
# the root: api-types/, rules/, frontend/, mcp/
npm run lint && npm test && npm run build

# backend/ (for the C items that change server texts)
uv run ruff check --fix . && uv run ruff format . && uv run mypy app/ scripts/ tests/
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5435/template_db_test uv run pytest
```

Expected: all green. A test fails only where an adopted item changed the behaviour or text it
asserts, and the task updates that test (research R3).

## The per-node verification loop (every UI task)

1. Start the dev server: `npm run dev -w frontend` (port 5173), signed in with a test account.
2. For each node the task names (`contracts/ui-screens.md`): `get_design_context` and
   `get_screenshot` (the agent), then `browser_resize` to 1455 × the frame's height,
   `browser_navigate`, the font check, the numeric check (`getBoundingClientRect`,
   `getComputedStyle`) and the screenshot comparison, as `docs/FIGMA-WORKFLOW.md` §4 prescribes.
3. Append the table to `design-notes.md` §5 (template there): one row per frame × state ×
   element × property; `result` is `match` or the decided item it cites.
4. Done when no row is open. A difference that no item explains is a mismatch to fix, or, if the
   frame changed since the audit, a new drift item for clarify (FR-004): report it, don't build
   it.

Expected: every unit of `figma-audit/units.md` (U10–U100) has a table with no open row, and every
component of design-notes §2 has one (SC-001, SC-002).

## Scenarios

Each scenario names the screens of [contracts/ui-screens.md](contracts/ui-screens.md) it covers;
"matches" means the verification table of the screen is clean.

### V1. Sign in, forgot password, welcome page, overview (US1; S1–S5, L1, L2)

1. Open `/login`: the frame matches; sign in with a wrong password → the one message under the
   alert and **both** fields marked invalid (F16); the password toggle works by keyboard.
2. Open "Forgot password?" → the forgot-password card; "Back to log in" returns and a requested
   route survives the round trip.
3. Sign in on an empty account → "Loading your connections…", then the welcome page "Welcome to
   Konnekt" with "Create connection" only (F15); reload → the welcome page again without a flash
   (research R6); "Create connection" opens the first-connection flow.
4. With published, deactivated and draft connections: the overview with the search (type, ×,
   "n of m connections", no results, "Clear search"), rows of equal height with the status pill,
   "Edited <date>" (a draft adds "· Rules step"), "View" / "Edit" / "Delete"; row delete asks the
   same dialog as the details; no checkboxes.
5. Delete the last connection → the welcome page.
6. Sign out → `/login` with "You're logged out." announced.
7. The overview's error state (stop the backend): the alert with the error ID and the way back.

### V2. Local drafts (US1; S5)

1. Start a connection, close the tab before saving, reopen `/` → the grey banner "Unsaved changes
   in "<name>"" (heading-only for one, a list for several), "Resume editing" and "Discard
   changes"; discard asks, announces and moves the focus as 005-S4 says; another tab updates.
2. A never-saved item reads "New, never saved · …" with "Resume editing".

### V3. The wizard shell, step 1 and leaving (US2; L3, S6, S7)

1. Open a new connection: "Step 1 of 4", four segments, "Next: Documents", the progress bar in the
   accessibility tree, not clickable; the sticky header and footer; the page scrolls.
2. Continue without a name → "Enter a name for the connection." under the field, focused (C7).
3. Fill the name and a 501-character description → the too-long error (W10); the description is a
   textarea with spell check; both ⓘ open on hover, focus and touch (F60).
4. Click "Konnekt" → "Leave this connection?"; "Save progress" stores the draft and leaves with
   the toast "Draft saved. You can pick it up any time."; repeat with "Discard connection" → no
   draft, the local draft forgotten; × and Escape keep the flow.
5. With unsaved changes, "Log out" → "Save before you log out?" with "Save and log out", "Log out
   anyway", "Cancel" (focus back on the user menu).
6. Reload the tab with unsaved changes → the browser's "Leave site?" warning; after a forced
   reload the restore dialog (W4): Escape, × and the scrim open the draft's details and keep the
   local draft.
7. Stop the backend and "Save and exit" → "Saving…" aria-disabled, then the toast "Couldn't save.
   Check your internet connection and try again." with "Try again" and the error ID; the focus
   does not move; no modal (F21).
8. Two browsers on one draft: the second save → the conflict dialog (W3) with "Reload" and
   "Replace their changes".

### V4. The documents step (US2; S8)

1. No document: the empty panel with its picture; "Set rules →" disabled with "Add a document
   first" on hover and focus.
2. Add Personal ID from the search card ("Available (n)" / "Added (n)", no-results text) → the
   master-detail with "Document 1 of 1", "Added documents (1)", the fields in catalog order
   without group rows, "0 of 25 data items chosen"; add Driving licence → "Document 2 of 2".
3. Hover a document → the trash; remove it → the undo toast restores it; remove a document no
   rule checks → "Keep document" / "Remove document"; with a rule on it → 002-S1.1's dialog
   naming the rules (F72).
4. Leave a document without data and continue → "1 document needs data" inline and the dialog
   "No data selected in 1 document" with "Choose data" / "Remove 1 document" (F67).
5. A document the catalog no longer offers (W6) → the warning alert listing the data with
   "Remove it".
6. At ≥ 800 px tall the panels fill the viewport and only their lists scroll; no drag handle
   (F23); no "Coming soon" (F3); no "Publish without rules".

### V5. The rules step, the editor, the variants and the findings (US3; S9–S12)

1. The empty step: "Set eligibility rules for citizens", the intro naming Konnekt, the tab row
   with "Standard", "+ Add variant" and the ⓘ with the design's text (F26, F27), "No rules yet".
2. Add a rule through each kind of condition (age, date with "Time ago" / "Time from now", text
   with "Match letter case", number, licence classes with "Choose part", a list value with the
   picker and "Done"): the pickers unlock in order, the hints read as the design writes them, the
   statement preview uses "·" and "must be met" (C3), the message placeholder names citizens;
   leave a field empty → the error under it and "Save rule" disabled with its explanation (W21);
   enter 0 → "Enter a whole number greater than 0."; reuse a name → "There's already a rule
   called "Rule 01" in Standard." (C5).
3. Group two rules from "Group with other rules" (select mode, the sticky bar's texts, checkboxes
   on rules only: grouping a group is deferred, CLAR #64); inside the group, "Group with other rules" appears only beside another rule
   directly in the group (CLAR #61) and forms a sub-group; a sub-group's menu, a rule in a
   sub-group and a group holding a sub-group offer no grouping; "Ungroup" and "Delete group"
   dissolve as the baseline says (F31).
4. Give a group a message → its members read "Not shown while this rule is in Group 01. Citizens
   see the group message instead." (F32); the connector pill opens its two-option menu with
   "Applies to every rule in Group 01" (FR-038).
5. Every ⋯ menu: "Copy link" before the destructive entries, "Rename" and "Copy to variant" per
   FR-036, "Remove message" while the group has one (W22); delete a rule → "Delete Rule 03?" with
   the current body (F70), the toast with Undo; "Test rules" disabled with "Save the rule first"
   while a rule is open.
6. Add a variant (the dialog preselects "Linked to Standard (recommended)"; a taken name shows
   the error next to the field, W18): the marks "Changed here", "Added here", "Removed here" with
   their texts, the link strip's count, faded connectors, "Reset to Standard", "Copy to variant"
   through the popover (W17) with based variants included; rename through "Edit variant" (F28);
   delete → the tab to the left and a toast with Undo; a Standard-based variant stays linked when
   Standard is empty (F37).
7. Provoke each finding (a conflict, a today-only conflict, a redundant rule, a duplicate) → the
   banner's sentences per C4 with the names as links (F39), the notes, the outlines, the tab's
   red icon with the tooltip and the grey ⓘ without findings; the counts row "2 rules contradict
   each other, and 1 rule is a duplicate".
8. Remove a document a rule checks → the banner "Rule 02 in Standard checks data that's no longer
   requested. Add it again in Documents, or edit or delete the rule." with the "Add it in
   Documents" action.
9. Open a copied link to a rule, a group and a variant, and a stale one → the item highlighted,
   or the notice "This link points to a rule or group that no longer exists." with "Dismiss"
   (W15).

### V6. The test step (US3; S13)

1. Open the step on a connection with rules → "Creating 3 sample citizens…" with the skeletons,
   then the chips with name and outcome icon (F44), the data card as a flat list with
   "08.07.2007", "B, BE since 02.05.2010", "Valid until <date>" (C6), the result heading "Result:
   doesn't meet 2 rules" with "Tested as if shared today, 01.11.2026" (no full stop) under it in
   the result card's head and no line above the tabs; ~~rows with the statement, "Not met" /
   "Couldn't be checked" and the message (F42)~~ the rows as a list without a head: the status
   icon, the name red when not met and green when met ("Not met" / "Met" hidden), "Couldn't be
   checked" visible after the name, the statement, and "Message for citizens: <its message>" on
   every row, met or not, with no tint, no "–" and no "Rules Mia meets"; a long message hangs
   beside its label where the card is 560 px wide or more, and flows under it at 320 px (bug
   test-results-v5, 2026-11-19, Clarification 2026-11-19 #1–#3); no success box (F41); no
   variant ⓘ (F27).
2. "Edit data" → the dialog; a date that doesn't exist → the error under the field blocks "Save
   and test"; a valid change → the results update and the toast "Results updated. Mia now meets
   Rule 01."; classes picked by code, Nationality and Expiry date fields, "Class B since" (F40).
3. "Generate again" asks only when the persona was edited; the regenerating chip keeps its name
   with a ring, ~~and the test-day line stays~~ its skeleton card shows no test day while another
   citizen's card does (Clarification 2026-11-19 #1); "Generate all" (the design's label for the
   baseline's "Generate all again", cosmetic 12) in every results state (F45).
4. Contradicting rules → the ⚠ on the tab with its tooltip on hover and focus, no line above the
   heading (CLAR #50); a variant without rules → "<variant> has no rules yet, so every citizen
   meets it." under the head with the test day; a rule in a group with its own message → "Not
   shown while this rule is in <group>. Citizens see the group message instead."; generation
   failed → "Couldn't create sample citizens" with "Try again".
5. With 12 rules the page doesn't scroll (F43): at ≥ 1024 × 640 each card's rows scroll on their
   own, its head staying; narrower but pinned, the panel scrolls (bug v5-ui-fixes, 2026-11-18).
   Arrow keys move between chips; the focus follows 004-ACC.

### V7. Publishing, the details and the confirmations (US4; S14, S15, S17)

1. "Publish" on the test step → the dialog with the counts, the findings warnings first in C4's
   texts (F47), "Back to test" (returns), "Publish connection"; publishing shows "Publishing…
   This takes a few seconds." and can't be closed; "Published" and "Opening your connection
   page…" for 0.5 s, then the details with the Links accordion open; with the backend stopped,
   "Couldn't publish…" with the error ID and the summary kept (F46); "Publish without rules?" on a
   connection without rules (W7).
2. The details: the status sentence as the h1, the name and status in the header pill, the
   description meta; Links: the count "1 request link · 3 result links", the two ⓘ texts, URLs
   one line with "…", the copy button reads "✓ Copied" for 2 s and announces; Summary (open when
   arriving from "View"): the counts line, the documents, the variant tabs with the ⓘ and the
   problem icons, read-only rows with identifiers, the findings lines (FR-047); one accordion open
   at a time; no Activity, no PDF, no date pill, no "Create new connection".
3. The ⋯ at the band's right end: "Deactivate" → the design's dialog (F13's body), the toast, the
   deactivated band with "Activate again" before the ⋯, copy buttons disabled with their
   explanation; "Activate again" → the dialog with the documents and rules summary, the toast;
   "Delete" → "Delete connection" / "Keep connection" with the design's body, no Undo (F4).
4. Open the address of a deleted connection → the error state with the way back (W2).

### V8. The draft details and the edit flow (US4; S16, S18)

1. "View" on a draft row → "This connection is a draft" as the h1 with "Edited <date>", the Draft
   badge in the breadcrumb and the tab title, the Summary open, the Links card without links, the
   footer "Edit connection" / "Go to connections →", a visible "Delete draft" (F56); an incomplete
   rule shows its placeholder (W8); delete errors 409 and 404 as alerts.
2. "Edit" on a published connection → "Edit "<name>"?" with "Cancel" / "Edit connection" (F48);
   the flow with "Active" in the header, the note on requests in progress (F49), the step line
   clickable (F25), Save on every step; on the rules step Save disabled with "Save the rule first"
   while a rule is open (F65); "Discard changes" → "Discard your changes?" → back to the details
   unchanged.
3. Click "Your connections" with changes → "Save your changes?" (F64); "Save" opens "Save
   changes?" and leaves to the details with "Changes saved."; "Discard changes" leaves without
   saving; × keeps the flow. A second team member's save first → the `rules_changed` conflict.
4. Open the edit flow with findings → the checks run on open; a failed run shows "Try again, or
   save without testing." (W9).

### V9. The consent, account and approval pages (US5; S19–S21)

1. From an agent, open `/authorize` → the three levels in the kit's radios, the step-up line,
   allow and deny with the redirect, an invalid request on the page, the product name "Konnekt"
   in the sentence (C1); a failed authorization shows the alert with the error ID.
2. `/account` empty → "No agent is connected yet. Add Konnekt's MCP server to your agent to
   connect it."; with agents and tokens → the list rows with their ⋯ menus, "Change access level",
   "Revoke", "Create token", the token shown once with "✓ Copied"; "Your account" in the user
   menu.
3. An approval request for each action → the body, approve and decline, working, and every
   outcome; a failure with "Try again" and the error ID as a toast or alert per FR-033.

### V10. Keyboard, headings and focus (SC-006; every screen)

Walk the five flows with the keyboard only (Chromium, 1440 px): every control reachable in a
logical order, the focus ring visible on keyboard focus only (never after a click), every dialog
keeping and returning the focus, every menu closing on Escape, every tooltip and disabled
button's explanation opening on focus, exactly one `h1` per route (read the accessibility tree),
every status message announced (the toasts, "Saving draft…", the findings' status region).
Record the result in design-notes §6.

### V11. 320 px at 200 % zoom and the screenshot matrix (SC-005; every screen)

For every route × state of `contracts/ui-screens.md`, screenshots at 1440 px and at 320 px with
200 % zoom (`browser_resize` to 320 and `document.body.style.zoom` or the browser's zoom): no
horizontal scrolling, nothing hidden, the footer wrapping with "Save and exit" keeping its
label, menus and popups staying on screen (FR-009d). One row per screenshot in design-notes §6.

### V12. Copy outside the frontend and the removal check (C1–C7, SC-003, SC-004)

1. The backend's tests and the MCP's tests pass with the new texts (`uv run pytest`,
   `npm test`); `rules/src/validation.ts`'s messages equal the server's word for word (the
   validation tests of both sides assert the same strings).
2. Run the removal checklist of design-notes §7: every grep comes back empty or lists identifiers
   and history only.
3. `grep -rn "Connection Portal\|[Aa]pplicant" mcp/plugin` → empty; the agents' guidance names
   Konnekt and citizens.

### V13. Light only and reduced motion (FR-011, FR-050)

1. Switch the device to dark mode → the UI stays light (the attribute, `color-scheme`).
2. Set `prefers-reduced-motion: reduce` (`browser_emulate_media`) → no transitions: the connection
   pill appears at once, accordions open without animation; the "Published" state still waits
   0.5 s.
3. With motion on: the pill grows in 240 ms, colours change in 150 ms, pages fade in.

## Done when

- SC-001: every unit U10–U100 and every component has a clean table in design-notes §5.
- SC-002: every text on every screen equals the frame's, differences citing decided items.
- SC-003: the removal checklist finds nothing.
- SC-004: the gates pass for the workspace and the backend.
- SC-005, SC-006: the matrix and the keyboard run of V10–V11 are recorded with zero failures.
- SC-007: V1–V9 completed once in the new design.
