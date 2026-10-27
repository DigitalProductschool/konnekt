import type { PopupPlacement } from '../../utils/popupPlacement';

export interface InfoTooltipProps {
  /** The button's accessible name, such as "About the form name" */
  label: string;
  /** One or two sentences that explain the field or link */
  text: string;
  /** Which side the arrow sits on; "end" for an icon near the right edge */
  arrow?: 'start' | 'end';
  /** The (i) icon: 24px next to field labels, 20px next to link titles */
  iconSize?: 'default' | 'small';
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
