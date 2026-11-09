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
  /**
   * The cancel button, left of the others. Without it there is none, and the ×, Escape and the
   * scrim close the dialog (the leave dialog: "Discard connection" / "Save progress" and ×)
   */
  cancelLabel?: string;
  /** The confirm button as the filled danger button, for an action such as "Delete connection" */
  danger?: boolean;
  /** The confirm button's label while the action runs */
  busyLabel?: string;
  /**
   * The working state: while the action runs, every button is busy (aria-disabled), confirming
   * does nothing, and neither the buttons, the ×, Escape nor the scrim close the dialog
   */
  busy?: boolean;
  /** Why the last attempt failed, shown above the text until the dialog closes or retries */
  error?: ErrorNotice | null;
  errorTitle?: string;
  /** The confirm button's label after a failure */
  retryLabel?: string;
  /**
   * A further action between cancel and confirm, such as "Reload" or "Discard connection". With
   * a cancel button too, the cancel button turns tertiary (three buttons)
   */
  secondaryLabel?: string;
  onSecondary?: () => void;
  /** The secondary button as the danger outline button ("Discard connection", "Remove 1 document") */
  secondaryDanger?: boolean;
  /**
   * Whether a click on the scrim closes the dialog, as the × and Escape do (`onClose`). On by
   * default; off for the dialogs that delete or publish (FR-052a)
   */
  dismissOnScrim?: boolean;
  /** The kit's 600px dialog (P12) instead of the screens' 480px one */
  wide?: boolean;
  /** The cancel button */
  onCancel: () => void;
  /** The ×, Escape and the scrim, when they do something else than the cancel button */
  onClose?: () => void;
  onConfirm: () => void;
}
