# Contract: the download, its hook and its worker

**Requirements**: FR-001 to FR-006, FR-034, FR-041, FR-042, the edge cases on a changed or
deleted connection, a language switch, leaving the page and a second activation. **Decisions**:
research R2, R9, R13. **Shapes**: [data-model.md](../data-model.md) §2, §5, §6.

## 1. Who does what

| Part | Path | Touches browser APIs | Does |
|---|---|---|---|
| Button and version | `pages/FormConnectionDetail/PdfDownload.tsx` (in the strip under the Summary card's header row, through `DetailAccordion`'s `strip` slot; the `actions` slot beside the toggle until 2026-11-18, bug v5-ui-fixes (B3)) | no | shows "Download PDF", the busy state, the failure notice and "Version …" |
| Hook | `hooks/useConnectionPdf.ts` | yes: `Worker`, `URL.createObjectURL`, an anchor's `download` | the reducer of data-model §6; fetches, builds the model, runs the worker, saves the file |
| Worker | `workers/pdf.ts` | yes: worker scope, `fetch` of the font files | imports PDFKit and the fonts dynamically, renders, posts the bytes |
| Pure modules | `utils/connectionPdf/*.ts` | no | the model, gaps, file name, blocks, paginate, the drawing over an injected PDFKit document, texts |

Nothing else in the app changes behaviour. No `console.*` in any of them (`CLAUDE.md`).

## 2. The hook

```ts
function useConnectionPdf(options: {
  id: string;
  onFetched: (connection: FormConnectionOrDraft) => void;  // the page shows what is stored now
  onGone: () => void;                                       // the page shows "not found"
}): {
  state: PdfDownloadState;           // data-model §6
  download: () => void;              // ignored unless idle or failed
};
```

On `download()`:

1. **Capture**: the language (spec 009's `useLanguage()`) and the moment (`new Date()`); both
   hold for this run whatever happens on the page afterwards (edge case: language switched).
2. **Fetch** (FR-005): `getFormConnection(id, { language })` (spec 009's
   `ApiFetchOptions.language`), so the server's labels match the captured language. Then:
   - 401: `useSignOutOnUnauthorized()` as everywhere;
   - 404: `onGone()`; no file;
   - other failure: `failed` with `errorNoticeOf(error, DETAIL_COPY.pdfFailedText)` (a 5xx's
     `error_id`; design-notes §3);
   - success: `onFetched(connection)`, so the page, the file, the "as of" status and the version
     agree; a draft published meanwhile is now a published connection and is made as one.
3. **Context**: the option sets and, for a draft, the catalog, in the captured language,
   through spec 009's per-language caches (`getOptionSets(language)`,
   `getDocumentTypes(language)`); their failure fails the run as in step 2.
4. **Model**: `connectionPdfModelOf(connection, context, { language, now })` (pure).
5. **Render**: posts `{ type: 'render', runId, model }` to the worker, created on first use with
   `new Worker(new URL('../workers/pdf.ts', import.meta.url), { type: 'module' })` inside a
   try/catch (a worker that can't start fails the run), and kept for later runs on this page.
   A watchdog (`PDF_WATCHDOG_MS`, research R13) fails a run that never answers and terminates
   the worker.
6. **Save**: on `rendered` for the current `runId`: `new Blob([bytes], { type:
   'application/pdf' })`, `URL.createObjectURL`, a detached anchor with `download =
   fileNameOf(model)` clicked, then `URL.revokeObjectURL` after the click's task. State back to
   `idle`; a polite live region says the file was saved (design-notes §3).
7. **Failure**: on `failed`, `error`, `messageerror` or the watchdog: `failed`, the worker
   terminated (a new one starts on the next try), no file (FR-004).

**Unmount**: the effect's cleanup terminates the worker and sets the ignore flag; a fetch or a
`rendered` that arrives later does nothing (edge case: leaving the page).

**Not sent anywhere** (FR-042, SC-008): the hook makes exactly one request the page makes anyway
(`GET /api/form-connections/{id}`, plus the option sets and catalog when their cache is cold) and
no other; the file never leaves the browser. The worker's own requests are static files only
(its chunk, PDFKit's chunk and the five fonts, on the first run after the page was loaded): the
same for every connection, so they say nothing about which one was downloaded.

## 3. The worker

`frontend/src/workers/pdf.ts`, a module worker with its own typed scope as `checks.ts` and
`personas.ts` have (`interface PdfWorkerScope { onmessage; postMessage }`).

```text
→ { type: 'render', runId, model }
← { type: 'rendered', runId, bytes }     bytes: ArrayBuffer, in the transfer list
← { type: 'failed', runId }              no reason, nothing logged
```

- On its first message it loads, with dynamic `import()`, PDFKit's browser build
  (`pdfkit/js/pdfkit.browser.mjs` through the package's browser entry) and a module of the five
  TTFs' `?url` imports, then `fetch`es the fonts as `ArrayBuffer`s (research R2, R7). None of it
  is in the main bundle or loaded before the first click; later messages reuse them. This needs
  `worker: { format: 'es' }` in `frontend/vite.config.ts` (spike).
- It runs `renderConnectionPdf(model, { PDFDocument, fonts })` from
  `utils/connectionPdf/render.ts`, collects the document's `data` chunks until `end`, and posts
  the bytes.
- `render.ts` creates the document with `font: null` (PDFKit's browser build otherwise opens
  Helvetica and throws) and, before `end()`, applies the `CIDSet` workaround in one named
  function, `withoutCidSet(doc)`, the only place that touches PDFKit's internals; the smoke test
  fails if PDFKit's output gains a `/CIDSet` again or loses `pdfuaid:part` (research R5).
- It keeps no state between runs except the loaded modules and fonts. It catches an exception
  of a run only to answer `failed` for that run.

## 4. The pure modules (`frontend/src/utils/connectionPdf/`)

Every module has its `*.test.ts` (Vitest, `node`).

| Module | Exports | Tested with |
|---|---|---|
| `model.ts` | `connectionPdfModelOf(connection, context, { language, now })` | published and draft samples, both languages |
| `gaps.ts` | `gapsOf(draft, context, language)`, `missingOf(problem, language)` | each kind of gap, the order, none |
| `fileName.ts` | `fileNameOf(model)` | forbidden characters, length, empty name, draft |
| `wrapUrl.ts` | `urlLines(url, width, measure)` | breaks only after `/`, never inside a segment unless it alone is wider than the line |
| `blocks.ts` | `blocksOf(model, measure)` | a stub `Measure` (width = characters × a constant) |
| `paginate.ts` | `paginate(blocks, pageHeight)` | made-up heights (research R4's cases) |
| `render.ts` | `renderConnectionPdf(model, { PDFDocument, fonts, measure? })` | the Node smoke test with PDFKit's Node build |
| `constants.ts` | `PDF_TEXTS` (`defineTexts(en, de)`), layout and colours | spec 009's copy test (both columns, same keys) |
| `types.ts` | the shapes of data-model §2, §4, §5 | |

`render.ts` imports PDFKit's types only and receives the constructor and the fonts' bytes, so the
worker passes the browser build and fetched fonts, and the smoke test the Node build (`import
PDFDocument from 'pdfkit'` in the test file, which runs in Node) and the same TTFs read with
`node:fs` from `src/assets/fonts/`. The spike ran its port unchanged in both (6 pages, `/Lang`,
`/StructTreeRoot`, "Page n of 6" on every page, 0.5 s in Node).
