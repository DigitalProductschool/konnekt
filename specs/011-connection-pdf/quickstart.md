# Quickstart: validating the connection PDF

**Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Contracts**:
[api-version](contracts/api-version.md), [pdf-worker](contracts/pdf-worker.md),
[pdf-document](contracts/pdf-document.md)

Each step names its expected result. A step that passes by failing (a refused request, no file)
says so.

## 0. Prerequisites

- Specs 008 and 009 implemented (the language switch in the header, German copy).
- The stack running as in `README.md` ("Local Development"); a signed-in team member.
- Chromium and Firefox (current), a PDF reader (Acrobat Reader, or Okular / Evince on Linux).
- For PDF/UA: veraPDF 1.28 or later (`verapdf --flavour ua1 <file>`), or PAC 2024 on Windows.
- For the screen-reader walk: NVDA with Acrobat Reader on Windows (Linux readers expose PDF tags
  poorly; say which one was used).
- Test connections, made in the UI from `prototype/data.mjs`'s sample ("Taxi and private hire
  driver licence": Personal ID and Driving licence, 12 data items; Standard, Taxi based on
  Standard with a changed, an added, a removed rule and an added group, Hire car with its own
  rules):
  - **A** the sample, published and active;
  - **B** a copy of A, deactivated;
  - **C** the sample saved as a draft, with Hire car's rule-11 without a message and rule-12
    without a check;
  - **D** a draft without gaps;
  - **E** a connection at the limits: 20 variants, each with 200 rules and groups, among them
    a rule on nationality with all 249 countries, created through `POST /api/form-connections`
    with a body shaped like the spike's largest connection (`prototype/spike/src/pdf/big.js`
    builds it as a model; the task that adds `testData.ts`'s largest connection also prints its
    create body).

## 1. Automated checks

```bash
npm install && npm run lint && npm test && npm run build      # root: all packages
cd backend && uv run ruff check . && uv run mypy app/ scripts/ tests/
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5435/template_db_test uv run pytest
```

Expected: all green. `npm test` includes paginate, the model, gaps, file names, URL lines, the
Node smoke test and spec 009's copy test; pytest includes `test_versions.py` and the publish
case of contracts/api-version.md §3.

Bundle: in the output of `npm run build -w frontend`, PDFKit and the fonts are in their own
chunks and assets (the worker's), not in the main entry; the main entry grows only by the hook,
the button and the model (compare with the size before the change; research, spike).

## 2. US1: a published connection

1. Open A's details. Expected: the Summary card's header shows "Version XXXX-XXXX-XXXX" and
   "Download PDF", open and closed.
2. Activate "Download PDF". Expected: the button reads "Creating PDF…" and ignores clicks; the
   page scrolls and the accordions open meanwhile; within 3 s the browser saves
   "Taxi and private hire driver licence_XXXX-XXXX-XXXX.pdf" with no dialog.
3. Open it. Expected: the reader's title bar shows "Taxi and private hire driver licence –
   Connection details", not the file name; page 1 as contracts/pdf-document.md §2 (eyebrow,
   name, description, "Active as of <now>", the details box, the note); "1 Links for your
   service" with the request link and three result links in full, "Variant · Standard" first;
   "2 Documents and data items"; "3 Rules per variant" with Taxi's "Changed here", "Added here",
   "Removed here", the removed rule struck through.
4. Compare with `prototype/published-ids-top.pdf` page by page. Expected: the same layout and
   English wording, apart from design-notes §5.
5. Every page: the band names the connection, its ID, "Version …" and "Generated …"; the bottom
   says where the page is ("3 Rules per variant › Variant Taxi (continued)") and "Page n of N".
6. B: page 1 reads "Deactivated as of …", and the links section adds the "unavailable" sentence.
7. Print one PDF in black and white. Expected: statuses, marks, AND/OR and removed items are
   readable without colour.
8. Network failure: open the browser's devtools, set the network offline, activate the button.
   Expected: the alert "Couldn’t create the PDF" with "Try again" and no file (passes by
   failing). Go online, "Try again": the file is saved.

## 3. US2: a draft

1. C's details. Expected: the version and "Download PDF" in the Summary card's header.
2. Download. Expected: "Taxi and private hire driver licence_draft_XXXX-XXXX-XXXX.pdf"; every page
   carries the faint diagonal "DRAFT" and "Draft · Not live" in the band; page 1 reads "Connection
   details · Draft for review", "Draft Not live yet", "Last saved <date> (draft save n)".
3. Expected: "To finish before publishing (2)" lists "Licence class B in Hire car has no error
   message." and "Licence still valid in Hire car: choose a check." (the create flow's words); in
   section 3 the two rules read as far as they go and end with "Not complete: Write the message
   for citizens." and "Not complete: Choose a check.".
4. Search the PDF for "http" and "connect". Expected: no hit (FR-013); section 1 says "Created
   when the connection is published and active." and names Standard, Taxi and Hire car.
5. D: no "To finish before publishing" box.

## 4. US3: the version

1. Note A's version on the details page and in its PDF. Expected: equal.
2. Download A again in German (switch to DE). Expected: the same version.
3. Deactivate A, activate it again. Expected: the same version.
4. Edit one rule's message and save. Expected: a different version on the page and in a new PDF.
5. Change it back. Expected: the first version again.
6. D: note the draft's version, publish it unchanged. Expected: the published connection shows
   the same version; its PDF too.
7. A PDF's document properties (the reader's "Properties"): Subject and Keywords contain the
   version, so does the file name.

## 5. US4: language and accessibility

1. Switch to DE, download C. Expected: every text that isn't content is German (glossary); the
   statements read as the Summary reads them in German; dates read "09.11.2026, 16:45" in both
   languages, in Germany's time (set the computer to another time zone to check).
2. veraPDF: `verapdf --flavour ua1 A.pdf C-de.pdf`. Expected: no failed rule (SC-006; record the
   report in research, spike section, for the implementation's files).
3. Screen reader (NVDA + Acrobat): the title and language are announced; H moves through the
   name, the sections, the variants, the documents, the rules and groups (identifier and name);
   the details box reads as a table with row headers; the data items as lists; the band, the
   bottom and the watermark are never read.
4. The reader's bookmarks panel lists the three sections and, under the third, the variants.
5. Keyboard only on the details page: Tab reaches "Download PDF" after the counts, Enter and Space
   start it, focus stays on it while busy and after.

## 6. Edge cases

| Case | Steps | Expected |
|---|---|---|
| Changed meanwhile | open A in two tabs; edit a message in tab 2; download in tab 1 | tab 1 shows the new content and version too; the file matches them |
| Published meanwhile | open C's details; publish C in another tab; download in the first | the first tab shows the published details; the file is the published one (no "_draft_") |
| Deleted meanwhile | open D; delete it in another tab; download | the details' not-found state; no file |
| Language switched while busy | E in EN; activate; switch to DE at once | the file is English |
| Leaving while busy | E; activate; go to the overview at once | no file is saved later |
| Double activation | double-click the button | one file |
| Odd name | rename A to `A/B: "test" <1>?` | the file name is `A-B- -test- -1--_….pdf` (each forbidden character replaced), the PDF shows the name as entered |
| Long name | a 200-character name | the band cuts it with "…"; page 1, the title and the file name (first 100 characters) show it |
| Limits | E | saved within 60 s (Chromium and Firefox); the page responds meanwhile; no rule, header or link split; the nationality rule continues on the next page between values, with "(continued)" at the bottom |
| Privacy | any download with devtools' network tab and the backend log open | one `GET /api/form-connections/{id}` (plus option sets and catalog if not cached); nothing else; no log line about a PDF |
| Narrow screen | 320 px wide at 200 % zoom | the version and the button wrap below the heading, nothing overlaps, the button works |
