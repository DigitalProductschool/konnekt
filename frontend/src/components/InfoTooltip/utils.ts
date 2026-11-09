import { CLOSED, DISABLED_STILL, INFO_ICON, INFO_TONES, TOOLTIP_PLACEMENTS } from './constants';
import type {
  InfoTone,
  TooltipAction,
  TooltipPlacement,
  TooltipState,
  TooltipTrigger,
} from './types';

export function tooltipReducer(state: TooltipState, action: TooltipAction): TooltipState {
  switch (action.type) {
    case 'hover':
      return { ...state, hovered: action.value };
    case 'focus':
      // Losing the focus also closes what a tap opened: the tap went elsewhere
      return action.value
        ? { ...state, focused: true }
        : { ...state, focused: false, tapped: false };
    case 'tap':
      return { ...state, tapped: !state.tapped };
    case 'place':
      return { ...state, placement: action.placement };
    case 'close':
      // Escape, or a tap elsewhere. Moving the pointer back in or focusing again reopens it
      return { ...CLOSED, placement: state.placement };
  }
}

export function isOpen(state: TooltipState): boolean {
  return state.hovered || state.focused || state.tapped;
}

/** The bubble's position classes for its trigger and placement */
export function bubblePlacementClass(trigger: TooltipTrigger, placement: TooltipPlacement): string {
  return TOOLTIP_PLACEMENTS[trigger][placement.side][placement.direction];
}

/**
 * Whether the bubble comes before its trigger in the wrapper: when it opens up, so that across
 * the page, where it starts where the flow puts it, it starts at the trigger's top
 */
export function bubbleFirst(placement: TooltipPlacement): boolean {
  return placement.direction === 'up';
}

/** The ⓘ's glyph and colour classes: `icon` as given, or KERN's info icon in its tone */
export function iconClasses(icon: string | undefined, tone: InfoTone): string {
  return icon ?? `${INFO_ICON} ${INFO_TONES[tone]}`;
}

/** The classes that keep a disabled KERN button still on hover and press (DISABLED_STILL) */
export function disabledStillClasses(className: string): string {
  return /(^|\s)kern-btn--primary(\s|$)/.test(className)
    ? DISABLED_STILL.primary
    : DISABLED_STILL.other;
}
