# Contract: Screens

There is no Figma frame for this change. Every place that showed the form ID shows the description
instead, and no screen says "Form ID" any more (FR-001, SC-003).

## Step 1 of the create and edit flows (FR-004; R7)

Same card, same place, same width (`md:w-320`), a single-line input.

| Element | Before | After |
|---|---|---|
| Label | `Form ID` | `Description` + `<span class="kern-label__optional">- Optional</span>` |
| Input | `required`, `spellCheck={false}`, `maxLength={500}` | not required, spell check on, `maxLength={500}` |
| Info tooltip label | `About the form ID` | `About the description` |
| Info tooltip text | `Copy the ID from your form management system. It makes sure the verified data reaches the right form. Applicants never see it.` | `A note for your team, such as the form's ID in your form management system. Applicants never see it.` |
| Placeholder | `e.g. PK-30051` | `e.g. serviceBW form PK-30051` |
| Id | `connection-form-id` | `connection-description` |
| Error, empty | `Enter the form ID.` | none: "Continue" goes on |
| Error, too long | `The form ID can have at most 500 characters.` | `The description can have at most 500 characters.` |

The error appears and takes the focus as the name's does (`firstInvalidElementId`).

## Overview row (FR-005, FR-006; R6)

| Description | Before | After |
|---|---|---|
| set | `Form ID PK-30051` | `PK-30051`, one line, cut with "…" |
| empty (draft) | `No form ID yet` | no line |
| empty (published) | n/a | no line |

The row keeps its layout. The name column is centred vertically, so a row without a line is just
shorter.

## Details page, published and draft (FR-005, FR-006; R6)

The top bar's meta, before the user menu, shows the description without a prefix, or nothing when
it is empty (`meta` not passed).
- **Below `lg`**: the meta sits on the second row as now, and is cut with "…" instead of
  wrapping.
- **On `lg`**: it takes the space that the title, badge and menu leave, right-aligned, with a
  small minimum width, so that a long description never shortens the name.

## Accessibility

- The truncated element holds the whole text, so screen readers read all of it. It has no
  `title` attribute, which would be announced twice and can't be reached by keyboard or touch.
- The full text is visible in step 1 of the editor.
- The optional marker is part of the `<label>`, so the input's accessible name is "Description -
  Optional".

## Copy removed

- `LIST_COPY.formId`, `LIST_COPY.noFormId`;
- `DETAIL_COPY.formId`, `DETAIL_COPY.noFormId`;
- `EDITOR_COPY.noFormId` (unused already), `formIdLabel`, `formIdPlaceholder`, `formIdInfoLabel`,
  `formIdInfo`;
- `VALIDATION_MESSAGES.servicebwFormRequired`.
