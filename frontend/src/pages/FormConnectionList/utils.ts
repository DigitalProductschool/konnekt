import type { FormConnectionSummary } from '@connection-portal/api-types/form-connections';

import { ApiError, errorNoticeOf } from '../../api/client';
import { matchesSearch } from '../../components/ValuesPicker/utils';
import type { Homepage } from '../../hooks/types';
import { DELETE_DIALOG_COPY, LIST_COPY, ROW_DATE_FORMAT, STEP_LABELS } from './constants';
import type {
  ListAction,
  ListState,
  RowDeleteAction,
  RowDeleteFailure,
  RowDeleteState,
  RowMetaSource,
} from './types';

export function listReducer(state: ListState, action: ListAction): ListState {
  switch (action.type) {
    case 'loaded':
      return { status: 'loaded', attempt: state.attempt, formConnections: action.formConnections };
    case 'failed':
      return { status: 'failed', attempt: state.attempt, notice: action.notice };
    case 'retry':
      return { status: 'loading', attempt: state.attempt + 1 };
    case 'removed':
      return state.status === 'loaded'
        ? {
            ...state,
            formConnections: state.formConnections.filter((each) => each.id !== action.id),
          }
        : state;
  }
}

/** "28.10.2026" for an ISO timestamp from the API (cosmetic 3, design-notes §3 "Dates"). */
export function formatRowDate(timestamp: string): string {
  return ROW_DATE_FORMAT.format(new Date(timestamp));
}

/**
 * A row's meta line (FR-048, FR-052d, F52, F71): "Edited 28.10.2026" for every connection, never
 * "Published …" or "Deactivated …"; a draft adds the step it was saved in, "Edited 28.10.2026 ·
 * Rules step", where that step is known
 */
export function rowMetaOf(source: RowMetaSource): string {
  const edited = LIST_COPY.edited(formatRowDate(source.updated_at));
  if (source.status !== 'draft' || !source.step) {
    return edited;
  }
  return `${edited}${LIST_COPY.metaSeparator}${LIST_COPY.step(STEP_LABELS[source.step])}`;
}

/**
 * The row delete dialog's title and body (FR-029c, F55): the design's "Delete “<name>”?" for
 * every connection; the body by its state: a draft keeps its own, an active connection warns that
 * its links stop working, a deactivated one says its documents and rules go too
 */
export function deleteDialogCopyOf(
  summary: Pick<FormConnectionSummary, 'name' | 'status' | 'is_active'>
): { title: string; text: string } {
  const title = DELETE_DIALOG_COPY.title(summary.name);
  if (summary.status === 'draft') {
    return { title, text: DELETE_DIALOG_COPY.draft(summary.name) };
  }
  return {
    title,
    text: summary.is_active ? DELETE_DIALOG_COPY.active : DELETE_DIALOG_COPY.deactivated,
  };
}

/**
 * Why a row delete failed (FR-008): the API's message with a 5xx answer's error ID, or "Nothing
 * changed. …" without an answer. A `404` (deleted meanwhile) or `409` (a draft published
 * meanwhile) means the list is out of date. A `401` signs out before this is asked
 */
export function rowDeleteFailureOf(error: unknown): RowDeleteFailure {
  return {
    error: errorNoticeOf(error, DELETE_DIALOG_COPY.errorText),
    stale: error instanceof ApiError && (error.status === 404 || error.status === 409),
  };
}

/** The row delete dialog's state (FR-028, FR-029c); nothing closes it while the delete runs */
export function rowDeleteReducer(state: RowDeleteState, action: RowDeleteAction): RowDeleteState {
  switch (action.type) {
    case 'open':
      return { target: action.target, open: true, deleting: false, error: null, stale: false };
    case 'close':
      return state.deleting ? state : { ...state, open: false, error: null, stale: false };
    case 'start':
      // A retry takes the old message away, so that a new failure is announced again
      return { ...state, deleting: true, error: null };
    case 'failed':
      return { ...state, deleting: false, error: action.error, stale: action.stale };
    case 'done':
      return { ...state, open: false, deleting: false, error: null, stale: false };
  }
}

/**
 * The rows the overview's search shows (FR-051 (27), research R8): those whose name or
 * description holds the query, ignoring letter case as the app's other searches do
 * (`matchesSearch`) and the spaces around the query. An empty query shows every row. The list
 * is filtered in the page; nothing is asked of the backend
 */
export function filterConnections<T extends Pick<FormConnectionSummary, 'name' | 'description'>>(
  list: readonly T[],
  query: string
): T[] {
  if (query.trim() === '') {
    return [...list];
  }
  return list.filter(
    (summary) => matchesSearch(summary.name, query) || matchesSearch(summary.description, query)
  );
}

/** The line under a row's name: its description as written, or `null` when it is empty (FR-005). */
export function descriptionOf(summary: FormConnectionSummary): string | null {
  return summary.description === '' ? null : summary.description;
}

/**
 * What the homepage "/" shows (research R6, FR-027): the welcome page while no connection or
 * draft exists, the overview once anything is listed (a draft counts). `list` is null until the
 * list has loaded; meanwhile the device's memory decides, so that a reload shows no flash of the
 * wrong page. Without a memory (`null`: first visit, blocked storage) it reads as the welcome
 * page; the page shows its loader in that case (T042)
 */
export function homepageOf(
  list: readonly FormConnectionSummary[] | null,
  remembered: boolean | null
): Homepage {
  if (list === null) {
    return remembered ? 'overview' : 'welcome';
  }
  return list.length === 0 ? 'welcome' : 'overview';
}
