# Implementation Plan: Download a connection's details as a PDF

**Branch**: `pdf-summary` (the worktree's branch; feature directory `specs/011-connection-pdf/`,
which `setup-plan.sh` resolved from `.specify/feature.json` as `011-connection-pdf`) | **Date**:
2026-11-09 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/011-connection-pdf/spec.md`, the prototype in
[prototype/](prototype/) (`make.mjs`, `paginate.mjs`, `fingerprint.mjs`, `data.mjs` and the
agreed PDFs `published-ids-top.pdf`, `draft-ids-top.pdf`), and the decisions R1–R8 that the
exploration with that prototype produced (given with the planning request; recorded with their
rejected alternatives in [research.md](research.md)).

**Note**: git works in this checkout only with the two environment variables tasks.md's "Notes"
name; nothing here was committed or staged. Specs 008 and 009 are the baseline (spec,
Assumptions); spec 009 is being implemented on its own branch and this branch is rebased on it
before `/speckit-implement`, so this plan uses the API its contracts define (`defineTexts`,
`Language`, `useLanguage`, `RuleContext.language`, `ruleProblemOf`, `ApiFetchOptions.language`)
and its tasks must land first.

## Summary

The details of a published connection and of a stored draft get "Download PDF" in the Summary
card's header and, beside it, the connection's **version**: a 12-character fingerprint of its
content that every page of the PDF carries, so a printout can be compared with the page. One
activation fetches the connection as stored, builds a content model in the website's language,
and has a module worker lay it out and draw it as a tagged A4 PDF that the browser saves.
Nothing about the file is stored, sent or logged.

**Technical approach**:
- **In the browser, with PDFKit** (R1): its browser build in a module worker
  (`frontend/src/workers/pdf.ts`), loaded with the fonts on the first click as a separate chunk
  (R2); the page stays responsive.
- **Pure modules** (R3) in `frontend/src/utils/connectionPdf/`: the content model from the
  connection and the rules package (statements, marks, dissolved groups, gaps, in the chosen
  language), self-measuring blocks over a small `Measure` interface, the paginator ported from
  the prototype (R4), the drawing over an injected PDFKit document, the file name, the URL
  wrapping and the texts as `defineTexts(en, de)`.
- **Pagination** (R4, R11): blocks never split, chains keep headings with what follows, units
  move whole to a fresh page when they fit there; a rule taller than a page is cut into blocks
  at value boundaries; the page count is known before drawing.
- **Accessible** (R5): PDF/UA-1 tagging with headings H1–H6, lists, the details box as a table,
  artifacts for everything decorative and repeated, `/Lang`, the title shown, an outline. The
  spike's sample passes veraPDF's PDF/UA-1 profile once a PDFKit bug (an incomplete `CIDSet`) is
  worked around in one isolated, tested function.
- **The version** (R6): computed by the backend in one function over the content in its
  publishable form, returned as `version_fingerprint` on `FormConnection` and
  `FormConnectionDraft`; a draft published unchanged keeps it. The MCP's `get_connection` shows
  it too (R12).
- **Fonts and look** (R7, R8): KERN's typeface, Fira Sans (Regular, Medium, SemiBold) and Fira
  Mono (Regular, Medium), as committed TTFs that the worker fetches on the first click and PDFKit
  subsets; the prototype's geometry with the details band at the top; KERN's colours
  (design-notes §4).
- **The run** (R9, R10, R13): the button fetches the connection afresh (FR-005), the hook builds
  the model on the main thread, the worker draws; a draft's gaps are everything publishing would
  refuse, through a new `publishProblems()` beside `firstProblem()`.

## Technical Context

**Language/Version**: TypeScript 6.0 with React 19.2 (`frontend/`, small additions in
`api-types/`, `rules/` and `mcp/`); Python 3.13 (backend: one service module, two response
builders, a refactor inside `rules.py`).

**Primary Dependencies**: one new package, `pdfkit` 0.20.2, in `frontend/package.json` only,
pinned exactly (constitution IV; research R1). Its own dependencies (fontkit, fflate, linebreak,
@noble hashes and ciphers, png-js and fontkit's) are never imported by our code. The fonts are
five TTF files committed under `frontend/src/assets/fonts/` with their SIL OFL 1.1 licence, not a
package: KERN's WOFF2 files break fontkit's subsetting and KERN has no Fira Mono (research R7,
spike). Unchanged otherwise: React Router 7, Vite 8 (one option added: `worker.format: 'es'`,
research R2), Vitest 4, Tailwind 4, KERN; FastAPI, Pydantic 2, SQLAlchemy 2.

**Storage**: none. No table, column or migration: the version is computed per response. No
`localStorage`. The file exists only as a `Blob` until the browser saves it.

**Testing**:
- **Vitest** (the gate, `node`): `paginate` with made-up heights (never split, chains, unit
  moves, the chain-aware unit move the prototype's bug taught, an oversized unit, an overflow
  inside a chain); `urlLines`, `fileNameOf`, the gaps, the content model (a draft without URLs,
  gaps, removed and dissolved items, empty states, English and German); a smoke test that renders
  the sample with PDFKit's Node build and checks `/Lang`, `/StructTreeRoot`, `/MarkInfo`, the
  outline, and that every page carries the connection ID, the version and "Page n of N"
  (research R14). Spec 009's copy test covers `PDF_TEXTS`. `rules/src/validation.test.ts` gets
  `publishProblems()`.
- **pytest** (a practice, run anyway): `tests/unit/test_versions.py` and the API tests of
  [contracts/api-version.md](contracts/api-version.md) §3.
- **MCP**: `views.test.ts` and `draftEdit.test.ts` fixtures gain the field; `guidance.test.ts`
  unchanged.
- **Manual and tools** ([quickstart.md](quickstart.md)): download in Chromium and Firefox, open in
  a PDF reader, German, keyboard, veraPDF (PDF/UA-1), a screen-reader walk, black-and-white print,
  the limits' timing, the Figma checks of the button.

**Target Platform**: DO.IT's evergreen desktop browsers (Chromium-based and Firefox, both with
module workers); the backend's container as today.

**Project Type**: web application (FastAPI backend, React SPA, the npm workspace's packages).

**Performance Goals**: SC-001: the sample within 3 s, a connection at the limits (20 variants of
200 items) within 60 s, the page responsive throughout (the worker does all layout and drawing).
The PDF code and fonts load on the first click only; the main bundle doesn't grow by more than the
hook, the button and the content model. Measured in the spike (research, "Phase 0 spike"): the
sample in 0.4 s on the first click and 0.2 s after, the limits (803 pages, 5 MB) in 2.5 s in
Chromium and 2.6–3.4 s in Firefox, the main thread never blocked for more than 95 ms; the first
click loads about 530 KB of JavaScript (212 KB gzip) and 1.7 MB of TTFs (about 0.75 MB gzip once
nginx compresses `font/ttf`).

**Constraints**: FR-041/FR-042 (no finding, persona or citizen data; nothing stored, sent or
logged; no `console.*` in `utils/connectionPdf/`, `workers/pdf.ts`, `useConnectionPdf`); only the
worker and the hook touch browser APIs; no URL in a draft's PDF; PDF/UA-1 (FR-040).

**Scale/Scope**: one connection per file, up to 20 variants × 200 rules and groups (4,000 items),
value lists up to the 249 countries, names of 100 and texts of 500 characters (FR-045).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Status |
|---|---|---|
| I. Contract parity | `version_fingerprint` is added to `FormConnection` and `FormConnectionDraft` in `schemas.py` and `api-types/src/form-connections.ts` in the same change; envelopes unchanged; no new endpoint | Pass |
| II. Sync persistence | no new query; the fingerprint is a pure function called by the existing sync builders | Pass |
| III. Quality gates | the pure modules and the smoke test run in Vitest's `node` environment, next to their modules, no DOM library; PDFKit's Node build in a test is a library, not a browser; no `vitest.config.ts` beside `frontend/vite.config.ts`, no `pytest.ini` | Pass |
| IV. Declared dependencies | `pdfkit` declared in `frontend/package.json` only and imported only by the worker (browser build) and the smoke test (Node build); nothing that only arrives through it (fontkit, fflate, linebreak) is imported; the fonts are committed files with their licence, so no font package is needed | Pass |
| V. Schema evolution | no model change, no migration | Pass |
| Structure | `src/workers/pdf.ts`, `src/hooks/useConnectionPdf.ts`, `src/utils/connectionPdf/`, the button in `src/pages/FormConnectionDetail/`; `frontend` imports `rules` and `api-types`, never `mcp` | Pass |
| Workflow | backend order (schema → service → builders → tests), then `api-types` → `src/api/` (spec 009's language option) → hook → page; documentation checklist: README (the dependency and why), ARCHITECTURE (a section on the connection PDF), CLAUDE.md (one line pointing to it) | Pass |

**Re-check after Phase 1 design**: unchanged, all pass. The design adds no endpoint, no table and
no setting. Three points were checked specifically: the smoke test needs no PDF parsing library
(research R14); the worker's dynamic `import()` keeps PDFKit and the fonts out of the main
bundle (spike: the main entry holds only the worker's URL); and the fonts need no package once
they are committed files (spike: importing them from `@expo-google-fonts/*`, as the prototype
does, would add two dependencies).

## Project Structure

### Documentation (this feature)

```text
specs/011-connection-pdf/
├── spec.md
├── plan.md              # this file
├── research.md          # R1–R14 and the Phase 0 spike
├── data-model.md        # the version, the content model, gaps, blocks, pages, messages, states
├── design-notes.md      # the button and the version on the page, states, colours, deviations
├── quickstart.md        # validation guide
├── contracts/
│   ├── api-version.md   # version_fingerprint: field, computation, tests, MCP
│   ├── pdf-worker.md    # the hook, the worker, the pure modules
│   └── pdf-document.md  # the PDF: pages, content, breaks, tags, outline, texts
├── checklists/
├── pr.md                # written at the close (tasks T053): the pull request's text
├── pdfkit-cidset-issue.md  # written at the close (T053): the report for PDFKit, filed by a person
└── prototype/           # the exploration's sketch and its agreed PDFs (output not committed)
    ├── seed.ts          # tasks T028: creates the test connections A–E on a running stack
    └── spike/           # Phase 0: the port to a Vite 8 module worker (sources only)
```

### Source Code (repository root)

```text
backend/
├── app/
│   ├── schemas.py                          ~ version_fingerprint on FormConnection, FormConnectionDraft
│   └── services/
│       ├── versions.py                     + version_fingerprint(): canonical JSON, SHA-256
│       ├── rules.py                        ~ publishable_condition(), returned by _clean_condition()
│       ├── form_connections.py             ~ _view() sets the field
│       └── drafts.py                       ~ draft_view() sets the field
└── tests/
    ├── unit/test_versions.py               + the fingerprint's vectors and invariants
    └── api/test_form_connection_drafts.py  ~ key sets; publish unchanged keeps it (also approvals)

api-types/src/form-connections.ts           ~ version_fingerprint on both interfaces

rules/src/
├── validation.ts                           ~ publishProblems(): every problem, firstProblem's order
└── validation.test.ts                      ~ its cases

frontend/
├── package.json                            ~ pdfkit 0.20.2 (exact)
├── vite.config.ts                          ~ worker: { format: 'es' } (R2)
├── nginx.conf                              ~ gzip_types gains font/ttf (R7)
└── src/
    ├── assets/fonts/                       + FiraSans-{Regular,Medium,SemiBold}.ttf, FiraMono-{Regular,Medium}.ttf, OFL.txt
    ├── hooks/useConnectionPdf.ts           + fetch → model → worker → save; reducer
    ├── hooks/useFormConnection.ts          ~ replace() takes a draft too (FR-005)
    ├── hooks/utils.ts  utils.test.ts  types.ts  ~ pdfDownloadReducer, its cases and shapes
    ├── workers/pdf.ts                      + dynamic import of PDFKit and fonts; render; post bytes
    ├── workers/pdfFonts.ts                 + the five TTFs' ?url imports (loaded by the worker)
    ├── utils/connectionPdf/                + pure, each with *.test.ts:
    │   ├── types.ts  constants.ts           shapes; PDF_TEXTS (defineTexts), layout, colours
    │   ├── model.ts  gaps.ts                content model; gaps and "Not complete"
    │   ├── blocks.ts paginate.ts            blocks over Measure; paginator (R4)
    │   ├── wrapUrl.ts fileName.ts           URL lines after "/"; file name
    │   ├── render.ts                        drawing and tagging over an injected PDFDocument
    │   └── testData.ts                      the sample (prototype/data.mjs) and the largest connection
    ├── utils/connectionSummary.ts          + summaryNumbersOf(), draftRuleDocumentsOf() (moved from the page)
    ├── assets/icons/download-*.svg         + the Figma glyph of 6396:48196
    └── pages/FormConnectionDetail/
        ├── PdfDownload.tsx                 + version, button, failure alert (uses the hook)
        ├── DetailAccordion.tsx  types.ts   ~ optional actions slot
        ├── RulesSummary.tsx                ~ passes PdfDownload to the Summary card
        ├── ConnectionDetails.tsx DraftDetails.tsx index.tsx  ~ wire onFetched / onGone
        ├── constants.ts                    ~ DETAIL_COPY: the button's and the version's texts
        └── utils.ts                        ~ summaryCountsOf() uses summaryNumbersOf()

mcp/
├── src/tools/read.ts (views)               ~ get_connection shows version_fingerprint
└── plugin/skills/connection-workflow/, publishing-and-live-connections/  ~ what the version is

README.md  docs/ARCHITECTURE.md  CLAUDE.md  ~ documentation checklist
docs/KERN-DESIGN-SYSTEM.md                  ~ KERN 2.8.2 ships no Fira Mono (spike)
```

**Structure Decision**: the web application's existing layout. The PDF's logic is pure and
lives in `frontend/src/utils/connectionPdf/` (not in `rules/`): it needs the frontend's copy
tables (`DETAIL_COPY`, `BRANCH_MARK_COPY`) and has no second consumer; the MCP server gets no
PDF (spec, Out of Scope). The one piece of rules logic it needs, collecting every publishing
problem, goes into `rules/src/validation.ts` beside `firstProblem()`, where the server's order
already lives.

## Delivery order (for `/speckit-tasks`)

1. **The version** (US3's base): `versions.py`, `publishable_condition()`, the builders, the
   schemas and their mirror, pytest; then `get_connection` and the two skills.
2. **The pure core**: `paginate` and its tests first (the pinned bug), `wrapUrl`, `fileName`,
   `publishProblems()`, the gaps, `connectionSummary.ts`, the content model, the blocks, `render`
   with the fonts, the `CIDSet` workaround and the Node smoke test, `PDF_TEXTS` in English.
3. **The run**: `vite.config.ts`'s worker format, the worker, the hook,
   `useFormConnection.replace` widened, the `actions` slot, `PdfDownload` with the version
   (FIGMA-WORKFLOW for `6396:48196`, `6809:46423`), the states; `nginx.conf`'s `font/ttf`.
4. **German**: `PDF_TEXTS.de`, `DETAIL_COPY`'s new keys, the glossary additions; reviewed in the
   running app.
5. **Documentation**: README (pdfkit and why), ARCHITECTURE ("The connection PDF (spec 011)"),
   CLAUDE.md (one line).
6. **Validation**: quickstart.md, veraPDF in both languages, the screen-reader walk, the limits'
   timing.

## Complexity Tracking

No constitution violation to justify.
