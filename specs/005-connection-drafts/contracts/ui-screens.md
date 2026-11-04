# Contract: management UI screens, with drafts and local drafts

**Users**: signed-in DO.IT team members (FR-027). **Requirements**: FR-001, FR-007, FR-008,
FR-010 to FR-013, FR-016 to FR-019, FR-022 to FR-024, FR-026, FR-028; SC-001, SC-004 to SC-006,
SC-008; US1 to US3. **Decisions**: research R6, R9 to R13.

This extends the screen contracts of
[spec 001](../../001-servicebw-eudi-middleware/contracts/ui-screens.md),
[spec 002](../../002-connection-rules/contracts/ui-screens.md),
[spec 003](../../003-rule-consistency-checks/contracts/ui-screens.md) and
[spec 004](../../004-rule-test-personas/contracts/ui-screens.md). They still apply wherever this
contract doesn't say otherwise. Every screen gets its data only through
[management-api.md](management-api.md) and the hooks of [local-drafts.md](local-drafts.md).

**What decides what**: spec.md, with its Clarifications, decides behaviour and wording. Figma
decides layout and styling only. The file is `s8mU9oJDq3411e8bxMjQO9`, and spec 002's F28 row lists
its nodes for the "Draft" badge and "Save and exit". Items without a Figma frame are the W-items
below, built from KERN patterns and the existing components. The UI says "connection" and
"variant", and the main variant is "Standard" until it is renamed.

## Superseded decisions

| Item | Was | Now |
|---|---|---|
| Spec 001, design-notes §6 and §8 ("no drafts, no 'Save and exit'") | Left out | Built for the create flow: new connections and stored drafts (S0, S1) |
| Spec 002, ui-screens F28 | No "Draft" badge, no "Save and exit" | Both built as in Figma's F28 nodes, in the create flow only. The edit flow of a published connection stays without them (FR-026) |
| Spec 002, ui-screens F23 | No "Couldn't save" on the Rules step | U28 `6197:11098`'s alert shows when "Save and exit" fails, on every step (S1, W3) |
| Spec 004, ui-screens O3 | "Save and exit" left out on purpose | Built (S0) |
| Spec 001, design-notes §5, overview hint | "Open a connection to copy its links, or connect another form." | S3's "Pick up your draft or connect another form." while any stored or local draft exists, and the old hint otherwise (S3) |

## Routes

No new route (research R10). The wizard's routes read the query parameter `local`.

| Route | Screen | What changes |
|---|---|---|
| `/form-connections/new` | Create flow | Writes its flow key into the URL as `?local=<flowKey>`, and opens from that key's local draft if it exists (S0, R10) |
| `/get-started` | First connection | Also `?local=`. Offers the account's other local drafts above step 1 (S4) |
| `/` | Overview | Drafts in the list (S3), local drafts' offer (S4), "Draft saved" status |
| `/form-connections/:id/edit` | Edit flow / create flow of a stored draft | A draft opens the create flow at its stored step, after the restore question when needed (S5). A published connection: unchanged |
| `/form-connections/:id` | Details | A draft shows the draft details (S6) |

---

## S0. Wizard shell for a new connection and a stored draft

- **"Save and exit" in the footer of every step** (FR-001; Figma F28 nodes, such as U09
  `6235:18684` and U11 `6348:40218`):
  - it is a secondary button, before the step's primary action, with Back on the left as today;
  - on step 1, without Back, it stands before "Continue";
  - on the documents and the rules steps it sits beside "… without rules" and "Add rules" /
    "Test rules", in Figma's order;
  - it is never disabled: while a save runs it is `aria-disabled` and reads "Saving…".
- **"Draft" badge** in the header (`TopBar`'s `badge`), for a stored draft's flow only (FR-007;
  F28 badge nodes): KERN's small info badge with its icon, saying "Draft". A new connection that
  was never saved has no badge, since it isn't stored yet.
- **The edit flow of a published connection** keeps spec 002's and spec 004's shell, without
  "Save and exit" or a badge (FR-026).
- **Publish** of a stored draft is spec 004's "Publish" on the test step and "Publish without rules"
  on the documents and the rules steps, with the same publish dialog. Conflicts appear in that
  dialog (S2).
- **Where a stored draft opens**: at the step it was saved in, or at the rules step if it was
  saved in the test step and has no rule any more (FR-008, R12). The personas are generated anew,
  and the rule checks run again (spec edge cases).

## S1. "Save and exit" (FR-001, FR-012, FR-013)

1. **An open rule editor with changes** asks spec 002's "Save changes to Rule 01?" first. "Save
   changes" keeps the rule as it is, complete or not, and the save goes on. "Discard" drops the
   changes, and the save goes on. Closing the dialog cancels the save.
2. **The name.** If it is missing or too long, the flow goes to step 1, shows the step's message
   under "Form name" ("Enter a name." / "The name can have at most 200 characters."), focuses the
   field, and stores nothing. The local draft keeps the work.
3. **Saving.** The button turns `aria-disabled` and says "Saving…", and a polite status says
   "Saving draft…".
4. **Success.** The local draft is removed, and the overview opens with the polite status "Draft
   <name> saved." (W1).
5. **Failure.** The team member stays in the flow with their work, and the local draft keeps it
   (FR-013):
   - **`400`**: a KERN danger alert above the step's content, under the page title, titled
     "Couldn't save your draft", with the server's message. The focus moves to the alert (W3).
   - **Network failure, `5xx`, `502`/`503`**: the same alert with U28's text, "Couldn't save. Check
     your internet connection and try again.", the error ID on its own line (`ErrorNoticeText`),
     and "Try again", which runs "Save and exit" again (F23 reversed; W3).
   - **`401`**: spec 001's sign-out, then the sign-in. Afterwards the flow's URL brings the team
     member back into the flow with their work (R10).
   - **Conflict**: the conflict dialog (S2).
   - The alert goes when the team member saves again or changes step.

## S2. Conflicts of two team members (FR-022 to FR-024; R6)

A conflict after "Save and exit" opens a `ConfirmDialog`-based **conflict dialog** (W4). After
publishing, the publish dialog shows the same message and buttons in place of "Publish", as it does
for spec 002's `rules_changed` (W9 of spec 002).

| Conflict | Title | Text | Buttons |
|---|---|---|---|
| `draft_changed` | "This draft has changed" | The server's message, then "Reload shows the draft as they saved it and drops your changes. Replace their changes saves your version of the whole draft." | "Reload" (secondary), "Replace their changes" (primary), "Cancel" (tertiary). In the publish dialog, "Replace their changes" publishes |
| `draft_published` | "This draft has been published" | The server's message, then "Your changes weren't saved. Open the connection to see it." | "Open the connection" (primary), "Cancel" |
| `draft_deleted` (a `404`) | "This draft has been deleted" | "This draft has been deleted since you opened it. Save your work as a new draft to keep it." | "Save as new draft" (primary), "Cancel" |

- **"Reload"** fetches the draft again, opens the flow at its stored step with the focus on the
  page title (as spec 002's reload does), and removes the local draft.
- **"Replace their changes"** sends the same save or publish with `replace: true`. If the save
  meets another conflict, it shows that conflict.
- **"Open the connection"** removes the local draft and opens the published connection's details.
- **"Save as new draft"** creates a new draft with the work, removes the old local draft, and
  continues as S1's success.
- **"Cancel"** closes the dialog, and the team member stays in the flow with their work.

## S3. Overview (FR-007, FR-011, SC-005)

- **Drafts in the list.**
  - Drafts are listed with the published connections, ordered by their last save.
  - The status column shows KERN's small info badge "Draft" with its icon, so a draft isn't told
    apart by colour alone.
  - The date reads "Saved 4 Nov 2026" for a draft, and "Edited …" for a published connection as
    before.
  - A draft without a form ID shows "No form ID yet" in its place (W2).
- **Actions of a draft row**: "Continue" (to `/form-connections/:id/edit`, at its stored step) and
  "View" (to its details). Each names the connection for screen readers, as "Edit" and "View" do.
  There is no "Edit" for a draft.
- **The hint** is "Pick up your draft or connect another form." while any stored draft is listed or
  a local draft is offered, and "Open a connection to copy its links, or connect another form."
  otherwise.
- **The "Draft saved" status** after S1 is a polite live region under the page title. It goes at
  the next navigation (W1).
- **First connection** (FR-011): the list counts drafts, so a team whose only connection is a draft
  lands on the overview after signing in.

## S4. Local drafts' offer: overview and first-connection screen (FR-016 to FR-018; SC-004)

A section above the connections list on the overview, and above step 1's card on `/get-started`,
shown while the account has local drafts on this device (W5):
- **Heading** (`h2`): "Unsaved work on this device", with the text "These changes weren't saved.
  Resume to go on, or discard them."
- **One item per local draft**, newest first, as a list (`ul`) of sub-components:
  - the name, or "Untitled connection" when it has none;
  - a line with what it belongs to and when it last changed: "New connection · Last change 4 Nov
    2026, 14:32", or "Draft · Last change 4 Nov 2026, 14:32";
  - **"Resume"**, a link to `/form-connections/new?local=<flowKey>`, which opens the flow at its
    step with its content (FR-017);
  - **"Discard"**, which asks first. Both actions name the connection for screen readers.
- **"Discard" asks first**, in a `ConfirmDialog`: "Discard unsaved work?" / "The unsaved changes to
  <name> will be deleted from this device. This can't be undone." For a stored draft it adds "The
  saved draft stays as it is." The buttons are "Discard" (danger) and "Cancel". Afterwards the item
  goes, a polite status says "Unsaved work discarded.", and the focus moves to the next item's
  "Resume", or to the section's heading.
- **On `/get-started`**, the flow's own local draft isn't listed (`useLocalDrafts(exceptFlowKey)`).
- **Live updates.** The section reflects writes and discards made in other tabs (`storage`
  events).
- **Without storage** the section doesn't show (FR-021).

## S5. Restoring unsaved changes of a stored draft (FR-016, US2-AS6)

When `/form-connections/:id/edit` loads a draft whose local draft differs from the stored content,
a dialog opens before the flow (W6), in the wizard frame with the "Draft" badge:
- **Title**: "Restore your unsaved changes?"
- **Text**: "This device has changes to <name> from 4 Nov 2026, 14:32 that weren't saved."
- **Buttons**:
  - "Restore changes" (primary) opens the flow with the local draft's content and step, at the
    version it was loaded at, so a save meets S2 if the draft has changed since;
  - "Discard them" (secondary) removes the local draft and opens the stored draft.
- **Escape** closes the dialog and opens the stored draft without removing the local draft, which
  is offered again the next time the draft is opened. Only "Discard them" removes it.

## S6. Details of a draft (FR-007, FR-010)

`/form-connections/:id` for a draft (W7):
- **Header**: the name as the page's `h1` (`titleAsHeading`), the "Draft" badge, and the meta
  "Form ID …" or "No form ID yet".
- **Progress**: every step up to and including the stored step is shown as reached. A reached step
  leads to the flow at that step.
- **An info alert**: "This draft isn't live. Its connection links appear once you publish it." No
  connection URLs anywhere (FR-006).
- **Documents and rules**: spec 001's documents card and spec 002's rules card, showing what the
  draft holds, incomplete parts included:
  - a document without fields reads "No data chosen yet";
  - no documents reads "No documents yet";
  - a rule without data, check or message shows the rules step's placeholders;
  - no variant shows a result link.
- **Draft card** in place of the status card:
  - heading "Draft", with the text "Saved 4 Nov 2026, 14:32. Continue to finish and publish it.";
  - **"Continue"** (primary), to the flow at its stored step;
  - **"Delete draft"** (tertiary, delete icon).
  - There is no deactivate or reactivate (FR-007).
- **"Delete draft"** asks in a `ConfirmDialog`: "Delete this draft?" / "<name> will be deleted for
  good. It was never live, so nothing changes for serviceBW." The buttons are "Delete draft"
  (danger) and "Cancel". On success the overview opens. `409 draft_published` shows the dialog's
  error, "This draft has been published since you opened it.", with "Open the connection". A
  `404` says it was already deleted, and leads to the overview.
- **Footer**: "Continue" in place of "Edit documents", and "Create new connection".

## S7. Logging out with local drafts (FR-019)

"Log out" in the user menu first flushes pending writes (local-drafts.md). If the account has
local drafts on this device, a `ConfirmDialog` asks (W8):
- **Title**: "Log out and discard unsaved work?"
- **Text**: "Logging out deletes the unsaved changes on this device to: <name>, <name> and
  <name>." It names at most 5, then "and 3 more". Then "Saved drafts stay as they are."
- **Buttons**: "Log out" (danger) and "Cancel". "Cancel" returns the focus to the user menu's
  button.

Without local drafts, "Log out" signs out at once, as today. An expired session never shows this
dialog and never discards anything.

## S8. Documents step: data the catalog no longer offers (FR-003 edge case)

When a draft requests a document type or a field that the catalog doesn't offer any more, a KERN
warning alert at the top of the documents step lists them (W10):
- **Title**: "The wallet no longer offers some data of this draft"
- **The list**: "Personal ID – Eye colour", or for a whole document "Residence permit".
- **The action**: "Remove it", which removes all of it at once (rules that check it are named
  first, through spec 002's removal dialog).

"Save and exit" and publishing are refused while it remains, with the server's message in S1's
alert or in the publish dialog. The step's cards show only what the catalog offers.

---

## W-items (no Figma frame)

| Item | Where | What |
|---|---|---|
| W1 | S1, S3 | "Draft <name> saved." as a polite status on the overview |
| W2 | S3, S6 | "No form ID yet" for a draft without a form ID |
| W3 | S1 | The "Couldn't save your draft" alert: `400` message, or U28's text with "Try again" and the error ID |
| W4 | S2 | The conflict dialog after "Save and exit", and the publish dialog's conflict states for drafts |
| W5 | S4 | The local drafts' offer section, its items and the discard confirmation |
| W6 | S5 | The restore question |
| W7 | S6 | The details of a draft: info alert, incomplete parts, draft card, delete confirmation |
| W8 | S7 | The sign-out warning |
| W9 | S0 | "Saving…" on "Save and exit" while it runs |
| W10 | S8 | The note on data the catalog dropped |

## Accessibility (FR-028, SC-008)

- **Status by text.** Every draft mark is text with an icon (KERN badge), never colour alone.
- **Dialogs** are `ConfirmDialog` or the publish dialog: native modal, focus inside, Escape
  closes, and the focus returns to the opening control.
- **Status messages** ("Saving draft…", "Draft <name> saved.", "Unsaved work discarded.") are
  polite live regions. Alerts that refuse something take the focus.
- **Controls name their connection.** "Continue", "View", "Resume" and "Discard" carry the
  connection's name for screen readers (`sr-only` inside `kern-btn`, CLAUDE.md).
- **Layout** works at 320 px and 200 % zoom: the footer's three actions wrap as spec 004's do, and
  "Save and exit" keeps its label.
- **Focus rings** show for keyboard focus only (`focus-visible:`).

## Copy

| Key | Text |
|---|---|
| `saveAndExit` | Save and exit |
| `saving` | Saving… |
| `savingStatus` | Saving draft… |
| `draftSaved(name)` | Draft {name} saved. |
| `draftBadge` | Draft |
| `saveErrorTitle` | Couldn't save your draft |
| `saveNetworkError` | Couldn't save. Check your internet connection and try again. |
| `tryAgain` | Try again |
| `untitled` | Untitled connection |
| `noFormId` | No form ID yet |
| `saved(date)` | Saved {date} |
| `continue` | Continue |
| `overviewHintWithDrafts` | Pick up your draft or connect another form. |
| `localTitle` | Unsaved work on this device |
| `localText` | These changes weren't saved. Resume to go on, or discard them. |
| `localNew(date)` / `localDraft(date)` | New connection · Last change {date} / Draft · Last change {date} |
| `resume` / `discard` | Resume / Discard |
| `discardTitle` / `discardText(name)` | Discard unsaved work? / The unsaved changes to {name} will be deleted from this device. This can't be undone. |
| `discarded` | Unsaved work discarded. |
| `restoreTitle` / `restoreText(name, date)` | Restore your unsaved changes? / This device has changes to {name} from {date} that weren't saved. |
| `restore` / `discardThem` | Restore changes / Discard them |
| `draftChangedTitle` / `draftChangedHint` | This draft has changed / Reload shows the draft as they saved it and drops your changes. Replace their changes saves your version of the whole draft. |
| `draftPublishedTitle` / `draftPublishedHint` | This draft has been published / Your changes weren't saved. Open the connection to see it. |
| `draftDeletedTitle` / `draftDeletedText` | This draft has been deleted / This draft has been deleted since you opened it. Save your work as a new draft to keep it. |
| `openConnection` / `saveAsNewDraft` | Open the connection / Save as new draft |
| `draftNotLive` | This draft isn't live. Its connection links appear once you publish it. |
| `draftCardText(date)` | Saved {date}. Continue to finish and publish it. |
| `deleteDraft` / `deleteDraftTitle` / `deleteDraftText(name)` | Delete draft / Delete this draft? / {name} will be deleted for good. It was never live, so nothing changes for serviceBW. |
| `signOutTitle` / `signOutText(names)` | Log out and discard unsaved work? / Logging out deletes the unsaved changes on this device to: {names}. Saved drafts stay as they are. |
| `catalogDroppedTitle` / `removeIt` | The wallet no longer offers some data of this draft / Remove it |

Dates use the overview's format ("4 Nov 2026"), with the time ("14:32", 24-hour, the browser's
time zone) where the copy says "Last change" or "Saved … , time".
