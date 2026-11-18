# Download a connection's details as a PDF (spec 011)

## Summary

A team member can now save a connection's details as a PDF from its details page, published or
draft, in one click. The file is made in the browser, in a module worker with PDFKit 0.20.2, from
the same answer the page shows. Nothing is stored, sent or logged. Spec, plan and evidence:
`specs/011-connection-pdf/`.

**US1, a published connection's PDF (P1, the MVP)**
- "Download PDF" and the version in a strip under the Summary card's header row (Figma's final
  frame `7603:61494`; first built in the header row after `6396:48196`, moved on 2026-11-18 by
  bug v5-ui-fixes (B3)). While busy it reads
  "Creating PDF…", with a polite live region. On failure, a KERN alert with "Try again".
- The PDF follows the prototype's agreed layout in KERN's colours: page 1 (details, status, the
  links), 2 "Documents and data items", 3 "Rules per variant", with the Summary's marks, groups
  and AND/OR. Every page carries a band (name, connection ID, version, date) and a bottom (place,
  "Page n of N").
- Pure modules in `frontend/src/utils/connectionPdf/`: model, blocks with one geometry ("measured
  equals drawn"), paginator, URL lines, file name, renderer. Then `workers/pdf.ts` and
  `hooks/useConnectionPdf.ts`. PDFKit, the five committed Fira TTFs (OFL) and the worker load on
  the first run only. The main entry grows by about 9 kB.

**US2, a draft for review (P2)**
- The button on the draft's details too.
- The draft's PDF has a "DRAFT" watermark and a "Draft · Not live" pill on every page, and no
  URL. It names the links to be created.
- A "To finish before publishing" box lists everything publishing would refuse, in the server's
  order and words: `publishProblems()` in `rules/src/validation.ts`. Incomplete rules end with
  "Not complete: …".

**US3, is a printout current? (P2)**
- `version_fingerprint` on `FormConnection` and `FormConnectionDraft`: SHA-256 over the canonical
  content (`backend/app/services/versions.py`, mirrored in `api-types`). There is no migration;
  it is computed per answer.
- It is shown as "Version XXXX-XXXX-XXXX" in the header, the band, the file name and the PDF's
  properties.
- The MCP's `get_connection` returns it. The draft tools now call the save number "save", not
  "version" (D11).

**US4, language and assistive technology (P3)**
- The PDF is in the website's language at activation (English or German, spec 009's tables).
- It is tagged PDF/UA-1: structure tree, headings, lists, the details box as a table, the band,
  bottom and watermark as artifacts, and an outline.
- PDFKit writes an incomplete `CIDSet`. `withoutCidSet()` in `render.ts` works around it
  (research R5; the upstream report is `pdfkit-cidset-issue.md`).

**Also**
- nginx accepts request bodies up to 4 MB on `/api/` (D12): a connection at the product's
  limits is 1.56 MB.
- `README.md`, `docs/ARCHITECTURE.md` ("The connection PDF (spec 011)"), `CLAUDE.md` and
  `docs/KERN-DESIGN-SYSTEM.md` are updated.

## Verification

All of it is recorded in `design-notes.md` §7, summed up per success criterion in §9.1:
- **Gates**: lint, Vitest (`rules/`, `frontend/`, `mcp/`), the build, Ruff, mypy and pytest.
  `test_versions.py` covers 30 kinds of content change.
- **The PDF against the prototype** (§7.3): A, C and D compared text by text, with no unsure row.
- **PDF/UA-1** (§7.4): veraPDF 1.28.1 passes 9 files (A–D in English and German, E): 106 rules,
  0 failed checks. Structure, contrast (lowest 4.67:1) and the German texts and dates pass.
- **In Chromium 156 and Firefox 159** (§7.1, §7.2, §7.5):
  - the header against Figma at 1440 px and narrow (as first built; the strip of 2026-11-18 is
    still to verify, `design-notes.md` §7.1);
  - the run's states, keyboard, offline, 500 and retry;
  - the version end to end;
  - the edge cases (odd and long names, the language switched or the page left while busy);
  - privacy: one GET per download, no table changed, no log line.
- **Timings on the production build**: A and B save in 0.4–1.1 s (SC-001: 3 s). E, 764 pages,
  saves in 6.4–10.6 s (SC-001: 60 s), with the page responding (D10).

## Waits for a person

Full list with the task each item holds open: `design-notes.md` §9.4.
- The user validates the MVP (T034). A's page 1 in a real PDF reader (T027).
- SC-007: a colleague reads a draft's PDF alone (T038).
- SC-006: a screen-reader walk (NVDA with Acrobat Reader). Who does it is still open (T006,
  T047).
- A black-and-white printout, and the browser's own 200 % zoom (T047). Optional: PAC 2024, and a
  German speaker reading the German PDFs.
- E's timing by hand with a stopwatch, and a save of E through nginx (no nginx image here).
- **Designer**: answered on 2026-11-18 by the final frame `7603:61494` (bug v5-ui-fixes (B3)):
  the version and "Download PDF" sit in a strip under the header row. The browser check of the
  built strip against the V5 frames is still to do (§7.1, §9.2).
- Filing `pdfkit-cidset-issue.md` with foliojs/pdfkit.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
