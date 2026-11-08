import type { MenuDirection, PopupPlacement } from '../../utils/popupPlacement';

/**
 * The width of a ⋯ menu: Figma's 220px (U55 6530:40192, U57 6522:32824, U88 6417:31045), which
 * the Revamp's 14px labels fit (research R10; spec 002's 248px is history)
 */
export const ACTION_MENU_WIDTH = 220;

/** The height of an entry: 8px padding around a 24px line (U55 6530:40192) */
export const ACTION_MENU_ROW_HEIGHT = 40;

/** The space between two entries, or an entry and the divider */
export const ACTION_MENU_ROW_GAP = 2;

/** The divider's height */
export const ACTION_MENU_DIVIDER_HEIGHT = 1;

/** The frame around the entries: a 1px border and 8px padding, at the top and the bottom */
export const ACTION_MENU_FRAME_HEIGHT = 18;

/**
 * Where a ⋯ menu opens from its ⋯ (utils/popupPlacement.ts), 8px from it as Figma draws it
 * (U55 6530:40192 under its ⋯): below or above it, to the side that fits, or across the nearest
 * positioned box (the rules card, the account page's list) when neither does. Across the box,
 * the menu starts where the flow puts it, under its ⋯, and opening up it moves up by its own
 * height, the ⋯'s 32px and the two gaps
 */
export const ACTION_MENU_PLACEMENTS: Record<PopupPlacement, Record<MenuDirection, string>> = {
  start: { down: 'top-full left-0 mt-8 w-220', up: 'bottom-full left-0 mb-8 w-220' },
  end: { down: 'top-full right-0 mt-8 w-220', up: 'bottom-full right-0 mb-8 w-220' },
  full: { down: 'inset-x-16 mt-8', up: 'inset-x-16 mt-8 -translate-y-[calc(100%+48px)]' },
};

/**
 * The hover and pressed layers of the kit's "states" (P33 2:1985: the action colour at 8% and
 * 16%) and the colour transition (design-notes §4), on the ⋯ and on the entries
 */
export const ACTION_MENU_STATES =
  'motion transition-colors duration-(--duration-colour) hover:bg-kern-action-state-indicator-default/8 active:bg-kern-action-state-indicator-default/16';
