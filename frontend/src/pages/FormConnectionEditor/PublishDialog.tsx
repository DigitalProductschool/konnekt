import ConfirmDialog from '../../components/ConfirmDialog';
import { EDITOR_COPY } from './constants';
import type { PublishDialogProps } from './types';

/**
 * Figma "Dialog: Ready to publish?" (06d): the last check before publishing, or before saving
 * an edited connection. While the connection is being saved it can't be closed. If that fails,
 * it stays open with the API's message above the summary and offers "Try again" (no frame;
 * bug publish-error-offscreen): wherever the page is scrolled, the dialog is in view.
 */
export default function PublishDialog({
  open,
  editing,
  summary,
  publishing,
  error,
  onCancel,
  onConfirm,
}: PublishDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      title={EDITOR_COPY.dialogTitle}
      text={summary}
      confirmLabel={editing ? EDITOR_COPY.confirmSave : EDITOR_COPY.confirm}
      cancelLabel={EDITOR_COPY.checkAgain}
      busyLabel={editing ? EDITOR_COPY.saving : EDITOR_COPY.publishing}
      busy={publishing}
      error={error}
      errorTitle={editing ? EDITOR_COPY.saveErrorTitle : EDITOR_COPY.publishErrorTitle}
      retryLabel={EDITOR_COPY.retry}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}
