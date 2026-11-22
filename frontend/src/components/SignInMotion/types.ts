import type { ReactNode } from 'react';
import type { Location } from 'react-router';

/**
 * The motion after a successful sign-in (bug login-welcome-motion): `card`, the 800 ms motion
 * of Figma "New visuals" note 3 into the welcome card, or `fade`, the 200 ms cross-fade of the
 * sign-in page over its destination (reduced motion, the overview, a requested route, a page
 * narrower than 1021 px or scrolled)
 */
export type SignInMotionKind = 'card' | 'fade';

/** What the sign-in leads to, as far as the motion cares */
export type SignInDestination = 'welcome' | 'overview' | 'other';

/** What a sign-in started with: the page as it was submitted, kept while it leaves */
export interface SignInMotionStart {
  /** The sign-in page's location, which the signed-out routes hold while the page leaves */
  location: Location;
  /** Whether the sign-in leads to the homepage "/", not back to a requested route */
  toHomepage: boolean;
  /** How far the sign-in page was scrolled; a scrolled page cross-fades */
  scrollY: number;
}

/**
 * `idle` → `armed` (submitted) → `holding` (signed in: the sign-in page stays, the destination
 * loads under it) → `running` (the motion) → `idle`. A failure disarms; a sign-out ends it.
 * `generation` counts the ended exits: the signed-out routes are keyed by it, so that a kept
 * sign-in page is never revived with its "Logging in…"
 */
export type SignInMotionState =
  | { phase: 'idle'; generation: number }
  | ({ phase: 'armed' | 'holding'; generation: number } & SignInMotionStart)
  | ({ phase: 'running'; generation: number; kind: SignInMotionKind } & SignInMotionStart);

export type SignInMotionAction =
  /** "Log in" was submitted */
  | ({ type: 'arm' } & SignInMotionStart)
  /** The sign-in failed, or the sign-in page went before its answer */
  | { type: 'disarm' }
  /** The signed-in state arrived */
  | { type: 'signedIn' }
  /** The signed-out state arrived: a kept page goes */
  | { type: 'signedOut' }
  /** The destination is there: the motion starts */
  | { type: 'start'; kind: SignInMotionKind }
  /** The destination's list didn't arrive in time: the cross-fade to the loading page */
  | { type: 'holdExpired' }
  /** The motion's time is over, the window changed size, or the welcome page went */
  | { type: 'end' };

/** What decides the motion's kind at its start */
export interface SignInMotionConditions {
  destination: SignInDestination;
  /** `prefers-reduced-motion: reduce`, read at the start */
  reducedMotion: boolean;
  /** Whether the sign-in page shows its chain (a page from 1021 px wide) */
  chainShown: boolean;
  /** Whether the sign-in page was scrolled */
  scrolled: boolean;
}

/** A box in the window, in CSS px (a `DOMRect` is one) */
export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** The surface's clip, as `inset()` takes it: the card's distances from the layer's edges */
export interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * The chain's travel: the travelling wrapper starts on the sign-in page's chain (`start`) and
 * ends moved by `x`, `y` and scaled by `scale` about its centre; `copy` is where the card's
 * picture lies inside it, so that the end lays the copy on the card's own picture at its natural
 * size
 */
export interface ChainTravel {
  start: Box;
  x: number;
  y: number;
  scale: number;
  copy: Box;
}

/** What the full motion measures at its start */
export interface SurfaceElements {
  /** The sign-in page's chain */
  chain: HTMLElement | null;
  /** The welcome card */
  card: HTMLElement | null;
  /** The card's clip layer, which plays the surface */
  surface: HTMLElement | null;
  /** The exit layer, whose fixed box the surface takes */
  layer: HTMLElement | null;
}

export interface SignInMotionProviderProps {
  children: ReactNode;
}

export interface SignInExitLayerProps {
  /** The signed-out screens */
  children: ReactNode;
}
