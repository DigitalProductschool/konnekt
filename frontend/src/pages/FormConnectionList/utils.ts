import type { ErrorNotice } from '@connection-portal/api-types/api';
import type {
  DeletionItem,
  FormConnectionSummary,
  SelectionChanged,
} from '@connection-portal/api-types/form-connections';
import type { OverviewDeletion } from '@connection-portal/api-types/routing';
import { formatDate } from '@connection-portal/rules/dates';
import type { Language } from '@connection-portal/rules/language';

import { ApiError, errorNoticeOf } from '../../api/client';
import type { TooltipPlacement } from '../../components/InfoTooltip/types';
import { bubblePlacementClass } from '../../components/InfoTooltip/utils';
import type { ToastContent } from '../../components/Toast/types';
import { matchesSearch } from '../../components/ValuesPicker/utils';
import type { Homepage } from '../../hooks/types';
import {
  BULK_DELETE_COPY,
  DELETE_CONNECTION_COPY,
  EXAMPLE_DIALOG_COPY,
  INITIAL_DELETION_STATE,
  LIST_COPY,
  ROW_BUBBLE_CLASSES,
  ROW_DATE_FORMAT,
  STEP_LABELS,
} from './constants';
import type {
  BulkDeleteAction,
  BulkDeleteFailure,
  BulkDeleteNotice,
  BulkDeleteState,
  DeletionAction,
  DeletionState,
  ExampleDialogAction,
  ExampleDialogState,
  ListAction,
  ListState,
  RestoreFailure,
  RowDeleteAction,
  RowDeleteFailure,
  RowDeleteState,
  RowMetaSource,
  SelectAllState,
  Selection,
  SelectionAction,
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
    case 'restored':
      // Before the list is there (or after it failed) the load may have missed the rows: load
      // it again
      return state.status === 'loaded'
        ? { ...state, formConnections: withRestored(state.formConnections, action.items) }
        : { status: 'loading', attempt: state.attempt + 1 };
  }
}

/**
 * The overview's order (`list_form_connections()`): the most recently updated first, then by id
 */
function inOverviewOrder(a: FormConnectionSummary, b: FormConnectionSummary): number {
  const byUpdate = Date.parse(b.updated_at) - Date.parse(a.updated_at);
  if (byUpdate !== 0) {
    return byUpdate;
  }
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * The list with the restored rows back in it (spec 010, FR-034): a restored row keeps its
 * `updated_at` from before the deletion, so the overview's order puts it back in its place; a row
 * the list still holds is replaced, never doubled
 */
export function withRestored(
  list: readonly FormConnectionSummary[],
  items: readonly FormConnectionSummary[]
): FormConnectionSummary[] {
  const restoredIds = new Set(items.map((item) => item.id));
  return [...list.filter((each) => !restoredIds.has(each.id)), ...items].sort(inOverviewOrder);
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
 * The row delete dialog's title and body (FR-029c, F55), also the details' (S17): the design's
 * "Delete “<name>”?" for every connection; the body by its state: a draft keeps its own, a
 * scheduled connection says it won't become active, with its start date (spec 010, FR-010; U14
 * 6872:45929), an active connection warns that its links stop working, a deactivated one says its
 * documents and rules go too (F35); in the given language
 */
export function deleteDialogCopyOf(
  summary: Pick<FormConnectionSummary, 'name' | 'status' | 'is_active' | 'state' | 'start_date'>,
  language: Language
): { title: string; text: string } {
  const copy = DELETE_CONNECTION_COPY[language];
  const title = copy.title(summary.name);
  if (summary.status === 'draft') {
    return { title, text: copy.draft(summary.name) };
  }
  if (summary.state === 'scheduled' && summary.start_date) {
    return { title, text: copy.scheduled(formatDate(summary.start_date, language)) };
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
 * The position classes of a row's description bubble: in the top layer, anchored to the
 * description, by its side alone (ROW_BUBBLE_CLASSES; the browser picks below or above, and
 * shows it while it is open as a popover); otherwise, where the browser lacks anchor positioning,
 * inside the row, as an ⓘ's bubble beside a button, by the side and the direction, and shown
 * while `open`
 */
export function rowBubbleClass(
  placement: TooltipPlacement,
  open: boolean,
  topLayer: boolean
): string {
  if (topLayer) {
    return ROW_BUBBLE_CLASSES[placement.side];
  }
  return `absolute z-40 ${bubblePlacementClass('button', placement)} ${open ? 'flex' : 'hidden'}`;
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

/**
 * The overview's last deletion and its toast (spec 010, FR-033 to FR-037; S4 "After a deletion",
 * "Undo"). A new deletion replaces the toast shown, and its "Undo" goes with it. "Undo" waits for
 * the server; a second one meanwhile does nothing. The answer shows its own toast, announced anew:
 * restored, no longer restorable, or failed with "Undo" again. An answer for a deletion that is no
 * longer the last one changes nothing here (the page still puts restored rows back). A toast that
 * closed takes "Undo" with it and leaves the deletion standing; a restore already sent still shows
 * its answer
 */
export function deletionReducer(state: DeletionState, action: DeletionAction): DeletionState {
  const { current } = state;
  switch (action.type) {
    case 'deleted':
      return {
        toastId: state.toastId + 1,
        current: {
          id: action.deletionId,
          names: action.names,
          outcome: 'deleted',
          restoring: false,
          shown: true,
          errorId: null,
        },
      };
    case 'restoring':
      return current && canRestore(state) && current.id === action.deletionId
        ? { ...state, current: { ...current, restoring: true } }
        : state;
    case 'restored':
    case 'notRestorable':
    case 'failed':
      if (!current?.restoring || current.id !== action.deletionId) {
        return state;
      }
      return {
        toastId: state.toastId + 1,
        current: {
          ...current,
          outcome: action.type,
          restoring: false,
          shown: true,
          errorId: action.type === 'failed' ? action.errorId : null,
        },
      };
    case 'dismissed':
      return current?.shown ? { ...state, current: { ...current, shown: false } } : state;
  }
}

/**
 * Whether the toast's "Undo" may send the restore now: its toast shows, offers "Undo" (deleted,
 * or a failed restore) and no restore waits for an answer
 */
export function canRestore(state: DeletionState): boolean {
  const { current } = state;
  return (
    current !== null &&
    current.id !== null &&
    current.shown &&
    !current.restoring &&
    (current.outcome === 'deleted' || current.outcome === 'failed')
  );
}

/**
 * The deletion state a page starts with: the deletion the details made on the way here, if any
 * (FR-033: it arrives with the same toast and "Undo")
 */
export function initialDeletionOf(deleted: OverviewDeletion | undefined): DeletionState {
  return deleted
    ? deletionReducer(INITIAL_DELETION_STATE, {
        type: 'deleted',
        deletionId: deleted.deletionId,
        names: deleted.names,
      })
    : INITIAL_DELETION_STATE;
}

/**
 * The toast of the last deletion, in the given language (spec 010, S4; copy.md §4; design-notes
 * §4.2 T038): "“<name>” deleted." red with "Undo" (none without a deletion id), "“<name>”
 * restored." green, "“<name>” can no longer be restored." and "Couldn’t restore. Try again." (with
 * "Undo" again and a 5xx's error ID) in ink; null while none shows. While "Undo" waits the toast
 * stays as it was. A bulk deletion's say "<n> connections deleted.", "<n> connections restored."
 * and "The connections can no longer be restored." (FR-044)
 */
export function deletionToastOf(state: DeletionState, language: Language): ToastContent | null {
  const { current } = state;
  if (!current?.shown) {
    return null;
  }
  const copy = LIST_COPY[language];
  const name = current.names[0] ?? '';
  // A bulk deletion's toasts count the connections (FR-044); one connection's name it
  const count = current.names.length;
  const many = count > 1;
  const undo = current.id === null ? undefined : copy.undo;
  switch (current.outcome) {
    case 'deleted':
      return {
        id: state.toastId,
        kind: 'danger',
        message: many ? copy.deletedMany(count) : copy.deleted(name),
        actionLabel: undo,
      };
    case 'restored':
      return {
        id: state.toastId,
        kind: 'success',
        message: many ? copy.restoredMany(count) : copy.restored(name),
      };
    case 'notRestorable':
      return {
        id: state.toastId,
        kind: 'neutral',
        message: many ? copy.notRestorableMany : copy.notRestorable(name),
      };
    case 'failed':
      return {
        id: state.toastId,
        kind: 'neutral',
        message: copy.restoreFailed,
        actionLabel: undo,
        errorId: current.errorId,
      };
  }
}

/**
 * How a failed restore ends (spec 010, FR-036; management-api "Deleting"): `409 not_restorable`
 * (too late, a second "Undo", another account's) changes nothing for good; no answer, a server
 * failure or any other refusal offers "Undo" again, with a 5xx's error ID. A `401` signs out
 * before this is asked
 */
export function restoreFailureOf(error: unknown): RestoreFailure {
  if (error instanceof ApiError && error.status === 409 && error.data.error === 'not_restorable') {
    return { type: 'notRestorable' };
  }
  return {
    type: 'failed',
    errorId: error instanceof ApiError ? (error.data.error_id ?? null) : null,
  };
}

/**
 * The overview's selection (spec 010, S4 "Selection"; FR-038 to FR-040, R10): a row's checkbox
 * selects or deselects it; the select-all selects every listed row (the rows the search shows,
 * EC-11) and clears the selection when all of them are selected already; "Cancel" and a
 * deletion clear it; a row that left the list leaves it (`prune`, EC-12). The selection only
 * ever holds listed rows. An action that changes nothing returns the same state, so that pruning
 * after every change of the list re-renders nothing. Nothing is stored (FR-040)
 */
export function selectionReducer(state: Selection, action: SelectionAction): Selection {
  switch (action.type) {
    case 'toggle': {
      const next = new Set(state);
      if (!next.delete(action.id)) {
        next.add(action.id);
      }
      return next;
    }
    case 'toggleAll':
      if (selectAllStateOf(state, action.listedIds) === 'all') {
        return new Set();
      }
      return new Set(action.listedIds);
    case 'clear':
      return state.size === 0 ? state : new Set();
    case 'prune': {
      const listed = new Set(action.listedIds);
      const kept = [...state].filter((id) => listed.has(id));
      return kept.length === state.size ? state : new Set(kept);
    }
  }
}

/**
 * What the select-all shows for the listed rows (FR-040): `none` while none of them is selected
 * (and while nothing is listed), `all` while every one is, `some` (its mixed state) otherwise
 */
export function selectAllStateOf(
  selected: Selection,
  listedIds: readonly string[]
): SelectAllState {
  const count = listedIds.filter((id) => selected.has(id)).length;
  if (count === 0) {
    return 'none';
  }
  return count === listedIds.length ? 'all' : 'some';
}

/**
 * The bulk delete dialog's state (spec 010, S4 "Delete"; FR-041 to FR-043): it opens with the
 * selected rows in the list's order and keeps them while it closes; nothing closes it while the
 * deletion runs (FR-042); a retry takes the last failure away, so that a new one is announced
 * again; a failure keeps it open (FR-043), and `selection_changed` marks it stale (no retry)
 */
export function bulkDeleteReducer(
  state: BulkDeleteState,
  action: BulkDeleteAction
): BulkDeleteState {
  switch (action.type) {
    case 'open':
      return {
        rows: action.rows,
        open: true,
        deleting: false,
        error: null,
        changedName: null,
        stale: false,
      };
    case 'close':
      return state.deleting
        ? state
        : { ...state, open: false, error: null, changedName: null, stale: false };
    case 'start':
      return { ...state, deleting: true, error: null, changedName: null, stale: false };
    case 'failed':
      return {
        ...state,
        deleting: false,
        error: action.failure.error,
        changedName: action.failure.changedName,
        stale: action.failure.stale,
      };
    case 'done':
      return {
        ...state,
        open: false,
        deleting: false,
        error: null,
        changedName: null,
        stale: false,
      };
  }
}

/**
 * What the bulk delete dialog shows of its last failure (FR-043; design-notes §4.2 T084 (3)):
 * after `selection_changed` the sentence "Nothing was deleted: “<name>” was deleted or changed in
 * the meantime." in the given language (the server's sentence where the changed connection isn't
 * among the dialog's), without "Try again", since the selection is out of date; another failure
 * shows its notice (a 5xx's error ID, "Nothing changed. …" without an answer) with "Try again"
 * (spec 008); no failure, no notice
 */
export function bulkDeleteNoticeOf(
  state: Pick<BulkDeleteState, 'error' | 'changedName' | 'stale'>,
  language: Language
): BulkDeleteNotice {
  if (state.stale) {
    const error = state.changedName
      ? { message: BULK_DELETE_COPY[language].changed(state.changedName) }
      : state.error;
    return { error, retry: false };
  }
  return { error: state.error, retry: state.error !== null };
}

/**
 * What the bulk deletion sends (management-api "Deleting"): each row's id and the state the
 * dialog showed, so that the server deletes nothing when one of them changed meanwhile (FR-043)
 */
export function deletionItemsOf(
  rows: readonly Pick<FormConnectionSummary, 'id' | 'state'>[]
): DeletionItem[] {
  return rows.map(({ id, state }) => ({ id, state }));
}

/**
 * The bulk delete dialog's warning lines (FR-041; U15 6699:45320; copy.md §4), in the list's
 * order: one per active connection ("<name> is active. Citizens won’t be able to use it.") and
 * per scheduled one ("<name> is scheduled for <date>. It won’t become active."), none for a draft
 * or a deactivated connection; in the given language
 */
export function bulkWarningsOf(
  rows: readonly Pick<FormConnectionSummary, 'id' | 'name' | 'state' | 'start_date'>[],
  language: Language
): { id: string; text: string }[] {
  const copy = BULK_DELETE_COPY[language];
  return rows.flatMap((row) => {
    if (row.state === 'live') {
      return [{ id: row.id, text: copy.active(row.name) }];
    }
    if (row.state === 'scheduled' && row.start_date) {
      return [{ id: row.id, text: copy.scheduled(row.name, formatDate(row.start_date, language)) }];
    }
    return [];
  });
}

/**
 * Why a bulk deletion failed (FR-043): `409 selection_changed` names the first changed connection
 * the dialog holds (its `changed_ids` come in the request's order) and means that the list is out
 * of date; a changed id the dialog doesn't hold falls back to the server's sentence. Any other
 * failure shows as spec 008's do: the API's message with a 5xx's error ID, or "Nothing changed.
 * …" without an answer (W8); a selection of more than 500 rows gets the server's generic `400`
 * this way. A `401` signs out before this is asked
 */
export function bulkDeleteFailureOf(
  error: unknown,
  rows: readonly Pick<FormConnectionSummary, 'id' | 'name'>[],
  language: Language
): BulkDeleteFailure {
  const notice = errorNoticeOf(error, BULK_DELETE_COPY[language].errorText);
  if (
    error instanceof ApiError &&
    error.status === 409 &&
    error.data.error === 'selection_changed'
  ) {
    const changedIds = (error.data as SelectionChanged).changed_ids ?? [];
    const changed = changedIds
      .map((id) => rows.find((row) => row.id === id))
      .find((row) => row !== undefined);
    return { error: notice, changedName: changed?.name ?? null, stale: true };
  }
  return { error: notice, changedName: null, stale: false };
}

/**
 * The example dialog's state (spec 010, S3; FR-054, FR-055): "Start from an example" opens it
 * afresh; "Go back", the ×, Escape and the scrim close it, except while the example is being
 * created; a retry takes the last failure away, so that a new one is announced again; a failure
 * keeps it open; once the example is created it closes (the page then opens the draft)
 */
export function exampleDialogReducer(
  state: ExampleDialogState,
  action: ExampleDialogAction
): ExampleDialogState {
  switch (action.type) {
    case 'open':
      return state.creating ? state : { open: true, creating: false, error: null };
    case 'close':
      return state.creating ? state : { ...state, open: false, error: null };
    case 'start':
      return state.creating ? state : { ...state, creating: true, error: null };
    case 'failed':
      return { ...state, creating: false, error: action.error };
    case 'done':
      return { open: false, creating: false, error: null };
  }
}

/**
 * Why creating the example failed (S3, as spec 008's dialog failures): the API's message with a
 * 5xx answer's error ID, or "Check your connection and try again." without an answer, in the
 * given language. A `401` signs out before this is asked
 */
export function exampleFailureOf(error: unknown, language: Language): ErrorNotice {
  return errorNoticeOf(error, EXAMPLE_DIALOG_COPY[language].errorText);
}
