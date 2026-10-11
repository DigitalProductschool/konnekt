# Contract: management UI screens

**Users**: signed-in DO.IT team members. **Requirements**: FR-001 to FR-007, FR-014, FR-022,
SC-009; US1, US3 (the webhook address), US4.
**Decisions**: research R16.

This contract fixes **which screens exist and what they let a team member do**. Layout, wording,
language, KERN components and visual states come from the **Figma design**. The user will share its
URL when the UI tasks start, and where the two differ, the design wins on presentation and this
contract wins on behavior. Every screen gets its data only through
[management-api.md](management-api.md).

| Route | Screen | Requirements |
|---|---|---|
| `/login` | Sign in | FR-007 |
| `/forgot-password` | Forgot password | FR-007 |
| `/` | Form connections overview | FR-006, FR-022; US1, scenarios 6–7; US4, scenario 1 |
| `/get-started` | First connection | FR-001 to FR-003, FR-022; US1, scenario 5 |
| `/form-connections/new` | Create form connection | FR-001 to FR-003; US1, scenarios 1–3 |
| `/form-connections/:id` | Form connection details | FR-004 to FR-006, FR-014; US1, scenarios 1 and 4; US3, scenario 1; US4, scenarios 3–5 |
| `/form-connections/:id/edit` | Edit form connection | FR-003, FR-005; US4, scenario 2 |

Every route except `/login` and `/forgot-password` needs a session. When `GET /api/auth/me`
answers `401`, the app goes to `/login` and returns to the requested route after sign-in. Without
a requested route, sign-in opens `/get-started`, which shows the first-connection screen while no
form connection exists and the overview otherwise (FR-022). `/` doesn't count as a requested
route: it is the app's own address, which the sign-in guard also records when someone simply
opens the app. A signed-in user who opens `/login` or `/forgot-password` goes on to the app in the
same way. Every signed-in screen shows the user's name, a sign-out action that leads to the
sign-in screen, and the product name, which leads to the overview.

## Sign in (`/login`)

- **Fields**: username and password, with a submit action.
- **When sign-in fails**: one generic message ("Invalid username or password"). It never says
  which of the two was wrong.
- **Forgot password**: a link to `/forgot-password`.

## Forgot password (`/forgot-password`)

- The UI can't reset passwords: the operators reset them with the account CLI (research R14). The
  screen tells the team member to ask an administrator, and leads back to sign in.
- Going back to sign in keeps the route that asked for the sign-in.

## Overview (`/`)

- **List**: one row per form connection that isn't deleted, showing its name, serviceBW form,
  and whether it is active or deactivated. The mode (pull or webhook) may be shown as well.
  Selecting a row opens its details.
- **Actions**: "Create form connection" opens `/form-connections/new`.
- **Reached**: through the product name on every signed-in screen, even when no form connection
  exists (US1, scenario 7), and after sign-in when one does (US1, scenario 6).
- **States**: loading, an empty list (with a prompt to create the first form connection), and an
  error.

## First connection (`/get-started`)

- **When it opens**: after a sign-in without a requested route, where `/` counts as none (FR-022).
  It checks once whether any form connection exists, with `GET /api/form-connections`:
  - **None**: it shows the create screen's steps (below), with "Create your first connection" as
    the first step's heading and the page title. Everything else, including the validation and
    what happens after saving, is as on `/form-connections/new` (US1, scenario 5).
  - **Some, or the check fails**: it replaces itself with the overview, which shows its list or
    its error state. The same happens when the address is opened later, for example from a
    bookmark or the browser history (spec Edge Cases).
  - **While it checks**: a loading state ("Loading your connections…") without the overview's
    title and actions (Figma L1, design-notes.md §6).
- **Leaving it**: the product name leads to the overview, which shows its empty state while no
  form connection exists (US1, scenario 7).
- Nothing is stored per account: the screen opens at each sign-in until a form connection exists
  (spec Clarifications, 2026-10-11).

## Create and edit (`/form-connections/new`, `/form-connections/:id/edit`)

The same create screen also serves `/get-started` for the first form connection, with only the
first step's heading and page title changed.

- **Name** (required) and **serviceBW form** (required, free text).
- **Documents**:
  - The team member adds document types from the catalog (`GET /api/document-types`). Each type can
    be added once.
  - Each added document lists the fields of its type to select from (US1, scenario 2).
  - A document can be removed again.
- **Webhook address**: not on this screen. The spec's flow sets it on the details screen, next to
  the URLs, after the first save (US1, FR-004). If the Figma design also puts it here, the
  API's optional `webhook_url` on create supports that.
- **Validation**:
  - Saving is refused while there is no document, while a document has no selected field, or while
    a required text is empty. The message names the problem (US1, scenario 3).
  - The screen checks these rules before calling the API, and also shows the API's `400`
    `message`.
- **After saving**: the details screen opens. When editing, a note explains that requests already
  in progress keep their previous configuration (FR-005).
- **States**: loading the catalog (and, when editing, the form connection), and an error if
  either can't be loaded.
- **Implementation rules**: the screen has several related pieces of state, so per the
  constitution it uses `useReducer`. Lists such as documents and fields are rendered by
  sub-components.

## Details (`/form-connections/:id`)

- **Connection URLs** (FR-004):
  - The **trigger URL** and the **pull URL**, each with a one-action copy button that uses
    `navigator.clipboard`. That needs HTTPS or `localhost`, which is one reason the UI is served
    over HTTPS outside development (research R14).
  - The pull URL shows `{reference}` literally, with a short hint that serviceBW substitutes the
    request reference.
  - The URLs never change, and reopening the screen shows the same ones (US1, scenario 4).
- **Webhook address** (FR-004, FR-014; US3, scenario 1), shown **only once webhook updates are
  delivered** (US3). Until then the details screen shows neither the field nor the mode, and every
  form connection created in the UI uses pull mode.
  - A field next to the URLs, with save and remove actions (`PUT` with `webhook_url`, or with
    `webhook_url: null`).
  - It shows the current mode: pull without an address, webhook with one. A change applies to
    requests triggered after it (US3, scenario 1).
- **Configuration summary**: the name, the serviceBW form, and the requested documents with their
  selected fields. An "Edit" action opens the edit screen.
- **Status and actions**:
  - **Deactivate**: asks for confirmation, and says that the URLs stop working at once and that
    requests in progress will be cancelled within a few seconds.
  - **Reactivate**: for a deactivated form connection.
  - **Delete**: asks for confirmation, and states that the URLs will stop working permanently
    (US4, scenario 5). After deleting, the app returns to the overview.
- **States**: loading, and an error if the form connection can't be loaded, for example because it
  was deleted, with a way back to the overview.

## Accessibility (SC-009)

Every screen meets WCAG 2.1 level AA, as the user decided. For these screens that means in
particular:

- **Keyboard**: every action works with the keyboard alone, in a logical order, with a visible
  focus. Dialogs keep the focus inside while they are open, and return it to the button that
  opened them.
- **Forms**: every field has a visible label. Validation messages appear next to their field and
  are linked to it for screen readers. After a refused save, the focus moves to the first field
  with a problem.
- **Status messages**: results that appear without a page change, such as "copied", "saved" or an
  error from the API, are announced to screen readers.
- **Structure**: each route has its own page title and one main heading. The page language is set
  to the language of the UI.
- **Contrast and resizing**: text and controls meet the AA contrast ratios. The screens still work
  at 200% zoom and at a width of 320 px.
- **Checking it**: the Figma review and the review before release are described in research R16;
  the walkthrough is quickstart V9.
