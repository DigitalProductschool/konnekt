import { Navigate, useLocation } from 'react-router';

import { useCurrentUser } from '../../hooks/useCurrentUser';
import { useSignInExit } from '../../hooks/useSignInMotion';
import PageLoader from '../PageLoader';
import type { RequireSignedOutProps } from './types';
import { redirectTarget } from './utils';

/**
 * Shows its children to signed-out users. Signed-in users go on to the route that sent
 * them to sign in, or without one to the homepage "/" (the welcome page or the overview,
 * FR-027; `redirectTarget`). This also moves the sign-in screen on after a successful sign-in:
 * then the screen stays while it leaves (bug login-welcome-motion), so the guard navigates once
 * and keeps its children, which the exit layer holds over the destination. The children keep
 * their place in both cases, so the leaving page is the same page, never a new one.
 */
export default function RequireSignedOut({ children }: RequireSignedOutProps) {
  const { status } = useCurrentUser();
  const exit = useSignInExit();
  const location = useLocation();

  if (status === 'loading') {
    return <PageLoader />;
  }
  const signedIn = status === 'signedIn';
  if (signedIn && exit === null) {
    return <Navigate to={redirectTarget(location.state)} replace />;
  }
  return (
    <>
      {children}
      {signedIn && <Navigate to={redirectTarget(location.state)} replace />}
    </>
  );
}
