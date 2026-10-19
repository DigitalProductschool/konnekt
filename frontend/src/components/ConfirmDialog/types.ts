import type { ErrorNotice } from '../../types/api';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  /** What confirming does */
  text: string;
  confirmLabel: string;
  cancelLabel: string;
  /** The confirm button's label while the action runs */
  busyLabel: string;
  /** While the action runs, the dialog can't be closed and confirming does nothing */
  busy: boolean;
  /** Why the last attempt failed, shown above the text until the dialog closes or retries */
  error: ErrorNotice | null;
  errorTitle: string;
  /** The confirm button's label after a failure */
  retryLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}
