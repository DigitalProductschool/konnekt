import type { UserMenuState } from './types';

export const LOG_OUT_LABEL = 'Log out';

// The item that leads to the user page (specs/007-agent-mcp-server/contracts/ui-screens.md S2)
export const YOUR_ACCOUNT_LABEL = 'Your account';

// Start of the trigger's accessible name, followed by the username
export const SIGNED_IN_AS = 'Signed in as';

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

// The classes of the menu's items, a link and a button alike
export const MENU_ITEM_CLASSES =
  'text-kern-static-small text-kern-layout-text-default hover:bg-kern-neutral-050 focus-visible:bg-kern-neutral-050 focus-visible:outline-kern-action-focus-default flex h-48 w-full cursor-pointer items-center gap-12 px-16 leading-(--kern-typography-line-height-medium-static) font-semibold focus-visible:outline-4 focus-visible:-outline-offset-4';

export const INITIAL_USER_MENU_STATE: UserMenuState = {
  open: false,
  signOutNames: null,
  signingOut: false,
};
