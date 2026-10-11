import type { DocumentTypesAction, DocumentTypesState } from './types';

export const INITIAL_DOCUMENT_TYPES_STATE: DocumentTypesState = {
  status: 'loading',
  attempt: 0,
  documentTypes: [],
};

export function documentTypesReducer(
  state: DocumentTypesState,
  action: DocumentTypesAction
): DocumentTypesState {
  switch (action.type) {
    case 'loaded':
      return { status: 'loaded', attempt: state.attempt, documentTypes: action.documentTypes };
    case 'failed':
      return { status: 'failed', attempt: state.attempt, documentTypes: [] };
    case 'retry':
      return { status: 'loading', attempt: state.attempt + 1, documentTypes: [] };
  }
}
