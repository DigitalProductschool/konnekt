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
  /**
   * Called when the toast's time is up, 6 seconds for every toast (B4, 2026-10-26); keep it
   * stable (useCallback). A page whose action must stay reachable keeps it after the toast goes,
   * as the Rules step keeps Undo for Ctrl/Cmd+Z
   */
  onDismiss: () => void;
}

export interface ToastMessageProps {
  toast: ToastContent;
  onAction?: () => void;
  onDismiss: () => void;
}
