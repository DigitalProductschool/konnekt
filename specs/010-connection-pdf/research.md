# Research: Download a connection's details as a PDF

**Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

R1–R8 are the decisions of the exploration with the working prototype (`prototype/make.mjs`,
`paginate.mjs`, `fingerprint.mjs`, `data.mjs`), given with the planning request; each is recorded
here with the alternatives it rejected and what the Phase 0 spike found. R9–R14 are the decisions
planning added. Nothing is left open: there is no NEEDS CLARIFICATION in the plan.

## Phase 0 spike (2026-11-09)

The plan asked for a spike before anything else: PDFKit's browser build in a Vite 8 module worker
(the prototype ran only in Node), the chunk's size, the time for the largest connection, and the
sample against PDF/UA-1. The prototype was ported to a worker in a throwaway project; its
sources are kept in [prototype/spike/](prototype/spike/) (not the outputs).

**Versions**: pdfkit 0.20.2 (fontkit 2.0.4, linebreak 1.1.0, fflate 0.8.3, @noble/hashes 1.8.0,
@noble/ciphers 1.3.0, png-js 2.0.0; through fontkit: brotli, restructure, unicode-properties,
unicode-trie, dfa, clone, fast-deep-equal, tiny-inflate, @swc/helpers, base64-js), vite 8.3.5
(the lockfile's), @kern-ux/native 2.8.2, Chromium 156, Firefox 159, veraPDF 1.30.4.

| Question | Result |
|---|---|
| Browser build in a module worker | **Works** in Chromium and Firefox. `js/pdfkit.browser.mjs` is plain ESM with its own EventEmitter, Readable and `fs` stand-ins: no Node built-in, no `Buffer` or `process` polyfill, no `define`. Two changes: `font: null` in the document's options (otherwise it opens Helvetica and throws "Standard font "Helvetica" is not registered"), and `worker: { format: 'es' }` in Vite's config, since a worker that code-splits with `import()` can't be an IIFE |
| Main bundle | holds only the worker's URL: no PDFKit, no font |
| PDFKit's chunk | 529,844 B raw, 211,529 B gzip, 183,461 B brotli |
| The render code (prototype's port) | 18,294 B raw, 6,928 B gzip |
| Fonts (TTF, Regular / Medium / SemiBold / Mono / Mono Medium) | 441 / 441 / 473 / 170 / 169 KB raw, about 200 / 200 / 200 / 86 / 86 KB gzip; the frontend's nginx doesn't compress `font/ttf` today |
| Sample (6 pages, 82 KB) | first click 406 ms in Chromium (77 ms of it loading from localhost), 620 ms in Firefox; then 211–228 ms and 294–306 ms |
| Limits: 20 variants × 200 items (803 pages, 5.0 MB) | 2.48 s in Chromium, 3.43 s first and 2.64 s warm in Firefox; the main thread's longest gap between 50 ms timer ticks was 50–95 ms (SC-001: 60 s, page responsive) |
| KERN's WOFF2 fonts | **Fail**: fontkit opens them, but embedding throws `RangeError: Offset is outside the bounds of the DataView` as soon as a composite glyph is used ("ä", "é", "„", "…", and plain sentences); KERN 2.8.2 ships Fira Sans Regular, Medium and SemiBold but **no Fira Mono** |
| TTFs | embed as subsets with a Unicode map, text extracts correctly (pdftotext); 8.5 KB for one font, 37.6 KB for all five in a document |
| PDF/UA-1 (veraPDF `--flavour ua1`) | as PDFKit writes it: **fails** ISO 14289-1 7.21.4.2 test 2 on 3 font instances (105 other rules pass, 18,623 checks). With the `CIDSet` workaround (R5): the published sample, the draft sample and the 803-page file **pass** |
| Structure | `qpdf --check` clean; tagged, A4, PDF 1.7, `/StructTreeRoot`, `/Lang`, `/MarkInfo /Marked true`, `/DisplayDocTitle true`; tags Document, Sect, H1–H6, P, Span, Div, L, LI, LBody, Table, TR, TH, TD. No `/Outlines` (the prototype makes no bookmarks; FR-038 needs them) |
| Text extraction | the eyebrow's 1 pt letter spacing extracts as "C O N N E C T I O N D E TA I L S" |
| Node build | the same render code runs unchanged with PDFKit's Node build: 6 pages, `/Lang`, `/StructTreeRoot`, "Page n of 6" on every page, 546 ms |
| Fingerprint | a Web Crypto port gives the prototype's values (62D0-715F-01D1, 1A79-536D-D067); not used (R6) |

Headless Chromium can't start inside the session's sandbox; the browsers ran outside it.

## R1. Generate the PDF in the browser with PDFKit 0.20

**Decision**: PDFKit 0.20.2, its browser build (`pdfkit.browser.mjs`, plain ESM), declared in
`frontend/package.json` only and pinned exactly. Its dependencies (fontkit, fflate, linebreak,
@noble) arrive with it and are never imported by our code.

**Rationale**: it writes tagged PDF (structure elements, marked content, artifacts, `/Lang`, the
PDF/UA identification), embeds and subsets TrueType fonts, measures text (`heightOfString`,
`widthOfString`) for our own pagination, and runs unchanged in the browser and in Node, so the
same drawing code is tested in Vitest. The rule statements and spec 009's German texts exist only
in TypeScript, and the browser already holds the connection, the option sets and the catalog in
the chosen language.

**Alternatives rejected**:
- `@react-pdf/renderer`: no tagged PDF (issue diegomura/react-pdf#3179), so FR-036, FR-037 and
  FR-040 can't be met.
- The browser's print view (`window.print()` with a print stylesheet): a print dialog, not a
  download (FR-002), and the output (page breaks, headers, tags) varies by browser.
- A server renderer such as WeasyPrint: the statements and spec 009's German texts exist only in
  TypeScript, so it needs a Python copy of both, plus Pango and its fonts in the backend's image;
  and the server would handle the file, against the spirit of FR-042.
- jsPDF with html2canvas: pages become images, not accessible, selectable text.
- pdf-lib (added in planning): draws text but neither wraps it nor writes a structure tree, so
  tagging would be ours to build at the object level.

## R2. A module worker, loaded on the first click

**Decision**: `frontend/src/workers/pdf.ts`, a module worker, imports PDFKit and the fonts with
dynamic `import()` on its first message, so they form chunks of their own, loaded on the first
click, like `workers/checks.ts` and `workers/personas.ts` keep their code off the main bundle. The
hook `useConnectionPdf` creates the worker on first use (`new Worker(new URL('../workers/pdf.ts',
import.meta.url), { type: 'module' })`), posts the content model, and saves the returned bytes:
`new Blob(…, { type: 'application/pdf' })`, `URL.createObjectURL`, an anchor with `download`
clicked, `URL.revokeObjectURL` in a later task (Firefox can lose a download whose URL is revoked
in the same task; quickstart checks it). Only the worker and the hook touch browser APIs.
`frontend/vite.config.ts` gets `worker: { format: 'es' }` (spike); the two existing workers are
module workers already and build the same way in ES format.

**Rationale**: 803 pages take 2.5 s of solid work, which on the main thread would freeze the page
against FR-003; in the worker the page kept answering within 95 ms. The 530 KB of PDFKit and the
fonts are paid only by those who click.

**Alternatives rejected**:
- Generating on the main thread: blocks the page for seconds at the limits (FR-003).
- A static `import` in a worker created on the first click: splits the same way and needs no
  Vite option; not taken because R2 decided the dynamic import, which also lets the worker
  start without PDFKit; the only cost is the one option, which the existing workers don't mind.
- `showSaveFilePicker()`: Chromium only, and a dialog (FR-002). Opening the Blob in a tab: a
  preview, not a download (FR-002).

## R3. Pure modules in `frontend/src/utils/connectionPdf/`

**Decision**: each with its `*.test.ts` (contracts/pdf-worker.md §4): `model.ts` (the content
model from `FormConnection` or `FormConnectionDraft`: statements from `statementPartsOf` in the
chosen language, value labels from `useOptionSets`' sets, the catalog's labels, marks and dissolved
groups from `shownItems`, a draft's gaps, R10), `blocks.ts` (blocks that measure themselves
through a `Measure` interface: PDFKit's `heightOfString` and `widthOfString` in the worker, a
stub in tests), `paginate.ts` (R4), `render.ts` (drawing and tagging over an injected PDFKit
document), `gaps.ts`, `wrapUrl.ts`, `fileName.ts`, and the texts as `defineTexts(en, de)` tables
(spec 009) in `constants.ts`, where spec 009's copy test (`frontend/src/copy.test.ts`, which globs
`constants.ts` files) checks both columns. Texts the details page already has are taken from
`DETAIL_COPY` and `BRANCH_MARK_COPY`, not copied.

**Rationale**: the prototype's one `make.mjs` mixes measuring, pagination, tagging and drawing;
split into pure modules, each rule of the spec has a test in Node, and the drawing module is the
only one that needs PDFKit.

**Alternatives rejected**:
- The modules in `rules/`: no second consumer (agents get no PDF), and they need the frontend's
  copy tables; only the collection of publishing problems belongs there (R10).
- Building the model inside the worker: it would need the option sets and the catalog in the
  worker, fetched or posted anyway, and the texts' functions can't be posted.

## R4. Pagination: a port of `prototype/paginate.mjs`

**Decision**: `paginate(blocks, pageHeight)` as the prototype has it:
- A block is never split (the one exception, a rule taller than a page, is cut by the builder
  beforehand, R11).
- `keepWithNext` chains blocks together: headings, a group's header, the AND/OR connector, and a
  group's last member with the group's closing block.
- A unit (a variant, a group, the result links) starts a new page when it fits on a fresh page
  together with the chain leading into it, but not in what is left of this page. A unit taller
  than a page flows on.
- The page count is known before drawing, so "Page n of N" needs no second pass.

**The bug the prototype found, pinned by a test**: the unit check must run for the whole chain
at its first block (`breakBefore` walks the chain), and a block inside a chain breaks only on a
real overflow. Otherwise a variant moved to the next page leaves its heading behind (the
section heading ends page n, the variant starts page n+1).

**Tests** (`paginate.test.ts`, made-up heights): blocks never split; a chain moves whole; a unit
that fits a fresh page moves; the chain-aware unit move (the pinned bug); an oversized unit flows
and splits between blocks; an overflow inside a chain breaks there; gaps before a block are
dropped at the top of a page; the page count.

**Alternatives rejected**: PDFKit's own page flow (no keep-together, no knowledge of units, page
count unknown until the end, so "Page n of N" would need two passes or buffered pages); CSS paged
media (no layout engine in a worker, and R1 rejected the print path).

## R5. Tagging and PDF/UA-1

**Decision**:
- **Structure**: `Document` › `Sect` › `H1`–`H6`, `P`, `L`/`LI`/`LBody`, and
  `Table`/`TR`/`TH` (`scope: Row`)/`TD` for the details box. The name is `H1`, the sections and
  the gaps box `H2`, a variant, a document and the two link headings `H3`, a top-level rule or
  group `H4`, its members `H5`, sub-group members `H6`. A rule's or group's heading holds its
  identifier and its name ("rule-7 Minimum age").
- **Artifacts**: frames, bars, pills' shapes, labels' backgrounds, the AND/OR chips (the variant's
  or group's line says the operator in words), the top band, the bottom line and the watermark.
- **Document**: `lang` from the language (`en-GB`, `de-DE`), `displayTitle: true`, `subset:
  'PDF/UA'`, `tagged: true`, an outline (FR-038) with the sections and, under section 3, the
  variants.
- **The `CIDSet` workaround** (spike): PDFKit's PDF/UA mode writes a `CIDSet` as for PDF/A-1, built
  from the glyphs used only, so it misses the components that composite glyphs pull into the
  subset, and veraPDF fails 7.21.4.2. PDF/UA-1 doesn't require a `CIDSet`, so each font is
  finalised with the document's subset level hidden, which leaves it out while `pdfuaid:part 1`
  is still written. It touches PDFKit's private `_fontFamilies`, so it lives in one function
  (`withoutCidSet`), PDFKit is pinned exactly, and the smoke test fails if a `/CIDSet` comes back
  or the PDF/UA identification goes. The bug is worth reporting to PDFKit; once fixed upstream,
  the function goes.
- **Validation**: veraPDF's PDF/UA-1 profile passes for the spike's published, draft and largest
  files with the workaround; the implementation's files are validated again in both languages
  (quickstart §5), and with PAC where a Windows machine is at hand.
- The eyebrow loses its letter spacing (spike: extracted text spaced out).

**Alternatives rejected**: no tagging with an alternate text (fails FR-036 and FR-040); PDF/UA-2
(fewer validators and readers; the spec targets PDF/UA-1); reading the AND/OR chips aloud between
every two items (repeats the line above them for every item); for the `CIDSet`: patching PDFKit
with `patch-package` (a new dependency that edits `node_modules` at install), accepting the
failure (SC-006), or waiting for an upstream fix.

## R6. The backend computes the version fingerprint

**Decision**:
- A new field `version_fingerprint` (not `version`, which drafts already use for their save
  number) on `FormConnection` and `FormConnectionDraft` in `schemas.py` and its
  `api-types/src/form-connections.ts` mirror, computed by one function,
  `version_fingerprint()` in `app/services/versions.py`, which `_view()` and `draft_view()` call.
- SHA-256 over canonical JSON (sorted keys, no whitespace, UTF-8) of `id`, `name`,
  `description`, `documents` (`document_type` and field keys) and `branches` (`id`, `name`,
  `description`, `origin`, `operator`, `operator_mark`, `items`). No URLs, status, step, counters
  or times. The first 12 hex digits, upper case, in groups of four (data-model §1).
- **Found in planning**: publishing doesn't store a draft's conditions as they are. It rebuilds
  each with only its operator's keys, `years` and `amount` as integers, and `match_case` always
  set (`_clean_condition`, `rules.py`); a draft keeps them as sent (spec 005, FR-004). So the
  fingerprint hashes conditions in that **publishable form**: the key selection moves into
  `publishable_condition()`, which `_clean_condition` returns after its checks, so the two can't
  drift. Everything else is already identical: ids kept on publish (connection, branches, items),
  names and messages trimmed the same way on save and publish, documents and fields in catalog
  order on both paths, marks untouched.
- Computed per response, not stored.
- **pytest**: a complete draft published unchanged keeps its fingerprint, including conditions
  saved with extra keys, without `match_case` and with `years: 5.0` (publishing normalises them:
  pinned); any change of content alters it, one test per kind of element; labels, language,
  status, counters and times don't (contracts/api-version.md §3).
- 48 bits: two different contents of one connection share a version with a chance of about
  1 in 2.8 × 10¹⁴ per pair, "too small to matter in practice" (FR-030).

**Alternatives rejected**:
- Computing it in the browser (the spike's Web Crypto port matches): the MCP server and any later
  consumer would need the same canonical form, two implementations would drift, and the backend
  is where publishing's normalisation lives.
- A stored column: a migration, every write path must update it, and a stale value is possible;
  computing costs one SHA-256 over at most a few hundred KB per response.
- A counter: tells which is newer but not whether two copies match; an edit and its undo would
  get different numbers (the spec's edge case wants the same version).
- Hashing the response as sent: it holds labels, URLs, status and counters (FR-029).
- Hashing conditions as stored: a draft saved with an extra key would change version on
  publishing (FR-031).

## R7. Fonts: committed Fira TTFs

**Decision**: Fira Sans Regular, Medium and SemiBold, and Fira Mono Regular and Medium (SIL OFL
1.1), as five TTF files in `frontend/src/assets/fonts/` with `OFL.txt` beside them, from Google
Fonts' release (the same files the prototype used through `@expo-google-fonts`). The worker
imports their URLs (`?url`, so Vite fingerprints them as assets) and fetches them on the first
click; PDFKit subsets them when embedding (the sample: 82 KB with all five). `frontend/nginx.conf`'s
`gzip_types` gains `font/ttf` (about 1.7 MB raw, 0.75 MB compressed, cached afterwards). The
Node smoke test reads the same files with `node:fs`.

**Rationale** (spike): fontkit can't subset KERN's WOFF2 files (a `RangeError` on composite glyphs,
which German text always has), and KERN 2.8.2 has no Fira Mono. `docs/KERN-DESIGN-SYSTEM.md`
says the package ships Fira Mono; the documentation task corrects that.

**Alternatives rejected**:
- KERN's WOFF2 files from `@kern-ux/native`: fail as above.
- `@expo-google-fonts/fira-sans` and `fira-mono` as dependencies: two packages only for five
  files; importing the files would make them dependencies (constitution IV).
- TTFs pre-subset to Latin: a smaller first download, but a name or message with a Greek,
  Cyrillic or rarer Latin letter would print as a box; PDFKit subsets per document anyway.
- PDF's standard fonts (Helvetica): not KERN's typeface (FR-043), not embedded (PDF/UA-1).

**Known limit**: characters Fira doesn't cover (CJK scripts, emoji) print as the font's
missing-glyph box; DO.IT's names and messages are German or European. The spec accepts this
(its edge case "Characters KERN's typeface doesn't have"), outside FR-040's target; tasks T043
renders one such name and records what a validator says about it.

## R8. Layout constants and colours

**Decision**: the prototype's geometry with the details band at the top (`*-ids-top.pdf`): A4,
side margins 56.69 pt, top margin 84 pt, bottom margin 52 pt, the band 38 pt high at y 24.
Colours from KERN's tokens (the Revamp values in `frontend/src/index.css`), the draft colours of
`ConnectionStatusBadge` and the mark colours of `BranchMark`, written as hex in `constants.ts`
with each token's name (the worker can't read CSS). Table and contrast: design-notes §4; it fixes
two of the prototype's colours that fail FR-039 (removed text, 3.0:1; white on the draft pill,
4.1:1).

**Alternatives rejected**: the identifiers at the bottom and the location at the top
(`*-ids-bottom.pdf`), the exploration's rejected placement; the prototype's own hues (not KERN's,
and two fail contrast).

## R9. The run: fresh content, model on the main thread, language captured

**Decision**: "Download PDF" captures the language and the moment, fetches the connection again
(`getFormConnection(id, { language })`, spec 009's language option), hands it to the page
(`useFormConnection`'s `replace`, widened to take a draft, so the page shows what the file shows:
FR-005), takes the option sets and the catalog in that language from spec 009's per-language
caches, builds the model on the main thread, and posts it to the worker. A 404 shows the
details' not-found state; a 401 signs out.

**Rationale**: the model needs React-side data (option sets, catalog, the language) and the
texts' functions, which can't cross `postMessage`; building it takes milliseconds even at the
limits, while layout and drawing take seconds and go to the worker.

**Alternatives rejected**: the page's loaded copy (FR-005: the file must show what is stored);
fetching inside the worker (no session handling, no `useSignOutOnUnauthorized`, a second
fetching path); comparing before replacing (a `replace` with equal content changes nothing
visible).

## R10. A draft's gaps

**Decision**: the gaps are everything publishing would refuse (FR-010, the spec's
clarification), in the create flow's words: first the connection's own (no name, a name or
description too long, no documents, a document without data items), then `publishProblems()`, a
new pure function in `rules/src/validation.ts` beside `firstProblem()` that walks the same checks
in the same order but collects, one problem per item, each a `RulesProblem` with spec 009's
`code`. A rule's "Not complete: …" is that code mapped to the create flow's instruction ("Choose
a check.", "Choose the data to check.", "Write the message for citizens.", …).

**Not gaps** (FR-010): publishing's two checks that aren't about content, the rules' identifiers
against the draft's counters (`check_first_save`) and a variant's id already in use
(`check_draft_branch_ids`). The browser can't judge the second and the editor never produces the
first. Tasks T037 pins the rest against the server: C's publish is refused with the first gap's
message, D's is accepted.

**Alternatives rejected**: the prototype's two kinds only (the spec's clarification asks for
everything); `firstProblem()` alone (one gap); the rule checks' findings (FR-010, FR-041).

## R11. Measuring, URLs and blocks taller than a page

**Decision**:
- `Measure` has `height(text, style, width)` (PDFKit's `heightOfString` with the same options
  the drawing uses, so measured equals drawn) and `width(text, style)` (`widthOfString`).
- **URLs** are cut into lines by `urlLines()` only after a "/" and drawn line by line: PDFKit's
  line breaking follows Unicode's rules (UAX #14, through `linebreak`), which allow a break
  after a hyphen-minus that a letter follows, and the connection's UUIDs have such hyphens
  ("…-a716-…"); FR-011 allows breaks only after "/". A segment wider than the line alone (not possible with today's URLs) breaks at the
  line's end.
- **A rule taller than a page** (FR-027): the worst case is real. A nationality rule with all 249
  countries in German, inside a sub-group, with a 100-character name and a 500-character message,
  is estimated at about 730 pt against a 706 pt body (2,522 characters of country names in
  English alone, about 36 lines of 14 pt at the sub-group's width). The builder cuts such a rule into a head block
  (identifier, name, mark, the statement's subject and words, the values that fit) and
  continuation blocks of the remaining values and then the message, at value boundaries, each at
  most a page tall; the paginator places them like any blocks, breaking between them only on
  overflow.
- **Long lists** are blocks per entry: each gap of the "To finish" box (a draft at the limits can
  have hundreds), each result link; the box's heading and sentence chain to the first entry.

**Alternatives rejected**: wrapping all text ourselves (exact too, but more code than
`heightOfString` needs, and kerning and shaping would be ours to keep consistent); letting PDFKit
flow text across pages (it adds pages behind our pagination's back); shrinking a tall rule's font
(unreadable at the limits).

## R12. The MCP server shows the version

**Decision**: `get_connection` returns `version_fingerprint` for a published connection and a
draft; `mcp/plugin/skills/connection-workflow` and `publishing-and-live-connections` say what it
is (the details page's and the PDF's "Version", a fingerprint, not `draft.version`, the save
number) and that a draft published unchanged keeps it. Updated in the same change (`CLAUDE.md`).

**Rationale**: agents help team members review and publish drafts; with the version they can
say which reviewed PDF matches what is about to go live, or whether a printout is current, the
traceability US3 is for. One field in one tool, no new tool.

**Alternatives rejected**: no change (agents couldn't answer "is my printout current?"); the
field in every tool's output (noise in item-level tools); a PDF tool (spec, Out of Scope).

## R13. States, failures and cancellation

**Decision**: the hook's reducer (data-model §6): `idle`, `fetching`, `rendering`, `failed`. A
second activation while busy does nothing. A failure of the fetch, the context, the worker's
start, the run or the watchdog (`PDF_WATCHDOG_MS` = 120 s, twice SC-001's bound and 35 times the
spike's slowest run) shows the details' error notice with "Try again" and saves nothing; the worker
is terminated after a failure and recreated on the next try. Unmounting terminates the worker and
ignores late answers. The live region the details use for "Link copied" announces the start and
the saved file. Copy and layout: design-notes §2–§3.

**Alternatives rejected**: a progress bar (SC-001's times are seconds; the busy label is enough);
cancelling by a button (leaving the page cancels; nothing else asked for it).

## R14. Tests without a PDF parser

**Decision**: the Vitest smoke test renders the sample (published and draft, English and German)
with PDFKit's Node build and the committed TTFs, and checks:
- the raw output, rendered with `compress: false` so that every dictionary and the XMP
  metadata are readable bytes, for `/Lang`, `/StructTreeRoot`, `/MarkInfo`,
  `/DisplayDocTitle true`, `/Outlines`, `pdfuaid:part` and no `/CIDSet`;
- through a thin recording wrapper around the document that `render()` receives, the text drawn
  on each page: every page carries the connection ID, "Version <version>" and "Page n of N", and
  a draft's PDF holds no "http".

Embedded text is written as glyph ids, so reading it back would need a PDF parser (such as
`pdfjs-dist`, a new dev dependency); recording what `render()` draws tests the same promise with
none. pytest covers the fingerprint (R6). Manual checks: quickstart.md.

**Alternatives rejected**: `pdfjs-dist` in the tests (a large dev dependency for text the
recorder already sees); snapshots of the bytes (they change with the time of generation and any
PDFKit update).
