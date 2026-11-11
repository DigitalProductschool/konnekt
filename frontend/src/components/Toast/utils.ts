/**
 * What holds a toast open (FR-082, research R12): the pointer on it and the keyboard focus in
 * it, each on its own, so that the one leaving doesn't restart the time while the other stays
 */
export interface ToastHold {
  pointer: boolean;
  focus: boolean;
}

export type ToastHoldAction =
  { type: 'pointerEnter' } | { type: 'pointerLeave' } | { type: 'focusIn' } | { type: 'focusOut' };

export const NO_HOLD: ToastHold = { pointer: false, focus: false };

/** The toast's hold after the pointer or the focus came or went */
export function toastHoldReducer(state: ToastHold, action: ToastHoldAction): ToastHold {
  switch (action.type) {
    case 'pointerEnter':
      return state.pointer ? state : { ...state, pointer: true };
    case 'pointerLeave':
      return state.pointer ? { ...state, pointer: false } : state;
    case 'focusIn':
      return state.focus ? state : { ...state, focus: true };
    case 'focusOut':
      return state.focus ? { ...state, focus: false } : state;
  }
}

/**
 * Whether the toast's 6 seconds run: only while neither the pointer nor the focus is on it.
 * Each time this turns true again the time starts from the beginning
 */
export function isToastTimerRunning(hold: ToastHold): boolean {
  return !hold.pointer && !hold.focus;
}
