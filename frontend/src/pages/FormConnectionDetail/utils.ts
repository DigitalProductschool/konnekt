import { errorNoticeOf } from '../../api/client';
import type { FormConnection } from '../../types/form-connections';
import type { DetailLocationState } from '../../types/routing';
import { DETAIL_COPY, INITIAL_ACTIONS_STATE } from './constants';
import type {
  ActionsAction,
  ActionsState,
  Arrival,
  ConfirmedAction,
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
