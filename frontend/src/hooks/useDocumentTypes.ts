import type { DocumentType } from '@connection-portal/api-types/document-types';
import { useEffect, useReducer } from 'react';

import { getDocumentTypes } from '../api/document-types';
import type { CatalogByLanguage, DocumentTypesState } from './types';
import { useLanguage } from './useLanguage';
import { useSignOutOnUnauthorized } from './useSignOutOnUnauthorized';
import {
  catalogViewOf,
  documentTypesReducer,
  fetchLanguageOf,
  initialCatalogCacheState,
  prefetchLanguageOf,
} from './utils';

/**
 * The document type catalog from GET /api/document-types in the website's language, with a way
 * to retry. Cached per language (spec 009, research R6, V9): the current language's catalog
 * first, then the other language's in the background, so that a switch shows its labels at once;
 * until they are there, the other language's catalog stays on screen. Once a catalog has been on
 * screen, `status` stays `'loaded'` (FR-003: a switch keeps every state of the screen), and a
 * failure of either fetch is silent and tried again on the next switch; before that, it is loading,
 * loaded or failed with `retry`, as before the feature (`catalogViewOf()`).
 */
export function useDocumentTypes(): {
  status: DocumentTypesState['status'];
  documentTypes: DocumentType[];
  /**
   * The answers so far, per language, for a run that needs a given language's list and never the
   * other one's shown during a switch (the PDF's, spec 011)
   */
  byLanguage: CatalogByLanguage<DocumentType>;
  retry: () => void;
} {
  const { language } = useLanguage();
  const [state, dispatch] = useReducer(
    documentTypesReducer,
    language,
    initialCatalogCacheState<DocumentType>
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
    getDocumentTypes(fetching).then(
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

  // The other language's catalog, once the current one is there; its failure shows nothing
  useEffect(() => {
    if (prefetching === null) return;
    let ignore = false;
    getDocumentTypes(prefetching).then(
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
    documentTypes: view.items,
    byLanguage: state.loaded,
    retry: () => dispatch({ type: 'retry' }),
  };
}
