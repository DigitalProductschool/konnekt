import type { UserMenuState } from './types';

export const LOG_OUT_LABEL = 'Log out';

// Start of the trigger's accessible name, followed by the username
export const SIGNED_IN_AS = 'Signed in as';

// Keys that move the focus inside an open menu (it has a single item)
export const MENU_NAVIGATION_KEYS = new Set(['ArrowDown', 'ArrowUp', 'Home', 'End']);

// The sign-out warning (specs/005-connection-drafts/contracts/ui-screens.md S7, W8, "Copy")
export const SIGN_OUT_COPY = {
  title: 'Log out and discard unsaved work?',
  text: (names: string) =>
    `Logging out deletes the unsaved changes on this device to: ${names}. Saved drafts stay as they are.`,
  confirm: 'Log out',
  cancel: 'Cancel',
  and: 'and',
  more: (count: number) => `and ${count} more`,
};

// The sign-out warning names at most this many local drafts
export const SIGN_OUT_MAX_NAMES = 5;

export const INITIAL_USER_MENU_STATE: UserMenuState = {
  open: false,
  signOutNames: null,
  signingOut: false,
};
