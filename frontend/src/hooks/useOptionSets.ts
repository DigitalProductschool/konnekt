import type { OptionSet } from '@konnekt/api-types/option-sets';
import { useEffect, useReducer } from 'react';

import { getOptionSets } from '../api/option-sets';
import type { CatalogByLanguage, OptionSetsState } from './types';
import { useLanguage } from './useLanguage';
import { useSignOutOnUnauthorized } from './useSignOutOnUnauthorized';
import {
  catalogViewOf,
  fetchLanguageOf,
  initialCatalogCacheState,
  optionSetsReducer,
  prefetchLanguageOf,
} from './utils';

/**
 * The value sets of enum fields and parts from GET /api/option-sets in the website's language,
 * loaded once per page and language, with a way to retry. Cached per language as
 * `useDocumentTypes()` caches the catalog (spec 009, research R6, V9): the other language's
 * value sets are fetched in the background and stay on screen until the current one's are there,
 * and `status` stays `'loaded'` once value sets have been on screen (`catalogViewOf()`).
 */
export function useOptionSets(): {
  status: OptionSetsState['status'];
  optionSets: OptionSet[];
  /**
   * The answers so far, per language, for a run that needs a given language's list and never the
   * other one's shown during a switch (the PDF's, spec 011)
   */
  byLanguage: CatalogByLanguage<OptionSet>;
  retry: () => void;
} {
  const { language } = useLanguage();
  const [state, dispatch] = useReducer(
    optionSetsReducer,
    language,
    initialCatalogCacheState<OptionSet>
  );
  const handleUnauthorized = useSignOutOnUnauthorized();
  const fetching = fetchLanguageOf(state);
  const prefetching = prefetchLanguageOf(state);

  useEffect(() => {
    dispatch({ type: 'language', language });
  }, [language]);

  useEffect(() => {
    if (fetching === null) return;
    let ignore = false;
    getOptionSets(fetching).then(
      (items) => {
        if (!ignore) dispatch({ type: 'loaded', language: fetching, items });
      },
      (error: unknown) => {
        if (!ignore && !handleUnauthorized(error)) dispatch({ type: 'failed', language: fetching });
      }
    );
    return () => {
      ignore = true;
    };
  }, [fetching, state.attempt, handleUnauthorized]);

  // The other language's value sets, once the current ones are there; a failure shows nothing
  useEffect(() => {
    if (prefetching === null) return;
    let ignore = false;
    getOptionSets(prefetching).then(
      (items) => {
        if (!ignore) dispatch({ type: 'loaded', language: prefetching, items });
      },
      () => {
        if (!ignore) dispatch({ type: 'failed', language: prefetching });
      }
    );
    return () => {
      ignore = true;
    };
  }, [prefetching]);

  const view = catalogViewOf(state);
  return {
    status: view.status,
    optionSets: view.items,
    byLanguage: state.loaded,
    retry: () => dispatch({ type: 'retry' }),
  };
}
