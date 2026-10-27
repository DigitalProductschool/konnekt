import type { PopupPlacement } from '../../utils/popupPlacement';
import type { TooltipState } from './types';

export const CLOSED: TooltipState = {
  hovered: false,
  focused: false,
  tapped: false,
  placement: 'start',
};

/** The bubble's width in Figma */
export const TOOLTIP_WIDTH = 320;

/** How far the bubble reaches past its icon's edge: its arrow's tip, 20px in, points at the centre */
export const TOOLTIP_OVERHANG: Record<'default' | 'small', number> = { default: 8, small: 10 };

/**
 * Where the bubble sits for each placement (utils/popupPlacement.ts), by icon size: 2px below
 * the icon, opening to the right or to the left of it. Across the page it has no arrow, and
 * starts below the icon, which is as tall as the margin
 */
export const TOOLTIP_PLACEMENTS: Record<'default' | 'small', Record<PopupPlacement, string>> = {
  default: {
    start: 'absolute top-full w-320 max-w-[calc(100vw-32px)] items-start -left-8',
    end: 'absolute top-full w-320 max-w-[calc(100vw-32px)] items-end -right-8',
    full: 'absolute inset-x-16 mt-24',
  },
  small: {
    start: 'absolute top-full w-320 max-w-[calc(100vw-32px)] items-start -left-10',
    end: 'absolute top-full w-320 max-w-[calc(100vw-32px)] items-end -right-10',
    full: 'absolute inset-x-16 mt-20',
  },
};
