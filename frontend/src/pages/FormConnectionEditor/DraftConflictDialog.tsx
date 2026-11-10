import ConfirmDialog from '../../components/ConfirmDialog';
import { useCopy } from '../../hooks/useLanguage';
import { DRAFT_COPY } from './constants';
import type { DraftConflictDialogProps } from './types';

/**
 * The conflict dialog after "Save and exit" (S2, W4; FR-022 to FR-024): the draft was saved,
 * published or deleted since it was opened, by a team member or an agent (spec 007, FR-015), and
 * its texts name neither. `ConfirmDialog`, so it is a native modal with the focus inside, Escape
 * is "Cancel", and closing it returns the focus to "Save and exit". While an answer runs, its
 * actions do nothing and it can't be closed. A conflict while publishing shows in the publish
 * dialog instead.
 */
export default function DraftConflictDialog({
  conflict,
  busy,
  onReload,
  onReplace,
  onOpenConnection,
  onSaveAsNew,
  onCancel,
}: DraftConflictDialogProps) {
  const copy = useCopy(DRAFT_COPY);

  function handleCancel() {
    if (!busy) {
      onCancel();
    }
  }

  const common = {
    open: conflict !== null,
    // The deleted text is the website's own, in the language of the moment; the server's
    // messages keep the language they came in
    text: conflict?.kind === 'draft_deleted' ? copy.draftDeletedText : (conflict?.message ?? ''),
    cancelLabel: copy.cancel,
    busyLabel: copy.saving,
    busy,
    onCancel: handleCancel,
  };

  if (conflict?.kind === 'draft_changed') {
    return (
      <ConfirmDialog
        {...common}
        title={copy.draftChangedTitle}
        secondaryLabel={copy.reload}
        onSecondary={onReload}
        confirmLabel={copy.replaceTheirChanges}
        onConfirm={onReplace}
      >
        <p className="kern-body kern-body--large">{copy.draftChangedHint}</p>
      </ConfirmDialog>
    );
  }
  if (conflict?.kind === 'draft_published') {
    return (
      <ConfirmDialog
        {...common}
        title={copy.draftPublishedTitle}
        confirmLabel={copy.openConnection}
        onConfirm={onOpenConnection}
      >
        <p className="kern-body kern-body--large">{copy.draftPublishedHint}</p>
      </ConfirmDialog>
    );
  }
  // `draft_deleted`, whose message is already the deleted text; and the closed dialog
  return (
    <ConfirmDialog
      {...common}
      title={copy.draftDeletedTitle}
      confirmLabel={copy.saveAsNewDraft}
      onConfirm={onSaveAsNew}
    />
  );
}
