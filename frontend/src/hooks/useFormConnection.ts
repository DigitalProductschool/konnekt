import type { FormConnection } from '@connection-portal/api-types/form-connections';
import type { Language } from '@connection-portal/rules/language';
import { useEffect, useReducer, useRef } from 'react';

import { ApiError, errorNoticeOf } from '../api/client';
import { getFormConnection } from '../api/form-connections';
import type { FormConnectionState } from './types';
import { useLanguage } from './useLanguage';
import { useSignOutOnUnauthorized } from './useSignOutOnUnauthorized';
import { formConnectionReducer, INITIAL_FORM_CONNECTION_STATE } from './utils';

/**
 * One form connection or stored draft from GET /api/form-connections/:id, told apart by `status`:
 * the details and the edit route show a published connection as before and a draft as a draft
 * (its details, or the create flow at its step). A 404 means it doesn't exist or was deleted; a
 * 401 signs out; any other failure keeps the server's answer as a notice, with a 5xx answer's
 * error ID, for `FormConnectionLoadState` (W2). `retry` loads it again, such as after a draft turned out to be published.
 * `replace` takes a newer version of a published connection, such as an action's answer.
 *
 * A switch of the website's language loads it again, for the labels the server words in the
 * request's language (spec 009, research R6): the loaded connection stays on screen meanwhile, a
 * stale answer is ignored (also one that arrives after a `replace`, which is newer), and a failure
 * of that refetch keeps it.
 */
export function useFormConnection(id: string): {
  state: FormConnectionState;
  retry: () => void;
  replace: (formConnection: FormConnection) => void;
} {
  const [state, dispatch] = useReducer(formConnectionReducer, INITIAL_FORM_CONNECTION_STATE);
  const handleUnauthorized = useSignOutOnUnauthorized();
  const { language } = useLanguage();
  // What the last load was for: a load for another language alone is a refetch (spec 009)
  const lastLoad = useRef<{ id: string; attempt: number; language: Language } | null>(null);
  // Counts the `replace`s: a refetch's answer that arrives after one would bring back older data
  const replaced = useRef(0);

  useEffect(() => {
    let ignore = false;
    const previous = lastLoad.current;
    const refresh =
      previous !== null &&
      previous.id === id &&
      previous.attempt === state.attempt &&
      previous.language !== language;
    lastLoad.current = { id, attempt: state.attempt, language };
    const replacedBefore = replaced.current;
    getFormConnection(id).then(
      (formConnection) => {
        if (!ignore && !(refresh && replaced.current !== replacedBefore)) {
          dispatch({ type: 'loaded', formConnection });
        }
      },
      (error: unknown) => {
        if (ignore || handleUnauthorized(error)) return;
        if (error instanceof ApiError && error.status === 404) {
          dispatch({ type: 'notFound', refresh });
          return;
        }
        // The server's answer, with a 5xx answer's error ID (W2); without an answer (offline),
        // the alert's own sentence says it all
        dispatch({
          type: 'failed',
          notice: error instanceof ApiError ? errorNoticeOf(error, '') : null,
          refresh,
        });
      }
    );
    return () => {
      ignore = true;
    };
  }, [id, state.attempt, language, handleUnauthorized]);

  return {
    state,
    retry: () => dispatch({ type: 'retry' }),
    replace: (formConnection) => {
      replaced.current += 1;
      dispatch({ type: 'loaded', formConnection });
    },
  };
}
