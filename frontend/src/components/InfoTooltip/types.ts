import type { ReactNode } from 'react';

import type { PopupPlacement } from '../../utils/popupPlacement';

export interface InfoTooltipProps {
  /** The button's accessible name, such as "About the form name" */
  label: string;
  /**
   * One or two sentences that explain the field or link, or phrasing content, such as a variant's
   * description with its findings segment (spec 003, A6)
   */
  text: ReactNode;
  /** Which side the arrow sits on; "end" for an icon near the right edge */
  arrow?: 'start' | 'end';
  /** The (i) icon: 24px next to field labels, 20px next to link titles */
  iconSize?: 'default' | 'small';
  /**
   * The icon's KERN classes, its glyph and colour; spec 001's muted (i) by default. A variant tab
   * with findings takes the warning triangle or the info icon in the feedback colour (spec 003, A6)
   */
  icon?: string;
}

/** Why the bubble is shown; it is open while any of them holds */
export interface TooltipState {
  /** A mouse or pen is over the (i) or the bubble */
  hovered: boolean;
  /** The (i) has the keyboard focus */
  focused: boolean;
  /** A tap opened it, on a touch screen, which has no hover */
  tapped: boolean;
  /** Where the bubble opens from its icon, measured as it opens */
  placement: PopupPlacement;
}

export type TooltipAction =
  | { type: 'hover'; value: boolean }
  | { type: 'focus'; value: boolean }
  | { type: 'tap' }
  | { type: 'place'; placement: PopupPlacement }
  | { type: 'close' };
