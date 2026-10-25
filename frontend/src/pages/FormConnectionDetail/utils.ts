import { errorNoticeOf } from '../../api/client';
import type { Branch, RuleTreeItem } from '../../types/form-connections';
import type { DetailLocationState } from '../../types/routing';
import { DETAIL_COPY, INITIAL_ACTIONS_STATE } from './constants';
import type { ActionsAction, ActionsState, Arrival, ConfirmedAction, StatusAction } from './types';

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

/** The identifiers of the rules that apply in a tree: removed ones and their members don't. */
function appliedRuleIds(items: RuleTreeItem[]): string[] {
  return items.flatMap((item) => {
    if (item.mark === 'removed') return [];
    return item.type === 'rule' ? [item.id] : appliedRuleIds(item.items);
  });
}

/**
 * "1 variant · 5 rules": the variants, and the rules that apply in at least one of them, each
 * counted once by its identifier, as serviceBW sees them (FR-010).
 */
export function rulesCountOf(branches: Branch[]): string {
  const ids = new Set(branches.flatMap((branch) => appliedRuleIds(branch.items)));
  return DETAIL_COPY.rulesCount(branches.length, ids.size);
}
