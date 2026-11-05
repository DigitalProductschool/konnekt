# Contract: screens of the management interface

**Requirements**: FR-002, FR-004, FR-006, FR-023, FR-025 to FR-028, FR-030, FR-031, FR-042.
**Decisions**: research R4, R7, R11, R13. There is no Figma frame for this feature: the screens
are decided here, built from KERN's components (`docs/KERN-DESIGN-SYSTEM.md`) in the project's
existing patterns, and must meet WCAG 2.1 AA.

## Routes (`src/constants.ts`, `App.tsx`)

| Route | Page folder | Layout | Guard |
|---|---|---|---|
| `/authorize` | `pages/Authorize/` | `AuthLayout`-like centred card inside `AppLayout` (signed in) | `RequireSignIn`, keeps the query string through the sign-in |
| `/account` | `pages/Account/` | `AppLayout` | `RequireSignIn` |
| `/approvals/:id` | `pages/Approval/` | `AppLayout` | `RequireSignIn` |
| `/form-connections/:id/edit?step=rules&variant=…&item=…` | existing `FormConnectionEdit` | as today | as today |

Every page: `useDocumentTitle()`, one `h1` (`PageTitle`), failures through
`useSignOutOnUnauthorized()` and `errorNoticeOf()` / `ErrorNoticeText`.

## S1. The consent page (`/authorize`; FR-002)

- **Title**: "Allow access for {client_name}?" (`h1`). Below: "{client_name} wants to act on
  your behalf in the Connection Portal. Choose what it may do."
- **Access levels**: a KERN radio group (`AccessLevelChoice`, shared with S2 and S3) with the
  three levels, each a label and a description:
  - "Read only": "Find and read connections, variants and rules, run the rule checks and test
    fictitious applicants. Nothing changes."
  - "Read and edit drafts": "Also create and change drafts, and ask you to publish or delete a
    draft. Published connections stay read-only."
  - "Read, edit drafts and manage live connections": "Also ask you to deactivate, reactivate or
    delete published connections. Each of these needs your approval here."
  The level the request's `scope` asks for is preselected; "Read only" otherwise. A step-up
  request shows a line: "{client_name} is asking for more access than it has."
- **Actions**: "Allow" (`kern-btn--primary`) and "Deny" (`kern-btn--secondary`). Both navigate to
  the client's redirect URL (`window.location.assign`); after "Allow", a line "You can go back to
  {client_name}." shows while the browser leaves.
- **Errors**: a bad request (`400 invalid_request`, `404 invalid_client`) shows the message in a
  KERN alert in place of the form, with no redirect: "This sign-in request isn't valid. Start
  again from your agent."
- **Footer line**: "Signed in as {username}. You can change or revoke this access later on your
  user page." with a link to `/account`.

## S2. The user page (`/account`; FR-004, FR-006)

- **Entry**: the user menu (`UserMenu`) gets an item "Your account" above "Log out"; it is a
  React Router `Link` with `kern-link` styling inside the menu.
- **Title**: "Your account" (`h1`). Subtitle: "Signed in as {username}."
- **Section "Connected agents"**: a list (`AgentAccessList`, each row `AgentAccessRow`) of the
  `oauth` items: client name, access level (the level's name), "Connected {date}", "Last used
  {relative}" or "Never used", and a ⋯ menu (the project's menu pattern) with "Change access
  level" and "Revoke". Empty state: "No agent is connected yet. Add the Connection Portal's MCP
  server to your agent to connect it." with a link to the README section.
- **Section "Personal access tokens"**: the `token` items: name, access level, "Created {date}",
  "Expires {date}", "Last used …", the same menu, and a button "Create token".
- **Change access level**: a dialog (`ConfirmDialog`-based, `AccessLevelDialog`) with
  `AccessLevelChoice`, the current level selected; "Save" sends `PUT`. Success toast: "Access
  level changed. It applies from the agent's next call."
- **Revoke**: `ConfirmDialog`: "Revoke access for {name}?" / "The agent's next call will be
  refused, and its waiting approval requests are cancelled." Buttons "Revoke" (danger) and
  "Cancel".
- **Create token**: a dialog with a name field (`TextField`, required, 100 characters),
  `AccessLevelChoice`, and an expiry choice (KERN select: 7, 30, 90 days; the maximum from the
  settings is 90). On success, a second dialog shows the token once in a `CopyableUrl`-like
  field with "Copy", and the text "Copy it now. It won't be shown again." The token is in a
  read-only input, not in a toast.
- **Accessibility**: the lists are `ul` with one `li` per item; menus follow the existing
  `RuleMenu` pattern; dialogs are the existing `ConfirmDialog` with focus management; dates have
  `datetime` attributes.

## S3. The approval page (`/approvals/:id`; FR-023 to FR-027)

- **Loading and errors**: `PageLoader`; `403 not_yours` shows "This request was made for another
  team member. Only they can approve it."; `404` shows the not-found screen.
- **Title** (`h1`) by action: "Publish '{name}'?", "Delete the draft '{name}'?", "Deactivate
  '{name}'?", "Reactivate '{name}'?", "Delete '{name}'?". Subtitle: "Requested by {client_name}
  · expires at {time}" (`client_name` from the request; the agent's authorization name).
- **Body** by action:
  - `publish`: the description line (as the details header shows it: one line, cut with "…",
    absent when empty), `DocumentsSummary` (documents and fields), `RulesSummaryContent` per
    variant, and a "Rule checks" section: `useRuleChecks()` over the draft's branches with the
    catalog and value sets; while pending, "Checking the rules…" in a polite status region;
    then per variant `dialogLineOf()`'s line, or "No findings." The findings never block
    approving.
  - `delete_draft`: the description line, "Last saved {date}", and the sentence "Its content will
    be gone for good."
  - `deactivate`: the description line, "These connection URLs will answer 'unavailable' until
    the connection is reactivated:" with the trigger URL and each variant's pull URL in the
    details page's `LinkCard`s, and "Requests in progress are cancelled."
  - `reactivate`: the description line, "These connection URLs will work again:" with the URLs.
  - `delete`: the description line, "These connection URLs will stop working for good:" with the
    URLs, "Requests in progress are cancelled." and "Deleting can't be undone."
- **Actions**: "Approve" (`kern-btn--primary`; for `delete` and `delete_draft`, the danger
  variant) and "Decline" (`kern-btn--secondary`). While a call runs, both are disabled and a
  status region says "Publishing…" / "Working…".
- **Outcome states** (replace the body's actions, keep the title):
  - `done`: a success alert "Published." (or the action's word) and, after publishing or
    reactivating, the connection URLs in `LinkCard`s and a link "Open the connection";
  - `declined`: "You declined this request. Nothing has changed.";
  - `expired`: "This request expired at {time}. Nothing has changed. The agent can ask again.";
  - `replaced`: "The agent made a newer request for this action.";
  - `cancelled`: by reason: "The draft has changed since the agent asked. Nothing has changed;
    the agent has to ask again." / "The draft has been published since the agent asked." / "The
    draft has been deleted since the agent asked." / "The connection was {deactivated |
    reactivated} in the meantime." / "The connection has been deleted in the meantime." / "The
    agent's access has changed, so this request was cancelled." / "The agent's access was
    revoked, so this request was cancelled.";
  - `failed` (status waiting with a failure): an error alert with the service's message and the
    error ID (`ErrorNoticeText`), the body as before, and "Try again" in place of "Approve",
    while the request is valid.
- A page left open past the expiry: "Approve" answers `409 approval_expired`, and the page
  switches to the expired state from the answer.

## S4. "Copy link" in the rules step (FR-028)

- `RuleMenu`, `GroupMenu` (groups and sub-groups) and `BranchMenu` (the variant tab's ⋯) get
  "Copy link" as their last entry before the destructive ones, with the existing menu's
  keyboard behaviour.
- The link is built in `RulesStep/utils.ts` (`linkOf(origin, connectionId, variantId,
  itemId?)`, pure, tested) from `window.location.origin`.
- Success shows the step's toast: "Link copied." Failure: "The link couldn't be copied. Copy it
  from the address bar after opening the item." Both are announced through the toast's live
  region.
- The create flow of a new, unsaved connection has no stored id, so its menus don't offer "Copy
  link"; a stored draft's and a published connection's do.

## S5. Opening a link (FR-030, FR-031)

- `FormConnectionEdit` reads `step`, `variant` and `item`. `step=rules` opens the rules step (a
  draft: the create flow; published: the edit flow); the variant's tab is opened by id, and the
  item is brought into view and focused (`goToItem()`), after the step has rendered.
- A variant that isn't there: a KERN warning notice at the top of the rules step, "This link
  points to a variant that no longer exists.", and the first variant is shown. An item that
  isn't there in the variant: "This link points to a rule or group that no longer exists.", the
  variant is shown. The notice has a "Dismiss" button and is announced.
- A connection that isn't there: the existing not-found screen, unchanged.
- The `?step=` parameter also serves the details page's buttons, which may keep router state.

## S6. The overview and details: unchanged

No indication that an agent changed a draft (spec, decision 10). The details page's "Edit"
buttons keep working.

## Copy conventions

As in the rest of the interface: sentence case, typographic apostrophes, dates with the
project's formatting helpers, "variant" and "Standard", "connection" for form connection,
"draft" for a stored draft. Access levels are always named with their full names.
