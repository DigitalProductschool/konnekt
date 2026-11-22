import type { Location } from 'react-router';
import { describe, expect, it } from 'vitest';

import { CHAIN_END, INITIAL_SIGN_IN_MOTION, MOTION_PROPERTIES, WELCOME_PICTURE } from './constants';
import type { Box, SignInMotionAction, SignInMotionState } from './types';
import {
  boxIn,
  chainTravelOf,
  motionKindOf,
  motionPropertiesOf,
  signInMotionReducer,
  surfaceInsetsOf,
} from './utils';

const LOGIN: Location = { pathname: '/login', search: '', hash: '', state: null, key: 'login' };

function run(actions: SignInMotionAction[], from = INITIAL_SIGN_IN_MOTION): SignInMotionState {
  return actions.reduce(signInMotionReducer, from);
}

const ARM_HOME: SignInMotionAction = { type: 'arm', location: LOGIN, toHomepage: true, scrollY: 0 };
const ARM_FROM: SignInMotionAction = {
  type: 'arm',
  location: LOGIN,
  toHomepage: false,
  scrollY: 0,
};

// Figma "New visuals" at 1440 × 900: the sign-in chain 7756:105819 and the welcome card
// 7741:61974 (bug login-welcome-motion, the assessment's numbers)
const WINDOW = { width: 1440, height: 900 };
const SIGN_IN_CHAIN: Box = { left: 346, top: -191, width: 1552, height: 1552 };
const CARD: Box = { left: 160, top: 152, width: 1120, height: 296 };

/** Where a point of the wrapper (its own coordinates) ends after the travel */
function endPointOf(travel: ReturnType<typeof chainTravelOf>, x: number, y: number) {
  const { start, scale } = travel;
  return {
    x: start.left + start.width / 2 + travel.x + scale * (x - start.width / 2),
    y: start.top + start.height / 2 + travel.y + scale * (y - start.height / 2),
  };
}

describe('signInMotionReducer', () => {
  it('arms at the submit with the page, its destination and its scroll offset', () => {
    expect(run([ARM_HOME])).toEqual({
      phase: 'armed',
      generation: 0,
      location: LOGIN,
      toHomepage: true,
      scrollY: 0,
    });
  });

  it('disarms on a failure, keeping the generation, so the failed page stays as it is', () => {
    expect(run([ARM_HOME, { type: 'disarm' }])).toEqual(INITIAL_SIGN_IN_MOTION);
  });

  it('holds the sign-in page after a success that leads to the homepage', () => {
    expect(run([ARM_HOME, { type: 'signedIn' }])).toMatchObject({ phase: 'holding' });
  });

  it('cross-fades at once after a success that returns to a requested route (P6)', () => {
    expect(run([ARM_FROM, { type: 'signedIn' }])).toMatchObject({
      phase: 'running',
      kind: 'fade',
    });
  });

  it('runs the kind the destination starts', () => {
    const holding = run([ARM_HOME, { type: 'signedIn' }]);
    expect(signInMotionReducer(holding, { type: 'start', kind: 'card' })).toMatchObject({
      phase: 'running',
      kind: 'card',
    });
    expect(signInMotionReducer(holding, { type: 'start', kind: 'fade' })).toMatchObject({
      phase: 'running',
      kind: 'fade',
    });
  });

  it('cross-fades to the loading page when the hold runs out (P5)', () => {
    expect(run([ARM_HOME, { type: 'signedIn' }, { type: 'holdExpired' }])).toMatchObject({
      phase: 'running',
      kind: 'fade',
    });
  });

  it('ends a running motion and counts the generation up, so the kept page is dropped', () => {
    const state = run([ARM_HOME, { type: 'signedIn' }, { type: 'start', kind: 'card' }]);
    expect(signInMotionReducer(state, { type: 'end' })).toEqual({ phase: 'idle', generation: 1 });
  });

  it('drops a holding or running page on a sign-out, never reviving it', () => {
    const holding = run([ARM_HOME, { type: 'signedIn' }]);
    expect(signInMotionReducer(holding, { type: 'signedOut' })).toEqual({
      phase: 'idle',
      generation: 1,
    });
    const running = signInMotionReducer(holding, { type: 'start', kind: 'card' });
    expect(signInMotionReducer(running, { type: 'signedOut' })).toEqual({
      phase: 'idle',
      generation: 1,
    });
  });

  it('ignores what does not fit the phase, so repeated actions are harmless', () => {
    const idle = INITIAL_SIGN_IN_MOTION;
    const armed = run([ARM_HOME]);
    const holding = run([ARM_HOME, { type: 'signedIn' }]);
    const running = signInMotionReducer(holding, { type: 'start', kind: 'card' });
    // A session found at the app's start is no sign-in
    expect(signInMotionReducer(idle, { type: 'signedIn' })).toBe(idle);
    expect(signInMotionReducer(idle, { type: 'signedOut' })).toBe(idle);
    expect(signInMotionReducer(armed, { type: 'signedOut' })).toBe(armed);
    expect(signInMotionReducer(armed, { type: 'start', kind: 'card' })).toBe(armed);
    expect(signInMotionReducer(armed, { type: 'end' })).toBe(armed);
    // The page that leaves can't be disarmed or armed again, and is held only once
    expect(signInMotionReducer(holding, { type: 'disarm' })).toBe(holding);
    expect(signInMotionReducer(holding, ARM_HOME)).toBe(holding);
    expect(signInMotionReducer(holding, { type: 'end' })).toBe(holding);
    expect(signInMotionReducer(running, { type: 'start', kind: 'fade' })).toBe(running);
    expect(signInMotionReducer(running, { type: 'holdExpired' })).toBe(running);
    expect(signInMotionReducer(running, { type: 'signedIn' })).toBe(running);
  });

  it('arms again after an ended motion, in the new generation', () => {
    const ended = run([ARM_HOME, { type: 'signedIn' }, { type: 'holdExpired' }, { type: 'end' }]);
    expect(signInMotionReducer(ended, ARM_FROM)).toMatchObject({
      phase: 'armed',
      generation: 1,
      toHomepage: false,
    });
  });
});

describe('motionKindOf', () => {
  const welcome = {
    destination: 'welcome',
    reducedMotion: false,
    chainShown: true,
    scrolled: false,
  } as const;

  it('runs the full motion into the welcome card from a sign-in page with its chain', () => {
    expect(motionKindOf(welcome)).toBe('card');
  });

  it('cross-fades into the overview and to a requested route (P6)', () => {
    expect(motionKindOf({ ...welcome, destination: 'overview' })).toBe('fade');
    expect(motionKindOf({ ...welcome, destination: 'other' })).toBe('fade');
  });

  it('cross-fades under reduced motion', () => {
    expect(motionKindOf({ ...welcome, reducedMotion: true })).toBe('fade');
  });

  it('cross-fades from a page under 1021 px, which shows no chain, or a scrolled one (P4)', () => {
    expect(motionKindOf({ ...welcome, chainShown: false })).toBe('fade');
    expect(motionKindOf({ ...welcome, scrolled: true })).toBe('fade');
  });
});

describe('boxIn', () => {
  it("takes a box in the layer's coordinates", () => {
    expect(boxIn(CARD, { left: 0, top: 0 })).toEqual(CARD);
    expect(boxIn(CARD, { left: 10, top: -4 })).toEqual({ ...CARD, left: 150, top: 156 });
  });
});

describe('surfaceInsetsOf', () => {
  it('measures the layer, not the root: a 1440 px page with the gutter in a 1455 px window', () => {
    // kern.css reserves the gutter (`scrollbar-gutter: stable`): the fixed layer is the page's
    // 1440 px while Chromium's `clientWidth` of the root says 1455
    expect(surfaceInsetsOf(WINDOW, CARD).right).toBe(160);
    expect(surfaceInsetsOf({ width: 1455, height: 900 }, CARD).right).toBe(175);
  });

  it('clips the window onto the card as the frame draws it at 1440 × 900', () => {
    expect(surfaceInsetsOf(WINDOW, CARD)).toEqual({ top: 152, right: 160, bottom: 452, left: 160 });
  });

  it('follows a taller card (German, 320 px) and one pushed down by the local-drafts offer', () => {
    expect(surfaceInsetsOf(WINDOW, { ...CARD, height: 320 }).bottom).toBe(428);
    expect(surfaceInsetsOf(WINDOW, { ...CARD, top: 260 })).toEqual({
      top: 260,
      right: 160,
      bottom: 344,
      left: 160,
    });
  });

  it('goes negative where the card reaches under the window', () => {
    expect(
      surfaceInsetsOf({ width: 1024, height: 400 }, { ...CARD, width: 960, left: 32 })
    ).toEqual({ top: 152, right: 32, bottom: -48, left: 32 });
  });
});

describe('chainTravelOf', () => {
  it("ends on Figma's welcome chain at 1440 × 900: centre 1167.91, 300.67, ×0.38257", () => {
    const travel = chainTravelOf(SIGN_IN_CHAIN, CARD);
    expect(travel.start).toEqual(SIGN_IN_CHAIN);
    expect(travel.scale).toBeCloseTo(0.38257, 5);
    expect(travel.scale * SIGN_IN_CHAIN.width).toBeCloseTo(CHAIN_END.size, 6);
    // From the sign-in chain's centre (1122, 585)
    expect(travel.x).toBeCloseTo(45.91, 6);
    expect(travel.y).toBeCloseTo(-284.33, 6);
    const centre = endPointOf(travel, SIGN_IN_CHAIN.width / 2, SIGN_IN_CHAIN.height / 2);
    expect(centre.x).toBeCloseTo(1167.91, 6);
    expect(centre.y).toBeCloseTo(300.67, 6);
  });

  it("lays the copy on the card's own picture at its natural size when it arrives", () => {
    const travel = chainTravelOf(SIGN_IN_CHAIN, CARD);
    const topLeft = endPointOf(travel, travel.copy.left, travel.copy.top);
    const bottomRight = endPointOf(
      travel,
      travel.copy.left + travel.copy.width,
      travel.copy.top + travel.copy.height
    );
    expect(topLeft.x).toBeCloseTo(CARD.left + CARD.width - WELCOME_PICTURE.width, 6);
    expect(topLeft.y).toBeCloseTo(CARD.top, 6);
    expect(bottomRight.x).toBeCloseTo(CARD.left + CARD.width, 6);
    expect(bottomRight.y).toBeCloseTo(CARD.top + WELCOME_PICTURE.height, 6);
  });

  it("follows a moved card and a narrower window, tied to the card's top right corner", () => {
    // 1280 × 720: the sign-in chain at 306 (left 100% − 1094px holds from 1400px), the card in a
    // 1120px column at 80
    const chain = { ...SIGN_IN_CHAIN, left: 306 };
    const card = { left: 80, top: 260, width: 1120, height: 320 };
    const travel = chainTravelOf(chain, card);
    const centre = endPointOf(travel, chain.width / 2, chain.height / 2);
    expect(centre.x).toBeCloseTo(1200 - CHAIN_END.right, 6);
    expect(centre.y).toBeCloseTo(260 + CHAIN_END.top, 6);
    const topLeft = endPointOf(travel, travel.copy.left, travel.copy.top);
    expect(topLeft.x).toBeCloseTo(1200 - WELCOME_PICTURE.width, 6);
    expect(topLeft.y).toBeCloseTo(260, 6);
    // The size never follows the card
    expect(travel.scale * chain.width).toBeCloseTo(CHAIN_END.size, 6);
  });
});

describe('motionPropertiesOf', () => {
  it('gives every custom property the classes read, as px (the scale as a number)', () => {
    const properties = new Map(
      motionPropertiesOf(surfaceInsetsOf(WINDOW, CARD), chainTravelOf(SIGN_IN_CHAIN, CARD))
    );
    expect([...properties.keys()].sort()).toEqual(Object.values(MOTION_PROPERTIES).sort());
    expect(properties.get(MOTION_PROPERTIES.insetBottom)).toBe('452px');
    expect(properties.get(MOTION_PROPERTIES.chainTop)).toBe('-191px');
    expect(properties.get(MOTION_PROPERTIES.chainWidth)).toBe('1552px');
    expect(Number(properties.get(MOTION_PROPERTIES.chainScale))).toBeCloseTo(0.38257, 5);
    expect(properties.get(MOTION_PROPERTIES.copyWidth)).toMatch(/^1254\.\d+px$/);
  });
});
