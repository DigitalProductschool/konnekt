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
   * A toast with an action stays until its action goes, instead of 6 seconds, so that keyboard
   * users can reach the action however far their focus is (WCAG 2.2.1). For a page that drops
   * the action with its next change, as the Rules step does
   */
  holdAction?: boolean;
  /** Called when the toast's time is up; keep it stable (useCallback) */
  onDismiss: () => void;
}

export interface ToastMessageProps {
  toast: ToastContent;
  onAction?: () => void;
  holdAction?: boolean;
  onDismiss: () => void;
}
