import { EDITED_DATE_FORMAT } from './constants';
import type { ListAction, ListState } from './types';

export function listReducer(state: ListState, action: ListAction): ListState {
  switch (action.type) {
    case 'loaded':
      return { status: 'loaded', attempt: state.attempt, formConnections: action.formConnections };
    case 'failed':
      return { status: 'failed', attempt: state.attempt };
    case 'retry':
      return { status: 'loading', attempt: state.attempt + 1 };
  }
}

/** "5 Oct 2026" for an ISO timestamp from the API. */
export function formatEditedDate(timestamp: string): string {
  return EDITED_DATE_FORMAT.format(new Date(timestamp));
}
