import { defineTexts } from '@connection-portal/rules/language';

import type { MenuDirection, PopupPlacement } from '../../utils/popupPlacement';
import type { UserMenuState } from './types';

/**
 * The menu's texts (G§2 "account", "sign out"): the item that leads to the user page
 * (specs/007-agent-mcp-server/contracts/ui-screens.md S2), "Log out", and the start of the
 * trigger's accessible name, followed by the username
 */
export const USER_MENU_COPY = defineTexts(
  { yourAccount: 'Your account', logOut: 'Log out', signedInAs: 'Signed in as' },
  { yourAccount: 'Ihr Konto', logOut: 'Abmelden', signedInAs: 'Angemeldet als' }
);

// The sign-out warning (specs/005-connection-drafts/contracts/ui-screens.md S7, W8, "Copy")
export const SIGN_OUT_COPY = defineTexts(
  {
    title: 'Log out and discard unsaved work?',
    text: (names: string) =>
      `Logging out deletes the unsaved changes on this device to: ${names}. Saved drafts stay as they are.`,
    confirm: 'Log out',
    cancel: 'Cancel',
    and: 'and',
    more: (count: number) => `and ${count} more`,
  },
  {
    title: 'Abmelden und nicht gespeicherte Arbeit verwerfen?',
    text: (names: string) =>
      `Beim Abmelden werden die nicht gespeicherten Änderungen auf diesem Gerät an diesen Anbindungen gelöscht: ${names}. Gespeicherte Entwürfe bleiben unverändert.`,
    confirm: 'Abmelden',
    cancel: 'Abbrechen',
    and: 'und',
    more: (count: number) => `und ${count} weitere`,
  }
);

// The sign-out warning names at most this many local drafts
export const SIGN_OUT_MAX_NAMES = 5;

/** "Shell/Account menu" is 260px wide (U13 6699:44358), wider than the ⋯ menus' 220 */
export const ACCOUNT_MENU_WIDTH = 260;

/**
 * Its height with both entries: the 1px border and 8px padding twice, the name's 40px block,
 * the dividers and the two 40px entries, 4px apart (U13 6699:44358)
 */
export const ACCOUNT_MENU_HEIGHT = 156;

/**
 * Where the menu opens from the account pill (utils/popupPlacement.ts): 8px below it, its right
 * edge on the pill's (U13 6699:44358 at 1164–1424, 72 = the pill's bottom 64 + 8); across the
 * header, less its 16px gutters, where 260px don't fit beside the pill
 */
export const ACCOUNT_MENU_PLACEMENTS: Record<PopupPlacement, Record<MenuDirection, string>> = {
  start: { down: 'top-full left-0 mt-8 w-260', up: 'bottom-full left-0 mb-8 w-260' },
  end: { down: 'top-full right-0 mt-8 w-260', up: 'bottom-full right-0 mb-8 w-260' },
  full: { down: 'inset-x-16 mt-8', up: 'inset-x-16 mt-8' },
};

/**
 * An entry (U13 I6699:44358;6401:69444, "Rules/Menu item"): 40px, 8px padding, body/small 14/24
 * regular in the text colour, radius 4; hover and pressed the kit's "states" layers and keyboard
 * focus its select-option fill, as the ⋯ menus' entries (design-notes §3 "Menu")
 */
export const MENU_ITEM_CLASSES =
  'text-kern-static-small text-kern-layout-text-default rounded-kern-small focus-visible:bg-kern-action-focus-default focus-visible:text-kern-layout-text-inverse flex w-full shrink-0 cursor-pointer items-center gap-8 p-8 text-left leading-(--kern-typography-line-height-medium-static) focus-visible:outline-none';

/**
 * The account pill (U11 I6699:44242;6688:41398, build note 14): 48px, white with an
 * action/default layer at 12% (`before`), the glyphs in action/default, 8px in on the left and
 * 4px on the right. Hover and pressed add the kit's "states" layers (`after`, 8% and 16%), which
 * also show while the menu is open; keyboard focus KERN's 4px ring
 */
export const ACCOUNT_PILL_CLASSES =
  'text-kern-action-default bg-kern-layout-background-default rounded-kern-circle focus-visible:outline-kern-action-focus-default motion relative isolate flex h-48 cursor-pointer items-center pr-4 pl-8 before:absolute before:inset-0 before:-z-10 before:rounded-kern-circle before:bg-kern-action-default/12 after:absolute after:inset-0 after:-z-10 after:rounded-kern-circle after:transition-colors after:duration-(--duration-colour) hover:after:bg-kern-action-state-indicator-default/8 focus-visible:outline-4 focus-visible:outline-offset-2 active:after:bg-kern-action-state-indicator-default/16 aria-expanded:after:bg-kern-action-state-indicator-default/16';

/**
 * After "Log out", how often and how long the menu waits for the sign-in guard's redirect before
 * it gives the sign-in screen the "You're logged out." flag (UserMenu, FR-051 (30))
 */
export const SIGN_IN_SCREEN_POLL_MS = 16;
export const SIGN_IN_SCREEN_WAIT_MS = 1000;

export const INITIAL_USER_MENU_STATE: UserMenuState = {
  open: false,
  signOutRecords: null,
  signingOut: false,
};
