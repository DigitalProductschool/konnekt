// The connection PDF's download (specs/011-connection-pdf, contracts/pdf-worker.md section 2;
// research R9, R13; data-model section 6): it fetches the connection again in the captured
// language, builds the model on the main thread, has the worker make the file and saves it. The
// only module of the PDF besides the worker that touches browser APIs: the worker, an object URL
// and an anchor's `download`. Nothing about the connection or the file is stored, sent or logged
// (FR-041, FR-042): the requests are the ones the details page makes anyway
import type { FormConnectionOrDraft } from '@konnekt/api-types/form-connections';
import type { Language } from '@konnekt/rules/language';
import { type Dispatch, useEffect, useReducer, useRef } from 'react';

import { ApiError, errorNoticeOf } from '../api/client';
import { getDocumentTypes } from '../api/document-types';
import { getFormConnection } from '../api/form-connections';
import { getOptionSets } from '../api/option-sets';
import { CONNECTION_DETAIL_COPY } from '../pages/FormConnectionDetail/constants';
import type { PdfModelContext } from '../utils/connectionPdf/model';
import type { PdfAnswer, PdfDownloadAction, PdfRequest } from '../utils/connectionPdf/types';
import type { ConnectionPdf, ConnectionPdfOptions, PdfRunRefs } from './types';
import { useLanguage } from './useLanguage';
import { useSignOutOnUnauthorized } from './useSignOutOnUnauthorized';
import { cachedListOf, INITIAL_PDF_DOWNLOAD_STATE, pdfDownloadReducer } from './utils';

function initialRefs(): PdfRunRefs {
  return {
    runCount: 0,
    current: null,
    rendering: null,
    worker: null,
    fetched: { optionSets: {}, documentTypes: {} },
    mounted: false,
  };
}

/**
 * The model's modules, loaded on the first run: imported statically, they and their texts would
 * add about 20 kB to the main bundle of every page (constitution III)
 */
function pdfModulesOf() {
  return Promise.all([
    import('../utils/connectionPdf/model'),
    import('../utils/connectionPdf/fileName'),
    import('../utils/connectionPdf/constants'),
  ]);
}

/** Whether `runId` is the run in flight on a mounted page */
function isCurrent(refs: PdfRunRefs, runId: number): boolean {
  return refs.mounted && refs.current === runId;
}

/** Ends the run in flight: its watchdog cleared, the worker terminated unless `keepWorker` */
function endRun(refs: PdfRunRefs, keepWorker: boolean): void {
  refs.current = null;
  if (refs.rendering !== null) {
    window.clearTimeout(refs.rendering.watchdog);
    refs.rendering = null;
  }
  if (!keepWorker) {
    refs.worker?.terminate();
    refs.worker = null;
  }
}

/**
 * The run fails (FR-004): the server's message with a 5xx's error id, or "Check your connection
 * and try again." in the run's language; no file. The worker is terminated (a new one starts on
 * the next try) unless `keepWorker`: a failed fetch keeps it, so that "Try again" doesn't load
 * its chunks and fonts again (SC-008: those only on the first run). Nothing for a run that isn't
 * current
 */
function failRun(
  refs: PdfRunRefs,
  dispatch: Dispatch<PdfDownloadAction>,
  runId: number,
  language: Language,
  error: unknown,
  keepWorker = false
): void {
  if (!isCurrent(refs, runId)) return;
  endRun(refs, keepWorker);
  const notice = errorNoticeOf(error, CONNECTION_DETAIL_COPY[language].pdfFailedText);
  dispatch({ type: 'failed', runId, notice });
}

/** Saves the file: a detached anchor with `download`, its object URL revoked in a later task */
function saveFile(bytes: ArrayBuffer, fileName: string): void {
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  // Firefox can lose a download whose URL is revoked in the click's own task
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

/**
 * The worker of every run on the page, started on first use and kept; null when it can't start.
 * Its answers count only for the run it is making (`refs.rendering`): `rendered` saves the file,
 * `failed`, an error and a message that can't be read fail the run
 */
function workerOf(refs: PdfRunRefs, dispatch: Dispatch<PdfDownloadAction>): Worker | null {
  if (refs.worker !== null) {
    return refs.worker;
  }
  let worker: Worker;
  try {
    worker = new Worker(new URL('../workers/pdf.ts', import.meta.url), { type: 'module' });
  } catch {
    return null;
  }
  const fail = () => {
    const run = refs.rendering;
    if (run !== null) failRun(refs, dispatch, run.runId, run.language, null);
  };
  worker.addEventListener('message', (event: MessageEvent<PdfAnswer>) => {
    const answer = event.data;
    const run = refs.rendering;
    if (run === null || answer.runId !== run.runId || !isCurrent(refs, run.runId)) return;
    if (answer.type === 'rendered') {
      endRun(refs, true);
      saveFile(answer.bytes, run.fileName);
      dispatch({ type: 'rendered', runId: run.runId });
    } else {
      fail();
    }
  });
  worker.addEventListener('error', (event) => {
    // Handled here, so that the browser doesn't log it: nothing about the PDF is logged
    event.preventDefault();
    fail();
  });
  worker.addEventListener('messageerror', fail);
  refs.worker = worker;
  return worker;
}

/**
 * The option sets and, for a draft, the catalog in `language`: the page's list of that language,
 * or one an earlier run fetched, or else fetched now (spec 009's language option) and kept
 */
async function contextOf(
  refs: PdfRunRefs,
  connection: FormConnectionOrDraft,
  language: Language,
  cached: Pick<ConnectionPdfOptions, 'optionSets' | 'documentTypes'>
): Promise<PdfModelContext> {
  const { fetched } = refs;
  const draft = connection.status === 'draft';
  const [optionSets, documentTypes] = await Promise.all([
    cachedListOf(language, cached.optionSets, fetched.optionSets) ?? getOptionSets(language),
    draft
      ? (cachedListOf(language, cached.documentTypes, fetched.documentTypes) ??
        getDocumentTypes(language))
      : null,
  ]);
  fetched.optionSets[language] = optionSets;
  if (documentTypes !== null) {
    fetched.documentTypes[language] = documentTypes;
  }
  return { optionSets, documentTypes };
}

/**
 * "Download PDF" on the details (contracts/pdf-worker.md section 2). `download()` captures the
 * website's language and the moment, which hold for the run whatever the page does afterwards;
 * fetches the connection in that language (FR-005) and hands it to `onFetched`, or calls `onGone`
 * on a 404; takes the option sets and, for a draft, the catalog in that language from the page's
 * lists (`optionSets`, `documentTypes`: `byLanguage` of `useOptionSets()` and
 * `useDocumentTypes()`) or fetches what they lack; builds the model and has the worker, started on
 * first use and kept for later runs, make the file, which it saves. A 401 signs out; any other
 * failure, of a fetch, the worker or the watchdog (`PDF_WATCHDOG_MS`), ends in `failed` with its
 * notice and no file (FR-004); a failure of the worker or the watchdog also terminates the
 * worker. A `download()` while busy does nothing (FR-003). Unmounting terminates the worker and
 * ignores every late answer.
 *
 * The state's `announcement` is what the button's polite live region says, as a key the page
 * words. The page keeps the hook mounted for as long as its run may change what the page shows:
 * `onFetched` with a draft published meanwhile shows the published details, and a hook that
 * unmounts with them cancels the run.
 */
export function useConnectionPdf({
  id,
  onFetched,
  onGone,
  optionSets,
  documentTypes,
}: ConnectionPdfOptions): ConnectionPdf {
  const [state, dispatch] = useReducer(pdfDownloadReducer, INITIAL_PDF_DOWNLOAD_STATE);
  const { language } = useLanguage();
  const handleUnauthorized = useSignOutOnUnauthorized();
  const refsHolder = useRef<PdfRunRefs>(initialRefs());

  useEffect(() => {
    const refs = refsHolder.current;
    refs.mounted = true;
    return () => {
      refs.mounted = false;
      endRun(refs, false);
    };
  }, []);

  /** A fetch failed: a 404 of the connection is gone, a 401 signs out, the rest fails the run */
  function fetchFailed(runId: number, runLanguage: Language, error: unknown, gone: boolean): void {
    const refs = refsHolder.current;
    if (!isCurrent(refs, runId)) return;
    if (gone && error instanceof ApiError && error.status === 404) {
      endRun(refs, true);
      dispatch({ type: 'gone', runId });
      onGone();
    } else if (handleUnauthorized(error)) {
      endRun(refs, true);
      dispatch({ type: 'signedOut', runId });
    } else {
      failRun(refs, dispatch, runId, runLanguage, error, true);
    }
  }

  async function run(runId: number, runLanguage: Language, now: Date): Promise<void> {
    const refs = refsHolder.current;
    // Loaded while the connection is fetched; a module that can't load fails the run below
    const modules = pdfModulesOf();
    modules.catch(() => {});
    let connection: FormConnectionOrDraft;
    try {
      connection = await getFormConnection(id, { language: runLanguage });
    } catch (error) {
      fetchFailed(runId, runLanguage, error, true);
      return;
    }
    if (!isCurrent(refs, runId)) return;
    onFetched(connection);

    let context: PdfModelContext;
    try {
      context = await contextOf(refs, connection, runLanguage, { optionSets, documentTypes });
    } catch (error) {
      fetchFailed(runId, runLanguage, error, false);
      return;
    }
    if (!isCurrent(refs, runId)) return;

    try {
      const [{ connectionPdfModelOf }, { fileNameOf }, { PDF_WATCHDOG_MS }] = await modules;
      if (!isCurrent(refs, runId)) return;
      const model = connectionPdfModelOf(connection, context, { language: runLanguage, now });
      const worker = workerOf(refs, dispatch);
      if (worker === null) {
        failRun(refs, dispatch, runId, runLanguage, null);
        return;
      }
      const watchdog = window.setTimeout(
        () => failRun(refs, dispatch, runId, runLanguage, null),
        PDF_WATCHDOG_MS
      );
      refs.rendering = { runId, language: runLanguage, fileName: fileNameOf(model), watchdog };
      dispatch({ type: 'fetched', runId });
      const request: PdfRequest = { type: 'render', runId, model };
      worker.postMessage(request);
    } catch {
      // The model or the message couldn't be made: no file, as for any failure (FR-004)
      failRun(refs, dispatch, runId, runLanguage, null);
    }
  }

  return {
    state,
    download: () => {
      const refs = refsHolder.current;
      if (refs.current !== null || !refs.mounted) return;
      refs.runCount += 1;
      const runId = refs.runCount;
      refs.current = runId;
      dispatch({ type: 'start', runId });
      // The language and the moment hold for the run (edge case: the language switched)
      void run(runId, language, new Date());
    },
  };
}
