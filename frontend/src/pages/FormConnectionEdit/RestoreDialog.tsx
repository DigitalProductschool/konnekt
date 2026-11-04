import { type SyntheticEvent, useEffect, useId, useRef } from 'react';

import ConnectionStatusBadge from '../../components/ConnectionStatusBadge';
import WizardLayout from '../../components/WizardLayout';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { RESTORE_COPY } from './constants';
import type { RestoreDialogProps } from './types';

/**
 * The restore question of a stored draft (S5, W6; FR-016), in the wizard's frame with the "Draft"
 * badge, before the editor mounts. KERN's dialog, native and modal: the page behind it is inert,
 * and the focus starts on "Restore changes", which loses nothing. "Discard them" is the only
 * answer that removes the local draft. Escape answers neither: the page leaves for the draft's
 * details and keeps the local draft, which is offered again the next time. It is the screen's
 * only heading, so its title is the page's `h1`.
 */
export default function RestoreDialog({
  title,
  name,
  changedAt,
  onRestore,
  onDiscard,
  onEscape,
}: RestoreDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const restoreRef = useRef<HTMLButtonElement>(null);
  const id = useId();
  const titleId = `${id}-title`;
  const textId = `${id}-text`;

  useDocumentTitle(RESTORE_COPY.restoreTitle);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
      restoreRef.current?.focus();
    }
  }, []);

  // Escape leaves for the details; the dialog stays open until the page has gone
  function handleCancel(event: SyntheticEvent<HTMLDialogElement>) {
    event.preventDefault();
    onEscape();
  }

  return (
    <WizardLayout
      title={title}
      badge={<ConnectionStatusBadge isActive draft />}
      footer={null}
      overlay={
        <dialog
          ref={dialogRef}
          aria-labelledby={titleId}
          aria-describedby={textId}
          onCancel={handleCancel}
          // As ConfirmDialog: centred, its outline inside like Figma's stroke, and the design's
          // scrim. The !s beat kern.css, which isn't in a cascade layer
          className="kern-dialog ring-kern-layout-border backdrop:bg-kern-layout-text-default! m-auto w-600 max-w-[calc(100vw-32px)]! border-0! ring-1 ring-inset backdrop:opacity-50!"
        >
          <header className="kern-dialog__header">
            <div className="flex-1 pt-8">
              <h1 id={titleId} className="kern-title kern-title--large">
                {RESTORE_COPY.restoreTitle}
              </h1>
            </div>
          </header>
          <div className="kern-dialog__body">
            <p id={textId} className="kern-body kern-body--large">
              {RESTORE_COPY.restoreText(name, changedAt)}
            </p>
          </div>
          {/* 23px: in Figma the top stroke is inside the 24px padding */}
          <footer className="kern-dialog__footer pt-23!">
            <button
              type="button"
              onClick={onDiscard}
              className="kern-btn kern-btn--secondary w-full sm:w-[calc(50%-8px)]"
            >
              <span className="kern-label">{RESTORE_COPY.discardThem}</span>
            </button>
            <button
              ref={restoreRef}
              type="button"
              onClick={onRestore}
              className="kern-btn kern-btn--primary w-full sm:w-[calc(50%-8px)]"
            >
              <span className="kern-label">{RESTORE_COPY.restore}</span>
            </button>
          </footer>
        </dialog>
      }
    >
      {null}
    </WizardLayout>
  );
}
