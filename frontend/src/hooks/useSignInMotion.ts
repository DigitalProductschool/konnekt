import {
  createContext,
  type Dispatch,
  type RefObject,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from 'react';
import { preload } from 'react-dom';
import type { Location } from 'react-router';

import chainWelcomeCard from '../assets/illustrations/chain-welcome-card@2x.webp';
import { redirectTarget } from '../components/RequireSignedOut/utils';
import {
  SIGN_IN_HOLD_LIMIT_MS,
  SIGN_IN_MOTION_DURATION_MS,
  SIGN_IN_MOTION_END_GRACE_MS,
  SIGN_IN_SURFACE_ANIMATION,
} from '../components/SignInMotion/constants';
import type {
  SignInMotionAction,
  SignInMotionKind,
  SignInMotionState,
  SurfaceElements,
} from '../components/SignInMotion/types';
import {
  boxIn,
  chainTravelOf,
  motionKindOf,
  motionPropertiesOf,
  surfaceInsetsOf,
} from '../components/SignInMotion/utils';
import { ROUTES } from '../constants';
import type { Homepage } from './types';

export interface SignInMotionContextValue {
  state: SignInMotionState;
  dispatch: Dispatch<SignInMotionAction>;
  /** The sign-in page's chain (AuthLayout), whose box the full motion starts from */
  chainRef: RefObject<HTMLImageElement | null>;
  /**
   * The exit layer (`SignInExitLayer`), fixed over the window while the page leaves: its box is
   * the surface's. It is measured, not the root's `clientWidth`, which in Chromium still counts
   * the scrollbar gutter that kern.css reserves (`scrollbar-gutter: stable`)
   */
  layerRef: RefObject<HTMLDivElement | null>;
}

export const SignInMotionContext = createContext<SignInMotionContextValue | null>(null);

/**
 * The sign-in page while it leaves: `holding` while its destination loads under it, then the
 * motion's kind; null at rest
 */
export type SignInExit = 'holding' | SignInMotionKind | null;

function useSignInMotionContext(): SignInMotionContextValue {
  const value = useContext(SignInMotionContext);
  if (value === null) {
    throw new Error('The sign-in motion needs a SignInMotionProvider');
  }
  return value;
}

function exitOf(state: SignInMotionState): SignInExit {
  if (state.phase === 'holding') return 'holding';
  if (state.phase === 'running') return state.kind;
  return null;
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * The provider's clocks (bug login-welcome-motion): the hold's limit, after which the sign-in
 * page cross-fades to the loading page; the motion's end, when its own animation ends (the
 * surface's, or the exit layer's cross-fade), which starts a frame after the commit, and else by
 * a timer a little after its duration, so that a browser that never reports an animation's end
 * still gets the plain page; and a resize during the full motion, which ends it at once, since
 * its boxes were measured
 */
export function useSignInMotionTimers(
  state: SignInMotionState,
  dispatch: Dispatch<SignInMotionAction>,
  layerRef: RefObject<HTMLDivElement | null>
): void {
  const { phase, generation } = state;
  const kind = state.phase === 'running' ? state.kind : null;

  useEffect(() => {
    if (phase !== 'holding') return;
    const timer = window.setTimeout(() => dispatch({ type: 'holdExpired' }), SIGN_IN_HOLD_LIMIT_MS);
    return () => window.clearTimeout(timer);
  }, [phase, generation, dispatch]);

  useEffect(() => {
    if (kind === null) return;
    const end = () => dispatch({ type: 'end' });
    const ended = (event: AnimationEvent) => {
      const own =
        kind === 'card'
          ? event.animationName === SIGN_IN_SURFACE_ANIMATION
          : event.target === layerRef.current;
      if (own) end();
    };
    const timer = window.setTimeout(
      end,
      SIGN_IN_MOTION_DURATION_MS[kind] + SIGN_IN_MOTION_END_GRACE_MS
    );
    document.addEventListener('animationend', ended);
    if (kind === 'card') window.addEventListener('resize', end);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('animationend', ended);
      window.removeEventListener('resize', end);
    };
  }, [kind, generation, dispatch, layerRef]);
}

/**
 * The sign-in card's part: `arm` at the submit (with the page's location, whether the sign-in
 * leads to the homepage, and the page's scroll offset), `disarm` on a failure. A sign-in page
 * that goes before its answer (to "Forgot password?") disarms too
 */
export function useSignInTrigger(): { arm: (location: Location) => void; disarm: () => void } {
  const { dispatch } = useSignInMotionContext();
  useEffect(() => () => dispatch({ type: 'disarm' }), [dispatch]);
  return useMemo(
    () => ({
      arm: (location: Location) =>
        dispatch({
          type: 'arm',
          location,
          toHomepage: redirectTarget(location.state) === ROUTES.overview,
          scrollY: window.scrollY,
        }),
      disarm: () => dispatch({ type: 'disarm' }),
    }),
    [dispatch]
  );
}

/** The sign-in page while it leaves (`SignInExit`), for the signed-out screens */
export function useSignInExit(): SignInExit {
  return exitOf(useSignInMotionContext().state);
}

/**
 * The exit layer: the exit, and the layer's element, which keeps the sign-in page's scroll
 * offset once the page is fixed over its destination, and whose box the full motion measures
 */
export function useSignInExitLayer(): {
  exit: SignInExit;
  layerRef: RefObject<HTMLDivElement | null>;
} {
  const { state, layerRef } = useSignInMotionContext();
  const exit = exitOf(state);
  const leaving = exit !== null;
  const scrollY = state.phase === 'idle' ? 0 : state.scrollY;
  useLayoutEffect(() => {
    if (leaving && layerRef.current) {
      layerRef.current.scrollTop = scrollY;
    }
  }, [leaving, scrollY, layerRef]);
  return { exit, layerRef };
}

/**
 * The location the signed-out screens show: the sign-in page's while it leaves, null otherwise;
 * and the count of ended exits, which keys them
 */
export function useSignInHeldLocation(): { held: Location | null; generation: number } {
  const { state } = useSignInMotionContext();
  const held = state.phase === 'holding' || state.phase === 'running' ? state.location : null;
  return { held, generation: state.generation };
}

/** The sign-in page's chain, for AuthLayout */
export function useSignInChainRef(): RefObject<HTMLImageElement | null> {
  return useSignInMotionContext().chainRef;
}

/**
 * A signed-in layout under the leaving sign-in page: `active` from the success to the motion's
 * end (the page is fully there, without its own fade-in), `card` during the full motion
 */
export function useSignInArrival(): { active: boolean; card: boolean } {
  const { state } = useSignInMotionContext();
  return {
    active: state.phase === 'holding' || state.phase === 'running',
    card: state.phase === 'running' && state.kind === 'card',
  };
}

/**
 * The homepage as the sign-in's destination (P5, P6, P7): the overview starts the cross-fade; the
 * welcome page starts its own motion (`useSignInSurface`), and when it gives way to the overview
 * (the device's memory was wrong) the motion ends at once. While the sign-in page holds over the
 * loading page, the card's picture is requested, so that its copy is there when it fades in (the
 * motion never waits for it); the welcome page requests it itself, and the overview needs none.
 * The page's heading takes the focus once the page shows it, at the motion's start or when the
 * loading page gives way
 */
export function useSignInDestination(
  view: Homepage | 'loading',
  titleRef: RefObject<HTMLHeadingElement | null>
): { card: boolean } {
  const { state, dispatch } = useSignInMotionContext();
  const holding = state.phase === 'holding';
  const card = state.phase === 'running' && state.kind === 'card';
  const focusTitle = useRef(holding);
  // The view whose heading took the focus on arrival: when the device's memory was wrong and the
  // welcome page gives way to the overview, the overview's heading takes it, if nothing else did
  const arrivalView = useRef<Homepage | null>(null);

  useLayoutEffect(() => {
    if (holding && view === 'overview') {
      dispatch({ type: 'start', kind: 'fade' });
    }
  }, [holding, view, dispatch]);

  useEffect(() => {
    if (holding && view === 'loading') {
      preload(chainWelcomeCard, { as: 'image' });
    }
  }, [holding, view]);

  useLayoutEffect(() => {
    if (card && view !== 'welcome') {
      dispatch({ type: 'end' });
    }
  }, [card, view, dispatch]);

  useEffect(() => {
    if (view === 'loading') return;
    if (focusTitle.current) {
      focusTitle.current = false;
      arrivalView.current = view;
      titleRef.current?.focus();
    } else if (arrivalView.current !== null && arrivalView.current !== view) {
      arrivalView.current = null;
      const active = document.activeElement;
      if (active === null || active === document.body) titleRef.current?.focus();
    }
  }, [view, titleRef]);

  return { card };
}

/**
 * Measures the full motion onto the surface and says whether it can run: the sign-in page's
 * chain is shown and the card, its surface and the exit layer are there. Every box is taken in
 * the exit layer's, which is the surface's once that is fixed: the window without the scrollbar
 * gutter
 */
function measureSurface(
  { chain, card, surface, layer }: SurfaceElements,
  scrolled: boolean
): SignInMotionKind {
  const chainBox = chain?.getBoundingClientRect() ?? null;
  const kind = motionKindOf({
    destination: 'welcome',
    reducedMotion: prefersReducedMotion(),
    chainShown: chainBox !== null && chainBox.width > 0,
    scrolled,
  });
  if (kind === 'fade' || chainBox === null || card === null || surface === null || layer === null) {
    return 'fade';
  }
  const layerBox = layer.getBoundingClientRect();
  const cardBox = boxIn(card.getBoundingClientRect(), layerBox);
  const insets = surfaceInsetsOf(layerBox, cardBox);
  const travel = chainTravelOf(boxIn(chainBox, layerBox), cardBox);
  for (const [name, value] of motionPropertiesOf(insets, travel)) {
    surface.style.setProperty(name, value);
  }
  return 'card';
}

/**
 * The welcome page as the sign-in's destination: at the start, before the browser paints, it
 * measures the three boxes onto the surface and starts the full motion, or the cross-fade where
 * the motion can't run (P4). `card` is true while the full motion runs
 */
export function useSignInSurface(
  cardRef: RefObject<HTMLElement | null>,
  surfaceRef: RefObject<HTMLElement | null>
): { card: boolean } {
  const { state, dispatch, chainRef, layerRef } = useSignInMotionContext();
  const holding = state.phase === 'holding';
  const scrolled = state.phase !== 'idle' && state.scrollY > 0;

  useLayoutEffect(() => {
    if (holding) {
      const elements = {
        chain: chainRef.current,
        card: cardRef.current,
        surface: surfaceRef.current,
        layer: layerRef.current,
      };
      dispatch({ type: 'start', kind: measureSurface(elements, scrolled) });
    }
  }, [holding, scrolled, chainRef, cardRef, surfaceRef, layerRef, dispatch]);

  return { card: state.phase === 'running' && state.kind === 'card' };
}
