import type {
  ApprovalAction,
  ApprovalPreview,
  ApprovalRequest,
} from '@connection-portal/api-types/approvals';
import type {
  ConnectionUrls,
  FormConnection,
  FormConnectionDraft,
  RequestedDocument,
  RequestedDocumentView,
} from '@connection-portal/api-types/form-connections';

import { ApiError, errorNoticeOf } from '../../api/client';
import { SAVED_TIME_FORMAT } from '../FormConnectionDetail/constants';
import type { RulesBranch } from '../FormConnectionEditor/RulesStep/types';
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
 * draft's row is gone and `name` is '', "Delete the draft?"
 */
export function titleOf(action: ApprovalAction, name: string): string {
  const title = TITLES[action];
  return name.trim() ? title.named(name) : title.unnamed;
}

/** A time of day as the project writes it, 24-hour, in the browser's time zone: "14:32" */
export function timeOf(timestamp: string): string {
  return SAVED_TIME_FORMAT.format(new Date(timestamp));
}

/** "Requested by Claude Code · expires at 14:32" */
export function subtitleOf(request: ApprovalRequest): string {
  return APPROVAL_COPY.subtitle(request.requested_by, timeOf(request.expires_at));
}

/**
 * "Last saved 04.11.2026, 14:32": the draft's last save, as the draft details' date pill writes
 * it (cosmetic 3, design-notes §3 "Dates")
 */
export function lastSavedLineOf(updatedAt: string): string {
  return APPROVAL_COPY.lastSaved(`${formatRowDate(updatedAt)}, ${timeOf(updatedAt)}`);
}

/** Whether the action acts on a published connection: `deactivate`, `reactivate` or `delete` */
export function isStatusAction(action: ApprovalAction): action is StatusAction {
  return action === 'deactivate' || action === 'reactivate' || action === 'delete';
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
 * A cancellation's sentence by its reason. `connection_changed` says which way the connection
 * changed, from whether it is live now: the request doesn't say whether it was; without the
 * connection, the general sentence
 */
export function cancelledTextOf(reason: string | null, connection: FormConnection | null): string {
  if (reason === 'connection_changed') {
    return connection
      ? APPROVAL_COPY.connectionChanged(connection.is_active)
      : APPROVAL_COPY.cancelled;
  }
  return CANCELLED_TEXTS[reason ?? ''] ?? APPROVAL_COPY.cancelled;
}

/**
 * The sentence of a request that isn't waiting (S3 "Outcome states"), the same as the server's
 * `409 approval_<status>` message; null while it waits, failed or not. A cancellation for
 * `connection_changed` takes its word from the connection the preview holds
 */
export function outcomeTextOf(
  request: ApprovalRequest,
  connection: FormConnection | null = null
): string | null {
  switch (request.status) {
    case 'waiting':
      return null;
    case 'done':
      return DONE_TEXTS[request.action];
    case 'declined':
      return APPROVAL_COPY.declined;
    case 'expired':
      return APPROVAL_COPY.expired(timeOf(request.expires_at));
    case 'replaced':
      return APPROVAL_COPY.replaced;
    case 'cancelled':
      return cancelledTextOf(request.cancel_reason, connection);
  }
}

/** A request's final state with its sentence; null while it waits */
export function finalOutcomeOf(
  request: ApprovalRequest,
  connection: FormConnection | null = null
): FinalOutcome | null {
  const text = outcomeTextOf(request, connection);
  return request.status === 'waiting' || text === null ? null : { status: request.status, text };
}

function isFinalStatus(value: string): value is FinalStatus {
  return (FINAL_STATUSES as readonly string[]).includes(value);
}

/**
 * The final state a `409 approval_<status>` answers to approving or declining (S3: a page left
 * open past the expiry, a connection changed or deleted in the meantime), with the answer's
 * message as its sentence, which words `connection_changed` from the request; null for any other
 * failure
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
export function loadFailureActionOf(error: unknown): ApprovalPageAction {
  if (error instanceof ApiError && error.status === 403 && error.data.error === 'not_yours') {
    return { type: 'notYours' };
  }
  if (error instanceof ApiError && error.status === 404) {
    return { type: 'notFound' };
  }
  return { type: 'loadFailed', notice: errorNoticeOf(error, APPROVAL_COPY.loadFailed) };
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
 * ID the request keeps, and "Try again". The request doesn't keep the message
 */
export function failureOfPreview(preview: ApprovalPreview): CallFailure | null {
  const { request } = preview;
  if (request.outcome !== 'failed') {
    return null;
  }
  return {
    call: 'approve',
    notice: request.error_id
      ? { message: APPROVAL_COPY.failedBefore, error_id: request.error_id }
      : { message: APPROVAL_COPY.failedBefore },
  };
}

function loadedStateOf(preview: ApprovalPreview): LoadedApprovalState {
  return {
    status: 'loaded',
    preview,
    running: null,
    failure: failureOfPreview(preview),
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
 * failed call, with the body and the actions kept; null while it simply waits
 */
export function outcomeViewOf(state: LoadedApprovalState): OutcomeView | null {
  const outcome = state.conflict ?? finalOutcomeOf(state.preview.request, state.preview.connection);
  if (outcome) {
    return { kind: 'final', outcome };
  }
  if (state.failure) {
    const { call, notice } = state.failure;
    return {
      kind: 'failed',
      title:
        call === 'approve'
          ? APPROVAL_COPY.approveFailedTitle(state.preview.request.action)
          : APPROVAL_COPY.declineFailedTitle,
      notice,
    };
  }
  return null;
}

/** What the status region says while a call runs: "Publishing…", or "Working…" */
export function busyTextOf(action: ApprovalAction, running: ApprovalCall | null): string {
  if (running === null) {
    return '';
  }
  return running === 'approve' && action === 'publish'
    ? APPROVAL_COPY.publishing
    : APPROVAL_COPY.working;
}

/** A failed call's notice: the API's message with a 5xx answer's error ID, or "Nothing has changed. …" */
export function callFailureOf(call: ApprovalCall, error: unknown): CallFailure {
  return { call, notice: errorNoticeOf(error, APPROVAL_COPY.callFailed) };
}
