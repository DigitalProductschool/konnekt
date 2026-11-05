# Research: Optional Connection Description in Place of the Form ID

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

The spec left nothing open. These decisions settle how the rename is carried out, checked against
the code on 2026-11-05.

## What the code holds today

- **Column**: `form_connections.servicebw_form`, `String(500)`, NOT NULL, `''` in a draft without
  one (`app/models.py`). A stored draft's JSONB `draft` never held it: the name and the form ID
  live in their columns (`schemas.DRAFT_CONTENT`). The column has no index or constraint.
- **Checks**: `clean_servicebw_form(value, complete=)` in `services/form_connections.py`, with
  `complete=False` for a draft save and `True` for creating, publishing and updating.
- **Requests**: neither `dcql.build_config()` nor the connect API (`document_requests.py`,
  `routers/connect.py`) reads it, and no log line names it. FR-010 already holds.
- **Frontend**: `servicebw_form` in 6 types; `servicebwForm` in the editor's state, reducer,
  validation, payloads and local draft content; "Form ID …" and "No form ID yet" in the list,
  the details page (top bar meta) and the editor's constants (where `noFormId` is unused).

## R1. Storage: rename the column

**Decision**: one migration after `d2b97ba4a2c7` renames the column with
`op.alter_column('form_connections', 'servicebw_form', new_column_name='description')`. The
downgrade renames it back. Type, NOT NULL and `''` for "none" stay as they are.

**Rationale**: a rename keeps every value byte for byte (FR-007, SC-002) in one statement, with no
backfill. Autogenerate sees a rename as a dropped and an added column, which would lose the data,
so its output is replaced by hand before the migration is committed (constitution V).

**Alternatives considered**:
- A nullable column with NULL for "none": drafts already store `''`, and one empty form keeps
  the TypeScript type a plain `string`.
- A new column, a copy and a drop: three steps for what one rename does.

## R2. One check, no `complete` switch

**Decision**: `clean_description(value: str | None) -> str` replaces `clean_servicebw_form`. It
trims, stores `''` for an empty, `None` or space-only value, and refuses more than
`DESCRIPTION_MAX_LENGTH = 500` characters with 400 `'The description can have at most 500
characters.'`. Every path uses it: create, update, draft save and publish. The editor's
`validateConnection` uses the same message word for word and no longer has a "required" case.

**Rationale**: once the field is optional everywhere, the draft and publish checks are the same
check, so the switch has nothing left to switch. The server counts code points (`len`). The
editor's `.length` counts UTF-16 units, at least as many, and the input's `maxLength={500}`
caps it too, so the editor never sends what the server refuses.

## R3. API: the field is `description`, optional, with no alias

**Decision**: every schema renames `servicebw_form` to `description`:
- **Create bodies** (`FormConnectionCreate`, `DraftCreate`, and `DraftUpdate` and
  `DraftPublish` through them): `description: str = ''`.
- **`FormConnectionUpdate`**: `description: str | None = None`. Absent leaves it unchanged, and
  `null` or `''` clears it.
- **Answers** (`FormConnectionSummary`, `FormConnection`, `FormConnectionDraft`):
  `description: str`, `''` when there is none.

`frontend/src/types/form-connections.ts` mirrors them in the same change (constitution I). No
`servicebw_form` alias is kept (FR-008).

**Rationale**: the frontend and backend are released together. Pydantic ignores unknown fields,
so a tab still running the old version that sends `servicebw_form` creates a connection or draft
with an empty description and leaves a published one's unchanged. That is what the spec's edge
case accepts ("may lose the description it saves").

**Alternatives considered**: a deprecated alias would break FR-008. Forbidding unknown fields
(422) would make an old tab lose the whole save, not just the description.

## R4. The description creates no revision

**Decision**: no change in behaviour. The description travels in `changes` beside the name:
- without changed documents, `update_form_connection` writes it in place;
- with changed documents, `create_revision(changes=…)` applies it under the row lock;
- publishing a draft passes `{'name': …, 'description': …}`.

None of these paths calls EUDIPLO for it, and no URL changes (FR-010).

## R5. Local drafts: format 2 under the same key prefix

**Decision**: `LOCAL_DRAFT_FORMAT` goes from 1 to 2, and `LocalDraftContent.servicebwForm`
becomes `description`. The key prefix `connection-portal:local-draft:v1:` stays.

**Rationale**: the store already removes a record of another format when it lists or reads it
(spec 005, R9). Old records are therefore found under their key, refused by `parseRecord`, and
removed the first time the overview or a flow reads them (FR-009), with no new code.

**Alternatives considered**:
- A `v2` prefix: old entries would never be read again, so never removed.
- Converting old records: the spec rules it out.

**Accepted risk**: a tab still running the old version refuses, and so removes, format-2 records
in its turn. The spec's edge case covers this: the team reloads the app after a release.

## R6. Display: one line, cut with "…", nothing when empty

**Decision**:
- **Overview row**: the line under the name shows the description as written. It keeps the
  existing `truncate` in the name column, and the line is left out when the description is
  empty. The helper becomes `descriptionOf(summary): string | null`.
- **Details page** (published and draft): `meta={description || undefined}` in the top bar.
  `TopBar` cuts the meta to one line at every width:
  - below `lg`, the meta drops its `wrap-break-word` for `truncate`, and the title keeps
    wrapping;
  - on `lg`, the meta takes only the space that the title, badge and menu leave
    (`flex-1 basis-0`, right-aligned, a minimum width of about 96px so that "…" stays visible),
    and the spacer stays hidden while there is a meta. A long description therefore never
    shortens the title.
- **No `title` attribute and no tooltip**: the element holds the whole text, so assistive
  technology reads all of it (FR-006), and the editor's step 1 shows it in full.

**Rationale**: SC-004 asks for exactly one line at every width. The decision of 2026-10-19
(nothing cut off below `lg`, WCAG 1.4.10) still applies to the title. For the meta, it gives way
to FR-006: no information is lost, because the full text reaches assistive technology and the
editor shows it.

**Check while coding**: the details header at 320, 768, 1024 and 1440px with a 500-character
description and a 200-character name.

## R7. Step 1's field

**Decision**:
- **Place**: the field keeps its place and width (`md:w-320`) as a single-line input with
  `maxLength={500}`. It drops `required` and `spellCheck={false}`, since it is free text now.
- **Label**: "Description", followed by KERN's optional marker
  `<span class="kern-label__optional">- Optional</span>`, as `VariantDialog` does and as
  `KernInput` writes it. `TextField` gets an `optional` prop for this.
- **Info tooltip**: "About the description": "A note for your team, such as the form's ID in your
  form management system. Applicants never see it." It no longer says that the field decides
  where the data goes (FR-004).
- **Placeholder**: "e.g. serviceBW form PK-30051".
- **Element id**: `connection-description`.

There is no Figma frame for this change: the copy is decided here and listed in
[contracts/ui-screens.md](contracts/ui-screens.md).
