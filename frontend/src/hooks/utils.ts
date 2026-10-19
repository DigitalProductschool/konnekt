import type {
  DocumentTypesAction,
  DocumentTypesState,
  FormConnectionAction,
  FormConnectionState,
} from './types';

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

export const INITIAL_FORM_CONNECTION_STATE: FormConnectionState = { status: 'loading', attempt: 0 };

export function formConnectionReducer(
  state: FormConnectionState,
  action: FormConnectionAction
): FormConnectionState {
  switch (action.type) {
    case 'loaded':
      return { status: 'loaded', attempt: state.attempt, formConnection: action.formConnection };
    case 'notFound':
      return { status: 'notFound', attempt: state.attempt };
    case 'failed':
      return { status: 'failed', attempt: state.attempt };
    case 'retry':
      return { status: 'loading', attempt: state.attempt + 1 };
  }
}
