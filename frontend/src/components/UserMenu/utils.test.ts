import { describe, expect, it } from 'vitest';

import { emptyContent } from '../../utils/localDrafts/content';
import type { LocalDraftRecord } from '../../utils/localDrafts/types';
import { INITIAL_USER_MENU_STATE } from './constants';
import { signOutNamesOf, userMenuReducer } from './utils';

function record(name: string, index = 0): LocalDraftRecord {
  return {
    format: 2,
    flowKey: `new-${index}`,
    draftId: null,
    draftVersion: null,
    changedAt: '2026-11-04T13:32:00.000Z',
    step: 'documents',
    content: { ...emptyContent(), name },
  };
}

function records(count: number): LocalDraftRecord[] {
  return Array.from({ length: count }, (_, index) => record(`Form ${index + 1}`, index));
}

// initialsOf() went with the avatar: the account pill has no initials (spec 008, FR-030, F17)

describe('signOutNamesOf', () => {
  it('is empty without records', () => {
    expect(signOutNamesOf([])).toBe('');
  });

  it('names a single record', () => {
    expect(signOutNamesOf(records(1))).toBe('Form 1');
  });

  it('joins two names with "and"', () => {
    expect(signOutNamesOf(records(2))).toBe('Form 1 and Form 2');
  });

  it('names all five', () => {
    expect(signOutNamesOf(records(5))).toBe('Form 1, Form 2, Form 3, Form 4 and Form 5');
  });

  it('names five of eight, then how many more', () => {
    expect(signOutNamesOf(records(8))).toBe('Form 1, Form 2, Form 3, Form 4, Form 5 and 3 more');
  });

  it('calls a record without a name "Untitled connection"', () => {
    expect(signOutNamesOf([record(''), record('  ', 1), record('Parking permit', 2)])).toBe(
      'Untitled connection, Untitled connection and Parking permit'
    );
  });
});

describe('userMenuReducer', () => {
  it('closes the menu when it asks before signing out', () => {
    const open = userMenuReducer(INITIAL_USER_MENU_STATE, { type: 'opened' });
    const asked = userMenuReducer(open, { type: 'signOutAsked', names: 'Form 1' });
    expect(asked).toEqual({ open: false, signOutNames: 'Form 1', signingOut: false });
  });

  it('closes the warning on cancel, but not while signing out', () => {
    const asked = userMenuReducer(INITIAL_USER_MENU_STATE, {
      type: 'signOutAsked',
      names: 'Form 1',
    });
    expect(userMenuReducer(asked, { type: 'signOutCancelled' }).signOutNames).toBeNull();
    const confirmed = userMenuReducer(asked, { type: 'signOutConfirmed' });
    expect(userMenuReducer(confirmed, { type: 'signOutCancelled' })).toBe(confirmed);
  });

  it('toggles the menu', () => {
    const open = userMenuReducer(INITIAL_USER_MENU_STATE, { type: 'toggled' });
    expect(open.open).toBe(true);
    expect(userMenuReducer(open, { type: 'toggled' }).open).toBe(false);
  });
});
