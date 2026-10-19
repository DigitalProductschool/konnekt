import { NOT_FOUND_COPY } from '../../components/NotFound/constants';
import type { DetailLocationState } from '../../types/routing';
import { DETAIL_COPY } from './constants';
import type { DetailAction, DetailState } from './types';

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

export function isPublishedState(state: unknown): boolean {
  return Boolean((state as DetailLocationState | null)?.published);
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
