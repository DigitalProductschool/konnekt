import type { DocumentType } from '@connection-portal/api-types/document-types';
import type {
  BranchInput,
  EditorStep,
  FormConnection,
  RequestedDocumentView,
  RuleTreeItem,
} from '@connection-portal/api-types/form-connections';
import type { DetailLocationState } from '@connection-portal/api-types/routing';
import { ruleDocumentsOf } from '@connection-portal/rules/conditions';
import type { RuleDocument } from '@connection-portal/rules/types';

import { ApiError, errorNoticeOf } from '../../api/client';
import { formatEditedDate } from '../FormConnectionList/utils';
import { DETAIL_COPY, DRAFT_STEPS, INITIAL_ACTIONS_STATE, SAVED_TIME_FORMAT } from './constants';
import type {
  ActionsAction,
  ActionsState,
  Arrival,
  ConfirmedAction,
  DeleteDraftFailure,
  DraftDeleteAction,
  DraftDeleteState,
  LinkCardLink,
  StatusAction,
} from './types';

export function arrivalOf(state: unknown): Arrival {
  const locationState = state as DetailLocationState | null;
  if (locationState?.published) return 'published';
  if (locationState?.saved) return 'saved';
  return null;
}

/** The first state: after saving an edit, a toast confirms it. */
export function initialActionsState(arrival: Arrival): ActionsState {
  return {
    ...INITIAL_ACTIONS_STATE,
    toast: arrival === 'saved' ? { id: 1, message: DETAIL_COPY.saved } : null,
  };
}

export function actionsReducer(state: ActionsState, action: ActionsAction): ActionsState {
  switch (action.type) {
    case 'openDialog':
      return { ...state, dialog: action.dialog, dialogOpen: true, error: null };
    case 'closeDialog':
      return state.running ? state : { ...state, dialogOpen: false, error: null };
    case 'start':
      // A retry takes the old message away, so that a new failure is announced again
      return { ...state, running: action.action, error: null };
    case 'succeeded':
      return {
        ...state,
        dialogOpen: false,
        running: null,
        toast: { id: (state.toast?.id ?? 0) + 1, message: action.message },
      };
    case 'failed':
      // A dialog stays open and shows the message where the user is looking
      return { ...state, running: null, error: action.error };
    case 'dismissToast':
      return { ...state, toast: null };
  }
}

/** The confirmation's texts for deactivating or deleting. */
export function dialogCopyOf(action: ConfirmedAction) {
  return action === 'delete'
    ? {
        title: DETAIL_COPY.deleteTitle,
        text: DETAIL_COPY.deleteText,
        confirmLabel: DETAIL_COPY.delete,
        busyLabel: DETAIL_COPY.deleting,
        errorTitle: DETAIL_COPY.deleteError,
      }
    : {
        title: DETAIL_COPY.deactivateTitle,
        text: DETAIL_COPY.deactivateText,
        confirmLabel: DETAIL_COPY.deactivate,
        busyLabel: DETAIL_COPY.deactivating,
        errorTitle: DETAIL_COPY.deactivateError,
      };
}

/** The API's message, with the error ID of a 5xx answer, or "Nothing changed. …". */
export function actionErrorNotice(error: unknown) {
  return errorNoticeOf(error, DETAIL_COPY.actionErrorText);
}

/** The toast after an action that keeps the connection. */
export function successMessageOf(action: Exclude<StatusAction, 'delete'>): string {
  return action === 'deactivate' ? DETAIL_COPY.deactivated : DETAIL_COPY.activated;
}

/**
 * The result links: every variant's pull URL from its `pull_url`, never derived from its name
 * (F24), labelled with the variant; with Standard only, its URL unlabelled, as in spec 001 (W2).
 */
export function resultLinksOf(formConnection: FormConnection): LinkCardLink[] {
  const { branches } = formConnection;
  if (branches.length <= 1) {
    return [{ key: 'result', url: branches[0]?.pull_url ?? formConnection.pull_url, branch: null }];
  }
  return branches.map((branch) => ({ key: branch.id, url: branch.pull_url, branch }));
}

/** The identifiers of the rules that count in a tree, as `countRules` counts them. */
function countableRuleIds(items: RuleTreeItem[]): string[] {
  return items.flatMap((item) => {
    if (item.mark === 'removed') {
      return [];
    }
    return item.type === 'rule' ? [item.id] : countableRuleIds(item.items);
  });
}

/**
 * The closed rules card's counts (Figma 10.11, B8): every variant, Standard included, and every
 * distinct rule once. A based variant keeps the main branch's identifiers for inherited rules
 * (data-model.md), so summing the variants would count them twice; a rule a variant removes
 * still counts, in Standard. Grouped rules count one by one, groups don't.
 */
export function rulesCountsOf(branches: Pick<BranchInput, 'items'>[]): string {
  const ruleIds = new Set(branches.flatMap((branch) => countableRuleIds(branch.items)));
  return DETAIL_COPY.rulesCounts(branches.length, ruleIds.size);
}

/**
 * What a draft's rules summary names (S6): the requested documents as the draft holds them (a type
 * or field the catalog dropped keeps its key as its label), each followed by the catalog's fields
 * it doesn't request, then the catalog's documents it doesn't request. A draft may keep rules on
 * data that isn't requested (FR-004), and the summary names that data as the rules step does,
 * which looks rules up in the whole catalog. Without the catalog, only the requested documents.
 */
export function draftRuleDocumentsOf(
  documents: RequestedDocumentView[],
  documentTypes: DocumentType[]
): RuleDocument[] {
  const requested = ruleDocumentsOf(documents).map((document) => {
    const known = new Set(document.fields.map((field) => field.key));
    const others = documentTypes.find((type) => type.key === document.key)?.fields ?? [];
    return {
      ...document,
      fields: [...document.fields, ...others.filter((field) => !known.has(field.key))],
    };
  });
  const keys = new Set(requested.map((document) => document.key));
  return [...requested, ...documentTypes.filter((type) => !keys.has(type.key))];
}

/**
 * How many of the wizard's steps a draft has reached: every step up to and including the one it
 * was saved in (S6), which `WizardProgress` (as `reached`) shows as done and leading to the flow
 * there.
 */
export function reachedStepsOf(step: EditorStep): number {
  return DRAFT_STEPS.indexOf(step) + 1;
}

/**
 * The draft card's text, with the draft's last save as the overview writes dates and the 24-hour
 * time in the browser's time zone: "Saved 4 Nov 2026, 14:32. Continue to finish and publish it."
 */
export function savedLineOf(updatedAt: string): string {
  const time = SAVED_TIME_FORMAT.format(new Date(updatedAt));
  return DETAIL_COPY.draftCardText(`${formatEditedDate(updatedAt)}, ${time}`);
}

/**
 * Why deleting a draft failed (S6): published meanwhile (`409 draft_published`), deleted
 * meanwhile (`404`), or anything else, with the API's message and a 5xx answer's error ID. A
 * `401` signs out before this is asked.
 */
export function deleteDraftErrorOf(error: unknown): DeleteDraftFailure {
  if (error instanceof ApiError && error.status === 409 && error.data.error === 'draft_published') {
    return { kind: 'published', notice: { message: DETAIL_COPY.draftPublishedSince } };
  }
  if (error instanceof ApiError && error.status === 404) {
    return { kind: 'deleted', notice: { message: DETAIL_COPY.draftAlreadyDeleted } };
  }
  return { kind: 'failed', notice: errorNoticeOf(error, DETAIL_COPY.actionErrorText) };
}

export function draftDeleteReducer(
  state: DraftDeleteState,
  action: DraftDeleteAction
): DraftDeleteState {
  switch (action.type) {
    case 'openDialog':
      return { dialogOpen: true, deleting: false, failure: null };
    case 'closeDialog':
      return state.deleting ? state : { ...state, dialogOpen: false, failure: null };
    case 'start':
      // A retry takes the old message away, so that a new failure is announced again
      return { ...state, deleting: true, failure: null };
    case 'failed':
      return { ...state, deleting: false, failure: action.failure };
  }
}

/**
 * The delete confirmation's error title and the confirm button after a failure: published
 * meanwhile, it opens the connection; deleted meanwhile, the overview; otherwise it retries.
 * Only deleting is in the danger colour.
 */
export function deleteDraftDialogOf(failure: DeleteDraftFailure | null) {
  switch (failure?.kind) {
    case 'published':
      return {
        errorTitle: DETAIL_COPY.deleteError,
        retryLabel: DETAIL_COPY.openConnection,
        danger: false,
      };
    case 'deleted':
      return {
        errorTitle: DETAIL_COPY.deleteError,
        retryLabel: DETAIL_COPY.toOverview,
        danger: false,
      };
    default:
      return { errorTitle: DETAIL_COPY.deleteError, retryLabel: DETAIL_COPY.retry, danger: true };
  }
}
