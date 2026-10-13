import { KernAlert } from '@kern-ux-annex/kern-react-kit';
import { type SyntheticEvent, useEffect, useRef } from 'react';

import ErrorNoticeText from '../../components/ErrorNoticeText';
import { EDITOR_COPY } from './constants';
import type { PublishDialogProps } from './types';

/**
 * Figma "Dialog: Ready to publish?" (06d), a KERN dialog. It is a native modal dialog: the
 * page behind it is inert, Escape closes it, and closing it returns the focus to the
 * "Publish" button. While the connection is being created it can't be closed. If that
 * fails, it stays open with the API's message above the summary and offers "Try again" (no
 * frame; bug publish-error-offscreen): wherever the page is scrolled, the dialog is in view.
 */
export default function PublishDialog({
  open,
  summary,
  publishing,
  error,
  onCancel,
  onConfirm,
}: PublishDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Escape: the page's state decides whether the dialog closes
  function handleCancel(event: SyntheticEvent<HTMLDialogElement>) {
    event.preventDefault();
    onCancel();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="publish-dialog-title"
      aria-describedby={
        error ? 'publish-dialog-error publish-dialog-summary' : 'publish-dialog-summary'
      }
      onCancel={handleCancel}
      // As in the KERN Figma dialog: centred (Tailwind's preflight drops the browser's
      // margin: auto), with its outline drawn inside like Figma's stroke, and the design's
      // scrim (text colour at 50%, where kern.css uses black at 72%). The !s beat kern.css,
      // which isn't in a cascade layer
      className="kern-dialog ring-kern-layout-border backdrop:bg-kern-layout-text-default! m-auto w-600 max-w-[calc(100vw-32px)]! border-0! ring-1 ring-inset backdrop:opacity-50!"
    >
      <header className="kern-dialog__header">
        {/* The container of the Figma dialog, which puts the title 8px lower than kern.css */}
        <div className="flex-1 pt-8 pr-16">
          <h2 id="publish-dialog-title" className="kern-title kern-title--large">
            {EDITOR_COPY.dialogTitle}
          </h2>
        </div>
        <button
          type="button"
          onClick={onCancel}
          aria-disabled={publishing}
          className="kern-btn kern-btn--tertiary"
        >
          <span aria-hidden="true" className="kern-icon kern-icon--close" />
          <span className="kern-sr-only">{EDITOR_COPY.close}</span>
        </button>
      </header>
      <div className="kern-dialog__body">
        {error && (
          <KernAlert
            id="publish-dialog-error"
            variant="danger"
            title={EDITOR_COPY.publishErrorTitle}
            className="w-full"
          >
            <ErrorNoticeText notice={error} />
          </KernAlert>
        )}
        <p id="publish-dialog-summary" className="kern-body kern-body--large">
          {summary}
        </p>
      </div>
      {/* 23px: in Figma the top stroke is inside the 24px padding */}
      <footer className="kern-dialog__footer pt-23!">
        <button
          type="button"
          onClick={onCancel}
          aria-disabled={publishing}
          className="kern-btn kern-btn--secondary w-full sm:w-[calc(50%-8px)]"
        >
          <span className="kern-label">{EDITOR_COPY.checkAgain}</span>
        </button>
        <button
          type="button"
          onClick={publishing ? undefined : onConfirm}
          aria-disabled={publishing}
          className="kern-btn kern-btn--primary w-full sm:w-[calc(50%-8px)]"
        >
          <span className="kern-label">
            {publishing ? EDITOR_COPY.publishing : error ? EDITOR_COPY.retry : EDITOR_COPY.confirm}
          </span>
        </button>
      </footer>
    </dialog>
  );
}
