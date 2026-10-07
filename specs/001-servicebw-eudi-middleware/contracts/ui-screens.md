# Contract: management UI screens

**Users**: signed-in DO.IT team members. **Requirements**: FR-001 to FR-007, FR-014, SC-009;
US1, US4.
**Decisions**: research R16.

This contract fixes **which screens exist and what they let a team member do**. Layout, wording,
language, KERN components and visual states come from the **Figma design**. The user will share its
URL when the UI tasks start, and where the two differ, the design wins on presentation and this
contract wins on behavior. Every screen gets its data only through
[management-api.md](management-api.md).

| Route | Screen | Requirements |
|---|---|---|
| `/login` | Sign in | FR-007 |
| `/` | Form connections overview | FR-006; US4, scenario 1 |
| `/form-connections/new` | Create form connection | FR-001 to FR-003; US1, scenarios 1–3 |
| `/form-connections/:id` | Form connection details | FR-004 to FR-006, FR-014; US1, scenarios 1, 4 and 5; US4, scenarios 3–5 |
| `/form-connections/:id/edit` | Edit form connection | FR-003, FR-005; US4, scenario 2 |

Every route except `/login` needs a session. When `GET /api/auth/me` answers `401`, the app goes
to `/login` and returns to the requested route after sign-in. Every signed-in screen shows the
user's name and a sign-out action.

## Sign in (`/login`)

- **Fields**: username and password, with a submit action.
- **When sign-in fails**: one generic message ("Invalid username or password"). It never says
  which of the two was wrong.

## Overview (`/`)

- **List**: one row per form connection that isn't deleted, showing its name, serviceBW form,
  and whether it is active or deactivated. The mode (pull or webhook) may be shown as well.
  Selecting a row opens its details.
- **Actions**: "Create form connection" opens `/form-connections/new`.
- **States**: loading, an empty list (with a prompt to create the first form connection), and an
  error.

## Create and edit (`/form-connections/new`, `/form-connections/:id/edit`)

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
- **Webhook address** (FR-004, FR-014):
  - A field next to the URLs, with save and remove actions (`PUT` with `webhook_url`, or with
    `webhook_url: null`).
  - It shows the current mode: pull without an address, webhook with one. A change applies to
    requests triggered after it (US1, scenario 5).
- **Configuration summary**: the name, the serviceBW form, and the requested documents with their
  selected fields. An "Edit" action opens the edit screen.
- **Status and actions**:
  - **Deactivate**: asks for confirmation, and says that the URLs stop working at once and that
    requests in progress will be cancelled within a few seconds.
  - **Reactivate**: for a deactivated form connection.
  - **Delete**: asks for confirmation, and states that the URLs will stop working permanently
    (US4, scenario 5). After deleting, the app returns to the overview.

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
