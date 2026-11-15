import { KernAlert } from '@kern-ux-annex/kern-react-kit';

import downloadIcon from '../../assets/icons/download-action.svg';
import ErrorNoticeText from '../../components/ErrorNoticeText';
import { useCopy } from '../../hooks/useLanguage';
import { CONNECTION_DETAIL_COPY } from './constants';
import type { PdfDownloadProps, PdfFailureProps } from './types';

/**
 * The Summary header's controls (spec 011, FR-001, FR-032; design-notes §2, §3), in
 * `DetailAccordion`'s `actions` slot: "Version <code>" as plain text, the label small and muted,
 * the code medium weight with tabular figures in the text colour, one line that wraps before the
 * code on a narrow window but never inside it; then KERN's secondary button of the regular size
 * with the download glyph (U82 6396:48196, 177 × 48; on a narrow window without the glyph, its
 * label wrapping between words and the button taller, D8). Busy (the fetch and the worker), it
 * reads "Creating PDF…", keeps the glyph and is `aria-disabled`, its clicks ignored, as
 * `ConfirmDialog`'s busy button (FR-003). Its own polite live region, there from mount (the details
 * have no shared one), says "Creating the PDF…" once a run starts and "PDF saved." once the file
 * is saved; a failure is `PdfFailure`'s alert. Without `pdf`, the version alone (no caller does
 * that today: the published and the draft's details both pass it).
 */
export default function PdfDownload({ version, pdf, buttonRef }: PdfDownloadProps) {
  const copy = useCopy(CONNECTION_DETAIL_COPY);
  // The version's words around the code, in the language's order
  const text = copy.version(version);
  const at = text.lastIndexOf(version);
  const busy = pdf?.state.status === 'fetching' || pdf?.state.status === 'rendering';
  const announcement = pdf?.state.announcement ?? null;
  const label = busy ? copy.creatingPdf : copy.downloadPdf;
  // The German label's soft hyphen (D8) stays out of the button's name, as in `ConfirmDialog`
  const plainLabel = label.replaceAll('\u00AD', '');

  return (
    <>
      <p className="text-kern-static-small text-kern-layout-text-muted leading-(--kern-typography-line-height-medium-static) whitespace-nowrap">
        {text.slice(0, at)}
        {/* Not `whitespace-nowrap`, which a narrow window lets wrap: the code never breaks */}
        <span className="text-kern-layout-text-default font-medium text-nowrap tabular-nums">
          {version}
        </span>
        {text.slice(at + version.length)}
      </p>
      {pdf && (
        <>
          <button
            ref={buttonRef}
            type="button"
            onClick={busy ? undefined : pdf.download}
            aria-disabled={busy}
            aria-label={plainLabel === label ? undefined : plainLabel}
            // KERN draws the 1px border outside its 16px; the frame inside them (177 wide)
            className="kern-btn kern-btn--secondary narrow:px-7! max-w-full px-15!"
          >
            {/* On a narrow window the glyph gives its 32px to the label, which then wraps only
                between words (or at the German soft hyphen) and the button grows taller (D8) */}
            <img src={downloadIcon} alt="" className="narrow:hidden! size-24 shrink-0" />
            <span className="kern-label">{label}</span>
          </button>
          <p role="status" className="sr-only">
            {announcement === 'creating'
              ? copy.creatingPdfAnnouncement
              : announcement === 'saved'
                ? copy.pdfSaved
                : ''}
          </p>
        </>
      )}
    </>
  );
}

/**
 * The PDF's failure (FR-004; design-notes §3), in `DetailAccordion`'s `notice` slot under the
 * header row, open or closed: KERN's danger alert "Couldn’t create the PDF" with the server's
 * message and a 5xx's error ID, or "Check your connection and try again.", and a secondary "Try
 * again" that starts a new run, as the Activity card's failure; gone once a run starts
 */
export function PdfFailure({ notice, onRetry }: PdfFailureProps) {
  const copy = useCopy(CONNECTION_DETAIL_COPY);
  return (
    <div className="flex flex-col items-start gap-16">
      <KernAlert variant="danger" title={copy.pdfFailedTitle} className="w-full">
        <ErrorNoticeText notice={notice} />
      </KernAlert>
      <button type="button" onClick={onRetry} className="kern-btn kern-btn--secondary">
        <span className="kern-label">{copy.retry}</span>
      </button>
    </div>
  );
}
