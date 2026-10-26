import { CLOSED } from './constants';
import type { TooltipAction, TooltipState } from './types';

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
