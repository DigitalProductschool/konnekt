import { useEffect, useReducer } from 'react';

import { getOptionSets } from '../api/option-sets';
import type { OptionSet } from '../types/option-sets';
import type { OptionSetsState } from './types';
import { useSignOutOnUnauthorized } from './useSignOutOnUnauthorized';
import { INITIAL_OPTION_SETS_STATE, optionSetsReducer } from './utils';

/**
 * The value sets of enum fields and parts from GET /api/option-sets, loaded once per page, with a
 * way to retry.
 */
export function useOptionSets(): {
  status: OptionSetsState['status'];
  optionSets: OptionSet[];
  retry: () => void;
} {
  const [state, dispatch] = useReducer(optionSetsReducer, INITIAL_OPTION_SETS_STATE);
  const handleUnauthorized = useSignOutOnUnauthorized();

  useEffect(() => {
    let ignore = false;
    getOptionSets().then(
      (optionSets) => {
        if (!ignore) dispatch({ type: 'loaded', optionSets });
      },
      (error: unknown) => {
        if (!ignore && !handleUnauthorized(error)) dispatch({ type: 'failed' });
      }
    );
    return () => {
      ignore = true;
    };
  }, [state.attempt, handleUnauthorized]);

  return {
    status: state.status,
    optionSets: state.optionSets,
    retry: () => dispatch({ type: 'retry' }),
  };
}
