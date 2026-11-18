import { KernAlert } from '@kern-ux-annex/kern-react-kit';

import downloadIcon from '../../assets/icons/download-action.svg';
import ErrorNoticeText from '../../components/ErrorNoticeText';
import { useCopy } from '../../hooks/useLanguage';
import { CONNECTION_DETAIL_COPY, PDF_BUTTON_CLASSES, PDF_STRIP_CLASSES } from './constants';
import type { PdfDownloadProps, PdfFailureProps } from './types';

/**
 * The Summary card's version strip (spec 011, FR-001, FR-032, as clarified on 2026-11-18;
 * design-notes §2, §3; V5 "Strip · version + PDF" 7603:61502, 7603:61521), in `DetailAccordion`'s
 * `strip` slot under the header row, open or closed: the hued background with an 8px radius, 44px
 * high, the version 16px from its left and the button 8 from its right, 6 from its top.
 * - "Version <code>" as plain text, the label small and muted, the code semibold (label/small
 *   600) with tabular figures in the text colour, one line that wraps before the code on a narrow
 *   window but never inside it.
 * - KERN's secondary button in the frame's compact size, 32px high (KERN's small is 40), with the
 *   24px download glyph and the label/small label (`PDF_BUTTON_CLASSES`): 156 × 32 in English.
 *   On a narrow window it goes without the glyph, its label wrapping between words and the button
 *   taller (D8); the strip wraps the button under the version where both don't fit on one row.
 *
 * Busy (the fetch and the worker), it reads "Creating PDF…", keeps the glyph and is
 * `aria-disabled`, its clicks ignored, as `ConfirmDialog`'s busy button (FR-003). Its own polite
 * live region, there from mount (the details have no shared one), says "Creating the PDF…" once a
 * run starts and "PDF saved." once the file is saved; a failure is `PdfFailure`'s alert. Without
 * `pdf`, the version alone (no caller does that today: the published and the draft's details both
 * pass it).
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
    <div className={PDF_STRIP_CLASSES}>
      <p className="text-kern-static-small text-kern-layout-text-muted leading-(--kern-typography-line-height-medium-static) whitespace-nowrap">
        {text.slice(0, at)}
        {/* Not `whitespace-nowrap`, which a narrow window lets wrap: the code never breaks */}
        <span className="text-kern-layout-text-default font-semibold text-nowrap tabular-nums">
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
            className={PDF_BUTTON_CLASSES}
          >
            {/* On a narrow window the glyph gives its 24px to the label, which then wraps only
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
    </div>
  );
}

/**
 * The PDF's failure (FR-004; design-notes §3), in `DetailAccordion`'s `notice` slot under the
 * header and its strip, open or closed: KERN's danger alert "Couldn’t create the PDF" with the
 * server's message and a 5xx's error ID, or "Check your connection and try again.", and a secondary
 * "Try again" that starts a new run, as the Activity card's failure; gone once a run starts
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
