import type { FormConnectionSummary } from '@connection-portal/api-types/form-connections';

import { EDITED_DATE_FORMAT, LIST_COPY } from './constants';
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

/**
 * The overview's hint: it points to the drafts while any stored draft is listed or a local
 * draft is offered (S3).
 */
export function hintOf(formConnections: FormConnectionSummary[], localDraftCount = 0): string {
  const hasDraft = formConnections.some((summary) => summary.status === 'draft');
  return hasDraft || localDraftCount > 0 ? LIST_COPY.hintWithDrafts : LIST_COPY.hint;
}

/** The line under a row's name: its description as written, or `null` when it is empty (FR-005). */
export function descriptionOf(summary: FormConnectionSummary): string | null {
  return summary.description === '' ? null : summary.description;
}
