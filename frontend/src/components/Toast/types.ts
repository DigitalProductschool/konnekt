/**
 * The toast's two kinds (data-model §2 "Toasts", design-notes §3 "Toast"): `neutral`, the dark
 * ink toast for undoable or failed actions and plain notes ("You're logged out."); `success`,
 * the green toast with the filled check for a finished action ("Draft saved. …")
 */
export type ToastKind = 'neutral' | 'success';

export interface ToastContent {
  /** Changes with every new toast, so that each one is shown, timed and announced anew */
  id: number;
  /** `neutral` when left out */
  kind?: ToastKind;
  message: string;
  /**
   * The label of the toast's one action ("Try again", "Undo", "Show"); the page passes the
   * handler as `onAction`. A toast with an action goes after its 6 seconds too (FR-082)
   */
  actionLabel?: string;
  /** The error ID of a 5xx, on a line of its own under the message (FR-033) */
  errorId?: string | null;
}

export interface ToastProps {
  toast: ToastContent | null;
  onAction?: () => void;
  /**
   * Called when a toast, with or without an action, has been shown for 6 seconds without the
   * pointer or the focus on it (FR-082), and when it is dismissed with Escape; keep it stable
   * (useCallback). The page also dismisses an action toast itself, after its action, a newer
   * change or a change of step
   */
  onDismiss: () => void;
  /**
   * The page has no footer bar: the toast sits 24px above the window's bottom edge instead of
   * 24px above the bar (U10 7128:74220)
   */
  noFooter?: boolean;
}

export interface ToastMessageProps {
  toast: ToastContent;
  onAction?: () => void;
  onDismiss: () => void;
}
