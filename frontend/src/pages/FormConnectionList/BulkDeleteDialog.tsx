import { useEffect, useState } from 'react';

import ConfirmDialog from '../../components/ConfirmDialog';
import { useLanguage } from '../../hooks/useLanguage';
import BulkDeleteLine, { BulkDeleteWarning } from './BulkDeleteLine';
import {
  BULK_DELETE_CLASSES,
  BULK_DELETE_COPY,
  BULK_DELETE_MAX_PROPERTY,
  BULK_DELETE_MIN_REGION,
} from './constants';
import type { BulkDeleteDialogProps } from './types';
import { bulkDeleteNoticeOf, bulkWarningsOf } from './utils';

/**
 * The most a modal dialog may be high: the browser's `calc(100% - 6px - 2em)` of the window
 * (`dialog:modal`), read from its computed style where that is in pixels
 */
function dialogLimitOf(dialog: HTMLDialogElement): number {
  const style = getComputedStyle(dialog);
  const limit = style.maxHeight.endsWith('px') ? Number.parseFloat(style.maxHeight) : Number.NaN;
  return Number.isFinite(limit)
    ? limit
    : document.documentElement.clientHeight - 6 - 2 * Number.parseFloat(style.fontSize);
}

/**
 * Caps the region of the open dialog at what the window leaves beside the dialog's other parts,
 * so that its title, text and buttons stay in view while the lines scroll (W12, EC-13). Where less
 * than `BULK_DELETE_MIN_REGION` is left, the region keeps its height and the dialog scrolls as a
 * whole. Measured again when the window or a part changes (a failure's alert, the language).
 * Answers whether the region scrolls, so that it takes the keyboard focus then
 */
function useRegionCap(region: HTMLDivElement | null, open: boolean): boolean {
  const [scrollable, setScrollable] = useState(false);
  useEffect(() => {
    const dialog = region?.closest('dialog');
    if (!open || !region || !dialog) {
      return;
    }
    const measure = () => {
      const others = dialog.scrollHeight - region.offsetHeight;
      const cap = Math.floor(dialogLimitOf(dialog) - others);
      region.style.setProperty(
        BULK_DELETE_MAX_PROPERTY,
        cap >= BULK_DELETE_MIN_REGION ? `${cap}px` : 'none'
      );
      setScrollable(region.scrollHeight > region.clientHeight + 1);
    };
    const observer = new ResizeObserver(measure);
    for (const part of [...dialog.children, ...region.children]) {
      observer.observe(part);
    }
    window.addEventListener('resize', measure);
    measure();
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [region, open]);
  return scrollable;
}

/**
 * The bulk delete dialog (spec 010, S4 "Delete"; FR-041 to FR-043; Figma U15 6699:45320; W8,
 * W12): "Delete <n> connections?", "Their documents and rules will be deleted too.", a line per
 * selected connection with its name and status pill (`BulkDeleteLine`), and a warning line per
 * active and per scheduled connection, both in the list's order; "Keep connections" and the red
 * "Delete connections". It follows the rule of dialogs that delete: the scrim doesn't close it,
 * nothing closes it while the deletion runs, and closing it gives the focus back to the selection
 * bar's "Delete" (the native dialog's opener). A long list scrolls inside it, the buttons in view.
 * A failure keeps it open above the text: "Nothing was deleted: “<name>” was deleted or changed
 * in the meantime." when a connection changed (`409 selection_changed`), without the confirm
 * button and with the focus on "Keep connections", since the selection is out of date (the
 * person reopens the dialog from the bar and sees the current statuses; design-notes §4.2 T084
 * (3)); or spec 008's failure with its error ID, the confirm button then reading "Try again"
 */
export default function BulkDeleteDialog({ state, onCancel, onConfirm }: BulkDeleteDialogProps) {
  const { language } = useLanguage();
  const copy = BULK_DELETE_COPY[language];
  const [region, setRegion] = useState<HTMLDivElement | null>(null);
  const scrollable = useRegionCap(region, state.open);
  const { rows } = state;
  if (!rows) {
    return null;
  }
  const title = copy.title(rows.length);
  const warnings = bulkWarningsOf(rows, language);
  const { error, retry } = bulkDeleteNoticeOf(state, language);
  return (
    <ConfirmDialog
      open={state.open}
      title={title}
      text={copy.text}
      textClassName={BULK_DELETE_CLASSES.text}
      confirmLabel={copy.confirm}
      cancelLabel={copy.cancel}
      danger
      busyLabel={copy.busy}
      busy={state.deleting}
      error={error}
      errorTitle={copy.errorTitle}
      retryLabel={copy.retry}
      hideConfirm={error !== null && !retry}
      dismissOnScrim={false}
      onCancel={onCancel}
      onConfirm={onConfirm}
    >
      {/* Focusable while it scrolls, so that it scrolls with the keyboard; named by the title */}
      <div
        ref={setRegion}
        role="group"
        aria-label={title}
        tabIndex={scrollable ? 0 : undefined}
        className={BULK_DELETE_CLASSES.region}
      >
        <ul className={BULK_DELETE_CLASSES.lines}>
          {rows.map((row) => (
            <BulkDeleteLine key={row.id} formConnection={row} />
          ))}
        </ul>
        {warnings.length > 0 && (
          <ul className={BULK_DELETE_CLASSES.warnings}>
            {warnings.map((warning) => (
              <BulkDeleteWarning key={warning.id} text={warning.text} />
            ))}
          </ul>
        )}
      </div>
    </ConfirmDialog>
  );
}
