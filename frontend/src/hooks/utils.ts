import type {
  DocumentTypesAction,
  DocumentTypesState,
  FormConnectionAction,
  FormConnectionState,
  OptionSetsAction,
  OptionSetsState,
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

export const INITIAL_OPTION_SETS_STATE: OptionSetsState = {
  status: 'loading',
  attempt: 0,
  optionSets: [],
};

export function optionSetsReducer(
  state: OptionSetsState,
  action: OptionSetsAction
): OptionSetsState {
  switch (action.type) {
    case 'loaded':
      return { status: 'loaded', attempt: state.attempt, optionSets: action.optionSets };
    case 'failed':
      return { status: 'failed', attempt: state.attempt, optionSets: [] };
    case 'retry':
      return { status: 'loading', attempt: state.attempt + 1, optionSets: [] };
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
