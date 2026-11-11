import type { FormConnectionSummary } from '@connection-portal/api-types/form-connections';
import { formatDate } from '@connection-portal/rules/dates';
import type { Language } from '@connection-portal/rules/language';

import { ApiError, errorNoticeOf } from '../../api/client';
import { matchesSearch } from '../../components/ValuesPicker/utils';
import type { Homepage } from '../../hooks/types';
import { DELETE_CONNECTION_COPY, LIST_COPY, ROW_DATE_FORMAT, STEP_LABELS } from './constants';
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
 * A row's date by its state (FR-017, FR-019, FR-020; S4 "The row's date"; F23, F42): "Published
 * 28.10.2026" while live, "Active from 01.12.2026" while scheduled, "Deactivated 28.10.2026" while
 * deactivated, and a draft's "Edited 28.10.2026 · Rules step", or "Edited 28.10.2026" alone where
 * no step is recorded; in the given language ("Veröffentlicht 28.10.2026", "Bearbeitet 28.10.2026
 * · Schritt „Regeln“"), the date the same in both (spec 009, FR-012). The start date is a day in
 * Germany sent as YYYY-MM-DD and shown as written, never through `Date`, so that it reads the same
 * in every time zone. A state whose date is missing reads "Edited <date>", so that the row is
 * never empty (FR-021)
 */
export function rowMetaOf(source: RowMetaSource, language: Language): string {
  const copy = LIST_COPY[language];
  const edited = copy.edited(formatRowDate(source.updated_at));
  switch (source.state) {
    case 'live':
      return source.published_at ? copy.published(formatRowDate(source.published_at)) : edited;
    case 'scheduled':
      return source.start_date ? copy.activeFrom(formatDate(source.start_date, language)) : edited;
    case 'deactivated':
      return source.deactivated_at
        ? copy.deactivated(formatRowDate(source.deactivated_at))
        : edited;
    case 'draft':
      return source.step
        ? `${edited}${copy.metaSeparator}${copy.step(STEP_LABELS[language][source.step])}`
        : edited;
  }
}

/**
 * The row delete dialog's title and body (FR-029c, F55): the design's "Delete “<name>”?" for
 * every connection; the body by its state: a draft keeps its own, an active connection warns that
 * its links stop working, a deactivated one says its documents and rules go too; in the given
 * language
 */
export function deleteDialogCopyOf(
  summary: Pick<FormConnectionSummary, 'name' | 'status' | 'is_active'>,
  language: Language
): { title: string; text: string } {
  const copy = DELETE_CONNECTION_COPY[language];
  const title = copy.title(summary.name);
  if (summary.status === 'draft') {
    return { title, text: copy.draft(summary.name) };
  }
  return {
    title,
    text: summary.is_active ? copy.active : copy.deactivated,
  };
}

/**
 * Why a row delete failed (FR-008): the API's message with a 5xx answer's error ID, or "Nothing
 * changed. …" without an answer. A `404` (deleted meanwhile) or `409` (a draft published
 * meanwhile) means the list is out of date. A `401` signs out before this is asked. The fallback
 * is in the given language; the API's message comes in the request's
 */
export function rowDeleteFailureOf(error: unknown, language: Language): RowDeleteFailure {
  return {
    error: errorNoticeOf(error, DELETE_CONNECTION_COPY[language].errorText),
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
