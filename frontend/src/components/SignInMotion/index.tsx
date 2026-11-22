import { useMemo, useReducer, useRef, useState } from 'react';

import { useCurrentUser } from '../../hooks/useCurrentUser';
import { SignInMotionContext, useSignInMotionTimers } from '../../hooks/useSignInMotion';
import { INITIAL_SIGN_IN_MOTION } from './constants';
import type { SignInMotionProviderProps } from './types';
import { signInMotionReducer } from './utils';

/**
 * Holds the motion from a successful sign-in to its destination (bug login-welcome-motion; Figma
 * "New visuals" note 3, 7760:105890), above the routes. "Log in" arms it; the signed-in state
 * that follows is the success, read in the same render that changes it, so that the sign-in page
 * is kept over its destination from the first frame (`SignInExitLayer`) and never unmounted
 * first. A sign-out drops the kept page. The destination starts the motion (`useSignInSurface`,
 * `useSignInDestination`); timers end it (`useSignInMotionTimers`)
 */
export default function SignInMotionProvider({ children }: SignInMotionProviderProps) {
  const { status } = useCurrentUser();
  const [state, dispatch] = useReducer(signInMotionReducer, INITIAL_SIGN_IN_MOTION);
  const [seenStatus, setSeenStatus] = useState(status);
  if (status !== seenStatus) {
    setSeenStatus(status);
    if (status === 'signedIn') dispatch({ type: 'signedIn' });
    if (status === 'signedOut') dispatch({ type: 'signedOut' });
  }
  const chainRef = useRef<HTMLImageElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  useSignInMotionTimers(state, dispatch, layerRef);
  const value = useMemo(() => ({ state, dispatch, chainRef, layerRef }), [state]);
  return <SignInMotionContext.Provider value={value}>{children}</SignInMotionContext.Provider>;
}
