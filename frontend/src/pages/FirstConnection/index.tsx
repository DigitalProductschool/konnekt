import { useEffect, useState } from 'react';
import { Navigate } from 'react-router';

import { listFormConnections } from '../../api/form-connections';
import { ROUTES } from '../../constants';
import { useSignOutOnUnauthorized } from '../../hooks/useSignOutOnUnauthorized';
import FormConnectionEditorPage from '../FormConnectionEditor';
import LoadingConnections from './LoadingConnections';
import type { FirstConnectionState } from './types';

/**
 * The first-connection screen at /get-started, where a sign-in without a requested route
 * lands. While no connection exists it is the create wizard, headed "Create your first
 * connection". Otherwise the overview opens instead, and so it does when the check fails,
 * because the overview reports that with "Try again". The check runs once: a connection
 * that a teammate saves meanwhile doesn't take the wizard away.
 */
export default function FirstConnectionPage() {
  const [state, setState] = useState<FirstConnectionState>('checking');
  const handleUnauthorized = useSignOutOnUnauthorized();

  useEffect(() => {
    let ignore = false;
    listFormConnections().then(
      (formConnections) => {
        if (!ignore) setState(formConnections.length === 0 ? 'wizard' : 'overview');
      },
      (error: unknown) => {
        if (!ignore && !handleUnauthorized(error)) setState('overview');
      }
    );
    return () => {
      ignore = true;
    };
  }, [handleUnauthorized]);

  if (state === 'checking') {
    return <LoadingConnections />;
  }
  if (state === 'wizard') {
    return <FormConnectionEditorPage firstConnection />;
  }
  return <Navigate to={ROUTES.overview} replace />;
}
