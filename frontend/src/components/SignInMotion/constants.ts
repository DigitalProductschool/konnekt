import type { SignInMotionKind, SignInMotionState } from './types';

export const INITIAL_SIGN_IN_MOTION: SignInMotionState = { phase: 'idle', generation: 0 };

/**
 * How long each motion runs, as `--duration-signin` and `--duration-signin-fade` in index.css
 * say. It ends with its own animation (`SIGN_IN_SURFACE_ANIMATION`, or the exit layer's fade),
 * which starts a frame after the commit; a timer ends it `SIGN_IN_MOTION_END_GRACE_MS` later at
 * the latest, also where a browser never reports the animation's end
 */
export const SIGN_IN_MOTION_DURATION_MS: Record<SignInMotionKind, number> = {
  card: 800,
  fade: 200,
};

export const SIGN_IN_MOTION_END_GRACE_MS = 50;

/** The full motion's clock: the surface's keyframes (index.css) */
export const SIGN_IN_SURFACE_ANIMATION = 'signin-surface';

/**
 * How long the sign-in page holds while the homepage's list loads on a device that remembers
 * nothing of the account; then it cross-fades to the loading page (P5)
 */
export const SIGN_IN_HOLD_LIMIT_MS = 1000;

/**
 * Where the chain ends (Figma "New visuals": the welcome chain 7741:61975, from its layer's
 * centre 1167.91, 300.67 in a card at 160, 152, 1120 wide): its centre 112.09 px left of the
 * card's right edge and 148.67 px under its top, at the size at which its square picture covers
 * the layer (593.75 px, ×0.38257 of the sign-in chain's 1552). It never scales with the card
 */
export const CHAIN_END = { right: 112.09, top: 148.67, size: 593.75 } as const;

/** The card's picture (`chain-welcome-card`) at its natural size, at the card's top right */
export const WELCOME_PICTURE = { width: 480, height: 320 } as const;

/** The custom properties the start measures onto the surface (`motionPropertiesOf`) */
export const MOTION_PROPERTIES = {
  insetTop: '--signin-inset-top',
  insetRight: '--signin-inset-right',
  insetBottom: '--signin-inset-bottom',
  insetLeft: '--signin-inset-left',
  chainLeft: '--signin-chain-left',
  chainTop: '--signin-chain-top',
  chainWidth: '--signin-chain-width',
  chainHeight: '--signin-chain-height',
  chainX: '--signin-chain-x',
  chainY: '--signin-chain-y',
  chainScale: '--signin-chain-scale',
  copyLeft: '--signin-copy-left',
  copyTop: '--signin-copy-top',
  copyWidth: '--signin-copy-width',
  copyHeight: '--signin-copy-height',
} as const;

/*
 * The exit layer: the sign-in page over its destination, from the success to the motion's end.
 * Fixed over the window and above the header (z-30) and the toasts, it takes the pointer (its
 * content is inert, so a click lands on the layer and goes no further). `overflow-hidden` makes
 * it the sign-in page's scroller, so that a scrolled page keeps its offset (`useSignInExitLayer`).
 * The cross-fade's opacity stays on under reduced motion: no `.motion` (design-notes §4)
 */
export const EXIT_LAYER_CLASSES = {
  rest: 'contents',
  holding: 'fixed inset-0 z-50 overflow-hidden',
  card: 'fixed inset-0 z-50 overflow-hidden',
  fade: 'fixed inset-0 z-50 overflow-hidden opacity-0 animate-signin-fade',
} as const;

/** The exit layer's content: inert while it leaves, no box at rest */
export const EXIT_CONTENT_CLASSES = { rest: 'contents', exit: 'min-h-dvh' } as const;

/**
 * The sign-in page's parts in the full motion (0–240 ms, ease-out): the hero and the header fade
 * out, the card fades out while it drops 12 px; the blue and the chain are handed to the welcome
 * card's surface at the start
 */
export const EXIT_CARD_CLASSES = {
  surface: 'bg-transparent',
  chain: 'invisible',
  fade: 'motion opacity-0 animate-signin-out',
  drop: 'motion translate-y-12 opacity-0 animate-signin-out-drop',
} as const;

/*
 * The welcome page's parts in the full motion. The card's clip layer is the surface: fixed over
 * the window, under everything else on the page (`-z-10` in the layout's `isolate`), clipped
 * onto the card from the window (ease-in-out, 800 ms) while its blue turns the card's tint. Its
 * resting style is the end state; the card's own background waits under it. The header and the
 * title fade in at 320–640 ms, the card's content at 480–800 ms, above the surface
 */
export const ARRIVAL_CARD_CLASSES = {
  layout: 'isolate',
  surface:
    'pointer-events-none fixed inset-0 -z-10 block overflow-hidden bg-kern-layout-background-hued [clip-path:inset(var(--signin-inset-top)_var(--signin-inset-right)_var(--signin-inset-bottom)_var(--signin-inset-left)_round_var(--kern-metric-border-radius-large))] motion animate-signin-surface',
  card: 'bg-transparent',
  picture: 'invisible',
  header: 'motion animate-signin-in-header',
  title: 'motion animate-signin-in-header',
  offer: '[&>section]:animate-signin-in-header',
  content: 'motion animate-signin-in-content',
} as const;

/*
 * The travelling chain (P1: no picture turns): a wrapper on the sign-in chain's box that moves
 * and scales onto the welcome chain's place (800 ms, ease-in-out), holding the white chain, which
 * fades out, and a copy of the card's picture, which fades in (240–560 ms, linear). Transforms
 * and opacities sit on the wrappers, never on the pictures
 */
export const CHAIN_TRAVEL_CLASSES = {
  wrapper:
    'absolute top-(--signin-chain-top) left-(--signin-chain-left) h-(--signin-chain-height) w-(--signin-chain-width) translate-x-(--signin-chain-x) translate-y-(--signin-chain-y) scale-(--signin-chain-scale) motion animate-signin-chain',
  white: 'absolute inset-0 opacity-0 motion animate-signin-chain-out',
  copy: 'absolute top-(--signin-copy-top) left-(--signin-copy-left) h-(--signin-copy-height) w-(--signin-copy-width) motion animate-signin-chain-in',
  picture: 'h-full! w-full max-w-none!',
} as const;
