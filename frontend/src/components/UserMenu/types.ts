import type { LoginLocationState } from '@connection-portal/api-types/routing';

export interface UserMenuProps {
  /**
   * In a flow (FR-026, T048): "Log out" calls this instead of logging out, so that the editor
   * can ask "Save before you log out?" when the flow has unsaved changes. `logOut` then logs out
   * as "Log out" does without it ("Log out anyway", or after saving); `trigger` is the account
   * pill, where the focus goes back on "Cancel" (F20)
   */
  onLogOut?: (logOut: () => void, trigger: HTMLButtonElement | null) => void;
}

/**
 * Router state of the sign-in screen after "Log out": it shows the toast "You're logged out."
 * (FR-051 (30), U10 7128:74220). `from` stays the page the user logged out of, as the sign-in
 * guard sets it
 */
export interface LoggedOutLocationState extends LoginLocationState {
  loggedOut: true;
}

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
