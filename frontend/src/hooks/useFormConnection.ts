import type { FormConnection } from '@connection-portal/api-types/form-connections';
import { useEffect, useReducer } from 'react';

import { ApiError, errorNoticeOf } from '../api/client';
import { getFormConnection } from '../api/form-connections';
import type { FormConnectionState } from './types';
import { useSignOutOnUnauthorized } from './useSignOutOnUnauthorized';
import { formConnectionReducer, INITIAL_FORM_CONNECTION_STATE } from './utils';

/**
 * One form connection or stored draft from GET /api/form-connections/:id, told apart by `status`:
 * the details and the edit route show a published connection as before and a draft as a draft
 * (its details, or the create flow at its step). A 404 means it doesn't exist or was deleted; a
 * 401 signs out; any other failure keeps the server's answer as a notice, with a 5xx answer's
 * error ID, for `FormConnectionLoadState` (W2). `retry` loads it again, such as after a draft turned out to be published.
 * `replace` takes a newer version of a published connection, such as an action's answer.
 */
export function useFormConnection(id: string): {
  state: FormConnectionState;
  retry: () => void;
  replace: (formConnection: FormConnection) => void;
} {
  const [state, dispatch] = useReducer(formConnectionReducer, INITIAL_FORM_CONNECTION_STATE);
  const handleUnauthorized = useSignOutOnUnauthorized();

  useEffect(() => {
    let ignore = false;
    getFormConnection(id).then(
      (formConnection) => {
        if (!ignore) dispatch({ type: 'loaded', formConnection });
      },
      (error: unknown) => {
        if (ignore || handleUnauthorized(error)) return;
        if (error instanceof ApiError && error.status === 404) {
          dispatch({ type: 'notFound' });
          return;
        }
        // The server's answer, with a 5xx answer's error ID (W2); without an answer (offline),
        // the alert's own sentence says it all
        dispatch({
          type: 'failed',
          notice: error instanceof ApiError ? errorNoticeOf(error, '') : null,
        });
      }
    );
    return () => {
      ignore = true;
    };
  }, [id, state.attempt, handleUnauthorized]);

  return {
    state,
    retry: () => dispatch({ type: 'retry' }),
    replace: (formConnection) => dispatch({ type: 'loaded', formConnection }),
  };
}
