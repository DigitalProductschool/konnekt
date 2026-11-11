import { describe, expect, it } from 'vitest';

import checkFilledIcon from '../../assets/icons/check-filled-white.svg';
import deleteIcon from '../../assets/icons/delete-white.svg';
import { TOAST_KIND_FILL, TOAST_KIND_ICON } from './constants';
import type { ToastKind } from './types';
import type { ToastHold, ToastHoldAction } from './utils';
import { isToastTimerRunning, NO_HOLD, toastHoldReducer } from './utils';

function after(actions: ToastHoldAction['type'][]): ToastHold {
  return actions.reduce((hold, type) => toastHoldReducer(hold, { type }), NO_HOLD);
}

describe('the toast timer (FR-082, R12)', () => {
  it('runs while neither the pointer nor the focus is on the toast', () => {
    expect(isToastTimerRunning(NO_HOLD)).toBe(true);
  });

  it('stops while the pointer is on the toast, and runs again once it has left', () => {
    expect(isToastTimerRunning(after(['pointerEnter']))).toBe(false);
    expect(isToastTimerRunning(after(['pointerEnter', 'pointerLeave']))).toBe(true);
  });

  it('stops while the focus is in the toast, and runs again once it has left', () => {
    expect(isToastTimerRunning(after(['focusIn']))).toBe(false);
    expect(isToastTimerRunning(after(['focusIn', 'focusOut']))).toBe(true);
  });

  it('stays stopped while the focus stays after the pointer left', () => {
    expect(isToastTimerRunning(after(['focusIn', 'pointerEnter', 'pointerLeave']))).toBe(false);
  });

  it('stays stopped while the pointer stays after the focus left', () => {
    expect(isToastTimerRunning(after(['pointerEnter', 'focusIn', 'focusOut']))).toBe(false);
  });

  it('runs once both have left, in either order', () => {
    expect(
      isToastTimerRunning(after(['pointerEnter', 'focusIn', 'pointerLeave', 'focusOut']))
    ).toBe(true);
    expect(
      isToastTimerRunning(after(['focusIn', 'pointerEnter', 'focusOut', 'pointerLeave']))
    ).toBe(true);
  });

  it('keeps the same state when nothing changes, so that the timer is not restarted', () => {
    const held = after(['pointerEnter']);
    expect(toastHoldReducer(held, { type: 'pointerEnter' })).toBe(held);
    expect(toastHoldReducer(NO_HOLD, { type: 'pointerLeave' })).toBe(NO_HOLD);
    expect(toastHoldReducer(NO_HOLD, { type: 'focusOut' })).toBe(NO_HOLD);
  });
});

// Spec 010, design-notes §4.2 T038: a third kind for deletions, as Figma "Rules/Toast"
// type=danger (6718:40958) draws it
describe('the toast kinds (design-notes §3 "Toast"; spec 010 T038)', () => {
  const kinds: ToastKind[] = ['neutral', 'success', 'danger'];

  it('gives every kind its fill', () => {
    expect(kinds.map((kind) => TOAST_KIND_FILL[kind])).toEqual([
      'bg-kern-layout-text-default',
      'bg-kern-feedback-success',
      'bg-kern-feedback-danger',
    ]);
  });

  it('puts the filled check before a success, the delete icon before a deletion, nothing before a neutral toast', () => {
    expect(TOAST_KIND_ICON.neutral).toBeNull();
    expect(TOAST_KIND_ICON.success).toBe(checkFilledIcon);
    expect(TOAST_KIND_ICON.danger).toBe(deleteIcon);
  });
});
