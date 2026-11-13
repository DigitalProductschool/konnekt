// The module worker of the connection PDF (specs/011-connection-pdf, research R2, R7;
// contracts/pdf-worker.md section 3). On a 'render' message it renders the model with
// `renderConnectionPdf()` and posts the file's bytes, transferred, under the same run id; any
// exception of a run answers 'failed' with no reason. PDFKit's browser build and the fonts load on
// the first run only, with dynamic `import()`s that Vite splits into chunks and assets of their
// own, and are kept for later runs; a failed load fails that run and the next run tries again.
// Nothing else is kept between runs. It logs nothing, and its only requests are its own chunks and
// the five font files, the same for every connection (FR-042, SC-008)
import { renderConnectionPdf } from '../utils/connectionPdf/render';
import type {
  PdfAnswer,
  PdfFont,
  PdfFonts,
  PdfKitConstructor,
  PdfRequest,
} from '../utils/connectionPdf/types';

/**
 * The part of the worker's global scope this entry uses. `tsconfig.app.json` has the `DOM`
 * library, which conflicts with `WebWorker`, so the scope is typed here (as `checks.ts`)
 */
interface PdfWorkerScope {
  onmessage: ((event: MessageEvent<PdfRequest>) => void) | null;
  postMessage: (message: PdfAnswer, transfer?: Transferable[]) => void;
}

/** What the first run loads and later runs reuse */
interface Loaded {
  PDFDocument: PdfKitConstructor;
  fonts: PdfFonts;
}

const scope = self as unknown as PdfWorkerScope;

/** The load in progress or done; reset when it fails, so that the next run tries again */
let loading: Promise<Loaded> | null = null;

/** A font file's bytes; a failed request throws */
async function fontBytesOf(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('A font could not be loaded.');
  }
  return response.arrayBuffer();
}

/** PDFKit's browser build (the package's default entry) and the five fonts' bytes */
async function load(): Promise<Loaded> {
  const [pdfkit, { PDF_FONT_URLS }] = await Promise.all([import('pdfkit'), import('./pdfFonts')]);
  const names = Object.keys(PDF_FONT_URLS) as PdfFont[];
  const bytes = await Promise.all(names.map((name) => fontBytesOf(PDF_FONT_URLS[name])));
  const fonts = Object.fromEntries(names.map((name, index) => [name, bytes[index]])) as PdfFonts;
  // `pdfkit.d.ts` leaves the default export untyped; the importer casts it (design-notes 8.2 D1)
  return { PDFDocument: pdfkit.default as PdfKitConstructor, fonts };
}

/** The loaded modules and fonts, loading them on the first call and after a failed load */
function loaded(): Promise<Loaded> {
  if (loading === null) {
    const attempt = load();
    loading = attempt;
    attempt.catch(() => {
      if (loading === attempt) {
        loading = null;
      }
    });
  }
  return loading;
}

/**
 * The buffer holding exactly `bytes`: their own when they fill a whole `ArrayBuffer`, else a copy,
 * so that the transfer moves no byte beyond the file and never a shared buffer
 */
function bufferOf(bytes: Uint8Array): ArrayBuffer {
  const { buffer, byteOffset, byteLength } = bytes;
  if (buffer instanceof ArrayBuffer && byteOffset === 0 && byteLength === buffer.byteLength) {
    return buffer;
  }
  return bytes.slice().buffer;
}

/** One run: renders the model and posts its bytes, or 'failed' on any exception */
async function run({ runId, model }: PdfRequest): Promise<void> {
  try {
    const { PDFDocument, fonts } = await loaded();
    const bytes = bufferOf(await renderConnectionPdf(model, { PDFDocument, fonts }));
    scope.postMessage({ type: 'rendered', runId, bytes }, [bytes]);
  } catch {
    scope.postMessage({ type: 'failed', runId });
  }
}

scope.onmessage = (event) => {
  const request = event.data;
  if (request.type !== 'render') {
    return;
  }
  void run(request);
};
