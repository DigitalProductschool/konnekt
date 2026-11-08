import type { ErrorNotice } from '@connection-portal/api-types/api';
import type { ReactNode } from 'react';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  /** What confirming does; with `children`, it may be empty, and none shows */
  text: string;
  /** The text's classes; KERN's large body text by default */
  textClassName?: string;
  /** Shown under the text, 16px below it, such as the publish dialog's summary */
  children?: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  /** The confirm button in the danger colour, for an action such as "Delete rule" */
  danger?: boolean;
  /** The confirm button's label while the action runs */
  busyLabel?: string;
  /** While the action runs, the dialog can't be closed and confirming does nothing */
  busy?: boolean;
  /** Why the last attempt failed, shown above the text until the dialog closes or retries */
  error?: ErrorNotice | null;
  errorTitle?: string;
  /** The confirm button's label after a failure */
  retryLabel?: string;
  /**
   * A third action between cancel and confirm, such as "Reload". With it, the cancel button
   * turns tertiary and this one is the secondary button; without it, nothing changes
   */
  secondaryLabel?: string;
  onSecondary?: () => void;
  /** The cancel button */
  onCancel: () => void;
  /** The close button and Escape, when they do something else than the cancel button */
  onClose?: () => void;
  onConfirm: () => void;
}
