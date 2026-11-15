# Phase 0 spike (2026-11-09)

The prototype (`../make.mjs`) ported to PDFKit's browser build in a Vite 8 module worker, to
measure what [research.md](../../research.md), "Phase 0 spike", records. A sketch, not the
implementation: the implementation follows the plan's modules and contracts.

What to reuse from it:
- `src/workers/pdf.ts`: dynamic `import()` of PDFKit and the fonts' `?url` imports in a module
  worker; the output collected from `data` events.
- `src/pdf/render.js`: `font: null` in the `PDFDocument` options (the browser build otherwise
  opens Helvetica and throws), and the `CIDSet` workaround before `end()` (veraPDF 7.21.4.2).
- `vite.config.js`: `worker: { format: 'es' }`, needed for a dynamic `import()` in a worker.
- `src/pdf/big.js`: the largest connection (Standard and 19 based variants, 40 groups of 4 rules
  each), which `testData.ts` can follow.

Run it again:

```bash
npm install                                 # here, not in the repository's root
mkdir -p out && npx vite build              # dist/: the chunk sizes
node serve.mjs 4181 firefox                 # serves dist/; Firefox's page posts its results here
node cdp.mjs http://localhost:4181/ chromium  # headless Chromium: timings and PDFs in out/
node node-smoke.mjs                         # PDFKit's Node build on the same render code
```

Headless Chromium can't start inside Claude Code's sandbox (`socket() failed: Operation not
permitted`); the spike ran the browsers outside it.

veraPDF (1.30.4, with Java) validated the PDFs with `verapdf --flavour ua1 out/<file>.pdf`.
`dist/`, `out/`, `verapdf/` and `node_modules/` aren't committed.
