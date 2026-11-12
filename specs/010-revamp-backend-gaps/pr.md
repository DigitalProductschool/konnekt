# feat(010): the stored-data features of the KERN Revamp design

## Summary

Spec 010 (`specs/010-revamp-backend-gaps/`) builds the nine items of the KERN Revamp design that
need stored data, which spec 008 left out ("deferred group A"):

1. **Schedule when a connection goes live (US1)**: the publish dialog, "Activate again" and the
   new "Change start date" offer "Active from: Now / On a date". A scheduled connection's links
   answer serviceBW as a deactivated one's until its day starts in Germany; the worker then makes
   it active, with nobody signed in. A scheduled connection can be moved, started now, edited,
   deactivated and deleted.
2. **See since when a connection is in its state (US2)**: overview rows and a date pill on the
   details say "Published", "Active since", "Scheduled · <date>", "Deactivated" or, for a draft,
   "Edited <date> · <step>".
3. **See who did what (US3)**: an Activity card on every details page lists each change with its
   time, event and person, including "<person> with <agent>" and approvals; Links, Summary and
   Activity form one accordion.
4. **Take back a deletion (US4)**: the deletion toast offers "Undo" for the restore time
   (`DELETION_UNDO_SECONDS`); the worker finishes the deletion afterwards.
5. **Delete several connections at once (US5)**: checkboxes, a selection bar and one bulk
   dialog; all or nothing (`409 selection_changed` deletes nothing), with "Undo".
6. **Put the documents in order (US6)**: by dragging (mouse and touch) or with "Move up" / "Move
   down"; the order is stored and shown everywhere, while serviceBW's answers stay unchanged.
7. **Start from an example (US7)**: the welcome page creates a complete, publishable example
   draft in the team member's language, with banners and a reminder in the publish dialog.
8. **Agents see and use the new data (US8)**: the MCP tools read the scheduled status, the dates,
   the step, the order, the example mark and the activity; `move_document` reorders a draft; an
   approval can carry a start date (`set_start_date`, `publish` / `reactivate` on a date).
9. **Choose a document's data by group (US9)**: documents with more than ten data items show
   them under group headings, each chosen or cleared with one activation; `get_catalog` gives
   each item's group.

Every toast now closes after 6 s, paused while the pointer or the keyboard focus is on it
(FR-082, superseding spec 008's rule for action toasts).

## Verification

- **Gates** (T100, quickstart V15.1): `npm run lint`, `npm test`, `npm run build`, Ruff, mypy,
  `export_check_fixtures --check` and the full pytest, all green. Test counts against the
  baseline before the feature: rules 2642 → 2664, frontend 1267 → 1573, mcp 408 → 510, pytest
  2161 → 2557. Every existing test file that changed is traced to its requirement
  (design-notes §2.3 `#### T100`).
- **Walks** (quickstart V1–V12, scripted, English and German): V1–V4 scheduling 1084/1084
  measures (Chromium and Firefox; the start arrives within one worker cycle), V5 dates 480/480,
  V6 activity 423/423, V7 "Undo" 714/714, V8 bulk delete 298/298 (ten connections in 1.45 s),
  V9 document order 372 pass and 4 for a person (a real touch screen), V10 example 289/289
  (under 0.6 s), V11 data groups 414/414, V12 agents 241/241 (three access levels, 26 tools).
- **Sweeps** (T087–T096 with one measuring harness): every new state in English and German, at
  1440, 320 and 160 CSS px, in Chromium and Firefox: overflow, clipping, contrast, focus-visible,
  label widths, live regions, `<html lang>` and the texts FR-076 excludes. The defects found
  were fixed in T098 and T106 and rerun; no open row remains for this feature. V13: every toast
  closes after 6 s ± 0.3 and holds under the pointer and the focus (T094). V15: `/api/connect/`
  unchanged, a scheduled connection's answers equal a deactivated one's byte for byte, and the
  logs of a scripted run hold no name, date, activity text or rule (T100).
- **German review**: all 156 new text pairs read against spec 009's glossary; 7 corrections (9
  texts) applied (T097's first pass, T099).
- **Convergence** (`/speckit-converge`, T101): 9 gaps found; the documentation gap is closed
  (T114), the other seven tasks (T107–T113) are left for a follow-up (see below).

The success criteria SC-001 to SC-012, each with the rows that prove it, are in
`specs/010-revamp-backend-gaps/design-notes.md` §6.1.

## Migrations

Five Alembic revisions, applied in order by `uv run alembic upgrade head` in `backend/`:

- `bfd1be13755d`: the status dates and the activity table, with a backfill
- `9e7546ab2057`: the restorable deletion
- `e7ebbd07dc57`: the documents' stored order
- `1b6d7a28c6b2`: the example mark
- `1f5e81861348`: the approval requests' start dates

## New setting

`DELETION_UNDO_SECONDS` (default `300`; `0` switches restoring off): how long a deletion can be
taken back. It is documented in `README.md`, `docs/ARCHITECTURE.md` and `backend/.env.example`.
`docker-compose.prod.yml` doesn't pass it yet, so a deployment uses 300 s.

## Left open

Listed in design-notes §6.3:

- the person steps: screen reader passes, a real touch screen, the timings by hand, a real MCP
  client through OAuth, a publish on a date against the hosted EUDIPLO, 200 % with a browser's
  own zoom, and a German-speaking person's read of the German screens;
- the convergence tasks T107–T113, not built: `search_connections`' note for a scheduled item,
  the overview row's scheduled edit entry, the example's banners after "Resume editing", one
  `deleted_at` per deletion, "Change start date" on a stale page, no drag of a single document,
  and the document types' grouped view moved out of the router;
- baseline findings outside this feature (narrow-width layouts of specs 002, 007 and 008, the
  rule editor fields' border contrast), and passing `DELETION_UNDO_SECONDS` in
  `docker-compose.prod.yml`.

## For the designer

design-notes §6.2 lists the build's deviations from the frames (§1) and the audit's 43 "Figma
must change" items (F1–F43), grouped as wording, not built, spec 008's behaviour kept, and
frames to redraw.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
