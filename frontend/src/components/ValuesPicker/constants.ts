import type { MenuDirection, PopupPlacement } from '../../utils/popupPlacement';

// Value sets with more options than this get a search field ("Search options")
export const SEARCH_THRESHOLD = 10;

/** The menu's width, Figma's 300px (U32 6357:43382 "Menu", U48 6191:42209) */
export const VALUES_MENU_WIDTH = 300;

/**
 * The menu's height as U32 draws it open below its field (6357:43382: 316px, its list scrolling
 * inside). The menu opens down where this much fits below its field (Figma "Rules/Picker": "Menus
 * always open downward"), else up where it fits there (research R10); a shorter menu counts with
 * its own height
 */
export const VALUES_MENU_DRAWN_HEIGHT = 316;

/**
 * The heights the menu's height is estimated from before it opens (U32 6357:43382, U48
 * 6191:42209): the 1px border and 8px padding at the top and the bottom, the parts 2px apart,
 * the 40px search field, a class option 44px ("Rules/Menu item · class", 2px apart), a value
 * 28px ("Data/Check item", in a list padded by 4px), the footer's divider and its 36px text, and
 * the 48px "Done" row
 */
export const VALUES_MENU_METRICS = {
  frame: 18,
  gap: 2,
  search: 40,
  classRow: 44,
  valueRow: 28,
  valueListPadding: 8,
  divider: 1,
  footer: 36,
  actions: 48,
};

/** The "Done" button (U32 6357:43417; FR-039, CLAR Q27): closes the menu, keeping the choice */
export const VALUES_PICKER_DONE = 'Done';

/**
 * Where the menu opens from its field (utils/popupPlacement.ts), 8px from it (design-notes §3
 * "Menu"; U32: the field's bottom 541, the menu's top 549): below or above it, its left edge on
 * the field's as Figma draws it, else its right edge. Where neither fits (320px, 200% zoom) it
 * spans the rule editor's content (the editor is the positioned box, 24px padding): opening down
 * it starts where the flow puts it, under the field; opening up its wrapper is a flex column, so
 * that it starts at the field's top (an absolute box's static position in a flex container, CSS
 * Flexbox §4.1), and moves up by its own height and the gap, whatever the field's height
 */
export const VALUES_MENU_PLACEMENTS: Record<PopupPlacement, Record<MenuDirection, string>> = {
  start: { down: 'top-full left-0 mt-8 w-300', up: 'bottom-full left-0 mb-8 w-300' },
  end: { down: 'top-full right-0 mt-8 w-300', up: 'bottom-full right-0 mb-8 w-300' },
  full: { down: 'inset-x-24 mt-8', up: 'inset-x-24 -translate-y-[calc(100%+8px)]' },
};

/** The wrapper of a menu across the editor, by direction (see VALUES_MENU_PLACEMENTS) */
export const VALUES_FULL_WRAPPERS: Record<MenuDirection, string> = {
  down: 'static',
  up: 'static flex flex-col',
};

/** A form field's menu spans the field (Figma "Field · Licence classes" 7058:60661) */
export const VALUES_FIELD_MENU_PLACEMENTS: Record<MenuDirection, string> = {
  down: 'top-full left-0 mt-8 w-full',
  up: 'bottom-full left-0 mb-8 w-full',
};

/**
 * A class option's hover and pressed layers (the kit's "states", P33 2:1985: the action colour
 * at 8% and 16%, as the ⋯ menus' entries) and the colour transition (design-notes §4)
 */
export const CLASS_OPTION_STATES =
  'motion transition-colors duration-(--duration-colour) hover:bg-kern-action-state-indicator-default/8 active:bg-kern-action-state-indicator-default/16';
