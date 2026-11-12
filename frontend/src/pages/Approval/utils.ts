import type {
  ApprovalAction,
  ApprovalPreview,
  ApprovalRequest,
} from '@connection-portal/api-types/approvals';
import type { DocumentType } from '@connection-portal/api-types/document-types';
import type {
  ConnectionUrls,
  FormConnection,
  FormConnectionDraft,
  RequestedDocument,
  RequestedDocumentView,
} from '@connection-portal/api-types/form-connections';
import { formatDate } from '@connection-portal/rules/dates';
import { DEFAULT_LANGUAGE, type Language } from '@connection-portal/rules/language';

import { ApiError, errorNoticeOf } from '../../api/client';
import { CONNECTION_DETAIL_COPY, SAVED_TIME_FORMATS } from '../FormConnectionDetail/constants';
import { PUBLISH_DIALOG_COPY } from '../FormConnectionEditor/constants';
import type { RulesBranch } from '../FormConnectionEditor/RulesStep/types';
import { DELETE_CONNECTION_COPY } from '../FormConnectionList/constants';
import { formatRowDate } from '../FormConnectionList/utils';
import {
  APPROVAL_COPY,
  CANCELLED_TEXTS,
  DONE_TEXTS,
  DONE_WITH_URLS,
  FINAL_STATUSES,
  TITLES,
} from './constants';
import type {
  ApprovalCall,
  ApprovalPageAction,
  ApprovalPageState,
  BodyLine,
  CallFailure,
  FinalOutcome,
  FinalStatus,
  LoadedApprovalState,
  OutcomeView,
  StatusAction,
  UrlsLinks,
} from './types';

/**
 * The page's heading by action (S3 "Title"): "Publish ‘Parking permit’?", or, once a deleted
 * draft's row is gone and `name` is '', "Delete the draft?"; in `language` (spec 009)
 */
export function titleOf(action: ApprovalAction, name: string, language: Language): string {
  const title = TITLES[language][action];
  return name.trim() ? title.named(name) : title.unnamed;
}

/**
 * A time of day as the project writes it, 24-hour, in the browser's time zone: "14:32", the same
 * in both languages (spec 009, R5)
 */
export function timeOf(timestamp: string, language: Language): string {
  return SAVED_TIME_FORMATS[language].format(new Date(timestamp));
}

/** "Requested by Claude Code · expires at 14:32"; the agent's name as it registered (FR-007) */
export function subtitleOf(request: ApprovalRequest, language: Language): string {
  return APPROVAL_COPY[language].subtitle(
    request.requested_by,
    timeOf(request.expires_at, language)
  );
}

/**
 * "Last saved 04.11.2026, 14:32": the draft's last save, as the draft details' date pill writes
 * it (cosmetic 3, design-notes §3 "Dates")
 */
export function lastSavedLineOf(updatedAt: string, language: Language): string {
  return APPROVAL_COPY[language].lastSaved(
    `${formatRowDate(updatedAt)}, ${timeOf(updatedAt, language)}`
  );
}

/**
 * Whether the action acts on a published connection: `deactivate`, `reactivate`, `delete` or
 * `set_start_date` (spec 010)
 */
export function isStatusAction(action: ApprovalAction): action is StatusAction {
  return action !== 'publish' && action !== 'delete_draft';
}

/**
 * The start as part of what will happen (spec 010, copy.md §7; FR-065): "Active from 01.12.2026"
 * for the date the agent asked for (YYYY-MM-DD), or "The connection goes live at once." without
 * one; for `publish`, `reactivate` and `set_start_date`
 */
export function startLineOf(startDate: string | null, language: Language): string {
  const copy = APPROVAL_COPY[language];
  return startDate ? copy.activeFrom(formatDate(startDate, language)) : copy.goesLiveAtOnce;
}

/**
 * What will happen, under the URLs of a status action (S3 "Body"; spec 010, FR-065, FR-066,
 * FR-067), from the connection's state now and the date the agent asked for:
 *
 * - `deactivate`: "Requests in progress are cancelled."; for a scheduled connection, the
 *   deactivate dialog's sentence of copy.md §2 in its place (FR-012), with its start date;
 * - `reactivate`: the start (`startLineOf()`);
 * - `delete`: "Requests in progress are cancelled.", or for a scheduled connection the delete
 *   dialog's sentence of FR-010, then "Deleting can’t be undone." (strong; approving offers no
 *   "Undo");
 * - `set_start_date`: "Active from <date>", and for an active connection "Until then its links
 *   stop working, and requests in progress are cancelled."; to now "The connection goes live at
 *   once."
 */
export function statusLinesOf(
  action: StatusAction,
  connection: Pick<FormConnection, 'state' | 'start_date'>,
  startDate: string | null,
  language: Language
): BodyLine[] {
  const copy = APPROVAL_COPY[language];
  const line = (key: string, text: string, strong = false): BodyLine => ({ key, text, strong });
  const scheduledStart =
    connection.state === 'scheduled' && connection.start_date
      ? formatDate(connection.start_date, language)
      : null;
  switch (action) {
    case 'deactivate':
      return [
        scheduledStart
          ? line(
              'scheduled',
              CONNECTION_DETAIL_COPY[language].deactivateScheduledText(scheduledStart)
            )
          : line('requests', copy.requestsCancelled),
      ];
    case 'reactivate':
      return [line('start', startLineOf(startDate, language))];
    case 'delete':
      return [
        scheduledStart
          ? line('scheduled', DELETE_CONNECTION_COPY[language].scheduled(scheduledStart))
          : line('requests', copy.requestsCancelled),
        line('final', copy.cantBeUndone, true),
      ];
    case 'set_start_date':
      return startDate && connection.state === 'live'
        ? [line('start', startLineOf(startDate, language)), line('untilThen', copy.untilThen)]
        : [line('start', startLineOf(startDate, language))];
  }
}

/**
 * The example's line on a request to publish it (spec 010, FR-060): the publish dialog's "This is
 * still the example. Check that the name, documents and rules fit your service." while the stored
 * draft is the unchanged example, or null
 */
export function exampleLineOf(
  draft: Pick<FormConnectionDraft, 'example'>,
  language: Language
): string | null {
  return draft.example === 'unchanged' ? PUBLISH_DIALOG_COPY[language].exampleLine : null;
}

/**
 * Whether a done request shows the connection URLs and "Open the connection" (S3 `done`): after
 * publishing and reactivating only. The API also sends the URLs after a done deactivate, so the
 * action decides, not whether they are there
 */
export function doneShowsUrls(action: ApprovalAction): boolean {
  return DONE_WITH_URLS.includes(action);
}

/**
 * `connection_changed`'s sentence, from the connection's state now and the action, as the
 * server's `approvals._connection_change()` words it (spec 010, FR-066; design-notes §4.2
 * T078/T079 (4)): scheduled, its start date changed; deactivated, it was deactivated; live, it
 * was reactivated for `reactivate`, and became active for every other action. The request doesn't
 * say what the connection was
 */
export function connectionChangedTextOf(
  state: FormConnection['state'],
  action: ApprovalAction,
  language: Language
): string {
  const copy = APPROVAL_COPY[language];
  switch (state) {
    case 'scheduled':
      return copy.connectionStartDateChanged;
    case 'deactivated':
      return copy.connectionDeactivated;
    case 'live':
      return action === 'reactivate' ? copy.connectionReactivated : copy.connectionBecameActive;
  }
}

/**
 * A cancellation's sentence by its reason (`start_date_passed` included, spec 010).
 * `connection_changed` says how the connection changed (`connectionChangedTextOf()`); without the
 * connection, the general sentence
 */
export function cancelledTextOf(
  request: Pick<ApprovalRequest, 'cancel_reason' | 'action'>,
  connection: FormConnection | null,
  language: Language
): string {
  const copy = APPROVAL_COPY[language];
  const reason = request.cancel_reason;
  if (reason === 'connection_changed') {
    return connection
      ? connectionChangedTextOf(connection.state, request.action, language)
      : copy.cancelled;
  }
  return CANCELLED_TEXTS[language][reason ?? ''] ?? copy.cancelled;
}

/**
 * A done request's sentence (S3 "Outcome states"), as the server's `409 approval_done` words it: a
 * `publish` or `reactivate` with a start date "Published and scheduled for 01.12.2026." or
 * "Connection scheduled for 01.12.2026." with the date asked for (spec 010, copy.md §7); otherwise
 * the action's (`DONE_TEXTS`)
 */
export function doneTextOf(
  request: Pick<ApprovalRequest, 'action' | 'start_date'>,
  language: Language
): string {
  const copy = APPROVAL_COPY[language];
  const { action, start_date: startDate } = request;
  if (startDate && action === 'publish') {
    return copy.publishedScheduled(formatDate(startDate, language));
  }
  if (startDate && action === 'reactivate') {
    return copy.reactivatedScheduled(formatDate(startDate, language));
  }
  return DONE_TEXTS[language][action];
}

/**
 * The sentence of a request that isn't waiting (S3 "Outcome states"), the same as the server's
 * `409 approval_<status>` message; null while it waits, failed or not. A cancellation for
 * `connection_changed` takes its sentence from the connection the preview holds. The preview carries
 * codes, not sentences, so the page words it in `language` (spec 009)
 */
export function outcomeTextOf(
  request: ApprovalRequest,
  connection: FormConnection | null,
  language: Language
): string | null {
  const copy = APPROVAL_COPY[language];
  switch (request.status) {
    case 'waiting':
      return null;
    case 'done':
      return doneTextOf(request, language);
    case 'declined':
      return copy.declined;
    case 'expired':
      return copy.expired(timeOf(request.expires_at, language));
    case 'replaced':
      return copy.replaced;
    case 'cancelled':
      return cancelledTextOf(request, connection, language);
  }
}

/** A request's final state with its sentence; null while it waits */
export function finalOutcomeOf(
  request: ApprovalRequest,
  connection: FormConnection | null,
  language: Language
): FinalOutcome | null {
  const text = outcomeTextOf(request, connection, language);
  return request.status === 'waiting' || text === null ? null : { status: request.status, text };
}

function isFinalStatus(value: string): value is FinalStatus {
  return (FINAL_STATUSES as readonly string[]).includes(value);
}

/**
 * The final state a `409 approval_<status>` answers to approving or declining (S3: a page left
 * open past the expiry, a connection changed or deleted in the meantime), with the answer's
 * message as its sentence, which words `connection_changed` from the request; null for any other
 * failure. The sentence is the server's, in the language the call asked in (spec 009: shown as
 * delivered)
 */
export function outcomeOfError(error: unknown): FinalOutcome | null {
  if (!(error instanceof ApiError) || error.status !== 409) {
    return null;
  }
  const prefix = 'approval_';
  const { error: code, message } = error.data;
  if (!code.startsWith(prefix)) {
    return null;
  }
  const status = code.slice(prefix.length);
  return isFinalStatus(status) ? { status, text: message } : null;
}

/**
 * What a failed load shows (S3 "Loading and errors"): another team member's request (`403
 * not_yours`), the not-found screen (`404`: unknown, or swept by the worker), or the failure with
 * its message and a 5xx answer's error ID. A `401` signs out before this is asked
 */
export function loadFailureActionOf(error: unknown, language: Language): ApprovalPageAction {
  if (error instanceof ApiError && error.status === 403 && error.data.error === 'not_yours') {
    return { type: 'notYours' };
  }
  if (error instanceof ApiError && error.status === 404) {
    return { type: 'notFound' };
  }
  return {
    type: 'loadFailed',
    notice: errorNoticeOf(error, APPROVAL_COPY[language].loadFailed),
  };
}

/**
 * The link cards' URLs (S3: after publishing or reactivating, and the status actions' body), by the details page's rule
 * (`resultLinksOf()`): the trigger URL once, and every variant's pull URL as the API answers it,
 * labelled with the variant's name; with Standard only, its URL unlabelled (W2)
 */
export function urlsLinksOf(urls: ConnectionUrls): UrlsLinks {
  const { trigger_url: triggerUrl, variants } = urls;
  return {
    trigger: [{ key: 'trigger', url: triggerUrl, branch: null }],
    result:
      variants.length <= 1
        ? variants.map((variant) => ({ key: 'result', url: variant.pull_url, branch: null }))
        : variants.map((variant) => ({
            key: variant.id,
            url: variant.pull_url,
            branch: { name: variant.name, description: null },
          })),
  };
}

/** A draft's requested documents with the keys of their fields, as the editor holds them */
export function requestedDocumentsOf(documents: RequestedDocumentView[]): RequestedDocument[] {
  return documents.map((document) => ({
    document_type: document.document_type,
    fields: document.fields.map((field) => field.key),
  }));
}

/**
 * A draft's branches as the rule checks and the publish dialog's lines take them, keyed by their
 * id, which a stored draft's branches always carry (research R10)
 */
export function checkedBranchesOf(draft: FormConnectionDraft): RulesBranch[] {
  return draft.branches.map((branch, index) => ({ ...branch, key: branch.id ?? `${index}` }));
}

/**
 * A request read while it waits after a failed approve (FR-027): the error alert with the error
 * ID the request keeps, and "Try again". The request doesn't keep the message: the page words it
 * in `language`, and marks it `readAgain`, so that `outcomeViewOf()` words it anew after a switch
 */
export function failureOfPreview(preview: ApprovalPreview, language: Language): CallFailure | null {
  const { request } = preview;
  if (request.outcome !== 'failed') {
    return null;
  }
  const message = APPROVAL_COPY[language].failedBefore;
  return {
    call: 'approve',
    notice: request.error_id ? { message, error_id: request.error_id } : { message },
    readAgain: true,
  };
}

function loadedStateOf(preview: ApprovalPreview): LoadedApprovalState {
  return {
    status: 'loaded',
    preview,
    running: null,
    // Worded anew in the language of the moment by `outcomeViewOf()`
    failure: failureOfPreview(preview, DEFAULT_LANGUAGE),
    retry: preview.request.outcome === 'failed',
    conflict: null,
  };
}

/**
 * The page's state: loading, the three ways a load ends without the request, and the loaded
 * request with the call that runs, why the last one failed, and the final state a `409` answered.
 * One call at a time; a call that starts takes the old failure away, so that a new one is
 * announced again, and keeps "Try again"
 */
export function approvalReducer(
  state: ApprovalPageState,
  action: ApprovalPageAction
): ApprovalPageState {
  switch (action.type) {
    case 'loaded':
      return loadedStateOf(action.preview);
    case 'notFound':
      return { status: 'notFound' };
    case 'notYours':
      return { status: 'notYours' };
    case 'loadFailed':
      return { status: 'failed', notice: action.notice };
    case 'started':
      return state.status !== 'loaded' || state.running !== null || state.conflict !== null
        ? state
        : { ...state, running: action.call, failure: null };
    case 'succeeded':
      return loadedStateOf(action.preview);
    case 'conflicted':
      return state.status === 'loaded'
        ? { ...state, running: null, failure: null, conflict: action.outcome }
        : state;
    case 'callFailed':
      return state.status === 'loaded'
        ? {
            ...state,
            running: null,
            failure: action.failure,
            retry: state.retry || action.failure.call === 'approve',
          }
        : state;
  }
}

/**
 * The outcome alert of a loaded request: its final state, the one a `409` answered first; or a
 * failed call, with the body and the actions kept; null while it simply waits. The page's own
 * sentences in `language` (spec 009): the preview's final state, the titles and a failed attempt
 * read again; the server's sentences (a `409`, a failed call's message) as they arrived
 */
export function outcomeViewOf(state: LoadedApprovalState, language: Language): OutcomeView | null {
  const copy = APPROVAL_COPY[language];
  const outcome =
    state.conflict ?? finalOutcomeOf(state.preview.request, state.preview.connection, language);
  if (outcome) {
    return { kind: 'final', outcome };
  }
  if (state.failure) {
    const { call, notice } = state.failure;
    const readAgain = state.failure.readAgain ? failureOfPreview(state.preview, language) : null;
    return {
      kind: 'failed',
      title:
        call === 'approve'
          ? copy.approveFailedTitle(state.preview.request.action)
          : copy.declineFailedTitle,
      notice: readAgain?.notice ?? notice,
    };
  }
  return null;
}

/** What the status region says while a call runs: "Publishing…", or "Working…" */
export function busyTextOf(
  action: ApprovalAction,
  running: ApprovalCall | null,
  language: Language
): string {
  if (running === null) {
    return '';
  }
  const copy = APPROVAL_COPY[language];
  return running === 'approve' && action === 'publish' ? copy.publishing : copy.working;
}

/**
 * A failed call's notice: the API's message with a 5xx answer's error ID, or "Nothing has
 * changed. …" in the language the call failed in
 */
export function callFailureOf(call: ApprovalCall, error: unknown, language: Language): CallFailure {
  return { call, notice: errorNoticeOf(error, APPROVAL_COPY[language].callFailed) };
}

/**
 * A draft's requested documents labelled from the catalog in the website's language (spec 009,
 * R6), as the server labels them (`documents_view()`): the document type's and each field's label
 * by key. The preview is loaded once, in the language of that moment; a switch relabels it from
 * the catalog the page has loaded anyway, without asking the server again. A document type or a
 * field the catalog doesn't know keeps the preview's view
 */
export function documentsInLanguageOf(
  documents: RequestedDocumentView[],
  documentTypes: readonly DocumentType[]
): RequestedDocumentView[] {
  return documents.map((document) => {
    const documentType = documentTypes.find((type) => type.key === document.document_type);
    if (!documentType) {
      return document;
    }
    return {
      ...document,
      label: documentType.label,
      fields: document.fields.map(
        (field) => documentType.fields.find((known) => known.key === field.key) ?? field
      ),
    };
  });
}
