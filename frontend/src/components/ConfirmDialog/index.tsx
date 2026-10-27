import { KernAlert } from '@kern-ux-annex/kern-react-kit';
import { type SyntheticEvent, useEffect, useId, useRef } from 'react';

import ErrorNoticeText from '../ErrorNoticeText';
import { CONFIRM_DIALOG_COPY } from './constants';
import type { ConfirmDialogProps } from './types';

/**
 * KERN's dialog, asking to confirm an action (Figma "Dialog: Ready to publish?", 06d). It is a
 * native modal dialog: the focus moves into it, the page behind it is inert, Escape closes it,
 * and closing it returns the focus to the button that opened it. While the action runs it
 * can't be closed. If the action fails, it stays open with the API's message above the text
 * and offers to try again: wherever the page is scrolled, the dialog is in view.
 */
export default function ConfirmDialog({
  open,
  title,
  text,
  textClassName = 'kern-body kern-body--large',
  children,
  confirmLabel,
  cancelLabel,
  danger = false,
  busyLabel = '',
  busy = false,
  error = null,
  errorTitle = '',
  retryLabel = '',
  onCancel,
  onClose = onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const id = useId();
  const titleId = `${id}-title`;
  const errorId = `${id}-error`;
  const textId = `${id}-text`;

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
    onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={[error ? errorId : '', text ? textId : ''].join(' ').trim() || undefined}
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
          <h2 id={titleId} className="kern-title kern-title--large">
            {title}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-disabled={busy}
          className="kern-btn kern-btn--tertiary"
        >
          <span aria-hidden="true" className="kern-icon kern-icon--close" />
          <span className="kern-sr-only">{CONFIRM_DIALOG_COPY.close}</span>
        </button>
      </header>
      <div className="kern-dialog__body">
        {error && (
          <KernAlert id={errorId} variant="danger" title={errorTitle} className="w-full">
            <ErrorNoticeText notice={error} />
          </KernAlert>
        )}
        {children ? (
          <div className="flex w-full flex-col gap-16">
            {text && (
              <p id={textId} className={textClassName}>
                {text}
              </p>
            )}
            {children}
          </div>
        ) : (
          <p id={textId} className={textClassName}>
            {text}
          </p>
        )}
      </div>
      {/* 23px: in Figma the top stroke is inside the 24px padding */}
      <footer className="kern-dialog__footer pt-23!">
        <button
          type="button"
          onClick={onCancel}
          aria-disabled={busy}
          className="kern-btn kern-btn--secondary w-full sm:w-[calc(50%-8px)]"
        >
          <span className="kern-label">{cancelLabel}</span>
        </button>
        <button
          type="button"
          onClick={busy ? undefined : onConfirm}
          aria-disabled={busy}
          className={`kern-btn kern-btn--primary w-full sm:w-[calc(50%-8px)] ${danger ? 'kern-btn--danger' : ''}`}
        >
          <span className="kern-label">{busy ? busyLabel : error ? retryLabel : confirmLabel}</span>
        </button>
      </footer>
    </dialog>
  );
}
