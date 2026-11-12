import { KernAlert } from '@kern-ux-annex/kern-react-kit';
import { type MouseEvent, type SyntheticEvent, useEffect, useId, useRef } from 'react';

import { useCopy } from '../../hooks/useLanguage';
import ErrorNoticeText from '../ErrorNoticeText';
import {
  CONFIRM_DIALOG_COPY,
  DIALOG_ACTIONS_CLASSES,
  DIALOG_FRAME_CLASSES,
  DIALOG_WIDTH_CLASSES,
} from './constants';
import type { ConfirmDialogProps } from './types';
import { dialogButtonCountOf } from './utils';

/** Whether a pointer event on the dialog element itself lies outside its box: on the scrim */
function isOnScrim(event: MouseEvent<HTMLDialogElement>): boolean {
  const dialog = event.currentTarget;
  if (event.target !== dialog) {
    return false;
  }
  const box = dialog.getBoundingClientRect();
  return (
    event.clientX < box.left ||
    event.clientX > box.right ||
    event.clientY < box.top ||
    event.clientY > box.bottom
  );
}

/**
 * KERN's dialog (the kit's set, P12, with P33 dialog-actions), asking to confirm an action, as
 * the screens draw it (U14 6699:44480, U17 7173:52682, U25 7299:52174): the title, the ×, the
 * text, and one to three buttons that sit side by side while they fit and stack where they
 * don't; a long text makes the whole dialog scroll. It is a native modal dialog: the focus moves
 * into it and stays there (the page behind it is inert), and closing it returns the focus to the
 * control that opened it. Escape and the × close it (`onClose`), and so does a click on the
 * scrim unless `dismissOnScrim` is off (the dialogs that delete or publish, FR-052a). While the
 * action runs (`busy`, the working state) nothing closes it. If the action fails, it stays open
 * with the API's message above the text and offers to try again, or, where trying again can't
 * mend it (`hideConfirm`), only the cancel button, which takes the focus: wherever the page is
 * scrolled, the dialog is in view. It and its scrim fade in and out (design-notes §4).
 */
export default function ConfirmDialog({
  open,
  title,
  text,
  textClassName = 'kern-body kern-body--large',
  children,
  confirmLabel,
  cancelLabel = '',
  danger = false,
  busyLabel = '',
  busy = false,
  error = null,
  errorTitle = '',
  retryLabel = '',
  hideConfirm = false,
  onCancel,
  onClose = onCancel,
  onConfirm,
  secondaryLabel = '',
  onSecondary,
  secondaryDanger = false,
  dismissOnScrim = true,
  wide = false,
}: ConfirmDialogProps) {
  const copy = useCopy(CONFIRM_DIALOG_COPY);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  // Whether the press that ends in a click began on the scrim too, so that selecting text in
  // the dialog and letting go outside it doesn't close it
  const pressedOnScrim = useRef(false);
  const id = useId();
  const titleId = `${id}-title`;
  // A German title may hold a soft hyphen ("Veröffent&shy;lichen?", spec 009 R9), which breaks
  // the word on screen; Chromium and Firefox keep it in the accessible name, so the heading, and
  // through it the dialog, is named without it (T047). Without one the heading has no aria-label
  const plainTitle = title.replaceAll('\u00AD', '');
  const errorId = `${id}-error`;
  const textId = `${id}-text`;
  const hasCancel = cancelLabel !== '';
  const hasSecondary = onSecondary !== undefined;
  const actions = DIALOG_ACTIONS_CLASSES[dialogButtonCountOf(hasCancel, hasSecondary, hideConfirm)];
  // With three buttons, cancel turns tertiary (P33 dialog-actions, number of buttons=3)
  const cancelVariant = hasSecondary ? 'kern-btn--tertiary' : 'kern-btn--secondary';

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

  // The confirm button went away (or the dialog opened without it): the cancel button takes the
  // focus, which would otherwise fall to the page's body with the removed button
  useEffect(() => {
    if (open && hideConfirm) {
      cancelRef.current?.focus();
    }
  }, [open, hideConfirm]);

  function close() {
    if (!busy) {
      onClose();
    }
  }

  // Escape: the page's state decides whether the dialog closes
  function handleCancel(event: SyntheticEvent<HTMLDialogElement>) {
    event.preventDefault();
    close();
  }

  function handleMouseDown(event: MouseEvent<HTMLDialogElement>) {
    pressedOnScrim.current = isOnScrim(event);
  }

  function handleClick(event: MouseEvent<HTMLDialogElement>) {
    if (dismissOnScrim && pressedOnScrim.current && isOnScrim(event)) {
      close();
    }
    pressedOnScrim.current = false;
  }

  return (
    // The scrim is the dialog's ::backdrop, so its clicks reach the dialog element; Escape is
    // the keyboard's way to close it (onCancel), so the click needs no key handler of its own
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={[error ? errorId : '', text ? textId : ''].join(' ').trim() || undefined}
      onCancel={handleCancel}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      // KERN's dialog as the screens draw it: centred also on a small screen (Tailwind's
      // preflight drops the browser's margin: auto, and kern.css turns it into a bottom sheet
      // below 768px), all corners rounded, its 1px outline drawn inside like Figma's stroke, and
      // the design's scrim: the shade colour at KERN's overlay opacity (72 %, kern.css's own;
      // it uses black). The !s beat kern.css, which isn't in a cascade layer. The fade is
      // index.css's ("Dialog")
      className={`${DIALOG_FRAME_CLASSES} ${DIALOG_WIDTH_CLASSES[wide ? 'wide' : 'default']}`}
    >
      <header className="kern-dialog__header">
        {/* The kit's container, which puts the title 8px lower than kern.css and 16px from the × */}
        <div className="flex-1 pt-8 pr-16">
          <h2
            id={titleId}
            aria-label={plainTitle === title ? undefined : plainTitle}
            className="kern-title kern-title--large"
          >
            {title}
          </h2>
        </div>
        <button
          type="button"
          onClick={close}
          aria-disabled={busy}
          className="kern-btn kern-btn--tertiary"
        >
          <span aria-hidden="true" className="kern-icon kern-icon--close" />
          <span className="kern-sr-only">{copy.close}</span>
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
      {/* 23px: in Figma the footer's top line is inside its 24px padding */}
      <footer className="kern-dialog__footer @container pt-23!">
        <div className={`flex w-full flex-1 gap-16 ${actions}`}>
          {hasCancel && (
            <button
              ref={cancelRef}
              type="button"
              onClick={busy ? undefined : onCancel}
              aria-disabled={busy}
              className={`kern-btn ${cancelVariant}`}
            >
              <span className="kern-label">{cancelLabel}</span>
            </button>
          )}
          {hasSecondary && (
            <button
              type="button"
              onClick={busy ? undefined : onSecondary}
              aria-disabled={busy}
              className={`kern-btn kern-btn--secondary ${secondaryDanger ? 'kern-btn--danger' : ''}`}
            >
              <span className="kern-label">{secondaryLabel}</span>
            </button>
          )}
          {!hideConfirm && (
            <button
              type="button"
              onClick={busy ? undefined : onConfirm}
              aria-disabled={busy}
              className={`kern-btn kern-btn--primary ${danger ? 'kern-btn--danger' : ''}`}
            >
              <span className="kern-label">
                {busy ? busyLabel : error ? retryLabel : confirmLabel}
              </span>
            </button>
          )}
        </div>
      </footer>
    </dialog>
  );
}
