export interface SignOutDialogProps {
  /** The local drafts' names, as `signOutNamesOf` joins them; null while the dialog is closed */
  names: string | null;
  /** While signing out, the dialog can't be closed */
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export interface UserMenuState {
  /** The menu panel */
  open: boolean;
  /** The names in the sign-out warning; null while it is closed */
  signOutNames: string | null;
  /** The confirmed sign-out runs */
  signingOut: boolean;
}

export type UserMenuAction =
  | { type: 'toggled' }
  | { type: 'opened' }
  | { type: 'closed' }
  | { type: 'signOutAsked'; names: string }
  | { type: 'signOutCancelled' }
  | { type: 'signOutConfirmed' };
