import { errorNoticeOf } from '../../api/client';
import { NOT_FOUND_COPY } from '../../components/NotFound/constants';
import type { ErrorNotice } from '../../types/api';
import type { DetailLocationState } from '../../types/routing';
import { DETAIL_COPY } from './constants';
import type { DetailAction, DetailState, WebhookAction, WebhookState } from './types';

export function detailReducer(state: DetailState, action: DetailAction): DetailState {
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

export function webhookReducer(state: WebhookState, action: WebhookAction): WebhookState {
  switch (action.type) {
    case 'change':
      return { ...state, value: action.value, error: null };
    case 'save':
      return { ...state, saving: true, error: null, announcement: '' };
    case 'saved':
      return { value: action.value, saving: false, error: null, announcement: action.announcement };
    case 'failed':
      return { ...state, saving: false, error: action.error };
  }
}

export function isPublishedState(state: unknown): boolean {
  return Boolean((state as DetailLocationState | null)?.published);
}

/**
 * The API's message, such as "The webhook address must be an https:// URL.", with the error ID
 * of a 5xx answer.
 */
export function saveErrorNotice(error: unknown): ErrorNotice {
  return errorNoticeOf(error, DETAIL_COPY.saveFailed);
}

/** The tab title: the connection's name once it is loaded. */
export function documentTitleOf(state: DetailState): string {
  switch (state.status) {
    case 'loaded':
      return state.formConnection.name;
    case 'notFound':
      return NOT_FOUND_COPY.title;
    case 'failed':
      return DETAIL_COPY.errorTitle;
    case 'loading':
      return DETAIL_COPY.loading;
  }
}
