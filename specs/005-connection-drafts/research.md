# Research: Connection Drafts ("Save and exit") and Crash Recovery

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Date**: 2026-11-04

Each decision has an id (R1–R16) that the plan, the data model, the contracts and the tasks cite.
Where a decision builds on an earlier spec's, it names it ("spec 002, R9").

---

## R1. Where a draft lives: a form connection that was never published

**Decision**: a draft is a row of `form_connections` whose `published_at` is null. While it is a
draft:
- `current_revision` and `current_rule_set` are null: it has no revision, no rule set, no EUDIPLO
  configuration and no branch rows (FR-005);
- its content lives in one JSONB column, `draft`: the documents, the branches with their rules,
  and the step (FR-002). The name and the serviceBW form use the existing columns, and the
  serviceBW form may be empty (FR-004);
- `draft_version` counts its saves (R6);
- `next_rule_number` and `next_group_number` are its numbering (R4).

Publishing sets `published_at`, makes the first revision and rule set current, and clears
`draft` and `draft_version` in one transaction (R5). A CHECK constraint keeps every row in exactly
one of the two states: a draft has content and no current revision or rule set, and a published
connection has both and no content (data-model.md).

**Rationale**:
- **One identity.** The draft keeps its id when it is published (spec, Key Entities), so the
  overview, the details (`/form-connections/:id`) and the editor (`/form-connections/:id/edit`)
  need one lookup, and the list is one query.
- **A row to lock.** Publishing reuses `create_revision()`'s reservation under the row lock (R5).
  That is what keeps two publishes of the same draft from writing the same EUDIPLO configuration.
- **URLs need no second lookup.** The connect URLs already read this row, so a draft answers
  "unavailable" with one extra condition (R8).
- **Whole reads and writes.** The content is always read and written whole, like a rule set's
  `branches` (spec 002, R2), so one JSONB column fits.

**Alternatives considered**:
- *A separate `form_connection_drafts` table, with a `form_connections` row inserted at
  publishing under the draft's id*: rejected.
  - There is no row to reserve a revision on, so two publishes of one draft would both write
    `fc-<id>-r1`. EUDIPLO overwrites a configuration whose id exists
    (`EudiploClient.create_config`), so the loser could replace the winner's documents, and its
    clean-up would then delete the winner's configuration.
  - The list, the details and the connect URLs would each have to read two tables.
- *Storing a draft as a revision and a rule set that aren't current yet*: rejected. Revisions and
  rule sets are immutable versions that requests can use, and each revision needs its EUDIPLO
  configuration (FR-005 forbids both). They also require complete documents and rules, which a
  draft doesn't have (FR-004).
- *Sentinel values (`current_revision = 0`) instead of nulls*: rejected. A null says "none", which
  the CHECK constraint can enforce. mypy then finds every reader of the two columns, and each
  reader is on a published-only path that narrows with a guard (R8).

---

## R2. The API: draft endpoints beside the form connection endpoints

**Decision**: drafts are form connections, so they stay in `routers/form_connections.py`. Their
logic goes into a new `services/drafts.py`, and the router stays thin.
- `GET /api/form-connections` lists drafts with the others. Each summary gains
  `status: 'draft' | 'published'`.
- `GET /api/form-connections/{id}` answers either the published `FormConnection` or a
  `FormConnectionDraft`, discriminated by `status`.
- `POST /api/form-connections/drafts` stores a new draft.
- `PUT /api/form-connections/{id}/draft` saves a draft.
- `POST /api/form-connections/{id}/publish` publishes it.
- `DELETE /api/form-connections/{id}/draft` deletes it.

The endpoints keep to their own state:
- The published connection's endpoints (`PUT`, `deactivate`, `activate`, `DELETE`) refuse a draft
  with `409 not_published`.
- The draft endpoints refuse a published connection with `409 draft_published`.

Contracts: [management-api.md](contracts/management-api.md).

**Rationale**:
- **No published endpoint changes meaning.** The edit flow and the connect URLs of published
  connections stay as they are (FR-025, FR-026, SC-007).
- **Intent is explicit.** A team member who confirmed "Delete draft" can't delete a live
  connection that another team member published meanwhile, because the draft endpoint refuses
  it (R7). The same goes for a save that would turn a published connection back into a draft
  (FR-023).
- **One read.** The details and the editor need one `GET` to know which screen to show.

**Alternatives considered**:
- *A `draft: true` flag in the bodies of `POST` and `PUT /api/form-connections`*: rejected. Every
  save would branch on the flag, and a draft save sent to a published connection would silently
  mean something else.
- *A separate `/api/drafts` resource*: rejected. The id is the form connection's, before and
  after publishing, and the overview and the details show both kinds together.

---

## R3. One implementation of the checks: structure always, completeness only for publishing

**Decision**: the existing validators get a switch, `complete` (default `True`), instead of a
second, draft-only validator.
- **Saving a draft** (`complete=False`) runs the same walk over the name, the documents, the
  branches and the items, and applies only the structural checks of FR-003. Their messages are
  the same as publishing's.
- **Publishing a draft** runs the validators of creating a connection (`complete=True`)
  unchanged. Its refusals are the same, word for word (FR-009, SC-003).

| Check | Draft save | Publish |
|---|---|---|
| Name: present, ≤ 200 characters | yes | yes |
| Form ID: present | **no** (may be empty) | yes |
| Form ID: ≤ 500 characters | yes | yes |
| Documents: at least one | **no** | yes |
| Document type and fields known to the catalog, none twice | yes | yes |
| Each document has a field | **no** | yes |
| At most 20 variants, exactly one main variant, first, every variant without an id | yes | yes (create path) |
| Variant name: present, unique | **no** | yes |
| Variant name ≤ 100, description ≤ 500 | yes | yes |
| ≤ 200 rules, groups and sub-groups per variant | yes | yes |
| Identifiers: `rule-{n}` / `group-{n}`, unique in a variant, from the numbering (R4) | yes | yes |
| Nesting: a sub-group holds rules only, two levels at most | yes | yes |
| A group (not dissolved) has at least two members | yes | yes |
| Marks: a based variant in step with the main variant, marks only in based variants | yes | yes |
| Rule and group names: present, unique, not reserved | **no** | yes |
| Rule and group name ≤ 100, message ≤ 500 | yes | yes |
| Rule: data chosen, data requested, part valid | **no** | yes |
| Rule: condition present and complete for its kind | **no** | yes |
| Rule: message present | **no** | yes |

**Rationale**:
- **One implementation.** Publishing a draft runs exactly the checks and the numbering of
  creating a connection (spec Assumptions), and saving a draft runs a subset of the same code.
  The two can't drift apart.
- **Incomplete is allowed, malformed isn't.** The structural checks are the ones a reopened draft
  needs to load into the editor and to stay publishable once completed: a known catalog, a valid
  tree, valid marks and identifiers, and bounded sizes.
- **Conditions are left alone.** A condition whose operator doesn't fit its data counts as
  incomplete, as an empty one does. Publishing refuses it with "… choose a check.". So a draft
  needs no new message, and a rule on data that isn't requested may keep its condition until the
  data comes back (FR-004).
- **Messages name the right thing.** In a draft, a variant or item may be unnamed, so a message
  that would name it uses its position ("Variant 3") or its identifier ("rule-7") instead
  (data-model.md, "Validation").
- **The browser checks only what it can.** It checks the name, which "Save and exit" needs
  (edge case "Save and exit without a name"), and the catalog-dropped data it points out (R12).
  The server checks the rest, since the editor can't produce malformed content.

**Alternatives considered**:
- *A separate `clean_draft()`*: rejected. It would be a second implementation of the structural
  checks, whose messages and limits would drift from publishing's.
- *No server checks for drafts*: rejected. FR-003 asks for them. A malformed draft could also
  break the editor that loads it, or the details that show it.

---

## R4. Identifiers in a draft come from the connection's numbering

**Decision**: a draft numbers its rules and groups from its own counters, `next_rule_number` and
`next_group_number`, as a published connection does (spec 002, R5). The editor sends the counters
it started from as `numbering_base`. Saving or publishing a draft checks the identifiers with
`rules._allocate()`:
- an identifier below the base counts as one the editor loaded, and keeps its number;
- one at or above the base is new: it moves up past any number another save took meanwhile, the
  same way in every variant;
- the counters end above every number used, and never go down.

Publishing continues from the draft's counters into rule set 1 (`first_rule_set()` with the row's
counters). Creating a connection without a draft keeps its numbering exactly: base (1, 1), and no
identifier counts as loaded.

**Rationale**:
- **Nobody keyed on draft identifiers.** No serviceBW form ever saw a draft's identifiers,
  because its URLs never worked (FR-006). So the old-identifier half of spec 002, R5 needs no
  history of rule sets for drafts: below the base is enough.
- **No reuse after publishing.** The counters only go up (FR-003), so once the draft is published,
  new rules can't reuse a number the draft once used.
- **Same numbers in the editor and in the result.** Publishing keeps the editor's identifiers,
  except where R5's shift applies, so the published rules have the numbers the team member saw.
  Publishing a draft and publishing the same content in one sitting can still give different
  numbers, such as `rule-7` instead of `rule-1`, after rules were deleted in an earlier sitting.
  The behaviour serviceBW sees is the same (SC-003).

**Alternatives considered**:
- *Renumbering from 1 when publishing*: rejected. The default names ("Rule 07") would no longer
  match their identifiers, and the editor's numbers would change under the team member.
- *Storing every identifier a draft ever had*: rejected. It protects nothing that anyone could
  have keyed on.

---

## R5. Publishing a draft through the existing save path

**Decision**: `drafts.publish_draft()` runs the create path's validators, then the existing
`form_connections.create_revision()`, extended by an optional `DraftGuard(version, replace)`:
1. **Check**: `clean_name`, `clean_servicebw_form`, `clean_documents` and `rules.clean_rules(…,
   main_branch_id=None)`, then `rules.check_first_save(save, counters)` with the draft's counters
   (R3, R4). The draft version is checked before these (R6).
2. **Reserve**: under the row lock, check the guard again: the row is still a draft, and the
   version is still the one loaded unless `replace`. Then insert the next revision, not current,
   and commit. On a draft with no revision, that is revision 1.
3. **Configure**: create its EUDIPLO configuration with no transaction held. If EUDIPLO fails,
   the revision is removed again, as today.
4. **Make current**: lock the row again and check the guard again. If it fails, the configuration
   is deleted and the revision removed, as for a refused rules save. Otherwise, in one commit:
   - make the revision current;
   - write rule set 1, the branch rows and the counters (`rules.first_rule_set()`);
   - apply the name and the serviceBW form;
   - set `published_at`, and clear `draft` and `draft_version`.

The answer is the published `FormConnection`, with its URLs (FR-009).

**Rationale**:
- **One implementation of saving.** The checks, the revision numbering, the EUDIPLO set-up, the
  clean-up on failure and the first rule set are the functions that creating and editing use
  today (spec Assumptions). The guard adds only the draft's own conditions.
- **Reserve before calling EUDIPLO** (ARCHITECTURE, "Transactions around EUDIPLO calls"). Two
  team members publishing the same draft get different revision numbers, and so different
  configurations. The first to commit publishes. The second fails step 4's guard with
  `409 draft_published`, and deletes only its own configuration (FR-023). The winner's is
  untouched.
- **A draft saved meanwhile.** If another team member saves the draft during the EUDIPLO call,
  step 4 sees the new version and refuses with `409 draft_changed`, unless `replace` (FR-022).
- **A draft deleted meanwhile.** If another team member deletes the draft during the call, step 4
  finds no row and answers `404`. The existing clean-up deletes the configuration (R7).
- **Revision numbers are internal.** If a concurrent attempt still holds revision 1 when
  publishing reserves, the published connection's first revision is revision 2. Nothing outside
  the database sees revision numbers, apart from the configuration's id.

**Alternatives considered**:
- *`create_form_connection()` under the draft's id*: rejected. It creates the configuration
  before it has a row to reserve on, which is the race of R1.
- *A "publishing" flag on the draft row while EUDIPLO answers*: rejected. A crash leaves the flag
  set, which would then need an expiry, and the second team member would meet a refusal that
  isn't one of FR-022 to FR-024.

---

## R6. Draft versions and the conflict of two team members

**Decision**:
- **Versions.** A new draft has `draft_version = 1`, and every successful save adds 1 (FR-022).
- **The request.** `PUT …/draft` and `POST …/publish` carry the version the editor loaded,
  `version`, and `replace: bool`.
- **When the version is checked.** As for spec 002's `409 rules_changed`, it is checked in the
  read transaction before the content is checked, so that a stale editor meets the conflict and
  not a refusal its staleness causes. It is checked again under the row lock.
- **The answers.**

  | Situation | Answer | Message |
  |---|---|---|
  | Version outdated, `replace` false | `409 draft_changed` | "Another team member saved this draft after you opened it." It names no variants, since no variant of a draft has a pull URL (FR-022) |
  | The draft was published since | `409 draft_published` | "This draft has been published since you opened it." Also with `replace`: a published connection never becomes a draft again (FR-023) |
  | The draft was deleted since | `404 Not found` | The editor knows it opened a draft, so it turns the 404 into "This draft has been deleted since you opened it." (FR-024) |

- **The editor's choices.**
  - "Reload" fetches the draft again, opens it at its stored step, and drops the local draft.
  - "Replace their changes" sends the same save or publish with `replace: true`.
  - "Open the connection" leads to the published connection's details.
  - "Save as new draft" sends the work to `POST …/drafts`.

  [ui-screens.md](contracts/ui-screens.md), S2, has the dialogs.

**Rationale**:
- **Spec 002's approach, reused.** The user asked for it: a version, refusal before anything is
  stored, and the choice between "Reload" and "Replace their changes".
- **The whole draft is the unit** (FR-022). A draft holds no live state that a merge could
  protect, so the server merges nothing.

**Alternatives considered**:
- *`ETag` / `If-Match` headers*: rejected. `apiFetch` and the rules conflict carry their versions
  in the body, so a header would be a second mechanism.
- *`updated_at` as the version*: rejected. It is a timestamp with database clock precision, and
  any column change (`onupdate`) would bump it.
- *Silently merging the name and the documents, as published connections do* (FR-025): rejected
  for drafts. The spec makes the whole draft one unit.

---

## R7. Deleting a draft removes the row

**Decision**: `DELETE /api/form-connections/{id}/draft` locks the row and refuses a connection
that is no longer a draft (`409 draft_published`). Otherwise it deletes the row, together with
any revision that a publish in flight has reserved (R5). Requests, branch rows and rule sets
don't exist for a draft. The draft's URLs then answer `404` like any unknown id: they start no
request (FR-010). Nothing else changes.

**Rationale**:
- **"Removed for good."** FR-010 asks that the draft and its content be removed for good. A
  tombstone row would keep the content or need a half-cleared state that the CHECK constraint
  (R1) would have to allow.
- **Nothing outside depends on the row.** A deleted published connection keeps its row so that
  URLs serviceBW knows keep answering "unavailable". A draft's URLs were never shown (FR-006), so
  no serviceBW form knows them.
- **A publish in flight.** It finds no row at its final lock, answers `404` and deletes its own
  EUDIPLO configuration, which is the existing path of `create_revision()`.

**Alternatives considered**:
- *Soft delete, as for published connections*: rejected for the reasons above.
- *`DELETE /api/form-connections/{id}` for both kinds*: rejected (R2). A team member who confirmed
  deleting a draft could take down a connection that another team member had just published.

---

## R8. Drafts and the code that serves published connections

**Decision**:
- **Connection URLs.** `document_requests._usable_form_connection()` answers a draft's trigger URL
  and every pull URL with `409` and the unchanged `UNAVAILABLE_DETAIL`, as for a deactivated
  connection (FR-006). The check comes before anything reads a revision.
- **Deleted drafts** answer `404` (R7).
- **Worker.** The worker's re-sync step (`resync_configs`) selects published connections only, and
  `resync_config()` returns early for a draft. The other steps need nothing: a draft has no
  requests, and a reserved revision of a draft is never "older than the current one".
- **Published-only paths.** `update_form_connection()`, deactivating, activating and deleting a
  published connection refuse a draft (`409 not_published`). The readers of `current_revision`
  and `current_rule_set` (`_current_revision`, `rules.current_branches`, the trigger) are reached
  only for published connections. They narrow the now-optional values with a guard, which mypy
  enforces.

**Rationale**:
- **The same answer as a deactivated connection.** FR-006 asks for it. It also tells a caller
  nothing about whether a draft exists, and serviceBW's contract stays as it is (SC-007).
- **The worker never touches a draft.** So FR-005 holds there too: nothing is set up with EUDIPLO
  for a draft.

**Alternatives considered**:
- *`is_active = false` for drafts, so the existing check covers the URLs*: rejected. The overview
  and the details read `is_active` as "deactivated by the team", and activating a draft would then
  make its URLs reach code that needs a revision.

---

## R9. Local drafts: `localStorage`, one entry per flow

**Decision**: the create flow keeps its unsaved work in `window.localStorage` (FR-014).
- **One entry per local draft.** The storage key is
  `connection-portal:local-draft:v1:<username>:<flow key>`. The flow key is `new-<uuid>` for a
  connection that was never saved, and `draft-<id>` for a stored draft (FR-015).
- **The value** is a versioned JSON record: the content as a draft save would store it, the step,
  the stored draft's id and the version it was loaded at, and the time of the last change. The
  shape is in [contracts/local-drafts.md](contracts/local-drafts.md).
- **When it is written.** Only while the content differs from what the flow started with. That is
  the stored draft as loaded, or the empty flow, so opening a draft and leaving changes nothing
  (edge case; FR-014). The first change writes at once, and later ones at most once a second.
  Pending writes are flushed on `pagehide`, when the page becomes hidden, and when the flow is
  left.
- **An open rule editor.** Its rule counts as kept, complete or not, as "Save and exit" would
  keep it (FR-012). Typing in the rule editor is protected too.
- **When it is removed.** A content that returns to the starting point removes the entry. So does
  a successful save or publish (FR-018).
- **Expiry.** Entries without a change for 30 days are removed whenever local drafts are listed
  (FR-018).
- **Unreadable entries.** Every read validates the record. An entry that can't be read (another
  format version, corrupted, another app's data) is ignored, and removed when it carries this
  app's prefix.
- **A browser without storage.** If storage is blocked, full or missing (private windows, a
  quota), the flow works without local drafts and says nothing. Every access is in `try/catch`
  (FR-021).

**Rationale**:
- **Synchronous writes.** `localStorage` writes synchronously, so the flush on `pagehide`
  completes before the page goes. An asynchronous IndexedDB transaction started there may not.
  This is what bounds the loss to the last write interval, which is well under the spec's 5
  seconds (SC-004).
- **Size.** At spec 002's limits, a draft is under 1 MB of JSON, and in practice a few kilobytes.
  The origin's 5 MB quota holds several. A failed write is FR-021's case.
- **Per-entry keys.** Two tabs on the same connection write the same key, and the latest change
  wins (edge case). The overview lists entries by key prefix.
- **Only the record leaves its entry.** The record holds the connection's set-up, never personas,
  findings or citizen data (FR-015, FR-020).

**Alternatives considered**:
- *IndexedDB*: rejected. Its writes are asynchronous, which matters for the flush on `pagehide`,
  and it would add more code for no capacity this feature needs.
- *`sessionStorage`*: rejected. It is gone once the tab is closed, which is one of the accidents
  to recover from.
- *Saving to the server automatically*: rejected. FR-020 says that only saving or publishing,
  chosen by the team member, sends the work.
- *Writing on every change*: rejected. At the limits, serialising on every keystroke would make
  the editor stutter. The throttle bounds the cost and the loss.

---

## R10. Routes: the flow's URL names its local draft

**Decision**:
- **A new connection.** The create flow at `/form-connections/new`, and the first-connection
  screen at `/get-started`, put their flow key into the URL as `?local=<flow key>`, with `replace`
  and without remounting. A URL whose key has a local draft for the signed-in account opens that
  local draft directly: a reload, a restored tab, or the return from the sign-in screen after the
  session expired (edge case) continues where the team member was.
- **Resuming from an offer.** "Resume" on the overview or the first-connection screen leads to
  `/form-connections/new?local=<flow key>`, also for a stored draft's local draft (`draft-<id>`).
  The flow opens from the local draft alone, at its step (FR-017). Its first save meets FR-022 to
  FR-024 if the stored draft has changed, been published or been deleted since (R6).
- **Continuing a stored draft.** "Continue" opens `/form-connections/:id/edit`. For a draft, that
  is the create flow at the draft's stored step (FR-008). If the device holds a different local
  draft for it, a dialog first offers to restore or discard the unsaved changes (FR-016).
- **No new routes.** The routes and `ROUTES` stay as they are, and the query parameter is
  `LOCAL_DRAFT_PARAM = 'local'`.

**Rationale**:
- **The sign-in round trip.** `RequireSignIn` returns to the pathname, search and hash after a
  sign-in, not to the router state. A search parameter therefore survives the session expiring
  (edge case "Sign-in session expires while editing").
- **One way to resume.** The flow opens from the record alone, without first reading the stored
  draft, so a stored draft that was published or deleted meanwhile reaches the editor's conflict
  dialogs (R6). It never gets stuck on a page that can't open.
- **Same route, same component.** React keeps the editor mounted when only the search changes.
  A second route would remount the editor and lose its state.

**Alternatives considered**:
- *Router state*: rejected. It is lost at the sign-in round trip.
- *A route of its own, such as `/local-drafts/:key`*: rejected. A new connection's flow would have
  to change routes at its first write, which remounts the editor.
- *Opening the stored draft and then applying the local draft*: kept for "Continue" (FR-016's
  question), but not for "Resume". A stored draft that was published or deleted would leave
  "Resume" with no page to open.

---

## R11. Local drafts belong to an account; signing out discards them

**Decision**:
- **Per account.** Entries are keyed by the signed-in team member's username, which is unique and
  stable (`user_accounts.username`). The flow writes and the offers list only the current
  account's entries (FR-019).
- **Signing out.** "Log out" in `UserMenu` first flushes pending writes. If the account then has
  local drafts, a dialog warns that logging out discards the unsaved work on this device (count
  and names). Confirming removes the account's entries, then signs out. Until that account signs
  in again, the store refuses writes for it, so the editor's flush on unmount can't bring an
  entry back.
- **An expired session** (`useSignOutOnUnauthorized`, a `401`) keeps them (FR-019).

**Rationale**:
- **No API change.** The username is already in `UserView`. Every team member can open every
  stored draft (FR-027), so scoping local drafts to an account is about whom to offer them to, not
  about secrecy.
- **Warning before discarding.** FR-019 asks for it. Flushing first makes the warning count work
  of the last second too.

**Alternatives considered**:
- *Adding the account's id to `/api/auth/me`*: rejected. It changes the contract to protect only
  against a deleted account being recreated with the same username, whose new owner would then be
  offered local drafts of the team's own connections.
- *Discarding in `CurrentUserProvider.signOut()`*: rejected. That function also runs when the
  session expires, and an expired session must keep the local drafts.

**Known limit**: another open tab of the same account, in which the team member goes on editing
after logging out elsewhere, writes its entry again before its next API call signs it out. The
entry is then offered at the next sign-in. This is accepted, and the quickstart notes it.

---

## R12. The editor: three origins, "Save and exit", restoring

**Decision**: the editor page (`pages/FormConnectionEditor/`) gets an explicit origin:
- `new`: `/form-connections/new` and `/get-started`;
- `draft`: a stored draft;
- `published`: the edit flow of spec 001 and 002, which stays as it is (FR-026).

The `new` and `draft` origins behave as follows:
- **"Save and exit" in every step's footer** (FR-001). It leaves the rule editor through the
  existing question "Save changes to Rule 01?", as publishing does (FR-012), with a new
  `LeaveEditorAction` `{type: 'saveAndExit'}`.
- **The name.** It is checked as in step 1 (`validateConnection`'s name part only). If the name
  is missing, the flow goes to step 1 and shows the message there (edge case).
- **Saving.** It sends `POST …/drafts` (origin `new`) or `PUT …/{id}/draft` (origin `draft`)
  with `draftPayload()`: the editor state, the rules with the open rule kept, the step, and the
  version.
- **After a save.** The local draft is removed, and the flow goes to the overview, which says
  "Draft <name> saved."
- **A failed save** keeps the team member in the flow (FR-013):
  - `400` shows the server's message in an alert above the step's content;
  - a network failure or `5xx` shows the "Couldn't save" alert with "Try again" and the error ID;
  - a conflict opens the conflict dialog (R6).
- **Publishing.**
  - Origin `new` keeps `POST /api/form-connections`.
  - Origin `draft` sends `POST …/{id}/publish` with `createPayload()`, `version` and `replace`. Its
    conflicts appear in the publish dialog, where `409 rules_changed` appears today (spec 002,
    W9).
- **Where it opens.** A stored draft opens at its saved step. A step it can't open falls back:
  the test step without any rule becomes the rules step.
- **Branch keys.** The draft's variants get the editor's keys: `main` for the main variant, and
  `newBranchKey()` for the others.
- **Restoring.** On the edit route of a draft, `FormConnectionEditPage` compares the local draft
  with the stored content. If they differ, it asks to restore or discard before mounting the
  editor (FR-016). If they are equal, it removes the local draft without asking.
- **Data the catalog dropped.** The documents step lists, in a note, any document type or field
  of the draft that the catalog no longer has, with "Remove". "Save and exit" and publishing
  refuse while such data remains, with the server's message (edge case; FR-003).

**Rationale**:
- **No second editor.** The create flow, its checks and its dialogs serve drafts unchanged, and
  only the save and the exit are new.
- **No change for published connections.** Making the origin explicit keeps the edit flow of a
  published connection exactly as it is: no "Save and exit", no local draft, the same "Save"
  (FR-026).

**Alternatives considered**:
- *Saving a draft without leaving the flow ("Save draft")*: not asked for. The spec's action is
  "Save and exit", and it can be added later without a change to the API.
- *Restoring a local draft silently on the edit route*: rejected. FR-016 asks to offer it, and
  the stored draft may have been changed by a colleague since.

---

## R13. UI: Figma's drafts, and what has no frame

**Decision**:
- **Figma's drafts.** Spec 002, contracts/ui-screens.md, F28 lists the Figma nodes of the "Draft"
  badge and of "Save and exit" in every footer, in file `s8mU9oJDq3411e8bxMjQO9`. Both are now
  built: F28 and spec 004's O3 are reversed for the create flow.
  - The badge is KERN's small info badge "Draft", with its icon, as design-notes.md §2 of spec 001
    already records (`feedback-info`), so a draft is never told apart by colour alone (FR-007).
  - The save failure follows Figma U28 `6197:11098` ("Couldn't save. Check your internet
    connection and try again." with "Try again"), which spec 002 left out as F23.
  - The overview's hint becomes S3's "Pick up your draft or connect another form." while any
    stored or local draft exists.
- **What has no frame** gets W-items in [ui-screens.md](contracts/ui-screens.md):
  - the local drafts' offer;
  - the restore question;
  - the conflict dialogs;
  - the details of a draft;
  - the sign-out warning;
  - the note on data the catalog dropped.

  They are built from KERN's alert, dialog and button patterns and the existing components
  (`ConfirmDialog`, `KernBadge`, `ErrorNoticeText`, `DocumentsSummary`, `RulesSummary`).
- **Step 1's note** stays "Nothing goes live until you publish." Figma's "Starts as a draft." stays
  out, since nothing is stored until "Save and exit".

**Rationale**: as in specs 002 to 004, spec.md decides behaviour and wording and Figma decides
layout. The Figma file hasn't changed since spec 002's audit, so no new audit is needed. The UI
tasks follow `docs/FIGMA-WORKFLOW.md` on the F28 nodes.

---

## R14. Testing

**Decision**:
- **Backend (pytest, a practice, run anyway)**:
  - `tests/api/test_form_connection_drafts.py`:
    - creating, saving, listing, getting and deleting drafts;
    - every FR-004 incomplete state accepted, and every FR-003 malformed state refused with its
      message;
    - the version conflicts with and without `replace`, published and deleted meanwhile;
    - publishing, including its refusals;
    - the `not_published` and `draft_published` boundaries;
    - the first-connection count.
  - A **parity test** (SC-003) runs a table of payloads, valid ones and one per refusal, through
    `POST /api/form-connections` and through draft creation followed by publishing. It compares
    status, `error`, `message`, the published shape and the rule set.
  - **Concurrency tests** with the fake EUDIPLO, by stepping the service functions:
    - two publishes of one draft: the second gets `409 draft_published`, and the winner's
      configuration is neither overwritten nor deleted;
    - a save during a publish: the publish gets `draft_changed`;
    - a delete during a publish: the publish gets `404` and deletes its configuration.
  - `tests/api/test_connect.py`: a draft's trigger and pull URLs answer `409 unavailable`, and
    a deleted draft's `404`. No EUDIPLO call is made (SC-002).
  - `tests/unit/test_draft_validation.py` covers the `complete=False` checks.
  - A worker test shows that re-syncing skips drafts.
- **Frontend (Vitest, the gate)**:
  - every module of `src/utils/localDrafts/`, with an in-memory `StorageLike` (format,
    validation, keys, expiry, the account's entries, the closed account, quota failures);
  - the editor's new pure functions in `utils.ts` (`draftPayload`, `conflictOf`, the initial
    states from a draft and from a local draft, `openingStepOf`, `localContentOf` with a kept
    rule);
  - the overview's and the details' new helpers.

  The hooks and components are glue, covered by lint, the build and the quickstart, as in specs
  003 and 004.
- **Manual scenarios**: [quickstart.md](quickstart.md) V1–V14 cover what only a browser shows:
  - a killed browser;
  - two browsers;
  - a blocked storage;
  - the sign-out warning;
  - an expired session;
  - accessibility (FR-028).

**Rationale**: the constitution makes Vitest a gate for pure logic in `node`, without jsdom. The
storage logic is therefore written against an injected `StorageLike`, so it is pure.

---

## R15. Migration

**Decision**: one Alembic revision after `d5a4c9462af7`, generated with `--autogenerate` and then
corrected by hand (constitution V):
1. **Generated**: add `published_at` (nullable, indexed), `draft` (JSONB, nullable) and
   `draft_version` (integer, nullable). Make `current_revision` and `current_rule_set` nullable.
2. **Added by hand**, which autogenerate doesn't emit:
   - `UPDATE form_connections SET published_at = created_at`, since every existing row is
     published (FR-026);
   - the CHECK constraint `ck_form_connections_draft_or_published` (data-model.md).
3. **Downgrade**: delete the drafts, drop the constraint and the columns, and make the two columns
   non-null again.

**Rationale**: existing connections stay published and unchanged (SC-007). The constraint makes
the two states impossible to mix, whichever code path writes the row.

---

## R16. Points to check while coding

- **Discriminated union in FastAPI.** Check that the union of `FormConnection` and
  `FormConnectionDraft`, discriminated by `status`, serialises through
  `ApiResponse[Annotated[…, Field(discriminator='status')]]`, and that the OpenAPI document stays
  valid.
- **Rendering an incomplete rule.** `RuleRow` and `RulesSummary` render a rule without data,
  condition or message on the details page. The rules step does, after "Save changes" kept such a
  rule.
- **Search parameters.** `useSearchParams`' `replace` on `/form-connections/new` and `/get-started`
  doesn't remount the editor, and it doesn't add a history entry.
- **Flushing on `pagehide`.** The flush must also run in Firefox's back-forward cache, where
  `unload` doesn't fire.
- **The request size limit.** nginx's default `client_max_body_size` (1 MB) limits a draft save
  as it already limits publishing at spec 002's extreme sizes. Nothing changes here, but the
  quickstart notes it.
- **`crypto.randomUUID()`.** It needs a secure context: `https` in production and `localhost` in
  development. Both qualify.
