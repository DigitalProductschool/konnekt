// The leave model of the editor (spec 008, FR-026; research R9; data-model.md "Leaving a flow";
// CLAR 2026-11-07 #8, #47). Pure: it decides which question the product name, "Your connections"
// and "Log out" open, and what each answer does; the editor carries out the effects. No router
// blocker (research V9): the browser's back button leaves without asking, and closing or
// reloading the tab gets the browser's own "Leave site?" while `hasUnsavedWork()` is true
import { sameContent } from '../../utils/localDrafts/content';
import type { LocalDraftContent } from '../../utils/localDrafts/types';
import type { LEAVE_COPY } from './constants';
import type {
  EditorOrigin,
  LeaveEffect,
  LeaveFlowAction,
  LeaveFlowState,
  LeaveFlowStep,
} from './types';

const IDLE: LeaveFlowState = { status: 'idle' };
const NO_EFFECT: LeaveEffect = { type: 'none' };

/** The state as it is, with nothing to do: an action that doesn't apply in this state */
function unchanged(state: LeaveFlowState): LeaveFlowStep {
  return { state, effect: NO_EFFECT };
}

/** Whether the flow has a local draft of its own: a new connection's or a stored draft's (FR-014) */
function hasLocalDraft(origin: EditorOrigin['kind']): boolean {
  return origin !== 'published';
}

/** How an answer stores the flow: "Save and exit", or the edit flow's save dialog (FR-045) */
function storeEffectOf(origin: EditorOrigin['kind']): LeaveEffect {
  return { type: 'store', via: origin === 'published' ? 'saveDialog' : 'saveAndExit' };
}

/**
 * One step of the leave model: the next state and what the editor does now.
 *
 * - **Leaving** (the product name, "Your connections"): in a new connection's or a stored draft's
 *   flow, "Leave this connection?" (`leaveAsked`, #8); its "Save progress" stores the flow
 *   through "Save and exit" and then leaves as that does, and "Discard connection" leaves without
 *   storing and forgets the flow's local draft. In the edit flow of a published connection, "Save
 *   your changes?" (`saveAsked`, #47) while it has unsaved changes, and otherwise it leaves at
 *   once; its "Save" opens the save dialog, which leaves to the details once saved, and "Discard
 *   changes" leaves without saving. The ×, Escape and the scrim stay in the flow.
 * - **Logging out** with unsaved work: "Save before you log out?" (`logoutAsked`); "Save and log
 *   out" stores the flow as above and then logs out, "Log out anyway" forgets the flow's local
 *   draft and logs out, and "Cancel" and the × stay, with the focus back on the account pill
 *   (F20). Without unsaved work, "Log out" logs out at once.
 * - **The rule editor**: only an answer that stores goes through "Save changes to Rule 01?"
 *   (`store`; Q8 (c)): a rule is saved or dropped before the flow is stored, and no editor state
 *   is stored. Discarding and logging out anyway store nothing, so they don't ask.
 * - **Saving**: the save reports `saved` or `failed`. `saved` logs out after "Save and log out",
 *   and otherwise lets the save's own exit follow, also for a save the leave model didn't start
 *   (the footer's "Save and exit", publishing). `failed` stays in the flow, where the save shows
 *   why (a missing name on step 1, the alert, the conflict dialog, the save dialog's message).
 * - While a save or a publish runs, or a question is open, asking again does nothing.
 */
export function leaveFlowStep(state: LeaveFlowState, action: LeaveFlowAction): LeaveFlowStep {
  switch (action.type) {
    case 'askLeave': {
      const { origin, unsaved, busy } = action.context;
      if (state.status !== 'idle' || busy) {
        return unchanged(state);
      }
      if (origin !== 'published') {
        return { state: { status: 'leaveAsked', origin }, effect: NO_EFFECT };
      }
      return unsaved
        ? { state: { status: 'saveAsked' }, effect: NO_EFFECT }
        : { state: IDLE, effect: { type: 'leave', forget: false } };
    }
    case 'askLogout': {
      const { origin, unsaved, busy } = action.context;
      if (state.status !== 'idle' || busy) {
        return unchanged(state);
      }
      return unsaved
        ? { state: { status: 'logoutAsked', origin }, effect: NO_EFFECT }
        : { state: IDLE, effect: { type: 'logOut', forget: false } };
    }
    case 'cancel':
      switch (state.status) {
        case 'leaveAsked':
        case 'saveAsked':
          return { state: IDLE, effect: NO_EFFECT };
        case 'logoutAsked':
          return { state: IDLE, effect: { type: 'focusUserMenu' } };
        default:
          return unchanged(state);
      }
    case 'saveProgress':
      switch (state.status) {
        case 'leaveAsked':
          return {
            state: { status: 'saving', origin: state.origin, after: 'leave' },
            effect: storeEffectOf(state.origin),
          };
        case 'saveAsked':
          return {
            state: { status: 'saving', origin: 'published', after: 'leave' },
            effect: storeEffectOf('published'),
          };
        default:
          return unchanged(state);
      }
    case 'discard':
      switch (state.status) {
        case 'leaveAsked':
          return { state: IDLE, effect: { type: 'leave', forget: true } };
        case 'saveAsked':
          return { state: IDLE, effect: { type: 'leave', forget: false } };
        default:
          return unchanged(state);
      }
    case 'saveAndLogout':
      if (state.status !== 'logoutAsked') {
        return unchanged(state);
      }
      return {
        state: { status: 'saving', origin: state.origin, after: 'logout' },
        effect: storeEffectOf(state.origin),
      };
    case 'logoutAnyway':
      if (state.status !== 'logoutAsked') {
        return unchanged(state);
      }
      return { state: IDLE, effect: { type: 'logOut', forget: hasLocalDraft(state.origin) } };
    case 'saved':
      if (state.status === 'saving' && state.after === 'logout') {
        return { state: IDLE, effect: { type: 'logOut', forget: hasLocalDraft(state.origin) } };
      }
      return { state: IDLE, effect: { type: 'exit' } };
    case 'failed':
      return state.status === 'saving' ? { state: IDLE, effect: NO_EFFECT } : unchanged(state);
  }
}

/** `leaveFlowStep()`'s state alone, as `useReducer` takes it */
export function leaveFlowReducer(state: LeaveFlowState, action: LeaveFlowAction): LeaveFlowState {
  return leaveFlowStep(state, action).state;
}

/**
 * Whether the flow holds work that isn't stored: what "Log out" asks about and the browser's
 * "Leave site?" warns of (FR-026). `content` is the flow's `localContentOf()`, `saved` what is
 * stored. For a new connection or a stored draft, `saved` is the local draft's baseline, so the
 * flow has unsaved work exactly while its local draft holds a record: a content other than the
 * baseline, or always without one (a stored draft's record resumed through `?local=`, whose
 * record is the unsaved work). For a published connection, `saved` is its content as loaded, and
 * the rule counters don't count, as a save ignores them when the rules are unchanged (FR-028).
 */
export function hasUnsavedWork(
  origin: EditorOrigin['kind'],
  content: LocalDraftContent,
  saved: LocalDraftContent | null
): boolean {
  if (saved === null) {
    return true;
  }
  if (origin === 'published') {
    return !sameContent({ ...content, counters: saved.counters }, saved);
  }
  return !sameContent(content, saved);
}

/** The leave questions' copy in one language: a column of `LEAVE_COPY` */
type LeaveCopy = (typeof LEAVE_COPY)['en'];

/**
 * The sentence of "Save your changes?" (`saveAsked`, #47): discarding keeps the active version, or
 * for a scheduled connection the scheduled one (spec 010, S18; FR-013, W7). `scheduledStart` is
 * `scheduledStartOf()`'s answer.
 */
export function saveQuestionTextOf(scheduledStart: string | null, copy: LeaveCopy): string {
  return scheduledStart === null ? copy.saveText : copy.saveTextScheduled;
}
