import ConfirmDialog from '../../components/ConfirmDialog';
import { DRAFT_COPY } from './constants';
import type { DraftConflictDialogProps } from './types';

/**
 * The conflict dialog after "Save and exit" (S2, W4; FR-022 to FR-024): another team member
 * changed, published or deleted the draft since it was opened. `ConfirmDialog`, so it is a
 * native modal with the focus inside, Escape is "Cancel", and closing it returns the focus to
 * "Save and exit". While an answer runs, its actions do nothing and it can't be closed.
 * A conflict while publishing shows in the publish dialog instead.
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
  function handleCancel() {
    if (!busy) {
      onCancel();
    }
  }

  const common = {
    open: conflict !== null,
    text: conflict?.message ?? '',
    cancelLabel: DRAFT_COPY.cancel,
    busyLabel: DRAFT_COPY.saving,
    busy,
    onCancel: handleCancel,
  };

  if (conflict?.kind === 'draft_changed') {
    return (
      <ConfirmDialog
        {...common}
        title={DRAFT_COPY.draftChangedTitle}
        secondaryLabel={DRAFT_COPY.reload}
        onSecondary={onReload}
        confirmLabel={DRAFT_COPY.replaceTheirChanges}
        onConfirm={onReplace}
      >
        <p className="kern-body kern-body--large">{DRAFT_COPY.draftChangedHint}</p>
      </ConfirmDialog>
    );
  }
  if (conflict?.kind === 'draft_published') {
    return (
      <ConfirmDialog
        {...common}
        title={DRAFT_COPY.draftPublishedTitle}
        confirmLabel={DRAFT_COPY.openConnection}
        onConfirm={onOpenConnection}
      >
        <p className="kern-body kern-body--large">{DRAFT_COPY.draftPublishedHint}</p>
      </ConfirmDialog>
    );
  }
  // `draft_deleted`, whose message is already the deleted text; and the closed dialog
  return (
    <ConfirmDialog
      {...common}
      title={DRAFT_COPY.draftDeletedTitle}
      confirmLabel={DRAFT_COPY.saveAsNewDraft}
      onConfirm={onSaveAsNew}
    />
  );
}
