import { useEffect, useReducer } from 'react';

import { ApiError } from '../api/client';
import { getFormConnection } from '../api/form-connections';
import type { FormConnection } from '../types/form-connections';
import type { FormConnectionState } from './types';
import { useSignOutOnUnauthorized } from './useSignOutOnUnauthorized';
import { formConnectionReducer, INITIAL_FORM_CONNECTION_STATE } from './utils';

/**
 * One form connection or draft from GET /api/form-connections/:id. A 404 means it doesn't exist or
 * was deleted; a 401 signs out. `replace` takes a newer version of a published connection, such
 * as an action's answer.
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
        dispatch(
          error instanceof ApiError && error.status === 404
            ? { type: 'notFound' }
            : { type: 'failed' }
        );
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
