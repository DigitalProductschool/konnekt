import { type SyntheticEvent, useEffect, useId, useRef } from 'react';

import {
  DIALOG_ACTIONS_CLASSES,
  DIALOG_WIDTH_CLASSES,
} from '../../components/ConfirmDialog/constants';
import { KERN_TRANSLATIONS } from '../../constants';
import { ACCOUNT_COPY, TOKEN_DIALOG_CLASSES } from './constants';
import TokenCopyField from './TokenCopyField';
import type { TokenCreatedDialogProps } from './types';

/**
 * The new personal access token, shown once (S20; 007-S2.13, S2.14, FR-004): in `CopyableUrl`'s
 * read-only field with "Copy" ("✓ Copied" for 2 s, FR-048), never in a toast. KERN's dialog in
 * `ConfirmDialog`'s frame at the kit's 600px, fading in and out (`motion`, design-notes §4), with
 * one button, since there is nothing to confirm or cancel: "Done", the × and Escape close it, and
 * the list keeps the token without its secret. A click on the scrim doesn't: closing loses the
 * secret for good (FR-052a's exception, as the restore dialog). The dialog opens with the focus on
 * the token, not on the ×: a screen reader reads the dialog's title and warning, then the field's
 * label, the token and the warning again, and the token is selected, ready to copy.
 */
export default function TokenCreatedDialog({ dialog, onClose }: TokenCreatedDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const id = useId();
  const titleId = `${id}-title`;
  const textId = `${id}-text`;
  const open = dialog?.type === 'tokenCreated';

  useEffect(() => {
    const element = dialogRef.current;
    if (!element) {
      return;
    }
    if (open && !element.open) {
      element.showModal();
      // showModal() focused the ×, the first control; the token is the one to read
      element.querySelector<HTMLInputElement>('input')?.focus();
    } else if (!open && element.open) {
      element.close();
    }
  }, [open]);

  // Escape: the page's state closes the dialog
  function handleCancel(event: SyntheticEvent<HTMLDialogElement>) {
    event.preventDefault();
    onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={textId}
      onCancel={handleCancel}
      className={`${TOKEN_DIALOG_CLASSES} ${DIALOG_WIDTH_CLASSES.wide}`}
    >
      <header className="kern-dialog__header">
        <div className="flex-1 pt-8 pr-16">
          <h2 id={titleId} className="kern-title kern-title--large break-words">
            {open ? ACCOUNT_COPY.createdTitle(dialog.name) : ''}
          </h2>
        </div>
        <button type="button" onClick={onClose} className="kern-btn kern-btn--tertiary">
          <span aria-hidden="true" className="kern-icon kern-icon--close" />
          <span className="sr-only">{KERN_TRANSLATIONS.closeDialog}</span>
        </button>
      </header>
      <div className="kern-dialog__body">
        <div className="flex w-full flex-col gap-16">
          <p id={textId} className="kern-body kern-body--large">
            {ACCOUNT_COPY.createdText}
          </p>
          {open && <TokenCopyField key={dialog.token} token={dialog.token} describedBy={textId} />}
        </div>
      </div>
      {/* As ConfirmDialog's: 23px, the footer's top line is inside its 24px padding */}
      <footer className="kern-dialog__footer @container pt-23!">
        <div className={`flex w-full flex-1 gap-16 ${DIALOG_ACTIONS_CLASSES[1]}`}>
          <button type="button" onClick={onClose} className="kern-btn kern-btn--primary">
            <span className="kern-label">{ACCOUNT_COPY.done}</span>
          </button>
        </div>
      </footer>
    </dialog>
  );
}
