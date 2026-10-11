export interface ToastContent {
  /** Changes with every new toast, so that each one gets its own timer */
  id: number;
  message: string;
  /** The label of the toast's one action, such as "Undo" */
  actionLabel?: string;
}

export interface ToastProps {
  toast: ToastContent | null;
  onAction?: () => void;
  /** Called when the toast's time is up; keep it stable (useCallback) */
  onDismiss: () => void;
}

export interface ToastMessageProps {
  toast: ToastContent;
  onAction?: () => void;
  onDismiss: () => void;
}
