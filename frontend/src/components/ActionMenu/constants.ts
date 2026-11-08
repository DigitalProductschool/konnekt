import type { PopupPlacement } from '../../utils/popupPlacement';

/**
 * The width of a ⋯ menu. Figma's 220px (U14 6113:28988) holds Revamp's 14px labels; at KERN
 * 2.8's 16px the longest fixed one, "Remove from this variant", needs 248px to stay on one line
 * (design-notes §9)
 */
export const ACTION_MENU_WIDTH = 248;

/**
 * Where a ⋯ menu opens from its ⋯ (utils/popupPlacement.ts): below it, opening to the side that
 * fits, or across the nearest positioned box (the rules card, the user page's list) when neither
 * does
 */
export const ACTION_MENU_PLACEMENTS: Record<PopupPlacement, string> = {
  start: 'absolute top-full left-0 w-248',
  end: 'absolute top-full right-0 w-248',
  full: 'absolute inset-x-16',
};
