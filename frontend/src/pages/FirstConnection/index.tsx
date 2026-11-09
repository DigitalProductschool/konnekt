import { useEffect, useState } from 'react';
import { Navigate } from 'react-router';

import { listFormConnections } from '../../api/form-connections';
import { ROUTES } from '../../constants';
import { useSignOutOnUnauthorized } from '../../hooks/useSignOutOnUnauthorized';
import FormConnectionEditorPage from '../FormConnectionEditor';
import LoadingConnections from './LoadingConnections';
import type { FirstConnectionState } from './types';

/**
 * The first-connection flow at /get-started, which the welcome page's "Create connection" opens
 * (FR-027). While no connection exists it is the create wizard at step 1 in the wizard's shell,
 * headed "Create your first connection", with its own local draft and the `?local=` key (W11),
 * and above step 1's card it offers the unsaved work on this device, except the flow's own (S5).
 * Otherwise the overview opens instead, and so it does when the check fails, because the
 * overview reports that with its error ID and "Try again". The check runs once: a connection
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
