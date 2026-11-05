import type { LoginLocationState } from '@connection-portal/api-types/routing';
import { Navigate, useLocation } from 'react-router';

import { ROUTES } from '../../constants';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import PageLoader from '../PageLoader';
import type { RequireSignInProps } from './types';

/** Shows its children to signed-in users and sends everyone else to sign in. */
export default function RequireSignIn({ children }: RequireSignInProps) {
  const { status } = useCurrentUser();
  const location = useLocation();

  if (status === 'loading') {
    return <PageLoader />;
  }
  if (status === 'signedOut') {
    const state: LoginLocationState = { from: location };
    return <Navigate to={ROUTES.login} replace state={state} />;
  }
  return children;
}
