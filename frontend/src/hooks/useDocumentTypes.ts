import type { DocumentType } from '@connection-portal/api-types/document-types';
import { useEffect, useReducer } from 'react';

import { getDocumentTypes } from '../api/document-types';
import type { DocumentTypesState } from './types';
import { useSignOutOnUnauthorized } from './useSignOutOnUnauthorized';
import { documentTypesReducer, INITIAL_DOCUMENT_TYPES_STATE } from './utils';

/** The document type catalog from GET /api/document-types, with a way to retry. */
export function useDocumentTypes(): {
  status: DocumentTypesState['status'];
  documentTypes: DocumentType[];
  retry: () => void;
} {
  const [state, dispatch] = useReducer(documentTypesReducer, INITIAL_DOCUMENT_TYPES_STATE);
  const handleUnauthorized = useSignOutOnUnauthorized();

  useEffect(() => {
    let ignore = false;
    getDocumentTypes().then(
      (documentTypes) => {
        if (!ignore) dispatch({ type: 'loaded', documentTypes });
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
    documentTypes: state.documentTypes,
    retry: () => dispatch({ type: 'retry' }),
  };
}
