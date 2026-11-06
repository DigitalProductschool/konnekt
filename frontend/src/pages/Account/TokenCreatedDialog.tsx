import { type SyntheticEvent, useEffect, useId, useRef } from 'react';

import { ACCOUNT_COPY } from './constants';
import TokenCopyField from './TokenCopyField';
import type { TokenCreatedDialogProps } from './types';

/**
 * The new personal access token, shown once (S2; FR-004): in a read-only input with "Copy", never
 * in a toast. KERN's dialog in `ConfirmDialog`'s frame, with one button, since there is nothing
 * to confirm or cancel: "Done", the close button and Escape all close it, and the list keeps the
 * token without its secret.
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
      // As ConfirmDialog: centred, the outline drawn inside, and the design's scrim
      className="kern-dialog ring-kern-layout-border backdrop:bg-kern-layout-text-default! m-auto w-600 max-w-[calc(100vw-32px)]! border-0! ring-1 ring-inset backdrop:opacity-50!"
    >
      <header className="kern-dialog__header">
        <div className="flex-1 pt-8 pr-16">
          <h2 id={titleId} className="kern-title kern-title--large break-words">
            {open ? ACCOUNT_COPY.createdTitle(dialog.name) : ''}
          </h2>
        </div>
        <button type="button" onClick={onClose} className="kern-btn kern-btn--tertiary">
          <span aria-hidden="true" className="kern-icon kern-icon--close" />
          <span className="kern-sr-only">{ACCOUNT_COPY.close}</span>
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
      <footer className="kern-dialog__footer pt-23!">
        <button
          type="button"
          onClick={onClose}
          className="kern-btn kern-btn--primary w-full sm:w-[calc(50%-8px)]"
        >
          <span className="kern-label">{ACCOUNT_COPY.done}</span>
        </button>
      </footer>
    </dialog>
  );
}
