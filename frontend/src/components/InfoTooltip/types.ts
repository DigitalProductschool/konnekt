import type { ButtonHTMLAttributes, ReactNode } from 'react';

import type { MenuPlacement } from '../../utils/popupPlacement';

/**
 * The ⓘ's colour by its background (build note 35, U07 7370:55189): muted grey everywhere but on
 * a blue background, where it is the info blue; the "What is a variant" ⓘ after "Add variant" is
 * the action blue
 */
export type InfoTone = 'muted' | 'info' | 'action';

export interface InfoTooltipProps {
  /** The button's accessible name, such as "About the form name" */
  label: string;
  /**
   * One or two sentences that explain the field or link, or phrasing content, such as a variant's
   * description with its findings segment (spec 003, A6)
   */
  text: ReactNode;
  /**
   * The side the bubble lines up with its icon on, where it fits: "start" opens it to the right,
   * "end", for an icon near the right edge, to the left (the name is the old arrow's side)
   */
  arrow?: 'start' | 'end';
  /** The (i) icon: 24px next to field labels, 20px next to link titles and tabs */
  iconSize?: 'default' | 'small';
  /** The ⓘ's colour (build note 35); muted grey by default. Ignored when `icon` is given */
  tone?: InfoTone;
  /**
   * The icon's KERN classes, its glyph and colour, in place of the ⓘ in its `tone`. A variant tab
   * with findings takes the warning triangle or the info icon in the feedback colour (spec 003,
   * A6)
   */
  icon?: string;
}

/**
 * A button that can be disabled with an explanation (FR-034, FR-052b, W21; design-notes §3
 * "Disabled button with explanation"): every attribute of a `<button>` but `disabled`, which
 * would take it out of the tab order and stop hover
 */
export interface ExplainedButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'disabled' | 'aria-disabled' | 'aria-describedby'
> {
  /**
   * Why the button can't be used now, such as "Save the rule first": while it is set, the button
   * is `aria-disabled`, stays focusable, ignores activation and shows this text in the tooltip on
   * hover, on keyboard focus and on a tap. Null or absent: an ordinary button
   */
  explanation?: string | null;
  /** The side the explanation lines up with the button on, where it fits; "end" near the right edge */
  align?: 'start' | 'end';
  /**
   * Classes that place the button in its row, such as `ml-auto` in a footer: they go on the
   * wrapper around the button and its tooltip, which is the row's item
   */
  wrapperClassName?: string;
  children: ReactNode;
}

/** Where the bubble opens from its trigger: the side and the direction of placementFrom() */
export type TooltipPlacement = Pick<MenuPlacement, 'side' | 'direction'>;

/** What opens a tooltip: the ⓘ, or a disabled button with its explanation */
export type TooltipTrigger = 'icon' | 'button';

/** Why the bubble is shown; it is open while any of them holds */
export interface TooltipState {
  /** A mouse or pen is over the trigger or the bubble */
  hovered: boolean;
  /** The trigger has the keyboard focus */
  focused: boolean;
  /** A tap opened it, on a touch screen, which has no hover */
  tapped: boolean;
  /** Where the bubble opens from its trigger, measured as it opens */
  placement: TooltipPlacement;
}

export type TooltipAction =
  | { type: 'hover'; value: boolean }
  | { type: 'focus'; value: boolean }
  | { type: 'tap' }
  | { type: 'place'; placement: TooltipPlacement }
  | { type: 'close' };

export interface TooltipBubbleProps {
  id: string;
  text: ReactNode;
  open: boolean;
  trigger: TooltipTrigger;
  placement: TooltipPlacement;
}
