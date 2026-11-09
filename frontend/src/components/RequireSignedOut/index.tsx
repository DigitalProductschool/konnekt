import { Navigate, useLocation } from 'react-router';

import { useCurrentUser } from '../../hooks/useCurrentUser';
import PageLoader from '../PageLoader';
import type { RequireSignedOutProps } from './types';
import { redirectTarget } from './utils';

/**
 * Shows its children to signed-out users. Signed-in users go on to the route that sent
 * them to sign in, or without one to the homepage "/" (the welcome page or the overview,
 * FR-027; `redirectTarget`). This also moves the sign-in screen on after a successful sign-in.
 */
export default function RequireSignedOut({ children }: RequireSignedOutProps) {
  const { status } = useCurrentUser();
  const location = useLocation();

  if (status === 'loading') {
    return <PageLoader />;
  }
  if (status === 'signedIn') {
    return <Navigate to={redirectTarget(location.state)} replace />;
  }
  return children;
}
