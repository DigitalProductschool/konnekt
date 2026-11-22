import { CHAIN_END, MOTION_PROPERTIES, WELCOME_PICTURE } from './constants';
import type {
  Box,
  ChainTravel,
  Insets,
  SignInMotionAction,
  SignInMotionConditions,
  SignInMotionKind,
  SignInMotionState,
} from './types';

/**
 * The sign-in motion's state (bug login-welcome-motion). Armed at the submit, so that the
 * success never depends on the order of two state updates; a failure disarms. The success
 * holds the sign-in page while the homepage's list loads, or runs the cross-fade at once when
 * the sign-in returns to a requested route (P6). The destination starts the motion; the hold's
 * limit cross-fades to the loading page. An end or a sign-out counts the generation up, so that
 * the kept page is dropped, never shown again. Anything else changes nothing, so a repeated
 * action (React's strict mode runs effects twice) is harmless
 */
export function signInMotionReducer(
  state: SignInMotionState,
  action: SignInMotionAction
): SignInMotionState {
  const { generation } = state;
  switch (action.type) {
    case 'arm':
      if (state.phase !== 'idle' && state.phase !== 'armed') return state;
      return {
        phase: 'armed',
        generation,
        location: action.location,
        toHomepage: action.toHomepage,
        scrollY: action.scrollY,
      };
    case 'disarm':
      return state.phase === 'armed' ? { phase: 'idle', generation } : state;
    case 'signedIn':
      if (state.phase !== 'armed') return state;
      return state.toHomepage
        ? { ...state, phase: 'holding' }
        : { ...state, phase: 'running', kind: 'fade' };
    case 'start':
      return state.phase === 'holding' ? { ...state, phase: 'running', kind: action.kind } : state;
    case 'holdExpired':
      return state.phase === 'holding' ? { ...state, phase: 'running', kind: 'fade' } : state;
    case 'end':
      return state.phase === 'running' ? { phase: 'idle', generation: generation + 1 } : state;
    case 'signedOut':
      return state.phase === 'holding' || state.phase === 'running'
        ? { phase: 'idle', generation: generation + 1 }
        : state;
  }
}

/**
 * The motion's kind at its start: the full motion only into the welcome card, from a sign-in page
 * that shows its chain (from 1021 px wide) and isn't scrolled, without reduced motion; the
 * cross-fade otherwise (P4, P6)
 */
export function motionKindOf({
  destination,
  reducedMotion,
  chainShown,
  scrolled,
}: SignInMotionConditions): SignInMotionKind {
  return destination === 'welcome' && !reducedMotion && chainShown && !scrolled ? 'card' : 'fade';
}

/** A box in the window taken in the layer's coordinates (the layer's top left is 0, 0) */
export function boxIn(box: Box, layer: Pick<Box, 'left' | 'top'>): Box {
  return {
    left: box.left - layer.left,
    top: box.top - layer.top,
    width: box.width,
    height: box.height,
  };
}

/**
 * The surface's clip at the end: the card's distances from the layer's edges, the card in the
 * layer's coordinates (`boxIn`; the layer is the window without its scrollbar gutter). A card
 * that reaches under the window's edge gets a negative inset there, which `inset()` takes
 */
export function surfaceInsetsOf(layer: Pick<Box, 'width' | 'height'>, card: Box): Insets {
  return {
    top: card.top,
    right: layer.width - card.left - card.width,
    bottom: layer.height - card.top - card.height,
    left: card.left,
  };
}

/**
 * The chain's travel from the sign-in page's chain to the welcome card's (P1): its centre goes to
 * the card's right edge − 112.09 px and top + 148.67 px, its size to 593.75 px, so that it ends
 * on the card's top right corner as the card's picture is pinned there. The copy of the card's
 * picture inside the wrapper is the picture's box mapped back through that end transform
 */
export function chainTravelOf(chain: Box, card: Box): ChainTravel {
  const scale = CHAIN_END.size / chain.width;
  const endX = card.left + card.width - CHAIN_END.right;
  const endY = card.top + CHAIN_END.top;
  const pictureLeft = card.left + card.width - WELCOME_PICTURE.width;
  return {
    start: { left: chain.left, top: chain.top, width: chain.width, height: chain.height },
    x: endX - (chain.left + chain.width / 2),
    y: endY - (chain.top + chain.height / 2),
    scale,
    copy: {
      left: chain.width / 2 + (pictureLeft - endX) / scale,
      top: chain.height / 2 + (card.top - endY) / scale,
      width: WELCOME_PICTURE.width / scale,
      height: WELCOME_PICTURE.height / scale,
    },
  };
}

function px(value: number): string {
  return `${value}px`;
}

/** The measured values as the custom properties the motion's classes read */
export function motionPropertiesOf(insets: Insets, travel: ChainTravel): [string, string][] {
  return [
    [MOTION_PROPERTIES.insetTop, px(insets.top)],
    [MOTION_PROPERTIES.insetRight, px(insets.right)],
    [MOTION_PROPERTIES.insetBottom, px(insets.bottom)],
    [MOTION_PROPERTIES.insetLeft, px(insets.left)],
    [MOTION_PROPERTIES.chainLeft, px(travel.start.left)],
    [MOTION_PROPERTIES.chainTop, px(travel.start.top)],
    [MOTION_PROPERTIES.chainWidth, px(travel.start.width)],
    [MOTION_PROPERTIES.chainHeight, px(travel.start.height)],
    [MOTION_PROPERTIES.chainX, px(travel.x)],
    [MOTION_PROPERTIES.chainY, px(travel.y)],
    [MOTION_PROPERTIES.chainScale, String(travel.scale)],
    [MOTION_PROPERTIES.copyLeft, px(travel.copy.left)],
    [MOTION_PROPERTIES.copyTop, px(travel.copy.top)],
    [MOTION_PROPERTIES.copyWidth, px(travel.copy.width)],
    [MOTION_PROPERTIES.copyHeight, px(travel.copy.height)],
  ];
}
